import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div>
            <a className="brand" href="#top">
              <Logo size={34} className="brand__logo" />
              <span className="brand__name">Tring</span>
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
            <a href="#how">How it works</a>
            <a href="#voice">Your voice</a>
            <a href="#ask">Ask Ring to call</a>
            <a href="#handles">What Ring handles</a>
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
    </footer>
  );
}
