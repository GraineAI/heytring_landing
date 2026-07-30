"use client";

/**
 * BetaModal — Tring is in closed testing: instead of dead store links,
 * every "get the app" button opens this invite form (name, email,
 * device). Submissions land in Postgres via /api/waitlist together with
 * where the visitor came from (referrer + UTM), and fire a Vercel
 * Analytics event.
 *
 * Any element with [data-beta="android"|"ios"] opens it (delegated), so
 * server components can trigger it with plain markup.
 */
import { useEffect, useRef, useState } from "react";
import { Ring } from "./Mascot";
import { Android, Apple } from "./Icons";
import { track } from "./analytics";

export default function BetaModal() {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState("android");
  const [placement, setPlacement] = useState("page");
  const [phase, setPhase] = useState("form"); // form | sending | done | error
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const attrib = useRef({ source: "", utm: null });

  useEffect(() => {
    // First-touch attribution, persisted: captured on the very first visit
    // and kept in localStorage so it survives reloads, in-app browsers that
    // strip the referrer, and query params lost along the way.
    try {
      const p = new URLSearchParams(window.location.search);
      const utm = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"]) {
        if (p.get(k)) utm[k] = p.get(k).slice(0, 120);
      }
      // in-app browsers strip the referrer but sign the user agent —
      // detect the app so the source is still known automatically
      const ua = navigator.userAgent;
      const appSource =
        /LinkedInApp/i.test(ua) ? "app:linkedin" :
        /Instagram/i.test(ua) ? "app:instagram" :
        /FB_IAB|FBAV|FBAN/i.test(ua) ? "app:facebook" :
        /Twitter/i.test(ua) ? "app:twitter" :
        /Snapchat/i.test(ua) ? "app:snapchat" : null;
      const fresh = {
        source: document.referrer.slice(0, 300) || appSource,
        utm: Object.keys(utm).length ? utm : null,
        landing: window.location.href.slice(0, 400),
      };
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem("tring_attrib") || "null"); } catch (_) {}
      // first touch wins; later visits only fill gaps
      const merged = stored
        ? { ...fresh, ...stored, utm: stored.utm || fresh.utm, source: stored.source || fresh.source }
        : fresh;
      attrib.current = merged;
      try { localStorage.setItem("tring_attrib", JSON.stringify(merged)); } catch (_) {}
    } catch (_) {}

    const onClick = (e) => {
      const t = e.target.closest("[data-beta]");
      if (!t) return;
      e.preventDefault();
      setDevice(t.getAttribute("data-beta") === "ios" ? "ios" : "android");
      setPlacement(t.getAttribute("data-beta-placement") || "page");
      setPhase("form");
      setOpen(true);
      track("beta_open", { placement: t.getAttribute("data-beta-placement") || "page" });
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (phase === "sending") return;
    setPhase("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, device, placement,
          source: attrib.current.source,
          utm: attrib.current.utm,
          landing: attrib.current.landing,
        }),
      });
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      setPhase(data.already ? "exists" : "done");
      if (!data.already) track("waitlist_submit", { device, placement });
    } catch (_) {
      setPhase("error");
    }
  };

  if (!open) return null;

  return (
    <div className="bmodal" role="dialog" aria-modal="true" aria-label="Get a Tring beta invite">
      <div className="bmodal__veil" onClick={() => setOpen(false)} />
      <div className="bmodal__card">
        <button className="bmodal__x" onClick={() => setOpen(false)} aria-label="Close">✕</button>

        {phase === "done" || phase === "exists" ? (
          <div className="bmodal__done">
            <Ring size={92} state="happy" />
            <h3>{phase === "exists" ? "You're already on the list!" : "You're on the list!"}</h3>
            {device === "ios" ? (
              <>
                <p>
                  Your TestFlight invite is ready — install Tring right now:
                </p>
                <a className="btn btn--coral" href="/go/ios?p=post-signup"
                  target="_blank" rel="noreferrer">
                   Join the TestFlight beta
                </a>
                <p className="bm-note">
                  Install the TestFlight app first if you don&rsquo;t have it.
                </p>
              </>
            ) : (
              <>
                <p>
                  We&rsquo;re adding <b>{email || "your email"}</b> to the Google
                  Play tester list. Once you get our confirmation, install from:
                </p>
                <a className="btn btn--coral" href="/go/play?p=post-signup"
                  target="_blank" rel="noreferrer">
                  Open the Play beta
                </a>
                <p className="bm-note">
                  The link works after your email is approved — usually within a day.
                </p>
              </>
            )}
            <button className="bm-close2" onClick={() => setOpen(false)}>Close</button>
          </div>
        ) : (
          <>
            <span className="bmodal__tag"><i className="dot" /> Closed beta</span>
            <h3>Get your Tring invite</h3>
            <p className="bmodal__sub">
              Tring is invite-only right now. Tell us where to reach you and
              we&rsquo;ll onboard you personally.
            </p>

            <form onSubmit={submit}>
              <div className="bmodal__devices">
                <button type="button"
                  className={`bm-dev${device === "android" ? " is-on" : ""}`}
                  onClick={() => setDevice("android")}>
                  <Android width={18} height={18} /> Android
                </button>
                <button type="button"
                  className={`bm-dev${device === "ios" ? " is-on" : ""}`}
                  onClick={() => setDevice("ios")}>
                  <Apple width={18} height={18} /> iPhone
                </button>
              </div>

              <input
                className="bm-in" type="text" placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)}
                required minLength={2} maxLength={80} autoFocus
              />
              <input
                className="bm-in" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required maxLength={160}
              />

              {phase === "error" && (
                <p className="bm-err">That didn&rsquo;t go through — mind trying again?</p>
              )}

              <button className="btn btn--coral bm-go" type="submit" disabled={phase === "sending"}>
                {phase === "sending" ? "Sending…" : "Get my invite"}
              </button>
            </form>

            <p className="bmodal__foot">
              Already invited?{" "}
              <a href="/go/play?p=modal">Google Play</a> ·{" "}
              <a href="/go/ios?p=modal">App Store</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
