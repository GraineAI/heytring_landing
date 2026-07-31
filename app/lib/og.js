// Shared pieces for the Open Graph link-preview cards.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const svgUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** The app mark — same artwork as app/icon.svg. */
export const LOGO_TILE = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="16" fill="#F4532E"/>
<g fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
<path d="M23 17 L27 18 L29.5 26 L25 29 A22 22 0 0 0 35 39 L38 34.5 L46 37 L47 41 C47 43.5 45 45.5 42.5 45.5 A31 31 0 0 1 18.5 21.5 C18.5 19 20.5 17 23 17 Z"/>
</g>
<g fill="none" stroke="#FFD9CE" stroke-width="2.6" stroke-linecap="round" opacity="0.9">
<path d="M44 20 a10 10 0 0 1 0 12"/><path d="M48 16 a16 16 0 0 1 0 20"/>
</g></svg>`);

/** Ring, the mascot — idle (smiling) or talking (open mouth). */
export const ring = (talking = false) => svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<circle cx="50" cy="58" r="30" fill="#F4532E"/>
<circle cx="40" cy="56" r="5.5" fill="#fff"/><circle cx="60" cy="56" r="5.5" fill="#fff"/>
<circle cx="41.5" cy="57" r="2.6" fill="#1B1512"/><circle cx="61.5" cy="57" r="2.6" fill="#1B1512"/>
${talking
  ? '<ellipse cx="50" cy="71" rx="4.5" ry="5.5" fill="#fff"/>'
  : '<path d="M44 70 Q50 75 56 70" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>'}
</svg>`);

/**
 * Figtree for the card, so previews match the site.
 *
 * Satori cannot read woff2, and Google serves woff2 to any modern UA — so we ask
 * with an ancient User-Agent, which gets us a TTF. If anything here fails the card
 * still renders in the fallback font: a preview in the wrong typeface beats no
 * preview at all.
 */
export async function figtree(weights = [800]) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Figtree:wght@${weights.join(";")}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8)" } }
    ).then((r) => r.text());

    const urls = [...css.matchAll(/src:\s*url\(([^)]+)\)\s*format\('(truetype|opentype)'\)/g)];
    const fonts = await Promise.all(
      urls.slice(0, weights.length).map(async (m, i) => ({
        name: "Figtree",
        data: await fetch(m[1]).then((r) => r.arrayBuffer()),
        weight: weights[i],
        style: "normal",
      }))
    );
    return fonts.filter((f) => f.data?.byteLength);
  } catch {
    return [];
  }
}

/** The dark canvas every card sits on. */
export const shell = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "68px 72px",
  background: "linear-gradient(135deg, #1F1712 0%, #17120F 55%, #120D0B 100%)",
  fontFamily: "Figtree, sans-serif",
  position: "relative",
};

/** Coral bloom behind the content, so the card is not a flat rectangle. */
export const glow = {
  position: "absolute",
  top: -260,
  right: -180,
  width: 760,
  height: 760,
  borderRadius: 760,
  background: "radial-gradient(circle, rgba(244,83,46,0.34) 0%, rgba(244,83,46,0) 68%)",
  display: "flex",
};

export const brandRow = (label = "heytring.com") => ({
  display: "flex",
  alignItems: "center",
  gap: 18,
  label,
});
