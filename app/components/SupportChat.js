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
 * The publishable key below is public by design: it identifies the agent and is
 * not a password, so it is safe in page source. The control that matters is the
 * domain allowlist, and that is enforced — an off-list Origin is refused 403 by
 * both /api/embed/session and /api/embed/ticket, verified above.
 *
 * The remaining gap is upstream of this file: the bare chat socket at
 * wss://ws.graine.ai/chat/v1/<agentId> is still reachable directly by anyone
 * holding the agent id, so the ticketed gateway bounds abuse rather than
 * preventing it. Nothing here can close that; it is a Graine-side change.
 */

const AGENT_ID = "fab5eff5-8d54-41cb-b7fa-ca375c3199ee";
const PUBLISHABLE_KEY = "pk_live_551fd5f11c73ae1d6476cd5c05adc247";

/**
 * Rollback switch. true = Graine agent, false = Freshchat.
 *
 * This was false because /embed/<agentId> served the graine.ai marketing page
 * inside the chat panel. The cause was a middleware bug on Graine's side:
 * publicRoutes there is an EXACT-match list, so a path with a dynamic segment
 * was never public and every session-less visitor — which is every visitor to
 * this site — was redirected to "/". That is fixed.
 *
 * Re-verified against production before flipping, all from an off-Graine origin:
 *
 *   /embed/<agentId>            200, serves the embed route, and none of the
 *                               /api/auth/verify, /api/admin/whoami,
 *                               /api/credits or /api/exchange-rate calls that
 *                               gave the dashboard bundle away last time
 *   /api/embed/session          200 with this agent's appearance, Origin
 *                               heytring.com
 *   /api/embed/ticket           issues a v1 ticket, so the authenticated
 *                               gateway path is live rather than falling back
 *   /api/embed/logo?k=…         200 image/png
 *   Origin: not-tring.example   403 "not on this agent's allowed list"
 *
 * Keep the switch. This is a live marketing page and the widget is a
 * third-party dependency; flipping one constant is a faster rollback than a
 * revert if Graine ever regresses again.
 */
const GRAINE_EMBED_READY = true;

export default function SupportChat() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/share/")) return null;

  if (!GRAINE_EMBED_READY) {
    return (
      // eslint-disable-next-line react/no-unknown-property -- `chat` is the vendor's
      // own attribute, read by their loader; verbatim from Freshchat's snippet.
      <Script id="freshchat-widget" strategy="afterInteractive" src="//in.fw-cdn.com/33021528/1785619.js" chat="true" />
    );
  }

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
