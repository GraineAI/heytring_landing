"use client";

/**
 * /admin — the beta waitlist dashboard. Password-gated (httpOnly cookie
 * set by /api/admin/login). Shows totals, platform split, where people
 * came from, the full signup list and store-link clicks, with CSV export.
 */
// React (not just the hooks): the cohort table renders TWO <tr> per cohort — answered and
// opened — which needs a keyed <React.Fragment>. The <> shorthand cannot take a key.
import React, { useEffect, useState } from "react";
import { CountUp, GrowBar, Rise, Pulse, DrawPath } from "./components/motion";
import Flywheel from "./components/Flywheel";
import { detect, describe, findConstraint } from "./components/signals";
import ProductMetrics from "../components/ProductMetrics";
import UserResearch from "../components/UserResearch";

const S = {
  page: { minHeight: "100vh", background: "#000000", color: "#FFF0EB", padding: "48px 20px", fontFamily: "inherit" },
  wrap: { maxWidth: 1100, margin: "0 auto" },
  card: { background: "#0B0B0C", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 20 },
  input: { width: "100%", background: "#000000", border: "1.5px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "13px 15px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" },
  btn: { background: "#F4532E", color: "#fff", border: 0, borderRadius: 12, padding: "12px 22px", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  ghost: { background: "transparent", color: "#F6EEE8", border: "1.5px solid rgba(255,255,255,.18)", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "#8C7C73", borderBottom: "1px solid rgba(255,255,255,.08)", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.06)", verticalAlign: "top" },
};

function Tile({ k, v }) {
  return (
    <div style={{ ...S.card, padding: 16, flex: "1 1 140px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: "#8C7C73", textTransform: "uppercase" }}>{k}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", marginTop: 4 }}>{v}</div>
    </div>
  );
}

function sourceOf(row) {
  if (row.utm?.utm_source) return `utm: ${row.utm.utm_source}${row.utm.utm_campaign ? " / " + row.utm.utm_campaign : ""}`;
  if (row.source) {
    if (row.source.startsWith("app:")) return `${row.source.slice(4)} (in-app)`;
    try { return new URL(row.source).hostname; } catch { return row.source.slice(0, 40); }
  }
  if (row.landing) {
    try {
      const u = new URL(row.landing);
      if (u.search) return `landed: ${u.search.slice(1, 50)}`;
    } catch (_) {}
  }
  // last resort: in-app browsers sign the user agent even when they
  // strip the referrer — recover the source from the stored UA
  const ua = row.user_agent || "";
  if (/LinkedInApp/i.test(ua)) return "linkedin (in-app)";
  if (/Instagram/i.test(ua)) return "instagram (in-app)";
  if (/FB_IAB|FBAV|FBAN/i.test(ua)) return "facebook (in-app)";
  if (/Twitter/i.test(ua)) return "twitter (in-app)";
  if (/Snapchat/i.test(ua)) return "snapchat (in-app)";
  return "direct";
}

export default function Admin() {
  const [authed, setAuthed] = useState(null);   // null = checking
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  // App lifecycle, from Apollo. Separate from the waitlist: the waitlist knows who ASKED for an
  // invite, this knows who installed, who stalled at the OTP, and who Tring has actually answered
  // a call for. Loaded on demand so a slow Apollo never blocks the waitlist table.
  const [lifecycle, setLifecycle] = useState(null);
  const [lcErr, setLcErr] = useState("");
  const [lcStage, setLcStage] = useState("");
  const [lcBusy, setLcBusy] = useState(false);
  const [cohorts, setCohorts] = useState(null);
  const [cohErr, setCohErr] = useState("");
  const [noteFor, setNoteFor] = useState(null);   // phone whose log row is open
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [series, setSeries] = useState(null);
  const [power, setPower] = useState(null);
  const [alerts, setAlerts] = useState(0);
  const [ref, setRef] = useState(null);
  const [carr, setCarr] = useState(null);
  const [rev, setRev] = useState(null);

  const load = async () => {
    const r = await fetch("/api/admin/data");
    if (r.status === 401) { setAuthed(false); return; }
    // A DATABASE failure is NOT an AUTH failure. This used to call setAuthed(false) on any
    // non-ok response, so an unreachable Neon bounced a correctly-signed-in admin back to the
    // password form — and took the PostHog metrics down with it, even though those come from a
    // completely independent endpoint. Stay signed in, surface the DB problem inline.
    setAuthed(true);
    if (!r.ok) {
      setErr("Waitlist data unavailable (is DATABASE_URL set / reachable?)");
      setData({ waitlist: [], clicks: [] });
      return;
    }
    setErr("");
    setData(await r.json());
  };

  // The heavy panels stay behind their Load button on purpose. The alert count does not — a
  // badge you have to click to discover is not an alert.
  useEffect(() => { load(); loadAlerts(); }, []);

  const login = async (e) => {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (r.ok) load();
    else setErr(r.status === 401 ? "Wrong password." : "Login failed (is ADMIN_PASSWORD set?)");
  };

  if (authed === null) return <div style={S.page}><div style={S.wrap}>Loading…</div></div>;

  if (!authed) {
    return (
      <div style={{ ...S.page, display: "grid", placeItems: "center" }}>
        <form onSubmit={login} style={{ ...S.card, width: "min(420px, 92vw)", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Tring admin</div>
          <input style={S.input} type="password" placeholder="Password" value={pw}
            onChange={(e) => setPw(e.target.value)} autoFocus />
          {err && <div style={{ color: "#FF7B72", fontSize: 14 }}>{err}</div>}
          <button style={S.btn} type="submit">Sign in</button>
        </form>
      </div>
    );
  }

  const { waitlist = [], clicks = [] } = data || {};
  // stats derived from the rows themselves — the tiles always match the table
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const stats = {
    total: waitlist.length,
    android: waitlist.filter((r) => r.device === "android").length,
    ios: waitlist.filter((r) => r.device === "ios").length,
    today: waitlist.filter((r) => new Date(r.created_at).getTime() > dayAgo).length,
    onboarded: waitlist.filter((r) => r.contacted).length,
    play_clicks: clicks.filter((r) => r.kind === "play").length,
    ios_clicks: clicks.filter((r) => r.kind === "ios").length,
  };

  const loadLifecycle = async (stage) => {
    setLcBusy(true); setLcErr("");
    try {
      const qs = new URLSearchParams({ view: "users", limit: "500" });
      if (stage) qs.set("stage", stage);
      const res = await fetch(`/api/admin/users?${qs}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      // Surface WHY. "failed to load" sends someone into the network tab to rediscover an
      // unset environment variable.
      if (!res.ok || !j.ok) { setLcErr(j.error || `apollo returned ${res.status}`); setLifecycle(null); }
      else setLifecycle(j);
    } catch (e) {
      setLcErr("could not reach the server");
    } finally { setLcBusy(false); }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetch("/api/admin/users?view=metrics", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (j.ok) setMetrics(j);
    } catch {}
  };

  const loadPower = async () => {
    try {
      const r = await fetch("/api/admin/churn?view=power_users", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setPower(j);
    } catch {}
  };

  // Only the count, only the items that actually change a decision (severity >= 4). A badge that
  // lights up for every headline is a badge nobody looks at within a fortnight.
  const loadAlerts = async () => {
    try {
      const r = await fetch("/api/admin/intel?view=feed&days=14&min_severity=4&limit=50",
                            { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setAlerts(Number(j.alerts) || 0);
    } catch {}
  };

  const loadRef = async () => {
    try {
      const r = await fetch("/api/admin/churn?view=referrals&days=60&goal=500000&horizon_days=80",
                            { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setRef(j);
    } catch {}
  };

  const loadCarriers = async () => {
    try {
      const r = await fetch("/api/admin/churn?view=carriers&days=90", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setCarr(j);
    } catch {}
  };

  const loadRevenue = async () => {
    try {
      const r = await fetch("/api/admin/churn?view=revenue&days=90", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setRev(j);
    } catch {}
  };

  const loadSeries = async () => {
    try {
      const r = await fetch("/api/admin/churn?view=timeseries", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setSeries(j);
    } catch {}
  };

  const loadCohorts = async () => {
    setCohErr("");
    try {
      const res = await fetch("/api/admin/users?view=retention&weeks=8", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) setCohErr(j.error || `apollo returned ${res.status}`);
      else setCohorts(j);
    } catch { setCohErr("could not reach the server"); }
  };

  const saveNote = async (phone, outcome, sentiment) => {
    setNoteBusy(true);
    try {
      const res = await fetch("/api/admin/note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, note: noteText, outcome, sentiment }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.ok) {
        setNoteText(""); setNoteFor(null);
        loadLifecycle(lcStage);   // pull the row back with its new contact summary
      }
    } catch {} finally { setNoteBusy(false); }
  };

  const toggleContacted = async (row) => {
    const next = !row.contacted;
    // optimistic update
    setData((d) => ({
      ...d,
      waitlist: d.waitlist.map((r) => (r.id === row.id ? { ...r, contacted: next } : r)),
    }));
    const res = await fetch("/api/admin/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, contacted: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      // roll back on failure
      setData((d) => ({
        ...d,
        waitlist: d.waitlist.map((r) => (r.id === row.id ? { ...r, contacted: !next } : r)),
      }));
    }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>Beta waitlist</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/admin/churn" style={{ textDecoration: "none" }}>
              <button style={S.ghost}>Churn &amp; lifecycle →</button>
            </a>
            <a href="/admin/intel" style={{ textDecoration: "none", position: "relative" }}>
              <button style={alerts > 0
                ? { ...S.ghost, borderColor: "rgba(244,83,46,.6)", color: "#F4532E" }
                : S.ghost}>
                Industry watch{alerts > 0 ? ` · ${alerts}` : ""} →
              </button>
            </a>
            <a href="/admin/guide" style={{ textDecoration: "none" }}><button style={{ ...S.ghost, borderColor: "rgba(244,83,46,.5)", color: "#F4532E" }}>Guide: how to read these</button></a>
            <button style={S.ghost} onClick={load}>Refresh</button>
            <a href="/api/admin/export?table=waitlist"><button style={S.btn}>Export CSV</button></a>
            <a href="/api/admin/export?table=clicks"><button style={S.ghost}>Clicks CSV</button></a>
          </div>
        </div>

        {err && (
          <div style={{ ...S.card, marginTop: 16, padding: "12px 16px", color: "#FF7B72", borderColor: "rgba(255,123,114,.35)" }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
          <Tile k="Total signups" v={stats.total} />
          <Tile k="Onboarded" v={`${stats.onboarded} / ${stats.total}`} />
          <Tile k="Android" v={stats.android} />
          <Tile k="iPhone" v={stats.ios} />
          <Tile k="Last 24h" v={stats.today} />
          <Tile k="Play clicks" v={stats.play_clicks} />
          <Tile k="App Store clicks" v={stats.ios_clicks} />
        </div>

        {/* Live app metrics from PostHog. Self-contained: fetches /api/admin/posthog itself,
            renders its own error/loading state, and never blocks the waitlist view below. */}
        <ProductMetrics />

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "28px 0 12px" }}>Signups</h2>
        <div style={{ ...S.card, overflowX: "auto", padding: 0 }}>
        {/* ── PRODUCT METRICS — above the waitlist on purpose ────────────────────────
            Signups and store clicks say how many people we reached. They say nothing about
            whether the product works, and a dashboard that leads with them optimises for the
            wrong number. Activation and retention go first. ── */}
        <div style={{ ...S.card, marginTop: 22, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", margin: 0 }}>Does the product work?</h2>
            <span style={{ color: "#9aa4b2", fontSize: 12.5 }}>
              activation, then retention measured by calls actually answered — always the whole
              population, never the filter below
            </span>
            <div style={{ flex: 1 }} />
            {!cohorts && <button style={S.ghost} onClick={() => { loadLifecycle(lcStage); loadCohorts(); loadMetrics(); loadSeries(); loadPower(); loadAlerts(); loadRef(); loadCarriers(); loadRevenue(); }}>Load</button>}
          </div>

          {/* THE FLYWHEEL first (Collins). Each node carries the live input metric that turns the
              next one, so a stalled loop is a number rather than an argument. */}
          {(metrics || lifecycle) && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                The loop
              </div>
              <Flywheel metrics={metrics} funnel={lifecycle?.stage_distribution || lifecycle?.funnel}
                        shares={0} />
            </div>
          )}

          {/* SIGNALS (Grove). A dashboard shows what happened; this says what CHANGED. Nobody
              reads eight charts every morning, but everyone reads three things that moved. */}
          {series && (() => {
            const S = series.series || {};
            const checks = [
              ["Deletions", S.deletions?.weeks, true],
              ["Delete screen opened", S.deletions_initiated?.weeks, true],
              ["Logouts", S.logouts?.weeks, true],
              ["Signups", S.signups?.weeks, false],
              ["Calls answered", S.calls_answered?.weeks, false],
              ["App opens", S.app_opens?.weeks, false],
            ];
            const hits = checks
              .map(([name, w, invert]) => ({ name, sig: detect(w, { invert }) }))
              .filter((x) => x.sig);
            if (!hits.length) {
              return (
                <div style={{ color: "#5b6673", fontSize: 11.5, marginTop: 14 }}>
                  No metric has moved more than 2σ from its 6-week trend. Quiet is information too —
                  it means nothing needs attention this morning.
                </div>
              );
            }
            return (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  Signals <span style={{ color: "#5b6673", fontSize: 11, fontWeight: 400 }}>
                    · moved &gt;2σ from the 6-week trend</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {hits.map(({ name, sig }, i) => (
                    <Rise key={name} delay={i * 70}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center", padding: "9px 12px",
                                    borderRadius: 10,
                                    background: sig.bad ? "rgba(255,123,114,.08)" : "rgba(92,217,138,.07)",
                                    border: `1px solid ${sig.bad ? "rgba(255,123,114,.28)" : "rgba(92,217,138,.24)"}` }}>
                        <span style={{ fontSize: 13, color: sig.bad ? "#FF7B72" : "#5CD98A" }}>
                          {sig.direction === "up" ? "▲" : "▼"}
                        </span>
                        <span style={{ color: "#e6edf3", fontSize: 12.5 }}>{describe(name, sig)}</span>
                      </div>
                    </Rise>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* THE SIX NUMBERS, and the ones about people leaving. Rendered before the funnel because
              "are we keeping anyone" outranks "where do they drop". */}
          {metrics && (
            <>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                {[
                  ["Active today", metrics.active_devices_day, "devices that opened the app"],
                  ["Active this week", metrics.active_devices_week, ""],
                  ["Sessions / device", metrics.sessions_per_active_device_week, "per week"],
                  ["Answers / user", metrics.answers_per_active_user_week, "per week — depth"],
                  ["Time to first answer", metrics.time_to_first_answer_hours != null
                    ? `${metrics.time_to_first_answer_hours}h` : "—", "median, sign-in → proof"],
                ].map(([k, v, sub]) => (
                  <div key={k} style={{ ...S.card, padding: "12px 15px", minWidth: 132 }}>
                    <div style={{ color: "#9aa4b2", fontSize: 11.5 }}>{k}</div>
                    <div style={{ color: "#fff", fontSize: 23, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {v ?? "—"}
                    </div>
                    {sub ? <div style={{ color: "#5b6673", fontSize: 10.5 }}>{sub}</div> : null}
                  </div>
                ))}
              </div>

              {/* D1 / D7 / D28 — Apple's definition, both ways on the same cohort. Bars, because
                  three numbers compared against each other is a comparison, not a series. */}
              <div style={{ display: "flex", gap: 18, marginTop: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                {["d1", "d7", "d28"].map((k) => {
                  const d = metrics[k] || {};
                  const a = d.answered_pct, o = d.opened_pct;
                  const bar = (v, col) => (
                    <div style={{ width: 22, height: 68, background: "rgba(255,255,255,.06)",
                                  borderRadius: 4, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", bottom: 0, width: "100%",
                                    height: `${Math.max(0, Math.min(100, v ?? 0))}%`, background: col }} />
                    </div>
                  );
                  return (
                    <div key={k} style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
                        {bar(a, "#F4532E")}{bar(o, "#4a5a6a")}
                      </div>
                      <div style={{ color: "#e6edf3", fontSize: 12, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
                        {a != null ? `${a}%` : "—"}
                        <span style={{ color: "#6b7684" }}>{o != null ? ` / ${o}%` : ""}</span>
                      </div>
                      <div style={{ color: "#9aa4b2", fontSize: 11 }}>{k.toUpperCase()}</div>
                      <div style={{ color: "#5b6673", fontSize: 10 }}>n={d.cohort ?? 0}</div>
                    </div>
                  );
                })}
                <div style={{ color: "#6b7684", fontSize: 11.5, maxWidth: 260, lineHeight: 1.45 }}>
                  Coral = Tring answered a call that day. Grey = they only opened the app. Small
                  <b> n</b> means one person moves it a lot — read the cohort size before the percentage.
                </div>
              </div>

              {/* WHO LEFT. Deletion used to erase every trace, so this had no answer at all. */}
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                {[
                  ["Deleted account", metrics.deleted_accounts, `${metrics.deleted_last_30d ?? 0} in 30d`, "#FF7B72"],
                  ["Came back after deleting", metrics.returned_after_deletion, "re-signed up", "#5CD98A"],
                  ["Likely uninstalled", metrics.likely_uninstalled, "proxy — see note", "#E7B75A"],
                  ["Avg life before leaving", metrics.deleted_avg_lifetime_days != null
                    ? `${metrics.deleted_avg_lifetime_days}d` : "—",
                    `${metrics.deleted_avg_calls_answered ?? 0} calls answered`, "#9aa4b2"],
                ].map(([k, v, sub, col]) => (
                  <div key={k} style={{ ...S.card, padding: "12px 15px", minWidth: 148 }}>
                    <div style={{ color: "#9aa4b2", fontSize: 11.5 }}>{k}</div>
                    <div style={{ color: col, fontSize: 23, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {v ?? "—"}
                    </div>
                    <div style={{ color: "#5b6673", fontSize: 10.5 }}>{sub}</div>
                  </div>
                ))}
              </div>
              {metrics.likely_uninstalled_note && (
                <div style={{ color: "#6b7684", fontSize: 11, marginTop: 6, maxWidth: 620 }}>
                  {metrics.likely_uninstalled_note}
                </div>
              )}
            </>
          )}

          {/* FUNNEL — the DROP between steps is the number that matters, so it is the number
              rendered. Counts alone hide where people are lost. */}
          {lifecycle?.funnel && (() => {
            const order = ["installed", "code_requested", "signed_in", "activated", "retained"];
            const labels = {
              installed: "Installed", code_requested: "Asked for a code",
              signed_in: "Signed in", activated: "Tring answered a call", retained: "5+ active days",
            };
            // Cumulative: everyone at a later stage also passed the earlier ones.
            const cum = {};
            order.forEach((k, i) => { cum[k] = order.slice(i).reduce((a, x) => a + (lifecycle.funnel[x] || 0), 0); });
            const top = cum[order[0]] || 0;
            return (
              <div style={{ marginTop: 16 }}>
                {order.map((k, i) => {
                  const n = cum[k];
                  const prev = i === 0 ? n : cum[order[i - 1]];
                  const kept = prev > 0 ? (100 * n) / prev : 0;
                  const width = top > 0 ? Math.max(2, (100 * n) / top) : 0;
                  const bad = i > 0 && kept < 50;
                  // THE CONSTRAINT (Goldratt): the single worst conversion, not every bad one.
                  // If more than one thing on a screen pulses, nothing does.
                  const worst = order.reduce((acc, kk, ii) => {
                    if (ii === 0) return acc;
                    const p = cum[order[ii - 1]], c = cum[kk];
                    const r = p > 0 ? c / p : 1;
                    return r < acc.r ? { k: kk, r } : acc;
                  }, { k: null, r: 2 });
                  return (
                    <Pulse key={k} active={worst.k === k} >
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}>
                        <span style={{ color: "#e6edf3", minWidth: 168 }}>{labels[k]}</span>
                        <span style={{ color: "#fff", fontWeight: 700 }}><CountUp value={n} /></span>
                        {i > 0 && prev > 0 && (
                          <span style={{ color: bad ? "#FF7B72" : "#9aa4b2", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {kept.toFixed(0)}% of previous · {(prev - n)} lost here
                          </span>
                        )}
                        {i > 0 && prev === 0 && (
                          <span style={{ color: "#5b6673", fontSize: 12 }}>no one reached this step yet</span>
                        )}
                      </div>
                      {/* Staggered by stage so the funnel resolves top-to-bottom: the step where
                          the bar suddenly shortens is FELT rather than calculated. */}
                      <div style={{ marginTop: 4 }}>
                        <GrowBar pct={width} delay={i * 110} color={bad ? "#FF7B72" : "#F4532E"} />
                      </div>
                    </div>
                    </Pulse>
                  );
                })}
              </div>
            );
          })()}

          {/* THE CONSTRAINT (Goldratt). One stage, never a list: the whole value of the idea is that
              everything subordinates to ONE thing, and a panel highlighting four "problem areas"
              has restated the problem rather than found the constraint. */}
          {lifecycle?.funnel_cumulative && (() => {
            const order = ["installed", "code_requested", "signed_in", "activated", "retained"];
            const labels = { installed: "installed", code_requested: "asked for a code",
                             signed_in: "signed in", activated: "had a call answered",
                             retained: "reached 5+ active days" };
            const c = findConstraint(lifecycle.funnel_cumulative, order);
            if (!c) return null;
            return (
              <Pulse active>
                <div style={{ marginTop: 16, padding: "13px 15px", borderRadius: 12,
                              background: "rgba(255,123,114,.08)",
                              border: "1px solid rgba(255,123,114,.32)" }}>
                  <div style={{ color: "#FF7B72", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                    THE CONSTRAINT
                  </div>
                  <div style={{ color: "#fff", fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>
                    {labels[c.from]} → {labels[c.stage]} keeps only {(c.kept * 100).toFixed(0)}%
                    {" "}· {c.lost} people lost here
                  </div>
                  <div style={{ color: "#9aa4b2", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                    Everything else subordinates to this. Work that improves a different stage
                    cannot move the total until this one clears — it only moves people into the
                    queue in front of it.
                  </div>
                </div>
              </Pulse>
            );
          })()}

          {/* SUBSCRIPTIONS — COUNTS, and no revenue figure anywhere, which is not an omission.
              No price is stored on the consumer path: receipts carry the product id and the
              transaction ids, never money, and the receipt validator is a stub that never calls
              Apple or Google. An MRR number here could only be counts times an assumed price —
              an assumption wearing the costume of a measurement. */}
          {rev && (
            <div style={{ ...S.card, padding: 16, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Subscriptions</span>
                <span style={{ color: "#5b6673", fontSize: 11.5 }}>
                  counts only — no price is recorded anywhere, so no revenue figure is shown
                </span>
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 12 }}>
                {[
                  ["entitled now", rev.entitled_now, `${rev.entitled_paid} paid · ${rev.entitled_granted} referral`],
                  ["ever paid", rev.unique_payers_ever,
                   rev.paid_conversion_pct != null ? `${rev.paid_conversion_pct}% of ${rev.activated_users} activated` : ""],
                  ["purchases", rev.purchases_in_window, `last ${rev.window_days}d, deduped`],
                  ["renewals", rev.renewal_events, `${rev.churn_events} churn events`],
                  ["expiring 7d", rev.expiring_7d, `${rev.expiring_30d} within 30d`],
                ].map(([label, val, sub]) => (
                  <div key={label}>
                    <div style={{ color: "#5b6673", fontSize: 10.5, textTransform: "uppercase",
                                  letterSpacing: .7 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
                      {val ?? "—"}
                    </div>
                    <div style={{ color: "#9aa4b2", fontSize: 11 }}>{sub}</div>
                  </div>
                ))}
              </div>
              {/* PAID vs GRANTED, kept apart. Referral months are real Pro — they unlock voice
                  cloning identically — and cost almost nothing to mint, so a conversion rate that
                  folds them in counts giveaways as sales. */}
              {rev.entitled_now > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(rev.entitled_paid / rev.entitled_now) * 100}%`,
                                  background: "#5FB07A", transition: "width 700ms" }} />
                    <div style={{ flex: 1, background: "rgba(244,83,46,.5)" }} />
                  </div>
                  <div style={{ color: "#9aa4b2", fontSize: 11, marginTop: 6 }}>
                    <span style={{ color: "#5FB07A" }}>■</span> {rev.entitled_paid} paid ·{" "}
                    <span style={{ color: "#F4532E" }}>■</span> {rev.entitled_granted} granted by referral
                  </div>
                </div>
              )}
              {/* The caveats ARE the data. A reader who does not know them will draw conclusions
                  these numbers cannot support, so they sit next to the numbers, not in a doc. */}
              <details style={{ marginTop: 12 }}>
                <summary style={{ color: "#E7B75A", fontSize: 11.5, cursor: "pointer" }}>
                  What these numbers can and cannot tell you ({rev.caveats?.length || 0})
                </summary>
                <ul style={{ color: "#9aa4b2", fontSize: 11.5, lineHeight: 1.6, marginTop: 8,
                             paddingLeft: 18 }}>
                  {(rev.caveats || []).map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
                </ul>
              </details>
            </div>
          )}

          {/* FORWARDING, PER CARRIER. The whole product depends on one MMI code being accepted by
              the user's operator, and operators do not behave alike. A blended activation rate
              averages a carrier that works with one that does not and describes neither. */}
          {carr?.carriers?.length > 0 && (
            <div style={{ ...S.card, padding: 16, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Forwarding by carrier</span>
                <span style={{ color: "#5b6673", fontSize: 11.5 }}>
                  {carr.attempts} attempts · last {carr.window_days} days
                  {carr.spread_pct != null && ` · ${carr.spread_pct} points between best and worst`}
                </span>
              </div>
              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 560 }}>
                  <thead>
                    <tr style={{ color: "#5b6673", fontSize: 10.5, textTransform: "uppercase", letterSpacing: .6 }}>
                      {["carrier", "users", "registered", "partial", "rejected", "manual", "dial success", "actually screened"]
                        .map((h, i) => (
                        <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "6px 8px",
                                             fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,.10)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {carr.carriers.map((c) => {
                      const bad = c.success_pct != null && c.success_pct < 60;
                      // The two numbers disagreeing is the finding, not a rendering detail: an MMI
                      // that reported OK and never diverted a call looks perfect in the first.
                      const lying = c.success_pct != null && c.confirmed_pct != null
                                    && c.success_pct - c.confirmed_pct > 30;
                      return (
                        <tr key={c.carrier} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                          <td style={{ padding: "7px 8px", color: "#fff", fontWeight: 600 }}>
                            {c.carrier}
                            {c.ios > 0 && c.android > 0 && (
                              <span style={{ color: "#5b6673", fontWeight: 400, fontSize: 10.5 }}>
                                {" "}· {c.ios} iOS / {c.android} Android
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "7px 8px", textAlign: "right" }}>{c.users}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", color: "#5FB07A" }}>{c.full}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", color: "#E7B75A" }}>{c.partial}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", color: "#F4532E" }}>{c.failed}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", color: "#6b7684" }}>{c.manual}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700,
                                       color: c.success_pct == null ? "#5b6673" : bad ? "#F4532E" : "#e6edf3" }}>
                            {c.success_pct == null ? "—" : `${c.success_pct}%`}
                          </td>
                          <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700,
                                       color: lying ? "#F4532E" : "#e6edf3" }}>
                            {c.confirmed_pct == null ? "—" : `${c.confirmed_pct}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ color: "#9aa4b2", fontSize: 11.5, marginTop: 10, lineHeight: 1.55 }}>
                <b style={{ color: "#e6edf3" }}>manual</b> is excluded from dial success — on iOS and
                pre-Android-8 nothing is dialled automatically, so those were never attempted rather
                than failed. <b style={{ color: "#e6edf3" }}>Actually screened</b> is the number to
                trust: it asks whether a call ever really got diverted, which an MMI that returned
                OK and quietly forwarded nothing cannot fake.
              </div>
            </div>
          )}

          {/* THE REFERRAL ENGINE. With referral the only acquisition channel, two numbers decide
              everything and neither is the one usually quoted: k sets whether growth compounds at
              all, cycle time sets how fast. A k of 0.6 on a 10-day loop beats a k of 0.9 on a
              60-day loop badly — so both are shown, always together. */}
          {ref && (
            <div style={{ ...S.card, padding: 16, marginTop: 20,
                          borderColor: ref.reaches_goal ? "rgba(95,176,122,.4)" : "rgba(244,83,46,.35)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>The referral engine</span>
                <span style={{ color: "#5b6673", fontSize: 11.5 }}>
                  the only channel, so the only arithmetic that matters
                </span>
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 12 }}>
                {[
                  ["k-factor", ref.k_factor, ref.k_factor > 0 ? `1 new user per ${Math.round(1 / ref.k_factor)}` : "no compounding"],
                  ["cycle", ref.cycle_days != null ? `${ref.cycle_days}d` : "—",
                   ref.cycles_in_horizon ? `${ref.cycles_in_horizon} turns in ${ref.horizon_days}d` : "not measurable yet"],
                  ["referring", ref.participation_pct != null ? `${ref.participation_pct}%` : "—",
                   `${ref.referrers} of ${ref.base_users} users`],
                  ["redemptions", ref.redemptions, `${ref.window_days}d window`],
                ].map(([label, val, sub]) => (
                  <div key={label}>
                    <div style={{ color: "#5b6673", fontSize: 10.5, textTransform: "uppercase",
                                  letterSpacing: .7 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
                      {val ?? "—"}
                    </div>
                    <div style={{ color: "#9aa4b2", fontSize: 11 }}>{sub}</div>
                  </div>
                ))}
              </div>
              {/* The unflattering part, on purpose. If referral alone cannot reach the goal, the
                  number says so — a plan built on an unmeasured k is not a plan. */}
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10,
                            background: ref.reaches_goal ? "rgba(95,176,122,.10)" : "rgba(244,83,46,.09)",
                            border: `1px solid ${ref.reaches_goal ? "rgba(95,176,122,.3)" : "rgba(244,83,46,.28)"}` }}>
                <div style={{ fontSize: 13.5, color: "#e6edf3", lineHeight: 1.55 }}>
                  <b style={{ color: ref.reaches_goal ? "#5FB07A" : "#F4532E" }}>
                    {ref.reaches_goal
                      ? `On today's k, referral alone reaches ${(ref.projected_users || 0).toLocaleString("en-IN")} in ${ref.horizon_days} days.`
                      : ref.projected_users != null
                        ? `On today's k, referral alone reaches ${ref.projected_users.toLocaleString("en-IN")} in ${ref.horizon_days} days — not ${(ref.goal || 0).toLocaleString("en-IN")}.`
                        : "No honest projection yet — cycle time isn't measurable."}
                  </b>
                  {ref.k_needed_for_goal != null && ref.k_factor > 0 && (
                    <span style={{ color: "#9aa4b2" }}>
                      {" "}Reaching the goal on this clock needs k = {ref.k_needed_for_goal},
                      about {Math.round(ref.k_needed_for_goal / ref.k_factor)}× today's.
                    </span>
                  )}
                </div>
              </div>
              {/* THE LOOP, end to end. k tells you the loop's yield; only the steps tell you
                  WHERE it leaks, and the two leaks need opposite fixes — a share sheet nobody
                  opens is a message problem, a link nobody converts is a store-listing problem. */}
              {ref.loop_top?.instrumented && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ color: "#5b6673", fontSize: 10.5, textTransform: "uppercase",
                                letterSpacing: .7, marginBottom: 7 }}>the loop</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
                    {[["shared", ref.loop_top.shares], ["link opened", ref.loop_top.link_opens],
                      ["redeemed", ref.redemptions]].map(([label, v], i, arr) => {
                      const max = Math.max(...arr.map(([, x]) => Number(x) || 0)) || 1;
                      const prev = i > 0 ? Number(arr[i - 1][1]) || 0 : null;
                      const conv = prev ? Math.round((Number(v) / prev) * 1000) / 10 : null;
                      return (
                        <React.Fragment key={label}>
                          {i > 0 && (
                            <div style={{ color: conv != null && conv < 10 ? "#F4532E" : "#5b6673",
                                          fontSize: 10.5, padding: "0 6px 14px" }}>
                              {conv != null ? `${conv}%` : "—"}
                            </div>
                          )}
                          <div style={{ flex: 1, textAlign: "center" }}>
                            <div style={{ height: 44, display: "flex", alignItems: "flex-end" }}>
                              <div style={{ width: "100%", borderRadius: "3px 3px 0 0",
                                            background: i === 2 ? "#F4532E" : "rgba(244,83,46,.35)",
                                            height: `${Math.max(4, ((Number(v) || 0) / max) * 100)}%`,
                                            transition: "height 700ms cubic-bezier(.22,.9,.3,1)" }} />
                            </div>
                            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                              {v ?? "—"}
                            </div>
                            <div style={{ color: "#5b6673", fontSize: 10 }}>{label}</div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  {ref.loop_top.shares == null || ref.loop_top.shares === 0 ? (
                    <div style={{ color: "#E7B75A", fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                      Link opens are counted here on the website; shares are not arriving from the
                      app yet, so the first step is blank until the next build ships.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Absence is not zero, and the panel must not let those look alike. */}
              {ref.loop_top && !ref.loop_top.instrumented && (
                <div style={{ color: "#E7B75A", fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
                  Shares aren&apos;t instrumented yet — only redemptions are recorded, which is the
                  last step of five. A loop leaking at the share sheet and one leaking at install
                  look identical from here. The events are live server-side; the app needs to send
                  <code style={{ color: "#e6edf3" }}> referral_shared</code> and
                  <code style={{ color: "#e6edf3" }}> referral_link_opened</code>.
                </div>
              )}
              {ref.top_decile_share_pct != null && (
                <div style={{ color: "#9aa4b2", fontSize: 11.5, marginTop: 8 }}>
                  The top 10% of referrers bring <b style={{ color: "#e6edf3" }}>{ref.top_decile_share_pct}%</b>
                  {" "}of all referred users.
                </div>
              )}
            </div>
          )}

          {/* THE POWER LAW (Thiel ch7), made visible. An average hides it completely: "21 calls
              per user" is a sentence about nobody when one person has 596 and forty have one. */}
          {power?.deciles?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                Who does the using
                <span style={{ color: "#5b6673", fontSize: 11.5, fontWeight: 400 }}>
                  {" "}· {power.users} people with ≥1 answered call · {power.total_calls?.toLocaleString("en-IN")} calls
                </span>
              </div>
              {power.top_decile_share_pct != null && (
                <div style={{ color: "#9aa4b2", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                  The heaviest 10% account for{" "}
                  <b style={{ color: power.top_decile_share_pct >= 50 ? "#E7B75A" : "#e6edf3" }}>
                    {power.top_decile_share_pct}%
                  </b>{" "}
                  of all answered calls.
                  {power.top_decile_share_pct >= 50
                    ? " Above half means the business IS these users — build for them, and find more like them."
                    : " Usage is relatively even, so the average is actually meaningful here."}
                </div>
              )}
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", marginTop: 12, height: 76 }}>
                {power.deciles.map((d, i) => {
                  const max = Math.max(...power.deciles.map((x) => x.share_pct)) || 1;
                  return (
                    <div key={d.decile} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ color: "#6b7684", fontSize: 9.5, marginBottom: 2 }}>{d.share_pct}%</div>
                      <div style={{ height: 46, display: "flex", alignItems: "flex-end" }}>
                        <div style={{ width: "100%", background: i === 0 ? "#F4532E" : "rgba(244,83,46,.35)",
                                      borderRadius: "3px 3px 0 0",
                                      height: `${Math.max(3, (d.share_pct / max) * 100)}%`,
                                      transition: "height 700ms cubic-bezier(.22,.9,.3,1)" }} />
                      </div>
                      <div style={{ color: "#5b6673", fontSize: 9 }}>{d.decile}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ color: "#5b6673", fontSize: 10.5 }}>
                decile 1 = heaviest users · bar height = share of all answered calls
              </div>
              {power.top_users?.length > 0 && (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                  {power.top_users.slice(0, 8).map((u) => (
                    <div key={u.phone} style={{ ...S.card, padding: "7px 11px" }}>
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>
                        {u.name || u.phone}
                      </span>
                      <span style={{ color: "#F4532E", fontSize: 12, marginLeft: 7 }}>{u.calls}</span>
                      <span style={{ color: "#5b6673", fontSize: 10.5 }}> · {u.active_days}d</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RETENTION — two curves for the SAME users. The gap is the signal: opens holding up
              while answers fall means people keep checking a product that is not working for them. */}
          {cohErr && <div style={{ color: "#FF7B72", fontSize: 13, marginTop: 14 }}>{cohErr}</div>}
          {cohorts?.cohorts?.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ color: "#fff", fontSize: 14.5, fontWeight: 600 }}>Weekly retention, by cohort</div>
              <div style={{ color: "#9aa4b2", fontSize: 12, marginTop: 3 }}>
                Cohort = the week Tring first answered a call for them. Top row of each pair is
                calls answered, the muted row is app opens. “—” means that week has not happened
                yet, or predates the open ledger — not zero.
              </div>
              {/* THE CURVE, drawn. A retention table is read cell by cell; the SHAPE is the whole
                  point — whether it flattens or decays to zero — and no one sees a shape in a grid
                  of percentages. Inline SVG, no chart library: a dozen points do not justify a
                  dependency, and this renders identically everywhere. */}
              {(() => {
                const W = 520, H = 150, PADL = 34, PADB = 22, PADT = 10;
                const weeks = [0, 1, 2, 3, 4, 5];
                const x = (w) => PADL + (w / 5) * (W - PADL - 10);
                const y = (p) => PADT + (1 - p / 100) * (H - PADT - PADB);
                // Weight each cohort by size: a 2-person cohort must not swing the picture as hard
                // as a 36-person one, which is exactly how small-sample noise gets mistaken for a
                // trend.
                const avg = weeks.map((w) => {
                  let num = 0, den = 0;
                  for (const c of cohorts.cohorts) {
                    const v = c[`answered_week_${w}`];
                    if (v != null) { num += v * c.activated_users; den += c.activated_users; }
                  }
                  return den ? { w, v: num / den, n: den } : null;
                }).filter(Boolean);
                if (avg.length < 2) return null;
                const line = avg.map((p, i) => `${i ? "L" : "M"}${x(p.w).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 560, marginTop: 14 }}
                       role="img" aria-label="Weighted answered-call retention curve">
                    {[0, 25, 50, 75, 100].map((g) => (
                      <g key={g}>
                        <line x1={PADL} y1={y(g)} x2={W - 10} y2={y(g)} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
                        <text x={PADL - 6} y={y(g) + 3.5} textAnchor="end" fontSize="9" fill="#6b7684">{g}%</text>
                      </g>
                    ))}
                    {weeks.map((w) => (
                      <text key={w} x={x(w)} y={H - 6} textAnchor="middle" fontSize="9" fill="#6b7684">W{w}</text>
                    ))}
                    <path d={line} fill="none" stroke="#F4532E" strokeWidth="2.2"
                          strokeLinejoin="round" strokeLinecap="round" />
                    {avg.map((p) => (
                      <g key={p.w}>
                        <circle cx={x(p.w)} cy={y(p.v)} r="3.4" fill="#F4532E" />
                        <text x={x(p.w)} y={y(p.v) - 8} textAnchor="middle" fontSize="9.5" fill="#e6edf3">
                          {p.v.toFixed(0)}%
                        </text>
                      </g>
                    ))}
                  </svg>
                );
              })()}
              <div style={{ color: "#6b7684", fontSize: 11.5, marginTop: 4 }}>
                Curve is weighted by cohort size, so a 2-person week cannot swing it like a
                36-person one. A tail that flattens is a business; one that reaches zero is not.
              </div>

              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead><tr>
                    {["Cohort", "Users", "W0", "W1", "W2", "W3", "W4", "W5"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Cohort" ? "left" : "right", color: "#9aa4b2",
                                           fontSize: 12, padding: "6px 10px",
                                           borderBottom: "1px solid rgba(255,255,255,.1)" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {cohorts.cohorts.map((c) => {
                      const cell = (v, muted) => {
                        if (v == null) return <span style={{ color: "#5b6673" }}>—</span>;
                        // Colour only the answered row: two coloured rows would fight.
                        const col = muted ? "#8b95a1" : v >= 40 ? "#5CD98A" : v >= 20 ? "#E7B75A" : "#FF7B72";
                        return <span style={{ color: col, fontVariantNumeric: "tabular-nums" }}>{v}%</span>;
                      };
                      return (
                        <React.Fragment key={c.cohort_week}>
                          <tr>
                            <td rowSpan={2} style={{ padding: "8px 10px", color: "#e6edf3", fontSize: 13,
                                                     borderTop: "1px solid rgba(255,255,255,.06)" }}>
                              {c.cohort_week}
                            </td>
                            <td rowSpan={2} style={{ padding: "8px 10px", color: "#fff", fontSize: 13, textAlign: "right",
                                                     fontVariantNumeric: "tabular-nums",
                                                     borderTop: "1px solid rgba(255,255,255,.06)" }}>
                              {c.activated_users}
                            </td>
                            {[0, 1, 2, 3, 4, 5].map((w) => (
                              <td key={w} style={{ padding: "6px 10px", textAlign: "right", fontSize: 13,
                                                   borderTop: "1px solid rgba(255,255,255,.06)" }}>
                                {cell(c[`answered_week_${w}`], false)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            {[0, 1, 2, 3, 4, 5].map((w) => (
                              <td key={w} style={{ padding: "0 10px 7px", textAlign: "right", fontSize: 11.5 }}>
                                {cell(c[`opened_week_${w}`], true)}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── App lifecycle: who to call, and about what ───────────────────────────── */}
        <div style={{ ...S.card, marginTop: 22, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", margin: 0 }}>App users — where each one stopped</h2>
            <div style={{ flex: 1 }} />
            {["", "code_requested", "signed_in", "activated", "retained"].map((st) => (
              <button key={st || "all"}
                style={lcStage === st ? S.btn : S.ghost}
                onClick={() => { setLcStage(st); loadLifecycle(st); }}>
                {st === "" ? "All" : st.replace("_", " ")}
              </button>
            ))}
            {/* Exports the SAME filter that is on screen. A button that silently exported
                everything while the table showed one stage would hand someone a call list that
                does not match the thing they were looking at when they asked for it. */}
            <a href={`/api/admin/export?table=app_users${lcStage ? `&stage=${lcStage}` : ""}`}
               style={{ textDecoration: "none" }}>
              <button style={S.ghost} title="Every matching row, paged in full — not just this page">
                Export CSV{lcStage ? ` · ${lcStage.replace("_", " ")}` : ""}
              </button>
            </a>
          </div>
          <p style={{ color: "#9aa4b2", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
            <b>code requested</b> asked for an OTP and never entered it — the biggest leak.{" "}
            <b>signed in</b> verified but Tring has never answered a call for them.{" "}
            <b>activated</b> at least one answered call. <b>retained</b> answered calls on 5+ days —
            the only people whose opinion on the product is worth weighting.
          </p>
          {lcErr && (
            <div style={{ ...S.card, marginTop: 12, padding: "12px 14px",
                          borderColor: "rgba(255,123,114,.4)" }}>
              <div style={{ color: "#FF7B72", fontSize: 13.5, fontWeight: 600 }}>{lcErr}</div>
              {/^APOLLO_ADMIN_API_KEY/.test(lcErr) && (
                <div style={{ color: "#9aa4b2", fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>
                  This panel reads live data from Apollo, which is key-gated. Nothing is broken —
                  the deployment just has no key yet.
                </div>
              )}
            </div>
          )}
          {lcBusy && <div style={{ color: "#9aa4b2", fontSize: 13.5, marginTop: 12 }}>Loading…</div>}
          {/* Whether the abandoned-signup reminder can actually be DELIVERED. Scheduling, firing
              and "sending" all succeed even with no device attached, so an inert ladder looks
              identical to a working one everywhere except this number. */}
          {lifecycle?.ladder_health?.pending_signups > 0 && (
            <div style={{ ...S.card, marginTop: 14, padding: "12px 16px",
                          borderColor: (lifecycle.ladder_health.reachable_pct ?? 0) < 50
                            ? "rgba(255,123,114,.45)" : "rgba(92,217,138,.35)" }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                Reminder ladder: {lifecycle.ladder_health.reachable_by_push} of{" "}
                {lifecycle.ladder_health.pending_signups} stalled signups can be reached
                {lifecycle.ladder_health.reachable_pct != null && ` (${lifecycle.ladder_health.reachable_pct}%)`}
              </div>
              {(lifecycle.ladder_health.reachable_pct ?? 100) < 50 && (
                <div style={{ color: "#FF7B72", fontSize: 12.5, marginTop: 6 }}>
                  Most stalled signups have no push subscription, so the reminder is running and
                  delivering nothing — notification permission is not being granted before people
                  walk away.
                </div>
              )}
            </div>
          )}
          {lifecycle?.funnel && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {Object.entries(lifecycle.funnel).map(([k, v]) => (
                <div key={k} style={{ ...S.card, padding: "10px 14px", minWidth: 120 }}>
                  <div style={{ color: "#9aa4b2", fontSize: 12 }}>{k.replace("_", " ")}</div>
                  <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          {lifecycle?.users?.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
                <thead><tr>
                  {["Who", "Stage", "Platform", "Calls", "Days", "Last contact", "Log"].map((h) => (
                    <th key={h} style={{ textAlign: "left", color: "#9aa4b2", fontSize: 12, padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {lifecycle.users.map((u) => (
                    <tr key={u.phone}>
                      {/* NAME above NUMBER. The team is ringing a person; leading with digits made
                          every row look identical and gave the caller nothing to open with. */}
                      <td style={{ padding: "8px 10px", fontSize: 13.5 }}>
                        {u.name
                          ? <div style={{ color: "#fff", fontWeight: 600 }}>{u.name}</div>
                          : <div style={{ color: "#5b6673", fontSize: 12 }}>no name yet</div>}
                        <a href={`tel:${u.phone}`}
                           style={{ color: "#F4532E", textDecoration: "none", fontSize: 12.5,
                                    fontVariantNumeric: "tabular-nums" }}>{u.phone}</a>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#e6edf3", fontSize: 13 }}>{u.stage?.replace("_", " ")}</td>
                      <td style={{ padding: "8px 10px", color: "#9aa4b2", fontSize: 13 }}>{u.platform || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#e6edf3", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{u.calls_answered}</td>
                      <td style={{ padding: "8px 10px", color: "#e6edf3", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{u.active_days}</td>
                      {/* CONTACT HISTORY, on the row. Nobody should ring someone who was called
                          yesterday, and the person's own words belong next to their usage. */}
                      <td style={{ padding: "8px 10px", fontSize: 12.5 }}>
                        {u.contact?.contact_count > 0 ? (
                          <>
                            <div style={{ color: "#9aa4b2" }}>
                              {new Date(u.contact.last_contact_at).toLocaleDateString()}
                              {u.contact.last_outcome ? ` · ${u.contact.last_outcome.replace("_", " ")}` : ""}
                            </div>
                            {u.contact.last_note && (
                              <div style={{ color: "#6b7684", fontStyle: "italic", maxWidth: 260 }}>
                                “{u.contact.last_note}”
                              </div>
                            )}
                          </>
                        ) : <span style={{ color: "#5b6673" }}>never</span>}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <button style={{ ...S.ghost, padding: "4px 10px", fontSize: 12 }}
                                onClick={() => { setNoteFor(noteFor === u.phone ? null : u.phone); setNoteText(""); }}>
                          {noteFor === u.phone ? "Close" : "Log"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* nothing here: the log form is rendered inline below each row via noteFor */}
                </tbody>
              </table>
              {noteFor && (
                <div style={{ ...S.card, marginTop: 10, padding: 14 }}>
                  <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>
                    What did {(lifecycle.users.find((x) => x.phone === noteFor)?.name) || noteFor} say?
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Their words, not your summary. What did they DO, and what happened?"
                    rows={3}
                    style={{ width: "100%", marginTop: 8, background: "rgba(255,255,255,.05)",
                             border: "1px solid rgba(255,255,255,.14)", borderRadius: 10,
                             color: "#e6edf3", fontSize: 13.5, padding: 10, fontFamily: "inherit" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {[["reached", "Reached"], ["no_answer", "No answer"], ["callback_later", "Call back"],
                      ["wrong_number", "Wrong number"], ["refused", "Refused"]].map(([k, label]) => (
                      <button key={k} disabled={noteBusy} style={{ ...S.ghost, padding: "5px 11px", fontSize: 12.5 }}
                              onClick={() => saveNote(noteFor, k, undefined)}>{label}</button>
                    ))}
                    <div style={{ flex: 1 }} />
                    {[["love", "Loves it"], ["ok", "Fine"], ["frustrated", "Frustrated"], ["churned", "Gone"]].map(([k, label]) => (
                      <button key={k} disabled={noteBusy} style={{ ...S.ghost, padding: "5px 11px", fontSize: 12.5 }}
                              onClick={() => saveNote(noteFor, undefined, k)}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!lifecycle && !lcBusy && !lcErr && (
            <button style={{ ...S.btn, marginTop: 14 }} onClick={() => loadLifecycle(lcStage)}>Load app users</button>
          )}
        </div>

          {/* The call queue sits ABOVE the raw table on purpose: the table is a
              record, this is the work. */}
          <UserResearch
            rows={waitlist}
            onSaved={(id, patch) =>
              setData((d) => ({ ...d, waitlist: d.waitlist.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
            }
          />

          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead><tr>
              <th style={S.th}>✓</th>
              <th style={S.th}>#</th><th style={S.th}>Name</th><th style={S.th}>Email</th>
              <th style={S.th}>Device</th><th style={S.th}>From</th><th style={S.th}>Placement</th>
              <th style={S.th}>Country</th><th style={S.th}>When</th>
            </tr></thead>
            <tbody>
              {waitlist.map((r) => (
                <tr key={r.id} style={r.contacted ? { opacity: 0.55 } : undefined}>
                  <td style={S.td}>
                    <button
                      onClick={() => toggleContacted(r)}
                      title={r.contacted ? "Onboarded — click to untick" : "Mark as onboarded"}
                      style={{
                        width: 26, height: 26, borderRadius: 13, cursor: "pointer",
                        border: r.contacted ? "0" : "2px solid rgba(255,255,255,.25)",
                        background: r.contacted ? "#15A06A" : "transparent",
                        color: "#fff", fontSize: 13, fontWeight: 700,
                        display: "grid", placeItems: "center", lineHeight: 1,
                      }}
                    >
                      {r.contacted ? "✓" : ""}
                    </button>
                  </td>
                  <td style={{ ...S.td, color: "#8C7C73" }}>{r.id}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: "#fff" }}>{r.name}</td>
                  <td style={S.td}>{r.email}</td>
                  <td style={S.td}>{r.device === "ios" ? "iPhone" : "Android"}</td>
                  <td style={S.td}>{sourceOf(r)}</td>
                  <td style={S.td}>{r.placement || "—"}</td>
                  <td style={S.td}>{r.country || "—"}</td>
                  <td style={{ ...S.td, whiteSpace: "nowrap", color: "#B7A79D" }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!waitlist.length && (
                <tr><td style={{ ...S.td, color: "#8C7C73" }} colSpan={9}>No signups yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "28px 0 12px" }}>Store-link clicks</h2>
        <div style={{ ...S.card, overflowX: "auto", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr>
              <th style={S.th}>#</th><th style={S.th}>Store</th><th style={S.th}>Placement</th>
              <th style={S.th}>Referrer</th><th style={S.th}>Country</th><th style={S.th}>When</th>
            </tr></thead>
            <tbody>
              {(clicks || []).map((r) => (
                <tr key={r.id}>
                  <td style={{ ...S.td, color: "#8C7C73" }}>{r.id}</td>
                  <td style={S.td}>{r.kind === "ios" ? "App Store" : "Google Play"}</td>
                  <td style={S.td}>{r.placement || "—"}</td>
                  <td style={S.td}>{r.referrer ? r.referrer.slice(0, 60) : "—"}</td>
                  <td style={S.td}>{r.country || "—"}</td>
                  <td style={{ ...S.td, whiteSpace: "nowrap", color: "#B7A79D" }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!clicks?.length && (
                <tr><td style={{ ...S.td, color: "#8C7C73" }} colSpan={6}>No clicks yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
