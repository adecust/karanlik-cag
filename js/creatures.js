'use strict';
// ═══════════════════════════════════════════════════════════════════
//  3B YARATIK HEYKELLERİ
//  Eksenler: x ileri (sağa bakar), y yukarı, z kameraya doğru; ayaklar y=0.
//  Birimler dünya pikseli. pose(ph) her animasyon karesi için ilkelleri döndürür.
// ═══════════════════════════════════════════════════════════════════
(() => {
  const { sph, ell, cone, tri, box, tor, cut, mat } = G.SC;
  const S = Math.sin, Co = Math.cos, PI = Math.PI;
  const A = (p, x, y, z) => [p[0] + x, p[1] + y, p[2] + z];

  // ───────────── malzemeler (karanlık, korkutucu palet) ─────────────
  const RM = { metal: 'oS8', fur: 'oS8', bone: 'o08', flesh: 'oS8', cloth: 'oS8', scale: 'sS8', wood: '=+oaS8$#', leaf: '=+oaeS8$#', stone: '0Q$&@' };
  const M = {
    steel: mat('#b4bece', 0.9, false, RM.metal), steelD: mat('#646c7c', 0.6, false, RM.metal), visor: mat('#07070b'),
    red: mat('#8e1c18', 0.15, false, RM.cloth), cape: mat('#5c0e0c', 0.1, false, RM.cloth), leather: mat('#4e3420', 0.15),
    gold: mat('#e2b04a', 0.9, false, RM.metal), skin: mat('#c08a62', 0.2, false, RM.flesh), skinD: mat('#946646', 0.1, false, RM.flesh),
    fur: mat('#5a4030', 0, false, RM.fur), furD: mat('#382820', 0, false, RM.fur), bronze: mat('#a8743a', 0.8, false, RM.metal),
    ivory: mat('#e2d6b8', 0.4, false, RM.bone), beard: mat('#9a4a1c', 0, false, RM.fur), pants: mat('#3a2e22', 0.05),
    robe: mat('#6a4c32', 0.05, false, RM.cloth), robeD: mat('#3e2c1c', 0, false, RM.cloth), rope: mat('#c8a050', 0.3), void: mat('#050508'),
    holy: mat('#fff0b0', 0, true), eyeR: mat('#ff2a1a', 0, true), eyeY: mat('#ffcc2a', 0, true), eyeG: mat('#7aff5a', 0, true), eyeC: mat('#8ffcff', 0, true),
    bone: mat('#d6ceb6', 0.3, false, RM.bone), boneD: mat('#968e78', 0.1, false, RM.bone),
    wolf: mat('#46444c', 0.1, false, RM.fur), wolfL: mat('#7a7680', 0.1, false, RM.fur), wolfD: mat('#26242a', 0, false, RM.fur), teeth: mat('#f2eee0', 0.5),
    zskin: mat('#7c8c66', 0.15, false, RM.flesh), zcloth: mat('#463e30', 0, false, RM.cloth), zclothD: mat('#2c261e', 0, false, RM.cloth),
    spider: mat('#221a26', 0.7, false, RM.scale), spiderL: mat('#3e3046', 0.5, false, RM.scale), hourglass: mat('#c01818', 0.3),
    troll: mat('#566a4c', 0.15, false, RM.flesh), trollL: mat('#748462', 0.1, false, RM.flesh), trollD: mat('#36462e', 0.05, false, RM.flesh), wood: mat('#5a3c24', 0.05, false, RM.wood),
    bat: mat('#3a2e46', 0.2, false, RM.fur), batW: mat('#22182c', 0.2),
    ghost: mat('#b0caf4', 0.5, false, ':=+'), ghostD: mat('#5a78ae', 0.3, false, ':=+'),
    dark: mat('#2c2c38', 1, false, RM.metal), darkD: mat('#16161e', 0.7, false, RM.metal), darkR: mat('#3e0808', 0.1, false, RM.cloth),
    witch: mat('#3a2048', 0.15, false, RM.cloth), witchD: mat('#1e1028', 0.05, false, RM.cloth), wskin: mat('#768e56', 0.2, false, RM.flesh), hair: mat('#b8b4a8', 0.1, false, RM.fur),
    dragon: mat('#5e1c16', 0.6, false, RM.scale), dragonD: mat('#3a0c08', 0.4, false, RM.scale), belly: mat('#7a4a34', 0.4, false, RM.scale),
    wing: mat('#3a0e0a', 0.25, false, 'sS8'), horn: mat('#cabea2', 0.4, false, RM.bone), fireM: mat('#ff6a1a', 0, true),
    reaper: mat('#221c2c', 0.15, false, RM.cloth), reaperD: mat('#120e18', 0, false, RM.cloth), blade: mat('#d8e2f0', 1, false, RM.metal),
    pine: mat('#3a6844', 0.15, false, RM.leaf), pineD: mat('#28503a', 0.1, false, RM.leaf), bark: mat('#5a4030', 0.1, false, RM.wood),
    stone: mat('#6a7486', 0.25, false, RM.stone), stoneD: mat('#454e5e', 0.1, false, RM.stone), dirt: mat('#4a3a2a'),
    plank: mat('#6a4a2e', 0.1, false, RM.wood), straw: mat('#a08444', 0.05, false, ';"%'), iron: mat('#4a4e58', 0.7, false, RM.metal),
    fire: mat('#ffb040', 0, true), fireY: mat('#ffe680', 0, true), fireR: mat('#ff5a1a', 0, true),
    portal: mat('#9a4aff', 0, true), portalC: mat('#3a1a6a', 0, true), portalW: mat('#e8d0ff', 0, true), chest: mat('#7a5028', 0.2, false, RM.wood),
  };

  // gerçekçi insan: doygunluğu düşük renkler, ince karakterlerle yumuşak ton
  const RH = '.:;+*';
  const soft = (m) => { m.soft = true; return m; };
  const H = {
    steel: mat('#8e96a4', 0.8, false, RH), steelD: mat('#4e5462', 0.5, false, RH), red: mat('#5e2420', 0.1, false, RH), cape: mat('#3e1a18', 0.05, false, RH),
    leather: mat('#3e2e22', 0.15, false, RH), skin: mat('#a07e64', 0.15, false, RH), skinD: mat('#7a5e4a', 0.1, false, RH),
    fur: mat('#4a3e32', 0, false, RH), furD: mat('#2e261e', 0, false, RH), bronze: mat('#7e6644', 0.6, false, RH), ivory: mat('#b8b0a0', 0.3, false, RH),
    beard: mat('#5a3a24', 0, false, RH), pants: mat('#2e2a26', 0.05, false, RH), robe: mat('#4a4034', 0.05, false, RH), robeD: mat('#2c2620', 0, false, RH),
    rope: mat('#8a7650', 0.2, false, RH), wood: mat('#4a3a2a', 0.05, false, RH), blade: mat('#c0c8d4', 1, false, RH), gold: mat('#a88a4a', 0.8, false, RH),
  };
  // (yumuşak kenar denendi; silüeti bulanıklaştırdığı için kapalı)

  // ───────────── uzuv yardımcıları ─────────────
  const leg = (ph, hip, step, lift, r1, r2, m, foot) => {
    const sw = S(ph) * step, up = Math.max(0, Co(ph)) * lift;
    const ft = [hip[0] + sw, up + r2, hip[2]];
    const kn = [(hip[0] + ft[0]) / 2 + 4, (hip[1] + ft[1]) / 2 + up * 0.3, hip[2]];
    return [cone(hip, kn, r1, r1 * 0.85, m, 2), cone(kn, ft, r1 * 0.85, r2, m, 2), ell([ft[0] + r2 * 0.9, ft[1] - r2 * 0.4, ft[2]], [r2 * 1.8, r2 * 0.8, r2 * 1.1], foot || m, 2)];
  };
  const arm = (ph, sh, len, swing, r, m, fwd = 0) => {
    const sw = S(ph) * swing;
    const el = [sh[0] + sw * 0.5 + fwd * 0.4, sh[1] - len * 0.5, sh[2]];
    const hd = [sh[0] + sw + fwd, sh[1] - len * 0.95 + fwd * 0.3, sh[2]];
    return { p: [cone(sh, el, r, r * 0.9, m, 2), cone(el, hd, r * 0.9, r * 0.8, m, 2)], hd };
  };

  // zırhlı insan (şövalye + kara şövalye aynı iskelet)
  const armored = (ph, o) => {
    const s = o.s, b = -Math.abs(S(ph)) * 2 * s, P = [];
    const v = (x, y, z) => [x * s, y * s + b, z * s];
    P.push(...leg(ph + PI, v(0, 50, -7), 11 * s, 7 * s, 6.5 * s, 5 * s, o.armD, o.boot));
    P.push(...arm(ph, v(0, 90, -15), 34 * s, 9 * s, 5 * s, o.armD).p);
    const cb = v(-24 - S(ph) * 3, 26, 0);
    P.push(tri(v(-6, 96, -13), v(-6, 96, 13), cb, 1.8 * s, o.cape, 3 * s));
    P.push(tri(v(-6, 96, 13), v(-20, 30, 16), cb, 1.8 * s, o.cape, 3 * s), tri(v(-6, 96, -13), v(-20, 30, -16), cb, 1.8 * s, o.cape, 3 * s));
    P.push(ell(v(0, 54, 0), [12 * s, 9 * s, 11 * s], M.leather, 4 * s));
    P.push(ell(v(1, 76, 0), [14 * s, 20 * s, 13 * s], o.arm, 6 * s));
    P.push(ell(v(4, 68, 3), [11 * s, 18 * s, 10.5 * s], o.tabard, 3 * s));
    P.push(ell(v(1, 58, 0), [13.5 * s, 2.6 * s, 12.6 * s], M.leather));
    P.push(ell(v(0, 92, -13), [9 * s, 6 * s, 8 * s], o.arm, 2 * s), ell(v(0, 92, 13), [9 * s, 6 * s, 8 * s], o.arm, 2 * s));
    if (o.spikes) for (const z of [-13, 13]) P.push(cone(v(0, 96, z), v(-4, 110, z * 1.3), 3 * s, 0.5 * s, o.armD, 1));
    P.push(...leg(ph, v(2, 50, 7), 11 * s, 7 * s, 6.5 * s, 5 * s, o.arm, o.boot));
    P.push(sph(v(1, 95, 0), 6 * s, o.armD, 2 * s));
    P.push(sph(v(3, 104, 0), 10.5 * s, o.arm, 3 * s));
    P.push(cut(box(v(13, 104, 0), [4 * s, 1.5 * s, 8 * s], 0.3 * s, M.visor)));
    if (o.eyes) P.push(sph(v(10, 104, 4), 1.6 * s, o.eyes), sph(v(10, 104, -4), 1.6 * s, o.eyes));
    if (o.horns) for (const z of [-1, 1]) P.push(cone(v(0, 110, z * 8), v(-8, 124, z * 15), 3.5 * s, 1.5 * s, M.horn, 1), cone(v(-8, 124, z * 15), v(-4, 136, z * 17), 1.5 * s, 0.4 * s, M.horn));
    else P.push(cone(v(0, 114, 0), v(-13, 108, 0), 4 * s, 1.5 * s, M.red, 2 * s));
    const a = arm(ph + PI, v(2, 90, 15), 34 * s, 9 * s, 5.2 * s, o.arm);
    P.push(...a.p);
    const h = a.hd;
    P.push(cone(h, A(h, 10 * s, o.sword * s, 0), 2.6 * s, 1 * s, M.blade));
    P.push(box(A(h, 1 * s, 4 * s, 0), [1.6 * s, 1.6 * s, 7 * s], 0.5 * s, M.gold));
    P.push(sph(A(h, -2 * s, -4 * s, 0), 2.4 * s, M.gold), sph(h, 4 * s, M.leather));
    return P;
  };

  // yırtık etek / pelerin ucu sarkıntıları
  const tatters = (P, cx, y, r, n, ph, m, len, s = 1) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2, x = cx + Co(a) * r, z = S(a) * r;
      P.push(cone([x, y, z], [x + S(ph + i) * 5 * s - 4 * s, y - len - (i % 2) * 8 * s, z * 1.15], 7 * s, 0.8 * s, m, 4 * s));
    }
  };

  // ───────────── gerçekçi insan iskeleti (boy ~120, baş ≈ 1/8) ─────────────
  const human = (ph, o) => {
    const P = [], sw = S(ph), b = -Math.abs(sw) * 1.6;
    const lg = (side, p) => {
      const st = S(p) * 11, up = Math.max(0, Co(p)) * 7, z = side * 5;
      const hip = [0, 58 + b, z], kn = [st * 0.45 + 3, 31 + up * 0.5, z], an = [st, 5 + up, z];
      P.push(cone(hip, kn, 4.8, 3.7, o.legs, 1.5), cone(kn, an, 3.7, 2.6, o.legs, 1), ell([an[0] + 3, an[1] - 2, z], [5.2, 2.2, 2.8], o.boots, 1));
    };
    const am = (side, p, m) => {
      const s2 = S(p) * 9, z = side * 11.5;
      const sh = [0, 97 + b, z], el = [s2 * 0.4 + 1, 76 + b, z * 1.08], wr = [s2 + 4, 57 + b, z * 1.02];
      P.push(cone(sh, el, 3.6, 3, m, 1.5), cone(el, wr, 3, 2.4, m, 1), sph(wr, 2.8, o.hands, 1));
      return wr;
    };
    if (o.back) o.back(P, b, sw);
    lg(-1, ph + PI); const farHand = am(-1, ph, o.armsD || o.arms);
    P.push(ell([0, 61 + b, 0], [8.5, 6, 7.5], o.hips, 3), ell([0.5, 72 + b, 0], [7.5, 6.5, 6.8], o.torso, 4), ell([1, 87 + b, 0], [9.5, 12, 8.5], o.torso, 5));
    lg(1, ph);
    P.push(cone([0.5, 98 + b, 0], [1, 104 + b, 0], 3, 2.8, o.hands, 1));
    if (o.front) o.front(P, b, sw);
    P.push(sph([1.5, 110 + b, 0], 7.2, o.head, 1.5));
    if (o.headgear) o.headgear(P, b, sw);
    const nearHand = am(1, ph + PI, o.arms);
    if (o.hold) o.hold(P, nearHand, farHand, b);
    return P;
  };

  G.BODIES = {
    // ───────────── KAHRAMANLAR ─────────────
    knight: {
      h: 120, rad: 12, frames: 8, fps: 10, scale: 2.1,
      pose: (ph) => human(ph, {
        legs: H.steelD, boots: H.leather, arms: H.steel, armsD: H.steelD, hands: H.leather, hips: H.leather, torso: H.steel, head: H.steel,
        back: (P, b, sw) => {
          const cb = [-15 - sw * 2, 30 + b, 0];
          P.push(tri([-4, 98 + b, -10], [-4, 98 + b, 10], cb, 1.2, H.cape, 2), tri([-4, 98 + b, 10], [-12, 34 + b, 12], cb, 1.2, H.cape, 2), tri([-4, 98 + b, -10], [-12, 34 + b, -12], cb, 1.2, H.cape, 2));
        },
        front: (P, b) => {
          P.push(ell([3, 76 + b, 2], [8, 16, 7.5], H.red, 2), ell([1, 66 + b, 0], [8.8, 1.8, 8], H.leather));
          P.push(sph([0, 97 + b, -11], 5, H.steel, 1.5), sph([0, 97 + b, 11], 5, H.steel, 1.5));
        },
        headgear: (P, b) => {
          P.push(cut(box([8.5, 110 + b, 0], [2.4, 0.9, 4.5], 0.2, M.visor)));
          P.push(cone([-1, 117 + b, 0], [-9, 113 + b, 0], 2.4, 1, H.red, 1));
        },
        hold: (P, h) => {
          P.push(cone(h, A(h, 7, 36, 0), 1.6, 0.6, H.blade), box(A(h, 0.5, 3, 0), [1, 1, 4.6], 0.3, H.gold), sph(A(h, -1.2, -3, 0), 1.6, H.gold));
        },
      }),
    },
    barbarian: {
      h: 124, rad: 13, frames: 8, fps: 9, scale: 2.1,
      pose: (ph) => human(ph, {
        legs: H.pants, boots: H.fur, arms: H.skin, armsD: H.skinD, hands: H.skin, hips: H.fur, torso: H.skin, head: H.skin,
        front: (P, b) => {
          P.push(ell([-1, 95 + b, 0], [11, 5, 12], H.fur, 3), ell([1, 64 + b, 0], [9.5, 2, 8.5], H.leather), cone([0, 62 + b, 0], [-1, 44 + b, 0], 9, 10, H.fur, 1.5));
        },
        headgear: (P, b) => {
          P.push(ell([6, 104 + b, 0], [4.5, 6, 5], H.beard, 1.5), ell([1, 115 + b, 0], [7.6, 4, 7.6], H.bronze, 1));
          for (const z of [-1, 1]) P.push(cone([0, 116 + b, z * 6], [-4, 124 + b, z * 11], 2.2, 0.8, H.ivory, 0.5), cone([-4, 124 + b, z * 11], [-9, 127 + b, z * 9], 0.8, 0.3, H.ivory));
        },
        hold: (P, h) => {
          P.push(cone(A(h, -3, -8, 0), A(h, 6, 34, 0), 1.4, 1.4, H.wood));
          P.push(ell(A(h, 11, 31, 0), [5, 8.5, 1.1], H.blade, 0.5), box(A(h, 6, 31, 0), [1.8, 4, 1.6], 0.5, H.steelD));
        },
      }),
    },
    monk: {
      h: 120, rad: 11, frames: 8, fps: 8, scale: 2.1,
      pose: (ph) => human(ph, {
        legs: H.robeD, boots: H.leather, arms: H.robe, armsD: H.robeD, hands: H.skin, hips: H.robe, torso: H.robe, head: H.robe,
        front: (P, b, sw) => {
          P.push(cone([0, 92 + b, 0], [sw * 1.5, 6, 0], 9, 16, H.robe, 3), ell([sw * 1.5, 7, 0], [16, 5, 14], H.robe, 2));
          P.push(ell([1, 68 + b, 0], [9.5, 1.6, 9], H.rope), cone([6, 66 + b, 6], [7 + sw, 50 + b, 7], 0.9, 0.7, H.rope));
        },
        headgear: (P, b) => {
          P.push(sph([0.5, 111 + b, 0], 8.6, H.robe, 1.5), cone([-3, 117 + b, 0], [-10, 111 + b, 0], 3.2, 0.8, H.robe, 1));
          P.push(cut(ell([8.5, 109 + b, 0], [4.5, 6, 5.5], M.void)), sph([4.5, 109 + b, 0], 4.5, H.skin));
        },
        hold: (P, h) => {
          P.push(cone(A(h, 2, -50, 0), A(h, 2, 40, 0), 1.3, 1.3, H.wood), sph(A(h, 2, 45, 0), 3.4, M.holy));
        },
      }),
    },
    merchant: {
      h: 118, rad: 12, frames: 4, fps: 3,
      pose(ph) {
        const b = S(ph) * 0.8, P = [];
        P.push(box([-16, 70 + b, 0], [9, 22, 14], 3, M.leather));
        P.push(cone([0, 86 + b, 0], [0, 6, 0], 15, 22, M.robeD, 6), ell([4, 52 + b, 6], [16, 20, 12], M.robe, 4));
        P.push(ell([2, 60 + b, 0], [17, 2.6, 15], M.rope));
        P.push(sph([4, 98 + b, 0], 10, M.skin, 3), ell([10, 90 + b, 0], [7, 6, 8], M.hair, 3));
        P.push(ell([3, 108 + b, 0], [22, 3, 22], M.robeD), cone([3, 108 + b, 0], [0, 124 + b, 0], 11, 6, M.robeD));
        P.push(sph([13, 99 + b, 4], 1.2, M.void));
        const a = arm(0.6, [4, 86 + b, 15], 30, 0, 6, M.robe, 10);
        P.push(...a.p, sph(a.hd, 4, M.skin));
        P.push(cone(a.hd, A(a.hd, 0, -10, 0), 0.8, 0.8, M.iron), ell(A(a.hd, 0, -17, 0), [5, 7, 5], M.fire));
        return P;
      },
    },

    // ───────────── YARATIKLAR ─────────────
    bat: {
      h: 70, rad: 11, frames: 6, fps: 14,
      pose(ph) {
        const f = S(ph), y = 44 + f * 3, P = [];
        for (const s of [-1, 1]) {
          const root = [0, y + 2, s * 5], wr = [-4, y + 12 + f * 10, s * 16];
          const t1 = [-24, y + 18 + f * 20, s * 30], t2 = [-8, y + 8 + f * 26, s * 36], t3 = [8, y + 12 + f * 16, s * 26];
          P.push(cone(root, wr, 2.4, 1.6, M.bat, 1), cone(wr, t1, 1.4, 0.5, M.bat), cone(wr, t2, 1.4, 0.5, M.bat), cone(wr, t3, 1.4, 0.5, M.bat));
          P.push(tri(root, wr, t3, 0.9, M.batW), tri(wr, t3, t2, 0.9, M.batW), tri(wr, t2, t1, 0.9, M.batW), tri(root, wr, [-14, y - 4, s * 10], 0.9, M.batW));
        }
        P.push(ell([0, y, 0], [8, 10, 7], M.bat, 4), sph([7, y + 10, 0], 6.5, M.bat, 3));
        P.push(cone([6, y + 14, -3], [4, y + 26, -6], 2.6, 0.4, M.bat), cone([6, y + 14, 3], [4, y + 26, 6], 2.6, 0.4, M.bat));
        P.push(cut(sph([13, y + 7, 0], 2, M.void)));
        P.push(sph([12, y + 12, 3], 1.3, M.eyeR), sph([12, y + 12, -3], 1.3, M.eyeR));
        return P;
      },
    },
    wolf: {
      h: 92, rad: 17, frames: 8, fps: 12,
      pose(ph) {
        const b = -Math.abs(S(ph)) * 2, P = [];
        const lg = (x, z, p, m) => {
          const sw = S(p) * 9, up = Math.max(0, Co(p)) * 5;
          const hip = [x, 42 + b, z], kn = [x + 4 + sw * 0.3, 24 + up * 0.5, z], hk = [x - 3 + sw * 0.7, 11 + up, z], pw = [x + 3 + sw, 3 + up, z];
          return [cone(hip, kn, 6, 4.2, m, 2), cone(kn, hk, 4.2, 3.4, m, 1), cone(hk, pw, 3.4, 3, m, 1), ell(A(pw, 3, -1, 0), [5, 2.5, 3.4], M.wolfD)];
        };
        P.push(...lg(-22, -8, ph + PI, M.wolfD), ...lg(22, -8, ph, M.wolfD));
        P.push(cone([-34, 48 + b, 0], [-50, 44 + b + S(ph) * 4, 0], 6.5, 4, M.wolf, 4), cone([-50, 44 + b + S(ph) * 4, 0], [-63, 34 + b + S(ph) * 6, 0], 4, 1.2, M.wolfD, 3));
        P.push(ell([0, 44 + b, 0], [30, 15, 14], M.wolf, 8), ell([22, 47 + b, 0], [16, 17, 14], M.wolf, 8), ell([-22, 45 + b, 0], [14, 15, 13], M.wolf, 6));
        P.push(ell([2, 35 + b, 0], [22, 7, 10], M.wolfL, 4));
        for (let i = 0; i < 7; i++) P.push(cone([-16 + i * 7, 56 + b + (i > 3 ? 2 : 0), 0], [-21 + i * 7, 65 + b + (i % 2) * 3, 0], 3.2, 0.5, M.wolfD, 2));
        P.push(...lg(-20, 8, ph, M.wolf), ...lg(24, 8, ph + PI, M.wolf));
        P.push(cone([30, 52 + b, 0], [45, 61 + b, 0], 12, 9, M.wolf, 6));
        P.push(ell([51, 63 + b, 0], [11, 9, 9], M.wolf, 4));
        P.push(cone([57, 61 + b, 0], [73, 57 + b, 0], 7, 4.2, M.wolf, 3), sph([74, 57.5 + b, 0], 2.4, M.void));
        P.push(cone([56, 52 + b, 0], [70, 46 + b, 0], 4.6, 2.8, M.wolfD, 2));
        for (let i = 0; i < 3; i++) for (const z of [-3, 3]) P.push(cone([63 + i * 3.5, 54 + b, z], [63.5 + i * 3.5, 50 + b, z], 1, 0.25, M.teeth));
        P.push(cone([47, 69 + b, -5], [45, 81 + b, -6], 3.6, 0.6, M.wolf, 2), cone([47, 69 + b, 5], [45, 81 + b, 6], 3.6, 0.6, M.wolf, 2));
        P.push(sph([61, 65 + b, 5], 1.6, M.eyeR), sph([61, 65 + b, -5], 1.6, M.eyeR));
        return P;
      },
    },
    spider: {
      h: 72, rad: 18, frames: 6, fps: 14,
      pose(ph) {
        const P = [];
        for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
          const p = ph + i * 1.3 + (s > 0 ? PI : 0), dx = (i - 1.5) * 15, sw = S(p) * 6, up = Math.max(0, Co(p)) * 6;
          const base = [-2 + i * 6, 28, s * 10], kn = [base[0] + dx * 0.6 + sw * 0.5, 54 + up, s * 30], ft = [base[0] + dx + sw, 1 + up * 0.4, s * 42];
          const m = s > 0 ? M.spiderL : M.spider;
          P.push(cone(base, kn, 3.2, 2.4, m, 1), cone(kn, ft, 2.4, 0.9, m, 1));
        }
        P.push(ell([-24, 36, 0], [27, 20, 22], M.spider, 6));
        P.push(ell([-28, 55, 0], [8, 2.5, 7], M.hourglass, 1), ell([-34, 53, 0], [3, 2, 4], M.hourglass));
        P.push(ell([8, 28, 0], [15, 11, 13], M.spiderL, 6));
        P.push(cone([20, 22, -4], [25, 11, -3], 2.6, 0.7, M.boneD), cone([20, 22, 4], [25, 11, 3], 2.6, 0.7, M.boneD));
        for (const [x, y, z, r] of [[21, 32, 3, 1.6], [21, 32, -3, 1.6], [20, 35, 6, 1.1], [20, 35, -6, 1.1], [22, 30, 0, 1.3], [19, 37, 2, 1]]) P.push(sph([x, y, z], r, M.eyeR));
        return P;
      },
    },
    zombie: {
      h: 112, rad: 12, frames: 8, fps: 5,
      pose(ph) {
        const b = -Math.abs(S(ph)) * 1.5, P = [];
        P.push(...leg(ph + PI, [0, 48 + b, -7], 6, 3, 6, 4.8, M.zclothD, M.zclothD));
        P.push(cone([8, 84 + b, -12], [26, 80 + b, -14], 4.4, 3.8, M.zskin, 2), cone([26, 80 + b, -14], [42, 76 + b - S(ph) * 3, -12], 3.8, 3.2, M.zskin, 2));
        P.push(cone([0, 54 + b, 0], [9, 84 + b, 0], 11, 13, M.zcloth, 6));
        P.push(tri([-6, 62 + b, 11], [8, 60 + b, 12], [-2 + S(ph) * 3, 36 + b, 12], 1, M.zclothD, 2));
        P.push(...leg(ph, [2, 48 + b, 7], 6, 3, 6, 4.8, M.zcloth, M.zclothD));
        P.push(sph([19, 91 + b, 0], 9.5, M.zskin, 4));
        P.push(cut(ell([28, 86 + b, 0], [5.5, 3.5, 6], M.void)));
        P.push(sph([25, 95 + b, 4], 1.8, M.eyeY), sph([25, 95 + b, -4], 1.8, M.eyeY));
        P.push(cone([8, 84 + b, 12], [26, 82 + b, 14], 4.4, 3.8, M.zskin, 2), cone([26, 82 + b, 14], [44, 78 + b + S(ph) * 3, 12], 3.8, 3.2, M.zskin, 2));
        return P;
      },
    },
    skeleton: {
      h: 116, rad: 11, frames: 8, fps: 8,
      pose(ph) {
        const b = -Math.abs(S(ph)) * 1.5, P = [];
        const bone = (a, c, r, m = M.bone) => [cone(a, c, r, r * 0.85, m, 1), sph(a, r * 1.35, m, 1)];
        const lg = (p, z, m) => { const sw = S(p) * 10, up = Math.max(0, Co(p)) * 6; const hip = [0, 54 + b, z], kn = [4 + sw * 0.5, 30 + up * 0.4, z], ft = [sw, 3 + up, z]; return [...bone(hip, kn, 2.4, m), ...bone(kn, ft, 2.2, m), ell(A(ft, 4, 0, 0), [5, 2, 3], m)]; };
        const am = (p, z, m) => { const sw = S(p) * 9; const sh = [0, 90 + b, z], el = [sw * 0.5 + 2, 72 + b, z * 1.05], hd = [sw + 6, 56 + b, z]; return { p: [...bone(sh, el, 2.2, m), ...bone(el, hd, 2, m)], hd }; };
        P.push(...lg(ph + PI, -6, M.boneD), ...am(ph, -12, M.boneD).p);
        P.push(cone([0, 94 + b, 0], [-1, 56 + b, 0], 2.6, 2.6, M.boneD));
        for (let i = 0; i < 5; i++) {
          const y = 88 + b - i * 6, w = 11 - i;
          for (const z of [-1, 1]) P.push(cone([0, y, 0], [6, y - 2, z * w], 1.4, 1.3, M.bone), cone([6, y - 2, z * w], [12, y - 4, z * 3], 1.3, 1.1, M.bone));
        }
        P.push(cone([12, 90 + b, 0], [11, 68 + b, 0], 1.7, 1.4, M.bone));
        P.push(ell([0, 56 + b, 0], [9, 6, 10], M.bone, 2));
        P.push(...lg(ph, 6, M.bone));
        P.push(sph([6, 105 + b, 0], 9.5, M.bone));
        P.push(cut(sph([14, 107 + b, 4], 3.3, M.void)), cut(sph([14, 107 + b, -4], 3.3, M.void)), cut(sph([15.5, 101 + b, 0], 1.6, M.void)));
        P.push(sph([12.5, 107 + b, 4], 1.4, M.eyeR), sph([12.5, 107 + b, -4], 1.4, M.eyeR));
        P.push(ell([10, 95 + b, 0], [6.5, 3.5, 6.5], M.bone, 1));
        const a = am(ph + PI, 12, M.bone);
        P.push(...a.p, cone(a.hd, A(a.hd, 8, 38, 0), 2, 0.8, mat('#8a7a64', 0.4)), box(A(a.hd, 1, 3, 0), [1.2, 1.2, 5], 0.4, M.iron));
        return P;
      },
    },
    ghost: {
      h: 110, rad: 15, frames: 6, fps: 7,
      pose(ph) {
        const y = 12 + S(ph) * 3, P = [];
        P.push(cone([0, 56 + y, 0], [-10 + S(ph) * 6, 28 + y, 0], 12, 6, M.ghostD, 8), cone([-10 + S(ph) * 6, 28 + y, 0], [-24 + S(ph + 1) * 8, 6 + y, 0], 6, 0.8, M.ghostD, 6));
        P.push(ell([0, 70 + y, 0], [16, 22, 15], M.ghost, 8), sph([4, 88 + y, 0], 12.5, M.ghost, 8));
        for (const z of [-1, 1]) P.push(cone([2, 80 + y, z * 14], [16, 62 + y + S(ph + z) * 4, z * 18], 4.2, 1.2, M.ghost, 4));
        P.push(cut(sph([15, 91 + y, 5], 3.6, M.void)), cut(sph([15, 91 + y, -5], 3.6, M.void)), cut(ell([16, 80 + y, 0], [3, 5.5, 4], M.void)));
        P.push(sph([15, 91 + y, 5], 1.3, M.eyeC), sph([15, 91 + y, -5], 1.3, M.eyeC));
        return P;
      },
    },
    troll: {
      h: 196, rad: 26, frames: 8, fps: 6,
      pose(ph) {
        const b = -Math.abs(S(ph)) * 3, P = [];
        const am = (p, z, m) => {
          const sw = S(p) * 10;
          const sh = [10, 138 + b, z], el = [20 + sw * 0.5, 100 + b, z * 1.15], hd = [26 + sw, 60 + b, z * 1.08];
          return { p: [cone(sh, el, 10, 8, m, 4), cone(el, hd, 8, 7, m, 3), sph(hd, 8.5, m, 3)], hd };
        };
        P.push(...am(ph, -26, M.trollD).p, ...leg(ph + PI, [-2, 72 + b, -12], 12, 6, 11, 9, M.trollD, M.trollD));
        P.push(ell([0, 110 + b, 0], [30, 34, 26], M.troll, 10), ell([10, 92 + b, 6], [24, 22, 20], M.trollL, 6));
        P.push(ell([-10, 132 + b, 0], [22, 16, 22], M.trollD, 8));
        P.push(tri([-10, 70 + b, 18], [20, 70 + b, 18], [4 + S(ph) * 4, 36 + b, 20], 2, M.fur, 2));
        P.push(...leg(ph, [2, 72 + b, 12], 12, 6, 11, 9, M.troll, M.trollD));
        P.push(ell([26, 128 + b, 0], [12, 11, 11], M.troll, 6), ell([33, 134 + b, 0], [6, 3, 9], M.trollD, 3));
        P.push(ell([32, 119 + b, 0], [9, 5, 9], M.troll, 3));
        P.push(cone([36, 118 + b, 5], [38, 128 + b, 7], 2.2, 0.6, M.ivory), cone([36, 118 + b, -5], [38, 128 + b, -7], 2.2, 0.6, M.ivory));
        P.push(sph([36, 130 + b, 5], 1.7, M.eyeY), sph([36, 130 + b, -5], 1.7, M.eyeY));
        const a = am(ph + PI, 26, M.troll);
        P.push(...a.p, cone(A(a.hd, -2, -6, 0), A(a.hd, 18, 54, 0), 5, 11, M.wood, 2));
        for (let i = 0; i < 4; i++) P.push(cone(A(a.hd, 12 + i * 2, 30 + i * 7, 0), A(a.hd, 22 + i * 2, 33 + i * 7, i % 2 ? 6 : -6), 1.6, 0.3, M.iron));
        return P;
      },
    },

    // ───────────── BOSSLAR ─────────────
    blackknight: {
      h: 280, rad: 36, frames: 8, fps: 7, scale: 1.15,
      pose: (ph) => armored(ph, { s: 2.3, arm: M.dark, armD: M.darkD, cape: M.darkR, tabard: M.darkD, boot: M.darkD, sword: 70, horns: true, spikes: true, eyes: M.eyeR }),
    },
    witch: {
      h: 260, rad: 32, frames: 6, fps: 5, scale: 1.15,
      pose(ph) {
        const y = 30 + S(ph) * 6, P = [];
        P.push(cone([0, 150 + y, 0], [S(ph) * 6, 40 + y, 0], 16, 40, M.witch, 10));
        tatters(P, S(ph) * 6, 44 + y, 32, 7, ph, M.witchD, 30, 1.4);
        P.push(ell([-4, 160 + y, 0], [26, 18, 24], M.witch, 10));
        for (const z of [-1, 1]) P.push(cone([10, 182 + y, z * 8], [-12, 140 + y, z * 16], 5, 1, M.hair, 2), cone([4, 186 + y, z * 4], [-18, 150 + y, z * 9], 4, 1, M.hair, 2));
        P.push(ell([18, 176 + y, 0], [13, 15, 13], M.wskin, 4));
        P.push(cone([28, 176 + y, 0], [48, 165 + y, 0], 4.2, 1.2, M.wskin, 2), cone([24, 165 + y, 0], [33, 156 + y, 0], 5, 2, M.wskin, 2));
        P.push(cut(ell([30, 167 + y, 0], [4, 1.6, 6], M.void)));
        P.push(sph([28, 182 + y, 6], 2.2, M.eyeG), sph([28, 182 + y, -6], 2.2, M.eyeG));
        P.push(ell([14, 192 + y, 0], [32, 3.5, 32], M.witchD, 2));
        P.push(cone([14, 194 + y, 0], [6, 236 + y, 0], 18, 6, M.witch, 3), cone([6, 236 + y, 0], [-16, 252 + y + S(ph) * 3, 0], 6, 1, M.witch, 2));
        for (const z of [-1, 1]) {
          const sh = [6, 160 + y, z * 20], el = [24, 140 + y, z * 26], hd = [44, 148 + y + S(ph + z) * 6, z * 22];
          P.push(cone(sh, el, 5.5, 4.5, M.witch, 3), cone(el, hd, 4.5, 3, M.wskin, 2));
          for (let f = -1; f <= 1; f++) P.push(cone(hd, A(hd, 10, f * 4, f * 3), 1.4, 0.4, M.wskin));
        }
        P.push(sph([56, 152 + y, 22], 7, M.eyeG));
        return P;
      },
    },
    reaper: {
      h: 310, rad: 40, frames: 6, fps: 5, scale: 1.1,
      pose(ph) {
        const y = 36 + S(ph) * 6, P = [];
        P.push(cone([0, 210 + y, 0], [0, 40 + y, 0], 28, 52, M.reaper, 12));
        tatters(P, 0, 46 + y, 44, 9, ph, M.reaperD, 34, 1.6);
        P.push(ell([0, 214 + y, 0], [40, 22, 36], M.reaper, 12));
        P.push(sph([8, 246 + y, 0], 28, M.reaper, 8), cone([-10, 262 + y, 0], [-32, 250 + y, 0], 10, 2, M.reaper, 4));
        P.push(cut(ell([28, 242 + y, 0], [16, 22, 20], M.void)));
        P.push(sph([19, 242 + y, 0], 13, M.bone));
        P.push(cut(sph([29, 246 + y, 5], 4, M.void)), cut(sph([29, 246 + y, -5], 4, M.void)));
        P.push(sph([28, 246 + y, 5], 1.9, M.eyeR), sph([28, 246 + y, -5], 1.9, M.eyeR));
        P.push(ell([25, 231 + y, 0], [8, 5, 9], M.boneD));
        for (const z of [-1, 1]) {
          const hd = [42, 166 + y + S(ph + z) * 4, z * 40];
          P.push(cone([0, 214 + y, z * 34], hd, 12, 9, M.reaper, 6));
          for (let f = -1; f <= 1; f++) P.push(cone(A(hd, 4, 0, 0), A(hd, 16, -6 + f * 4, f * 4), 1.5, 0.5, M.bone));
        }
        // tırpan: sap + kavisli bıçak
        P.push(cone([46, 300 + y, 40], [50, 30 + y, 40], 3.2, 3.2, M.wood));
        const pts = [[46, 300], [26, 314], [-4, 316], [-36, 304], [-58, 284], [-70, 262]];
        for (let i = 0; i < pts.length - 1; i++) P.push(cone([pts[i][0], pts[i][1] + y, 40], [pts[i + 1][0], pts[i + 1][1] + y, 40], 7 - i * 1.3, 6 - i * 1.3, M.blade));
        return P;
      },
    },
    dragon: {
      h: 380, rad: 74, frames: 6, fps: 5, scale: 1.15,
      pose(ph) {
        const f = S(ph), c = Co(ph), b = f * 4, P = [];
        const wing = (s) => {
          const up = f, k = 1 - 0.18 * up;
          const sh = [14, 150 + b, s * 26], el = [-6, 176 + up * 30, s * 92 * k], wr = [-36, 190 + up * 46, s * 160 * k];
          const t1 = [-140, 176 + up * 40, s * 196 * k], t2 = [-178, 158 + up * 26, s * 128 * k], t3 = [-150, 146 + up * 12, s * 74 * k], t4 = [-70, 148 + b, s * 30];
          P.push(cone(sh, el, 11, 7, M.dragonD, 4), cone(el, wr, 7, 4.5, M.dragonD, 3));
          P.push(cone(wr, t1, 4.5, 1.2, M.dragonD, 1), cone(wr, t2, 4, 1.2, M.dragonD, 1), cone(wr, t3, 3.5, 1.2, M.dragonD, 1));
          P.push(tri(wr, t1, t2, 1.6, M.wing), tri(wr, t2, t3, 1.6, M.wing), tri(wr, t3, t4, 1.6, M.wing), tri(el, wr, t4, 1.6, M.wing), tri(sh, el, t4, 1.6, M.wing));
          P.push(cone(wr, A(wr, 14, 6, s * 6), 3.4, 0.5, M.horn));
        };
        wing(-1);
        // kuyruk
        let prev = [-60, 108 + b, 0], r = 26;
        for (let i = 1; i <= 7; i++) {
          const nx = [-60 - i * 28, 104 - i * 9 + S(ph + i * 0.6) * 9 * (i / 7), S(ph * 0.5 + i * 0.4) * 6 * (i / 7)];
          P.push(cone(prev, nx, r, r * 0.78, M.dragon, 6));
          if (i % 2 === 0) P.push(cone(A(prev, 0, r * 0.8, 0), A(prev, -8, r * 0.8 + 12, 0), 3.5, 0.4, M.horn, 1));
          prev = nx; r *= 0.78;
        }
        P.push(cone(prev, A(prev, -22, 8, 0), 4, 0.5, M.horn), tri(prev, A(prev, -18, 18, 0), A(prev, -24, -4, 0), 1.4, M.dragonD));
        // arka bacaklar
        const hind = (s, p, m) => {
          const sw = S(p) * 16, up = Math.max(0, Co(p)) * 10;
          P.push(ell([-40, 92 + b, s * 30], [22, 30, 15], m, 10));
          const kn = [-28, 56, s * 34], an = [-48 + sw * 0.4, 24 + up, s * 34], ft = [-36 + sw, 5 + up, s * 34];
          P.push(cone(kn, an, 11, 8, m, 4), cone(an, ft, 8, 7, m, 3), ell(A(ft, 6, -1, 0), [12, 5, 8], M.dragonD, 2));
          for (const k of [-4, 0, 4]) P.push(cone(A(ft, 14, -1, k), A(ft, 22, -4, k * 1.4), 2.4, 0.4, M.horn));
        };
        hind(-1, ph + PI, M.dragonD);
        P.push(ell([0, 116 + b, 0], [72, 42, 40], M.dragon, 14), ell([50, 126 + b, 0], [40, 44, 36], M.dragon, 14));
        P.push(ell([18, 96 + b, 0], [62, 24, 32], M.belly, 6));
        for (let i = 0; i < 11; i++) { const x = -64 + i * 14; P.push(cone([x, 150 + b + Math.sin(i * 0.4) * 6, 0], [x - 6, 170 + b + (i % 2) * 4, 0], 5, 0.5, M.horn, 2)); }
        const front = (s, p, m) => {
          const sw = S(p) * 14, up = Math.max(0, Co(p)) * 9;
          const sh = [52, 112 + b, s * 28], el = [70, 62, s * 32], pw = [62 + sw, 7 + up, s * 30];
          P.push(cone(sh, el, 13, 10, m, 5), cone(el, pw, 10, 7, m, 3), ell(A(pw, 6, -2, 0), [10, 4.5, 7], M.dragonD, 2));
          for (const k of [-3, 0, 3]) P.push(cone(A(pw, 12, -2, k), A(pw, 19, -6, k * 1.4), 2, 0.3, M.horn));
        };
        front(-1, ph, M.dragonD);
        hind(1, ph, M.dragon);
        front(1, ph + PI, M.dragon);
        // boyun
        const n = [[70, 142 + b, 0], [100, 186 + b, 0], [126, 222 + b + c * 4, 0], [150, 238 + b + c * 5, 0]];
        const nr = [26, 21, 17, 14];
        for (let i = 0; i < 3; i++) P.push(cone(n[i], n[i + 1], nr[i], nr[i + 1], M.dragon, 8));
        P.push(cone(A(n[0], 10, -12, 0), A(n[2], 6, -12, 0), 13, 8, M.belly, 4));
        for (let i = 0; i < 3; i++) P.push(cone(A(n[i], -4, nr[i] * 0.8, 0), A(n[i], -12, nr[i] * 0.8 + 12, 0), 4, 0.4, M.horn, 1));
        // baş
        const hx = 172, hy = 242 + b + c * 5, jaw = 14 + Math.max(0, f) * 8;
        P.push(ell([hx, hy, 0], [25, 14, 16], M.dragon, 6));
        P.push(ell([hx, hy + 11, 9], [16, 5, 6], M.dragonD, 3), ell([hx, hy + 11, -9], [16, 5, 6], M.dragonD, 3));
        P.push(cone([hx + 10, hy - 2, 0], [hx + 44, hy - 12, 0], 13, 8, M.dragon, 5));
        P.push(cut(sph([hx + 44, hy - 7, 4], 2.4, M.void)), cut(sph([hx + 44, hy - 7, -4], 2.4, M.void)));
        P.push(cone([hx + 6, hy - 14, 0], [hx + 38, hy - 14 - jaw, 0], 9, 5, M.dragonD, 4));
        P.push(sph([hx + 26, hy - 18 - jaw * 0.4, 0], 7, M.fireM));
        for (let i = 0; i < 5; i++) for (const z of [-6, 6]) {
          P.push(cone([hx + 18 + i * 6, hy - 14, z], [hx + 19 + i * 6, hy - 21, z], 1.5, 0.3, M.teeth));
          P.push(cone([hx + 16 + i * 5, hy - 13 - jaw * (0.4 + i * 0.12), z * 0.8], [hx + 16 + i * 5, hy - 7 - jaw * (0.4 + i * 0.12), z * 0.8], 1.3, 0.3, M.teeth));
        }
        P.push(ell([hx + 12, hy + 4, 10], [3.2, 1.6, 2], M.eyeY), ell([hx + 12, hy + 4, -10], [3.2, 1.6, 2], M.eyeY));
        for (const z of [-1, 1]) P.push(cone([hx - 8, hy + 10, z * 10], [hx - 38, hy + 30, z * 17], 6, 2, M.horn, 2), cone([hx - 38, hy + 30, z * 17], [hx - 56, hy + 26, z * 15], 2, 0.4, M.horn));
        for (let i = 0; i < 4; i++) P.push(cone([hx - 18, hy - 4 + i * 5, 0], [hx - 32, hy - 8 + i * 6, 0], 3, 0.4, M.horn, 1));
        wing(1);
        return P;
      },
    },

    // ───────────── KÖY & DEKOR ─────────────
    house: {
      h: 190, rad: 0, frames: 1, fps: 1, scale: 2.6,
      pose() {
        const P = [box([0, 42, 0], [62, 42, 38], 2, M.plank)];
        for (const z of [-1, 1]) {
          P.push(tri([-70, 82, z * 46], [70, 82, z * 46], [70, 120, 0], 3, M.straw), tri([-70, 82, z * 46], [70, 120, 0], [-70, 120, 0], 3, M.straw));
        }
        P.push(cut(box([22, 25, 38], [9, 23, 4], 1, M.void)));
        P.push(box([-30, 50, 38.5], [8, 7, 1], 0.6, M.fire), box([-30, 50, 39.5], [8.5, 0.8, 0.8], 0.2, M.plank), box([-30, 50, 39.5], [0.8, 7.5, 0.8], 0.2, M.plank));
        P.push(box([34, 124, -12], [6, 18, 6], 1, M.stone));
        return P;
      },
    },
    well: {
      h: 100, rad: 0, frames: 1, fps: 1, scale: 2,
      pose() {
        return [cone([0, 0, 0], [0, 22, 0], 24, 23, M.stone, 2), cut(cone([0, 8, 0], [0, 30, 0], 16, 16, M.void)),
          cone([-20, 20, 0], [-20, 70, 0], 2.4, 2.4, M.wood), cone([20, 20, 0], [20, 70, 0], 2.4, 2.4, M.wood),
          tri([-30, 66, 22], [30, 66, 22], [30, 86, 0], 2, M.straw), tri([-30, 66, 22], [30, 86, 0], [-30, 86, 0], 2, M.straw),
          tri([-30, 66, -22], [30, 66, -22], [30, 86, 0], 2, M.straw), tri([-30, 66, -22], [30, 86, 0], [-30, 86, 0], 2, M.straw),
          cone([-20, 54, 0], [20, 54, 0], 1.6, 1.6, M.wood), cone([0, 54, 0], [0, 34, 0], 0.5, 0.5, M.rope), box([0, 30, 0], [4, 4, 4], 1, M.plank)];
      },
    },
    campfire: {
      h: 70, rad: 0, frames: 6, fps: 10, scale: 1.3,
      pose(ph) {
        const f = S(ph), g = Co(ph * 2), P = [];
        for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; P.push(sph([Co(a) * 20, 3, S(a) * 16], 5, M.stoneD, 1)); }
        P.push(cone([-16, 3, -8], [14, 8, 8], 4, 4, M.bark), cone([-14, 6, 10], [16, 4, -8], 4, 4, M.bark));
        P.push(ell([f * 1.5, 18, 0], [11 + g, 15, 10], M.fireR), ell([1 - f, 25 - g, 0], [7, 14, 7], M.fire), ell([f, 30 - g * 2, 0], [3.5, 8, 3.5], M.fireY));
        return P;
      },
    },
    pine: {
      h: 170, rad: 0, frames: 1, fps: 1, scale: 1.1,
      pose() {
        const P = [cone([0, 0, 0], [0, 44, 0], 7, 5, M.bark)];
        for (let i = 0; i < 4; i++) { const y = 30 + i * 28; P.push(cone([0, y, 0], [0, y + 38, 0], 36 - i * 7, 2, i % 2 ? M.pineD : M.pine, 3)); }
        return P;
      },
    },
    deadtree: {
      h: 150, rad: 0, frames: 1, fps: 1, scale: 1.3,
      pose() {
        return [cone([0, 0, 0], [4, 76, 0], 10, 6, M.bark, 4), ell([0, 2, 0], [16, 4, 14], M.bark, 4),
          cone([4, 74, 0], [-30, 118, 6], 5, 1.5, M.bark, 2), cone([4, 70, 0], [36, 128, -4], 4.5, 1.2, M.bark, 2),
          cone([3, 90, 0], [8, 140, 4], 3.5, 0.8, M.bark, 1), cone([-14, 96, 3], [-36, 100, 10], 2, 0.6, M.bark), cone([20, 100, -2], [30, 92, -14], 2, 0.6, M.bark)];
      },
    },
    grave: {
      h: 60, rad: 0, frames: 1, fps: 1, scale: 1.3,
      pose() {
        return [ell([0, 2, 10], [20, 6, 16], M.dirt, 4), box([0, 24, 0], [11, 22, 4], 4, M.stone),
          cut(box([0, 32, 4.5], [1.2, 8, 2], 0.2, M.stoneD)), cut(box([0, 35, 4.5], [5.5, 1.2, 2], 0.2, M.stoneD))];
      },
    },
    cross: {
      h: 80, rad: 0, frames: 1, fps: 1, scale: 1.3,
      pose() { return [ell([0, 2, 6], [16, 5, 12], M.dirt, 3), box([0, 32, 0], [2.6, 32, 2.6], 0.6, M.plank), box([0, 46, 0], [14, 2.4, 2.4], 0.6, M.plank)]; },
    },
    pillar: {
      h: 120, rad: 0, frames: 1, fps: 1, scale: 1.2,
      pose() {
        return [box([0, 4, 0], [18, 4, 18], 1, M.stoneD), cone([0, 6, 0], [0, 92, 0], 13, 12, M.stone, 2), box([0, 96, 0], [17, 5, 17], 1, M.stoneD),
          cut(sph([10, 100, 10], 12, M.stoneD)), sph([26, 4, 12], 6, M.stone, 2)];
      },
    },
    // yıkık taş kalıntı (videodaki gri-mavi harfli yapılar)
    ruin: {
      h: 120, rad: 0, frames: 1, fps: 1, scale: 1.3,
      pose() {
        const P = [];
        P.push(box([-40, 30, 0], [10, 30, 30], 2, M.stone), box([-40, 70, -10], [10, 12, 18], 2, M.stoneD));
        P.push(box([0, 18, -28], [36, 18, 9], 2, M.stone), box([-14, 44, -28], [20, 10, 9], 2, M.stoneD));
        P.push(box([40, 46, 6], [11, 46, 11], 2, M.stone), box([40, 96, 6], [15, 5, 15], 1, M.stoneD));
        P.push(cut(box([40, 70, 14], [12, 6, 5], 0, M.stoneD)));
        for (const [x, z, r] of [[-8, 26, 9], [18, 34, 7], [-58, 30, 6], [62, -20, 8], [10, -6, 5]]) P.push(box([x, r, z], [r, r * 0.8, r], 1.5, M.stoneD));
        return P;
      },
    },
    rock: {
      h: 56, rad: 0, frames: 1, fps: 1, scale: 1.3,
      pose() { return [sph([0, 14, 0], 19, M.stone, 8), sph([14, 9, 6], 12, M.stoneD, 8), sph([-12, 8, -5], 13, M.stone, 8), sph([4, 26, -2], 10, M.stone, 6)]; },
    },
    bones: {
      h: 26, rad: 0, frames: 1, fps: 1, scale: 1.3,
      pose() {
        return [cone([-14, 3, 2], [8, 4, -4], 2.2, 2.2, M.boneD, 1), sph([14, 7, 0], 7, M.bone), cut(sph([19, 9, 3], 2, M.void)),
          cone([-6, 3, -6], [4, 3, 8], 1.8, 1.8, M.bone, 1), sph([-15, 3, 2], 3, M.boneD)];
      },
    },
    chest: {
      h: 40, rad: 12, frames: 1, fps: 1, scale: 1.3,
      pose() {
        return [box([0, 10, 0], [18, 10, 12], 1.5, M.chest), ell([0, 20, 0], [18, 7, 12], M.chest),
          box([0, 12, 12.5], [18.5, 1.2, 0.6], 0.3, M.gold), box([-12, 14, 0], [1.2, 12, 12.6], 0.3, M.iron), box([12, 14, 0], [1.2, 12, 12.6], 0.3, M.iron), sph([0, 16, 13], 2, M.gold)];
      },
    },
    brazier: {
      h: 76, rad: 10, frames: 4, fps: 9, scale: 1.2,
      pose(ph) {
        const f = S(ph * 2) * 2;
        return [cone([0, 0, 0], [0, 34, 0], 4, 3, M.iron), ell([0, 0, 0], [12, 3, 12], M.iron), ell([0, 38, 0], [16, 6, 16], M.iron, 2), cut(ell([0, 42, 0], [12, 4, 12], M.void)),
          ell([f * 0.5, 46, 0], [10, 12 + f, 10], M.fireR), ell([0, 50 - f, 0], [6, 11, 6], M.fire), ell([0, 50, 0], [3, 6, 3], M.fireY)];
      },
    },
    wall: {
      h: 70, rad: 0, frames: 1, fps: 1, scale: 1,
      pose() {
        const P = [box([0, 34, 0], [17, 34, 17], 2, M.stone)];
        for (const y of [14, 32, 50]) P.push(cut(box([0, y, 17.5], [18, 0.7, 1], 0, M.stoneD)));
        P.push(cut(box([-6, 23, 17.5], [0.7, 8, 1], 0, M.stoneD)), cut(box([7, 41, 17.5], [0.7, 8, 1], 0, M.stoneD)));
        return P;
      },
    },
    portcullis: {
      h: 100, rad: 0, frames: 1, fps: 1, scale: 1,
      pose() {
        const P = [];
        for (let z = -40; z <= 40; z += 10) P.push(cone([0, 0, z], [0, 86, z], 2, 2, M.iron), cone([0, -2, z], [0, -8, z], 2, 0.4, M.iron));
        for (const y of [16, 44, 72]) P.push(cone([0, y, -44], [0, y, 44], 1.6, 1.6, M.iron));
        return P;
      },
    },
    portal: {
      h: 190, rad: 0, frames: 8, fps: 8, scale: 1,
      pose(ph) {
        const P = [ell([0, 3, 0], [64, 6, 40], M.stoneD, 4), tor([0, 96, 0], 54, 9, M.portal), ell([0, 96, -3], [46, 46, 2], M.portalC)];
        for (let i = 0; i < 12; i++) { const a = ph + i * 0.52, r = 8 + i * 3; P.push(sph([Co(a) * r, 96 + S(a) * r, 2], 2.4 - i * 0.1, i % 3 ? M.portal : M.portalW)); }
        return P;
      },
    },
  };
})();
