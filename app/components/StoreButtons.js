"use client";

import { useEffect, useState } from "react";
import { Apple, Play } from "./Icons";

/** Store buttons. OS-aware — phones see only their own platform, desktop sees both.
 *
 *  Both are direct downloads now. Android has been open testing for a while; iPhone is a
 *  public TestFlight join link, which needs no invite and no email. Nothing here opens a
 *  form any more — a form in front of a download anyone can reach costs a step and buys
 *  nothing. Still routed through /go/* so the click is logged and attribution survives. */
export default function StoreButtons({ onDark = false, placement = "page" }) {
  const [os, setOs] = useState("desktop");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setOs("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setOs("ios");
  }, []);

  const cls = `btn btn--store${onDark ? " btn--onDark" : ""}`;
  // Both platforms now do the same thing — install the beta — so both say so.
  return (
    <div className="cta-row">
      {/* Android is open testing — a real link, not a modal. Routed through
          /go/play so the click is still logged and attribution survives. */}
      {os !== "ios" && (
        <a className={cls} href={`/go/play?p=${encodeURIComponent(placement)}`}
          aria-label="Download Tring for Android on Google Play">
          <Play />
          <span className="store-k">
            <small>OPEN BETA · GET IT ON</small>
            <span>Google Play</span>
          </span>
        </a>
      )}
      {/* iPhone is a public TestFlight link — no invite, no email, no modal. */}
      {os !== "android" && (
        <a className={cls} href={`/go/ios?p=${encodeURIComponent(placement)}`}
          aria-label="Download the Tring beta for iPhone on TestFlight">
          <Apple />
          <span className="store-k">
            <small>DOWNLOAD BETA ON</small>
            <span>iPhone</span>
          </span>
        </a>
      )}
    </div>
  );
}
