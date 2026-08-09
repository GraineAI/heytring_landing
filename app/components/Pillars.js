/**
 * The four pillars — Swish's closing grid, which is really a claim about
 * ownership: we built the parts, so the parts work together.
 *
 * Deliberately plain. A rule, a title, a sentence. No cards and no icons,
 * because the moment these get chrome they start competing with the one
 * coral control on the page.
 */
const PILLARS = [
  {
    t: "Our own voice",
    d: "The speech engine is ours, in 12+ Indian languages. It is why Ring sounds like a person on the line — and why it can sound like you.",
  },
  {
    t: "Our own phone lines",
    d: "Calls run on telephony we operate rather than resell. Nothing is queued behind another company's platform, so Ring answers on the first ring.",
  },
  {
    t: "Your number, not a new one",
    d: "It works on the SIM already in your phone. Nothing to port, no second number to hand out, nobody to tell.",
  },
  {
    t: "You stay in control",
    d: "Watch the transcript as it happens, take the call over whenever you want, and get it in writing when it ends.",
  },
];

export default function Pillars() {
  return (
    <section className="section pillars" id="how">
      <div className="wrap">
        <div className="pillars__grid">
          {PILLARS.map((p) => (
            <div className="pillar reveal" key={p.t}>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
