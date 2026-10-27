'use strict';
// Global namespace + yardımcılar + girdi
const G = (window.G = {});

G.rand = (a, b) => a + Math.random() * (b - a);
G.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
G.dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
G.angDiff = (a, b) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
G.hash2 = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
G.shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
G.weighted = (obj) => {
  let total = 0;
  for (const k in obj) total += obj[k];
  let r = Math.random() * total;
  for (const k in obj) if ((r -= obj[k]) <= 0) return k;
  return Object.keys(obj)[0];
};
G.fmtTime = (s) => {
  s = Math.floor(s);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
// Nokta ile doğru parçası arası uzaklığın karesi
G.segDist2 = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = G.clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return G.dist2(px, py, x1 + dx * t, y1 + dy * t);
};

// ---------- Girdi ----------
G.keys = {};
G.onKey = null;
const BLOCK = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
addEventListener('keydown', (e) => {
  if (BLOCK.includes(e.code)) e.preventDefault();
  if (!G.keys[e.code] && G.onKey) G.onKey(e.code);
  G.keys[e.code] = true;
});
addEventListener('keyup', (e) => { G.keys[e.code] = false; });
addEventListener('blur', () => { G.keys = {}; G.touch.active = false; });

// Dokunmatik: ekranın herhangi bir yerine bas-sürükle sanal joystick
G.touch = { active: false, ox: 0, oy: 0, x: 0, y: 0, id: null };
addEventListener('touchstart', (e) => {
  if (e.target.closest && e.target.closest('.ov')) return;
  const t = e.changedTouches[0];
  Object.assign(G.touch, { active: true, id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY });
}, { passive: true });
addEventListener('touchmove', (e) => {
  for (const t of e.changedTouches) if (t.identifier === G.touch.id) { G.touch.x = t.clientX; G.touch.y = t.clientY; }
}, { passive: true });
addEventListener('touchend', (e) => {
  for (const t of e.changedTouches) if (t.identifier === G.touch.id) G.touch.active = false;
});

G.moveVec = () => {
  const k = G.keys;
  let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  let y = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if (G.touch.active) {
    const dx = G.touch.x - G.touch.ox, dy = G.touch.y - G.touch.oy;
    const l = Math.hypot(dx, dy);
    if (l > 8) { x = dx / l; y = dy / l; }
  }
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
};
