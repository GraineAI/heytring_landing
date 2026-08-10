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
    const [totals, daily, sessions, platform, events, custom, funnel, countries, states] = await Promise.all([
      hogql(Q.totals), hogql(Q.daily), hogql(Q.sessions), hogql(Q.platform), hogql(Q.events),
      hogql(Q.custom), hogql(Q.funnel), hogql(Q.countries), hogql(Q.states),
    ]);
    const totalsGlobal = await hogql(Q.totalsGlobal);
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
        x: c ? (c[1] - LON0) / (LON1 - LON0) : null,
        y: c ? (LAT1 - c[0]) / (LAT1 - LAT0) : null,   // y inverted (north = up)
      };
    });
    const [fInstalled=0, fOpened=0, fSignedIn=0, fIndia=0, fTotal=0] = funnel[0] || [];

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
      funnel: { installed: fInstalled, opened: fOpened, signedIn: fSignedIn, india: fIndia, total: fTotal,
                activation: fInstalled ? Math.round((fSignedIn / fInstalled) * 1000) / 10 : 0 },
      countries: (countries || []).map(([c, p]) => ({ country: c, people: Number(p) || 0 })),
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
