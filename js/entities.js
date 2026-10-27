'use strict';
// Oyuncu, canavarlar, hasar, ganimet, parçacıklar

// ───────────── Uzamsal ızgara ─────────────
G.Grid = {
  cs: 80, m: new Map(), stamp: 0,
  key: (cx, cy) => (cx + 50000) * 100003 + (cy + 50000),
  build(list) {
    this.m.clear();
    const cs = this.cs;
    for (const e of list) {
      if (e.dead) continue;
      const r = e.rad > 30 ? e.rad : 0;
      const x0 = Math.floor((e.x - r) / cs), x1 = Math.floor((e.x + r) / cs);
      const y0 = Math.floor((e.y - r) / cs), y1 = Math.floor((e.y + r) / cs);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
        const k = this.key(cx, cy);
        let a = this.m.get(k);
        if (!a) this.m.set(k, (a = []));
        a.push(e);
      }
    }
  },
  query(x, y, r, fn) {
    const cs = this.cs, st = ++this.stamp;
    const x0 = Math.floor((x - r - 30) / cs), x1 = Math.floor((x + r + 30) / cs);
    const y0 = Math.floor((y - r - 30) / cs), y1 = Math.floor((y + r + 30) / cs);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.m.get(this.key(cx, cy));
      if (!a) continue;
      for (const e of a) {
        if (e._q === st || e.dead) continue;
        e._q = st;
        fn(e);
      }
    }
  },
};

const isLiquid = (k) => k === G.K.WATER || k === G.K.SWAMP || k === G.K.LAVA;

// anim adı + kare: ilerleme (0..1) verilirse tek seferlik, yoksa döngü
G.animOf = (spr, a, prog, t) => {
  const list = spr.anim && spr.anim[a];
  if (!list) return { a: null, f: Math.floor(t || 0) };
  if (prog !== null && prog !== undefined) return { a, f: Math.min(list.length - 1, Math.floor(prog * list.length)) };
  return { a, f: Math.floor(t || 0) };
};

// canlı 3B figürler küçük çizilir; etiket/gölge onun boyuna göre
G.liveTop = (spr, id) => (G.Live && G.Live.has(id) ? spr.top * 1.1 : spr.top);
G.liveShadow = (spr, id, x, y, fly) => { const w = (spr.rad || 12) * 1.15; G.R.shadow(x + w * 0.35, y + spr.ph / 2 + (fly ? 18 : 0), w, w * 0.42, fly ? 0.45 : 0.8); };

// ───────────── Oyuncu ─────────────
G.makePlayer = (cls, sv) => {
  const c = G.CLASSES[cls];
  const p = {
    x: sv ? sv.x : 60, y: sv ? sv.y : 40, cls, spr: G.SPR[c.body], lv: sv ? sv.lv : 1, xp: sv ? sv.xp : 0,
    gold: sv ? sv.gold : 20, wup: sv ? sv.wup : 0, aup: sv ? sv.aup : 0, pots: sv ? { ...sv.pots } : { hp: 3, mp: 2 },
    cd: [0, 0, 0, 0], buff: { armor: 0, might: 0 }, queue: [], dash: null, whirl: 0, whirlT: 0,
    facing: 1, dirX: 1, dirY: 0, iframe: 0, anim: 0, moving: false, rad: 12, combatT: 0, stepT: 0, stats: { might: 1, crit: 0.1 },
  };
  G.recalc(p);
  p.hp = p.maxHp; p.mp = p.maxMp;
  return p;
};

G.recalc = (p) => {
  const c = G.CLASSES[p.cls], l = p.lv - 1;
  p.maxHp = Math.round((c.base.hp + c.per.hp * l) * (1 + 0.05 * p.aup));
  p.maxMp = Math.round(c.base.mp + c.per.mp * l);
  p.atk = (c.base.atk + c.per.atk * l) * (1 + 0.12 * p.wup);
  p.armor = c.base.armor + c.per.armor * l + p.aup * 4;
  p.speed = c.base.speed;
  p.hp = Math.min(p.hp ?? p.maxHp, p.maxHp); p.mp = Math.min(p.mp ?? p.maxMp, p.maxMp);
};

G.updatePlayer = (p, dt) => {
  const S = G.S, t = performance.now() / 1000;
  for (let i = 0; i < 4; i++) p.cd[i] = Math.max(0, p.cd[i] - dt);
  p.buff.armor = Math.max(0, p.buff.armor - dt); p.buff.might = Math.max(0, p.buff.might - dt);
  p.stats.might = p.buff.might > 0 ? 1.4 : 1;
  for (let i = p.queue.length - 1; i >= 0; i--) if ((p.queue[i].t -= dt) <= 0) { const q = p.queue.splice(i, 1)[0]; q.fn(); }
  p.iframe = Math.max(0, p.iframe - dt);
  p.atkAnim = Math.max(0, (p.atkAnim || 0) - dt); p.idleT = (p.idleT || 0) + dt;
  p.combatT = Math.max(0, p.combatT - dt);

  const fy = p.y + p.spr.ph / 2 - 3;
  const kind = G.Ground.kindAt(p.x, fy);
  p.inWater = isLiquid(kind);
  const px = p.x, mv = G.moveVec();
  let vx = 0, vy = 0;
  if (p.dash) {
    const d = p.dash;
    vx = d.vx; vy = d.vy; d.t -= dt;
    G.Grid.query(p.x, p.y, 34, (e) => {
      if (d.hit.has(e.id) || G.dist2(e.x, e.y, p.x, p.y) > (34 + e.rad) ** 2) return;
      d.hit.add(e.id);
      const l = Math.hypot(d.vx, d.vy);
      G.damage(e, d.dmg, { kb: 420, kx: d.vx / l, ky: d.vy / l });
    });
    G.addPart(p.x - Math.sign(vx) * 10, p.y, G.rand(-20, 20), G.rand(-30, 0), G.pick(['-', '=', '.']), '#9ab8ff', 0.3, { glow: 1 });
    if (d.t <= 0) p.dash = null;
  } else {
    // Shift basılıyken koşar
    p.running = !!(G.keys.ShiftLeft || G.keys.ShiftRight) && (mv.x !== 0 || mv.y !== 0);
    const spd = 150 * p.speed * (p.inWater ? 0.62 : 1) * (p.whirl > 0 ? 0.85 : 1) * (p.running ? 1.6 : 1);
    vx = mv.x * spd; vy = mv.y * spd;
  }
  p.x += vx * dt; p.y += vy * dt;
  G.World.collide(p, px);
  p.moving = mv.x !== 0 || mv.y !== 0;
  if (p.moving) { p.dirX = mv.x; p.dirY = mv.y; if (mv.x && !p.dash) p.facing = mv.x > 0 ? 1 : -1; p.anim += dt * p.spr.fps; } else p.anim = 0;

  // zeminle etkileşim
  if (p.inWater) {
    if (p.moving) G.Ground.splash(p.x, fy, 0.07 * dt * 60, 1);
    else if (Math.random() < dt * 1.5) G.Ground.splash(p.x + G.rand(-6, 6), fy, 0.12, 0);
    if (p.moving && Math.random() < dt * 14) {
      const lava = kind === G.K.LAVA;
      G.addPart(p.x + G.rand(-10, 10), fy, -mv.x * G.rand(10, 50) + G.rand(-20, 20), -G.rand(30, 80), G.pick(['~', '.', '\'', ',']),
        lava ? G.pick(['#ffb040', '#ff6a1a']) : G.pick(['#8ac8ff', '#c8e8ff', '#5a9ad8']), G.rand(0.3, 0.5), { grav: 420, glow: lava ? 1 : 0 });
    }
    if (kind === G.K.LAVA) G.hurtPlayer(10, true);
  } else {
    G.Ground.push(p.x, fy, p.moving ? 36 : 28, vx, vy, dt); // alan ≈ karakterin genişliği
    if (p.moving && (p.stepT -= dt) <= 0) {
      p.stepT = 0.08;
      const grass = kind === G.K.GRASS || kind === G.K.DRY;
      for (let i = 0; i < 2; i++)
        G.addPart(p.x + G.rand(-8, 8), fy, -mv.x * G.rand(20, 60) + G.rand(-20, 20), -G.rand(30, 90),
          grass ? G.pick(['\'', ',', '`', '"']) : G.pick(['.', ',', '`']),
          grass ? G.pick(['#5a9a44', '#3e7a32', '#7aac58']) : G.pick(['#6a5844', '#4e4234']), G.rand(0.3, 0.55), { grav: 420, drag: 0.4 });
    }
  }

  // kasırga
  if (p.whirl > 0) {
    p.whirl -= dt; p.whirlT -= dt;
    if (p.whirlT <= 0) { p.whirlT = 0.22; G.slash(p, Math.random() * 6.28, 76, Math.PI, p.atk * 0.7, '#ff5a3a', true); }
  }
  // yenilenme
  p.mp = Math.min(p.maxMp, p.mp + (1.5 + p.maxMp * 0.012) * dt);
  if (p.combatT <= 0) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.025 * dt);
  void t; void S;
};

G.hurtPlayer = (dmg, env) => {
  const S = G.S, p = S.player;
  if (p.iframe > 0 || S.dead || S.over) return;
  const arm = p.armor + (p.buff.armor > 0 ? 30 : 0);
  dmg = Math.max(1, Math.round(dmg * (60 / (60 + arm))));
  p.hp -= dmg; p.iframe = env ? 0.5 : 0.3; p.combatT = 5;
  G.R.shake(env ? 2 : 5); G.SFX.play('hurt');
  G.addFloat(p.x, p.y - p.spr.ph / 2 - 6, '-' + dmg, '#ff4a4a', !env);
  S.hurtFlash = 0.22;
  if (p.hp <= 0) { p.hp = 0; G.playerDie(); }
};

G.gainXP = (v) => {
  const S = G.S, p = S.player;
  if (p.lv >= G.MAX_LV) return;
  p.xp += v;
  G.addFloat(p.x + 20, p.y - p.spr.ph / 2, '+' + v + ' xp', '#9ad8ff');
  while (p.lv < G.MAX_LV && p.xp >= G.xpFor(p.lv)) {
    p.xp -= G.xpFor(p.lv); p.lv++;
    G.recalc(p); p.hp = p.maxHp; p.mp = p.maxMp;
    G.banner('SEVİYE ' + p.lv, '#ffd84a');
    G.ringFx(p.x, p.y, 110, '#ffd84a', 0.7, '*');
    G.SFX.play('level');
    const c = G.CLASSES[p.cls];
    c.skills.forEach((id, i) => { if (G.SKILLS[id].lv === p.lv) G.toast(`Yeni yetenek: ${G.SKILLS[id].name}  [${i}]`); });
    G.save();
  }
};

G.drawPlayer = (p) => {
  const R = G.R;
  const blink = p.iframe > 0 && !p.dash && Math.floor(p.iframe * 20) % 2 === 0;
  const sx = R.toScreenX(p.x), sy = R.toScreenY(p.y);
  const clip = p.inWater ? p.spr.mr + p.spr.h - 3 : undefined;
  const pa = G.animOf(p.spr, p.atkAnim > 0 ? 'attack' : p.moving ? 'walk' : 'idle', p.atkAnim > 0 ? 1 - p.atkAnim / 0.45 : null, p.moving ? p.anim : p.idleT * 6);
  if (!(G.Live && G.Live.has(p.cls))) R.sprite(p.spr, pa.f, p.x, p.y, { flip: p.facing < 0, alpha: blink ? 0.45 : 1, clip, self: true, anim: pa.a });
  if (p.buff.armor > 0) for (let i = 0; i < 10; i++) {
    const a = i / 10 * 6.28 + G.S.t * 2;
    R.g(i % 2 ? '+' : '.', sx + Math.cos(a) * 28, sy + Math.sin(a) * 18, '#ffd84a', 0.7, '#ffd84a', 2);
  }
  R.text(`${G.CLASSES[p.cls].name} ${p.lv}`, sx, sy + p.spr.ph / 2 - G.liveTop(p.spr, p.cls) - 10, '#e8e4dc', 11, 'center', 700, 0.9);
};

// ───────────── Canavarlar ─────────────
G.spawnMonster = (type, x, y, lv, camp) => {
  const S = G.S, d = G.MONSTERS[type], st = G.monsterStats(d, lv), spr = G.SPR[d.body] && G.SPR[d.body].ready ? G.SPR[d.body] : G.Bake.now(d.body);
  const e = {
    id: ++S.eid, type, d, spr, x, y, kx: 0, ky: 0, hp: st.hp, maxHp: st.hp, dmg: st.dmg, xp: st.xp, lv,
    spd: d.spd * G.rand(0.9, 1.1), rad: spr.rad, homeX: x, homeY: y, camp, state: camp ? 'idle' : 'chase',
    wanderT: G.rand(0.5, 3), tx: x, ty: y, atkT: 0, stun: 0, flash: 0, anim: Math.random() * 10, flip: Math.random() < 0.5,
    burn: 0, burnDps: 0, burnTick: 0, hitT: 0, st: 0, timer: G.rand(0.5, 2), ax: 0, ay: 0, dead: false, wob: Math.random() * 6.28,
  };
  S.enemies.push(e);
  return e;
};

G.aggro = (e) => {
  if (e.state === 'chase' || G.S.dead) return;
  e.state = 'chase';
  if (e.camp) for (const s of e.camp.slots) if (s.e && !s.e.dead && s.e.state === 'idle') s.e.state = 'chase';
};

G.updateEnemy = (e, dt, frame) => {
  const S = G.S, p = S.player;
  const dx = p.x - e.x, dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist, ny = dy / dist;
  e.anim += dt * e.spr.fps * (e.state === 'idle' ? 0.5 : 1);
  e.flash = Math.max(0, e.flash - dt); e.wob += dt; e.atkAnim = Math.max(0, (e.atkAnim || 0) - dt); e.hitT -= dt; e.atkT -= dt; e.lunge = Math.max(0, (e.lunge || 0) - dt);
  const px = e.x;
  if (e.stun > 0) {
    e.stun -= dt;
    if (Math.random() < dt * 6) G.addPart(e.x + G.rand(-8, 8), e.y - e.spr.ph / 2 - 4, 0, -20, '*', '#ffe26a', 0.4, { glow: 1 });
  } else if (e.boss) G.updateBoss(e, dt, nx, ny, dist);
  else {
    let vx = 0, vy = 0;
    if (e.state === 'idle') {
      if ((e.wanderT -= dt) <= 0) { e.wanderT = G.rand(2, 4.5); const a = Math.random() * 6.28, r = Math.random() * 70; e.tx = e.homeX + Math.cos(a) * r; e.ty = e.homeY + Math.sin(a) * r * 0.6; }
      const ddx = e.tx - e.x, ddy = e.ty - e.y, dd = Math.hypot(ddx, ddy);
      if (dd > 4) { vx = (ddx / dd) * e.spd * 0.3; vy = (ddy / dd) * e.spd * 0.3; }
      if (dist < 175 && !S.dead) G.aggro(e);
    } else if (e.state === 'return') {
      const ddx = e.homeX - e.x, ddy = e.homeY - e.y, dd = Math.hypot(ddx, ddy);
      vx = (ddx / dd) * e.spd * 1.4; vy = (ddy / dd) * e.spd * 1.4;
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * dt * 0.5);
      if (dd < 20) { e.state = 'idle'; e.hp = e.maxHp; }
    } else {
      const far = Math.hypot(e.x - e.homeX, e.y - e.homeY);
      if (S.dead || (e.camp && far > 720)) e.state = 'return';
      const reach = e.rad + p.rad + 4;
      vx = nx * e.spd; vy = ny * e.spd;
      switch (e.d.ai) {
        case 'flutter': { const s = Math.sin(e.wob * 6) * 0.9; vx += -ny * e.spd * s; vy += nx * e.spd * s; break; }
        case 'drift': { const s = Math.sin(e.wob * 2) * 0.5; vx += -ny * e.spd * s; vy += nx * e.spd * s; break; }
        case 'lunge': {
          e.timer -= dt;
          if (e.st === 0) { vx *= 0.75; vy *= 0.75; if (dist < 170 && e.timer <= 0) { e.st = 1; e.timer = 0.4; } }
          else if (e.st === 1) { vx = vy = 0; if (e.timer <= 0) { e.st = 2; e.timer = 0.3; e.ax = nx; e.ay = ny; } }
          else { vx = e.ax * e.spd * 3.4; vy = e.ay * e.spd * 3.4; if (e.timer <= 0) { e.st = 0; e.timer = G.rand(1.8, 2.6); } }
          break;
        }
      }
      if (dist < reach && e.st !== 2) { vx *= 0.1; vy *= 0.1; }
      if (dist < reach + 4 && e.atkT <= 0 && !S.dead) {
        e.atkT = 1.15; e.lunge = 0.15; e.atkAnim = 0.5; G.hurtPlayer(e.dmg);
      }
    }
    const liquid = isLiquid(G.Ground.kindAt(e.x, e.y + e.spr.ph / 2 - 3));
    if (liquid && !e.d.ghost && e.d.ai !== 'flutter') { vx *= 0.6; vy *= 0.6; }
    e.x += vx * dt; e.y += vy * dt;
    e.mvx = vx; e.mvy = vy; // canlı figür yürüdüğü yöne baksın (geri geri yürümesin)
    if (Math.abs(vx) > 1) e.flip = vx < 0;
    // zeminle etkileşim
    if (!e.d.ghost && e.d.ai !== 'flutter' && Math.abs(e.x - G.R.cam.x) < G.R.VW && Math.abs(e.y - G.R.cam.y) < G.R.VH) {
      const fy = e.y + e.spr.ph / 2 - 3;
      if (liquid) { if (Math.abs(vx) + Math.abs(vy) > 5) G.Ground.splash(e.x, fy, 0.07 * dt * 60, 1); }
      else G.Ground.push(e.x, fy, e.rad * 1.7, vx, vy, dt);
    }
    // birbirini itme
    if (!e.d.ghost && (e.id + frame) % 2 === 0) {
      G.Grid.query(e.x, e.y, e.rad * 2, (o) => {
        if (o === e || o.d.ghost) return;
        const ddx = e.x - o.x, ddy = e.y - o.y, min = (e.rad + o.rad) * 0.75, d2 = ddx * ddx + ddy * ddy;
        if (d2 < min * min && d2 > 0.01) { const d = Math.sqrt(d2), push = ((min - d) / d) * (o.boss ? 1 : 0.5); e.x += ddx * push; e.y += ddy * push; }
      });
    }
  }
  e.x += e.kx * dt; e.y += e.ky * dt;
  const kd = Math.pow(0.002, dt); e.kx *= kd; e.ky *= kd;
  G.World.collide(e, px);
  if (e.burn > 0) {
    e.burn -= dt; e.burnTick -= dt;
    if (e.burnTick <= 0) { e.burnTick = 0.5; G.damage(e, e.burnDps * 0.5, { noCrit: true, color: '#ff8a3a', noKb: true }); }
  }
};

// gölgeler gövdelerden önce
G.drawEnemyShadow = (e) => {
  if (e.d.ghost) return;
  const fly = e.d.ai === 'flutter' || e.type === 'witch' || e.type === 'reaper';
  if (G.Live && G.Live.has(e.type)) { G.liveShadow(e.spr, e.type, e.x, e.y, fly); return; }
  G.R.castShadow(e.spr, Math.floor(e.anim), e.x, e.y - (e.jump || 0), { anim: e.atkAnim > 0 ? null : 'walk', flip: e.flip, s: fly ? 0.6 : 0.88, lift: (fly ? 30 : 0) + (e.jump || 0) });
};

G.drawEnemy = (e) => {
  const R = G.R;
  if (e.boss) { G.drawBoss(e); return; }
  const bob = e.d.ai === 'drift' ? Math.sin(e.wob * 3) * 3 : 0;
  const lx = e.lunge > 0 ? Math.sign(G.S.player.x - e.x) * 5 : 0;
  const liquid = !e.d.ghost && e.d.ai !== 'flutter' && isLiquid(G.Ground.kindAt(e.x, e.y + e.spr.ph / 2 - 3));
  const ea = G.animOf(e.spr, e.atkAnim > 0 ? 'attack' : e.state === 'idle' || e.stun > 0 ? 'idle' : 'walk', e.atkAnim > 0 ? 1 - e.atkAnim / 0.5 : null, e.anim);
  if (!(G.Live && G.Live.has(e.type))) R.sprite(e.spr, ea.f, e.x + lx, e.y + bob, { anim: ea.a,
    flip: e.flip, flash: e.flash > 0, alpha: e.d.ghost ? 0.8 : 1, self: true,
    glow: e.burn > 0 ? '#ff6a2a' : null, blur: e.burn > 0 ? 5 : 0,
    tint: e.st === 1 && e.d.ai === 'lunge' ? '#ff6a5a' : null,
    clip: liquid ? e.spr.mr + e.spr.h - 3 : undefined,
  });
  // isim + can barı (çatışmada)
  const tgt = G.S.target === e;
  if (e.hitT > 0 || tgt) {
    const sx = R.toScreenX(e.x), sy = R.toScreenY(e.y + e.spr.ph / 2 - G.liveTop(e.spr, e.type) - 6);
    const n = tgt ? 10 : 6, f = Math.max(0, Math.ceil((e.hp / e.maxHp) * n));
    const lvCol = e.lv > G.S.player.lv + 2 ? '#ff6a5a' : e.lv < G.S.player.lv - 2 ? '#9a9a9a' : '#e8e2d0';
    if (tgt) R.text(`${e.d.name} ${e.lv}`, sx, sy - 9, lvCol, 10, 'center', 700, 0.9);
    R.text('='.repeat(f) + '-'.repeat(n - f), sx, sy, f > 3 ? '#e04a3a' : '#ff2a2a', 10, 'center', 700, 0.95);
  }
};

// ───────────── Hasar ─────────────
G.damage = (e, amt, o = {}) => {
  if (e.dead) return 0;
  const S = G.S, p = S.player;
  let dmg = amt * p.stats.might;
  const crit = !o.noCrit && Math.random() < p.stats.crit;
  if (crit) dmg *= 1.9;
  if (o.holy && e.d.undead) dmg *= o.holy;
  dmg = Math.max(1, Math.round(dmg * G.rand(0.9, 1.1)));
  e.hp -= dmg; e.flash = 0.08; e.hitT = 4; S.target = e;
  S.dmgDealt += dmg; p.combatT = 5;
  if (!e.boss) G.aggro(e);
  if (!o.noKb) {
    let kx = o.kx, ky = o.ky;
    if (kx === undefined) { const dx = e.x - p.x, dy = e.y - p.y, l = Math.hypot(dx, dy) || 1; kx = dx / l; ky = dy / l; }
    const k = (o.kb ?? 140) * (e.d.kb ?? 1) * (e.boss ? 0.04 : 1);
    e.kx += kx * k; e.ky += ky * k;
  }
  if (o.burn) { e.burn = 3; e.burnDps = Math.max(e.burnDps, o.burn); }
  G.addFloat(e.x + G.rand(-6, 6), e.y - e.spr.ph / 2, String(dmg), crit ? '#ffd84a' : o.color || '#ffffff', crit);
  if (S.parts.length < 1400) for (let i = 0; i < 3; i++)
    G.addPart(e.x, e.y - 6, G.rand(-90, 90), G.rand(-110, 40), G.pick(['.', '`', ',', '\'']), crit ? '#ffd84a' : e.d.undead ? '#d8d0b8' : '#c8302a', 0.35, { grav: 300 });
  G.SFX.play('hit');
  if (e.hp <= 0) G.killEnemy(e);
  return dmg;
};

G.killEnemy = (e) => {
  const S = G.S;
  e.dead = true; S.kills++;
  // imza efekt: gövdenin kendi karakterleri saçılır
  const fr = e.spr.frames[Math.floor(e.anim) % e.spr.frames.length];
  const cells = e.flip ? fr.cellsF : fr.cells;
  const budget = S.parts.length < 1100 ? 0.8 : 0.25;
  for (const c of cells) {
    if (Math.random() > budget) continue;
    const a = Math.atan2(c.dy, c.dx) + G.rand(-0.5, 0.5), sp = G.rand(50, 160) * (e.boss ? 1.6 : 1);
    G.addPart(e.x + c.dx, e.y + c.dy, Math.cos(a) * sp, Math.sin(a) * sp - 50, c.ch, c.color, G.rand(0.5, 1), { grav: 300 });
  }
  if (e.boss) { G.onBossDeath(e); return; }
  G.gainXP(e.xp);
  const coins = Math.max(1, Math.round(e.lv * G.rand(1, 2.5)));
  G.addPickup('coin', e.x, e.y, coins);
  if (Math.random() < 0.08) G.addPickup('hp', e.x + 10, e.y + 4);
  else if (Math.random() < 0.06) G.addPickup('mp', e.x - 10, e.y + 4);
  G.SFX.play('die');
};

// ───────────── Ganimet ─────────────
G.addPickup = (kind, x, y, v = 1) => {
  G.S.pickups.push({ kind, x: x + G.rand(-8, 8), y: y + G.rand(-6, 6), v, mag: false, t: Math.random() * 6, vy: -G.rand(60, 120), z: 0 });
};
G.PICK_LOOK = { coin: ['$', '#ffd84a'], hp: ['!', '#ff4a4a'], mp: ['!', '#4a9aff'] };
G.updatePickups = (dt) => {
  const S = G.S, p = S.player;
  for (let i = S.pickups.length - 1; i >= 0; i--) {
    const k = S.pickups[i];
    k.t += dt;
    if (k.z < 0 || k.vy < 0) { k.vy += 500 * dt; k.z = Math.min(0, k.z + k.vy * dt); if (k.z === 0) k.vy = 0; }
    const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
    if (d < 70 && !S.dead) k.mag = true;
    if (k.mag) { const sp = 260 + k.t * 80; k.x += (dx / d) * sp * dt; k.y += (dy / d) * sp * dt; }
    if (d < 14) {
      S.pickups.splice(i, 1);
      if (k.kind === 'coin') { p.gold += k.v; G.addFloat(p.x, p.y - 40, '+' + k.v + '$', '#ffd84a'); }
      else { p.pots[k.kind]++; G.toast(k.kind === 'hp' ? 'Can İksiri +1' : 'Mana İksiri +1'); }
      G.SFX.play('gem');
    } else if (k.t > 90) S.pickups.splice(i, 1);
  }
};
G.drawPickups = () => {
  const R = G.R;
  for (const k of G.S.pickups) {
    const sx = R.toScreenX(k.x), sy = R.toScreenY(k.y + k.z);
    if (!R.onScreen(sx, sy, 20)) continue;
    const [ch, col] = G.PICK_LOOK[k.kind];
    R.g(ch, sx, sy + Math.sin(k.t * 4) * 2, col, 1, col, 4);
  }
};

// ───────────── Parçacıklar & uçan yazılar ─────────────
G.addPart = (x, y, vx, vy, ch, color, life, o = {}) => {
  const S = G.S;
  if (!S || S.parts.length > 1800) return;
  S.parts.push({ x, y, vx, vy, ch, color, life, max: life, grav: o.grav || 0, glow: o.glow || 0, drag: o.drag ?? 0.15 });
};
G.updateParts = (dt) => {
  const a = G.S.parts;
  for (let i = a.length - 1; i >= 0; i--) {
    const q = a[i];
    q.life -= dt;
    if (q.life <= 0) { a[i] = a[a.length - 1]; a.pop(); continue; }
    const dr = Math.pow(q.drag, dt);
    q.vx *= dr; q.vy *= dr; q.vy += q.grav * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
  }
};
G.drawParts = () => {
  const R = G.R;
  for (const q of G.S.parts) {
    const sx = R.toScreenX(q.x), sy = R.toScreenY(q.y);
    if (!R.onScreen(sx, sy, 10)) continue;
    const t = q.life / q.max;
    R.g(q.ch, sx, sy, q.color, Math.min(1, t * 1.6), q.glow ? q.color : null, q.glow ? 4 : 0);
    if (q.glow) R.bloom(sx, sy, 12, q.color, 0.14 * t);
  }
};
G.addFloat = (x, y, txt, color, big = false) => {
  const f = G.S.floats;
  if (f.length > 120 && !big) return;
  f.push({ x, y, txt, color, big, life: big ? 0.9 : 0.65, max: big ? 0.9 : 0.65 });
};
G.updateFloats = (dt) => {
  const a = G.S.floats;
  for (let i = a.length - 1; i >= 0; i--) {
    const f = a[i];
    f.life -= dt; f.y -= 34 * dt;
    if (f.life <= 0) { a[i] = a[a.length - 1]; a.pop(); }
  }
};
G.drawFloats = () => {
  const R = G.R;
  for (const f of G.S.floats) {
    const sx = R.toScreenX(f.x), sy = R.toScreenY(f.y);
    if (!R.onScreen(sx, sy, 20)) continue;
    R.text(f.txt, sx, sy, f.color, 12, 'center', 800, Math.min(1, (f.life / f.max) * 2), f.big ? 6 : 0);
  }
};

// ateş böcekleri: dünyaya bağlı, yavaşça süzülen parlak noktalar
G.drawFireflies = () => {
  const R = G.R, cam = R.cam, t = R.time;
  const left = cam.x - R.VW / 2, top = cam.y - R.VH / 2, fs = 130;
  for (let cx = Math.floor(left / fs); cx <= Math.ceil((left + R.VW) / fs); cx++) for (let cy = Math.floor(top / fs); cy <= Math.ceil((top + R.VH) / fs); cy++) {
    const h = G.hash2(cx * 5 + 11, cy * 9 + 2);
    if (h > 0.4) continue;
    const zone = G.ZONES[G.World.zoneIdx(cx * fs)].id;
    if (zone === 'ember' || zone === 'abyss') continue;
    const ph = h * 40;
    const x = cx * fs + 65 + Math.sin(t * 0.5 + ph) * 55, y = cy * fs + 65 + Math.cos(t * 0.37 + ph * 1.3) * 45;
    const blink = 0.5 + 0.5 * Math.sin(t * 2.3 + ph * 3);
    if (blink < 0.3) continue;
    const sx = R.toScreenX(x), sy = R.toScreenY(y);
    R.g(blink > 0.8 ? '*' : '.', sx, sy, zone === 'grave' ? '#b8f0ff' : '#f0ffb0', 1, '#fff6b0', 0);
    R.light(sx, sy, 40, zone === 'grave' ? '#9ad8ff' : '#e8ff9a', 0.4 * blink);
  }
};
