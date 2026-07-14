"use client";

/**
 * Motion — the landing's GSAP layer (gsap ^3.15 from node_modules, dynamically imported so
 * SSR never sees it). One client component mounted from page.js; the page itself stays
 * server-rendered.
 *
 *  • Hero headline: WORD-BY-WORD rise (split at runtime; markup untouched for SEO).
 *  • Hero sub/CTAs/trust: follow in a stagger; store buttons pop with back.out.
 *  • Mascot/art: slow floating loop (y ±8) after entry.
 *  • Every <section> + [data-reveal]: fade-rise once on scroll (ScrollTrigger).
 *  • Nav: slides down on load.
 *  • Honors prefers-reduced-motion; never hides content by default (animate FROM offsets,
 *    clearProps back to the untouched CSS) — JS off / GSAP failing = the page as-is.
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
      const { SplitText } = await import("gsap/SplitText");   // free since GSAP 3.13 — the real thing
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        // Nav drops in.
        const nav = document.querySelector("nav, header.nav, .nav");
        if (nav) tl.from(nav, { y: -24, opacity: 0, duration: 0.5, clearProps: "all" }, 0);

        // Hero headline — GSAP SplitText (the official plugin, npm package): word-by-word
        // rise with a slight tilt. SEO/static markup is untouched until JS runs, and
        // split.revert() in cleanup restores the original DOM exactly.
        const h1 = document.querySelector(".hero h1");
        if (h1) {
          const split = new SplitText(h1, { type: "words", wordsClass: "w" });
          tl.from(split.words, {
            y: 34, opacity: 0, rotate: 2, duration: 0.7, stagger: 0.05,
            onComplete: () => split.revert(),   // hand the DOM back untouched
          }, 0.1);
        }

        // Sub + trust row rise; store buttons POP.
        tl.from(".hero .hero__sub", { y: 24, opacity: 0, duration: 0.6, clearProps: "all" }, 0.45);
        tl.from(".hero .btn--store", {
          y: 18, opacity: 0, scale: 0.92, duration: 0.55, stagger: 0.1,
          ease: "back.out(1.7)", clearProps: "all",
        }, 0.6);
        tl.from(".hero .hero__trust", { y: 16, opacity: 0, duration: 0.5, clearProps: "all" }, 0.75);

        // Mascot / hero art: gentle perpetual float (starts after entry; no clearProps — it loops).
        document.querySelectorAll(".hero svg, .hero .mascot, .hero [class*='phone']").forEach((el, i) => {
          gsap.to(el, { y: 8, duration: 2.6 + i * 0.3, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 1.2 });
        });

        // Scroll reveals — each section (and anything tagged) rises once into view.
        document.querySelectorAll("main section, [data-reveal]").forEach((el) => {
          gsap.from(el.children.length ? el.children : el, {
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
            y: 34, opacity: 0, duration: 0.7, ease: "power2.out",
            stagger: 0.08, clearProps: "all",
          });
        });
      });
    })();
    return () => { cancelled = true; ctx && ctx.revert(); };
  }, []);
  return null;
}
