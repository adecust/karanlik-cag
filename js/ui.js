'use strict';
// Menüler + HUD: siyah zeminli, ince çerçeveli terminal panelleri (DOM)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// "big" figlet harfleri
G.FIG = {
  K: [' _  __', '| |/ /', "| ' / ", '|  <  ', '| . \\ ', '|_|\\_\\'],
  A: ['          ', '    /\\    ', '   /  \\   ', '  / /\\ \\  ', ' / ____ \\ ', '/_/    \\_\\'],
  R: [' _____  ', '|  __ \\ ', '| |__) |', '|  _  / ', '| | \\ \\ ', '|_|  \\_\\'],
  N: [' _   _ ', '| \\ | |', '|  \\| |', '| . ` |', '| |\\  |', '|_| \\_|'],
  L: [' _      ', '| |     ', '| |     ', '| |     ', '| |____ ', '|______|'],
  I: [' _____ ', '|_   _|', '  | |  ', '  | |  ', ' _| |_ ', '|_____|'],
};
G.LOGO = [0, 1, 2, 3, 4, 5].map((r) => [...'KARANLIK'].map((c) => G.FIG[c][r]).join(' ')).join('\n');

G.ART = {
  skull: String.raw`
     _____
    /     \
   | () () |
    \  ^  /
     |||||
     |||||`,
  portal: String.raw`
      .-~~~-.
    .'  . *  '.
   /  *  .-.  *\
  |  .  ( @ ) . |
   \  *  '-'  */
    '.  * .  .'
      '-~~~-'`,
};

G.UI = {
  root: null, timers: [], toasts: [],
  init() {
    this.root = document.getElementById('ui');
    this.hud = document.getElementById('hud');
    this.hud.innerHTML = `
      <div class="panel" id="h-me">
        <div class="pn"><span id="h-name"></span> <span class="dim" id="h-lv"></span></div>
        <div class="row">HP <span class="bar hp"><b id="h-hp"></b><i id="h-hp2"></i></span> <span id="h-hpt"></span></div>
        <div class="row">MP <span class="bar mp"><b id="h-mp"></b><i id="h-mp2"></i></span> <span id="h-mpt"></span></div>
        <div class="row">XP <span class="bar xp"><b id="h-xp"></b><i id="h-xp2"></i></span> <span id="h-xpt"></span></div>
        <div class="row dim" id="h-stat"></div>
      </div>
      <div class="panel" id="h-quest"><div class="pn">görev</div><div id="h-qtext"></div></div>
      <div class="panel" id="h-map"><div class="pn" id="h-zone"></div><pre id="h-mini"></pre></div>
      <div id="h-boss"><div id="h-bname"></div><div class="bbar"><div id="h-bfill"></div></div></div>
      <div id="h-fps"></div>
      <div id="h-banner"></div>
      <div id="h-toast"></div>
      <div id="h-hint"></div>
      <div id="h-bar"></div>
      <div id="h-flash"></div>`;
    this.el = {};
    this.hud.querySelectorAll('[id]').forEach((e) => { this.el[e.id.slice(2)] = e; });
  },
  show(html) {
    this.clearTimers();
    this.root.innerHTML = `<div class="ov">${html}</div>`;
    return this.root.firstChild;
  },
  hide() { this.clearTimers(); this.root.innerHTML = ''; G.onMenuKey = null; G.menuOpen = null; },
  clearTimers() { this.timers.forEach((t) => { clearInterval(t); clearTimeout(t); }); this.timers = []; },

  // ───────────── Başlangıç ─────────────
  title() {
    const sv = G.loadSave();
    const cards = Object.entries(G.CLASSES).map(([id, c], i) => `<div class="card${i === 0 ? ' sel' : ''}" data-id="${id}">
        <div class="ct">${c.name}</div>
        <pre class="art" data-spr="${c.body}">${G.spriteHTML(G.SPR[c.body])}</pre>
        <p>${c.desc}</p>
        <p class="dim">${c.skills.map((s) => G.SKILLS[s].name).join(' · ')}</p></div>`).join('');
    const el = this.show(`
      <pre class="logo">${esc(G.LOGO)}</pre>
      <div class="sub">-=[ Ç A Ğ ]=-</div>
      ${sv ? `<button class="btn big" id="cont">[ DEVAM ET — ${G.CLASSES[sv.cls].name} Sv ${sv.lv} ]</button><div class="hint">ya da yeni bir kahraman seç:</div>` : '<div class="hint">kahramanını seç</div>'}
      <div class="chars">${cards}</div>
      <button class="btn" id="go">[ YENİ OYUN ]</button>
      <div class="hint">WASD hareket · fare nişan · sol tık / BOŞLUK saldırı · 1 2 3 yetenek · Q E iksir · F konuş · ESC menü</div>`);
    let sel = 'knight';
    el.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => {
      el.querySelectorAll('.card').forEach((o) => o.classList.remove('sel'));
      c.classList.add('sel'); sel = c.dataset.id;
    }));
    el.querySelector('#go').addEventListener('click', () => G.startGame(sel, null));
    if (sv) el.querySelector('#cont').addEventListener('click', () => G.startGame(sv.cls, sv));
    let f = 0;
    this.timers.push(setInterval(() => {
      f++;
      el.querySelectorAll('.art').forEach((a) => { const s = G.SPR[a.dataset.spr]; a.innerHTML = G.spriteHTML(s, f % s.frames.length); });
    }, 130));
    G.onMenuKey = (code) => { if (code === 'Enter') sv ? G.startGame(sv.cls, sv) : G.startGame(sel, null); };
  },

  // ───────────── Tüccar ─────────────
  shop() {
    const p = G.S.player;
    G.menuOpen = 'shop';
    const render = () => {
      const rows = G.SHOP.map((it, i) => {
        const maxed = it.max && it.max(p), price = it.price(p), can = !maxed && p.gold >= price;
        const lvl = it.id === 'wup' ? ` (+${p.wup})` : it.id === 'aup' ? ` (+${p.aup})` : it.id === 'hp' ? ` (${p.pots.hp})` : ` (${p.pots.mp})`;
        return `<div class="card choice${can ? '' : ' off'}" data-i="${i}"><div class="ic" style="color:${it.color}">${esc(it.icon)}</div>
          <div><div><span class="key">${i + 1}</span> <span class="nm">${it.name}</span><span class="dim">${lvl}</span></div><p>${it.desc}</p></div>
          <div class="price">${maxed ? 'EN ÜST' : price + '$'}</div></div>`;
      }).join('');
      el.querySelector('#shopl').innerHTML = rows;
      el.querySelector('#gold').textContent = p.gold + '$';
      el.querySelectorAll('.choice').forEach((c) => c.addEventListener('click', () => buy(+c.dataset.i)));
    };
    const buy = (i) => {
      const it = G.SHOP[i];
      if (!it || (it.max && it.max(p))) return;
      const price = it.price(p);
      if (p.gold < price) { G.toast('Altın yetersiz'); return; }
      p.gold -= price;
      if (it.id === 'hp' || it.id === 'mp') p.pots[it.id]++;
      else { p[it.id]++; G.recalc(p); G.toast(`${it.name} +${p[it.id]}`); }
      G.SFX.play('gem'); G.save(); render();
    };
    const el = this.show(`<div class="panel big"><div class="pn">Gezgin Tüccar Halil <span class="dim">— "Karanlıkta parlayan her şey satılık, yolcu."</span></div>
      <div class="choices" id="shopl"></div>
      <div class="btns"><span class="dim">altının: <b id="gold" style="color:#ffd84a"></b></span><button class="btn" id="close">[ KAPAT · F ]</button></div></div>`);
    el.querySelector('#close').addEventListener('click', () => this.hide());
    G.onMenuKey = (code) => {
      const m = code.match(/^(Digit|Numpad)([1-4])$/);
      if (m) buy(+m[2] - 1);
      if (code === 'KeyF' || code === 'Escape') this.hide();
    };
    render();
  },

  pause() {
    G.menuOpen = 'pause';
    const p = G.S.player, c = G.CLASSES[p.cls];
    const sk = c.skills.map((id, i) => { const s = G.SKILLS[id]; return `<span style="color:${s.color}">${['SOL TIK', '1', '2', '3'][i].padEnd(8)}${s.name.padEnd(17)}</span><span class="dim">${p.lv >= s.lv ? s.mp + ' mp · ' + s.cd + ' sn' : 'Sv ' + s.lv + ' gerekli'}</span>`; }).join('\n');
    const el = this.show(`<div class="panel big"><div class="pn">DURAKLATILDI — ${c.name} Sv ${p.lv}</div>
      <pre class="stats">saldırı ${Math.round(p.atk)}   zırh ${Math.round(p.armor)}   silah +${p.wup}   zırh +${p.aup}\n\n${sk}</pre>
      <div class="vol"><span>SES</span><input type="range" id="vol" min="0" max="100" step="5" value="${Math.round(G.SFX.level * 100)}"><b id="volv"></b>
        <button class="btn" id="mute"></button></div>
      <div class="btns"><button class="btn" id="res">[ DEVAM ]</button><button class="btn" id="menu">[ KAYDET & ÇIK ]</button></div></div>`);
    el.querySelector('#res').addEventListener('click', () => G.togglePause());
    el.querySelector('#menu').addEventListener('click', () => { G.save(); G.toMenu(); });
    // ses ayarı: kaydırıcı + sessiz düğmesi (M tuşu da sessize alır)
    const vol = el.querySelector('#vol'), volv = el.querySelector('#volv'), mute = el.querySelector('#mute');
    const sync = () => { volv.textContent = vol.value.padStart(3) + '%'; mute.textContent = G.SFX.muted ? '[ SESİ AÇ · M ]' : '[ SESSİZ · M ]'; el.querySelector('.vol').classList.toggle('off', G.SFX.muted); };
    vol.addEventListener('input', () => { G.SFX.set(vol.value / 100, false); sync(); });
    vol.addEventListener('change', () => G.SFX.play('gem'));
    mute.addEventListener('click', () => { G.SFX.set(undefined, !G.SFX.muted); sync(); });
    this.syncVol = sync;
    sync();
  },

  death() {
    const el = this.show(`<pre class="chest dead">${esc(G.ART.skull)}</pre>
      <div class="title blood">KARANLIK SENİ YUTTU</div>
      <div class="hint">ruhun Kül Köyü'nün ateşine geri dönüyor. altınının onda biri karanlıkta kaldı.</div>
      <button class="btn" id="rev">[ KÖYDE UYAN ]</button>`);
    el.querySelector('#rev').addEventListener('click', () => G.respawn());
    G.onMenuKey = (code) => { if (code === 'Enter' || code === 'Space') G.respawn(); };
  },

  victory() {
    const S = G.S, p = S.player;
    const el = this.show(`<pre class="chest open" style="color:#d0a0ff;text-shadow:0 0 16px #9a5aff">${esc(G.ART.portal)}</pre>
      <div class="title">PORTALDAN GEÇTİN</div>
      <div class="hint">karanlık çağ sona erdi. ${G.CLASSES[p.cls].name} adın şafakta anılacak.</div>
      <div class="panel big"><pre class="stats">seviye   ${p.lv}
leş      ${S.kills}
altın    ${p.gold}
süre     ${G.fmtTime(S.t)}</pre>
      <div class="btns"><button class="btn" id="menu">[ ANA MENÜ ]</button></div></div>`);
    el.querySelector('#menu').addEventListener('click', () => G.toMenu());
  },
};

// ───────────── Kayıt ─────────────
G.loadSave = () => { try { return JSON.parse(localStorage.getItem('karanlik.save')); } catch (e) { return null; } };
G.save = () => {
  const S = G.S;
  if (!S || !S.player || G.mode !== 'play') return;
  const p = S.player, W = G.World;
  const bosses = {};
  W.bosses.forEach((b) => { bosses[b.zi] = b.dead; });
  const data = { cls: p.cls, lv: p.lv, xp: p.xp, gold: p.gold, wup: p.wup, aup: p.aup, pots: p.pots, x: S.dead ? 60 : p.x, y: S.dead ? 40 : p.y, bosses, won: !!S.won };
  try { localStorage.setItem('karanlik.save', JSON.stringify(data)); } catch (e) { /* depolama kapalı */ }
};

G.banner = (txt, col) => { G.S.banner = { txt, col, t: 3 }; };
G.toast = (msg) => {
  const U = G.UI;
  U.toasts.push({ msg, t: 2.5 });
  if (U.toasts.length > 4) U.toasts.shift();
};

// ───────────── HUD ─────────────
const bar = (k, n) => { const f = Math.max(0, Math.min(n, Math.round(k * n))); return ['|'.repeat(f), '|'.repeat(n - f)]; };
G.hudFrame = 0;
G.QUESTS = [
  (p) => p.lv < 2 && !G.World.bosses[0].dead ?'Köyden doğuya, Kara Orman\'a git. Kurtları avla, güçlen.' : null,
  () => !G.World.bosses[0].dead ? 'Kara Orman\'ın sonunda geçidi Kara Şövalye tutuyor. Onu yen. (öneri: Sv 5)' : null,
  () => !G.World.bosses[1].dead ? 'Lanetli Mezarlık\'tan geç, Bataklık Cadısı\'nı öldür. (öneri: Sv 8)' : null,
  () => !G.World.bosses[2].dead ? 'Ejder Kayalıkları\'nda Kızıl Ejder\'i devir. (öneri: Sv 11)' : null,
  () => !G.World.bosses[3].dead ? 'Ölüm Kapısı açık. Azrail seni bekliyor. (öneri: Sv 14)' : null,
  () => 'Portal açıldı. İçinden geç ve bu karanlıktan çık.',
];
G.MINI = { town: ['.', '#c8a878'], forest: ['"', '#4a9a4a'], grave: ['+', '#9a9a8a'], ember: ['^', '#d8602a'], abyss: ['%', '#8a5ac8'] };
G.drawHUD = (dt) => {
  const U = G.UI, e = U.el, S = G.S;
  const on = G.mode === 'play' && !S.over;
  U.hud.style.display = on ? 'block' : 'none';
  if (!on) return;
  const p = S.player, c = G.CLASSES[p.cls];
  G.hudFrame++;
  let b2 = bar(p.hp / p.maxHp, 18); e.hp.textContent = b2[0]; e.hp2.textContent = b2[1]; e.hpt.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
  b2 = bar(p.mp / p.maxMp, 18); e.mp.textContent = b2[0]; e.mp2.textContent = b2[1]; e.mpt.textContent = `${Math.floor(p.mp)}/${p.maxMp}`;
  const need = G.xpFor(p.lv);
  b2 = bar(p.lv >= G.MAX_LV ? 1 : p.xp / need, 18); e.xp.textContent = b2[0]; e.xp2.textContent = b2[1];
  e.xpt.textContent = p.lv >= G.MAX_LV ? 'MAX' : `${Math.round((p.xp / need) * 100)}%`;
  // yetenek çubuğu
  const keys = ['TIK', '1', '2', '3'];
  let html = c.skills.map((id, i) => {
    const s = G.SKILLS[id], lock = p.lv < s.lv, cdk = s.cd ? p.cd[i] / s.cd : 0, nomp = p.mp < s.mp;
    return `<div class="slot${lock ? ' lock' : ''}${nomp && !lock ? ' nomp' : ''}" data-i="${i}"><div class="cd" style="height:${cdk * 100}%"></div>
      <div class="sk" style="color:${s.color}">${esc(s.icon)}</div><div class="kl">${keys[i]}</div>${lock ? `<div class="lv">Sv${s.lv}</div>` : ''}</div>`;
  }).join('');
  html += `<div class="slot pot" data-p="hp"><div class="sk" style="color:#ff4a4a">!</div><div class="kl">Q</div><div class="lv">${p.pots.hp}</div></div>`;
  html += `<div class="slot pot" data-p="mp"><div class="sk" style="color:#4a9aff">!</div><div class="kl">E</div><div class="lv">${p.pots.mp}</div></div>`;
  if (e.bar.dataset.h !== html) { e.bar.innerHTML = html; e.bar.dataset.h = html; }
  if (G.hudFrame % 10 === 0) {
    e.name.textContent = c.name; e.lv.textContent = 'Sv ' + p.lv;
    e.stat.textContent = `${p.gold}$ · silah +${p.wup} · zırh +${p.aup}`;
    e.qtext.textContent = G.QUESTS.map((q) => q(p)).find((x) => x) || '';
    // mini harita
    const W = G.WORLD, N = 46, row = [];
    for (let i = 0; i < N; i++) {
      const x = W.x0 + ((i + 0.5) / N) * (W.x1 - W.x0), z = G.ZONES[G.World.zoneIdx(x)].id, [ch, col] = G.MINI[z];
      row.push(`<span style="color:${col}">${ch}</span>`);
    }
    const at = (x) => Math.max(0, Math.min(N - 1, Math.floor(((x - W.x0) / (W.x1 - W.x0)) * N)));
    for (const g of G.World.gates) row[at(g.x)] = `<span style="color:${g.open ? '#8a8a8a' : '#e8e2d0'}">${g.open ? ':' : '#'}</span>`;
    for (const bb of G.World.bosses) row[at(bb.x)] = `<span style="color:${bb.dead ? '#5a5a5a' : '#ff4a3a'}">${bb.dead ? 'x' : 'B'}</span>`;
    if (G.World.portal.open) row[at(G.World.portal.x)] = '<span style="color:#d0a0ff">O</span>';
    row[at(p.x)] = '<span style="color:#fff;font-weight:800">@</span>';
    e.mini.innerHTML = row.join('');
    e.zone.textContent = G.ZONES[G.World.zoneIdx(p.x)].name;
    e.fps.textContent = `FPS ${Math.round(G.fps || 0)} · frame ${(1000 / Math.max(1, G.fps || 60)).toFixed(1)} ms`;
  }
  const b = S.boss;
  e.boss.style.display = b && !b.dead ? 'block' : 'none';
  if (b && !b.dead) {
    e.bname.textContent = `${b.d.name}  Sv ${b.lv}${b.phase2 ? '  — faz 2' : ''}`;
    e.bfill.style.width = Math.max(0, (b.hp / b.maxHp) * 100) + '%';
  }
  if (S.banner) {
    const a = Math.max(0, Math.min(1, S.banner.t, (3 - S.banner.t) * 4));
    e.banner.textContent = S.banner.txt; e.banner.style.color = S.banner.col; e.banner.style.opacity = a;
  } else e.banner.style.opacity = 0;
  U.toasts.forEach((q) => { q.t -= dt; });
  U.toasts = U.toasts.filter((q) => q.t > 0);
  const th = U.toasts.map((q) => `<div style="opacity:${Math.min(1, q.t * 2)}">${esc(q.msg)}</div>`).join('');
  if (e.toast.dataset.h !== th) { e.toast.innerHTML = th; e.toast.dataset.h = th; }
  e.hint.textContent = G.nearMerchant() && !G.menuOpen ? '[F] Tüccar Halil ile konuş' : '';
  e.flash.style.background = `rgba(200,20,30,${S.hurtFlash * 0.45})`;
};

// dokunmatik joystick — ızgaraya çizilir
G.drawTouch = () => {
  if (!G.touch.active) return;
  const R = G.R, k = R.dpr / R.S;
  const ox = G.touch.ox * k, oy = G.touch.oy * k;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; R.g('.', ox + Math.cos(a) * 44, oy + Math.sin(a) * 26, '#e8c27a', 0.7, '#e8c27a', 0); }
  const dx = G.touch.x * k - ox, dy = G.touch.y * k - oy, l = Math.min(44, Math.hypot(dx, dy)), an = Math.atan2(dy, dx);
  R.g('@', ox + Math.cos(an) * l, oy + Math.sin(an) * l * 0.6, '#ffd84a', 1, '#ffd84a', 4);
};
