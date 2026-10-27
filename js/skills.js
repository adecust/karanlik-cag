'use strict';
// ═══════════════════════════════════════════════════════════════════
//  YETENEKLER — efekt yardımcıları + her sınıfın 4 yeteneği (G.CAST)
// ═══════════════════════════════════════════════════════════════════

// Açıya göre çizgi karakteri (ekranda y aşağı)
G.lineChar = (a) => {
  let t = a % Math.PI; if (t < 0) t += Math.PI;
  return ['-', '\\', '|', '/'][Math.round(t / (Math.PI / 4)) % 4];
};
G.addFx = (fx) => G.S.fx.push(fx);

// ───────────── Kesik yayı ─────────────
G.slash = (p, a, r, half, dmg, color, full, burn) => {
  G.Grid.query(p.x, p.y, r, (e) => {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > r + e.rad) return;
    if (!full && Math.abs(G.angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) > half + 0.15) return;
    G.damage(e, dmg, { kb: 220, burn });
  });
  // kılıcın rüzgârı çimeni yatırır
  const span = full ? Math.PI * 2 : half * 2, a0 = full ? a : a - half;
  for (let k = 0; k <= 6; k++) {
    const th = a0 + (span * k) / 6;
    G.Ground.push(p.x + Math.cos(th) * r * 0.75, p.y + p.spr.ph / 2 + Math.sin(th) * r * 0.45, 26, Math.cos(th) * 400, Math.sin(th) * 200, 0.12);
  }
  G.SFX.play('slash');
  const life = 0.24;
  G.addFx({
    t: 0, layer: 'top',
    update(dt) { this.t += dt; return this.t < life; },
    draw() {
      const R = G.R, pr = this.t / life;
      const sweep = Math.min(1, pr * 2.2);
      const n = Math.ceil((span * r) / (R.CW * 0.9));
      const cx = R.toScreenX(p.x), cy = R.toScreenY(p.y - 6);
      for (let i = 0; i <= n * sweep; i++) {
        const th = a0 + (span * i) / n;
        const fade = (1 - pr) * (0.4 + 0.6 * (i / (n * sweep + 1)));
        const ch = G.lineChar(th + Math.PI / 2);
        R.g(ch, cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.7, color, fade, color, 5);
        R.g(ch, cx + Math.cos(th) * r * 0.82, cy + Math.sin(th) * r * 0.57, '#ffffff', fade * 0.5);
      }
    },
  });
};

// ───────────── Genişleyen halka (çığlık, arınma) ─────────────
G.ringFx = (x, y, r, color, life, ch = '*') => {
  G.addFx({
    t: 0, layer: 'top',
    update(dt) { this.t += dt; return this.t < life; },
    draw() {
      const R = G.R, k = this.t / life, rr = r * (0.2 + 0.8 * Math.sqrt(k));
      const n = Math.max(16, Math.floor((Math.PI * 2 * rr) / 7));
      const sx = R.toScreenX(x), sy = R.toScreenY(y);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        R.g(i % 3 ? ch : '.', sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.6, color, 1 - k, color, 4);
      }
      R.bloom(sx, sy, rr, color, 0.25 * (1 - k));
    },
  });
};

// ───────────── Fırlatılan balta ─────────────
G.axeProj = (o) => {
  const hit = new Set();
  G.addFx(Object.assign({
    t: 0, rot: 0, layer: 'top', pierce: o.pierce,
    update(dt) {
      this.t += dt; this.rot += dt * 16;
      this.move(dt);
      const r = 14;
      G.Grid.query(this.x, this.y, r, (e) => {
        if (this.pierce <= 0 || hit.has(e.id)) return;
        if (G.dist2(e.x, e.y, this.x, this.y) > (r + e.rad) ** 2) return;
        hit.add(e.id); this.pierce--;
        G.damage(e, o.dmg, { kb: 180 });
      });
      if (Math.random() < 0.4) G.addPart(this.x, this.y, 0, 0, '.', o.color, 0.25);
      return this.pierce > 0 && this.t < o.life;
    },
    draw() {
      const R = G.R, sx = R.toScreenX(this.x), sy = R.toScreenY(this.y);
      R.g(G.lineChar(this.rot), sx, sy, '#8a6a42');
      R.g('D', sx + Math.cos(this.rot) * 6, sy + Math.sin(this.rot) * 6, o.color, 1, o.color, 4);
    },
  }, o));
};

// ───────────── Kutsal alev havuzu ─────────────
G.holyPool = (x, y, r, dur, dmg, cols, holyMul) => {
  G.addFx({
    t: 0, tick: 0, layer: 'ground',
    update(dt) {
      this.t += dt; this.tick -= dt;
      if (this.tick <= 0) {
        this.tick = 0.35;
        G.Grid.query(x, y, r, (e) => {
          if (G.dist2(e.x, e.y, x, y) < (r + e.rad * 0.5) ** 2) G.damage(e, dmg, { kb: 20, holy: holyMul, color: cols[0] });
        });
      }
      return this.t < dur;
    },
    draw() {
      const R = G.R, sx = R.toScreenX(x), sy = R.toScreenY(y);
      if (!R.onScreen(sx, sy, r + 20)) return;
      const grow = Math.min(1, this.t * 6), fade = Math.min(1, (dur - this.t) * 3);
      const rr = r * grow, fl = Math.floor(G.S.t * 12);
      for (let gx = -rr; gx <= rr; gx += R.CW) for (let gy = -rr * 0.6; gy <= rr * 0.6; gy += R.CH) {
        if (gx * gx + (gy / 0.6) * (gy / 0.6) > rr * rr) continue;
        const h = G.hash2(Math.round(gx + x) + fl, Math.round(gy + y) - fl);
        if (h > 0.75) continue;
        const ch = h < 0.25 ? '^' : h < 0.45 ? '*' : h < 0.6 ? '\'' : '"';
        R.g(ch, sx + gx, sy + gy, cols[Math.floor(h * cols.length)], fade * (0.5 + h * 0.5), cols[0], 0);
      }
      R.light(sx, sy, rr * 1.6, cols[0], 0.8 * fade);
      R.bloom(sx, sy, rr, cols[0], 0.18 * fade);
    },
  });
};

// ───────────── Delici hamle (asa) ─────────────
G.thrust = (p, a, len, dmg, shaft, tip, burn) => {
  const life = 0.26;
  let done = false;
  G.addFx({
    t: 0, layer: 'top',
    update(dt) {
      this.t += dt;
      if (!done && this.t > 0.06) {
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
      const ext = t < 0.08 ? t / 0.08 : t < 0.16 ? 1 : 1 - (t - 0.16) / 0.1;
      const L = len * ext, ch = G.lineChar(a);
      const cx = R.toScreenX(p.x), cy = R.toScreenY(p.y - 8);
      for (let d = 12; d < L - 6; d += R.CW * 0.9) R.g(ch, cx + Math.cos(a) * d, cy + Math.sin(a) * d, shaft, 1);
      R.g('*', cx + Math.cos(a) * L, cy + Math.sin(a) * L, tip, 1, tip, 6);
    },
  });
};

G.healFx = (p, amt, color) => {
  p.hp = Math.min(p.maxHp, p.hp + amt);
  G.addFloat(p.x, p.y - p.spr.ph / 2 - 10, '+' + Math.round(amt), color, true);
  for (let i = 0; i < 24; i++)
    G.addPart(p.x + G.rand(-20, 20), p.y + G.rand(-30, 20), G.rand(-10, 10), -G.rand(30, 90), G.pick(['+', '*', '.']), color, G.rand(0.6, 1.1), { glow: 1, drag: 0.6 });
  G.SFX.play('heal');
};

// ───────────── Yetenek davranışları ─────────────
G.CAST = {
  k_slash(p, a) { G.slash(p, a, 135, 1.0, p.atk, '#dfe6f0'); },
  k_charge(p, a) {
    p.dash = { vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, t: 0.22, hit: new Set(), dmg: p.atk * 1.7 };
    p.iframe = Math.max(p.iframe, 0.3);
    G.SFX.play('throw');
  },
  k_storm(p, a) {
    for (let i = 0; i < 3; i++) p.queue.push({ t: i * 0.17, fn: () => { G.slash(p, a + i * 2.1, 125, Math.PI, p.atk * 1.15, '#ffd84a', true); G.R.shake(2); } });
  },
  k_oath(p) {
    G.healFx(p, p.maxHp * 0.35, '#fff2a8');
    p.buff.armor = 6;
    G.ringFx(p.x, p.y, 90, '#ffd84a', 0.5, '+');
  },
  b_chop(p, a) { G.slash(p, a, 145, 1.15, p.atk * 1.25, '#e0a85e'); },
  b_axes(p, a) {
    G.SFX.play('throw');
    for (let i = -1; i <= 1; i++) {
      const aa = a + i * 0.28;
      G.axeProj({
        x: p.x, y: p.y - 16, vx: Math.cos(aa) * 430, vy: Math.sin(aa) * 430, dmg: p.atk * 1.1, pierce: 3, color: '#ffb84a', life: 0.85,
        move(dt) { this.x += this.vx * dt; this.y += this.vy * dt; },
      });
    }
  },
  b_roar(p) {
    G.Grid.query(p.x, p.y, 150, (e) => {
      if (G.dist2(e.x, e.y, p.x, p.y) > 150 * 150) return;
      G.damage(e, p.atk * 0.8, { kb: 260 });
      e.stun = e.boss ? 0.5 : 1.6;
    });
    p.buff.might = 6;
    G.ringFx(p.x, p.y, 150, '#ff7a4a', 0.5, '~');
    G.R.shake(8); G.SFX.play('boss');
  },
  b_whirl(p) { p.whirl = 2.5; p.whirlT = 0; },
  m_staff(p, a) { G.thrust(p, a, 170, p.atk * 1.05, '#a07a4a', '#ffe8a8'); G.SFX.play('slash'); },
  m_holy(p, a) {
    const d = Math.min(280, Math.hypot(G.aim.x - p.x, G.aim.y - p.y));
    const tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d, fx = p.x, fy = p.y - 20, dur = 0.42;
    G.SFX.play('throw');
    G.addFx({
      t: 0, layer: 'top',
      update(dt) {
        this.t += dt;
        if (this.t < dur) return true;
        G.holyPool(tx, ty, 56, 3, p.atk * 0.45, ['#7fd8ff', '#c8f4ff', '#4aa8ff'], 1.6);
        G.Ground.splash(tx, ty, 1.2, 2);
        for (let k = 0; k < 10; k++) G.addPart(tx, ty, G.rand(-120, 120), G.rand(-160, -40), '.', '#c8f4ff', 0.4, { grav: 400 });
        return false;
      },
      draw() {
        const k = this.t / dur, R = G.R;
        const x = G.lerp(fx, tx, k), y = G.lerp(fy, ty, k) - Math.sin(k * Math.PI) * 60;
        R.g('&', R.toScreenX(x), R.toScreenY(y), '#7fd8ff', 1, '#7fd8ff', 5);
      },
    });
  },
  m_heal(p) { G.healFx(p, p.maxHp * 0.4, '#7fe07f'); },
  m_purge(p) {
    G.Grid.query(p.x, p.y, 175, (e) => {
      if (G.dist2(e.x, e.y, p.x, p.y) < 175 * 175) G.damage(e, p.atk * 2.2, { kb: 300, holy: 2, color: '#fff0c0' });
    });
    G.ringFx(p.x, p.y, 175, '#fff0c0', 0.6, '*');
    G.R.shake(6); G.SFX.play('boom');
  },
};

// İmleç (dünya koordinatı) — game.js günceller
G.aim = { x: 0, y: 0 };

G.useSkill = (i) => {
  const S = G.S, p = S.player;
  if (!p || S.dead || S.over) return;
  const id = G.CLASSES[p.cls].skills[i], sk = G.SKILLS[id];
  if (p.lv < sk.lv) { if (i) G.toast(`${sk.name}: Seviye ${sk.lv} gerekli`); return; }
  if (p.cd[i] > 0) return;
  if (p.mp < sk.mp) { G.toast('Mana yetersiz'); return; }
  p.mp -= sk.mp; p.cd[i] = sk.cd;
  const a = Math.atan2(G.aim.y - p.y, G.aim.x - p.x);
  p.facing = Math.cos(a) >= 0 ? 1 : -1; p.aimDX = Math.cos(a); p.aimDY = Math.sin(a);
  p.combatT = 5; p.atkAnim = 0.45;
  G.CAST[id](p, a);
};
