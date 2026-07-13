import StoreButtons from "./StoreButtons";

export default function FinalCta() {
  return (
    <section className="section--tight" aria-label="Download Tring">
      <div className="final">
        <h2>Let it ring.<br />Ring&rsquo;s got it.</h2>
        <p>
          Stop bracing for every unknown number. Download Tring, switch Ring on, and get
          your attention back — free, in the voice of your choice.
        </p>
        <StoreButtons onDark />
        <p className="final__tiny">Free · English + Hindi · For users 18 and older</p>
      </div>
    </section>
  );
}
