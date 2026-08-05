import RingGame3D from "../components/RingGame3D";

/**
 * Standalone Tring Squadron — the same game component the homepage uses, with no nav, footer or
 * marketing chrome around it. This exists so the mobile app can embed the game in a WebView:
 * React Native has no <canvas>, so re-implementing 500 lines of game loop in Animated/SVG would
 * be both a big rewrite and much slower with dozens of sprites on screen. Pointing a WebView here
 * keeps ONE implementation of the game — a tweak to the loop ships to the site and the app at
 * once, with no app release.
 *
 * noindex: this is an embed surface, not a page we want competing with the homepage in search.
 */
export const metadata = {
  title: "Tring Squadron",
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#2C1B14",
  width: "device-width",
  initialScale: 1,
  // The game is a fixed play area; letting it pinch-zoom inside a WebView just breaks aim.
  maximumScale: 1,
  userScalable: false,
};

export default function PlayPage() {
  return (
    <main className="playpage">
      <RingGame3D embedded />
    </main>
  );
}
