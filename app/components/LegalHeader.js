import Logo from "./Logo";
import Wordmark from "./Wordmark";

export default function LegalHeader() {
  return (
    <nav className="nav is-scrolled">
      <div className="wrap nav__in">
        <a className="brand" href="/" aria-label="Tring home">
          <Logo size={30} className="brand__logo" />
          <Wordmark size={26} surface="#FFFDFB" />
          <span className="brand__tag">transfer to Ring</span>
        </a>
        <div className="nav__cta">
          <a className="btn btn--ghost" href="/">Back to home</a>
        </div>
      </div>
    </nav>
  );
}
