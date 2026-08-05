/**
 * The Tring app mark — identical artwork to the browser-tab icon (app/icon.svg)
 * and the store listing, so the tab, the nav, the OG card and the phone home
 * screen all carry one mark.
 *
 * Lotus Garden: coral squircle, skewed `t` monogram, mint→purple extrusion,
 * mint bar. The full `tring` wordmark only holds above 76px — below that the
 * icon sheet hands over to this monogram, which is every size we use it at.
 */
export default function Logo({ size = 36, radius = 14, style, className = "" }) {
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
      <defs>
        <linearGradient id="tringTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2A38F" />
          <stop offset=".48" stopColor="#E8735A" />
          <stop offset="1" stopColor="#C4523C" />
        </linearGradient>
        <radialGradient id="tringSheen" cx="26%" cy="20%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity=".4" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <g id="tringT">
          <path d="M14 24h34v9H14z" />
          <path d="M26 11h11v27c0 4 3 6.5 7 6.2l1.2 8.4c-11 1.2-19.2-5.4-19.2-14.6V11z" />
        </g>
      </defs>

      <rect width="64" height="64" rx={radius} fill="url(#tringTile)" />
      <rect width="64" height="64" rx={radius} fill="url(#tringSheen)" />

      <g transform="translate(1,0) skewX(-9)">
        <use href="#tringT" x="4" y="4" fill="#A98BC9" />
        <use href="#tringT" x="2" y="2" fill="#7FD1B9" />
        <use href="#tringT" fill="#FFFDFB" />
      </g>

      <rect x="12" y="53" width="40" height="4" fill="#7FD1B9" transform="skewX(-14) translate(7,0)" />
    </svg>
  );
}
