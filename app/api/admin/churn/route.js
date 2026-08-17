import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";
import { sql } from "../../../lib/db";

/**
 * /api/admin/churn — the four churn reads, behind one proxy.
 *
 * ?view=funnel | autopsy | feed | logout_return | timeseries
 *
 * Server-side because ADMIN_API_KEY reads and writes across the whole platform. The autopsy in
 * particular returns exit notes people wrote on their way out; that is exactly the sort of thing
 * that must not be fetchable from a browser tab.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const VIEWS = {
  funnel: "/api/v1/calls/admin/churn/funnel",
  autopsy: "/api/v1/calls/admin/churn/autopsy",
  feed: "/api/v1/calls/admin/churn/feed",
  logout_return: "/api/v1/calls/admin/churn/logout_return",
  timeseries: "/api/v1/calls/admin/timeseries",
  power_users: "/api/v1/calls/admin/power_users",
  utility: "/api/v1/calls/admin/utility",
  referrals: "/api/v1/calls/admin/referrals",
  carriers: "/api/v1/calls/admin/carriers",
  revenue: "/api/v1/calls/admin/revenue",
  delivery_health: "/api/v1/calls/admin/delivery_health",
};

/**
 * THE VIRAL PROJECTION, RECOMPUTED — because Apollo's is compounding the wrong thing.
 *
 * Apollo returns projected_users = base * (1 + k)^cycles. Reproduced exactly against the
 * live panel: 72 * 1.361^15.686 = 9,059 for a card reading 9,070, and the same model
 * inverted gives its k_needed_for_goal of 0.758. So the model is not in doubt.
 *
 * That formula says EVERY user refers k people EVERY cycle, forever — compound interest.
 * A referral programme does not behave that way. Someone invites their friends in the days
 * after they discover the product, gets the reward, and stops; they do not invite another
 * 0.361 friends every 5 days for the rest of their life. The right model is the one every
 * viral-loop treatment uses: each COHORT refers once, and the cohorts form a geometric
 * series.
 *
 *     cohort(0) = base,  cohort(i+1) = k * cohort(i)
 *     cumulative = base * (1 - k^(n+1)) / (1 - k)
 *
 * The consequence is the whole point, and it is not a rounding difference:
 *
 *   k < 1 is SUBCRITICAL. The series CONVERGES, to base/(1-k). At k = 0.361 a base of 72
 *   tops out at ~113 people through referral alone — not in 80 days, EVER. The compound
 *   model claimed 9,070, an 80x overstatement, and worse, it made the goal look like a 2x
 *   improvement away ("needs k = 0.758") when in truth NO k below 1.0 ever reaches 500,000
 *   from this base. Solved properly the answer is k = 1.66 — above 1.0, i.e. genuinely
 *   viral, which almost no consumer app sustains.
 *
 * That is the difference between "push the share prompt harder" and "referral is an
 * amplifier, not the channel — go find a real one". A plan was being built on the first
 * reading. Apollo's own numbers are preserved under `apollo` so the two can be compared
 * rather than one quietly replacing the other.
 */
function cumulativeUsers(base, k, n) {
  if (!(base > 0) || !(k >= 0) || !(n >= 0)) return null;
  if (Math.abs(k - 1) < 1e-9) return base * (n + 1);       // k = 1: linear, not exponential
  return (base * (1 - Math.pow(k, n + 1))) / (1 - k);
}

function fixReferralProjection(body) {
  const k = Number(body.k_factor);
  const base = Number(body.base_users);
  const n = Number(body.cycles_in_horizon);
  const goal = Number(body.goal);
  if (!Number.isFinite(k) || !Number.isFinite(base) || !Number.isFinite(n) || base <= 0) return;

  // Keep what Apollo said, so the correction is auditable instead of invisible.
  body.apollo = {
    projected_users: body.projected_users ?? null,
    k_needed_for_goal: body.k_needed_for_goal ?? null,
    reaches_goal: body.reaches_goal ?? null,
    model: "base * (1 + k)^cycles",
  };

  const projected = cumulativeUsers(base, k, n);
  body.projected_users = projected == null ? null : Math.round(projected);
  body.model = "base * (1 - k^(cycles+1)) / (1 - k)";

  // The ceiling. Only finite below k = 1 — above it the loop genuinely runs away and a
  // saturation figure would be a lie in the other direction.
  body.subcritical = k < 1;
  body.saturation_users = k < 1 && k >= 0 ? Math.round(base / (1 - k)) : null;

  if (Number.isFinite(goal) && goal > 0) {
    body.reaches_goal = projected != null && projected >= goal;
    // Invert numerically rather than algebraically: cumulative() is monotonic in k, and a
    // bisection cannot be tripped up by the k = 1 discontinuity the closed form has.
    let lo = 0, hi = 8;
    if (cumulativeUsers(base, hi, n) < goal) {
      body.k_needed_for_goal = null;               // unreachable even at k = 8; don't invent one
    } else {
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (cumulativeUsers(base, mid, n) < goal) lo = mid; else hi = mid;
      }
      body.k_needed_for_goal = Math.round(((lo + hi) / 2) * 1000) / 1000;
    }
    // The line the old card could not say, because its model never converged.
    if (k < 1 && body.saturation_users != null && body.saturation_users < goal) {
      body.ceiling_note =
        `k = ${k} is below 1.0, so the loop is subcritical: it converges instead of compounding. ` +
        `Referral alone tops out at about ${body.saturation_users.toLocaleString("en-IN")} people ` +
        `from today's base of ${base} — not in ${body.horizon_days ?? n} days, but ever. ` +
        `Reaching ${goal.toLocaleString("en-IN")} needs k above 1.0` +
        (body.k_needed_for_goal != null ? ` (about ${body.k_needed_for_goal})` : "") +
        `, which is a different kind of product, not a harder push on the same one.`;
    }
  }

  /**
   * WHICH WINDOW EACH HALF OF k WAS MEASURED OVER.
   *
   * k = redemptions / base_users, and on the live panel that is 26 redemptions counted over
   * 90 days divided by 72 activated users counted over all time. Those denominators are not
   * the same population, so the ratio is not a coefficient — it drifts every time either
   * window changes and nobody can see why. Not silently corrected here, because the fix
   * belongs in Apollo where both halves are measurable; stated instead, on the number, so it
   * cannot be quoted without its caveat.
   */
  if (Number.isFinite(Number(body.redemptions)) && base > 0) {
    body.k_definition = `${body.redemptions} redemptions ÷ ${base} users`;
    body.k_window_note =
      `Redemptions are counted over ${body.window_days ?? "?"} days; the ${base}-user base is not ` +
      `window-matched to them. Read k as a rough current yield, not a stable coefficient.`;
  }

  /**
   * A DECILE OF SIX PEOPLE IS ONE PERSON.
   *
   * The card reads "the top 10% of referrers bring 69.2% of all referred users", which sounds
   * like a power law measured across a population. There are 6 referrers. Ten percent of 6 is
   * 0.6, so Apollo is really reporting the top ONE — and "the top 10%" dressed that up as a
   * distribution when it is a single person who could stop tomorrow.
   *
   * That distinction changes the decision. A genuine power law across dozens of referrers says
   * find more of that type. One person carrying 69% says the channel has a single point of
   * failure and the first job is to go and talk to them. Below ten referrers the decile is
   * relabelled as the headcount it actually describes.
   */
  const referrers = Number(body.referrers);
  if (Number.isFinite(referrers) && referrers > 0 && body.top_decile_share_pct != null) {
    body.top_decile_n = Math.max(1, Math.ceil(referrers * 0.1));
    if (referrers < 10) {
      body.concentration_note =
        `${body.top_decile_n} of ${referrers} referrers brings ${body.top_decile_share_pct}% of all ` +
        `referred users. With only ${referrers} referrers a "top 10%" is not a distribution — it is ` +
        `this many people, and the channel stops if they do.`;
    }
  }

  /**
   * A FUNNEL THAT RUNS UPHILL IS NOT A FUNNEL. The loop card draws shares -> opens ->
   * redemptions as three descending bars, but redemptions (26) exceed shares (12): one share
   * of a code can be redeemed by many people, so the steps are not nested and the picture
   * implies a conversion story that the arithmetic contradicts.
   */
  const shares = Number(body.loop_top?.shares);
  const red = Number(body.redemptions);
  if (Number.isFinite(shares) && Number.isFinite(red) && red > shares && shares > 0) {
    body.loop_not_nested = true;
    body.loop_note =
      `${red} redemptions against ${shares} shares — one shared code can be redeemed by several ` +
      `people, so these steps do not contain one another and the sequence is not a funnel.`;
  }
}

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "APOLLO_ADMIN_API_KEY is not set on this deployment. Set it to the same "
        + "value as ADMIN_API_KEY in Apollo's environment, then redeploy." },
      { status: 503 },
    );
  }
  const { searchParams } = new URL(req.url);
  const path = VIEWS[searchParams.get("view") || "funnel"];
  if (!path) return NextResponse.json({ ok: false, error: "unknown view" }, { status: 400 });

  const qs = new URLSearchParams();
  for (const k of ["days", "limit", "weeks", "months", "goal", "horizon_days"]) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  const base = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}${path}${qs.toString() ? "?" + qs : ""}`, {
      headers: { "X-Internal-API-Key": key }, cache: "no-store",
    });
    const body = await res.json().catch(() => ({ ok: false }));

    // LINK OPENS ALREADY EXIST — here, not in Apollo. Every tap on /r/{code} is written to the
    // `clicks` table by that page, so asking the app to emit a second event for the same act
    // would double-count it and put two disagreeing numbers in front of the same person. Apollo
    // is authoritative for shares and redemptions, this database for opens; the proxy is where
    // they meet, so the panel still makes exactly one call.
    if (searchParams.get("view") === "referrals" && body?.ok) {
      try {
        // CLAMP TO APOLLO'S OWN BOUNDS. /admin/referrals declares days ge=14 le=180, so a picker
        // outside that range 422s there while this local half would happily have accepted it —
        // leaving one card whose two numbers were measured over different windows and no sign of
        // it on screen. Matching the bounds here keeps both halves describing the same period.
        const raw = Number(searchParams.get("days") || 60);
        const days = Math.min(180, Math.max(14, Number.isFinite(raw) ? raw : 60));
        const rows = await sql()`
          SELECT COUNT(*)::int AS opens
          FROM clicks
          WHERE placement LIKE 'referral:%'
            AND placement <> 'referral:invalid'
            AND created_at >= NOW() - (${days} || ' days')::interval`;
        const opens = rows?.[0]?.opens ?? null;
        if (opens != null) {
          body.loop_top = { ...(body.loop_top || {}), link_opens: opens, instrumented: true };
          /**
           * OPENS AND REDEMPTIONS ARE NOT THE SAME POPULATION, and dividing them was producing
           * "2500%" on the live panel — 25 redemptions over 1 open.
           *
           * `opens` counts referral clicks logged BY THIS WEBSITE. A friend who gets the WhatsApp
           * invite and installs straight from the Play Store, or who opens the link inside
           * WhatsApp's in-app browser, redeems the code in the app and never produces a row here
           * at all. So opens is a FLOOR on a differently-defined population, sitting between two
           * numbers that both come from Apollo.
           *
           * A ratio above 100% is not a surprising result, it is proof the denominator does not
           * contain the numerator. Emit the rate only when it is arithmetically possible, and say
           * so explicitly when it is not — a missing number sends someone to look, a wrong one
           * gets quoted in a deck.
           */
          if (opens > 0 && typeof body.redemptions === "number") {
            const pct = Math.round((body.redemptions / opens) * 1000) / 10;
            if (pct <= 100) {
              body.open_to_redeem_pct = pct;
            } else {
              body.open_to_redeem_pct = null;
              body.open_to_redeem_note =
                `${body.redemptions} redemptions against ${opens} link opens measured on this site — ` +
                `most invites are installed straight from the store and never touch this log, so the ` +
                `two are different populations and the ratio is meaningless.`;
            }
          }
        }
      } catch (e) {
        console.error("referral opens read failed:", e?.message);
      }
      // Runs whether or not the opens read above succeeded — the projection depends only on
      // Apollo's own k, base and cycle time, so a local database hiccup must not leave the
      // card showing the compound-interest number again.
      try { fixReferralProjection(body); } catch (e) { console.error("referral projection:", e?.message); }
    }
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "apollo unreachable" }, { status: 502 });
  }
}
