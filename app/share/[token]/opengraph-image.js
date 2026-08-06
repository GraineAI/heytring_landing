import { ImageResponse } from "next/og";
import { OG_SIZE, OG_TYPE, LOGO_TILE, ring, figtree, shell, glow } from "../../lib/og";

export const alt = "A call answered by Ring, shared from Tring";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

/**
 * The card a shared call shows in WhatsApp, iMessage, Slack…
 *
 * Deliberately generic: it names no caller and quotes no summary. Link previews
 * are unfurled by servers and rendered in group chats — putting a private call's
 * details in one would leak the call to everyone in the thread, and to whichever
 * platform fetched it. The recipient sees who called only after opening the page.
 */
export default async function Image() {
  const fonts = await figtree([600, 800]);

  return new ImageResponse(
    (
      <div style={shell}>
        <div style={glow} />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_TILE} width={64} height={64} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: -1.4 }}>
            Tring
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "9px 20px",
                borderRadius: 999,
                background: "rgba(244,83,46,0.16)",
                border: "2px solid rgba(244,83,46,0.45)",
                color: "#FF9179",
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: 1.8,
              }}
            >
              SHARED FROM TRING
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 68, fontWeight: 800, color: "#fff", letterSpacing: -2.6, lineHeight: 1.08 }}>
              A call, answered by Ring
            </div>
            <div style={{ display: "flex", marginTop: 20, fontSize: 29, fontWeight: 600, color: "#B7A79D", maxWidth: 700 }}>
              Someone shared a call their AI assistant picked up. Open it to hear the recording and read the note.
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ring(true)} width={210} height={210} alt="" />
        </div>

        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#8C7C73" }}>
          heytring.com · Don&rsquo;t pick up. Don&rsquo;t dial. Tring.
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
