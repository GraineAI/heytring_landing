/**
 * Every Apollo path a proxy points at must actually exist in Apollo.
 *
 * A mismatch here is invisible on both sides. The proxy compiles, the endpoint compiles, the page
 * renders — and the panel is empty forever because the request 404s into a `catch {}`. It has
 * already happened twice: a read aimed at `app_lifecycle_events` (the collection is
 * `lifecycle_events`), and `days` forwarded to endpoints that declared no such parameter and
 * silently discarded it.
 *
 * Reads the backend source directly rather than trusting a hand-kept list, because a hand-kept
 * list is the thing that goes stale.
 *
 * Run: node app/api/admin/contract.test.mjs
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const LANDING = new URL("../../..", import.meta.url).pathname;
const APOLLO = "/Users/rishabhbhanot/Downloads/NoddyAI-Brain/services/apollo";

if (!existsSync(APOLLO)) {
  console.log("  (apollo checkout not present — contract check skipped)");
  process.exit(0);
}

// What Apollo actually mounts: APIRouter(prefix=...) + each decorated path.
const mounted = new Set();
for (const f of ["app/api/app_admin.py", "app/api/app_lifecycle.py"]) {
  const src = readFileSync(join(APOLLO, f), "utf8");
  const prefixes = [...src.matchAll(/(\w+)\s*=\s*APIRouter\(prefix="([^"]+)"/g)];
  for (const [, name, prefix] of prefixes) {
    const re = new RegExp(`@${name}\\.(get|post)\\("([^"]*)"`, "g");
    for (const m of src.matchAll(re)) mounted.add(`/api/v1${prefix}${m[2]}`);
  }
}
if (mounted.size < 15) {
  console.error(`FAIL only ${mounted.size} routes parsed from Apollo — the scanner is broken`);
  process.exit(1);
}

// What the proxies point at.
const targets = new Map();
const dir = join(LANDING, "app/api/admin");
for (const entry of readdirSync(dir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = join(dir, entry.name, "route.js");
  if (!existsSync(file)) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/["'`](\/api\/v1\/calls\/admin\/[^"'`?\s]*)/g)) {
    targets.set(m[1], entry.name);
  }
}

const fails = [];
for (const [path, proxy] of targets) {
  // Path params differ in spelling between the two sides ({phone} vs ${phone}); compare shapes.
  const norm = (p) => p.replace(/\$\{[^}]*\}|\{[^}]*\}/g, "{}").replace(/\/+$/, "");
  const hit = [...mounted].some((m) => norm(m) === norm(path));
  if (!hit) {
    fails.push(
      `/api/admin/${proxy} proxies to ${path}, which Apollo does not mount. The request 404s into ` +
      `a catch and the panel stays empty forever with no error anywhere.`,
    );
  }
}

if (fails.length) {
  console.error(fails.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log(`  ${targets.size}/${targets.size} proxy→Apollo paths verified against ${mounted.size} mounted routes`);
