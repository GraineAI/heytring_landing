"use client";

/**
 * /admin — the beta waitlist dashboard. Password-gated (httpOnly cookie
 * set by /api/admin/login). Shows totals, platform split, where people
 * came from, the full signup list and store-link clicks, with CSV export.
 */
// React (not just the hooks): the cohort table renders TWO <tr> per cohort — answered and
// opened — which needs a keyed <React.Fragment>. The <> shorthand cannot take a key.
import React, { useEffect, useState } from "react";
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

  useEffect(() => { load(); }, []);

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

  const loadCohorts = async () => {
    setCohErr("");
    try {
      const res = await fetch("/api/admin/users?view=retention&weeks=8", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) setCohErr(j.error || `apollo returned ${res.status}`);
      else setCohorts(j);
    } catch { setCohErr("could not reach the server"); }
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
              activation, then retention measured by calls actually answered
            </span>
            <div style={{ flex: 1 }} />
            {!cohorts && <button style={S.ghost} onClick={() => { loadLifecycle(lcStage); loadCohorts(); }}>Load</button>}
          </div>

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
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}>
                        <span style={{ color: "#e6edf3", minWidth: 168 }}>{labels[k]}</span>
                        <span style={{ color: "#fff", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n}</span>
                        {i > 0 && (
                          <span style={{ color: bad ? "#FF7B72" : "#9aa4b2", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {kept.toFixed(0)}% of previous · {(prev - n)} lost here
                          </span>
                        )}
                      </div>
                      <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,.07)", marginTop: 4 }}>
                        <div style={{ width: `${width}%`, height: "100%", borderRadius: 6,
                                      background: bad ? "#FF7B72" : "#F4532E", opacity: bad ? 0.85 : 0.9 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

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
                  {["Who", "Stage", "Platform", "Asked for code", "Calls", "Days", "Nudges", "Push?"].map((h) => (
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
                      <td style={{ padding: "8px 10px", color: "#9aa4b2", fontSize: 12.5 }}>{u.code_requested_at ? new Date(u.code_requested_at).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#e6edf3", fontSize: 13 }}>{u.calls_answered}</td>
                      <td style={{ padding: "8px 10px", color: "#e6edf3", fontSize: 13 }}>{u.active_days}</td>
                      <td style={{ padding: "8px 10px", color: "#9aa4b2", fontSize: 13 }}>{u.nudges_sent}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, color: u.reachable_by_push ? "#5CD98A" : "#FF7B72" }}>
                        {u.reachable_by_push ? "yes" : "no"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
