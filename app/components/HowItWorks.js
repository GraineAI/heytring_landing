import { Phone, Eye, Note } from "./Icons";
import { Orbit } from "./Mascot";

const steps = [
  {
    n: "Step 1",
    icon: <Phone width={22} height={22} />,
    h: "Ring picks up",
    p: "A call comes in and you don't answer. Your carrier quietly diverts it to Ring, which answers in seconds and finds out what the caller needs.",
  },
  {
    n: "Step 2",
    icon: <Eye width={22} height={22} />,
    h: "You watch it live",
    p: "Get a live transcript with rolling “so far” updates. Drop in a line, or tap Take over to jump into the call yourself at any moment.",
  },
  {
    n: "Step 3",
    icon: <Note width={22} height={22} />,
    h: "You get the note",
    p: "When the call ends, Ring hands you a clean wrap-up: who called, why, and whether anything needs you. Spam never reaches you; important people always do.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="head reveal">
          <span className="eyebrow">How it works</span>
          <h2>Answer nothing. Miss nothing.</h2>
          <p className="lead">
            Ring sits between you and the calls you don&rsquo;t want. You stay in your
            meeting, your movie, your life — and still know exactly what happened.
          </p>
        </div>

        <div className="steps">
          {steps.map((s) => (
            <article className="step reveal" key={s.n}>
              <span className="step__glyph">{s.icon}</span>
              <span className="step__n">{s.n}</span>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </article>
          ))}
        </div>

        <p className="steps__foot reveal">
          It works the other way too — <b>ask Ring to call</b> the restaurant, the
          clinic, the plumber. It dials, sits through the hold music, and pings you
          when it&rsquo;s done.
        </p>

        <div className="orbitline reveal">
          <Orbit size={46} />
          <p>
            And meet <b>Orbit</b> — it quietly checks your setup on its own
            (forwarding on, connected, test call works) so Ring just works.
          </p>
        </div>
      </div>
    </section>
  );
}
