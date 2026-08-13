/**
 * SMOKE: press Load on /admin and check the page is still there.
 *
 * WHY THIS EXISTS. /admin computes chart values inside `{(() => { … })()}` blocks, because a chart
 * needs a dozen intermediates and JSX has nowhere else to put them. Add a caption below one of
 * those blocks that references a value the block computed, and you have written a ReferenceError
 * into the render path — of a page that still builds, still passes every unit test, and still
 * renders perfectly, right up until the state that populates that branch arrives. Then it goes
 * white. That is precisely what a survivorship note added under the retention curve did: /admin
 * blanked the moment anyone pressed Load, and nothing in the toolchain said a word.
 *
 * A static check for this needs real scope analysis — a parser, not a regex; two attempts at one
 * produced twenty-odd false positives and were thrown away. Driving the button is both simpler and
 * strictly better evidence: it exercises the actual render path with the actual state.
 *
 * Every endpoint is stubbed, so it needs no database, no Apollo and no PostHog. The cohort
 * fixtures are deliberately ragged — older cohorts report more weeks than younger ones — because
 * that is the survivorship branch, and the branch that crashed.
 *
 * Run:  npx next dev -p 3111
 *       npm i playwright --no-save && node app/admin/__smoke/load-button.mjs
 * Exits non-zero on any page error. Not in `npm test`: it needs a dev server and a browser.
 */
import { chromium } from "playwright";
const wk = (v) => v.map((x, i) => ({ label: `w${i + 1}`, value: x }));

// Cohorts shaped like Apollo's: the older cohorts report more weeks than the young ones, which is
// the survivorship case the retention curve's warning exists for — and the state that crashed.
const cohorts = { ok: true, cohorts: [
  { cohort_week: "2026-07-06", activated_users: 10, answered_week_0: 100, answered_week_1: 50, answered_week_2: 40,
    answered_week_3: 33, opened_week_0: 100, opened_week_1: 70, opened_week_2: 60, opened_week_3: 50 },
  { cohort_week: "2026-07-13", activated_users: 30, answered_week_0: 100, answered_week_1: 30,
    opened_week_0: 100, opened_week_1: 55 },
  { cohort_week: "2026-07-20", activated_users: 22, answered_week_0: 100, opened_week_0: 100 },
]};
const F = {
  data: { waitlist: [{ id: 1, name: "A", device: "android", created_at: "2026-08-01", contacted: true }],
          clicks: [{ id: 1, kind: "play" }, { id: 2, kind: "ios" }] },
  metrics: { ok: true, calls_answered_week: 412, active_devices_day: 30, active_devices_week: 88,
             sessions_per_active_device_week: 2.4, answers_per_active_user_week: 3.1,
             time_to_first_answer_hours: 6, deleted_accounts: 1, deleted_last_30d: 1,
             returned_after_deletion: 0, likely_uninstalled: 4, deleted_avg_lifetime_days: 9,
             deleted_avg_calls_answered: 2,
             d1: { answered_pct: 40, opened_pct: 60, cohort: 50 },
             d7: { answered_pct: 22, opened_pct: 35, cohort: 41 },
             d28: { answered_pct: 8, opened_pct: 14, cohort: 20 } },
  users: { ok: true, funnel: { installed: 31, code_requested: 40, signed_in: 60, forwarding_enabled: 18, activated: 52, retained: 26 },
           funnel_cumulative: { installed: 227, code_requested: 196, signed_in: 156, forwarding_enabled: 96, activated: 78, retained: 26 },
           users: [{ phone: "+919000000001", name: "Test", stage: "signed_in", last_seen: "2026-08-12" }] },
  timeseries: { ok: true, series: {
    signups: { weeks: wk([6,9,7,12,8,11,9,14,10,13,12,19]), months: [] },
    calls_answered: { weeks: wk([120,150,141,180,166,190,205,240,232,281,300,412]), months: [] },
    app_opens: { weeks: wk([300,330,310,380,360,410,430,470,455,520,540,610]), months: [] },
    deletions: { weeks: wk([1,2,1,3,2,1,2,1,3,2,1,8]), months: [] },
    deletions_initiated: { weeks: wk([2,3,2,4,3,2,3,2,4,3,2,9]), months: [] },
    deletions_cancelled: { weeks: wk([0,1,0,1,1,0,1,0,1,1,0,1]), months: [] },
    logouts: { weeks: wk([4,5,3,6,4,5,4,6,5,4,6,5]), months: [] } } },
  referrals: { ok: true, referrers: 6, base_users: 72, participation_pct: 8.3, k_factor: 0.347,
               cycle_days: 7.7, cycles_in_horizon: 10.4, horizon_days: 80, redemptions: 25,
               window_days: 90, reaches_goal: false },
  revenue: { ok: true, entitled_now: 27, entitled_paid: 1, entitled_granted: 26, unique_payers_ever: 2,
             paid_conversion_pct: 2.78, activated_users: 72, purchases_in_window: 2, window_days: 90,
             renewal_events: 0, churn_events: 0, expiring_7d: 0, expiring_30d: 23 },
  funnel: { ok: true, exit_reasons: { didnt_work: 9, too_many_calls: 5 }, recoverable: [] },
  carriers: { ok: true, carriers: [{ carrier: "Jio", users: 40, enabled: 30 }] },
  power: { ok: true, users: [] },
  health: { ok: true },
  intel: { ok: true, alerts: 0 },
};
const pick = (u) =>
  u.includes("view=retention") ? cohorts
  : u.includes("view=metrics") ? F.metrics
  : u.includes("view=timeseries") ? F.timeseries
  : u.includes("view=referrals") ? F.referrals
  : u.includes("view=revenue") ? F.revenue
  : u.includes("view=carriers") ? F.carriers
  : u.includes("view=power_users") ? F.power
  : u.includes("view=delivery_health") ? F.health
  : u.includes("view=funnel") ? F.funnel
  : u.includes("/intel") ? F.intel
  : u.includes("/users") ? F.users
  : F.data;

const run = async (name, breakUsers) => {
  const b = await chromium.launch({ channel: "chrome" });
  const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  pg.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  // "Failed to load resource" is the BROWSER reporting a non-2xx, not the page breaking — and in
  // the degraded scenario those 500s are the thing under test. Real crashes still arrive via
  // pageerror, and React's own render warnings still arrive here.
  pg.on("console", (m) => m.type() === "error"
    && !/keys|404|Failed to load resource/.test(m.text())
    && errs.push("CONSOLE: " + m.text()));

  await pg.route("**/api/admin/**", (r) => {
    const u = r.request().url();
    // The outage case: Apollo's /users is down while /churn is fine. This is the exact split seen
    // in production — referrals and revenue populated, the funnel and product metrics blank — and
    // the page used to render it as a deck full of em dashes with no hint anything had failed.
    if (breakUsers && u.includes("/api/admin/users")) {
      return r.fulfill({ status: 500, contentType: "application/json",
                         body: JSON.stringify({ ok: false, error: "apollo returned 500" }) });
    }
    return r.fulfill({ status: 200, contentType: "application/json",
                       body: JSON.stringify(pick(u)) });
  });

  await pg.goto("http://localhost:3111/admin", { waitUntil: "networkidle" });
  await pg.waitForTimeout(800);
  await pg.getByRole("button", { name: "Load", exact: true }).first().click();
  await pg.waitForTimeout(2500);

  const alive = !(await pg.evaluate(() => document.body.innerText.length < 400));
  const curve = await pg.locator('svg[aria-label="Weighted answered-call retention curve"]').count();
  const banner = await pg.getByText(/SOURCES? DID NOT LOAD/).count();
  const unavailable = await pg.getByText("unavailable").count();

  const want = breakUsers
    ? alive && banner === 1 && unavailable > 0 && !errs.length
    : alive && curve === 1 && banner === 0 && !errs.length;

  console.log(`${want ? "PASS" : "FAIL"}  ${name}`);
  console.log(`      alive=${alive} curve=${curve} banner=${banner} unavailable=${unavailable}`);
  if (errs.length) console.log("      " + errs.join("\n      "));
  await b.close();
  return want;
};

// Healthy: everything renders, and nothing claims a failure that did not happen.
const ok1 = await run("every source healthy", false);
// Degraded: the page survives, and says WHICH source failed rather than drawing em dashes that
// read as measurements. A dash means "we looked and there was nothing"; that is not what happened.
const ok2 = await run("Apollo /users down — deck must say so, not show dashes", true);
process.exit(ok1 && ok2 ? 0 : 1);
