import { API_BASE } from "../../lib/links";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// NOINDEX. This page shows a recording of somebody's private phone call. It is reachable only by
// an unguessable link the owner chose to send, and it must never appear in a search result.
export const metadata = {
  title: "A call on Tring",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * /share/<token> — the page a Tring user's shared link opens.
 *
 * Server-rendered on purpose: the token is exchanged for content on the server, so the audio URL
 * is never handed to a client that could keep it after the link is revoked. apollo mints that URL
 * fresh per view with a short life, which is what makes revocation real.
 *
 * Every failure — revoked, expired, never existed — renders the same thing, matching apollo's
 * single rejection shape. A visitor cannot learn which tokens were ever valid.
 */
export default async function SharedCall({ params }) {
  let data = null;
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/calls/share/public/${encodeURIComponent(params.token)}`,
      { cache: "no-store" }
    );
    if (res.ok) data = await res.json();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <main className="wrap" style={{ maxWidth: 560, margin: "0 auto", padding: "72px 24px" }}>
        <h1 style={{ fontSize: 26, marginBottom: 10 }}>This link is no longer available</h1>
        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
          Shared call links expire, and the person who shared it can turn it off at any time.
          Ask them for a new link if you still need it.
        </p>
        <p style={{ marginTop: 28 }}>
          <a href="/">← Tring</a>
        </p>
      </main>
    );
  }

  const mins = data.duration_seconds ? Math.max(1, Math.round(data.duration_seconds / 60)) : null;

  return (
    <main className="wrap" style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px" }}>
      <p style={{ fontSize: 13, letterSpacing: 0.4, opacity: 0.6, textTransform: "uppercase" }}>
        Shared from Tring
      </p>
      <h1 style={{ fontSize: 28, margin: "10px 0 4px" }}>{data.caller}</h1>
      <p style={{ opacity: 0.6, fontSize: 14 }}>
        Answered by Tring{mins ? ` · about ${mins} min` : ""}
      </p>

      {data.summary ? (
        <section style={{ marginTop: 28, padding: 18, borderRadius: 16, background: "rgba(0,0,0,.04)" }}>
          <h2 style={{ fontSize: 15, marginBottom: 8, opacity: 0.7 }}>What they wanted</h2>
          <p style={{ lineHeight: 1.65, margin: 0 }}>{data.summary}</p>
        </section>
      ) : null}

      {/* Audio may be absent even on a valid link — apollo returns null rather than leaking a
          private storage URL when presigning fails. The summary is still worth showing. */}
      {data.audio_url ? (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 15, marginBottom: 10, opacity: 0.7 }}>Recording</h2>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="none" src={data.audio_url} style={{ width: "100%" }} />
        </section>
      ) : (
        <p style={{ marginTop: 22, opacity: 0.6, fontSize: 14 }}>
          The recording couldn’t be loaded right now.
        </p>
      )}

      {/* Both parties are audible on a call recording. Say so, to the person listening. */}
      <p style={{ marginTop: 30, fontSize: 12.5, opacity: 0.55, lineHeight: 1.6 }}>
        This call was answered by an AI assistant on the recipient’s behalf, and shared by them.
        Please treat it as you would any private conversation.
        {data.expires_at ? " This link expires automatically." : ""}
      </p>

      <p style={{ marginTop: 26 }}>
        <a href="/">What is Tring? →</a>
      </p>
    </main>
  );
}
