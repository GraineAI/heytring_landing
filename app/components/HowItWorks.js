import { Orbit } from "./Mascot";

/** How it works, Swish-style: one bold statement instead of a card grid. */
export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="head head--center reveal">
          <span className="eyebrow">How it works</span>
          <h2>Answer nothing. Miss nothing.</h2>
          <p className="lead">
            You don&rsquo;t pick up — your carrier diverts the call to Ring.
            Watch the live transcript, take over anytime, get the note when it
            ends. <b>It calls for you too.</b>
          </p>
        </div>

        <div className="orbitline reveal">
          <Orbit size={46} />
          <p>
            <b>Orbit</b> checks your setup on its own — forwarding on,
            connected, test call works — so Ring just works.
          </p>
        </div>
      </div>
    </section>
  );
}
