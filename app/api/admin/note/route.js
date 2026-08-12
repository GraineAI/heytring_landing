import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";

/**
 * /api/admin/note — log what a user actually said.
 *
 * Server-side for the same reason as the users proxy: ADMIN_API_KEY reads and writes across the
 * whole platform and must never reach the browser.
 */
export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (!key) return NextResponse.json({ ok: false, error: "APOLLO_ADMIN_API_KEY is not set" }, { status: 503 });

  let body = {};
  try { body = await req.json(); } catch {}
  const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
  if (!phone) return NextResponse.json({ ok: false, error: "phone required" }, { status: 400 });

  const base = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/v1/calls/admin/users/${phone}/note`, {
      method: "POST",
      headers: { "X-Internal-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        note: body.note, outcome: body.outcome, sentiment: body.sentiment,
        tags: body.tags, by: body.by,
      }),
      cache: "no-store",
    });
    return NextResponse.json(await res.json().catch(() => ({ ok: res.ok })), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
