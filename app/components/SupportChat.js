"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * The Graine voice agent, embedded as Tring's support widget.
 *
 * This replaces the Freshchat bubble rather than sitting beside it: both are
 * configured bottom-right, so running the two together would stack a launcher
 * on top of a launcher. It is also the more honest support channel for this
 * product — a page selling an AI that answers your calls should be answered by
 * one.
 *
 * /share/<token> is excluded, same reasoning as SiteAnalytics: that URL is not
 * an identifier, it is the credential apollo spends 256 bits of entropy on, and
 * any third-party widget reports location.href to its vendor on load. Rendering
 * nothing there — rather than hiding the launcher — keeps the URL out of their
 * logs entirely.
 *
 * The publishable key below is public by design: Graine's own docs state it
 * identifies the agent and is not a password. It is safe in page source. What
 * it is NOT is an access control — per the same docs, the allowlist gates which
 * sites may load the agent's configuration, but does not yet gate the voice
 * socket, which will accept a connection from anyone holding the agent id.
 */

const AGENT_ID = "704dc590-38cb-4a1d-af51-6a4121c243f2";
const PUBLISHABLE_KEY = "pk_live_674cf36dfaecacb77b41ef84bf4fbb1e";

export default function SupportChat() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/share/")) return null;

  return (
    <>
      <Script
        id="graine-embed"
        src="https://www.graine.ai/embed/v1.js"
        strategy="afterInteractive"
      />
      <Script id="graine-agent" strategy="afterInteractive">
        {`
          (function () {
            // next/script does not guarantee ordering between two afterInteractive
            // tags, so poll for the loader rather than assuming it has run. Give up
            // after ~10s: a missing widget is a far better outcome than a timer
            // spinning for the life of the page.
            var tries = 0;
            (function boot() {
              if (window.GraineAgent && typeof window.GraineAgent.load === "function") {
                window.GraineAgent.load({
                  agentId: ${JSON.stringify(AGENT_ID)},
                  publishableKey: ${JSON.stringify(PUBLISHABLE_KEY)},
                });
                return;
              }
              if (++tries > 100) return;
              setTimeout(boot, 100);
            })();
          })();
        `}
      </Script>
    </>
  );
}
