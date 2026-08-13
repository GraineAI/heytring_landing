/**
 * THE SPINE — the business end to end, in the order the customer meets it.
 *
 * Amazon's weekly deck is ordered by the customer experience rather than by the org chart, on the
 * argument that "while departments shown on org charts are simple and separate, business activities
 * usually are not". The interesting failures live in the JOINS between teams, and a deck grouped by
 * team is precisely the one that hides them.
 *
 * Pure, and separate from the renderer, for the same reason signals.js is: thresholds and
 * conversions that can be tested beat ones eyeballed against live data.
 *
 * THE HONESTY RULE that shapes this whole file: a conversion is computed only where both counts
 * describe the SAME population. Store-link clicks live in the website's Postgres; installs live in
 * Apollo, and most installs never touched our link. Dividing one by the other yields a confident,
 * meaningless percentage — the same failure as Amazon counting detail pages and calling it
 * selection. Those steps are marked `seam` and carry no percentage at all, which is worth more
 * than a number that reads well.
 */

/**
 * The journey. `lever` is the controllable input that moves each step — the WBR's whole point is
 * that an output metric tells you the score and only an input metric tells you what to do.
 */
/**
 * The Apollo lifecycle stages, in order — the SINGLE SOURCE OF TRUTH for this list.
 *
 * cumulate() sums only the keys it is handed, so a stage missing from here does not merely go
 * undrawn: everyone sitting in it vanishes from the cumulative total of every stage above it, and
 * the funnel reports a loss at the wrong step. That is exactly what happened when the product grew
 * a `forwarding_enabled` stage and three separate copies of this array in two files did not.
 * Import it; do not retype it.
 */
export const APOLLO_STAGES = ["installed", "code_requested", "signed_in", "forwarding_enabled", "activated", "retained"];

export const JOURNEY = [
  { key: "reach",          label: "Heard of us",           lever: "which channel, and at what cost" },
  { key: "installed",      label: "Installed",             lever: "the store page itself", seam: true },
  { key: "code_requested", label: "Asked for a code",      lever: "how clear the first screen is" },
  { key: "signed_in",      label: "Signed in",             lever: "OTP delivery and autofill" },
  // ARMED IS NOT THE SAME AS PROVEN, and collapsing the two hides the most useful distinction in
  // the funnel. Someone with forwarding switched on has finished everything we asked of them; if
  // no call has come in yet they are WAITING, not lost. Folding them into "answered a call" both
  // undercounts every stage above (cumulate sums only the stages it is given) and blames the
  // onboarding for a phone that simply has not rung.
  { key: "forwarding_enabled", label: "Forwarding switched on", lever: "the setup screen and the carrier code" },
  { key: "activated",      label: "Tring answered a call", lever: "whether the phone actually rings" },
  { key: "retained",       label: "Came back (5+ days)",   lever: "answers per active user" },
  { key: "referred",       label: "Told someone",          lever: "the share prompt", loop: true },
];

/**
 * Cumulative counts from a stage DISTRIBUTION (how many people sit at each stage right now).
 * Everyone at a later stage also passed the earlier ones, so a stage's cumulative total is itself
 * plus everything downstream. Counting the distribution directly would show the funnel widening
 * wherever people advanced, which is the opposite of what happened.
 */
export function cumulate(distribution, order) {
  const out = {};
  order.forEach((k, i) => {
    out[k] = order.slice(i).reduce((a, x) => a + (Number(distribution?.[x]) || 0), 0);
  });
  return out;
}

/**
 * Build the end-to-end spine.
 *
 * @param reach       store-link clicks (website Postgres)
 * @param funnel      stage distribution from Apollo, or...
 * @param cumulative  ...the cumulative counts if the API already computed them (preferred: it is
 *                    the same population, counted once, rather than re-derived on the client)
 * @param referred    people who sent a referral
 * @returns [{ key, label, lever, value, kept, lost, seam, loop, constraint }]
 *          `kept` is the share of the previous stage that survived, null across a seam.
 */
export function buildSpine({ reach = null, funnel = null, cumulative = null, referred = null } = {}) {
  const apolloOrder = APOLLO_STAGES;
  // UNKNOWN IS NOT ZERO. Before the app-user panels load there is no funnel, and rendering that as
  // five zeros claims we measured nothing happening — a far stronger statement than "not loaded",
  // and the one a reader will act on. Absent stays null all the way to the tiles, which draw "—".
  const cum = cumulative && Object.keys(cumulative).length ? cumulative
    : funnel && Object.keys(funnel).length ? cumulate(funnel, apolloOrder)
    : Object.fromEntries(apolloOrder.map((k) => [k, null]));

  const value = { reach, referred, ...Object.fromEntries(apolloOrder.map((k) => [k, cum[k] ?? null])) };

  const nodes = JOURNEY.map((s, i) => {
    const v = value[s.key] ?? null;
    const prev = i === 0 ? null : JOURNEY[i - 1];
    const pv = prev ? value[prev.key] ?? null : null;
    // No percentage across a seam, and none for the loop-back — referrals are not a subset of the
    // people who stayed, they are the flywheel closing. A share there would be arithmetic on two
    // unrelated populations dressed up as a funnel step.
    const comparable = !s.seam && !s.loop && prev && !prev.loop && pv != null && pv > 0 && v != null;
    return {
      ...s,
      value: v,
      kept: comparable ? v / pv : null,
      lost: comparable ? Math.max(0, pv - v) : null,
      constraint: false,
    };
  });

  // THE CONSTRAINT (Goldratt): one stage, never a list. Everything subordinates to the worst
  // conversion, and a deck that highlights four problem areas has restated the problem.
  let worst = null;
  for (const n of nodes) if (n.kept != null && (!worst || n.kept < worst.kept)) worst = n;
  if (worst) worst.constraint = true;

  return nodes;
}

/** The one-line headline. A deck that opens with seven numbers has not told you anything yet. */
export function headline(nodes) {
  const c = nodes.find((n) => n.constraint);
  if (!c) return null;
  const prev = nodes[nodes.indexOf(c) - 1];
  return {
    stage: c.label,
    from: prev?.label ?? null,
    keptPct: Math.round(c.kept * 1000) / 10,
    lost: c.lost,
    lever: c.lever,
  };
}
