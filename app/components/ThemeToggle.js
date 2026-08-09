"use client";

import { useEffect, useState } from "react";

/**
 * Light / Dark / Auto, with Auto the default — the app sheet's Appearance
 * control, same three options and same default.
 *
 * Auto sets no attribute at all and lets the CSS media query decide, which is
 * why it genuinely follows the device rather than snapshotting it once. Light
 * and Dark stamp data-theme on <html>, and the stylesheet is written so an
 * explicit choice beats the OS in both directions.
 *
 * The initial paint is handled by the blocking script in layout.js, not here —
 * a React effect runs after first paint, which is exactly one frame of white
 * flash for every dark-mode visitor. This component only renders the control
 * and reads back what that script already decided.
 */
const OPTIONS = ["Light", "Dark", "Auto"];

export default function ThemeToggle() {
  const [choice, setChoice] = useState(null); // null until mounted

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem("tring_theme"); } catch (_) {}
    setChoice(saved === "light" ? "Light" : saved === "dark" ? "Dark" : "Auto");
  }, []);

  const pick = (opt) => {
    setChoice(opt);
    const root = document.documentElement;
    if (opt === "Auto") {
      root.removeAttribute("data-theme");
      try { localStorage.removeItem("tring_theme"); } catch (_) {}
    } else {
      const v = opt.toLowerCase();
      root.setAttribute("data-theme", v);
      try { localStorage.setItem("tring_theme", v); } catch (_) {}
    }
  };

  return (
    <div className="themer" role="group" aria-label="Colour theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => pick(opt)}
          // Before mount `choice` is null, so nothing is pressed. Guessing here
          // would mean rendering one state on the server and another on the
          // client, which React would flag as a hydration mismatch.
          aria-pressed={choice === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
