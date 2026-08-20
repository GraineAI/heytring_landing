import assert from "node:assert/strict";

/**
 * The "Refresh failed (200)" race, pinned.
 *
 * This bug produced an HTTP 200 whose body was `{"cache":"miss","ageMs":0}` — no data, no
 * `ok`, no error string — so the client reported the only thing it had: the status code.
 * It surfaced during a campaign because it needs two overlapping requests, which is rare
 * with one visitor and constant with real traffic.
 *
 * The mechanics are pure promise plumbing, so they are testable without PostHog. What is
 * asserted here is the property that was violated: EVERY awaiter of the shared rebuild gets
 * the payload, no matter which path created it.
 */

let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log("  ok " + name); };

/** The shipped implementation, kept verbatim so the test proves the bug was real. */
function makeBroken(build) {
  let CACHE = null, INFLIGHT = null;
  return {
    background() {
      if (!INFLIGHT) {
        INFLIGHT = build().then((p) => { CACHE = { at: 1, payload: p }; })
          .catch(() => {}).finally(() => { INFLIGHT = null; });
      }
      return INFLIGHT;
    },
    foreground() {
      INFLIGHT = INFLIGHT || build().finally(() => { INFLIGHT = null; });
      return INFLIGHT;
    },
    cache: () => CACHE,
  };
}

/** The fix: INFLIGHT always holds the raw build promise; caching hangs off a side chain. */
function makeFixed(build) {
  let CACHE = null, INFLIGHT = null;
  const rebuild = () => {
    if (!INFLIGHT) {
      const p = build();
      INFLIGHT = p;
      p.then((payload) => { if (payload && payload.ok) CACHE = { at: 1, payload }; })
        .catch(() => {}).finally(() => { INFLIGHT = null; });
    }
    return INFLIGHT;
  };
  return { background: rebuild, foreground: rebuild, cache: () => CACHE };
}

const good = async () => ({ ok: true, active: { dau: 58 } });

await t("the old code really did resolve to undefined (bug is real)", async () => {
  const s = makeBroken(good);
  s.background();                       // background rebuild starts
  const payload = await s.foreground(); // a Refresh joins it
  assert.equal(payload, undefined);
  assert.deepEqual({ ...payload, cache: "miss" }, { cache: "miss" });  // the 200 with no ok
});

await t("fixed: a Refresh joining a background rebuild still gets the payload", async () => {
  const s = makeFixed(good);
  s.background();
  const payload = await s.foreground();
  assert.equal(payload?.ok, true);
  assert.equal(payload.active.dau, 58);
});

await t("fixed: the cache is never poisoned with undefined", async () => {
  const s = makeFixed(good);
  s.background();
  await s.foreground();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(s.cache().payload.ok, true);
});

await t("fixed: many concurrent callers all get the payload, and build runs once", async () => {
  let calls = 0;
  const counted = async () => { calls++; await new Promise((r) => setTimeout(r, 5)); return { ok: true }; };
  const s = makeFixed(counted);
  const all = await Promise.all(Array.from({ length: 12 }, () => s.foreground()));
  assert.equal(calls, 1, "concurrent callers must share one fan-out");
  all.forEach((p) => assert.equal(p?.ok, true));
});

await t("a failing build rejects every awaiter rather than resolving to undefined", async () => {
  const s = makeFixed(async () => { throw new Error("posthog 429"); });
  await assert.rejects(() => s.foreground(), /posthog 429/);
  // and it must not have written anything to the cache
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(s.cache(), null);
});

await t("a build resolving without ok is not cached", async () => {
  const s = makeFixed(async () => ({ cache: "miss" }));   // no ok
  const p = await s.foreground();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(p.ok, undefined);
  assert.equal(s.cache(), null, "only ok payloads may be cached");
});

console.log(`\n  ${n} tests passed`);
