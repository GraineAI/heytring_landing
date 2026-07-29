import { NextResponse } from "next/server";
import { checkPassword, authCookie } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!checkPassword(body.password)) {
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(authCookie());
  return res;
}
