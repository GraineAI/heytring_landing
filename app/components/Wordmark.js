/**
 * The Tring wordmark.
 *
 * Figtree, weight 700, one colour — coral, the way it started. The stacked
 * mint/purple extrusion is gone: the redesign spends the accent on exactly one
 * "act" control per screen, and a logo that shouts in three colours competes
 * with the button you actually want pressed.
 *
 * Sizing: pass `size` in px, or `size={null}` to hand sizing to CSS. An inline
 * font-size beats any stylesheet rule, which is how the footer sign-off once
 * ended up pinned at 612px wide inside a 390px phone.
 */
export default function Wordmark({
  size = 34,
  tone = "coral", // coral | white | ink
  className = "",
  style,
}) {
  const color = tone === "white" ? "#FFFFFF" : tone === "ink" ? "var(--ink)" : "var(--coral)";
  return (
    <span
      className={`wm ${className}`}
      style={{ ...(size == null ? null : { fontSize: size }), color, ...style }}
      role="img"
      aria-label="Tring"
    >
      <span aria-hidden="true">tring</span>
    </span>
  );
}

/**
 * The lockup used in the nav and footer: the `t` tile, then the word.
 * Kept as one component so the two never drift apart in size or spacing.
 */
export function AppIcon({ size = 64, radius = 0.28, className = "", style }) {
  return (
    <span
      className={`appicon ${className}`}
      style={{ width: size, height: size, borderRadius: size * radius, ...style }}
      role="img"
      aria-label="Tring"
    >
      <span
        className="appicon__t"
        style={{ fontSize: size * 0.58 }}
        aria-hidden="true"
      >
        t
      </span>
    </span>
  );
}
