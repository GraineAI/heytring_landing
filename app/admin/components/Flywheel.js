"use client";
import React from "react";
import { CountUp, Rise } from "./motion";

/**
 * THE FLYWHEEL (Collins).
 *
 * Not decoration. The point of drawing the loop is that each node shows the LIVE input metric that
 * turns the next one — so a stalled node is visible as a number, and you can see which turn is
 * seized rather than debating it.
 *
 * Tring's loop: Tring answers a missed call → the user sees value → forwarding stays on → more
 * calls get answered → they tell someone → more users. Every arrow is a metric we already collect.
 */
const INK = "#e6edf3", MUTED = "#9aa4b2", FAINT = "#5b6673";

export default function Flywheel({ metrics, funnel, shares }) {
  const m = metrics || {};
  const nodes = [
    { k: "Calls answered", v: m.calls_answered_week, sub: "this week", unit: "" },
    { k: "Users seeing value", v: funnel?.activated ?? null, sub: "≥1 answered call", unit: "" },
    { k: "Forwarding stays on", v: m.active_devices_week, sub: "active this week", unit: "" },
    { k: "Depth per user", v: m.answers_per_active_user_week, sub: "answers / active user", unit: "", dec: 2 },
    { k: "They tell someone", v: shares ?? 0, sub: "shares sent", unit: "" },
  ];
  // The weakest turn. A flywheel diagram with no weak point named is a picture, not a diagnosis.
  const seized = nodes.findIndex((n) => n.v === 0 || n.v == null);

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
      {nodes.map((n, i) => {
        const stuck = i === seized;
        return (
          <React.Fragment key={n.k}>
            <Rise delay={i * 80} style={{ flex: "1 1 150px", minWidth: 140 }}>
              <div style={{ height: "100%", padding: "12px 14px", borderRadius: 12,
                            background: stuck ? "rgba(255,123,114,.07)" : "rgba(255,255,255,.03)",
                            border: `1px solid ${stuck ? "rgba(255,123,114,.35)" : "rgba(255,255,255,.09)"}` }}>
                <div style={{ color: MUTED, fontSize: 11 }}>{n.k}</div>
                <div style={{ color: stuck ? "#FF7B72" : "#fff", fontSize: 21, fontWeight: 700, marginTop: 2 }}>
                  <CountUp value={n.v} decimals={n.dec || 0} suffix={n.unit} />
                </div>
                <div style={{ color: FAINT, fontSize: 10 }}>{n.sub}</div>
                {stuck && <div style={{ color: "#FF7B72", fontSize: 10, marginTop: 4, fontWeight: 600 }}>
                  the loop stalls here
                </div>}
              </div>
            </Rise>
            {i < nodes.length - 1 && (
              <div style={{ alignSelf: "center", color: FAINT, fontSize: 15 }}>→</div>
            )}
          </React.Fragment>
        );
      })}
      <div style={{ alignSelf: "center", color: FAINT, fontSize: 11, maxWidth: 110, lineHeight: 1.35 }}>
        ↻ and back to more calls answered
      </div>
    </div>
  );
}
