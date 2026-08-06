"use client";

/**
 * Hero — dark ambient brand film behind the headline (16:9 + 9:16 cuts,
 * poster first paint, glass pause pill). Videos ship as H.264 MP4 first
 * (Safari/every browser) with WebM fallback, and `muted` is enforced via
 * JS because React drops the attribute from SSR HTML — without it Chrome
 * blocks autoplay. Plus, per the annotated review: prominent floating
 * handled-call cards (GSAP-drifted), the vibrating "Tring.", and the
 * mascot surfing on a board — phone in one hand, script in the other.
 */
import { useEffect, useRef, useState } from "react";
import StoreButtons from "./StoreButtons";

const CARDS = [
  { cls: "hcard--1", ic: "✓", ok: true, b: "Delivery · Blinkit", s: "left at the gate" },
  { cls: "hcard--2", ic: "✓", ok: true, b: "Apollo Clinic", s: "appointment Friday, 6 pm" },
  { cls: "hcard--3", ic: "✕", ok: false, b: "Loan offer · spam", s: "politely dismissed" },
  { cls: "hcard--4", ic: "✓", ok: true, b: "Watchman", s: "visitor sent up" },
  { cls: "hcard--5", ic: "✓", ok: true, b: "Maa", s: "always rings through" },
];

function IndiaFlag() {
  return (
    <svg className="flag" width="18" height="13" viewBox="0 0 18 13" aria-label="India">
      <rect width="18" height="13" fill="#fff" />
      <rect width="18" height="4.33" fill="#FF9933" />
      <rect y="8.67" width="18" height="4.33" fill="#138808" />
      <circle cx="9" cy="6.5" r="1.7" fill="none" stroke="#054187" strokeWidth="0.6" />
      <circle cx="9" cy="6.5" r="0.35" fill="#054187" />
    </svg>
  );
}

function Surfer() {
  return (
    <svg className="surfer" width="230" height="164" viewBox="0 0 240 170" aria-hidden="true">
      <defs>
        <radialGradient id="surfBody" cx="34%" cy="26%" r="78%">
          <stop offset="0" stopColor="#FF9179" />
          <stop offset="46%" stopColor="#F4532E" />
          <stop offset="100%" stopColor="#C4380F" />
        </radialGradient>
      </defs>
      {/* motion streaks */}
      <path d="M18 120 h34 M8 134 h26" stroke="rgba(244,83,46,.55)" strokeWidth="4" strokeLinecap="round" />
      {/* the board — mint, so the hero carries all three brand colours */}
      <g transform="rotate(-6 120 132)">
        <rect x="38" y="122" width="164" height="17" rx="9" fill="#E7E7EA" />
        <rect x="38" y="139" width="164" height="5" rx="2.5" fill="#A5A3A4" />
        <rect x="38" y="127" width="164" height="4" rx="2" fill="rgba(255,255,255,.45)" />
      </g>
      {/* splash */}
      <circle cx="203" cy="148" r="4" fill="#F4532E" opacity=".85" />
      <circle cx="213" cy="140" r="3" fill="#DEDCDD" opacity=".9" />
      <circle cx="36" cy="150" r="3" fill="#DEDCDD" opacity=".8" />
      {/* legs */}
      <path d="M106 106 L100 122 M126 106 L132 122" stroke="#C4380F" strokeWidth="6" strokeLinecap="round" />
      {/* the script (left hand) */}
      <g transform="rotate(-10 62 66)">
        <rect x="48" y="48" width="28" height="36" rx="4" fill="#FFFFFF" />
        <path d="M54 57 h16 M54 64 h16 M54 71 h16 M54 78 h10" stroke="#A5A3A4" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* arms */}
      <path d="M92 88 L72 70" stroke="#C4380F" strokeWidth="6" strokeLinecap="round" />
      <path d="M140 88 L160 72" stroke="#C4380F" strokeWidth="6" strokeLinecap="round" />
      {/* the phone (right hand) */}
      <g transform="rotate(10 168 66)">
        <rect x="158" y="50" width="19" height="32" rx="5" fill="#000000" />
        <rect x="161" y="54" width="13" height="22" rx="2" fill="#0B0B0C" />
        <circle cx="167.5" cy="65" r="4" fill="#F4532E" />
      </g>
      {/* Ring — the same glossy sphere as components/Mascot.js */}
      <circle cx="118" cy="83" r="30" fill="#C4380F" />
      <circle cx="116" cy="80" r="30" fill="url(#surfBody)" />
      <circle cx="106" cy="77.4" r="5.5" fill="#fff" />
      <circle cx="126" cy="77.4" r="5.5" fill="#fff" />
      <circle className="pupil" cx="107.5" cy="79" r="2.6" fill="#000000" />
      <circle className="pupil" cx="127.5" cy="79" r="2.6" fill="#000000" />
      <ellipse cx="116" cy="93" rx="4.5" ry="5.5" fill="#fff" />
    </svg>
  );
}

export default function Hero() {
  const videoRef = useRef(null);
  const [portrait, setPortrait] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    const pick = () =>
      setPortrait(window.innerWidth <= 767 && window.innerHeight > window.innerWidth);
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);

  // React drops `muted` from SSR markup → Chrome refuses to autoplay.
  // Enforce it and kick playback ourselves, every time the source swaps.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) return;
    v.muted = true;
    v.defaultMuted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, [portrait, reduced]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  const base = portrait ? "/hero-loop-portrait" : "/hero-loop";
  const poster = portrait ? "/hero-poster-portrait.jpg" : "/hero-poster.jpg";

  return (
    <header className="hero" id="top">
      <div className="hero__film" aria-hidden="true">
        {reduced ? (
          <img src={poster} alt="" />
        ) : (
          <video
            key={base}
            ref={videoRef}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={`${base}.mp4`} type="video/mp4" />
            <source src={`${base}.webm`} type="video/webm" />
          </video>
        )}
        <div className="hero__veil" />
      </div>

      {/* prominent floating handled-call cards */}
      <div className="herocards" aria-hidden="true">
        {CARDS.map((c) => (
          <div className={`hcard ${c.cls}`} key={c.cls}>
            <span className={`ic ${c.ok ? "ic--ok" : "ic--no"}`}>{c.ic}</span>
            <span><b>{c.b}</b><small>{c.s}</small></span>
          </div>
        ))}
      </div>

      <div className="wrap hero__in">
        <h1>
          Don&rsquo;t pick up.<br />
          Don&rsquo;t dial. <span className="ring">Tring.</span>
        </h1>

        <p className="hero__sub">
          Ring answers the calls you&rsquo;d rather skip.{" "}
          <b>In your own voice, if you want.</b>
        </p>

        <div className="hero__cta">
          <StoreButtons placement="hero" />
        </div>

        <p className="hero__trust">
          Closed beta · Free · 12+ Indian languages · Made for India <IndiaFlag />
        </p>

        <Surfer />
      </div>

      {!reduced && (
        <button
          className="hero__ctl"
          onClick={toggle}
          aria-label={paused ? "Play background video" : "Pause background video"}
        >
          {paused ? "▶ Play" : "❚❚ Pause"}
        </button>
      )}
    </header>
  );
}
