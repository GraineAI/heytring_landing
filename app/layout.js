import { Figtree, JetBrains_Mono } from "next/font/google";
import SiteAnalytics from "./components/SiteAnalytics";
import SupportChat from "./components/SupportChat";
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
  title: "Tring — the AI that answers the calls you'd rather skip",
  description:
    "Tring is a personal AI phone assistant for India. Ring answers spam, deliveries and vendor calls in their language, hands you a note, and can even answer in your own voice. Free. 18+.",
  keywords: [
    "AI call assistant",
    "AI phone assistant India",
    "call screening app",
    "voice cloning call assistant",
    "spam call blocker",
    "Ring assistant",
    "Tring",
  ],
  authors: [{ name: "Mavrix AI Private Limited" }],
  openGraph: {
    title: "Tring — don't pick up, don't dial, Tring.",
    description:
      "Ring answers the calls you'd rather skip and hands you a note — in your own voice if you want. Free personal AI phone assistant for India.",
    url: SITE,
    siteName: "Tring",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tring — the AI that answers your calls",
    description:
      "Ring screens spam, deliveries and vendors, and answers in your own voice. Free. Made for India.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE },
};

export const viewport = {
  // The page canvas, so the browser chrome meets the page instead of sitting
  // on top of it as a coral bar.
  themeColor: "#E8E6E3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    // font vars live on <html> so :root-level tokens can reference them
    <html lang="en" className={`${figtree.variable} ${mono.variable}`}>
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
        <SupportChat />
      </body>
    </html>
  );
}
