import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";

/**
 * /api/admin/churn — the four churn reads, behind one proxy.
 *
 * ?view=funnel | autopsy | feed | logout_return | timeseries
 *
 * Server-side because ADMIN_API_KEY reads and writes across the whole platform. The autopsy in
 * particular returns exit notes people wrote on their way out; that is exactly the sort of thing
 * that must not be fetchable from a browser tab.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const VIEWS = {
  funnel: "/api/v1/calls/admin/churn/funnel",
  autopsy: "/api/v1/calls/admin/churn/autopsy",
  feed: "/api/v1/calls/admin/churn/feed",
  logout_return: "/api/v1/calls/admin/churn/logout_return",
  timeseries: "/api/v1/calls/admin/timeseries",
  power_users: "/api/v1/calls/admin/power_users",
  utility: "/api/v1/calls/admin/utility",
  referrals: "/api/v1/calls/admin/referrals",
};

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "APOLLO_ADMIN_API_KEY is not set on this deployment. Set it to the same "
        + "value as ADMIN_API_KEY in Apollo's environment, then redeploy." },
      { status: 503 },
    );
  }
  const { searchParams } = new URL(req.url);
  const path = VIEWS[searchParams.get("view") || "funnel"];
  if (!path) return NextResponse.json({ ok: false, error: "unknown view" }, { status: 400 });

  const qs = new URLSearchParams();
  for (const k of ["days", "limit", "weeks", "months", "goal", "horizon_days"]) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  const base = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}${path}${qs.toString() ? "?" + qs : ""}`, {
      headers: { "X-Internal-API-Key": key }, cache: "no-store",
    });
    return NextResponse.json(await res.json().catch(() => ({ ok: false })), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
