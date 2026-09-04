"use client";
import React, { useState } from "react";

/**
 * CALL VARIABLES — what the agent is actually told, before it says a word.
 *
 * Every complaint that starts "it spoke the wrong language" / "it said the wrong name" / "it used
 * male verbs in my wife's voice" is a question about ONE dictionary: the variables the call
 * carries into the prompt. That dictionary is assembled from four places — the user's own settings
 * in Neon, the voice they picked in Mimir, what past calls taught us about the caller, and the
 * lines resolved server-side in prompt_lines.py — and until this page, answering the question
 * meant reading three services with a user on hold.
 *
 * Two halves, and they answer different questions:
 *   A USER      — the real set for a real person, inbound and outbound side by side. Apollo builds
 *                 it with the SAME functions the live call uses, so this is what the agent gets,
 *                 not what we believe it gets.
 *   THE MATRIX  — the generator: any language x voice gender x owner gender x direction, with no
 *                 user at all. The gendered verbs and the native-script opener cannot be reviewed
 *                 in a config screen; they have to be rendered to be read.
 */

const INK = "#e6edf3", MUTED = "#9aa4b2", FAINT = "#5b6673", ORANGE = "#F4532E";
const card = { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 14 };
const page = { background: "#0F1216", minHeight: "100vh", color: INK,
               fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: "28px 20px 60px" };
const input = { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 10, color: INK, padding: "9px 11px", fontSize: 13.5, outline: "none" };
const btn = { background: ORANGE, color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" };
const ghost = { ...btn, background: "transparent", color: INK, border: "1.5px solid rgba(255,255,255,.18)" };
const th = { textAlign: "left", padding: "8px 10px", fontSize: 10.5, letterSpacing: ".06em",
             textTransform: "uppercase", color: "#8C7C73", borderBottom: "1px solid rgba(255,255,255,.08)",
             whiteSpace: "nowrap", position: "sticky", top: 0, background: "#0F1216" };
const td = { padding: "8px 10px", fontSize: 12.5, borderBottom: "1px solid rgba(255,255,255,.06)",
             verticalAlign: "top" };

/** Source labels, coloured by how much they are OURS to change. */
const SOURCE_COLOR = (s = "") =>
  s.startsWith("user setting") ? "#5CD98A"
  : s.startsWith("prompt_lines") ? "#7FB2FF"
  : s.startsWith("caller directory") ? "#E7B75A"
  : s.startsWith("owner's") ? "#C89BF5"
  : s === "the dial" ? "#FF9E6B"
  : MUTED;

function Chip({ text }) {
  return (
    <span style={{ fontSize: 10.5, color: SOURCE_COLOR(text), border: `1px solid ${SOURCE_COLOR(text)}33`,
                   background: `${SOURCE_COLOR(text)}12`, borderRadius: 999, padding: "2px 7px",
                   whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

/** Values run from "true" to a 900-character language directive — scroll inside the cell. */
function Val({ v }) {
  if (v === undefined) return <span style={{ color: FAINT }}>— not sent —</span>;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s === "") return <span style={{ color: FAINT }}>(empty)</span>;
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 150, overflow: "auto",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12,
                  lineHeight: 1.5 }}>
      {s}
    </div>
  );
}

function Field({ k, v }) {
  const empty = v === null || v === undefined || v === "";
  return (
    <div style={{ minWidth: 150 }}>
      <div style={{ color: MUTED, fontSize: 11 }}>{k}</div>
      <div style={{ color: empty ? FAINT : INK, fontSize: 14, fontWeight: 600, marginTop: 2,
                    wordBreak: "break-word" }}>
        {empty ? "not set" : typeof v === "boolean" ? (v ? "yes" : "no")
          : typeof v === "object" ? JSON.stringify(v) : String(v)}
      </div>
    </div>
  );
}

const copy = (obj) => { try { navigator.clipboard.writeText(JSON.stringify(obj, null, 2)); } catch {} };

export default function VariablesPage() {
  // ── the user half
  const [owner, setOwner] = useState("");
  const [caller, setCaller] = useState("");
  const [task, setTask] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [diffOnly, setDiffOnly] = useState(false);

  // ── the generator half
  const [gl, setGl] = useState("");
  const [gVoice, setGVoice] = useState("female");
  const [gOwner, setGOwner] = useState("male");
  const [gSecond, setGSecond] = useState("");
  const [gUse, setGUse] = useState("screening");
  const [gName, setGName] = useState("Rishabh");
  const [lines, setLines] = useState(null);
  const [lbusy, setLbusy] = useState(false);
  const [lerr, setLerr] = useState("");

  // ── the prompt half. Same two modes as everything else on this page: a real owner if one is
  // typed above, otherwise the synthetic knobs from the generator below.
  const [prompt, setPrompt] = useState(null);
  const [pbusy, setPbusy] = useState(false);
  const [perr, setPerr] = useState("");

  const loadPrompt = async (useOwner) => {
    setPbusy(true); setPerr(""); setPrompt(null);
    try {
      const qs = new URLSearchParams({ view: "prompt", direction: "both" });
      if (useOwner && owner.trim()) {
        qs.set("owner_number", owner.trim());
        if (caller.trim()) qs.set("caller_number", caller.trim());
        if (task.trim()) qs.set("task", task.trim());
      } else {
        qs.set("language", gl || "hindi");
        qs.set("assistant_gender", gVoice);
        qs.set("owner_gender", gOwner);
        qs.set("callee_name", gName);
        if (gSecond) qs.set("secondary_language", gSecond);
        if (task.trim()) qs.set("task", task.trim());
      }
      const r = await fetch(`/api/admin/variables?${qs}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw new Error("Not signed in — open /admin and enter the admin password first.");
      if (!r.ok || !j.ok) throw new Error(j.error || j.detail || `apollo: ${r.status}`);
      setPrompt(j);
    } catch (e) { setPerr(String(e.message || e)); }
    setPbusy(false);
  };

  const loadUser = async () => {
    if (!owner.trim()) { setErr("Enter the user's phone number."); return; }
    setBusy(true); setErr(""); setData(null);
    try {
      const qs = new URLSearchParams({ view: "user", owner_number: owner.trim() });
      if (caller.trim()) qs.set("caller_number", caller.trim());
      if (task.trim()) qs.set("task", task.trim());
      const r = await fetch(`/api/admin/variables?${qs}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      // A bare 401 from the proxy means the admin cookie is missing, not that Apollo refused —
      // saying "401" sends whoever sees it to the wrong service.
      if (r.status === 401) throw new Error("Not signed in — open /admin and enter the admin password first.");
      if (!r.ok || !j.ok) throw new Error(j.error || j.detail || `apollo: ${r.status}`);
      setData(j);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  };

  const loadLines = async () => {
    setLbusy(true); setLerr(""); setLines(null);
    try {
      const qs = new URLSearchParams({ view: "lines", assistant_gender: gVoice, owner_gender: gOwner,
                                       use_case: gUse, callee_name: gName });
      if (gl) qs.set("language", gl);
      if (gSecond) qs.set("secondary_language", gSecond);
      const r = await fetch(`/api/admin/variables?${qs}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw new Error("Not signed in — open /admin and enter the admin password first.");
      if (!r.ok || !j.ok) throw new Error(j.error || j.detail || `apollo: ${r.status}`);
      setLines(j);
    } catch (e) { setLerr(String(e.message || e)); }
    setLbusy(false);
  };

  const inb = data?.inbound?.variables || {};
  const outb = data?.outbound?.variables || {};
  const keys = Array.from(new Set([...Object.keys(inb), ...Object.keys(outb)])).sort();
  const differs = (k) => JSON.stringify(inb[k]) !== JSON.stringify(outb[k]);
  const shown = diffOnly ? keys.filter(differs) : keys;
  const s = data?.settings || {};
  const v = data?.voice || {};

  return (
    <main style={page}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>Call variables</h1>
          <span style={{ color: MUTED, fontSize: 12.5 }}>
            everything the agent is told before it speaks — inbound and outbound, generated the way
            a real call generates it
          </span>
          <div style={{ flex: 1 }} />
          <a href="/admin" style={{ color: ORANGE, fontSize: 13, textDecoration: "none" }}>← overview</a>
        </div>

        {/* ── ONE USER ─────────────────────────────────────────────────────────────────── */}
        <div style={{ ...card, marginTop: 18, padding: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>A real user</div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
            Their number is enough. Add a caller to see what the screening agent would know about
            that specific number (their saved name, what the directory has learned); add an errand
            to see the outbound set as an “Ask Ring to call…” would send it.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <input style={{ ...input, minWidth: 190 }} placeholder="user's phone (+91…)"
                   value={owner} onChange={(e) => setOwner(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && loadUser()} />
            <input style={{ ...input, minWidth: 190 }} placeholder="caller / recipient (optional)"
                   value={caller} onChange={(e) => setCaller(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && loadUser()} />
            <input style={{ ...input, flex: 1, minWidth: 260 }} placeholder="the errand, for the outbound set (optional)"
                   value={task} onChange={(e) => setTask(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && loadUser()} />
            <button style={btn} onClick={loadUser} disabled={busy}>
              {busy ? "Generating…" : "Generate"}
            </button>
          </div>
          {err && <div style={{ color: "#FF7B72", fontSize: 13, marginTop: 12 }}>{err}</div>}
        </div>

        {data && (
          <>
            {/* WHAT THEY SET. The settings screen, read back from where calls actually read it. */}
            <div style={{ ...card, marginTop: 16, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                  {data.owner?.name || "Unnamed user"}
                </div>
                <span style={{ color: MUTED, fontSize: 12.5 }}>{data.owner?.number}</span>
                <span style={{ fontSize: 12, fontWeight: 700,
                               color: s.ring_on === false ? "#FF7B72" : s.ring_on ? "#5CD98A" : FAINT }}>
                  Ring {s.ring_on === null || s.ring_on === undefined ? "unknown" : s.ring_on ? "ON" : "OFF"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 14 }}>
                <Field k="Speaks" v={s.preferred_language} />
                <Field k="Also speaks" v={s.secondary_language} />
                <Field k="Voice gender (verbs follow this)" v={s.voice_gender} />
                <Field k="Their own gender" v={s.own_gender} />
                <Field k="Name spoken as" v={s.spoken_name} />
                <Field k="Carrier" v={s.carrier} />
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 16 }}>
                <Field k="Voice that answers" v={v.found ? (v.voice || v.voice_id) : null} />
                <Field k="Voice provider" v={v.provider} />
                <Field k="Their own clone" v={v.found ? Boolean(v.is_own_clone) : null} />
                <Field k="Selected (Pro)" v={v.found ? v.selected !== false : null} />
                <Field k="Muted categories" v={s.mute_categories} />
              </div>
              {(s.screening_templates || s.custom_screening_rule || s.composed_screening_instruction) && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ color: MUTED, fontSize: 11 }}>Screening rules the agent is given</div>
                  {s.screening_templates && (
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(s.screening_templates).map(([k, on]) => (
                        <span key={k} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 999,
                                               color: on ? "#5CD98A" : FAINT,
                                               border: `1px solid ${on ? "#5CD98A44" : "rgba(255,255,255,.12)"}` }}>
                          {k}{on ? "" : " · off"}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 12.5, color: INK, whiteSpace: "pre-wrap",
                                lineHeight: 1.5 }}>
                    {s.composed_screening_instruction || <span style={{ color: FAINT }}>none — the prompt keeps its default</span>}
                  </div>
                </div>
              )}
              {data.notes?.length > 0 && (
                <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 12 }}>
                  {data.notes.map((n, i) => (
                    <div key={i} style={{ color: "#E7B75A", fontSize: 12.5, marginBottom: 6 }}>⚠ {n}</div>
                  ))}
                </div>
              )}
              {data.settings?.profile_rows?.length > 1 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ color: MUTED, fontSize: 12, cursor: "pointer" }}>
                    {data.settings.profile_rows.length} profile rows for this number — newest wins per key
                  </summary>
                  <pre style={{ color: FAINT, fontSize: 11, overflow: "auto", maxHeight: 260 }}>
                    {JSON.stringify(data.settings.profile_rows, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* THE TWO SETS, side by side. Same key, two directions — the differences are the point. */}
            <div style={{ ...card, marginTop: 16, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                  Variables sent · {data.inbound?.count} inbound / {data.outbound?.count} outbound
                </div>
                <div style={{ flex: 1 }} />
                <button style={{ ...ghost, padding: "6px 12px", fontSize: 12,
                                 borderColor: diffOnly ? ORANGE : "rgba(255,255,255,.18)",
                                 color: diffOnly ? ORANGE : INK }}
                        onClick={() => setDiffOnly(!diffOnly)}>
                  {diffOnly ? "Showing differences" : "Only differences"}
                </button>
                <button style={{ ...ghost, padding: "6px 12px", fontSize: 12 }}
                        onClick={() => copy(inb)}>Copy inbound JSON</button>
                <button style={{ ...ghost, padding: "6px 12px", fontSize: 12 }}
                        onClick={() => copy(outb)}>Copy outbound JSON</button>
              </div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
                Inbound is a forwarded call Tring answered for them. Outbound is an errand Tring
                placed for them — recipient <b>{data.other_party?.number}</b>
                {data.other_party?.placeholder ? " (stand-in)" : ""}, task “{data.task}”.
              </div>
              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 190 }}>Variable</th>
                      <th style={{ ...th, width: 170 }}>Comes from</th>
                      <th style={th}>Inbound · screening</th>
                      <th style={th}>Outbound · errand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((k) => (
                      <tr key={k} style={differs(k) ? { background: "rgba(244,83,46,.05)" } : undefined}>
                        <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12,
                                     color: "#fff", whiteSpace: "nowrap" }}>
                          {k}
                        </td>
                        <td style={td}><Chip text={data.sources?.[k] || "—"} /></td>
                        <td style={td}><Val v={inb[k]} /></td>
                        <td style={td}><Val v={outb[k]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── THE PROMPT ITSELF ────────────────────────────────────────────────────────── */}
        <div style={{ ...card, marginTop: 22, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>The prompt the agent reads</div>
            <div style={{ flex: 1 }} />
            <button style={{ ...ghost, padding: "8px 14px", fontSize: 12.5 }}
                    onClick={() => loadPrompt(true)} disabled={pbusy}>
              {pbusy ? "Rendering…" : owner.trim() ? "Render for this user" : "Render (synthetic)"}
            </button>
          </div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
            Template plus variables, substituted exactly the way the call substitutes them. Type a
            user above to render theirs; leave it empty and the generator’s knobs below supply a
            synthetic one, which is how you review a prompt change before anyone has it. Three
            things are otherwise invisible and are called out here: slots that render <b>empty</b>,
            variables sent with <b>no slot</b> to land in — resolved, delivered, silently discarded —
            and whether substitution <b>raises at all</b>, which ships every placeholder literal.
          </div>
          {perr && <div style={{ color: "#FF7B72", fontSize: 13, marginTop: 12 }}>{perr}</div>}

          {prompt?.results?.map((res) => {
            const broken = !res.substitution_ok;
            return (
              <div key={res.direction} style={{ ...card, marginTop: 14, padding: 14,
                                                borderColor: broken ? "rgba(255,123,114,.5)" : undefined }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    {res.direction === "inbound" ? "Inbound · screening" : "Outbound · errand"}
                  </div>
                  <span style={{ color: MUTED, fontSize: 11.5 }}>
                    {res.template?.source || "no template"} · {res.chars} chars ·
                    {" "}{res.filled_slots?.length || 0}/{res.slots?.length || 0} slots filled
                  </span>
                  <div style={{ flex: 1 }} />
                  <button style={{ ...ghost, padding: "5px 10px", fontSize: 11.5 }}
                          onClick={() => copy(res.rendered)}>Copy prompt</button>
                </div>

                {res.warnings?.map((w, i) => (
                  <div key={i} style={{ marginTop: 8, fontSize: 12.5,
                                        color: w.startsWith("SUBSTITUTION") ? "#FF7B72" : "#E7B75A" }}>
                    {w.startsWith("SUBSTITUTION") ? "✗" : "⚠"} {w}
                  </div>
                ))}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {(res.slots || []).map((k) => {
                    const empty = (res.empty_slots || []).includes(k);
                    return (
                      <span key={k} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999,
                                             fontFamily: "ui-monospace, Menlo, monospace",
                                             color: empty ? FAINT : "#5CD98A",
                                             border: `1px solid ${empty ? "rgba(255,255,255,.12)" : "#5CD98A44"}` }}>
                        {"{" + k + "}"}{empty ? " · empty" : ""}
                      </span>
                    );
                  })}
                </div>

                <pre style={{ marginTop: 12, maxHeight: 520, overflow: "auto", background: "rgba(0,0,0,.28)",
                              border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: 14,
                              fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word",
                              color: broken ? "#FF9E8F" : INK }}>
                  {res.rendered || "(nothing to render)"}
                </pre>
              </div>
            );
          })}
        </div>

        {/* ── THE MATRIX ───────────────────────────────────────────────────────────────── */}
        <div style={{ ...card, marginTop: 22, padding: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>The generator · no user needed</div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
            The six lines Apollo resolves in Python before every call. They exist because the call
            model cannot branch gendered verbs across twelve languages on its own — which also means
            the only way to review them is to render them. Leave the language on <b>All</b> to read
            the whole matrix at once.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <select style={input} value={gl} onChange={(e) => setGl(e.target.value)}>
              <option value="">All languages</option>
              {Object.entries(lines?.options?.languages || {
                hindi: "Hindi", urdu: "Urdu", punjabi: "Punjabi", marathi: "Marathi",
                gujarati: "Gujarati", bengali: "Bengali", tamil: "Tamil", telugu: "Telugu",
                kannada: "Kannada", malayalam: "Malayalam", odia: "Odia", english: "English",
              }).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select style={input} value={gVoice} onChange={(e) => setGVoice(e.target.value)}>
              <option value="female">Voice: female</option>
              <option value="male">Voice: male</option>
              <option value="">Voice: unknown</option>
            </select>
            <select style={input} value={gOwner} onChange={(e) => setGOwner(e.target.value)}>
              <option value="male">Owner: male</option>
              <option value="female">Owner: female</option>
              <option value="">Owner: unknown</option>
            </select>
            <select style={input} value={gSecond} onChange={(e) => setGSecond(e.target.value)}>
              <option value="">No second language</option>
              {["hindi", "english", "punjabi", "marathi", "gujarati", "bengali", "tamil", "telugu",
                "kannada", "malayalam", "odia", "urdu"].map((l) =>
                <option key={l} value={l}>Also speaks {l}</option>)}
            </select>
            <select style={input} value={gUse} onChange={(e) => setGUse(e.target.value)}>
              <option value="screening">Inbound · screening</option>
              <option value="outbound">Outbound · errand</option>
            </select>
            <input style={{ ...input, width: 150 }} value={gName} placeholder="owner's name"
                   onChange={(e) => setGName(e.target.value)} />
            <button style={btn} onClick={loadLines} disabled={lbusy}>
              {lbusy ? "Resolving…" : "Show the lines"}
            </button>
            <button style={ghost} onClick={() => loadPrompt(false)} disabled={pbusy}>
              {pbusy ? "Rendering…" : "…and the full prompt"}
            </button>
          </div>
          {lerr && <div style={{ color: "#FF7B72", fontSize: 13, marginTop: 12 }}>{lerr}</div>}

          {lines?.results?.map((row) => (
            <div key={row.language} style={{ ...card, marginTop: 14, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{row.language_name}</div>
              {["intro_line", "gender_line", "owner_line", "language_line", "use_case_line"].map((k) => (
                <div key={k} style={{ marginTop: 10 }}>
                  <div style={{ color: MUTED, fontSize: 11, fontFamily: "ui-monospace, Menlo, monospace" }}>
                    {"{" + k + "}"}
                  </div>
                  <div style={{ fontSize: k === "intro_line" ? 16 : 12.5, color: INK, marginTop: 3,
                                lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {row.lines?.[k] || <span style={{ color: FAINT }}>(empty)</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
