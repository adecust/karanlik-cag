'use strict';
// ═══════════════════════════════════════════════════════════════════
//  DÜNYA — bölgeler, zemin dokusu, su/lav, yol, kamplar, geçitler, köy, portal
// ═══════════════════════════════════════════════════════════════════
G.World = {
  // ───────────── Zemin ─────────────
  roadY(x) { return Math.sin(x * 0.0016) * 120 + Math.sin(x * 0.0047) * 40; },
  zoneIdx(x) {
    const Z = G.ZONES;
    for (let i = 0; i < Z.length; i++) if (x < Z[i].x1) return i;
    return Z.length - 1;
  },
  // bölge geçişleri yumuşak: sınıra yakın hücreler rastgele komşu bölgeden seçilir
  zoneAtCell(px, h2) {
    const Z = G.ZONES, i = this.zoneIdx(px), z = Z[i];
    const dn = z.x1 - px, dp = px - z.x0;
    if (dn < 200 && i < Z.length - 1 && h2 < 0.5 - dn / 400) return i + 1;
    if (dp < 200 && i > 0 && h2 > 0.5 + dp / 400) return i - 1;
    return i;
  },
  waterAt(px, py, zid) {
    const N = (x, y) => G.R.noise(x, y);
    switch (zid) {
      case 'town': {
        const d = Math.hypot((px + 380) / 1.6, py - 430);
        return d < 95 + N(px * 0.02, py * 0.02) * 30 ? G.K.WATER : 0;
      }
      case 'forest': {
        const rx = 1950 + Math.sin(py * 0.0035) * 150 + Math.sin(py * 0.011) * 35;
        if (Math.abs(px - rx) < 58 + N(py * 0.01, 3) * 22) return G.K.WATER;
        return N(px * 0.0032 + 7, py * 0.0032) > 0.8 ? G.K.WATER : 0;
      }
      case 'grave':
        return N(px * 0.0075 + 20, py * 0.0075 + 5) > 0.78 ? G.K.SWAMP : 0;
      case 'ember': {
        const lx = 7350 + Math.sin(py * 0.004) * 200;
        if (Math.abs(px - lx) < 50 + N(py * 0.012, 9) * 18) return G.K.LAVA;
        return N(px * 0.004 + 40, py * 0.004 + 9) > 0.8 ? G.K.LAVA : 0;
      }
    }
    return 0;
  },
  groundInfo(wx, wy, o) {
    const R = G.R, W = G.WORLD, K = G.K;
    const px = wx * R.CW + 2.5, py = wy * R.CH + 4.5;
    const h = G.hash2(wx, wy), h2 = G.hash2(wx * 7 + 3, wy * 13 + 5);
    const n = R.noise(px * 0.004, py * 0.006), n2 = R.noise(px * 0.016 + 50, py * 0.022);
    o.h = h;
    const pick = (s) => s[Math.floor(h2 * s.length)];
    // dünya dışı: sık orman tabanı
    if (py < W.y0 - 30 || py > W.y1 + 30 || px < W.x0 || px > W.x1) {
      o.kind = K.DIRT; o.ch = pick(',;\'`".:  ');
      const k = 0.35 + n * 0.3; o.r = 0.12 * k; o.g = 0.2 * k; o.b = 0.12 * k; return o;
    }
    const zone = G.ZONES[this.zoneAtCell(px, h2)];
    const wk = this.waterAt(px, py, zone.id);
    const onRoad = Math.abs(py - this.roadY(px)) < 30 + n2 * 22 && zone.id !== 'abyss';
    if (wk && !(onRoad && wk === K.LAVA)) {
      o.kind = wk; o.ch = '~';
      if (wk === K.WATER) { o.r = 0.26; o.g = 0.56; o.b = 0.82; }
      else if (wk === K.SWAMP) { o.r = 0.3; o.g = 0.46; o.b = 0.3; }
      else { o.r = 1; o.g = 0.42 + n2 * 0.2; o.b = 0.08; }
      return o;
    }
    if (onRoad) {
      if (zone.id === 'ember') { // lav üstü taş köprü / kül yol
        o.kind = K.STONE; o.ch = pick('=-_:.  '); const k = 0.6 + n2 * 0.3; o.r = 0.34 * k; o.g = 0.32 * k; o.b = 0.32 * k; return o;
      }
      o.kind = K.DIRT; o.ch = pick('.,:;`_=-.:,');
      const k = 0.8 + n2 * 0.4 + (h - 0.5) * 0.2; o.r = 0.56 * k; o.g = 0.46 * k; o.b = 0.32 * k; return o;
    }
    switch (zone.id) {
      case 'town': {
        if (Math.hypot(px, py * 1.4) < 230 + n2 * 30) {
          o.kind = K.DIRT; o.ch = pick('.,:`. \''); const k = 0.75 + n2 * 0.4; o.r = 0.42 * k; o.g = 0.33 * k; o.b = 0.22 * k; return o;
        }
        o.kind = K.GRASS; o.ch = pick(',\'".` ');
        const hb = G.hash2(wx * 13 + 7, wy * 17 + 3), k = (0.4 + hb * hb * 1.1) * (0.75 + n * 0.45);
        o.r = 0.22 * k; o.g = 0.54 * k; o.b = 0.38 * k; return o;
      }
      case 'forest': {
        o.kind = K.GRASS; o.ch = pick(',\'".` ;');
        // her ot ayrı parlaklıkta (koyu yeşil → açık nane), arada koyu öbekler
        const clump = n2 > 0.62 ? 0.45 : 1, hb = G.hash2(wx * 13 + 7, wy * 17 + 3);
        const k = (0.35 + hb * hb * 1.15) * (0.7 + n * 0.5) * clump;
        o.r = 0.2 * k; o.g = 0.52 * k; o.b = 0.4 * k; return o;
      }
      case 'grave': {
        if (n2 > 0.66) { o.kind = K.DIRT; o.ch = pick('.,:`;_-'); const k = 0.7 + n * 0.3; o.r = 0.44 * k; o.g = 0.38 * k; o.b = 0.3 * k; return o; }
        o.kind = K.DRY; o.ch = pick(',\'.` ;:');
        const k = 0.7 + n * 0.5 + (h - 0.5) * 0.1; o.r = 0.52 * k; o.g = 0.52 * k; o.b = 0.34 * k; return o;
      }
      case 'ember': {
        if (n2 > 0.7 && n > 0.5) { o.kind = K.DRY; o.ch = pick(',\'.'); const k = 0.5 + n * 0.3; o.r = 0.36 * k; o.g = 0.3 * k; o.b = 0.18 * k; return o; }
        o.kind = K.ASH; o.ch = pick('.,`:; ._-');
        const k = 0.55 + n * 0.5 + (h - 0.5) * 0.15; o.r = 0.27 * k; o.g = 0.22 * k; o.b = 0.21 * k; return o;
      }
      default: { // abyss: mor taş döşeme
        o.kind = K.STONE;
        const row = ((wy % 3) + 3) % 3, br = Math.floor(wy / 3);
        if (row === 0) o.ch = '_';
        else if ((((wx + (br & 1) * 6) % 12) + 12) % 12 === 0) o.ch = '|';
        else o.ch = pick('. `  :');
        const k = 0.6 + n * 0.35 + (h - 0.5) * 0.1; o.r = 0.3 * k; o.g = 0.25 * k; o.b = 0.38 * k; return o;
      }
    }
  },
  kindAt(px, py) {
    const o = {};
    this.groundInfo(Math.floor(px / G.R.CW), Math.floor(py / G.R.CH), o);
    return o.kind;
  },

  // ───────────── Kurulum: kamplar, bosslar, geçitler ─────────────
  init(save) {
    let seed = 1337;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const beaten = (zi) => !!(save && save.bosses && save.bosses[zi]);
    this.camps = []; this.bosses = []; this.gates = [];
    G.ZONES.forEach((z, zi) => {
      if (z.boss) {
        const bx = z.x1 - (z.id === 'abyss' ? 600 : 300);
        this.bosses.push({ id: z.boss, zi, x: bx, y: this.roadY(bx), dead: beaten(zi), e: null });
        if (z.id !== 'abyss') this.gates.push({ x: z.x1, zi, open: beaten(zi) });
      }
      for (let c = 0; c < z.camps; c++) {
        let x, y, tries = 0;
        do {
          x = z.x0 + 260 + rnd() * (z.x1 - z.x0 - 620); y = G.WORLD.y0 + 140 + rnd() * (G.WORLD.y1 - G.WORLD.y0 - 280);
          tries++;
        } while (tries < 30 && (Math.abs(y - this.roadY(x)) < 110 || this.waterAt(x, y, z.id)));
        const type = G.weightedR(z.mobs, rnd);
        const k = (x - z.x0) / (z.x1 - z.x0);
        const lv = Math.round(G.lerp(z.lv[0], z.lv[1], k) + (rnd() - 0.5));
        const n = type === 'troll' ? 1 + (rnd() < 0.5 ? 1 : 0) : 2 + Math.floor(rnd() * 3);
        this.camps.push({ x, y, zi, type, lv: G.clamp(lv, z.lv[0], z.lv[1]), slots: Array.from({ length: n }, () => ({ e: null, t: 0 })) });
      }
    });
    this.portal = { x: 9600, y: this.roadY(9600), open: beaten(4) };
  },

  update(dt) {
    const S = G.S, p = S.player;
    for (const c of this.camps) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < 1500) {
        for (const s of c.slots) {
          if (s.e && s.e.dead) { s.e = null; s.t = 24; }
          if (!s.e) {
            s.t -= dt;
            if (s.t <= 0 && (d > 520 || !c.seen)) {
              const a = Math.random() * 6.28, r = Math.random() * 50;
              s.e = G.spawnMonster(c.type, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.6, c.lv, c);
            }
          }
        }
        c.seen = true;
      } else if (d > 2300) {
        for (const s of c.slots) if (s.e && !s.e.dead && s.e.state !== 'chase') { s.e.dead = true; s.e.silent = true; s.e = null; s.t = 0; }
        c.seen = false;
      }
    }
    for (const b of this.bosses) {
      if (b.e && b.e.dead && !b.dead) b.e = null; // ölmeden kaybolan boss yeniden doğar
      if (b.dead || b.e) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < 1500) b.e = G.spawnBossAt(b);
    }
    // bölge girişi duyurusu
    const zi = this.zoneIdx(p.x);
    if (zi !== S.zone) {
      S.zone = zi;
      const z = G.ZONES[zi];
      G.banner(z.name + (z.mobs ? `  ·  Sv ${z.lv[0]}-${z.lv[1]}` : ''), zi === 0 ? '#ffd8a0' : '#e8e2d0');
      G.SFX.play('warn');
    }
    const P = this.portal;
    if (P.open && Math.hypot(p.x - P.x, p.y - P.y) < 34) G.victory();
  },

  // ───────────── Çarpışma: dünya sınırı + geçit duvarları ─────────────
  collide(e, px) {
    const W = G.WORLD;
    e.y = G.clamp(e.y, W.y0, W.y1);
    e.x = G.clamp(e.x, W.x0 + 40, W.x1 - 40);
    for (const g of this.gates) {
      const gx = g.x, crossed = (px < gx - 14 && e.x >= gx - 14) || (px > gx + 14 && e.x <= gx + 14);
      if (!crossed) continue;
      if (!g.open || Math.abs(e.y - this.roadY(gx)) > 64) e.x = px;
    }
    // dekor çarpışması: ayak noktası, dekorun taban elipsinin dışına itilir
    if (!this.solids || (e.d && (e.d.ghost || e.d.ai === 'flutter'))) return;
    const fy = e.y + (e.spr ? e.spr.ph / 2 - 3 : 0), er = e.rad || 10;
    for (const [id, x, y] of this.solids) {
      const f = this.FOOT[id], spr = G.SPR[id]; if (!f || !spr || !spr.ready) continue;
      const bb = this.bounds(spr), w2 = (bb[1] - bb[0]) / 2, ry0 = w2 * f[1];
      const rx = w2 * f[0] + er, ry = ry0 + er * 0.5, cx = x + (bb[0] + bb[1]) / 2, cy = y + this.base(spr) - ry0;
      const dx = (e.x - cx) / rx, dy = (fy - cy) / ry, d = Math.hypot(dx, dy);
      if (d >= 1) continue;
      if (d < 1e-3) { e.y += ry; continue; }
      e.x = cx + (dx / d) * rx; e.y += cy + (dy / d) * ry - fy;
    }
  },
  // sprite hücre sınırları [solX, sağX, altY] (bir kez hesaplanır)
  bounds(spr) {
    return spr.bnd || (spr.bnd = spr.frames[0].cells.reduce((b, q) => [Math.min(b[0], q.dx), Math.max(b[1], q.dx), Math.max(b[2], q.dy)], [1e9, -1e9, -1e9]));
  },
  // dekorun zemine değdiği yerin, yerleşim noktasına göre dikey uzaklığı
  base(spr) { return spr && spr.ready ? this.bounds(spr)[2] - spr.ph / 2 : 0; },
  // taban elipsi: [genişlik, derinlik] — çizimin yarı genişliğinin katları; ağaçlarda yalnız gövde
  FOOT: {
    house: [0.95, 0.45], well: [0.85, 0.4], pine: [0.3, 0.18], deadtree: [0.35, 0.2],
    rock: [0.9, 0.5], ruin: [0.9, 0.35], pillar: [0.6, 0.35], grave: [0.8, 0.4], cross: [0.5, 0.3],
    merchant: [0.8, 0.4],
  },
  ambientAt(x) {
    const A = { town: [0.4, 0.4, 0.47], forest: [0.33, 0.39, 0.44], grave: [0.28, 0.31, 0.41], ember: [0.42, 0.28, 0.24], abyss: [0.25, 0.18, 0.32] };
    const i = this.zoneIdx(x), z = G.ZONES[i], a = A[z.id];
    const nz = G.ZONES[i + 1];
    if (nz && z.x1 - x < 400) { const b = A[nz.id], k = 1 - (z.x1 - x) / 400; return a.map((v, j) => G.lerp(v, b[j], k * 0.5)); }
    return a;
  },

  // ───────────── Çizim: dekor, köy, geçitler, portal ─────────────
  PROPS: {
    forest: ['pine', 'pine', 'ruin', 'rock', 'deadtree', 'ruin', 'pine'],
    grave: ['ruin', 'grave', 'grave', 'cross', 'cross', 'deadtree', 'deadtree', 'bones', 'pillar'],
    ember: ['rock', 'rock', 'rock', 'bones', 'deadtree', 'pillar', 'rock'],
    abyss: ['pillar', 'pillar', 'bones'],
    town: ['pine'],
  },
  TOWN: [
    ['house', -480, -330], ['house', 20, -470], ['house', 470, -300], ['house', 430, 380],
    ['well', -260, 230], ['merchant', 120, -70], ['pine', -560, 120], ['pine', 520, -80], ['pine', -600, -520], ['pine', 200, 520],
  ],
  props(R) {
    const cam = R.cam, W = G.WORLD;
    const left = cam.x - R.VW / 2 - 80, top = cam.y - R.VH / 2 - 120, right = left + R.VW + 160, bot = top + R.VH + 240;
    const list = [];
    const ps = 170;
    for (let cx = Math.floor(left / ps); cx <= Math.ceil(right / ps); cx++) for (let cy = Math.floor(top / ps); cy <= Math.ceil(bot / ps); cy++) {
      const h = G.hash2(cx * 7919 + cy * 104729, cy * 15485863 + 17), h2 = G.hash2(cx * 32452843 + 5, cx * 49979687 + cy * 86028121);
      const h3 = G.hash2(cy * 1299709 + cx * 3, cx * 7 + 999983);
      const x = cx * ps + h3 * 130, y = cy * ps + ((h2 * 7.31) % 1) * 130;
      const outside = y < W.y0 - 20 || y > W.y1 + 20;
      if (!outside && h > 0.34) continue;
      if (outside && h > 0.9) continue;
      const zone = G.ZONES[this.zoneIdx(x)];
      if (!outside) {
        if (zone.id === 'town') continue;
        if (Math.abs(y - this.roadY(x)) < 100 || this.waterAt(x, y, zone.id)) continue;
        if (this.gates.some((g) => Math.abs(g.x - x) < 160)) continue;
      }
      const tbl = outside ? ['pine', 'pine', 'pine', 'rock'] : this.PROPS[zone.id];
      list.push([tbl[Math.floor(h2 * tbl.length)], x, y]);
    }
    if (Math.abs(cam.x) < R.VW) for (const t of this.TOWN) list.push(t);
    this.solids = list; // collide() bu karedeki dekorlarla çarpışır
    return list;
  },
  draw(R, t) {
    // geçit duvarları
    for (const g of this.gates) {
      if (Math.abs(g.x - R.cam.x) > R.VW) continue;
      const ry = this.roadY(g.x);
      for (let y = G.WORLD.y0 - 40; y < G.WORLD.y1 + 40; y += 34) {
        if (Math.abs(y - ry) < 64) continue;
        R.sprite(G.SPR.wall, 0, g.x, y);
      }
      if (!g.open) {
        R.sprite(G.SPR.portcullis, 0, g.x, ry - 30);
        R.sprite(G.SPR.portcullis, 0, g.x, ry + 24);
      }
      for (const oy of [-80, 80]) {
        R.sprite(G.SPR.brazier, Math.floor(t * 9) + (oy > 0 ? 2 : 0), g.x - 34, ry + oy, {});
        R.lightW(g.x - 34, ry + oy - 10, 170, '#ffb070', 0.8);
      }
    }
    // köy kamp ateşi
    if (Math.abs(R.cam.x) < R.VW) {
      const fl = 0.9 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.04;
      R.sprite(G.SPR.campfire, Math.floor(t * 10), 0, 0, {});
      R.lightW(0, -8, 380, '#ff9a4a', 1.3 * fl);
      R.bloomW(0, -14, 90, '#ff7a2a', 0.22 * fl);
      if (G.S && Math.random() < 0.5) G.addPart(G.rand(-8, 8), -16, G.rand(-10, 10), -G.rand(40, 80), G.pick(['.', '\'', '*']), G.pick(['#ffb040', '#ff7a2a', '#ffe680']), G.rand(0.6, 1.2), { glow: 1, drag: 0.5 });
    }
    // portal
    const P = this.portal;
    if (P && P.open && Math.abs(P.x - R.cam.x) < R.VW) {
      R.sprite(G.SPR.portal, Math.floor(t * 8), P.x, P.y, { emissive: true });
      R.lightW(P.x, P.y, 300, '#b07aff', 1.2);
      R.bloomW(P.x, P.y - 10, 120, '#9a5aff', 0.35);
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * 6.28;
        G.addPart(P.x + Math.cos(a) * 60, P.y - 20 + Math.sin(a) * 50, -Math.cos(a) * 60, -Math.sin(a) * 50, G.pick(['*', '.', '+']), G.pick(['#d0a0ff', '#ffffff', '#9a5aff']), 0.9, { glow: 1, drag: 0.8 });
      }
    }
  },
};

// tohumlu ağırlıklı seçim
G.weightedR = (obj, rnd) => {
  let total = 0;
  for (const k in obj) total += obj[k];
  let r = rnd() * total;
  for (const k in obj) if ((r -= obj[k]) <= 0) return k;
  return Object.keys(obj)[0];
};
