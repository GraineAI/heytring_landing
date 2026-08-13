"use client";
import React from "react";

/**
 * PAPER — the design language for the Weekly Business Review.
 *
 * Amazon's WBR deck was printed and read in silence for the first twenty minutes of the meeting.
 * That is the object this is trying to be, and it is why almost none of the usual dashboard
 * furniture appears here. No cards. No rounded translucent boxes, no tinted pill badges, no
 * gradients, no glow, no drop shadows, no emoji, no colour-coded status dots. Every one of those
 * is a device for making a screen look busy, and a document that will be read in silence has the
 * opposite requirement.
 *
 * What does the work instead is what does the work in print: a measured column, hairline rules,
 * real typographic hierarchy, and tabular figures that line up down the page so the eye can
 * compare a column of numbers without reading any of them.
 *
 * Colour carries exactly one meaning. Black is data, grey is context, and the oxide red is an
 * exception — a mark in the margin, the way someone reading a printout marks the line they intend
 * to ask about. Nothing else is ever red, so red always means the same thing.
 */

export const P = {
  paper:   "#FBF9F4",
  ink:     "#17150F",
  ink2:    "#4A463C",
  ink3:    "#8A8474",
  rule:    "#DED8C9",
  ruleInk: "#17150F",
  mark:    "#A8321E",   // exceptions only
  good:    "#2F5D3A",   // box scores only
  prior:   "#9C9686",   // the prior-period line — dark enough to survive print
};

/** Display face for headings and figures; the data face is the system grotesque. */
export const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
export const SANS  = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
export const NUM   = { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' };

/** Small caps label. Letterspaced, never bold — bold at 10px is a smudge. */
export function Label({ children, tone = P.ink3, style }) {
  return (
    <div style={{ fontFamily: SANS, fontSize: 9.5, letterSpacing: ".13em", textTransform: "uppercase",
                  color: tone, ...style }}>
      {children}
    </div>
  );
}

/** A hairline. `weight="strong"` for the rule under a section number. */
export function Rule({ weight, style }) {
  return <div style={{ height: 0, borderTop: `${weight === "strong" ? 1.5 : 1}px solid ${weight === "strong" ? P.ruleInk : P.rule}`, ...style }} />;
}

/**
 * A numbered page of the deck. The number is set in the display face at a size that would be
 * absurd on a dashboard and is exactly right on a document — it is how you find your place in a
 * printout when someone says "page four".
 */
export function Page({ n, title, note, children, id }) {
  return (
    <section id={id} style={{ marginTop: 46, breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1, color: P.ink, ...NUM }}>{n}</span>
        <h2 style={{ fontFamily: SANS, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase",
                     fontWeight: 700, color: P.ink, margin: 0 }}>
          {title}
        </h2>
        <div style={{ flex: 1 }} />
        {note && <span style={{ fontFamily: SANS, fontSize: 10.5, color: P.ink3 }}>{note}</span>}
      </div>
      <Rule weight="strong" style={{ marginTop: 7 }} />
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

/**
 * A line flagged for discussion. The mark sits in the MARGIN, left of the content, the way a
 * reader's pen would — rather than recolouring the row, which would make the exception compete
 * with the data instead of pointing at it.
 */
export function Marked({ on, children }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ width: 2, flex: "0 0 2px", background: on ? P.mark : "transparent" }} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/** Delta for a box score. Sign always shown; direction interpreted, never assumed. */
export function Delta({ value, invert, digits = 0 }) {
  if (value == null || !isFinite(value)) return <span style={{ color: P.ink3 }}>—</span>;
  const flat = Math.abs(value) < 0.5;
  const good = invert ? value < 0 : value > 0;
  return (
    <span style={{ color: flat ? P.ink3 : good ? P.good : P.mark, ...NUM }}>
      {value > 0 ? "+" : value < 0 ? "−" : ""}{Math.abs(value).toFixed(digits)}%
    </span>
  );
}
