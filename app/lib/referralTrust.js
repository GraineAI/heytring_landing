/**
 * Whether a referral numerator has earned the right to be divided.
 *
 * PostHog only learns of a redemption if the app emitted `referral_redeemed`. Apollo GRANTS
 * the reward, so a redemption exists there by definition. Measured against this project the
 * two disagree by 26x — one client event against twenty-six granted — which makes every ratio
 * built on the client side about 26x too small. Rendered, that put 0.012 beside a referral
 * engine card reading 0.347: same quantity, same label, two orders of magnitude apart.
 *
 * Extracted from the card so the boundary is testable. It was inline, and a threshold with no
 * test is a threshold that drifts — the whole point is that it fails CLOSED, and a silent
 * regression to failing open restores the wrong number without anyone noticing.
 */

/** Coverage below this and no k is shown at all. */
export const COVERAGE_FLOOR = 0.8;

/**
 * @param {number} seen     redemptions the app reported (PostHog)
 * @param {number} granted  redemptions Apollo actually granted — the authority
 * @returns {{trusted: boolean, coverage: number|null, factor: number|null}}
 *
 * `trusted` is true when there is nothing to check against, NOT because the data is good.
 * An Apollo outage must not masquerade as an instrumentation failure: the card already has a
 * separate, honest story for "the ledger is unreachable", and conflating the two would send
 * someone to fix an app event when the actual problem is a 502.
 */
export function numeratorTrust(seen, granted) {
  const s = Number(seen);
  const g = Number(granted);
  const haveLedger = Number.isFinite(g) && g > 0;
  if (!haveLedger) return { trusted: true, coverage: null, factor: null };
  const safeSeen = Number.isFinite(s) && s > 0 ? s : 0;
  const coverage = safeSeen / g;
  return {
    trusted: coverage >= COVERAGE_FLOOR,
    coverage,
    // How many times too small a ratio built on `seen` would be. Guarded against the zero
    // case, where the honest answer is "all of them" rather than a division by zero.
    factor: Math.round(g / Math.max(safeSeen, 1)),
  };
}
