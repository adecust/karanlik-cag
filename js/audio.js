'use strict';
// Dosyasız, prosedürel 8-bit ses efektleri (WebAudio)
G.SFX = {
  ctx: null, muted: false, last: {}, level: 0.5, // level: ayarlardaki ses (0-1)
  get vol() { return this.muted ? 0 : this.level * 0.7; },
  // ses ayarı: kaydedilir, açık ses bağlamına hemen uygulanır
  load() {
    try { const s = JSON.parse(localStorage.getItem('karanlik.ses')); if (s) { if (Number.isFinite(+s.level)) this.level = G.clamp(+s.level, 0, 1); this.muted = !!s.muted; } } catch (e) { /* depolama kapalı */ }
  },
  set(level, muted) {
    if (level !== undefined) this.level = G.clamp(level, 0, 1);
    if (muted !== undefined) this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(this.vol, this.ctx.currentTime, 0.02);
    try { localStorage.setItem('karanlik.ses', JSON.stringify({ level: this.level, muted: this.muted })); } catch (e) { /* depolama kapalı */ }
  },
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  tone(type, f1, f2, dur, vol = 0.3, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, freq = 1200) {
    const c = this.ctx, t = c.currentTime;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t);
  },
  play(name) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    const gap = { hit: 45, gem: 35, slash: 60, burn: 120 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'hit': this.noise(0.06, 0.18, 2200); break;
      case 'slash': this.noise(0.12, 0.22, 4000); this.tone('triangle', 900, 300, 0.1, 0.06); break;
      case 'throw': this.tone('triangle', 500, 200, 0.12, 0.12); break;
      case 'gem': this.tone('square', 1100 + Math.random() * 300, 1800, 0.05, 0.05); break;
      case 'hurt': this.tone('sawtooth', 220, 70, 0.22, 0.2); break;
      case 'level':
        [523, 659, 784, 1046].forEach((f, i) => this.tone('square', f, f, 0.12, 0.1, i * 0.08)); break;
      case 'die': this.noise(0.25, 0.12, 900); break;
      case 'boss': this.tone('sawtooth', 110, 40, 1.2, 0.3); this.noise(1, 0.2, 400); break;
      case 'chest':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone('triangle', f, f, 0.18, 0.12, i * 0.09)); break;
      case 'heal': this.tone('sine', 600, 1200, 0.25, 0.15); break;
      case 'boom': this.noise(0.5, 0.35, 700); this.tone('sine', 120, 30, 0.5, 0.3); break;
      case 'warn': this.tone('square', 880, 880, 0.08, 0.06); break;
      case 'burn': this.noise(0.08, 0.06, 1500); break;
      case 'gameover': [392, 330, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.35, 0.15, i * 0.25)); break;
    }
  },
};
G.SFX.load();
