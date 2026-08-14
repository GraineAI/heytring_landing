import { NextResponse } from "next/server";
import { foldDaily, DELTA_DAYS } from "../../../lib/daily";
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

// Every query is bounded on timestamp. `totals` and `totalsGlobal` were not:
// they asked for uniq(person_id) across ALL history with a JSON property filter
// on every row, which is a full table scan. PostHog eventually refused them
// outright — "hit the max execution time... failed the same way 4 times in a
// row, so it was not run again" — and the dashboard's headline DAU/WAU/MAU
// silently showed 0. 180 days still covers every event this project has (first
// event 2026-07-01); it just stops asking ClickHouse to prove it.
//
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
    FROM events
    WHERE timestamp >= now() - INTERVAL 180 DAY AND properties.$geoip_country_name = 'India'`,

  // Global (unfiltered) active users — shown small beside the India headline so the exclusion is
  // explicit. The gap is CI / emulators / App Store review, not users.
  totalsGlobal: `SELECT
      uniqIf(person_id, timestamp >= now() - INTERVAL 1 DAY)   AS dau,
      uniqIf(person_id, timestamp >= now() - INTERVAL 7 DAY)   AS wau,
      uniqIf(person_id, timestamp >= now() - INTERVAL 30 DAY)  AS mau
    FROM events WHERE timestamp >= now() - INTERVAL 180 DAY`,

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
  // ACTIVATION IS COMPUTED TWICE, ON PURPOSE, AND THE INDIA ONE IS THE HEADLINE.
  // The global columns count CI, emulators and App Store review bots. Those install and open and
  // then never sign in — they only ever land in the denominator. Dividing global sign-ins by
  // global installs therefore reports an activation rate lower than the real one, on a panel whose
  // own copy says the honest denominator is the India cohort. It was understating the number the
  // whole dashboard is built around.
  funnel: `SELECT
      uniqIf(person_id, event='Application Installed') AS installed,
      uniqIf(person_id, event='Application Opened')    AS opened,
      uniqIf(person_id, event='$identify')             AS signed_in,
      uniqIf(person_id, properties.$geoip_country_name='India') AS in_india,
      uniq(person_id) AS total,
      uniqIf(person_id, event='Application Installed' AND properties.$geoip_country_name='India') AS installed_in,
      uniqIf(person_id, event='Application Opened'    AND properties.$geoip_country_name='India') AS opened_in,
      uniqIf(person_id, event='$identify'             AND properties.$geoip_country_name='India') AS signed_in_in
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
  // ── RETENTION. The number that decides whether a mobile app lives.
  //
  // Measured, not guessed: the first version joined raw events to an unbounded
  // per-person min(date) and took 31s on its own — a third of the whole
  // dashboard. This does ONE scan, collapses to person x day (a few thousand
  // rows for a beta this size), and takes d0 from a window over that. 4.2s,
  // and verified to return the identical curve: d0=141 d1=61 d7=20.
  retention: `SELECT dateDiff('day', d0, d) AS day, uniq(person_id) AS people
    FROM (
      SELECT person_id, d, min(d) OVER (PARTITION BY person_id) AS d0
      FROM (
        SELECT person_id, toDate(timestamp) AS d
        FROM events
        WHERE timestamp >= now() - INTERVAL 60 DAY AND properties.$geoip_country_name = 'India'
        GROUP BY person_id, d
      )
    )
    GROUP BY day HAVING day >= 0 AND day <= 30 ORDER BY day`,

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
  // ── NEW vs RETURNING per day. A flat DAU made entirely of new installs is
  // churn wearing a growth costume; this separates the two. Same rewrite as
  // retention above — was 43.5s as a raw-event join, now 3.1s, same numbers.
  newVsReturning: `SELECT d AS day,
      uniqIf(person_id, d = d0) AS new_people,
      uniqIf(person_id, d > d0) AS returning_people
    FROM (
      SELECT person_id, d, min(d) OVER (PARTITION BY person_id) AS d0
      FROM (
        SELECT person_id, toDate(timestamp) AS d
        FROM events
        WHERE timestamp >= now() - INTERVAL 60 DAY AND properties.$geoip_country_name = 'India'
        GROUP BY person_id, d
      )
    )
    WHERE d >= today() - 30
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

  // FULL ACTIVATION JOURNEY — the download→activated funnel, India-scoped. Each step is unique
  // people who reached it. The granular middle steps (signin_started, otp_shown, otp_submitted,
  // activated) ship over OTA — the SDK is already in the binary — so they populate as that update
  // reaches devices, not after a native build. They read 0 only until the OTA propagates.
  // THE LIFECYCLE, as the product defines it (each column = unique India people who reached it):
  //   code_requested — asked for an OTP (may never have entered it: the biggest leak)
  //   signed_in      — verified an OTP (but may never have finished setup)
  //   forwarding_enabled — setup done, forwarding ON, product ARMED (activation:activate is the old
  //                    name for this exact moment, so it's unioned in for history)
  //   activated      — Tring has ANSWERED at least one real call
  //   retained       — answered calls on 5+ distinct days
  journey: `SELECT
      uniqIf(person_id, event IN ('Application Installed','app_first_open'))    AS installed,
      uniqIf(person_id, event IN ('Application Opened','app_first_open'))       AS opened,
      uniqIf(person_id, event='login_otp_requested')                           AS code_requested,
      uniqIf(person_id, event IN ('login_success','$identify'))                AS signed_in,
      uniqIf(person_id, event IN ('forwarding_enabled','activation:activate'))  AS forwarding_enabled,
      uniqIf(person_id, event='activated')                                     AS activated,
      uniqIf(person_id, event='retained')                                      AS retained,
      uniqIf(person_id, event='otp_autofilled')                               AS otp_autofilled
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name='India'`,

  // Lifecycle + engagement counts (India) — churn signals and feature pickup, for the journey panel.
  lifecycle: `SELECT
      uniqIf(person_id, event='logout')                   AS logged_out,
      uniqIf(person_id, event='account_deleted')          AS deleted,
      uniqIf(person_id, event='take_over_tap')            AS took_over,
      uniqIf(person_id, event='caller_id_enable_tap')     AS caller_id,
      uniqIf(person_id, event='favourites_saved')         AS favourites,
      uniqIf(person_id, event IN ('referral_share_completed','referral_copy')) AS referred,
      uniqIf(person_id, event IN ('call_share','share_call_completed')) AS shared_call,
      uniqIf(person_id, event='screened_call_viewed')     AS viewed_call,
      uniqIf(person_id, event='weekly_summary_opened')    AS weekly_open,
      uniqIf(person_id, event='checkup_verify_forwarding') AS ran_checkup
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name='India'`,

  // WORD-OF-MOUTH LOOP — the K-factor funnel. tapped (opened the share sheet) → completed (actually
  // sent, only on Share.sharedAction) → referred → redeemed. Viral coefficient is ~0 today, so this
  // is the panel that tells you whether the post-call WhatsApp share is moving it.
  shareLoop: `SELECT
      uniqIf(person_id, event='share_call_tapped')        AS tapped,
      uniqIf(person_id, event='share_call_completed')     AS completed,
      uniqIf(person_id, event IN ('referral_share_completed','referral_copy')) AS referred,
      uniqIf(person_id, event='referral_redeemed')        AS redeemed
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name='India'`,

  // India state-wise (real users). subdivision_1 = state.
  states: `SELECT properties.$geoip_subdivision_1_name AS state, uniq(person_id) AS people
    FROM events WHERE timestamp >= now() - INTERVAL 90 DAY
      AND properties.$geoip_country_name='India'
      AND properties.$geoip_subdivision_1_name != ''
    GROUP BY state ORDER BY people DESC LIMIT 20`,

  // ── DAY-TO-DAY INCREASE ──────────────────────────────────────────────────────────────────
  // The panels above are 90-day totals: correct, and completely silent about direction. "Ran
  // checkup: 30" reads the same on the day it doubles as on the day it stops moving entirely.
  //
  // These are ADDITIVE queries, deliberately separate from the totals they annotate rather than
  // folded into them. They are new HogQL against a hosted PostHog whose version this code does not
  // pin, and the runner isolates failures per query — so if one of these does not parse, the panel
  // it annotates keeps its total and simply loses its delta. Rewriting the working queries would
  // have risked the numbers themselves to add a decoration.
  //
  // FIRST OCCURRENCE, NOT ACTIVITY. The subquery takes min(timestamp) per person, so a day's
  // number is how many people reached that thing FOR THE FIRST TIME — which is exactly the amount
  // the 90-day total went up by that day. Counting people merely active in the window would count
  // returning users too, and the deltas would not sum to the change in the headline: the tile would
  // claim +8 while the number beside it moved by 3.
  newByEventDay: `SELECT event, toDate(first_ts) AS d, uniq(person_id) AS people
    FROM (
      SELECT event, person_id, min(timestamp) AS first_ts
      FROM events
      WHERE timestamp >= now() - INTERVAL 90 DAY
        AND properties.$geoip_country_name = 'India'
      GROUP BY event, person_id
    )
    WHERE first_ts >= now() - INTERVAL 14 DAY
    GROUP BY event, d ORDER BY d`,

  newByStateDay: `SELECT state, toDate(first_ts) AS d, uniq(person_id) AS people
    FROM (
      SELECT properties.$geoip_subdivision_1_name AS state, person_id, min(timestamp) AS first_ts
      FROM events
      WHERE timestamp >= now() - INTERVAL 90 DAY
        AND properties.$geoip_country_name = 'India'
        AND properties.$geoip_subdivision_1_name != ''
      GROUP BY state, person_id
    )
    WHERE first_ts >= now() - INTERVAL 14 DAY
    GROUP BY state, d ORDER BY d`,

  newByOsDay: `SELECT os, step, toDate(first_ts) AS d, uniq(person_id) AS people
    FROM (
      SELECT coalesce(nullIf(properties.$os,''),'(unknown)') AS os,
             person_id,
             multiIf(event='Application Installed','installed',
                     event='Application Opened','opened',
                     event='$identify','signed_in','other') AS step,
             min(timestamp) AS first_ts
      FROM events
      WHERE timestamp >= now() - INTERVAL 90 DAY
        AND event IN ('Application Installed','Application Opened','$identify')
      GROUP BY os, person_id, step
    )
    WHERE first_ts >= now() - INTERVAL 14 DAY
    GROUP BY os, step, d ORDER BY d`,
};

/**
 * Stale-while-revalidate, in module scope so it survives between requests on a
 * warm instance.
 *
 * These are 30- and 90-day aggregates. They do not move second to second, but
 * they cost ~5s of ClickHouse to rebuild, and the page auto-refreshes every 10
 * minutes on top of whatever the founder clicks. So: serve anything younger
 * than FRESH_MS outright; serve older data instantly and rebuild behind it;
 * only make someone wait when there is nothing to show at all.
 *
 * `?fresh=1` skips the cache entirely — that is what the Refresh button sends,
 * because a button labelled Refresh that returns a cached page is a lie.
 */
let CACHE = null;          // { at, payload }
let INFLIGHT = null;       // de-dupes concurrent misses into one query fan-out
const FRESH_MS = 90_000;   // younger than this: no refetch at all
const STALE_MS = 600_000;  // older than this: make them wait for real data

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const wantsFresh = new URL(req.url).searchParams.get("fresh") === "1";
  const age = CACHE ? Date.now() - CACHE.at : Infinity;

  if (!wantsFresh && CACHE && age < FRESH_MS) {
    return NextResponse.json({ ...CACHE.payload, cache: "hit", ageMs: age });
  }
  if (!wantsFresh && CACHE && age < STALE_MS) {
    // Hand back what we have now and rebuild in the background. Errors are
    // swallowed on purpose: a failed background refresh must not replace a
    // perfectly good cached payload with a 500.
    if (!INFLIGHT) {
      INFLIGHT = build().then((p) => { CACHE = { at: Date.now(), payload: p }; })
        .catch(() => {}).finally(() => { INFLIGHT = null; });
    }
    return NextResponse.json({ ...CACHE.payload, cache: "stale", ageMs: age });
  }

  try {
    // Concurrent cold misses share one fan-out rather than each firing 24 queries.
    INFLIGHT = INFLIGHT || build().finally(() => { INFLIGHT = null; });
    const payload = await INFLIGHT;
    CACHE = { at: Date.now(), payload };
    return NextResponse.json({ ...payload, cache: "miss", ageMs: 0 });
  } catch (e) {
    const msg = e?.message === "unconfigured"
      ? "Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID in .env.local"
      : "PostHog query failed";
    console.error("admin posthog failed:", e?.message);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


async function build() {
  {
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
    const [fInstalled=0, fOpened=0, fSignedIn=0, fIndia=0, fTotal=0,
           fInstalledIn=0, fOpenedIn=0, fSignedInIn=0] = funnel[0] || [];

    // Full activation journey + lifecycle (India). Both live in Q, so the
    // resilient loop above has already fetched them — this used to re-fetch
    // them in a bare Promise.all, which meant two things at once: every
    // dashboard load ran these two queries twice, and because that call sat
    // outside the per-query catch, a single 403 from either one threw past all
    // the isolation and 500'd the whole endpoint. Read the results instead.
    const journey = R.journey, lifecycle = R.lifecycle;
    const jr = journey[0] || []; const lc = lifecycle[0] || [];
    // The lifecycle funnel, in the product's own terms. installed/opened are context; the five
    // stages that matter run code_requested → signed_in → forwarding_enabled → activated → retained.
    // The order of these keys MUST match the SELECT column order in Q.journey (jr is positional).
    const jSteps = [
      { key: "installed", label: "Installed" },
      { key: "opened", label: "Opened" },
      { key: "code_requested", label: "Code requested" },
      { key: "signed_in", label: "Signed in" },
      { key: "forwarding_enabled", label: "Forwarding enabled" },
      { key: "activated", label: "Activated — answered a call" },
      { key: "retained", label: "Retained — 5+ call days" },
    ].map((st, i) => ({ ...st, people: Number(jr[i]) || 0 }));
    // Auto-read effectiveness — of people who requested a code, how many had it fill itself from the
    // SMS. A low number (esp. on Android) is the data that justifies the SMS-Retriever native build.
    // otp_autofilled is the 8th SELECT column (index 7); code_requested is index 2.
    const otpDenom = Number(jr[2]) || 0, otpAutofilled = Number(jr[7]) || 0;
    const otpAutofillRate = otpDenom ? Math.round((otpAutofilled / otpDenom) * 1000) / 10 : 0;
    const lcKeys = ["logged_out","deleted","took_over","caller_id","favourites","referred","shared_call","viewed_call","weekly_open","ran_checkup"];
    const lcLabels = { logged_out:"Logged out", deleted:"Deleted account", took_over:"Took over a call",
      caller_id:"Enabled caller ID", favourites:"Saved a favourite", referred:"Referred a friend",
      shared_call:"Shared a call", viewed_call:"Viewed a handled call", weekly_open:"Opened weekly summary",
      ran_checkup:"Ran checkup" };
    // THE EVENT NAMES TRAVEL WITH THE ROW. The daily-delta series is keyed by raw event, and the
    // only place that knows a lifecycle tile is built from `referral_share_completed` OR
    // `referral_copy` is the SQL a few hundred lines up. Shipping the mapping means the client
    // never re-states it — a second copy would drift the first time an event is renamed, and it
    // would drift silently, because a delta quietly summing a dead event name still renders a
    // confident +0.
    const LC_EVENTS = {
      logged_out: ["logout"], deleted: ["account_deleted"], took_over: ["take_over_tap"],
      caller_id: ["caller_id_enable_tap"], favourites: ["favourites_saved"],
      referred: ["referral_share_completed", "referral_copy"],
      shared_call: ["call_share", "share_call_completed"],
      viewed_call: ["screened_call_viewed"], weekly_open: ["weekly_summary_opened"],
      ran_checkup: ["checkup_verify_forwarding"],
    };
    const lifecycleRows = lcKeys.map((k, i) => ({
      key: k, label: lcLabels[k], people: Number(lc[i]) || 0, events: LC_EVENTS[k] || [],
    }));
    // Word-of-mouth loop counts.
    const sl = (R.shareLoop && R.shareLoop[0]) || [];
    const shareLoop = {
      tapped: Number(sl[0]) || 0, completed: Number(sl[1]) || 0,
      referred: Number(sl[2]) || 0, redeemed: Number(sl[3]) || 0,
      // Completion rate of the share sheet, and a crude single-hop K proxy (redeemed per completed).
      completionRate: Number(sl[0]) ? Math.round((Number(sl[1]) / Number(sl[0])) * 1000) / 10 : 0,
      events: {
        tapped: ["share_call_tapped"], completed: ["share_call_completed"],
        referred: ["referral_share_completed", "referral_copy"], redeemed: ["referral_redeemed"],
      },
    };

    const full = series.filter((d) => !d.partial);
    const avgDau = full.length ? Math.round(full.reduce((a, b) => a + b.dau, 0) / full.length) : 0;

    return {
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
      // The five product stages + the conversion between each, so the UI states them plainly rather
      // than re-deriving. answerRate (forwarding_enabled → activated) is the one that separates "a
      // quiet week" from a real problem: it's low only when armed phones aren't ringing.
      lifecycleSummary: (() => {
        const g = (k) => jSteps.find((s) => s.key === k)?.people || 0;
        const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
        const codeRequested = g("code_requested"), signedIn = g("signed_in"),
          forwardingEnabled = g("forwarding_enabled"), activated = g("activated"), retained = g("retained");
        return {
          codeRequested, signedIn, forwardingEnabled, activated, retained,
          signinRate: pct(signedIn, codeRequested),          // entered the code they asked for
          armRate: pct(forwardingEnabled, signedIn),         // finished setup / turned forwarding on
          answerRate: pct(activated, forwardingEnabled),     // armed phone actually got a call answered
          retainRate: pct(retained, activated),              // stuck around for 5+ call-days
        };
      })(),
      otpAutofillRate,
      shareLoop,
      lifecycle: lifecycleRows,
      funnel: { installed: fInstalled, opened: fOpened, signedIn: fSignedIn, india: fIndia, total: fTotal,
                // Kept for the global-vs-India comparison the panel draws. Read `activationIndia`.
                activation: fInstalled ? Math.round((fSignedIn / fInstalled) * 1000) / 10 : 0,
                installedIndia: fInstalledIn, openedIndia: fOpenedIn, signedInIndia: fSignedInIn,
                activationIndia: fInstalledIn ? Math.round((fSignedInIn / fInstalledIn) * 1000) / 10 : null },
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

      // The daily deltas, folded into a shape the tiles can read directly: one series per key,
      // oldest → newest, with the missing days filled in as real zeros. A gap in a "new people per
      // day" series IS a zero — nobody arrived — which is the one case where filling is honest.
      dailyNew: {
        byEvent: foldDaily(R.newByEventDay, (r) => String(r[0])),
        byState: foldDaily(R.newByStateDay, (r) => String(r[0])),
        byOsStep: foldDaily(R.newByOsDay, (r) => `${r[0]}|${r[1]}`, { dateIdx: 2 }),
        days: DELTA_DAYS,
        // So a tile can say "delta unavailable" rather than draw a confident +0.
        degraded: ["newByEventDay", "newByStateDay", "newByOsDay"].filter((n) => degraded.includes(n)),
      },

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
    };
  }
}
