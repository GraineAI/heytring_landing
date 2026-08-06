"use client";

/**
 * /admin — the beta waitlist dashboard. Password-gated (httpOnly cookie
 * set by /api/admin/login). Shows totals, platform split, where people
 * came from, the full signup list and store-link clicks, with CSV export.
 */
import { useEffect, useState } from "react";

const S = {
  page: { minHeight: "100vh", background: "#000000", color: "#FFF0EB", padding: "48px 20px", fontFamily: "inherit" },
  wrap: { maxWidth: 1100, margin: "0 auto" },
  card: { background: "#0B0B0C", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 20 },
  input: { width: "100%", background: "#000000", border: "1.5px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "13px 15px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" },
  btn: { background: "#F4532E", color: "#fff", border: 0, borderRadius: 12, padding: "12px 22px", fontWeight: 800, fontSize: 15, cursor: "pointer" },
  ghost: { background: "transparent", color: "#F6EEE8", border: "1.5px solid rgba(255,255,255,.18)", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "#8C7C73", borderBottom: "1px solid rgba(255,255,255,.08)", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.06)", verticalAlign: "top" },
};

function Tile({ k, v }) {
  return (
    <div style={{ ...S.card, padding: 16, flex: "1 1 140px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "#8C7C73", textTransform: "uppercase" }}>{k}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", marginTop: 4 }}>{v}</div>
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

  const load = async () => {
    const r = await fetch("/api/admin/data");
    if (r.status === 401) { setAuthed(false); return; }
    if (!r.ok) { setErr("Could not load data (is DATABASE_URL set?)"); setAuthed(false); return; }
    setData(await r.json());
    setAuthed(true);
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
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Tring admin</div>
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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>Beta waitlist</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.ghost} onClick={load}>Refresh</button>
            <a href="/api/admin/export?table=waitlist"><button style={S.btn}>Export CSV</button></a>
            <a href="/api/admin/export?table=clicks"><button style={S.ghost}>Clicks CSV</button></a>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
          <Tile k="Total signups" v={stats.total} />
          <Tile k="Onboarded" v={`${stats.onboarded} / ${stats.total}`} />
          <Tile k="Android" v={stats.android} />
          <Tile k="iPhone" v={stats.ios} />
          <Tile k="Last 24h" v={stats.today} />
          <Tile k="Play clicks" v={stats.play_clicks} />
          <Tile k="App Store clicks" v={stats.ios_clicks} />
        </div>

        <div style={{ ...S.card, marginTop: 20, overflowX: "auto", padding: 0 }}>
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
                        color: "#fff", fontSize: 13, fontWeight: 800,
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

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "28px 0 12px" }}>Store-link clicks</h2>
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
