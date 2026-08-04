"use client";

/**
 * RingGame3D — "Tring Squadron", the 3D cut.
 *
 * You fly Ring's fighter down a corridor of incoming spam. Same pitch as the
 * 2D version, more sky: the point is still that Tring tells junk from Maa at
 * speed, all day, without you touching the phone.
 *
 * Three deliberate constraints, because this lives on a marketing page:
 *
 *  1. three.js is NEVER in the first load. The engine (core + scene + three,
 *     ~150KB gz) is dynamically imported the first time the section comes near
 *     the viewport, so someone who only reads the hero pays nothing for it.
 *  2. The render loop stops dead when the section scrolls away or the tab is
 *     hidden, and the run auto-pauses so nobody dies while they're in another
 *     tab. A landing page has no business draining a battery in the background.
 *  3. If WebGL is missing or the chunk fails to load, we fall back to the 2D
 *     canvas game rather than showing a dead box.
 *
 * The HUD is DOM, not canvas: it stays crisp, it's readable by a screen reader,
 * and it re-renders at ~12Hz instead of 60 so React isn't in the frame budget.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "./analytics";
import RingGame from "./RingGame";

const SHARE_URL =
  "https://heytring.com/?utm_source=game_share&utm_medium=social&utm_campaign=squadron";
const BEST_KEY = "tring_sq3d_best";

const EMPTY_HUD = {
  mode: "menu",
  score: 0,
  wave: 0,
  lives: 3,
  shield: 0,
  mult: 1,
  combo: 0,
  kills: 0,
  weapon: "STANDARD",
  wTimer: 0,
  dodgeCd: 0,
  boss: null,
  banner: null,
};

/** Cheap, cached WebGL probe — creating a throwaway context per render is not free. */
let webglOk = null;
function hasWebGL() {
  if (webglOk !== null) return webglOk;
  try {
    const c = document.createElement("canvas");
    webglOk = !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch (_) {
    webglOk = false;
  }
  return webglOk;
}

/**
 * The line that gets shared publicly, so it must never claim a run that didn't
 * happen. Sector and multiplier are only mentioned when they're actually worth
 * mentioning — "reached sector 1" reads like a loss, because it is one.
 */
function scoreLine({ score, wave, kills }) {
  const far = wave >= 5 ? ` and reached sector ${wave}` : "";
  const shot =
    kills === 0
      ? "I flew a whole sortie without landing a shot"
      : kills === 1
      ? "I shot down 1 spam call"
      : `I shot down ${kills} spam calls`;
  return `${shot}${far} — ${score} points flying for Tring Squadron 🚀`;
}

export default function RingGame3D({ embedded = false }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const inputRef = useRef({ ax: 0, ay: 0, dodge: false, boost: false });
  const pointerRef = useRef(null);
  const rafRef = useRef(0);
  const liveRef = useRef({ visible: false, focused: true, loaded: false });

  const [hud, setHud] = useState(EMPTY_HUD);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | failed
  const [shared, setShared] = useState("");
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch (_) {}
    setCoarse(
      typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches
    );
  }, []);

  /* ─────────────────────────────────────────── engine: load, run, tear down */

  useEffect(() => {
    if (!hasWebGL()) {
      setStatus("failed");
      return;
    }

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let dead = false;
    let core = null;
    let last = 0;
    let hudAt = 0;
    let lastMode = "menu";

    const live = liveRef.current;

    /* ---- the loop. Only ever running while the section is on screen. */
    function frame(now) {
      if (dead) return;
      rafRef.current = requestAnimationFrame(frame);
      const g = gameRef.current;
      const s = sceneRef.current;
      if (!g || !s || !core) return;

      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      // pointer steering resolves against the ship's live position, so a held
      // finger keeps pulling the ship toward it instead of snapping
      const target = pointerRef.current;
      if (target) {
        const i = inputRef.current;
        i.ax = Math.max(-1, Math.min(1, (target.x - g.player.x) / 4.5));
        i.ay = Math.max(-1, Math.min(1, (target.y - g.player.y) / 3.5));
      }

      core.update(g, dt, inputRef.current);
      inputRef.current.dodge = false; // edge-triggered: one roll per press
      s.render(g, dt);

      for (const ev of core.drainEvents(g)) {
        if (ev.type === "hurt" && navigator.vibrate) navigator.vibrate(45);
        else if (ev.type === "gameover") {
          const score = g.score;
          setBest((b) => {
            if (score > b) {
              try { localStorage.setItem(BEST_KEY, String(score)); } catch (_) {}
              return score;
            }
            return b;
          });
          track("game_over", { game: "squadron3d", score, wave: g.wave, kills: g.kills });
        }
      }

      // HUD at ~12Hz — React has no business in a 60fps budget. A mode change
      // (died, paused, launched) always flushes immediately.
      if (now - hudAt > 80 || g.mode !== lastMode) {
        hudAt = now;
        lastMode = g.mode;
        setHud({
          mode: g.mode,
          score: g.score,
          wave: g.wave,
          lives: g.lives,
          shield: g.player.shield,
          mult: g.mult,
          combo: g.combo,
          kills: g.kills,
          weapon: core.weaponLabel(g),
          wTimer: g.player.wTimer,
          dodgeCd: g.player.dodgeCd,
          boss: g.boss ? { hp: g.boss.hp, max: g.boss.maxHp } : null,
          banner: g.banner ? { ...g.banner } : null,
        });
      }
    }

    function start() {
      if (rafRef.current || dead) return;
      last = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    function stop() {
      if (!rafRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    function sync() {
      const on = live.visible && live.focused;
      if (on && live.loaded) start();
      else {
        stop();
        // never let someone lose a run to a scroll or a tab switch
        const g = gameRef.current;
        if (!on && g && g.mode === "playing") {
          g.mode = "paused";
          lastMode = "paused";
          // the HUD is only written from inside frame(), which we just cancelled —
          // push the pause through by hand so coming back shows "Holding position"
          // immediately instead of one stale frame of a live run.
          setHud((h) => ({ ...h, mode: "paused" }));
        }
      }
    }

    /* ---- size. The drawing buffer follows the box, capped at 2x DPR. */
    function fit() {
      const s = sceneRef.current;
      const r = canvas.getBoundingClientRect();
      if (s && r.width && r.height) s.resize(r.width, r.height);
    }
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    /* ---- lazy load: three arrives only when the section is worth the bytes */
    async function boot() {
      if (live.loaded || dead) return;
      setStatus("loading");
      try {
        const [c, sc] = await Promise.all([import("./game3d/core"), import("./game3d/scene")]);
        if (dead) return;
        core = c;
        gameRef.current = c.createGame();
        sceneRef.current = sc.createScene(canvas, { dpr: window.devicePixelRatio });
        fit();
        live.loaded = true;
        setStatus("ready");
        sync();
      } catch (err) {
        if (!dead) setStatus("failed");
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        live.visible = e.isIntersecting;
        if (e.isIntersecting) boot();
        sync();
      },
      { rootMargin: "220px 0px" }
    );
    io.observe(wrap);

    const onVis = () => {
      live.focused = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    /* ---- keyboard */
    const keys = new Set();
    function applyKeys() {
      const i = inputRef.current;
      i.ax = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0);
      i.ay = (keys.has("up") ? 1 : 0) - (keys.has("down") ? 1 : 0);
      i.boost = keys.has("boost");
    }
    const CODES = {
      ArrowLeft: "left", KeyA: "left",
      ArrowRight: "right", KeyD: "right",
      ArrowUp: "up", KeyW: "up",
      ArrowDown: "down", KeyS: "down",
      ShiftLeft: "boost", ShiftRight: "boost",
    };
    function onKeyDown(e) {
      const g = gameRef.current;
      if (!g || !live.visible) return;
      const k = CODES[e.code];
      if (k) {
        keys.add(k);
        applyKeys();
        pointerRef.current = null; // keyboard wins back control from the mouse
        e.preventDefault();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (g.mode === "playing") inputRef.current.dodge = true;
        else launch();
      } else if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        if (g.mode === "playing" || g.mode === "paused") core.togglePause(g);
      } else if (e.code === "Enter" && g.mode !== "playing") {
        e.preventDefault();
        launch();
      }
    }
    function onKeyUp(e) {
      const k = CODES[e.code];
      if (!k) return;
      keys.delete(k);
      applyKeys();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* ---- pointer / touch: drag anywhere on the stage to fly there */
    function toWorld(ev) {
      const r = canvas.getBoundingClientRect();
      const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
      const ny = 1 - ((ev.clientY - r.top) / r.height) * 2;
      return { x: nx * 15, y: ny * 9.5 };
    }
    function onDown(ev) {
      canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
      pointerRef.current = toWorld(ev);
    }
    function onMove(ev) {
      // touch only fires move while in contact, so this is safe for both:
      // hovering a mouse steers, dragging a finger steers, nothing else does.
      pointerRef.current = toWorld(ev);
    }
    function onUp() {
      pointerRef.current = null;
      inputRef.current.ax = 0;
      inputRef.current.ay = 0;
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onUp);

    function launch() {
      const g = gameRef.current;
      if (!g || !core) return;
      setShared("");
      core.startGame(g);
      track("game_start", { game: "squadron3d" });
    }
    wrap.__launch = launch;
    wrap.__toggle = () => {
      const g = gameRef.current;
      if (g && core) core.togglePause(g);
    };

    return () => {
      dead = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      sceneRef.current && sceneRef.current.dispose();
      sceneRef.current = null;
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coarse]);

  const launch = useCallback(() => wrapRef.current && wrapRef.current.__launch?.(), []);
  const toggle = useCallback(() => wrapRef.current && wrapRef.current.__toggle?.(), []);
  const press = useCallback((on) => () => {
    inputRef.current.dodge = on;
  }, []);

  const share = useCallback(async () => {
    const text = `${scoreLine(hud)} Beat that:`;
    track("game_share", { game: "squadron3d", score: hud.score, wave: hud.wave });
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

  // WebGL missing, or the engine chunk never arrived: the 2D game still works.
  if (status === "failed") return <RingGame embedded={embedded} />;

  const waText = encodeURIComponent(`${scoreLine(hud)} Beat that: ${SHARE_URL}`);
  const overlay = hud.mode !== "playing";
  const bossPct = hud.boss ? Math.max(0, hud.boss.hp / hud.boss.max) : 0;

  return (
    <section className="section" id="play" ref={wrapRef}>
      <div className="wrap">
        {!embedded && (
          <div className="head head--center reveal">
            <span className="eyebrow">Try Ring&rsquo;s job</span>
            <h2>Tring Squadron</h2>
            <p className="lead">
              Fly the line between your phone and the junk coming at it.{" "}
              <b>Ring does this every day, in 12+ Indian languages, without you lifting a finger.</b>
            </p>
          </div>
        )}

        <div className={`g3${embedded ? " g3--embed" : ""} reveal`}>
          {/* ── HUD ── */}
          <div className="g3__hud">
            <span className="g3__stat">
              Score <b>{hud.score}</b>
            </span>
            <span className="g3__stat">
              Sector <b>{hud.wave || 1}</b>
            </span>
            {hud.mult > 1 && <span className="g3__mult">×{hud.mult}</span>}
            {best > 0 && (
              <span className="g3__stat g3__stat--best">
                Best <b>{best}</b>
              </span>
            )}

            <span className="g3__right">
              <span className={`g3__weapon g3__weapon--${hud.weapon.toLowerCase()}`}>
                {hud.weapon}
                {hud.wTimer > 0 ? ` ${Math.ceil(hud.wTimer)}s` : ""}
              </span>
              <span className="g3__pips" aria-label={`${hud.shield} shields`}>
                {[0, 1, 2].map((i) => (
                  <i key={i} className={`g3__shield${i < hud.shield ? " on" : ""}`} />
                ))}
              </span>
              <span className="g3__pips" aria-label={`${hud.lives} lives left`}>
                {[0, 1, 2, 3, 4, 5].slice(0, Math.max(3, hud.lives)).map((i) => (
                  <i key={i} className={`g3__life${i < hud.lives ? " on" : ""}`} />
                ))}
              </span>
            </span>
          </div>

          {/* ── stage ── */}
          <div className="g3__stage">
            <canvas ref={canvasRef} className="g3__canvas" aria-label="Tring Squadron" />

            {hud.boss && (
              <div className="g3__boss">
                <span>SPAM NODE</span>
                <div className="g3__bossbar">
                  <i style={{ transform: `scaleX(${bossPct})` }} />
                </div>
              </div>
            )}

            {hud.banner && hud.mode === "playing" && (
              <div className={`g3__banner${hud.banner.danger ? " g3__banner--danger" : ""}`}>
                <strong>{hud.banner.text}</strong>
                <span>{hud.banner.sub}</span>
              </div>
            )}

            {hud.mode === "playing" && (
              <div className="g3__dodge" aria-hidden="true">
                <i style={{ transform: `scaleX(${1 - Math.min(1, hud.dodgeCd / 1.5)})` }} />
                <span>ROLL</span>
              </div>
            )}

            {status === "loading" && (
              <div className="g3__load">
                <span className="g3__spinner" />
                Spinning up the squadron&hellip;
              </div>
            )}

            {overlay && status === "ready" && (
              <div className="g3__overlay">
                {hud.mode === "menu" && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="g3__hero" src="/pilot.png" alt="Ring, suited up in the cockpit" />
                    <h3>Ready for takeoff?</h3>
                    <p>
                      Steer — your guns fire themselves. Grab <span className="g3__t g3__t--r">RAPID</span>,{" "}
                      <span className="g3__t g3__t--s">SPREAD</span> and{" "}
                      <span className="g3__t g3__t--b">SHIELDS</span>, fly the blue rings for bonus,
                      and roll to dodge.
                    </p>
                    <button className="btn btn--coral" onClick={launch}>
                      Launch
                    </button>
                    <span className="g3__keys">
                      {coarse ? "Drag to fly · tap ROLL to dodge" : "WASD / arrows · Shift boosts · Space rolls · P pauses"}
                    </span>
                  </>
                )}

                {hud.mode === "paused" && (
                  <>
                    <h3>Holding position</h3>
                    <p>Sector {hud.wave} · {hud.score} points on the board.</p>
                    <button className="btn btn--coral" onClick={toggle}>
                      Resume
                    </button>
                  </>
                )}

                {hud.mode === "dead" && (
                  <>
                    <h3>
                      {hud.kills === 1 ? "1 spam call down" : `${hud.kills} spam calls down`}
                    </h3>
                    <p>
                      You scored <b>{hud.score}</b> and reached sector <b>{hud.wave}</b>
                      {best > 0 && hud.score >= best ? " — a new personal best" : ""}. Ring flies
                      this mission all day, so you never have to.
                    </p>

                    <div className="g3__share">
                      <button className="btn btn--coral" onClick={share}>
                        Share my score
                      </button>
                      <a
                        className="btn btn--ghost"
                        href={`https://wa.me/?text=${waText}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => track("game_share", { via: "whatsapp", game: "squadron3d", score: hud.score })}
                      >
                        WhatsApp
                      </a>
                      <button className="btn btn--ghost" onClick={launch}>
                        Fly again
                      </button>
                    </div>
                    {shared && <span className="g3__copied">{shared}</span>}

                    {!embedded && (
                      <button className="g3__cta" data-beta="android" data-beta-placement="game">
                        Let Ring take the controls — get the beta
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* touch controls: the stage itself is the stick, this is the roll */}
            {coarse && hud.mode === "playing" && (
              <button
                className="g3__roll"
                onPointerDown={press(true)}
                onPointerUp={press(false)}
                aria-label="Barrel roll"
              >
                ROLL
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
