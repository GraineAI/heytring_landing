import { NextResponse } from "next/server";
import { sql, ensureSchema, requestMeta } from "../../lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().slice(0, 160);
  const device = body.device === "ios" ? "ios" : "android";
  const placement = String(body.placement || "").slice(0, 60) || null;
  const source = String(body.source || "").slice(0, 400) || null;
  const utm = body.utm && typeof body.utm === "object" ? body.utm : null;

  if (name.length < 2) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "email" }, { status: 400 });

  const { ua, country } = requestMeta(req);

  try {
    await ensureSchema();
    await sql()`
      INSERT INTO waitlist (name, email, device, placement, source, utm, user_agent, country)
      VALUES (${name}, ${email}, ${device}, ${placement}, ${source}, ${utm ? JSON.stringify(utm) : null}, ${ua}, ${country})
      ON CONFLICT ((lower(email)))
      DO UPDATE SET name = EXCLUDED.name, device = EXCLUDED.device, placement = EXCLUDED.placement
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("waitlist insert failed:", e?.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
