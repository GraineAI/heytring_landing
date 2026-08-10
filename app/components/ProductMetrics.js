"use client";

/**
 * ProductMetrics — live DAU/WAU/MAU from PostHog, rendered inside /admin.
 *
 * Data arrives from /api/admin/posthog, which holds the personal API key server-side;
 * nothing secret reaches this component. Chart is hand-rolled SVG — the project has no
 * chart library and one measured bar chart does not justify adding one.
 *
 * Palette is validated, not eyeballed: #F4532E / #3B82F6 pass the lightness band, chroma
 * floor, CVD separation (ΔE 28.0 deutan), normal-vision floor (ΔE 34.0) and 3:1 contrast
 * against the #0B0B0C card surface.
 */
import { useEffect, useState } from "react";

const DAU_C = "#F4532E";   // daily actives (bars)
const AVG_C = "#3B82F6";   // 7-day rolling average (line)
const INK = "#FFF0EB", SUB = "#B7A79D", MUTED = "#8C7C73";
const CARD = { background: "#0B0B0C", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 20 };

function Tile({ k, v, sub, accent }) {
  return (
    <div style={{ ...CARD, padding: 16, flex: "1 1 130px", minWidth: 130 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: MUTED, textTransform: "uppercase" }}>{k}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: accent || "#fff", marginTop: 4, lineHeight: 1.1 }}>{v}</div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/** 7-day trailing mean, so a noisy daily line reads as a trend. */
function rolling(series, n = 7) {
  return series.map((_, i) => {
    const from = Math.max(0, i - n + 1);
    const win = series.slice(from, i + 1);
    return win.reduce((a, b) => a + b.dau, 0) / win.length;
  });
}

function Chart({ series }) {
  const [hover, setHover] = useState(null);
  if (!series.length) return null;

  const W = 900, H = 240, PADL = 34, PADR = 12, PADT = 14, PADB = 30;
  const plotW = W - PADL - PADR, plotH = H - PADT - PADB;
  const max = Math.max(...series.map((d) => d.dau), 1);
  // Round the axis up to a clean step so gridline labels are readable integers.
  const step = max <= 10 ? 2 : max <= 25 ? 5 : max <= 60 ? 10 : 20;
  const top = Math.ceil(max / step) * step;

  const slot = plotW / series.length;
  const BAR_GAP = 2;                              // 2px surface gap between adjacent bars
  const bw = Math.max(3, slot - BAR_GAP);
  const y = (v) => PADT + plotH - (v / top) * plotH;
  const avg = rolling(series);

  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  const linePts = series
    .map((d, i) => `${PADL + i * slot + slot / 2},${y(avg[i])}`)
    .join(" ");

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
           role="img" aria-label="Daily active users, last 30 days, with 7-day average">
        {/* recessive grid */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PADL} x2={W - PADR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
            <text x={PADL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill={MUTED}>{v}</text>
          </g>
        ))}

        {/* hatch for the partial (in-progress) day — texture, so it is never colour-alone */}
        <defs>
          <pattern id="pm-partial" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="#0B0B0C" />
            <line x1="0" y1="0" x2="0" y2="5" stroke={DAU_C} strokeWidth="2.5" />
          </pattern>
        </defs>

        {series.map((d, i) => {
          const h = Math.max(d.dau > 0 ? 2 : 0, plotH - (y(d.dau) - PADT));
          const x = PADL + i * slot + BAR_GAP / 2;
          return (
            // rx/ry 4 = the rounded data-end; anchored to the baseline, never a floating bar
            <rect key={d.date} x={x} y={y(d.dau)} width={bw} height={h}
              rx="4" ry="4"
              fill={d.partial ? "url(#pm-partial)" : DAU_C}
              stroke={d.partial ? DAU_C : "none"} strokeWidth={d.partial ? 1 : 0}
              onMouseEnter={() => setHover({ ...d, avg: avg[i], i })}
              onMouseLeave={() => setHover(null)} />
          );
        })}

        {/* 7-day average, 2px, drawn over the bars with a surface ring for separation */}
        <polyline points={linePts} fill="none" stroke="#0B0B0C" strokeWidth="4" strokeLinejoin="round" opacity=".9" />
        <polyline points={linePts} fill="none" stroke={AVG_C} strokeWidth="2" strokeLinejoin="round" />

        {/* date ticks — every 5th, so labels never collide */}
        {series.map((d, i) => (i % 5 === 0 || i === series.length - 1) ? (
          <text key={d.date} x={PADL + i * slot + slot / 2} y={H - 10} textAnchor="middle" fontSize="10" fill={MUTED}>
            {d.date.slice(5)}
          </text>
        ) : null)}
      </svg>

      {hover && (
        <div style={{
          position: "absolute", top: 0, left: `${((hover.i + 0.5) / series.length) * 100}%`,
          transform: "translateX(-50%)", pointerEvents: "none",
          background: "#000", border: "1px solid rgba(255,255,255,.16)", borderRadius: 10,
          padding: "8px 11px", fontSize: 12, color: INK, whiteSpace: "nowrap", zIndex: 2,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{hover.date}{hover.partial ? " · in progress" : ""}</div>
          <div><span style={{ color: DAU_C }}>●</span> {hover.dau} active · {hover.events.toLocaleString()} events</div>
          <div style={{ color: SUB }}><span style={{ color: AVG_C }}>●</span> {hover.avg.toFixed(1)} avg (7d)</div>
        </div>
      )}

      {/* legend — required at 2 series, so identity is never colour-alone */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 10, fontSize: 12, color: SUB }}>
        <span><span style={{ color: DAU_C }}>●</span> Daily active people</span>
        <span><span style={{ color: AVG_C }}>●</span> 7-day average</span>
        <span style={{ color: MUTED }}>▨ Today (still in progress)</span>
      </div>
    </div>
  );
}

export default function ProductMetrics() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [showTable, setShowTable] = useState(false);

  const load = async () => {
    setErr("");
    const r = await fetch("/api/admin/posthog").catch(() => null);
    if (!r) return setErr("Network error");
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return setErr(j.error || `Failed (${r?.status})`);
    setD(j);
  };
  useEffect(() => { load(); }, []);

  const H2 = { fontSize: 20, fontWeight: 700, color: "#fff", margin: "28px 0 12px" };

  if (err) return (<><h2 style={H2}>Product metrics</h2><div style={{ ...CARD, color: "#FF7B72" }}>{err}</div></>);
  if (!d) return (<><h2 style={H2}>Product metrics</h2><div style={{ ...CARD, color: MUTED }}>Loading from PostHog…</div></>);

  const a = d.active, v = d.volume;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={H2}>Product metrics <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>· app, last 30 days</span></h2>
        <button onClick={load} style={{ background: "transparent", color: "#F6EEE8", border: "1.5px solid rgba(255,255,255,.18)", borderRadius: 12, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Tile k="DAU" v={a.dau} sub="last 24h" accent={DAU_C} />
        <Tile k="WAU" v={a.wau} sub="last 7 days" />
        <Tile k="MAU" v={a.mau} sub="last 30 days" />
        <Tile k="Stickiness" v={`${a.stickiness}%`} sub="DAU ÷ MAU" />
        <Tile k="Avg DAU" v={a.avgDau} sub="full days only" />
        <Tile k="Sessions" v={v.sessions.toLocaleString()} sub={`${v.sessionsPerPerson} per person`} />
        <Tile k="Events" v={v.events30d.toLocaleString()} sub="30 days" />
      </div>

      {!a.windowIsFullMonth && (
        // Without this the MAU tile reads as a real rolling metric when it cannot be one yet.
        <div style={{ ...CARD, marginTop: 12, padding: "12px 16px", fontSize: 13, color: SUB, borderColor: "rgba(244,83,46,.3)" }}>
          Analytics history begins {new Date(d.firstSeen).toLocaleDateString()} — under 30 days, so
          <strong style={{ color: INK }}> MAU is still effectively “everyone ever seen”</strong> ({a.allTime} all-time)
          and cannot fall yet. Stickiness is flattered until the window fills.
        </div>
      )}

      <div style={{ ...CARD, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Daily active people</div>
          <button onClick={() => setShowTable((s) => !s)} style={{ background: "transparent", border: 0, color: MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            {showTable ? "Show chart" : "Show table"}
          </button>
        </div>

        {showTable ? (
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>
                <th style={{ textAlign: "left", color: MUTED, fontSize: 11, padding: "6px 8px" }}>DATE</th>
                <th style={{ textAlign: "right", color: MUTED, fontSize: 11, padding: "6px 8px" }}>ACTIVE</th>
                <th style={{ textAlign: "right", color: MUTED, fontSize: 11, padding: "6px 8px" }}>EVENTS</th>
              </tr></thead>
              <tbody>
                {[...d.series].reverse().map((r) => (
                  <tr key={r.date}>
                    <td style={{ padding: "6px 8px", color: INK }}>{r.date}{r.partial ? " (partial)" : ""}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: INK }}>{r.dau}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: SUB }}>{r.events.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Chart series={d.series} />}
      </div>

      {/* Our own events, split out from PostHog's. Mixed into "Top events" the SDK's $screen /
          $autocapture / Application-* volume buries these entirely — and burying them is how the
          July regression went unnoticed for five weeks. */}
      <div style={{ ...CARD, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Product events <span style={{ color: MUTED, fontWeight: 500 }}>· ours only, 90 days</span></div>
          {(d.customEvents || []).some((e) => e.stale) && (
            <div style={{ fontSize: 12, color: "#FFB454" }}>
              {(d.customEvents || []).filter((e) => e.stale).length} stale (nothing for 7+ days)
            </div>
          )}
        </div>
        {!(d.customEvents || []).length ? (
          <div style={{ color: MUTED, fontSize: 13, paddingTop: 8 }}>No product events in 90 days — instrumentation is not reaching PostHog.</div>
        ) : (d.customEvents).map((e) => (
          <div key={e.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 13 }}>
            <span style={{ color: e.stale ? MUTED : INK, display: "flex", alignItems: "center", gap: 8 }}>
              {/* dot + text, never colour alone */}
              <span style={{ color: e.stale ? "#FFB454" : "#3FBF7F" }}>●</span>
              {e.name}
              {e.stale && <span style={{ fontSize: 11, color: "#FFB454" }}>stale</span>}
            </span>
            <span style={{ color: SUB, whiteSpace: "nowrap" }}>
              {e.count.toLocaleString()} · {e.people}p
              {e.lastSeen && <span style={{ color: MUTED }}> · {String(e.lastSeen).slice(0, 10)}</span>}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
        <div style={{ ...CARD, flex: "1 1 320px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 10 }}>Platform</div>
          {d.platform.filter((p) => p.people > 0).map((p) => (
            <div key={p.os} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 13 }}>
              <span style={{ color: INK }}>{p.os}</span>
              <span style={{ color: SUB }}>{p.people} people · {p.perPerson.toLocaleString()} ev/person</span>
            </div>
          ))}
        </div>
        <div style={{ ...CARD, flex: "1 1 320px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 10 }}>Top events</div>
          {/* No maxHeight: a scroll box cut the last row in half, which reads as a render bug
              rather than as "there is more below". 12 rows is short enough to just show. */}
          <div>
            {d.topEvents.map((e) => (
              <div key={e.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 13 }}>
                <span style={{ color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{e.name}</span>
                <span style={{ color: SUB }}>{e.count.toLocaleString()} · {e.people}p</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
