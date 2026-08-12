import { NextResponse } from "next/server";
import { sql, ensureSchema, requestMeta } from "../../lib/db";
import { PLAY_URL, APP_STORE_URL } from "../../lib/links";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * /r/{code} — the referral link.
 *
 * THIS ROUTE DID NOT EXIST. The backend has generated referral links against
 * REFERRAL_LINK_BASE=https://heytring.com/r since the referral engine shipped, the app puts one in
 * every share message, and every single one returned 404. That is the whole explanation for
 * "referred a friend: 2, redeemed: 0" — the loop was never broken at the reward step, it was
 * broken at the first hop, and nobody who tapped a shared link ever reached a store page.
 *
 * Sends the visitor to the right store by user agent, and parks the code in a cookie first so the
 * attribution survives the round trip through the store and the install. The cookie is the only
 * way the code can outlive the redirect: nothing else about the visitor persists to first launch.
 */
export async function GET(req, { params }) {
  const raw = String(params?.code || "");
  // Referral codes are short and alphanumeric. Anything else is someone poking at the URL, and
  // must not be written to the database or reflected back.
  const code = /^[A-Za-z0-9]{4,16}$/.test(raw) ? raw.toUpperCase() : null;

  const { ua, country, referrer } = requestMeta(req);
  const isIOS = /iPhone|iPad|iPod/i.test(ua || "");
  const target = isIOS ? APP_STORE_URL : PLAY_URL;

  // Log as a click so referral traffic shows up beside every other source in the panel rather
  // than being invisible. Never blocks the redirect.
  try {
    await ensureSchema();
    await sql()`
      INSERT INTO clicks (kind, placement, referrer, user_agent, country)
      VALUES (${isIOS ? "ios" : "play"}, ${code ? `referral:${code}` : "referral:invalid"},
              ${referrer}, ${ua}, ${country})
    `;
  } catch (e) {
    console.error("referral click log failed:", e?.message);
  }

  const res = NextResponse.redirect(target, 302);
  if (code) {
    // 30 days: long enough to survive "I'll install it later", short enough that a code cannot
    // silently attribute an install months afterwards. Not httpOnly on purpose — the web app reads
    // it to pre-fill the code, and it is a referral code, not a credential.
    res.cookies.set("tring_ref", code, {
      maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", secure: true,
    });
  }
  return res;
}
