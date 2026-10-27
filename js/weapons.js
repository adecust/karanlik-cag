'use strict';
// Silah davranışları. Her silah: update(w, s, p, dt) ve isteğe bağlı draw(w, s, p)
// s = seviye uygulanmış istatistikler; alan/bekleme oyuncu çarpanlarıyla burada birleşir.

G.wStats = (w) => {
  const d = G.WEAPONS[w.id];
  const s = { ...d.base };
  if (d.lv) for (let i = 0; i < w.lv - 1; i++) for (const k in d.lv[i]) s[k] = (s[k] || 0) + d.lv[i][k];
  return s;
};
G.addWeapon = (p, id) => {
  const w = { id, lv: 1, t: 0.4, st: {} };
  w.s = G.wStats(w);
  p.weapons.push(w);
  return w;
};
G.updateWeapons = (dt) => {
  const p = G.S.player;
  for (const w of p.weapons) G.WB[w.id].update(w, w.s, p, dt);
};
G.drawWeapons = () => {
  const p = G.S.player;
  for (const w of p.weapons) { const b = G.WB[w.id]; if (b.draw) b.draw(w, w.s, p); }
};
G.cdOf = (s, p) => Math.max(0.1, s.cd * (1 - p.stats.cdr));

// Açıya göre çizgi karakteri (ekranda y aşağı)
G.lineChar = (a) => {
  let t = a % Math.PI; if (t < 0) t += Math.PI;
  const i = Math.round(t / (Math.PI / 4)) % 4;
  return ['-', '\\', '|', '/'][i];
};
G.addFx = (fx) => G.S.fx.push(fx);

// ───────────── KILIÇ ─────────────
G.slash = (p, a, r, half, dmg, color, full, burn) => {
  G.Grid.query(p.x, p.y, r, (e) => {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > r + e.rad) return;
    if (!full && Math.abs(G.angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) > half + 0.15) return;
    G.damage(e, dmg, { kb: 220, burn });
  });
  G.SFX.play('slash');
  const life = 0.24;
  G.addFx({
    t: 0, layer: 'top',
    update(dt) { this.t += dt; return this.t < life; },
    draw() {
      const R = G.R, pr = this.t / life;
      const sweep = Math.min(1, pr * 2.2);
      const a0 = full ? a : a - half, span = full ? Math.PI * 2 : half * 2;
      const n = Math.ceil((span * r) / (R.CW * 0.9));
      const cx = R.toScreenX(p.x), cy = R.toScreenY(p.y);
      for (let i = 0; i <= n * sweep; i++) {
        const th = a0 + (span * i) / n;
        const fade = (1 - pr) * (0.4 + 0.6 * (i / (n * sweep + 1)));
        const ch = G.lineChar(th + Math.PI / 2);
        R.g(ch, cx + Math.cos(th) * r, cy + Math.sin(th) * r, color, fade, color, 8);
        R.g(ch, cx + Math.cos(th) * r * 0.8, cy + Math.sin(th) * r * 0.8, '#ffffff', fade * 0.5);
      }
    },
  });
};

G.WB = {};
G.WB.sword = {
  update(w, s, p, dt) {
    const st = w.st;
    st.q = st.q || [];
    w.t -= dt;
    if (w.t <= 0) {
      w.t = G.cdOf(s, p);
      const a0 = p.facing > 0 ? 0 : Math.PI;
      const dirs = [a0, a0 + Math.PI, a0 - Math.PI / 2, a0 + Math.PI / 2];
      for (let i = 0; i < s.amount; i++) st.q.push({ t: i * 0.13, a: dirs[i % 4] });
    }
    for (let i = st.q.length - 1; i >= 0; i--) {
      const q = st.q[i];
      q.t -= dt;
      if (q.t <= 0) {
        st.q.splice(i, 1);
        G.slash(p, q.a, 62 * s.area * p.stats.area, 1.05, s.dmg, '#dfe6f0', false);
      }
    }
  },
};
G.WB.dawnblade = {
  update(w, s, p, dt) {
    w.t -= dt;
    if (w.t <= 0) {
      w.t = G.cdOf(s, p);
      const r = 62 * s.area * p.stats.area;
      G.slash(p, (w.st.a = (w.st.a || 0) + 1.3), r, Math.PI, s.dmg, '#ffd84a', true);
      G.slash(p, w.st.a + Math.PI, r * 0.7, Math.PI, s.dmg * 0.5, '#fff2a8', true);
      G.R.shake(2);
    }
  },
};

// ───────────── BALTA ─────────────
G.axeProj = (o) => {
  const hit = new Set();
  G.addFx(Object.assign({
    t: 0, rot: 0, layer: 'top', pierce: o.pierce,
    update(dt) {
      this.t += dt; this.rot += dt * 14;
      this.move(dt);
      const r = 12 * o.area;
      G.Grid.query(this.x, this.y, r, (e) => {
        if (this.pierce <= 0 || hit.has(e.id)) return;
        if (G.dist2(e.x, e.y, this.x, this.y) > (r + e.rad) ** 2) return;
        hit.add(e.id); this.pierce--;
        G.damage(e, o.dmg, { kb: 160 });
      });
      if (Math.random() < 0.3) G.addPart(this.x, this.y, 0, 0, '.', o.color, 0.25);
      return this.pierce > 0 && this.t < o.life;
    },
    draw() {
      const R = G.R, sx = R.toScreenX(this.x), sy = R.toScreenY(this.y);
      R.g(G.lineChar(this.rot), sx, sy, '#8a6a42');
      R.g('*', sx + Math.cos(this.rot) * 7, sy + Math.sin(this.rot) * 7, o.color, 1, o.color, 6);
    },
  }, o));
};
G.WB.axe = {
  update(w, s, p, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    w.t = G.cdOf(s, p);
    G.SFX.play('throw');
    for (let i = 0; i < s.amount; i++) {
      const vx = p.facing * G.rand(30, 90) + (i - (s.amount - 1) / 2) * 70;
      G.axeProj({
        x: p.x, y: p.y, vx, vy: -G.rand(400, 470), dmg: s.dmg, pierce: s.pierce,
        area: s.area * p.stats.area, color: '#e0a85e', life: 2.2,
        move(dt) { this.vy += 900 * dt; this.x += this.vx * dt; this.y += this.vy * dt; },
      });
    }
  },
};
G.WB.stormaxes = {
  update(w, s, p, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    w.t = G.cdOf(s, p);
    G.SFX.play('throw');
    const off = Math.random() * 6.28;
    for (let i = 0; i < s.amount; i++) {
      G.axeProj({
        x: p.x, y: p.y, ox: p.x, oy: p.y, r: 10, ang: off + (i / s.amount) * Math.PI * 2,
        dmg: s.dmg, pierce: s.pierce, area: s.area * p.stats.area, color: '#ffb84a', life: 1.8,
        move(dt) {
          this.r += 230 * dt; this.ang += 2.4 * dt;
          this.x = this.ox + Math.cos(this.ang) * this.r; this.y = this.oy + Math.sin(this.ang) * this.r;
        },
      });
    }
  },
};

// ───────────── GÜRZ ─────────────
G.flailBalls = (w, s, p) => {
  const n = s.amount, R = 72 * s.area * p.stats.area, out = [];
  for (let i = 0; i < n; i++) {
    const a = w.st.ang + (i / n) * Math.PI * 2;
    out.push({ x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, a });
  }
  return out;
};
G.flailUpdate = (w, s, p, dt, big) => {
  const st = w.st;
  st.ang = st.ang || 0; st.hits = st.hits || new Map(); st.act = st.act ?? 0;
  st.now = (st.now || 0) + dt;
  if (st.act <= 0) {
    w.t -= dt;
    if (w.t <= 0) { st.act = s.dur; w.t = G.cdOf(s, p); }
    return;
  }
  st.act -= dt;
  st.ang += 3.4 * s.speed * dt;
  const r = (big ? 16 : 11) * s.area * p.stats.area;
  for (const b of G.flailBalls(w, s, p)) {
    G.Grid.query(b.x, b.y, r, (e) => {
      if (G.dist2(e.x, e.y, b.x, b.y) > (r + e.rad) ** 2) return;
      if ((st.hits.get(e.id) || 0) > st.now) return;
      st.hits.set(e.id, st.now + 0.45);
      G.damage(e, s.dmg, { kb: big ? 420 : 260, kx: Math.cos(b.a), ky: Math.sin(b.a) });
    });
  }
  if (st.hits.size > 600) st.hits.clear();
};
G.flailDraw = (w, s, p, ch, color) => {
  if (!(w.st.act > 0)) return;
  const R = G.R;
  const fade = Math.min(1, w.st.act * 4);
  for (const b of G.flailBalls(w, s, p)) {
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      R.g('.', R.toScreenX(p.x + (b.x - p.x) * t), R.toScreenY(p.y + (b.y - p.y) * t), '#8a909c', fade);
    }
    R.g(ch, R.toScreenX(b.x), R.toScreenY(b.y), color, fade, color, 8);
  }
};
G.WB.flail = {
  update(w, s, p, dt) { G.flailUpdate(w, s, p, dt, false); },
  draw(w, s, p) { G.flailDraw(w, s, p, 'O', '#c4ccd8'); },
};
G.WB.doomflail = {
  update(w, s, p, dt) { G.flailUpdate(w, s, p, dt, true); },
  draw(w, s, p) { G.flailDraw(w, s, p, '@', '#ff6a5a'); },
};

// ───────────── KUTSAL SU ─────────────
G.holyPool = (x, y, r, dur, dmg, cols, holyMul) => {
  G.addFx({
    t: 0, tick: 0, layer: 'ground',
    update(dt) {
      this.t += dt; this.tick -= dt;
      if (this.tick <= 0) {
        this.tick = 0.35;
        G.Grid.query(x, y, r, (e) => {
          if (G.dist2(e.x, e.y, x, y) < (r + e.rad * 0.5) ** 2) G.damage(e, dmg, { kb: 30, holy: holyMul, color: cols[0] });
        });
      }
      return this.t < dur;
    },
    draw() {
      const R = G.R, sx = R.toScreenX(x), sy = R.toScreenY(y);
      if (!R.onScreen(sx, sy, r + 20)) return;
      const grow = Math.min(1, this.t * 6), fade = Math.min(1, (dur - this.t) * 3);
      const rr = r * grow, step = 13, fl = Math.floor(G.S.t * 12);
      for (let gx = -rr; gx <= rr; gx += step) for (let gy = -rr; gy <= rr; gy += step * 0.9) {
        if (gx * gx + gy * gy > rr * rr) continue;
        const h = G.hash2(Math.round(gx + x) + fl, Math.round(gy + y) - fl);
        const ch = h < 0.3 ? '^' : h < 0.5 ? '*' : h < 0.7 ? '\'' : h < 0.85 ? '"' : '.';
        R.g(ch, sx + gx, sy + gy, cols[Math.floor(h * cols.length)], fade * (0.5 + h * 0.5), cols[0], 5);
      }
    },
  });
};
G.randomTarget = (p, r) => {
  const list = [];
  G.Grid.query(p.x, p.y, r, (e) => list.push(e));
  return list.length ? G.pick(list) : null;
};
G.WB.holy = {
  update(w, s, p, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    w.t = G.cdOf(s, p);
    for (let i = 0; i < s.amount; i++) {
      const tg = G.randomTarget(p, 260);
      const tx = tg ? tg.x : p.x + G.rand(-150, 150), ty = tg ? tg.y : p.y + G.rand(-150, 150);
      const fx = p.x, fy = p.y, dur = 0.45;
      G.SFX.play('throw');
      G.addFx({
        t: 0, layer: 'top',
        update(dt) {
          this.t += dt;
          if (this.t >= dur) {
            G.holyPool(tx, ty, 42 * s.area * p.stats.area, s.dur, s.dmg, ['#7fd8ff', '#c8f4ff', '#4aa8ff'], 1.5);
            for (let k = 0; k < 8; k++) G.addPart(tx, ty, G.rand(-120, 120), G.rand(-160, -40), '.', '#c8f4ff', 0.4, { grav: 400 });
            return false;
          }
          return true;
        },
        draw() {
          const k = this.t / dur, R = G.R;
          const x = G.lerp(fx, tx, k), y = G.lerp(fy, ty, k) - Math.sin(k * Math.PI) * 70;
          R.g('&', R.toScreenX(x), R.toScreenY(y), '#7fd8ff', 1, '#7fd8ff', 6);
        },
      });
    }
  },
};
G.WB.heavenfire = {
  update(w, s, p, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    w.t = G.cdOf(s, p);
    for (let i = 0; i < s.amount; i++) {
      const tg = G.randomTarget(p, 320);
      const x = tg ? tg.x : p.x + G.rand(-180, 180), y = tg ? tg.y : p.y + G.rand(-180, 180);
      G.holyPool(x, y, 42 * s.area * p.stats.area, s.dur, s.dmg, ['#ffd84a', '#fff2a8', '#ffffff'], 2);
    }
  },
};

// ───────────── MIZRAK ─────────────
G.thrust = (p, a, len, dmg, shaft, tip, burn) => {
  const life = 0.3;
  let done = false;
  G.addFx({
    t: 0, layer: 'top',
    update(dt) {
      this.t += dt;
      if (!done && this.t > 0.07) {
        done = true;
        const x2 = p.x + Math.cos(a) * len, y2 = p.y + Math.sin(a) * len;
        G.Grid.query((p.x + x2) / 2, (p.y + y2) / 2, len / 2 + 10, (e) => {
          if (G.segDist2(e.x, e.y, p.x, p.y, x2, y2) < (e.rad + 9) ** 2)
            G.damage(e, dmg, { kb: 200, kx: Math.cos(a), ky: Math.sin(a), burn });
        });
      }
      return this.t < life;
    },
    draw() {
      const R = G.R, t = this.t;
      const ext = t < 0.1 ? t / 0.1 : t < 0.2 ? 1 : 1 - (t - 0.2) / 0.1;
      const L = len * ext, step = R.CW * 0.85, ch = G.lineChar(a);
      const cx = R.toScreenX(p.x), cy = R.toScreenY(p.y);
      for (let d = 14; d < L - step; d += step)
        R.g(ch, cx + Math.cos(a) * d, cy + Math.sin(a) * d, shaft, 1, burn ? shaft : null, burn ? 6 : 0);
      R.g('*', cx + Math.cos(a) * L, cy + Math.sin(a) * L, tip, 1, tip, 8);
      if (burn && Math.random() < 0.5)
        G.addPart(p.x + Math.cos(a) * L * Math.random(), p.y + Math.sin(a) * L * Math.random(), 0, -50, '^', '#ff8a3a', 0.3, { glow: 1 });
    },
  });
};
G.WB.spear = {
  update(w, s, p, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    w.t = G.cdOf(s, p);
    const a0 = Math.atan2(p.dirY, p.dirX);
    for (let i = 0; i < s.amount; i++)
      G.thrust(p, a0 + (i - (s.amount - 1) / 2) * 0.32, 115 * s.area * p.stats.area, s.dmg, '#a07a4a', '#e8eef8');
    G.SFX.play('slash');
  },
};
G.WB.dragonlance = {
  update(w, s, p, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    w.t = G.cdOf(s, p);
    const a0 = Math.atan2(p.dirY, p.dirX);
    for (let i = 0; i < s.amount; i++)
      G.thrust(p, a0 + (i * Math.PI * 2) / s.amount, 115 * s.area * p.stats.area, s.dmg, '#ff7a3a', '#ffe23a', s.dmg * 0.4);
    G.SFX.play('slash');
  },
};

// ───────────── MEŞALE ─────────────
G.auraUpdate = (w, s, p, dt, holy) => {
  w.t -= dt;
  if (w.t > 0) return;
  w.t = G.cdOf(s, p);
  const r = 50 * s.area * p.stats.area;
  G.Grid.query(p.x, p.y, r, (e) => {
    if (G.dist2(e.x, e.y, p.x, p.y) < (r + e.rad * 0.5) ** 2)
      G.damage(e, s.dmg, { kb: 50, burn: holy ? 0 : s.dmg * 0.8, holy: holy ? 2 : 0, color: holy ? '#fff0c0' : '#ff9a3c' });
  });
};
G.auraDraw = (s, p, cols) => {
  const R = G.R;
  const r = 50 * s.area * p.stats.area;
  const n = Math.max(10, Math.floor((Math.PI * 2 * r) / (R.CW * 1.5)));
  const fl = Math.floor(G.S.t * 10), cx = R.toScreenX(p.x), cy = R.toScreenY(p.y);
  for (let i = 0; i < n; i++) {
    const h = G.hash2(i, fl);
    const a = (i / n) * Math.PI * 2 + G.S.t * 0.6;
    const rr = r + (h - 0.5) * 8;
    const ch = h < 0.35 ? '^' : h < 0.6 ? '*' : h < 0.8 ? '\'' : '"';
    R.g(ch, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr - h * 4, cols[i % cols.length], 0.45 + h * 0.5, cols[0], 6);
  }
};
G.WB.torch = {
  update(w, s, p, dt) { G.auraUpdate(w, s, p, dt, false); },
  draw(w, s, p) { G.auraDraw(s, p, ['#ff9a3c', '#ffcf5a', '#ff5a2a']); },
};
G.WB.purgefire = {
  update(w, s, p, dt) { G.auraUpdate(w, s, p, dt, true); },
  draw(w, s, p) { G.auraDraw(s, p, ['#fff0c0', '#ffd84a', '#ffffff']); },
};
