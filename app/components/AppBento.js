"use client";

/**
 * AppBento — "actual things from the app, nothing static": a bento grid
 * of real app cards (dark mode) that Flip-morphs between two layouts
 * while pinned, scrubbed by scroll (the GSAP Flip + ScrollTrigger
 * gallery pattern). Desktop + no-reduced-motion only; below 940px it's
 * a simple living grid.
 */
import { useEffect, useRef } from "react";
import { Orbit } from "./Mascot";

export default function AppBento() {
  const root = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx, flipCtx, cancelled = false, onResize = null;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { Flip } = await import("gsap/Flip");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, Flip);

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();
        mm.add("(min-width: 940px)", () => {
          const gallery = root.current.querySelector(".bento");
          const items = gallery.querySelectorAll(".bento__item");

          const createTween = () => {
            flipCtx && flipCtx.revert();
            gallery.classList.remove("bento--final");

            flipCtx = gsap.context(() => {
              gallery.classList.add("bento--final");
              const state = Flip.getState(items);
              gallery.classList.remove("bento--final");

              const flip = Flip.to(state, { simple: true, ease: "expoScale(1, 5)" });

              gsap.timeline({
                scrollTrigger: {
                  trigger: gallery,
                  start: "center center",
                  end: "+=90%",
                  scrub: true,
                  pin: gallery.parentNode,
                },
              }).add(flip);

              return () => gsap.set(items, { clearProps: "all" });
            });
          };

          createTween();
          onResize = createTween;
          window.addEventListener("resize", onResize);
          return () => {
            window.removeEventListener("resize", onResize);
            flipCtx && flipCtx.revert();
          };
        });
      }, root);
    })();
    return () => { cancelled = true; ctx && ctx.revert(); };
  }, []);

  return (
    <section className="section" id="app" ref={root}>
      <div className="wrap bento-wrap">
        <div className="head head--center reveal">
          <span className="eyebrow">Straight from the app</span>
          <h2>Everything Ring does. Live.</h2>
        </div>

        <div className="bento" aria-label="Tring app screens">
          <div className="bento__item bento__item--coral">
            <span className="b-live"><i /> ON A CALL · 0:42</span>
            <div className="b-t">Ring is talking to a caller</div>
            <div className="b-s">A delivery agent is asking where to leave your parcel.</div>
            <div className="b-eq"><span /><span /><span /><span /><span /><span /></div>
            <span className="b-chip">Take over →</span>
          </div>

          <div className="bento__item">
            <span className="b-k">Incoming</span>
            <div className="b-t">Blinkit · Ramesh</div>
            <div className="b-s">+91 98••• ••455</div>
          </div>

          <div className="bento__item">
            <span className="b-k">Me time saved</span>
            <div className="b-t" style={{ fontSize: 34 }}>4h 12m</div>
            <div className="b-s">this week · 37 calls handled · 14 spam blocked</div>
            <div className="b-bar"><span /></div>
          </div>

          <div className="bento__item">
            <span className="b-k">Your voice</span>
            <div className="b-t">Sounds just like you</div>
            <div className="b-eq"><span /><span /><span /><span /><span /></div>
          </div>

          <div className="bento__item">
            <span className="b-k">Wrap-up</span>
            <div className="b-t">Left your parcel with security</div>
            <span className="b-chip">✓ Done · saved to history</span>
          </div>

          <div className="bento__item">
            <span className="b-k">Setup</span>
            <div className="b-row" style={{ marginTop: 10 }}>
              <Orbit size={44} onDark />
              <div>
                <div className="b-t" style={{ fontSize: 15, marginTop: 0 }}>Checked by Orbit</div>
                <div className="b-s" style={{ marginTop: 2 }}>forwarding on · connected</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
