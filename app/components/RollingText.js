"use client";

/**
 * RollingText — the GSAP rolling-text pattern (demos.gsap.com/demo/rolling-text): phrases
 * roll vertically through a mask in an endless loop. The brand line completes itself:
 * "Don't pick up. Don't dial." + [ Tring. / Transfer to Ring. / Free your time. ]
 */
import { useEffect, useRef } from "react";

const WORDS = ["Tring.", "Transfer to Ring.", "Free your time."];

export default function RollingText() {
  const root = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx; let cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      if (cancelled) return;
      ctx = gsap.context(() => {
        const rows = gsap.utils.toArray(".roll-item");
        const H = rows[0].offsetHeight;
        const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power2.inOut", duration: 0.55 } });
        rows.forEach((_, i) => {
          tl.to(".roll-track", { y: -H * (i + 1) }, "+=1.6");
        });
        // rows has a clone of the first word at the end → snap back seamlessly
        tl.set(".roll-track", { y: 0 });
      }, root);
    })();
    return () => { cancelled = true; ctx && ctx.revert(); };
  }, []);
  return (
    <section ref={root} aria-label="Don't pick up, don't dial — Tring" style={{ padding: "36px 0 8px" }}>
      <div className="wrap" style={{ textAlign: "center", fontWeight: 800, letterSpacing: "-0.02em", fontSize: "clamp(22px, 4.4vw, 40px)" }}>
        <span>Don&rsquo;t pick up. Don&rsquo;t dial.&nbsp;</span>
        <span style={{ display: "inline-block", height: "1.25em", overflow: "hidden", verticalAlign: "bottom" }}>
          <span className="roll-track" style={{ display: "inline-block" }}>
            {[...WORDS, WORDS[0]].map((w, i) => (
              <span key={i} className="roll-item" style={{ display: "block", height: "1.25em", color: "var(--coral, #F0472A)" }}>{w}</span>
            ))}
          </span>
        </span>
      </div>
    </section>
  );
}
