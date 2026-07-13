import { Globe, Shield, Wave, Bell } from "./Icons";

export default function Strip() {
  return (
    <section className="strip" aria-label="At a glance">
      <div className="wrap strip__in">
        <span className="strip__item"><Globe width={16} height={16} /> Answers in the caller&rsquo;s language</span>
        <span className="strip__item"><Wave width={16} height={16} /> Can answer in your own voice</span>
        <span className="strip__item"><Bell width={16} height={16} /> Live transcript, one-tap take over</span>
        <span className="strip__item"><Shield width={16} height={16} /> Your private calls are never stored</span>
      </div>
    </section>
  );
}
