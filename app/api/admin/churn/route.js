import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";
import { sql } from "../../../lib/db";

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
  carriers: "/api/v1/calls/admin/carriers",
  revenue: "/api/v1/calls/admin/revenue",
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
    const body = await res.json().catch(() => ({ ok: false }));

    // LINK OPENS ALREADY EXIST — here, not in Apollo. Every tap on /r/{code} is written to the
    // `clicks` table by that page, so asking the app to emit a second event for the same act
    // would double-count it and put two disagreeing numbers in front of the same person. Apollo
    // is authoritative for shares and redemptions, this database for opens; the proxy is where
    // they meet, so the panel still makes exactly one call.
    if (searchParams.get("view") === "referrals" && body?.ok) {
      try {
        // CLAMP TO APOLLO'S OWN BOUNDS. /admin/referrals declares days ge=14 le=180, so a picker
        // outside that range 422s there while this local half would happily have accepted it —
        // leaving one card whose two numbers were measured over different windows and no sign of
        // it on screen. Matching the bounds here keeps both halves describing the same period.
        const raw = Number(searchParams.get("days") || 60);
        const days = Math.min(180, Math.max(14, Number.isFinite(raw) ? raw : 60));
        const rows = await sql()`
          SELECT COUNT(*)::int AS opens
          FROM clicks
          WHERE placement LIKE 'referral:%'
            AND placement <> 'referral:invalid'
            AND created_at >= NOW() - (${days} || ' days')::interval`;
        const opens = rows?.[0]?.opens ?? null;
        if (opens != null) {
          body.loop_top = { ...(body.loop_top || {}), link_opens: opens, instrumented: true };
          // Opens are the only step measured upstream of redemption, so this is the one
          // conversion rate available today for the middle of the loop.
          if (opens > 0 && typeof body.redemptions === "number") {
            body.open_to_redeem_pct = Math.round((body.redemptions / opens) * 1000) / 10;
          }
        }
      } catch (e) {
        console.error("referral opens read failed:", e?.message);
      }
    }
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
