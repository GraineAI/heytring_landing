/**
 * The story block — Swish's opening move, applied to Tring.
 *
 * One plain paragraph that says who we are and what was broken, then a single
 * oversized promise. No cards, no icons, no stats. The restraint is the point:
 * everything above this is atmosphere, and this is the first place the page
 * simply talks to you.
 */
export default function Story() {
  return (
    <section className="section story" id="story">
      <div className="wrap">
        <p className="story__prose reveal">
          Tring was started in Bengaluru because the phone had a problem: most of
          what rings is junk, and the one call that matters always lands at the
          worst possible moment. We decided to fix both. Ring picks up what you
          would rather skip, talks to the caller in their own language, handles
          what they need, and hands you a note. It runs on a speech engine and
          phone lines we built ourselves &mdash; no third parties between you and
          the call. That means we can focus on what actually matters: you never
          bracing for an unknown number again.
        </p>

        <blockquote className="story__quote reveal">
          <span>&ldquo;In their language, on your</span>
          <span>number, answered in one ring&rdquo;</span>
        </blockquote>
      </div>
    </section>
  );
}
