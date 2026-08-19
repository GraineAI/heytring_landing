"use client";

/**
 * RingGame — "Tring Squadron": a space shooter that IS the product pitch.
 *
 * You fly Ring's fighter. Spam transmissions dive at your phone — shoot them.
 * Real calls (Maa, the clinic, your delivery) come through the same sky, and
 * shooting one costs you: the whole point of Tring is that it can tell the
 * difference at speed, all day, without ever hitting Maa.
 *
 * Canvas rather than DOM: a starfield, bolts, debris and a dozen ships at once
 * would thrash layout as elements. One 2D context holds ~60fps on phones.
 *
 * The loop is paused whenever the section is off-screen or the tab is hidden —
 * a landing page must never burn a visitor's battery on a game they scrolled past.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "./analytics";

const SPAM = ["Loan offer", "Lucky draw", "Insurance", "Sales call", "Crypto tip", "You won!"];
const GOOD = ["Maa", "Delivery", "Apollo Clinic", "Blinkit", "Watchman", "Papa"];

const SHARE_URL =
  "https://heytring.com/?utm_source=game_share&utm_medium=social&utm_campaign=squadron";

/**
 * @param embedded  Rendered inside the mobile app's WebView (/play) rather than on the marketing
 *   page. Drops the section heading and the "get the beta" CTA — the person playing already HAS
 *   the app, so both are noise at best and a broken promise at worst (that CTA opens a beta-invite
 *   modal that assumes a browser).
 */
/**
 * The line that gets shared publicly, so it must never claim a clean run that
 * did not happen: "I didn't hit Maa" alongside a negative score is a giveaway
 * that the copy is generated rather than earned.
 */
function scoreLine({ score, blocked, missed }) {
  const kills =
    blocked === 0 ? "" : blocked === 1 ? "I shot down 1 spam call and " : `I shot down ${blocked} spam calls and `;
  const clean = blocked > 0 && missed === 0 ? " Never hit a real call, either." : "";
  return `${kills}${kills ? "s" : "S"}cored ${score} flying for Tring Squadron 🚀${clean}`;
}

export default function RingGame({ embedded = false }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | playing | over
  const [hud, setHud] = useState({ score: 0, blocked: 0, missed: 0, shields: 3 });
  const [best, setBest] = useState(0);
  const [shared, setShared] = useState("");
  const [hasHero, setHasHero] = useState(false);

  // Optional hand-drawn hero art. Drop a file at public/pilot.png and it takes
  // over the start/end panels; without it the vector pilot below stands in, so
  // a missing asset can never break the section.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasHero(true);
    img.src = "/pilot.png";
  }, []);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("tring_squadron_best") || 0));
    } catch (_) {}
  }, []);

  /* ───────────────────────── the game ───────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, raf = 0, last = 0, running = false, visible = true;

    const G = {
      stars: [], foes: [], bolts: [], bits: [],
      ship: { x: 0, y: 0, tx: 0, tilt: 0 },
      score: 0, blocked: 0, missed: 0, shields: 3,
      spawnIn: 900, sinceSpawn: 0, fireIn: 0, wave: 0,
      shake: 0, over: false, toasts: [],
    };
    gameRef.current = G;

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr());
      canvas.height = Math.round(H * dpr());
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
      if (!G.ship.x) { G.ship.x = W / 2; G.ship.tx = W / 2; }
      G.ship.y = H - 62;
      if (G.stars.length === 0) {
        for (let i = 0; i < 90; i++) {
          G.stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 1.7 });
        }
      }
    }
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    /* input — pointer, touch and keyboard all just steer x */
    const aim = (clientX) => {
      const r = canvas.getBoundingClientRect();
      G.ship.tx = Math.max(26, Math.min(W - 26, clientX - r.left));
    };
    const onPointer = (e) => { if (running) aim(e.clientX); };
    const keys = { left: false, right: false };
    const onKeyDown = (e) => {
      if (!running) return;
      if (e.key === "ArrowLeft" || e.key === "a") { keys.left = true; e.preventDefault(); }
      if (e.key === "ArrowRight" || e.key === "d") { keys.right = true; e.preventDefault(); }
    };
    const onKeyUp = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
    };
    canvas.addEventListener("pointermove", onPointer, { passive: true });
    canvas.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* ── helpers ── */
    const toast = (text, x, y, bad) => G.toasts.push({ text, x, y, life: 1, bad });
    const burst = (x, y, color, n = 14) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3.4;
        G.bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
      }
    };

    function spawn() {
      const spam = Math.random() < 0.62;
      const label = (spam ? SPAM : GOOD)[Math.floor(Math.random() * (spam ? SPAM.length : GOOD.length))];
      ctx.font = "700 12px Figtree, system-ui, sans-serif";
      const w = Math.max(78, ctx.measureText(label).width + 30);
      G.foes.push({
        x: 20 + Math.random() * Math.max(1, W - w - 40),
        y: -34, w, h: 30,
        vy: 0.55 + G.wave * 0.035 + Math.random() * 0.35,
        spam, label, dead: false,
      });
      G.wave += 1;
      G.spawnIn = Math.max(420, 980 - G.wave * 22);
    }

    function endGame() {
      G.over = true;
      running = false;
      setHud({ score: G.score, blocked: G.blocked, missed: G.missed, shields: 0 });
      setPhase("over");
      try {
        const prev = Number(localStorage.getItem("tring_squadron_best") || 0);
        if (G.score > prev) {
          localStorage.setItem("tring_squadron_best", String(G.score));
          setBest(G.score);
        }
      } catch (_) {}
      track("game_over", { score: G.score, blocked: G.blocked });
    }

    /* ── update ── */
    function step(dt) {
      // steer
      if (keys.left) G.ship.tx -= 0.55 * dt;
      if (keys.right) G.ship.tx += 0.55 * dt;
      G.ship.tx = Math.max(26, Math.min(W - 26, G.ship.tx));
      const dx = G.ship.tx - G.ship.x;
      G.ship.x += dx * 0.16;
      G.ship.tilt += (Math.max(-0.42, Math.min(0.42, dx * 0.014)) - G.ship.tilt) * 0.18;

      // stars
      for (const s of G.stars) {
        s.y += s.z * 0.9 * (dt / 16);
        if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      }

      // fire
      G.fireIn -= dt;
      if (G.fireIn <= 0) {
        G.fireIn = 165;
        G.bolts.push({ x: G.ship.x, y: G.ship.y - 26 });
      }
      for (const b of G.bolts) b.y -= 0.72 * dt;
      G.bolts = G.bolts.filter((b) => b.y > -20);

      // spawn
      G.sinceSpawn += dt;
      if (G.sinceSpawn >= G.spawnIn) { G.sinceSpawn = 0; spawn(); }

      // foes
      for (const f of G.foes) {
        f.y += f.vy * (dt / 16) * 1.9;
        if (f.y + f.h >= H - 34 && !f.dead) {
          f.dead = true;
          if (f.spam) {
            G.shields -= 1;
            G.shake = 14;
            burst(f.x + f.w / 2, H - 40, "#FF7B72", 18);
            toast("It rang!", f.x + f.w / 2, H - 66, true);
            setHud({ score: G.score, blocked: G.blocked, missed: G.missed, shields: Math.max(0, G.shields) });
            if (G.shields <= 0) endGame();
          } else {
            G.score += 5;
            burst(f.x + f.w / 2, H - 40, "#30D158", 8);
            toast("Ring handled it +5", f.x + f.w / 2, H - 66, false);
            setHud({ score: G.score, blocked: G.blocked, missed: G.missed, shields: G.shields });
          }
        }
      }

      // bolt hits
      for (const b of G.bolts) {
        for (const f of G.foes) {
          if (f.dead) continue;
          if (b.x > f.x && b.x < f.x + f.w && b.y > f.y && b.y < f.y + f.h) {
            f.dead = true; b.y = -99;
            if (f.spam) {
              G.score += 10; G.blocked += 1;
              burst(f.x + f.w / 2, f.y + f.h / 2, "#FF9179");
              toast("Blocked +10", f.x + f.w / 2, f.y, false);
            } else {
              G.score -= 15;
              G.missed += 1;
              burst(f.x + f.w / 2, f.y + f.h / 2, "#FF7B72");
              toast(f.label === "Maa" ? "You shot MAA! −15" : "That one mattered −15", f.x + f.w / 2, f.y, true);
              G.shake = 8;
            }
            setHud({ score: G.score, blocked: G.blocked, missed: G.missed, shields: G.shields });
          }
        }
      }
      G.foes = G.foes.filter((f) => !f.dead && f.y < H + 40);

      // debris + toasts
      for (const p of G.bits) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.022 * (dt / 16); }
      G.bits = G.bits.filter((p) => p.life > 0);
      for (const t of G.toasts) { t.y -= 0.35 * (dt / 16); t.life -= 0.014 * (dt / 16); }
      G.toasts = G.toasts.filter((t) => t.life > 0);
      if (G.shake > 0) G.shake *= 0.88;
    }

    /* ── draw ── */
    function drawShip(x, y, tilt) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.5);

      // engine wash
      const flame = 12 + Math.random() * 8;
      const grd = ctx.createLinearGradient(0, 16, 0, 16 + flame);
      grd.addColorStop(0, "rgba(251,122,92,0.9)");
      grd.addColorStop(1, "rgba(251,122,92,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.moveTo(-7, 16); ctx.lineTo(7, 16); ctx.lineTo(0, 16 + flame); ctx.closePath(); ctx.fill();

      // wings
      ctx.fillStyle = "#C4380F";
      ctx.beginPath();
      ctx.moveTo(-26, 18); ctx.lineTo(-8, -2); ctx.lineTo(8, -2); ctx.lineTo(26, 18);
      ctx.lineTo(14, 18); ctx.lineTo(0, 8); ctx.lineTo(-14, 18);
      ctx.closePath(); ctx.fill();

      // fuselage
      ctx.fillStyle = "#F4532E";
      ctx.beginPath();
      ctx.moveTo(0, -26); ctx.lineTo(11, 6); ctx.lineTo(6, 18); ctx.lineTo(-6, 18); ctx.lineTo(-11, 6);
      ctx.closePath(); ctx.fill();

      // canopy — Ring at the controls
      ctx.fillStyle = "#000000";
      ctx.beginPath(); ctx.ellipse(0, -4, 8.5, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#F4532E";
      ctx.beginPath(); ctx.arc(0, -3, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-2.3, -4, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2.3, -4, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath(); ctx.arc(-2, -3.6, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -3.6, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (G.shake > 0.4) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

      // stars
      for (const s of G.stars) {
        ctx.globalAlpha = 0.25 + s.z * 0.36;
        ctx.fillStyle = s.z > 1.4 ? "#FFF0EB" : "#84848C";
        ctx.fillRect(s.x, s.y, s.z > 1.4 ? 2 : 1.4, s.z > 1.4 ? 2.6 : 1.6);
      }
      ctx.globalAlpha = 1;

      // the phone line you're defending
      ctx.strokeStyle = "rgba(244,83,46,0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 8]);
      ctx.beginPath(); ctx.moveTo(0, H - 34); ctx.lineTo(W, H - 34); ctx.stroke();
      ctx.setLineDash([]);

      // bolts
      for (const b of G.bolts) {
        ctx.fillStyle = "#FFD9CE";
        ctx.fillRect(b.x - 1.6, b.y - 12, 3.2, 14);
        ctx.fillStyle = "rgba(244,83,46,0.55)";
        ctx.fillRect(b.x - 3.4, b.y - 14, 6.8, 18);
      }

      // incoming transmissions
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const f of G.foes) {
        const c = f.spam ? "#F4532E" : "#30D158";
        ctx.fillStyle = f.spam ? "rgba(244,83,46,0.14)" : "rgba(63,201,140,0.12)";
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.6;
        const r = 9;
        ctx.beginPath();
        ctx.moveTo(f.x + r, f.y);
        ctx.arcTo(f.x + f.w, f.y, f.x + f.w, f.y + f.h, r);
        ctx.arcTo(f.x + f.w, f.y + f.h, f.x, f.y + f.h, r);
        ctx.arcTo(f.x, f.y + f.h, f.x, f.y, r);
        ctx.arcTo(f.x, f.y, f.x + f.w, f.y, r);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "700 12px Figtree, system-ui, sans-serif";
        ctx.fillText(f.label, f.x + f.w / 2, f.y + f.h / 2 + 0.5);
        ctx.fillStyle = c;
        ctx.font = "800 10px Figtree, system-ui, sans-serif";
        ctx.fillText(f.spam ? "SPAM" : "REAL", f.x + f.w / 2, f.y - 8);
      }

      // debris
      for (const p of G.bits) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;

      // floating score text
      for (const t of G.toasts) {
        ctx.globalAlpha = Math.max(0, t.life);
        ctx.fillStyle = t.bad ? "#FF7B72" : "#30D158";
        ctx.font = "800 13px Figtree, system-ui, sans-serif";
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;

      if (!G.over) drawShip(G.ship.x, G.ship.y, G.ship.tilt);
      ctx.restore();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min(48, now - (last || now));
      last = now;
      if (running) step(dt);
      draw();
    }
    raf = requestAnimationFrame(frame);

    // never run the loop for someone who has scrolled past it
    const io = new IntersectionObserver(
      ([e]) => { visible = e.isIntersecting; },
      { threshold: 0.05 }
    );
    io.observe(canvas);
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    // exposed to the buttons below
    gameRef.current.start = () => {
      Object.assign(G, {
        foes: [], bolts: [], bits: [], toasts: [],
        score: 0, blocked: 0, missed: 0, shields: 3,
        spawnIn: 900, sinceSpawn: 0, fireIn: 0, wave: 0, shake: 0, over: false,
      });
      G.ship.x = W / 2; G.ship.tx = W / 2;
      setHud({ score: 0, blocked: 0, missed: 0, shields: 3 });
      running = true;
    };
    gameRef.current.stop = () => { running = false; };

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  const start = useCallback(() => {
    setShared("");
    setPhase("playing");
    gameRef.current?.start?.();
    track("game_start", { game: "squadron" });
  }, []);

  /* ── share the score ── */
  const share = useCallback(async () => {
    const text = `${scoreLine(hud)} Beat that:`;
    track("game_share", { score: hud.score, blocked: hud.blocked });
    try {
      if (navigator.share) {
        await navigator.share({ title: "Tring Squadron", text, url: SHARE_URL });
        setShared("Thanks for sharing!");
        return;
      }
      await navigator.clipboard.writeText(`${text} ${SHARE_URL}`);
      setShared("Copied — paste it anywhere.");
    } catch (_) {
      setShared("");
    }
  }, [hud]);

  const waText = encodeURIComponent(
    `${scoreLine(hud)} Beat that: ${SHARE_URL}`
  );

  return (
    <section className="section" id="play" ref={wrapRef}>
      <div className="wrap">
        {!embedded && (
          <div className="head head--center reveal">
            <span className="eyebrow">Try Ring&rsquo;s job</span>
            <h2>Tring Squadron</h2>
            <p className="lead">
              Shoot the spam before it reaches your phone — but let the real calls
              through. <b>Ring does this every day, and never hits Maa.</b>
            </p>
          </div>
        )}

        <div className="sq reveal">
          <div className="sq__hud">
            <span className="sq__stat">Score <b>{hud.score}</b></span>
            <span className="sq__stat">Shot down <b>{hud.blocked}</b></span>
            {best > 0 && <span className="sq__stat sq__stat--best">Best <b>{best}</b></span>}
            <span className="sq__shields" aria-label={`${hud.shields} shields left`}>
              {[0, 1, 2].map((i) => (
                <i key={i} className={i < hud.shields ? "on" : ""} />
              ))}
            </span>
          </div>

          <div className="sq__stage">
            <canvas ref={canvasRef} className="sq__canvas" />

            {phase !== "playing" && (
              <div className="sq__overlay">
                {hasHero ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="sq__hero" src="/pilot.png" alt="Ring, suited up in the cockpit" />
                ) : (
                  <PilotBadge />
                )}

                {phase === "idle" ? (
                  <>
                    <h3>Ready for takeoff?</h3>
                    <p>
                      Move to aim — your fighter fires by itself. Hit{" "}
                      <span className="sq__spam">SPAM</span>, spare{" "}
                      <span className="sq__real">REAL</span>.
                    </p>
                    <button className="btn btn--coral" onClick={start}>Launch</button>
                    <span className="sq__keys">Drag, or use ← → / A D</span>
                  </>
                ) : (
                  <>
                    <h3>{hud.blocked === 1 ? "1 spam call down" : `${hud.blocked} spam calls down`}</h3>
                    <p>
                      You scored <b>{hud.score}</b>
                      {best > 0 && hud.score >= best
                        ? " — a new personal best. "
                        : ". "}
                      Ring flies this mission all day, in 12+ Indian languages, so you
                      never have to.
                    </p>

                    <div className="sq__share">
                      <button className="btn btn--coral" onClick={share}>Share my score</button>
                      <a
                        className="btn btn--ghost"
                        href={`https://wa.me/?text=${waText}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => track("game_share", { via: "whatsapp", score: hud.score })}
                      >
                        WhatsApp
                      </a>
                      <button className="btn btn--ghost" onClick={start}>Fly again</button>
                    </div>
                    {shared && <span className="sq__copied">{shared}</span>}

                    {!embedded && (
                      <a className="sq__cta" href="/go/play?p=game">
                        Let Ring take the controls — get the beta
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Stand-in hero art until public/pilot.png exists: Ring, helmeted. */
function PilotBadge() {
  return (
    <svg width="104" height="104" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="64" r="34" fill="#F4532E" />
      <circle cx="48" cy="60" r="7" fill="#fff" />
      <circle cx="72" cy="60" r="7" fill="#fff" />
      <circle cx="49.6" cy="61.4" r="3.2" fill="#000000" />
      <circle cx="73.6" cy="61.4" r="3.2" fill="#000000" />
      <ellipse cx="60" cy="80" rx="5" ry="6" fill="#fff" />
      {/* helmet */}
      <path d="M26 58a34 34 0 0 1 68 0v4a6 6 0 0 1-6 6h-8V58a26 26 0 0 0-40-0v10h-8a6 6 0 0 1-6-6Z" fill="#F1EDE8" />
      <path d="M58 24h6v34h-6z" fill="#F4532E" opacity=".85" />
      <rect x="24" y="60" width="12" height="20" rx="5" fill="#E2DAD2" />
      <rect x="84" y="60" width="12" height="20" rx="5" fill="#E2DAD2" />
      <path d="M84 78c6 4 8 10 6 16" stroke="#F1EDE8" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
