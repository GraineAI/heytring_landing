// The Tring app mark — identical artwork to the browser-tab icon
// (app/icon.svg): coral tile, white phone glyph, peach call-waves.
export default function Logo({ size = 36, radius = 11, style, className = "" }) {
  const r = (radius / 64) * 64; // keep icon's 16/64 corner ratio at any size
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
      <rect width="64" height="64" rx={r} fill="#F0472A" />
      <g fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 17 L27 18 L29.5 26 L25 29 A22 22 0 0 0 35 39 L38 34.5 L46 37 L47 41 C47 43.5 45 45.5 42.5 45.5 A31 31 0 0 1 18.5 21.5 C18.5 19 20.5 17 23 17 Z" />
      </g>
      <g fill="none" stroke="#FBD5C4" strokeWidth="2.6" strokeLinecap="round" opacity="0.9">
        <path d="M44 20 a10 10 0 0 1 0 12" />
        <path d="M48 16 a16 16 0 0 1 0 20" />
      </g>
    </svg>
  );
}
