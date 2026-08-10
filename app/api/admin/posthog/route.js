import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";

/**
 * /api/admin/posthog — server-side proxy for product metrics (DAU/WAU/MAU, sessions,
 * platform split, top events).
 *
 * WHY A PROXY: the numbers come from PostHog's query API, which requires a PERSONAL api key
 * (phx_…). That key can read the whole project, so it must never reach the browser — a
 * `NEXT_PUBLIC_` var or a client-side fetch would put it in the page source for anyone to
 * lift. It is read from the environment here, on the server, and only the computed numbers
 * are returned. The project token (phc_…) baked into the mobile app CANNOT be used instead:
 * it is write-only and PostHog rejects it for reads with 403.
 *
 * Gated behind the same admin cookie as /api/admin/data — these are business metrics, not
 * public marketing copy. To publish them, drop the isAuthed() check and cache aggressively.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 24 ClickHouse queries, some scanning 90 days. The platform default (10s on
// Hobby) cuts that off mid-flight and the dashboard reports a failure that is
// really a deadline.
export const maxDuration = 60;

const HOST = process.env.POSTHOG_API_HOST || "https://us.posthog.com";

async function hogql(query) {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const pid = process.env.POSTHOG_PROJECT_ID;
  if (!key || !pid) throw new Error("unconfigured");

  const r = await fetch(`${HOST}/api/projects/${pid}/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!r.ok) {
    // Never echo the response body — a PostHog auth error can quote the key back at us.
    throw new Error(`posthog ${r.status}`);
  }
  const j = await r.json();
  return j.results || [];
}

// person_id, NOT distinct_id. The app calls identify(pseudoId(phone)) once the user logs in,
// so one human accumulates several distinct_ids across their anonymous and identified life.
// Counting distinct_id inflates every active-user number here.
const Q = {
  totals: `SELECT
      uniqIf(person_id, timestamp >= now() - INTERVAL 1 DAY)   AS dau,
      uniqIf(person_id, timestamp >= now() - INTERVAL 7 DAY)   AS wau,
      uniqIf(person_id, timestamp >= now() - INTERVAL 30 DAY)  AS mau,
      uniq(person_id)                                          AS all_time,
      countIf(timestamp >= now() - INTERVAL 30 DAY)            AS events_30d,
      min(timestamp)                                           AS first_seen
    FROM events WHERE properties.$geoip_country_name = 'India'`,

  // Global (unfiltered) active users — shown small beside the India headline so the exclusion is
  // explicit. The gap is CI / emulators / App Store review, not users.
  totalsGlobal: `SELECT
      uniqIf(person_id, timestamp >= now() - INTERVAL 1 DAY)   AS dau,
      uniqIf(person_id, timestamp >= now() - INTERVAL 7 DAY)   AS wau,
      uniqIf(person_id, timestamp >= now() - INTERVAL 30 DAY)  AS mau
    FROM events`,

  daily: `SELECT toDate(timestamp) AS day, uniq(person_id) AS dau, count() AS events
    FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND properties.$geoip_country_name = 'India'
    GROUP BY day ORDER BY day`,

  sessions: `SELECT uniq($session_id) AS sessions
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY AND $session_id IS NOT NULL
      AND properties.$geoip_country_name = 'India'`,

  platform: `SELECT properties.$os AS os, uniq(person_id) AS people, count() AS events
    FROM events WHERE timestamp >= now() - INTERVAL 30 DAY
    GROUP BY os ORDER BY people DESC LIMIT 10`,

  events: `SELECT event, count() AS n, uniq(person_id) AS people
    FROM events WHERE timestamp >= now() - INTERVAL 30 DAY
    GROUP BY event ORDER BY n DESC LIMIT 12`,

  // OUR events only. Everything PostHog generates itself ($screen, $identify, $autocapture,
  // Application Opened/Installed/…) is excluded, because mixed together the SDK's noise buries
  // the handful of events that actually describe product behaviour. Window is 90 days, not 30:
  // custom tracking was lost in the 2026-07-04 App.tsx rebuild and only re-wired now, so a
  // 30-day window would render the whole category empty and look like a bug.
  custom: `SELECT event, count() AS n, uniq(person_id) AS people, max(timestamp) AS last_seen
    FROM events
    WHERE timestamp >= now() - INTERVAL 90 DAY
      AND event NOT LIKE '$%' AND event NOT LIKE 'Application %'
    GROUP BY event ORDER BY n DESC LIMIT 40`,

  // THE HONEST FUNNEL. MAU counts anyone with any event — including CI, emulators and App Store
  // review bots. For a login-required India-only app the number that means "a real person
  // onboarded" is people who signed in ($identify). 90d so the whole beta is covered.
  funnel: `SELECT
      uniqIf(person_id, event='Application Installed') AS installed,
      uniqIf(person_id, event='Application Opened')    AS opened,
      uniqIf(person_id, event='$identify')             AS signed_in,
      uniqIf(person_id, properties.$geoip_country_name='India') AS in_india,
      uniq(person_id) AS total
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY`,

  // Country split — surfaces the test/CI inflation (US traffic on an India app).
  countries: `SELECT coalesce(nullIf(properties.$geoip_country_name,''),'(unknown)') AS country,
      uniq(person_id) AS people
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
    GROUP BY country ORDER BY people DESC LIMIT 8`,

  // ── RETENTION. The number that decides whether a mobile app lives. Cohort every
  // person on the day we first saw them, then count who came back N days later.
  // Self-join rather than a window function: HogQL supports both, but the join
  // parses on every PostHog version we might be pointed at.
  retention: `SELECT
      dateDiff('day', f.d0, toDate(e.timestamp)) AS day,
      uniq(e.person_id) AS people
    FROM events e
    INNER JOIN (
      SELECT person_id, min(toDate(timestamp)) AS d0
      FROM events WHERE properties.$geoip_country_name = 'India'
      GROUP BY person_id
    ) f ON e.person_id = f.person_id
    WHERE e.properties.$geoip_country_name = 'India'
      AND dateDiff('day', f.d0, toDate(e.timestamp)) BETWEEN 0 AND 30
    GROUP BY day ORDER BY day`,

  // ── DROP-OFF, SPLIT BY PLATFORM. The whole-cohort funnel hides the case that
  // matters most: one store's build losing people the other's does not.
  funnelByOs: `SELECT
      coalesce(nullIf(properties.$os,''),'(unknown)') AS os,
      uniqIf(person_id, event='Application Installed') AS installed,
      uniqIf(person_id, event='Application Opened')    AS opened,
      uniqIf(person_id, event='$identify')             AS signed_in
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
    GROUP BY os ORDER BY installed DESC LIMIT 6`,

  // ── WHERE PEOPLE GO. $screen is what the mobile SDK emits per navigation.
  screens: `SELECT
      coalesce(nullIf(properties.$screen_name,''), nullIf(properties.$current_url,''), '(unnamed)') AS screen,
      uniq(person_id) AS people, count() AS views
    FROM events
    WHERE event = '$screen' AND timestamp >= now() - INTERVAL 30 DAY
    GROUP BY screen ORDER BY views DESC LIMIT 12`,

  // ── WHAT PEOPLE TAP. Autocapture labels by the element's own text; anything
  // unlabelled is grouped rather than dumped as a raw elements_chain, which is
  // both enormous and unreadable.
  taps: `SELECT
      substring(coalesce(nullIf(properties.$el_text,''),'(unlabelled)'), 1, 40) AS target,
      count() AS taps, uniq(person_id) AS people
    FROM events
    WHERE event = '$autocapture' AND timestamp >= now() - INTERVAL 30 DAY
    GROUP BY target ORDER BY taps DESC LIMIT 12`,

  // ── BUILD ADOPTION. A version that stops appearing is a rollout; a version
  // that never goes away is people stuck on an old build.
  versions: `SELECT
      coalesce(nullIf(properties.$app_version,''),'(unknown)') AS version,
      coalesce(nullIf(properties.$os,''),'(unknown)') AS os,
      uniq(person_id) AS people, max(timestamp) AS last_seen
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY
    GROUP BY version, os ORDER BY people DESC LIMIT 14`,

  // ── WHAT IS BREAKING. $exception is the SDK's own; the ILIKE arms catch
  // hand-rolled error events, which is what this app actually emits today.
  errors: `SELECT
      substring(coalesce(nullIf(properties.$exception_message,''), event), 1, 60) AS problem,
      count() AS n, uniq(person_id) AS people, max(timestamp) AS last_seen
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY
      AND (event = '$exception' OR event ILIKE '%error%' OR event ILIKE '%fail%' OR event ILIKE '%crash%')
    GROUP BY problem ORDER BY n DESC LIMIT 10`,

  // ── SESSION SHAPE. Averages of per-session aggregates, so one very long
  // session cannot masquerade as engagement across the whole cohort.
  sessionShape: `SELECT
      round(avg(n), 1) AS events_per_session,
      round(avg(secs), 0) AS avg_secs,
      round(median(secs), 0) AS median_secs
    FROM (
      SELECT $session_id AS sid, count() AS n,
             dateDiff('second', min(timestamp), max(timestamp)) AS secs
      FROM events
      WHERE timestamp >= now() - INTERVAL 30 DAY AND $session_id IS NOT NULL
        AND properties.$geoip_country_name = 'India'
      GROUP BY sid
    )`,

  // ── WHEN INDIA USES IT. Hour of day in IST, not UTC — a graph shifted 5.5
  // hours tells you the opposite of the truth about an Indian audience.
  hourly: `SELECT
      toHour(timestamp + INTERVAL 330 MINUTE) AS hour,
      uniq(person_id) AS people, count() AS events
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY AND properties.$geoip_country_name = 'India'
    GROUP BY hour ORDER BY hour`,

  // ── NEW vs RETURNING per day. A flat DAU made entirely of new installs is
  // churn wearing a growth costume; this separates the two.
  newVsReturning: `SELECT
      toDate(e.timestamp) AS day,
      uniqIf(e.person_id, toDate(e.timestamp) = f.d0) AS new_people,
      uniqIf(e.person_id, toDate(e.timestamp) > f.d0) AS returning_people
    FROM events e
    INNER JOIN (
      SELECT person_id, min(toDate(timestamp)) AS d0
      FROM events WHERE properties.$geoip_country_name = 'India'
      GROUP BY person_id
    ) f ON e.person_id = f.person_id
    WHERE e.timestamp >= now() - INTERVAL 30 DAY
      AND e.properties.$geoip_country_name = 'India'
    GROUP BY day ORDER BY day`,

  // ── DEVICES. Which handsets to test on, ranked by who actually holds one.
  devices: `SELECT
      substring(coalesce(nullIf(properties.$device_model,''),'(unknown)'), 1, 34) AS model,
      coalesce(nullIf(properties.$os,''),'(unknown)') AS os,
      uniq(person_id) AS people
    FROM events
    WHERE timestamp >= now() - INTERVAL 90 DAY AND properties.$geoip_country_name = 'India'
    GROUP BY model, os ORDER BY people DESC LIMIT 12`,

  // ── FEATURE ADOPTION. Not "how often was this fired" but "what share of real
  // signed-in people ever reached it" — the question a roadmap actually asks.
  adoption: `SELECT
      event,
      uniq(person_id) AS people,
      max(timestamp) AS last_seen
    FROM events
    WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name = 'India'
      AND event NOT LIKE '$%' AND event NOT LIKE 'Application %'
    GROUP BY event ORDER BY people DESC LIMIT 16`,

  // ── DEPTH OF USE. How many days each person was active, bucketed. One-day
  // wonders vs habit is the whole story of a young app.
  depth: `SELECT
      days_active,
      count() AS people
    FROM (
      SELECT person_id, uniq(toDate(timestamp)) AS days_active
      FROM events
      WHERE timestamp >= now() - INTERVAL 30 DAY AND properties.$geoip_country_name = 'India'
      GROUP BY person_id
    )
    GROUP BY days_active ORDER BY days_active`,

  // FULL ACTIVATION JOURNEY — the download→onboarded funnel, India-scoped. Each step is unique
  // people who reached it. The later steps (otp_requested, onboarding_complete, forwarding) only
  // have data once a build carrying the new events ships; until then they read 0, which correctly
  // shows the funnel as "instrumented, awaiting build" rather than pretending.
  journey: `SELECT
      uniqIf(person_id, event='Application Installed')                       AS installed,
      uniqIf(person_id, event='Application Opened')                          AS opened,
      uniqIf(person_id, event='login_otp_requested')                        AS otp_requested,
      uniqIf(person_id, event IN ('login_success','$identify'))             AS signed_in,
      uniqIf(person_id, event='onboarding_complete')                        AS onboarded,
      uniqIf(person_id, event='activation:activate')                         AS forwarding
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name='India'`,

  // Lifecycle + engagement counts (India) — churn signals and feature pickup, for the journey panel.
  lifecycle: `SELECT
      uniqIf(person_id, event='logout')                   AS logged_out,
      uniqIf(person_id, event='account_deleted')          AS deleted,
      uniqIf(person_id, event='take_over_tap')            AS took_over,
      uniqIf(person_id, event='caller_id_enable_tap')     AS caller_id,
      uniqIf(person_id, event='favourites_saved')         AS favourites,
      uniqIf(person_id, event IN ('referral_share','referral_copy')) AS referred,
      uniqIf(person_id, event='call_share')               AS shared_call,
      uniqIf(person_id, event='checkup_verify_forwarding') AS ran_checkup
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name='India'`,

  // India state-wise (real users). subdivision_1 = state.
  states: `SELECT properties.$geoip_subdivision_1_name AS state, uniq(person_id) AS people
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name='India'
      AND properties.$geoip_subdivision_1_name != ''
    GROUP BY state ORDER BY people DESC LIMIT 20`,
};

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    // Every query is run independently and allowed to fail on its own.
    // Promise.all meant one bad query — a property this project has never seen,
    // a HogQL version difference — took the entire dashboard down with it. With
    // 21 queries that is 21 single points of failure for one page. Now a failure
    // costs exactly one card, and `degraded` names what is missing rather than
    // leaving a silently empty panel looking like a real zero.
    const degraded = [];
    let firstError = null;
    const run = async (name) => {
      try {
        return await hogql(Q[name]);
      } catch (e) {
        degraded.push(name);
        firstError = firstError || e?.message;   // kept for the all-failed case
        return [];
      }
    };
    // Six at a time, not all 24 at once. PostHog's query API rate-limits, and a
    // burst of 24 concurrent ClickHouse scans is exactly the shape that trips
    // it — which is how this endpoint started failing in production while
    // working locally against the same project. Still ~4 round trips, not 24.
    const names = Object.keys(Q);
    const R = {};
    const LANES = 6;
    for (let i = 0; i < names.length; i += LANES) {
      const batch = names.slice(i, i + LANES);
      const out = await Promise.all(batch.map(run));
      batch.forEach((n, j) => { R[n] = out[j]; });
    }

    // Isolation is right for ONE broken query. It is wrong for all of them:
    // an unreachable PostHog would otherwise return a confident page of zeros,
    // which reads as "you have no users" rather than "this is down". Losing
    // everything is an outage, so say so.
    if (degraded.length === names.length) {
      throw new Error(firstError || "posthog unreachable");
    }

    const { totals, daily, sessions, platform, events, custom, funnel, countries, states } = R;
    const totalsGlobal = R.totalsGlobal;
    const [gDau = 0, gWau = 0, gMau = 0] = totalsGlobal[0] || [];

    const [dau = 0, wau = 0, mau = 0, allTime = 0, events30d = 0, firstSeen = null] = totals[0] || [];
    const sessionCount = sessions[0]?.[0] ?? 0;

    // The current day is always partial, so its DAU is not comparable to a full day. Flag it
    // rather than dropping it — a chart that silently omits today reads as a cliff.
    const today = new Date().toISOString().slice(0, 10);
    const series = daily.map(([day, d, ev]) => {
      const date = String(day).slice(0, 10);
      return { date, dau: Number(d) || 0, events: Number(ev) || 0, partial: date === today };
    });


    // Approx state centroids (lat, lon) so the real cohort can be placed on a map without shipping
    // megabytes of choropleth path data. Names match PostHog's $geoip_subdivision_1_name exactly.
    const CENTROIDS = {
      "National Capital Territory of Delhi": [28.61, 77.21], "Delhi": [28.61, 77.21],
      "Himachal Pradesh": [31.9, 77.1], "Uttar Pradesh": [27.0, 80.9], "Haryana": [29.2, 76.1],
      "Punjab": [31.0, 75.4], "Chandigarh": [30.73, 76.78], "Karnataka": [15.3, 75.7],
      "Maharashtra": [19.7, 75.7], "Bihar": [25.9, 85.3], "Andhra Pradesh": [15.9, 79.7],
      "Uttarakhand": [30.1, 79.1], "Telangana": [17.9, 79.6], "Tamil Nadu": [11.1, 78.7],
      "Kerala": [10.5, 76.4], "Gujarat": [22.7, 71.6], "Rajasthan": [26.6, 73.8],
      "West Bengal": [22.9, 87.9], "Madhya Pradesh": [23.5, 78.5], "Odisha": [20.5, 84.9],
      "Assam": [26.2, 92.9], "Jharkhand": [23.6, 85.3], "Jammu and Kashmir": [33.8, 76.6],
      "Goa": [15.4, 74.0], "Chhattisgarh": [21.3, 81.7],
    };
    // Equirectangular projection over India's bounding box → 0..1 fractions the client scales.
    const LON0 = 68, LON1 = 98, LAT0 = 6, LAT1 = 37;
    const stateRows = (states || []).map(([name, people]) => {
      const c = CENTROIDS[name];
      return {
        state: name, people: Number(people) || 0,
        // Raw centroid too, so a real tile map can place a marker without
        // inverting the projection below and hoping the constants still match.
        lat: c ? c[0] : null, lon: c ? c[1] : null,
        x: c ? (c[1] - LON0) / (LON1 - LON0) : null,
        y: c ? (LAT1 - c[0]) / (LAT1 - LAT0) : null,   // y inverted (north = up)
      };
    });
    const [fInstalled=0, fOpened=0, fSignedIn=0, fIndia=0, fTotal=0] = funnel[0] || [];

    // Full activation journey + lifecycle (India). Both live in Q, so the
    // resilient loop above has already fetched them — this used to re-fetch
    // them in a bare Promise.all, which meant two things at once: every
    // dashboard load ran these two queries twice, and because that call sat
    // outside the per-query catch, a single 403 from either one threw past all
    // the isolation and 500'd the whole endpoint. Read the results instead.
    const journey = R.journey, lifecycle = R.lifecycle;
    const jr = journey[0] || []; const lc = lifecycle[0] || [];
    const jSteps = [
      { key: "installed", label: "Installed" }, { key: "opened", label: "Opened" },
      { key: "otp_requested", label: "Requested OTP" }, { key: "signed_in", label: "Signed in" },
      { key: "onboarded", label: "Onboarded" }, { key: "forwarding", label: "Forwarding on" },
    ].map((st, i) => ({ ...st, people: Number(jr[i]) || 0 }));
    const lcKeys = ["logged_out","deleted","took_over","caller_id","favourites","referred","shared_call","ran_checkup"];
    const lcLabels = { logged_out:"Logged out", deleted:"Deleted account", took_over:"Took over a call",
      caller_id:"Enabled caller ID", favourites:"Saved a favourite", referred:"Referred a friend",
      shared_call:"Shared a call", ran_checkup:"Ran checkup" };
    const lifecycleRows = lcKeys.map((k, i) => ({ key: k, label: lcLabels[k], people: Number(lc[i]) || 0 }));

    const full = series.filter((d) => !d.partial);
    const avgDau = full.length ? Math.round(full.reduce((a, b) => a + b.dau, 0) / full.length) : 0;

    return NextResponse.json({
      ok: true,
      asOf: new Date().toISOString(),
      firstSeen,
      active: {
        dau, wau, mau, allTime, avgDau,
        // Classic stickiness. Read it with care while the project is young: data only starts
        // at firstSeen, so a 30-day MAU that predates a full month of history is really
        // "everyone we have ever seen" and the ratio is flattered.
        stickiness: mau ? Math.round((dau / mau) * 1000) / 10 : 0,
        windowIsFullMonth: firstSeen
          ? (Date.now() - new Date(firstSeen).getTime()) / 86400000 >= 30
          : false,
        scope: "India",
        globalDau: gDau, globalWau: gWau, globalMau: gMau,
      },
      volume: {
        events30d,
        sessions: sessionCount,
        sessionsPerPerson: mau ? Math.round((sessionCount / mau) * 100) / 100 : 0,
      },
      series,
      platform: platform.map(([os, people, ev]) => ({
        os: os || "unknown",
        people: Number(people) || 0,
        events: Number(ev) || 0,
        perPerson: people ? Math.round(Number(ev) / Number(people)) : 0,
      })),
      topEvents: events.map(([name, n, people]) => ({
        name, count: Number(n) || 0, people: Number(people) || 0,
      })),
      // Flagged stale if nothing has arrived for 7 days — that is exactly the signal that caught
      // the July regression, where every custom event simply stopped and nobody noticed.
      journey: jSteps,
      lifecycle: lifecycleRows,
      funnel: { installed: fInstalled, opened: fOpened, signedIn: fSignedIn, india: fIndia, total: fTotal,
                activation: fInstalled ? Math.round((fSignedIn / fInstalled) * 1000) / 10 : 0 },
      countries: (countries || []).map(([c, p]) => ({ country: c, people: Number(p) || 0 })),

      // ── the added panels ──────────────────────────────────────────────
      // Day 0 is the cohort itself, so every later day is a share of it.
      retention: (() => {
        const rows = (R.retention || []).map(([d, p]) => ({ day: Number(d), people: Number(p) || 0 }));
        const base = rows.find((r) => r.day === 0)?.people || 0;
        return rows.map((r) => ({ ...r, pct: base ? Math.round((r.people / base) * 1000) / 10 : 0 }));
      })(),
      funnelByOs: (R.funnelByOs || []).map(([os, i, o, s2]) => {
        const installed = Number(i) || 0, opened = Number(o) || 0, signedIn = Number(s2) || 0;
        return {
          os, installed, opened, signedIn,
          // Drop-off is the interesting half of a funnel; compute it here so
          // every consumer reports the same number.
          openRate: installed ? Math.round((opened / installed) * 1000) / 10 : null,
          signInRate: opened ? Math.round((signedIn / opened) * 1000) / 10 : null,
          lostAtOpen: Math.max(0, installed - opened),
          lostAtSignIn: Math.max(0, opened - signedIn),
        };
      }),
      screens: (R.screens || []).map(([screen, people, views]) => ({
        screen, people: Number(people) || 0, views: Number(views) || 0,
      })),
      taps: (R.taps || []).map(([target, n, people]) => ({
        target, taps: Number(n) || 0, people: Number(people) || 0,
      })),
      versions: (R.versions || []).map(([version, os, people, last]) => ({
        version, os, people: Number(people) || 0, lastSeen: last ? String(last) : null,
      })),
      errors: (R.errors || []).map(([problem, n, people, last]) => ({
        problem, count: Number(n) || 0, people: Number(people) || 0, lastSeen: last ? String(last) : null,
      })),
      sessionShape: (() => {
        const [ev = 0, avg = 0, med = 0] = R.sessionShape?.[0] || [];
        return { eventsPerSession: Number(ev) || 0, avgSecs: Number(avg) || 0, medianSecs: Number(med) || 0 };
      })(),
      hourly: (R.hourly || []).map(([h, people, ev]) => ({
        hour: Number(h), people: Number(people) || 0, events: Number(ev) || 0,
      })),
      newVsReturning: (R.newVsReturning || []).map(([day, nw, ret]) => ({
        date: String(day).slice(0, 10), newPeople: Number(nw) || 0, returning: Number(ret) || 0,
      })),
      devices: (R.devices || []).map(([model, os, people]) => ({
        model, os, people: Number(people) || 0,
      })),
      adoption: (R.adoption || []).map(([event, people, last]) => ({
        event, people: Number(people) || 0, lastSeen: last ? String(last) : null,
      })),
      depth: (R.depth || []).map(([d, p]) => ({ daysActive: Number(d), people: Number(p) || 0 })),

      // Named so a missing panel reads as "this query failed" rather than "zero".
      degraded,
      states: stateRows,
      customEvents: custom.map(([name, n, people, last]) => {
        const lastSeen = last ? String(last) : null;
        const ageDays = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) / 86400000 : null;
        return {
          name, count: Number(n) || 0, people: Number(people) || 0,
          lastSeen, stale: ageDays === null ? true : ageDays > 7,
        };
      }),
    });
  } catch (e) {
    const msg = e?.message === "unconfigured"
      ? "Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID in .env.local"
      : "PostHog query failed";
    console.error("admin posthog failed:", e?.message);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
