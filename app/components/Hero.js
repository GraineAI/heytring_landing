import StoreButtons from "./StoreButtons";

/** Hero — cream, centered, still (Equal AI's short pitch, Swish's calm).
 *  The loader's curtain lifts onto this; nothing here moves. */
export default function Hero() {
  return (
    <header className="hero" id="top">
      <div className="wrap hero__in">
        <h1>
          Don&rsquo;t pick up.<br />
          Don&rsquo;t dial. <span className="ring">Tring.</span>
        </h1>

        <p className="hero__sub">
          Ring is your personal AI that answers the calls you&rsquo;d rather skip —
          spam, deliveries, vendors — and hands you a clean note.{" "}
          <b>In your own voice, if you want.</b>
        </p>

        <div className="hero__cta">
          <StoreButtons placement="hero" />
        </div>

        <p className="hero__trust">Free · English + Hindi · Made for India 🇮🇳</p>
      </div>
    </header>
  );
}
