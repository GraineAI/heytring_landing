import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";

/**
 * /api/admin/intel — the industry watch, behind one proxy.
 *
 * GET  ?view=feed|brief      — what rivals shipped, and the analyst's read of it
 * POST ?action=refresh|seen  — force a sweep, or dismiss one item
 *
 * Server-side for the same reason every other admin read is: ADMIN_API_KEY is a
 * platform-wide credential and must never reach a browser tab.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const VIEWS = {
  feed: "/api/v1/calls/admin/intel",
  brief: "/api/v1/calls/admin/intel/brief",
};

function creds() {
  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  const base = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");
  return { key, base };
}

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { key, base } = creds();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "APOLLO_ADMIN_API_KEY is not set on this deployment." },
      { status: 503 },
    );
  }
  const { searchParams } = new URL(req.url);
  const path = VIEWS[searchParams.get("view") || "feed"];
  if (!path) return NextResponse.json({ ok: false, error: "unknown view" }, { status: 400 });

  const qs = new URLSearchParams();
  for (const k of ["days", "limit", "min_severity", "competitor"]) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  try {
    const res = await fetch(`${base}${path}${qs.toString() ? "?" + qs : ""}`, {
      headers: { "X-Internal-API-Key": key },
      cache: "no-store",
      // The analyst loop opens articles and calls a model; it is slow by design.
      signal: AbortSignal.timeout(120000),
    });
    return NextResponse.json(await res.json().catch(() => ({ ok: false })), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}

export async function POST(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { key, base } = creds();
  if (!key) return NextResponse.json({ ok: false, error: "admin key not set" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "refresh";
  let path;
  if (action === "refresh") {
    path = `/api/v1/calls/admin/intel/refresh?brief=${searchParams.get("brief") === "1"}`;
  } else if (action === "seen") {
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    path = `/api/v1/calls/admin/intel/${encodeURIComponent(id)}/seen`;
  } else {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "X-Internal-API-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(180000),
    });
    return NextResponse.json(await res.json().catch(() => ({ ok: false })), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
