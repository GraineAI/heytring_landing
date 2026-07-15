# Tring — landing page

Marketing + store-verification landing page for **Tring**, a personal AI phone assistant
(the assistant is named **Ring**). Built with **Next.js 14 (App Router)**, no CSS
framework — just a hand-written design system in `app/globals.css`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```
buld it 
Build for production:

```bash
npm run build
npm start
```

> The first `npm install` / `npm run build` needs internet access, because Google Fonts
> (Bricolage Grotesque, Hanken Grotesk, JetBrains Mono) are fetched at build time via
> `next/font`.

## Structure

```
app/
  layout.js            fonts + SEO metadata
  page.js              the landing page (composes the sections below)
  globals.css          the whole design system
  icon.svg             favicon
  robots.js  sitemap.js
  privacy/page.js      full Privacy Policy
  terms/page.js        full Terms of Service
  components/
    Nav, Hero, Strip, VoiceClone, HowItWorks, AskRing,
    Handles, Trust, Faq, FinalCta, Footer, StoreButtons, Icons, LegalHeader
```

## Before you go live — fill these in

1. **Store links** — `app/components/StoreButtons.js` → `PLAY_URL` and `APP_STORE_URL`.
   Placeholders are in there now.
2. **Domain / email** — already set to `heytring.com` and `customer@heytring.com`
   throughout (site, footer, privacy, terms, sitemap, robots, metadata).
3. **OG image** — add `app/opengraph-image.png` (1200×630) for nice link previews.

## For Play Store / App Store review

This page is written to satisfy app-listing review requirements:

- Plain, accurate description of what the app does (no overclaiming).
- **Voice cloning is described truthfully:** instant zero-shot cloning, only your own
  voice, nothing is ever trained on your voice or call audio — matching the Privacy
  Policy and Terms.
- Clear **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`), linked from
  the footer and the privacy section.
- **Call-recording notice**, data-handling transparency, **18+** requirement, and
  **support contact** (`customer@heytring.com`) all present.
- Company identity (Mavrix AI Private Limited, CIN, registered address) in the footer and
  legal pages.

Host the Privacy Policy at `https://heytring.com/privacy` and Terms at
`https://heytring.com/terms` — those are the URLs referenced in the documents and the
ones to paste into your store consoles.
