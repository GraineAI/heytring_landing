"use client";

/**
 * RingGame — "Do Ring's job": a playable arcade section. Call cards rain
 * down toward the phone; tap the spam before it reaches the bottom and
 * makes the phone ring, but never block the good calls (Maa!). Three
 * missed spam calls and it's over — which is exactly the pitch: Ring
 * does this all day so you don't have to. GSAP-driven, mouse + touch,
 * with a subtle 3D tilt on the board.
 */
import { useEffect, useRef, useState } from "react";
import { Ring } from "./Mascot";

const SPAM = [
  ["🎰", "Lucky draw!"], ["💸", "Loan offer"], ["🛡️", "Insurance deal"],
  ["📢", "Sales call"], ["🃏", "You won a prize"], ["🪙", "Crypto tips"],
];
const GOOD = [
  ["👩", "Maa"], ["📦", "Delivery"], ["🏥", "Apollo Clinic"],
  ["🛵", "Blinkit"], ["👮", "Watchman"],
];

export default function RingGame() {
  const boardRef = useRef(null);
  const sceneRef = useRef(null);
  const [phase, setPhase] = useState("idle");   // idle | playing | over
  const [score, setScore] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [lives, setLives] = useState(3);
  const g = useRef({ gsap: null, timers: [], tweens: new Set(), live: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const gsap = (await import("gsap")).default;
      if (!cancelled) g.current.gsap = gsap;
    })();
    return () => { cancelled = true; stopAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = () => {
    g.current.timers.forEach(clearTimeout);
    g.current.timers = [];
    g.current.tweens.forEach((t) => t.kill());
    g.current.tweens.clear();
    if (boardRef.current) {
      boardRef.current.querySelectorAll(".rg-card, .rg-toast").forEach((el) => el.remove());
    }
  };

  const toast = (text, x, y, bad = false) => {
    const gsap = g.current.gsap;
    const el = document.createElement("span");
    el.className = "rg-toast" + (bad ? " rg-toast--bad" : "");
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    boardRef.current.appendChild(el);
    gsap.fromTo(el, { y: 0, autoAlpha: 1 }, {
      y: -34, autoAlpha: 0, duration: 0.9, ease: "power1.out",
      onComplete: () => el.remove(),
    });
  };

  const end = () => {
    const s = g.current.live;
    stopAll();
    setScore(s.score);
    setBlocked(s.blocked);
    setPhase("over");
  };

  const spawn = () => {
    const gsap = g.current.gsap;
    const s = g.current.live;
    const board = boardRef.current;
    if (!gsap || !board || !s || s.done) return;

    const isSpam = Math.random() < 0.6;
    const [ic, label] = (isSpam ? SPAM : GOOD)[Math.floor(Math.random() * (isSpam ? SPAM.length : GOOD.length))];
    const el = document.createElement("button");
    el.type = "button";
    el.className = "rg-card" + (isSpam ? " rg-card--spam" : " rg-card--good");
    el.innerHTML = `<span class="ic">${ic}</span><span class="lb">${label}</span>`;
    const bw = board.clientWidth;
    el.style.left = `${16 + Math.random() * (bw - 160)}px`;
    board.appendChild(el);

    const fallTime = Math.max(2.2, 4.2 - s.wave * 0.14);
    const tween = gsap.fromTo(el, { y: -64 }, {
      y: board.clientHeight - 46,
      duration: fallTime,
      ease: "none",
      onComplete: () => {
        // reached the phone
        el.remove();
        if (s.done) return;
        if (isSpam) {
          s.lives -= 1;
          setLives(s.lives);
          gsap.fromTo(".rg-phone", { x: -4 }, { x: 4, duration: 0.06, repeat: 7, yoyo: true, clearProps: "x" });
          toast("It rang! 🔔", parseFloat(el.style.left), board.clientHeight - 80, true);
          if (s.lives <= 0) { s.done = true; end(); }
        } else {
          s.score += 5;
          setScore(s.score);
          toast("Ring handled it +5", parseFloat(el.style.left), board.clientHeight - 80);
        }
      },
    });
    g.current.tweens.add(tween);

    el.addEventListener("pointerdown", () => {
      if (s.done) return;
      tween.kill();
      g.current.tweens.delete(tween);
      const x = parseFloat(el.style.left);
      const y = (g.current.gsap.getProperty(el, "y") || 0);
      if (isSpam) {
        s.score += 10;
        s.blocked += 1;
        setScore(s.score);
        setBlocked(s.blocked);
        toast("Blocked +10", x, y);
      } else {
        s.score -= 15;
        setScore(s.score);
        toast(label === "Maa" ? "You blocked MAA?! −15" : "That one mattered −15", x, y, true);
      }
      gsap.to(el, { scale: 0.6, autoAlpha: 0, duration: 0.18, onComplete: () => el.remove() });
    }, { once: true });

    // next wave, faster each time
    s.wave += 1;
    const next = Math.max(420, 1150 - s.wave * 26);
    g.current.timers.push(setTimeout(spawn, next));
  };

  const start = () => {
    if (!g.current.gsap) return;
    stopAll();
    g.current.live = { score: 0, blocked: 0, lives: 3, wave: 0, done: false };
    setScore(0); setBlocked(0); setLives(3);
    setPhase("playing");
    spawn();
  };

  // subtle 3D tilt on pointer
  const tilt = (e) => {
    const gsap = g.current.gsap;
    const el = sceneRef.current;
    if (!gsap || !el) return;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
    gsap.to(el, { rotateX: rx, rotateY: ry, duration: 0.4, ease: "power2.out" });
  };
  const untilt = () => {
    const gsap = g.current.gsap;
    if (gsap && sceneRef.current) gsap.to(sceneRef.current, { rotateX: 0, rotateY: 0, duration: 0.6 });
  };

  return (
    <section className="section" id="play">
      <div className="wrap">
        <div className="head head--center reveal">
          <span className="eyebrow">Try Ring&rsquo;s job</span>
          <h2>Block the spam. Never block Maa.</h2>
          <p className="lead">
            Tap the junk calls before they reach the phone. Three get through
            and you lose. <b>Ring does this all day, every day.</b>
          </p>
        </div>

        <div className="rg-scenewrap reveal" onMouseMove={tilt} onMouseLeave={untilt}>
          <div className="rg-scene" ref={sceneRef}>
            <div className="rg-hud">
              <span className="rg-stat">Score <b>{score}</b></span>
              <span className="rg-stat">Blocked <b>{blocked}</b></span>
              <span className="rg-lives" aria-label={`${lives} lives left`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`rg-life${i < lives ? " on" : ""}`}>📞</span>
                ))}
              </span>
            </div>

            <div className="rg-board" ref={boardRef}>
              {phase !== "playing" && (
                <div className="rg-overlay">
                  {phase === "idle" ? (
                    <>
                      <Ring size={86} state="idle" />
                      <h3>Ready to be Ring?</h3>
                      <p>Tap spam ✕ · let the good ones through ✓</p>
                      <button className="btn btn--coral" onClick={start}>Start</button>
                    </>
                  ) : (
                    <>
                      <Ring size={86} state={blocked > 5 ? "happy" : "idle"} />
                      <h3>You blocked {blocked} spam calls.</h3>
                      <p>
                        Score: <b>{score}</b>. Tiring, right? Ring does this
                        every single day — without ever missing Maa.
                      </p>
                      <div className="rg-endcta">
                        <button className="btn btn--coral" data-beta="android" data-beta-placement="game">
                          Let Ring do it — get the beta
                        </button>
                        <button className="btn btn--ghost" onClick={start}>Play again</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="rg-phone" aria-hidden="true">
                <Ring size={54} state={phase === "playing" ? "talking" : "idle"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
