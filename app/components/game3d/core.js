/**
 * TRING SQUADRON 3D — game core
 * Pure logic. No three.js, no DOM, no React. Operates in world units.
 *
 * Axes:  +X right, +Y up, -Z into the screen (away from camera).
 * The player ship sits at z = 0; everything else flies toward +Z.
 */

const BOUND_X = 15;
const BOUND_Y = 9.5;
const SPAWN_Z = -210;
const DESPAWN_Z = 22;

export const PALETTE = {
  tring: 0xf2622e,
  tringDeep: 0xb8431a,
  cream: 0xfff3ec,
  hull: 0x9aa6b8,
  shield: 0x3fc1ff,
  rapid: 0xffc53d,
  spread: 0x3ddc97,
  life: 0xff5c8a,
  ring: 0x4fd8ff,
};

export const ENEMY_TYPES = {
  spambot: { hp: 2, r: 1.5, speed: 26, score: 10, fire: 0, pattern: "drift", color: 0xe2574c },
  robocall: { hp: 3, r: 1.5, speed: 44, score: 20, fire: 0, pattern: "weave", color: 0xff7043 },
  phisher: { hp: 3, r: 1.4, speed: 20, score: 35, fire: 0, pattern: "chase", color: 0x1abc9c },
  telemarketer: { hp: 8, r: 2.1, speed: 4, score: 55, fire: 1.5, pattern: "turret", color: 0x9b59b6 },
};

const WEAPONS = {
  single: { cd: 0.15, offs: [0], speed: 240, dmg: 1 },
  rapid: { cd: 0.07, offs: [-0.5, 0.5], speed: 275, dmg: 1 },
  spread: { cd: 0.2, offs: [-2.2, -0.7, 0.7, 2.2], speed: 230, dmg: 1, fan: 0.09 },
};

const POWERUP_KINDS = ["rapid", "spread", "shield", "life"];

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (a) => a[(Math.random() * a.length) | 0];
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------- factory */

export function createGame(opts = {}) {
  const g = {
    maxParticles: opts.maxParticles ?? 420,
    maxBullets: opts.maxBullets ?? 70,
    mode: "menu", // menu | playing | paused | dead
    time: 0,
    score: 0,
    best: 0,
    wave: 0,
    lives: 3,
    kills: 0,
    combo: 0,
    mult: 1,
    comboTimer: 0,
    shake: 0,
    flash: 0,
    hyper: 0, // 0..1 warp streak amount
    worldSpeed: 60,
    banner: null,
    spawnQueue: [],
    waveTimer: 0,
    clearTimer: 0,
    player: null,
    bullets: [],
    eBullets: [],
    enemies: [],
    powerups: [],
    rings: [],
    particles: [],
    boss: null,
    events: [],
  };
  resetRun(g);
  return g;
}

function resetRun(g) {
  Object.assign(g, {
    time: 0,
    score: 0,
    wave: 0,
    lives: 3,
    kills: 0,
    combo: 0,
    mult: 1,
    comboTimer: 0,
    shake: 0,
    flash: 0,
    hyper: 0,
    worldSpeed: 60,
    banner: null,
    spawnQueue: [],
    waveTimer: 0,
    clearTimer: 0,
    bullets: [],
    eBullets: [],
    enemies: [],
    powerups: [],
    rings: [],
    particles: [],
    boss: null,
  });
  g.player = {
    x: 0, y: 0, vx: 0, vy: 0, r: 1.35,
    roll: 0, pitch: 0,
    inv: 1.5, shield: 0,
    weapon: "single", wTimer: 0, cd: 0,
    boost: 0,   // 0..1 throttle blend
    dodge: 0,   // barrel-roll timer
    dodgeDir: 1,
    dodgeCd: 0,
  };
}

export function startGame(g) {
  resetRun(g);
  g.mode = "playing";
  startWave(g, 1);
  return g;
}

export function togglePause(g) {
  if (g.mode === "playing") g.mode = "paused";
  else if (g.mode === "paused") g.mode = "playing";
  return g;
}

function emit(g, type, payload) {
  if (g.events.length < 32) g.events.push({ type, ...payload });
}

export function drainEvents(g) {
  const e = g.events;
  g.events = [];
  return e;
}

/* ---------------------------------------------------------------- waves */

function isBossWave(w) {
  return w % 5 === 0;
}

function buildWave(wave) {
  const q = [];
  if (isBossWave(wave)) {
    for (let i = 0; i < 6; i++) {
      q.push({ t: 0.4 + i * 0.35, type: "spambot", x: rand(-9, 9), y: rand(-4, 5) });
    }
    q.push({ t: 3.2, type: "BOSS", x: 0, y: 1 });
    return q;
  }

  const pool = ["spambot"];
  if (wave >= 2) pool.push("robocall");
  if (wave >= 3) pool.push("phisher");
  if (wave >= 4) pool.push("telemarketer", "robocall");

  const count = Math.min(10 + wave * 3, 40);
  const gap = clamp(0.8 - wave * 0.035, 0.26, 0.8);
  let t = 0.6;

  for (let i = 0; i < count; i++) {
    // every third beat, drop a V formation instead of a single
    if (wave >= 2 && i % 6 === 5) {
      const cx = rand(-7, 7);
      const cy = rand(-3, 4);
      const type = pick(pool.filter((p) => p !== "telemarketer"));
      for (let k = -1; k <= 1; k++) {
        q.push({ t, type, x: cx + k * 3.4, y: cy + Math.abs(k) * 1.6 });
      }
      t += gap * 1.8;
    } else {
      q.push({ t, type: pick(pool), x: rand(-11, 11), y: rand(-5, 6) });
      t += rand(gap * 0.55, gap * 1.35);
    }
    if (i % 8 === 7) {
      q.push({ t: t + 0.2, type: "RING", x: rand(-6, 6), y: rand(-3, 4) });
      t += 0.9;
    }
  }
  return q;
}

function startWave(g, wave) {
  g.wave = wave;
  g.spawnQueue = buildWave(wave);
  g.waveTimer = 0;
  g.clearTimer = 0;
  g.worldSpeed = Math.min(60 + wave * 3, 105);
  g.hyper = 1;
  g.banner = isBossWave(wave)
    ? { text: "SPAM NODE INBOUND", sub: "Sector " + wave, t: 2.6, danger: true }
    : { text: "SECTOR " + wave, sub: sub(wave), t: 2.0, danger: false };
  emit(g, isBossWave(wave) ? "boss" : "wave");
}

function sub(w) {
  if (w === 1) return "Steer to fly · guns are automatic";
  if (w === 2) return "Robocall wings detected";
  if (w === 3) return "Phishers will lock on — roll to dodge";
  if (w === 4) return "Telemarketer turrets return fire";
  if (w === 6) return "Traffic density rising";
  return "Keep the line clean";
}

/* ------------------------------------------------------------ spawning */

function spawnEnemy(g, type, x, y) {
  const c = ENEMY_TYPES[type];
  const tier = 1 + Math.floor((g.wave - 1) / 4) * 0.6;
  g.enemies.push({
    id: Math.random(),
    type, x, y,
    z: SPAWN_Z - rand(0, 24),
    r: c.r,
    hp: Math.round(c.hp * tier),
    maxHp: Math.round(c.hp * tier),
    vz: c.speed,
    phase: rand(0, 6.28),
    spin: rand(-2, 2),
    fireCd: rand(1, 2.6),
    hit: 0,
    holdZ: type === "turret" ? 0 : -rand(40, 80),
    locked: false,
  });
}

function spawnRing(g, x, y) {
  g.rings.push({ x, y, z: SPAWN_Z, r: 4.2, phase: rand(0, 6.28), used: false });
}

function spawnBoss(g) {
  const tier = Math.floor(g.wave / 5);
  // Sim says a good pilot lands ~3 effective dps on the boss — most of the fight
  // is spent dodging its bursts and the spambots it spawns, not shooting. At the
  // original 90+75/tier that made fights of 51s / 75s / 163s against 14-22s for a
  // normal wave: a sponge, not a duel. This puts the first boss at ~25s and keeps
  // the growth gentle, because effective dps barely rises with tier.
  const hp = 52 + tier * 26;
  g.boss = {
    x: 0, y: 1, z: SPAWN_Z * 0.55,
    r: 6.2, hp, maxHp: hp, tier,
    phase: 0, dir: 1, entering: true,
    fireCd: 2.2, burst: 0, burstCd: 0, sweepCd: 6, hit: 0,
  };
}

/* ----------------------------------------------------------- particles */

function burst(g, x, y, z, color, count, power) {
  const room = g.maxParticles - g.particles.length;
  const n = Math.max(0, Math.min(count, room));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(rand(-1, 1));
    const s = rand(6, 6 + power);
    g.particles.push({
      x, y, z,
      vx: Math.sin(b) * Math.cos(a) * s,
      vy: Math.sin(b) * Math.sin(a) * s,
      vz: Math.cos(b) * s * 0.7,
      life: rand(0.35, 0.95),
      max: 0.95,
      size: rand(0.25, 0.75),
      color,
    });
  }
}

/* -------------------------------------------------------------- combat */

function fire(g) {
  const p = g.player;
  const w = WEAPONS[p.weapon];
  p.cd = w.cd;
  if (g.bullets.length > g.maxBullets) return;
  for (const off of w.offs) {
    g.bullets.push({
      x: p.x + off, y: p.y - 0.2, z: -2.2,
      vx: (w.fan || 0) * off * 12, vy: 0, vz: -w.speed,
      r: 0.55, dmg: w.dmg,
    });
  }
  emit(g, "shoot");
}

function addScore(g, base) {
  g.score += Math.round(base * g.mult);
}

function bumpCombo(g) {
  g.combo += 1;
  g.comboTimer = 3;
  g.mult = 1 + Math.min(4, Math.floor(g.combo / 5));
}

function breakCombo(g) {
  g.combo = 0;
  g.mult = 1;
}

function giveWeapon(g, kind) {
  const p = g.player;
  if (kind === "shield") p.shield = Math.min(3, p.shield + 2);
  else if (kind === "life") g.lives = Math.min(6, g.lives + 1);
  else {
    p.weapon = kind;
    p.wTimer = 12;
  }
  emit(g, "powerup", { kind });
}

function dropPowerup(g, x, y, z, chance) {
  if (Math.random() > chance) return;
  const kind = Math.random() < 0.12 ? "life" : pick(POWERUP_KINDS.slice(0, 3));
  g.powerups.push({ x, y, z, r: 1.4, kind, phase: rand(0, 6.28) });
}

function killEnemy(g, e, i) {
  const c = ENEMY_TYPES[e.type];
  burst(g, e.x, e.y, e.z, c.color, 26, 26);
  addScore(g, c.score);
  bumpCombo(g);
  g.kills++;
  g.shake = Math.max(g.shake, 0.35);
  dropPowerup(g, e.x, e.y, e.z, e.type === "telemarketer" ? 0.6 : 0.08);
  g.enemies.splice(i, 1);
  emit(g, "explode");
}

function hurtPlayer(g) {
  const p = g.player;
  if (p.inv > 0 || p.dodge > 0) return;
  if (p.shield > 0) {
    p.shield--;
    p.inv = 0.9;
    g.shake = 0.7;
    burst(g, p.x, p.y, 0, PALETTE.shield, 30, 22);
    emit(g, "shieldhit");
    return;
  }
  g.lives--;
  g.shake = 1.4;
  g.flash = 0.45;
  breakCombo(g);
  burst(g, p.x, p.y, 0, PALETTE.tring, 46, 30);
  emit(g, "hurt");
  if (g.lives <= 0) {
    g.mode = "dead";
    g.best = Math.max(g.best, g.score);
    g.banner = null;
    emit(g, "gameover");
  } else {
    p.inv = 2.2;
    p.weapon = "single";
    p.wTimer = 0;
  }
}

/* ---------------------------------------------------------------- boss */

function updateBoss(g, dt) {
  const b = g.boss;
  b.phase += dt;
  b.hit = Math.max(0, b.hit - dt * 4);

  if (b.entering) {
    b.z += 45 * dt;
    if (b.z >= -62) {
      b.z = -62;
      b.entering = false;
    }
    return;
  }

  const rage = 1 - b.hp / b.maxHp;
  b.x += b.dir * (7 + b.tier * 1.6 + rage * 7) * dt;
  if (b.x < -9) { b.x = -9; b.dir = 1; }
  if (b.x > 9) { b.x = 9; b.dir = -1; }
  b.y = 1 + Math.sin(b.phase * 0.8) * 2.4;
  b.z = -62 + Math.sin(b.phase * 0.5) * 8;

  b.fireCd -= dt;
  if (b.fireCd <= 0 && b.burst <= 0) {
    b.burst = 4;
    b.burstCd = 0;
    b.fireCd = Math.max(1.0, 2.6 - b.tier * 0.25 - rage);
  }
  if (b.burst > 0) {
    b.burstCd -= dt;
    if (b.burstCd <= 0) {
      b.burst--;
      b.burstCd = 0.14;
      aimedShot(g, b.x, b.y, b.z + 4, 105, 0.05, true);
    }
  }

  if (rage > 0.45) {
    b.sweepCd -= dt;
    if (b.sweepCd <= 0) {
      b.sweepCd = 4.2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + b.phase;
        g.eBullets.push({
          x: b.x, y: b.y, z: b.z + 4,
          vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, vz: 78,
          r: 0.7, boss: true,
        });
      }
      if (g.enemies.length < 8) {
        spawnEnemy(g, "spambot", b.x - 5, b.y);
        spawnEnemy(g, "spambot", b.x + 5, b.y);
      }
    }
  }
}

function aimedShot(g, x, y, z, speed, jitter, boss) {
  const p = g.player;
  const dx = p.x - x;
  const dy = p.y - y;
  const dz = 0 - z;
  const d = Math.hypot(dx, dy, dz) || 1;
  g.eBullets.push({
    x, y, z,
    vx: (dx / d) * speed + rand(-jitter, jitter) * speed,
    vy: (dy / d) * speed + rand(-jitter, jitter) * speed,
    vz: (dz / d) * speed,
    r: boss ? 0.75 : 0.6,
    boss: !!boss,
  });
}

function killBoss(g) {
  const b = g.boss;
  burst(g, b.x, b.y, b.z, 0xffd166, 90, 40);
  burst(g, b.x, b.y, b.z, PALETTE.tring, 60, 30);
  addScore(g, 900 + b.tier * 400);
  g.shake = 2.2;
  g.flash = 0.6;
  for (let i = 0; i < 3; i++) dropPowerup(g, b.x + rand(-4, 4), b.y, b.z, 1);
  g.boss = null;
  g.eBullets = [];
  emit(g, "bosskill");
}

/* -------------------------------------------------------------- update */

export function update(g, rawDt, input) {
  const dt = Math.min(rawDt, 0.04);
  g.time += dt;
  g.shake = Math.max(0, g.shake - dt * 3.2);
  g.flash = Math.max(0, g.flash - dt * 1.8);
  g.hyper = Math.max(0, g.hyper - dt * 0.9);

  updateParticles(g, dt);
  if (g.mode !== "playing") return g;

  if (g.banner) {
    g.banner.t -= dt;
    if (g.banner.t <= 0) g.banner = null;
  }

  const p = g.player;
  const inp = input || {};
  p.inv = Math.max(0, p.inv - dt);
  p.cd = Math.max(0, p.cd - dt);
  p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  if (p.wTimer > 0) {
    p.wTimer -= dt;
    if (p.wTimer <= 0) p.weapon = "single";
  }
  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) breakCombo(g);
  }

  // --- barrel roll (i-frames)
  if (inp.dodge && p.dodgeCd <= 0 && p.dodge <= 0) {
    p.dodge = 0.55;
    p.dodgeCd = 1.5;
    p.dodgeDir = (inp.ax || 0) < 0 ? -1 : 1;
    emit(g, "dodge");
  }
  if (p.dodge > 0) p.dodge = Math.max(0, p.dodge - dt);

  // --- flight model: accel toward stick, damped
  const ax = clamp(inp.ax || 0, -1, 1);
  const ay = clamp(inp.ay || 0, -1, 1);
  const accel = 165;
  const damp = 6.5;
  p.vx += ax * accel * dt;
  p.vy += ay * accel * dt;
  p.vx -= p.vx * damp * dt;
  p.vy -= p.vy * damp * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.x < -BOUND_X) { p.x = -BOUND_X; p.vx *= -0.25; }
  if (p.x > BOUND_X) { p.x = BOUND_X; p.vx *= -0.25; }
  if (p.y < -BOUND_Y) { p.y = -BOUND_Y; p.vy *= -0.25; }
  if (p.y > BOUND_Y) { p.y = BOUND_Y; p.vy *= -0.25; }

  p.roll = lerp(p.roll, clamp(-p.vx / 26, -1, 1), Math.min(1, dt * 7));
  p.pitch = lerp(p.pitch, clamp(p.vy / 34, -1, 1), Math.min(1, dt * 7));
  p.boost = lerp(p.boost, inp.boost ? 1 : 0, Math.min(1, dt * 4));

  if (p.cd <= 0) fire(g);

  // --- spawn queue
  g.waveTimer += dt;
  while (g.spawnQueue.length && g.spawnQueue[0].t <= g.waveTimer) {
    const s = g.spawnQueue.shift();
    if (s.type === "BOSS") spawnBoss(g);
    else if (s.type === "RING") spawnRing(g, s.x, s.y);
    else spawnEnemy(g, s.type, s.x, s.y);
  }

  const flow = g.worldSpeed * (1 + p.boost * 0.55);

  updateBullets(g, dt);
  updateEnemies(g, dt, flow);
  if (g.boss) updateBoss(g, dt);
  updateEnemyBullets(g, dt);
  updatePickups(g, dt, flow);
  collide(g);

  if (g.mode === "playing" && !g.spawnQueue.length && !g.enemies.length && !g.boss) {
    g.clearTimer += dt;
    if (g.clearTimer > 1.6) startWave(g, g.wave + 1);
  }
  return g;
}

function updateParticles(g, dt) {
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const q = g.particles[i];
    q.life -= dt;
    if (q.life <= 0) { g.particles.splice(i, 1); continue; }
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z += q.vz * dt;
    const d = 1 - dt * 1.8;
    q.vx *= d; q.vy *= d; q.vz *= d;
  }
}

function updateBullets(g, dt) {
  for (let i = g.bullets.length - 1; i >= 0; i--) {
    const b = g.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    if (b.z < SPAWN_Z - 30) g.bullets.splice(i, 1);
  }
}

function updateEnemyBullets(g, dt) {
  for (let i = g.eBullets.length - 1; i >= 0; i--) {
    const b = g.eBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    if (b.z > 14 || Math.abs(b.x) > 40 || Math.abs(b.y) > 30) g.eBullets.splice(i, 1);
  }
}

function updateEnemies(g, dt, flow) {
  const p = g.player;
  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];
    const c = ENEMY_TYPES[e.type];
    e.phase += dt;
    e.hit = Math.max(0, e.hit - dt * 5);

    if (c.pattern === "turret") {
      // slides in, then holds station and shoots
      if (e.z < e.holdZ) e.z += (flow + e.vz) * dt;
      else {
        e.z = e.holdZ + Math.sin(e.phase * 0.8) * 3;
        e.x += Math.sin(e.phase * 0.7) * 5 * dt;
      }
    } else {
      e.z += (flow + e.vz) * dt;
    }

    if (c.pattern === "weave") {
      e.x += Math.sin(e.phase * 2.6) * 9 * dt;
      e.y += Math.cos(e.phase * 1.9) * 5 * dt;
    } else if (c.pattern === "drift") {
      e.x += Math.sin(e.phase * 0.9) * 3 * dt;
    } else if (c.pattern === "chase") {
      if (e.z > -120) {
        const k = Math.min(1, dt * 1.5);
        e.x = lerp(e.x, p.x, k);
        e.y = lerp(e.y, p.y, k);
        e.locked = true;
      }
    }

    e.x = clamp(e.x, -BOUND_X - 3, BOUND_X + 3);
    e.y = clamp(e.y, -BOUND_Y - 3, BOUND_Y + 3);

    if (c.fire > 0 && e.z > -150) {
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        e.fireCd = c.fire * rand(0.75, 1.35);
        aimedShot(g, e.x, e.y, e.z + 2, 88, 0.03, false);
      }
    }

    if (e.z > DESPAWN_Z) {
      g.enemies.splice(i, 1);
      breakCombo(g);
    }
  }
}

function updatePickups(g, dt, flow) {
  for (let i = g.powerups.length - 1; i >= 0; i--) {
    const u = g.powerups[i];
    u.z += flow * 0.9 * dt;
    u.phase += dt * 3;
    if (u.z > DESPAWN_Z) g.powerups.splice(i, 1);
  }
  for (let i = g.rings.length - 1; i >= 0; i--) {
    const r = g.rings[i];
    r.z += flow * dt;
    r.phase += dt;
    if (r.z > DESPAWN_Z) g.rings.splice(i, 1);
  }
}

function near(a, b, extra) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  const r = a.r + b.r + (extra || 0);
  return dx * dx + dy * dy + dz * dz <= r * r;
}

function collide(g) {
  const p = g.player;
  const pBody = { x: p.x, y: p.y, z: 0, r: p.r };

  for (let i = g.bullets.length - 1; i >= 0; i--) {
    const b = g.bullets[i];
    let done = false;
    for (let j = g.enemies.length - 1; j >= 0; j--) {
      const e = g.enemies[j];
      if (Math.abs(e.z - b.z) > e.r + 4) continue;
      if (!near(b, e, 0.5)) continue;
      e.hp -= b.dmg;
      e.hit = 1;
      burst(g, b.x, b.y, b.z, 0xffe0b2, 5, 8);
      g.bullets.splice(i, 1);
      done = true;
      if (e.hp <= 0) killEnemy(g, e, j);
      else emit(g, "hit");
      break;
    }
    if (done) continue;
    if (g.boss && Math.abs(g.boss.z - b.z) < g.boss.r + 4 && near(b, g.boss, 0.5)) {
      g.boss.hp -= b.dmg;
      g.boss.hit = 1;
      burst(g, b.x, b.y, b.z, 0xffe0b2, 6, 10);
      g.bullets.splice(i, 1);
      if (g.boss.hp <= 0) killBoss(g);
      else emit(g, "hit");
    }
  }

  for (let i = g.eBullets.length - 1; i >= 0; i--) {
    const b = g.eBullets[i];
    if (Math.abs(b.z) > 3) continue;
    if (!near(b, pBody, -0.2)) continue;
    g.eBullets.splice(i, 1);
    hurtPlayer(g);
    if (g.mode !== "playing") return;
  }

  for (let j = g.enemies.length - 1; j >= 0; j--) {
    const e = g.enemies[j];
    if (Math.abs(e.z) > e.r + 2.5) continue;
    if (!near(e, pBody, -0.4)) continue;
    burst(g, e.x, e.y, e.z, ENEMY_TYPES[e.type].color, 22, 24);
    g.enemies.splice(j, 1);
    hurtPlayer(g);
    if (g.mode !== "playing") return;
  }

  if (g.boss && Math.abs(g.boss.z) < g.boss.r + 2 && near(g.boss, pBody, -1)) {
    hurtPlayer(g);
    if (g.mode !== "playing") return;
  }

  for (let i = g.powerups.length - 1; i >= 0; i--) {
    const u = g.powerups[i];
    if (Math.abs(u.z) > 3) continue;
    if (!near(u, pBody, 1.6)) continue;
    giveWeapon(g, u.kind);
    burst(g, u.x, u.y, 0, PALETTE[u.kind] || 0xffffff, 22, 16);
    addScore(g, 30);
    g.powerups.splice(i, 1);
  }

  for (const r of g.rings) {
    if (r.used || Math.abs(r.z) > 2.5) continue;
    const d = Math.hypot(r.x - p.x, r.y - p.y);
    if (d < r.r - 0.4) {
      r.used = true;
      addScore(g, 150);
      bumpCombo(g);
      burst(g, p.x, p.y, 0, PALETTE.ring, 26, 14);
      emit(g, "ring");
    }
  }
}

/* -------------------------------------------------------------- helpers */

export function weaponLabel(g) {
  const w = g.player.weapon;
  return w === "rapid" ? "RAPID" : w === "spread" ? "SPREAD" : "STANDARD";
}

export function shakeVec(g) {
  if (g.shake <= 0) return { x: 0, y: 0 };
  return { x: rand(-g.shake, g.shake) * 0.5, y: rand(-g.shake, g.shake) * 0.5 };
}
