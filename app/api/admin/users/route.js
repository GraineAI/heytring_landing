import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";

/**
 * /api/admin/users — per-user lifecycle from Apollo, for the people who have to ring these users.
 *
 * WHY A PROXY: Apollo's /calls/admin/* endpoints are gated on ADMIN_API_KEY, which can read and
 * write across the whole platform. It must never reach the browser — a NEXT_PUBLIC_ var or a
 * client-side fetch would put it in the page source for anyone to lift. It is read here, on the
 * server, and only the rows come back. Same reasoning as the PostHog proxy next door.
 *
 * WHY NOT THE LANDING DB: the waitlist table knows who asked for an invite. It has no idea who
 * installed, who abandoned the OTP, or who Tring has actually answered a call for — that lives in
 * Apollo, across five collections. This is the join.
 *
 *   ?view=users      one row per person + the stage they stopped at (default)
 *   ?view=retention  weekly cohorts, answered-calls AND app-opens curves
 *   ?view=metrics    computed product metrics — D1/D7/D28, active devices, churn, uninstall proxy
 *   ?stage=…&platform=…&days=…   passed through to Apollo
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

const APOLLO = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (!key) {
    // Say WHICH thing is missing. "failed to load" on a dashboard sends someone into the network
    // tab for twenty minutes to rediscover an unset environment variable.
    return NextResponse.json(
      {
        ok: false,
        error:
          "APOLLO_ADMIN_API_KEY is not set on this deployment. Set it to the SAME value as " +
          "ADMIN_API_KEY in Apollo's environment (Vercel → Settings → Environment Variables), " +
          "then redeploy. ADMIN_API_KEY is accepted as an alias if you prefer one name. " +
          "Optionally set APOLLO_API_BASE if Apollo is not at https://api.graine.ai.",
        needs: ["APOLLO_ADMIN_API_KEY"],
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const _v = searchParams.get("view");
  const view = _v === "retention" ? "retention" : _v === "metrics" ? "metrics" : "users";
  const qs = new URLSearchParams();
  // `offset` is what makes the full list reachable: Apollo caps a single page at 1000 rows and
  // reports `has_more`, so the panel walks pages. Dropped from this allowlist, every page request
  // returns page 1 — the caller loops forever on identical rows, and the bug looks like duplicate
  // users rather than a missing parameter.
  for (const k of ["stage", "platform", "days", "limit", "offset", "weeks", "india_only"]) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  const url = `${APOLLO}/api/v1/calls/admin/${view}${qs.toString() ? "?" + qs : ""}`;

  try {
    const res = await fetch(url, {
      // X-Internal-API-Key is the header Apollo's admin gate actually reads. Authorization:
      // Bearer is for Stytch SESSIONS, which this panel does not have — sending it instead
      // returns 401 on every request.
      headers: { "X-Internal-API-Key": key, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("apollo admin proxy failed:", res.status);
      return NextResponse.json(
        { ok: false, error: `apollo returned ${res.status}`, detail: body?.detail || null },
        { status: res.status === 401 || res.status === 403 ? 502 : res.status },
      );
    }
    return NextResponse.json(body);
  } catch (e) {
    console.error("apollo admin proxy error:", e?.message);
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
