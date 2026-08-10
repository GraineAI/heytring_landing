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
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Google's bundle is ~90KB and only renders when a key exists, so it is loaded
// on demand rather than shipped to every admin page view.
const GoogleMapReact = dynamic(() => import("google-map-react"), { ssr: false });
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

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
          <div><span style={{ color: DAU_C }}>●</span> {hover.dau} active · {(hover.events ?? 0).toLocaleString()} events</div>
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
      {/* A missing funnel field used to throw here and blank the whole page.
          One absent number should cost one number. */}
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#fff", marginTop: 2 }}>{(n ?? 0).toLocaleString()}</div>
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
 * PostHog's $geoip_subdivision_1_name vs the map package's names. They agree on
 * every state we see except one, so this is an alias table rather than a
 * matching algorithm — and it stays that way on purpose: a fuzzy matcher that
 * silently mis-assigns a state is worse than a lookup that visibly misses one.
 */
const NAME_ALIAS = { "National Capital Territory of Delhi": "Delhi" };
const mapName = (n) => NAME_ALIAS[n] || n;

/**
 * IndiaChoropleth — real state boundaries from @svg-maps/india (36 states and
 * UTs, no API key, no tiles, no billing, nothing fetched at runtime).
 *
 * This replaces a hand-drawn national outline with bubbles on top. Bubbles
 * could only say "somewhere around here"; a filled state says exactly which
 * one, and makes every state clickable rather than only the dozen we have
 * users in — which is what "region-wise" actually means.
 *
 * The 172KB of path data is dynamically imported so it is fetched when the geo
 * panel renders, not on every admin page view.
 */
function IndiaChoropleth({ placed, maxP, sel, pick }) {
  const [map, setMap] = useState(null);
  const [hover, setHover] = useState(null);
  const [pins, setPins] = useState([]);   // tiny states that need a marker
  const svgRef = useRef(null);

  useEffect(() => {
    let live = true;
    import("@svg-maps/india")
      .then((m) => { if (live) setMap(m.default || m); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // people-by-map-name, so a path can look up its own number in O(1)
  const byName = {};
  for (const s of placed) byName[mapName(s.state)] = s;

  /**
   * A choropleth's blind spot: importance is area, and our biggest region is
   * one of the country's smallest. Delhi is #1 at 70 people and renders as a
   * speck you would never find. So measure each state we have users in and
   * give the small ones an explicit dot — the map has to show the top state.
   *
   * Measured from the DOM rather than precomputed because the package's
   * projection is its own, and getBBox is the only honest source for where a
   * path actually landed.
   */
  useEffect(() => {
    if (!map || !svgRef.current) return;
    const out = [];
    for (const s of placed) {
      const el = svgRef.current.querySelector(`[data-state="${CSS.escape(mapName(s.state))}"]`);
      if (!el) continue;
      let bb;
      try { bb = el.getBBox(); } catch (_) { continue; }
      if (bb.width * bb.height < 260) {         // ~1% of the map's shorter side, squared
        out.push({ name: s.state, people: s.people, cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 });
      }
    }
    setPins(out);
  }, [map, placed]);

  if (!map) {
    return <div style={{ height: 300, display: "grid", placeItems: "center", color: MUTED, fontSize: 13 }}>Loading map…</div>;
  }

  const selName = sel ? mapName(sel) : null;

  return (
    <svg ref={svgRef} viewBox={map.viewBox} style={{ width: "100%", maxWidth: 400, height: "auto", display: "block", margin: "0 auto" }}
         role="img" aria-label="Map of Tring users across Indian states">
      <rect x="0" y="0" width="100%" height="100%" fill="transparent" onClick={() => pick(null)} />
      {map.locations.map((loc) => {
        const hit = byName[loc.name];
        const people = hit ? hit.people : 0;
        // sqrt so a 70 does not flatten every 2 into the same near-black.
        const t = people ? 0.16 + 0.68 * Math.sqrt(people / maxP) : 0;
        const isSel = selName === loc.name;
        const isHov = hover === loc.name;
        return (
          <path
            key={loc.id}
            data-state={loc.name}
            d={loc.path}
            fill={people ? `rgba(244,83,46,${isSel ? Math.min(1, t + 0.3) : t})` : "rgba(255,255,255,.05)"}
            stroke={isSel ? "#F4532E" : isHov ? "rgba(244,83,46,.6)" : "rgba(255,255,255,.18)"}
            strokeWidth={isSel ? 1.6 : 0.6}
            opacity={selName && !isSel ? 0.35 : 1}
            style={{ cursor: hit ? "pointer" : "default", transition: "opacity .15s ease, fill .15s ease" }}
            onClick={(e) => { e.stopPropagation(); if (hit) pick(hit.state); }}
            onMouseEnter={() => setHover(loc.name)}
            onMouseLeave={() => setHover((h) => (h === loc.name ? null : h))}
            tabIndex={hit ? 0 : -1}
            role={hit ? "button" : undefined}
            aria-label={hit ? `${loc.name}, ${people} people` : undefined}
            onKeyDown={(e) => { if (hit && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(hit.state); } }}
          >
            <title>{people ? `${loc.name} · ${people}` : loc.name}</title>
          </path>
        );
      })}

      {/* leader dots for the states too small to read as fill */}
      {pins.map((pin) => {
        const isSel = sel === pin.name;
        return (
          <g key={pin.name} onClick={(e) => { e.stopPropagation(); pick(pin.name); }}
             style={{ cursor: "pointer" }} opacity={selName && !isSel ? 0.35 : 1}>
            <circle cx={pin.cx} cy={pin.cy} r={isSel ? 7 : 5.5}
                    fill="#F4532E" stroke="#0E0E10" strokeWidth="1.5" />
            <text x={pin.cx} y={pin.cy - 9} textAnchor="middle" fontSize="11" fontWeight="700"
                  fill="#FFF0EB" stroke="#0E0E10" strokeWidth="3" paintOrder="stroke"
                  pointerEvents="none">
              {pin.people}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Dark tiles, no POI clutter — the data is the subject, not the restaurants. */
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1B1B1D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0E0E10" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8C7C73" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#3A3A3C" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#2A2A2C" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0E0E10" }] },
];

/** One bubble. google-map-react positions any child by its lat/lng props. */
function Pin({ people, max, selected, dim, onPick, label }) {
  const d = 12 + 52 * Math.sqrt(people / max);
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onPick(); }}
      title={`${label} · ${people}`}
      style={{
        width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2,
        borderRadius: "50%", cursor: "pointer",
        background: selected ? "rgba(244,83,46,.62)" : "rgba(244,83,46,.30)",
        border: `${selected ? 2.5 : 1.5}px solid #F4532E`,
        opacity: dim ? 0.25 : 1,
        display: "grid", placeItems: "center",
        color: "#FFF0EB", fontSize: 11, fontWeight: 700,
        transition: "opacity .15s ease, background .15s ease",
      }}
    >
      {d > 26 ? people : ""}
    </div>
  );
}

/**
 * The Google-tiles canvas. Only mounted when NEXT_PUBLIC_GOOGLE_MAPS_KEY is set —
 * without a key the library renders a grey "for development purposes only" box,
 * which is strictly worse than the SVG, so the SVG stays the default.
 *
 * Clicking a bubble pans and zooms to that state, which is the one thing a real
 * tile map buys over the drawn outline.
 */
function GoogleCanvas({ placed, maxP, sel, pick, onFail }) {
  const mapRef = useRef(null);
  const boxRef = useRef(null);
  const HOME = { center: { lat: 22.6, lng: 80.0 }, zoom: 4 };

  // A rejected key (wrong key, referrer not allowlisted, billing off) makes
  // Google replace the whole container with its own grey error card, and the
  // markers never render. Watch for that and hand back to the SVG — a drawn
  // map that works beats a tile map that apologises.
  useEffect(() => {
    const check = () => {
      if (boxRef.current && boxRef.current.querySelector(".gm-err-container")) onFail();
    };
    const t1 = setTimeout(check, 2500);
    const t2 = setTimeout(check, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const s = placed.find((p) => p.state === sel);
    if (s && s.lat != null) { m.panTo({ lat: s.lat, lng: s.lon }); m.setZoom(6.5); }
    else { m.panTo(HOME.center); m.setZoom(HOME.zoom); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  return (
    // Explicit height: google-map-react fills its parent, and a parent with no
    // height collapses the map to nothing. This is the library's own top FAQ.
    <div ref={boxRef} style={{ height: 340, borderRadius: 14, overflow: "hidden" }}>
      <GoogleMapReact
        bootstrapURLKeys={{ key: MAPS_KEY }}
        defaultCenter={HOME.center}
        defaultZoom={HOME.zoom}
        options={{
          styles: MAP_STYLE, disableDefaultUI: true, zoomControl: true,
          gestureHandling: "greedy", backgroundColor: "#0E0E10",
        }}
        yesIWantToUseGoogleMapApiInternals
        onGoogleApiLoaded={({ map }) => { mapRef.current = map; }}
        onClick={() => pick(null)}
      >
        {placed.map((s) => (
          <Pin
            key={s.state} lat={s.lat} lng={s.lon}
            people={s.people} max={maxP} label={s.state}
            selected={s.state === sel} dim={!!sel && s.state !== sel}
            onPick={() => pick(s.state)}
          />
        ))}
      </GoogleMapReact>
    </div>
  );
}

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
  const [mapFailed, setMapFailed] = useState(false);
  const useGoogle = !!MAPS_KEY && !mapFailed;

  const placed = (states || []).filter((s) => s.x != null && s.people > 0);
  const maxP = Math.max(1, ...placed.map((s) => s.people));
  const indiaTotal = placed.reduce((n, s) => n + s.people, 0);
  const allPeople = (countries || []).reduce((n, c) => n + c.people, 0);

  const chosen = placed.find((s) => s.state === sel) || null;
  const rank = chosen ? placed.findIndex((s) => s.state === sel) + 1 : null;
  const pick = (name) => setSel((cur) => (name == null || cur === name ? null : name));

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
          India · by state · shade = unique people · 90 days{placed.length ? (useGoogle ? " · tap to zoom" : " · tap a state") : ""}
        </div>

        {useGoogle ? (
          <GoogleCanvas placed={placed} maxP={maxP} sel={sel} pick={(n) => setSel(n === sel ? null : n)} onFail={() => setMapFailed(true)} />
        ) : (
          <IndiaChoropleth placed={placed} maxP={maxP} sel={sel} pick={pick} />
        )}

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


/* ─────────────────────────── shared panel primitives ─────────────────────────── */

const secs = (n) => (n >= 60 ? `${Math.floor(n / 60)}m ${Math.round(n % 60)}s` : `${Math.round(n)}s`);
const ago = (iso) => {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "1d ago" : `${days}d ago`;
};

/** A ranked bar list — the shape most of these panels want. */
function BarList({ title, note, rows, unit = "", empty = "Nothing yet." }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div style={{ ...CARD, flex: "1 1 320px", minWidth: 280 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{title}</div>
      {note && <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{note}</div>}
      <div style={{ marginTop: 12 }}>
        {!rows.length && <div style={{ fontSize: 13, color: MUTED }}>{empty}</div>}
        {rows.map((r) => (
          <div key={r.label} style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
              <span style={{ color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "68%" }}>
                {r.label}
              </span>
              <span style={{ color: SUB }}>{r.n.toLocaleString()}{unit}{r.sub ? ` · ${r.sub}` : ""}</span>
            </div>
            {/* the bar is the comparison; the number is the fact */}
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.07)" }}>
              <div style={{ width: `${(r.n / max) * 100}%`, height: "100%", borderRadius: 3, background: r.color || "#F4532E" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Retention curve. Day 0 is the cohort, every later day is the share that came
 * back — the number that decides whether a mobile app lives.
 */
function Retention({ rows }) {
  const pick = [1, 3, 7, 14, 30];
  const by = Object.fromEntries(rows.map((r) => [r.day, r]));
  const d0 = by[0]?.people || 0;
  const curve = rows.filter((r) => r.day > 0 && r.day <= 30);
  const max = Math.max(1, ...curve.map((r) => r.pct));
  return (
    <div style={{ ...CARD, flex: "2 1 420px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Retention</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
        India · share of {d0.toLocaleString()} people who came back N days after we first saw them
      </div>
      <div style={{ display: "flex", gap: 18, margin: "14px 0 12px", flexWrap: "wrap" }}>
        {pick.map((d) => (
          <div key={d}>
            <div style={{ fontSize: 11, color: MUTED }}>D{d}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: by[d]?.pct >= 20 ? "#3FBF7F" : by[d]?.pct ? "#FFB454" : MUTED }}>
              {by[d] ? `${by[d].pct}%` : "—"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 64 }}>
        {curve.map((r) => (
          <div key={r.day} title={`Day ${r.day} · ${r.people} people · ${r.pct}%`}
               style={{ flex: 1, height: `${Math.max(2, (r.pct / max) * 100)}%`, background: "#F4532E", opacity: 0.35 + 0.65 * (r.pct / max), borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: MUTED, marginTop: 4 }}>
        <span>day 1</span><span>day 30</span>
      </div>
    </div>
  );
}

/** Install → open → sign-in, per platform, with the losses named. */
function DropOff({ rows }) {
  return (
    <div style={{ ...CARD, flex: "2 1 420px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Drop-off by platform</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Installed → opened → signed in · 90 days</div>
      {!rows.length && <div style={{ fontSize: 13, color: MUTED, marginTop: 12 }}>No install events yet.</div>}
      {rows.map((r) => (
        <div key={r.os} style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: INK, fontWeight: 600 }}>{r.os}</span>
            <span style={{ color: SUB }}>{r.installed} installed</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["Installed", r.installed, "#F4532E"], ["Opened", r.opened, "#FFB454"], ["Signed in", r.signedIn, "#3FBF7F"]].map(([k, v, c]) => (
              <div key={k} style={{ flex: Math.max(v, r.installed * 0.12) || 1, minWidth: 64 }}>
                <div style={{ height: 26, borderRadius: 6, background: c, opacity: 0.85, display: "grid", placeItems: "center", color: "#0B0B0C", fontSize: 12, fontWeight: 700 }}>{v}</div>
                <div style={{ fontSize: 10.5, color: MUTED, marginTop: 3, textAlign: "center" }}>{k}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
            {r.openRate == null ? "—" : `${r.openRate}% opened`}
            {r.lostAtOpen ? ` · lost ${r.lostAtOpen} before first open` : ""}
            {r.signInRate == null ? "" : ` · ${r.signInRate}% of openers signed in`}
            {r.lostAtSignIn ? ` · lost ${r.lostAtSignIn} at sign-in` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

/** When India actually uses the app, in IST. */
function Hourly({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.people));
  const peak = rows.reduce((a, b) => (b.people > (a?.people || 0) ? b : a), null);
  return (
    <div style={{ ...CARD, flex: "1 1 320px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Time of day</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
        IST · unique people per hour{peak ? ` · peak ${String(peak.hour).padStart(2, "0")}:00` : ""}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 70, marginTop: 12 }}>
        {Array.from({ length: 24 }, (_, h) => {
          const r = rows.find((x) => x.hour === h);
          const v = r?.people || 0;
          return <div key={h} title={`${String(h).padStart(2, "0")}:00 · ${v} people`}
                      style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, background: "#F4532E", opacity: 0.3 + 0.7 * (v / max), borderRadius: 2 }} />;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: MUTED, marginTop: 4 }}>
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  );
}

/** New vs returning — a flat DAU made of new installs is churn in a growth costume. */
function NewReturning({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.newPeople + r.returning));
  return (
    <div style={{ ...CARD, flex: "2 1 420px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>New vs returning</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>India · daily active, split by whether we had seen them before</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, marginTop: 12 }}>
        {rows.map((r) => (
          <div key={r.date} title={`${r.date} · ${r.newPeople} new · ${r.returning} returning`}
               style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ height: `${(r.returning / max) * 100}%`, background: "#3FBF7F", borderRadius: "2px 2px 0 0" }} />
            <div style={{ height: `${(r.newPeople / max) * 100}%`, background: "#F4532E" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: MUTED, marginTop: 8 }}>
        <span><span style={{ color: "#F4532E" }}>■</span> new</span>
        <span><span style={{ color: "#3FBF7F" }}>■</span> returning</span>
      </div>
    </div>
  );
}

/** How many distinct days each person showed up in the last 30. */
function Depth({ rows }) {
  const total = rows.reduce((n, r) => n + r.people, 0);
  const oneDay = rows.find((r) => r.daysActive === 1)?.people || 0;
  const habit = rows.filter((r) => r.daysActive >= 5).reduce((n, r) => n + r.people, 0);
  const max = Math.max(1, ...rows.map((r) => r.people));
  return (
    <div style={{ ...CARD, flex: "1 1 320px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Depth of use</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Distinct active days per person · 30 days</div>
      <div style={{ display: "flex", gap: 18, margin: "12px 0" }}>
        <div><div style={{ fontSize: 11, color: MUTED }}>One day only</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#FFB454" }}>{total ? Math.round((oneDay / total) * 100) : 0}%</div></div>
        <div><div style={{ fontSize: 11, color: MUTED }}>5+ days</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#3FBF7F" }}>{total ? Math.round((habit / total) * 100) : 0}%</div></div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 54 }}>
        {rows.slice(0, 30).map((r) => (
          <div key={r.daysActive} title={`${r.daysActive} day(s) · ${r.people} people`}
               style={{ flex: 1, height: `${Math.max(2, (r.people / max) * 100)}%`, background: r.daysActive === 1 ? "#FFB454" : "#3FBF7F", opacity: 0.8, borderRadius: 2 }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Journey — the download→onboarded funnel as horizontal bars, each step's width relative to the
 * top of the funnel, with step-to-step conversion and the drop between them. The later steps read 0
 * until a build carrying the new events ships, which is shown as "awaiting build" rather than hidden.
 */
function Journey({ steps, lifecycle }) {
  // Steps that ship their event in the NEXT app release — a 0 here is "not measured yet", NOT a
  // drop-off, so it must not be drawn as an empty bar with "0% of prev" (which reads as a cliff).
  const PENDING = new Set(["otp_requested", "onboarded", "forwarding"]);
  const top = Math.max(1, steps[0]?.people || 0);
  const anyPending = steps.some((s) => PENDING.has(s.key) && s.people === 0);
  let lastMeasured = null;   // carry the previous step that actually had data, to skip pending gaps
  return (
    <div style={{ ...CARD, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>User journey <span style={{ color: MUTED, fontWeight: 500 }}>· install → onboarded · India · 90d</span></div>
        {anyPending && <div style={{ fontSize: 11.5, color: "#8C7C73" }}>grey steps ship their event in the next release</div>}
      </div>
      <div style={{ marginTop: 14 }}>
        {steps.map((s, i) => {
          const pending = PENDING.has(s.key) && s.people === 0;
          const pct = Math.round((s.people / top) * 100);
          // conversion + absolute drop measured against the last step that HAS data
          const conv = !pending && lastMeasured ? Math.round((s.people / Math.max(1, lastMeasured.people)) * 100) : null;
          const dropped = !pending && lastMeasured ? lastMeasured.people - s.people : null;
          if (!pending) lastMeasured = s;
          return (
            <div key={s.key} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ color: pending ? MUTED : INK, fontWeight: pending ? 400 : 600 }}>{i + 1}. {s.label}</span>
                {pending ? (
                  <span style={{ color: MUTED, fontStyle: "italic" }}>ships next release</span>
                ) : (
                  <span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{s.people.toLocaleString()}</span>
                    {conv != null && <span style={{ color: conv < 60 ? "#FFB454" : MUTED }}> · {conv}% of prev</span>}
                    {dropped != null && dropped > 0 && <span style={{ color: "#FF7B72" }}> · −{dropped.toLocaleString()} lost</span>}
                  </span>
                )}
              </div>
              <div style={{ height: 22, background: "rgba(255,255,255,.05)", borderRadius: 6, overflow: "hidden",
                border: pending ? "1px dashed rgba(255,255,255,.14)" : "none" }}>
                {!pending && (
                  <div style={{ width: `${Math.max(pct, s.people > 0 ? 3 : 0)}%`, height: "100%",
                    background: `linear-gradient(90deg, #F4532E, ${conv != null && conv < 60 ? "#FFB454" : "#F4532E"})`,
                    borderRadius: 6, transition: "width .4s", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{pct}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {(() => {
          const inst = steps.find((s) => s.key === "installed")?.people || 0;
          const sign = steps.find((s) => s.key === "signed_in")?.people || 0;
          const act = inst ? Math.round((sign / inst) * 1000) / 10 : 0;
          return (
            <div style={{ marginTop: 6, padding: "10px 14px", background: "rgba(244,83,46,.08)", borderRadius: 10, fontSize: 13, color: INK, lineHeight: 1.5 }}>
              <strong>Bottom line:</strong> {inst} installed → {sign} signed in = <strong style={{ color: act < 30 ? "#FFB454" : "#3FBF7F" }}>{act}% activation</strong>.
              {inst - sign > 0 && <> {inst - sign} people installed and never became users — the biggest single number to move.</>}
            </div>
          );
        })()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK, margin: "16px 0 8px" }}>Engagement & lifecycle</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(lifecycle || []).map((l) => (
          <div key={l.key} style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, flex: "1 1 140px" }}>
            <div style={{ color: MUTED }}>{l.label}</div>
            <div style={{ color: l.key === "deleted" && l.people > 0 ? "#FF7B72" : INK, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{l.people.toLocaleString()}</div>
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

  const [updatedAt, setUpdatedAt] = useState(null);
  const load = async () => {
    setErr("");
    const r = await fetch("/api/admin/posthog").catch(() => null);
    if (!r) return setErr("Network error");
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return setErr(j.error || `Failed (${r?.status})`);
    setD(j);
    setUpdatedAt(Date.now());
  };
  // Near-real-time: reload every 10 minutes so /admin stays current without a manual refresh.
  // PostHog ingestion lag is a few minutes, so a tighter interval would just re-query the same
  // numbers and burn quota; 10 min matches how fast the figures actually move.
  useEffect(() => {
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };  // refresh on tab focus
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const H2 = { fontSize: 20, fontWeight: 700, color: "#fff", margin: "28px 0 12px" };

  if (err) return (<><h2 style={H2}>Product metrics</h2><div style={{ ...CARD, color: "#FF7B72" }}>{err}</div></>);
  if (!d) return (<><h2 style={H2}>Product metrics</h2><div style={{ ...CARD, color: MUTED }}>Loading from PostHog…</div></>);

  const a = d.active, v = d.volume;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={H2}>Product metrics <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>· real users · India · last 30 days</span></h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: "#3FBF7F", display: "inline-block" }} />
            {updatedAt ? `updated ${new Date(updatedAt).toLocaleTimeString()} · auto every 10m` : "live"}
          </span>
          <button onClick={load} style={{ background: "transparent", color: "#F6EEE8", border: "1.5px solid rgba(255,255,255,.18)", borderRadius: 12, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Tile k="DAU" v={a.dau} sub={a.globalDau != null ? `${a.globalDau} incl. test` : "last 24h"} accent={DAU_C} />
        <Tile k="WAU" v={a.wau} sub={a.globalWau != null ? `${a.globalWau} incl. test` : "last 7 days"} />
        <Tile k="MAU" v={a.mau} sub={a.globalMau != null ? `${a.globalMau} incl. test` : "last 30 days"} />
        <Tile k="Stickiness" v={`${a.stickiness}%`} sub="DAU ÷ MAU" />
        <Tile k="Avg DAU" v={a.avgDau} sub="full days only" />
        <Tile k="Sessions" v={(v?.sessions ?? 0).toLocaleString()} sub={`${v.sessionsPerPerson} per person`} />
        <Tile k="Events" v={(v?.events30d ?? 0).toLocaleString()} sub="30 days" />
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
        Headline figures are <strong style={{ color: SUB }}>real India users</strong>; the “incl. test”
        number under each is the raw global count (CI, emulators, store-review). That gap is why the old
        MAU read ~2× the real base.
      </div>

      {d.funnel && <TrueUsers f={d.funnel} />}
      {d.journey && <Journey steps={d.journey} lifecycle={d.lifecycle} />}
      {d.states && <GeoMap states={d.states} countries={d.countries} funnel={d.funnel} />}

      {/* A failed query returns [], which renders as a confident zero. Name the
          casualties instead — "we could not fetch this" and "this is genuinely
          empty" are different facts and must not look the same. */}
      {!!d.degraded?.length && (
        <div style={{ ...CARD, marginTop: 16, borderColor: "rgba(255,180,84,.4)", color: "#FFB454", fontSize: 13 }}>
          {d.degraded.length} of these queries failed and are showing empty: {d.degraded.join(", ")}.
        </div>
      )}

      <h2 style={H2}>Retention &amp; drop-off</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {!!d.retention?.length && <Retention rows={d.retention} />}
        {!!d.funnelByOs?.length && <DropOff rows={d.funnelByOs} />}
      </div>

      <h2 style={H2}>Engagement</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {!!d.newVsReturning?.length && <NewReturning rows={d.newVsReturning} />}
        {!!d.hourly?.length && <Hourly rows={d.hourly} />}
        {!!d.depth?.length && <Depth rows={d.depth} />}
        {!!d.sessionShape && (
          <div style={{ ...CARD, flex: "1 1 280px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Session shape</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>India · 30 days</div>
            <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
              <div><div style={{ fontSize: 11, color: MUTED }}>Events / session</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>{d.sessionShape.eventsPerSession}</div></div>
              <div><div style={{ fontSize: 11, color: MUTED }}>Median length</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>{secs(d.sessionShape.medianSecs)}</div></div>
              <div><div style={{ fontSize: 11, color: MUTED }}>Mean length</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: SUB }}>{secs(d.sessionShape.avgSecs)}</div></div>
            </div>
            {/* Mean far above median means a few very long sessions, not a
                generally engaged cohort — say so rather than let the bigger
                number get quoted. */}
            {d.sessionShape.medianSecs > 0 && d.sessionShape.avgSecs > d.sessionShape.medianSecs * 2 && (
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>
                Mean is more than double the median — a handful of very long sessions are pulling it up. Read the median.
              </div>
            )}
          </div>
        )}
      </div>

      <h2 style={H2}>What people do</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <BarList title="Screens" note="$screen · 30 days · by views"
          rows={(d.screens || []).map((r) => ({ label: r.screen, n: r.views, sub: `${r.people}p` }))}
          empty="No $screen events — the SDK's screen tracking is not wired." />
        <BarList title="Taps" note="$autocapture · 30 days"
          rows={(d.taps || []).map((r) => ({ label: r.target, n: r.taps, sub: `${r.people}p` }))}
          empty="No autocapture events — tap tracking is off in the app." />
        <BarList title="Feature adoption" note="India · people who ever reached it · 90 days"
          rows={(d.adoption || []).map((r) => ({ label: r.event, n: r.people, sub: ago(r.lastSeen), color: "#3FBF7F" }))}
          empty="No custom events yet." />
      </div>

      <h2 style={H2}>Devices &amp; builds</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <BarList title="App versions" note="30 days · people on each build"
          rows={(d.versions || []).map((r) => ({ label: `${r.version} · ${r.os}`, n: r.people, sub: ago(r.lastSeen) }))}
          empty="No $app_version property on events." />
        <BarList title="Devices" note="India · 90 days"
          rows={(d.devices || []).map((r) => ({ label: `${r.model} · ${r.os}`, n: r.people }))}
          empty="No $device_model property on events." />
        <BarList title="Errors &amp; crashes" note="30 days · $exception plus error/fail/crash events"
          rows={(d.errors || []).map((r) => ({ label: r.problem, n: r.count, sub: ago(r.lastSeen), color: "#FF7B72" }))}
          empty="Nothing matching — either clean, or crash reporting is not wired." />
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
                    <td style={{ padding: "6px 8px", textAlign: "right", color: SUB }}>{(r.events ?? 0).toLocaleString()}</td>
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
              {(e.count ?? 0).toLocaleString()} · {e.people}p
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
              <span style={{ color: SUB }}>{p.people} people · {(p.perPerson ?? 0).toLocaleString()} ev/person</span>
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
                <span style={{ color: SUB }}>{(e.count ?? 0).toLocaleString()} · {e.people}p</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
