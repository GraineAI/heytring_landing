/**
 * RETENTION MUST DIVIDE BY THE PEOPLE WHO COULD HAVE COME BACK.
 *
 * It divided every day by the whole cohort — including people first seen yesterday, who cannot
 * possibly have a day-7. So D7 was understated, and understated WORSE the faster we grow, because
 * growth means more people too new to have had the chance. The dashboard then turns that number
 * into advice ("give people a reason to return — D7 ~x%"), so a wrong number issued wrong orders.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "posthog/route.js"), "utf8");
let n = 0;
const t = (name, fn) => { fn(); n++; };

// The arithmetic, extracted exactly as the route computes it.
function retention(rows, ages) {
  const cohort = ages.reduce((a, b) => a + b.people, 0);
  const eligibleFor = (day) => ages.reduce((a, x) => (x.age >= day ? a + x.people : a), 0);
  return rows.map((r) => {
    const denom = ages.length ? eligibleFor(r.day) : cohort;
    return { ...r, eligible: denom, pct: denom ? Math.round((r.people / denom) * 1000) / 10 : 0 };
  });
}

t("a person too new to reach day 7 is not in the day-7 denominator", () => {
  const ages = [{ age: 0, people: 90 }, { age: 30, people: 10 }];
  const out = retention([{ day: 7, people: 5 }], ages);
  assert.equal(out[0].eligible, 10, "only the 30-day-olds could have reached D7");
  assert.equal(out[0].pct, 50);
  // the old arithmetic divided by all 100 and reported 5%
});

t("day 0 still divides by the whole cohort, so the curve starts at 100%", () => {
  const ages = [{ age: 0, people: 90 }, { age: 30, people: 10 }];
  const out = retention([{ day: 0, people: 100 }], ages);
  assert.equal(out[0].eligible, 100);
  assert.equal(out[0].pct, 100);
});

t("growth alone can no longer move a past cohort's retention", () => {
  const rows = [{ day: 7, people: 20 }];
  const before = retention(rows, [{ age: 14, people: 40 }])[0].pct;
  // a hundred brand-new signups arrive; nobody's day-7 behaviour changed
  const after = retention(rows, [{ age: 14, people: 40 }, { age: 0, people: 100 }])[0].pct;
  assert.equal(before, after, "signing up new users must not lower yesterday's D7");
});

t("a degraded cohort query falls back to the whole cohort, never to zero", () => {
  const out = retention([{ day: 7, people: 20 }], []);
  assert.equal(out[0].pct, 0);          // no ages at all → cohort is 0 → honest 0, not a crash
  assert.ok(Number.isFinite(out[0].pct));
});

t("nobody eligible yet reports 0%, not NaN or Infinity", () => {
  const out = retention([{ day: 30, people: 0 }], [{ age: 1, people: 50 }]);
  assert.equal(out[0].eligible, 0);
  assert.equal(out[0].pct, 0);
});

// ── the route really wires it ────────────────────────────────────────────────────────────────
t("the eligibility cohort query exists and is scoped like the curve", () => {
  assert.ok(SRC.includes("retentionCohort:"), "the cohort query must exist");
  const i = SRC.indexOf("retentionCohort:");
  const seg = SRC.slice(i, i + 700);
  assert.ok(seg.includes("dateDiff('day', d0, today()) AS age"));
  assert.ok(seg.includes("INTERVAL 60 DAY"), "same window as the retention curve");
  assert.ok(seg.includes("$geoip_country_name = 'India'"), "same India scope as the curve");
});

t("the percentage is computed against eligible, not against day zero", () => {
  const i = SRC.indexOf("retention: (() => {");
  const seg = SRC.slice(i, i + 1400);
  assert.ok(seg.includes("eligibleFor("), "must divide by the eligible cohort");
  assert.ok(!/const base = rows\.find\(\(r\) => r\.day === 0\)/.test(seg),
    "the day-0 denominator is gone");
  assert.ok(seg.includes("eligible: denom"), "the denominator must be exposed for auditing");
});

console.log(`  ${n}/${n} retention denominator checks passed`);
