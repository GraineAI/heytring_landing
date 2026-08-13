/**
 * The spine's arithmetic, and the percentages it REFUSES to compute.
 *
 * The refusals are the point. A funnel that divides store-link clicks by installs produces a
 * number that looks like a conversion rate, reads like a conversion rate, and is not one — most
 * installs never touched the link. Those cases are asserted here so a later "helpful" tidy-up
 * that fills in the blank fails loudly.
 *
 * Run: node app/admin/components/spine.test.mjs
 */
import { buildSpine, cumulate, headline, JOURNEY, APOLLO_STAGES } from "./spine.js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.error(`FAIL ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};
const by = (nodes, k) => nodes.find((n) => n.key === k);

// ── cumulate: a distribution is not a funnel until it is summed downstream ──────────────────
eq(cumulate({ installed: 10, code_requested: 5, signed_in: 3 }, ["installed", "code_requested", "signed_in"]),
   { installed: 18, code_requested: 8, signed_in: 3 },
   "each stage counts itself plus everyone who got further");
eq(cumulate({}, ["installed", "signed_in"]), { installed: 0, signed_in: 0 }, "missing stages read as zero, not NaN");
eq(cumulate(null, ["installed"]), { installed: 0 }, "a null distribution does not throw");

// ── the real funnel: same population, so the percentages are honest ─────────────────────────
const spine = buildSpine({
  reach: 400,
  funnel: { installed: 31, code_requested: 40, signed_in: 60, forwarding_enabled: 18, activated: 52, retained: 26 },
  referred: 12,
});
// cumulative: installed 227, code_requested 196, signed_in 156, forwarding 96, activated 78, retained 26
eq(by(spine, "installed").value, 227, "installed is the full cumulative population");
eq(by(spine, "signed_in").value, 156, "signed in counts everyone who got at least that far");
eq(Math.round(by(spine, "signed_in").kept * 1000) / 10, 79.6, "signed in keeps 79.6% of those who asked for a code");
// THE REGRESSION: with forwarding_enabled missing from the stage list, cumulate() dropped its 18
// people out of installed/code_requested/signed_in entirely and drew the loss at the wrong step.
eq(by(spine, "forwarding_enabled").value, 96, "everyone armed or beyond is counted at the armed stage");
eq(by(spine, "activated").value, 78, "and 78 of them have had a call answered");
eq(by(spine, "activated").lost, 18, "the 18 lost there are armed and still waiting for the phone to ring");

// ── the refusals ────────────────────────────────────────────────────────────────────────────
eq(by(spine, "installed").kept, null, "clicks → installs is a SEAM: two populations, no percentage");
eq(by(spine, "installed").lost, null, "and therefore no 'lost here' count either");
eq(by(spine, "reach").kept, null, "the first stage has nothing to convert from");
eq(by(spine, "referred").kept, null, "referrals close the loop, they are not a funnel step");
eq(by(spine, "referred").value, 12, "but the referral count itself still shows");

// ── the constraint: exactly one, and it is the worst conversion ─────────────────────────────
eq(spine.filter((n) => n.constraint).map((n) => n.key), ["retained"],
   "retained keeps 33% — the worst, and the only stage flagged");
eq(headline(spine).from, "Tring answered a call", "the headline names the step people fell out of");
eq(headline(spine).keptPct, 33.3, "with the number that proves it");

// ── degenerate inputs must not invent a constraint ──────────────────────────────────────────
const empty = buildSpine({});
eq(empty.length, JOURNEY.length, "every stage still renders before any data exists");
eq(empty.filter((n) => n.constraint).length, 0, "no data means no constraint — not a 0% one");
eq(headline(empty), null, "and no headline to mislead anyone");
// The distinction that matters while a panel is still loading: we have not measured zero users,
// we have not measured. A tile drawing "0" there is a claim; "—" is the truth.
eq(empty.map((n) => n.value), [null, null, null, null, null, null, null, null],
   "an unloaded funnel is unknown at every stage, never zero");
eq(buildSpine({ reach: 400 }).find((n) => n.key === "reach").value, 400,
   "but a stage we DO have stands on its own — reach comes from a different system");
eq(buildSpine({ funnel: { installed: 0, code_requested: 0, signed_in: 0 } }).find((n) => n.key === "installed").value, 0,
   "a funnel that really is empty still reports zero, because that was measured");

const zeroTop = buildSpine({ funnel: { installed: 0, code_requested: 0, signed_in: 0, forwarding_enabled: 0, activated: 0, retained: 0 } });
eq(zeroTop.filter((n) => n.constraint).length, 0, "an all-zero funnel divides by nothing");

// The API's own cumulative wins over the client re-deriving it: same population, counted once.
const given = buildSpine({ cumulative: { installed: 100, code_requested: 50, signed_in: 25, forwarding_enabled: 20, activated: 10, retained: 1 } });
eq(by(given, "signed_in").value, 25, "supplied cumulative counts are used verbatim");
eq(by(given, "retained").kept, 0.1, "and drive the conversions");

// ── the list may exist in exactly one place ─────────────────────────────────────────────────
// This bit twice in one afternoon: the product grew a `forwarding_enabled` stage, and the copies
// of the stage array in app/admin/page.js did not learn about it. cumulate() sums only the keys it
// is handed, so those users were deleted from the cumulative total of every stage above them and
// the funnel reported its loss at the wrong step — silently, with no error and a plausible chart.
eq(JOURNEY.filter((j) => APOLLO_STAGES.includes(j.key)).map((j) => j.key), APOLLO_STAGES,
   "the drawn journey covers every Apollo stage, in Apollo's order");

const ROOT = new URL("../../..", import.meta.url).pathname;
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const f = join(dir, e);
    statSync(f).isDirectory() ? walk(f, out) : /\.(js|mjs)$/.test(e) && out.push(f);
  }
  return out;
};
// Any array literal listing three or more lifecycle stages, outside the file that defines them.
const RETYPED = /\[\s*"(?:installed|code_requested|signed_in|forwarding_enabled|activated|retained)"(?:\s*,\s*"(?:installed|code_requested|signed_in|forwarding_enabled|activated|retained)"){2,}/;
const offenders = walk(join(ROOT, "app"))
  .filter((f) => !/spine\.(js|test\.mjs)$/.test(f))
  .filter((f) => RETYPED.test(readFileSync(f, "utf8")))
  .map((f) => relative(ROOT, f));
eq(offenders, [], "no other file retypes the stage list — import APOLLO_STAGES instead");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
