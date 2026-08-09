"use client";

/**
 * Preloader — Swish's "Logo Reveal": the lockup wipes in left-to-right on a
 * full-bleed coral wash, then the whole thing slides up out of the way.
 *
 * The tile is inverted here — white square, coral `t` — because the real mark
 * is a coral tile, and a coral tile on a coral wash is not a mark, it is a
 * hole. Same drawing, same paths as app/icon.svg, polarity flipped.
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
      <svg viewBox="0 0 64 64">
        <rect width="64" height="64" rx="18" fill="#fff" />
        {/* the same `t` as app/icon.svg, knocked out in coral. Literal hex
            rather than var(--coral): CSS variables in an SVG presentation
            attribute are not reliably supported, and this must paint on the
            very first frame, before any stylesheet has had a say. */}
        <g fill="#F4532E">
          <path d="M15 25h34v8.5H15z" />
          <path d="M26.5 12h10.5v26.5c0 4 2.9 6.4 6.9 6.1l1.2 8.3c-10.9 1.2-19-5.3-19-14.4V12z" />
        </g>
      </svg>
      <span className="loader__word">tring</span>
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
