// Ring — the Tring mascot. Built from the brand mark: a friendly dot with
// eyes and a smile. States: idle (blinks), talking (open mouth, on a call),
// happy (celebrating), sleeping (quiet hours). Fill follows the theme accent.
export function Ring({ size = 100, state = "idle", animated = true, style, className = "" }) {
  const cls = ["ring-mascot", animated ? "ring-breathe" : "", className].filter(Boolean).join(" ");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cls}
      style={style}
      role="img"
      aria-label="Ring, the Tring assistant"
    >
      <circle cx="50" cy="58" r="30" fill="var(--coral)" />

      {state === "happy" ? (
        <>
          <path d="M36 54 Q40 58 44 54" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M56 54 Q60 58 64 54" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M42 68 Q50 77 58 68" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <g className={animated ? "ring-eyes" : ""}>
            <circle cx="40" cy="56" r="5.5" fill="#fff" />
            <circle cx="60" cy="56" r="5.5" fill="#fff" />
            <circle cx="41.5" cy="57" r="2.6" fill="#0B1524" />
            <circle cx="61.5" cy="57" r="2.6" fill="#0B1524" />
          </g>
          {state === "talking" ? (
            <ellipse cx="50" cy="71" rx="4.5" ry="5.5" fill="#fff" />
          ) : (
            <path d="M44 70 Q50 75 56 70" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
          {state === "sleeping" && (
            <text x="70" y="40" fill="var(--coral)" fontSize="16" fontWeight="800" className="ring-zzz">z</text>
          )}
        </>
      )}
    </svg>
  );
}

export default Ring;
