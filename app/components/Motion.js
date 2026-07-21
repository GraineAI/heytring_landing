"use client";

/**
 * Motion — the page's GSAP layer (gsap ^3.15, patterns per the official
 * greensock/gsap-skills and the GSAP cheat sheet).
 *
 * Scrolling itself is NATIVE, exactly like justswish.in: no smoothing
 * layer, no parallax, nothing scrubbed to scroll position. The page
 * scrolls crisp and fast; elements simply appear once as they enter —
 * fade + 20px rise on Swish's ease. In-page anchors use the browser's
 * own smooth scroll (CSS scroll-behavior + scroll-padding-top).
 *
 *  • Hero entrance — SplitText word-by-word rise, time-synced to the CSS
 *    loader curtain (which stays CSS-driven so it runs at first paint).
 *  • gsap.registerEffect("rise") — the one scroll vocabulary, reused for
 *    every .reveal (ScrollTrigger, once).
 *  • Section h2s — SplitText masked lines; eyebrows — ScrambleText.
 *  • gsap.matchMedia() — fine pointers only: gsap.quickTo() magnetic CTAs.
 *  • Footer wordmark — SplitText chars rise letter by letter.
 *
 * Everything animates FROM offsets with clearProps/revert, so JS off or
 * GSAP failing = the page exactly as authored. Reduced motion = nothing runs.
 */
import { useEffect } from "react";

export default function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx, mm, cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { SplitText } = await import("gsap/SplitText");
      const { CustomEase } = await import("gsap/CustomEase");
      const { ScrambleTextPlugin } = await import("gsap/ScrambleTextPlugin");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, ScrambleTextPlugin);
      if (!CustomEase.get("swish")) CustomEase.create("swish", "0.12, 0.23, 0.19, 1");

      // The reveal vocabulary as a reusable named effect (cheat-sheet pattern).
      if (!gsap.effects.rise) {
        gsap.registerEffect({
          name: "rise",
          effect: (targets, config) =>
            gsap.from(targets, {
              y: 20, autoAlpha: 0, duration: 0.5, ease: "swish",
              clearProps: "all", ...config,
            }),
        });
      }

      ctx = gsap.context(() => {
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

        // The one scroll vocabulary — Swish's exact move (opacity 0 +
        // translateY(20px) → 0 as each block enters the viewport, once) —
        // applied to EVERY content block, like justswish.in does.
        gsap.utils.toArray(
          ".reveal, .ps__in > div, .voice__in > div, .qa, .newspill, .footer__top > div"
        ).forEach((el) => {
          gsap.effects.rise(el, {
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
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

        // Eyebrow labels decode themselves (ScrambleText, uppercase chars).
        gsap.utils.toArray(".eyebrow").forEach((el) => {
          const text = el.textContent;
          gsap.to(el, {
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
            duration: 0.9,
            scrambleText: { text, chars: "upperCase", speed: 0.4 },
          });
        });

        // Footer sign-off: the giant "Tring" rises letter by letter.
        const giant = document.querySelector(".footer__giant");
        if (giant) {
          const chars = new SplitText(giant, { type: "chars" });
          gsap.from(chars.chars, {
            scrollTrigger: { trigger: giant, start: "top 98%", once: true },
            yPercent: 55, autoAlpha: 0, stagger: 0.06, duration: 0.7, ease: "swish",
          });
        }

        // Fine pointers only (gsap.matchMedia, per the docs).
        mm = gsap.matchMedia();
        mm.add("(min-width: 768px) and (pointer: fine)", () => {
          // Magnetic CTAs — gsap.quickTo (the cheat sheet's own example),
          // pills lean a few px toward the cursor and glide back on leave.
          const teardowns = [];
          document.querySelectorAll(".btn--coral, .btn--store, .vid__pill, .hero__ctl").forEach((el) => {
            const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
            const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
            const move = (e) => {
              const r = el.getBoundingClientRect();
              xTo(gsap.utils.clamp(-7, 7, (e.clientX - (r.left + r.width / 2)) * 0.22));
              yTo(gsap.utils.clamp(-5, 5, (e.clientY - (r.top + r.height / 2)) * 0.3));
            };
            const leave = () => { xTo(0); yTo(0); };
            el.addEventListener("mousemove", move);
            el.addEventListener("mouseleave", leave);
            teardowns.push(() => {
              el.removeEventListener("mousemove", move);
              el.removeEventListener("mouseleave", leave);
            });
          });
          return () => teardowns.forEach((fn) => fn());
        });
      });
    })();
    return () => {
      cancelled = true;
      mm && mm.revert();
      ctx && ctx.revert();
    };
  }, []);
  return null;
}
