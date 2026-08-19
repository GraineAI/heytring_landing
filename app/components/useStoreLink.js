"use client";

import { useEffect, useState } from "react";

/**
 * The right store for the device you are holding, as a real link.
 *
 * Both platforms are now publicly installable — Android through Play open testing, iPhone
 * through a public TestFlight join link — so every CTA on the site goes straight to a store.
 * The invite form it replaces was gating downloads that could be reached anyway: anyone could
 * search Play, and now anyone can open the TestFlight link. A form in front of that bought
 * nothing and cost a step on a funnel that already loses most people before first value.
 *
 * Routed through /go/* rather than linking the stores directly, so the click is still logged
 * with its placement and attribution survives. That log is the only thing tying a visitor to a
 * store tap, and it is what the admin funnel's store-click step counts.
 *
 * Server render assumes Android. It is the majority platform here by roughly 3:1, and the
 * effect corrects it on the client before a tap is plausible — but the fallback matters,
 * because an <a> that renders without an href is dead for anyone whose JS has not run.
 */
export default function useStoreLink(placement = "page") {
  const [os, setOs] = useState("android");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) setOs("ios");
    else if (/android/i.test(ua)) setOs("android");
    // Desktop keeps the Android default: Play's listing is a real web page that reads
    // sensibly on a laptop, whereas a TestFlight join link on desktop is a dead end.
  }, []);

  const isIos = os === "ios";
  return {
    os,
    href: `/go/${isIos ? "ios" : "play"}?p=${encodeURIComponent(placement)}`,
    label: isIos ? "Download beta on iPhone" : "Download beta on Android",
    store: isIos ? "TestFlight" : "Google Play",
  };
}
