/**
 * A region with no name must not take down the whole admin page.
 *
 * THE BUG THIS EXISTS FOR: the geo recommendation filtered rows on `people > 0`
 * and nothing else, then called `st[0].state.replace(...)`. Geo data carries an
 * unmapped region — state null — for everyone whose location could not be
 * resolved, and that row usually has plenty of people, so it sorts to the top.
 *
 * The result was `Cannot read properties of null (reading 'replace')`, which
 * React turns into a blank page and a client-side exception for the entire
 * /admin route. It only appeared once real traffic produced an unresolved
 * region, so it built, typechecked and rendered fine everywhere except
 * production.
 *
 * Run: node --test app/components/productMetrics.states.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("./ProductMetrics.js", import.meta.url), "utf8");

/** The filter as it appears in the source, with comments stripped. */
function filterSource() {
  const code = SRC
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const m = code.match(/const st = \(d\.states \|\| \[\]\)([\s\S]*?)\.slice\(0, 2\);/);
  assert.ok(m, "the geo recommendation's filter was not found — has it been refactored?");
  return m[1];
}

test("a nameless region is filtered out before anything reads its name", () => {
  const f = filterSource();
  assert.match(f, /typeof s\.state === "string"/,
    "rows are not checked for a usable state name, so state:null reaches .replace()");
});

test("an empty or whitespace name is filtered too", () => {
  // "Double down on  & Kerala" is not worth rendering either, and a blank
  // string passes a typeof check on its own.
  assert.match(filterSource(), /s\.state\.trim\(\)/);
});

test("the filter still requires people, which is the point of the panel", () => {
  assert.match(filterSource(), /s\.people > 0/);
});

test("the recommendation is still gated on two named regions", () => {
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(code, /if \(st\.length === 2 && st\[0\]\.people >= 20\)/,
    "reading st[1] without proving there are two rows would trade one crash for another");
});
