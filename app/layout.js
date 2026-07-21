import { Figtree, JetBrains_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Swish's typeface: Figtree carries the whole site — headings and body —
// exactly as justswish.in does (one family, weight does the talking).
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
  themeColor: "#F0472A",
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
              then it renders nothing. Conversion events fire via components/analytics.js. */}
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID ? (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        ) : null}
      </body>
    </html>
  );
}
