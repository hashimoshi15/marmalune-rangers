/* Marmalune Rangers — arena: 23_race.js 23b_race_ui.js 24_turf.js 24b_turf_paint.js 24c_turf_arena.js 24d_turf_gear.js 24e_turf_bots.js 24f_turf_mode.js 24g_turf_lobby.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 23_race.js
try { (function () {
// 23_race.js — Star Skiff Rally (GDD §11b): procedural spline space race. Track-space ship physics
// (progress s + lateral x + hover h), 7 AI rivals with personalities and bounded rubber-banding,
// items, energy (shield + boost), drift tiers, drafting, barrel roll, jump gaps, half-pipes, tube
// twists, asteroid gauntlets, ring chains, time trial with a compact ghost, medals and rewards.
// UI (HUD widgets, race select, fallback results, CSS) lives in 23b_race_ui.js (G.RaceUI).
//
// Public API (G.Race):
//   TRACKS [{id, theme, star, pr?, ...}], SHIPS ['arrow','manta','twin','bulky','needle'], ITEMS, CLASSES
//   trackDef(id) · track(id) -> cached track data (LUTs, objects) · preview(id) -> {pts:[[x,z]...], bounds}
//   medalTimes(id, cls) -> {platinum, gold, silver, bronze, par} (seconds, 3 laps; par-based, see MEDAL_K)
//   medalFor(id, cls, sec) -> 0..4 · record(id, cls) -> saved record|null
//   isTrackUnlocked(id) · isShipUnlocked(style) · medalName(m) · fmt(sec) · state (the live race, for tests)
// Mode: G.Game.go('race', {track:'coral_loop', ship:'arrow', mode:'grandprix'|'timetrial', laps:3, cls:'breeze'})
(function (G) {
  'use strict';
  const U = G.util, V3 = THREE.Vector3, TAU = Math.PI * 2;
  const clamp = U.clamp, lerp = U.lerp, damp = U.damp, sstep = U.smoothstep, wrapA = U.wrapAngle;
  const mod = (a, n) => ((a % n) + n) % n;
  // Math.max / min / sign / hypot / random hand back a fresh heap number from the mid-tier (Maglev) compiled code that
  // runs most per-frame code (measured 12-36 bytes a call); these plain twins are inlined and allocate nothing.
  // frand: xorshift32, its state in an Int32Array (updating a typed array never boxes); frange(a, b) = U.rand(a, b).
  const fmax = (a, b) => (a > b ? a : b), fmin = (a, b) => (a < b ? a : b), fsign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const fhyp = (x, y) => Math.sqrt(x * x + y * y);
  // Vector3.normalize() in place (normalize -> divideScalar -> multiplyScalar is one call too deep to be inlined by the
  // mid tier, and that call boxed the scale every time); same result.
  const nrm = v => { const k = 1 / (Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1); v.x *= k; v.y *= k; v.z *= k; return v; };
  const _rs = new Int32Array(1); _rs[0] = (Math.random() * 0x7fffffff) | 1;
  const frand = () => { let x = _rs[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _rs[0] = x; return (x >>> 0) / 4294967296; };
  const frange = (a, b) => a + frand() * (b - a);
  // Smooth 1D value noise in [-1, 1] for per-skiff flicker (engine flames, sputter, grid rev): small enough to be
  // inlined into racerFx / placeRacer, unlike G.noise.n2, whose call boxed its arguments and result there.
  // (lattice values from a 256-entry table: an integer hash through Math.imul was not reduced by the mid tier — a
  // builtin call per step whose 32-bit results, outside the small-integer range, were boxed: ~15 objects per skiff
  // per frame)
  const _NT = new Float32Array(256);
  { let h = 0x2545f491; for (let i = 0; i < 256; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; _NT[i] = ((h >>> 0) / 4294967296) * 2 - 1; } }
  const _nh = i => _NT[i & 255];
  const fn1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = _nh(i); return a + (_nh(i + 1) - a) * u; };
  // Springs for visuals and the camera: {x, v} integrated with sub-stepped semi-implicit Euler (h ≤
  // 1/120 s), so motion is frame-rate independent and stable at any dt. w = angular frequency (rad/s),
  // z = damping ratio (1 = critically damped; < 1 swings past the target a little: weight and settle).
  // The target is interpolated across the sub-steps from the previous frame's value (first-order hold):
  // holding the new value for the whole frame made a spring run ahead by half a frame, so at 20-30 fps a
  // skiff leaned visibly earlier than at 120. t = last target (NaN: none yet / after a snap).
  const spr = x => { const s = { x: 0.5, v: 0.5, t: NaN, g: 0.5 }; s.x = x || 0; s.v = 0; s.g = 0; return s; };   // (fields born as doubles: see floats)
  // Number fields that will hold fractions are made doubles when the object is created. V8 gives a field that starts
  // as a small integer (0) the integer representation and switches it to double the first time a fraction lands in
  // it: that deprecates the object's hidden class and throws every optimized function touching it back to slower
  // code, where each double is boxed. On a racer it happened at random moments of a race (first boost pad, first
  // hit, first overheat...), so stepRacer / triggers / controlBot kept falling back and made garbage every frame.
  // ints: fields that only ever hold integers (indexes, counters, bit masks) and stay integers.
  // It also writes every plain field once more right away (another value of its kind, then the real one back): V8
  // treats a field that has only ever held one value as a constant baked into optimized code, and the first change
  // (the first item picked up, the first wall scrape, the phase moving on) threw that code away again mid-race.
  // null fields get an object written once, so their later objects / strings never change the field's type either.
  function floats(o, ints) {
    for (const k in o) {
      const v = o[k], t = typeof v;
      if (t === 'number') {
        if ((v | 0) === v && ints && ints.indexOf(k) >= 0) { o[k] = v + 1; o[k] = v; }
        else { o[k] = v === 0.5 ? 0.25 : 0.5; o[k] = v; }
      } else if (t === 'boolean') { o[k] = !v; o[k] = v; }
      else if (t === 'string') { o[k] = v + '~'; o[k] = v; }
      else if (v === null) { o[k] = FLOAT_PROBE; o[k] = null; }
    }
    return o;
  }
  const FLOAT_PROBE = {};
  const RACER_INTS = ['i', 'place', 'padLap', 'lapsDone', 'cpDone', 'ringMask', 'ringLap', 'ringChains', 'hits', 'lapHits0', 'rocketsLeft', 'driftDir', 'driftTier', 'dbTier', 'rollDir', 'scrapeSide'];
  const AI_INTS = ['lastLap'];       // (wobAt is a track distance: a double)
  const RACE_INTS = ['countN', 'laps', 'ringChainsTotal', 'cpLast', '_lastPlace', 'finishPlace'];
  // (the target comes in through s.g, a double field: a target handed over as an argument was boxed whenever the call
  // was not inlined, ~20 springs per skiff and camera per frame)
  function sprStep(s, w, z, dt) {
    const target = s.g;
    const n = dt > 1 / 120 ? Math.ceil(dt * 120 - 1e-6) : 1, h = dt / n, k = w * w, c = 2 * z * w;
    const t0 = s.t === s.t ? s.t : target, dT = target - t0;
    for (let i = 1; i <= n; i++) { s.v += (k * (t0 + dT * i / n - s.x) - c * s.v) * h; s.x += s.v * h; }
    s.t = target;
    // (no return value: read s.x. A returned double is boxed when the call is not inlined)
  }
  const sprSet = (s, x) => { s.x = x; s.v = 0; s.t = NaN; };
  // One Euro filter (Casiez et al. 2012) for the touch steering signal: slow finger motion (where touch
  // jitter shows) is smoothed hard, fast flicks raise the cutoff so turning in adds almost no lag.
  function oneEuro(f, x, dt, minHz, beta) {
    if (!f.init) { f.init = true; f.x = x; f.dx = 0; return x; }
    f.dx += ((x - f.x) / fmax(1e-4, dt) - f.dx) * (1 - Math.exp(-dt * TAU * 5));
    f.x += (x - f.x) * (1 - Math.exp(-dt * TAU * (minHz + beta * Math.abs(f.dx))));
    return f.x;
  }
  const ease = k => k * k * k * (k * (k * 6 - 15) + 10);       // smootherstep 0..1

  G.i18n.add('en', {
    'race.title': 'Star Skiff Rally',
    'race.track.coral_loop': 'Coral Comet Loop', 'race.track.mesa_run': 'Mesa Meteor Run', 'race.track.glowcap_gauntlet': 'Glowcap Gauntlet',
    'race.track.frostfizz_spiral': 'Frostfizz Spiral', 'race.track.junkyard_jumpline': 'Junkyard Jumpline', 'race.track.sunbeam_speedway': 'Sunbeam Speedway', 'race.track.daily': 'Daily Track',
    'race.item.rockets': 'Fizz Rockets', 'race.item.homing': 'Homing Gloop', 'race.item.mine': 'Jelly Mine', 'race.item.shield': 'Bubble Shield',
    'race.item.static': 'Static Pop', 'race.item.turbo': 'Turbo Cell', 'race.item.guide': 'Guide Rail', 'race.item.comet': 'Leader Comet',
    'race.go': 'GO!', 'race.lap': 'LAP {n}/{total}', 'race.finalLap': 'FINAL LAP!', 'race.wrongWay': 'WRONG WAY!', 'race.overheat': 'OVERHEAT!',
    'race.perfect': 'PERFECT START!', 'race.goodStart': 'GOOD START!', 'race.sputter': 'Too early!', 'race.finish': 'FINISH!',
    'race.absorb': '+{n} energy!', 'race.ringChain': 'Ring chain! +{n}', 'race.lowEnergy': 'LOW ENERGY', 'race.bonk': 'Bonk!', 'race.blocked': 'Blocked!',
    'race.tractor': 'Tractor beam!', 'race.newRecord': 'New record!', 'race.you': 'You', 'race.gp': 'Grand Prix', 'race.tt': 'Time Trial',
    'race.lapTime': 'Lap {n}: {t}', 'race.roll': 'Barrel roll!', 'race.deflect': 'Deflected!', 'race.draft': 'Slipstream!', 'race.drift': 'Drift boost!', 'race.trick': 'Trick boost!',
    'race.place.1': '1st', 'race.place.2': '2nd', 'race.place.3': '3rd', 'race.place.4': '4th', 'race.place.5': '5th', 'race.place.6': '6th', 'race.place.7': '7th', 'race.place.8': '8th',
    'race.medal.0': 'No medal', 'race.medal.1': 'Bronze', 'race.medal.2': 'Silver', 'race.medal.3': 'Gold', 'race.medal.4': 'Platinum',
    'race.class.breeze': 'Breeze', 'race.class.gale': 'Gale', 'race.class.storm': 'Storm', 'race.class.comet': 'Comet',
    'race.pilot.0': 'Zippy Newt', 'race.pilot.1': 'Captain Puff', 'race.pilot.2': 'Nova Noodle', 'race.pilot.3': 'Turbo Toast', 'race.pilot.4': 'Jelly Jet',
    'race.pilot.5': 'Comet Kit', 'race.pilot.6': 'Bubbles Bolt', 'race.pilot.7': 'Rocket Radish', 'race.pilot.8': 'Sparky Seal', 'race.pilot.9': 'Mochi Max',
    'race.hint.touch': 'Drag anywhere to steer · BOOST uses energy · Hold DRIFT + steer for sparks!',
    'race.hint.desktop': 'A/D steer · W or Shift boost · S + steer drift · B item (hold = energy) · R barrel roll · Click blaster',
  });
  G.i18n.add('ja', {
    'race.title': 'スタースキフ・ラリー',
    'race.track.coral_loop': 'コーラル・コメットループ', 'race.track.mesa_run': 'メサ・メテオラン', 'race.track.glowcap_gauntlet': 'グロウキャップ・ガントレット',
    'race.track.frostfizz_spiral': 'フロストフィズ・スパイラル', 'race.track.junkyard_jumpline': 'ジャンクヤード・ジャンプライン', 'race.track.sunbeam_speedway': 'サンビーム・スピードウェイ', 'race.track.daily': 'きょうのコース',
    'race.item.rockets': 'フィズロケット', 'race.item.homing': 'ホーミングぷるぷる', 'race.item.mine': 'ゼリーマイン', 'race.item.shield': 'バブルシールド',
    'race.item.static': 'ビリビリポップ', 'race.item.turbo': 'ターボセル', 'race.item.guide': 'ガイドレール', 'race.item.comet': 'トップねらいコメット',
    'race.go': 'GO!', 'race.lap': 'ラップ {n}/{total}', 'race.finalLap': 'ファイナルラップ！', 'race.wrongWay': 'ぎゃくそう中！', 'race.overheat': 'オーバーヒート！',
    'race.perfect': 'パーフェクトスタート！', 'race.goodStart': 'ナイススタート！', 'race.sputter': 'はやすぎ！', 'race.finish': 'ゴール！',
    'race.absorb': 'エネルギー +{n}！', 'race.ringChain': 'リングコンボ！ +{n}', 'race.lowEnergy': 'エネルギーが少ない！', 'race.bonk': 'ボコン！', 'race.blocked': 'ガード！',
    'race.tractor': 'トラクタービーム！', 'race.newRecord': 'しんきろく！', 'race.you': 'キミ', 'race.gp': 'グランプリ', 'race.tt': 'タイムアタック',
    'race.lapTime': 'ラップ{n}：{t}', 'race.roll': 'バレルロール！', 'race.deflect': 'はじいた！', 'race.draft': 'スリップストリーム！', 'race.drift': 'ドリフトブースト！', 'race.trick': 'トリックブースト！',
    'race.place.1': '1位', 'race.place.2': '2位', 'race.place.3': '3位', 'race.place.4': '4位', 'race.place.5': '5位', 'race.place.6': '6位', 'race.place.7': '7位', 'race.place.8': '8位',
    'race.medal.0': 'メダルなし', 'race.medal.1': 'ブロンズ', 'race.medal.2': 'シルバー', 'race.medal.3': 'ゴールド', 'race.medal.4': 'プラチナ',
    'race.class.breeze': 'そよかぜ', 'race.class.gale': 'つむじかぜ', 'race.class.storm': 'あらし', 'race.class.comet': 'すいせい',
    'race.pilot.0': 'ビュンビュンイモリ', 'race.pilot.1': 'キャプテン・パフ', 'race.pilot.2': 'ノバ・ヌードル', 'race.pilot.3': 'ターボトースト', 'race.pilot.4': 'ゼリージェット',
    'race.pilot.5': 'コメット・キット', 'race.pilot.6': 'バブル・ボルト', 'race.pilot.7': 'ロケットだいこん', 'race.pilot.8': 'スパーキーアザラシ', 'race.pilot.9': 'モチ・マックス',
    'race.hint.touch': 'どこでもドラッグでハンドル・BOOSTはエネルギーをつかうよ・DRIFTをおしながら曲がると火花！',
    'race.hint.desktop': 'A/D ハンドル・W か Shift ブースト・S+ハンドルでドリフト・B アイテム（長おしでエネルギー）・R バレルロール・クリックでブラスター',
  });

  // ------------------------------------------------------------------ tuning (GDD §11b numbers)
  const TUNE = {
    ds: 2, hw: 12, hwRow: 18, laps: 3, racers: 8,
    top: 70, cap: 105, accel: 28,
    boostDrain: 30, boostK: 0.35, padK: 0.40, padT: 1.0, padMax: 2.5,
    drift: [0.55, 1.2, 2.0], driftBoost: [0.5, 1.1, 1.8], driftK: 0.32, driftSlow: 0.99, stackK: 0.1, assistTop: 0.965,
    draftDist: 20, draftLat: 4, draftCharge: 1.2, draftK: 0.08, slingK: 0.2, slingT: 1.5,
    rollT: 0.45, rollCost: 10, rollCd: 1.0, trickT: 0.8,
    startPerfect: 0.12, startGood: 0.3,
    stall: 2, stallRestart: 30, recharge: 35, recovery: 25, regen: 0,
    rockCost: 8, hover: 0.65, grav: 34,
    itemRespawn: 2.5, absorbHold: 0.6, absorbGain: 20, shipHalf: 1.3,
    cleanLap: 15,               // energy for a lap without a wall bump, asteroid or item hit
  };
  const CLASSES = { breeze: 1, gale: 1.15, storm: 1.3, comet: 1.45 };
  const PLACE_CLINKS = [300, 220, 170, 130, 100, 80, 65, 50];
  const MEDAL_XP = [0, 50, 100, 150, 250];
  const SHIPS = ['arrow', 'manta', 'twin', 'bulky', 'needle'];
  const ITEMS = {
    rockets: { color: 0xff7a3d, cost: 18, spin: 0.6 },
    homing: { color: 0x6dff8a, cost: 20, spin: 0.9 },
    mine: { color: 0xff5fa2, cost: 15, spin: 0.6, life: 20 },
    shield: { color: 0x7af0ff, t: 6 },
    static: { color: 0xc4a8ff, r: 25, slowT: 1.2, off: 2, cost: 10 },
    turbo: { color: 0xffd23f, k: 0.45, t: 2 },
    guide: { color: 0x3fe0b8, k: 0.30, t: 3 },
    comet: { color: 0xffb627, cost: 25, spin: 1.2 },
  };
  const ODDS = [
    { max: 0.5, t: { mine: 35, rockets: 30, shield: 25, turbo: 10 } },
    { max: 150, t: { rockets: 25, homing: 25, mine: 15, shield: 15, turbo: 20 } },
    { max: 400, t: { homing: 30, turbo: 25, static: 20, shield: 15, rockets: 10 } },
    { max: Infinity, t: { turbo: 30, guide: 25, static: 20, homing: 20, comet: 5 } },
  ];
  const BOT_COLORS = [
    [0xff6b8b, 0xffd23f, 0xfff06a], [0x8f6bff, 0x7af0ff, 0x9ff6ff], [0xff8a4c, 0x3fe0b8, 0x7affd8], [0x2f7bff, 0xff8a1f, 0xffc070],
    [0xffd23f, 0x8f6bff, 0xd0b0ff], [0x33b5ff, 0xff5fa2, 0xff9ad0], [0xb983ff, 0x3fe0b8, 0x8affd8], [0xf4fbff, 0xff6f91, 0xff9ab0], [0x6ccb5f, 0xfff1dc, 0xd8ff9a],
  ];
  const PLAYER_COLORS = { main: 0x2ec4b6, accent: 0xffd23f, glow: 0x7af0ff };
  // Ship paints (G.Data.COSMETICS paint_*): the one equipped in the Ranger Locker (G.Wardrobe), else profile.ship.paint.
  const PAINTS = {
    paint_streak: { main: 0xff5fa2, accent: 0x7af0ff, glow: 0xffd23f },
    paint_prismatic: { main: 0xb983ff, accent: 0x7af0ff, glow: 0xff9de2 },
    paint_golden: { main: 0xffc21a, accent: 0xfff1dc, glow: 0xffe9a8 },
  };
  function playerColors() {
    const W = G.Wardrobe, wp = W && W.equipped ? G.safe('race paint', () => W.equipped().paint) : null;
    if (wp && PAINTS[wp]) return PAINTS[wp];
    if (wp === 'none') return PLAYER_COLORS;
    const sh = G.Save && G.Save.data && G.Save.prof && G.Save.prof.ship;
    return (sh && PAINTS[sh.paint]) || PLAYER_COLORS;
  }

  // ------------------------------------------------------------------ themes (GDD §2.3 race space)
  const THEMES = {
    coral: { sky: { top: 0x241a5c, mid: 0x3b2f96, horizon: 0x5b4fd0, bottom: 0x1d1650, nebula: 0xff8fc0, sun: 0xfff3e0, halo: 0xffb8e0, sunSize: 0.0008 },
      fog: 0x4a3fb8, road: '#2a2f6b', road2: '#323a82', chev: '#7af0ff', lane: '#a8c0ff', edge: '#7af0ff',
      rail: [0x7af0ff, 0xff8fc0], pylon: 0xffd23f, rocks: [0xff8a4c, 0xff7a93, 0xffb37a, 0xb983ff, 0xffd45c], arch: [0xff8a4c, 0xff5fa2, 0xffd45c, 0xb983ff, 0x3fe0b8],
      gate: 0x7af0ff, neb: [0xff8fc0, 0x7af0ff, 0xb983ff], dust: 0xd8e6ff,
      planets: [{ k: 'marmalune', r: 950, d: [0.35, -0.62, -0.7], dist: 2900 }, { k: 'gas', r: 260, d: [-0.7, 0.25, 0.5], dist: 3200, c: [0xffb37a, 0xff7a93, 0xffe0a8], ring: true }, { k: 'moon', r: 90, d: [0.6, 0.35, 0.65], dist: 2600, c: [0xc4bff0, 0x8e88c8, 0xe8e4ff] }],
      light: { sun: 0xfff4dc, sky: 0xd8d0ff, ground: 0x8a80d8, shadow: 0x9a8ee0, shadowK: 0.45, rim: 0x9ff0ff } },
    mesa: { sky: { top: 0x2a1650, mid: 0x6a3a8a, horizon: 0xff9a7a, bottom: 0x3a1f4a, nebula: 0xffa070, sun: 0xfff0c8, halo: 0xffb37a, sunSize: 0.0016 },
      fog: 0x8a4a8a, road: '#3a2a5e', road2: '#46336e', chev: '#ffd23f', lane: '#ffc9a0', edge: '#ff8a4c',
      rail: [0xffb37a, 0xff5fa2], pylon: 0x7af0ff, rocks: [0xf2b98a, 0xe88a5a, 0xc9624a, 0xd97b7b, 0xf7e1b5], arch: [0xe88a5a, 0xf2b98a, 0xc9624a, 0xd97b7b, 0xf7e1b5],
      gate: 0xffd23f, neb: [0xffa070, 0xff5fa2, 0xffd27a], dust: 0xffe0c8,
      planets: [{ k: 'marmalune', r: 820, d: [-0.4, -0.55, 0.73], dist: 2800 }, { k: 'gas', r: 420, d: [0.75, 0.2, -0.6], dist: 3600, c: [0xe88a5a, 0xf2b98a, 0xffe0a8], ring: true }],
      light: { sun: 0xfff0d0, sky: 0xffd0c0, ground: 0xa070b8, shadow: 0xb088c8, shadowK: 0.45, rim: 0xffd8a0 } },
    glow: { sky: { top: 0x0b0d30, mid: 0x1b1f4d, horizon: 0x3e3f8f, bottom: 0x0d0f35, nebula: 0x40e8d0, sun: 0xd8f6ff, halo: 0x7af0ff, sunSize: 0.0005 },
      fog: 0x23285e, road: '#1b1f50', road2: '#232a62', chev: '#5cffe1', lane: '#7f9fff', edge: '#ff6f91',
      rail: [0x5cffe1, 0xff6f91], pylon: 0xff6f91, rocks: [0x2f6e6a, 0x3a8f7a, 0x4b4f9a, 0x6e64a8, 0x5cffe1], arch: [0xff6f91, 0xfff1dc, 0x5cffe1, 0xff6f91, 0x7af0ff],
      gate: 0x5cffe1, neb: [0x40e8d0, 0x8f6bff, 0xff6f91], dust: 0x9ff6ff,
      planets: [{ k: 'marmalune', r: 900, d: [0.5, -0.6, 0.62], dist: 3000, night: true }, { k: 'gas', r: 300, d: [-0.6, 0.35, -0.7], dist: 3300, c: [0x2f6e6a, 0x5cffe1, 0x1b1f4d], ring: true }, { k: 'moon', r: 110, d: [0.2, 0.55, -0.8], dist: 2500, c: [0x9fb7ff, 0x6e64a8, 0xd8e0ff] }],
      light: { sun: 0xe4f2ff, sky: 0xd4d8ff, ground: 0x7a82c4, shadow: 0x8a8ed0, shadowK: 0.45, rim: 0x5cffe1, exposure: 1.05 } },
    frost: { sky: { top: 0x1e2a6a, mid: 0x4a6ad0, horizon: 0xbde4ff, bottom: 0x24306e, nebula: 0xff9de2, sun: 0xffffff, halo: 0xd8f0ff, sunSize: 0.0010 },
      fog: 0x8aa8e8, road: '#2a3a7a', road2: '#34478c', chev: '#bdebff', lane: '#e8f6ff', edge: '#ff9de2',
      rail: [0xbdebff, 0xff9de2], pylon: 0xff9de2, rocks: [0xf4fbff, 0xbdebff, 0x9fc3e8, 0xff9de2, 0x8e88c8], arch: [0xbdebff, 0xff9de2, 0xf4fbff, 0x9fc3e8, 0xff9de2],
      gate: 0xbdebff, neb: [0xff9de2, 0x9fe8ff, 0xffffff], dust: 0xffffff,
      planets: [{ k: 'marmalune', r: 880, d: [-0.3, -0.6, -0.74], dist: 2900 }, { k: 'ice', r: 340, d: [0.65, 0.3, 0.7], dist: 3400, c: [0xf4fbff, 0xbdebff, 0x9fc3e8], ring: true }],
      light: { sun: 0xffffff, sky: 0xe0f0ff, ground: 0x8a9ae0, shadow: 0x9aaae8, shadowK: 0.45, rim: 0xffffff } },
    junk: { sky: { top: 0x2a1a5a, mid: 0x8f7be0, horizon: 0xffb38a, bottom: 0x3a2050, nebula: 0xff7a3d, sun: 0xfff0d8, halo: 0xffb38a, sunSize: 0.0014 },
      fog: 0x9a6aa8, road: '#33295a', road2: '#3e3268', chev: '#ff7a3d', lane: '#ffd9b8', edge: '#ffd23f',
      rail: [0xff7a3d, 0xffd23f], pylon: 0x7af0ff, rocks: [0x9aa5b8, 0xd99a6c, 0x5b3a8c, 0xc9d2ea, 0xff7a3d], arch: [0xff7a3d, 0x5b3a8c, 0xffd23f, 0x5b3a8c, 0xff7a3d],
      gate: 0xffd23f, neb: [0xff7a3d, 0x8f7be0, 0xffb38a], dust: 0xffe8d0,
      planets: [{ k: 'marmalune', r: 860, d: [0.45, -0.58, 0.68], dist: 2900 }, { k: 'gas', r: 380, d: [-0.7, 0.3, -0.62], dist: 3500, c: [0xd99a6c, 0x9aa5b8, 0xff7a3d], ring: false }, { k: 'moon', r: 120, d: [-0.2, 0.5, 0.84], dist: 2600, c: [0x9aa5b8, 0x5b3a8c, 0xc9d2ea] }],
      light: { sun: 0xfff0d8, sky: 0xe0c8ff, ground: 0x9078b8, shadow: 0xa088c8, shadowK: 0.45, rim: 0xffc8a0 } },
    sun: { sky: { top: 0x2c1460, mid: 0xb04a9a, horizon: 0xffc070, bottom: 0x4a1a5a, nebula: 0xffd23f, sun: 0xfffbe8, halo: 0xffd27a, sunSize: 0.006, sunDir: [0.2, 0.18, -0.96] },
      fog: 0xd0709a, road: '#4a2a6a', road2: '#58327a', chev: '#ffe9a8', lane: '#ffe0f0', edge: '#ffc21a',
      rail: [0xffd23f, 0xff8a4c], pylon: 0x7af0ff, rocks: [0xffd45c, 0xffb37a, 0xff8a4c, 0xfff1dc, 0xe8b44a], arch: [0xffc21a, 0xff8a4c, 0xfff1dc, 0xff5fa2, 0xffc21a],
      gate: 0xffc21a, neb: [0xffd23f, 0xff8a4c, 0xff5fa2], dust: 0xfff0c0,
      planets: [{ k: 'marmalune', r: 900, d: [-0.45, -0.55, 0.7], dist: 2900 }, { k: 'gas', r: 230, d: [0.75, 0.35, 0.55], dist: 3000, c: [0xff8a4c, 0xffd45c, 0xfff1dc], ring: true }],
      light: { sun: 0xfff2c8, sky: 0xffd8e8, ground: 0xb070a8, shadow: 0xc08ab8, shadowK: 0.45, rim: 0xffe9a8, exposure: 1.05 } },
  };

  // ------------------------------------------------------------------ tracks (GDD track list)
  const TRACKS = [
    { id: 'coral_loop', par: [96.1, 65.2], theme: 'coral', star: 2, seed: 101, pts: 16, radius: 420, aspect: 1.3, jit: 0.2, hAmp: 26, hFreq: 2, len: 2450, pieces: ['rings', 'arches', 'gauntlet_l'], pads: 6, rows: 3 },
    { id: 'mesa_run', par: [104.7, 76.3], theme: 'mesa', star: 2, seed: 202, pts: 17, radius: 460, aspect: 1.45, jit: 0.22, hAmp: 40, hFreq: 2, len: 2650, pieces: ['jump', 'gauntlet', 'rings'], pads: 6, rows: 3 },
    { id: 'glowcap_gauntlet', par: [104.6, 75.9], theme: 'glow', star: 3, seed: 303, pts: 18, radius: 440, aspect: 1.2, jit: 0.24, hAmp: 34, hFreq: 3, len: 2600, pieces: ['halfpipe', 'gauntlet', 'arches', 'rings'], pads: 5, rows: 3 },
    { id: 'frostfizz_spiral', par: [110.3, 78.0], theme: 'frost', star: 4, seed: 404, pts: 18, radius: 480, aspect: 1.15, jit: 0.24, hAmp: 60, hFreq: 2, len: 2800, pieces: ['twist', 'halfpipe', 'rings', 'gauntlet_l'], pads: 6, rows: 3 },
    { id: 'junkyard_jumpline', par: [117.2, 82.6], theme: 'junk', star: 5, seed: 505, pts: 19, radius: 500, aspect: 1.5, jit: 0.24, hAmp: 48, hFreq: 3, len: 2900, pieces: ['jump', 'gauntlet', 'twist', 'jump'], pads: 7, rows: 3 },
    { id: 'sunbeam_speedway', par: [118.1, 81.7], theme: 'sun', star: 5, seed: 606, pts: 14, radius: 540, aspect: 1.6, jit: 0.18, hAmp: 30, hFreq: 1, len: 3000, pieces: ['twist', 'rings', 'jump', 'halfpipe'], pads: 8, rows: 2 },
  ];
  function dailyDef() {
    const d = new Date();
    const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const r = G.rng(key);
    const themes = Object.keys(THEMES);
    const pool = ['rings', 'arches', 'gauntlet', 'jump', 'halfpipe', 'twist'];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const pieces = pool.slice(0, 3 + Math.floor(r() * 2));
    return { id: 'daily', daily: key, theme: themes[key % themes.length], pr: 15, seed: key % 100000, pts: 14 + Math.floor(r() * 6), radius: 400 + Math.floor(r() * 140),
      aspect: 1.1 + r() * 0.5, jit: 0.2, hAmp: 20 + Math.floor(r() * 40), hFreq: 1 + Math.floor(r() * 3), len: 2400 + Math.floor(r() * 6) * 100, pieces, pads: 5 + Math.floor(r() * 3), rows: 3 };
  }
  function trackDef(id) {
    if (id === 'daily') { const d = dailyDef(); if (!trackDef._daily || trackDef._daily.daily !== d.daily) trackDef._daily = d; return trackDef._daily; }
    return TRACKS.find(t => t.id === id) || null;
  }

  // ------------------------------------------------------------------ track generation
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _e = new V3();
  const UPV = new V3(0, 1, 0);
  function checkLayout(curve, L) {
    const M = Math.floor(L / 4), P = [];
    for (let i = 0; i < M; i++) P.push(curve.getPointAt(i / M));
    for (let i = 0; i < M; i++) {
      const a = P[(i - 3 + M) % M], b = P[i], c = P[(i + 3) % M];
      const abx = b.x - a.x, abz = b.z - a.z, bcx = c.x - b.x, bcz = c.z - b.z, acx = c.x - a.x, acz = c.z - a.z;
      const k = 2 * Math.abs(abx * bcz - abz * bcx) / (fhyp(abx, abz) * fhyp(bcx, bcz) * fhyp(acx, acz) + 1e-9);
      if (k > 1 / 52) return false;
      if (Math.abs(c.y - a.y) / (fhyp(acx, acz) + 1e-6) > 0.32) return false;
    }
    const cell = 50, grid = new Map(), sep = 30;
    for (let i = 0; i < M; i++) {
      const p = P[i], cx = Math.floor(p.x / cell), cz = Math.floor(p.z / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const arr = grid.get((cx + dx) * 7919 + (cz + dz)); if (!arr) continue;
        for (const j of arr) {
          let dd = Math.abs(i - j); dd = fmin(dd, M - dd); if (dd < sep) continue;
          const q = P[j];
          if (fhyp(p.x - q.x, p.z - q.z) < 58 && Math.abs(p.y - q.y) < 28) return false;
        }
      }
      const key = cx * 7919 + cz; let arr = grid.get(key); if (!arr) grid.set(key, arr = []); arr.push(i);
    }
    return true;
  }

  const trackCache = new Map();
  function buildTrack(def) {
    const rng = G.rng(def.seed * 7919 + 17);
    let curve = null, L = 0, pts = null, ok = false;
    for (let tries = 0; tries < 40 && !ok; tries++) {
      const n = def.pts, phase = rng() * TAU;
      pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rng.range(-0.17, 0.17);
        const r = def.radius * (1 + rng.range(-def.jit, def.jit));
        pts.push(new V3(Math.cos(a) * r * def.aspect, Math.sin(a * def.hFreq + phase) * def.hAmp + rng.range(-5, 5), Math.sin(a) * r));
      }
      curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
      curve.arcLengthDivisions = 2000;
      L = curve.getLength();
      const k = def.len / L;
      for (const p of pts) { p.x *= k; p.z *= k; }
      curve.updateArcLengths();
      L = curve.getLength();
      ok = checkLayout(curve, L);
    }
    const N = Math.round(L / TUNE.ds), ds = L / N;
    const T = {
      id: def.id, def, theme: THEMES[def.theme] || THEMES.coral, L, N, ds,
      pos: new Float32Array(N * 3), fwd: new Float32Array(N * 3), right: new Float32Array(N * 3), up: new Float32Array(N * 3),
      kap: new Float32Array(N), hw: new Float32Array(N).fill(TUNE.hw), pipe: new Float32Array(N), roll: new Float32Array(N),
      lift: new Float32Array(N), gap: new Uint8Array(N), line: new Float32Array(N), bankK: new Float32Array(N).fill(1),
      rows: [], pads: [], strips: [], rings: [], rocks: [], arches: [], jumps: [], twists: [], pipes: [], cps: [],
      recovery: [L - 180, L - 70], tile: L / Math.round(L / 12),
    };
    const r0 = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = i / N;
      curve.getPointAt(u, _a); curve.getTangentAt(u, _b).normalize();
      T.pos[i * 3] = _a.x; T.pos[i * 3 + 1] = _a.y; T.pos[i * 3 + 2] = _a.z;
      T.fwd[i * 3] = _b.x; T.fwd[i * 3 + 1] = _b.y; T.fwd[i * 3 + 2] = _b.z;
      _c.crossVectors(_b, UPV); if (_c.lengthSq() < 1e-6) _c.set(1, 0, 0); _c.normalize();
      r0[i * 3] = _c.x; r0[i * 3 + 1] = _c.y; r0[i * 3 + 2] = _c.z;
    }
    // signed horizontal curvature (+ = left turn), then smoothed
    const kraw = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = mod(i - 3, N) * 3, b = mod(i + 3, N) * 3;
      const dx = T.fwd[b] - T.fwd[a], dy = T.fwd[b + 1] - T.fwd[a + 1], dz = T.fwd[b + 2] - T.fwd[a + 2];
      kraw[i] = -(dx * r0[i * 3] + dy * r0[i * 3 + 1] + dz * r0[i * 3 + 2]) / (6 * ds);
    }
    boxSmooth(kraw, T.kap, 8);
    placePieces(T, def, rng);
    // bank from curvature, faded out in twists / half-pipes
    const bank = new Float32Array(N);
    for (let i = 0; i < N; i++) bank[i] = clamp(-T.kap[i] * 2400, -40, 40) * Math.PI / 180;
    const bank2 = new Float32Array(N); boxSmooth(bank, bank2, 6);
    for (let i = 0; i < N; i++) {
      const th = bank2[i] * T.bankK[i] * (1 - 0.85 * T.pipe[i]) + T.roll[i];
      const fx = T.fwd[i * 3], fy = T.fwd[i * 3 + 1], fz = T.fwd[i * 3 + 2];
      const rx = r0[i * 3], ry = r0[i * 3 + 1], rz = r0[i * 3 + 2];
      // up0 = r0 x f
      const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
      const c = Math.cos(th), s = Math.sin(th);
      T.up[i * 3] = ux * c + rx * s; T.up[i * 3 + 1] = uy * c + ry * s; T.up[i * 3 + 2] = uz * c + rz * s;
      T.right[i * 3] = rx * c - ux * s; T.right[i * 3 + 1] = ry * c - uy * s; T.right[i * 3 + 2] = rz * c - uz * s;
    }
    // racing line: inside of upcoming corners, smoothed
    const ka = new Float32Array(N);
    for (let i = 0; i < N; i++) { let s = 0; for (let k = 2; k <= 22; k++) s += T.kap[(i + k) % N]; ka[i] = s / 21; }
    const lr = new Float32Array(N);
    for (let i = 0; i < N; i++) lr[i] = clamp(-ka[i] * 1100, -(T.hw[i] - 4), T.hw[i] - 4) * (1 - 0.4 * T.pipe[i]) * (T.roll[i] !== 0 ? 0.3 : 1);
    boxSmooth(lr, T.line, 12);
    placePads(T, def, rng);
    // bounds + preview
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
    const prev = [];
    for (let i = 0; i < N; i++) {
      const x = T.pos[i * 3], y = T.pos[i * 3 + 1], z = T.pos[i * 3 + 2];
      minX = fmin(minX, x); maxX = fmax(maxX, x); minZ = fmin(minZ, z); maxZ = fmax(maxZ, z); minY = fmin(minY, y); maxY = fmax(maxY, y);
      if (i % 6 === 0) prev.push([x, z]);
    }
    T.bounds = { minX, maxX, minZ, maxZ, minY, maxY };
    T.center = new V3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    T.preview = prev;
    for (let k = 1; k <= 6; k++) T.cps.push(k * L / 6);
    T.corners = findCorners(T);
    return T;
  }
  // Corners for the turn indicators: runs of |curvature| > 0.0045 (+ = left turn), graded by their sharpest point:
  // tier 1 gentle (peak >= 0.008: floor chevrons), 2 medium (>= 0.014: + 3 chevron boards), 3 sharp (>= 0.025, radius
  // under ~40 u: + 5 bigger boards). Runs closer than 24 u merge; corners inside half-pipes / tube twists are skipped
  // (the road surface itself turns there).
  const CORNER_K = [0.008, 0.014, 0.025];
  function findCorners(T) {
    const out = [], N = T.N, ds = T.ds;
    let run = null;
    const close = () => {
      if (!run) return;
      const tier = run.pk >= CORNER_K[2] ? 3 : run.pk >= CORNER_K[1] ? 2 : run.pk >= CORNER_K[0] ? 1 : 0;
      if (tier) out.push({ s0: run.i0 * ds, s1: run.i1 * ds, apex: run.ia * ds, dir: run.sg, sharp: run.pk, tier });
      run = null;
    };
    for (let i = 0; i < N; i++) {
      const k = T.kap[i], a = Math.abs(k), sg = fsign(k);
      const skip = T.pipe[i] > 0.05 || T.roll[i] !== 0 || T.gap[i];
      if (a > 0.0045 && !skip) {
        if (run && (sg !== run.sg || i - run.i1 > 12)) close();
        if (!run) run = { i0: i, i1: i, ia: i, pk: 0, sg };
        run.i1 = i; if (a > run.pk) { run.pk = a; run.ia = i; }
      } else if (run && i - run.i1 > 12) close();
    }
    close();
    return out;
  }
  function boxSmooth(src, dst, r) {
    const N = src.length; let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[mod(k, N)];
    for (let i = 0; i < N; i++) { dst[i] = acc / (2 * r + 1); acc += src[mod(i + r + 1, N)] - src[mod(i - r, N)]; }
  }
  const idxOf = (T, s) => Math.floor(mod(s, T.L) / T.ds) % T.N;

  // Set pieces (GDD pool): tube twist, half-pipe, asteroid gauntlet, ring chain, jump gap, coral arches.
  function placePieces(T, def, rng) {
    const L = T.L, ds = T.ds;
    const reserved = [[-1, 150], [L - 240, L + 1]];
    const free = (a, b) => { if (a < 0 || b > L) return false; for (const r of reserved) if (!(b < r[0] || a > r[1])) return false; return true; };
    const absK = s => Math.abs(T.kap[idxOf(T, s)]);
    const maxK = (a, b) => { let m = 0; for (let s = a; s <= b; s += 6) m = fmax(m, absK(s)); return m; };
    const meanK = (a, b) => { let m = 0, n = 0; for (let s = a; s <= b; s += 6) { m += absK(s); n++; } return m / fmax(1, n); };
    const pick = (span, score, margin) => {
      let best = -1, bs = Infinity;
      for (let s = 170; s < L - 250 - span; s += 12) {
        if (!free(s - margin, s + span + margin)) continue;
        const sc = score(s) + rng() * 0.0015;
        if (sc < bs) { bs = sc; best = s; }
      }
      if (best >= 0) reserved.push([best - margin, best + span + margin]);
      return best;
    };
    const setRange = (a, b, fn) => { for (let s = fmax(0, a); s <= b && s < L; s += ds) fn(idxOf(T, s), s); };
    // item rows, spread around the lap
    const fr = [0.24, 0.53, 0.8].slice(0, def.rows || 3);
    for (const f of fr) {
      let s0 = -1;
      for (let d = 0; d < 360 && s0 < 0; d += 12) for (const sg of [1, -1]) { const s = f * L + sg * d; if (s0 < 0 && free(s - 70, s + 70) && maxK(s - 30, s + 30) < 0.012) s0 = s; }
      if (s0 < 0) continue;
      reserved.push([s0 - 70, s0 + 70]);
      const boxes = [];
      for (let k = 0; k < 6; k++) boxes.push({ x: -15 + k * 6, t: 0.5, g: 0.5 });   // (t / g become 0 / 1 at race start: born doubles, see floats)
      T.rows.push({ s: s0, boxes });
      setRange(s0 - 70, s0 + 70, (i, s) => { const w = sstep(40, 0, Math.abs(s - s0) - 20); T.hw[i] = fmax(T.hw[i], lerp(TUNE.hw, TUNE.hwRow, w)); });
    }
    for (const name of def.pieces) {
      if (name === 'twist') {
        const span = 240, s0 = pick(span, s => maxK(s, s + span) * 2, 60); if (s0 < 0) continue;
        const dir = rng() < 0.5 ? 1 : -1;
        T.twists.push({ s0, s1: s0 + span, dir });
        setRange(s0, s0 + span, (i, s) => { const t = (s - s0) / span; const e = t * t * t * (t * (t * 6 - 15) + 10); T.roll[i] = dir * TAU * e; T.bankK[i] = 1 - sstep(0, 0.12, t) * (1 - sstep(0.88, 1, t)); });
      } else if (name === 'halfpipe') {
        const span = 300, s0 = pick(span, s => Math.abs(meanK(s, s + span) - 0.006), 50); if (s0 < 0) continue;
        T.pipes.push({ s0, s1: s0 + span });
        setRange(s0, s0 + span, (i, s) => { T.pipe[i] = sstep(0, 55, s - s0) * (1 - sstep(span - 55, span, s - s0)); });
      } else if (name === 'jump') {
        const span = 110, s0 = pick(span, s => maxK(s, s + span) * 3, 70); if (s0 < 0) continue;
        const kick = s0 + 38, g1 = kick + 34;
        T.jumps.push({ s0, kick, g0: kick, g1, land: g1 + 26 });
        setRange(s0, kick, (i, s) => { T.lift[i] = 3.2 * sstep(s0, kick, s); });
        setRange(kick + ds * 0.5, g1 - ds * 0.5, i => { T.gap[i] = 1; });
      } else if (name === 'rings') {
        const span = 170, s0 = pick(span, s => maxK(s, s + span), 30); if (s0 < 0) continue;
        const ph = rng() * TAU, chain = T.rings.length ? T.rings[T.rings.length - 1].chain + 1 : 0;
        for (let k = 0; k < 5; k++) T.rings.push({ s: s0 + 12 + k * 34, x: Math.sin(k * 1.15 + ph) * 6.5, h: 2.7, R: 4.2, chain, k });
      } else if (name === 'gauntlet' || name === 'gauntlet_l') {
        const heavy = name === 'gauntlet', span = heavy ? 260 : 200, s0 = pick(span, s => meanK(s, s + span), 40); if (s0 < 0) continue;
        const want = heavy ? 22 : 12; let n = 0, gc = rng.range(-5, 5);
        for (let s = s0 + 14; s < s0 + span - 10 && n < want; s += heavy ? 18 : 24) {
          const hw = T.hw[idxOf(T, s)];
          gc = clamp(gc + rng.range(-8, 8), -hw + 5.5, hw - 5.5);
          const gapHalf = heavy ? 4.2 : 5;
          // left region [-hw, gc-gapHalf], right region [gc+gapHalf, hw]
          for (const side of [-1, 1]) {
            const a = side < 0 ? -hw + 0.5 : gc + gapHalf, b = side < 0 ? gc - gapHalf : hw - 0.5;
            const room = b - a; if (room < 2.8) continue;
            if (rng() < (heavy ? 0.85 : 0.6)) {
              const r = fmin(room / 2, rng.range(1.5, 2.7));
              const x = rng.range(a + r, b - r);
              T.rocks.push({ s: s + rng.range(-3, 3), x, h: rng.range(1.0, 2.0), r, seed: 1 + Math.floor(rng() * 9), spin: rng.range(-1, 1), hitT: new Float64Array(16).fill(-9) });
              n++;
            }
          }
        }
      } else if (name === 'arches') {
        const span = 210, s0 = pick(span, s => rng() * 0.01, 20); if (s0 < 0) continue;
        for (let k = 0; k < 9; k++) T.arches.push({ s: s0 + k * 26, c: k });
      }
    }
    T._reserved = reserved;
    T._free = free;
  }
  function placePads(T, def, rng) {
    const L = T.L, free = T._free, reserved = T._reserved;
    // recharge strip: one per lap, to the side of the racing line
    for (let tries = 0, s = 0.36 * L; tries < 60; tries++, s += 37) {
      const ss = mod(s, L - 400) + 200;
      if (!free(ss - 10, ss + 110)) continue;
      let m = 0; for (let k = 0; k <= 100; k += 10) m += T.line[idxOf(T, ss + k)];
      const side = m > 1 ? -1 : m < -1 ? 1 : (rng() < 0.5 ? -1 : 1);
      T.strips.push({ s0: ss, s1: ss + 100, x: side * (TUNE.hw - 3.4), w: 5 });
      reserved.push([ss - 10, ss + 110]);
      break;
    }
    // boost pads on the racing line at the exits of corners
    const n = def.pads || 6, minGap = fmax(160, L / (n + 2));
    const cands = [];
    for (let s = 180; s < L - 260; s += 10) {
      if (!free(s - 6, s + 14)) continue;
      const kNow = Math.abs(T.kap[idxOf(T, s)]), kPrev = Math.abs(T.kap[idxOf(T, s - 50)]);
      cands.push({ s, sc: kNow * 2 - kPrev + rng() * 0.002 });
    }
    cands.sort((a, b) => a.sc - b.sc);
    for (const c of cands) {
      if (T.pads.length >= n) break;
      if (T.pads.some(p => Math.abs(p.s - c.s) < minGap)) continue;
      const hw = T.hw[idxOf(T, c.s)];
      T.pads.push({ s: c.s, x: clamp(T.line[idxOf(T, c.s + 4)], -hw + 4, hw - 4), len: 8, w: 5 });
    }
    T.pads.sort((a, b) => a.s - b.s);
  }

  // Frame lookup (interpolated) -----------------------------------------------------------------
  function mkFrame() { return floats({ p: new V3(), f: new V3(), r: new V3(), u: new V3(), k: 0, hw: TUNE.hw, pipe: 0, lift: 0, gap: 0, line: 0 }, ['gap']); }
  // (called many times per skiff per step: the wrap and the four vector lerps are written out, so no double is
  // handed to a helper call, which the mid-tier compiler boxes)
  // The per-step callers hand the track distance (and surface()'s x / h) over in _FA, a typed array: a number read
  // from a skiff field or computed and passed as an argument to a call that is not inlined (these are too big to be)
  // was boxed, ~10 small objects per skiff per step. frameAt / surface / across keep their argument forms for the
  // rest. _FA[0] = s, [1] = x, [2] = h.
  const _FA = new Float64Array(3);
  function frameAt(T, s, o) { _FA[0] = s; return frameAtR(T, o); }
  function frameAtR(T, o) {
    let f = _FA[0] / T.ds; if (f < 0 || f >= T.N) f -= Math.floor(f / T.N) * T.N;   // (no % on doubles: a generic, boxing op in the mid tier)
    const fl = Math.floor(f), i0 = fl % T.N, i1 = (i0 + 1) % T.N, t = f - fl, a = i0 * 3, b = i1 * 3;
    const P = T.pos, F = T.fwd, Rt = T.right, Up = T.up, op = o.p, of = o.f, or = o.r, ou = o.u;
    op.x = P[a] + (P[b] - P[a]) * t; op.y = P[a + 1] + (P[b + 1] - P[a + 1]) * t; op.z = P[a + 2] + (P[b + 2] - P[a + 2]) * t;
    of.x = F[a] + (F[b] - F[a]) * t; of.y = F[a + 1] + (F[b + 1] - F[a + 1]) * t; of.z = F[a + 2] + (F[b + 2] - F[a + 2]) * t; of.normalize();
    or.x = Rt[a] + (Rt[b] - Rt[a]) * t; or.y = Rt[a + 1] + (Rt[b + 1] - Rt[a + 1]) * t; or.z = Rt[a + 2] + (Rt[b + 2] - Rt[a + 2]) * t; or.normalize();
    ou.x = Up[a] + (Up[b] - Up[a]) * t; ou.y = Up[a + 1] + (Up[b + 1] - Up[a + 1]) * t; ou.z = Up[a + 2] + (Up[b + 2] - Up[a + 2]) * t; ou.normalize();
    o.k = T.kap[i0] + (T.kap[i1] - T.kap[i0]) * t; o.hw = T.hw[i0] + (T.hw[i1] - T.hw[i0]) * t;
    o.pipe = T.pipe[i0] + (T.pipe[i1] - T.pipe[i0]) * t; o.lift = T.lift[i0] + (T.lift[i1] - T.lift[i0]) * t;
    o.line = T.line[i0] + (T.line[i1] - T.line[i0]) * t; o.gap = T.gap[i0] | T.gap[i1];
    return o;
  }
  // World point on the (possibly curved) road profile at lateral x, height h above the surface.
  function surface(fr, x, h, outP, outN) { _FA[1] = x; _FA[2] = h; return surfaceR(fr, outP, outN); }
  function surfaceR(fr, outP, outN) {
    const x = _FA[1], h = _FA[2];
    if (fr.pipe > 0.003) {
      const R = fr.hw / (fr.pipe * Math.PI / 2), a = x / R, sa = Math.sin(a), ca = Math.cos(a);
      outN.copy(fr.u).multiplyScalar(ca).addScaledVector(fr.r, -sa);
      outP.copy(fr.p).addScaledVector(fr.r, R * sa).addScaledVector(fr.u, R * (1 - ca)).addScaledVector(outN, h);
    } else {
      outN.copy(fr.u);
      outP.copy(fr.p).addScaledVector(fr.r, x).addScaledVector(fr.u, h);
    }
    return outP;
  }
  // Direction across the road surface at x (the profile tangent).
  function across(fr, x, out) { _FA[1] = x; return acrossR(fr, out); }
  function acrossR(fr, out) {
    if (fr.pipe > 0.003) {
      const R = fr.hw / (fr.pipe * Math.PI / 2), a = _FA[1] / R, c = Math.cos(a), s = Math.sin(a), rr = fr.r, u = fr.u;
      out.x = rr.x * c + u.x * s; out.y = rr.y * c + u.y * s; out.z = rr.z * c + u.z * s;
      return out;
    }
    return out.copy(fr.r);
  }

  function getTrack(id) {
    const def = trackDef(id) || TRACKS[0];
    const key = def.id + (def.daily ? ':' + def.daily : '');
    let T = trackCache.get(key);
    if (!T) { T = buildTrack(def); trackCache.set(key, T); }
    return T;
  }

  // ------------------------------------------------------------------ medals, records, unlocks
  // Medal targets come from a per-track par: the 3-lap time of a clean autopilot (racing line, perfect
  // start, boost whenever energy > 45, items used; no drifting / rings / strip routing), measured with
  // test/scenarios/qa_race_medals.js in Breeze and Comet (other classes interpolate in log k).
  // Gold = par +1.5% (clean, well-boosted run), Platinum = par −1.5% (needs drift boosts, pads, ring
  // chains or trick boosts on top), Silver +10% (clean run without boosting), Bronze +25% (finish).
  // Auto-steer flies 3.5% slower, so it tops out around Silver. (Old GDD formula gave Platinum to the
  // autopilot by ~8%.) Tracks without a par (daily) use a curvature-free estimate. The Comet pars of Mesa
  // and Glowcap were re-measured from clean laps (the first measurement included asteroid crashes, which
  // let auto-steer and no-boost runs reach Gold in Storm/Comet there).
  const MEDAL_K = { platinum: 0.985, gold: 1.015, silver: 1.10, bronze: 1.25 };
  function parTime(id, cls) {
    const def = trackDef(id) || TRACKS[0], k = CLASSES[cls] || 1;
    let pb, pc;
    if (def.par) { pb = def.par[0]; pc = def.par[1]; }
    else { pb = 0.925 * 3 * getTrack(id).L / TUNE.top; pc = pb / Math.pow(1.45, 0.9); }
    // Gale/Storm: log-k interpolation bent slightly toward the faster times. Measured clean runs scale
    // more steeply with speed at low k than at high k (time ∝ k^-0.94 at Gale vs k^-0.84 overall on
    // Glowcap, similar on the others), so a straight line in log k left those classes ~1% too loose
    // (no-boost runs reached Gold, clean boosted runs Platinum).
    const lk = Math.log(k), L45 = Math.log(1.45);
    return pb * Math.exp(lk * (Math.log(pc / pb) / L45 - 0.11 * (1 - lk / L45)));
  }
  function medalTimes(id, cls) {
    const par = parTime(id, cls);
    return { platinum: par * MEDAL_K.platinum, gold: par * MEDAL_K.gold, silver: par * MEDAL_K.silver, bronze: par * MEDAL_K.bronze, par };
  }
  function medalFor(id, cls, time) {
    const m = medalTimes(id, cls);
    return time <= m.platinum ? 4 : time <= m.gold ? 3 : time <= m.silver ? 2 : time <= m.bronze ? 1 : 0;
  }
  function raceSave() {
    const p = G.Save && G.Save.data ? G.Save.prof : null;
    if (!p) return null;
    if (!p.race || typeof p.race !== 'object') p.race = {};
    if (!p.race.rec) p.race.rec = {};
    return p.race;
  }
  function record(id, cls) { const rs = raceSave(); return rs ? rs.rec[id + ':' + (cls || 'breeze')] || null : null; }
  function isTrackUnlocked(id) {
    const d = trackDef(id); if (!d) return false;
    const P = G.Progress;
    if (P && P.isUnlocked && G.Data && G.Data.TRACKS && G.Data.TRACKS[id]) { try { return !!P.isUnlocked('track_' + id); } catch (e) { /* fall through */ } }
    const prof = G.Save && G.Save.data ? G.Save.prof : null, rank = prof && prof.rank;
    if (d.pr) return !(rank && typeof rank.pr === 'number') || rank.pr >= d.pr;
    if (!d.star || d.star <= 2) return true;               // the Hangar itself opens at ★2
    return !(rank && typeof rank.guild === 'number') || rank.guild >= d.star;
  }
  // The GDD gives skiff styles no unlock rules (they are cosmetic); a progress module may add 'ship_<style>'.
  function isShipUnlocked(style) {
    const P = G.Progress;
    if (P && P.shipUnlocked) { try { return !!P.shipUnlocked(style); } catch (e) { /* fall through */ } }
    return SHIPS.includes(style);
  }
  function isClassUnlocked(c) {
    if (c === 'breeze') return true;
    const P = G.Progress;
    if (P && P.isUnlocked) { try { return !!P.isUnlocked('class_' + c); } catch (e) { /* fall through */ } }
    const prof = G.Save && G.Save.data ? G.Save.prof : null;
    return !!(prof && prof.unlocks && Array.isArray(prof.unlocks.classes) && prof.unlocks.classes.includes(c));
  }
  function fmt(sec) {
    if (!(sec >= 0) || !isFinite(sec)) return '--:--.--';
    const m = Math.floor(sec / 60), r = sec - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2);
  }
  // Ghost: 10 Hz samples of (s Uint16, x Int8, h Uint8) -> base64 (~2 KB per lap).
  function encodeGhost(samples, L) {
    const n = samples.length / 3, b = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const s = Math.round(mod(samples[i * 3], L) / L * 65535), x = clamp(Math.round(samples[i * 3 + 1] * 6), -127, 127), h = clamp(Math.round(samples[i * 3 + 2] * 10), 0, 255);
      b[i * 4] = s & 255; b[i * 4 + 1] = s >> 8; b[i * 4 + 2] = x & 255; b[i * 4 + 3] = h;
    }
    let str = ''; for (let i = 0; i < b.length; i += 4096) str += String.fromCharCode.apply(null, b.subarray(i, i + 4096));
    return btoa(str);
  }
  function decodeGhost(b64, L) {
    try {
      const str = atob(b64), n = Math.floor(str.length / 4), out = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const s = str.charCodeAt(i * 4) | (str.charCodeAt(i * 4 + 1) << 8);
        let x = str.charCodeAt(i * 4 + 2); if (x > 127) x -= 256;
        out[i * 3] = s / 65535 * L; out[i * 3 + 1] = x / 6; out[i * 3 + 2] = str.charCodeAt(i * 4 + 3) / 10;
      }
      return out;
    } catch (e) { return null; }
  }

  // ------------------------------------------------------------------ art (Geo kit with stand-ins)
  const geoCache = new Map();
  function cachedGeo(key, make) { let g = geoCache.get(key); if (!g) { g = make(); if (g) g.userData.shared = true; geoCache.set(key, g); } return g; }
  function bakeParts(obj) {
    // -> {solid, glow} geometries in obj-local space (vertex colours, root scale applied), or null.
    if (!G.Geo || !G.Geo.bake || !obj) return null;
    const m = G.Geo.bake(obj);
    const has = g => g && g.attributes.position && g.attributes.position.count > 0;
    const solid = m.material && !m.material.isMeshBasicMaterial && has(m.geometry) ? m.geometry : null;
    let glow = !solid && has(m.geometry) ? m.geometry : null;
    for (const ch of m.children) if (ch.isMesh && ch.userData.glow && has(ch.geometry)) glow = ch.geometry;
    const sc = m.scale;
    for (const g of [solid, glow]) if (g) { if (sc.x !== 1 || sc.y !== 1 || sc.z !== 1) g.scale(sc.x, sc.y, sc.z); g.userData.shared = true; }
    return { solid, glow };
  }
  function vcColorize(geo, hex) { if (G.Geo && G.Geo.colorize) return G.Geo.colorize(geo, hex); const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
  function mergeGeos(list) {
    if (G.Geo && G.Geo.merge) return G.Geo.merge(list);
    return list[0];
  }
  // Stand-in skiff (GDD: capsule fuselage, swept wings, twin glowing nacelles, cockpit bubble).
  function fallbackShip(style, col) {
    const sol = [], glo = [];
    const wide = style === 'manta' ? 1.35 : style === 'needle' ? 0.75 : style === 'bulky' ? 1.15 : 1;
    const long = style === 'needle' ? 1.25 : style === 'bulky' ? 0.9 : 1;
    const body = new THREE.CapsuleGeometry(style === 'bulky' ? 0.6 : 0.45, 2.2 * long, 4, 10).rotateX(Math.PI / 2); body.deleteAttribute('uv'); sol.push(vcColorize(body, col.main));
    const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0.6); wingShape.lineTo(1.7 * wide, -0.7); wingShape.lineTo(1.5 * wide, -1.05); wingShape.lineTo(0, -0.7); wingShape.closePath();
    for (const sd of [-1, 1]) {
      const w = new THREE.ExtrudeGeometry(wingShape, { depth: 0.14, bevelEnabled: false }); w.deleteAttribute('uv');
      w.rotateX(Math.PI / 2); w.scale(sd, 1, 1); w.translate(0, 0, 0); sol.push(vcColorize(w, col.accent));
      const nac = new THREE.CylinderGeometry(0.26, 0.3, 1.3, 10).rotateX(Math.PI / 2); nac.deleteAttribute('uv'); nac.translate(sd * 0.85 * wide, -0.05, -0.55); sol.push(vcColorize(nac, col.main));
      const noz = new THREE.CircleGeometry(0.22, 10).rotateY(Math.PI); noz.deleteAttribute('uv'); noz.translate(sd * 0.85 * wide, -0.05, -1.21); glo.push(vcColorize(noz, col.glow));
    }
    const cock = new THREE.SphereGeometry(0.36, 12, 8, 0, TAU, 0, Math.PI / 2); cock.deleteAttribute('uv'); cock.scale(1, 0.9, 1.6); cock.translate(0, 0.28, 0.35); sol.push(vcColorize(cock, 0x9ff6ff));
    const fin = new THREE.BoxGeometry(0.08, 0.6, 0.6); fin.deleteAttribute('uv'); fin.translate(0, 0.45, -0.9); sol.push(vcColorize(fin, col.accent));
    const ng = mergeGeos(sol), gg = mergeGeos(glo);
    return { solid: ng, glow: gg, engines: [new V3(-0.85 * wide, -0.05, -1.25), new V3(0.85 * wide, -0.05, -1.25)], len: 3.2, span: 1.6 * wide, wingZ: -0.8 };
  }
  function shipArt(style, col) {
    const key = 'ship|' + style + '|' + col.main + '|' + col.accent + '|' + col.glow;
    let c = geoCache.get(key);
    if (c) return c;
    c = null;
    if (G.Geo && G.Geo.ship && G.Geo.bake) {
      try {
        const sh = G.Geo.ship(style, col);
        const g = sh.group;
        g.updateMatrixWorld(true);
        const engines = [];
        if (sh.parts && sh.parts.engines) for (const e of sh.parts.engines) { const p = new V3(); e.getWorldPosition(p); p.z -= 0.25; engines.push(p); }
        const bb = new THREE.Box3().setFromObject(g);
        const parts = bakeParts(g);
        if (sh.dispose) G.safe('ship dispose', () => sh.dispose());
        if (parts && (parts.solid || parts.glow)) {
          c = { solid: parts.solid, glow: parts.glow, engines: engines.length ? engines : [new V3(-0.6, 0, bb.min.z), new V3(0.6, 0, bb.min.z)], len: bb.max.z - bb.min.z, tail: bb.min.z, span: fmax(-bb.min.x, bb.max.x) * 0.95, wingZ: bb.min.z * 0.35 };
        }
      } catch (e) { console.warn('[race] ship art fallback', e && e.message); c = null; }
    }
    if (!c) { const f = fallbackShip(style, col); f.solid.userData.shared = true; if (f.glow) f.glow.userData.shared = true; c = Object.assign(f, { tail: -1.4 }); }
    geoCache.set(key, c);
    return c;
  }
  function propGeo(kind, a, b) {
    return cachedGeo('prop|' + kind + '|' + a + '|' + b, () => {
      const SP = G.Geo && G.Geo.spaceProps;
      if (SP && SP[kind] && kind !== 'itemBox') {
        try {
          const o = kind === 'asteroid' ? SP.asteroid(1, a) : SP.ringGate(a, b);
          const parts = bakeParts(o);
          if (parts && parts.solid) { if (parts.glow) parts.solid.userData.glowGeo = parts.glow; return parts.solid; }
          if (parts && parts.glow) { parts.glow.userData.unlit = true; return parts.glow; }
        } catch (e) { console.warn('[race] prop fallback', kind, e && e.message); }
      }
      if (kind === 'asteroid') {
        const g = G.Geo && G.Geo.blob ? G.Geo.blob(1, 1, 0.35, a, { sy: 0.8 }) : new THREE.IcosahedronGeometry(1, 1);
        return vcColorize(g, 0xffffff);
      }
      if (kind === 'ringGate') return vcColorize(new THREE.TorusGeometry(a, 0.75, 8, 56), b);
      // item box: rounded cube + star
      const box = G.Geo && G.Geo.roundedBox ? G.Geo.roundedBox(2.2, 2.2, 2.2, 0.45, 2) : new THREE.BoxGeometry(2.2, 2.2, 2.2);
      return vcColorize(box, 0xb983ff);
    });
  }

  // ------------------------------------------------------------------ shaders
  // Race materials persist across races (flagged shared so world disposal skips them): shader
  // programs stay compiled, so Retry / next track never re-links them.
  const matCache = new Map();
  function cachedMat(key, make) { let m = matCache.get(key); if (!m) { m = make(); m.userData.shared = true; if (m.map) m.map.userData.shared = true; matCache.set(key, m); } return m; }
  const FADE_VS = 'uniform float uNear, uFar; varying float vFade;';
  // Additive vertex-coloured strips (rails, pylons, trails): fade to black with distance and near the camera.
  const RAIL_MAT = (n0, n1) => cachedMat('rail|' + n0 + '|' + n1, () => new THREE.ShaderMaterial({
    uniforms: { uNear: { value: 300 }, uFar: { value: 1500 }, uN0: { value: n0 || 0 }, uN1: { value: n1 || 0.01 }, uTime: { value: 0 } },
    vertexShader: 'attribute vec3 aCol; uniform float uN0, uN1; varying vec3 vC; ' + FADE_VS + ' void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position,1.0); vFade = (1.0 - smoothstep(uNear, uFar, -mv.z)) * smoothstep(uN0, uN1, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; varying float vFade; void main(){ gl_FragColor = vec4(vC * vFade, 1.0);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  }));
  // Rails and pylons: as RAIL_MAT plus runway-light pulses chasing forward along the track (aS = track
  // distance), a little faster than Breeze top speed, so the edges of the road visibly stream past.
  const RAILP_MAT = (n0, n1) => cachedMat('railp|' + n0 + '|' + n1, () => new THREE.ShaderMaterial({
    uniforms: { uNear: { value: 300 }, uFar: { value: 1500 }, uN0: { value: n0 }, uN1: { value: n1 }, uTime: { value: 0 } },
    vertexShader: 'attribute vec3 aCol; attribute float aS; uniform float uN0, uN1; varying vec3 vC; varying float vS; ' + FADE_VS + ' void main(){ vC = aCol; vS = aS; vec4 mv = modelViewMatrix * vec4(position,1.0); vFade = (1.0 - smoothstep(uNear, uFar, -mv.z)) * smoothstep(uN0, uN1, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uTime; varying vec3 vC; varying float vS; varying float vFade; void main(){ float p = max(0.0, sin(vS * 0.105 - uTime * 8.5)); p *= p; p *= p; p *= p; gl_FragColor = vec4(vC * vFade * (0.82 + p * 1.5), 1.0);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  }));
  // Road: the canvas texture (vertex-colour lit) plus a soft wave of light that runs forward over its
  // bright parts (chevrons, edge bands) — the guide chevrons read as "this way!" even on a still frame.
  // Ultra (SUN_SHADOW, see syncRoadShadow): the road receives the sun shadows of the skiffs, rocks, gates and arches, in
  // a cool shade tinted like the house toon shadow but deeper (~40 %: the road is dark and unlit, a toon-strength shade
  // barely showed on it; the road itself never casts). The world position comes from
  // the vertex stage, the normal from screen derivatives (flat per pixel; flipped toward the sun since the road is
  // double-sided and unlit — only what stands between it and the sun matters).
  const ROAD_SHADOW_FS = '\n#ifdef SUN_SHADOW\n' +
    'if (uSunOn > 0.0) { vec3 rn = normalize(cross(dFdx(vRWP), dFdy(vRWP))); float rl = dot(rn, uSunDir); if (rl < 0.0) { rn = -rn; rl = -rl; }' +
    ' float sv = mix(1.0, sunVis(vRWP, rn, rl), uSunOn); outgoingLight *= mix(0.3 + uShadow * 0.52, vec3(1.0), sv); }\n#endif\n';
  const ROAD_MAT = (theme, key) => cachedMat('road|' + key, () => {
    const m = new THREE.MeshBasicMaterial({ map: roadTexture(theme), vertexColors: true, side: THREE.DoubleSide, fog: true });
    const uT = m.userData.uTime = { value: 0 };
    m.defines = {};
    m.onBeforeCompile = sh => {
      const L = G.R.light;
      sh.uniforms.uTime = uT;
      for (const k of ['uSunMap', 'uSunMat', 'uSunP', 'uSunOn', 'uShadowPass', 'uSunDir', 'uShadow']) sh.uniforms[k] = L[k];
      sh.vertexShader = '#ifdef SUN_SHADOW\nvarying vec3 vRWP;\n#endif\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n#ifdef SUN_SHADOW\nvRWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
      sh.fragmentShader = 'uniform float uTime;\n#ifdef SUN_SHADOW\nvarying vec3 vRWP; uniform vec3 uSunDir, uShadow;\n#endif\n#include <mr_sunshadow_pars_fragment>\n' +
        sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n#ifdef USE_MAP\n' +
        '{ float lum = max(sampledDiffuseColor.r, max(sampledDiffuseColor.g, sampledDiffuseColor.b)); float w = 0.5 + 0.5 * sin(vMapUv.y * 3.14159 - uTime * 5.2); w = w * w; w *= w;' +
        ' diffuseColor.rgb += sampledDiffuseColor.rgb * smoothstep(0.5, 0.85, lum) * w * 0.75; }\n#endif')
          .replace('#include <opaque_fragment>', ROAD_SHADOW_FS + '#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => 'race-road-pulse';
    return m;
  });
  // The road is a MeshBasicMaterial (not a house ShaderMaterial), so syncToon does not see it: its SUN_SHADOW define
  // follows the tier at each race build instead (a mid-race tier change takes effect on the next race; with shadows
  // off uSunOn is 0 and the branch is skipped).
  function syncRoadShadow(m) {
    const want = 'SUN_SHADOW' in G.R.toonDefines(), d = m.defines || (m.defines = {});
    if (want === ('SUN_SHADOW' in d)) return;
    if (want) d.SUN_SHADOW = ''; else delete d.SUN_SHADOW;
    m.needsUpdate = true;
  }
  const DECAL_MAT = () => cachedMat('decal', () => new THREE.ShaderMaterial({
    uniforms: { uNear: { value: 300 }, uFar: { value: 1500 }, uTime: { value: 0 }, uFog: { value: new THREE.Color() } },
    vertexShader: 'attribute vec2 aUv; attribute float aType; attribute float aLen; varying vec2 vUv; varying float vType; varying float vLen; ' + FADE_VS +
      ' void main(){ vUv = aUv; vType = aType; vLen = aLen; vec4 mv = modelViewMatrix * vec4(position,1.0); vFade = 1.0 - smoothstep(uNear, uFar, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: [
      'uniform float uTime; uniform vec3 uFog; varying vec2 vUv; varying float vType; varying float vLen; varying float vFade;',
      'float chev(vec2 p, float rate, float bend){ float c = fract(p.y * 0.42 - abs(p.x - 0.5) * bend - uTime * rate); return smoothstep(0.0, 0.08, c) * (1.0 - smoothstep(0.42, 0.5, c)); }',
      'void main(){ vec2 p = vec2(vUv.x, vUv.y * vLen); vec3 col; float a;',
      ' float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);',
      ' if (vType < 0.5) { float c = chev(p, 2.4, 1.1); col = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.95, 0.45), c); a = 0.6 + 0.38 * c; a *= 0.35 + 0.65 * edge; col += (1.0 - edge) * vec3(1.0, 0.9, 0.5); }',
      ' else if (vType < 1.5) { float st = 0.5 + 0.5 * sin(p.y * 1.4 - uTime * 7.0); float plus = step(0.8, st); col = mix(vec3(1.0, 0.35, 0.68), vec3(1.0, 0.85, 0.95), plus); a = (0.45 + 0.4 * st) * (0.5 + 0.5 * edge); }',
      ' else if (vType < 2.5) { float d = fract((p.y + vUv.x * 6.0) * 0.18 - uTime * 0.6); col = mix(vec3(1.0, 0.45, 0.75), vec3(0.6, 1.0, 0.9), step(0.5, d)); a = 0.16 + 0.1 * edge; }',
      ' else if (vType < 3.5) { vec2 q = floor(vec2(vUv.x * 12.0, p.y * 1.0)); float ck = mod(q.x + q.y, 2.0); col = mix(vec3(0.12, 0.1, 0.3), vec3(1.0), ck); a = 0.92; }',
      ' else if (vType < 4.5) { float pu = 0.6 + 0.4 * sin(uTime * 6.0 + vUv.x * 18.0); col = vec3(0.5, 0.95, 1.0) * pu + 0.2; a = 0.75 * (1.0 - abs(vUv.y - 0.5) * 2.0); }',
      ' else if (vType < 5.5) { float c = chev(p, 1.6, 5.0); col = mix(vec3(0.15, 0.1, 0.3), vec3(1.0, 0.82, 0.2), c); a = 0.92; }',
      ' else if (vType < 6.5) { float c = chev(p, 1.2, 5.0); col = vec3(0.45, 0.95, 1.0); a = 0.25 + 0.55 * c; }',
      // 7 / 8: corner warning strip on the outside edge, chevrons point into the turn and flow toward it
      ' else { float u = vType < 7.5 ? vUv.x : 1.0 - vUv.x; float sv = abs(fract(p.y * 0.3) - 0.5);',
      '   float c = fract(u * 1.15 - sv * 1.5 + uTime * 1.4); float band = smoothstep(0.0, 0.07, c) * (1.0 - smoothstep(0.34, 0.41, c));',
      '   col = mix(vec3(0.12, 0.1, 0.3), vec3(1.0, 0.86, 0.25), band); a = 0.86 * (0.55 + 0.45 * edge); }',
      ' col = mix(uFog, col, vFade); a *= mix(0.4, 1.0, vFade);',
      ' gl_FragColor = vec4(col, a);',
      '#include <colorspace_fragment>',
      '}'].join('\n'),
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  }));
  // Camera-facing glow quads (one draw call): engine flames, nebula puffs, star glows.
  const _BA = new Float64Array(2);
  class Billboards {
    constructor(cap, opts) {
      opts = opts || {};
      this.cap = cap; this.n = 0;
      const g = new THREE.BufferGeometry();
      this.pos = new Float32Array(cap * 12); this.cor = new Float32Array(cap * 8); this.size = new Float32Array(cap * 4); this.col = new Float32Array(cap * 16);
      const idx = new (cap * 4 > 65535 ? Uint32Array : Uint16Array)(cap * 6);
      for (let i = 0; i < cap; i++) {
        const c = [-1, -1, 1, -1, 1, 1, -1, 1]; for (let k = 0; k < 8; k++) this.cor[i * 8 + k] = c[k];
        idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
      }
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aCorner', new THREE.BufferAttribute(this.cor, 2));
      g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0);
      this.geo = g;
      this.mat = cachedMat('bb|' + (opts.key || ''), () => new THREE.ShaderMaterial({
        uniforms: { uMap: { value: G.R.glowTex() }, uNear: { value: opts.near || 1e5 }, uFar: { value: opts.far || 2e5 } },
        vertexShader: 'attribute vec2 aCorner; attribute float aSize; attribute vec4 aCol; varying vec2 vUv; varying vec4 vC; ' + FADE_VS +
          ' void main(){ vUv = aCorner * 0.5 + 0.5; vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFade = 1.0 - smoothstep(uNear, uFar, -mv.z); mv.xy += aCorner * aSize; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; varying vec4 vC; varying float vFade; void main(){ vec4 t = texture2D(uMap, vUv); gl_FragColor = vec4(vC.rgb * t.a * vC.a * vFade, 1.0);\n#include <colorspace_fragment>\n}',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }));
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = opts.order || 6;
    }
    reset() { this.n = 0; }
    // addV(v, color): position from a vector, size / alpha from _BA[0] / _BA[1] (the per-frame engine glows: numbers
    // handed over as arguments were boxed whenever the call was not inlined into racerFx). It does the writing itself
    // (it used to forward five numbers to add(), a call too big to inline: boxed again, ~20 objects per skiff per
    // frame), and the colour comes from colRGB (Color.setHex ran the sRGB conversion, more boxed numbers, per quad).
    addV(v, color) {
      if (this.n >= this.cap) return;
      const i = this.n++, c = colRGB(color), x = v.x, y = v.y, z = v.z, size = _BA[0], a = _BA[1];
      const P = this.pos, S = this.size, C = this.col, cr = c[0], cg = c[1], cb = c[2];
      for (let k = 0; k < 4; k++) {
        const o = i * 12 + k * 3, q = i * 16 + k * 4;
        P[o] = x; P[o + 1] = y; P[o + 2] = z;
        S[i * 4 + k] = size;
        C[q] = cr; C[q + 1] = cg; C[q + 2] = cb; C[q + 3] = a;
      }
    }
    add(x, y, z, size, color, a) { _bbV.set(x, y, z); _BA[0] = size; _BA[1] = a; this.addV(_bbV, color); }
    commit() {
      const g = this.geo;
      g.setDrawRange(0, this.n * 6);
      g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aCol.needsUpdate = true;
    }
  }
  // Camera-facing streaks (one draw call): each is a soft blade from head to tail, `w` wide, with a
  // white-hot core at the head fading out toward the tail. Engine flames, blaster bolts, boost streaks.
  // The quad is widened perpendicular to both the streak and the view ray (in view space), so it keeps
  // its width from any angle; seen end-on it collapses to a round glow.
  class Flares {
    constructor(cap) {
      this.cap = cap; this.n = 0;
      this.head = new Float32Array(cap * 12); this.tail = new Float32Array(cap * 12); this.wid = new Float32Array(cap * 4); this.col = new Float32Array(cap * 16);
      const cor = new Float32Array(cap * 8), idx = new Uint16Array(cap * 6), C = [-1, 0, 1, 0, 1, 1, -1, 1];
      for (let i = 0; i < cap; i++) {
        for (let k = 0; k < 8; k++) cor[i * 8 + k] = C[k];
        idx[i * 6] = i * 4; idx[i * 6 + 1] = i * 4 + 1; idx[i * 6 + 2] = i * 4 + 2; idx[i * 6 + 3] = i * 4; idx[i * 6 + 4] = i * 4 + 2; idx[i * 6 + 5] = i * 4 + 3;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(this.head, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aTail', new THREE.BufferAttribute(this.tail, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aCorner', new THREE.BufferAttribute(cor, 2));
      g.setAttribute('aW', new THREE.BufferAttribute(this.wid, 1).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0);
      this.geo = g;
      this.mat = cachedMat('flares', () => new THREE.ShaderMaterial({
        vertexShader: [
          'attribute vec3 aTail; attribute vec2 aCorner; attribute float aW; attribute vec4 aCol; varying vec2 vUv; varying vec4 vC;',
          'void main(){',
          '  vec3 h = (modelViewMatrix * vec4(position, 1.0)).xyz, t = (modelViewMatrix * vec4(aTail, 1.0)).xyz;',
          '  vec3 p = mix(h, t, aCorner.y), ax = t - h; float L = length(ax);',
          '  vec3 sd = cross(L > 1e-4 ? ax / L : vec3(0.0, 0.0, 1.0), normalize(p)); float sl = length(sd);',
          '  sd = sl > 0.05 ? sd / sl : vec3(1.0, 0.0, 0.0);',
          '  vec3 dir = L > 1e-4 ? ax / L : vec3(0.0, 1.0, 0.0);',
          // round off the head: push it forward by half a width
          '  p += sd * aCorner.x * aW * (1.0 - 0.6 * aCorner.y) - dir * (1.0 - aCorner.y) * aW * 0.5;',
          '  vUv = vec2(aCorner.x, aCorner.y); vC = aCol;',
          '  gl_Position = projectionMatrix * vec4(p, 1.0);',
          '}'].join('\n'),
        fragmentShader: [
          'varying vec2 vUv; varying vec4 vC;',
          'void main(){',
          '  float x = abs(vUv.x), y = vUv.y;',
          '  float a = (1.0 - x * x) * smoothstep(0.0, 0.1, y + 0.04) * pow(1.0 - y, 1.8) * vC.a;',
          '  float c = max(0.0, 1.0 - x * 2.0), core = c * c * pow(1.0 - y, 4.0);',
          '  gl_FragColor = vec4(mix(vC.rgb, vec3(1.0), clamp(core * 0.85, 0.0, 0.85)) * a, 1.0);',
          '#include <colorspace_fragment>',
          '}'].join('\n'),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }));
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 8;
    }
    reset() { this.n = 0; }
    // head / tail: Vector3 (world); w: half width; color hex; a: alpha. addV: w / a from _BA[0] / _BA[1] (see Billboards)
    // (addV does the writing itself and add() forwards to it: see Billboards.addV)
    addV(hd, tl, color) {
      if (this.n >= this.cap) return;
      const i = this.n++, c = colRGB(color), w = _BA[0], a = _BA[1], cr = c[0], cg = c[1], cb = c[2];
      const H = this.head, Tl = this.tail, Wd = this.wid, C = this.col;
      const hx = hd.x, hy = hd.y, hz = hd.z, tx = tl.x, ty = tl.y, tz = tl.z;
      for (let k = 0; k < 4; k++) {
        const o = i * 12 + k * 3;
        H[o] = hx; H[o + 1] = hy; H[o + 2] = hz;
        Tl[o] = tx; Tl[o + 1] = ty; Tl[o + 2] = tz;
        Wd[i * 4 + k] = w;
        const q = i * 16 + k * 4; C[q] = cr; C[q + 1] = cg; C[q + 2] = cb; C[q + 3] = a;
      }
    }
    add(hd, tl, w, color, a) { _BA[0] = w; _BA[1] = a; this.addV(hd, tl, color); }
    commit() {
      const g = this.geo;
      g.setDrawRange(0, this.n * 6);
      if (!this.n && this._was === 0) return;
      this._was = this.n;
      g.attributes.position.needsUpdate = true; g.attributes.aTail.needsUpdate = true; g.attributes.aW.needsUpdate = true; g.attributes.aCol.needsUpdate = true;
    }
  }
  const _col = new THREE.Color(), _white = new THREE.Color(0xffffff), _bbV = new V3();
  // Linear rgb of a hex colour, worked out once per colour (a handful per race: skiff glows, drift tiers, item colours).
  const _colCache = new Map();
  function colRGB(hex) {
    let c = _colCache.get(hex);
    if (!c) { _col.setHex(hex); c = new Float32Array(3); c[0] = _col.r; c[1] = _col.g; c[2] = _col.b; _colCache.set(hex, c); }
    return c;
  }

  // ------------------------------------------------------------------ world building
  function roadTexture(theme) {
    const tex = G.R.canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = theme.road; g.fillRect(0, 0, w, h);
      g.fillStyle = theme.road2;
      for (let y = 0; y < h; y += 128) g.fillRect(w * 0.08, y + 4, w * 0.84, 56);
      // lane dashes
      g.fillStyle = theme.lane; g.globalAlpha = 0.35;
      for (const fx of [1 / 3, 2 / 3]) for (let y = 0; y < h; y += 256) g.fillRect(fx * w - 2, y + 40, 4, 120);
      g.globalAlpha = 1;
      // chevrons (point up = forward)
      g.shadowColor = theme.chev; g.shadowBlur = 16; g.strokeStyle = theme.chev; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const y0 of [110, 366]) { g.beginPath(); g.moveTo(w * 0.36, y0 + 70); g.lineTo(w * 0.5, y0); g.lineTo(w * 0.64, y0 + 70); g.stroke(); }
      // edge glow bands
      g.shadowBlur = 0;
      const eg = g.createLinearGradient(0, 0, w * 0.1, 0);
      eg.addColorStop(0, theme.edge); eg.addColorStop(0.35, theme.edge); eg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = eg; g.fillRect(0, 0, w * 0.1, h);
      g.save(); g.translate(w, 0); g.scale(-1, 1); g.fillStyle = eg; g.fillRect(0, 0, w * 0.1, h); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.5)'; for (let y = 0; y < h; y += 64) { g.fillRect(w * 0.1, y, 3, 30); g.fillRect(w * 0.9 - 3, y, 3, 30); }
    }, { repeat: true });
    tex.anisotropy = fmin(8, G.R.renderer.capabilities.getMaxAnisotropy ? G.R.renderer.capabilities.getMaxAnisotropy() : 4);
    return tex;
  }
  const _fr = mkFrame(), _fr2 = mkFrame(), _P = new V3(), _N = new V3(), _A = new V3();
  function buildRoad(T, group) {
    const C = 6, chunks = 8, per = Math.ceil(T.N / chunks);
    const mat = ROAD_MAT(T.theme, T.def.theme);
    syncRoadShadow(mat);
    const sun = new V3(0.4, 0.85, 0.3).normalize();
    for (let c = 0; c < chunks; c++) {
      const i0 = c * per, i1 = fmin(T.N, (c + 1) * per); if (i1 <= i0) continue;
      const rows = i1 - i0 + 1, nv = rows * (C + 1);
      const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
      for (let ii = 0; ii < rows; ii++) {
        const i = i0 + ii, s = i * T.ds;
        frameAt(T, s, _fr);
        for (let j = 0; j <= C; j++) {
          const x = -_fr.hw + 2 * _fr.hw * j / C;
          surface(_fr, x, _fr.lift, _P, _N);
          const k = (ii * (C + 1) + j);
          pos[k * 3] = _P.x; pos[k * 3 + 1] = _P.y; pos[k * 3 + 2] = _P.z;
          const lit = 0.82 + 0.28 * fmax(0, _N.dot(sun)) + (_N.y < 0 ? -0.1 : 0);
          col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = lit;
          uv[k * 2] = j / C; uv[k * 2 + 1] = s / T.tile * 0.5;
        }
      }
      for (let ii = 0; ii < rows - 1; ii++) {
        const i = i0 + ii;
        if (T.gap[i % T.N] || T.gap[(i + 1) % T.N]) continue;
        for (let j = 0; j < C; j++) { const a = ii * (C + 1) + j, b = a + C + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.renderOrder = 1;
      group.add(m);
    }
    // glowing rails + pylons (additive, one geometry per chunk)
    const rmat = RAILP_MAT(2, 11);
    const ca = new THREE.Color(T.theme.rail[0]), cb = new THREE.Color(T.theme.rail[1]), cp = new THREE.Color(T.theme.pylon);
    for (let c = 0; c < chunks; c++) {
      const i0 = c * per, i1 = fmin(T.N, (c + 1) * per); if (i1 <= i0) continue;
      const P = [], Cc = [], I = [], S = [];
      let sNow = 0;
      const vert = (v, cc, k) => { P.push(v.x, v.y, v.z); Cc.push(cc.r * k, cc.g * k, cc.b * k); S.push(sNow); return P.length / 3 - 1; };
      for (const side of [-1, 1]) {
        const cc = side < 0 ? ca : cb;
        let prev = null;
        for (let i = i0; i <= i1; i++) {
          const s = i * T.ds; frameAt(T, s, _fr); sNow = s;
          if (T.gap[i % T.N]) { prev = null; continue; }
          surface(_fr, side * _fr.hw, _fr.lift, _P, _N);
          const a0 = vert(_P, cc, 0.38), a1 = vert(_A.copy(_P).addScaledVector(_N, 1.5), cc, 0.0);
          const b0 = vert(_A.copy(_P).addScaledVector(_N, 1.45), cc, 0.95), b1 = vert(_A.copy(_P).addScaledVector(_N, 1.75), cc, 0.95);
          if (prev) { I.push(prev[0], a0, prev[1], prev[1], a0, a1, prev[2], b0, prev[3], prev[3], b0, b1); }
          prev = [a0, a1, b0, b1];
          if (i % 12 === 0) {
            // pylon post
            across(_fr, side * _fr.hw, _A);
            const f = _fr.f;
            const p0 = _P.clone().addScaledVector(f, -0.18), p1 = _P.clone().addScaledVector(f, 0.18);
            const q0 = vert(p0, cp, 0.5), q1 = vert(p1, cp, 0.5), q2 = vert(p1.addScaledVector(_N, 2.4), cp, 0.05), q3 = vert(p0.addScaledVector(_N, 2.4), cp, 0.05);
            I.push(q0, q1, q2, q0, q2, q3);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(Cc, 3));
      g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
      g.setIndex(I); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, rmat); m.renderOrder = 7;
      group.add(m);
    }
    return { roadMat: mat, railMat: rmat };
  }
  function buildDecals(T, group) {
    const P = [], UV = [], TY = [], LN = [], I = [];
    const quad = (s0, s1, x0, x1, type, step) => {
      const len = s1 - s0, n = fmax(1, Math.ceil(len / (step || 4)));
      const base = P.length / 3;
      for (let k = 0; k <= n; k++) {
        const s = s0 + len * k / n; frameAt(T, s, _fr);
        for (const [x, u] of [[x0, 0], [x1, 1]]) {
          surface(_fr, x, _fr.lift + 0.05, _P, _N);
          P.push(_P.x, _P.y, _P.z); UV.push(u, k / n); TY.push(type); LN.push(len);
        }
      }
      for (let k = 0; k < n; k++) { const a = base + k * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    };
    for (const p of T.pads) quad(p.s, p.s + p.len, p.x - p.w / 2, p.x + p.w / 2, 0, 2);
    for (const st of T.strips) quad(st.s0, st.s1, st.x - st.w / 2, st.x + st.w / 2, 1, 4);
    quad(T.recovery[0], T.recovery[1], -TUNE.hw + 0.3, TUNE.hw - 0.3, 2, 6);
    quad(T.L - 2.5, T.L + 0.5, -TUNE.hw, TUNE.hw, 3, 1);
    for (const r of T.rows) { const hw = T.hw[idxOf(T, r.s)]; quad(r.s - 3.4, r.s - 2.4, -hw, hw, 4, 1); }
    for (const j of T.jumps) { quad(j.kick - 18, j.kick, -TUNE.hw + 0.5, TUNE.hw - 0.5, 5, 2); quad(j.g1, j.land, -TUNE.hw + 0.5, TUNE.hw - 0.5, 6, 3); }
    // corner warning strips along the outside edge, chevrons flowing into the turn (type 7 = left turn, 8 = right),
    // longer lead-in for medium / sharp corners; clipped around pads, the recharge strip, item rows, jumps and the line
    const cut = (segs, a, b) => { const o = []; for (const s of segs) { if (b <= s[0] || a >= s[1]) { o.push(s); continue; } if (a > s[0]) o.push([s[0], a]); if (b < s[1]) o.push([b, s[1]]); } return o; };
    for (const c of T.corners || []) {
      const side = c.dir > 0 ? 1 : -1;                       // left turn: the outside is the right edge (+x)
      let segs = [[c.s0 - (c.tier >= 2 ? 34 : 18), fmin(c.s1, c.apex + 24)]];
      for (const p of T.pads) if (fsign(p.x) === side && Math.abs(p.x) + p.w / 2 > TUNE.hw - 3.2) segs = cut(segs, p.s - 3, p.s + p.len + 3);
      for (const st of T.strips) if (fsign(st.x) === side) segs = cut(segs, st.s0 - 3, st.s1 + 3);
      for (const r of T.rows) segs = cut(segs, r.s - 72, r.s + 72);
      for (const j of T.jumps) segs = cut(segs, j.kick - 20, j.land + 2);
      segs = cut(cut(segs, T.L - 6, T.L + 4), -6, 4);
      const x0 = side > 0 ? TUNE.hw - 2.9 : -TUNE.hw + 0.4, x1 = side > 0 ? TUNE.hw - 0.4 : -TUNE.hw + 2.9;
      for (const sg of segs) if (sg[1] - sg[0] > 8) quad(sg[0], sg[1], x0, x1, side > 0 ? 7 : 8, 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aUv', new THREE.Float32BufferAttribute(UV, 2));
    g.setAttribute('aType', new THREE.Float32BufferAttribute(TY, 1)); g.setAttribute('aLen', new THREE.Float32BufferAttribute(LN, 1));
    g.setIndex(I); g.computeBoundingSphere();
    const mat = DECAL_MAT(); mat.uniforms.uFog.value.setHex(T.theme.fog);
    const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.frustumCulled = false;
    group.add(m);
    return mat;
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sc = new V3(), _X = new V3(), _Y = new V3(), _Z = new V3();
  // Matrix for an object sitting on the track at (s, x, h), facing forward, optionally scaled / spun.
  const _fr3 = mkFrame(), _P3 = new V3(), _N3 = new V3();
  function trackMatrix(T, s, x, h, scale, spinY, out) {
    frameAt(T, s, _fr3);
    surface(_fr3, x, h + _fr3.lift, _P3, _N3);
    _Z.copy(_fr3.f); _Y.copy(_N3); _X.crossVectors(_Y, _Z).normalize();
    out.makeBasis(_X, _Y, _Z);
    if (spinY) { _m4.makeRotationY(spinY); out.multiply(_m4); }
    out.scale(_sc.set(scale, scale, scale));
    out.setPosition(_P3);
    return out;
  }
  // Item boxes, gold rings and gauntlet rocks animate every frame on fixed spots of the track. Their frame (axes and
  // surface point) is worked out once per race (propBase, 12 numbers per prop) and each frame's matrix is written
  // straight into the instance buffer (propWrite: basis × spin about the local up axis × scale, raised along the
  // local up), with the same result as trackMatrix. trackMatrix per prop per frame handed half a dozen fresh doubles
  // to helper calls each time, boxed by the mid-tier compiler: ~5 KB of garbage per frame. Per-frame inputs go in
  // through _PW (h, scale, spin), a typed array, for the same reason.
  const _PW = new Float64Array(3);
  function propBase(T, s, x, pb, o) {
    frameAt(T, s, _fr3);
    surface(_fr3, x, _fr3.lift, _P3, _N3);
    _Z.copy(_fr3.f); _Y.copy(_N3); _X.crossVectors(_Y, _Z).normalize();
    pb[o] = _X.x; pb[o + 1] = _X.y; pb[o + 2] = _X.z; pb[o + 3] = _Y.x; pb[o + 4] = _Y.y; pb[o + 5] = _Y.z;
    pb[o + 6] = _Z.x; pb[o + 7] = _Z.y; pb[o + 8] = _Z.z; pb[o + 9] = _P3.x; pb[o + 10] = _P3.y; pb[o + 11] = _P3.z;
  }
  function propWrite(a, a2, i, pb, o) {
    const h = _PW[0], sc = _PW[1], ang = _PW[2];
    const c = Math.cos(ang) * sc, sn = Math.sin(ang) * sc, j = i * 16;
    const Xx = pb[o], Xy = pb[o + 1], Xz = pb[o + 2], Yx = pb[o + 3], Yy = pb[o + 4], Yz = pb[o + 5], Zx = pb[o + 6], Zy = pb[o + 7], Zz = pb[o + 8];
    a[j] = Xx * c - Zx * sn; a[j + 1] = Xy * c - Zy * sn; a[j + 2] = Xz * c - Zz * sn; a[j + 3] = 0;
    a[j + 4] = Yx * sc; a[j + 5] = Yy * sc; a[j + 6] = Yz * sc; a[j + 7] = 0;
    a[j + 8] = Xx * sn + Zx * c; a[j + 9] = Xy * sn + Zy * c; a[j + 10] = Xz * sn + Zz * c; a[j + 11] = 0;
    a[j + 12] = pb[o + 9] + Yx * h; a[j + 13] = pb[o + 10] + Yy * h; a[j + 14] = pb[o + 11] + Yz * h; a[j + 15] = 1;
    if (a2) for (let k = 0; k < 16; k++) a2[j + k] = a[j + k];
  }
  function instanced(geo, mat, n) {
    const m = new THREE.InstancedMesh(geo, mat, fmax(1, n));
    m.count = n; return m;
  }
  // culling sphere from the instances as placed, with room for their bob / pop animation
  function fitCull(m, pad) {
    m.instanceMatrix.needsUpdate = true;
    if (m.computeBoundingSphere) { m.computeBoundingSphere(); if (m.boundingSphere) m.boundingSphere.radius += pad; }
    else m.frustumCulled = false;
  }
  function planetMesh(p, theme) {
    const SP = G.Geo && G.Geo.spaceProps;
    let obj = null;
    const colors = p.k === 'marmalune' ? (p.night ? [0x1b4f8a, 0x2f6e6a, 0x5cffe1] : [0x2cc3d6, 0x6ccb5f, 0xf7e3b0]) : (p.c || [0xc4bff0, 0x8e88c8, 0xe8e4ff]);
    if (SP && SP.planet) { try { obj = SP.planet(1, colors, !!p.ring); } catch (e) { obj = null; } }
    if (!obj) {
      const g = new THREE.SphereGeometry(1, 40, 24); g.deleteAttribute('uv');
      const pa = g.attributes.position, col = new Float32Array(pa.count * 3), c0 = new THREE.Color(colors[0]), c1 = new THREE.Color(colors[1]), c2 = new THREE.Color(colors[2]);
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
        let c;
        if (p.k === 'marmalune') { const n = G.noise.fbm2(x * 2.2 + z * 1.3 + 5, y * 2.4 - z * 0.7, 4); c = n > 0.18 ? (n > 0.32 ? c1 : c2) : c0; }
        else { const b = Math.sin(y * 9 + G.noise.n2(x * 3, z * 3) * 1.8); c = b > 0.35 ? c0 : b > -0.3 ? c1 : c2; }
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      obj = new THREE.Mesh(g, G.M.toon(0xffffff, { vc: true, rimStr: 0.7, rimPow: 2.2, rimColor: p.k === 'marmalune' ? 0x9ff6ff : 0xffe0f0 }));
      if (p.ring) {
        const rg = new THREE.RingGeometry(1.35, 2.1, 64, 1); rg.rotateX(-Math.PI / 2 + 0.35);
        obj.add(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: colors[2], transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false, depthWrite: false })));
      }
    }
    // far beyond the fog: give every material a fog-free copy (never mutate the shared caches); the
    // planet objects are cached per theme, so these copies live for the session (flagged shared)
    obj.traverse(o => {
      if (o.geometry) o.geometry.userData.shared = true;
      if (!o.material || Array.isArray(o.material)) return;
      const m = o.material.clone(); m.fog = false; m.userData = Object.assign({}, m.userData, { shared: true });
      o.material = m;
    });
    obj.scale.setScalar(p.r);
    return obj;
  }

  // ------------------------------------------------------------------ the race instance
  let race = null;
  const inp = () => G.input;
  const heldKeys = new Set();
  function onKeyDown(e) { heldKeys.add(e.code); }
  function onKeyUp(e) { heldKeys.delete(e.code); }
  let swipe = null;
  const loc = e => (G.Screen ? G.Screen.toLocal(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY });
  function onPtrDown(e) { if (e.pointerType === 'mouse' || !race) return; const p = loc(e); if (p.x > (G.Screen ? G.Screen.w() : window.innerWidth) * 0.45) swipe = { id: e.pointerId, x: p.x, y: p.y, t: performance.now() }; }
  function onPtrMove(e) {
    if (!swipe || e.pointerId !== swipe.id || !race) return;
    const p = loc(e), dy = p.y - swipe.y, dx = p.x - swipe.x;
    if (dy < -55 && Math.abs(dx) < 45 && performance.now() - swipe.t < 380) { race.swipeRoll = true; swipe = null; }
  }
  function onPtrUp(e) { if (swipe && e.pointerId === swipe.id) swipe = null; }

  // Every field a racer ever gets is created here, with its final type (numbers as numbers, NaN for "unset"; objects
  // or null): racers never change shape mid-race, so the per-step functions keep their optimized code. (Fields added
  // later — the first pad, the first stall — changed the hidden class at random moments and threw stepRacer, triggers
  // and controlBot back to the baseline tier, where every double is boxed: ~40 KB of garbage per frame.)
  function newRacer(i, o) {
    return floats({
      i, isPlayer: !!o.player, name: o.name, style: o.style, colors: o.colors, css: '#' + ((o.colors.main >>> 0) & 0xffffff).toString(16).padStart(6, '0'),
      s: 0, dist: 0, prevDist: 0, x: 0, h: TUNE.hover, vh: 0, air: false, v: 0, psi: 0, vx: 0, steer: 0, tx: 0, vsNow: 0, kSteer: 0,
      charging: false, pad: null, padLap: -1, spinTgt: NaN, smokeAcc: 0, spinAcc: 0, trailReset: false, beamT: 0, projected: false,
      energy: 100, stallT: 0, boostHeld: false, brakeHeld: false, boosting: false, braking: false, manual: false,
      padT: 0, dbT: 0, dbK: 0, startT: 0, startK: 0, turboT: 0, slingT: 0, trickT: 0, ringT: 0, guideT: 0,
      drifting: false, driftDir: 0, driftT: 0, driftTier: 0,
      spinT: 0, spinDur: 0, graceT: 0, slowT: 0, itemsOffT: 0, shieldT: 0, rollT: 0, rollCd: 0, rolledAir: false,
      item: null, pending: null, rouletteT: 0, rocketsLeft: 0, rocketT: 0, itemHold: -1, fireHeld: false, fireCd: 0, zapT: 0,
      wallCd: 0, lapsDone: 0, cpDone: 0, finished: false, finishT: 0, lapStartT: 0, lapTimes: [], bestLap: 0,
      ringMask: 0, ringLap: -99, ringChains: 0, draft: 0, drafting: false, draftLeft: 0,
      place: i + 1, ai: o.ai || null, hits: 0, wrongT: 0, stuckT: 0, dbg: { rock: 0, wall: 0, tractor: 0, stall: 0 },   // dbg: QA counters
      lapHits0: 0,                // wall + rock + item hits when the lap began (clean-lap bonus)
      root: null, body: null, flameK: 0, visRoll: 0, visPitch: 0, visYaw: 0, spinAng: 0, rollAng: 0, rollDir: 1, bob: frand() * 10,
      wp: new V3(), wn: new V3(), wf: new V3(), wr: new V3(), art: null, shieldMesh: null,
      // visual-only motion layer (never read by the physics): body springs, a lateral offset that eases
      // physics snaps (bumps, rock hits) out over ~0.2 s, smoothed display heading for bots, filtered
      // accelerations that drive lean / pitch, and fx emission state
      sRoll: spr(), sPitch: spr(), sYaw: spr(), sHov: spr(), sOff: spr(), sPsi: spr(), sSpin: spr(), sFlame: spr(),
      axF: 0, alF: 0, sVx: spr(), sV: spr(), landK: 0, scrapeT: 0, scrapeSide: 0, scrapeK: 0, sparkAcc: 0, scrapeAcc: 0, dbTier: 0, steerF: floats({ init: false, x: 0, dx: 0 }),
      ribbons: [newRibbon()].concat(o.player ? [newRibbon()] : []), ez: new V3(),
    }, RACER_INTS);
  }

  // k: bot top-speed scale · rb: rubber band (GDD) · lat: bot cornering grip (lower = brakes more in
  // corners) · burst: energy a bot keeps before a manual boost burst (aggressive / others) · dodge: plan a
  // path through asteroid gauntlets (threadRocks) instead of reacting rock by rock.
  // Spicy / Blazing: bots no longer brake for corners (lat 110) and thread gauntlets, so their pace no
  // longer swings ±5% with the track's curves and rocks (an auto-steer kid used to win most Spicy races and
  // 3 of 5 Blazing ones). Measured with test/scenarios/race_diffbal.js, 5 tracks × 3 runs: Spicy kid avg
  // 2.7th (2 wins in 15, was 8 in 10), no-boost line 2.3rd, boost + items 2.5th; Blazing kid 4.3rd (1 win
  // in 15), no-boost 3.7th (no win), boost + items 3.3rd. GP results still swing with items and traffic.
  // Breezy / Normal keep the forgiving bots (corner braking, rock crashes): kids win there.
  const DIFF = {
    breezy: { k: 0.93, rb: 0.08, kid: true, lat: 42, burst: [70, 90] },
    normal: { k: 1, rb: 0.06, lat: 52, burst: [60, 80] },
    spicy: { k: 1.03, rb: 0.03, lat: 110, burst: [45, 65], dodge: true },
    blazing: { k: 1.045, rb: 0, lat: 110, burst: [35, 55], dodge: true },
  };
  function difficulty() {
    let d = (G.Save && G.Save.set && G.Save.set.difficulty) || 'normal';
    if (d === 'easy') d = 'breezy'; else if (d === 'hard') d = 'spicy';
    return Object.assign({ id: DIFF[d] ? d : 'normal' }, DIFF[d] || DIFF.normal);
  }

  // Three procedural race tracks in 09_audio.js, picked by course theme for some variety.
  const MUSIC = { coral: 'race', glow: 'race', frost: 'race_b', sun: 'race_b', mesa: 'race_c', junk: 'race_c' };
  function raceMusic(def) {
    const id = MUSIC[def.theme] || 'race';
    return G.Audio && G.Audio.tracks && G.Audio.tracks().includes(id) ? id : 'race';
  }
  function enter(params) {
    params = params || {};
    const def = trackDef(params.track) || TRACKS[0];
    const T = getTrack(def.id);
    const theme = T.theme;
    const tt = params.mode === 'timetrial';
    const cls = CLASSES[params.cls] ? params.cls : 'breeze';
    const sky = Object.assign({ stars: true, clouds: false }, theme.sky);
    if (theme.sky.sunDir) sky.sunDir = new V3().fromArray(theme.sky.sunDir); else sky.sunDir = new V3(-0.5, 0.35, -0.8);
    const world = new G.World({
      heightFn: null, bounds: { minX: T.bounds.minX - 100, maxX: T.bounds.maxX + 100, minZ: T.bounds.minZ - 100, maxZ: T.bounds.maxZ + 100 },
      sky, fog: { color: theme.fog, near: 320, far: 1700 },
      light: Object.assign({ sunDir: sky.sunDir.clone().add(new V3(0, 0.9, 0)).normalize(), shadowK: 0.5, hemiI: 1.1, sunI: 2.0 }, theme.light),
    });
    world.player = null;
    world.pickups.bolts.visible = false; world.pickups.parts.visible = false;
    const cam = G.R.camera;
    race = {
      T, def, theme, world, params, tt, cls, clsK: CLASSES[cls], laps: params.laps || TUNE.laps, diff: difficulty(),
      // (the clocks are born doubles, -0, so the literal's own hidden class already has them as doubles: floats() below
      // then only widens the rest)
      phase: 'intro', t: -0, phaseT: -0, rt: -0, started: false, countN: 4, goT: -0, startPress: null,
      racers: [], order: [], player: null, proj: [], mines: [], pellets: [], cometCd: -0, swipeRoll: false,
      fov: 66, camUp: new V3(0, 1, 0), camPos: new V3(), impact: -0,
      ghost: null, ghostRec: [], ghostT: -0, lapGhost: null, bestLapRec: null, splits: [], refSplits: null,
      finishT: -0, resultShown: false, msg: [], engine: null, assist: 'standard', ringChainsTotal: 0, slowT: -1, camSnap: false,
      music: raceMusic(def),
      oldCam: { near: cam.near, far: cam.far, fov: cam.fov },
      isNear: r => r.wp.distanceToSquared(G.R.camera.position) < 48400, pelletPool: [],
      // set during the race (created here so the race object keeps one shape: see newRacer)
      _dt: 1 / 60, stepT: -0, _lowT: -9, _bumpT: -9, _lastPlace: 0, _prevBoost: false, _startDone: false, finishPending: false, finishPlace: 0,
      newBest: false, prevBest: 0, cpLast: -1, projPool: { rockets: [], homing: [], mine: [], comet: [] }, warm: null, warmShield: null, engineOff: false, result: null,
      engO: { pitch: 0.8, vol: 0.45 }, rockCols: [0, 0, 0xffffff], pbBox: null, pbRing: null, pbRock: null,
    };
    race.rockCols[0] = theme.rocks[0]; race.rockCols[1] = theme.rocks[1];
    // Hangar ship upgrades (levels 0–5): engine +1.2% top speed, boost −5% drain, hull −8% energy lost
    // to hits, blaster +4% pellet speed / +3 u lock range per level.
    const sl = (G.Save && G.Save.data && G.Save.prof && G.Save.prof.ship) || {};
    const lv = k => clamp(+sl[k] || 0, 0, 5);
    race.up = { top: 1 + 0.012 * lv('engine'), drain: 1 - 0.05 * lv('boost'), hull: 1 - 0.08 * lv('hull'), blast: lv('blaster') };
    const rs = raceSave();
    if (rs && rs.assist) race.assist = rs.assist;
    else if (G.Save.set && G.Save.set.preset === 'easy') race.assist = 'auto';   // GDD: auto-steer = Easy preset
    if (params.assist) race.assist = params.assist;
    cam.near = 0.3; cam.far = 7000; cam.updateProjectionMatrix();
    if (G.fovV) G.fovV(cam.aspect);     // carries a customised legacy vertical FOV over to fovH once (12_player)
    // equipped trail cosmetic (Ranger Locker): puffs behind the skiff while it boosts
    race.trail = G.Wardrobe && G.Wardrobe.trailStyle && G.Wardrobe.equipped ? G.safe('race trail', () => G.Wardrobe.trailStyle(G.Wardrobe.equipped().trail)) || null : null;
    race.trailAcc = 0;
    floats(race, RACE_INTS);

    // per-race state stored on the cached track: reset it
    for (const k of T.rocks) k.hitT.fill(-9);
    // rocks sorted along the track for the per-step windowed scans (rockAt)
    if (!T.rockSorted) T.rockSorted = T.rocks.slice().sort((a, b) => a.s - b.s);
    // (T.pads is sorted by s already; rings keep their index for the per-ring pop state)
    if (!T.ringSorted) T.ringSorted = T.rings.map((g, i) => ({ s: g.s, g, i })).sort((a, b) => a.s - b.s);
    if (T.padLenMax == null) { let m = 0; for (const p of T.pads) m = fmax(m, p.len); T.padLenMax = m + 0.5; }
    for (const row of T.rows) for (const b of row.boxes) { b.t = 0; b.g = 1; }
    // --- static world
    const trackGroup = new THREE.Group(); world.add(trackGroup);
    const mats = buildRoad(T, trackGroup);
    race.railMat = mats.railMat; race.roadMat = mats.roadMat;
    race.decalMat = buildDecals(T, trackGroup);
    buildProps(race);
    buildScenery(race);
    G.safe('race fair', () => buildFair(race));
    // --- dynamic visuals
    race.flames = new Billboards(160, { order: 8, key: 'fx' }); world.add(race.flames.mesh);
    race.streaks = new Flares(128); world.add(race.streaks.mesh);
    race.trails = buildTrails(); world.add(race.trails.mesh); world.add(race.trails.pmesh);
    race.lines = buildSpeedLines(); world.add(race.lines.mesh);
    race.cs = camRig();
    race.blend = floats({ t: 0, dur: 0, local: false, pos: new V3(), q: new THREE.Quaternion() });
    race.ringPop = new Float32Array(T.rings.length).fill(-9);
    prewarm(race);

    // --- racers
    const style = SHIPS.includes(params.ship) ? params.ship : 'arrow';
    const n = tt ? 1 : TUNE.racers, pIdx = tt ? 0 : 4;
    const palettes = U.shuffle(BOT_COLORS.slice());
    const names = U.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const skills = [0.95, 0.92, 0.97, 0.9, 1, 1.0, 0.98, 0.91];   // GDD 0.90–1.02 (top kept at 1.0: bots drive a perfect line)
    const pers = ['aggressive', 'careful', 'itemy', 'careful', 'aggressive', 'itemy', 'careful'];
    U.shuffle(pers);
    let bi = 0;
    for (let i = 0; i < n; i++) {
      const isP = i === pIdx;
      const pal = palettes[bi % palettes.length];
      // bot brain: every field it uses is created here (fixed shape, see newRacer); dodgeX NaN = no gauntlet plan
      const ai = isP ? null : floats({ skill: skills[i] * race.diff.k, pers: pers[bi % pers.length], lane: frange(-5, 5), laneT: frange(2, 5), react: 0, wob: 0, wobX: 0, wobChance: frange(0.03, 0.08),
        lastLap: 0, wobAt: -1, think: frand() * 0.2, boostT: frange(3, 8), burst: 0, fireT: 0, fireCd: frange(2, 6), hold: 0, dodgeT: 0, dodgeX: NaN }, AI_INTS);
      const r = newRacer(i, { player: isP, name: isP ? G.t('race.you') : G.t('race.pilot.' + names[bi % names.length]), style: isP ? style : SHIPS[(bi * 2 + 1) % SHIPS.length], colors: isP ? playerColors() : { main: pal[0], accent: pal[1], glow: pal[2] }, ai });
      if (!isP) bi++;
      // staggered 2-column grid, 6 u apart
      r.dist = -6 - i * 6; r.s = mod(r.dist, T.L); r.prevDist = r.dist;
      r.x = tt ? 0 : (i % 2 === 0 ? -4 : 4); r.tx = r.x;
      r.lapStartT = 0;
      makeRacerVisual(race, r);
      race.racers.push(r);
      if (isP) race.player = r;
    }
    race.order = race.racers.slice();
    // ghost (time trial)
    if (tt) {
      const rec = record(def.id, cls);
      if (rec && rec.g) {
        const data = decodeGhost(rec.g, T.L);
        if (data && data.length >= 30) {
          const art = shipArt(rec.gs || style, playerColors());
          const gm = new THREE.Mesh(art.solid || art.glow, cachedMat('ghost', () => new THREE.MeshBasicMaterial({ color: 0x7af0ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
          world.add(gm);
          race.ghost = floats({ data, mesh: gm, n: data.length / 3, t: 0, on: false, pos: null }, ['n']);
        }
        if (rec.sp && rec.sp.length) race.refSplits = rec.sp.map(v => v / 100);
      }
    }
    // HUD
    G.HUD.show({ vitals: false, weapons: false, crosshair: false, minimap: true, bolts: false, timer: false, feed: false });
    G.HUD.minimapRange = fmax(T.bounds.maxX - T.bounds.minX, T.bounds.maxZ - T.bounds.minZ) * 0.6;
    if (G.RaceUI) G.safe('race ui build', () => G.RaceUI.build(race));
    G.HUD.minimapDraw = (g) => { if (G.RaceUI && G.RaceUI.drawMap) { g.setTransform(1, 0, 0, 1, 0, 0); G.RaceUI.drawMap(g, race); } };
    // input listeners (item hold on keyboard, swipe-up roll)
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPtrDown, true); window.addEventListener('pointermove', onPtrMove, true); window.addEventListener('pointerup', onPtrUp, true);
    heldKeys.clear();
    // place everything once so the intro camera has valid transforms
    for (const r of race.racers) placeRacer(race, r, 0);
    introCamera(race, 0);
    G.bus.emit('mode-start', 'race', params);
    if (G.UI && G.UI.banner) G.UI.banner(G.t('race.track.' + def.id), G.t(tt ? 'race.tt' : 'race.gp'), 2.4);
    G.Race.state = race;
    return world;
  }

  function buildProps(R) {
    const T = R.T, theme = R.theme, w = R.world;
    // checkpoint ring gates (+ start gate)
    const gateGeo = propGeo('ringGate', 15.5, theme.gate);
    const gateMat = gateGeo.userData.unlit ? G.M.basic(0xffffff, { vertexColors: true }) : G.M.toon(0xffffff, { vc: true, emissive: theme.gate, ei: 0.35, rimStr: 0.6, rimColor: 0xffffff });
    const gates = instanced(gateGeo, gateMat, T.cps.length);
    T.cps.forEach((s, k) => { const start = k === T.cps.length - 1; trackMatrix(T, s, 0, 2.5, start ? 1.12 : 1, 0, _m4); gates.setMatrixAt(k, _m4); gates.setColorAt(k, _col.setHex(0xffffff)); });
    w.add(gates);
    R.gates = gates;           // checkpoint gates the player has cleared this lap turn mint (cpGates)
    buildSigns(R);
    if (gateGeo.userData.glowGeo) { const gg = instanced(gateGeo.userData.glowGeo, G.Geo.glowMat ? G.Geo.glowMat() : G.M.basic(0xffffff, { vertexColors: true }), T.cps.length); for (let k = 0; k < T.cps.length; k++) { gates.getMatrixAt(k, _m4); gg.setMatrixAt(k, _m4); } w.add(gg); }
    // gold rings
    if (T.rings.length) {
      const rg = cachedGeo('goldRing', () => new THREE.TorusGeometry(4.2, 0.38, 8, 36));
      const rings = instanced(rg, G.M.toon(0xffc21a, { emissive: 0xffa000, ei: 0.55, spec: 0.8, rimStr: 0.8, rimColor: 0xfff6c8 }), T.rings.length);
      // place them now: an InstancedMesh computes its culling sphere once, from the matrices it has the
      // first time it is drawn (identity before updateProps ran: a sphere at the world origin, so the
      // rings were culled nearly everywhere on the course)
      T.rings.forEach((g, k) => { trackMatrix(T, g.s, g.x, g.h, 1, 0, _m4); rings.setMatrixAt(k, _m4); });
      fitCull(rings, 8);
      R.ringMesh = rings; w.add(rings);
    }
    // item boxes
    const nb = T.rows.reduce((a, r) => a + r.boxes.length, 0);
    if (nb && !R.tt) {
      // rainbow "?" cube (Geo item texture when available) inside a glossy bubble shell
      let innerMat = null;
      const SP = G.Geo && G.Geo.spaceProps;
      if (SP && SP.itemBox) { try { SP.itemBox(); innerMat = G.Geo._itemMat || null; } catch (e) { innerMat = null; } }
      const inner = cachedGeo('itemInner', () => G.Geo && G.Geo.roundedBox ? G.Geo.roundedBox(1.5, 1.5, 1.5, 0.18, 1) : new THREE.BoxGeometry(1.5, 1.5, 1.5));
      if (!innerMat) { innerMat = G.M.toon(0xffffff, { vc: true, emissive: 0x8f6bff, ei: 0.35, spec: 0.7 }); vcColorize(inner, 0xb983ff); }
      // roundedBox drops uvs: a textured cube needs a plain box
      const innerGeo = innerMat.map && !inner.attributes.uv ? cachedGeo('itemInnerBox', () => new THREE.BoxGeometry(1.5, 1.5, 1.5)) : inner;
      R.boxMesh = instanced(innerGeo, innerMat, nb); w.add(R.boxMesh);
      const shellGeo = cachedGeo('itemShell', () => new THREE.SphereGeometry(1.45, 16, 12));
      R.boxGlow = instanced(shellGeo, G.M.toon(0xe8f6ff, { transparent: true, opacity: 0.32, spec: 1, rimStr: 1.0, rimColor: 0xffffff }), nb);
      R.boxGlow.renderOrder = 3; w.add(R.boxGlow);
      // (placed now for the same culling-sphere reason as the rings)
      let n = 0;
      for (const row of T.rows) for (const b of row.boxes) { trackMatrix(T, row.s, b.x, 2.2, 0.95, 0, _m4); R.boxMesh.setMatrixAt(n, _m4); R.boxGlow.setMatrixAt(n, _m4); n++; }
      fitCull(R.boxMesh, 4); fitCull(R.boxGlow, 4);
    }
    // asteroids: gauntlet obstacles + scenery field around the track
    const q = G.R.q().props;
    const sceneryN = Math.round(150 * q);
    const rocksGeo = propGeo('asteroid', 3, 0);
    const rmat = G.M.toon(0xffffff, { vc: true, spec: 0.12, rimStr: 0.35 });
    const total = T.rocks.length + sceneryN;
    const rocks = instanced(rocksGeo, rmat, total);
    const rr = G.rng(T.def.seed + 99);
    const tint = k => _col.setHex(theme.rocks[k % theme.rocks.length]).lerp(_white, 0.45);
    T.rocks.forEach((o, k) => { trackMatrix(T, o.s, o.x, o.h, o.r, o.spin * 3, _m4); rocks.setMatrixAt(k, _m4); rocks.setColorAt(k, tint(k)); });
    // clearance test against the whole track (a rock placed beside one stretch can still sit on another
    // stretch that loops back nearby): every 8th sample is plenty for a ≥ 14 u margin
    const clearOfTrack = (P, rad) => {
      const need = TUNE.hwRow + 6 + rad;
      for (let i = 0; i < T.N; i += 4) { const dx = T.pos[i * 3] - P.x, dy = T.pos[i * 3 + 1] - P.y, dz = T.pos[i * 3 + 2] - P.z; if (dx * dx + dy * dy + dz * dz < need * need) return false; }
      return true;
    };
    for (let k = 0; k < sceneryN; k++) {
      let sc = 2;
      for (let tries = 0; tries < 6; tries++) {
        const s = rr() * T.L; frameAt(T, s, _fr);
        sc = 2 + Math.pow(rr(), 2.2) * 22;
        // keep the big ones clear of the road corridor (no rock slicing through the track or the camera)
        const side = rr() < 0.5 ? -1 : 1, off = 40 + sc * 1.4 + rr() * 260, up = rr.range(-120, 140);
        _P.copy(_fr.p).addScaledVector(_fr.r, side * off).addScaledVector(UPV, up);
        if (clearOfTrack(_P, sc * 1.2)) break;
        if (tries === 5) _P.addScaledVector(UPV, -400);      // give up: drop it far below the course
      }
      _q.setFromEuler(new THREE.Euler(rr() * 6, rr() * 6, rr() * 6));
      _m4.compose(_P, _q, _sc.set(sc, sc * rr.range(0.7, 1), sc));
      rocks.setMatrixAt(T.rocks.length + k, _m4); rocks.setColorAt(T.rocks.length + k, tint(k));
    }
    rocks.instanceMatrix.needsUpdate = true;
    R.rockMesh = rocks; w.add(rocks);
    // coral arches over the road
    if (T.arches.length) {
      const ag = cachedGeo('arch', () => { const g = new THREE.TorusGeometry(TUNE.hw + 2.2, 1.0, 8, 28, Math.PI); g.deleteAttribute('uv'); return vcColorize(g, 0xffffff); });
      const arches = instanced(ag, G.M.toon(0xffffff, { vc: true, rimStr: 0.5, spec: 0.5 }), T.arches.length);
      T.arches.forEach((a, k) => { trackMatrix(T, a.s, 0, 0, 1, 0, _m4); arches.setMatrixAt(k, _m4); arches.setColorAt(k, _col.setHex(theme.arch[k % theme.arch.length])); });
      w.add(arches);
    }
  }
  // Roadside signs (one instanced draw call per kind, unlit so they read in every theme):
  //  * corner chevron boards on the outside of medium (3 boards) and sharp (5 bigger boards) corners, the chevrons
  //    pointing into the turn — local +X is the skiff's left (see placeRacer), right turns are mirrored;
  //  * "energy lane" boards (pink, lightning bolt + arrow) before the recharge strip, on its side of the road: the only
  //    lane choice on these courses (the tracks never fork).
  const SIGN_MIRROR = new THREE.Matrix4().makeScale(-1, 1, 1);
  function signGeo(kind) {
    return cachedGeo('sign|' + kind, () => {
      const P = [], C = [], I = [];
      const col = h => new THREE.Color(h);
      // quad from 4 [x, y] points at depth z (the face toward oncoming skiffs is -Z)
      const quad = (pts, c, z) => { const b = P.length / 3; for (const p of pts) { P.push(p[0], p[1], z); C.push(c.r, c.g, c.b); } I.push(b, b + 1, b + 2, b, b + 2, b + 3); };
      const rect = (x0, y0, x1, y1, c, z) => quad([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c, z);
      const ink = col(0x1e1a4d), white = col(0xffffff);
      if (kind === 'chev') {
        const yel = col(0xffd23f);
        rect(-1.7, -0.9, 1.7, 0.9, white, 0);                       // white rim
        rect(-1.52, -0.72, 1.52, 0.72, ink, -0.01);                 // dark panel
        for (const cx of [-0.62, 0.38]) {                            // two chevrons pointing to +X
          const tip = cx + 0.5, t = 0.36;
          quad([[tip, 0], [cx - 0.05, 0.58], [cx - 0.05 - t, 0.58], [tip - t, 0]], yel, -0.02);
          quad([[tip, 0], [tip - t, 0], [cx - 0.05 - t, -0.58], [cx - 0.05, -0.58]], yel, -0.02);
        }
        rect(-1.25, -2.4, -1.05, -0.9, ink, 0.02); rect(1.05, -2.4, 1.25, -0.9, ink, 0.02);   // posts
      } else {
        const pink = col(0xff5fa2), bolt = col(0xfff4b0);
        rect(-1.4, -0.85, 1.4, 0.85, white, 0);
        rect(-1.24, -0.69, 1.24, 0.69, pink, -0.01);
        // lightning bolt (two parallelograms) + an arrow toward +X (the strip side; mirrored for the other side)
        quad([[-0.35, 0.62], [-0.6, 0.62], [-0.88, 0.0], [-0.55, 0.0]], bolt, -0.02);
        quad([[-0.48, 0.06], [-0.75, 0.06], [-0.98, -0.62], [-0.9, -0.62]], bolt, -0.02);
        quad([[0.0, 0.14], [0.55, 0.14], [0.55, -0.14], [0.0, -0.14]], white, -0.02);
        quad([[0.5, 0.36], [0.95, 0], [0.95, 0], [0.5, -0.36]], white, -0.02);
        rect(-0.1, -2.4, 0.1, -0.85, ink, 0.02);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I); g.computeBoundingSphere();
      return g;
    });
  }
  function buildSigns(R) {
    const T = R.T, mat = cachedMat('signs', () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
    const chev = [];
    for (const c of T.corners || []) {
      if (c.tier < 2) continue;
      const n = c.tier === 3 ? 5 : 3, step = c.tier === 3 ? 12 : 14, side = c.dir > 0 ? 1 : -1;
      for (let k = 0; k < n; k++) {
        const s = c.apex - 8 - (n - 1 - k) * step;
        const i = idxOf(T, s);
        if (T.gap[i] || T.pipe[i] > 0.05 || T.roll[i] !== 0) continue;
        chev.push({ s, x: side * (T.hw[i] + 1.7), sc: c.tier === 3 ? 1.25 : 1, mir: side < 0 });
      }
    }
    const signs = [];
    for (const st of T.strips) { const side = st.x > 0 ? 1 : -1; for (const d of [44, 14]) { const s = st.s0 - d, i = idxOf(T, s); if (!T.gap[i] && T.roll[i] === 0) signs.push({ s, x: side * (T.hw[i] + 1.6), sc: 1, mir: side > 0 }); } }
    const place = (list, geo) => {
      if (!list.length) return null;
      const m = instanced(geo, mat, list.length);
      list.forEach((b, k) => { trackMatrix(T, b.s, b.x, 2.5 * b.sc, b.sc, 0, _m4); if (b.mir) _m4.multiply(SIGN_MIRROR); m.setMatrixAt(k, _m4); });
      fitCull(m, 4); m.name = 'raceSigns'; R.world.add(m);
      return m;
    };
    R.chevSigns = place(chev, signGeo('chev'));
    R.laneSigns = place(signs, signGeo('lane'));
    R.signCount = chev.length + signs.length;
  }
  function buildScenery(R) {
    const T = R.T, theme = R.theme, w = R.world;
    R.planets = [];
    theme._planets = theme._planets || [];
    theme.planets.forEach((p, i) => {
      const o = theme._planets[i] || (theme._planets[i] = planetMesh(p, theme));
      o.position.copy(T.center).addScaledVector(_A.fromArray(p.d).normalize(), p.dist);
      o.rotation.set(0.3, frand() * 6, 0.1);
      w.add(o); R.planets.push(o);
    });
    // space stations near the track
    const SP = G.Geo && G.Geo.spaceProps;
    R.stations = [];
    const nst = theme === THEMES.junk ? 3 : 1;
    for (let k = 0; k < nst; k++) {
      let st = null;
      if (SP && SP.station) { try { st = SP.station(1); } catch (e) { st = null; } }
      if (!st) {
        const g = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 8, 32), G.M.toon(0xc9d2ea, { rimStr: 0.5 }));
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 12), G.M.toon(0xff7a3d));
        hub.rotation.x = Math.PI / 2; g.add(ring, hub);
        g.userData.tick = (t) => { ring.rotation.z = t * 0.3; };
        st = g;
      }
      const s = T.L * (0.15 + 0.33 * k + 0.07); frameAt(T, s, _fr);
      st.position.copy(_fr.p).addScaledVector(_fr.r, (k % 2 ? -1 : 1) * 110).addScaledVector(UPV, 45);
      st.scale.setScalar(28);
      w.add(st); R.stations.push(st);
    }
    // nebula puffs and distant glows (one billboard draw call)
    const neb = new Billboards(40, { order: -1, key: 'sky' });
    const rr = G.rng(T.def.seed + 7);
    for (let k = 0; k < 26; k++) {
      _A.set(rr.range(-1, 1), rr.range(-0.35, 0.7), rr.range(-1, 1)).normalize().multiplyScalar(rr.range(3200, 5200)).add(T.center);
      neb.add(_A.x, _A.y, _A.z, rr.range(500, 1300), theme.neb[k % theme.neb.length], rr.range(0.12, 0.3));
    }
    for (let k = 0; k < 12; k++) {
      _A.set(rr.range(-1, 1), rr.range(-0.2, 0.8), rr.range(-1, 1)).normalize().multiplyScalar(4500).add(T.center);
      neb.add(_A.x, _A.y, _A.z, rr.range(40, 90), 0xffffff, 0.8);
    }
    neb.commit(); neb.mesh.renderOrder = 0; w.add(neb.mesh);
    R.neb = neb.mesh;
    // space dust around the corridor: near-field optic flow. Each mote twinkles on its own clock and
    // some take a nebula tint, so the space around the road sparkles instead of sitting flat.
    const nd = Math.round(700 * G.R.q().particles);
    const dp = new Float32Array(nd * 3), dph = new Float32Array(nd);
    for (let k = 0; k < nd; k++) {
      frameAt(T, rr() * T.L, _fr);
      _A.copy(_fr.p).addScaledVector(_fr.r, rr.range(-70, 70)).addScaledVector(_fr.u, rr.range(-25, 45));
      dp[k * 3] = _A.x; dp[k * 3 + 1] = _A.y; dp[k * 3 + 2] = _A.z; dph[k] = rr();
    }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aPh', new THREE.BufferAttribute(dph, 1));
    // round, size-capped motes that fade out right in front of the lens (plain PointsMaterial squares
    // grew into big flat white tiles when the camera flew through one)
    const dm = cachedMat('dust2', () => new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color() }, uTint: { value: new THREE.Color() }, uScale: { value: 400 }, uTime: { value: 0 } },
      vertexShader: 'attribute float aPh; uniform float uScale, uTime; uniform vec3 uCol, uTint; varying float vA; varying vec3 vC;' +
        ' void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z;' +
        ' float tw = 0.6 + 0.4 * sin(uTime * (1.3 + fract(aPh * 7.31) * 2.6) + aPh * 6.2832);' +
        ' gl_PointSize = clamp(0.5 * uScale / max(d, 0.1), 1.0, 4.5) * (0.8 + 0.35 * tw);' +
        ' vA = smoothstep(3.0, 10.0, d) * (1.0 - smoothstep(700.0, 1500.0, d)) * tw; vC = mix(uCol, uTint, step(0.72, fract(aPh * 3.7)));' +
        ' gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float r = dot(c, c) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC, vA * 0.85 * (1.0 - r * r));\n#include <colorspace_fragment>\n}',
      transparent: true, depthWrite: false, fog: false,
    }));
    dm.uniforms.uCol.value.setHex(theme.dust); dm.uniforms.uTint.value.setHex(theme.neb[0]).lerp(_white, 0.35);
    dm.uniforms.uScale.value = fmax(200, (G.R.renderer.domElement.height || 720) * 0.5);
    R.dustMat = dm;
    const dust = new THREE.Points(dg, dm);
    w.add(dust);
  }

  // Track-side fair (art pass; visual only — nothing here touches the road, the rails, the racing line or any
  // trigger): floating grandstands with cheering critter crowds on both sides of the start / finish straight, two
  // inflatable arches over it, bunting masts along it (pennants across and along the road), and themed spectator pods
  // beside the lap. Everything stands at least 2.5 u outside the rails (checked against the whole course, which can
  // loop back nearby). One merged mesh (+ glow), the shared flag batch and two crowd meshes. Low tier: arches, masts and
  // bunting only (no stands, pods or crowds).
  const FAIR = {
    coral: { plat: [0xff9fb8, 0xff7a93], stand: [0x7af0ff, 0xfff6ea, 0x3b2f96, 0xff8fc0, 0xffffff], kind: 'jelly', crowd: [0xffc8d8, 0xb8f4ec, 0xffe8a8, 0xd8d0ff, 0xffffff] },
    mesa: { plat: [0xf7e1b5, 0xe88a5a], stand: [0xffb37a, 0xfff6ea, 0x6a3a8a, 0xff5fa2, 0xffffff], kind: 'puff', crowd: [0xffd8b8, 0xffe8a8, 0xffc8d8, 0xfff6ea, 0xd8c8ff] },
    glow: { plat: [0xfff1dc, 0xff6f91], stand: [0x5cffe1, 0xfff1dc, 0x1b1f4d, 0xff6f91, 0xffffff], kind: 'bot', crowd: [0xb8fff2, 0xffc8e0, 0xd8d0ff, 0xffffff, 0xc8f0ff], bulbs: [0x5cffe1, 0xff6f91, 0xfff1a8, 0xb983ff] },
    frost: { plat: [0xf4fbff, 0xbdebff], stand: [0xbdebff, 0xffffff, 0x24306e, 0xff9de2, 0xffffff], kind: 'puff', crowd: [0xffffff, 0xd8f0ff, 0xffd8f0, 0xe8e0ff, 0xc8f8ff] },
    junk: { plat: [0xc9d2ea, 0xff7a3d], stand: [0xff7a3d, 0xfff1dc, 0x33295a, 0xffd23f, 0xffffff], kind: 'bot', crowd: [0xffd8b0, 0xd8e0f0, 0xfff0b0, 0xffc8a8, 0xffffff] },
    sun: { plat: [0xffe9a8, 0xffc21a], stand: [0xffc21a, 0xfff6ea, 0x4a1a5a, 0xff8a4c, 0xffffff], kind: 'puff', crowd: [0xfff0b0, 0xffd8b8, 0xffc8d8, 0xffffff, 0xffe0a0], bulbs: [0xffe9a8, 0xff8a4c, 0xffd23f, 0xfff6ea] },
  };
  function buildFair(R) {
    const T = R.T, w = R.world, SK = G.StageKit, GE = G.Geo, PI = Math.PI, HP = PI / 2;
    if (!SK || !SK.arch || !GE || !GE.Kit) return;
    const key = Object.keys(THEMES).find(k => THEMES[k] === R.theme) || 'coral', F = FAIR[key] || FAIR.coral;
    const rank = G.R.tierRank ? G.R.tierRank() : 2, rich = rank > 0, dens = rank <= 0 ? 0 : rank === 1 ? 0.38 : rank === 2 ? 0.7 : 1;
    const kit = new GE.Kit(), P = GE.P, fb = GE.flagBatch ? GE.flagBatch() : null, rr = G.rng(T.def.seed + 313);
    const bunt = R.theme.arch.concat([0xffffff]);
    const M = new THREE.Matrix4(), V = new V3(), rH = new V3(), fH = new V3(), bH = new V3(), UP = new V3(0, 1, 0);
    // clearance from the whole course (a straight stand can sit beside one stretch and over another)
    const clearOf = (x, y, z, need) => { for (let i = 0; i < T.N; i += 3) { const dx = T.pos[i * 3] - x, dy = T.pos[i * 3 + 1] - y, dz = T.pos[i * 3 + 2] - z; if (dx * dx + dy * dy + dz * dz < need * need) return false; } return true; };
    // horizontal frame at s: centre P, flat right rH, flat forward fH
    const frame = s => { frameAt(T, mod(s, T.L), _fr); rH.set(_fr.r.x, 0, _fr.r.z).normalize(); fH.crossVectors(rH, UP).negate().normalize(); return _fr; };
    // a part built at the origin (local X across the road, local +Z back up the road: a right-handed basis), set at (s, x)
    const sub = (build, s, x, y) => {
      const tk = new GE.Kit(); build(tk);
      const d = tk.data(), fr = frame(s);
      V.copy(fr.p).addScaledVector(rH, x); V.y += y;
      M.makeBasis(rH, UP, bH.crossVectors(rH, UP)).setPosition(V);
      if (d.solid) kit.addRaw(d.solid.applyMatrix4(M), null);
      if (d.glow) kit.glowRaw(d.glow.applyMatrix4(M), null);
      return V;
    };
    const plat = (tk, rx, rz, thick) => {
      tk.add(P.cyl(1, 1, thick, 14), F.plat[0], 0, -thick / 2, 0, 0, 0, 0, rx, 1, rz);
      tk.add(P.cone(1, thick * 2.4, 12), F.plat[1], 0, -thick - thick * 1.2, 0, PI, 0, 0, rx * 0.9, 1, rz * 0.9);
      tk.add(P.tor(1, 0.08, 4, 18), 0xffffff, 0, 0.02, 0, HP, 0, 0, rx, rz, 1);
    };
    // inflatable arches over the straight
    for (const s of [T.L - 150, 100]) {
      const hw = T.hw[idxOf(T, s)];
      sub(tk => {
        SK.arch(tk, 0, 0, 0, 0, { span: 2 * hw + 7, h: 13, r: 1.25, seg: 15, cols: [R.theme.arch[0], 0xffffff], base: F.stand[2], crownCol: 0xffffff, trim: R.theme.arch[2] || 0xffd23f, emblem: 'star', emblemCol: R.theme.arch[1], bulbs: F.bulbs || null });
        for (const sd of [-1, 1]) { tk.add(P.cyl(2.6, 2.6, 1.2, 14), F.plat[0], sd * (hw + 3.5), -0.6, 0); tk.add(P.cone(2.4, 3, 12), F.plat[1], sd * (hw + 3.5), -2.7, 0, PI, 0, 0); }
      }, s, 0, -0.4);
    }
    // bunting masts along the straight: strings along both sides and every other pair across the road, high overhead
    // (review: the intro camera — introCamera — sweeps from 22 u right of the road and 28 u up, 60 u ahead of the player,
    // down into the chase position, i.e. through the right-hand mast line and any cross string near the grid: its giant
    // pennants filled the screen at every race start. No right-hand masts — so no right-hand or cross strings — from
    // 62 u before to 58 u past the start line, where that sweep flies for any grid slot; the left-hand line stays.)
    const inIntro = s => { const d = mod(s + T.L / 2, T.L) - T.L / 2; return d > -62 && d < 58; };
    const ms = [[], []];
    for (let s = T.L - 140; s <= T.L + 70; s += 14) {
      if (T.cps.some(c => Math.abs(mod(s - c + T.L / 2, T.L) - T.L / 2) < 9)) continue;   // (clear of the checkpoint ring gates)
      const fr = frame(s), hw = T.hw[idxOf(T, s)];
      for (let k = 0; k < 2; k++) {
        if (k === 1 && inIntro(s)) { ms[1].push(null); continue; }
        const sd = k ? 1 : -1, bx = fr.p.x + rH.x * sd * (hw + 2.6), bz = fr.p.z + rH.z * sd * (hw + 2.6), by = fr.p.y + fr.lift;
        kit.add(P.cyl(0.11, 0.14, 10.4, 6), 0xffffff, bx, by + 4.7, bz);
        if (F.bulbs) kit.glow(P.sph(0.32, 8, 6), F.bulbs[ms[k].length % F.bulbs.length], bx, by + 10.1, bz); else kit.add(P.sph(0.3, 8, 6), 0xffd23f, bx, by + 10.1, bz);
        ms[k].push([bx, by + 9.6, bz]);
      }
    }
    if (fb) for (let k = 0; k < 2; k++) for (let i = 0; i + 1 < ms[k].length; i++) if (ms[k][i] && ms[k][i + 1]) SK.bunting(fb, kit, ms[k][i], ms[k][i + 1], { cols: bunt, sag: 0.9, ofs: i + k * 2, w: 0.7, h: 0.95, step: 0.95 });
    if (fb) for (let i = 0; i < ms[0].length; i += 2) if (ms[0][i] && ms[1][i]) SK.bunting(fb, kit, ms[0][i], ms[1][i], { cols: bunt, sag: 1.4, ofs: i, w: 0.7, h: 0.95, step: 0.95 });
    const crowdA = [], crowdB = [];
    if (rich) {
      // grandstands on both sides of the start / finish straight
      for (const sc of [T.L - 92, 36]) for (const sd of [-1, 1]) {
        const hw = T.hw[idxOf(T, sc)];
        // (the stand's corners and back must stay clear of every stretch of the course; else step it further out)
        const fits = off => { const fr = frame(sc); for (const ax of [-12, 0, 12]) for (const bz of [0, 5]) { const px = fr.p.x + rH.x * sd * (off + bz) + fH.x * ax, pz = fr.p.z + rH.z * sd * (off + bz) + fH.z * ax; if (!clearOf(px, fr.p.y, pz, hw + 4)) return false; } return true; };
        let off = hw + 10.5, ok = false;
        for (let t = 0; t < 6; t++) { if (fits(off)) { ok = true; break; } off += 2.5; }
        if (!ok) continue;
        const fr = frame(sc), x0 = fr.p.x + rH.x * sd * off, z0 = fr.p.z + rH.z * sd * off, y0 = fr.p.y - 1.3;
        const ry = Math.atan2(-sd * rH.x, -sd * rH.z);
        // themed floating base (centred under the stand, which runs 0.6 u toward the road and 3.1 u back), then the stand
        const bk = new GE.Kit(); plat(bk, 13.5, 4.4, 1.4); const bd = bk.data();
        M.makeRotationY(ry).setPosition(x0 + rH.x * sd * 1.25, y0, z0 + rH.z * sd * 1.25);
        kit.addRaw(bd.solid.applyMatrix4(M), null);
        const seats = SK.stand(kit, x0, y0, z0, ry, { len: 22, rows: 3, cols: F.stand });
        for (const q of seats) if (rr() < dens) crowdA.push({ x: q.x, y: q.y, z: q.z, ry: q.ry + (rr() - 0.5) * 0.4, s: 1.6 + rr() * 0.3, color: F.crowd[(rr() * F.crowd.length) | 0] });
      }
      // spectator pods beside the lap (away from the straight)
      for (let k = 0; k < 7; k++) {
        const s = T.L * (k + 0.5) / 7;
        if (s > T.L - 200 || s < 150) continue;
        const sd = k & 1 ? 1 : -1, fr = frame(s), hw = T.hw[idxOf(T, s)], off = hw + 14;
        const px = fr.p.x + rH.x * sd * off, pz = fr.p.z + rH.z * sd * off, py = fr.p.y - 0.8;
        if (!clearOf(px, py, pz, hw + 6.5)) continue;
        const pk = new GE.Kit(); plat(pk, 3.6, 3.6, 1.2);
        pk.add(P.cyl(0.07, 0.08, 4.2, 6), 0xffffff, 0, 2.1, -2.6);
        const pd = pk.data(); M.makeTranslation(px, py, pz); kit.addRaw(pd.solid.applyMatrix4(M), null);
        if (fb) { const g = new THREE.BufferGeometry(), c = new THREE.Color(bunt[k % bunt.length]); g.setAttribute('position', new THREE.Float32BufferAttribute([px, py + 4.1, pz - 2.6, px, py + 3.2, pz - 2.6, px + 1.9, py + 3.65, pz - 2.6], 3)); g.setAttribute('color', new THREE.Float32BufferAttribute([c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b], 3)); g.computeVertexNormals(); fb.raw(g, x => clamp((x - px) / 1.9, 0, 1), new V3(0, 0, 1)); }
        const face = Math.atan2(-sd * rH.x, -sd * rH.z);
        for (let i = 0; i < 12; i++) {
          if (rr() > dens + 0.15) continue;
          const a = (i / 12) * TAU, d = 1.4 + (i & 1) * 1.2;
          crowdB.push({ x: px + Math.cos(a) * d, y: py + 0.02, z: pz + Math.sin(a) * d, ry: face + (rr() - 0.5) * 0.6, s: 1.5 + rr() * 0.3, color: F.crowd[(rr() * F.crowd.length) | 0] });
        }
      }
    }
    const d = kit.data();
    if (d.solid) { const m = new THREE.Mesh(d.solid, G.M.vc({ rimStr: 0.35 })); m.name = 'raceFair'; w.add(m); }
    if (d.glow) { const m = new THREE.Mesh(d.glow, GE.glowMat()); m.name = 'raceFair-glow'; w.add(m); }
    if (fb && fb.count) { const m = fb.mesh(); m.name = 'raceFlags'; w.add(m); }
    if (SK.crowd) {
      // (the lite critter: seen at speed from 15 u and more)
      if (crowdA.length) SK.crowd(w, crowdA, { kind: F.kind, name: 'raceCrowd', hop: 0.3, near: 260, lite: true });
      if (crowdB.length) SK.crowd(w, crowdB, { kind: F.kind === 'bot' ? 'puff' : 'bot', name: 'raceCrowdPods', hop: 0.3, near: 1e5, lite: true });
    }
  }

  // Engine / boost ribbons. Each ribbon is a ring buffer of samples (pos, road-right, heat, time) taken
  // every TR_DT s; the newest sample rides on the emitter every frame and brightness fades with each
  // sample's age, so a ribbon stays continuous and its tail dissolves instead of stepping. Bots get one
  // ribbon each; the player gets one per engine in a second mesh whose near-camera fade starts much
  // closer (the shared rail fade hid most of the player's own trail).
  const TR_SEG = 22, TR_DT = 0.024, TR_ST = 8, TR_AGE = TR_SEG * TR_DT;
  function buildTrails() {
    const mk = (cap, mat) => {
      const nv = cap * TR_SEG * 2;
      const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint16Array(cap * (TR_SEG - 1) * 6);
      let q = 0;
      for (let r = 0; r < cap; r++) for (let k = 0; k < TR_SEG - 1; k++) { const a = (r * TR_SEG + k) * 2; idx[q++] = a; idx[q++] = a + 1; idx[q++] = a + 2; idx[q++] = a + 1; idx[q++] = a + 3; idx[q++] = a + 2; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aCol', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0);
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 7;
      m.material.uniforms.uNear.value = 200; m.material.uniforms.uFar.value = 900;
      return { m, g, pos, col, cap };
    };
    const bots = mk(8, RAIL_MAT(6, 16)), pl = mk(2, RAIL_MAT(3, 9));
    return { mesh: bots.m, pmesh: pl.m, bots, pl };
  }
  const newRibbon = () => { const rb = { h: new Float32Array(TR_SEG * TR_ST), head: 0, n: 0, acc: 0.5 }; rb.acc = 0; return rb; };
  // (heat and the time stamp come in through _RA, a typed array: as arguments they were boxed, see _FA)
  const _RA = new Float64Array(2);
  function ribbonSample(rb, dt, p, l) {
    const heat = _RA[0], t = _RA[1];
    rb.acc += dt;
    if (rb.acc >= TR_DT || !rb.n) { rb.acc = fmin(rb.acc - TR_DT, TR_DT); if (rb.acc < 0) rb.acc = 0; rb.head = (rb.head + 1) % TR_SEG; if (rb.n < TR_SEG) rb.n++; }
    const o = rb.head * TR_ST, h = rb.h;
    h[o] = p.x; h[o + 1] = p.y; h[o + 2] = p.z; h[o + 3] = l.x; h[o + 4] = l.y; h[o + 5] = l.z; h[o + 6] = heat; h[o + 7] = t;
  }
  const _rc0 = new THREE.Color(), _rc1 = new THREE.Color();
  // ribbon -> two vertices per sample: width w0 (newest) .. w1 (oldest), colour base -> hot by heat
  function writeRibbon(tr, slot, rb, now, w0, w1, base, hot, bright, age) {
    const P = tr.pos, Cc = tr.col, h = rb.h, b = slot * TR_SEG * 2;
    for (let k = 0; k < TR_SEG; k++) {
      const a = (b + k * 2) * 3;
      if (!rb.n) { P.fill(0, a, a + 6); Cc.fill(0, a, a + 6); continue; }
      const kk = k < rb.n ? k : rb.n - 1;
      const o = ((rb.head - kk + TR_SEG) % TR_SEG) * TR_ST;
      const f = k < rb.n ? clamp(1 - (now - h[o + 7]) / age, 0, 1) : 0, heat = h[o + 6];
      const w = (w1 + (w0 - w1) * f) * (0.6 + 0.8 * heat);
      P[a] = h[o] + h[o + 3] * w; P[a + 1] = h[o + 1] + h[o + 4] * w; P[a + 2] = h[o + 2] + h[o + 5] * w;
      P[a + 3] = h[o] - h[o + 3] * w; P[a + 4] = h[o + 1] - h[o + 4] * w; P[a + 5] = h[o + 2] - h[o + 5] * w;
      const ck = f * f * bright * (0.35 + 0.65 * heat);
      const r = (base.r + (hot.r - base.r) * heat) * ck, g = (base.g + (hot.g - base.g) * heat) * ck, bl = (base.b + (hot.b - base.b) * heat) * ck;
      Cc[a] = Cc[a + 3] = r; Cc[a + 1] = Cc[a + 4] = g; Cc[a + 2] = Cc[a + 5] = bl;
    }
  }
  // Speed lines: thin tapered streaks in camera space rushing at the lens (one draw call). They live in
  // a cylinder around the view axis and are depth-tested, so they pass behind the ship and the road.
  // Colour follows what drives the speed (boost gold, drift-boost cyan, slipstream white).
  function buildSpeedLines() {
    const n = 120, pos = new Float32Array(n * 4 * 3), rnd = new Float32Array(n * 4 * 4), cor = new Float32Array(n * 4 * 3), idx = new Uint16Array(n * 6);
    const rr = G.rng(4242);
    for (let i = 0; i < n; i++) {
      // fewer lines low in the frame where the ship and the speedometer sit
      let a = rr() * TAU; if (Math.sin(a) < -0.55 && rr() < 0.7) a = -a;
      const rad = 2.8 + Math.pow(rr(), 0.7) * 6.5, ph = rr() * 70, len = 1.2 + rr() * 3.2, br = 0.55 + rr() * 0.45;
      for (let k = 0; k < 4; k++) {
        const o = (i * 4 + k) * 4; rnd[o] = a; rnd[o + 1] = rad; rnd[o + 2] = ph; rnd[o + 3] = len;
        const c = (i * 4 + k) * 3; cor[c] = k === 1 || k === 2 ? 1 : -1; cor[c + 1] = k >= 2 ? 1 : 0; cor[c + 2] = br;
      }
      idx[i * 6] = i * 4; idx[i * 6 + 1] = i * 4 + 1; idx[i * 6 + 2] = i * 4 + 2; idx[i * 6 + 3] = i * 4; idx[i * 6 + 4] = i * 4 + 2; idx[i * 6 + 5] = i * 4 + 3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(rnd, 4)); g.setAttribute('aC', new THREE.BufferAttribute(cor, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new V3(), 1e5);
    const mat = cachedMat('speedlines2', () => new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uOp: { value: 0 }, uLen: { value: 1 }, uW: { value: 0.02 }, uCol: { value: new THREE.Color(0xd8f6ff) } },
      vertexShader: 'attribute vec4 aR; attribute vec3 aC; uniform float uT, uLen, uW; varying float vA; varying float vU; varying float vB;' +
        ' void main(){ float z = mod(aR.z + uT, 70.0) - 71.5; vec2 dir = vec2(cos(aR.x), sin(aR.x)); vec2 side = vec2(-dir.y, dir.x);' +
        ' vec3 p = vec3(dir * aR.y + side * aC.x * uW * (1.0 - aC.y * 0.85), z - aC.y * aR.w * uLen);' +
        ' vA = smoothstep(-50.0, -26.0, z) * smoothstep(-1.2, -6.0, z); vU = aC.y; vB = aC.z;' +
        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform float uOp; uniform vec3 uCol; varying float vA; varying float vU; varying float vB; void main(){ float t = 1.0 - vU; gl_FragColor = vec4(uCol * vA * uOp * vB * t * t, 1.0);\n#include <colorspace_fragment>\n}',
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false,
    }));
    mat.uniforms.uOp.value = 0;
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 20;
    return { mesh: m, mat, col: new THREE.Color(0xd8f6ff) };
  }

  function makeRacerVisual(R, r) {
    const art = shipArt(r.style, r.colors);
    r.art = art;
    const root = new THREE.Object3D(), body = new THREE.Object3D();
    root.matrixAutoUpdate = false;
    const mesh = new THREE.Mesh(art.solid || art.glow, art.solid ? G.M.vc({ spec: 0.7, rimStr: 0.5, rimColor: 0xbff8ff }) : G.M.basic(0xffffff, { vertexColors: true }));
    body.add(mesh);
    if (art.solid && art.glow) body.add(new THREE.Mesh(art.glow, G.M.basic(0xffffff, { vertexColors: true })));
    root.add(body);
    R.world.add(root);
    r.root = root; r.body = body;
  }

  // ------------------------------------------------------------------ input
  function readPlayerInput(R, r, dt) {
    const I = inp();
    let st = I.steer || 0;
    if (I.device === 'desktop') {
      // keyboard: ramp toward the key target for smooth steering
      const tgt = clamp(st, -1, 1);
      r.kSteer += clamp(tgt - r.kSteer, -dt * 6, dt * 6);
      st = r.kSteer;
    } else {
      // touch drag: One Euro filter first (finger jitter and coalesced pointer events made the lean and
      // heading shimmer), then the dead zone and response curve
      st = oneEuro(r.steerF, clamp(st, -1, 1), dt, 3.2, 1.6);
      const a = Math.abs(st);
      st = a < 0.1 ? 0 : fsign(st) * Math.pow((a - 0.1) / 0.9, 1.2);
    }
    r.steer = clamp(st, -1, 1);
    r.boostHeld = !!I.boost || (I.device === 'desktop' && I.move && I.move.y > 0.5);
    r.brakeHeld = !!I.brake;
    r.fireHeld = !!I.fire;
    // item: tap = use (on release), hold 0.6 s = absorb
    const btn = G.Input.btn && G.Input.btn('item');
    const held = (btn && btn.classList.contains('down')) || heldKeys.has('KeyB') || heldKeys.has('KeyE');
    if (I.itemP && r.itemHold < 0 && (r.item || r.pending)) r.itemHold = 0;
    if (r.itemHold >= 0) {
      if (!r.item) { if (!held && !r.pending) r.itemHold = -1; }
      else if (held) { r.itemHold += dt; if (r.itemHold >= TUNE.absorbHold) { absorbItem(R, r); r.itemHold = -1; } }
      else { useItem(R, r); r.itemHold = -1; }
    }
    if ((I.reloadP || R.swipeRoll) && R.started) startRoll(R, r);
    R.swipeRoll = false;
  }

  // ------------------------------------------------------------------ AI
  function controlBot(R, r, dt, fr) {
    const A = r.ai, T = R.T;
    A.think -= dt; A.laneT -= dt;
    if (A.laneT <= 0) { A.laneT = frange(2.5, 6); A.lane = A.pers === 'careful' ? frange(-3, 3) : frange(-6, 6); }
    const la = r.v * 0.45;
    _FA[0] = r.s + (la > 18 ? la : 18); frameAtR(T, _fr2);
    let tx = _fr2.line + A.lane * (1 - _fr2.pipe * 0.5);
    // avoid the racer ahead (index loops throughout the per-step code: no iterator objects)
    const RS = R.racers;
    for (let i = 0; i < RS.length; i++) {
      const o = RS[i];
      if (o === r) continue;
      const d = o.dist - r.dist;
      if (d > 0 && d < 15 && Math.abs(o.x - tx) < 3) tx += (o.x > r.x ? -4 : 4) * (A.pers === 'aggressive' ? 0.6 : 1);
    }
    // dodge asteroids ahead: Spicy/Blazing bots read the whole gauntlet and thread a gap (planned last, so pads
    // and wobbles never steer them back into a rock); the others react rock by rock
    // (track distances wrap inline with one add: both ends are in [0, L), so their difference is in (-L, L). A mod()
    // call per rock per bot, or a double %, passed and returned boxed numbers in the mid-tier compiled code: ~10 KB of
    // garbage per frame on a rocky course)
    const L = T.L, rs = r.s;
    if (!R.diff.dodge) {
      // (only the rocks in the next 45 u: sorted list + binary search, see rockAt)
      const KS = T.rockSorted, n = KS.length;
      for (let c = 0, i = rockAt(KS, rs); c < n; c++, i++) {
        if (i >= n) i = 0;
        const k = KS[i]; let d = k.s - rs; if (d < 0) d += L; if (d > 45) break;
        if (Math.abs(k.x - tx) < k.r + 2.2) tx = k.x + (tx >= k.x ? 1 : -1) * (k.r + 2.6);
      }
    }
    // dodge mines
    const MS = R.mines;
    for (let i = 0; i < MS.length; i++) { const m = MS[i]; let d = m.s - rs; if (d < 0) d += L; if (d < 30 && Math.abs(m.x - tx) < 2.8) tx = m.x + (tx >= m.x ? 3.2 : -3.2); }
    // aim for boost pads and gold rings when close to the line
    const PS = T.pads, np = PS.length;
    for (let c = 0, i = rockAt(PS, rs); c < np; c++, i++) { if (i >= np) i = 0; const p = PS[i]; let d = p.s - rs; if (d < 0) d += L; if (d >= 50) break; if (d > 4 && Math.abs(p.x - tx) < 5) tx = p.x; }
    if (A.wob > 0) { A.wob -= dt; tx += A.wobX; }
    if (R.diff.dodge) tx = threadRocks(R, r, tx, fr);
    const lim = fr.hw - TUNE.shipHalf - 0.4;
    r.tx = clamp(tx, -lim, lim);
    // wobble once per lap with a small chance
    const lap = Math.floor(r.dist / T.L) | 0;            // (| 0: an int32, as the integer field it is compared with / stored in)
    if (lap !== A.lastLap) { A.lastLap = lap; A.wobAt = frand() < A.wobChance ? frange(0.1, 0.9) * T.L : -1; }
    if (A.wobAt > 0 && Math.abs(r.s - A.wobAt) < 3 && A.wob <= 0) { A.wob = frange(0.4, 0.7); A.wobX = frange(-1, 1) * 7; A.wobAt = -1; r.v *= 0.95; }
    // short manual boost bursts on straights (aggressive bots more often); same energy rules as the player
    if (A.burst > 0) { A.burst -= dt; if (A.burst <= 0) A.boostT = A.pers === 'aggressive' ? frange(5, 8) : frange(9, 14); }
    else if (A.boostT <= 0 && R.phase === 'race' && Math.abs(_fr2.k) < 0.004 && r.energy > R.diff.burst[A.pers === 'aggressive' ? 0 : 1]) A.burst = frange(0.8, 1.4);
    r.boostHeld = A.burst > 0;
    // blaster bursts at a rival ahead (aggressive bots fire more often)
    A.fireT -= dt; A.fireCd -= dt;
    if (A.fireT <= 0 && A.fireCd <= 0 && R.phase === 'race' && r.energy > 30) {
      const tg = findAhead(R, r, 40);
      if (tg && Math.abs(tg.x - r.x) < 4) { A.fireT = frange(0.6, 1.1); A.fireCd = A.pers === 'aggressive' ? frange(4, 7) : frange(9, 15); }
    }
    r.fireHeld = A.fireT > 0;
    // items
    if (r.item && A.think <= 0) {
      A.think = 0.2;
      if (A.react > 0) { A.react -= 0.2; return; }
      botItem(R, r);
    }
  }
  // Spicy/Blazing bots thread asteroid gauntlets: pick the lateral target that clears the asteroids in the
  // next DG.look u, preferring the wanted line. For each candidate the bot's own steering response (the
  // auto branch of stepRacer) is simulated forward and checked against the rocks it would pass; hits are
  // weighted e^(-d/DG.disc) (near rocks are certain, far ones can still be re-planned). The long horizon
  // matters: a gap that looks fine for the next rock can lead straight into the one after it.
  // Re-planned every 0.1 s per bot while rocks are in range (a few rocks × 21 candidates × ~25 steps).
  const DG = { look: 90, disc: 45, margin: 0.7, dt: 0.05, gain: 2.4 }, BOT_GAIN = 2.4;
  const _near = [], _hit = new Uint8Array(256);
  function threadRocks(R, r, want, fr) {
    const A = r.ai, T = R.T;
    A.dodgeT -= R._dt;
    if (A.dodgeT > 0) return A.dodgeX === A.dodgeX ? A.dodgeX : want;     // NaN: no plan
    A.dodgeT = 0.1;
    _near.length = 0;
    const KS = T.rockSorted, n = KS.length;
    const L = T.L, rs = r.s;
    for (let c = 0, i = rockAt(KS, rs); c < n && _near.length < 256; c++, i++) { if (i >= n) i = 0; const k = KS[i]; let d = k.s - rs; if (d < 0) d += L; if (d >= DG.look) break; _near.push(k, d); }
    if (!_near.length) { A.dodgeX = NaN; return want; }
    const lim = fr.hw - TUNE.shipHalf - 0.4, v = fmax(20, r.v), lat = 13 + r.v * 0.2, kv = 1 - Math.exp(-6 * DG.dt);
    const steps = fmin(40, Math.ceil(DG.look / (v * DG.dt)));
    let best = want, bc = Infinity;
    for (let c = 0; c <= 20; c++) {
      const x = -lim + (2 * lim) * c / 20;
      let cost = Math.abs(x - want) * 0.35 + Math.abs(x - r.x) * 0.15;
      let px = r.x, pvx = r.vx;
      _hit.fill(0, 0, _near.length);
      for (let j = 1; j <= steps; j++) {
        pvx += (clamp((x - px) * DG.gain, -lat, lat) - pvx) * kv;
        px = clamp(px + pvx * DG.dt, -lim, lim);
        const sa = v * j * DG.dt;
        for (let i = 0; i < _near.length; i += 2) {
          const k = _near[i], d = _near[i + 1];
          if (_hit[i] || Math.abs(d - sa) > k.r + 1.2 + v * DG.dt * 0.5) continue;
          if (Math.abs(px - k.x) < k.r + 1.1 + DG.margin) { _hit[i] = 1; cost += 40 * Math.exp(-d / DG.disc); }
        }
      }
      if (cost < bc) { bc = cost; best = x; }
    }
    A.dodgeX = best;
    return best;
  }
  function botItem(R, r) {
    const it = r.item, T = R.T, RS = R.racers;
    let ahead = null, aheadD = 0, behind = null, near = 0;
    for (let i = 0; i < RS.length; i++) {
      const o = RS[i];
      if (o === r || o.finished) continue;
      const d = o.dist - r.dist;
      if (d > 4 && d < 70 && (!ahead || d < aheadD)) { ahead = o; aheadD = d; }
      if (d < -2 && d > -26) behind = o;
      if (Math.abs(d) < ITEMS.static.r) near++;
    }
    r.ai.hold += 0.2;
    const hold = r.ai.hold;
    let use = false;
    switch (it) {
      case 'rockets': use = (ahead && Math.abs(ahead.x - r.x) < 4 && aheadD < 60) || hold > 7; break;
      case 'homing': use = !!(ahead && aheadD < 60) || hold > 8; break;
      case 'mine': use = !!behind || hold > 5; break;
      case 'shield': { let tgt = false; for (let i = 0; i < R.proj.length; i++) if (R.proj[i].target === r) { tgt = true; break; } use = tgt || hold > 3; break; }
      case 'static': use = near >= 2 || hold > 6; break;
      case 'turbo': frameAt(T, r.s + 60, _fr2); use = Math.abs(_fr2.k) < 0.006 || hold > 3; break;
      default: use = true;
    }
    if (use) { useItem(R, r); r.ai.hold = 0; }
  }

  // ------------------------------------------------------------------ physics
  const O_JUMP = { pitch: 0.8 }, O_CHARGE = { grav: -2 }, O_BOX = { grav: 0, drag: 3 }, O_ROCK = { grav: 0, drag: 2.5 }, BOX_COLS = [0xb983ff, 0x7af0ff, 0xffd23f, 0xffffff];
  // Count-down timers, spelled out (a keyed r[k] loop over 17 names went megamorphic and boxed every value it wrote).
  function tickTimers(r, dt) {
    if (r.padT > 0) r.padT = r.padT > dt ? r.padT - dt : 0;
    if (r.dbT > 0) r.dbT = r.dbT > dt ? r.dbT - dt : 0;
    if (r.startT > 0) r.startT = r.startT > dt ? r.startT - dt : 0;
    if (r.turboT > 0) r.turboT = r.turboT > dt ? r.turboT - dt : 0;
    if (r.slingT > 0) r.slingT = r.slingT > dt ? r.slingT - dt : 0;
    if (r.trickT > 0) r.trickT = r.trickT > dt ? r.trickT - dt : 0;
    if (r.ringT > 0) r.ringT = r.ringT > dt ? r.ringT - dt : 0;
    if (r.guideT > 0) r.guideT = r.guideT > dt ? r.guideT - dt : 0;
    if (r.spinT > 0) r.spinT = r.spinT > dt ? r.spinT - dt : 0;
    if (r.slowT > 0) r.slowT = r.slowT > dt ? r.slowT - dt : 0;
    if (r.zapT > 0) r.zapT = r.zapT > dt ? r.zapT - dt : 0;
    if (r.itemsOffT > 0) r.itemsOffT = r.itemsOffT > dt ? r.itemsOffT - dt : 0;
    if (r.shieldT > 0) r.shieldT = r.shieldT > dt ? r.shieldT - dt : 0;
    if (r.rollCd > 0) r.rollCd = r.rollCd > dt ? r.rollCd - dt : 0;
    if (r.wallCd > 0) r.wallCd = r.wallCd > dt ? r.wallCd - dt : 0;
    if (r.fireCd > 0) r.fireCd = r.fireCd > dt ? r.fireCd - dt : 0;
    if (r.graceT > 0) r.graceT = r.graceT > dt ? r.graceT - dt : 0;
  }
  function stepRacer(R, r, dt) {
    const T = R.T, fr = _fr;
    _FA[0] = r.s; frameAtR(T, fr);
    tickTimers(r, dt);
    if (r.rollT > 0) { r.rollT -= dt; if (r.air) r.rolledAir = true; if (r.rollT <= 0) r.rollT = 0; }
    if (r.stallT > 0) { r.stallT -= dt; if (r.stallT <= 0) { r.stallT = 0; r.energy = TUNE.stallRestart; } }
    if (r.rouletteT > 0) { r.rouletteT -= dt; if (r.rouletteT <= 0) { r.item = r.pending; r.pending = null; if (r.isPlayer && G.Audio) G.Audio.sfx('item'); if (r.ai) r.ai.react = frange(0.3, 0.8) * (r.ai.pers === 'itemy' ? 0.5 : 1); } }
    if (r.rocketsLeft > 0) { r.rocketT -= dt; if (r.rocketT <= 0) { r.rocketT = 0.14; r.rocketsLeft--; fireProj(R, r, 'rockets', null); } }
    const auto = r.ai || r.guideT > 0 || r.finished || (r.isPlayer && R.assist === 'auto');
    if (r.isPlayer && !r.finished && R.started) readPlayerInput(R, r, dt);
    else if (r.isPlayer) { r.steer = 0; r.boostHeld = false; r.brakeHeld = false; r.fireHeld = false; }
    if (r.ai && R.started) controlBot(R, r, dt, fr);
    if (r.ai && R.started && r.ai.boostT > 0) r.ai.boostT -= dt;
    // --- drift / brake
    const canDrift = !r.ai && !auto && R.started && !r.air && r.spinT <= 0 && r.stallT <= 0;
    if (canDrift && r.brakeHeld && !r.drifting && Math.abs(r.steer) > 0.35 && r.v > 30) { r.drifting = true; r.driftDir = fsign(r.steer); r.driftT = 0; r.driftTier = 0; if (G.Audio) G.Audio.sfx('slide', { vol: 0.6 }); }
    if (r.drifting && (!r.brakeHeld || !canDrift || r.v < 22)) {
      if (r.driftTier > 0 && canDrift) { r.dbT = TUNE.driftBoost[r.driftTier - 1]; r.dbK = TUNE.driftK; r.dbTier = r.driftTier; boostFx(R, r, r.driftTier, true); if (r.isPlayer) say(R, 'race.drift', ['#7af0ff', '#ff6fd8', '#ffd23f'][r.driftTier - 1]); }
      r.drifting = false; r.driftT = 0; r.driftTier = 0;
    }
    if (r.drifting) {
      r.driftT += dt * (r.steer * r.driftDir > 0.5 ? 1.5 : 1);
      const tier = r.driftT >= TUNE.drift[2] ? 3 : r.driftT >= TUNE.drift[1] ? 2 : r.driftT >= TUNE.drift[0] ? 1 : 0;
      if (tier > r.driftTier && r.isPlayer) { if (G.Audio) G.Audio.sfx('ring', { pitch: 0.7 + tier * 0.15, vol: 0.5 }); driftTierFx(R, r, tier); }
      r.driftTier = tier;
    }
    r.braking = !r.drifting && r.brakeHeld && !auto && R.started;
    // --- speed
    const cls = R.clsK;
    let topK = 1;
    // (min / max / clamp written out on the bots' path through this function and the steering below: the mid-tier
    // compiler does not inline a helper call on a branch that runs less than ~95% of the time — here 7 of 8 skiffs —
    // and boxed its arguments and result: ~30 small objects per bot per step)
    if (r.ai) {
      const gap = R.player && !R.player.finished ? R.player.dist - r.dist : 0;
      const rbD = R.diff.rb, rbRaw = 1 + 0.0009 * gap;
      const rb = rbRaw < 1 - rbD ? 1 - rbD : rbRaw > 1 + rbD ? 1 + rbD : rbRaw;
      const la = r.v * 0.6;
      _FA[0] = r.s + (la > 20 ? la : 20); frameAtR(T, _fr2);
      const k2 = Math.abs(_fr2.k), k1 = Math.abs(fr.k), kk = k2 > k1 ? k2 : k1;
      const cr = Math.sqrt(R.diff.lat / (kk > 1e-4 ? kk : 1e-4)) / TUNE.top;
      const corner = cr < 0.72 ? 0.72 : cr > 1 ? 1 : cr;
      topK = r.ai.skill * rb * (corner + (1 - corner) * (rbD > 0 && gap > 60 ? 0.5 : 0));
    }
    // auto-steer flies a safe, slightly slower line (a little slower still in the fast classes, where hand
    // steering costs a skilled pilot more: else it reached Gold on Comet, e.g. on some daily tracks)
    if (r.isPlayer && R.assist === 'auto' && r.guideT <= 0) topK = TUNE.assistTop - 0.02 * (R.clsK - 1) / 0.45;
    const top = TUNE.top * cls * topK * (r.isPlayer ? R.up.top : 1);
    let k = 0;
    if (r.padT > 0 && TUNE.padK > k) k = TUNE.padK;
    if (r.dbT > 0 && r.dbK > k) k = r.dbK;
    if (r.startT > 0 && r.startK > k) k = r.startK;
    if (r.turboT > 0 && ITEMS.turbo.k > k) k = ITEMS.turbo.k;
    if (r.slingT > 0 && TUNE.slingK > k) k = TUNE.slingK;
    if (r.trickT > 0 && 0.25 > k) k = 0.25;
    if (r.ringT > 0 && 0.2 > k) k = 0.2;
    if (r.guideT > 0 && ITEMS.guide.k > k) k = ITEMS.guide.k;
    r.manual = false;
    if (r.boostHeld && r.stallT <= 0 && r.energy > 0 && R.started && !r.finished) {
      r.manual = true; r.energy -= TUNE.boostDrain * dt * (r.isPlayer ? R.up.drain : 1);
      if (r.energy <= 0) {
        // Boosting runs dry without stalling (holding W / BOOST the whole race is the natural instinct and
        // used to overheat every 4 s). An empty tank is still the risk: the next bump or hit overheats you.
        r.energy = 0; r.manual = false;
        if (r.isPlayer && R.t - (R._lowT || -9) > 2.5) { R._lowT = R.t; say(R, 'race.lowEnergy', '#ff4d5e'); if (G.Audio) G.Audio.sfx('empty'); }
      }
    }
    const kb = r.manual ? TUNE.boostK : 0;
    const mult = 1 + (k > kb ? k : kb) + (r.manual && k > 0 ? TUNE.stackK : 0) + (r.drafting ? TUNE.draftK : 0);
    const tUn = top * mult, tCap = TUNE.cap * cls;
    let target = tUn < tCap ? tUn : tCap;
    if (r.stallT > 0) target = top * 0.35;
    if (r.slowT > 0) target *= 0.65;
    if (r.zapT > 0) target *= 0.92;             // blaster pellet hit (GDD: −8% for 0.4 s)
    if (r.spinT > 0) target *= 0.4;
    if (r.braking) target *= 0.85;              // GDD: DRIFT held without steering brakes −15%
    if (r.drifting) target *= TUNE.driftSlow;
    if (!R.started) target = 0;
    if (r.startK < 0 && r.startT > 0) target *= 0.35;       // sputter
    r.boosting = R.started && mult > 1.05 && r.stallT <= 0;
    if (r.v < target) {
      const vf = r.v / top;
      const a = TUNE.accel * (1.25 - 0.5 * (vf < 0 ? 0 : vf > 1 ? 1 : vf)) * ((k > 0 || r.manual) ? 1.6 : 1);
      const vUp = r.v + a * dt;
      r.v = vUp < target ? vUp : target;
    } else {
      const vDn = r.v - (r.braking ? 40 : 12 + (r.v - target) * 1.3) * dt;
      r.v = vDn > target ? vDn : target;
    }
    // --- steering
    let vs;
    if (auto) {
      if (!r.ai) {
        const la = r.v * 0.45;
        _FA[0] = r.s + (la > 18 ? la : 18); frameAtR(T, _fr2);
        let tx = _fr2.line;
        if (R.assist === 'auto' && !r.finished && r.guideT <= 0) tx = clamp(_fr2.line + r.steer * fr.hw * 0.75, -fr.hw + 2, fr.hw - 2);
        const KS = T.rockSorted, n = KS.length;
        for (let c = 0, i = rockAt(KS, r.s); c < n; c++, i++) { if (i >= n) i = 0; const kk = KS[i]; let d = kk.s - r.s; if (d < 0) d += T.L; if (d >= 45) break; if (Math.abs(kk.x - tx) < kk.r + 2.2) tx = kk.x + (tx >= kk.x ? 1 : -1) * (kk.r + 2.6); }
        r.tx = clamp(tx, -fr.hw + 2, fr.hw - 2);
      }
      const latMax = (13 + r.v * 0.2) * (R.started ? 1 : 0);
      const wRaw = (r.tx - r.x) * (r.ai && R.diff.dodge ? DG.gain : BOT_GAIN);
      const want = wRaw < -latMax ? -latMax : wRaw > latMax ? latMax : wRaw;
      r.vx = want + (r.vx - want) * Math.exp(-6 * dt);                      // (= damp(r.vx, want, 6, dt))
      r.psi = Math.atan2(r.vx, r.v > 12 ? r.v : 12);
      const cu = 1 + fr.k * r.x;
      vs = r.v * Math.cos(r.psi) / (cu < 0.6 ? 0.6 : cu > 1.6 ? 1.6 : cu);
      r.x += r.vx * dt;
    } else {
      const sp = clamp(r.v / (TUNE.top * cls), 0, 1.4);
      const yawRate = lerp(2.6, 1.65, sp);
      const st = r.spinT > 0 || r.stallT > 0 ? r.steer * 0.3 : r.steer;
      const omega = r.drifting ? (r.driftDir * 0.6 + st * 0.5) * yawRate * 1.1 : st * yawRate;
      vs = r.v * Math.cos(r.psi) / clamp(1 + fr.k * r.x, 0.6, 1.6);
      const comp = R.assist === 'pro' ? 0.1 : 0.35;
      r.psi += (omega + fr.k * vs * (1 - comp)) * dt;
      const center = (Math.abs(st) < 0.08 && !r.drifting) ? 2.4 : 0.55;
      r.psi -= r.psi * center * dt;
      // soft wall nudge (standard assist): keep off the rails when not steering
      if (R.assist !== 'pro' && Math.abs(st) < 0.08 && Math.abs(r.x) > fr.hw - 4.5 && fsign(r.psi) === fsign(r.x)) r.psi -= r.psi * 3 * dt;
      // wrong-way auto-turn assist
      if (r.wrongT > 1.6) r.psi -= fsign(r.psi) * fmin(Math.abs(r.psi), 2.2 * dt);
      r.psi = wrapA(r.psi);
      let vx = r.v * Math.sin(r.psi);
      if (r.drifting) vx -= r.driftDir * r.v * 0.07;
      r.vx = vx;
      r.x += vx * dt;
    }
    const prevS = r.s;
    let sNew = r.s + vs * dt;
    if (sNew >= T.L) sNew -= T.L; else if (sNew < 0) sNew += T.L;
    if (sNew < 0 || sNew >= T.L) sNew -= Math.floor(sNew / T.L) * T.L;   // (a step longer than a lap: never in play)
    r.s = sNew;
    r.prevDist = r.dist;
    r.dist += vs * dt;
    r.vsNow = vs;                               // along-track speed this step (line-crossing time interpolation)
    // --- walls
    const lim = fr.hw - TUNE.shipHalf;
    if (Math.abs(r.x) > lim) {
      const side = fsign(r.x);
      r.x = side * lim;
      const sinT = clamp(side * r.vx / fmax(10, fhyp(r.vx, r.v)), 0, 1);
      // scrape state for the visuals: sparks stream from the contact point while it lasts (racerFx)
      r.scrapeT = 0.12; r.scrapeSide = side; r.scrapeK = fmax(r.scrapeK, 0.25 + sinT);
      if (sinT > 0.06) {
        r.v *= 1 - (0.05 + 0.30 * sinT); r.dbg.wall++;
        if (r.wallCd <= 0) { addEnergy(R, r, -lerp(3, 10, sinT)); r.wallCd = 0.3; }
        if (!auto) { r.psi = -r.psi * 0.4; r.vx = -r.vx * 0.4; } else r.vx = -r.vx * 0.4;
        if (r.drifting && sinT > 0.3) { r.drifting = false; r.driftTier = 0; }
        wallFx(R, r, side, sinT);
      } else {
        if (!auto) r.psi *= 0.6;
        r.vx = 0;
      }
    }
    // --- height / jumps
    const ground = fr.lift + TUNE.hover;
    // (crossings tested inline against this step's forward move: see triggers)
    let fwdS = r.s - prevS; if (fwdS < -T.L / 2) fwdS += T.L; if (fwdS > T.L / 2) fwdS -= T.L;
    if (fwdS > 0) for (let i = 0; i < T.jumps.length; i++) { let off = T.jumps[i].kick - prevS; if (off < 0) off += T.L; if (off > 0 && off <= fwdS && !r.air) { r.air = true; r.vh = 9 + r.v * 0.07; if (r.isPlayer && G.Audio) G.Audio.sfx('jump', O_JUMP); } }
    if (r.air) {
      r.vh -= TUNE.grav * dt; r.h += r.vh * dt;
      if (r.h <= ground && !fr.gap) {
        r.landK = fmax(r.landK, clamp(-r.vh / 22, 0, 1));     // visual landing squash (placeRacer)
        r.h = ground; r.air = false;
        if (r.isPlayer) { R.impact = fmax(R.impact, 0.35); if (G.Audio) G.Audio.sfx('land'); }
        // barrel roll performed in the air: trick boost on landing (GDD)
        if (r.rolledAir) { r.rolledAir = false; r.trickT = TUNE.trickT; boostFx(R, r, 1); if (r.isPlayer) say(R, 'race.trick', '#ffd23f'); }
      }
      else if (fr.gap && r.h < ground - 6) tractor(R, r);
    } else {
      r.h = ground;
      if (fr.gap) { r.air = true; r.vh = 0; }
    }
    // --- triggers + blaster
    triggers(R, r, prevS, fr);
    if (r.fireHeld && r.fireCd <= 0) fireBlaster(R, r);
    // --- laps / checkpoints
    progress(R, r);
    // wrong way + stuck
    if (r.isPlayer && R.started && !r.finished) {
      r.wrongT = (vs < -1 || Math.cos(r.psi) < -0.1) ? r.wrongT + dt : fmax(0, r.wrongT - dt * 2);
      r.stuckT = r.v < 6 && r.stallT <= 0 && r.spinT <= 0 ? r.stuckT + dt : 0;
      if (r.stuckT > 3.5) { r.stuckT = 0; tractor(R, r); }
    }
  }
  function crossed(T, a, b, s) {
    // forward crossing of track position s between a -> b (handles wrap)
    let d = b - a; if (d < -T.L / 2) d += T.L; if (d > T.L / 2) d -= T.L;
    if (d <= 0) return false;
    const off = mod(s - a, T.L);
    return off > 0 && off <= d;
  }
  function addEnergy(R, r, n) {
    if (r.finished) return;
    if (n < 0 && r.isPlayer) n *= R.up.hull;     // hull upgrade softens wall / rock / item hits
    r.energy = clamp(r.energy + n, 0, 100);
    if (n < 0 && r.energy <= 0 && r.stallT <= 0) stall(R, r);
  }
  function stall(R, r) {
    r.stallT = TUNE.stall; r.energy = 0; r.drifting = false; r.manual = false; r.dbg.stall++;
    // (no callout: the blinking OVERHEAT! warning in the HUD already says it; two copies stacked on screen)
    if (r.isPlayer && G.Audio) G.Audio.sfx('shieldBreak', { vol: 0.6 });
    R.world.fx.smoke(r.wp, 6);
  }
  function tractor(R, r) {
    const T = R.T;
    // fell through a jump gap: beam across to the landing zone; otherwise back to the last checkpoint
    const jump = T.jumps.find(j => mod(r.s - j.s0, T.L) < j.land - j.s0);
    let moved;
    if (jump) { const fwd = mod(jump.land + 4 - r.s, T.L); r.s = mod(r.s + fwd, T.L); r.dist += fwd; moved = fwd; }
    else {
      let best = 0; for (const c of T.cps) if (c < r.s - 5 && c > best) best = c;
      const back = mod(r.s - best, T.L);
      r.s = mod(best + 2, T.L); r.dist -= back - 2; moved = Math.abs(back - 2);
    }
    // beam-out sparkle where the skiff was, beam-in flash where it lands (placeRacer moves it this frame)
    if (r.isPlayer || R.isNear(r)) R.world.fx.sparkle(r.wp, 0x7af0ff, 8, 0.5);
    // a fair restart: on the racing line facing down the track, clear of the next asteroids, with a short grace
    // (items can't spin it out while it gets going again)
    r.x = respawnX(T, r.s); r.tx = r.x; r.psi = 0; r.vx = 0; r.h = TUNE.hover; r.vh = 0; r.air = false;
    r.v = TUNE.top * R.clsK * 0.6; r.dbg.tractor++; r.graceT = fmax(r.graceT, 1.5);
    sprSet(r.sOff, 0); sprSet(r.sPsi, 0); sprSet(r.sVx, 0); sprSet(r.sV, r.v); r.trailReset = true; r.beamT = 0.45;
    if (r.isPlayer) {
      say(R, jump ? 'race.tractor' : 'race.backToCp', '#7af0ff'); if (G.Audio) G.Audio.sfx('teleport');
      const C = R.cs; sprSet(C.x, r.x * 0.82); sprSet(C.tx, r.x); sprSet(C.psi, 0);
      // a short hop (across a jump gap): the chase camera glides from where it was to the new spot. A long
      // one (back to the last checkpoint: up to a sixth of the lap) would fly the lens straight through the
      // scenery, so it cuts behind a tractor-beam flash instead, with the rig already settled in its
      // framing for the new spot (no swing or roll drift after the cut).
      if (moved < 90) camCut(R, 0.6, false);
      else {
        const wide = wideK();
        R.blend.dur = 0; R.camSnap = true;
        sprSet(C.back, 9.8); sprSet(C.h, 3.45 - wide * 0.3); sprSet(C.th, TUNE.hover + 1.3 - wide * 3.2); sprSet(C.look, 0); sprSet(C.roll, 0); C.fov.v = 0; C.punch.v = 0;
        if (G.RaceUI && G.RaceUI.beam) G.RaceUI.beam();
      }
    }
  }
  // Lateral spot for a tractor-beam restart at s: the racing line, nudged off any asteroid in the next 34 u.
  // Index of the first rock at or after track distance s in the sorted rock list (T.rockSorted): the per-step rock
  // checks (bots' dodging, the auto-steer line, rock hits) walk forward from here over the few rocks in their window,
  // instead of over all of them (a gauntlet course has 40+, checked by 8 skiffs every step).
  function rockAt(KS, s) {
    let lo = 0, hi = KS.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (KS[m].s < s) lo = m + 1; else hi = m; }
    return lo;
  }
  function respawnX(T, s) {
    const i = idxOf(T, s), hw = T.hw[i];
    let x = clamp(T.line[i], -hw + 3, hw - 3);
    for (let pass = 0; pass < 2; pass++) for (const k of T.rocks) {
      const d = mod(k.s - s, T.L);
      if (d > 34 && d < T.L - 4) continue;
      if (Math.abs(k.x - x) < k.r + 2.4) x = clamp(k.x + (x >= k.x ? 1 : -1) * (k.r + 2.8), -hw + 2, hw - 2);
    }
    return x;
  }
  function triggers(R, r, prevS, fr) {
    const T = R.T, L = T.L, rs = r.s;
    // Track distances wrap inline (both ends in [0, L): one add) and line crossings are tested against this step's
    // forward move (fwd): the mod() / crossed() helper calls (and a double %) passed and returned boxed numbers in the
    // mid-tier compiled code, a few hundred small objects per frame for 8 skiffs.
    let fwd = rs - prevS; if (fwd < -L / 2) fwd += L; if (fwd > L / 2) fwd -= L;
    // boost pads (stack by extending time): only the pads that can reach this spot (sorted by s, see rockAt)
    const PS = T.pads, np = PS.length, pw = T.padLenMax, ps0 = rs - pw < 0 ? rs - pw + L : rs - pw;
    for (let c = 0, i = rockAt(PS, ps0); c < np; c++, i++) {
      if (i >= np) i = 0;
      const p = PS[i]; let f = p.s - ps0; if (f < 0) f += L; if (f > pw) break;
      let off = rs - p.s; if (off < 0) off += L;
      if (off < p.len && Math.abs(r.x - p.x) < p.w / 2 + 0.9 && !r.air) {
        const lap = Math.floor(r.dist / T.L) | 0;
        if (r.pad !== p || r.padLap !== lap) {
          r.pad = p; r.padLap = lap;
          r.padT = fmin(TUNE.padMax, fmax(0, r.padT) + TUNE.padT);
          boostFx(R, r, 0);
        }
      }
    }
    // recharge strip + recovery zone + passive trickle
    let charging = false;
    const SS = T.strips;
    // (gains are added in place, = addEnergy() for a gain: its computed argument was boxed on these branches)
    for (let i = 0; i < SS.length; i++) { const st = SS[i]; let off = rs - st.s0; if (off < 0) off += L; if (off < st.s1 - st.s0 && Math.abs(r.x - st.x) < st.w / 2 + 0.8) { if (!r.finished) { const e = r.energy + TUNE.recharge * R._dt; r.energy = e > 100 ? 100 : e; } charging = true; } }
    if (r.s > T.recovery[0] && r.s < T.recovery[1]) { if (!r.finished) { const e = r.energy + TUNE.recovery * R._dt; r.energy = e > 100 ? 100 : e; } charging = true; }
    if (TUNE.regen && !r.manual && r.stallT <= 0) addEnergy(R, r, TUNE.regen * R._dt);
    if (charging && r.isPlayer && frand() < 0.5) R.world.fx.spawn(r.wp, _A.set(frange(-2, 2), frange(1, 4), frange(-2, 2)), frand() < 0.5 ? 0xff6fb5 : 0xffffff, 0.35, 0.5, O_CHARGE);
    r.charging = charging;
    // item boxes
    if (!R.tt) for (let ri = 0; ri < T.rows.length; ri++) {
      const row = T.rows[ri];
      let off = row.s - prevS; if (off < 0) off += L;
      if (!(fwd > 0 && off > 0 && off <= fwd)) continue;
      for (let bi = 0; bi < row.boxes.length; bi++) {
        const b = row.boxes[bi];
        if (b.t > 0 || Math.abs(b.x - r.x) > 2.7) continue;
        b.t = TUNE.itemRespawn;
        R.world.fx.burst(_A.copy(r.wp).addScaledVector(r.wf, 3), BOX_COLS, 14, 12, 0.35, 0.5, O_BOX);
        if (!r.item && !r.pending && r.itemsOffT <= 0 && !r.finished) giveItem(R, r, rollItem(R, r));
      }
    }
    // gold rings
    // (only the rings just ahead of where this step started: sorted list, see rockAt)
    const RG = T.ringSorted, ng = fwd > 0 ? RG.length : 0;
    for (let c = 0, ri = rockAt(RG, prevS); c < ng; c++, ri++) {
      if (ri >= ng) ri = 0;
      const gs = RG[ri], g = gs.g, gi = gs.i;
      let off = g.s - prevS; if (off < 0) off += L;
      if (off > fwd) break;
      if (!(off > 0)) continue;
      const lap = Math.floor(r.dist / T.L) | 0;
      if (r.ringLap !== lap * 10 + g.chain) { r.ringLap = lap * 10 + g.chain; r.ringMask = 0; }
      if (fhyp(r.x - g.x, (r.h - TUNE.hover) - (g.h - 1.6)) < g.R - 0.6) {
        r.ringMask |= 1 << g.k;
        addEnergy(R, r, 10); r.ringT = 0.5;
        if (r.isPlayer) {
          if (G.Audio) G.Audio.sfx('ring', { pitch: 1 + g.k * 0.12 });
          ringFx(R, g, gi);
          if (G.RaceUI && G.RaceUI.ring) G.RaceUI.ring(bitCount(r.ringMask), 5);
        }
        if (r.ringMask === 31) { r.ringChains++; if (r.isPlayer) { R.ringChainsTotal++; say(R, 'race.ringChain', '#ffd23f', { n: 50 }); if (G.Audio) G.Audio.sfx('star', { n: 3 }); } }
      }
    }
    // asteroids: only the rocks within 6 u either side (sorted list + binary search, see rockAt)
    const KS = T.rockSorted, nk = KS.length, s0 = rs - 6 < 0 ? rs - 6 + L : rs - 6;
    for (let c = 0, ki = rockAt(KS, s0); c < nk; c++, ki++) {
      if (ki >= nk) ki = 0;
      const k = KS[ki];
      let f = k.s - s0; if (f < 0) f += L; if (f > 12) break;                   // past the window
      let ds = k.s - rs; if (ds > L / 2) ds -= L; else if (ds < -L / 2) ds += L; ds = Math.abs(ds);   // signed wrap, then size
      if (ds > k.r + 1.2 || Math.abs(k.x - r.x) > k.r + 1.1) continue;
      if (k.hitT[r.i] && R.t - k.hitT[r.i] < 0.6) continue;
      k.hitT[r.i] = R.t;
      const side = r.x >= k.x ? 1 : -1, ox = r.x;
      r.x = k.x + side * (k.r + 1.15); r.v *= 0.72; r.vx = side * 8; if (!r.ai) r.psi = side * 0.15; r.dbg.rock++;
      // visual: the push-out is eased over ~0.2 s and the skiff wobbles away from the rock
      r.sOff.x += ox - r.x; r.sRoll.v += side * 7; r.sYaw.v -= side * 5; r.sHov.v += 2.5;
      addEnergy(R, r, -TUNE.rockCost);
      R.world.fx.burst(r.wp, R.rockCols, 14, 9, 0.4, 0.6, O_ROCK);
      if (r.isPlayer) { R.impact = fmax(R.impact, 0.8); if (G.Audio) G.Audio.sfx('hit', { pitch: 0.6 }); }
    }
    // mines
    for (let i = R.mines.length - 1; i >= 0; i--) {
      const m = R.mines[i];
      if (m.owner === r && m.age < 1.2) continue;
      let ds = m.s - rs; if (ds > L / 2) ds -= L; else if (ds < -L / 2) ds += L; ds = Math.abs(ds);
      if (ds < 2.4 && Math.abs(m.x - r.x) < 2.4 && !r.air) { hitRacer(R, r, 'mine', m.owner); killMine(R, i, true); }
    }
    // draft (player only)
    if (r.isPlayer && R.started && !r.finished) {
      let inDraft = false;
      for (let oi = 0; oi < R.racers.length; oi++) { const o = R.racers[oi]; if (o === r) continue; const d = o.dist - r.dist; if (d > 2 && d < TUNE.draftDist && Math.abs(o.x - r.x) < TUNE.draftLat) { inDraft = true; break; } }
      if (inDraft) { r.draft = fmin(1, r.draft + R._dt / TUNE.draftCharge); r.draftLeft = 0; }
      else if (r.draft > 0) {
        r.draftLeft += R._dt;
        if (r.draft >= 1 && r.draftLeft < 0.05) { r.slingT = TUNE.slingT; say(R, 'race.draft', '#ffffff'); if (G.Audio) G.Audio.sfx('boost', { pitch: 1.3, vol: 0.6 }); }
        if (r.draftLeft > 0.3) r.draft = 0;
      }
      r.drafting = r.draft >= 1 && inDraft;
    }
  }
  // Line crossings are timed inside the physics sub-step that crossed them (R.stepT = race time at the end of this
  // sub-step) and interpolated back by the distance already past the line: two skiffs crossing in the same frame are
  // ranked by when they really crossed, not by the order they were stepped in.
  const crossT = (R, r, line) => (R.stepT != null ? R.stepT : R.rt) - fmax(0, r.dist - line) / fmax(10, r.vsNow || r.v);
  function progress(R, r) {
    const T = R.T;
    if (r.finished) return;
    // (| 0: int32 counts, as the integer fields they are compared with and stored in; a float result of Math.floor
    // there failed a small-integer check in the optimized code now and then and threw it away)
    const lapsNow = Math.floor(r.dist / T.L) | 0;
    if (lapsNow > r.lapsDone && r.dist > 0) {
      r.lapsDone = lapsNow;
      const tc = crossT(R, r, lapsNow * T.L);
      const lt = tc - r.lapStartT;
      r.lapTimes.push(lt); r.lapStartT = tc;
      if (!r.bestLap || lt < r.bestLap) r.bestLap = lt;
      if (r.isPlayer) onPlayerLap(R, r, lt);
      if (lapsNow >= R.laps && !r.finished) finishRacer(R, r);
    }
    const cpNow = Math.floor(r.dist / (T.L / 6)) | 0;
    if (cpNow > r.cpDone && r.dist > 0) {
      r.cpDone = cpNow;
      if (r.isPlayer) {
        const idx = mod(cpNow - 1, 6);
        cpGates(R, idx);
        if (idx < 5 && G.RaceUI && G.RaceUI.checkpoint) G.RaceUI.checkpoint(idx + 1, 6);
        if (R.tt && idx < 5) { R.splits[idx] = crossT(R, r, cpNow * T.L / 6) - r.lapStartT; if (R.refSplits && R.refSplits[idx] && G.RaceUI) G.RaceUI.split(R.splits[idx] - R.refSplits[idx]); }
      }
    }
  }
  // Checkpoint gates cleared this lap turn mint (the next one stays white): you can see where a tractor beam would
  // put you back. Crossing the start line starts a fresh lap: all white again.
  const CP_DONE = new THREE.Color(0x7dffc4), CP_OPEN = new THREE.Color(0xffffff);
  function cpGates(R, idx) {
    const g = R.gates; if (!g || !g.instanceColor) return;
    if (idx >= 5) for (let k = 0; k < g.count; k++) g.setColorAt(k, CP_OPEN);
    else g.setColorAt(idx, CP_DONE);
    g.instanceColor.needsUpdate = true;
    R.cpLast = idx;
  }
  function onPlayerLap(R, r, lt) {
    // ghost: keep the best lap of this session
    if (R.tt) {
      if (R.ghostRec.length > 30 && (!R.bestLapRec || lt < R.bestLapRec.t)) R.bestLapRec = { t: lt, data: R.ghostRec.slice(), sp: R.splits.slice(0, 5).concat([lt]) };
      R.ghostRec.length = 0; R.ghostT = 0; R.splits.length = 0;
      if (R.ghost) { R.ghost.t = 0; R.ghost.on = true; }
      if (r.lapsDone < R.laps) { r.item = 'turbo'; r.pending = null; }   // 1 free boost cell per lap
      if (R.refSplits && R.refSplits[5] && G.RaceUI) G.RaceUI.split(lt - R.refSplits[5], true);
    }
    if (r.lapsDone < R.laps && G.RaceUI) G.RaceUI.flash(G.t('race.lapTime', { n: r.lapsDone, t: fmt(lt) }), lt <= r.bestLap + 1e-6 ? '#5dff9a' : '#ffffff');
    // clean lap (no wall bump, asteroid or item hit all lap): a little energy back for tidy flying
    const hitsNow = r.dbg.wall + r.dbg.rock + r.hits;
    if (r.lapsDone < R.laps && hitsNow === r.lapHits0) {
      addEnergy(R, r, TUNE.cleanLap);
      say(R, 'race.cleanLap', '#5dff9a', { n: TUNE.cleanLap });
      if (G.Audio) G.Audio.sfx('ring', { pitch: 1.5, vol: 0.5 });
    }
    r.lapHits0 = hitsNow;
    if (r.lapsDone === R.laps - 1) {
      if (G.UI.banner) G.UI.banner(G.t('race.finalLap'), '', 1.6);
      // final lap: the music speeds up and lifts for 4 bars (riser into a crash, octave sparkle on the lead, 16th hats)
      if (G.Audio) { G.Audio.music(R.music, { rate: 1.08 }); if (G.Audio.lift) G.Audio.lift({ bars: 4 }); G.Audio.sfx('levelup', { vol: 0.5 }); }
    }
  }
  function finishRacer(R, r) {
    r.finished = true;
    r.finishT = crossT(R, r, R.laps * R.T.L);
    r.drifting = false; r.boostHeld = false;
    // the player's place is called once every skiff has run this sub-step (judgeFinish): a bot stepped after the
    // player that crossed earlier inside the same sub-step still counts as ahead
    if (r.isPlayer) R.finishPending = true;
  }
  function judgeFinish(R) {
    R.finishPending = false;
    const r = R.player;
    {
      R.phase = 'finish'; R.finishT = R.t;
      let place = 1; for (const o of R.racers) if (o !== r && o.finished && o.finishT <= r.finishT) place++;
      R.finishPlace = place;
      // personal best on this course + class (first finish counts too): a "New best!" stamp under the time
      const prev = R.def.daily ? null : record(R.def.id, R.cls);
      R.newBest = !R.def.daily && (!prev || !prev.b || r.finishT < prev.b);
      R.prevBest = prev && prev.b ? prev.b : 0;
      // one finish callout (the flash + banner pair used to stack two FINISH! on screen)
      if (G.RaceUI && G.RaceUI.finish) G.RaceUI.finish(G.t('race.finish'), R.tt ? fmt(r.finishT) : G.t('race.place.' + place), R.tt || place <= 3, R.newBest ? G.t('race.newBestT', { t: fmt(r.finishT) }) : null);
      else if (G.UI.banner) G.UI.banner(G.t('race.finish'), R.tt ? fmt(r.finishT) : G.t('race.place.' + place), 2.2);
      if (G.Audio) G.Audio.sfx(R.tt || place <= 3 ? 'win' : 'lose');
      if (R.newBest && G.Audio) setTimeout(() => { if (race === R && G.Audio) G.Audio.sfx('star', { pitch: 1.2 }); }, 650);
      R.world.fx.confetti(_A.copy(r.wp).addScaledVector(r.wn, 3), 60);
      R.world.fx.shock(_A, 9, 0xffd23f, 0.45, 0.8);
      // crossing the line in slow motion while the camera swings round to the front of the skiff
      // (the time scale is eased in and out in update(): see R.slowT)
      R.slowT = 0;
      camCut(R, 0.5, true);
    }
  }

  // ------------------------------------------------------------------ items
  function rollItem(R, r) {
    let lead = null; for (const o of R.racers) if (!lead || o.dist > lead.dist) lead = o;
    const gap = lead ? lead.dist - r.dist : 0;
    const row = ODDS.find(o => gap <= o.max) || ODDS[ODDS.length - 1];
    let t = Object.assign({}, row.t);
    const cometOk = gap > 600 && R.cometCd <= 0 && !R.proj.some(p => p.type === 'comet');
    if (!cometOk) delete t.comet;
    if (R.racers.length < 2) t = { turbo: 1 };
    return U.weighted(t).id;
  }
  function giveItem(R, r, id) {
    r.pending = id; r.rouletteT = r.isPlayer ? 0.9 : 0.1;
    if (r.isPlayer && G.Audio) G.Audio.sfx('coin', { pitch: 1.4, vol: 0.5 });
  }
  function absorbItem(R, r) {
    if (!r.item) return;
    r.item = null; addEnergy(R, r, TUNE.absorbGain);
    if (r.isPlayer) { say(R, 'race.absorb', '#7af0ff', { n: TUNE.absorbGain }); if (G.Audio) G.Audio.sfx('shieldUp'); }
    R.world.fx.burst(r.wp, [0x7af0ff, 0xffffff], 16, 6, 0.3, 0.5, { grav: -3, drag: 2 });
  }
  function useItem(R, r) {
    const it = r.item; if (!it || r.itemsOffT > 0) return;
    r.item = null;
    switch (it) {
      case 'rockets': r.rocketsLeft = 3; r.rocketT = 0; break;
      case 'homing': fireProj(R, r, 'homing', findAhead(R, r, 60)); break;
      case 'mine': dropMine(R, r); break;
      case 'shield': r.shieldT = ITEMS.shield.t; if (G.Audio) (r.isPlayer ? G.Audio.sfx('shieldBubble') : G.Audio.sfxAt('shieldBubble', r.wp)); break;
      case 'static': staticPop(R, r); break;
      case 'turbo': r.turboT = ITEMS.turbo.t; boostFx(R, r, 2); break;
      case 'guide': r.guideT = ITEMS.guide.t; boostFx(R, r, 1); break;
      case 'comet': { let lead = null; for (const o of R.racers) if (o !== r && !o.finished && (!lead || o.dist > lead.dist)) lead = o; if (lead) { fireProj(R, r, 'comet', lead); R.cometCd = 20; } break; }
    }
    if (r.isPlayer && G.RaceUI) G.RaceUI.itemUsed(it);
  }
  function findAhead(R, r, range) {
    let best = null, bd = range;
    const RS = R.racers;
    for (let i = 0; i < RS.length; i++) { const o = RS[i]; if (o === r || o.finished) continue; const d = o.dist - r.dist; if (d > 2 && d < bd) { bd = d; best = o; } }
    return best;
  }
  const projGeos = {};
  function projMesh(R, type) {
    R.projPool = R.projPool || {};
    const pool = R.projPool[type] || (R.projPool[type] = []);
    let m = pool.pop();
    if (!m) {
      const c = ITEMS[type].color;
      let g;
      if (type === 'rockets') g = projGeos.r || (projGeos.r = cachedGeo('pr_rocket', () => new THREE.ConeGeometry(0.45, 1.8, 8).rotateX(Math.PI / 2)));
      else if (type === 'comet') g = cachedGeo('pr_comet', () => new THREE.IcosahedronGeometry(1.6, 1));
      else if (type === 'mine') g = cachedGeo('pr_mine', () => new THREE.OctahedronGeometry(1.0, 1));
      else g = cachedGeo('pr_gloop', () => new THREE.SphereGeometry(0.8, 12, 8));
      m = new THREE.Mesh(g, G.M.toon(c, { emissive: c, ei: 0.6, spec: 0.8, rimStr: 0.8 }));
      m.userData.type = type;
    }
    m.visible = true; R.world.add(m);
    return m;
  }
  function freeMesh(R, m) { R.world.remove(m); (R.projPool[m.userData.type] || (R.projPool[m.userData.type] = [])).push(m); }
  function fireProj(R, r, type, target) {
    const p = floats({ type, owner: r, target, dist: r.dist + 2.5, x: r.x, h: 1.1, v: fmax(r.v + 50, type === 'comet' ? 150 : 110), life: type === 'comet' ? 14 : 2.2, age: 0, mesh: projMesh(R, type) });
    if (type === 'rockets') p.x = r.x + (r.rocketsLeft - 1) * 0.7;
    if (type === 'comet') { p.h = 8; p.dist = r.dist - 5; }
    R.proj.push(p);
    if (G.Audio) (r.isPlayer ? G.Audio.sfx('missile') : G.Audio.sfxAt('missile', r.wp));
    if (target && target.isPlayer && G.Audio) G.Audio.sfx('warn', { vol: 0.6 });
  }
  function dropMine(R, r) {
    const m = floats({ owner: r, s: mod(r.s - 4, R.T.L), x: r.x, age: 0, life: ITEMS.mine.life, mesh: projMesh(R, 'mine') });
    R.mines.push(m);
    if (G.Audio) G.Audio.sfxAt('splat', r.wp);
  }
  function killMine(R, i, pop) {
    const m = R.mines[i];
    if (pop) { trackMatrix(R.T, m.s, m.x, 1, 1, 0, _m4); _A.setFromMatrixPosition(_m4); R.world.fx.burst(_A, [0xff5fa2, 0xffffff], 18, 9, 0.4, 0.5, { grav: 6 }); }
    freeMesh(R, m.mesh); R.mines.splice(i, 1);
  }
  function staticPop(R, r) {
    R.world.fx.sphereFlash(r.wp, 25, 0xc4a8ff, 0.5);
    R.world.fx.ring(r.wp, 26, 0xc4a8ff, 0.5, r.wp.y);
    if (G.Audio) (r.isPlayer ? G.Audio.sfx('zap', { vol: 1 }) : G.Audio.sfxAt('zap', r.wp));
    for (const o of R.racers) {
      if (o === r || o.finished) continue;
      if (Math.abs(o.dist - r.dist) > ITEMS.static.r) continue;
      if (o.shieldT > 0) { o.shieldT = 0; popShield(R, o); continue; }
      o.slowT = ITEMS.static.slowT; o.itemsOffT = ITEMS.static.off;
      addEnergy(R, o, -ITEMS.static.cost);
      R.world.fx.sparks(o.wp, 0xc4a8ff, 12);
      if (o.isPlayer) R.impact = fmax(R.impact, 0.5);
    }
  }
  function popShield(R, o) {
    R.world.fx.burst(o.wp, [0x7af0ff, 0xffffff], 20, 8, 0.35, 0.4, { grav: 0 });
    if (o.isPlayer) { say(R, 'race.blocked', '#7af0ff'); if (G.Audio) G.Audio.sfx('shieldBreak', { vol: 0.5 }); }
  }
  function hitRacer(R, q, kind, src) {
    if (q.finished) return false;
    if (q.shieldT > 0) { q.shieldT = 0; popShield(R, q); return false; }
    if (q.rollT > 0 && kind !== 'mine') { if (q.isPlayer) say(R, 'race.deflect', '#ffffff'); R.world.fx.sparks(q.wp, 0xffffff, 10); return false; }
    // short grace after a hit: a 3-rocket volley or a homing + mine combo can't chain-stun into an overheat
    if (q.graceT > 0) { R.world.fx.sparks(q.wp, 0xffffff, 6); return false; }
    const d = ITEMS[kind];
    q.spinT = q.spinDur = d.spin || 0.6; q.drifting = false; q.dbT = 0; q.graceT = q.spinT + 0.6;
    addEnergy(R, q, -(d.cost || 15));
    q.hits++;
    R.world.fx.explosion(q.wp, kind === 'comet' ? 4 : 2.2, d.color);
    if (q.isPlayer) { R.impact = fmax(R.impact, kind === 'comet' ? 1 : 0.7); }
    if (src && src.isPlayer && src !== q) say(R, 'race.bonk', '#ff8a4c');
    return true;
  }
  // Ship blaster (GDD): twin pellets 3×/s, 2 energy per pair, 60 u range, auto-target in a ~10° cone.
  const O_BLAST_P = { vol: 0.5 }, O_BLAST_B = { vol: 0.4 };
  function fireBlaster(R, r) {
    if (r.energy < 3 || r.stallT > 0 || r.finished || !R.started || r.spinT > 0) return;
    r.fireCd = 1 / 3;
    addEnergy(R, r, -2);
    const range = 60 + (r.isPlayer ? R.up.blast * 3 : 0);
    let tgt = null, best = range;
    for (let oi = 0; oi < R.racers.length; oi++) {
      const o = R.racers[oi];
      if (o === r || o.finished) continue;
      const d = o.dist - r.dist;
      if (d > 3 && d < best && Math.abs(o.x - (r.x + Math.sin(r.psi) * d)) < d * 0.18 + 1.6) { best = d; tgt = o; }
    }
    const sp = fmax(r.v + 95, 160) * (r.isPlayer ? 1 + 0.04 * R.up.blast : 1);
    for (let side = -1; side <= 1; side += 2) {
      // pooled pellets keep one shape from birth (owner, target, dist, x, h, v, life)
      const pl = R.pelletPool.pop() || { owner: null, target: null, dist: 0.5, x: 0.5, h: 0.5, v: 0.5, life: 0.5 };
      pl.owner = r; pl.target = tgt; pl.dist = r.dist + 2.2; pl.x = r.x + side * 0.9 + Math.sin(r.psi) * 2; pl.h = r.h + 0.25; pl.v = sp; pl.life = range / sp + 0.08;
      R.pellets.push(pl);
    }
    if (G.Audio) { if (r.isPlayer) G.Audio.sfx('blaster', O_BLAST_P); else if (R.isNear(r)) G.Audio.sfxAt('blaster', r.wp, O_BLAST_B); }
  }
  function updatePellets(R, dt) {
    const T = R.T;
    for (let i = R.pellets.length - 1; i >= 0; i--) {
      const pl = R.pellets[i];
      pl.life -= dt; pl.dist += pl.v * dt;
      if (pl.target && !pl.target.finished) pl.x = pl.target.x + (pl.x - pl.target.x) * Math.exp(-9 * dt);   // (= damp(): written out, see stepRacer)
      let hit = null;
      for (let oi = 0; oi < R.racers.length; oi++) {
        const o = R.racers[oi];
        if (o === pl.owner || o.finished) continue;
        const dd = pl.dist - o.dist;
        if (dd > -1.5 && dd < 2.5 && Math.abs(pl.x - o.x) < 1.9) { hit = o; break; }
      }
      _FA[0] = pl.dist; frameAtR(T, _fr2);
      _FA[1] = pl.x; _FA[2] = pl.h; surfaceR(_fr2, _P, _N);
      if (hit) {
        if (hit.rollT <= 0 && hit.shieldT <= 0) { hit.zapT = 0.4; if (hit.isPlayer) R.impact = fmax(R.impact, 0.15); }
        R.world.fx.sparks(_P, pl.owner.isPlayer ? 0x7af0ff : 0xff6fb5, 5);
      }
      if (hit || pl.life <= 0 || Math.abs(pl.x) > _fr2.hw + 1) { R.pellets.splice(i, 1); R.pelletPool.push(pl); continue; }
      const pc = pl.owner.isPlayer ? 0x9ff6ff : 0xff8fd0;
      _BA[0] = 0.5; _BA[1] = 0.9; R.flames.addV(_P, pc);
      _A.copy(_P).addScaledVector(_fr2.f, -2.8); R.streaks.add(_P, _A, 0.2, pc, 0.95);
    }
  }
  function updateProjectiles(R, dt) {
    const T = R.T;
    for (let i = R.proj.length - 1; i >= 0; i--) {
      const p = R.proj[i];
      p.age += dt; p.life -= dt;
      if (p.target && (p.type === 'homing' || p.type === 'comet')) {
        if (p.target.finished) p.target = null;
        else {
          // (damp / max written out: see stepRacer)
          const k = p.type === 'comet' ? 7 : 5;
          p.x = p.target.x + (p.x - p.target.x) * Math.exp(-k * dt);
          if (p.type === 'comet') { const d = p.target.dist - p.dist, hT = d < 40 ? 1.2 : 8, vT = p.target.v + 60; p.h = hT + (p.h - hT) * Math.exp(-3 * dt); p.v = vT > 150 ? vT : 150; }
        }
      }
      p.dist += p.v * dt;
      let hit = null;
      for (let oi = 0; oi < R.racers.length; oi++) {
        const o = R.racers[oi];
        if (o.finished || (o === p.owner && p.age < 0.6)) continue;
        if (p.type === 'comet' && o !== p.target) continue;
        const dd = p.dist - o.dist;
        if (dd > -1.5 && dd < 3 && Math.abs(p.x - o.x) < (p.type === 'comet' ? 3.5 : 2.3) && Math.abs(p.h - (o.h - TUNE.hover + 1)) < 3) { hit = o; break; }
      }
      if (hit) { hitRacer(R, hit, p.type, p.owner); freeMesh(R, p.mesh); R.proj.splice(i, 1); continue; }
      _FA[0] = p.dist; const fr = frameAtR(T, _fr2);
      if (p.life <= 0 || Math.abs(p.x) > fr.hw + 1) {
        surface(fr, p.x, p.h, _P, _N); R.world.fx.burst(_P, [ITEMS[p.type].color, 0xffffff], 10, 6, 0.3, 0.35, { grav: 0 });
        freeMesh(R, p.mesh); R.proj.splice(i, 1); continue;
      }
      _FA[1] = p.x; _FA[2] = p.h + fr.lift; surfaceR(fr, _P, _N);
      const m = p.mesh;
      _Z.copy(fr.f); _Y.copy(_N); _X.crossVectors(_Y, _Z).normalize();
      _m4.makeBasis(_X, _Y, _Z); m.quaternion.setFromRotationMatrix(_m4);
      m.position.copy(_P);
      if (p.type === 'homing') m.scale.setScalar(1 + Math.sin(p.age * 20) * 0.15);
      if (p.type === 'comet') m.rotation.z += dt * 6;
      R.world.fx.add.add(_P.x, _P.y, _P.z, 0, 0, 0, ITEMS[p.type].color, p.type === 'comet' ? 2.4 : 0.9, 0.3, 0, 0, 0.8);
      _A.copy(_P).addScaledVector(fr.f, p.type === 'comet' ? -7 : -2.6); R.streaks.add(_P, _A, p.type === 'comet' ? 1.2 : 0.38, ITEMS[p.type].color, 0.85);
    }
    for (let i = R.mines.length - 1; i >= 0; i--) {
      const m = R.mines[i];
      m.age += dt; m.life -= dt;
      if (m.life <= 0) { killMine(R, i, true); continue; }
      trackMatrix(T, m.s, m.x, 1.0 + Math.sin(m.age * 3) * 0.2, 1 + Math.sin(m.age * 8) * 0.08, m.age * 2, _m4);
      m.mesh.matrixAutoUpdate = true; m.mesh.position.setFromMatrixPosition(_m4); m.mesh.quaternion.setFromRotationMatrix(_m4);
      m.mesh.scale.setScalar(1 + Math.sin(m.age * 8) * 0.08);
    }
  }

  // ------------------------------------------------------------------ fx / feedback
  function say(R, key, color, params) { if (G.RaceUI) G.RaceUI.flash(G.t(key, params), color); }
  const DRIFT_COL = [0xfff1dc, 0x7af0ff, 0xff6fd8, 0xffd23f];
  const BOOST_COLS = [[0xffd23f, 0xff8a4c, 0xffffff], [0x7af0ff, 0xffffff, 0x9ff6ff], [0xff6fd8, 0xffffff, 0xffb0ec], [0xffd23f, 0xffffff, 0xffe9a8]];
  const O_BOOST = { dir: null, spread: 0.35, grav: 0, drag: 2.2, shape: 'streak', hot: 0.8, sizeVar: 0.4 };
  const O_DSPK = { shape: 'streak', grav: 14, drag: 2.6, hot: 0.7 };
  const O_RING = { normal: null, alpha: 0.95 }, O_WALL = { dir: null, scale: 1.2 };
  const _bd = new V3(), _fxp = new V3(), _fxv = new V3();
  // boost kick: hot streaks blown back from the nozzles, a swell of light, a thin shock ring and (player)
  // a springy FOV punch + nose lift. tier 0 = pad/turbo gold, 1..3 = drift-boost colours (dbTier)
  function boostFx(R, r, tier, drift) {
    const near = r.isPlayer || R.isNear(r);
    if (near) {
      const cols = BOOST_COLS[drift ? clamp(tier, 1, 3) : 0];
      _fxp.copy(r.wp).addScaledVector(r.wf, -2.2).addScaledVector(r.wn, 0.3);
      O_BOOST.dir = _bd.copy(r.wf).negate();
      R.world.fx.burst(_fxp, cols, r.isPlayer ? 14 : 8, 16, 0.12, 0.32, O_BOOST);
      O_BOOST.dir = null;
      R.world.fx.pop(_fxp, cols[0], r.isPlayer ? 2.4 : 1.6, 0.22, 0.8);
      if (r.isPlayer) R.world.fx.shock(_fxp, 3.4, cols[0], 0.3, 0.55);
    }
    if (r.isPlayer) {
      if (G.Audio) G.Audio.sfx('boost', { pitch: 0.9 + tier * 0.08 });
      R.cs.punch.v += 62 + 10 * tier; r.sPitch.v -= 1.4; r.sFlame.v += 9;
    } else if (G.Audio) G.Audio.sfxAt('boost', r.wp, { vol: 0.5 });
  }
  function wallFx(R, r, side, k) {
    _fxp.copy(r.wp).addScaledVector(r.wr, side * 1.3);
    const col = R.theme.rail[side < 0 ? 0 : 1];
    O_WALL.dir = _bd.copy(r.wr).multiplyScalar(-side).addScaledVector(r.wn, 0.6).normalize();
    R.world.fx.sparks(_fxp, col, 16, O_WALL);
    if (r.isPlayer || R.isNear(r)) R.world.fx.flash(_fxp, col, 1.4 + k * 2, 0.1);
    // bounce: roll away from the wall and a little yaw wobble
    r.sRoll.v -= side * (2 + 7 * k); r.sYaw.v += side * 4 * k;
    if (r.isPlayer) { R.impact = fmax(R.impact, 0.25 + k * 0.6); if (G.Audio) G.Audio.sfx('hit', { pitch: 0.7, vol: 0.4 + k }); }
  }
  // drift charge reached a new tier: pop of light at the tail in the tier colour
  function driftTierFx(R, r, tier) {
    _fxp.copy(r.wp).addScaledVector(r.wf, -1.6).addScaledVector(r.wn, 0.2);
    R.world.fx.pop(_fxp, DRIFT_COL[tier], 1.8 + tier * 0.5, 0.2, 0.9);
    R.world.fx.sparkle(_fxp, DRIFT_COL[tier], 3 + tier, 0.4);
    if (tier >= 2) R.world.fx.shock(_fxp, 2.2 + tier * 0.6, DRIFT_COL[tier], 0.25, 0.7);
    r.sHov.v += 1.5;
  }
  // gold ring flown through: a ring of light expanding in the ring's own plane, sparkles and a glow;
  // the ring itself pops (scales up and vanishes, see updateProps)
  function ringFx(R, g, gi) {
    const T = R.T;
    trackMatrix(T, g.s, g.x, g.h, 1, 0, _m4); _fxp.setFromMatrixPosition(_m4);
    frameAt(T, g.s, _fr2);
    O_RING.normal = _fr2.f;
    R.world.fx.ring(_fxp, 6.5, 0xffd23f, 0.38, undefined, O_RING);
    O_RING.normal = null;
    R.world.fx.pop(_fxp, 0xffe27a, 4.2, 0.2, 0.55);
    R.world.fx.sparkle(_fxp, 0xfff1a8, 7, 0.5);
    R.ringPop[gi] = R.t;
  }
  const bitCount = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
  function startRoll(R, r) {
    if (r.rollT > 0 || r.rollCd > 0 || r.energy < TUNE.rollCost || r.stallT > 0) return;
    r.rollT = TUNE.rollT; r.rollCd = TUNE.rollCd + TUNE.rollT; r.rollAng = 0;
    r.rollDir = r.steer < -0.05 ? -1 : r.steer > 0.05 ? 1 : (r.rollDir || 1);    // fixed for the whole roll
    addEnergy(R, r, -TUNE.rollCost);
    r.rolledAir = false;
    if (r.isPlayer) { if (G.Audio) G.Audio.sfx('dash'); R.world.fx.pop(r.wp, 0xffffff, 2.6, 0.18, 0.45); }
  }
  // Camera blend: remember the last rendered pose and glide from it to the live shot over `dur` s.
  // local: the remembered position rides along with the player (finish swing at speed); otherwise it
  // stays put in the world (teleports, skipping the fly-by).
  function camCut(R, dur, local) {
    const cam = G.R.camera, B = R.blend;
    B.pos.copy(cam.position); if (local) B.pos.sub(R.player.wp);
    B.q.copy(cam.quaternion); B.t = 0; B.dur = dur; B.local = !!local;
  }
  const _bq = new THREE.Quaternion(), _bp = new V3();
  function applyBlend(R, dt) {
    const B = R.blend; if (!(B.dur > 0)) return;
    B.t += dt;
    const k = clamp(B.t / B.dur, 0, 1), e = ease(k), cam = G.R.camera;
    _bp.copy(B.pos); if (B.local) _bp.add(R.player.wp);
    cam.position.lerpVectors(_bp, cam.position, e);
    _bq.copy(cam.quaternion); cam.quaternion.copy(B.q).slerp(_bq, e);
    if (k >= 1) B.dur = 0;
  }
  // Things that would otherwise compile a shader or upload a mesh the first time they appear mid-race
  // (projectiles, mines, the shield bubble): built now, shown for the loading-screen warm-up draw, then
  // parked in their pools (see update: R.warm).
  function prewarm(R) {
    R.warm = [];
    for (const type of ['rockets', 'homing', 'mine', 'comet']) { const m = projMesh(R, type); m.position.copy(R.T.center).y -= 3000; m.scale.setScalar(0.001); R.warm.push(m); }
    const sh = new THREE.Mesh(cachedGeo('shieldBubble', () => new THREE.SphereGeometry(2.4, 18, 12)), G.M.glowMat(0x7af0ff, 0.28));
    sh.position.copy(R.T.center).y -= 3000; R.world.add(sh); R.warmShield = sh;
  }

  // ------------------------------------------------------------------ per-frame visuals
  const _bm = new THREE.Matrix4();
  const O_LAND = { normal: null, alpha: 0.7 };
  // Skiff pose. The root sits exactly where the physics put it (plus the visual offset that eases
  // physics snaps); the body carries all the life: lean, pitch, slip yaw and hover are springs driven
  // by steering intent and by the filtered lateral / forward acceleration, so a skiff swings into a turn
  // and settles with a little overshoot, lifts its nose when it surges, dips on landing and wobbles off
  // walls and rocks — at any frame rate.
  function placeRacer(R, r, dt) {
    const T = R.T, rm = G.Save.set.reducedMotion;
    (r.sOff.g = 0, sprStep(r.sOff, 15, 1, dt));
    r.sOff.x = clamp(r.sOff.x, -3, 3);
    _FA[0] = r.s; frameAtR(T, _fr);
    _FA[1] = clamp(r.x + r.sOff.x, -_fr.hw + 0.4, _fr.hw - 0.4); _FA[2] = r.h;   // (x, h: see _FA)
    surfaceR(_fr, r.wp, r.wn);
    acrossR(_fr, _A);                      // road "right" at x
    // heading: the player's is shown as simulated (no added input lag); a bot's steps on bumps and
    // re-plans, so it is shown through a stiff critically damped spring
    if (r.ai) (r.sPsi.g = r.psi, sprStep(r.sPsi, 14, 1, dt));
    const psi = r.ai ? r.sPsi.x : r.psi;
    const c = Math.cos(psi), s = Math.sin(psi);
    const wf = r.wf, ff = _fr.f;
    wf.x = ff.x * c + _A.x * s; wf.y = ff.y * c + _A.y * s; wf.z = ff.z * c + _A.z * s; nrm(wf);
    nrm(r.wr.crossVectors(wf, r.wn));
    _X.copy(r.wr).negate(); // model +X = left
    _bm.makeBasis(_X, r.wn, r.wf); _bm.setPosition(r.wp);
    r.root.matrix.copy(_bm); r.root.matrixWorldNeedsUpdate = true;
    // lateral / forward acceleration, band-limited: the velocity of a critically damped spring chasing the
    // physics velocity (no per-frame finite difference, which spiked on contact impulses by 1/dt and was
    // clamped before filtering, so a bump leaned a skiff 2-3x harder at 20 fps than at 60)
    (r.sVx.g = r.vx, sprStep(r.sVx, 20, 1, dt)); (r.sV.g = r.v, sprStep(r.sV, 14, 1, dt));
    r.axF = clamp(r.sVx.v, -80, 80); r.alF = clamp(r.sV.v, -120, 120);
    const manual = r.isPlayer && !(r.guideT > 0 || r.finished || R.assist === 'auto');
    const sv = r.vx / 25, steer = manual ? r.steer : sv < -1 ? -1 : sv > 1 ? 1 : sv;   // (written out: see stepRacer)
    // lean (+ = bank right): intent + lateral weight + drift carve
    const rollT = clamp(steer * 0.38 + clamp(r.axF * 0.0045, -0.28, 0.28) + (r.drifting ? r.driftDir * 0.3 : 0), -0.85, 0.85);
    (r.sRoll.g = rollT, sprStep(r.sRoll, 12, 0.55, dt));
    // pitch (- = nose up): surge / brake, nose follows the arc in the air
    let pitchT = clamp(-r.alF * 0.0028, -0.14, 0.1) + (r.boosting ? -0.04 : 0) + (r.braking || r.drifting ? 0.035 : 0);
    if (r.air) pitchT = clamp(-Math.atan2(r.vh, fmax(20, r.v)) * 0.9, -0.3, 0.32);
    if (r.landK > 0) {
      r.sPitch.v += r.landK * 2.2; r.sHov.v -= r.landK * 5.5;
      if (r.isPlayer) { R.cs.h.v -= r.landK * 3; if (r.landK > 0.15) { O_LAND.normal = r.wn; R.world.fx.ring(_fxp.copy(r.wp).addScaledVector(r.wn, -TUNE.hover + 0.1), 3.2, r.colors.glow, 0.35, undefined, O_LAND); O_LAND.normal = null; } }
      r.landK = 0;
    }
    (r.sPitch.g = pitchT, sprStep(r.sPitch, 9, 0.5, dt));
    // slip yaw: the nose leads into the steer a touch, swings out wide in a drift
    (r.sYaw.g = r.drifting ? -r.driftDir * 0.42 : -steer * 0.09, sprStep(r.sYaw, 10, 0.65, dt));
    // hover: a bouncy spring (landings, hits) on top of a two-tone idle bob; a fine shiver while the
    // engines rev on the grid
    (r.sHov.g = 0, sprStep(r.sHov, 11, 0.32, dt));
    const bobK = rm ? 0.3 : 1;
    const bob = (Math.sin(R.t * 2.7 + r.bob) * 0.07 + Math.sin(R.t * 6.3 + r.bob * 1.7) * 0.018) * bobK;
    const rev = R.phase === 'count' ? fn1(R.t * 30 + r.i * 31.7) * 0.015 * bobK : 0;
    r.body.position.y = bob + rev + clamp(r.sHov.x, -0.6, 0.8);
    // spin-out: keeps its angular speed when it ends and springs to rest on a whole turn
    if (r.spinT > 0) { r.spinAng += dt * TAU / fmax(0.3, r.spinDur); r.sSpin.x = r.spinAng; r.sSpin.v = TAU / fmax(0.3, r.spinDur); r.sSpin.t = NaN; r.spinTgt = NaN; }
    else {
      if (r.spinTgt !== r.spinTgt) r.spinTgt = Math.round((r.sSpin.x + r.sSpin.v * 0.12) / TAU) * TAU;
      (r.sSpin.g = r.spinTgt, sprStep(r.sSpin, 9, 0.6, dt));
      if (Math.abs(r.sSpin.x - r.spinTgt) < 1e-3 && Math.abs(r.sSpin.v) < 1e-2) { sprSet(r.sSpin, 0); r.spinTgt = 0; }
      r.spinAng = r.sSpin.x;
    }
    // barrel roll: fast start, eased finish, direction fixed when it began
    if (r.rollT > 0) { const k = 1 - r.rollT / TUNE.rollT; r.rollAng = (1 - Math.pow(1 - k, 2.2)) * TAU; } else r.rollAng = 0;
    r.visRoll = r.sRoll.x; r.visPitch = r.sPitch.x; r.visYaw = r.sYaw.x;
    r.body.rotation.set(r.visPitch, r.visYaw + r.spinAng, r.visRoll + r.rollAng * r.rollDir, 'YXZ');
    // beamed in by the tractor: pops back to size
    if (r.beamT > 0) { r.beamT = fmax(0, r.beamT - dt); const k = 1 - r.beamT / 0.45, b = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); r.body.scale.setScalar(fmax(0.05, b)); }
    else if (r.body.scale.x !== 1) r.body.scale.setScalar(1);
    // shield bubble
    if (r.shieldT > 0) {
      if (!r.shieldMesh) { r.shieldMesh = new THREE.Mesh(cachedGeo('shieldBubble', () => new THREE.SphereGeometry(2.4, 18, 12)), G.M.glowMat(0x7af0ff, 0.28)); r.root.add(r.shieldMesh); }
      r.shieldMesh.visible = true; r.shieldMesh.scale.setScalar(1 + Math.sin(R.t * 10) * 0.04);
    } else if (r.shieldMesh) r.shieldMesh.visible = false;
  }
  const _ep = new V3(), _et = new V3(), _ez = new V3();
  const SCRAPE_COL = [0, 0xffffff, 0xffd23f];
  // Engine flames (nozzle glow + flame blade + white-hot core on boost), drift charge glow and sparks,
  // wall-scrape sparks, stall smoke, spin sparkles and the ribbon samples. Flicker is smooth noise (a
  // per-frame random size strobed at the frame rate); every emitter is rate-based (frame-rate independent).
  function racerFx(R, r, dt) {
    r.root.updateMatrixWorld(true);
    const near = r.isPlayer || R.isNear(r), q = G.R.q().particles;
    const sp = clamp(r.v / (TUNE.top * R.clsK), 0, 1.5);
    r.flameK = damp(r.flameK, r.boosting ? 1 : 0, 10, dt);
    (r.sFlame.g = 0, sprStep(r.sFlame, 14, 0.4, dt));                     // boost-kick flare (impulse in boostFx)
    const fk = clamp(r.flameK + r.sFlame.x * 0.15, 0, 1.6);
    const t = R.t, nz = fn1(t * 16 + r.i * 7.3) * 0.3 + fn1(t * 41 + r.i * 3.1 + 517.3) * 0.2;   // (half scale: G.noise.n2 swung about ±0.5)
    const flick = 1 + nz * (0.22 + 0.12 * fk);
    const stall = r.stallT > 0, sput = stall && fn1(t * 23 + r.i * 17.1 + 911.5) < -0.05;
    // on the grid the engines rev with each beep of the countdown
    const rev = R.phase === 'count' ? 0.45 * Math.pow(1 - (R.phaseT % 1), 3) : 0;
    const hot = stall ? 0x8a7fb0 : r.dbT > 0 ? DRIFT_COL[r.dbTier] : fk > 0.3 ? 0xffc04a : r.colors.glow;
    nrm(_ez.setFromMatrixColumn(r.body.matrixWorld, 2));            // body forward: flames point back
    const len = (0.8 + sp * 1.1 + fk * 2.6 + rev * 1.6) * flick * (sput ? 0.25 : 1);
    const wid = (0.26 + sp * 0.07 + fk * 0.14 + rev * 0.12) * (0.94 + nz * 0.1);
    const eng = r.art.engines;
    for (let i = 0; i < eng.length; i++) {
      _ep.copy(eng[i]).applyMatrix4(r.body.matrixWorld);
      _BA[0] = (0.36 + sp * 0.12 + fk * 0.34 + rev * 0.3) * flick; _BA[1] = r.isPlayer ? 0.6 : 0.78; R.flames.addV(_ep, hot);
      if (near) {
        // (the player sees its own exhaust from behind: a shorter, softer blade)
        // (blade ends written out: helper calls on this branch were not inlined and boxed their numbers, see stepRacer)
        const pl = r.isPlayer ? 0.62 : 1, bl = -len * pl;
        _et.x = _ep.x + _ez.x * bl; _et.y = _ep.y + _ez.y * bl; _et.z = _ep.z + _ez.z * bl;
        _BA[0] = wid; _BA[1] = (sput ? 0.25 : 0.7) * (r.isPlayer ? 0.75 : 1); R.streaks.addV(_ep, _et, hot);
        if (fk > 0.15) {
          const bc = bl * 0.45, ca = 0.45 * fk;
          _et.x = _ep.x + _ez.x * bc; _et.y = _ep.y + _ez.y * bc; _et.z = _ep.z + _ez.z * bc;
          _BA[0] = wid * 0.45; _BA[1] = ca < 0.8 ? ca : 0.8; R.streaks.addV(_ep, _et, 0xfff4d8);
        }
      }
      // drift charge: a growing orb of light at each nozzle in the tier colour
      if (r.drifting && near) {
        const tier = r.driftTier, pul = 0.85 + 0.15 * Math.sin(t * (14 + tier * 6));
        _BA[0] = (0.42 + 0.26 * tier + fmin(1, r.driftT / TUNE.drift[0]) * 0.16) * pul; _BA[1] = 0.5 + 0.13 * tier; R.flames.addV(_ep, DRIFT_COL[tier]);
      }
    }
    // drift sparks thrown from the outer rear corner along the road
    if (r.drifting && near && !r.air) {
      const tier = r.driftTier;
      r.sparkAcc += (tier === 0 ? 16 : 22 + 16 * tier) * q * dt * (r.isPlayer ? 1 : 0.5);
      for (let n = 0; r.sparkAcc >= 1 && n < 6; n++) {
        r.sparkAcc -= 1;
        const sd = -r.driftDir * (0.7 + frand() * 0.5);
        _fxp.copy(r.wp).addScaledVector(r.wf, -1.0 - frand() * 0.6).addScaledVector(r.wr, sd).addScaledVector(r.wn, -TUNE.hover * 0.75);
        _fxv.copy(r.wf).multiplyScalar(r.v * frange(0.45, 0.65)).addScaledVector(r.wr, sd * frange(2, 6)).addScaledVector(r.wn, frange(1.5, 5));
        R.world.fx.spawn(_fxp, _fxv, frand() < 0.3 ? 0xffffff : DRIFT_COL[tier], frange(0.1, 0.17) * (1 + 0.15 * tier), frange(0.22, 0.42), O_DSPK);
      }
      if (r.sparkAcc > 2) r.sparkAcc = 2;
    } else r.sparkAcc = 0;
    // wall scrape: a stream of hot sparks and a glow at the contact point while the skiff grinds a rail
    if (r.scrapeT > 0) {
      r.scrapeT -= dt;
      if (near) {
        const side = r.scrapeSide, rc = R.theme.rail[side < 0 ? 0 : 1];
        _fxp.copy(r.wp).addScaledVector(r.wr, side * 1.25).addScaledVector(r.wn, -0.2).addScaledVector(r.wf, -0.3);
        r.scrapeAcc += (r.isPlayer ? 70 : 28) * q * dt * clamp(r.scrapeK, 0.3, 1.3);
        SCRAPE_COL[0] = rc;
        for (let n = 0; r.scrapeAcc >= 1 && n < 6; n++) {
          r.scrapeAcc -= 1;
          _fxv.copy(r.wf).multiplyScalar(r.v * frange(0.35, 0.7)).addScaledVector(r.wr, -side * frange(0.5, 3)).addScaledVector(r.wn, frange(1, 5.5));
          R.world.fx.spawn(_fxp, _fxv, SCRAPE_COL[Math.floor(frand() * 3)], frange(0.09, 0.15), frange(0.2, 0.38), O_DSPK);
        }
        R.world.fx.glow(_fxp, rc, 0.9 + clamp(r.scrapeK, 0, 1) * 0.6 + frand() * 0.3, 0.8);
      }
      r.scrapeK = fmax(0, r.scrapeK - dt * 3);
    } else { r.scrapeAcc = 0; r.scrapeK = 0; }
    if (stall && near) { r.smokeAcc += dt * 9; if (r.smokeAcc >= 1) { r.smokeAcc -= 1; R.world.fx.smoke(r.wp, 1, 0x9a90c8); } }
    if (r.spinT > 0 && near) { r.spinAcc += dt * 30; while (r.spinAcc >= 1) { r.spinAcc -= 1; R.world.fx.spawn(r.wp, _fxv.set(frange(-4, 4), frange(1, 4), frange(-4, 4)), 0xffffff, 0.3, 0.4, O_SPIN); } }
    // ribbons: bots trail one from the tail; the player trails thin contrails from both wingtips (they
    // stream past the sides of the lens; an engine trail ran straight back under the camera)
    if (r.trailReset) { for (let k = 0; k < r.ribbons.length; k++) { r.ribbons[k].n = 0; r.ribbons[k].acc = 0; } r.trailReset = false; }
    const h0 = r.dbT > 0 ? 1 : r.drafting ? 0.45 : 0, h1 = r.flameK > h0 ? r.flameK : h0;
    _RA[0] = h1 < 0 ? 0 : h1 > 1 ? 1 : h1; _RA[1] = t;                    // (heat, time: see ribbonSample)
    if (r.isPlayer) {
      const span = r.art.span || 1.6, wz = r.art.wingZ != null ? r.art.wingZ : -0.8;
      _ep.set(span, 0.04, wz).applyMatrix4(r.body.matrixWorld); ribbonSample(r.ribbons[0], dt, _ep, r.wr);
      _ep.set(-span, 0.04, wz).applyMatrix4(r.body.matrixWorld); ribbonSample(r.ribbons[1], dt, _ep, r.wr);
    } else {
      // (the tail point written out: two addScaledVector calls on a bots-only branch were not inlined, see stepRacer)
      const tz = (r.art.tail || -1.4) - 0.6, ty = 0.1 + r.body.position.y, wp = r.wp, wf = r.wf, wn = r.wn;
      _ep.x = wp.x + wf.x * tz + wn.x * ty; _ep.y = wp.y + wf.y * tz + wn.y * ty; _ep.z = wp.z + wf.z * tz + wn.z * ty;
      ribbonSample(r.ribbons[0], dt, _ep, r.wr);
    }
    // trail cosmetic (Ranger Locker: bubbles / stars): puffs off both wingtips while boosting, carried along at ~3/4 of
    // the skiff's speed so they drift back past the lens instead of vanishing at once; half as many with Reduce motion
    if (r.isPlayer && R.trail) {
      if ((r.boosting || r.dbT > 0) && !r.finished && R.phase === 'race') {
        const TS = R.trail, span = r.art.span || 1.6;
        R.trailAcc += (r.flameK > 0.5 ? 24 : 15) * (G.Save.set.reducedMotion ? 0.5 : 1) * q * dt;
        for (let n = 0; R.trailAcc >= 1 && n < 4; n++) {
          R.trailAcc -= 1;
          const sd = frand() < 0.5 ? -1 : 1;
          _fxp.copy(r.wp).addScaledVector(r.wf, -1.4 - frand() * 0.9).addScaledVector(r.wr, sd * span * (0.7 + frand() * 0.3)).addScaledVector(r.wn, 0.15 + frand() * 0.45);
          _fxv.copy(r.wf).multiplyScalar(r.v * 0.76).addScaledVector(r.wr, sd * frange(0.6, 2.2)).addScaledVector(r.wn, frange(0.3, 1.6));
          const c = TS.colors[(frand() * TS.colors.length) | 0], s = TS.size * frange(1.8, 2.6), life = frange(0.42, 0.6);
          O_TRAIL.shape = TS.shape; O_TRAIL.grav = TS.grav || 0; O_TRAIL.spin = TS.spin || 0; O_TRAIL.alpha = 0.92;
          R.world.fx.spawn(_fxp, _fxv, c, s, life, O_TRAIL);
          if (TS.dot) { O_TRAIL.shape = TS.dotShape; O_TRAIL.spin = 0; O_TRAIL.alpha = TS.dotA; R.world.fx.spawn(_fxp, _fxv, c, s * TS.dot, life, O_TRAIL); }
        }
        if (R.trailAcc > 2) R.trailAcc = 2;
      } else R.trailAcc = 0;
    }
  }
  const O_TRAIL = { shape: 'ring', grav: 0, drag: 1.2, spin: 0, alpha: 0.92, normal: true };
  const O_SPIN = { grav: 4 };
  function updateTrails(R) {
    const tr = R.trails, now = R.t;
    let w = 0;
    for (let i = 0; i < R.racers.length; i++) {
      const r = R.racers[i], sp = clamp(r.v / (TUNE.top * R.clsK), 0, 1.4);
      _rc0.setHex(r.colors.glow); _rc1.setHex(r.dbT > 0 ? DRIFT_COL[r.dbTier] : 0xffc04a);
      // player contrails: show at speed and on any boost, white tinted by the skiff glow / boost colour
      if (r.isPlayer) {
        const vis = fmax(sstep(0.72, 1.05, sp), fmax(r.flameK * 0.85, fmax(r.dbT > 0 ? 0.85 : 0, r.drafting ? 0.6 : 0)));
        _rc0.lerp(_white, 0.65);
        writeRibbon(tr.pl, 0, r.ribbons[0], now, 0.05, 0.006, _rc0, _rc1, 0.5 * vis, 0.28); writeRibbon(tr.pl, 1, r.ribbons[1], now, 0.05, 0.006, _rc0, _rc1, 0.5 * vis, 0.28);
      }
      else if (w < tr.bots.cap) writeRibbon(tr.bots, w++, r.ribbons[0], now, 0.42, 0.08, _rc0, _rc1, 0.55 * clamp(sp, 0.2, 1), TR_AGE);
    }
    const segI = (TR_SEG - 1) * 6;
    tr.bots.g.attributes.position.needsUpdate = true; tr.bots.g.attributes.aCol.needsUpdate = true; tr.bots.g.setDrawRange(0, w * segI);
    tr.pl.g.attributes.position.needsUpdate = true; tr.pl.g.attributes.aCol.needsUpdate = true; tr.pl.g.setDrawRange(0, R.player ? 2 * segI : 0);
  }
  function updateProps(R, dt) {
    const T = R.T;
    // item boxes: bob, spin, respawn growth
    if (R.boxMesh) {
      let n = 0;
      if (!R.pbBox) {
        let nb = 0; for (let ri = 0; ri < T.rows.length; ri++) nb += T.rows[ri].boxes.length;
        R.pbBox = new Float64Array(nb * 12);
        for (let ri = 0, k = 0; ri < T.rows.length; ri++) for (let bi = 0, row = T.rows[ri]; bi < row.boxes.length; bi++, k++) propBase(T, row.s, row.boxes[bi].x, R.pbBox, k * 12);
      }
      const ba = R.boxMesh.instanceMatrix.array, ga = R.boxGlow ? R.boxGlow.instanceMatrix.array : null;
      for (let ri = 0; ri < T.rows.length; ri++) for (let bi = 0, row = T.rows[ri]; bi < row.boxes.length; bi++) {
        const b = row.boxes[bi];
        if (b.t > 0) { b.t -= dt; b.g = 0; } else b.g = fmin(1, b.g + dt * 2.5);
        const e = b.t > 0 ? 0.001 : 1 - Math.pow(1 - b.g, 3) * (1 + 2.2 * b.g);
        const sc = fmax(0.001, e) * (1 + Math.sin(R.t * 4 + b.x) * 0.05);
        _PW[0] = 2.2 + Math.sin(R.t * 2.5 + b.x * 0.7) * 0.3; _PW[1] = sc * 0.95; _PW[2] = R.t * 1.4 + b.x;
        propWrite(ba, ga, n, R.pbBox, n * 12);
        n++;
      }
      R.boxMesh.instanceMatrix.needsUpdate = true; if (R.boxGlow) R.boxGlow.instanceMatrix.needsUpdate = true;
    }
    // gold rings: hide those the player already flew through this lap
    // (a ring just flown through pops: swells for 0.22 s, then vanishes)
    if (R.ringMesh) {
      const p = R.player, lap = Math.floor(p.dist / T.L);
      if (!R.pbRing) { R.pbRing = new Float64Array(T.rings.length * 12); for (let k = 0; k < T.rings.length; k++) propBase(T, T.rings[k].s, T.rings[k].x, R.pbRing, k * 12); }
      const ra = R.ringMesh.instanceMatrix.array;
      for (let k = 0; k < T.rings.length; k++) {
        const g = T.rings[k], got = p.ringLap === lap * 10 + g.chain && (p.ringMask & (1 << g.k));
        const age = R.t - R.ringPop[k];
        const a = age / 0.22;     // (ease(), smootherstep, written out: no double handed to a helper)
        const sc = got ? (age >= 0 && age < 0.22 ? 1 + a * a * a * (a * (a * 6 - 15) + 10) * 0.75 : 0.001) : 1 + Math.sin(R.t * 5 + k) * 0.05;
        _PW[0] = g.h; _PW[1] = sc; _PW[2] = 0;
        propWrite(ra, null, k, R.pbRing, k * 12);
      }
      R.ringMesh.instanceMatrix.needsUpdate = true;
    }
    // spin gauntlet rocks
    if (R.rockMesh && T.rocks.length && (G.time.frame & 1) === 0) {
      if (!R.pbRock) { R.pbRock = new Float64Array(T.rocks.length * 12); for (let k = 0; k < T.rocks.length; k++) propBase(T, T.rocks[k].s, T.rocks[k].x, R.pbRock, k * 12); }
      const ka = R.rockMesh.instanceMatrix.array;
      for (let k = 0; k < T.rocks.length; k++) { const o = T.rocks[k]; _PW[0] = o.h + Math.sin(R.t + k) * 0.25; _PW[1] = o.r; _PW[2] = o.spin * 3 + R.t * o.spin * 0.8; propWrite(ka, null, k, R.pbRock, k * 12); }
      R.rockMesh.instanceMatrix.needsUpdate = true;
    }
    for (let k = 0; k < R.stations.length; k++) { const st = R.stations[k]; if (st.userData.tick) st.userData.tick(R.t, dt); else st.rotation.y += dt * 0.1; }
    for (let k = 0; k < R.planets.length; k++) { const pl = R.planets[k]; pl.rotation.y += dt * 0.004; if (pl.userData.tick) pl.userData.tick(R.t, dt); }
    R.decalMat.uniforms.uTime.value = R.t;
    if (R.dustMat) R.dustMat.uniforms.uTime.value = R.t % 1000;
    // the far nebula drifts very slowly round the course: the sky is alive even on a still frame
    if (R.neb) R.neb.rotation.y += dt * 0.0015;
    if (R.roadMat && R.roadMat.userData.uTime) R.roadMat.userData.uTime.value = R.t % 1000;
  }
  function updateGhost(R, dt) {
    const g = R.ghost; if (!g) return;
    if (!g.on || R.phase !== 'race') { g.mesh.visible = false; return; }
    g.t += dt;
    const f = g.t * 10, i = Math.floor(f);
    if (i >= g.n - 1) { g.mesh.visible = false; return; }
    const t = f - i, d = g.data;
    let s0 = d[i * 3], s1 = d[i * 3 + 3]; if (s1 < s0 - R.T.L / 2) s1 += R.T.L;
    const s = lerp(s0, s1, t), x = lerp(d[i * 3 + 1], d[i * 3 + 4], t), h = lerp(d[i * 3 + 2], d[i * 3 + 5], t);
    trackMatrix(R.T, s, x, h - frameAt(R.T, s, _fr2).lift, 1, 0, _m4);
    g.mesh.matrixAutoUpdate = false; g.mesh.matrix.copy(_m4); g.mesh.matrixWorldNeedsUpdate = true;
    g.mesh.visible = true;
    g.pos = g.pos || new V3(); g.pos.setFromMatrixPosition(_m4);
  }

  // ------------------------------------------------------------------ camera
  const _cp = new V3(), _ct = new V3(), _cu = new V3();
  // Every quantity that defines the chase shot is a critically damped spring (C1-continuous: no velocity
  // kink when a target jumps on a wall bounce, boost on/off or a landing): distance back, lateral, height,
  // heading follow, look-at lateral / height, corner look-ahead, roll, FOV (+ an underdamped FOV punch).
  const camRig = () => ({ back: spr(9.2), x: spr(0), h: spr(3.3), psi: spr(0), tx: spr(0), th: spr(1.3), look: spr(0), roll: spr(0), fov: spr(60), punch: spr(0) });
  function introCamera(R, k) {
    const T = R.T, p = R.player, C = R.cs;
    // sweep from high above the grid, looking back down the field, into the chase position
    const e = k * k * (3 - 2 * k);
    const sCam = lerp(p.s + 60, p.s - 9.2, e), hCam = lerp(28, 3.3, e), xCam = lerp(22, p.x * 0.82, e);
    frameAt(T, sCam, _fr2); surface(_fr2, xCam, hCam, _cp, _N);
    frameAt(T, lerp(p.s - 10, p.s + 18, e), _fr2); surface(_fr2, p.x * e, 1.3 + TUNE.hover, _ct, _N);
    const cam = G.R.camera;
    cam.position.copy(_cp); cam.up.copy(_fr2.u); cam.lookAt(_ct);
    R.camPos.copy(_cp); R.camUp.copy(_fr2.u);
    // hand over to the chase rig at rest in its framing
    sprSet(C.back, 9.2); sprSet(C.x, p.x * 0.82); sprSet(C.h, 3.3 - wideK() * 0.3); sprSet(C.psi, 0); sprSet(C.tx, p.x); sprSet(C.th, p.h + 1.3 - wideK() * 3.2); sprSet(C.look, 0); sprSet(C.roll, 0);
    sprSet(C.fov, baseFov()); sprSet(C.punch, 0);
    setFov(R, baseFov(), 1);
  }
  // very wide / short screens (phones in landscape): aim lower so the skiff sits higher, clear of the speedo
  const wideK = () => clamp(((G.R.camera.aspect || 1.6) - 1.78) / 0.4, 0, 1);
  // Base is a horizontal FOV (~88° at the default 100° setting, nudged by the horizontal FOV setting G.Save.set.fovH,
  // 85–110°) converted to the camera's vertical FOV, so wide phones are not fisheyed. Kicks are in vertical degrees.
  function baseFov() {
    const s = G.Save && G.Save.data ? G.Save.set : null, fh = s && typeof s.fovH === 'number' ? s.fovH : 100;
    const h = clamp(88 + (fh - 100) * 0.8, 74, 104) * Math.PI / 180;
    const asp = fmax(1, G.R.camera.aspect || 1.6);
    return clamp(2 * Math.atan(Math.tan(h / 2) / asp) * 180 / Math.PI, 46, 70);
  }
  function setFov(R, fov, k) { R.fov = lerp(R.fov, fov, k); const cam = G.R.camera; if (Math.abs(cam.fov - R.fov) > 0.02) { cam.fov = R.fov; cam.updateProjectionMatrix(); } }
  const SL_COL = new THREE.Color();
  function chaseCamera(R, dt) {
    const T = R.T, p = R.player, cam = G.R.camera, C = R.cs;
    const rm = !!G.Save.set.reducedMotion, racing = R.phase === 'race', wide = wideK();
    const sp = clamp(p.v / (TUNE.top * R.clsK), 0, 1.6);
    // corner anticipation: curvature a little ahead (+ = left turn). The camera slides to the outside of
    // the corner and looks into it, so the bend opens up on screen before the skiff gets there.
    _FA[0] = p.s + 16 + p.v * 0.3; frameAtR(T, _fr2);                       // (s / x / h through _FA: see frameAt)
    const turn = racing ? clamp(_fr2.k * 120, -1, 1) : 0;
    // boost: the camera falls back (the skiff surges away from the lens), drifting pulls it in a touch
    (C.back.g = 9.2 + sp * 1.0 + (p.boosting ? 1.3 : 0) - (p.drifting ? 0.4 : 0), sprStep(C.back, 3.2, 1, dt));
    (C.x.g = p.x * 0.82 + turn * 0.2, sprStep(C.x, 6.5, 1, dt));
    (C.h.g = p.h - TUNE.hover + 3.3 + sp * 0.25 - wide * 0.3, sprStep(C.h, p.air ? 4 : 7, 1, dt));
    (C.psi.g = C.psi.x + wrapA(p.psi - C.psi.x), sprStep(C.psi, 5, 1, dt));
    (C.look.g = -turn * 0.7, sprStep(C.look, 2.6, 1, dt));
    const back = C.back.x, ahead = 18;
    (C.tx.g = p.x + p.sOff.x + Math.sin(C.psi.x) * ahead * 0.7 + C.look.x, sprStep(C.tx, 9, 1, dt));
    (C.th.g = p.h + 1.3 - wide * 3.2, sprStep(C.th, 8, 1, dt));
    if (R.phase === 'finish') {
      // finish: swing round from behind to the front-right of the skiff at a safe radius (never through it)
      const k = clamp((R.t - R.finishT) / 3.2, 0, 1), e = ease(k);
      const a = e * 2.35, rad = lerp(back, 8.2, e), hh = lerp(C.h.x, 2.1, e);
      _cp.copy(p.wp).addScaledVector(p.wf, -Math.cos(a) * rad).addScaledVector(p.wr, Math.sin(a) * rad).addScaledVector(p.wn, hh);
      _ct.copy(p.wp).addScaledVector(p.wn, 0.8);
      _cu.copy(p.wn);
    } else {
      _FA[0] = p.s - back; frameAtR(T, _fr2);
      const camXr = C.x.x - Math.sin(C.psi.x) * back * 0.6;
      _FA[1] = clamp(camXr, -_fr2.hw - 2, _fr2.hw + 2); _FA[2] = C.h.x; surfaceR(_fr2, _cp, _cu);
      // look ahead along the skiff's heading
      _FA[0] = p.s + ahead * Math.cos(C.psi.x); frameAtR(T, _fr2);
      _FA[1] = C.tx.x; _FA[2] = C.th.x; surfaceR(_fr2, _ct, _N);
    }
    if (R.camSnap) { R.camUp.copy(_cu); R.camSnap = false; }       // hard cut (long tractor hop)
    else R.camUp.lerp(_cu, 1 - Math.exp(-6 * dt)).normalize();
    cam.position.copy(_cp);
    cam.up.copy(R.camUp);
    cam.lookAt(_ct);
    // roll: lean a little with the skiff and into the corner
    (C.roll.g = (-p.visRoll * 0.08 + turn * 0.025) * (rm ? 0.3 : 1), sprStep(C.roll, 6, 1, dt));
    // shake: low-frequency impact trauma (hits, walls, fx trauma) + a fine, subtle speed rumble
    R.impact = fmax(0, R.impact - dt * 2.2);
    const tr = (R.world.fx.trauma || 0);
    // strength from the Screen-shake comfort slider (G.Motion.shake(): 0..1; Reduce motion sets it to 0.1)
    const shK = G.Motion && G.Motion.shake ? G.Motion.shake() : (rm ? 0.2 : 1);
    const rumble = (0.0012 + 0.0035 * sp * sp + (p.boosting ? 0.0025 : 0)) * shK * (racing ? 1 : 0.3);
    const hit = (R.impact * R.impact * 0.055 + tr * tr * 0.04) * shK;
    const t1 = R.t * 8.5, t2 = R.t * 26;
    cam.rotateZ(C.roll.x + G.noise.n2(t1, 1.3) * hit * 1.5 + G.noise.n2(t2, 5.1) * rumble * 1.4);
    cam.rotateX(G.noise.n2(t1, 7.1) * hit + G.noise.n2(t2, 9.7) * rumble);
    cam.rotateY(G.noise.n2(t1, 3.7) * hit * 0.8 + G.noise.n2(t2, 2.9) * rumble * 0.6);
    // FOV: base + speed + boost + slipstream (spring), plus the springy punch of boost kicks
    const rmK = rm ? 0.35 : 1;
    (C.fov.g = baseFov() + (4.5 * sstep(0.45, 1.05, sp) + (p.boosting ? 6 : 0) + (p.drafting ? 1.5 : 0)) * rmK, sprStep(C.fov, 5, 1, dt));
    (C.punch.g = 0, sprStep(C.punch, 10, 0.45, dt));
    setFov(R, C.fov.x + clamp(C.punch.x, -3, 8) * rmK, 1);
    applyBlend(R, dt);
    // speed lines
    const L = R.lines, bst = p.boosting ? 1 : 0;
    L.mesh.position.copy(cam.position); L.mesh.quaternion.copy(cam.quaternion);
    L.mat.uniforms.uT.value = (L.mat.uniforms.uT.value + dt * p.v * 0.9) % 70;
    // comfort setting G.Save.set.speedLines: 'on' (default) | 'reduced' (50 %) | 'off' (none, the mesh is not drawn),
    // read through G.Motion (02_save) so the Settings row and the Reduce-motion master switch agree
    const slK = G.Motion && G.Motion.speedLines ? G.Motion.speedLines() : (rm ? 0.5 : 1);
    const op = sstep(0.55, 1.05, sp) * (0.6 + 0.9 * bst + (p.drafting ? 0.4 : 0)) * (racing ? 1 : 0.3) * slK;
    const U2 = L.mat.uniforms;
    U2.uOp.value = damp(U2.uOp.value, op * 0.45, 6, dt);
    L.mesh.visible = slK > 0 || U2.uOp.value > 0.002;
    U2.uLen.value = damp(U2.uLen.value, 0.7 + sp * 0.8 + bst * 0.9, 6, dt);
    U2.uW.value = damp(U2.uW.value, 0.018 + bst * 0.014, 6, dt);
    SL_COL.setHex(p.dbT > 0 ? DRIFT_COL[p.dbTier] : bst ? 0xffe08a : p.drafting ? 0xffffff : 0xd8f6ff);
    L.col.lerp(SL_COL, 1 - Math.exp(-8 * dt)); U2.uCol.value.copy(L.col);
  }

  // ------------------------------------------------------------------ main update
  function update(dt) {
    const R = race; if (!R) return;
    R.t += dt; R.phaseT += dt;
    // finish slow motion on real time: ease down to 0.3x in 0.12 s, hold, ease back up over 0.75 s (a hard
    // 1 -> 0.3 -> 1 switch of the time scale reads as a hitch). Requested one frame at a time, so nothing
    // lingers if the race is left mid-way; the loop's next step applies it.
    if (R.slowT >= 0) {
      const k = (R.slowT += G.time.realDt);
      if (k >= 1.25 || !G.time.slowMo) R.slowT = -1;
      else G.time.slowMo(1e-3, k < 0.12 ? 1 - 0.7 * ease(k / 0.12) : k < 0.5 ? 0.3 : 0.3 + 0.7 * ease((k - 0.5) / 0.75));
    }
    // the prewarmed meshes have been drawn by the loading warm-up: park them in their pools
    if (R.warm) {
      for (let k = 0; k < R.warm.length; k++) { const m = R.warm[k]; m.scale.setScalar(1); freeMesh(R, m); }
      R.warm = null;
      if (R.warmShield) { R.world.remove(R.warmShield); R.warmShield = null; }
    }
    const p = R.player;
    if (R.phase === 'intro') {
      const I = inp();
      const skip = I.boost || I.itemP || Math.abs(I.steer) > 0.3 || I.brake || I.fire;
      if (R.phaseT >= 2.4 || (skip && R.phaseT > 0.3)) {
        // skipped fly-by: glide down into the chase shot instead of cutting
        camCut(R, R.phaseT < 2.4 ? 0.7 : 0.4, false);
        R.phase = 'count'; R.phaseT = 0; R.countN = 4; if (G.RaceUI) G.RaceUI.hint();
        // skipped fly-by: drop the course-name banner, else it sits right on top of the "3"
        const bn = document.getElementById('banner');
        if (bn && !bn.hidden && bn.textContent.indexOf(G.t('race.track.' + R.def.id)) === 0) bn.hidden = true;
        // A BOOST still held from skipping the fly-by is not a start press: only a fresh press counts
        // (else tapping BOOST to skip — what most kids do — always gave the "Too early!" sputter).
        R._prevBoost = !!(I.boost || (I.device === 'desktop' && I.move && I.move.y > 0.5));
      }
    }
    if (R.phase === 'count') {
      const n = 3 - Math.floor(R.phaseT);
      if (n !== R.countN && n >= 1) { R.countN = n; if (G.RaceUI) G.RaceUI.countdown(String(n)); if (G.Audio) G.Audio.sfx('countdown', { pitch: 0.75 }); }
      // start boost window: first boost press relative to GO
      const I = inp();
      const press = !!(I.boost || (I.device === 'desktop' && I.move && I.move.y > 0.5));
      if (press && !R._prevBoost && R.startPress == null) R.startPress = R.phaseT - 3;
      R._prevBoost = press;
      if (R.phaseT >= 3) {
        R.phase = 'race'; R.phaseT = 0; R.started = true; R.rt = 0;
        if (G.RaceUI) G.RaceUI.countdown(G.t('race.go'), true);
        if (G.Audio) G.Audio.sfx('go', { pitch: 0.75 });
        R.cs.punch.v += 45;
        if (R.tt) { p.item = 'turbo'; if (R.ghost) { R.ghost.t = 0; R.ghost.on = true; } }
        for (const r of R.racers) if (r.ai) { const roll = frand(); if (roll < 0.25) { r.startT = 1.2; r.startK = 0.4; } else if (roll < 0.6) { r.startT = 0.6; r.startK = 0.4; } }
      }
    }
    if (R.phase === 'race' || R.phase === 'finish') {
      R.rt += dt;
      // start boost evaluation for the player (press within the window after GO counts too)
      if (R.startPress == null && R.rt < TUNE.startGood) { const I = inp(); const press = I.boost || (I.device === 'desktop' && I.move.y > 0.5); if (press && !R._prevBoost) R.startPress = R.rt; R._prevBoost = press; }
      if (R.startPress != null && !R._startDone && (R.rt >= TUNE.startGood || R.startPress < -TUNE.startGood)) {
        R._startDone = true;
        const d = Math.abs(R.startPress);
        if (R.startPress < -TUNE.startGood) { p.startT = 0.5; p.startK = -1; say(R, 'race.sputter', '#ff8a4c'); R.world.fx.smoke(p.wp, 6, 0x9a90c8); if (G.Audio) G.Audio.sfx('empty'); }
        else if (d <= TUNE.startPerfect) { p.startT = 1.2; p.startK = 0.4; say(R, 'race.perfect', '#ffd23f'); boostFx(R, p, 2); }
        else if (d <= TUNE.startGood) { p.startT = 0.6; p.startK = 0.4; say(R, 'race.goodStart', '#7af0ff'); boostFx(R, p, 1); }
      }
      if (R.startPress == null && R.rt >= TUNE.startGood) R._startDone = true;
      R.cometCd = fmax(0, R.cometCd - dt);
    }
    // physics substeps (fixed ≤ 1/60)
    const n = fmax(1, Math.ceil(dt / (1 / 60) - 0.01)), h = dt / n;
    R._dt = h;
    const timing = R.phase === 'race' || R.phase === 'finish';
    for (let k = 0; k < n; k++) {
      R.stepT = timing ? R.rt - dt + (k + 1) * h : R.rt;     // race clock at the end of this sub-step (crossT)
      for (let i = 0; i < R.racers.length; i++) stepRacer(R, R.racers[i], h);
      racerContacts(R);
      if (R.finishPending) judgeFinish(R);
    }
    R.stepT = R.rt;
    R.streaks.reset();
    updateProjectiles(R, dt);
    // positions
    sortOrder(R.order);
    for (let i = 0; i < R.order.length; i++) R.order[i].place = i + 1;
    if (R.started && !p.finished && R._lastPlace && p.place < R._lastPlace && G.Audio) G.Audio.sfx('coin', { pitch: 1.5 + (8 - p.place) * 0.05, vol: 0.35 });
    R._lastPlace = p.place;
    // ghost recording (10 Hz, player lap)
    if (R.tt && R.phase === 'race' && !p.finished) {
      R.ghostT -= dt;
      if (R.ghostT <= 0) { R.ghostT += 0.1; R.ghostRec.push(p.s, p.x, p.h); }
    }
    // visuals
    R.flames.reset();
    for (let i = 0; i < R.racers.length; i++) { const r = R.racers[i]; placeRacer(R, r, dt); racerFx(R, r, dt); }
    updatePellets(R, dt);
    R.flames.commit(); R.streaks.commit();
    updateTrails(R);
    updateProps(R, dt);
    updateGhost(R, dt);
    R.railMat.uniforms.uTime.value = R.t;
    // engine audio (created after G.Game.world points at our world, else the loop auto-stops)
    if (!R.engine && !R.engineOff && G.Audio && G.Game.world === R.world) R.engine = G.Audio.loop('engine', { vol: 0.6, pitch: 0.8 });
    if (R.engine && (G.time.frame % 3 === 0)) {
      const sp = clamp(p.v / (TUNE.top * R.clsK), 0, 1.6);
      R.engO.pitch = 0.8 + sp * 1.25 + (p.boosting ? 0.25 : 0); R.engO.vol = 0.45 + sp * 0.35;
      R.engine.set(R.engO);
    }
    // finish → results
    if (R.phase === 'finish' && !R.resultShown && R.t - R.finishT > 3.2) { R.resultShown = true; G.safe('race results', () => showResults(R)); }
    if (G.RaceUI) G.RaceUI.frame(R, dt);
  }
  const byProgress = (a, b) => (b.finished ? 1e7 - b.finishT : b.dist) - (a.finished ? 1e7 - a.finishT : a.dist);
  // places change a few times a lap: a stable in-place insertion sort (same order as Array.sort(byProgress)) is
  // a handful of compares on a sorted list and never allocates the work array the built-in sort does every frame
  function sortOrder(o) {
    for (let i = 1; i < o.length; i++) {
      const r = o[i]; let j = i - 1;
      while (j >= 0 && byProgress(o[j], r) > 0) { o[j + 1] = o[j]; j--; }
      o[j + 1] = r;
    }
  }
  function racerContacts(R) {
    const rs = R.racers;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      const d = b.dist - a.dist;
      if (Math.abs(d) > 3.2 || Math.abs(a.x - b.x) > 2.3 || Math.abs(a.h - b.h) > 2) continue;
      const side = a.x >= b.x ? 1 : -1, push = (2.3 - Math.abs(a.x - b.x)) * 0.5 + 0.05;
      a.x += side * push; b.x -= side * push;
      a.vx += side * 4; b.vx -= side * 4;
      // visual: ease the separation instead of popping sideways; both skiffs rock a little
      a.sOff.x -= side * push; b.sOff.x += side * push;
      if (Math.abs(a.sRoll.v) < 4) a.sRoll.v += side * 2.2;
      if (Math.abs(b.sRoll.v) < 4) b.sRoll.v -= side * 2.2;
      const back = d > 0 ? a : b, front = d > 0 ? b : a;
      back.v *= 0.985; front.v = fmin(front.v * 1.01, TUNE.cap * R.clsK);
      if ((a.isPlayer || b.isPlayer) && (R.t - (R._bumpT || 0)) > 0.35) {
        R._bumpT = R.t; R.impact = fmax(R.impact, 0.3);
        _A.copy(a.wp).add(b.wp).multiplyScalar(0.5); R.world.fx.sparks(_A, 0xffffff, 8);
        if (G.Audio) G.Audio.sfx('bounce', { vol: 0.6 });
      }
    }
  }
  function lateUpdate(dt) {
    const R = race; if (!R) return;
    if (R.phase === 'intro') introCamera(R, clamp(R.phaseT / 2.4, 0, 1));
    else chaseCamera(R, dt);
  }

  // ------------------------------------------------------------------ results
  function computeRewards(res) {
    const P = G.Progress;
    if (P && P.modeRewards) { try { const r = P.modeRewards('race', res); if (r) return r; } catch (e) { console.warn('[race] modeRewards', e && e.message); } }
    const out = { clinks: 0, xp: 0, parts: {}, lumite: 0 };
    out.clinks = res.timeTrial ? 60 + 40 * (res.medalTier || 0) : PLACE_CLINKS[clamp(res.place, 1, 8) - 1];
    out.clinks += 50 * (res.ringChains || 0);
    out.xp = 150 + MEDAL_XP[res.medalTier || 0];
    // first time per medal
    for (let m = (res.prevMedal || 0) + 1; m <= (res.medalTier || 0); m++) {
      if (m === 1) out.parts.fuel = (out.parts.fuel || 0) + 1;
      if (m === 2) { out.parts.fuel = (out.parts.fuel || 0) + 2; out.parts.chip = (out.parts.chip || 0) + 1; }
      if (m === 3) { out.parts.fuel = (out.parts.fuel || 0) + 3; out.parts.servo = (out.parts.servo || 0) + 1; }
      if (m === 4) out.lumite += 1;
    }
    const D = G.Data && G.Data.DIFFICULTY, diff = G.Save.set.difficulty;
    const mult = D && D[diff] && (D[diff].reward || D[diff].rewards);
    if (typeof mult === 'number') { out.clinks = Math.round(out.clinks * mult); out.xp = Math.round(out.xp * mult); }
    return out;
  }
  function showResults(R) {
    const T = R.T, p = R.player, def = R.def;
    // project finish times for racers still on track
    for (const r of R.racers) if (!r.finished) {
      const left = R.laps * T.L - r.dist, v = fmax(30, r.v * 0.95);
      r.finishT = R.rt + left / v; r.finished = true; r.projected = true;
      if (!r.bestLap) r.bestLap = r.lapTimes.length ? Math.min.apply(null, r.lapTimes) : r.finishT / R.laps;
    }
    R.order.sort((a, b) => a.finishT - b.finishT);
    R.order.forEach((r, i) => { r.place = i + 1; });
    const place = p.place, time = p.finishT;
    const prev = record(def.id, R.cls) || {};
    const medal = medalFor(def.id, R.cls, time);
    const prevMedal = prev.m || 0;
    const newRecord = !prev.b || time < prev.b;
    // save record (+ ghost for time trial)
    const rs = raceSave();
    if (rs && !def.daily) {
      const key = def.id + ':' + R.cls;
      const rec = Object.assign({}, prev);
      if (newRecord) rec.b = Math.round(time * 100) / 100;
      if (!rec.l || p.bestLap < rec.l) rec.l = Math.round(p.bestLap * 100) / 100;
      rec.m = fmax(prevMedal, medal);
      if (R.tt && R.bestLapRec && (!prev.gl || R.bestLapRec.t < prev.gl)) {
        rec.g = encodeGhost(R.bestLapRec.data, T.L); rec.gs = p.style; rec.gl = Math.round(R.bestLapRec.t * 100) / 100;
        rec.sp = R.bestLapRec.sp.map(v => Math.round(v * 100));
      }
      rs.rec[key] = rec;
      G.Save.save();
    }
    const MEDALS = ['none', 'bronze', 'silver', 'gold', 'platinum'];
    const res = {
      // A solo Time Trial has no place: sending place 1 paid it (and recorded it) as a Grand Prix win.
      mode: 'race', win: R.tt ? medal > 0 : place <= 3, place: R.tt ? null : place, podium: !R.tt && place <= 3,
      medal: medal > 0 ? MEDALS[medal] : null, medalTier: medal, prevMedal, newRecord, rings: R.ringChainsTotal,
      stars: R.tt ? fmin(3, medal) : place === 1 ? 3 : place <= 3 ? 2 : place <= 6 ? 1 : 0,
      time, bestLap: p.bestLap, track: def.id, cls: R.cls, timeTrial: R.tt, ringChains: R.ringChainsTotal, hits: p.hits,
    };
    // (the course is named in the subtitle under the title: a "Course" row with a long name squeezed its own label
    // to "…" on a 568×320 phone and pushed the times down out of view)
    res.subtitle = G.t('race.track.' + def.id);
    res.stats = [
      R.tt ? null : { key: 'race.stat.place', value: G.t('race.place.' + place) + ' / ' + R.racers.length },
      { key: 'race.stat.time', value: fmt(time) },
      // personal best on this course + class: the new one with how much it beat the old one, else the standing PB
      def.daily ? null : { key: 'race.stat.pb', value: newRecord ? fmt(time) + (prev.b ? ' (−' + (prev.b - time).toFixed(2) + ')' : '') : fmt(prev.b) },
      { key: 'race.stat.bestLap', value: fmt(p.bestLap) },
      { key: 'race.stat.medal', value: G.t('race.medal.' + medal) },
      { key: 'race.stat.rings', value: String(R.ringChainsTotal) },
    ].filter(Boolean);
    if (!R.tt) R.order.slice(0, 3).forEach(r => res.stats.push({ key: 'race.stat.podium', label: G.t('race.place.' + r.place) + ' · ' + r.name, value: fmt(r.finishT) }));
    res.title = R.tt ? (medal ? G.t('race.res.medal', { m: G.t('race.medal.' + medal) }) : G.t('race.res.great'))
      : place === 1 ? G.t('race.res.win') : place <= 3 ? G.t('race.res.place', { n: place }) : G.t('race.res.great');
    if (!res.win) res.tip = 'race.tip.' + Math.floor(frand() * 6);
    // "New best!" gold chip in the results' awards row (the shared results screen lists res.medals)
    if (newRecord && !def.daily) res.medals = ['race.newBest'];
    res.table = R.order.map(r => ({ place: r.place, name: r.name, you: r.isPlayer, time: r.finishT, bestLap: r.bestLap, gap: r.finishT - R.order[0].finishT, colors: r.colors, style: r.style }));
    res.rewards = computeRewards(res);
    let granted = null;
    if (G.Progress && G.Progress.grantRewards) granted = G.safe('grantRewards', () => G.Progress.grantRewards(res.rewards));
    else if (G.Save && G.Save.prof && typeof G.Save.prof.clinks === 'number') { G.Save.prof.clinks += res.rewards.clinks || 0; G.Save.save(); }
    res.granted = granted || null;
    G.bus.emit('mode-result', res);
    R.result = res;
    const params = R.params;
    const nextId = (() => { const list = TRACKS.map(t => t.id); const i = list.indexOf(def.id); for (let k = 1; k <= list.length; k++) { const id = list[(i + k) % list.length]; if (isTrackUnlocked(id)) return id; } return def.id; })();
    const open = Object.assign({}, res, {
      onRetry: () => G.Game.go('race', params),
      onNext: () => G.Game.go('race', Object.assign({}, params, { track: nextId })),
      onHangar: () => { G.Game.go(G.Game.modes.hub ? 'hub' : 'title'); setTimeout(() => { if (G.UI.defs['race-select']) G.UI.open('race-select'); }, 900); },
    });
    if (R.engine) { R.engine.stop(0.6); R.engine = null; R.engineOff = true; }
    if (G.HUD && G.HUD.hide) G.HUD.hide();
    if (G.RaceUI) G.RaceUI.results(open);
  }

  function exit() {
    const R = race;
    window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerdown', onPtrDown, true); window.removeEventListener('pointermove', onPtrMove, true); window.removeEventListener('pointerup', onPtrUp, true);
    heldKeys.clear(); swipe = null;
    if (R) {
      if (R.engine) R.engine.stop(0.2);
      const cam = G.R.camera;
      cam.near = R.oldCam.near; cam.far = R.oldCam.far; cam.fov = R.oldCam.fov; cam.up.set(0, 1, 0); cam.updateProjectionMatrix();
    }
    if (G.RaceUI) G.safe('race ui destroy', () => G.RaceUI.destroy());
    G.HUD.minimapDraw = null;
    // Ship art is cached per style+palette and AI palettes reshuffle every race: free them on exit
    // so repeated races don't accumulate GPU geometries.
    for (const [k, c] of Array.from(geoCache.entries())) {
      if (!k.startsWith('ship|') || !c) continue;
      if (c.solid && c.solid.dispose) c.solid.dispose();
      if (c.glow && c.glow.dispose) c.glow.dispose();
      geoCache.delete(k);
    }
    race = null; G.Race.state = null;
  }

  G.Game.register('race', {
    layout: 'race', pausable: true,
    get music() { return race ? race.music : 'race'; },     // read by G.Game.go right after enter()
    enter, exit, update, lateUpdate,
    restart() { G.Game.go('race', G.Game.params); },
  });

  // debug/test helpers
  function debugFinish(place) {
    const R = race; if (!R || !R.started) return false;
    const p = R.player;
    if (place && !R.tt) {
      // shuffle the field so the player ends roughly at `place`
      const others = R.racers.filter(r => r !== p).sort((a, b) => b.dist - a.dist);
      others.forEach((r, i) => { r.dist = R.laps * R.T.L - (i < place - 1 ? 10 : 160 + i * 20); r.s = mod(r.dist, R.T.L); r.lapsDone = R.laps - 1; r.cpDone = Math.floor(r.dist / (R.T.L / 6)); });
    }
    p.dist = R.laps * R.T.L - 25; p.s = mod(p.dist, R.T.L); p.lapsDone = R.laps - 1; p.cpDone = Math.floor(p.dist / (R.T.L / 6));
    // move the clock to a plausible race time (around silver pace) so results/records stay believable
    const mt = medalTimes(R.def.id, R.cls), want = fmax(R.rt, (mt.gold + mt.silver * 2) / 3 - 2);
    R.rt = want;
    R.racers.forEach((r, i) => {
      if (r.finished) return;
      const lap = want / R.laps * (r.isPlayer ? 1 : 0.985 + i * 0.006);
      r.lapTimes.length = 0; for (let k = 0; k < R.laps - 1; k++) r.lapTimes.push(lap * (1.02 - k * 0.02));
      r.lapStartT = want - lap * 0.98; r.bestLap = Math.min.apply(null, r.lapTimes);
    });
    return true;
  }

  G.Race = {
    TRACKS, SHIPS, ITEMS, CLASSES, THEMES, TUNE, PAINTS, DIFF, DG, playerColors,
    trackDef, track: getTrack, isTrackUnlocked, isShipUnlocked, isClassUnlocked, record, medalTimes, medalFor, fmt,
    medalName: m => G.t('race.medal.' + (m || 0)),
    preview(id) { const T = getTrack(id); return { pts: T.preview, bounds: T.bounds, L: T.L }; },
    allTracks() { return TRACKS.concat([trackDef('daily')]); },
    state: null, debugFinish,
    _encodeGhost: encodeGhost, _decodeGhost: decodeGhost,
  };
  if (G.Data) G.Data.RACE_TRACKS = TRACKS.map(t => ({ id: t.id, star: t.star, theme: t.theme }));
})(window.G);

}).call(window); } catch (e) { console.error('[module 23_race.js]', e); }
// ---- 23b_race_ui.js
try { (function () {
// 23b_race_ui.js — Star Skiff Rally UI: race HUD widgets (position, lap/timer/split, speedometer +
// energy arc, item slot with roulette, countdown, callouts, warnings, boost vignette), the track
// minimap, the Hangar race-select screen ('race-select') and a fallback results screen
// ('race-results', used only when the shared 'results' screen is not defined).
// G.RaceUI: build(race) frame(race, dt) countdown(text, go) flash(text, color) hint() split(delta, lap)
//           itemUsed(id) results(params) drawMap(ctx, race) destroy() itemIcon(id) shipIcon(style, colors)
(function (G) {
  'use strict';
  const U = G.util, el = (...a) => G.UI.el(...a);
  // Math.max / min / sign / hypot / random hand back a fresh heap number from the mid-tier (Maglev) compiled code that
  // runs most per-frame code (measured 12-36 bytes a call); these plain twins are inlined and allocate nothing.
  // frand: xorshift32, its state in an Int32Array (updating a typed array never boxes); frange(a, b) = U.rand(a, b).
  const fmax = (a, b) => (a > b ? a : b), fmin = (a, b) => (a < b ? a : b), fsign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const fhyp = (x, y) => Math.sqrt(x * x + y * y);
  const _rs = new Int32Array(1); _rs[0] = (Math.random() * 0x7fffffff) | 1;
  const frand = () => { let x = _rs[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _rs[0] = x; return (x >>> 0) / 4294967296; };
  const frange = (a, b) => a + frand() * (b - a);

  G.i18n.add('en', {
    'race.select.title': 'Star Skiff Rally', 'race.select.course': 'Course', 'race.select.ship': 'Skiff', 'race.select.start': 'Race!',
    'race.select.locked': 'Guild ★{n}', 'race.select.lockedPr': 'Rank {n}', 'race.select.best': 'Best {t}', 'race.select.noBest': 'No time yet',
    'race.select.targets': 'Gold {g} · Silver {s} · Bronze {b}', 'race.select.assist': 'Auto-steer', 'race.select.assistHint': 'The skiff follows the best line. You steer to pick a lane!',
    'race.select.class': 'Speed class', 'race.select.daily': 'New course every day!', 'race.select.ghost': 'Ghost ready', 'race.select.platinum': 'Platinum {t}',
    'race.select.assistOn': 'Auto-steer flies a safe line, a bit slower. Steer yourself to go for Gold!',
    'race.ship.arrow': 'Arrow', 'race.ship.manta': 'Manta', 'race.ship.twin': 'Twin', 'race.ship.bulky': 'Bulky', 'race.ship.needle': 'Needle',
    'race.hud.kmh': 'km/h', 'race.hud.best': 'BEST {t}', 'race.hud.energy': 'ENERGY', 'race.hud.target': '{m} {t}',
    'race.stat.track': 'Course', 'race.stat.podium': 'Podium', 'race.stat.place': 'Place', 'race.stat.time': 'Time', 'race.stat.bestLap': 'Best lap', 'race.stat.medal': 'Medal', 'race.stat.rings': 'Ring chains',
    'race.res.win': 'Victory!', 'race.res.place': '#{n}!', 'race.res.great': 'Great run!', 'race.res.medal': '{m} medal!',
    'race.res.pos': 'Pos', 'race.res.pilot': 'Pilot', 'race.res.time': 'Time', 'race.res.lap': 'Best lap', 'race.res.gap': 'Gap',
    'race.res.rewards': 'Rewards', 'race.res.xp': '{n} XP', 'race.res.retry': 'Retry', 'race.res.next': 'Next', 'race.res.hangar': 'Hangar', 'race.res.continue': 'Continue',
    'race.res.newRecord': 'New record!', 'race.res.lumite': '{n} Lumite',
    'race.tip.0': 'Tip: hold DRIFT while steering — release at gold sparks for a big boost!',
    'race.tip.1': 'Tip: yellow boost pads are free speed. Follow the racing line to hit them!',
    'race.tip.2': 'Tip: hold the item button to turn an item into +20 energy.',
    'race.tip.3': 'Tip: tap BOOST right as GO! appears for a perfect start.',
    'race.tip.4': 'Tip: fly through all 5 gold rings for a ring chain bonus.',
    'race.tip.5': 'Tip: the pink strip refills your energy — swing by it once a lap.',
    'race.part.fuel': 'Fizz Fuel', 'race.part.chip': 'Circuit Chip', 'race.part.servo': 'Servo',
    'race.how.1': 'Your skiff flies itself forward. Steer and tap BOOST!', 'race.how.2': 'Hold DRIFT in corners, let go at gold sparks', 'race.how.3': 'Fly through ? boxes for items',
    'race.how.s1': 'Steer + tap BOOST', 'race.how.s2': 'DRIFT in turns → gold sparks', 'race.how.s3': '? boxes = items',
  });
  G.i18n.add('ja', {
    'race.select.title': 'スタースキフ・ラリー', 'race.select.course': 'コース', 'race.select.ship': 'スキフ', 'race.select.start': 'レース！',
    'race.select.locked': 'ギルド★{n}', 'race.select.lockedPr': 'ランク{n}', 'race.select.best': 'ベスト {t}', 'race.select.noBest': 'まだ記録なし',
    'race.select.targets': 'ゴールド {g}・シルバー {s}・ブロンズ {b}', 'race.select.assist': 'オートハンドル', 'race.select.assistHint': 'スキフがいいコースを走るよ。ハンドルでレーンをえらんでね！',
    'race.select.class': 'スピードクラス', 'race.select.daily': '毎日かわるコース！', 'race.select.ghost': 'ゴーストあり', 'race.select.platinum': 'プラチナ {t}',
    'race.select.assistOn': 'オートハンドルは安全なコースを少しゆっくり走るよ。ゴールドをねらうなら自分でハンドル！',
    'race.ship.arrow': 'アロー', 'race.ship.manta': 'マンタ', 'race.ship.twin': 'ツイン', 'race.ship.bulky': 'ボリー', 'race.ship.needle': 'ニードル',
    'race.hud.kmh': 'km/h', 'race.hud.best': 'ベスト {t}', 'race.hud.energy': 'エネルギー', 'race.hud.target': '{m} {t}',
    'race.stat.track': 'コース', 'race.stat.podium': 'ひょうしょうだい', 'race.stat.place': 'じゅんい', 'race.stat.time': 'タイム', 'race.stat.bestLap': 'ベストラップ', 'race.stat.medal': 'メダル', 'race.stat.rings': 'リングコンボ',
    'race.res.win': 'ゆうしょう！', 'race.res.place': '{n}位！', 'race.res.great': 'ナイスラン！', 'race.res.medal': '{m}メダル！',
    'race.res.pos': 'いち', 'race.res.pilot': 'パイロット', 'race.res.time': 'タイム', 'race.res.lap': 'ベストラップ', 'race.res.gap': 'さ',
    'race.res.rewards': 'ごほうび', 'race.res.xp': '{n} XP', 'race.res.retry': 'もう一度', 'race.res.next': 'つぎへ', 'race.res.hangar': 'ハンガー', 'race.res.continue': 'つづける',
    'race.res.newRecord': 'しんきろく！', 'race.res.lumite': 'ルマイト {n}',
    'race.tip.0': 'ヒント：DRIFTをおしながら曲がって、金の火花でボタンをはなすと大ブースト！',
    'race.tip.1': 'ヒント：黄色のブーストパッドはタダで速くなれるよ。いいコースを走ってふもう！',
    'race.tip.2': 'ヒント：アイテムボタンを長おしすると、エネルギー+20にかえられるよ。',
    'race.tip.3': 'ヒント：GO!が出たしゅんかんにBOOSTでパーフェクトスタート！',
    'race.tip.4': 'ヒント：金のリングを5つぜんぶくぐるとリングコンボ！',
    'race.tip.5': 'ヒント：ピンクのラインでエネルギーがたまるよ。1周に1回よってみよう。',
    'race.part.fuel': 'フィズ燃料', 'race.part.chip': '回路チップ', 'race.part.servo': 'サーボ',
    'race.how.1': 'スキフは自動で前にすすむよ。ハンドルとBOOST！', 'race.how.2': 'カーブでDRIFTをおして、金の火花ではなそう', 'race.how.3': '？ボックスをくぐってアイテムゲット',
    'race.how.s1': 'ハンドル＋BOOST', 'race.how.s2': 'カーブでDRIFT→金の火花', 'race.how.s3': '？ボックスでアイテム',
  });

  // ------------------------------------------------------------------ styles (scoped .rr-*)
  // The game frame is always landscape (G.Screen rotates #app on phones held upright), so sizes key off
  // vmax (= frame width) and "short screen" rules match max-height OR max-width (rotated phone).
  const CSS = `
#hud .rr-pos{display:flex;align-items:baseline;gap:2px;line-height:1;position:relative}
#hud .rr-pos .race-pos{color:#fff;transition:color .2s;display:inline-block;transform-origin:50% 70%}
#hud .rr-pos.first .race-pos{color:var(--sun)}
#hud .rr-pos.up .race-pos{animation:rrUp .5s cubic-bezier(.2,1.6,.4,1)}
#hud .rr-pos.dn .race-pos{animation:rrDn .4s ease-out}
#hud .rr-parr{position:absolute;left:100%;top:-4px;margin-left:2px;font:var(--fw-d) calc(22px * var(--ui-t, 1))/1 var(--f-display);font-style:normal;color:#5dff9a;-webkit-text-stroke:max(1px, calc(2px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 2px 0 var(--ink);animation:rrArr .8s ease-out forwards;pointer-events:none}
#hud .rr-parr.dn{color:#ff6b7a;animation-name:rrArrDn}
#hud .rr-pos small{font:var(--fw-d) calc(22px * var(--ui-t, 1))/1 var(--f-display);color:#fff;-webkit-text-stroke:max(1px, calc(2px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 3px 0 var(--ink)}
#hud .rr-pos.bump .race-pos{animation:rrBump .35s ease-out}
#hud .rr-tc{display:flex;flex-direction:column;align-items:center;gap:4px}
#hud .rr-row{display:flex;gap:6px;align-items:center}
#hud .rr-row>.hud-chip{white-space:nowrap;flex:none}
#hud .rr-lap.pulse{animation:rrBump .5s ease-out 3}
#hud .rr-split{font:var(--fw-d) calc(18px * var(--ui-t, 1))/1 var(--f-display);-webkit-text-stroke:max(1px, calc(2px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 2px 0 var(--ink);opacity:0;transition:opacity .25s}
#hud .rr-split.on{opacity:1}
#hud .rr-split.good{color:#5dff9a}#hud .rr-split.bad{color:#ff6b7a}
/* (small HUD text keeps to 11 px as drawn: the top-centre column is scaled by --tc-k on narrow phones, style.css) */
#hud .rr-sub{font:800 max(calc(11px / var(--tc-k, 1)), calc(12px * var(--ui-t, 1))) var(--f-body);color:#fff;text-shadow:0 2px 0 var(--ink),0 0 4px rgba(30,26,77,.6)}
#hud .rr-speedo{position:absolute;left:50%;bottom:calc(4px + env(safe-area-inset-bottom,0px));width:200px;height:108px;transform:translateX(-50%) scale(var(--hud-scale));transform-origin:50% 100%;pointer-events:none;--rr-uf:max(calc(11px / var(--hud-scale, 1)), calc(12px * var(--ui-t, 1)))}
#hud .rr-speedo svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
/* --rr-uf: the km/h unit's size, kept to 11 px as drawn inside the scaled speedo (the digits sit on top of it) */
#hud .rr-speedo .race-speed{position:absolute;left:0;right:0;bottom:calc(8px + var(--rr-uf) * 7 / 6);text-align:center;font-variant-numeric:tabular-nums}
#hud .rr-speedo .rr-unit{position:absolute;left:0;right:0;bottom:6px;text-align:center;font:800 var(--rr-uf) var(--f-body);color:#fff;text-shadow:0 2px 0 var(--ink)}
#hud .rr-speedo .rr-dots{position:absolute;left:0;right:0;top:-14px;display:flex;justify-content:center;gap:6px;opacity:0;transition:opacity .15s}
#hud .rr-speedo .rr-dots.on{opacity:1}
#hud .rr-speedo .rr-dots i{width:9px;height:9px;border-radius:50%;border:2px solid var(--ink);background:rgba(255,255,255,.25)}
#hud .rr-speedo.low .rr-en{animation:rrBlink .4s steps(2) infinite}
#hud .rr-item{position:absolute;left:calc(50% + 112px);bottom:calc(16px + env(safe-area-inset-bottom,0px));width:64px;height:64px;border-radius:18px;border:3px solid var(--ink);background:rgba(255,255,255,.88);box-shadow:0 4px 0 var(--shadow);display:grid;place-items:center;pointer-events:none}
#hud .rr-item svg{width:46px;height:46px;display:block}
#hud .rr-item .k{position:absolute;right:-8px;top:-10px;font:800 max(11px, calc(12px * var(--ui-t, 1)))/1.4 var(--f-body);background:var(--sun);border:2px solid var(--ink);border-radius:8px;padding:0 6px}
#hud .rr-item.empty{opacity:.55}
#hud .rr-item.spin svg{animation:rrWob .16s linear infinite}
#hud .rr-item.got{animation:rrBump .4s ease-out}
#hud .rr-item.off{filter:grayscale(1);opacity:.4}
#hud .rr-flash{position:absolute;left:0;right:0;top:22%;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none}
#hud .rr-flash div{font:var(--fw-d) clamp(20px,4.6vmax,38px)/1.1 var(--f-display);color:#fff;-webkit-text-stroke:max(1px, calc(2.5px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 4px 0 var(--ink);animation:rrPop 1.15s ease-out forwards;white-space:nowrap}
#hud .rr-warn{position:absolute;left:0;right:0;top:38%;text-align:center;font:var(--fw-d) clamp(26px,6vmax,50px)/1 var(--f-display);color:#ff4d5e;-webkit-text-stroke:max(1px, calc(3px * var(--ds, 1))) #fff;paint-order:stroke fill;text-shadow:0 5px 0 var(--ink);animation:rrBlink .5s steps(2) infinite;pointer-events:none}
#hud .rr-vig{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse 75% 70% at 50% 52%,rgba(0,0,0,0) 58%,var(--rr-vc,rgba(255,196,70,.55)) 100%)}
#hud .rr-threat{position:absolute;left:50%;bottom:calc(122px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font:var(--fw-d) 34px/1 var(--f-display);color:#ff4d5e;-webkit-text-stroke:max(1px, calc(2px * var(--ds, 1))) #fff;paint-order:stroke fill;animation:rrBlink .3s steps(2) infinite;pointer-events:none;letter-spacing:-4px}
#hud .rr-hint{position:absolute;left:50%;top:calc(62px + env(safe-area-inset-top,0px));transform:translateX(-50%);max-width:min(92vmax,620px);text-align:center;background:rgba(30,26,77,.62);color:#fff;border-radius:14px;padding:6px 14px;font:800 calc(14px * var(--ui-t, 1))/1.4 var(--f-body);transition:opacity .5s;pointer-events:none}
#hud .countdown.rr-cd{pointer-events:none;animation:rrCount 1s linear forwards;font-size:min(30vmax,160px)}
#hud .countdown.rr-cd>*{grid-area:1/1}
#hud .countdown.rr-cd.go{color:var(--sun);animation:rrGo .85s linear forwards}
#hud .rr-cd .rr-ring{width:min(34vmax,200px);height:min(34vmax,200px);border-radius:50%;border:10px solid currentColor;box-shadow:0 0 0 4px var(--ink),inset 0 0 0 4px var(--ink);opacity:0;animation:rrRing .6s cubic-bezier(.1,.7,.3,1) forwards}
#hud .rr-cd .rr-ring.r2{border-width:5px;box-shadow:none;animation-delay:.08s;animation-duration:.75s}
#hud .rr-cd.go .rr-ring{animation-duration:.7s;border-width:14px}
#hud .rr-cd .rr-num{display:block}
#hud .rr-goflash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(255,250,220,.65),rgba(255,230,120,.25) 45%,rgba(255,210,63,0) 75%);animation:rrFlash .45s ease-out forwards}
#hud .rr-beam{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 58%,rgba(235,255,255,.92),rgba(122,240,255,.7) 45%,rgba(90,200,255,.45) 100%);animation:rrFlash .5s cubic-bezier(.3,0,.6,1) forwards}
#hud .rr-finish{position:absolute;left:0;right:0;top:20%;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;transition:opacity .5s}
#hud .rr-fin-w{position:relative;display:grid;place-items:center}
#hud .rr-fin-band{position:absolute;left:50%;top:50%;width:120vmax;height:62%;transform:translate(-50%,-50%) skewY(-3deg);background:repeating-conic-gradient(#fff 0 25%,#1e1a4d 0 50%) 0 0/26px 26px;opacity:.82;border-top:4px solid var(--ink);border-bottom:4px solid var(--ink);animation:rrBand .5s cubic-bezier(.2,1,.3,1) both}
#hud .rr-fin-t{position:relative;font:var(--fw-d) clamp(44px,10.5vmax,96px)/1 var(--f-display);color:#fff;-webkit-text-stroke:max(1px, calc(4px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 7px 0 var(--ink);white-space:nowrap;animation:rrStamp .6s cubic-bezier(.2,1.5,.4,1) both}
#hud .rr-finish.good .rr-fin-t{color:var(--sun)}
#hud .rr-fin-s{font:var(--fw-d) clamp(24px,5vmax,44px)/1 var(--f-display);color:#fff;-webkit-text-stroke:max(1px, calc(2.5px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 4px 0 var(--ink);white-space:nowrap;animation:rrStamp .45s .28s cubic-bezier(.2,1.6,.4,1) both}
#hud .rr-ringchip{display:flex;align-items:center;gap:6px;font:var(--fw-d) calc(18px * var(--ui-t, 1))/1 var(--f-display);color:#ffd23f;-webkit-text-stroke:max(1px, calc(2px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 2px 0 var(--ink);opacity:0;transition:opacity .3s}
#hud .rr-ringchip.on{opacity:1}
#hud .rr-ringchip.pop{animation:rrBump .35s ease-out}
#hud .rr-ringchip i{width:16px;height:16px;border-radius:50%;border:4px solid #ffc21a;box-shadow:0 0 0 2px var(--ink),inset 0 0 0 2px var(--ink);flex:none}
#hud .rr-speedo .race-speed{transition:color .15s}
#hud .rr-speedo.boost .race-speed{color:#ffe27a}
#app.reduced-motion #hud .rr-cd .rr-ring,#app.reduced-motion #hud .rr-goflash,#app.reduced-motion #hud .rr-parr{display:none}
#app.reduced-motion #hud .countdown.rr-cd{animation-name:rrFade}
#app.reduced-motion #hud .rr-beam{animation-name:rrFlashSoft}
#app.reduced-motion #hud .rr-fin-t,#app.reduced-motion #hud .rr-fin-s,#app.reduced-motion #hud .rr-fin-band{animation-name:rrFadeIn}
#hud .rr-ghostchip{font:800 max(11px, calc(12px * var(--ui-t, 1))) var(--f-body)}
#hud .rr-pb{color:#ffe9a8}
#hud .rr-cp{display:flex;align-items:center;gap:4px;font:800 max(calc(11px / var(--tc-k, 1)), calc(12px * var(--ui-t, 1))) var(--f-body);color:#fff;background:rgba(30,26,77,.66);border-radius:10px;padding:1px 9px 1px 3px;text-shadow:0 1px 0 var(--ink)}
#hud .rr-cp i{display:inline-flex;width:16px;height:16px;border-radius:50%;background:#7dffc4;border:2px solid var(--ink);align-items:center;justify-content:center}
#hud .rr-cp.pop{animation:rrBump .35s ease-out}
#hud .rr-fin-pb{font:var(--fw-d) clamp(20px,4vmax,34px)/1 var(--f-display);color:#ffe27a;-webkit-text-stroke:max(1px, calc(2.5px * var(--ds, 1))) var(--ink);paint-order:stroke fill;text-shadow:0 4px 0 var(--ink);white-space:nowrap;animation:rrStamp .45s .6s cubic-bezier(.2,1.6,.4,1) both}
#app.reduced-motion #hud .rr-fin-pb{animation-name:rrFadeIn}
@media (max-height:480px),(max-width:480px){
#hud .rr-speedo{transform:translateX(-50%) scale(calc(var(--hud-scale) * .74));--rr-uf:max(calc(11px / (var(--hud-scale, 1) * .74)), calc(12px * var(--ui-t, 1)))}
#hud .rr-threat{bottom:calc(84px + env(safe-area-inset-bottom,0px))}
#hud .rr-hint{top:calc(52px + env(safe-area-inset-top,0px));max-width:min(70vmax,560px);font-size:max(11px, calc(12px * var(--ui-t, 1)));padding:4px 12px}
#hud .rr-flash{top:29%}
}
@keyframes rrPop{0%{transform:scale(1.9);opacity:0}14%{transform:scale(1);opacity:1}75%{opacity:1}100%{transform:translateY(-18px);opacity:0}}
@keyframes rrBump{0%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes rrBlink{50%{opacity:.25}}
@keyframes rrWob{0%{transform:rotate(-12deg) scale(.9)}50%{transform:rotate(12deg) scale(1.08)}100%{transform:rotate(-12deg) scale(.9)}}
@keyframes rrCount{0%{transform:scale(.3) rotate(-12deg);opacity:0;animation-timing-function:cubic-bezier(.2,.9,.4,1)}14%{transform:scale(1.22) rotate(3deg);opacity:1;animation-timing-function:ease-in-out}24%{transform:scale(.94) rotate(-1deg)}34%{transform:scale(1.03) rotate(0)}44%{transform:scale(1)}78%{transform:scale(1);opacity:1;animation-timing-function:ease-in}100%{transform:scale(.6);opacity:0}}
@keyframes rrGo{0%{transform:scale(.4);opacity:0;animation-timing-function:cubic-bezier(.2,.9,.4,1)}16%{transform:scale(1.32);opacity:1;animation-timing-function:ease-in-out}28%{transform:scale(1.08)}40%{transform:scale(1.16)}72%{transform:scale(1.16);opacity:1;animation-timing-function:ease-in}100%{transform:scale(2.1);opacity:0}}
@keyframes rrRing{0%{transform:scale(.35);opacity:.95}100%{transform:scale(1.7);opacity:0}}
@keyframes rrFlash{0%{opacity:1}100%{opacity:0}}
@keyframes rrFlashSoft{0%{opacity:.55}100%{opacity:0}}
@keyframes rrBand{0%{transform:translate(-50%,-50%) skewY(-3deg) scaleX(0);opacity:0}100%{transform:translate(-50%,-50%) skewY(-3deg) scaleX(1);opacity:.82}}
@keyframes rrStamp{0%{transform:scale(2.6) rotate(-8deg);opacity:0}55%{transform:scale(.92) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes rrUp{0%{transform:scale(1.7) rotate(-8deg);color:#5dff9a}60%{color:#5dff9a}100%{transform:scale(1) rotate(0)}}
@keyframes rrDn{0%{transform:translateY(5px) scale(.85);color:#ff6b7a}40%{transform:translateY(-2px) scale(1.05)}100%{transform:none}}
@keyframes rrArr{0%{transform:translateY(10px) scale(.4);opacity:0}25%{transform:translateY(-3px) scale(1.15);opacity:1}100%{transform:translateY(-16px);opacity:0}}
@keyframes rrArrDn{0%{transform:translateY(-10px) scale(.4);opacity:0}25%{transform:translateY(3px) scale(1.1);opacity:1}100%{transform:translateY(14px);opacity:0}}
@keyframes rrFade{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0}}
@keyframes rrFadeIn{0%{opacity:0}100%{opacity:1}}
#touch[data-layout="race"] .tb-brake{background:rgba(170,246,255,.85);transition:transform .06s,box-shadow .12s}
/* word labels on BOOST / DRIFT (btnLabels): the icon moves up a little and the word sits in the lower part of the disc */
.tbtn .rr-bl{display:none}
/* (the word is as wide as its text and scaled down to the disc's chord where it sits — fitBtnLabels: "DÉRAPAGE" or
   "DERRAPAR" on the 46 px DRIFT disc of a 568×320 phone were cut to "DÉRAP" / "DERRA" by the round edge; a word that
   would need less than 70 % of its size steps aside and leaves the icon alone) */
#touch[data-layout="race"] .tbtn .rr-bl{display:block;position:absolute;left:50%;bottom:15%;z-index:2;transform:translateX(-50%) scale(var(--rr-k,1));transform-origin:50% 50%;font:900 13px/1 var(--f-body);letter-spacing:0;color:var(--ink);white-space:nowrap;pointer-events:none}
#touch[data-layout="race"] .tb-brake .rr-bl{font-size:12px;bottom:17%}
#touch[data-layout="race"] .tbtn .rr-bl.rr-off{visibility:hidden}
#touch[data-layout="race"] .tbtn.rr-nolbl .ico{width:58%;height:58%;margin-bottom:0}
#touch[data-layout="race"] .tb-boost .ico,#touch[data-layout="race"] .tb-brake .ico{width:50%;height:50%;margin-bottom:16%}
.screen.rr-dim{background:rgba(20,16,60,.55)}
.rr-sel{max-width:min(980px,100%)}
.rr-how{display:flex;gap:8px;flex-wrap:wrap}
.rr-how>div{flex:1 1 180px;display:flex;align-items:center;gap:8px;background:#fff;border:var(--outline);border-radius:14px;padding:6px 10px;font:800 13px/1.3 var(--f-body);min-width:0}
.rr-how .rr-hs{display:none}
.rr-how b{width:24px;height:24px;border-radius:50%;background:var(--sun);border:2px solid var(--ink);display:grid;place-items:center;flex:none}
.rr-how .rr-hi{width:30px;height:30px;flex:none;display:inline-flex}.rr-how .rr-hi svg{width:100%;height:100%}
.rr-sel .panel-body{display:flex;flex-direction:column;gap:10px}
/* selection ring drawn inside the card: the scrolling body clips anything outside it */
.rr-sel .card.sel{outline-offset:-3px}
.rr-sel h3{margin:2px 0 0;font:var(--fw-d) 18px/1.1 var(--f-display)}
/* 7 courses fit one row on a 980 px panel, so the Skiff row stays on screen */
.rr-tracks{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(min(124px,100%),1fr))}
.rr-tcard{padding:8px;gap:4px}
.rr-tcard canvas{width:100%;height:62px;display:block;border-radius:10px;background:#241a5c}
.rr-tcard h3{font:800 13px/1.2 var(--f-body);margin:0;overflow-wrap:anywhere}
/* more below: fade the bottom edge of the scrolling body (toggled by checkMore) */
.rr-sel .panel-body.rr-more{-webkit-mask-image:linear-gradient(#000 calc(100% - 26px),rgba(0,0,0,.15));mask-image:linear-gradient(#000 calc(100% - 26px),rgba(0,0,0,.15))}
.rr-tx{display:flex;flex-direction:column;gap:4px;min-width:0}
.rr-assist{font:800 12px/1.3 var(--f-body);color:var(--grape)}
.rr-tcard .rr-meta{display:flex;justify-content:space-between;align-items:center;gap:4px;font:800 12px var(--f-body);color:var(--ink-soft)}
.rr-medal{display:inline-block;width:16px;height:16px;border-radius:50%;border:2px solid var(--ink);vertical-align:-3px;flex:none}
.rr-m0{background:rgba(30,26,77,.12)}.rr-m1{background:#e0955a}.rr-m2{background:#d8e0f0}.rr-m3{background:#ffc21a}.rr-m4{background:linear-gradient(135deg,#bff8ff,#9fb7ff,#ffd6f6)}
.rr-ships{display:flex;gap:8px;flex-wrap:wrap}
.rr-scard{flex:1 1 92px;min-width:86px;align-items:center;padding:6px 8px;gap:2px}
.rr-scard svg{width:64px;height:48px}
.rr-scard h3{font:800 13px var(--f-body)}
.rr-foot{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.rr-foot .rr-info{font:800 13px/1.4 var(--f-body);color:var(--ink-soft);flex:1;min-width:180px}
.rr-opts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.rr-res{max-width:640px}
.rr-podium{display:flex;justify-content:center;align-items:flex-end;gap:10px;margin:2px 0 4px}
.rr-podium>div{display:flex;flex-direction:column;align-items:center;gap:2px;font:800 12px var(--f-body);text-align:center;max-width:120px}
.rr-podium .st{width:84px;border:3px solid var(--ink);border-radius:12px 12px 0 0;display:grid;place-items:center;font:var(--fw-d) 22px var(--f-display);color:#fff;-webkit-text-stroke:max(1px, calc(1.5px * var(--ds, 1))) var(--ink);paint-order:stroke fill}
.rr-podium .you{color:var(--grape)}
.rr-table{width:100%;border-collapse:collapse;font:700 13px var(--f-body);font-variant-numeric:tabular-nums}
.rr-table td,.rr-table th{padding:3px 6px;text-align:left;border-bottom:2px dashed rgba(30,26,77,.12)}
.rr-table tr.you{background:rgba(255,210,63,.35)}
.rr-stamp{display:inline-flex;align-items:center;gap:8px;font:var(--fw-d) 22px var(--f-display);animation:rrBump .5s ease-out}
.rr-stamp .rr-medal{width:30px;height:30px;border-width:3px}
@media (max-height:480px),(max-width:480px){
.rr-sel{padding:10px;gap:8px}.rr-sel .panel-head h2{font-size:20px}.rr-sel .btn{min-height:42px;padding:8px 14px;font-size:15px}.rr-sel .btn.big{min-height:52px;font-size:18px}
.rr-sel .panel-body{gap:5px}
.rr-sel .panel-body>h3{display:none}
/* all 7 courses in one row of small portrait cards: with the Skiff row and the first-visit strip it fits 844×390 */
.rr-tracks{grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
.rr-tcard{padding:4px;gap:2px}
.rr-tcard canvas{width:100%;height:34px;flex:none;border-radius:8px}
.rr-tcard h3{font-size:11px;line-height:1.12;min-height:2.24em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.rr-tx{gap:2px}
.rr-tcard .rr-meta{font-size:11px;line-height:1.2}.rr-tcard .rr-medal{width:14px;height:14px}.rr-tcard .rr-meta>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rr-tcard .tag{font-size:11px;padding:1px 6px}
.rr-ships{flex-wrap:nowrap;gap:6px}
.rr-scard{flex:1 1 0;min-width:0;flex-direction:row;justify-content:center;padding:2px 6px;gap:4px}
.rr-scard svg{width:32px;height:26px;flex:none}
.rr-tcard .rr-nb{display:none}.rr-tcard .rr-meta{justify-content:flex-end}.rr-tcard .rr-meta>span:not(.rr-nb){margin-right:auto}
.rr-scard h3{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rr-opts{gap:6px}
.rr-opts .tab{padding:4px 9px;font-size:12px;box-shadow:0 2px 0 var(--ink)}
.rr-opts .toggle{transform:scale(.85);transform-origin:left center}
.rr-how{flex-wrap:nowrap;gap:6px}
.rr-how>div{flex:1 1 0;padding:2px 8px;gap:6px;font-size:12px;line-height:1.2;border-width:2.5px;border-radius:12px}.rr-how .rr-hi{width:20px;height:20px}.rr-how b{width:18px;height:18px;font-size:11px}
.rr-how .rr-hl{display:none}.rr-how .rr-hs{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rr-foot .rr-info{font-size:12px}
}
/* 568×320 phones (game frame classes, so a rotated phone counts too): everything a notch smaller so the course
   names show on the first screen, and the first-visit tips wrap to two lines instead of ending in "…" */
html.gh-short.gw-tiny .rr-sel{gap:6px}
html.gh-short.gw-tiny .rr-sel .panel-head .btn.icon{width:36px;height:36px}
html.gh-short.gw-tiny .rr-opts{gap:4px 6px}
html.gh-short.gw-tiny .rr-opts .tab{padding:3px 7px;font-size:11.5px}
html.gh-short.gw-tiny .rr-opts label.row{font-size:12px!important}
html.gh-short.gw-tiny .rr-how>div{padding:2px 6px;gap:4px;font-size:11px;line-height:1.12;min-height:30px}
html.gh-short.gw-tiny .rr-how b{display:none}
html.gh-short.gw-tiny .rr-how .rr-hi{width:18px;height:18px}
html.gh-short.gw-tiny .rr-how .rr-hs{white-space:normal;text-overflow:clip;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
html.gh-short.gw-tiny .rr-tracks{gap:4px}
html.gh-short.gw-tiny .rr-tcard{padding:3px;gap:2px}
html.gh-short.gw-tiny .rr-tcard canvas{height:24px;border-radius:6px}
html.gh-short.gw-tiny .rr-tcard h3{font-size:10.5px;line-height:1.1;min-height:2.2em}
html.gh-short.gw-tiny .rr-tcard .rr-meta>span:not(.tag){display:none}
html.gh-short.gw-tiny .rr-tcard .rr-meta{justify-content:flex-end;min-height:14px}
html.gh-short.gw-tiny .rr-tcard .tag{font-size:10px;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;max-width:100%}
html.gh-short.gw-tiny .rr-tcard.locked .rr-medal{display:none}
html.gh-short.gw-tiny .rr-scard h3{font-size:11px}
html.gh-short.gw-tiny .rr-foot{gap:6px}
html.gh-short.gw-tiny .rr-foot .rr-info{font-size:11px;line-height:1.25;min-width:150px}
html.gh-short.gw-tiny .rr-sel .btn.big{min-height:44px;font-size:16px;padding:6px 14px}
/* every short frame (≤460 px tall: 568×320 up to 844×390, a rotated phone too; menus zoom with the text size): the
   options row scrolls with the body (build), nothing in the body shrinks, the course cards sit in one row that
   scrolls sideways at a width where every name shows whole, the Skiff row keeps whole names (it scrolls sideways
   too if it must) and the first-visit tips wrap instead of ending in "…" */
html.gh-short .rr-sel .panel-body>*{flex:none}
html.gh-short .rr-tracks{display:flex;position:relative;overflow-x:auto;overflow-y:hidden;gap:6px;padding:2px;margin:0 -2px;scroll-snap-type:x proximity;touch-action:pan-x pan-y;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 var(--rr-fl,0px),#000 calc(100% - var(--rr-fr,0px)),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 var(--rr-fl,0px),#000 calc(100% - var(--rr-fr,0px)),transparent 100%)}
html.gh-short .rr-tracks::-webkit-scrollbar,html.gh-short .rr-ships::-webkit-scrollbar{display:none}
html.gh-short .rr-tcard{flex:0 0 124px;scroll-snap-align:start;padding:3px 4px;gap:2px}
html.gh-short .rr-tcard canvas{height:26px}
html.gh-short .rr-sel .panel-body{gap:4px}
html.gh-short .rr-tcard h3,html.gh-short.gw-tiny .rr-tcard h3{font-size:11.5px;line-height:1.15;min-height:2.3em;display:block;-webkit-line-clamp:unset;overflow:visible;overflow-wrap:break-word;hyphens:manual}
html.gh-short .rr-tcard .rr-meta{min-height:14px;margin-top:auto}
html.gh-short .rr-tcard .tag,html.gh-short.gw-tiny .rr-tcard .tag{font-size:11px;padding:0 5px;white-space:nowrap;overflow:visible;max-width:none}
html.gh-short .rr-tx{flex:1}
html.gh-short .rr-ships{overflow-x:auto;overflow-y:hidden;padding:2px;margin:0 -2px;touch-action:pan-x pan-y;scrollbar-width:none}
html.gh-short .rr-scard{flex:1 0 auto;min-width:auto;padding:2px 8px 2px 4px}
html.gh-short .rr-scard h3,html.gh-short.gw-tiny .rr-scard h3{font-size:12px;overflow:visible;text-overflow:clip}
html.gh-short .rr-how>div{align-items:center;min-height:30px;padding-top:2px;padding-bottom:2px}
html.gh-short .rr-how .rr-hs,html.gh-short.gw-tiny .rr-how .rr-hs{display:block;white-space:normal;text-overflow:clip;overflow:visible;-webkit-line-clamp:unset;overflow-wrap:anywhere;line-height:1.15}
html.gh-short .rr-sel .rr-opts{flex:none}
/* (a returning player's best time is back on the course cards of a 568-wide phone: the cards now keep a fixed width in
   the sideways row, room enough for "Recorde 1:41.50" next to the medal) */
html.gh-short.gw-tiny .rr-tcard .rr-meta>span:not(.tag):not(.rr-nb){display:block}
/* Japanese course names wrap only at their breaks (the <wbr> after '・', phrase breaks): never cut anywhere, which put
   '・' at the start of the second line on desktop cards */
html:lang(ja) .rr-tcard h3{overflow-wrap:normal}
`;
  function injectCSS() {
    if (document.getElementById('rr-style')) return;
    // after style.css (which the build inlines in <body>), so equal-specificity rules here win
    // The button-layout editor draws its own copies of the buttons: give its Race tab the race look
    // (DRIFT colour + drift icon instead of the generic brake glyph).
    const drift = 'data:image/svg+xml;utf8,' + encodeURIComponent(DRIFT_SVG.replace(/currentColor/g, INK));
    const ed = '.hl-btn.tb-brake{background:rgba(170,246,255,.85)}.hl-btn.tb-brake .ico svg{visibility:hidden}.hl-btn.tb-brake .ico{background:url("' + drift + '") center/contain no-repeat}';
    const s = document.createElement('style'); s.id = 'rr-style'; s.textContent = CSS + ed; (document.body || document.head).appendChild(s);
  }

  // ------------------------------------------------------------------ icons
  const INK = '#1e1a4d';
  const ITEM_SVG = {
    rockets: '<svg viewBox="0 0 48 48"><g stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round">' + [10, 24, 38].map(x => '<path d="M' + x + ' 6c4 4 4 14 4 22h-8c0-8 0-18 4-22z" fill="#ff7a3d"/><path d="M' + (x - 4) + ' 28h8l-1 6h-6z" fill="#ffd23f"/>').join('') + '</g></svg>',
    homing: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="#ff4d5e" stroke-width="3" stroke-dasharray="6 5"/><circle cx="24" cy="26" r="11" fill="#6dff8a" stroke="' + INK + '" stroke-width="2.5"/><circle cx="20" cy="23" r="2.4" fill="' + INK + '"/><circle cx="28" cy="23" r="2.4" fill="' + INK + '"/><path d="M19 30q5 4 10 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/></svg>',
    mine: '<svg viewBox="0 0 48 48"><g stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"><path d="M24 4l4 8 9-3-3 9 8 4-8 4 3 9-9-3-4 8-4-8-9 3 3-9-8-4 8-4-3-9 9 3z" fill="#ff5fa2"/><circle cx="24" cy="24" r="7" fill="#ffd6ea"/></g></svg>',
    shield: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#7af0ff" fill-opacity=".55" stroke="' + INK + '" stroke-width="2.8"/><path d="M14 18q4-6 10-6" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>',
    static: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#c4a8ff" fill-opacity=".5" stroke="' + INK + '" stroke-width="2.5"/><path d="M27 6L15 26h9l-4 16 14-22h-9z" fill="#ffd23f" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/></svg>',
    turbo: '<svg viewBox="0 0 48 48"><g stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"><rect x="12" y="10" width="24" height="32" rx="6" fill="#ffd23f"/><rect x="18" y="5" width="12" height="7" rx="2" fill="#c9d2ea"/><path d="M26 15l-7 11h6l-3 11 8-13h-6z" fill="#fff"/></g></svg>',
    guide: '<svg viewBox="0 0 48 48"><g stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round" fill="none"><path d="M12 44L20 6M36 44L28 6" stroke="#3fe0b8" stroke-width="5"/><path d="M12 44L20 6M36 44L28 6"/></g><path d="M24 14l6 8h-4v8h-4v-8h-4z" fill="#fff" stroke="' + INK + '" stroke-width="2"/></svg>',
    comet: '<svg viewBox="0 0 48 48"><path d="M6 8l20 14M4 18l18 8M14 4l14 16" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/><circle cx="31" cy="30" r="12" fill="#ffb627" stroke="' + INK + '" stroke-width="2.6"/><path d="M27 26l3 3 6-6" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/><text x="31" y="35" font-size="12" font-weight="900" text-anchor="middle" fill="' + INK + '">1</text></svg>',
    none: '<svg viewBox="0 0 48 48"><path d="M24 6l5 12h13l-10 8 4 13-12-8-12 8 4-13-10-8h13z" fill="rgba(30,26,77,.18)" stroke="rgba(30,26,77,.35)" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  };
  const LOCK = '<svg viewBox="0 0 24 24" width="12" height="12"><rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';
  const DRIFT_SVG = '<svg viewBox="0 0 48 48"><path d="M10 36c4-14 14-22 30-22" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M32 6l9 8-10 6" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 44l3-5M15 44l1-6M4 38l5-2" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const ITEM_IDS = ['rockets', 'homing', 'mine', 'shield', 'static', 'turbo', 'guide', 'comet'];
  function itemIcon(id) { return ITEM_SVG[id] || ITEM_SVG.none; }
  const css = c => '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6);
  // Top-down skiff silhouettes for the select screen and results.
  function shipIcon(style, col) {
    col = col || { main: 0x2ec4b6, accent: 0xffd23f, glow: 0x7af0ff };
    const m = css(col.main), a = css(col.accent), g = css(col.glow);
    const P = {
      arrow: 'M32 4l6 18 18 14-2 4-16-6-2 8h-8l-2-8-16 6-2-4 18-14z',
      manta: 'M32 8c6 0 8 8 10 12l20 12-4 6-18-4-2 8H26l-2-8-18 4-4-6 20-12c2-4 4-12 10-12z',
      twin: 'M20 6h8l2 20h4l2-20h8l2 28 10 8-2 4-12-2-2 8h-6l-2-8h-6l-2 8h-6l-2-8-12 2-2-4 10-8z',
      bulky: 'M24 6h16l4 14 14 10-2 8-14-2-2 8H22l-2-8-14 2-2-8 14-10z',
      needle: 'M32 2l4 22 14 16-2 4-12-6-2 8h-4l-2-8-12 6-2-4 14-16z',
    };
    const d = P[style] || P.arrow;
    return '<svg viewBox="0 0 64 56"><path d="' + d + '" fill="' + m + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<ellipse cx="32" cy="22" rx="4.5" ry="7" fill="#bff8ff" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M14 36l10-4M50 36l-10-4" stroke="' + a + '" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="27" cy="50" r="3" fill="' + g + '" stroke="' + INK + '" stroke-width="1.5"/><circle cx="37" cy="50" r="3" fill="' + g + '" stroke="' + INK + '" stroke-width="1.5"/></svg>';
  }

  // Injected at load (not on the first race) so the button-layout editor (Settings > Controls > Race),
  // which positions buttons itself (07c_hud_layout.js), shows the race look even before any race.
  injectCSS();

  // ------------------------------------------------------------------ HUD
  let W = null;   // widget refs
  const RU = G.RaceUI = {};
  RU.itemIcon = itemIcon; RU.shipIcon = shipIcon;
  RU.build = function (race) {
    injectCSS();
    const H = G.HUD, tl = H.slot('tl'), tc = H.slot('tc'), full = H.slot('full');
    // every field the HUD ever uses, created here (RU.frame runs every frame: a field added later changed W's shape and
    // threw the optimized frame code away); numbers start as doubles where they hold fractions
    W = { race, t: 0.5, timed: [], pos: null, lap: null, time: null, best: null, target: null, medals: null, chasePlat: false, speed: null, unit: null,
      spArc: null, enArc: null, speedo: null, dots: null, item: null, threat: null, warn: null, vig: null, vigK: 0.5, mapCv: null, mapBg: null, mapF: null,
      cpXY: null, ringChip: null, ringT: 0.5, cp: null, cpT: 0.5, split: null, splitT: 0.5, flash: null, pb: null, tc: null, cd: null, fin: null, lang: '',
      lastLap: 0, lastPlace: 0, posT: -9.5, parr: null, dglow: '', icd: 0.5, spBoost: false, itemIco: null, lastItem: undefined, blFit: 0 };
    W.t = 0; W.vigK = 0; W.ringT = 0; W.cpT = 0; W.splitT = 0; W.icd = -1;
    W.pos = el('div.rr-pos', el('b.race-pos', { text: '5' }), el('small', { text: '/' + race.racers.length }));
    if (!race.tt) tl.appendChild(W.pos);
    else {
      const m = G.Race.medalTimes(race.def.id, race.cls);
      W.target = el('div.hud-chip.rr-ghostchip');
      tl.appendChild(W.target);
      W.medals = m;
      const rec = G.Race.record(race.def.id, race.cls);
      W.chasePlat = !!(rec && rec.m >= 3);        // platinum target only shows once gold is earned
    }
    W.lap = el('div.hud-chip.big.rr-lap');
    W.time = el('div.hud-chip', { style: { fontVariantNumeric: 'tabular-nums' } });
    W.split = el('div.rr-split');
    W.best = el('div.rr-sub');
    W.ringChip = el('div.rr-ringchip', el('i'), el('span'));
    // personal best on this course + class (saved record), and a chip that pops for each checkpoint cleared
    const rec0 = race.def.daily ? null : G.Race.record(race.def.id, race.cls);
    W.pb = rec0 && rec0.b ? el('div.rr-sub.rr-pb', { text: G.t('race.hud.pb', { t: G.Race.fmt(rec0.b) }) }) : null;
    W.cp = el('div.rr-cp', el('i', { html: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#1e1a4d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), el('span'));
    W.cp.hidden = true;
    W.tc = el('div.rr-tc', el('div.rr-row', W.lap, W.time), W.split, W.best, W.pb, W.cp, W.ringChip);
    tc.appendChild(W.tc);
    // speedometer + energy arc
    const arc = (r, cls, w) => '<path class="' + cls + '" d="M ' + (100 - r) + ' 100 A ' + r + ' ' + r + ' 0 0 1 ' + (100 + r) + ' 100" fill="none" stroke-width="' + w + '" stroke-linecap="round" pathLength="100"/>';
    W.speedo = el('div.rr-speedo', {
      html: '<svg viewBox="0 0 200 108">' +
        '<path d="M 14 100 A 86 86 0 0 1 186 100" fill="none" stroke="rgba(30,26,77,.55)" stroke-width="15" stroke-linecap="round"/>' +
        arc(86, 'rr-sp', 9) +
        '<path d="M 34 100 A 66 66 0 0 1 166 100" fill="none" stroke="rgba(30,26,77,.55)" stroke-width="13" stroke-linecap="round"/>' +
        arc(66, 'rr-en', 8) + '</svg>',
    });
    W.speed = el('div.race-speed', { text: '0' });
    W.unit = el('div.rr-unit', { i18n: 'race.hud.kmh' });
    W.dots = el('div.rr-dots', el('i'), el('i'), el('i'));
    W.speedo.append(W.speed, W.unit, W.dots);
    full.appendChild(W.speedo);
    W.spArc = W.speedo.querySelector('.rr-sp'); W.enArc = W.speedo.querySelector('.rr-en');
    W.spArc.setAttribute('stroke', '#fff'); W.spArc.setAttribute('stroke-dasharray', '0 100');
    W.enArc.setAttribute('stroke', '#39d5ff'); W.enArc.setAttribute('stroke-dasharray', '100 100');
    // item slot
    W.item = el('div.rr-item.empty', { html: itemIcon(null) });
    if (G.input.device === 'desktop') W.item.appendChild(el('span.k', { text: 'B' }));
    else W.item.hidden = true;                 // touch: the ITEM button itself shows the held item
    W.itemIco = null;
    full.appendChild(W.item);
    W.vig = el('div.rr-vig'); full.insertBefore(W.vig, full.firstChild);
    W.flash = el('div.rr-flash'); full.appendChild(W.flash);
    W.warn = el('div.rr-warn', { hidden: true }); full.appendChild(W.warn);
    W.threat = el('div.rr-threat', { text: '▲▲▲', hidden: true }); full.appendChild(W.threat);
    W.cd = null;
    W.mapCv = document.querySelector('#hud .minimap canvas');
    W.mapBg = null;
    W.lastItem = undefined; W.lastPlace = 0; W.lastLap = 0;
    if (G.Input.setIcon) { G.Input.setIcon('item', itemIcon(null)); G.Input.setIcon('brake', DRIFT_SVG); }
    btnLabels(true);
  };
  // Small word labels on the race touch buttons (BOOST / DRIFT in each language: race.btn.*), the same words the race
  // tips and the Hangar how-to strip use, so "tap BOOST" points at something on screen.
  function btnLabels(on) {
    for (let k = 0; k < 2; k++) {
      const b = G.Input.btn && G.Input.btn(k ? 'brake' : 'boost'); if (!b) continue;
      let l = b.querySelector('.rr-bl');
      if (!on) { if (l) l.remove(); b.classList.remove('rr-nolbl'); continue; }
      if (!l) { l = document.createElement('span'); l.className = 'rr-bl'; b.appendChild(l); }
      l.textContent = G.t(k ? 'race.btn.drift' : 'race.btn.boost');
    }
    if (W) W.blFit = 0;          // (re-fit to the disc: fitBtnLabels from RU.frame)
  }
  // Scale each word to the chord of its disc at the height it sits (minus 2 px each side). Measured from RU.frame a few
  // times after the race HUD is built, the language changes, the frame resizes or a menu closes (the buttons are laid
  // out again then: Settings → Controls can resize them) — never every frame (a layout read). Returns true once it
  // measured visible buttons.
  function fitBtnLabels() {
    let ok = false;
    for (let k = 0; k < 2; k++) {
      const b = G.Input.btn && G.Input.btn(k ? 'brake' : 'boost'), l = b && b.querySelector('.rr-bl');
      if (!l) continue;
      const d = b.clientWidth;
      if (!d || !l.offsetWidth) continue;
      l.style.setProperty('--rr-k', '1'); l.classList.remove('rr-off'); b.classList.remove('rr-nolbl');
      const w = l.offsetWidth, r = d / 2, dy = l.offsetTop + l.offsetHeight / 2 - r;
      const half = Math.sqrt(Math.max(0, r * r - dy * dy)) - 2, kk = Math.min(1, (2 * half) / w);
      // (and as drawn: its size x that fit x the button's own scale — small phones, Settings → Controls. A word that would
      // draw under 11 px steps aside too: 7.7-10.2 px "DRIFT" / "BOOST" on a 568x320 phone could not be read)
      const sc = b.offsetWidth ? b.getBoundingClientRect().width / b.offsetWidth : 1, px = (parseFloat(getComputedStyle(l).fontSize) || 12) * kk * (sc > 0 ? sc : 1);
      if (kk < 0.7 || px < 11) { l.classList.add('rr-off'); b.classList.add('rr-nolbl'); } else if (kk < 1) l.style.setProperty('--rr-k', kk.toFixed(3));
      ok = true;
    }
    return ok;
  }
  const refitLabels = () => { if (W) W.blFit = 0; };
  G.bus.on('resize', refitLabels); G.bus.on('screen', refitLabels); G.bus.on('ui-empty', refitLabels);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitLabels, () => {});
  RU.destroy = function () {
    btnLabels(false);
    const db = G.Input.btn && G.Input.btn('brake'); if (db) db.style.boxShadow = '';
    if (G.Input.setIcon) { G.Input.setIcon('item', G.Input.ICONS.item); G.Input.setIcon('brake', G.Input.ICONS.brake); G.Input.setCooldown('item', 1, ''); G.Input.setCooldown('boost', 1, ''); }
    W = null;
  };
  // Callouts expire on game time (so they freeze with the pause menu), see expire() in frame().
  const later = (node, sec, fadeAt) => { if (W) W.timed.push({ node, t: sec, fade: fadeAt || 0 }); };
  // Countdown: the number slams in with an elastic overshoot and a tilt, two rings burst out behind it;
  // GO! adds a warm screen flash. (The animation lives on the container so tests can freeze it.)
  RU.countdown = function (text, go) {
    if (!W) return;
    if (W.cd) W.cd.remove();
    W.cd = el('div.countdown.rr-cd' + (go ? '.go' : ''), el('i.rr-ring'), el('i.rr-ring.r2'), el('span.rr-num', { text }));
    const cc = { 3: '#ff7a93', 2: '#ffd23f', 1: '#5dffb0' }[text];
    if (cc) W.cd.style.color = cc;
    const full = G.HUD.slot('full');
    full.appendChild(W.cd);
    later(W.cd, go ? 0.9 : 1.0);
    if (go) { const f = el('div.rr-goflash'); if (G.Motion && G.Motion.flash && G.Motion.flash() < 1) f.style.animationName = 'rrFlashSoft'; full.insertBefore(f, full.firstChild); later(f, 0.5); }
  };
  // Finish stamp: FINISH! slams onto a checkered band sweeping across, then the place / time.
  RU.finish = function (title, sub, good, best) {
    if (!W) return;
    if (W.fin) W.fin.remove();
    // best: "New best! 1:32.10" stamp (personal best on this course + class) under the place / time
    W.fin = el('div.rr-finish' + (good ? '.good' : ''), el('div.rr-fin-w', el('i.rr-fin-band'), el('div.rr-fin-t', { text: title })), sub ? el('div.rr-fin-s', { text: sub }) : null,
      best ? el('div.rr-fin-pb', { text: best }) : null);
    G.HUD.slot('full').appendChild(W.fin);
    later(W.fin, 3.0, 0.5);
    W.flash.textContent = '';
  };
  // Checkpoint cleared: a small "Checkpoint 3/6" chip pops under the lap chip (the gate itself turns mint).
  RU.checkpoint = function (n, total) {
    if (!W || !W.cp) return;
    const c = W.cp;
    c.lastChild.textContent = G.t('race.cp', { n, total });
    c.hidden = false; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    W.cpT = 1.6;
  };
  // Tractor beam: a cyan flash that covers the camera cut after a long respawn hop (23_race.js tractor()).
  RU.beam = function () {
    if (!W) return;
    const f = el('div.rr-beam');
    if (G.Motion && G.Motion.flash && G.Motion.flash() < 1) f.style.animationName = 'rrFlashSoft';   // Flashes: reduced
    const full = G.HUD.slot('full');
    full.insertBefore(f, full.firstChild); later(f, 0.55);
  };
  // Gold-ring chain progress (n of total this chain): pops under the lap chip, fades after a moment.
  RU.ring = function (n, total) {
    if (!W || !W.ringChip) return;
    const c = W.ringChip;
    c.lastChild.textContent = G.t('race.ringCount', { n, total });
    c.classList.add('on'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    W.ringT = 1.6;
  };
  RU.flash = function (text, color) {
    if (!W) return;
    const d = el('div', { text });
    if (color) d.style.color = color;
    W.flash.appendChild(d);
    while (W.flash.children.length > 2) W.flash.firstChild.remove();
    later(d, 1.2);
  };
  RU.hint = function () {
    if (!W) return;
    const h = el('div.rr-hint', { text: G.t(G.input.device === 'touch' ? 'race.hint.touch' : 'race.hint.desktop') });
    G.HUD.slot('full').appendChild(h);
    later(h, 4.8, 0.6);
  };
  function expire(dt) {
    for (let i = W.timed.length - 1; i >= 0; i--) {
      const e = W.timed[i]; e.t -= dt;
      if (e.fade && e.t < e.fade && !e.faded) { e.node.style.opacity = '0'; e.faded = true; }
      if (e.t <= 0) { e.node.remove(); W.timed.splice(i, 1); }
    }
  }
  RU.split = function (delta, lap) {
    if (!W) return;
    const s = (delta <= 0 ? '−' : '+') + Math.abs(delta).toFixed(2);
    W.split.textContent = s;
    W.split.className = 'rr-split on ' + (delta <= 0 ? 'good' : 'bad');
    clearTimeout(W.splitT);
    W.splitT = setTimeout(() => { if (W) W.split.classList.remove('on'); }, lap ? 3000 : 1800);
  };
  RU.itemUsed = function () { if (W) W.lastItem = undefined; };

  const DOT_COLS = ['#7af0ff', '#ff6fd8', '#ffd23f'], DOT_GLOW = ['0 0 16px 6px #7af0ff', '0 0 18px 7px #ff6fd8', '0 0 22px 9px #ffd23f'];
  RU.frame = function (R, dt) {
    if (!W || W.race !== R) return;
    W.t += dt;
    expire(dt);
    const p = R.player, T = R.T;
    // language switched mid-race (pause menu): re-render the cached labels
    if (W.lang !== G.i18n.lang) {
      W.lang = G.i18n.lang; W.lastLap = 0; W.best._s = W.warn._s = null; if (W.target) W.target._s = null; btnLabels(true);
      const rec = W.pb && G.Race.record(R.def.id, R.cls); if (rec && rec.b) W.pb.textContent = G.t('race.hud.pb', { t: G.Race.fmt(rec.b) });
    }
    // touch button words fitted to their discs: three measurements ~0.27 s apart after a (re)build, then left alone
    if (W.blFit < 3 && (G.time.frame & 15) === 0 && G.input.device === 'touch' && fitBtnLabels()) W.blFit++;
    // position: gaining a place pops the number up in green with a ▲, losing one dips it with a ▼
    if (!R.tt && p.place !== W.lastPlace) {
      W.pos.firstChild.textContent = String(p.place);
      W.pos.classList.toggle('first', p.place === 1);
      // (rate-limited: two skiffs side by side can swap places every frame; restarting the animation
      // each time would force a reflow per frame and the number would never settle)
      const cls = !W.lastPlace || !R.started ? 'bump' : p.place < W.lastPlace ? 'up' : 'dn';
      const pop = W.t - (W.posT || -9) > 0.4;
      if (pop) { W.posT = W.t; W.pos.classList.remove('bump', 'up', 'dn'); void W.pos.offsetWidth; W.pos.classList.add(cls); }
      if (pop && cls !== 'bump') {
        if (W.parr) W.parr.remove();
        W.parr = el('i.rr-parr' + (cls === 'dn' ? '.dn' : ''), { text: cls === 'up' ? '▲' : '▼' });
        W.pos.appendChild(W.parr); later(W.parr, 0.8);
      }
      W.lastPlace = p.place;
    }
    if (W.ringT > 0) { W.ringT -= dt; if (W.ringT <= 0) W.ringChip.classList.remove('on'); }
    if (W.cpT > 0) { W.cpT -= dt; if (W.cpT <= 0) W.cp.hidden = true; }
    // lap + timer
    const lap = U.clamp(Math.floor(fmax(0, p.dist) / T.L) + 1, 1, R.laps);
    if (lap !== W.lastLap) {
      W.lap.textContent = G.t('race.lap', { n: lap, total: R.laps });
      if (lap === R.laps && R.laps > 1) { W.lap.classList.remove('pulse'); void W.lap.offsetWidth; W.lap.classList.add('pulse'); }
      W.lastLap = lap;
    }
    const tShow = p.finished ? p.finishT : R.rt;
    const ts = G.Race.fmt(tShow);
    if (W.time._s !== ts) { W.time.textContent = ts; W.time._s = ts; }
    // (labels are rebuilt only when what they show changes: no string or params object per frame)
    if (W.best._v !== p.bestLap || W.best._s === null) {
      const bestTxt = p.bestLap ? G.t('race.hud.best', { t: G.Race.fmt(p.bestLap) }) : '';
      W.best._v = p.bestLap;
      if (W.best._s !== bestTxt) { W.best.textContent = bestTxt; W.best._s = bestTxt; }
    }
    if (W.target && W.medals) {
      const m = W.medals, t = R.rt;
      const tier = W.chasePlat && t < m.platinum ? 4 : t < m.gold ? 3 : t < m.silver ? 2 : t < m.bronze ? 1 : 0;
      if (W.target._v !== tier || W.target._s === null) {
        W.target._v = tier;
        const txt = tier ? G.t('race.hud.target', { m: G.t('race.medal.' + tier), t: G.Race.fmt(tier === 4 ? m.platinum : tier === 3 ? m.gold : tier === 2 ? m.silver : m.bronze) }) : '';
        if (W.target._s !== txt) { W.target.textContent = txt; W.target._s = txt; W.target.hidden = !txt; }
      }
    }
    // speed + energy
    const kmh = Math.round(p.v * 12);
    if (W.speed._v !== kmh) { W.speed.textContent = String(kmh); W.speed._v = kmh; }
    // (SVG / style writes only when the shown value changes: each write repaints the HUD layer)
    const spq = Math.round(U.clamp(p.v / (G.Race.TUNE.cap * R.clsK), 0, 1) * 500);
    if (W.spArc._q !== spq) { W.spArc._q = spq; W.spArc.setAttribute('stroke-dasharray', (spq / 5).toFixed(1) + ' 100'); }
    if (W.spBoost !== p.boosting) { W.spBoost = p.boosting; W.spArc.setAttribute('stroke', p.boosting ? '#ffd23f' : '#ffffff'); W.speedo.classList.toggle('boost', !!p.boosting); }
    const en = p.energy, enq = Math.round(en * 5);
    if (W.enArc._q !== enq) { W.enArc._q = enq; W.enArc.setAttribute('stroke-dasharray', (enq / 5).toFixed(1) + ' 100'); }
    const enc = p.stallT > 0 ? '#8a7fb0' : en < 15 ? '#ff4d5e' : en < 30 ? '#ffd23f' : '#39d5ff';
    if (W.enArc._c !== enc) { W.enArc._c = enc; W.enArc.setAttribute('stroke', enc); }
    W.speedo.classList.toggle('low', en < 15 && p.stallT <= 0);
    const dots = W.dots.children;
    const cols = DOT_COLS;
    W.dots.classList.toggle('on', !!p.drifting);
    const dglow = p.drifting && p.driftTier > 0 ? DOT_GLOW[p.driftTier - 1] : '';
    if (W.dglow !== dglow) { const b = G.Input.btn && G.Input.btn('brake'); if (b) b.style.boxShadow = dglow; W.dglow = dglow; }
    for (let i = 0; i < 3; i++) { const on = p.drifting && p.driftTier > i; const c = on ? cols[fmin(2, p.driftTier - 1)] : ''; if (dots[i]._c !== c) { dots[i].style.background = c; dots[i]._c = c; } }
    // item slot (+ touch button icon)
    const shown = p.rouletteT > 0 ? 'spin' : (p.item || null);
    if (shown === 'spin') {
      const id = ITEM_IDS[Math.floor(W.t * 14) % ITEM_IDS.length];
      if (W.itemIco !== id) { W.item.firstChild.outerHTML = itemIcon(id); W.itemIco = id; if (G.Input.setIcon) G.Input.setIcon('item', itemIcon(id)); }
      W.item.classList.add('spin'); W.item.classList.remove('empty');
    } else if (shown !== W.lastItem || W.itemIco === null) {
      W.item.firstChild.outerHTML = itemIcon(shown); W.itemIco = shown;
      W.item.classList.remove('spin'); W.item.classList.toggle('empty', !shown);
      if (shown) { W.item.classList.remove('got'); void W.item.offsetWidth; W.item.classList.add('got'); }
      if (G.Input.setIcon) G.Input.setIcon('item', itemIcon(shown));
      W.lastItem = shown;
    }
    W.item.classList.toggle('off', p.itemsOffT > 0);
    if (G.Input.setCooldown) {
      const hold = p.itemHold >= 0 && p.item ? p.itemHold / G.Race.TUNE.absorbHold : 0;
      const icd = p.item ? 1 - hold * 0.999 : 0.999;
      if (W.icd !== icd) { W.icd = icd; G.Input.setCooldown('item', icd, ''); }
      if ((G.time.frame & 3) === 0) G.Input.setCooldown('boost', p.stallT > 0 ? 0 : en / 100 * 0.999 + (en >= 99.5 ? 0.001 : 0), '');
    }
    // warnings
    let warn = '';
    if (p.wrongT > 0.7 && !p.finished) warn = G.t('race.wrongWay');
    else if (p.stallT > 0) warn = G.t('race.overheat');
    if (W.warn._s !== warn) { W.warn.textContent = warn; W.warn.hidden = !warn; W.warn._s = warn; }
    let threat = false;
    for (let i = 0; i < R.proj.length && !threat; i++) threat = R.proj[i].target === p;
    if (W.threat.hidden === threat) W.threat.hidden = !threat;
    // boost vignette (CSS, free)
    const vk = p.boosting ? (p.padT > 0 || p.turboT > 0 ? 1 : 0.75) : p.charging ? 0.5 : p.drafting ? 0.4 : 0;
    W.vigK = U.damp(W.vigK || 0, vk, 8, dt);
    const vc = p.charging && !p.boosting ? 'rgba(255,111,181,.5)' : p.drafting && !p.boosting ? 'rgba(220,240,255,.45)' : (p.dbT > 0 ? 'rgba(122,240,255,.55)' : 'rgba(255,196,70,.55)');
    if (W.vig._c !== vc) { W.vig.style.setProperty('--rr-vc', vc); W.vig._c = vc; }
    const vo = Math.round(W.vigK * (G.Motion && G.Motion.flash ? G.Motion.flash() : G.Save.set.reducedMotion ? 0.5 : 1) * 100);   // Flashes comfort setting
    if (W.vig._o !== vo) { W.vig._o = vo; W.vig.style.opacity = String(vo / 100); }
    // minimap (HUD only draws it when a world.player exists, so draw it here)
    if ((G.time.frame & 1) === 0 && W.mapCv && G.HUD.cfg.minimap) RU.drawMap(W.mapCv.getContext('2d'), R);
  };

  // ------------------------------------------------------------------ minimap
  function mapXf(T, S) {
    const b = T.bounds, w = b.maxX - b.minX, h = b.maxZ - b.minZ, k = (S - 30) / fmax(w, h);
    return { k, ox: S / 2 - (b.minX + w / 2) * k, oz: S / 2 - (b.minZ + h / 2) * k };
  }
  RU.drawMap = function (g, R) {
    const cv = g.canvas, S = cv.width, T = R.T;
    if (!W) return;
    if (!W.mapBg || W.mapBg._id !== T.id) {
      const c = document.createElement('canvas'); c.width = c.height = S; c._id = T.id;
      const x = c.getContext('2d'), f = mapXf(T, S);
      x.fillStyle = 'rgba(36,26,92,0.55)'; x.fillRect(0, 0, S, S);
      x.lineJoin = 'round'; x.lineCap = 'round';
      const path = () => { x.beginPath(); T.preview.forEach((p, i) => { const px = p[0] * f.k + f.ox, pz = p[1] * f.k + f.oz; if (i) x.lineTo(px, pz); else x.moveTo(px, pz); }); x.closePath(); };
      path(); x.strokeStyle = '#1e1a4d'; x.lineWidth = 9; x.stroke();
      path(); x.strokeStyle = css(T.theme.rail[0]); x.lineWidth = 4.5; x.stroke();
      // checkpoint gates: short white bars across the track (where a tractor beam puts you back)
      W.cpXY = [];
      for (const s of T.cps) {
        const i = Math.floor((s % T.L) / T.ds) % T.N, cx = T.pos[i * 3] * f.k + f.ox, cz = T.pos[i * 3 + 2] * f.k + f.oz;
        let rx = T.right[i * 3], rz = T.right[i * 3 + 2]; const rl = fhyp(rx, rz) || 1; rx /= rl; rz /= rl;
        x.strokeStyle = '#1e1a4d'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx - rx * 6, cz - rz * 6); x.lineTo(cx + rx * 6, cz + rz * 6); x.stroke();
        x.strokeStyle = '#ffffff'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx - rx * 5, cz - rz * 5); x.lineTo(cx + rx * 5, cz + rz * 5); x.stroke();
        W.cpXY.push([cx, cz]);
      }
      // start line
      const p0 = T.preview[0], px = p0[0] * f.k + f.ox, pz = p0[1] * f.k + f.oz;
      x.fillStyle = '#fff'; x.strokeStyle = '#1e1a4d'; x.lineWidth = 2; x.beginPath(); x.rect(px - 4, pz - 4, 8, 8); x.fill(); x.stroke();
      W.mapBg = c; W.mapF = f;
    }
    g.clearRect(0, 0, S, S);
    g.drawImage(W.mapBg, 0, 0);
    const f = W.mapF;
    // the next checkpoint gate pulses mint
    const nx = W.cpXY && R.player && !R.player.finished ? W.cpXY[fmax(0, R.player.cpDone) % W.cpXY.length] : null;
    if (nx) { g.fillStyle = '#7dffc4'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2; g.beginPath(); g.arc(nx[0], nx[1], 3.5 + Math.sin(W.t * 6) * 0.8, 0, Math.PI * 2); g.fill(); g.stroke(); }
    if (R.ghost && R.ghost.mesh.visible && R.ghost.pos) {
      g.strokeStyle = '#7af0ff'; g.lineWidth = 2.5; g.beginPath(); g.arc(R.ghost.pos.x * f.k + f.ox, R.ghost.pos.z * f.k + f.oz, 4, 0, Math.PI * 2); g.stroke();
    }
    for (let i = R.order.length - 1; i >= 0; i--) {
      const r = R.order[i];
      const x = r.wp.x * f.k + f.ox, z = r.wp.z * f.k + f.oz;
      g.beginPath(); g.arc(x, z, r.isPlayer ? 6.5 : 4.5, 0, Math.PI * 2);
      g.fillStyle = r.isPlayer ? '#ffffff' : (r.css || css(r.colors.main)); g.fill();
      g.lineWidth = r.isPlayer ? 3 : 2; g.strokeStyle = r.isPlayer ? '#2ec4b6' : '#1e1a4d'; g.stroke();
    }
  };

  // ------------------------------------------------------------------ results
  RU.results = function (p) {
    const statsOut = p.stats;
    if (G.UI.defs.results) {
      G.UI.open('results', Object.assign({}, p, { mode: 'race', win: p.win, stars: p.stars, stats: statsOut, rewards: p.rewards }));
      return;
    }
    G.UI.open('race-results', p);
  };
  function rewardChips(rw) {
    const out = [];
    if (!rw) return out;
    if (rw.clinks) out.push(el('div.reward', G.UI.money(rw.clinks)));
    if (rw.xp) out.push(el('div.reward', { text: G.t('race.res.xp', { n: rw.xp }) }));
    if (rw.parts) for (const k in rw.parts) if (rw.parts[k]) out.push(el('div.reward', { text: (G.i18n.has('part.' + k) ? G.t('part.' + k) : G.t('race.part.' + k)) + ' ×' + rw.parts[k] }));
    if (rw.lumite) out.push(el('div.reward', { text: G.t('race.res.lumite', { n: rw.lumite }) }));
    return out;
  }
  // Screens use a flat dim instead of the core's backdrop blur (blurring the live WebGL canvas is
  // expensive on phones), like the menus module.
  function defScreen(id, def) {
    const build = def.build;
    G.UI.def(id, Object.assign({}, def, { dim: false, build(p, close, entry) { entry.el.classList.add('rr-dim'); return build.call(this, p, close, entry); } }));
  }
  defScreen('race-results', {
    escClose: false,
    build(p, close) {
      const title = p.timeTrial ? (p.medal ? G.t('race.res.medal', { m: G.t('race.medal.' + p.medal) }) : G.t('race.res.great'))
        : p.place === 1 ? G.t('race.res.win') : p.place <= 3 ? G.t('race.res.place', { n: p.place }) : G.t('race.res.great');
      const kids = [];
      if (!p.timeTrial && p.table) {
        const top = p.table.slice(0, 3), order = [top[1], top[0], top[2]].filter(Boolean);
        kids.push(el('div.rr-podium', order.map(r => el('div' + (r.you ? '.you' : ''),
          el('div', { html: shipIcon(r.style, r.colors), style: { width: '56px', height: '44px' } }),
          el('span', { text: r.name }),
          el('div.st', { text: String(r.place), style: { height: (r.place === 1 ? 54 : r.place === 2 ? 40 : 30) + 'px', background: r.place === 1 ? '#ffc21a' : r.place === 2 ? '#d8e0f0' : '#e0955a' } })))));
      }
      kids.push(el('div.row.center', el('span.rr-stamp', el('i.rr-medal.rr-m' + (p.medal || 0)), el('span', { text: G.t('race.medal.' + (p.medal || 0)) })),
        p.newRecord ? el('span.tag', { text: G.t('race.res.newRecord'), style: { background: 'var(--sun)' } }) : null));
      if (p.table) {
        const fmt = G.Race.fmt;
        kids.push(el('table.rr-table',
          el('tr', ['race.res.pos', 'race.res.pilot', 'race.res.time', 'race.res.lap', 'race.res.gap'].map(k => el('th', { text: G.t(k) }))),
          p.table.map(r => el('tr' + (r.you ? '.you' : ''), el('td', { text: String(r.place) }), el('td', { text: r.name }), el('td', { text: fmt(r.time) }), el('td', { text: fmt(r.bestLap) }), el('td', { text: r.place === 1 ? '—' : '+' + r.gap.toFixed(2) })))));
      }
      kids.push(el('div', (p.stats || []).map(s => el('div.stat', el('span', { text: G.t(s.key) }), el('b', { text: String(s.value) })))));
      kids.push(el('h3', { i18n: 'race.res.rewards', style: { margin: '6px 0 0', font: 'var(--fw-d) 18px var(--f-display)' } }), el('div.reward-list', rewardChips(p.rewards)));
      kids.push(el('p.muted.small.center', { text: G.t('race.tip.' + Math.floor(frand() * 6)), style: { margin: '6px 0 0' } }));
      const go = fn => () => { close(); fn(); };
      const cont = () => G.Game.go(G.Game.modes.hub ? 'hub' : 'title');
      const foot = el('div.row.center',
        G.UI.btn('race.res.retry', go(p.onRetry || cont), 'cool'),
        p.onNext ? G.UI.btn('race.res.next', go(p.onNext), 'grape') : null,
        G.UI.btn('race.res.continue', go(cont), 'primary big'));
      const pnl = G.UI.panel(title, null, kids, { raw: true, foot, style: { maxWidth: '640px' } });
      pnl.classList.add('rr-res');
      return pnl;
    },
  });

  // ------------------------------------------------------------------ Hangar: race select
  // Course name heading with a <wbr> after each '・' (Japanese names join two words with it: "グロウキャップ・ガントレット"),
  // so the name wraps after the dot; with overflow-wrap: normal for ja in the CSS above, a first word a hair wider than
  // the card no longer gets cut before the dot (a line never starts with '・')
  function trackName(id) {
    const s = G.t('race.track.' + id), h = el('h3');
    const parts = s.split('・');
    for (let i = 0; i < parts.length; i++) {
      const last = i === parts.length - 1;
      h.appendChild(document.createTextNode(last ? parts[i] : parts[i] + '・'));
      if (!last) h.appendChild(document.createElement('wbr'));
    }
    return h;
  }
  // Course names keep their words whole: a word wider than its card (de "Korallen-Kometenschleife" on a desktop card)
  // was cut by the anywhere-break fallback ("Kometenschleif" / "e"). A name the fallback cuts (it takes more lines with
  // the fallback than without: the fallback only acts on a word that would overflow) is drawn a little smaller, never
  // under 11 px nor above its own size, until no word is cut. If even 11 px is too wide, it keeps its size and the cut.
  // Runs when the screen is built and on resize (a few layout passes per card, menus only).
  const _fitRg = document.createRange();
  const nameLines = h => {
    _fitRg.selectNodeContents(h);
    const rs = _fitRg.getClientRects();
    let n = 0, top = -1e9;
    for (let i = 0; i < rs.length; i++) if (rs[i].width > 0 && rs[i].top > top + 1) { n++; top = rs[i].top; }
    return n;
  };
  const nameCut = h => { const a = nameLines(h); h.style.overflowWrap = 'normal'; const b = nameLines(h); h.style.overflowWrap = ''; return a > b; };
  function fitNames(root) {
    if (!root || !root.isConnected) return;
    const hs = root.querySelectorAll('.rr-tcard h3');
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i];
      h.style.fontSize = '';
      if (!h.offsetWidth || !nameCut(h)) continue;
      // first guess: scaled by the widest unbreakable run (measured with the fallback off) over the card's text width
      const cs = getComputedStyle(h), fs = parseFloat(cs.fontSize), lo = fmin(fs, 11);
      h.style.overflowWrap = 'normal';
      _fitRg.selectNodeContents(h);
      const sc = h.getBoundingClientRect().width / h.offsetWidth, wd = _fitRg.getBoundingClientRect().width / (sc || 1);
      const avail = h.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      h.style.overflowWrap = '';
      let f = Math.floor(fs * (wd > avail ? avail / wd : 1) * 10) / 10, ok = false;
      for (let n = 0; n < 5 && f >= lo; n++) {
        h.style.fontSize = f + 'px';
        if (!nameCut(h)) { ok = true; break; }
        f = Math.round((f - 0.3) * 10) / 10;
      }
      if (!ok) h.style.fontSize = '';
    }
  }
  function prevCanvas(id, theme) {
    const c = document.createElement('canvas'); c.width = 240; c.height = 100;
    try {
      const pv = G.Race.preview(id), b = pv.bounds, x = c.getContext('2d');
      const w = b.maxX - b.minX, h = b.maxZ - b.minZ, k = fmin((c.width - 20) / w, (c.height - 16) / h);
      const ox = c.width / 2 - (b.minX + w / 2) * k, oz = c.height / 2 - (b.minZ + h / 2) * k;
      const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, css(theme.sky.top)); g.addColorStop(1, css(theme.sky.horizon));
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 24; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.3 + frand() * 0.5) + ')'; x.fillRect(frand() * c.width, frand() * c.height, 1.5, 1.5); }
      const path = () => { x.beginPath(); pv.pts.forEach((p, i) => { const px = p[0] * k + ox, pz = p[1] * k + oz; if (i) x.lineTo(px, pz); else x.moveTo(px, pz); }); x.closePath(); };
      x.lineJoin = 'round'; path(); x.strokeStyle = INK; x.lineWidth = 8; x.stroke(); path(); x.strokeStyle = css(theme.rail[0]); x.lineWidth = 4; x.stroke();
      const p0 = pv.pts[0]; x.fillStyle = '#fff'; x.strokeStyle = INK; x.lineWidth = 2; x.beginPath(); x.arc(p0[0] * k + ox, p0[1] * k + oz, 4.5, 0, Math.PI * 2); x.fill(); x.stroke();
    } catch (e) { /* preview is cosmetic */ }
    return c;
  }
  function selState() {
    const prof = G.Save && G.Save.data ? G.Save.prof : null;
    const rs = prof ? (prof.race = prof.race || {}) : {};
    const s = rs.sel || (rs.sel = { t: 'coral_loop', s: 'arrow', m: 'grandprix', c: 'breeze' });
    if (!G.Race.isTrackUnlocked(s.t)) s.t = 'coral_loop';
    return { rs, s };
  }
  function checkMore(pb) { if (pb && pb.isConnected) pb.classList.toggle('rr-more', pb.scrollHeight - pb.scrollTop - pb.clientHeight > 4); }
  const recheckMore = () => requestAnimationFrame(() => { const st = document.querySelector('.rr-sel .rr-tracks'); if (st) fitNames(st); checkMore(document.querySelector('.rr-sel .panel-body')); if (st) st.dispatchEvent(new Event('scroll')); });
  G.bus.on('resize', recheckMore); G.bus.on('screen', recheckMore);
  // (a web font that arrives after the screen was built changes the name widths: fit them again)
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', recheckMore);
  function unlockedClasses() { return Object.keys(G.Race.CLASSES).filter(c => G.Race.isClassUnlocked(c)); }
  defScreen('race-select', {
    build(params, close, entry) {
      injectCSS();
      const { rs, s } = selState();
      if (params && params.track && G.Race.isTrackUnlocked(params.track)) s.t = params.track;
      const refresh = () => { G.Save.save(); G.UI.refresh(entry); };
      const tabs = el('div.tabs',
        el('button.tab' + (s.m === 'grandprix' ? '.on' : ''), { type: 'button', i18n: 'race.gp', onclick: () => { s.m = 'grandprix'; refresh(); } }),
        el('button.tab' + (s.m === 'timetrial' ? '.on' : ''), { type: 'button', i18n: 'race.tt', onclick: () => { s.m = 'timetrial'; refresh(); } }));
      // GDD: auto-steer comes with the Easy preset, until the player flips the toggle themselves
      const assistOn = (rs.assist || (G.Save.set && G.Save.set.preset === 'easy' ? 'auto' : 'standard')) === 'auto';
      const tog = el('div.toggle' + (assistOn ? '.on' : ''), { role: 'switch', 'aria-checked': String(assistOn), tabindex: '0', onclick: () => { rs.assist = assistOn ? 'standard' : 'auto'; refresh(); } });
      const classes = unlockedClasses();
      const opts = el('div.rr-opts', tabs, el('span', { style: { flex: '1' } }),
        el('label.row', { style: { gap: '6px', font: '800 13px var(--f-body)' }, title: G.t('race.select.assistHint') }, el('span', { i18n: 'race.select.assist' }), tog),
        classes.length > 1 ? el('div.tabs', classes.map(c => el('button.tab' + (s.c === c ? '.on' : ''), { type: 'button', i18n: 'race.class.' + c, onclick: () => { s.c = c; refresh(); } }))) : null);
      if (!classes.includes(s.c)) s.c = 'breeze';
      // tracks
      const cards = G.Race.allTracks().map(d => {
        const unlocked = G.Race.isTrackUnlocked(d.id);
        const rec = G.Race.record(d.id, s.c);
        const theme = G.Race.THEMES[d.theme] || G.Race.THEMES.coral;
        const lockTxt = d.pr ? G.t('race.select.lockedPr', { n: d.pr }) : G.t('race.select.locked', { n: d.star });
        const card = el('div.card.rr-tcard' + (unlocked ? '.clickable' : '.locked') + (s.t === d.id ? '.sel' : ''), {
          onclick: unlocked ? () => { s.t = d.id; refresh(); } : null,
        },
        prevCanvas(d.id, theme),
        el('div.rr-tx',
          trackName(d.id),
          el('div.rr-meta',
            unlocked ? el('span' + (rec && rec.b ? '' : '.rr-nb'), { text: rec && rec.b ? G.t('race.select.best', { t: G.Race.fmt(rec.b) }) : (d.daily ? G.t('race.select.daily') : G.t('race.select.noBest')) }) : (() => { const t = el('span.tag', { html: LOCK }); t.appendChild(document.createTextNode(lockTxt)); return t; })(),
            el('i.rr-medal.rr-m' + (rec && rec.m ? rec.m : 0)))));
        return card;
      });
      // ships
      const ships = G.Race.SHIPS.map(st => {
        const ok = G.Race.isShipUnlocked(st);
        return el('div.card.rr-scard' + (ok ? '.clickable' : '.locked') + (s.s === st ? '.sel' : ''), { onclick: ok ? () => { s.s = st; refresh(); } : null },
          el('div', { html: shipIcon(st, G.Race.playerColors()) }), el('h3', { text: G.t('race.ship.' + st) }));
      });
      // footer info
      let info = '';
      try {
        const m = G.Race.medalTimes(s.t, s.c);
        info = G.t('race.select.targets', { g: G.Race.fmt(m.gold), s: G.Race.fmt(m.silver), b: G.Race.fmt(m.bronze) });
        const rec = G.Race.record(s.t, s.c);
        if (rec && rec.m >= 3) info = G.t('race.medal.4') + ' ' + G.Race.fmt(m.platinum) + ' · ' + info;
        if (s.m === 'timetrial' && rec && rec.g) info += ' · ' + G.t('race.select.ghost');
      } catch (e) { info = ''; }
      let going = false;
      const start = G.UI.btn('race.select.start', () => {
        if (going) return;                 // a double tap must not load the race twice
        going = true;
        G.Save.save();
        close();
        G.Game.go('race', { track: s.t, ship: s.s, mode: s.m, laps: 3, cls: s.c, assist: assistOn ? 'auto' : 'standard' });
      }, 'go big');
      // auto-steer flies a slightly slower line: say so where players can see it (the label tooltip is
      // invisible on touch screens)
      const foot = el('div.rr-foot', el('div.rr-info', el('div', { text: info }), assistOn ? el('div.rr-assist', { text: G.t('race.select.assistOn') }) : null), start);
      const body = [el('h3', { i18n: 'race.select.course' }), el('div.rr-tracks', cards), el('h3', { i18n: 'race.select.ship' }), el('div.rr-ships', ships)];
      // first-time "how it works" strip (GDD lobby card): until the first race is on record
      // (short one-line labels on phones, so the Skiff row still fits on one 844×390 screen)
      if (!rs.rec || !Object.keys(rs.rec).length) body.unshift(el('div.rr-how', [['1', G.Input.ICONS.boost], ['2', DRIFT_SVG], ['3', ITEM_SVG.turbo]].map(([n, ic]) =>
        el('div', el('b', { text: n }), el('span.rr-hi', { html: ic }), el('span.rr-hl', { i18n: 'race.how.' + n }), el('span.rr-hs', { i18n: 'race.how.s' + n })))));
      // a short frame (568×320 … 844×390) scrolls the options row away with the body: the course and Skiff cards keep
      // their full size instead of being squeezed into what is left between the options row and the footer
      // (the course row comes first there: it is the choice made most, so it is whole on the first view even at XL text)
      const short = document.documentElement.classList.contains('gh-short');
      if (short) {
        const pick = cls => { const i = body.findIndex(n => n && n.classList && n.classList.contains(cls)); return i >= 0 ? body.splice(i, 1)[0] : null; };
        const tr = pick('rr-tracks'), how = pick('rr-how');
        for (let i = body.length - 1; i >= 0; i--) if (body[i] && body[i].tagName === 'H3') body.splice(i, 1);   // (headings hidden there anyway)
        body.unshift(tr, opts); if (how) body.splice(2, 0, how);      // courses, options, first-visit tips, skiffs
      }
      const p = G.UI.panel('race.select.title', close, body, { top: short ? null : opts, foot, icon: shipIcon(s.s) });
      p.classList.add('rr-sel');
      // If the body still scrolls (small or odd-sized windows), fade its bottom edge so it reads as "more below"
      const pb = p.querySelector('.panel-body');
      pb.addEventListener('scroll', () => checkMore(pb), { passive: true });
      requestAnimationFrame(() => checkMore(pb));
      // the course row scrolls sideways on short frames: keep where it was across a rebuild (every pick rebuilds the
      // panel), bring the picked course into view and fade the edge that has more courses behind it
      const strip = p.querySelector('.rr-tracks');
      const edges = () => {
        const more = strip.scrollWidth - strip.clientWidth;
        strip.style.setProperty('--rr-fl', more > 2 && strip.scrollLeft > 4 ? '22px' : '0px');
        strip.style.setProperty('--rr-fr', more > 2 && strip.scrollLeft < more - 4 ? '26px' : '0px');
      };
      strip.addEventListener('scroll', () => { entry._rrX = strip.scrollLeft; edges(); }, { passive: true });
      queueMicrotask(() => {
        if (!strip.isConnected) return;
        fitNames(strip);
        if (strip.scrollWidth > strip.clientWidth + 2) {
          strip.scrollLeft = entry._rrX || 0;
          const sel = strip.querySelector('.rr-tcard.sel');
          if (sel) {
            const a = sel.offsetLeft - 6, b = sel.offsetLeft + sel.offsetWidth + 6 - strip.clientWidth;
            if (strip.scrollLeft > a) strip.scrollLeft = a; else if (strip.scrollLeft < b) strip.scrollLeft = b;
          }
          entry._rrX = strip.scrollLeft;
        }
        edges();
      });
      return p;
    },
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 23b_race_ui.js]', e); }
// ---- 24_turf.js
try { (function () {
// 24_turf.js — GOO TURF (4v4 goo-painting battle vs bots). Part 1: strings, data tables, helpers.
// Module layout (all share the G.Turf namespace):
//   24_turf.js        strings (en + ja), turf weapon/sub/special tables, team colours, names, CSS, helpers
//   24b_turf_paint.js paint system: CPU owner grid (0.5 m cells) + top-down paint render target + floor shader
//   24c_turf_arena.js hand-built symmetric arenas (Plaza Pier, Coral Court), colliders, props
//   24d_turf_gear.js  fallback goo weapons + viewmodel, sub weapons and specials runtime
//   24e_turf_bots.js  navgrid (A*), ranger visuals, TurfBot utility AI
//   24f_turf_mode.js  the 'turf' mode: match flow, Goo Dive, HUD, judging, results
//   24g_turf_lobby.js the 'turf-lobby' screen
// Public: G.Game.go('turf', {arena, weapon, sub, special, teamColors, quick, matchTime});
//         G.UI.open('turf-lobby'); G.Turf.state() (debug snapshot).
(function (G) {
  'use strict';
  const T = G.Turf = G.Turf || {};

  G.i18n.add('en', {
    'turf.title': 'Goo Turf', 'turf.tagline': 'Paint the most floor before time runs out!',
    'turf.arena.plaza': 'Plaza Pier', 'turf.arena.coral': 'Coral Court', 'turf.arena.random': 'Surprise me!',
    'turf.col.tangerine': 'Tangerine', 'turf.col.azure': 'Azure', 'turf.col.lemon': 'Lemon', 'turf.col.grape': 'Grape', 'turf.col.pink': 'Hot Pink', 'turf.col.teal': 'Teal',
    'turf.team': 'Team {color}', 'turf.vs': 'VS', 'turf.you': 'You', 'turf.botName': '{adj} {animal}', 'turf.botTag': 'Bot',
    'turf.adj.0': 'Zippy', 'turf.adj.1': 'Bubbly', 'turf.adj.2': 'Fuzzy', 'turf.adj.3': 'Sunny', 'turf.adj.4': 'Bouncy', 'turf.adj.5': 'Sparkly',
    'turf.adj.6': 'Jolly', 'turf.adj.7': 'Peppy', 'turf.adj.8': 'Snappy', 'turf.adj.9': 'Giggly', 'turf.adj.10': 'Comfy', 'turf.adj.11': 'Breezy',
    'turf.animal.0': 'Otter', 'turf.animal.1': 'Puffin', 'turf.animal.2': 'Gecko', 'turf.animal.3': 'Panda', 'turf.animal.4': 'Koala', 'turf.animal.5': 'Turtle',
    'turf.animal.6': 'Hamster', 'turf.animal.7': 'Penguin', 'turf.animal.8': 'Narwhal', 'turf.animal.9': 'Bunny', 'turf.animal.10': 'Seal', 'turf.animal.11': 'Fox',
    'turf.skip': 'Tap to skip', 'turf.ready': 'Ready?', 'turf.go': 'GO!', 'turf.oneMin': '1 MINUTE LEFT!', 'turf.timeUp': "TIME'S UP!",
    'turf.judging': 'Tick & Tock are counting the goo…', 'turf.tick': 'Tick', 'turf.tock': 'Tock', 'turf.wins': '{team} wins!',
    'turf.victory': 'Victory!', 'turf.greatTry': 'Great try!',
    'turf.dive': 'Dive', 'turf.sub': 'Sub', 'turf.special': 'Special', 'turf.spReady': 'Special ready!', 'turf.low': 'LOW',
    'turf.noInk': 'Not enough goo!', 'turf.diveHint': 'Dive works only on your own color!', 'turf.thisWay': 'This way!',
    'turf.koBy': 'Bonked by {name}!', 'turf.koSelf': 'Bonked!', 'turf.backIn': 'Back in {n}…', 'turf.relaunch': 'Relaunching!',
    'turf.feed.ko': '{a} bonked {b}!', 'turf.feed.sp': '{name}: {special}!',
    'turf.keys': 'Shift or C: Dive · G: Sub · Q or R: Special · X: This way!',
    'turf.barrier': 'Spawn barrier! Back off!', 'turf.enemyGoo': 'Sticky goo!',
    'turf.sub.bubble': 'Bubble Bomb', 'turf.sub.bubble.d': 'Sticks, then bursts after 1 second. Big splash!',
    'turf.sub.pop': 'Pop Bomb', 'turf.sub.pop.d': 'Bursts the moment it lands. Cheap and quick.',
    'turf.sub.sprinkler': 'Goo Sprinkler', 'turf.sub.sprinkler.d': 'Sticks anywhere and sprays goo for 10 seconds.',
    'turf.sp.storm': 'Goo Storm', 'turf.sp.storm.d': 'Throw a raincloud that drifts along and paints a wide strip.',
    'turf.sp.splash': 'Mega Splashdown', 'turf.sp.splash.d': 'Leap up and slam down for a giant splash.',
    'turf.sp.triple': 'Triple Splash', 'turf.sp.triple.d': 'Lob three mega-blobs, one after another.',
    'turf.lobby.title': 'Goo Turf', 'turf.lobby.weapon': 'Goo gear', 'turf.lobby.sub': 'Sub weapon', 'turf.lobby.special': 'Special',
    'turf.lobby.arena': 'Arena', 'turf.lobby.length': 'Match length', 'turf.lobby.std': 'Standard 3:00', 'turf.lobby.quick': 'Quick 2:00',
    'turf.lobby.colors': 'Team colors', 'turf.lobby.colorLock': 'Color Lock', 'turf.lobby.lockHint': 'Off: a new color pair every match.',
    'turf.lobby.cbNote': 'Colorblind mode is on: classic colors plus stripes and dots.', 'turf.lobby.start': 'Start!',
    'turf.lobby.difficulty': 'Bot skill', 'turf.lobby.locked': 'Craft it in the Workshop', 'turf.lobby.free': 'Loaner',
    'turf.lobby.how1': 'Paint the floor with goo. Most turf wins!', 'turf.lobby.how2': 'Hold Dive on your color to swim fast and refill.',
    'turf.lobby.how3': 'Painting charges your Special. Unleash it!', 'turf.lobby.teams': 'You + 3 bots vs 4 bots',
    'turf.stat.hits': 'Hits to bonk', 'turf.stat.ink': 'Goo use', 'turf.stat.paint': 'Painting', 'turf.stat.range': 'Range', 'turf.cost': '{n}% goo',
    'turf.res.title': 'Goo Turf results', 'turf.res.inked': 'Turf inked', 'turf.res.m2': '{n} m²', 'turf.res.points': 'Turf points',
    'turf.res.pops': 'Pops', 'turf.res.kos': 'Times bonked', 'turf.res.specials': 'Specials used', 'turf.res.cover': 'Team coverage',
    'turf.res.pct': '{n}%', 'turf.res.bonus': 'Win bonus', 'turf.res.again': 'Play again', 'turf.res.lobby': 'Lobby', 'turf.res.medals': 'Medals',
    'turf.medal.painter': 'Top Painter', 'turf.medal.enemy': 'Most Enemy Turf', 'turf.medal.splash': 'Splashdown Star', 'turf.medal.popper': 'Pop Star',
    'turf.rw.clinks': '{n} Clinks', 'turf.rw.xp': '{n} XP', 'turf.rw.gel': 'Goo Gel ×{n}',
    'turf.tip.0': 'Dive in your own goo to refill your tank super fast!', 'turf.tip.1': 'Enemy goo is sticky and slow. Paint over it to break free!',
    'turf.tip.2': 'Painting charges your Special. Paint, paint, paint!', 'turf.tip.3': 'Swimming in goo makes you almost invisible. Sneak up!',
    'turf.wpn.splat': 'Goo Splatter', 'turf.wpn.roller': 'Wide Roller', 'turf.wpn.fizz': 'Fizz Blaster', 'turf.wpn.scatter': 'Pop Scatter',
    'turf.wpn.lobber': 'Bubble Lobber', 'turf.wpn.zap': 'Zap Coil', 'turf.wpn.saw': 'Saw Skipper', 'turf.wpn.lancer': 'Beam Lancer',
    'turf.wpn.gatling': 'Gale Gatling', 'turf.wpn.swarm': 'Confetti Swarm', 'turf.wpn.chill': 'Chill Mister',
  });
  G.i18n.add('ja', {
    'turf.title': 'グーターフ', 'turf.tagline': 'じかん内に いちばん広く ぬったチームのかち！',
    'turf.arena.plaza': 'プラザ・ピア', 'turf.arena.coral': 'コーラル・コート', 'turf.arena.random': 'おまかせ！',
    'turf.col.tangerine': 'オレンジ', 'turf.col.azure': 'ブルー', 'turf.col.lemon': 'レモン', 'turf.col.grape': 'グレープ', 'turf.col.pink': 'ピンク', 'turf.col.teal': 'ミント',
    'turf.team': 'チーム{color}', 'turf.vs': 'VS', 'turf.you': 'キミ', 'turf.botName': '{adj}{animal}', 'turf.botTag': 'ボット',
    'turf.adj.0': 'ピュンピュン', 'turf.adj.1': 'ぷくぷく', 'turf.adj.2': 'もふもふ', 'turf.adj.3': 'ぽかぽか', 'turf.adj.4': 'ぴょんぴょん', 'turf.adj.5': 'キラキラ',
    'turf.adj.6': 'ニコニコ', 'turf.adj.7': 'わくわく', 'turf.adj.8': 'シャキシャキ', 'turf.adj.9': 'ケラケラ', 'turf.adj.10': 'ふわふわ', 'turf.adj.11': 'そよそよ',
    'turf.animal.0': 'ラッコ', 'turf.animal.1': 'パフィン', 'turf.animal.2': 'ヤモリ', 'turf.animal.3': 'パンダ', 'turf.animal.4': 'コアラ', 'turf.animal.5': 'カメ',
    'turf.animal.6': 'ハムスター', 'turf.animal.7': 'ペンギン', 'turf.animal.8': 'イッカク', 'turf.animal.9': 'ウサギ', 'turf.animal.10': 'アザラシ', 'turf.animal.11': 'キツネ',
    'turf.skip': 'タップでスキップ', 'turf.ready': 'よーい…', 'turf.go': 'スタート！', 'turf.oneMin': 'のこり1分！', 'turf.timeUp': 'しゅうりょう！',
    'turf.judging': 'チックとタックが グーを数えているよ…', 'turf.tick': 'チック', 'turf.tock': 'タック', 'turf.wins': '{team}のかち！',
    'turf.victory': 'かち！', 'turf.greatTry': 'ナイスファイト！',
    'turf.dive': 'ダイブ', 'turf.sub': 'サブ', 'turf.special': 'スペシャル', 'turf.spReady': 'スペシャル つかえるよ！', 'turf.low': 'ピンチ',
    'turf.noInk': 'グーが たりない！', 'turf.diveHint': 'ダイブは じぶんの色の上だけ！', 'turf.thisWay': 'こっちだ！',
    'turf.koBy': '{name}に やられた！', 'turf.koSelf': 'やられた！', 'turf.backIn': 'あと{n}びょうで ふっかつ…', 'turf.relaunch': 'ふっかつ！',
    'turf.feed.ko': '{a}が {b}を ノックアウト！', 'turf.feed.sp': '{name}：{special}！',
    'turf.keys': 'Shift か C：ダイブ・G：サブ・Q か R：スペシャル・X：こっちだ！',
    'turf.barrier': 'あいてのスタート地点だよ！ もどって！', 'turf.enemyGoo': 'ベタベタ グー！',
    'turf.sub.bubble': 'バブルボム', 'turf.sub.bubble.d': 'くっついて 1びょう後に ドカン！ 大きく ぬれる。',
    'turf.sub.pop': 'ポップボム', 'turf.sub.pop.d': 'ついた しゅんかんに はじける。グーが少なくて すむ。',
    'turf.sub.sprinkler': 'グースプリンクラー', 'turf.sub.sprinkler.d': 'どこにでも くっついて 10びょう グーを まきちらす。',
    'turf.sp.storm': 'グーストーム', 'turf.sp.storm.d': 'あまぐもを なげると ゆっくり 進みながら 広く ぬるよ。',
    'turf.sp.splash': 'メガスプラッシュダウン', 'turf.sp.splash.d': 'ジャンプして ドシーン！ まわりを 大きく ぬる。',
    'turf.sp.triple': 'トリプルスプラッシュ', 'turf.sp.triple.d': 'でっかい グーだまを 3つ つづけて なげる。',
    'turf.lobby.title': 'グーターフ', 'turf.lobby.weapon': 'ぶき', 'turf.lobby.sub': 'サブ', 'turf.lobby.special': 'スペシャル',
    'turf.lobby.arena': 'ステージ', 'turf.lobby.length': 'じかん', 'turf.lobby.std': 'ふつう 3:00', 'turf.lobby.quick': 'ショート 2:00',
    'turf.lobby.colors': 'チームカラー', 'turf.lobby.colorLock': 'カラーロック', 'turf.lobby.lockHint': 'オフにすると まいかい 色が かわるよ。',
    'turf.lobby.cbNote': '色覚サポートがオン：きほんの色＋しまもようと水玉もよう。', 'turf.lobby.start': 'スタート！',
    'turf.lobby.difficulty': 'ボットのつよさ', 'turf.lobby.locked': 'ワークショップで つくろう', 'turf.lobby.free': 'レンタル',
    'turf.lobby.how1': 'ゆかを グーで ぬろう。たくさん ぬったら かち！', 'turf.lobby.how2': 'じぶんの色の上で ダイブを おすと はやく泳げて グーも回復！',
    'turf.lobby.how3': 'ぬると スペシャルが たまる。ドーンと つかおう！', 'turf.lobby.teams': 'キミ＋ボット3人 VS ボット4人',
    'turf.stat.hits': 'ノックアウトまで', 'turf.stat.ink': 'グーしょうひ', 'turf.stat.paint': 'ぬりパワー', 'turf.stat.range': 'しゃてい', 'turf.cost': 'グー{n}%',
    'turf.res.title': 'グーターフ けっか', 'turf.res.inked': 'ぬった広さ', 'turf.res.m2': '{n} m²', 'turf.res.points': 'ぬりポイント',
    'turf.res.pops': 'ノックアウトした数', 'turf.res.kos': 'やられた数', 'turf.res.specials': 'スペシャル', 'turf.res.cover': 'チームのぬり',
    'turf.res.pct': '{n}%', 'turf.res.bonus': 'かちボーナス', 'turf.res.again': 'もう一回', 'turf.res.lobby': 'ロビー', 'turf.res.medals': 'メダル',
    'turf.medal.painter': 'ぬりぬり名人', 'turf.medal.enemy': 'てきじん ぬり名人', 'turf.medal.splash': 'スプラッシュスター', 'turf.medal.popper': 'ポップスター',
    'turf.rw.clinks': '{n} クリンク', 'turf.rw.xp': '{n} XP', 'turf.rw.gel': 'グージェル ×{n}',
    'turf.tip.0': 'じぶんのグーで ダイブすると グーが すぐ たまるよ！', 'turf.tip.1': 'あいてのグーは ベタベタ。上から ぬって ぬけだそう！',
    'turf.tip.2': 'ぬると スペシャルが たまる。どんどん ぬろう！', 'turf.tip.3': 'グーの中を泳ぐと ほとんど 見えなくなるよ。こっそり 近づこう！',
    'turf.wpn.splat': 'グースプラッター', 'turf.wpn.roller': 'ワイドローラー', 'turf.wpn.fizz': 'フィズブラスター', 'turf.wpn.scatter': 'ポップスキャッター',
    'turf.wpn.lobber': 'バブルロッバー', 'turf.wpn.zap': 'ザップコイル', 'turf.wpn.saw': 'ソースキッパー', 'turf.wpn.lancer': 'ビームランサー',
    'turf.wpn.gatling': 'ゲイルガトリング', 'turf.wpn.swarm': 'コンフェッティスウォーム', 'turf.wpn.chill': 'チルミスター',
  });

  // ------------------------------------------------------------------ core numbers (GDD §11c)
  T.MATCH_TIME = 180;          // standard match (quick = 120)
  T.SPECIAL_COST = 200;        // points (GDD: 1 per newly painted cell)
  T.SPECIAL_GAIN = 0.22;       // tuning: our goo paints ~4× faster than the GDD assumed → ~1 special per 900 cells (≈20–35 s)
  T.RUSH_GAIN = 1.5;           // final minute "Goo Rush": Specials charge 1.5× faster for every ranger (both teams) → more late swings
  T.RESPAWN = 5;               // 2.5 s KO cam + 2.5 s relaunch
  T.SWIM_SPEED = 10;           // Goo Dive m/s
  T.CLIMB_SPEED = 6;           // up own-colour walls
  T.ENEMY_GOO_SPEED = 1.8;     // m/s in enemy goo
  T.ENEMY_GOO_DPS = 18; T.ENEMY_GOO_CAP = 40;
  T.REFILL = 10; T.REFILL_SWIM = 35;          // tank %/s
  T.REGEN_DELAY = 1.0; T.REGEN = 20; T.REGEN_SWIM = 60;
  T.BARRIER_DPS = 50;
  T.CELL_M2 = 0.25;

  // Team colour pairs (GDD §2.4). Team A is always the player's team.
  T.PAIRS = [
    { id: 'lock', a: 0xff8a1f, b: 0x2f7bff, an: 'turf.col.tangerine', bn: 'turf.col.azure' },
    { id: 'alt1', a: 0xffd21f, b: 0x8a3ffc, an: 'turf.col.lemon', bn: 'turf.col.grape' },
    { id: 'alt2', a: 0xff4fa3, b: 0x12c2b0, an: 'turf.col.pink', bn: 'turf.col.teal' },
  ];
  T.colorLock = () => !G.Save.set || G.Save.set.turfColorLock !== false;
  // -> {a, b, an, bn, pattern, pair}. teamColors may be a pair id, [a, b] or {a, b}.
  T.pickColors = function (teamColors) {
    const s = G.Save.set || {};
    const cb = !!s.colorblind;
    let pair = T.PAIRS[0];
    if (!cb) {
      if (typeof teamColors === 'string') pair = T.PAIRS.find(p => p.id === teamColors) || pair;
      else if (Array.isArray(teamColors) && teamColors.length >= 2) pair = { id: 'custom', a: teamColors[0], b: teamColors[1], an: 'turf.col.tangerine', bn: 'turf.col.azure' };
      else if (teamColors && teamColors.a != null) pair = Object.assign({ id: 'custom', an: 'turf.col.tangerine', bn: 'turf.col.azure' }, teamColors);
      else if (!T.colorLock()) pair = T.PAIRS[Math.floor(Math.random() * T.PAIRS.length)];
    }
    return { a: pair.a, b: pair.b, an: pair.an, bn: pair.bn, pattern: cb || !!s.inkPatterns, pair: pair.id };
  };
  T.css = h => '#' + (h >>> 0 & 0xffffff).toString(16).padStart(6, '0');
  T.shade = function (hex, f) {
    const ch = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(c => Math.max(0, Math.min(255, Math.round(f >= 1 ? c + (255 - c) * (f - 1) : c * f))));
    return (ch[0] << 16) | (ch[1] << 8) | ch[2];
  };

  // ------------------------------------------------------------------ turf weapons (GDD §5.3 + fallback firing params)
  // dmg = turf damage per hit (vs 100 HP), cost = tank % per shot (or per tick / per second), refill = refill delay (s),
  // paint = impact paint radius (m), drop/dropEvery = trail droplets, special = kit special. Remaining keys drive the
  // fallback weapon when G.Weapons has no turf support.
  T.WEAPONS = {
    splat: { kind: 'shooter', dmg: 34, hits: 3, cost: 0.9, refill: 0.25, paint: 0.9, drop: 0.35, dropEvery: 1.5, special: 'storm', rate: 8, speed: 40, grav: 6, spread: 4, range: 18, paintPow: 0.9, size: 0.15 },
    roller: { kind: 'roller', dmg: 120, flick: [35, 120], hits: 1, cost: 8, rollCost: 6, refill: 0.5, paint: 0.8, strip: 2.4, special: 'splash', rate: 1.2, speed: 18, grav: 12, range: 8, paintPow: 1.0, size: 0.2 },
    fizz: { kind: 'shooter', dmg: 25, hits: 4, cost: 1.2, refill: 0.3, paint: 0.6, drop: 0.3, dropEvery: 2, special: 'storm', rate: 5, speed: 60, grav: 3, spread: 1.2, range: 30, paintPow: 0.55, size: 0.13 },
    scatter: { kind: 'pellet', dmg: 12, pellets: 8, hits: 2, cost: 6, refill: 0.5, paint: 0.45, special: 'splash', rate: 1.25, speed: 42, grav: 9, spread: 7, range: 12, paintPow: 0.7, size: 0.11 },
    lobber: { kind: 'lob', dmg: 100, splash: 60, hits: 1, cost: 9, refill: 0.6, paint: 2.2, special: 'triple', rate: 1.4, speed: 20, grav: 18, range: 22, paintPow: 0.8, size: 0.28 },
    zap: { kind: 'beam', dmg: 7, hits: 15, cost: 1, refill: 0.4, paint: 0.35, special: 'storm', rate: 10, range: 16, paintPow: 0.5 },
    saw: { kind: 'shooter', dmg: 40, hits: 3, cost: 5, refill: 0.5, paint: 0.8, drop: 0.3, dropEvery: 1.2, special: 'triple', rate: 1.6, speed: 26, grav: 0, spread: 0, range: 25, bounce: 2, paintPow: 0.6, size: 0.22, disc: true },
    lancer: { kind: 'charger', dmg: 160, min: 40, hits: 1, cost: 18, tapCost: 4, refill: 0.6, paint: 0.5, line: 25, special: 'triple', range: 40, charge: 0.9, paintPow: 0.55 },
    gatling: { kind: 'shooter', dmg: 12, hits: 9, cost: 0.7, refill: 0.6, paint: 0.4, special: 'splash', rate: 14, speed: 55, grav: 4, spread: 3.5, range: 28, spin: 0.6, paintPow: 0.75, size: 0.11 },
    swarm: { kind: 'rocket', dmg: 35, splash: 15, hits: 2, cost: 8, refill: 0.7, paint: 1.6, special: 'triple', rate: 2.5, speed: 22, grav: 2, range: 40, paintPow: 0.6, size: 0.2 },
    chill: { kind: 'mist', dmg: 5, hits: 20, cost: 1, refill: 0.4, paint: 0.5, special: 'storm', rate: 10, range: 10, paintPow: 0.8 },
  };
  T.WEAPON_ORDER = ['splat', 'roller', 'fizz', 'scatter', 'lobber', 'zap', 'saw', 'lancer', 'gatling', 'swarm', 'chill'];
  T.FREE_WEAPONS = ['splat', 'roller', 'fizz'];   // loaner kits: always playable in Turf
  T.SUBS = {
    bubble: { cost: 70, nameKey: 'turf.sub.bubble', descKey: 'turf.sub.bubble.d' },
    pop: { cost: 40, nameKey: 'turf.sub.pop', descKey: 'turf.sub.pop.d' },
    sprinkler: { cost: 60, nameKey: 'turf.sub.sprinkler', descKey: 'turf.sub.sprinkler.d' },
  };
  T.SUB_ORDER = ['bubble', 'pop', 'sprinkler'];
  T.SPECIALS = {
    storm: { nameKey: 'turf.sp.storm', descKey: 'turf.sp.storm.d' },
    splash: { nameKey: 'turf.sp.splash', descKey: 'turf.sp.splash.d' },
    triple: { nameKey: 'turf.sp.triple', descKey: 'turf.sp.triple.d' },
  };
  T.SPECIAL_ORDER = ['storm', 'splash', 'triple'];
  // Bot skill per difficulty (GDD §11c): aim error (deg), reaction (s), damage multiplier for rival bots.
  T.DIFF = {
    breezy: { aim: 9, react: 0.9, dmg: 0.6, turn: 5 },
    normal: { aim: 5, react: 0.55, dmg: 1.0, turn: 7 },
    spicy: { aim: 3, react: 0.4, dmg: 1.0, turn: 9 },
    blazing: { aim: 1.8, react: 0.3, dmg: 1.0, turn: 11 },
  };
  T.diff = () => T.DIFF[(G.Save.set && G.Save.set.difficulty) || 'normal'] || T.DIFF.normal;

  // Turf stats for a weapon id: GDD table merged with G.Weapons.turfDefs[id] when the weapons module provides it.
  T.stats = function (id) {
    const base = T.WEAPONS[id] || T.WEAPONS.splat;
    const td = G.Weapons && G.Weapons.turfDefs && G.Weapons.turfDefs[id];
    const dd = G.Data && G.Data.TURF_WEAPONS && G.Data.TURF_WEAPONS[id];
    if (!td && !dd) return base;
    const out = Object.assign({}, base);
    if (dd && typeof dd.hitsToKO === 'number') out.hits = dd.hitsToKO;
    if (!td) return out;
    const num = (k, v) => { if (typeof v === 'number' && isFinite(v)) out[k] = v; };
    num('dmg', td.dmg != null ? td.dmg : td.damage); num('cost', td.ink != null ? td.ink : td.cost); num('refill', td.refill != null ? td.refill : td.refillDelay);
    num('paint', td.paint != null ? td.paint : td.paintR); num('range', td.range); num('speed', td.speed); num('grav', td.gravity != null ? td.gravity : td.grav);
    const sp = td.special === 'splashdown' ? 'splash' : td.special;
    if (typeof sp === 'string' && T.SPECIALS[sp]) out.special = sp;
    return out;
  };
  T.legal = id => !!T.WEAPONS[id];
  T.weaponName = function (id) {
    const td = G.Weapons && ((G.Weapons.turfDefs && G.Weapons.turfDefs[id]) || (G.Weapons.defs && G.Weapons.defs[id]));
    const D = G.Data && G.Data.TURF_WEAPONS;
    const cands = [];
    if (D && D[id] && D[id].nameKey) cands.push(D[id].nameKey);
    if (td && td.nameKey) cands.push(td.nameKey);
    cands.push('wpn.' + id + '.name', 'wpn.' + id, 'weapon.' + id + '.name');
    for (const k of cands) if (G.i18n.has(k)) return G.t(k);
    return G.t('turf.wpn.' + id);
  };
  const ICO = {
    shooter: '<path d="M6 30h20l6-6h8v12h-8l-4 4H14l-2 6H6z" fill="{c}" stroke="#1e1a4d" stroke-width="3" stroke-linejoin="round"/><circle cx="18" cy="22" r="7" fill="#fff" stroke="#1e1a4d" stroke-width="3"/><circle cx="18" cy="22" r="3.5" fill="{c}"/>',
    roller: '<rect x="6" y="28" width="30" height="12" rx="5" fill="{c}" stroke="#1e1a4d" stroke-width="3"/><path d="M21 28V16l14-8" fill="none" stroke="#1e1a4d" stroke-width="4" stroke-linecap="round"/>',
    pellet: '<path d="M6 26h22l12-6v16l-12-6H6z" fill="{c}" stroke="#1e1a4d" stroke-width="3" stroke-linejoin="round"/><circle cx="42" cy="14" r="3" fill="{c}"/><circle cx="44" cy="24" r="3" fill="{c}"/><circle cx="42" cy="34" r="3" fill="{c}"/>',
    lob: '<path d="M10 38c0-12 8-20 18-20" fill="none" stroke="#1e1a4d" stroke-width="3" stroke-dasharray="4 4"/><circle cx="32" cy="16" r="9" fill="{c}" stroke="#1e1a4d" stroke-width="3"/><circle cx="29" cy="13" r="2.5" fill="#fff"/>',
    beam: '<path d="M6 24h14" stroke="#1e1a4d" stroke-width="7" stroke-linecap="round"/><path d="M20 24l6-6 4 12 5-12 4 12 4-6" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    charger: '<path d="M4 26h30l10-3v6l-10-3" fill="{c}" stroke="#1e1a4d" stroke-width="3" stroke-linejoin="round"/><path d="M10 26v8h6v-8" fill="#1e1a4d"/><circle cx="24" cy="20" r="4" fill="#fff" stroke="#1e1a4d" stroke-width="2.5"/>',
    rocket: '<path d="M10 32l18-18 8 2 2 8-18 18z" fill="{c}" stroke="#1e1a4d" stroke-width="3" stroke-linejoin="round"/><path d="M12 34l-6 8 8-6" fill="#ffd23f" stroke="#1e1a4d" stroke-width="2.5"/>',
    mist: '<path d="M6 24h14" stroke="#1e1a4d" stroke-width="7" stroke-linecap="round"/><path d="M22 24l18-10M22 24h20M22 24l18 10" stroke="{c}" stroke-width="4" stroke-linecap="round"/>',
  };
  T.weaponIcon = function (id, color) {
    if (G.Weapons && G.Weapons.icon) { const s = G.safe('turf icon', () => G.Weapons.icon(id)); if (s) return s; }
    const st = T.WEAPONS[id] || T.WEAPONS.splat;
    return '<svg viewBox="0 0 48 48">' + (ICO[st.kind] || ICO.shooter).replace(/\{c\}/g, color || '#ff8a1f') + '</svg>';
  };
  T.subIcon = function (id, color) {
    const c = color || '#8f6bff';
    if (id === 'pop') return '<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="13" fill="' + c + '" stroke="#1e1a4d" stroke-width="3.5"/><path d="M24 6v6M12 10l3 5M36 10l-3 5" stroke="#1e1a4d" stroke-width="3.5" stroke-linecap="round"/><circle cx="19" cy="22" r="3" fill="#fff"/></svg>';
    if (id === 'sprinkler') return '<svg viewBox="0 0 48 48"><path d="M12 40h24l-4-12H16z" fill="' + c + '" stroke="#1e1a4d" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 28V18M24 18l-12-8M24 18l12-8M24 18V6" stroke="#1e1a4d" stroke-width="3.5" stroke-linecap="round"/></svg>';
    return '<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="15" fill="' + c + '" fill-opacity="0.85" stroke="#1e1a4d" stroke-width="3.5"/><circle cx="18" cy="20" r="4.5" fill="#fff"/><path d="M24 11V5" stroke="#1e1a4d" stroke-width="3.5" stroke-linecap="round"/></svg>';
  };
  T.specialIcon = function (id, color) {
    const c = color || '#ffd23f';
    if (id === 'storm') return '<svg viewBox="0 0 48 48"><path d="M12 26a8 8 0 0 1 2-15 11 11 0 0 1 21 2 7 7 0 0 1 1 13z" fill="#fff" stroke="#1e1a4d" stroke-width="3.5" stroke-linejoin="round"/><path d="M16 32l-2 6M24 32l-2 8M32 32l-2 6" stroke="' + c + '" stroke-width="4.5" stroke-linecap="round"/></svg>';
    if (id === 'splash') return '<svg viewBox="0 0 48 48"><path d="M24 6v18" stroke="#1e1a4d" stroke-width="4" stroke-linecap="round"/><path d="M17 17l7 8 7-8" fill="none" stroke="#1e1a4d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="24" cy="36" rx="18" ry="6" fill="' + c + '" stroke="#1e1a4d" stroke-width="3.5"/></svg>';
    return '<svg viewBox="0 0 48 48"><circle cx="12" cy="30" r="7" fill="' + c + '" stroke="#1e1a4d" stroke-width="3"/><circle cx="24" cy="20" r="8" fill="' + c + '" stroke="#1e1a4d" stroke-width="3"/><circle cx="36" cy="30" r="7" fill="' + c + '" stroke="#1e1a4d" stroke-width="3"/></svg>';
  };
  T.pingIcon = '<svg viewBox="0 0 48 48"><path d="M14 42V8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M14 9h22l-6 7 6 7H14z" fill="currentColor"/></svg>';
  T.robotIcon = '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="4" y="7" width="16" height="12" rx="4" fill="#fff" stroke="#1e1a4d" stroke-width="2"/><circle cx="9.5" cy="13" r="1.8" fill="#39d5ff"/><circle cx="14.5" cy="13" r="1.8" fill="#39d5ff"/><path d="M12 7V3" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="3" r="1.5" fill="#ffd23f"/></svg>';

  // Weapons the player may take into Turf: loaners + anything owned in the profile ({own, lvl, xp, tune, mods}).
  const profW = id => { const p = G.Save && G.Save.data && G.Save.prof; const w = p && p.weapons && !Array.isArray(p.weapons) ? p.weapons[id] : null; return w || null; };
  T.owned = function (id) {
    if (T.FREE_WEAPONS.includes(id)) return true;
    const p = G.Save && G.Save.data && G.Save.prof;
    if (!p) return false;
    const w = profW(id);
    if (w) return w.own !== false;
    return Array.isArray(p.weapons) && p.weapons.some(e => e === id || (e && e.id === id));
  };
  T.weaponLevel = function (id) { const w = profW(id); return w ? (w.lvl || w.level || 1) : 1; };
  T.weaponMods = function (id) { const w = profW(id); return w && Array.isArray(w.mods) ? w.mods.filter(Boolean) : []; };
  T.weaponTune = function (id) { const w = profW(id); return w && Array.isArray(w.tune) ? w.tune : null; };

  // Safe generated bot names, plainly bots: "Bot · Otter" (turf.botLabel; the word matches Skydrop Royale's BOT tag),
  // one animal per bot (unique per match, up to 12). An adjective + animal name ("Sparkly Bunny") on the plates still
  // read like another player's handle; every Goo Turf ranger besides you is a bot.
  T.botNames = function (n) {
    const ani = [...Array(12).keys()];
    G.util.shuffle(ani);
    const out = [];
    for (let i = 0; i < n; i++) out.push(G.t('turf.botLabel', { animal: G.t('turf.animal.' + ani[i % 12]) }));
    return out;
  };

  // ------------------------------------------------------------------ CSS (module-owned, injected once)
  // Short-screen rules (phones in landscape). The game frame is always landscape: when a phone is held upright
  // G.Screen rotates #app (html.force-landscape) and the viewport's *width* is the frame height, so every short
  // rule is emitted twice. T.shortCSS is shared with the royale HUD.
  const SHORT = T.shortCSS = rules => '@media (max-height: 460px) {' + rules + '}\n@media (max-width: 460px) {' +
    rules.replace(/(^|\})(\s*)([^{}@]+)\{/g, (m, b, ws, sel) => b + ws + sel.split(',').map(x => 'html.force-landscape ' + x.trim()).join(', ') + ' {') + '}\n';
  const CSS = `
#hud .turf-root { position:absolute; inset:0; pointer-events:none; container-type:size; }
.turf-tank { position:absolute; right:calc(113px + env(safe-area-inset-right,0px)); bottom:calc(36px + env(safe-area-inset-bottom,0px)); width:18px; height:78px;
  border:3px solid var(--ink); border-radius:12px; background:rgba(30,26,77,.45); overflow:hidden; box-shadow:0 3px 0 var(--shadow); transform:scale(var(--hud-scale)); transform-origin:bottom right; }
.turf-tank > i { position:absolute; left:0; right:0; bottom:0; height:100%; background:var(--tc,#ff8a1f); transform-origin:bottom; transition:transform .08s linear; }
.turf-tank > b { position:absolute; left:0; right:0; height:3px; background:rgba(255,255,255,.75); }
.turf-tank.low { animation: turfBlink .45s infinite alternate; }
.turf-tank.desk { right:calc(36px + env(safe-area-inset-right,0px)); bottom:calc(30px + env(safe-area-inset-bottom,0px)); height:96px; width:22px; }
@keyframes turfBlink { to { border-color:#ff4d5e; box-shadow:0 0 0 3px rgba(255,77,94,.45); } }
.turf-low { position:absolute; left:50%; top:calc(50% + 26px); transform:translateX(-50%); font:900 calc(13px * var(--ui-t, 1)) var(--f-body); color:#fff; background:#ff4d5e; border:2px solid var(--ink); border-radius:8px; padding:0 6px; letter-spacing:.06em; }
.turf-low::before { content:'▼ '; }
.turf-sp { position:absolute; right:calc(66px + env(safe-area-inset-right,0px)); bottom:calc(30px + env(safe-area-inset-bottom,0px)); width:58px; height:58px; border-radius:50%;
  background:conic-gradient(var(--tc,#ff8a1f) calc(var(--f,0) * 1turn), rgba(30,26,77,.35) 0); border:3px solid var(--ink); display:grid; place-items:center; box-shadow:0 3px 0 var(--shadow); }
.turf-sp > span { width:40px; height:40px; border-radius:50%; background:#fff; display:grid; place-items:center; border:2px solid var(--ink); }
.turf-sp > span svg { width:30px; height:30px; } .turf-sp > em { position:absolute; bottom:-14px; font:800 calc(11px * var(--ui-t, 1)) var(--f-body); color:#fff; text-shadow:0 1px 0 var(--ink); font-style:normal; }
.turf-sp.ready { animation: turfGlow .6s infinite alternate; }
@keyframes turfGlow { from { box-shadow:0 0 0 3px #fff, 0 0 10px 4px var(--tc,#ff8a1f); } to { box-shadow:0 0 0 5px #fff, 0 0 22px 10px var(--tc,#ff8a1f); } }
#touch[data-layout="turf"] .tb-ability.ready { animation: turfGlow .6s infinite alternate; }
#touch[data-layout="turf"] .tb-ability { background: var(--turf-a, rgba(255,210,63,.92)); }
#touch[data-layout="turf"] .tb-swim { background: var(--turf-a, rgba(61,123,255,.85)); }
#touch[data-layout="turf"] .tb-swap { color: var(--ink); }
.turf-roster { display:flex; gap:5px; align-items:center; margin-top:2px; }
.turf-roster .sep { width:8px; }
.turf-pip { width:22px; height:22px; border:3px solid var(--ink); background:var(--pc); position:relative; box-shadow:0 2px 0 var(--shadow); display:grid; place-items:center; }
.turf-pip.a { border-radius:50%; } .turf-pip.b { transform:rotate(45deg) scale(.86); border-radius:4px; }
.turf-pip.me { outline:3px solid #fff; outline-offset:1px; }
.turf-pip.ko { background:#5a5a78; } .turf-pip.ko::after { content:'✕'; color:#fff; font:900 14px/1 var(--f-body); }
.turf-pip.b.ko::after { transform:rotate(-45deg); }
.turf-pip.sp { box-shadow:0 0 0 2px #fff, 0 0 10px 3px #fff8b0; }
/* team patterns (Ink patterns setting / colorblind mode): Team A stripes, Team B dots — the same marks as the goo */
.turf-roster.pat .turf-pip.a:not(.ko) { background-image:repeating-linear-gradient(45deg, rgba(30,26,77,.32) 0 3px, transparent 3px 6px); }
.turf-roster.pat .turf-pip.b:not(.ko) { background-image:radial-gradient(circle, rgba(255,255,255,.9) 0 1.5px, transparent 2px); background-size:6px 6px; }
#hud.turf-pat .teambar .ta { background-image:repeating-linear-gradient(45deg, rgba(30,26,77,.28) 0 5px, transparent 5px 11px); }
#hud.turf-pat .teambar .tb { background-image:radial-gradient(circle, rgba(255,255,255,.85) 0 2px, transparent 2.6px); background-size:9px 9px; }
.turf-judge.pat .tj-bar .a { background-image:repeating-linear-gradient(45deg, rgba(30,26,77,.28) 0 6px, transparent 6px 13px); }
.turf-judge.pat .tj-bar .b { background-image:radial-gradient(circle, rgba(255,255,255,.85) 0 2.5px, transparent 3px); background-size:11px 11px; }
.turf-judge .tj-sh { width:14px; height:14px; border:3px solid var(--ink); background:var(--pc); display:inline-block; flex:none; box-sizing:border-box; }
.turf-judge .tj-sh.a { border-radius:50%; } .turf-judge .tj-sh.b { transform:rotate(45deg) scale(.86); border-radius:3px; }
.turf-swingc { margin-top:3px; font:var(--fw-d) calc(16px * var(--ui-t, 1))/1 var(--f-display); color:var(--tc,#ff8a1f); -webkit-text-stroke:max(1px, calc(2px * var(--ds, 1))) var(--ink); paint-order:stroke fill; text-shadow:0 2px 0 var(--ink); }
.turf-swingc.pop { animation: bannerIn .4s cubic-bezier(.2,1.7,.4,1); }
.turf-lobby .tl-pat { display:inline-flex; gap:3px; } .turf-lobby .tl-pat i { width:18px; height:18px; border:2.5px solid var(--ink); display:inline-block; }
.turf-lobby .tl-pat i.a { border-radius:50%; background-image:repeating-linear-gradient(45deg, rgba(30,26,77,.35) 0 3px, transparent 3px 6px); }
.turf-lobby .tl-pat i.b { transform:rotate(45deg) scale(.85); border-radius:3px; background-image:radial-gradient(circle, rgba(255,255,255,.9) 0 1.5px, transparent 2px); background-size:6px 6px; }
.turf-swim { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 120%, var(--tc) 0%, transparent 55%); opacity:0; transition:opacity .15s; }
.turf-swim.on { opacity:.55; }
.turf-sticky { position:absolute; inset:0; box-shadow: inset 0 0 70px 24px var(--ec); opacity:0; transition:opacity .2s; }
.turf-sticky.on { opacity:.75; }
.turf-flash { position:absolute; inset:0; background:radial-gradient(circle, rgba(255,255,255,.0) 30%, var(--tc) 100%); opacity:0; }
.turf-flash.go { animation: turfFlash .5s ease-out; }
@keyframes turfFlash { 0% { opacity:.85; } 100% { opacity:0; } }
.turf-ko { position:absolute; left:50%; top:max(34%, calc(118px + env(safe-area-inset-top,0px))); transform:translateX(-50%); text-align:center; pointer-events:none; width:max-content; max-width:min(70%, 600px); }
/* long names (de/ru/fr) wrap onto a second line instead of losing the killer's name to an ellipsis */
.turf-ko .k1 { font:var(--fw-d) clamp(22px,4.6vw,40px)/1.08 var(--f-display); color:#fff; -webkit-text-stroke:max(1px, calc(3px * var(--ds, 1))) var(--ink); paint-order:stroke fill; text-shadow:0 5px 0 var(--ink); white-space:normal; text-wrap:balance; overflow-wrap:anywhere; padding:0 4px 6px; }
#hud.turf-on .feed { transition:opacity .2s; }
#hud.turf-on.turf-koed .feed { opacity:0; }
.turf-ko .k2 { margin-top:2px; font:800 calc(18px * var(--ui-t, 1)) var(--f-body); color:#fff; text-shadow:0 2px 0 var(--ink); }
.turf-count { position:absolute; left:50%; top:calc(116px + env(safe-area-inset-top,0px)); transform:translateX(-50%); font:var(--fw-d) clamp(44px,12vw,96px)/1 var(--f-display); color:#fff; -webkit-text-stroke:max(1px, calc(4px * var(--ds, 1))) var(--ink); paint-order:stroke fill; text-shadow:0 6px 0 var(--ink); }
.turf-count.pop { animation: bannerIn .35s cubic-bezier(.2,1.7,.4,1); }
.turf-count.small { font-size:clamp(34px,8vw,64px); }
.turf-hint { position:absolute; left:50%; bottom:calc(14px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); background:rgba(30,26,77,.72); color:#fff; padding:4px 12px; border-radius:10px; font:800 calc(13px * var(--ui-t, 1)) var(--f-body); white-space:nowrap; }
.turf-intro { position:absolute; inset:0; container-type:size; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:calc(16px + env(safe-area-inset-top,0px)) 16px calc(16px + env(safe-area-inset-bottom,0px)); pointer-events:auto; }
.turf-intro .ti-title { font:var(--fw-d) clamp(28px,6vw,56px)/1 var(--f-display); color:#fff; -webkit-text-stroke:max(1px, calc(3px * var(--ds, 1))) var(--ink); paint-order:stroke fill; text-shadow:0 5px 0 var(--ink); animation: bannerIn .5s cubic-bezier(.2,1.7,.4,1); }
.turf-intro .ti-sub { font:800 calc(15px * var(--ui-t, 1)) var(--f-body); color:#fff; text-shadow:0 2px 0 var(--ink); margin-top:6px; text-align:center; }
.turf-intro .ti-teams { display:flex; gap:12px; align-items:center; width:min(760px,100%); }
.turf-intro .ti-team { flex:1; background:rgba(255,255,255,.9); border:3px solid var(--ink); border-radius:16px; padding:8px 10px; box-shadow:0 4px 0 var(--shadow); min-width:0; animation: toastIn .4s backwards; }
.turf-intro .ti-team h3 { margin:0 0 4px; font:var(--fw-d) calc(16px * var(--ui-t, 1)) var(--f-display); color:var(--ink); display:flex; align-items:center; gap:6px; }
.turf-intro .ti-team h3 i { width:16px; height:16px; border:3px solid var(--ink); background:var(--pc); display:inline-block; }
.turf-intro .ti-team.b h3 i { transform:rotate(45deg) scale(.85); border-radius:3px; } .turf-intro .ti-team.a h3 i { border-radius:50%; }
.turf-intro .ti-team div { font:800 calc(13px * var(--ui-t, 1))/1.5 var(--f-body); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; gap:4px; align-items:center; }
.turf-intro .ti-vs { font:var(--fw-d) 30px var(--f-display); color:#fff; -webkit-text-stroke:max(1px, calc(3px * var(--ds, 1))) var(--ink); paint-order:stroke fill; }
/* (an ink pill, like the in-match hint: white text straight on the bright arena sky was hard to read) */
.turf-intro .ti-skip { font:800 max(12px, calc(13px * var(--ui-t, 1)))/1.3 var(--f-body); color:#fff; text-shadow:0 1px 0 var(--ink); background:rgba(30,26,77,.74); border:2px solid rgba(255,255,255,.55); border-radius:99px; padding:4px 14px 5px; box-shadow:0 3px 0 rgba(30,26,77,.35); white-space:nowrap; animation:tiSkip 1.6s ease-in-out .8s infinite; }
@keyframes tiSkip { 0%,100% { opacity:1; } 50% { opacity:.72; } }
.reduced-motion .turf-intro .ti-skip { animation:none; }
.turf-intro .ti-skip .ti-pad { margin:0 0.3em; }
.turf-jwrap { position:absolute; inset:0; pointer-events:none; container-type:size; }
.turf-judge { position:absolute; left:50%; bottom:calc(10px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); width:min(500px,56vw); width:min(500px,56%); text-align:center; }
.turf-judge .tj-msg { font:800 calc(15px * var(--ui-t, 1)) var(--f-body); color:#fff; text-shadow:0 2px 0 var(--ink); margin-bottom:6px; }
.turf-judge .tj-pct { display:flex; justify-content:space-between; font:var(--fw-d) clamp(22px,4.4vw,34px)/1 var(--f-display); color:#fff; -webkit-text-stroke:max(1px, calc(2.5px * var(--ds, 1))) var(--ink); paint-order:stroke fill; text-shadow:0 4px 0 var(--ink); min-height:34px; }
.turf-judge .tj-bar { position:relative; height:30px; border:4px solid var(--ink); border-radius:99px; background:#eef0f6; overflow:hidden; box-shadow:0 4px 0 var(--shadow); margin-top:6px; }
.turf-judge .tj-bar i { position:absolute; top:0; bottom:0; transition:width .55s cubic-bezier(.3,1.4,.5,1); width:0; }
.turf-judge .tj-bar .a { left:0; background:var(--ta); } .turf-judge .tj-bar .b { right:0; background:var(--tb); }
.turf-judge .tj-win { margin-top:6px; white-space:nowrap; font:var(--fw-d) clamp(22px,4.4vw,44px)/1 var(--f-display); color:#fff; -webkit-text-stroke:max(1px, calc(3px * var(--ds, 1))) var(--ink); paint-order:stroke fill; text-shadow:0 5px 0 var(--ink); animation: bannerIn .45s cubic-bezier(.2,1.7,.4,1); }
.turf-confetti { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
.turf-confetti i { position:absolute; top:-20px; width:10px; height:16px; border-radius:3px; animation: turfFall linear forwards; }
@keyframes turfFall { to { transform: translate3d(var(--dx), var(--fall, 110vh), 0) rotate(var(--rot)); } }
.turf-lobby .tl-sec { font:var(--fw-d) 15px var(--f-display); color:var(--grape); margin:6px 0 4px; letter-spacing:.03em; }
.turf-lobby .tl-cards { display:grid; gap:8px; grid-template-columns:repeat(auto-fill, minmax(min(132px,100%),1fr)); }
.turf-lobby .tl-cards.wide { grid-template-columns:repeat(auto-fill, minmax(min(168px,100%),1fr)); }
.turf-lobby .card { padding:8px; gap:4px; cursor:pointer; }
.turf-lobby .card .ic { width:40px; height:40px; flex:none; } .turf-lobby .card .ic svg { width:100%; height:100%; }
.turf-lobby .card h3 { font-size:14px; } .turf-lobby .card p { font-size:12px; line-height:1.35; }
.turf-lobby .tl-mini { display:grid; grid-template-columns:auto 1fr; gap:2px 6px; align-items:center; font:700 11px var(--f-body); color:var(--ink-soft); }
.turf-lobby .tl-mini .bar { height:7px; }
.turf-lobby .tl-map { width:100%; aspect-ratio: 4 / 3; border-radius:10px; border:2px solid var(--ink); background:#bfe9f7; display:block; }
.turf-lobby .tl-swatch { display:inline-flex; align-items:center; gap:6px; font:800 14px var(--f-body); }
.turf-lobby .tl-swatch i { width:22px; height:22px; border:3px solid var(--ink); display:inline-block; }
.turf-lobby .tl-swatch.a i { border-radius:50%; } .turf-lobby .tl-swatch.b i { transform:rotate(45deg) scale(.85); border-radius:4px; }
.turf-lobby .tl-how { display:flex; gap:8px; flex-wrap:wrap; } .turf-lobby .tl-how div { flex:1 1 180px; display:flex; gap:8px; align-items:center; font:700 13px/1.35 var(--f-body); background:#fff; border:2px solid var(--ink); border-radius:12px; padding:6px 8px; }
.turf-lobby .tl-how svg { width:30px; height:30px; flex:none; }
.turf-lobby .seg { display:inline-flex; border:3px solid var(--ink); border-radius:12px; overflow:hidden; }
.turf-lobby .seg button { border:0; padding:8px 12px; font:800 13px var(--f-body); background:#fff; cursor:pointer; min-height:40px; }
.turf-lobby .seg button.on { background:var(--sky); color:#fff; text-shadow:0 1px 0 rgba(30,26,77,.5); }
.turf-lobby .seg button[disabled] { opacity:.45; }
/* (a real segmented control: the box hugs its options instead of stretching across the column with an empty end, and
   when the options wrap — Bot skill in a narrow column — each row fills the box evenly; square inner edges, a hairline
   between options, no per-button shadow inside the outlined box) */
.turf-lobby .seg { align-self:flex-start; max-width:100%; gap:0; }
.turf-lobby .seg button { flex:1 1 auto; border-radius:0; box-shadow:inset 1px 0 0 rgba(30,26,77,.14); }
.panel-body.tl-more { -webkit-mask-image:linear-gradient(#000 calc(100% - 26px), rgba(0,0,0,.15)); mask-image:linear-gradient(#000 calc(100% - 26px), rgba(0,0,0,.15)); }
.turf-res .tr-row { display:flex; justify-content:space-between; gap:10px; font:800 15px var(--f-body); padding:5px 0; border-bottom:2px dashed rgba(30,26,77,.12); }
/* sizes from the game frame (container units) where supported: correct even when #app is rotated */
.turf-ko .k1 { font-size:clamp(22px,4.6cqw,40px); }
.turf-count { font-size:clamp(44px,12cqw,96px); } .turf-count.small { font-size:clamp(34px,8cqw,64px); }
.turf-intro .ti-title { font-size:clamp(28px,6cqw,56px); }
.turf-judge .tj-pct { font-size:clamp(22px,4.4cqw,34px); } .turf-judge .tj-win { font-size:clamp(22px,4.4cqw,44px); }
` + SHORT(`
  .turf-lobby .tl-how { gap:4px; } .turf-lobby .tl-how div { font-size:11px; line-height:1.25; padding:3px 6px; flex-basis:150px; } .turf-lobby .tl-how svg { width:20px; height:20px; }
  .turf-lobby .tl-map { aspect-ratio: 2 / 1; } .turf-lobby .tl-sec { margin:2px 0; font-size:14px; }
  .turf-lobby .tl-cards { grid-template-columns:repeat(auto-fill, minmax(min(118px,100%),1fr)); }
  .turf-lobby .tl-sec-gear { order:-2; margin-top:0; } .turf-lobby .tl-gear { order:-1; } .turf-lobby .tl-how { order:20; }
  .turf-lobby .tl-gear { grid-template-columns:repeat(auto-fill, minmax(min(156px,100%),1fr)); gap:6px; }
  .turf-lobby .tl-gear .card { padding:5px 7px 6px; gap:3px; } .turf-lobby .tl-gear .card .ic { width:30px; height:30px; }
  .turf-lobby .tl-gear .card h3 { font-size:13px; line-height:1.15; } .turf-lobby .tl-gear .card p { display:none; }
  .turf-lobby .tl-gear .card > .row > div { display:flex; flex-wrap:wrap; align-items:center; column-gap:6px; row-gap:2px; }
  .turf-lobby .tl-gear .tl-mini { grid-template-columns:auto 1fr auto 1fr; gap:1px 5px; } .turf-lobby .tl-gear .tl-mini .bar { height:6px; }
  .turf-tank { height:64px; width:14px; } .turf-pip { width:18px; height:18px; }
  .turf-judge .tj-pct { font-size:calc(24px * var(--ui-t, 1)); min-height:26px; } .turf-judge .tj-bar { height:24px; } .turf-judge .tj-msg { font-size:calc(13px * var(--ui-t, 1)); margin-bottom:2px; }
  .turf-count { font-size:clamp(38px,11vh,64px); top:calc(112px + env(safe-area-inset-top,0px)); } .turf-count.small { font-size:clamp(32px,9vh,52px); }
  #hud.turf-on .feed > div:nth-last-child(n+4), #hud.roy-on .feed > div:nth-last-child(n+4) { display:none; }
  #hud.turf-on .feed > div, #hud.roy-on .feed > div { font-size:calc(11px * var(--ui-t, 1)); padding:2px 8px; }
`) + `
@container (max-height: 460px) {
  .turf-ko .k1 { font-size:clamp(20px,3.9cqw,34px); } .turf-ko .k2 { font-size:calc(16px * var(--ui-t, 1)); }
  .turf-count { font-size:clamp(38px,11cqh,64px); } .turf-count.small { font-size:clamp(32px,9cqh,52px); }
  .turf-judge .tj-pct { font-size:calc(24px * var(--ui-t, 1)); } .turf-judge .tj-win { font-size:clamp(22px,4.4cqw,36px); } }
`;
  T.injectCSS = function () {
    if (document.getElementById('turf-css')) return;
    const s = document.createElement('style'); s.id = 'turf-css'; s.textContent = CSS;
    document.head.appendChild(s);
  };
  if (document.head) T.injectCSS(); else document.addEventListener('DOMContentLoaded', T.injectCSS);
  // Button-layout editor (Settings > Controls): show the Goo Turf meaning of repurposed buttons in the 'turf' tab.
  if (G.HudLayout) { const I = G.HudLayout.icons || (G.HudLayout.icons = {}); I.turf = Object.assign(I.turf || {}, { swap: T.pingIcon, gadget: T.subIcon('bubble', '#ffffff'), ability: T.specialIcon('storm', '#ffffff') }); }
})(window.G);

}).call(window); } catch (e) { console.error('[module 24_turf.js]', e); }
// ---- 24b_turf_paint.js
try { (function () {
// 24b_turf_paint.js — Goo Turf paint system.
//   * CPU owner grid (source of truth): Uint8Array at 0.5 m cells (60×80 m arena = 120×160 = 19,200 cells).
//     0 = blank, 1 = Team A, 2 = Team B, 255 = uninkable (grates, prop footprints, unreachable tops).
//     Incremental per-team counters; never reads pixels back from the GPU.
//   * Top-down paint render target (1024² High/Ultra, 512² Medium/Low) stamped by ONE instanced draw of soft splat
//     quads per frame (≤ 72 stamps). R channel = Team A coverage, G = Team B. A height/mask DataTexture keeps
//     splats from spilling over ledges or onto grates.
//   * Floor material: soft-toon arena shader that samples the paint map by world XZ on surfaces with
//     normal.y > 0.7 → smoothstep(0.42, 0.58) merged-puddle edges, darker rim, bevel normal from the coverage
//     gradient + glossy sun highlight, colour-blind stripes (A) / dots (B); receives (and casts) Ultra sun shadows.
//   * Wall paint: instanced splat decals + a sparse 0.5 m hash (wall paint lets you climb, never scores).
(function (G) {
  'use strict';
  // Math.max / min / sign / hypot / random hand back a fresh heap number from the mid-tier (Maglev) compiled code that
  // runs most per-frame code (measured 12-36 bytes a call); these plain twins are inlined and allocate nothing.
  // frand: xorshift32, its state in an Int32Array (updating a typed array never boxes); frange(a, b) = U.rand(a, b).
  const fmax = (a, b) => (a > b ? a : b), fmin = (a, b) => (a < b ? a : b), fsign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const fhyp = (x, y) => Math.sqrt(x * x + y * y);
  const _rs = new Int32Array(1); _rs[0] = (Math.random() * 0x7fffffff) | 1;
  const frand = () => { let x = _rs[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _rs[0] = x; return (x >>> 0) / 4294967296; };
  const frange = (a, b) => a + frand() * (b - a);
  const T = G.Turf = G.Turf || {};
  const CELL = 0.5, HMIN = -2, HRANGE = 12, YTOL = 0.75;

  const SPLAT_VS = [
    'uniform vec4 uRect;',
    'varying vec2 vUv; varying vec3 vC; varying vec2 vMap; varying float vY;',
    'void main(){',
    '  vUv = position.xz;',
    '  vec4 wp = instanceMatrix * vec4(position, 1.0);',
    '  vC = instanceColor; vY = instanceMatrix[3].y;',
    '  vMap = (wp.xz - uRect.xy) * uRect.zw;',
    '  gl_Position = vec4(vMap * 2.0 - 1.0, 0.0, 1.0);',
    '}'].join('\n');
  const SPLAT_FS = [
    'uniform sampler2D uHeight;',
    'varying vec2 vUv; varying vec3 vC; varying vec2 vMap; varying float vY;',
    'void main(){',
    '  vec4 hm = texture2D(uHeight, vMap);',
    '  if (hm.g > 0.5) discard;',
    '  float h = hm.r * ' + HRANGE.toFixed(1) + ' + (' + HMIN.toFixed(1) + ');',
    '  if (abs(h - vY) > ' + YTOL.toFixed(2) + ') discard;',
    '  float d = length(vUv);',
    '  float ang = atan(vUv.y, vUv.x);',
    '  float s = vC.b * 6.2831;',
    '  float edge = 1.0 + 0.10 * sin(ang * 5.0 + s) + 0.06 * sin(ang * 9.0 - s * 2.0) + 0.05 * sin(ang * 3.0 + s * 3.0);',
    '  float a = 1.0 - smoothstep(0.5, 1.0, d / edge);',
    '  if (a < 0.004) discard;',
    '  gl_FragColor = vec4(vC.r, vC.g, 0.0, a);',
    '}'].join('\n');

  const FLOOR_VS = [
    '#include <common>', '#include <color_pars_vertex>', '#include <fog_pars_vertex>',
    'attribute float aMat;',
    'varying vec3 vWN; varying vec3 vWP; varying float vMat;',
    'void main(){',
    '  #include <color_vertex>',
    '  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;',
    '  vWN = normalize(mat3(modelMatrix) * normal);',
    '  vMat = aMat;',
    '  vec4 mvPosition = viewMatrix * wp;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'].join('\n');
  const FLOOR_FS = [
    'uniform vec3 uSunDir, uSunCol, uSky, uGround, uShadow, uRimCol, uColA, uColB;',
    'uniform float uShadowK, uExposure, uPat, uBump, uTime;',
    'uniform sampler2D uPaint; uniform vec4 uRect; uniform vec2 uTexel;',
    'uniform sampler2D uMask; uniform vec2 uMTexel;',
    '#include <common>', '#include <color_pars_fragment>', '#include <fog_pars_fragment>',
    'varying vec3 vWN; varying vec3 vWP; varying float vMat;',
    '#include <mr_sunshadow_pars_fragment>',
    'float cv(vec2 uv){ vec4 p = texture2D(uPaint, uv); return p.r + p.g; }',
    'float hh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main(){',
    '  #ifdef SUN_SHADOW',
    '    if (uShadowPass > 0.5) { gl_FragColor = vec4(1.0); return; }',
    '  #endif',
    '  vec3 albedo = vec3(1.0);',
    '  #ifdef USE_COLOR',
    '    albedo = vColor.rgb;',
    '  #endif',
    '  vec3 n = normalize(vWN);',
    '  float up = smoothstep(0.65, 0.85, n.y);',
    '  vec2 q = vWP.xz;',
    '  if (vMat > 0.5) {',
    '    if (vMat < 1.5) {',                                 // 1: 2 m plaza tiles, soft checker
    '      vec2 t = q * 0.5; vec2 f = abs(fract(t) - 0.5);',
    '      float seam = smoothstep(0.465, 0.49, max(f.x, f.y));',
    '      float ch = mod(floor(t.x) + floor(t.y), 2.0);',
    '      albedo *= (1.0 - 0.045 * ch * up) * (1.0 - 0.14 * seam * up);',
    '    } else if (vMat < 2.5) {',                          // 2: boardwalk planks
    '      float row = floor(q.x * 2.0);',
    '      float f = abs(fract(q.x * 2.0) - 0.5);',
    '      float off = hh(vec2(row, 3.7));',
    '      float seg = abs(fract(q.y * 0.25 + off) - 0.5);',
    '      float seam = max(smoothstep(0.43, 0.48, f), smoothstep(0.486, 0.497, seg));',
    '      albedo *= (1.0 - 0.07 * off * up) * (1.0 - 0.17 * seam * up);',
    '    } else if (vMat < 3.5) {',                          // 3: metal grate (uninkable)
    '      vec2 f = abs(fract(q * vec2(3.0, 1.0)) - 0.5);',
    '      float slot = (1.0 - smoothstep(0.24, 0.3, f.x)) * (1.0 - smoothstep(0.38, 0.44, f.y));',
    '      albedo *= mix(1.0, 0.42, slot * up);',
    '      vec2 g = abs(fract(q * 0.5) - 0.5); albedo *= 1.0 + 0.18 * smoothstep(0.46, 0.49, max(g.x, g.y)) * up;',
    '    } else if (vMat < 4.5) {',                          // 4: bricks on vertical faces
    '      float yy = vWP.y * 2.0; float rowb = floor(yy);',
    '      float u = (abs(n.x) > abs(n.z) ? vWP.z : vWP.x) + mod(rowb, 2.0) * 0.5;',
    '      float lb = max(smoothstep(0.42, 0.48, abs(fract(yy) - 0.5)), smoothstep(0.46, 0.49, abs(fract(u) - 0.5)));',
    '      albedo *= 1.0 - 0.12 * lb * (1.0 - up);',
    '    } else {',                                           // 5: candy stripes on vertical faces
    '      float st = step(0.5, fract((vWP.y + (abs(n.x) > abs(n.z) ? vWP.z : vWP.x)) * 0.5));',
    '      albedo = mix(albedo, vec3(1.0, 0.97, 0.94), st * (1.0 - up) * 0.75);',
    '    }',
    '  }',
    '  float ndl = dot(n, uSunDir);',
    '  float d = clamp((ndl + 0.4) / 1.4, 0.0, 1.0);',
    '  float band = smoothstep(0.32, 0.52, d);',
    '  float lit = mix(band, d, 0.3);',
    '  vec3 shadeMul = mix(vec3(1.0), uShadow, uShadowK);',
    // Ultra sun shadows (as TOON_FS): a cast shadow lowers the light term, so it takes the same cool toon shade as a
    // face turned from the sun; the goo below darkens toward that shade too and loses its sun glints
    '  float sv = 1.0;',
    '  #ifdef SUN_SHADOW',
    '    if (uSunOn > 0.0 && d > 0.12) { sv = mix(1.0, sunVis(vWP, n, ndl), uSunOn * smoothstep(0.12, 0.3, d)); lit *= sv; }',
    '  #endif',
    '  vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5);',
    '  vec3 col = albedo * amb * mix(shadeMul, uSunCol, lit) * uExposure;',
    '  vec3 vdir = normalize(cameraPosition - vWP);',
    '  col += uRimCol * pow(1.0 - max(dot(n, vdir), 0.0), 3.0) * 0.12 * (1.0 - up);',
    // Ink: coverage from the paint map with a two-octave world-space wobble on the threshold (organic,
    // blobby puddle edges), bevel normal from the coverage gradient plus slow animated ripples (wet), a darker
    // rim, a bright meniscus just inside it, sharp toon highlight + broad sheen, sky fresnel and drifting
    // sheen streaks. Purely visual: the CPU owner grid stays the source of truth for coverage.
    '  if (n.y > 0.7) {',
    '    vec2 uv = (vWP.xz - uRect.xy) * uRect.zw;',
    // Uninkable floor (grates, prop footprints: owner 255 in the CPU grid, mask G channel) reads as "no goo here": a
    // soft diagonal hatch, plus a pale dashed rim along every edge it shares with paintable floor.
    '    if (texture2D(uMask, uv).g > 0.5) {',
    '      float hs = fract((q.x - q.y) * 0.9);',
    '      col *= 1.0 - 0.12 * (1.0 - smoothstep(0.12, 0.2, hs)) * smoothstep(0.0, 0.04, hs);',
    '      vec2 cf = fract(uv / uMTexel), cm = uMTexel;',
    '      float e = 1.0;',
    '      if (texture2D(uMask, uv - vec2(cm.x, 0.0)).g < 0.5) e = min(e, cf.x);',
    '      if (texture2D(uMask, uv + vec2(cm.x, 0.0)).g < 0.5) e = min(e, 1.0 - cf.x);',
    '      if (texture2D(uMask, uv - vec2(0.0, cm.y)).g < 0.5) e = min(e, cf.y);',
    '      if (texture2D(uMask, uv + vec2(0.0, cm.y)).g < 0.5) e = min(e, 1.0 - cf.y);',
    '      float rimL = (1.0 - smoothstep(0.12, 0.22, e)) * step(0.4, fract((q.x + q.y) * 1.6));',
    '      col = mix(col, vec3(1.0, 0.94, 0.66) * uExposure, rimL * 0.7);',
    '    }',
    '    vec4 p = texture2D(uPaint, uv);',
    '    float c = p.r + p.g;',
    '    if (c > 0.2) {',
    '      float ce = c + (vn(q * 2.3) - 0.5) * 0.17 + (vn(q * 6.1 + 3.7) - 0.5) * 0.07;',
    '      float a = smoothstep(0.42, 0.52, ce);',
    '      if (a > 0.002) {',
    '        float side = smoothstep(-0.05, 0.05, p.r - p.g);',
    '        vec3 gc = mix(uColB, uColA, side);',
    '        float cl = cv(uv - vec2(uTexel.x, 0.0)), cr = cv(uv + vec2(uTexel.x, 0.0));',
    '        float cd = cv(uv - vec2(0.0, uTexel.y)), cu = cv(uv + vec2(0.0, uTexel.y));',
    '        vec2 rip = vec2(sin(q.x * 2.7 + q.y * 1.3 + uTime * 1.6), sin(q.y * 2.3 - q.x * 1.1 - uTime * 1.3)) * 0.07;',
    '        vec3 gn = normalize(vec3((cl - cr) * uBump + rip.x, 1.0, (cd - cu) * uBump + rip.y));',
    '        float gd = clamp((dot(gn, uSunDir) + 0.4) / 1.4, 0.0, 1.0);',
    '        float thick = smoothstep(0.55, 1.2, ce);',
    '        vec3 base = mix(gc * 1.05, gc * vec3(0.86, 0.86, 0.93), thick * 0.5);',
    '        vec3 goo = base * (0.78 + 0.32 * smoothstep(0.30, 0.62, gd)) * uExposure;',
    '        float rim = 1.0 - smoothstep(0.52, 0.64, ce);',
    '        float seam = 1.0 - smoothstep(0.03, 0.12, abs(p.r - p.g));',
    '        goo *= 1.0 - 0.28 * max(rim, seam * 0.9);',
    '        float lipK = smoothstep(0.5, 0.58, ce) * (1.0 - smoothstep(0.6, 0.76, ce));',
    '        goo += gc * 0.32 * lipK * smoothstep(0.45, 0.8, gd) * uExposure;',
    '        if (uPat > 0.5) {',
    '          float st = step(0.5, fract((vWP.x + vWP.z) * 1.1));',
    '          vec2 dq = fract(q * 1.25) - 0.5; float dt = 1.0 - smoothstep(0.15, 0.19, length(dq));',
    '          goo = mix(goo, goo * 0.72, st * side * 0.85);',
    '          goo = mix(goo, vec3(1.0), dt * (1.0 - side) * 0.42);',
    '        }',
    '        #ifdef SUN_SHADOW',
    '          goo = mix(goo * shadeMul / max(uSunCol, vec3(0.2)), goo, sv);',
    '        #endif',
    '        vec3 hv = normalize(uSunDir + vdir);',
    '        float nh = max(dot(gn, hv), 0.0);',
    '        goo += uSunCol * (smoothstep(0.55, 0.78, pow(nh, 90.0)) * 0.72 + pow(nh, 16.0) * 0.12) * sv;',
    '        float fr = pow(1.0 - max(dot(gn, vdir), 0.0), 4.0);',
    '        goo = mix(goo, uSky * uExposure * 1.05, fr * 0.32);',
    '        float streak = smoothstep(0.93, 1.0, sin(dot(q, vec2(0.62, 0.41)) * 1.3 - uTime * 1.1 + vn(q * 0.45) * 4.0)) * (1.0 - rim);',
    '        goo += vec3(0.15) * streak * (0.45 + fr);',
    '        float tw = hh(floor(q * 4.0) + floor(uTime * 0.7));',
    '        goo += vec3(step(0.996, tw) * 0.35) * (1.0 - rim);',
    '        col = mix(col, goo, a);',
    '      }',
    '    }',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '  #include <colorspace_fragment>',
    '  #include <fog_fragment>',
    '}'].join('\n');

  const _c = new THREE.Color(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3();
  const ZAX = new THREE.Vector3(0, 0, 1), YAX = new THREE.Vector3(0, 1, 0);

  class Paint {
    // rect {minX,maxX,minZ,maxZ}; colA/colB hex; opts {pattern, res}
    constructor(world, rect, colA, colB, opts) {
      opts = opts || {};
      this.world = world;
      this.minX = rect.minX; this.minZ = rect.minZ; this.maxX = rect.maxX; this.maxZ = rect.maxZ;
      this.sx = rect.maxX - rect.minX; this.sz = rect.maxZ - rect.minZ;
      this.nx = Math.round(this.sx / CELL); this.nz = Math.round(this.sz / CELL);
      const N = this.nx * this.nz;
      this.owner = new Uint8Array(N);
      this.h = new Float32Array(N);
      this.counts = new Int32Array(3);
      this.inkable = 1;
      this.lock = false;
      this.conv = 0;            // cells converted from the other team by the last paint() call
      this.hexA = colA; this.hexB = colB;
      this.colA = new THREE.Color(colA); this.colB = new THREE.Color(colB);
      this.pattern = !!opts.pattern;
      // 1024² from High up (Ultra included), 512² on Medium / Low
      this.res = opts.res || (G.R.tierRank() >= 2 ? 1024 : 512);
      this.rt = new THREE.WebGLRenderTarget(this.res, this.res, {
        depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      });
      this.rect = new THREE.Vector4(this.minX, this.minZ, 1 / this.sx, 1 / this.sz);
      this.hdata = new Uint8Array(N * 4);
      this.htex = new THREE.DataTexture(this.hdata, this.nx, this.nz, THREE.RGBAFormat, THREE.UnsignedByteType);
      this.htex.magFilter = this.htex.minFilter = THREE.NearestFilter;
      this.htex.generateMipmaps = false;
      this.htex.needsUpdate = true;
      // splat batch (one instanced draw into the paint RT per frame)
      this.MAXI = 72;
      this.splatGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
      this.splatMat = new THREE.ShaderMaterial({
        uniforms: { uRect: { value: this.rect }, uHeight: { value: this.htex } },
        vertexShader: SPLAT_VS, fragmentShader: SPLAT_FS,
        transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,   // XZ→clip mapping mirrors the winding
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
        blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      });
      this.splats = new THREE.InstancedMesh(this.splatGeo, this.splatMat, this.MAXI);
      this.splats.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.MAXI * 3), 3);
      this.splats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.splats.instanceColor.setUsage(THREE.DynamicDrawUsage);
      this.splats.frustumCulled = false; this.splats.count = 0;
      this.splatScene = new THREE.Scene(); this.splatScene.add(this.splats);
      this.splatCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.queue = []; this.pool = [];
      this.needClear = true;
      this.floorMat = this._floorMat();
      // wall paint
      this.wall = new Map();
      this.WALLMAX = 700; this.wallI = 0; this.wallN = 0;
      const wg = G.Geo && G.Geo.splatGeo ? G.Geo.splatGeo(1) : new THREE.CircleGeometry(1, 14);
      const wm = G.M.toonUnique(0xffffff, { rimStr: 0.18, spec: 0.6 });
      wm.polygonOffset = true; wm.polygonOffsetFactor = -4; wm.polygonOffsetUnits = -4;
      this.wallMesh = new THREE.InstancedMesh(wg, wm, this.WALLMAX);
      this.wallMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.WALLMAX * 3), 3);
      this.wallMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.wallMesh.count = 0; this.wallMesh.frustumCulled = false; this.wallMesh.renderOrder = 2;
      world.add(this.wallMesh);
      // minimap image (one pixel per cell, row j = world z)
      this.mm = document.createElement('canvas'); this.mm.width = this.nx; this.mm.height = this.nz;
      this.mmCtx = this.mm.getContext('2d');
      this.mmImg = this.mmCtx.createImageData(this.nx, this.nz);
      this.mmBase = new Uint8Array(N * 3);
      this.mmDirty = true;
    }

    _floorMat() {
      const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
      Object.assign(u, G.R.light, {
        uPaint: { value: this.rt.texture }, uRect: { value: this.rect }, uTexel: { value: new THREE.Vector2(1 / this.res, 1 / this.res) },
        uColA: { value: this.colA }, uColB: { value: this.colB }, uPat: { value: this.pattern ? 1 : 0 },
        uMask: { value: this.htex }, uMTexel: { value: new THREE.Vector2(1 / this.nx, 1 / this.nz) },
        uBump: { value: 3.2 * this.res / 1024 * 1.6 }, uTime: { value: 0 },
      });
      // a house soft-toon material for the tier system: syncToon keeps its SUN_SHADOW define in line with the tier
      // (Ultra: the arena's blocks, walls and rangers cast onto the floor), and the floor mesh casts too
      const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS, vertexColors: true, fog: true, lights: false, defines: G.R.toonDefines() });
      m.userData.turfFloor = true; m.userData.toon = true; m.userData.tierDefs = true;
      return m;
    }
    // Behind the loading screen (call once the grid is final): allocate the paint target and link the splat program
    // by clearing the target and drawing the batch once with a zero-size stamp, so the first gameplay flush() neither
    // allocates a 1–4 MB texture nor compiles a shader. (R.warmup only draws the scene and the viewmodel.)
    prime() {
      const r = G.R.renderer;
      if (!r || (G.R.isLost && G.R.isLost())) return;
      G.safe('turf paint prime', () => {
        const prev = r.getRenderTarget(), cc = r.getClearColor(_c).getHex(), ca = r.getClearAlpha();
        try {
          r.setRenderTarget(this.rt); r.setClearColor(0x000000, 0); r.clear(true, false, false);
          this.needClear = false;
          const me = this.splats.instanceMatrix.array;
          for (let i = 0; i < 16; i++) me[i] = 0;           // zero scale: a degenerate quad, nothing is drawn
          me[15] = 1;
          this.splats.count = 1;
          this.splats.instanceMatrix.needsUpdate = true; this.splats.instanceColor.needsUpdate = true;
          r.render(this.splatScene, this.splatCam);
        } finally {
          this.splats.count = 0;
          r.setRenderTarget(prev); r.setClearColor(cc, ca);
        }
      });
    }

    // ---------------------------------------------------------------- grid setup
    idx(x, z) {
      const i = Math.floor((x - this.minX) / CELL), j = Math.floor((z - this.minZ) / CELL);
      if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
      return j * this.nx + i;
    }
    ownerAt(x, z) { const k = this.idx(x, z); return k < 0 ? 255 : this.owner[k]; }
    heightAt(x, z) { const k = this.idx(x, z); return k < 0 ? -99 : this.h[k]; }
    cellX(i) { return this.minX + (i + 0.5) * CELL; }
    cellZ(j) { return this.minZ + (j + 0.5) * CELL; }
    // Sample the top walkable surface of every cell from the physics world.
    buildHeights(phys, maxH) {
      for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
        const k = j * this.nx + i;
        const h = phys.groundAt(this.cellX(i), this.cellZ(j), 0.02, 99);
        this.h[k] = h;
        this.owner[k] = h > maxH ? 255 : 0;
      }
    }
    // Mark an XZ rectangle uninkable (grates, prop footprints).
    markRect(x0, z0, x1, z1) {
      for (let j = 0; j < this.nz; j++) {
        const z = this.cellZ(j); if (z < z0 || z > z1) continue;
        for (let i = 0; i < this.nx; i++) { const x = this.cellX(i); if (x >= x0 && x <= x1) this.owner[j * this.nx + i] = 255; }
      }
    }
    markCircle(cx, cz, r) { this.markRect(cx - r, cz - r, cx + r, cz + r); }
    finalize() {
      let ink = 0;
      const N = this.nx * this.nz;
      for (let k = 0; k < N; k++) {
        const un = this.owner[k] === 255;
        if (!un) ink++;
        const hc = fmax(0, fmin(255, Math.round((this.h[k] - HMIN) / HRANGE * 255)));
        this.hdata[k * 4] = hc; this.hdata[k * 4 + 1] = un ? 255 : 0; this.hdata[k * 4 + 2] = 0; this.hdata[k * 4 + 3] = 255;
      }
      this.inkable = fmax(1, ink);
      this.counts[0] = this.counts[1] = this.counts[2] = 0;
      this.htex.needsUpdate = true;
      // minimap base colours: pale floor, darker raised blocks, grey grates
      for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
        const k = j * this.nx + i, h = this.h[k];
        let r = 236, g = 240, b = 248;
        if (this.owner[k] === 255) {
          if (h > 4.5) { r = 150; g = 140; b = 196; } else { r = 140; g = 150; b = 172; }
          if (((i + j) & 3) === 0) { r *= 0.8; g *= 0.8; b *= 0.86; }   // hatched, like the floor: "no goo here"
        }
        else if (h > 0.6) { const f = fmin(1, h / 4); r = 236 - 52 * f; g = 240 - 46 * f; b = 248 - 18 * f; }
        // edge shading where height steps
        if (i > 0 && j > 0) { const dh = Math.abs(h - this.h[k - 1]) + Math.abs(h - this.h[k - this.nx]); if (dh > 0.6) { r *= 0.72; g *= 0.72; b *= 0.8; } }
        this.mmBase[k * 3] = r; this.mmBase[k * 3 + 1] = g; this.mmBase[k * 3 + 2] = b;
      }
      this.mmDirty = true;
    }
    coverage() { return [this.counts[1] / this.inkable, this.counts[2] / this.inkable]; }

    // ---------------------------------------------------------------- painting
    // Stamp a disc into the CPU grid. Only cells whose surface lies within YTOL of y change. Returns changed cells.
    _stamp(x, y, z, r, team) {
      const re = fmax(r, 0.36);
      const i0 = fmax(0, Math.floor((x - re - this.minX) / CELL)), i1 = fmin(this.nx - 1, Math.floor((x + re - this.minX) / CELL));
      const j0 = fmax(0, Math.floor((z - re - this.minZ) / CELL)), j1 = fmin(this.nz - 1, Math.floor((z + re - this.minZ) / CELL));
      const r2 = re * re, O = this.owner, H = this.h, C = this.counts, nx = this.nx;
      let ch = 0;
      for (let j = j0; j <= j1; j++) {
        const dz = this.minZ + (j + 0.5) * CELL - z;
        for (let i = i0; i <= i1; i++) {
          const dx = this.minX + (i + 0.5) * CELL - x;
          if (dx * dx + dz * dz > r2) continue;
          const k = j * nx + i, o = O[k];
          if (o === 255 || o === team) continue;
          if (Math.abs(H[k] - y) > YTOL) continue;
          if (o) { C[o]--; this.conv++; }
          O[k] = team; C[team]++; ch++;
        }
      }
      if (ch) this.mmDirty = true;
      return ch;
    }
    _queue(x, y, z, r, team) {
      if (this.queue.length > 600) return;
      const s = this.pool.pop() || { x: -0, y: -0, z: -0, r: -0, t: 1, rot: -0, seed: -0 };   // (doubles from the start: one shape)
      s.x = x; s.y = y; s.z = z; s.r = r; s.t = team; s.rot = frand() * 6.2832; s.seed = frand();
      this.queue.push(s);
    }
    // Paint a floor splat (team 1|2). Adds a few satellite droplets for organic edges. Returns changed cells.
    paint(x, y, z, r, team, noDrops) {
      this.conv = 0;
      if (this.lock || (team !== 1 && team !== 2) || !(r > 0)) return 0;
      let ch = this._stamp(x, y, z, r, team);
      this._queue(x, y, z, r, team);
      if (!noDrops && r >= 0.5) {
        const n = r > 1.6 ? 4 : r > 0.9 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const a = frand() * 6.2832, d = r * (0.95 + frand() * 0.45), rr = r * (0.2 + frand() * 0.16);
          const dx = x + Math.cos(a) * d, dz = z + Math.sin(a) * d;
          const hy = this.heightAt(dx, dz);
          if (Math.abs(hy - y) > YTOL) continue;
          ch += this._stamp(dx, hy, dz, rr, team);
          this._queue(dx, hy, dz, rr, team);
        }
      }
      return ch;
    }
    // Vertical surface: instanced decal + wall hash (for climbing). No score.
    paintWall(p, nrm, r, team) {
      if (this.lock || (team !== 1 && team !== 2)) return;
      _n.set(nrm.x, 0, nrm.z);
      if (_n.lengthSq() < 0.01) return;
      _n.normalize();
      const i = this.wallI; this.wallI = (this.wallI + 1) % this.WALLMAX; this.wallN = fmin(this.WALLMAX, this.wallN + 1);
      _q.setFromUnitVectors(ZAX, _n); _q2.setFromAxisAngle(_n, frand() * 6.2832); _q.premultiply(_q2);
      _v.set(p.x + _n.x * 0.03, p.y, p.z + _n.z * 0.03);
      const sc = r * 1.05;
      _m.compose(_v, _q, _s.set(sc, sc, sc));
      this.wallMesh.setMatrixAt(i, _m);
      _c.copy(team === 1 ? this.colA : this.colB).multiplyScalar(1.04);
      this.wallMesh.instanceColor.setXYZ(i, _c.r, _c.g, _c.b);
      this.wallMesh.count = this.wallN;
      this.wallMesh.instanceMatrix.needsUpdate = true; this.wallMesh.instanceColor.needsUpdate = true;
      // hash cells on the wall plane (tangent t = up × n)
      _t.set(_n.z, 0, -_n.x);
      for (let a = -r; a <= r + 1e-3; a += 0.5) for (let b = -r; b <= r + 1e-3; b += 0.5) {
        if (a * a + b * b > r * r + 0.1) continue;
        const qx = p.x + _t.x * a - _n.x * 0.15, qy = p.y + b, qz = p.z + _t.z * a - _n.z * 0.15;
        this.wall.set(this._wkey(qx, qy, qz), team);
      }
    }
    _wkey(x, y, z) { return (Math.floor(x / CELL) + 160) + (Math.floor(y / CELL) + 32) * 320 + (Math.floor(z / CELL) + 200) * 320 * 128; }
    wallAt(x, y, z) { return this.wall.get(this._wkey(x, y, z)) || 0; }

    // Upload queued splats into the paint render target (call once per frame, after gameplay).
    flush() {
      const r = G.R.renderer;
      if (!r) return;
      if (this.needClear) {
        const prev = r.getRenderTarget(); const cc = r.getClearColor(_c).getHex(); const ca = r.getClearAlpha();
        r.setRenderTarget(this.rt); r.setClearColor(0x000000, 0); r.clear(true, false, false);
        r.setRenderTarget(prev); r.setClearColor(cc, ca);
        this.needClear = false;
      }
      const len = this.queue.length;
      if (!len) return;
      const n = fmin(this.MAXI, len);
      const me = this.splats.instanceMatrix.array, ce = this.splats.instanceColor.array;
      for (let i = 0; i < n; i++) {
        const s = this.queue[i];
        const R = s.r / 0.75, c = Math.cos(s.rot) * R, sn = Math.sin(s.rot) * R, o = i * 16;
        me[o] = c; me[o + 1] = 0; me[o + 2] = -sn; me[o + 3] = 0;
        me[o + 4] = 0; me[o + 5] = 1; me[o + 6] = 0; me[o + 7] = 0;
        me[o + 8] = sn; me[o + 9] = 0; me[o + 10] = c; me[o + 11] = 0;
        me[o + 12] = s.x; me[o + 13] = s.y; me[o + 14] = s.z; me[o + 15] = 1;
        ce[i * 3] = s.t === 1 ? 1 : 0; ce[i * 3 + 1] = s.t === 2 ? 1 : 0; ce[i * 3 + 2] = s.seed;
        this.pool.push(s);
      }
      for (let i = n; i < len; i++) this.queue[i - n] = this.queue[i];
      this.queue.length = len - n;
      this.splats.count = n;
      this.splats.instanceMatrix.needsUpdate = true; this.splats.instanceColor.needsUpdate = true;
      const prev = r.getRenderTarget();
      r.setRenderTarget(this.rt);
      r.render(this.splatScene, this.splatCam);
      r.setRenderTarget(prev);
    }
    tick(t) { this.floorMat.uniforms.uTime.value = t; }

    // Redraw the minimap image from the grid (call at ~2 Hz).
    updateMinimap() {
      if (!this.mmDirty) return this.mm;
      this.mmDirty = false;
      const d = this.mmImg.data, O = this.owner, B = this.mmBase, nx = this.nx, N = nx * this.nz;
      const ar = (this.hexA >> 16) & 255, ag = (this.hexA >> 8) & 255, ab = this.hexA & 255;
      const br = (this.hexB >> 16) & 255, bg = (this.hexB >> 8) & 255, bb = this.hexB & 255;
      const pat = this.pattern;
      for (let k = 0; k < N; k++) {
        const o = O[k], p = k * 4;
        if (o === 1) {
          const lt = pat && (((k % nx) + ((k / nx) | 0)) & 3) < 2 ? 0.78 : 1;
          d[p] = ar * lt; d[p + 1] = ag * lt; d[p + 2] = ab * lt;
        } else if (o === 2) {
          const i = k % nx, j = (k / nx) | 0, dot = pat && i % 3 === 0 && j % 3 === 0;
          d[p] = dot ? 255 : br; d[p + 1] = dot ? 255 : bg; d[p + 2] = dot ? 255 : bb;
        } else { d[p] = B[k * 3]; d[p + 1] = B[k * 3 + 1]; d[p + 2] = B[k * 3 + 2]; }
        d[p + 3] = 240;
      }
      this.mmCtx.putImageData(this.mmImg, 0, 0);
      return this.mm;
    }

    dispose() {
      this.rt.dispose(); this.htex.dispose(); this.splatMat.dispose(); this.splatGeo.dispose();
      this.queue.length = 0;
    }
  }
  T.Paint = Paint;
  T.CELL = CELL;
})(window.G);

}).call(window); } catch (e) { console.error('[module 24b_turf_paint.js]', e); }
// ---- 24c_turf_arena.js
try { (function () {
// 24c_turf_arena.js — Goo Turf arenas: 60 × 80 m, rotationally symmetric about the centre (x,z) → (-x,-z).
// Team A (player) spawns at +Z facing -Z; Team B is the 180° copy. Each layout row describes Team A's half and
// is mirrored automatically unless its last flag is 1 (self-symmetric centre pieces).
//   ['pad'|'wall'|'low'|'crate'|'perch'|'tower'|'step'|'pillar'|'reef', x0,z0,x1,z1, y0,y1 (, single)]
//   ['ramp', x0,z0,x1,z1, height, '+z'|'-z'|'+x'|'-x' (direction it rises toward) (, single)]
//   ['grate', x0,z0,x1,z1 (, single)]  — uninkable metal floor (~10–15% of the floor with the walkways)
// All walkable geometry is merged into one mesh using the paint floor material (24b); railings, piles and
// trims go into one vertex-coloured deco mesh. Props come from the shared G.Geo kit.
(function (G) {
  'use strict';
  // Math.max / min / sign / hypot / random hand back a fresh heap number from the mid-tier (Maglev) compiled code that
  // runs most per-frame code (measured 12-36 bytes a call); these plain twins are inlined and allocate nothing.
  // frand: xorshift32, its state in an Int32Array (updating a typed array never boxes); frange(a, b) = U.rand(a, b).
  const fmax = (a, b) => (a > b ? a : b), fmin = (a, b) => (a < b ? a : b), fsign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const fhyp = (x, y) => Math.sqrt(x * x + y * y);
  const _rs = new Int32Array(1); _rs[0] = (Math.random() * 0x7fffffff) | 1;
  const frand = () => { let x = _rs[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _rs[0] = x; return (x >>> 0) / 4294967296; };
  const frange = (a, b) => a + frand() * (b - a);
  const T = G.Turf = G.Turf || {};
  const V3 = THREE.Vector3;
  const _c = new THREE.Color(), _c2 = new THREE.Color();

  T.ARENAS = {
    plaza: {
      id: 'plaza', nameKey: 'turf.arena.plaza', sky: 'meadow', water: { shallow: 0x7fe8e0, deep: 0x1d8fc0 },
      pad: { x0: -8, z0: 33, x1: 8, z1: 40, y: 2 },
      spawns: [[0, 36.5], [-4.5, 36], [4.5, 36], [-2.2, 38.8], [2.2, 38.8], [-6, 38.5], [6, 38.5]],
      // (walkable tops stay pale neutrals so the goo reads; the side faces — never painted — carry the colour)
      styles: {
        pad: { top: 0xf1ece2, side: 0xc9c2e6, mat: 1, sideMat: 4 },
        ramp: { top: 0xeef0f6, side: 0x9fd2f5, mat: 1 },
        wall: { top: 0xf4f6fa, side: 0x8fcdf7, mat: 4, trim: 0xffffff },
        low: { top: 0xf4f6fa, side: 0x9fe6c4, mat: 4 },
        crate: { top: 0xefdcbd, side: 0xffb85c, mat: 2 },
        perch: { top: 0xdde7f2, side: 0xc4b2ff, mat: 1, sideMat: 4 },
        tower: { top: 0xe9e4f5, side: 0xff9cc8, mat: 1, sideMat: 5 },
        step: { top: 0xeef0f6, side: 0xc4b2ff, mat: 1 },
        grate: { top: 0x8a93a8, side: 0x6d7690, mat: 3 },
      },
      // stage dressing (24c dressArena): trims, decals, floor accents, stands, bunting, team arches, landmarks
      theme: {
        trim: 0xffffff, band: 0xffd45c, foot: 0x4f5aa8, stud: 0xffd23f, bumper: [0xff8fb8, 0xfff6ea],
        panel: [0xffffff, 0xfff3c4], emblems: ['star', 'bolt', 'heart'], emblemCols: [0xff7aa8, 0x3fb8ff, 0xffa63d],
        // (review: no orange crates — the side faces take goo, and a tangerine-ish crate hid Team A's wall goo)
        crates: [0xffe07a, 0xff8fb8, 0x8fe08a, 0xb9a2ff, 0x7fe6d8],
        tiles: [0xbfe4ff, 0xffe7a3, 0xc6f0d6, 0xffd0e4],
        stand: [0x7fd0ff, 0xfff6ea, 0x4f5aa8, 0xff8fb8, 0xffffff], deck: 0xd6a873,
        crowd: { kinds: ['puff', 'bot'], cols: [0xffd0e0, 0xbfe8ff, 0xfff0b0, 0xd8c8ff, 0xc8f5d8, 0xffc8a8, 0xffffff] },
        bunting: [0xff6b8b, 0xffd23f, 0x3fe0b8, 0x5fc8ff, 0xb983ff, 0xffffff], landmark: 'park',
      },
      zone(x, z) {
        if (Math.abs(x) < 10 && Math.abs(z) < 9) return { c: 0xcfe3e8, m: 1 };
        if (z < 0) { x = -x; z = -z; }
        if (z > 25) return { c: 0xe2e9ef, m: 1 };
        if (Math.abs(x) > 17) return { c: 0xe8d6bf, m: 2 };
        return { c: 0xd9dde8, m: 1 };
      },
      layout: [
        ['pad', -8, 33, 8, 40, 0, 2],
        ['ramp', -2.5, 27, 2.5, 33, 2, '+z'],
        ['wall', -30, 21, -24, 22.5, 0, 2.8], ['wall', -17, 21, -6, 22.5, 0, 2.8],
        ['wall', 6, 21, 17, 22.5, 0, 2.8], ['wall', 24, 21, 30, 22.5, 0, 2.8],
        ['crate', -1.5, 18, 1.5, 19.5, 0, 1.1],
        ['grate', -28.5, 24, -24, 32.5], ['grate', 24, 24, 28.5, 32.5],
        ['grate', -28.5, 13, -19, 15],
        ['crate', -23, 8, -21, 10, 0, 1.2], ['crate', -28, 3, -26, 5, 0, 1.0],
        ['low', -17.5, 5, -16.5, 15, 0, 1.1],
        ['crate', 20, 14, 22.5, 16, 0, 1.3], ['crate', 25, 6, 27, 8.5, 0, 1.0],
        ['grate', 19, 9.5, 28.5, 11.5],
        ['perch', 9, 3, 15, 8, 0, 2.6],
        ['ramp', 10, 8, 14, 14, 2.6, '-z'],
        ['tower', -3, -3, 3, 3, 0, 4, 1],
        ['step', 3, 1.5, 4.5, 3, 0, 2],
        ['crate', 6, -3.5, 7.5, -0.5, 0, 1.2],
        ['grate', -10, 6, -6, 9],
        ['crate', -9, 13, -6.5, 15, 0, 1.2],
        ['grate', -30, -33, -28.5, 33],
      ],
      props: [
        { k: 'banner', x: -8.4, y: 2, z: 33.5, team: 0 }, { k: 'banner', x: 8.4, y: 2, z: 33.5, team: 0 },
        { k: 'lamp', x: -17.6, z: 23.2 }, { k: 'lamp', x: 17.6, z: 23.2 },
        // (palm islets beyond the spectator stands, which line the long sides)
        { k: 'palm', x: -47, y: -0.6, z: 31, s: 1.3, out: 1 }, { k: 'palm', x: 47.5, y: -0.6, z: 12, s: 1.15, out: 1 },
        { k: 'palm', x: -48, y: -0.6, z: 2, s: 1.1, out: 1 },
      ],
    },
    coral: {
      id: 'coral', nameKey: 'turf.arena.coral', sky: 'reef', water: { shallow: 0x8ff0e4, deep: 0x1a9ec8 },
      pad: { x0: -7, z0: 33, x1: 7, z1: 40, y: 2 },
      spawns: [[0, 36.5], [-4, 36], [4, 36], [-2, 38.8], [2, 38.8], [-5.5, 38.6], [5.5, 38.6]],
      styles: {
        pad: { top: 0xf3eee6, side: 0xe7c6cd, mat: 1, sideMat: 4 },
        ramp: { top: 0xf2ece4, side: 0xffb3a8, mat: 1 },
        wall: { top: 0xfbf5f0, side: 0xff9fa6, mat: 4, trim: 0xffffff },
        low: { top: 0xfbf5f0, side: 0x86e4d6, mat: 4 },
        crate: { top: 0xf2e2c4, side: 0xffb37a, mat: 2 },
        perch: { top: 0xd8ebe5, side: 0x86e4d6, mat: 1, sideMat: 4 },
        reef: { top: 0xf5e6dc, side: 0xff8f9e, mat: 1, sideMat: 4 },
        pillar: { top: 0xf7ebe3, side: 0x5fd8e8, mat: 1, sideMat: 5 },
        grate: { top: 0x8a93a8, side: 0x6d7690, mat: 3 },
      },
      theme: {
        trim: 0xffffff, band: 0x2cc3d6, foot: 0x3a4a8a, stud: 0xffd45c, bumper: [0x2cc3d6, 0xfff6ea],
        panel: [0xffffff, 0xd8fbf4], emblems: ['star', 'heart', 'splat'], emblemCols: [0xffa63d, 0xff6f91, 0x2cc3d6],
        crates: [0xc8a8ff, 0x7fe6d8, 0xffd45c, 0xff9fb8, 0xa8f0b8],
        tiles: [0xffd8c8, 0xc8f4ee, 0xffeeb0, 0xe0d4ff],
        stand: [0xff9fa6, 0xfff6ea, 0x3a4a8a, 0x2cc3d6, 0xffffff], deck: 0xe0b483,
        crowd: { kinds: ['jelly', 'puff'], cols: [0xffc8d8, 0xb8f4ec, 0xffe8a8, 0xffd0b0, 0xd8d0ff, 0xffffff] },
        bunting: [0xff6f91, 0x2cc3d6, 0xffd45c, 0xffffff, 0xff9a5a, 0x7fe6d8], landmark: 'cove',
      },
      zone(x, z) {
        if (fhyp(x, z) < 10) return { c: 0xf1e2d8, m: 1 };
        if (z < 0) { x = -x; z = -z; }
        if (z > 25) return { c: 0xe8eeee, m: 1 };
        if (Math.abs(x) > 20) return { c: 0xe9d8c0, m: 2 };
        return { c: 0xeee5d3, m: 1 };
      },
      layout: [
        ['pad', -7, 33, 7, 40, 0, 2],
        ['ramp', -11, 34, -7, 40, 2, '+x'], ['ramp', 7, 34, 11, 40, 2, '-x'],
        ['wall', -30, 22, -20, 23.5, 0, 2.8], ['wall', -12, 22, -4, 23.5, 0, 2.8],
        ['wall', 4, 22, 12, 23.5, 0, 2.8], ['wall', 20, 22, 30, 23.5, 0, 2.8],
        ['grate', -28.5, 25, -22, 32], ['grate', 22, 25, 28.5, 32],
        ['reef', -5, -1.5, 5, 1.5, 0, 1.4, 1], ['reef', -1.5, -5, 1.5, 5, 0, 1.4, 1],
        ['pillar', -1.5, -1.5, 1.5, 1.5, 0, 3.2, 1],
        ['perch', 12, 2, 17, 7, 0, 2.4], ['ramp', 13, 7, 16, 13, 2.4, '-z'],
        ['wall', -9.5, 6, -8, 14, 0, 2.8],
        ['crate', 6, 14, 9, 15.5, 0, 1.1], ['crate', -3, 16, 3, 17.5, 0, 1.0],
        ['crate', -26, 10, -23.5, 12.5, 0, 1.2], ['grate', -28.5, 4, -21, 6],
        ['crate', 22, 16, 24.5, 18, 0, 1.2], ['grate', 21, 11, 28.5, 13],
        ['grate', 4, 6, 7, 9],
        ['grate', -30, -33, -28.5, 33],
      ],
      props: [
        { k: 'banner', x: -7.4, y: 2, z: 33.5, team: 0 }, { k: 'banner', x: 7.4, y: 2, z: 33.5, team: 0 },
        { k: 'coral', x: 0, y: 3.2, z: 0, kind: 0, s: 1.4, single: 1 },
        { k: 'lamp', x: -12.6, z: 24.2 }, { k: 'lamp', x: 12.6, z: 24.2 },
        { k: 'palm', x: -47, y: -0.6, z: 26, s: 1.25, out: 1 }, { k: 'palm', x: 47.5, y: -0.6, z: 6, s: 1.1, out: 1 },
        { k: 'coral', x: -46, y: -0.6, z: 12, kind: 2, s: 1.8, out: 1 }, { k: 'coral', x: 46, y: -0.6, z: 28, kind: 3, s: 1.7, out: 1 },
      ],
    },
  };
  T.ARENA_ORDER = ['plaza', 'coral'];
  T.RECT = { minX: -30, maxX: 30, minZ: -40, maxZ: 40 };

  // ------------------------------------------------------------------ mirroring helpers
  const flipDir = d => ({ '+z': '-z', '-z': '+z', '+x': '-x', '-x': '+x' }[d] || d);
  // Expand a layout into world rows (both halves).
  T.expandLayout = function (spec) {
    const out = [];
    for (const row of spec.layout) {
      const t = row[0];
      const single = t === 'grate' ? row[5] === 1 : t === 'ramp' ? row[7] === 1 : row[7] === 1;
      out.push(row.slice(0, t === 'grate' ? 5 : 7).concat([0]));
      if (single) continue;
      const m = row.slice();
      m[1] = -row[3]; m[3] = -row[1]; m[2] = -row[4]; m[4] = -row[2];
      if (t === 'ramp') m[6] = flipDir(row[6]);
      out.push(m.slice(0, t === 'grate' ? 5 : 7).concat([1]));
    }
    return out;
  };

  // ------------------------------------------------------------------ geometry builder
  class Builder {
    constructor() { this.p = []; this.n = []; this.c = []; this.m = []; }
    v(x, y, z, nx, ny, nz, col, mat) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); this.m.push(mat); }
    // Append a BufferGeometry translated by (ox,oy,oz); colour/material chosen per triangle by cfn(nx,ny,nz,cy) -> [Color, mat].
    geo(g, ox, oy, oz, cfn) {
      const P = g.attributes.position, N = g.attributes.normal, I = g.index;
      const cnt = I ? I.count : P.count;
      for (let t = 0; t < cnt; t += 3) {
        const ia = I ? I.getX(t) : t, ib = I ? I.getX(t + 1) : t + 1, ic = I ? I.getX(t + 2) : t + 2;
        const fny = (N.getY(ia) + N.getY(ib) + N.getY(ic)) / 3;
        const fnx = (N.getX(ia) + N.getX(ib) + N.getX(ic)) / 3, fnz = (N.getZ(ia) + N.getZ(ib) + N.getZ(ic)) / 3;
        for (const k of [ia, ib, ic]) {
          const y = P.getY(k) + oy;
          const r = cfn(fnx, fny, fnz, y, N.getY(k));
          this.v(P.getX(k) + ox, y, P.getZ(k) + oz, N.getX(k), N.getY(k), N.getZ(k), r[0], r[1]);
        }
      }
    }
    // Quad a,b,c,d (counter-clockwise seen from the outside), flat normal.
    quad(a, b, c, d, col, mat) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (const q of [a, b, c, a, c, d]) this.v(q[0], q[1], q[2], nx, ny, nz, col, mat);
    }
    tri(a, b, c, col, mat) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (const q of [a, b, c]) this.v(q[0], q[1], q[2], nx, ny, nz, col, mat);
    }
    mesh(mat) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.m, 1));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      return mesh;
    }
  }

  function colOf(hex) { return new THREE.Color(hex); }

  // Rounded block with top/side colours, bottom AO darkening and a light trim under the top edge.
  function block(B, x0, z0, x1, z1, y0, y1, st) {
    const w = x1 - x0, d = z1 - z0, h = y1 - y0;
    const r = fmin(0.14, fmin(w * 0.2, fmin(d * 0.2, h * 0.3)));
    const g = G.Geo && G.Geo.roundedBox ? G.Geo.roundedBox(w, h, d, r, 1) : new THREE.BoxGeometry(w, h, d);
    const top = colOf(st.top), side = colOf(st.side), low = colOf(st.side).multiplyScalar(0.8);
    const sm = st.sideMat != null ? st.sideMat : (st.mat === 4 ? 4 : 0);
    B.geo(g, (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, (nx, ny, nz, y) => {
      if (ny > 0.55) return [top, st.mat || 0];
      if (ny < -0.5) return [side, 0];
      return [(y - y0) < 0.05 && h > 0.5 ? low : side, sm];   // fake AO: darker at the foot
    });
    g.dispose();
  }
  // Wedge ramp rising toward dir. Visual surface is smooth; physics uses steps (see addRampPhys).
  function ramp(B, x0, z0, x1, z1, h, dir, st) {
    const top = colOf(st.top), side = colOf(st.side), edge = colOf(0xffd86a);
    let lo, hi; // corner lists: low edge [a,b], high edge [c,d] (each [x,z])
    if (dir === '+z') { lo = [[x0, z0], [x1, z0]]; hi = [[x1, z1], [x0, z1]]; }
    else if (dir === '-z') { lo = [[x1, z1], [x0, z1]]; hi = [[x0, z0], [x1, z0]]; }
    else if (dir === '+x') { lo = [[x0, z1], [x0, z0]]; hi = [[x1, z0], [x1, z1]]; }
    else { lo = [[x1, z0], [x1, z1]]; hi = [[x0, z1], [x0, z0]]; }
    const a = [lo[0][0], 0.02, lo[0][1]], b = [lo[1][0], 0.02, lo[1][1]], c = [hi[0][0], h, hi[0][1]], d = [hi[1][0], h, hi[1][1]];
    const c0 = [hi[0][0], 0, hi[0][1]], d0 = [hi[1][0], 0, hi[1][1]];
    // top: ensure upward normal
    const t1 = [a, b, c, d];
    const ux = b[0] - a[0], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    const ny = uz * wx - ux * wz;
    if (ny > 0) B.quad(t1[0], t1[1], t1[2], t1[3], top, st.mat || 1); else B.quad(t1[3], t1[2], t1[1], t1[0], top, st.mat || 1);
    // side edge stripes (thin yellow strips along the two long edges)
    const s0 = [a, d], s1 = [b, c];
    for (const s of [s0, s1]) {
      const p = s[0], q = s[1];
      const ex = (q === d ? (a[0] - b[0]) : (b[0] - a[0])), ez = (q === d ? (a[2] - b[2]) : (b[2] - a[2]));
      const el = fhyp(ex, ez) || 1, k = 0.22 / el;
      const p2 = [p[0] - ex * k, p[1] + 0.012, p[2] - ez * k], q2 = [q[0] - ex * k, q[1] + 0.012, q[2] - ez * k];
      const pp = [p[0], p[1] + 0.012, p[2]], qq = [q[0], q[1] + 0.012, q[2]];
      const ux2 = p2[0] - pp[0], uz2 = p2[2] - pp[2], wx2 = qq[0] - pp[0], wz2 = qq[2] - pp[2];
      if (uz2 * wx2 - ux2 * wz2 > 0) B.quad(pp, p2, q2, qq, edge, 0); else B.quad(qq, q2, p2, pp, edge, 0);
    }
    // high-end vertical face and side triangles
    const back = [d0, c0, c, d];
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const outward = (poly) => { // flip if normal points to the ramp centre
      const p = poly[0], q = poly[1], r = poly[2];
      const nx = (q[1] - p[1]) * (r[2] - p[2]) - (q[2] - p[2]) * (r[1] - p[1]);
      const nz = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const mx = poly.reduce((s, v) => s + v[0], 0) / poly.length - cx, mz = poly.reduce((s, v) => s + v[2], 0) / poly.length - cz;
      return nx * mx + nz * mz >= 0 ? poly : poly.slice().reverse();
    };
    const bq = outward(back); B.quad(bq[0], bq[1], bq[2], bq[3], side, 0);
    const s1t = outward([a, d0, d]); B.tri(s1t[0], s1t[1], s1t[2], side, 0);
    const s2t = outward([b, c0, c]); B.tri(s2t[0], s2t[1], s2t[2], side, 0);
  }
  // Stepped colliders like G.Geo.ramp: tops at h*(i-0.35)/n.
  function addRampPhys(phys, x0, z0, x1, z1, h, dir) {
    const n = fmax(2, Math.ceil(h / 0.25));
    const alongZ = dir === '+z' || dir === '-z';
    const L = alongZ ? z1 - z0 : x1 - x0;
    for (let i = 1; i <= n; i++) {
      const top = h * (i - 0.35) / n;
      const a = L * (i - 1) / n, b = L * i / n;
      let s0, s1;
      if (dir === '+z' || dir === '+x') { s0 = a; s1 = b; } else { s0 = L - b; s1 = L - a; }
      if (alongZ) phys.addAABB(x0, -0.5, z0 + s0, x1, top, z0 + s1, 'ramp');
      else phys.addAABB(x0 + s0, -0.5, z0, x0 + s1, top, z1, 'ramp');
    }
  }

  // Ground: 2 m quads with per-quad zone colour + material (flat so patterns don't blend), plus pier skirt.
  // Corner vertices pick up contact occlusion from the blocks standing on the floor (aoRects).
  // Floor tile accents (the floor's vertex colour only — the paint grid and the goo never read it): a pastel medallion
  // ring around the centre, dashed lane lines down both side lanes, a sprinkle of mosaic tiles, and each team's base
  // apron washed lightly with its team colour (so either team's goo still reads on it) with a dashed team line at its
  // edge. Team colours come from the match (colour-blind palette included).
  const _ac = new THREE.Color(), _ac2 = new THREE.Color();
  function accentTile(c, spec, x, z, colors) {
    const th = spec.theme;
    if (!th || !colors) return;
    const T4 = th.tiles, r = fhyp(x, z), ax = Math.abs(x), az = Math.abs(z);
    const hash = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1, hh = hash < 0 ? hash + 1 : hash;
    if (r > 6.2 && r < 9.8) {
      const sec = Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 6));
      c.lerp(_ac.setHex(T4[sec & 1]), r > 8 ? 0.62 : 0.42);
      return;
    }
    if (az > 24.9) {
      // (review: the dashed edge is a white court line, not a 40 % team tint — that read as a spotty band of the team's
      // own goo right in front of each base; the apron keeps only a faint team wash)
      const edge = az < 27 && (Math.floor((x + 100) / 2) & 1) === 0;
      if (edge) c.lerp(_ac.setHex(0xffffff), 0.6);
      else c.lerp(_ac.setHex(z > 0 ? colors.a : colors.b), 0.08);
      return;
    }
    if (ax > 18 && ax < 20 && az > 3 && az < 21 && (Math.floor((z + 100) / 2) & 1) === 0) { c.lerp(_ac.setHex(T4[2]), 0.5); return; }
    if (hh < 0.035 && r > 10) c.lerp(_ac.setHex(T4[3]), 0.3);
  }
  function ground(B, spec, rect, aoRects, colors) {
    const s = 2, rnd = G.rng(77);
    const tmp = new THREE.Color();
    const ao = (x, z) => {
      let m = 1;
      for (const r of aoRects) {
        const dx = fmax(r[0] - x, fmax(0, x - r[2])), dz = fmax(r[1] - z, fmax(0, z - r[3])), d = fhyp(dx, dz);
        if (d < 1.6) m *= 1 - r[4] * (1 - d / 1.6) * (1 - d / 1.6);
      }
      return fmax(0.62, m);
    };
    for (let x = rect.minX; x < rect.maxX - 1e-3; x += s) for (let z = rect.minZ; z < rect.maxZ - 1e-3; z += s) {
      const zn = spec.zone(x + s / 2, z + s / 2);
      tmp.setHex(zn.c).multiplyScalar(0.975 + rnd() * 0.05);
      accentTile(tmp, spec, x + s / 2, z + s / 2, colors);
      const pts = [[x, 0, z + s], [x + s, 0, z + s], [x + s, 0, z], [x, 0, z]];
      if (!aoRects || !aoRects.length) { B.quad(pts[0], pts[1], pts[2], pts[3], tmp.clone(), zn.m); continue; }
      const cs = pts.map(p => tmp.clone().multiplyScalar(ao(p[0], p[2])));
      const n0 = B.p.length;
      B.quad(pts[0], pts[1], pts[2], pts[3], tmp, zn.m);
      // quad() wrote a, b, c, a, c, d: re-colour per corner
      const order = [0, 1, 2, 0, 2, 3];
      for (let q = 0; q < 6; q++) { const c = cs[order[q]], k = n0 + q * 3; B.c[k] = c.r; B.c[k + 1] = c.g; B.c[k + 2] = c.b; }
    }
    const sk = colOf(0xbfae96), skD = colOf(0x9c8a76);
    const y0 = -1.7, X0 = rect.minX, X1 = rect.maxX, Z0 = rect.minZ, Z1 = rect.maxZ;
    B.quad([X0, y0, Z1], [X1, y0, Z1], [X1, 0, Z1], [X0, 0, Z1], sk, 2);
    B.quad([X1, y0, Z0], [X0, y0, Z0], [X0, 0, Z0], [X1, 0, Z0], sk, 2);
    B.quad([X0, y0, Z0], [X0, y0, Z1], [X0, 0, Z1], [X0, 0, Z0], skD, 2);
    B.quad([X1, y0, Z1], [X1, y0, Z0], [X1, 0, Z0], [X1, 0, Z1], skD, 2);
  }

  // ------------------------------------------------------------------ stage dressing (visual only)
  // Everything below is vertex-coloured geometry merged into the arena's deco mesh, plus the shared flag batch, one crowd
  // mesh per critter kind and the animated parts of the far landmarks. No colliders and nothing on a walkable top: the
  // physics, the paint grid (buildHeights / markArena) and the coverage maths are exactly as before. Side faces DO take
  // goo (24b paintWall: splat decals 3 cm out from the face, and own-colour wall goo is what you climb), so everything on
  // a side face above the foot band stays under 2.5 cm proud — flat plaques, flat emblems, thin trims — and the decals
  // always draw over it (review fix: the first dressing stood 5-13 cm out and hid the goo you climb by). Low tier keeps
  // the bands, stands, arches and bunting only (no decals, crowd or rides); Medium seats about half the crowd, High most
  // of it, Ultra all of it.
  const PI = Math.PI, TAU = PI * 2;
  const mixHex = (a, b, k) => _ac.setHex(a).lerp(_ac2.setHex(b), k).getHex();
  const O_STUD = new THREE.OctahedronGeometry(0.055, 0); O_STUD.deleteAttribute('uv');
  // flat parts for the side faces (all face local +Z, back at z = 0): a rounded plaque d deep, a flat annulus, and an
  // emblem pressed flat (8 mm) — z-scale for G.Geo.emblem, whose relief is ±0.12 m
  const EMB_Z = 0.033;
  function plaque(w, h, r, d) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 3 }); g.deleteAttribute('uv');
    return g;
  }
  const annulus = (r0, r1, seg) => { const g = new THREE.RingGeometry(r0, r1, seg); g.deleteAttribute('uv'); return g; };
  // a band wrapping a block's four side faces (centre height yb, height bh, standing out by `out`)
  function band(kit, P, x0, z0, x1, z1, yb, bh, out, col) {
    const w = x1 - x0, d = z1 - z0;
    kit.add(P.box(w + out * 2, bh, out), col, (x0 + x1) / 2, yb, z1 + out / 2);
    kit.add(P.box(w + out * 2, bh, out), col, (x0 + x1) / 2, yb, z0 - out / 2);
    kit.add(P.box(out, bh, d), col, x1 + out / 2, yb, (z0 + z1) / 2);
    kit.add(P.box(out, bh, d), col, x0 - out / 2, yb, (z0 + z1) / 2);
  }
  // the four side faces as (centre x, centre z, length, ry): ry turns a part's local +Z onto the face's outward normal
  function faces(x0, z0, x1, z1) { return [[(x0 + x1) / 2, z1, x1 - x0, 0], [(x0 + x1) / 2, z0, x1 - x0, PI], [x1, (z0 + z1) / 2, z1 - z0, PI / 2], [x0, (z0 + z1) / 2, z1 - z0, -PI / 2]]; }
  // world position of a point on a face (lx along the face, lz out of it)
  const onFace = (f, lx, lz) => [f[0] + lx * Math.cos(f[3]) + lz * Math.sin(f[3]), f[1] - lx * Math.sin(f[3]) + lz * Math.cos(f[3])];
  // a thin disc facing local +Z (pre-turned, so a following yaw turns it onto any side face), back at z = 0, 8 mm deep
  const disc = (P, r, seg) => P.cyl(r, r, 0.008, seg).rotateX(PI / 2).translate(0, 0, 0.004);
  // does a ramp of the layout lean on this face (then no decal there)?
  function rampOn(rows, f) {
    for (const r of rows) {
      if (r[0] !== 'ramp') continue;
      const nx = Math.round(Math.sin(f[3])), nz = Math.round(Math.cos(f[3]));
      if (nz !== 0 && Math.abs((nz > 0 ? r[2] : r[4]) - f[1]) < 0.1 && r[1] < f[0] + f[2] / 2 && r[3] > f[0] - f[2] / 2) return true;
      if (nx !== 0 && Math.abs((nx > 0 ? r[1] : r[3]) - f[0]) < 0.1 && r[2] < f[1] + f[2] / 2 && r[4] > f[1] - f[2] / 2) return true;
    }
    return false;
  }
  function dressBlock(kit, P, rows, r, th, colors, ci, rich) {
    const t = r[0], x0 = r[1], z0 = r[2], x1 = r[3], z1 = r[4], y0 = r[5], y1 = r[6], h = y1 - y0;
    const onGround = y0 < 0.05, team = r[7] ? 1 : 0, teamCol = team ? colors.b : colors.a;
    const Geo = G.Geo, emb = Geo.emblem;
    // cap trim just under the rounded top edge, a coloured band below it, a dark foot band with studs (all < 2.5 cm out)
    band(kit, P, x0, z0, x1, z1, y1 - 0.12, 0.18, 0.022, t === 'pad' ? 0xffffff : th.trim);
    if (h > 0.9) band(kit, P, x0, z0, x1, z1, y1 - 0.33, 0.1, 0.016, t === 'pad' ? teamCol : th.band);
    if (onGround && h > 0.6) band(kit, P, x0, z0, x1, z1, y0 + 0.13, 0.24, 0.02, th.foot);
    const fs = faces(x0, z0, x1, z1);
    if (t === 'crate') {
      // bright crate: white corner posts, a mid strap and a bolt on the two long faces
      for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) kit.add(P.box(0.14, h - 0.06, 0.14), th.trim, cx, y0 + (h - 0.06) / 2, cz);
      band(kit, P, x0, z0, x1, z1, y0 + h * 0.5, 0.12, 0.016, mixHex(th.crates[ci % th.crates.length], 0x1e1a4d, 0.35));
      const lf = Math.max(x1 - x0, z1 - z0) - 0.01, es = Math.min(0.55, h * 0.45);
      if (rich && emb) for (const f of fs) if (f[2] >= lf) { const p = onFace(f, 0, 0.02); kit.add(emb(ci & 1 ? 'bolt' : 'star', 0xffffff).clone(), null, p[0], y0 + h * 0.5, p[1], 0, f[3], 0, es, es, EMB_Z); }
      return;
    }
    if (onGround && h > 0.6) for (const f of fs) {
      if (f[2] < 2) continue;
      const n = Math.floor(f[2] / 0.9);
      // (flattened studs: 2.7 cm proud, under the wall goo like the rest of the side-face dressing)
      for (let k = 0; k < n; k++) { const p = onFace(f, -f[2] / 2 + (k + 0.5) * (f[2] / n), 0.008); kit.add(O_STUD.clone(), th.stud, p[0], y0 + 0.13, p[1], 0, f[3], 0, 1, 1, 0.35); }
    }
    // inflatable bumpers on the ends of walls and low walls
    if (t === 'wall' || t === 'low') for (const f of fs) {
      if (f[2] > 2.2) continue;
      const p = onFace(f, 0, 0.1), bh = h - 0.62;
      if (bh < 0.25) continue;
      const cap = new THREE.CapsuleGeometry(0.17, bh, 2, 6); cap.deleteAttribute('uv');
      Geo.colorize(cap, (x, y) => (Math.floor((y + bh) / 0.32) & 1 ? th.bumper[1] : th.bumper[0]));
      kit.add(cap, null, p[0], y0 + 0.33 + bh / 2, p[1]);
    }
    if (!rich || !emb) return;
    if (t === 'pad') {
      // the team emblem twice on the face toward the arena (star = Team A, gear = Team B, as on the team banners)
      const f = fs[team ? 0 : 1];
      for (const lx of [-4.6, 4.6]) {
        const p = onFace(f, lx, 0.002), o = onFace(f, lx, 0.012), q = onFace(f, lx, 0.018);
        kit.add(disc(P, 0.62, 20), teamCol, p[0], y0 + h * 0.5, p[1], 0, f[3], 0);
        kit.add(annulus(0.58, 0.7, 20), 0xffffff, o[0], y0 + h * 0.5, o[1], 0, f[3], 0);
        kit.add(emb(team ? 'gear' : 'star', 0xffffff).clone(), null, q[0], y0 + h * 0.5, q[1], 0, f[3], 0, 0.82, 0.82, EMB_Z);
      }
      return;
    }
    if (t === 'tower' || t === 'pillar') {
      for (const f of fs) {
        if (rampOn(rows, f)) continue;
        const p = onFace(f, 0, 0.002), o = onFace(f, 0, 0.012), q = onFace(f, 0, 0.018), rr = Math.min(1.0, f[2] * 0.3), yy = y0 + h * 0.55;
        kit.add(disc(P, rr, 22), 0xffffff, p[0], yy, p[1], 0, f[3], 0);
        kit.add(annulus(rr - 0.05, rr + 0.07, 22), th.band, o[0], yy, o[1], 0, f[3], 0);
        kit.add(emb('star', th.emblemCols[0]).clone(), null, q[0], yy, q[1], 0, f[3], 0, rr * 1.35, rr * 1.35, EMB_Z);
      }
      return;
    }
    if (t === 'reef') {
      // coral polyps budding from the reef's side faces
      const rr = G.rng(Math.round(x0 * 7 + z0 * 13) + 99);
      for (const f of fs) for (let k = 0; k < Math.floor(f[2] / 1.2); k++) {
        const p = onFace(f, (rr() - 0.5) * (f[2] - 0.6), 0.06), g = new THREE.IcosahedronGeometry(0.1 + rr() * 0.08, 0); g.deleteAttribute('uv');
        kit.add(g, [0xff8a9a, 0xffb37a, 0xb983ff, 0xffd45c][k & 3], p[0], y0 + 0.4 + rr() * (h - 0.7), p[1], 0, 0, 0, 1, 1.3, 0.7);
      }
      return;
    }
    // walls and perches: rounded panels with a big emblem, spaced along the long faces
    if (h < 2) return;
    for (const f of fs) {
      if (f[2] < 3.4 || rampOn(rows, f)) continue;
      const n = Math.max(1, Math.floor(f[2] / 4.2));
      for (let k = 0; k < n; k++) {
        // (review: a rounded frame in the band colour behind each panel, so a panel reads as a fitted sign instead of a
        // paper poster; frame, panel and emblem stack 2 mm -> 2.4 cm out, under the 3 cm wall-goo decals)
        const lx = -f[2] / 2 + (k + 0.5) * (f[2] / n), pw = Math.min(2.5, f[2] / n - 0.6), ph = Math.min(1.35, h - 1.1), e = (ci + k) % th.emblems.length, yy = y0 + h * 0.5;
        const fr = onFace(f, lx, 0.002), p = onFace(f, lx, 0.01), q = onFace(f, lx, 0.02);
        kit.add(plaque(pw + 0.26, ph + 0.26, 0.2, 0.008), th.band, fr[0], yy, fr[1], 0, f[3], 0);
        kit.add(plaque(pw, ph, 0.16, 0.006), th.panel[(ci + k) & 1], p[0], yy, p[1], 0, f[3], 0);
        kit.add(emb(th.emblems[e], th.emblemCols[e]).clone(), null, q[0], yy, q[1], 0, f[3], 0, 0.62, 0.62, EMB_Z);
      }
    }
  }
  // Ferris wheel (Splash Plaza's far landmark): static A-frame in the kit; the wheel (one mesh + its bulbs) turns and the
  // 12 gondolas (one instanced mesh) ride it upright — their translation written straight into the instance buffer.
  function ferris(world, kit, P, x, z, ry, th, rich) {
    const R = 12.5, hy = 16.5, Geo = G.Geo;
    const c = Math.cos(ry), s = Math.sin(ry);
    // islet + legs
    kit.add(P.cyl(8, 10, 2.4, 18), 0xf3dca6, x, -1.5, z);
    kit.add(P.cyl(7.6, 8, 0.4, 18), 0x8fdc7a, x, -0.2, z);
    for (const sd of [-1, 1]) for (const lg of [-1, 1]) {
      const fx = x + sd * 1.6 * s + lg * 6 * c, fz = z + sd * 1.6 * c - lg * 6 * s, tx = x + sd * 1.1 * s, tz = z + sd * 1.1 * c;
      const dx = tx - fx, dy = hy, dz = tz - fz, L = Math.hypot(dx, dy, dz);
      const g = P.cyl(0.32, 0.42, L, 8); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L)));
      g.translate((fx + tx) / 2, hy / 2, (fz + tz) / 2); kit.addRaw(g, 0xfff6ea);
    }
    kit.add(P.cyl(0.55, 0.55, 3.4, 12).rotateX(PI / 2), th.foot, x, hy, z, 0, ry, 0);
    if (!rich) {
      // (review: Low keeps a still wheel in the dressing mesh — ~700 triangles, no draw call — where the bare A-frame
      // read as a broken ride)
      kit.add(P.tor(R, 0.32, 5, 32), 0xff8fb8, x, hy, z, 0, ry, 0);
      for (let k = 0; k < 8; k++) { const sp = P.cyl(0.09, 0.09, R, 4); sp.translate(0, R / 2, 0); sp.rotateZ((k / 8) * TAU); sp.rotateY(ry); sp.translate(x, hy, z); kit.addRaw(sp, 0xfff6ea); }
      return;
    }
    const wk = new G.Geo.Kit();
    wk.add(P.tor(R, 0.32, 6, 44), 0xff8fb8, 0, 0, 0);
    wk.add(P.tor(R - 0.9, 0.14, 4, 40), 0xffffff, 0, 0, 0);
    wk.add(P.cyl(1.3, 1.3, 0.8, 16), 0xffd23f, 0, 0, 0, PI / 2, 0, 0);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU, sp = P.cyl(0.09, 0.09, R, 4);
      sp.translate(0, R / 2, 0); sp.rotateZ(a); wk.addRaw(sp, k & 1 ? 0xfff6ea : 0x7fd0ff);
    }
    for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; wk.glow(P.sph(0.2, 6, 4), [0xffe9a8, 0xff9ad0, 0x9ff6ff][k % 3], Math.cos(a) * R, Math.sin(a) * R, 0.35); }
    const wd = wk.data();
    const wheel = new THREE.Mesh(wd.solid, G.M.vc({ rimStr: 0.25 }));
    if (wd.glow) { const gm = new THREE.Mesh(wd.glow, Geo.glowMat()); gm.userData.glow = true; wheel.add(gm); }
    wheel.position.set(x, hy, z); wheel.rotation.order = 'YXZ'; wheel.rotation.y = ry; wheel.name = 'ferrisWheel';
    world.add(wheel);
    // gondolas: white cabins (tinted per instance) with a striped roof
    const cg = [];
    const cab = P.rbox(1.5, 1.2, 1.3, 0.25, 1); Geo.colorize(cab, (px, py) => (py > 0.25 ? 0xffffff : py > -0.1 ? 0x9ff6ff : 0xffffff)); cg.push(cab);
    const roof = P.cone(1.0, 0.6, 8); roof.translate(0, 0.9, 0); Geo.colorize(roof, 0xfff6ea); cg.push(roof);
    const hang = P.cyl(0.05, 0.05, 1.1, 4); hang.translate(0, 1.5, 0); Geo.colorize(hang, th.foot); cg.push(hang);
    const pts = [];
    for (let k = 0; k < 12; k++) pts.push({ x, y: hy, z, s: 1, ry, color: th.crates[k % th.crates.length] });
    const gond = Geo.instancedAt(Geo.merge(cg), G.M.vc({ rimStr: 0.25 }), pts);
    gond.name = 'ferrisGondolas'; gond.frustumCulled = false;
    world.add(gond);
    const arr = gond.instanceMatrix.array, ang = new Float64Array(1);   // (review: the angle in a typed array — a closure let holding a double is re-boxed on every write)
    world.onUpdate(dt => {
      // (reduced motion: a third of the speed, as the town's ambient motion)
      ang[0] += dt * 0.11 * (G.Save.set.reducedMotion ? 0.35 : 1);
      const a0 = ang[0];
      wheel.rotation.z = a0;
      for (let k = 0; k < 12; k++) {
        const a = a0 + k * (TAU / 12), lx = Math.cos(a) * R, ly = Math.sin(a) * R - 1.6;
        arr[k * 16 + 12] = x + lx * c; arr[k * 16 + 13] = hy + ly; arr[k * 16 + 14] = z - lx * s;
      }
      gond.instanceMatrix.needsUpdate = true;
    });
  }
  // Rocket ride (the far landmark on Team B's side of Splash Plaza): striped tower in the kit, the arms with six little
  // rockets turn as one mesh.
  function rocketRide(world, kit, P, x, z, th, rich) {
    kit.add(P.cyl(7, 9, 2.4, 18), 0xf3dca6, x, -1.5, z);
    kit.add(P.cyl(6.6, 7, 0.4, 18), 0x8fdc7a, x, -0.2, z);
    for (let i = 0; i < 7; i++) kit.add(P.cyl(1.1 - i * 0.06, 1.15 - i * 0.06, 2, 14), i & 1 ? 0xffffff : 0x7fd0ff, x, 1 + i * 2, z);
    kit.add(P.sph(1.4, 14, 10), 0xffd23f, x, 14.6, z);
    kit.add(P.cone(0.5, 2.2, 10), 0xff8fb8, x, 16.6, z);
    if (!rich) return;
    const rk = new G.Geo.Kit(), dip = 0.35, L = 7;
    for (let k = 0; k < 6; k++) {
      // arm k points along d = (cos a, 0, -sin a) and dips by `dip`; its rocket flies along the tangent t = (sin a, 0, cos a)
      const a = (k / 6) * TAU, ca = Math.cos(a), sa = Math.sin(a), b = a + PI / 2;
      const arm = P.cyl(0.12, 0.12, L, 5); arm.rotateZ(-(PI / 2 + dip)); arm.translate(L / 2 * Math.cos(dip), -L / 2 * Math.sin(dip), 0); arm.rotateY(a); rk.addRaw(arm, 0xfff6ea);
      const R = L * Math.cos(dip), rx = ca * R, rz = -sa * R, ryy = -L * Math.sin(dip) - 0.45, col = th.crates[k % th.crates.length];
      rk.add(P.cap(0.55, 1.4, 3, 10), col, rx, ryy, rz, 0, b, PI / 2);
      rk.add(P.cone(0.55, 0.9, 10), 0xffffff, rx + sa * 1.15, ryy, rz + ca * 1.15, 0, b, PI / 2);
      rk.add(P.cone(0.6, 0.5, 6), 0xffd23f, rx - sa * 1.0, ryy, rz - ca * 1.0, 0, b, -PI / 2);
      rk.glow(P.sph(0.28, 6, 4), 0x9ff6ff, rx + ca * 0.56, ryy + 0.2, rz - sa * 0.56);
    }
    const d = rk.data();
    const top = new THREE.Mesh(d.solid, G.M.vc({ rimStr: 0.25 }));
    if (d.glow) { const gm = new THREE.Mesh(d.glow, G.Geo.glowMat()); gm.userData.glow = true; top.add(gm); }
    top.position.set(x, 14.6, z); top.name = 'rocketRide';
    world.add(top);
    world.onUpdate(dt => { top.rotation.y += dt * 0.5 * (G.Save.set.reducedMotion ? 0.35 : 1); });
  }
  // Coral Cove's far landmarks: the lighthouse on a rock islet (not on Low) and an inflatable bouncy fort on a raft.
  function coveMarks(world, kit, P, th, rich) {
    if (rich && G.Geo.lighthouse) {
      const lh = G.Geo.place(null, G.Geo.lighthouse(), -68, -1.2, -74, 0.6);
      lh.mesh.name = 'coveLighthouse'; world.add(lh.mesh);
      kit.add(P.cyl(9, 11, 2.2, 16), 0xe8d6b0, -68, -1.6, -74);
    }
    const fx = 66, fz = 72;
    kit.add(P.rbox(15, 1.2, 12, 0.4, 1), th.deck, fx, -0.8, fz);
    kit.add(P.rbox(13, 2.4, 10, 0.9, 2), 0xff9fa6, fx, 1.2, fz);
    for (const [ox, oz] of [[-6, -4.5], [6, -4.5], [-6, 4.5], [6, 4.5]]) {
      const g = new THREE.CylinderGeometry(1.5, 1.7, 6, 12); g.deleteAttribute('uv');
      G.Geo.colorize(g, (px, py) => (Math.floor((py + 3) / 1.2) & 1 ? 0xffffff : 0x2cc3d6));
      kit.add(g, null, fx + ox, 3, fz + oz);
      kit.add(P.sph(1.6, 12, 8), 0xffd45c, fx + ox, 6.4, fz + oz, 0, 0, 0, 1, 0.9, 1);
    }
    for (let i = 0; i < 9; i++) kit.add(P.sph(1.0, 10, 7), i & 1 ? 0xffffff : 0xff6f91, fx - 5.5 + i * 1.4, 3.1, fz - 5.1, 0, 0, 0, 0.75, 1, 0.6);
  }
  // Pool toys bobbing in the sea around the pier (static): rings and beach balls.
  function poolToys(kit, P, th, seed) {
    const rr = G.rng(seed);
    for (let i = 0; i < 12; i++) {
      const a = rr() * TAU, d = 50 + rr() * 22, x = Math.cos(a) * d * 0.85, z = Math.sin(a) * d;
      if (Math.abs(x) < 42 && Math.abs(z) < 50) continue;
      if (i & 1) {
        const g = new THREE.TorusGeometry(1.1, 0.42, 6, 14); g.deleteAttribute('uv');
        const ca = th.bunting[i % th.bunting.length];
        G.Geo.colorize(g, (px, py, pz) => (Math.floor((Math.atan2(py, px) + PI) / (PI / 4)) & 1 ? 0xffffff : ca));
        kit.add(g, null, x, -0.78, z, PI / 2, 0, 0);
      } else {
        const g = new THREE.SphereGeometry(0.9, 10, 6); g.deleteAttribute('uv');
        G.Geo.colorize(g, (px, py, pz) => [0xff6f91, 0xffffff, 0x2cc3d6, 0xffffff, 0xffd45c, 0xffffff][Math.floor((Math.atan2(pz, px) + PI) / (PI / 3)) % 6]);
        kit.add(g, null, x, -0.45, z, rr(), rr(), 0);
      }
    }
  }
  // Spectator stands on pontoons down both long sides, the team arches behind the bases, bunting masts on the pier
  // piles, pool toys and the far landmarks.
  function backdrop(world, kit, flags, P, spec, colors, rank) {
    const th = spec.theme, rect = T.RECT;
    const dens = rank <= 0 ? 0 : rank === 1 ? 0.45 : rank === 2 ? 0.75 : 1;
    const crowd = [[], []], rr = G.rng(spec.id.length * 31 + 7);
    for (const sd of [-1, 1]) {
      const x = sd * 35.4, ry = sd < 0 ? PI / 2 : -PI / 2;
      kit.add(P.rbox(5.4, 0.5, 52, 0.15, 1), th.deck, sd * 36.9, -0.72, 0);
      kit.add(P.box(0.12, 0.2, 52), th.foot, sd * 34.15, -0.55, 0);
      for (let z = -24; z <= 24; z += 8) kit.add(P.cyl(0.3, 0.34, 2.2, 8), 0x9c7e62, sd * 34.6, -1.6, z);
      for (const zc of [-17.4, 0, 17.4]) {
        const seats = G.StageKit.stand(kit, x, -0.47, zc, ry, { len: 16, rows: 3, cols: th.stand });
        for (const q of seats) {
          if (rr() > dens) continue;
          const k = rr() < 0.72 ? 0 : 1;
          crowd[k].push({ x: q.x, y: q.y, z: q.z, ry: q.ry + (rr() - 0.5) * 0.5, s: 1.15 + rr() * 0.25, color: th.crowd.cols[(rr() * th.crowd.cols.length) | 0] });
        }
      }
    }
    if (G.StageKit.crowd) for (let k = 0; k < 2; k++) if (crowd[k].length) G.StageKit.crowd(world, crowd[k], { kind: th.crowd.kinds[k], name: 'turfCrowd' + k, hop: 0.2 });
    // team arches over the water behind each base (Team A's colour behind Team A's pad)
    for (const team of [0, 1]) {
      const sg = team ? -1 : 1, z = sg * 44.2, col = team ? colors.b : colors.a;
      for (const sx of [-1, 1]) kit.add(P.rbox(3.2, 0.6, 3.2, 0.2, 1), th.deck, sx * 7.5, -0.75, z);
      G.StageKit.arch(kit, 0, -0.5, z, team ? PI : 0, { span: 15, h: 8.6, r: 0.82, cols: [col, 0xffffff], base: th.foot, crownCol: 0xffffff, trim: col, emblem: rank > 0 ? (team ? 'gear' : 'star') : null, emblemCol: col });
    }
    // bunting masts on the pier piles down the long sides, strings from mast to mast, and from the corners to the arches
    const ys = 5.2;
    for (const sd of [-1, 1]) {
      const x = sd * (rect.maxX + 0.4), ms = [];
      for (let z = rect.minZ + 4; z < rect.maxZ; z += 8) {
        kit.add(P.cyl(0.07, 0.1, ys + 1.2, 6), 0xfff6ea, x, ys / 2, z);
        kit.add(P.sph(0.16, 8, 6), 0xffd23f, x, ys + 0.62, z);
        ms.push([x, ys, z]);
      }
      if (flags) for (let i = 0; i + 1 < ms.length; i++) G.StageKit.bunting(flags, kit, ms[i], ms[i + 1], { cols: th.bunting, sag: 0.75, ofs: i });
      // (to the arch's shoulder: 45 degrees round from its foot)
      if (flags) for (const team of [0, 1]) { const sg = team ? -1 : 1, m = ms[team ? 0 : ms.length - 1]; G.StageKit.bunting(flags, kit, m, [sd * 5.3, 5.4, sg * 44.2], { cols: th.bunting, sag: 1.1, ofs: team * 3 }); }
    }
    poolToys(kit, P, th, spec.id.length * 17 + 3);
    if (th.landmark === 'park') { ferris(world, kit, P, -64, -78, 0.75, th, rank > 0); rocketRide(world, kit, P, 66, 76, th, rank > 0); }
    else coveMarks(world, kit, P, th, rank > 0);
  }

  // Build an arena into `world`. Returns layout info used by the mode, bots and paint grid.
  T.buildArena = function (world, spec, paint, colors) {
    const rect = T.RECT;
    const B = new Builder();
    const phys = world.phys;
    const rows = T.expandLayout(spec);
    const grates = [];
    const aoRects = [];
    for (const r of rows) if (r[0] !== 'grate' && r[0] !== 'ramp' && r[5] <= 0.05) aoRects.push([r[1], r[2], r[3], r[4], r[0] === 'pad' ? 0.16 : 0.3]);
    ground(B, spec, rect, aoRects, colors);
    const th = spec.theme;
    let ci = 0;
    for (const r of rows) {
      const t = r[0];
      if (t === 'grate') {
        const st = spec.styles.grate;
        block(B, r[1], r[2], r[3], r[4], -0.05, 0.035, st);
        grates.push([r[1], r[2], r[3], r[4]]);
        continue;
      }
      if (t === 'ramp') {
        const st = spec.styles.ramp;
        ramp(B, r[1], r[2], r[3], r[4], r[5], r[6], st);
        addRampPhys(phys, r[1], r[2], r[3], r[4], r[5], r[6]);
        continue;
      }
      let st = spec.styles[t] || spec.styles.wall;
      // (colour only: the spawn pads take their team's colour on the sides and a hint of it on top; each crate gets
      // its own bright colour from the theme)
      if (th && t === 'pad') { const tc = r[7] ? colors.b : colors.a; st = { top: mixHex(st.top, tc, 0.12), side: mixHex(0xfff6ea, tc, 0.62), mat: st.mat, sideMat: st.sideMat }; }
      else if (th && t === 'crate') st = { top: st.top, side: th.crates[(ci++) % th.crates.length], mat: st.mat, sideMat: st.sideMat };
      block(B, r[1], r[2], r[3], r[4], r[5], r[6], st);
      phys.addAABB(r[1], r[5] - 0.5, r[2], r[3], r[6], r[4], t === 'pad' ? 'pad' : 'wall');
    }
    const floor = B.mesh(paint.floorMat);
    floor.userData.turfFloor = true;
    world.add(floor);
    // ---- deco (railings, piles, spawn rings, buoys, stage dressing) — one merged vc mesh (+ its glow part)
    const kit = G.Geo && G.Geo.Kit ? new G.Geo.Kit() : null;
    const P = G.Geo && G.Geo.P;
    const pad = spec.pad;
    const flags = G.Geo && G.Geo.flagBatch ? G.Geo.flagBatch() : null;
    if (kit && P && th && G.StageKit) G.safe('turf dressing', () => {
      const rank = G.R.tierRank ? G.R.tierRank() : 2;
      let k = 0, n = 0;
      for (const r of rows) {
        if (r[0] === 'grate' || r[0] === 'ramp') continue;
        dressBlock(kit, P, rows, r, th, colors, r[0] === 'crate' ? k++ : n++, rank > 0);
      }
      backdrop(world, kit, flags, P, spec, colors, rank);
    });
    if (kit && P) {
      const navy = 0x3a4a8a, white = 0xfbfaf6, gold = 0xe8b44a;
      const railAt = (x0, z0, x1, z1, y) => {
        const len = fhyp(x1 - x0, z1 - z0), n = fmax(1, Math.round(len / 2.5));
        const ang = Math.atan2(x1 - x0, z1 - z0);
        for (let i = 0; i <= n; i++) {
          const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
          kit.add(P.cyl(0.07, 0.08, 1.05, 6), white, x, y + 0.52, z);
          kit.add(P.sph(0.1, 6, 4), gold, x, y + 1.08, z);
        }
        kit.add(P.rbox(0.1, 0.1, len, 0.04, 1), navy, (x0 + x1) / 2, y + 1.0, (z0 + z1) / 2, 0, ang, 0);
        kit.add(P.rbox(0.06, 0.06, len, 0.02, 1), white, (x0 + x1) / 2, y + 0.55, (z0 + z1) / 2, 0, ang, 0);
      };
      for (const sgn of [1, -1]) {
        railAt(rect.minX, -sgn * 38.6, rect.minX, sgn * 38.6, 0);
        // end rails: ground level beside the pad, pad level on the pad
        const Z = sgn * rect.maxZ;
        railAt(rect.minX, Z, sgn > 0 ? pad.x0 - 0.2 : -pad.x1 - 0.2, Z, 0);
        railAt(sgn > 0 ? pad.x1 + 0.2 : -pad.x0 + 0.2, Z, rect.maxX, Z, 0);
        railAt(sgn > 0 ? pad.x0 : -pad.x1, Z, sgn > 0 ? pad.x1 : -pad.x0, Z, pad.y);
      }
      railAt(rect.maxX, -38.6, rect.maxX, 38.6, 0);
      // pier piles in the water
      for (let z = rect.minZ + 4; z < rect.maxZ; z += 8) for (const x of [rect.minX - 0.4, rect.maxX + 0.4]) kit.add(P.cyl(0.32, 0.36, 3, 8), 0x9c7e62, x, -1.9, z);
      for (let x = rect.minX + 6; x < rect.maxX; x += 9) for (const z of [rect.minZ - 0.4, rect.maxZ + 0.4]) kit.add(P.cyl(0.32, 0.36, 3, 8), 0x9c7e62, x, -1.9, z);
      // buoys
      const rb = G.rng(spec.id.length * 13);
      for (let i = 0; i < 10; i++) {
        const a = rb() * Math.PI * 2, d = 46 + rb() * 18;
        const bx = Math.cos(a) * d * 0.8, bz = Math.sin(a) * d;
        kit.add(P.sph(0.55, 10, 8), i % 2 ? 0xffffff : 0xff7a93, bx, -0.75, bz);
        kit.add(P.cyl(0.08, 0.08, 0.8, 6), 0xfbfaf6, bx, -0.1, bz);
      }
      // spawn pad rings (circle = Team A, diamond = Team B), slightly raised
      for (const team of [0, 1]) {
        const sgn = team === 0 ? 1 : -1;
        const cx = 0, cz = sgn * ((pad.z0 + pad.z1) / 2);
        const col = team === 0 ? colors.a : colors.b;
        if (team === 0) kit.add(P.tor(2.1, 0.07, 5, 36), col, cx, pad.y + 0.02, cz, Math.PI / 2, 0, 0, 1, 1, 0.22);
        else kit.add(P.tor(2.4, 0.07, 5, 4), col, cx, pad.y + 0.02, cz, Math.PI / 2, 0, Math.PI / 4, 1, 1, 0.22);
      }
      const d = kit.data({ rimStr: 0.25 });
      if (d.solid) { const m = new THREE.Mesh(d.solid, G.M.vc({ rimStr: 0.25 })); m.name = 'turfDeco'; m.matrixAutoUpdate = false; m.updateMatrix(); world.add(m); }
      if (d.glow) { const m = new THREE.Mesh(d.glow, G.Geo.glowMat()); m.name = 'turfDeco-glow'; m.matrixAutoUpdate = false; m.updateMatrix(); world.add(m); }
    }
    // ---- spawn barriers (additive curtain in team colour)
    const barriers = [];
    for (const team of [0, 1]) {
      const sgn = team === 0 ? 1 : -1;
      const x0 = pad.x0 - 0.6, x1 = pad.x1 + 0.6, zf = sgn * (pad.z0 - 0.6), zb = sgn * pad.z1;
      const hgt = 2.4, y0 = 0.02;
      const g = new THREE.BufferGeometry();
      const pos = [], uv = [];
      const wallQ = (ax, az, bx, bz) => { pos.push(ax, y0, az, bx, y0, bz, bx, y0 + hgt + pad.y, bz, ax, y0, az, bx, y0 + hgt + pad.y, bz, ax, y0 + hgt + pad.y, az); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); };
      wallQ(x0, zf, x1, zf); wallQ(x0, zf, x0, zb); wallQ(x1, zf, x1, zb);
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color(team === 0 ? colors.a : colors.b) }, uTime: { value: 0 }, uAlpha: { value: team === 0 ? 0.32 : 1.0 } },
        vertexShader: 'varying vec2 vUv; varying float vY; void main(){ vUv = uv; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        // force-field curtain: bright floor seam, faint rising scan-lines (the player's own barrier stays very light)
        fragmentShader: 'uniform vec3 uCol; uniform float uTime, uAlpha; varying vec2 vUv; varying float vY; void main(){ float k = 1.0 - smoothstep(0.0, 0.85, vUv.y); float seam = 1.0 - smoothstep(0.0, 0.05, vUv.y); float s = smoothstep(0.75, 1.0, sin(vY * 7.0 - uTime * 3.0)); gl_FragColor = vec4(uCol, (k * k * 0.16 + s * k * 0.16 + seam * 0.5) * uAlpha); }',
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      });
      const m = new THREE.Mesh(g, mat);
      m.renderOrder = 3;
      world.add(m);
      barriers.push(m);
    }
    // ---- props (G.Geo); colliders registered by Geo.place and stamped uninkable in the paint grid later
    const propCols = [];
    const placeProp = (pr, x, y, z, ry) => {
      if (!pr || !pr.mesh) return;
      const r = G.Geo.place(world, pr, x, y, z, ry || 0);
      if (r && r.cols) for (const cl of r.cols) propCols.push(cl);
    };
    if (G.Geo) {
      for (const pd of spec.props) {
        for (const mir of (pd.single ? [0] : [0, 1])) {
          const x = mir ? -pd.x : pd.x, z = mir ? -pd.z : pd.z, y = pd.y || 0;
          const team = pd.team != null ? (mir ? 1 - pd.team : pd.team) : null;
          G.safe('turf prop', () => {
            if (pd.k === 'banner' && G.Geo.banner) {
              const bc = team === 0 ? colors.a : colors.b, be = team === 0 ? 'star' : 'gear';
              placeProp(G.Geo.banner(bc, be, flags ? { cloth: false } : undefined), x, y, z, mir ? Math.PI : 0);
              if (flags) flags.banner(bc, be, x, y, z, mir ? Math.PI : 0);
            }
            else if (pd.k === 'lamp' && G.Geo.lampPost) placeProp(G.Geo.lampPost({ color: 0xfff2b0 }), x, y, z, 0);
            else if (pd.k === 'palm' && G.Geo.tree) { const pr = G.Geo.tree('palm', pd.s || 1, 3 + (mir ? 2 : 0)); pr.colliders = []; if (G.Geo.windMat) pr.mesh.material = G.Geo.windMat(0.3); placeProp(pr, x, y, z, mir ? 2 : 0.6); }
            else if (pd.k === 'coral' && G.Geo.coral) { const pr = G.Geo.coral(pd.kind || 0, [0xff8a8a, 0xffb37a, 0xb983ff, 0xffd45c][(pd.kind || 0) % 4], pd.s || 1); pr.colliders = []; placeProp(pr, x, y, z, mir ? 1.3 : 0); }
          });
        }
      }
      if (flags && flags.count) world.add(flags.mesh());
      G.safe('turf horizon', () => {
        if (G.Geo.distantMountains) world.add(G.Geo.distantMountains(300, 18, spec.id === 'coral' ? [0xf2b98a, 0xffc8a8, 0xe88a5a, 0xb8e4f0] : [0x8fd6a0, 0x7cc89a, 0xc4cff5, 0xf2b98a], { height: 26 }));
      });
    }
    // sand islets for the outside props (one shared merged mesh)
    if (G.Geo && G.Geo.blob) {
      const parts = [];
      for (const pd of spec.props) if (pd.out) for (const mir of [0, 1]) {
        const g = G.Geo.blob(2.6, 1, 0.2, 5 + mir, { sy: 0.32 });
        G.Geo.colorize(g, (x, y) => (y > 0.25 ? 0xf7e3b0 : 0xebc786));
        g.translate(mir ? -pd.x : pd.x, -0.85, mir ? -pd.z : pd.z);
        parts.push(g);
      }
      if (parts.length) { const m = new THREE.Mesh(G.Geo.merge(parts), G.M.vc({ rimStr: 0.2 })); world.add(m); }
    }
    world.add(pierFoam(rect, spec));
    // spawn points
    const spawns = [[], []];
    for (const s of spec.spawns) { spawns[0].push(new V3(s[0], pad.y, s[1])); spawns[1].push(new V3(-s[0], pad.y, -s[1])); }
    const pads = [
      { x0: pad.x0 - 1, z0: pad.z0 - 1, x1: pad.x1 + 1, z1: rect.maxZ, y: pad.y },
      { x0: -pad.x1 - 1, z0: rect.minZ, x1: -pad.x0 + 1, z1: -pad.z0 + 1, y: pad.y },
    ];
    return { spec, rect, rows, grates, propCols, spawns, pads, barriers, floor };
  };

  // Animated foam where the sea laps against the pier skirt and around the palm islets (one mesh): a ribbon
  // whose alpha fades outward, with lapping bands travelling away from the pier.
  function pierFoam(rect, spec) {
    const pos = [], fo = [], idx = [];
    const strip = pts => { // closed loop of [x,z, nx,nz] (outward normals)
      const base = pos.length / 3;
      for (const p of pts) { pos.push(p[0], 0, p[1], p[0] + p[2] * 2.2, 0, p[1] + p[3] * 2.2); fo.push(0, 1, 0, 1); }
      for (let i = 0; i < pts.length; i++) { const a = base + i * 2, b = base + ((i + 1) % pts.length) * 2; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    };
    const X0 = rect.minX, X1 = rect.maxX, Z0 = rect.minZ, Z1 = rect.maxZ, loop = [];
    const edge = (ax, az, bx, bz, nx, nz) => { const L = fhyp(bx - ax, bz - az), n = fmax(2, Math.round(L / 2)); for (let i = 0; i < n; i++) loop.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n, nx, nz]); };
    const s2 = Math.SQRT1_2;
    edge(X0, Z0, X1, Z0, 0, -1); loop.push([X1, Z0, s2, -s2]); edge(X1, Z0, X1, Z1, 1, 0); loop.push([X1, Z1, s2, s2]);
    edge(X1, Z1, X0, Z1, 0, 1); loop.push([X0, Z1, -s2, s2]); edge(X0, Z1, X0, Z0, -1, 0); loop.push([X0, Z0, -s2, -s2]);
    strip(loop);
    for (const pd of spec.props) if (pd.out) for (const mir of [0, 1]) {
      const cx = mir ? -pd.x : pd.x, cz = mir ? -pd.z : pd.z, pts = [];
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; pts.push([cx + Math.cos(a) * 2.3, cz + Math.sin(a) * 2.3, Math.cos(a) * 0.6, Math.sin(a) * 0.6]); }
      strip(pts);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aFo', new THREE.Float32BufferAttribute(fo, 2));
    g.setIndex(idx);
    const uni = { uTime: { value: 0 } };
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'attribute vec2 aFo; varying float vT; varying vec2 vP; void main(){ vT = aFo.x; vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform float uTime; varying float vT; varying vec2 vP; void main(){ float lip = 1.0 - smoothstep(0.0, 0.28, vT); float band = smoothstep(0.6, 0.95, sin(vT * 9.0 - uTime * 2.2 + sin(vP.x * 0.4 + vP.y * 0.3) * 1.5)) * (1.0 - smoothstep(0.2, 1.0, vT)); float a = clamp(lip * 0.75 + band * 0.45, 0.0, 0.85); gl_FragColor = vec4(vec3(0.96, 1.0, 1.0), a); }',
    }));
    m.position.y = -0.78; m.renderOrder = 3; m.name = 'pierFoam';
    m.onBeforeRender = () => { uni.uTime.value = G.time.elapsed; };
    return m;
  }

  // Stamp grates and prop footprints into the paint grid (after buildHeights).
  T.markArena = function (paint, info) {
    for (const g of info.grates) paint.markRect(g[0], g[1], g[2], g[3]);
    for (const c of info.propCols) {
      if (c.type === 'cyl') paint.markCircle(c.x, c.z, c.r);
      else if (c.cx != null) paint.markRect(c.cx - c.sx / 2, c.cz - c.sz / 2, c.cx + c.sx / 2, c.cz + c.sz / 2);
    }
  };

  // Top-down preview of an arena layout for the lobby (canvas 2D).
  T.drawArenaMap = function (canvas, spec, colors) {
    const g = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const R = T.RECT, sx = R.maxX - R.minX, sz = R.maxZ - R.minZ;
    // long axis horizontal: world z -> canvas x (team A on the left), world x -> canvas y
    const k = fmin(W / sz, H / sx) * 0.92, ox = W / 2, oy = H / 2;
    const P = (x, z) => [ox - z * k, oy + x * k];
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#9fe0ef'; g.fillRect(0, 0, W, H);
    const rectPath = (x0, z0, x1, z1) => { const a = P(x0, z1), b = P(x1, z0); g.beginPath(); g.rect(fmin(a[0], b[0]), fmin(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); };
    rectPath(R.minX, R.minZ, R.maxX, R.maxZ); g.fillStyle = '#eef0f5'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#1e1a4d'; g.stroke();
    const rows = T.expandLayout(spec);
    for (const r of rows) {
      const t = r[0];
      if (t === 'grate') { rectPath(r[1], r[2], r[3], r[4]); g.fillStyle = '#8a93a8'; g.fill(); continue; }
      rectPath(r[1], r[2], r[3], r[4]);
      const hgt = t === 'ramp' ? r[5] * 0.6 : r[6];
      const v = fmax(0, 1 - hgt / 5);
      g.fillStyle = t === 'pad' ? (r[7] ? T.css(colors.b) : T.css(colors.a)) : t === 'ramp' ? '#d8dcef' : 'rgb(' + Math.round(150 + 80 * v) + ',' + Math.round(140 + 80 * v) + ',' + Math.round(200 + 40 * v) + ')';
      g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1e1a4d'; g.stroke();
    }
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 24c_turf_arena.js]', e); }
// ---- 24d_turf_gear.js
try { (function () {
// 24d_turf_gear.js — Goo Turf gear.
//   T.makeWeapon(id, owner)  -> a turf weapon instance: G.Weapons.create(id, lvl, [], owner) when the weapons
//                               module provides G.Weapons.turfDefs[id], otherwise the built-in FallbackGoo
//                               (shooter / pellet / lob / beam / mist / charger / rocket / roller archetypes,
//                               GDD §5.3 numbers). Both paint through world.rules.paint and spend owner.ink.
//   T.Gear (per match): subs (Bubble Bomb, Pop Bomb, Goo Sprinkler) and specials (Goo Storm, Mega Splashdown,
//                       Triple Splash). gear.throwSub(ranger, id) / gear.useSpecial(ranger, id) / update(dt).
// A "ranger" is the player or a TurfBot: {pos, vel, team, ink, sp, eyePos(out), forward(out), tstats, isPlayer}.
(function (G) {
  'use strict';
  // Math.max / min / sign / hypot / random hand back a fresh heap number from the mid-tier (Maglev) compiled code that
  // runs most per-frame code (measured 12-36 bytes a call); these plain twins are inlined and allocate nothing.
  // frand: xorshift32, its state in an Int32Array (updating a typed array never boxes); frange(a, b) = U.rand(a, b).
  const fmax = (a, b) => (a > b ? a : b), fmin = (a, b) => (a < b ? a : b), fsign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const fhyp = (x, y) => Math.sqrt(x * x + y * y);
  const _rs = new Int32Array(1); _rs[0] = (Math.random() * 0x7fffffff) | 1;
  const frand = () => { let x = _rs[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _rs[0] = x; return (x >>> 0) / 4294967296; };
  const frange = (a, b) => a + frand() * (b - a);
  const T = G.Turf = G.Turf || {};
  const V3 = THREE.Vector3;
  const U = G.util;
  const DEG = Math.PI / 180;
  const UP = new V3(0, 1, 0);
  const _a = new V3(), _b = new V3(), _d = new V3(), _e = new V3(), _r = new V3(), O_DRIP = { normal: true, alpha: 0.9 };

  T.teamColor = team => (T.match ? (team === 0 ? T.match.colors.a : T.match.colors.b) : (team === 0 ? 0xff8a1f : 0x2f7bff));
  // Paint helper used by gear and fallback weapons (goes through world.rules.paint so the mode credits it).
  function paint(w, p, r, team, nrm, owner, opts) { if (w && w.rules && w.rules.paint) return w.rules.paint(p, r, team, nrm || UP, owner, opts) || 0; return 0; }
  T.paintFloorBelow = function (w, x, y, z, r, team, owner, opts) {
    const gy = w.phys.groundAt(x, z, 0.05, y + 0.3);
    if (y - gy > 9) return 0;
    _e.set(x, gy, z);
    return paint(w, _e, r, team, UP, owner, opts);
  };

  // ================================================================== fallback goo weapon
  class FallbackGoo {
    constructor(id, owner) {
      this.id = id; this.owner = owner;
      this.s = T.WEAPONS[id] || T.WEAPONS.splat;
      const k = this.s.kind;
      this.def = { id, range: this.s.range, noAuto: k === 'lob' || k === 'charger' || k === 'roller', turf: true, fallback: true };
      this.level = 1; this.cd = 0; this.charge = 0; this.spin = 0; this.holdT = 0; this.rolling = false; this.rollT = 0;
      this.tickT = 0; this.wasFiring = false; this.rollHits = new Map(); this.sfxT = 0;
      this.spreadNow = fmax(0.01, (this.s.spread || 1) * DEG * 0.7);
      this.isFallback = true;
    }
    get ink() { return this.owner.ink != null ? this.owner.ink : 100; }
    spend(n) {
      const o = this.owner;
      if (o.ink != null) o.ink = fmax(0, o.ink - n);
      o.inkRefillT = fmax(o.inkRefillT || 0, this.s.refill || 0.4);
    }
    color() { return T.teamColor(this.owner.team); }
    dmg(n) { const o = this.owner; return n * (o.isPlayer ? 1 : (o.damageMult || o.dmgMult || 1)); }
    refill() { this.charge = 0; this.rolling = false; }
    reload() {}
    idle(dt) { this.cd -= dt; }
    xpFrac() { return 0; }
    ammoText() { return Math.round(this.ink) + '<small>%</small>'; }
    onEquip() {} onUnequip() { this.rolling = false; }
    _fired(kick, sh) { const o = this.owner; if (o.onFired) o.onFired(kick, 0.05, sh || 0.04); }
    _sfx(name, pos, vol) {
      if (!G.Audio || this.sfxT > 0) return;
      this.sfxT = 0.06;
      if (this.owner.isPlayer) G.Audio.sfx(name, { vol: vol || 0.6 }); else G.Audio.sfxAt(name, pos, { vol: (vol || 0.6) * 0.7 });
    }
    // Spawn one goo projectile that paints on impact and drips droplets along its path.
    _shot(ctx, dir, o) {
      const s = this.s, w = ctx.world, owner = this.owner, team = owner.team, col = this.color();
      const drop = o.drop != null ? o.drop : s.drop, every = s.dropEvery || 2, pr = o.paint != null ? o.paint : s.paint;
      const speed = o.speed || s.speed || 40;
      return w.projectiles.spawn({
        pos: ctx.origin, dir, speed, gravity: o.grav != null ? o.grav : (s.grav || 0), life: o.life || (s.range / speed) * 1.7 + 0.15,
        radius: 0.12, damage: o.damage != null ? o.damage : this.dmg(s.dmg), src: owner, team, color: col, size: o.size || s.size || 0.14,
        kind: o.kind || 'ink', bounce: o.bounce || 0, homing: o.homing || 0, trail: true, data: { d: 0 },
        onHit: (p, hit, wd) => {
          if (hit.actor) { T.paintFloorBelow(wd, hit.point.x, hit.point.y, hit.point.z, pr * 0.6, team, owner); return; }
          paint(wd, hit.point, pr, team, hit.normal, owner);
          if (o.onImpact) o.onImpact(p, hit, wd);
        },
        onTick: (p, dt, wd) => {
          if (drop) {
            p.data.d += speed * dt;
            if (p.data.d >= every) { p.data.d = 0; T.paintFloorBelow(wd, p.pos.x, p.pos.y, p.pos.z, drop, team, owner); }
          }
          if (o.burstAtEnd && p.life <= dt * 1.5 && !p.data.done) { p.data.done = true; o.burstAtEnd(p, wd); }
        },
      });
    }
    _spreadDir(base, deg, out) {
      if (!deg) return out.copy(base);
      const a = frand() * Math.PI * 2, r = Math.tan(deg * DEG) * Math.sqrt(frand());
      _r.set(-base.z, 0, base.x).normalize(); if (_r.lengthSq() < 0.01) _r.set(1, 0, 0);
      _b.crossVectors(base, _r).normalize();
      return out.copy(base).addScaledVector(_r, Math.cos(a) * r).addScaledVector(_b, Math.sin(a) * r * 0.6).normalize();
    }
    update(dt, ctx) {
      const s = this.s, w = ctx.world, owner = this.owner;
      this.cd -= dt; this.sfxT -= dt;
      const firing = !!ctx.firing;
      switch (s.kind) {
        case 'shooter': case 'pellet': {
          if (s.spin) this.spin = firing ? fmin(s.spin, this.spin + dt) : fmax(0, this.spin - dt * 1.5);
          if (firing && this.cd <= 0 && (!s.spin || this.spin >= s.spin)) {
            if (this.ink < s.cost) { if (this.cd < -0.25) { this.cd = 0.25; this._sfx('empty', ctx.origin, 0.4); } break; }
            this.cd = 1 / s.rate; this.spend(s.cost);
            const n = s.pellets || 1;
            for (let i = 0; i < n; i++) this._shot(ctx, this._spreadDir(ctx.dir, s.spread || 0, _d), { bounce: s.bounce || 0, kind: s.disc ? 'disc' : 'ink', paint: s.paint });
            this._fired(n > 1 ? 0.03 : 0.008, n > 1 ? 0.1 : 0.03);
            this._sfx(n > 1 ? 'inkHeavy' : 'ink', ctx.origin, n > 1 ? 0.7 : 0.45);
          }
          break;
        }
        case 'lob': case 'rocket': {
          if (firing && this.cd <= 0) {
            if (this.ink < s.cost) { if (this.cd < -0.25) { this.cd = 0.25; this._sfx('empty', ctx.origin, 0.4); } break; }
            this.cd = 1 / s.rate; this.spend(s.cost);
            _d.copy(ctx.dir);
            if (s.kind === 'lob' && owner.isPlayer) { _d.y += 0.21; _d.normalize(); }
            const team = owner.team, col = this.color(), splash = this.dmg(s.splash || 0);
            const burst = (pos, wd) => {
              if (splash > 0) wd.explode(pos.clone ? pos.clone() : new V3(pos.x, pos.y, pos.z), s.kind === 'lob' ? 2.2 : 1.6, splash, { src: owner, color: col, knock: 2, type: 'splash' });
            };
            this._shot(ctx, _d, {
              kind: s.kind === 'lob' ? 'grenade' : 'rocket', homing: s.kind === 'rocket' ? 1.6 : 0, size: s.size,
              onImpact: (p, hit, wd) => burst(hit.point, wd),
              burstAtEnd: (p, wd) => { T.paintFloorBelow(wd, p.pos.x, p.pos.y, p.pos.z, s.paint, team, owner); burst(p.pos, wd); },
            });
            this._fired(0.03, 0.08);
            this._sfx(s.kind === 'lob' ? 'grenade' : 'rocket', ctx.origin, 0.6);
          }
          break;
        }
        case 'beam': case 'mist': {
          if (!firing) { this.tickT = 0; break; }
          this.tickT -= dt;
          if (this.tickT > 0) break;
          if (this.ink < s.cost) { this.tickT = 0.25; this._sfx('empty', ctx.origin, 0.4); break; }
          this.tickT = 1 / s.rate; this.spend(s.cost);
          const col = this.color();
          const rays = s.kind === 'mist' ? 3 : 1;
          for (let i = 0; i < rays; i++) {
            _d.copy(ctx.eyeDir);
            if (rays > 1) { const a = (i - 1) * 12 * DEG; const c = Math.cos(a), sn = Math.sin(a); const x = _d.x * c - _d.z * sn; _d.z = _d.x * sn + _d.z * c; _d.x = x; _d.y -= 0.04; _d.normalize(); }
            const hit = w.hitscan(ctx.eye, _d, s.range, owner);
            const end = hit ? hit.point : _a.copy(ctx.eye).addScaledVector(_d, s.range);
            if (hit && hit.actor) {
              w.damage(hit.actor, this.dmg(s.dmg), { src: owner, type: 'beam', pos: hit.point, dir: _d.clone() });
              if (s.kind === 'mist' && hit.actor.alive) { hit.actor.slowT = 1.0; hit.actor.slowK = 0.6; }
              T.paintFloorBelow(w, hit.point.x, hit.point.y, hit.point.z, s.paint, owner.team, owner);
            } else if (hit) paint(w, hit.point, s.paint, owner.team, hit.normal, owner);
            else T.paintFloorBelow(w, end.x, end.y, end.z, s.paint, owner.team, owner);
            if (s.kind === 'beam') w.fx.tracer(ctx.origin, end, col, 0.07, 0.07);
            else w.fx.burst(_b.copy(ctx.origin).lerp(end, 0.5), [col, 0xffffff], 2, 2, 0.5, 0.35, { normal: true, alpha: 0.5, grav: -0.5 });
          }
          this._fired(0.003, 0.012);
          this._sfx(s.kind === 'beam' ? 'zap' : 'freeze', ctx.origin, 0.35);
          break;
        }
        case 'charger': {
          if (firing) {
            const rate = this.ink >= s.cost ? 1 : 0.33;
            this.charge = fmin(1, this.charge + dt / s.charge * rate);
            this.spreadNow = 0.004;
          } else if (this.wasFiring && this.cd <= 0) {
            const k = this.charge, tap = k < 0.2;
            const cost = tap ? s.tapCost : U.lerp(s.tapCost, s.cost, k);
            if (this.ink >= fmin(cost, s.tapCost)) {
              this.spend(cost); this.cd = 0.25 + 0.35 * k;
              const dmg = this.dmg(tap ? s.min : U.lerp(s.min, s.dmg, k * k));
              const hit = w.hitscan(ctx.eye, ctx.eyeDir, s.range, owner);
              const len = tap ? 12 : U.lerp(12, s.line, k), pr = tap ? 0.35 : 0.5;
              const end = _a.copy(ctx.eye).addScaledVector(ctx.eyeDir, hit ? fmin(hit.t, len) : len);
              if (hit && hit.actor) w.damage(hit.actor, dmg, { src: owner, type: 'proj', pos: hit.point, dir: ctx.eyeDir.clone(), crit: hit.crit });
              else if (hit && hit.t <= len) paint(w, hit.point, pr * 1.6, owner.team, hit.normal, owner);
              // paint the line on the floor beneath the shot
              const steps = Math.ceil(len / 0.7);
              for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                _b.copy(ctx.origin).lerp(end, t);
                T.paintFloorBelow(w, _b.x, _b.y, _b.z, pr, owner.team, owner, { noDrops: true });
              }
              w.fx.tracer(ctx.origin, hit ? hit.point : end, this.color(), tap ? 0.06 : 0.14, 0.18);
              this._fired(0.02 + 0.04 * k, 0.12 * k);
              this._sfx(tap ? 'laser' : 'chargeShot', ctx.origin, 0.7);
            } else this._sfx('empty', ctx.origin, 0.4);
            this.charge = 0;
          }
          this.wasFiring = firing;
          break;
        }
        case 'roller': {
          const grounded = owner.grounded !== false;
          if (firing) {
            this.holdT += dt;
            if (!this.rolling && this.holdT > 0.22 && grounded && this.ink > 1) this.rolling = true;
          }
          if (this.rolling) {
            if (!firing || this.ink <= 0) { this.rolling = false; }
            else {
              this.spend(s.rollCost * dt);
              this.rollT -= dt;
              if (this.rollT <= 0 && grounded) {
                this.rollT = 0.07;
                const f = owner.forward(_d); _d.y = 0; _d.normalize();
                _r.set(-_d.z, 0, _d.x);
                for (let i = -1; i <= 1; i++) {
                  const x = owner.pos.x + _d.x * 0.9 + _r.x * i * 0.8, z = owner.pos.z + _d.z * 0.9 + _r.z * i * 0.8;
                  T.paintFloorBelow(w, x, owner.pos.y + 0.6, z, 0.62, owner.team, owner, { noDrops: true });
                }
                void f;
              }
              // crush on contact
              for (const a of w.actors) {
                if (!a.alive || !a.targetable || a.team === owner.team || a === owner) continue;
                const dx = a.pos.x - owner.pos.x, dz = a.pos.z - owner.pos.z, d = fhyp(dx, dz);
                if (d > 1.5 || Math.abs(a.pos.y - owner.pos.y) > 1.2) continue;
                const fd = owner.forward(_b); if ((dx * fd.x + dz * fd.z) / (d || 1) < 0.2) continue;
                const last = this.rollHits.get(a.id) || -9;
                if (w.time - last < 0.5) continue;
                this.rollHits.set(a.id, w.time);
                w.damage(a, this.dmg(s.dmg), { src: owner, type: 'melee', pos: a.pos.clone(), dir: _b.clone(), knock: 4 });
              }
              if (frand() < 0.3) w.fx.burst(_a.set(owner.pos.x, owner.pos.y + 0.15, owner.pos.z).addScaledVector(owner.forward(_b).setY(0).normalize(), 1), this.color(), 1, 2, 0.35, 0.3, { normal: true });
            }
          }
          if (!firing && this.wasFiring) {
            if (this.holdT <= 0.22 && this.cd <= 0) {
              if (this.ink >= s.cost) {
                this.spend(s.cost); this.cd = 1 / s.rate;
                for (let i = -2; i <= 2; i++) {
                  const a = i * 15 * DEG; _d.copy(ctx.dir);
                  const c = Math.cos(a), sn = Math.sin(a); const x = _d.x * c - _d.z * sn; _d.z = _d.x * sn + _d.z * c; _d.x = x; _d.y += 0.12; _d.normalize();
                  this._shot(ctx, _d, { damage: this.dmg(40), paint: 0.8, life: 0.9, size: 0.2 });
                }
                this._fired(0.03, 0.1);
                this._sfx('inkHeavy', ctx.origin, 0.7);
              } else this._sfx('empty', ctx.origin, 0.4);
            }
            this.holdT = 0; this.rolling = false;
          }
          this.wasFiring = firing;
          break;
        }
      }
      if (this.vmTank) this.vmTank.scale.y = fmax(0.02, this.ink / 100);
      if (this.vmDrum) this.vmDrum.rotation.x -= (this.rolling ? 14 : 0) * dt;
    }
    // Chunky toy goo-gun viewmodel; the goo tank shows the ink level.
    buildViewmodel() {
      const P = G.Geo && G.Geo.P;
      const root = new THREE.Group();
      if (!P) return root;
      const col = this.color(), kind = this.s.kind;
      const kit = new G.Geo.Kit();
      const cream = 0xfff4e2, navy = 0x1f2a5a, gold = 0xe8b44a, dark = T.shade(col, 0.72);
      // hand + grip
      kit.add(P.cap(0.035, 0.12, 3, 8), navy, 0, -0.1, 0.03, 0.35, 0, 0);
      kit.add(P.tor(0.045, 0.012, 5, 12), gold, 0, -0.06, -0.02, 0, Math.PI / 2, 0);
      kit.add(P.sph(0.065, 10, 8), 0x2ec4b6, 0.01, -0.13, 0.05, 0, 0, 0, 1, 0.85, 1.1);
      kit.add(P.tor(0.055, 0.02, 5, 12), 0xffd23f, 0.01, -0.12, 0.11, 0.2, 0, 0);
      if (kind === 'roller') {
        kit.add(P.cyl(0.018, 0.018, 0.55, 6), navy, 0, -0.12, -0.28, Math.PI / 2 - 0.5, 0, 0);
        kit.add(P.rbox(0.1, 0.06, 0.12, 0.02, 1), cream, 0, -0.02, -0.02);
      } else {
        const L = kind === 'charger' ? 0.46 : kind === 'pellet' ? 0.3 : 0.36;
        kit.add(P.rbox(0.095, 0.11, L, 0.035, 2), cream, 0, 0, -L / 2 + 0.04);
        kit.add(P.rbox(0.1, 0.03, L * 0.8, 0.012, 1), dark, 0, 0.045, -L / 2 + 0.03);
        if (kind === 'pellet') kit.add(P.cyl(0.07, 0.035, 0.1, 12), dark, 0, 0.01, -L - 0.02, Math.PI / 2, 0, 0);
        else if (kind === 'lob') kit.add(P.cyl(0.08, 0.06, 0.12, 12), dark, 0, 0.03, -L, Math.PI / 2 - 0.4, 0, 0);
        else if (kind === 'beam' || kind === 'mist') { for (let i = 0; i < 3; i++) kit.add(P.tor(0.035, 0.01, 4, 10), gold, 0, 0.01, -L - 0.02 - i * 0.035); kit.add(P.cyl(0.02, 0.02, 0.12, 6), navy, 0, 0.01, -L - 0.04, Math.PI / 2, 0, 0); }
        else if (this.s.spin) { for (let i = 0; i < 3; i++) { const a = i * 2.094; kit.add(P.cyl(0.016, 0.016, 0.2, 6), navy, Math.cos(a) * 0.03, 0.01 + Math.sin(a) * 0.03, -L - 0.06, Math.PI / 2, 0, 0); } }
        else { kit.add(P.cyl(0.026, 0.03, kind === 'charger' ? 0.3 : 0.12, 10), dark, 0, 0.01, -L - (kind === 'charger' ? 0.12 : 0.04), Math.PI / 2, 0, 0); kit.add(P.tor(0.03, 0.01, 5, 10), gold, 0, 0.01, -L - (kind === 'charger' ? 0.26 : 0.1)); }
      }
      // tank glass
      kit.add(P.cap(0.05, 0.1, 3, 10), 0xdff6ff, 0, 0.11, 0.0, 0, 0, 0);
      kit.add(P.cyl(0.058, 0.058, 0.025, 10), gold, 0, 0.045, 0.0);
      kit.add(P.cyl(0.04, 0.04, 0.02, 10), gold, 0, 0.19, 0.0);
      const d = kit.data();
      const body = new THREE.Mesh(d.solid, G.M.vc({ spec: 0.7, rimStr: 0.45 }));
      root.add(body);
      // goo inside the tank (scaled by ink)
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.13, 10).translate(0, 0.065, 0), G.M.toon(col, { emissive: col, ei: 0.3, spec: 0.8 }));
      tank.position.set(0, 0.05, 0); root.add(tank); this.vmTank = tank;
      if (kind === 'roller') {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 14).rotateZ(Math.PI / 2), G.M.toon(col, { emissive: col, ei: 0.2, spec: 0.6 }));
        drum.position.set(0, -0.32, -0.5); root.add(drum); this.vmDrum = drum;
      }
      root.scale.setScalar(1.15);
      root.position.set(0.02, 0.02, 0);
      return root;
    }
  }
  T.FallbackGoo = FallbackGoo;

  // Create a turf weapon for a ranger. Wraps update() so paint calls made during it are credited to the owner.
  T.makeWeapon = function (id, owner) {
    let w = null;
    const WP = G.Weapons;
    if (WP && WP.create && WP.turfDefs && WP.turfDefs[id] && !T.forceFallback) {
      const pl = owner && owner.isPlayer;
      const opts = { turf: true };
      if (pl && T.weaponTune(id)) opts.tune = T.weaponTune(id);
      w = G.safe('turf weapon', () => WP.create(id, pl ? T.weaponLevel(id) : 1, pl ? T.weaponMods(id) : [], owner, opts));
      if (w && typeof w.update !== 'function') w = null;
    }
    if (!w) w = new FallbackGoo(id, owner);
    const orig = w.update;
    w.update = function (dt, ctx) {
      const prev = T.paintOwner; T.paintOwner = owner;
      try { return orig.call(this, dt, ctx); } finally { T.paintOwner = prev; }
    };
    w.turfId = id;
    return w;
  };
  // True while the weapon is a roller in its rolling state (caps move speed at 4.5 m/s).
  T.isRolling = w => !!(w && (w.rolling || (w.state === 'roll')));

  // ================================================================== subs + specials runtime
  const geoCache = {};
  function bombGeo() { return geoCache.bomb || (geoCache.bomb = (() => { const g = new THREE.SphereGeometry(0.24, 14, 10); g.userData.shared = true; return g; })()); }
  function cloudGeo() {
    if (geoCache.cloud) return geoCache.cloud;
    const parts = [];
    const P = [[0, 0, 0, 1.6], [1.4, -0.2, 0.3, 1.2], [-1.4, -0.15, -0.2, 1.25], [0.5, 0.5, -0.9, 1.1], [-0.4, 0.4, 1.0, 1.05], [2.3, -0.4, -0.5, 0.8], [-2.2, -0.35, 0.6, 0.85]];
    for (const p of P) {
      const g = G.Geo && G.Geo.P ? G.Geo.P.ico(p[3], 1) : new THREE.IcosahedronGeometry(p[3], 1);
      g.translate(p[0], p[1], p[2]); parts.push(g);
    }
    const g = G.Geo && G.Geo.merge ? G.Geo.merge(parts) : parts[0];
    // white top, slightly darker underside; the team tint comes from the material colour
    if (G.Geo && G.Geo.colorize) G.Geo.colorize(g, (x, y) => (y < -0.3 ? 0xd8dcf0 : 0xffffff));
    g.scale(1, 0.62, 1);
    g.userData.shared = true;
    return (geoCache.cloud = g);
  }
  function sprinklerGeo() {
    if (geoCache.spr) return geoCache.spr;
    const P = G.Geo.P;
    const kit = new G.Geo.Kit();
    kit.add(P.cyl(0.22, 0.28, 0.16, 12), 0x3a4a8a, 0, 0.08, 0);
    kit.add(P.sph(0.18, 12, 8), 0xffffff, 0, 0.2, 0, 0, 0, 0, 1, 0.7, 1);
    kit.add(P.cyl(0.04, 0.04, 0.22, 6), 0xe8b44a, 0, 0.35, 0);
    kit.add(P.rbox(0.36, 0.05, 0.07, 0.02, 1), 0xe8b44a, 0, 0.46, 0);
    const g = kit.data().solid; g.userData.shared = true;
    return (geoCache.spr = g);
  }

  class Gear {
    constructor(world, match) { this.w = world; this.M = match; this.list = []; this.mats = {}; }
    mat(color, opts) {
      const k = color + '|' + JSON.stringify(opts || {});
      return this.mats[k] || (this.mats[k] = G.M.toon(color, opts || { emissive: color, ei: 0.35, spec: 0.9, rimStr: 0.5 }));
    }
    _throwVel(r, speed, up, out) {
      const f = r.forward(out);
      f.y += up; f.normalize().multiplyScalar(speed);
      if (r.vel) { f.x += r.vel.x * 0.3; f.z += r.vel.z * 0.3; }
      return f;
    }
    // ---------------------------------------------------------------- subs
    throwSub(r, id) {
      const def = T.SUBS[id] || T.SUBS.bubble;
      if ((r.ink || 0) < def.cost) return false;
      r.ink -= def.cost;
      r.inkRefillT = fmax(r.inkRefillT || 0, 0.8);
      const col = T.teamColor(r.team);
      const pos = r.eyePos(new V3()); const f = r.forward(_a); pos.addScaledVector(f, 0.6); pos.y -= 0.15;
      const vel = this._throwVel(r, id === 'pop' ? 16 : 13.5, 0.22, new V3());
      const mesh = new THREE.Mesh(id === 'sprinkler' ? sprinklerGeo() : bombGeo(), id === 'sprinkler' ? G.M.vc({ spec: 0.6 }) : this.mat(col));
      if (id === 'pop') mesh.scale.setScalar(0.75);
      mesh.position.copy(pos);
      this.w.add(mesh);
      if (id === 'sprinkler') for (let i = this.list.length - 1; i >= 0; i--) { const o = this.list[i]; if (o.type === 'sprinkler' && o.src === r) this._remove(i); }
      this.list.push({ type: id, pos, vel, src: r, team: r.team, col, mesh, t: 0, armed: false, fuse: 1.0, stuck: false, bounces: 0, life: 10, sprayT: 0, nrm: new V3(0, 1, 0) });
      if (G.Audio) { if (r.isPlayer) G.Audio.sfx('grenade', { vol: 0.6 }); else G.Audio.sfxAt('grenade', pos, { vol: 0.5 }); }
      return true;
    }
    _remove(i) { const o = this.list[i]; if (o.mesh) this.w.remove(o.mesh); this.list.splice(i, 1); }
    _burst(o, inner, innerDmg, outer, outerDmg, paintR) {
      const w = this.w, pos = o.pos;
      for (const a of w.actors) {
        if (!a.alive || !a.targetable || a.team === o.team) continue;
        const c = a.aimPoint(_b);
        const d = c.distanceTo(pos) - a.r;
        if (d > outer) continue;
        if (d > inner * 0.6 && !w.phys.los(pos, c, false)) continue;
        const amt = d <= inner ? innerDmg : outerDmg;
        w.damage(a, amt * (o.src && !o.src.isPlayer ? (o.src.damageMult || o.src.dmgMult || 1) : 1), { src: o.src, type: 'explosion', pos: pos.clone(), dir: c.clone().sub(pos), knock: d <= inner ? 4 : 2 });
      }
      const floorY = w.phys.groundAt(pos.x, pos.z, 0.05, pos.y + 0.3);
      if (pos.y - floorY < 2.5) { _e.set(pos.x, floorY, pos.z); paint(w, _e, paintR, o.team, UP, o.src); }
      if (o.stuck && o.nrm.y < 0.5) paint(w, pos, fmin(2.2, paintR), o.team, o.nrm, o.src);
      w.fx.sphereFlash(pos, paintR * 0.9, o.col, 0.3);
      w.fx.ring(pos, paintR * 1.15, o.col, 0.45, floorY + 0.06);
      w.fx.burst(pos, [o.col, o.col, 0xffffff], Math.round(10 + paintR * 6), 4 + paintR * 1.5, 0.32, 0.7, { normal: true, grav: 12, drag: 1.5 });
      if (G.Audio) G.Audio.sfxAt(paintR > 2 ? 'splashBig' : 'splat', pos, { size: paintR });
      const pl = w.player;
      if (pl) { const d = pl.pos.distanceTo(pos); if (d < paintR * 3) w.fx.shake(0.35 * (1 - d / (paintR * 3))); }
    }
    _bombStep(o, dt) {
      const w = this.w;
      if (o.stuck) return null;
      o.vel.y -= 18 * dt;
      const len = o.vel.length() * dt;
      if (len < 1e-5) return null;
      _d.copy(o.vel).normalize();
      const hit = w.phys.raycast(o.pos.x, o.pos.y, o.pos.z, _d.x, _d.y, _d.z, len + 0.2);
      // touching an enemy counts as contact
      for (const a of w.actors) {
        if (!a.alive || a.team === o.team || !a.targetable) continue;
        const dx = a.pos.x - o.pos.x, dz = a.pos.z - o.pos.z, dy = o.pos.y - (a.pos.y + a.h * 0.5);
        if (dx * dx + dz * dz < 0.6 && Math.abs(dy) < a.h * 0.6) return { actor: a };
      }
      if (hit && hit.t <= len + 0.2) {
        o.pos.set(hit.x, hit.y, hit.z).addScaledVector(_e.set(hit.nx, hit.ny, hit.nz), 0.2);
        o.nrm.set(hit.nx, hit.ny, hit.nz);
        return hit;
      }
      o.pos.addScaledVector(o.vel, dt);
      if (o.pos.y < -6) o.dead = true;
      return null;
    }
    // ---------------------------------------------------------------- specials
    useSpecial(r, id) {
      const M = this.M, w = this.w;
      const col = T.teamColor(r.team);
      if (r.tstats) r.tstats.specials++;
      w.fx.flash(r.eyePos(new V3()), col, 4.5, 0.5);
      w.fx.ring(new V3(r.pos.x, r.pos.y + 0.05, r.pos.z), 2.5, col, 0.5);
      if (G.Audio) {
        if (r.isPlayer) { G.Audio.sfx('boost', { vol: 0.8 }); G.Audio.sfx('npc', { pitch: 1.3, vol: 0.7 }); }
        else { G.Audio.sfxAt('boost', r.pos, { vol: 0.7 }); G.Audio.sfxAt('npc', r.pos, { pitch: r.team ? 0.8 : 1.2 }); }
      }
      if (M && M.onSpecial) M.onSpecial(r, id);
      if (id === 'splash') { this._splashdown(r); return true; }
      const f = r.forward(new V3());
      const eye = r.eyePos(new V3());
      if (id === 'storm') {
        // land point: crosshair hit up to 25 m, else 25 m ahead
        const hit = w.phys.raycast(eye.x, eye.y, eye.z, f.x, f.y, f.z, 25);
        const tgt = hit ? new V3(hit.x, hit.y, hit.z) : eye.clone().addScaledVector(f, 25);
        const fl = w.phys.groundAt(tgt.x, tgt.z, 0.1, fmax(tgt.y, 0) + 1);
        const dir = new V3(f.x, 0, f.z); if (dir.lengthSq() < 1e-4) dir.set(0, 0, r.team === 0 ? -1 : 1); dir.normalize();
        const mesh = new THREE.Mesh(cloudGeo(), this.mat(T.shade(col, 1.55), { rimStr: 0.6, rimColor: 0xffffff, spec: 0.2 }));
        mesh.position.copy(eye); mesh.scale.setScalar(0.2);
        w.add(mesh);
        this.list.push({ type: 'storm', src: r, team: r.team, col, mesh, t: -0.5, from: eye.clone(), to: new V3(tgt.x, fl + 4.6, tgt.z), dir, life: 7, paintT: 0, dmgT: 0, pos: eye.clone() });
        return true;
      }
      // triple splash: three mega-blobs lobbed 0.3 s apart in a small fan
      for (let i = 0; i < 3; i++) this.list.push({ type: 'tripleQ', src: r, team: r.team, col, t: -0.5 - i * 0.3, yaw: (i - 1) * 7 * DEG });
      return true;
    }
    _launchBlob(o) {
      const r = o.src, w = this.w;
      if (!r.alive) return;
      const f = r.forward(_a); const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
      const x = f.x * c - f.z * s; f.z = f.x * s + f.z * c; f.x = x;
      f.y = fmax(f.y, -0.2) + 0.28; f.normalize();
      const pos = r.eyePos(new V3()).addScaledVector(f, 0.7);
      const team = r.team, col = o.col, self = this;
      const burst = (p) => {
        self._burst({ pos: p.clone ? p.clone() : new V3(p.x, p.y, p.z), team, src: r, col, stuck: false, nrm: UP }, 2.5, 60, 2.5, 60, 3.5);
      };
      w.projectiles.spawn({
        pos, dir: f, speed: 17, gravity: 16, life: 3.0, radius: 0.3, damage: 0, src: r, team, color: col, size: 0.42, kind: 'grenade', trail: true,
        onHit: (p, hit) => { burst(hit.point); return false; },
        onTick: (p, dt) => { if (p.life <= dt * 1.5 && !p.data.done) { p.data.done = true; burst(p.pos); } },
      });
      if (G.Audio) G.Audio.sfxAt('grenade', pos, { vol: 0.7, pitch: 0.8 });
    }
    _splashdown(r) {
      r.lockT = 1.5;
      if (r.isPlayer) { r.inputEnabled = false; r.iframes = 1.6; }
      else r.spawnProt = fmax(r.spawnProt || 0, 1.6);
      r.vel.set(r.vel.x * 0.2, 9.5, r.vel.z * 0.2);
      r.grounded = false;
      this.list.push({ type: 'splash', src: r, team: r.team, col: T.teamColor(r.team), t: 0, slam: false, ringY: r.pos.y + 0.05 });
    }
    // ---------------------------------------------------------------- per-frame
    update(dt) {
      const w = this.w;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const o = this.list[i];
        o.t += dt;
        let kill = false;
        switch (o.type) {
          case 'bubble': case 'pop': {
            const hit = this._bombStep(o, dt);
            if (hit) {
              if (o.type === 'pop') { this._burst(o, 1.2, 60, 2.5, 30, 1.8); kill = true; break; }
              o.armed = true;
              if (hit.actor) { o.stuck = true; o.vel.set(0, 0, 0); }
              else {
                const vn = o.vel.x * hit.nx + o.vel.y * hit.ny + o.vel.z * hit.nz;
                if (o.bounces < 1 && Math.abs(vn) > 4) { o.vel.addScaledVector(_e.set(hit.nx, hit.ny, hit.nz), -2 * vn).multiplyScalar(0.35); o.bounces++; }
                else { o.stuck = true; o.vel.set(0, 0, 0); }
              }
            }
            if (o.armed) {
              o.fuse -= dt;
              const k = 1 + 0.18 * fmax(0, Math.sin(o.t * (10 + (1 - o.fuse) * 30)));
              o.mesh.scale.setScalar(k);
              if (o.fuse <= 0) { this._burst(o, 1.5, 120, 3.5, 35, 3.0); kill = true; }
            }
            if (o.dead || o.t > 6) kill = true;
            o.mesh.position.copy(o.pos);
            break;
          }
          case 'sprinkler': {
            const hit = this._bombStep(o, dt);
            if (hit) { o.stuck = true; o.vel.set(0, 0, 0); if (hit.actor) o.nrm.set(0, 1, 0); }
            o.mesh.position.copy(o.pos);
            if (o.stuck) {
              _e.copy(o.nrm); o.mesh.quaternion.setFromUnitVectors(UP, _e);
              o.mesh.rotateY(o.t * 6);
              o.life -= dt; o.sprayT -= dt;
              if (o.sprayT <= 0) {
                o.sprayT = o.life > 7 ? 0.2 : o.life > 3 ? 0.32 : 0.55;
                const a = frand() * Math.PI * 2, d = 1.2 + frand() * 2.8;
                const bx = o.pos.x + o.nrm.x * 1.2, bz = o.pos.z + o.nrm.z * 1.2;
                const x = bx + Math.cos(a) * d, z = bz + Math.sin(a) * d;
                T.paintFloorBelow(w, x, o.pos.y + 1.5, z, 0.85, o.team, o.src);
                _a.set((x - o.pos.x) * 1.6, 3.5, (z - o.pos.z) * 1.6);
                w.fx.spawn(_b.copy(o.pos).add(_e.set(0, 0.45, 0)), _a, o.col, 0.25, 0.55, { normal: true, grav: 12 });
              }
              if (o.life <= 0) { w.fx.burst(o.pos, o.col, 10, 3, 0.25, 0.5, { normal: true }); kill = true; }
            }
            if (o.dead || o.t > 14) kill = true;
            break;
          }
          case 'storm': {
            if (o.t < 0) break;  // 0.5 s startup
            if (o.t < 0.7) {
              const k = o.t / 0.7;
              o.pos.lerpVectors(o.from, o.to, k); o.pos.y += Math.sin(k * Math.PI) * 4;
              o.mesh.scale.setScalar(0.2 + 0.8 * k);
            } else {
              o.life -= dt;
              o.to.addScaledVector(o.dir, 1.0 * dt);
              o.to.x = U.clamp(o.to.x, -29, 29); o.to.z = U.clamp(o.to.z, -39, 39);
              o.pos.copy(o.to); o.pos.y += Math.sin(o.t * 1.3) * 0.15;
              o.paintT -= dt;
              if (o.paintT <= 0) {
                o.paintT = 0.11;
                for (let k = 0; k < 2; k++) {
                  const a = frand() * Math.PI * 2, d = Math.sqrt(frand()) * 2.0;
                  T.paintFloorBelow(w, o.pos.x + Math.cos(a) * d, o.pos.y - 0.5, o.pos.z + Math.sin(a) * d, 0.95, o.team, o.src, { noCharge: true });
                }
              }
              o.dmgT -= dt;
              if (o.dmgT <= 0) {
                o.dmgT = 0.5;
                for (const a of w.actors) {
                  if (!a.alive || !a.targetable || a.team === o.team) continue;
                  if (fhyp(a.pos.x - o.pos.x, a.pos.z - o.pos.z) > 2.3 || a.pos.y > o.pos.y) continue;
                  w.damage(a, 3, { src: o.src, type: 'goo', pos: o.pos.clone(), silent: true });
                }
              }
              for (let k = 0; k < 3; k++) w.fx.spawn(_a.set(o.pos.x + frange(-2, 2), o.pos.y - 0.6, o.pos.z + frange(-2, 2)), _b.set(0, -12, 0), o.col, 0.16, 0.35, O_DRIP);
              if (o.life <= 0.6) o.mesh.scale.setScalar(fmax(0.05, o.life / 0.6));
              if (o.life <= 0) kill = true;
            }
            o.mesh.position.copy(o.pos);
            break;
          }
          case 'tripleQ': {
            if (o.t >= 0) { this._launchBlob(o); kill = true; }
            break;
          }
          case 'splash': {
            const r = o.src;
            if (!r.alive) { this._endSplash(r); kill = true; break; }
            if (!o.slam && o.t >= 0.6) { o.slam = true; r.vel.set(0, -26, 0); }
            if (frand() < 0.6) w.fx.spawn(_a.set(r.pos.x + frange(-0.4, 0.4), r.pos.y + 0.3, r.pos.z + frange(-0.4, 0.4)), _b.set(0, -2, 0), o.col, 0.4, 0.4, { normal: true });
            if (o.t < 0.6 && Math.floor(o.t * 10) !== Math.floor((o.t - dt) * 10)) w.fx.ring(_a.set(r.pos.x, o.ringY, r.pos.z), 6, o.col, 0.3, o.ringY);
            if (o.slam && (r.grounded || o.t > 1.45)) {
              this._burst({ pos: new V3(r.pos.x, r.pos.y + 0.3, r.pos.z), team: r.team, src: r, col: o.col, stuck: false, nrm: UP }, 3, 80, 6, 40, 6);
              w.fx.shake(r.isPlayer ? 0.55 : 0.2);
              this._endSplash(r);
              kill = true;
            }
            break;
          }
        }
        if (kill) this._remove(i);
      }
    }
    _endSplash(r) {
      r.lockT = 0;
      if (r.isPlayer) { r.inputEnabled = !!(this.M && this.M.phase === 'play'); r.iframes = fmax(r.iframes || 0, 0.3); }
    }
    clear() { for (let i = this.list.length - 1; i >= 0; i--) this._remove(i); }
    dispose() { this.clear(); }
  }
  T.Gear = Gear;
})(window.G);

}).call(window); } catch (e) { console.error('[module 24d_turf_gear.js]', e); }
// ---- 24e_turf_bots.js
try { (function () {
// 24e_turf_bots.js — Goo Turf bots.
//   T.Nav       1 m navgrid over the arena (heights from physics, 8-neighbour steps ≤ 0.55 m up / ≤ 2.7 m down,
//               thin-wall checks), A* with enemy-goo cost and per-team blocked spawn zones, line-walk checks.
//   T.makeRangerVisual(color, team, seed) -> {group, setBlob(b), animate(state, t, dt, speed, motion?), hit(dirX, dirZ, k),
//               spawnIn()} uses G.Geo.humanoid when available, else a built-in toy ranger (body + 2 legs + swim blob).
//               motion {vx, vz, vy, yaw (model facing), turn, grounded} lets the humanoid gait follow the real direction of
//               travel (strafes / backpedals step the right way) and lean into acceleration.
//   T.TurfBot   G.Actor with the GDD utility AI (scored every 0.5 s): paint unpainted 0.4, contest enemy goo 0.3,
//               engage visible rival 0.5, retreat + dive when HP < 40 or tank < 20 → 0.8, follow "This way!" pings.
//               Roles: painter / slayer / anchor. Rival skill scales with difficulty (aim error, reaction, damage).
//               Interface for other modules: bot.goal (V3), bot.onThink(bot) hook, bot.ink, bot.swimming, bot.respawn(pos).
(function (G) {
  'use strict';
  // Math.max / min / sign / hypot / random hand back a fresh heap number from the mid-tier (Maglev) compiled code that
  // runs most per-frame code (measured 12-36 bytes a call); these plain twins are inlined and allocate nothing.
  // frand: xorshift32, its state in an Int32Array (updating a typed array never boxes); frange(a, b) = U.rand(a, b).
  const fmax = (a, b) => (a > b ? a : b), fmin = (a, b) => (a < b ? a : b), fsign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const fhyp = (x, y) => Math.sqrt(x * x + y * y);
  const _rs = new Int32Array(1); _rs[0] = (Math.random() * 0x7fffffff) | 1;
  const frand = () => { let x = _rs[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _rs[0] = x; return (x >>> 0) / 4294967296; };
  const frange = (a, b) => a + frand() * (b - a);
  const T = G.Turf = G.Turf || {};
  const V3 = THREE.Vector3;
  const U = G.util;
  const DEG = Math.PI / 180;
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3();

  // ================================================================== navgrid
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  class Nav {
    constructor(phys, rect, pads) {
      this.phys = phys;
      this.minX = rect.minX; this.minZ = rect.minZ;
      this.nx = Math.round(rect.maxX - rect.minX); this.nz = Math.round(rect.maxZ - rect.minZ);
      const N = this.nx * this.nz;
      this.h = new Float32Array(N); this.walk = new Uint8Array(N); this.mask = new Uint8Array(N);
      this.blocked = [new Uint8Array(N), new Uint8Array(N)];
      for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
        const k = j * this.nx + i, x = this.x(k), z = this.z(k);
        const h = phys.groundAt(x, z, 0.3, 99);
        this.h[k] = h;
        // a node is walkable if it is not the top of a tall wall/tower and not hugging a taller wall
        this.walk[k] = h <= 3.4 ? 1 : 0;
        if (this.walk[k]) { const hc = phys.groundAt(x, z, 0.42, 99); if (hc > h + 0.6) this.walk[k] = 0; }
        // spawn barrier: team t may not enter the other team's pad zone
        for (let t = 0; t < 2; t++) { const p = pads[1 - t]; if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) this.blocked[t][k] = 1; }
      }
      for (let k = 0; k < N; k++) {
        if (!this.walk[k]) continue;
        const i = k % this.nx, j = (k / this.nx) | 0;
        let m = 0;
        for (let n = 0; n < 4; n++) { const ii = i + NB[n][0], jj = j + NB[n][1]; if (ii < 0 || jj < 0 || ii >= this.nx || jj >= this.nz) continue; if (this._can(k, jj * this.nx + ii)) m |= 1 << n; }
        for (let n = 4; n < 8; n++) {
          const ii = i + NB[n][0], jj = j + NB[n][1]; if (ii < 0 || jj < 0 || ii >= this.nx || jj >= this.nz) continue;
          const ox = NB[n][0] > 0 ? 0 : 1, oz = NB[n][1] > 0 ? 2 : 3;
          if ((m & (1 << ox)) && (m & (1 << oz)) && this._can(k, jj * this.nx + ii)) m |= 1 << n;
        }
        this.mask[k] = m;
      }
      this.g = new Float32Array(N); this.f = new Float32Array(N); this.from = new Int32Array(N); this.seen = new Uint32Array(N); this.closed = new Uint32Array(N); this.stamp = 0;
      this.heap = new Int32Array(N + 8); this.hn = 0;
    }
    x(k) { return this.minX + (k % this.nx) + 0.5; }
    z(k) { return this.minZ + ((k / this.nx) | 0) + 0.5; }
    idx(x, z) { const i = Math.floor(x - this.minX), j = Math.floor(z - this.minZ); if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1; return j * this.nx + i; }
    _can(a, b) {
      if (!this.walk[b]) return false;
      const ha = this.h[a], hb = this.h[b];
      if (hb - ha > 0.55 || ha - hb > 2.7) return false;
      const mx = (this.x(a) + this.x(b)) / 2, mz = (this.z(a) + this.z(b)) / 2;
      const hm = this.phys.groundAt(mx, mz, 0.22, 99);
      if (hm - fmax(ha, hb) > 0.5) return false;
      if (hm - ha > 0.55) return false;
      return true;
    }
    nearest(x, z, team) {
      const k0 = this.idx(U.clamp(x, this.minX + 0.5, this.minX + this.nx - 0.5), U.clamp(z, this.minZ + 0.5, this.minZ + this.nz - 0.5));
      if (k0 >= 0 && this.walk[k0] && !this.blocked[team][k0]) return k0;
      const i0 = k0 % this.nx, j0 = (k0 / this.nx) | 0;
      for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (fmax(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
        const k = j * this.nx + i; if (this.walk[k] && !this.blocked[team][k]) return k;
      }
      return -1;
    }
    _push(k) { const H = this.heap, F = this.f; let i = this.hn++; H[i] = k; while (i > 0) { const p = (i - 1) >> 1; if (F[H[p]] <= F[k]) break; H[i] = H[p]; i = p; } H[i] = k; }
    _pop() {
      const H = this.heap, F = this.f; const top = H[0]; const last = H[--this.hn];
      let i = 0; const n = this.hn;
      for (;;) { let l = 2 * i + 1; if (l >= n) break; const r = l + 1; if (r < n && F[H[r]] < F[H[l]]) l = r; if (F[H[l]] >= F[last]) break; H[i] = H[l]; i = l; }
      if (n > 0) H[i] = last;
      return top;
    }
    // A* from world point to world point. Writes node indices into out (start excluded). enemyOwner = paint team value to avoid.
    find(fx, fz, tx, tz, team, out, paint, enemyOwner) {
      out.length = 0;
      const s = this.nearest(fx, fz, team), e = this.nearest(tx, tz, team);
      if (s < 0 || e < 0) return false;
      if (s === e) { out.push(e); return true; }
      const st = ++this.stamp, B = this.blocked[team], nx = this.nx;
      const ex = e % nx, ez = (e / nx) | 0;
      const hfn = k => { const dx = Math.abs(k % nx - ex), dz = Math.abs(((k / nx) | 0) - ez); return dx + dz + (1.4142 - 2) * fmin(dx, dz); };
      this.hn = 0; this.g[s] = 0; this.f[s] = hfn(s); this.seen[s] = st; this.from[s] = -1; this._push(s);
      let it = 0, found = false;
      while (this.hn > 0 && it++ < 3000) {
        const k = this._pop();
        if (this.closed[k] === st) continue;
        this.closed[k] = st;
        if (k === e) { found = true; break; }
        const m = this.mask[k], i = k % nx, j = (k / nx) | 0;
        for (let n = 0; n < 8; n++) {
          if (!(m & (1 << n))) continue;
          const kk = (j + NB[n][1]) * nx + i + NB[n][0];
          if (B[kk] || this.closed[kk] === st) continue;
          let cost = n < 4 ? 1 : 1.4142;
          if (paint && enemyOwner && paint.ownerAt(this.x(kk), this.z(kk)) === enemyOwner) cost += 1.6;
          const g = this.g[k] + cost;
          if (this.seen[kk] === st && g >= this.g[kk]) continue;
          this.seen[kk] = st; this.g[kk] = g; this.f[kk] = g + hfn(kk); this.from[kk] = k; this._push(kk);
        }
      }
      if (!found) return false;
      for (let k = e; k !== s && k >= 0; k = this.from[k]) out.push(k);
      out.reverse();
      return true;
    }
    // Straight-line walkability between two world points (samples every 0.5 m).
    lineOK(ax, az, ay, bx, bz, team) {
      const d = fhyp(bx - ax, bz - az), n = fmax(1, Math.ceil(d / 0.5));
      let ph = ay;
      for (let i = 1; i <= n; i++) {
        const t = i / n, k = this.idx(ax + (bx - ax) * t, az + (bz - az) * t);
        if (k < 0 || !this.walk[k] || this.blocked[team][k]) return false;
        const h = this.h[k];
        if (h - ph > 0.5 || ph - h > 2.7) return false;
        ph = h;
      }
      return true;
    }
  }
  T.Nav = Nav;

  // ================================================================== ranger visuals
  const vcache = {};
  function rangerGeos(hex) {
    if (vcache[hex]) return vcache[hex];
    const P = G.Geo.P, Kit = G.Geo.Kit;
    const light = T.shade(hex, 1.35), dark = T.shade(hex, 0.7);
    const cream = 0xfff1dc, navy = 0x26305e, visor = 0x2a1f55, led = 0x7ff6ff, gold = 0xe8b44a;
    const body = new Kit();
    body.add(P.cap(0.25, 0.32, 4, 12), hex, 0, 1.02, 0);                       // jacket torso
    body.add(P.tor(0.23, 0.05, 6, 14), cream, 0, 0.82, 0, Math.PI / 2, 0, 0);    // belt
    body.add(P.sph(0.26, 14, 10), cream, 0, 1.5, 0);                            // head
    body.add(P.sph(0.24, 14, 8), visor, 0, 1.52, 0.06, 0, 0, 0, 1.02, 0.55, 0.95); // visor band
    body.glow(P.sph(0.045, 8, 6), led, -0.085, 1.53, 0.27);                     // LED eyes
    body.glow(P.sph(0.045, 8, 6), led, 0.085, 1.53, 0.27);
    body.add(P.cyl(0.015, 0.015, 0.22, 5), navy, 0.12, 1.82, -0.02);             // robot-badge antenna
    body.glow(P.sph(0.05, 8, 6), 0xffd23f, 0.12, 1.94, -0.02);
    body.add(P.cap(0.14, 0.2, 4, 10), light, 0, 1.12, -0.27);                    // goo tank backpack
    body.add(P.cyl(0.15, 0.15, 0.05, 10), gold, 0, 0.97, -0.27);
    body.add(P.cap(0.075, 0.22, 3, 8), hex, -0.3, 1.04, 0.1, 0.9, 0, 0.2);       // arms reaching to the gun
    body.add(P.cap(0.075, 0.22, 3, 8), hex, 0.3, 1.04, 0.1, 0.9, 0, -0.2);
    body.add(P.sph(0.08, 8, 6), 0x2ec4b6, -0.18, 1.0, 0.33);                    // mittens
    body.add(P.sph(0.08, 8, 6), 0x2ec4b6, 0.16, 1.0, 0.31);
    body.add(P.rbox(0.13, 0.15, 0.46, 0.05, 1), cream, 0, 1.06, 0.45);           // goo blaster
    body.add(P.cyl(0.05, 0.06, 0.16, 10), dark, 0, 1.08, 0.74, Math.PI / 2, 0, 0);
    body.add(P.cap(0.05, 0.08, 3, 8), light, 0, 1.2, 0.36);
    const bd = body.data();
    const leg = new Kit();
    leg.add(P.cap(0.1, 0.34, 3, 8), navy, 0, -0.27, 0);
    leg.add(P.rbox(0.18, 0.12, 0.28, 0.05, 1), 0xffffff, 0, -0.58, 0.05);
    leg.add(P.rbox(0.19, 0.04, 0.3, 0.02, 1), hex, 0, -0.63, 0.05);
    const ld = leg.data();
    const blob = G.Geo.blob(0.42, 2, 0.12, 3, { sy: 0.5 });
    G.Geo.colorize(blob, (x, y) => (y > 0.08 ? light : hex));
    const eyes = [P.sph(0.07, 8, 6), P.sph(0.07, 8, 6)];
    G.Geo.xf(eyes[0], -0.13, 0.12, 0.33); G.Geo.xf(eyes[1], 0.13, 0.12, 0.33);
    eyes.forEach(e => G.Geo.colorize(e, 0xffffff));
    const pup = [P.sph(0.035, 6, 4), P.sph(0.035, 6, 4)];
    G.Geo.xf(pup[0], -0.13, 0.13, 0.39); G.Geo.xf(pup[1], 0.13, 0.13, 0.39);
    pup.forEach(e => G.Geo.colorize(e, 0x1e1a4d));
    const blobG = G.Geo.merge([blob, ...eyes, ...pup]);
    [bd.solid, bd.glow, ld.solid, blobG].forEach(g => { if (g) g.userData.shared = true; });
    return (vcache[hex] = { body: bd.solid, glow: bd.glow, leg: ld.solid, blob: blobG });
  }
  T.makeRangerVisual = function (hex, team, seed) {
    if (G.Geo && G.Geo.humanoid && G.Geo.animateHumanoid) {
      const h = G.safe('humanoid', () => G.Geo.humanoid({ main: hex, accent: T.shade(hex, 1.4), dark: 0x26305e, visor: 0x2a1f55 }, { team, seed }));
      if (h && h.group) {
        // reused anim opts (no per-frame object / closure): forward-only, or with full root motion
        const oF = { speed: 0 }, oM = { speed: 0, vx: 0, vz: 0, vy: 0, yaw: 0, turn: 0, grounded: true };
        return {
          group: h.group, ext: h,
          setBlob(b) { if (h.setBlob) h.setBlob(b); },
          animate(state, t, dt, speed, m) {
            let o = oF;
            if (m) { o = oM; oM.vx = m.vx; oM.vz = m.vz; oM.vy = m.vy; oM.yaw = m.yaw; oM.turn = m.turn; oM.grounded = m.grounded !== false; }
            o.speed = speed;
            try { G.Geo.animateHumanoid(h, state, t, dt, o); } catch (e) { console.error('[animHumanoid]', e); G.bus.emit('error', 'animHumanoid', e); }
          },
          hit(dx, dz, k) { if (h.hit) h.hit(dx || 0, dz || 0, k != null ? k : 0.6, false); else if (h.kick) h.kick(); },
          spawnIn() { if (h.spawnIn) h.spawnIn(); },
        };
      }
    }
    const geos = rangerGeos(hex);
    const mat = G.M.vc({ spec: 0.65, rimStr: 0.5 });
    const group = new THREE.Group();
    const rig = new THREE.Group(); group.add(rig);
    const body = new THREE.Mesh(geos.body, mat); rig.add(body);
    if (geos.glow) body.add(new THREE.Mesh(geos.glow, G.Geo.glowMat ? G.Geo.glowMat() : G.M.basic(0xffffff, { vertexColors: true })));
    const legL = new THREE.Mesh(geos.leg, mat), legR = new THREE.Mesh(geos.leg, mat);
    legL.position.set(-0.13, 0.66, 0); legR.position.set(0.13, 0.66, 0);
    rig.add(legL, legR);
    const blob = new THREE.Mesh(geos.blob, G.M.vc({ spec: 0.95, rimStr: 0.55 }));
    blob.visible = false; group.add(blob);
    let phase = (seed || 0) * 1.7, kick = 0, blobOn = false;
    return {
      group,
      setBlob(b) { blobOn = b; blob.visible = b; rig.visible = !b; },
      hit() { kick = 1; },
      spawnIn() {},
      animate(state, t, dt, speed) {
        kick = fmax(0, kick - dt * 5);
        if (blobOn) {
          const k = fmin(1, speed / 10);
          blob.scale.set(1 + 0.08 * Math.sin(t * 9), 0.8 + 0.12 * Math.sin(t * 9 + 1) - 0.15 * k, 1 + 0.35 * k);
          blob.position.y = 0.05;
          return;
        }
        const run = fmin(1, speed / 5.5);
        phase += dt * (4 + speed * 1.6);
        const sw = Math.sin(phase) * 0.75 * run;
        legL.rotation.x = sw; legR.rotation.x = -sw;
        rig.position.y = Math.abs(Math.sin(phase)) * 0.06 * run + (state === 'jump' ? 0.05 : 0);
        rig.rotation.x = 0.12 * run - kick * 0.25 + (state === 'shoot' ? -0.04 : 0);
        const sq = 1 - kick * 0.12;
        rig.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      },
    };
  };

  // ================================================================== the bot
  // Spawn protection's 'no damage' result: shared, with the shape of 10_world's takeDamage results (doubles), like
  // 17_enemies' NO_DMG (world.damage only reads it)
  const NO_DMG = { dealt: -0, toShield: -0, killed: false };
  const ROLE_BIAS = { painter: { paint: 0.12, engage: -0.05, contest: 0 }, slayer: { paint: -0.05, engage: 0.15, contest: 0.05 }, anchor: { paint: 0, engage: 0.05, contest: 0.08 } };
  class TurfBot extends G.Actor {
    constructor(world, M, o) {
      super(world, { r: 0.4, h: 1.75, team: o.team, hp: 100, kind: 'turfbot' });
      this.M = M; this.isBot = true; this.name = o.name; this.role = o.role || 'painter'; this.slot = o.slot || 0;
      this.weaponId = o.weapon; this.subId = o.sub || 'bubble'; this.specialId = o.special || 'storm';
      this.gt = o.team + 1; this.egt = o.team === 0 ? 2 : 1;
      this.color = o.color;
      // (numbers that turn fractional in play start as doubles: -0, a .5 value, or -0 then the value — see 10_world's Actor;
      // a small-integer field that later takes a fraction changes every bot's hidden class mid-match and deopts the bot code)
      this.ink = -0; this.ink = 100; this.inkRefillT = -0; this.sp = -0; this.swimming = false; this.hideVm = true;
      this.inkColor = o.color; this.usesMoveMult = true; this.speedMod = 1; this.botCharge = 0.95;
      this.yaw = -0; this.yaw = o.team === 0 ? 0 : Math.PI; this.pitch = -0.2;
      this.critY = 1.38; this.step = 0.45;
      this.tstats = { cells: 0, pops: 0, kos: 0, specials: 0, enemyCells: 0, splashKos: 0 };
      this.skill = o.team === 1 ? T.diff() : T.DIFF.normal;
      this.damageMult = this.dmgMult = o.team === 1 ? this.skill.dmg : 1;   // same rule as G.Bot (weapons read owner.damageMult)
      this.weapon = T.makeWeapon(this.weaponId, this);
      this.ws = T.stats(this.weaponId);
      this.vis = T.makeRangerVisual(o.color, o.team, this.slot);
      this.mesh = this.vis.group;
      this.shadow = G.R.blobShadow(0.42); world.add(this.shadow);
      this.mmColor = T.css(o.color);
      this.tgoal = new V3(); this.goal = this.tgoal; this.hasGoal = false; this.goalT = -0;
      this.path = []; this.pi = 0; this.repathT = -0; this.lookT = -0;
      this.thinkT = 0.2 + frand() * 0.5; this.mode = 'paint';
      this.target = null; this.tVis = false; this.visT = -0; this.seenT = -0; this.lostT = -0;
      this.aimP = new V3(); this.aimErr = new V3(); this.errT = -0;
      this.firing = false; this.lastFireT = -9.5; this.respawnT = -0; this.gooDmg = -0; this.gooCool = -0;
      this.stuckT = -0; this.prevPos = new V3(); this.sweep = frand() * 6; this.lockT = -0;
      this.subCd = 3 + frand() * 4; this.spHold = -0; this.wantSwim = false; this.spawnProt = -0;
      this.chargeT = -0; this.animT = frand() * 5; this.lastHurtBy = null;
      this._vyaw = { x: NaN, v: -0, t: -0, f: 2.9, z: 1 };   // rendered facing (spring on the sim yaw; the same shape as 17c's G.Bot)
      this._mo = { vx: -0, vz: -0, vy: -0, yaw: -0, turn: -0, grounded: true };
      this.onThink = null;   // optional external hook (bot) => void
      this._ctx = { world, owner: this, firing: false, fireP: false, eye: new V3(), eyeDir: new V3(), origin: new V3(), dir: new V3(), aimPoint: new V3(), target: null, team: o.team };
    }
    eyePos(out) { return (out || new V3()).set(this.pos.x, this.pos.y + (this.swimming ? 0.45 : 1.5), this.pos.z); }
    forward(out) { const cp = Math.cos(this.pitch); return (out || new V3()).set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp); }
    aimPoint(out) { return (out || new V3()).set(this.pos.x, this.pos.y + (this.swimming ? 0.3 : this.h * 0.55), this.pos.z); }
    onFired() {}
    takeDamage(amount, info) {
      if (this.spawnProt > 0 && !(info && info.type === 'fall')) return NO_DMG;
      return super.takeDamage(amount, info);
    }
    onHurt(info, amt) {
      let dx = 0, dz = 0;
      const d = info && info.dir, sp = (info && info.pos) || (info && info.src && info.src.pos);
      if (d && d.lengthSq && d.lengthSq() > 1e-6) { dx = d.x; dz = d.z; } else if (sp) { dx = this.pos.x - sp.x; dz = this.pos.z - sp.z; }
      this.vis.hit(dx, dz, U.clamp(0.35 + (amt || 0) / 40, 0.35, 1.1));
      const s = info && info.src;
      if (s && s.team !== this.team && s.alive && this.hp > 30) {
        this.lastHurtBy = s;
        if (!this.target || frand() < 0.6) { this.target = s; this.mode = 'engage'; this.seenT = fmax(this.seenT, 0); }
        this.thinkT = fmin(this.thinkT, 0.15);
      }
    }
    onDeath(info) {
      this.alive = false; this.respawnT = T.RESPAWN; this.sp *= 0.5;
      this.swimming = false; this.hidden = false; this.firing = false; this.lockT = 0;
      this.vis.group.visible = false; this.shadow.visible = false;
      this.path.length = 0; this.target = null; this.tstats.kos++;
      if (this.M && this.M.onBotKO) this.M.onBotKO(this, info || {});
    }
    respawn(pos) {
      this.pos.copy(pos); this.vel.set(0, 5, 0);
      this.hp = this.maxHp; this.alive = true; this.dead = false;
      this.ink = 100; this.inkRefillT = 0; this.spawnProt = 1.2; this.yaw = this.team === 0 ? 0 : Math.PI;
      this.mode = 'paint'; this.hasGoal = false; this.target = null; this.gooDmg = 0; this.lockT = 0;
      this.vis.group.visible = true; this.shadow.visible = true; this.vis.setBlob(false);
      if (this.vis.spawnIn) this.vis.spawnIn();
      this._vyaw.x = NaN;
      this.world.fx.ring(new V3(pos.x, pos.y + 0.05, pos.z), 2, this.color, 0.5);
    }

    // ---------------------------------------------------------------- per frame
    update(dt) {
      const M = this.M;
      this.animT += dt;
      if (!this.alive) {
        this.respawnT -= dt;
        if (this.respawnT <= 0 && M.phase === 'play') this.respawn(M.spawnPoint(this.team));
        return;
      }
      this.applyStatus(dt);
      if (this.spawnProt > 0) this.spawnProt -= dt;
      this.subCd -= dt;
      const playing = M.phase === 'play';
      if (this.lockT > 0) {           // special (Mega Splashdown) drives our velocity
        this.lockT -= dt;
        this._move(dt, 0, 0, 0, true);
        this._place(dt, 0, 'jump');
        return;
      }
      if (playing) {
        this.thinkT -= dt;
        if (this.thinkT <= 0) { this.thinkT = 0.5; this.think(); if (this.onThink) G.safe('bot onThink', () => this.onThink(this)); }
        this._track(dt);
      }
      // ground state from the paint grid
      const P = M.paint;
      const cell = P.ownerAt(this.pos.x, this.pos.z), ch = P.heightAt(this.pos.x, this.pos.z);
      const onFloor = this.grounded && Math.abs(ch - this.pos.y) < 0.45;
      const own = onFloor && cell === this.gt, enemy = onFloor && cell === this.egt;
      let mx = 0, mz = 0;
      if (playing) { const s = this._steer(dt); mx = s[0]; mz = s[1]; }
      // aim + fire (decides this.firing), then swim
      if (playing) this._aimFire(dt, own); else { this.firing = false; this._weapon(dt, false); }
      this.swimming = playing && own && this.wantSwim && !this.firing;
      let speed = this.swimming ? T.SWIM_SPEED : enemy ? T.ENEMY_GOO_SPEED : 5.2;
      if (!this.swimming && typeof this.weapon.moveMult === 'number') speed *= this.weapon.moveMult;
      if (T.isRolling(this.weapon)) speed = fmin(speed, 4.5);
      speed *= this.slowK || 1;
      this._move(dt, mx, mz, speed, false);
      // tank, regen, enemy goo
      this.inkRefillT = fmax(0, this.inkRefillT - dt);
      if (this.inkRefillT <= 0 && !T.isRolling(this.weapon)) this.ink = fmin(100, this.ink + (this.swimming ? T.REFILL_SWIM : T.REFILL) * dt);
      if (enemy && !this.swimming) {
        if (this.gooDmg < T.ENEMY_GOO_CAP) { const d = fmin(T.ENEMY_GOO_DPS * dt, T.ENEMY_GOO_CAP - this.gooDmg); if (this.hp - d >= 1) { this.hp -= d; this.lastHitT = this.world.time; } this.gooDmg += d; }
        this.gooCool = 0;
      } else { this.gooCool += dt; if (this.gooCool > 1) this.gooDmg = 0; }
      if (!enemy && this.hp < this.maxHp && this.world.time - this.lastHitT > T.REGEN_DELAY) this.hp = fmin(this.maxHp, this.hp + (this.swimming ? T.REGEN_SWIM : T.REGEN) * dt);
      // spawn barrier
      M.barrier(this, dt);
      this.hidden = this.swimming;
      const hs = fhyp(this.vel.x, this.vel.z);
      this._place(dt, hs, !this.grounded ? 'jump' : this.firing ? 'shoot' : hs > 0.5 ? 'run' : 'idle');
    }
    _place(dt, speed, state) {
      this.vis.setBlob(this.swimming);
      const g = this.vis.group;
      // rendered facing eases toward the sim yaw (throw / special facing snaps it)
      const vy = this._vyaw;
      if (vy.x !== vy.x) { vy.x = this.yaw; vy.v = 0; }
      vy.t = vy.x + U.wrapAngle(this.yaw - vy.x);
      G.Geo.springStep(vy, dt);
      if (vy.x > 40 || vy.x < -40) vy.x = U.wrapAngle(vy.x);
      g.position.copy(this.pos);
      g.rotation.y = vy.x + Math.PI;
      const m = this._mo;
      m.vx = this.vel.x; m.vz = this.vel.z; m.vy = this.vel.y; m.yaw = vy.x + Math.PI; m.turn = vy.v; m.grounded = !!this.grounded;
      this.vis.animate(this.swimming ? 'swim' : state, this.animT, dt, speed, m);
      const gy = this.world.phys.groundAt(this.pos.x, this.pos.z, 0.1, this.pos.y + 0.2);
      this.shadow.position.set(this.pos.x, gy + 0.03, this.pos.z);
      const s = 1 / (1 + fmax(0, this.pos.y - gy) * 0.5) * (this.swimming ? 1.3 : 1);
      this.shadow.scale.set(0.95 * s, 1, 0.95 * s);
    }
    _move(dt, mx, mz, speed, locked) {
      const v = this.vel;
      if (!locked) {
        const tx = mx * speed, tz = mz * speed;
        const acc = (this.grounded ? 48 : 16) * dt;
        const dx = tx - v.x, dz = tz - v.z, dl = fhyp(dx, dz);
        if (dl <= acc) { v.x = tx; v.z = tz; } else { v.x += dx / dl * acc; v.z += dz / dl * acc; }
      }
      v.y -= (v.y > 0 ? 20 : 27) * dt;
      if (v.y < -28) v.y = -28;
      this.world.phys.moveBody(this, dt);
      if (this.fell) { this.pos.copy(this.M.spawnPoint(this.team)); v.set(0, 0, 0); }
    }

    // ---------------------------------------------------------------- perception + decisions
    _canSee(a) {
      const e = this.eyePos(_a), p = a.aimPoint(_b);
      return this.world.phys.los(e, p, false);
    }
    _track(dt) {
      const t = this.target;
      if (!t || !t.alive) { this.target = null; this.tVis = false; return; }
      this.visT -= dt;
      if (this.visT <= 0) {
        this.visT = 0.2;
        const d = this.pos.distanceTo(t.pos);
        const detect = t.swimming ? 4.5 : this.ws.range + 10;
        this.tVis = d < detect && this._canSee(t);
      }
      if (this.tVis) { this.seenT += dt; this.lostT = 0; } else { this.lostT += dt; this.seenT = fmax(0, this.seenT - dt * 2); if (this.lostT > 2.5) this.target = null; }
    }
    think() {
      const M = this.M, P = M.paint;
      // perception: nearest visible rival
      let best = null, bd = 1e9;
      for (const a of M.rangers) {
        if (a.team === this.team || !a.alive) continue;
        const d = this.pos.distanceTo(a.pos);
        const detect = a.swimming ? 4.5 : this.ws.range + 8;
        if (d > detect || d > bd) continue;
        if (!this._canSee(a)) continue;
        best = a; bd = d;
      }
      if (best && best !== this.target) { this.target = best; this.seenT = 0; this.tVis = true; this.lostT = 0; }
      const rb = ROLE_BIAS[this.role] || ROLE_BIAS.painter;
      const range = this.ws.range;
      const sRetreat = (this.hp < 40 || this.ink < 20) ? 0.8 : 0;
      let sEngage = 0;
      if (this.target && this.target.alive) {
        const d = this.pos.distanceTo(this.target.pos);
        if (d <= range * 1.15 && this.tVis) sEngage = 0.5 + rb.engage;
        else if (this.role === 'slayer' && this.lostT < 1.5) sEngage = 0.42;
      }
      const ping = this.team === 0 && M.ping && M.ping.t > 0 ? M.ping : null;
      const sPing = ping && this.pos.distanceTo(ping.pos) > 4 ? 0.62 : 0;
      const sPaint = 0.4 + rb.paint;
      // enemy goo nearby?
      let enemyNear = 0;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; if (P.ownerAt(this.pos.x + Math.cos(a) * 5, this.pos.z + Math.sin(a) * 5) === this.egt) enemyNear++; }
      const sContest = 0.3 + rb.contest + enemyNear * 0.04;
      let mode = 'paint', s = sPaint;
      if (sContest > s) { mode = 'contest'; s = sContest; }
      if (sPing > s) { mode = 'ping'; s = sPing; }
      if (sEngage > s) { mode = 'engage'; s = sEngage; }
      if (sRetreat > s && !(sEngage > 0 && this.hp > 25 && this.ink > 12)) { mode = 'retreat'; s = sRetreat; }
      const prev = this.mode;
      this.mode = mode;
      this.goalT += 0.5;
      // goals
      if (mode === 'retreat') {
        if (prev !== 'retreat' || !this.hasGoal) { if (this._ownGoal()) this._repath(); }
        this.wantSwim = true;
      } else if (mode === 'engage') {
        this.wantSwim = false;
        const t = this.target;
        if (t && (this.goalT > 1.5 || prev !== 'engage' || !this.tVis)) { this.tgoal.copy(t.pos); this.hasGoal = true; this.goalT = 0; this._repath(); }
      } else if (mode === 'ping') {
        if (prev !== 'ping' || this.goalT > 3) { this.tgoal.copy(ping.pos); this.hasGoal = true; this.goalT = 0; this._repath(); }
        this.wantSwim = true;
      } else {
        const reached = this.hasGoal && fhyp(this.tgoal.x - this.pos.x, this.tgoal.z - this.pos.z) < 2.5;
        const done = this.hasGoal && P.ownerAt(this.tgoal.x, this.tgoal.z) === this.gt;
        if (!this.hasGoal || reached || done || this.goalT > 9 || prev !== mode) { this._paintGoal(mode === 'contest'); this._repath(); }
        // swim while crossing own turf toward a far goal
        const dg = fhyp(this.tgoal.x - this.pos.x, this.tgoal.z - this.pos.z);
        this.wantSwim = dg > 9 && frand() < 0.8;
      }
      // sub weapon
      const sub = T.SUBS[this.subId] || T.SUBS.bubble;
      if (this.subCd <= 0 && this.ink >= sub.cost + 8 && !this.swimming) {
        const t = this.target;
        if (t && this.tVis && frand() < 0.35) {
          const d = this.pos.distanceTo(t.pos);
          if (d > 4 && d < 15) { this._faceForThrow(t.pos, d); M.gear.throwSub(this, this.subId); this.subCd = 6 + frand() * 4; }
        } else if ((mode === 'paint' || mode === 'contest') && frand() < 0.1 && this.hasGoal) {
          const d = fhyp(this.tgoal.x - this.pos.x, this.tgoal.z - this.pos.z);
          if (d > 5 && d < 16) { this._faceForThrow(this.tgoal, d); M.gear.throwSub(this, this.subId); this.subCd = 9 + frand() * 6; }
        }
      }
      // special
      if (this.sp >= T.SPECIAL_COST && this.grounded && !this.swimming) {
        this.spHold += 0.5;
        const t = this.target, d = t ? this.pos.distanceTo(t.pos) : 99;
        let use = false;
        if (this.specialId === 'splash') use = (t && this.tVis && d < 5) || this.spHold > 9;
        else use = (t && this.tVis && d < 22) || this.spHold > 4 + frand() * 4;
        if (use) {
          if (t && this.tVis) this._faceForThrow(t.pos, d);
          else if (this.hasGoal) this._faceForThrow(this.tgoal, fhyp(this.tgoal.x - this.pos.x, this.tgoal.z - this.pos.z));
          this.sp = 0; this.spHold = 0;
          M.gear.useSpecial(this, this.specialId);
        }
      }
    }
    _faceForThrow(p, d) {
      this.yaw = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z));
      this.pitch = U.clamp(0.08 + (d - 8) * 0.012, -0.05, 0.3);
    }
    _paintGoal(contest) {
      const M = this.M, P = M.paint, nav = M.nav;
      const fwd = this.team === 0 ? -1 : 1;
      let best = -1e9, bx = this.pos.x, bz = this.pos.z;
      for (let i = 0; i < 24; i++) {
        const a = frand() * Math.PI * 2, d = 4 + frand() * 17;
        const x = U.clamp(this.pos.x + Math.cos(a) * d, -28.5, 28.5), z = U.clamp(this.pos.z + Math.sin(a) * d, -38.5, 38.5);
        const k = nav.idx(x, z);
        if (k < 0 || !nav.walk[k] || nav.blocked[this.team][k]) continue;
        if (this.walkable && (this.walkable(x, z) === false || this.walkable(x, z + 3 * fwd) === false)) continue;   // keep clear of the rival base
        const o = P.ownerAt(x, z);
        if (o === 255) continue;
        let sc = o === 0 ? 1.0 : o === this.egt ? (contest ? 1.7 : 1.2) : -0.8;
        for (let n = 0; n < 4; n++) { const o2 = P.ownerAt(x + (n & 1 ? 2 : -2), z + (n & 2 ? 2 : -2)); if (o2 !== this.gt && o2 !== 255) sc += 0.18; }
        sc -= d * 0.02;
        const prog = (z - this.pos.z) * fwd;
        if (this.role === 'painter') sc += prog * 0.02;
        else if (this.role === 'slayer') sc += prog * 0.035;
        else sc -= fmax(0, z * fwd - 4) * 0.05;     // anchor: hold the home half and mid
        for (const r of M.rangers) if (r !== this && r.team === this.team && r.isBot && r.hasGoal && r.tgoal && fhyp(r.tgoal.x - x, r.tgoal.z - z) < 6) sc -= 0.35;
        sc += frand() * 0.15;
        if (sc > best) { best = sc; bx = x; bz = z; }
      }
      this.tgoal.set(bx, this.pos.y, bz); this.hasGoal = true; this.goalT = 0;
    }
    _ownGoal() {
      const P = this.M.paint;
      let best = 1e9, bx = 0, bz = 0, ok = false;
      for (let i = 0; i < 28; i++) {
        const a = frand() * Math.PI * 2, d = 1 + frand() * 13;
        const x = this.pos.x + Math.cos(a) * d, z = this.pos.z + Math.sin(a) * d;
        if (P.ownerAt(x, z) !== this.gt) continue;
        if (Math.abs(P.heightAt(x, z) - this.pos.y) > 3) continue;
        if (d < best) { best = d; bx = x; bz = z; ok = true; }
      }
      if (!ok) { const sp = this.M.spawnPoint(this.team); bx = sp.x; bz = sp.z; }
      this.tgoal.set(bx, this.pos.y, bz); this.hasGoal = true; this.goalT = 0;
      return true;
    }
    _repath() {
      const M = this.M;
      if (M.pathBudget <= 0) { this.repathT = 0.1; this.needPath = true; return; }
      M.pathBudget--;
      this.needPath = false;
      M.nav.find(this.pos.x, this.pos.z, this.tgoal.x, this.tgoal.z, this.team, this.path, M.paint, this.egt);
      this.pi = 0; this.repathT = 3;
    }
    _steer(dt) {
      const M = this.M, nav = M.nav;
      this.repathT -= dt;
      if (this.needPath && this.repathT <= 0) this._repath();
      // engage: strafe around the target at a comfortable distance when we can see it
      if (this.mode === 'engage' && this.target && this.tVis) {
        const t = this.target;
        const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z, d = fhyp(dx, dz) || 1;
        const want = this.ws.range * (this.role === 'slayer' ? 0.5 : 0.68);
        const ux = dx / d, uz = dz / d;
        let f = d > want + 1.5 ? 1 : d < want - 2 ? -0.7 : 0;
        const st = Math.sin(this.animT * 1.4 + this.slot * 2.1) * 0.9;
        let mx = ux * f - uz * st, mz = uz * f + ux * st;
        if (this.hitWall) { mx = -mx * 0.5 + uz; mz = -mz * 0.5 - ux; }
        const l = fhyp(mx, mz);
        if (l < 0.05) return [0, 0];
        // don't strafe off ledges into enemy spawn
        const k = nav.idx(this.pos.x + mx / l, this.pos.z + mz / l);
        if (k < 0 || nav.blocked[this.team][k]) return [0, 0];
        return [mx / l, mz / l];
      }
      if (!this.path.length || this.pi >= this.path.length) {
        if (this.mode === 'retreat') return [0, 0];
        return [0, 0];
      }
      let k = this.path[this.pi];
      let wx = nav.x(k), wz = nav.z(k);
      if (fhyp(wx - this.pos.x, wz - this.pos.z) < 0.65) { this.pi++; if (this.pi >= this.path.length) return [0, 0]; k = this.path[this.pi]; wx = nav.x(k); wz = nav.z(k); }
      // look ahead: skip waypoints we can walk to directly
      this.lookT -= dt;
      if (this.lookT <= 0) {
        this.lookT = 0.25;
        for (let j = fmin(this.path.length - 1, this.pi + 5); j > this.pi; j--) {
          const kj = this.path[j];
          if (nav.lineOK(this.pos.x, this.pos.z, this.pos.y, nav.x(kj), nav.z(kj), this.team)) { this.pi = j; k = kj; wx = nav.x(k); wz = nav.z(k); break; }
        }
      }
      // stuck: hop and repath
      const moved = this.pos.distanceTo(this.prevPos);
      this.prevPos.copy(this.pos);
      if (moved < 0.6 * dt) { this.stuckT += dt; if (this.stuckT > 0.9) { this.stuckT = 0; if (this.grounded) this.vel.y = 7; this.repathT = 0; this.needPath = true; } }
      else this.stuckT = fmax(0, this.stuckT - dt);
      const dx = wx - this.pos.x, dz = wz - this.pos.z, d = fhyp(dx, dz) || 1;
      return [dx / d, dz / d];
    }
    _aimFire(dt, own) {
      const t = this.target, P = this.M.paint;
      const ws = this.ws;
      let fire = false;
      const eye = this.eyePos(this._ctx.eye);
      if (this.mode === 'engage' && t && this.tVis) {
        this.errT -= dt;
        const d = this.pos.distanceTo(t.pos);
        if (this.errT <= 0) {
          this.errT = 0.35;
          const e = Math.tan(this.skill.aim * DEG) * d * (0.4 + frand() * 0.8);
          this.aimErr.set(frand() - 0.5, (frand() - 0.5) * 0.5, frand() - 0.5).normalize().multiplyScalar(e);
        }
        t.aimPoint(this.aimP).add(this.aimErr);
        if (t.vel) this.aimP.addScaledVector(t.vel, fmin(0.25, d / fmax(20, ws.speed || 40)));
        fire = this.seenT >= this.skill.react && d <= ws.range * 1.1 && this.ink >= (ws.cost || 1);
      } else {
        // painting: aim at the floor ahead along our motion, sweeping side to side
        const vx = this.vel.x, vz = this.vel.z, vs = fhyp(vx, vz);
        let fx, fz;
        if (vs > 0.8) { fx = vx / vs; fz = vz / vs; } else if (this.hasGoal) { const gx = this.tgoal.x - this.pos.x, gz = this.tgoal.z - this.pos.z, gl = fhyp(gx, gz) || 1; fx = gx / gl; fz = gz / gl; } else { fx = -Math.sin(this.yaw); fz = -Math.cos(this.yaw); }
        const sw = Math.sin(this.animT * 2.3 + this.sweep) * 0.5;
        const c = Math.cos(sw), s = Math.sin(sw);
        const ax = fx * c - fz * s, az = fx * s + fz * c;
        const pd = U.clamp(ws.range * 0.5, 2.5, 8);
        const px = this.pos.x + ax * pd, pz = this.pos.z + az * pd;
        const h = P.heightAt(px, pz);
        this.aimP.set(px, h > -50 && Math.abs(h - this.pos.y) < 3 ? h : this.pos.y, pz);
        const o = P.ownerAt(px, pz);
        const reserve = this.mode === 'retreat' ? 999 : 12;
        fire = this.mode !== 'retreat' && o !== this.gt && o !== 255 && this.ink >= (ws.cost || 1) + reserve * 0.3 && !(this.wantSwim && own);
        if (!fire && o === this.gt && !own && this.mode !== 'retreat' && this.ink > 30 && frand() < 0.02) fire = true;
      }
      // turn toward the aim point (ballistic pitch for arcing goo)
      const dx = this.aimP.x - eye.x, dy = this.aimP.y - eye.y, dz = this.aimP.z - eye.z;
      const hd = fhyp(dx, dz) || 0.001;
      const wantYaw = Math.atan2(-dx, -dz);
      let wantPitch = Math.atan2(dy, hd);
      const v = ws.speed, g = ws.grav;
      if (v && g && !T.weaponIsHitscan(ws)) {
        const v2 = v * v, disc = v2 * v2 - g * (g * hd * hd + 2 * dy * v2);
        wantPitch = disc > 0 ? Math.atan((v2 - Math.sqrt(disc)) / (g * hd)) : Math.PI / 4;
      }
      const tr = this.skill.turn;
      this.yaw = U.angleDamp(this.yaw, wantYaw, tr, dt);
      this.pitch = U.damp(this.pitch, U.clamp(wantPitch, -1.2, 1.2), tr, dt);
      const yawErr = Math.abs(U.wrapAngle(this.yaw - wantYaw));
      if (yawErr > 0.35) fire = false;
      // chargers: hold until charged, then release
      if (ws.kind === 'charger') {
        if (fire) { this.chargeT += dt; if (this.chargeT > (ws.charge || 0.9) + 0.05) { fire = false; this.chargeT = -0.35; } }
        else if (this.chargeT > 0) { this.chargeT = 0; }
        else if (this.chargeT < 0) { this.chargeT = fmin(0, this.chargeT + dt); fire = false; }
      }
      if (ws.kind === 'roller' && this.mode !== 'engage') fire = fire || (this.ink > 15 && !this.wantSwim);
      this.firing = fire;
      this._weapon(dt, fire);
    }
    _weapon(dt, firing) {
      const c = this._ctx;
      this.eyePos(c.eye);
      this.forward(c.eyeDir);
      _c.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      c.origin.copy(c.eye).addScaledVector(_c, 0.18).addScaledVector(c.eyeDir, 0.6); c.origin.y -= 0.35;
      const dist = fmax(2, this.aimP.distanceTo(c.eye));
      c.aimPoint.copy(c.eye).addScaledVector(c.eyeDir, dist);
      c.dir.copy(c.aimPoint).sub(c.origin).normalize();
      c.firing = firing; c.fireP = firing && !this._wasFiring; c.target = this.tVis ? this.target : null;
      this._wasFiring = firing;
      if (firing) this.lastFireT = this.world.time;
      G.safe('bot weapon', () => this.weapon.update(dt, c));
    }
  }
  T.weaponIsHitscan = ws => ws.kind === 'beam' || ws.kind === 'mist' || ws.kind === 'charger' || ws.kind === 'roller';
  T.TurfBot = TurfBot;

  // ================================================================== G.Bot driver (preferred when 17c_bots.js is loaded)
  // The shared G.Bot does movement, aim, strafing, nav and visuals (humanoid + robot-badge name tag); the turf brain
  // below sets its goal every 0.5 s with the same utility scores as TurfBot, and the mode calls T.gbTick each frame
  // for respawns, enemy goo, spawn protection and speed. Set G.Turf.USE_GBOT = false to force the built-in TurfBot.
  T.useGBot = () => !!(G.Bot && G.Enemies && G.Enemies.nav) && T.USE_GBOT !== false;
  T.makeBot = function (world, M, o) {
    if (T.useGBot()) { const b = G.safe('turf G.Bot', () => makeGBot(world, M, o)); if (b) return b; }
    const b = new TurfBot(world, M, o);
    if (o.pos) { b.pos.copy(o.pos); b.prevPos.copy(o.pos); }
    return b;
  };
  // G.Bot with turf's spawn protection, made on first use (17c_bots.js may be absent: then TurfBot above). The check is a
  // method: a per-bot takeDamage closure was an own function property on every bot (one more hidden-class field, and a
  // call site that saw a different function per bot).
  let TurfGBot = null;
  const gbotClass = () => TurfGBot || (TurfGBot = class TurfGBot extends G.Bot {
    takeDamage(amount, info) {
      if (this.spawnProt > 0 && !(info && info.type === 'fall')) return NO_DMG;
      return super.takeDamage(amount, info);
    }
  });
  function makeGBot(world, M, o) {
    const b = new (gbotClass())(world, {
      team: o.team, colors: { main: o.color, seed: o.team * 4 + (o.slot || 0) + 1 }, name: o.name, difficulty: o.team === 0 ? 'normal' : M.difficulty,   // seed: helmet / build variant (G.Geo.humanoid)
      hp: 100, ink: 100, regen: { delay: T.REGEN_DELAY, rate: T.REGEN, swimRate: T.REGEN_SWIM }, fleeHp: 0.3,
      pos: o.pos, yaw: o.team === 0 ? 0 : Math.PI, weapons: [{ id: o.weapon, opts: { turf: true } }],
      tagShape: o.team === 1 ? 'diamond' : 'circle',   // name-tag badge: circle = Team A, diamond = Team B (shape + colour)
    });
    b.isTurfGBot = true; b.M = M;
    b.role = o.role || 'painter'; b.slot = o.slot || 0;
    b.weaponId = o.weapon; b.subId = o.sub || 'bubble'; b.specialId = o.special || 'storm';
    b.gt = o.team + 1; b.egt = o.team === 0 ? 2 : 1; b.color = o.color; b.mmColor = T.css(o.color);
    // (timers and meters start as doubles: see the TurfBot constructor)
    b.inkColor = o.color; b.usesMoveMult = true; b.botCharge = 0.95; b.sp = -0; b.lockT = -0; b.spawnProt = -0;
    b.tstats = { cells: 0, pops: 0, kos: 0, specials: 0, enemyCells: 0, splashKos: 0 };
    b.ws = T.stats(o.weapon); b.mode = 'paint'; b.tgoal = new V3(); b.hasGoal = false; b.goalT = -0; b.thinkAcc = 0.5;
    b.subCd = 3 + frand() * 4; b.spHold = -0; b.respawnT = -0; b.gooDmg = -0; b.gooCool = -0;
    b._goals = { stay: { type: 'moveTo', pos: new V3(), r: 99, passive: true }, move: { type: 'moveTo', pos: new V3(), r: 0.9 }, attack: { type: 'attack', target: null, range: 10 }, paint: { type: 'paint', area: { x: 0, z: 0, r: 4.5 } } };
    b.setWeapons([T.makeWeapon(o.weapon, b)]);      // wrapped instance: paint is credited to this bot
    b._goals.stay.pos.copy(b.pos); b.goal = b._goals.stay; b.holdFire = true;   // wait on the pad until GO
    b.canSwimAt = (x, z) => M.paint.ownerAt(x, z) === b.gt;
    const pad = M.arena.pads[1 - o.team];
    b.walkable = (x, z) => !(x > pad.x0 - 0.5 && x < pad.x1 + 0.5 && z > pad.z0 - 0.5 && z < pad.z1 + 0.5);
    b.onThink = gbThink;
    b.onKO = (bot) => { bot.sp *= 0.5; bot.respawnT = T.RESPAWN; bot.tstats.kos++; bot.lockT = 0; bot.goal = null; };
    return b;
  }
  // Per-frame turf rules for a G.Bot (called by the mode before world.update).
  T.gbTick = function (b, dt) {
    const M = b.M, P = M.paint;
    if (!b.alive) {
      b.respawnT -= dt;
      if (b.respawnT <= 0 && M.phase === 'play') {
        b.respawn(M.spawnPoint(b.team));
        b.vel.y = 5; b.spawnProt = 1.2; b.mode = 'paint'; b.hasGoal = false; b.gooDmg = 0; b.thinkAcc = 0.5;
      }
      return;
    }
    if (b.spawnProt > 0) b.spawnProt -= dt;
    b.subCd -= dt;
    const cell = P.ownerAt(b.pos.x, b.pos.z), ch = P.heightAt(b.pos.x, b.pos.z);
    const onFloor = b.grounded && Math.abs(ch - b.pos.y) < 0.45;
    const enemy = onFloor && cell === b.egt && !b.swimming;
    const wm = b.weapon && typeof b.weapon.moveMult === 'number' ? b.weapon.moveMult : 1;
    b.speedMod = (enemy ? T.ENEMY_GOO_SPEED / 5.2 : 1) * (b.swimming ? 1 : wm);
    if (enemy) {
      if (b.gooDmg < T.ENEMY_GOO_CAP) { const d = fmin(T.ENEMY_GOO_DPS * dt, T.ENEMY_GOO_CAP - b.gooDmg); if (b.hp - d >= 1) { b.hp -= d; b.lastHitT = b.world.time; } b.gooDmg += d; }
      b.gooCool = 0;
    } else { b.gooCool += dt; if (b.gooCool > 1) b.gooDmg = 0; }
    M.barrier(b, dt);
  };
  // Turf brain for a G.Bot (its onThink hook, ~4 Hz; utility re-scored every 0.5 s).
  function gbThink(b) {
    const M = b.M, P = M.paint, G0 = b._goals;
    if (M.phase !== 'play' || b.lockT > 0) { b.holdFire = M.phase !== 'play'; if (M.phase !== 'play') { G0.stay.pos.copy(b.pos); b.goal = G0.stay; } return; }
    b.holdFire = false;
    b.thinkAcc += 0.25;
    if (b.thinkAcc < 0.5) return;
    b.thinkAcc = 0; b.goalT += 0.5;
    const t = b.target && b.target.alive && b.target.team !== b.team ? b.target : null;
    const vis = !!(t && b.hasLOS);
    const d = t ? b.pos.distanceTo(t.pos) : 99;
    const rb = ROLE_BIAS[b.role] || ROLE_BIAS.painter, range = b.ws.range || 18;
    const sRetreat = (b.hp < 40 || b.ink < 20) ? 0.8 : 0;
    let sEngage = 0;
    if (t && vis && d <= range * 1.15) sEngage = 0.5 + rb.engage;
    else if (t && b.role === 'slayer' && d < range * 2) sEngage = 0.42;
    const ping = b.team === 0 && M.ping && M.ping.t > 0 ? M.ping : null;
    const sPing = ping && b.pos.distanceTo(ping.pos) > 4 ? 0.62 : 0;
    let enemyNear = 0;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; if (P.ownerAt(b.pos.x + Math.cos(a) * 5, b.pos.z + Math.sin(a) * 5) === b.egt) enemyNear++; }
    let mode = 'paint', s = 0.4 + rb.paint;
    const sContest = 0.3 + rb.contest + enemyNear * 0.04;
    if (sContest > s) { mode = 'contest'; s = sContest; }
    if (sPing > s) { mode = 'ping'; s = sPing; }
    if (sEngage > s) { mode = 'engage'; s = sEngage; }
    if (sRetreat > s && !(sEngage > 0 && b.hp > 25 && b.ink > 12)) mode = 'retreat';
    const prev = b.mode; b.mode = mode;
    if (mode === 'retreat') {
      if (prev !== 'retreat' || !b.hasGoal) TurfBot.prototype._ownGoal.call(b);
      G0.move.pos.copy(b.tgoal); G0.move.r = 0.8; b.goal = G0.move;
    } else if (mode === 'engage') {
      G0.attack.target = t; G0.attack.range = U.clamp(range * (b.role === 'slayer' ? 0.5 : 0.65), 3, 22); b.goal = G0.attack;
    } else if (mode === 'ping') {
      G0.move.pos.copy(ping.pos); G0.move.r = 3; b.goal = G0.move;
    } else {
      const reached = b.hasGoal && fhyp(b.tgoal.x - b.pos.x, b.tgoal.z - b.pos.z) < 3;
      const area = G0.paint.area;
      let painted = 0;
      if (b.hasGoal) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; if (P.ownerAt(area.x + Math.cos(a) * 2.5, area.z + Math.sin(a) * 2.5) === b.gt) painted++; }
      if (!b.hasGoal || painted >= 4 || b.goalT > 7 || prev !== mode || (reached && painted >= 3)) {
        TurfBot.prototype._paintGoal.call(b, mode === 'contest');
        area.x = b.tgoal.x; area.z = b.tgoal.z; area.r = 4.5;
      }
      // far away: travel there first (dives through own goo), then spray the area
      const far = fhyp(b.tgoal.x - b.pos.x, b.tgoal.z - b.pos.z) > 9;
      if (far) { G0.move.pos.copy(b.tgoal); G0.move.r = 4; b.goal = G0.move; } else b.goal = G0.paint;
    }
    // sub weapon
    const sub = T.SUBS[b.subId] || T.SUBS.bubble;
    if (b.subCd <= 0 && b.ink >= sub.cost + 8 && !b.swimming && b.grounded) {
      if (t && vis && d > 4 && d < 15 && frand() < 0.35) { gbFace(b, t.pos, d); M.gear.throwSub(b, b.subId); b.subCd = 6 + frand() * 4; }
      else if ((mode === 'paint' || mode === 'contest') && b.hasGoal && frand() < 0.1) {
        const dg = fhyp(b.tgoal.x - b.pos.x, b.tgoal.z - b.pos.z);
        if (dg > 5 && dg < 16) { gbFace(b, b.tgoal, dg); M.gear.throwSub(b, b.subId); b.subCd = 9 + frand() * 6; }
      }
    }
    // special
    if (b.sp >= T.SPECIAL_COST && b.grounded && !b.swimming) {
      b.spHold += 0.5;
      let use = false;
      if (b.specialId === 'splash') use = (vis && d < 5) || b.spHold > 9;
      else use = (vis && d < 22) || b.spHold > 4 + frand() * 4;
      if (use) {
        if (vis) gbFace(b, t.pos, d); else if (b.hasGoal) gbFace(b, b.tgoal, fhyp(b.tgoal.x - b.pos.x, b.tgoal.z - b.pos.z));
        b.sp = 0; b.spHold = 0;
        M.gear.useSpecial(b, b.specialId);
      }
    }
  }
  function gbFace(b, p, d) {
    b.aimYaw = b.yaw = Math.atan2(-(p.x - b.pos.x), -(p.z - b.pos.z));
    b.aimPitch = U.clamp(0.08 + (d - 8) * 0.012, -0.05, 0.3);
  }
})(window.G);

}).call(window); } catch (e) { console.error('[module 24e_turf_bots.js]', e); }
// ---- 24f_turf_mode.js
try { (function () {
// 24f_turf_mode.js — the 'turf' mode: 4v4 goo battle (player + 3 bot allies vs 4 bot rivals).
//   G.Game.go('turf', {arena:'plaza'|'coral'|'random', weapon, sub, special, teamColors, quick, matchTime, skipIntro})
// Flow: intro flyover + team cards → 3-2-1 → 3:00 match (1-minute banner + music ×1.08, final 10 s) → TIME'S UP →
// judging (overhead camera, Tick & Tock, bars in 3 steps, exact %, winner flag, confetti) → results.
// world.rules.paint(point, radius, team, normal, owner?, opts?) is the paint entry for every weapon.
(function (G) {
  'use strict';
  // Math.max / min / sign / hypot / random hand back a fresh heap number from the mid-tier (Maglev) compiled code that
  // runs most per-frame code (measured 12-36 bytes a call); these plain twins are inlined and allocate nothing.
  // frand: xorshift32, its state in an Int32Array (updating a typed array never boxes); frange(a, b) = U.rand(a, b).
  const fmax = (a, b) => (a > b ? a : b), fmin = (a, b) => (a < b ? a : b), fsign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const fhyp = (x, y) => Math.sqrt(x * x + y * y);
  const _rs = new Int32Array(1); _rs[0] = (Math.random() * 0x7fffffff) | 1;
  const frand = () => { let x = _rs[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _rs[0] = x; return (x >>> 0) / 4294967296; };
  const frange = (a, b) => a + frand() * (b - a);
  const T = G.Turf = G.Turf || {};
  const V3 = THREE.Vector3;
  const U = G.util;
  const el = (...a) => G.UI.el(...a);
  const css = h => T.css(h);
  const setVar = (e, k, v) => { e.style.setProperty(k, v); return e; };
  const _a = new V3(), _b = new V3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const UP = new V3(0, 1, 0);
  // Full-frame mode overlays (intro cards, judging bar, confetti) go into #ui *below* #screens, so the pause menu
  // and every other screen always draw — and take taps — above them. (A phone going to the background pauses
  // the game; an overlay stacked above the pause menu would swallow every tap on Resume.)
  const underScreens = node => {
    const ui = document.getElementById('ui'), scr = document.getElementById('screens');
    if (ui && scr && scr.parentNode === ui) ui.insertBefore(node, scr); else (ui || document.body).appendChild(node);
    return node;
  };
  // Cinematic phases own the screen: no touch buttons. Re-applied every frame because closing the pause menu
  // restores the mode's 'turf' layout.
  const noButtons = () => { if (G.Input.layout !== 'none' && !G.UI.anyOpen()) G.Input.setLayout('none'); };

  const ROLE_WEAPONS = {
    painter: ['splat', 'roller', 'scatter', 'splat'],
    slayer: ['fizz', 'scatter', 'gatling', 'splat'],
    anchor: ['lancer', 'lobber', 'gatling', 'swarm', 'zap'],
  };

  class Match {
    constructor(params) {
      T.injectCSS();
      T.match = this;
      this.params = params = params || {};
      const prefs = (G.Save.set && G.Save.set.turf) || {};
      this.arenaId = T.ARENAS[params.arena] ? params.arena : U.pick(T.ARENA_ORDER);
      this.spec = T.ARENAS[this.arenaId];
      let wid = T.legal(params.weapon) ? params.weapon : (T.legal(prefs.weapon) && T.owned(prefs.weapon) ? prefs.weapon : 'splat');
      this.weaponId = wid;
      this.sub = T.SUBS[params.sub] ? params.sub : (T.SUBS[prefs.sub] ? prefs.sub : 'bubble');
      this.special = T.SPECIALS[params.special] ? params.special : T.stats(wid).special;
      this.colors = T.pickColors(params.teamColors);
      this.matchTime = params.matchTime > 0 ? +params.matchTime : (params.quick ? 120 : T.MATCH_TIME);
      this.difficulty = (G.Save.set && G.Save.set.difficulty) || 'normal';
      // (timers start as doubles, -0 or -0 then the value: a small-integer field that later takes a fraction changes the
      // match's hidden class mid-match and throws the per-frame mode code back to slower tiers — see 10_world's Actor)
      this.phase = 'intro'; this.pt = -0; this.timeLeft = -0; this.timeLeft = this.matchTime;
      this.acc = [0, 0]; this.accP = 0; this.peT = 0.5; this.mmT = -0; this.rosterT = -0;
      this.pathBudget = 2; this.ping = null; this.koT = -0; this.killer = null; this.swimLow = -0; this.airSwim = -0;
      this.hintT = -0; this.toastT = -0; this.lastBeep = 99; this.minuteShown = false; this.spWasReady = false;
      this.dom = [];
      this._buildWorld();
      this._spawnTeams();
      G.HUD.hide();
      this._showIntro();
      // hide the intro / judging overlays while any screen (pause, settings, a popup) is open
      this._onUi = () => this._syncOverlays();
      G.bus.on('ui-open', this._onUi); G.bus.on('ui-empty', this._onUi);
      G.bus.emit('mode-start', 'turf', { arena: this.arenaId, weapon: this.weaponId, sub: this.sub, special: this.special, matchTime: this.matchTime });
    }

    // ---------------------------------------------------------------- world
    _buildWorld() {
      const spec = this.spec;
      const biome = G.Geo && G.Geo.biomes && G.Geo.biomes[spec.sky];
      const sky = biome ? Object.assign({}, biome.sky) : {};
      const light = biome ? Object.assign({}, biome.light) : {};
      const fogCol = sky.horizon || 0xcff3ff;
      const self = this;
      const rules = {
        turf: true, manualRespawn: true,
        paint: (p, r, team, n, owner, opts) => self.paintAt(p, r, team, n, owner, opts),
        canDamage: () => self.phase === 'play',
        inkColor: team => (team === 0 ? self.colors.a : self.colors.b),
        onKill: (target, info) => self.onKO(target, info),
        onPlayerDeath: (p, info) => self.onPlayerKO(p, info),
      };
      const w = this.world = new G.World({ heightFn: () => 0, bounds: T.RECT, sky, fog: { color: fogCol, near: 80, far: 300 }, light, rules, floorY: -30 });
      // credit projectile paint to the shooter even when a weapon doesn't pass the owner to rules.paint
      const pj = w.projectiles, spawn0 = pj.spawn.bind(pj);
      pj.spawn = function (o) {
        const src = o && o.src;
        if (src && o.onHit) { const f = o.onHit; o.onHit = (p, h, wd) => { const pv = T.paintOwner; T.paintOwner = src; try { return f(p, h, wd); } finally { T.paintOwner = pv; } }; }
        if (src && o.onTick) { const f = o.onTick; o.onTick = (p, dt, wd) => { const pv = T.paintOwner; T.paintOwner = src; try { return f(p, dt, wd); } finally { T.paintOwner = pv; } }; }
        return spawn0(o);
      };
      if (G.Terrain && G.Terrain.water) {
        const water = G.Terrain.water({ size: 460, y: -0.85, shallow: spec.water.shallow, deep: spec.water.deep, opacity: 0.9, segments: 48 });
        w.add(water);
      }
      this.paint = new T.Paint(w, T.RECT, this.colors.a, this.colors.b, { pattern: this.colors.pattern });
      this.arena = T.buildArena(w, spec, this.paint, this.colors);
      this.paint.buildHeights(w.phys, 4.6);
      T.markArena(this.paint, this.arena);
      this.paint.finalize();
      this.paint.prime();                 // paint target + splat program ready before the first gameplay frame
      this.nav = new T.Nav(w.phys, T.RECT, this.arena.pads);
      // G.Bot's height-aware navgrid (pads, ramps, perches), built before the match instead of on the first path
      if (G.Bot && G.Bot.nav) G.safe('turf bot nav', () => G.Bot.nav(w));
      else if (G.Enemies && G.Enemies.nav) G.safe('turf enemies nav', () => G.Enemies.nav(w));
      this.gear = new T.Gear(w, this);
      w.onUpdate((dt, t) => { for (const b of this.arena.barriers) b.material.uniforms.uTime.value = t; });
    }
    spawnPoint(team, exact) {
      const list = this.arena.spawns[team];
      const p = exact ? list[0] : list[Math.floor(frand() * list.length)];
      return _a.copy(p).add(_b.set(exact ? 0 : frange(-0.8, 0.8), 0.05, exact ? 0 : frange(-0.6, 0.6))).clone();
    }
    _spawnTeams() {
      const w = this.world, C = this.colors;
      const pl = this.player = new G.Player(w, {
        stats: { maxHp: 100, maxShield: 0, hpRegen: 0, hpRegenDelay: 999, regenDelay: 999, shieldRegen: 0, dashCharges: 0, doubleJump: true, mantle: true, wallKick: true },
        spawn: this.spawnPoint(0, true), yaw: 0, team: 0, noWeapons: true,
      });
      // (the turf fields G.Player doesn't declare start as doubles: ink, the special meter and the timers take fractions)
      pl.ink = -0; pl.ink = 100; pl.inkRefillT = -0; pl.sp = -0; pl.lockT = -0; pl.name = G.t('turf.you'); pl.color = C.a; pl.mmColor = css(C.a);
      pl.inkColor = C.a; pl.usesMoveMult = true;   // the mode folds weapon.moveMult into speedMod itself
      pl.tstats = { cells: 0, pops: 0, kos: 0, specials: 0, enemyCells: 0, splashKos: 0 };   // (the bots' tstats shape)
      pl.weapons = [T.makeWeapon(this.weaponId, pl)]; pl.wi = 0;
      w.player = pl; w.addActor(pl);
      pl.equip(0, true);
      pl.inputEnabled = false; pl.hideVm = true;    // gun appears when the countdown starts
      this.pws = T.stats(this.weaponId);
      const ps = G.Data && G.Data.playerStats ? G.safe('turf stats', () => G.Data.playerStats()) : null;
      this.refillMult = (ps && ps.turfRefill) || 1;   // Tank Pack gear
      const names = T.botNames(7);
      const roles = [['painter', 'slayer', 'anchor'], ['painter', 'slayer', 'anchor', 'painter']];
      const subs = ['bubble', 'bubble', 'pop', 'sprinkler'];
      this.allies = []; this.rivals = [];
      let ni = 0, slot = 1;
      for (const team of [0, 1]) {
        roles[team].forEach((role, i) => {
          const wl = ROLE_WEAPONS[role];
          const weapon = wl[Math.floor(frand() * wl.length)];
          const b = T.makeBot(w, this, {
            team, role, name: names[ni++], weapon, sub: U.pick(subs), special: T.stats(weapon).special,
            color: team === 0 ? C.a : C.b, slot: slot++, pos: this.arena.spawns[team][team === 0 ? i + 1 : i].clone(),
          });
          w.addActor(b);
          (team === 0 ? this.allies : this.rivals).push(b);
        });
      }
      this.rangers = [pl, ...this.allies, ...this.rivals];
      this.gbots = this.rangers.filter(r => r.isTurfGBot);
    }

    // ---------------------------------------------------------------- paint entry
    paintAt(point, radius, team, normal, owner, opts) {
      if (this.phase !== 'play' || !point || !(radius > 0)) return 0;
      const gt = team === 1 ? 2 : 1, P = this.paint;
      const ny = normal && normal.y != null ? normal.y : 1;
      let ch = 0, conv = 0;
      if (ny >= 0.5) {
        let y = point.y;
        const h = P.heightAt(point.x, point.z);
        if (h > -50 && y > h + 0.7 && y - h < 8) y = h;        // airborne impacts drip onto the floor below
        ch = P.paint(point.x, y, point.z, radius, gt, opts && opts.noDrops); conv = P.conv;
      } else if (ny > -0.5) {
        P.paintWall(point, normal, radius, gt);
        const fx = point.x + normal.x * 0.45, fz = point.z + normal.z * 0.45, h = P.heightAt(fx, fz);
        if (h > -50 && point.y - h < 0.8) { ch = P.paint(fx, h, fz, radius * 0.7, gt, true); conv = P.conv; }
      }
      if (ch > 0) {
        this.acc[team === 1 ? 1 : 0] += ch;
        const who = owner || T.paintOwner;
        if (who && who.team === team && who.tstats) {
          who.tstats.cells += ch; who.tstats.enemyCells += conv;
          if (!(opts && opts.noCharge) && who.sp < T.SPECIAL_COST) who.sp = fmin(T.SPECIAL_COST, who.sp + ch * T.SPECIAL_GAIN * (this.rush ? T.RUSH_GAIN : 1));
          if (who.isPlayer) this.accP += ch;
        }
      }
      return ch;
    }
    _paintEvents(dt) {
      this.peT -= dt;
      if (this.peT > 0) return;
      this.peT = 0.5;
      // bus 'paint'(team, cells, src): src 'player' for the player's own paint, 'bots' for everyone else
      if (this.accP > 0) G.bus.emit('paint', 0, this.accP, 'player');
      const rest0 = this.acc[0] - this.accP;
      if (rest0 > 0) G.bus.emit('paint', 0, rest0, 'bots');
      if (this.acc[1] > 0) G.bus.emit('paint', 1, this.acc[1], 'bots');
      this.acc[0] = this.acc[1] = 0; this.accP = 0;
    }

    // ---------------------------------------------------------------- KOs
    _popFX(a, killer) {
      const w = this.world, col = T.teamColor(a.team);
      const p = _a.set(a.pos.x, a.pos.y + 0.9, a.pos.z);
      if (!a.isTurfGBot) {      // G.Bot pops itself (confetti, burst, ring, sound)
        w.fx.burst(p, [col, col, 0xffffff], 26, 7, 0.34, 0.8, { normal: true, grav: 10, drag: 1.4 });
        w.fx.confetti(p, 18);
        w.fx.ring(_b.set(a.pos.x, a.pos.y + 0.05, a.pos.z), 2.6, col, 0.35);
        if (G.Audio) G.Audio.sfxAt('enemyDie', p, { vol: 0.8 });
      }
      if (killer && this.phase === 'play') T.paintFloorBelow(w, a.pos.x, a.pos.y + 0.5, a.pos.z, 1.7, killer.team, killer, { noCharge: true });
    }
    onBotKO(bot, info) { /* bookkeeping happens in onKO (rules.onKill) */ }
    onKO(target, info) {
      const k = info && info.src && info.src !== target && info.src.tstats ? info.src : null;
      if (k) k.tstats.pops++;
      this._popFX(target, k);
      const kn = k ? k.name : '?';
      G.HUD.feed(G.t('turf.feed.ko', { a: kn, b: target.name || '?' }), k ? css(T.shade(T.teamColor(k.team), 0.85)) : null);
      this.rosterT = 0;
    }
    onPlayerKO(p, info) {
      this.koT = 0;
      this.killer = info && info.src && info.src !== p ? info.src : null;
      p.sp *= 0.5; p.tstats.kos++; p.swimming = false; p.hideVm = false; p.lockT = 0; p.speedMod = 1;
      G.bus.emit('player-ko', (info && info.type) || 'goo');
      if (this.ui) {
        this.ui.ko.hidden = false;
        this.ui.ko.firstChild.textContent = this.killer ? G.t('turf.koBy', { name: this.killer.name }) : G.t('turf.koSelf');
      }
      this._koCard(true);
    }
    // While the KO card shows, the kill feed (which repeats "X bonked You!" in the same band) steps aside.
    _koCard(on) { if (this.hudEl) this.hudEl.classList.toggle('turf-koed', !!on); }
    _koUpdate(dt) {
      const p = this.player;
      this.koT += dt;
      if (this.ui) {
        const n = fmax(1, Math.ceil(T.RESPAWN - this.koT));
        const s = this.koT < T.RESPAWN - 2.5 ? G.t('turf.backIn', { n }) : G.t('turf.relaunch');
        if (this.ui.ko.lastChild._s !== s) { this.ui.ko.lastChild.textContent = s; this.ui.ko.lastChild._s = s; }
      }
      if (this.koT >= T.RESPAWN && this.phase === 'play') {
        p.respawn(this.spawnPoint(0));
        p.ink = 100; p.inkRefillT = 0; p.gooDmg = 0; p.vel.y = 6.5; p.iframes = 1.2; p.yaw = 0; p.pitch = -0.08; p.inputEnabled = true;
        if (this.ui) this.ui.ko.hidden = true;
        this._koCard(false);
      }
    }
    // Spawn barrier: rivals on a team's pad get pushed out and take 50 HP/s.
    barrier(a, dt) {
      const pad = this.arena.pads[1 - a.team];
      if (!(a.pos.x > pad.x0 && a.pos.x < pad.x1 && a.pos.z > pad.z0 && a.pos.z < pad.z1)) return;
      const dir = a.team === 0 ? 1 : -1;
      a.vel.z = dir * fmax(6, Math.abs(a.vel.z));
      const d = T.BARRIER_DPS * dt;
      if (a.hp - d > 0.5) { a.hp -= d; a.lastHitT = this.world.time; }
      else this.world.damage(a, d + 1, { type: 'barrier', friendly: true });
      if (a.isPlayer && this.toastT <= 0) { this.toastT = 2.5; G.UI.toast(G.t('turf.barrier')); }
    }

    // ---------------------------------------------------------------- per-frame (before world.update)
    update(dt) {
      this.pt += dt; this.pathBudget = 2;
      this.hintT -= dt; this.toastT -= dt;
      this.paint.tick(this.world.time);
      const inp = G.input;
      // Turf owns DIVE: never crouch (restored in late()); SUB/SPECIAL/CALLOUT never reach the player controller.
      this._slide = inp.slide; this._slideSaved = true;
      this.diveHeld = inp.slide || (inp.device === 'desktop' && inp.sprint);
      inp.slide = false;
      this.specialP = inp.abilityP || inp.reloadP; this.subP = inp.gadgetP; this.pingP = inp.swapP || inp.pingP;
      inp.abilityP = inp.reloadP = inp.gadgetP = inp.swapP = inp.pingP = false; inp.slotP = -1; inp.wheel = 0;
      switch (this.phase) {
        case 'intro':
          noButtons();
          this._skipText();
          if (this.skipReq || inp.fireP || inp.jumpP || inp.interactP || this.pt > (this.params.skipIntro ? 0.05 : 4.8)) this._toCountdown();
          break;
        case 'countdown': {
          const n = 3 - Math.floor(this.pt);
          if (n !== this.cdShown && n >= 1) { this.cdShown = n; this._bigCount(String(n)); if (G.Audio) G.Audio.sfx('countdown'); }
          if (this.pt >= 3) this._toPlay();
          break;
        }
        case 'play': this._play(dt); break;
        case 'finish': noButtons(); if (this.pt > 2.3) this._toJudging(); break;
        case 'judging': noButtons(); this._judging(dt); break;
      }
      if (this.ping) { this.ping.t -= dt; if (this.ping.t <= 0) { G.HUD.removeMarker('turf-ping'); this.ping = null; } }
      const GB = this.gbots; for (let i = 0; i < GB.length; i++) T.gbTick(GB[i], dt);   // (index loop: no iterator per frame)
      this.gear.update(dt);
      this._paintEvents(dt);
      this.mmT -= dt;
      if (this.mmT <= 0) { this.mmT = 0.5; this.paint.updateMinimap(); }
    }
    _play(dt) {
      this.timeLeft -= dt;
      const tl = this.timeLeft;
      if (!this.minuteShown && tl <= 60 && this.matchTime > 61) {
        this.minuteShown = true;
        // final minute = Goo Rush: Specials charge RUSH_GAIN x faster for everyone (both teams), so the last minute
        // has more big splashes and the turf can still swing
        this.rush = true;
        if (this.ui && this.ui.swing) { this.ui.swing.hidden = true; this.swingVis = 0; }
        this.swingMute = 2.6;     // no swing chip under the banner
        G.UI.banner(G.t('turf.oneMin'), G.t('turf.rush'), 2.4);
        if (G.Audio && G.Audio.has && G.Audio.has('rush')) G.Audio.sfx('rush');
        if (this.ui) { this.ui.flash.classList.remove('go'); void this.ui.flash.offsetWidth; this.ui.flash.classList.add('go'); }
        if (G.Audio) { G.Audio.music('turf', { rate: 1.08 }); G.Audio.sfx('warn'); }
      }
      this._swing(dt);
      const s = Math.ceil(tl);
      if (s <= 10 && s >= 1 && s !== this.lastBeep) { this.lastBeep = s; if (this.player.alive) this._bigCount(String(s), true); if (G.Audio) G.Audio.sfx('countdown', { pitch: s <= 3 ? 1.25 : 1 }); }   // knocked out: the KO card owns the centre, the timer chip still counts
      this._playerGoo(dt);
      if (tl <= 0) this._toFinish();
    }
    // Territory swings: every 8 s the team lead is compared with the last check. A swing of 4+ points toward the
    // player's team pops a "Turf swing! +N%" chip under the team bar; taking the lead back in the final minute is a
    // "Comeback!" moment (banner + fanfare, once per match).
    _swing(dt) {
      this.swingT = (this.swingT || 0) + dt;
      if (this.swingT < 8) return;
      this.swingT = 0;
      const cov = this.paint.coverage(), lead = cov[0] - cov[1];
      if (this.lastLead != null) {
        const d = lead - this.lastLead;
        const comeback = this.rush && !this.comebackShown && this.lastLead < -0.01 && lead > 0.01;
        if (d >= 0.04 && !comeback && !(this.swingMute > 0) && this.ui && this.ui.swing) {
          const s = this.ui.swing;
          s.textContent = G.t('turf.swing', { n: Math.round(d * 100) });
          s.hidden = false; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
          this.swingVis = 2.4;      // game time (see _hud): freezes with the pause menu
          if (G.Audio) G.Audio.sfx('coin', { pitch: 1.3, vol: 0.5 });
        }
        if (comeback) {
          this.comebackShown = true;
          G.UI.banner(G.t('turf.comeback'), G.t('turf.comebackSub'), 2.0);
          if (G.Audio) G.Audio.sfx(G.Audio.has && G.Audio.has('comeback') ? 'comeback' : 'levelup', { vol: 0.85 });
        }
      }
      this.lastLead = lead;
    }
    _playerGoo(dt) {
      const p = this.player, inp = G.input, P = this.paint, w = this.world;
      if (!p.alive) { this._koUpdate(dt); return; }
      if (p.lockT > 0) { p.swimming = false; p.hideVm = false; p.speedMod = 1; return; }   // Mega Splashdown in progress
      const cell = P.ownerAt(p.pos.x, p.pos.z), ch = P.heightAt(p.pos.x, p.pos.z);
      const onFloor = p.grounded && Math.abs(ch - p.pos.y) < 0.45;
      const own = onFloor && cell === 1, enemy = onFloor && cell === 2;
      const dive = this.diveHeld;
      // own-colour wall paint lets you climb while diving
      let wallOwn = false;
      if (dive && p.hitWall && p.wallN && (p.swimming || own)) {
        const wx = p.pos.x - p.wallN.x * (p.r + 0.12), wz = p.pos.z - p.wallN.z * (p.r + 0.12);
        wallOwn = P.wallAt(wx, p.pos.y + 0.35, wz) === 1 || P.wallAt(wx, p.pos.y + 0.85, wz) === 1;
      }
      // leap out of goo: surfacing lets the controller's normal jump fire this frame
      if (p.swimming && inp.jumpP) { p.swimming = false; this.leapT = 0.25; if (p.grounded) p.vel.y = fmax(p.vel.y, 0); }
      if (this.leapT > 0) this.leapT -= dt;
      let swim = false;
      if (dive && !(this.leapT > 0)) {
        if (own || wallOwn) swim = true;
        else if (p.swimming && !p.grounded && this.airSwim < 0.7) swim = true;
        else if (onFloor && inp.slideP && this.hintT <= 0) { this.hintT = 5; this._hint(G.t('turf.diveHint')); }
      }
      this.airSwim = p.swimming && !p.grounded ? this.airSwim + dt : 0;
      if (swim && wallOwn) { p.vel.y = T.CLIMB_SPEED + 20 * dt; this.airSwim = 0; }
      const was = p.swimming;
      p.swimming = swim; p.hideVm = swim;
      if (swim !== was) {
        w.fx.burst(_a.set(p.pos.x, p.pos.y + 0.2, p.pos.z), [this.colors.a, 0xffffff], swim ? 12 : 8, 3.5, 0.3, 0.45, { normal: true, grav: 10 });
        if (G.Audio) G.Audio.sfx('splat', { vol: swim ? 0.5 : 0.35, pitch: swim ? 0.8 : 1.2 });
      }
      if (swim) p.equipT = fmax(p.equipT, 0.23);      // can't fire while diving; ~0.15 s surfacing delay
      // speed: dive 10 m/s, enemy goo 1.8 m/s (no slide), rollers cap at 4.5 m/s
      const mv = inp.move, wl = fmin(1, fhyp(mv.x, mv.y));
      const sprint = (inp.sprint || (inp.device === 'touch' && wl > 0.9)) && mv.y > 0.4;
      const base = sprint ? 7.5 : 5;
      let mod = 1;
      if (swim) mod = T.SWIM_SPEED / base;
      else if (enemy) { mod = T.ENEMY_GOO_SPEED / base; inp.slideP = false; }
      const wm = p.weapon && typeof p.weapon.moveMult === 'number' && !swim ? p.weapon.moveMult : 1;
      mod *= wm;
      if (T.isRolling(p.weapon)) mod = fmin(mod, 4.5 / base);
      p.speedMod = mod;
      // goo tank: weapons set inkRefillT (their refill delay) whenever they spend goo
      p.inkRefillT = fmax(0, (p.inkRefillT || 0) - dt);
      if (p.inkRefillT <= 0 && !T.isRolling(p.weapon)) p.ink = fmin(100, p.ink + (swim ? T.REFILL_SWIM : T.REFILL) * dt * (this.refillMult || 1));
      // enemy goo chips HP (18/s, capped at 40, never knocks out); regen after 1 s (60/s while diving)
      if (enemy && !swim) {
        if ((p.gooDmg || 0) < T.ENEMY_GOO_CAP) {
          const d = fmin(T.ENEMY_GOO_DPS * dt, T.ENEMY_GOO_CAP - (p.gooDmg || 0));
          if (p.hp - d >= 1) { p.hp -= d; p.lastHitT = w.time; }
          p.gooDmg = (p.gooDmg || 0) + d;
        }
        this.gooCool = 0;
      } else { this.gooCool = (this.gooCool || 0) + dt; if (this.gooCool > 1) p.gooDmg = 0; }
      if (!enemy && p.hp < p.maxHp && w.time - p.lastHitT > T.REGEN_DELAY) p.hp = fmin(p.maxHp, p.hp + (swim ? T.REGEN_SWIM : T.REGEN) * dt);
      this.inEnemyGoo = enemy && !swim;
      // sub / special / callout
      if (this.subP) {
        const cost = (T.SUBS[this.sub] || T.SUBS.bubble).cost;
        if (p.ink >= cost) { p.swimming = false; p.hideVm = false; this.gear.throwSub(p, this.sub); }
        else this._noInk();
      }
      if (this.specialP) {
        if (p.sp >= T.SPECIAL_COST) {
          p.sp = 0; p.swimming = false; p.hideVm = false;
          this.gear.useSpecial(p, this.special);
          if (this.ui) { this.ui.flash.classList.remove('go'); void this.ui.flash.offsetWidth; this.ui.flash.classList.add('go'); }
          G.UI.banner(G.t(T.SPECIALS[this.special].nameKey), null, 1.1);
        } else if (G.Audio) G.Audio.sfx('empty', { vol: 0.4 });
      }
      if (p.sp >= T.SPECIAL_COST && !this.spWasReady) { this.spWasReady = true; G.UI.toast(G.t('turf.spReady'), { color: css(T.shade(this.colors.a, 1.5)) }); if (G.Audio) G.Audio.sfx('unlock', { vol: 0.6 }); }
      if (p.sp < T.SPECIAL_COST) this.spWasReady = false;
      if (this.pingP) this._ping();
      this.barrier(p, dt);
      // swim loop sound
      const moving = swim && fhyp(p.vel.x, p.vel.z) > 2;
      if (G.Audio && G.Audio.loop) {
        if (moving && !this.swimLoop) this.swimLoop = G.Audio.loop('swim', { vol: 0.5 });
        else if (!moving && this.swimLoop) { this.swimLoop.stop(0.15); this.swimLoop = null; }
      }
      if (swim && moving && frand() < 0.5) w.fx.spawn(_a.set(p.pos.x + frange(-0.3, 0.3), p.pos.y + 0.05, p.pos.z + frange(-0.3, 0.3)), _b.set(0, 1.5, 0), this.colors.a, 0.22, 0.35, { normal: true, grav: 6 });
    }
    _noInk() {
      if (G.Audio) G.Audio.sfx('empty', { vol: 0.5 });
      if (this.toastT <= 0) { this.toastT = 1.5; G.UI.toast(G.t('turf.noInk')); }
    }
    _hint(text) {
      if (!this.ui) return;
      const h = this.ui.hint; h.textContent = text; h.hidden = false;
      clearTimeout(this._hintTO); this._hintTO = setTimeout(() => { h.hidden = true; }, 2600);
    }
    _ping() {
      const p = this.player, w = this.world;
      const eye = p.eyePos(_a), f = p.forward(_b);
      const hit = w.phys.raycast(eye.x, eye.y, eye.z, f.x, f.y, f.z, 70);
      const pos = hit ? new V3(hit.x, hit.y, hit.z) : eye.clone().addScaledVector(f, 30);
      pos.y = fmax(pos.y, w.phys.groundAt(pos.x, pos.z, 0.1, pos.y + 0.5));
      this.ping = { pos, t: 8 };
      G.HUD.marker('turf-ping', pos.clone().add(_a.set(0, 1.2, 0)), { icon: '!', label: G.t('turf.thisWay'), color: css(this.colors.a) });
      G.HUD.feed(G.t('turf.thisWay'), css(T.shade(this.colors.a, 0.85)));
      if (G.Audio) G.Audio.sfx('npc', { pitch: 1.4, vol: 0.6 });
      for (const b of this.allies) b.thinkT = fmin(b.thinkT, 0.1 + frand() * 0.3);
    }

    // ---------------------------------------------------------------- phases
    _toCountdown() {
      this.phase = 'countdown'; this.pt = 0; this.cdShown = 0;
      this._removeIntro();
      G.HUD.show({ vitals: true, weapons: false, crosshair: true, minimap: true, objective: false, timer: true, bolts: false, boss: false, team: true, feed: true });
      this._mmPrev = G.HUD.minimapRange;
      G.HUD.minimapRange = 30;
      G.HUD.minimapDraw = (g, k, pl) => this._drawMinimap(g, k, pl);
      G.HUD.minimapHideEnemies = true; // GDD: turf minimap shows paint and allies only
      G.HUD.setTimer(this.matchTime);
      G.HUD.setTeam(0, 0);
      this._buildHud();
      if (!G.UI.anyOpen()) G.Input.setLayout('turf');
      this.camFrom = { p: G.R.camera.position.clone(), q: G.R.camera.quaternion.clone() };
      this.player.inputEnabled = false; this.player.hideVm = false;
    }
    _toPlay() {
      this.phase = 'play'; this.pt = 0;
      this.player.inputEnabled = true;
      this._bigCount(G.t('turf.go'));
      if (G.Audio) G.Audio.sfx('go');
      if (G.input.device === 'desktop') this._hint(G.t('turf.keys'));
    }
    _toFinish() {
      this.phase = 'finish'; this.pt = 0; this.timeLeft = 0;
      this.paint.lock = true;
      const p = this.player;
      p.inputEnabled = false; p.swimming = false; p.hideVm = false; p.speedMod = 1;
      G.HUD.setTimer(0, true);
      G.UI.banner(G.t('turf.timeUp'), null, 2.0);
      if (G.Audio) { G.Audio.sfx('go', { pitch: 0.7 }); G.Audio.music(null); }
      if (this.swimLoop) { this.swimLoop.stop(0.1); this.swimLoop = null; }
      if (this.ui) { this.ui.ko.hidden = true; this.ui.count.hidden = true; }
      this._koCard(false);
      noButtons();
    }
    _toJudging() {
      this.phase = 'judging'; this.pt = 0; this.jStep = 0;
      const cov = this.paint.coverage();
      const ca = this.paint.counts[1], cb = this.paint.counts[2];
      this.winner = ca === cb ? (frand() < 0.5 ? 0 : 1) : (ca > cb ? 0 : 1);   // ties: hidden coin flip, never a draw
      let pa = Math.round(cov[0] * 1000) / 10, pb = Math.round(cov[1] * 1000) / 10;
      if (pa === pb) { if (this.winner === 0) pa = +(pa + 0.1).toFixed(1); else pb = +(pb + 0.1).toFixed(1); }
      else if ((pa > pb) !== (this.winner === 0)) { if (this.winner === 0) pa = +(pb + 0.1).toFixed(1); else pb = +(pa + 0.1).toFixed(1); }
      this.final = { cov, pa, pb };
      G.HUD.hide();
      noButtons();
      if (this.player.weapon && this.player.weapon.vm) this.player.weapon.vm.visible = false;
      this.camFrom = { p: G.R.camera.position.clone(), q: G.R.camera.quaternion.clone() };
      this._buildJudgeUI();
    }
    _judging(dt) {
      const t = this.pt, J = this.judge;
      if (!J) return;
      if (t > 0.9 && !J.birdsIn) { J.birdsIn = true; if (G.Audio) G.Audio.sfx('npc', { pitch: 1.6 }); }
      // drumroll: accelerating clicks
      if (t > 1.6 && t < 4.4) { J.drumT -= dt; if (J.drumT <= 0) { J.drumT = U.lerp(0.16, 0.045, (t - 1.6) / 2.8); if (G.Audio) G.Audio.sfx('tab', { vol: 0.55, pitch: 0.7 + (t - 1.6) * 0.1 }); } }
      const steps = [[2.2, 1 / 3], [3.2, 2 / 3], [4.4, 1]];
      while (this.jStep < 3 && t >= steps[this.jStep][0]) {
        const k = steps[this.jStep][1];
        J.barA.style.width = (this.final.cov[0] * 100 * k).toFixed(1) + '%';
        J.barB.style.width = (this.final.cov[1] * 100 * k).toFixed(1) + '%';
        if (G.Audio) G.Audio.sfx(this.jStep < 2 ? 'hit' : 'star', { vol: 0.7 });
        this.jStep++;
        if (this.jStep === 3) {
          J.pctA.textContent = G.t('turf.res.pct', { n: this.final.pa.toFixed(1) });
          J.pctB.textContent = G.t('turf.res.pct', { n: this.final.pb.toFixed(1) });
        }
      }
      if (t >= 4.9 && !J.revealed) {
        J.revealed = true;
        const wc = this.winner === 0 ? this.colors.a : this.colors.b;
        const wn = G.t('turf.team', { color: G.t(this.winner === 0 ? this.colors.an : this.colors.bn) });
        J.msg.textContent = '';
        J.win.textContent = G.t('turf.wins', { team: wn }); J.win.hidden = false;
        setVar(J.win, 'color', css(wc));
        this._confetti(wc);
        if (G.Audio) G.Audio.sfx(this.winner === 0 ? 'win' : 'lose');
        G.Audio && G.Audio.music && G.Audio.music('results');
      }
      if (t >= 8.2 && !J.done) { J.done = true; this._toResults(); }
    }

    // ---------------------------------------------------------------- per-frame (after world.update)
    late(dt) {
      const inp = G.input;
      if (this._slideSaved) { inp.slide = this._slide; this._slideSaved = false; }
      this.paint.flush();
      const cam = G.R.camera, p = this.player;
      if (this.phase === 'intro') this._introCam();
      else if (this.phase === 'countdown' && this.camFrom) {
        const k = U.smoothstep(0, 1, fmin(1, this.pt / 0.9));
        cam.position.lerpVectors(this.camFrom.p, cam.position, k);
        _q.copy(cam.quaternion); cam.quaternion.copy(this.camFrom.q).slerp(_q, k);
      } else if (this.phase === 'judging') this._judgeCam();
      else if (this.phase === 'play' && !p.alive) this._koCam();
      // dive camera: lower and a touch wider
      this.swimLow = U.damp(this.swimLow, p.swimming && p.alive ? 0.5 : 0, 12, dt);
      if (this.swimLow > 0.01 && this.phase !== 'judging') cam.position.y -= this.swimLow;
      if (this.phase === 'judging' && this.judge) {
        G.R.showViewmodel = true;
        this._animBirds(dt);
      }
      this._hud(dt);
    }
    _introCam() {
      const cam = G.R.camera;
      const k = U.smoothstep(0, 1, fmin(1, this.pt / 4.8));
      const a = U.lerp(-2.4, 0.05, k), R = U.lerp(62, 46, k), H = U.lerp(40, 11, k);
      cam.position.set(Math.sin(a) * R, H, Math.cos(a) * R);
      _a.set(0, U.lerp(0, 1.5, k), U.lerp(0, 20, k));
      cam.up.set(0, 1, 0);
      _m.lookAt(cam.position, _a, UP); cam.quaternion.setFromRotationMatrix(_m);
    }
    _koCam() {
      const cam = G.R.camera, p = this.player, t = this.koT;
      if (t < T.RESPAWN - 2.5) {
        const k = this.killer && this.killer.alive ? this.killer : null;
        const ang = t * 0.5 + p.yaw;
        cam.position.set(p.pos.x + Math.sin(ang) * 4.5, p.pos.y + 3.2, p.pos.z + Math.cos(ang) * 4.5);
        _a.copy(k ? k.pos : p.pos); _a.y += k ? 1.0 : 0.5;
      } else {
        const sp = this.arena.spawns[0][0];
        const k = U.smoothstep(0, 1, (t - (T.RESPAWN - 2.5)) / 2.5);
        cam.position.set(sp.x, sp.y + U.lerp(8, 3, k), sp.z + U.lerp(8, 2.5, k));
        _a.set(0, 0, sp.z - 26);
      }
      _m.lookAt(cam.position, _a, UP); cam.quaternion.setFromRotationMatrix(_m);
    }
    _judgeCam() {
      const cam = G.R.camera;
      const k = U.smoothstep(0, 1, fmin(1, this.pt / 1.6));
      const fov = cam.fov, asp = cam.aspect || 1.6;
      const tv = Math.tan(fov * Math.PI / 360);
      // arena long axis (z) across the screen, framed in the top ~62% so the bars + birds sit below it
      const top = asp > 1.9 ? 0.6 : 0.64;
      const H = fmax(43 / (tv * asp), 64 / (2 * top * tv));
      const visH = 2 * H * tv;
      _a.set(visH * (0.5 - top / 2), H, 0);      // screen-down is +X: shift so the arena centre sits at top/2
      if (!this._jq) {
        const c = new THREE.PerspectiveCamera(); c.position.copy(_a); c.up.set(-1, 0, 0); c.lookAt(_a.x, 0, 0);
        this._jq = c.quaternion.clone();
      }
      cam.position.lerpVectors(this.camFrom.p, _a, k);
      cam.quaternion.copy(this.camFrom.q).slerp(this._jq, k);
    }

    // ---------------------------------------------------------------- HUD
    _buildHud() {
      const full = G.HUD.slot('full'), tc = G.HUD.slot('tc');
      const C = this.colors;
      const root = el('div.turf-root');
      setVar(root, '--tc', css(C.a)); setVar(root, '--ec', css(C.b) + 'bb');
      const ui = this.ui = {};
      ui.swim = el('div.turf-swim'); ui.sticky = el('div.turf-sticky'); ui.flash = el('div.turf-flash');
      ui.tankFill = el('i'); ui.tankMark = el('b');
      ui.tank = el('div.turf-tank', ui.tankFill, ui.tankMark);
      setVar(ui.tank, '--tc', css(C.a));
      ui.tankMark.style.bottom = (T.SUBS[this.sub] || T.SUBS.bubble).cost + '%';
      ui.low = el('div.turf-low', { i18n: 'turf.low' }); ui.low.hidden = true;   // data-i18n: follows a mid-match language switch
      ui.sp = el('div.turf-sp', el('span', { html: T.specialIcon(this.special, css(C.a)) }), el('em', { text: 'Q' }));
      setVar(ui.sp, '--tc', css(C.a));
      ui.count = el('div.turf-count'); ui.count.hidden = true;
      ui.ko = el('div.turf-ko', el('div.k1'), el('div.k2')); ui.ko.hidden = true;
      ui.hint = el('div.turf-hint'); ui.hint.hidden = true;
      root.append(ui.swim, ui.sticky, ui.flash, ui.tank, ui.low, ui.sp, ui.count, ui.ko, ui.hint);
      full.appendChild(root);
      // roster pips: circles = Team A, diamonds = Team B (with Ink patterns / colorblind: stripes vs dots, like the goo)
      const ros = el('div.turf-roster' + (C.pattern ? '.pat' : ''));
      ui.pips = [];
      const mk = (r, cls) => { const d = el('div.turf-pip.' + cls + (r.isPlayer ? '.me' : '')); setVar(d, '--pc', css(T.teamColor(r.team))); d.title = r.name || ''; ui.pips.push({ d, r }); return d; };
      for (const r of [this.player, ...this.allies]) ros.appendChild(mk(r, 'a'));
      ros.appendChild(el('div.sep'));
      for (const r of this.rivals) ros.appendChild(mk(r, 'b'));
      tc.appendChild(ros);
      ui.swing = el('div.turf-swingc'); ui.swing.hidden = true;
      setVar(ui.swing, '--tc', css(C.a));
      tc.appendChild(ui.swing);
      // team bar + touch buttons in team colours
      const tb = document.querySelector('#hud .teambar');
      if (tb) { setVar(tb, '--team-a', css(C.a)); setVar(tb, '--team-b', css(C.b)); this.teambar = tb; }
      const touch = document.getElementById('touch');
      if (touch) { setVar(touch, '--turf-a', css(C.a)); this.touchEl = touch; }
      const hud = document.getElementById('hud');
      if (hud) { hud.classList.add('turf-on'); hud.classList.toggle('turf-pat', !!C.pattern); this.hudEl = hud; }
      G.Input.setIcon('gadget', T.subIcon(this.sub, '#ffffff'));
      G.Input.setIcon('ability', T.specialIcon(this.special, '#ffffff'));
      G.Input.setIcon('swap', T.pingIcon);
      this.tankT = 0;
    }
    // The goo tank sits beside the FIRE button. Players can move FIRE anywhere (Settings > Controls > Button
    // layout), so follow its saved position (screen fractions) instead of assuming the default corner.
    _placeTank(desk) {
      const t = this.ui && this.ui.tank; if (!t) return;
      if (!desk && G.Input.layout !== 'turf') return;     // a menu is open: keep the last spot
      const s = G.Save.set || {};
      const W = G.Screen ? G.Screen.w() : window.innerWidth, H = G.Screen ? G.Screen.h() : window.innerHeight;
      const hs = s.hudScale || 1;
      // the layout engine writes each button's frame position inline (left/top/width in px); else a saved custom spot
      const fb = !desk ? G.Input.btn('fire') : null;
      const bl = fb ? parseFloat(fb.style.left) : NaN, bt = fb ? parseFloat(fb.style.top) : NaN, bw = fb ? parseFloat(fb.style.width) : NaN;
      const c = !desk && s.btnLayout && s.btnLayout.turf && s.btnLayout.turf.fire;
      let cx, cy, size;
      if (isFinite(bl) && isFinite(bt) && bw > 0) { size = bw; cx = bl + bw / 2; cy = bt + bw / 2; }
      else if (c) { size = 86 * (c.s || 1) * hs; cx = U.clamp(c.x, 0, 1) * W; cy = U.clamp(c.y, 0, 1) * H; }
      else {
        if (t._k !== 'css') { t._k = 'css'; t.style.left = t.style.top = t.style.right = t.style.bottom = t.style.transformOrigin = ''; }
        return;
      }
      const tw = (t.offsetWidth || 24) * hs, th = (t.offsetHeight || 84) * hs;   // border box, before --hud-scale
      // Candidate spots, best first: the side facing the screen centre (bottom-aligned, normal then tight gap,
      // then centred on FIRE), then the outer side. Small phones pack JUMP / DIVE close to FIRE, so take the first
      // spot that clears every other (round) button, else the one that overlaps them least.
      const inner = cx > W / 2 ? -1 : 1;
      const sideX = (dir, gap) => dir < 0 ? cx - size / 2 - gap - tw : cx + size / 2 + gap;
      const yBot = cy + size / 2 - th, yMid = cy - th / 2;
      const cands = [[sideX(inner, 8), yBot], [sideX(inner, 3), yBot], [sideX(inner, 3), yMid], [sideX(-inner, 8), yBot], [sideX(-inner, 3), yMid]];
      const circles = [];
      const touch = this.touchEl || document.getElementById('touch');
      if (!desk && touch) for (const b of touch.querySelectorAll('.tbtn')) {
        if (b === fb || b.hidden || !b.offsetWidth) continue;
        circles.push([b.offsetLeft + b.offsetWidth / 2, b.offsetTop + b.offsetHeight / 2, b.offsetWidth / 2 + 2]);
      }
      let x = cands[0][0], y = cands[0][1], best = Infinity;
      for (const cd of cands) {
        const cx0 = cd[0], cy0 = U.clamp(cd[1], 6, H - th - 6);
        if (cx0 < 4 || cx0 + tw > W - 4) continue;
        let pen = 0;
        for (const o of circles) {
          const dx = o[0] - U.clamp(o[0], cx0, cx0 + tw), dy = o[1] - U.clamp(o[1], cy0, cy0 + th);
          const d = fhyp(dx, dy); if (d < o[2]) pen += o[2] - d;
        }
        if (pen < best - 0.01) { best = pen; x = cx0; y = cy0; }
        if (pen === 0) break;
      }
      x = U.clamp(x, 4, fmax(4, W - tw - 4)); y = U.clamp(y, 6, H - th - 6);
      const k = Math.round(x) + '|' + Math.round(y);
      if (t._k === k) return;
      t._k = k;
      t.style.left = Math.round(x) + 'px'; t.style.top = Math.round(y) + 'px';
      t.style.right = t.style.bottom = 'auto'; t.style.transformOrigin = 'top left';
    }
    _bigCount(text, small) {
      if (!this.ui) return;
      const c = this.ui.count;
      c.textContent = text; c.hidden = false;
      c.classList.toggle('small', !!small);
      c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
      clearTimeout(this._cTO); this._cTO = setTimeout(() => { c.hidden = true; }, small ? 700 : 900);
    }
    _hud(dt) {
      if (!this.ui || this.phase === 'judging' || this.phase === 'intro') return;
      const ui = this.ui, p = this.player;
      if (this.phase === 'play' || this.phase === 'countdown') G.HUD.setTimer(fmax(0, this.timeLeft), this.timeLeft <= 60);
      const ink = U.clamp(p.ink / 100, 0, 1), inkQ = Math.round(ink * 200);
      // (style writes and their strings only when the shown value moves a step)
      if (ui._inkQ !== inkQ) { ui._inkQ = inkQ; ui.tankFill.style.transform = 'scaleY(' + (inkQ / 200).toFixed(3) + ')'; }
      const low = ink < 0.2 && p.alive;
      ui.tank.classList.toggle('low', low);
      ui.low.hidden = !low || p.swimming;
      const desk = G.input.device === 'desktop';
      ui.tank.classList.toggle('desk', desk);
      ui.sp.hidden = !desk;
      this.tankT -= dt;
      if (this.tankT <= 0) { this.tankT = 0.3; this._placeTank(desk); }
      const spf = U.clamp(p.sp / T.SPECIAL_COST, 0, 1);
      const spQ = Math.round(spf * 200);
      if (desk && ui._spQ !== spQ) { ui._spQ = spQ; ui.sp.style.setProperty('--f', (spQ / 200).toFixed(3)); ui.sp.classList.toggle('ready', spf >= 1); }
      ui.swim.classList.toggle('on', !!p.swimming);
      ui.sticky.classList.toggle('on', !!this.inEnemyGoo);
      if (this.swingVis > 0) { this.swingVis -= dt; if (this.swingVis <= 0 && ui.swing) ui.swing.hidden = true; }
      if (this.swingMute > 0) this.swingMute -= dt;
      // touch buttons: special gauge on ABILITY, sub cost on GADGET (overrides the controller's dash display)
      const cost = (T.SUBS[this.sub] || T.SUBS.bubble).cost;
      G.Input.setCooldown('ability', spf, '');
      G.Input.setCooldown('gadget', p.ink >= cost ? 1 : p.ink / cost, p.ink >= cost ? '' : (ui._costL && ui._costN === cost ? ui._costL : (ui._costN = cost, ui._costL = cost + '%')));
      this.rosterT -= dt;
      if (this.rosterT <= 0) {
        this.rosterT = 0.25;
        const cov = this.paint.coverage();
        G.HUD.setTeam(cov[0], cov[1]);
        for (let i = 0; i < ui.pips.length; i++) {
          const it = ui.pips[i];
          it.d.classList.toggle('ko', !it.r.alive);
          it.d.classList.toggle('sp', it.r.alive && it.r.sp >= T.SPECIAL_COST);
        }
      }
    }
    _drawMinimap(g, k, pl) {
      const R = T.RECT, img = this.paint.mm;
      g.imageSmoothingEnabled = false;
      g.drawImage(img, (R.minX - pl.pos.x) * k, (R.minZ - pl.pos.z) * k, (R.maxX - R.minX) * k, (R.maxZ - R.minZ) * k);
      g.lineWidth = 2; g.strokeStyle = '#1e1a4d';
      for (const a of this.allies) {
        if (!a.alive) continue;
        g.save();
        g.translate((a.pos.x - pl.pos.x) * k, (a.pos.z - pl.pos.z) * k);
        g.rotate(-a.yaw);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      if (this.ping) {
        g.fillStyle = css(this.colors.a);
        g.beginPath(); g.arc((this.ping.pos.x - pl.pos.x) * k, (this.ping.pos.z - pl.pos.z) * k, 6 + Math.sin(this.world.time * 8) * 2, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    }

    // ---------------------------------------------------------------- intro overlay
    _showIntro() {
      const C = this.colors;
      const member = r => el('div', r.isPlayer ? el('b', { text: '★ ' + r.name }) : [el('span', { html: T.robotIcon }), document.createTextNode(r.name)]);
      const team = t => {
        const box = el('div.ti-team.' + (t ? 'b' : 'a'), el('h3', el('i'), G.t('turf.team', { color: G.t(t ? C.bn : C.an) })), (t ? this.rivals : [this.player, ...this.allies]).map(member));
        setVar(box, '--pc', css(t ? C.b : C.a));
        box.style.animationDelay = (t ? 0.25 : 0.1) + 's';
        return box;
      };
      this.skipEl = el('div.ti-skip'); this._skipK = null;
      this._skipText();
      const ov = el('div.turf-intro',
        el('div', { style: { textAlign: 'center' } }, el('div.ti-title', { text: G.t(this.spec.nameKey) }), el('div.ti-sub', { text: G.t('turf.tagline') })),
        el('div.ti-teams', team(0), el('div.ti-vs', { text: G.t('turf.vs') }), team(1)),
        this.skipEl);
      ov.addEventListener('pointerdown', e => { if (G.UI.anyOpen() || G.Game.paused) return; e.preventDefault(); e.stopPropagation(); this.skipReq = true; });
      underScreens(ov);
      this.introEl = ov; this.dom.push(ov);
      this._syncOverlays();
    }
    // "Tap to skip" on touch; "Click or press Space to skip" with keyboard + mouse; "Press (A) to skip" on a controller
    // (fire, jump or use all skip: update() 'intro'). Re-checked every intro frame, so it follows a device switch.
    _skipText() {
      const e = this.skipEl, dev = G.input.device, k = dev + '|' + G.i18n.lang;
      if (!e || this._skipK === k) return;
      this._skipK = k;
      if (dev !== 'gamepad') { e.textContent = G.t(dev === 'desktop' ? 'turf.skipKb' : 'turf.skip'); return; }
      e.textContent = '';
      G.t('turf.skipPad', { a: '\uE000' }).split(/(\uE000)/).forEach(part => { if (part) e.append(part === '\uE000' ? el('span.pad-g.a.ti-pad', { text: 'A' }) : document.createTextNode(part)); });
    }
    _removeIntro() { if (this.introEl) { this.introEl.remove(); this.introEl = null; this.skipEl = null; } }
    _syncOverlays() {
      const hide = G.UI.anyOpen();
      for (const n of [this.introEl, this.judgeWrap]) if (n) n.style.visibility = hide ? 'hidden' : '';
    }

    // ---------------------------------------------------------------- judging (Tick & Tock)
    _bird(color, left) {
      const P = G.Geo && G.Geo.P;
      const g = new THREE.Group();
      if (!P) return g;
      const kit = new G.Geo.Kit();
      const white = 0xf7f4ff, cap = color, beak = 0xffa53d, navy = 0x26305e;
      kit.add(P.sph(0.5, 18, 14), white, 0, 0.62, 0);
      kit.add(P.sph(0.51, 18, 10), cap, 0, 0.66, -0.02, 0, 0, 0, 1, 0.62, 1);          // coloured cap
      kit.add(P.sph(0.28, 14, 10), 0x2a1f55, 0, 0.7, 0.36, 0, 0, 0, 1, 1, 0.45);       // visor screen
      kit.glow(P.sph(0.1, 10, 8), 0x7ff6ff, -0.1, 0.72, 0.47);
      kit.glow(P.sph(0.1, 10, 8), 0x7ff6ff, 0.1, 0.72, 0.47);
      kit.add(P.cone(0.1, 0.24, 10), beak, 0, 0.52, 0.5, Math.PI / 2, 0, 0);
      kit.add(P.cyl(0.03, 0.03, 0.4, 6), navy, 0, 0.18, 0, 0, 0, 0);
      for (const s of [-1, 1]) {
        kit.add(P.cyl(0.035, 0.035, 0.25, 6), beak, s * 0.18, 0.12, 0.02);
        kit.add(P.rbox(0.16, 0.05, 0.22, 0.02, 1), beak, s * 0.18, 0.02, 0.07);
      }
      kit.add(P.cyl(0.02, 0.02, 0.26, 5), navy, 0, 1.24, 0);
      kit.glow(P.sph(0.06, 8, 6), 0xffd23f, 0, 1.38, 0);
      const d = kit.data();
      const body = new THREE.Mesh(d.solid, G.M.vc({ spec: 0.8, rimStr: 0.5 }));
      if (d.glow) body.add(new THREE.Mesh(d.glow, G.Geo.glowMat ? G.Geo.glowMat() : G.M.basic(0xffffff, { vertexColors: true })));
      g.add(body);
      const wingMat = G.M.toon(cap, { spec: 0.6 });
      const wingGeo = new THREE.SphereGeometry(0.2, 10, 8); wingGeo.scale(0.5, 1, 1.25);
      const wl = new THREE.Mesh(wingGeo, wingMat), wr = new THREE.Mesh(wingGeo, wingMat);
      wl.position.set(-0.5, 0.62, 0); wr.position.set(0.5, 0.62, 0);
      g.add(wl, wr);
      // flag held by the outer wing
      const flag = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), G.M.toon(0xfff1dc));
      pole.position.y = 0.65; flag.add(pole);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.03), G.M.toon(color, { emissive: color, ei: 0.15 }));
      cloth.position.set(left ? -0.33 : 0.33, 1.08, 0); flag.add(cloth);
      flag.position.set(left ? -0.62 : 0.62, 0.45, 0.1);
      g.add(flag);
      g.userData = { body, wl, wr, flag, left };
      return g;
    }
    _buildJudgeUI() {
      const C = this.colors;
      const J = this.judge = { drumT: 0, birdsIn: false, revealed: false, done: false, t: 0 };
      J.tick = this._bird(C.a, true); J.tock = this._bird(C.b, false);
      J.dummy = new THREE.Object3D(); G.R.vmRoot.add(J.dummy);
      G.R.vmScene.add(J.tick, J.tock);
      J.tick.scale.setScalar(0.001); J.tock.scale.setScalar(0.001);
      J.msg = el('div.tj-msg', { text: G.t('turf.judging') });
      J.pctA = el('span', { text: '' }); J.pctB = el('span', { text: '' });
      J.barA = el('i.a'); J.barB = el('i.b');
      J.win = el('div.tj-win'); J.win.hidden = true;
      // team labels carry the team shape (circle / diamond) as well as the colour
      const lab = (t) => el('span', { style: { font: "800 13px var(--f-body)", color: '#fff', textShadow: '0 2px 0 #1e1a4d', display: 'inline-flex', alignItems: 'center', gap: '5px' } },
        setVar(el('i.tj-sh.' + (t ? 'b' : 'a')), '--pc', css(t ? C.b : C.a)), el('span', { text: G.t(t ? 'turf.tock' : 'turf.tick') + ' · ' + G.t('turf.team', { color: G.t(t ? C.bn : C.an) }) }));
      J.el = el('div.turf-judge' + (C.pattern ? '.pat' : ''), J.msg, el('div.tj-pct', J.pctA, J.pctB), el('div.tj-bar', J.barA, J.barB), el('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px' } }, lab(0), lab(1)), J.win);
      setVar(J.el, '--ta', css(C.a)); setVar(J.el, '--tb', css(C.b));
      const wrap = el('div.turf-jwrap', J.el);     // full-frame container: sizes follow the (possibly rotated) game frame
      underScreens(wrap);
      this.judgeWrap = wrap; this.dom.push(wrap);
      this._syncOverlays();
    }
    _animBirds(dt) {
      const J = this.judge, t = this.pt, cam = G.R.vmCamera;
      const d = 3.2, hh = d * Math.tan(cam.fov * Math.PI / 360), hw = hh * cam.aspect;
      const s = J.birdsIn ? U.clamp((t - 0.9) / 0.35, 0, 1) : 0;
      const pop = s < 1 ? s * (1 + Math.sin(s * Math.PI) * 0.35) : 1;
      const size = fmin(1.1, fmin(hh * 0.44, hw * 0.24));
      for (const b of [J.tick, J.tock]) {
        const u = b.userData, left = u.left;
        b.position.set((left ? -1 : 1) * (hw - size * 0.75), -hh + size * 0.5, -d);
        b.rotation.set(0.12, (left ? 0.35 : -0.35), 0);
        b.scale.setScalar(fmax(0.001, pop * size));
        const bob = Math.sin(t * 6 + (left ? 0 : 1.5)) * 0.04;
        u.body.position.y = bob;
        const flap = t > 1.6 && t < 4.4 ? Math.sin(t * 22) * 0.6 : Math.sin(t * 3) * 0.12;
        u.wl.rotation.z = flap; u.wr.rotation.z = -flap;
        const isWin = J.revealed && ((left && this.winner === 0) || (!left && this.winner === 1));
        if (isWin) { const kk = fmin(1, (t - 4.9) / 0.4); u.flag.rotation.z = (left ? -1 : 1) * (0.5 + Math.sin(t * 9) * 0.25) * kk; u.flag.position.y = 0.45 + 0.3 * kk; u.body.position.y = bob + Math.abs(Math.sin(t * 8)) * 0.12; }
        else if (J.revealed) { u.flag.rotation.z = U.damp(u.flag.rotation.z, (left ? 1 : -1) * 1.1, 4, dt); }
      }
    }
    _confetti(color) {
      const box = el('div.turf-confetti');
      const cols = [css(color), css(T.shade(color, 1.4)), '#ffffff', '#ffd23f', css(T.shade(color, 0.8))];
      for (let i = 0; i < 70; i++) {
        const c = el('i');
        c.style.left = (frand() * 100).toFixed(1) + '%';
        c.style.background = cols[i % cols.length];
        c.style.animationDuration = (1.8 + frand() * 1.8).toFixed(2) + 's';
        c.style.animationDelay = (frand() * 0.6).toFixed(2) + 's';
        setVar(c, '--dx', frange(-80, 80).toFixed(0) + 'px'); setVar(c, '--rot', frange(-720, 720).toFixed(0) + 'deg');
        box.appendChild(c);
      }
      box.style.setProperty('--fall', Math.round((G.Screen ? G.Screen.h() : window.innerHeight) * 1.15) + 'px');
      underScreens(box);
      this.dom.push(box);
    }

    // ---------------------------------------------------------------- results
    _rewards(win, points) {
      const mult = { breezy: 1.0, normal: 1.25, spicy: 1.6, blazing: 2.0 }[this.difficulty] || 1;
      const clinks = Math.round(((win ? 600 : 300) + fmin(400, Math.floor(points / 10))) * mult);
      const xp = Math.round((win ? 250 : 150) * mult);
      return { clinks, xp, parts: { gel: 2 + Math.floor(points / 1000) } };
    }
    _medals() {
      const p = this.player, all = this.rangers;
      const top = key => all.reduce((b, r) => (r.tstats[key] > b.tstats[key] ? r : b), all[0]);
      const out = [];
      if (top('cells') === p && p.tstats.cells > 0) out.push('turf.medal.painter');
      if (top('enemyCells') === p && p.tstats.enemyCells > 0) out.push('turf.medal.enemy');
      if (top('pops') === p && p.tstats.pops > 0) out.push('turf.medal.popper');
      return out;
    }
    _toResults() {
      this.phase = 'results';
      const p = this.player, st = p.tstats;
      const win = this.winner === 0;
      const points = st.cells + (win ? 1000 : 0);
      this.stars = win ? (this.final.cov[0] >= 0.5 ? 3 : 2) : (st.cells >= 600 ? 1 : 0);
      const stats = [
        { key: 'turf.res.inked', value: G.t('turf.res.m2', { n: Math.round(st.cells * T.CELL_M2) }) },
        { key: 'turf.res.points', value: G.i18n.num(points) },
        { key: 'turf.res.cover', value: G.t('turf.res.pct', { n: (win ? this.final.pa : this.final.pa).toFixed(1) }) },
        { key: 'turf.res.pops', value: String(st.pops) },
        { key: 'turf.res.kos', value: String(st.kos) },
        { key: 'turf.res.specials', value: String(st.specials) },
      ];
      const medals = this._medals();
      const res = { mode: 'turf', win, stars: this.stars, stats, medals, coverage: this.final.cov[0], coverageB: this.final.cov[1], points, cells: st.cells,
        pops: st.pops, kos: st.kos, specials: st.specials, arena: this.arenaId, weapon: this.weaponId, difficulty: this.difficulty };
      // rewards: G.Progress (GDD §9.2 × difficulty) when available, else the same table locally
      let rewards = null;
      if (G.Progress && G.Progress.modeRewards) rewards = G.safe('turf rewards', () => G.Progress.modeRewards('turf', res));
      if (!rewards) rewards = this._rewards(win, points);
      res.rewards = rewards;
      this.result = res;
      if (G.Progress && G.Progress.grantRewards) G.safe('turf grant', () => G.Progress.grantRewards(rewards));
      else if (G.Progress && G.Progress.addBolts) G.safe('turf grant', () => { G.Progress.addBolts(rewards.clinks || 0); if (G.Progress.addXP) G.Progress.addXP(rewards.xp || 0); });
      // the weapons module already turns paint into weapon XP; only the fallback goo gun needs it here
      if (p.weapon && p.weapon.isFallback && G.Progress && G.Progress.weaponXP) G.safe('turf wxp', () => G.Progress.weaponXP(this.weaponId, Math.floor(st.cells / 20)));
      G.bus.emit('mode-result', res);
      for (const n of this.dom) n.remove();
      this.dom.length = 0; this.judgeWrap = null;
      if (this.judge) { G.R.vmScene.remove(this.judge.tick, this.judge.tock); }
      const replay = () => G.Game.go('turf', Object.assign({}, this.params));
      // "Lobby": change gear / arena / length and go again. The lobby opens over the judged arena; closing it without
      // starting a match goes back to town like Continue (checked a tick later: Start has begun loading by then).
      const lobby = () => G.UI.open('turf-lobby', { onClose: () => setTimeout(() => { if (!G.Game._switching && G.Game.modeId === 'turf' && T.match === this && !G.UI.isOpen('turf-lobby')) G.Game.go(G.Game.modes.hub ? 'hub' : 'title'); }, 0) });
      const tip = 'turf.tip.' + Math.floor(frand() * 4);
      const params = Object.assign({}, res, { title: G.t(win ? 'turf.victory' : 'turf.greatTry'), titleKey: win ? 'turf.victory' : 'turf.greatTry', tip, tipKey: tip, retry: replay, replay, onNext: lobby, nextLabel: 'turf.res.lobby' });
      if (G.UI.defs.results) G.UI.open('results', params); else G.UI.open('turf-results', params);
    }

    // ---------------------------------------------------------------- debug + teardown
    debug() {
      const p = this.player, P = this.paint;
      return {
        phase: this.phase, t: +this.pt.toFixed(2), timeLeft: +this.timeLeft.toFixed(2), arena: this.arenaId, weapon: this.weaponId,
        counts: [P.counts[0], P.counts[1], P.counts[2]], inkable: P.inkable, cov: P.coverage().map(v => +v.toFixed(4)), queue: P.queue.length,
        player: { pos: p.pos.toArray().map(v => +v.toFixed(2)), ink: +p.ink.toFixed(1), sp: Math.round(p.sp), hp: Math.round(p.hp), alive: p.alive, swimming: !!p.swimming, speedMod: +p.speedMod.toFixed(2), cells: p.tstats.cells, grounded: !!p.grounded, cell: P.ownerAt(p.pos.x, p.pos.z) },
        gbot: this.gbots.length, bots: [...this.allies, ...this.rivals].map(b => ({ name: b.name, team: b.team, role: b.role, w: b.weaponId, mode: b.mode, alive: b.alive, cells: b.tstats.cells, sp: b.tstats.specials, pops: b.tstats.pops, kos: b.tstats.kos, swim: !!b.swimming, ink: Math.round(b.ink), pos: [+b.pos.x.toFixed(1), +b.pos.z.toFixed(1)] })),
        winner: this.winner, final: this.final, fallbackWeapon: !!(p.weapon && p.weapon.isFallback),
      };
    }
    dispose() {
      for (const n of this.dom) n.remove();
      this.dom.length = 0; this.judgeWrap = null;
      this._removeIntro();
      if (this._onUi) { G.bus.off('ui-open', this._onUi); G.bus.off('ui-empty', this._onUi); this._onUi = null; }
      clearTimeout(this._hintTO); clearTimeout(this._cTO);
      if (this.judge) G.R.vmScene.remove(this.judge.tick, this.judge.tock);
      if (this.swimLoop) { this.swimLoop.stop(0.05); this.swimLoop = null; }
      if (this._slideSaved) { G.input.slide = this._slide; this._slideSaved = false; }
      if (this.teambar) { this.teambar.style.removeProperty('--team-a'); this.teambar.style.removeProperty('--team-b'); }
      if (this.touchEl) this.touchEl.style.removeProperty('--turf-a');
      if (this.hudEl) this.hudEl.classList.remove('turf-on', 'turf-koed', 'turf-pat');
      const IC = G.Input.ICONS || {};
      for (const b of ['gadget', 'ability', 'swap']) if (IC[b]) G.Input.setIcon(b, IC[b]);
      G.Input.setCooldown('gadget', 1, ''); G.Input.setCooldown('ability', 1, '');
      if (this._mmPrev !== undefined) G.HUD.minimapRange = this._mmPrev;
      G.HUD.removeMarker('turf-ping');
      G.R.camera.up.set(0, 1, 0);
      G.safe('turf paint dispose', () => this.paint.dispose());
      G.safe('turf gear dispose', () => this.gear.dispose());
      if (T.match === this) T.match = null;
    }
  }
  T.Match = Match;

  G.Game.register('turf', {
    layout: 'turf', music: 'turf', pausable: true,
    enter(params) {
      if (T.match) G.safe('turf cleanup', () => T.match.dispose());
      const m = new Match(params || {});
      T.lastParams = Object.assign({}, params || {});
      return m.world;
    },
    exit() { if (T.match) G.safe('turf exit', () => T.match.dispose()); T.match = null; },
    update(dt) { if (T.match) T.match.update(dt); },
    lateUpdate(dt) { if (T.match) T.match.late(dt); },
    restart() { G.Game.go('turf', Object.assign({}, T.lastParams || {})); },
  });
  T.state = () => (T.match ? T.match.debug() : null);
  // Test helper: advance the running match by `sec` seconds of game time synchronously (no rendering).
  // onStep(i) runs before each 50 ms step and may poke G.input (edge flags are cleared after every step).
  T.debugStep = function (sec, onStep, dt) {
    dt = dt || 0.05;
    const mode = G.Game.mode, w = G.Game.world;
    if (!T.match || !w || G.Game.modeId !== 'turf') return null;
    const n = fmax(1, Math.round(sec / dt));
    for (let i = 0; i < n; i++) {
      if (onStep) onStep(i);
      G.time.dt = dt; G.time.elapsed += dt;
      G.safe('turf step', () => { mode.update(dt); w.update(dt); mode.lateUpdate(dt); });
      G.Input.endFrame();
      if (!T.match) break;
    }
    return T.state();
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 24f_turf_mode.js]', e); }
// ---- 24g_turf_lobby.js
try { (function () {
// 24g_turf_lobby.js — Goo Turf lobby ('turf-lobby', opened by the Arena Gate NPC) and a fallback results panel
// ('turf-results', used only when the shared 'results' screen is not registered).
//   G.UI.open('turf-lobby')  → pick goo gear (owned / loaner kits), sub, special, arena, length, bot skill,
//                              Color Lock + team colour preview → Start → G.Game.go('turf', {...}).
(function (G) {
  'use strict';
  const T = G.Turf = G.Turf || {};
  const el = (...a) => G.UI.el(...a);
  const css = h => T.css(h);

  function prefs() {
    const s = G.Save.set;
    const p = Object.assign({ arena: 'random', weapon: 'splat', sub: 'bubble', special: null, quick: false }, (s && s.turf) || {});
    if (!T.legal(p.weapon) || !T.owned(p.weapon)) p.weapon = 'splat';
    if (!T.SUBS[p.sub]) p.sub = 'bubble';
    if (!T.SPECIALS[p.special]) p.special = T.stats(p.weapon).special;
    if (p.arena !== 'random' && !T.ARENAS[p.arena]) p.arena = 'random';
    return p;
  }
  function savePrefs(st) { if (!G.Save.set) return; G.Save.set.turf = { arena: st.arena, weapon: st.weapon, sub: st.sub, special: st.special, quick: !!st.quick }; G.Save.save(); }
  function bar(frac) { return el('div.bar', el('i', { style: { width: Math.round(Math.max(0.06, Math.min(1, frac)) * 100) + '%' } })); }
  function rankPR() { return G.Progress && G.Progress.rankInfo ? (G.safe('rank', () => G.Progress.rankInfo().pr) || 1) : 99; }

  G.UI.def('turf-lobby', {
    build(params, close, entry) {
      T.injectCSS();
      const st = entry.st || (entry.st = prefs());
      const s = G.Save.set || {};
      const cb = !!s.colorblind, lock = cb || T.colorLock();
      const pair = T.PAIRS[0];
      const colA = css(pair.a);
      const set = (k, v) => { st[k] = v; if (k === 'weapon') st.special = T.stats(v).special; savePrefs(st); G.UI.refresh(entry); };
      const sec = key => el('div.tl-sec', { i18n: key });
      // how it works
      const how = el('div.tl-how',
        el('div', el('span', { html: T.weaponIcon('splat', colA) }), el('span', { i18n: 'turf.lobby.how1' })),
        el('div', el('span', { html: '<svg viewBox="0 0 48 48"><path d="M6 30c6-6 12 6 18 0s12 6 18 0M6 20c6-6 12 6 18 0s12 6 18 0" fill="none" stroke="' + colA + '" stroke-width="5" stroke-linecap="round"/></svg>' }), el('span', { i18n: 'turf.lobby.how2' })),
        el('div', el('span', { html: T.specialIcon('storm', colA) }), el('span', { i18n: 'turf.lobby.how3' })));
      // arenas
      const arenaCards = ['random', ...T.ARENA_ORDER].map(id => {
        const on = st.arena === id;
        const card = el('div.card.clickable' + (on ? '.sel' : ''), { onclick: () => set('arena', id), role: 'button', 'aria-pressed': String(on) });
        if (id === 'random') {
          card.appendChild(el('div.tl-map', { style: { display: 'grid', placeItems: 'center', font: "var(--fw-d) 34px var(--f-display)", color: '#fff', WebkitTextStroke: 'max(1px, calc(2px * var(--ds, 1))) #1e1a4d', background: 'linear-gradient(135deg,' + colA + ',' + css(pair.b) + ')' }, text: '?' }));
          card.appendChild(el('h3', { i18n: 'turf.arena.random' }));
        } else {
          const cv = el('canvas.tl-map'); cv.width = 200; cv.height = 150;
          G.safe('arena map', () => T.drawArenaMap(cv, T.ARENAS[id], pair));
          card.appendChild(cv);
          card.appendChild(el('h3', { i18n: T.ARENAS[id].nameKey }));
        }
        return card;
      });
      // weapons
      const wcards = T.WEAPON_ORDER.map(id => {
        const ws = T.stats(id), owned = T.owned(id), on = st.weapon === id;
        const free = T.FREE_WEAPONS.includes(id);
        const card = el('div.card' + (owned ? '.clickable' : '.locked') + (on ? '.sel' : ''), owned ? { onclick: () => set('weapon', id), role: 'button', 'aria-pressed': String(on) } : null,
          el('div.row', { style: { gap: '6px', flexWrap: 'nowrap' } },
            el('span.ic', { html: T.weaponIcon(id, colA) }),
            el('div', { style: { minWidth: 0 } }, el('h3', { text: T.weaponName(id) }),
              el('div.row', { style: { gap: '4px' } },
                free ? el('span.tag', { i18n: 'turf.lobby.free' }) : null,
                owned ? null : el('span.tag', { i18n: 'ui.locked' })))),
          el('div.tl-mini',
            el('span', { i18n: 'turf.stat.hits' }), el('b', { text: String(ws.hits || Math.ceil(100 / Math.max(1, ws.dmg))) }),
            el('span', { i18n: 'turf.stat.ink' }), bar(1 - Math.min(1, (ws.cost * (ws.rate || 1)) / 14)),
            el('span', { i18n: 'turf.stat.paint' }), bar(ws.paintPow || 0.6),
            el('span', { i18n: 'turf.stat.range' }), bar((ws.range || 15) / 40)),
          owned ? null : el('p', { i18n: 'turf.lobby.locked' }));
        return card;
      });
      // subs + specials
      const subCards = T.SUB_ORDER.map(id => {
        const d = T.SUBS[id], on = st.sub === id;
        return el('div.card.clickable' + (on ? '.sel' : ''), { onclick: () => set('sub', id), role: 'button', 'aria-pressed': String(on) },
          el('div.row', { style: { gap: '6px', flexWrap: 'nowrap' } }, el('span.ic', { html: T.subIcon(id, colA) }), el('div', el('h3', { i18n: d.nameKey }), el('span.tag', { text: G.t('turf.cost', { n: d.cost }) }))),
          el('p', { i18n: d.descKey }));
      });
      const spCards = T.SPECIAL_ORDER.map(id => {
        const d = T.SPECIALS[id], on = st.special === id;
        return el('div.card.clickable' + (on ? '.sel' : ''), { onclick: () => set('special', id), role: 'button', 'aria-pressed': String(on) },
          el('div.row', { style: { gap: '6px', flexWrap: 'nowrap' } }, el('span.ic', { html: T.specialIcon(id, colA) }), el('h3', { i18n: d.nameKey })),
          el('p', { i18n: d.descKey }));
      });
      // options
      const seg = (items) => el('div.seg', items.map(it => el('button' + (it.on ? '.on' : ''), { type: 'button', onclick: it.locked ? null : it.fn, disabled: it.locked ? true : null, text: it.label })));
      const pr = rankPR();
      const need = d => { const D = G.Data && G.Data.DIFFICULTY; return D && D[d] && D[d].pr != null ? D[d].pr : ({ breezy: 0, normal: 0, spicy: 10, blazing: 18 })[d]; };
      const diffs = ['breezy', 'normal', 'spicy', 'blazing'].map(d => ({ label: G.t('set.diff.' + d), on: (s.difficulty || 'normal') === d, locked: pr < need(d), fn: () => { s.difficulty = d; G.Save.save(); G.UI.refresh(entry); } }));
      const lockT = el('div.toggle' + (lock ? '.on' : ''), { role: 'switch', tabindex: '0', 'aria-checked': String(lock) });
      if (!cb) lockT.addEventListener('click', () => { s.turfColorLock = !T.colorLock(); G.Save.save(); if (G.Audio) G.Audio.sfx('ui'); G.UI.refresh(entry); });
      else lockT.style.opacity = '0.6';
      const sw = (p) => el('div.row', { style: { gap: '10px' } },
        (() => { const e = el('span.tl-swatch.a', el('i'), G.t(p.an)); e.querySelector('i').style.background = css(p.a); return e; })(),
        el('b', { text: G.t('turf.vs') }),
        (() => { const e = el('span.tl-swatch.b', el('i'), G.t(p.bn)); e.querySelector('i').style.background = css(p.b); return e; })());
      // Ink patterns: stripes (your team) and dots (rivals) in the goo, on the roster, team bar and map. Always on in
      // colorblind mode; the same setting as Settings > Accessibility (G.Save.set.inkPatterns).
      const patOn = cb || !!s.inkPatterns;
      const patT = el('div.toggle' + (patOn ? '.on' : ''), { role: 'switch', tabindex: '0', 'aria-checked': String(patOn) });
      if (!cb) patT.addEventListener('click', () => { s.inkPatterns = !s.inkPatterns; G.Save.save(); if (G.Audio) G.Audio.sfx('ui'); G.UI.refresh(entry); });
      else patT.style.opacity = '0.6';
      const colors = el('div.col', { style: { gap: '6px' } },
        el('div.row', { style: { gap: '10px' } }, el('b', { i18n: 'turf.lobby.colorLock' }), lockT),
        lock ? sw(pair) : el('div.col', { style: { gap: '4px' } }, T.PAIRS.map(sw)),
        el('div.row', { style: { gap: '10px' } }, el('b', { i18n: 'turf.lobby.patterns' }), patT, el('span.tl-pat', el('i.a', { style: { backgroundColor: colA } }), el('i.b', { style: { backgroundColor: css(pair.b) } }))),
        el('p.muted.small', { i18n: cb ? 'turf.lobby.cbNote' : patOn ? 'turf.lobby.patHint' : 'turf.lobby.lockHint', style: { margin: 0 } }));
      const opts = el('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(min(250px,100%),1fr))' } },
        el('div.col', { style: { gap: '6px' } }, sec('turf.lobby.length'), seg([{ label: G.t('turf.lobby.std'), on: !st.quick, fn: () => set('quick', false) }, { label: G.t('turf.lobby.quick'), on: !!st.quick, fn: () => set('quick', true) }])),
        el('div.col', { style: { gap: '6px' } }, sec('turf.lobby.difficulty'), seg(diffs)),
        el('div.col', { style: { gap: '6px' } }, sec('turf.lobby.colors'), colors));
      // (tl-sec-gear / tl-gear / tl-arenas: on a short phone frame the goo gear comes first, compact, then the arenas, and
      // the how-to strip moves to the end — see SHORT in 24_turf.js; the gear used to start below the fold)
      const gearSec = sec('turf.lobby.weapon'); gearSec.classList.add('tl-sec-gear');
      const body = el('div.turf-lobby.col', { style: { gap: '8px' } },
        how,
        sec('turf.lobby.arena'), el('div.tl-cards.tl-arenas', arenaCards),
        gearSec, el('div.tl-cards.wide.tl-gear', wcards),
        sec('turf.lobby.sub'), el('div.tl-cards.wide', subCards),
        sec('turf.lobby.special'), el('div.tl-cards.wide', spCards),
        opts);
      const start = G.UI.btn('turf.lobby.start', () => {
        savePrefs(st);
        close();
        G.Game.go('turf', { arena: st.arena, weapon: st.weapon, sub: st.sub, special: st.special, quick: !!st.quick });
      }, 'primary big');
      start.id = 'turf-start';
      const foot = el('div.row.between', { style: { paddingTop: '4px' } }, el('span.muted', { style: { font: '800 13px var(--f-body)' }, i18n: 'turf.lobby.teams' }), start);
      const pnl = G.UI.panel('turf.lobby.title', close, body, { foot, icon: T.weaponIcon('splat', colA) });
      // the lobby is a long scrolling page (arena, gear, sub, special, options): while there is more below, its bottom
      // edge fades out, so a card cut by the edge on a phone reads as "scroll for more", not as a broken layout
      const pb = pnl.querySelector('.panel-body');
      if (pb) {
        const more = () => { if (pb.isConnected) pb.classList.toggle('tl-more', pb.scrollHeight - pb.scrollTop - pb.clientHeight > 4); };
        pb.addEventListener('scroll', more, { passive: true });
        requestAnimationFrame(more);
      }
      return pnl;
    },
  });

  // Fallback results panel (the shared 'results' screen from the menus module takes priority).
  G.UI.def('turf-results', {
    escClose: false,
    build(p, close) {
      T.injectCSS();
      const stars = el('div.results-stars', [0, 1, 2].map(i => el('span', { text: i < (p.stars || 0) ? '★' : '☆', style: { color: i < (p.stars || 0) ? '#ffd23f' : '#ffffff' } })));
      const rows = (p.stats || []).map(s => el('div.tr-row', el('span', { i18n: s.key }), el('b', { text: String(s.value) })));
      const rw = p.rewards || {};
      const list = [];
      const clinks = rw.clinks != null ? rw.clinks : rw.bolts;
      if (clinks) list.push(el('div.reward', el('i.coin'), el('span', { text: G.t('turf.rw.clinks', { n: clinks }) })));
      if (rw.xp) list.push(el('div.reward', el('span', { text: G.t('turf.rw.xp', { n: rw.xp }) })));
      if (rw.parts && rw.parts.gel) list.push(el('div.reward', el('span', { text: G.t('turf.rw.gel', { n: rw.parts.gel }) })));
      const medals = (p.medals || []).map(k => el('span.tag', { i18n: k, style: { background: '#ffd23f' } }));
      const cont = () => { close(); if (G.Game.modes.hub) G.Game.go('hub'); else G.UI.open('turf-lobby'); };
      const body = el('div.turf-res.col', { style: { gap: '8px' } },
        stars,
        el('div', rows),
        medals.length ? el('div.row', { style: { gap: '6px' } }, el('b', { i18n: 'turf.res.medals' }), medals) : null,
        el('div.reward-list', list),
        p.tipKey ? el('p.muted.small', { i18n: p.tipKey, style: { margin: 0, textAlign: 'center' } }) : null);
      const foot = el('div.row.end',
        G.UI.btn('turf.res.lobby', () => { close(); G.UI.open('turf-lobby'); }, 'small'),
        G.UI.btn('turf.res.again', () => { close(); (p.replay || (() => G.Game.go('turf', T.lastParams || {})))(); }, 'cool'),
        G.UI.btn('ui.continue', cont, 'primary'));
      return G.UI.panel(p.titleKey || 'turf.res.title', null, body, { narrow: true, foot });
    },
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 24g_turf_lobby.js]', e); }
})();
