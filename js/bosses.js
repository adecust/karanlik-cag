'use strict';
// Bosslar, yere işaretlenen saldırılar ve büyük efektler (videodaki boss savaşı)

G.EY = 0.55; // yerdeki elipslerin basıklığı (kamera perspektifi)

// ───────────── Büyük efektler ─────────────
const FIRE_PAL = ['#fff6c8', '#ffd870', '#ffb040', '#ff7a20'];
const CURSE_PAL = ['#f0d8ff', '#c890ff', '#9a50ff', '#6a20c0'];

// Mantar şeklinde ateş patlaması: kubbe gibi yükselen parlak parçacıklar + geniş turuncu ışık + kavrulmuş zemin
G.fireBurst = (x, y, size, pal = FIRE_PAL) => {
  G.Ground.scorch(x, y, size * 1.5, 1.75);
  G.R.shake(Math.min(12, size / 12)); G.SFX.play('boom');
  const n = Math.min(70, 18 + size * 0.4);
  for (let k = 0; k < n; k++) {
    const a = G.rand(-Math.PI, 0), sp = G.rand(0.3, 1) * size * 2.2;
    G.addPart(x + G.rand(-size, size) * 0.3, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.9, G.pick(['@', '*', 'o', '%', '.']), G.pick(pal), G.rand(0.45, 0.9), { glow: 1, drag: 0.08, grav: 60 });
  }
  for (let k = 0; k < 14; k++) G.addPart(x + G.rand(-size, size), y + G.rand(-size, size) * G.EY, 0, -G.rand(20, 60), G.pick([':', '.', '\'']), '#6a5a50', G.rand(0.8, 1.6), { drag: 0.5 });
  G.addFx({
    t: 0, layer: 'top',
    update(dt) { this.t += dt; return this.t < 0.7; },
    draw() {
      const R = G.R, k = 1 - this.t / 0.7;
      R.lightW(x, y, size * 2.4, pal[2], 1.3 * k);
      R.bloomW(x, y - size * 0.4, size * 1.3, pal[1], 0.45 * k);
      R.bloomW(x, y, size * 0.8, pal[0], 0.5 * k);
    },
  });
};

// Ateş topu: kavisle uçar, yere düşünce patlar
G.fireball = (x0, y0, x1, y1, dur, size, onLand) => {
  G.addFx({
    t: 0, layer: 'top',
    update(dt) {
      this.t += dt;
      const k = Math.min(1, this.t / dur), x = G.lerp(x0, x1, k), y = G.lerp(y0, y1, k) - Math.sin(k * Math.PI) * 140;
      if (Math.random() < 0.9) G.addPart(x, y, G.rand(-20, 20), G.rand(-20, 20), G.pick(['*', '.', 'o']), G.pick(FIRE_PAL), 0.45, { glow: 1, drag: 0.3 });
      if (k >= 1) { G.fireBurst(x1, y1, size); if (onLand) onLand(); return false; }
      return true;
    },
    draw() {
      const R = G.R, k = Math.min(1, this.t / dur), x = G.lerp(x0, x1, k), y = G.lerp(y0, y1, k) - Math.sin(k * Math.PI) * 140;
      R.g('@', R.toScreenX(x), R.toScreenY(y), '#ffe08a', 1, '#ffb040', 6);
      R.lightW(x, y, 160, '#ff9a3a', 1.4);
      R.bloomW(x, y, 34, '#ffc060', 0.6);
    },
  });
};

// Şimşek: gökten zikzak beyaz çizgi, ekran bir an mavi-griye döner
G.lightning = (x, y) => {
  const pts = [[x + G.rand(-60, 60), y - 700]];
  for (let i = 1; i < 9; i++) { const k = i / 9; pts.push([G.lerp(pts[0][0], x, k) + G.rand(-26, 26), G.lerp(y - 700, y, k)]); }
  pts.push([x, y]);
  const branch = pts.slice(3, 6).map(([px, py], i) => [px + (i + 1) * G.rand(10, 24), py + i * 30]);
  G.R.desat = 0.85; G.R.shake(9); G.SFX.play('boom');
  G.Ground.scorch(x, y, 50, 1.3);
  for (let k = 0; k < 26; k++) { const a = Math.random() * 6.28, sp = G.rand(60, 260); G.addPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp * G.EY - 60, G.pick(['*', '.', '+']), G.pick(['#ffffff', '#cfe0ff', '#9ab8ff']), 0.5, { glow: 1, drag: 0.2 }); }
  G.addFx({
    t: 0, layer: 'top',
    update(dt) { this.t += dt; return this.t < 0.32; },
    draw() {
      const R = G.R, a = (1 - this.t / 0.32) * (Math.floor(this.t * 40) % 2 ? 1 : 0.55);
      R.polyW(pts, '#ffffff', { w: 2.4, alpha: a, glow: 16 });
      R.polyW(branch, '#cfe0ff', { w: 1.2, alpha: a * 0.8, glow: 10 });
      R.lightW(x, y, 420, '#cfe0ff', 2 * a);
      R.bloomW(x, y, 90, '#e8f0ff', 0.6 * a);
    },
  });
};

// ───────────── Tehlike alanları (önce uyarı, sonra hasar) ─────────────
G.addHazard = (h) => { h.t = 0; h.fired = false; G.S.hazards.push(h); return h; };

G.inHazard = (h, x, y) => {
  if (h.kind === 'circle') { const dx = x - h.x, dy = (y - h.y) / G.EY; return dx * dx + dy * dy < h.r * h.r; }
  if (h.kind === 'line') return G.segDist2(x, y, h.x, h.y, h.x2, h.y2) < h.w * h.w;
  if (h.kind === 'cone') {
    const d = Math.hypot(x - h.x, y - h.y);
    return d < h.r && Math.abs(G.angDiff(Math.atan2(y - h.y, x - h.x), h.a)) < h.spread;
  }
  return false;
};

G.updateHazards = (dt) => {
  const S = G.S, p = S.player, a = S.hazards;
  for (let i = a.length - 1; i >= 0; i--) {
    const h = a[i];
    h.t += dt;
    if (h.follow) h.follow(h);
    if (h.t >= h.warn) {
      if (!h.fired) {
        h.fired = true;
        if (h.kind === 'circle' && h.dmg) {
          if (h.fx === 'lightning') G.lightning(h.x, h.y);
          else if (!h.silent) G.fireBurst(h.x, h.y, h.r * 0.75, h.pal);
        }
      }
      if (h.kind === 'cone' && h.dmg) {
        // nefes yolundaki otlar yanar
        const d = G.rand(40, h.r), an = h.a + G.rand(-h.spread, h.spread) * 0.8;
        G.Ground.scorch(h.x + Math.cos(an) * d, h.y + Math.sin(an) * d, 40 + d * 0.15, 1.6);
      }
      if (h.dmg && G.inHazard(h, p.x, p.y)) G.hurtPlayer(h.dmg);
    }
    if (h.t >= h.warn + h.act) { a[i] = a[a.length - 1]; a.pop(); }
  }
};

G.drawHazards = () => {
  const R = G.R, S = G.S;
  for (const h of S.hazards) {
    const warn = h.t < h.warn, k = warn ? h.t / h.warn : 1;
    const col = h.col || '#ff9a3a';
    if (h.kind === 'circle') {
      if (!warn) continue;
      // videodaki gibi: yere çizilmiş noktalı turuncu elips, dolarken içte ikinci elips büyür
      const blink = 0.55 + 0.45 * Math.abs(Math.sin(h.t * (6 + k * 10)));
      R.ellipseW(h.x, h.y, h.r, h.r * G.EY, col, { w: 1.6, alpha: 0.95 * blink, dash: [1.5, 5], glow: 6 });
      R.ellipseW(h.x, h.y, h.r * k, h.r * k * G.EY, col, { w: 1.2, alpha: 0.5 * k, dash: [1, 6], glow: 4 });
      R.lightW(h.x, h.y, h.r * 1.2, col, 0.35 * k);
    } else if (h.kind === 'line') {
      if (!warn) continue;
      R.polyW([[h.x, h.y], [h.x2, h.y2]], '#ff3a2a', { w: 1.4, alpha: 0.6 + 0.4 * Math.sin(h.t * 20), glow: 8 });
    } else if (h.kind === 'cone') {
      const l = [h.x + Math.cos(h.a - h.spread) * h.r, h.y + Math.sin(h.a - h.spread) * h.r];
      const r2 = [h.x + Math.cos(h.a + h.spread) * h.r, h.y + Math.sin(h.a + h.spread) * h.r];
      if (warn) {
        R.polyW([l, [h.x, h.y], r2], col, { w: 1.3, alpha: 0.7, glow: 6 });
        R.ellipseW(h.x, h.y, h.r, h.r, '#ff3a2a', { a0: h.a - h.spread, a1: h.a + h.spread, w: 1.6, alpha: 0.85, glow: 8 });
      } else {
        for (let d = 60; d < h.r; d += 70) {
          const x = h.x + Math.cos(h.a) * d, y = h.y + Math.sin(h.a) * d;
          R.lightW(x, y, 140 + d * 0.5, '#ff8a2a', 1.6);
          R.bloomW(x, y, 60 + d * 0.3, '#ffb040', 0.3);
        }
      }
    }
  }
};

// ───────────── Boss yaşam döngüsü ─────────────
G.spawnBossAt = (b) => {
  const S = G.S, d = G.BOSSES[b.id], spr = G.SPR[d.body] && G.SPR[d.body].ready ? G.SPR[d.body] : G.Bake.now(d.body);
  const e = {
    id: ++S.eid, type: b.id, d, spr, x: b.x, y: b.y, kx: 0, ky: 0, hp: d.hp, maxHp: d.hp, dmg: d.dmg, xp: d.xp, lv: d.lv,
    spd: d.spd, rad: Math.min(spr.rad * 0.85, b.id === 'dragon' ? 150 : 95), boss: true, bref: b, homeX: b.x, homeY: b.y, active: false,
    flash: 0, anim: 0, flip: true, burn: 0, burnDps: 0, burnTick: 0, hitT: 0, stun: 0, atkT: 0,
    st: 'walk', timer: 2.5, cnt: 0, phase2: false, jump: 0, alpha: 1, dead: false, wob: 0,
  };
  S.enemies.push(e);
  return e;
};

G.summonRing = (type, n, r) => {
  const p = G.S.player, lv = G.S.boss ? Math.max(1, G.S.boss.lv - 2) : 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    G.spawnMonster(type, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7, lv, null);
  }
};
G.poof = (x, y, col) => {
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * 6.28, sp = G.rand(40, 160);
    G.addPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp, G.pick([':', '%', '*', '.']), col, 0.7);
  }
};
// oyuncunun çevresine rastgele hedef noktaları
const aroundPlayer = (n, spread) => {
  const p = G.S.player, out = [[p.x, p.y]];
  for (let i = 1; i < n; i++) out.push([p.x + G.rand(-spread, spread), p.y + G.rand(-spread, spread) * G.EY * 1.4]);
  return out;
};

G.BOSS_AI = {
  // Hedef çizgisi gösterir, hızla hamle yapar; 2. fazda üçlü hamle + iskeletler + şimşek
  blackknight(e, dt, nx, ny) {
    e.timer -= dt;
    if (e.st === 'walk') {
      e.x += nx * e.spd * dt; e.y += ny * e.spd * dt; e.flip = nx < 0;
      if (e.timer <= 0) {
        e.st = 'aim'; e.timer = 0.8; e.ax = nx; e.ay = ny;
        G.addHazard({ kind: 'line', x: e.x, y: e.y, x2: e.x + nx * 520, y2: e.y + ny * 520, w: 40, warn: 0.8, act: 0, dmg: 0 });
        G.SFX.play('warn');
      }
    } else if (e.st === 'aim') {
      if (e.timer <= 0) { e.st = 'charge'; e.timer = 0.8; G.SFX.play('slash'); }
    } else if (e.st === 'charge') {
      e.x += e.ax * 640 * dt; e.y += e.ay * 640 * dt;
      G.Ground.push(e.x, e.y + 20, 60, e.ax * 600, e.ay * 600, dt);
      if (Math.random() < 0.8) G.addPart(e.x, e.y + 40, G.rand(-30, 30), G.rand(-30, 0), G.pick([':', '.', '%']), '#6a6058', 0.5);
      if (e.timer <= 0) {
        e.cnt++;
        if (e.phase2 && e.cnt % 3 !== 0) { e.st = 'walk'; e.timer = 0.15; }
        else {
          e.st = 'rest'; e.timer = 0.9; G.R.shake(6);
          if (e.phase2) for (const [x, y] of aroundPlayer(3, 160)) G.addHazard({ kind: 'circle', x, y, r: 70, warn: 1.0, act: 0.15, dmg: e.dmg, col: '#cfe0ff', fx: 'lightning' });
        }
      }
    } else if (e.st === 'rest') {
      if (e.timer <= 0) {
        e.st = 'walk'; e.timer = e.phase2 ? 1.4 : 2.4;
        if (e.phase2) G.summonRing('skeleton', 4, 240);
      }
    }
    if (!e.phase2 && e.hp < e.maxHp / 2) { e.phase2 = true; G.summonRing('skeleton', 8, 260); G.banner('KARA ŞÖVALYE ÖFKELENDİ!', '#ff3a3a'); }
  },

  // Uzak durur; lanet halkaları (mor patlama), yarasa/hayalet çağırır, 2. fazda şimşek
  witch(e, dt, nx, ny, dist) {
    const p = G.S.player;
    e.timer -= dt; e.cnt += dt;
    const dir = dist > 300 ? 1 : -0.7;
    e.x += (nx * e.spd * dir - ny * 40) * dt; e.y += (ny * e.spd * dir + nx * 40) * dt;
    e.flip = nx < 0;
    if (dist < 140) {
      G.poof(e.x, e.y, '#8e56c8');
      const a = Math.random() * 6.28;
      e.x = p.x + Math.cos(a) * 340; e.y = p.y + Math.sin(a) * 340;
      G.poof(e.x, e.y, '#8e56c8');
    }
    if (e.timer <= 0) {
      e.timer = e.phase2 ? 2.4 : 3.2;
      for (const [x, y] of aroundPlayer(e.phase2 ? 6 : 4, 170))
        G.addHazard({ kind: 'circle', x, y, r: 72, warn: 1.2, act: 0.2, dmg: e.dmg, col: '#c080ff', pal: CURSE_PAL });
      if (e.phase2) for (const [x, y] of aroundPlayer(2, 220)) G.addHazard({ kind: 'circle', x, y, r: 60, warn: 0.9, act: 0.15, dmg: e.dmg, col: '#cfe0ff', fx: 'lightning' });
      G.SFX.play('warn');
    }
    if (e.cnt > 7) { e.cnt = 0; G.summonRing(e.phase2 ? 'ghost' : 'bat', e.phase2 ? 6 : 10, 280); }
    if (!e.phase2 && e.hp < e.maxHp / 2) { e.phase2 = true; G.banner('CADI LANET OKUYOR!', '#b04aff'); }
  },

  // Dev ejderha: ateş nefesi, ateş topu yağmuru, yere çakılma; 2. fazda fırtına (şimşek)
  dragon(e, dt, nx, ny, dist) {
    const p = G.S.player;
    e.timer -= dt;
    const dirx = e.flip ? -1 : 1;
    const mouthX = () => e.x + dirx * e.spr.pw * 0.3;
    const mouthY = () => e.y + e.spr.ph / 2 - (e.spr.top || 200) * 0.55;
    if (e.st === 'walk') {
      const want = dist > 260 ? 1 : dist < 160 ? -0.5 : 0;
      e.x += nx * e.spd * want * dt; e.y += ny * e.spd * want * dt; e.flip = nx < 0;
      if (e.timer <= 0) {
        e.cnt++;
        const pick = e.cnt % 4;
        if (pick === 0) {
          e.st = 'jump'; e.timer = 1.3; e.tx = p.x; e.ty = p.y - 60; e.sx0 = e.x; e.sy0 = e.y;
          G.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 230, warn: 1.3, act: 0.25, dmg: e.dmg, col: '#ff7a2a' });
        } else if (pick === 2 || (e.phase2 && pick === 3)) {
          // ateş topu yağmuru: her hedefte noktalı elips, sonra patlama
          e.st = 'volley'; e.timer = 1.6;
          const targets = aroundPlayer(e.phase2 ? 9 : 6, 230);
          targets.forEach(([x, y], i) => {
            const delay = 0.15 * i, dur = 0.9;
            G.addHazard({ kind: 'circle', x, y, r: 78, warn: delay + dur, act: 0.2, dmg: e.dmg * 0.8, col: '#ff9a3a', silent: true });
            setTimeout(() => { if (G.S && !G.S.dead && e.active) G.fireball(mouthX(), mouthY(), x, y, dur, 70); }, delay * 1000);
          });
          G.SFX.play('warn');
        } else {
          e.st = 'aim'; e.timer = 1.0;
          const a = Math.atan2(p.y - mouthY(), p.x - mouthX());
          e.breath = G.addHazard({
            kind: 'cone', x: mouthX(), y: mouthY(), a, spread: 0.5, r: 560, warn: 1.0, act: 1.8, dmg: e.dmg * 0.6, col: '#ff8a3a',
            follow(h) {
              h.x = mouthX(); h.y = mouthY();
              if (h.t > h.warn) h.a += G.angDiff(Math.atan2(p.y - h.y, p.x - h.x), h.a) * (e.phase2 ? 0.04 : 0.015);
            },
          });
          G.SFX.play('warn');
        }
      }
      if (e.phase2 && Math.random() < dt * 0.5) {
        const [x, y] = aroundPlayer(2, 260)[1];
        G.addHazard({ kind: 'circle', x, y, r: 66, warn: 1.0, act: 0.15, dmg: e.dmg * 0.7, col: '#cfe0ff', fx: 'lightning' });
      }
    } else if (e.st === 'aim') {
      if (e.timer <= 0) { e.st = 'breath'; e.timer = 1.8; G.SFX.play('boss'); }
    } else if (e.st === 'breath') {
      const h = e.breath;
      for (let k = 0; k < 10; k++) {
        const an = h.a + G.rand(-h.spread, h.spread), sp = G.rand(320, 520);
        G.addPart(h.x, h.y, Math.cos(an) * sp, Math.sin(an) * sp, G.pick(['@', '*', 'o', '%', '"']), G.pick(FIRE_PAL), 0.95, { glow: 1, drag: 0.45 });
      }
      G.R.lightW(h.x, h.y, 260, '#ffb040', 1.5);
      G.R.shake(2.5);
      if (e.timer <= 0) { e.st = 'walk'; e.timer = 2.0; }
    } else if (e.st === 'volley') {
      if (e.timer <= 0) { e.st = 'walk'; e.timer = 1.8; }
    } else if (e.st === 'jump') {
      const k = 1 - Math.max(0, e.timer) / 1.3;
      e.x = G.lerp(e.sx0, e.tx, k); e.y = G.lerp(e.sy0, e.ty, k);
      e.jump = Math.sin(k * Math.PI) * 180;
      if (e.timer <= 0) { e.jump = 0; e.st = 'walk'; e.timer = 1.6; G.R.shake(16); }
    }
    if (!e.phase2 && e.hp < e.maxHp / 2) { e.phase2 = true; G.banner('KIZIL EJDER — FAZ 2', '#ff6a2a'); G.R.desat = 0.6; }
  },

  // Kaybolur, oyuncunun arkasında belirip tırpan savurur; hayalet çağırır, kızıl patlamalar
  reaper(e, dt, nx, ny) {
    const p = G.S.player;
    e.timer -= dt; e.cnt += dt;
    if (e.st === 'walk') {
      e.x += nx * e.spd * dt; e.y += ny * e.spd * dt; e.flip = nx < 0;
      e.alpha = 0.85 + Math.sin(e.wob * 4) * 0.15;
      if (e.timer <= 0) {
        e.st = 'vanish'; e.timer = 0.7;
        const a = Math.atan2(p.dirY, p.dirX) + Math.PI + G.rand(-0.6, 0.6);
        e.tx = p.x + Math.cos(a) * 110; e.ty = p.y + Math.sin(a) * 110;
        G.addHazard({ kind: 'circle', x: e.tx, y: e.ty, r: 170, warn: 1.25, act: 0.25, dmg: e.dmg, col: '#ff2a4a', pal: ['#ffd0d8', '#ff7a8a', '#ff2a4a', '#a00820'] });
        G.poof(e.x, e.y, '#3e3650'); G.SFX.play('warn');
      }
    } else if (e.st === 'vanish') {
      e.alpha = Math.max(0, e.timer / 0.7) * 0.6;
      if (e.timer <= 0) { e.x = e.tx; e.y = e.ty; e.st = 'swing'; e.timer = 0.75; G.poof(e.x, e.y, '#3e3650'); }
    } else if (e.st === 'swing') {
      e.alpha = 1;
      if (e.timer <= 0) { e.st = 'walk'; e.timer = e.phase2 ? 1.6 : 2.6; }
    }
    if (e.cnt > 8) {
      e.cnt = 0; G.summonRing('ghost', e.phase2 ? 10 : 7, 280);
      if (e.phase2) for (const [x, y] of aroundPlayer(4, 220)) G.addHazard({ kind: 'circle', x, y, r: 64, warn: 1.0, act: 0.15, dmg: e.dmg * 0.6, col: '#cfe0ff', fx: 'lightning' });
    }
    if (!e.phase2 && e.hp < e.maxHp / 2) { e.phase2 = true; G.banner('ÖLÜM SABIRSIZLANIYOR...', '#ff2a4a'); G.R.desat = 0.7; }
  },
};

G.updateBoss = (e, dt, nx, ny, dist) => {
  const S = G.S, p = S.player;
  if (!e.active) {
    e.flip = p.x < e.x;
    if (dist < 480 + e.rad && !S.dead) {
      e.active = true; S.boss = e; e.timer = 1.5;
      G.banner('» ' + e.d.name.toLocaleUpperCase('tr') + ' «', '#ff4a3a');
      G.SFX.play('boss'); G.R.shake(10);
    }
    return;
  }
  // oyuncu kaçtı ya da öldü: boss sıfırlanır
  if (dist > 1400 || S.dead) {
    e.active = false; S.boss = null; e.hp = e.maxHp; e.phase2 = false; e.x = e.homeX; e.y = e.homeY;
    e.st = 'walk'; e.jump = 0; e.alpha = 1; S.hazards.length = 0;
    return;
  }
  G.BOSS_AI[e.type](e, dt, nx, ny, dist);
  if (dist < e.rad + p.rad + 6 && (e.atkT -= dt) <= 0) { e.atkT = 0.9; G.hurtPlayer(e.dmg * 0.7); }
};

G.drawBoss = (e) => {
  const R = G.R, p = G.S.player;
  const bob = e.type === 'witch' ? Math.sin(e.wob * 2) * 6 - 10 : 0;
  const atk = ['aim', 'breath', 'charge', 'swing', 'vanish', 'volley'].includes(e.st);
  if (!(G.Live && G.Live.has(e.type))) R.sprite(e.spr, Math.floor(e.anim), e.x, e.y - e.jump + bob, { anim: atk ? 'attack' : 'walk',
    flip: e.flip, flash: e.flash > 0, alpha: e.alpha ?? 1, self: true,
    tint: e.st === 'aim' && Math.floor(e.wob * 16) % 2 ? '#ff6a5a' : null,
  });
  // videodaki gibi: bossun vuruş menzilini gösteren ince kırmızı yay
  if (e.active && !e.dead) {
    const a = Math.atan2(p.y - e.y, p.x - e.x), reach = e.rad + 70;
    R.ellipseW(e.x, e.y + e.spr.ph / 2 - 10, reach * 1.6, reach * 1.6 * G.EY, '#ff3a22', { a0: a - 1.1, a1: a + 1.1, w: 1.8, alpha: 0.85, glow: 8 });
  }
};

G.onBossDeath = (e) => {
  const S = G.S, b = e.bref;
  S.boss = null; b.dead = true; b.e = null;
  G.R.shake(18); G.SFX.play('boom');
  S.slowmo = 0.8; S.hazards.length = 0;
  G.fireBurst(e.x, e.y, 160);
  for (let k = 0; k < 70; k++) {
    const a = Math.random() * 6.28, sp = G.rand(80, 360);
    G.addPart(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, G.pick(['*', '#', '%', ':', '+']), G.pick(['#ffd84a', '#ff6a2a', '#ffffff']), G.rand(0.6, 1.3), { glow: 1 });
  }
  for (const s of S.enemies) if (!s.camp && !s.boss) { s.dead = true; s.silent = true; }
  if (e.xp) G.gainXP(e.xp);
  for (let i = 0; i < 14; i++) G.addPickup('coin', e.x + G.rand(-60, 60), e.y + G.rand(-40, 40), Math.round(e.lv * G.rand(3, 6)));
  G.addPickup('hp', e.x + 30, e.y); G.addPickup('mp', e.x - 30, e.y);
  if (e.type === 'reaper') {
    G.World.portal.open = true;
    G.banner('AZRAİL YENİLDİ — PORTAL AÇILDI', '#d0a0ff');
  } else {
    const g = G.World.gates.find((q) => q.zi === b.zi);
    if (g) g.open = true;
    G.banner(e.d.name.toLocaleUpperCase('tr') + ' YENİLDİ — GEÇİT AÇILDI', '#ffd84a');
  }
  G.save();
};
