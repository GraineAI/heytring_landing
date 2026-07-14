"use client";

/**
 * Journey — the "TRANSFER TO RING" signature animation (GSAP DrawSVG + MotionPath, both
 * free plugins from the npm package). A call leaves your phone, the route DRAWS itself
 * across the section, and the Ring mascot rides the path and lands with a smile — scroll-
 * scrubbed, so the visitor drives it. Reduced-motion → the finished scene renders statically.
 */
import { useEffect, useRef } from "react";

const PATH = "M60,150 C180,20 320,240 460,110 S700,40 780,150";

export default function Journey() {
  const root = useRef(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ctx;
    let cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { DrawSVGPlugin } = await import("gsap/DrawSVGPlugin");
      const { MotionPathPlugin } = await import("gsap/MotionPathPlugin");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);
      if (reduced) return;   // static finished scene (CSS default) for reduced motion
      ctx = gsap.context(() => {
        gsap.set("#j-route", { drawSVG: "0%" });
        gsap.set("#j-ring", { xPercent: -50, yPercent: -50, transformOrigin: "50% 50%" });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 45%", scrub: 0.6 },
          defaults: { ease: "none" },
        });
        tl.to("#j-route", { drawSVG: "100%" }, 0)
          .to("#j-ring", {
            motionPath: { path: "#j-route", align: "#j-route", alignOrigin: [0.5, 0.5], autoRotate: false },
          }, 0)
          .fromTo("#j-ring", { scale: 0.7 }, { scale: 1, ease: "power1.out" }, 0)
          .from("#j-note", { opacity: 0, y: 14, duration: 0.2 }, 0.85);
      }, root);
    })();
    return () => { cancelled = true; ctx && ctx.revert(); };
  }, []);

  return (
    <section ref={root} aria-label="Tring means transfer to Ring" style={{ padding: "72px 0 56px", overflow: "hidden" }}>
      <div className="wrap" style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: 6 }}>
          Tring = <span className="ring" style={{ color: "var(--coral, #F0472A)" }}>transfer to Ring.</span>
        </h2>
        <p style={{ opacity: 0.75, maxWidth: 560, margin: "0 auto" }}>
          The call leaves your phone, takes the scenic route, and Ring picks it up —
          <b> you keep your time.</b>
        </p>
        <svg viewBox="0 0 840 220" style={{ width: "100%", maxWidth: 840, marginTop: 18 }} role="img">
          {/* your phone */}
          <g transform="translate(38,128)">
            <rect x="0" y="0" width="44" height="76" rx="10" fill="#1B1512" />
            <rect x="6" y="8" width="32" height="54" rx="4" fill="#2A211B" />
            <circle cx="22" cy="68" r="4" fill="#F0472A" />
          </g>
          {/* the route — drawn by DrawSVG */}
          <path id="j-route" d={PATH} fill="none" stroke="#F0472A" strokeWidth="4"
            strokeLinecap="round" strokeDasharray="1 14" opacity="0.9" />
          {/* Ring rides the path (MotionPath) */}
          <g id="j-ring">
            <circle r="26" fill="#F0472A" />
            <circle cx="-8" cy="-4" r="4.6" fill="#fff" />
            <circle cx="8" cy="-4" r="4.6" fill="#fff" />
            <circle cx="-6.8" cy="-3.2" r="2.1" fill="#1B1512" />
            <circle cx="9.2" cy="-3.2" r="2.1" fill="#1B1512" />
            <path d="M-8 8 Q0 15 8 8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
          {/* the handled note */}
          <g id="j-note" transform="translate(760,88)">
            <rect x="-2" y="0" width="66" height="34" rx="9" fill="#E7F6EF" />
            <text x="31" y="22" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0F7A50">Done ✓</text>
          </g>
        </svg>
      </div>
    </section>
  );
}
