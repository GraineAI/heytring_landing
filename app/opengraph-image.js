import { ImageResponse } from "next/og";
import { OG_SIZE, OG_TYPE, LOGO_TILE, ring, figtree, shell, glow } from "./lib/og";

export const alt = "Tring — don't pick up, don't dial. Ring answers the calls you'd rather skip.";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

/** The card every share of heytring.com shows. */
export default async function Image() {
  const fonts = await figtree([600, 800]);

  return new ImageResponse(
    (
      <div style={shell}>
        <div style={glow} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ring(true)}
          width={236}
          height={236}
          alt=""
          style={{ position: "absolute", right: 96, top: 208 }}
        />

        {/* brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_TILE} width={72} height={72} alt="" />
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#fff", letterSpacing: -1.6 }}>
            Tring
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 8,
              padding: "8px 18px",
              borderRadius: 999,
              border: "2px solid rgba(244,83,46,0.5)",
              color: "#FF9179",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1.6,
            }}
          >
            CLOSED BETA
          </div>
        </div>

        {/* the line */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 700, color: "#fff", letterSpacing: -3.4, lineHeight: 1.06 }}>
            Don&rsquo;t pick up.
          </div>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 700, letterSpacing: -3.4, lineHeight: 1.06 }}>
            <span style={{ color: "#fff", marginRight: 22 }}>Don&rsquo;t dial.</span>
            <span style={{ color: "#F4532E" }}>Tring.</span>
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 30, fontWeight: 600, color: "#B7A79D", maxWidth: 820 }}>
            Ring answers the calls you&rsquo;d rather skip — in your own voice, if you want.
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#8C7C73" }}>
          heytring.com · Live on Google Play · Works on your current SIM · Two minutes to set up
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
