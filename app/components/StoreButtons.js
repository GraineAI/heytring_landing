"use client";

import { Apple, Play } from "./Icons";
import { track } from "./analytics";

// Replace these with your real store URLs once listings are live.
export const PLAY_URL = "https://play.google.com/store/apps/details?id=com.heytring.app";
export const APP_STORE_URL = "https://apps.apple.com/app/tring/id000000000";

export default function StoreButtons({ onDark = false, placement = "page" }) {
  const cls = `btn btn--store${onDark ? " btn--onDark" : ""}`;
  return (
    <div className="cta-row">
      <a className={cls} href={PLAY_URL} aria-label="Get Tring on Google Play"
        onClick={() => track("store_click", { store: "google_play", placement })}>
        <Play />
        <span className="store-k">
          <small>GET IT ON</small>
          <span>Google Play</span>
        </span>
      </a>
      <a className={cls} href={APP_STORE_URL} aria-label="Download Tring on the App Store"
        onClick={() => track("store_click", { store: "app_store", placement })}>
        <Apple />
        <span className="store-k">
          <small>DOWNLOAD ON THE</small>
          <span>App Store</span>
        </span>
      </a>
    </div>
  );
}
