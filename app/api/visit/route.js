import { NextResponse } from "next/server";
import { sql, ensureSchema, requestMeta } from "../../lib/db";
import { visitorId } from "../../lib/visitor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * /api/visit — records that an anonymous visitor saw a page, at most once per path per day.
 *
 * WHY THIS EXISTS WHEN GA4 AND VERCEL ARE ALREADY INSTALLED: neither can be joined to the waitlist
 * table. The conversion rate that actually decides what to build — of the people who read the page,
 * how many joined — needs the numerator and the denominator in the same database, computed from
 * one definition of a person. Two vendor dashboards with two different definitions of a "user" and
 * no shared key cannot produce that number, which is why nobody has ever quoted it.
 *
 * WHY A POST FROM THE CLIENT rather than logging in middleware: middleware runs on prefetches, on
 * bot crawls and on every asset-adjacent request, so writing there counts machines as readers. A
 * beacon that runs after hydration means a human's browser actually rendered the page.
 *
 * The write is deduplicated by a UNIQUE INDEX in the schema, not by trusting this handler or the
 * caller — React strict mode double-mounts effects in development, and a user can reload a page
 * twenty times. ON CONFLICT DO NOTHING makes all of that one visit.
 */
export async function POST(req) {
  const vid = visitorId(req);
  // No cookie → a bot, a cookie-blocking browser, or a request middleware never touched. Recording
  // it would need an invented id, and an invented id per request is one fake "unique visitor" per
  // request, which is exactly the inflation this table exists to avoid. Answer OK so the caller
  // does not retry; there is nothing wrong on their side.
  if (!vid) return NextResponse.json({ ok: true, counted: false });

  let body = {};
  try { body = await req.json(); } catch {}

  const path = String(body.path || "/").slice(0, 200);
  // Never record a share route: its token is the credential to a private recording, and the rest
  // of this site (SiteAnalytics, middleware) already refuses to build any record around it.
  if (path.startsWith("/share/")) return NextResponse.json({ ok: true, counted: false });

  const utm = body.utm && typeof body.utm === "object" ? body.utm : null;
  const { ua, country, referrer } = requestMeta(req);

  try {
    await ensureSchema();
    await sql()`
      INSERT INTO visits (visitor_id, path, referrer, utm, user_agent, country)
      VALUES (${vid}, ${path}, ${referrer}, ${utm ? JSON.stringify(utm) : null}, ${ua}, ${country})
      ON CONFLICT (visitor_id, path, day) DO NOTHING
    `;
    return NextResponse.json({ ok: true, counted: true });
  } catch (e) {
    console.error("visit log failed:", e?.message);
    // Never surface a failure: analytics must not be able to break a page load.
    return NextResponse.json({ ok: true, counted: false });
  }
}
