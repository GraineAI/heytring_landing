/**
 * Preloader — Swish's "Logo Reveal" in Tring coral (see DESIGN.md §1),
 * built from the actual brand asset: the app-icon artwork (tile, phone
 * glyph, call waves — exact paths from app/icon.svg) plus the wordmark,
 * in white on the coral gradient — just as Swish uses its white wordmark
 * SVG on the green gradient.
 *
 * Server-rendered and pure CSS (globals.css) so it plays from first
 * paint, before hydration:
 *   ghost lockup at 20% → full copy fills left→right via clip-path (1s)
 *   → gradient fades (0.5s) while the mark slides up (1s) → hidden.
 * Homepage only. prefers-reduced-motion hides it entirely.
 */

function Lockup() {
  return (
    <span className="loader__wm" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        {/* the tile, as a white outline */}
        <rect x="2" y="2" width="60" height="60" rx="15" stroke="#fff" strokeWidth="3.5" />
        {/* phone glyph — exact path from app/icon.svg */}
        <g stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 17 L27 18 L29.5 26 L25 29 A22 22 0 0 0 35 39 L38 34.5 L46 37 L47 41 C47 43.5 45 45.5 42.5 45.5 A31 31 0 0 1 18.5 21.5 C18.5 19 20.5 17 23 17 Z" />
        </g>
        {/* call waves — exact paths from app/icon.svg */}
        <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.9">
          <path d="M44 20 a10 10 0 0 1 0 12" />
          <path d="M48 16 a16 16 0 0 1 0 20" />
        </g>
      </svg>
      <span>Tring</span>
    </span>
  );
}

export default function Preloader() {
  return (
    <div className="loader" role="status" aria-label="Tring is loading">
      <div className="loader__bg" />
      <div className="loader__inner">
        <div className="loader__mark">
          <div className="loader__ghost"><Lockup /></div>
          <div className="loader__fill"><Lockup /></div>
        </div>
      </div>
    </div>
  );
}
