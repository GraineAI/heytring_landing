/**
 * The gate on the social proof sections.
 *
 * These tests are mostly about what must NOT reach the page. A placeholder testimonial that slips
 * through renders as a real person saying a thing they never said, on the marketing site, to the
 * people we are asking to trust us. The rules are cheap to state and expensive to get wrong, so
 * they are stated here rather than left to whoever edits the array next.
 *
 * Run: node app/lib/socialProof.test.mjs
 */
import { QUOTES, FIGURES, hasQuotes, hasFigures, isPublishable, isCitable, MIN_QUOTES } from "./socialProof.js";

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.error(`FAIL ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};

// ── shipped state ───────────────────────────────────────────────────────────────────────────
eq(QUOTES.length, 0, "ships with no testimonials — none have been collected yet");
eq(FIGURES.length, 0, "and no figures");
eq(hasQuotes(), false, "so the testimonial section does not render");
eq(hasFigures(), false, "nor the stats strip");

// ── what counts as publishable ──────────────────────────────────────────────────────────────
eq(isPublishable({ words: "It answered a call from my landlord.", name: "Priya" }), true, "words plus a name");
eq(isPublishable({ words: "Great app", name: "" }), false, "an unnamed quote is indistinguishable from a written one");
eq(isPublishable({ words: "   ", name: "Priya" }), false, "whitespace is not a testimonial");
eq(isPublishable({ name: "Priya" }), false, "a name alone says nothing");
eq(isPublishable(null), false, "and a hole in the array does not throw");

// ── the floor ───────────────────────────────────────────────────────────────────────────────
const q = (n) => Array.from({ length: n }, (_, i) => ({ words: `w${i}`, name: `n${i}` }));
eq(MIN_QUOTES, 3, "three is the floor");
eq(hasQuotes(q(2)), false, "two quotes read as the only two that exist");
eq(hasQuotes(q(3)), true, "three read as a sample of something larger");
// The floor counts VALID quotes, not array length — otherwise two real ones plus a placeholder
// would open the section and publish the placeholder.
eq(hasQuotes([...q(2), { words: "", name: "" }]), false, "padding the array does not open the gate");

// ── figures must be checkable ───────────────────────────────────────────────────────────────
eq(isCitable({ value: "50,000", label: "calls answered", source: "Apollo: calls.answered" }), true, "value, label, source");
eq(isCitable({ value: "50,000", label: "calls answered" }), false, "a figure with no source cannot go on the page");
eq(isCitable({ value: "", label: "calls", source: "x" }), false, "an empty value is not a figure");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
