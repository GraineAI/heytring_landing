import { Fork, Calendar, Tools, Receipt, PhoneOut, ChevRight } from "./Icons";
import { PLAY_URL } from "./StoreButtons";

const errands = [
  { ic: <Fork width={20} height={20} />, h: "Restaurant tables", p: "The place that never picks up. Ring keeps trying until it books your table." },
  { ic: <Calendar width={20} height={20} />, h: "Doctor & clinic", p: "Ring finds the next open slot and books it under your name." },
  { ic: <Tools width={20} height={20} />, h: "Chasing vendors", p: "The plumber, the electrician, the painter. Ring follows up so you don't." },
  { ic: <Receipt width={20} height={20} />, h: "Support & refunds", p: "Ring waits on hold with Swiggy, Blinkit or Airtel and gets it sorted." },
];

export default function AskRing() {
  return (
    <section className="ask section" id="ask">
      <div className="wrap ask__grid">
        <div>
          <span className="eyebrow">The other direction</span>
          <h2 style={{ fontSize: "clamp(30px,4.4vw,46px)", marginTop: 16 }}>
            Or just ask Ring to call.
          </h2>
          <p className="lead" style={{ marginTop: 18 }}>
            Tell Ring who to call and what you need. It dials, sits through the hold music,
            talks to the right person, and pings you when it&rsquo;s done. The calls you
            keep putting off, finally off your plate.
          </p>

          <div style={{ marginTop: 26, background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 18, padding: 18 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".1em", color: "var(--muted-2)", textTransform: "uppercase" }}>You said</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, margin: "8px 0 14px" }}>
              &ldquo;Call the chemist and check if my meds are ready.&rdquo;
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--coral-deep)", fontWeight: 600, fontSize: 14 }}>
              <PhoneOut width={17} height={17} /> Ring is calling Apollo Pharmacy… <ChevRight />
            </div>
          </div>

          <a className="btn btn--coral" href={PLAY_URL} style={{ marginTop: 24 }}>
            Try Ask Ring — free <ChevRight />
          </a>
        </div>

        <div className="errands">
          {errands.map((e) => (
            <article className="errand" key={e.h}>
              <span className="errand__ic">{e.ic}</span>
              <h4>{e.h}</h4>
              <p>{e.p}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
