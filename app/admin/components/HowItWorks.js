"use client";
import React from "react";
import { useReducedMotion, useInView } from "./motion";

/**
 * HOW THE PRODUCT MAKES THE NUMBERS ABOVE.
 *
 * Every figure on this page is the residue of one physical event: somebody's phone rang, it was
 * forwarded, Ring answered, and a note was written. The dashboard shows the residue and never the
 * event, so "activation" and "retained" read as accounting categories rather than as things that
 * happened to a person — and a reader who has not personally used the product cannot tell which
 * number would move if the app got better.
 *
 * So this animates the actual sequence and, at each beat, names the metric that beat produces.
 * The point is the LAST line of each step: caller rings produces nothing measurable; Ring
 * answering is what "calls answered" counts; the owner opening the note is a different event
 * again. Three steps, three different tiles above, and the gaps between them are where the funnel
 * loses people.
 *
 * Built as inline SVG and CSS keyframes: no animation library, nothing to load, and it costs
 * nothing on a dashboard that already fetches nine endpoints. prefers-reduced-motion drops
 * straight to the final frame — the diagram is legible standing still, which is the test for
 * whether the motion was carrying meaning or decorating it.
 */

const CORAL = "#F4532E", GREEN = "#5CD98A", AMBER = "#E7B75A";
const INK = "#e6edf3", MUTED = "#9aa4b2", FAINT = "#5b6673";

/** A face. Deliberately simple — two dots and a curve read as a person at 40px. */
function Face({ fill, mood = "neutral", ring = false }) {
  return (
    <g>
      {ring && <circle cx="0" cy="0" r="30" fill="none" stroke={fill} strokeWidth="1.5" opacity=".35" className="hiw-halo" />}
      <circle cx="0" cy="0" r="21" fill={fill} />
      <circle cx="-7" cy="-3" r="2.6" fill="#0B0B0C" />
      <circle cx="7" cy="-3" r="2.6" fill="#0B0B0C" />
      {mood === "happy"
        ? <path d="M-8 6 Q0 13 8 6" stroke="#0B0B0C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        : mood === "cross"
        ? <path d="M-8 9 Q0 3 8 9" stroke="#0B0B0C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        : <path d="M-7 7 L7 7" stroke="#0B0B0C" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
    </g>
  );
}

const STEPS = [
  {
    k: "ring",
    title: "An unknown number calls",
    body: "Their phone is forwarded to Ring, so it never rings in the owner's pocket.",
    metric: "Counts toward nothing yet",
    metricNote: "A call that arrives is not a call that was handled — this beat produces no tile.",
    tone: FAINT,
  },
  {
    k: "answer",
    title: "Ring answers and screens",
    body: "It asks who is calling and why, declines sales, and takes a message.",
    metric: "→ Calls answered",
    metricNote: "This is the beat “calls answered” counts, and the one “activated” needs once.",
    tone: CORAL,
  },
  {
    k: "note",
    title: "The owner reads the note",
    body: "A short summary, never the raw transcript — who called, what they wanted, what to do.",
    metric: "→ screened_call_viewed",
    metricNote: "A separate event. Someone can be activated and never open the note.",
    tone: AMBER,
  },
  {
    k: "keep",
    title: "It happens again, on five separate days",
    body: "The product has stopped being a demo and become a habit.",
    metric: "→ Retained",
    metricNote: "The only cohort whose opinion of the product is worth weighting.",
    tone: GREEN,
  },
];

export default function HowItWorks() {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView(0.2);
  const [step, setStep] = React.useState(reduced ? STEPS.length - 1 : 0);
  const [playing, setPlaying] = React.useState(true);

  // Advance only while visible: an animation looping in a scrolled-past section is a wakelock on
  // a page someone leaves open all day.
  React.useEffect(() => {
    if (reduced || !seen || !playing) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), step === 0 ? 2200 : 2800);
    return () => clearTimeout(t);
  }, [step, seen, playing, reduced]);

  const cur = STEPS[step];

  return (
    <div ref={ref} style={{ border: "1px solid #23262b", borderRadius: 14, padding: 18,
                            background: "linear-gradient(160deg,#101114,#0B0B0C)", marginTop: 22 }}>
      <style>{`
        @keyframes hiw-halo { 0%{transform:scale(1);opacity:.35} 70%{transform:scale(1.55);opacity:0} 100%{opacity:0} }
        .hiw-halo { animation: hiw-halo 1.6s ease-out infinite; }
        @keyframes hiw-travel { from { transform: translateX(0); opacity:0 } 15%{opacity:1} 85%{opacity:1} to { transform: translateX(150px); opacity:0 } }
        .hiw-travel { animation: hiw-travel 1.9s ease-in-out infinite; }
        @keyframes hiw-pop { from { transform: scale(.6); opacity:0 } to { transform: scale(1); opacity:1 } }
        .hiw-pop { animation: hiw-pop .45s cubic-bezier(.2,.9,.3,1.3) both; }
        @keyframes hiw-tick { from { stroke-dashoffset: 26 } to { stroke-dashoffset: 0 } }
        .hiw-tick { stroke-dasharray: 26; animation: hiw-tick .5s ease-out .1s both; }
        @media (prefers-reduced-motion: reduce) {
          .hiw-halo, .hiw-travel, .hiw-pop, .hiw-tick { animation: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>
          How a call becomes a number
        </h2>
        <span style={{ fontSize: 11.5, color: MUTED }}>
          every tile above is the residue of this sequence
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setPlaying((p) => !p)}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,.14)",
                         color: MUTED, borderRadius: 7, padding: "3px 9px", fontSize: 11, cursor: "pointer" }}>
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      {/* ── the stage ─────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <svg viewBox="0 0 460 150" style={{ width: "100%", minWidth: 380, maxWidth: 620, display: "block" }}
             role="img" aria-label={`Step ${step + 1} of ${STEPS.length}: ${cur.title}`}>
          {/* the line they all stand on */}
          <line x1="40" y1="112" x2="420" y2="112" stroke="#23262b" strokeWidth="1.5" />

          {/* caller */}
          <g transform="translate(70,70)">
            <Face fill={step === 0 ? CORAL : "#4a5058"} mood="cross" ring={step === 0 && !reduced} />
            <text x="0" y="52" textAnchor="middle" fontSize="10.5" fill={step === 0 ? INK : FAINT}>Caller</text>
          </g>

          {/* the call travelling to Ring */}
          {step === 0 && !reduced && (
            <g className="hiw-travel">
              <circle cx="110" cy="70" r="4" fill={CORAL} />
            </g>
          )}

          {/* Ring — the assistant */}
          <g transform="translate(230,70)">
            <Face fill={step >= 1 ? GREEN : "#4a5058"} mood="happy" ring={step === 1 && !reduced} />
            {/* headset, so it reads as the thing that answers rather than another person */}
            <path d="M-24 -4 A24 24 0 0 1 24 -4" fill="none" stroke={step >= 1 ? GREEN : "#4a5058"} strokeWidth="3" strokeLinecap="round" />
            <rect x="-29" y="-6" width="7" height="13" rx="3" fill={step >= 1 ? GREEN : "#4a5058"} />
            <rect x="22" y="-6" width="7" height="13" rx="3" fill={step >= 1 ? GREEN : "#4a5058"} />
            <text x="0" y="52" textAnchor="middle" fontSize="10.5" fill={step >= 1 ? INK : FAINT}>Ring</text>
          </g>

          {/* the note travelling to the owner */}
          {step === 2 && !reduced && (
            <g className="hiw-travel" style={{ animationDuration: "1.6s" }}>
              <rect x="268" y="62" width="14" height="11" rx="2" fill={AMBER} />
            </g>
          )}

          {/* owner */}
          <g transform="translate(390,70)">
            <Face fill={step >= 2 ? AMBER : "#4a5058"} mood={step >= 2 ? "happy" : "neutral"} ring={step === 2 && !reduced} />
            <text x="0" y="52" textAnchor="middle" fontSize="10.5" fill={step >= 2 ? INK : FAINT}>Owner</text>
          </g>

          {/* five days — only on the last beat */}
          {step === 3 && (
            <g className="hiw-pop">
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} transform={`translate(${196 + i * 22},128)`}>
                  <circle cx="0" cy="0" r="8" fill="none" stroke={GREEN} strokeWidth="1.5" />
                  <path className="hiw-tick" d="M-3.5 0 L-1 2.6 L4 -3" fill="none" stroke={GREEN}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* ── the caption, which is the actual payload ──────────────────────────────── */}
      <div key={cur.k} className={reduced ? "" : "hiw-pop"} style={{ marginTop: 6 }}>
        <div style={{ color: "#fff", fontSize: 14.5, fontWeight: 650 }}>{cur.title}</div>
        <div style={{ color: MUTED, fontSize: 12.5, marginTop: 2, lineHeight: 1.5 }}>{cur.body}</div>
        <div style={{ marginTop: 7, display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ color: cur.tone, fontSize: 11.5, fontWeight: 700,
                         border: `1px solid ${cur.tone}44`, background: `${cur.tone}14`,
                         borderRadius: 6, padding: "2px 7px" }}>
            {cur.metric}
          </span>
          <span style={{ color: FAINT, fontSize: 11.5, lineHeight: 1.5 }}>{cur.metricNote}</span>
        </div>
      </div>

      {/* step dots — also the control, so someone can stop on the beat they care about */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {STEPS.map((st, i) => (
          <button key={st.k} onClick={() => { setStep(i); setPlaying(false); }}
                  aria-label={st.title}
                  style={{ height: 4, flex: 1, borderRadius: 3, border: 0, cursor: "pointer", padding: 0,
                           background: i === step ? st.tone : "rgba(255,255,255,.10)",
                           transition: "background .3s ease" }} />
        ))}
      </div>
    </div>
  );
}
