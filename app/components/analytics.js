"use client";

/**
 * Conversion tracking — one tiny helper both GA4 and Vercel Analytics hear.
 *
 * GA4 arrives via @next/third-parties' <GoogleAnalytics> in layout.js (gtag on window),
 * activated by NEXT_PUBLIC_GA_ID; Vercel Analytics via <Analytics> (zero config on Vercel).
 * track() is safe to call whether or not either is loaded.
 */
import { track as vercelTrack } from "@vercel/analytics";

export function track(event, params = {}) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, params);
    }
  } catch {}
  try {
    vercelTrack(event, params);
  } catch {}
}
