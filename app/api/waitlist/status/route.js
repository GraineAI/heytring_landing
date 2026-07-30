import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Signup status for the returning visitor's own email: has the team
 *  ticked (approved) them yet? Returns booleans only. */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = String(body.email || "").trim().slice(0, 160).toLowerCase();
  const device = body.device === "ios" ? "ios" : "android";
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    await ensureSchema();
    const rows = await sql()`
      SELECT contacted FROM waitlist
      WHERE lower(email) = ${email} AND device = ${device}
      LIMIT 1
    `;
    return NextResponse.json({
      ok: true,
      found: rows.length > 0,
      approved: rows.length > 0 && rows[0].contacted === true,
    });
  } catch (e) {
    console.error("status failed:", e?.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
