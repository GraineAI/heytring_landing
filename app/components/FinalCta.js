import StoreButtons from "./StoreButtons";

export default function FinalCta() {
  return (
    <section className="section--tight" aria-label="Download Tring">
      <div className="final reveal">
        <h2>Let it ring.<br />Ring&rsquo;s got it.</h2>
        {/* Qualifying, not persuading. Finding early users is a search problem —
            this paragraph is the filter. Someone who gets two spam calls a month
            should read this and leave; they would install, never come back, and
            teach us nothing. The person who counts spam in calls-per-day is the
            one worth all of our attention. */}
        <p>
          If more of your calls are spam than real, this was built for you. Ring picks
          them up, talks to them in their language, and hands you one line about what
          they wanted. You keep your number and your attention.
        </p>
        <StoreButtons onDark placement="final" />
        <p className="final__tiny">
          Live on Google Play · iPhone still invite-only, and we onboard those by hand
        </p>
      </div>
    </section>
  );
}
