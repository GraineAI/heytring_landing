import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";
import { isAuthed } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await ensureSchema();
    const q = sql();
    const [waitlist, clicks] = await Promise.all([
      q`SELECT id, name, email, device, placement, source, utm, landing, user_agent, country, contacted, created_at
        FROM waitlist ORDER BY created_at DESC LIMIT 1000`,
      q`SELECT id, kind, placement, referrer, user_agent, country, created_at
        FROM clicks ORDER BY created_at DESC LIMIT 500`,
    ]);
    // stats are derived client-side from these rows so the tiles always
    // agree with the table (scalar subqueries misbehaved on the pooled
    // production connection)
    return NextResponse.json({ ok: true, waitlist, clicks });
  } catch (e) {
    console.error("admin data failed:", e?.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
