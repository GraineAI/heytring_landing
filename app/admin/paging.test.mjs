/**
 * The lifecycle list must walk every page, and must not be able to spin.
 *
 * THE BUG THIS EXISTS FOR: the panel asked for limit=500 once and rendered whatever came back.
 * Apollo caps a page and reports `has_more`, which nothing read — so past the cap the table simply
 * stopped, with no marker. A call list that silently ends is worse than a short one: the people it
 * omits look like people who do not exist, and this screen is where someone decides who to ring.
 *
 * Paging introduces its own failure modes, each of which looks like a data problem rather than a
 * loop problem, so each is pinned here:
 *   • `offset` dropped anywhere in the chain → every page returns page 1 → duplicate rows forever
 *   • aggregates re-derived per page → the funnel counts the population once per page
 *   • a backend that never clears has_more → the browser tab spins
 *
 * Run: node app/admin/paging.test.mjs
 */
import { readFileSync } from "fs";

const ROOT = new URL("../..", import.meta.url).pathname;
const page = readFileSync(ROOT + "app/admin/page.js", "utf8");
const proxy = readFileSync(ROOT + "app/api/admin/users/route.js", "utf8");

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error("  FAIL " + msg); } };

// Strip comments before asserting: several checks below look for code, and a guard that matched
// its own explanatory prose would pass while the code said the opposite.
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const pageCode = code(page);
const proxyCode = code(proxy);

const loader = /const loadLifecycle[\s\S]*?\n  };/.exec(pageCode)?.[0] || "";
ok(loader.length > 0, "loadLifecycle could not be located — this test is now blind");

// ── the walk ─────────────────────────────────────────────────────────────────────────
ok(/offset/.test(loader), "loadLifecycle must send an offset or it can only ever read page 1");
ok(/has_more/.test(loader), "loadLifecycle must consult has_more rather than assuming one page");

// The single most important link, and the easiest to break by tidying an allowlist. Without it
// every page request returns page 1: the loop never terminates and the symptom presents as
// duplicate users, not as a missing parameter.
ok(/"offset"/.test(proxyCode),
   'the /api/admin/users proxy must forward "offset" to Apollo; dropped, every page returns page 1');

// ── it must be unable to spin ────────────────────────────────────────────────────────
ok(/MAX_PAGES/.test(loader), "the walk needs a hard page ceiling, not only the server's has_more");
ok(/batch\.length === 0|\.length === 0/.test(loader),
   "an empty page must end the walk — a has_more that never clears would otherwise loop forever");

// ── aggregates come from the first page only ─────────────────────────────────────────
// Apollo computes the funnel over the WHOLE unfiltered population, not over the rows it returned,
// so combining pages by spreading each response would count everyone once per page.
ok(/head = head \|\| j/.test(loader),
   "aggregates must be taken from the first page; Apollo computes them over the whole population");
ok(/\{ \.\.\.head, users \}/.test(loader),
   "the final state must be the first page's aggregates plus the accumulated users");

// ── partial results are declared, never silently dropped ─────────────────────────────
ok(/showing \$\{users\.length\}/.test(loader),
   "a page failing mid-walk must keep what loaded and say how much of the total it is");
ok(/truncated/.test(loader),
   "Apollo's universe_cap truncation must be surfaced — a complete walk of a capped population " +
   "is still not the complete list");

console.log(`  ${pass}/${pass + fail} lifecycle paging checks passed`);
if (fail) process.exit(1);
