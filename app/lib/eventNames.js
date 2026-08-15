/**
 * Raw analytics event names → something a human can read on a phone call.
 *
 * The admin was printing PostHog's identifiers verbatim: `$autocapture`,
 * `activation:healthcheck`, `otp_abandoned`. Those are fine in a query console
 * and useless in a panel someone reads thirty seconds before ringing a
 * stranger. Worse, they all LOOK the same weight, so a row saying the person
 * gave up on the code screen sat below a row saying the SDK captured 103 taps.
 *
 * So this does two jobs, and the second matters more than the first:
 *   1. name    — what actually happened, in words.
 *   2. kind    — whether it is a thing the PERSON did, or a thing the SDK
 *                logged. The panel ranks and dims on this, because separating
 *                signal from plumbing is the whole point.
 *
 * kinds: error (went wrong) · auth (getting in) · setup (arming it)
 *        use (real product use) · sdk (framework noise, no product meaning)
 */
const MAP = {
  // ── things that went wrong ────────────────────────────────────────────────
  login_otp_send_failed:  ["We failed to send their code", "error"],
  login_otp_failed:       ["Their code was rejected",      "error"],
  otp_abandoned:          ["Gave up on the code screen",   "error"],
  $exception:             ["The app crashed",              "error"],

  // ── getting in ────────────────────────────────────────────────────────────
  signin_started:         ["Started signing in",           "auth"],
  login_phone:            ["Reached the phone-number screen", "auth"],
  otp_request_tapped:     ["Tapped “send me a code”",      "auth"],
  login_otp_requested:    ["Asked for a code",             "auth"],
  otp_screen_shown:       ["Reached the code screen",      "auth"],
  otp_screen_viewed:      ["Reached the code screen",      "auth"],
  otp_autofilled:         ["Code filled itself from the SMS", "auth"],
  otp_submit_tapped:      ["Submitted a code",             "auth"],
  otp_submitted:          ["Submitted a code",             "auth"],
  otp_verified:           ["Code accepted",                "auth"],
  login_success:          ["Signed in",                    "auth"],

  // ── arming the product ────────────────────────────────────────────────────
  onboarding_started:     ["Started setup",                "setup"],
  onboarding_complete:    ["Finished setup",               "setup"],
  onboarding_completed:   ["Finished setup",               "setup"],
  "activation:login":     ["Setup · signed in",            "setup"],
  "activation:verify":    ["Setup · checked forwarding",   "setup"],
  "activation:activate":  ["Setup · switched Tring on",    "setup"],
  "activation:healthcheck": ["Setup · ran the health check", "setup"],
  checkup_verify_forwarding: ["Checked call forwarding",   "setup"],
  tring_contact_saved:    ["Saved Tring to their contacts","setup"],
  activated:              ["Tring answered a call for them", "setup"],
  app_first_open:         ["Opened the app for the first time", "setup"],

  // ── actually using it ─────────────────────────────────────────────────────
  screened_call_viewed:   ["Read a handled call",          "use"],
  push_open:              ["Opened a notification",        "use"],
  live_notification_extension_status: ["Live-call notification fired", "use"],
  referral_share:         ["Shared a referral",            "use"],
  referral_copy:          ["Copied their referral link",   "use"],
  favourites_saved:       ["Saved a favourite",            "use"],
  caller_id_enable_tap:   ["Turned caller ID on",          "use"],
  paywall_open:           ["Opened the paywall",           "use"],
  paywall_start:          ["Started a purchase",           "use"],
  auto_mode_toggle:       ["Toggled automatic mode",       "use"],
  personalise_save:       ["Saved a personalisation",      "use"],
  focus_report_share:     ["Shared a focus report",        "use"],

  // ── framework noise ───────────────────────────────────────────────────────
  $autocapture:              ["Taps the SDK recorded",     "sdk"],
  $screen:                   ["Screen changes",            "sdk"],
  $set:                      ["Profile fields written",    "sdk"],
  $identify:                 ["Linked to their account",   "sdk"],
  $feature_flag_called:      ["Feature flag read",         "sdk"],
  "Application Opened":      ["Opened the app",            "sdk"],
  "Application Became Active": ["Brought the app forward", "sdk"],
  "Application Backgrounded":["Sent the app to background","sdk"],
  "Application Installed":   ["Installed the app",         "sdk"],
  "Application Updated":     ["Updated the app",           "sdk"],
};

/** Rank: what went wrong, then how far they got, then plumbing last. */
export const KIND_ORDER = { error: 0, auth: 1, setup: 2, use: 3, sdk: 4 };

export const KIND_COLOR = {
  error: "#E4926F",
  auth:  "#E7B75A",
  setup: "#7FD1B9",
  use:   "#8FBF7F",
  sdk:   "#5b6673",
};

/**
 * Unknown events are NOT hidden and NOT guessed at. An event this file has
 * never seen is usually a new one someone just shipped, and silently dropping
 * it would make the newest thing in the product the one thing invisible here.
 * It gets tidied (underscores out, colon prefixes kept) and marked "use", so
 * it sorts with real product events rather than with plumbing.
 */
export function humanEvent(raw) {
  const hit = MAP[raw];
  if (hit) return { name: hit[0], kind: hit[1], raw, known: true };
  const name = String(raw || "")
    .replace(/^\$/, "")
    .replace(/[_:]+/g, " ")
    .replace(/\b\w/, (c) => c.toUpperCase());
  return { name, kind: "use", raw, known: false };
}

/** Sort by meaning first, then by how often it happened. */
export function byMeaning(a, b) {
  const ka = KIND_ORDER[humanEvent(a.event).kind] ?? 3;
  const kb = KIND_ORDER[humanEvent(b.event).kind] ?? 3;
  return ka - kb || (b.n || 0) - (a.n || 0);
}
