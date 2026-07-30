// Real beta-testing links — the /go/* tracking links redirect here.
// Android: Play closed testing (email must be on the tester list first).
// iOS: public TestFlight invite (works immediately).
// apollo, for the /share/<token> page. Server-side only — this page is server-rendered, so the
// token is exchanged for content without the browser ever holding a recording URL it could keep
// after the link is revoked. Override per environment with NEXT_PUBLIC_API_BASE.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.graine.ai";

export const PLAY_URL = "https://play.google.com/apps/testing/com.graine.callassistant";
export const APP_STORE_URL = "https://testflight.apple.com/join/xPHHa4PG";
