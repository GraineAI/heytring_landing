"use client";

/**
 * Hero — Swish's signature: a full-viewport ambient brand film behind the
 * headline. Like justswish.in it ships two cuts (16:9 desktop, 9:16
 * portrait, swapped at ≤767px portrait), a poster for instant paint,
 * `preload` kept light, and a glass pause/play pill (Equal AI's control)
 * so the visitor owns the motion. Reduced motion = poster only.
 */
import { useEffect, useRef, useState } from "react";
import StoreButtons from "./StoreButtons";

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

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  const src = portrait ? "/hero-loop-portrait.webm" : "/hero-loop.webm";
  const poster = portrait ? "/hero-poster-portrait.jpg" : "/hero-poster.jpg";

  return (
    <header className="hero" id="top">
      {/* the ambient film */}
      <div className="hero__film" aria-hidden="true">
        {reduced ? (
          <img src={poster} alt="" />
        ) : (
          <video
            key={src}
            ref={videoRef}
            src={src}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
          />
        )}
        <div className="hero__veil" />
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

        <p className="hero__trust">Free · English + Hindi · Made for India 🇮🇳</p>
      </div>

      {/* glass film control (Equal AI) */}
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
