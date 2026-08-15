/**
 * pseudoId — the join key between a phone number in the admin panel and a person in PostHog.
 *
 * The app identifies every signed-in user to PostHog as `pseudoId(phone)` and never as the phone
 * number itself (src/analytics.ts in the app repo explains why: an Indian mobile number is personal
 * data under the DPDP Act and has no business sitting in a product-analytics vendor). That is the
 * right call, and the cost of it is that nothing on this side could look a person up — the admin
 * panel knows phone numbers, PostHog knows salted digests, and there was no bridge.
 *
 * This is that bridge, and it MUST stay byte-identical to the app's implementation. A one-character
 * drift here does not throw: it produces a valid-looking id that matches no person, and every user
 * silently shows an empty timeline that reads as "this user did nothing". pseudoId.test.mjs pins it
 * against vectors generated from the app's own function for exactly that reason.
 *
 * HONEST LIMITATION, restated from the app: this is a salted non-cryptographic digest, not
 * anonymisation. Indian mobile numbers are a ~10^9 space, so anyone holding both the output and the
 * salt could brute-force it back. What it buys is that the analytics vendor never receives a phone
 * number. Which also means the salt below is not a secret from the vendor's point of view — it is
 * already compiled into every copy of the app — but it should still not be handed out casually.
 */
const SALT = "tring:analytics:v1";

export function pseudoId(phone) {
  // Last 10 digits: the app normalises this way so +91 99999 99999, 9999999999 and +919999999999
  // are one person. Reproduce the normalisation, not just the hash, or every id differs by format.
  const s = SALT + String(phone || "").replace(/\D/g, "").slice(-10);
  let h1 = 0x811c9dc5, h2 = 0x1000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return "u_" + h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
