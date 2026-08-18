import assert from "node:assert/strict";
import { numeratorTrust, COVERAGE_FLOOR } from "./referralTrust.js";

let n = 0;
const t = (name, fn) => { fn(); n++; console.log("  ok " + name); };

// THE CASE THAT PROMPTED THE GUARD. Live: the app reported one redemption, Apollo had
// granted twenty-six. Rendered, that put 0.012 next to a card reading 0.347.
t("suppresses the live 1-of-26 case", () => {
  const r = numeratorTrust(1, 26);
  assert.equal(r.trusted, false);
  assert.equal(r.factor, 26);
});

t("passes when instrumentation has caught up (25 of 26)", () => {
  assert.equal(numeratorTrust(25, 26).trusted, true);
});

// The boundary itself, from both sides — the reason this file exists.
t("exactly at the floor passes", () => {
  const r = numeratorTrust(20, 25);
  assert.equal(r.coverage, COVERAGE_FLOOR);
  assert.equal(r.trusted, true);
});

t("just below the floor is suppressed", () => {
  assert.equal(numeratorTrust(19, 25).trusted, false);
});

/**
 * AN OUTAGE IS NOT AN INSTRUMENTATION FAILURE. With no ledger to check against there is
 * nothing to contradict, so the guard must not fire — the card has a separate, honest story
 * for an unreachable Apollo, and conflating the two sends someone to fix the wrong system.
 */
t("no ledger does not trip the guard", () => {
  for (const g of [undefined, null, NaN, 0, -1, "nonsense"]) {
    const r = numeratorTrust(1, g);
    assert.equal(r.trusted, true, `granted=${String(g)} must not suppress`);
    assert.equal(r.coverage, null);
  }
});

t("zero seen against a real ledger is suppressed, not divided by zero", () => {
  const r = numeratorTrust(0, 26);
  assert.equal(r.trusted, false);
  assert.equal(r.factor, 26);            // not Infinity
  assert.ok(Number.isFinite(r.factor));
});

t("overshoot is trusted rather than treated as an error", () => {
  // The app can legitimately report more than the window's granted count — different
  // windows, retries. Over-reporting is not the failure this guard is for.
  assert.equal(numeratorTrust(30, 26).trusted, true);
});

t("garbage seen is treated as zero, not NaN", () => {
  for (const s of [undefined, null, NaN, "x", -5]) {
    const r = numeratorTrust(s, 26);
    assert.equal(r.trusted, false);
    assert.ok(Number.isFinite(r.factor));
  }
});

// The guard must FAIL CLOSED. If it ever silently flips to failing open, the wrong number
// comes back and nobody is told — which is the exact failure mode it was written against.
t("fails closed across the whole under-reporting range", () => {
  for (let seen = 0; seen < 21; seen++) {
    assert.equal(numeratorTrust(seen, 26).trusted, seen / 26 >= COVERAGE_FLOOR,
      `seen=${seen} of 26`);
  }
});

console.log(`\n  ${n} tests passed`);
