import StoreButtons from "./StoreButtons";
import Particles from "./Particles";
import { Ring } from "./Mascot";
import { Check, Globe, Wave, Shield, Phone } from "./Icons";

export default function Hero() {
  return (
    <header className="hero" id="top">
      <Particles />
      <div className="wrap hero__in">
        <h1>
          Don&rsquo;t pick up.<br />
          Don&rsquo;t dial. <span className="ring">Tring.</span>
        </h1>

        <p className="hero__sub">
          <b>Tring, as in transfer to Ring.</b> Ring answers the calls you&rsquo;d rather
          skip — spam, deliveries, vendors — in their language, then hands you a clean note.{" "}
          <b>In your own voice, if you want.</b>
        </p>

        <div className="hero__cta">
          <StoreButtons />
        </div>

        <div className="hero__trust">
          <span><Check style={{ color: "var(--coral)" }} /> Free, forever</span>
          <span><Check style={{ color: "var(--coral)" }} /> No card needed</span>
          <span><Check style={{ color: "var(--coral)" }} /> English + Hindi</span>
        </div>

        {/* ── the "transfer to Ring" animation ── */}
        <div className="stage" aria-hidden="true">
          <span className="chip-float chip-float--tl"><Globe width={15} height={15} /> Answers in Hindi</span>
          <span className="chip-float chip-float--tr"><Shield width={15} height={15} /> Spam screened</span>
          <span className="chip-float chip-float--bl"><Wave width={15} height={15} /> Your own voice</span>
          <span className="chip-float chip-float--br"><Phone width={15} height={15} /> One-tap take over</span>

          <div className="phone">
            <span className="phone__notch" />
            <div className="phone__screen">
              <div className="scr">
                <div className="scr__top">
                  <span className="scr__brand">Tring</span>
                  <span className="scr__live"><span className="d" /> LIVE</span>
                </div>

                <div className="flow">
                  {/* incoming caller */}
                  <div className="flow__caller">
                    <span className="av">?</span>
                    <span>
                      <b>Unknown number</b>
                      <small>+91 98•••• ••55</small>
                    </span>
                    <Phone className="ringing" width={18} height={18} />
                  </div>

                  {/* travelling dot: caller → Ring */}
                  <span className="flow__travel" />

                  {/* Ring answering — the mascot */}
                  <div className="flow__ring">
                    <span className="halo" />
                    <span className="halo" />
                    <span className="halo" />
                    <Ring size={80} state="talking" className="flow__orb" />
                  </div>

                  {/* crossfading status labels */}
                  <div className="flow__labels">
                    <div className="a1"><b>Incoming call</b><small>you didn&rsquo;t pick up</small></div>
                    <div className="a2"><b>Transferring to Ring…</b><small>your carrier diverts the call</small></div>
                    <div className="a3"><b>Ring answered — in your voice</b><small>talking to the caller now</small></div>
                  </div>

                  {/* result note */}
                  <div className="flow__note">
                    <span className="tick"><Check style={{ color: "#fff" }} /></span>
                    <span>
                      <b>Delivery · Blinkit</b>
                      <small>Left at the gate. Nothing needs you.</small>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
