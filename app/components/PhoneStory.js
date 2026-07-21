"use client";

/**
 * PhoneStory — Equal AI's signature move rebuilt for Tring (DESIGN.md §3):
 * a full-bleed coral section where a phone plays a self-running ~8s story.
 * Like Equal's Lottie it plays once when the section enters the viewport
 * (then reruns after a rest) — it is NOT scroll-scrubbed:
 *   1. Incoming call — "Blinkit · Ramesh 🛵", phone buzzes
 *   2. Ring picks up — mascot + sonar rings, "answered in your voice"
 *   3. Live card rises — caller line + quick-reply chips, one taps itself
 *   4. Wrap-up note — "Left at the gate. Nothing needs you."
 * No JS / reduced motion: scenes 2 + 4 render as a finished still (CSS).
 */
import { useEffect, useRef } from "react";
import { Ring } from "./Mascot";
import StoreButtons from "./StoreButtons";
import { Check, Phone } from "./Icons";

export default function PhoneStory() {
  const root = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx, cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          paused: true,
          repeat: -1,
          repeatDelay: 5,
          defaults: { ease: "power3.out", duration: 0.5 },
        });

        // reset every iteration
        tl.set(".ps-s2, .ps-s3, .ps-s4", { autoAlpha: 0 })
          .set(".ps-s1", { autoAlpha: 0 })
          .set(".ps-chip--tap", { clearProps: "all" })

          // scene 1 — incoming call
          .fromTo(".ps-s1", { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0 }, 0.1)
          .fromTo(".ps-s1 .av", { scale: 0.7 }, { scale: 1, ease: "back.out(2)" }, 0.15)
          .to(".ps-phone", { x: 2, duration: 0.06, repeat: 9, yoyo: true, ease: "none" }, 0.35)
          .set(".ps-phone", { x: 0 })
          .to(".ps-btns .c--yes", { scale: 1.14, duration: 0.3, repeat: 3, yoyo: true }, 0.5)

          // scene 2 — Ring picks up
          .to(".ps-s1", { autoAlpha: 0, y: -10, duration: 0.35 }, 2.0)
          .fromTo(".ps-s2", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 2.25)
          .fromTo(".ps-s2 .ps-halo", { scale: 0.6 }, { scale: 1, ease: "back.out(1.8)" }, 2.25)

          // scene 3 — live card + chips (rises over the mascot)
          .fromTo(".ps-s3", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 3.7)
          .fromTo(".ps-card", { y: 46 }, { y: 0 }, 3.7)
          .fromTo(".ps-chips .ps-chip", { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.09, duration: 0.35 }, 4.1)
          .to(".ps-chip--tap", { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1 }, 5.0)
          .to(".ps-chip--tap", {
            backgroundColor: "#F0472A", borderColor: "#F0472A", color: "#fff", duration: 0.18,
          }, 5.15)
          .fromTo(".ps-bub--me", { autoAlpha: 0, y: 8, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, ease: "back.out(1.6)" }, 5.5)

          // scene 4 — the note
          .to(".ps-s3, .ps-s2", { autoAlpha: 0, y: -8, duration: 0.35 }, 7.0)
          .set(".ps-s3, .ps-s2", { y: 0 })
          .fromTo(".ps-s4", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 7.35)
          .fromTo(".ps-note", { scale: 0.92, y: 12 }, { scale: 1, y: 0, ease: "back.out(1.7)" }, 7.35)
          .fromTo(".ps-s4 .saved", { autoAlpha: 0 }, { autoAlpha: 1 }, 7.7)
          .to({}, { duration: 1.2 });   // hold the note before the rest

        ScrollTrigger.create({
          trigger: root.current,
          start: "top 70%",
          once: true,
          onEnter: () => tl.play(0),
        });
      }, root);
    })();
    return () => { cancelled = true; ctx && ctx.revert(); };
  }, []);

  return (
    <section className="ps" id="story" ref={root}>
      <div className="ps__in">
        <div>
          <span className="eyebrow">Tring = transfer to Ring</span>
          <h2>Ring answers your unknown calls.</h2>
          <p className="ps__sub">
            A call you don&rsquo;t pick up reaches Ring. It talks to the caller{" "}
            <b>in their language</b>, sorts out what they need, and leaves you a
            note. Spam never rings twice.
          </p>
          <div className="ps__cta">
            <StoreButtons onDark placement="story" />
          </div>
          <p className="ps__foot">Live transcript while it talks · one tap to take over</p>
        </div>

        <div className="ps__stage" aria-hidden="true">
          <div className="ps-phone">
            <span className="ps-notch" />
            <div className="ps-screen">
              <div className="ps-top">
                <span className="k">Tring</span>
                <span className="ps-live"><span className="d" /> LIVE</span>
              </div>

              {/* scene 1 — incoming call */}
              <div className="ps-scene ps-s1">
                <span className="av">🛵</span>
                <b>Blinkit · Ramesh</b>
                <small>+91 98••• ••455</small>
                <span className="st">Incoming call…</span>
                <div className="ps-btns">
                  <span className="c c--no">✕</span>
                  <span className="c c--yes"><Phone width={22} height={22} /></span>
                </div>
              </div>

              {/* scene 2 — Ring picks up */}
              <div className="ps-scene ps-s2">
                <span className="ps-halo">
                  <span className="h" /><span className="h" /><span className="h" />
                  <Ring size={92} state="talking" />
                </span>
                <b>Ring answered</b>
                <small>in your voice, in Hindi</small>
              </div>

              {/* scene 3 — live conversation with quick-reply chips */}
              <div className="ps-scene ps-s3">
                <div className="ps-card">
                  <div className="ps-bub">&ldquo;Sir, flat kaunsa? Gate code?&rdquo;</div>
                  <div className="ps-chips">
                    <span className="ps-chip ps-chip--tap">Leave it at the gate</span>
                    <span className="ps-chip">Give it to the watchman</span>
                    <span className="ps-chip">I&rsquo;m coming down</span>
                  </div>
                  <div className="ps-bub ps-bub--me">Gate 4321 — leave it at the gate, bhaiya.</div>
                </div>
              </div>

              {/* scene 4 — the wrap-up note */}
              <div className="ps-scene ps-s4">
                <div className="ps-note">
                  <span className="tick"><Check style={{ color: "#fff" }} /></span>
                  <span>
                    <b>Delivery · Blinkit</b>
                    <small>Left at the gate. Nothing needs you.</small>
                  </span>
                </div>
                <span className="saved">Saved to your call history</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
