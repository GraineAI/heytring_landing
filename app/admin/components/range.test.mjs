/** Run: node app/admin/components/range.test.mjs */
import { clamp, honours, withRange, rangeLabel } from "./range.js";

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.error(`FAIL ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};

// THE CORE PROMISE: a panel that cannot filter must never receive the parameter, because FastAPI
// discards undeclared params silently — the picker would move and the numbers would not.
eq(clamp("autopsy", 30), null, "autopsy declares no window");
eq(clamp("timeseries", 30), null, "timeseries takes weeks/months, a different unit");
eq(withRange("/api/x?view=autopsy", "autopsy", 30), "/api/x?view=autopsy", "no days is appended");
eq(honours("autopsy", 30), false, "and the UI can ask, so it can label it honestly");

// Per-endpoint bounds are real: outside them the server 422s rather than clamping.
eq(clamp("utility", 180), 90, "utility caps at 90");
eq(clamp("utility", 7), 7, "utility's floor is 7");
eq(clamp("referrals", 7), 14, "referrals' floor is 14 — below it Apollo 422s");
eq(clamp("referrals", 365), 180, "referrals caps at 180");
eq(clamp("intel", 365), 90, "intel caps at 90");
eq(clamp("carriers", 3), 7, "carriers' floor is 7");

// A range inside every bound passes through untouched.
eq(clamp("carriers", 30), 30, "30d is honoured as-is");
eq(withRange("/api/admin/churn?view=carriers", "carriers", 30),
   "/api/admin/churn?view=carriers&days=30", "appended with the right separator");
eq(withRange("/api/admin/x", "carriers", 30), "/api/admin/x?days=30", "uses ? when there is no query");

// "All time" is only expressible where the endpoint has an all-time mode.
eq(clamp("power_users", 0), 0, "power_users treats 0 as all-time");
eq(clamp("utility", 0), null, "utility has no all-time mode — its floor is 7");
eq(withRange("/x", "power_users", 0), "/x", "all-time sends no parameter");

// The label must tell the truth when a panel silently narrowed the request.
eq(rangeLabel("utility", 180), "90d (this panel's limit)", "a clamped panel says so");
eq(rangeLabel("carriers", 30), "30d", "an honoured range reads plainly");
eq(rangeLabel("autopsy", 30), "all time", "an unfilterable panel says all time");

console.log(fail ? `${pass} passed, ${fail} FAILED` : `${pass}/${pass} range checks passed`);
process.exit(fail ? 1 : 0);
