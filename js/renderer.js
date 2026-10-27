'use strict';
// ═══════════════════════════════════════════════════════════════════
//  TAM ASCII RENDERER
//  Ekran sabit bir karakter ızgarasıdır. Her karede:
//    zemin (rüzgârda çimen) → nesneler → ışık hesabı → WebGL ile tek çizim
//  Parlama (bloom) ayrı bir 2D katmanda 'lighter' ile eklenir.
// ═══════════════════════════════════════════════════════════════════
G.R = {
  CW: 5, CH: 9,                  // bir hücrenin dünya birimi cinsinden boyu
  benders: [], trail: new Map(),
  zoom: 1, S: 1, Sy: 1, cols: 0, rows: 0, VW: 0, VH: 0, W: 0, H: 0,
  cam: { x: 0, y: 0, shake: 0, sx: 0, sy: 0 },
  ox: 0, oy: 0, c0: 0, r0: 0, time: 0,
  ambient: [0.52, 0.6, 0.72],
  gmap: new Map(), glist: [' '], atlasDirty: true,
  colCache: new Map(), blooms: [], strokes: [], desat: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.fxc = document.getElementById('fx');
    this.fx = this.fxc.getContext('2d');
    const gl = this.canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) throw new Error('WebGL desteklenmiyor');
    this.gl = gl;
    this.atlas = document.createElement('canvas');
    this.actx = this.atlas.getContext('2d');
    this.setupGL();
    this.resize();
    addEventListener('resize', () => this.resize());
  },

  // ───────────── WebGL ─────────────
  setupGL() {
    const gl = this.gl;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;
      uniform sampler2D uData, uBg, uAtlas;
      uniform vec2 uRes, uCell, uGrid, uAtlasPx, uOff;
      void main(){
        vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) + uOff; // hücre altı kaydırma: pürüzsüz akış
        vec2 cell = floor(px / uCell);
        vec2 local = px - cell * uCell;
        vec2 duv = (cell + 0.5) / uGrid;
        vec4 d = texture2D(uData, duv);
        vec3 bg = texture2D(uBg, px / uCell / uGrid).rgb;
        float gi = floor(d.a * 255.0 + 0.5);
        vec2 ag = vec2(mod(gi, 16.0), floor(gi / 16.0));
        float a = texture2D(uAtlas, (ag * uCell + floor(local) + 0.5) / uAtlasPx).a;
        gl_FragColor = vec4(bg + d.rgb * a, 1.0);
      }`;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr); gl.useProgram(pr);
    this.prog = pr;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = (unit, filter) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.tData = tex(0, gl.NEAREST);
    this.tBg = tex(1, gl.LINEAR);
    this.tAtlas = tex(2, gl.NEAREST);
    gl.uniform1i(gl.getUniformLocation(pr, 'uData'), 0);
    gl.uniform1i(gl.getUniformLocation(pr, 'uBg'), 1);
    gl.uniform1i(gl.getUniformLocation(pr, 'uAtlas'), 2);
    this.u = {};
    for (const n of ['uRes', 'uCell', 'uGrid', 'uAtlasPx', 'uOff']) this.u[n] = gl.getUniformLocation(pr, n);
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = innerWidth; this.H = innerHeight;
    this.zoom = G.clamp(Math.min(this.W, this.H) / 1250, 0.7, 1.0); // kamera uzakta: daha geniş görüş
    this.cellW = Math.max(4, Math.round(this.CW * dpr * this.zoom));
    this.cellH = Math.round((this.cellW * this.CH) / this.CW);
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.fxc.width = Math.floor(this.canvas.width / 2);
    this.fxc.height = Math.floor(this.canvas.height / 2);
    this.cols = Math.ceil(this.canvas.width / this.cellW) + 1;
    this.rows = Math.ceil(this.canvas.height / this.cellH) + 1;
    this.S = this.cellW / this.CW; this.Sy = this.cellH / this.CH;
    this.dpr = dpr;
    this.VW = this.canvas.width / this.S; this.VH = this.canvas.height / this.Sy;
    const n = this.cols * this.rows;
    this.ch = new Uint8Array(n); this.em = new Uint8Array(n); this.zb = new Float32Array(n); // zb: dekorların derinliği (canlı figürleri örtmek için)
    this.fr = new Float32Array(n); this.fg = new Float32Array(n); this.fb = new Float32Array(n);
    this.lr = new Float32Array(n); this.lg = new Float32Array(n); this.lb = new Float32Array(n);
    this.br = new Float32Array(n); this.bg = new Float32Array(n); this.bb = new Float32Array(n);
    this.out = new Uint8Array(n * 4); this.bgo = new Uint8Array(n * 4);
    this.vig = new Float32Array(n);
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const dx = (x / this.cols - 0.5) * 2, dy = (y / this.rows - 0.5) * 2;
      const d = Math.sqrt(dx * dx * 0.7 + dy * dy * (dy > 0 ? 1.7 : 0.75));
      this.vig[y * this.cols + x] = 1 - G.clamp((d - 0.6) / 0.7, 0, 1) * 0.7;
    }
    this.buildAtlas();
  },

  // ───────────── Karakter atlası (16x16 hücre, ihtiyaç oldukça dolar) ─────────────
  buildAtlas() {
    const a = this.atlas;
    a.width = 16 * this.cellW; a.height = 16 * this.cellH;
    const fsz = Math.floor(Math.min(this.cellH * 0.92, this.cellW / 0.6));
    this.afont = `700 ${fsz}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    this.actx.clearRect(0, 0, a.width, a.height);
    this.glist.forEach((c, i) => this.drawGlyph(i, c));
    this.atlasDirty = true;
  },
  drawGlyph(i, c) {
    const x = this.actx;
    x.font = this.afont;
    if ('fontVariantLigatures' in x) x.fontVariantLigatures = 'none'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(c, (i % 16) * this.cellW + this.cellW / 2, Math.floor(i / 16) * this.cellH + this.cellH * 0.55);
  },
  gi(c) {
    let i = this.gmap.get(c);
    if (i !== undefined) return i;
    if (this.glist.length >= 256) return this.gmap.get('?') || 0;
    i = this.glist.length;
    this.glist.push(c); this.gmap.set(c, i);
    this.drawGlyph(i, c);
    this.atlasDirty = true;
    return i;
  },
  col(hex) {
    let c = this.colCache.get(hex);
    if (c) return c;
    const n = parseInt(hex.slice(1), 16);
    c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    this.colCache.set(hex, c);
    return c;
  },

  // ───────────── Değer gürültüsü (zemin desenleri) ─────────────
  noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = G.hash2(xi, yi), b = G.hash2(xi + 1, yi), c = G.hash2(xi, yi + 1), d = G.hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  },

  // ───────────── Kare başı: zemin ─────────────
  begin(t) {
    this.time = t;
    const c = this.cam;
    this.c0 = Math.floor((c.x + c.sx - this.VW / 2) / this.CW);
    this.r0 = Math.floor((c.y + c.sy - this.VH / 2) / this.CH);
    this.ox = this.c0 * this.CW; this.oy = this.r0 * this.CH;
    // kameranın hücre içindeki kesirli konumu (dünya birimi)
    this.fxo = c.x + c.sx - this.VW / 2 - this.ox; this.fyo = c.y + c.sy - this.VH / 2 - this.oy;
    this.blooms.length = 0; this.strokes.length = 0; this.zb.fill(-1e9);
    G.Ground.render(this, t);
  },


  // ───────────── Yazma ilkelleri (ekran = ızgaranın sol-üstüne göre dünya birimi) ─────────────
  put(i, g, c, a, em) {
    if (a >= 0.98) {
      this.ch[i] = g; this.fr[i] = c[0]; this.fg[i] = c[1]; this.fb[i] = c[2]; this.em[i] = em;
    } else {
      this.fr[i] += (c[0] - this.fr[i]) * a; this.fg[i] += (c[1] - this.fg[i]) * a; this.fb[i] += (c[2] - this.fb[i]) * a;
      if (a > 0.45) { this.ch[i] = g; this.em[i] = em; }
    }
  },
  g(ch, x, y, color, alpha = 1, glowColor = null, blur = 0) {
    if (alpha <= 0.02) return;
    const cx = Math.floor(x / this.CW), cy = Math.floor(y / this.CH);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    this.put(cy * this.cols + cx, this.gi(ch), this.col(color), alpha, blur || glowColor ? 1 : 0);
    if (blur) this.light(x, y, blur * 6, glowColor || color, 0.3 * alpha);
  },
  // nokta ışığı (ekran koordinatı)
  light(x, y, r, color, inten) {
    const c = this.col(color), CW = this.CW, CH = this.CH, cols = this.cols;
    const x0 = Math.max(0, Math.floor((x - r) / CW)), x1 = Math.min(cols - 1, Math.floor((x + r) / CW));
    const y0 = Math.max(0, Math.floor((y - r) / CH)), y1 = Math.min(this.rows - 1, Math.floor((y + r) / CH));
    const r2 = r * r;
    for (let cy = y0; cy <= y1; cy++) {
      const dy = (cy + 0.5) * CH - y;
      for (let cx = x0; cx <= x1; cx++) {
        const dx = (cx + 0.5) * CW - x, d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        let f = 1 - d2 / r2; f *= f * inten;
        const i = cy * cols + cx;
        this.lr[i] += c[0] * f; this.lg[i] += c[1] * f; this.lb[i] += c[2] * f;
      }
    }
  },
  lightW(wx, wy, r, color, inten) { this.light(wx - this.ox, wy - this.oy, r, color, inten); },
  bloom(x, y, r, color, a) { if (this.blooms.length < 160) this.blooms.push({ x, y, r, color, a }); },
  // pürüzsüz çizgiler parlama katmanına çizilir (elips uyarılar, yaylar, şimşek)
  ellipseW(wx, wy, rx, ry, color, o = {}) { this.strokes.push({ t: 0, x: wx - this.ox, y: wy - this.oy, rx, ry, a0: o.a0 ?? 0, a1: o.a1 ?? Math.PI * 2, color, w: o.w || 1.5, alpha: o.alpha ?? 1, dash: o.dash, glow: o.glow ?? 6 }); },
  polyW(pts, color, o = {}) { this.strokes.push({ t: 1, pts: pts.map(([x, y]) => [x - this.ox, y - this.oy]), color, w: o.w || 2, alpha: o.alpha ?? 1, glow: o.glow ?? 10 }); },
  bloomW(wx, wy, r, color, a) { this.bloom(wx - this.ox, wy - this.oy, r, color, a); },
  // zemine düşen gölge (elips, hücre karartma)
  shadow(wx, wy, rx, ry, s = 0.6) {
    const x = wx - this.ox, y = wy - this.oy, CW = this.CW, CH = this.CH, cols = this.cols;
    const x0 = Math.max(0, Math.floor((x - rx) / CW)), x1 = Math.min(cols - 1, Math.floor((x + rx) / CW));
    const y0 = Math.max(0, Math.floor((y - ry) / CH)), y1 = Math.min(this.rows - 1, Math.floor((y + ry) / CH));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const dx = ((cx + 0.5) * CW - x) / rx, dy = ((cy + 0.5) * CH - y) / ry, d = dx * dx + dy * dy;
      if (d >= 1) continue;
      const k = 1 - s * (1 - d);
      const i = cy * cols + cx;
      this.fr[i] *= k; this.fg[i] *= k; this.fb[i] *= k;
    }
  },

  // siluet, ışığın tersine (sağ-aşağı) zemine düşer
  castShadow(spr, frame, wx, wy, o = {}) {
    if (!spr || !spr.ready) return;
    const list = (o.anim && spr.anim && spr.anim[o.anim]) || spr.frames;
    const fr = list[((frame % list.length) + list.length) % list.length], fill = o.flip ? fr.fillF : fr.fill;
    const top = Math.max(8, (spr.top || 0) + (o.lift || 0));
    const cx = Math.floor((wx - this.ox) / this.CW) + Math.round((top * 0.28) / this.CW);
    const cy = Math.floor((wy - this.oy) / this.CH) + Math.round((top * 0.22) / this.CH) + 1;
    const k = 1 - (o.s ?? 0.55), cols = this.cols, rows = this.rows;
    for (let n = 0; n < fill.length; n += 2) {
      const X = cx + fill[n], Y = cy + fill[n + 1];
      if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
      const i = Y * cols + X;
      if (this.em[i]) continue;
      this.fr[i] *= k; this.fg[i] *= k; this.fb[i] *= k;
    }
  },
  toScreenX(wx) { return wx - this.ox; },
  toScreenY(wy) { return wy - this.oy; },
  onScreen(sx, sy, m = 60) { return sx > -m && sy > -m && sx < this.VW + m && sy < this.VH + m; },

  // Dünya koordinatında sprite (hücrelere damgalanır)
  sprite(spr, frame, wx, wy, o = {}) {
    if (!spr || !spr.ready) return;
    const cx = Math.floor((wx - this.ox) / this.CW), cy = Math.floor((wy - this.oy) / this.CH);
    if (cx < -spr.w || cy < -spr.h || cx > this.cols + spr.w || cy > this.rows + spr.h) return;
    const list = (o.anim && spr.anim && spr.anim[o.anim]) || spr.frames;
    const fr = list[((frame % list.length) + list.length) % list.length];
    const cells = o.flip ? fr.cellsF : fr.cells;
    const a = o.alpha ?? 1;
    const em = o.flash || o.glow || o.emissive ? 1 : 0, self = o.self ? 2 : 0, clip = o.clip ?? 1e9;
    const tint = o.flash ? this.col('#ffffff') : o.tint ? this.col(o.tint) : null;
    const cols = this.cols, rows = this.rows;
    // kontur: canlıların etrafındaki zemin koyulaşır → silüet net seçilir
    if (o.self && a > 0.5 && fr.ring) {
      const ring = o.flip ? fr.ringF : fr.ring;
      for (let k = 0; k < ring.length; k += 2) {
        const X = cx + ring[k], Y = cy + ring[k + 1];
        if (X < 0 || Y < 0 || X >= cols || Y >= rows || ring[k + 1] > clip) continue;
        const i = Y * cols + X;
        if (this.em[i]) continue;
        this.fr[i] *= 0.22; this.fg[i] *= 0.22; this.fb[i] *= 0.22;
      }
    }
    // siluetin içindeki boşlukları temizle ki çimen figürün içinden görünmesin
    if (a > 0.5) {
      const fill = o.flip ? fr.fillF : fr.fill;
      for (let k = 0; k < fill.length; k += 2) {
        if (fill[k + 1] > clip) continue;
        const X = cx + fill[k], Y = cy + fill[k + 1];
        if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
        const i = Y * cols + X;
        this.ch[i] = 0; this.br[i] = 0; this.bg[i] = 0; this.bb[i] = 0;
        if (o.z !== undefined) this.zb[i] = o.z;
      }
    }
    for (let k = 0; k < cells.length; k++) {
      const cl = cells[k], X = cx + cl.dc, Y = cy + cl.dr;
      if (cl.dr > clip) continue;
      if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
      this.put(Y * cols + X, cl.g, tint || cl.c, a, em || cl.e || self);
      if (o.z !== undefined) this.zb[Y * cols + X] = o.z;
    }
    if (o.glow) this.light(wx - this.ox, wy - this.oy, Math.max(spr.w * this.CW, spr.h * this.CH) * 1.1, o.glow, (o.blur ? 0.06 * o.blur : 0.35) * a);
  },

  // Yazı ızgaraya damgalanır (boyut yok sayılır; büyük = parlak)
  text(str, x, y, color, size = 14, align = 'center', weight = 800, alpha = 1, glow = 0) {
    const n = str.length;
    let cx = Math.floor(x / this.CW);
    if (align === 'center') cx -= Math.floor(n / 2); else if (align === 'right') cx -= n - 1;
    const cy = Math.floor(y / this.CH);
    if (cy < 0 || cy >= this.rows) return;
    const c = this.col(color);
    for (let k = 0; k < n; k++) {
      const X = cx + k;
      if (X < 0 || X >= this.cols || str[k] === ' ') continue;
      this.put(cy * this.cols + X, this.gi(str[k]), c, alpha, 1);
    }
    if (glow) this.light(x, y, n * this.CW + 20, color, 0.25 * alpha);
  },

  // ───────────── Kare sonu: ışık + yükle + çiz ─────────────
  flush() {
    const n = this.cols * this.rows, out = this.out, bgo = this.bgo;
    const [ar, ag, ab] = this.ambient;
    for (let i = 0; i < n; i++) {
      const m = this.vig[i], lr = this.lr[i], lg = this.lg[i], lb = this.lb[i];
      let r, g, b;
      const e = this.em[i];
      if (e === 1) { r = this.fr[i] * 1.5; g = this.fg[i] * 1.5; b = this.fb[i] * 1.5; }
      else if (e === 2) { // canlılar: karanlıkta bile seçilebilir kalır
        r = this.fr[i] * Math.max(0.85, (ar + lr) * m) + lr * 0.06 * m; g = this.fg[i] * Math.max(0.85, (ag + lg) * m) + lg * 0.06 * m; b = this.fb[i] * Math.max(0.85, (ab + lb) * m) + lb * 0.06 * m;
      } else { // çarpımsal ışık + yüzeyi ışık rengine boyayan eklemeli parıltı
        r = (this.fr[i] * (ar + lr) * 1.25 + lr * 0.16) * m; g = (this.fg[i] * (ag + lg) * 1.25 + lg * 0.16) * m; b = (this.fb[i] * (ab + lb) * 1.25 + lb * 0.16) * m;
      }
      if (this.desat > 0) { const d = this.desat, gr = (r + g + b) / 3; r += (gr * 0.78 - r) * d; g += (gr * 0.9 - g) * d; b += (gr * 1.2 - b) * d; }
      // yumuşak ton eşleme: patlayan sarı yerine film gibi doygunluk
      r = r > 0 ? 1 - Math.exp(-r * 1.85) : 0; g = g > 0 ? 1 - Math.exp(-g * 1.85) : 0; b = b > 0 ? 1 - Math.exp(-b * 1.85) : 0;
      const o = i * 4;
      out[o] = r * 255; out[o + 1] = g * 255; out[o + 2] = b * 255;
      out[o + 3] = this.ch[i];
      const hr = (lr * 16 + this.br[i] * 255 * (ar + lr)) * m, hg = (lg * 16 + this.bg[i] * 255 * (ag + lg)) * m, hb = (lb * 16 + this.bb[i] * 255 * (ab + lb)) * m;
      bgo[o] = hr > 90 ? 90 : hr; bgo[o + 1] = hg > 90 ? 90 : hg; bgo[o + 2] = hb > 90 ? 90 : hb; bgo[o + 3] = 255;
    }
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tData);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.cols, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, out);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tBg);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.cols, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, bgo);
    if (this.atlasDirty) {
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tAtlas);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlas);
      this.atlasDirty = false;
    }
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uOff, this.fxo * this.S, this.fyo * this.Sy);
    gl.uniform2f(this.u.uCell, this.cellW, this.cellH);
    gl.uniform2f(this.u.uGrid, this.cols, this.rows);
    gl.uniform2f(this.u.uAtlasPx, this.atlas.width, this.atlas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // parlama katmanı
    const fx = this.fx, sx = this.S / 2, sy = this.Sy / 2;
    fx.globalCompositeOperation = 'source-over';
    fx.clearRect(0, 0, this.fxc.width, this.fxc.height);
    fx.globalCompositeOperation = 'lighter';
    for (const b of this.blooms) {
      const x = (b.x - this.fxo) * sx, y = (b.y - this.fyo) * sy, r = b.r * sx;
      if (x < -r || y < -r || x > this.fxc.width + r || y > this.fxc.height + r) continue;
      const c = this.col(b.color);
      const gr = fx.createRadialGradient(x, y, 0, x, y, r);
      const rgb = `${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0}`;
      gr.addColorStop(0, `rgba(${rgb},${b.a})`);
      gr.addColorStop(0.4, `rgba(${rgb},${b.a * 0.35})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      fx.fillStyle = gr;
      fx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    fx.globalCompositeOperation = 'source-over';
    fx.lineCap = 'round'; fx.lineJoin = 'round';
    for (const s of this.strokes) {
      fx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
      fx.strokeStyle = s.color; fx.lineWidth = s.w; fx.shadowColor = s.color; fx.shadowBlur = s.glow;
      fx.setLineDash(s.dash ? s.dash.map((v) => v * sx) : []);
      fx.beginPath();
      if (s.t === 0) fx.ellipse((s.x - this.fxo) * sx, (s.y - this.fyo) * sy, Math.max(1, s.rx * sx), Math.max(1, s.ry * sy), 0, s.a0, s.a1);
      else s.pts.forEach(([x, y], i) => (i ? fx.lineTo((x - this.fxo) * sx, (y - this.fyo) * sy) : fx.moveTo((x - this.fxo) * sx, (y - this.fyo) * sy)));
      fx.stroke();
    }
    fx.globalAlpha = 1; fx.shadowBlur = 0; fx.setLineDash([]);
  },

  updateCam(tx, ty, dt) {
    const c = this.cam;
    const k = 1 - Math.pow(0.0005, dt);
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
    c.shake = Math.max(0, c.shake - dt * 30);
    const s = c.shake;
    c.sx = s ? G.rand(-s, s) : 0; c.sy = s ? G.rand(-s, s) : 0;
  },
  shake(v) { this.cam.shake = Math.min(18, Math.max(this.cam.shake, v)); },
};

// Yatay çevirmede ayna karakterler
G.MIRROR = {
  '/': '\\', '\\': '/', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
  'd': 'b', 'b': 'd', 'p': 'q', 'q': 'p', '`': '\'', '´': '`',
};

// Sprite tanımını (satırlar + renk maskesi) hücre listesine çevir
G.prepSprite = (spr) => {
  const R = G.R;
  spr.h = spr.frames[0].l.length;
  spr.w = Math.max(...spr.frames.flatMap((f) => f.l.map((s) => s.length)));
  const hw = Math.floor(spr.w / 2), hh = Math.floor(spr.h / 2);
  for (const f of spr.frames) {
    f.cells = []; f.cellsF = []; f.fill = []; f.fillF = [];
    const mrows = f.c || spr.frames[0].c;
    f.l.forEach((line, r) => {
      const mask = mrows ? mrows[r] || '' : '';
      // satırın ilk ve son dolu karakteri arasındaki boşluklar = siluet içi
      const first = line.search(/\S/), last = line.length - 1 - [...line].reverse().join('').search(/\S/);
      if (first >= 0) for (let c = first + 1; c < last; c++) if (line[c] === ' ') {
        f.fill.push(c - hw, r - hh); f.fillF.push(-(c - hw), r - hh);
      }
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === ' ') continue;
        const mk = mask[c];
        const color = (mk && mk !== ' ' && mk !== '.' && spr.pal && spr.pal[mk]) ||
          (spr.cmap && spr.cmap[ch]) || spr.color || '#dddddd';
        const dc = c - hw, dr = r - hh;
        const fch = G.MIRROR[ch] || ch;
        f.cells.push({ ch, g: R.gi(ch), c: R.col(color), color, dc, dr, dx: dc * R.CW, dy: dr * R.CH });
        f.cellsF.push({ ch: fch, g: R.gi(fch), c: R.col(color), color, dc: -dc, dr, dx: -dc * R.CW, dy: dr * R.CH });
      }
    });
  }
  spr.pw = spr.w * R.CW; spr.ph = spr.h * R.CH;
  spr.rad = spr.rad || Math.max(8, Math.min(spr.pw, spr.ph * 1.2) * 0.42);
  return spr;
};
