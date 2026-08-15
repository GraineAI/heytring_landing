/**
 * Reading the anonymous visitor id that middleware.js sets.
 *
 * Returns null rather than inventing one. A request with no cookie is a bot, a cookie-blocking
 * browser, or the very first hit of a session that middleware did not run on — and writing a fresh
 * random id per row for those would be worse than writing nothing: it would inflate
 * COUNT(DISTINCT visitor_id) with one "unique visitor" per event, which is precisely the number
 * this whole mechanism exists to make trustworthy. A null is a row we know we cannot attribute.
 */
export const VISITOR_COOKIE = "tvid";

export function visitorId(req) {
  try {
    const v = req.cookies?.get?.(VISITOR_COOKIE)?.value;
    return typeof v === "string" && v.length >= 16 ? v.slice(0, 64) : null;
  } catch {
    return null;
  }
}
