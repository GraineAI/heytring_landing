import StoreButtons from "./StoreButtons";
import { Phone, Globe, Check } from "./Icons";

export default function Hero() {
  return (
    <header className="hero" id="top">
      <div className="wrap hero__grid">
        <div className="hero__copy">
          <span className="hero__badge">
            <span className="dot" />
            <span><b>Ring</b> is answering &nbsp;·&nbsp; made for India 🇮🇳</span>
          </span>

          <h1>
            Don&rsquo;t pick up.<br />
            Don&rsquo;t dial.<br />
            <span className="ring">Tring.</span>
          </h1>

          <p className="hero__sub">
            <b>Tring, as in transfer to Ring.</b> Don&rsquo;t pick up and don&rsquo;t dial —
            just hand the call to Ring. It talks to spam, deliveries and vendors in their
            language, then hands you a clean note. <b>In your own voice, if you want.</b>
          </p>

          <div className="hero__cta">
            <StoreButtons />
          </div>

          <div className="hero__trust">
            <span><Check style={{ color: "var(--coral)" }} /> Free, forever</span>
            <span><Check style={{ color: "var(--coral)" }} /> No card needed</span>
            <span><Check style={{ color: "var(--coral)" }} /> 18+</span>
          </div>
        </div>

        <div className="hero__stage" aria-hidden="true">
          <div className="pulse">
            <span className="pulse__ring" />
            <span className="pulse__ring" />
            <span className="pulse__ring" />
            <span className="pulse__ring" />
          </div>

          <div className="phone">
            <span className="phone__notch" />
            <div className="phone__screen">
              <div className="scr">
                <div className="scr__top">
                  <span className="scr__title">Calls</span>
                  <span className="scr__toggle" />
                </div>

                <div className="scr__on">
                  <span className="rd"><Phone width={15} height={15} style={{ color: "#fff" }} /></span>
                  <span>
                    <b>Ring is on</b>
                    <small>answering the calls you skip</small>
                  </span>
                </div>

                <div className="scr__stats">
                  <div className="stat"><b>42</b><small>SCREENED</small></div>
                  <div className="stat"><b>18</b><small>SPAM</small></div>
                  <div className="stat"><b>7</b><small>HANDLED</small></div>
                </div>

                <div className="callrow">
                  <span className="callrow__av" style={{ background: "var(--coral)" }}>PS</span>
                  <span className="callrow__t"><b>Priya Sharma</b><small>note ready · school pickup</small></span>
                  <span className="callrow__tag tag--done">done</span>
                </div>
                <div className="callrow">
                  <span className="callrow__av" style={{ background: "#7b5b50" }}>?</span>
                  <span className="callrow__t"><b>Unknown</b><small>loan offer</small></span>
                  <span className="callrow__tag tag--spam">spam</span>
                </div>
                <div className="callrow">
                  <span className="callrow__av" style={{ background: "#b06a3a" }}>Rx</span>
                  <span className="callrow__t"><b>Apollo Pharmacy</b><small>meds ready · needs you</small></span>
                  <span className="callrow__tag tag--wait">for you</span>
                </div>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-2)" }}>
                  <Globe width={12} height={12} /> English + Hindi
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
