import Logo from "./Logo";
import Wordmark from "./Wordmark";

export default function Footer() {
  return (
    <footer className="footer">
      {/* hand-drawn doodle strip (Swish's pre-footer flourish) */}
      <div className="doodles" aria-hidden="true" />
      <div className="wrap">
        <div className="footer__top">
          <div>
            <a className="brand" href="#top">
              <Logo size={34} className="brand__logo" />
              <Wordmark size={29} surface="var(--bg-2)" />
            </a>
            <p className="footer__blurb">
              Your personal AI phone assistant. Ring answers the calls you&rsquo;d rather
              skip — in your own voice, if you want.
            </p>
            <p className="footer__addr">
              Mavrix AI Private Limited (CIN U62099KA2025PTC210316)<br />
              No. 8/3, Prince Ville, Challaghatta Village, Domlur,<br />
              Bangalore North, Bangalore – 560071, Karnataka, India
            </p>
          </div>

          <div className="footer__col">
            <h5>Product</h5>
            <a href="#story">What Ring does</a>
            <a href="#video">Watch it</a>
            <a href="#how">How it works</a>
            <a href="#voice">Your voice</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="footer__col">
            <h5>Legal</h5>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy#rights">Your rights</a>
            <a href="/privacy#recording">Call-recording notice</a>
          </div>

          <div className="footer__col">
            <h5>Contact</h5>
            <a href="mailto:customer@heytring.com">customer@heytring.com</a>
            <a href="https://heytring.com">heytring.com</a>
            <span>Grievances answered in 24h</span>
          </div>
        </div>

        <div className="footer__bar">
          <span>© 2026 Mavrix AI Private Limited. All rights reserved.</span>
          <span>Made in India 🇮🇳 · For users 18+</span>
        </div>
      </div>

      {/* The sign-off: the wordmark at full volume. Rendered through the same
          component as the nav so the extrusion, skew and square-dot i are the
          one drawing — and `surface` is the footer's own brown, because the g's
          notch is a knockout and would otherwise punch a white hole. */}
      <div className="footer__giant" aria-hidden="true">
        <Wordmark size={null} tone="white" surface="var(--ink-deep)" />
      </div>
    </footer>
  );
}
