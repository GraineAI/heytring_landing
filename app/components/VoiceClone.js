import { Check, Wave } from "./Icons";
import { PLAY_URL } from "./StoreButtons";

const points = [
  ["Talk for 20 seconds.", "Read a short line aloud and you&rsquo;re set. That&rsquo;s the whole setup."],
  ["Nothing is trained on your voice.", "Instant, zero-shot cloning conditions a pre-built speech model at the moment Ring speaks. Remove your sample and nothing of it remains."],
  ["Only your own voice.", "You can clone your voice and no one else&rsquo;s — that&rsquo;s a hard rule, with your in-app consent."],
];

// varied bar heights for the equaliser
const bars = [16, 30, 46, 24, 38, 52, 20, 34, 44, 26, 40, 18, 48, 28, 36];

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
              Record twenty seconds once. Then Ring greets every caller in a voice like
              yours, in <b>their</b> language — so the delivery guy, the clinic, the vendor
              all hear <b>you</b>, even when you never picked up.
            </p>

            <ul className="voice__points">
              {points.map(([h, d]) => (
                <li key={h}>
                  <span className="tick"><Check style={{ color: "var(--coral-hot)" }} /></span>
                  <span>
                    <b style={{ color: "#fff" }} dangerouslySetInnerHTML={{ __html: h }} />{" "}
                    <span dangerouslySetInnerHTML={{ __html: d }} />
                  </span>
                </li>
              ))}
            </ul>

            <a className="btn btn--onDark" href={PLAY_URL}>
              <Wave width={18} height={18} style={{ color: "var(--coral)" }} />
              Unlock your voice — free with an invite
            </a>

            <p className="voice__note">
              Normally part of Tring Plus. A single invite unlocks it at no cost. We never
              use your voice or call audio to train any AI model — read the detail in our{" "}
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
