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

/**
 * TrueUsers — reframes the inflated headline. MAU counts every person with any event, including CI,
 * emulators and App Store review bots; on an India-only login-required app that roughly doubles the
 * number. The honest read is the funnel: installed → signed in, and India vs test-infrastructure.
 */
function TrueUsers({ f }) {
  const testInfra = Math.max(0, (f.total || 0) - (f.india || 0));
  const step = (label, n, of, color) => (
    <div style={{ flex: "1 1 150px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: MUTED, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#fff", marginTop: 2 }}>{n.toLocaleString()}</div>
      {of != null && <div style={{ fontSize: 12, color: MUTED }}>{of}</div>}
    </div>
  );
  return (
    <div style={{ ...CARD, marginTop: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>
        Who’s actually there <span style={{ color: MUTED, fontWeight: 500 }}>· real humans, not the MAU headline</span>
      </div>
      <div style={{ fontSize: 12.5, color: SUB, marginBottom: 14, lineHeight: 1.5 }}>
        MAU counts anyone who opened the app — CI, emulators and store-review bots included. For a
        login-required, India-only app the number that means <strong style={{ color: INK }}>a real
        person onboarded</strong> is sign-ins, and the honest denominator is the India cohort.
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {step("Installed", f.installed, "opened the app", "#F4532E")}
        {step("In India", f.india, `${testInfra} elsewhere (mostly test infra)`, "#3B82F6")}
        {step("Signed in", f.signedIn, "completed OTP — real users", "#3FBF7F")}
        {step("Activation", f.activation, "signed in ÷ installed", f.activation < 30 ? "#FFB454" : "#3FBF7F")}
      </div>
      {step && f.activation != null && (
        <div style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
          {`Read: ${f.installed} installs → ${f.signedIn} signed in (${f.activation}% activation). The ${testInfra}-person gap between total and India is test/CI/review traffic hitting this same PostHog project.`}
        </div>
      )}
    </div>
  );
}

/**
 * India's coastline and land border, as (lat, lon) run through the SAME
 * equirectangular projection the server uses for the bubbles
 * (x = (lon-68)/30, y = (37-lat)/31). That is the whole trick: because the
 * outline and the dots share one transform, a state centroid lands where the
 * state actually is, with no projection library and no choropleth payload.
 *
 * ~57 vertices — unmistakably India at 300px, small enough to inline.
 */
const INDIA =
  "M60.0 26.8 L89.0 15.5 L104.0 24.8 L111.0 45.4 L110.0 61.9 L130.0 68.1 L121.0 84.6 " +
  "L150.0 93.9 L167.0 103.2 L201.0 109.4 L208.0 93.9 L211.0 101.2 L240.0 105.3 L274.0 97.0 " +
  "L290.0 90.8 L293.0 103.2 L271.0 117.7 L265.0 132.1 L254.0 144.5 L246.0 153.8 L232.0 138.3 " +
  "L217.0 124.9 L210.0 121.8 L201.0 130.1 L209.0 153.8 L194.0 159.0 L189.0 172.4 L170.0 185.8 " +
  "L153.0 199.2 L133.0 213.7 L123.0 217.8 L123.0 246.7 L118.0 259.1 L118.0 275.6 L112.0 285.9 " +
  "L101.0 290.1 L95.5 298.5 L89.0 294.2 L82.0 278.7 L74.0 259.1 L68.0 247.7 L60.0 227.1 " +
  "L53.0 206.5 L48.0 184.8 L47.0 168.3 L46.0 160.0 L20.0 151.7 L10.0 154.8 L12.0 146.6 " +
  "L6.0 137.3 L30.0 127.0 L20.0 118.7 L25.0 98.1 L20.0 87.7 L55.0 77.4 L65.0 61.9 L65.0 46.5 Z";

/**
 * GeoMap — the real cohort placed on India. No external tiles or libraries (CSP-safe): the
 * outline above plus a bubble per state, sized by users, positioned from the server-computed
 * x/y fractions. A ranked list sits beside it so identity is never bubble-only.
 *
 * Clicking a bubble or a list row selects that region: the map dims everything else, the row
 * highlights, and a panel spells out what the bubble can only imply — rank, share of India,
 * share of everyone. Selection is driven from one piece of state so the two views can never
 * disagree about what is selected.
 */
function GeoMap({ states, countries, funnel }) {
  const [sel, setSel] = useState(null);   // state name, or null for "all"

  const placed = (states || []).filter((s) => s.x != null && s.people > 0);
  const maxP = Math.max(1, ...placed.map((s) => s.people));
  const indiaTotal = placed.reduce((n, s) => n + s.people, 0);
  const allPeople = (countries || []).reduce((n, c) => n + c.people, 0);
  const W = 300, H = 320;
  const r = (p) => 6 + 26 * Math.sqrt(p / maxP);

  // Painted largest-first so the small bubbles land on top and stay clickable;
  // `placed` stays in rank order for the list and for the label rule below.
  const byArea = [...placed].sort((a, b) => b.people - a.people);
  const chosen = placed.find((s) => s.state === sel) || null;
  const rank = chosen ? placed.findIndex((s) => s.state === sel) + 1 : null;
  const pick = (name) => setSel((cur) => (cur === name ? null : name));

  // Escape clears, so a keyboard user is never stuck in a filtered view.
  useEffect(() => {
    if (!sel) return;
    const onKey = (e) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
      <div style={{ ...CARD, flex: "2 1 340px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Where Tring users are</div>
          {sel && (
            <button onClick={() => setSel(null)}
              style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(255,255,255,.18)", color: SUB, borderRadius: 999, padding: "3px 10px", fontSize: 11.5, cursor: "pointer" }}>
              Clear ✕
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: MUTED, margin: "2px 0 10px" }}>
          India · by state · bubble = unique people · 90 days{placed.length ? " · tap a bubble" : ""}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360, height: "auto", display: "block", margin: "0 auto" }}
             role="img" aria-label="Map of Tring users across Indian states">
          <rect x="0" y="0" width={W} height={H} fill="#0E0E10" rx="14"
                onClick={() => setSel(null)} style={{ cursor: sel ? "pointer" : "default" }} />
          <path d={INDIA} fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.22)" strokeWidth="1"
                strokeLinejoin="round" pointerEvents="none" />

          {byArea.map((s) => {
            const on = !sel || s.state === sel;
            const rad = r(s.people);
            return (
              <g key={s.state} onClick={() => pick(s.state)} style={{ cursor: "pointer" }}
                 opacity={on ? 1 : 0.22} role="button" tabIndex={0}
                 aria-label={`${s.state}, ${s.people} people`}
                 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s.state); } }}>
                {/* a generous invisible hit area — the small bubbles are 6px */}
                <circle cx={s.x * W} cy={s.y * H} r={Math.max(rad, 14)} fill="transparent" />
                <circle cx={s.x * W} cy={s.y * H} r={rad}
                        fill={s.state === sel ? "rgba(244,83,46,.55)" : "rgba(244,83,46,.28)"}
                        stroke="#F4532E" strokeWidth={s.state === sel ? 2.5 : 1.5} />
                <circle cx={s.x * W} cy={s.y * H} r="2" fill="#F4532E" />
              </g>
            );
          })}

          {/* Exactly one label at a time. Labelling the top five piled "70 30 8 40 32"
              on top of each other, because Delhi, Haryana, Punjab and Chandigarh sit
              within ~2 degrees and their bubbles already overlap. The ranked list
              beside the map carries every number; the map carries the shape. */}
          {(chosen || byArea[0]) && (() => {
            const s = chosen || byArea[0];
            return (
              <text x={s.x * W} y={s.y * H - r(s.people) - 4} textAnchor="middle"
                    fontSize="10" fill="#FFF0EB" fontWeight="700" pointerEvents="none"
                    stroke="#0E0E10" strokeWidth="3" paintOrder="stroke">
                {s.people}
              </text>
            );
          })()}
        </svg>

        {chosen && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(244,83,46,.10)", border: "1px solid rgba(244,83,46,.32)", borderRadius: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{chosen.state}</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
              {[
                ["People", chosen.people],
                ["Rank", `#${rank} of ${placed.length}`],
                ["Share of India", `${pct(chosen.people, indiaTotal)}%`],
                ["Share of all", `${pct(chosen.people, allPeople)}%`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: MUTED }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ ...CARD, flex: "1 1 260px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 10 }}>Top states</div>
        <div style={{ maxHeight: 210, overflowY: "auto" }}>
          {placed.slice(0, 12).map((s, i) => {
            const on = s.state === sel;
            return (
              <button key={s.state} onClick={() => pick(s.state)} aria-pressed={on}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                         padding: "6px 8px", margin: "1px 0", borderRadius: 8, border: 0, cursor: "pointer",
                         background: on ? "rgba(244,83,46,.16)" : "transparent",
                         borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 13, textAlign: "left" }}>
                <span style={{ color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                  <span style={{ color: MUTED, marginRight: 6 }}>{i + 1}</span>{s.state}
                </span>
                <span style={{ color: on ? "#F4532E" : SUB, fontWeight: on ? 700 : 400 }}>{s.people}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: INK, margin: "14px 0 8px" }}>By country</div>
        {(countries || []).slice(0, 5).map((c) => (
          <div key={c.country} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <span style={{ color: c.country === "India" ? "#3FBF7F" : c.country === "United States" ? "#FFB454" : INK }}>{c.country}</span>
            <span style={{ color: SUB }}>{c.people}{c.country === "United States" ? " · test infra" : ""}</span>
          </div>
        ))}
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
        <h2 style={H2}>Product metrics <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>· real users · India · last 30 days</span></h2>
        <button onClick={load} style={{ background: "transparent", color: "#F6EEE8", border: "1.5px solid rgba(255,255,255,.18)", borderRadius: 12, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Tile k="DAU" v={a.dau} sub={a.globalDau != null ? `${a.globalDau} incl. test` : "last 24h"} accent={DAU_C} />
        <Tile k="WAU" v={a.wau} sub={a.globalWau != null ? `${a.globalWau} incl. test` : "last 7 days"} />
        <Tile k="MAU" v={a.mau} sub={a.globalMau != null ? `${a.globalMau} incl. test` : "last 30 days"} />
        <Tile k="Stickiness" v={`${a.stickiness}%`} sub="DAU ÷ MAU" />
        <Tile k="Avg DAU" v={a.avgDau} sub="full days only" />
        <Tile k="Sessions" v={v.sessions.toLocaleString()} sub={`${v.sessionsPerPerson} per person`} />
        <Tile k="Events" v={v.events30d.toLocaleString()} sub="30 days" />
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
        Headline figures are <strong style={{ color: SUB }}>real India users</strong>; the “incl. test”
        number under each is the raw global count (CI, emulators, store-review). That gap is why the old
        MAU read ~2× the real base.
      </div>

      {d.funnel && <TrueUsers f={d.funnel} />}
      {d.states && <GeoMap states={d.states} countries={d.countries} funnel={d.funnel} />}

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
            {(d.topEvents || []).map((e) => (
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
