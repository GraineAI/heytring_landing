import { NextResponse } from "next/server";
import { isAuthed } from "../../../lib/adminAuth";
import { pseudoId } from "../../../lib/pseudoId";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * /api/admin/person?phone=+91… — ONE person's actual behaviour.
 *
 * The panel could already say WHERE everybody stopped, in aggregate: 51 people lost between "Tring
 * answered a call" and "came back". What it could not say is what any ONE of those 51 did — which
 * screens they reached, what they tapped, which error they hit, how far into setup they got before
 * they stopped. That is the difference between knowing a stage leaks and knowing why, and it is the
 * question every one of those "Log a call" buttons is going to raise the moment somebody dials.
 *
 * THE JOIN: the app identifies people to PostHog as pseudoId(phone) and never as the phone number
 * (see app/lib/pseudoId.js). The admin list holds phone numbers. Hashing here, server-side, is the
 * bridge — and it is why the phone number itself never leaves this process.
 *
 * WHY A SEPARATE ROUTE and not a filter on the existing proxy: this is a per-person scan, run on
 * demand for one row, and it must never be part of the dashboard's own load. The dashboard is
 * already the thing that has twice hit PostHog's execution limit.
 */
const HOST = process.env.POSTHOG_API_HOST || "https://us.posthog.com";

async function hogql(query) {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const pid = process.env.POSTHOG_PROJECT_ID;
  if (!key || !pid) throw new Error("unconfigured");
  const r = await fetch(`${HOST}/api/projects/${pid}/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  // Never echo the body — a PostHog auth error can quote the key back at us.
  if (!r.ok) throw new Error(`posthog ${r.status}`);
  return (await r.json()).results || [];
}

/**
 * The stage a person reached, derived from the events they actually fired rather than from a status
 * column someone has to remember to write. Ordered, and read as "the furthest thing they did" — a
 * user who activated and then deleted still passed through activation, and a stage that moves
 * backwards on its own is a stage nobody trusts.
 *
 * Keys mirror the lifecycle vocabulary the rest of the panel uses so the two can be compared.
 */
const STAGES = [
  { key: "retained",   label: "Retained — answered calls on 5+ days", events: ["retained"] },
  { key: "activated",  label: "Activated — Tring answered a call",    events: ["activated", "screened_call_viewed"] },
  { key: "armed",      label: "Forwarding enabled",                   events: ["forwarding_enabled", "activation:activate"] },
  { key: "signed_in",  label: "Signed in",                            events: ["login_success", "otp_verified"] },
  { key: "code",       label: "Asked for a code",                     events: ["login_otp_requested", "otp_request_tapped", "signin_started"] },
  { key: "opened",     label: "Opened the app",                       events: ["app_first_open"] },
];

export async function GET(req) {
  if (!isAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") || "").trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return NextResponse.json({ ok: false, error: "a phone number with at least 10 digits is required" }, { status: 400 });
  }
  const days = Math.min(180, Math.max(1, Number(searchParams.get("days")) || 90));
  const pid = pseudoId(phone);

  // Single-quoted literal built from a hex-and-underscore id we generated ourselves — pseudoId
  // returns "u_" plus 16 hex characters and nothing else. Asserted rather than assumed, because
  // "the value is safe because of where it came from" is how injection arrives later, when someone
  // changes where it comes from.
  if (!/^u_[0-9a-f]{16}$/.test(pid)) {
    return NextResponse.json({ ok: false, error: "bad id" }, { status: 500 });
  }

  try {
    const [timeline, summary, screens] = await Promise.all([
      // What they did, newest first. Grouped by event so a person who tapped the same thing forty
      // times is one row saying forty — a raw firehose of $autocapture would bury the two events
      // that actually explain their stall.
      hogql(`SELECT event, count() AS n, min(timestamp) AS first_at, max(timestamp) AS last_at
             FROM events
             WHERE timestamp >= now() - INTERVAL ${days} DAY
               AND person_id IN (SELECT id FROM persons WHERE pdi.distinct_id = '${pid}')
             GROUP BY event ORDER BY last_at DESC LIMIT 200`),
      hogql(`SELECT count() AS events, uniq($session_id) AS sessions,
                    min(timestamp) AS first_seen, max(timestamp) AS last_seen,
                    uniq(toDate(timestamp)) AS active_days,
                    any(properties.$os) AS os, any(properties.$app_version) AS app_version
             FROM events
             WHERE timestamp >= now() - INTERVAL ${days} DAY
               AND person_id IN (SELECT id FROM persons WHERE pdi.distinct_id = '${pid}')`),
      // Where they spent their time. The screen someone stopped on is usually the answer.
      hogql(`SELECT properties.$screen_name AS screen, count() AS n, max(timestamp) AS last_at
             FROM events
             WHERE event = '$screen' AND timestamp >= now() - INTERVAL ${days} DAY
               AND person_id IN (SELECT id FROM persons WHERE pdi.distinct_id = '${pid}')
             GROUP BY screen ORDER BY n DESC LIMIT 30`),
    ]);

    const fired = new Set(timeline.map((r) => String(r[0])));
    const stage = STAGES.find((s) => s.events.some((e) => fired.has(e))) || null;

    const [events = 0, sessions = 0, firstSeen = null, lastSeen = null, activeDays = 0, os = null, appVersion = null] =
      summary[0] || [];

    return NextResponse.json({
      ok: true,
      // The id, so a discrepancy can be checked against PostHog by hand. NOT the phone number: it
      // came in on the query string and does not need to go back out in the body as well.
      pseudoId: pid,
      found: Number(events) > 0,
      stage: stage ? { key: stage.key, label: stage.label } : null,
      summary: {
        events: Number(events) || 0,
        sessions: Number(sessions) || 0,
        activeDays: Number(activeDays) || 0,
        firstSeen, lastSeen, os, appVersion,
      },
      // Errors surfaced separately — on this product they are the single most common explanation
      // for a stalled user, and login_otp_send_failed alone accounts for 45 people.
      errors: timeline
        .filter(([e]) => /fail|error|exception|crash/i.test(String(e)))
        .map(([event, n, first_at, last_at]) => ({ event, n: Number(n), first_at, last_at })),
      timeline: timeline.map(([event, n, first_at, last_at]) => ({ event, n: Number(n), first_at, last_at })),
      screens: screens.map(([screen, n, last_at]) => ({ screen: screen || "(unknown)", n: Number(n), last_at })),
    });
  } catch (e) {
    const msg = e?.message === "unconfigured"
      ? "POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID must be set on this deployment"
      : "posthog unreachable";
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
