import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";
import { isAuthed } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await ensureSchema();
    const q = sql();
    const [waitlist, clicks, agg] = await Promise.all([
      q`SELECT id, name, email, device, placement, source, utm, landing, user_agent, country, contacted,
               notes, outcome, tags, called_at, created_at, visitor_id
        FROM waitlist ORDER BY created_at DESC LIMIT 1000`,
      q`SELECT id, kind, placement, referrer, user_agent, country, created_at, visitor_id
        FROM clicks ORDER BY created_at DESC LIMIT 500`,
      /**
       * TOTALS COMPUTED IN SQL, over every row — not in the browser over the arrays above.
       *
       * The tiles used to count the fetched arrays, which are capped at 1000 signups and 500
       * clicks. That is not a rounding error waiting to happen; past those caps the numbers simply
       * STOP MOVING, and a dashboard frozen at "500 Play clicks" looks like a plateau in the
       * business rather than a LIMIT in a query. The comment that used to sit here said the tiles
       * were derived client-side "so they always agree with the table" — they agreed with the
       * table by both being wrong.
       *
       * COUNT(DISTINCT visitor_id) is the point of the whole change: people, not rows. Nulls are
       * excluded by COUNT by definition, which is the correct treatment — an unattributable row
       * (bot, cookie-blocked browser) must not become a person. Both are returned so the gap
       * between them is visible instead of hidden: if uniques are far below the raw count, either
       * a few people are very busy or something is retrying.
       */
      q`
        SELECT
          (SELECT count(*) FROM waitlist)                                             AS waitlist_total,
          (SELECT count(*) FROM waitlist WHERE device = 'android')                    AS waitlist_android,
          (SELECT count(*) FROM waitlist WHERE device = 'ios')                        AS waitlist_ios,
          (SELECT count(*) FROM waitlist WHERE created_at > now() - interval '24 hours') AS waitlist_today,
          (SELECT count(*) FROM waitlist WHERE contacted)                             AS waitlist_contacted,
          (SELECT count(DISTINCT visitor_id) FROM waitlist)                           AS waitlist_visitors,

          (SELECT count(*) FROM clicks WHERE kind = 'play')                           AS play_clicks,
          (SELECT count(*) FROM clicks WHERE kind = 'ios')                            AS ios_clicks,
          (SELECT count(DISTINCT visitor_id) FROM clicks)                             AS click_visitors,
          (SELECT count(DISTINCT visitor_id) FROM clicks WHERE created_at > now() - interval '24 hours') AS click_visitors_today,

          (SELECT count(DISTINCT visitor_id) FROM visits)                             AS visitors,
          (SELECT count(DISTINCT visitor_id) FROM visits WHERE created_at > now() - interval '24 hours') AS visitors_today,
          (SELECT count(DISTINCT visitor_id) FROM visits WHERE created_at > now() - interval '7 days')   AS visitors_7d,
          (SELECT count(*) FROM visits)                                               AS pageviews,

          -- THE FUNNEL, as one population. Each step counts only visitors we can actually follow
          -- from the step before, which is why every one of these is a DISTINCT over the same id
          -- rather than a total from a different table divided by a total from another.
          (SELECT count(DISTINCT c.visitor_id) FROM clicks c
             WHERE c.visitor_id IN (SELECT visitor_id FROM visits))                   AS visited_then_clicked,
          (SELECT count(DISTINCT w.visitor_id) FROM waitlist w
             WHERE w.visitor_id IN (SELECT visitor_id FROM visits))                   AS visited_then_joined
      `,
    ]);
    const a = agg?.[0] || {};
    // Postgres COUNT comes back as a string over the HTTP driver; a string in a tile renders fine
    // and then silently breaks the first arithmetic anyone does with it.
    const stats = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Number(v) || 0]));
    return NextResponse.json({ ok: true, waitlist, clicks, stats });
  } catch (e) {
    console.error("admin data failed:", e?.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }
}
