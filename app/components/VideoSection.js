"use client";

/**
 * VideoSection — Swish's lite-embed facade, with a real film behind it:
 * the poster frame renders instantly (just an <img>, radius 32), and the
 * <video> element only mounts when the visitor taps the glass play pill —
 * exactly how justswish.in defers its YouTube embed. The demo film lives
 * at public/demo.webm (swap in a final cut anytime, same filename).
 */
import { useState } from "react";
import StoreButtons from "./StoreButtons";
import { track } from "./analytics";

export default function VideoSection() {
  const [mode, setMode] = useState("poster"); // poster | playing | soon

  return (
    <section className="section" id="video">
      <div className="wrap">
        <div className="head head--center reveal">
          <span className="eyebrow">See it happen</span>
          <h2>Watch Ring take a call.</h2>
          <p className="lead">
            Fifteen seconds: an unknown number calls, Ring answers, screens it and
            hands over the note — while the phone&rsquo;s owner never looks up.
          </p>
        </div>

        <div className="vid reveal">
          {mode === "playing" && (
            <video
              src="/demo.webm"
              poster="/demo-poster.jpg"
              controls
              autoPlay
              playsInline
              onError={() => setMode("soon")}
            />
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
              <span>The real thing is one download away — and it&rsquo;s free.</span>
            </div>
          )}
        </div>

        <div className="vid__cta reveal">
          <StoreButtons placement="video" />
        </div>
      </div>
    </section>
  );
}
