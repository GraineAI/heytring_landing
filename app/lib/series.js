/**
 * Chart arithmetic, pure and shared.
 *
 * These three functions were inline in the components that draw with them, which is how all three
 * ended up wrong in the same way: each quietly assumed its input was DENSE and COMPLETE, and the
 * real inputs are neither. A day nobody returned on simply has no row. Today is a partial day. A
 * cohort three weeks old has no week-5 number. Every one of those absences was being rendered as
 * if it were a measurement.
 *
 * Out here they can be tested against the shapes the APIs actually return. See series.test.mjs.
 */

/**
 * Trailing mean over the last `n` points, EXCLUDING partial days.
 *
 * Today is still in progress — its count is whatever has arrived so far, not a day's worth — so
 * averaging it in drags the final point of the trend down every single day, at the right-hand end
 * of the chart where the eye lands first. The dip is an artefact of the clock.
 *
 * @returns array the same length as `series`, null wherever there is nothing complete to average,
 *          so a caller draws a BREAK rather than a fabricated value.
 */
export function rolling(series, n = 7, key = "dau") {
  return (series || []).map((d, i) => {
    if (!d || d.partial) return null;
    const win = series.slice(Math.max(0, i - n + 1), i + 1).filter((x) => x && !x.partial);
    return win.length ? win.reduce((a, b) => a + (Number(b[key]) || 0), 0) / win.length : null;
  });
}

/**
 * Sparse rows → one slot per value of `key`, from `from` to `to` inclusive.
 *
 * Retention days and active-day buckets both arrive sparse, and both were being drawn straight
 * from the array — so days 1, 2, 5 and 9 rendered as four adjacent bars under an axis labelled
 * "day 1 … day 30". That compresses the gaps out of existence, and a decaying curve comes out
 * looking level. Missing slots come back with `missing: true` so a renderer can show an absence
 * rather than a zero: "nobody came back" and "we have no reading" are different claims.
 */
export function denseSlots(rows, { key = "day", from = 1, to = 30 } = {}) {
  const by = new Map((rows || []).filter((r) => r).map((r) => [Number(r[key]), r]));
  const out = [];
  for (let v = from; v <= to; v++) {
    const hit = by.get(v);
    out.push(hit ? { ...hit, [key]: v, missing: false } : { [key]: v, missing: true });
  }
  return out;
}

/**
 * Weighted retention curve across cohorts, with the composition of every point exposed.
 *
 * Weighting by cohort size fixes small-sample noise WITHIN a point. It cannot fix the bigger
 * problem: only cohorts old enough to have REACHED week w report a week-w number, so each point
 * further right is averaged over a smaller, older set of cohorts than the one before it. If the
 * oldest cohort happens to retain best, the curve RISES and reads as a product getting better
 * while nothing about retention has changed.
 *
 * `k` (cohorts behind the point) is returned so the caller can draw the thinned tail differently.
 * `full` is how many report week 0 — the widest the curve is ever measured.
 */
export function cohortCurve(cohorts, weeks, field = (w) => `answered_week_${w}`) {
  const points = (weeks || []).map((w) => {
    let num = 0, den = 0, k = 0;
    for (const c of cohorts || []) {
      const v = c?.[field(w)];
      const size = Number(c?.activated_users) || 0;
      if (v != null && size > 0) { num += Number(v) * size; den += size; k++; }
    }
    return den ? { w, v: num / den, n: den, k } : null;
  }).filter(Boolean);

  if (!points.length) return { points: [], full: 0, solidN: 0, thinned: null };
  const full = points[0].k;
  // The leading run every cohort contributes to. k only ever shrinks as w grows — a cohort that
  // reported week 5 necessarily reported week 3 — so the honest section is a prefix.
  let solidN = 0;
  while (solidN < points.length && points[solidN].k === full) solidN++;
  return { points, full, solidN, thinned: points.find((p) => p.k < full) || null };
}
