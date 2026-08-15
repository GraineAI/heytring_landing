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

/**
 * Apollo's side of the story.
 *
 * PostHog knows what the PHONE did — screens, taps, errors, the client events the app sends. It
 * does not know what the BACKEND did, and on this product that is most of what matters: whether
 * forwarding was ever actually confirmed with the carrier, whether Ring answered a call, whether
 * they paid, whether they were nudged, whether they deleted. A user who never installed PostHog's
 * SDK build, or whose events were dropped, reads as "did nothing" — which is exactly the person
 * someone is about to ring.
 *
 * So this is additive, and deliberately non-fatal: if Apollo is unreachable the panel still shows
 * the PostHog half with a named reason, rather than failing whole.
 */
async function apolloActivity(phone) {
  const base = (process.env.APOLLO_API_BASE || "https://api.graine.ai").replace(/\/+$/, "");
  const key = process.env.APOLLO_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (!key) {
    return { error: "APOLLO_ADMIN_API_KEY is not set on this deployment" };
  }
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    // The path is its own literal, starting at /api/v1/, so contract.test.mjs can see it and
    // check it against Apollo's actually-mounted routes. Interpolated into the base URL it was
    // invisible to that scanner, and a rename on the Apollo side would have broken this panel
    // silently — which is the failure mode this whole endpoint exists to remove.
    const path = `/api/v1/calls/admin/users/${encodeURIComponent(phone)}/activity`;
    const res = await fetch(
      `${base}${path}?limit=500`,
      { headers: { "X-Internal-API-Key": key }, cache: "no-store", signal: ctl.signal },
    );
    clearTimeout(t);
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return { error: j?.detail || `apollo returned ${res.status}` };
    return j;
  } catch (e) {
    return { error: e?.name === "AbortError" ? "apollo timed out" : "apollo unreachable" };
  }
}

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
    const [timeline, summary, screens, apollo] = await Promise.all([
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
      // Apollo never throws here — apolloActivity resolves to {error} instead, so one unreachable
      // backend cannot take the whole panel down with it.
      apolloActivity(phone),
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
      // THE SERVER-SIDE HALF. Signup, forwarding (and whether it was actually confirmed), every
      // call, purchases, referrals, nudges, deletion — none of which PostHog can see. Passed
      // through whole, including its per-source counts and `partial`, so the panel can say which
      // source failed rather than rendering a gap as "this never happened".
      activity: apollo?.error ? null : (apollo.events || []),
      activitySources: apollo?.error ? null : (apollo.sources || null),
      activityPartial: apollo?.error ? null : (apollo.partial || null),
      activityError: apollo?.error || null,
    });
  } catch (e) {
    const msg = e?.message === "unconfigured"
      ? "POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID must be set on this deployment"
      : "posthog unreachable";
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
