/**
 * The Tring app mark — the same artwork as the browser-tab icon (app/icon.svg)
 * and the store listing, so the tab, the nav, the OG card and the phone home
 * screen all carry one mark.
 *
 * A coral tile with a white `t`. One colour, no extrusion: the redesign spends
 * the accent on a single "act" control per screen, and a three-colour logo
 * competes with the button you actually want pressed.
 *
 * The `t` is drawn as paths rather than set as text because an SVG that ships
 * to a favicon rasteriser, an OG card renderer and the browser all at once
 * cannot rely on a webfont having loaded.
 */
export default function Logo({ size = 36, radius = 18, style, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={style}
      role="img"
      aria-label="Tring"
    >
      <rect width="64" height="64" rx={radius} fill="#F4532E" />
      <g fill="#FFFFFF">
        <path d="M15 25h34v8.5H15z" />
        <path d="M26.5 12h10.5v26.5c0 4 2.9 6.4 6.9 6.1l1.2 8.3c-10.9 1.2-19-5.3-19-14.4V12z" />
      </g>
    </svg>
  );
}
