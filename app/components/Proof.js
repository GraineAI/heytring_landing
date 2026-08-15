import { FIGURES, hasFigures, isCitable } from "../lib/socialProof";

/**
 * The stats strip.
 *
 * Three numbers, set large, doing one job: telling a stranger that other people already made this
 * decision. It is the cheapest credibility on a landing page and the easiest to discredit — which
 * is why every figure here has to be checkable against something outside the marketing site.
 *
 * IT RENDERS NOTHING UNTIL THERE ARE THREE. A strip carrying "169 users" does not read as modest,
 * it reads as evidence that nobody came, printed at 56px in the middle of the page. Below the
 * floor the section removes itself and the page closes up around it — the visitor never learns
 * there was supposed to be one.
 *
 * Deliberately plain, like Pillars: a rule, a number, a label. Chrome here would put three
 * decorated boxes in competition with the one coral control the section exists to feed.
 */
export default function Proof() {
  if (!hasFigures()) return null;
  const figures = FIGURES.filter(isCitable).slice(0, 4);

  return (
    <section className="section--tight proof" aria-label="Tring by the numbers">
      <div className="wrap">
        <div className="proof__grid">
          {figures.map((f) => (
            <div className="proof__item reveal" key={f.label}>
              {/* tabular-nums so the row does not shift as these are updated */}
              <div className="proof__value">{f.value}</div>
              <div className="proof__label">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
