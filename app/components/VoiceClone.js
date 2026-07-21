import { Check, Wave } from "./Icons";
import { PLAY_URL } from "./StoreButtons";

// varied bar heights for the equaliser
const bars = [16, 30, 46, 24, 38, 52, 20, 34, 44, 26, 40, 18, 48, 28, 36];

/** The one dark moment — compact: headline, one line, the record card. */
export default function VoiceClone() {
  return (
    <section className="section" id="voice" style={{ paddingBottom: 40 }}>
      <div className="voice">
        <div className="voice__in">
          <div>
            <span className="eyebrow">The part nobody else does</span>
            <h2>
              Ring answers in <em>your</em> voice.
            </h2>
            <p className="voice__body">
              Talk for twenty seconds once. Every caller hears <b>you</b> —
              in their language — even when you never picked up.
            </p>

            <a className="btn btn--onDark" href={PLAY_URL} style={{ marginTop: 26 }}>
              <Wave width={18} height={18} style={{ color: "var(--coral)" }} />
              Unlock your voice — free with an invite
            </a>

            <p className="voice__note">
              Only your own voice, never trained on — detail in our{" "}
              <a href="/privacy#voice">Privacy Policy&nbsp;§5</a>.
            </p>
          </div>

          <div className="rec" aria-hidden="true">
            <div className="rec__head">
              <span className="rec__badge"><span className="live" /> RECORDING</span>
              <span className="rec__time">0:12 / 0:20</span>
            </div>

            <div className="rec__orb">
              <span className="glow" />
              <span className="wave">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: h, animationDelay: `${(i % 6) * 0.09}s` }} />
                ))}
              </span>
            </div>

            <div className="rec__cap">
              <span className="k">Read aloud in Hindi</span>
              <div className="hi" lang="hi">नमस्ते, मैं अभी उपलब्ध नहीं हूँ।</div>
            </div>

            <button className="rec__done" type="button" tabIndex={-1}>
              <Check style={{ color: "#fff" }} /> Done — clone my voice
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
