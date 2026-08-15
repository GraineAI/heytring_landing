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
          -- ROWS. Kept, and labelled as rows, because the table below shows rows and the two must
          -- reconcile. It is NOT the number of people — see waitlist_people.
          (SELECT count(*) FROM waitlist)                                             AS waitlist_rows,
          -- PEOPLE. The unique index is on (lower(email), device), deliberately, so someone who
          -- signs up for Android and again for iPhone is two rows — correct for the call list,
          -- which needs to know which build to talk about, and wrong for "how many signed up",
          -- which is what the tile said. Several people in the list are already double-counted
          -- this way. One human is one email.
          (SELECT count(DISTINCT lower(email)) FROM waitlist)                         AS waitlist_people,
          (SELECT count(DISTINCT lower(email)) FROM waitlist WHERE device = 'android') AS waitlist_android,
          (SELECT count(DISTINCT lower(email)) FROM waitlist WHERE device = 'ios')     AS waitlist_ios,
          (SELECT count(DISTINCT lower(email)) FROM waitlist
            WHERE created_at > now() - interval '24 hours')                           AS waitlist_today,
          (SELECT count(DISTINCT lower(email)) FROM waitlist WHERE contacted)         AS waitlist_contacted,
          -- Someone who signed up on both platforms. Shown so the gap between rows and people is
          -- explained on the page rather than looking like a bug in one of the two numbers.
          (SELECT count(*) FROM (
             SELECT lower(email) FROM waitlist GROUP BY 1 HAVING count(DISTINCT device) > 1
           ) d)                                                                       AS waitlist_multi_device,

          -- CLICKS: taps, and the people who made them. Both, because they answer different
          -- questions and neither substitutes for the other. The raw count is badly inflated by
          -- repeats — the log has runs of four identical hero clicks inside seven seconds — so
          -- quoting it as reach is wrong by a wide margin.
          (SELECT count(*) FROM clicks WHERE kind = 'play')                           AS play_clicks,
          (SELECT count(*) FROM clicks WHERE kind = 'ios')                            AS ios_clicks,
          (SELECT count(DISTINCT visitor_id) FROM clicks)                             AS click_people,
          (SELECT count(DISTINCT visitor_id) FROM clicks WHERE kind = 'play')         AS play_people,
          (SELECT count(DISTINCT visitor_id) FROM clicks WHERE kind = 'ios')          AS ios_people,
          -- ATTRIBUTION COVERAGE. Every click logged before the visitor cookie existed has a null
          -- id, and COUNT(DISTINCT) silently skips them — so a unique count over mostly-historical
          -- rows reads as "almost nobody clicked" when it means "we could not tell who". The
          -- dashboard must be able to say which it is, so the page can hide a people-count that
          -- covers too little of the data instead of printing a number that is simply false.
          (SELECT count(*) FROM clicks WHERE visitor_id IS NOT NULL)                  AS clicks_attributed,
          (SELECT count(*) FROM clicks)                                               AS clicks_total,

          -- VISITS. One row per visitor per path per day, by unique index — so count(*) here is
          -- page-days, NOT pageviews, and calling it pageviews would overstate uniques and
          -- understate real views at the same time. Named for what it is.
          (SELECT count(DISTINCT visitor_id) FROM visits)                             AS visitors,
          (SELECT count(DISTINCT visitor_id) FROM visits WHERE created_at > now() - interval '24 hours') AS visitors_today,
          (SELECT count(DISTINCT visitor_id) FROM visits WHERE created_at > now() - interval '7 days')   AS visitors_7d,
          (SELECT count(*) FROM visits)                                               AS page_days,

          -- THE FUNNEL, as ONE population. Each step is a DISTINCT over the same anonymous id and
          -- is restricted to visitors we can actually follow from the step before. This is what
          -- stops the "2500% conversion" class of number: a rate whose numerator and denominator
          -- come from different populations is not a rate.
          (SELECT count(DISTINCT c.visitor_id) FROM clicks c
             WHERE c.visitor_id IS NOT NULL
               AND c.visitor_id IN (SELECT visitor_id FROM visits))                   AS visited_then_clicked,
          (SELECT count(DISTINCT w.visitor_id) FROM waitlist w
             WHERE w.visitor_id IS NOT NULL
               AND w.visitor_id IN (SELECT visitor_id FROM visits))                   AS visited_then_joined
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
