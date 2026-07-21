/**
 * Preloader — Swish's "Logo Reveal" in Tring coral (see DESIGN.md §1).
 * Server-rendered so the branded screen is the literal first paint, and
 * animated with pure CSS (globals.css) so it runs — and finishes — even
 * before hydration or with JS disabled:
 *   ghost wordmark at 20% → full copy fills left→right via clip-path (1s)
 *   → gradient fades (0.5s) while the mark slides up (1s) → hidden.
 * Homepage only. prefers-reduced-motion hides it entirely.
 */

function Wordmark() {
  return (
    <span className="loader__wm" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        <g stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 17 L27 18 L29.5 26 L25 29 A22 22 0 0 0 35 39 L38 34.5 L46 37 L47 41 C47 43.5 45 45.5 42.5 45.5 A31 31 0 0 1 18.5 21.5 C18.5 19 20.5 17 23 17 Z" />
        </g>
        <g stroke="#fff" strokeWidth="3.4" strokeLinecap="round" opacity="0.85" fill="none">
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
          <div className="loader__ghost"><Wordmark /></div>
          <div className="loader__fill"><Wordmark /></div>
        </div>
      </div>
    </div>
  );
}
