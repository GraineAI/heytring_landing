"use client";

/**
 * VideoSection — Swish's facade pattern: nothing heavy loads until the
 * visitor asks for it. A CSS-drawn poster (radius 32, glass play pill —
 * Equal AI's glass video controls) swaps to a real <video> on click.
 * Drop the product film at public/demo.mp4 (16:9) and it just works;
 * until then the poster degrades to a friendly "coming soon" state.
 */
import { useState } from "react";
import { Ring } from "./Mascot";
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
            Sixty seconds: an unknown number calls, Ring answers, screens it and
            hands over the note — while the phone&rsquo;s owner never looks up.
          </p>
        </div>

        <div className="vid reveal">
          {mode === "playing" && (
            <video
              src="/demo.mp4"
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
              <Ring size={96} state="talking" />
              <span className="vid__pill"><span className="tri" /> Play the demo</span>
            </button>
          )}

          {mode === "soon" && (
            <div className="vid__soon">
              <Ring size={72} state="happy" />
              <b>The film is still in the edit room.</b>
              <span>Meanwhile, the real thing is one download away — and it&rsquo;s free.</span>
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
