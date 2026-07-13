import { PhoneOut, Tools, Ban, Building, Card, Bell } from "./Icons";

const items = [
  { ic: <PhoneOut width={22} height={22} />, h: "Deliveries that can't find you", p: "Blinkit, Swiggy, Amazon, Zepto. They call when they can't find your flat. Ring gives them directions." },
  { ic: <Tools width={22} height={22} />, h: "Vendor callbacks", p: "The clinic, the electrician, the tailor. They call at the worst times. Ring takes the message." },
  { ic: <Ban width={22} height={22} />, h: "Spam & sales", p: "Loan offers, credit-card upgrades, insurance pitches. Ring screens them so your phone stays quiet." },
  { ic: <Building width={22} height={22} />, h: "Society & building", p: "Guard calling about a visitor, maintenance checking access. Ring handles the standard responses." },
  { ic: <Card width={22} height={22} />, h: "Bank verification", p: "Transaction confirmations, card-dispatch updates. Ring relays only what actually matters to you." },
  { ic: <Bell width={22} height={22} />, h: "The real call you'd have missed", p: "A blanket spam filter blocks the Delhivery driver too. Ring knows the difference and lets the right ones through." },
];

export default function Handles() {
  return (
    <section className="section" id="handles">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">Real calls, handled</span>
          <h2>Your phone can&rsquo;t tell spam from a delivery. Ring can.</h2>
          <p className="lead">
            Ring listens, responds, and only pings you when something needs your attention.
            Everything else just shows up as a tidy note in your history.
          </p>
        </div>

        <div className="cards">
          {items.map((it) => (
            <article className="card" key={it.h}>
              <span className="card__ic">{it.ic}</span>
              <h3>{it.h}</h3>
              <p>{it.p}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
