"use client";
import React, { useEffect, useState } from "react";
import { CountUp, Rise, Pulse } from "../components/motion";

/**
 * INDUSTRY WATCH.
 *
 * The page is ordered by what actually decides things, which is the reverse of how news reads.
 * SCALE comes first — Truecaller at a billion installs and Equal AI at thirty ratings are not the
 * same kind of threat, and a headline that omits that reads identically for both. Then the
 * analyst's brief, which is the only element allowed to say "do this". Then the feed, sorted by
 * whether it changes a decision rather than by recency.
 */

const INK = "#e6edf3", MUTED = "#9aa4b2", FAINT = "#5b6673";
const card = { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 14 };
const page = { background: "#0F1216", minHeight: "100vh", color: INK,
               fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: "28px 20px 60px" };

const NAME = { truecaller: "Truecaller", hirobin: "hiRobin", equalai: "Equal AI", "": "the market" };
const SEV = {
  5: { label: "act now", c: "#F4532E" }, 4: { label: "this month", c: "#E7B75A" },
  3: { label: "decide", c: "#7BA7D9" }, 2: { label: "context", c: "#6b7684" },
  1: { label: "noise", c: "#4a5560" },
};
const MOOD = { urgent: "#F4532E", watch: "#E7B75A", calm: "#5FB07A" };

function compact(n) {
  if (n == null) return "—";
  if (n >= 1e7) return (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + " Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(n >= 1e6 ? 0 : 1) + " L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function IntelPage() {
  const [feed, setFeed] = useState(null);
  const [brief, setBrief] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [minSev, setMinSev] = useState(1);
  const [who, setWho] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [f, b] = await Promise.all([
        fetch(`/api/admin/intel?view=feed&days=21&min_severity=1`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/intel?view=brief`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (!f.ok) throw new Error(f.error || "feed unavailable");
      setFeed(f);
      setBrief(b.ok ? b.brief : null);
    } catch (e) { setErr(String(e.message || e)); }
  };

  useEffect(() => { load(); }, []);

  const refresh = async (withBrief) => {
    setBusy(withBrief ? "Reading, thinking — this takes a minute…" : "Sweeping the sources…");
    try {
      await fetch(`/api/admin/intel?action=refresh&brief=${withBrief ? 1 : 0}`, { method: "POST" });
      await load();
    } catch (e) { setErr(String(e.message || e)); }
    setBusy("");
  };

  const dismiss = async (id) => {
    setFeed((f) => f && { ...f, items: f.items.map((i) => (i.id === id ? { ...i, seen: true } : i)) });
    await fetch(`/api/admin/intel?action=seen&id=${encodeURIComponent(id)}`, { method: "POST" });
  };

  const items = (feed?.items || []).filter(
    (i) => i.severity >= minSev && (!who || i.competitor === who));
  const apps = feed?.apps || [];
  const byComp = {};
  for (const a of apps) (byComp[a.competitor] ||= []).push(a);

  return (
    <div style={page}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <a href="/admin" style={{ color: FAINT, fontSize: 12, textDecoration: "none" }}>← Overview</a>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Industry watch</h1>
          <span style={{ color: FAINT, fontSize: 12 }}>
            Truecaller · hiRobin · Equal AI · TRAI — swept every 6 hours
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => refresh(false)} disabled={!!busy}
              style={{ ...card, color: INK, fontSize: 12, padding: "7px 12px", cursor: "pointer" }}>
              Sweep now
            </button>
            <button onClick={() => refresh(true)} disabled={!!busy}
              style={{ background: "#F4532E", border: "none", borderRadius: 14, color: "#fff",
                       fontSize: 12, fontWeight: 600, padding: "7px 12px", cursor: "pointer" }}>
              Run the analyst
            </button>
          </div>
        </div>
        {busy && <div style={{ color: "#E7B75A", fontSize: 12, marginTop: 8 }}>{busy}</div>}
        {err && <div style={{ color: "#F4532E", fontSize: 12.5, marginTop: 10 }}>{err}</div>}

        {/* SCALE FIRST. Every claim about a rival is meaningless without the size of the company
            making it, so the size is the first thing on the page and travels with every mention. */}
        {apps.length > 0 && (
          <div style={{ display: "grid", gap: 10, marginTop: 18,
                        gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
            {Object.entries(byComp).map(([key, rows], idx) => {
              const play = rows.find((r) => r.store === "android") || {};
              const ios = rows.find((r) => r.store === "ios") || {};
              const shipped = ios.released_at || play.released_at;
              const days = shipped
                ? Math.round((Date.now() - new Date(shipped).getTime()) / 86400000) : null;
              return (
                <Rise key={key} delay={idx * 70}>
                  <div style={{ ...card, padding: 14 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{NAME[key] || key}</div>
                    <div style={{ display: "flex", gap: 16, marginTop: 9, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 19, fontWeight: 700, color: "#F4532E" }}>
                          {play.downloads != null ? compact(play.downloads) : (play.downloads_text || "—")}
                        </div>
                        <div style={{ color: FAINT, fontSize: 10 }}>Play installs</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 19, fontWeight: 700 }}>
                          {compact(play.ratings ?? ios.ratings)}
                        </div>
                        <div style={{ color: FAINT, fontSize: 10 }}>ratings</div>
                      </div>
                      {days != null && (
                        <div>
                          <div style={{ fontSize: 19, fontWeight: 700,
                                        color: days <= 14 ? "#E7B75A" : INK }}>{days}d</div>
                          <div style={{ color: FAINT, fontSize: 10 }}>since release</div>
                        </div>
                      )}
                    </div>
                    {ios.version && (
                      <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>
                        iOS v{ios.version}{play.version ? ` · Play updated ${play.version}` : ""}
                      </div>
                    )}
                    {!ios.version && !ios.ratings && (
                      <div style={{ color: FAINT, fontSize: 11, marginTop: 8 }}>
                        no iOS listing found — a channel they do not hold
                      </div>
                    )}
                    {/* Their release notes are the receipt. An announcement is a claim; this is
                        the changelog they published themselves. */}
                    {(ios.notes || "").trim() && (
                      <div style={{ color: MUTED, fontSize: 11.5, marginTop: 9, lineHeight: 1.5,
                                    borderLeft: "2px solid rgba(244,83,46,.4)", paddingLeft: 9 }}>
                        {(ios.notes || "").slice(0, 260)}
                      </div>
                    )}
                  </div>
                </Rise>
              );
            })}
          </div>
        )}

        {/* THE BRIEF — the only element on this page permitted to say "do this". */}
        {brief && (
          <div style={{ ...card, padding: 16, marginTop: 18,
                        borderColor: brief.mood === "urgent" ? "rgba(244,83,46,.5)" : "rgba(255,255,255,.10)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              {brief.mood === "urgent"
                ? <Pulse><span style={{ width: 8, height: 8, borderRadius: 8, background: MOOD.urgent, display: "block" }} /></Pulse>
                : <span style={{ width: 8, height: 8, borderRadius: 8, background: MOOD[brief.mood] || MOOD.calm, display: "block" }} />}
              <span style={{ color: MOOD[brief.mood] || MOOD.calm, fontSize: 10.5, fontWeight: 700,
                             letterSpacing: .8, textTransform: "uppercase" }}>{brief.mood || "calm"}</span>
              <span style={{ color: FAINT, fontSize: 11 }}>
                {brief.created_at ? new Date(brief.created_at).toLocaleString("en-IN") : ""}
                {brief.steps ? ` · ${brief.steps} steps` : ""}
                {brief.tools_used?.length ? ` · ${[...new Set(brief.tools_used)].join(", ")}` : ""}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginTop: 9, lineHeight: 1.45 }}>
              {brief.headline}
            </div>
            {brief.do_now?.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {brief.do_now.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#F4532E", fontSize: 12, fontWeight: 700, marginTop: 1 }}>→</span>
                    <div>
                      <div style={{ fontSize: 13, color: "#fff" }}>{d.action}</div>
                      <div style={{ color: MUTED, fontSize: 11.5, marginTop: 2 }}>
                        {d.why}
                        <span style={{ color: FAINT }}>
                          {d.owner ? ` · ${d.owner}` : ""}{d.effort ? ` · ${d.effort}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gap: 14, marginTop: 14,
                          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
              {[["Threats", brief.threats, "#F4532E"], ["Openings", brief.openings, "#5FB07A"]]
                .filter(([, v]) => v?.length).map(([label, list, c]) => (
                <div key={label}>
                  <div style={{ color: c, fontSize: 10.5, fontWeight: 700, letterSpacing: .8,
                                textTransform: "uppercase" }}>{label}</div>
                  {list.map((t, i) => (
                    <div key={i} style={{ color: MUTED, fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>· {t}</div>
                  ))}
                </div>
              ))}
            </div>
            {/* An analyst that cannot separate what it read from what it inferred is not one. */}
            {(brief.assumed?.length > 0) && (
              <div style={{ color: FAINT, fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
                <b style={{ color: MUTED }}>Assumed, not verified:</b> {brief.assumed.join(" · ")}
              </div>
            )}
          </div>
        )}
        {!brief && !err && (
          <div style={{ ...card, padding: 14, marginTop: 18, color: MUTED, fontSize: 12.5 }}>
            No briefing yet — the analyst runs daily, or press <b style={{ color: INK }}>Run the analyst</b> to
            do it now. It opens the articles, checks what rivals actually shipped, and holds it
            against our own activation and retention before recommending anything.
          </div>
        )}

        {/* THE FEED, sorted by whether it changes a decision — not by recency. */}
        <div style={{ display: "flex", gap: 7, marginTop: 22, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: FAINT, fontSize: 11 }}>Show</span>
          {[[1, "everything"], [3, "decisions+"], [4, "this month+"]].map(([v, l]) => (
            <button key={v} onClick={() => setMinSev(v)}
              style={{ ...card, color: minSev === v ? "#fff" : MUTED, fontSize: 11.5,
                       padding: "5px 10px", cursor: "pointer",
                       borderColor: minSev === v ? "#F4532E" : "rgba(255,255,255,.10)" }}>{l}</button>
          ))}
          <span style={{ width: 10 }} />
          {["", "truecaller", "hirobin", "equalai"].map((k) => (
            <button key={k || "all"} onClick={() => setWho(k)}
              style={{ ...card, color: who === k ? "#fff" : MUTED, fontSize: 11.5,
                       padding: "5px 10px", cursor: "pointer",
                       borderColor: who === k ? "#F4532E" : "rgba(255,255,255,.10)" }}>
              {k ? NAME[k] : "all"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {items.map((it, idx) => {
            const s = SEV[it.severity] || SEV[2];
            return (
              <Rise key={it.id} delay={Math.min(idx, 10) * 35}>
                <div style={{ ...card, padding: 13, opacity: it.seen ? 0.55 : 1,
                              borderLeft: `3px solid ${s.c}` }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ color: s.c, fontSize: 10, fontWeight: 700, letterSpacing: .6,
                                   textTransform: "uppercase" }}>{s.label}</span>
                    <span style={{ color: FAINT, fontSize: 11 }}>
                      {NAME[it.competitor] || it.competitor || "market"}
                      {it.person ? ` · ${it.person}` : ""}
                      {it.outlet ? ` · ${it.outlet}` : ""}
                      {it.published_at ? ` · ${new Date(it.published_at).toLocaleDateString("en-IN")}` : ""}
                    </span>
                    <button onClick={() => dismiss(it.id)}
                      style={{ marginLeft: "auto", background: "none", border: "none", color: FAINT,
                               fontSize: 11, cursor: "pointer" }}>
                      {it.seen ? "seen" : "dismiss"}
                    </button>
                  </div>
                  <a href={it.url} target="_blank" rel="noreferrer"
                     style={{ color: "#fff", fontSize: 13.5, textDecoration: "none",
                              display: "block", marginTop: 5, lineHeight: 1.45 }}>
                    {it.title}
                  </a>
                  {it.so_what && (
                    <div style={{ color: MUTED, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                      {it.so_what}
                      {it.move && it.move.toLowerCase() !== "watch" && (
                        <span style={{ color: "#E7B75A" }}> → {it.move}</span>
                      )}
                    </div>
                  )}
                </div>
              </Rise>
            );
          })}
          {items.length === 0 && !err && (
            <div style={{ ...card, padding: 14, color: MUTED, fontSize: 12.5 }}>
              Nothing at this threshold. That is usually the true answer — most weeks nobody does
              anything that changes what we should build.
            </div>
          )}
        </div>

        {/* Who they are hiring. A roadmap is legible in job posts a quarter before it ships. */}
        {feed?.jobs?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
              Who they're hiring
              <span style={{ color: FAINT, fontSize: 11.5, fontWeight: 400 }}>
                {" "}· open roles say where a rival is going, a quarter before anything ships
              </span>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
              {feed.jobs.slice(0, 24).map((j, i) => (
                <a key={i} href={j.url || "#"} target="_blank" rel="noreferrer"
                   style={{ ...card, padding: "6px 10px", textDecoration: "none" }}>
                  <span style={{ color: INK, fontSize: 11.5 }}>{j.title}</span>
                  <span style={{ color: FAINT, fontSize: 10.5 }}> · {j.location}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* What this feed does and does not see, stated where it will actually be read. */}
        {feed?.coverage && (
          <div style={{ ...card, padding: 13, marginTop: 24 }}>
            <div style={{ color: MUTED, fontSize: 11.5, lineHeight: 1.6 }}>
              <b style={{ color: INK }}>Watching:</b> {feed.coverage.tracked.join(" · ")}
            </div>
            <div style={{ color: FAINT, fontSize: 11.5, lineHeight: 1.6, marginTop: 6 }}>
              <b style={{ color: MUTED }}>Not watching:</b> {feed.coverage.not_tracked.join(" ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
