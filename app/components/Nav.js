import Logo from "./Logo";

/** Floating glass nav pill (dark). The CTA opens the beta-invite modal. */
export default function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav__in">
        <a className="brand" href="#top" aria-label="Tring home">
          <Logo size={32} className="brand__logo" />
          <span className="brand__name">Tring</span>
        </a>

        <div className="nav__links">
          <a href="#story">What Ring Does</a>
          <a href="#app">The App</a>
          <a href="#play">Play</a>
          <a href="#video">Watch It</a>
          <a href="#voice">Your Voice</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="nav__cta">
          <button className="btn btn--coral" data-beta="android" data-beta-placement="nav">
            Get the beta
          </button>
        </div>
      </div>
    </nav>
  );
}
