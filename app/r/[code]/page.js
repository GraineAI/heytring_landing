import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sql, ensureSchema } from "../../lib/db";
import { PLAY_URL, APP_STORE_URL } from "../../lib/links";

export const dynamic = "force-dynamic";

/**
 * /r/{code} — the referral link, as a PAGE rather than a redirect.
 *
 * It was a 302. WhatsApp, iMessage and every other chat app fetch a shared URL to build the preview
 * card, and a 302 to a store gives them nothing to read — so every shared Tring link appeared as a
 * bare grey URL. The preview IS the advert: it is the only thing the recipient sees before deciding
 * whether to tap, and we were shipping it blank.
 *
 * Crawlers get HTML with full Open Graph tags. Humans get sent straight to their store, which is
 * what they wanted from tapping it.
 */
const OG_IMAGE = "https://heytring.com/opengraph-image";

export async function generateMetadata({ params }) {
  const code = String(params?.code || "").toUpperCase();
  const title = "Tring answered a call for me";
  const description =
    "Tring picks up when you can't — in Hinglish, like a real person. It tells you who called and " +
    "why, and you can jump in mid-call. Install with this link and you both get a free month.";
  return {
    title,
    description,
    // Absolute URL required: relative OG images are silently dropped by most chat clients.
    openGraph: {
      title, description, url: `https://heytring.com/r/${code}`,
      siteName: "Tring", type: "website", locale: "en_IN",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
    // A referral link must never be indexed — it would attribute organic installs to one user.
    robots: { index: false, follow: false },
  };
}

/** Chat-app and social crawlers. They must receive HTML, never a redirect. */
function isCrawler(ua = "") {
  return /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|Googlebot|bingbot|Applebot|SkypeUriPreview|redditbot|vkShare|W3C_Validator/i
    .test(ua);
}

export default async function ReferralPage({ params }) {
  const raw = String(params?.code || "");
  // Short and alphanumeric. Anything else is someone poking at the URL and must not reach the DB.
  const code = /^[A-Za-z0-9]{4,16}$/.test(raw) ? raw.toUpperCase() : null;

  const h = await headers();
  const ua = h.get("user-agent") || "";
  const crawler = isCrawler(ua);

  // Log real taps only. Counting crawler fetches as clicks would inflate referral traffic by one
  // hit per person the link was forwarded to, whether or not anybody tapped it.
  if (!crawler) {
    try {
      await ensureSchema();
      await sql()`
        INSERT INTO clicks (kind, placement, referrer, user_agent, country)
        VALUES (${/iPhone|iPad|iPod/i.test(ua) ? "ios" : "play"},
                ${code ? `referral:${code}` : "referral:invalid"},
                ${h.get("referer") || null}, ${ua || null},
                ${h.get("x-vercel-ip-country") || null})
      `;
    } catch (e) {
      console.error("referral click log failed:", e?.message);
    }
    redirect(/iPhone|iPad|iPod/i.test(ua) ? APP_STORE_URL : PLAY_URL);
  }

  // Crawler: the metadata above is the payload. This body is a fallback for anything that renders
  // the HTML rather than reading the tags.
  return (
    <main style={{ padding: 40, fontFamily: "system-ui, sans-serif", background: "#1B1512", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Tring answered a call for me</h1>
      <p style={{ color: "#c9c2bd", maxWidth: 560, lineHeight: 1.5 }}>
        Tring picks up when you can&apos;t — in Hinglish, like a real person. It tells you who
        called and why, and you can jump in mid-call.
      </p>
      <p><a href={PLAY_URL} style={{ color: "#F4532E" }}>Get it on Google Play</a> · <a href={APP_STORE_URL} style={{ color: "#F4532E" }}>Download on the App Store</a></p>
    </main>
  );
}
