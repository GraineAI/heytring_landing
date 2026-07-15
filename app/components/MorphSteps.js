"use client";

/** MorphSteps — the GSAP MorphSVG shapes→glyphs demo, retold as the product story:
 *  three raw shapes morph into the three "How it works" glyphs and back on an
 *  endless yoyo loop — triangle → bell (a call comes in), square → speech bubble
 *  (you watch it live), circle → tick (done, you get the note). convertToPath +
 *  sequential morphs, exactly the pen's structure; pauses offscreen;
 *  reduced-motion → the loop never starts.
 */
import { useEffect, useRef } from "react";

// Morph targets, authored in the same 760×220 space as the start shapes.
const BELL =
  "M160 48c-7 0-12 5-12 12v5c-19 6-31 23-31 44v28l-15 17v6h116v-6l-15-17v-28c0-21-12-38-31-44v-5c0-7-5-12-12-12z";
const BUBBLE =
  "M330 66h100a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14h-53l-27 24v-24h-20a14 14 0 0 1-14-14V80a14 14 0 0 1 14-14z";
const TICK =
  "M553 128l14-14 21 21 45-45 14 14-59 59z";

export default function MorphSteps() {
  const root = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tl, io, cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { MorphSVGPlugin } = await import("gsap/MorphSVGPlugin");
      if (cancelled || !root.current) return;
      gsap.registerPlugin(MorphSVGPlugin);

      const svg = root.current;
      const [tri, sq, circ] = MorphSVGPlugin.convertToPath(
        svg.querySelectorAll("polygon, rect, circle")
      );

      tl = gsap.timeline({
        repeat: -1,
        yoyo: true,
        repeatDelay: 1.1,
        defaults: { ease: "power2.inOut", duration: 0.7 },
        paused: true,
      })
        .to(tri, { morphSVG: BELL })
        .to(sq, { morphSVG: BUBBLE }, "-=0.45")
        .to(circ, { morphSVG: TICK }, "-=0.45");

      io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()));
      io.observe(svg);
    })();
    return () => { cancelled = true; tl && tl.kill(); io && io.disconnect(); };
  }, []);

  return (
    <svg
      ref={root}
      viewBox="0 0 760 220"
      aria-hidden
      style={{ display: "block", maxWidth: 560, margin: "8px auto 40px" }}
    >
      <defs>
        <linearGradient id="ms-g1" x1="110" y1="170" x2="215" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF5C39" />
          <stop offset="1" stopColor="#F0472A" />
        </linearGradient>
        <linearGradient id="ms-g2" x1="316" y1="170" x2="450" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F0472A" />
          <stop offset="1" stopColor="#FF5C39" />
        </linearGradient>
        <radialGradient id="ms-g3" cx="600" cy="110" r="80" gradientUnits="userSpaceOnUse">
          <stop offset="0.15" stopColor="#FF5C39" />
          <stop offset="1" stopColor="#C9351A" />
        </radialGradient>
      </defs>
      <polygon fill="url(#ms-g1)" points="160,58 212,162 108,162" />
      <rect fill="url(#ms-g2)" x="330" y="60" width="100" height="100" rx="2" />
      <circle fill="url(#ms-g3)" cx="600" cy="110" r="52" />
    </svg>
  );
}
