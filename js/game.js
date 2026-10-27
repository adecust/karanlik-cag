'use strict';
// Ana döngü, giriş, kamera, ölüm/yeniden doğma, kayıt, zafer

G.mode = 'menu';
G.DEBUG = /[?&]debug/.test(location.search);
G.MERCHANT = { x: 120, y: -70 };

G.newState = (cls, sv) => ({
  t: 0, player: G.makePlayer(cls, sv), enemies: [], pickups: [], parts: [], floats: [], fx: [], hazards: [],
  kills: 0, dmgDealt: 0, eid: 0, boss: null, banner: null, hurtFlash: 0, slowmo: 0, zone: -1,
  dead: false, over: false, paused: false, potT: 0,
});

G.startGame = (cls, sv) => {
  G.SFX.init();
  G.UI.hide();
  G.World.init(sv);
  G.S = G.newState(cls, sv);
  G.R.cam.x = G.S.player.x; G.R.cam.y = G.S.player.y;
  G.mode = 'play';
  G.pauseBtn.style.display = 'block';
  G.save();
};

G.toMenu = () => {
  G.mode = 'menu';
  G.pauseBtn.style.display = 'none';
  G.World.init(null);
  G.S = G.newState('knight', null);
  G.UI.title();
};

G.togglePause = () => {
  const S = G.S;
  if (G.mode !== 'play' || S.dead || S.over) return;
  if (G.menuOpen === 'shop') { G.UI.hide(); return; }
  S.paused = !S.paused;
  if (S.paused) G.UI.pause(); else G.UI.hide();
};

G.nearMerchant = () => {
  const p = G.S && G.S.player;
  return p && G.mode === 'play' && Math.hypot(p.x - G.MERCHANT.x, p.y - G.MERCHANT.y) < 75;
};

G.playerDie = () => {
  const S = G.S, p = S.player;
  if (S.dead) return;
  S.dead = true;
  const fr = p.spr.frames[0];
  for (const c of p.facing < 0 ? fr.cellsF : fr.cells)
    G.addPart(p.x + c.dx, p.y + c.dy, G.rand(-110, 110), G.rand(-200, -40), c.ch, c.color, 1.6, { grav: 300 });
  G.R.shake(12); G.SFX.play('gameover');
  setTimeout(() => { if (S === G.S && S.dead) G.UI.death(); }, 1400);
};

G.respawn = () => {
  const S = G.S, p = S.player;
  G.UI.hide();
  p.gold = Math.floor(p.gold * 0.9);
  p.x = 60; p.y = 40; p.hp = p.maxHp; p.mp = p.maxMp; p.iframe = 2; p.dash = null; p.whirl = 0;
  S.dead = false; S.boss = null; S.hazards.length = 0;
  for (const e of S.enemies) if (!e.camp && !e.boss) { e.dead = true; e.silent = true; }
  G.R.cam.x = p.x; G.R.cam.y = p.y;
  G.banner('Kül Köyü', '#ffd8a0');
  G.save();
};

G.victory = () => {
  const S = G.S;
  if (S.over) return;
  S.over = true; S.won = true;
  G.pauseBtn.style.display = 'none';
  try { localStorage.removeItem('karanlik.save'); } catch (e) { /* yoksay */ }
  G.SFX.play('chest');
  G.UI.victory();
};

G.usePot = (kind) => {
  const S = G.S, p = S.player;
  if (S.dead || S.potT > 0) return;
  if (p.pots[kind] <= 0) { G.toast(kind === 'hp' ? 'Can iksirin kalmadı' : 'Mana iksirin kalmadı'); return; }
  p.pots[kind]--; S.potT = 0.8;
  if (kind === 'hp') G.healFx(p, p.maxHp * 0.45, '#ff6a6a');
  else { p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.5); G.addFloat(p.x, p.y - 50, '+MP', '#6aaaff', true); G.SFX.play('heal'); }
};

// ───────────── Giriş: fare ─────────────
G.mouse = { x: 0, y: 0, down: false, seen: false };
G.initMouse = () => {
  const c = document.getElementById('game');
  addEventListener('mousemove', (e) => { G.mouse.x = e.clientX; G.mouse.y = e.clientY; G.mouse.seen = true; });
  c.addEventListener('mousedown', (e) => { if (e.button === 0) G.mouse.down = true; });
  addEventListener('mouseup', () => { G.mouse.down = false; });
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  document.getElementById('hud').addEventListener('pointerdown', (e) => {
    const s = e.target.closest('.slot');
    if (!s || G.mode !== 'play') return;
    if (s.dataset.p) G.usePot(s.dataset.p); else G.useSkill(+s.dataset.i);
  });
};

// ───────────── Güncelleme ─────────────
G.frame = 0;
G.update = (dt) => {
  const S = G.S, p = S.player, R = G.R;
  S.t += dt; S.potT = Math.max(0, S.potT - dt);
  // nişan: fare varsa imleç, yoksa (dokunmatik) baktığı yön
  if (G.mouse.seen && !G.touch.active) {
    G.aim.x = R.ox + R.fxo + G.mouse.x * (R.dpr / R.S);
    G.aim.y = R.oy + R.fyo + G.mouse.y * (R.dpr / R.Sy);
  } else { G.aim.x = p.x + p.dirX * 120; G.aim.y = p.y + p.dirY * 120; }
  if (!S.dead) {
    if (G.mouse.down || G.keys.Space) G.useSkill(0);
    G.updatePlayer(p, dt);
  }
  G.World.update(dt);
  G.Grid.build(S.enemies);
  for (const e of S.enemies) if (!e.dead) G.updateEnemy(e, dt, G.frame);
  let j = 0;
  for (const e of S.enemies) if (!e.dead) S.enemies[j++] = e;
  S.enemies.length = j;
  for (let i = S.fx.length - 1; i >= 0; i--) if (!S.fx[i].update(dt)) S.fx.splice(i, 1);
  G.updateHazards(dt);
  G.updatePickups(dt);
  G.Ground.update(dt);
  G.updateParts(dt);
  G.updateFloats(dt);
  R.updateCam(p.x, p.y - 20, dt);
  R.desat = Math.max(0, R.desat - dt * 1.8);
  const amb = G.World.ambientAt(R.cam.x);
  for (let k = 0; k < 3; k++) R.ambient[k] += (amb[k] - R.ambient[k]) * Math.min(1, dt * 2);
  S.hurtFlash = Math.max(0, S.hurtFlash - dt);
  if (S.banner && (S.banner.t -= dt) <= 0) S.banner = null;
};

// ───────────── Çizim ─────────────
G.drawScene = (t) => {
  const R = G.R, S = G.S;
  // derinlik sıralı çizim listesi: dekor + canlılar (ayak hizasına göre)
  const list = [];
  // dekorun sıralama anahtarı: çiziminin alt kenarı (zemine değdiği yer)
  for (const [id, x, y] of G.World.props(R)) { const s = G.SPR[id]; list.push({ y: y + G.World.base(s), ay: y, prop: s, x }); }
  if (G.mode === 'play') {
    for (const e of S.enemies) list.push({ y: e.y + e.spr.ph / 2, e });
    if (!S.dead) list.push({ y: S.player.y + S.player.spr.ph / 2, pl: S.player });
  }
  for (const d of list) {
    if (d.prop) R.castShadow(d.prop, 0, d.x, d.ay - d.prop.ph / 2, { s: 0.75 });
    else if (d.e) G.drawEnemyShadow(d.e);
    else if (G.Live && G.Live.has(d.pl.cls)) G.liveShadow(d.pl.spr, d.pl.cls, d.pl.x, d.pl.y, false);
    else { const p = d.pl; R.castShadow(p.spr, Math.floor(p.anim), p.x, p.y, { flip: p.facing < 0, s: p.inWater ? 0.3 : 0.8 }); }
  }
  G.World.draw(R, t);
  if (G.mode === 'play') { for (const f of S.fx) if (f.layer === 'ground') f.draw(); G.drawHazards(); G.drawPickups(); }
  list.sort((a, b) => a.y - b.y);
  for (const d of list) {
    if (d.prop) { if (d.prop.ready) R.sprite(d.prop, 0, d.x, d.ay - d.prop.ph / 2, { z: d.y }); }
    else if (d.e) G.drawEnemy(d.e);
    else G.drawPlayer(d.pl);
  }
  G.drawFireflies();
};

G.render = (dt) => {
  const R = G.R, S = G.S;
  const t = performance.now() / 1000;
  if (G.mode !== 'play') {
    R.cam.x = Math.sin(t * 0.05) * 260; R.cam.y = 40 + Math.cos(t * 0.04) * 60; R.cam.sx = R.cam.sy = 0;
    R.ambient = [0.34, 0.34, 0.42];
  }
  R.begin(t);
  G.drawScene(t);
  if (G.Live && G.Live.on) G.Live.render(dt); // canlı 3B → ASCII (etiketlerden önce)
  if (G.mode === 'play') {
    const p = S.player, fl = 0.94 + Math.sin(t * 11) * 0.04 + Math.sin(t * 27) * 0.02;
    if (!S.dead) { R.lightW(p.x, p.y - 10, 260, '#ffa860', 1.05 * fl); R.lightW(p.x, p.y - 10, 100, '#ffd8a0', 0.35 * fl); R.bloomW(p.x, p.y - 20, 140, '#ff8a3a', 0.09 * fl); }
    for (const f of S.fx) if (f.layer !== 'ground') f.draw();
    G.drawParts();
    G.drawFloats();
    G.drawTouch();
    // tüccarın üstünde isim
    if (Math.abs(R.cam.x) < R.VW) R.text('Tüccar Halil', R.toScreenX(G.MERCHANT.x), R.toScreenY(G.MERCHANT.y - 74), '#ffd8a0', 11, 'center', 700, 0.95);
  } else G.drawParts();
  R.flush();
  G.drawHUD(dt);
};

G.loop = (now) => {
  const dt = Math.min(0.05, (now - (G.last || now)) / 1000);
  G.last = now; G.frame++;
  if (dt > 0) G.fps = G.fps ? G.fps * 0.95 + (1 / dt) * 0.05 : 60;
  const S = G.S;
  if (G.mode === 'play' && !S.paused && !G.menuOpen && !S.over) {
    const k = S.slowmo > 0 ? 0.35 : 1;
    S.slowmo -= dt;
    G.update(dt * k);
  } else if (G.mode !== 'play') { G.Ground.update(dt); G.updateParts(dt); }
  G.render(dt);
  if (G.Bake.jobs.length) G.Bake.tick(6); // kalan heykeller arka planda
  requestAnimationFrame(G.loop);
};

// ───────────── Tuşlar ─────────────
G.onKey = (code) => {
  if (G.onMenuKey) {
    // açık bir menü tuşu yuttuysa oyuna iletme (ESC dükkânı kapatıp duraklatma açmasın)
    const inMenu = G.menuOpen === 'shop' || G.mode !== 'play' || G.S.dead;
    G.onMenuKey(code);
    if (inMenu) return;
  }
  if (code === 'Escape') G.togglePause();
  if (code === 'KeyM') { G.SFX.set(undefined, !G.SFX.muted); if (G.menuOpen === 'pause' && G.UI.syncVol) G.UI.syncVol(); }
  if (G.mode !== 'play' || G.S.paused || G.S.dead) return;
  const m = code.match(/^Digit([1-3])$/);
  if (m) G.useSkill(+m[1]);
  if (code === 'KeyQ') G.usePot('hp');
  if (code === 'KeyE') G.usePot('mp');
  if (code === 'KeyF' && G.nearMerchant()) G.UI.shop();
  if (!G.DEBUG) return;
  const S = G.S, p = S.player;
  if (code === 'KeyL') G.gainXP(G.xpFor(p.lv) - p.xp);
  if (code === 'KeyG') p.gold += 1000;
  if (code === 'KeyH') { p.hp = p.maxHp = 99999; }
  if (code === 'KeyK') { const b = G.World.bosses.find((q) => !q.dead); if (b) { p.x = b.x - 500; p.y = b.y; G.R.cam.x = p.x; G.R.cam.y = p.y; for (const g of G.World.gates) if (g.x < p.x) g.open = true; } }
};

// ───────────── Açılış ─────────────
G.boot = async () => {
  try {
    await Promise.race([document.fonts.load('700 16px "JetBrains Mono"'), new Promise((r) => setTimeout(r, 2500))]);
  } catch (e) { /* yedek font kullanılır */ }
  G.R.init();
  G.Bake.all();
  if (G.bakeModels) {
    const L = document.getElementById('loading');
    await G.bakeModels((i, n) => { if (L) L.textContent = `karakterler hazırlanıyor... ${i}/${n}`; });
    // videodaki gibi: oyuncu + yaratıklar canlı 3B (koyu, pikselli); zemin/dekor/bosslar ASCII
    try { G.Live.init(); } catch (e) { console.warn('canlı 3B kapalı', e); }
  }
  G.UI.init();
  G.initMouse();
  const b = document.createElement('button');
  b.className = 'btn'; b.textContent = '[ || ]'; b.id = 'pause';
  b.style.display = 'none';
  b.addEventListener('click', () => G.togglePause());
  document.body.appendChild(b);
  G.pauseBtn = b;
  document.getElementById('loading')?.remove();
  G.toMenu();
  requestAnimationFrame(G.loop);
};
addEventListener('load', G.boot);
