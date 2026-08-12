/**
 * Inflection detection (Grove: find the strategic inflection point early).
 *
 * A dashboard shows you what happened; a signal tells you something CHANGED. The difference matters
 * because nobody reads eight charts every morning — but they will read a list of three things that
 * moved unusually.
 *
 * Pure, so the thresholds can be tested rather than eyeballed against live data.
 */

/** Mean and sample standard deviation, ignoring nulls. */
export function stats(values) {
  const v = values.filter((x) => x != null && isFinite(x));
  if (v.length < 2) return { n: v.length, mean: v[0] ?? 0, sd: 0 };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  // Sample SD (n-1). With six weekly points the population formula understates spread enough to
  // fire on ordinary weeks, and a signal that cries wolf is worse than no signal at all.
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1));
  return { n: v.length, mean, sd };
}

/**
 * Is the newest point unusual against the ones before it?
 *
 * @param series  [{label, value}] oldest → newest
 * @param invert  true when UP is bad (deletions, failures)
 * @param minN    below this many points there is no trend to deviate from. Four weeks is the floor:
 *                with three, one holiday week sets the mean and everything after it is an "anomaly".
 */
export function detect(series, { invert = false, minN = 4, sigma = 2 } = {}) {
  const pts = (series || []).filter((p) => p && p.value != null);
  if (pts.length < minN) return null;
  const latest = pts[pts.length - 1];
  const prior = pts.slice(0, -1).map((p) => p.value);
  const { mean, sd } = stats(prior);
  // A flat history has sd 0, where any change is infinitely many sigmas. Require a real move —
  // 1 → 2 deletions is not an inflection, it is two deletions.
  if (sd === 0) {
    const jump = Math.abs(latest.value - mean);
    if (jump < 3 || mean === 0 && latest.value < 3) return null;
    return { z: Infinity, direction: latest.value > mean ? "up" : "down",
             bad: invert ? latest.value > mean : latest.value < mean,
             value: latest.value, mean, label: latest.label, flat: true };
  }
  const z = (latest.value - mean) / sd;
  if (Math.abs(z) < sigma) return null;
  const up = z > 0;
  return { z, direction: up ? "up" : "down", bad: invert ? up : !up,
           value: latest.value, mean, label: latest.label, flat: false };
}

/** Human sentence. A z-score means nothing to most readers; "3x its usual" does. */
export function describe(name, sig) {
  if (!sig) return null;
  const mult = sig.mean > 0 ? sig.value / sig.mean : null;
  const how = sig.flat || mult == null ? `${sig.value} this week (usually ~${sig.mean.toFixed(0)})`
    : `${mult.toFixed(1)}× its 6-week average`;
  return `${name} is ${sig.direction} — ${how}`;
}

/**
 * The constraint (Goldratt): the single worst conversion in the funnel.
 *
 * Returns ONE stage, never a list. The whole value of the idea is that everything subordinates to
 * one thing; a dashboard that highlights four "problem areas" has restated the problem, not found
 * the constraint.
 */
export function findConstraint(cumulative, order) {
  let worst = null;
  for (let i = 1; i < order.length; i++) {
    const prev = cumulative[order[i - 1]] ?? 0;
    const cur = cumulative[order[i]] ?? 0;
    if (prev <= 0) continue;
    const kept = cur / prev;
    if (!worst || kept < worst.kept) worst = { stage: order[i], from: order[i - 1], kept, lost: prev - cur };
  }
  return worst;
}
