"use client";
import React, { useEffect, useState } from "react";
import MetricChart from "../components/MetricChart";
import { CountUp, GrowBar, Rise, Pulse } from "../components/motion";

/**
 * CHURN & LIFECYCLE.
 *
 * The page exists because "how many left" was previously the only answerable question, and it is
 * the least useful one. What changes decisions is the sequence: who opened the delete screen and
 * backed out (recoverable), what they were doing just before they gave up (the cause), and whether
 * a logout ever reversed (not churn at all until it fails to).
 */

const INK = "#e6edf3", MUTED = "#9aa4b2", FAINT = "#5b6673";
const card = { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 14 };
const page = { background: "#0F1216", minHeight: "100vh", color: INK,
               fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: "28px 20px 60px" };

const REASON_LABEL = {
  not_useful: "Didn't find it useful", too_many_calls: "Too many notifications",
  didnt_work: "It didn't work properly", privacy: "Privacy concerns",
  setup_hard: "Setup was too hard", other: "Something else",
};

export default function ChurnPage() {
  const [funnel, setFunnel] = useState(null);
  const [autopsy, setAutopsy] = useState(null);
  const [feed, setFeed] = useState(null);
  const [ret, setRet] = useState(null);
  const [series, setSeries] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    const get = async (view, extra = "") => {
      const r = await fetch(`/api/admin/churn?view=${view}${extra}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `${view}: ${r.status}`);
      return j;
    };
    try {
      const [f, a, fe, lr, ts] = await Promise.all([
        get("funnel"), get("autopsy", "&limit=25"), get("feed", "&limit=50"),
        get("logout_return"), get("timeseries"),
      ]);
      setFunnel(f); setAutopsy(a); setFeed(fe); setRet(lr); setSeries(ts);
    } catch (e) { setErr(String(e.message || e)); }
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const c = funnel?.counts || {};
  const s = series?.series || {};

  return (
    <main style={page}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>Churn &amp; lifecycle</h1>
          <span style={{ color: MUTED, fontSize: 12.5 }}>
            who left, who nearly left, and what they were doing first · IST · refreshes every 60s
          </span>
          <div style={{ flex: 1 }} />
          <a href="/admin" style={{ color: "#F4532E", fontSize: 13, textDecoration: "none" }}>← overview</a>
        </div>

        {err && (
          <div style={{ ...card, marginTop: 16, padding: "12px 14px", borderColor: "rgba(255,123,114,.4)" }}>
            <div style={{ color: "#FF7B72", fontSize: 13.5 }}>{err}</div>
          </div>
        )}

        {/* THE DELETION FUNNEL. Cancel rate first because it is the only recoverable number here. */}
        <Rise style={{ ...card, marginTop: 18, padding: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Deletion funnel</div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
            Someone who opens the delete screen and backs out is <b>recoverable</b> churn — the only
            kind still worth acting on. Counting completions alone made them invisible.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {[["Opened delete", c.initiated, "#E7B75A"],
              ["Backed out", c.cancelled, "#5CD98A"],
              ["Went through", c.completed, "#FF7B72"],
              ["Logged out", c.logout, MUTED]].map(([k, v, col]) => (
              <div key={k} style={{ ...card, padding: "12px 15px", minWidth: 140 }}>
                <div style={{ color: MUTED, fontSize: 11.5 }}>{k}</div>
                <div style={{ color: col, fontSize: 24, fontWeight: 700 }}><CountUp value={v ?? 0} /></div>
              </div>
            ))}
            <Pulse active={(funnel?.cancel_rate_pct ?? 0) > 0} color="92,217,138">
              <div style={{ ...card, padding: "12px 15px", minWidth: 160 }}>
                <div style={{ color: MUTED, fontSize: 11.5 }}>Changed their mind</div>
                <div style={{ color: "#5CD98A", fontSize: 24, fontWeight: 700 }}>
                  {funnel?.cancel_rate_pct == null
                    ? <span style={{ color: FAINT, fontSize: 15 }}>no data yet</span>
                    : <CountUp value={funnel.cancel_rate_pct} decimals={1} suffix="%" />}
                </div>
                <div style={{ color: FAINT, fontSize: 10.5 }}>of everyone who opened it</div>
              </div>
            </Pulse>
          </div>

          {/* Where they were in their life with the product when they left. */}
          {funnel?.by_tenure && Object.keys(funnel.by_tenure).length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: INK, fontSize: 13.5, fontWeight: 600 }}>When do they go?</div>
              <div style={{ color: FAINT, fontSize: 11, marginBottom: 8 }}>
                Leaving on day 3 and leaving on day 60 are different problems: the first is onboarding,
                the second is value running out.
              </div>
              {["0-7d", "8-30d", "31-90d", "90d+", "unknown"].map((b) => {
                const row = funnel.by_tenure[b];
                if (!row) return null;
                const tot = Math.max(1, ...Object.values(funnel.by_tenure).map((r) => r.completed || 0));
                return (
                  <div key={b} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", fontSize: 12, gap: 8 }}>
                      <span style={{ color: INK, minWidth: 72 }}>{b}</span>
                      <span style={{ color: "#FF7B72" }}><CountUp value={row.completed || 0} /> left</span>
                      {row.cancelled ? <span style={{ color: "#5CD98A" }}>· {row.cancelled} stayed</span> : null}
                    </div>
                    <div style={{ marginTop: 3 }}>
                      <GrowBar pct={(100 * (row.completed || 0)) / tot} color="#FF7B72" height={7} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* WHY, in their own words. The only place we ever hear it. */}
          {funnel?.exit_reasons && Object.keys(funnel.exit_reasons).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: INK, fontSize: 13.5, fontWeight: 600 }}>Why they said they left</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {Object.entries(funnel.exit_reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <div key={k} style={{ ...card, padding: "8px 12px" }}>
                    <span style={{ color: INK, fontSize: 12.5 }}>{REASON_LABEL[k] || k}</span>
                    <span style={{ color: "#FF7B72", fontSize: 12.5, fontWeight: 700, marginLeft: 8 }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Rise>

        {/* TRENDS — the same 6-12 format used everywhere else. */}
        {series && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: 12, marginTop: 18 }}>
            {[["Deletions completed", "deletions", true],
              ["Delete screen opened", "deletions_initiated", true],
              ["Backed out", "deletions_cancelled", false],
              ["Logouts", "logouts", true]].map(([title, key, invert], i) => (
              <Rise key={key} delay={i * 70}>
                <MetricChart
                  title={title} kind="input" invert={invert}
                  weeks={s[key]?.weeks || []} months={s[key]?.months || []}
                  note={key === "deletions_cancelled" ? "up is good — these are the ones you kept" : undefined}
                />
              </Rise>
            ))}
          </div>
        )}

        {/* LOGOUT ≠ CHURN. */}
        {ret && (
          <Rise style={{ ...card, marginTop: 18, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Did the logouts come back?</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
              A logout is not churn until it fails to reverse. Counting the two together overstates
              churn and hides the people actually worth chasing.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {[["Logged out", ret.logged_out, MUTED], ["Signed back in", ret.returned, "#5CD98A"],
                ["Return rate", ret.return_rate_pct == null ? null : ret.return_rate_pct, "#5CD98A"]].map(([k, v, col]) => (
                <div key={k} style={{ ...card, padding: "12px 15px", minWidth: 140 }}>
                  <div style={{ color: MUTED, fontSize: 11.5 }}>{k}</div>
                  <div style={{ color: col, fontSize: 23, fontWeight: 700 }}>
                    {v == null ? <span style={{ color: FAINT, fontSize: 14 }}>no data yet</span>
                      : <CountUp value={v} decimals={k === "Return rate" ? 1 : 0} suffix={k === "Return rate" ? "%" : ""} />}
                  </div>
                </div>
              ))}
            </div>
          </Rise>
        )}

        {/* THE AUTOPSY — an aggregate gives the rate, this gives the reason. */}
        <Rise style={{ ...card, marginTop: 18, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Pre-deletion autopsy</div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
            The last few things each person did before giving up. This is where the cause lives —
            no funnel chart contains it.
          </div>
          {!autopsy?.deletions?.length ? (
            <div style={{ color: FAINT, fontSize: 12.5, marginTop: 12 }}>
              No deletions recorded yet. This fills as the instrumentation sees real ones — it is
              not a zero, it is a collection that has just started.
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
                <thead><tr>{["When", "Tenure", "Calls", "Platform", "Said", "Last actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", color: MUTED, fontSize: 11.5, padding: "7px 10px",
                                       borderBottom: "1px solid rgba(255,255,255,.1)" }}>{h}</th>))}</tr></thead>
                <tbody>
                  {autopsy.deletions.map((d) => (
                    <tr key={d.uid + d.at}>
                      <td style={{ padding: "8px 10px", color: MUTED, fontSize: 12 }}>
                        {d.at ? new Date(d.at).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: INK, fontSize: 12.5 }}>
                        {d.days_since_signup != null ? `${d.days_since_signup}d` : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: INK, fontSize: 12.5 }}>{d.lifetime_calls ?? "—"}</td>
                      <td style={{ padding: "8px 10px", color: MUTED, fontSize: 12 }}>{d.platform || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12.5, maxWidth: 240 }}>
                        {d.exit_reason ? <div style={{ color: "#E7B75A" }}>{REASON_LABEL[d.exit_reason] || d.exit_reason}</div> : null}
                        {d.exit_note ? <div style={{ color: MUTED, fontStyle: "italic" }}>“{d.exit_note}”</div> : null}
                        {!d.exit_reason && !d.exit_note ? <span style={{ color: FAINT }}>nothing</span> : null}
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 11.5, color: MUTED }}>
                        {(d.last_events || []).join(" → ") || <span style={{ color: FAINT }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Rise>

        {/* LIVE FEED */}
        <Rise style={{ ...card, marginTop: 18, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Live lifecycle feed</div>
          {!feed?.events?.length ? (
            <div style={{ color: FAINT, fontSize: 12.5, marginTop: 10 }}>Nothing yet.</div>
          ) : (
            <div style={{ marginTop: 10, maxHeight: 320, overflowY: "auto" }}>
              {feed.events.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 12.5,
                                      borderTop: i ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                  <span style={{ color: FAINT, minWidth: 128 }}>
                    {e.at ? new Date(e.at).toLocaleString("en-IN") : "—"}
                  </span>
                  <span style={{ color: e.event?.includes("completed") ? "#FF7B72"
                    : e.event?.includes("cancelled") ? "#5CD98A" : INK, minWidth: 210 }}>
                    {e.event}
                  </span>
                  <span style={{ color: MUTED }}>{e.platform || ""} {e.reason ? `· ${e.reason}` : ""}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ color: FAINT, fontFamily: "monospace", fontSize: 11 }}>{e.uid}</span>
                </div>
              ))}
            </div>
          )}
        </Rise>
      </div>
    </main>
  );
}
