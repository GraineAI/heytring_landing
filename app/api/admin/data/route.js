import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";
import { isAuthed } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await ensureSchema();
    const q = sql();
    const [waitlist, clicks, stats] = await Promise.all([
      q`SELECT id, name, email, device, placement, source, utm, user_agent, country, created_at
        FROM waitlist ORDER BY created_at DESC LIMIT 1000`,
      q`SELECT id, kind, placement, referrer, user_agent, country, created_at
        FROM clicks ORDER BY created_at DESC LIMIT 500`,
      q`SELECT
          (SELECT count(*)::int FROM waitlist)                                        AS total,
          (SELECT count(*)::int FROM waitlist WHERE device = 'android')               AS android,
          (SELECT count(*)::int FROM waitlist WHERE device = 'ios')                   AS ios,
          (SELECT count(*)::int FROM waitlist WHERE created_at > now() - interval '1 day') AS today,
          (SELECT count(*)::int FROM clicks WHERE kind = 'play')                      AS play_clicks,
          (SELECT count(*)::int FROM clicks WHERE kind = 'ios')                       AS ios_clicks
      `,
    ]);
    return NextResponse.json({ ok: true, waitlist, clicks, stats: stats[0] });
  } catch (e) {
    console.error("admin data failed:", e?.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
