import { API_BASE } from "../../lib/links";
import Logo from "../../components/Logo";
import Wordmark from "../../components/Wordmark";
import { Ring } from "../../components/Mascot";
import StoreButtons from "../../components/StoreButtons";
import BetaModal from "../../components/BetaModal";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// NOINDEX: this page shows a recording of somebody's private phone call, so it must never appear
// in a search result. It IS meant to unfurl in the chat it was sent to, though — so the card gets
// its own title, description and self-referencing url. Inheriting the site-wide ones (as it did)
// made every shared call preview as "Tring — don't pick up..." pointing at the homepage, which is
// why chat apps showed the wrong thing or nothing at all. `follow` is left on: nofollow/nocache
// protect no privacy here and make some unfurlers give up on the preview entirely.
export function generateMetadata({ params }) {
  const url = `https://heytring.com/share/${encodeURIComponent(params.token)}`;
  return {
    title: "A call on Tring",
    description:
      "Someone shared a call their AI assistant picked up. Open it to hear the recording and read the note.",
    robots: { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title: "A call, answered by Ring",
      description:
        "Someone shared a call their AI assistant picked up. Open it to hear the recording and read the note.",
      url,
      siteName: "Tring",
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: "A call, answered by Ring",
      description: "Shared from Tring — hear the recording and read the note.",
    },
  };
}

function ShareShell({ children }) {
  return (
    <main className="share">
      <div className="share__wrap">
        <a className="brand share__brand" href="/" aria-label="Tring home">
          <Logo size={30} className="brand__logo" />
          <Wordmark size={26} surface="var(--bg)" />
        </a>
        {children}
      </div>
      <BetaModal />
    </main>
  );
}

/** The pitch, right where the proof is: this very call was handled by Ring. */
function GetTheApp() {
  return (
    <section className="share__cta">
      <Ring size={72} state="happy" />
      <h2>Want Ring answering your calls too?</h2>
      <p>
        Ring picked up this call, talked to the caller and wrote the note —
        all by itself. It speaks 12+ Indian languages, and it can even answer
        in <b>your own voice</b>.
      </p>
      <StoreButtons onDark placement="share" />
      <div className="share__direct">
        Already invited?{" "}
        <a href="/go/play?p=share">Google Play</a> ·{" "}
        <a href="/go/ios?p=share">TestFlight</a>
      </div>
      <span className="share__ctatiny">Closed beta · Free · 12+ Indian languages · Made for India</span>
    </section>
  );
}

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
  // 404 means the link is genuinely gone (revoked, expired, or never real — apollo returns one
  // shape for all three on purpose). Anything else is OUR outage, and saying "this link is no
  // longer available" then is wrong in a way that matters: the recipient gives up on a link that
  // is perfectly valid, and the sender never learns why.
  let data = null;
  let gone = false;
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/calls/share/public/${encodeURIComponent(params.token)}`,
      { cache: "no-store" }
    );
    if (res.ok) data = await res.json();
    else if (res.status === 404) gone = true;
  } catch {
    data = null;
  }

  if (!data && !gone) {
    return (
      <ShareShell>
        <div className="share__state">
          <Ring size={84} state="idle" />
          <h1>Couldn&rsquo;t load this call</h1>
          <p>
            Something went wrong at our end — the link itself is probably fine.
            Please refresh in a moment.
          </p>
        </div>
        <GetTheApp />
      </ShareShell>
    );
  }

  if (!data) {
    return (
      <ShareShell>
        <div className="share__state">
          <Ring size={84} state="sleeping" />
          <h1>This link is no longer available</h1>
          <p>
            Shared call links expire, and the person who shared it can turn it
            off at any time. Ask them for a new link if you still need it.
          </p>
        </div>
        <GetTheApp />
      </ShareShell>
    );
  }

  const mins = data.duration_seconds ? Math.max(1, Math.round(data.duration_seconds / 60)) : null;
  const initial = (data.caller || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <ShareShell>
      <span className="share__tag">
        <span className="d" /> Shared from Tring
      </span>

      {/* the call header, styled like the app's call-detail screen */}
      <header className="share__head">
        <span className="share__av">{initial}</span>
        <div>
          <h1>{data.caller}</h1>
          <p>
            Answered by <b>Ring</b>, the Tring assistant
            {mins ? ` · about ${mins} min` : ""}
          </p>
        </div>
        <span className="share__halo">
          <span className="h" /><span className="h" />
          <Ring size={54} state="talking" />
        </span>
      </header>

      {data.summary ? (
        <section className="share__card share__card--summary">
          <span className="share__k">What they wanted</span>
          <p>{data.summary}</p>
        </section>
      ) : null}

      {/* Audio streams through /share/<token>/audio: the browser never holds a storage URL,
          so a revoked link stops playing even in an already-open tab. Audio may be absent on a
          valid link (apollo returns null rather than leak a URL); the summary still matters. */}
      {data.audio_url ? (
        <section className="share__card">
          <span className="share__k">Recording</span>
          <div className="share__eq" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} style={{ height: `${8 + ((i * 7) % 20)}px` }} />
            ))}
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="none" src={`/share/${encodeURIComponent(params.token)}/audio`} />
        </section>
      ) : (
        <p className="share__noaudio">The recording couldn&rsquo;t be loaded right now.</p>
      )}

      {/* Both parties are audible on a call recording. Say so, to the person listening. */}
      <p className="share__privacy">
        This call was answered by an AI assistant on the recipient&rsquo;s
        behalf, and shared by them. Please treat it as you would any private
        conversation.
        {data.expires_at ? " This link expires automatically." : ""}
      </p>

      <GetTheApp />

      <div className="doodles share__doodles" aria-hidden="true" />
      <p className="share__foot">
        <a href="/">heytring.com</a> · Don&rsquo;t pick up. Don&rsquo;t dial. Tring.
      </p>
    </ShareShell>
  );
}
