'use strict';
// hızlı sinüs: zemin her karede on binlerce hücre için sinüs hesaplar
const FSN = 4096, FSK = FSN / (Math.PI * 2), FST = new Float32Array(FSN);
for (let i = 0; i < FSN; i++) FST[i] = Math.sin(i / FSK);
G.fsin = (x) => FST[(x * FSK) & (FSN - 1)];

// ═══════════════════════════════════════════════════════════════════
//  ZEMİN ALANI — dünyaya sabitlenmiş hücre ızgarası (kamerayı izler)
//  • statik: zemin türü, renk, karakter (bölgeye göre, world.js'ten)
//  • çimen: her ot tek tek eğilir (rüzgâr + itilme), ezilir, yaylanarak toparlanır
//  • su / lav: dalga denklemi; yürüyünce halkalar yayılır, kıyıdan yansır
// ═══════════════════════════════════════════════════════════════════
G.K = { GRASS: 0, DIRT: 1, WATER: 2, ASH: 3, STONE: 4, LAVA: 5, DRY: 6, SWAMP: 7, VOID: 8 };

G.Ground = {
  FW: 0, FH: 0, fc0: 0, fr0: 0, MX: 60, MY: 34, acc: 0,

  alloc(n) {
    this.kind = new Uint8Array(n); this.sch = new Uint8Array(n); this.hh = new Float32Array(n);
    this.sr = new Float32Array(n); this.sg = new Float32Array(n); this.sb = new Float32Array(n);
    this.bx = new Float32Array(n); this.fl = new Float32Array(n);
    this.wh = new Float32Array(n); this.wp = new Float32Array(n);
    this.bn = new Float32Array(n); // yanma: 0..1 kavrulmuş, >1 hâlâ yanıyor
  },

  // görüş alanı field'ın iç kenarına yaklaşınca yeniden merkezle
  ensure(R) {
    const FW = R.cols + this.MX * 2, FH = R.rows + this.MY * 2;
    const inside = this.FW === FW && this.FH === FH &&
      R.c0 - this.fc0 > 10 && this.fc0 + FW - (R.c0 + R.cols) > 10 &&
      R.r0 - this.fr0 > 6 && this.fr0 + FH - (R.r0 + R.rows) > 6;
    if (inside) return;
    const nc0 = R.c0 - this.MX, nr0 = R.r0 - this.MY;
    const old = this.FW === FW && this.FH === FH ? { bx: this.bx, fl: this.fl, wh: this.wh, wp: this.wp, bn: this.bn, c0: this.fc0, r0: this.fr0 } : null;
    this.FW = FW; this.FH = FH; this.fc0 = nc0; this.fr0 = nr0;
    this.alloc(FW * FH);
    const info = {};
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const i = y * FW + x, wx = nc0 + x, wy = nr0 + y;
      G.World.groundInfo(wx, wy, info);
      this.kind[i] = info.kind; this.sch[i] = R.gi(info.ch);
      this.sr[i] = info.r; this.sg[i] = info.g; this.sb[i] = info.b; this.hh[i] = info.h;
      if (old) {
        const ox = wx - old.c0, oy = wy - old.r0;
        if (ox >= 0 && oy >= 0 && ox < FW && oy < FH) {
          const j = oy * FW + ox;
          this.bx[i] = old.bx[j]; this.fl[i] = old.fl[j]; this.wh[i] = old.wh[j]; this.wp[i] = old.wp[j]; this.bn[i] = old.bn[j];
        }
      }
    }
  },

  idx(wx, wy) {
    const x = Math.floor(wx / G.R.CW) - this.fc0, y = Math.floor(wy / G.R.CH) - this.fr0;
    if (x < 1 || y < 1 || x >= this.FW - 1 || y >= this.FH - 1) return -1;
    return y * this.FW + x;
  },
  kindAt(wx, wy) { const i = this.idx(wx, wy); return i < 0 ? G.World.kindAt(wx, wy) : this.kind[i]; },

  // Bir gövde çimeni iter: merkezden dışa yatırır, hareket yönünde sürükler, ortayı ezer
  push(wx, wy, r, vx, vy, dt) {
    if (!this.FW) return;
    const CW = G.R.CW, CH = G.R.CH, FW = this.FW;
    const cx = wx / CW - this.fc0, cy = wy / CH - this.fr0;
    const rx = r / CW, ry = (r * 0.55) / CH;
    const x0 = Math.max(1, Math.floor(cx - rx)), x1 = Math.min(FW - 2, Math.ceil(cx + rx));
    const y0 = Math.max(1, Math.floor(cy - ry)), y1 = Math.min(this.FH - 2, Math.ceil(cy + ry));
    const sp = Math.min(1.5, Math.hypot(vx, vy) / 120);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * FW + x, k = this.kind[i];
      if (k !== G.K.GRASS && k !== G.K.DRY) continue;
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      const f = (1 - d) * (1 - d);
      const dirx = d > 0.05 ? dx / d : 0;
      this.bx[i] = G.clamp(this.bx[i] + (dirx * 3.2 + (vx / 140) * 1.4) * f * dt * 8, -1.8, 1.8);
      if (d < 0.75) this.fl[i] = Math.min(1, this.fl[i] + (1 - d) * dt * (2.5 + sp * 5)); // ayak altı geniş ezilir
    }
  },
  // Ateş zemini kavurur: merkez yanar (>1), çevre kahverengiye döner; kalıcı iz
  scorch(wx, wy, r, amt = 1.6) {
    if (!this.FW) return;
    const CW = G.R.CW, CH = G.R.CH, FW = this.FW;
    const cx = wx / CW - this.fc0, cy = wy / CH - this.fr0, rx = r / CW, ry = r / CH;
    const x0 = Math.max(1, Math.floor(cx - rx)), x1 = Math.min(FW - 2, Math.ceil(cx + rx));
    const y0 = Math.max(1, Math.floor(cy - ry)), y1 = Math.min(this.FH - 2, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
      if (d >= 1) continue;
      const i = y * FW + x, k = this.kind[i];
      if (k === G.K.WATER || k === G.K.SWAMP || k === G.K.LAVA) continue;
      const v = amt * (1 - d) * (0.75 + this.hh[i] * 0.5);
      if (v > this.bn[i]) this.bn[i] = Math.min(1.8, v);
    }
  },
  // Suya dalga
  splash(wx, wy, amp, r = 1) {
    const i = this.idx(wx, wy);
    if (i < 0) return;
    const FW = this.FW;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r * 2; dx <= r * 2; dx++) {
      const j = i + dy * FW + dx, k = this.kind[j];
      if (k === G.K.WATER || k === G.K.SWAMP || k === G.K.LAVA) this.wh[j] += amp * (1 - (Math.abs(dx) / (r * 2 + 1) + Math.abs(dy) / (r + 1)) * 0.5);
    }
  },

  update(dt) {
    if (!this.FW) return;
    const n = this.FW * this.FH;
    const rb = Math.exp(-dt * 2.2), rf = dt * 0.22;
    for (let i = 0; i < n; i++) {
      if (this.bx[i] !== 0) { this.bx[i] *= rb; if (Math.abs(this.bx[i]) < 0.002) this.bx[i] = 0; }
      if (this.fl[i] > 0) this.fl[i] = Math.max(0, this.fl[i] - rf);
      const bn = this.bn[i];
      if (bn > 0) this.bn[i] = bn > 1 ? bn - dt * 0.35 : Math.max(0, bn - dt * 0.012);
    }
    // dalga denklemi (sabit adım); dikey komşu ağırlığı düşük → perspektif elipsler
    this.acc += dt;
    const FW = this.FW, FH = this.FH, K = this.kind;
    let steps = 0;
    while (this.acc > 1 / 45 && steps++ < 3) {
      this.acc -= 1 / 45;
      // iki tampon: yeni değer önceki kare tamponuna yazılır, sonra yer değiştirir
      const h = this.wh, p = this.wp;
      for (let y = 1; y < FH - 1; y++) for (let x = 1; x < FW - 1; x++) {
        const i = y * FW + x, k = K[i];
        if (k !== G.K.WATER && k !== G.K.SWAMP && k !== G.K.LAVA) continue;
        const c2 = k === G.K.LAVA ? 0.15 : 0.32, damp = k === G.K.LAVA ? 0.94 : 0.975;
        const lap = h[i - 1] + h[i + 1] - 2 * h[i] + 0.32 * (h[i - FW] + h[i + FW] - 2 * h[i]);
        const nv = (2 * h[i] - p[i] + c2 * lap) * damp;
        p[i] = nv > 2 ? 2 : nv < -2 ? -2 : nv;
      }
      this.wh = p; this.wp = h;
    }
    if (this.acc > 1 / 45) this.acc = 0;
  },

  // ───────────── Çizim: R'nin ekran tamponlarını doldurur ─────────────
  render(R, t) {
    this.ensure(R);
    const { cols, rows, c0, r0 } = R, FW = this.FW, K = G.K;
    const gi = (c) => R.gi(c), FS = G.fsin;
    const GB = gi('|'), GR = gi('/'), GL = gi('\\'), GF = [gi('_'), gi(','), gi('.'), gi('-')], GC = gi('('), GD = gi(')');
    const WCH = [gi('~'), gi('-'), gi('='), gi('^'), gi('.'), gi(','), gi('*'), gi('_')];
    const EM1 = gi('*'), EM2 = gi('.');
    const ch = R.ch, fr = R.fr, fg = R.fg, fb = R.fb, em = R.em;
    for (let y = 0; y < rows; y++) {
      const wy = r0 + y;
      let fi = (wy - this.fr0) * FW + (c0 - this.fc0);
      let i = y * cols;
      for (let x = 0; x < cols; x++, fi++, i++) {
        const wx = c0 + x, k = this.kind[fi], hh = this.hh[fi];
        R.lr[i] = 0; R.lg[i] = 0; R.lb[i] = 0; em[i] = 0; R.br[i] = 0; R.bg[i] = 0; R.bb[i] = 0;
        let r = this.sr[fi], g = this.sg[fi], b = this.sb[fi], c;
        if (k === K.GRASS || k === K.DRY) {
          // rüzgâr: kıvrımlı, yavaş ilerleyen esinti bantları + hafif titreşim
          const wind = FS(wx * 0.045 - t * 1.25 + FS(wy * 0.06 + t * 0.2) * 2.2) * 0.55 +
            FS(wx * 0.017 + wy * 0.05 - t * 0.55) * 0.45 + FS(wx * 0.31 + t * 3.1 + hh * 9) * 0.12 + 0.25;
          const fl = this.fl[fi], tilt = wind + this.bx[fi] * 1.15;
          const blade = hh < (k === K.GRASS ? 0.8 : 0.5);
          if (hh > 0.972 && fl < 0.3) { c = (hh * 1e4) & 1 ? GF[2] : gi('\x27'); const w = 0.55 + (hh - 0.972) * 14; r = 0.7 * w; g = 0.9 * w; b = 0.8 * w; }
          else if (fl > 0.5 + hh * 0.25) {
            c = GF[(hh * 97 | 0) & 3]; const kk = 0.55 + (1 - fl) * 0.3; r *= kk; g *= kk; b *= kk * 0.9;
          } else if (blade) {
            const a = Math.abs(tilt) + fl * 0.9, th = 0.12 + ((hh * 13) % 1) * 0.22;
            if (a < th) c = GB;
            else if (a < 1.25) c = tilt > 0 ? GR : GL;
            else c = tilt > 0 ? (hh > 0.4 ? GD : GF[1]) : (hh > 0.4 ? GC : GF[1]);
            const kk = 1.05 - fl * 0.35; r *= kk; g *= kk; b *= kk;
          } else c = this.sch[fi];
        } else if (k === K.WATER || k === K.SWAMP || k === K.LAVA) {
          const h = this.wh[fi];
          const amb = FS(wx * 0.33 + t * 1.4 + FS(wy * 0.2) * 1.5) * FS(wy * 0.41 - t * 0.9 + wx * 0.05) * (k === K.LAVA ? 0.22 : 0.16);
          const H = h + amb;
          const sl = (this.wh[fi + 1] - this.wh[fi - 1]) * 0.5 - (this.wh[fi + FW] - this.wh[fi - FW]) * 0.8;
          const tw = (hh * 31 + t * 0.6) % 1;
          if (H > 0.3) c = WCH[3]; else if (H > 0.09) c = WCH[0]; else if (H < -0.24) c = WCH[4]; else if (H < -0.09) c = WCH[7];
          else c = tw < 0.35 ? WCH[1] : tw < 0.8 ? WCH[0] : WCH[2];
          if (k !== K.LAVA && H > 0.2 && hh > 0.85) c = WCH[6];
          const kk = Math.max(0.3, Math.min(2, 0.85 + H * 2.2 + sl * 3));
          r *= kk; g *= kk; b *= kk;
          if (H > 0.3 && k === K.WATER) { r += 0.35; g += 0.4; b += 0.4; }
          if (k === K.LAVA) { em[i] = 1; R.lr[i] = 0.5; R.lg[i] = 0.18; R.br[i] = 0.22 + H * 0.15; R.bg[i] = 0.05; }
          else if (k === K.WATER) { R.br[i] = 0.04; R.bg[i] = 0.14 + H * 0.06; R.bb[i] = 0.26 + H * 0.1; }
          else { R.br[i] = 0.05; R.bg[i] = 0.1; R.bb[i] = 0.07; }
        } else {
          c = this.sch[fi];
          if (k === K.ASH && hh > 0.985) { // köz
            const f = 0.5 + 0.5 * FS(t * 3 + hh * 400);
            c = f > 0.6 ? EM1 : EM2; r = 1; g = 0.45 + f * 0.3; b = 0.1; em[i] = 1;
          }
        }
        const bn = this.bn[fi];
        if (bn > 0.02 && k !== K.WATER && k !== K.SWAMP && k !== K.LAVA) {
          // kavrulmuş ot: amber-kahverengi; yanarken turuncu parlar
          const s2 = Math.min(1, bn), lum = 0.6 + (r + g + b) * 0.7;
          r += (0.5 * lum - r) * s2; g += (0.27 * lum - g) * s2; b += (0.1 * lum - b) * s2;
          if (bn > 1) {
            const f = (bn - 1) * (0.7 + 0.3 * FS(t * 13 + hh * 50));
            R.lr[i] = 0.75 * f; R.lg[i] = 0.32 * f; R.lb[i] = 0.06 * f;
            if (hh > 0.9) { c = hh > 0.96 ? EM1 : gi('^'); r = 1; g = 0.6 + f * 0.3; b = 0.2; em[i] = 1; }
          }
        }
        ch[i] = c || 0;
        fr[i] = r; fg[i] = g; fb[i] = b;
      }
    }
  },
};
