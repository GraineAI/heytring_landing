"use client";

/**
 * Preloader — Swish's "Logo Reveal" with the real brand asset (tile,
 * phone glyph, call waves + wordmark in white on the coral gradient).
 *
 * Rendering strategy, bulletproof across Safari / Chrome / Brave / old
 * WebViews:
 *   1. The overlay is SERVER-rendered and animated by pure CSS keyframes
 *      (globals.css) — branded first paint, works before hydration.
 *   2. After hydration this component checks whether those CSS animations
 *      actually started (some browsers/extensions/shields block them).
 *      If not, it replays the identical choreography with GSAP.
 *   3. A hard failsafe removes the overlay at 2.6s NO MATTER WHAT, so it
 *      can neither be skipped silently nor get stuck covering the page.
 * prefers-reduced-motion hides it immediately.
 */
import { useEffect } from "react";

function Lockup() {
  return (
    <span className="loader__wm" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        {/* the tile, as a white outline */}
        <rect x="2" y="2" width="60" height="60" rx="15" stroke="#fff" strokeWidth="3.5" />
        {/* phone glyph — exact path from app/icon.svg */}
        <g stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 17 L27 18 L29.5 26 L25 29 A22 22 0 0 0 35 39 L38 34.5 L46 37 L47 41 C47 43.5 45 45.5 42.5 45.5 A31 31 0 0 1 18.5 21.5 C18.5 19 20.5 17 23 17 Z" />
        </g>
        {/* call waves — exact paths from app/icon.svg */}
        <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.9">
          <path d="M44 20 a10 10 0 0 1 0 12" />
          <path d="M48 16 a16 16 0 0 1 0 20" />
        </g>
      </svg>
      <span>Tring</span>
    </span>
  );
}

export default function Preloader() {
  useEffect(() => {
    const el = document.querySelector(".loader");
    if (!el) return;

    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      el.style.display = "none";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hide();
      return;
    }

    // Did the CSS keyframes actually start? (Brave shields, extensions and
    // some builds block or drop them.) Checked one frame after hydration.
    const raf = requestAnimationFrame(() => {
      let cssRunning = false;
      try {
        cssRunning = el.getAnimations({ subtree: true }).length > 0;
      } catch (_) {
        /* getAnimations unsupported → assume not running, JS takes over */
      }
      if (!cssRunning && !hidden) {
        (async () => {
          try {
            const gsap = (await import("gsap")).default;
            if (hidden) return;
            gsap.timeline({ onComplete: hide })
              .to(".loader__fill", {
                clipPath: "inset(0% 0% 0% 0%)",
                webkitClipPath: "inset(0% 0% 0% 0%)",
                duration: 1, ease: "power2.inOut",
              }, 0.05)
              .to(".loader__bg", { autoAlpha: 0, duration: 0.5 }, 1.05)
              .to(".loader__inner", { y: "-120vh", duration: 1, ease: "power2.inOut" }, 1.05);
          } catch (_) {
            hide();   // even GSAP failed — just get out of the way
          }
        })();
      }
    });

    // The failsafe: whatever happened above, the overlay is gone by 2.6s.
    const t = setTimeout(hide, 2600);

    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="loader" role="status" aria-label="Tring is loading">
      <div className="loader__bg" />
      <div className="loader__inner">
        <div className="loader__mark">
          <div className="loader__ghost"><Lockup /></div>
          <div className="loader__fill"><Lockup /></div>
        </div>
      </div>
    </div>
  );
}
