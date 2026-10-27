'use strict';
// ═══════════════════════════════════════════════════════════════════
//  HACİMLİ ASCII KARAKTERLER
//  Her yaratık basit 3B hacimlerden (elips, konik kapsül) kurulur.
//  Açılışta her animasyon karesi ışıklandırılır; her hücre 3x4 alt-örnekle
//  taranır ve şekle/ışığa en iyi uyan ASCII karakter, fontun gerçek
//  mürekkep haritasıyla eşleştirilerek seçilir.
// ═══════════════════════════════════════════════════════════════════

const M = (c, spec = 0, em = false) => ({ c, spec, em });
const E = (x, y, rx, ry, m, rot = 0) => ({ t: 0, x, y, rx, ry, rot, m });
const C = (x1, y1, x2, y2, r1, r2, m) => ({ t: 1, x1, y1, x2, y2, r1, r2, m });
const D = (x, y, ch, m) => ({ t: 2, x, y, ch, m });
const PI = Math.PI;
const sin = Math.sin, cos = Math.cos;

// ───────────── Uzuv yardımcıları (y yukarı negatif, ayaklar y=0) ─────────────
const leg = (ph, hx, hy, step, lift, rT, rS, m, foot) => {
  const sw = sin(ph) * step, up = Math.max(0, cos(ph)) * lift;
  const fx = hx + sw, fy = -up - rS * 0.6;
  const kx = (hx + fx) / 2 + 2.5, ky = (hy + fy) / 2 - up * 0.4;
  return [C(hx, hy, kx, ky, rT, rS * 1.05, m), C(kx, ky, fx, fy, rS * 1.05, rS * 0.9, m), E(fx + 2, fy + 0.5, rS + 1.6, rS * 0.65, foot || m)];
};
const arm = (ph, sx, sy, len, swing, r, m, fwd = 0) => {
  const sw = sin(ph) * swing;
  const ex = sx + sw * 0.55 + fwd * 0.5, ey = sy + len * 0.5;
  const hx = sx + sw + 2 + fwd, hy = sy + len * 0.95 - fwd * 0.4;
  return { p: [C(sx, sy, ex, ey, r, r * 0.92, m), C(ex, ey, hx, hy, r * 0.92, r * 0.8, m)], hx, hy };
};

// ───────────── Malzemeler ─────────────
const MAT = {
  steel: M('#c4cede', 0.9), steelD: M('#7c8698', 0.6), visor: M('#14161e'), tabard: M('#e8e2d0', 0.1),
  red: M('#d0342c', 0.2), cape: M('#8a1e1a', 0.1), leather: M('#6e4c30', 0.1), gold: M('#ffcf4a', 0.9),
  skin: M('#e0a87a', 0.15), skinD: M('#b88058', 0.1), fur: M('#7c5434'), bronze: M('#c08844', 0.8),
  ivory: M('#f0e6cc', 0.3), beard: M('#d8702a'), pants: M('#4e3e2c'),
  robe: M('#8a6644'), robeD: M('#5e442c'), rope: M('#e0c060', 0.3), shadow: M('#1a120c'),
  bat: M('#5e4a7a', 0.2), batW: M('#3e2e54', 0.1), eyeR: M('#ff3a3a', 0, true), eyeY: M('#ffe23a', 0, true), eyeC: M('#8ffcff', 0, true),
  zskin: M('#7fae62', 0.1), zcloth: M('#5e5444'), zclothD: M('#443c30'),
  bone: M('#ece4cc', 0.25), boneD: M('#b8b098', 0.1),
  wolf: M('#8a909c', 0.15), wolfL: M('#c0c6d0', 0.2), wolfD: M('#5c606a'),
  ghost: M('#c4dcff', 0.5), ghostD: M('#8aa4d0', 0.3), void: M('#101828'),
  spider: M('#3e2e46', 0.5), spiderL: M('#6a5274', 0.3),
  troll: M('#6f9a52', 0.15), trollD: M('#4e7238'), tusk: M('#f0ead8', 0.3), wood: M('#7a5432', 0.1),
  dark: M('#3a3a50', 0.95), darkD: M('#24242e', 0.6), darkR: M('#6a1414', 0.2),
  witch: M('#6a3aa0', 0.2), witchD: M('#40206a'), wskin: M('#8fc46a', 0.2), straw: M('#c8a050'),
  dragon: M('#b02e26', 0.45), dragonD: M('#6a1612', 0.3), belly: M('#e8903a', 0.3), wing: M('#5a1410', 0.15), horn: M('#e8dcc0', 0.4), teeth: M('#ffffff', 0.4, true),
  reaper: M('#2e2840', 0.2), reaperD: M('#1a1626'), blade: M('#dfe8f4', 1), skull: M('#e8e0c8', 0.3),
  pine: M('#4a9a58', 0.1), pineD: M('#336e40'), bark: M('#5a3e28'), stone: M('#8a8e9c', 0.2), stoneD: M('#5e6270', 0.1),
  chest: M('#9a6a34', 0.2), iron: M('#5a5e68', 0.6), fire: M('#ffb040', 0, true), fireY: M('#ffe680', 0, true), fireR: M('#ff5a1a', 0, true),
};

// Malzeme dokusu: iç hücrelerde kullanılan karakter rampası (koyu → parlak)
// az karakter + renkle gölgeleme = temiz, el işi doku
const RAMPS = {
  metal: '=#', fur: ';"', bone: '=+', flesh: ':*', cloth: '+%',
  scale: '=%', ghost: ':=', wood: '|=', leaf: '^*', stone: ':#', fire: '*#',
};
for (const k of ['steel', 'steelD', 'dark', 'darkD', 'iron', 'blade', 'bronze', 'gold']) MAT[k].ramp = RAMPS.metal;
for (const k of ['fur', 'beard', 'wolf', 'wolfL', 'wolfD', 'straw']) MAT[k].ramp = RAMPS.fur;
for (const k of ['bone', 'boneD', 'skull', 'ivory', 'horn', 'tusk']) MAT[k].ramp = RAMPS.bone;
for (const k of ['skin', 'skinD', 'zskin', 'wskin', 'troll', 'trollD']) MAT[k].ramp = RAMPS.flesh;
for (const k of ['dragon', 'dragonD', 'belly', 'spider', 'spiderL']) MAT[k].ramp = RAMPS.scale;
for (const k of ['ghost', 'ghostD']) MAT[k].ramp = RAMPS.ghost;
for (const k of ['wood', 'bark', 'chest']) MAT[k].ramp = RAMPS.wood;
for (const k of ['pine', 'pineD']) MAT[k].ramp = RAMPS.leaf;
for (const k of ['stone', 'stoneD']) MAT[k].ramp = RAMPS.stone;
for (const k of ['fire', 'fireY', 'fireR']) MAT[k].ramp = RAMPS.fire;

// ───────────── VÜCUT TANIMLARI (sağa bakar) ─────────────
G.BODIES = {
  knight: {
    h: 74, rad: 12, frames: 8, fps: 10,
    pose(ph) {
      const b = -Math.abs(sin(ph)) * 2, m = MAT, P = [];
      P.push(...arm(ph + PI, -3, -50 + b, 20, 7, 3.2, m.steelD).p);
      P.push(...leg(ph + PI, -3, -31 + b, 8, 4, 4.2, 3.5, m.steelD, m.leather));
      P.push(C(-5, -52 + b, -12 - sin(ph) * 2, -22 + b, 5, 9, m.cape));
      P.push(E(0, -41 + b, 11.5, 13, m.steel));
      P.push(E(2.5, -39 + b, 7, 11, m.tabard));
      P.push(E(-6, -51 + b, 6.5, 4.6, m.steel), E(6, -51 + b, 6.5, 4.6, m.steel));
      P.push(C(-9, -29 + b, 9, -29 + b, 2.2, 2.2, m.leather));
      P.push(...leg(ph, 3, -31 + b, 8, 4, 4.6, 3.8, m.steel, m.leather));
      P.push(E(1, -61 + b, 8, 9, m.steel));
      P.push(C(3, -61 + b, 9.5, -60 + b, 1.4, 1.4, m.visor));
      P.push(C(-1, -70 + b, -11, -65 + b + sin(ph * 2) * 1.5, 3, 1.4, m.red));
      const a = arm(ph, 3, -50 + b, 20, 7, 3.4, m.steel);
      P.push(...a.p);
      P.push(C(a.hx + 1, a.hy, a.hx + 6, a.hy - 27, 1.7, 1.1, m.steel));
      P.push(C(a.hx - 3, a.hy - 2, a.hx + 5, a.hy - 3, 1.5, 1.5, m.gold));
      P.push(D(3, -42 + b, '+', m.red));
      return P;
    },
  },
  barbarian: {
    h: 78, rad: 13, frames: 8, fps: 9,
    pose(ph) {
      const b = -Math.abs(sin(ph)) * 2.5, m = MAT, P = [];
      P.push(...arm(ph + PI, -4, -52 + b, 21, 8, 4, m.skinD).p);
      P.push(...leg(ph + PI, -4, -31 + b, 9, 4, 5, 4, m.pants, m.fur));
      P.push(C(2, -50 + b, -12, -12 + b, 3, 3, m.wood));
      P.push(E(-11, -14 + b, 6, 4, m.iron, -0.6));
      P.push(E(0, -42 + b, 12.5, 14, m.skin));
      P.push(E(-1, -44 + b, 13, 10, m.fur));
      P.push(C(-11, -31 + b, 11, -31 + b, 3, 3, m.leather));
      P.push(...leg(ph, 3, -31 + b, 9, 4, 5.4, 4.3, m.pants, m.fur));
      P.push(E(2, -63 + b, 8, 8.5, m.skin));
      P.push(E(5, -57 + b, 6, 6, m.beard));
      P.push(E(1, -67 + b, 8.5, 5, m.bronze));
      P.push(C(-3, -69 + b, -10, -78 + b, 2.6, 1, m.ivory));
      P.push(C(4, -69 + b, 9, -79 + b, 2.6, 1, m.ivory));
      P.push(D(6, -63 + b, '.', MAT.visor));
      const a = arm(ph, 4, -52 + b, 21, 8, 4.4, m.skin);
      P.push(...a.p);
      return P;
    },
  },
  monk: {
    h: 72, rad: 11, frames: 8, fps: 8,
    pose(ph) {
      const b = -Math.abs(sin(ph)) * 1.5, m = MAT, P = [], s = sin(ph);
      P.push(...arm(ph + PI, -3, -48 + b, 18, 5, 3.6, m.robeD).p);
      P.push(E(-5 - s * 4, -3, 4, 2.5, m.leather), E(5 + s * 4, -3, 4, 2.5, m.leather));
      P.push(C(0, -46 + b, s * 2, -12, 9, 13, m.robe));
      P.push(E(s * 1.5, -8, 14, 7, m.robe, s * 0.12));
      P.push(C(-8, -30 + b, 8, -30 + b, 1.8, 1.8, m.rope));
      P.push(C(5, -30 + b, 7 + s, -18 + b, 1.2, 1, m.rope));
      P.push(E(0, -60 + b, 9, 10, m.robe));
      P.push(E(4, -58 + b, 4.5, 6, m.shadow));
      P.push(E(5, -57 + b, 3, 4, m.skin));
      P.push(C(-6, -66 + b, -1, -70 + b, 3, 2, m.robeD));
      const a = arm(ph, 3, -48 + b, 18, 5, 3.8, m.robe, 4);
      P.push(...a.p);
      P.push(E(a.hx + 1, a.hy, 2.5, 2.5, m.skin));
      P.push(D(4, -40 + b, '+', m.gold));
      return P;
    },
  },

  // ───────────── YARATIKLAR ─────────────
  bat: {
    h: 34, rad: 10, frames: 6, fps: 14,
    pose(ph) {
      const m = MAT, f = sin(ph), y = -16 + f * 2, P = [];
      for (const s of [-1, 1]) {
        const tx = s * 20, ty = y - 2 - f * 13;
        P.push(C(s * 3, y - 1, s * 11, ty + 4, 3.4, 1.6, m.batW));
        P.push(C(s * 11, ty + 4, tx, ty, 2.4, 0.8, m.batW));
        P.push(C(s * 6, y + 3, tx * 0.8, ty + 8, 2.2, 0.6, m.batW));
      }
      P.push(E(0, y + 1, 5, 6.5, m.bat));
      P.push(E(1, y - 6, 4, 3.6, m.bat));
      P.push(C(-1, y - 8, -2, y - 13, 1.3, 0.5, m.bat), C(3, y - 8, 4, y - 13, 1.3, 0.5, m.bat));
      P.push(D(3, y - 6, 'o', m.eyeR));
      return P;
    },
  },
  zombie: {
    h: 70, rad: 12, frames: 8, fps: 5,
    pose(ph) {
      const m = MAT, b = -Math.abs(sin(ph)) * 1.5, P = [], lean = 4;
      P.push(C(-1 + lean, -50 + b, 16 + lean, -45 + b + sin(ph) * 2, 3, 2.4, m.zskin));
      P.push(...leg(ph + PI, -3, -30 + b, 6, 2, 4, 3.4, m.zclothD, m.zclothD));
      P.push(E(1 + lean * 0.5, -41 + b, 9.5, 13, m.zcloth, 0.15));
      P.push(C(-8, -34 + b, -3, -22 + b, 2, 1, m.zclothD));
      P.push(...leg(ph, 3, -30 + b, 6, 2, 4.3, 3.6, m.zcloth, m.zclothD));
      P.push(E(5 + lean, -59 + b, 7.5, 8, m.zskin, 0.3));
      P.push(C(1 + lean, -50 + b, 18 + lean, -44 + b - sin(ph) * 2, 3.2, 2.6, m.zskin));
      P.push(D(9 + lean, -61 + b, 'o', m.eyeR));
      P.push(D(9 + lean, -55 + b, '=', m.zclothD));
      return P;
    },
  },
  skeleton: {
    h: 70, rad: 11, frames: 8, fps: 8,
    pose(ph) {
      const m = MAT, b = -Math.abs(sin(ph)) * 1.5, P = [];
      P.push(...arm(ph + PI, -2, -49 + b, 19, 7, 1.6, m.boneD).p);
      P.push(...leg(ph + PI, -2, -29 + b, 8, 4, 2, 1.7, m.boneD, m.boneD));
      P.push(C(0, -50 + b, 0, -28 + b, 1.6, 1.6, m.bone));
      for (let i = 0; i < 4; i++) P.push(C(-6 + i * 0.3, -47 + i * 4 + b, 6 - i * 0.6, -46 + i * 4 + b, 1.2, 1.2, m.bone));
      P.push(E(0, -27 + b, 6, 3.5, m.bone));
      P.push(...leg(ph, 2, -29 + b, 8, 4, 2.2, 1.9, m.bone, m.bone));
      P.push(E(2, -60 + b, 7, 7.5, m.bone));
      P.push(E(4, -55 + b, 4, 3, m.boneD));
      P.push(...arm(ph, 2, -49 + b, 19, 7, 1.8, m.bone).p);
      P.push(D(4, -61 + b, 'o', m.eyeR));
      return P;
    },
  },
  wolf: {
    h: 46, rad: 16, frames: 8, fps: 12,
    pose(ph) {
      const m = MAT, P = [], s = sin(ph), c = cos(ph), b = -Math.abs(s) * 1.5;
      const lg = (x, p, mm) => {
        const sw = sin(p) * 7, up = Math.max(0, cos(p)) * 4;
        return [C(x, -20 + b, x + sw * 0.5 + 1, -10, 3.4, 2.6, mm), C(x + sw * 0.5 + 1, -10, x + sw, -1 - up, 2.6, 2, mm)];
      };
      P.push(...lg(-14, ph + PI, m.wolfD), ...lg(10, ph, m.wolfD));
      P.push(C(-17, -25 + b, -31, -32 + b + c * 3, 4.5, 2, m.wolf));
      P.push(E(-3, -23 + b, 18, 8.5, m.wolf));
      P.push(E(-2, -18 + b, 14, 4, m.wolfL));
      P.push(E(13, -25 + b, 10, 10, m.wolf));
      P.push(...lg(-11, ph, m.wolf), ...lg(13, ph + PI, m.wolf));
      P.push(E(23, -31 + b, 7.5, 6.5, m.wolf));
      P.push(C(26, -30 + b, 35, -27 + b, 4, 2.6, m.wolfL));
      P.push(C(20, -36 + b, 19, -44 + b, 2.6, 0.6, m.wolf), C(24, -36 + b, 25, -44 + b, 2.4, 0.6, m.wolf));
      P.push(D(27, -33 + b, 'o', m.eyeR));
      return P;
    },
  },
  ghost: {
    h: 64, rad: 14, frames: 6, fps: 7,
    pose(ph) {
      const m = MAT, P = [], s = sin(ph), w = cos(ph);
      P.push(C(0, -30, -6 + s * 6, -6, 11, 1.5, m.ghostD));
      P.push(C(0, -30, 6 + w * 5, -8, 9, 1.5, m.ghostD));
      P.push(E(0, -40, 12, 15, m.ghost));
      P.push(C(-7, -38, -15 - s * 3, -28 + w * 3, 3, 1, m.ghost), C(8, -38, 17 + s * 3, -30 - w * 3, 3, 1, m.ghost));
      P.push(E(-3, -44, 2.6, 3.4, m.void), E(5, -44, 2.6, 3.4, m.void), E(1, -35, 3, 3.8, m.void));
      P.push(D(-3, -44, '.', m.eyeC), D(5, -44, '.', m.eyeC));
      return P;
    },
  },
  spider: {
    h: 36, rad: 15, frames: 6, fps: 14,
    pose(ph) {
      const m = MAT, P = [];
      for (let i = 0; i < 4; i++) for (const side of [0, 1]) {
        const p = ph + i * 1.3 + side * PI, x0 = -2 + i * 4, sw = sin(p) * 5, up = Math.max(0, cos(p)) * 4;
        const kx = x0 + (i < 2 ? -9 : 9) + sw * 0.4, fx = x0 + (i < 2 ? -16 : 18) + sw;
        P.push(C(x0, -16, kx, -28 - up, 1.7, 1.4, side ? m.spiderL : m.spider), C(kx, -28 - up, fx, -1 - up * 0.5, 1.4, 0.8, side ? m.spiderL : m.spider));
      }
      P.push(E(-9, -16, 11, 8.5, m.spider));
      P.push(E(-11, -19, 5, 3, m.darkR));
      P.push(E(7, -15, 7, 6, m.spiderL));
      P.push(D(11, -17, ':', m.eyeR), D(9, -18, '.', m.eyeR));
      return P;
    },
  },
  troll: {
    h: 104, rad: 24, frames: 8, fps: 6,
    pose(ph) {
      const m = MAT, b = -Math.abs(sin(ph)) * 3, P = [];
      P.push(...arm(ph + PI, -10, -72 + b, 34, 8, 6.5, m.trollD).p);
      P.push(...leg(ph + PI, -6, -40 + b, 9, 4, 8, 6.5, m.trollD, m.trollD));
      P.push(E(0, -58 + b, 19, 23, m.troll));
      P.push(E(3, -50 + b, 14, 14, m.troll));
      P.push(E(1, -38 + b, 15, 8, m.fur));
      P.push(...leg(ph, 6, -40 + b, 9, 4, 8.5, 7, m.troll, m.trollD));
      P.push(E(8, -82 + b, 9, 9, m.troll));
      P.push(C(12, -78 + b, 13, -86 + b, 1.6, 0.6, m.tusk), C(16, -78 + b, 18, -85 + b, 1.6, 0.6, m.tusk));
      const a = arm(ph, 9, -72 + b, 34, 8, 7, m.troll, 3);
      P.push(...a.p);
      P.push(C(a.hx, a.hy, a.hx + 14, a.hy - 30, 4, 7.5, m.wood));
      P.push(D(10, -85 + b, 'o', m.eyeY));
      return P;
    },
  },

  // ───────────── BOSSLAR ─────────────
  blackknight: {
    h: 150, rad: 34, frames: 8, fps: 7, scale: 1.6,
    pose(ph) {
      const m = MAT, b = -Math.abs(sin(ph)) * 3, P = [];
      P.push(...arm(ph + PI, -8, -104 + b, 42, 9, 7, m.darkD).p);
      P.push(...leg(ph + PI, -7, -62 + b, 14, 6, 9, 7.5, m.darkD, m.darkD));
      P.push(C(-10, -108 + b, -26 - sin(ph) * 5, -36 + b, 10, 22, m.darkR));
      P.push(E(0, -84 + b, 22, 27, m.dark));
      P.push(E(2, -94 + b, 26, 9, m.dark));
      P.push(E(4, -80 + b, 13, 19, m.darkD));
      P.push(C(-18, -60 + b, 18, -60 + b, 4.5, 4.5, m.darkR));
      P.push(...leg(ph, 7, -62 + b, 14, 6, 9.5, 8, m.dark, m.darkD));
      P.push(E(3, -124 + b, 15, 16, m.dark));
      P.push(C(-6, -132 + b, -22, -148 + b, 4, 1, m.darkD), C(10, -132 + b, 24, -148 + b, 4, 1, m.darkD));
      P.push(C(6, -124 + b, 18, -123 + b, 2.6, 2.6, m.visor));
      const a = arm(ph, 6, -104 + b, 42, 9, 7.5, m.dark, 6);
      P.push(...a.p);
      P.push(C(a.hx, a.hy, a.hx + 18, a.hy - 66, 4, 2.4, m.steelD));
      P.push(C(a.hx - 8, a.hy - 3, a.hx + 9, a.hy - 6, 3, 3, m.darkR));
      P.push(D(9, -124 + b, 'o', m.eyeR), D(14, -124 + b, 'o', m.eyeR));
      return P;
    },
  },
  witch: {
    h: 150, rad: 30, frames: 6, fps: 5, scale: 1.6,
    pose(ph) {
      const m = MAT, P = [], s = sin(ph), c = cos(ph);
      P.push(C(-34, -6 + s * 3, 34, -14 + s * 3, 2.4, 2.4, m.wood));
      P.push(C(-34, -6 + s * 3, -50, -2 + c * 2, 7, 2, m.straw));
      P.push(C(0, -88, 4 * s, -14, 15, 26, m.witch));
      P.push(E(s * 4, -16, 28, 9, m.witchD, s * 0.1));
      P.push(C(-3, -86, -24 + c * 6, -48, 5, 4, m.witchD));
      P.push(E(2, -104, 11, 12, m.wskin));
      P.push(C(9, -104, 19, -98, 3, 1.4, m.wskin));
      P.push(C(-12, -100, -16, -60, 7, 3, m.witchD));
      P.push(E(0, -114, 30, 5.5, m.witch));
      P.push(C(0, -118, -10 + c * 4, -160, 16, 1.5, m.witch));
      P.push(C(-11, -122, 11, -122, 3, 3, m.gold));
      const a = arm(ph * 0.5, 5, -86, 30, 4, 4.5, m.witch, 10);
      P.push(...a.p);
      P.push(E(a.hx + 4, a.hy - 3, 5, 5, m.eyeC));
      P.push(D(6, -107, 'o', m.eyeY), D(1, -107, 'o', m.eyeY));
      return P;
    },
  },
  dragon: {
    h: 250, rad: 70, frames: 6, fps: 5, scale: 1.3,
    pose(ph) {
      const m = MAT, P = [], f = sin(ph), c = cos(ph), b = f * 3;
      // kanat: omuzdan dirseğe ve uca kemik, aradaki zar sırttan kemiğe gerilmiş yelpaze
      const wing = (sx, sy, k, mat) => {
        const up = f * 50;
        const el = [sx - 20 * k, sy - 70 - up * 0.6], tip = [sx - 110 * k, sy - 95 - up];
        P.push(C(sx, sy, el[0], el[1], 6, 4, MAT.dragonD), C(el[0], el[1], tip[0], tip[1], 4, 1.2, MAT.dragonD));
        for (let i = 0; i <= 7; i++) {
          const t = i / 7;
          const bx = t < 0.35 ? G.lerp(sx, el[0], t / 0.35) : G.lerp(el[0], tip[0], (t - 0.35) / 0.65);
          const by = t < 0.35 ? G.lerp(sy, el[1], t / 0.35) : G.lerp(el[1], tip[1], (t - 0.35) / 0.65);
          const ax = sx - (20 + t * 95) * k * 1.1, ay = sy + 18 - t * 10 + Math.sin(t * 9) * 3;
          P.push(C(bx, by, ax, ay, 2 + (1 - t) * 3, 7 + (1 - t) * 6, mat));
        }
        for (const t of [0.55, 0.78]) {
          const bx = G.lerp(el[0], tip[0], t), by = G.lerp(el[1], tip[1], t);
          P.push(C(bx, by, sx - (40 + t * 70) * k, sy + 14, 1.6, 1, MAT.dragonD));
        }
      };
      wing(-6, -140 + b, 0.85, m.wing);
      // kuyruk
      const tl = [[-70, -95], [-120, -78 + c * 6], [-160, -84 + f * 10], [-188, -108 + c * 12]];
      let px = -50, py = -100 + b, r = 24;
      for (const [x, y] of tl) { P.push(C(px, py, x, y + b, r, r * 0.62, m.dragon)); px = x; py = y + b; r *= 0.62; }
      P.push(C(px, py, px - 14, py - 10, r, 0.5, m.dragonD));
      const lg = (x, p, mm, big) => {
        const sw = sin(p) * 14, up = Math.max(0, cos(p)) * 8;
        P.push(C(x, -90 + b, x + sw * 0.5 - 6, -44, big, big * 0.75, mm), C(x + sw * 0.5 - 6, -44, x + sw, -6 - up, big * 0.75, big * 0.5, mm));
        P.push(E(x + sw + 6, -4 - up, big * 0.8, 5, MAT.dragonD));
      };
      lg(-40, ph + PI, m.dragonD, 15); lg(40, ph, m.dragonD, 12);
      // gövde
      P.push(E(0, -100 + b, 72, 40, m.dragon));
      P.push(E(8, -82 + b, 56, 22, m.belly));
      for (let i = -4; i <= 4; i++) P.push(D(i * 13, -138 + b + Math.abs(i) * 2, '^', m.dragonD));
      lg(-30, ph, m.dragon, 16); lg(50, ph + PI, m.dragon, 13);
      // boyun + baş
      P.push(C(52, -112 + b, 96, -160 + b + c * 4, 30, 17, m.dragon));
      P.push(C(62, -100 + b, 100, -150 + b, 16, 9, m.belly));
      const hx = 112, hy = -170 + b + c * 4;
      P.push(E(hx, hy, 24, 17, m.dragon));
      P.push(C(hx + 8, hy + 2, hx + 44, hy + 6, 13, 8, m.dragon));
      P.push(C(hx + 6, hy + 14, hx + 38, hy + 16 + Math.max(0, f) * 4, 7, 4, m.dragonD));
      P.push(C(hx - 10, hy - 12, hx - 34, hy - 30, 5, 1, m.horn), C(hx, hy - 14, hx - 16, hy - 38, 5, 1, m.horn));
      for (let i = 0; i < 4; i++) P.push(D(hx + 20 + i * 6, hy + 11, 'v', m.teeth));
      P.push(D(hx + 8, hy - 5, 'O', m.eyeY));
      wing(14, -136 + b, 0.55, m.wing);
      return P;
    },
  },
  reaper: {
    h: 175, rad: 38, frames: 6, fps: 5, scale: 1.6,
    pose(ph) {
      const m = MAT, P = [], s = sin(ph), c = cos(ph);
      P.push(C(-4, -110, -10 + s * 6, -8, 22, 30, m.reaperD));
      for (let i = 0; i < 5; i++) P.push(C(-26 + i * 12, -14, -28 + i * 12 + sin(ph + i) * 4, 4, 5, 1, m.reaperD));
      P.push(E(0, -96, 26, 32, m.reaper));
      P.push(C(-18, -108, -30 + c * 4, -60, 8, 6, m.reaperD));
      P.push(E(2, -138, 18, 20, m.reaper));
      P.push(E(7, -134, 12, 14, m.void));
      P.push(E(8, -134, 8, 9.5, m.skull));
      P.push(E(9, -128, 5, 3, m.boneD));
      P.push(E(5, -137, 2.4, 2.6, m.void), E(12, -137, 2.4, 2.6, m.void));
      // tırpan: sap + kavisli bıçak
      P.push(C(30, -186, 40, 8, 3, 3, m.wood));
      let bx = 30, by = -186;
      for (let i = 1; i <= 6; i++) {
        const a = -PI / 2 - 0.25 - i * 0.32;
        const x = 30 + 70 * cos(a), y = -116 + 70 * sin(a);
        P.push(C(bx, by, x, y, 5 - i * 0.6, 4.4 - i * 0.6, m.blade));
        bx = x; by = y;
      }
      const a2 = arm(0.3 * s, 8, -112, 40, 3, 7, m.reaper, 10);
      P.push(...a2.p);
      P.push(E(a2.hx + 3, a2.hy, 4, 4, m.bone));
      P.push(D(5, -137, 'o', m.eyeR), D(12, -137, 'o', m.eyeR));
      return P;
    },
  },

  // ───────────── KÖY ─────────────
  merchant: {
    h: 74, rad: 12, frames: 4, fps: 3,
    pose(ph) {
      const m = MAT, b = sin(ph) * 0.6, P = [];
      P.push(C(-8, -34, -16, -10, 10, 13, m.leather));
      P.push(C(0, -46 + b, 0, -4, 11, 15, m.robeD));
      P.push(E(3, -26 + b, 8, 14, m.tabard));
      P.push(C(-11, -30 + b, 11, -30 + b, 1.8, 1.8, m.rope));
      P.push(E(2, -58 + b, 8, 8.5, m.skin));
      P.push(E(5, -52 + b, 6, 5, m.ivory));
      P.push(E(0, -64 + b, 15, 3.5, m.leather), E(0, -68 + b, 8, 6, m.leather));
      const a = arm(0.6, 5, -46 + b, 18, 0, 3.8, m.robeD, 6);
      P.push(...a.p);
      P.push(C(a.hx + 2, a.hy, a.hx + 2, a.hy + 7, 0.8, 0.8, m.iron), E(a.hx + 2, a.hy + 11, 3.5, 4.5, m.fire));
      P.push(D(6, -59 + b, '.', MAT.visor));
      return P;
    },
  },
  house: {
    h: 120, rad: 0, frames: 1, fps: 1, scale: 1.25,
    pose() {
      const m = MAT, P = [];
      for (let y = -6; y >= -58; y -= 3) P.push(C(-46, y, 46, y, 1.7, 1.7, m.wood));
      for (let i = 0; i < 16; i++) { const y = -60 - i * 3.4, w = 58 - i * 3.6; P.push(C(-w, y, w, y, 2, 2, i % 3 === 0 ? m.robeD : m.straw)); }
      P.push(C(24, -98, 24, -84, 4, 4, m.stoneD));
      P.push(...[0, 1, 2, 3, 4, 5].map((k) => C(-8, -4 - k * 5, 8, -4 - k * 5, 1.6, 1.6, m.shadow)));
      P.push(E(-28, -34, 7, 6, m.fire), E(30, -34, 7, 6, m.fire));
      P.push(C(-28, -40, -28, -28, 0.7, 0.7, m.wood), C(-35, -34, -21, -34, 0.7, 0.7, m.wood));
      P.push(C(30, -40, 30, -28, 0.7, 0.7, m.wood), C(23, -34, 37, -34, 0.7, 0.7, m.wood));
      return P;
    },
  },
  well: {
    h: 64, rad: 0, frames: 1, fps: 1,
    pose() {
      const m = MAT;
      return [C(-16, -14, -16, -50, 1.8, 1.8, m.wood), C(16, -14, 16, -50, 1.8, 1.8, m.wood),
        ...[0, 1, 2, 3, 4].map((i) => C(-20 + i * 2, -52 - i * 2.5, 20 - i * 2, -52 - i * 2.5, 2, 2, m.straw)),
        E(0, -8, 20, 9, m.stone), E(0, -11, 14, 4.5, m.shadow), C(-16, -40, 16, -40, 1, 1, m.wood),
        C(0, -40, 0, -26, 0.5, 0.5, m.rope), E(0, -24, 3, 3.5, m.wood), D(-12, -8, '=', m.stoneD), D(10, -6, '=', m.stoneD)];
    },
  },
  campfire: {
    h: 40, rad: 0, frames: 6, fps: 10,
    pose(ph) {
      const m = MAT, f = sin(ph), g = cos(ph * 2);
      return [C(-14, -3, 12, -7, 3, 3, m.bark), C(-12, -7, 14, -2, 3, 3, m.bark), E(-16, -3, 4, 3, m.stoneD), E(16, -3, 4, 3, m.stoneD),
        E(f * 1.5, -14, 9 + g, 10, m.fireR), E(1 - f, -18 - g, 6, 10, m.fire), E(f, -22 - g * 2, 3, 6, m.fireY), E(0, -12, 4, 4, m.fireY)];
    },
  },

  // ───────────── NESNELER & DEKOR ─────────────
  rock: {
    h: 34, rad: 0, frames: 1, fps: 1,
    pose() {
      const m = MAT;
      return [E(-6, -10, 16, 10, m.stoneD), E(4, -14, 13, 12, m.stone), E(14, -6, 8, 6, m.stoneD), D(0, -16, '-', m.stoneD)];
    },
  },
  wall: {
    h: 52, rad: 0, frames: 1, fps: 1, scale: 1,
    pose() {
      const m = MAT, P = [];
      for (let y = -4; y >= -50; y -= 2.6) P.push(C(-12, y, 12, y, 1.5, 1.5, (Math.round(y / 8) & 1) ? m.stone : m.stoneD));
      P.push(D(-4, -12, '=', m.stoneD), D(5, -28, '=', m.stoneD), D(-5, -42, '=', m.stoneD));
      return P;
    },
  },
  portcullis: {
    h: 64, rad: 0, frames: 1, fps: 1, scale: 1,
    pose() {
      const m = MAT, P = [];
      for (let y = -6; y >= -60; y -= 13) P.push(C(-9, y, 9, y, 1.3, 1.3, m.iron));
      for (const x of [-7, -2.5, 2.5, 7]) P.push(C(x, -2, x, -62, 1.2, 1.2, m.iron));
      return P;
    },
  },
  portal: {
    h: 110, rad: 0, frames: 8, fps: 8, scale: 1.2,
    pose(ph) {
      const m = MAT, P = [];
      P.push(E(0, -50, 34, 50, M('#7a3aff', 0.5, true)));
      P.push(E(0, -50, 27, 43, M('#1a0a3a', 0, true)));
      for (let i = 0; i < 10; i++) {
        const a = ph + i * 0.63, r = 6 + i * 2.2;
        P.push(D(Math.cos(a) * r, -50 + Math.sin(a) * r * 1.5, i % 3 ? '*' : '.', M(i % 2 ? '#d0a0ff' : '#ffffff', 0, true)));
      }
      return P;
    },
  },

  chest: {
    h: 28, rad: 12, frames: 1, fps: 1,
    pose() {
      const m = MAT;
      return [E(0, -6, 16, 6, m.chest), C(-15, -14, 15, -14, 8, 8, m.chest), E(0, -22, 15, 6, m.chest),
        C(-15, -16, 15, -16, 1.4, 1.4, m.iron), C(-8, -26, -8, -2, 1.2, 1.2, m.iron), C(8, -26, 8, -2, 1.2, 1.2, m.iron),
        D(0, -14, '$', m.gold)];
    },
  },
  brazier: {
    h: 46, rad: 10, frames: 4, fps: 9,
    pose(ph) {
      const m = MAT, f = sin(ph * 2) * 2;
      return [C(0, -20, 0, -2, 2, 2.5, m.iron), C(-6, 0, 6, 0, 2, 2, m.iron), E(0, -22, 10, 4.5, m.iron),
        E(0, -30 - f * 0.5, 7 + f * 0.3, 9, m.fireR), E(1, -32 - f, 5, 8, m.fire), E(0, -30, 3, 5, m.fireY)];
    },
  },
  pine: {
    h: 120, rad: 0, frames: 1, fps: 1, scale: 1.7,
    pose() {
      const m = MAT, P = [C(0, -24, 0, 0, 4, 5, m.bark)];
      for (let i = 0; i < 4; i++) {
        const y = -26 - i * 22;
        P.push(C(0, y - 26, 0, y, 2, 24 - i * 4.5, i % 2 ? m.pineD : m.pine));
      }
      return P;
    },
  },
  deadtree: {
    h: 96, rad: 0, frames: 1, fps: 1, scale: 1.7,
    pose() {
      const m = MAT;
      return [C(0, 0, 2, -50, 6, 4, m.bark), C(2, -50, -18, -78, 3.5, 1.2, m.bark), C(2, -48, 22, -84, 3, 1, m.bark),
        C(1, -64, 6, -94, 2.4, 0.8, m.bark), C(-10, -64, -24, -66, 1.6, 0.6, m.bark), E(0, -2, 10, 3, m.bark)];
    },
  },
  grave: {
    h: 42, rad: 0, frames: 1, fps: 1,
    pose() {
      const m = MAT;
      return [C(0, -14, 0, -26, 11, 11, m.stone), E(0, -12, 11, 12, m.stone),
        E(0, -2, 15, 3.5, m.stoneD), D(0, -22, '+', m.stoneD), D(0, -14, '=', m.stoneD)];
    },
  },
  cross: {
    h: 52, rad: 0, frames: 1, fps: 1,
    pose() {
      const m = MAT;
      return [C(0, 0, 0, -48, 2.6, 2.2, m.bark), C(-12, -36, 12, -36, 2.2, 2.2, m.bark), E(0, -1, 9, 3, m.stoneD)];
    },
  },
  pillar: {
    h: 76, rad: 0, frames: 1, fps: 1,
    pose() {
      const m = MAT;
      return [E(0, -3, 15, 5, m.stoneD), C(0, -8, 0, -60, 10, 9, m.stone), E(0, -64, 14, 5, m.stoneD), C(-6, -30, -4, -46, 1, 1, m.stoneD)];
    },
  },
  bones: {
    h: 14, rad: 0, frames: 1, fps: 1,
    pose() {
      const m = MAT;
      return [C(-10, -4, 8, -6, 1.8, 1.8, m.boneD), E(12, -6, 5, 4.5, m.bone), C(-6, -2, 4, -10, 1.4, 1.4, m.bone), D(13, -6, '.', MAT.void)];
    },
  },
};

// ═══════════════════ FIRINLAMA (ışık + karakter eşleme) ═══════════════════
G.Bake = {
  SX: 3, SY: 4, SCALE: 2.1,
  // kenar karakterleri: siluetin şekline göre eşlenir
  CHARS: ' .,:;\'`"-_~^/\\|()<>![]',
  // iç dolgu: ışığa göre yoğunluk rampası (koyu → parlak)
  RAMP: '+%',
  maps: null,
  analyze() {
    const SX = this.SX, SY = this.SY, W = 30, H = 54;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { willReadFrequently: true });
    const maps = [];
    let mx = 0;
    for (const ch of this.CHARS) {
      x.clearRect(0, 0, W, H);
      x.font = `700 ${Math.floor(Math.min(H * 0.92, W / 0.6))}px "JetBrains Mono", ui-monospace, monospace`;
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(ch, W / 2, H * 0.55);
      const d = x.getImageData(0, 0, W, H).data, mp = new Float32Array(SX * SY);
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const k = Math.min(SY - 1, Math.floor((py / H) * SY)) * SX + Math.min(SX - 1, Math.floor((px / W) * SX));
        mp[k] += d[(py * W + px) * 4 + 3] / 255;
      }
      const area = (W / SX) * (H / SY);
      for (let k = 0; k < mp.length; k++) { mp[k] /= area; mx = Math.max(mx, mp[k]); }
      maps.push(mp);
    }
    for (const mp of maps) for (let k = 0; k < mp.length; k++) mp[k] /= mx;
    this.maps = maps;
  },
  best(t) {
    let bi = 0, bd = 1e9;
    const maps = this.maps, n = t.length;
    for (let i = 0; i < maps.length; i++) {
      const mp = maps[i];
      let d = 0;
      for (let k = 0; k < n; k++) { const e = mp[k] - t[k]; d += e * e; }
      if (d < bd) { bd = d; bi = i; }
    }
    return this.CHARS[bi];
  },
  hit(p, x, y) {
    if (p.t === 0) {
      let dx = x - p.x, dy = y - p.y;
      if (p.rot) { const c = Math.cos(-p.rot), s = Math.sin(-p.rot); const tx = dx * c - dy * s; dy = dx * s + dy * c; dx = tx; }
      const u = dx / p.rx, v = dy / p.ry, q = u * u + v * v;
      if (q >= 1) return null;
      let nx = u / p.rx, ny = v / p.ry;
      if (p.rot) { const c = Math.cos(p.rot), s = Math.sin(p.rot); const tx = nx * c - ny * s; ny = nx * s + ny * c; nx = tx; }
      const l = Math.hypot(nx, ny) || 1;
      return [Math.sqrt(q), nx / l, ny / l];
    }
    const vx = p.x2 - p.x1, vy = p.y2 - p.y1, l2 = vx * vx + vy * vy || 1;
    const t = G.clamp(((x - p.x1) * vx + (y - p.y1) * vy) / l2, 0, 1);
    const cx = p.x1 + vx * t, cy = p.y1 + vy * t, r = p.r1 + (p.r2 - p.r1) * t;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d >= r) return null;
    return d < 1e-4 ? [0, 0, -1] : [d / r, dx / d, dy / d];
  },
  raster(parts, h, flip, S) {
    const R = G.R, CW = R.CW, CH = R.CH, SX = this.SX, SY = this.SY;
    const L = [-0.45, -0.68, 0.58], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    const Hh = [L[0], L[1], L[2] + 1], hl = Math.hypot(...Hh); Hh[0] /= hl; Hh[1] /= hl; Hh[2] /= hl;
    const areas = parts.filter((p) => p.t !== 2);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of areas) {
      const r = p.t === 0 ? Math.max(p.rx, p.ry) : Math.max(p.r1, p.r2);
      const xs = p.t === 0 ? [p.x] : [p.x1, p.x2], ys = p.t === 0 ? [p.y] : [p.y1, p.y2];
      for (const v of xs) { x0 = Math.min(x0, v - r); x1 = Math.max(x1, v + r); }
      for (const v of ys) { y0 = Math.min(y0, v - r); y1 = Math.max(y1, v + r); }
    }
    // ölçek: hücreler küçük, figürler büyütülür (örnek noktaları ölçeğe bölünür)
    x0 *= S; x1 *= S; y0 *= S; y1 *= S; h *= S;
    const oy = -h / 2;
    const c0 = Math.floor(Math.min(x0, -x1) / CW) - 1, c1 = Math.ceil(Math.max(x1, -x0) / CW) + 1;
    const r0 = Math.floor((y0 - oy) / CH) - 1, r1 = Math.ceil((y1 - oy) / CH) + 1;
    const cells = [], fill = [], tmap = new Float32Array(SX * SY);
    const cache = new Map();
    for (let dr = r0; dr <= r1; dr++) for (let dc = c0; dc <= c1; dc++) {
      let cnt = 0, cr = 0, cg = 0, cb = 0, lsum = 0, em = 0;
      const mats = new Map();
      tmap.fill(0);
      for (let j = 0; j < SY; j++) for (let i = 0; i < SX; i++) {
        const sx = dc * CW - CW / 2 + ((i + 0.5) * CW) / SX;
        const sy = oy + dr * CH - CH / 2 + ((j + 0.5) * CH) / SY;
        const lx = (flip ? -sx : sx) / S, ly = sy / S;
        let hp = null, hr = null;
        for (let k = areas.length - 1; k >= 0; k--) { const r = this.hit(areas[k], lx, ly); if (r) { hp = areas[k]; hr = r; break; } }
        if (!hp) continue;
        const s = hr[0], nz = Math.sqrt(Math.max(0, 1 - s * s));
        const nx = (flip ? -hr[1] : hr[1]) * s, ny = hr[2] * s;
        const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const spec = Math.pow(Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]), 22) * hp.m.spec;
        const rim = Math.pow(s, 5) * 0.3;
        const lum = Math.min(1, 0.14 + 0.8 * diff + rim + spec * 0.6);
        let rgb = cache.get(hp.m.c);
        if (!rgb) { rgb = R.col(hp.m.c); cache.set(hp.m.c, rgb); }
        const k2 = hp.m.em ? 1 : 0.42 + 0.68 * lum;
        cr += Math.min(1, rgb[0] * k2 + spec * 0.7); cg += Math.min(1, rgb[1] * k2 + spec * 0.7); cb += Math.min(1, rgb[2] * k2 + spec * 0.7);
        tmap[j * SX + i] = 0.85;
        lsum += hp.m.em ? 1 : lum; if (hp.m.em) em++;
        mats.set(hp.m, (mats.get(hp.m) || 0) + 1);
        cnt++;
      }
      if (cnt < 2) continue;
      let ch;
      if (cnt === SX * SY) {
        // tamamen dolu hücre: malzemenin rampasından ışığa göre karakter
        let mm = null, mx = 0;
        for (const [k, v] of mats) if (v > mx) { mx = v; mm = k; }
        const ramp = mm.ramp || this.RAMP, l = lsum / cnt;
        ch = ramp[Math.min(ramp.length - 1, Math.floor(Math.pow(l, 0.9) * ramp.length))];
      } else ch = this.best(tmap);
      fill.push(dc, dr);
      if (ch === ' ') continue;
      cells.push({ dc, dr, ch, c: [cr / cnt, cg / cnt, cb / cnt], e: em > cnt / 2 ? 1 : 0 });
    }
    // noktalar (göz, işaret): hücreyi zorla
    for (const p of parts) if (p.t === 2) {
      const dc = Math.round(((flip ? -p.x : p.x) * S) / CW), dr = Math.round((p.y * S - oy) / CH);
      const c = R.col(p.m.c);
      const ex = cells.find((q) => q.dc === dc && q.dr === dr);
      const ch = flip ? G.MIRROR[p.ch] || p.ch : p.ch;
      if (ex) { ex.ch = ch; ex.c = c; ex.e = p.m.em ? 1 : 0; } else cells.push({ dc, dr, ch, c, e: p.m.em ? 1 : 0 });
    }
    const hex = (c) => '#' + c.map((v) => Math.round(G.clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
    for (const q of cells) {
      q.g = R.gi(q.ch); q.color = hex(q.c); q.c = R.col(q.color);
      q.dx = q.dc * CW; q.dy = q.dr * CH; q.e = q.e || 0;
    }
    return { cells, fill };
  },
  body(def) {
    const spr = { fps: def.fps, frames: [] };
    let mc = 1e9, Mc = -1e9, mr = 1e9, Mr = -1e9;
    for (let f = 0; f < def.frames; f++) {
      const parts = def.pose((f / def.frames) * Math.PI * 2, f);
      const sc = def.scale || this.SCALE;
      const a = this.raster(parts, def.h, false, sc), b = this.raster(parts, def.h, true, sc);
      spr.frames.push({ cells: a.cells, fill: a.fill, cellsF: b.cells, fillF: b.fill });
      for (const q of a.cells) { mc = Math.min(mc, q.dc); Mc = Math.max(Mc, q.dc); mr = Math.min(mr, q.dr); Mr = Math.max(Mr, q.dr); }
    }
    const R = G.R;
    spr.w = Mc - mc + 1; spr.h = Mr - mr + 1; spr.mc = mc; spr.mr = mr;
    const sc = def.scale || this.SCALE;
    spr.pw = spr.w * R.CW; spr.ph = def.h * sc;
    spr.rad = (def.rad || Math.max(8, spr.pw * 0.3)) * Math.min(1.3, sc);
    return spr;
  },
  all() {
    this.analyze();
    G.SPR = {};
    for (const id in G.BODIES) G.SPR[id] = this.body(G.BODIES[id]);
  },
};

// Kahraman kartı için HTML önizleme (fırınlanmış hücrelerden)
G.spriteHTML = (spr, frame = 0) => {
  const esc = (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c);
  const fr = spr.frames[frame % spr.frames.length];
  const grid = [];
  for (let r = 0; r < spr.h; r++) grid.push(new Array(spr.w).fill(' '));
  for (const q of fr.cells) {
    const r = q.dr - spr.mr, c = q.dc - spr.mc;
    if (grid[r] && c >= 0 && c < spr.w) grid[r][c] = `<span style="color:${q.color}">${esc(q.ch)}</span>`;
  }
  return grid.map((row) => row.join('')).join('\n');
};
