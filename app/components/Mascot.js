// The Tring characters, matched 1:1 to the app's artwork (see the app
// prototype): warm coral #F4532E face, white eyes with warm-graphite
// #1B1512 pupils.
//
//  • Ring — answers your calls. States: idle (blinks), talking (open
//    mouth), happy (celebrating), sleeping (quiet hours).
//  • Orbit — the setup checker: outlined face with a little dot forever
//    orbiting it. Shows up wherever Tring is "making sure things work".
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
            <circle cx="41.5" cy="57" r="2.6" fill="#1B1512" />
            <circle cx="61.5" cy="57" r="2.6" fill="#1B1512" />
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

export function Orbit({ size = 56, onDark = false, style, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={style}
      role="img"
      aria-label="Orbit, the Tring setup checker"
    >
      <circle cx="50" cy="50" r="30" fill={onDark ? "#2A211B" : "#fff"} stroke="var(--coral)" strokeWidth="7" />
      <circle cx="43" cy="48" r="4" fill={onDark ? "#fff" : "#1B1512"} />
      <circle cx="57" cy="48" r="4" fill={onDark ? "#fff" : "#1B1512"} />
      <path d="M44 60 Q50 64 56 60" stroke={onDark ? "#fff" : "#1B1512"} strokeWidth="3" fill="none" strokeLinecap="round" />
      <g className="orbit-spin">
        <circle cx="50" cy="8" r="5" fill="var(--coral)" />
      </g>
    </svg>
  );
}

export default Ring;
