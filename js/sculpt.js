'use strict';
// ═══════════════════════════════════════════════════════════════════
//  3B HEYKEL → ASCII
//  Yaratıklar 3B mesafe alanlarından (SDF) yontulur: küre, elipsoid,
//  konik uzuv, kalın üçgen (kanat zarı), yuvarlak kutu, simit.
//  Parçalar yumuşakça kaynaşır; oyuklar (göz çukuru, ağız) kesilir.
//  Her animasyon karesi ¾ yukarıdan bakan ortografik kamerayla ışın
//  izlenerek ışıklandırılır (yaygın + AO + parlama + kenar ışığı) ve
//  her hücreye şekle en uygun ASCII karakter yerleştirilir.
// ═══════════════════════════════════════════════════════════════════
// ───────────── ÇİZGİ GEÇİŞİ ─────────────
// Işık farkının büyük olduğu yerlere (kontur, zırh plakası sınırı, kas/kemik kıvrımı)
// kenar yönüne göre - | /  çizgileri koyar ve koyulaştırır. Gövdeye el çizimi detayı verir.
G.linePass = (cells) => {
  const R = G.R, key = (c, r) => (c + 2000) * 4096 + (r + 2000), m = new Map();
  for (const q of cells) m.set(key(q.dc, q.dr), q);
  const L = (q) => (q ? 0.3 * q.c[0] + 0.55 * q.c[1] + 0.15 * q.c[2] : -1);
  const out = [];
  for (const q of cells) {
    if (q.e) continue;
    const l = L(q), at = (dx, dy) => m.get(key(q.dc + dx, q.dr + dy));
    const lr = L(at(1, 0)), ll = L(at(-1, 0)), ld = L(at(0, 1)), lu = L(at(0, -1));
    const edge = lr < 0 || ll < 0 || ld < 0 || lu < 0; // siluet konturu
    const v = (x) => (x < 0 ? 0 : x);
    const gx = v(lr) - v(ll), gy = v(ld) - v(lu), mag = Math.hypot(gx, gy);
    // iç kıvrım: sadece koyu tarafa, eşik üstünde (ince çizgi kalsın)
    // iç kıvrım: yalnızca belirgin ışık kırılmalarında ve kıvrımın koyu tarafında
    const nmin = Math.min(v(lr), v(ll), v(ld), v(lu));
    const crease = !edge && mag > 0.22 && l <= nmin + 0.06;
    if (!edge && !crease) continue;
    const a = Math.atan2(gy, gx) + Math.PI / 2;
    let t = a % Math.PI; if (t < 0) t += Math.PI;
    const ch = ['-', '\\', '|', '/'][Math.round(t / (Math.PI / 4)) % 4];
    // kontur: harf korunur, koyulaşır; kıvrım: yön çizgisi
    out.push([q, edge ? q.ch : ch, q.c.map((x) => x * (edge ? 0.58 : 0.55))]);
  }
  const hex = (c) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('');
  for (const [q, ch, c] of out) { q.ch = ch; q.g = R.gi(ch); q.color = hex(c); q.c = R.col(q.color); }
  return cells;
};

G.SC = (() => {
  // ───────────── ilkeller ─────────────
  const sph = (c, r, m, k = 0) => ({ t: 0, c, r, m, k });
  const ell = (c, rad, m, k = 0) => ({ t: 1, c, rad, m, k });
  const cone = (a, b, r1, r2, m, k = 0) => ({ t: 2, a, b, r1, r2, m, k });
  const tri = (a, b, c, th, m, k = 0) => ({ t: 3, a, b, c, th, m, k });
  const box = (c, h, rr, m, k = 0) => ({ t: 4, c, h, rr, m, k });
  const tor = (c, R, r, m, k = 0) => ({ t: 5, c, R, r, m, k });
  const cut = (p) => { p.neg = true; return p; };
  const mat = (c, spec = 0, em = false, ramp = null) => ({ c, spec, em, ramp });

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // ön hesap (üçgen ve koni için)
  const prep = (p) => {
    if (p.t === 2) {
      p.ba = sub(p.b, p.a); p.l2 = dot(p.ba, p.ba) || 1e-6; p.rr = p.r1 - p.r2; p.a2 = p.l2 - p.rr * p.rr; p.il2 = 1 / p.l2;
    } else if (p.t === 3) {
      p.ba = sub(p.b, p.a); p.cb = sub(p.c, p.b); p.ac = sub(p.a, p.c);
      p.nor = crs(p.ba, p.ac);
      p.n1 = crs(p.ba, p.nor); p.n2 = crs(p.cb, p.nor); p.n3 = crs(p.ac, p.nor);
      p.d1 = dot(p.ba, p.ba) || 1e-6; p.d2 = dot(p.cb, p.cb) || 1e-6; p.d3 = dot(p.ac, p.ac) || 1e-6; p.dn = dot(p.nor, p.nor) || 1e-6;
    }
    return p;
  };
  const bounds = (p) => {
    const e = (c, r) => [c[0] - r, c[1] - r, c[2] - r, c[0] + r, c[1] + r, c[2] + r];
    switch (p.t) {
      case 0: return e(p.c, p.r);
      case 1: return [p.c[0] - p.rad[0], p.c[1] - p.rad[1], p.c[2] - p.rad[2], p.c[0] + p.rad[0], p.c[1] + p.rad[1], p.c[2] + p.rad[2]];
      case 2: { const r = Math.max(p.r1, p.r2); return [Math.min(p.a[0], p.b[0]) - r, Math.min(p.a[1], p.b[1]) - r, Math.min(p.a[2], p.b[2]) - r, Math.max(p.a[0], p.b[0]) + r, Math.max(p.a[1], p.b[1]) + r, Math.max(p.a[2], p.b[2]) + r]; }
      case 3: { const r = p.th; return [Math.min(p.a[0], p.b[0], p.c[0]) - r, Math.min(p.a[1], p.b[1], p.c[1]) - r, Math.min(p.a[2], p.b[2], p.c[2]) - r, Math.max(p.a[0], p.b[0], p.c[0]) + r, Math.max(p.a[1], p.b[1], p.c[1]) + r, Math.max(p.a[2], p.b[2], p.c[2]) + r]; }
      case 4: return [p.c[0] - p.h[0], p.c[1] - p.h[1], p.c[2] - p.h[2], p.c[0] + p.h[0], p.c[1] + p.h[1], p.c[2] + p.h[2]];
      default: return [p.c[0] - p.R - p.r, p.c[1] - p.R - p.r, p.c[2] - p.r, p.c[0] + p.R + p.r, p.c[1] + p.R + p.r, p.c[2] + p.r];
    }
  };

  // tek ilkel mesafesi
  const sd = (p, x, y, z) => {
    switch (p.t) {
      case 0: { const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz) - p.r; }
      case 1: {
        const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2], r = p.rad;
        const ax = dx / r[0], ay = dy / r[1], az = dz / r[2];
        const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
        const bx = ax / r[0], by = ay / r[1], bz = az / r[2];
        const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
        return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
      }
      case 2: {
        const pax = x - p.a[0], pay = y - p.a[1], paz = z - p.a[2], ba = p.ba, l2 = p.l2;
        const yy = pax * ba[0] + pay * ba[1] + paz * ba[2], zz = yy - l2;
        const qx = pax * l2 - ba[0] * yy, qy = pay * l2 - ba[1] * yy, qz = paz * l2 - ba[2] * yy;
        const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
        const k = Math.sign(p.rr) * p.rr * p.rr * x2;
        if (Math.sign(zz) * p.a2 * z2 > k) return Math.sqrt(x2 + z2) * p.il2 - p.r2;
        if (Math.sign(yy) * p.a2 * y2 < k) return Math.sqrt(x2 + y2) * p.il2 - p.r1;
        return (Math.sqrt(x2 * p.a2 * p.il2) + yy * p.rr) * p.il2 - p.r1;
      }
      case 3: {
        const a = p.a, b = p.b, c = p.c;
        const pa = [x - a[0], y - a[1], z - a[2]], pb = [x - b[0], y - b[1], z - b[2]], pc = [x - c[0], y - c[1], z - c[2]];
        let s;
        if (Math.sign(dot(p.n1, pa)) + Math.sign(dot(p.n2, pb)) + Math.sign(dot(p.n3, pc)) < 2) {
          const seg = (e, q, de) => {
            const t = G.clamp(dot(e, q) / de, 0, 1);
            const dx = e[0] * t - q[0], dy = e[1] * t - q[1], dz = e[2] * t - q[2];
            return dx * dx + dy * dy + dz * dz;
          };
          s = Math.min(seg(p.ba, pa, p.d1), seg(p.cb, pb, p.d2), seg(p.ac, pc, p.d3));
        } else { const d = dot(p.nor, pa); s = (d * d) / p.dn; }
        return Math.sqrt(s) - p.th;
      }
      case 4: {
        const qx = Math.abs(x - p.c[0]) - p.h[0] + p.rr, qy = Math.abs(y - p.c[1]) - p.h[1] + p.rr, qz = Math.abs(z - p.c[2]) - p.h[2] + p.rr;
        const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
        return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - p.rr;
      }
      default: {
        const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2];
        const q = Math.sqrt(dx * dx + dy * dy) - p.R;
        return Math.sqrt(q * q + dz * dz) - p.r;
      }
    }
  };

  // sahne: yumuşak birleşim + kesme; yüzey malzemesi de döner
  let hitMat = null;
  const scene = (P, x, y, z) => {
    let d = 1e9, md = 1e9, mm = null;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], di = sd(p, x, y, z);
      if (p.neg) { if (-di > d) { d = -di; mm = p.m || mm; } continue; }
      if (di < md + 0.8) { md = Math.min(md, di); mm = p.m; }
      if (p.k > 0 && d < 1e8) { const h = Math.max(p.k - Math.abs(d - di), 0) / p.k; d = Math.min(d, di) - h * h * p.k * 0.25; }
      else if (di < d) d = di;
    }
    hitMat = mm;
    return d;
  };

  // ───────────── kamera & ışık ─────────────
  const PITCH = 1.2, cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const F = [0, -sp, -cp], UP = [0, cp, -sp];
  const Lr = [-0.5, 0.78, 0.55], ll = Math.hypot(...Lr), L = Lr.map((v) => v / ll);
  const Hv = [L[0] - F[0], L[1] - F[1], L[2] - F[2]], hl = Math.hypot(...Hv), H = Hv.map((v) => v / hl);

  // ekrandaki (u sağ, v yukarı) noktadan ışın
  const march = (P, bb, u, v) => {
    const ox = u, oy = UP[1] * v - F[1] * 900, oz = UP[2] * v - F[2] * 900;
    const dy = F[1], dz = F[2];
    if (ox < bb[0] || ox > bb[3]) return null;
    let t0 = 0, t1 = 1e9;
    const sl = (o, d, lo, hi) => {
      if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
      let a = (lo - o) / d, b = (hi - o) / d;
      if (a > b) { const s = a; a = b; b = s; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      return t0 <= t1;
    };
    if (!sl(oy, dy, bb[1], bb[4]) || !sl(oz, dz, bb[2], bb[5])) return null;
    let t = t0;
    for (let i = 0; i < 72 && t <= t1; i++) {
      const y = oy + dy * t, z = oz + dz * t;
      const d = scene(P, ox, y, z);
      if (d < 0.25) return [ox, y, z, hitMat];
      t += Math.max(d * 0.9, 0.35);
    }
    return null;
  };

  const shade = (P, h) => {
    const [x, y, z, m] = h, e = 0.5;
    const a = scene(P, x + e, y - e, z - e), b = scene(P, x - e, y - e, z + e), c = scene(P, x - e, y + e, z - e), d = scene(P, x + e, y + e, z + e);
    let nx = a - b - c + d, ny = -a - b + c + d, nz = -a + b - c + d;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    // ortam kapatma: normal boyunca 3 örnek
    let occ = 0, w = 1;
    for (let i = 1; i <= 3; i++) { const hh = 3.5 * i; occ += ((hh - scene(P, x + nx * hh, y + ny * hh, z + nz * hh)) * w) / hh; w *= 0.6; }
    const ao = G.clamp(1 - occ * 0.75, 0.25, 1);
    const ndl = nx * L[0] + ny * L[1] + nz * L[2];
    const diff = Math.max(0, (ndl + 0.25) / 1.25);
    const spec = Math.pow(Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]), 18) * (m ? m.spec : 0);
    const facing = Math.max(0, -(nx * F[0] + ny * F[1] + nz * F[2]));
    const rim = Math.pow(1 - facing, 3) * 0.35;
    const lum = G.clamp((0.1 + 0.9 * diff) * ao + rim * 0.6 + spec * 0.8, 0, 1.3);
    return { lum, spec, m };
  };

  // ───────────── fırınlama ─────────────
  const SX = 3, SY = 4;
  const toHex = (c) => '#' + c.map((v) => Math.round(G.clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('');

  const frame = (P, h) => {
    const R = G.R, CW = R.CW, CH = R.CH;
    P = P.map(prep);
    const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of P) if (!p.neg) { const b = bounds(p); for (let k = 0; k < 3; k++) { bb[k] = Math.min(bb[k], b[k]); bb[k + 3] = Math.max(bb[k + 3], b[k + 3]); } }
    // ekran sınırları (v = y*cp - z*sp)
    let v0 = 1e9, v1 = -1e9;
    for (const y of [bb[1], bb[4]]) for (const z of [bb[2], bb[5]]) { const v = y * cp - z * sp; v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const cyOf = (dr) => -h / 2 + dr * CH; // ekran-aşağı y (ayaklar 0)
    const c0 = Math.floor(bb[0] / CW) - 1, c1 = Math.ceil(bb[3] / CW) + 1;
    const r0 = Math.floor((-v1 + h / 2) / CH) - 1, r1 = Math.ceil((-v0 + h / 2) / CH) + 1;
    const W = c1 - c0 + 1, Hn = r1 - r0 + 1;
    const hit = new Array(W * Hn).fill(null);
    for (let r = 0; r < Hn; r++) for (let c = 0; c < W; c++) {
      const hh = march(P, bb, (c + c0) * CW, -cyOf(r + r0));
      if (hh) hit[r * W + c] = shade(P, hh);
    }
    const cells = [], fill = [], tmap = new Float32Array(SX * SY);
    for (let r = 0; r < Hn; r++) for (let c = 0; c < W; c++) {
      let any = false, all = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const rr = r + dy, cc = c + dx;
        const hv = rr >= 0 && cc >= 0 && rr < Hn && cc < W ? hit[rr * W + cc] : null;
        if (hv) any = true; else all = false;
      }
      if (!any) continue;
      const dc = c + c0, dr = r + r0;
      let ch, col, em = 0;
      const center = hit[r * W + c];
      if (all && center) {
        const m = center.m, rgb = R.col(m.c), l = center.lum;
        const ramp = m.ramp || ':+#';
        ch = m.em ? (l > 0.6 ? '#' : '*') : ramp[Math.min(ramp.length - 1, Math.floor(Math.pow(Math.min(1, l), 1.1) * ramp.length))];
        const k = m.em ? 1.15 : 0.22 + 0.95 * l;
        col = [Math.min(1, rgb[0] * k + center.spec * 0.6), Math.min(1, rgb[1] * k + center.spec * 0.6), Math.min(1, rgb[2] * k + center.spec * 0.6)];
        em = m.em ? 1 : 0;
      } else {
        // kenar: alt örneklerle kapsama haritası → şekle uyan karakter
        let n = 0, cr = 0, cg = 0, cb = 0, ne = 0, ls = 0, soft = null;
        tmap.fill(0);
        for (let j = 0; j < SY; j++) for (let i = 0; i < SX; i++) {
          const u = dc * CW - CW / 2 + ((i + 0.5) * CW) / SX;
          const v = -(cyOf(dr) - CH / 2 + ((j + 0.5) * CH) / SY);
          const hh = march(P, bb, u, v);
          if (!hh) continue;
          const s = shade(P, hh), rgb = R.col(s.m.c), k = s.m.em ? 1.15 : 0.22 + 0.95 * s.lum;
          cr += rgb[0] * k; cg += rgb[1] * k; cb += rgb[2] * k; n++; if (s.m.em) ne++; ls += s.lum; if (s.m.soft) soft = s.m;
          tmap[j * SX + i] = 0.85;
        }
        if (n < 2) continue;
        const cov = n / (SX * SY);
        if (soft) {
          // yumuşak kenar: ince ton karakteri, kapsama oranına göre sönük
          const rp = soft.ramp, l = (ls / n) * cov;
          ch = rp[Math.min(rp.length - 1, Math.floor(l * rp.length))];
          col = [(cr / n) * (0.35 + 0.65 * cov), (cg / n) * (0.35 + 0.65 * cov), (cb / n) * (0.35 + 0.65 * cov)];
        } else {
          ch = G.Bake.best(tmap);
          col = [cr / n, cg / n, cb / n];
        }
        em = ne > n / 2 ? 1 : 0;
      }
      fill.push(dc, dr);
      if (ch === ' ') continue;
      const color = toHex(col);
      cells.push({ dc, dr, ch, g: R.gi(ch), c: R.col(color), color, dx: dc * CW, dy: dr * CH, e: em });
    }
    G.linePass(cells);
    return { cells, fill };
  };

  const mirror = (fr) => ({
    cells: fr.cells.map((q) => { const ch = G.MIRROR[q.ch] || q.ch; return { ...q, ch, g: G.R.gi(ch), dc: -q.dc, dx: -q.dx }; }),
    fill: fr.fill.map((v, i) => (i % 2 ? v : -v)),
  });

  const scale = (P, s) => P.map((p) => {
    const q = { ...p }, m = (v) => v.map((x) => x * s);
    for (const k of ['c', 'a', 'b']) if (Array.isArray(q[k])) q[k] = m(q[k]);
    if (q.t === 1) q.rad = m(q.rad);
    if (q.t === 4) q.h = m(q.h);
    for (const k of ['r', 'r1', 'r2', 'th', 'rr', 'R', 'k']) if (typeof q[k] === 'number') q[k] *= s;
    return q;
  });
  const vrange = (P) => {
    let v0 = 1e9, v1 = -1e9;
    for (const p of P.map(prep)) {
      if (p.neg) continue;
      const b = bounds(p);
      for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) { const v = y * cp - z * sp; v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    }
    return [v0, v1];
  };
  return { sph, ell, cone, tri, box, tor, cut, mat, frame, mirror, scale, vrange };
})();

// ───────────── Fırın kuyruğu: başta gerekenler hemen, kalanlar arka planda ─────────────
G.Bake = {
  SX: 3, SY: 4,
  CHARS: ' .,:;\'`"-_~^/\\|',
  maps: null, jobs: [],
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
    for (let i = 0; i < this.maps.length; i++) {
      const mp = this.maps[i];
      let d = 0;
      for (let k = 0; k < t.length; k++) { const e = mp[k] - t[k]; d += e * e; }
      if (d < bd) { bd = d; bi = i; }
    }
    return this.CHARS[bi];
  },
  // bir gövdenin karelerini adım adım fırınlayan iş
  start(id) {
    const def = G.BODIES[id];
    const spr = { fps: def.fps, frames: [], ready: false, id };
    G.SPR[id] = spr;
    this.jobs.push({ id, def, spr, f: 0 });
  },
  stepJob(j) {
    const def = j.def, ph = (j.f / def.frames) * Math.PI * 2;
    const sc = (def.scale || 1.6) * 0.87;
    const P = G.SC.scale(def.pose(ph, j.f), sc);
    if (j.h === undefined) { const [v0, v1] = G.SC.vrange(P); j.h = v0 + v1; j.top = v1; }
    const fr = G.SC.frame(P, j.h);
    const m = G.SC.mirror(fr);
    const ring = (fill) => {
      const set = new Set(); for (let n = 0; n < fill.length; n += 2) set.add(fill[n] * 1000 + fill[n + 1]);
      const out = [], seen = new Set();
      for (let n = 0; n < fill.length; n += 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = fill[n] + dx, y = fill[n + 1] + dy, k = x * 1000 + y;
        if (!set.has(k) && !seen.has(k)) { seen.add(k); out.push(x, y); }
      }
      return out;
    };
    j.spr.frames.push({ cells: fr.cells, fill: fr.fill, cellsF: m.cells, fillF: m.fill, ring: ring(fr.fill), ringF: ring(m.fill) });
    j.f++;
    if (j.f >= def.frames) this.finish(j);
  },
  finish(j) {
    const spr = j.spr, R = G.R;
    let mc = 1e9, Mc = -1e9, mr = 1e9, Mr = -1e9;
    for (const f of spr.frames) for (const q of f.cells) { mc = Math.min(mc, q.dc); Mc = Math.max(Mc, q.dc); mr = Math.min(mr, q.dr); Mr = Math.max(Mr, q.dr); }
    spr.w = Mc - mc + 1; spr.h = Mr - mr + 1; spr.mc = mc; spr.mr = mr;
    const sc = (j.def.scale || 1.6) * 0.87;
    spr.pw = spr.w * R.CW; spr.ph = j.h; spr.top = j.top;
    spr.rad = (j.def.rad || Math.max(8, spr.pw * 0.3)) * Math.min(1.35, sc);
    spr.ready = true;
    this.jobs.splice(this.jobs.indexOf(j), 1);
  },
  // gerekirse hemen bitir (ör. boss doğmadan önce)
  now(id) {
    if (!G.SPR[id]) this.start(id);
    const j = this.jobs.find((q) => q.id === id);
    while (j && !j.spr.ready) this.stepJob(j);
    return G.SPR[id];
  },
  // her karede küçük bir zaman bütçesiyle arka plan fırınlama
  tick(ms) {
    const t0 = performance.now();
    while (this.jobs.length && performance.now() - t0 < ms) this.stepJob(this.jobs[0]);
  },
  all() {
    this.analyze();
    G.SPR = {};
    const first = ['knight', 'barbarian', 'monk', 'merchant', 'house', 'well', 'campfire', 'pine', 'rock', 'deadtree', 'wall', 'portcullis', 'brazier', 'bat', 'wolf', 'spider'];
    for (const id of first) this.now(id);
    for (const id in G.BODIES) if (!G.SPR[id]) this.start(id);
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
