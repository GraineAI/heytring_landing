import { NextResponse } from "next/server";
import { sql, ensureSchema, requestMeta } from "../../lib/db";
import { PLAY_URL, APP_STORE_URL } from "../../lib/links";
import { visitorId } from "../../lib/visitor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Tracking links: /go/play and /go/ios log the click, then redirect to
 *  the real store listing. Logging never blocks the redirect. */
export async function GET(req, { params }) {
  const kind = params.store === "ios" ? "ios" : "play";
  const url = new URL(req.url);
  const placement = (url.searchParams.get("p") || "").slice(0, 60) || null;
  const { ua, country, referrer } = requestMeta(req);
  // Who clicked, anonymously. Without it "Play clicks" is a row count that cannot distinguish an
  // audience from one determined person, and the store-click step of the funnel has no denominator
  // it shares with anything else on the page.
  const vid = visitorId(req);

  try {
    await ensureSchema();
    await sql()`
      INSERT INTO clicks (kind, placement, referrer, user_agent, country, visitor_id)
      VALUES (${kind}, ${placement}, ${referrer}, ${ua}, ${country}, ${vid})
    `;
  } catch (e) {
    console.error("click log failed:", e?.message);
  }

  return NextResponse.redirect(kind === "ios" ? APP_STORE_URL : PLAY_URL, 302);
}
