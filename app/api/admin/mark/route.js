import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";
import { isAuthed } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Tick / untick a signup as onboarded. */
export async function POST(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const id = Number(body.id);
  const contacted = Boolean(body.contacted);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  }
  try {
    await ensureSchema();
    await sql()`UPDATE waitlist SET contacted = ${contacted} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("mark failed:", e?.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
