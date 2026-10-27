'use strict';
// ════════════════ OYUN VERİSİ — denge ayarları burada ════════════════

// Sınıflar: taban değerler + seviye başına artış. skills[0] temel saldırı (Boşluk / sol tık)
G.CLASSES = {
  knight: {
    name: 'Şövalye', body: 'knight', desc: 'Ağır zırh, dengeli hasar. Kalkanıyla düşmanı ezer.',
    base: { hp: 150, mp: 60, atk: 15, armor: 6, speed: 1 }, per: { hp: 24, mp: 6, atk: 3.2, armor: 1 },
    skills: ['k_slash', 'k_charge', 'k_storm', 'k_oath'],
  },
  barbarian: {
    name: 'Barbar', body: 'barbarian', desc: 'Çok can, en sert vuruş. Baltası düşmanı ikiye böler.',
    base: { hp: 180, mp: 45, atk: 18, armor: 2, speed: 0.96 }, per: { hp: 30, mp: 4, atk: 3.8, armor: 0.5 },
    skills: ['b_chop', 'b_axes', 'b_roar', 'b_whirl'],
  },
  monk: {
    name: 'Keşiş', body: 'monk', desc: 'Kutsal büyüler, şifa. Ölülere karşı ölümcül.',
    base: { hp: 115, mp: 100, atk: 13, armor: 2, speed: 1.05 }, per: { hp: 17, mp: 11, atk: 3, armor: 0.5 },
    skills: ['m_staff', 'm_holy', 'm_heal', 'm_purge'],
  },
};

// Yetenekler — davranışları skills.js'te (G.CAST)
G.SKILLS = {
  k_slash: { name: 'Kılıç Darbesi', icon: 'o-|==>', color: '#dfe6f0', mp: 0, cd: 0.5, lv: 1, desc: 'Önündeki yaya geniş bir kesik.' },
  k_charge: { name: 'Kalkan Hücumu', icon: '[+]>>', color: '#9ab8ff', mp: 14, cd: 5, lv: 2, desc: 'İleri atılır, yoldakileri savurur.' },
  k_storm: { name: 'Kılıç Fırtınası', icon: '-*|*-', color: '#ffd84a', mp: 26, cd: 7, lv: 4, desc: 'Etrafında üç tam tur keser.' },
  k_oath: { name: 'Kutsal Yemin', icon: '(+)', color: '#fff2a8', mp: 30, cd: 18, lv: 6, desc: 'Canın %35 dolar, 6 sn zırh kalkanı.' },
  b_chop: { name: 'Balta Savuruşu', icon: '--=[D', color: '#e0a85e', mp: 0, cd: 0.65, lv: 1, desc: 'Ağır ve geniş bir balta darbesi.' },
  b_axes: { name: 'Balta Fırlat', icon: '=[D=[D', color: '#ffb84a', mp: 12, cd: 3, lv: 2, desc: 'Üç balta yelpaze gibi uçar.' },
  b_roar: { name: 'Savaş Çığlığı', icon: '\\O/', color: '#ff7a4a', mp: 20, cd: 10, lv: 4, desc: 'Çevreyi sersemletir, 6 sn +%40 hasar.' },
  b_whirl: { name: 'Kasırga', icon: '@@@', color: '#ff5a3a', mp: 34, cd: 13, lv: 6, desc: '2.5 sn boyunca dönerek keser.' },
  m_staff: { name: 'Kutsal Asa', icon: '--->', color: '#e8c27a', mp: 0, cd: 0.45, lv: 1, desc: 'Asayla delici bir hamle.' },
  m_holy: { name: 'Kutsal Su', icon: '[&]', color: '#7fd8ff', mp: 12, cd: 2.5, lv: 2, desc: 'İmlecin olduğu yere kutsal alev.' },
  m_heal: { name: 'Şifa', icon: '<+>', color: '#7fe07f', mp: 24, cd: 9, lv: 4, desc: 'Canının %40ını iyileştirir.' },
  m_purge: { name: 'Arınma', icon: '(*)', color: '#fff0c0', mp: 36, cd: 12, lv: 6, desc: 'Ak alev patlaması. Ölülere 2 kat.' },
};

// Canavarlar: değerler seviye 1 içindir, seviyeyle büyür
// ai: chase | flutter | lunge | drift
G.MONSTERS = {
  bat: { name: 'Yarasa', body: 'bat', hp: 40, dmg: 7, xp: 10, spd: 105, ai: 'flutter', kb: 1.2 },
  wolf: { name: 'Kurt', body: 'wolf', hp: 70, dmg: 10, xp: 16, spd: 120, ai: 'lunge', kb: 0.9 },
  spider: { name: 'Dev Örümcek', body: 'spider', hp: 85, dmg: 12, xp: 20, spd: 95, ai: 'lunge', kb: 0.8 },
  zombie: { name: 'Zombi', body: 'zombie', hp: 120, dmg: 13, xp: 22, spd: 48, ai: 'chase', undead: true, kb: 0.9 },
  skeleton: { name: 'İskelet', body: 'skeleton', hp: 95, dmg: 14, xp: 24, spd: 70, ai: 'chase', undead: true, kb: 1 },
  ghost: { name: 'Hayalet', body: 'ghost', hp: 80, dmg: 13, xp: 26, spd: 75, ai: 'drift', undead: true, ghost: true, kb: 0.6 },
  troll: { name: 'Trol', body: 'troll', hp: 320, dmg: 24, xp: 60, spd: 52, ai: 'chase', kb: 0.25 },
};
G.monsterStats = (d, lv) => ({
  hp: Math.round(d.hp * (1 + 0.42 * (lv - 1))),
  dmg: Math.round(d.dmg * (1 + 0.3 * (lv - 1))),
  xp: Math.round(d.xp * (1 + 0.5 * (lv - 1))),
});

G.BOSSES = {
  blackknight: { name: 'Kara Şövalye', body: 'blackknight', lv: 5, hp: 2400, dmg: 26, xp: 600, spd: 62 },
  witch: { name: 'Bataklık Cadısı', body: 'witch', lv: 8, hp: 4200, dmg: 30, xp: 1400, spd: 70 },
  dragon: { name: 'Kızıl Ejder', body: 'dragon', lv: 11, hp: 7500, dmg: 38, xp: 2800, spd: 52 },
  reaper: { name: 'Azrail', body: 'reaper', lv: 14, hp: 13000, dmg: 44, xp: 0, spd: 92, undead: true },
};

// Dünya: bölgeler soldan sağa dizilir. Her bölgenin sonunda boss'un tuttuğu bir geçit var.
G.WORLD = { y0: -820, y1: 820, x0: -760, x1: 9900 };
G.ZONES = [
  { id: 'town', name: 'Kül Köyü', x0: -760, x1: 620, lv: [1, 1], ground: 'town', mobs: null, camps: 0 },
  { id: 'forest', name: 'Kara Orman', x0: 620, x1: 3300, lv: [1, 4], ground: 'forest', mobs: { wolf: 3, bat: 2, spider: 2 }, camps: 13, boss: 'blackknight' },
  { id: 'grave', name: 'Lanetli Mezarlık', x0: 3300, x1: 6000, lv: [5, 8], ground: 'grave', mobs: { zombie: 3, skeleton: 3, ghost: 2, bat: 1 }, camps: 14, boss: 'witch' },
  { id: 'ember', name: 'Ejder Kayalıkları', x0: 6000, x1: 8700, lv: [8, 11], ground: 'ember', mobs: { troll: 2, spider: 2, skeleton: 2, wolf: 2 }, camps: 14, boss: 'dragon' },
  { id: 'abyss', name: 'Ölüm Kapısı', x0: 8700, x1: 9900, lv: [14, 14], ground: 'abyss', mobs: null, camps: 0, boss: 'reaper' },
];

G.MAX_LV = 15;
G.xpFor = (lv) => Math.round(70 * Math.pow(lv, 1.6));

// Tüccar
G.SHOP = [
  { id: 'hp', name: 'Can İksiri', icon: '!', color: '#ff4a4a', desc: 'Canın %45ini anında doldurur. [Q]', price: () => 30 },
  { id: 'mp', name: 'Mana İksiri', icon: '!', color: '#4a9aff', desc: 'Mananın %50sini doldurur. [E]', price: () => 30 },
  { id: 'wup', name: 'Silah Güçlendirme', icon: '/+', color: '#ffd84a', desc: 'Her seviye +%12 hasar. (en fazla +9)', price: (p) => Math.round(90 * Math.pow(p.wup + 1, 1.7)), max: (p) => p.wup >= 9 },
  { id: 'aup', name: 'Zırh Güçlendirme', icon: '[]+', color: '#9ab8ff', desc: 'Her seviye +4 zırh, +%5 can. (en fazla +9)', price: (p) => Math.round(80 * Math.pow(p.aup + 1, 1.7)), max: (p) => p.aup >= 9 },
];
