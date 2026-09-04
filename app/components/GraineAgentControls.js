"use client";

import { useEffect } from "react";

/**
 * What the Graine agent is allowed to DO on this page, and what it can see.
 *
 * The widget itself is an iframe and cannot touch this document — that
 * isolation is why its styling survives contact with our CSS. This file is the
 * deliberate, narrow channel back: every capability below is a function WE
 * wrote, registered by name. The agent can invoke those names and nothing else,
 * so the blast radius is exactly this file.
 *
 * Why bother, when the widget can already answer questions: a visitor who asks
 * "is my data recorded?" and is told to "scroll down to the FAQ" has been given
 * homework. An agent that opens the answer for them has actually helped, and it
 * is the difference between a support widget and a guide.
 */

/** Sections the agent may scroll to. An allowlist, not a DOM query. */
const SECTIONS = {
  top: "The top of the page",
  story: "Why Tring exists",
  video: "The demo video",
  how: "How it works",
  app: "What the app does",
  languages: "Languages supported",
  voice: "Voice cloning",
  reviews: "What users say",
  faq: "Frequently asked questions",
};

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

/** The store this visitor can actually install from, matching useStoreLink. */
function storeFor() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  return {
    // Routed through /go/* so the click is logged with its placement — the
    // admin funnel's store-click step counts these, and an agent-driven install
    // is only worth anything if we can see that it happened.
    href: `/go/${isIos ? "ios" : "play"}?p=agent`,
    store: isIos ? "TestFlight" : "Google Play",
  };
}

/** Which section fills most of the viewport right now. */
function visibleSection() {
  let best = null;
  let bestArea = 0;
  for (const id of Object.keys(SECTIONS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    if (area > bestArea) { bestArea = area; best = id; }
  }
  return best;
}

export default function GraineAgentControls() {
  useEffect(() => {
    let stopped = false;
    let tries = 0;

    // next/script gives no ordering guarantee, so wait for the loader rather
    // than assuming it ran. Give up after ~10s: no controls is a far better
    // outcome than a timer spinning for the life of the page.
    (function boot() {
      if (stopped) return;
      const G = window.GraineAgent;
      if (!G || typeof G.defineAction !== "function") {
        if (++tries > 100) return;
        setTimeout(boot, 100);
        return;
      }

      G.defineAction("scroll_to_section", ({ section }) => {
        if (!SECTIONS[section]) {
          return { status: "refused", message: `No such section. Available: ${Object.keys(SECTIONS).join(", ")}.` };
        }
        if (!scrollToId(section)) return { status: "refused", message: "That section is not on this page." };
        return { status: "ok", data: { section }, message: `Scrolled to ${SECTIONS[section]}.` };
      });

      G.defineAction("open_faq", ({ question }) => {
        const buttons = Array.from(document.querySelectorAll("#faq .qa button, #faq .qa [role='button']"));
        if (!buttons.length) return { status: "refused", message: "The FAQ is not on this page." };

        const wanted = String(question || "").toLowerCase();
        // Word overlap rather than exact match: the agent phrases the question
        // the way the visitor asked it, never the way we wrote it.
        const scored = buttons.map((b) => {
          const text = (b.textContent || "").toLowerCase();
          const hits = wanted.split(/\W+/).filter((w) => w.length > 3 && text.includes(w)).length;
          return { b, text, hits };
        }).sort((x, y) => y.hits - x.hits);

        if (!scored[0] || scored[0].hits === 0) {
          return { status: "refused", message: `No FAQ matches that. We answer: ${scored.map((s) => s.text.trim()).join(" | ")}` };
        }
        scrollToId("faq");
        scored[0].b.click();
        return { status: "ok", data: { opened: scored[0].text.trim() }, message: "Opened that answer on screen." };
      });

      G.defineAction("download_app", () => {
        const { href, store } = storeFor();
        // A real navigation, not window.open — a popup from inside an iframe
        // callback is exactly what popup blockers exist to stop.
        window.location.href = href;
        return { status: "ok", data: { store }, message: `Opening ${store}.` };
      });

      G.defineAction("highlight", ({ section }) => {
        const el = SECTIONS[section] ? document.getElementById(section) : null;
        if (!el) return { status: "refused", message: "Nothing to highlight there." };
        scrollToId(section);
        const previous = el.style.outline;
        el.style.outline = "3px solid #3FC98C";
        el.style.outlineOffset = "6px";
        setTimeout(() => { el.style.outline = previous; el.style.outlineOffset = ""; }, 2400);
        return { status: "ok", message: "Highlighted it." };
      });

      // ── What the agent can see ──────────────────────────────────────────
      const report = () => {
        const section = visibleSection();
        const { store } = storeFor();
        G.setScreen({
          screen: section || "top",
          title: SECTIONS[section] || "Tring",
          data: {
            page: window.location.pathname,
            store,
            // So it can say "scroll up" or "there's more below" correctly.
            scrolled_pct: Math.round(
              (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100
            ),
          },
        });
      };

      report();
      // Passive + coalesced by the loader, so this cannot become jank on a page
      // that already runs smooth-scrolling.
      window.addEventListener("scroll", report, { passive: true });
      G.__tringCleanup = () => window.removeEventListener("scroll", report);
    })();

    return () => {
      stopped = true;
      try { window.GraineAgent?.__tringCleanup?.(); } catch { /* nothing to clean */ }
    };
  }, []);

  return null;
}
