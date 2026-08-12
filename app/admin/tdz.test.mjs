/**
 * No mount effect may call a function declared BELOW an early return.
 *
 * THE BUG THIS EXISTS FOR: app/admin/page.js returns early while the session is being checked and
 * again when it is absent. Both returns sit above most of the loader declarations. An effect
 * registered before those returns still fires after that first short render — so calling anything
 * declared below them hits a `const` whose initialiser never ran, and React turns
 * "Cannot access 'X' before initialization" into a blank page with a client-side exception.
 *
 * It builds cleanly, typechecks cleanly, and renders fine in every state EXCEPT the one every
 * visitor hits first. Only a check like this one catches it before a user does.
 *
 * Run: node app/admin/tdz.test.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = new URL("../..", import.meta.url).pathname;

function pages(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (/^page\.jsx?$/.test(e)) out.push(p);
  }
  return out;
}

let pass = 0;
const fails = [];

for (const file of pages(join(ROOT, "app"))) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  // Every top-level `return` that can end a render early. Module-level helper functions sit at the
  // same indent and match too — harmless, because the positional rule below can only ever consider
  // returns that fall AFTER the effect, and helpers are declared before the component.
  const returns = [...src.matchAll(/^ {2}(?:if \([^)]*\)\s*return|return )/gm)].map((m) => m.index);

  // Every arrow function declared at component top level, with its offset.
  const decls = new Map();
  for (const m of src.matchAll(/^ {2}const (\w+) = (?:async )?(?:\([^)]*\)|\w+)\s*=>/gm)) {
    if (!decls.has(m[1])) decls.set(m[1], m.index);
  }

  for (const m of src.matchAll(/^ {2}useEffect\(\(\)\s*=>\s*\{?([\s\S]{0,400}?)\}?,\s*\[[^\]]*\]\);/gm)) {
    const E = m.index;
    for (const call of m[1].matchAll(/\b(\w+)\s*\(/g)) {
      const name = call[1];
      const D = decls.get(name);
      if (D === undefined) continue;                       // not a top-level arrow — not our rule
      // THE RULE: an early return BETWEEN the effect and the declaration. On the first render the
      // component reaches R and returns, so D never runs — but the effect at E is already
      // registered and fires anyway, into a binding still in its temporal dead zone.
      const between = returns.filter((R) => R > E && R < D);
      if (between.length) {
        fails.push(
          `${rel}: the mount effect at char ${E} calls ${name}(), declared at char ${D}, with an ` +
          `early return at char ${between[0]} in between. On the first render the component ` +
          `returns before ${name} is declared, so the effect throws "Cannot access '${name}' ` +
          `before initialization" and the page dies as a client-side exception. ` +
          `Move ${name} above the early return.`,
        );
      } else pass++;
    }
  }
  pass++;
}
if (fails.length) {
  console.error(fails.map((f) => `FAIL ${f}`).join("\n\n"));
  process.exit(1);
}
console.log(`${pass}/${pass} mount-effect ordering checks passed`);
