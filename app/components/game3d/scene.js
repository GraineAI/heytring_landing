/**
 * TRING SQUADRON 3D — renderer
 *
 * Reads the game state produced by ./core and draws it. Nothing in here mutates
 * gameplay, so the sim stays deterministic and testable on its own.
 *
 * This module statically imports three, which is the point: the wrapper reaches
 * it through a dynamic import(), so ~150KB of WebGL never lands in the landing
 * page's first load. Everything is pooled — no geometry or material is created
 * after init, because a shmup allocating per bullet would sawtooth the GC.
 */

import * as THREE from "three";
import { PALETTE, ENEMY_TYPES, shakeVec } from "./core";

const POOL = { bullets: 90, eBullets: 120, enemies: 26, powerups: 10, rings: 5 };
const STARS = 700;
const STREAKS = 160;
const FAR = 260;

export function createScene(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: opts.antialias !== false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(opts.dpr || window.devicePixelRatio || 1, 2));
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0706);
  scene.fog = new THREE.Fog(0x0a0706, 90, 235);

  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 600);
  camera.position.set(0, 5.5, 27);
  camera.lookAt(0, 0.5, -40);
  scene.add(camera);

  scene.add(new THREE.AmbientLight(0xffe6db, 1.5));
  const key = new THREE.DirectionalLight(0xfff1e8, 2.1);
  key.position.set(4, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(PALETTE.tring, 1.4);
  rim.position.set(-6, -3, -12);
  scene.add(rim);

  const trash = [];
  const keep = (x) => (trash.push(x), x);
  const basic = (color, o) =>
    keep(new THREE.MeshBasicMaterial({ color, transparent: true, ...(o || {}) }));
  const solid = (color, o) =>
    keep(new THREE.MeshLambertMaterial({ color, ...(o || {}) }));

  /* ───────────────────────────────────────────── starfield + warp streaks */

  const starGeo = keep(new THREE.BufferGeometry());
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 190;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 120;
    starPos[i * 3 + 2] = -Math.random() * FAR;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    keep(new THREE.PointsMaterial({ color: 0xfdede7, size: 0.42, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }))
  );
  scene.add(stars);

  const streakGeo = keep(new THREE.BufferGeometry());
  const streakPos = new Float32Array(STREAKS * 6);
  const streakSeed = new Float32Array(STREAKS * 3);
  for (let i = 0; i < STREAKS; i++) {
    streakSeed[i * 3] = (Math.random() - 0.5) * 150;
    streakSeed[i * 3 + 1] = (Math.random() - 0.5) * 95;
    streakSeed[i * 3 + 2] = -Math.random() * FAR;
  }
  streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPos, 3));
  const streaks = new THREE.LineSegments(
    streakGeo,
    keep(new THREE.LineBasicMaterial({ color: 0xffc9b4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
  );
  scene.add(streaks);

  /* the corridor floor — reads as speed even when nothing else moves */
  const grid = keep(new THREE.GridHelper(420, 60, PALETTE.tringDeep, 0x2a1c15));
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  grid.material.depthWrite = false;
  grid.position.set(0, -14, -110);
  scene.add(grid);

  /* ──────────────────────────────────────────────────────────── the ship */

  const ship = new THREE.Group();
  const hullMat = solid(PALETTE.cream);
  const trimMat = solid(PALETTE.tring);

  const body = new THREE.Mesh(keep(new THREE.ConeGeometry(0.85, 4.4, 12)), hullMat);
  body.rotation.x = -Math.PI / 2;
  ship.add(body);

  const nose = new THREE.Mesh(keep(new THREE.ConeGeometry(0.5, 1.5, 12)), trimMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -2.7;
  ship.add(nose);

  const canopy = new THREE.Mesh(keep(new THREE.SphereGeometry(0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)), basic(PALETTE.ring, { opacity: 0.8 }));
  canopy.position.set(0, 0.42, -0.35);
  ship.add(canopy);

  const wingGeo = keep(new THREE.BoxGeometry(3.5, 0.16, 1.5));
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(wingGeo, hullMat);
    w.position.set(s * 2.1, -0.12, 0.5);
    w.rotation.z = s * 0.22;
    ship.add(w);
    const tip = new THREE.Mesh(keep(new THREE.BoxGeometry(0.5, 0.34, 1.9)), trimMat);
    tip.position.set(s * 3.6, 0.05, 0.5);
    ship.add(tip);
  }

  const fin = new THREE.Mesh(keep(new THREE.BoxGeometry(0.14, 1.15, 1.4)), trimMat);
  fin.position.set(0, 0.6, 1.75);
  ship.add(fin);

  const flameMat = basic(PALETTE.rapid, { opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(keep(new THREE.ConeGeometry(0.4, 2.2, 10)), flameMat);
    f.rotation.x = Math.PI / 2;
    f.position.set(s * 0.85, -0.1, 3.1);
    ship.add(f);
    flames.push(f);
  }

  const shieldBall = new THREE.Mesh(
    keep(new THREE.IcosahedronGeometry(2.5, 1)),
    basic(PALETTE.shield, { opacity: 0.22, wireframe: true, depthWrite: false })
  );
  shieldBall.visible = false;
  ship.add(shieldBall);
  scene.add(ship);

  /* ───────────────────────────────────────────────────────────── the pools */

  function pool(n, make) {
    const items = [];
    for (let i = 0; i < n; i++) {
      const m = make(i);
      m.visible = false;
      scene.add(m);
      items.push(m);
    }
    return items;
  }

  const bulletGeo = keep(new THREE.CapsuleGeometry(0.17, 1.5, 3, 6));
  const bulletMat = basic(0xffe3a8, { blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 });
  const bullets = pool(POOL.bullets, () => {
    const m = new THREE.Mesh(bulletGeo, bulletMat);
    m.rotation.x = Math.PI / 2;
    return m;
  });

  const eBulletGeo = keep(new THREE.SphereGeometry(0.55, 8, 6));
  const eBulletMat = basic(0xff5c8a, { blending: THREE.AdditiveBlending, depthWrite: false });
  const eBullets = pool(POOL.eBullets, () => new THREE.Mesh(eBulletGeo, eBulletMat));

  /* one pooled body per enemy type, so a Mesh is only ever re-pointed, never rebuilt */
  const enemyGeo = {
    spambot: keep(new THREE.IcosahedronGeometry(1.5, 0)),
    robocall: keep(new THREE.OctahedronGeometry(1.6, 0)),
    phisher: keep(new THREE.ConeGeometry(1.1, 3.2, 4)),
    telemarketer: keep(new THREE.DodecahedronGeometry(2.1, 0)),
  };
  const enemyMat = {};
  const enemyHitMat = {};
  for (const k of Object.keys(ENEMY_TYPES)) {
    enemyMat[k] = solid(ENEMY_TYPES[k].color);
    enemyHitMat[k] = basic(0xffffff, { opacity: 1 });
  }
  const enemies = pool(POOL.enemies, () => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(enemyGeo.spambot, enemyMat.spambot);
    g.add(core);
    const cage = new THREE.Mesh(
      keep(new THREE.TorusGeometry(2.1, 0.1, 6, 18)),
      basic(0xffffff, { opacity: 0.35, depthWrite: false })
    );
    g.add(cage);
    g.userData = { core, cage };
    return g;
  });

  const puGeo = keep(new THREE.BoxGeometry(1.5, 1.5, 1.5));
  const puMat = {
    rapid: basic(PALETTE.rapid, { opacity: 0.95 }),
    spread: basic(PALETTE.spread, { opacity: 0.95 }),
    shield: basic(PALETTE.shield, { opacity: 0.95 }),
    life: basic(PALETTE.life, { opacity: 0.95 }),
  };
  const powerups = pool(POOL.powerups, () => new THREE.Mesh(puGeo, puMat.rapid));

  const ringGeo = keep(new THREE.TorusGeometry(4.2, 0.22, 8, 40));
  const ringMat = basic(PALETTE.ring, { opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const ringMatUsed = basic(PALETTE.spread, { opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = pool(POOL.rings, () => new THREE.Mesh(ringGeo, ringMat));

  /* ─────────────────────────────────────────────────────────────── the boss */

  const boss = new THREE.Group();
  const bossCore = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(4.2, 1)), solid(0x7b3fa0));
  boss.add(bossCore);
  const bossRing = new THREE.Mesh(keep(new THREE.TorusGeometry(6.6, 0.75, 10, 34)), solid(0x3a2b4a));
  boss.add(bossRing);
  const bossEye = new THREE.Mesh(keep(new THREE.SphereGeometry(1.5, 16, 12)), basic(PALETTE.tring, { opacity: 1 }));
  bossEye.position.z = 3.6;
  boss.add(bossEye);
  boss.visible = false;
  scene.add(boss);

  /* ──────────────────────────────────────────────────────────── particles */

  const maxP = opts.maxParticles || 420;
  const pGeo = keep(new THREE.BufferGeometry());
  const pPos = new Float32Array(maxP * 3);
  const pCol = new Float32Array(maxP * 3);
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  pGeo.setDrawRange(0, 0);
  const particles = new THREE.Points(
    pGeo,
    keep(new THREE.PointsMaterial({ size: 0.8, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }))
  );
  particles.frustumCulled = false;
  scene.add(particles);

  /* white-out on damage — parented to the camera so it always fills the view */
  const flash = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(2, 2)),
    basic(0xffffff, { opacity: 0, depthTest: false, depthWrite: false })
  );
  flash.position.z = -0.2;
  flash.scale.set(0.3, 0.2, 1);
  flash.renderOrder = 999;
  camera.add(flash);

  const tmpColor = new THREE.Color();
  let t = 0;

  /* ───────────────────────────────────────────────────────────────── frame */

  function render(g, dt) {
    t += dt;

    // stars scroll and recycle; speed follows the sim so pausing really pauses
    const flow = (g.mode === "playing" ? g.worldSpeed : 12) * (1 + (g.player?.boost || 0) * 0.55);
    const sp = starGeo.attributes.position.array;
    for (let i = 2; i < sp.length; i += 3) {
      sp[i] += flow * dt;
      if (sp[i] > 30) {
        sp[i] -= FAR;
        sp[i - 2] = (Math.random() - 0.5) * 190;
        sp[i - 1] = (Math.random() - 0.5) * 120;
      }
    }
    starGeo.attributes.position.needsUpdate = true;

    const warp = Math.min(1, g.hyper + (g.player?.boost || 0) * 0.5);
    streaks.material.opacity = warp * 0.8;
    if (warp > 0.01) {
      const len = 6 + warp * 46;
      for (let i = 0; i < STREAKS; i++) {
        let z = streakSeed[i * 3 + 2] + ((t * 240) % FAR);
        if (z > 30) z -= FAR;
        const o = i * 6;
        streakPos[o] = streakSeed[i * 3];
        streakPos[o + 1] = streakSeed[i * 3 + 1];
        streakPos[o + 2] = z;
        streakPos[o + 3] = streakSeed[i * 3];
        streakPos[o + 4] = streakSeed[i * 3 + 1];
        streakPos[o + 5] = z - len;
      }
      streakGeo.attributes.position.needsUpdate = true;
    }
    grid.position.z = -110 + ((t * flow) % 14);

    // player
    const p = g.player;
    if (p) {
      ship.visible = g.mode !== "menu";
      ship.position.set(p.x, p.y, 0);
      ship.rotation.z = p.roll * 0.7 + (p.dodge > 0 ? p.dodgeDir * (1 - p.dodge / 0.55) * Math.PI * 2 : 0);
      ship.rotation.x = -p.pitch * 0.3;
      ship.rotation.y = -p.roll * 0.15;
      // i-frames blink, but never leave the ship invisible on the frame you need it
      const blink = p.inv > 0 && Math.sin(t * 32) < 0 ? 0.28 : 1;
      hullMat.opacity = blink;
      hullMat.transparent = blink < 1;
      const th = 0.75 + (p.boost || 0) * 0.9 + Math.sin(t * 30) * 0.12;
      for (const f of flames) f.scale.set(1, th, 1);
      flameMat.opacity = 0.55 + th * 0.35;
      shieldBall.visible = p.shield > 0;
      if (shieldBall.visible) {
        shieldBall.rotation.y += dt * 1.4;
        shieldBall.rotation.x += dt * 0.9;
        shieldBall.material.opacity = 0.16 + p.shield * 0.07;
      }
    }

    // bullets
    for (let i = 0; i < bullets.length; i++) {
      const b = g.bullets[i];
      const m = bullets[i];
      if (!b) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(b.x, b.y, b.z);
    }
    for (let i = 0; i < eBullets.length; i++) {
      const b = g.eBullets[i];
      const m = eBullets[i];
      if (!b) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(b.x, b.y, b.z);
      const s = b.boss ? 1.35 : 1;
      m.scale.setScalar(s * (1 + Math.sin(t * 14 + b.x) * 0.12));
    }

    // enemies
    for (let i = 0; i < enemies.length; i++) {
      const e = g.enemies[i];
      const m = enemies[i];
      if (!e) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(e.x, e.y, e.z);
      m.rotation.y += dt * (1.2 + e.spin);
      m.rotation.x = e.phase * 0.6;
      const core = m.userData.core;
      core.geometry = enemyGeo[e.type];
      core.material = e.hit > 0.35 ? enemyHitMat[e.type] : enemyMat[e.type];
      if (e.type === "phisher") core.rotation.x = -Math.PI / 2;
      else core.rotation.x = 0;
      const hurt = e.maxHp > 1 ? e.hp / e.maxHp : 1;
      m.userData.cage.visible = e.type === "telemarketer" || e.locked;
      m.userData.cage.material.opacity = e.locked ? 0.2 + Math.sin(t * 10) * 0.15 : 0.3 * hurt;
      m.userData.cage.rotation.x = t * 1.7;
      m.scale.setScalar(e.hit > 0 ? 1 + e.hit * 0.18 : 1);
    }

    // pickups
    for (let i = 0; i < powerups.length; i++) {
      const u = g.powerups[i];
      const m = powerups[i];
      if (!u) { m.visible = false; continue; }
      m.visible = true;
      m.material = puMat[u.kind] || puMat.rapid;
      m.position.set(u.x, u.y + Math.sin(u.phase) * 0.4, u.z);
      m.rotation.set(u.phase * 0.8, u.phase, 0);
    }
    for (let i = 0; i < rings.length; i++) {
      const r = g.rings[i];
      const m = rings[i];
      if (!r) { m.visible = false; continue; }
      m.visible = true;
      m.material = r.used ? ringMatUsed : ringMat;
      m.position.set(r.x, r.y, r.z);
      m.rotation.z = r.phase * 0.8;
      m.scale.setScalar(r.used ? 1.25 : 1 + Math.sin(r.phase * 3) * 0.03);
    }

    // boss
    if (g.boss) {
      const b = g.boss;
      boss.visible = true;
      boss.position.set(b.x, b.y, b.z);
      bossCore.rotation.y += dt * 0.6;
      bossCore.rotation.x += dt * 0.25;
      bossRing.rotation.z += dt * 1.1;
      bossRing.rotation.x = Math.PI / 2.4 + Math.sin(t * 0.6) * 0.2;
      bossCore.material.color.setHex(b.hit > 0.4 ? 0xffffff : 0x7b3fa0);
      bossEye.material.color.setHex(b.hp / b.maxHp < 0.45 ? 0xff2d55 : PALETTE.tring);
      bossEye.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
    } else {
      boss.visible = false;
    }

    // particles
    const list = g.particles;
    const n = Math.min(list.length, maxP);
    for (let i = 0; i < n; i++) {
      const q = list[i];
      pPos[i * 3] = q.x;
      pPos[i * 3 + 1] = q.y;
      pPos[i * 3 + 2] = q.z;
      tmpColor.setHex(q.color);
      const f = Math.max(0, q.life / q.max);
      pCol[i * 3] = tmpColor.r * f;
      pCol[i * 3 + 1] = tmpColor.g * f;
      pCol[i * 3 + 2] = tmpColor.b * f;
    }
    pGeo.setDrawRange(0, n);
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    // camera: chase the ship a little, then shake
    const sv = shakeVec(g);
    const px = p ? p.x : 0;
    const py = p ? p.y : 0;
    camera.position.x += (px * 0.22 + sv.x - camera.position.x) * Math.min(1, dt * 6);
    camera.position.y += (5.5 + py * 0.16 + sv.y - camera.position.y) * Math.min(1, dt * 6);
    camera.rotation.z = -(p ? p.roll : 0) * 0.045 + sv.x * 0.01;
    flash.material.opacity = Math.min(0.55, g.flash);

    renderer.render(scene, camera);
  }

  function resize(w, h) {
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function dispose() {
    for (const x of trash) x.dispose && x.dispose();
    renderer.dispose();
  }

  return { render, resize, dispose, renderer, camera, scene };
}
