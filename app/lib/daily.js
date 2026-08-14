/**
 * Daily "new people" series — the fold from HogQL rows to something a tile can draw.
 *
 * Every headline on the admin dashboard is a 90-day total. Correct, and completely silent about
 * direction: "Ran checkup — 30" reads identically on the day it doubles and on the day it stops
 * moving entirely. These series are the delta beside it.
 *
 * Pure, and out of the route, for the reason the rest of this codebase keeps its arithmetic pure:
 * the route cannot be exercised without a live PostHog, and untested date-window logic is exactly
 * the kind that is wrong by one day for a month before anybody notices.
 */

export const DELTA_DAYS = 14;

/** The window, oldest → newest, as YYYY-MM-DD. `now` is injected so the tests are not clock-bound. */
export function windowDays(now, n = DELTA_DAYS) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  return out;
}

/**
 * Rows of [key…, date, people] → { key: [{date, people}] }, oldest → newest, zero-filled.
 *
 * ZERO-FILLING IS RIGHT HERE and wrong nearly everywhere else on this dashboard. These rows count
 * people arriving for the FIRST time, so a day with no row means nobody arrived — a measured zero,
 * not a missing reading. The retention curve fills nothing, for precisely the opposite reason: a
 * gap there means that cohort has not aged that far yet, and drawing it as 0% would invent a
 * collapse. Same-looking gap, opposite meaning, so the two must not share a helper.
 *
 * @param keyOf    builds the series key from a row (e.g. the event name, or `os|step`)
 * @param dateIdx  index of the date column; `people` is assumed to be the next one
 */
export function foldDaily(rows, keyOf, { dateIdx = 1, now = Date.now(), days = DELTA_DAYS } = {}) {
  const byKey = {};
  for (const r of rows || []) {
    if (!Array.isArray(r)) continue;
    const k = keyOf(r);
    if (k == null) continue;
    const date = String(r[dateIdx] ?? "").slice(0, 10);
    if (!date) continue;
    (byKey[k] ||= {})[date] = Number(r[dateIdx + 1]) || 0;
  }
  const win = windowDays(now, days);
  return Object.fromEntries(
    Object.entries(byKey).map(([k, at]) => [k, win.map((d) => ({ date: d, people: at[d] || 0 }))]),
  );
}

/**
 * Sum several series day by day, for a tile built from more than one event.
 *
 * Returns null when NONE of the names have a series, so the caller can tell "no data for this"
 * from "genuinely zero every day" — a zero-filled row of zeros is a claim, and it should only be
 * made about something we actually measured.
 */
export function sumSeries(byKey, names) {
  const found = (names || []).map((n) => byKey?.[n]).filter(Boolean);
  if (!found.length) return null;
  return found[0].map((_, i) => ({
    date: found[0][i].date,
    people: found.reduce((a, s) => a + (s[i]?.people || 0), 0),
  }));
}

/** Today, yesterday and the trailing week off one series. */
export function readout(series) {
  if (!series?.length) return null;
  const n = series.length;
  return {
    today: series[n - 1]?.people || 0,
    yesterday: series[n - 2]?.people || 0,
    week: series.slice(-7).reduce((a, r) => a + r.people, 0),
  };
}
