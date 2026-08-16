import { Figtree, JetBrains_Mono } from "next/font/google";
import SiteAnalytics from "./components/SiteAnalytics";
import VisitBeacon from "./components/VisitBeacon";
import "./globals.css";

// One family, four weights. The redesign sheet is explicit that hierarchy
// comes from size and colour rather than weight, so 800/900 are not loaded —
// nothing can reach for them by accident, and every visitor stops paying for
// two faces where the design only ever asked for one.
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const SITE = "https://heytring.com";

export const metadata = {
  metadataBase: new URL(SITE),
  title: "Tring: AI Call Assistant — Answer Missed Calls, Block Spam",
  description:
    "Tring answers the calls you miss — in Hindi, Hinglish and Indian languages — and blocks spam before your phone rings. Caller ID, live transcripts, dual-SIM. Works on your existing SIM. Free.",
  keywords: [
    "AI call assistant",
    "AI phone assistant India",
    "call screening app",
    "spam call blocker",
    "missed call assistant",
    "caller ID app India",
    "AI call answering app",
    "Hindi AI assistant",
    "dual SIM call forwarding",
    "voice cloning call assistant",
    "Tring",
    "Tring app",
  ],
  applicationName: "Tring",
  category: "productivity",
  authors: [{ name: "Mavrix AI Private Limited" }],
  publisher: "Mavrix AI Private Limited",
  openGraph: {
    title: "Tring: AI Call Assistant — the calls you miss, answered for you",
    description:
      "Tring answers your missed calls in your language, blocks spam before it rings, and hands you a note. Ask it to schedule and make calls too. Free · Made for India.",
    url: SITE,
    siteName: "Tring",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tring: AI Call Assistant for India",
    description:
      "Answers the calls you miss in your language, blocks spam before it rings, shows caller ID. Works on your SIM. Free.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE },
};

export const viewport = {
  // One per scheme, so the browser chrome meets the page in both themes
  // instead of sitting on top of it as a pale bar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8E6E3" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    // font vars live on <html> so :root-level tokens can reference them
    <html lang="en" className={`${figtree.variable} ${mono.variable}`}>
      <head>
        {/* Runs before first paint. A React effect would set the theme AFTER
            the browser has already painted, which is one frame of white flash
            for every dark-mode visitor. Auto stores nothing and lets the CSS
            media query decide, so the page keeps following the device. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tring_theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
        {/* Structured data — lets Google show a rich app result (name, category, free, publisher).
            No aggregateRating: faking reviews violates Google's guidelines and we have none yet. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MobileApplication",
              name: "Tring: AI Call Assistant",
              operatingSystem: "ANDROID, IOS",
              applicationCategory: "UtilitiesApplication",
              url: SITE,
              description:
                "Tring answers the calls you miss — in Hindi, Hinglish and Indian languages — and blocks spam before your phone rings. Caller ID, live transcripts and dual-SIM support, on the SIM you already have.",
              inLanguage: ["en-IN", "hi-IN"],
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
              publisher: { "@id": SITE + "#org" },
              // Distinct @id so the app and its publisher are two linked nodes
              // rather than one blob — that link is what a crawler follows to
              // answer "who makes this".
              "@id": SITE + "#app",
            }),
          }}
        />
        {/* PUBLISHER IDENTITY, stated separately and explicitly.
            Assistants were attributing heytring.com to an unrelated company
            with a similar name that sells business voice agents. The app schema
            above named a publisher but nothing described that publisher, so
            there was no node to bind the site to. This is that node.
            `alternateName` catches the spellings people actually search. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": SITE + "#org",
              name: "Mavrix AI Private Limited",
              legalName: "Mavrix AI Private Limited",
              url: SITE,
              email: "customer@heytring.com",
              identifier: "U62099KA2025PTC210316",
              address: {
                "@type": "PostalAddress",
                streetAddress: "No. 8/3, Prince Ville, Challaghatta Village, Domlur",
                addressLocality: "Bangalore",
                addressRegion: "Karnataka",
                postalCode: "560071",
                addressCountry: "IN",
              },
              brand: {
                "@type": "Brand",
                name: "Tring",
                alternateName: ["HeyTring", "Tring app", "Ring by Tring"],
                url: SITE,
              },
            }),
          }}
        />
        {/* WebSite node, so the domain itself resolves to the same publisher. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": SITE + "#website",
              url: SITE,
              name: "Tring",
              alternateName: "HeyTring",
              inLanguage: "en-IN",
              publisher: { "@id": SITE + "#org" },
              about: { "@id": SITE + "#app" },
            }),
          }}
        />
      </head>
      <body>
        {children}
        {/* Traffic tracking, both rails:
            • Vercel Analytics — zero-config pageviews + custom events the moment this deploys.
            • GA4 — activates when NEXT_PUBLIC_GA_ID (G-XXXXXXXXXX) is set in Vercel env; until
              then it renders nothing. Conversion events fire via components/analytics.js.

            /share/<token> IS EXCLUDED FROM BOTH. The token in that URL is not an identifier, it
            is the CREDENTIAL — apollo spends 256 bits of entropy on it precisely so the space
            cannot be walked. Reporting the page URL to analytics hands a working link to a
            recording of somebody's private phone call to two third parties, alongside the
            visitor's IP and user agent, and leaves it sitting in dashboards and exports that
            outlive the link's own expiry. Revoking afterwards does not un-send it.
            beforeSend drops the event entirely rather than redacting, because a redacted URL
            still tells them a share was viewed and when. */}
        <SiteAnalytics />
        {/* Our OWN pageview record. GA4 and Vercel above cannot be joined to the waitlist table, so
            the conversion rate that decides what to build has to come from a visit row we store
            ourselves, keyed on the same anonymous id the signup and click writes use. */}
        <VisitBeacon />
        {/* Chat widget removed from the site. components/SupportChat.js is kept
            rather than deleted — it still holds the Graine agent config and the
            Freshchat fallback — so putting it back is one import and one line.
            It was unmounted because the Graine embed renders graine.ai's own
            marketing homepage inside the chat panel: /embed/<agentId> returns
            200 but serves the site's app shell, not the widget. */}
      </body>
    </html>
  );
}
