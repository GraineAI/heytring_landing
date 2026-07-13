import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
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
  themeColor: "#2F6BFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
