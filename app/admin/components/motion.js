"use client";
import React, { useEffect, useRef, useState } from "react";

/**
 * Motion for the admin panel.
 *
 * The rule everything here follows: motion must ENCODE something. A number counting up shows
 * magnitude, a bar growing from zero shows proportion, a curve drawing left-to-right shows time
 * passing. Movement that carries no information is noise on a page whose entire job is to be read
 * quickly — and on a dashboard, noise is worse than plainness because it competes with the one
 * number that matters.
 *
 * Everything respects prefers-reduced-motion by jumping straight to the final state. That is not a
 * courtesy toggle: for some people this animation causes actual nausea, and a dashboard is a tool,
 * not a showreel.
 */

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Fires once when the element first scrolls into view. Charts below the fold animate on arrival. */
export function useInView(threshold = 0.25) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/**
 * A number that counts to its value.
 *
 * Eased out, not linear: a linear count reads mechanical, while decelerating feels like the number
 * settling into place — and the deceleration is what makes the final value the thing you remember
 * rather than the motion.
 */
export function CountUp({ value, duration = 700, decimals = 0, suffix = "", prefix = "" }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced || value == null || !isFinite(value)) { setShown(value); return; }
    const from = 0, t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);      // cubic ease-out
      setShown(from + (value - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration, reduced]);
  if (value == null) return <span style={{ color: "#5b6673" }}>—</span>;
  const n = Number(shown || 0);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>
    {prefix}{decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString("en-IN")}{suffix}
  </span>;
}

/**
 * A bar that grows from zero to its share.
 *
 * The growth is the point: a funnel rendered as static bars is read as five numbers, whereas bars
 * arriving in sequence are read as a JOURNEY, and the step where the bar suddenly shortens is felt
 * rather than calculated. `delay` staggers them so the drop lands in order.
 */
export function GrowBar({ pct = 0, color = "#F4532E", height = 8, delay = 0, track = "rgba(255,255,255,.07)" }) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) { setW(pct); return; }
    const t = setTimeout(() => setW(pct), 40 + delay);
    return () => clearTimeout(t);
  }, [pct, delay, reduced]);
  return (
    <div style={{ height, borderRadius: height / 2, background: track, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, w))}%`, height: "100%", background: color,
                    borderRadius: height / 2,
                    transition: reduced ? "none" : "width 760ms cubic-bezier(.22,.9,.3,1)" }} />
    </div>
  );
}

/**
 * An SVG path that draws itself left to right.
 *
 * A retention curve appearing all at once is a shape; drawn, it is a story with a direction, and
 * the flattening tail is the thing the eye follows to. Uses stroke-dash, so it costs nothing.
 */
export function DrawPath({ d, stroke, width = 2.2, delay = 0, length = 1200 }) {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(reduced);
  useEffect(() => {
    if (reduced) { setOn(true); return; }
    const t = setTimeout(() => setOn(true), 60 + delay);
    return () => clearTimeout(t);
  }, [delay, reduced]);
  return (
    <path
      d={d} fill="none" stroke={stroke} strokeWidth={width}
      strokeLinejoin="round" strokeLinecap="round"
      style={{
        strokeDasharray: length,
        strokeDashoffset: on ? 0 : length,
        transition: reduced ? "none" : "stroke-dashoffset 1100ms cubic-bezier(.3,.8,.3,1)",
      }}
    />
  );
}

/** Content that rises as it arrives. Staggered by index so a grid resolves in reading order. */
export function Rise({ children, delay = 0, style }) {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(reduced);
  useEffect(() => {
    if (reduced) { setOn(true); return; }
    const t = setTimeout(() => setOn(true), 30 + delay);
    return () => clearTimeout(t);
  }, [delay, reduced]);
  return (
    <div style={{
      ...style,
      opacity: on ? 1 : 0,
      transform: on ? "translateY(0)" : "translateY(6px)",
      transition: reduced ? "none" : "opacity 420ms ease, transform 420ms cubic-bezier(.2,.9,.3,1)",
    }}>{children}</div>
  );
}

/**
 * A slow breath on something that needs attention.
 *
 * Reserved for the CONSTRAINT and 2σ anomalies only. If more than one thing on a screen pulses,
 * nothing does — this is the single most abusable effect here, which is why it is deliberately
 * slow, low-contrast, and rationed.
 */
export function Pulse({ children, active = true, color = "255,123,114" }) {
  const reduced = useReducedMotion();
  if (!active || reduced) return <>{children}</>;
  return (
    <div style={{ animation: "tringPulse 2.6s ease-in-out infinite", borderRadius: 12,
                  ["--pulse"]: color }}>
      {children}
      <style>{`
        @keyframes tringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(${color}, .30); }
          50%      { box-shadow: 0 0 0 7px rgba(${color}, 0); }
        }
      `}</style>
    </div>
  );
}
