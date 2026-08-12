"use client";
import React from "react";

/**
 * ONE chart format for every trend metric.
 *
 * Bezos's WBR standard is a 6-12: trailing 6 weeks beside trailing 12 months, with a box score
 * underneath. The value of it is not the shape, it is the SAMENESS — a reader who learns to read
 * one of these can read all of them, and cognitive load drops to zero.
 *
 * WITH ONE DELIBERATE DEVIATION. The 12-month pane needs 12 months. Tring's oldest cohort is under
 * two months old, so ten of twelve months would render empty and the prior-year overlay cannot
 * exist at all — the most prominent format on the dashboard would be mostly blank, which teaches
 * people to ignore it. The right pane therefore appears only once `months` actually carries enough
 * points, and says so plainly until then. Same component, same props: it starts drawing the moment
 * the data earns it.
 *
 * No chart library. A sparkline is a path and a few circles; adding a dependency to draw one costs
 * more in bundle and lock-in than it saves, and this renders identically everywhere.
 */

const COL = {
  input: "#5CD98A",      // a controllable input metric, improving
  output: "#8b95a1",     // an output metric — context, not a lever
  bad: "#FF7B72",        // the constraint, or an anomaly
  accent: "#F4532E",
  grid: "rgba(255,255,255,.08)",
  faint: "#6b7684",
};

function pct(a, b) {
  if (b == null || b === 0 || a == null) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

function Delta({ value, invert }) {
  if (value == null || !isFinite(value)) return <span style={{ color: COL.faint }}>—</span>;
  // `invert` for metrics where DOWN is good (deletions, failures). Colouring by raw direction
  // would paint a fall in churn red, which is the sort of thing that makes a dashboard actively
  // misleading rather than merely unhelpful.
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.5;
  return (
    <span style={{ color: flat ? COL.faint : good ? COL.input : COL.bad, fontVariantNumeric: "tabular-nums" }}>
      {value > 0 ? "+" : ""}{value.toFixed(0)}%
    </span>
  );
}

/** Sparkline over an array of {label, value}. Nulls break the line rather than being read as 0. */
function Spark({ points, w, h, color, showLast }) {
  const vals = points.map((p) => p.value).filter((v) => v != null);
  if (vals.length < 2) return null;
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const x = (i) => (i / Math.max(1, points.length - 1)) * (w - 8) + 4;
  const y = (v) => h - 6 - ((v - min) / Math.max(1e-9, max - min)) * (h - 14);

  let d = "", open = false;
  points.forEach((p, i) => {
    if (p.value == null) { open = false; return; }
    d += `${open ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
    open = true;
  });
  const lastIdx = [...points].map((p, i) => (p.value != null ? i : -1)).filter((i) => i >= 0).pop();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }} aria-hidden="true">
      <line x1="0" y1={h - 6} x2={w} y2={h - 6} stroke={COL.grid} strokeWidth="1" />
      <path d={d.trim()} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {showLast && lastIdx != null && (
        <circle cx={x(lastIdx)} cy={y(points[lastIdx].value)} r="3" fill={color} />
      )}
    </svg>
  );
}

/**
 * @param kind      "input" | "output" — labelled in the UI, because a lever and a lagging result
 *                  should never be read the same way.
 * @param invert    true when DOWN is good (deletions, failures, latency).
 * @param weeks     [{label, value}] trailing ~6 weeks.
 * @param months    [{label, value}] trailing ~12 months. Pane hidden until it has ≥6 real points.
 * @param onDrill   called with the clicked point — every chart drills into rows.
 */
export default function MetricChart({
  title, kind = "output", value, unit = "", weeks = [], months = [],
  invert = false, note, onDrill, anomaly,
}) {
  const w = weeks.filter((p) => p.value != null);
  const cur = value ?? (w.length ? w[w.length - 1].value : null);
  const wow = w.length >= 2 ? pct(w[w.length - 1].value, w[w.length - 2].value) : null;
  const mom = w.length >= 5 ? pct(w[w.length - 1].value, w[w.length - 5].value) : null;
  const monthsReal = months.filter((p) => p.value != null);
  const showMonths = monthsReal.length >= 6;

  return (
    <div style={{ border: `1px solid ${anomaly ? "rgba(255,123,114,.45)" : "rgba(255,255,255,.10)"}`,
                  borderRadius: 14, padding: 14, background: "rgba(255,255,255,.02)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: "#e6edf3", fontSize: 13.5, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, padding: "2px 6px",
                       borderRadius: 5, color: kind === "input" ? COL.input : COL.output,
                       background: kind === "input" ? "rgba(92,217,138,.13)" : "rgba(139,149,161,.13)" }}>
          {kind === "input" ? "INPUT" : "OUTPUT"}
        </span>
        {anomaly && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: COL.bad,
                         background: "rgba(255,123,114,.14)", padding: "2px 6px", borderRadius: 5 }}>
            {anomaly}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {cur == null ? "—" : typeof cur === "number" ? cur.toLocaleString("en-IN") : cur}{unit}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showMonths ? "1fr 1fr" : "1fr", gap: 12, marginTop: 8 }}>
        <div onClick={() => onDrill?.({ range: "6w" })} style={{ cursor: onDrill ? "pointer" : "default" }}>
          <div style={{ color: COL.faint, fontSize: 10, marginBottom: 2 }}>trailing 6 weeks</div>
          {w.length >= 2
            ? <Spark points={weeks} w={240} h={54} color={kind === "input" ? COL.input : COL.accent} showLast />
            : <div style={{ color: COL.faint, fontSize: 11, padding: "16px 0" }}>collecting data…</div>}
        </div>
        {showMonths ? (
          <div onClick={() => onDrill?.({ range: "12m" })} style={{ cursor: onDrill ? "pointer" : "default" }}>
            <div style={{ color: COL.faint, fontSize: 10, marginBottom: 2 }}>trailing 12 months</div>
            <Spark points={months} w={240} h={54} color={COL.output} showLast />
          </div>
        ) : null}
      </div>

      {/* BOX SCORE. WoW and MoM only — YoY is omitted rather than shown as an em dash forever,
          because a permanently empty column trains people to stop reading the row. */}
      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5, color: COL.faint }}>
        <span>WoW <Delta value={wow} invert={invert} /></span>
        <span>MoM <Delta value={mom} invert={invert} /></span>
        {!showMonths && <span style={{ color: "#5b6673" }}>12-month view opens at 6 months of data</span>}
      </div>
      {note && <div style={{ color: "#5b6673", fontSize: 10.5, marginTop: 5 }}>{note}</div>}
    </div>
  );
}

export { COL as CHART_COLORS };
