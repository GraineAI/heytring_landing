"use client";

/**
 * The date range, and an honest account of who obeys it.
 *
 * WHY THIS IS A TABLE AND NOT A NUMBER. Every admin endpoint takes its own window parameter with
 * its own bounds, and several take none at all — FastAPI silently discards a query parameter it
 * does not declare, so sending `days` to one of those returns byte-identical data for 7 days and
 * for 365. A picker wired naively to everything would move, change nothing, and give no sign of
 * it. That is strictly worse than having no picker, because it converts "I don't know" into a
 * confident wrong answer.
 *
 * So each panel declares what it actually supports. CLAMP returns null for panels that cannot
 * filter, and the UI labels those "all time" rather than pretending.
 */

export const RANGES = [
  { days: 14, label: "14d" },
  { days: 30, label: "30d" },
  { days: 60, label: "60d" },
  { days: 90, label: "90d" },
  { days: 180, label: "6mo" },
  { days: 0, label: "All" },
];

// Bounds copied from each endpoint's own Query(...) declaration. Out-of-range is a 422, not a
// clamp, at the server — so the clamping has to happen here or the panel simply fails to load.
const BOUNDS = {
  metrics: { min: 0, max: 365, partial: true },   // only its windowed fields move
  users: { min: 1, max: 365 },
  power_users: { min: 0, max: 365 },
  utility: { min: 7, max: 90 },
  referrals: { min: 14, max: 180 },
  carriers: { min: 7, max: 365 },
  revenue: { min: 7, max: 365 },
  intel: { min: 1, max: 90 },
  delivery_health: { min: 1, max: 90 },
  // Declared with no window at all — a picker cannot touch these and must not imply otherwise.
  autopsy: null,
  feed: null,
  timeseries: null,     // weeks/months, a different unit entirely
  retention: null,
};

/** The `days` value to send for a panel, or null when the panel cannot be filtered. */
export function clamp(panel, days) {
  const b = BOUNDS[panel];
  if (!b) return null;
  if (!days) return b.min === 0 ? 0 : null;   // "All" only where all-time is expressible
  return Math.min(b.max, Math.max(b.min, days));
}

/** True when the chosen range genuinely reaches this panel. */
export function honours(panel, days) {
  return clamp(panel, days) !== null;
}

/** Appends &days= only when it will be honoured — never decoration. */
export function withRange(url, panel, days) {
  const d = clamp(panel, days);
  return d === null || d === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}days=${d}`;
}

export function rangeLabel(panel, days) {
  const d = clamp(panel, days);
  if (d === null) return "all time";
  if (d === 0) return "all time";
  if (d !== days) return `${d}d (this panel's limit)`;
  return `${d}d`;
}
