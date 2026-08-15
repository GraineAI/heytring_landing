"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * VisitBeacon — tells /api/visit that a real browser rendered this page.
 *
 * ONE FIRE PER PATH PER TAB, guarded in sessionStorage. The server deduplicates too (a unique index
 * on visitor+path+day), so this guard is not what makes the count correct — it is what stops us
 * sending a request per render on a page with as much motion as the landing page has.
 *
 * Deliberately fire-and-forget and deliberately silent: nothing here may delay hydration, block
 * paint, or surface an error. A visit that goes unrecorded costs a row; a visit that throws costs
 * the page.
 */
export default function VisitBeacon() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    // Same exclusion as SiteAnalytics and middleware: no record is built around a share token.
    if (pathname.startsWith("/share/")) return;
    const mark = `tv:${pathname}`;
    try {
      if (sessionStorage.getItem(mark)) return;
      sessionStorage.setItem(mark, "1");
    } catch {
      // Private mode / storage disabled — send anyway. The server's unique index still collapses
      // repeats, so the worst case is a few redundant requests, not a wrong number.
    }

    // The UTM parameters belong on the VISIT, not only on the waitlist row: attribution answers
    // "which campaign brought people", and a campaign that brings visitors who never sign up is
    // invisible if the only place a source is ever stored is the signup form.
    let utm = null;
    try {
      const p = new URLSearchParams(window.location.search);
      const entries = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
        const v = p.get(k);
        if (v) entries[k] = v.slice(0, 100);
      }
      if (Object.keys(entries).length) utm = entries;
    } catch {}

    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, utm }),
      keepalive: true,   // survives the user navigating away in the same tick
    }).catch(() => {});
  }, [pathname]);

  return null;
}
