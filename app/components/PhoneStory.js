"use client";

/**
 * PhoneStory — the product story on the app's REAL dark-mode screens,
 * per the annotated review: "your own voice" badge on top, a smaller
 * headline with the feature list, and a phone that is never static —
 * the ~9s GSAP timeline loops with only a 1s rest, and every scene has
 * live micro-motion (pulsing avatar, sonar halos, eq bars, blinking dots).
 */
import { useEffect, useRef } from "react";
import { Ring } from "./Mascot";
import { Check, Phone } from "./Icons";

const FEATS = [
  "Live transcript",
  "Steer with a tap",
  "Take over anytime",
  "Spam blocked",
  "Speaks their language",
  "Wrap-up notes",
];

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
          repeatDelay: 1,
          defaults: { ease: "power3.out", duration: 0.45 },
        });

        tl.set(".ps-s2, .ps-s3, .ps-s4", { autoAlpha: 0 })
          .set(".ps-s1", { autoAlpha: 0 })
          .set(".ps-chip--tap", { clearProps: "all" })
          .set(".ps-m--steer", { autoAlpha: 0 })

          // 1 — incoming call
          .fromTo(".ps-s1", { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0 }, 0.1)
          .fromTo(".ps-s1 .av", { scale: 0.7 }, { scale: 1, ease: "back.out(2)" }, 0.15)
          .to(".ps-phone", { x: 2, duration: 0.06, repeat: 9, yoyo: true, ease: "none" }, 0.3)
          .set(".ps-phone", { x: 0 })

          // 2 — Ring picks up
          .to(".ps-s1", { autoAlpha: 0, y: -10, duration: 0.3 }, 1.7)
          .fromTo(".ps-s2", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 1.9)
          .fromTo(".ps-s2 .ps-halo", { scale: 0.6 }, { scale: 1, ease: "back.out(1.8)" }, 1.9)

          // 3 — the live-call screen
          .to(".ps-s2", { autoAlpha: 0, duration: 0.25 }, 3.2)
          .fromTo(".ps-s3", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 3.35)
          .fromTo(".ps-dark", { y: 60 }, { y: 0 }, 3.35)
          .fromTo(".ps-m--ring, .ps-m--caller", { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.3, duration: 0.35 }, 3.6)
          .fromTo(".ps-steer", { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1 }, 4.35)
          .to(".ps-chip--tap", { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 }, 5.0)
          .to(".ps-chip--tap", { opacity: 0.4, duration: 0.2 }, 5.25)
          .fromTo(".ps-m--steer", { autoAlpha: 0, y: 8, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, ease: "back.out(1.6)" }, 5.4)

          // 4 — the wrap-up card
          .to(".ps-s3", { autoAlpha: 0, y: -8, duration: 0.3 }, 6.9)
          .set(".ps-s3", { y: 0 })
          .fromTo(".ps-s4", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 7.15)
          .fromTo(".ps-note", { scale: 0.92, y: 12 }, { scale: 1, y: 0, ease: "back.out(1.7)" }, 7.15)
          .fromTo(".ps-s4 .saved", { autoAlpha: 0 }, { autoAlpha: 1 }, 7.5)
          .to({}, { duration: 1 });

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
          <a className="ps-badge" href="#voice">🎙 Ring can answer in your own voice</a>
          <h2>Ring answers your unknown calls.</h2>
          <p className="ps__sub">
            It talks to the caller <b>in their language</b>, you steer it with
            a tap, and all you get is the note.
          </p>
          <ul className="ps-feats">
            {FEATS.map((f) => (
              <li key={f}><span className="t">✓</span>{f}</li>
            ))}
          </ul>
        </div>

        <div className="ps__stage" aria-hidden="true">
          <div className="ps-phone">
            <span className="ps-notch" />
            <div className="ps-screen">
              <div className="ps-top">
                <span className="k">Tring</span>
                <span className="ps-live"><span className="d" /> LIVE</span>
              </div>

              {/* 1 — incoming call */}
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

              {/* 2 — Ring picks up */}
              <div className="ps-scene ps-s2">
                <span className="ps-halo">
                  <span className="h" /><span className="h" /><span className="h" />
                  <Ring size={92} state="talking" />
                </span>
                <b>Ring answered</b>
                <small>in your voice, in Hindi</small>
                <span className="ps-eq"><span /><span /><span /><span /></span>
              </div>

              {/* 3 — the live-call screen with steer chips */}
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

              {/* 4 — the wrap-up card */}
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
