import crypto from "crypto";

const COOKIE = "tring_admin";

function secret() {
  return process.env.ADMIN_PASSWORD || "";
}

/** Opaque session value derived from the admin password. */
export function adminToken() {
  return crypto.createHmac("sha256", secret()).update("tring-admin-session-v1").digest("hex");
}

export function checkPassword(pw) {
  const a = Buffer.from(String(pw || ""));
  const b = Buffer.from(secret());
  return secret().length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isAuthed(req) {
  const c = req.cookies.get(COOKIE)?.value;
  return Boolean(c) && c === adminToken();
}

export function authCookie() {
  return {
    name: COOKIE,
    value: adminToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
