"use client";

import Logo from "./Logo";
import Wordmark from "./Wordmark";
import useStoreLink from "./useStoreLink";

/** Floating glass nav pill (dark). The CTA is a direct store link — the beta-invite modal
 *  it used to open is gone, because both platforms are publicly installable now. */
export default function Nav() {
  const store = useStoreLink("nav");
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

          {/* A real link now, not a form. Points at whichever store fits the device. */}
          <a className="btn btn--coral" href={store.href}>
            {store.label}
          </a>
        </div>
      </div>
    </nav>
  );
}
