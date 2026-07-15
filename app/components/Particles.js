"use client";

/** Particles — canvas particle field (demos.gsap.com/demo/canvas-particles pattern): soft
 *  coral motes drifting behind the hero, GSAP-ticked, DPR-aware, reduced-motion → none. */
import { useEffect, useRef } from "react";

export default function Particles({ count = 42 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let gsapRef, tick, ro, cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      if (cancelled) return;
      gsapRef = gsap;
      const cv = ref.current, ctx2 = cv.getContext("2d");
      const fit = () => {
        const r = cv.parentElement.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
        cv.width = r.width * d; cv.height = r.height * d; cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
      };
      fit(); ro = new ResizeObserver(fit); ro.observe(cv.parentElement);
      const P = Array.from({ length: count }, () => ({
        x: Math.random(), y: Math.random(), r: 1.2 + Math.random() * 2.6,
        vx: (Math.random() - 0.5) * 0.00045, vy: -0.00025 - Math.random() * 0.00045,
        a: 0.12 + Math.random() * 0.3, ph: Math.random() * Math.PI * 2,
      }));
      tick = () => {
        const w = cv.width, h = cv.height, t = performance.now() / 1000;
        ctx2.clearRect(0, 0, w, h);
        for (const p of P) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
          if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
          const tw = 0.6 + 0.4 * Math.sin(t * 1.4 + p.ph);
          ctx2.beginPath();
          ctx2.arc(p.x * w, p.y * h, p.r * (w / 900), 0, Math.PI * 2);
          ctx2.fillStyle = `rgba(240,71,42,${(p.a * tw).toFixed(3)})`;
          ctx2.fill();
        }
      };
      gsap.ticker.add(tick);
    })();
    return () => { cancelled = true; tick && gsapRef && gsapRef.ticker.remove(tick); ro && ro.disconnect(); };
  }, [count]);
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
