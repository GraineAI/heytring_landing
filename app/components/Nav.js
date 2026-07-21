import Logo from "./Logo";
import { PLAY_URL } from "./StoreButtons";

/** Floating glass nav pill (Swish): fixed, blurred, radius 20 — no scroll
 *  listeners needed; the pill reads premium at rest. */
export default function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav__in">
        <a className="brand" href="#top" aria-label="Tring home">
          <Logo size={32} className="brand__logo" />
          <span className="brand__name">Tring</span>
        </a>

        <div className="nav__links">
          <a href="#story">What Ring does</a>
          <a href="#video">Watch it</a>
          <a href="#how">How it works</a>
          <a href="#voice">Your voice</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="nav__cta">
          <a className="btn btn--coral" href={PLAY_URL}>Get Tring — free</a>
        </div>
      </div>
    </nav>
  );
}
