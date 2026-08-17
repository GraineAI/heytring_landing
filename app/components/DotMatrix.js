"use client";

import React from "react";

/**
 * DOT MATRIX — one dot, one person.
 *
 * Every other panel on this dashboard is a percentage, and percentages are exactly
 * the wrong instrument at this size. "7% reached 5+ active days" and "5 people
 * reached 5+ active days" are the same fact, but only one of them is honest about
 * how much a single person moves it. The page already warns about this in prose —
 * "small n means one person moves it a lot" — which is an admission that the chart
 * form is fighting the reader. A unit chart does not need the warning: five dots
 * beside a hundred and fifty-nine cannot be misread as a trend.
 *
 * Encoding decisions, and why they are not free choices:
 *
 * COLOUR is validated, not picked. The funnel stages are ORDINAL — installed
 * through retained is a progression, not a set of names — so they take a single-hue
 * ramp rather than categorical hues, which is what stops the eye reading "activated"
 * and "retained" as unrelated species. On this near-black surface (#0B0B0C) the ramp
 * runs dark-to-light with the FINAL stage brightest: on a light page you would
 * darken as you progress, but here that would bury the rarest and most important
 * group in the background. Checked with the palette validator against the real
 * surface: monotone lightness, adjacent ΔL ≥ 0.06, single hue, light end 2.43:1.
 *
 * ABSENCE IS DRAWN AS ABSENCE, using shape rather than colour. Churned people are
 * not part of the active population, and the first attempt at this put them in the
 * same matrix in red — which failed two ways at once. It failed the reader, because
 * churned users are not in MAU and drawing them inline implies they are. And it
 * failed the validator: red against green measured ΔE 4.1 under deuteranopia, the
 * single most common colour-vision deficiency, i.e. the two states most opposite in
 * meaning were the two hardest to tell apart. Adding red as a fourth hue also broke
 * the normal-vision floor against orange (ΔE 7.1). A hollow ring sidesteps the
 * palette entirely and says the right thing: an outline where a person used to be.
 *
 * Counts are direct-labelled in the legend rather than written on the dots. Precision
 * comes from the text; the dots carry the proportion.
 */

const DOT = 9;      // ≥8px, per the mark spec
const GAP = 3;      // ≥2px surface gap so adjacent dots never merge into a bar

function Dots({ n, color, hollow, label, cap }) {
  // A cap keeps a runaway count from rendering ten thousand nodes. It is never
  // silent: the legend states the true number, and the caption says a dot stands
  // for more than one person whenever that becomes true.
  const shown = Math.min(n, cap);
  const each = n > shown ? Math.ceil(n / shown) : 1;
  return Array.from({ length: shown }, (_, i) => (
    <span
      key={i}
      title={each === 1 ? `${label} — 1 of ${n}` : `${label} — ${each} people per dot, ${n} total`}
      style={{
        width: DOT,
        height: DOT,
        borderRadius: "50%",
        display: "block",
        // Hollow = gone. The ring is the person-shaped hole they left.
        background: hollow ? "transparent" : color,
        border: hollow ? `1.5px solid ${color}` : "none",
        boxSizing: "border-box",
      }}
    />
  ));
}

export default function DotMatrix({ groups, caption, cap = 400 }) {
  const live = (groups || []).filter((g) => Number(g.n) > 0);
  if (!live.length) return null;
  const total = live.reduce((a, g) => a + Number(g.n), 0);
  const capped = total > cap;

  return (
    <div>
      {/* The matrix. One flex run, groups in order, so the eye compares mass
          directly instead of hopping between separately-scaled bars.

          THE SPACER IS LOAD-BEARING, not decoration. Six ordinal steps need the
          ramp's full range to keep adjacent lightness gaps visible, which forces the
          earliest stage down to 2.43:1 against this near-black surface — legal, and
          confirmed dim when rendered: installed, asked-for-a-code and signed-in
          blurred into one navy mass. Re-stepping lighter was tried and fails, twice:
          starting at #2a78d6 or #256abf collapses adjacent ΔL below the 0.06 floor,
          because the ramp does not have the range to fit six distinguishable steps
          any higher. So the boundary is carried by POSITION instead — which is the
          documented remedy for steps this close, and it works regardless of colour
          vision, screen calibration or ambient light. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: GAP, alignContent: "flex-start" }}>
        {live.map((g, gi) => (
          <React.Fragment key={g.key || g.label}>
            {gi > 0 && <span aria-hidden="true" style={{ width: DOT, flexShrink: 0 }} />}
            <Dots
              n={Number(g.n)}
              color={g.color}
              hollow={g.hollow}
              label={g.label}
              cap={Math.max(1, Math.round((cap * Number(g.n)) / total))}
            />
          </React.Fragment>
        ))}
      </div>

      {/* LEGEND — always present, never optional. Identity must never be carried by
          colour alone, so every entry pairs its swatch with a name and a count. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12 }}>
        {live.map((g) => (
          <span key={g.key || g.label}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ width: DOT, height: DOT, borderRadius: "50%", flexShrink: 0,
                           background: g.hollow ? "transparent" : g.color,
                           border: g.hollow ? `1.5px solid ${g.color}` : "none",
                           boxSizing: "border-box" }} />
            <span style={{ color: "#B7A79D" }}>{g.label}</span>
            <b style={{ color: "#FFF0EB" }}>{Number(g.n).toLocaleString("en-IN")}</b>
          </span>
        ))}
      </div>

      {(caption || capped) && (
        <div style={{ fontSize: 11.5, color: "#8C7C73", marginTop: 8, lineHeight: 1.5 }}>
          {capped && <>Each dot stands for more than one person at this size — the counts above are exact. </>}
          {caption}
        </div>
      )}
    </div>
  );
}

/** The validated ordinal ramp, darkest (earliest stage) to lightest (furthest along). */
export const STAGE_RAMP = ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"];

/** Categorical slots 1–3, the only three that clear the all-pairs floors in dark mode. */
export const STATE_COLORS = { new: "#3987e5", retained: "#199e70", resurrected: "#d95926" };
