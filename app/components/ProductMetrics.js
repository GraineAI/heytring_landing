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
import DotMatrix, { STATE_COLORS } from "./DotMatrix";
import dynamic from "next/dynamic";
import { rolling, denseSlots } from "../lib/series";
import { sumSeries, readout } from "../lib/daily";

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

  // Only real points. A null (an in-progress day) is skipped rather than coerced to 0, which would
  // draw the average diving to the floor on the last day of every chart.
  const linePts = series
    .map((d, i) => (avg[i] == null ? null : `${PADL + i * slot + slot / 2},${y(avg[i])}`))
    .filter(Boolean)
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
          <div style={{ color: SUB }}>
            <span style={{ color: AVG_C }}>●</span>{" "}
            {hover.avg == null ? "no 7d average — day still in progress" : `${hover.avg.toFixed(1)} avg (7d)`}
          </div>
        </div>
      )}

      {/* legend — required at 2 series, so identity is never colour-alone */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 10, fontSize: 12, color: SUB }}>
        <span><span style={{ color: DAU_C }}>●</span> Daily active people</span>
        <span><span style={{ color: AVG_C }}>●</span> 7-day average</span>
        <span style={{ color: MUTED }}>▨ Today (still in progress — excluded from the average)</span>
      </div>
    </div>
  );
}

/**
 * TrueUsers — reframes the inflated headline. MAU counts every person with any event, including CI,
 * emulators and App Store review bots; on an India-only login-required app that roughly doubles the
 * number. The honest read is the funnel: installed → signed in, and India vs test-infrastructure.
 */
/**
 * WHICH POPULATION AM I LOOKING AT — the label this page has never carried.
 *
 * Almost every complaint about "I can't read this dashboard" turns out to be this: the same word
 * means three different sets of people in three different cards, and nothing on screen says so. A
 * number without its population, source and window is not a number you can act on, and the reader
 * is left doing the reconciliation in their head every time.
 */
function Scope({ people, source, window: win }) {
  const parts = [people, source, win].filter(Boolean);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 10px" }}>
      {parts.map((p, i) => (
        <span key={i} style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: ".02em", color: MUTED,
          border: "1px solid rgba(255,255,255,.10)", borderRadius: 999, padding: "2px 8px",
        }}>{p}</span>
      ))}
    </div>
  );
}

/**
 * THE RECONCILIATION. This page reports activation three times — and all three are correct.
 *
 * 90.8% is of people who completed a signup. 45.7% is of India installs. 21.9% is of every install
 * including the CI, emulator and store-review traffic that installs, opens once and never signs in.
 * Each answers a different question, and a reader who meets them in three different cards with no
 * connecting sentence reasonably concludes the dashboard is broken.
 *
 * Put side by side with their denominators named, the spread stops being a contradiction and
 * becomes the most informative thing on the page: the distance between 45.7% and 21.9% IS the test
 * cohort, and the distance between 90.8% and 45.7% is everyone who installs and never starts.
 */
function Reconcile({ f }) {
  const rows = [
    {
      k: "Of everyone who started signing up",
      v: f.activationOfStarters,
      d: "people who requested a code",
      why: "How good the OTP screen is once someone commits. The narrowest denominator, so the flattering number — it excludes everyone who never tried.",
    },
    {
      k: "Of India installs",
      v: f.activationIndia,
      d: "installs geolocated to India",
      why: "The honest product number. Real people who installed, against the ones who got signed in.",
    },
    {
      k: "Of all installs",
      v: f.activation,
      d: "every install, test infrastructure included",
      why: "Depressed by CI, emulators and store review, which install and open but never sign in. Useful only as the size of that distortion.",
    },
  ].filter((r) => r.v != null);
  if (rows.length < 2) return null;
  return (
    <div style={{ ...CARD, marginTop: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>
        Why activation appears three times <span style={{ color: MUTED, fontWeight: 500 }}>· and why all three are right</span>
      </div>
      <div style={{ fontSize: 12.5, color: SUB, marginBottom: 12, lineHeight: 1.5 }}>
        Each card below this one measures activation against a different set of people. The numbers
        disagree because the denominators disagree — not because anything is broken. Read the middle
        one as the product number.
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r, i) => (
          <div key={r.k} style={{
            display: "flex", gap: 12, alignItems: "baseline", padding: "10px 12px", borderRadius: 10,
            background: i === 1 ? "rgba(63,191,127,.08)" : "rgba(255,255,255,.03)",
            border: i === 1 ? "1px solid rgba(63,191,127,.28)" : "1px solid rgba(255,255,255,.06)",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: i === 1 ? "#3FBF7F" : "#fff", minWidth: 72, fontVariantNumeric: "tabular-nums" }}>
              {r.v}%
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{r.k}</div>
              <div style={{ fontSize: 11.5, color: MUTED }}>denominator: {r.d}</div>
              <div style={{ fontSize: 12, color: SUB, marginTop: 2, lineHeight: 1.5 }}>{r.why}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrueUsers({ f }) {
  const testInfra = Math.max(0, (f.total || 0) - (f.india || 0));
  // Prefer the India-scoped rate; fall back to the global one only while the payload predates it,
  // so an older cached response degrades to the previous number rather than to a blank.
  const act = f.activationIndia ?? f.activation ?? null;
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
      <Scope people="India installs" source="PostHog" window="90 days" />
      <div style={{ fontSize: 12.5, color: SUB, marginBottom: 14, lineHeight: 1.5 }}>
        MAU counts anyone who opened the app — CI, emulators and store-review bots included. For a
        login-required, India-only app the number that means <strong style={{ color: INK }}>a real
        person onboarded</strong> is sign-ins, and the honest denominator is the India cohort.
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {step("Installed", f.installedIndia ?? f.installed, "in India", "#F4532E")}
        {step("In India", f.india, `${testInfra} elsewhere (mostly test infra)`, "#3B82F6")}
        {step("Signed in", f.signedInIndia ?? f.signedIn, "completed OTP — real users", "#3FBF7F")}
        {step("Activation", act, "signed in ÷ installed, India only",
              act != null && act < 30 ? "#FFB454" : "#3FBF7F")}
      </div>
      {/* THE DENOMINATOR IS THE WHOLE POINT. This panel's argument is that the honest denominator
          is the India cohort — and until now the activation figure beside it was computed on the
          global one, which includes the CI and review-bot installs that never sign in. Those land
          only in the denominator, so the headline number was reported LOWER than reality. Both are
          shown now: the India rate leads, the global rate stays visible as the size of the
          distortion. */}
      {act != null && (
        <div style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.55 }}>
          {`Read: ${(f.installedIndia ?? f.installed ?? 0).toLocaleString()} India installs → ${(f.signedInIndia ?? f.signedIn ?? 0).toLocaleString()} signed in (${act}% activation).`}
          {f.activation != null && f.activationIndia != null && f.activation !== f.activationIndia && (
            <> {" "}Counted globally it reads {f.activation}% — that gap is the {testInfra}-person
            test/CI/review cohort, which installs and opens but never signs in.</>
          )}
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
function GeoMap({ states, countries, funnel, dailyNew }) {
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
                <span style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  {/* Which states are still ADDING people, which is not the same question as
                      which states are biggest. A leaderboard sorted by a 90-day total can sit
                      unchanged for weeks while the growth quietly moves somewhere else. */}
                  {(() => {
                    const t = dailyNew?.byState?.[s.state];
                    const today = t?.[t.length - 1]?.people || 0;
                    const week = t ? t.slice(-7).reduce((a, r) => a + r.people, 0) : 0;
                    if (!t) return null;
                    return (
                      <span style={{ fontSize: 10.5, color: today > 0 ? "#3FBF7F" : "#6b6b6b" }}
                            title={`${week} new in the last 7 days`}>
                        {today > 0 ? `+${today}` : week > 0 ? `+${week}/7d` : "—"}
                      </span>
                    );
                  })()}
                  <span style={{ color: on ? "#F4532E" : SUB, fontWeight: on ? 700 : 400 }}>{s.people}</span>
                </span>
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



/* ─────────────────────────── day-to-day increase ─────────────────────────── */

/**
 * "+3 today", with the last fortnight's daily shape behind it.
 *
 * Every total on this page is a 90-day figure. Correct, and completely silent about direction:
 * "Ran checkup — 30" reads identically on the day it doubles and on the day it stops moving. The
 * delta is the part a reader can act on, and the fourteen bars are there so one good day is not
 * mistaken for a trend.
 *
 * WHAT THE NUMBER MEANS: people reaching this for the FIRST time that day — so it is exactly the
 * amount the total beside it went up by. Counting everyone active that day would include returning
 * users, and the tile would claim +8 while the number above it moved by 3.
 *
 * @param series   [{date, people}] oldest → newest, zero-filled by the API
 * @param approx   the tile sums several events, so a person who did two of them counts twice
 * @param missing  the delta query failed — say so rather than draw a confident +0
 */
function DayDelta({ series, approx, missing }) {
  if (missing) {
    return <div style={{ fontSize: 10, color: "#8C7C73", marginTop: 3 }}>delta unavailable</div>;
  }
  const r = readout(series);
  if (!r) return null;
  const { today, yesterday: prev, week } = r;
  const max = Math.max(1, ...series.map((x) => x.people));

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: today > 0 ? "#3FBF7F" : "#8C7C73" }}>
          {today > 0 ? `${approx ? "≈+" : "+"}${today} today` : "none today"}
        </span>
        <span style={{ fontSize: 10.5, color: "#8C7C73" }}>
          {prev > 0 ? `${prev} yest` : "0 yest"} · {week} in 7d
        </span>
      </div>
      {/* Fourteen days. A single "+3" cannot tell you whether three is a good day here. */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 16, marginTop: 3 }}
           title={series.map((r) => `${r.date}: +${r.people}`).join("\n")}>
        {series.map((r, i) => (
          <div key={r.date} style={{
            flex: 1, borderRadius: 1,
            height: `${Math.max(r.people > 0 ? 12 : 6, (r.people / max) * 100)}%`,
            background: r.people === 0 ? "rgba(255,255,255,.10)"
                      : i === series.length - 1 ? "#3FBF7F" : "rgba(63,191,127,.45)",
          }} />
        ))}
      </div>
      {approx && (
        <div style={{ fontSize: 9.5, color: "#8C7C73", marginTop: 2 }}>
          ≈ sums {">"}1 event; someone who did both counts twice
        </div>
      )}
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
  // FIXED SLOTS, DAY 1..30. The rows are sparse — a day nobody returned on simply is not in the
  // result — and drawing them as adjacent bars packed day 1, 2, 5, 9 under an axis labelled
  // "day 1 … day 30" compresses the gaps out of existence and makes a decaying curve look level.
  // A missing day is drawn as an absence, which is what it is.
  const curve = denseSlots(rows.filter((r) => r.day > 0), { key: "day", from: 1, to: 30 });
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
      {/* ABSOLUTE 0-100% SCALE, not scaled to the tallest bar. Normalising to the maximum made
          whichever day retained best fill the panel — so a curve peaking at 4% and one peaking at
          60% drew the identical picture, and the only chart on the page that decides whether the
          app lives could not distinguish them. The gridlines make the scale readable at a glance. */}
      <div style={{ position: "relative", height: 64, marginTop: 2 }}>
        {[25, 50, 75].map((g) => (
          <div key={g} style={{ position: "absolute", left: 0, right: 0, bottom: `${g}%`,
                                borderTop: "1px dashed rgba(255,255,255,.09)" }} />
        ))}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%", position: "relative" }}>
          {curve.map((r) => (
            <div key={r.day}
                 title={r.missing ? `Day ${r.day} · not measured`
                                      : `Day ${r.day} · ${r.people} people · ${r.pct}% of the cohort`}
                 style={{
                   flex: 1, borderRadius: 2,
                   // A day with no row is not a zero. It gets a hairline at the baseline in the
                   // muted colour, so "nobody came back" and "we have no reading" never look alike.
                   height: r.missing ? 1 : `${Math.max(1, Math.min(100, r.pct || 0))}%`,
                   background: r.missing ? "rgba(255,255,255,.14)" : "#F4532E",
                   opacity: r.missing ? 1 : 0.45 + 0.55 * Math.min(1, (r.pct || 0) / 100),
                 }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: MUTED, marginTop: 4 }}>
        <span>day 1</span>
        <span>0–100% of the day-0 cohort</span>
        <span>day 30</span>
      </div>
    </div>
  );
}

/** Install → open → sign-in, per platform, with the losses named. */
/**
 * SIGN-IN FUNNEL — the five arrows docs-signin-funnel.md asked for.
 *
 * One row per platform, because the whole argument in that doc is that Android and iOS lose
 * people at different rates and a shared backend bug would hurt both equally. The collapsing
 * arrow is NAMED rather than left for the reader to spot across five percentages.
 */
function SigninFunnel({ rows }) {
  const STEPS = [
    ["Phone screen", "shown"], ["Number entered", "submit"], ["Code screen", "otpShown"],
    ["Code entered", "otpSubmit"], ["Signed in", "success"],
  ];
  return (
    <div style={{ ...CARD, flex: "1 1 520px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Sign-in funnel</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Last 30 days · where sign-in actually breaks</div>
      {rows.map((r) => (
        <div key={r.os} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{r.os}</div>
            <div style={{ fontSize: 12, color: SUB }}>
              {r.shown} reached the phone screen → {r.success} signed in
              {r.endToEnd != null && <strong style={{ color: r.endToEnd < 30 ? "#FF7B6B" : "#5CD98A" }}> · {r.endToEnd}%</strong>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {STEPS.map(([label, key]) => {
              const v = r[key] || 0;
              const w = r.shown ? Math.max(3, (v / r.shown) * 100) : 3;
              return (
                <div key={key} style={{ flex: 1 }}>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                    <div style={{ width: `${w}%`, height: 8, background: "#FF3D00" }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: MUTED, marginTop: 5 }}>{label}</div>
                  <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>{v}</div>
                </div>
              );
            })}
          </div>
          {r.worstStep && (
            <div style={{ fontSize: 12, color: "#FFB454", marginTop: 8 }}>
              Weakest arrow: <strong>{r.worstStep}</strong> — {r.worstRate}% pass, {r.worstLost} lost.
            </div>
          )}
        </div>
      ))}
      {!rows.length && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 12 }}>No sign-in events yet — the app build carrying them may not have reached users.</div>}
    </div>
  );
}

/** Onboarding, ordered by the step index the app reports rather than by name. */
/**
 * "DELETE THE PART OR PROCESS." Musk's five-step algorithm puts deletion SECOND —
 * before simplifying, before optimising, and long before automating — because
 * optimising a step that should not exist is the most expensive way to be busy.
 * His check on whether you deleted enough is that you must later add back about
 * 10%; if nothing gets added back, you did not cut deep enough.
 *
 * Nothing on this dashboard was asking that question. Every onboarding panel
 * measured how well each step performs, which silently assumes every step should
 * exist. This asks the other question: which step should not be here at all.
 *
 * Two findings are derived, and neither needs a judgement call:
 *
 * POST-VALUE STEPS. "Turn it on" is the moment forwarding is enabled and Tring can
 * answer a call — this dashboard's own definition of ARMED. Any step sequenced
 * AFTER it is being asked of someone whose product already works, which is the
 * cheapest possible thing to cut: deleting it cannot break activation, because
 * activation already happened.
 *
 * THE WORST STEP. The largest single drop, and the people it costs. On Android
 * that is "Who's calling" at the very end — roughly half of everyone who armed the
 * product walks away during a caller-ID setup they did not need in order to
 * receive value. Optimising that screen is the trap; it is post-value, so the
 * honest move is to delete it from onboarding and offer it in-app later.
 */
function DeletionAudit({ rows }) {
  const byOs = {};
  rows.forEach((r) => { (byOs[r.os] = byOs[r.os] || []).push(r); });

  const findings = Object.entries(byOs).map(([os, list]) => {
    const steps = [...list].sort((a, b) => a.idx - b.idx);
    if (steps.length < 2) return null;
    // The arming step, matched on label rather than a hardcoded index — the two
    // platforms sequence it differently (6th on Android, 7th on iOS).
    const armIdx = steps.findIndex((r) => /turn it on/i.test(r.label || ""));
    const postValue = armIdx >= 0 ? steps.slice(armIdx + 1) : [];
    // Biggest absolute loss between consecutive steps.
    let worst = null;
    for (let i = 1; i < steps.length; i++) {
      const lost = (steps[i - 1].people || 0) - (steps[i].people || 0);
      if (lost > 0 && (!worst || lost > worst.lost)) {
        worst = { lost, step: steps[i], prev: steps[i - 1] };
      }
    }
    return { os, total: steps.length, postValue, worst };
  }).filter(Boolean);

  if (!findings.length) return null;

  return (
    <div style={{ ...CARD, flex: "1 1 420px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Delete the part</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
        which step should not exist — not how well it performs
      </div>
      {findings.map((f) => (
        <div key={f.os} style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>
            {f.os} <span style={{ color: MUTED, fontWeight: 500 }}>· {f.total} steps</span>
          </div>
          {f.worst && (
            <div style={{ fontSize: 12.5, color: SUB, marginTop: 6, lineHeight: 1.55 }}>
              Worst step: <b style={{ color: INK }}>{f.worst.step.label}</b> — costs{" "}
              <b style={{ color: "#FF7B6B" }}>{f.worst.lost}</b> of the{" "}
              {f.worst.prev.people} who reached the one before it.
            </div>
          )}
          {f.postValue.length > 0 ? (
            <div style={{ fontSize: 12.5, color: SUB, marginTop: 6, lineHeight: 1.55,
                          padding: "8px 10px", borderRadius: 8, background: "rgba(255,180,84,.10)" }}>
              <b style={{ color: "#FFB454" }}>
                {f.postValue.length} step{f.postValue.length > 1 ? "s" : ""} sit after the product
                already works
              </b>{" "}
              ({f.postValue.map((r) => r.label).join(", ")}). Forwarding is on by then, so Tring can
              already answer a call — deleting {f.postValue.length > 1 ? "these" : "this"} cannot
              break activation, because activation has happened. Offer it in-app once they have seen
              it work.
            </div>
          ) : (
            <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
              Nothing sequenced after the product is armed — this flow has no free deletions left.
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
        Musk&rsquo;s rule of thumb: if you never have to add back about 10% of what you deleted, you
        did not cut deep enough. Deletion comes before optimisation — a step that should not exist
        cannot be improved into one that should.
      </div>
    </div>
  );
}

function OnboardingFunnel({ rows, back }) {
  const byOs = {};
  rows.forEach((r) => { (byOs[r.os] = byOs[r.os] || []).push(r); });
  return (
    <div style={{ ...CARD, flex: "1 1 420px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Onboarding steps</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Share of each platform&apos;s own first step</div>
      {Object.entries(byOs).map(([os, list]) => (
        <div key={os} style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 6 }}>{os}</div>
          {list.sort((a, b) => a.idx - b.idx).map((r) => (
            <div key={r.idx} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <div style={{ width: 132, fontSize: 12, color: SUB }}>{r.idx}. {r.label}</div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, r.pct || 0)}%`, height: 8, background: "#5CD98A" }} />
              </div>
              <div style={{ width: 74, textAlign: "right", fontSize: 12, color: INK }}>{r.people}{r.pct != null && <span style={{ color: MUTED }}> · {r.pct}%</span>}</div>
            </div>
          ))}
        </div>
      ))}
      {!!back?.length && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize: 12, color: MUTED }}>Went backwards from</div>
          {back.map((b) => (
            <div key={b.idx} style={{ fontSize: 12.5, color: INK, marginTop: 4 }}>{b.label} — <strong>{b.people}</strong> people</div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Leaving: deletion and logout, with the denominators that did not exist before. */
function ExitFunnel({ data, reasons }) {
  const Block = ({ title, f, extra }) => (
    <div style={{ flex: "1 1 200px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{title}</div>
      <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>
        {f.opened} opened → {f.completed} completed
        {f.completionRate != null && <strong> · {f.completionRate}%</strong>}
      </div>
      {f.stalled > 0 && <div style={{ fontSize: 12, color: "#FFB454", marginTop: 4 }}>{f.stalled} opened and did neither</div>}
      {extra}
    </div>
  );
  return (
    <div style={{ ...CARD, flex: "1 1 420px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Leaving</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>90 days</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
        <Block title="Delete account" f={data.deletion}
          extra={data.deletion.recoveredRate != null && <div style={{ fontSize: 12, color: "#5CD98A", marginTop: 4 }}>{data.deletion.cancelled} changed their mind ({data.deletion.recoveredRate}%)</div>} />
        <Block title="Log out" f={data.logout}
          extra={data.logout.gateFailed > 0 && <div style={{ fontSize: 12, color: "#FF7B6B", marginTop: 4 }}>{data.logout.gateFailed} left Ring ON server-side</div>} />
      </div>
      {!!reasons?.length && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Why they said they left</div>
          {reasons.slice(0, 6).map((r) => (
            <div key={r.reason} style={{ display: "flex", gap: 10, fontSize: 12.5, color: INK, marginTop: 3 }}>
              <div style={{ flex: 1 }}>{r.reason}</div>
              <div style={{ color: "#FF7B6B" }}>{r.deleted} deleted</div>
              <div style={{ color: SUB }}>{r.loggedOut} out</div>
              <div style={{ color: "#5CD98A" }}>{r.changedMind} stayed</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Where people come from, and whether the referral loop closes. */
function Channels({ rows, loop }) {
  return (
    <div style={{ ...CARD, flex: "1 1 320px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Channels</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>90 days · first touch</div>
      {rows.map((r) => (
        <div key={r.channel} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <div style={{ width: 140, fontSize: 12, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.channel}</div>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(2, r.pct)}%`, height: 8, background: "#7BE3A9" }} />
          </div>
          <div style={{ width: 64, textAlign: "right", fontSize: 12, color: INK }}>{r.people}</div>
        </div>
      ))}
      {!!loop && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 12.5, color: SUB }}>
          Referral loop: {loop.opened} opened → {loop.shared} shared
          {loop.shareRate != null && ` (${loop.shareRate}%)`} → {loop.redeemed} redeemed
          {loop.redeemRate != null && ` (${loop.redeemRate}%)`}
          {/* This line said "0 redeemed" on a page whose referral card reads 26. Both were
              rendered as fact, three sections apart, and the reader had no way to tell which
              to believe. They are not measuring the same thing: a redemption exists in Apollo
              because Apollo GRANTS the reward, whereas it reaches PostHog only if the app
              remembered to fire referral_redeemed — which it has done once against Apollo's
              26. So this counts EVENT COVERAGE, not redemptions, and must say so. */}
          <div style={{ marginTop: 6, fontSize: 11, color: "#8C7C73", lineHeight: 1.5 }}>
            Client events only, and they under-fire badly — Apollo has recorded far more
            redemptions than the app has reported. Read this as how much of the loop is
            instrumented; the referral engine card is the authoritative count.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * TODOS — what the dashboard concludes, derived from its own numbers.
 * Each carries the metric that produced it, so it vanishes when the thing is fixed rather
 * than needing to be ticked off by hand.
 */
function Todos({ rows }) {
  const TONE = { high: "#FF7B6B", medium: "#FFB454", low: SUB };
  return (
    <div style={{ ...CARD, flex: "1 1 100%" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>What to fix next</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Derived from the numbers on this page — worst first</div>
      {rows.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 12, paddingTop: i ? 12 : 0, borderTop: i ? "1px solid rgba(255,255,255,.06)" : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: TONE[t.severity], marginTop: 6, flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{t.title}</div>
            <div style={{ fontSize: 12.5, color: SUB, marginTop: 2 }}>{t.detail}</div>
          </div>
          <div style={{ fontSize: 12, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{t.area} · {t.metric}</div>
        </div>
      ))}
      {!rows.length && <div style={{ fontSize: 12.5, color: "#5CD98A", marginTop: 12 }}>Nothing above the noise floor right now.</div>}
    </div>
  );
}


function DropOff({ rows, dailyNew }) {
  return (
    <div style={{ ...CARD, flex: "2 1 420px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Drop-off by platform</div>
      {/* GLOBAL, unlike the card above — which is exactly why its install counts are larger. */}
      <Scope people="all installs incl. test infra" source="PostHog" window="90 days" />
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
          {/* TODAY, PER STEP. A 90-day funnel says where people were lost since June; it cannot
              say whether yesterday's build fixed it. These are people reaching each step for the
              first time in the last 24 hours, so they are the amount each bar above grew by. */}
          {(() => {
            const step = (k) => {
              const t = dailyNew?.byOsStep?.[`${r.os}|${k}`];
              return { today: t?.[t.length - 1]?.people || 0,
                       week: t ? t.slice(-7).reduce((a, x) => a + x.people, 0) : 0, has: !!t };
            };
            const [ins, opn, sin] = [step("installed"), step("opened"), step("signed_in")];
            if (!ins.has && !opn.has && !sin.has) return null;
            return (
              <div style={{ display: "flex", gap: 14, marginTop: 5, fontSize: 10.5, color: "#8C7C73" }}>
                {[["installed", ins], ["opened", opn], ["signed in", sin]].map(([label, v]) => (
                  <span key={label}>
                    {label}{" "}
                    <b style={{ color: v.today > 0 ? "#3FBF7F" : "#6b6b6b" }}>
                      {v.today > 0 ? `+${v.today}` : "+0"}
                    </b>
                    <span> today · {v.week}/7d</span>
                  </span>
                ))}
              </div>
            );
          })()}
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
      {/* Slots keyed by ACTIVE-DAY COUNT, not by row index. `rows` is sparse — no row exists for a
          bucket nobody landed in — so mapping the array straight to bars placed "11 active days"
          wherever it happened to fall in the result set. The histogram was mislabelled by however
          many buckets were empty. */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 54 }}>
        {denseSlots(rows, { key: "daysActive", from: 1, to: 30 }).map((slot) => {
          const d = slot.daysActive, people = slot.people ?? 0;
          return (
            <div key={d} title={`${d} active day${d === 1 ? "" : "s"} · ${people} people`}
                 style={{ flex: 1, height: `${Math.max(people > 0 ? 2 : 1, (people / max) * 100)}%`,
                          background: people === 0 ? "rgba(255,255,255,.10)"
                                    : d === 1 ? "#FFB454" : "#3FBF7F",
                          opacity: 0.85, borderRadius: 2 }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: MUTED, marginTop: 4 }}>
        <span>1 day</span><span>30 days</span>
      </div>
    </div>
  );
}

/**
 * Journey — the download→onboarded funnel as horizontal bars, each step's width relative to the
 * top of the funnel, with step-to-step conversion and the drop between them. The later steps read 0
 * until a build carrying the new events ships, which is shown as "awaiting build" rather than hidden.
 */
function Journey({ steps, lifecycle, otpAutofillRate, shareLoop, dailyNew }) {
  // The PostHog SDK is already in the shipped binary, so the granular activation events flow over
  // OTA — they are NOT waiting on a native build. They begin at 0 only until the OTA that carries
  // them propagates to installed devices (a day or so as apps reopen), then self-populate. Nothing
  // is "pending a build" anymore, so no step is drawn as a permanent dashed placeholder.
  const PENDING = new Set([]);
  const top = Math.max(1, steps[0]?.people || 0);
  const anyPending = steps.some((s) => PENDING.has(s.key) && s.people === 0);
  let lastMeasured = null;   // carry the previous step that actually had data, to skip pending gaps
  return (
    <div style={{ ...CARD, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>User lifecycle <span style={{ color: MUTED, fontWeight: 500 }}>· code requested → signed in → armed → activated → retained</span></div>
        <Scope people="India installs" source="PostHog events" window="90 days" />
        {anyPending && <div style={{ fontSize: 11.5, color: "#8C7C73" }}>grey steps ship their event in the next release</div>}
      </div>
      <div style={{ marginTop: 14 }}>
        {steps.map((s, i) => {
          const pending = PENDING.has(s.key) && s.people === 0;
          const pct = Math.round((s.people / top) * 100);
          /**
           * A STEP CANNOT CONVERT ABOVE 100%, AND THIS ONE WAS PRINTING 180%.
           *
           * These stages are independent uniqIf() counts, not a true funnel: each asks "how many
           * people fired this event", never "how many who did the previous one went on to do this".
           * So a later stage can legitimately exceed an earlier one — someone who signed in without
           * login_otp_requested ever being recorded (an older build, or a path that skips it) is
           * counted at "signed in" and not at "code requested".
           *
           * Printing that as "180% of prev · −45 lost" is worse than printing nothing: it states a
           * conversion rate that cannot exist, and a NEGATIVE loss shown as a loss. Where a stage
           * grew, say so — the growth is real information (it means the earlier event is
           * under-recorded), and it is the flag that tells someone to go and fix instrumentation
           * rather than onboarding.
           */
          const grew = !pending && lastMeasured ? s.people > lastMeasured.people : false;
          const conv = !pending && lastMeasured && !grew
            ? Math.round((s.people / Math.max(1, lastMeasured.people)) * 100) : null;
          const dropped = !pending && lastMeasured && !grew ? lastMeasured.people - s.people : null;
          if (!pending) lastMeasured = s;
          return (
            <div key={s.key} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ color: pending ? MUTED : INK, fontWeight: pending ? 400 : 600 }}>
                  {i + 1}. {s.label}
                  {/* Where a stage is a client event rather than a backend fact, say so on the row.
                      The alternative is two numbers under near-identical names on one page and a
                      reader deciding, wrongly, that one corrects the other. */}
                  {s.source && <span style={{ color: MUTED, fontWeight: 400 }}> · {s.source}</span>}
                </span>
                {pending ? (
                  <span style={{ color: MUTED, fontStyle: "italic" }}>ships next release</span>
                ) : (
                  <span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{s.people.toLocaleString()}</span>
                    {conv != null && <span style={{ color: conv < 60 ? "#FFB454" : MUTED }}> · {conv}% of prev</span>}
                    {grew && (
                      <span style={{ color: "#E4926F" }} title="This stage counts more people than the one before it, which a funnel cannot do. These are independent event counts, so the earlier step is under-recorded — an instrumentation gap, not a conversion.">
                        {" "}· more than the step before — earlier event under-recorded
                      </span>
                    )}
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
          const g = (k) => steps.find((s) => s.key === k)?.people || 0;
          const signed = g("signed_in"), armed = g("forwarding_enabled"), activated = g("activated");
          // ACTIVATED is the honest headline: Tring actually answered a call for this many people.
          // "armed but not yet answered" is a waiting room, not a drop-off — call it out separately.
          const waiting = Math.max(0, armed - activated);
          return (
            <div style={{ marginTop: 6, padding: "10px 14px", background: "rgba(244,83,46,.08)", borderRadius: 10, fontSize: 13, color: INK, lineHeight: 1.5 }}>
              <strong>Bottom line:</strong> {signed} signed in → {armed} armed (forwarding on) → <strong style={{ color: "#3FBF7F" }}>{activated} activated</strong> — Tring has answered a real call for {activated}.
              {waiting > 0 && <> {waiting} are armed but their phone hasn’t rung yet — waiting, not lost.</>}
            </div>
          );
        })()}
      </div>
      {/* SMS auto-read effectiveness — the fix for the OTP-screen leak. Reads 0% until the OTA that
          carries the event reaches users; a low Android rate afterwards is the case for the
          SMS-Retriever native path (that part IS a native build). */}
      <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, fontSize: 12.5, color: INK, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ color: MUTED }}>OTP auto-read from SMS</span>
        <span>
          <strong style={{ fontSize: 16, color: (otpAutofillRate || 0) >= 60 ? "#3FBF7F" : "#FFB454" }}>{otpAutofillRate != null ? `${otpAutofillRate}%` : "—"}</strong>
          <span style={{ color: MUTED }}> of people who saw the code screen</span>
        </span>
      </div>

      {/* WORD-OF-MOUTH LOOP — the K-factor funnel. Shared-sheet opened → actually sent → referred →
          redeemed. This is the panel that shows whether the post-call WhatsApp share moves virality
          off ~0. Pending until the granular build ships. */}
      {shareLoop && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, margin: "16px 0 8px" }}>Word-of-mouth loop <span style={{ color: MUTED, fontWeight: 500 }}>· post-call WhatsApp share · 90d</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              ["Opened share sheet", shareLoop.tapped, MUTED, "tapped"],
              ["Actually sent", shareLoop.completed, "#3FBF7F", "completed"],
              ["Referred a friend", shareLoop.referred, MUTED, "referred"],
              ["Redeemed", shareLoop.redeemed, "#FFB454", "redeemed"],
            ].map(([label, n, c, step]) => {
              const evs = shareLoop.events?.[step] || [];
              return (
              <div key={label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, flex: "1 1 140px" }}>
                <div style={{ color: MUTED }}>{label}</div>
                <div style={{ color: c, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{Number(n || 0).toLocaleString()}</div>
                <DayDelta series={sumSeries(dailyNew?.byEvent, evs)} approx={evs.length > 1}
                          missing={dailyNew?.degraded?.includes("newByEventDay")} />
              </div>
              );
            })}
          </div>
          {/* Same trap as the Channels line above: these four tiles are app events, and
              "Redeemed" here has fired once while Apollo has granted 26. Kept because the
              gap between tiles is the only view of where instrumentation is missing — but
              it is not the referral scoreboard, and unlabelled it was being read as one. */}
          <div style={{ marginTop: 6, fontSize: 11, color: "#8C7C73", lineHeight: 1.5 }}>
            App events, not the ledger. Redemptions in particular under-fire — the referral
            engine card counts what Apollo actually granted.
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, color: "#8C7C73" }}>
            {shareLoop.tapped > 0
              ? `${shareLoop.completionRate}% of opened shares were actually sent.`
              : "fills in as the OTA reaches users — then this measures whether the WhatsApp share moves K off ~0."}
          </div>
        </>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: INK, margin: "16px 0 8px" }}>Engagement & lifecycle</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(lifecycle || []).map((l) => (
          <div key={l.key} style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, flex: "1 1 140px" }}>
            <div style={{ color: MUTED }}>{l.label}</div>
            <div style={{ color: l.key === "deleted" && l.people > 0 ? "#FF7B72" : INK, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{l.people.toLocaleString()}</div>
            <DayDelta series={sumSeries(dailyNew?.byEvent, l.events)} approx={(l.events || []).length > 1}
                      missing={dailyNew?.degraded?.includes("newByEventDay")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ActionItems — "what to do next", computed live from the numbers (not written by hand, not an
 * external model). Deterministic rules over the current payload, so it re-derives on every 10-minute
 * refresh and always matches what's on screen. Sorted by priority; each item names the metric that
 * triggered it and one concrete fix.
 */
function ActionItems({ d, ledger }) {
  const items = [];
  const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
  const lc = Object.fromEntries((d.lifecycle || []).map((l) => [l.key, l.people]));
  const f = d.funnel || {}; const a = d.active || {};

  // 1. Activation — the biggest lever on this app right now.
  //
  // INDIA, NOT GLOBAL. This read f.activation and f.installed, which include the CI, emulator and
  // store-review traffic that installs, opens once and never signs in — so it announced "activation
  // is only 24.1%, 309 of 407 installers never signed in" while the card directly above it explained
  // that the honest figure is 49.2% and that the gap IS the test cohort. Two adjacent panels, same
  // page, opposite stories, and the one telling the team what to do next was using the wrong one.
  const instHonest = f.installedIndia ?? f.installed;
  const signedHonest = f.signedInIndia ?? f.signedIn;
  const actHonest = f.activationIndia ?? f.activation;
  if (instHonest && actHonest != null && actHonest < 35) {
    const lost = (instHonest || 0) - (signedHonest || 0);
    items.push({ p: "critical", t: `Fix the sign-in step — activation is only ${actHonest}%`,
      why: `${lost} of ${instHonest} India installers never signed in (test/CI traffic excluded).`,
      fix: "Instrument + redesign the OTP screen: pre-fill the country code, auto-read the SMS code, show progress, and let them explore before demanding a number. This is the single biggest download→user lever." });
  }
  // 2. Crashes — a live crash caps everything above it.
  const err = (d.errors || [])[0];
  if (err && (err.count || err.n)) {
    items.push({ p: "critical", t: `Fix the recurring crash — ${(err.count || err.n)} hits`,
      why: `"${(err.problem || err.label || "app error").slice(0, 60)}" is the top error.`,
      fix: "Ship a patch this week. Every crash on a beta user is a user you likely won't get back." });
  }
  // 3. Referral engine — measured against APOLLO, which grants the reward, not against the client
  // event that fires once for every twenty-six it grants.
  //
  // This used to count referral_share_completed / referral_copy in PostHog and declare "your viral
  // coefficient is ~0" beneath a card reading k = 0.49 with 26 redemptions. The advice that follows
  // from ~0 ("add a post-call WhatsApp share with a two-sided reward") describes a feature that
  // already exists and is working — which is what advice built on the under-firing source gets you.
  const k = ledger?.k_factor ?? null;
  const redemptions = ledger?.redemptions ?? null;
  const referrersPct = ledger?.participation_pct ?? null;
  if (k != null) {
    // A loop that turns but not fast enough is a different problem from a loop that is not turning,
    // and it takes different work: amplify what already converts rather than build a mechanic.
    if (k < 0.6) {
      items.push({ p: "high", t: `Referral works but is under-fed — k = ${k}`,
        why: `${redemptions ?? "—"} redemptions so far, from ${referrersPct ?? "—"}% of activated users. The loop turns; too few people enter it.`,
        fix: "Do not build a new share mechanic — one exists and converts. Put the ask where value just landed (after a screened call) and widen who sees it, then re-read k in a week." });
    }
  } else {
    // Say WHICH source is missing rather than silently falling back to the wrong one.
    items.push({ p: "medium", t: "Referral numbers unavailable",
      why: "Apollo's referral ledger could not be read, and the PostHog referral events under-count it by roughly 26x — so no referral advice is shown rather than advice built on the wrong source.",
      fix: "Check /api/admin/churn?view=referrals and APOLLO_ADMIN_API_KEY on this deployment." });
  }
  // 4. Retention — do people come back?
  const ret = d.retention || [];
  const d7 = ret.find((r) => /d?7\b/i.test(r.day || r.label || String(r.n ?? "")));
  const d7v = d7 ? Number(d7.pct ?? d7.value ?? d7.people) : null;
  if (d7v != null && d7v < 20) {
    items.push({ p: "high", t: `Give people a reason to return — D7 retention ~${d7v}%`,
      why: "Most users don't come back after week one.",
      fix: "Send a weekly \"here's what Tring caught for you\" summary push, and surface missed-call value on day 2–3. Retention is what makes growth compound instead of leak." });
  }
  // 5. Platform bias — spend where it converts.
  const plat = (d.platform || []).filter((p) => p.people > 0);
  const ios = plat.find((p) => /ios/i.test(p.os)); const and = plat.find((p) => /android/i.test(p.os));
  if (ios && and && ios.perPerson > and.perPerson * 1.5) {
    items.push({ p: "medium", t: "Bias acquisition toward iPhone + WhatsApp",
      why: `iOS users are far more engaged (${ios.perPerson} vs ${and.perPerson} events/person).`,
      fix: "Shift creative and spend toward iOS and the whatsapp/fnf channel that already dominates your signups; treat broad ChatGPT-link installs as top-of-funnel only." });
  }
  // 6. Analytics hygiene — clean the test traffic.
  if (a.globalMau && a.mau && a.globalMau > a.mau * 1.4) {
    items.push({ p: "medium", t: "Separate test traffic from your real numbers",
      why: `~${a.globalMau - a.mau} of ${a.globalMau} monthly actives are CI / emulators / store review.`,
      fix: "Disable analytics in dev/CI builds, or point them at a separate PostHog project, so nobody has to mentally subtract robots again." });
  }
  // 7. Geo concentration — double down where you're winning.
  const st = (d.states || []).filter((s) => s.people > 0).slice(0, 2);
  if (st.length === 2 && st[0].people >= 20) {
    items.push({ p: "low", t: `Double down on ${st[0].state.replace("National Capital Territory of ", "")} & ${st[1].state}`,
      why: "These are your strongest organic clusters — proof the product spreads there.",
      fix: "Run referral pushes and regional-language creative in these states before opening new ones." });
  }
  // 8. Churn watch.
  if ((lc.deleted || 0) > 0) {
    items.push({ p: "low", t: `${lc.deleted} account deletion${lc.deleted === 1 ? "" : "s"} — watch the reason`,
      why: "Deletions are your clearest dissatisfaction signal.",
      fix: "Add a one-tap \"why are you leaving?\" on the delete screen." });
  }

  items.sort((x, y) => RANK[x.p] - RANK[y.p]);
  const C = { critical: "#FF7B72", high: "#FFB454", medium: "#3B82F6", low: "#8C7C73" };
  const LBL = { critical: "DO NOW", high: "HIGH", medium: "MEDIUM", low: "LATER" };
  if (!items.length) return null;
  return (
    <div style={{ ...CARD, marginTop: 12, borderColor: "rgba(255,123,114,.28)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Action items <span style={{ color: MUTED, fontWeight: 500 }}>· what to do next, from the live numbers</span></div>
        <div style={{ fontSize: 11.5, color: MUTED }}>re-computed every refresh · not a static list</div>
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.03)", borderRadius: 12, borderLeft: `3px solid ${C[it.p]}` }}>
            <div style={{ flexShrink: 0, width: 62, fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: C[it.p], paddingTop: 2 }}>{LBL[it.p]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{it.t}</div>
              <div style={{ fontSize: 12.5, color: SUB, marginTop: 3 }}>{it.why}</div>
              <div style={{ fontSize: 12.5, color: "#9FE0BC", marginTop: 5, lineHeight: 1.5 }}>→ {it.fix}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * AIStrategist — OpenAI-written strategy over the same live numbers, framed in Zero to One.
 * The key stays server-side (/api/admin/insights); this only posts the compact summary it already
 * has and renders the JSON back. Regenerates with the 10-minute cycle; server caches to that window.
 */
function AIStrategist({ d, tick }) {
  const [ins, setIns] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  /** When the cached answer was generated — so a stale strategy is visibly stale. */
  const [stamp, setStamp] = useState(null);
  const summary = () => {
    const a = d.active || {}, f = d.funnel || {};
    const lc = Object.fromEntries((d.lifecycle || []).map((l) => [l.key, l.people]));
    return {
      real_users_india: { dau: a.dau, wau: a.wau, mau: a.mau, stickiness_pct: a.stickiness, avg_dau: a.avgDau },
      global_incl_test: { mau: a.globalMau },
      funnel: { installed: f.installed, opened: f.opened, signed_in: f.signedIn, activation_pct: f.activation, india: f.india, total: f.total },
      sessions: d.volume,
      // Milestones, not the whole curve. Sending 27 rows made the prompt large
      // (slower and dearer per call) and made the server's 10-minute cache key
      // change whenever any single day moved by one person — so the cache
      // almost never hit and nearly every dashboard load paid for a fresh
      // model run. D1/D7/D14/D30 is what anyone would actually read anyway.
      retention: Object.fromEntries(
        [1, 7, 14, 30].map((n) => [`d${n}_pct`, (d.retention || []).find((r) => r.day === n)?.pct ?? null])
      ),
      // Newly available and worth more to a strategist than the raw curve.
      drop_off_by_platform: (d.funnelByOs || []).map((r) => ({
        os: r.os, installed: r.installed, signed_in: r.signedIn,
        sign_in_rate_pct: r.signInRate, lost_at_sign_in: r.lostAtSignIn,
      })),
      depth: { one_day_only: (d.depth || []).find((x) => x.daysActive === 1)?.people ?? null,
               five_plus_days: (d.depth || []).filter((x) => x.daysActive >= 5).reduce((n, x) => n + x.people, 0) },
      session_shape: d.sessionShape,
      lifecycle: lc,
      platform: (d.platform || []).map((p) => ({ os: p.os, people: p.people, events_per_person: p.perPerson })),
      top_states: (d.states || []).slice(0, 6).map((s) => ({ state: s.state, people: s.people })),
      countries: d.countries,
      top_error: (d.errors || [])[0] || null,
    };
  };
  /**
   * `mode`: "cached" reads without ever calling the model; "generate" spends a call.
   *
   * This used to run on mount AND on every 10-minute auto-refresh tick, so simply leaving the
   * dashboard open bought a model call every ten minutes, forever, whether or not anyone was
   * reading it. The in-memory cache was supposed to absorb that, but it lives in a serverless
   * function's module scope — a cold start empties it, and the panel paid again.
   *
   * Generation is now a deliberate act. Opening the page shows the last answer; getting a new one
   * costs a click.
   */
  const run = async (mode) => {
    const generate = mode === "generate";
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/insights", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: summary(), force: generate, cachedOnly: !generate }),
    }).catch(() => null);
    setBusy(false);
    if (!r) return setErr("Network error");
    const j = await r.json().catch(() => ({}));
    if (!j.ok) return setErr(j.error || "Failed");
    if (j.insights) { setIns(j.insights); setStamp(j.at || null); }
    else if (generate) setErr("The model returned nothing — try again.");
    else setStamp(null);   // nothing cached yet; the panel invites a first run
  };
  // CACHE READ ONLY, and only once the data is in. Deliberately NOT keyed on `tick`: that is the
  // 10-minute refresh, and re-reading a cache every ten minutes is pointless where re-GENERATING
  // every ten minutes was expensive.
  const askedRef = useRef(false);
  useEffect(() => {
    if (!d || askedRef.current) return;
    askedRef.current = true;
    run("cached");
  }, [d]); // eslint-disable-line

  const C = { critical: "#FF7B72", high: "#FFB454", medium: "#3B82F6" };
  const LBL = { critical: "DO NOW", high: "HIGH", medium: "MEDIUM" };
  return (
    <div style={{ ...CARD, marginTop: 12, borderColor: "rgba(159,224,188,.28)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
          AI strategist <span style={{ color: MUTED, fontWeight: 500 }}>· Thiel · Bezos · Christensen · Grove · Collins · Goldratt · live</span>
        </div>
        <button onClick={() => run("generate")} disabled={busy} style={{ background: "transparent", color: "#9FE0BC", border: "1.5px solid rgba(159,224,188,.4)", borderRadius: 10, padding: "6px 14px", fontWeight: 700, fontSize: 12.5, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Thinking…" : ins ? "Regenerate" : "Generate"}
        </button>
      </div>
      {err && <div style={{ fontSize: 13, color: "#FFB454", marginTop: 10 }}>{err}</div>}
      {!err && !ins && (
        <div style={{ fontSize: 13, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>
          {busy ? "Asking the model…" : "No strategy generated yet. This one costs a model call, so it runs only when you ask — tap Generate."}
        </div>
      )}
      {ins && stamp && (
        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
          Generated {new Date(stamp).toLocaleString()} — from the numbers as they were then, not live.
        </div>
      )}
      {ins && (
        <>
          {ins.headline && <div style={{ fontSize: 14.5, color: INK, marginTop: 10, lineHeight: 1.5, fontWeight: 600 }}>{ins.headline}</div>}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {(ins.items || []).map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", background: "rgba(255,255,255,.03)", borderRadius: 12, borderLeft: `3px solid ${C[it.priority] || MUTED}` }}>
                <div style={{ flexShrink: 0, width: 60, fontSize: 10, fontWeight: 800, letterSpacing: ".05em", color: C[it.priority] || MUTED, paddingTop: 2 }}>{LBL[it.priority] || "NOTE"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{it.title}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                    {it.metric && <span style={{ color: SUB }}>{it.metric}</span>}
                    {it.principle && <span style={{ color: "#9FB8F5" }}>{it.metric ? "  ·  " : ""}{it.principle}</span>}
                  </div>
                  {it.action && <div style={{ fontSize: 12.5, color: "#9FE0BC", marginTop: 5, lineHeight: 1.5 }}>→ {it.action}</div>}

                  {/* THE PLAYBOOK. Advice that stops at "improve onboarding" has told the founder
                      nothing they did not already know — the value is entirely in the steps, so
                      they get the room. Numbered and ordered because they are meant to be worked
                      through in sequence, and the last one is always the check that proves it. */}
                  {Array.isArray(it.how) && it.how.length > 0 && (
                    <ol style={{ margin: "9px 0 0", paddingLeft: 0, listStyle: "none" }}>
                      {it.how.map((step, si) => (
                        <li key={si} style={{ display: "flex", gap: 9, alignItems: "flex-start",
                                              padding: "5px 0",
                                              borderTop: si ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                          <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5,
                                         background: si === it.how.length - 1 ? "rgba(159,224,188,.18)" : "rgba(255,255,255,.07)",
                                         color: si === it.how.length - 1 ? "#9FE0BC" : MUTED,
                                         fontSize: 10, fontWeight: 700, display: "flex",
                                         alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                            {si === it.how.length - 1 ? "✓" : si + 1}
                          </span>
                          <span style={{ fontSize: 12.5, color: SUB, lineHeight: 1.5 }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/* The metadata a decision needs, on one line: who does it, how big, how sure we
                      are, whether it is reversible, and what would prove it wrong. */}
                  {(it.owner || it.effort || it.door || it.confidence || it.falsifier) && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                      {it.owner && <Chip>{it.owner}</Chip>}
                      {it.effort && <Chip>{it.effort}</Chip>}
                      {it.door && <Chip tone={it.door === "one-way" ? "warn" : "ok"}>
                        {it.door === "one-way" ? "one-way door" : "reversible"}
                      </Chip>}
                      {it.confidence && <Chip tone={it.confidence === "low" ? "warn" : undefined}>
                        {it.confidence} confidence
                      </Chip>}
                      {it.falsifier && (
                        <span style={{ fontSize: 11, color: MUTED, fontStyle: "italic" }}>
                          wrong if: {it.falsifier}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {ins.constraint && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(255,123,114,.09)",
                          borderRadius: 10, fontSize: 13, color: INK, lineHeight: 1.55,
                          border: "1px solid rgba(255,123,114,.25)" }}>
              <strong style={{ color: "#FF7B72" }}>The constraint:</strong> {ins.constraint}
            </div>
          )}
          {ins.disagreement && String(ins.disagreement).trim() && (
            <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(231,183,90,.09)",
                          borderRadius: 10, fontSize: 13, color: INK, lineHeight: 1.55,
                          border: "1px solid rgba(231,183,90,.25)" }}>
              <strong style={{ color: "#E7B75A" }}>A number and a story disagree:</strong> {ins.disagreement}
            </div>
          )}
          {/* DEEPER OR WIDER, on the arithmetic. utility = delta x reach, both factors real and
              multiplying — so before any acquisition plan, the honest question is whether raising
              the delta of the people already here buys the same utility for less. It is the
              comparison consumer growth skips most often. */}
          {ins.utility_call && (
            <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(123,167,217,.09)",
                          borderRadius: 10, fontSize: 13, color: INK, lineHeight: 1.55,
                          border: "1px solid rgba(123,167,217,.25)" }}>
              <strong style={{ color: "#7BA7D9" }}>Deeper or wider:</strong> {ins.utility_call}
            </div>
          )}
          {/* The only durable question in a category with an incumbent at a billion installs.
              The prompt is explicitly allowed to answer "nothing yet" — an invented moat is
              worse than an admitted absence. */}
          {ins.versus && String(ins.versus).trim() && (
            <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(244,83,46,.07)",
                          borderRadius: 10, fontSize: 13, color: INK, lineHeight: 1.55,
                          border: "1px solid rgba(244,83,46,.22)" }}>
              <strong style={{ color: "#F4532E" }}>What Truecaller can&apos;t do:</strong> {ins.versus}
            </div>
          )}
          {ins.one_bet && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(159,224,188,.08)", borderRadius: 10, fontSize: 13.5, color: INK, lineHeight: 1.55 }}>
              <strong style={{ color: "#9FE0BC" }}>The one bet:</strong> {ins.one_bet}
            </div>
          )}
        </>
      )}
    </div>
  );
}


/** Small metadata pill. Local on purpose — one shape, used only here. */
function Chip({ children, tone }) {
  const col = tone === "warn" ? "#E7B75A" : tone === "ok" ? "#9FE0BC" : MUTED;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, color: col, padding: "2px 7px",
                   borderRadius: 5, background: "rgba(255,255,255,.06)" }}>{children}</span>
  );
}

/* ─────────────────────────── loading skeleton ─────────────────────────── */

/** One shimmering block. `w`/`h` are whatever the real thing measures. */
function Bone({ w = "100%", h = 12, r = 6, mt = 0 }) {
  return <div className="pm-bone" style={{ width: w, height: h, borderRadius: r, marginTop: mt }} />;
}

/**
 * The skeleton is laid out to match the real dashboard tile for tile and card
 * for card, so nothing jumps when the data lands. A single centred spinner
 * would be less work and would move every panel on arrival.
 *
 * It is also honest about the wait: the first load runs 24 ClickHouse queries
 * and takes a couple of seconds, so the caption says what is happening rather
 * than implying the page is broken.
 */
function Skeleton() {
  const card = { ...CARD, flex: "1 1 320px", minWidth: 280 };
  return (
    <>
      <style>{`
        @keyframes pmShimmer { 0% { opacity: .35 } 50% { opacity: .8 } 100% { opacity: .35 } }
        .pm-bone { background: rgba(255,255,255,.09); animation: pmShimmer 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pm-bone { animation: none; opacity: .5 } }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "28px 0 12px" }}>
          Product metrics <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>· asking PostHog…</span>
        </h2>
      </div>

      {/* the seven headline tiles */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ ...CARD, padding: 16, flex: "1 1 130px", minWidth: 130 }}>
            <Bone w="52%" h={9} />
            <Bone w="66%" h={26} mt={10} />
            <Bone w="80%" h={9} mt={9} />
          </div>
        ))}
      </div>

      {/* the daily-active chart */}
      <div style={{ ...CARD, marginTop: 16 }}>
        <Bone w={150} h={12} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, marginTop: 18 }}>
          {Array.from({ length: 30 }, (_, i) => (
            // varied but deterministic heights — a flat row of equal bars reads
            // as a rendered chart with no data rather than as loading
            <div key={i} className="pm-bone" style={{ flex: 1, height: `${28 + ((i * 37) % 60)}%`, borderRadius: 3 }} />
          ))}
        </div>
      </div>

      {/* map + list, then two rows of panels */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
        <div style={{ ...CARD, flex: "2 1 340px" }}>
          <Bone w={170} h={12} /><Bone w={230} h={9} mt={8} />
          <div style={{ display: "grid", placeItems: "center", marginTop: 16 }}>
            <Bone w={220} h={250} r={14} />
          </div>
        </div>
        <div style={{ ...CARD, flex: "1 1 260px" }}>
          <Bone w={100} h={12} />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 14 }}>
              <Bone w={`${45 + ((i * 13) % 35)}%`} h={10} /><Bone w={28} h={10} />
            </div>
          ))}
        </div>
      </div>

      {[0, 1].map((row) => (
        <div key={row} style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={card}>
              <Bone w={120} h={12} /><Bone w={180} h={9} mt={7} />
              {Array.from({ length: 5 }, (_, j) => (
                <div key={j} style={{ marginTop: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <Bone w={`${40 + ((i * 7 + j * 11) % 40)}%`} h={9} /><Bone w={34} h={9} />
                  </div>
                  <Bone h={5} r={3} mt={5} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      <div style={{ fontSize: 12, color: MUTED, marginTop: 16 }}>
        First load runs 24 queries against PostHog — usually a second or two.
      </div>
    </>
  );
}

export default function ProductMetrics() {
  const [d, setD] = useState(null);
  /** Apollo's referral ledger — authoritative for redemptions and k, unlike the client events. */
  const [refLedger, setRefLedger] = useState(null);
  const [err, setErr] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [busyLoad, setBusyLoad] = useState(false);

  const [updatedAt, setUpdatedAt] = useState(null);
  const [softErr, setSoftErr] = useState("");   // a failed REFRESH when we already have data
  const dRef = useRef(null);                     // read current data inside the interval closure
  const retryRef = useRef(null);                 // one pending short-retry at a time
  useEffect(() => { dRef.current = d; }, [d]);
  const load = async (force = false) => {
    if (force) setBusyLoad(true);
    // A failed refresh must NOT blank the dashboard. If we already have numbers on screen, keep them,
    // show a small notice, and retry once in 20s (well before the next 10-min cycle). Only surface
    // the full error card on the very first load, when there's nothing to fall back to.
    const fail = (msg) => {
      if (dRef.current) {
        setSoftErr(msg);
        if (!retryRef.current) retryRef.current = setTimeout(() => { retryRef.current = null; load(); }, 20000);
      } else setErr(msg);
    };
    // ?fresh=1 skips the server's stale-while-revalidate cache. Without it the
    // Refresh button returned whatever was already cached — a button labelled
    // Refresh that does not refetch is a lie, and this one was telling it.
    const r = await fetch(`/api/admin/posthog${force ? "?fresh=1" : ""}`).catch(() => null);
    if (!r) { setBusyLoad(false); return fail("Network error"); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { setBusyLoad(false); return fail(j.error || `Refresh failed (${r?.status})`); }
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    setD(j);
    /**
     * THE AUTHORITATIVE REFERRAL LEDGER, fetched alongside.
     *
     * The action items below used to compute word-of-mouth from PostHog's referral_share_completed
     * / referral_copy events and announce "your viral coefficient is ~0" — on a page whose own
     * referral card, three sections up, reads k = 0.49 with 26 redemptions. Both came from this
     * component being handed PostHog and nothing else.
     *
     * Apollo is authoritative here and PostHog is not, for a reason that is structural rather than
     * a preference: Apollo GRANTS the reward, so a redemption exists there by definition, whereas
     * PostHog only learns of one if the app fired an event — and referral_redeemed has fired once
     * against Apollo's 26. Advice built on the under-firing source told us to build a feature that
     * already exists and is working.
     *
     * Failure is non-fatal: the panel still renders, and the referral item simply says which source
     * it could not reach rather than substituting a number it should not trust.
     */
    try {
      const rr = await fetch("/api/admin/churn?view=referrals").catch(() => null);
      const rj = rr && rr.ok ? await rr.json().catch(() => null) : null;
      setRefLedger(rj && rj.ok !== false ? rj : null);
    } catch { setRefLedger(null); }
    setBusyLoad(false);
    setErr(""); setSoftErr("");
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

  if (err && !d) return (<><h2 style={H2}>Product metrics</h2><div style={{ ...CARD, color: "#FF7B72" }}>{err}</div></>);
  if (!d) return <Skeleton />;

  const a = d.active, v = d.volume;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={H2}>Product metrics <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>· real users · India · last 30 days</span></h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: "#3FBF7F", display: "inline-block" }} />
            {softErr
              ? <span style={{ color: "#FFB454" }}>⚠ {new Date(updatedAt).toLocaleTimeString()} data · retrying</span>
              : (updatedAt ? `updated ${new Date(updatedAt).toLocaleTimeString()} · auto every 10m` : "live")}
          </span>
          <button onClick={() => load(true)} disabled={busyLoad}
            style={{ background: "transparent", color: busyLoad ? MUTED : "#F6EEE8", border: "1.5px solid rgba(255,255,255,.18)",
                     borderRadius: 12, padding: "8px 16px", fontWeight: 700, fontSize: 13,
                     cursor: busyLoad ? "default" : "pointer" }}>
            {busyLoad ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {/* "DAU" here is a ROLLING last-24-hours unique count, not a calendar day. Worth saying
            where it is read: on a product this size the two differ by a lot on any day with an
            evening spike, and the distinction is why stickiness uses Avg DAU rather than this. */}
        <Tile k="DAU" v={a.dau} sub={a.globalDau != null ? `${a.globalDau} incl. test · rolling 24h` : "rolling 24h"} accent={DAU_C} />
        <Tile k="WAU" v={a.wau} sub={a.globalWau != null ? `${a.globalWau} incl. test` : "last 7 days"} />
        <Tile k="MAU" v={a.mau} sub={a.globalMau != null ? `${a.globalMau} incl. test` : "last 30 days"} />
        {/* Avg DAU ÷ MAU — the standard definition. It used to divide the single rolling-24h
            figure by MAU, which moved with whatever happened yesterday and read about double the
            truth. The label now names what it actually divides. */}
        <Tile k="Stickiness" v={`${a.stickiness}%`} sub={a.stickinessBasis ? `avg DAU ${a.stickinessBasis.avgDau} ÷ MAU ${a.stickinessBasis.mau}` : "avg DAU ÷ MAU"} />
        <Tile k="Avg DAU" v={a.avgDau} sub="full days only" />
        {/* THE PAIR, not the single ratio. DAU/MAU reads the same for a daily habit used
            by few and a monthly utility used by many; splitting it says which one you have.
            Tring should look like the middle case — nobody should open a call assistant
            daily, they should let it answer calls — so judging it on DAU/MAU alone imports
            a social-app yardstick and makes a healthy weekly rhythm look broken. */}
        {a.dauOverWau != null && (
          <Tile k="DAU/WAU" v={`${a.dauOverWau}%`} sub="how daily the habit is" />
        )}
        {a.wauOverMau != null && (
          <Tile k="WAU/MAU" v={`${a.wauOverMau}%`} sub="how weekly the rhythm is" />
        )}
        <Tile k="Sessions" v={(v?.sessions ?? 0).toLocaleString()} sub={`${v.sessionsPerPerson} per person`} />
        <Tile k="Events" v={(v?.events30d ?? 0).toLocaleString()} sub="30 days" />
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
        Headline figures are <strong style={{ color: SUB }}>real India users</strong>; the “incl. test”
        number under each is the raw global count (CI, emulators, store-review). That gap is why the old
        MAU read ~2× the real base.
      </div>

      {/* GROWTH ACCOUNTING — the only arithmetic that explains a flat MAU.
          MAU 201 could be 201 loyal people or 201 strangers replacing last month's 201,
          and no amount of DAU/MAU tells those apart. This does. */}
      {d.growth && (
        <div style={{ ...CARD, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>Growth accounting</span>
            <span style={{ fontSize: 11.5, color: MUTED }}>{d.growth.windowNote}</span>
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>
            MAU(t) = MAU(t−1) + new + resurrected − churned
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {[
              ["New", d.growth.new, "#3FBF7F", "never seen before"],
              ["Retained", d.growth.retained, "#3FBF7F", "active both periods"],
              ["Resurrected", d.growth.resurrected, "#FFB454", "came back"],
              ["Churned", d.growth.churned, "#FF7B6B", "went silent"],
            ].map(([label, n, c, sub]) => (
              <div key={label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 10,
                                        padding: "8px 12px", flex: "1 1 130px" }}>
                <div style={{ color: MUTED, fontSize: 12.5 }}>{label}</div>
                <div style={{ color: c, fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                  {Number(n).toLocaleString()}
                </div>
                <div style={{ color: MUTED, fontSize: 11 }}>{sub}</div>
              </div>
            ))}
          </div>
          {/* ONE DOT, ONE PERSON. The four numbers above are the same data, but 8 retained
              beside 193 new reads as a rounding error in a tile and as a near-empty page
              here — which is the truth. Churned sits below the rule as hollow rings because
              those people are NOT in MAU; drawing them inline would imply they were. */}
          <div style={{ marginTop: 14 }}>
            <DotMatrix
              groups={[
                { key: "new", label: "New", n: d.growth.new, color: STATE_COLORS.new },
                { key: "ret", label: "Retained", n: d.growth.retained, color: STATE_COLORS.retained },
                { key: "res", label: "Resurrected", n: d.growth.resurrected, color: STATE_COLORS.resurrected },
              ]}
              caption={`These ${Number(d.growth.activeNow || 0).toLocaleString("en-IN")} are this month's active people. Retained is the only group acquisition cannot buy.`}
            />
            {d.growth.churned > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                <DotMatrix
                  groups={[{ key: "churn", label: "Churned", n: d.growth.churned,
                             color: "#e66767", hollow: true }]}
                  caption="Active last month, silent this month — outside the population above, not part of it."
                />
              </div>
            )}
          </div>

          {/* Quick ratio. Above 1 the product grows; below it, no install number saves you. */}
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10,
                        background: !d.growth.comparable ? "rgba(255,180,84,.10)"
                          : d.growth.quickRatio == null ? "rgba(255,255,255,.04)"
                          : d.growth.retainedShare != null && d.growth.retainedShare < 20 ? "rgba(255,180,84,.10)"
                          : d.growth.quickRatio >= 1.5 ? "rgba(63,191,127,.10)"
                          : d.growth.quickRatio >= 1 ? "rgba(255,180,84,.10)" : "rgba(255,123,107,.10)" }}>
            <span style={{ fontSize: 13.5, color: INK }}>
              <b>Quick ratio {d.growth.quickRatio == null ? "—" : d.growth.quickRatio}</b>
              {" "}({d.growth.new} new + {d.growth.resurrected} resurrected) ÷ {d.growth.churned} churned
              {" — "}{d.growth.verdict}.
            </span>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>
              Healthy consumer products sit above {d.growth.healthyAbove}. Net change this period:
              {" "}{d.growth.netChange > 0 ? "+" : ""}{d.growth.netChange} people.
              {d.growth.retainedShare != null && (
                <> Retained share <b style={{ color: SUB }}>{d.growth.retainedShare}%</b> —
                {" "}the half acquisition cannot buy.</>
              )}
            </div>
          </div>
        </div>
      )}

      <AIStrategist d={d} tick={updatedAt} />
      <ActionItems d={d} ledger={refLedger} />
      {d.funnel && <Reconcile f={d.funnel} />}
      {d.funnel && <TrueUsers f={d.funnel} />}
      {d.journey && <Journey steps={d.journey} lifecycle={d.lifecycle} otpAutofillRate={d.otpAutofillRate}
                                shareLoop={d.shareLoop} dailyNew={d.dailyNew} />}
      {d.states && <GeoMap states={d.states} countries={d.countries} funnel={d.funnel} dailyNew={d.dailyNew} />}

      {/* A failed query returns [], which renders as a confident zero. Name the
          casualties instead — "we could not fetch this" and "this is genuinely
          empty" are different facts and must not look the same. */}
      {!!d.degraded?.length && (
        <div style={{ ...CARD, marginTop: 16, borderColor: "rgba(255,180,84,.4)", color: "#FFB454", fontSize: 13 }}>
          {d.degraded.length} of these queries failed and are showing empty: {d.degraded.join(", ")}.
        </div>
      )}

      {!!d.todos && <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}><Todos rows={d.todos} /></div>}

      <h2 style={H2}>Sign-in &amp; onboarding</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {!!d.signinFunnel && <SigninFunnel rows={d.signinFunnel} />}
        {!!d.onboardingSteps?.length && <OnboardingFunnel rows={d.onboardingSteps} back={d.onboardingBack} />}
        {!!d.onboardingSteps?.length && <DeletionAudit rows={d.onboardingSteps} />}
        {!!d.signinFailReasons?.length && (
          <div style={{ ...CARD, flex: "1 1 280px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Why the code failed</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>&ldquo;unreachable&rdquo; is ours; &ldquo;wrong_code&rdquo; is theirs</div>
            {d.signinFailReasons.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, color: INK, marginTop: 6 }}>
                <div style={{ flex: 1 }}>{r.reason} <span style={{ color: MUTED }}>· {r.os}</span></div>
                <div style={{ color: r.reason === "unreachable" ? "#FF7B6B" : SUB }}>{r.people}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 style={H2}>Channels &amp; leaving</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {!!d.channels?.length && <Channels rows={d.channels} loop={d.referralLoop} />}
        {!!d.exitFunnel && <ExitFunnel data={d.exitFunnel} reasons={d.exitReasons} />}
      </div>

      <h2 style={H2}>Retention &amp; drop-off</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {!!d.retention?.length && <Retention rows={d.retention} />}
        {!!d.funnelByOs?.length && <DropOff rows={d.funnelByOs} dailyNew={d.dailyNew} />}
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
