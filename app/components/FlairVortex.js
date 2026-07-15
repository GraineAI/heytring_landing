"use client";

/** FlairVortex — the GSAP "flair vortex" canvas demo, rebuilt for the final CTA:
 *  99 sprites spiral from the card's edges into the centre on an endless staggered
 *  loop (fromTo + negative stagger + seek, exactly the pen's mechanics). Sprites are
 *  painted on offscreen canvases in brand white/coral — no external images. Tap the
 *  card's empty space to freeze the vortex, tap again to resume. DPR-aware,
 *  pauses offscreen, reduced-motion → renders nothing.
 */
import { useEffect, useRef } from "react";

const SPRITE = 64;

function makeSprite(paint) {
  const s = document.createElement("canvas");
  s.width = s.height = SPRITE;
  paint(s.getContext("2d"), SPRITE);
  return s;
}

function buildSprites() {
  const ring = makeSprite((g, n) => {
    g.strokeStyle = "#fff"; g.lineWidth = n * 0.11;
    g.beginPath(); g.arc(n / 2, n / 2, n * 0.36, 0, Math.PI * 2); g.stroke();
  });
  const dot = makeSprite((g, n) => {
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(n / 2, n / 2, n * 0.3, 0, Math.PI * 2); g.fill();
  });
  const spark = makeSprite((g, n) => {
    const c = n / 2, R = n * 0.46, r = n * 0.09;
    g.fillStyle = "#fff"; g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, d = i % 2 ? r : R;
      g[i ? "lineTo" : "moveTo"](c + Math.cos(a) * d, c + Math.sin(a) * d);
    }
    g.closePath(); g.fill();
  });
  const face = makeSprite((g, n) => {
    // Ring's face, inverted for the coral card: white head, coral features.
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(n / 2, n / 2, n * 0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#F0472A";
    g.beginPath(); g.arc(n * 0.38, n * 0.44, n * 0.062, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(n * 0.62, n * 0.44, n * 0.062, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#F0472A"; g.lineWidth = n * 0.05; g.lineCap = "round";
    g.beginPath(); g.moveTo(n * 0.4, n * 0.6);
    g.quadraticCurveTo(n / 2, n * 0.7, n * 0.6, n * 0.6); g.stroke();
  });
  return [ring, dot, spark, dot, ring, face]; // dots/rings twice → faces stay a garnish
}

export default function FlairVortex({ count = 99 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let gsapRef, tl, ro, io, onTap, cancelled = false;
    const cv = ref.current;

    (async () => {
      const gsap = (await import("gsap")).default;
      if (cancelled || !cv) return;
      gsapRef = gsap;
      const ctx = cv.getContext("2d");
      const host = cv.parentElement;
      const d = Math.min(2, window.devicePixelRatio || 1);

      let cw = 0, ch = 0, radius = 0;
      const fit = () => {
        const r = host.getBoundingClientRect();
        cw = cv.width = r.width * d;
        ch = cv.height = r.height * d;
        cv.style.width = r.width + "px";
        cv.style.height = r.height + "px";
        radius = Math.max(cw, ch);
      };
      fit();

      const sprites = buildSprites();
      const particles = Array.from({ length: count }, (_, i) => ({
        x: 0, y: 0, scale: 0, rotate: 0,
        img: sprites[i % sprites.length],
        mult: 0.45 + ((i * 7919) % 100) / 145, // deterministic 0.45–1.13 size spread
        alpha: 0.3 + ((i * 104729) % 100) / 160,
      }));

      const draw = () => {
        particles.sort((a, b) => a.scale - b.scale); // z-order: small behind big
        ctx.clearRect(0, 0, cw, ch);
        for (const p of particles) {
          const w = SPRITE * p.scale * p.mult * d;
          ctx.translate(cw / 2, ch / 2);
          ctx.rotate(p.rotate);
          ctx.globalAlpha = p.alpha;
          ctx.drawImage(p.img, p.x - w / 2, p.y - w / 2, w, w);
          ctx.resetTransform();
        }
        ctx.globalAlpha = 1;
      };

      tl = gsap.timeline({ onUpdate: draw })
        .fromTo(particles, {
          x: (i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            return Math.cos(angle * 10) * radius;
          },
          y: (i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            return Math.sin(angle * 10) * radius;
          },
          scale: 1.1,
          rotate: 0,
        }, {
          duration: 5,
          ease: "sine",
          x: 0, y: 0, scale: 0, rotate: -3,
          stagger: { each: -0.05, repeat: -1 },
        }, 0)
        .seek(99);

      ro = new ResizeObserver(() => { fit(); tl.invalidate(); });
      ro.observe(host);

      // Tap empty card space to freeze the swirl; tap again to spin it back up.
      let spinning = true;
      onTap = () => {
        spinning = !spinning;
        gsap.to(tl, { timeScale: spinning ? 1 : 0, duration: 0.6, ease: "power2.out", overwrite: true });
      };
      cv.addEventListener("pointerup", onTap);

      // Don't burn frames while the card is out of view.
      io = new IntersectionObserver(([e]) => tl.paused(!e.isIntersecting));
      io.observe(host);
    })();

    return () => {
      cancelled = true;
      tl && tl.kill();
      ro && ro.disconnect();
      io && io.disconnect();
      onTap && cv && cv.removeEventListener("pointerup", onTap);
    };
  }, [count]);

  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0 }} />;
}
