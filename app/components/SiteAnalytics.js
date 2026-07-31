"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";

/**
 * Site analytics, with /share/<token> excluded from both rails.
 *
 * The token in a share URL is not an identifier — it is the CREDENTIAL. apollo spends 256 bits of
 * entropy on it precisely so the space cannot be walked, and then reporting the page URL to
 * analytics would hand a working link to a recording of somebody's private phone call to two
 * third parties, alongside the visitor's IP and user agent, where it sits in dashboards and
 * exports that outlive the link's own expiry. Revoking the link afterwards does not un-send it.
 *
 * Rendering nothing at all on those routes, rather than redacting the URL: a redacted event still
 * tells the vendor that a share was viewed and when, which is more than they need to know.
 *
 * A client component because a server layout cannot read the pathname, and beforeSend alone would
 * not cover the GA script — which reports location.href on load regardless of what we pass it.
 */
export default function SiteAnalytics() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/share/")) return null;

  return (
    <>
      <Analytics />
      {process.env.NEXT_PUBLIC_GA_ID ? (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      ) : null}
    </>
  );
}
