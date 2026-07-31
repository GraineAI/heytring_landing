import crypto from "crypto";
import { API_BASE } from "../../../lib/links";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * /share/<token>/audio — streams a shared call's recording.
 *
 * The browser never receives the storage URL. apollo hands us a presigned Wasabi
 * link that dies in ~10 minutes; putting that straight into <audio src> means a
 * listener who pauses for a coffee comes back to a dead player, and anyone who
 * copies it keeps the recording after the share is revoked. Proxying instead
 * makes revocation real: every request re-checks the token, and a revoked token
 * 404s here even if the page is still open.
 *
 * Range requests are forwarded upstream so seeking works and we never buffer a
 * whole file in memory (the storage layer slices, we pass it through).
 *
 * If a deployment ever serves UNSIGNED Wasabi URLs, we sign the GET ourselves
 * with AWS SigV4 from WASABI_ACCESS_KEY / WASABI_SECRET_KEY, the same way the
 * Graine console does.
 */

function sigv4Headers(url, accessKey, secretKey, region) {
  const u = new URL(url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const emptyHash = crypto.createHash("sha256").update("").digest("hex");

  const headers = {
    host: u.host,
    "x-amz-content-sha256": emptyHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");

  const canonicalRequest = [
    "GET",
    u.pathname,
    u.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    emptyHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return {
    ...headers,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export async function GET(req, { params }) {
  const token = params.token;

  // Re-check the share on every request: a revoked link stops playing immediately,
  // even in a tab that was opened while it was still valid.
  let audioUrl = null;
  try {
    const meta = await fetch(
      `${API_BASE}/api/v1/calls/share/public/${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    if (meta.ok) audioUrl = (await meta.json())?.audio_url || null;
    else if (meta.status === 404) return new Response("Not found", { status: 404 });
  } catch {
    return new Response("Upstream unavailable", { status: 502 });
  }
  if (!audioUrl) return new Response("Not found", { status: 404 });

  // Presigned already (apollo's normal path) → fetch as-is. Otherwise sign it
  // ourselves, which is what Wasabi needs when no signature is attached.
  const headers = { Accept: "*/*" };
  if (!/[?&]X-Amz-Signature=/.test(audioUrl)) {
    const key = process.env.WASABI_ACCESS_KEY;
    const secret = process.env.WASABI_SECRET_KEY;
    const region = process.env.WASABI_REGION || "eu-west-3";
    if (!key || !secret) return new Response("Recording unavailable", { status: 503 });
    Object.assign(headers, sigv4Headers(audioUrl, key, secret, region));
  }

  // Forward the browser's Range so seeking works without buffering the file here.
  const range = req.headers.get("range");
  if (range) headers.Range = range;

  let upstream;
  try {
    upstream = await fetch(audioUrl, { headers, cache: "no-store" });
  } catch {
    return new Response("Recording unavailable", { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Recording unavailable", { status: 502 });
  }

  // Wasabi labels these binary/octet-stream, which Safari refuses to play. The
  // recordings are mp3; say so, and only trust an upstream type that is audio.
  const upType = upstream.headers.get("content-type") || "";
  const out = new Headers({
    "Content-Type": upType.startsWith("audio/") ? upType : "audio/mpeg",
    "Accept-Ranges": "bytes",
    // Private recording: never cached by a CDN or shared proxy.
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  for (const h of ["content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
