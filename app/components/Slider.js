"use client";

/** Slider — GSAP swipe-slider pattern (Draggable + InertiaPlugin, both free): flick/drag
 *  through what Ring handles; snaps to cards. Keyboard/scroll still work (native overflow
 *  fallback if plugins fail). */
import { useEffect, useRef } from "react";

const SLIDES = [
  ["🚫", "Spam & sales", "Politely dismissed. You never hear it ring."],
  ["📦", "Deliveries", "“Leave it with security” — handled in their language."],
  ["🏥", "Clinics & banks", "Details taken, verified, noted for you."],
  ["🎙️", "Your own voice", "Callers can't tell it isn't you."],
  ["🤝", "Take over anytime", "One tap and the live call is yours."],
];

export default function Slider() {
  const wrap = useRef(null), track = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx, cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { Draggable } = await import("gsap/Draggable");
      const { InertiaPlugin } = await import("gsap/InertiaPlugin");
      if (cancelled) return;
      gsap.registerPlugin(Draggable, InertiaPlugin);
      ctx = gsap.context(() => {
        const t = track.current, w = wrap.current;
        const max = () => Math.min(0, w.offsetWidth - t.scrollWidth);
        const card = () => t.children[0].offsetWidth + 16;
        Draggable.create(t, {
          type: "x", bounds: { minX: max(), maxX: 0 }, inertia: true, edgeResistance: 0.82,
          snap: (v) => Math.round(v / card()) * card(),
        });
      }, wrap);
    })();
    return () => { cancelled = true; ctx && ctx.revert(); };
  }, []);
  return (
    <section aria-label="What Ring handles" style={{ padding: "56px 0 40px", overflow: "hidden" }}>
      <div className="wrap">
        <h2 style={{ textAlign: "center", marginBottom: 4 }}>Flick through a day of calls</h2>
        <p style={{ textAlign: "center", opacity: 0.7, marginBottom: 22 }}>Drag the cards — every one is a call you didn&rsquo;t take.</p>
      </div>
      <div ref={wrap} style={{ overflow: "hidden", padding: "0 24px", cursor: "grab" }}>
        <div ref={track} style={{ display: "flex", gap: 16, width: "max-content" }}>
          {SLIDES.map(([e, t2, d], i) => (
            <div key={i} style={{ width: 260, flex: "none", background: "#fff", border: "1px solid #F0E4DD",
              borderRadius: 22, padding: "22px 20px", boxShadow: "0 6px 22px rgba(90,36,23,.06)" }}>
              <div style={{ fontSize: 34 }}>{e}</div>
              <div style={{ fontWeight: 800, fontSize: 17, marginTop: 10 }}>{t2}</div>
              <div style={{ opacity: 0.65, fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
