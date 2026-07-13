"use client";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { PLAY_URL } from "./StoreButtons";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="wrap nav__in">
        <a className="brand" href="#top" aria-label="Tring home">
          <Logo size={34} className="brand__logo" />
          <span className="brand__name">Tring</span>
          <span className="brand__tag">transfer to Ring</span>
        </a>

        <div className="nav__links">
          <a href="#how">How it works</a>
          <a href="#voice">Your voice</a>
          <a href="#handles">What Ring handles</a>
          <a href="#privacy">Privacy</a>
        </div>

        <div className="nav__cta">
          <a className="btn btn--coral" href={PLAY_URL}>Get Tring — free</a>
        </div>
      </div>
    </nav>
  );
}
