'use strict';
// ═══════════════════════════════════════════════════════════════════
//  MÜZİK — dosyasız, gerçek zamanlı üretilen özgün müzik (WebAudio)
//  • keşif: sakin, karanlık ambiyans (yumuşak pad, seyrek arp, derin drone)
//  • boss: klasik rock (distortion power chord riff, bas, davul) — tizleri
//    kesilmiş, sıkıştırılmış, kulak tırmalamasın diye yumuşatılmış
// ═══════════════════════════════════════════════════════════════════
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

G.Music = {
  on: false, mode: null, level: 0.3, step: 0, next: 0, // level: varsayılan kısık
  get vol() { return G.SFX.muted ? 0 : this.level * 0.55; },
  load() {
    try { const s = JSON.parse(localStorage.getItem('karanlik.muzik')); if (s && Number.isFinite(+s.level)) this.level = G.clamp(+s.level, 0, 1); } catch (e) { /* depolama kapalı */ }
  },
  set(level) {
    if (level !== undefined) this.level = G.clamp(level, 0, 1);
    this.apply();
    try { localStorage.setItem('karanlik.muzik', JSON.stringify({ level: this.level })); } catch (e) { /* depolama kapalı */ }
  },
  apply() { if (this.out) this.out.gain.setTargetAtTime(this.vol, this.c.currentTime, 0.05); },

  start() {
    const c = G.SFX.ctx;
    if (!c || this.on) return;
    this.c = c; this.on = true;
    // ana çıkış: sıkıştırıcı seviyeyi dengeler, sert tepeleri yumuşatır
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
    this.out = c.createGain(); this.out.gain.value = this.vol;
    this.out.connect(comp); comp.connect(c.destination);
    // yankı: üretilmiş, sönümlenen gürültü darbesi
    const len = c.sampleRate * 3.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = ir;
    const rg = c.createGain(); rg.gain.value = 0.5; this.rev.connect(rg); rg.connect(this.out);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // iki parça, iki ayrı kanal: geçişte biri kısılır diğeri açılır
    this.bus = {};
    for (const [k, send, lp] of [['calm', 0.65, 3200], ['boss', 0.12, 4200]]) {
      const g = c.createGain(), f = c.createBiquadFilter(), s = c.createGain();
      g.gain.value = 0; f.type = 'lowpass'; f.frequency.value = lp; s.gain.value = send;
      g.connect(f); f.connect(this.out); f.connect(s); s.connect(this.rev);
      this.bus[k] = g;
    }
    // gitar zinciri: yumuşak distortion → kabin benzeri filtreler
    const shaper = c.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 6) * 0.8; }
    shaper.curve = curve; shaper.oversample = '4x';
    const hp = c.createBiquadFilter(), cab = c.createBiquadFilter(), mid = c.createBiquadFilter(), gg = c.createGain();
    hp.type = 'highpass'; hp.frequency.value = 90;
    cab.type = 'lowpass'; cab.frequency.value = 2400; cab.Q.value = 0.6;
    mid.type = 'peaking'; mid.frequency.value = 900; mid.gain.value = -4; mid.Q.value = 0.8;
    gg.gain.value = 0.32;
    this.gtr = c.createGain(); this.gtr.gain.value = 0.5;
    this.gtr.connect(shaper); shaper.connect(hp); hp.connect(cab); cab.connect(mid); mid.connect(gg); gg.connect(this.bus.boss);
    this.next = c.currentTime + 0.15;
    this.timer = setInterval(() => this.tick(), 50);
  },

  // her kare: oyun durumuna göre parça seçimi
  update() {
    if (!this.on) { if (G.SFX.ctx) this.start(); return; }
    const want = G.mode === 'play' && G.S && G.S.boss && !G.S.dead ? 'boss' : 'calm';
    if (want !== this.mode) this.switchTo(want);
  },
  switchTo(m) {
    const c = this.c, t = c.currentTime, fade = m === 'boss' ? 1.2 : 3.5;
    for (const k in this.bus) {
      const g = this.bus[k].gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(k === m ? (k === 'boss' ? 0.8 : 1.6) : 0, t + fade);
    }
    this.mode = m; this.step = 0; this.next = Math.max(this.next, t + 0.1);
  },
  tick() {
    const c = this.c;
    if (c.state !== 'running' || !this.mode) return;
    if (this.next < c.currentTime - 0.5) this.next = c.currentTime + 0.05; // sekme arka plandaydı: atla
    const dur = this.mode === 'boss' ? 60 / 132 / 2 : 60 / 64 / 2;
    while (this.next < c.currentTime + 0.35) { this[this.mode](this.step, this.next, dur); this.next += dur; this.step++; }
  },

  // ───────────── ses kaynakları ─────────────
  env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return t + a + hold + rel + 0.05;
  },
  osc(type, freq, t, end, dest, detune = 0) {
    const o = this.c.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end);
    return o;
  },
  hit(t, dest, { dur, gain, type = 'bandpass', freq = 1000, q = 0.7 }) {
    const c = this.c, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); f.connect(g); g.connect(dest);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },

  // ───────────── KEŞİF: sakin karanlık ambiyans (64 bpm) ─────────────
  CALM: [[57, 60, 64, 71], [53, 57, 60, 64], [50, 57, 62, 65], [52, 55, 59, 64]], // Am9 · Fmaj7 · Dm · Em
  calm(s, t, dur) {
    const c = this.c, bus = this.bus.calm, bar = Math.floor(s / 8), st = s % 8, ch = this.CALM[bar % 4], barDur = dur * 8;
    if (st === 0) {
      // pad: iki hafif detune'lu dalga, yavaş açılıp kapanan filtre
      const f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.Q.value = 0.4;
      f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1100, t + barDur * 0.6); f.frequency.linearRampToValueAtTime(600, t + barDur * 1.3);
      f.connect(g); g.connect(bus);
      const end = this.env(g, t, barDur * 0.35, 0.05, barDur * 0.55, barDur * 0.6);
      for (const m of ch) { this.osc('sawtooth', mf(m), t, end, f, -7); this.osc('triangle', mf(m), t, end, f, 6); }
      // derin drone
      const dg = c.createGain(); dg.connect(bus);
      this.osc('sine', mf(ch[0] - 24), t, this.env(dg, t, 1.2, 0.13, barDur - 1.2, 1.4), dg);
    }
    // seyrek, yumuşak arp — her ölçüde biraz farklı
    const r = hash(bar * 8 + st);
    if ([0, 3, 5, 6].includes(st) && r < 0.62) {
      const m = ch[(st + bar) % 4] + (r < 0.2 ? 24 : 12), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 2200; f.connect(g); g.connect(bus);
      this.osc('triangle', mf(m), t, this.env(g, t, 0.01, 0.055, 0.05, 1.6), f);
    }
    // ara sıra uzak bir çan
    if (st === 4 && bar % 4 === 2) {
      const g = c.createGain(); g.connect(bus);
      this.osc('sine', mf(ch[2] + 24), t, this.env(g, t, 0.02, 0.025, 0, 3.5), g);
      this.osc('sine', mf(ch[2] + 31), t, this.env(g, t, 0.02, 0.012, 0, 2.5), g);
    }
  },

  // ───────────── BOSS: klasik rock (132 bpm, Mi minör) ─────────────
  // 16 ölçülük döngü: riff kıtası (8) + nakarat (8); sayı = power chord kökü, dizi = riff
  RIFF1: [0, 0, 3, 0, 5, 0, 3, 2], RIFF2: [0, 0, 3, 0, 7, 6, 5, 3],
  SONG: ['R1', 'R1', 'R1', 'R2', 'R1', 'R1', 'R1', 'R2', 36, 38, 40, 40, 36, 38, 35, 35],
  LEAD: [[64, 0, 67, 0, 69, 0, 67, 0], [71, 0, 0, 69, 67, 0, 66, 0], [64, 0, 0, 0, 0, 0, 62, 64], [67, 0, 0, 0, 66, 0, 0, 0],
    [64, 0, 67, 0, 69, 0, 71, 0], [74, 0, 0, 72, 71, 0, 69, 0], [71, 0, 0, 0, 0, 0, 0, 0], [66, 0, 0, 0, 0, 0, 0, 0]],
  boss(s, t, dur) {
    const c = this.c, bus = this.bus.boss, bar = Math.floor(s / 8) % 16, st = s % 8, sec = this.SONG[bar];
    const chorus = typeof sec === 'number';
    const root = chorus ? sec : 40 + (sec === 'R1' ? this.RIFF1 : this.RIFF2)[st];
    // gitar: kök + beşli + oktav (power chord); vuruşlar vurgulu, diğerleri palm-mute
    const accent = st === 0 || st === 4 || (!chorus && root !== 40);
    const g = c.createGain(); g.connect(this.gtr);
    const end = this.env(g, t, 0.005, accent ? 0.5 : 0.3, dur * (accent ? 0.75 : 0.35), accent ? 0.12 : 0.06);
    for (const [iv, d] of [[0, -6], [7, 5], [12, -3]]) { this.osc('sawtooth', mf(root + iv), t, end, g, d); this.osc('square', mf(root + iv), t, end, g, -d); }
    // bas
    const bf = c.createBiquadFilter(), bg = c.createGain();
    bf.type = 'lowpass'; bf.frequency.value = 520; bf.connect(bg); bg.connect(bus);
    this.osc('sawtooth', mf(root - 12), t, this.env(bg, t, 0.005, 0.2, dur * 0.7, 0.08), bf);
    // davul
    if (st === 0 || st === 3 || (chorus && st === 5)) {
      const kg = c.createGain(); kg.connect(bus);
      const o = this.osc('sine', 140, t, this.env(kg, t, 0.002, 0.55, 0.02, 0.3), kg);
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    }
    if (st === 2 || st === 6) {
      this.hit(t, bus, { dur: 0.2, gain: 0.22, freq: 1700, q: 0.6 });
      const sg = c.createGain(); sg.connect(bus);
      this.osc('triangle', 185, t, this.env(sg, t, 0.002, 0.12, 0, 0.08), sg);
    }
    this.hit(t, bus, { dur: st % 2 ? 0.03 : 0.05, gain: st % 2 ? 0.018 : 0.03, type: 'highpass', freq: 7000 });
    if (st === 0 && bar % 8 === 0) this.hit(t, bus, { dur: 1.4, gain: 0.05, type: 'highpass', freq: 4500 });
    // nakaratta yumuşak, vibratolu solo
    const n = chorus && this.LEAD[bar - 8][st];
    if (n) {
      let len = 1; while (st + len < 8 && !this.LEAD[bar - 8][st + len]) len++;
      const lf = c.createBiquadFilter(), lg = c.createGain();
      lf.type = 'lowpass'; lf.frequency.value = 1900; lf.connect(lg); lg.connect(bus);
      const e = this.env(lg, t, 0.03, 0.065, dur * len * 0.8, 0.25);
      const lfo = c.createOscillator(), lfg = c.createGain();
      lfo.frequency.value = 5.5; lfg.gain.value = 9; lfo.connect(lfg); lfo.start(t + 0.15); lfo.stop(e);
      for (const [type, d] of [['sawtooth', 4], ['triangle', -4]]) lfg.connect(this.osc(type, mf(n), t, e, lf, d).detune);
    }
  },
};
G.Music.load();
