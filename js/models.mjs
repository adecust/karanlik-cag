// ═══════════════════════════════════════════════════════════════════
//  GERÇEK 3B MODELLER → ASCII
//  CC0 glTF modelleri (KayKit, Quaternius) three.js ile ¾ yukarıdan
//  render edilir; her animasyon karesi hücre hücre okunup ASCII'ye çevrilir.
//  Sonuç G.SPR[id] olarak oyunun sprite sistemine yazılır.
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from './lib/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from './lib/addons/utils/SkeletonUtils.js';

const G = window.G;
const BASE = 'assets/models/';
const WEAPON = /Sword|Shield|Axe|Mug|Spellbook|Wand|Staff|Crossbow|Knife|Throwable|Offhand/;

// h: ekrandaki boy (dünya birimi), keep: görünür kalacak silahlar
const DEFS = {
  // gerçek oranlı insanlar (Quaternius) — silahlar el kemiğine kodla eklenir
  knight: { file: 'King', h: 166, tint: [0.8, 0.86, 1.0], weapon: 'sword', anims: { idle: 'Idle_Sword', walk: 'Walk', attack: 'Sword_Slash' } },
  barbarian: { file: 'Adventurer', h: 166, hide: ['Backpack'], tint: [0.9, 0.78, 0.68], weapon: 'axe', anims: { idle: 'Idle_Sword', walk: 'Walk', attack: 'Sword_Slash' } },
  monk: { file: 'Adventurer', h: 162, hide: ['Backpack'], tint: [0.62, 0.5, 0.4], weapon: 'staff', anims: { idle: 'Idle', walk: 'Walk', attack: 'Punch_Right' } },
  merchant: { file: 'Farmer', h: 160, anims: { idle: 'Idle_Neutral', walk: 'Idle_Neutral', attack: 'Wave' } },
  skeleton: { file: 'Skeleton_Warrior', h: 174, tint: [0.75, 0.72, 0.66], eyes: true, keep: [], anims: { idle: 'Idle_Combat', walk: 'Walking_D_Skeletons', attack: 'Unarmed_Melee_Attack_Punch_A' } },
  zombie: { file: 'Zombie', h: 179, tint: [0.55, 0.62, 0.5], eyes: true, anims: { idle: 'Idle', walk: 'Walk', attack: 'Attack' } },
  ghost: { file: 'Ghost_Skull', h: 131, tint: [0.6, 0.75, 0.95], eyes: true, anims: { idle: 'Flying_Idle', walk: 'Fast_Flying', attack: 'Punch' } },
  wolf: { file: 'Wolf', h: 114, tint: [0.42, 0.4, 0.44], eyes: [0.83, 0.22], anims: { idle: 'Idle', walk: 'Gallop', attack: 'Attack' } },
  spider: { file: 'Spider', h: 96, tint: [0.35, 0.3, 0.38], eyes: true, anims: { idle: 'Spider_Idle', walk: 'Spider_Walk', attack: 'Spider_Attack' } },
  bat: { file: 'Bat', h: 82, tint: [0.4, 0.34, 0.42], eyes: true, anims: { idle: 'Bat_Flying', walk: 'Bat_Flying', attack: 'Bat_Attack' } },
  troll: { file: 'Giant', h: 244, tint: [0.45, 0.55, 0.42], eyes: true, anims: { idle: 'Idle', walk: 'Walk', attack: 'Attack' } },
  blackknight: { file: 'King', h: 331, ascii: true, eyes: true, ramp: 'sS$Q8&@', tint: [0.2, 0.2, 0.25], weapon: 'greatsword', anims: { idle: 'Idle_Sword', walk: 'Walk', attack: 'Sword_Slash' } },
  witch: { file: 'Witch', h: 296, ascii: true, eyes: true, ramp: 'sS$Q8&@', tint: [0.75, 0.7, 0.85], weapon: 'staff', anims: { idle: 'Idle', walk: 'Walk', attack: 'Sword_Slash' } },
  reaper: { file: 'Skeleton_Mage', h: 365, ascii: true, eyes: true, ramp: 'sS$Q8&@', hide: ['Skeleton_Mage_Hat'], tint: [0.35, 0.32, 0.42], anims: { idle: 'Idle', walk: 'Walking_D_Skeletons', attack: 'Spellcast_Summon' } },
  dragon: { file: 'Dragon', h: 452, ascii: true, eyes: true, ramp: 'sS$Q8&@', anims: { idle: 'Dragon_Flying', walk: 'Dragon_Flying', attack: 'Dragon_Attack' } },
};
const FRAMES = { idle: 6, walk: 8, attack: 7 };
const PITCH = 0.62;            // kamera, yere ~35° bakar (videodaki ayakta duran figürler)
const YAW = Math.PI / 2 - 0.75; // ¾ açı: sağa bakar, gövde kameraya döner
const SS = 2;                  // hücre başına alt örnek çarpanı

const loader = new GLTFLoader();
const cache = {};
const load = (f) => (cache[f] ||= loader.loadAsync(BASE + f + '.glb'));
const clipOf = (clips, n) => clips.find((c) => c.name === n || c.name.endsWith('|' + n)) || null;

let three = null;
const rig = () => {
  if (three) return three;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0x5a6478, 0x0e0a08, 1.0));
  const key = new THREE.DirectionalLight(0xe8dcc8, 2.6);
  key.position.set(-1.4, 1.2, 1.1);
  const under = new THREE.DirectionalLight(0xa02010, 0.9); under.position.set(0.5, -1, 0.8); scene.add(under);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8aa0ff, 2.4);
  rim.position.set(1.2, 1, -1.2);
  scene.add(rim);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
  camera.position.set(0, Math.sin(PITCH) * 1500, Math.cos(PITCH) * 1500);
  camera.lookAt(0, 0, 0);
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  three = { renderer, scene, camera, cv, ctx };
  return three;
};

// basit silahlar: boy, modelin yerli boyuna göre ölçeklenir; bıçak bileğin yerel ekseni boyunca uzar
const WEAPONS = {
  sword: [[0.05, 0.42, 0.012, 0xc8d0dc, 0.27, 0.9], [0.16, 0.025, 0.03, 0x8a7040, 0.05, 0.4], [0.03, 0.1, 0.03, 0x3a2a1a, 0, 0]],
  greatsword: [[0.07, 0.62, 0.016, 0x9aa2b0, 0.37, 0.9], [0.22, 0.03, 0.04, 0x6a1010, 0.05, 0.4], [0.035, 0.14, 0.035, 0x2a1a10, -0.01, 0]],
  axe: [[0.03, 0.55, 0.03, 0x5a3e24, 0.2, 0], [0.18, 0.13, 0.015, 0xb8c0c8, 0.43, 0.9]],
  staff: [[0.028, 0.85, 0.028, 0x4a3420, 0.18, 0], [0.06, 0.06, 0.06, 0xffe8a0, 0.62, 0]],
};
const addWeapon = (root, kind, H0) => {
  let hand = null;
  root.traverse((o) => { if (!hand && o.isBone && /^Wrist.?R$|^Hand.?R$|hand_r/i.test(o.name)) hand = o; });
  if (!hand) return;
  const g = new THREE.Group();
  for (const [w, h, d, col, y, metal, ox] of WEAPONS[kind]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * H0, h * H0, d * H0), new THREE.MeshStandardMaterial({ color: col, metalness: metal, roughness: 0.45 }));
    m.position.set((ox || 0) * H0, y * H0, 0);
    g.add(m);
  }
  if (kind === 'axe') g.children[1].position.x = 0.08 * H0;
  // bilek kemiğinin dünya ölçeğini telafi et
  hand.updateWorldMatrix(true, false);
  const ws = new THREE.Vector3(); hand.getWorldScale(ws);
  g.scale.setScalar(1 / (ws.x || 1));
  g.rotation.set(-Math.PI / 2, 0, 0);
  g.position.set(0, 0.06 * H0 / (ws.x || 1), 0);
  hand.add(g);
};

const prepare = (gltf, def) => {
  const root = SkeletonUtils.clone(gltf.scene);

  root.traverse((o) => {
    if (o.isMesh) {
      let hid = false;
      for (let a = o; a; a = a.parent) if ((def.hide || []).includes(a.name)) hid = true;
      if ((WEAPON.test(o.name) && !(def.keep || []).includes(o.name)) || hid) o.visible = false;
      o.frustumCulled = false;
      if (def.eyes && /eye/i.test(o.name)) { o.material = new THREE.MeshBasicMaterial({ color: 0xff1a0a }); o.userData.eye = true; }
      if (def.tint) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const cl = mats.map((m) => { const c = m.clone(); if (c.color) c.color.multiply(new THREE.Color(...def.tint)); return c; });
        o.material = Array.isArray(o.material) ? cl : cl[0];
      }
    }
  });
  root.rotation.y = YAW;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  const s = def.h / Math.max(1e-6, box.max.y - box.min.y);
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  box.setFromObject(root, true);
  const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z);
  root.updateMatrixWorld(true);
  if (def.weapon) addWeapon(root, def.weapon, def.h);
  return root;
};

// bir karenin ASCII hücreleri
const bakeFrame = (T, view, maxLum) => {
  const { cols, rows, rf, c0, r0 } = view, R = G.R, SX = G.Bake.SX, SY = G.Bake.SY;
  const pw = SX * SS, ph = SY * SS, W = cols * pw, H = rows * ph;
  const d = T.ctx.getImageData(0, 0, W, H).data;
  const cells = [], fill = [], tmap = new Float32Array(SX * SY);
  const ramp = view.ramp || '=+oaeS8$%#@';
  let top = 1e9;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let n = 0, cr = 0, cg = 0, cb = 0, subs = 0;
    tmap.fill(0);
    for (let j = 0; j < SY; j++) for (let i = 0; i < SX; i++) {
      let a = 0;
      for (let y = 0; y < SS; y++) for (let x = 0; x < SS; x++) {
        const px = c * pw + i * SS + x, py = r * ph + j * SS + y, o = (py * W + px) * 4;
        if (d[o + 3] > 110) { a++; n++; cr += d[o]; cg += d[o + 1]; cb += d[o + 2]; }
      }
      if (a * 2 >= SS * SS) { tmap[j * SX + i] = 0.85; subs++; }
    }
    if (subs < 3) continue;
    const dc = c - c0, dr = r - r0;
    fill.push(dc, dr);
    top = Math.min(top, r);
    const rgb = [cr / n / 255, cg / n / 255, cb / n / 255];
    const lum = 0.3 * rgb[0] + 0.55 * rgb[1] + 0.15 * rgb[2];
    // videodaki gibi: her hücre dolu bir harf, şekli renk + gölge verir (çizgi karakteri yok)
    const cov = subs / (SX * SY);
    const ch = ramp[Math.min(ramp.length - 1, Math.floor(Math.pow(Math.min(1, lum / maxLum), 0.9) * ramp.length * (0.55 + 0.45 * cov)))];
    // soluk, kasvetli ton: doygunluk düşük, kenar hücreleri sönük
    const gray = (rgb[0] + rgb[1] + rgb[2]) / 3, k = 3.1 * (0.6 + 0.4 * cov), sat = view.ascii ? 0.85 : 0.6;
    const color = '#' + rgb.map((v) => Math.round(Math.min(1, (gray + (v - gray) * sat) * k) * 255).toString(16).padStart(2, '0')).join('');
    const eye = rgb[0] > 0.6 && rgb[1] < 0.22 && rgb[2] < 0.22;
    if (eye) { cells.push({ dc, dr, ch: '@', g: R.gi('@'), c: R.col('#ff3018'), color: '#ff3018', dx: dc * R.CW, dy: dr * R.CH, e: 1 }); continue; }
    cells.push({ dc, dr, ch, g: R.gi(ch), c: R.col(color), color, dx: dc * R.CW, dy: dr * R.CH, e: 0 });
  }
  G.linePass(cells);
  return { cells, fill, top: (rf - top) * R.CH };
};

const ring = (fill) => {
  const set = new Set();
  for (let n = 0; n < fill.length; n += 2) set.add(fill[n] * 1000 + fill[n + 1]);
  const out = [], seen = new Set();
  for (let n = 0; n < fill.length; n += 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = fill[n] + dx, y = fill[n + 1] + dy, k = x * 1000 + y;
    if (!set.has(k) && !seen.has(k)) { seen.add(k); out.push(x, y); }
  }
  return out;
};

const bakeModel = async (id, def) => {
  const T = rig(), R = G.R, gltf = await load(def.file);
  const root = prepare(gltf, def);
  T.scene.add(root);
  const mixer = new THREE.AnimationMixer(root);
  // çerçeve: bağlama pozunun 1.6 katı genişlik, kanatlar/silahlar için pay
  const box = new THREE.Box3().setFromObject(root, true);
  const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const halfW = Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) * 1.6 + 10;
  const vTop = def.h * cp + Math.abs(box.min.z) * sp + 18, vBot = Math.abs(box.max.z) * sp + 14;
  let cols = Math.ceil((halfW * 2) / R.CW); if (cols % 2 === 0) cols++;
  const rows = Math.ceil((vTop + vBot) / R.CH);
  const c0 = (cols - 1) / 2, rf = vTop / R.CH - 0.5, r0 = Math.floor(rf / 2);
  const view = { cols, rows, rf, c0, r0, ramp: def.ramp, ascii: def.ascii };
  const SX = G.Bake.SX, SY = G.Bake.SY, W = cols * SX * SS, H = rows * SY * SS;
  T.renderer.setSize(W, H, false);
  T.cv.width = W; T.cv.height = H;
  const cam = T.camera;
  cam.left = -cols * R.CW / 2; cam.right = cols * R.CW / 2; cam.top = vTop; cam.bottom = -vBot;
  cam.updateProjectionMatrix();

  const spr = { fps: 9, anim: {}, ready: false, id, model: true };
  const shots = [];
  for (const [key, name] of Object.entries(def.anims)) {
    const clip = clipOf(gltf.animations, name) || gltf.animations[0];
    const N = FRAMES[key];
    mixer.stopAllAction();
    const act = mixer.clipAction(clip);
    act.reset().play();
    for (let f = 0; f < N; f++) {
      const t = key === 'attack' ? (clip.duration * 0.95 * f) / (N - 1) : (clip.duration * f) / N;
      mixer.setTime(t);
      root.updateMatrixWorld(true);
      T.renderer.render(T.scene, cam);
      T.ctx.clearRect(0, 0, W, H);
      T.ctx.drawImage(T.renderer.domElement, 0, 0);
      shots.push({ key, img: T.ctx.getImageData(0, 0, W, H) });
    }
  }
  T.scene.remove(root);
  // ton aralığı: modelin en parlak noktasına göre
  let maxLum = 0.05;
  for (const s of shots) {
    const d = s.img.data;
    for (let o = 0; o < d.length; o += 16) if (d[o + 3] > 110) maxLum = Math.max(maxLum, (0.3 * d[o] + 0.55 * d[o + 1] + 0.15 * d[o + 2]) / 255);
  }
  let mc = 1e9, Mc = -1e9, mr = 1e9, Mr = -1e9, top = 0;
  for (const s of shots) {
    T.ctx.putImageData(s.img, 0, 0);
    const fr = bakeFrame(T, view, maxLum);
    const m = G.SC.mirror(fr);
    const halo = (f) => { const r1 = ring(f); return r1.concat(ring(f.concat(r1))); };
    const frame = { cells: fr.cells, fill: fr.fill, cellsF: m.cells, fillF: m.fill, ring: halo(fr.fill), ringF: halo(m.fill) };
    (spr.anim[s.key] ||= []).push(frame);
    top = Math.max(top, fr.top);
    for (const q of fr.cells) { mc = Math.min(mc, q.dc); Mc = Math.max(Mc, q.dc); mr = Math.min(mr, q.dr); Mr = Math.max(Mr, q.dr); }
  }
  spr.frames = spr.anim.walk;
  spr.w = Mc - mc + 1; spr.h = Mr - mr + 1; spr.mc = mc; spr.mr = mr;
  spr.pw = spr.w * R.CW;
  spr.ph = 2 * (rf - r0) * R.CH;
  spr.top = top;
  spr.rad = Math.max(9, Math.min(spr.pw * 0.32, def.h * 0.3));
  spr.ready = true;
  return spr;
};

G.MODEL_IDS = Object.keys(DEFS);
// hata ayıklama: bir modelin ham render'ını data URL olarak döndür
G.debugModelShot = async (id, key = 'walk', f = 0, pitch = PITCH) => {
  const def = DEFS[id], T = rig(), gltf = await load(def.file);
  const root = prepare(gltf, def);
  T.scene.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const clip = clipOf(gltf.animations, def.anims[key]) || gltf.animations[0];
  mixer.clipAction(clip).play(); mixer.setTime(clip.duration * f);
  root.updateMatrixWorld(true);
  const cam = T.camera, h = def.h * 1.6;
  cam.position.set(0, Math.sin(pitch) * 1500, Math.cos(pitch) * 1500); cam.lookAt(0, 0, 0);
  cam.left = -h; cam.right = h; cam.top = h * 1.3; cam.bottom = -h * 0.5; cam.updateProjectionMatrix();
  T.renderer.setSize(400, 360, false);
  T.renderer.setClearColor(0x203020, 1);
  T.renderer.render(T.scene, cam);
  const url = T.renderer.domElement.toDataURL();
  T.renderer.setClearColor(0, 0);
  T.scene.remove(root);
  cam.position.set(0, Math.sin(PITCH) * 1500, Math.cos(PITCH) * 1500); cam.lookAt(0, 0, 0);
  return url;
};
G.bakeModels = async (onProgress) => {
  const ids = Object.keys(DEFS);
  G.Bake.jobs = G.Bake.jobs.filter((j) => !DEFS[j.id]);
  let i = 0;
  for (const id of ids) {
    try {
      G.SPR[id] = await bakeModel(id, DEFS[id]);
    } catch (e) {
      console.warn('model yüklenemedi, heykel kullanılıyor:', id, e);
      if (!G.SPR[id] || !G.SPR[id].ready) G.Bake.now(id);
    }
    if (onProgress) onProgress(++i, ids.length);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  CANLI 3B KARAKTERLER — videodaki gibi: karakterler ASCII değil, gerçek
//  modeller kasvetli ışıkla ASCII zeminin üstüne render edilir.
// ═══════════════════════════════════════════════════════════════════
const QUAD = new Set(['wolf', 'spider', 'bat']); // dört ayaklılar yandan daha okunaklı
const LP = 0.62, LSIN = Math.sin(LP), LCOS = Math.cos(LP);
G.Live = {
  on: false, inst: new Map(), t: 0,
  init() {
    const cv = document.createElement('canvas');
    cv.id = 'chars';
    cv.style.cssText = 'display:none'; // gizli: pikseller her kare ASCII'ye çevrilir
    document.getElementById('game').after(cv);
    const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: false });
    r.setClearColor(0, 0);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.r = r; this.cv = cv;
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0x46566e, 0x060504, 0.55));
    const rim = new THREE.DirectionalLight(0x7088c8, 1.3); rim.position.set(0.6, 1, -1); s.add(rim); s.add(rim.target);
    const moon = new THREE.DirectionalLight(0xaab4d0, 0.35); moon.position.set(-1, 2, 1); s.add(moon); s.add(moon.target);
    this.torch = new THREE.PointLight(0xff9a50, 900, 0, 1.15); s.add(this.torch);
    this.fires = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xff7a30, 0, 0, 1.2); s.add(l); return l; });
    this.scene = s;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
    this.on = true;
    this.resize();
    addEventListener('resize', () => this.resize());
  },
  // 3B karesini ASCII ızgarasına damgala: yoğunluk rampası + şekil, renkleri modelden
  // regs: figürlerin kapladığı hücre dikdörtgenleri [c0, r0, c1, r1] — yalnız onlar okunur (hız)
  toAscii(regs) {
    const R = G.R, gl = this.r.getContext(), PW = this.PW, PH = this.PH, H = R.rows * PH;
    const ramp = this.RAMP, cols = R.cols;
    if (!this.mask || this.mask.length !== cols * R.rows) this.mask = new Uint8Array(cols * R.rows);
    const mask = this.mask; mask.fill(0);
    if (!regs.length) return;
    // tek okuma: figürlerin birleşik kutusu (birden çok readPixels GPU'yu bekletir)
    let u0 = 1e9, v0 = 1e9, u1 = -1, v1 = -1;
    for (const q of regs) { u0 = Math.min(u0, q[0]); v0 = Math.min(v0, q[1]); u1 = Math.max(u1, q[2]); v1 = Math.max(v1, q[3]); }
    const w = (u1 - u0 + 1) * PW, h = (v1 - v0 + 1) * PH, y0 = H - (v1 + 1) * PH;
    if (this.buf.length < w * h * 4) this.buf = new Uint8Array(w * h * 4);
    gl.readPixels(u0 * PW, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, this.buf);
    const d = this.buf;
    const zb = R.zb;
    for (const [c0, r0, c1, r1, z] of regs) {
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      if (mask[cy * cols + cx] || zb[cy * cols + cx] > z) continue; // işlendi / önde dekor var
      let n = 0, r = 0, g = 0, b = 0;
      for (let j = 0; j < PH; j++) {
        const ly = H - 1 - (cy * PH + j) - y0, lx = (cx - u0) * PW;
        for (let i = 0; i < PW; i++) { const o = (ly * w + lx + i) * 4; if (d[o + 3] > 60) { n++; r += d[o]; g += d[o + 1]; b += d[o + 2]; } }
      }
      if (n < PW * PH * 0.22) continue; // kırıntılar atlanır → temiz silüet
      r /= n * 255; g /= n * 255; b /= n * 255;
      const cov = n / (PW * PH), lum = 0.3 * r + 0.55 * g + 0.15 * b;
      // iç hücre: yoğunluk rampası; kenar hücresi: silüete uyan karakter (net kontur)
      // her hücre dolu yoğunluk harfi; kenarlar biraz sönük (kontur haleden gelir)
      const ch = ramp[Math.min(ramp.length - 1, Math.floor(Math.pow(Math.min(1, lum * 2.2), 0.8) * ramp.length * (0.55 + 0.45 * cov)))];
      const idx = cy * cols + cx, boost = 1.15 + 0.45 * cov;
      mask[idx] = 1;
      // videodaki soğuk lacivert ton
      R.ch[idx] = R.gi(ch); R.fr[idx] = r * boost * 0.82; R.fg[idx] = g * boost * 0.92; R.fb[idx] = b * boost * 1.18; R.em[idx] = 1;
      R.br[idx] = 0; R.bg[idx] = 0; R.bb[idx] = 0;
    }
    }
    // koyu hale: figürün çevresindeki zemin hücreleri kararır → silüet net ayrılır
    for (const [c0, r0, c1, r1] of regs)
    for (let cy = Math.max(1, r0 - 1); cy <= Math.min(R.rows - 2, r1 + 1); cy++) for (let cx = Math.max(1, c0 - 1); cx <= Math.min(cols - 2, c1 + 1); cx++) {
      const i = cy * cols + cx;
      if (mask[i] || !((mask[i - 1] | mask[i + 1] | mask[i - cols] | mask[i + cols]) & 1)) continue;
      if (zb[i] > -1e8) continue; // dekor hücreleri kararmaz
      mask[i] = 2; // bir kez karart (çakışan bölgelerde iki kez değil)
      R.fr[i] *= 0.18; R.fg[i] *= 0.18; R.fb[i] *= 0.18; R.lr[i] *= 0.3; R.lg[i] *= 0.3; R.lb[i] *= 0.3;
    }
  },
  RAMP: '.:-=+*oaS8$#@',
  resize() {
    const R = G.R;
    // ızgara çözünürlüğü: hücre başına 2x3 piksel
    this.r.setPixelRatio(1);
    this.PW = 4; this.PH = 6; this.tmap = new Float32Array(24);
    this.r.setSize(R.cols * this.PW, R.rows * this.PH, false);
    this.buf = new Uint8Array(R.cols * this.PW * R.rows * this.PH * 4);
  },
  has(id) { return this.on && !!DEFS[id] && !DEFS[id].ascii && !!cache[DEFS[id].file]; },
  async make(id) {
    const def = DEFS[id], gltf = await load(def.file);
    const root = prepare(gltf, def);
    root.rotation.y = 0; root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true), c = box.getCenter(new THREE.Vector3());
    root.position.x -= c.x; root.position.z -= c.z;
    const holder = new THREE.Group(); holder.add(root);
    holder.scale.setScalar(1.0); // videodaki gibi küçük figürler
    const mixer = new THREE.AnimationMixer(root), acts = {};
    for (const [k, n] of Object.entries(def.anims)) {
      const clip = clipOf(gltf.animations, n); if (!clip) continue;
      const a = mixer.clipAction(clip);
      if (k === 'attack') { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
      acts[k] = a;
    }
    // yürürken kılıçlı kol savrulmasın: yürüyüşten sağ kol izleri çıkarılır,
    // kol hep kılıç duruşunda (Idle_Sword) kalır; saldırıda bu katman kapanır
    let arm = null;
    const idleClip = def.weapon && acts.walk && clipOf(gltf.animations, def.anims.idle);
    if (idleClip) {
      const ARM = /^(Shoulder|UpperArm|LowerArm|Wrist|Hand|Index\d|Middle\d|Ring\d|Pinky\d|Thumb\d)\.?R\./i;
      const wc = acts.walk.getClip().clone(); wc.tracks = wc.tracks.filter((t) => !ARM.test(t.name));
      const ac = idleClip.clone(); ac.name = 'arm'; ac.tracks = ac.tracks.filter((t) => ARM.test(t.name));
      if (ac.tracks.length) { acts.walk = mixer.clipAction(wc); arm = mixer.clipAction(ac); arm.play(); }
    }
    const mats = [];
    root.traverse((o) => { if (o.isMesh) { o.material = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => m.clone())[0]; mats.push(o.material); } });
    // silah grubu: taşırken kılıç dik yukarı, saldırıda vuruş eksenine döner
    let wg = null;
    root.traverse((o) => { if (!wg && o.isGroup && o.parent && o.parent.isBone && o.children.some((c) => c.isMesh && c.geometry.type === 'BoxGeometry')) wg = o; });
    return { holder, mixer, acts, arm, wg, cur: null, rot: 0, mats, id };
  },
  play(I, k) {
    if (I.cur === k || !I.acts[k]) return;
    if (I.arm) I.arm.setEffectiveWeight(k === 'attack' ? 0 : 1);
    if (I.wg && I.id === 'knight') I.wg.rotation.set(k === 'attack' ? -Math.PI / 2 : Math.PI, 0, 0);
    const a = I.acts[k]; a.reset().play();
    if (I.cur && I.acts[I.cur]) I.acts[I.cur].crossFadeTo(a, 0.15, false);
    I.cur = k;
  },
  sync(list, dt) {
    const seen = new Set();
    for (const it of list) {
      const key = it.ref; seen.add(key);
      let I = this.inst.get(key);
      if (!I) {
        if (I === null) continue;
        this.inst.set(key, null);
        this.make(it.id).then((x) => { if (this.inst.has(key)) { this.inst.set(key, x); this.scene.add(x.holder); } });
        continue;
      }
      I.holder.position.set(it.x, it.lift || 0, it.y / LSIN);
      I.z = it.y; // ayak hizası: önündeki dekorlar figürü örter
      // yön: hareket/nişan yönüne yumuşakça dön
      // insansılar tam profile dönmez: kameraya hep ¾ açıyla bakar (videodaki gibi gövde görünür)
      if (it.dx || it.dy) { let want = Math.atan2(it.dx, it.dy);
        if (!QUAD.has(it.id)) { const base = Math.abs(want) > Math.PI * 0.62 ? Math.PI : 0; const w = Math.atan2(Math.sin(want - base), Math.cos(want - base)); want = base + Math.max(-0.7, Math.min(0.7, w)); }
        let d = want - I.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); I.rot += d * Math.min(1, dt * 12); }
      I.holder.rotation.y = I.rot;
      this.play(I, it.anim);
      if (it.anim === 'attack' && it.restart && I.acts.attack) I.acts.attack.reset().play();
      const fl = it.flash ? 1 : 0;
      for (const m of I.mats) { if (m.emissive) m.emissive.setScalar(fl * 0.8); if (it.alpha < 1) { m.transparent = true; m.opacity = it.alpha; } }
      I.mixer.update(dt * (it.speed || 1));
    }
    for (const [k, I] of this.inst) if (!seen.has(k)) { if (I) this.scene.remove(I.holder); this.inst.delete(k); }
  },
  render(dt) {
    const R = G.R, S = G.S;
    const show = G.mode === 'play' && S;
    // tuval gizli kalır; sonuç ASCII ızgarasına yazılır
    if (!show) { if (this.inst.size) this.sync([], 0); return; }
    const list = [], p = S.player;
    if (!S.dead && !S.over) list.push({ ref: p, id: p.cls, x: p.x, y: p.y + p.spr.ph / 2, dx: p.moving ? p.dirX : p.aimDX || 0, dy: p.moving ? p.dirY : p.aimDY || 0,
      anim: p.atkAnim > 0 ? 'attack' : p.moving ? 'walk' : 'idle', restart: p.atkAnim > 0.43, flash: false, speed: p.running ? 1.6 : 1, alpha: p.iframe > 0 && Math.floor(p.iframe * 20) % 2 ? 0.5 : 1 });
    for (const e of S.enemies) {
      if (e.dead || e.d.prop || !DEFS[e.type] || DEFS[e.type].ascii) continue;
      if (Math.abs(e.x - R.cam.x) > R.VW * 0.7 || Math.abs(e.y - R.cam.y) > R.VH * 0.8) continue;
      const atk = e.boss ? ['aim', 'breath', 'charge', 'swing', 'vanish'].includes(e.st) : e.atkAnim > 0;
      const fly = e.d.ai === 'flutter' || e.type === 'ghost' || e.type === 'dragon' ? 26 : 0;
      list.push({ ref: e, id: e.type, x: e.x, y: e.y + e.spr.ph / 2, dx: e.state === 'chase' || e.boss ? G.S.player.x - e.x : e.mvx || 0, dy: e.state === 'chase' || e.boss ? G.S.player.y - e.y : e.mvy || 0, lift: fly + (e.jump || 0) + (e.type === 'witch' ? 14 + Math.sin(e.wob * 2) * 6 : 0),
        anim: atk ? 'attack' : e.stun > 0 || (e.boss ? e.state === 'idle' : Math.hypot(e.mvx || 0, e.mvy || 0) < 3) ? 'idle' : 'walk', restart: e.atkAnim > 0.48, flash: e.flash > 0, alpha: e.d.ghost ? 0.7 : e.alpha ?? 1,
        speed: e.stun > 0 ? 0.2 : e.state === 'idle' ? 0.5 : e.state === 'return' ? 1.3 : 1 }); // gezinirken ayak kaymasın
    }
    this.sync(list, dt);
    // kamera: ASCII ızgarasıyla birebir aynı görüş
    // kamera ızgaranın tamamını birebir kapsar (hücre = piksel bloğu)
    const GW = R.cols * R.CW, GH = R.rows * R.CH;
    const cx = R.ox + GW / 2, cy = R.oy + GH / 2, cam = this.cam;
    cam.left = -GW / 2; cam.right = GW / 2; cam.top = GH / 2; cam.bottom = -GH / 2;
    cam.position.set(cx, LSIN * 2000, cy / LSIN + LCOS * 2000);
    cam.lookAt(cx, 0, cy / LSIN);
    cam.updateProjectionMatrix();
    // ışıklar: oyuncunun meşalesi + yakındaki ateşler
    const fl = 0.9 + Math.sin(R.time * 11) * 0.06 + Math.sin(R.time * 27) * 0.04;
    this.torch.position.set(p.x + 18, 70, (p.y + p.spr.ph / 2) / LSIN + 30);
    this.torch.intensity = S.dead ? 0 : 1100 * fl;
    const fires = (S.hazards || []).filter((h) => h.fired || h.kind === 'cone');
    this.fires.forEach((l, i) => { const h = fires[i]; if (h) { l.position.set(h.x, 40, h.y / LSIN); l.intensity = 2500; } else l.intensity = 0; });
    this.r.render(this.scene, cam);
    // her figürün ekran kutusu (ayak noktasından yukarı, cömert pay)
    // 3B sınır kutusunun 8 köşesi ekrana izdüşürülür; animasyon taşmaları için 2 hücre pay
    const regs = [], box = this.box || (this.box = new THREE.Box3()), v = this.v3 || (this.v3 = new THREE.Vector3());
    for (const I of this.inst.values()) {
      if (!I) continue;
      box.setFromObject(I.holder);
      let u0 = 1e9, v0 = 1e9, u1 = -1e9, v1 = -1e9;
      for (let k = 0; k < 8; k++) {
        v.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(cam);
        const cx = ((v.x + 1) / 2) * R.cols, cy = ((1 - v.y) / 2) * R.rows;
        u0 = Math.min(u0, cx); u1 = Math.max(u1, cx); v0 = Math.min(v0, cy); v1 = Math.max(v1, cy);
      }
      const c0 = Math.max(0, Math.floor(u0) - 2), c1 = Math.min(R.cols - 1, Math.ceil(u1) + 2);
      const r0 = Math.max(0, Math.floor(v0) - 2), r1 = Math.min(R.rows - 1, Math.ceil(v1) + 2);
      if (c0 <= c1 && r0 <= r1) regs.push([c0, r0, c1, r1, I.z ?? 1e9]);
    }
    this.toAscii(regs);
  },
};
