"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * Freshchat web widget, with /share/<token> excluded — same reasoning as SiteAnalytics: the
 * share-page URL is a credential (apollo's 256-bit token), and a third-party widget script reports
 * location.href to its own vendor on load same as any analytics tag would. Rendering nothing there,
 * not just hiding the bubble, keeps that URL out of Freshchat's logs entirely.
 *
 * No JWT/user-authentication binding here on purpose: that requires signing tokens server-side
 * (apollo), which this repo doesn't have access to, and the dashboard shows it still in draft mode.
 * This is the plain, anonymous widget embed — every visitor can open the chat, nobody's identity is
 * asserted to Freshchat.
 */
export default function SupportChat() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/share/")) return null;

  return (
    // eslint-disable-next-line react/no-unknown-property -- `chat` is the vendor's own attribute,
    // read by their loader script; preserved verbatim from Freshchat's generated embed snippet.
    <Script id="freshchat-widget" strategy="afterInteractive" src="//in.fw-cdn.com/33021528/1785619.js" chat="true" />
  );
}
