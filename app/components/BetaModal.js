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
      const dev = t.getAttribute("data-beta") === "ios" ? "ios" : "android";
      const plc = t.getAttribute("data-beta-placement") || "page";
      setPlacement(plc);
      // returning visitor? check their live status instead of re-asking
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem("tring_signup") || "null"); } catch (_) {}
      if (saved && saved.email) {
        setDevice(saved.device || dev);
        setEmail(saved.email);
        setName(saved.name || "");
        setPhase("checking");
        setOpen(true);
        fetch("/api/waitlist/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: saved.email, device: saved.device || dev }),
        })
          .then((r) => r.json())
          .then((d) => setPhase(d.found ? (d.approved ? "approved" : "pending") : "form"))
          .catch(() => setPhase("form"));
      } else {
        setDevice(dev);
        setPhase("form");
        setOpen(true);
      }
      track("beta_open", { placement: plc });
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const resetSignup = () => {
    try { localStorage.removeItem("tring_signup"); } catch (_) {}
    setName("");
    setEmail("");
    setPhase("form");
  };

  const recheck = () => {
    setPhase("checking");
    fetch("/api/waitlist/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, device }),
    })
      .then((r) => r.json())
      .then((d) => setPhase(d.found ? (d.approved ? "approved" : "pending") : "form"))
      .catch(() => setPhase("pending"));
  };

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
      // remember this signup so return visits show live status
      try { localStorage.setItem("tring_signup", JSON.stringify({ name, email, device })); } catch (_) {}
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

        {phase === "checking" ? (
          <div className="bmodal__done">
            <Ring size={92} state="idle" />
            <h3>One second…</h3>
            <p>Checking your invite status.</p>
          </div>
        ) : phase === "approved" ? (
          <div className="bmodal__done">
            <Ring size={92} state="happy" />
            <h3>You&rsquo;re approved! 🎉</h3>
            {device === "ios" ? (
              <>
                <p>Your TestFlight invite is live — install Tring now:</p>
                <a className="btn btn--coral" href="/go/ios?p=approved" target="_blank" rel="noreferrer">
                  Join the TestFlight beta
                </a>
                <p className="bm-note">Install the TestFlight app first if you don&rsquo;t have it.</p>
              </>
            ) : (
              <>
                <p>
                  <b>{email}</b> is on the Google Play tester list — install Tring now:
                </p>
                <a className="btn btn--coral" href="/go/play?p=approved" target="_blank" rel="noreferrer">
                  Open the Play beta
                </a>
                <p className="bm-note">Use the same Google account as this email on your phone.</p>
              </>
            )}
            <button className="bm-close2" onClick={resetSignup}>Not you? Use a different email</button>
          </div>
        ) : phase === "pending" ? (
          <div className="bmodal__done">
            <Ring size={92} state="idle" />
            <h3>You&rsquo;re on the list</h3>
            {device === "ios" ? (
              <>
                <p>No waiting needed on iPhone — your TestFlight invite works right away:</p>
                <a className="btn btn--coral" href="/go/ios?p=pending" target="_blank" rel="noreferrer">
                  Join the TestFlight beta
                </a>
              </>
            ) : (
              <>
                <p>
                  We&rsquo;re approving <b>{email}</b> for the Play beta — usually
                  within a day. Check back here, we&rsquo;ll unlock your link.
                </p>
                <button className="btn btn--coral" onClick={recheck}>Check again</button>
              </>
            )}
            <button className="bm-close2" onClick={resetSignup}>Not you? Use a different email</button>
          </div>
        ) : phase === "done" || phase === "exists" ? (
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
            <span className="bmodal__tag"><i className="dot" /> {device === "android" ? "Live on Android" : "iPhone · invite only"}</span>
            <h3>{device === "android" ? "Get Tring" : "Get your Tring invite"}</h3>
            <p className="bmodal__sub">
              {device === "android"
                ? "Tring is live on Google Play — install it and you're in. No invite, no waiting."
                : "iPhone is still TestFlight, which we approve by hand. Tell us where to reach you and we'll onboard you personally."}
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

              {/* Android needs nothing from us any more, so it asks for nothing.
                  Keeping the email form here would be collecting addresses for
                  a step that no longer exists. */}
              {device === "android" ? (
                <a className="btn btn--coral bm-go" href="/go/play?p=modal" style={{ justifyContent: "center" }}>
                  Install from Google Play
                </a>
              ) : (
                <>
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
                </>
              )}
            </form>

            <p className="bmodal__foot">
              On Android? <a href="/go/play?p=modal">Install now</a> ·{" "}
              Already have a TestFlight invite? <a href="/go/ios?p=modal">Open it</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
