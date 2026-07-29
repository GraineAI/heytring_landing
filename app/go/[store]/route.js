import { NextResponse } from "next/server";
import { sql, ensureSchema, requestMeta } from "../../lib/db";
import { PLAY_URL, APP_STORE_URL } from "../../lib/links";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Tracking links: /go/play and /go/ios log the click, then redirect to
 *  the real store listing. Logging never blocks the redirect. */
export async function GET(req, { params }) {
  const kind = params.store === "ios" ? "ios" : "play";
  const url = new URL(req.url);
  const placement = (url.searchParams.get("p") || "").slice(0, 60) || null;
  const { ua, country, referrer } = requestMeta(req);

  try {
    await ensureSchema();
    await sql()`
      INSERT INTO clicks (kind, placement, referrer, user_agent, country)
      VALUES (${kind}, ${placement}, ${referrer}, ${ua}, ${country})
    `;
  } catch (e) {
    console.error("click log failed:", e?.message);
  }

  return NextResponse.redirect(kind === "ios" ? APP_STORE_URL : PLAY_URL, 302);
}
