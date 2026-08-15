/**
 * The social proof shelf — and the rules about what is allowed onto it.
 *
 * The reference page this section is modelled on carries a stats bar and a wall of named
 * testimonials. Both do real conversion work, and this page has neither. So the shelf is built.
 * It ships EMPTY, and that is the point rather than an omission.
 *
 * WHY NOTHING IS PRE-FILLED. A testimonial is a claim that a named person said a thing. Writing
 * one that nobody said is a fabricated review — the kind of thing that gets an app pulled from a
 * store, and it would be a lie told to the exact people we most need to trust us. The numbers are
 * the same argument in a different costume: an install count nobody can verify is worth less than
 * silence, because a visitor who checks and finds it hollow has learned something about us that no
 * later copy will undo.
 *
 * WHY THE SECTIONS HIDE THEMSELVES. An empty stats strip reading "0 users" or a testimonial
 * carousel with one placeholder card is worse than no section at all: it advertises that nobody
 * has arrived yet, on the page whose whole job is to suggest otherwise. Below the thresholds
 * here, the section does not render — the page simply closes up around it and reads as though it
 * was never meant to be there.
 *
 * FILLING IT IN. The quotes come from the beta users in /admin — the "Talk to your users" queue,
 * which is a list of real people who signed up, with a call button next to each. Ask, get
 * permission to publish, paste the words in verbatim. Someone else's sentence, lightly improved,
 * is no longer their sentence.
 */

/**
 * Real quotes from real users, published with their permission.
 *
 * @typedef  {object} Quote
 * @property {string} words   Their sentence, as they said it. Trim it; do not rewrite it.
 * @property {string} name    The name they agreed to appear under.
 * @property {string} [role]  Anything that makes them recognisable as a person, not a persona.
 * @property {string} [via]   Where it came from — "user call", "Play Store", "WhatsApp".
 */
export const QUOTES = [
  // Nothing here yet, on purpose. See the note above before adding.
];

/**
 * Numbers, each one checkable against something outside this file.
 *
 * `value` is a string so it can be shaped for reading ("12+", "1 ring"). `source` is not shown to
 * visitors; it exists so that in six months someone can establish where a figure came from without
 * a meeting. A number with no source does not go on the page.
 */
export const FIGURES = [
  // { value: "1,20,000", label: "calls answered", source: "Apollo: calls.answered, all time" },
];

/**
 * A wall of one is not a wall. Two quotes read as the only two that exist; three is the smallest
 * number that reads as a sample of something larger, and it is also the point at which a carousel
 * has anything to carouse.
 */
export const MIN_QUOTES = 3;

/** Three figures fill the strip. Two leave a hole, and one is a boast. */
export const MIN_FIGURES = 3;

export const hasQuotes  = (q = QUOTES)  => q.filter(isPublishable).length >= MIN_QUOTES;
export const hasFigures = (f = FIGURES) => f.filter(isCitable).length >= MIN_FIGURES;

/** A quote needs words and a name. An anonymous testimonial is indistinguishable from a written one. */
export const isPublishable = (q) => Boolean(q && String(q.words || "").trim() && String(q.name || "").trim());

/** A figure needs a value, a label, and somewhere it came from. */
export const isCitable = (f) =>
  Boolean(f && String(f.value || "").trim() && String(f.label || "").trim() && String(f.source || "").trim());
