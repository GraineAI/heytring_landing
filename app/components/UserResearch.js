"use client";

import { useMemo, useState } from "react";

/**
 * UserResearch — the "talk to your users" surface.
 *
 * Two things it deliberately is NOT:
 *   • not a CRM. There is no pipeline, no stages, no assignment. At 140 people
 *     the job is to ring them and write down what they said.
 *   • not a survey tool. Every field here assumes a conversation happened.
 *
 * The call queue is the point. Left to itself an admin table sorts by signup
 * date, which is the wrong order — the people worth calling first are the ones
 * who signed up and then never came back, because they are the only ones who
 * can tell you why. So the default order is "most likely to teach you
 * something", not "most recent".
 */

const OUTCOMES = [
  { key: "", label: "—", color: "#8C7C73" },
  { key: "reached", label: "Reached", color: "#3FBF7F" },
  { key: "activated", label: "Activated", color: "#3FBF7F" },
  { key: "no_answer", label: "No answer", color: "#FFB454" },
  { key: "wrong_number", label: "Wrong number", color: "#8C7C73" },
  { key: "refused", label: "Refused", color: "#FF7B72" },
  { key: "churned", label: "Churned", color: "#FF7B72" },
];

/** Suggested tags. Free text is allowed, but a shared vocabulary is countable. */
const SUGGESTED = [
  "otp-failed", "forwarding-confusing", "language", "voice-quality",
  "spam-heavy", "wants-own-voice", "price", "trust", "no-need", "bug",
];

const CARD = { background: "#0B0B0C", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 18 };
const INK = "#FFF0EB", SUB = "#B7A79D", MUTED = "#8C7C73";

export default function UserResearch({ rows, onSaved }) {
  const [open, setOpen] = useState(null);      // row id being edited
  const [draft, setDraft] = useState({ notes: "", outcome: "", tags: [] });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("todo");

  /**
   * Priority: uncalled first, and among those the oldest signups first —
   * someone who joined three weeks ago and never activated has had time to
   * form an opinion. Called people sink to the bottom.
   */
  const queue = useMemo(() => {
    const score = (r) => (r.outcome ? 2 : r.contacted ? 1 : 0);
    return [...(rows || [])]
      .filter((r) => {
        if (filter === "todo") return !r.outcome;
        if (filter === "done") return !!r.outcome;
        if (filter === "tagged") return (r.tags || []).length > 0;
        return true;
      })
      .sort((a, b) => score(a) - score(b) || new Date(a.created_at) - new Date(b.created_at));
  }, [rows, filter]);

  const stats = useMemo(() => {
    const all = rows || [];
    const called = all.filter((r) => r.outcome);
    const counts = {};
    for (const r of all) for (const t of r.tags || []) counts[t] = (counts[t] || 0) + 1;
    return {
      total: all.length,
      called: called.length,
      reached: all.filter((r) => r.outcome === "reached" || r.outcome === "activated").length,
      topTags: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }, [rows]);

  const edit = (r) => {
    setOpen(r.id);
    setDraft({ notes: r.notes || "", outcome: r.outcome || "", tags: r.tags || [] });
  };

  const save = async (id) => {
    setSaving(true);
    const res = await fetch("/api/admin/research", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...draft }),
    }).catch(() => null);
    setSaving(false);
    if (res && res.ok) { setOpen(null); onSaved?.(id, draft); }
  };

  const toggleTag = (t) =>
    setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }));

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Talk to your users</h2>
        <span style={{ fontSize: 13, color: MUTED }}>
          {stats.called} of {stats.total} called · {stats.reached} actually reached
        </span>
      </div>
      <p style={{ fontSize: 13, color: MUTED, margin: "6px 0 0", maxWidth: "72ch", lineHeight: 1.6 }}>
        Ordered by who will teach you the most, not by who signed up last: never-called first, oldest
        signup first. The ones who joined and never activated are the only people who can explain why.
      </p>

      {!!stats.topTags.length && (
        <div style={{ ...CARD, marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 10 }}>What they keep saying</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {stats.topTags.map(([t, n]) => (
              <span key={t} style={{ fontSize: 12.5, fontWeight: 600, color: INK, background: "rgba(244,83,46,.16)",
                                     border: "1px solid rgba(244,83,46,.32)", borderRadius: 999, padding: "5px 12px" }}>
                {t} <span style={{ color: SUB }}>{n}</span>
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10 }}>
            A tag on three or more people is a pattern; a tag on one is an anecdote.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        {[["todo", "To call"], ["done", "Called"], ["tagged", "Tagged"], ["all", "Everyone"]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ background: filter === k ? "rgba(244,83,46,.18)" : "transparent",
                     border: `1px solid ${filter === k ? "#F4532E" : "rgba(255,255,255,.16)"}`,
                     color: filter === k ? "#fff" : SUB, borderRadius: 999, padding: "6px 14px",
                     fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {queue.slice(0, 60).map((r) => {
          const oc = OUTCOMES.find((o) => o.key === (r.outcome || "")) || OUTCOMES[0];
          const isOpen = open === r.id;
          return (
            <div key={r.id} style={{ ...CARD, padding: 14, borderColor: isOpen ? "rgba(244,83,46,.4)" : "rgba(255,255,255,.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.email} · {r.device === "ios" ? "iPhone" : "Android"} · joined{" "}
                    {Math.max(0, Math.round((Date.now() - new Date(r.created_at)) / 86400000))}d ago
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: oc.color }}>{oc.label}</span>
                {(r.tags || []).slice(0, 3).map((t) => (
                  <span key={t} style={{ fontSize: 11, color: SUB, background: "rgba(255,255,255,.06)", borderRadius: 999, padding: "3px 9px" }}>{t}</span>
                ))}
                <button onClick={() => (isOpen ? setOpen(null) : edit(r))}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,.18)", color: INK,
                           borderRadius: 10, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  {isOpen ? "Close" : r.outcome ? "Edit" : "Log a call"}
                </button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 14 }}>
                  <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 7 }}>How did it go?</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                    {OUTCOMES.filter((o) => o.key).map((o) => (
                      <button key={o.key} onClick={() => setDraft((d) => ({ ...d, outcome: d.outcome === o.key ? "" : o.key }))}
                        style={{ background: draft.outcome === o.key ? "rgba(255,255,255,.14)" : "transparent",
                                 border: `1px solid ${draft.outcome === o.key ? o.color : "rgba(255,255,255,.16)"}`,
                                 color: draft.outcome === o.key ? "#fff" : SUB, borderRadius: 999,
                                 padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 7 }}>
                    What did they actually say? Their words, not your summary.
                  </div>
                  <textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    rows={5} placeholder="&ldquo;I got the OTP but it never filled in, so I gave up.&rdquo;"
                    style={{ width: "100%", background: "#000", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12,
                             padding: "11px 13px", color: "#fff", fontSize: 14, fontFamily: "inherit",
                             lineHeight: 1.55, outline: "none", boxSizing: "border-box", resize: "vertical" }} />

                  <div style={{ fontSize: 11.5, color: MUTED, margin: "14px 0 7px" }}>Tag the theme</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {[...new Set([...SUGGESTED, ...draft.tags])].map((t) => (
                      <button key={t} onClick={() => toggleTag(t)}
                        style={{ background: draft.tags.includes(t) ? "rgba(244,83,46,.2)" : "transparent",
                                 border: `1px solid ${draft.tags.includes(t) ? "#F4532E" : "rgba(255,255,255,.14)"}`,
                                 color: draft.tags.includes(t) ? "#fff" : SUB, borderRadius: 999,
                                 padding: "4px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                        {t}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => save(r.id)} disabled={saving}
                      style={{ background: "#F4532E", border: 0, color: "#fff", borderRadius: 12,
                               padding: "9px 20px", fontSize: 13.5, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setOpen(null)}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,.18)", color: SUB,
                               borderRadius: 12, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!queue.length && (
          <div style={{ ...CARD, color: MUTED, fontSize: 13.5 }}>
            {filter === "todo" ? "Everyone has been called. Go find more users." : "Nothing here yet."}
          </div>
        )}
      </div>
    </div>
  );
}
