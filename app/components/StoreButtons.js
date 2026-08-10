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
  // "CLOSED BETA" was chrome — it said nothing a visitor could act on. "REQUEST
  // AN INVITE" is what actually happens when you press it, and a button that
  // describes its own outcome is the cheapest conversion fix there is.
  return (
    <div className="cta-row">
      {os !== "ios" && (
        <button className={cls} data-beta="android" data-beta-placement={placement}
          aria-label="Get a Tring beta invite for Android">
          <Play />
          <span className="store-k">
            <small>REQUEST AN INVITE</small>
            <span>Android</span>
          </span>
        </button>
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
