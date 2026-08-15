import { NextResponse } from "next/server";

/**
 * VISITOR IDENTITY — the thing this site has never had.
 *
 * Every number in the admin panel is currently an EVENT count: "Play clicks: 412" is 412 rows in a
 * table, and nothing anywhere can say whether that is 412 people or one person on a flaky
 * connection tapping a button. The same is true of the top of the funnel, which does not exist in
 * our database at all — unique visitors live only inside GA4 and Vercel, so "what fraction of
 * people who saw the page joined the waitlist" cannot be computed from the data we own.
 *
 * A first-party cookie set here fixes both: every server route can stamp the same anonymous id on
 * whatever it writes, and COUNT(DISTINCT visitor_id) becomes a real answer.
 *
 * WHY MIDDLEWARE and not the client: set from JS, the id is minted after the page has already
 * loaded, so the very first pageview — the one that decides whether this visitor bounced — is
 * either unattributed or attributed to a second id. Set on the HTML response, it exists before any
 * of the page's own code runs.
 *
 * WHAT IT IS NOT: not a fingerprint, not a login, not shared with anyone. A random id in a
 * first-party cookie, readable only by this site, holding no personal data. It answers "is this the
 * same browser as before" and nothing else. Cleared by clearing cookies, which will count that
 * person twice — the honest failure mode, and the right one to prefer over anything harder to erase.
 */
const COOKIE = "tvid";
const YEAR = 60 * 60 * 24 * 365;

export function middleware(req) {
  const res = NextResponse.next();

  // /share/<token> is deliberately untracked, for the reason SiteAnalytics documents: the token IS
  // the credential to somebody's private call recording, and this site does not build a visitor
  // record around it. Consistency matters here — an exception is how a privacy promise quietly
  // stops being true.
  if (req.nextUrl.pathname.startsWith("/share/")) return res;

  if (!req.cookies.get(COOKIE)?.value) {
    // crypto.randomUUID is available in the edge runtime. 122 bits of randomness: collisions are
    // not a practical concern, and unlike a hash of IP + user-agent this cannot be reconstructed
    // from data we might hold elsewhere.
    res.cookies.set({
      name: COOKIE,
      value: crypto.randomUUID(),
      httpOnly: true,      // no client-side JS needs it; the server stamps every write itself
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: YEAR,
    });
  }
  return res;
}

/**
 * HTML requests only. Matching everything would mint an id for every image and font request that
 * arrives without a cookie, and would run this on API routes whose responses are not where a
 * Set-Cookie belongs.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4|webm|woff2?)).*)"],
};
