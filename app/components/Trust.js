import { Phone, Wave, Lock, Ban, Trash, Shield } from "./Icons";

const items = [
  { ic: <Phone width={20} height={20} />, h: "Your private calls stay private", p: "The moment you take over a call, recording and transcription stop. What you say to the caller yourself is never recorded or stored — only the AI part is kept." },
  { ic: <Wave width={20} height={20} />, h: "Never trained on your voice", p: "Your voice sample and call audio are never used to train, fine-tune or update any AI model — ours or a third party's. Ever." },
  { ic: <Lock width={20} height={20} />, h: "Encrypted, end to end of our reach", p: "Everything is encrypted in transit and at rest. Transcripts are additionally encrypted per user — only your session can read them." },
  { ic: <Ban width={20} height={20} />, h: "Never sold, never for ads", p: "We don't sell your personal information and never use your data for advertising. AI providers are contractually barred from training on it." },
  { ic: <Trash width={20} height={20} />, h: "You're in control", p: "Pause screening anytime, delete any single call, or delete your whole account and all associated data — within 30 days." },
  { ic: <Shield width={20} height={20} />, h: "Built for India, by the rules", p: "Compliant with the IT Act, 2000 and the Digital Personal Data Protection Act, 2023. For users 18 and older." },
];

export default function Trust() {
  return (
    <section className="section trust" id="privacy">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">Privacy, plainly</span>
          <h2>Ring works for you. So does your data.</h2>
          <p className="lead">
            An assistant that answers your calls has to be trusted with them. Here&rsquo;s
            exactly what we do — and, just as importantly, what we never do.
          </p>
        </div>

        <div className="trust__grid">
          {items.map((it) => (
            <article className="tcard" key={it.h}>
              <span className="tcard__ic">{it.ic}</span>
              <h3>{it.h}</h3>
              <p>{it.p}</p>
            </article>
          ))}
        </div>

        <p className="trust__foot">
          Full detail lives in our <a href="/privacy">Privacy Policy</a> and{" "}
          <a href="/terms">Terms of Service</a>. Calls handled by Ring are recorded and
          transcribed so you get your note and history — by using Tring you acknowledge the
          call-recording notice in the Privacy Policy.
        </p>
      </div>
    </section>
  );
}
