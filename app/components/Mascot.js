// The Tring characters — Lotus Garden artwork, matched to the app's own sheet.
//
//  • Ring — answers your calls. A glossy coral sphere: a deep #9C0D05 body
//    sitting a couple of units behind and below the lit one, so the face reads
//    as a ball with weight rather than a flat disc. States: idle (blinks),
//    talking (open mouth), happy (celebrating), sleeping (quiet hours).
//  • Orbit — the setup checker: outlined face with a little dot forever
//    orbiting it. Shows up wherever Tring is "making sure things work".
//
// The gradient ids are fixed rather than generated per instance. Several Rings
// on one page therefore emit duplicate ids — harmless here, because every
// definition is byte-identical, so whichever the document resolves to paints
// the same pixels. Generating them would force this into a client component
// for no visual gain.
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
      <defs>
        <radialGradient id="ringBody" cx="34%" cy="26%" r="78%">
          <stop offset="0" stopColor="#FFA694" />
          <stop offset="46%" stopColor="#F5261A" />
          <stop offset="100%" stopColor="#A50F07" />
        </radialGradient>
        <linearGradient id="ringGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* the body behind the body — this is what makes it a ball */}
      <circle cx="52" cy="61" r="30" fill="#9C0D05" />
      <circle cx="50" cy="58" r="30" fill="url(#ringBody)" />
      <path d="M24 46a30 30 0 0 1 52 0a30 30 0 0 0-52 0z" fill="url(#ringGloss)" />

      {state === "happy" ? (
        <>
          <path d="M36 53 Q40 57 44 53" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M56 53 Q60 57 64 53" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M42 68 Q50 77 58 68" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <g className={animated ? "ring-eyes" : ""}>
            <circle cx="40" cy="55.4" r="5.5" fill="#fff" />
            <circle cx="60" cy="55.4" r="5.5" fill="#fff" />
            <circle className="pupil" cx="41.5" cy="57" r="2.6" fill="#1C120D" />
            <circle className="pupil" cx="61.5" cy="57" r="2.6" fill="#1C120D" />
          </g>
          {state === "talking" ? (
            <ellipse cx="50" cy="71" rx="4.5" ry="5.5" fill="#fff" />
          ) : (
            <path d="M44 70 Q50 75 56 70" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          )}
          {state === "sleeping" && (
            <text x="72" y="38" fill="var(--purple)" fontSize="16" fontWeight="800" className="ring-zzz">z</text>
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
      <circle cx="50" cy="50" r="30" fill={onDark ? "#1C120D" : "#FFFDFB"} stroke="var(--coral)" strokeWidth="7" />
      <circle cx="43" cy="48" r="4" fill={onDark ? "#fff" : "#1C120D"} />
      <circle cx="57" cy="48" r="4" fill={onDark ? "#fff" : "#1C120D"} />
      <path d="M44 60 Q50 64 56 60" stroke={onDark ? "#fff" : "#1C120D"} strokeWidth="3" fill="none" strokeLinecap="round" />
      <g className="orbit-spin">
        <circle cx="50" cy="8" r="5" fill="var(--mint)" />
      </g>
    </svg>
  );
}

export default Ring;
