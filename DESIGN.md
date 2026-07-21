# Tring landing — redesign spec
### "Calm confidence" · Swish's restraint × Equal AI's storytelling × Tring's warmth

Based on a full teardown of **justswish.in** (preloader mechanics decompiled from their
Framer code component) and **myequal.ai** (every page crawled, phone Lottie decompiled).

---

## What the references actually teach

**Swish** feels premium because it does almost nothing:
- One accent color, one grey, huge whitespace, 20px body text doing headline duty.
- Exactly **one theatrical moment** — the preloader — and one motion vocabulary
  (fade + 20px rise, 0.4s) reused everywhere. No parallax, no scroll-jacking, no marquees.
- Floating glass nav pill, video behind a facade at radius 32, footer with a giant wordmark.

**Equal AI** sells an invisible product with exactly two assets:
- A cinematic hero (their case: bg video) with a short national-pride headline and
  one-line social proof ("Trusted by 300K+ Indians 🇮🇳").
- A **6.75s self-playing phone animation** on a flat full-bleed brand-green section:
  incoming call from "Swiggy Ramesh" (3D scooter avatar) → AI answers → live card with
  quick-reply chips ("Leave it at the gate", "Give it to watchman") → done.
  It plays once on load — NOT scroll-scrubbed. It's a product demo, not decoration.
- Hard section rhythm: black cinema → flat brand green → white footer. Three moods, one scroll.
- OS-aware store buttons; human details (named callers, real support phone number).

**The lesson for Tring:** our current page has ~9 animated set-pieces. The redesign keeps
**two**: the loader (Swish's move) and the phone story (Equal's move). Everything else is
still, warm, and readable.

---

## 1. Loading screen (Swish's "Logo Reveal", in Tring coral)

Full-viewport overlay, **server-rendered** so the branded screen is the literal first paint
(zero white flash). Homepage only.

1. **0.0s** — coral gradient `135deg, #F0472A → #FF5C39`. Centered: the white **Tring**
   wordmark (phone glyph + "Tring") at 20% opacity — the "ghost".
2. **0.0–1.0s** — an identical full-opacity wordmark stacked on top fills **left → right**
   via `clip-path: inset(0% 100% 0% 0%) → inset(0% 0% 0% 0%)`,
   ease `cubic-bezier(0.65, 0.01, 0.05, 0.99)` (Swish's exact custom ease).
3. **1.0–2.0s** — gradient fades out (0.5s) **while** the logo layer slides up
   `yPercent: -101` (1s) — curtain-up reveal of the hero already underneath.
4. Overlay → `display:none`. Total ~2.0s, fixed (theatrical, not a real progress bar).
5. `role="status" aria-busy`, pointer-events released at exit start,
   `prefers-reduced-motion` → skip entirely.

## 2. Page structure (7 sections, down from 12)

| # | Section | Mood | Content |
|---|---------|------|---------|
| 0 | Preloader | coral | logo fill → curtain up |
| 1 | **Nav** — floating glass pill | glass | fixed `top:22px`, radius 20, blur(10px) white 85%; logo · How it works · Your voice · Privacy · coral **Get Tring** pill |
| 2 | **Hero** — cream, centered, still | cream | H1 "Don't pick up. Don't dial. **Tring.**" (clamp 44→84px) · one subline · store buttons · "Free · English + Hindi · Made for India 🇮🇳" |
| 3 | **Phone story** — full-bleed coral | coral | Equal's signature adapted: left text "Ring answers your unknown calls", right a phone playing the 8s Tring story (below). Mobile: stacked, phone below |
| 4 | **Video** — "Watch Ring take a call" | white | facade player radius 32, poster + glass play pill; plays `/demo.mp4` (or YouTube id when provided); store buttons beneath |
| 5 | **How it works + voice** | white→dark | 3 plain steps (existing copy); then the dark "answers in *your* voice" panel kept as the one dark moment |
| 6 | **FAQ** — existing accordions, restyled minimal | white | 8 existing Q&As |
| 7 | **Final CTA + footer** | coral→ink | short CTA panel; footer ends with a **giant "Tring" wordmark** (Swish move) |

Cut entirely: RollingText, Journey path, draggable Slider, FlairVortex, MorphSteps,
Particles, floating hero chips, Handles grid (its best copy folds into the phone story
and steps), Trust grid (privacy collapses to one honest paragraph + link).

## 3. The Tring phone story (Equal's Lottie, rebuilt for Ring)

A self-playing **~8s GSAP timeline** inside a CSS phone (no Lottie file needed — our UI
is code). Plays once when the section enters the viewport, then gently loops after a
6s rest. Scenes:

1. **Incoming call** — "Blinkit · Ramesh 🛵 +91 98••• ••455" slides down, phone buzzes,
   red/green circles pulse.
2. **Ring picks up** — the Ring mascot (existing SVG, `state="talking"`) pops in with
   sonar rings; label "Ring answered — in your voice".
3. **Live conversation card** rises: caller line "Sir, gate code?" then quick-reply chips
   — "Leave it at the gate", "Give it to the watchman", "I'm coming down" — one chip
   taps itself.
4. **Wrap-up note** — green tick card: "Delivery · left at the gate. Nothing needs you."

Personas and chip copy stay hyper-local and human (the whole reason Equal's animation
works). Reduced motion: final scene rendered statically.

## 4. Design tokens (ours, tightened)

- **Surfaces:** cream `#FBF3EC` page · white cards · coral `#F0472A` brand sections ·
  ink `#17100E` dark moments. Mint-tint `#E7F6EF` only inside the phone UI for "done".
- **Accent discipline (Equal's two-tier rule):** coral `#F0472A` = surfaces & CTAs;
  hot coral `#FF5C39` = hover only; peach `#FBD5C4` = tints inside product UI only.
- **Type:** Plus Jakarta Sans display (800, -0.035em) + Inter body. Body 18–20px,
  section titles clamp(34→56px). Fewer sizes than today.
- **Radii:** 10 (buttons) · 20 (nav pill, cards) · 32 (video, phone section blocks) ·
  999 (pills). **Motion:** one vocabulary — `opacity 0 → 1, y 20 → 0, 0.45s,
  ease [0.12, 0.23, 0.19, 1]` (Swish's curve) on scroll entry. Nothing else moves.
- **Buttons:** coral pill with dark-on-light store buttons; OS-aware (Equal): mobile
  shows only your platform's store button, desktop shows both.

## 5. Voice & humanity

Short declarative sentences, named people, real-life phrasing: "The Blinkit guy calls.
Ring tells him the gate code." Hindi line in the voice section stays. Flag emoji in the
trust line, real support email in the footer. No feature-matrix language anywhere.
