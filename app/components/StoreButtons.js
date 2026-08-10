"use client";

import { useEffect, useState } from "react";
import { Apple, Play } from "./Icons";

/** Beta-invite buttons (closed testing): they open the BetaModal with the
 *  right device preselected. OS-aware — phones see only their platform.
 *  Real store listings live behind the /go/* tracking links, offered in
 *  the modal for people who already hold an invite. */
export default function StoreButtons({ onDark = false, placement = "page" }) {
  const [os, setOs] = useState("desktop");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setOs("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setOs("ios");
  }, []);

  const cls = `btn btn--store${onDark ? " btn--onDark" : ""}`;
  // Each button says what pressing it actually does, and the two platforms no
  // longer do the same thing: Android installs immediately from open testing,
  // iPhone still requests a TestFlight invite. Labelling both "Get the app"
  // would be a small lie to half the visitors.
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
      {os !== "android" && (
        <button className={cls} data-beta="ios" data-beta-placement={placement}
          aria-label="Get a Tring beta invite for iPhone">
          <Apple />
          <span className="store-k">
            <small>REQUEST AN INVITE</small>
            <span>iPhone</span>
          </span>
        </button>
      )}
    </div>
  );
}
