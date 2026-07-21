"use client";

/**
 * Motion — the page's GSAP layer (gsap ^3.15, all plugins free since the
 * Webflow acquisition; patterns per the official greensock/gsap-skills).
 *
 *  • ScrollSmoother — silky momentum scroll on #smooth-wrapper/#smooth-content
 *    (Preloader + Nav are position:fixed OUTSIDE the wrapper, per docs).
 *  • Hero entrance — SplitText word-by-word rise, time-synced to the CSS
 *    loader curtain (which stays CSS-driven so it runs at first paint,
 *    before any JS — same choreography Swish builds in GSAP).
 *  • .reveal elements — fade + 20px rise once on ScrollTrigger, on the
 *    "swish" CustomEase — the page's one scroll vocabulary.
 *  • Story phone — slow scrub parallax as the coral section passes.
 *  • Footer wordmark — SplitText chars rise letter by letter.
 *
 * Everything animates FROM offsets with clearProps/revert, so JS off or
 * GSAP failing = the page exactly as authored. Reduced motion = nothing runs.
 */
import { useEffect } from "react";

export default function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx, cancelled = false, onAnchorClick = null;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { ScrollSmoother } = await import("gsap/ScrollSmoother");
      const { SplitText } = await import("gsap/SplitText");
      const { CustomEase } = await import("gsap/CustomEase");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, CustomEase);
      if (!CustomEase.get("swish")) CustomEase.create("swish", "0.12, 0.23, 0.19, 1");

      ctx = gsap.context(() => {
        const smoother = ScrollSmoother.create({
          wrapper: "#smooth-wrapper",
          content: "#smooth-content",
          smooth: 0.9,
          effects: false,
        });

        // In-page anchors must go through the smoother — a native hash jump
        // fights the transformed wrapper and strands the viewport (GSAP docs).
        onAnchorClick = (e) => {
          const a = e.target.closest('a[href^="#"]');
          if (!a) return;
          const href = a.getAttribute("href");
          const target = href === "#top" ? 0 : document.querySelector(href);
          if (target === null) return;
          e.preventDefault();
          smoother.scrollTo(target, true, "top 96px");
        };
        document.addEventListener("click", onAnchorClick);

        // Hero entrance, synced to the loader: the curtain starts lifting at
        // 1.05s after first paint; words rise as the hero is unveiled. If JS
        // arrived late (loader already gone, content already seen), skip —
        // never hide what the visitor has read.
        if (performance.now() < 1900) {
          const curtain = Math.max(0, 1.15 - performance.now() / 1000);
          const h1 = document.querySelector(".hero h1");
          if (h1) {
            const split = new SplitText(h1, { type: "words" });
            gsap.from(split.words, {
              y: 42, autoAlpha: 0, rotate: 2,
              duration: 0.8, stagger: 0.06, ease: "swish",
              delay: curtain,
              onComplete: () => split.revert(),   // hand the DOM back untouched
            });
          }
          gsap.from(".hero__sub, .hero__cta, .hero__trust", {
            y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.12,
            ease: "swish", delay: curtain + 0.35, clearProps: "all",
          });
        }

        // The one scroll vocabulary: fade + 20px rise, once.
        gsap.utils.toArray(".reveal").forEach((el) => {
          gsap.from(el, {
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
            y: 20, autoAlpha: 0, duration: 0.5, ease: "swish",
            clearProps: "all",
          });
        });

        // Section headings: SplitText masked lines rising out of their own
        // clip — the premium text move on gsap.com and its showcases.
        gsap.utils.toArray(".head h2, .ps h2, .voice h2, .final h2").forEach((h) => {
          const split = new SplitText(h, { type: "lines", mask: "lines" });
          gsap.from(split.lines, {
            scrollTrigger: { trigger: h, start: "top 86%", once: true },
            yPercent: 115, duration: 0.85, stagger: 0.1, ease: "swish",
            onComplete: () => split.revert(),
          });
        });

        // Story phone drifts against the coral section (scrub parallax).
        gsap.fromTo(".ps-phone",
          { y: 44 },
          {
            y: -44, ease: "none",
            scrollTrigger: { trigger: ".ps", start: "top bottom", end: "bottom top", scrub: true },
          }
        );

        // Footer sign-off: the giant "Tring" rises letter by letter.
        const giant = document.querySelector(".footer__giant");
        if (giant) {
          const chars = new SplitText(giant, { type: "chars" });
          gsap.from(chars.chars, {
            scrollTrigger: { trigger: giant, start: "top 98%", once: true },
            yPercent: 55, autoAlpha: 0, stagger: 0.06, duration: 0.7, ease: "swish",
          });
        }
      });
    })();
    return () => {
      cancelled = true;
      onAnchorClick && document.removeEventListener("click", onAnchorClick);
      ctx && ctx.revert();
    };
  }, []);
  return null;
}
