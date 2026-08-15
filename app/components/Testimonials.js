import { QUOTES, hasQuotes, isPublishable } from "../lib/socialProof";

/**
 * What users actually said.
 *
 * The one section on this page whose sentences are not ours. Everything above it is us making a
 * case; this is somebody with nothing to gain saying the case held. That is why it sits after the
 * features and before the final call: it answers the objection the features have just raised.
 *
 * NOT A CAROUSEL. The reference page rotates its testimonials, which works when there are dozens
 * and hides the shortage when there are four. A grid shows exactly how many exist. If that number
 * is embarrassing the answer is to go and collect more, not to slide them past the reader — and a
 * static grid cannot hide the third one behind an arrow nobody clicks.
 *
 * It renders nothing below three quotes. See app/lib/socialProof.js for why, and for where the
 * real ones come from.
 */
export default function Testimonials() {
  if (!hasQuotes()) return null;
  const quotes = QUOTES.filter(isPublishable);

  return (
    <section className="section testimonials" id="reviews" aria-label="What people say">
      <div className="wrap">
        <span className="eyebrow reveal">In their words</span>
        <div className="testimonials__grid">
          {quotes.map((q) => (
            <figure className="quote reveal" key={q.name + q.words.slice(0, 12)}>
              <blockquote>{q.words}</blockquote>
              <figcaption>
                <span className="quote__name">{q.name}</span>
                {q.role ? <span className="quote__role">{q.role}</span> : null}
                {/* Where it came from, small. A quote a reader can trace is worth several they cannot. */}
                {q.via ? <span className="quote__via">via {q.via}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
