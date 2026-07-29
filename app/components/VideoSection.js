"use client";

/**
 * VideoSection — Swish's lite-embed facade: poster <img> first, the
 * <video> mounts on tap. MP4 (H.264) first so Safari and every Chrome
 * build can play it, WebM as fallback. Store buttons live only on the
 * first and last sections now, so none here.
 */
import { useState } from "react";
import { track } from "./analytics";

export default function VideoSection() {
  const [mode, setMode] = useState("poster"); // poster | playing | soon

  return (
    <section className="section" id="video">
      <div className="wrap">
        <div className="head head--center reveal">
          <span className="eyebrow">See it happen</span>
          <h2>Watch Ring take a call.</h2>
          <p className="lead">Fifteen seconds. One unknown number. Handled.</p>
        </div>

        <div className="vid reveal">
          {mode === "playing" && (
            <video
              poster="/demo-poster.jpg"
              controls
              autoPlay
              playsInline
              onError={() => setMode("soon")}
            >
              <source src="/demo.mp4" type="video/mp4" />
              <source src="/demo.webm" type="video/webm" />
            </video>
          )}

          {mode === "poster" && (
            <button
              className="vid__poster"
              onClick={() => { setMode("playing"); track("demo_play", { placement: "video" }); }}
              aria-label="Play the Tring demo video"
            >
              <img className="vid__frame" src="/demo-poster.jpg" alt="" />
              <span className="vid__pill"><span className="tri" /> Play the demo</span>
            </button>
          )}

          {mode === "soon" && (
            <div className="vid__soon">
              <b>The film could not load.</b>
              <span>The real thing is one invite away — grab yours below.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
