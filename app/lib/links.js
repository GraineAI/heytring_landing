// Real store links — the /go/* tracking links redirect here.
//
// Android is now OPEN TESTING: the public listing, installable by anyone, no
// tester list and no invite. That is why the Android CTA goes straight to the
// store instead of through the invite modal — gating a publicly downloadable
// app behind an email form buys nothing, because anyone can search Play and
// bypass it. It only costs conversion on a funnel that already loses 85% at
// sign-in.
//
// iOS is still TestFlight, which IS invite-gated, so iPhone keeps the modal.
// The two platforms genuinely differ right now, and the CTA should say so
// rather than pretend they are the same.
// apollo, for the /share/<token> page. Server-side only — this page is server-rendered, so the
// token is exchanged for content without the browser ever holding a recording URL it could keep
// after the link is revoked. Override per environment with NEXT_PUBLIC_API_BASE.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.graine.ai";

export const PLAY_URL = "https://play.google.com/store/apps/details?id=com.graine.callassistant";
export const APP_STORE_URL = "https://testflight.apple.com/join/xPHHa4PG";
