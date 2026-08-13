/**
 * The three absences these functions exist to handle: a partial day, a missing row, an unaged
 * cohort. Each was previously rendered as if it were a measurement.
 *
 * Run: node app/lib/series.test.mjs
 */
import { rolling, denseSlots, cohortCurve } from "./series.js";

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.error(`FAIL ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};

// ── rolling: the in-progress day must not be averaged in ────────────────────────────────────
eq(rolling([{ dau: 10 }, { dau: 20 }, { dau: 30 }], 3), [10, 15, 20], "plain trailing mean over complete days");
eq(rolling([{ dau: 10 }, { dau: 20 }, { dau: 2, partial: true }], 3), [10, 15, null],
   "the partial day gets no point of its own — the line breaks instead");
// THE REGRESSION THIS FILE EXISTS FOR: today's 2 events used to pull the last average from 15
// to 10.7 every single morning, at the right-hand end of the chart.
eq(rolling([{ dau: 10 }, { dau: 20 }, { dau: 2, partial: true }], 3).filter((v) => v != null).pop(), 15,
   "and it does not drag the last complete point down");
eq(rolling([{ dau: 9, partial: true }], 7), [null], "a chart of only today has no average to show");
eq(rolling([], 7), [], "an empty series is empty, not a crash");
eq(rolling(null, 7), [], "and neither is a null one");
eq(rolling([{ n: 4 }, { n: 8 }], 2, "n"), [4, 6], "the averaged field is selectable");

// ── denseSlots: a gap is a gap ──────────────────────────────────────────────────────────────
const dense = denseSlots([{ day: 1, pct: 40 }, { day: 3, pct: 10 }], { from: 1, to: 4 });
eq(dense.map((d) => d.day), [1, 2, 3, 4], "every slot in the range is present and in order");
eq(dense.map((d) => d.missing), [false, true, false, true], "the days with no row are flagged, not filled");
eq(dense[1].pct, undefined, "a missing day carries no value — it is not a zero");
eq(dense[0].pct, 40, "and a present day keeps its own");
// The distortion this prevents: without it, day 1 and day 3 drew as neighbours under an axis
// running to day 30, so a curve that had already halved looked flat.
eq(denseSlots([{ day: 30, pct: 1 }], { from: 1, to: 30 }).length, 30, "one late row still spans the full axis");
eq(denseSlots([], { from: 1, to: 3 }).every((d) => d.missing), true, "no data means every slot is an absence");
eq(denseSlots([{ daysActive: 2, people: 5 }], { key: "daysActive", from: 1, to: 3 })[1].people, 5,
   "the slot key is selectable for the active-day histogram");

// ── cohortCurve: decay versus survivorship ──────────────────────────────────────────────────
const cohorts = [
  { activated_users: 10, answered_week_0: 100, answered_week_1: 50, answered_week_2: 40 }, // oldest, best
  { activated_users: 30, answered_week_0: 100, answered_week_1: 30 },                       // younger
];
const cc = cohortCurve(cohorts, [0, 1, 2]);
eq(cc.points.map((p) => Math.round(p.v)), [100, 35, 40], "weighted by cohort size, so the 30 outweighs the 10");
eq(cc.points.map((p) => p.k), [2, 2, 1], "and each point reports how many cohorts are behind it");
eq(cc.full, 2, "two cohorts report week 0");
eq(cc.solidN, 2, "the first two points are measured across all of them");
eq(cc.thinned.w, 2, "week 2 is where the composition thins");
// The bug in one assertion: W2 (40%) is HIGHER than W1 (35%), which reads as retention improving.
// It is not — W2 is only the best-retaining cohort, because it is the only one old enough.
eq(cc.points[2].v > cc.points[1].v, true, "the tail rises...");
eq(cc.points[2].k < cc.full, true, "...purely because the population behind it changed");

eq(cohortCurve([], [0, 1]), { points: [], full: 0, solidN: 0, thinned: null }, "no cohorts, no curve");
eq(cohortCurve([{ activated_users: 0, answered_week_0: 90 }], [0]).points, [],
   "a cohort of nobody cannot contribute a weighted point");
eq(cohortCurve([{ activated_users: 5, answered_week_0: 0 }], [0]).points[0].v, 0,
   "but a real zero is a measurement and stays on the chart");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
