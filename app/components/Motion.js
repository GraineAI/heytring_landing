"use client";

/**
 * Motion — the page's GSAP layer. One client component mounted once (in page.js);
 * everything else stays a server component.
 *
 *  • Hero: children rise in a calm stagger on load.
 *  • Every <section> (and anything tagged [data-reveal]): fade-rise once on scroll into view.
 *  • Honors prefers-reduced-motion and never hides content by default — if GSAP fails to
 *    load or JS is off, the page renders exactly as before (we only animate FROM offsets,
 *    with clearProps so the final state is the untouched CSS).
 */
import { useEffect } from "react";

export default function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx;
    let cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        // Hero intro — title, sub, CTAs, trust row rise together.
        const hero = document.querySelector(".hero .wrap");
        if (hero) {
          gsap.from(hero.children, {
            y: 28, opacity: 0, duration: 0.75, ease: "power2.out",
            stagger: 0.11, clearProps: "all",
          });
        }
        // Scroll reveals — every main section after the hero, once each.
        document.querySelectorAll("main section, [data-reveal]").forEach((el) => {
          gsap.from(el.children.length ? el.children : el, {
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
            y: 30, opacity: 0, duration: 0.65, ease: "power2.out",
            stagger: 0.08, clearProps: "all",
          });
        });
      });
    })();
    return () => { cancelled = true; ctx && ctx.revert(); };
  }, []);
  return null;
}
