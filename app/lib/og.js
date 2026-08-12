// Shared pieces for the Open Graph link-preview cards.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const svgUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** The app mark — same artwork as app/icon.svg. */
export const LOGO_TILE = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#FF9179"/><stop offset=".48" stop-color="#F4532E"/><stop offset="1" stop-color="#E5401C"/>
</linearGradient></defs>
<rect width="64" height="64" rx="14" fill="url(#t)"/>
<g transform="translate(1,0) skewX(-9)">
<g fill="#C77DDD" transform="translate(4,4)"><path d="M14 24h34v9H14z"/><path d="M26 11h11v27c0 4 3 6.5 7 6.2l1.2 8.4c-11 1.2-19.2-5.4-19.2-14.6V11z"/></g>
<g fill="#30D158" transform="translate(2,2)"><path d="M14 24h34v9H14z"/><path d="M26 11h11v27c0 4 3 6.5 7 6.2l1.2 8.4c-11 1.2-19.2-5.4-19.2-14.6V11z"/></g>
<g fill="#FFFFFF"><path d="M14 24h34v9H14z"/><path d="M26 11h11v27c0 4 3 6.5 7 6.2l1.2 8.4c-11 1.2-19.2-5.4-19.2-14.6V11z"/></g>
</g></svg>`);

/** Ring, the mascot — idle (smiling) or talking (open mouth). */
export const ring = (talking = false) => svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs>
<radialGradient id="rb" cx="34%" cy="26%" r="78%"><stop offset="0" stop-color="#FF9179"/><stop offset="46%" stop-color="#F4532E"/><stop offset="100%" stop-color="#C4380F"/></radialGradient>
<linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<circle cx="52" cy="61" r="30" fill="#C4380F"/>
<circle cx="50" cy="58" r="30" fill="url(#rb)"/>
<path d="M24 46a30 30 0 0 1 52 0a30 30 0 0 0-52 0z" fill="url(#rg)"/>
<circle cx="40" cy="55.4" r="5.5" fill="#fff"/><circle cx="60" cy="55.4" r="5.5" fill="#fff"/>
<circle cx="41.5" cy="57" r="2.6" fill="#000000"/><circle cx="61.5" cy="57" r="2.6" fill="#000000"/>
${talking
  ? '<ellipse cx="50" cy="71" rx="4.5" ry="5.5" fill="#fff"/>'
  : '<path d="M44 70 Q50 75 56 70" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/>'}
</svg>`);

/**
 * Figtree for the card, so previews match the site.
 *
 * Satori cannot read woff2, and Google serves woff2 to any modern UA — so we ask
 * with an ancient User-Agent, which gets us a TTF. If anything here fails the card
 * still renders in the fallback font: a preview in the wrong typeface beats no
 * preview at all.
 */
// CACHE THE FONT ACROSS REQUESTS.
//
// Every OG render was fetching Google's CSS and then the TTF itself — two network round trips on
// the critical path of a preview. WhatsApp and iMessage give a link preview a short budget and
// simply show a bare grey URL when it is missed, which is why shared Tring links looked broken.
// The module-level cache means only the first render after a cold start pays for it, and
// force-cache lets the platform serve it from its own layer as well.
let _fontCache = null;

export async function figtree(weights = [800]) {
  if (_fontCache) return _fontCache;
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Figtree:wght@${weights.join(";")}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8)" },
        cache: "force-cache" }
    ).then((r) => r.text());

    const urls = [...css.matchAll(/src:\s*url\(([^)]+)\)\s*format\('(truetype|opentype)'\)/g)];
    const fonts = await Promise.all(
      urls.slice(0, weights.length).map(async (m, i) => ({
        name: "Figtree",
        data: await fetch(m[1], { cache: "force-cache" }).then((r) => r.arrayBuffer()),
        weight: weights[i],
        style: "normal",
      }))
    );
    const ok = fonts.filter((f) => f.data?.byteLength);
    // Only cache a SUCCESSFUL fetch. Caching an empty result would make one transient network
    // failure permanent for the life of the instance, and the card would render in a fallback face
    // forever with nothing to indicate why.
    if (ok.length) _fontCache = ok;
    return ok;
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
  background: "linear-gradient(135deg, #1C1C1E 0%, #0B0B0C 52%, #000000 100%)",
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
  background: "radial-gradient(circle, rgba(232,115,90,0.42) 0%, rgba(232,115,90,0) 68%)",
  display: "flex",
};

export const brandRow = (label = "heytring.com") => ({
  display: "flex",
  alignItems: "center",
  gap: 18,
  label,
});
