import Logo from "./Logo";
import Wordmark from "./Wordmark";

/** Floating glass nav pill (dark). The CTA opens the beta-invite modal. */
export default function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav__in">
        <a className="brand" href="#top" aria-label="Tring home">
          <Logo size={32} className="brand__logo" />
          <Wordmark size={27} />
        </a>

        <div className="nav__links">
          <a href="#story">Why Tring</a>
          <a href="#video">Watch It</a>
          <a href="#how">What we built</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="nav__cta">
          {/* the game is the site's most interactive moment — it gets its own
              pill and stays visible on mobile, where the link row collapses */}

          <button className="btn btn--coral" data-beta="android" data-beta-placement="nav">
            Get the beta
          </button>
        </div>
      </div>
    </nav>
  );
}
