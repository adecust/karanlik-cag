'use strict';
// ════════════════════════════════════════════════════════════
//  ASCII SANAT — sadece klasik ASCII karakterler.
//  Tüm sprite'lar sağa bakar, sola giderken aynalanır.
//  l: satırlar, c: renk maskesi (pal anahtarları), cmap: karakter→renk
// ════════════════════════════════════════════════════════════
const A = (s) => s.replace(/^\n/, '').split('\n');

G.SPR = {
  // ───────────── KAHRAMANLAR ─────────────
  knight: {
    fps: 7,
    pal: { s: '#c9d1de', d: '#5a6278', r: '#ff4a4a', w: '#ece5d2', l: '#8b7a62' },
    frames: [
      { l: A(String.raw `
  ,^,
  [#]
 /|+|\
  |_|
  / \ `), c: A( `
  rrr
  sds
 swrws
  sss
  l l `) },
      { l: A(String.raw `
  ,^,
  [#]
 /|+|\
  |_|
  | | `), c: A( `
  rrr
  sds
 swrws
  sss
  l l `) },
    ],
  },
  barbarian: {
    fps: 7,
    pal: { h: '#f2ead2', b: '#d08a40', k: '#f0bf90', y: '#ff8a2e', f: '#8a5c34', l: '#6a5238' },
    frames: [
      { l: A(String.raw `
 \_^_/
  (#)
 /###\
  |_|
  / \ `), c: A( `
 hbbbh
  kyk
 kfffk
  fff
  l l `) },
      { l: A(String.raw `
 \_^_/
  (#)
 /###\
  |_|
  | | `), c: A( `
 hbbbh
  kyk
 kfffk
  fff
  l l `) },
    ],
  },
  monk: {
    fps: 6,
    pal: { h: '#b08a5e', k: '#ffd8b0', g: '#ffd84a' },
    frames: [
      { l: A(String.raw `
   _
  /o\
 /|+|\
 | | |
 /___\ `), c: A( `
   h
  hkh
 hhghh
 hhhhh
 hhhhh `) },
      { l: A(String.raw `
   _
  /o\
 /|+|\
 | | |
 /_|_\ `), c: A( `
   h
  hkh
 hhghh
 hhhhh
 hhhhh `) },
    ],
  },

  // ───────────── YARATIKLAR ─────────────
  bat: {
    fps: 10, color: '#a888e0', cmap: { o: '#ff3b5c' },
    frames: [{ l: [String.raw `/\(o)/\ `] }, { l: [String.raw `\/(o)\/ `] }],
  },
  zombie: {
    fps: 4,
    pal: { g: '#8fd06a', c: '#7a6a4e', d: '#5a4e3c' },
    frames: [
      { l: A(String.raw `
  @
 /#==
  #
 / \ `), c: A( `
  g
 gcgg
  c
 d d `) },
      { l: A(String.raw `
  @
 /#==
  #
  |\ `), c: A( `
  g
 gcgg
  c
  dd `) },
    ],
  },
  skeleton: {
    fps: 6, color: '#ece6d4', cmap: { o: '#ff4a3a' },
    frames: [
      { l: A(String.raw `
 (oo)
 -||-
  ||
  /\ `) },
      { l: A(String.raw `
 (oo)
 -||-
  ||
  || `) },
    ],
  },
  wolf: {
    fps: 9,
    pal: { g: '#a0a6b0', h: '#c8ced8', t: '#7c818a', e: '#ff4040', d: '#6c7078' },
    frames: [
      { l: A(String.raw `
      /^
 ~====-o>
  /\  /\ `), c: A( `
      gg
 tggggheh
  dd  dd `) },
      { l: A(String.raw `
      /^
 ~====-o>
  \/  \/ `), c: A( `
      gg
 tggggheh
  dd  dd `) },
    ],
  },
  ghost: {
    fps: 5, color: '#c4dcff', cmap: { o: '#7ffcff' },
    frames: [
      { l: A(String.raw `
 .-.
(o o)
|   |
'v'v' `) },
      { l: A(String.raw `
 .-.
(o o)
|   |
v'v'v `) },
    ],
  },
  spider: {
    fps: 8,
    pal: { l: '#8a6a8e', b: '#5e4466', e: '#ff3030' },
    frames: [
      { l: A(String.raw `
\\ _ //
 =(oo)=
// ^ \\ `), c: A( `
ll b ll
 lbeebl
ll b ll `) },
      { l: A(String.raw `
// _ \\
 =(oo)=
\\ ^ // `), c: A( `
ll b ll
 lbeebl
ll b ll `) },
    ],
  },
  troll: {
    fps: 4,
    pal: { g: '#6fa052', G: '#8fc272', e: '#ffd23a', w: '#f0ead8', b: '#6a5234' },
    frames: [
      { l: A(String.raw `
  .---.
  (o.o)
 /|vvv|\
/_|###|_\
  /   \ `), c: A( `
  ggggg
  gegeg
 gGwwwGg
 ggbbbgg
  g   g `) },
      { l: A(String.raw `
  .---.
  (o.o)
 /|vvv|\
/_|###|_\
  |   | `), c: A( `
  ggggg
  gegeg
 gGwwwGg
 ggbbbgg
  g   g `) },
    ],
  },

  // ───────────── BOSSLAR ─────────────
  blackknight: {
    fps: 5, color: '#6a6a8c',
    cmap: { o: '#ff2a2a', '+': '#ff3030', '^': '#ff3030', '=': '#9a9ac0', '#': '#4a4a66', ']': '#7a2020', '[': '#7a2020' },
    frames: [
      { l: A(String.raw `
     ,^.
    /===\
   |[o-o]|
  _/|###|\_
 / ||#+#|| \
|  ||###||  |
   /_| |_\
   |_| |_|
  /__] [__\ `) },
      { l: A(String.raw `
     ,^.
    /===\
   |[o-o]|
  _/|###|\_
 / ||#+#|| \
|  ||###||  |
   /_| |_\
  |_|   |_|
 /__]   [__\ `) },
    ],
  },
  witch: {
    fps: 3, color: '#9a5ad8',
    cmap: { '*': '#ffe24a', o: '#fff23a', '(': '#9fe07a', ')': '#9fe07a', '^': '#9fe07a', '~': '#6a3aa0', "'": '#4a2a70' },
    frames: [
      { l: A(String.raw `
      /\
     /  \
    / *  \
 __/______\__
   ( o  o )
    \ /\ /
   /|~~~~|\
  / |~~~~| \
 /__|____|__\
    ''  '' `) },
      { l: A(String.raw `
      /\
     /  \
    /  * \
 __/______\__
   ( o  o )
    \ /\ /
   /|~~~~|\
  / |~~~~| \
 /__|____|__\
     '  ' `) },
    ],
  },
  dragon: {
    fps: 3, color: '#a8302a',
    cmap: { '#': '#d84a32', '%': '#ff9a3a', o: '#ffe23a', '>': '#ffffff', '~': '#7a1f1a' },
    frames: [
      { l: A(String.raw `
              __
           __/ /\            ___
        __/   / / \        _/ o \__
      _/  /\ /   /  \     /  ____\>
     /  _/  \   /    \___/  /
    /__/ ___\/__________   /
  ~~~__/###################\
 ~~ ___/#%%%%%%%%%%%%%%%%###|
   /    \__/####/ \####/ \_/
            |_|_|    |_|_|
            /_/_/    /_/_/ `) },
      { l: A(String.raw `

           __                ___
        __/ \__            _/ o \__
      _/  /\   \__        /  ____\>
     /  _/  \     \______/  /
    /__/ ___\/__________   /
 ~~~~__/###################\
  ~ ___/#%%%%%%%%%%%%%%%%###|
   /    \__/####/ \####/ \_/
           |_|_|      |_|_|
           /_/_/      /_/_/ `) },
    ],
  },
  reaper: {
    fps: 4, color: '#6a5a8c',
    cmap: { o: '#ff2a4a', ',': '#dfe6f0', '`': '#dfe6f0', '=': '#dfe6f0', '#': '#3e3456', '!': '#8a6a42' },
    frames: [
      { l: A(String.raw `
   .---.    ,=======
  / .-. \    ` + '`' + String.raw `-.    !
 | (o o) |      ` + '`' + String.raw `.  !
 |  \^/  |        \ !
 /` + '`' + String.raw `-----'\         \!
/ /#####\ \         !
|/#######\|         !
 |#######|          !
 |#######|          !
 '-'-'-'-'          ! `) },
      { l: A(String.raw `
   .---.    ,=======
  / .-. \    ` + '`' + String.raw `-.    !
 | (o o) |      ` + '`' + String.raw `.  !
 |  \^/  |        \ !
 /` + '`' + String.raw `-----'\         \!
/ /#####\ \         !
|/#######\|         !
 |#######|          !
 |#######|          !
  '-'-'-'-'         ! `) },
    ],
  },

  // ───────────── NESNELER ─────────────
  chest: {
    fps: 1, color: '#a8743a', cmap: { $: '#ffd84a' },
    frames: [{ l: A(String.raw `
 ____
|_$$_|
|____| `) }],
  },
  brazier: {
    fps: 8, color: '#8a8a94', cmap: { ')': '#ff8a2a', '(': '#ffb040', '^': '#ffe26a' },
    frames: [
      { l: A(String.raw `
  )
 (^)
\___/
  |
 /_\ `) },
      { l: A(String.raw `
  (
 )^(
\___/
  |
 /_\ `) },
    ],
  },

  // ───────────── ARKA PLAN DEKORU ─────────────
  pine: {
    fps: 1, color: '#2a6a3a', cmap: { '|': '#6a4a2e', _: '#6a4a2e' },
    frames: [{ l: A(String.raw `
   ^
  /^\
 /^^^\
/^^^^^\
  |_| `) }],
  },
  deadtree: { fps: 1, color: '#6a543c', frames: [{ l: A(String.raw `
\ | /
 \|/
  |
 _|_ `) }] },
  grave: { fps: 1, color: '#7a7e90', cmap: { '+': '#a8acbc' }, frames: [{ l: A(String.raw `
 ___
/   \
| + |
|___| `) }] },
  cross: { fps: 1, color: '#7a6248', frames: [{ l: A(String.raw `
 |
-+-
 |
 | `) }] },
  pillar: { fps: 1, color: '#6a6a78', frames: [{ l: A(String.raw `
[===]
 | |
 | |
[===] `) }] },
  bones: { fps: 1, color: '#8a8678', frames: [{ l: ['o==o'] }] },
};

// Kahraman seçme ekranı için HTML önizleme
G.spriteHTML = (spr, frame = 0) => {
  const esc = (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c);
  const f = spr.frames[frame];
  const mrows = f.c || spr.frames[0].c;
  return f.l.map((line, r) => {
    const mask = mrows ? mrows[r] || '' : '';
    return [...line].map((ch, c) => {
      if (ch === ' ') return ' ';
      const mk = mask[c];
      const col = (mk && mk !== ' ' && spr.pal && spr.pal[mk]) || (spr.cmap && spr.cmap[ch]) || spr.color || '#ddd';
      return `<span style="color:${col}">${esc(ch)}</span>`;
    }).join('');
  }).join('\n');
};
