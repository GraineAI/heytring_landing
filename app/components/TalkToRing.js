"use client";

/**
 * Talk to Ring — the live agent, on the page.
 *
 * SupportChat mounts the same agent as a floating launcher in the corner. That
 * is the right shape for support: present, out of the way, ignorable. It is the
 * wrong shape for a landing page selling an AI that answers your calls, where
 * the product itself is the strongest argument and hiding it behind a bubble
 * asks the visitor to go looking for it.
 *
 * So this is the same agent, embedded in the flow of the page, open by default.
 *
 * Both modes, in one panel:
 *   Call  — speak to it, with a LIVE TRANSCRIPT so you can see it heard you.
 *           On a noisy line or in a second language that is the difference
 *           between trusting it and hanging up, and it is the one thing a web
 *           call can offer that a phone call cannot.
 *   Chat  — type instead, and interactive components (quick actions, forms,
 *           calendars) render inline so you tap rather than type.
 *
 * The transcript is per session and never leaves the browser — no storage, no
 * upload. See app/embed/[agentId]/page.tsx in the dashboard repo.
 *
 * Renders NOTHING without a publishable key, so a deploy that has not been
 * configured omits the section rather than putting a broken panel on the front
 * page. Excluded from /share/<token> for the same reason as SiteAnalytics: that
 * URL is the credential, not an identifier.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const GRAINE = "https://www.graine.ai";
const PUBLISHABLE_KEY = "pk_live_674cf36dfaecacb77b41ef84bf4fbb1e";

/** Tring's coral, so the widget belongs to the page rather than visiting it. */
const ACCENT = "E8674A";

export default function TalkToRing() {
  const pathname = usePathname() || "";
  const [agentId, setAgentId] = useState(null);
  const [mode, setMode] = useState("voice");
  const [error, setError] = useState(null);
  const frameRef = useRef(null);

  const excluded = pathname.startsWith("/share/");

  // Resolve the agent from the publishable key. This is the same call the
  // embed loader makes, so if this section works the pasted snippet works.
  useEffect(() => {
    if (excluded) return;
    let cancelled = false;
    fetch(`${GRAINE}/api/embed/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishableKey: PUBLISHABLE_KEY }),
    })
      .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d?.error || "unavailable"); return d; }))
      .then((cfg) => { if (!cancelled) setAgentId(cfg.agentId); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [excluded]);

  /**
   * Mint connection tickets for the frame.
   *
   * Only THIS page can: /api/embed/ticket checks the request Origin against the
   * agent's allowed domains, and inside the iframe that Origin is graine.ai,
   * not heytring.com — so minting in there would 403 against our own config.
   */
  useEffect(() => {
    if (!agentId) return;
    const onMessage = (e) => {
      if (e.origin !== GRAINE) return;
      if (e.data?.type !== "graine:need-ticket") return;
      fetch(`${GRAINE}/api/embed/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishableKey: PUBLISHABLE_KEY }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((t) => {
          try {
            frameRef.current?.contentWindow?.postMessage(
              t ? { type: "graine:ticket", ticket: t.ticket, wsUrl: t.wsUrl }
                : { type: "graine:ticket", ticket: null },
              GRAINE
            );
          } catch {}
        });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [agentId]);

  if (excluded || !PUBLISHABLE_KEY) return null;

  const src = agentId
    ? `${GRAINE}/embed/${encodeURIComponent(agentId)}` +
      `?embed=1&pk=${encodeURIComponent(PUBLISHABLE_KEY)}` +
      `&mode=${mode}&start=${mode}&accent=${ACCENT}&radius=20` +
      `&name=${encodeURIComponent("Talk to Ring")}`
    : "about:blank";

  return (
    <section id="talk-to-ring" style={{ padding: "88px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.5, margin: 0 }}>
          Try it now
        </p>
        <h2 style={{ fontSize: "clamp(28px,4vw,40px)", margin: "8px 0 10px", letterSpacing: "-0.02em" }}>
          Talk to Ring
        </h2>
        <p style={{ opacity: 0.7, margin: "0 0 24px", lineHeight: 1.6 }}>
          A real agent, not a recording. Speak to it and watch the transcript, or type — no
          number, no signup.
        </p>

        {/* Mode switch. Reloads the frame, which ends any conversation in it —
            acceptable here because you are choosing how to start, not mid-call. */}
        <div
          role="tablist"
          style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(0,0,0,.06)", marginBottom: 20 }}
        >
          {[["voice", "Call it"], ["chat", "Chat instead"]].map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              style={{
                border: 0, cursor: "pointer", borderRadius: 999, padding: "8px 18px",
                fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                background: mode === m ? `#${ACCENT}` : "transparent",
                color: mode === m ? "#fff" : "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <p style={{ fontSize: 13, opacity: 0.6 }}>
            The assistant is unavailable right now.
          </p>
        ) : !agentId ? (
          <p style={{ fontSize: 13, opacity: 0.6, padding: "60px 0" }}>Waking Ring…</p>
        ) : (
          <iframe
            ref={frameRef}
            key={mode}
            src={src}
            title="Talk to Ring"
            allow="microphone"
            style={{
              display: "block", margin: "0 auto", width: "100%", maxWidth: 420,
              height: 620, border: 0, borderRadius: 20, background: "transparent",
            }}
          />
        )}

        <p style={{ fontSize: 12, opacity: 0.45, marginTop: 18 }}>
          Voice needs microphone permission. The transcript stays in your browser and is
          cleared when the call ends.
        </p>
      </div>
    </section>
  );
}
