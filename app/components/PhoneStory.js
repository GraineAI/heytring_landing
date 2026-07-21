"use client";

/**
 * PhoneStory — Equal AI's signature move, played on the REAL app's screens
 * (matched to the Tring app prototype): a full-bleed coral section where a
 * phone plays a self-running ~9s story. Plays once when the section enters
 * the viewport (then reruns after a rest) — it is NOT scroll-scrubbed:
 *   1. Incoming call — "Blinkit · Ramesh 🛵", phone buzzes
 *   2. Ring picks up — mascot + sonar rings, "answered in your voice"
 *   3. The app's dark live-call screen — live transcript, and a
 *      tap-to-steer chip sends "Leave it with the security guard."
 *   4. The home-feed wrap-up card — "Left with security · Done"
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
          .set(".ps-m--steer", { autoAlpha: 0 })

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

          // scene 3 — the app's live-call screen slides up over it
          .to(".ps-s2", { autoAlpha: 0, duration: 0.3 }, 3.7)
          .fromTo(".ps-s3", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 3.85)
          .fromTo(".ps-dark", { y: 60 }, { y: 0 }, 3.85)
          .fromTo(".ps-m--ring, .ps-m--caller", { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.35, duration: 0.4 }, 4.2)
          .fromTo(".ps-steer", { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1 }, 5.1)
          .to(".ps-chip--tap", { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 }, 5.9)
          .to(".ps-chip--tap", { opacity: 0.4, duration: 0.2 }, 6.15)
          .fromTo(".ps-m--steer", { autoAlpha: 0, y: 8, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, ease: "back.out(1.6)" }, 6.3)

          // scene 4 — the wrap-up card in the home feed
          .to(".ps-s3", { autoAlpha: 0, y: -8, duration: 0.35 }, 7.9)
          .set(".ps-s3", { y: 0 })
          .fromTo(".ps-s4", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 8.25)
          .fromTo(".ps-note", { scale: 0.92, y: 12 }, { scale: 1, y: 0, ease: "back.out(1.7)" }, 8.25)
          .fromTo(".ps-s4 .saved", { autoAlpha: 0 }, { autoAlpha: 1 }, 8.6)
          .to({}, { duration: 1.2 });   // hold the card before the rest

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
            <b>in their language</b>, you steer it live with one tap, and all
            you get is the note. Spam never rings twice.
          </p>
          <div className="ps__cta">
            <StoreButtons onDark placement="story" />
          </div>
          <p className="ps__foot">Live transcript while it talks · take over anytime</p>
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

              {/* scene 3 — the app's live-call screen with steer chips */}
              <div className="ps-scene ps-s3">
                <div className="ps-dark">
                  <div className="ps-dk-head"><span className="d" /><b>ON A CALL · 0:12</b></div>
                  <div className="ps-msgs">
                    <div className="ps-m ps-m--ring">
                      <small>RING</small>
                      <p>Namaste! Rishabh is busy right now — I&rsquo;m his assistant.</p>
                    </div>
                    <div className="ps-m ps-m--caller">
                      <small>CALLER</small>
                      <p>Where should I leave the parcel?</p>
                    </div>
                    <div className="ps-m ps-m--steer">
                      <small>YOU TOLD RING</small>
                      <p>Leave it with the security guard.</p>
                    </div>
                  </div>
                  <div className="ps-steer">
                    <small>TELL RING WHAT TO SAY — TAP TO SEND</small>
                    <div className="ps-chips">
                      <span className="ps-chip ps-chip--tap"><span className="send">➤</span> Leave it with the security guard.</span>
                      <span className="ps-chip"><span className="send">➤</span> I&rsquo;ll call you back in 5 minutes.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* scene 4 — the wrap-up card in the home feed */}
              <div className="ps-scene ps-s4">
                <div className="ps-note">
                  <span className="tick"><Check /></span>
                  <span>
                    <b>Delivery · Blinkit</b>
                    <small>Left your parcel with security.</small>
                  </span>
                  <span className="pill">Done</span>
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
