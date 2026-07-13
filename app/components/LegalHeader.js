import { Phone } from "./Icons";

export default function LegalHeader() {
  return (
    <nav className="nav is-scrolled">
      <div className="wrap nav__in">
        <a className="brand" href="/" aria-label="Tring home">
          <span className="brand__mark"><Phone width={17} height={17} style={{ color: "#fff" }} /></span>
          <span className="brand__name">Tring</span>
          <span className="brand__tag">transfer to Ring</span>
        </a>
        <div className="nav__cta">
          <a className="btn btn--ghost" href="/">Back to home</a>
        </div>
      </div>
    </nav>
  );
}
