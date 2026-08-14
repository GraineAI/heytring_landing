/**
 * The day-to-day deltas, and the two things they must never do: drift by a day, or invent a zero
 * for something that was never measured.
 *
 * Run: node app/lib/daily.test.mjs
 */
import { foldDaily, sumSeries, readout, windowDays } from "./daily.js";

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.error(`FAIL ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};
const NOW = Date.parse("2026-08-14T09:30:00Z");   // mid-morning, to catch any UTC/rounding slip

// ── the window ──────────────────────────────────────────────────────────────────────────────
const w = windowDays(NOW, 5);
eq(w, ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"], "oldest → newest, inclusive of today");
eq(w.length, 5, "exactly the days asked for");
eq(windowDays(NOW).length, 14, "fourteen by default");

// ── the fold ────────────────────────────────────────────────────────────────────────────────
const rows = [
  ["checkup_verify_forwarding", "2026-08-12", 4],
  ["checkup_verify_forwarding", "2026-08-14", 6],
  ["logout", "2026-08-13", 1],
];
const f = foldDaily(rows, (r) => r[0], { now: NOW, days: 5 });
eq(f.checkup_verify_forwarding.map((r) => r.people), [0, 0, 4, 0, 6],
   "days with no row are real zeros — nobody arrived — and the days stay in place");
eq(f.logout.map((r) => r.people), [0, 0, 0, 1, 0], "a middle day does not slide to the end");
eq(Object.keys(f).sort(), ["checkup_verify_forwarding", "logout"], "one series per key, and no others invented");

// Anything outside the window is dropped rather than folded onto an edge day, which would show up
// as a phantom spike on the oldest bar.
eq(foldDaily([["e", "2026-01-01", 99]], (r) => r[0], { now: NOW, days: 5 }).e.map((r) => r.people),
   [0, 0, 0, 0, 0], "an out-of-window row does not pile onto the first day");

// Composite keys, for a series split by more than one dimension.
eq(foldDaily([["iOS", "signed_in", "2026-08-14", 3]], (r) => `${r[0]}|${r[1]}`, { dateIdx: 2, now: NOW, days: 2 }),
   { "iOS|signed_in": [{ date: "2026-08-13", people: 0 }, { date: "2026-08-14", people: 3 }] },
   "composite key with the date column moved along");

// Malformed input must not throw — this runs against a hosted PostHog whose shape is not ours.
eq(foldDaily(null, (r) => r[0], { now: NOW }), {}, "null rows fold to nothing");
eq(foldDaily([null, "nonsense", []], (r) => r?.[0], { now: NOW }), {}, "junk rows are skipped, not thrown on");

// ── summing across events ───────────────────────────────────────────────────────────────────
const a = { x: [{ date: "d1", people: 1 }, { date: "d2", people: 2 }],
            y: [{ date: "d1", people: 10 }, { date: "d2", people: 0 }] };
eq(sumSeries(a, ["x", "y"]).map((r) => r.people), [11, 2], "summed day by day, not concatenated");
eq(sumSeries(a, ["x", "absent"]).map((r) => r.people), [1, 2], "a missing name contributes nothing");
eq(sumSeries(a, ["absent", "gone"]), null, "NONE present is null — not a row of zeros");
eq(sumSeries(a, []), null, "and an empty ask is null too");
// The distinction that matters: null means "we have no reading", a zero series means "measured, none".
eq(sumSeries({ z: [{ date: "d1", people: 0 }] }, ["z"]).map((r) => r.people), [0],
   "a genuinely zero series is still a series");

// ── the readout ─────────────────────────────────────────────────────────────────────────────
const s = [1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => ({ date: `d${i}`, people: n }));
eq(readout(s), { today: 8, yesterday: 7, week: 2 + 3 + 4 + 5 + 6 + 7 + 8 }, "today, yesterday, trailing 7");
eq(readout([{ date: "d0", people: 5 }]), { today: 5, yesterday: 0, week: 5 }, "a one-day series has no yesterday");
eq(readout([]), null, "and an empty one has no readout at all");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
