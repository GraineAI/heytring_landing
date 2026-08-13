"use client";
import React from "react";
import { P, SERIF, SANS, NUM, Label, Rule, Delta } from "./paper";

/**
 * THE 6-12 — one figure format, used for every trend in the deck.
 *
 * "A good deck uses consistent formatting throughout — the graph design, time periods covered,
 * colour palette, symbol set, and the same number of charts on every page wherever possible."
 * The value is not in the shape, it is in the SAMENESS: a reader who learns to read one of these
 * reads all of them, and after a few weeks spots the odd one out without reading any of them.
 *
 * Two things here that a sparkline does not do, both of them the point:
 *
 * 1. THE PRIOR PERIOD, IN GREY, BEHIND. A single line tells you the shape of six weeks and
 *    nothing about whether that shape is normal. The same six weeks a period earlier, drawn on
 *    the same axes, turns "signups fell" into either "signups fell as they always do in this part
 *    of the month" or "signups fell and they have never done that before". Amazon draws prior
 *    year; six weeks of history is what exists here, so it draws the prior six weeks and says so.
 *
 * 2. A BOX SCORE, not a delta chip. Three ratios in a ruled row, in tabular figures, so they line
 *    up down the page across every figure in the deck and can be scanned as a column.
 *
 * The right-hand pane holds trailing 12 months and appears only once there are twelve months to
 * put in it. Until then it states what it is waiting for. A permanently empty pane in the most
 * repeated format on the page teaches people to stop looking at the format.
 */

const W = 260, H = 78, PAD = 6;

function pct(a, b) {
  if (a == null || b == null || b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

/** One pane. `prior` is drawn first, in grey, on the SAME scale — otherwise it is decoration. */
function Pane({ points, prior, label, empty, axis }) {
  const real = (points || []).filter((p) => p && p.value != null);
  if (real.length < 2) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <Label style={{ fontSize: 8.5 }}>{label}</Label>
        <div style={{ fontFamily: SANS, fontSize: 10.5, color: P.ink3, padding: "18px 0 6px" }}>{empty}</div>
      </div>
    );
  }
  const all = [...real.map((p) => p.value), ...(prior || []).filter((p) => p?.value != null).map((p) => p.value)];
  const max = Math.max(...all, 1), min = Math.min(...all, 0);
  const n = Math.max(points.length, (prior || []).length, 2);
  const x = (i) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const y = (v) => H - PAD - ((v - min) / Math.max(1e-9, max - min)) * (H - PAD * 2);

  const path = (pts) => {
    let d = "", open = false;
    (pts || []).forEach((p, i) => {
      if (!p || p.value == null) { open = false; return; }
      d += `${open ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
      open = true;
    });
    return d.trim();
  };

  const lastI = real.length ? points.map((p, i) => (p?.value != null ? i : -1)).filter((i) => i >= 0).pop() : null;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Label style={{ fontSize: 8.5 }}>{label}</Label>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block", marginTop: 3 }}
           aria-hidden="true">
        <line x1="0" y1={H - PAD} x2={W} y2={H - PAD} stroke={P.rule} strokeWidth="1" />
        {prior?.length ? (
          <path d={path(prior)} fill="none" stroke={P.prior} strokeWidth="1.3" strokeDasharray="3 2.5"
                strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        <path d={path(points)} fill="none" stroke={P.ink} strokeWidth="1.6"
              strokeLinejoin="round" strokeLinecap="round" />
        {lastI != null && <circle cx={x(lastI)} cy={y(points[lastI].value)} r="2.6" fill={P.ink} />}
      </svg>
      {axis && (
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 8,
                      color: P.ink3, letterSpacing: ".06em", marginTop: 1 }}>
          <span>{axis[0]}</span><span>{axis[1]}</span>
        </div>
      )}
    </div>
  );
}

/**
 * @param kind    "input" | "output" — set as a word, not a badge. An input is a lever and an
 *                output is a score, and reading them the same way is how a team ends up working
 *                on the number that cannot be worked on.
 * @param invert  true when DOWN is good (deletions, failures, latency).
 */
export default function Figure({ title, kind = "output", unit = "", weeks = [], months = [],
                                 invert = false, note, value, exception }) {
  const w = (weeks || []).filter((p) => p && p.value != null);
  const cur = value ?? (w.length ? w[w.length - 1].value : null);

  // The prior comparable period: the six weeks before the six on the chart. Only drawn when the
  // history genuinely holds both — half a prior period drawn as a whole one is worse than none.
  const span = Math.min(6, Math.max(2, weeks.length ? Math.ceil(weeks.length / 2) : 6));
  const hasPrior = weeks.length >= span * 2;
  const current = hasPrior ? weeks.slice(-span) : weeks;
  const prior = hasPrior ? weeks.slice(-span * 2, -span) : null;

  const wow = w.length >= 2 ? pct(w[w.length - 1].value, w[w.length - 2].value) : null;
  const mom = w.length >= 5 ? pct(w[w.length - 1].value, w[w.length - 5].value) : null;
  const sum = (a) => (a || []).reduce((t, p) => t + (p?.value ?? 0), 0);
  const vsPrior = hasPrior ? pct(sum(current), sum(prior)) : null;

  const monthsReal = (months || []).filter((p) => p?.value != null);
  const showMonths = monthsReal.length >= 6;

  return (
    <figure style={{ margin: 0, breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: P.ink, letterSpacing: ".01em" }}>
          {title}
        </span>
        <span style={{ fontFamily: SANS, fontSize: 8.5, letterSpacing: ".13em", textTransform: "uppercase",
                       color: kind === "input" ? P.ink2 : P.ink3 }}>
          {kind === "input" ? "input" : "output"}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: SERIF, fontSize: 21, color: exception ? P.mark : P.ink, ...NUM }}>
          {cur == null ? "—" : typeof cur === "number" ? cur.toLocaleString("en-IN") : cur}{unit}
        </span>
      </div>
      <Rule style={{ marginTop: 5 }} />

      {/* The 12-month pane appears when there are twelve months to put in it, and until then the
          6-week pane takes the whole width rather than sharing it with a placeholder. Reserving
          half a figure for a chart that cannot exist yet squeezed the one real chart into a third
          of the column and made its line unreadable — which defeats the entire figure. */}
      <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
        <Pane points={current} prior={prior} axis={[`${span} wks ago`, "now"]}
              label={hasPrior ? `last ${span} weeks — dashed is the prior ${span}` : `trailing ${weeks.length || 6} weeks`}
              empty="collecting" />
        {showMonths && <Pane points={months} axis={["12 mo ago", "now"]} label="trailing 12 months" empty="collecting" />}
      </div>

      {/* BOX SCORE. Ruled, tabular, same three columns on every figure in the deck. */}
      <Rule style={{ marginTop: 8 }} />
      <div style={{ display: "flex", gap: 0, fontFamily: SANS, fontSize: 10, paddingTop: 5 }}>
        {[["WoW", wow], ["MoM", mom], [hasPrior ? `vs prior ${span}w` : "vs prior", vsPrior]].map(([k, v]) => (
          <div key={k} style={{ flex: 1 }}>
            <div style={{ color: P.ink3, fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase" }}>{k}</div>
            <div style={{ marginTop: 1 }}><Delta value={v} invert={invert} /></div>
          </div>
        ))}
      </div>
      {note && (
        <figcaption style={{ fontFamily: SANS, fontSize: 9.5, color: P.ink3, marginTop: 5, lineHeight: 1.45 }}>
          {note}
        </figcaption>
      )}
    </figure>
  );
}
