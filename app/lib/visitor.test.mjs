/**
 * Unique-visitor capture: the invariants that decide whether the numbers mean anything.
 *
 * Every check here guards a failure that produces a PLAUSIBLE WRONG NUMBER rather than an error.
 * That is the whole hazard with analytics code — nothing 500s, nothing looks broken, and a decision
 * gets made on a figure that was never measuring what its label says.
 *
 * Run: node app/lib/visitor.test.mjs
 */
import { readFileSync } from "fs";
import { visitorId, VISITOR_COOKIE } from "./visitor.js";

const ROOT = new URL("../..", import.meta.url).pathname;
const read = (p) => readFileSync(ROOT + p, "utf8");

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error(`  FAIL ${msg}`); } };

// ── the reader must never invent an id ───────────────────────────────────────────────────────
// A fresh random id per unattributable request would make every bot hit its own "unique visitor",
// and the visitor count would then track crawler traffic while looking like an audience.
const req = (value) => ({ cookies: { get: (n) => (n === VISITOR_COOKIE && value ? { value } : undefined) } });
ok(visitorId(req(null)) === null, "no cookie → null, never a generated id");
ok(visitorId(req("short")) === null, "an implausibly short value is rejected rather than counted");
ok(visitorId(req("2f6a1c2e-9b71-4c1a-9f0e-7c1a2b3d4e5f")) === "2f6a1c2e-9b71-4c1a-9f0e-7c1a2b3d4e5f",
   "a real uuid is returned unchanged");
ok(visitorId({}) === null, "a request with no cookie jar does not throw");
ok(visitorId(req("x".repeat(300))).length === 64, "an oversized value is truncated, not stored whole");

// ── the cookie ───────────────────────────────────────────────────────────────────────────────
const mw = read("middleware.js");
ok(/httpOnly:\s*true/.test(mw),
   "the visitor cookie must be httpOnly — no page code needs to read it, and a readable id is one " +
   "any third-party script on the page can copy out");
ok(/sameSite:\s*"lax"/.test(mw), "SameSite=Lax — this id has no business being sent cross-site");
ok(/randomUUID/.test(mw),
   "the id must be random, not derived from IP or user-agent: a derived id is a fingerprint, and " +
   "it also collides across everyone behind one mobile carrier NAT");
ok(/const YEAR = 60 \* 60 \* 24 \* 365/.test(mw) && /maxAge: YEAR/.test(mw),
   "the cookie must outlive a session, or every return visit counts as a new person");

// ── /share/ stays untracked, everywhere ──────────────────────────────────────────────────────
// The token in a share URL is the credential to somebody's private call recording. Three files
// exclude it; a fourth that forgot would quietly undo the promise the other three keep.
for (const f of ["middleware.js", "app/api/visit/route.js", "app/components/VisitBeacon.js", "app/components/SiteAnalytics.js"]) {
  ok(/\/share\//.test(read(f)), `${f} must exclude /share/ routes from visitor tracking`);
}

// ── the writes that make a funnel joinable ───────────────────────────────────────────────────
ok(/visitor_id/.test(read("app/go/[store]/route.js")), "store-link clicks must record the visitor");
ok(/visitor_id/.test(read("app/api/waitlist/route.js")), "waitlist signups must record the visitor");
ok(/ON CONFLICT \(visitor_id, path, day\) DO NOTHING/.test(read("app/api/visit/route.js")),
   "visits must be deduplicated by the database, not by trusting the caller — a re-render, a " +
   "strict-mode double mount or twenty reloads must be one visit");

// ── totals must be counted in SQL, not in the browser ────────────────────────────────────────
// The tiles used to count the fetched arrays, which the API caps at 1000 and 500 rows. Past the cap
// the numbers stop moving, and a growing site reads as a plateau.
const dataRoute = read("app/api/admin/data/route.js");
ok(/count\(DISTINCT visitor_id\)/.test(dataRoute), "unique visitors must be COUNT(DISTINCT visitor_id) in SQL");
ok(/LIMIT 1000/.test(dataRoute) && /waitlist_rows/.test(dataRoute),
   "the row lists may stay capped, but the totals must be computed over the whole table");
const admin = read("app/admin/page.js");
// Scoped to the stats object itself: `waitlist.length` is legitimate elsewhere on this page (the
// table's "no rows yet" empty state), and a whole-file grep would forbid that too.
const statsBlock = /const stats = \{[\s\S]*?\n  \};/.exec(admin)?.[0] || "";
ok(statsBlock.length > 0, "the admin page must declare a stats object");
ok(!/waitlist\.|clicks\./.test(statsBlock),
   "no tile may be counted from the truncated arrays — not even as a fallback, which would put " +
   "the old wrong numbers back on screen under the same labels at the moment something is broken");
ok(/stats: srv/.test(admin) && /const S_ = srv \|\| \{\}/.test(admin),
   "the tiles must read the server-computed stats");

// ── DOUBLE COUNTING ──────────────────────────────────────────────────────────────────────────
// Every check below guards a number that reads as people and is not.

// The waitlist's unique index is (lower(email), device) so the call list knows which build to
// discuss. That makes one human who signed up on Android and again on iPhone TWO rows, and the
// signup tile was counting rows. Several such pairs are already in the table.
ok(/count\(DISTINCT lower\(email\)\) FROM waitlist/.test(dataRoute),
   "signups must be counted as distinct people (lower(email)), not rows — the same person on two " +
   "devices is one signup and two rows");
ok(/waitlist_multi_device/.test(dataRoute),
   "the rows-vs-people gap must be explained on the page, or one of the two numbers looks broken");
ok(/signup rows/.test(admin) && /people/.test(admin),
   "the page must show both the row count and the people count, reconciled");

// count(*) on `visits` is page-DAYS: the unique index stores one row per visitor per path per day.
// Calling that pageviews overstates uniques and understates real views in the same figure.
ok(!/AS pageviews/.test(dataRoute) && /AS page_days/.test(dataRoute),
   "visits count(*) is page-days, not pageviews — the unique index makes a true pageview count " +
   "impossible from this table");
ok(!/k="Pageviews"/.test(admin), "no tile may be labelled Pageviews from the visits table");

// A rate whose numerator and denominator come from different populations is not a rate. Both
// funnel steps must be DISTINCT over the same id and restricted to visitors we can follow.
ok(/c\.visitor_id IS NOT NULL/.test(dataRoute) && /w\.visitor_id IS NOT NULL/.test(dataRoute),
   "funnel steps must exclude unattributable rows explicitly rather than relying on COUNT to skip nulls");

// COUNT(DISTINCT) silently skips nulls, so a unique count over rows logged before the cookie
// existed reads as "almost nobody" when it means "we cannot tell who". The page must be able to
// withhold the figure instead of printing a confidently wrong one.
ok(/clicks_attributed/.test(dataRoute) && /clicks_total/.test(dataRoute),
   "the click log must report how much of itself is attributable");
ok(/clicksAttributable/.test(admin) && /clickCoverage/.test(admin),
   "the page must withhold a people-count for clicks when coverage is too low to mean anything");

console.log(`  ${pass}/${pass + fail} visitor-capture checks passed`);
if (fail) process.exit(1);
