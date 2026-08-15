import StoreButtons from "./StoreButtons";

/**
 * Languages — the differentiator that was buried in clauses.
 *
 * "12+ Indian languages" appeared five times on this site, never once as a
 * thing you could look at. It was always a sub-clause qualifying some other
 * sentence. For a product sold in India that is the single strongest claim
 * available, so it gets a band of its own.
 *
 * The framing matters more than the list. Every competitor says "supports N
 * languages", which reads as a settings screen. The actual claim is stranger
 * and better: Ring answers each caller in THEIR language, not in yours — the
 * courier who only speaks Tamil and your Hindi-speaking landlord get different
 * conversations from the same assistant, without you configuring anything.
 *
 * This also carries the mid-page store CTA. The hero and the footer were the
 * only two places to install, which asks someone who is convinced at the
 * halfway point to scroll to the bottom to act on it.
 */
const LANGUAGES = [
  "Hindi", "English", "Hinglish", "Tamil", "Telugu", "Kannada",
  "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Odia",
];

export default function Languages() {
  return (
    <section className="section langs" id="languages">
      <div className="wrap">
        <div className="head head--center reveal">
          <span className="eyebrow">Speaks India</span>
          <h2>Your caller picks the language. Not you.</h2>
          <p className="lead">
            Ring hears which language someone is speaking and answers in it —
            mid-call, without a setting. The courier gets Tamil, your landlord
            gets Hindi, and you get one note in the language you read.
          </p>
        </div>

        <ul className="langs__grid reveal" aria-label="Languages Ring speaks">
          {LANGUAGES.map((l) => (
            <li className="langs__chip" key={l}>{l}</li>
          ))}
          <li className="langs__chip langs__chip--more">and more</li>
        </ul>

        <div className="langs__cta reveal">
          <StoreButtons placement="languages" />
        </div>
      </div>
    </section>
  );
}
