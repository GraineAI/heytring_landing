/**
 * The Tring wordmark — Lotus Garden.
 *
 * Poppins ExtraBold, skewed -9°, with a square-dot i, a notched g, and a
 * stacked mint→purple extrusion. Straight off the icon sheet.
 *
 * Every measurement is in `em` so a single `size` (the font-size in px) scales
 * the whole lockup — extrusion offsets, the i's dot and stem, the g's notch.
 * The design sheet specifies it at 56px; the ratios below are that drawing
 * divided by 56, which is why they look like odd decimals.
 *
 * Two things are genuinely load-bearing:
 *  - `surface` is the colour BEHIND the mark. The g's notch is a knockout, not
 *    a shape, so it has to be painted in the background colour or the letter
 *    fills in and reads as a lowercase q.
 *  - The extrusion is text-shadow at zero blur. Blurring it turns a solid
 *    3D lift into a drop shadow, which is a different brand.
 */

const MINT = "#7FD1B9";
const PURPLE = "#A98BC9";

export default function Wordmark({
  size = 34,
  tone = "coral", // coral (on light) | white (on dark/coral) | ink (monochrome)
  surface = "var(--card)",
  className = "",
  style,
}) {
  const ink = tone === "white" ? "#FFFDFB" : tone === "ink" ? "var(--ink)" : "var(--coral)";
  const mono = tone === "ink";
  const shadow = mono
    ? "none"
    : `${0.054}em ${0.054}em 0 ${MINT}, ${0.107}em ${0.107}em 0 ${PURPLE}`;

  return (
    <span
      className={`wm ${className}`}
      style={{
        // `size: null` hands sizing to CSS. An inline font-size beats any
        // stylesheet rule, so a fixed number here would pin the mark at one
        // width on every screen — which is exactly how the footer sign-off
        // ended up 612px wide on a 390px phone.
        ...(size == null ? null : { fontSize: size }),
        color: ink,
        textShadow: shadow,
        ...style,
      }}
      role="img"
      aria-label="Tring"
    >
      <span aria-hidden="true" className="wm__in">
        t<span className="wm__r">r</span>
        {/* the i, drawn rather than typed: square dot over a square stem */}
        <span className="wm__i">
          <i
            className="wm__dot"
            style={{ background: mono ? "currentColor" : MINT, boxShadow: mono ? "none" : `0.054em 0.054em 0 ${PURPLE}` }}
          />
          <i
            className="wm__stem"
            style={{ background: "currentColor", boxShadow: shadow === "none" ? "none" : `0.054em 0.054em 0 ${MINT}, 0.107em 0.107em 0 ${PURPLE}` }}
          />
        </span>
        n
        <span className="wm__g">
          g<i className="wm__notch" style={{ background: surface }} />
        </span>
      </span>
    </span>
  );
}

/**
 * The app icon: the wordmark on its coral squircle, with the mint bar.
 * Same artwork as public/icon and the store listing, so the tab, the OG card
 * and the phone home screen are all the one mark.
 */
export function AppIcon({ size = 64, radius = 0.225, className = "", style }) {
  return (
    <span
      className={`appicon ${className}`}
      style={{ width: size, height: size, borderRadius: size * radius, ...style }}
      role="img"
      aria-label="Tring"
    >
      <span className="appicon__sheen" aria-hidden="true" />
      <Wordmark size={size * 0.345} tone="white" surface="#F5261A" style={{ position: "relative", zIndex: 2 }} />
      <span className="appicon__bar" aria-hidden="true" />
    </span>
  );
}
