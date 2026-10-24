/* Marmalune Rangers — pve: 20_hub.js 21_expedition.js 21b_exp_island.js 21c_exp_mode.js 21d_boss.js 21e_exp_select.js 22_defense.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 20_hub.js
try { (function () {
// 20_hub.js — Fizzport, the walkable hub town (mode 'hub') and the animated title backdrop
// (mode 'title'). Builds the round seaside plaza around the fizzing soda-spring fountain with the
// ten GDD §10.1 buildings (open-front rooms facing the fountain), NPCs at their counters, Beepo the
// companion with hint bubbles, critters, day/night tint, minimap, quick-menu and lock states.
//
// Public API (G.Hub):
//   BUILDINGS                      [{id, kind, ang, npc, screen, emblem, color, nameKey, useKey}]
//   isUnlocked(id) -> bool         building lock state (G.Progress.isUnlocked when present)
//   lockHintKey(id) -> i18n key    why a building is still closed
//   open(id, {travel})             visit a building: first-visit NPC talk, then its screen
//   travel(id)                     teleport the hub player to a building door (quick-menu)
//   say(textOrKey, {dur, params})  Beepo speech bubble (hub only; docked under the HUD chips so it
//                                  never covers a facility sign; {ann: [ids]} = a new-facility line,
//                                  acknowledged only once it has been readable)
//   suggestion() -> {key, id}      next best action (hub HUD chip + Beepo); before the first mission
//                                  it is "Start your first mission!" (chip opens the Mission Board)
//   lockShort(id) -> text|null     short unlock condition (lock plate, interact prompt, facility tag)
//   npcKind(id) -> art-kit kind    for portraits
// Readability: facility name tags (DOM) float over buildings 6-22 m away and in view; the crosshair
// only shows while practice-firing; new facilities (G.Progress.newUnlocks/ackUnlocks when present)
// are announced once by Beepo with a route marker. Strings added later live in 93_lang_onboard.js
// and 93_lang_world.js. Each facility carries a 1.3 m marquee name board (facility-colour band), a round
// badge in its colour above the door that turns to face the viewer, and purpose props at the door
// (G.Geo.doorProps); the bunting ring hangs from lamp masts above the boards. Hub.rangerName() = the
// equipped ranger's name (Beepo's welcome line).

(function (G) {
  'use strict';
  const U = G.util;
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2, DEG = PI / 180;

  G.i18n.add('en', {
    'hub.b.guild': 'Guild Hall', 'hub.b.workshop': 'Workshop', 'hub.b.shop': 'Pop Shop', 'hub.b.cafe': 'Fizz Café', 'hub.b.gallery': 'Gallery',
    'hub.b.defense': 'Guard Post', 'hub.b.training': 'Training Range', 'hub.b.hangar': 'Hangar', 'hub.b.arena': 'Arena Gate', 'hub.b.royale': 'Royale Tower',
    'hub.b.fountain': 'Mission Board',
    'hub.use.guild': 'Talk to Quill', 'hub.use.workshop': 'Talk to Gizma', 'hub.use.shop': 'Shop with Penny', 'hub.use.cafe': 'Visit Bloop', 'hub.use.gallery': 'Visit Lumi',
    'hub.use.defense': 'Fountain Guard', 'hub.use.training': 'Talk to Coach Ping', 'hub.use.hangar': 'Talk to Ace', 'hub.use.arena': 'Talk to Tick & Tock', 'hub.use.royale': 'Talk to Captain Gale',
    'hub.use.fountain': 'Open Mission Board', 'hub.use.locked': 'Locked',
    'hub.closed': 'Locked', 'hub.welcome': 'Welcome to Fizzport!', 'hub.town': 'Fizzport',
    'hub.lock.workshop': 'The Workshop opens after your first mission. Let\'s go pop some bots!',
    'hub.lock.shop': 'Penny opens the Pop Shop after the quest "First Pops".',
    'hub.lock.cafe': 'The Fizz Café opens at Guild Rank ★2.',
    'hub.lock.gallery': 'The Gallery opens when you collect 3 stickers.',
    'hub.lock.defense': 'Fountain Guard opens at Guild Rank ★2.',
    'hub.lock.hangar': 'The Hangar opens at Guild Rank ★2. Keep questing!',
    'hub.lock.arena': 'Goo Turf opens at Guild Rank ★2.',
    'hub.lock.royale': 'The Royale Tower opens at Guild Rank ★3.',
    'hub.lock.generic': 'This place opens soon. Keep questing!',
    'hub.lock.m1': '{name} opens after your next mission!', 'hub.lock.m2': '{name} opens after 2 more missions!',
    'hub.beepo.shield': 'Gizma can build us a Bubble Shield now! To the Workshop!',
    'hub.beepo.scrap': 'A Bubble Shield needs 4 Scrap Plates. Penny sells them at the Pop Shop!',
    'hub.beepo.turf': 'The Arena Gate is open! Let\'s paint the town in Goo Turf!',
    'hub.beepo.race': 'Ace is waiting at the Hangar. Star Skiff race time!',
    'hub.beepo.royale': 'Captain Gale\'s airship is ready! Sky Drop Royale, here we come!',
    'hub.quick': 'Map', 'hub.next': 'Next', 'hub.rank': 'Rank {n}', 'hub.pr': 'PR {n}',
    'hub.sug.guild': 'Visit Quill at the Guild Hall', 'hub.sug.claim': 'Claim your quest rewards!', 'hub.sug.mission': 'Start a mission at the Mission Board',
    'hub.sug.craft': 'Craft something at the Workshop', 'hub.sug.shield': 'Craft a Bubble Shield', 'hub.sug.cafe': 'Grab your free treat at the Café',
    'hub.sug.turf': 'Try Goo Turf!', 'hub.sug.race': 'Race the stars at the Hangar', 'hub.sug.royale': 'Drop into Sky Drop Royale!', 'hub.sug.explore': 'Explore Fizzport',
    'hub.beepo.hi': 'Beep boop! Welcome home, {name}!', 'hub.beepo.hi2': 'Fizzport is fizzing today!',
    'hub.beepo.guild': 'Quill at the Guild Hall has a job for us! Straight ahead!',
    'hub.beepo.claim': 'Ooh! Rewards are waiting at the Guild Hall!',
    'hub.beepo.mission': 'The Mission Board by the fountain has adventures!',
    'hub.beepo.craft': 'We have enough parts to craft something new! Workshop time!',
    'hub.beepo.treat': 'Bloop has a free treat for us at the Café today!',
    'hub.beepo.new': 'Look! The {name} is open now!',
    'hub.beepo.water': 'Whoa! The water is too deep. Let\'s stay on the island!',
    'hub.beepo.fire': 'Practice shots are safe in town. Nobody gets bonked!',
    'hub.beepo.idle1': 'Did you know? The fountain fizzes with real soda spring water!',
    'hub.beepo.idle2': 'I used to be a vacuum-bot. Now I vacuum parts for YOU!',
    'hub.beepo.idle3': 'Tap the map button to zip anywhere in town!',
    'hub.beepo.idle4': 'Pocket lint is the best. Don\'t tell anyone.',
    'hub.beepo.idle5': 'Upgraded weapons pop bots faster. Visit Gizma!',
    'hub.beepo.idle6': 'Wave at the critters! They love that.',
  });
  G.i18n.add('ja', {
    'hub.b.guild': 'ギルドホール', 'hub.b.workshop': 'ワークショップ', 'hub.b.shop': 'ポップショップ', 'hub.b.cafe': 'フィズカフェ', 'hub.b.gallery': 'ギャラリー',
    'hub.b.defense': 'ガードポスト', 'hub.b.training': 'トレーニング場', 'hub.b.hangar': 'ハンガー', 'hub.b.arena': 'アリーナゲート', 'hub.b.royale': 'ロワイヤルタワー',
    'hub.b.fountain': 'ミッションボード',
    'hub.use.guild': 'クイルと話す', 'hub.use.workshop': 'ギズマと話す', 'hub.use.shop': 'ペニーのお店', 'hub.use.cafe': 'ブループに会う', 'hub.use.gallery': 'ルミに会う',
    'hub.use.defense': 'ファウンテンガード', 'hub.use.training': 'ピンコーチと話す', 'hub.use.hangar': 'エースと話す', 'hub.use.arena': 'チック＆タックと話す', 'hub.use.royale': 'ゲイル船長と話す',
    'hub.use.fountain': 'ミッションボードを見る', 'hub.use.locked': 'ロック中',
    'hub.closed': 'ロック中', 'hub.welcome': 'フィズポートへようこそ！', 'hub.town': 'フィズポート',
    'hub.lock.workshop': 'ワークショップは はじめてのミッションのあとに ひらくよ。ロボをポンしに行こう！',
    'hub.lock.shop': 'クエスト「はじめてのポン」をクリアすると ポップショップが ひらくよ。',
    'hub.lock.cafe': 'フィズカフェは ギルドランク★2で ひらくよ。',
    'hub.lock.gallery': 'ステッカーを3まい あつめると ギャラリーが ひらくよ。',
    'hub.lock.defense': 'ファウンテンガードは ギルドランク★2で ひらくよ。',
    'hub.lock.hangar': 'ハンガーは ギルドランク★2で ひらくよ。クエストをがんばろう！',
    'hub.lock.arena': 'グーターフは ギルドランク★2で ひらくよ。',
    'hub.lock.royale': 'ロワイヤルタワーは ギルドランク★3で ひらくよ。',
    'hub.lock.generic': 'もうすぐ ひらくよ。クエストをがんばろう！',
    'hub.lock.m1': '{name}は つぎのミッションのあとに ひらくよ！', 'hub.lock.m2': '{name}は あと2かい ミッションを クリアすると ひらくよ！',
    'hub.beepo.shield': 'ギズマが バブルシールドを つくれるって！ ワークショップへ GO！',
    'hub.beepo.scrap': 'バブルシールドには スクラッププレートが 4まい いるよ。ペニーの ポップショップで 買えるよ！',
    'hub.beepo.turf': 'アリーナゲートが ひらいたよ！ グーターフで まちを ぬりまくろう！',
    'hub.beepo.race': 'ハンガーで エースが まってるよ。スキフレースの じかんだ！',
    'hub.beepo.royale': 'ゲイル船長の ひこうせんが じゅんびOK！ スカイドロップ・ロワイヤルへ！',
    'hub.quick': 'マップ', 'hub.next': 'つぎ', 'hub.rank': 'ランク{n}', 'hub.pr': 'PR {n}',
    'hub.sug.guild': 'ギルドホールのクイルに会おう', 'hub.sug.claim': 'クエストのほうびを もらおう！', 'hub.sug.mission': 'ミッションボードで しゅつげき！',
    'hub.sug.craft': 'ワークショップで クラフトしよう', 'hub.sug.shield': 'バブルシールドを つくろう', 'hub.sug.cafe': 'カフェで おやつを もらおう',
    'hub.sug.turf': 'グーターフに ちょうせん！', 'hub.sug.race': 'ハンガーで 星のレース！', 'hub.sug.royale': 'スカイドロップ・ロワイヤルへ！', 'hub.sug.explore': 'フィズポートを たんけんしよう',
    'hub.beepo.hi': 'ピポパ！ おかえり、{name}！', 'hub.beepo.hi2': 'きょうのフィズポートも シュワシュワだね！',
    'hub.beepo.guild': 'ギルドホールのクイルが おしごとをくれるよ！ まっすぐ前だよ！',
    'hub.beepo.claim': 'わあ！ ギルドホールで ほうびが まってるよ！',
    'hub.beepo.mission': 'ふんすいの ミッションボードで ぼうけんが まってるよ！',
    'hub.beepo.craft': 'パーツが たまったよ！ ワークショップで 新しいものを つくろう！',
    'hub.beepo.treat': 'きょうは ブループのカフェで おやつが もらえるよ！',
    'hub.beepo.new': 'みて！ {name}が ひらいたよ！',
    'hub.beepo.water': 'わわっ！ 水がふかいよ。島にもどろう！',
    'hub.beepo.fire': 'タウンでの れんしゅう射撃は あんぜんだよ。だれも ボンクされないよ！',
    'hub.beepo.idle1': 'しってた？ ふんすいは ほんものの ソーダのいずみなんだ！',
    'hub.beepo.idle2': 'ボクは むかし そうじロボだったんだ。いまは キミのために パーツを すいこむよ！',
    'hub.beepo.idle3': 'マップボタンを タップすると タウンのどこへでも ひとっとび！',
    'hub.beepo.idle4': 'ポケットのホコリって さいこう。ないしょだよ。',
    'hub.beepo.idle5': 'ぶきを強化すると ロボを はやくポンできるよ。ギズマに会いに行こう！',
    'hub.beepo.idle6': 'いきものたちに 手をふってみて！ よろこぶよ。',
  });

  const Hub = G.Hub = G.Hub || {};
  const FY = (G.Geo && G.Geo.FLOOR_Y) || 0.3;
  const RING = 28;            // door line radius (GDD §10.1 ring of radius 28)
  const PLAZA_R = 28.7;
  const SHORE0 = 44, SHORE1 = 53, WATER_Y = -0.7, EDGE_R = 46.2;
  const MAST = 8.2;           // flag-mast height of the ring lamps (the bunting hangs from it, clear of the signs)
  const rangerName = () => { try { const n = G.Wardrobe && G.Wardrobe.rangerName ? G.Wardrobe.rangerName() : null; if (n) return n; } catch (e) { /* fall back */ } return G.i18n.has('ranger.kiko') ? G.t('ranger.kiko') : 'Kiko'; };
  Hub.rangerName = rangerName;

  // GDD §10.1 slots: angle 0° = north (−Z), clockwise seen from above. The South Gate slot hosts the
  // Fountain Guard post (the Guard Post keeps the gate); the Mission Board kiosk stands at the fountain.
  const BUILDINGS = Hub.BUILDINGS = [
    { id: 'guild', kind: 'guild', ang: 0, npc: 'quill', screen: 'guild', emblem: 'star', color: 0x2ec4b6 },
    { id: 'workshop', kind: 'workshop', ang: 36, npc: 'gizma', screen: 'workshop', emblem: 'gear', color: 0xff8a4c },
    { id: 'shop', kind: 'shop', ang: 72, npc: 'penny', screen: 'shop', emblem: 'coin', color: 0xff6fb5 },
    { id: 'cafe', kind: 'cafe', ang: 108, npc: 'bloop', screen: 'cafe', emblem: 'cup', color: 0x3ddc97 },
    { id: 'gallery', kind: 'gallery', ang: 144, npc: 'lumi', screen: 'gallery', emblem: 'trophy', color: 0xffc21a },
    { id: 'defense', kind: 'defense', ang: 180, npc: null, screen: 'fountain', emblem: 'shield', color: 0x6e64a8, params: { tab: 'guard' } },
    { id: 'training', kind: 'training', ang: 216, npc: 'ping', screen: 'training-gate', emblem: 'target', color: 0xffd23f },
    { id: 'hangar', kind: 'hangar', ang: 252, npc: 'ace', screen: 'hangar', emblem: 'wing', color: 0x3fa9ff },
    { id: 'arena', kind: 'arena', ang: 288, npc: 'ticktock', screen: 'arena', emblem: 'splat', color: 0xff8a1f },
    { id: 'royale', kind: 'royale', ang: 324, npc: 'gale', screen: 'royale', emblem: 'pod', color: 0x8f6bff },
  ];
  const KIOSK = { id: 'fountain', kind: 'kiosk', ang: 200, npc: null, screen: 'fountain', emblem: 'star', color: 0xffd23f };
  const ALL = BUILDINGS.concat([KIOSK]);
  for (const b of ALL) { b.nameKey = 'hub.b.' + b.id; b.useKey = 'hub.use.' + b.id; }
  Hub.byId = id => ALL.find(b => b.id === id) || null;

  // ------------------------------------------------------------------ progression adapters
  const prof = () => (G.Save && G.Save.data ? G.Save.prof : {});
  function hubState() {
    const p = prof();
    if (!p.hub || typeof p.hub !== 'object') p.hub = {};
    const h = p.hub;
    h.visited = h.visited || {}; h.talked = h.talked || {}; h.seenOpen = h.seenOpen || {};
    return h;
  }
  Hub.state = hubState;
  function guildRank() {
    try { if (G.Progress && G.Progress.rankInfo) { const r = G.Progress.rankInfo(); if (r && r.guild != null) return r.guild; } } catch (e) { /* ignore */ }
    const p = prof();
    return (p.rank && p.rank.guild) || p.guild || p.guildRank || 1;
  }
  const ALWAYS = { guild: 1, fountain: 1, training: 1 };
  // Hub building id -> progression feature id (G.Data.BUILDINGS uses 'tower'; the Guard Post follows
  // the Fountain Guard mode) and -> visit id for quest q01.
  const UNLOCK_ID = { royale: 'tower', defense: 'defense' };
  const VISIT_ID = { royale: 'tower', defense: 'gate' };
  const FROM_DATA = { tower: 'royale', gate: 'defense' };
  Hub.isUnlocked = function (id) {
    if (ALWAYS[id]) return true;
    if (G.Progress && typeof G.Progress.isUnlocked === 'function') {
      try { const r = G.Progress.isUnlocked(UNLOCK_ID[id] || id); if (r != null) return !!r; } catch (e) { /* fall through */ }
    }
    const p = prof();
    const ub = p.unlocks && p.unlocks.buildings;
    if (Array.isArray(ub)) return ub.includes(id);
    const gr = guildRank();
    if (id === 'royale') return gr >= 3;
    if (id === 'hangar' || id === 'arena' || id === 'defense' || id === 'cafe') return gr >= 2;
    return false;
  };
  Hub.lockHintKey = id => (G.i18n.has('hub.lock.' + id) ? 'hub.lock.' + id : 'hub.lock.generic');
  // Localised "why is this closed" line. The first-session unlocks are eased to mission counts in
  // G.Progress, so prefer the honest "opens after your next mission" over the GDD rank text.
  // name: optional display name (defaults to the building name).
  Hub.lockText = function (id, name) {
    const h = unlockInfo(id);
    if (h && h.missions > 0) return G.t(h.missions <= 1 ? 'hub.lock.m1' : 'hub.lock.mn', { name: name || (G.i18n.has('hub.b.' + id) ? G.t('hub.b.' + id) : id), n: h.missions });
    return G.t(Hub.lockHintKey(id));
  };
  // Short unlock condition for the 3D lock plate, the interact prompt and the facility tag ("Opens after
  // your next mission"); null when the building opens some other way (or G.Progress has no hint API).
  // G.Progress.unlockInfo(f) -> {missions|pr|guild|story, text}; older builds: unlockHint(f) -> {missions}.
  function unlockInfo(id) {
    const P = G.Progress, f = UNLOCK_ID[id] || id;
    let o = null;
    try { o = P && P.unlockInfo ? P.unlockInfo(f) : P && P.unlockHint ? P.unlockHint(f) : null; } catch (e) { o = null; }
    if (typeof o === 'string') o = { text: o };
    return o && typeof o === 'object' ? o : null;
  }
  Hub.lockShort = function (id) {
    const o = unlockInfo(id);
    if (!o) return null;
    if (o.text) return o.text;   // the same wording as the Map and the Mission Board
    if (o.missions > 0) return o.missions <= 1 ? G.t('hub.lockShort1') : G.t('hub.lockShortN', { n: o.missions });
    return null;
  };

  // Art-kit NPC kind resolver (kinds may be named differently in 15b; fuzzy match, else fallback).
  const NPC_MAP = { quill: 'guildmaster', gizma: 'mechanic', penny: 'merchant', bloop: 'chef', lumi: 'curator', ping: 'coach', ace: 'pilot', companion: 'companion' };
  Hub.npcKind = function (id) {
    const kinds = (G.Geo && G.Geo.NPC_KINDS) || [];
    const k = NPC_MAP[id] || id;
    if (kinds.includes(k)) return k;
    if (kinds.includes(id)) return id;
    return null; // Tick & Tock and Captain Gale are built locally (buildTickTock / buildGale)
  };

  // ------------------------------------------------------------------ small art fallbacks
  function fallbackNPC(id) {
    const col = { quill: 0x3d55b8, gizma: 0xff8a4c, penny: 0xff6fb5, bloop: 0x3ddc97, lumi: 0xffd45c, ping: 0xffd23f, ace: 0x3fa9ff, ticktock: 0xff8a1f, gale: 0x8f6bff }[id] || 0x33b5ff;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 4, 12), G.M.toon(col, { spec: 0.6 }));
    body.position.y = 0.85; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), G.M.toon(0xfff1dc, { spec: 0.6 }));
    head.position.y = 1.62; g.add(head);
    const eyeM = G.M.toon(0x1e1a4d, { rim: false });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeM); e.position.set(s * 0.13, 1.66, 0.31); g.add(e); }
    const sh = G.R.blobShadow(0.45); sh.position.y = 0.02; g.add(sh);
    return { group: g, parts: { head }, setExpr() {}, greet() { head.userData.hop = 0.35; }, animate(t, dt) { head.position.y = 1.62 + Math.sin(t * 2) * 0.02 + (head.userData.hop || 0) * 0.3; if (head.userData.hop) head.userData.hop = Math.max(0, head.userData.hop - dt); body.scale.y = 1 + Math.sin(t * 2.2) * 0.02; } };
  }
  function fallbackBeepo() {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), G.M.toon(0xfff1dc, { spec: 0.8 }));
    g.add(shell);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), G.M.basic(0x39d5ff));
    eye.position.z = 0.235; g.add(eye);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), G.M.toon(0x1f2a5a));
    ant.position.y = 0.31; g.add(ant);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), G.M.basic(0xff6b8b)); bob.position.y = 0.41; g.add(bob);
    for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), G.M.toon(0x39d5ff)); f.scale.set(0.4, 1, 1); f.position.set(s * 0.25, 0, 0); g.add(f); }
    return { group: g, parts: {}, setExpr() {}, greet() {}, animate() {} };
  }
  // Captain Gale: walrus-ish airship captain (local primitives, one vertex-coloured mesh).
  function buildGale() {
    const Geo = G.Geo, parts = [];
    const add = (g, col, x, y, z, sx, sy, sz, rx) => { g.deleteAttribute('uv'); if (sx) g.scale(sx, sy, sz); if (rx) g.rotateX(rx); g.translate(x, y, z); Geo.colorize(g, col); parts.push(g); };
    add(new THREE.SphereGeometry(0.62, 18, 14), 0x2e3f8f, 0, 0.78, 0, 1, 0.98, 0.88);
    add(new THREE.SphereGeometry(0.44, 16, 12), 0xfff1dc, 0, 0.74, 0.3, 1, 1.05, 0.55);
    for (const sy of [0.98, 0.72]) add(new THREE.SphereGeometry(0.05, 8, 6), 0xe8b44a, 0, sy, 0.55);
    add(new THREE.SphereGeometry(0.42, 18, 14), 0xc99a7a, 0, 1.5, 0.02);
    for (const sx of [-1, 1]) {
      add(new THREE.SphereGeometry(0.17, 12, 10), 0xf2dcc8, sx * 0.12, 1.4, 0.34);
      add(new THREE.ConeGeometry(0.045, 0.24, 8), 0xfffaf2, sx * 0.11, 1.2, 0.4, 1, 1, 1, Math.PI);
      add(new THREE.SphereGeometry(0.055, 8, 6), 0x1e1a4d, sx * 0.15, 1.6, 0.36);
      add(new THREE.CapsuleGeometry(0.11, 0.42, 4, 8), 0x2e3f8f, sx * 0.62, 0.86, 0.06, 1, 1, 1, 0);
      add(new THREE.SphereGeometry(0.13, 10, 8), 0xc99a7a, sx * 0.66, 0.56, 0.12);
      add(new THREE.SphereGeometry(0.16, 10, 8), 0x1e2a5a, sx * 0.24, 0.1, 0.1, 1.1, 0.6, 1.4);
    }
    add(new THREE.SphereGeometry(0.07, 8, 6), 0x5a3a3a, 0, 1.5, 0.42);
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20), 0x1e2a5a, 0, 1.84, 0);
    add(new THREE.CylinderGeometry(0.33, 0.36, 0.3, 18), 0xfffaf2, 0, 2.0, 0);
    add(new THREE.CylinderGeometry(0.365, 0.365, 0.08, 18), 0x1e2a5a, 0, 1.9, 0);
    add(new THREE.SphereGeometry(0.07, 8, 6), 0xffc21a, 0, 1.98, 0.34);
    const mesh = new THREE.Mesh(Geo.merge(parts), G.M.vc({ spec: 0.5, rimStr: 0.35 }));
    const g = new THREE.Group(); g.add(mesh);
    const sh = G.R.blobShadow(0.55); sh.position.y = 0.02; g.add(sh);
    let hop = 0;
    return { group: g, parts: { body: mesh }, setExpr() {}, greet() { hop = 0.5; },
      animate(t, dt) { hop = Math.max(0, hop - dt); mesh.position.y = Math.sin(hop * 2 * Math.PI) * 0.18 * (hop > 0 ? 1 : 0); mesh.scale.set(1 + Math.sin(t * 1.6) * 0.015, 1 - Math.sin(t * 1.6) * 0.02, 1); mesh.rotation.z = Math.sin(t * 0.9) * 0.04; } };
  }
  // Tick & Tock: two round referee birds (art-kit puffbirds, team colours) with little flags.
  function buildTickTock() {
    const g = new THREE.Group(), birds = [];
    [[0xff8a1f, -0.42], [0x3d7bff, 0.42]].forEach(([col, x], i) => {
      const c = makeCritter('puffbird', col);
      c.group.scale.setScalar(1.9); c.group.position.x = x; c.group.rotation.y = i ? -0.25 : 0.25;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), G.M.toon(0x1e1a4d));
      pole.position.set(i ? -0.22 : 0.22, 0.4, 0.05); pole.rotation.z = i ? 0.4 : -0.4;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.15), G.M.toon(col, { side: THREE.DoubleSide, rim: false }));
      flag.position.set(i ? -0.08 : 0.08, 0.2, 0); pole.add(flag);
      c.group.add(pole);
      g.add(c.group); birds.push({ c, pole });
    });
    return { group: g, parts: {}, setExpr() {}, greet() { for (const b of birds) if (b.c.anim) b.c.anim.timer = 0; },
      animate(t, dt) { birds.forEach((b, i) => { animCritter(b.c, t + i * 0.7, dt); b.pole.rotation.x = Math.sin(t * 4 + i * 2) * 0.35; }); } };
  }
  function makeNPC(id) {
    if (id === 'gale' && !Hub.npcKind('gale')) return buildGale();
    if (id === 'ticktock') return buildTickTock();
    const kind = Hub.npcKind(id);
    if (kind && G.Geo && G.Geo.npc) { const n = G.safe('npc ' + id, () => G.Geo.npc(kind)); if (n && n.group) return n; }
    return id === 'companion' ? fallbackBeepo() : fallbackNPC(id);
  }
  function makeCritter(kind, color) {
    if (G.Geo && G.Geo.critter) { const c = G.safe('critter', () => G.Geo.critter(kind, color)); if (c && c.group) return c; }
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), G.M.toon(color, { spec: 0.8 }));
    m.scale.set(1, 0.8, 1); m.position.y = 0.18; g.add(m);
    return { group: g, fallback: true };
  }
  function animCritter(c, t, dt) {
    if (c.fallback || !G.Geo || !G.Geo.animateCritter) return;
    try { G.Geo.animateCritter(c, t, dt); } catch (e) { G.safeFail('critter anim', e); }   // (no closure per critter per frame)
  }

  // ------------------------------------------------------------------ ground / physics
  function bump(x, z) { return G.noise.fbm2(x * 0.08 + 11, z * 0.08 - 4, 2) * 0.22; }
  function groundH(x, z) {
    const r = Math.sqrt(x * x + z * z);
    if (r < 30) return 0;
    if (r < SHORE0) return bump(x, z) * U.smoothstep(30, 34, r);
    if (r < SHORE1) { const k = U.smoothstep(SHORE0, SHORE1, r); return bump(x, z) * (1 - k) - 2.7 * k; }
    return -2.7 - Math.min(1.5, (r - SHORE1) * 0.05);
  }
  function visH(x, z) {
    const r = Math.sqrt(x * x + z * z);
    if (r < PLAZA_R - 0.6) return -0.12;
    return groundH(x, z);
  }
  // Island ground: seabed -> wet sand -> dry sand -> lawn, all blended (no hard colour steps). The lawn
  // mixes three greens with big warm/cool fields, pink clover patches and a trodden ring at the plaza edge.
  const _gc = new THREE.Color(), _gd = new THREE.Color(), _ge = new THREE.Color();
  const GC = { sea0: new THREE.Color(0x6fd0c6), sea1: new THREE.Color(0x92e2cf), wet: new THREE.Color(0xe0bf86), sand: new THREE.Color(0xf7e3b0), sand2: new THREE.Color(0xeed29c),
    g0: new THREE.Color(0x4fae58), g1: new THREE.Color(0x6ccb5f), g2: new THREE.Color(0x98d866), warm: new THREE.Color(0xb8de62), cool: new THREE.Color(0x46a46c), pink: new THREE.Color(0xffa6d2), worn: new THREE.Color(0xcdb98e), plaza: new THREE.Color(0xd8c0a0) };
  function groundColor(x, z, h, s) {
    const r = Math.sqrt(x * x + z * z);
    const n = G.noise.n2(x * 0.11, z * 0.11), n2 = G.noise.n2(x * 0.37 + 3, z * 0.37 - 8);
    if (r < PLAZA_R - 0.6) return 0xd8c0a0;
    // sand: wet near the waterline, sea floor turquoise below it
    _gd.copy(GC.sand).lerp(GC.sand2, U.clamp(0.5 + n2 * 0.8, 0, 1) * 0.6);
    _gd.lerp(GC.wet, 1 - U.smoothstep(WATER_Y + 0.05, WATER_Y + 0.7, h));
    if (h < WATER_Y + 0.05) { _ge.copy(GC.sea0).lerp(GC.sea1, U.clamp(0.5 + n, 0, 1)); _gd.lerp(_ge, U.smoothstep(WATER_Y + 0.05, WATER_Y - 1.4, h)); }
    // lawn
    const t = U.clamp(0.5 + n * 0.7 + n2 * 0.25, 0, 1);
    if (t < 0.5) _gc.copy(GC.g0).lerp(GC.g1, t * 2); else _gc.copy(GC.g1).lerp(GC.g2, t * 2 - 1);
    const mn = G.noise.n2(x * 0.021 + 3.3, z * 0.021 - 7.1);
    if (mn > 0.12) _gc.lerp(GC.warm, U.smoothstep(0.12, 0.55, mn) * 0.45); else if (mn < -0.18) _gc.lerp(GC.cool, U.smoothstep(-0.18, -0.6, mn) * 0.4);
    const pn = G.noise.n2(x * 0.05 + 9, z * 0.05 - 2);
    if (pn > 0.3) _gc.lerp(GC.pink, U.smoothstep(0.3, 0.48, pn) * (0.78 + 0.22 * t)); // pink clover patches
    // trodden ring where the plaza meets the lawn
    _gc.lerp(GC.worn, (1 - U.smoothstep(PLAZA_R + 0.2, PLAZA_R + 2.6, r + n2 * 0.6)) * 0.62);
    if (r < PLAZA_R + 0.4) _gc.lerp(GC.plaza, 0.5);
    // lawn -> sand with a ragged edge
    return _gc.lerp(_gd, sandK(r, n, h)).getHex();
  }
  // 0 on the lawn .. 1 on sand: the ragged lawn edge shared by the ground colour and the grass field
  function sandK(r, n, h) { return Math.max(U.smoothstep(SHORE0 - 3.2, SHORE0 - 0.4, r + n * 1.4), 1 - U.smoothstep(-0.32, -0.1, h)); }

  // Adds a prop at an arbitrary yaw. Boxes become exact AABBs at 90° steps; otherwise chains of
  // vertical cylinders (phys has no oriented boxes). Low floor boxes become heightfield floors.
  function addProp(world, prop, x, y, z, ry, ctx, parent) {
    let mesh = prop.mesh;
    if (mesh.parent) mesh = mesh.clone();
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    (parent || world.scene).add(mesh);
    const c = Math.cos(ry), s = Math.sin(ry);
    const quarter = Math.abs(Math.sin(2 * ry)) < 1e-4, odd = quarter && Math.abs(Math.sin(ry)) > 0.5;
    const phys = world.phys, items = [];
    const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    for (const cl of prop.colliders || []) {
      if (cl.type === 'cyl') { const p = W(cl.x, cl.z); items.push(phys.addCyl(p[0], p[1], cl.r, y + cl.y0, y + cl.y1, cl.tag)); continue; }
      const top = cl.cy + cl.sy / 2, bot = cl.cy - cl.sy / 2;
      if (ctx && ctx.floors && top <= FY + 0.02 && cl.sx > 3 && cl.sz > 3) {
        const p = W(cl.cx, cl.cz);
        ctx.floors.push({ x: p[0], z: p[1], c, s, hx: cl.sx / 2, hz: cl.sz / 2, y: y + top, rr: (cl.sx * cl.sx + cl.sz * cl.sz) / 4 + 1 });
        continue;
      }
      if (quarter) { const p = W(cl.cx, cl.cz); items.push(phys.addBox(p[0], y + cl.cy, p[1], odd ? cl.sz : cl.sx, cl.sy, odd ? cl.sx : cl.sz, cl.tag)); continue; }
      if (y + bot > 3.4) continue; // roofs and headers: out of reach, skip
      const alongX = cl.sx >= cl.sz, len = alongX ? cl.sx : cl.sz, th = alongX ? cl.sz : cl.sx;
      const r = Math.max(0.4, th / 2), span = Math.max(0, len / 2 - r);
      const n = span > 0.01 ? Math.ceil((2 * span) / (1.3 * r)) + 1 : 1;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : -span + (2 * span * i) / (n - 1);
        const p = W(cl.cx + (alongX ? t : 0), cl.cz + (alongX ? 0 : t));
        items.push(phys.addCyl(p[0], p[1], r, y + bot, y + top, cl.tag));
      }
    }
    const anchors = {};
    for (const k in prop.anchors || {}) { const a = prop.anchors[k]; const p = W(a.x, a.z); anchors[k] = new V3(p[0], y + a.y, p[1]); }
    return { mesh, items, anchors };
  }
  function floorAt(floors, x, z, h) {
    for (let i = 0; i < floors.length; i++) {
      const f = floors[i], dx = x - f.x, dz = z - f.z;
      if (dx * dx + dz * dz > f.rr) continue;
      const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
      if (lx > -f.hx && lx < f.hx && lz > -f.hz && lz < f.hz && f.y > h) h = f.y;
    }
    return h;
  }

  // ------------------------------------------------------------------ plaza floor mesh
  function plazaGeometry() {
    const pos = [], col = [];
    const cA = new THREE.Color(), tmp = new THREE.Color();
    const quad = (r0, r1, a0, a1, y, hex) => {
      cA.setHex(hex);
      const p = (r, a) => [Math.sin(a) * r, y, -Math.cos(a) * r];
      const A = p(r0, a0), B = p(r1, a0), C = p(r1, a1), D = p(r0, a1);
      pos.push(...A, ...C, ...B, ...A, ...D, ...C);
      for (let i = 0; i < 6; i++) col.push(cA.r, cA.g, cA.b);
    };
    const rings = [0, 2.5, 5.2, 5.9, 6.6, 7.3, 8.0, 8.5];
    for (let r = 9.5; r < 18; r += 1.05) rings.push(r);
    rings.push(18, 18.7);
    for (let r = 19.75; r < 27.6; r += 1.05) rings.push(r);
    rings.push(27.7, PLAZA_R);
    const rnd = G.rng(42);
    // Festival floor: the tile field is a candy pinwheel — 20 wedges: the ten centred on the facility paths stay cream,
    // the ten between them are rays in a pastel sun / mint / sky / lilac / pink cycle, strongest at the fountain and
    // still there, softer, past the coral / white candy kerb ring at 18 m (every field ring's tile count is a multiple of
    // 40, so the wedge edges run straight); a dotted ring of pastel tiles circles the outer field, and every path is laid
    // in its facility's own colour (the same hue as its badge, tag and minimap block: wayfinding at a glance)
    const RAYS = [0xffd45c, 0x7fe3cf, 0x8fd0ff, 0xc4adff, 0xff9fc0];
    const cW = new THREE.Color(), cT = new THREE.Color();
    for (let i = 0; i < rings.length - 1; i++) {
      const r0 = rings[i], r1 = rings[i + 1], rm = (r0 + r1) / 2;
      const field = rm > 8.5 && rm < 27.7 && !(rm > 18 && rm < 18.7);
      const segs = field ? Math.max(40, Math.round((TAU * rm) / 1.1 / 40) * 40) : Math.max(24, Math.round((TAU * rm) / 1.1 / 2) * 2);
      const dots = field && rm > 22.9 && rm < 23.9;
      for (let j = 0; j < segs; j++) {
        const a0 = (j / segs) * TAU, a1 = ((j + 1) / segs) * TAU, am = (a0 + a1) / 2;
        let hex;
        if (rm < 5.2) hex = 0xbfeef0;
        else if (rm < 8.0) hex = (i + j) % 2 ? 0x7fe3cf : (j % 6 === 0 ? 0xff8fa8 : j % 6 === 3 ? 0xffd45c : 0xfffaf0);
        else if (rm < 8.5) hex = 0xffc93a;
        else if (rm > 18 && rm < 18.7) hex = (j >> 1) % 2 ? 0xff7f9c : 0xfffaf2;
        else if (rm > 27.7) hex = 0xc9ad8c;
        else {
          const v = rnd(), inner = rm < 18;
          const w = Math.floor((am / TAU) * 20 + 0.5) % 20;   // wedge index (even: a facility path runs down its middle)
          cW.setHex((i + j) % 2 ? 0xfff6e8 : 0xfcecd8);
          if (w % 2) {
            const k = inner ? U.lerp(0.62, 0.46, (rm - 8.5) / 9.5) : U.lerp(0.3, 0.22, (rm - 18.7) / 9);
            cW.lerp(cT.setHex(RAYS[((w - 1) >> 1) % 5]), k * (v < 0.12 ? 1.12 : 1));
          }
          if (dots && j % 4 === 2) cW.setHex(RAYS[(j >> 2) % 5]);
          hex = cW.getHex();
        }
        quad(r0, r1, a0, a1, 0, hex);
      }
    }
    // tiled paths from the mosaic to every door (wayfinding), slightly raised: the facility colour (light tiles in two
    // tones), cream edges, a darker dashed centre line
    for (const b of ALL) {
      if (b.id === 'fountain') continue;
      const a = b.ang * DEG, w = 1.7, sx = Math.cos(a), sz = Math.sin(a);
      // (pastels of the facility hue at a floor of saturation: the Guard Post's dusky violet read as a grey path)
      const hsl = new THREE.Color(b.color).getHSL({ h: 0, s: 0, l: 0 }), ps = Math.max(hsl.s, 0.62);
      const pc0 = new THREE.Color().setHSL(hsl.h, ps, 0.74).getHex(), pc1 = new THREE.Color().setHSL(hsl.h, ps, 0.82).getHex();
      const pcD = new THREE.Color().setHSL(hsl.h, ps, 0.62).getHex();
      for (let r = 8.6; r < RING - 0.2; r += 1.0) {
        const r1 = Math.min(RING - 0.2, r + 1.0), k = Math.floor(r);
        for (let lane = -2; lane < 2; lane++) {
          const l0 = (lane / 2) * w, l1 = ((lane + 1) / 2) * w;
          const edge = lane === -2 || lane === 1;
          const hex = edge ? 0xfffaf0 : (k % 3 === 0 ? pcD : (k + lane) % 2 ? pc0 : pc1);
          const P = (rr, l) => [Math.sin(a) * rr + sx * l, 0.03, -Math.cos(a) * rr + sz * l];
          const A = P(r, l0), B = P(r1, l0), C = P(r1, l1), D = P(r, l1);
          pos.push(...A, ...C, ...B, ...A, ...D, ...C);
          tmp.setHex(hex);
          for (let q = 0; q < 6; q++) col.push(tmp.r, tmp.g, tmp.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }

  // Stool (unit height, scaled per NPC).
  let _stoolGeo = null;
  function stoolGeometry() {
    if (_stoolGeo) return _stoolGeo;
    const Geo = G.Geo;
    const leg = new THREE.CylinderGeometry(0.26, 0.32, 1, 12); leg.deleteAttribute('uv'); leg.translate(0, 0.5, 0); Geo.colorize(leg, 0x1f2a5a);
    const top = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16); top.deleteAttribute('uv'); top.translate(0, 0.96, 0); Geo.colorize(top, 0xe8b44a);
    _stoolGeo = Geo.merge([leg, top]); _stoolGeo.userData.shared = true;
    return _stoolGeo;
  }

  // Padlock + "closed" plate for locked buildings (merged primitives).
  let _lockGeo = null;
  function lockGeometry() {
    if (_lockGeo) return _lockGeo;
    const Geo = G.Geo, parts = [];
    const body = Geo.roundedBox(0.9, 0.75, 0.32, 0.12, 2); body.translate(0, 0, 0); Geo.colorize(body, 0xffc21a); parts.push(body);
    const sh = new THREE.TorusGeometry(0.3, 0.08, 8, 18, PI); sh.deleteAttribute('uv'); sh.translate(0, 0.38, 0); Geo.colorize(sh, 0x9aa5b8); parts.push(sh);
    const hole = new THREE.CylinderGeometry(0.08, 0.08, 0.36, 10); hole.deleteAttribute('uv'); hole.rotateX(PI / 2); hole.translate(0, 0.02, 0.01); Geo.colorize(hole, 0x1e1a4d); parts.push(hole);
    _lockGeo = Geo.merge(parts); _lockGeo.userData.shared = true;
    return _lockGeo;
  }

  // Ranger Locker cabinet (local +Z = front): lilac wardrobe on a navy plinth, cream doors, a round mirror on
  // the left door, vents + a ranger badge on the right one, gold handles. Placed beside the Gallery path.
  const LOCKER = { ang: 152.5, r: 23.6, turn: -0.42 };
  let _lockerGeo = null;
  function lockerGeometry() {
    if (_lockerGeo) return _lockerGeo;
    const Geo = G.Geo, parts = [];
    const put = (g, col, x, y, z, rx, rz) => { if (g.attributes.uv) g.deleteAttribute('uv'); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); Geo.colorize(g, col); parts.push(g); };
    put(Geo.roundedBox(1.92, 0.2, 1.02, 0.07, 2), 0x1f2a5a, 0, 0.1, 0);
    put(Geo.roundedBox(1.7, 2.24, 0.82, 0.16, 2), 0xb983ff, 0, 1.32, 0);
    put(Geo.roundedBox(1.86, 0.2, 0.96, 0.08, 2), 0x1f2a5a, 0, 2.5, 0);
    put(Geo.roundedBox(1.5, 0.08, 0.7, 0.03, 1), 0xffd23f, 0, 2.63, 0);
    for (const sx of [-1, 1]) {
      put(Geo.roundedBox(0.74, 1.94, 0.08, 0.06, 2), 0xfff6e6, sx * 0.395, 1.3, 0.41);
      put(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), 0xffc21a, sx * 0.07, 1.22, 0.47);
    }
    // mirror: gold ring, pale glass, a white glint
    put(new THREE.TorusGeometry(0.28, 0.045, 8, 28), 0xffd23f, -0.395, 1.58, 0.46);
    put(new THREE.CylinderGeometry(0.265, 0.265, 0.03, 28), 0xc8f6ff, -0.395, 1.58, 0.455, PI / 2);
    put(new THREE.BoxGeometry(0.055, 0.3, 0.012), 0xffffff, -0.46, 1.63, 0.475, 0, 0.6);
    put(new THREE.BoxGeometry(0.03, 0.14, 0.012), 0xffffff, -0.36, 1.48, 0.475, 0, 0.6);
    // right door: vents and a round ranger badge (teal with a gold star point)
    for (let i = 0; i < 3; i++) put(Geo.roundedBox(0.44, 0.05, 0.04, 0.02, 1), 0xd9c8ff, 0.395, 2.0 + i * 0.09, 0.46);
    put(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 22), 0x2ec4b6, 0.395, 0.82, 0.46, PI / 2);
    put(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 5), 0xffd23f, 0.395, 0.82, 0.472, PI / 2);
    _lockerGeo = Geo.merge(parts); _lockerGeo.userData.shared = true;
    return _lockerGeo;
  }

  // ------------------------------------------------------------------ festival dressing (1.3 art pass)
  // Hub-only geometry, vertex-coloured, merged / instanced and cached across loads where the shape never changes: the
  // Marmalune moon riding the soda jet with its ring of toy planets, market carts and flower tubs on the plaza ring,
  // the harbour (a walkable pier, moored boats, bobbing buoys, a beach corner), sandy islets out on the bay, region
  // showpiece sky islands and two drifting hot-air balloons. Small detail far from the viewer is hidden per tier
  // (town.detail within DETAIL_R m of the viewer) so the busiest views stay inside the phone budget.
  const DETAIL_R = { low: 30, med: 44, high: 44, ultra: 55 };
  const CRIT_R = { low: 22, med: 30, high: 32, ultra: 50 };
  // the harbour pier: angle (deg, 0 = north, clockwise), root radius, length, deck height, width
  const PIER = { ang: 165, r0: 39.6, len: 21, deck: 0.42, w: 2.4 };
  // market carts (slot angle -> CARTS index) and flower tubs on the plaza ring between the facility paths (162°: the
  // Ranger Locker's corner stays clear)
  const CART_SLOTS = { 54: 0, 126: 1, 234: 2, 306: 3 }, CART_R = 21.4, TUB_SLOTS = [18, 90, 198, 270, 342], TUB_R = 21.0;
  const kitData = build => { const k = new G.Geo.Kit(); build(k, G.Geo.P, G.Geo); return k.data(); };
  // pier-local (along, across) -> world [x, z]
  const pierW = (al, lat) => { const a = PIER.ang * DEG, x0 = Math.sin(a) * PIER.r0, z0 = -Math.cos(a) * PIER.r0; return [x0 + Math.sin(a) * al - Math.cos(a) * lat, z0 - Math.cos(a) * al - Math.sin(a) * lat]; };
  const PIER_MAST = 4.3;   // the two flag masts at the pier root (festoons run from them to the lamp at its end)
  const gs = g => { g.userData.shared = true; return g; };
  function starShape(ro, ri, n) {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = PI / 2 + (i * PI) / n, r = i % 2 ? ri : ro; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    s.closePath(); return s;
  }
  const extrudeSm = (shape, depth, bev, bevSeg, curveSeg) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: bevSeg || 2, curveSegments: curveSeg || 4 });
    g.deleteAttribute('uv'); g.translate(0, 0, -depth / 2);
    return G.Geo.smooth(g, 50);
  };
  // Crescent: inside the circle (centre (-d, 0), radius R), outside the circle (origin, radius r) — the horn tips sit
  // left of the origin, so a vertical axis through the origin (the soda jet) passes through the hollow, never the moon.
  function crescentShape(R, r, d, n) {
    const xt = (R * R - r * r - d * d) / (2 * d), yt = Math.sqrt(Math.max(1e-4, r * r - xt * xt));
    const s = new THREE.Shape();
    const a0 = Math.atan2(yt, xt + d), a1 = TAU - a0;
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n), x = -d + Math.cos(a) * R, y = Math.sin(a) * R; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    const b0 = TAU - Math.atan2(yt, xt), b1 = Math.atan2(yt, xt);
    for (let i = 1; i < n; i++) { const a = b0 + (b1 - b0) * (i / n); s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    s.closePath();
    return s;
  }
  // The Marmalune: a glossy marmalade crescent with a sleepy smiling profile on both faces (closed happy eye, smile,
  // blush, soft craters) and a gold rim; it wraps around the fountain's soda jet. ~1.9k tris.
  let _moonGeo = null;
  function moonGeometry() {
    if (_moonGeo) return _moonGeo;
    const Geo = G.Geo, P = Geo.P, parts = [];
    const R = 1.8, r = 1.78, d = 1.05, depth = 0.46, bev = 0.17, zf = depth / 2 + bev;   // (horn tips 0.49 m off the jet axis)
    const body = extrudeSm(crescentShape(R, r, d, 28), depth, bev, 3, 4);
    Geo.colorize(body, (x, y, z, nx, ny, nz) => {
      if (Math.abs(nz) < 0.72) return Geo.mixHex(0xffc93a, 0xfff0a8, U.clamp(ny * 0.5 + 0.5, 0, 1) * 0.6);
      const t = U.clamp((y + R) / (2 * R), 0, 1), edge = U.clamp((-x - r) / (d + R - r), 0, 1);
      return Geo.mixHex(Geo.mixHex(0xff7d36, 0xffb44a, t), 0xffd27a, (1 - edge) * 0.35);
    });
    parts.push(body);
    const put = (g, col, x, y, z, rx, ry, rz, sx, sy, sz) => { if (g.attributes.uv) g.deleteAttribute('uv'); Geo.xf(g, x, y, z, rx, ry, rz, sx, sy, sz); Geo.colorize(g, col); parts.push(g); };
    for (const s of [1, -1]) {
      const z = s * (zf - 0.015), ry = s > 0 ? 0 : PI;
      put(P.tor(0.17, 0.05, 5, 12, PI), 0x3a1f4d, -2.06, 0.36, z, 0, ry, 0);                 // closed happy eye
      put(P.tor(0.05, 0.022, 4, 8, PI), 0x3a1f4d, -1.91, 0.58, z, 0, ry, -0.5);              // lash flick
      put(P.tor(0.21, 0.05, 5, 12, PI), 0x3a1f4d, -2.04, -0.3, z, 0, ry, PI);                // smile
      put(P.sph(1, 8, 5), 0xff8fb0, -2.36, 0.0, z, 0, 0, 0, 0.19, 0.12, 0.04);                // blush
      for (const c of [[-2.3, 1.05, 0.13], [-2.32, -0.95, 0.15], [-1.75, 1.38, 0.08]]) put(P.sph(1, 8, 5), 0xffcf73, c[0], c[1], z, 0, 0, 0, c[2], c[2], 0.03);
    }
    // a little gold star charm hanging from the lower horn on a short string
    put(P.cyl(0.012, 0.012, 0.42, 4), 0xfff6e6, -0.72, -1.86, 0);
    put(extrudeSm(starShape(0.26, 0.11, 5), 0.07, 0.03, 1, 1), 0xffd23f, -0.72, -2.25, 0);
    _moonGeo = gs(Geo.merge(parts));
    return _moonGeo;
  }
  // Toy planets and stars on a thin gold hoop, orbiting the jet under the moon (one mesh that turns).
  let _orbitGeo = null;
  function orbitGeometry() {
    if (_orbitGeo) return _orbitGeo;
    const d = kitData((k, P) => {
      const R = 2.6, cols = [0x7fe3ff, 0xff8fc0, 0xa8f08a, 0xc9a8ff];
      k.add(P.tor(R, 0.035, 3, 48), 0xffd23f, 0, 0, 0, PI / 2, 0, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU, x = Math.cos(a) * R, z = Math.sin(a) * R, y = Math.sin(a * 2) * 0.2;
        if (i % 2 === 0) {
          k.add(P.sph(0.3, 9, 6), cols[(i / 2) % 4], x, y, z);
          k.add(P.tor(0.47, 0.045, 3, 14), 0xfff6e6, x, y, z, PI / 2 + 0.45, 0, 0.3);
        } else k.add(extrudeSm(starShape(0.36, 0.16, 5), 0.09, 0.035, 1, 1), 0xffd23f, x, y, z, 0, -a + PI / 2, 0);
      }
    });
    _orbitGeo = gs(d.solid);
    return _orbitGeo;
  }
  // Market cart (local +Z = counter side): polka-dot cart on four wheels, striped awning with a scalloped valance, goods
  // on the counter and a giant topper (soda cup / ice-fizz cone / star / gear). o: {body, awn, top, topC}
  const CARTS = [
    { body: 0x3fd9c0, awn: 0xff6b8b, top: 'cup', topC: 0xff6b8b },
    { body: 0xff8fc0, awn: 0xffc93a, top: 'cone' },
    { body: 0xa48bff, awn: 0x3fb8ff, top: 'star', topC: 0xffd23f },
    { body: 0xffb347, awn: 0x3ddc97, top: 'gear', topC: 0x3fb8ff },
  ];
  function cartKit(k, P, Geo, o) {
    const cream = 0xfff6e6, navy = 0x1f2a5a, slope = 0.24;
    k.add(P.rbox(2.3, 0.9, 1.2, 0.18, 1), o.body, 0, 0.68, 0);
    k.add(P.rbox(2.16, 0.16, 1.06, 0.06, 1), Geo.darken(o.body, 0.28), 0, 0.2, 0);
    k.add(P.rbox(2.5, 0.12, 1.45, 0.05, 1), cream, 0, 1.18, 0.06);
    for (let i = -1; i <= 1; i++) k.add(P.cyl(0.18, 0.18, 0.04, 10), i ? cream : o.awn, i * 0.72, 0.68, 0.605, PI / 2, 0, 0);
    for (const sx of [-1, 1]) for (const sz of [-0.34, 0.34]) {
      k.add(P.cyl(0.27, 0.27, 0.13, 8), navy, sx * 1.15, 0.27, sz, 0, 0, PI / 2);
      k.add(P.cyl(0.12, 0.12, 0.15, 6), 0xffd23f, sx * 1.15, 0.27, sz, 0, 0, PI / 2);
    }
    const yAt = z => 2.5 - (z - 0.08) * Math.tan(slope);
    for (const sx of [-1, 1]) for (const sz of [-0.5, 0.5]) { const top = yAt(sz) - 0.04, h = top - 1.22; k.add(P.cyl(0.04, 0.04, h, 6), cream, sx * 1.1, 1.22 + h / 2, sz); }
    const n = 8, wS = 2.72 / n;
    for (let i = 0; i < n; i++) k.add(P.box(wS + 0.004, 0.06, 1.75), i % 2 ? cream : o.awn, -1.36 + wS * (i + 0.5), 2.5, 0.08, slope, 0, 0);
    k.add(P.box(2.74, 0.16, 0.06), o.awn, 0, 2.27, 0.95);
    for (let i = 0; i < n; i++) k.add(P.cyl(wS / 2, wS / 2, 0.05, 7), i % 2 ? o.awn : cream, -1.36 + wS * (i + 0.5), 2.19, 0.935, PI / 2, 0, 0);
    // goods on the counter
    for (let i = 0; i < 5; i++) {
      const x = -0.9 + i * 0.45, c = [0xff6b8b, 0xffd23f, 0x3fe0b8, 0x8f6bff, 0x3fb8ff][i];
      if (o.top === 'cone') { k.add(P.cone(0.08, 0.22, 6), 0xe8b06a, x, 1.35, 0.42, PI, 0, 0); k.add(P.sph(0.1, 6, 4), c, x, 1.5, 0.42); }
      else if (o.top === 'star') { k.add(P.sph(0.11, 6, 4), c, x, 1.62, 0.42, 0, 0, 0, 1, 1.18, 1); k.add(P.cyl(0.008, 0.008, 0.36, 3), cream, x, 1.38, 0.42); }
      else { k.add(P.cyl(0.07, 0.06, 0.2, 6), c, x, 1.34, 0.42); k.add(P.cyl(0.075, 0.075, 0.03, 6), cream, x, 1.45, 0.42); }
    }
    // the topper, on a short post behind the awning ridge
    const ty = 3.05, tz = -0.45;
    k.add(P.cyl(0.05, 0.05, 0.5, 6), cream, 0, 2.78, tz);
    if (o.top === 'cup') {
      k.add(P.cyl(0.5, 0.38, 0.85, 10), o.topC, 0, ty + 0.1, tz);
      k.add(P.cyl(0.505, 0.47, 0.18, 10), cream, 0, ty + 0.18, tz);
      k.add(P.sph(0.52, 10, 5), cream, 0, ty + 0.52, tz, 0, 0, 0, 1, 0.35, 1);
      k.add(P.cyl(0.05, 0.05, 0.8, 6), 0x3fe0b8, 0.12, ty + 0.9, tz, 0, 0, -0.25);
    } else if (o.top === 'cone') {
      k.add(P.cone(0.42, 1.0, 10), 0xe8b06a, 0, ty + 0.05, tz, PI, 0, 0);
      k.add(P.sph(0.44, 10, 7), 0xff9fc0, 0, ty + 0.62, tz);
      k.add(P.sph(0.36, 10, 6), 0x9ff0d0, 0, ty + 1.02, tz);
      k.add(P.sph(0.12, 6, 4), 0xff4d6a, 0, ty + 1.42, tz);
    } else if (o.top === 'star') k.add(extrudeSm(starShape(0.62, 0.27, 5), 0.16, 0.06, 1, 1), o.topC, 0, ty + 0.35, tz);
    else k.add(Geo.emblem('gear', o.topC).clone(), null, 0, ty + 0.35, tz, 0, 0, 0, 1.05);
    // an A-frame signboard beside the cart: cream boards, a disc in the awning colour with a star
    const sx = -1.78, sz = 0.42;
    for (const s of [1, -1]) {
      k.add(P.box(0.66, 0.9, 0.05), cream, sx, 0.47, sz + s * 0.12, -s * 0.24, 0, 0);
      k.add(P.cyl(0.24, 0.24, 0.03, 12), o.awn, sx, 0.55, sz + s * 0.155, PI / 2 - s * 0.24, 0, 0);
      k.add(extrudeSm(starShape(0.13, 0.06, 5), 0.02, 0, 1, 1), 0xfffaf2, sx, 0.55, sz + s * 0.175, -s * 0.24, s > 0 ? 0 : PI, 0);
    }
  }
  // Plaza bench (front +Z): rounded slats in the bench colour on navy legs with gold armrests — the art kit's bench
  // shape at half its triangles (plain boxes where nobody sees a bevel); ~610 tris.
  const _benchGeo = {};
  function benchGeometry(color) {
    if (_benchGeo[color]) return _benchGeo[color];
    const d = kitData((k, P, Geo) => {
      for (let i = 0; i < 3; i++) k.add(P.rbox(2.0, 0.07, 0.15, 0.03, 1), i % 2 ? Geo.darken(color, 0.08) : color, 0, 0.47, -0.17 + i * 0.17);
      for (let i = 0; i < 2; i++) k.add(P.rbox(2.0, 0.15, 0.06, 0.03, 1), color, 0, 0.72 + i * 0.22, -0.3 - i * 0.03, -0.18, 0, 0);
      for (const sx of [-1, 1]) {
        k.add(P.box(0.09, 0.5, 0.5), 0x1f2a5a, sx * 0.9, 0.25, 0);
        k.add(P.box(0.09, 0.62, 0.08), 0x1f2a5a, sx * 0.9, 0.78, -0.31, -0.18, 0, 0);
        k.add(P.box(0.12, 0.07, 0.55), 0xe8b44a, sx * 0.9, 0.68, 0.0);
      }
    });
    _benchGeo[color] = gs(d.solid);
    return _benchGeo[color];
  }
  // Flower tub (planter + flowering bush), kit-local at its base centre.
  function tubKit(k, P, Geo, seed, pot, flower) {
    const g = Geo.lathe([[0.82, 0], [0.92, 0.14], [0.88, 0.5], [0.99, 0.57], [0.93, 0.66], [0, 0.62]], 16);
    Geo.colorize(g, (x, y) => (y > 0.53 ? 0xfff1dc : y < 0.12 ? Geo.darken(pot, 0.15) : pot));
    k.addRaw(g);
    k.add(Geo.bushGeo(seed, 0x5cc85a, flower).clone(), null, 0, 0.55, 0, 0, seed * 0.7, 0, 0.78);
  }
  // Harbour boats (origin at the waterline, bow +Z): 'sail' (coral sloop with a striped sail), 'duck' (sunny duck
  // pedal boat), 'tug' (sky-blue puffer tug with a striped funnel and tyre fenders).
  const _boatGeo = {};
  function boatGeometry(kind) {
    if (_boatGeo[kind]) return _boatGeo[kind];
    const d = kitData((k, P, Geo) => {
      const hull = (sx, sy, sz, col, rim, keel) => {
        const g = new THREE.SphereGeometry(1, 18, 9, 0, TAU, PI / 2, PI / 2); g.deleteAttribute('uv'); g.scale(sx, sy, sz);
        Geo.colorize(g, (x, y) => (y > -0.12 ? rim : y < -sy * 0.62 ? keel : col));
        k.addRaw(g);
        k.add(P.cyl(1, 1, 0.14, 18), rim, 0, 0.04, 0, 0, 0, 0, sx * 1.02, 1, sz * 1.02);
        k.add(P.cyl(1, 1, 0.05, 18), 0xe7b778, 0, 0.1, 0, 0, 0, 0, sx * 0.9, 1, sz * 0.92);
      };
      if (kind === 'sail') {
        hull(0.78, 0.6, 1.8, 0xff7a8a, 0xfffaf2, 0x1f2a5a);
        k.add(P.rbox(0.86, 0.46, 0.9, 0.14, 1), 0xfff6e6, 0, 0.36, -0.55);
        k.add(P.rbox(0.94, 0.08, 1.0, 0.04, 1), 0xff7a8a, 0, 0.62, -0.55);
        for (const sx of [-1, 1]) k.add(P.cyl(0.07, 0.07, 0.03, 10), 0x2c3a7a, sx * 0.44, 0.38, -0.55, 0, 0, PI / 2);
        k.add(P.cyl(0.04, 0.055, 3.5, 6), 0xfff6e6, 0, 1.8, 0.3);
        k.add(P.cyl(0.03, 0.03, 1.6, 5), 0xfff6e6, 0, 0.82, -0.45, PI / 2, 0, 0);
        // (shape x = fore-aft, y = height; turned into the boat's YZ plane)
        const sail = new THREE.Shape(); sail.moveTo(0, 0.82); sail.lineTo(-0.04, 3.35); sail.lineTo(-1.6, 0.86); sail.closePath();
        const sg = extrudeSm(sail, 0.03, 0, 1, 1); sg.rotateY(-PI / 2); sg.translate(0, 0, 0.25);
        Geo.colorize(sg, (x, y) => (Math.floor(y / 0.42) % 2 ? 0xffd23f : 0xfffaf2));
        k.addRaw(sg);
        const jib = new THREE.Shape(); jib.moveTo(0, 0.86); jib.lineTo(-0.04, 3.0); jib.lineTo(1.15, 0.76); jib.closePath();
        const jg = extrudeSm(jib, 0.03, 0, 1, 1); jg.rotateY(-PI / 2); jg.translate(0, 0, 0.37);
        Geo.colorize(jg, 0xfffaf2); k.addRaw(jg);
        const pn = new THREE.Shape(); pn.moveTo(0, 0); pn.lineTo(-0.55, -0.1); pn.lineTo(0, -0.22); pn.closePath();
        k.add(extrudeSm(pn, 0.02, 0, 1, 1), 0xff6b8b, 0, 3.55, 0.3, 0, PI / 2, 0);
      } else if (kind === 'duck') {
        hull(0.85, 0.5, 1.15, 0xffd23f, 0xfff1a8, 0xff9a3d);
        k.add(P.sph(0.62, 14, 10), 0xffd23f, 0, 0.32, -0.55, 0, 0, 0, 1.15, 0.8, 0.9);
        k.add(P.rbox(0.9, 0.12, 0.42, 0.05, 1), 0x3fe0b8, 0, 0.42, 0.05);
        k.add(P.sph(0.44, 14, 10), 0xffd23f, 0, 1.0, 0.86);
        k.add(P.cyl(0.24, 0.32, 0.5, 12), 0xffd23f, 0, 0.6, 0.78, 0.3, 0, 0);
        k.add(P.sph(0.2, 10, 6), 0xff9a3d, 0, 0.93, 1.3, 0, 0, 0, 1.15, 0.55, 1.2);
        for (const sx of [-1, 1]) {
          k.add(P.sph(0.075, 8, 6), 0x1e1a4d, sx * 0.2, 1.1, 1.22);
          k.add(P.sph(0.025, 6, 4), 0xffffff, sx * 0.2 + 0.02, 1.14, 1.29);
          k.add(P.sph(0.07, 8, 5), 0xff8fb0, sx * 0.3, 0.98, 1.16, 0, 0, 0, 1, 0.6, 0.4);
        }
      } else {
        hull(0.95, 0.62, 1.6, 0x3fa9ff, 0xfffaf2, 0xff6b8b);
        k.add(P.rbox(1.1, 0.8, 0.95, 0.16, 1), 0xfff6e6, 0, 0.55, -0.15);
        k.add(P.rbox(1.24, 0.12, 1.1, 0.05, 1), 0x3fa9ff, 0, 1.0, -0.15);
        for (const sx of [-1, 1]) k.add(P.box(0.03, 0.26, 0.6), 0x2c3a7a, sx * 0.56, 0.68, -0.15);
        k.add(P.box(0.7, 0.26, 0.03), 0x2c3a7a, 0, 0.68, 0.34);
        k.add(P.cyl(0.2, 0.24, 0.75, 12), 0xff6b8b, 0, 1.4, -0.85);
        k.add(P.cyl(0.212, 0.212, 0.16, 12), 0xfffaf2, 0, 1.55, -0.85);
        for (const sx of [-1, 1]) for (const z of [-0.6, 0.35]) k.add(P.tor(0.16, 0.07, 5, 10), 0x1f2a5a, sx * 0.96, 0.02, z, 0, PI / 2, 0);
      }
    });
    _boatGeo[kind] = gs(d.solid);
    return _boatGeo[kind];
  }
  // Buoy (origin at the waterline): red / cream striped float, cone cap, a little lamp ball.
  let _buoyGeo = null;
  function buoyGeometry() {
    if (_buoyGeo) return _buoyGeo;
    const d = kitData((k, P) => {
      const g = P.sph(0.42, 12, 8); g.scale(1, 0.85, 1);
      G.Geo.colorize(g, (x, y) => (y > 0.12 || (y < -0.05 && y > -0.2) ? 0xff5a6e : 0xfffaf2));
      k.addRaw(g);
      k.add(P.cone(0.26, 0.5, 10), 0xfffaf2, 0, 0.55, 0);
      k.add(P.cyl(0.12, 0.12, 0.08, 10), 0xff5a6e, 0, 0.48, 0);
      k.add(P.sph(0.1, 8, 6), 0xffe36a, 0, 0.86, 0);
    });
    _buoyGeo = gs(d.solid);
    return _buoyGeo;
  }
  // Low-poly island palm (~150 tris) for the islets out on the bay.
  let _islePalm = null;
  function islePalmGeo() {
    if (_islePalm) return _islePalm;
    const P = G.Geo.P, parts = [];
    const tr = P.cyl(0.14, 0.24, 4.2, 6); tr.translate(0, 2.1, 0);
    const tp = tr.attributes.position; for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + (y / 4.2) * (y / 4.2) * 0.7); }
    tr.computeVertexNormals(); G.Geo.colorize(tr, (x, y) => (Math.floor(y / 0.5) % 2 ? 0xc89460 : 0xb07a4a)); parts.push(tr);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3, fr = P.cone(0.38, 2.4, 4); fr.scale(1, 1, 0.18); fr.translate(0, 1.2, 0); fr.rotateX(PI / 2 + 0.45); fr.rotateY(-a + PI / 2); fr.translate(0.7, 4.15, 0);
      G.Geo.colorize(fr, i % 2 ? 0x56c26a : 0x7fd96a); parts.push(fr);
    }
    const nut = P.sph(0.16, 6, 4); nut.translate(0.62, 3.95, 0.12); G.Geo.colorize(nut, 0x8a5a3a); parts.push(nut);
    _islePalm = gs(G.Geo.merge(parts));
    return _islePalm;
  }
  // Hot-air balloon (local origin at the envelope's widest ring; basket below): gores in two colours + a band.
  function hotAirParts(parts, x, y, z, s, cA, cB) {
    const P = G.Geo.P;
    const env = G.Geo.lathe([[0, -2.2], [0.55, -1.95], [1.55, -1.0], [2.1, 0], [2.05, 0.9], [1.6, 1.75], [0.9, 2.25], [0, 2.4]], 12);
    G.Geo.colorize(env, (px, py, pz) => { const g = Math.floor(((Math.atan2(pz, px) + PI) / TAU) * 12 + 0.5) % 2; return py > 0.25 && py < 0.65 ? 0xfffaf2 : g ? cA : cB; });
    const put = (g, col) => { if (g.attributes.uv) g.deleteAttribute('uv'); if (col != null) G.Geo.colorize(g, col); G.Geo.xf(g, x, y, z, 0, 0, 0, s, s, s); parts.push(g); };
    put(env, null);
    const bk = P.rbox(0.7, 0.55, 0.7, 0.1, 1); bk.translate(0, -3.25, 0); put(bk, 0xc8884a);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const rp = P.cyl(0.02, 0.02, 1.0, 3); rp.translate(sx * 0.3, -2.55, sz * 0.3); put(rp, 0xfff6e6); }
  }
  // Fizzport's rocket lighthouse (review pass; world-space parts pushed into parts[], base at (x, y, z), portholes toward
  // local +Z turned by ry): a fat candy-striped toy rocket standing on three fins on its own islet out in the bay —
  // portholes, a gold-railed lantern room under the nose cone, a star on the tip. Seen from the title over the bay, the
  // harbour pier and the south lawns. ~1.2k tris, merged into the islets' mesh (no draw call of its own).
  const LIGHTHOUSE = { x: -12, z: 124, ry: 0.35, lamp: 8.75 };
  function rocketLighthouseParts(parts, x, y, z, ry) {
    const Geo = G.Geo, P = Geo.P, coral = 0xff6b7d, cream = 0xfffaf2, navy = 0x2c3a7a, gold = 0xffd23f;
    const put = (g, col, px, py, pz, rx, rry, rz) => {
      if (g.attributes.uv) g.deleteAttribute('uv');
      if (col != null) Geo.colorize(g, col);
      Geo.xf(g, px || 0, py || 0, pz || 0, rx, rry, rz); Geo.xf(g, x, y, z, 0, ry, 0); parts.push(g);
    };
    const prof = [[1.5, 0], [1.78, 1.2], [1.74, 3.4], [1.5, 6.0], [1.24, 7.7], [1.2, 8.0]];
    put(Geo.lathe(Geo.banded(prof, [[-1, coral], [1.7, cream], [3.3, coral], [4.9, cream], [6.5, coral]], 0.02), 12), null);
    put(P.cyl(2.2, 2.45, 0.5, 18), navy, 0, 0.1, 0);
    // three teal fins (local x outward)
    const fin = new THREE.Shape(); fin.moveTo(0, 0.2); fin.lineTo(1.35, -0.1); fin.lineTo(1.05, 1.3); fin.lineTo(0, 3.1); fin.closePath();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + PI / 6; put(extrudeSm(fin, 0.24, 0.07, 1, 1), 0x3fe0b8, Math.cos(a) * 1.35, 0.25, Math.sin(a) * 1.35, 0, -a, 0); }
    // portholes up the front
    for (const [py, pr] of [[2.4, 1.76], [5.2, 1.58]]) {
      put(P.tor(0.34, 0.08, 5, 14), navy, 0, py, pr + 0.03);
      put(P.cyl(0.31, 0.31, 0.05, 12), 0xfff0a0, 0, py, pr, PI / 2, 0, 0);
    }
    // lantern room: gold deck, pale glass with navy mullions, gold rail
    put(P.cyl(1.62, 1.5, 0.2, 18), gold, 0, 8.08, 0);
    put(P.cyl(1.0, 1.0, 1.25, 14), 0xd8fbff, 0, 8.8, 0);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; put(P.cyl(0.07, 0.07, 1.25, 4), navy, Math.cos(a) * 1.02, 8.8, Math.sin(a) * 1.02); }
    put(P.tor(1.52, 0.05, 3, 20), gold, 0, 8.75, 0, PI / 2, 0, 0);
    // nose cone, gold tip and a star finial
    put(Geo.lathe(Geo.banded([[1.3, 9.4], [1.18, 10.3], [0.78, 11.5], [0.3, 12.4], [0, 12.62]], [[-1, coral], [10.0, cream], [10.6, coral]], 0.02), 12), null);
    put(P.sph(0.24, 8, 5), gold, 0, 12.72, 0);
    put(extrudeSm(starShape(0.62, 0.27, 5), 0.13, 0.05, 1, 1), gold, 0, 13.55, 0);
  }
  // Region showpiece sky island (one merged mesh): the base island in the region's strata with its set pieces on top —
  // 'mesas' (banded hoodoos + a waterfall spilling off the rim into a cloud puff), 'glowcap' (giant pastel mushrooms),
  // 'frost' (snowy peaks, ice crystals, snow-dusted pines).
  function showIsle(kind, R, seed) {
    const Geo = G.Geo, P = Geo.P, parts = [], rnd = G.rng(seed * 13 + 7);
    const bands = kind === 'frost' ? [0xf4f6ff, 0xc8d4f4, 0x9aa8e0, 0x7e78c0, 0x6e64a8, 0x5a5098] : kind === 'glowcap' ? [0x9a8ae0, 0x7e6cc8, 0x6a5ab0, 0x58489a, 0x4a3c84, 0x3d3070] : Geo.PAL.bands;
    const base = Geo.skyIsland(R, seed, { bands });
    parts.push(base.mesh.geometry.clone());
    const put = (g, col, x, y, z, ry, s) => { if (g.attributes.uv) g.deleteAttribute('uv'); if (col != null) Geo.colorize(g, col); Geo.xf(g, x, y, z, 0, ry || 0, 0, s || 1, s || 1, s || 1); parts.push(g); };
    if (kind === 'mesas') {
      for (let i = 0; i < 3; i++) {
        const a = rnd() * TAU, dd = R * (0.25 + rnd() * 0.4), h = R * (0.55 + rnd() * 0.5);
        const hb = Geo.lathe(Geo.banded([[R * 0.2, 0], [R * 0.17, h * 0.4], [R * 0.13, h * 0.8], [R * 0.17, h], [0, h + 0.1]], [[-1, 0xf2b98a], [h * 0.25, 0xe88a5a], [h * 0.5, 0xf7e1b5], [h * 0.75, 0xd97b7b]], 0.02), 9);
        put(hb, null, Math.cos(a) * dd, 0.3, Math.sin(a) * dd);
      }
      // waterfall over the rim (+X side) into a cloud of spray
      const wf = new THREE.PlaneGeometry(R * 0.4, R * 1.9, 4, 6); wf.translate(0, -R * 0.95 + 0.4, 0);
      const wp = wf.attributes.position; for (let i = 0; i < wp.count; i++) { const y = wp.getY(i), k = U.clamp(-y / (R * 1.9), 0, 1); wp.setX(i, wp.getX(i) * (1 + k * 0.8)); wp.setZ(i, k * k * R * 0.35); }
      wf.computeVertexNormals();
      // (streaks: alternate columns white / sky; whiter toward the spray)
      Geo.colorize(wf, (x, y, z, nx, ny, nz, i) => Geo.mixHex((i % 5) % 2 ? 0x7fe8ff : 0xe8fdff, 0xffffff, U.clamp(-y / (R * 1.5), 0, 1) * 0.8));
      wf.rotateY(PI / 2); put(wf, null, R * 1.02, 0, 0);
      // its back face (the same sheet with the winding and normals flipped)
      const wb = wf.clone(), ix = wb.index.array; for (let i = 0; i < ix.length; i += 3) { const s = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = s; }
      const wn = wb.attributes.normal; for (let i = 0; i < wn.count; i++) wn.setXYZ(i, -wn.getX(i), -wn.getY(i), -wn.getZ(i));
      parts.push(wb);
      // the spray at its foot: three soft puffs across the fall
      for (let j = 0; j < 3; j++) put(Geo.smooth(Geo.blob(R * (j === 1 ? 0.16 : 0.12), 1, 0.08, seed * 5 + j)), (x, y, z, nx, ny) => Geo.mixHex(0xdde6ff, 0xffffff, U.clamp(0.5 + ny * 0.5, 0, 1)), R * 1.28, -R * (j === 1 ? 1.8 : 1.86), (j - 1) * R * 0.24);
    } else if (kind === 'glowcap') {
      const caps = [0xff7ab8, 0x7ff3ff, 0xffd45c, 0xb98bff];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + rnd(), dd = i ? R * (0.38 + rnd() * 0.3) : 0, s = i ? R * (0.18 + rnd() * 0.1) : R * 0.36;
        const m = Geo.mushroomParts(caps[i], null, seed + i, true);
        put(m.solid.clone(), null, Math.cos(a) * dd, 0.3, Math.sin(a) * dd, rnd() * TAU, s);
      }
      for (let i = 0; i < 3; i++) { const a = rnd() * TAU, dd = R * (0.3 + rnd() * 0.55); put(Geo.glowSproutGeo ? Geo.glowSproutGeo(0x7ff3ff).clone() : P.sph(0.3, 6, 4), null, Math.cos(a) * dd, 0.3, Math.sin(a) * dd, 0, R * 0.09); }
    } else {
      for (let i = 0; i < 3; i++) {
        const a = rnd() * TAU, dd = i ? R * (0.4 + rnd() * 0.3) : R * 0.1, h = i ? R * (0.45 + rnd() * 0.3) : R * 1.05, rr = i ? R * 0.32 : R * 0.5;
        const pk = Geo.lathe([[rr, 0], [rr * 0.62, h * 0.45], [rr * 0.3, h * 0.82], [0, h]], 9);
        Geo.colorize(pk, (x, y) => (y > h * 0.55 ? 0xfafcff : y > h * 0.45 ? 0xdfe6ff : 0x8e88c8));
        put(pk, null, Math.cos(a) * dd, 0.2, Math.sin(a) * dd, rnd() * TAU);
      }
      // (review pass: three crystals and one pine — the isle is seen from every lawn; it cost 3.7k triangles)
      for (let i = 0; i < 3; i++) { const a = rnd() * TAU, dd = R * (0.3 + rnd() * 0.5); put(Geo.crystalGeo(3 + i, [0x9ff6ff, 0xc9b8ff, 0xffffff][i]).clone(), null, Math.cos(a) * dd, 0.3, Math.sin(a) * dd, rnd() * TAU, R * 0.13); }
      { const a = rnd() * TAU, dd = R * (0.55 + rnd() * 0.3); put(Geo.treeGeo('pine', 7, { snow: true, lite: true }).clone(), null, Math.cos(a) * dd, 0.3, Math.sin(a) * dd, 0, R * 0.12); }
    }
    const g = Geo.merge(parts);
    return new THREE.Mesh(g, G.M.vc({ rimStr: 0.4 }));
  }
  // Sandy islet with a grass cap, palms and a rock or two (world-space parts pushed into parts[]).
  function isleParts(parts, x, z, R, seed, palms) {
    const Geo = G.Geo, rnd = G.rng(seed);
    const g = Geo.lathe([[R * 1.12, -1.6], [R, -0.35], [R * 0.86, 0.15], [R * 0.55, 0.62], [0, 0.85]], 14, (th, y, ri) => 1 + (ri > 0 && ri < 4 ? 0.12 * Math.sin(th * 3 + seed) + 0.06 * Math.sin(th * 7 + seed * 2) : 0));
    Geo.colorize(g, (px, py) => (py > 0.4 ? Geo.mixHex(0x6ccb5f, 0x98d866, U.clamp(py - 0.4, 0, 1)) : py > 0.22 ? 0xd8e08a : py > -0.5 ? 0xf7e3b0 : 0xe0bf86));
    Geo.xf(g, x, WATER_Y, z, 0, rnd() * TAU, 0);
    parts.push(g);
    for (let i = 0; i < palms; i++) { const a = rnd() * TAU, d = R * 0.35 * rnd(), s = 0.8 + rnd() * 0.45, p = islePalmGeo().clone(); Geo.xf(p, x + Math.cos(a) * d, WATER_Y + 0.6, z + Math.sin(a) * d, 0, rnd() * TAU, 0, s, s, s); parts.push(p); }
    const rk = Geo.rockGeo(1.1, seed % 7 + 3, 'coral', 1).clone(); Geo.xf(rk, x + R * 0.8, WATER_Y - 0.2, z - R * 0.3, 0, rnd() * TAU, 0, 1 + rnd(), 1 + rnd(), 1 + rnd()); parts.push(rk);
  }
  // Bunting: catenary strings of triangle flags, segs [{a: V3, b: V3, sag, lit}] -> one merged geometry. Flags carry
  // aFlex (0 on the string, 1 at the tip) + aFlexN (flag-plane normal) for the waving flag material (G.Geo.flagMat): all
  // the strings flutter in one draw call. lights (optional array) collects bulb positions along the `lit` strings.
  function buntingSegGeometry(segs, lights) {
    const pos = [], col = [], flex = [], fn = [], cols = [0xff6b8b, 0xffd23f, 0x3fe0b8, 0x33b5ff, 0x8f6bff, 0xffffff];
    const c = new THREE.Color();
    let ci = 0;
    for (const sg of segs) {
      const A = sg.a, B = sg.b, sag = sg.sag;
      const L = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(4, Math.floor(L / 0.85));
      const nx = -(B.z - A.z) / (L || 1), nz = (B.x - A.x) / (L || 1);
      const at = (t, o) => o.set(U.lerp(A.x, B.x, t), U.lerp(A.y, B.y, t) - Math.sin(t * PI) * sag, U.lerp(A.z, B.z, t));
      const p0 = new V3(), p1 = new V3(), pm = new V3();
      for (let k = 0; k < n; k++) {
        const t0 = (k + 0.15) / n, t1 = (k + 0.85) / n;
        at(t0, p0); at(t1, p1); at((t0 + t1) / 2, pm); pm.y -= 0.5;
        pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, pm.x, pm.y, pm.z);
        c.setHex(cols[ci++ % cols.length]);
        for (let q = 0; q < 3; q++) { col.push(c.r, c.g, c.b); fn.push(nx, 0, nz); }
        flex.push(0.08, 0.08, 1);
        if (lights && sg.lit && k % 3 === 1) { at(k / n, pm); lights.push(pm.x, pm.y - 0.06, pm.z); }
      }
      // (the string: one strip per two flags)
      for (let k = 0; k < n; k += 2) {
        at(k / n, p0); at(Math.min(n, k + 2) / n, p1);
        pos.push(p0.x, p0.y + 0.03, p0.z, p1.x, p1.y + 0.03, p1.z, p1.x, p1.y - 0.02, p1.z, p0.x, p0.y + 0.03, p0.z, p1.x, p1.y - 0.02, p1.z, p0.x, p0.y - 0.02, p0.z);
        c.setHex(0x1f2a5a);
        for (let q = 0; q < 6; q++) { col.push(c.r, c.g, c.b); fn.push(nx, 0, nz); flex.push(0.08); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aFlex', new THREE.Float32BufferAttribute(flex, 1));
    g.setAttribute('aFlexN', new THREE.Float32BufferAttribute(fn, 3));
    g.computeVertexNormals();
    return g;
  }
  // Festoon bulbs (unlit pastel beads; they read as lights at dusk) at the given positions: one octahedron each.
  function bulbGeometry(pts) {
    const cols = [0xfff2b0, 0xffc8e0, 0xc8f6ff, 0xfff2b0, 0xd8ffc8], parts = [];
    for (let i = 0; i < pts.length; i += 3) { const g = new THREE.OctahedronGeometry(0.085, 0); g.deleteAttribute('uv'); g.translate(pts[i], pts[i + 1], pts[i + 2]); G.Geo.colorize(g, cols[(i / 3) % cols.length]); parts.push(g); }
    return parts.length ? G.Geo.merge(parts) : null;
  }

  // ------------------------------------------------------------------ the town builder
  // opts: {title} — title mode skips gameplay hooks. Returns a town object with update(dt, t).
  function buildTown(world, opts) {
    opts = opts || {};
    const Geo = G.Geo;
    const q = G.R.q();
    const town = { world, buildings: [], npcs: [], critters: [], pylons: [], floors: [], anim: [], labels: [], detail: [], detailR2: Math.pow(DETAIL_R[G.R.qualityName()] || 44, 2), pier: null, boats: [], gulls: null };
    // terrain + plaza + sea
    const terr = G.Terrain.build({ heightFn: visH, colorFn: groundColor, minX: -84, maxX: 84, minZ: -84, maxZ: 84, res: 2.4, chunks: 3 });
    terr.name = 'terrain'; world.add(terr);
    const plazaGeo = plazaGeometry();
    const plaza = new THREE.Mesh(plazaGeo, G.Terrain.terrainMat({ rimStr: 0.05, band: 0.2, detail: [0.07, 0.05, 0.25] }));
    plaza.name = 'plaza'; world.add(plaza);
    const aoT = [], aoP = []; // ground occlusion spots: terrain / plaza (baked once the town is placed)
    // sea: depth-aware (transparent shallows, foam lip + rolling foam bands along the beach)
    // (core: a 6 m grid around the island and no sea cells under dry land — see Terrain.seaGeo)
    const sea = G.Terrain.water({ size: 760, y: WATER_Y, segments: 48, shallow: 0x7fe8e0, deep: 0x1489b8, opacity: 0.9, depth: { heightFn: groundH, minX: -84, maxX: 84, minZ: -84, maxZ: 84, size: 256 },
      core: { inner: 72, step: 6, land: (x, z) => groundH(x, z) > WATER_Y + 0.5 } });
    sea.name = 'sea'; world.add(sea);

    // fountain + soda water + jet
    const fp = Geo.place(world, Geo.plazaFountain(5.0), 0, 0, 0, 0);
    town.fountain = fp;
    const basin = G.Terrain.water({ size: 10, y: 0.57, segments: 8, shallow: 0x9ff6f0, deep: 0x2cc3d6, opacity: 0.8 });
    basin.geometry.dispose(); basin.geometry = new THREE.CircleGeometry(4.5, 40).rotateX(-PI / 2);
    world.add(basin);
    // ripple rings spreading from where the jet lands, fading before the rim (one transparent disc)
    {
      const ru = { uTime: { value: 0 } };
      const rip = new THREE.Mesh(new THREE.CircleGeometry(4.4, 40).rotateX(-PI / 2), new THREE.ShaderMaterial({
        uniforms: ru, transparent: true, depthWrite: false, fog: false,
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uTime; varying vec2 vP; void main(){ float d = length(vP); float a = atan(vP.y, vP.x);'
          + ' float w = fract(d * 0.62 - uTime * 0.42 + sin(a * 3.0 + uTime) * 0.04);'
          + ' float ring = smoothstep(0.0, 0.07, w) * (1.0 - smoothstep(0.07, 0.2, w));'
          + ' float k = smoothstep(0.7, 1.6, d) * (1.0 - smoothstep(3.3, 4.3, d));'
          + ' gl_FragColor = vec4(vec3(0.95, 1.0, 1.0), ring * k * 0.42); }',
      }));
      rip.position.y = 0.6; rip.renderOrder = 3; rip.name = 'ripples';
      rip.onBeforeRender = () => { ru.uTime.value = G.time.elapsed * (G.Save.set.reducedMotion ? 0.5 : 1); };
      world.add(rip);
    }
    const jetMat = new THREE.MeshBasicMaterial({ color: 0xe8fdff, transparent: true, opacity: 0.5, depthWrite: false });
    // (the jet reaches up into the Marmalune's hollow: it holds the moon up)
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 4.8, 12, 1, true), jetMat);
    jet.position.y = 6.4; jet.renderOrder = 3; world.add(jet);
    const jetCap = G.R.glowSprite(0xc8f6ff, 2.2, 0.55); jetCap.position.y = 8.9; world.add(jetCap);
    let fizzAcc = 0, bubAcc = 0;
    const _p = new V3(), _v = new V3();
    town.anim.push((dt, t) => {
      jet.scale.set(1 + Math.sin(t * 9) * 0.08, 1 + Math.sin(t * 3.1) * 0.06, 1 + Math.cos(t * 8) * 0.08);
      jetCap.scale.setScalar(2.0 + Math.sin(t * 5) * 0.25);
      const fx = world.fx, pq = q.particles;
      fizzAcc += dt * 46 * pq; bubAcc += dt * 26 * pq;
      while (fizzAcc >= 1) {
        fizzAcc--;
        const a = Math.random() * TAU, hs = U.rand(0.25, 1.7);
        fx.spawn(_p.set(Math.cos(a) * 0.15, 4.3, Math.sin(a) * 0.15), _v.set(Math.cos(a) * hs, U.rand(7.8, 9.6), Math.sin(a) * hs), Math.random() < 0.7 ? 0xe6fcff : 0x9ff6ff, U.rand(0.18, 0.34), 2.1, { normal: true, grav: 9, drag: 0.15, alpha: 0.85 });
      }
      while (bubAcc >= 1) {
        bubAcc--;
        const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * 4.2;
        fx.spawn(_p.set(Math.cos(a) * rr, 0.6, Math.sin(a) * rr), _v.set(0, U.rand(0.5, 1.3), 0), 0xffffff, U.rand(0.07, 0.15), U.rand(0.5, 1.2), { grav: -0.6, drag: 0.4, alpha: 0.9 });
      }
    });
    // the Marmalune — the town's landmark: a smiling marmalade moon held up by the soda jet (it runs through the
    // hollow), with a ring of toy planets orbiting below it. Big and high enough to hang clear above the Mission Board
    // marker and the skyline from the spawn; it turns its smiling face toward the viewer with a slow sway rather than
    // spinning, so it never shows its thin edge (both faces carry the face; it takes whichever is nearer)
    {
      const MS = 1.45, MY = 10.0, OY = 6.5;
      const mm = G.M.vc({ spec: 0.75, rimStr: 0.5 });
      const moon = new THREE.Mesh(moonGeometry(), mm); moon.name = 'moon'; moon.scale.setScalar(MS); moon.position.y = MY; world.add(moon);
      const orbit = q.props >= 0.7 ? new THREE.Mesh(orbitGeometry(), mm) : null;
      if (orbit) { orbit.name = 'orbit'; orbit.scale.setScalar(1.3); orbit.position.y = OY; world.add(orbit); town.detail.push({ mesh: orbit, x: 0, z: 0, r2: 34 * 34 }); }   // (the lawns past the ring: a few pixels)
      town.moon = moon;
      moon.rotation.y = 0;
      town.anim.push((dt, t) => {
        const rm = G.Save.set.reducedMotion ? 0.35 : 1, cp = G.R.camera.position;
        let face = Math.atan2(cp.x, cp.z) + Math.sin(t * 0.23) * 0.42 * rm;
        if (Math.abs(U.wrapAngle(face - moon.rotation.y)) > PI / 2) face += PI;
        moon.rotation.y = U.angleDamp(moon.rotation.y, face, 0.7, dt);
        moon.rotation.z = Math.sin(t * 0.5) * 0.05 * rm;
        moon.position.y = MY + Math.sin(t * 0.8) * 0.2 * rm;
        if (orbit) { orbit.rotation.y -= dt * 0.28 * rm; orbit.position.y = OY + Math.sin(t * 0.6 + 1) * 0.12 * rm; }
      });
    }

    // buildings around the ring, facing the fountain
    const bakeG = new THREE.Group();
    const lampPts = [], haloPts = [], doorSect = [];
    const flags = G.Geo.flagBatch ? G.Geo.flagBatch() : null;
    for (const b of BUILDINGS) {
      // (below Ultra: rounded parts a notch coarser — the kit's lod — which pays for the festival dressing within the
      // budget)
      const bl = G.R.qualityName() === 'ultra' ? 0.6 : 0.45;
      const prop = Geo.building(b.kind, bl !== 0.6 ? { lod: bl } : {});
      const half = prop.anchors.door ? prop.anchors.door.z - 0.6 : 5.5;
      const R = RING + half, a = b.ang * DEG, ry = -a;
      const x = Math.sin(a) * R, z = -Math.cos(a) * R;
      const placed = addProp(world, prop, x, 0, z, ry, town);
      const fl = (prop.colliders || []).find(c => c.type === 'box' && c.cy + c.sy / 2 <= FY + 0.02 && c.sx > 3);
      const e = { def: b, prop, placed, x, z, ry, R, half, width: fl ? fl.sx - 0.8 : 12, mesh: placed.mesh, anchors: placed.anchors, lock: null };
      e.door = placed.anchors.door ? placed.anchors.door.clone() : new V3(Math.sin(a) * RING, 0, -Math.cos(a) * RING);
      e.door.y = 0;
      e.dir = new V3(-Math.sin(a), 0, Math.cos(a)); // outward from the door toward the fountain
      e.useAt = placed.anchors.use ? placed.anchors.use.clone() : e.door.clone();
      // translated sign on the header
      const sm = prop.meta && prop.meta.sign;
      if (sm && prop.anchors.sign) {
        e.signMeta = sm;
        const lab = makeLabel(G.t(b.nameKey), sm, b.color);
        lab.position.copy(prop.anchors.sign); lab.position.z += 0.012;
        e.mesh.add(lab); e.label = lab; town.labels.push(e);
      }
      // facility badge above the entrance: a big round medallion in the facility colour with its emblem (the
      // phone-readable "what is this place" from across the plaza); it turns to face the viewer and sways a little
      const em = Geo.badgeGeo ? new THREE.Mesh(Geo.badgeGeo(b.emblem, b.color), G.M.vc({ rimStr: 0.5, spec: 0.55 })) : new THREE.Mesh(Geo.emblem(b.emblem), G.M.vc({ rimStr: 0.55, spec: 0.5 }));
      const top = b.kind === 'royale' || b.kind === 'guild' ? 10.4 : b.kind === 'hangar' ? 9.9 : 9.4;
      em.position.set(e.door.x - e.dir.x * 1.2, top, e.door.z - e.dir.z * 1.2);
      em.scale.setScalar(Geo.badgeGeo ? 2.5 : 2.0);
      em.rotation.y = ry;
      world.add(em);
      e.pylon = { mesh: em, base: top, ph: b.ang * 0.1, face: !!Geo.badgeGeo, size: Geo.badgeGeo ? 3.2 : 2 };
      town.pylons.push(e.pylon);
      haloPts.push(em.position.x, em.position.y, em.position.z);
      // NPC behind the counter
      if (b.npc && placed.anchors.npc) {
        const n = makeNPC(b.npc);
        n.group.position.copy(placed.anchors.npc); n.group.position.y = FY;
        if (b.npc === 'ticktock' && placed.anchors.counter) n.group.position.copy(placed.anchors.counter); // perched on the counter
        n.group.rotation.y = ry;
        // short shopkeepers stand on a little stool so they peek over their counter
        // chibi shopkeepers: scale up a little and stand on a stool so they read well over the counter
        let stool = null, top = 2.0;
        if (b.npc !== 'ticktock') {
          const bb = new THREE.Box3().setFromObject(n.group), h = bb.max.y - bb.min.y;
          if (h > 0.2) {
            const k = U.clamp(1.7 / h, 1, 1.45); n.group.scale.setScalar(k);
            const hs = h * k, sh = U.clamp(2.0 - hs, 0, 0.75);
            top = hs + sh;
            if (sh > 0.12) {
              stool = new THREE.Mesh(stoolGeometry(), G.M.vc({ rimStr: 0.2 }));
              stool.scale.set(1, sh, 1); stool.position.copy(n.group.position);
              world.add(stool);
              n.group.position.y += sh;
            } else top = hs;
          }
        } else top = 1.0;
        world.add(n.group);
        town.npcs.push({ id: b.npc, b: b.id, n, stool, base: ry, yaw: ry, greeted: false, pos: n.group.position, idleT: 3 + Math.random() * 8 });
        e.npc = n; e.npcTop = (stool ? FY : n.group.position.y) + top;
      }
      // a star-skiff parked on the hangar pad
      if (b.kind === 'hangar' && placed.anchors.ship && G.Geo.ship) {
        const sk = G.safe('hangar ship', () => G.Geo.ship('arrow', { main: 0xff6b8b, accent: 0xffd23f, glow: 0x7ff3ff }));
        if (sk && sk.group) {
          sk.group.position.copy(placed.anchors.ship); sk.group.position.y += 0.9;
          sk.group.rotation.y = ry + 0.35; sk.group.scale.setScalar(1.25);
          world.add(sk.group);
          town.anim.push((dt, t) => { sk.group.position.y = placed.anchors.ship.y + 0.9 + Math.sin(t * 1.3) * 0.08; if (sk.update) G.safe('ship', () => sk.update(t, dt)); });
        }
      }
      town.buildings.push(e);
      aoT.push({ x, z, r: half * 1.55 + 2, k: 0.3 });
      aoP.push({ x: e.door.x, z: e.door.z, r: 3.6, k: 0.16 });
      // purpose props at the door (Workshop gear + anvil, Pop Shop goods cart, Café tables, Hangar skiff stand...)
      // (Medium+: baked per quarter of the ring — N / E / S / W, 2-3 facilities each — and hidden beyond DETAIL_R + 4 m of
      // the camera, town.detail; Low keeps them in the one plaza bake: fewer draw calls)
      if (Geo.doorProps) {
        const dp = Geo.doorProps(b.kind, b.color), qi = b.ang >= 324 || b.ang <= 36 ? 0 : b.ang <= 144 ? 1 : b.ang <= 216 ? 2 : 3;
        const D = q.props < 0.7 ? null : doorSect[qi] || (doorSect[qi] = { g: new THREE.Group(), x: 0, z: 0, n: 0 });
        addProp(world, dp, e.door.x, 0, e.door.z, ry, null, D ? D.g : bakeG);
        if (D) { D.x += e.door.x; D.z += e.door.z; D.n++; }
        const sx = Math.cos(a), sz = Math.sin(a);
        for (const sd of [-1, 1]) aoP.push({ x: e.door.x + sx * sd * 5 + e.dir.x * 1.8, z: e.door.z + sz * sd * 5 + e.dir.z * 1.8, r: 2.2, k: 0.22 });
      }
      // banners flanking the path entrance + lamp between this slot and the next
      const side = new V3(Math.cos(a), 0, Math.sin(a));
      {
        const sgn = -1;
        const bx = Math.sin(a) * (RING - 2.6) + side.x * sgn * 3.1, bz = -Math.cos(a) * (RING - 2.6) + side.z * sgn * 3.1;
        Geo.place(null, Geo.banner(b.color, b.emblem, flags ? { cloth: false } : undefined), bx, 0, bz, ry, bakeG);
        if (flags) flags.banner(b.color, b.emblem, bx, 0, bz, ry);
        world.phys.addCyl(bx, bz, 0.2, 0, 4.2);
        aoP.push({ x: bx, z: bz, r: 0.9, k: 0.3 });
      }
      // lamp between this slot and the next; its pole carries on up as a flag mast so the bunting ring hangs
      // above the facility signs instead of across them
      const la = a + 18 * DEG, lx = Math.sin(la) * (RING - 1.2), lz = -Math.cos(la) * (RING - 1.2);
      Geo.place(null, Geo.lampPost({ mast: MAST, pennant: b.color }), lx, 0, lz, -la, bakeG);
      world.phys.addCyl(lx, lz, 0.3, 0, 4.2);
      aoP.push({ x: lx, z: lz, r: 1.0, k: 0.32 });
      lampPts.push(new V3(lx, MAST - 0.25, lz));
      haloPts.push(lx, 3.72, lz);
    }
    town.byId = {};
    for (const e of town.buildings) town.byId[e.def.id] = e;
    for (const D of doorSect) {
      if (!D) continue;
      const dm = Geo.bake(D.g); dm.name = 'doorProps'; world.add(dm);
      town.detail.push({ mesh: dm, x: D.x / D.n, z: D.z / D.n, r2: Math.pow(Math.sqrt(town.detailR2) + 4, 2) });
    }

    // Mission Board kiosk at the fountain (south-west side, readable from the spawn)
    {
      const a = KIOSK.ang * DEG, kr = 7.4, kx = Math.sin(a) * kr, kz = -Math.cos(a) * kr, ry = PI - a;
      const sign = Geo.sign(G.t('hub.b.fountain'), { w: 3.6, h: 1.0, postH: 1.3, frame: 0x1f2a5a, border: '#ffd23f' });
      const placed = addProp(world, sign, kx, 0, kz, ry, null);
      town.kioskSign = { prop: sign, mesh: placed.mesh };
      const em = new THREE.Mesh(Geo.emblem('star'), G.M.vc({ rimStr: 0.55, spec: 0.5 }));
      em.position.set(kx, 4.4, kz); em.scale.setScalar(1.3); world.add(em);
      town.pylons.push({ mesh: em, base: 4.4, ph: 2 });
      haloPts.push(kx, 4.4, kz);
      const out = new V3(Math.sin(a), 0, -Math.cos(a));
      town.kiosk = { def: KIOSK, door: new V3(kx + out.x * 1.6, 0, kz + out.z * 1.6), dir: out, x: kx, z: kz, signC: new V3(kx, 1.8, kz) };
    }

    // plaza dressing: benches, planters, inner lamps (baked into one mesh)
    for (let i = 0; i < 10; i++) {
      // keep the Mission Board kiosk's front clear (players spawn there when coming back from a mission)
      if (Math.abs(U.wrapAngle((i * 36 + 18 - KIOSK.ang) * DEG)) < 12 * DEG) continue;
      const a = (i * 36 + 18) * DEG;
      const r = 12.2, x = Math.sin(a) * r, z = -Math.cos(a) * r;
      if (i % 2 === 0) {
        const bm = new THREE.Mesh(benchGeometry(i % 4 ? 0xd99a5b : 0xff8a4c), G.M.vc()); bm.position.set(x, 0, z); bm.rotation.y = -a + PI; bakeG.add(bm);
        world.phys.addCyl(x, z, 0.75, 0, 0.9); aoP.push({ x, z, r: 1.7, k: 0.3 });
      }
      else {
        const pot = Geo.lathe([[0.95, 0], [1.05, 0.15], [1.0, 0.55], [1.12, 0.62], [1.05, 0.7], [0, 0.66]], 18);
        Geo.colorize(pot, (px, py) => (py > 0.6 ? new THREE.Color(0xfff1dc) : new THREE.Color(0xff9a8a)));
        const pm = new THREE.Mesh(pot, G.M.vc()); pm.position.set(x, 0, z); bakeG.add(pm);
        const bu = Geo.bush(0.8, 0x5cc85a, i + 4, [0xff7a93, 0xffd45c, 0xb983ff][i % 3]); Geo.place(null, bu, x, 0.6, z, i * 0.7, bakeG);
        world.phys.addCyl(x, z, 1.1, 0, 0.7);
        aoP.push({ x, z, r: 1.9, k: 0.34 });
      }
    }
    // the four inner lamps carry masts too: the festival bunting runs from them out to the ring masts (a starburst
    // canopy over the plaza) and around the fountain
    const innerPts = [];
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 + 45) * DEG, x = Math.sin(a) * 9.3, z = -Math.cos(a) * 9.3;
      Geo.place(null, Geo.lampPost({ mast: 6.6, pennant: [0xff6b8b, 0x3fe0b8, 0xffd23f, 0x8f6bff][i] }), x, 0, z, -a, bakeG); world.phys.addCyl(x, z, 0.3, 0, 4.2);
      innerPts.push(new V3(x, 6.6 - 0.25, z));
      haloPts.push(x, 3.72, z);
      aoP.push({ x, z, r: 1.0, k: 0.32 });
    }
    aoP.push({ x: 0, z: 0, r: 7.2, k: 0.22 }); // fountain rim
    // welcome sign by the spawn
    {
      const ws = Geo.sign(G.t('hub.welcome'), { w: 4.0, h: 0.95, postH: 1.4 });
      const pl = addProp(world, ws, -6.8, 0, 15.2, 0.62, null);
      town.welcomeSign = { prop: ws, mesh: pl.mesh };
    }
    // Ranger Locker: a free-standing wardrobe with a round mirror beside the Gallery path (open from the start:
    // rangers and looks are cosmetic). Cabinet baked with the plaza props; sign + bobbing star = 2 draw calls.
    {
      const a = LOCKER.ang * DEG, r = LOCKER.r, x = Math.sin(a) * r, z = -Math.cos(a) * r, ry = -a + LOCKER.turn;
      const cab = new THREE.Mesh(lockerGeometry(), G.M.vc());
      cab.position.set(x, 0, z); cab.rotation.y = ry; bakeG.add(cab);
      world.phys.addCyl(x, z, 1.0, 0, 2.7);
      aoP.push({ x, z, r: 1.7, k: 0.3 });
      const fx = Math.sin(ry), fz = Math.cos(ry);   // the cabinet's front (local +Z)
      const signW = 2.0, sign = Geo.textPlane(G.t('wr.locker'), signW, 0.46, { bg: '#fff6e6', fg: '#1e1a4d', border: '#b983ff', bw: 8, radius: 26 });
      sign.position.set(x + fx * 0.47, 2.72, z + fz * 0.47); sign.rotation.y = ry; world.add(sign);
      const em = new THREE.Mesh(Geo.emblem('star'), G.M.vc({ rimStr: 0.55, spec: 0.5 }));
      em.position.set(x, 3.45, z); em.scale.setScalar(0.85); world.add(em);
      town.pylons.push({ mesh: em, base: 3.45, ph: 4 });
      haloPts.push(x, 3.45, z);
      town.locker = { x, z, ry, dir: new V3(fx, 0, fz), door: new V3(x + fx * 1.5, 0, z + fz * 1.5), sign, signW, signC: sign.position.clone() };
    }
    // bunting: the ring between the outer lamp masts, a starburst from every ring mast in to the nearest inner mast and
    // a loop around the fountain — one waving mesh; festoon bulbs along the inner strings (one unlit mesh, not on Low)
    if (lampPts.length > 2) {
      const segs = [];
      for (let i = 0; i < lampPts.length; i++) segs.push({ a: lampPts[i], b: lampPts[(i + 1) % lampPts.length], sag: 0.75 });
      const inner = [];
      if (innerPts.length === 4) {
        for (let i = 0; i < 4; i++) inner.push({ a: innerPts[i], b: innerPts[(i + 1) % 4], sag: 0.6 });
        for (const p of lampPts) {
          const am = (Math.atan2(p.x, -p.z) / DEG + 360) % 360;
          for (let i = 0; i < 4; i++) { const da = Math.abs(U.wrapAngle((am - (i * 90 + 45)) * DEG)) / DEG; if (da < 46) inner.push({ a: p, b: innerPts[i], sag: 0.85 }); }
        }
      }
      // the harbour pier: festoons from the two root masts out to the lamp at its end
      { const e = pierW(PIER.len - 0.4, PIER.w / 2 - 0.3), lampY = PIER.deck + 2.62;
        for (const sd of [-1, 1]) { const m = pierW(0.15, sd * (PIER.w / 2 + 0.2)); inner.push({ a: new V3(m[0], PIER_MAST - 0.2, m[1]), b: new V3(e[0], lampY, e[1]), sag: 0.7 }); } }
      for (const s of inner) s.lit = true;
      const bulbs = q.props >= 0.7 ? [] : null;
      const bm = new THREE.Mesh(buntingSegGeometry(segs.concat(inner), bulbs), G.Geo.flagMat ? G.Geo.flagMat() : G.M.vc({ side: THREE.DoubleSide, rimStr: 0.1 }));
      bm.name = 'bunting'; world.add(bm);
      if (bulbs) {
        // (review pass: two meshes — the plaza's bulbs, shown within 34 m of the fountain, and the pier's, within 32 m of its
        // middle — instead of one shown from 60 m: from the lawns past the ring they are sub-pixel beads, and those views
        // sit at the triangle budget)
        const plazaB = [], pierB = [];
        for (let i = 0; i < bulbs.length; i += 3) (Math.hypot(bulbs[i], bulbs[i + 2]) > 36 ? pierB : plazaB).push(bulbs[i], bulbs[i + 1], bulbs[i + 2]);
        const pm = pierW(PIER.len / 2, 0);
        for (const [pts, cx, cz, rr] of [[plazaB, 0, 0, 34], [pierB, pm[0], pm[1], 32]]) {
          const bg = bulbGeometry(pts);
          if (!bg) continue;
          const lm = new THREE.Mesh(bg, G.Geo.glowMat ? G.Geo.glowMat() : G.M.basic(0xffffff, { vertexColors: true })); lm.name = 'festoon'; world.add(lm);
          town.detail.push({ mesh: lm, x: cx, z: cz, r2: rr * rr });
        }
      }
    }
    // balloon bunches tied to the planters and the Mission Board sign (one merged mesh that bobs in the house
    // wind: the toon wind weight is the height above the mesh origin, so the strings stay put and the balloons sway)
    {
      const parts = [], cols = [0xff6b8b, 0xffd23f, 0x39c6e8, 0x8f6bff, 0x3fe0b8, 0xff8a4c], br = G.rng(23);
      const ties = [];
      for (const deg of [54, 126, 270, 342]) { const a = deg * DEG, r = 11.4; ties.push([Math.sin(a) * r, 0.75, -Math.cos(a) * r]); }
      // (beside the Mission Board the bunch is tied to a little weight on the floor: every tie sits low, where the
      // wind weight is small, so the strings stay put while the balloons bob)
      { const a = KIOSK.ang * DEG, kr = 7.4, tx = Math.cos(a), tz = Math.sin(a), wx = Math.sin(a) * kr + tx * 2.4, wz = -Math.cos(a) * kr + tz * 2.4;
        ties.push([wx, 0.32, wz]);
        const wt = new THREE.BoxGeometry(0.34, 0.3, 0.34); wt.deleteAttribute('uv'); wt.translate(wx, 0.15, wz); Geo.colorize(wt, 0xff6b8b); parts.push(wt); }
      // (the balloon seller's cart: a big bunch tied to its counter corner — CART_SLOTS)
      for (const deg in CART_SLOTS) {
        if (CARTS[CART_SLOTS[deg]].top !== 'star') continue;
        const a = deg * DEG, cx = Math.sin(a) * CART_R, cz = -Math.cos(a) * CART_R, ry = -a, lx = 1.32, lz = 0.6;
        ties.push([cx + lx * Math.cos(ry) + lz * Math.sin(ry), 1.25, cz - lx * Math.sin(ry) + lz * Math.cos(ry), 6]);
      }
      ties.forEach((t, bi) => {
        const nb = t[3] || 3;
        for (let i = 0; i < nb; i++) {
          const ang = (i / nb) * TAU + br() * 0.6, rr = nb > 3 ? 0.62 : 0.42, bx = t[0] + Math.cos(ang) * rr, bz = t[2] + Math.sin(ang) * rr, by = t[1] + (nb > 3 ? 1.5 : 2.3) + i * (nb > 3 ? 0.24 : 0.35) + br() * 0.3;
          const g = new THREE.SphereGeometry(0.42, 9, 6); g.deleteAttribute('uv'); g.scale(1, 1.18, 1); g.translate(bx, by, bz);
          const col = cols[(bi * 3 + i) % cols.length];
          Geo.colorize(g, (x, y, z, nx, ny) => Geo.mixHex ? new THREE.Color(Geo.mixHex(col, 0xffffff, Math.max(0, ny) * 0.25)) : new THREE.Color(col));
          parts.push(g);
          const knot = new THREE.ConeGeometry(0.07, 0.12, 6); knot.deleteAttribute('uv'); knot.rotateX(PI); knot.translate(bx, by - 0.53, bz); Geo.colorize(knot, col); parts.push(knot);
          const s0 = new V3(t[0], t[1], t[2]), s1 = new V3(bx, by - 0.58, bz), len = s0.distanceTo(s1);
          const st = new THREE.CylinderGeometry(0.012, 0.012, len, 3, 1, true); st.deleteAttribute('uv'); st.translate(0, len / 2, 0);
          st.applyMatrix4(new THREE.Matrix4().compose(s0, new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), s1.clone().sub(s0).normalize()), new V3(1, 1, 1)));
          Geo.colorize(st, 0xfff6ea); parts.push(st);
        }
      });
      const bal = new THREE.Mesh(Geo.merge(parts), G.M.vc({ wind: 0.6, spec: 0.6, rimStr: 0.4 }));
      bal.name = 'balloons'; world.add(bal);
    }
    // market carts and flower tubs on the plaza ring between the paths, facing the fountain: one mesh each, hidden beyond
    // DETAIL_R m of the viewer (town.detail; Low keeps the carts only)
    {
      const cmat = G.M.vc({ rimStr: 0.3 }), slots = [];
      for (const deg in CART_SLOTS) slots.push([+deg, CART_SLOTS[deg]]);
      if (q.props >= 0.7) for (const deg of TUB_SLOTS) slots.push([deg, -1]);
      const tubCols = [0xff9a8a, 0x7fd8e8, 0xffc85a, 0xb9a2ff, 0x8fe08a], tubFl = [0xff7a93, 0xffd45c, 0xffffff, 0xff9ad0, 0xb983ff];
      slots.forEach(([deg, ci], i) => {
        const cart = ci >= 0, a = deg * DEG, r = cart ? CART_R : TUB_R, x = Math.sin(a) * r, z = -Math.cos(a) * r;
        const d = kitData((k, P, Geo2) => { if (cart) cartKit(k, P, Geo2, CARTS[ci]); else tubKit(k, P, Geo2, 30 + i, tubCols[i % 5], tubFl[i % 5]); });
        const m = new THREE.Mesh(d.solid, cmat); m.position.set(x, 0, z); m.rotation.y = -a; m.name = cart ? 'cart' : 'tub';
        // (review pass: carts and tubs show within DETAIL_R - 6 m — from the lawns past the ring the far ones were
        // ~1.9k / 0.6k triangles each of a few pixels, in the views at the triangle budget)
        world.add(m); town.detail.push({ mesh: m, x, z, r2: Math.pow(Math.sqrt(town.detailR2) - 6, 2) });
        world.phys.addCyl(x, z, cart ? 1.35 : 1.0, 0, cart ? 2.6 : 0.8);
        aoP.push({ x, z, r: cart ? 2.3 : 1.6, k: 0.3 });
        if (cart) { const c = Math.cos(-a), s = Math.sin(-a), lx = -1.78, lz = 0.42; world.phys.addCyl(x + lx * c + lz * s, z - lx * s + lz * c, 0.42, 0, 1.0); }   // (its signboard)
      });
    }
    // the harbour off the south-south-east beach: a walkable pier (its deck is a floor of the heightfield; the update keeps
    // the player between its rails), a beach corner at its root, moored boats and bobbing buoys, a sloop sailing round
    // the island and gulls wheeling over the pier end (Medium+)
    {
      const a = PIER.ang * DEG, ox = Math.sin(a), oz = -Math.cos(a), sx = -Math.cos(a), sz = -Math.sin(a), ry = PI - a;
      const x0 = ox * PIER.r0, z0 = oz * PIER.r0, L = PIER.len;
      const W = (al, lat) => [x0 + ox * al + sx * lat, z0 + oz * al + sz * lat];
      const hg = new THREE.Group();
      Geo.place(null, Geo.jetty(L, PIER.deck), x0, 0, z0, ry, hg);
      const hmat = G.M.vc({ rimStr: 0.3 });
      // the root step and the two flag masts (navy poles, gold finials, a pennant each)
      { const sp = new THREE.Mesh(kitData((k, P) => {
        k.add(P.rbox(PIER.w, 0.5, 1.3, 0.05, 1), 0xc8884a, 0, PIER.deck * 0.5 - 0.25, -0.65);
        for (const sd of [-1, 1]) {
          const mx = sd * (PIER.w / 2 + 0.2);
          k.add(P.cyl(0.055, 0.075, PIER_MAST, 6), 0x1f2a5a, mx, PIER_MAST / 2, 0.15);
          k.add(P.sph(0.12, 8, 6), 0xffd23f, mx, PIER_MAST + 0.08, 0.15);
          k.add(P.cone(0.16, 0.7, 4), sd > 0 ? 0xff6b8b : 0x3fe0b8, mx + sd * 0.38, PIER_MAST - 0.32, 0.15, 0, 0, sd * PI / 2, 1, 1, 0.12);
        }
      }).solid, hmat); sp.position.set(x0, 0, z0); sp.rotation.y = ry; hg.add(sp); }
      // (the beach corner bakes on its own: small dressing, hidden from afar like the plaza carts)
      const bg = new THREE.Group();
      const addK = (build, al, lat, turn, y) => { const d = kitData(build), p = W(al, lat), m = new THREE.Mesh(d.solid, hmat); m.position.set(p[0], y != null ? y : groundH(p[0], p[1]), p[1]); m.rotation.y = ry + (turn || 0); bg.add(m); return p; };
      // beach corner: two striped parasols with towels, a sandcastle with bucket and spade, a life-ring post
      const umbrella = (cA, cB, towel) => (k, P, Geo2) => {
        k.add(P.cyl(0.04, 0.04, 2.3, 6), 0xfff6e6, 0, 1.15, 0);
        const cn = P.cone(1.25, 0.5, 10); cn.translate(0, 2.4, 0);
        Geo2.colorize(cn, (x, y, z) => (Math.floor(((Math.atan2(z, x) + PI) / TAU) * 10) % 2 ? cA : cB)); k.addRaw(cn);
        k.add(P.sph(0.08, 6, 4), cA, 0, 2.68, 0);
        const tw = P.box(0.95, 0.03, 1.8); tw.translate(0.55, 0.02, 0.9);
        Geo2.colorize(tw, (x, y, z) => (Math.floor(z / 0.3) % 2 ? towel : 0xfffaf2)); k.addRaw(tw);
        const bb = P.sph(0.2, 10, 8); bb.translate(-0.7, 0.2, 0.9);
        Geo2.colorize(bb, (x, y, z) => [0xff6b8b, 0xfffaf2, 0x3fb8ff, 0xffd23f][Math.floor(((Math.atan2(z - 0.9, x + 0.7) + PI) / TAU) * 4) % 4]); k.addRaw(bb);
      };
      addK(umbrella(0xff6b8b, 0xfffaf2, 0x3fe0b8), 2.6, 4.4, 0.3);
      addK(umbrella(0x3fb8ff, 0xfffaf2, 0xffd23f), 5.0, 6.6, -0.5);
      addK((k, P) => {
        k.add(P.cyl(0.75, 0.85, 0.45, 12), 0xf2cf8e, 0, 0.2, 0);
        for (let i = 0; i < 4; i++) { const q4 = (i / 4) * TAU + 0.4; k.add(P.cyl(0.17, 0.19, 0.55, 8), 0xf7dca0, Math.cos(q4) * 0.55, 0.65, Math.sin(q4) * 0.55); k.add(P.cone(0.2, 0.28, 8), 0xeec48a, Math.cos(q4) * 0.55, 1.06, Math.sin(q4) * 0.55); }
        k.add(P.cyl(0.24, 0.28, 0.95, 8), 0xf7dca0, 0, 0.85, 0); k.add(P.cone(0.28, 0.4, 8), 0xeec48a, 0, 1.52, 0);
        k.add(P.cyl(0.01, 0.01, 0.5, 3), 0xfff6e6, 0, 1.9, 0); k.add(P.box(0.24, 0.14, 0.01), 0xff6b8b, 0.12, 2.06, 0);
        k.add(P.cyl(0.16, 0.12, 0.26, 10), 0x3fe0b8, 1.0, 0.13, 0.3); k.add(P.tor(0.14, 0.015, 3, 10, PI), 0xfff6e6, 1.0, 0.3, 0.3);
        k.add(P.box(0.08, 0.5, 0.02), 0xffd23f, 1.25, 0.35, -0.1, 0, 0, 0.5);
      }, 3.0, 8.4, 0.6);
      addK((k, P, Geo2) => {
        k.add(P.cyl(0.06, 0.07, 1.5, 6), 0xfff6e6, 0, 0.75, 0);
        const ring = P.tor(0.34, 0.1, 6, 16); Geo2.colorize(ring, (x, y) => (Math.floor((Math.atan2(y, x) + PI) / (PI / 4)) % 2 ? 0xff5a6e : 0xfffaf2)); ring.translate(0, 1.15, 0.09); k.addRaw(ring);
      }, -0.4, 1.75, 0);
      const bar = Geo.barrel ? Geo.barrel(0x3fb8ff) : null;
      if (bar) { const p = W(0.6, -2.1); Geo.place(null, bar, p[0], groundH(p[0], p[1]), p[1], 0.4, bg); const p2 = W(1.3, -2.4); Geo.place(null, Geo.barrel(0xff8a4c), p2[0], groundH(p2[0], p2[1]), p2[1], 1.1, bg); }
      const hm = Geo.bake(hg); hm.name = 'harbour'; world.add(hm);
      // (review pass: the jetty kit's near-white post caps read as snow on a sunny pier — in the title's foreground too:
      // the baked copy's caps turn candy coral, like the life rings and the lighthouse stripes)
      if (hm.geometry && hm.geometry.attributes.color) {
        const c = hm.geometry.attributes.color, p = hm.geometry.attributes.position, ref = new THREE.Color(0xfff6ea), to = new THREE.Color(0xff8a8f);
        let n = 0;
        for (let i = 0; i < c.count; i++) {
          if (p.getY(i) > PIER.deck + 0.75 && Math.abs(c.getX(i) - ref.r) < 0.01 && Math.abs(c.getY(i) - ref.g) < 0.01 && Math.abs(c.getZ(i) - ref.b) < 0.01) { c.setXYZ(i, to.r, to.g, to.b); n++; }
        }
        if (n) c.needsUpdate = true;
      }
      // (review pass: hidden from beyond 72 m — the north lawns, where the ring of buildings hides the south shore anyway
      // and those views ran over the triangle budget)
      { const c = W(L / 2, 0); town.detail.push({ mesh: hm, x: c[0], z: c[1], r2: 72 * 72 }); }
      const farR2 = Math.pow(Math.sqrt(town.detailR2) + 16, 2);
      { const bm = Geo.bake(bg), c = W(3, 3); bm.name = 'beach'; world.add(bm); town.detail.push({ mesh: bm, x: c[0], z: c[1], r2: farR2 }); }
      for (const [al, lat] of [[2.6, 4.4], [5.0, 6.6], [0.15, PIER.w / 2 + 0.2], [0.15, -PIER.w / 2 - 0.2]]) { const p = W(al, lat); world.phys.addCyl(p[0], p[1], 0.12, -1, 2.4); }
      { const p = W(3.0, 8.4); world.phys.addCyl(p[0], p[1], 0.85, -1, 0.9); aoT.push({ x: p[0], z: p[1], r: 1.6, k: 0.22 }); }
      { const p = W(0.95, -2.25); world.phys.addCyl(p[0], p[1], 0.9, -1, 1.0); }
      // the deck: a floor of the heightfield (footsteps read it as wood); the rails keep the player on it (see update)
      const cx = x0 + ox * L / 2, cz = z0 + oz * L / 2, hw = PIER.w / 2 - 0.2;
      town.floors.push({ x: cx, z: cz, c: Math.cos(ry), s: Math.sin(ry), hx: hw, hz: L / 2, y: PIER.deck, rr: (PIER.w * PIER.w + L * L) / 4 + 1 });
      // (a low boardwalk step at the root: never more than a step up from the lawn)
      const st = W(-0.65, 0);
      town.floors.push({ x: st[0], z: st[1], c: Math.cos(ry), s: Math.sin(ry), hx: hw, hz: 0.65, y: PIER.deck * 0.5, rr: hw * hw + 1.5 });
      town.pier = { x0, z0, ox, oz, sx, sz, len: L, hw: PIER.w / 2 - 0.5 };
      // boats moored along the pier (they bob and roll; Euler YXZ = heading first), the sloop sailing round the island
      const bmat = G.M.vc({ spec: 0.45, rimStr: 0.35 });
      town.boats = [];
      const boat = (kind, al, lat, turn, s, sail) => {
        const m = new THREE.Mesh(boatGeometry(kind), bmat); m.rotation.order = 'YXZ';
        const p = W(al, lat); m.position.set(p[0], WATER_Y, p[1]); m.rotation.y = ry + turn; m.scale.setScalar(s || 1); m.name = 'boat';
        world.add(m); town.boats.push({ m, ph: town.boats.length * 1.9 + al * 0.3, ry: ry + turn, sail: !!sail, a0: Math.atan2(p[0], -p[1]) });
        if (!sail) town.detail.push({ mesh: m, x: p[0], z: p[1], r2: Math.pow(Math.sqrt(town.detailR2) + 20, 2) });   // (moored: hidden from afar)
      };
      boat('sail', 13.2, 3.0, 0, 1);
      boat('tug', 17.6, -3.1, PI, 1);
      if (q.props >= 0.7) boat('duck', 9.6, 2.7, 0.35, 1);
      boat('sail', 0, 0, 0, 1.5, true);
      // buoys round the bay (one instanced mesh)
      const bpos = q.props >= 0.7 ? [[24.5, 5.5], [26.5, -4.5], [15.5, 8.5], [20.5, -9], [10.5, -8.5], [28.5, 1.2], [7.5, 10.5]] : [[24.5, 5.5], [20.5, -9], [15.5, 8.5]];
      const buoys = new THREE.InstancedMesh(buoyGeometry(), bmat, bpos.length); buoys.name = 'buoys';
      const bq = new THREE.Quaternion(), be = new THREE.Euler(), bv = new V3(), bs = new V3(1, 1, 1), bmx = new THREE.Matrix4();
      const bxz = bpos.map(([al, lat]) => W(al, lat));
      const placeBuoys = t => {
        const rm = G.Save.set.reducedMotion ? 0.35 : 1;
        for (let i = 0; i < bxz.length; i++) {
          be.set(Math.sin(t * 1.3 + i * 2.1) * 0.12 * rm, i * 1.7, Math.sin(t * 1.1 + i) * 0.12 * rm); bq.setFromEuler(be);
          bmx.compose(bv.set(bxz[i][0], WATER_Y - 0.05 + Math.sin(t * 1.6 + i * 1.3) * 0.09 * rm, bxz[i][1]), bq, bs);
          buoys.setMatrixAt(i, bmx);
        }
        buoys.instanceMatrix.needsUpdate = true;
      };
      placeBuoys(0); buoys.computeBoundingSphere(); world.add(buoys);
      { let cx = 0, cz = 0; for (let i = 0; i < bxz.length; i++) { cx += bxz[i][0] / bxz.length; cz += bxz[i][1] / bxz.length; } town.detail.push({ mesh: buoys, x: cx, z: cz, r2: farR2 }); }
      town.anim.push((dt, t) => {
        const rm = G.Save.set.reducedMotion ? 0.35 : 1;
        for (let i = 0; i < town.boats.length; i++) {
          const b = town.boats[i], m = b.m;
          if (b.sail) { const th = b.a0 + t * 0.011; m.position.x = Math.sin(th) * 74; m.position.z = -Math.cos(th) * 74; m.rotation.y = PI / 2 - th; }
          m.position.y = WATER_Y + Math.sin(t * 1.25 + b.ph) * 0.07 * rm;
          m.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.05 * rm;
          m.rotation.x = Math.sin(t * 0.7 + b.ph * 1.3) * 0.03 * rm;
        }
        placeBuoys(t);
      });
      if (q.props >= 0.7) {
        const e = W(L - 2, 0);
        town.gulls = G.safe('hub gulls', () => G.Terrain.ambient(world, { heightFn: visH, seed: 13, birds: { count: 5, x: e[0], z: e[1], r: 12, y: 8.5, speed: 0.12 } })) || null;
      }
    }
    // palms, bushes and rocks behind and between the buildings; beach decor
    const rnd = G.rng(9);
    const palmPts = [], palmPts2 = [], bushPts = [], coralPts = [], rockPts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i * 36 + 18) * DEG;
      { const rr = 32 + rnd() * 3, jx = (rnd() - 0.5) * 2; const x = Math.sin(a) * rr + jx, z = -Math.cos(a) * rr + jx; (i % 2 ? palmPts : palmPts2).push({ x, y: groundH(x, z) - 0.1, z, s: 0.95 + rnd() * 0.45, ry: rnd() * TAU }); }
      for (let k = 0; k < 1; k++) { const x = Math.sin(a + (rnd() - 0.5) * 0.12) * (29.6 + rnd() * 2), z = -Math.cos(a + (rnd() - 0.5) * 0.12) * (29.6 + rnd() * 2); bushPts.push({ x, y: groundH(x, z) - 0.05, z, s: 0.8 + rnd() * 0.5, ry: rnd() * TAU }); }
    }
    // (nothing grows on the pier or the beach corner at its root)
    const nearPier = (x, z, m) => { const P = town.pier; if (!P) return false; const dx = x - P.x0, dz = z - P.z0, al = dx * P.ox + dz * P.oz, lat = dx * P.sx + dz * P.sz; return al > -m && al < P.len + m && Math.abs(lat) < PIER.w / 2 + m; };
    const nShore = Math.round(8 * q.props);
    for (let i = 0; i < nShore; i++) { const a = (i / nShore) * TAU + rnd() * 0.25, rr = 42.5 + rnd() * 2.6, x = Math.sin(a) * rr, z = -Math.cos(a) * rr, p = { x, y: groundH(x, z) - 0.1, z, s: 0.85 + rnd() * 0.5, ry: rnd() * TAU }; if (!nearPier(x, z, 7.5)) (i % 3 ? palmPts : palmPts2).push(p); }
    // (below Ultra: four coral heads instead of six — the shore ring is in view from every lawn)
    for (let i = 0; i < 8; i++) { const a = rnd() * TAU, rr = 46.5 + rnd() * 4, x = Math.sin(a) * rr, z = -Math.cos(a) * rr; if (i >= 6) continue; const p = { x, y: groundH(x, z), z, s: 0.9 + rnd() * 1.1, ry: rnd() * TAU, color: [0xff8a4c, 0xff7a93, 0xff5fa2, 0xffb37a, 0xb983ff, 0xffd45c][i % 6] }; if (!nearPier(x, z, 3) && (G.R.qualityName() === 'ultra' || i < 4)) coralPts.push(p); }
    for (let i = 0; i < 14; i++) { const a = rnd() * TAU, rr = 44 + rnd() * 6, x = Math.sin(a) * rr, z = -Math.cos(a) * rr, p = { x, y: groundH(x, z) - 0.2, z, s: 0.8 + rnd() * 1.4, ry: rnd() * TAU }; if (!nearPier(x, z, 4)) rockPts.push(p); }
    const instAdd = (geo, pts, mat) => { if (!pts.length || !geo) return; const m = Geo.instancedAt(geo, mat || G.M.vc(), pts); world.add(m); return m; };
    const wind = k => (Geo.windMat ? Geo.windMat(k) : G.M.vc());
    instAdd(Geo.treeGeo('palm', 1, { lite: true }), palmPts, wind(0.3));
    instAdd(Geo.treeGeo('palm', 5, { palette: 'lime', lite: true }), palmPts2, wind(0.3));
    instAdd(Geo.bushGeo(51, 0x5cc85a, 0xff7a93), bushPts, wind(0.4));
    instAdd(Geo.coralGeo(0, 0xffffff, 3), coralPts.filter((p, i) => i % 2 === 0));
    instAdd(Geo.coralGeo(2, 0xffffff, 8), coralPts.filter((p, i) => i % 2 === 1));
    instAdd(Geo.rockGeo(1.2, 11, 'coral', 2), rockPts);
    for (const p of palmPts.concat(palmPts2)) { if (Math.hypot(p.x, p.z) < 45) world.phys.addCyl(p.x, p.z, 0.35 * p.s, p.y, p.y + 5); aoT.push({ x: p.x, z: p.z, r: 2.6 * p.s, k: 0.3 }); }
    for (const p of bushPts) aoT.push({ x: p.x, z: p.z, r: 1.5 * p.s, k: 0.3 });
    for (const p of rockPts) aoT.push({ x: p.x, z: p.z, r: 1.8 * p.s, k: 0.28 });

    // distant scenery: mesa islands, floating sky islands, horizon ring, clouds
    const farG = new THREE.Group();
    const frnd = G.rng(77);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4 + frnd() * 0.5, d = 130 + frnd() * 90;
      const m = Geo.mesa(10 + frnd() * 10, 18 + frnd() * 22, (frnd() * 1e4) | 0, { cap: 0x6ccb5f, seg: G.R.qualityName() === 'ultra' ? 14 : 11 });
      Geo.place(null, m, Math.sin(a) * d, -3, -Math.cos(a) * d, frnd() * TAU, farG);
    }
    // floating sky islands drift and bob on their own (one mesh each): a preview of the regions out there — Peach Mesas
    // (hoodoos and a waterfall), Glowcap Grotto (giant mushrooms), Frostfizz (snowy peaks and ice crystals)
    const isles = [];
    const SHOW = [['mesas', 175, 165, 34, 11, 5], ['glowcap', 38, 182, 50, 9, 6], ['frost', 131, 190, 37, 10, 7]];
    for (let i = 0; i < SHOW.length; i++) {
      const [kind, deg, d, y, R, seed] = SHOW[i], a = deg * DEG;
      const mesh = showIsle(kind, R, seed);
      // (the Mesas waterfall — on the isle's local +X rim — turned toward the island, a little toward the harbour)
      mesh.position.set(Math.sin(a) * d, y, -Math.cos(a) * d); mesh.rotation.y = kind === 'mesas' ? -a - PI / 2 + 0.35 : frnd() * TAU; mesh.name = 'skyIsle';
      world.add(mesh); isles.push({ mesh, y, ph: i * 2.1 + frnd() });
    }
    town.anim.push((dt, t) => { const k = G.Save.set.reducedMotion ? 0.35 : 1; for (let i = 0; i < isles.length; i++) { const s = isles[i]; s.mesh.position.y = s.y + Math.sin(t * 0.32 + s.ph) * 1.4 * k; s.mesh.rotation.z = Math.sin(t * 0.21 + s.ph) * 0.025 * k; s.mesh.rotation.y += dt * 0.004 * k; } });
    // sandy islets out on the bay (a mid-distance layer between the beach and the horizon), gathered per third of the
    // compass and merged into one mesh (below)
    {
      const DEF = [[22, 104, 9, 2], [74, 118, 7, 1], [126, 92, 6, 1], [204, 110, 10, 2], [248, 96, 6, 1], [300, 120, 8, 1], [338, 99, 6, 1]];
      const sect = [[], [], []];
      DEF.forEach(([deg, d, R, palms], i) => {
        if (q.props < 0.7 && i % 2) return;
        const a = deg * DEG; isleParts(sect[Math.floor(deg / 120) % 3], Math.sin(a) * d, -Math.cos(a) * d, R, 91 + i * 7, palms);
      });
      // the rocket lighthouse on its own islet (every tier: the title's landmark over the bay) with a soft lamp glow
      {
        const L = LIGHTHOUSE, s = sect[Math.floor(((Math.atan2(L.x, -L.z) / DEG + 360) % 360) / 120) % 3];
        isleParts(s, L.x, L.z, 7.5, 133, 0);
        rocketLighthouseParts(s, L.x, WATER_Y + 0.62, L.z, L.ry);
        const pl = islePalmGeo().clone(); Geo.xf(pl, L.x - 4.2, WATER_Y + 0.5, L.z + 1.6, 0, 1.1, 0, 1.1, 1.1, 1.1); s.push(pl);
        const lamp = G.R.glowSprite(0xfff2b0, 4.2, 0.55); lamp.position.set(L.x, WATER_Y + 0.62 + L.lamp, L.z); lamp.name = 'lighthouseLamp'; world.add(lamp);
        // (the glow material is the shared cached one: the lamp breathes by its size, bigger at night)
        town.anim.push((dt, t) => { const k = G.Save.set.reducedMotion ? 0 : 1; lamp.scale.setScalar(4.2 + Math.sin(t * 1.3) * 0.7 * k + (town.night || 0) * 3.0); });
      }
      const imat = G.M.vc({ rimStr: 0.25 });
      // (one mesh, one draw call: from the lawns inside the island all three sectors were in view at once — three calls
      // in the views that sit at the budget; the outward views that now draw all the islets are the cheapest in town)
      sect[0] = sect[0].concat(sect[1], sect[2]); sect[1] = sect[2] = [];
      for (const parts of sect) if (parts.length) { const m = new THREE.Mesh(Geo.merge(parts), imat); m.name = 'islets'; world.add(m); }
    }
    // two hot-air balloons drifting round the island (one mesh that turns slowly; Medium+)
    if (q.props >= 0.7) {
      const parts = [];
      // (at the start one hangs over the bay seen from the harbour and the title, the other over the north-west)
      hotAirParts(parts, Math.sin(160 * DEG) * 92, 19, -Math.cos(160 * DEG) * 92, 2.0, 0xff6b8b, 0xffd23f);
      hotAirParts(parts, Math.sin(300 * DEG) * 118, 50, -Math.cos(300 * DEG) * 118, 2.4, 0x3fb8ff, 0xfffaf2);
      const hb = new THREE.Mesh(Geo.merge(parts), G.M.vc({ rimStr: 0.4 })); hb.name = 'hotair'; world.add(hb);
      town.anim.push((dt, t) => { const k = G.Save.set.reducedMotion ? 0.35 : 1; hb.rotation.y += dt * 0.009 * k; hb.position.y = Math.sin(t * 0.23) * 1.6 * k; });
    }
    const farMesh = Geo.bake(farG); farMesh.name = 'far'; world.add(farMesh);
    const hz = Geo.distantMountains(330, 26, [0x8fd6a0, 0xf2b98a, 0xffc8a8, 0xbfc8f2], { haze: 0xcff3ff, bands: Geo.PAL.bands, seed: 5 });
    world.add(hz);
    if (q.clouds !== false) {
      const pts = [], crn = G.rng(5);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + crn() * 0.4, d = 110 + crn() * 120; pts.push({ x: Math.sin(a) * d, y: 55 + crn() * 40, z: -Math.cos(a) * d, s: 6 + crn() * 7, ry: crn() * TAU }); }
      const c1 = Geo.instancedAt(Geo.cloudGeo(1), Geo.cloudMat(), pts.filter((p, i) => i % 2 === 0));
      const c2 = Geo.instancedAt(Geo.cloudGeo(2), Geo.cloudMat(), pts.filter((p, i) => i % 2 === 1));
      const cg = new THREE.Group(); cg.add(c1, c2); world.add(cg);
      town.anim.push((dt) => { cg.rotation.y += dt * 0.004; });
    }
    // baked statics
    // (one bake: from the spawn and from above every quadrant is in view, so splitting it only adds draw calls)
    bakeG.name = 'props';
    { const props = Geo.bake(bakeG); props.name = 'props'; world.add(props); }
    if (flags && flags.count) world.add(flags.mesh());
    // ground occlusion: soft dark pools under palms, bushes, rocks, around buildings and street furniture
    // (the optional life layers below are guarded: a fault there must never cost the player the town)
    G.safe('hub ao', () => { G.Terrain.bakeAO(terr, aoT); if (G.Terrain.aoGeo) G.Terrain.aoGeo(plazaGeo, aoP, 0.2); });
    // living lawn: windowed grass + flower patches on the meadow ring (never under floors or props). The grass
    // thins out along the same ragged lawn -> sand blend the ground is painted with, so no tufts stand on the beach.
    const meadow = (x, z, h) => { const r = Math.hypot(x, z); return U.smoothstep(PLAZA_R + 0.9, PLAZA_R + 2.8, r) * (1 - U.smoothstep(0.15, 0.55, sandK(r, G.noise.n2(x * 0.11, z * 0.11), h))); };
    const onFloor = (x, z) => floorAt(town.floors, x, z, -99) > -99;
    town.foliage = G.safe('hub foliage', () => G.Terrain.foliage(world, {
      heightFn: visH, grid: terr, bounds: { minX: -46, maxX: 46, minZ: -46, maxZ: 46 }, blockPhys: true, seed: 21,
      density: (x, z, h) => { const m = meadow(x, z, h); if (m <= 0 || onFloor(x, z)) return 0; return m * (0.62 + 0.38 * U.clamp(0.5 + G.noise.n2(x * 0.13, z * 0.13), 0, 1)); },
      flowers: (x, z, h) => { const m = meadow(x, z, h); if (m <= 0 || onFloor(x, z)) return 0; return m * U.smoothstep(0.02, 0.4, G.noise.n2(x * 0.06 + 4, z * 0.06 + 1)); },
      flowerColors: [0xff8ab4, 0xffd84a, 0xffffff, 0xc2a2ff, 0xff9a5a], flowerK: 2.6,
    })) || null;
    // render budget (< 200k triangles in every view): on Ultra the lawn field reaches a little less far here — the
    // town is the densest scene and its worst view (the Workshop) sat at ~202k; the Ultra grass stays denser than High
    if (town.foliage && town.foliage.setReach && G.R.qualityName() === 'ultra') town.foliage.setReach(0.82);
    // ambient life: pollen by day, fireflies at night, butterflies over the lawn, gulls over the bay
    const meadowSpot = (r2, cam) => {
      const a0 = Math.atan2(cam.position.x, -cam.position.z);
      for (let i = 0; i < 6; i++) { const a = a0 + (r2() - 0.5) * 1.6, rr = PLAZA_R + 3 + r2() * 11, x = Math.sin(a) * rr, z = -Math.cos(a) * rr; if (!onFloor(x, z) && Math.hypot(x - cam.position.x, z - cam.position.z) < 24) return { x, z }; }
      const i = Math.floor(r2() * 5), a = (i * 72 + 54) * DEG; return { x: Math.sin(a) * 12.2, z: -Math.cos(a) * 12.2 }; // a planter
    };
    town.ambient = G.safe('hub ambient', () => G.Terrain.ambient(world, {
      heightFn: visH, seed: 5,
      motes: { count: 60, color: 0xfff0b8, size: 0.085 },
      fireflies: { count: 46 },
      butterflies: { count: 9, spot: meadowSpot, near: 26 },
      birds: { count: 7, x: 0, z: 0, r: 92, y: 30, speed: 0.045 },
    })) || null;
    if (town.ambient) {
      const A = town.ambient, mc = A.motes && A.motes.userData.uni.uColor.value.clone(), fc = A.fireflies && A.fireflies.userData.uni.uColor.value.clone();
      town.anim.push(() => {
        const nt = town.night || 0;
        if (A.motes) A.motes.userData.uni.uColor.value.copy(mc).multiplyScalar(1 - nt * 0.85);
        if (A.fireflies) { A.fireflies.userData.uni.uColor.value.copy(fc).multiplyScalar(U.smoothstep(0.35, 0.8, nt)); A.fireflies.visible = nt > 0.3; }
        if (A.butterflies) A.butterflies.visible = nt < 0.6;
      });
    }
    // halos for lamps and pylons (one Points draw call; brighter at night)
    {
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(haloPts, 3));
      const hm = new THREE.PointsMaterial({ map: G.R.glowTex(), color: 0xfff0c0, size: 2.6, sizeAttenuation: true, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const halo = new THREE.Points(hg, hm); halo.renderOrder = 6; world.add(halo);
      town.halo = halo;
    }
    // critters hopping around the plaza; on Medium+ also a pair of jelly blobs playing round the fountain rim, a bunny on
    // the lawn, a snailbot on the beach by the pier (Ultra: two more). Hidden (and paused) beyond CRIT_R m of the viewer.
    // zone: [cx, cz, r0, r1, ring] — ring: the target is picked on the ring r0..r1 round (cx, cz) on the critter's side;
    // otherwise inside the disc of radius r1 round (cx, cz)
    const ck = ['blob', 'bunnyblob', 'snailbot', 'bunnyblob', 'blob'];
    const cc = [0xff8fc0, 0xb8f2ff, 0x9be15d, 0xffb37a, 0xc8b8ff];
    const nCrit = q.props < 0.7 ? 3 : 5;
    const crit = (kind, col, x, z, zone, speed) => {
      const c = makeCritter(kind, col);
      c.group.position.set(x, zone && !zone[4] ? groundH(x, z) : 0, z);
      world.add(c.group);
      town.critters.push({ c, tx: x, tz: z, wait: rnd() * 3, speed, hop: -0, zone: zone || null, bird: false, r: -0, h: -0, w: -0, a: -0 });
    };
    for (let i = 0; i < nCrit; i++) {
      const a = rnd() * TAU, rr = 9 + rnd() * 9.5;
      crit(ck[i], cc[i], Math.sin(a) * rr, -Math.cos(a) * rr, null, ck[i] === 'snailbot' ? 0.6 : 1.6 + rnd() * 0.8);
    }
    if (q.props >= 0.7 && town.pier) {
      const P = town.pier, bx = P.x0 + P.ox * 1.5 + P.sx * 10.5, bz = P.z0 + P.oz * 1.5 + P.sz * 10.5;
      crit('blob', 0x9ff0ff, 0, 7.2, [0, 0, 6.3, 8.3, true], 1.5);
      crit('blob', 0xffc0e0, 0, -7.4, [0, 0, 6.3, 8.3, true], 1.7);
      // (lawn critters: in the gaps between the facilities, 40 m out)
      const lawn = (kind, col, deg, sp) => { const x = Math.sin(deg * DEG) * 40, z = -Math.cos(deg * DEG) * 40; crit(kind, col, x, z, [x, z, 0, 3, false], sp); };
      lawn('bunnyblob', 0xfff1a8, 18, 1.8);
      crit('snailbot', 0xffb3d9, bx, bz, [bx, bz, 0, 1.6, false], 0.55);
      if (G.R.qualityName() === 'ultra') { lawn('blob', 0xc9a8ff, 234, 1.6); lawn('bunnyblob', 0xffb37a, 126, 1.9); }
    }
    // puffbirds circling overhead (gulls)
    for (let i = 0; i < 2; i++) {
      const c = makeCritter('puffbird', [0xffffff, 0xfff1dc, 0xd8f4ff][i]);
      c.group.scale.setScalar(1.3);
      world.add(c.group);
      town.critters.push({ c, tx: -0, tz: -0, wait: -0, speed: -0, hop: -0, zone: null, bird: true, r: 18 + i * 7, h: 14 + i * 3, w: (i % 2 ? -1 : 1) * (0.18 + i * 0.04), a: i * 2 });
    }
    const critR2 = Math.pow(CRIT_R[G.R.qualityName()] || 30, 2);
    town.update = function (dt, t) {
      for (let i = 0; i < town.anim.length; i++) town.anim[i](dt, t);
      // (distance culling follows the camera: the player's eye in town, the title's own camera on the title)
      const far2 = q.props < 0.7 ? 22 * 22 : 30 * 30;
      const camR = G.R.camera.position, rm = G.Save.set.reducedMotion ? 0.35 : 1;
      for (let i = 0; i < town.pylons.length; i++) {
        const p = town.pylons[i];
        // badges turn toward the camera (with a gentle sway) so the emblem always reads; the small stars spin
        if (p.face) p.mesh.rotation.y = U.angleDamp(p.mesh.rotation.y, Math.atan2(camR.x - p.mesh.position.x, camR.z - p.mesh.position.z) + Math.sin(t * 0.9 + p.ph) * 0.32 * rm, 3, dt);
        else p.mesh.rotation.y += dt * 1.1;
        p.mesh.position.y = p.base + Math.sin(t * 1.6 + p.ph) * 0.25 * rm;
      }
      // small dressing far from the camera is hidden (DETAIL_R; door props a little farther)
      for (let i = 0; i < town.detail.length; i++) { const d = town.detail[i], dx = d.x - camR.x, dz = d.z - camR.z; d.mesh.visible = dx * dx + dz * dz < (d.r2 || town.detailR2); }
      for (let i = 0; i < town.npcs.length; i++) {
        const o = town.npcs[i], dx = camR.x - o.pos.x, dz = camR.z - o.pos.z, d2 = dx * dx + dz * dz, vis = d2 < far2;
        o.n.group.visible = vis; if (o.stool) o.stool.visible = vis;
        if (!vis) continue;
        // idle life: every so often a shopkeeper in view waves across the plaza (their own greet gesture)
        o.idleT -= dt;
        try {
          if (o.idleT <= 0) { o.idleT = 7 + Math.random() * 9; if (d2 > 25 && o.n.greet) o.n.greet(); }
          if (o.n.animate) o.n.animate(t, dt);
        } catch (e) { G.safeFail('npc anim', e); }
      }
      for (let i = 0; i < town.critters.length; i++) {
        const o = town.critters[i], g = o.c.group;
        if (o.bird) {
          o.a += o.w * dt;
          g.position.set(Math.sin(o.a) * o.r, o.h + Math.sin(t * 0.7 + o.r) * 1.2, -Math.cos(o.a) * o.r);
          g.rotation.y = -o.a + (o.w > 0 ? -PI / 2 : PI / 2) + PI;
          // (a puffbird is ~1.4k triangles in five meshes: past 36 m it is a few pixels — hidden, like the plaza critters)
          const bx = g.position.x - camR.x, bz = g.position.z - camR.z, bv = bx * bx + bz * bz < 1296;
          if (g.visible !== bv) g.visible = bv;
          if (bv) animCritter(o.c, t, dt);
          continue;
        }
        const vx = g.position.x - camR.x, vz = g.position.z - camR.z, vis = vx * vx + vz * vz < critR2;
        if (g.visible !== vis) g.visible = vis;
        if (!vis) continue;
        const dx = o.tx - g.position.x, dz = o.tz - g.position.z, d = Math.sqrt(dx * dx + dz * dz);
        if (d < 0.3) {
          o.wait -= dt;
          if (o.wait <= 0) {
            const Z = o.zone;
            if (Z && Z[4]) {
              // round the fountain rim: a short hop along the ring
              const a0 = Math.atan2(g.position.x - Z[0], -(g.position.z - Z[1]));
              let a = a0 + (Math.random() - 0.5) * 1.1;
              // (never onto or across the Mission Board sign: stay put this time)
              const ka = U.wrapAngle(a - KIOSK.ang * DEG), k0 = U.wrapAngle(a0 - KIOSK.ang * DEG);
              if (Math.abs(ka) < 0.3 || (ka * k0 < 0 && Math.abs(k0) < 1.5)) a = a0;
              const rr = Z[2] + Math.random() * (Z[3] - Z[2]);
              o.tx = Z[0] + Math.sin(a) * rr; o.tz = Z[1] - Math.cos(a) * rr; o.wait = 0.8 + Math.random() * 2.5;
            } else if (Z) {
              const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * Z[3];
              o.tx = Z[0] + Math.sin(a) * rr; o.tz = Z[1] - Math.cos(a) * rr; o.wait = 1.5 + Math.random() * 4;
            } else {
              // new target on the same side of the fountain (straight paths never cross the basin), inside the candy
              // kerb ring (the carts and tubs stand outside it)
              const a0 = Math.atan2(g.position.x, -g.position.z);
              const a = a0 + (Math.random() - 0.5) * 1.6, rr = 8.5 + Math.random() * 10;
              o.tx = Math.sin(a) * rr; o.tz = -Math.cos(a) * rr; o.wait = 1.5 + Math.random() * 4;
            }
          }
          o.c.moving = false;
        } else {
          const sp = Math.min(d, o.speed * dt);
          g.position.x += (dx / d) * sp; g.position.z += (dz / d) * sp;
          g.rotation.y = U.angleDamp(g.rotation.y, Math.atan2(dx, dz), 6, dt);
          o.c.moving = true;
          if (o.c.fallback) { o.hop += dt * 7; g.position.y = Math.abs(Math.sin(o.hop)) * 0.3; }
          else if (o.zone && !o.zone[4]) g.position.y = groundH(g.position.x, g.position.z);   // (lawn / beach critters)
        }
        animCritter(o.c, t, dt);
      }
    };
    return town;
  }

  // Facility name board label: the translated name on the plate colour, the building's trim as the frame and a
  // band in the facility colour along the bottom (the same colour as its badge, tag and minimap block).
  function makeLabel(text, sm, color) {
    const css = h => (typeof h === 'number' ? '#' + h.toString(16).padStart(6, '0') : h);
    return G.Geo.textPlane(text, sm.w, sm.h, { bg: css(sm.bg), border: css(sm.border), fg: '#1e1a4d', bw: 9, radius: 30, stripe: color != null ? css(color) : null });
  }
  function relabel(town) {
    for (const e of town.labels) {
      if (!e.label) continue;
      const old = e.label;
      const lab = makeLabel(G.t(e.def.nameKey), e.signMeta, e.def.color);
      lab.position.copy(old.position);
      e.mesh.remove(old);
      if (old.material.map) old.material.map.dispose(); old.material.dispose(); old.geometry.dispose();
      e.mesh.add(lab); e.label = lab;
    }
    const swapSign = (holder, text) => {
      if (!holder) return;
      const old = holder.mesh.children.find(c => c.isMesh && c.userData.keep && c.material && c.material.map);
      if (!old) return;
      const w = old.geometry.parameters.width, h = old.geometry.parameters.height;
      const tp = G.Geo.textPlane(text, w, h, { bg: '#fff6e6', fg: '#1e1a4d', border: '#e8b44a' });
      tp.position.copy(old.position); holder.mesh.remove(old);
      if (old.material.map) old.material.map.dispose(); old.material.dispose(); old.geometry.dispose();
      holder.mesh.add(tp);
    };
    swapSign(town.kioskSign, G.t('hub.b.fountain'));
    swapSign(town.welcomeSign, G.t('hub.welcome'));
    const lo = town.locker;
    if (lo && lo.sign) {
      const old = lo.sign, tp = G.Geo.textPlane(G.t('wr.locker'), lo.signW, 0.46, { bg: '#fff6e6', fg: '#1e1a4d', border: '#b983ff', bw: 8, radius: 26 });
      tp.position.copy(old.position); tp.rotation.copy(old.rotation);
      if (old.parent) old.parent.add(tp), old.parent.remove(old);
      if (old.material.map) old.material.map.dispose(); old.material.dispose(); old.geometry.dispose();
      lo.sign = tp;
    }
  }

  // Lock props (fence + plate + padlock) in front of closed buildings; rebuilt when the state or the plate
  // text changes (language switch, one mission closer). The plate is a progress lock, never "coming soon":
  // "Locked" + the unlock condition under it, a gold padlock on top.
  function syncLocks(town, world) {
    let changed = [];
    for (const e of town.buildings) {
      const open = Hub.isUnlocked(e.def.id);
      const hint = open ? null : Hub.lockShort(e.def.id);
      const text = hint ? G.t('hub.lockPlate', { hint }) : G.t('hub.closed');
      if (e.lock && (open || e.lock.text !== text)) {
        for (const m of e.lock.meshes) { world.remove(m); G.R.disposeTree(m); }
        for (const it of e.lock.items) world.phys.remove(it);
        e.lock = null;
        if (open) changed.push(e.def.id);
      }
      if (!open && !e.lock) {
        const items = [], grp = new THREE.Group();
        const fx = e.door.x - e.dir.x * 0.35, fz = e.door.z - e.dir.z * 0.35;
        const fence = G.Geo.fence(Math.max(4, e.width - 1.1), 0xfffaf2);
        const pr = addProp(world, fence, fx, FY, fz, e.ry, null, grp);
        items.push(...pr.items);
        const po = hint ? { w: 3.5, h: 1.15, postH: 0.9, frame: 0x6e64a8, border: '#ffc21a' } : { w: 2.6, h: 0.75, postH: 1.0, frame: 0x6e64a8, border: '#ffc21a' };
        const plate = G.Geo.sign(text, po);
        const px = e.door.x + e.dir.x * 1.2, pz = e.door.z + e.dir.z * 1.2;
        const pp = addProp(world, plate, px, 0, pz, e.ry, null, grp);
        items.push(...pp.items);
        const lk = new THREE.Mesh(lockGeometry(), G.M.vc({ rimStr: 0.5, spec: 0.6 }));
        lk.position.set(px, hint ? 2.78 : 2.75, pz); lk.rotation.y = e.ry; grp.add(lk);
        const baked = G.Geo.bake(grp);
        world.add(baked);
        // (c / hw / hh: the plate's centre and half size, for Beepo's bubble to keep clear of it)
        e.lock = { meshes: [baked], items, text, c: new V3(px, po.postH + po.h / 2, pz), hw: po.w / 2 + 0.1, hh: po.h / 2 + 0.1 };
      }
      if (e.label) e.label.material.color.setHex(open ? 0xffffff : 0xb8b8c8);
    }
    return changed;
  }

  // ------------------------------------------------------------------ day / night
  // Day cycle (phase 0..1, 12 min): golden morning -> warm noon with cool violet shade -> peach sunset ->
  // moonlit night (fireflies) -> rosy dawn. sun/sky/ground/shadow feed the soft-toon light state.
  const KEYS = [
    { p: 0.00, top: 0x6e7bd8, mid: 0xf2a0b8, hor: 0xffc8a0, bot: 0xffd8b8, sun: 0xffdcb8, sky: 0xffd8e0, ground: 0xecb88c, shadow: 0x8a62bc, exp: 0.98, fog: 0xffd0b8, night: 0.15 },
    { p: 0.10, top: 0x2fa8e8, mid: 0x5cc8f2, hor: 0xd4f4ff, bot: 0xbde8f5, sun: 0xffeccc, sky: 0xe4f2ff, ground: 0xeec89c, shadow: 0x6a70cc, exp: 1.01, fog: 0xd2f2ff, night: 0 },
    { p: 0.52, top: 0x2aa4e8, mid: 0x58c6f2, hor: 0xd0f2ff, bot: 0xbde8f5, sun: 0xfff1d4, sky: 0xe6f4ff, ground: 0xecc69a, shadow: 0x666ed0, exp: 1.02, fog: 0xcff1ff, night: 0 },
    { p: 0.62, top: 0x7f70e0, mid: 0xff94b0, hor: 0xffb07c, bot: 0xffc4a4, sun: 0xffcc98, sky: 0xffcad6, ground: 0xff9a6c, shadow: 0x8c54b0, exp: 0.99, fog: 0xffc0a4, night: 0.3 },
    { p: 0.72, top: 0x1b1f4d, mid: 0x2a2f6e, hor: 0x4a4a9a, bot: 0x2b3170, sun: 0xa8c0ff, sky: 0x8088d8, ground: 0x50508a, shadow: 0x2b2f6e, exp: 0.97, fog: 0x2f3578, night: 1 },
    { p: 0.92, top: 0x1b1f4d, mid: 0x2a2f6e, hor: 0x4a4a9a, bot: 0x2b3170, sun: 0xa8c0ff, sky: 0x8088d8, ground: 0x50508a, shadow: 0x2b2f6e, exp: 0.97, fog: 0x2f3578, night: 1 },
    { p: 1.00, top: 0x6e7bd8, mid: 0xf2a0b8, hor: 0xffc8a0, bot: 0xffd8b8, sun: 0xffdcb8, sky: 0xffd8e0, ground: 0xecb88c, shadow: 0x8a62bc, exp: 0.98, fog: 0xffd0b8, night: 0.15 },
  ];
  const _ca = new THREE.Color(), _cb = new THREE.Color();
  function lerpHex(out, a, b, t) { _ca.setHex(a); _cb.setHex(b); out.copy(_ca).lerp(_cb, t); }
  function applyDayNight(world, town, phase) {
    let i = 0; while (i < KEYS.length - 2 && phase > KEYS[i + 1].p) i++;
    const A = KEYS[i], B = KEYS[i + 1], t = U.smoothstep(0, 1, (phase - A.p) / Math.max(1e-4, B.p - A.p));
    const uni = world.sky && world.sky.userData.uni;
    if (uni) {
      lerpHex(uni.uTop.value, A.top, B.top, t); lerpHex(uni.uMid.value, A.mid, B.mid, t);
      lerpHex(uni.uHor.value, A.hor, B.hor, t); lerpHex(uni.uBot.value, A.bot, B.bot, t);
      const night = U.lerp(A.night, B.night, t);
      uni.uStars.value = night > 0.6 ? 1 : 0;
      uni.uNeb.value.setHex(0x3a2a7a);
      uni.uClouds.value = G.R.q().clouds ? 1 : 0;
      uni.uCloudCol.value.setRGB(1 - night * 0.62, 1 - night * 0.6, 1 - night * 0.35);
      town.night = night;
    }
    const L = G.R.light;
    lerpHex(L.uSunCol.value, A.sun, B.sun, t); lerpHex(L.uSky.value, A.sky, B.sky, t);
    lerpHex(L.uGround.value, A.ground, B.ground, t); lerpHex(L.uShadow.value, A.shadow, B.shadow, t);
    L.uExposure.value = U.lerp(A.exp, B.exp, t);
    if (world.scene.fog) lerpHex(world.scene.fog.color, A.fog, B.fog, t);
    if (town.halo) town.halo.material.opacity = 0.3 + (town.night || 0) * 0.6;
  }

  // ------------------------------------------------------------------ world factory
  function makeWorld(title) {
    const floors = [];
    const sunDir = new V3(0.45, 0.8, 0.35);
    // the ground under the deck floors, with its argument-free twin for the phys samplers (05_phys _hfUpdate: reads
    // x, z from Phys.hIn and writes exactly floorH(x, z) to Phys.hOut[0])
    const floorH = (x, z) => floorAt(floors, x, z, groundH(x, z));
    const HI_ = G.Phys.hIn, HO_ = G.Phys.hOut;
    floorH.s = () => { HO_[0] = floorH(HI_[0], HI_[1]); };
    const world = new G.World({
      heightFn: floorH,
      bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },
      sky: { top: 0x2fa8e8, mid: 0x5cc8f2, horizon: 0xcff3ff, bottom: 0xbde8f5, sun: 0xfffbe8, halo: 0xffe9a8, sunDir: new V3(0.3, 0.55, -0.75), clouds: true },
      fog: { color: 0xcff3ff, near: 70, far: Math.max(260, G.R.q().draw) },
      light: { sunDir, sun: 0xfff1d4, sky: 0xe6f4ff, ground: 0xecc69a, shadow: 0x666ed0, shadowK: 0.47, exposure: 1.02, rim: 0xfff2d4, grade: { sat: 0.13, tint: 0xfff0d8, tintK: 0.04 } },
      floorY: -20,
    });
    const town = buildTown(world, { title });
    // floors are registered by buildTown into town.floors; route the heightfield to them
    for (const f of town.floors) floors.push(f);
    world.town = town;
    return world;
  }

  // ------------------------------------------------------------------ hub runtime state
  const S = { world: null, town: null, player: null, beepo: null, t: 0, phase: 0.3, bubble: null, bubbleT: 0, nextHint: 6, lastNear: null,
    lockTimer: 0, bangTimer: 0, offLang: null, offs: [], waterWarned: false, firedHint: false, sugg: null, hudTL: null, hudBtn: null, nearLock: null, idleIx: 0, onPier: false };

  function playerStats() { try { if (G.Data && G.Data.playerStats) return G.Data.playerStats(); } catch (e) { console.warn('[hub] playerStats', e); } return null; }
  function playerLoadout() {
    try { if (G.Data && G.Data.loadout) { const l = G.Data.loadout(); if (Array.isArray(l)) return l; } } catch (e) { console.warn('[hub] loadout', e); }
    return G.Weapons && G.Weapons.defs && G.Weapons.defs.fizz ? [{ id: 'fizz', level: 1, mods: [] }] : [];
  }
  function playerGadget() { const p = prof(); return (p.loadout && p.loadout.gadget) || null; }

  // ------------------------------------------------------------------ Beepo bubble (DOM)
  function ensureBubble() {
    if (S.bubble && S.bubble.isConnected) return S.bubble;
    const slot = G.HUD.slot('full');
    if (!slot) return null;
    const face = '<svg viewBox="0 0 40 40"><circle cx="20" cy="21" r="16" fill="#fff1dc" stroke="#1e1a4d" stroke-width="3"/><rect x="10" y="13" width="20" height="14" rx="6" fill="#1e2a5a"/><circle cx="16" cy="20" r="2.6" fill="#39d5ff"/><circle cx="24" cy="20" r="2.6" fill="#39d5ff"/><path d="M15 24q5 3 10 0" stroke="#39d5ff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M20 5v-3" stroke="#1e1a4d" stroke-width="2.5"/><circle cx="20" cy="2.5" r="2.4" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="1.5"/></svg>';
    const b = G.UI.el('div.mm-bubble', G.UI.el('span.mm-bubble-face', { html: face }), G.UI.el('span.mm-bubble-text'));
    b.hidden = true;
    slot.appendChild(b);
    S.bubble = b;
    return b;
  }
  Hub.say = function (textOrKey, opts) {
    opts = opts || {};
    if (!S.world || G.Game.modeId !== 'hub') return;
    const b = ensureBubble(); if (!b) return;
    if (S.annPending) annBack();   // (an announcement not seen yet is told again later)
    const text = G.i18n.has(textOrKey) ? G.t(textOrKey, opts.params) : String(textOrKey);
    b.lastChild.textContent = text;
    b.hidden = false;
    b.style.visibility = G.UI.anyOpen() ? 'hidden' : '';
    S.ghostT = 0; S.dockT = 0.25;
    wantLayout();   // (its size is read and it is docked after this frame's layout: no forced reflow here)
    // pop in (Web Animations: restarting the CSS class needed a forced reflow on a gameplay frame)
    if (b.animate && !(G.UI.reduced && G.UI.reduced())) b.animate([{ opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1 }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    S.bubbleT = opts.dur || U.clamp(2.5 + text.length * 0.06, 3.5, 7);
    S.nextHint = Math.max(S.nextHint, S.bubbleT + 14);
    if (G.Audio) G.Audio.sfx('npc', { pitch: 1.5 });
    if (S.beepo && S.beepo.n.setExpr) G.safe('beepo expr', () => S.beepo.n.setExpr('happy'));
    if (opts.ann) { S.annPending = opts.ann.slice(); S.annShown = 0; }
  };

  // ------------------------------------------------------------------ suggestions / hints
  function questsInfo() {
    const out = { claim: 0, active: 0, available: 0 };
    const Q = G.Quests; if (!Q) return out;
    try {
      const act = Q.active ? Q.active() || [] : [];
      out.active = act.length;
      if (Q.claimable) { const c = Q.claimable(); out.claim = typeof c === 'number' ? c : (c || []).length; }
      else out.claim = act.filter(q => q && (q.done || q.complete || q.ready)).length;
      out.available = Q.available ? (Q.available() || []).length : 0;
    } catch (e) { /* adapter */ }
    return out;
  }
  function canCraftSomething() {
    if (!Hub.isUnlocked('workshop') || !G.Menus || !G.Menus.craftableCount) return false;
    try { return G.Menus.craftableCount() > 0; } catch (e) { return false; }
  }
  function treatReady() { try { return !!(G.Menus && G.Menus.treatReady && G.Menus.treatReady() && Hub.isUnlocked('cafe')); } catch (e) { return false; } }
  const SUG_TAB = { 'sugg.scrap': { tab: 'parts' }, 'sugg.shield': { tab: 'fab' }, 'sugg.craft': { tab: 'fab' }, 'sugg.cafe': { tab: 'treat' } };
  const SUG_BEEPO = { 'sugg.claim': 'hub.beepo.claim', 'sugg.guild': 'hub.beepo.guild', 'sugg.expedition': 'hub.beepo.mission', 'sugg.shield': 'hub.beepo.shield', 'sugg.scrap': 'hub.beepo.scrap',
    'sugg.craft': 'hub.beepo.craft', 'sugg.cafe': 'hub.beepo.treat', 'sugg.turf': 'hub.beepo.turf', 'sugg.race': 'hub.beepo.race', 'sugg.royale': 'hub.beepo.royale' };
  // Before the first mission the next step is always the first mission itself: the chip travels to the
  // Mission Board kiosk and opens the board (the Guild introduction comes after, when there are rewards).
  function firstMission() {
    const p = prof();
    if (((p.stats || {}).missions || 0) > 0 || questsInfo().claim > 0) return null;
    return { key: 'hub.sug.first', id: 'fountain', beepo: 'hub.beepo.first', first: true, params: null };
  }
  Hub.suggestion = function () {
    const fm = firstMission();
    if (fm) return fm;
    if (G.Progress && G.Progress.suggestion) {
      try {
        const s = G.Progress.suggestion();
        if (s && s.key) { const id = FROM_DATA[s.building] || s.building; return { key: s.key, id, beepo: SUG_BEEPO[s.key], params: SUG_TAB[s.key] || null }; }
      } catch (e) { /* fall back */ }
    }
    const qi = questsInfo();
    if (qi.claim > 0) return { key: 'hub.sug.claim', id: 'guild', beepo: 'hub.beepo.claim' };
    const h = hubState();
    if (!h.visited.guild) return { key: 'hub.sug.guild', id: 'guild', beepo: 'hub.beepo.guild' };
    if (treatReady()) return { key: 'hub.sug.cafe', id: 'cafe', beepo: 'hub.beepo.treat' };
    if (canCraftSomething()) return { key: 'hub.sug.craft', id: 'workshop', beepo: 'hub.beepo.craft' };
    if (qi.active === 0 && qi.available > 0) return { key: 'hub.sug.guild', id: 'guild', beepo: 'hub.beepo.guild' };
    const p = prof();
    const played = p.stats && (p.stats.missions || p.stats.expeditions || p.stats.pops);
    if (!played) return { key: 'hub.sug.mission', id: 'fountain', beepo: 'hub.beepo.mission' };
    if (Hub.isUnlocked('arena') && !h.visited.arena) return { key: 'hub.sug.turf', id: 'arena' };
    if (Hub.isUnlocked('hangar') && !h.visited.hangar) return { key: 'hub.sug.race', id: 'hangar' };
    if (Hub.isUnlocked('royale') && !h.visited.royale) return { key: 'hub.sug.royale', id: 'royale' };
    return { key: 'hub.sug.mission', id: 'fountain' };
  };

  // ------------------------------------------------------------------ visiting buildings
  function markVisit(id) {
    const h = hubState();
    const first = !h.visited[id];
    h.visited[id] = (h.visited[id] || 0) + 1;
    if (G.Progress && G.Progress.visit) G.safe('visit', () => G.Progress.visit(VISIT_ID[id] || id));
    else if (first) G.bus.emit('visit', VISIT_ID[id] || id);
    G.bus.emit('hub-visit', id);
    G.Save.save();
  }
  Hub.open = function (id, opts) {
    opts = opts || {};
    const b = Hub.byId(id); if (!b) return;
    if (!Hub.isUnlocked(id)) {
      const txt = Hub.lockText(id);
      if (G.Game.modeId === 'hub') Hub.say(txt); else G.UI.toast(txt);
      if (G.Audio) G.Audio.sfx('error');
      return;
    }
    markVisit(id);
    S.lastBuilding = id;
    if (S.newMarks && S.newMarks[id]) dropNewMark(id);
    if (S.newQ && S.newQ.includes(id)) { S.newQ.splice(S.newQ.indexOf(id), 1); ackNew([id]); }   // visited before Beepo got to it
    const params = Object.assign({ from: 'hub', building: id }, b.params || {}, opts.params || {});
    // opts.screen: open a specific screen of this place (the first-mission chip goes straight to the board)
    const screen = opts.screen && G.UI.defs[opts.screen] ? opts.screen : b.screen;
    const show = () => {
      if (G.UI.defs[screen]) G.UI.open(screen, params);
      else G.UI.toast(G.t(b.nameKey));
    };
    const h = hubState();
    if (!h.talked[id] && G.UI.defs['npc-talk'] && b.npc) {
      h.talked[id] = 1; G.Save.save();
      // Quill's welcome is kept to the two lines that matter (who he is, how quests work)
      const lines = id === 'guild' && G.Menus && G.Menus.npcLines ? G.Menus.npcLines(b.npc).slice(0, 2) : null;
      G.UI.open('npc-talk', { npc: b.npc, building: id, intro: true, then: show, lines });
    } else show();
    const t = S.town && S.town.npcs.find(o => o.b === id);
    if (t && t.n.greet) G.safe('greet', () => t.n.greet());
  };
  // The Ranger Locker cabinet on the plaza (30b 'locker' screen; the Gallery's Locker tab as a fallback).
  Hub.openLocker = function () {
    if (G.UI.anyOpen()) return false;
    const params = { from: 'hub' };
    if (G.UI.defs.locker) G.UI.open('locker', params);
    else if (G.UI.defs.gallery) G.UI.open('gallery', Object.assign(params, { tab: 'locker' }));
    else return false;
    if (S.beepo && S.beepo.n.greet) G.safe('greet', () => S.beepo.n.greet());
    return true;
  };
  // Floor material under a hub point (for footsteps): 'wood' on building floors and decks, else null (the
  // audio module then picks plaza stone / lawn / sand by radius). y (optional): the feet height.
  Hub.surfaceAt = function (x, z, y) {
    const T = S.town || TS.town; if (!T || !T.floors.length) return null;
    const f = floorAt(T.floors, x, z, -99);
    if (f <= -99) return null;
    return y == null || Math.abs(y - f) < 0.45 ? 'wood' : null;
  };
  Hub.travel = function (id) {
    if (!S.world || !S.player || !S.town) return false;
    const e = id === 'fountain' ? S.town.kiosk : id === 'locker' ? S.town.locker : S.town.byId[id];
    if (!e) return false;
    const pl = S.player;
    const spot = e.door.clone().addScaledVector(e.dir, id === 'fountain' ? 1.6 : id === 'locker' ? 1.6 : 3.2);
    pl.pos.set(spot.x, S.world.phys.groundAt(spot.x, spot.z, 0.3, 5), spot.z);
    pl.vel.set(0, 0, 0);
    pl.yaw = Math.atan2(e.dir.x, e.dir.z); // look back toward the building
    pl.pitch = -0.05;
    pl.safePos.copy(pl.pos);
    S.world.fx.ring(pl.pos.clone(), 2.4, 0x9ff6ff, 0.5, pl.pos.y + 0.1);
    S.world.fx.burst(new V3(pl.pos.x, pl.pos.y + 1, pl.pos.z), [0x9ff6ff, 0xffffff, 0xffd23f], 18, 4, 0.25, 0.6, { grav: 0 });
    if (G.Audio) G.Audio.sfx('teleport');
    if (S.beepo) placeBeepo(true);
    return true;
  };

  // ------------------------------------------------------------------ hub HUD widgets
  function buildHud() {
    // no combat in town: the crosshair only appears while practice-firing (see update)
    G.HUD.show({ crosshair: false, minimap: true, bolts: true, vitals: false, weapons: true, feed: true });
    G.HUD.minimapRange = 46;
    G.HUD.minimapDraw = drawMinimap;
    injectCss();
    const el = G.UI.el;
    const tl = G.HUD.slot('tl');
    const rank = el('div.mm-rankchip', el('span.mm-rank-star', { text: '★1' }), el('div.mm-rank-mid', el('b.mm-rank-pr'), el('div.mm-rank-bar', el('i'))));
    const sug = el('button.mm-sugchip', { type: 'button', onclick: () => {
      const s = S.sugg; if (!s || !s.id) return;
      const opts = s.first ? { screen: 'expedition-select', params: { from: 'fountain' } } : s.params ? { params: s.params } : {};
      if (Hub.travel(s.id)) setTimeout(() => { if (G.Game.modeId === 'hub' && !G.UI.anyOpen()) Hub.open(s.id, opts); }, 250);
    } },
      el('span.mm-sug-ico', { html: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="2" stroke-linejoin="round"/></svg>' }),
      el('span.mm-sug-text'));
    tl.append(rank, sug);
    const tr = G.HUD.slot('tr');
    const qb = el('button.mm-quickbtn', { type: 'button', 'aria-label': G.t('hub.quick'), onclick: () => G.UI.open('quickmenu', { from: 'hub' }) },
      el('span', { html: '<svg viewBox="0 0 32 32"><path d="M4 8l7-3 10 3 7-3v19l-7 3-10-3-7 3z" fill="#fff6e0" stroke="#1e1a4d" stroke-width="2.6" stroke-linejoin="round"/><path d="M11 5v19M21 8v19" stroke="#1e1a4d" stroke-width="2.2"/><circle cx="16" cy="14" r="3.4" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="2"/></svg>' }),
      el('b', { i18n: 'hub.quick' }));
    tr.appendChild(qb);
    S.hudTL = { rank, sug };
    S.bubble = null;
    ensureBubble();
    if (S.bubble) { S.bubble.classList.add('hub-dock'); observeLay(S.bubble); }
    S.cross = document.querySelector('#hud .crosshair'); S.crossOn = false;
    buildTags();
    refreshHud(true);
  }

  // ------------------------------------------------------------------ readability helpers (styles, bubble dock)
  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style'); st.id = 'hub-style';
    st.textContent = '.mm-bubble.hub-dock{max-width:min(280px,36%);transform-origin:0 0;border-radius:6px 18px 18px 18px;transition:opacity .2s ease}'
      + '.mm-bubble.hub-dock.low{border-radius:18px}.mm-bubble.hub-dock.ghost{opacity:0}'
      // (Japanese / Korean lines wrap at their phrase spaces, never inside a word; a phrase too long for the line still wraps)
      + ':lang(ja) .mm-bubble.hub-dock .mm-bubble-text,:lang(ko) .mm-bubble.hub-dock .mm-bubble-text{word-break:keep-all;overflow-wrap:anywhere}'
      + '.hub-tag{position:absolute;left:0;top:0;display:flex;align-items:center;gap:7px;padding:3px 12px 3px 3px;background:#fff;border:3px solid var(--ink);border-radius:99px;box-shadow:0 4px 0 rgba(30,26,77,.32),inset 0 -4px 0 var(--tc,#ffd23f);font:800 15px/1.1 var(--f-body);color:var(--ink);white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .22s ease;will-change:transform,opacity}'
      + '.hub-tag.on{opacity:1}.hub-tag.locked{background:#f2efff}'
      + '.hub-tag::after{content:"";position:absolute;left:50%;bottom:-11px;margin-left:-7px;border:7px solid transparent;border-top-color:var(--ink)}'
      + '.hub-tag .ht-ico{position:relative;width:32px;height:32px;border-radius:50%;border:2.5px solid var(--ink);display:grid;place-items:center;flex:none;background:var(--tc,#ffd23f)}'
      + '.hub-tag .ht-ico svg{width:21px;height:21px;display:block}.hub-tag .ht-lock{position:absolute;right:-7px;bottom:-6px;width:18px;height:18px}.hub-tag .ht-lock svg{width:100%;height:100%}'
      + '.hub-tag.locked .ht-ico>svg{opacity:.55}.hub-tag .ht-tx{display:flex;flex-direction:column;gap:2px}.hub-tag small{font:700 12px/1.1 var(--f-body);color:#5b5296}'
      + '.hub-tag .ht-bang,.hub-tag .ht-new{background:#ffd23f;border:2.5px solid var(--ink);border-radius:99px;padding:2px 7px;font:800 13px/1 var(--f-body)}.hub-tag .ht-new{background:#ff6fb5;color:#fff}'
      + '.gh-short .hub-tag{font-size:14px}.gh-short .hub-tag .ht-ico{width:28px;height:28px}'
      // (tiny phones: the top-left column is only 150 px there, ~100 px of chip text — narrower than one katakana word
      // plus its particle in some next-step lines ('ミッションボード|で'); the chip may reach past the column, up to its
      // text, and the facility tags keep clear of it — readHudBoxes)
      + 'html.gw-tiny .hud-tl .mm-sugchip{width:max-content;max-width:min(232px,41vw)}';
    document.head.appendChild(st);
  }
  function relayout() { if (!S.hudTL) return; wantLayout(); }
  // ---- layout reads without forced reflow
  // Every DOM measurement the hub needs — the HUD columns, the touch buttons, the suggestion chip, the interact prompt,
  // the bubble's and each name tag's size — is taken in one ResizeObserver callback. It runs after the browser's own
  // layout of the frame, so the reads cost nothing; before, they ran on gameplay frames right after DOM writes and
  // each forced a synchronous style + layout flush (up to 211 ms in one perf run, dockBubble -> readHudBoxes). A
  // measurement is requested by re-observing a hidden 1 px probe (observe() always reports once); the tags and the
  // bubble are observed for size changes too. Docking the bubble happens in the same callback (writes only).
  // Without ResizeObserver everything is read on the spot, as before.
  const LAY = { ro: null, probe: null };
  function wantLayout() {
    if (!S.hudTL) return;
    if (typeof ResizeObserver === 'undefined') { layoutRead(); return; }
    if (!LAY.ro) LAY.ro = new ResizeObserver(() => G.safe('hub layout', layoutRead));
    // (a direct child of <body>, shallower than everything the callback may resize: no "ResizeObserver loop" error)
    if (!LAY.probe || !LAY.probe.isConnected) {
      LAY.probe = G.UI.el('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '0', top: '0', width: '1px', height: '1px', visibility: 'hidden', pointerEvents: 'none' } });
      document.body.appendChild(LAY.probe);
    }
    LAY.ro.unobserve(LAY.probe); LAY.ro.observe(LAY.probe);
  }
  function observeLay(el) { if (el && typeof ResizeObserver !== 'undefined') { if (!LAY.ro) LAY.ro = new ResizeObserver(() => G.safe('hub layout', layoutRead)); LAY.ro.observe(el); } }
  function layoutRead() {
    if (!S.hudTL || G.Game.modeId !== 'hub') return;
    readHudBoxes();
    if (S.tags) for (let i = 0; i < S.tags.length; i++) { const t = S.tags[i]; t.w = t.el.offsetWidth || 160; t.h = (t.el.offsetHeight || 40) + 12; }   // (+ the pointer)
    const b = S.bubble;
    if (b) { S.bubbleW = b.offsetWidth || 260; S.bubbleH = b.offsetHeight || 56; S.sugRect = localRect(S.hudTL.sug); const pr = document.querySelector('#hud .prompt'); S.promptRect = pr && !pr.hidden ? localRect(pr) : null; }
    if (b && !b.hidden) dockBubble();
  }
  // DOM rect in the game frame (G.Screen: rotated / letterboxed screens), or null when not laid out.
  const localRect = el => {
    if (!el || !el.isConnected) return null;
    const r0 = el.getBoundingClientRect();
    if (!(r0.width > 2 && r0.height > 2)) return null;
    return G.Screen && G.Screen.rectToLocal ? G.Screen.rectToLocal(r0) : r0;
  };
  // HUD columns the facility tags stay clear of (rank + suggestion chips, minimap + clinks + map button,
  // weapon card); re-read on HUD build, resize and every lock tick (cheap, never per frame).
  function readHudBoxes() {
    const out = S.hudBoxes = [];
    for (const sel of ['.hud-tl', '.hud-tr', '.hud-bc']) {
      const r = localRect(document.querySelector('#hud ' + sel));
      if (r) out.push({ l: r.left - 6, t: r.top - 6, r: r.right + 6, b: r.bottom + 8 });
    }
    // (the next-step chip, which can reach past its column on tiny phones)
    const sg = localRect(S.hudTL && S.hudTL.sug);
    if (sg) out.push({ l: sg.left - 6, t: sg.top - 6, r: sg.right + 6, b: sg.bottom + 8 });
    S.bcTop = null;
    const bc = localRect(document.querySelector('#hud .hud-bc'));
    if (bc && bc.top > G.R.h * 0.45) S.bcTop = bc.top;
    // on-screen touch buttons (fire, jump...): the low bubble dock and the tags keep off them too
    const pads = S.padBoxes = [];
    for (const btn of document.querySelectorAll('#touch .tbtn')) {
      if (btn.hidden) continue;
      const q = localRect(btn);
      if (q) pads.push({ l: q.left - 6, t: q.top - 6, r: q.right + 6, b: q.bottom + 6 });
    }
  }
  // Screen rects of every facility sign, lock plate, the Mission Board and Locker signs in view (camera-facing
  // boxes from the centre + half sizes: conservative). Pooled: no allocation after the first call.
  const _sp = new V3(), _sq = new V3(), _rectPool = [], _rects = [];
  function signRects() {
    _rects.length = 0;
    const T = S.town, cam = G.R.camera; if (!T || !cam) return _rects;
    const W = G.R.w, H = G.R.h, f = H / (2 * Math.tan(cam.fov * DEG / 2));
    cam.updateMatrixWorld();
    const add = (c, hw, hh) => {
      _sp.copy(c).applyMatrix4(cam.matrixWorldInverse);
      const d = -_sp.z; if (d < 0.5) return;
      _sq.copy(c).project(cam);
      const cx = (_sq.x * 0.5 + 0.5) * W, cy = (-_sq.y * 0.5 + 0.5) * H, rx = hw * f / d, ry = hh * f / d;
      if (cx + rx < 0 || cx - rx > W || cy + ry < 0 || cy - ry > H) return;
      const r = _rectPool[_rects.length] || (_rectPool[_rects.length] = {});
      r.l = cx - rx; r.r = cx + rx; r.t = cy - ry; r.b = cy + ry;
      _rects.push(r);
    };
    for (const e of T.buildings) {
      if (e.anchors && e.anchors.sign && e.signMeta) add(e.anchors.sign, e.signMeta.w / 2 + 0.1, e.signMeta.h / 2 + 0.1);
      if (e.lock && e.lock.c) add(e.lock.c, e.lock.hw, e.lock.hh);
    }
    if (T.kiosk && T.kiosk.signC) add(T.kiosk.signC, 1.9, 0.6);
    if (T.locker) add(T.locker.signC, T.locker.signW / 2 + 0.1, 0.33);
    return _rects;
  }
  // does the box (x, y, w, h) reach into any of the touch-button boxes?
  const padHit = (x, y, w, h, pads) => {
    for (let i = 0; i < pads.length; i++) { const q = pads[i]; if (x + w > q.l && x < q.r && y + h > q.t && y < q.b) return true; }
    return false;
  };
  const overlap = (x, y, w, h, rects) => {
    let a = 0;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i], ix = Math.min(x + w, r.r) - Math.max(x, r.l), iy = Math.min(y + h, r.b) - Math.max(y, r.t);
      if (ix > 0 && iy > 0) a += ix * iy;
    }
    return a;
  };
  // Beepo's bubble never covers a facility sign. It docks under the top-left HUD chips (beside his portrait)
  // and drops to a low dock in the middle above the weapon card (where the view shows the plaza floor) while
  // a sign sits under the top dock; when both are covered (or the low one would hide the interact prompt) it
  // fades out and its countdown waits, so the line still shows once the player turns. Checked a few times a
  // second while a line shows.
  function dockBubble() {
    const b = S.bubble; if (!b || !S.hudTL) return;
    // (every size and rect here was measured by layoutRead after the browser's layout: nothing is read now)
    const W = G.R.w, H = G.R.h, bw = S.bubbleW || 260, bh = S.bubbleH || 56;
    const r = S.sugRect;
    const tx = Math.round(r ? r.left : 12), ty = Math.round(r ? r.bottom + 10 : 100);
    let lx = Math.round((W - bw) / 2);
    const ly = Math.round((S.bcTop || H - 84) - 14 - bh);
    // the low dock slides off every touch button it would cover — fire / jump on the right, and the contextual hand
    // (interact) button near the middle, which shows while a door is in reach (the bubble ignores taps, but should not
    // hide them): to the free spot beside a covered button nearest the middle; with none free, left of the button
    // as before
    const pads = S.padBoxes;
    if (pads && padHit(lx, ly, bw, bh, pads)) {
      let best = NaN, bd = Infinity, fb = NaN;
      for (let i = 0; i < pads.length; i++) {
        const q = pads[i];
        if (!(lx + bw > q.l && lx < q.r && ly + bh > q.t && ly < q.b)) continue;
        if (fb !== fb || q.l - bw < fb) fb = q.l - bw;
        for (let k = 0; k < 2; k++) {
          const x = Math.round(k === 0 ? q.l - bw : q.r);
          if (x < 12 || x + bw > W - 12 || padHit(x, ly, bw, bh, pads)) continue;
          const d = Math.abs(x - lx); if (d < bd) { bd = d; best = x; }
        }
      }
      lx = best === best ? best : Math.max(12, Math.round(fb));
    }
    const rects = b.hidden ? _rects : signRects();
    let low = false, ghost = false;
    if (overlap(tx, ty, bw, bh, rects) > 0) {
      const prR = S.promptRect;
      const clear = overlap(lx, ly, bw, bh, rects) === 0 && !(prR && prR.right > lx && prR.left < lx + bw && prR.bottom > ly && prR.top < ly + bh);
      if (clear) low = true;
      else { ghost = true; low = !!S.bubbleLow; }   // both covered: fade where it is
    }
    S.bubbleLow = low;
    const x = low ? lx : tx, y = low ? ly : ty;
    const tf = 'translate(' + x + 'px,' + y + 'px)';
    if (b._tf !== tf) { b._tf = tf; b.style.transform = tf; b.classList.toggle('low', low); }
    if (ghost !== !!S.bubbleGhost) { S.bubbleGhost = ghost; b.classList.toggle('ghost', ghost); }
    // its box, for the facility tags to stay clear of
    S.bubbleBox = ghost ? null : { l: x - 6, t: y - 6, r: x + bw + 6, b: y + bh + 6 };
  }

  // ------------------------------------------------------------------ facility name tags (DOM)
  // A readable name tag (emblem colour + icon; the unlock condition when locked; "!" when there is news,
  // NEW! right after opening) floats above the sign of each facility 6-22 m away and in view: the 3D
  // signs are only ~10 px tall at 13 m on a phone. Hidden up close, where the sign itself is big.
  const TAG_NEAR = 6, TAG_FAR = 22, _tp = new V3(), _avoid = [];
  function buildTags() {
    const slot = G.HUD.slot('full'); S.tags = []; S.tagById = {};
    if (!slot || !S.town) return;
    for (const e of S.town.buildings) {
      const a = e.anchors && e.anchors.sign ? e.anchors.sign.clone() : e.door.clone().setY(4.8);
      a.y += ((e.signMeta && e.signMeta.h) || 1) / 2 + 0.55;
      const tag = G.UI.el('div.hub-tag');
      slot.appendChild(tag);
      observeLay(tag);
      S.tags.push(S.tagById[e.def.id] = { e, el: tag, anchor: a, sig: '', on: false, x: -1e4, y: -1e4, w: 160, h: 52, bangId: 'bang-' + e.def.id });
    }
    refreshTags();
  }
  // Rewrites only: the tags' sizes are measured after the browser's layout (layoutRead, through the ResizeObserver
  // that watches each tag), never right after a rewrite on a gameplay frame.
  let _retagN = 0;
  function refreshTags() {
    if (!S.tags) return;
    const I = G.Menus && G.Menus.ICONS;
    _retagN = 0;
    for (const t of S.tags) {
      // second line: what the place is for (open) or how it opens (locked)
      const b = t.e.def, open = Hub.isUnlocked(b.id), hint = open ? (G.i18n.has('menu.place.' + b.id) ? G.t('menu.place.' + b.id) : null) : Hub.lockShort(b.id);
      const fresh = !!(S.newMarks && S.newMarks[b.id]), news = !fresh && !!(S.bangWant && S.bangWant[b.id]);
      const sig = G.i18n.lang + '|' + open + '|' + hint + '|' + fresh + '|' + news;
      if (sig === t.sig) continue;
      t.sig = sig;
      const ico = G.UI.el('span.ht-ico', { html: I ? I[G.Menus.placeIcon(b.id)] || I.star : '' });
      if (!open && I) ico.appendChild(G.UI.el('span.ht-lock', { html: I.lock }));
      t.el.innerHTML = '';
      t.el.append(ico, G.UI.el('span.ht-tx', G.UI.el('b', { text: G.t(b.nameKey) }), hint ? G.UI.el('small', { text: hint }) : null));
      if (fresh) t.el.appendChild(G.UI.el('span.ht-new', { text: G.t('hub.tag.new') }));
      else if (news) t.el.appendChild(G.UI.el('span.ht-bang', { text: '!' }));
      t.el.classList.toggle('locked', !open);
      t.el.style.setProperty('--tc', open ? U.cssHex(b.color) : '#cfc8f2');
      _retagN++;
    }
    if (_retagN) wantLayout();
  }
  function updateTags() {
    if (!S.tags) return;
    const pl = S.player, cam = G.R.camera, W = G.R.w, H = G.R.h, menu = G.UI.anyOpen();
    // boxes a tag never covers: Beepo's bubble (while it shows) and the HUD columns
    const av = _avoid; av.length = 0;
    if (S.bubble && !S.bubble.hidden && S.bubbleBox) av.push(S.bubbleBox);
    if (S.hudBoxes) for (let i = 0; i < S.hudBoxes.length; i++) av.push(S.hudBoxes[i]);
    if (S.padBoxes) for (let i = 0; i < S.padBoxes.length; i++) av.push(S.padBoxes[i]);
    for (let ti = 0; ti < S.tags.length; ti++) {
      const t = S.tags[ti], e = t.e;
      let on = false;
      if (!menu && pl) {
        const dx = pl.pos.x - e.door.x, dz = pl.pos.z - e.door.z, d = Math.hypot(dx, dz);
        // in range, and in front of the building (they all face the fountain)
        if (d > TAG_NEAR && d < TAG_FAR && dx * e.dir.x + dz * e.dir.z > 0) {
          _tp.copy(t.anchor).project(cam);
          let x = (_tp.x * 0.5 + 0.5) * W;
          const y = (-_tp.y * 0.5 + 0.5) * H;
          // a tag slides sideways (toward the middle of the screen) off a HUD column or the bubble, a little;
          // if that is not enough it waits until the way is clear
          let clear = true;
          for (let i = 0; i < av.length && clear; i++) {
            const b = av[i];
            if (x + t.w / 2 > b.l && x - t.w / 2 < b.r && y > b.t && y - t.h < b.b) {
              const shift = (b.l + b.r) / 2 < W / 2 ? b.r - (x - t.w / 2) : b.l - (x + t.w / 2);
              if (Math.abs(shift) < 140) x += shift; else clear = false;
            }
          }
          if (clear) for (let i = 0; i < av.length; i++) { const b = av[i]; if (x + t.w / 2 > b.l && x - t.w / 2 < b.r && y > b.t && y - t.h < b.b) { clear = false; break; } }
          // only while the whole tag is on screen and the anchor in the upper part of the view
          if (clear && _tp.z < 1 && x - t.w / 2 > 6 && x + t.w / 2 < W - 6 && y - t.h > 6 && y < H * 0.7) {
            on = true;
            const tx = Math.round(x), ty = Math.round(y);
            if (tx !== t.x || ty !== t.y) { t.x = tx; t.y = ty; t.el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-100%)'; }
          }
        }
      }
      if (on !== t.on) { t.on = on; t.el.classList.toggle('on', on); }
      // the NPC's "!" marker and the NEW! route marker fold into the tag while it shows
      const m = G.HUD.markers && G.HUD.markers.get(t.bangId);
      if (m) { const v = on ? 'hidden' : ''; if (m.el.style.visibility !== v) m.el.style.visibility = v; }
      t.routeHidden = on;
    }
  }
  // Route markers (first mission, new facilities) are edge-clamped; while their target is behind the
  // player they hide (the HUD would park them on the bottom edge over the weapon card) — the minimap dot
  // still points the way.
  let _rfx = 0, _rfz = 0, _rpl = null;
  const routeVis = (m, id) => {
    if (id !== 'bang-fountain' && id.indexOf('new-') !== 0) return;
    let v = '';
    if (m.opts && m.opts.edge !== false && _rpl) {
      const dx = m.pos.x - _rpl.pos.x, dz = m.pos.z - _rpl.pos.z, d = Math.hypot(dx, dz) || 1;
      if ((dx * _rfx + dz * _rfz) / d < -0.2) v = 'hidden';
    }
    // a new facility whose name tag is showing (with its NEW! badge) needs no second label
    if (!v && id.indexOf('new-') === 0 && S.tagById) { const t = S.tagById[id.slice(4)]; if (t && t.routeHidden) v = 'hidden'; }
    if (m.el.style.visibility !== v) m.el.style.visibility = v;
  };
  function routeMarkers() {
    const pl = S.player; if (!pl || !G.HUD.markers) return;
    _rpl = pl; _rfx = -Math.sin(pl.yaw); _rfz = -Math.cos(pl.yaw);
    G.HUD.markers.forEach(routeVis);
  }
  // A facility door close and in view: Beepo keeps his idle chatter for later.
  function facilityInView() {
    const pl = S.player, T = S.town; if (!pl || !T) return false;
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw);
    for (const e of T.buildings.concat(T.kiosk ? [T.kiosk] : [])) {
      const dx = e.door.x - pl.pos.x, dz = e.door.z - pl.pos.z, d = Math.hypot(dx, dz);
      if (d < 15 && d > 0.5 && (dx * fx + dz * fz) / d > 0.6) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ new facility announcements
  // Facilities that opened since the hub last showed them are announced there once each (Beepo + a route
  // marker + a NEW! badge on the tag) and only acknowledged after the announcement really showed. Sources:
  // G.Progress.newUnlocks() facility entries (acknowledged with ackUnlocks after the announcement) and
  // every building open but not yet in hub.seenOpen — this also covers places the results screen's
  // "New in Fizzport!" card already announced: the card tells, Beepo shows the way. Entries for buildings
  // the hub has shown open before are acknowledged quietly.
  const TO_HUB = { tower: 'royale', royale: 'royale', gate: 'defense', defense: 'defense', turf: 'arena', arena: 'arena', race: 'hangar', hangar: 'hangar', workshop: 'workshop', shop: 'shop', cafe: 'cafe', gallery: 'gallery' };
  const ORDER = BUILDINGS.map(b => b.id);
  function pendingNew() {
    const h = hubState(), out = [], src = {}, quiet = [];
    const add = (id, pid) => {
      if (!id || ALWAYS[id] || !Hub.isUnlocked(id)) return;
      if (h.seenOpen[id]) { if (pid) quiet.push(pid); return; }
      if (pid) (src[id] = src[id] || []).push(pid);
      if (!out.includes(id)) out.push(id);
    };
    let list = null;
    if (G.Progress && typeof G.Progress.newUnlocks === 'function') { try { list = G.Progress.newUnlocks(); } catch (e) { list = null; } }
    if (Array.isArray(list)) {
      for (const it of list) {
        if (typeof it === 'string') add(TO_HUB[it], it);
        else if (it && (!it.kind || it.kind === 'facility')) add(TO_HUB[it.go] || TO_HUB[it.id], it.id);
      }
    }
    for (const id of ORDER) add(id, null);
    if (quiet.length && typeof G.Progress.ackUnlocks === 'function') G.safe('ack unlocks', () => G.Progress.ackUnlocks(quiet));
    out.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    return { ids: out, src };
  }
  function queueNew() {
    const p = pendingNew();
    S.newSrc = Object.assign(S.newSrc || {}, p.src);
    for (const id of p.ids) if (!S.newQ.includes(id) && !(S.newMarks && S.newMarks[id])) S.newQ.push(id);
  }
  function ackNew(ids) {
    const h = hubState(), srcIds = [];
    for (const id of ids) { h.seenOpen[id] = 1; for (const s of (S.newSrc && S.newSrc[id]) || []) srcIds.push(s); }
    G.Save.save();
    if (srcIds.length && G.Progress && typeof G.Progress.ackUnlocks === 'function') G.safe('ack unlocks', () => G.Progress.ackUnlocks(srcIds));
  }
  function markNew(id) {
    if (!S.town || !S.town.byId[id]) return;
    S.newMarks[id] = 45;
    putNewMark(id);
  }
  // (re-issued on a language switch: same marker, label in the new language, the remaining time kept)
  function putNewMark(id) {
    const e = S.town && S.town.byId[id]; if (!e) return;
    G.HUD.marker('new-' + id, _nm.set(e.door.x, 3.4, e.door.z), { icon: (G.Menus && G.Menus.ICONS && G.Menus.ICONS[G.Menus.placeIcon(id)] || '!').replace('<svg ', '<svg width="16" height="16" '), label: G.t(e.def.nameKey), color: U.cssHex(e.def.color), edge: true, dist: true });
  }
  function dropNewMark(id) { if (S.newMarks) delete S.newMarks[id]; G.HUD.removeMarker('new-' + id); refreshTags(); }
  const _nm = new V3();
  // Announce the next batch once nothing else is talking: 1-2 new places one by one, 3+ in one line.
  function announceNew() {
    if (!S.newQ.length || G.UI.anyOpen() || S.t < 0.8 || S.annRetry > 0 || (S.bubble && !S.bubble.hidden && S.bubbleT > 0.4)) return;
    // standing at its door already (e.g. "Go there" from the results card): nothing to point at
    const pl = S.player, here = S.newQ.filter(id => { const e = S.town.byId[id]; return e && pl && Math.hypot(pl.pos.x - e.door.x, pl.pos.z - e.door.z) < 8; });
    if (here.length) { ackNew(here); S.newQ = S.newQ.filter(id => !here.includes(id)); if (!S.newQ.length) return; }
    const ids = S.newQ.length >= 3 ? S.newQ.splice(0) : [S.newQ.shift()];
    for (const id of ids) markNew(id);
    // acknowledged only once the line has been readable for a moment (annSeen); a line that fades out over the signs
    // until it is dropped, is replaced, or is hidden by a language switch goes back in the queue (annBack)
    if (ids.length > 1) Hub.say('hub.beepo.newMany', { params: { n: ids.length }, dur: 5, ann: ids });
    else Hub.say('hub.beepo.new', { params: { name: G.t('hub.b.' + ids[0]) }, dur: 4.5, ann: ids });
    if (!S.annPending) { for (let i = ids.length - 1; i >= 0; i--) if (!S.newQ.includes(ids[i])) S.newQ.unshift(ids[i]); S.annRetry = 2; }
    refreshTags();
  }
  function annBack() {
    const ids = S.annPending; S.annPending = null;
    if (!ids) return;
    for (let i = ids.length - 1; i >= 0; i--) if (!S.newQ.includes(ids[i]) && !hubState().seenOpen[ids[i]]) S.newQ.unshift(ids[i]);
    S.annRetry = 3;
  }
  function annSeen(dt) {
    if (!S.annPending) return;
    const b = S.bubble;
    if (!b || b.hidden) { annBack(); return; }
    if (S.bubbleGhost || b.style.visibility === 'hidden') return;
    S.annShown += dt;
    if (S.annShown >= 0.6) { const ids = S.annPending; S.annPending = null; ackNew(ids); }
  }
  function refreshHud() {
    if (!S.hudTL) return;
    const p = prof();
    let ri = null;
    try { ri = G.Progress && G.Progress.rankInfo ? G.Progress.rankInfo() : null; } catch (e) { ri = null; }
    const pr = (ri && (ri.pr || ri.level)) || (p.rank && p.rank.pr) || p.pr || 1;
    let frac = 0;
    if (ri) { if (ri.frac != null) frac = ri.frac; else if (ri.xp != null && (ri.next || ri.need)) frac = ri.xp / (ri.next || ri.need); }
    const star = guildRank();
    const r = S.hudTL.rank;
    const st = '★' + star; if (r.firstChild.textContent !== st) r.firstChild.textContent = st;
    const prt = G.t('hub.pr', { n: pr }); const prEl = r.querySelector('.mm-rank-pr'); if (prEl.textContent !== prt) prEl.textContent = prt;
    r.querySelector('.mm-rank-bar > i').style.width = (U.clamp(frac, 0, 1) * 100).toFixed(1) + '%';
    const s = Hub.suggestion(); S.sugg = s;
    const txt = G.t(s.key);
    // (setText: skips unchanged text, and gives Japanese its phrase breaks — the clamped chip cut words mid-way:
    // 'クエストのごほ/うびをうけとろ/う！'; the sugg.* lines also keep phrase spaces, 14_progress)
    G.UI.setText(S.hudTL.sug.querySelector('.mm-sug-text'), txt);
  }

  function drawMinimap(g, k, pl) {
    const T = S.town; if (!T) return;
    const ox = -pl.pos.x * k, oz = -pl.pos.z * k;
    g.save();
    g.translate(ox, oz);
    g.fillStyle = '#7fd8e8'; g.fillRect(-400, -400, 800, 800);
    g.fillStyle = '#8fd864'; g.beginPath(); g.arc(0, 0, SHORE0 * k, 0, TAU); g.fill();
    g.fillStyle = '#f7e3b0'; g.beginPath(); g.arc(0, 0, SHORE0 * k, 0, TAU); g.arc(0, 0, (SHORE0 - 2.5) * k, 0, TAU, true); g.fill();
    const Pr = T.pier;
    if (Pr) {   // the harbour pier
      g.strokeStyle = '#c8884a'; g.lineWidth = Math.max(3, PIER.w * k); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(Pr.x0 * k, Pr.z0 * k); g.lineTo((Pr.x0 + Pr.ox * Pr.len) * k, (Pr.z0 + Pr.oz * Pr.len) * k); g.stroke();
    }
    g.fillStyle = '#efdcc2'; g.beginPath(); g.arc(0, 0, PLAZA_R * k, 0, TAU); g.fill();
    g.strokeStyle = '#ff9fb0'; g.lineWidth = Math.max(1, 0.7 * k); g.beginPath(); g.arc(0, 0, 18.3 * k, 0, TAU); g.stroke();
    g.strokeStyle = '#bfe0ea'; g.lineWidth = 3.2 * k;
    for (const e of T.buildings) { g.beginPath(); g.moveTo(Math.sin(e.def.ang * DEG) * 8.5 * k, -Math.cos(e.def.ang * DEG) * 8.5 * k); g.lineTo(e.door.x * k, e.door.z * k); g.stroke(); }
    g.fillStyle = '#39c6e8'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 5 * k, 0, TAU); g.fill(); g.stroke();
    for (const e of T.buildings) {
      const open = Hub.isUnlocked(e.def.id);
      g.save(); g.translate(e.x * k, e.z * k); g.rotate(-e.ry);
      const w = 2 * Math.max(4, e.half * 1.1) * k, d = 2 * e.half * k;
      g.fillStyle = open ? '#' + e.def.color.toString(16).padStart(6, '0') : '#b8b8c8';
      g.strokeStyle = '#1e1a4d'; g.lineWidth = 2;
      g.beginPath(); if (g.roundRect) g.roundRect(-w / 2, -d / 2, w, d, 4 * k); else g.rect(-w / 2, -d / 2, w, d); g.fill(); g.stroke();
      g.restore();
    }
    const ki = T.kiosk; if (ki) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(ki.x * k, ki.z * k, 1.3 * k + 2, 0, TAU); g.fill(); g.stroke(); }
    const lo = T.locker; if (lo) { g.fillStyle = '#b983ff'; g.beginPath(); g.arc(lo.x * k, lo.z * k, 0.9 * k + 2, 0, TAU); g.fill(); g.stroke(); }
    g.restore();
  }

  // "!" bubbles over NPCs with news.
  function updateBangs() {
    const T = S.town; if (!T) return;
    const want = S.bangWant = {};
    const qi = questsInfo(), missions = (prof().stats || {}).missions || 0;
    // (before the first mission the Guild waits: the "!" goes to the Mission Board instead)
    if (qi.claim > 0 || (qi.active === 0 && qi.available > 0) || (!hubState().visited.guild && missions > 0)) want.guild = 1;
    if (canCraftSomething()) want.workshop = 1;
    if (treatReady()) want.cafe = 1;
    for (const e of T.buildings) {
      const id = 'bang-' + e.def.id;
      if (want[e.def.id] && Hub.isUnlocked(e.def.id)) {
        const p = e.npc ? e.npc.group.position : e.useAt;
        G.HUD.marker(id, new V3(p.x, (e.npc && e.npcTop ? e.npcTop : (p.y || 0) + 2) + 0.55, p.z), { icon: '!', edge: false, dist: false, color: '#ffd23f' });
      } else G.HUD.removeMarker(id);
    }
    // the Mission Board kiosk gets a "!" too while Beepo is pointing there (first missions); for the very
    // first mission it is a route marker (star + name + distance, held at the screen edge when off-view)
    const k = T.kiosk, pl = S.player;
    const near = k && pl && Math.hypot(pl.pos.x - k.door.x, pl.pos.z - k.door.z) < 4.5;
    if (k && S.sugg && S.sugg.first && !near) G.HUD.marker('bang-fountain', _bang.set(k.x, 3.6, k.z), { icon: STAR_SVG, label: G.t('hub.b.fountain'), edge: true, dist: true, color: '#ffd23f' });
    else if (k && S.sugg && S.sugg.id === 'fountain' && !want.guild && missions < 3 && !S.sugg.first) G.HUD.marker('bang-fountain', _bang.set(k.x, 3.6, k.z), { icon: '!', edge: false, dist: false, color: '#ffd23f' });
    else G.HUD.removeMarker('bang-fountain');
  }
  const _bang = new V3();
  const STAR_SVG = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7z" fill="#fff" stroke="#1e1a4d" stroke-width="2" stroke-linejoin="round"/></svg>';

  // Beepo's follow spot: ahead-right of the player, a little below eye height so he floats over the plaza
  // floor instead of in front of the facility signs on the horizon (snap = teleport there).
  // While his spot would hide a facility sign or lock plate (checked a few times a second), he ducks lower and
  // a little further right (bp.duck 0..1, eased), peeking over the blaster instead.
  function placeBeepo(snap, dt) {
    const bp = S.beepo, pl = S.player; if (!bp || !pl) return;
    bp.duck = snap ? bp.duckT || 0 : U.damp(bp.duck || 0, bp.duckT || 0, 3, dt || 0);
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw), sd = 1.45 + 0.4 * bp.duck;
    const tx = pl.pos.x + fx * 2.4 + rx * sd, tz = pl.pos.z + fz * 2.4 + rz * sd;
    const ty = pl.pos.y + 1.12 - 0.62 * bp.duck + Math.sin(bp.t * 2.4) * 0.1;
    const k = snap ? 1 : 1 - Math.exp(-4.5 * (dt || 0));
    bp.pos.x += (tx - bp.pos.x) * k; bp.pos.z += (tz - bp.pos.z) * k; bp.pos.y += (ty - bp.pos.y) * k;
  }
  // Does Beepo's on-screen disc (where he floats at full height) cover a sign? Sets bp.duckT.
  const _bq = new V3();
  function beepoClear() {
    const bp = S.beepo, pl = S.player, cam = G.R.camera; if (!bp || !pl || !cam) return;
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw);
    _bq.set(pl.pos.x + fx * 2.4 + rx * 1.45, pl.pos.y + 1.12, pl.pos.z + fz * 2.4 + rz * 1.45);
    const rects = signRects(), W = G.R.w, H = G.R.h;
    _sp.copy(_bq).applyMatrix4(cam.matrixWorldInverse);
    const d = Math.max(0.5, -_sp.z), rad = 0.5 * H / (2 * Math.tan(cam.fov * DEG / 2)) / d;
    _bq.project(cam);
    const cx = (_bq.x * 0.5 + 0.5) * W, cy = (-_bq.y * 0.5 + 0.5) * H;
    bp.duckT = overlap(cx - rad, cy - rad, rad * 2, rad * 2, rects) > 0 ? 1 : 0;
  }

  // ------------------------------------------------------------------ hub mode
  G.Game.register('hub', {
    layout: 'hub',
    music: 'hub',
    enter(params) {
      params = params || {};
      const world = makeWorld(false);
      const town = world.town;
      S.world = world; S.town = town; S.t = 0; S.phase = 0.3; S.nextHint = 3.5; S.waterWarned = false; S.firedHint = false;
      // interactions per building (door + counter) and the kiosk
      for (const e of town.buildings) {
        const b = e.def;
        const use = () => Hub.open(b.id);
        // locked: "Locked · Opens after your next mission" (a ready string: the prompt shows unknown keys as-is)
        const keyFn = () => { if (Hub.isUnlocked(b.id)) return b.useKey; const hint = Hub.lockShort(b.id); return hint ? G.t('hub.lockPrompt', { hint }) : 'hub.use.locked'; };
        const i1 = world.addInteract({ pos: e.door.clone().addScaledVector(e.dir, 0.6), r: 3.0, key: keyFn(), onUse: use });
        e.interacts = [i1];
        if (e.useAt && e.npc) { const i2 = world.addInteract({ pos: e.useAt.clone(), r: 2.4, key: keyFn(), onUse: use, enabled: () => Hub.isUnlocked(b.id) }); e.interacts.push(i2); }
        e.keyFn = keyFn;
      }
      world.addInteract({ pos: town.kiosk.door.clone(), r: 3.0, key: KIOSK.useKey, onUse: () => Hub.open('fountain') });
      if (town.locker) world.addInteract({ pos: town.locker.door.clone(), r: 2.4, key: 'hub.use.locker', onUse: () => Hub.openLocker() });
      syncLocks(town, world);
      // facilities opened since the last visit wait in a queue until Beepo has announced them
      const p0 = prof(), legacy = !(p0.hub && p0.hub.seenOpen && Object.keys(p0.hub.seenOpen).length) && ((p0.stats || {}).missions || 0) > 0;
      const h = hubState();
      for (const id in ALWAYS) h.seenOpen[id] = 1;
      // a save from before hub.seenOpen existed: what is open now was seen long ago (only what
      // G.Progress still lists as new gets announced)
      if (legacy) {
        let fresh = [];
        try { fresh = G.Progress && G.Progress.newUnlocks ? G.Progress.newUnlocks().map(u => (typeof u === 'string' ? u : u && (u.go || u.id))) : []; } catch (e) { fresh = []; }
        for (const b of BUILDINGS) if (Hub.isUnlocked(b.id) && !fresh.includes(b.id)) h.seenOpen[b.id] = 1;
      }
      S.newQ = []; S.newMarks = {}; S.newSrc = {}; S.bangWant = {}; S.tags = null; S.tagById = null; S.bubbleBox = null;
      S.annPending = null; S.annShown = 0; S.annRetry = 0; S.bubbleGhost = false; S.bubbleLow = false;
      queueNew();
      // player
      let spawn = new V3(0, 0, 21.5), yaw = 0;
      const at = params.at || S.lastBuilding;
      if (at && (town.byId[at] || at === 'fountain')) {
        const e = at === 'fountain' ? town.kiosk : town.byId[at];
        spawn = e.door.clone().addScaledVector(e.dir, at === 'fountain' ? 1.8 : 3.4);
        yaw = Math.atan2(e.dir.x, e.dir.z) + PI; // face away from the building, into the plaza
      }
      spawn.y = world.phys.groundAt(spawn.x, spawn.z, 0.3, 5);
      const stats = playerStats();
      const pl = new G.Player(world, { stats: stats || undefined, loadout: playerLoadout(), spawn, yaw, gadget: playerGadget() });
      world.player = pl; world.addActor(pl);
      S.player = pl;
      // town rules: practice fire only — nothing can be hurt here
      world.rules = { canDamage: () => false, onPickup: () => true };
      // Beepo
      const bp = makeNPC('companion');
      bp.group.position.set(spawn.x + 1, spawn.y + 1.6, spawn.z - 1.5);
      world.add(bp.group);
      S.beepo = { n: bp, pos: bp.group.position, vel: new V3(), t: 0 };
      placeBeepo(true);
      buildHud();
      S.offs.forEach(f => f()); S.offs = [];
      S.offs.push(G.bus.on('lang', () => {
        if (S.town) relabel(S.town); refreshHud(); syncLocks(S.town, S.world); refreshTags();
        if (S.bubble) S.bubble.hidden = true;   // (a line in the old language would linger otherwise)
        if (S.town) for (const e of S.town.buildings) for (const it of e.interacts || []) it.key = e.keyFn();
        for (const id in S.newMarks) putNewMark(id);   // the route markers' names too
        setTimeout(relayout, 0);
      }));
      S.offs.push(G.bus.on('resize', () => setTimeout(relayout, 60)), G.bus.on('screen', () => setTimeout(relayout, 60)));
      setTimeout(relayout, 0);
      S.offs.push(G.bus.on('ui-empty', () => { if (S.bubble) S.bubble.style.visibility = ''; if (G.Game.modeId === 'hub') { refreshHud(); S.lockTimer = 0; } }));
      // screens cover the town: keep Beepo's bubble out of their way
      S.offs.push(G.bus.on('ui-open', () => { if (S.bubble) S.bubble.style.visibility = 'hidden'; }));
      S.offs.push(G.bus.on('unlock', () => { S.lockTimer = 0; }));
      S.offs.push(G.bus.on('guild-up', () => { S.lockTimer = 0; }));
      if (G.HUD.setBolts) G.HUD.setBolts(prof().clinks || 0);
      S.slotsBuilt = false;
      // {reopen: screenId, reopenParams} — e.g. back from a Shop/Workshop "Try It" drill straight into that screen.
      if (params.reopen) {
        const ro = params.reopen, rp = params.reopenParams || {};
        setTimeout(() => { if (G.Game.modeId === 'hub' && !G.Game._switching && S.world === world && G.UI.defs[ro] && !G.UI.anyOpen()) G.UI.open(ro, Object.assign({ from: 'hub' }, rp)); }, 450);
      } else if (!params.quiet) setTimeout(() => {
        if (G.Game.modeId !== 'hub' || S.world !== world || G.UI.anyOpen() || S.newQ.length) return;
        // the welcome line greets the equipped ranger by name
        const key = Hub.suggestion().beepo || (Math.random() < 0.5 ? 'hub.beepo.hi' : 'hub.beepo.hi2');
        Hub.say(key, key === 'hub.beepo.hi' ? { params: { name: rangerName() } } : undefined);
      }, 900);
      G.Save.save();
      return world;
    },
    exit() {
      S.offs.forEach(f => f()); S.offs = [];
      if (LAY.ro) { LAY.ro.disconnect(); LAY.ro = null; } if (LAY.probe) LAY.probe.remove(); LAY.probe = null;
      S.world = null; S.town = null; S.player = null; S.beepo = null; S.bubble = null; S.hudTL = null; S.tags = null; S.cross = null;
      G.HUD.minimapDraw = null;
      // restore the default lighting state for the next mode
      G.R.setLighting({});
    },
    update(dt) {
      const world = S.world, town = S.town, pl = S.player; if (!world || !town || !pl) return;
      S.t += dt;
      // the weapon card needs G.Game.world, which is only set after enter() returns
      if (!S.slotsBuilt && G.Game.world === world && G.HUD.visible) { S.slotsBuilt = true; G.HUD.buildSlots(); }
      const t = world.time;
      town.update(dt, t);
      S.phase = (S.phase + dt / 720) % 1;
      applyDayNight(world, town, S.phase);
      // NPCs turn to face the player when near
      for (const o of town.npcs) {
        const dx = pl.pos.x - o.pos.x, dz = pl.pos.z - o.pos.z, d = Math.hypot(dx, dz);
        let want = o.base;
        if (d < 9) { const a = Math.atan2(dx, dz); const rel = U.clamp(U.wrapAngle(a - o.base), -1.1, 1.1); want = o.base + rel; }
        o.yaw = U.angleDamp(o.yaw, want, 5, dt);
        o.n.group.rotation.y = o.yaw;
        if (d < 5 && !o.greeted) { o.greeted = true; if (o.n.greet) G.safe('greet', () => o.n.greet()); if (G.Audio) G.Audio.sfxAt('npc', o.pos); }
        else if (d > 9) o.greeted = false;
      }
      // Beepo floats beside the player, bobbing, looking at the camera
      const bp = S.beepo;
      if (bp) {
        bp.t += dt;
        S.beepoT = (S.beepoT || 0) - dt;
        if (S.beepoT <= 0) { S.beepoT = 0.25; beepoClear(); }
        placeBeepo(false, dt);
        const cam = G.R.camera;
        bp.n.group.rotation.y = U.angleDamp(bp.n.group.rotation.y, Math.atan2(cam.position.x - bp.pos.x, cam.position.z - bp.pos.z), 6, dt);
        bp.n.group.rotation.z = Math.sin(bp.t * 1.7) * 0.08;
        if (bp.n.animate) { try { bp.n.animate(bp.t, dt); } catch (e) { G.safeFail('beepo anim', e); } }
      }
      // keep the player on the island — or on the harbour pier, between its rails out to the end
      const pr = Math.hypot(pl.pos.x, pl.pos.z);
      let onPier = false;
      const P = town.pier;
      if (P && pr > EDGE_R - 2) {
        const dx = pl.pos.x - P.x0, dz = pl.pos.z - P.z0, al = dx * P.ox + dz * P.oz, lat = dx * P.sx + dz * P.sz;
        // (sticky: a player who was on the pier last frame stays on it even after one long step sideways — a dash at a
        // low frame rate — instead of falling to the island-edge clamp, which would pull them back to the shore)
        if (al > 0 && al < P.len + (S.onPier ? 1.5 : 0) && Math.abs(lat) < P.hw + (S.onPier ? 1.2 : 0.3)) {
          onPier = true;
          if (pr > EDGE_R - 0.5) {
            const cl = U.clamp(lat, -P.hw, P.hw), ca = Math.min(al, P.len - 0.7);
            if (cl !== lat || ca !== al) {
              pl.pos.x = P.x0 + P.ox * ca + P.sx * cl; pl.pos.z = P.z0 + P.oz * ca + P.sz * cl;
              const vs = pl.vel.x * P.sx + pl.vel.z * P.sz, vo = pl.vel.x * P.ox + pl.vel.z * P.oz;
              if (cl !== lat && vs * lat > 0) { pl.vel.x -= P.sx * vs; pl.vel.z -= P.sz * vs; }
              if (ca !== al && vo > 0) { pl.vel.x -= P.ox * vo; pl.vel.z -= P.oz * vo; }
            }
          }
        }
      }
      S.onPier = onPier;
      if (!onPier && pr > EDGE_R) {
        const k = EDGE_R / pr; pl.pos.x *= k; pl.pos.z *= k;
        const vr = (pl.vel.x * pl.pos.x + pl.vel.z * pl.pos.z) / EDGE_R; if (vr > 0) { pl.vel.x -= (pl.pos.x / EDGE_R) * vr; pl.vel.z -= (pl.pos.z / EDGE_R) * vr; }
        if (!S.waterWarned) { S.waterWarned = true; Hub.say('hub.beepo.water'); }
      } else if (pr < EDGE_R - 6) S.waterWarned = false;
      // locked building nearby: the plate, the tag and the prompt carry the unlock condition; Beepo only
      // speaks up for a lock that opens some other way (no short hint)
      let nearLock = null;
      for (const e of town.buildings) {
        if (!e.lock) continue;
        const d = Math.hypot(pl.pos.x - e.door.x, pl.pos.z - e.door.z);
        if (d < 6) { nearLock = e.def.id; break; }
      }
      if (nearLock && nearLock !== S.nearLock && !Hub.lockShort(nearLock)) Hub.say(Hub.lockText(nearLock));
      S.nearLock = nearLock;
      // practice-fire hint; the crosshair shows only while practice-firing (no combat in town)
      const firing = pl.lastFireT > 0 && world.time - pl.lastFireT < 1.4;
      if (!S.firedHint && pl.lastFireT > 0 && world.time - pl.lastFireT < 0.2) { S.firedHint = true; Hub.say('hub.beepo.fire'); }
      if (S.cross && firing !== S.crossOn) { S.crossOn = firing; G.HUD.cfg.crosshair = firing; S.cross.hidden = !firing; }
      // Beepo's bubble: re-dock a few times a second (never over a sign) and count down; while faded out
      // over signs the line waits (up to 10 s, then it is dropped)
      const b = S.bubble;
      if (b && !b.hidden) {
        const vis = G.UI.anyOpen() ? 'hidden' : '';
        if (b.style.visibility !== vis) b.style.visibility = vis;
        S.dockT = (S.dockT || 0) - dt;
        if (S.dockT <= 0) { S.dockT = 0.25; wantLayout(); }   // (measured + re-docked after this frame's layout)
        if (S.bubbleGhost) S.ghostT = (S.ghostT || 0) + dt; else S.ghostT = 0;
        if (!S.bubbleGhost || S.ghostT > 10) S.bubbleT -= S.ghostT > 10 ? 99 : dt;
        if (S.bubbleT <= 0) { b.hidden = true; S.ghostT = 0; if (bp && bp.n.setExpr) G.safe('beepo expr', () => bp.n.setExpr('idle')); }
      }
      // facility name tags + new-facility route markers (dropped on arrival or after 45 s)
      updateTags();
      routeMarkers();
      annSeen(dt);
      if (S.annRetry > 0) S.annRetry -= dt;
      announceNew();
      for (const id in S.newMarks) {
        const e = town.byId[id];
        S.newMarks[id] -= dt;
        if (S.newMarks[id] <= 0 || (e && Math.hypot(pl.pos.x - e.door.x, pl.pos.z - e.door.z) < 7)) dropNewMark(id);
      }
      // periodic: locks, hints, HUD, bangs
      S.lockTimer -= dt;
      if (S.lockTimer <= 0) {
        S.lockTimer = 1.2;
        const changed = syncLocks(town, world);
        for (const e of town.buildings) for (const it of e.interacts || []) it.key = e.keyFn();
        if (changed.length) queueNew();   // opened while in town (e.g. a quest claim): announced in turn
        refreshHud();
        updateBangs();
        refreshTags();
        wantLayout();   // (HUD columns / touch buttons re-measured after this frame's layout)
      }
      if (G.HUD.setBolts) G.HUD.setBolts(prof().clinks || 0);
      if (!G.UI.anyOpen()) {
        S.nextHint -= dt;
        if (S.nextHint <= 0) {
          // a facility door close and in view: let the player read it, talk a little later
          if (facilityInView()) S.nextHint = 3 + Math.random() * 3;
          else {
            S.nextHint = 22 + Math.random() * 10;
            const s = Hub.suggestion();
            if (s.beepo && Math.random() < 0.6) Hub.say(s.beepo);
            else { S.idleIx = (S.idleIx % 6) + 1; Hub.say('hub.beepo.idle' + S.idleIx); }
          }
        }
      }
    },
  });

  // ------------------------------------------------------------------ title mode
  // The hero shot: from the beach beside the harbour pier, looking out over the bay — boats and buoys bobbing, gulls,
  // sandy islets, the Frostfizz and Peach Mesas sky islands (waterfall) above the horizon, hot-air balloons, big sky
  // behind the logo. The equipped ranger stands on a hover pad (lower right), Beepo floats in (left) and three of the
  // Gizmobs play on the sand (a hovering Bumbler, a bouncing Hopper, a rolling Rollo — happy faces, never a threat
  // here). Feet are placed where fixed screen anchors meet the beach (titleLayout: per aspect, on resize), so the
  // composition holds from 4:3 to 21:9; the camera only breathes a little (none with reduced motion).
  const TS = { world: null, town: null, beepo: null, t: 0, bots: [], fov: 50, ranger: null, sun0: new V3(0.45, 0.8, 0.35) };
  const TITLE = { pos: new V3(2.4, 3.0, 40.0), look: new V3(30.6, -4.4, 93.0), hfov: 90, sun: new V3(-0.2, 0.78, -0.6) };
  // [enemy id, screen x (NDC), ground distance (m; 0 = fitted into the band under the tap button), hover height]
  // (the one in the band under the tap button is built at 0.82 scale so it fits it whole; the Hopper bounces beside the
  // ranger, clear of the Settings button)
  const TITLE_BOTS = [['bumbler', -0.5, 6.4, 1.0], ['hopper', 0.83, 8.0, 0], ['rollo', -0.3, 0, 0]];
  const RANGER_AT = [0.53, 4.7, 1.15];   // the ranger's hover pad floats (screen x, distance, height)
  // (x anchors pull in a little on narrower frames, clear of the corner buttons: k = 0 at 4:3 .. 1 at 2:1 and wider)
  const titleX = (x, k) => x * (0.74 + 0.26 * k);
  const _tf = new V3(), _tr = new V3();
  // A point on the beach d m ahead of the base camera, nx across the screen (NDC) at that depth, lifted.
  function titleAt(out, nx, d, lift, L) {
    const z = d * Math.cos(L.pitch) + L.ch * Math.sin(L.pitch), s = titleX(nx, L.k) * L.th * z;
    out.copy(TITLE.pos).addScaledVector(_tf, d).addScaledVector(_tr, s);
    out.y = Math.max(visH(out.x, out.z), WATER_Y + 0.05) + lift;
    return out;
  }
  function titleLayout() {
    const aspect = G.R.w / Math.max(1, G.R.h);
    TS.fov = U.clamp(2 * Math.atan(Math.tan(TITLE.hfov * DEG / 2) / aspect) / DEG, 46, 64);
    _tf.subVectors(TITLE.look, TITLE.pos);
    const tv = Math.tan(TS.fov * DEG / 2);
    const L = { k: U.clamp((aspect - 1.333) / 0.667, 0, 1), pitch: Math.atan2(-_tf.y, Math.hypot(_tf.x, _tf.z)), ch: TITLE.pos.y - visH(TITLE.pos.x, TITLE.pos.z), th: tv * aspect };
    _tf.setY(0).normalize(); _tr.set(-_tf.z, 0, _tf.x);
    // the band under the tap button: a robot's top stays below 52 % of the half-height under the centre
    const btn = Math.tan(L.pitch + Math.atan(0.52 * tv));
    for (let i = 0; i < TS.bots.length; i++) {
      const b = TS.bots[i], H = (b.rb.height || 1) * 1.2;
      titleAt(b.base, b.nx, b.d > 0 ? b.d : Math.max(2.4, (L.ch - H) / btn), 0, L);
    }
    // (the menu is pixel-sized, so on short frames it covers more of the view: the ranger stands a little farther back
    // and in — smaller, clear of the Settings button — and on the shortest (320 px) steps right, clear of the tagline)
    const fh = G.R.h, sa = U.clamp((720 - fh) / 330, 0, 1), sb = U.clamp((400 - fh) / 80, 0, 1);
    if (TS.ranger) titleAt(TS.ranger.base, RANGER_AT[0] - 0.075 * sa + 0.15 * sb, RANGER_AT[1] + 1.2 * U.clamp((720 - fh) / 400, 0, 1), RANGER_AT[2], L);
  }
  function titleBots(world) {
    const E = G.Enemies, out = [];
    if (!E || !E.buildRobot || !E.defs) return out;
    for (let i = 0; i < TITLE_BOTS.length; i++) {
      const [id, nx, d, lift] = TITLE_BOTS[i], def = E.defs[id];
      if (!def) continue;
      const rb = G.safe('title bot', () => E.buildRobot(def, d > 0 ? 1 : 0.82, false, null));
      if (!rb || !rb.group) continue;
      world.add(rb.group);
      G.safe('title bot face', () => { if (rb.setExpr) rb.setExpr('happy'); });
      out.push({ id, rb, nx, d, lift, base: new V3(), ph: i * 2.3, opts: { speed: -0, expr: 'happy', vx: -0, vz: -0 } });
    }
    return out;
  }
  function dropTitleBots() {
    for (let i = 0; i < TS.bots.length; i++) { const rb = TS.bots[i].rb; if (rb.group.parent) rb.group.parent.remove(rb.group); if (rb.dispose) G.safe('title bot dispose', () => rb.dispose()); }
    TS.bots = [];
  }
  G.Game.register('title', {
    layout: 'menu',
    music: 'title',
    pausable: false,
    enter(params) {
      const world = makeWorld(true);
      TS.world = world; TS.town = world.town; TS.t = 0;
      // (no lock fences or plates on the title backdrop: it is a postcard of Fizzport, not a progress screen)
      const bp = makeNPC('companion');
      world.add(bp.group);
      TS.beepo = bp;
      TS.ranger = titleRanger(world);
      TS.bots = titleBots(world);
      titleLayout();
      TS.offs.forEach(f => f()); TS.offs = [
        // a new language relabels the backdrop's signs (the first-run picker changes it right here)
        G.bus.on('lang', () => { if (TS.town) G.safe('title relabel', () => relabel(TS.town)); }),
        // a save reset (or any new look) re-dresses the ranger
        G.bus.on('wardrobe', () => { if (!TS.world) return; dropTitleRanger(); TS.ranger = titleRanger(TS.world); titleLayout(); }),
        G.bus.on('resize', () => { if (TS.world) titleLayout(); }),
        G.bus.on('screen', () => { if (TS.world) titleLayout(); }),
      ];
      G.HUD.hide();
      applyDayNight(world, TS.town, 0.3);
      // the sun from behind the camera's left shoulder: the cast's faces are lit (the hub's own sun comes back with
      // the next world's light preset; exit resets the rig)
      TS.sun0.copy(G.R.light.uSunDir.value);
      G.R.light.uSunDir.value.copy(TITLE.sun).normalize();
      if (G.UI.defs.title) G.UI.open('title', params || {});
      return world;
    },
    exit() { TS.offs.forEach(f => f()); TS.offs = []; dropTitleRanger(); dropTitleBots(); TS.world = null; TS.town = null; TS.beepo = null; G.R.setLighting({ sunDir: TS.sun0 }); },
    update(dt) {
      const world = TS.world; if (!world) return;
      TS.t += dt;
      const t = TS.t;
      TS.town.update(dt, world.time);
      // the camera breathes round its base pose (a slow sway and bob; still with reduced motion)
      const cam = G.R.camera, rm = G.UI.reduced && G.UI.reduced() ? 0 : 1;
      _fwd.subVectors(TITLE.look, TITLE.pos).setY(0).normalize(); _right.set(-_fwd.z, 0, _fwd.x);
      cam.position.copy(TITLE.pos).addScaledVector(_right, Math.sin(t * 0.13) * 0.12 * rm).addScaledVector(_fwd, Math.sin(t * 0.071) * 0.2 * rm);
      cam.position.y += Math.sin(t * 0.09 + 1) * 0.16 * rm;
      _look.copy(TITLE.look).addScaledVector(_right, Math.sin(t * 0.05) * 1.0 * rm); _look.y += Math.sin(t * 0.07) * 0.5 * rm;
      cam.up.set(0, 1, 0);
      cam.lookAt(_look);
      if (Math.abs(cam.fov - TS.fov) > 0.1) { cam.fov = TS.fov; cam.updateProjectionMatrix(); }
      cam.getWorldDirection(_fwd);
      _right.crossVectors(_fwd, cam.up).normalize();
      _up.crossVectors(_right, _fwd).normalize();
      // Beepo hovers in the left of the frame, turning to the player
      if (TS.beepo) {
        const g = TS.beepo.group;
        const D = 3.6, halfH = Math.tan(TS.fov * DEG / 2) * D, halfW = halfH * (G.R.w / Math.max(1, G.R.h));
        g.position.copy(cam.position).addScaledVector(_fwd, D).addScaledVector(_right, -halfW * 0.7).addScaledVector(_up, halfH * 0.14 + Math.sin(t * 2.2) * 0.08);
        g.lookAt(cam.position);
        g.rotateY(0.35); g.rotateZ(Math.sin(t * 1.5) * 0.12);
        if (TS.beepo.animate) { try { TS.beepo.animate(t, dt); } catch (e) { G.safeFail('beepo anim', e); } }
      }
      // the equipped ranger on its hover pad on the sand (lower right), turned three-quarters to the player; waves hello
      // once the title is up, then idles (own gestures every few seconds)
      const rg = TS.ranger;
      if (rg) {
        rg.root.position.copy(rg.base); rg.root.position.y += Math.sin(t * 1.6) * 0.05 * rm;
        rg.root.rotation.set(0, Math.atan2(cam.position.x - rg.base.x, cam.position.z - rg.base.z) - 0.42 + Math.sin(t * 0.4) * 0.06 * rm, 0);
        try {
          if (rg.greetT > 0 && (rg.greetT -= dt) <= 0 && rg.n.greet) rg.n.greet();
          if (rg.n.animate) rg.n.animate(t, dt);
        } catch (e) { G.safeFail('ranger anim', e); }
        if (rg.glow) rg.glow.material.opacity = 0.45 + Math.sin(t * 3.1) * 0.12 * rm;
      }
      // the Gizmobs play: the Bumbler bobs in the air, the Hopper bounces on the spot, the Rollo rolls to and fro; all
      // keep turning back to the player with happy faces
      for (let i = 0; i < TS.bots.length; i++) {
        const b = TS.bots[i], g = b.rb.group, o = b.opts;
        let x = b.base.x, y = b.base.y + b.lift, z = b.base.z;
        o.speed = 0; o.vx = 0; o.vz = 0;
        if (b.id === 'hopper') { const p = (t * 0.62 + b.ph) % 1; if (p < 0.42) y += Math.sin((p / 0.42) * PI) * 0.55 * (rm ? 1 : 0.4); }
        else if (b.lift) y += Math.sin(t * 2.0 + b.ph) * 0.13 * rm;
        else if (rm) { const s = Math.sin(t * 0.55 + b.ph), v = Math.cos(t * 0.55 + b.ph) * 0.55 * 0.55; x += _right.x * s * 0.55; z += _right.z * s * 0.55; o.vx = _right.x * v; o.vz = _right.z * v; o.speed = Math.abs(v); }
        g.position.set(x, y, z);
        g.rotation.y = Math.atan2(cam.position.x - x, cam.position.z - z) + Math.sin(t * 0.37 + b.ph) * 0.35 * rm;
        if (G.Geo.animateRobot) { try { G.Geo.animateRobot(b.rb, o.speed > 0.05 ? 'move' : 'idle', t, dt, o); } catch (e) { G.safeFail('title bot anim', e); } }
      }
    },
  });
  const _look = new V3(), _fwd = new V3(), _right = new V3(), _up = new V3();
  TS.offs = [];
  // Title vignette: the equipped ranger (G.Wardrobe look, G.Geo.ranger model) standing on a small hover pad.
  // ~10 draw calls; the model's geometry is cached by the art kit, the pad is one merged mesh + one glow disc.
  let _padGeo = null;
  function titleRanger(world) {
    const W = G.Wardrobe;
    if (!G.Geo || !G.Geo.ranger || !W || !W.equipped) return null;
    const n = G.safe('title ranger', () => { const e = W.equipped(); return G.Geo.ranger(e.ranger, W.rangerColors(e.ranger, e.cw, e.gauntlet)); });
    if (!n || !n.group) return null;
    if (!_padGeo) {
      const Geo = G.Geo, parts = [];
      const put = (g, col, y) => { if (g.attributes.uv) g.deleteAttribute('uv'); g.translate(0, y, 0); Geo.colorize(g, col); parts.push(g); };
      put(new THREE.CylinderGeometry(0.52, 0.44, 0.13, 32), 0xb983ff, -0.065);
      put(new THREE.CylinderGeometry(0.54, 0.54, 0.035, 32), 0xfff6e6, 0.0);
      put(new THREE.TorusGeometry(0.54, 0.028, 6, 40).rotateX(PI / 2), 0xffd23f, 0.012);
      _padGeo = Geo.merge(parts); _padGeo.userData.shared = true;
    }
    const root = new THREE.Group(); root.name = 'title-ranger';
    const pad = new THREE.Mesh(_padGeo, G.M.vc({ rimStr: 0.35, spec: 0.5 })); pad.position.y = -0.02; root.add(pad);
    // (own additive material: its opacity pulses, a cached glow material is shared with other meshes)
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.64, 32).rotateX(-PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x9ff6ff, map: G.R.glowTex(), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    glow.position.y = -0.15; glow.renderOrder = 4; root.add(glow);
    n.group.position.y = 0.02; root.add(n.group);
    world.add(root);
    return { root, n, glow, greetT: 0.9, base: new V3() };
  }
  function dropTitleRanger() {
    const rg = TS.ranger; TS.ranger = null;
    if (!rg) return;
    if (rg.root.parent) rg.root.parent.remove(rg.root);
    rg.glow.geometry.dispose(); rg.glow.material.dispose();
    if (rg.n.dispose) G.safe('ranger dispose', () => rg.n.dispose());
  }

  // exposed for tests / other modules
  Hub._state = S;
  Hub._signRects = () => signRects().map(r => ({ l: r.l, t: r.t, r: r.r, b: r.b }));
  Hub._town = () => S.town;
  Hub.ringRadius = RING;
})(window.G);

}).call(window); } catch (e) { console.error('[module 20_hub.js]', e); }
// ---- 21_expedition.js
try { (function () {
// 21_expedition.js — PvE core shared by Expedition (21c), Boss Hunt (21d) and Fountain Guard (22):
// strings (exp.* / mission.*), biome presets (GDD §2.3), mission catalogue (§11a), difficulty + Heat
// (§4.5), run inventory + pickup rules, KO/respawn helper (§4.4), rewards/results flow (§9.2, §13.5),
// save records, spawn wrappers around G.Enemies (with tiny local fallbacks used only while the enemies
// module is missing), and small art helpers.
//
// PUBLIC (G.Exp):
//   BIOMES{shoals,mesas,grotto,frost,junk}  MISSIONS[]  mission(id)  boardMissions(seed?) -> 4 missions
//   HEAT[]  DIFFS[]  diffInfo(d)  pr()  guildStar()  allUnlocked()  isUnlocked(m)  parTime(m, heat)
//   storyRec(id)  bossRec(id)  waveRec()  sprocketHas(idx)  sprocketAdd(idx)
//   roster(star, biome)  tier(type)  threat(type, elite)
//   spawnEnemy(world, type, pos, opts)  spawnBoss(world, id, pos, opts)  spawnCrate(world, kind, pos, opts)
//   alert(actor, target)  isAlerted(actor)
//   Run (class) — run inventory {clinks, parts{}, lumite, pops, elites, crates, kos, damage, combo...}
//   pickupRule(run, ctx) -> world.rules.onPickup implementation
//   KO(world, run, opts) -> KO/respawn controller {update(dt), respawnAt}
//   finish({mode, win, stars, stats, run, result, params, title}) -> grants rewards, emits mode-result,
//       opens the shared 'results' screen (fallback panel 'exp-results' if missing).
//   beepo(key, params)  partName(id)  kitMesh(kit)  icon(name)  fmt(sec)
(function (G) {
  'use strict';
  const U = G.util;
  const V3 = THREE.Vector3;
  const _v = new V3(), _v2 = new V3();

  G.i18n.add('en', {
    'exp.title': 'Expedition', 'exp.select.title': 'Mission Board', 'exp.tab.story': 'Story', 'exp.tab.board': 'Board',
    'exp.biome.shoals': 'Sunny Shoals', 'exp.biome.mesas': 'Peach Mesas', 'exp.biome.grotto': 'Glowcap Grotto', 'exp.biome.frost': 'Frostfizz Bluffs', 'exp.biome.junk': 'Junkyard Rim',
    'mission.s1_1': 'Splashdown', 'mission.s1_2': 'Spring Fever', 'mission.s1_3': 'King of the Pinch',
    'mission.s2_1': 'Ribbon Ready', 'mission.s2_2': 'Totem Trouble', 'mission.s2_3': 'Crab Rave Crash',
    'mission.s3_1': 'Lights Out', 'mission.s3_2': 'Cart Wheels', 'mission.s3_3': 'Hive Alive',
    'mission.s4_1': 'Snow Patrol', 'mission.s4_2': 'Brrr-uiser Base', 'mission.s4_3': 'Cold Snap Gauntlet',
    'mission.s5_1': 'Factory Floor', 'mission.s5_2': 'Conveyor Chaos', 'mission.s5_3': 'Mayor Mayhem',
    'mission.board.sweep': 'Bot Roundup', 'mission.board.parts': 'Parts Hunt', 'mission.board.totem': 'Totem Smash',
    'mission.board.rescue': 'Puffle Patrol', 'mission.board.escort': 'Cart Convoy', 'mission.board.elitecamps': 'Elite Raid',
    'exp.obj.sweep': 'Scrap Sweep', 'exp.obj.parts': 'Parts Run', 'exp.obj.totem': 'Totem Topple', 'exp.obj.rescue': 'Critter Rescue',
    'exp.obj.escort': 'Escort', 'exp.obj.boss': 'Boss Lair', 'exp.obj.reach': 'Ribbon Hunt', 'exp.obj.elitecamps': 'Elite Camps', 'exp.obj.extract': 'Extraction',
    'exp.goal.sweep': 'Pop {n} bots', 'exp.goal.parts': 'Collect {n} × {part}', 'exp.goal.totem': 'Topple {n} Junk Totems',
    'exp.goal.rescue': 'Free {n} caged Puffles', 'exp.goal.escort': 'Guard Beepo\'s cart to the pad', 'exp.goal.boss': 'Defeat {name}',
    'exp.goal.reach': 'Reach the cache on the tallest mesa', 'exp.goal.elitecamps': 'Clear {n} elite camps',
    'exp.prog.sweep': 'Bots popped {a}/{b}', 'exp.prog.parts': '{part} {a}/{b}', 'exp.prog.totem': 'Totems {a}/{b}', 'exp.prog.rescue': 'Puffles freed {a}/{b}',
    'exp.prog.escort': 'Cart {a}%', 'exp.prog.escortWait': 'Cart {a}% · stay close!', 'exp.prog.escortBroken': 'Cart broke down! Fix it!',
    'exp.prog.boss': 'Find the lair', 'exp.prog.bossFight': '{name}', 'exp.prog.reach': 'Climb to the cache', 'exp.prog.elitecamps': 'Camps cleared {a}/{b}',
    'exp.bonus': 'Bonus', 'exp.bonus.sprocket': 'Find a Star Sprocket', 'exp.bonus.noko': 'No KOs', 'exp.bonus.par': 'Finish under par',
    'exp.bonus.elites': 'Pop 3 elites', 'exp.bonus.crates': 'Break 15 crates', 'exp.bonusDone': 'Bonus complete!',
    'exp.extract.call': 'Beepo is calling the Lift Balloon!', 'exp.extract.arrive': 'Balloon lands in {n}s', 'exp.extract.go': 'Stand on the pad!',
    'exp.extract.hold': 'Hold the pad: {n}s', 'exp.extract.wave': 'Bots incoming! Hold on!', 'exp.liftoff': 'Lift-off!',
    'exp.bonked': 'Bonked!', 'exp.bonkedSub': 'Back to the beacon in {n}…', 'exp.badges': 'Badges left: {n}', 'exp.failed': 'Out of badges!',
    'exp.checkpoint': 'Beacon activated!', 'exp.sprocket': 'Star Sprocket found!', 'exp.sprocketOld': 'Star Sprocket (already found)',
    'exp.alarm': 'Alarm!', 'exp.totemDown': 'Totem toppled!', 'exp.freed': 'Puffle freed!', 'exp.campClear': 'Camp cleared!',
    'exp.cache': 'Ribbon cache found!', 'exp.cartFixed': 'Cart fixed!', 'exp.objDone': 'Objective complete!',
    'exp.int.kiosk': 'Field Kiosk', 'exp.int.free': 'Free the Puffle', 'exp.int.freeing': 'Freeing… {n}%', 'exp.int.cache': 'Open the cache', 'exp.int.repair': 'Fix the cart', 'exp.int.fixing': 'Fixing… {n}%',
    'exp.kiosk.title': 'Field Kiosk', 'exp.kiosk.refill': 'Refill all ammo', 'exp.kiosk.pop': 'Health Pop (+50)', 'exp.kiosk.shield': 'Shield Cell (+25)',
    'exp.kiosk.noMoney': 'Not enough clinks!', 'exp.kiosk.full': 'Already full!', 'exp.kiosk.hint': 'Paid from this run\'s clinks first.',
    'exp.hint.sweep': 'Bots everywhere! Pop them and grab the clinks!', 'exp.hint.parts': 'I need {part}! Bots and crates drop them.',
    'exp.hint.totem': 'Junk Totems keep making bots. Topple them!', 'exp.hint.rescue': 'Puffles are trapped in cages! Let\'s free them!',
    'exp.hint.escort': 'Stay close and I\'ll roll along. Keep the bots off me!', 'exp.hint.boss': 'Something big is out there… find its lair!',
    'exp.hint.reach': 'The Ribbon cache is on the tallest mesa. Use the ramps and jump pads!', 'exp.hint.elitecamps': 'Three elite camps! Crowned bots are tough!',
    'exp.hint.crates': 'Smash crates for clinks!', 'exp.hint.beacon': 'Touch beacons to save your spot!', 'exp.hint.sprocket': 'Ooh, something shiny is near…',
    'exp.hint.alarm': 'Uh-oh, the alarm is ringing!', 'exp.hint.extract': 'Great work! Head to the balloon!', 'exp.hint.jumppad': 'Bouncy pads go way up!',
    'exp.stat.time': 'Time', 'exp.stat.pops': 'Bots popped', 'exp.stat.crates': 'Crates broken', 'exp.stat.kos': 'Bonks', 'exp.stat.damage': 'Damage taken',
    'exp.stat.sprockets': 'Star Sprockets', 'exp.stat.score': 'Score', 'exp.stat.medal': 'Medal', 'exp.stat.bonus': 'Bonus', 'exp.stat.par': 'Par',
    'exp.stat.elites': 'Elites popped', 'exp.stat.clinks': 'Clinks collected', 'exp.yes': 'Yes!', 'exp.no': '—',
    'exp.res.clear': 'Mission Clear!', 'exp.res.fail': 'Great run!', 'exp.res.tip': 'Tip: touch every beacon you pass!', 'exp.res.retry': 'Retry', 'exp.res.continue': 'Continue',
    'exp.diff': 'Difficulty', 'exp.heat': 'Heat', 'exp.heat.locked': 'Heat unlocks at Rank {n}', 'exp.locked.rank': 'Rank {n}',
    'exp.heat.armored': 'Armored Bots', 'exp.heat.zippy': 'Zippy Bots', 'exp.heat.noregen': 'No Shield Regen', 'exp.heat.tight': 'Tight Timer', 'exp.heat.swarm': 'Elite Swarm',
    'exp.heat.armored.d': '+30% bot HP', 'exp.heat.zippy.d': '+20% bot speed', 'exp.heat.noregen.d': 'Your shield won\'t recharge', 'exp.heat.tight.d': 'Par −25%', 'exp.heat.swarm.d': '+20% elites',
    'exp.start': 'Start!', 'exp.rewards': 'Rewards', 'exp.par': 'Par {t}', 'exp.best': 'Best', 'exp.locked': 'Clear the mission before this one',
    'exp.lockedBiome': 'Reach Guild ★{n}', 'exp.board.refresh': 'New missions in {m} min', 'exp.board.breezy': 'Easy pick', 'exp.board.loot': 'Loot ×1.5',
    'exp.stars': '★{n}', 'exp.objective': 'Objective', 'exp.medal.none': 'No medal yet', 'exp.unlockAll': 'All unlocked',
    'exp.pn.scrap': 'Scrap Plate', 'exp.pn.spring': 'Coil Spring', 'exp.pn.wire': 'Wire Noodle', 'exp.pn.gel': 'Goo Gel', 'exp.pn.chip': 'Circuit Chip',
    'exp.pn.fuel': 'Fizz Fuel', 'exp.pn.crystal': 'Coral Crystal', 'exp.pn.servo': 'Servo Motor', 'exp.pn.lens': 'Focus Lens', 'exp.pn.core': 'Gizmo Core',
    'exp.pn.lumite': 'Lumite', 'exp.pn.claw': 'Crankcrab Claw', 'exp.pn.heart': 'Hive Heart', 'exp.pn.medal': 'Mox Medallion',
    'exp.clinks': '+{n} clinks', 'exp.combo': '×{n}',
  });
  G.i18n.add('ja', {
    'exp.title': 'たんけん', 'exp.select.title': 'ミッションボード', 'exp.tab.story': 'ストーリー', 'exp.tab.board': 'ボード',
    'exp.biome.shoals': 'サニーショール', 'exp.biome.mesas': 'ピーチメサ', 'exp.biome.grotto': 'ヒカリタケのもり', 'exp.biome.frost': 'フロストフィズのがけ', 'exp.biome.junk': 'ガラクタ・リム',
    'mission.s1_1': 'スプラッシュダウン', 'mission.s1_2': 'バネバネだいさくせん', 'mission.s1_3': 'ハサミのおうさま',
    'mission.s2_1': 'リボンをさがせ', 'mission.s2_2': 'トーテムだいさわぎ', 'mission.s2_3': 'カニカニだいパニック',
    'mission.s3_1': 'まっくらレスキュー', 'mission.s3_2': 'コロコロごえい', 'mission.s3_3': 'ハチのすブンブン',
    'mission.s4_1': 'ゆきのパトロール', 'mission.s4_2': 'ブルブル・ブルーザーきち', 'mission.s4_3': 'ひえひえだいしれん',
    'mission.s5_1': 'こうじょうフロア', 'mission.s5_2': 'ベルトコンベアだいこんらん', 'mission.s5_3': 'しちょうだいあばれ',
    'mission.board.sweep': 'ボットいっせいポップ', 'mission.board.parts': 'パーツあつめ', 'mission.board.totem': 'トーテムこわし',
    'mission.board.rescue': 'パッフルパトロール', 'mission.board.escort': 'カートごえい', 'mission.board.elitecamps': 'エリートしゅうげき',
    'exp.obj.sweep': 'スクラップスイープ', 'exp.obj.parts': 'パーツラン', 'exp.obj.totem': 'トーテムたおし', 'exp.obj.rescue': 'パッフルきゅうしゅつ',
    'exp.obj.escort': 'ごえい', 'exp.obj.boss': 'ボスのすみか', 'exp.obj.reach': 'リボンさがし', 'exp.obj.elitecamps': 'エリートキャンプ', 'exp.obj.extract': 'だっしゅつ',
    'exp.goal.sweep': 'ボットを{n}たいポップしよう', 'exp.goal.parts': '{part}を{n}こあつめよう', 'exp.goal.totem': 'ガラクタトーテムを{n}つたおそう',
    'exp.goal.rescue': 'とじこめられたパッフルを{n}ひきたすけよう', 'exp.goal.escort': 'ビーポのカートをまもってパッドまではこぼう', 'exp.goal.boss': '{name}をやっつけよう',
    'exp.goal.reach': 'いちばん高いメサの上のたからばこへ', 'exp.goal.elitecamps': 'エリートキャンプを{n}つかたづけよう',
    'exp.prog.sweep': 'ポップしたボット {a}/{b}', 'exp.prog.parts': '{part} {a}/{b}', 'exp.prog.totem': 'トーテム {a}/{b}', 'exp.prog.rescue': 'たすけたパッフル {a}/{b}',
    'exp.prog.escort': 'カート {a}%', 'exp.prog.escortWait': 'カート {a}%・ちかくにいてね！', 'exp.prog.escortBroken': 'カートがこしょう！なおして！',
    'exp.prog.boss': 'すみかをさがそう', 'exp.prog.bossFight': '{name}', 'exp.prog.reach': 'たからばこまでのぼろう', 'exp.prog.elitecamps': 'キャンプ {a}/{b}',
    'exp.bonus': 'ボーナス', 'exp.bonus.sprocket': 'スタースプロケットを見つける', 'exp.bonus.noko': 'いちどもやられない', 'exp.bonus.par': 'めやすタイムいない',
    'exp.bonus.elites': 'エリートを3たいポップ', 'exp.bonus.crates': 'はこを15こわる', 'exp.bonusDone': 'ボーナスたっせい！',
    'exp.extract.call': 'ビーポがリフトバルーンをよんだよ！', 'exp.extract.arrive': 'バルーンとうちゃくまで {n}びょう', 'exp.extract.go': 'パッドの上にのって！',
    'exp.extract.hold': 'パッドをまもれ：のこり{n}びょう', 'exp.extract.wave': 'ボットがくるよ！がんばって！', 'exp.liftoff': 'しゅっぱーつ！',
    'exp.bonked': 'ボンッ！', 'exp.bonkedSub': '{n}びょうでビーコンにもどるよ…', 'exp.badges': 'のこりバッジ：{n}', 'exp.failed': 'バッジがなくなった！',
    'exp.checkpoint': 'ビーコンをセットした！', 'exp.sprocket': 'スタースプロケットを見つけた！', 'exp.sprocketOld': 'スタースプロケット（見つけずみ）',
    'exp.alarm': 'けいほう！', 'exp.totemDown': 'トーテムをたおした！', 'exp.freed': 'パッフルをたすけた！', 'exp.campClear': 'キャンプをかたづけた！',
    'exp.cache': 'リボンのたからばこを見つけた！', 'exp.cartFixed': 'カートをなおした！', 'exp.objDone': 'もくひょうたっせい！',
    'exp.int.kiosk': 'フィールドショップ', 'exp.int.free': 'パッフルをたすける', 'exp.int.freeing': 'たすけちゅう… {n}%', 'exp.int.cache': 'たからばこをあける', 'exp.int.repair': 'カートをなおす', 'exp.int.fixing': 'なおしちゅう… {n}%',
    'exp.kiosk.title': 'フィールドショップ', 'exp.kiosk.refill': 'ぜんぶのたまをほじゅう', 'exp.kiosk.pop': 'ヘルスポップ（+50）', 'exp.kiosk.shield': 'シールドセル（+25）',
    'exp.kiosk.noMoney': 'クリンクがたりないよ！', 'exp.kiosk.full': 'もういっぱいだよ！', 'exp.kiosk.hint': 'このプレイでひろったクリンクからはらうよ。',
    'exp.hint.sweep': 'ボットがいっぱい！ポップしてクリンクをあつめよう！', 'exp.hint.parts': '{part}がほしいな！ボットやはこから出るよ。',
    'exp.hint.totem': 'ガラクタトーテムがボットをつくってる！たおそう！', 'exp.hint.rescue': 'パッフルがおりにとじこめられてる！たすけよう！',
    'exp.hint.escort': 'ちかくにいてくれたらすすむよ。ボットからまもってね！', 'exp.hint.boss': 'なにか大きいのがいる…すみかをさがそう！',
    'exp.hint.reach': 'たからばこはいちばん高いメサの上！スロープとジャンプパッドをつかおう！', 'exp.hint.elitecamps': 'エリートキャンプが3つ！かんむりのボットはつよいよ！',
    'exp.hint.crates': 'はこをわるとクリンクが出るよ！', 'exp.hint.beacon': 'ビーコンにさわるとそこからやりなおせるよ！', 'exp.hint.sprocket': 'おっ、ちかくになにかキラキラしてる…',
    'exp.hint.alarm': 'わわっ、けいほうがなってる！', 'exp.hint.extract': 'やったね！バルーンにむかおう！', 'exp.hint.jumppad': 'ジャンプパッドでたかーくとべるよ！',
    'exp.stat.time': 'タイム', 'exp.stat.pops': 'ポップしたボット', 'exp.stat.crates': 'わったはこ', 'exp.stat.kos': 'ボンッ', 'exp.stat.damage': 'うけたダメージ',
    'exp.stat.sprockets': 'スタースプロケット', 'exp.stat.score': 'スコア', 'exp.stat.medal': 'メダル', 'exp.stat.bonus': 'ボーナス', 'exp.stat.par': 'めやす',
    'exp.stat.elites': 'エリート', 'exp.stat.clinks': 'ひろったクリンク', 'exp.yes': 'やったね！', 'exp.no': '—',
    'exp.res.clear': 'ミッションクリア！', 'exp.res.fail': 'ナイスファイト！', 'exp.res.tip': 'ヒント：とおったビーコンにはぜんぶさわろう！', 'exp.res.retry': 'もう一度', 'exp.res.continue': 'つづける',
    'exp.diff': 'むずかしさ', 'exp.heat': 'ヒート', 'exp.heat.locked': 'ヒートはランク{n}でかいほう', 'exp.locked.rank': 'ランク{n}',
    'exp.heat.armored': 'カチカチボット', 'exp.heat.zippy': 'すばやいボット', 'exp.heat.noregen': 'シールドかいふくなし', 'exp.heat.tight': 'きびしいタイム', 'exp.heat.swarm': 'エリートだらけ',
    'exp.heat.armored.d': 'ボットのHP +30%', 'exp.heat.zippy.d': 'ボットのはやさ +20%', 'exp.heat.noregen.d': 'シールドがかいふくしない', 'exp.heat.tight.d': 'めやすタイム −25%', 'exp.heat.swarm.d': 'エリート +20%',
    'exp.start': 'スタート！', 'exp.rewards': 'ほうしゅう', 'exp.par': 'めやす {t}', 'exp.best': 'ベスト', 'exp.locked': 'ひとつまえのミッションをクリアしよう',
    'exp.lockedBiome': 'ギルド★{n}でかいほう', 'exp.board.refresh': 'あと{m}ふんで入れかわるよ', 'exp.board.breezy': 'かんたん', 'exp.board.loot': 'おたから×1.5',
    'exp.stars': '★{n}', 'exp.objective': 'もくひょう', 'exp.medal.none': 'メダルなし', 'exp.unlockAll': 'ぜんぶかいほう',
    'exp.pn.scrap': 'スクラッププレート', 'exp.pn.spring': 'コイルバネ', 'exp.pn.wire': 'ワイヤーヌードル', 'exp.pn.gel': 'グージェル', 'exp.pn.chip': 'かいろチップ',
    'exp.pn.fuel': 'フィズねんりょう', 'exp.pn.crystal': 'サンゴクリスタル', 'exp.pn.servo': 'サーボモーター', 'exp.pn.lens': 'フォーカスレンズ', 'exp.pn.core': 'ギズモコア',
    'exp.pn.lumite': 'ルマイト', 'exp.pn.claw': 'クランククラブのハサミ', 'exp.pn.heart': 'ハイブハート', 'exp.pn.medal': 'モックスメダル',
    'exp.clinks': '+{n} クリンク', 'exp.combo': '×{n}',
  });

  const X = G.Exp = G.Exp || {};
  const Geo = () => G.Geo || {};

  // ===================================================================== biomes (GDD §2.3)
  const BANDS = [0xf7e1b5, 0xf2b98a, 0xe88a5a, 0xc9624a, 0xd97b7b, 0x9e4b45];
  const SUN = new V3(0.5, 0.74, 0.45).normalize();
  X.BIOMES = {
    shoals: {
      id: 'shoals', star: 1, base: 'meadow', css: ['#2fa8e8', '#9ae4f7', '#6ccb5f', '#f7e3b0'], spr: 0,
      // bright tropical noon: saturated blue to a clear aqua horizon, a big lit cumulus bank, floating islands far out,
      // a faint rainbow framing the first mission's spawn view; the sun stands behind the landing pad (front-lit view)
      sky: { top: 0x1c8ce0, mid: 0x46bdf4, horizon: 0xa6e4fa, bottom: 0xa6e4fa, sun: 0xfffbe8, halo: 0xffe2a0, sunDir: new V3(-0.614, 0.788, 0.047), clouds: true, cloudColor: 0xffffff,
        belly: 0xc4ccf2, cover: 0.1, far: 'islands', farA: 0x6fa0c8, farB: 0x8fdc8a, rainbow: 0.28, rainbowDir: new V3(0.635, -0.22, 0.773) },
      light: { sunDir: new V3(-0.614, 0.788, 0.047), sun: 0xfff0d0, sky: 0xd8f0ff, ground: 0xf0d4a0, shadow: 0x5878d8, shadowK: 0.45, exposure: 1.03, rim: 0xfff2d4,
        grade: { sat: 0.2, contrast: 0.1, tint: 0xfff2dc, tintK: 0.035 },
        surf: { grass: 1, sand: 1, strata: 0.8, foam: 1, accent: 0xff7aa8, accent2: 0xffd84a, ao: [1.1, 1.0, 0.85], contact: 0x1e3a6a } },
      fog: { color: 0xa6e4fa, near: 60, far: 260 },
      water: { shallow: 0x6ff0e0, deep: 0x0f86c8 },
      terr: { amp: 9, f: 0.011, terrace: 0, ridge: 0.3 },
      // big sun-bleached fields drift toward dune sand (warm), so the meadow reads as a beach island
      paint: { ground: [0x5dbd5c, 0x6ccb5f, 0xa8e06a], patch: 0xff9fd0, patchK: 0.8, shade: 0x3a8f7a, cliff: BANDS, beach: [0xd9a86c, 0xf7e3b0], path: 0xf2deae, warm: 0xf4dca6, macroK: 1.35 },
      // (inland trees a little sparser than before: the coast now carries a belt of beach palms + tide pools)
      // (beach: 0 — the shells and starfish on the sand now come from the island's camera-windowed clutter field, which
      // draws only the ones near the player instead of every one on the island at High; High flowers 13 -> 11, bushes
      // 4.4 -> 4.2 and mushrooms 1.2 -> 1.0 make room for its candy-flower bushes in a camp fight)
      dress: { mesas: 0.25, arches: 0.4, bigRocks: 4, rockPal: 'sand', treeD: 3.5, bushes: 4.2, flowers: 11, tufts: 120, corals: 0, beach: 0, bigFlowers: 0.8, mushrooms: 1.0,
        trees: [{ kind: 'round', palette: 'green', seed: 1 }, { kind: 'palm', seed: 2, lite: true }, { kind: 'round', palette: 'pink', seed: 4 }, { kind: 'palm', seed: 5, palette: 'lime', lite: true }], bushColors: [0x5cc85a, 0x7ad35a], flowerColors: [[0xff7a93, 0xffd45c, 0xffffff], [0xb983ff, 0xff8a4c, 0xfff1b8]], mushCaps: [0xff6f91, 0xffb37a], bigFlowerColors: [0xff7a93, 0xffd45c] },
      // lite: dress overrides below High quality (render budget with the full robot cap in view)
      lite: { treeD: 3.4, bushes: 4.2, tufts: 90, flowers: 10 },
      roster: ['bumbler', 'hopper', 'rollo', 'squirt'], stacks: 7, emblem: '#ff9fd0', corals: 6,
      // signature set pieces: a candy-stripe lighthouse + jetty on a headland in view of the landing pad,
      // beach palms leaning over the surf, tide pools along the sand
      landmark: { kind: 'lighthouse', coast: true, foot: 6, h: 18 }, coast: { palms: 14, pools: 6, spots: 6 },
    },
    mesas: {
      id: 'mesas', star: 2, base: 'reef', css: ['#47b4ee', '#ffe7c9', '#e88a5a', '#ebc786'], spr: 3,
      // warm apricot late afternoon: a low sun in view beside the first spawn, sunset streaks, heat shimmer on the
      // horizon, banded buttes far off; side light from the right with violet shade (complements the orange rock)
      sky: { top: 0x3aa2ec, mid: 0x8ccdf2, horizon: 0xffcf9e, bottom: 0xffcf9e, sun: 0xfff6dc, halo: 0xffa868, sunDir: new V3(-0.201, 0.139, -0.969), sunSize: 0.0016, clouds: true, cloudColor: 0xfff4ea,
        belly: 0xf2c4cc, cover: -0.06, far: 'mesas', farA: 0xd9805e, farB: 0xf0b080, streaks: 0.55, band: 0xff9a78, shimmer: 1 },
      light: { sunDir: new V3(0.614, 0.707, -0.35), sun: 0xffe4bc, sky: 0xffe6d6, ground: 0xf4bc90, shadow: 0x8a5cc4, shadowK: 0.46, exposure: 1.02, rim: 0xffd8a8,
        grade: { sat: 0.13, contrast: 0.12, tint: 0xffd4a8, tintK: 0.04 },   // (sand kept near its old saturation: robots read on it)
        surf: { grass: 1, sand: 1, strata: 1, foam: 1, accent: 0xffd84a, accent2: 0xff9a5a, ao: [0.86, 1.0, 1.18], contact: 0x5a2a50 } },
      fog: { color: 0xffcf9e, near: 60, far: 240 },
      water: { shallow: 0x5ce8dc, deep: 0x1a8ac0 },
      terr: { amp: 11, f: 0.0105, terrace: 3.5, ridge: 0.45 },
      paint: { ground: [0xe2b878, 0xebc786, 0xf2d49a], patch: 0xa8c95f, patchK: 0.7, shade: 0xe0a070, cliff: BANDS, cliffS: 0.24, beach: [0xd9a86c, 0xf7e3b0], path: 0xf7e8c4 },
      // desert blooms (round cacti and flowering rosettes in pinks / sunny yellows) replace part of the bushes
      dress: { mesas: 1.5, arches: 0.8, bigRocks: 5, rockPal: 'sand', treeD: 1.6, trees: [{ kind: 'palm', seed: 1, lite: true }, { kind: 'palm', seed: 5, palette: 'lime', lite: true }], bushes: 5,
        bushColors: [0xa8c95f, 0x8ab84a], tufts: 80, tuft: [0x9ab84a, 0xdde08a], corals: 0, beach: 0, flowers: 4, bands: BANDS, mesaCap: 0xa8c95f, horizon: [0xf2b98a, 0xe88a5a, 0xc9624a, 0xffd8b0],
        // (blooms 5 -> 2.5: the barrel cacti and rosettes of the clutter field now crowd the sand around the player)
        blooms: 2.5, bloomColors: [0xff7a93, 0xffd45c, 0xff9a5a] },
      lite: { blooms: 2.5, bushes: 4 },
      roster: ['bumbler', 'hopper', 'rollo', 'squirt', 'shieldy', 'gnat', 'lobba'], stacks: 5, emblem: '#e88a5a', extraMesas: 7,
      // the Peach Gate: a giant banded arch flanked by balanced-rock hoodoos, in view of the landing pad
      landmark: { kind: 'arch', foot: 12.5, h: 22, dist: [55, 85] }, hoodoos: 5,
    },
    grotto: {
      id: 'grotto', star: 3, base: 'night', night: true, css: ['#1b1f4d', '#3e3f8f', '#3a8f7a', '#5cffe1'], spr: 6,
      // teal-violet twilight: the moon low in view of the first spawn (where the light comes from), aurora ribbons,
      // drifting glow motes, giant mushroom silhouettes with glowing caps along the horizon
      sky: { top: 0x141a48, mid: 0x2a2a78, horizon: 0x4a3f9a, bottom: 0x2b3170, sun: 0xeef4ff, halo: 0x9fb7ff, sunDir: new V3(-0.676, 0.292, -0.676), sunSize: 0.0016, clouds: true, cloudColor: 0x8e88dc, stars: true, nebula: 0x3a2a7a,
        belly: 0xa8a2e4, cover: -0.05, far: 'mushrooms', farA: 0x2c2a6c, farB: 0xb860e0, aurora: 0.6, auroraCol: [0x46f0c4, 0xc070ff], motes: 0.35 },
      // exposure 1.1, a cooler sun and a teal-leaning sky term (was 1.22 / 0xc8daff / 0xa8b4ff): the teal ground
      // kept clipping to one flat blue-cyan (High, lower third of the spawn view: mean RGB 56,135,204 → 48,127,180)
      // (a lilac moon over violet bounce light: the cyan glows and the pink / violet / peach caps read against it
      // instead of everything sinking into one blue; was sun 0xb8c8f8, sky 0x98c0f0, ground 0x6468b8)
      light: { sunDir: new V3(-0.4, 0.75, -0.5).normalize(), sun: 0xc8c4f8, sky: 0xa0a8ec, ground: 0x7a5cb0, shadow: 0x3a348e, shadowK: 0.4, exposure: 1.1, rim: 0xa8f0ff,
        grade: { sat: 0.24, contrast: 0.1, tint: 0xc0b0ff, tintK: 0.05, bloom: 1.6, vignette: 0.18, lift: 0x080618 },
        surf: { grass: 0, moss: 1, strata: 0.8, foam: 0.6, accent: 0x6af4ff, accent2: 0xd29aff, ao: [1.1, 1.0, 0.85], contact: 0x0c1030 } },
      // fog matches the horizon glow (was a darker navy that flattened everything past 45 m into one blue)
      fog: { color: 0x4a3f9a, near: 55, far: 195 },
      water: { shallow: 0x3fd0d8, deep: 0x1a3a8a },
      terr: { amp: 11, f: 0.012, terrace: 0, ridge: 0.45 },
      paint: { ground: [0x2c8474, 0x38a088, 0x52bc98], patch: 0x8a62d0, patchK: 0.55, shade: 0x2a5f7a, cliff: [0x8a94e0, 0x6a74c8, 0x5a5fb0, 0x4b4f9a, 0x3e4288, 0x343878], beach: [0x3a4a8a, 0x7a7ac0], path: 0x6ae8d8 },
      // cap colours: every colour is its own instanced draw call (giant + small + both glows): hot pink, violet and
      // peach read apart on a phone (a light pink read the same as the hot pink)
      // (High: the heaviest dressing of all regions. The giants glow — cap spots lit like the paths — and carry the
      // region; trees / bushes / small mushrooms / grass were trimmed to pay for them and for the Elder Glowcap +
      // glowing path sprouts: the worst 13-bot camp view at High measures about 190k triangles, < 145 calls)
      // (small mushrooms 2.6 -> 2.0: the glowing mushroom clusters of the clutter field fill the ground around the player)
      dress: { mesas: 0.2, arches: 0.2, giantMush: 4.4, giantGlow: 0x9ffcff, giantScale: [2.6, 4.6], mushCaps: [0xff5fa2, 0xb983ff, 0xffa85c], mushrooms: 2.0, mushGlow: 0x7af0ff, crystals: 3, crystalColors: [0x5cffe1, 0x9fb7ff],
        treeD: 1.8, trees: [{ kind: 'round', palette: 'teal', seed: 1 }, { kind: 'round', palette: 'teal', seed: 6 }], bushes: 3.8, bushColors: [0x2f6e6a, 0x3a8f7a], berry: 0x5cffe1,
        tufts: 70, tuft: [0x1f5a5a, 0x4aa89a], flowers: 6, flowerColors: [[0x5cffe1, 0xb983ff, 0xffffff]], bigFlowers: 0.5, bigFlowerColors: [0xb983ff, 0xff6f91], bigRocks: 3, rockPal: 'moss',
        corals: 0, beach: 0, clouds: 6, horizon: [0x2a3270, 0x3a4a8a, 0x45569e, 0x52507a],
        // the few mesas / arches in the forest are lilac moon-rock with a mossy teal cap (not the orange sandstone of the Mesas)
        bands: [0x8a94e0, 0x6a74c8, 0x5a5fb0, 0x4b4f9a, 0x3e4288, 0x343878], mesaCap: 0x3aa58a },
      lite: { treeD: 1.7, bushes: 3.4, giantMush: 3.6, mushrooms: 1.8, tufts: 60 },
      roster: ['bumbler', 'hopper', 'rollo', 'squirt', 'shieldy', 'gnat', 'lobba', 'zapper', 'pinch'], stacks: 4, emblem: '#5cffe1', spores: true,
      // the Elder Glowcap (a towering lit mushroom cottage) in view of the landing pad; glowing sprouts line the paths
      landmark: { kind: 'elder', foot: 7.5, h: 18, dist: [48, 75] }, pathGlow: [0x7af0ff, 0xc2a2ff],
    },
    frost: {
      id: 'frost', star: 4, base: 'frost', css: ['#6cc4f5', '#eaf8ff', '#bdebff', '#ff9de2'], spr: 9,
      // crisp, pale winter sky: a soft aurora over snow-capped peaks, distant snowfall; the sun behind the first spawn
      // (front-lit snow) and a pale blue-grey shade (the violet one turned the snow lilac)
      sky: { top: 0x2c8ee0, mid: 0x86cdf8, horizon: 0xdcf0ff, bottom: 0xdcf0ff, sun: 0xffffff, halo: 0xe8f4ff, sunDir: new V3(-0.626, 0.766, 0.147), clouds: true, cloudColor: 0xffffff,
        belly: 0xc8d6f4, cover: 0.02, far: 'peaks', farA: 0x84a8dc, farB: 0xffffff, aurora: 0.4, auroraCol: [0x7affd0, 0xa0b0ff], snow: 0.32 },
      light: { sunDir: new V3(-0.626, 0.766, 0.147), sun: 0xfffaf4, sky: 0xe6f2ff, ground: 0xdce6f8, shadow: 0x8ea8d8, shadowK: 0.36, exposure: 1.0, rim: 0xf0f8ff,
        grade: { sat: 0.14, contrast: 0.12, tint: 0xeaf4ff, tintK: 0.05 },
        surf: { grass: 0.6, snow: 1, strata: 0.8, foam: 0.8, accent: 0xd8f2ff, accent2: 0xffffff, ao: [1.18, 1.06, 0.8], contact: 0x6a80b0 } },
      // the fog is the horizon colour (near snow still separates from far snow: the horizon is a cool pale blue)
      fog: { color: 0xdcf0ff, near: 60, far: 220 },
      water: { shallow: 0xb8f4ff, deep: 0x3f8fd8 },
      terr: { amp: 12, f: 0.0115, terrace: 3, ridge: 0.55 },
      // more value range in the snow (it read as one flat white sheet on a phone): bluer hollows, lilac patches,
      // cliffs banded down to violet rock
      paint: { ground: [0xb8cff0, 0xd8e8ff, 0xf4f9ff], patch: 0xc8c8f8, patchK: 0.6, shade: 0x86a4dc, cliff: [0xffffff, 0xd8f2ff, 0xb4d4f4, 0x94b0e4, 0x8a80c8, 0x6a5ca8], cliffS: 0.24, beach: [0x9fb8e0, 0xd8e8ff], path: 0xc0d4f4, macroK: 0.6 },
      dress: { mesas: 0.5, arches: 0.5, bigRocks: 5, rockPal: 'frost', crystals: 5, crystalColors: [0xff9de2, 0x9fe8ff, 0xc8b8ff], treeD: 7.2, tufts: 50, flowers: 3, bushes: 3, berry: 0xff9de2, bands: [0xffffff, 0xd8f2ff, 0xbdebff, 0x9fc3e8, 0x8e88c8, 0x6e64a8], mesaCap: 0xf6faff, drifts: 7, trees: [{ kind: 'pine', palette: 'pine', seed: 1, snow: true }, { kind: 'pine', palette: 'pine', seed: 4, snow: true }, { kind: 'pine', palette: 'teal', seed: 2, snow: true }], treeScale: [0.9, 1.6] },
      lite: { treeD: 6.4, drifts: 6 },
      roster: ['bumbler', 'hopper', 'rollo', 'squirt', 'shieldy', 'gnat', 'lobba', 'zapper', 'pinch', 'bruiser', 'tote'], stacks: 5, emblem: '#ff9de2', extraMesas: 3,
      // a frozen waterfall pouring off a snow-capped bluff in view of the landing pad; tall ice spires
      landmark: { kind: 'frozenFall', foot: 11, h: 17, dist: [55, 85] }, iceSpires: 5,
    },
    junk: {
      id: 'junk', star: 5, base: 'ember', css: ['#8f7be0', '#ffb38a', '#d99a6c', '#9aa5b8'], spr: 12,
      // golden hour: a low gold sun beside the first spawn view, sunset streaks, drifting balloons and a blimp, scrap
      // towers and chimney stacks on the horizon
      sky: { top: 0x6f5fd0, mid: 0xd890c0, horizon: 0xffb88a, bottom: 0xffc0a0, sun: 0xfff2cc, halo: 0xffa860, sunDir: new V3(-0.225, 0.208, -0.952), sunSize: 0.002, clouds: true, cloudColor: 0xffe2d2,
        belly: 0xe0a8c8, cover: 0, far: 'scrap', farA: 0x6a5898, farB: 0xc89070, streaks: 0.45, band: 0xff8a70, balloons: 1, balloonCol: [0xff6a5a, 0xffd23f] },
      // (the ground stays a cool mauve-slate under the gold light — sun, grade tint and rust kept off orange — so the
      // orange Gizmobs keep their contrast: ground hue ~350 deg, saturation ~0.3, as before this pass)
      light: { sunDir: new V3(0.6, 0.45, -0.65).normalize(), sun: 0xffd8b8, sky: 0xffcad6, ground: 0xc8a0b4, shadow: 0x6a4aa8, shadowK: 0.5, exposure: 1.0, rim: 0xffc890,
        grade: { sat: 0.16, contrast: 0.12, tint: 0xffd8d0, tintK: 0.04, bloom: 1.5 },
        surf: { grass: 0.5, metal: 1, strata: 0.9, foam: 0.5, accent: 0xb0606a, accent2: 0xa8b4dc, ao: [1.0, 1.06, 0.94], contact: 0x2a1a40 } },
      fog: { color: 0xffb88a, near: 50, far: 200 },
      water: { shallow: 0x8fe0d0, deep: 0x5060b0 },
      terr: { amp: 12, f: 0.012, terrace: 3, ridge: 0.4 },
      // dusty lilac-slate scrap ground with rust patches (the old rust-orange ground sat at ~1.1:1 against the
      // orange Gizmobs); light metal-grey paths
      paint: { ground: [0xa494b4, 0xb4a4c0, 0xc8b6c8], patch: 0xd99a6c, patchK: 0.55, shade: 0x8a78a8, warm: 0xffd0b0, cliff: [0xffb38a, 0xd99a6c, 0xb87850, 0x9aa5b8, 0x6a6a8a, 0x4b3a6b], beach: [0x7a6a8a, 0xb8a0a0], path: 0xd6d4e4, oil: 0x4b3a6b, oilF: 0.13 },
      dress: { mesas: 0.45, arches: 0.3, bigRocks: 6, rockPal: 'slate', crystals: 2, crystalColors: [0xffd23f, 0xff7a3d], treeD: 1.2, trees: [{ kind: 'pine', palette: 'ember', seed: 2 }],
        bushes: 4, bushColors: [0xb88a6a], tufts: 70, tuft: [0x8a6a5a, 0xd8b090], flowers: 2, mushrooms: 0, bands: [0xffb38a, 0xd99a6c, 0xb87850, 0x9aa5b8, 0x6a6a8a, 0x4b3a6b],
        mesaCap: 0xb4a4c0, horizon: [0x8f7be0, 0xb07ac8, 0xd99a6c, 0x6a5aa8] },
      roster: ['bumbler', 'hopper', 'rollo', 'squirt', 'shieldy', 'gnat', 'lobba', 'zapper', 'pinch', 'bruiser', 'tote'], stacks: 3, emblem: '#ff7a3d', factory: true,
      // the Gizmo Works (a huge friendly robot-faced factory) in view of the landing pad; junk heaps clustered along
      // the paths, conveyor ramps and magnet cranes
      landmark: { kind: 'factory', foot: 14.5, h: 24, dist: [62, 92] }, junk: { clusters: 22, conveyors: 3, cranes: 3 },
    },
  };
  X.BIOME_IDS = ['shoals', 'mesas', 'grotto', 'frost', 'junk'];
  // Register derived biome entries in the Geo kit so dressBiome() can use our dress tables.
  // lite (Medium/Low quality): no shell/starfish beach decor (3 draw calls for specks) and half the sky clouds.
  X.geoBiome = function (id, lite) {
    const B = X.BIOMES[id] || X.BIOMES.shoals, GB = Geo().biomes;
    if (!GB) return 'meadow';
    const key = 'exp_' + B.id + (lite ? '_lite' : '');
    if (!GB[key]) {
      const base = GB[B.base] || GB.meadow;
      const dress = Object.assign({}, base.dress, B.dress, lite ? B.lite || {} : {});
      if (lite) { dress.beach = 0; if (dress.clouds) dress.clouds = Math.ceil(dress.clouds * 0.5); }
      GB[key] = Object.assign({}, base, {
        sky: Object.assign({}, base.sky, B.sky), light: Object.assign({}, base.light, B.light || {}), fog: Object.assign({}, B.fog),
        water: Object.assign({ y: 0 }, base.water || {}, B.water, { lava: false }), dress,
      });
    }
    return key;
  };

  // ===================================================================== missions (GDD §11a)
  const M = X.MISSIONS = [
    { id: 's1_1', biome: 'shoals', star: 1, type: 'sweep', n: 20, bonus: 'crates' },
    { id: 's1_2', biome: 'shoals', star: 1, type: 'parts', part: 'spring', n: 8, bonus: 'sprocket' },
    { id: 's1_3', biome: 'shoals', star: 1, type: 'boss', boss: 'pinchking', bonus: 'noko' },
    { id: 's2_1', biome: 'mesas', star: 2, type: 'reach', bonus: 'sprocket' },
    { id: 's2_2', biome: 'mesas', star: 2, type: 'totem', n: 3, bonus: 'par' },
    { id: 's2_3', biome: 'mesas', star: 2, type: 'boss', boss: 'crankcrab', bonus: 'noko' },
    { id: 's3_1', biome: 'grotto', star: 3, type: 'rescue', n: 5, bonus: 'crates' },
    { id: 's3_2', biome: 'grotto', star: 3, type: 'escort', bonus: 'noko' },
    { id: 's3_3', biome: 'grotto', star: 3, type: 'boss', boss: 'buzzhive', bonus: 'par' },
    { id: 's4_1', biome: 'frost', star: 4, type: 'sweep', eliteBoost: 0.15, bonus: 'elites' },
    { id: 's4_2', biome: 'frost', star: 4, type: 'totem', n: 3, guards: 'bruiser', bonus: 'par' },
    { id: 's4_3', biome: 'frost', star: 4, type: 'elitecamps', n: 3, bonus: 'noko' },
    { id: 's5_1', biome: 'junk', star: 5, type: 'parts', part: 'core', n: 6, bonus: 'elites' },
    { id: 's5_2', biome: 'junk', star: 5, type: 'escort', bonus: 'crates' },
    { id: 's5_3', biome: 'junk', star: 5, type: 'boss', boss: 'titan', bonus: 'noko' },
  ];
  M.forEach((m, i) => { m.story = true; m.index = i; m.seed = hashStr(m.id) % 100000 + 7; });
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  X.hash = hashStr;
  X.mission = function (id) {
    const m = M.find(q => q.id === id);
    if (m) return m;
    if (typeof id === 'string' && id.startsWith('b_')) { const parts = id.split('_'); return X.boardMissions(+parts[1]).find(q => q.id === id) || null; }
    return null;
  };
  X.missionName = m => (m.story ? G.t('mission.' + m.id) : G.t('mission.board.' + m.type));
  // Region name from the single source (G.Data.BIOMES[id].nameKey = 'biome.<id>.name').
  X.biomeName = b => { const B = G.Data && G.Data.BIOMES && G.Data.BIOMES[b]; return B && G.i18n.has(B.nameKey) ? G.t(B.nameKey) : G.t('exp.biome.' + b); };
  X.BOSS_OF = { s1_3: 'pinchking', s2_3: 'crankcrab', s3_3: 'buzzhive', s5_3: 'titan' };
  // Field Mission Board: 4 missions reshuffled every 30 real minutes (GDD §9.6).
  X.boardSeed = () => Math.floor(Date.now() / 1.8e6);
  X.boardMissions = function (seed) {
    seed = seed != null ? seed : X.boardSeed();
    const r = G.rng(seed * 31 + 5), out = [];
    const open = X.BIOME_IDS.filter(b => X.biomeOpen(b));
    const types = ['sweep', 'parts', 'totem', 'rescue', 'escort', 'sweep', 'parts'];
    const partsBy = { shoals: ['spring', 'wire', 'scrap'], mesas: ['spring', 'chip', 'fuel'], grotto: ['gel', 'wire', 'chip'], frost: ['chip', 'servo', 'fuel'], junk: ['core', 'fuel', 'servo'] };
    for (let i = 0; i < 4; i++) {
      let biome, B, type;
      for (let tries = 0; tries < 12; tries++) {
        biome = open[Math.floor(r() * open.length)] || 'shoals';
        B = X.BIOMES[biome];
        type = types[Math.floor(r() * types.length)];
        if (B.star >= 4 && r() < 0.25) type = 'elitecamps';
        if (!out.some(q => q.type === type && (q.biome === biome || tries < 6))) break;
      }
      const star = Math.min(6, B.star + (r() < 0.35 ? 1 : 0));
      const m = { id: 'b_' + seed + '_' + i, biome, star, type, seed: (seed * 7 + i * 1013) % 99991 + 11, board: true, bonus: ['sprocket', 'noko', 'par', 'elites', 'crates'][Math.floor(r() * 5)] };
      if (type === 'parts') { const ps = partsBy[biome]; m.part = ps[Math.floor(r() * ps.length)]; m.n = m.part === 'core' ? 4 + Math.floor(r() * 3) : m.part === 'servo' ? 5 + Math.floor(r() * 3) : 8 + Math.floor(r() * 5); }
      if (type === 'totem') m.n = 3;
      if (type === 'rescue') m.n = 5;
      if (type === 'elitecamps') m.n = 3;
      if (i === 0) m.breezy = true;
      if (i === 1) m.loot = 1.5;
      out.push(m);
    }
    return out;
  };

  // ===================================================================== difficulty + heat (GDD §4.5)
  X.DIFFS = ['breezy', 'normal', 'spicy', 'blazing'];
  const DIFF = {
    breezy: { reward: 1.0, hp: 0.7, dmg: 0.5, pr: 0, badges: 0, waves: 1, elite: 0 },
    normal: { reward: 1.25, hp: 1.0, dmg: 1.0, pr: 0, badges: 0, waves: 2, elite: 0 },
    spicy: { reward: 1.6, hp: 1.3, dmg: 1.35, pr: 10, badges: 3, waves: 2, elite: 0.03 },
    blazing: { reward: 2.0, hp: 1.6, dmg: 1.75, pr: 18, badges: 3, waves: 2, elite: 0.06 },
  };
  X.diffInfo = d => {
    const D = G.Data && G.Data.DIFFICULTY && G.Data.DIFFICULTY[d];
    const base = DIFF[d] || DIFF.normal;
    if (!D) return base;
    return Object.assign({}, base, { reward: D.reward != null ? D.reward : base.reward, hp: D.hp != null ? D.hp : base.hp, pr: D.pr != null ? D.pr : base.pr });
  };
  X.HEAT = [
    { id: 'armored', icon: 'shield' }, { id: 'zippy', icon: 'bolt' }, { id: 'noregen', icon: 'noshield' },
    { id: 'tight', icon: 'clock' }, { id: 'swarm', icon: 'crown' },
  ];
  X.HEAT_PR = 20;
  X.pr = function () {
    try { if (G.Progress && G.Progress.rankInfo) { const r = G.Progress.rankInfo(); if (r) return r.pr || r.rank || r.level || 1; } } catch (e) { /* ignore */ }
    const p = G.Save.prof || {};
    return (p.rank && p.rank.pr) || p.pr || 1;
  };
  X.guildStar = function () {
    try { if (G.Progress && G.Progress.rankInfo) { const r = G.Progress.rankInfo(); if (r && (r.guild || r.star)) return r.guild || r.star; } } catch (e) { /* ignore */ }
    const p = G.Save.prof || {};
    return (p.rank && p.rank.guild) || p.guild || 1;
  };
  X.allUnlocked = function () {
    const p = G.Save.prof || {};
    return !!(p.unlockAll || p.allUnlocked || (G.Progress && G.Progress.allUnlocked) || X.pr() >= 30);
  };
  const PU = f => (G.Progress && G.Progress.isUnlocked ? !!G.safe('isUnlocked', () => G.Progress.isUnlocked(f)) : null);
  X.diffUnlocked = d => { if (d === 'breezy' || d === 'normal') return true; const u = PU('diff_' + d); return u != null ? u || X.allUnlocked() : (X.allUnlocked() || X.pr() >= X.diffInfo(d).pr); };
  X.heatUnlocked = () => { const u = PU('heat'); return u != null ? u || X.allUnlocked() : (X.allUnlocked() || X.pr() >= X.HEAT_PR); };
  X.bossOpen = id => { if (X.allUnlocked()) return true; const u = PU('boss_' + id); if (u) return true; const mid = Object.keys(X.BOSS_OF).find(k => X.BOSS_OF[k] === id); return !!(mid && X.storyRec(mid).done); };
  X.biomeOpen = function (b) {
    const B = X.BIOMES[b]; if (!B) return false;
    if (B.star <= 1 || X.allUnlocked() || X.guildStar() >= B.star) return true;
    if (PU('biome_' + b)) return true;
    const p = G.Save.prof || {};
    if (p.unlocks && Array.isArray(p.unlocks.biomes) && p.unlocks.biomes.includes(b)) return true;
    const prevBiome = X.BIOME_IDS[X.BIOME_IDS.indexOf(b) - 1];
    const lastPrev = M.filter(m => m.biome === prevBiome).pop();
    return !!(lastPrev && X.storyRec(lastPrev.id).done);
  };
  X.isUnlocked = function (m) {
    if (!m) return false;
    if (m.board || X.allUnlocked()) return X.biomeOpen(m.biome) || X.allUnlocked();
    if (m.index === 0) return true;
    const prev = M[m.index - 1];
    if (X.storyRec(prev.id).done) return true;
    return false;
  };
  // Par: ★1 6:00, +0:45 per star; Tight Timer −25% (GDD §11a, §4.5).
  X.parTime = (m, heat) => Math.round((360 + 45 * ((m.star || 1) - 1)) * ((heat || []).includes('tight') ? 0.75 : 1));
  X.fmt = s => U.fmtClock(s);

  // ===================================================================== save records (GDD §16 schema)
  function prof() { return G.Save.prof || (G.Save.data.profile = {}); }
  X.storyRec = function (id) {
    const p = prof();
    if (!p.story || typeof p.story !== 'object') p.story = {};
    if (!p.story[id] || typeof p.story[id] !== 'object') p.story[id] = { done: false, medal: null, best: null };
    return p.story[id];
  };
  X.recordsRoot = function () {
    const p = prof();
    if (!p.records || typeof p.records !== 'object') p.records = {};
    return p.records;
  };
  X.bossRec = function (id) {
    const R = X.recordsRoot();
    if (!R.boss || typeof R.boss !== 'object') R.boss = {};
    if (!R.boss[id] || typeof R.boss[id] !== 'object') R.boss[id] = { kills: 0, best: null, medal: 0 };
    return R.boss[id];
  };
  X.waveRec = function () {
    const R = X.recordsRoot();
    if (!R.wave || typeof R.wave !== 'object') R.wave = { best: 0, endlessBest: 0 };
    return R.wave;
  };
  // Star Sprockets: 30-char string, 3 per story biome map at indices biome.spr .. +2 (GDD §9.7, §16).
  X.sprocketHas = function (idx) {
    if (G.Progress && G.Progress.hasSprocket) { const r = G.safe('hasSprocket', () => G.Progress.hasSprocket(idx)); if (r != null) return !!r; }
    const s = prof().sprockets;
    if (typeof s === 'string') return s.charAt(idx) === '1';
    if (Array.isArray(s)) return s.includes(idx);
    return false;
  };
  X.sprocketAdd = function (idx) {
    if (X.sprocketHas(idx)) return false;
    if (G.Progress && G.Progress.addSprocket) { G.safe('addSprocket', () => G.Progress.addSprocket(idx)); if (X.sprocketHas(idx)) return true; }
    const p = prof();
    let s = p.sprockets;
    if (Array.isArray(s)) s.push(idx);
    else { if (typeof s !== 'string') s = '0'.repeat(30); while (s.length < 30) s += '0'; p.sprockets = s.slice(0, idx) + '1' + s.slice(idx + 1); }
    G.Save.save();
    return true;
  };

  // ===================================================================== enemies (GDD §7.2, §11a)
  const EI = X.ENEMY_INFO = {
    bumbler: { t: 1, hp: 40, preset: 'buzzy', fly: 3 }, hopper: { t: 1, hp: 60, preset: 'boltbug' }, rollo: { t: 1, hp: 30, preset: 'fizzbomb' },
    squirt: { t: 1, hp: 80, preset: 'popturret', still: true }, gnat: { t: 2, hp: 70, preset: 'longshot' }, shieldy: { t: 2, hp: 120, preset: 'bulwark' },
    lobba: { t: 2, hp: 90, preset: 'lobbo' }, zapper: { t: 2, hp: 110, preset: 'plinker' }, pinch: { t: 3, hp: 220, preset: 'pinchy' },
    bruiser: { t: 3, hp: 450, preset: 'thumper' }, tote: { t: 3, hp: 300, preset: 'jetjockey', fly: 11 },
  };
  X.T1 = ['bumbler', 'hopper', 'rollo', 'squirt'];
  const STAR_ROSTER = [null, ['bumbler', 'hopper', 'rollo', 'squirt'], ['shieldy', 'gnat', 'lobba'], ['zapper', 'pinch'], ['bruiser', 'tote']];
  X.tier = function (type) {
    const d = G.Enemies && G.Enemies.defs && G.Enemies.defs[type];
    if (d && d.tier) return d.tier;
    return (EI[type] && EI[type].t) || 1;
  };
  X.threat = (type, elite) => { const t = X.tier(type); return (t === 3 ? 4 : t) * (elite ? 2 : 1); };
  X.roster = function (star, biome) {
    const B = X.BIOMES[biome] || X.BIOMES.shoals;
    const out = [];
    for (let s = 1; s <= Math.min(4, star || 1); s++) for (const t of STAR_ROSTER[s]) if (B.roster.includes(t)) out.push(t);
    return out.length ? out : X.T1.slice();
  };
  X.enemyKnown = type => !!(G.Enemies && G.Enemies.defs ? G.Enemies.defs[type] : EI[type]);
  function ensureAdded(world, a) { if (a && world.actors.indexOf(a) < 0) world.addActor(a); return a; }
  // opts: {elite, behavior:'assault'|'patrol', assaultTarget, patrol:[V3], hpMult, speedMult, group, summon, noLoot}
  X.spawnEnemy = function (world, type, pos, opts) {
    opts = opts || {};
    let a = null;
    if (G.Enemies && G.Enemies.spawn) { a = G.safe('Enemies.spawn', () => G.Enemies.spawn(world, type, pos.clone(), opts)); if (a) a._honoursHpMult = true; }
    if (!a) a = new FallbackBot(world, type, pos, opts);
    ensureAdded(world, a);
    if (!a.enemyId) a.enemyId = type;
    if (opts.elite && a.elite == null) a.elite = true;
    // Heat "Armored Bots" when the enemies module doesn't scale HP itself.
    if (opts.hpMult && opts.hpMult !== 1 && !a._hpScaledBy) { a._hpScaledBy = opts.hpMult; if (!a._honoursHpMult) { a.maxHp *= opts.hpMult; a.hp = a.maxHp; } }
    if (opts.speedMult && a.speedMult == null) a.speedMult = opts.speedMult;
    if (opts.assaultTarget && a.assaultTarget == null) a.assaultTarget = opts.assaultTarget;
    a._expSpawned = true;
    return a;
  };
  X.bossKnown = function (id) {
    if (!G.Enemies) return false;
    const b = (G.Enemies.bosses && G.Enemies.bosses[id]) || (G.Enemies.defs && G.Enemies.defs[id]) || (G.Data && G.Data.BOSSES && G.Data.BOSSES[id]);
    return !!b && !!G.Enemies.spawnBoss;
  };
  // Bosses (GDD §7.4). 'pinchking' = elite Pinchbot with 800 HP, 1.5× size and a crown.
  X.spawnBoss = function (world, id, pos, opts) {
    opts = opts || {};
    let a = null;
    if (id === 'pinchking' && G.Enemies && G.Enemies.spawnPinchKing) a = G.safe('spawnPinchKing', () => G.Enemies.spawnPinchKing(world, pos.clone(), opts));
    else if (G.Enemies && G.Enemies.spawnBoss && (!G.Enemies.bossIds || G.Enemies.bossIds.includes(id))) a = G.safe('Enemies.spawnBoss', () => G.Enemies.spawnBoss(world, id, pos.clone(), opts));
    if (!a && id === 'pinchking') a = X.spawnEnemy(world, 'pinch', pos, Object.assign({ elite: true, king: true, hp: 800, scale: 1.5, boss: true }, opts));
    if (!a) a = new FallbackBot(world, id, pos, Object.assign({ boss: true }, opts));
    ensureAdded(world, a);
    if (id === 'pinchking' && !a.isBoss) a.isBoss = true;
    if (!a.bossId) a.bossId = id;
    a._expSpawned = true;
    return a;
  };
  // Crates (GDD §8.2): wood | metal | ammo | health | boom | lumite (+ crystal node).
  X.spawnCrate = function (world, kind, pos, opts) {
    let a = null;
    if (G.Enemies && G.Enemies.spawnCrate && kind !== 'crystal') a = G.safe('Enemies.spawnCrate', () => G.Enemies.spawnCrate(world, kind, pos.clone(), opts || {}));
    if (!a) a = new FallbackCrate(world, kind, pos, opts || {});
    ensureAdded(world, a);
    a.isCrate = true; if (!a.crateKind) a.crateKind = kind;
    return a;
  };
  X.alert = function (a, target) {
    if (!a || !a.alive) return;
    if (typeof a.alert === 'function') { G.safe('alert', () => a.alert(target)); return; }
    if (typeof a.setAlert === 'function') { G.safe('alert', () => a.setAlert(target)); return; }
    a.alerted = true; if (target && !a.target) a.target = target;
  };
  X.isAlerted = function (a) {
    if (!a || !a.alive) return false;
    if (a.alerted) return true;
    const s = a.state || (a.ai && a.ai.state);
    return s === 'alert' || s === 'engage' || s === 'attack' || s === 'chase' || s === 'recover' || s === 'search';
  };

  // ===================================================================== run inventory + pickup rules
  class Run {
    constructor(opts) {
      opts = opts || {};
      this.clinks = 0; this.parts = {}; this.lumite = 0; this.sprockets = []; this.pops = 0; this.elites = 0; this.crates = 0;
      this.kos = 0; this.damage = 0; this.combo = 0; this.comboMult = 1; this.time = 0; this.spent = 0;
      this.badges = opts.badges || 0; this.lootMult = opts.lootMult || 1;
    }
    addPart(id, n) { this.parts[id] = (this.parts[id] || 0) + (n || 1); }
    partCount(id) { return this.parts[id] || 0; }
    onPop(summon) {
      this.pops++;
      if (summon) return;
      this.combo++;
      const m = Math.min(5, 1 + Math.floor(this.combo / 4));
      if (m > this.comboMult && G.Audio) G.Audio.sfx('coin', { pitch: 1 + m * 0.08 });
      this.comboMult = m;
    }
    onHurt() { if (this.comboMult > 1) this.comboBroke = 0.6; this.combo = 0; this.comboMult = 1; }
  }
  X.Run = Run;
  const COIN = '<i class="coin" style="width:16px;height:16px"></i>';
  X.partName = function (id) {
    for (const k of ['part.' + id, 'part.' + id + '.name', 'item.' + id]) if (G.i18n.has(k)) return G.t(k);
    return G.i18n.has('exp.pn.' + id) ? G.t('exp.pn.' + id) : id;
  };
  X.partIcon = function (id) {
    if (G.Data && G.Data.partIcon) { const s = G.safe('partIcon', () => G.Data.partIcon(id)); if (s) return s; }
    const col = G.Data && G.Data.partColor ? U.cssHex(G.Data.partColor(id)) : '#7ff3ff';
    return '<svg viewBox="0 0 24 24"><path d="M12 2l8 6-3 12H7L4 8z" fill="' + col + '" stroke="#1e1a4d" stroke-width="2" stroke-linejoin="round"/></svg>';
  };
  // ctx: {player(), onPart(id,n), onSprocket(idx), onBolt(v), refuseHealthWhenFull:true}
  X.pickupRule = function (run, ctx) {
    ctx = ctx || {};
    return function (type, data, item) {
      data = data || {};
      const pl = ctx.player ? ctx.player() : null;
      if (type === 'bolt') {
        const v = Math.max(1, Math.round((data.value || 1) * (data.noCombo ? 1 : run.comboMult) * (data.noLoot ? 1 : run.lootMult)));
        run.clinks += v;
        if (G.HUD) G.HUD.pick(G.t('exp.clinks', { n: v }), COIN);
        if (ctx.onBolt) ctx.onBolt(v);
        return true;
      }
      if (type === 'part') {
        const id = data.partId || data.id || 'scrap', n = data.n || data.count || 1;
        if (id === 'lumite') run.lumite += n; else run.addPart(id, n);
        if (G.HUD) G.HUD.pick(X.partName(id) + (n > 1 ? ' ×' + n : ''), X.partIcon(id));
        if (ctx.onPart) ctx.onPart(id, n);
        return true;
      }
      if (type === 'health') {
        if (!pl || pl.hp >= pl.maxHp - 0.5) return false;
        pl.heal(data.value || data.amount || 25);
        return true;
      }
      if (type === 'shield') {
        if (!pl || pl.maxShield <= 0 || pl.shield >= pl.maxShield - 0.5) return false;
        pl.addShield(data.value || 25);
        return true;
      }
      if (type === 'ammo') {
        if (pl) X.addAmmo(pl, data.crate ? 0.3 : 0.15, data.crate ? 0.1 : 0.05);
        return true;
      }
      if (type === 'special') {
        if (data.sprocket != null) {
          const fresh = X.sprocketAdd(data.sprocket);
          if (fresh) run.sprockets.push(data.sprocket);
          if (G.UI) G.UI.banner(G.t(fresh ? 'exp.sprocket' : 'exp.sprocketOld'), '', 1.6);
          if (G.Audio) G.Audio.sfx('star');
          if (ctx.onSprocket) ctx.onSprocket(data.sprocket, fresh);
          return true;
        }
        if (data.lumite) { run.lumite += data.lumite; if (G.HUD) G.HUD.pick(X.partName('lumite') + ' ×' + data.lumite, X.partIcon('lumite')); return true; }
        if (ctx.onSpecial) return ctx.onSpecial(data, item) !== false;
        return true;
      }
      return true;
    };
  };
  // Field ammo: +cur of the current weapon's max (min 1), +others of every other owned weapon (GDD §5.1).
  X.addAmmo = function (pl, cur, others) {
    if (!pl || !pl.weapons) return;
    pl.weapons.forEach((w, i) => {
      if (!w) return;
      const k = i === pl.wi ? cur : others;
      if (w.addAmmo) { G.safe('addAmmo', () => w.addAmmo(k)); return; }
      if (w.maxAmmo > 0 && w.ammo != null && isFinite(w.ammo) && w.ammo >= 0) w.ammo = Math.min(w.maxAmmo, w.ammo + Math.max(1, Math.round(w.maxAmmo * k)));
    });
  };
  X.ammoMissing = function (pl) {
    let miss = 0;
    if (pl && pl.weapons) for (const w of pl.weapons) if (w && w.maxAmmo > 0 && w.ammo >= 0 && isFinite(w.ammo)) miss += (w.maxAmmo - w.ammo) / w.maxAmmo;
    return miss;
  };

  // ===================================================================== HUD helpers
  X.beepoIcon = function () {
    const g = Geo();
    if (g.npcPortraitSVG) { const s = G.safe('portrait', () => g.npcPortraitSVG('companion')); if (s) return s; }
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="9" fill="#fff1dc" stroke="#1e1a4d" stroke-width="2"/><rect x="7" y="9" width="10" height="7" rx="3" fill="#39d5ff" stroke="#1e1a4d" stroke-width="1.5"/><circle cx="10" cy="12.5" r="1.2" fill="#fff"/><circle cx="14" cy="12.5" r="1.2" fill="#fff"/><path d="M12 4V2" stroke="#1e1a4d" stroke-width="2"/><circle cx="12" cy="2" r="1.4" fill="#ff6b8b"/></svg>';
  };
  let lastBeepo = '', lastBeepoT = -99;
  X.beepo = function (key, params, opts) {
    const txt = G.t(key, params);
    const now = G.time.now;
    if (txt === lastBeepo && now - lastBeepoT < 6) return;
    lastBeepo = txt; lastBeepoT = now;
    if (G.UI) G.UI.toast(txt, Object.assign({ icon: X.beepoIcon(), dur: 3400, color: 'rgba(255,255,255,0.95)' }, opts || {}));
    if (G.Audio) G.Audio.sfx('npc', { pitch: 1.25 });
  };
  const ICONS = {
    sweep: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="#fff" stroke="#1e1a4d" stroke-width="1.6"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/></svg>',
    parts: '<svg viewBox="0 0 24 24"><path d="M12 2l2 3h3.5l.5 3.5 3 2-1.5 3.2 1.5 3.3-3 2-.5 3.5H14l-2 3-2-3H6.5L6 18.5l-3-2L4.5 13 3 9.8l3-2L6.5 5H10z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="3.2" fill="#fff" stroke="#1e1a4d" stroke-width="1.6"/></svg>',
    totem: '<svg viewBox="0 0 24 24"><rect x="7" y="14" width="10" height="8" rx="2" fill="#8f6bff" stroke="#1e1a4d" stroke-width="1.8"/><rect x="6" y="7" width="12" height="7" rx="2" fill="#ff8a4c" stroke="#1e1a4d" stroke-width="1.8"/><rect x="8" y="2" width="8" height="5" rx="2" fill="#3fe0b8" stroke="#1e1a4d" stroke-width="1.8"/><circle cx="10" cy="10.5" r="1.2" fill="#1e1a4d"/><circle cx="14" cy="10.5" r="1.2" fill="#1e1a4d"/></svg>',
    rescue: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="4" fill="#dff1ff" stroke="#1e1a4d" stroke-width="1.8"/><path d="M8 4v17M12 4v17M16 4v17" stroke="#4a4680" stroke-width="1.5"/><path d="M12 18s-5-3-5-6.2A2.6 2.6 0 0 1 12 10a2.6 2.6 0 0 1 5 1.8C17 15 12 18 12 18z" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="1.5"/></svg>',
    escort: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="8" rx="2" fill="#d99a5b" stroke="#1e1a4d" stroke-width="1.8"/><circle cx="7.5" cy="19" r="2.5" fill="#1f2a5a" stroke="#1e1a4d" stroke-width="1.5"/><circle cx="16.5" cy="19" r="2.5" fill="#1f2a5a" stroke="#1e1a4d" stroke-width="1.5"/><circle cx="12" cy="6" r="4" fill="#fff1dc" stroke="#1e1a4d" stroke-width="1.6"/><rect x="9.5" y="4.5" width="5" height="3" rx="1.2" fill="#39d5ff"/></svg>',
    boss: '<svg viewBox="0 0 24 24"><path d="M3 9l4 3 5-7 5 7 4-3-2 11H5z" fill="#ffc21a" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="14" r="2" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="1.2"/></svg>',
    reach: '<svg viewBox="0 0 24 24"><path d="M2 21l7-11 4 5 3-4 6 10z" fill="#e88a5a" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/><path d="M13 9V2" stroke="#1e1a4d" stroke-width="1.8"/><path d="M13 2.5h6l-2 2 2 2h-6z" fill="#39d5ff" stroke="#1e1a4d" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    elitecamps: '<svg viewBox="0 0 24 24"><path d="M3 20L12 6l9 14z" fill="#ff8a4c" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 5l2 2 2-4 2 4 2-2-1 4H9z" fill="#ffc21a" stroke="#1e1a4d" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    extract: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="7" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="1.8"/><path d="M8 15l2 4h4l2-4" fill="none" stroke="#1e1a4d" stroke-width="1.6"/><rect x="9" y="19" width="6" height="3" rx="1" fill="#d99a5b" stroke="#1e1a4d" stroke-width="1.4"/></svg>',
    beacon: '<svg viewBox="0 0 24 24"><path d="M12 2l4 8-4 4-4-4z" fill="#8bea4a" stroke="#1e1a4d" stroke-width="1.6" stroke-linejoin="round"/><rect x="8" y="15" width="8" height="7" rx="2" fill="#1f2a5a" stroke="#1e1a4d" stroke-width="1.6"/></svg>',
    kiosk: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="15" rx="3" fill="#2cc3d6" stroke="#1e1a4d" stroke-width="1.8"/><path d="M3 7l2-4h14l2 4z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.5" fill="#ffc93c" stroke="#1e1a4d" stroke-width="1.5"/></svg>',
    sprocket: '<svg viewBox="0 0 24 24"><path d="M12 1.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 8.7l7.1-.6z" fill="#ffc21a" stroke="#1e1a4d" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#39d5ff" stroke="#1e1a4d" stroke-width="1.8"/></svg>',
    noshield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#c3cbd6" stroke="#1e1a4d" stroke-width="1.8"/><path d="M5 19L19 5" stroke="#ff4d5e" stroke-width="2.6" stroke-linecap="round"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M14 2L5 14h6l-2 8 10-13h-6z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.5" fill="#fff" stroke="#1e1a4d" stroke-width="1.8"/><path d="M12 8v5l3 2" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/><path d="M9 2h6" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/></svg>',
    crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 12H5z" fill="#ffc21a" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="#ff5a6e" stroke="#1e1a4d" stroke-width="1.8"/></svg>',
    badge: '<svg viewBox="0 0 24 24"><path d="M12 2l3 3h4v4l3 3-3 3v4h-4l-3 3-3-3H5v-4l-3-3 3-3V5h4z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/></svg>',
    siren: '<svg viewBox="0 0 24 24"><path d="M6 18v-6a6 6 0 0 1 12 0v6z" fill="#ff4d5e" stroke="#1e1a4d" stroke-width="1.8"/><rect x="4" y="18" width="16" height="4" rx="1.5" fill="#1f2a5a" stroke="#1e1a4d" stroke-width="1.5"/><path d="M12 2v2M3 7l1.5 1M21 7l-1.5 1" stroke="#1e1a4d" stroke-width="1.8" stroke-linecap="round"/></svg>',
    turret: '<svg viewBox="0 0 24 24"><rect x="5" y="15" width="14" height="6" rx="2" fill="#1f2a5a" stroke="#1e1a4d" stroke-width="1.6"/><circle cx="12" cy="12" r="5" fill="#2cc3d6" stroke="#1e1a4d" stroke-width="1.8"/><path d="M14 10l7-4" stroke="#1e1a4d" stroke-width="3.5" stroke-linecap="round"/></svg>',
    token: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#7af0ff" stroke="#1e1a4d" stroke-width="1.8"/><path d="M9 7c4 0 6 3 3 5s-1 5 3 5" fill="none" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/></svg>',
    core: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#5cffe1" stroke="#1e1a4d" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="#fff" opacity="0.8"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="3" fill="#ffd23f" stroke="#1e1a4d" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#1e1a4d" stroke-width="2"/></svg>',
  };
  X.ICONS = ICONS;
  X.icon = n => ICONS[n] || ICONS.sweep;
  X.medalColor = m => ({ S: '#ffc21a', A: '#c3cbd6', B: '#e8a05a', C: '#8fd6ff', gold: '#ffc21a', silver: '#c3cbd6', bronze: '#e8a05a' }[m] || '#dff1ff');
  // Score + medal (GDD §11a).
  X.scoreMedal = function (o) {
    const score = Math.max(0, Math.round(1000 + 300 * (o.bonuses || 0) - 100 * (o.kos || 0) + 2 * Math.max(0, (o.par || 0) - (o.time || 0))));
    const medal = score >= 1800 ? 'S' : score >= 1400 ? 'A' : score >= 1000 ? 'B' : 'C';
    return { score, medal, stars: { S: 3, A: 2, B: 1, C: 1 }[medal] };
  };
  // Small helper: Geo.Kit -> Mesh with optional additive glow child.
  X.kitMesh = function (k, matOpts) {
    const d = k.data(matOpts);
    const g = Geo();
    const mesh = new THREE.Mesh(d.solid || d.glow, d.solid ? G.M.vc(matOpts) : g.glowMat());
    if (d.solid && d.glow) { const gm = new THREE.Mesh(d.glow, g.glowMat()); gm.userData.glow = true; mesh.add(gm); }
    for (const s of d.sp) { const sp = G.R.glowSprite(s.color, s.size, s.op != null ? s.op : 0.8); sp.position.set(s.x, s.y, s.z); mesh.add(sp); }
    if (d.solid) d.solid.userData.shared = true;
    if (d.glow) d.glow.userData.shared = true;
    return mesh;
  };
  // Cached kit geometry: build(k) runs once per key; returns a new Mesh each call sharing the buffers. Glossy parts
  // (Kit.metal) ride along as a child with the house glossy material (the main mesh when a kit has nothing else).
  const kitCache = new Map();
  X.kitCached = function (key, build, matOpts) {
    let d = kitCache.get(key);
    if (!d) { const k = new (Geo().Kit)(); build(k); d = k.data(matOpts); for (const q of [d.solid, d.glow, d.metal]) if (q) q.userData.shared = true; kitCache.set(key, d); }
    const g = Geo(), metalMat = () => (g.metalMat ? g.metalMat() : G.M.vc({ spec: 0.72, rimStr: 0.42 }));
    const mesh = d.solid ? new THREE.Mesh(d.solid, G.M.vc(matOpts)) : d.metal ? new THREE.Mesh(d.metal, metalMat()) : new THREE.Mesh(d.glow, g.glowMat());
    if (d.solid && d.metal) mesh.add(new THREE.Mesh(d.metal, metalMat()));
    if ((d.solid || d.metal) && d.glow) { const gm = new THREE.Mesh(d.glow, g.glowMat()); gm.userData.glow = true; mesh.add(gm); }
    for (const s of d.sp) { const sp = G.R.glowSprite(s.color, s.size, s.op != null ? s.op : 0.8); sp.position.set(s.x, s.y, s.z); mesh.add(sp); }
    return { mesh, colliders: d.c.map(o => Object.assign({}, o)), anchors: d.a };
  };

  // ===================================================================== KO / respawn (GDD §4.4)
  // opts: {delay (3 s), respawnPos() -> V3, yaw() -> number, onFail(), badges (0 = unlimited), lose:'exp',
  //        grace() -> true while a KO must be free (boss already popped: victory window) — no badge, no fail}
  X.KO = function (world, run, opts) {
    opts = opts || {};
    const st = { t: 0, down: false };
    const grace = () => !!(opts.grace && opts.grace());
    world.rules.manualRespawn = true;
    const prev = world.rules.onPlayerDeath;
    world.rules.onPlayerDeath = function (p, info) {
      if (prev) prev(p, info);
      if (grace()) { st.down = true; st.failed = false; st.t = 1.2; return; }
      run.kos++;
      st.down = true; st.t = opts.delay || 3;
      const cause = (info && info.src && (info.src.enemyId || info.src.bossId || info.src.kind)) || (info && info.type) || 'unknown';
      G.bus.emit('player-ko', cause);
      if (run.badges > 0) {
        run.badges--;
        if (run.badges <= 0) {
          G.UI.banner(G.t('exp.failed'), '', 2.2);
          st.failed = true; st.t = 2.2;
          return;
        }
      }
      G.UI.banner(G.t('exp.bonked'), run.badges > 0 ? G.t('exp.badges', { n: run.badges }) : G.t('exp.bonkedSub', { n: Math.ceil(st.t) }), 2.0);
    };
    st.update = function (dt) {
      if (!st.down) return;
      st.t -= dt;
      if (st.t <= 0) {
        st.down = false;
        // a last-badge KO whose countdown ran into the victory window is forgiven (respawn instead of fail)
        if (st.failed && grace()) st.failed = false;
        if (st.failed) { if (opts.onFail) opts.onFail(); return; }
        const p = world.player; if (!p) return;
        const pos = opts.respawnPos ? opts.respawnPos() : p.spawn;
        p.respawn(pos.clone ? pos.clone() : pos);
        if (opts.yaw) p.yaw = opts.yaw();
        p.pitch = 0;
        p.iframes = 1.5;
        if (opts.onRespawn) opts.onRespawn(p);
      }
    };
    return st;
  };

  // ===================================================================== rewards + results (GDD §9.2, §13.5)
  const STAR_CLINKS = [300, 300, 500, 800, 1200, 1800, 2500], STAR_XP = [150, 150, 300, 500, 700, 950, 1200];
  // Local fallback used only if G.Progress.modeRewards is missing.
  X.localRewards = function (mode, r) {
    const d = X.diffInfo(r.difficulty || G.Save.set.difficulty);
    const heatK = 1 + 0.1 * ((r.heat && r.heat.length) || 0);
    const k = d.reward * heatK;
    const out = { clinks: 0, xp: 0, parts: {} };
    if (mode === 'expedition') {
      if (r.win) { out.clinks = Math.round(STAR_CLINKS[r.star || 1] * k * (r.lootMult || 1)); out.xp = Math.round(STAR_XP[r.star || 1] * k); out.chest = 'gold'; out.chestRolls = 1 + ({ S: 3, A: 2, B: 1, C: 0 }[r.medal] || 0); }
      else out.xp = Math.round(STAR_XP[r.star || 1] * k * 0.5 * 0.5);
    } else if (mode === 'boss') {
      if (r.win) { out.clinks = Math.round((r.firstKill ? 1200 : 600) * k); out.xp = Math.round(300 * k); out.chest = 'boss'; }
    } else if (mode === 'defense') {
      out.clinks = Math.round((60 * (r.waves || 0) + (r.win ? 800 : 0)) * k);
      out.xp = Math.round(30 * (r.waves || 0) * k);
      if (r.win) out.chest = 'gold';
    }
    return out;
  };
  function addInto(dst, src) {
    if (!src) return dst;
    for (const k in src) {
      const v = src[k];
      if (typeof v === 'number') dst[k] = (dst[k] || 0) + v;
      else if (v && typeof v === 'object' && !Array.isArray(v)) { dst[k] = dst[k] && typeof dst[k] === 'object' ? dst[k] : {}; addInto(dst[k], v); }
      else if (Array.isArray(v)) dst[k] = (dst[k] || []).concat(v);
      else if (dst[k] == null) dst[k] = v;
    }
    return dst;
  }
  X.addRewards = addInto;
  // o: {mode, win, stars, stats:[{key,value}], run, result:{...for modeRewards}, params, title, subtitle, retry,
  //     next + nextLabel (third results button), tip, delay, silent, noEmit}
  // Rewards are granted exactly once per Run (a second finish for the same run returns the first result).
  // While they are granted (and mode-result runs), progression sounds/toasts are held by G.Progress and the
  // results screen replays them as its rows animate in (params.reveal).
  X.finish = function (o) {
    const run = o.run || new Run();
    if (run._paid) { console.warn('[exp] finish: this run was already paid'); return run._paid; }
    const hold = !o.silent && G.Progress && G.Progress.holdFx;
    if (hold) G.Progress.holdFx();
    const res = Object.assign({ mode: o.mode, win: !!o.win, stars: o.stars || 0, difficulty: G.Save.set.difficulty }, o.result || {});
    // Field pickups go through modeRewards' `collected` (vault rule: all on success, 50% parts on fail/quit).
    res.collected = { clinks: Math.max(0, Math.round(run.clinks)), lumite: run.lumite || 0, parts: Object.assign({}, run.parts) };
    let rewards, lines = null;
    if (G.Progress && G.Progress.finish) {
      const f = G.safe('Progress.finish', () => G.Progress.finish(o.mode, res));
      if (f) { rewards = f.rewards; lines = f.lines; }
    } else if (G.Progress && G.Progress.modeRewards && G.Progress.grantRewards) {
      rewards = G.safe('modeRewards', () => G.Progress.modeRewards(o.mode, res));
      if (rewards) lines = G.safe('grantRewards', () => G.Progress.grantRewards(rewards));
    }
    if (!rewards) {
      rewards = X.localRewards(o.mode, res);
      const keep = o.win ? 1 : 0.5;
      const parts = {};
      for (const id in run.parts) { const n = Math.floor(run.parts[id] * keep); if (n > 0) parts[id] = n; }
      addInto(rewards, { clinks: res.collected.clinks, parts, lumite: run.lumite ? Math.floor(run.lumite * keep) : 0 });
      if (rewards.parts && !Object.keys(rewards.parts).length) delete rewards.parts;
    }
    res.stats = o.stats; res.rewards = rewards; res.stars = o.stars || 0;
    run._paid = res;
    if (!o.noEmit) G.bus.emit('mode-result', res);
    // written at once together with what mode-result records (story clear, mission count, unlocks, quests), so a
    // closed tab can never keep the payout but lose the clear (and pay a first clear again)
    G.Save.save(true);
    if (o.silent) return res;
    const params = { mode: o.mode, win: !!o.win, stars: o.stars || 0, stats: o.stats || [], rewards: lines && lines.length ? lines : rewards, medal: o.medal, title: o.title, subtitle: o.subtitle,
      onRetry: o.retry, retry: o.retry, replay: o.retry, onNext: o.next, nextLabel: o.nextLabel, result: res, tip: o.tip, reveal: { sfx: [], toasts: [], banners: [] },
      // the results screen starts this stinger itself, on its first drawn frame, and times its stars to it
      fanfare: o.win ? 'win' : 'lose', playFanfare: true };
    const world0 = G.Game.world;
    setTimeout(() => {
      if (G.Input) G.Input.unlock();
      // left during the short delay (pause → Return to Town): the run is paid and saved already; no results screen
      // over the next place, the held toasts simply show there
      if (G.Game.world !== world0 || G.Game._switching) { if (hold && G.Progress.releaseFx) G.Progress.releaseFx(true); return; }
      const fx = hold && G.Progress.releaseFx ? G.Progress.releaseFx(false) : null;
      if (fx) params.reveal = fx;
      // the stinger leads the reveal (stars, coins, chimes); the shared results screen plays it and the music
      if (G.UI.defs.results) G.UI.open('results', params);
      else { G.UI.open('exp-results', params); if (G.Audio) { G.Audio.music('results'); G.Audio.sfx(o.win ? 'win' : 'lose'); } }
    }, o.delay != null ? o.delay : 300);
    return res;
  };
  // Next sortie after an expedition: the next story mission when it is open and not cleared yet, else the first
  // unfinished open story mission, else null (everything cleared: the board's rotating missions).
  X.nextMission = function (m) {
    if (m && m.story) { const nx = M[m.index + 1]; if (nx && X.isUnlocked(nx) && !X.storyRec(nx.id).done) return nx.id; }
    const open = M.find(q => X.isUnlocked(q) && !X.storyRec(q.id).done);
    return open ? open.id : null;
  };
  // Lobby screens straight from the results screen, without loading Fizzport in between: the finished arena
  // stops simulating (Game.hold) and the HUD goes away; closing the lobby goes home, Start launches the run.
  // The lobbies clear the hold in their onClose (21e).
  X.openLobbyFromResults = function (screen, params) {
    G.Game.hold = true;
    if (G.HUD) G.HUD.hide();
    G.UI.open(screen, Object.assign({ fromResults: true }, params || {}));
  };
  // After a quit (pause → Return to Town / Restart): what was kept, shown once the next mode is up. Back in town
  // it says so ('Back in town! …'); after a Restart the run starts over in the same place, so the line only says
  // what the last try kept (nothing to say when it kept nothing). Worded in the language active at that moment.
  X.quitToast = function (rw) {
    if (!rw) return;
    const c = Math.max(0, Math.round(rw.clinks || 0));
    let n = Math.max(0, Math.round(rw.lumite || 0));
    for (const k in (rw.parts || {})) n += Math.max(0, Math.floor(rw.parts[k] || 0));
    const off = G.bus.on('mode', id => {
      off();
      const town = id === 'hub' || id === 'title';
      if (!town && !c && !n) return;
      setTimeout(() => {
        const prm = { c: G.i18n.num(c), p: G.i18n.num(n) };
        const text = town ? (c || n ? G.t('exp.quit.kept', prm) : G.t('exp.quit.none')) : G.t('exp.quit.keptRestart', prm);
        if (G.UI) G.UI.toast(text, { icon: X.beepoIcon(), dur: 4200, color: 'rgba(255,255,255,0.96)' });
      }, 700);
    });
  };
  // After leaving a run that was already won (pause → Return to Town / Restart while the boss chest fountains or the
  // balloon lifts off): the win was paid and recorded on the way out (silent finish), so the next place says so.
  X.winToast = function (res) {
    if (!res) return;
    const off = G.bus.on('mode', () => {
      off();
      setTimeout(() => { if (G.UI) G.UI.toast(G.t('exp.quit.won'), { icon: X.beepoIcon(), dur: 4200, color: 'rgba(255,255,255,0.96)' }); }, 700);
    });
  };
  X.openBoard = function (sel) {
    const tab = sel ? (String(sel).startsWith('b_') ? 'board' : 'story') : (M.every(q => X.storyRec(q.id).done) ? 'board' : 'story');
    X.openLobbyFromResults('expedition-select', { sel: sel || null, tab });
  };
  // Display rows for a rewards object (fallback results panel + previews).
  X.rewardRows = function (r) {
    const el = G.UI.el, rows = [];
    if (!r) return rows;
    if (Array.isArray(r)) { for (const it of r) rows.push(el('div.reward', it.icon ? el('span', { html: it.icon, style: { display: 'inline-flex', width: '20px', height: '20px' } }) : null, el('span', { text: it.text || it.label || (it.id + (it.n ? ' ×' + it.n : '')) }))); return rows; }
    if (r.clinks) rows.push(el('div.reward', el('i.coin'), el('b', { text: G.i18n.num(Math.round(r.clinks)) })));
    if (r.xp) rows.push(el('div.reward', el('b', { text: 'XP +' + G.i18n.num(Math.round(r.xp)) })));
    if (r.lumite) rows.push(el('div.reward', el('span', { html: X.partIcon('lumite'), style: { display: 'inline-flex', width: '20px', height: '20px' } }), el('b', { text: '×' + r.lumite })));
    if (r.parts) for (const id in r.parts) rows.push(el('div.reward', el('span', { html: X.partIcon(id), style: { display: 'inline-flex', width: '20px', height: '20px' } }), el('span', { text: X.partName(id) + ' ×' + r.parts[id] })));
    if (r.chest) rows.push(el('div.reward', el('span', { html: ICONS.crown, style: { display: 'inline-flex', width: '20px', height: '20px' } }), el('span', { text: '×' + (r.chestRolls || 1) })));
    return rows;
  };
  // Fallback results panel (the menus module owns the real 'results' screen).
  G.UI.def('exp-results', {
    escClose: false,
    build(p, close) {
      const el = G.UI.el;
      const head = el('div', { style: { textAlign: 'center', font: '400 clamp(26px,5vw,40px)/1.1 var(--f-display)', color: '#fff', webkitTextStroke: '2px var(--ink)', paintOrder: 'stroke fill', textShadow: '0 4px 0 var(--ink)' }, text: p.title || G.t(p.win ? 'exp.res.clear' : 'exp.res.fail') });
      const stars = el('div.results-stars', [0, 1, 2].map(i => el('span', { text: i < (p.stars || 0) ? '★' : '☆', style: { color: i < (p.stars || 0) ? '#ffd23f' : '#fff' } })));
      const medal = p.medal ? el('div', { style: { margin: '0 auto', width: '64px', height: '64px', borderRadius: '50%', background: X.medalColor(p.medal), border: '4px solid var(--ink)', display: 'grid', placeItems: 'center', font: '400 30px var(--f-display)', boxShadow: '0 4px 0 var(--ink)', transform: 'rotate(-8deg)' }, text: String(p.medal).charAt(0).toUpperCase() }) : null;
      const stats = el('div.col', { style: { gap: '4px' } }, (p.stats || []).map(s => el('div.stat', el('span', { text: G.i18n.has(s.key) ? G.t(s.key) : s.key }), el('b', { text: String(s.value) }))));
      const rewards = el('div.reward-list', X.rewardRows(p.rewards));
      const btns = el('div.row.center',
        p.retry ? G.UI.btn('exp.res.retry', () => { close(); p.retry(); }, 'cool') : null,
        p.onNext ? G.UI.btn(p.nextLabel || 'res.next', () => { close(); p.onNext(); }, 'go') : null,
        G.UI.btn('exp.res.continue', () => { close(); G.Game.go(G.Game.modes.hub ? 'hub' : 'title'); }, 'primary big'));
      return el('div.panel.narrow', { style: { alignItems: 'stretch', gap: '10px' } },
        head, stars, medal, el('div.panel-body', stats, el('div', { style: { height: '8px' } }), rewards), el('p.muted.small', { text: p.tip || G.t('exp.res.tip'), style: { margin: 0, textAlign: 'center' } }), btns);
    },
  });

  // Player setup shared by the PvE modes.
  X.makePlayer = function (world, spawn, yaw, heat) {
    const prof = G.Save.prof;
    const stats = G.Data && G.Data.playerStats ? G.safe('playerStats', () => G.Data.playerStats(prof)) : null;
    const loadout = G.Data && G.Data.loadout ? G.safe('loadout', () => G.Data.loadout(prof)) : null;
    let gadget = G.Data && G.Data.gadget ? G.safe('gadget', () => G.Data.gadget(prof)) : null;
    if (gadget === undefined && prof && prof.loadout && typeof prof.loadout === 'object') gadget = prof.loadout.gadget || null;
    const p = new G.Player(world, { stats: stats || undefined, loadout: loadout || [], spawn, yaw: yaw || 0, gadget });
    if ((heat || []).includes('noregen')) p.noShieldRegen = true;
    world.player = p;
    world.addActor(p);
    return p;
  };
  // Difficulty chosen in a lobby applies to the match (G.Data.difficultyMult reads the setting).
  X.applyDifficulty = function (d) {
    if (d && X.DIFFS.includes(d) && G.Save.set.difficulty !== d) { G.Save.set.difficulty = d; G.Save.save(); }
    return G.Save.set.difficulty;
  };
  // Prebuild the enemies' navgrid once the arena colliders exist (avoids a hitch on the first spawn).
  X.prebuildNav = function (world) { if (G.Enemies && G.Enemies.nav) G.safe('Enemies.nav', () => G.Enemies.nav(world)); };
  // Live robot cap (GDD §15.2: Low 16 / Medium 20 / High 24). Robots are ~2 draw calls each (one skinned mesh +
  // face; elite bubbles are one shared instanced call), so 20 in view stays under ~120 calls on Medium.
  X.maxBots = () => (G.R.qualityName() === 'low' ? 16 : G.R.qualityName() === 'med' ? 20 : 24);

  // ===================================================================== tiny fallbacks (enemies module missing)
  // These only exist so the modes stay playable/testable before G.Enemies lands; the real module wins.
  // One reused animateRobot opts object (allocation-free per frame; the call is synchronous).
  const _ao = { speed: 0, vx: 0, vz: 0, yaw: 0 };
  class FallbackBot extends G.Actor {
    constructor(world, type, pos, opts) {
      const info = EI[type] || { t: 3, hp: 1500, preset: 'gigaclank' };
      const boss = !!opts.boss;
      const D = X.diffInfo(G.Save.set.difficulty);
      const hp = (opts.hp || (boss ? 3000 : info.hp)) * D.hp * (opts.elite ? 2 : 1);
      super(world, { r: boss ? 2.4 : 0.55, h: boss ? 5 : 1.4, team: 1, hp, kind: boss ? 'boss' : 'bot' });
      this.enemyId = type; this.tier = info.t; this.elite = !!opts.elite; this.isBoss = boss;
      this.pos.copy(pos); this.assaultTarget = opts.assaultTarget || null;
      this.alerted = false; this.cd = 1 + Math.random() * 1.5; this.tele = 0; this.fly = info.fly || 0;
      const g = Geo();
      const spec = Object.assign({}, (g.robotPresets && g.robotPresets[boss ? 'gigaclank' : info.preset]) || { body: 'sphere', size: 1, color: 0xff7a3d });
      if (boss) spec.size = 3.2;
      if (opts.scale) spec.size *= opts.scale;
      this.rob = g.robot ? g.robot(spec) : null;
      this.mesh = this.rob ? this.rob.group : new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), G.M.toon(0xff7a3d));
      // weak spot = the glowing chest battery, as on in-mission robots (17 E.attachCore); the old face-line critY
      // only where no rig / core helper exists
      if (this.rob && G.Enemies && G.Enemies.attachCore) { this.critY = null; G.Enemies.attachCore(this, this.rob); }
      else this.critY = this.rob ? this.rob.critY : 1.1;
      if (this.rob && this.rob.height) this.h = this.rob.height * 0.95;
      this.mmColor = this.elite ? '#ffc21a' : null;
      this.state = 'idle'; this.speed = (boss ? 2.5 : 3) * (opts.speedMult || 1);
      this.yaw = Math.random() * Math.PI * 2; this.mesh.rotation.y = this.yaw;
      // pop in with overshoot when it arrives during play (not for the camps placed while the island loads)
      if (this.rob && this.rob.spawnIn && world.time > 0.5) this.rob.spawnIn();
    }
    alert(t) { this.alerted = true; if (t) this.target = t; }
    update(dt) {
      this.applyStatus(dt);
      const w = this.world, pl = w.player;
      let tgt = this.assaultTarget && this.assaultTarget.alive ? this.assaultTarget : pl;
      if (pl && pl.alive && this.assaultTarget && this.pos.distanceTo(pl.pos) < 12) tgt = pl;
      if (!this.alive) { if (this.rob && G.Geo.animateRobot(this.rob, 'dead', w.time, dt)) this.dead = true; else if (!this.rob) this.dead = true; return; }
      const d = tgt ? U.distXZ(this.pos, tgt.pos) : 999;
      if (!this.alerted && tgt && d < 25) this.alerted = true;
      let st = 'idle', sp = 0, vx = 0, vz = 0;
      if (this.alerted && tgt && tgt.alive !== false && this.stunT <= 0) {
        const want = this.assaultTarget === tgt ? 4 : 9;
        const dx = tgt.pos.x - this.pos.x, dz = tgt.pos.z - this.pos.z, l = Math.hypot(dx, dz) || 1;
        this.yaw = U.angleDamp(this.yaw, Math.atan2(dx, dz), 8, dt);   // turns toward the target instead of snapping
        if (d > want && !EI[this.enemyId]?.still) { sp = this.speed * (this.slowK || 1); vx = dx / l * sp; vz = dz / l * sp; this.pos.x += vx * dt; this.pos.z += vz * dt; st = 'move'; }
        this.cd -= dt;
        if (this.cd < 0.5 && this.cd > 0) st = 'windup';
        if (this.cd <= 0 && d < 22) {
          this.cd = 1.6 + Math.random() * 0.6;
          const o = this.aimPoint(_v); const tp = tgt.aimPoint ? tgt.aimPoint(_v2) : _v2.copy(tgt.pos);
          w.projectiles.spawn({ pos: o, dir: tp.sub(o).normalize(), speed: 14, damage: this.isBoss ? 18 : 8, src: this, team: 1, color: 0xff5fa2, size: this.isBoss ? 0.4 : 0.22, life: 2.5 });
          if (G.Audio) G.Audio.sfxAt('enemyShoot', this.pos);
          st = 'attack';
        }
      }
      const gy = w.phys.groundAt(this.pos.x, this.pos.z, 0.3, this.pos.y + 1.5);
      this.pos.y = U.damp(this.pos.y, gy + this.fly, 10, dt);
      this.mesh.position.copy(this.pos); this.mesh.rotation.y = this.yaw;
      if (this.rob) { _ao.speed = sp; _ao.vx = vx; _ao.vz = vz; _ao.yaw = this.yaw; G.Geo.animateRobot(this.rob, st, w.time, dt, _ao); }
    }
    onHurt(info) {
      this.alerted = true; if (info && info.src) this.target = info.src;
      // directional flinch (the blow's travel direction: the shot's dir, else away from the source)
      if (this.rob && this.rob.hit && this.alive) {
        let hx = 0, hz = 0;
        if (info && info.dir) { hx = info.dir.x; hz = info.dir.z; } else if (info && info.src && info.src.pos) { hx = this.pos.x - info.src.pos.x; hz = this.pos.z - info.src.pos.z; }
        this.rob.hit(hx, hz, 0.6);
      }
    }
    onDeath() {
      const w = this.world, p = this.aimPoint(_v).clone();
      w.fx.confetti(p, 24); w.fx.burst(p, [0xff7a3d, 0xffd23f, 0xffffff], 18, 6, 0.3, 0.5);
      if (G.Audio) G.Audio.sfxAt('enemyDie', p);
      const t = this.tier || 1;
      w.pickups.boltBurst(p, (this.isBoss ? 600 : U.randInt(3, 6) * t) * (this.elite ? 3 : 1));
      if (Math.random() < 0.6 || this.elite) w.pickups.spawn('part', p, { partId: U.pick(['scrap', 'wire', 'spring', 'chip']), rarity: 'common' });
      if (Math.random() < 0.2) w.pickups.spawn('ammo', p, {});
      if (!this.rob) this.dead = true;
    }
  }
  const CRATE_LOOK = { wood: 'bolt', metal: 'rare', ammo: 'ammo', health: 'health', boom: 'explosive', lumite: 'rare', crystal: 'rare' };
  class FallbackCrate extends G.Actor {
    constructor(world, kind, pos, opts) {
      super(world, { r: 0.55, h: 0.95, team: 1, hp: kind === 'metal' || kind === 'lumite' || kind === 'crystal' ? 3 : 1, kind: 'crate' });
      this.crateKind = kind; this.isCrate = true; this.pos.copy(pos); this.immovable = true;
      const g = Geo();
      if (kind === 'crystal' && g.crystal) { const pr = g.crystal(1.1, 0xff7ab8, 7); this.mesh = pr.mesh.clone(); }
      else this.mesh = g.crate ? g.crate(CRATE_LOOK[kind] || 'bolt').clone() : new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), G.M.toon(0xd99a5b));
      this.mesh.position.copy(pos);
      this.mmColor = '#d99a5b';
      this.fuse = -1;
    }
    takeDamage(amount, info) { return super.takeDamage(this.maxHp > 1 ? Math.min(1, amount) : amount, info); }
    update(dt) {
      if (this.fuse > 0) { this.fuse -= dt; this.mesh.visible = Math.sin(this.fuse * (10 + (3 - this.fuse) * 20)) > -0.3; if (this.fuse <= 0) { this.world.explode(this.aimPoint(_v).clone(), 3.5, 40, { src: this, color: 0xff7a3d }); this.dead = true; } }
    }
    onDeath() {
      const w = this.world, p = this.aimPoint(_v).clone();
      w.fx.burst(p, [0xd99a5b, 0xffffff], 10, 5, 0.25, 0.6, { normal: true });
      if (G.Audio) G.Audio.sfxAt('crate', p);
      const k = this.crateKind;
      if (k === 'wood') w.pickups.boltBurst(p, U.randInt(6, 12));
      else if (k === 'metal') { w.pickups.boltBurst(p, U.randInt(15, 30)); w.pickups.spawn('part', p, { partId: U.pick(['chip', 'gel', 'fuel']), rarity: 'uncommon' }); }
      else if (k === 'ammo') w.pickups.spawn('ammo', p, { crate: true });
      else if (k === 'health') w.pickups.spawn('health', p, { value: 25 });
      else if (k === 'lumite') w.pickups.spawn('part', p, { partId: 'lumite', rarity: 'epic', n: U.randInt(1, 3) });
      else if (k === 'crystal') w.pickups.spawn('part', p, { partId: 'crystal', rarity: 'rare', n: U.randInt(1, 2) });
      if (k === 'boom') { this.alive = true; this.hp = 1; this.fuse = 3; return; }
      if (k !== 'crystal') G.bus.emit('crate-break', k);
      this.dead = true;
    }
  }
  X.FallbackBot = FallbackBot;
  X.FallbackCrate = FallbackCrate;
})(window.G);

}).call(window); } catch (e) { console.error('[module 21_expedition.js]', e); }
// ---- 21b_exp_island.js
try { (function () {
// 21b_exp_island.js — Expedition island generator (GDD §11a map, §2.3 biomes).
// X.buildIsland(world, {biome, seed, mission, star}) -> island:
//   {hf(x,z), hRaw, R, B, spawn:{pos,yaw,focus}, pads[2], kiosk, checkpoints[], camps[], sites{}, road[], crates[],
//    crystals[], lumites[], sprockets[], jumpPads, anchors[], mesas[], landmarks[{kind,x,z,h,r,ry,view}],
//    mapCanvas, minimap(ctx,k,pl), spot(center, minD, maxD, avoidPos, minAway) -> V3|null, update(dt)}
// Region identity: each biome's B.landmark (lighthouse + jetty, Peach Gate arch, Elder Glowcap, frozen falls,
// Gizmo Works factory) stands in clear view of the landing pad, off every path; the spawn faces the objective or
// that landmark and never straight into a hillside. placeSetPieces() adds each region's signature dressing.
// Everything static is baked into a handful of meshes; dynamic objects (totems, cages, cart...) are made
// by the mode (21c). Deterministic for a given seed (except prop dressing density by quality tier).
(function (G) {
  'use strict';
  const X = G.Exp, U = G.util, V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2;
  const clamp = U.clamp, sstep = U.smoothstep, lerp = U.lerp;
  const N = G.noise;
  const _c = new THREE.Color(), _t = new THREE.Color(), _u = new THREE.Color();

  // ---------------------------------------------------------------- jump pads (shared with boss arenas)
  // Launch the player on a ballistic arc that lands on `target` (player gravity 20 up / 27 down).
  X.launchVel = function (from, to, apexExtra) {
    const dx = to.x - from.x, dz = to.z - from.z, dh = to.y - from.y, d = Math.hypot(dx, dz) || 0.001;
    const apex = Math.max(dh + (apexExtra || 2.6), 3);
    const vy = Math.sqrt(2 * 20 * apex);
    const tUp = vy / 20, tDown = Math.sqrt(2 * Math.max(0.3, apex - dh) / 27);
    const vh = d / (tUp + tDown);
    return new V3(dx / d * vh, vy, dz / d * vh);
  };
  X.JumpPads = class {
    constructor(world) { this.world = world; this.list = []; this.cd = 0; }
    add(pos, target, opts) { const p = { pos: pos.clone(), target: target ? target.clone() : null, vel: opts && opts.vel ? opts.vel.clone() : null, ring: 0 }; this.list.push(p); return p; }
    update(dt) {
      const pl = this.world.player; this.cd -= dt;
      if (!pl || !pl.alive || this.cd > 0) return;
      for (const p of this.list) {
        const dx = pl.pos.x - p.pos.x, dz = pl.pos.z - p.pos.z;
        if (dx * dx + dz * dz > 1.5 * 1.5 || Math.abs(pl.pos.y - p.pos.y) > 0.9) continue;
        const v = p.vel || X.launchVel(pl.pos, p.target, 2.6);
        pl.vel.copy(v); pl.grounded = false; pl.dashT = 0; pl.sliding = 0; pl.jumps = 1; pl.jumpHeld = false; pl.coyote = 0; pl.mantling = null;
        pl.fovKick = 15;
        this.cd = 0.6;
        this.world.fx.ring(p.pos.clone().setY(p.pos.y + 0.3), 2.2, 0x5cffe1, 0.45);
        this.world.fx.burst(p.pos.clone().setY(p.pos.y + 0.4), [0x5cffe1, 0xffffff], 16, 6, 0.3, 0.5, { up: 3 });
        if (G.Audio) G.Audio.sfx('boost');
        if (this.onLaunch) this.onLaunch(p);
        break;
      }
    }
  };

  // ---------------------------------------------------------------- small props built from the kit
  // baked contact shading at the foot of each prop (vertical faces darken toward the ground)
  const gAO = (k, h) => { if (G.Geo.groundAO) G.Geo.groundAO(k.s, 0, 0.24, h); };
  // a placed prop at a uniform scale (its mesh scales; its local colliders scale with it)
  const scaleProp = (pr, s) => {
    pr.mesh.scale.setScalar(s);
    pr.colliders = pr.colliders.map(c => (c.type === 'cyl' ? Object.assign({}, c, { x: c.x * s, z: c.z * s, r: c.r * s, y0: c.y0 * s, y1: c.y1 * s }) : Object.assign({}, c, { cx: c.cx * s, cy: c.cy * s, cz: c.cz * s, sx: c.sx * s, sy: c.sy * s, sz: c.sz * s })));
    for (const k in pr.anchors) pr.anchors[k].multiplyScalar(s);
    return pr;
  };
  X.anchorProp = function () {
    return X.kitCached('exp-anchor', k => {
      const P = G.Geo.P;
      k.add(P.cyl(0.12, 0.16, 1.2, 8), 0x1f2a5a, 0, 0.6, 0);
      k.add(P.sph(0.18, 10, 8), 0xe8b44a, 0, 1.25, 0);
      k.glow(P.tor(0.55, 0.09, 6, 24), 0x39d5ff, 0, 1.9, 0, 0, 0, 0);
      k.glow(P.tor(0.3, 0.05, 5, 18), 0xc8f6ff, 0, 1.9, 0, PI / 2, 0, 0);
      k.glow(P.sph(0.12, 8, 6), 0xe8ffff, 0, 1.9, 0);
    });
  };
  X.kioskProp = function () {
    return X.kitCached('exp-kiosk', k => {
      const P = G.Geo.P;
      k.add(P.rbox(2.6, 0.3, 1.6, 0.1, 1), 0x1f2a5a, 0, 0.15, 0);
      k.add(P.rbox(2.2, 1.2, 1.2, 0.18, 2), 0x2cc3d6, 0, 0.9, 0);
      k.add(P.rbox(2.3, 0.14, 1.3, 0.06, 1), 0xe8b44a, 0, 1.55, 0);
      k.add(P.rbox(1.4, 1.0, 0.25, 0.1, 1), 0x1f2a5a, 0, 2.15, -0.35);
      k.glow(P.rbox(1.18, 0.78, 0.05, 0.06, 1), 0x7af0ff, 0, 2.15, -0.21);
      for (let i = 0; i < 6; i++) k.add(P.rbox(0.48, 0.12, 1.5, 0.05, 1), i % 2 ? 0xfff1dc : 0xff6b8b, -1.2 + i * 0.48, 2.95, 0.15, 0.3, 0, 0);
      for (const sx of [-1, 1]) k.add(P.cyl(0.07, 0.07, 1.4, 6), 0xe8b44a, sx * 1.1, 2.25, 0.6);
      k.add(P.cyl(0.42, 0.42, 0.12, 16), 0xffc93c, 0, 3.55, 0, PI / 2, 0, 0);
      k.add(P.cyl(0.2, 0.2, 0.14, 6), 0xe09a00, 0, 3.55, 0, PI / 2, 0, 0);
      k.box(0, 0.9, 0, 2.3, 1.8, 1.4);
      k.anchor('use', 0, 0, 1.4);
      gAO(k, 0.8);
    });
  };
  // ---------------------------------------------------------------- camp kits (one crafted set per region)
  // Every Gizmob camp gets its region's kit around the open middle where its robots stand: a hut (door toward the
  // middle), two or three themed pieces and the orange Gizmob banner. Sunny Shoals: stilted beach hut, surfboards
  // stuck in the sand, a life ring on a post. Peach Mesas: striped canvas awning over a crate pile, crate stack and a
  // clay water jar. Glowcap Grotto: spotted glowcap hut, glow lamps on curled stalks, a mushroom clump. Frostfizz:
  // ice-block igloo, a sled with a bundle, an ice-block stack. Junkyard Rim: corrugated scrap shack, tyre stacks and an
  // oil drum. Low segment counts (~0.6-1.6k triangles a piece, ~3.5k a camp): the camp props are baked into the
  // island's two static halves, which draw whole. No terrain occlusion under them (on the 2.5-3 m terrain grid that
  // read as a hard-edged dark square); soft rounded contact shadows instead (X.contactShadows, one draw call).
  const tubeG = (ax, ay, az, bx, by, bz, r0, r1, seg) => {
    const a = new V3(ax, ay, az), d = new V3(bx - ax, by - ay, bz - az), len = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, seg || 6, 1, false); g.deleteAttribute('uv'); g.translate(0, len / 2, 0);
    g.applyMatrix4(new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize()), new V3(1, 1, 1)));
    return g;
  };
  const stripes = (c0, c1, n, axis) => (x, y, z) => { const t = axis === 'y' ? y : axis === 'z' ? z : x; return new THREE.Color(((Math.floor(t * n) % 2) + 2) % 2 ? c0 : c1); };
  // crisp stripes on a segmented box: every triangle takes the colour at its centroid, so stripe edges sit on the segment
  // lines (per-vertex colours on a plain box only see its eight corners: the stripes blended away into one wash)
  const segBox = (w, h, d, sx, sy, sz) => { const g = new THREE.BoxGeometry(w, h, d, sx || 1, sy || 1, sz || 1); g.deleteAttribute('uv'); return g.toNonIndexed(); };
  const faceCol = (g, fn) => {
    const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
    for (let i = 0; i + 2 < n; i += 3) {
      const c = fn((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3);
      for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  const woodC = (base, axis) => (G.Geo.woodCol ? G.Geo.woodCol(base, axis) : base);
  const flag = (k, P, x, y, z, h) => { k.add(P.cyl(0.045, 0.05, h || 1.2, 5), 0x1f2a5a, x, y + (h || 1.2) / 2, z); k.add(P.box(0.7, 0.4, 0.04), 0xff7a3d, x + 0.36, y + (h || 1.2) - 0.25, z); };
  const KIT = {
    // ---- Sunny Shoals
    shoals: {
      hut(k, P) {
        // stilted beach hut: mint / cream striped walls, coral pyramid roof with a cream trim, porthole, plank steps
        for (const sx of [-1.15, 1.15]) for (const sz of [-1.05, 1.05]) k.add(P.cyl(0.11, 0.13, 0.7, 6), woodC(0xc8884a, 'y'), sx, 0.35, sz);
        k.add(P.rbox(2.7, 0.16, 2.5, 0.05, 1), woodC(0xd99a5b, 'x'), 0, 0.72, 0);
        const wall = faceCol(segBox(2.3, 1.55, 2.1, 6, 1, 6), (x, y, z) => _c.setHex((Math.abs(x) > 1.14 ? Math.floor((z + 1.05) / 0.35) : Math.floor((x + 1.15) / (2.3 / 6))) % 2 ? 0x7fe8d0 : 0xfff6ea));
        wall.translate(0, 1.57, 0); k.addRaw(wall);
        k.add(P.rbox(2.5, 0.12, 2.3, 0.04, 1), 0xfff6ea, 0, 2.38, 0);
        const roof = P.cone(2.15, 1.25, 4); roof.rotateY(PI / 4); roof.translate(0, 3.05, 0);
        G.Geo.colorize(roof, (x, y, z) => new THREE.Color(y < 2.6 ? 0xfff6ea : 0xff8fb0)); k.addRaw(roof);
        k.add(P.sph(0.14, 6, 4), 0xffd23f, 0, 3.72, 0);
        k.add(P.rbox(0.8, 1.15, 0.12, 0.08, 1), 0x2a3f7a, 0, 1.4, 1.07);
        k.add(P.rbox(0.9, 0.09, 0.16, 0.03, 1), 0xff8fb0, 0, 2.03, 1.09);
        k.add(P.tor(0.26, 0.07, 4, 10), 0xfff6ea, 0.82, 1.7, 1.06); k.add(P.cyl(0.21, 0.21, 0.04, 8), 0x9fe8ff, 0.82, 1.7, 1.06, PI / 2, 0, 0);
        for (let i = 0; i < 2; i++) k.add(P.box(0.9, 0.1, 0.32), woodC(0xd99a5b, 'x'), 0, 0.22 + i * 0.25, 1.45 + (1 - i) * 0.3);
        if (G.Geo.emblem) k.add(G.Geo.emblem('star', 0xffd23f).clone().scale(0.32, 0.32, 0.32), null, -0.78, 1.95, 1.08);
        flag(k, P, -0.9, 2.3, -0.8, 1.6);
        k.box(0, 1.6, 0, 2.7, 3.2, 2.5);
      },
      a(k, P) {
        // surfboards stuck in a sand mound (pink / sunny / teal, a stripe each)
        k.add(P.sph(0.9, 8, 4), 0xf2d49a, 0, -0.45, 0, 0, 0, 0, 1, 0.55, 0.8);
        const cols = [[0xff8fb0, 0xfff6ea], [0xffd23f, 0xff8a4c], [0x39c6e8, 0xfff6ea]];
        cols.forEach((c, i) => {
          const b = P.cap(0.27, 1.45, 2, 8); b.scale(1, 1, 0.22);
          G.Geo.colorize(b, (x, y) => new THREE.Color(Math.abs(y - 0.25) < 0.16 ? c[1] : c[0]));
          k.add(b, null, -0.55 + i * 0.55, 0.95, 0.05 * i, 0.1 * (i - 1), 0.4 * (i - 1), (i - 1) * 0.22);
        });
        k.cyl(0, 0, 0.9, 0, 1.8);
      },
      b(k, P) {
        // a life-ring post and a little coral crate
        k.add(P.cyl(0.09, 0.11, 1.5, 6), woodC(0xc8884a, 'y'), 0, 0.75, 0);
        const ring = P.tor(0.34, 0.1, 5, 12); G.Geo.colorize(ring, (x, y) => new THREE.Color(Math.floor((Math.atan2(y, x) + PI) / (PI / 4)) % 2 ? 0xff6b6b : 0xffffff));
        k.add(ring, null, 0, 1.1, 0.13);
        k.add(P.rbox(0.8, 0.6, 0.6, 0.08, 1), woodC(0xf0c890, 'x'), 0.75, 0.3, -0.2, 0, 0.4, 0);
        k.add(P.sph(0.26, 8, 5), 0xff9fbc, 0.75, 0.75, -0.2);
        k.cyl(0, 0, 0.2, 0, 1.5); k.cyl(0.75, -0.2, 0.45, 0, 0.7);
      },
    },
    // ---- Peach Mesas
    mesas: {
      hut(k, P) {
        // striped canvas awning on four poles over a crate pile, a rolled rug and a lantern hook
        const H0 = 2.0, H1 = 2.6;
        for (const sx of [-1.5, 1.5]) { k.add(P.cyl(0.07, 0.08, H0, 6), woodC(0xa86a3c, 'y'), sx, H0 / 2, -1.1); k.add(P.cyl(0.07, 0.08, H1, 6), woodC(0xa86a3c, 'y'), sx, H1 / 2, 1.1); }
        const sheet = faceCol(segBox(3.4, 0.07, 2.6, 8, 1, 1), x => _c.setHex(Math.floor((x + 1.7) / 0.425) % 2 ? 0xff9a5a : 0xfff1dc));
        sheet.rotateX(-Math.atan2(H1 - H0, 2.2)); sheet.translate(0, (H0 + H1) / 2 + 0.06, 0); k.addRaw(sheet);
        for (let i = 0; i < 7; i++) { const sc = P.cyl(0.24, 0.24, 0.06, 8, false); sc.rotateX(PI / 2); k.add(sc, i % 2 ? 0xfff1dc : 0xff9a5a, -1.45 + i * 0.483, H1 + 0.03, 1.32, 0, 0, 0, 1, 1, 1); }
        k.add(P.rbox(0.95, 0.85, 0.85, 0.08, 1), woodC(0xd8a868, 'x'), -0.7, 0.43, -0.4, 0, 0.2, 0);
        k.add(P.rbox(0.8, 0.7, 0.75, 0.08, 1), woodC(0xe8b878, 'x'), 0.35, 0.35, -0.5, 0, -0.3, 0);
        k.add(P.rbox(0.7, 0.6, 0.7, 0.08, 1), woodC(0xd8a868, 'x'), -0.55, 1.15, -0.45, 0, 0.6, 0);
        const rug = P.cyl(0.22, 0.22, 1.7, 10); rug.rotateZ(PI / 2); G.Geo.colorize(rug, stripes(0xc9624a, 0xffd23f, 3)); k.add(rug, null, 0.6, 0.22, 0.45);
        k.add(P.cyl(0.02, 0.02, 0.5, 4), 0x1f2a5a, 1.2, H1 - 0.3, 0.9);
        k.glow(P.sph(0.14, 8, 6), 0xffd27a, 1.2, H1 - 0.6, 0.9);
        flag(k, P, 1.5, H1, 1.1, 1.0);
        k.box(-0.15, 0.6, -0.45, 1.8, 1.2, 1.2); for (const sx of [-1.5, 1.5]) for (const sz of [-1.1, 1.1]) k.cyl(sx, sz, 0.12, 0, H1);
      },
      a(k, P) {
        // crate stack with a rope and a barrel
        k.add(P.rbox(0.9, 0.9, 0.9, 0.08, 1), woodC(0xd8a868, 'y'), -0.5, 0.45, 0);
        k.add(P.rbox(0.9, 0.9, 0.9, 0.08, 1), woodC(0xe0b070, 'y'), 0.45, 0.45, 0.1, 0, 0.25, 0);
        k.add(P.rbox(0.85, 0.85, 0.85, 0.08, 1), woodC(0xd09858, 'y'), -0.05, 1.33, 0.05, 0, -0.35, 0);
        for (const [x, z, ry] of [[-0.5, 0, 0], [0.45, 0.1, 0.25]]) k.add(P.box(0.93, 0.08, 0.93), 0xa86a3c, x, 0.62, z, 0, ry, 0);
        k.add(G.Geo.lathe([[0.32, 0], [0.38, 0.2], [0.4, 0.5], [0.36, 0.85], [0.3, 0.9], [0, 0.9]], 10), (x, y) => new THREE.Color(Math.abs(y - 0.45) < 0.05 || Math.abs(y - 0.15) < 0.04 || Math.abs(y - 0.75) < 0.04 ? 0xa86a3c : 0x5fb0d8), 1.3, 0, -0.3);
        k.box(-0.02, 0.9, 0.05, 1.9, 1.8, 1.1); k.cyl(1.3, -0.3, 0.4, 0, 0.9);
      },
      b(k, P) {
        // clay water jar and a small round cactus in a pot
        k.add(G.Geo.lathe([[0.25, 0], [0.45, 0.25], [0.5, 0.55], [0.38, 0.9], [0.2, 1.05], [0.24, 1.15], [0, 1.12]], 12), (x, y) => new THREE.Color(Math.abs(y - 0.6) < 0.06 ? 0xfff1dc : 0xd97b5a), 0, 0, 0);
        k.add(G.Geo.lathe([[0.22, 0], [0.28, 0.35], [0, 0.35]], 10), 0xc9624a, 0.75, 0, 0.35);
        k.add(P.sph(0.3, 10, 7), 0x6fbf6a, 0.75, 0.6, 0.35, 0, 0, 0, 1, 1.2, 1);
        k.add(P.sph(0.09, 6, 4), 0xff7a93, 0.75, 0.97, 0.35);
        k.cyl(0, 0, 0.5, 0, 1.15); k.cyl(0.75, 0.35, 0.3, 0, 0.9);
      },
    },
    // ---- Glowcap Grotto
    grotto: {
      hut(k, P) {
        // glowcap hut: cream stalk with a round door and a lit window, a wide violet cap dotted with glowing spots
        k.add(P.cyl(0.95, 1.15, 1.9, 12), 0xf3e6d0, 0, 0.95, 0);
        const cap = G.Geo.lathe([[0.9, 1.75], [2.15, 1.8], [2.45, 2.15], [2.2, 2.6], [1.45, 3.0], [0, 3.15]], 14);
        const c0 = new THREE.Color(0x6c4fd8), c1 = new THREE.Color(0xb983ff);
        G.Geo.colorize(cap, (x, y) => c0.clone().lerp(c1, clamp((y - 1.75) / 1.4, 0, 1)));
        k.addRaw(cap);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3, r = i % 2 ? 1.25 : 1.85, y = i % 2 ? 2.92 : 2.55; k.glow(P.sph(i % 2 ? 0.22 : 0.28, 6, 4), 0x9ffcff, Math.cos(a) * r, y, Math.sin(a) * r); }
        k.add(P.cyl(0.42, 0.42, 0.12, 10), 0x2a1b3d, 0, 0.62, 1.07, PI / 2, 0, 0);
        k.add(P.tor(0.42, 0.06, 5, 12), 0xb983ff, 0, 0.62, 1.1);
        k.glow(P.cyl(0.22, 0.22, 0.06, 8), 0xffe9a8, 0.8, 1.35, 0.72, PI / 2, 0.85, 0);
        flag(k, P, 0, 3.1, 0, 1.0);
        k.cyl(0, 0, 1.6, 0, 2.2);
      },
      a(k, P) {
        // two glow lamps on curled stalks (bulbs hang from the curl)
        for (const [x, z, s] of [[-0.6, 0, 1], [0.7, 0.4, 0.8]]) {
          k.add(tubeG(x, 0, z, x + 0.1 * s, 1.5 * s, z, 0.09, 0.07, 6), 0x3aa58a);
          k.add(tubeG(x + 0.1 * s, 1.5 * s, z, x + 0.5 * s, 2.0 * s, z, 0.07, 0.06, 6), 0x3aa58a);
          k.add(tubeG(x + 0.5 * s, 2.0 * s, z, x + 0.8 * s, 1.85 * s, z, 0.06, 0.05, 6), 0x3aa58a);
          k.glow(P.sph(0.22 * s, 10, 7), 0x9ffcff, x + 0.82 * s, 1.6 * s, z);
          k.add(P.cone(0.2 * s, 0.14 * s, 8), 0xb983ff, x + 0.82 * s, 1.84 * s, z);
          k.add(P.sph(0.2, 8, 5), 0x2f6e6a, x, 0.05, z, 0, 0, 0, 1.3, 0.5, 1.3);
        }
        k.cyl(-0.6, 0, 0.15, 0, 1.6); k.cyl(0.7, 0.4, 0.15, 0, 1.3);
      },
      b(k, P) {
        // a clump of small glowcaps
        const caps = [0xff5fa2, 0xffa85c, 0xb983ff];
        [[0, 0, 0.75], [0.6, 0.25, 0.5], [-0.45, 0.35, 0.45], [0.2, -0.5, 0.38]].forEach(([x, z, s], i) => {
          k.add(P.cyl(0.1 * s / 0.5, 0.13 * s / 0.5, s, 6), 0xf3e6d0, x, s / 2, z);
          k.add(G.Geo.lathe([[0.1, s * 0.9], [0.55 * s / 0.5 * 0.5, s * 0.95], [0.5 * s / 0.5 * 0.5, s * 1.2], [0, s * 1.35]], 10), caps[i % 3], x, 0, z);
          k.glow(P.sph(0.06, 5, 3), 0x9ffcff, x + 0.12, s * 1.22, z + 0.1);
        });
        k.cyl(0, 0, 0.6, 0, 1.0);
      },
    },
    // ---- Frostfizz Bluffs
    frost: {
      hut(k, P) {
        // igloo (review pass: its block pattern was a per-vertex colour on a coarse lathe, which blurred into one plain
        // white dome): crisp offset ice blocks — one colour per triangle on a finer lathe, two segments a block, every
        // other row shifted by one — a navy door, a warm lit porthole, a candy-striped stove pipe with a puff, two strings
        // of pastel bunting from the flag to the tunnel and a glowing crystal lamp by the door (~700 triangles: every camp
        // kit is baked into the island's static halves, which draw whole, so small bits bypass the primitive minimums; the
        // icicle cone over the door is gone — no spikes)
        const prof = [[2.1, 0], [2.04, 0.5], [1.86, 1.0], [1.5, 1.48], [1.0, 1.84], [0.5, 2.02], [0, 2.06]], SEG = 16;
        const dome = G.Geo.lathe(prof, SEG).toNonIndexed(), tones = [0xf8fdff, 0xe4f2ff, 0xd2e8fc];
        // (a triangle lies in exactly one ring band: its row is the number of ring heights below its centre)
        faceCol(dome, (x, y, z) => { let row = 0; for (let i = 1; i < prof.length - 1; i++) if (y > prof[i][1]) row++; const seg = Math.floor(((Math.atan2(z, x) + PI) / TAU) * SEG + 1e-4), col = Math.floor((seg + (row % 2)) / 2); return _c.setHex(tones[((col * 7 + row * 3) % 5) % 3]); });
        k.addRaw(dome);
        const raw = g => { g.deleteAttribute('uv'); return g; };
        k.add(P.rbox(1.4, 1.15, 1.3, 0.3, 1), 0xeaf6ff, 0, 0.57, 2.0);
        k.add(P.rbox(0.8, 0.86, 0.12, 0.3, 1), 0x2a3a6a, 0, 0.47, 2.66);
        k.add(raw(new THREE.SphereGeometry(0.05, 5, 3)), 0xffd23f, 0.24, 0.45, 2.74);
        // a warm porthole on the dome's flank (facing +X+Z) and a candy-striped stove pipe on the back
        // (tilted back ~29° to lie along the dome's slope there, then turned to face +X+Z: flat and vertical, its lower
        // half sank into the curved wall)
        const pw = raw(new THREE.CircleGeometry(0.24, 10)); pw.rotateX(-0.5);
        const pf = raw(new THREE.TorusGeometry(0.27, 0.06, 3, 10)); pf.rotateX(-0.5);
        k.glow(pw, 0xffd98a, 1.38, 1.02, 1.38, 0, PI / 4, 0); k.add(pf, 0x9fc8ff, 1.37, 1.02, 1.37, 0, PI / 4, 0);
        for (let i = 0; i < 2; i++) k.add(raw(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 6, 1, true)), i % 2 ? 0xfff6fa : 0xff7aa8, -0.72, 1.92 + i * 0.4, -0.42);
        k.add(raw(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 6)), 0x2a3a6a, -0.72, 2.66, -0.42); k.add(raw(new THREE.SphereGeometry(0.2, 5, 3)), 0xf4f8ff, -0.6, 2.98, -0.45);
        // bunting: two sagging strings from the flag pole to the tunnel's front corners, five pastel pennants each
        const FL = [0xff8fb0, 0xffd23f, 0x7fe0d0, 0xb983ff, 0x8fd0ff], fp = [], fc = [];
        for (const sx of [-1, 1]) {
          const ax = 0, ay = 2.95, az = 0, bx = sx * 0.68, by = 1.16, bz = 2.62, at = t => [ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * PI) * 0.22, az + (bz - az) * t];
          for (let i = 0; i < 4; i++) { const p0 = at(i / 4), p1 = at((i + 1) / 4); k.add(tubeG(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.015, 0.015, 3), 0xfff6ea); }
          for (let j = 0; j < 5; j++) {
            const p0 = at((j + 0.2) / 5.2 + 0.03), p1 = at((j + 0.85) / 5.2 + 0.03), pm = at((j + 0.52) / 5.2 + 0.03), c = new THREE.Color(FL[(j + (sx > 0 ? 2 : 0)) % FL.length]);
            fp.push(p0[0], p0[1], p0[2], pm[0], pm[1] - 0.22, pm[2], p1[0], p1[1], p1[2], p1[0], p1[1], p1[2], pm[0], pm[1] - 0.22, pm[2], p0[0], p0[1], p0[2]);
            for (let q = 0; q < 6; q++) fc.push(c.r, c.g, c.b);
          }
        }
        const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3)); fg.computeVertexNormals();
        k.addRaw(fg);
        // a crystal lamp beside the tunnel mouth
        k.add(raw(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 5, 1, true)), 0x6a7ab8, 0.98, 0.45, 2.75); k.glow(P.oct(0.15), 0x9ff0ff, 0.98, 1.05, 2.75, 0, 0.4, 0, 1, 1.35, 1);
        flag(k, P, 0, 1.95, 0, 1.2);
        k.cyl(0, 0, 1.6, 0, 2.2); k.box(0, 0.6, 2.0, 1.4, 1.2, 1.3); k.cyl(0.98, 2.75, 0.12, 0, 1.1);
      },
      a(k, P) {
        // wooden sled with curled runners and a strapped bundle
        for (const sx of [-0.45, 0.45]) {
          k.add(P.box(0.07, 0.07, 1.9), 0xc9d2ea, sx, 0.05, 0);
          k.add(P.tor(0.22, 0.04, 4, 8, PI), 0xc9d2ea, sx, 0.27, 0.95, 0, PI / 2, 0);
          for (const z of [-0.6, 0, 0.6]) k.add(P.box(0.06, 0.3, 0.06), 0xa86a3c, sx, 0.2, z);
        }
        for (let i = 0; i < 5; i++) k.add(P.box(1.05, 0.06, 0.32), woodC(i % 2 ? 0xd99a5b : 0xc8884a, 'x'), 0, 0.38, -0.72 + i * 0.36);
        k.add(P.rbox(0.8, 0.45, 0.9, 0.18, 1), 0xff6b8b, 0, 0.64, -0.15);
        k.add(P.box(0.84, 0.06, 0.1), 0xffd23f, 0, 0.66, 0.1); k.add(P.box(0.84, 0.06, 0.1), 0xffd23f, 0, 0.66, -0.4);
        k.box(0, 0.45, 0, 1.1, 0.9, 2.0);
      },
      b(k, P) {
        // ice-block stack with a frosty pink crystal on top
        k.metal(P.rbox(0.8, 0.6, 0.8, 0.1, 1), 0xd8f2ff, -0.42, 0.3, 0); k.metal(P.rbox(0.8, 0.6, 0.8, 0.1, 1), 0xc4e6ff, 0.42, 0.3, 0.05, 0, 0.2, 0);
        k.metal(P.rbox(0.8, 0.6, 0.8, 0.1, 1), 0xe6f6ff, 0, 0.9, 0.02, 0, -0.3, 0);
        k.metal(P.oct(0.28), 0xff9de2, 0, 1.45, 0, 0, 0, 0, 1, 1.5, 1);
        k.box(0, 0.6, 0, 1.7, 1.2, 0.9);
      },
    },
    // ---- Junkyard Rim
    junk: {
      hut(k, P) {
        // corrugated scrap shack (art pass: the old one was a flat teal box — its stripes fell between the corners of an
        // unsegmented box and never showed): a riveted plinth, rounded teal walls clad in real half-round corrugation ribs,
        // an orange patch panel, a framed navy door with a porthole and a lit window with a flower box under a striped
        // awning, a ribbed tin roof with a chimney pipe, a little dish and an antenna, and a string of glowing bulbs
        // (~1.1k triangles: every camp kit is baked into the island's static halves, which draw whole — flat parts are plain
        // boxes, ribs are three-sided ridges, round bits bypass the primitive minimums)
        const H = 2.0, W = 2.6, D = 2.2, y0 = 0.2, teal = 0x3fb4a8, rib = [0x6ad8ca, 0x52c6b8];
        const tinyS = (r, col, x, y, z, glow) => { const g = new THREE.SphereGeometry(r, 5, 3); g.deleteAttribute('uv'); if (glow) k.glow(g, col, x, y, z); else k.add(g, col, x, y, z); };
        // (a three-sided rib turned so one ridge faces out: it catches a highlight line like a half-round corrugation)
        const ribG = ry => { const g = new THREE.CylinderGeometry(0.06, 0.06, H - 0.22, 3, 1, true); g.deleteAttribute('uv'); g.rotateY(ry); return g; };
        k.add(P.box(W + 0.3, y0 + 0.02, D + 0.3), 0x6a6a8a, 0, y0 / 2, 0);
        k.add(P.rbox(W, H, D, 0.14, 1), teal, 0, y0 + H / 2, 0);
        const ribs = (x0, z0, ax, az, len, n, nx, nz) => { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; k.add(ribG(Math.atan2(nx, nz)), rib[i % 2], x0 + ax * t * len + nx * 0.02, y0 + H / 2, z0 + az * t * len + nz * 0.02); } };
        ribs(0, -D / 2, 1, 0, W - 0.3, 8, 0, -1); ribs(-W / 2, 0, 0, 1, D - 0.3, 6, -1, 0); ribs(W / 2, 0, 0, 1, D - 0.3, 6, 1, 0);
        k.add(P.box(0.07, 0.95, 1.0), 0xff8a4c, W / 2 + 0.08, y0 + 0.75, -0.3);
        for (const [dy, dz] of [[0.36, 0.38], [-0.36, 0.38], [0.36, -0.38], [-0.36, -0.38]]) k.add(P.box(0.05, 0.07, 0.07), 0xffd23f, W / 2 + 0.12, y0 + 0.75 + dy, -0.3 + dz);
        // front: lighter scrap panel, framed door with a porthole, lit window with mullions and a flower box
        k.add(P.box(W - 0.1, H - 0.1, 0.08), 0xa4aec4, 0, y0 + H / 2, D / 2 + 0.02);
        k.add(P.box(1.0, 1.62, 0.12), 0xffd23f, -0.5, y0 + 0.8, D / 2 + 0.07);
        k.add(P.box(0.78, 1.46, 0.1), 0x2a2f5a, -0.5, y0 + 0.74, D / 2 + 0.12);
        const port = new THREE.CircleGeometry(0.12, 8); port.deleteAttribute('uv');
        k.add(P.tor(0.15, 0.04, 4, 8), 0xc9d2ea, -0.5, y0 + 1.12, D / 2 + 0.17); k.glow(port, 0x9ff0ff, -0.5, y0 + 1.12, D / 2 + 0.18);
        tinyS(0.05, 0xffd23f, -0.22, y0 + 0.72, D / 2 + 0.2);
        k.add(P.box(0.74, 0.64, 0.12), 0xff8a4c, 0.62, y0 + 1.22, D / 2 + 0.07);
        k.glow(P.box(0.56, 0.46, 0.04), 0xffd98a, 0.62, y0 + 1.22, D / 2 + 0.12);
        k.add(P.box(0.04, 0.48, 0.03), 0x2a2f5a, 0.62, y0 + 1.22, D / 2 + 0.15); k.add(P.box(0.58, 0.04, 0.03), 0x2a2f5a, 0.62, y0 + 1.22, D / 2 + 0.15);
        k.add(P.box(0.8, 0.16, 0.2), woodC(0xc8884a, 'x'), 0.62, y0 + 0.82, D / 2 + 0.16);
        for (let i = 0; i < 3; i++) tinyS(0.08, [0xff7aa8, 0xffd84a, 0x8bea4a][i], 0.4 + i * 0.22, y0 + 0.96, D / 2 + 0.17);
        // striped awning over the door and the window (one segmented sheet in alternating stripes + a scalloped lip), on
        // two brackets
        const slats = faceCol(segBox(2.61, 0.05, 0.72, 9, 1, 1), x => _c.setHex(Math.floor((x + 1.305) / 0.29) % 2 ? 0xfff1dc : 0xff8a4c));
        slats.rotateX(-0.32); slats.translate(0.01, y0 + H + 0.02, D / 2 + 0.36); k.addRaw(slats);
        for (let i = 0; i < 9; i++) {
          const sc = new THREE.CircleGeometry(0.145, 4, PI, PI); sc.deleteAttribute('uv');   // (a half disc hanging below the lip, facing +Z)
          k.add(sc, i % 2 ? 0xfff1dc : 0xff8a4c, -1.15 + i * 0.29, y0 + H - 0.1, D / 2 + 0.69, -0.32, 0, 0);
        }
        for (const sx of [-1.05, 1.05]) k.add(P.box(0.05, 0.05, 0.72), 0x2a2f5a, sx, y0 + H - 0.22, D / 2 + 0.33, 0.62, 0, 0);
        for (let i = 0; i < 6; i++) tinyS(0.075, [0xffd23f, 0xff6b8b, 0x7af0ff][i % 3], -1.0 + i * 0.4, y0 + H - 0.26 - Math.sin((i / 5) * PI) * 0.06, D / 2 + 0.76, true);
        // ribbed tin roof, chimney pipe with a cap and a puff, a little dish and an antenna with a glowing tip
        k.add(P.box(W + 0.5, 0.1, D + 0.5), 0xff8a4c, 0, y0 + H + 0.14, -0.05, 0.14, 0, 0);
        for (let i = 0; i < 8; i++) { const g = new THREE.CylinderGeometry(0.05, 0.05, D + 0.5, 3, 1, true); g.deleteAttribute('uv'); g.rotateY(PI); k.add(g, 0xffa86a, -W / 2 - 0.15 + i * (W + 0.3) / 7, y0 + H + 0.2, -0.05, PI / 2 + 0.14, 0, 0); }
        k.add(P.cyl(0.15, 0.17, 1.2, 8, true), 0x6a6a8a, 0.8, y0 + H + 0.75, -0.55); k.add(P.cyl(0.25, 0.25, 0.12, 8), 0x2a2f5a, 0.8, y0 + H + 1.38, -0.55);
        tinyS(0.2, 0xf4ecff, 0.95, y0 + H + 1.75, -0.6);
        k.add(G.Geo.lathe([[0, 0], [0.3, 0.08], [0.38, 0.2], [0, 0.12]], 6), 0xd8dcef, -0.65, y0 + H + 0.42, -0.4, -0.7, 0.4, 0);
        k.add(P.box(0.03, 0.9, 0.03), 0x2a2f5a, -0.95, y0 + H + 0.75, -0.75); tinyS(0.07, 0xff6b8b, -0.95, y0 + H + 1.22, -0.75, true);
        // a leaning tyre by the side wall
        k.add(P.tor(0.36, 0.14, 4, 8), 0x2f2f4a, -W / 2 - 0.22, y0 + 0.3, 0.55, 0, PI / 2, 0.25);
        flag(k, P, -W / 2, y0 + H, -D / 2, 1.3);
        k.box(0, H / 2, 0, 2.7, H + 0.3, 2.3);
      },
      a(k, P) {
        // two tyre stacks, one leaning tyre
        for (let i = 0; i < 3; i++) k.add(P.tor(0.42, 0.17, 4, 10), 0x2f2f4a, -0.45, 0.17 + i * 0.34, 0, PI / 2, 0, i * 0.4);
        for (let i = 0; i < 2; i++) k.add(P.tor(0.42, 0.17, 4, 10), 0x34344f, 0.55, 0.17 + i * 0.34, 0.15, PI / 2, 0, i * 0.7);
        k.add(P.tor(0.42, 0.17, 4, 10), 0x2f2f4a, 0.2, 0.5, -0.65, 0.25, 0.4, 0);
        k.add(P.cyl(0.2, 0.2, 0.3, 8), 0xffd23f, -0.45, 0.92, 0);
        k.cyl(-0.45, 0, 0.6, 0, 1.1); k.cyl(0.55, 0.15, 0.6, 0, 0.75);
      },
      b(k, P) {
        // striped oil drum and a toolbox
        k.add(G.Geo.lathe([[0.36, 0], [0.4, 0.12], [0.4, 0.5], [0.4, 0.88], [0.36, 1.0], [0, 1.0]], 12), (x, y) => new THREE.Color(Math.abs(y - 0.33) < 0.06 || Math.abs(y - 0.67) < 0.06 ? 0xffd23f : 0x8f6bff), 0, 0, 0);
        k.add(P.rbox(0.7, 0.35, 0.4, 0.06, 1), 0xff4d5e, 0.7, 0.18, 0.3, 0, 0.5, 0);
        k.add(P.box(0.3, 0.06, 0.06), 0x1f2a5a, 0.7, 0.4, 0.3, 0, 0.5, 0);
        k.cyl(0, 0, 0.42, 0, 1.0); k.cyl(0.7, 0.3, 0.4, 0, 0.4);
      },
    },
  };
  // camp piece: 'hut' | 'a' | 'b' for a region (unknown regions use the Mesas kit)
  X.campPiece = function (biome, piece) {
    const kind = KIT[biome] ? biome : 'mesas';
    return X.kitCached('exp-camp|' + kind + '|' + piece, k => { KIT[kind][piece](k, G.Geo.P); gAO(k, piece === 'hut' ? 1.0 : 0.6); }, { rimStr: 0.4 });
  };
  X.tentProp = biome => X.campPiece(biome, 'hut');
  // Soft rounded contact shadows: one mesh for many draped discs (spots [{x, z, rx, rz, ry, k}]: radii in metres, yaw,
  // centre darkness 0..1). Each disc is a 14-segment polar patch on the heightfield (+5 cm, polygon offset) whose
  // vertex alpha falls off smoothly to 0 at the rim, in a deep violet that reads as shade in every region.
  X.contactShadows = function (world, hf, spots) {
    if (!spots.length) return null;
    // (12 segments for a hut / big piece, 8 for small ones; 3 rings: the vertex alpha falls off smoothly enough)
    const RINGS = [0, 0.4, 0.75, 1], col = new THREE.Color(0x231a4a), segOf = s => (Math.max(s.rx, s.rz) >= 1.3 ? 12 : 8);
    let nv = 0; for (const s of spots) nv += 1 + segOf(s) * (RINGS.length - 1);
    const pos = new Float32Array(nv * 3), cl = new Float32Array(nv * 4), idx = [];
    let v = 0;
    for (const s of spots) {
      const SEG = segOf(s), c = Math.cos(s.ry || 0), sn = Math.sin(s.ry || 0), base = v;
      const put = (lx, lz, a) => { const x = s.x + lx * c + lz * sn, z = s.z - lx * sn + lz * c; pos[v * 3] = x; pos[v * 3 + 1] = hf(x, z) + 0.05; pos[v * 3 + 2] = z; cl[v * 4] = col.r; cl[v * 4 + 1] = col.g; cl[v * 4 + 2] = col.b; cl[v * 4 + 3] = a; v++; };
      put(0, 0, s.k);
      for (let r = 1; r < RINGS.length; r++) {
        const t = RINGS[r], f = (1 - t * t), a = s.k * f * f;
        for (let j = 0; j < SEG; j++) { const th = (j / SEG) * TAU; put(Math.cos(th) * s.rx * t, Math.sin(th) * s.rz * t, a); }
      }
      for (let j = 0; j < SEG; j++) idx.push(base, base + 1 + (j + 1) % SEG, base + 1 + j);
      for (let r = 1; r < RINGS.length - 1; r++) {
        const r0 = base + 1 + (r - 1) * SEG, r1 = r0 + SEG;
        for (let j = 0; j < SEG; j++) { const j1 = (j + 1) % SEG; idx.push(r0 + j, r0 + j1, r1 + j1, r0 + j, r1 + j1, r1 + j); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cl, 4));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.name = 'contactShadows'; m.renderOrder = 1;
    world.add(m);
    return m;
  };
  X.scrapPileProp = function (seed) {
    return X.kitCached('exp-scrap|' + (seed % 3), k => {
      const P = G.Geo.P, r = G.rng(seed % 3 + 5);
      for (let i = 0; i < 7; i++) {
        const a = r() * TAU, d = r() * 1.1, s = 0.35 + r() * 0.4;
        const g = r() < 0.5 ? P.rbox(s * 1.6, s, s * 1.2, 0.08, 1) : P.cyl(s * 0.6, s * 0.6, s * 1.4, 8);
        k.add(g, [0x9aa5b8, 0x7a86c8, 0xff7a3d, 0x5b3a8c, 0xc9d2ea][i % 5], Math.cos(a) * d, s * 0.45 + (i > 4 ? 0.5 : 0), Math.sin(a) * d, r() * 0.8, r() * 3, r() * 0.8);
      }
      k.add(P.tor(0.5, 0.2, 6, 14), 0x2a2d55, 0.2, 0.2, -0.6, PI / 2, 0, 0);
      k.cyl(0, 0, 1.2, 0, 1.0);
      gAO(k, 0.6);
    });
  };
  // Factory tower (Junkyard Rim): striped orange/plum chimney stack with glowing windows.
  X.towerProp = function (h, seed) {
    return X.kitCached('exp-tower|' + h + '|' + seed, k => {
      const P = G.Geo.P, r = G.rng(seed + 3);
      const rad = 2.4 + r() * 1.2;
      const body = P.cyl(rad * 0.86, rad, h, 14, false); body.translate(0, h / 2, 0);
      G.Geo.colorize(body, (x, y) => new THREE.Color(Math.floor(y / 2.2) % 2 ? 0xff7a3d : 0x5b3a8c));
      k.addRaw(body);
      k.add(P.cyl(rad * 0.95, rad * 0.95, 0.5, 14), 0xe8b44a, 0, h + 0.25, 0);
      k.add(P.cyl(rad * 0.45, rad * 0.55, 3.5, 10), 0x6a6a8a, rad * 0.25, h + 2.2, 0);
      k.glow(P.tor(rad * 0.47, 0.12, 5, 14), 0xffd23f, rad * 0.25, h + 4.0, 0, PI / 2, 0, 0);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + r(); k.glow(P.rbox(0.6, 0.9, 0.1, 0.06, 1), 0xffe28a, Math.cos(a) * rad * 0.93, 3 + (i % 3) * (h / 4), Math.sin(a) * rad * 0.93, 0, -a + PI / 2, 0); }
      k.cyl(0, 0, rad * 0.95, 0, h + 4);
      gAO(k, 2.2);
    });
  };
  // Lift Balloon (extraction): big striped balloon + basket.
  X.balloonProp = function () {
    return X.kitCached('exp-balloon', k => {
      const P = G.Geo.P;
      const env = G.Geo.lathe([[0, -3.2], [1.6, -2.6], [3.4, -0.6], [3.9, 1.6], [3.4, 3.6], [2.0, 4.9], [0, 5.3]], 20);
      G.Geo.colorize(env, (x, y, z) => new THREE.Color(Math.floor((Math.atan2(z, x) + PI) / TAU * 10) % 2 ? 0xff6b8b : 0xfff1dc));
      env.translate(0, 7.4, 0);
      k.addRaw(env);
      k.add(P.cyl(0.9, 1.0, 0.25, 12), 0xe8b44a, 0, 4.1, 0);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4; k.add(P.cyl(0.04, 0.04, 3.2, 4), 0x1f2a5a, Math.cos(a) * 0.95, 2.5, Math.sin(a) * 0.95, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); }
      k.add(P.rbox(2.0, 1.0, 2.0, 0.2, 2), 0xd99a5b, 0, 0.5, 0);
      k.add(P.rbox(2.08, 0.18, 2.08, 0.06, 1), 0xa86a3c, 0, 0.95, 0);
      k.glow(P.sph(0.35, 10, 8), 0xffd27a, 0, 4.3, 0);
      k.add(G.Geo.emblem ? G.Geo.emblem('star', 0xffd23f).clone().translate(0, 0, 0) : P.sph(0.3), null, 0, 9.3, 3.95);
    });
  };

  // Three corals of different kinds merged into one cluster geometry (instanced as a single draw call).
  const coralCache = {};
  // lite (med/low quality): two corals per cluster — the reef rings the whole coast, so every instance renders.
  X.coralCluster = function (key, lite) {
    key = key + (lite ? '|lite' : '');
    if (coralCache[key]) return coralCache[key];
    const Gg = G.Geo, cols = Gg.PAL.coral, parts = [];
    const lay = [[1, 0, 0, 1.15], [3, 0.8, 0.5, 0.9], [4, -0.7, 0.4, 0.8]].slice(0, lite ? 2 : 3);
    lay.forEach((l, i) => { const g = Gg.coralGeo(l[0], cols[(i * 2 + 1) % cols.length], i).clone(); Gg.xf(g, l[1], 0, l[2], 0, i * 1.3, 0, l[3]); parts.push(g); });
    const g = Gg.merge(parts); g.userData.shared = true; g.computeBoundingSphere();
    coralCache[key] = g;
    return g;
  };

  // ---------------------------------------------------------------- terrain painter
  function makePainter(B, pathAt, waterDeep) {
    const P = B.paint;
    const g0 = new THREE.Color(P.ground[0]), g1 = new THREE.Color(P.ground[1]), g2 = new THREE.Color(P.ground[2]);
    const patch = new THREE.Color(P.patch), shade = new THREE.Color(P.shade), wet = new THREE.Color(P.beach[0]), dry = new THREE.Color(P.beach[1]);
    const path = new THREE.Color(P.path), deep = new THREE.Color(waterDeep), oil = P.oil != null ? new THREE.Color(P.oil) : null;
    const cliff = P.cliff.map(h => new THREE.Color(h)), cliffS = P.cliffS || 0.3, bandH = B.terr.terrace ? B.terr.terrace / 2 : 1.9;
    const sheen = [new THREE.Color(0x8f7bff), new THREE.Color(0x5cffe1), new THREE.Color(0xff8fc0)];
    const warm = new THREE.Color(P.warm != null ? P.warm : 0xffe9a0);
    const macroK = P.macroK != null ? P.macroK : B.id === 'frost' ? 0.35 : 1;
    return function (x, z, h, s) {
      if (h < 0.25) {
        // seabed: sand fading to deep water tint
        _c.copy(wet).lerp(deep, clamp(-h / 6, 0, 0.75));
        return _c.getHex();
      }
      const n = N.n2(x * 0.06, z * 0.06), n2 = N.n2(x * 0.23 + 5.3, z * 0.23 - 2.1);
      const t = clamp(0.5 + n * 0.62 + n2 * 0.18, 0, 1);
      if (t < 0.5) _c.copy(g0).lerp(g1, t * 2); else _c.copy(g1).lerp(g2, t * 2 - 1);
      const pn = N.n2(x * 0.045 + 9, z * 0.045 - 4);
      if (pn > 0.3) _c.lerp(patch, clamp((pn - 0.3) * 4, 0, 1) * (P.patchK || 0.8));
      if (s > 0.16) _c.lerp(shade, clamp((s - 0.16) / 0.16, 0, 0.55));
      if (s > cliffS) {
        const bi = ((Math.floor((h + N.n2(x * 0.15, z * 0.15) * 0.9) / bandH) % cliff.length) + cliff.length) % cliff.length;
        _c.lerp(cliff[bi], clamp((s - cliffS) / 0.06, 0, 1));
      }
      if (h < 1.7) _c.lerp(_t.copy(wet).lerp(dry, clamp((h - 0.25) / 0.6, 0, 1)), clamp((1.7 - h) / 0.9, 0, 1));
      if (oil && h > 1.2 && s < 0.2) {
        const on = N.n2(x * (P.oilF || 0.09) + 3.1, z * (P.oilF || 0.09) + 7.7);
        if (on > 0.3) { _u.copy(oil).lerp(sheen[((Math.floor((x + z) * 0.35 + on * 9) % 3) + 3) % 3], 0.18 + 0.15 * Math.sin(x * 0.7 + z * 0.4)); _c.lerp(_u, clamp((on - 0.3) * 12, 0, 1)); }
      }
      // macro drift (sun-warmed / cool fields) and a lift toward the light ground tone on the heights
      const mn = N.n2(x * 0.017 + 3.3, z * 0.017 - 7.1);
      if (s < cliffS) {
        if (mn > 0.15) _c.lerp(_u.copy(g2).lerp(warm, 0.25), clamp((mn - 0.15) * 1.5, 0, 0.38) * macroK);
        else if (mn < -0.2) _c.lerp(_u.copy(g0).lerp(shade, 0.35), clamp((-0.2 - mn) * 1.3, 0, 0.32) * macroK);
        _c.lerp(g2, clamp((h - 5) / 16, 0, 0.18));
      }
      // paths: a trodden darker rim, then the packed centre
      const pw = pathAt(x, z);
      if (pw > 0.02 && h > 0.5) {
        const rim = sstep(0.04, 0.3, pw) * (1 - sstep(0.45, 0.85, pw));
        _c.lerp(_t.copy(path).lerp(shade, 0.5), rim * 0.32);
        _c.lerp(_t.copy(path).lerp(shade, 0.12 * (0.5 + 0.5 * n2)), pw * 0.85);
      }
      return _c.getHex();
    };
  }

  // ---------------------------------------------------------------- the generator
  X.buildIsland = function (world, o) {
    const B = X.BIOMES[o.biome] || X.BIOMES.shoals;
    const m = o.mission || {};
    const star = o.star || m.star || B.star;
    const rng = G.rng((o.seed || 1) * 9301 + 49297);
    const HALF = 150, R = 112;
    const T = B.terr;
    const ox = rng() * 180 + 10, oz = rng() * 180 + 10, cx = rng() * 50, cz = rng() * 50, rx = rng() * 100, rz = rng() * 100;
    const coastR = a => R * (0.84 + 0.22 * (0.5 + 0.5 * N.n2(Math.cos(a) * 1.3 + cx, Math.sin(a) * 1.3 + cz)) + 0.05 * N.n2(Math.cos(a) * 4 + cz, Math.sin(a) * 4 + cx));
    function hRaw(x, z) {
      const r = Math.hypot(x, z), a = Math.atan2(z, x);
      const land = sstep(1.02, 0.74, r / coastR(a));
      let hill = N.fbm2((x + ox) * T.f, (z + oz) * T.f, 4) * 0.8 + 0.5;
      hill += T.ridge * (N.ridge2((x + rx) * T.f * 1.6, (z + rz) * T.f * 1.6, 3) - 0.55);
      hill = clamp(hill, 0, 1.3);
      let h = 0.9 + T.amp * Math.pow(hill, 1.45) * sstep(0.2, 0.85, land);
      if (T.terrace && h > 2.2) { const t = (h - 2.2) / T.terrace, f = t - Math.floor(t); h = 2.2 + (Math.floor(t) + sstep(0.55, 0.88, f)) * T.terrace; }
      return lerp(-7, h, sstep(0.0, 0.34, land));
    }
    const slopeRaw = (x, z) => Math.hypot(hRaw(x + 1, z) - hRaw(x - 1, z), hRaw(x, z + 1) - hRaw(x, z - 1)) / 2;
    const isl = { B, R, HALF, hRaw, star, rng, mission: m, sites: {}, pois: [], zones: [], segs: [] };

    // ---- POI helpers
    const pois = isl.pois;
    const free = (x, z, r) => { for (const p of pois) { const dx = p.x - x, dz = p.z - z, rr = p.r + r; if (dx * dx + dz * dz < rr * rr) return false; } return true; };
    function find(f) {
      const tries = f.tries || 260;
      for (let i = 0; i < tries; i++) {
        let x, z;
        if (f.near) { const a = rng() * TAU, d = (f.near.min || 0) + rng() * ((f.near.max || 30) - (f.near.min || 0)); x = f.near.x + Math.cos(a) * d; z = f.near.z + Math.sin(a) * d; }
        else { const a = f.ang != null ? f.ang + (rng() - 0.5) * (f.angJ || 0.5) : rng() * TAU, rr = R * ((f.minR || 0) + rng() * ((f.maxR || 0.85) - (f.minR || 0))); x = Math.cos(a) * rr; z = Math.sin(a) * rr; }
        const h = hRaw(x, z);
        if (h < (f.minH != null ? f.minH : 1.3)) continue;
        if (Math.hypot(x, z) > coastR(Math.atan2(z, x)) * (f.coast || 0.82)) continue;
        if (slopeRaw(x, z) > (f.slope != null ? f.slope : 0.35)) continue;
        if (!free(x, z, f.r || 4)) continue;
        if (f.away) { let bad = false; for (const q of f.away) if (Math.hypot(q.x - x, q.z - z) < q.d) { bad = true; break; } if (bad) continue; }
        if (f.check && !f.check(x, z)) continue;
        return { x, z, h };
      }
      return null;
    }
    const addPoi = (p, r, kind, zone) => {
      const e = { x: p.x, z: p.z, r, kind };
      pois.push(e);
      if (zone) isl.zones.push({ x: p.x, z: p.z, r: zone.r, soft: zone.soft, h: zone.h != null ? zone.h : Math.max(1.1, p.h != null ? p.h : hRaw(p.x, p.z)) });
      return e;
    };

    // ---- spawn on the coast, facing the middle
    const a0 = rng() * TAU;
    let sp = null;
    // the first dry, flat spot in from the shore — or a little further in when that spot looks straight into a
    // rising bank: among the dry spots of the next 24 m, the one with the most open inward view (a terrace top)
    {
      const rise = (x, z, h) => { let m = 0; for (let d = 6; d <= 40; d += 3.5) m = Math.max(m, hRaw(x - Math.cos(a0) * d, z - Math.sin(a0) * d) - h - d * 0.1); return m; };
      let r0 = null, bestS = 1e9;
      for (let r = coastR(a0) * 0.9; r > 20; r -= 2) {
        const x = Math.cos(a0) * r, z = Math.sin(a0) * r, h = hRaw(x, z);
        if (h <= 1.3 || slopeRaw(x, z) >= 0.3) { if (r0 != null && r0 - r > 24) break; continue; }
        if (r0 == null) r0 = r;
        if (r0 - r > 24) break;
        const sc = rise(x, z, h) + (r0 - r) * 0.05;
        if (sc < bestS) { bestS = sc; sp = { x, z, h }; }
      }
    }
    if (!sp) sp = { x: Math.cos(a0) * 60, z: Math.sin(a0) * 60, h: hRaw(Math.cos(a0) * 60, Math.sin(a0) * 60) };
    addPoi(sp, 12, 'spawn', { r: 7, soft: 7 });
    isl.spawnA = a0;
    // ---- extraction pads (2) on the far side; kiosk mid-map
    isl.pads = [];
    for (const da of [-0.75, 0.75]) {
      const p = find({ ang: a0 + PI + da, angJ: 0.5, minR: 0.45, maxR: 0.7, r: 9, slope: 0.3 }) || find({ minR: 0.3, maxR: 0.75, r: 9 });
      if (p) { addPoi(p, 9, 'pad', { r: 6.5, soft: 6 }); isl.pads.push(p); }
    }
    const kp = find({ minR: 0, maxR: 0.22, r: 6, slope: 0.3 }) || find({ minR: 0, maxR: 0.4, r: 6 });
    if (kp) { addPoi(kp, 6, 'kiosk', { r: 4.5, soft: 4 }); isl.kiosk = kp; }
    // ---- checkpoints (4–6) around the island
    const nCp = clamp(4 + (star > 2 ? 1 : 0) + (star > 4 ? 1 : 0), 4, 6);
    isl.checkpoints = [];
    for (let i = 0; i < nCp; i++) {
      const ang = a0 + 0.9 + (i / Math.max(1, nCp - 1)) * (TAU - 1.8);
      const p = find({ ang, angJ: 0.35, minR: 0.38, maxR: 0.62, r: 6, slope: 0.32 });
      if (p) { addPoi(p, 6, 'cp', { r: 3.2, soft: 3.5 }); isl.checkpoints.push(p); }
    }
    // ---- objective-specific sites (placed before camps so they get the best spots)
    const type = m.type || 'sweep';
    if (type === 'boss') {
      const p = find({ ang: a0 + PI, angJ: 1.6, minR: 0.25, maxR: 0.55, r: 26, slope: 0.4, minH: 1.5 }) || find({ minR: 0.1, maxR: 0.6, r: 24, slope: 0.6 });
      if (p) { p.h = Math.max(1.6, p.h); addPoi(p, 26, 'arena', { r: 23, soft: 10, h: p.h }); isl.sites.arena = p; }
    }
    if (type === 'reach') {
      const p = find({ ang: a0 + PI, angJ: 1.2, minR: 0.2, maxR: 0.5, r: 20, slope: 0.45 }) || find({ minR: 0.1, maxR: 0.6, r: 18, slope: 0.6 });
      if (p) { addPoi(p, 20, 'bigmesa', { r: 12, soft: 7 }); isl.sites.bigMesa = p; }
    }
    if (type === 'rescue') {
      isl.sites.cages = [];
      for (let i = 0; i < (m.n || 5); i++) {
        const p = find({ minR: 0.15, maxR: 0.8, r: 6, slope: 0.3, away: [{ x: sp.x, z: sp.z, d: 40 }].concat(isl.sites.cages.map(c => ({ x: c.x, z: c.z, d: 34 }))) });
        if (p) { addPoi(p, 6, 'cage', { r: 3.5, soft: 3 }); isl.sites.cages.push(p); }
      }
    }
    if (type === 'escort') {
      // A winding ~280 m road from near the spawn the long way round to an extraction pad.
      const start = { x: sp.x * 0.86, z: sp.z * 0.86 };
      const aS = Math.atan2(start.z, start.x);
      let best = null;
      for (const p of isl.pads) { const d1 = U.wrapAngle(Math.atan2(p.z, p.x) - aS), lg = d1 > 0 ? d1 - TAU : d1 + TAU; if (!best || Math.abs(lg) > Math.abs(best.da)) best = { p, da: lg }; }
      const end = best ? best.p : { x: -sp.x * 0.6, z: -sp.z * 0.6 };
      const da = best ? best.da : PI;
      const pts = [start];
      const nW = 10;
      for (let i = 1; i < nW; i++) {
        const k = i / nW, a = aS + da * k, rr = R * (0.5 + 0.13 * Math.sin(k * PI * 4 + rng() * 0.6));
        let q = { x: Math.cos(a) * rr, z: Math.sin(a) * rr };
        for (let tr = 0; tr < 12 && hRaw(q.x, q.z) < 1.4; tr++) { const r2 = rr * (0.92 - tr * 0.05); q = { x: Math.cos(a) * r2, z: Math.sin(a) * r2 }; }
        pts.push(q);
      }
      pts.push({ x: end.x, z: end.z });
      isl.road = pts;
    }
    // ---- Gizmob camps (6–9, ≥35 m apart, ≥45 m from spawn)
    const nCamps = clamp(6 + Math.floor(star / 2), 6, 9);
    isl.camps = [];
    for (let i = 0; i < nCamps * 3 && isl.camps.length < nCamps; i++) {
      const p = find({ minR: 0.12, maxR: 0.82, r: 13, slope: 0.32, away: [{ x: sp.x, z: sp.z, d: 56 }].concat(isl.camps.map(c => ({ x: c.x, z: c.z, d: 35 }))) });
      if (!p) continue;
      addPoi(p, 13, 'camp', { r: 9, soft: 7 });
      isl.camps.push({ x: p.x, z: p.z, h: p.h, i: isl.camps.length });
    }
    // ---- sky routes (ramp -> platform -> jump pad -> floating island)
    isl.routes = [];
    for (let i = 0; i < 2; i++) {
      const p = find({ minR: 0.2, maxR: 0.7, r: 16, slope: 0.18, away: [{ x: sp.x, z: sp.z, d: 30 }] });
      if (!p) continue;
      const toC = Math.atan2(-p.z, -p.x) + (rng() - 0.5) * 1.4;
      addPoi(p, 16, 'route', { r: 10, soft: 6 });
      isl.routes.push({ x: p.x, z: p.z, h: Math.max(1.1, p.h), dir: new V3(Math.cos(toC), 0, Math.sin(toC)) });
    }
    // ---- a remote secret spot near the coast (sprocket #3)
    {
      let best = null, bestD = -1;
      for (let i = 0; i < 40; i++) {
        const a = rng() * TAU, r = coastR(a) * (0.72 + rng() * 0.08), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (hRaw(x, z) < 1.2 || !free(x, z, 4)) continue;
        let dmin = 1e9; for (const q of pois) dmin = Math.min(dmin, Math.hypot(q.x - x, q.z - z) - q.r);
        if (dmin > bestD) { bestD = dmin; best = { x, z, h: hRaw(x, z) }; }
      }
      if (best) { addPoi(best, 5, 'secret', { r: 3, soft: 3 }); isl.sites.secret = best; }
    }

    // ---- paths (spawn → kiosk → pads, checkpoint ring, camps/sites → nearest node)
    const nodes = [sp].concat(isl.kiosk ? [isl.kiosk] : [], isl.checkpoints, isl.pads);
    const segs = isl.segs;
    const addPath = (a, b, w) => {
      const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 14));
      let px = a.x, pz = a.z;
      const nx = -(b.z - a.z), nz = b.x - a.x, nl = Math.hypot(nx, nz) || 1;
      for (let i = 1; i <= n; i++) {
        const k = i / n, j = i < n ? (rng() - 0.5) * 9 * Math.sin(k * PI) : 0;
        const x = lerp(a.x, b.x, k) + nx / nl * j, z = lerp(a.z, b.z, k) + nz / nl * j;
        segs.push({ ax: px, az: pz, bx: x, bz: z, w: w || 2.6 });
        px = x; pz = z;
      }
    };
    const nearestNode = (p, list) => { let b = null, bd = 1e9; for (const q of list) { if (q === p) continue; const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; b = q; } } return b; };
    if (isl.kiosk) { addPath(sp, isl.kiosk, 3.2); for (const p of isl.pads) addPath(isl.kiosk, p, 3); }
    const ring = isl.checkpoints.slice().sort((a, b) => U.wrapAngle(Math.atan2(a.z, a.x) - a0) - U.wrapAngle(Math.atan2(b.z, b.x) - a0));
    if (ring.length) { addPath(sp, ring[0], 2.8); addPath(sp, ring[ring.length - 1], 2.8); for (let i = 0; i < ring.length - 1; i++) addPath(ring[i], ring[i + 1], 2.6); }
    for (const c of isl.camps) { const q = nearestNode(c, nodes); if (q) addPath(q, c, 2.2); }
    for (const k of ['arena', 'bigMesa', 'secret']) if (isl.sites[k] && k !== 'secret') { const q = nearestNode(isl.sites[k], nodes); if (q) addPath(q, isl.sites[k], 2.6); }
    if (isl.sites.cages) for (const c of isl.sites.cages) { const q = nearestNode(c, nodes.concat(isl.camps)); if (q) addPath(q, c, 2.2); }
    for (const r of isl.routes) { const q = nearestNode(r, nodes); if (q) addPath(q, r, 2.2); }
    if (isl.road) for (let i = 0; i < isl.road.length - 1; i++) addPath(isl.road[i], isl.road[i + 1], 3.6);
    // Rasterise path weights (2 m grid).
    const PR = 2, PN = Math.round(HALF * 2 / PR) + 1, PW = new Float32Array(PN * PN);
    for (const s of segs) {
      const minx = Math.min(s.ax, s.bx) - s.w * 1.5, maxx = Math.max(s.ax, s.bx) + s.w * 1.5, minz = Math.min(s.az, s.bz) - s.w * 1.5, maxz = Math.max(s.az, s.bz) + s.w * 1.5;
      const i0 = Math.max(0, Math.floor((minx + HALF) / PR)), i1 = Math.min(PN - 1, Math.ceil((maxx + HALF) / PR));
      const j0 = Math.max(0, Math.floor((minz + HALF) / PR)), j1 = Math.min(PN - 1, Math.ceil((maxz + HALF) / PR));
      const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz || 1;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = -HALF + i * PR, z = -HALF + j * PR;
        const t = clamp(((x - s.ax) * dx + (z - s.az) * dz) / L2, 0, 1);
        const d = Math.hypot(x - (s.ax + dx * t), z - (s.az + dz * t));
        const w = 1 - sstep(s.w * 0.45, s.w, d);
        if (w > PW[j * PN + i]) PW[j * PN + i] = w;
      }
    }
    const pathAt = (x, z) => {
      let fx = (x + HALF) / PR, fz = (z + HALF) / PR;
      if (fx < 0 || fz < 0 || fx >= PN - 1 || fz >= PN - 1) return 0;
      const i = fx | 0, j = fz | 0; fx -= i; fz -= j;
      const a = PW[j * PN + i], b = PW[j * PN + i + 1], c = PW[(j + 1) * PN + i], d = PW[(j + 1) * PN + i + 1];
      return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
    };
    isl.pathAt = pathAt;
    // Big solid props (mesas, factory towers, junk piles) must never sit on a path: the escort cart rolls along
    // the road and ignores colliders, and paths are how kids find their way.
    const offPaths = r => (x, z) => { if (pathAt(x, z) > 0.04) return false; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; if (pathAt(x + Math.cos(a) * r, z + Math.sin(a) * r) > 0.04) return false; } return true; };

    // ---- region landmark (B.landmark): one big signature set piece in clear view of the landing pad, off the
    // paths. Candidates are scored by how far they sit off the pad's inward view and by how much terrain hides
    // them from the player's eye; coastal kinds (the lighthouse) stand on a headland a little along the shore.
    isl.landmarks = [];
    const eyeX = sp.x - sp.x / (Math.hypot(sp.x, sp.z) || 1) * 6, eyeZ = sp.z - sp.z / (Math.hypot(sp.x, sp.z) || 1) * 6;
    const eyeY = hRaw(eyeX, eyeZ) + 1.7, inward = Math.atan2(-eyeZ, -eyeX);
    // where the first view is taken from: the pad, looking inland — except on ★1 story sweep / parts runs, which
    // start about 34 m short of the camp nearest the pad, facing it (21c introSpawn): there a coastal landmark is
    // chosen anywhere along the shore so that it stands in that first view, across the island beyond the camp
    let vX = eyeX, vZ = eyeZ, vY = eyeY, vDir = inward, vDist = 70, intro = false;
    // (21c introSpawn applies to every region's ★1 story sweep / parts run: the first view is recorded for all of them —
    // the welcome grove and the first critters stand in it — while only a coastal landmark is chosen from it)
    isl.introView = null;
    if (m.story && star <= 1 && (m.type === 'sweep' || m.type === 'parts') && isl.camps.length) {
      let bc = null, bd = 1e9; for (const c of isl.camps) { const d = Math.hypot(c.x - eyeX, c.z - eyeZ); if (d < bd) { bd = d; bc = c; } }
      const dx = (bc.x - eyeX) / bd, dz = (bc.z - eyeZ) / bd, k = bd < 42 ? 0 : bd - 34;
      isl.introView = { x: eyeX + dx * k, z: eyeZ + dz * k, dir: Math.atan2(dz, dx) };
      // (art pass: a closer seaside hero — about 85 m off, within ~25° of the camp ahead — reads far bigger in the first
      // view than one right behind the camp across the whole island, 140 m off)
      if (B.landmark && B.landmark.coast) { vX = isl.introView.x; vZ = isl.introView.z; vY = hRaw(vX, vZ) + 1.7; vDir = isl.introView.dir; vDist = 85; intro = true; }
    }
    // the objective the spawn will face (the same pick as the spawn heading below: a big mesa, the boss arena, the nearest
    // cage): the landmark is chosen beside it — not off to the side, where the HUD buttons cover it or it is out of view
    let objDir = null;
    if (!intro) {
      let cg = null, cd = 1e9; for (const q of isl.sites.cages || []) { const d = Math.hypot(q.x - eyeX, q.z - eyeZ); if (d < cd) { cd = d; cg = q; } }
      const ob = isl.sites.bigMesa || isl.sites.arena || cg;
      if (ob) { objDir = Math.atan2(ob.z - eyeZ, ob.x - eyeX); vDir = objDir; if (B.landmark && B.landmark.coast) vDist = 85; }
    }
    // (a lighthouse picked anywhere along the shore prefers ~85 m over a spot straight ahead but across the island)
    const nearCoast = !!(B.landmark && B.landmark.coast && (intro || objDir != null));
    const hidden = (x, z, top) => { let b = 0; const ty = hRaw(x, z) + top; for (let i = 1; i < 12; i++) { const t = i / 12, gx = lerp(vX, x, t), gz = lerp(vZ, z, t); if (hRaw(gx, gz) > lerp(vY, ty, t) - 0.3) b++; } return b; };
    if (B.landmark) {
      // (own random stream: the island's main stream — camps, crates, crystals — keeps its old sequence)
      const L = B.landmark, lr = G.rng((o.seed || 1) * 7717 + 31), foot = L.foot || 8;
      // no path may run under the footprint (the escort cart ignores colliders): rings of samples out to `r`
      const pathClear = (x, z, r) => { if (pathAt(x, z) > 0.04) return false; for (let ring = 1; ring <= 3; ring++) { const rr = r * ring / 3, n = 6 + ring * 4; for (let i = 0; i < n; i++) { const a = i / n * TAU; if (pathAt(x + Math.cos(a) * rr, z + Math.sin(a) * rr) > 0.04) return false; } } return true; };
      let best = null, bestS = 1e9;
      // three passes, each looser: in the inward view at the preferred distance → a wider cone → anywhere inland
      for (let pass = 0; pass < 3 && !best; pass++) {
        for (let i = 0; i < 140; i++) {
          let x, z;
          if (L.coast) {
            // (intro view or an objective ahead: anywhere along the shore, so the lighthouse can stand in that view)
            const wide = intro || objDir != null;
            const side = i % 2 ? 1 : -1, a = wide ? lr() * TAU : a0 + side * (0.5 + lr() * (0.65 + pass * 0.4)), r = coastR(a) * (0.8 + lr() * 0.12);
            x = Math.cos(a) * r; z = Math.sin(a) * r;
            const h = hRaw(x, z); if (h < 1.2 || h > 4.5 + pass || slopeRaw(x, z) > 0.4) continue;
            if (wide && Math.hypot(x - vX, z - vZ) < 45) continue;
          } else {
            const d0 = (L.dist || [50, 80])[0] * (pass ? 0.8 : 1), d1 = (L.dist || [50, 80])[1] * (pass ? 1.3 : 1);
            const a = vDir + (lr() - 0.5) * (pass === 0 ? 1.3 : pass === 1 ? 2.1 : TAU), d = pass === 2 ? 20 + lr() * 110 : d0 + lr() * (d1 - d0);
            x = eyeX + Math.cos(a) * d; z = eyeZ + Math.sin(a) * d;
            const h = hRaw(x, z); if (h < 1.3 || Math.hypot(x, z) > coastR(Math.atan2(z, x)) * 0.78 || slopeRaw(x, z) > 0.42) continue;
          }
          // (the lighthouse stands at 1.3x scale: its foot reaches ~3.9 m — the looser passes accept the old 3.5 m clearance,
          // which still keeps every path's centre line more than 6 m away)
          if (!free(x, z, foot * 0.9) || !pathClear(x, z, L.coast ? (pass ? 3.5 : 4.6) : foot)) continue;
          // (beside an objective: best ~0.3 rad off it — the spawn then faces between the two, both well inside the view —
          // and never right behind it; the intro's lighthouse trades a little angle for a much shorter distance)
          const off0 = Math.abs(U.wrapAngle(Math.atan2(z - vZ, x - vX) - vDir)), off = objDir != null ? Math.abs(off0 - 0.3) + (off0 < 0.15 ? 0.6 : 0) : off0;
          const sc = off * 18 + hidden(x, z, L.h * 0.75) * 40 + Math.abs(Math.hypot(x - vX, z - vZ) - vDist) * (nearCoast ? 0.12 : 0.05) + (intro && off0 > 0.42 ? 30 : 0);
          if (sc < bestS) { bestS = sc; best = { x, z, h: hRaw(x, z) }; }
        }
      }
      if (best) {
        // (the Peach Gate stands on a level apron out to its pillars: its splash pool sits on the ground in front of the
        // opening, and the pillar feet never hang over a terrace step)
        const zone = { factory: { r: foot * 0.9, soft: 7 }, elder: { r: 4.5, soft: 4 }, lighthouse: { r: 4.6, soft: 3 }, frozenFall: { r: 5, soft: 5 }, arch: { r: 12.5, soft: 6 } }[L.kind];
        addPoi(best, foot + 2, 'landmark', zone);
        isl.landmarks.push({ kind: L.kind, x: best.x, z: best.z, h: L.h, r: foot, ry: Math.atan2(vX - best.x, vZ - best.z), view: foot * 1.9 + 12 });
      }
    }

    // ---- bake the final heightfield (1 m) with flattened POI zones
    const FR = 1, FN = Math.round(HALF * 2 / FR) + 1, F = new Float32Array(FN * FN);
    const zones = isl.zones;
    for (let j = 0; j < FN; j++) {
      const z = -HALF + j * FR;
      for (let i = 0; i < FN; i++) {
        const x = -HALF + i * FR;
        let h = hRaw(x, z);
        for (let q = 0; q < zones.length; q++) {
          const Z = zones[q], dx = x - Z.x, dz = z - Z.z, rr = Z.r + Z.soft;
          if (dx * dx + dz * dz > rr * rr) continue;
          const w = 1 - sstep(Z.r, rr, Math.sqrt(dx * dx + dz * dz));
          h = h + (Z.h - h) * w;
        }
        // paths smooth out sharp terrace steps a little
        const pw = pathAt(x, z);
        if (pw > 0.3 && T.terrace) h = lerp(h, hRawSmooth(x, z), (pw - 0.3) * 0.5);
        F[j * FN + i] = h;
      }
    }
    function hRawSmooth(x, z) { return (hRaw(x + 2.5, z) + hRaw(x - 2.5, z) + hRaw(x, z + 2.5) + hRaw(x, z - 2.5)) * 0.25; }
    const hf = function (x, z) {
      let fx = (x + HALF) / FR, fz = (z + HALF) / FR;
      if (fx < 0 || fz < 0 || fx >= FN - 1 || fz >= FN - 1) return -8;
      const i = fx | 0, j = fz | 0; fx -= i; fz -= j;
      const k = j * FN + i;
      const a = F[k], b = F[k + 1], c = F[k + FN], d = F[k + FN + 1];
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    };
    isl.hf = hf;
    // (its argument-free twin for the phys samplers, 05_phys _hfUpdate: reads x, z from Phys.hIn, writes exactly hf(x, z))
    const HI_ = G.Phys.hIn, HO_ = G.Phys.hOut;
    hf.s = () => { HO_[0] = hf(HI_[0], HI_[1]); };
    world.phys.heightFn = hf;
    world.phys.bounds = { minX: -R - 22, maxX: R + 22, minZ: -R - 22, maxZ: R + 22 };
    world.phys.floorY = -30;

    // ---- terrain + water + shore foam
    const painter = makePainter(B, pathAt, B.water.deep);
    isl.painter = painter;
    // Render budget (< 200k tris with the full robot cap in view): below High quality the terrain mesh is 3 m
    // per cell (29k -> 20k tris; collision always uses the exact heightFn) and the water plane is coarser.
    // 3 x 3 chunks: the off-screen thirds cull, without spending a draw call per small tile (a 13-bot camp at
    // High is close to the 150-call budget: robots, faces, pickups and crates take about half of it)
    const propsQ = (G.R.q && G.R.q().props) || 1, liteQ = propsQ < 1;
    const terr = G.Terrain.build({ heightFn: hf, colorFn: painter, minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF, res: liteQ ? 3 : 2.5, chunks: 3, material: G.Terrain.terrainMat ? G.Terrain.terrainMat({ rimStr: 0.1, detail: B.id === 'frost' ? [0.12, 0.08, 0.15] : undefined }) : G.M.vc({ rimStr: 0.1 }) });
    terr.name = 'terrain';
    world.add(terr);
    isl.terrain = terr;
    // depth-aware water: see-through shallows over the sand, a foam lip on every beach, rolling foam bands
    const water = G.Terrain.water({ size: 1100, y: 0, shallow: B.water.shallow, deep: B.water.deep, segments: liteQ ? 44 : 56, opacity: 0.86, foam: B.night ? 0xc8ecff : 0xf4ffff,
      depth: { heightFn: hf, minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF, size: 256 },
      core: { inner: HALF, step: liteQ ? 12 : 10, land: (x, z) => hf(x, z) > 0.5 } });   // (no sea cells under dry land: Terrain.seaGeo)
    water.name = 'water';
    world.add(water);
    isl.water = water;
    const aoSpots = [];

    // ---- static props (baked): landing pad, extraction pads, beacons, camps, kiosk, sea stacks, routes
    const Gg = G.Geo;
    const bakeG = new THREE.Group();
    // every placed prop leaves a soft occlusion pool on the terrain under its footprint
    const place = (prop, x, y, z, ry) => { const r = Gg.place(world, prop, x, y, z, ry || 0, bakeG); if (Gg.aoFromCols) Gg.aoFromCols(r.cols, aoSpots, hf); return r; };
    const yAt = (x, z) => hf(x, z);
    // landing pad + Beepo's parked skiff
    // The player stands 6 m inland of the pad, facing the objective (a site, the cart road, the nearest cage)
    // or the region landmark — whichever applies; when both are close in angle, between the two — and never
    // straight into a hillside: the heading turns (up to ±0.55 rad) toward the lowest rise within 38 m.
    {
      const dl = Math.hypot(sp.x, sp.z) || 1, fx = sp.x - sp.x / dl * 6, fz = sp.z - sp.z / dl * 6, fy = yAt(fx, fz);
      const angTo = q => Math.atan2(q.z - fz, q.x - fx);
      const near = list => { let b = null, bd = 1e9; for (const q of list || []) { const d = Math.hypot(q.x - fx, q.z - fz); if (d < bd) { bd = d; b = q; } } return b; };
      // (escort: the cart waits a few metres away, so the landmark may pull the view further off it)
      const obj = isl.sites.bigMesa || isl.sites.arena || near(isl.sites.cages) || (isl.road && isl.road[0]) || null;
      const lm = isl.landmarks[0] || null, wide = isl.road && obj === isl.road[0] ? 1.0 : 0.6;
      let base = Math.atan2(-sp.z, -sp.x);
      // (review pass: a landmark up to ~63° off the objective still turns the view part-way — 60% toward it, so both stay
      // within ~25° of the centre, clear of the HUD columns on a landscape phone; it was left at the edge or out of view)
      if (obj && lm) { const ao = angTo(obj), d = U.wrapAngle(angTo(lm) - ao), ad = Math.abs(d); base = ad < wide ? ao + d / 2 : ad < 1.1 ? ao + d * 0.6 : ao; }
      else if (obj || lm) base = angTo(obj || lm);
      else { const c = near(isl.camps); if (c) base = angTo(c); }
      let bestA = base, bestS = 1e9;
      for (let k = -5; k <= 5; k++) {
        const a = base + k * 0.11; let rise = 0;
        for (let d = 6; d <= 38; d += 4) rise = Math.max(rise, hf(fx + Math.cos(a) * d, fz + Math.sin(a) * d) - fy - d * 0.1);
        const sc = Math.max(0, rise - 0.8) * 1.4 + Math.abs(k) * 0.3;
        if (sc < bestS) { bestS = sc; bestA = a; }
      }
      isl.spawn = { pos: new V3(fx, fy + 0.1, fz), yaw: Math.atan2(-Math.cos(bestA), -Math.sin(bestA)), focus: lm ? lm.kind : obj ? 'objective' : 'camp' };
      // where the player first looks from (21c introSpawn on ★1 story sweep / parts runs, else the pad): the welcome
      // grove and the first critters are laid out in this view
      const iv = isl.introView;
      isl.firstView = iv ? { x: iv.x, z: iv.z, yaw: Math.atan2(-Math.cos(iv.dir), -Math.sin(iv.dir)) } : { x: fx, z: fz, yaw: isl.spawn.yaw };
    }
    place(Gg.extractionPad(0x39d5ff), sp.x, yAt(sp.x, sp.z), sp.z, 0);
    if (Gg.ship) {
      const sh = G.safe('ship', () => Gg.ship('bulky', { main: 0x2ec4b6, accent: 0xffd23f, glow: 0x39d5ff }));
      if (sh && sh.group) {
        const drop = []; sh.group.traverse(o => { if (o !== sh.group && (o.isSprite || (o.material && (o.material.transparent || o.material.map)))) drop.push(o); });
        for (const o of drop) if (o.parent) o.parent.remove(o);
        const side = new V3(-Math.sin(a0 + PI / 2), 0, -Math.cos(a0 + PI / 2));
        const sx = sp.x, sz = sp.z, sy = yAt(sx, sz) + 0.3;
        sh.group.position.set(sx, sy + 1.1, sz); sh.group.rotation.y = -a0 + PI / 2; sh.group.rotation.z = 0.05; sh.group.scale.setScalar(1.25);
        bakeG.add(sh.group); world.phys.addCyl(sx, sz, 2.2, sy, sy + 2.6);
        void side;
      }
    }
    for (const p of isl.pads) { p.y = yAt(p.x, p.z); place(Gg.extractionPad(0x8bea4a), p.x, p.y, p.z, 0); }
    // beacons: baked bases (neutral), active beams are added by the mode
    for (const c of isl.checkpoints) {
      c.y = yAt(c.x, c.z);
      const pr = Gg.beacon(0x9fb7ff);
      const beam = pr.mesh.getObjectByName('beam'); if (beam) pr.mesh.remove(beam);
      place(pr, c.x, c.y, c.z, 0);
    }
    // kiosk
    if (isl.kiosk) {
      const k = isl.kiosk; k.y = yAt(k.x, k.z);
      const ry = Math.atan2(sp.x - k.x, sp.z - k.z);
      const kp2 = X.kioskProp();
      place(kp2, k.x, k.y, k.z, ry);
      k.use = new V3(k.x + Math.sin(ry) * 1.6, k.y, k.z + Math.cos(ry) * 1.6);
    }
    // camps: the region's camp kit (hut facing the middle, two themed pieces, the Gizmob banner) on soft contact
    // shadows. Exactly seven numbers are drawn from the island stream per camp, as before, so everything placed
    // after the camps lands where it always did.
    const flags = Gg.flagBatch ? Gg.flagBatch() : null;
    const shadows = isl.campShadows = [];
    const facing = (x, z, c) => Math.atan2(c.x - x, c.z - z);
    for (const c of isl.camps) {
      c.y = yAt(c.x, c.z);
      const ra = rng() * TAU, hj = rng(), aD = rng(), aR = rng(), bD = rng(), bR = rng(), fR = rng();
      c.kitA = ra;   // (where the hut stands: tests frame the kit from the other side)
      const at =(ang, d) => { const x = c.x + Math.cos(ang) * d, z = c.z + Math.sin(ang) * d; return { x, z, y: yAt(x, z) }; };
      const h = at(ra, 6.2), hry = facing(h.x, h.z, c) + (hj - 0.5) * 0.5;
      Gg.place(world, X.campPiece(B.id, 'hut'), h.x, h.y - 0.08, h.z, hry, bakeG);
      shadows.push({ x: h.x, z: h.z, rx: B.id === 'mesas' ? 2.1 : 2.4, rz: B.id === 'mesas' ? 1.7 : 2.4, ry: hry, k: 0.46 });
      const pa = at(ra + 1.85, 6.2 + aD * 0.9), pry = aR * TAU;
      Gg.place(world, X.campPiece(B.id, 'a'), pa.x, pa.y - 0.04, pa.z, pry, bakeG);
      shadows.push({ x: pa.x, z: pa.z, rx: 1.45, rz: 1.25, ry: pry, k: 0.4 });
      const pb = at(ra + PI + 0.25, 6.0 + bD * 0.8), bry = bR * TAU;
      Gg.place(world, X.campPiece(B.id, 'b'), pb.x, pb.y - 0.04, pb.z, bry, bakeG);
      shadows.push({ x: pb.x, z: pb.z, rx: 1.15, rz: 1.0, ry: bry, k: 0.38 });
      const fl = at(ra - 1.2, 7), fry = ra - 1.2 + (fR - 0.5) * 0.3;
      Gg.place(world, Gg.banner(0xff7a3d, 'bolt', flags ? { cloth: false } : undefined), fl.x, fl.y - 0.1, fl.z, fry, bakeG);
      if (flags) flags.banner(0xff7a3d, 'bolt', fl.x, fl.y - 0.1, fl.z, fry);
      shadows.push({ x: fl.x, z: fl.z, rx: 0.55, rz: 0.55, ry: 0, k: 0.3 });
    }
    // sea stacks ring (signature silhouettes)
    for (let i = 0; i < (B.stacks || 0); i++) {
      const a = (i / B.stacks) * TAU + rng() * 0.5, r = coastR(a) * (1.08 + rng() * 0.12), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) > HALF - 8 || Math.abs(z) > HALF - 8) continue;
      const rad = 2.6 + rng() * 2.4, ht = 9 + rng() * 9;
      place(Gg.mesa(rad, ht, (rng() * 1e4) | 0, { bands: B.dress.bands || B.paint.cliff, cap: B.dress.mesaCap != null ? B.dress.mesaCap : (B.id === 'frost' ? 0xf6faff : 0x6ccb5f), seg: 16 }), x, Math.min(-1, hf(x, z)), z, rng() * TAU);
    }
    // signature mesas (Peach Mesas / Frostfizz): placed POI-aware, later reused as sprocket + jump-pad spots
    const ownMesas = [];
    for (let i = 0; i < (B.extraMesas || 0); i++) {
      const rad = 5 + rng() * 4.5, ht = 7 + rng() * 8;
      const p = find({ minR: 0.12, maxR: 0.8, r: rad * 1.2 + 3, slope: 0.5, tries: 80, away: [{ x: sp.x, z: sp.z, d: 30 }], check: offPaths(rad * 1.25 + 1.5) });
      if (!p) continue;
      addPoi(p, rad * 1.2 + 2, 'mesa');
      let y = hRaw(p.x, p.z); for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU; y = Math.min(y, hRaw(p.x + Math.cos(a) * rad * 0.85, p.z + Math.sin(a) * rad * 0.85)); }
      ownMesas.push({ x: p.x, z: p.z, rad, ht, y: y - 0.3, seed: (rng() * 1e4) | 0 });
    }
    for (const om of ownMesas) {
      place(Gg.mesa(om.rad, om.ht, om.seed, { bands: B.dress.bands || B.paint.cliff, cap: B.dress.mesaCap != null ? B.dress.mesaCap : 0x6ccb5f, seg: 24 }), om.x, om.y, om.z, rng() * TAU);
    }
    // region landmark + signature set pieces (lighthouse/jetty, Peach Gate + hoodoos, Elder Glowcap, frozen falls +
    // ice spires, Gizmo Works + conveyors + cranes + junk clusters along the paths)
    const pctx = { hf, hRaw, slopeRaw, free, addPoi, offPaths, place, segs, pathAt, coastR, sp, propsQ, aoSpots, R, a0, seed: o.seed || 1 };
    placeSetPieces(world, isl, B, pctx);
    // a signpost and a fenced planter just ahead of the first view (art pass: the landing clearing was bare ground)
    G.safe('welcome dressing', () => padDress(world, isl, B, pctx));
    // factory towers (Junkyard Rim)
    if (B.factory) {
      for (let i = 0; i < 6; i++) {
        const p = find({ minR: 0.3, maxR: 0.8, r: 6, slope: 0.4, tries: 60, check: offPaths(5) });
        if (!p) continue;
        addPoi(p, 6, 'tower');
        place(X.towerProp(12 + Math.round(rng() * 10), i), p.x, hf(p.x, p.z) - 0.3, p.z, rng() * TAU);
      }
    }
    // region signature mechanics (static part, before the dressing so its POIs keep trees off the pieces)
    isl.mech = G.safe('region mechanics', () => buildMechanics(world, isl, B, { hf, pathAt, free, addPoi, place, segs, sp, bakeG, seed: o.seed || 1, mission: m })) || null;
    // sky routes
    isl.jumpPads = new X.JumpPads(world);
    isl.anchors = []; world.grappleAnchors = world.grappleAnchors || [];
    const addAnchor = (x, y, z) => { const pos = new V3(x, y + 1.9, z); world.grappleAnchors.push({ pos }); isl.anchors.push(pos); place(X.anchorProp(), x, y, z, 0); };
    isl.highSpots = [];
    for (const r of isl.routes) {
      const d = r.dir, g = hf(r.x, r.z);
      const ry = Math.atan2(-d.x, -d.z);
      const rampLen = 8, rampH = 3.2;
      const rc = new V3(r.x - d.x * 4, 0, r.z - d.z * 4);
      place(Gg.ramp(3.2, rampLen, rampH), rc.x, g - 0.05, rc.z, ry);
      const pc = new V3(rc.x + d.x * (rampLen / 2 + 3), g + rampH, rc.z + d.z * (rampLen / 2 + 3));
      place(Gg.platform(6.2, 6.2, 0.7), pc.x, pc.y, pc.z, ry);
      const padPos = new V3(pc.x + d.x * 1.4, pc.y, pc.z + d.z * 1.4);
      place(Gg.jumpPad(0x5cffe1), padPos.x, padPos.y, padPos.z, 0);
      const ic = new V3(pc.x + d.x * 15, 0, pc.z + d.z * 15);
      const ig = Math.max(hf(ic.x, ic.z), 0);
      ic.y = Math.max(pc.y + 8.5, ig + 11);
      place(Gg.skyIsland(5.2, (rng() * 1e4) | 0, { bands: B.dress.bands || B.paint.cliff }), ic.x, ic.y, ic.z, rng() * TAU);
      isl.jumpPads.add(padPos.clone().setY(padPos.y + 0.26), new V3(ic.x - d.x * 1.0, ic.y + 0.45, ic.z - d.z * 1.0));
      addAnchor(ic.x + d.x * 3.2, ic.y + 0.42, ic.z + d.z * 3.2);
      isl.highSpots.push({ pos: new V3(ic.x + d.x * 0.6, ic.y + 0.5, ic.z + d.z * 0.6), kind: 'sky' });
      r.pad = padPos;
    }
    // reach: the tallest mesa with a climbing route (ramps + platform + jump pads)
    if (isl.sites.bigMesa) {
      const s = isl.sites.bigMesa, g = hf(s.x, s.z), rad = 8.5, ht = 17;
      place(Gg.mesa(rad, ht, 4242, { bands: B.dress.bands || B.paint.cliff, cap: B.dress.mesaCap != null ? B.dress.mesaCap : 0x6ccb5f }), s.x, g - 0.2, s.z, 0);
      const top = g - 0.2 + ht + 0.3;
      s.top = new V3(s.x, top, s.z);
      // route: ramp to platform (h 3.5), pad to a higher platform (h 10), pad onto the mesa top
      const dirA = Math.atan2(-s.z, -s.x);
      const d = new V3(Math.cos(dirA), 0, Math.sin(dirA));
      const side = new V3(-d.z, 0, d.x);
      const b0 = new V3(s.x + d.x * (rad + 9), 0, s.z + d.z * (rad + 9));
      const gb = hf(b0.x, b0.z);
      place(Gg.ramp(3.2, 8, 3.5), b0.x + side.x * 4, gb - 0.05, b0.z + side.z * 4, Math.atan2(side.x, side.z));
      const p1 = new V3(b0.x - side.x * 3.05, gb + 3.5, b0.z - side.z * 3.05);
      place(Gg.platform(6, 6, 0.7), p1.x, p1.y, p1.z, 0);
      const pad1 = p1.clone().addScaledVector(side, -1.5);
      place(Gg.jumpPad(0x5cffe1), pad1.x, pad1.y, pad1.z, 0);
      const p2 = new V3(s.x + d.x * (rad + 4.5) - side.x * 6, gb + 10, s.z + d.z * (rad + 4.5) - side.z * 6);
      place(Gg.platform(5, 5, 0.7), p2.x, p2.y, p2.z, 0);
      isl.jumpPads.add(pad1.clone().setY(pad1.y + 0.26), p2.clone().setY(p2.y + 0.1));
      const pad2 = p2.clone().addScaledVector(d, -1.2);
      place(Gg.jumpPad(0xffd23f), pad2.x, pad2.y, pad2.z, 0);
      isl.jumpPads.add(pad2.clone().setY(pad2.y + 0.26), new V3(s.x + d.x * 2, top, s.z + d.z * 2));
      addAnchor(s.x + d.x * (rad * 0.6), top - 0.1, s.z + d.z * (rad * 0.6));
      s.cache = new V3(s.x - d.x * 1.5, top, s.z - d.z * 1.5);
      isl.highSpots.push({ pos: new V3(s.x + side.x * 3, top + 0.4, s.z + side.z * 3), kind: 'mesa' });
    }
    // boss arena: 4 rock pillars
    if (isl.sites.arena) {
      const s = isl.sites.arena; s.y = hf(s.x, s.z);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4, x = s.x + Math.cos(a) * 12, z = s.z + Math.sin(a) * 12; place(Gg.rock(2.6, 31 + i, B.dress.rockPal || 'sand'), x, s.y - 0.4, z, rng() * TAU); }
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, x = s.x + Math.cos(a) * 23, z = s.z + Math.sin(a) * 23; if (i % 5 !== 2) place(Gg.rock(1.6 + rng(), 50 + i, B.dress.rockPal || 'sand'), x, hf(x, z) - 0.5, z, rng() * TAU); }
    }

    // ---- biome dressing (instanced), kept off paths and POIs
    const BL = 4, BN = Math.round(HALF * 2 / BL) + 1, block = new Uint8Array(BN * BN);
    for (const p of pois) {
      const rr = p.r + 1;
      const i0 = Math.max(0, Math.floor((p.x - rr + HALF) / BL)), i1 = Math.min(BN - 1, Math.ceil((p.x + rr + HALF) / BL));
      const j0 = Math.max(0, Math.floor((p.z - rr + HALF) / BL)), j1 = Math.min(BN - 1, Math.ceil((p.z + rr + HALF) / BL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = -HALF + i * BL, z = -HALF + j * BL; if (Math.hypot(x - p.x, z - p.z) < rr) block[j * BN + i] = 1; }
    }
    const avoid = (x, z) => {
      const i = Math.round((x + HALF) / BL), j = Math.round((z + HALF) / BL);
      if (i < 0 || j < 0 || i >= BN || j >= BN) return true;
      if (block[j * BN + i]) return true;
      return pathAt(x, z) > 0.15;
    };
    isl.avoid = avoid;
    let dressCols = [];
    // Render budget: instanced dressing always renders island-wide, so below High quality it is thinned a further
    // 20% on top of the quality props scale (and uses the lite dress table: no beach specks, half the clouds).
    if (Gg.dressBiome) {
      const key = X.geoBiome(B.id, liteQ);
      dressCols = G.safe('dressBiome', () => Gg.dressBiome(world, key, { area: { minX: -R - 6, maxX: R + 6, minZ: -R - 6, maxZ: R + 6 }, heightFn: hf, seed: (o.seed || 1) * 3 + 1, avoid, density: liteQ ? 0.8 : 1, foliage: !!G.Terrain.foliage })) || [];
      if (dressCols.ao) for (const a of dressCols.ao) aoSpots.push(a);
    }
    // mesas from the dressing: tops become sprocket / anchor spots, reachable by a jump pad
    const byPos = new Map();
    for (const c of dressCols) {
      if (c.type !== 'cyl' || c.r < 3.6) continue;
      const k = c.x.toFixed(1) + ',' + c.z.toFixed(1);
      const e = byPos.get(k);
      if (!e) byPos.set(k, { x: c.x, z: c.z, top: c.y1, rTop: c.r, rBase: c.r });
      else { if (c.y1 > e.top) { e.top = c.y1; e.rTop = c.r; } e.rBase = Math.max(e.rBase, c.r); }
    }
    isl.mesas = [];
    for (const om of ownMesas) {
      const nL = Math.max(2, Math.min(5, Math.round(om.ht / 3.4)));
      isl.mesas.push({ x: om.x, z: om.z, top: om.y + om.ht + 0.26, rTop: om.rad * (1 - (nL - 1) * 0.075) * 0.93 * 0.95, rBase: om.rad * 0.93 });
    }
    for (const e of byPos.values()) { if (e.top - hf(e.x, e.z) > 4.5 && e.rTop >= 3) isl.mesas.push(e); }
    isl.mesas.sort((a, b) => (b.top - hf(b.x, b.z)) - (a.top - hf(a.x, a.z)));
    let padded = 0;
    for (const e of isl.mesas) {
      if (padded >= 3) break;
      const dirA = Math.atan2(-e.z, -e.x);
      let ok = null;
      for (let t = 0; t < 8 && !ok; t++) {
        const a = dirA + (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.5, d = e.rBase * 1.12 + 3.2;
        const x = e.x + Math.cos(a) * d, z = e.z + Math.sin(a) * d;
        if (hf(x, z) > 0.8 && world.phys.groundAt(x, z, 1.4, hf(x, z) + 1.2) <= hf(x, z) + 0.2 && slopeRaw(x, z) < 0.5) ok = { x, z, a };
      }
      if (!ok) continue;
      const py = hf(ok.x, ok.z);
      place(Gg.jumpPad(0x5cffe1), ok.x, py - 0.05, ok.z, 0);
      const tgt = new V3(e.x + Math.cos(ok.a) * e.rTop * 0.35, e.top, e.z + Math.sin(ok.a) * e.rTop * 0.35);
      isl.jumpPads.add(new V3(ok.x, py + 0.2, ok.z), tgt);
      addAnchor(e.x - Math.cos(ok.a) * e.rTop * 0.45, e.top - 0.05, e.z - Math.sin(ok.a) * e.rTop * 0.45);
      isl.highSpots.push({ pos: new V3(e.x, e.top + 0.5, e.z), kind: 'mesa' });
      e.pad = new V3(ok.x, py, ok.z);
      padded++;
    }
    // Peach Mesas updrafts stand beside the tall mesas found above
    if (isl.mech && B.id === 'mesas') G.safe('updrafts', () => buildDrafts(world, isl, B, { hf, pathAt }, isl.mech));
    if (B.corals && Gg.coralGeo) {
      // two corals per cluster on every tier: the reef rings the whole coast (every instance renders) and the
      // triangle budget at High goes to the grass field around the player instead
      const cg = X.coralCluster(B.id, true);
      const pts = [];
      const nCor = Math.round(B.corals * propsQ * (liteQ ? 0.65 : 1));
      for (let i = 0, tries = 0; pts.length < nCor && tries < nCor * 20; tries++) {
        const a = rng() * TAU, r = coastR(a) * (0.86 + rng() * 0.16), x = Math.cos(a) * r, z = Math.sin(a) * r, h = hf(x, z);
        if (h < -1.6 || h > 1.4 || avoid(x, z)) continue;
        pts.push({ x, y: h - 0.1, z, s: 0.8 + rng() * 0.7, ry: rng() * TAU });
        i++;
      }
      if (pts.length) { const im = Gg.instancedAt(cg, G.M.vc(), pts); im.name = 'corals'; world.add(im); }
    }
    // (baked in two halves, east / west: a view out over one side of the island culls the other half, for at most
    // 3 draw calls a half — quarters cost up to 12 calls, and a camp view across the island sees all four)
    if (bakeG.children.length) { bakeG.name = 'exp-static'; for (const baked of (Gg.bakeQuads ? Gg.bakeQuads(bakeG, { halves: true }) : [Gg.bake(bakeG)])) world.add(baked); }
    if (flags && flags.count) world.add(flags.mesh());
    // ground occlusion under props, trees and rocks, then the living ground cover and ambient life
    G.Terrain.bakeAO(terr, aoSpots);
    // soft rounded shade under the camp kits (and the region pieces that ask for one): one draped mesh
    isl.shadowMesh = G.safe('contact shadows', () => X.contactShadows(world, hf, isl.campShadows)) || null;
    dressLife(world, isl, B, hf, pathAt, avoid, terr, o.seed || 1);
    // mid-ground clutter around the player (camera-windowed instanced clumps) and a few friendly critters
    isl.clutter = G.safe('clutter field', () => clutterField(world, isl, B, hf, pathAt, o.seed || 1)) || null;
    isl.critters = G.safe('critters', () => critters(world, isl, B, hf, o.seed || 1)) || null;

    // ---- crate clusters along the paths (streamed in by the mode), crystal nodes, lumite crates
    isl.crates = [];
    if (isl.mech && isl.mech.crates) for (const cr of isl.mech.crates) isl.crates.push(cr);   // (metal crates in the crane rings)
    const crateKinds = { wood: 58, metal: 15, ammo: 10, health: 9, boom: 8 };
    // a crate cluster never lands inside a set piece beside the path (junk heap, beach spot, tide pool, palm,
    // hoodoo, ice spire, conveyor, crane, landmark): it takes the other side of the path, or is left out
    const PIECE = { junk: 1, beach: 1, pool: 1, palm: 1, hoodoo: 1, spire: 1, conveyor: 1, crane: 1, landmark: 1, welcome: 1 };
    const inPiece = (x, z) => { for (const p of pois) { if (!PIECE[p.kind]) continue; const rr = p.r + 2.4; if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < rr * rr) return true; } return false; };
    let acc = 0;
    for (const s of segs) {
      const L = Math.hypot(s.bx - s.ax, s.bz - s.az);
      acc += L;
      if (acc < 27 + rng() * 8) continue;
      acc = 0;
      if (isl.crates.length > 46) break;
      const nx = -(s.bz - s.az) / (L || 1), nz = (s.bx - s.ax) / (L || 1);
      let side = rng() < 0.5 ? -1 : 1;
      let cx2 = s.bx + nx * side * (s.w + 2.5), cz2 = s.bz + nz * side * (s.w + 2.5);
      if (inPiece(cx2, cz2)) { side = -side; cx2 = s.bx + nx * side * (s.w + 2.5); cz2 = s.bz + nz * side * (s.w + 2.5); if (inPiece(cx2, cz2)) continue; }
      if (Math.hypot(cx2 - sp.x, cz2 - sp.z) < 14 || hf(cx2, cz2) < 0.8) continue;
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const a = rng() * TAU, d = i === 0 ? 0 : 1.1 + rng() * 1.2, x = cx2 + Math.cos(a) * d, z = cz2 + Math.sin(a) * d;
        isl.crates.push({ pos: new V3(x, 0, z), kind: U.weighted(crateKinds, rng).id });
      }
    }
    isl.crystals = [];
    for (let i = 0; i < 6 + Math.floor(rng() * 4); i++) {
      const p = find({ minR: 0.1, maxR: 0.85, r: 2, slope: 0.5, tries: 40 });
      if (p) { addPoi(p, 2, 'crystal'); isl.crystals.push(new V3(p.x, hf(p.x, p.z), p.z)); }
    }
    isl.lumites = [];
    // ---- Star Sprocket spots: high spots first, then the remote secret
    isl.sprockets = [];
    const sprSpots = isl.highSpots.slice(0, 2).map(h => h.pos);
    if (isl.sites.secret) sprSpots.push(new V3(isl.sites.secret.x, hf(isl.sites.secret.x, isl.sites.secret.z) + 0.6, isl.sites.secret.z));
    while (sprSpots.length < 3 && isl.highSpots.length > sprSpots.length) sprSpots.push(isl.highSpots[sprSpots.length].pos);
    sprSpots.forEach((p, i) => isl.sprockets.push({ idx: B.spr + i, pos: p.clone() }));
    // lumite crates on high spots without a sprocket (or next to one)
    for (const h of isl.highSpots.slice(0, 3)) { if (isl.lumites.length >= 2) break; isl.lumites.push(h.pos.clone().add(new V3(1.6, -0.45, 1.2))); }
    if (isl.sites.secret && isl.lumites.length < 1) isl.lumites.push(new V3(isl.sites.secret.x + 1.5, hf(isl.sites.secret.x, isl.sites.secret.z), isl.sites.secret.z));

    // ---- minimap image
    isl.mapCanvas = makeMap(hf, painter, pathAt, B, HALF);
    isl.minimap = function (g, k, pl) {
      const S = HALF * 2 * k;
      g.drawImage(isl.mapCanvas, (-HALF - pl.pos.x) * k, (-HALF - pl.pos.z) * k, S, S);
    };
    // ---- spawn spot search (out of view / away from the player)
    isl.spot = function (center, minD, maxD, pl, minAway, tries) {
      for (let i = 0; i < (tries || 24); i++) {
        const a = Math.random() * TAU, d = minD + Math.random() * (maxD - minD);
        const x = center.x + Math.cos(a) * d, z = center.z + Math.sin(a) * d;
        const h = hf(x, z);
        if (h < 0.8 || Math.hypot(x, z) > R * 0.95) continue;
        const g = world.phys.groundAt(x, z, 0.6, h + 2.5);
        if (g > h + 0.6) continue;
        if (pl) {
          const dx = x - pl.pos.x, dz = z - pl.pos.z, dd = Math.hypot(dx, dz);
          if (dd < (minAway || 0)) continue;
          if (dd < 30) { const f = (-Math.sin(pl.yaw) * dx - Math.cos(pl.yaw) * dz) / (dd || 1); if (f > 0.45 && dd < 25) continue; }
        }
        return new V3(x, g, z);
      }
      return null;
    };
    isl.update = function (dt) {
      isl.jumpPads.update(dt);
      if (isl.mech && isl.mech.update) isl.mech.update(dt);
      if (isl.beam) isl.beam.rotation.y += dt * (G.Save.set.reducedMotion ? 0.18 : 0.45);
      // (v runs down the flow: a falling offset carries the streaks down; reduced motion slows it)
      if (isl.fallTex) { const of = isl.fallTex.offset; of.y -= dt * (G.Save.set.reducedMotion ? 0.35 : 0.85); if (of.y < 0) of.y += 1; }
      if (isl.wheel) isl.wheel.rotation.z -= dt * (G.Save.set.reducedMotion ? 0.07 : 0.22);
      if (isl.critters) isl.critters.update(dt, world.player);
      if (isl.groves && G.R.camera) {
        const cp = G.R.camera.position;
        for (let i = 0; i < isl.groves.length; i++) { const g = isl.groves[i], dx = cp.x - g.userData.cx, dz = cp.z - g.userData.cz, d2 = dx * dx + dz * dz; g.visible = g.visible ? d2 < 5476 : d2 < 4900; }
      }
    };
    return isl;
  };

  // ---------------------------------------------------------------- region set pieces
  // The landmark chosen in buildIsland plus each region's signature dressing. Everything solid is baked with the
  // island statics (place) and leaves a soft occlusion pool. Layout uses its own random stream and fixed counts
  // (POIs never depend on the quality tier, so crystals / crates land in the same spots on every setting); only
  // collider-free instanced extras (path glow sprouts) scale with G.R.q().props.
  function placeSetPieces(world, isl, B, c) {
    const Gg = G.Geo, hf = c.hf, rnd = G.rng(c.seed * 4241 + 17);
    const spot = (o) => {
      for (let i = 0; i < (o.tries || 60); i++) {
        let x, z;
        if (o.near) { const a = rnd() * TAU, d = o.near.min + rnd() * (o.near.max - o.near.min); x = o.near.x + Math.cos(a) * d; z = o.near.z + Math.sin(a) * d; }
        else { const a = rnd() * TAU, r = c.R * ((o.minR || 0.1) + rnd() * ((o.maxR || 0.8) - (o.minR || 0.1))); x = Math.cos(a) * r; z = Math.sin(a) * r; }
        const h = c.hRaw(x, z);
        if (h < (o.minH != null ? o.minH : 1.3) || (o.maxH != null && h > o.maxH)) continue;
        if (Math.hypot(x, z) > c.coastR(Math.atan2(z, x)) * (o.coast || 0.82)) continue;
        if (c.slopeRaw(x, z) > (o.slope != null ? o.slope : 0.35)) continue;
        if (!c.free(x, z, o.r || 3)) continue;
        if (o.away && Math.hypot(x - c.sp.x, z - c.sp.z) < o.away) continue;
        if (o.offPaths && !c.offPaths(o.offPaths)(x, z)) continue;
        return { x, z, h };
      }
      return null;
    };
    // density gate: on Low (G.R.q().props < 0.7) every other small decorative piece is left out — its POI stays,
    // so the island (camps, crates, crystals) is laid out the same on every quality tier
    const deco = i => c.propsQ >= 0.7 || i % 2 === 0;
    const lowest = (x, z, r) => { let y = hf(x, z); for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU; y = Math.min(y, hf(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return y; };
    const L = isl.landmarks[0];
    // ---- landmarks
    if (L && L.kind === 'lighthouse' && Gg.lighthouse) {
      // (1.3x: the seaside hero reads from across the island — ~23 m to the finial; 1.55x when it stands more than 110 m
      // from the first view, where the coast allowed no closer spot in it — ~27 m, about as big on screen as at 95 m)
      const fv0 = isl.firstView, LS = fv0 && Math.hypot(L.x - fv0.x, L.z - fv0.z) > 110 ? 1.55 : 1.3, ly = lowest(L.x, L.z, 2.6 * LS) - 0.15;
      c.place(scaleProp(Gg.lighthouse(), LS), L.x, ly, L.z, L.ry);
      // jetty from the nearest shore toward the open sea, beside the lighthouse
      const out = Math.atan2(L.z, L.x);
      for (const da of [0.12, -0.12, 0.22, -0.22]) {
        const a = out + da, sx = L.x + Math.cos(a) * 8, sz = L.z + Math.sin(a) * 8;
        let lx = sx, lz = sz, ok = false;
        for (let d = 0; d < 22; d += 0.75) { const x = sx + Math.cos(out) * d, z = sz + Math.sin(out) * d, h = hf(x, z); if (h < 1.25) { lx = x; lz = z; ok = h > 0.15; break; } }
        if (!ok) continue;
        const deckY = Math.max(1.1, hf(lx, lz) + 0.12), len = 15;
        if (hf(lx + Math.cos(out) * len, lz + Math.sin(out) * len) > -0.4) continue;
        c.place(Gg.jetty(len, 1.0), lx, deckY - 1.0, lz, Math.atan2(Math.cos(out), Math.sin(out)));
        isl.landmarks.push({ kind: 'jetty', x: lx + Math.cos(out) * len / 2, z: lz + Math.sin(out) * len / 2, h: 4, r: 3, ry: 0, view: 20 });
        break;
      }
      // a slow pair of soft light cones sweeping from the lantern: wide and bright at the glass, fading out toward the far
      // end and toward their silhouette edges (one additive mesh, turns in isl.update; was a hard-edged tube)
      const bg = new THREE.CylinderGeometry(5.2, 0.45, 38, 18, 6, true); bg.translate(0, 19, 0); bg.rotateZ(-PI / 2);
      const bg2 = bg.clone(); bg2.rotateY(PI);
      const beam = new THREE.Mesh(Gg.merge([bg, bg2]), beamMat(0xfff0b8, 0.62));
      beam.position.set(L.x, ly + 13.9 * LS, L.z); beam.renderOrder = 4; beam.name = 'lighthouse-beam';
      world.add(beam);
      isl.beam = beam;
    }
    if (L && L.kind === 'arch' && Gg.pillarArch) {
      // seen through its opening from the landing pad, a balanced-rock hoodoo on either side; a spring on its crown pours
      // over the front face into a splash pool (the ribbon scrolls in isl.update), a faint rainbow stands in the spray
      const aSeed = (c.seed * 13) | 0, aOpts = { bands: B.dress.bands || B.paint.cliff }, ay = hf(L.x, L.z) - 0.4;
      c.place(Gg.pillarArch(22, 11, aSeed, aOpts), L.x, ay, L.z, L.ry);
      if (Gg.archFalls) G.safe('arch falls', () => {
        c.place(Gg.archFalls(22, 11, aSeed, c.propsQ < 0.7 ? Object.assign({ lite: true }, aOpts) : aOpts), L.x, ay, L.z, L.ry);
        const sheet = Gg.archFallsSheet(22, 11, aSeed, aOpts), fall = new THREE.Mesh(sheet, fallMat());
        fall.position.set(L.x, ay, L.z); fall.rotation.y = L.ry; fall.name = 'archFalls';
        world.add(fall); isl.fallTex = fall.material.map;
        if (c.propsQ < 0.7) return;   // (Low: no rainbow — one blended draw fewer)
        // (review: drawn additively over the bright sand and sky the bands washed out into one pale halo; plain alpha
        // blending with a per-vertex alpha keeps the hues, a little wider so it reads as a rainbow in the spray)
        const bow = new THREE.Mesh(rainbowGeo(6.2, 1.5), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide, fog: false, forceSinglePass: true }));
        const bz = sheet.userData.poolZ + 0.9;
        bow.position.set(L.x + Math.sin(L.ry) * bz, ay + 0.35, L.z + Math.cos(L.ry) * bz); bow.rotation.y = L.ry; bow.renderOrder = 4; bow.name = 'archRainbow';
        world.add(bow);
      });
      for (const sd of [-1, 1]) {
        const x = L.x + Math.cos(L.ry) * sd * 17, z = L.z - Math.sin(L.ry) * sd * 17;
        if (hf(x, z) > 1 && c.free(x, z, 2.5)) { c.addPoi({ x, z }, 3, 'hoodoo'); c.place(Gg.hoodoo(9 + (sd > 0 ? 3 : 0), 7 + sd, { bands: B.dress.bands }), x, lowest(x, z, 1.4) - 0.2, z, rnd() * TAU); }
      }
    }
    if (L && L.kind === 'elder' && Gg.elderGlowcap) {
      c.place(Gg.elderGlowcap(c.seed % 3 + 1), L.x, hf(L.x, L.z) - 0.1, L.z, L.ry);
      // a ring of smaller glowing caps at its feet
      const caps = (B.dress.mushCaps || [0xff6f91]);
      for (let i = 0; i < 3; i++) { const a = L.ry + 1.2 + i * 1.9, d = 9 + rnd() * 3, x = L.x + Math.sin(a) * d, z = L.z + Math.cos(a) * d; if (hf(x, z) > 1 && c.free(x, z, 1.2)) c.place(Gg.mushroom(1.6 + rnd() * 1.4, caps[i % caps.length], { glow: 0x9ffcff, seed: i }), x, hf(x, z) - 0.05, z, rnd() * TAU); }
    }
    if (L && L.kind === 'frozenFall' && Gg.frozenFall) {
      c.place(Gg.frozenFall(17, c.seed % 3 + 1), L.x, lowest(L.x, L.z, 5) - 0.3, L.z, L.ry);
    }
    if (L && L.kind === 'factory' && Gg.gizmoFactory) {
      const fy = hf(L.x, L.z) - 0.2;
      c.place(Gg.gizmoFactory(), L.x, fy, L.z, L.ry);
      // the big scrap wheel turning on the roof (its own mesh: spun in isl.update)
      if (Gg.gearWheel && Gg.FACTORY_WHEEL) G.safe('factory wheel', () => {
        const FW = Gg.FACTORY_WHEEL, w = Gg.gearWheel(FW.r).mesh, cs = Math.cos(L.ry), sn = Math.sin(L.ry);
        w.position.set(L.x + FW.x * cs + FW.z * sn, fy + FW.y, L.z - FW.x * sn + FW.z * cs); w.rotation.y = L.ry; w.name = 'factoryWheel';
        world.add(w); isl.wheel = w;
      });
    }
    // ---- Sunny Shoals: beach palms leaning over the surf, tide pools in the sand
    if (B.coast) {
      const palms = [], palms2 = [];
      for (let i = 0, tries = 0; palms.length + palms2.length < B.coast.palms && tries < B.coast.palms * 20; tries++) {
        const a = rnd() * TAU, r = c.coastR(a) * (0.84 + rnd() * 0.1), x = Math.cos(a) * r, z = Math.sin(a) * r, h = hf(x, z);
        if (h < 1.0 || h > 2.8 || c.pathAt(x, z) > 0.05 || !c.free(x, z, 2.2) || Math.hypot(x - c.sp.x, z - c.sp.z) < 10) continue;
        c.addPoi({ x, z }, 1.6, 'palm');
        (i++ % 2 ? palms : palms2).push({ x, y: h - 0.12, z, s: 0.95 + rnd() * 0.4, a, j: (rnd() - 0.5) * 0.7 });
      }
      const palmMat = Gg.windMat ? Gg.windMat(0.3) : G.M.vc();
      const tg1 = Gg.treeGeo('palm', 2, { lite: true }), tg2 = Gg.treeGeo('palm', 5, { palette: 'lime', lite: true });
      // lean seaward: each trunk geometry leans toward its own heading (measured from the crown), so every
      // instance is turned until that heading points out to sea (instance yaw ry maps local angle θ to θ - ry)
      const leanOf = g => { const p = g.attributes.position; let my = 0, sx = 0, sz = 0; for (let i = 0; i < p.count; i++) my = Math.max(my, p.getY(i)); for (let i = 0; i < p.count; i++) if (p.getY(i) > my * 0.75) { sx += p.getX(i); sz += p.getZ(i); } return Math.atan2(sz, sx); };
      for (const [pts, tg] of [[palms, tg1], [palms2, tg2]]) {
        if (!pts.length) continue;
        const th = leanOf(tg);
        for (const p of pts) p.ry = th - p.a + p.j;
        const im = Gg.instancedAt(tg, palmMat, pts); im.name = 'beachPalms'; world.add(im);
        for (const p of pts) { world.phys.addCyl(p.x, p.z, 0.3 * p.s, p.y, p.y + 4 * p.s); c.aoSpots.push({ x: p.x, z: p.z, r: 2.4 * p.s, k: 0.3 }); }
      }
      // beach spots (parasol, towel, beach ball, sand castle) beside the paths in the sunny lowlands
      let nb = 0;
      for (const sg of c.segs) {
        if (nb >= (B.coast.spots || 0)) break;
        const L2 = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az); if (L2 < 4 || rnd() > 0.22) continue;
        const nx = -(sg.bz - sg.az) / L2, nz = (sg.bx - sg.ax) / L2, side = rnd() < 0.5 ? -1 : 1, off = sg.w + 2.6;
        const x = sg.bx + nx * side * off, z = sg.bz + nz * side * off, h = hf(x, z);
        if (h < 1.3 || h > 5 || c.slopeRaw(x, z) > 0.2 || Math.hypot(x - c.sp.x, z - c.sp.z) < 12 || !c.free(x, z, 2.4) || !c.offPaths(1.4)(x, z)) continue;
        c.addPoi({ x, z }, 2.4, 'beach');
        const ry = Math.atan2(nx * side, nz * side) + (rnd() - 0.5);
        if (deco(nb)) c.place(Gg.beachSpot(nb), x, h - 0.03, z, ry);
        nb++;
      }
      for (let i = 0, tries = 0; i < B.coast.pools && tries < 300; tries++) {
        const a = rnd() * TAU, r = c.coastR(a) * (0.86 + rnd() * 0.12), x = Math.cos(a) * r, z = Math.sin(a) * r, h = hf(x, z);
        if (h < 0.35 || h > 1.3 || c.slopeRaw(x, z) > 0.25 || !c.free(x, z, 3.5) || Math.hypot(x - c.sp.x, z - c.sp.z) < 14) continue;
        c.addPoi({ x, z }, 3.2, 'pool');
        const ry = rnd() * TAU;
        if (deco(i)) c.place(Gg.tidePool(i), x, h - 0.02, z, ry);
        i++;
      }
    }
    // ---- Peach Mesas: balanced-rock hoodoos
    for (let i = 0; i < (B.hoodoos || 0); i++) {
      const p = spot({ minR: 0.15, maxR: 0.8, r: 3, slope: 0.4, away: 22, offPaths: 3 });
      if (!p) continue;
      c.addPoi(p, 3, 'hoodoo');
      c.place(Gg.hoodoo(6.5 + rnd() * 5, 20 + i, { bands: B.dress.bands }), p.x, lowest(p.x, p.z, 1.3) - 0.2, p.z, rnd() * TAU);
    }
    // ---- Frostfizz Bluffs: tall ice spires
    for (let i = 0; i < (B.iceSpires || 0); i++) {
      const p = spot({ minR: 0.15, maxR: 0.8, r: 3, slope: 0.45, away: 20, offPaths: 2.5 });
      if (!p) continue;
      c.addPoi(p, 3, 'spire');
      const cols = B.dress.crystalColors || [0x9fe8ff];
      c.place(Gg.crystal(3.2 + rnd() * 2.2, cols[i % cols.length], 40 + i), p.x, hf(p.x, p.z) - 0.2, p.z, rnd() * TAU);
    }
    // ---- Glowcap Grotto: glowing sprouts along both rims of every path (instanced glow, no colliders)
    if (B.pathGlow && Gg.glowSproutGeo) {
      const cols = B.pathGlow, buckets = cols.map(() => []), step = 5.3 / Math.max(0.55, c.propsQ);
      let acc = 0, side = 1;
      for (const sg of c.segs) {
        const L2 = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az); if (L2 < 0.5) continue;
        const nx = -(sg.bz - sg.az) / L2, nz = (sg.bx - sg.ax) / L2;
        for (let d = (step - acc) % step; d < L2; d += step) {
          side = -side;
          const t = d / L2, off = sg.w * 0.72 + 0.35 + rnd() * 0.5;
          const x = sg.ax + (sg.bx - sg.ax) * t + nx * side * off, z = sg.az + (sg.bz - sg.az) * t + nz * side * off, h = hf(x, z);
          if (h < 0.9 || Math.hypot(x - c.sp.x, z - c.sp.z) < 7 || c.pathAt(x, z) > 0.55) continue;
          buckets[(buckets[0].length + buckets[1 % cols.length].length) % cols.length].push({ x, y: h - 0.03, z, s: 0.9 + rnd() * 0.7, ry: rnd() * TAU });
        }
        acc = (acc + L2) % step;
      }
      cols.forEach((col, i) => { if (!buckets[i].length) return; const im = Gg.instancedAt(Gg.glowSproutGeo(col), Gg.glowMat(), buckets[i]); im.name = 'glowSprouts'; world.add(im); });
    }
    // ---- Junkyard Rim: junk heaps along the paths, conveyor ramps and magnet cranes
    if (B.junk) {
      let acc = 0, n = 0;
      for (const sg of c.segs) {
        const L2 = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az); acc += L2;
        if (acc < 22 || n >= B.junk.clusters) continue;
        const nx = -(sg.bz - sg.az) / (L2 || 1), nz = (sg.bx - sg.ax) / (L2 || 1), side = rnd() < 0.5 ? -1 : 1, off = sg.w + 3 + rnd() * 2;
        const x = sg.bx + nx * side * off, z = sg.bz + nz * side * off, h = hf(x, z);
        if (h < 1.0 || Math.hypot(x - c.sp.x, z - c.sp.z) < 14 || !c.free(x, z, 2) || !c.offPaths(1.6)(x, z)) continue;
        acc = 0; n++;
        c.addPoi({ x, z }, 2.2, 'junk');
        const ry = Math.atan2(nx * side, nz * side) + (rnd() - 0.5) * 0.8;
        if (deco(n)) c.place(Gg.junkCluster(n), x, h - 0.1, z, ry);
      }
      const near = L ? { x: L.x, z: L.z, min: L.r + 6, max: L.r + 22 } : null;
      for (let i = 0; i < B.junk.conveyors; i++) {
        const p = spot({ near: i === 0 ? near : null, minR: 0.15, maxR: 0.75, r: 6, slope: 0.15, away: 18, offPaths: 6, tries: 80 });
        if (!p) continue;
        c.addPoi(p, 6, 'conveyor');
        c.place(Gg.conveyor(8.5, 3.3), p.x, lowest(p.x, p.z, 4) - 0.05, p.z, ((rnd() * 4) | 0) * PI / 2);
      }
      for (let i = 0; i < B.junk.cranes; i++) {
        const p = spot({ near: i === 0 ? near : null, minR: 0.2, maxR: 0.78, r: 4, slope: 0.3, away: 24, offPaths: 3, tries: 80 });
        if (!p) continue;
        c.addPoi(p, 4, 'crane');
        c.place(Gg.magnetCrane(10 + rnd() * 3, i), p.x, hf(p.x, p.z) - 0.2, p.z, rnd() * TAU);
      }
    }
  }

  // ---------------------------------------------------------------- living ground cover + ambient life
  // Per biome: grass density / tint / height, flower palette, motes (pollen, dust, snow, embers, spores),
  // butterflies, a gull flock over the coast, fireflies at night.
  const LIFE = {
    shoals: { grass: 0.74, tint: [1, 1.05, 0.9], height: [0.42, 0.76], flowerK: 1.25, flowers: [0xff8ab4, 0xffd84a, 0xffffff, 0xc2a2ff],
      motes: { color: 0xfff0b8, count: 50 }, butterflies: { count: 8 }, birds: { count: 7, r: 138, y: 32 } },
    mesas: { grass: 0.5, tint: [1.08, 1.02, 0.82], height: [0.34, 0.6], flowerK: 0.35, flowers: [0xffd84a, 0xff9a5a, 0xffffff],
      motes: { color: 0xffd8a0, count: 70, size: 0.12, drift: [1.6, 0.08, 0.55], box: [40, 8, 40] }, butterflies: { count: 4, colors: [0xffd23f, 0xff9a4c, 0xffffff] }, birds: { count: 5, r: 120, y: 42 } },
    // grotto: the night light floods the teal ground toward bright cyan, so the blades are darker and a touch
    // greener than the ground (dark-teal silhouettes like the old tufts) and the glowing flowers pop against them
    // (its dressing is the heaviest of all biomes: the field stays a little sparser to keep High under budget)
    grotto: { grass: 0.68, tint: [0.6, 0.8, 0.78], height: [0.42, 0.82], flowerK: 1.3, flowerGlow: 2.2, flowers: [0x7af0ff, 0xc2a2ff, 0xff8ab4],
      motes: { color: 0xb898ff, count: 36, size: 0.07, drift: [0.1, 0.12, 0.08] }, fireflies: { count: 80, color: 0x9effd8 } },
    frost: { grass: 0.3, tint: [0.82, 0.95, 1.02], height: [0.3, 0.55], flowerK: 0.25, flowers: [0x9fe8ff, 0xffffff, 0xff9de2],
      motes: { color: 0xffffff, count: 140, size: 0.14, drift: [0.35, -0.8, 0.18], box: [38, 14, 38], yOff: 3 }, birds: { count: 5, r: 125, y: 36 } },
    // (junk: soft drifting dust in the golden light — no rising orange specks that read as sparks or embers)
    junk: { grass: 0.35, tint: [1.05, 0.98, 0.9], height: [0.3, 0.55], flowerK: 0.15, flowers: [0xffd23f, 0xff9a5a],
      motes: { color: 0xf4dcd8, count: 55, size: 0.09, drift: [0.7, 0.04, 0.32], box: [38, 7, 38] }, butterflies: { count: 4, colors: [0xffd23f, 0xff9a5a, 0x7fd8ff] } },
  };
  function dressLife(world, isl, B, hf, pathAt, avoid, terr, seed) {
    const L = LIFE[B.id] || LIFE.shoals, R = isl.R;
    const slope = (x, z) => (Math.abs(hf(x + 0.9, z) - hf(x - 0.9, z)) + Math.abs(hf(x, z + 0.9) - hf(x, z - 0.9))) / 1.8;
    const ground = (x, z, h) => {
      if (h < 1.85 || avoid(x, z)) return 0;
      const sl = slope(x, z); if (sl > 0.55) return 0;
      return (1 - sstep(0.02, 0.2, pathAt(x, z))) * (1 - sstep(0.3, 0.55, sl)) * sstep(1.85, 2.7, h);
    };
    if (G.Terrain.foliage) isl.foliage = G.safe('exp foliage', () => G.Terrain.foliage(world, {
      heightFn: hf, grid: terr, bounds: { minX: -R - 6, maxX: R + 6, minZ: -R - 6, maxZ: R + 6 }, blockPhys: true, seed: seed * 7 + 3,
      tint: L.tint, height: L.height, densityK: L.grass, flowerK: L.flowerK, flowerColors: L.flowers, flowerGlow: L.flowerGlow || 0,
      density: (x, z, h) => { const g = ground(x, z, h); return g > 0 ? g * (0.55 + 0.45 * clamp(0.5 + N.n2(x * 0.11, z * 0.11), 0, 1)) : 0; },
      flowers: L.flowerK > 0 ? (x, z, h) => { const g = ground(x, z, h); return g > 0 ? g * sstep(0.05, 0.42, N.n2(x * 0.06 + 4.1, z * 0.06 + 1.3)) : 0; } : null,
    }));
    const spot = (r2, cam) => {
      const p = cam.position;
      for (let i = 0; i < 8; i++) { const a = r2() * TAU, d = 6 + r2() * 14, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, h = hf(x, z); if (ground(x, z, h) > 0.3) return { x, z }; }
      return null;
    };
    if (G.Terrain.ambient) isl.ambient = G.safe('exp ambient', () => G.Terrain.ambient(world, {
      heightFn: hf, seed: seed * 5 + 1, motes: L.motes, fireflies: L.fireflies,
      butterflies: L.butterflies ? Object.assign({ spot, near: 26 }, L.butterflies) : null,
      birds: L.birds ? Object.assign({ x: 0, z: 0, speed: 0.04 }, L.birds) : null,
    }));
  }

  // ---------------------------------------------------------------- mid-ground clutter field
  // Small instanced clumps (Geo.clutterGeo: shells + starfish, candy-flower tufts, pebbles + succulents, glowing mushroom
  // clusters, ferns over moss, snow pillows + ice shards, dropped gears + bolts, scrub with buttons) scattered island-wide
  // by each region's rules, drawn only inside a window of 5 m chunks around the camera (nearest first, refilled when the
  // camera crosses into another chunk: no per-frame upload). The window follows the grass field's reach
  // (isl.foliage.reachK, shorter while a crowd of robots is in view) and instances shrink into their root toward its rim
  // (no pop). Radius / density by tier: Low 13 m x0.45, Medium 22 m x0.7, High 16 m x0.5 (its denser grass field and full
  // dressing already sit near the 200k-triangle line in a camp fight), Ultra 28 m x0.95. One draw call a kind.
  const CLUT_VS_HEAD = '#ifdef CLUT_FADE\nuniform vec3 uClCam; uniform vec2 uClFade;\n#endif';
  const CLUT_VS = ['#ifdef CLUT_FADE', '  { vec3 cb = (modelMatrix * origin).xyz; vec2 cd = cb.xz - uClCam.xz;', '    float ck = 1.0 - smoothstep(uClFade.x, uClFade.y, dot(cd, cd));', '    wp.xyz = cb + (wp.xyz - cb) * ck; }', '#endif'].join('\n');
  // per: square metres per clump at full density; where(h): 0..1 by ground height (shells keep to the beach band)
  // (review pass: a third, sparser kind of tall accents per region — lupin spikes, desert candles, glow lilies, ice
  // flowers, sunflowers — gives the fields vertical structure between the grass and the trees: one draw call more)
  const CLUTTER_RULES = {
    shoals: [{ kind: 'shoals_sand', per: 9, s: [1.3, 2.3], where: h => (h > 0.45 && h < 2.4 ? 1 : 0) }, { kind: 'shoals_bloom', per: 11, s: [1.2, 2.2], wind: 0.5, where: h => (h > 2.0 ? 1 : 0) },
      { kind: 'shoals_tall', per: 22, s: [1.25, 1.95], wind: 0.7, where: h => (h > 2.2 ? 1 : 0) }],
    mesas: [{ kind: 'mesas_pebble', per: 11, s: [1.3, 2.4], where: h => (h > 0.8 ? 1 : 0) }, { kind: 'mesas_tuft', per: 10, s: [1.2, 2.0], wind: 0.8, where: h => (h > 1.0 ? 1 : 0) },
      { kind: 'mesas_tall', per: 26, s: [1.2, 1.8], wind: 0.5, where: h => (h > 1.0 ? 1 : 0) }],
    grotto: [{ kind: 'grotto_glow', per: 11, s: [1.3, 2.4], where: h => (h > 1.0 ? 1 : 0) }, { kind: 'grotto_fern', per: 12, s: [1.1, 1.9], wind: 0.6, where: h => (h > 1.0 ? 1 : 0) },
      { kind: 'grotto_tall', per: 22, s: [1.3, 2.0], wind: 0.5, where: h => (h > 1.2 ? 1 : 0) }],
    // (frost runs denser: its open snowfields are the emptiest ground of all regions, and its views the lightest)
    frost: [{ kind: 'frost_shard', per: 8, s: [1.4, 2.6], where: h => (h > 0.8 ? 1 : 0) }, { kind: 'frost_tuft', per: 9, s: [1.2, 1.9], wind: 0.7, where: h => (h > 1.0 ? 1 : 0) },
      { kind: 'frost_tall', per: 22, s: [1.2, 1.8], wind: 0.5, where: h => (h > 1.0 ? 1 : 0) }],
    junk: [{ kind: 'junk_scrap', per: 11, s: [1.3, 2.3], where: h => (h > 0.8 ? 1 : 0) }, { kind: 'junk_weed', per: 10, s: [1.2, 1.9], wind: 0.8, where: h => (h > 1.0 ? 1 : 0) },
      { kind: 'junk_tall', per: 26, s: [1.3, 1.9], wind: 0.5, where: h => (h > 1.0 ? 1 : 0) }],
  };
  const KEEP_OUT = { spawn: 5.5, pad: 6, kiosk: 3.5, cp: 2.6, camp: 5, cage: 3, arena: 12, route: 7, secret: 2, crystal: 1.5 };
  function clutterField(world, isl, B, hf, pathAt, seed) {
    const rules0 = CLUTTER_RULES[B.id];
    if (!rules0 || !G.Geo.clutterGeo || !G.Terrain.toonVariant || !G.Terrain.hook) return null;
    const q = G.R.qualityName ? G.R.qualityName() : 'high';
    // (Low and High: no tall accents — one draw call and their triangles fewer; the two ground kinds stay. High's own
    // denser, taller grass and flower field already gives its ground that height, and its views sit nearest the 200k line)
    const rules = q === 'low' || q === 'high' ? rules0.filter(r => !/_tall$/.test(r.kind)) : rules0;
    // (review: Ultra 34 m x1.1 -> 28 m x0.95 — the camp views measured up to 269k triangles there and the 24-robot crowd
    // check 243k against its ~215k Ultra target; the outer ring of clumps is a few pixels and fading anyway, and Ultra
    // still runs wider and denser than Medium's 22 m x0.7)
    const R0 = { low: 13, med: 22, high: 16, ultra: 28 }[q] || 22, dk = { low: 0.45, med: 0.7, high: 0.5, ultra: 0.95 }[q] || 0.6;
    // (5 m chunks: the window hugs the fade circle — far fewer collapsed instances submitted than with 8 m ones)
    const C = 5, RB = isl.R + 6, cx = Math.ceil(RB * 2 / C), cz = cx, X0 = -RB, Z0 = -RB, rnd = G.rng(seed * 613 + 29);
    const phys = world.phys, tmp = [], out = [];
    for (const p of isl.pois) if (KEEP_OUT[p.kind]) out.push(p.x, p.z, KEEP_OUT[p.kind]);
    if (isl.mech) for (const p of isl.mech.pieces) out.push(p.x, p.z, (p.r || 1) + 0.6);
    const kept = (x, z) => { for (let i = 0; i < out.length; i += 3) { const dx = x - out[i], dz = z - out[i + 1]; if (dx * dx + dz * dz < out[i + 2] * out[i + 2]) return true; } return false; };
    const blocked = (x, z, h) => {
      const list = phys.query(x - 0.3, z - 0.3, x + 0.3, z + 0.3, tmp);
      for (const it of list) {
        if (it.k === 0) { if (x > it.minx - 0.3 && x < it.maxx + 0.3 && z > it.minz - 0.3 && z < it.maxz + 0.3 && it.maxy > h - 0.3 && it.miny < h + 0.9) return true; }
        else { const dx = x - it.x, dz = z - it.z, rr = it.r + 0.3; if (dx * dx + dz * dz < rr * rr && it.y1 > h - 0.3 && it.y0 < h + 0.9) return true; }
      }
      return false;
    };
    const U = { uClCam: { value: new V3(0, -1e4, 0) }, uClFade: { value: new THREE.Vector2(1e6, 2e6) } };
    const kinds = rules.map(r => {
      let a = new Float32Array(6 * 512), n = 0;
      // (candidates per chunk: the expected count, its fraction taken at random — a rounded stratified grid on 5 m chunks
      // would snap the density to one per 25 m²)
      // (Ultra's tall accents at 0.6x: its window is the widest)
      const start = new Int32Array(cx * cz + 1), nExp = C * C / r.per * dk * (q === 'ultra' && /_tall$/.test(r.kind) ? 0.6 : 1), nLo = Math.floor(nExp), fr = nExp - nLo;
      for (let j = 0; j < cz; j++) for (let i = 0; i < cx; i++) {
        start[j * cx + i] = n;
        for (let b = 0; b <= nLo; b++) {
          if (b === nLo && !(rnd() < fr)) continue;
          const x = X0 + (i + rnd()) * C, z = Z0 + (j + rnd()) * C, r1 = rnd(), r2 = rnd(), r3 = rnd();
          const h = hf(x, z), w = r.where(h) * (0.3 + 0.7 * clamp(0.5 + N.n2(x * 0.07 + seed, z * 0.07) * 0.9, 0, 1));
          if (!(w > r1) || pathAt(x, z) > 0.35 || kept(x, z)) continue;
          if (Math.abs(hf(x + 0.7, z) - hf(x - 0.7, z)) + Math.abs(hf(x, z + 0.7) - hf(x, z - 0.7)) > 1.0 || blocked(x, z, h)) continue;
          if ((n + 1) * 6 > a.length) { const b2 = new Float32Array(a.length * 2); b2.set(a); a = b2; }
          const s = r.s[0] + (r.s[1] - r.s[0]) * r2 * r2, ry = r3 * TAU, o = n * 6;
          a[o] = x; a[o + 1] = h - 0.03; a[o + 2] = z; a[o + 3] = s * Math.cos(ry); a[o + 4] = s * Math.sin(ry); a[o + 5] = s; n++;
        }
      }
      start[cx * cz] = n;
      const mat = G.Terrain.toonVariant(0xffffff, { vc: true, rimStr: 0.22, side: THREE.DoubleSide, band: 0.14, wind: r.wind || 0 }, { defines: { CLUT_FADE: '' }, uniforms: U, vsHead: CLUT_VS_HEAD, vsPre: CLUT_VS, fsNoFlip: true });
      mat.userData.shared = false;
      return { a, n, start, mat, geo: G.Geo.clutterGeo(r.kind), name: 'clutter-' + r.kind };
    });
    // window: chunks within R0 of the camera's chunk, nearest first (a shorter reach draws a prefix)
    const offs = [], od = [], span = Math.ceil(R0 / C) + 1, lst = [];
    for (let dj = -span; dj <= span; dj++) for (let di = -span; di <= span; di++) { const ex = Math.max(0, Math.abs(di) - 1) * C, ez = Math.max(0, Math.abs(dj) - 1) * C, d2 = ex * ex + ez * ez; if (d2 < R0 * R0) lst.push([di, dj, Math.sqrt(d2)]); }
    lst.sort((p, q2) => p[2] - q2[2]); for (const e of lst) { offs.push(e[0], e[1]); od.push(e[2]); }
    const group = new THREE.Group(); group.name = 'clutter';
    for (const k of kinds) {
      let cap = 1;
      for (let j = 0; j < cz; j++) for (let i = 0; i < cx; i++) { let s = 0; for (let t = 0; t < offs.length; t += 2) { const a = i + offs[t], b = j + offs[t + 1]; if (a >= 0 && b >= 0 && a < cx && b < cz) { const c2 = b * cx + a; s += k.start[c2 + 1] - k.start[c2]; } } if (s > cap) cap = s; }
      k.mesh = new THREE.InstancedMesh(k.geo, k.mat, cap); k.mesh.count = 0; k.mesh.frustumCulled = false; k.mesh.name = k.name;
      k.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      k.mat.addEventListener('dispose', () => k.mesh.dispose());
      k.cum = new Int32Array(od.length + 1); k.full = 0;
      group.add(k.mesh);
    }
    const fld = { group, kinds, R: R0, ci: -99, cj: -99, rr: -1, refreshes: 0 };
    const fill = k => {
      const A = k.a, Mx = k.mesh.instanceMatrix.array, cap = k.mesh.instanceMatrix.count;
      let n = 0, kEnd = 0;
      for (let t = 0; t < offs.length && n < cap; t += 2) {
        k.cum[t >> 1] = n; kEnd = (t >> 1) + 1;
        const a = fld.ci + offs[t], b = fld.cj + offs[t + 1];
        if (a < 0 || b < 0 || a >= cx || b >= cz) continue;
        const c2 = b * cx + a;
        for (let p = k.start[c2]; p < k.start[c2 + 1] && n < cap; p++, n++) {
          const o = p * 6, m = n * 16, sc = A[o + 3], ss = A[o + 4], s = A[o + 5];
          Mx[m] = sc; Mx[m + 1] = 0; Mx[m + 2] = -ss; Mx[m + 3] = 0; Mx[m + 4] = 0; Mx[m + 5] = s; Mx[m + 6] = 0; Mx[m + 7] = 0;
          Mx[m + 8] = ss; Mx[m + 9] = 0; Mx[m + 10] = sc; Mx[m + 11] = 0; Mx[m + 12] = A[o]; Mx[m + 13] = A[o + 1]; Mx[m + 14] = A[o + 2]; Mx[m + 15] = 1;
        }
      }
      for (let t = kEnd; t <= od.length; t++) k.cum[t] = n;
      // mode-load warm-up with an empty window: still one real (zero-size) draw, so the program is built behind the loading screen
      if (!n && G.Game && G.Game._switching) { Mx.fill(0, 0, 16); Mx[15] = 1; n = 1; k.cum[od.length] = 1; }
      k.full = n; k.mesh.count = n;
      k.mesh.instanceMatrix.clearUpdateRanges(); k.mesh.instanceMatrix.addUpdateRange(0, n * 16); k.mesh.instanceMatrix.needsUpdate = true;
    };
    const HI = G.Phys.hIn, HO = G.Phys.hOut;
    fld.update = cam => {
      const p = cam.position;
      HI[0] = p.x; HI[1] = p.z; hf.s();
      const above = p.y - HO[0];
      group.visible = above < 40 || !!(G.Game && G.Game._switching);
      if (!group.visible) return;
      const ci = Math.floor((p.x - X0) / C), cj = Math.floor((p.z - Z0) / C);
      const fol = isl.foliage, rr = R0 * (fol && fol.reachK ? fol.reachK : 1);
      let refill = false;
      if (ci !== fld.ci || cj !== fld.cj) { fld.ci = ci; fld.cj = cj; fld.refreshes++; for (let i = 0; i < kinds.length; i++) fill(kinds[i]); refill = true; }
      // (instances past the fade end are collapsed to nothing: only chunks that reach inside it are drawn)
      const fe = Math.max(5, rr - 2), fs = Math.max(2, fe - 7);
      if (refill || rr !== fld.rr) {
        fld.rr = rr;
        let t = 0; while (t < od.length && od[t] < fe) t++;
        for (let i = 0; i < kinds.length; i++) { const k = kinds[i]; k.mesh.count = Math.max(Math.min(1, k.full), Math.min(k.full, k.cum[t])); }
      }
      U.uClCam.value.copy(p);
      U.uClFade.value.set(fs * fs, fe * fe);
    };
    world.add(group);
    G.Terrain.hook(world.scene, cam => fld.update(cam));
    if (G.R.camera) fld.update(G.R.camera);
    return fld;
  }

  // ---------------------------------------------------------------- ambient critters
  // A few friendly creatures living around the player (one instanced mesh per kind, no colliders, never targets): Shoals
  // crabs scuttling sideways on the sand, Mesas lizards darting between pauses and tumbleweeds rolling with the wind,
  // Grotto sporelings (tiny walking glowcaps) hopping, Frost snow bunnies hopping, Junk junk-bugs scuttling. They wander,
  // freeze, scamper off when the player comes close, and one left far behind is re-seated ahead (growing in, no pop).
  // Per frame: index loops over one Float64Array and module scratch objects (no allocation). Low tier: half as many.
  const CRITTER_RULES = {
    shoals: [{ kind: 'crab', n: 8, speed: 1.6, side: 1, hop: 0, minH: 0.4, maxH: 3.2, s: [1.3, 1.8] }],
    mesas: [{ kind: 'lizard', n: 6, speed: 3.4, dart: 1, hop: 0, minH: 1.0, maxH: 99, s: [1.2, 1.6] }, { kind: 'tumbleweed', n: 4, speed: 2.6, roll: 1, hop: 0.3, minH: 1.0, maxH: 99, s: [1.2, 2.0] }],
    grotto: [{ kind: 'sporeling', n: 8, speed: 1.0, hop: 0.25, minH: 1.0, maxH: 99, s: [1.6, 2.2] }],
    frost: [{ kind: 'bunny', n: 8, speed: 2.6, hop: 0.4, minH: 1.0, maxH: 99, s: [1.4, 1.9] }],
    junk: [{ kind: 'junkbug', n: 9, speed: 1.6, hop: 0, minH: 1.0, maxH: 99, s: [1.5, 2.0] }],
  };
  const CS = 10;   // per critter: x, z, y, yaw, timer, mode (0 rest, 1 walk, 2 flee), phase, scale, born, roll
  // (doubles handed to seat / writeAll go through this array, never as call arguments or return values: a double
  // crossing a call that is not inlined is boxed, a heap allocation per frame. [0] px, [1] pz, [2] yaw, [3] t,
  // [4-6] camera position, [7-9] camera forward, [10] tan of the wider half field of view (0: draw every critter))
  const _cP = new Float64Array(11);
  function critters(world, isl, B, hf, seed) {
    const rules = CRITTER_RULES[B.id];
    if (!rules || !G.Geo.critterGeo) return null;
    const low = (G.R.q && G.R.q().props || 1) < 0.7, HI = G.Phys.hIn, HO = G.Phys.hOut;
    const sets = [];
    const fv = isl.firstView || { x: isl.spawn.pos.x, z: isl.spawn.pos.z, yaw: isl.spawn.yaw }, sp = { x: fv.x, z: fv.z }, fwd = fv.yaw;
    for (const r of rules) {
      const n = Math.max(2, Math.round(r.n * (low ? 0.5 : 1))), st = new Float64Array(n * CS);
      const mesh = new THREE.InstancedMesh(G.Geo.critterGeo(r.kind), G.M.inst ? G.M.inst(G.M.vc({ rimStr: 0.45 }), false) : G.M.vc({ rimStr: 0.45 }), n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.name = 'critters-' + r.kind;
      const set = { r, n, st, mesh, wind: G.rng(seed + 5)() * TAU };
      // first seats: in front of the landing pad's view, 7-22 m out, so the first seconds show them
      _cP[0] = sp.x; _cP[1] = sp.z; _cP[2] = fwd; _cP[3] = -9; _cP[10] = 0;
      for (let i = 0; i < n; i++) seat(set, i, 7, 22, 1.1);
      sets.push(set); world.add(mesh);
      _cP[3] = 0; writeAll(set);
    }
    // seat critter i somewhere d0-d1 m from (_cP[0], _cP[1]) within `cone` of heading _cP[2] (born at _cP[3])
    function seat(set, i, d0, d1, cone) {
      const r = set.r, s = set.st, o = i * CS, px = _cP[0], pz = _cP[1], yaw = _cP[2];
      for (let k = 0; k < 10; k++) {
        const a = yaw + (Math.random() - 0.5) * 2 * cone, d = d0 + Math.random() * (d1 - d0);
        const x = px - Math.sin(a) * d, z = pz - Math.cos(a) * d;
        HI[0] = x; HI[1] = z; hf.s();
        const h = HO[0];
        if (h < r.minH || h > r.maxH || isl.pathAt(x, z) >= 0.6) continue;
        s[o] = x; s[o + 1] = z; s[o + 2] = h; s[o + 3] = Math.random() * TAU; s[o + 4] = 0.3 + Math.random() * 1.5; s[o + 5] = 0;
        s[o + 6] = Math.random() * 6; s[o + 7] = r.s[0] + Math.random() * (r.s[1] - r.s[0]); s[o + 8] = _cP[3]; s[o + 9] = 0;
        return true;
      }
      // (no ground here: stays hidden; s[o + 4] becomes the wait before the next try — a crab far from any sand would
      // otherwise keep probing the height field every second)
      s[o + 7] = 0; s[o + 4] = 1.5 + Math.random() * 1.5; return false;
    }
    // instance matrices written straight into the buffer (no three.js calls): uniform scale k times the 'YXZ' rotation —
    // heading about Y, then a roll about X (tumbleweeds) or a waddle about Z (everyone else) — at the critter's spot.
    // Only critters inside the camera's view cone (2.5 m of slack) are written, packed to the front: the mesh draws
    // that many (they live all around the player, so most of them are behind the camera at any moment)
    function writeAll(set) {
      const r = set.r, s = set.st, M = set.mesh.instanceMatrix.array, t = _cP[3], roll = !!r.roll, turn = r.side ? PI / 2 : 0, tc = _cP[10];
      let w = 0;
      for (let i = 0; i < set.n; i++) {
        const o = i * CS;
        if (s[o + 7] === 0) continue;
        if (tc > 0) {
          const dx = s[o] - _cP[4], dy = s[o + 2] - _cP[5], dz = s[o + 1] - _cP[6], al = dx * _cP[7] + dy * _cP[8] + dz * _cP[9];
          if (al < -2.5) continue;
          const lim = (al > 0 ? al * tc : 0) + 2.5;
          if (dx * dx + dy * dy + dz * dz - al * al > lim * lim) continue;
        }
        const e = w * 16, mv = s[o + 5] > 0, g0 = (t - s[o + 8]) * 2, g = g0 < 0 ? 0 : g0 > 1 ? 1 : g0, k = s[o + 7] * g * g * (3 - 2 * g);
        w++;
        const hopY = r.hop > 0 && (mv || roll) ? Math.abs(Math.sin(s[o + 6])) * r.hop : 0;
        const tilt = roll ? s[o + 9] : mv ? Math.sin(s[o + 6] * 2) * (r.side ? 0.12 : 0.08) : 0;
        const yaw = roll ? s[o + 3] : s[o + 3] + turn, cy = Math.cos(yaw) * k, sy = Math.sin(yaw) * k, ct = Math.cos(tilt), st = Math.sin(tilt);
        if (roll) { M[e] = cy; M[e + 1] = 0; M[e + 2] = -sy; M[e + 4] = sy * st; M[e + 5] = ct * k; M[e + 6] = cy * st; M[e + 8] = sy * ct; M[e + 9] = -st * k; M[e + 10] = cy * ct; }
        else { M[e] = cy * ct; M[e + 1] = st * k; M[e + 2] = -sy * ct; M[e + 4] = -cy * st; M[e + 5] = ct * k; M[e + 6] = sy * st; M[e + 8] = sy; M[e + 9] = 0; M[e + 10] = cy; }
        M[e + 3] = 0; M[e + 7] = 0; M[e + 11] = 0;
        M[e + 12] = s[o]; M[e + 13] = s[o + 2] + hopY + (roll ? 0.3 * s[o + 7] : 0); M[e + 14] = s[o + 1]; M[e + 15] = 1;
      }
      // (mode-load warm-up with nobody seated: still one real, zero-size draw, so the program is built behind the loading screen)
      if (!w && G.Game && G.Game._switching) { M.fill(0, 0, 16); M[15] = 1; w = 1; }
      set.mesh.count = w;
      set.mesh.instanceMatrix.needsUpdate = true;
    }
    const api = { sets };
    api.update = (dt, pl) => {
      if (!pl) return;
      const t = G.time.elapsed, px = pl.pos.x, pz = pl.pos.z, yaw = pl.yaw, cam = G.R.camera;
      _cP[0] = px; _cP[1] = pz; _cP[3] = t;
      if (cam && cam.isPerspectiveCamera) {
        const te = cam.matrixWorld.elements;
        _cP[4] = te[12]; _cP[5] = te[13]; _cP[6] = te[14]; _cP[7] = -te[8]; _cP[8] = -te[9]; _cP[9] = -te[10];
        _cP[10] = Math.tan(cam.fov * PI / 360) * (cam.aspect > 1 ? cam.aspect : 1);
      } else _cP[10] = 0;
      for (let si = 0; si < sets.length; si++) {
        const set = sets[si], r = set.r, s = set.st;
        _cP[2] = r.roll ? set.wind : yaw;
        for (let i = 0; i < set.n; i++) {
          const o = i * CS;
          let dx = s[o] - px, dz = s[o + 1] - pz;
          const d2 = dx * dx + dz * dz;
          // a hidden critter (no ground found last time) waits out its timer before trying again; one left far behind
          // is re-seated ahead (tumbleweeds come back in from upwind: the seat is that far from the player against the wind)
          if (s[o + 7] === 0) { s[o + 4] -= dt; if (s[o + 4] <= 0) { if (r.roll) seat(set, i, 14, 26, 0.9); else seat(set, i, 13, 26, 1.0); } continue; }
          if (d2 > 36 * 36) { if (Math.random() < 0.08) { if (r.roll) seat(set, i, 14, 26, 0.9); else seat(set, i, 13, 26, 1.0); } continue; }
          if (r.roll) {
            // tumbleweeds roll downwind, bouncing; past the player and far off, they come back in from upwind
            const wa = set.wind, sp = r.speed * (0.8 + 0.4 * Math.sin(t * 0.7 + i));
            const nx = s[o] + Math.sin(wa) * sp * dt, nz = s[o + 1] + Math.cos(wa) * sp * dt;
            HI[0] = nx; HI[1] = nz; hf.s();
            if (HO[0] < r.minH) { seat(set, i, 16, 26, 0.9); continue; }
            s[o] = nx; s[o + 1] = nz; s[o + 2] += (HO[0] - s[o + 2]) * Math.min(1, dt * 8); s[o + 3] = wa; s[o + 5] = 1;
            s[o + 6] += dt * 4.2; s[o + 9] += sp * dt / (0.32 * s[o + 7]);
            continue;
          }
          s[o + 4] -= dt;
          if (d2 < 20 && s[o + 5] !== 2) { s[o + 5] = 2; s[o + 4] = 1.0 + Math.random() * 0.8; s[o + 3] = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.8; }
          else if (s[o + 4] <= 0) {
            if (s[o + 5] === 0) { s[o + 5] = 1; s[o + 4] = r.dart ? 0.35 + Math.random() * 0.4 : 0.9 + Math.random() * 1.8; s[o + 3] += (Math.random() - 0.5) * 2.4; }
            else { s[o + 5] = 0; s[o + 4] = r.dart ? 0.8 + Math.random() * 2.2 : 0.5 + Math.random() * 1.8; }
          }
          if (s[o + 5] > 0) {
            const v = r.speed * (s[o + 5] === 2 ? 1.7 : 1) * dt, nx = s[o] + Math.sin(s[o + 3]) * v, nz = s[o + 1] + Math.cos(s[o + 3]) * v;
            HI[0] = nx; HI[1] = nz; hf.s();
            const h = HO[0];
            if (h < r.minH || h > r.maxH || h - s[o + 2] > 0.6) { s[o + 3] += PI * (0.6 + Math.random() * 0.8); }
            else { s[o] = nx; s[o + 1] = nz; s[o + 2] = h; }
            s[o + 6] += dt * (r.hop > 0 ? 8.5 : 15);
          }
        }
        writeAll(set);
      }
    };
    return api;
  }

  // ---------------------------------------------------------------- first-view welcome grove
  // The first view (isl.firstView: the landing pad's eye looking inland — or, on ★1 story sweep / parts runs, the intro
  // spot 34 m short of the nearest camp, 21c introSpawn) is framed left and right by a little region grove 8-17 m out:
  // a welcome piece in front (a candy signpost with icon boards — no text: it reads in every language — or a short picket
  // fence with a flower planter and a region touch) and the grove behind and outward of it (Shoals: a candy-pink tree, a
  // palm, a berry bush, giant flowers; Mesas: a balanced-rock hoodoo, a round-cactus patch, a boulder, a palm; Grotto: a
  // giant glowcap, a smaller one and a glowing crystal; Frost: snowy pines and a pastel crystal cluster; Junk: an autumn
  // tree over a scrap heap sprouting flowers). Every piece stays off the paths, 2.6 m + its footprint clear of the
  // straight walk ahead, on level ground and off every other prop. All of it is baked into one mesh of its own (frustum-
  // culled: no cost once the player has turned away from the start). The layout (points of interest) is the same on
  // every tier; Low builds only the largest piece of each side (no welcome piece).
  // GROVE[biome](Geo, side, B): [build, footprint radius, u (m further out along the view), v (m outward from the view
  // axis)] relative to the welcome piece, largest first
  const GROVE = {
    shoals: (Gg, s) => [
      [() => Gg.tree('round', 1.3, s > 0 ? 4 : 8, { palette: s > 0 ? 'pink' : 'mint' }), 1.5, 5.0, 2.2],
      [() => Gg.tree('palm', 1.15, s > 0 ? 2 : 5, s > 0 ? { lite: true } : { palette: 'lime', lite: true }), 0.9, -0.4, 4.4],
      [() => Gg.bush(1.25, 0x5cc85a, 50, 0xff7aa8), 1.1, 1.0, -1.2],
      [() => Gg.bigFlower(s > 0 ? 0xff7a93 : 0xffd45c, 1.15), 0.5, -1.6, 1.8],
    ],
    mesas: (Gg, s, B) => [
      [() => Gg.hoodoo(s > 0 ? 7.6 : 6.4, s > 0 ? 31 : 32, { bands: B.dress.bands }), 1.9, 3.6, 2.4],
      [() => X.bloomPatch(B, s > 0 ? 0 : 1), 1.0, 0.6, -1.0],
      [() => Gg.rock(1.5, s > 0 ? 61 : 67, 'sand'), 1.3, 0.4, 4.6],
      [() => Gg.tree('palm', 1.05, s > 0 ? 1 : 5, s > 0 ? { lite: true } : { palette: 'lime', lite: true }), 0.9, -1.8, 2.6],
    ],
    grotto: (Gg, s) => [
      [() => Gg.mushroom(s > 0 ? 3.0 : 3.5, s > 0 ? 0xff5fa2 : 0xb983ff, { glow: 0x9ffcff, seed: s > 0 ? 3 : 4 }), 2.0, 4.4, 2.6],
      [() => Gg.mushroom(s > 0 ? 1.6 : 1.4, s > 0 ? 0xffa85c : 0xff5fa2, { glow: 0x9ffcff, seed: s > 0 ? 5 : 6 }), 1.0, -0.6, 3.4],
      [() => Gg.crystal(1.4, s > 0 ? 0x5cffe1 : 0xc2a2ff, s > 0 ? 7 : 9, { halo: true }), 0.6, 0.6, -0.8],
      [() => Gg.bush(1.1, 0x3a8f7a, 52, 0x5cffe1), 1.0, 2.0, 5.2],
    ],
    frost: (Gg, s) => [
      [() => Gg.tree('pine', 1.5, s > 0 ? 1 : 4, { palette: 'pine', snow: true }), 1.2, 4.2, 2.4],
      [() => Gg.tree('pine', 1.1, s > 0 ? 2 : 6, { palette: 'teal', snow: true }), 0.9, -0.8, 4.2],
      [() => Gg.crystal(1.55, s > 0 ? 0xff9de2 : 0x9fe8ff, s > 0 ? 11 : 13, { halo: true }), 0.7, 0.8, -0.8],
      [() => Gg.rock(1.2, s > 0 ? 71 : 77, 'frost'), 1.0, 4.8, 0.4],
    ],
    junk: (Gg, s) => [
      [() => Gg.tree('round', 1.25, s > 0 ? 3 : 9, { palette: 'autumn' }), 1.5, 4.6, 2.4],
      [() => Gg.junkCluster(s > 0 ? 3 : 6), 1.4, 0.4, -0.6],
      [() => Gg.bigFlower(s > 0 ? 0xffa85c : 0xffd23f, 1.0), 0.5, -1.6, 2.2],
      [() => Gg.bush(1.1, 0x8fbf6a, 53, 0xffd23f), 1.0, 1.6, 4.8],
    ],
  };
  function padDress(world, isl, B, c) {
    const fv = isl.firstView || { x: isl.spawn.pos.x, z: isl.spawn.pos.z, yaw: isl.spawn.yaw }, sp = isl.spawn.pos, yaw = fv.yaw, hf = c.hf, Gg = G.Geo;
    const Fx = -Math.sin(yaw), Fz = -Math.cos(yaw);
    // (the landing pad's own clearing is where these belong: every other point of interest keeps its distance)
    // (the grove's own pieces are kept apart by `taken` below, not by their points of interest)
    const freeX = (x, z, r) => { for (const p of isl.pois) { if (p.kind === 'spawn' || p.kind === 'welcome') continue; const dx = p.x - x, dz = p.z - z, rr = p.r + r; if (dx * dx + dz * dz < rr * rr) return false; } return Math.hypot(x - sp.x, z - sp.z) > 4 && Math.hypot(x - fv.x, z - fv.z) > 4; };
    const flatAt = (x, z, r, h, tol) => { for (let i = 0; i < 6; i++) { const b = i / 6 * TAU; if (Math.abs(hf(x + Math.cos(b) * r, z + Math.sin(b) * r) - h) > tol) return false; } return true; };
    const lowAt = (x, z, r) => { let y = hf(x, z); for (let i = 0; i < 6; i++) { const b = i / 6 * TAU; y = Math.min(y, hf(x + Math.cos(b) * r, z + Math.sin(b) * r)); } return y; };
    // (one baked mesh a side — with both sides in one mesh its bounding sphere spanned the whole view and it drew from
    // every camp that faced the pad; review measurement: 4.2k triangles in a Frostfizz camp fight at High)
    const full = c.propsQ >= 0.7, kit = GROVE[B.id] || GROVE.mesas, rnd = G.rng(c.seed * 977 + 13), grps = [new THREE.Group(), new THREE.Group()], taken = [];
    let grp = grps[0];
    const put = (prop, x, y, z, ry) => { const r = Gg.place(world, prop, x, y, z, ry, grp); if (Gg.aoFromCols) Gg.aoFromCols(r.cols, c.aoSpots, hf); return r; };
    let placed = 0;
    for (const side of [-1, 1]) {
      // the side vector (pointing to this side of the view axis)
      const Sx = side * -Math.cos(yaw), Sz = side * Math.sin(yaw);
      grp = grps[side > 0 ? 1 : 0];
      for (let k = 0; k < 16; k++) {
        const a = yaw + side * (0.46 + k * 0.05), d = 8.5 + (k % 4) * 1.4, x = fv.x - Math.sin(a) * d, z = fv.z - Math.cos(a) * d, h = hf(x, z);
        if (h < 1.0 || !c.offPaths(2.4)(x, z) || !freeX(x, z, 2.2)) continue;
        if (!flatAt(x, z, 1.8, h, 0.5) || world.phys.groundAt(x, z, 1.6, h + 3) > h + 0.25) continue;
        // the welcome piece (Low: the spot is kept — the layout is the same on every tier — but nothing is built there)
        c.addPoi({ x, z }, 2.4, 'welcome');
        if (full) put(X.welcomeProp(B.id, side > 0 ? 1 : 0), x, h - 0.04, z, Math.atan2(fv.x - x, fv.z - z) + side * 0.5);
        taken.push(x, z, 1.6);
        placed++;
        // the grove behind and outward of it
        const list = kit(Gg, side, B);
        for (let i = 0; i < list.length; i++) {
          const pc = list[i], r = pc[1], px = x + Fx * pc[2] + Sx * pc[3], pz = z + Fz * pc[2] + Sz * pc[3], ph = hf(px, pz);
          const along = (px - fv.x) * Fx + (pz - fv.z) * Fz, lat = (px - fv.x) * Sx + (pz - fv.z) * Sz;
          if (ph < 1.0 || Math.abs(ph - h) > 1.6 || along < 4 || lat < 2.6 + r || !c.offPaths(r + 0.8)(px, pz) || !freeX(px, pz, r)) continue;
          let clash = false; for (let t = 0; t < taken.length; t += 3) { const dx = px - taken[t], dz = pz - taken[t + 1], rr = r + taken[t + 2]; if (dx * dx + dz * dz < rr * rr) { clash = true; break; } }
          if (clash || !flatAt(px, pz, r * 0.8, ph, 0.45 + r * 0.25) || world.phys.groundAt(px, pz, r * 0.7, ph + 3) > ph + 0.25) continue;
          const ry = rnd() * TAU;
          c.addPoi({ x: px, z: pz }, r + 0.6, 'welcome');
          taken.push(px, pz, r);
          if (full || i === 0) put(pc[0](), px, lowAt(px, pz, r * 0.6) - 0.06, pz, ry);
        }
        break;
      }
    }
    // each side's mesh is hidden while the camera is over ~72 m away (hysteresis 70 / 74 m; isl.update): the grove frames
    // the first seconds, the fog has begun there, and camp fights across the island no longer pay for it
    isl.groves = [];
    for (let i = 0; i < 2; i++) {
      const g = grps[i]; if (!g.children.length) continue;
      let sx = 0, sz = 0; for (let j = 0; j < g.children.length; j++) { sx += g.children[j].position.x; sz += g.children[j].position.z; }
      const m = Gg.bake(g); m.name = 'welcomeGrove'; m.userData.cx = sx / g.children.length; m.userData.cz = sz / g.children.length;
      world.add(m); isl.groves.push(m);
    }
    return placed;
  }
  // a round-cactus patch for the Mesas grove: barrel cacti and flowering rosettes among pale pebbles (the dressing's
  // bloom shapes, a little larger)
  X.bloomPatch = function (B, v) {
    const cols = (B.dress && B.dress.bloomColors) || [0xff7a93, 0xffd45c, 0xff9a5a];
    return X.kitCached('exp-bloomPatch|' + B.id + '|' + v, k => {
      const G2 = G.Geo, spots = v ? [[0, 0, 0, 1.5], [0.85, 0.4, 1, 1.1], [-0.7, 0.55, 2, 1.25], [0.2, -0.9, 0, 0.95]] : [[0, 0, 1, 1.4], [-0.9, 0.3, 0, 1.2], [0.75, -0.5, 2, 1.15], [0.3, 0.95, 0, 0.9]];
      for (let i = 0; i < spots.length; i++) { const s = spots[i]; k.add(G2.bloomGeo(s[2], cols[(i + v) % cols.length], s[2] + 1).clone(), null, s[0], -0.03, s[1], 0, i * 1.7 + v, 0, s[3]); }
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + v; k.add(G2.rockGeo(0.32 + i * 0.06, 150 + i + v * 3, 'sand', 1).clone(), null, Math.cos(a) * 1.15, -0.05, Math.sin(a) * 1.15, 0, a, 0); }
      gAO(k, 0.5);
      k.cyl(0, 0, 0.9, 0, 0.9);
    });
  };
  X.welcomeProp = function (biome, v) {
    const kind = KIT[biome] ? biome : 'mesas';
    return X.kitCached('exp-welcome|' + kind + '|' + v, k => {
      const P = G.Geo.P, pal = { shoals: [0xff8fb0, 0x5cd6c8, 0xffd23f], mesas: [0xff9a5a, 0x5cb8ff, 0xffd23f], grotto: [0xb983ff, 0x5cffe1, 0xff7ab8], frost: [0x8fb8ff, 0xff9de2, 0xffffff], junk: [0xff8a4c, 0x5cd6c8, 0xffd23f] }[kind];
      // (small round bits below the primitive minimums: these sit beside the landing pad, ~1k triangles a piece)
      const ball = (r, col, x, y, z) => { const g = new THREE.SphereGeometry(r, 6, 4); g.deleteAttribute('uv'); k.add(g, col, x, y, z); };
      const wood = woodC(kind === 'frost' ? 0xc8a07a : 0xd99a5b, 'y');
      if (v === 0) {
        // signpost: a round-topped post with three chunky arrow boards (each with an emblem) and a flower tuft at its foot
        k.add(P.cyl(0.11, 0.14, 2.6, 8), wood, 0, 1.3, 0);
        k.add(P.sph(0.2, 10, 6), pal[2], 0, 2.68, 0);
        const em = ['star', 'gear', 'heart'];
        for (let i = 0; i < 3; i++) {
          // (each board points its own way, its emblem on the face toward +Z)
          const y = 2.2 - i * 0.55, dir = i % 2 ? -1 : 1, ry = (i - 1) * 0.35;
          const b = new THREE.Shape(); b.moveTo(-0.55 * dir, -0.2); b.lineTo(0.38 * dir, -0.2); b.lineTo(0.62 * dir, 0); b.lineTo(0.38 * dir, 0.2); b.lineTo(-0.55 * dir, 0.2); b.closePath();
          k.add(G.Geo._shapes.extrude(b, 0.09, 0.03, 1, 1), pal[i], dir * 0.42, y, 0, 0, ry, 0);
          const lx = -dir * 0.1, lz = 0.09;
          if (G.Geo.emblem) k.add(G.Geo.emblem(em[i], 0xfff6ea).clone(), null, dir * 0.42 + lx * Math.cos(ry) + lz * Math.sin(ry), y, -lx * Math.sin(ry) + lz * Math.cos(ry), 0, ry, 0, 0.26);
        }
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ball(0.16, [0xff7aa8, 0xffd84a, 0xffffff, 0xb983ff, 0xff9a5a][i], Math.cos(a) * 0.32, 0.18, Math.sin(a) * 0.32); }
        k.add(P.sph(0.34, 8, 5), kind === 'frost' ? 0xe8f2ff : kind === 'junk' ? 0x7a6a8a : 0x5cb85a, 0, 0.1, 0, 0, 0, 0, 1, 0.5, 1);
        // (review: the arrow boards reach ~1 m out from the post at eye height — a pole-only collider let the camera walk
        // into them; this one keeps the eye clear of the boards)
        k.cyl(0, 0, 0.2, 0, 0.9); k.cyl(0, 0, 0.95, 0.9, 2.6);
      } else {
        // a short picket fence (rounded pickets, two rails) ending in a planter box of flowers, and the region touch
        for (let i = 0; i < 6; i++) { k.add(P.box(0.16, 0.95, 0.07), i % 2 ? 0xfff6ea : pal[0], -1.2 + i * 0.4, 0.48, 0); ball(0.09, i % 2 ? pal[0] : 0xfff6ea, -1.2 + i * 0.4, 0.98, 0); }
        for (const y of [0.32, 0.72]) k.add(P.box(2.3, 0.08, 0.06), pal[1], -0.2, y, -0.05);
        k.add(P.rbox(0.95, 0.45, 0.55, 0.08, 1), wood, 1.45, 0.23, 0.15);
        for (let i = 0; i < 7; i++) { const x = 1.1 + (i % 4) * 0.23, z = i < 4 ? 0.02 : 0.28; ball(0.1, [0xff7aa8, 0xffd84a, 0xffffff, 0xb983ff][i % 4], x, 0.68, z); }
        if (kind === 'shoals') {
          const b2 = P.cap(0.26, 1.4, 2, 8); b2.scale(1, 1, 0.22); G.Geo.colorize(b2, (x, y) => new THREE.Color(Math.abs(y - 0.2) < 0.15 ? 0xfff6ea : 0x39c6e8)); k.add(b2, null, -1.75, 0.9, 0.3, 0.12, 0.3, 0.18);
        } else if (kind === 'mesas') {
          k.add(G.Geo.lathe([[0.26, 0], [0.32, 0.38], [0, 0.38]], 10), 0xc9624a, -1.85, 0, 0.35); k.add(P.sph(0.3, 10, 7), 0x6fbf6a, -1.85, 0.66, 0.35, 0, 0, 0, 1, 1.25, 1); k.add(P.sph(0.09, 6, 4), 0xff7a93, -1.85, 1.05, 0.35);
        } else if (kind === 'grotto') {
          k.add(tubeG(-1.8, 0, 0.3, -1.7, 1.6, 0.3, 0.07, 0.05, 6), 0x3aa58a); k.glow(P.sph(0.24, 10, 7), 0x9ffcff, -1.7, 1.78, 0.3); k.add(P.cone(0.22, 0.16, 8), 0xb983ff, -1.7, 2.0, 0.3);
        } else if (kind === 'frost') {
          k.add(P.sph(0.42, 10, 7), 0xffffff, -1.85, 0.4, 0.35); k.add(P.sph(0.3, 10, 7), 0xffffff, -1.85, 0.98, 0.35); k.add(P.cone(0.06, 0.24, 6), 0xff9a4c, -1.85, 1.0, 0.68, PI / 2, 0, 0);
          for (const sx of [-0.1, 0.1]) k.add(P.sph(0.04, 5, 3), 0x2a2f5a, -1.85 + sx, 1.08, 0.6);
          k.add(P.tor(0.26, 0.07, 5, 12), 0xff6b8b, -1.85, 0.76, 0.35, PI / 2, 0, 0);
        } else {
          k.add(G.Geo.lathe([[0.34, 0], [0.38, 0.12], [0.38, 0.75], [0.34, 0.85], [0, 0.85]], 12), (x, y) => new THREE.Color(Math.abs(y - 0.3) < 0.05 || Math.abs(y - 0.6) < 0.05 ? 0xffd23f : 0x8f6bff), -1.85, 0, 0.35);
          for (let i = 0; i < 4; i++) k.add(P.sph(0.1, 6, 4), [0xff7aa8, 0xffd84a, 0xffffff, 0x8bea4a][i], -1.85 + Math.cos(i * 1.6) * 0.18, 0.95, 0.35 + Math.sin(i * 1.6) * 0.18);
        }
        // (review: the region touch at the fence's end — surfboard, cactus pot, lamp, snow buddy, drum — stood outside every
        // collider, so the player walked through it)
        k.box(-0.2, 0.5, 0, 2.6, 1.0, 0.3); k.cyl(1.45, 0.15, 0.5, 0, 0.6); k.cyl(-1.8, 0.33, 0.42, 0, kind === 'grotto' ? 2.1 : 1.4);
      }
      gAO(k, 0.6);
    }, { rimStr: 0.4 });
  };

  // ---------------------------------------------------------------- region signature mechanics
  // One readable mechanic per region, laid out with every island of that region (story and Field Board missions alike),
  // mostly at the Gizmob camps so fights happen on it:
  //   Sunny Shoals   — bouncy kelp pads (launch you up; a double jump is ready again at the top) and camp tide pools
  //                    (grounded robots wade at half speed; the pool makes them easy targets)
  //   Peach Mesas    — warm updrafts (glowing columns beside the tall mesas lift you to the top; glide / double-jump
  //                    off) and tumble-rocks that roll down chutes through camps (bowl robots over; shoot one to smash it)
  //   Glowcap Grotto — dim camps under a gloom dome, robots hiding as peeking eyes; pop a glowing light spore (shoot or
  //                    touch it; or simply stand inside for a moment) to light the camp and reveal them. "Lights Out"
  //                    puts two of its cages in the dark instead
  //   Frostfizz      — slippery ice patches (momentum sliding: the run keeps its speed, steering is soft, never a stop)
  //                    and frost crystals that shatter into a slow field (robots inside crawl; you don't)
  //   Junkyard Rim   — conveyor belts that carry you and robots, feeding a magnet crane; hit its glowing button and
  //                    the magnet lifts every robot (and metal crate) in its yellow ring and drops them, hard
  // Everything is built while the island loads (meshes created here are drawn by the load warm-up); per-frame work is
  // index loops over a handful of pieces with reused vectors. mech.onEvent(type, data) is set by the mode (region
  // challenge, first-time intro): 'kelp' 'pool' 'updraft' 'rockBonk' 'rockSmash' 'lit' 'iceSlide' 'frost' 'belt'
  // 'crane'. Comfort: fov kicks and shakes go through G.Motion (shake() / speedLines()).
  const _mv = new V3(), _mw = new V3(), _mq = new THREE.Quaternion(), _mm = new THREE.Matrix4(), _ms = new V3();
  const AXIS_Y = new V3(0, 1, 0);
  const robotsOf = world => world.actors;
  const isBot = a => a.alive && a.team === 1 && (a.isEnemy || a.enemyId) && !a.isBoss && !a._parked && !a.isHazard;
  const kick = (pl, k) => { pl.fovKick = Math.max(pl.fovKick || 0, k * (G.Motion ? 0.4 + 0.6 * G.Motion.speedLines() : 1)); };
  // Static mechanics: placed before the dressing (their POIs keep trees and rocks off them). c: buildIsland context.
  function buildMechanics(world, isl, B, c) {
    const M = { kind: B.id, onEvent: null, pieces: [], zones: [], belts: [], pads: [], pools: [], drafts: [], chutes: [], ice: [], crystals: [], cranes: [], crates: [], t: -0 };
    const rnd = G.rng(c.seed * 7331 + 5), hf = c.hf, emit = (t, d) => { if (M.onEvent) G.safe('mech event', () => M.onEvent(t, d)); };
    M.emit = emit;
    const clear = (x, z, r, h) => world.phys.groundAt(x, z, r, h + 3) <= h + 0.25;   // no collider stands there
    const flatAt = (x, z, r) => { const h = hf(x, z); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; if (Math.abs(hf(x + Math.cos(a) * r, z + Math.sin(a) * r) - h) > 0.6) return false; } return true; };
    // a ring spot around a camp: outside the kit ring (hut / pieces at 5.5-8 m), clear of colliders and paths
    const ringSpot = (cp, d0, d1, r, tries) => {
      for (let i = 0; i < (tries || 24); i++) {
        const a = rnd() * TAU, d = d0 + rnd() * (d1 - d0), x = cp.x + Math.cos(a) * d, z = cp.z + Math.sin(a) * d, h = hf(x, z);
        if (h < 1.2 || !clear(x, z, r, h) || !flatAt(x, z, r) || c.pathAt(x, z) > 0.3) continue;
        let bad = false; for (const p of M.pieces) if (Math.hypot(p.x - x, p.z - z) < p.r + r + 0.6) { bad = true; break; }
        if (bad) continue;
        return { x, z, h, a };
      }
      return null;
    };
    const piece = (x, z, r, kind) => { const p = { x, z, r, kind }; M.pieces.push(p); return p; };
    const shadow = (x, z, r, k) => { if (isl.campShadows) isl.campShadows.push({ x, z, rx: r, rz: r, ry: 0, k: k || 0.35 }); };
    const camps = isl.camps.slice();
    const builders = { shoals: shoalsMech, mesas: mesasMech, grotto: grottoMech, frost: frostMech, junk: junkMech };
    if (builders[B.id]) G.safe('mechanics ' + B.id, () => builders[B.id]());
    // (distance to the piece's edge: a dim zone or an ice sheet is met at its rim, not its centre)
    M.near = (x, z) => { let best = null, bd = 1e9; for (const p of M.pieces) { const d = Math.max(0, Math.hypot(p.x - x, p.z - z) - (p.r || 0)); if (d < bd) { bd = d; best = p; } } return best ? { piece: best, d: bd } : null; };
    return M;

    // ================================================================ Sunny Shoals
    function shoalsMech() {
      // tide pools in the middle of the first camps (robots guard their camp, so they stand in it a lot)
      const poolGeo = [];
      for (let i = 0; i < Math.min(5, camps.length); i++) {
        const cp = camps[i], a = rnd() * TAU, x = cp.x + Math.cos(a) * 1.4, z = cp.z + Math.sin(a) * 1.4, R = 3.3;
        const h = hf(x, z);
        if (h < 1.0) continue;
        M.pools.push({ x, z, r: R, y: h, ripT: 0 });
        piece(x, z, R, 'pool');
        // the pool surface: bright shallow centre, deeper ring, foam rim (one merged mesh for all pools)
        const g = new THREE.CircleGeometry(R, 26, 0, TAU); g.rotateX(-PI / 2);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) { const lx = p.getX(k), lz = p.getZ(k); p.setY(k, hf(x + lx, z + lz) - h + 0.06); }
        // (deeper teal in the middle, bright shallows toward the foam lip: reads as water with depth, where the pale centre
        // bloomed into a near-white disc on Medium / High)
        G.Geo.colorize(g, (px, py, pz) => { const t = Math.hypot(px, pz) / R; return t > 0.9 ? new THREE.Color(0xf4ffff) : new THREE.Color(0x1f9fc4).lerp(new THREE.Color(0x7fe8e0), Math.min(1, t * t * 1.15)); });
        g.translate(x, h, z); poolGeo.push(g);
        // a ring of smooth coral rocks around it (baked with the island)
        const kit = new G.Geo.Kit();
        for (let j = 0; j < 7; j++) { const ra = j / 7 * TAU + rnd() * 0.4, rr = R + 0.15; kit.add(G.Geo.rockGeo(0.42 + rnd() * 0.25, 90 + i * 7 + j, 'coral', 1), null, Math.cos(ra) * rr, -0.12, Math.sin(ra) * rr, 0, rnd() * TAU, 0); }
        if (G.Geo.starfishGeo) kit.add(G.Geo.starfishGeo(0xff8a4c), null, R * 0.4, 0.07, -R * 0.2, 0, rnd() * TAU, 0);
        const d = kit.data(); const m = new THREE.Mesh(d.solid, G.M.vc()); m.position.set(x, h, z); c.bakeG.add(m);
      }
      if (poolGeo.length) {
        const mesh = new THREE.Mesh(G.Geo.merge(poolGeo), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        mesh.name = 'tidePools'; mesh.renderOrder = 2; world.add(mesh); M.poolMesh = mesh;
      }
      // kelp pads: one at each camp's edge, plus a few along the paths (bounce up to the sky islands / high spots)
      const spots = [];
      for (const cp of camps) { const s = ringSpot(cp, 9.5, 12, 1.4); if (s) spots.push(s); }
      let n = 0;
      for (const sg of c.segs) {
        if (n >= 3) break;
        if (rnd() > 0.12) continue;
        const L2 = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az); if (L2 < 3) continue;
        const side = rnd() < 0.5 ? -1 : 1, nx = -(sg.bz - sg.az) / L2 * side, nz = (sg.bx - sg.ax) / L2 * side;
        const x = sg.bx + nx * (sg.w + 2.2), z = sg.bz + nz * (sg.w + 2.2), h = hf(x, z);
        if (h < 1.3 || !clear(x, z, 1.4, h) || !flatAt(x, z, 1.4) || Math.hypot(x - c.sp.x, z - c.sp.z) < 16 || !c.free(x, z, 2)) continue;
        spots.push({ x, z, h }); n++; c.addPoi({ x, z }, 1.8, 'kelp');
      }
      const kit = new G.Geo.Kit(), P = G.Geo.P;
      // squishy coral cushion with dimples, a sunny rim and kelp fronds; a mint glow ring on top says "bouncy"
      const cush = P.sph(1.1, 16, 5); cush.scale(1, 0.38, 1); cush.translate(0, 0.18, 0);
      G.Geo.colorize(cush, (x, y, z) => new THREE.Color(Math.hypot(x, z) > 0.86 ? 0xffd23f : (Math.floor((Math.atan2(z, x) + PI) / TAU * 8) % 2 ? 0xff8fb0 : 0xff6f9a)));
      kit.addRaw(cush);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, f = P.cone(0.22, 1.1, 5); f.scale(1, 1, 0.35); kit.add(f, i % 2 ? 0x3fae7a : 0x6fd49a, Math.cos(a) * 1.15, 0.45, Math.sin(a) * 1.15, Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5); }
      kit.glow(P.tor(0.62, 0.07, 4, 16), 0x7af0ff, 0, 0.6, 0, PI / 2, 0, 0);
      const d = kit.data();
      const pts = spots.map(s => ({ x: s.x, y: s.h - 0.05, z: s.z, s: 1, ry: rnd() * TAU }));
      for (const s of spots) { M.pads.push({ x: s.x, z: s.z, y: s.h + 0.42, sq: 0, i: M.pads.length }); piece(s.x, s.z, 1.4, 'kelp'); shadow(s.x, s.z, 1.5, 0.3); }
      if (pts.length) {
        M.padSolid = G.Geo.instancedAt(d.solid, G.M.vc({ rimStr: 0.4, spec: 0.5 }), pts); M.padSolid.name = 'kelpPads';
        M.padGlow = G.Geo.instancedAt(d.glow, G.Geo.glowMat(), pts); M.padGlow.name = 'kelpGlow';
        M.padSolid.instanceMatrix.setUsage(THREE.DynamicDrawUsage); M.padGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        world.add(M.padSolid); world.add(M.padGlow);
        M.padPts = pts;
      }
    }
    // ================================================================ Peach Mesas
    function mesasMech() {
      // tumble-rock chutes: a lane that runs through a camp, downhill where it can, clear of every prop
      for (const cp of camps) {
        if (M.chutes.length >= 3) break;
        let best = null, bs = -1e9;
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * TAU, dx = Math.cos(a), dz = Math.sin(a);
          const sx = cp.x + dx * 21, sz = cp.z + dz * 21, ex = cp.x - dx * 12, ez = cp.z - dz * 12;
          const hs = hf(sx, sz), he = hf(ex, ez);
          if (hs < 1.3 || he < 1.3) continue;
          let ok = true;
          for (let t = 0; t <= 33 && ok; t += 1.5) {
            const x = sx - dx * t, z = sz - dz * t, h = hf(x, z);
            if (h < 1.0 || !clear(x, z, 0.95, h)) ok = false;
            if (Math.hypot(x - c.sp.x, z - c.sp.z) < 14) ok = false;
          }
          if (!ok || !c.free(sx, sz, 2.2)) continue;
          const sc = hs - he + rnd() * 0.3;
          if (sc > bs) { bs = sc; best = { sx, sz, ex, ez, dx: -dx, dz: -dz, len: 33 }; }
        }
        if (!best) continue;
        const ch = Object.assign(best, { y: hf(best.sx, best.sz), t: 4 + rnd() * 4, warn: 0, live: 0, cx: cp.x, cz: cp.z });
        M.chutes.push(ch);
        piece(best.sx, best.sz, 2.2, 'chute'); c.addPoi({ x: best.sx, z: best.sz }, 2.4, 'chute');
        for (let t = 4; t < best.len; t += 4) c.addPoi({ x: best.sx + best.dx * t, z: best.sz + best.dz * t }, 1.4, 'lane');   // (keeps trees off the lane)
        // the chute: two banded boulders and a lintel slab framing the lane, facing down it
        const ry = Math.atan2(best.dx, best.dz);
        c.place(rockArch(B), best.sx, ch.y - 0.15, best.sz, ry);
      }
      // the rolling rocks themselves: a few pooled meshes per chute, built now (no construction mid-play)
      M.rockGeo = G.Geo.rockGeo(0.95, 77, B.dress.rockPal || 'sand', 2);
      M.rockMat = G.M.vc({ rimStr: 0.4 });
      M.rockPool = [];
      for (let i = 0; i < M.chutes.length * 2; i++) { const m = new THREE.Mesh(M.rockGeo, M.rockMat); m.visible = false; m.position.set(0, -200, 0); m.name = 'tumbleRock'; world.add(m); M.rockPool.push(m); }
    }
    // ================================================================ Glowcap Grotto
    function grottoMech() {
      // dim zones: on 2-3 camps (never the one nearest the landing pad) — or, in "Lights Out" style rescues, on the
      // two cages farthest from it
      const cages = (isl.sites.cages || []).slice();
      const list = [];
      if (c.mission && c.mission.type === 'rescue' && cages.length >= 3) {
        cages.sort((a, b) => Math.hypot(b.x - c.sp.x, b.z - c.sp.z) - Math.hypot(a.x - c.sp.x, a.z - c.sp.z));
        for (const cg of cages.slice(0, 2)) list.push({ x: cg.x, z: cg.z, R: 9, cage: cg });
      } else {
        // (an island whose layout found only 2 camps dims both: the region challenge — and the Mission Board line,
        // which cannot see the layout — asks for 2 lit camps, 21c CHAL / 21e CHAL_N)
        const byD = camps.slice().sort((a, b) => Math.hypot(a.x - c.sp.x, a.z - c.sp.z) - Math.hypot(b.x - c.sp.x, b.z - c.sp.z));
        for (const cp of byD.slice(camps.length >= 3 ? 1 : 0, camps.length >= 7 ? 4 : 3)) list.push({ x: cp.x, z: cp.z, R: 11.5, camp: cp });
      }
      const P = G.Geo.P;
      // spore pod: a curled stalk with a big glowing bulb (instanced: stalks + bulbs, 2 draw calls for all pods)
      const sk = new G.Geo.Kit();
      sk.add(tubeG(0, 0, 0, 0.15, 1.1, 0, 0.09, 0.07, 6), 0x3aa58a); sk.add(tubeG(0.15, 1.1, 0, 0.0, 1.75, 0, 0.07, 0.06, 6), 0x3aa58a);
      sk.add(P.sph(0.26, 8, 5), 0x2f6e6a, 0, 0.05, 0, 0, 0, 0, 1.4, 0.45, 1.4);
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const f = P.cone(0.12, 0.5, 5); f.scale(1, 1, 0.4); sk.add(f, 0x4ac8a0, Math.cos(a) * 0.18, 0.2, Math.sin(a) * 0.18, Math.sin(a) * 0.6, -a, -Math.cos(a) * 0.6); }
      const bk = new G.Geo.Kit();
      bk.glow(P.sph(0.42, 12, 9), 0x9ffcff, 0, 2.15, 0); bk.glow(P.sph(0.2, 8, 6), 0xffffff, 0.12, 2.25, 0.12);
      const podPts = [], eyePts = [];
      for (const z of list) {
        const h = hf(z.x, z.z);
        const zone = { x: z.x, z: z.z, R: z.R, y: h, lit: false, litT: 0, inT: 0, camp: z.camp || null, cage: z.cage || null, pods: [], eyes: [] };
        if (zone.camp) zone.camp.dim = zone;
        if (zone.cage) zone.cage.dim = zone;
        // the gloom dome: a low violet hemisphere, denser at its foot (vertex alpha), drawn from inside as well; its foot
        // ring glows a lighter violet so the zone's edge reads as a shape, not a hole in the ground
        const g = new THREE.SphereGeometry(z.R, 22, 7, 0, TAU, 0, PI / 2); g.deleteAttribute('uv'); g.scale(1, 0.62, 1);
        const p = g.attributes.position, cl = new Float32Array(p.count * 4), c0 = new THREE.Color(0x1a1250), c1 = new THREE.Color(0x3a2c88), cr = new THREE.Color(0x7a5cf0), cc = new THREE.Color();
        for (let k = 0; k < p.count; k++) {
          const t = p.getY(k) / (z.R * 0.62), rim = t < 0.01;
          if (rim) cc.copy(cr); else cc.copy(c0).lerp(c1, t);
          cl[k * 4] = cc.r; cl[k * 4 + 1] = cc.g; cl[k * 4 + 2] = cc.b; cl[k * 4 + 3] = rim ? 0.72 : 0.6 - 0.34 * t;
        }
        g.setAttribute('color', new THREE.BufferAttribute(cl, 4));
        // (forceSinglePass: three otherwise draws a transparent double-sided material in two passes, flipping its side —
        // and re-evaluating its program — twice every frame)
        const dm = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }));
        dm.position.set(z.x, h - 0.6, z.z); dm.renderOrder = 6; dm.name = 'gloomDome'; world.add(dm);
        zone.dome = dm;
        // three spore pods around the dome's rim, facing out
        for (let i = 0; i < 3; i++) {
          let ok = null;
          for (let t = 0; t < 10 && !ok; t++) { const a = (i / 3) * TAU + rnd() * 0.8, x = z.x + Math.cos(a) * (z.R + 1.2), zz = z.z + Math.sin(a) * (z.R + 1.2), hh = hf(x, zz); if (hh > 1 && clear(x, zz, 0.6, hh)) ok = { x, z: zz, y: hh }; }
          if (!ok) continue;
          const pod = { x: ok.x, z: ok.z, y: ok.y, i: podPts.length, zone, popped: false };
          zone.pods.push(pod); podPts.push({ x: ok.x, y: ok.y - 0.04, z: ok.z, s: 1, ry: rnd() * TAU });
          piece(ok.x, ok.z, 0.8, 'spore');
        }
        piece(z.x, z.z, z.R, 'dim');
        M.zones.push(zone);
      }
      if (podPts.length) {
        const ds = sk.data(), db = bk.data();
        M.podSolid = G.Geo.instancedAt(ds.solid, G.M.vc({ rimStr: 0.4 }), podPts); M.podSolid.name = 'sporeStalks';
        M.podGlow = G.Geo.instancedAt(db.glow, G.Geo.glowMat(), podPts); M.podGlow.name = 'sporeBulbs';
        M.podGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage); M.podSolid.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        world.add(M.podSolid); world.add(M.podGlow); M.podPts = podPts;
      }
      // peeking eyes (filled in by the mode from the parked robots of each dim camp): one instanced pair mesh
      const ek = new G.Geo.Kit();
      for (const sx of [-0.13, 0.13]) { ek.glow(P.sph(0.1, 8, 6), 0xe8ffff, sx, 0, 0); ek.glow(P.sph(0.05, 6, 4), 0x2a7a8a, sx, 0, 0.07); }
      M.eyeGeo = ek.data().glow;
      M.eyeCap = 40;
      M.eyes = new THREE.InstancedMesh(M.eyeGeo, G.M.inst ? G.M.inst(G.Geo.glowMat(), false) : G.Geo.glowMat(), M.eyeCap);
      M.eyes.count = 0; M.eyes.name = 'dimEyes'; M.eyes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); M.eyes.frustumCulled = false; M.eyes.renderOrder = 7;
      // (one zero-size instance so the load warm-up compiles it)
      _mm.makeScale(0, 0, 0); M.eyes.setMatrixAt(0, _mm); M.eyes.count = 1;
      world.add(M.eyes);
      // the light a lit zone keeps: a glow sprite per zone (hidden until lit)
      for (const z of M.zones) { const sp = G.R.glowSprite(0xbff8ff, 7, 0.55); sp.position.set(z.x, z.y + 3.2, z.z); sp.visible = false; world.add(sp); z.lamp = sp; }
    }
    // ================================================================ Frostfizz Bluffs
    function frostMech() {
      const geos = [], P = G.Geo.P;
      const addPatch = (x, z, R0) => {
        const h = hf(x, z), radii = [];
        for (let i = 0; i < 24; i++) radii.push(R0 * (0.82 + 0.3 * (0.5 + 0.5 * Math.sin(i * 1.7 + rnd() * 2))));
        const patch = { x, z, y: h, radii, R: R0 * 1.15 };
        M.ice.push(patch); piece(x, z, R0, 'ice');
        // a draped glossy sheet: pale centre, bluer rim, a few bright crack streaks
        const pos = [], col = [], idx = [], rings = [0, 0.45, 0.8, 1];
        const cA = new THREE.Color(0xc6ecff), cB = new THREE.Color(0x8fd2fa), cC = new THREE.Color(0x5fb4ee), crack = new THREE.Color(0xffffff);
        pos.push(x, hf(x, z) + 0.05, z); col.push(cA.r, cA.g, cA.b);
        for (let r = 1; r < rings.length; r++) for (let i = 0; i < 24; i++) {
          const a = i / 24 * TAU, rr = radii[i] * rings[r], px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
          pos.push(px, hf(px, pz) + 0.05, pz);
          const cc = (r === 3 ? cC : r === 2 ? cB : cA).clone(); if ((i * 7 + r * 3) % 9 === 0 && r < 3) cc.lerp(crack, 0.7);
          col.push(cc.r, cc.g, cc.b);
        }
        for (let i = 0; i < 24; i++) idx.push(0, 1 + (i + 1) % 24, 1 + i);
        for (let r = 1; r < rings.length - 1; r++) { const r0 = 1 + (r - 1) * 24, r1 = r0 + 24; for (let i = 0; i < 24; i++) { const i1 = (i + 1) % 24; idx.push(r0 + i, r0 + i1, r1 + i1, r0 + i, r1 + i1, r1 + i); } }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
        const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        geos.push(g);
      };
      // a patch in (or right beside) the middle of the first camps, and two on flat stretches of path
      for (let i = 0; i < Math.min(4, camps.length); i++) {
        const cp = camps[i], a = rnd() * TAU, x = cp.x + Math.cos(a) * 2, z = cp.z + Math.sin(a) * 2;
        if (hf(x, z) > 1.2) addPatch(x, z, 4.6 + rnd() * 1.2);
      }
      let n = 0;
      for (const sg of c.segs) {
        if (n >= 2) break;
        if (rnd() > 0.1) continue;
        const x = sg.bx, z = sg.bz, h = hf(x, z);
        if (h < 1.4 || !flatAt(x, z, 4) || Math.hypot(x - c.sp.x, z - c.sp.z) < 20) continue;
        let bad = false; for (const p of M.pieces) if (Math.hypot(p.x - x, p.z - z) < p.r + 6) { bad = true; break; }
        if (bad) continue;
        addPatch(x, z, 4.2 + rnd()); n++; c.addPoi({ x, z }, 4.6, 'ice');
      }
      if (geos.length) {
        const mat = G.M.toonUnique(0xffffff, { vc: true, spec: 0.9, rimStr: 0.5 });
        mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1;
        const mesh = new THREE.Mesh(G.Geo.merge(geos), mat);
        mesh.name = 'icePatches'; mesh.renderOrder = 1; world.add(mesh); M.iceMesh = mesh;
      }
      // frost crystals: two at each of the first camps (inside the fight), one instanced cluster mesh
      const cols = B.dress.crystalColors || [0xff9de2, 0x9fe8ff];
      const pts = [];
      for (let i = 0; i < Math.min(4, camps.length); i++) for (let j = 0; j < 2; j++) {
        const s = ringSpot(camps[i], 3.5, 5.2, 0.9, 30); if (!s) continue;
        const cr = { x: s.x, z: s.z, y: s.h, i: pts.length, alive: true };
        M.crystals.push(cr); piece(s.x, s.z, 0.9, 'crystal');
        pts.push({ x: s.x, y: s.h - 0.1, z: s.z, s: 1.55, ry: rnd() * TAU, color: cols[(i + j) % cols.length] });
      }
      if (pts.length) {
        const geo = G.Geo.crystalGeo(41, 0xffffff);
        M.crysMesh = G.Geo.instancedAt(geo, G.M.vc({ spec: 0.85, rimStr: 0.6, emissive: 0x6a4aa0, ei: 0.25 }), pts);
        M.crysMesh.name = 'frostCrystals'; M.crysMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(M.crysMesh); M.crysPts = pts;
        for (const p of pts) shadow(p.x, p.z, 1.1, 0.3);
      }
    }
    // ================================================================ Junkyard Rim
    function junkMech() {
      const P = G.Geo.P;
      const tex = beltTex();
      const beltGeos = [];
      // a belt: frame + rails baked, the moving chevron surface one shared mesh; a magnet crane at its downstream end
      const addBelt = (x0, z0, x1, z1, withCrane) => {
        const L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, ddz = (z1 - z0) / L, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        const W = 2.6, y = Math.max(hf(x0, z0), hf(x1, z1), hf(mx, mz)) + 0.02, top = y + 0.28;
        const ry = Math.atan2(dx, ddz);
        const belt = { x0, z0, x1, z1, dx, dz: ddz, L, W, top, mx, mz, speed: 3.2, crane: null };
        M.belts.push(belt); piece(mx, mz, L / 2 + 1, 'belt');
        c.addPoi({ x: mx, z: mz }, L / 2 + 1.2, 'belt');
        // frame (baked): side rails, rollers, legs; the walkable top is a box collider
        const k = new G.Geo.Kit();
        for (const sx of [-1, 1]) {
          k.add(P.rbox(0.2, 0.42, L + 0.4, 0.06, 1), 0xff8a4c, sx * (W / 2 + 0.1), 0.2, 0);
          for (let i = 0; i <= Math.round(L / 1.6); i++) k.add(P.cyl(0.12, 0.12, 0.06, 8), 0xd8dcef, sx * (W / 2 + 0.22), 0.2, -L / 2 + i * L / Math.round(L / 1.6), 0, 0, PI / 2);
        }
        // the housing reaches down to the lowest ground under the frame: on a slope one end used to float up to ~1 m
        // in the air (open underneath); the collider follows it, so nothing walks under a belt end
        let lo = y;
        for (const u of [-0.5, 0, 0.5]) for (const v of [-0.5, 0.5]) lo = Math.min(lo, hf(mx + dx * L * u - ddz * W * v, mz + ddz * L * u + dx * W * v));
        const skirt = Math.max(0, y - lo) + 0.12;
        k.add(P.box(W, 0.24 + skirt, L), 0x2a2f5a, 0, 0.24 - (0.24 + skirt) / 2, 0);
        if (skirt > 0.3) for (const sx of [-1, 1]) for (const ez of [-L / 2 + 0.6, L / 2 - 0.6]) k.add(P.box(0.18, skirt, 0.18), 0xff8a4c, sx * (W / 2 + 0.02), -skirt / 2, ez);
        for (const ez of [-L / 2 - 0.15, L / 2 + 0.15]) k.add(P.cyl(0.16, 0.16, W, 10), 0x5b5f8f, 0, 0.18, ez, 0, 0, PI / 2);
        c.place({ mesh: inst(k), colliders: [], anchors: {} }, mx, y, mz, ry);
        // the walkable top: vertical cylinders laid inside the frame's footprint (phys boxes are axis-aligned — the old
        // box collider of a belt at an angle became its whole bounding square, an invisible 0.3-1 m ledge up to 3 m
        // beside the belt): a row down the middle plus a small one in each corner, none reaching past the frame
        const rr = W / 2 - 0.05, rc = 0.62, y0 = lo - 0.1, uEnd = L / 2 - rr, nMid = Math.max(1, Math.ceil((2 * uEnd) / 1.0));
        for (let i = 0; i <= nMid; i++) { const u = -uEnd + (2 * uEnd * i) / nMid; world.phys.addCyl(mx + dx * u, mz + ddz * u, rr, y0, top, 'belt'); }
        for (const su of [-1, 1]) for (const sv of [-1, 1]) { const u = su * (L / 2 - rc), v = sv * (W / 2 - rc); world.phys.addCyl(mx + dx * u - ddz * v, mz + ddz * u + dx * v, rc, y0, top, 'belt'); }
        // chevron surface (UV v runs along the belt, 1 unit = 1 m)
        const g = new THREE.PlaneGeometry(W - 0.1, L, 1, 1); g.rotateX(-PI / 2);
        const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * L / 2.6);
        g.rotateY(ry); g.translate(mx, top + 0.01, mz); beltGeos.push(g);
        if (withCrane) belt.crane = addCrane(belt);
        return belt;
      };
      // tol: how far the ground under the belt may dip from its middle (a flatter spot first: the frame's side then stays
      // a step a robot or player walks up — 0.45 m — instead of a ledge to jump)
      const tryBeltAt = (cx, cz, along, tol) => {
        for (let t = 0; t < 14; t++) {
          const a = along != null ? along + (t ? (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.12 : 0) : rnd() * TAU;
          const L = 9;
          const x0 = cx - Math.cos(a) * L / 2, z0 = cz - Math.sin(a) * L / 2, x1 = cx + Math.cos(a) * L / 2, z1 = cz + Math.sin(a) * L / 2;
          let ok = true;
          for (let s = 0; s <= 1.0001 && ok; s += 0.125) { const x = x0 + (x1 - x0) * s, z = z0 + (z1 - z0) * s, h = hf(x, z); if (h < 1.1 || !clear(x, z, 1.5, h) || Math.abs(h - hf(cx, cz)) > (tol || 0.7)) ok = false; }
          if (!ok) continue;
          let bad = false; for (const p of M.pieces) if (Math.hypot(p.x - cx, p.z - cz) < p.r + L / 2 + 1) { bad = true; break; }
          if (bad) continue;
          return [x0, z0, x1, z1];
        }
        return null;
      };
      // escort ("Conveyor Chaos"): two belts lie on the cart road (they speed the cart along) — then one per camp
      if (isl.road && c.mission && c.mission.type === 'escort') {
        const road = isl.road; let placed = 0;
        for (let i = 2; i < road.length - 2 && placed < 2; i += 3) {
          const a = road[i], b = road[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 6) continue;
          const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, ang = Math.atan2(b.z - a.z, b.x - a.x);
          const x0 = mx - Math.cos(ang) * 4.5, z0 = mz - Math.sin(ang) * 4.5, x1 = mx + Math.cos(ang) * 4.5, z1 = mz + Math.sin(ang) * 4.5;
          if (hf(x0, z0) < 1.1 || hf(x1, z1) < 1.1 || Math.abs(hf(x0, z0) - hf(x1, z1)) > 1.2) continue;
          addBelt(x0, z0, x1, z1, false).road = true; placed++;
        }
      }
      for (const cp of camps) {
        if (M.belts.filter(b => !b.road).length >= 3) break;
        // the belt runs from outside the camp toward its middle; the crane's ring sits at the belt's inner end
        const a0 = rnd() * TAU, cx = cp.x + Math.cos(a0) * 9.5, cz = cp.z + Math.sin(a0) * 9.5;
        const al = Math.atan2(cp.z - cz, cp.x - cx);
        const r = tryBeltAt(cx, cz, al, 0.12) || tryBeltAt(cx, cz, al, 0.3) || tryBeltAt(cx, cz, al, 0.7);
        if (r) addBelt(r[0], r[1], r[2], r[3], true);
      }
      if (beltGeos.length) {
        const mesh = new THREE.Mesh(G.Geo.merge(beltGeos), new THREE.MeshBasicMaterial({ map: tex, color: 0xd8d8e8 }));
        mesh.name = 'beltSurface'; world.add(mesh); M.beltMesh = mesh; M.beltTex = tex;
      }
      if (M.cranes.length) {
        const db = buttonKit();
        M.btnMesh = new THREE.InstancedMesh(db.glow, G.M.inst ? G.M.inst(G.Geo.glowMat(), true) : G.Geo.glowMat(), M.cranes.length);
        M.cranes.forEach((cr, i) => { _mm.makeTranslation(cr.bx, cr.by, cr.bz); M.btnMesh.setMatrixAt(i, _mm); M.btnMesh.setColorAt(i, new THREE.Color(0x8bea4a)); });
        M.btnMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); M.btnMesh.instanceMatrix.needsUpdate = true; M.btnMesh.computeBoundingSphere(); M.btnMesh.name = 'craneButtons'; world.add(M.btnMesh);
      }
      function addCrane(belt) {
        // ring at the belt's downstream end (+1.5 m past it); tower to the side; the jib reaches over the ring
        const zx = belt.x1 + belt.dx * 2.2, zz = belt.z1 + belt.dz * 2.2, zy = hf(zx, zz);
        // the tower goes to whichever side of the ring is clear of the camp kit (and the button post beside it)
        let tx = 0, tz = 0, found = false;
        const s0 = rnd() < 0.5 ? -1 : 1;
        for (const side of [s0, -s0]) for (const d of [4.6, 5.2, 4.2]) {
          if (found) break;
          const nx = -belt.dz * side, nz = belt.dx * side, x = zx + nx * d, z = zz + nz * d, h = hf(x, z);
          const bx = x + (zx - x) * 0.3 + belt.dx * 1.2, bz = z + (zz - z) * 0.3 + belt.dz * 1.2;
          if (h < 1.0 || !clear(x, z, 1.5, h) || !clear(bx, bz, 0.6, hf(bx, bz)) || Math.abs(h - zy) > 1.5) continue;
          let bad = false; for (const p of M.pieces) if (p.kind !== 'belt' && Math.hypot(p.x - x, p.z - z) < p.r + 2) { bad = true; break; }
          if (!bad) { tx = x; tz = z; found = true; }
        }
        if (!found) return null;
        const ty = hf(tx, tz);
        const ry = Math.atan2(zx - tx, zz - tz);
        c.place(craneTower(), tx, ty - 0.1, tz, ry);
        piece(tx, tz, 1.8, 'crane'); c.addPoi({ x: tx, z: tz }, 2, 'crane');
        const H = 7.6;
        const head = magnetHead(); head.position.set(zx, ty + H - 1.2, zz); world.add(head);
        const cable = new THREE.Mesh(cableGeo(), G.M.toon(0x1f2a5a)); cable.position.set(zx, ty + H, zz); world.add(cable);
        // the button post beside the tower, facing the ring
        const bx = tx + (zx - tx) * 0.3 + belt.dx * 1.2, bz = tz + (zz - tz) * 0.3 + belt.dz * 1.2, by = hf(bx, bz);
        c.place(buttonPost(), bx, by - 0.05, bz, Math.atan2(zx - bx, zz - bz));
        const cr = { x: zx, z: zz, y: zy, r: 4.0, top: ty + H, head, cable, hy: ty + H - 1.2, restY: ty + H - 1.2, bx, by: by + 1.35, bz, ry, state: 'ready', t: 0, cd: 0, grabbed: [], i: M.cranes.length, belt };
        M.cranes.push(cr);
        // a yellow-and-navy ring painted on the ground (part of the shadow mesh pass: drawn as a thin flat torus)
        ringGeoAt(zx, zy, zz, cr.r);
        // a metal crate waiting in the ring (one: robots are the crane's main catch, and an awake crate costs ~1k
        // triangles; the rng draws of a second one stay, so the rest of the island lands where it did)
        // (review: never on the tower's foot or the button post — a crate within 2.6 m of the tower or 1.4 m of the post
        // is mirrored to the far side of the ring; the same rng draws, so the rest of the island lands where it did)
        {
          const a = rnd() * TAU, d = 1.2 + rnd() * 1.6; rnd(); rnd();
          let qx = zx + Math.cos(a) * d, qz = zz + Math.sin(a) * d;
          if (Math.hypot(qx - tx, qz - tz) < 2.6 || Math.hypot(qx - bx, qz - bz) < 1.4) { qx = zx - Math.cos(a) * d; qz = zz - Math.sin(a) * d; }
          M.crates.push({ pos: new V3(qx, 0, qz), kind: 'metal' });
        }
        return cr;
      }
      function ringGeoAt(x, y, z, r) {
        const g = new THREE.RingGeometry(r - 0.22, r, 36, 1); g.rotateX(-PI / 2);
        const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hf(x + p.getX(i), z + p.getZ(i)) - y + 0.07);
        G.Geo.colorize(g, (px, py, pz) => new THREE.Color(Math.floor((Math.atan2(pz, px) + PI) / TAU * 18) % 2 ? 0xffd23f : 0x2a2f5a));
        g.translate(x, y, z);
        (M.ringGeos || (M.ringGeos = [])).push(g);
      }
      if (M.ringGeos) { const rmat = G.M.toonUnique(0xffffff, { vc: true }); rmat.polygonOffset = true; rmat.polygonOffsetFactor = -1; rmat.polygonOffsetUnits = -1; const rm = new THREE.Mesh(G.Geo.merge(M.ringGeos), rmat); rm.name = 'craneRings'; world.add(rm); }
    }
  }
  // ---- small art for the mechanics (cached, vertex colours, front +Z)
  function inst(k) { const d = k.data(); const m = new THREE.Mesh(d.solid, G.M.vc({ rimStr: 0.4 })); if (d.metal) m.add(new THREE.Mesh(d.metal, G.Geo.metalMat())); if (d.glow) { const gm = new THREE.Mesh(d.glow, G.Geo.glowMat()); gm.userData.glow = true; m.add(gm); } return m; }
  function rockArch(B) {
    return X.kitCached('exp-mech-arch|' + B.id, k => {
      const P = G.Geo.P, pal = B.dress.rockPal || 'sand';
      for (const sx of [-1.6, 1.6]) k.add(G.Geo.rockGeo(1.3, sx > 0 ? 81 : 82, pal, 1), null, sx, 0.6, 0, 0, sx, 0, 1, 1.5, 1);
      const slab = P.rbox(4.6, 0.7, 1.4, 0.25, 1); k.add(slab, (x, y, z) => new THREE.Color(Math.floor((y + 2.6) * 3) % 2 ? 0xe88a5a : 0xf2b98a), 0, 2.75, 0, 0, 0, 0.06);
      k.add(P.cone(0.55, 0.9, 6), 0xffd23f, -1.7, 3.2, 0.3);
      k.cyl(-1.6, 0, 1.0, 0, 2.6); k.cyl(1.6, 0, 1.0, 0, 2.6);
    });
  }
  function craneTower() {
    return X.kitCached('exp-mech-crane', k => {
      const P = G.Geo.P, yel = 0xffd23f, H = 7.6, s = 0.6;
      k.add(P.rbox(2.4, 0.6, 2.4, 0.12, 1), (x, y, z) => new THREE.Color(Math.floor((x + z) * 1.6) % 2 ? 0xffd23f : 0x2a2f5a), 0, 0.3, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.metal(P.box(0.18, H, 0.18), yel, sx * s, H / 2 + 0.6, sz * s);
      for (let lv = 0; lv < 4; lv++) for (let f = 0; f < 4; f++) { const a = f * PI / 2; k.metal(P.box(0.07, 1.9, 0.07), 0xe0b830, Math.sin(a) * s, 1.6 + lv * 1.6, Math.cos(a) * s, 0, a, (lv % 2 ? 1 : -1) * 0.66); }
      k.add(P.rbox(1.6, 1.3, 1.6, 0.25, 1), 0xff8a4c, 0, H + 1.2, -0.2);
      k.glow(P.rbox(1.2, 0.55, 0.06, 0.08, 1), 0x9ff0ff, 0, H + 1.35, 0.62);
      for (const sx of [-0.3, 0.3]) k.metal(P.box(0.12, 0.12, 6.2), yel, sx, H + 2.0, 2.3);
      for (let i = 0; i < 6; i++) k.metal(P.box(0.05, 0.05, 0.7), 0xe0b830, 0, H + 2.0, -0.4 + i * 1.1, 0, PI / 2, 0);
      k.add(P.rbox(1.2, 1.0, 1.0, 0.2, 1), 0x8a8aa8, 0, H + 1.8, -1.9);
      k.cyl(0, 0, 1.1, 0, H + 2.2);
    });
  }
  function buttonPost() {
    return X.kitCached('exp-mech-btnpost', k => {
      const P = G.Geo.P;
      k.add(P.cyl(0.12, 0.15, 1.2, 8), 0x2a2f5a, 0, 0.6, 0);
      k.add(P.rbox(0.7, 0.5, 0.5, 0.1, 1), 0xffd23f, 0, 1.25, 0);
      k.add(P.cyl(0.3, 0.3, 0.1, 12), 0x2a2f5a, 0, 1.35, 0.26, PI / 2, 0, 0);
      k.cyl(0, 0, 0.3, 0, 1.5);
    });
  }
  function buttonKit() { const k = new G.Geo.Kit(); k.glow(G.Geo.P.sph(0.24, 10, 7), 0xffffff, 0, 0, 0, 0, 0, 0, 1, 0.75, 1); return k.data(); }
  let _magGeo = null, _cableGeo = null;
  function magnetHead() {
    if (!_magGeo) {
      const k = new G.Geo.Kit(), P = G.Geo.P;
      k.add(P.tor(0.85, 0.3, 6, 10, PI), 0xff4d5e, 0, 0, 0, PI, 0, 0);
      for (const sx of [-1, 1]) k.metal(P.rbox(0.66, 0.42, 0.66, 0.08, 1), 0xe8eefc, sx * 0.85, -0.12, 0);
      k.add(P.rbox(0.9, 0.35, 0.5, 0.1, 1), 0x2a2f5a, 0, 0.95, 0);
      k.glow(P.tor(0.85, 0.06, 3, 10, PI), 0xfff2a0, 0, 0, 0.32, PI, 0, 0);
      _magGeo = k.data(); _magGeo.solid.userData.shared = true; if (_magGeo.metal) _magGeo.metal.userData.shared = true; _magGeo.glow.userData.shared = true;
    }
    const m = new THREE.Mesh(_magGeo.solid, G.M.vc({ rimStr: 0.45, spec: 0.5 }));
    if (_magGeo.metal) m.add(new THREE.Mesh(_magGeo.metal, G.Geo.metalMat()));
    const gm = new THREE.Mesh(_magGeo.glow, G.Geo.glowMat()); gm.visible = false; m.add(gm); m.userData.glow = gm;
    m.name = 'magnet';
    return m;
  }
  function cableGeo() { if (!_cableGeo) { _cableGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 5, 1, true); _cableGeo.translate(0, -0.5, 0); _cableGeo.userData.shared = true; } return _cableGeo; }
  let _beltTex = null;
  function beltTex() {
    if (_beltTex) return _beltTex;
    _beltTex = G.R.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#2a2f5a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.moveTo(8, 44); g.lineTo(32, 20); g.lineTo(56, 44); g.lineTo(56, 56); g.lineTo(32, 32); g.lineTo(8, 56); g.closePath(); g.fill();
      g.fillStyle = '#3d4a8a'; g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
    });
    _beltTex.wrapS = _beltTex.wrapT = THREE.RepeatWrapping; _beltTex.userData.shared = true;
    return _beltTex;
  }
  // ---- landmark effects: the lighthouse's soft light cones (additive; alpha falls off toward the far end and toward the
  // silhouette edges, where the view grazes the cone), the Peach Gate's falling water (a scrolling streak texture, unlit:
  // it reads as bright water in every light) and the faint rainbow in its spray (additive vertex colours, fading at the
  // ends and edges)
  const BEAM_VS = 'varying float vT; varying vec3 vN; varying vec3 vV;\nvoid main(){ vT = uv.y; vec4 wp = modelMatrix * vec4(position, 1.0); vN = mat3(modelMatrix) * normal; vV = cameraPosition - wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }';
  const BEAM_FS = 'uniform vec3 uCol; uniform float uK; varying float vT; varying vec3 vN; varying vec3 vV;\nvoid main(){ float e = abs(dot(normalize(vN), normalize(vV))); float a = uK * pow(1.0 - vT, 1.7) * smoothstep(0.0, 0.05, vT) * e * e; gl_FragColor = vec4(uCol, a);\n#include <colorspace_fragment>\n}';
  function beamMat(col, k) {
    return new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(col) }, uK: { value: k } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, fog: false });
  }
  let _fallTex = null;
  function fallTex() {
    if (_fallTex) return _fallTex;
    _fallTex = G.R.canvasTex(64, 128, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, '#6fd8ec'); grd.addColorStop(0.18, '#a8f2fa'); grd.addColorStop(0.5, '#d4fcff'); grd.addColorStop(0.82, '#a8f2fa'); grd.addColorStop(1, '#6fd8ec');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      const r = G.rng(311);
      for (let i = 0; i < 30; i++) {
        const x = r() * w, y = r() * h, l = 16 + r() * 46, ww = 2 + r() * 5;
        g.fillStyle = r() < 0.72 ? 'rgba(255,255,255,0.9)' : 'rgba(64,190,226,0.55)';
        for (const oy of [0, -h, h]) { g.beginPath(); g.ellipse(x, y + oy, ww / 2, l / 2, 0, 0, TAU); g.fill(); }
      }
    });
    _fallTex.wrapS = _fallTex.wrapT = THREE.RepeatWrapping; _fallTex.userData.shared = true;
    return _fallTex;
  }
  function fallMat() { return new THREE.MeshBasicMaterial({ map: fallTex(), side: THREE.DoubleSide }); }
  function rainbowGeo(r, w) {
    const g = new THREE.RingGeometry(r, r + w, 40, 5, 0, PI); g.deleteAttribute('uv');
    // (RGBA vertex colours: the band hue, and an alpha that fades toward the inner / outer edge and both feet)
    const p = g.attributes.position, cols = [0x9a6aff, 0x4c8cff, 0x3cc8ff, 0x6ad87a, 0xffd84a, 0xff9a3a, 0xff4a6a], cl = new Float32Array(p.count * 4), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), t = clamp((Math.hypot(x, y) - r) / w, 0, 1), a = Math.atan2(y, x), f = t * (cols.length - 1), i0 = Math.floor(f), i1 = Math.min(cols.length - 1, i0 + 1);
      cc.setHex(cols[i0]).lerp(_t.setHex(cols[i1]), f - i0);
      const k = Math.pow(Math.sin(t * PI), 0.6) * sstep(0, 0.5, a) * sstep(0, 0.5, PI - a);
      cl[i * 4] = cc.r; cl[i * 4 + 1] = cc.g; cl[i * 4 + 2] = cc.b; cl[i * 4 + 3] = k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 4));
    return g;
  }

  // Updrafts beside the tall mesas (after the dressing: isl.mesas comes from it). The column: one additive shader mesh
  // for all of them (swirling warm bands, fading at the foot and the top). Additive blending already scales the colour
  // by alpha (SrcAlpha, One): the shader outputs the plain colour (pre-multiplying it as well left the column at a few
  // percent brightness, invisible against the desert by day).
  const DRAFT_VS = 'attribute vec3 aC; varying vec2 vUv; varying float vH; varying vec3 vWP; uniform float uTime;\nvoid main(){ vec3 p = position; vH = aC.z; float a = atan(p.z - aC.y, p.x - aC.x); vUv = vec2(a / 6.2831853, p.y); vec4 wp = modelMatrix * vec4(p, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }';
  const DRAFT_FS = 'uniform float uTime; uniform vec3 uCol; varying vec2 vUv; varying float vH; varying vec3 vWP;\nvoid main(){ float s = sin((vUv.x * 3.0 + vUv.y * 0.35 - uTime * 0.9) * 6.2831853) * 0.5 + 0.5; float b = smoothstep(0.55, 0.95, s); float fade = smoothstep(0.0, 0.08, vH) * (1.0 - smoothstep(0.75, 1.0, vH)); float d = length(cameraPosition - vWP); float near = smoothstep(1.2, 4.0, d) * (1.0 - smoothstep(70.0, 130.0, d)); float a = (0.06 + b * 0.3) * fade * near; gl_FragColor = vec4(uCol, a);\n#include <colorspace_fragment>\n}';
  function buildDrafts(world, isl, B, c, M) {
    const spots = [];
    const mesas = (isl.mesas || []).slice(0, 4);
    for (const e of mesas) {
      if (spots.length >= 4) break;
      const top = e.top + 2.6;
      let ok = null;
      for (let t = 0; t < 12 && !ok; t++) {
        const a = (e.pad ? Math.atan2(e.pad.z - e.z, e.pad.x - e.x) + PI * 0.65 : 0) + t * 0.52, d = e.rBase * 1.08 + 2.2;
        const x = e.x + Math.cos(a) * d, z = e.z + Math.sin(a) * d, h = c.hf(x, z);
        if (h < 1.0 || world.phys.groundAt(x, z, 1.5, h + 4) > h + 0.3 || c.pathAt(x, z) > 0.6) continue;
        let bad = false; for (const p of M.pieces) if (Math.hypot(p.x - x, p.z - z) < p.r + 2) { bad = true; break; }
        if (!bad) ok = { x, z, h, top };
      }
      if (ok) spots.push(ok);
    }
    // the reach mission's tallest mesa always gets one (a second way up to the Ribbon cache)
    const bm = isl.sites.bigMesa;
    if (bm && bm.top) {
      for (let t = 0; t < 16; t++) {
        const a = Math.atan2(bm.z, bm.x) + t * 0.4, d = 8.5 * 1.1 + 2.4, x = bm.x + Math.cos(a) * d, z = bm.z + Math.sin(a) * d, h = c.hf(x, z);
        if (h < 1.0 || world.phys.groundAt(x, z, 1.5, h + 4) > h + 0.3) continue;
        spots.push({ x, z, h, top: bm.top.y + 2.6 }); break;
      }
    }
    if (!spots.length) return;
    const geos = [];
    for (const s of spots) {
      const H = Math.max(6, s.top - s.h), R = 1.7;
      M.drafts.push({ x: s.x, z: s.z, y: s.h, top: s.h + H, r: R, inside: false, cd: 0 });
      M.pieces.push({ x: s.x, z: s.z, r: R, kind: 'updraft' });
      const g = new THREE.CylinderGeometry(R, R * 1.15, H, 14, 6, true); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.translate(s.x, s.h + H / 2, s.z);
      const p = g.attributes.position, ac = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { ac[i * 3] = s.x; ac[i * 3 + 1] = s.z; ac[i * 3 + 2] = (p.getY(i) - s.h) / H; }
      g.setAttribute('aC', new THREE.BufferAttribute(ac, 3));
      geos.push(g);
      // a glowing ring on the ground marks the foot
      const rg = new THREE.RingGeometry(R - 0.25, R + 0.15, 24, 1); rg.deleteAttribute('uv'); rg.deleteAttribute('normal'); rg.rotateX(-PI / 2); rg.translate(s.x, s.h + 0.08, s.z);
      const rp = rg.attributes.position, rc = new Float32Array(rp.count * 3); for (let i = 0; i < rp.count; i++) { rc[i * 3] = s.x; rc[i * 3 + 1] = s.z; rc[i * 3 + 2] = 0.3; }
      rg.setAttribute('aC', new THREE.BufferAttribute(rc, 3));
      geos.push(rg);
    }
    const merged = new THREE.BufferGeometry();
    { // (merge position + aC only)
      let nv = 0, ni = 0; for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
      const pos = new Float32Array(nv * 3), ac = new Float32Array(nv * 3), idx = new Uint32Array(ni); let vo = 0, io = 0;
      for (const g of geos) { pos.set(g.attributes.position.array, vo * 3); ac.set(g.attributes.aC.array, vo * 3); const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo; vo += g.attributes.position.count; io += ia.length; }
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('aC', new THREE.BufferAttribute(ac, 3)); merged.setIndex(new THREE.BufferAttribute(idx, 1)); merged.computeBoundingSphere();
    }
    const u = { uTime: G.R.light.uTime, uCol: { value: new THREE.Color(0xffd8a0) } };
    const mesh = new THREE.Mesh(merged, new THREE.ShaderMaterial({ uniforms: u, vertexShader: DRAFT_VS, fragmentShader: DRAFT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true }));
    mesh.name = 'updrafts'; mesh.renderOrder = 5; world.add(mesh); M.draftMesh = mesh;
  }

  // ---------------------------------------------------------------- mechanic actors (shootable pieces)
  // Hazard actors are team 1 so shots, splash and aim assist treat them like targets, but they are not robots: the
  // mode never counts them as pops (isHazard), quests skip them (noCount / noXP, as crates).
  class TumbleRock extends G.Actor {
    constructor(world, M, ch, mesh) {
      super(world, { r: 0.95, h: 1.9, team: 1, hp: 30, kind: 'hazard' });
      this.isHazard = true; this.noCount = true; this.noXP = true; this.mmColor = '#e88a5a';
      this.M = M; this.ch = ch; this.mesh = mesh; this.u = 0; this.sp = 1.5; this.spin = 0; this.hits = 0; this.dustT = 0;
      this.pos.set(ch.sx, ch.y + 0.95, ch.sz);
      mesh.visible = true; mesh.position.copy(this.pos);
      this.ax = new V3(ch.dz, 0, -ch.dx);   // rolling axis (perpendicular to the lane)
    }
    update(dt) {
      this.applyStatus(dt);
      if (!this.alive) return;
      const ch = this.ch, w = this.world;
      this.sp = Math.min(6.2, this.sp + 3.4 * dt);
      this.u += this.sp * dt;
      const x = ch.sx + ch.dx * this.u, z = ch.sz + ch.dz * this.u;
      this.pos.set(x, w.phys.terrain(x, z) + 0.95 + Math.abs(Math.sin(this.u * 1.3)) * 0.12, z);
      this.spin += this.sp * dt / 0.95;
      _mq.setFromAxisAngle(this.ax, this.spin); this.mesh.quaternion.copy(_mq); this.mesh.position.copy(this.pos);
      const pl = w.player;
      if (pl && this.pos.distanceToSquared(pl.pos) < 1600) { this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.12; w.fx.spawn(_mv.set(x - ch.dx * 0.8, this.pos.y - 0.8, z - ch.dz * 0.8), _mw.set((Math.random() - 0.5) * 1.2, 0.8, (Math.random() - 0.5) * 1.2), 0xf2d0a8, 0.4, 0.7, { grav: -0.2, drag: 1.5, alpha: 0.7 }); } }
      // something solid in the lane that came after it was laid out (a mission's cage or totem, a Field Board cart
      // road): the rock bursts against it instead of rolling through it — a totem takes the bonk
      if (this.u > 2.5 && w.phys.groundAt(x, z, 0.5, this.pos.y + 3) > w.phys.terrain(x, z) + 0.6) { this.crumble(false); return; }
      // bowls robots over (they take a big bonk); the player gets a small one and the rock crumbles
      const A = robotsOf(w);
      for (let i = 0; i < A.length; i++) {
        const a = A[i];
        if ((a.isTotem || a.kind === 'cart') && a.alive) {
          const tx = a.pos.x - x, tz = a.pos.z - z, rr = 0.95 + (a.r || 1);
          if (tx * tx + tz * tz < rr * rr) { if (a.isTotem) w.damage(a, 80, { src: pl || this, type: 'crush', pos: this.pos.clone() }); this.crumble(false); return; }
          continue;
        }
        if (!isBot(a) || a === this) continue;
        const dx = a.pos.x - x, dz = a.pos.z - z;
        if (dx * dx + dz * dz > (1.0 + a.r) * (1.0 + a.r) || a.pos.y > this.pos.y + 1.4) continue;
        if (a._rockHit === this) continue;
        a._rockHit = this;
        _mv.set(dx, 0.4, dz).normalize();
        w.damage(a, 80, { src: pl || this, type: 'crush', pos: this.pos.clone(), dir: _mv.clone(), knock: 7 });
        if (G.Audio) G.Audio.sfxAt('impact', this.pos, { mat: 'ground', pitch: 0.8 });
        this.M.emit('rockBonk', a);
        this.sp *= 0.7;
        if (++this.hits >= 3) { this.crumble(false); return; }
      }
      if (pl && pl.alive && pl.iframes <= 0) {
        const dx = pl.pos.x - x, dz = pl.pos.z - z;
        if (dx * dx + dz * dz < 1.45 * 1.45 && pl.pos.y < this.pos.y + 1.2 && pl.pos.y > this.pos.y - 2.2) {
          _mv.set(dx, 0.5, dz).normalize();
          w.damage(pl, 12, { src: this, type: 'crush', pos: this.pos.clone(), dir: _mv.clone(), knock: 6 });
          this.crumble(false); return;
        }
      }
      if (this.u >= ch.len) this.crumble(false);
    }
    crumble(shot) {
      if (this._gone) return;
      this._gone = true;
      const w = this.world, p = this.pos;
      w.fx.burst(p, [0xe88a5a, 0xf2b98a, 0xfbe2c0], 18, 5, 0.32, 0.7, { grav: 12 });
      w.fx.smoke(p, 4);
      if (G.Audio) G.Audio.sfxAt('crate', p, { pitch: 0.7 });
      if (shot) { w.pickups.boltBurst(_mv.copy(p), 4 + Math.floor(Math.random() * 3)); this.M.emit('rockSmash', this); }
      this.mesh.visible = false; this.mesh.position.set(0, -200, 0);
      this.M.rockPool.push(this.mesh);
      this.ch.live--;
      this.alive = false; this.dead = true;
    }
    onDeath() { this.crumble(true); }
    dispose() { /* the pooled mesh stays in the scene */ }
  }
  class MechTarget extends G.Actor {
    // a shootable, mesh-less piece (spore pod, frost crystal, crane button): onHit(src) decides what happens
    constructor(world, o) {
      super(world, { r: o.r, h: o.h, team: 1, hp: o.hp || 1, kind: 'hazard' });
      // (noAssist like crates: homing shots, chain zaps and helper bots go for robots, not for an invisible pod / button
      // — a crane button never breaks, so homing rockets kept curving into it)
      this.isHazard = true; this.noCount = true; this.noXP = true; this.immovable = true; this.mmColor = 'rgba(0,0,0,0)'; this.hidden = true; this.noAssist = true;
      this.pos.set(o.x, o.y, o.z); this.o = o; this.critY = null;
    }
    takeDamage(amount, info) {
      if (!this.alive || !(amount > 0)) return { dealt: -0, toShield: -0, killed: false };   // (doubles: 10_world dmgRes's shape)
      if (this.o.onHit) this.o.onHit(info);
      if (this.o.keep) return { dealt: -0, toShield: -0, killed: false };
      return super.takeDamage(amount, info);
    }
    onDeath(info) { if (this.o.onPop) this.o.onPop(info); this.dead = true; }
    update(dt) { this.applyStatus(dt); }
  }

  // ---------------------------------------------------------------- runtime (called by the mode)
  // X.mechStart(world, isl, s): actors for the shootable pieces, the eyes of each dim camp. Then mech.update(dt) every
  // frame before the world moves (bounces, lifts) and mech.late(dt) after it (ice, belts, crane holds).
  X.mechStart = function (world, isl) {
    const M = isl.mech; if (!M) return null;
    const pl = () => world.player;
    if (M.kind === 'grotto') {
      for (const z of M.zones) for (const pod of z.pods) {
        pod.actor = new MechTarget(world, { x: pod.x, y: pod.y + 1.6, z: pod.z, r: 0.62, h: 1.0, hp: 1, onPop: () => popSpore(M, world, pod) });
        world.addActor(pod.actor);
      }
    }
    if (M.kind === 'frost') {
      for (const cr of M.crystals) {
        cr.actor = new MechTarget(world, { x: cr.x, y: cr.y, z: cr.z, r: 0.85, h: 2.2, hp: 22, onPop: () => shatter(M, world, cr) });
        world.addActor(cr.actor);
      }
    }
    if (M.kind === 'junk') {
      for (const cr of M.cranes) {
        cr.actor = new MechTarget(world, { x: cr.bx, y: cr.by - 0.4, z: cr.bz, r: 0.5, h: 0.9, keep: true, onHit: info => { if (info && info.src && info.src.team === 1) return; craneGo(M, world, cr); } });
        world.addActor(cr.actor);
      }
    }
    M.update = dt => mechUpdate(M, world, pl(), dt);
    M.late = dt => mechLate(M, world, pl(), dt);
    return M;
  };
  function mechUpdate(M, world, pl, dt) {
    M.t += dt;
    if (!pl) return;
    const t = M.t;
    // ---- kelp pads: land on one (falling or standing) and it bounces you ~5.6 m up; the pad squashes
    for (let i = 0; i < M.pads.length; i++) {
      const p = M.pads[i];
      if (p.sq > 0) p.sq = Math.max(0, p.sq - dt * 3.2);
      if (!pl.alive) continue;
      const dx = pl.pos.x - p.x, dz = pl.pos.z - p.z;
      if (dx * dx + dz * dz > 1.35 * 1.35 || pl.pos.y - p.y > 0.8 || pl.pos.y - p.y < -0.9 || pl.vel.y > 1 || p.cd > t) continue;
      p.cd = t + 0.45; p.sq = 1;
      pl.vel.y = 15; pl.grounded = false; pl.coyote = 0; pl.jumps = 1; pl.jumpHeld = false; pl.dashT = 0; pl.sliding = 0; pl.mantling = null;
      kick(pl, 10);
      world.fx.ring(_mv.set(p.x, p.y + 0.1, p.z), 1.8, 0x7af0ff, 0.4);
      world.fx.burst(_mv.set(p.x, p.y + 0.3, p.z), [0xff8fb0, 0xffd23f, 0xffffff], 12, 5, 0.25, 0.5, { up: 3 });
      if (G.Audio) { G.Audio.sfx('bounce', { pitch: 1.25 }); G.Audio.sfx('boost', { pitch: 1.4 }); }
      M.emit('kelp', p);
    }
    if (M.padSolid) {
      let dirty = false;
      for (let i = 0; i < M.pads.length; i++) {
        const p = M.pads[i]; if (!(p.sq > 0) && !p.wasSq) continue;
        p.wasSq = p.sq > 0; dirty = true;
        const k = p.sq, sy = 1 - 0.45 * k * Math.sin(Math.min(1, (1 - k) * 3) * PI) + 0.25 * Math.max(0, Math.sin((1 - k) * PI * 2)) * k, sx = 1 + (1 - sy) * 0.5;
        const pt = M.padPts[i];
        _mq.setFromAxisAngle(AXIS_Y, pt.ry); _mm.compose(_mv.set(pt.x, pt.y, pt.z), _mq, _ms.set(sx, sy, sx));
        M.padSolid.setMatrixAt(i, _mm); M.padGlow.setMatrixAt(i, _mm);
      }
      if (dirty) { M.padSolid.instanceMatrix.needsUpdate = true; M.padGlow.instanceMatrix.needsUpdate = true; }
    }
    // ---- tide pools: grounded robots in a pool wade slowly (and splash)
    if (M.pools.length) {
      const A = robotsOf(world);
      for (let i = 0; i < A.length; i++) {
        const a = A[i]; if (!isBot(a) || a.fly) continue;
        for (let j = 0; j < M.pools.length; j++) {
          const p = M.pools[j], dx = a.pos.x - p.x, dz = a.pos.z - p.z;
          if (dx * dx + dz * dz > p.r * p.r || a.pos.y > p.y + 0.8) continue;
          a.slowT = Math.max(a.slowT || 0, 0.3); a.slowK = Math.min(a.slowK || 1, 0.45); a._wet = world.time;
          if (!a._splT || world.time - a._splT > 0.7) { a._splT = world.time; world.fx.ring(_mv.set(a.pos.x, p.y + 0.1, a.pos.z), 0.9, 0xe8ffff, 0.45); if (!a._wasWet && G.Audio) G.Audio.sfxAt('splat', a.pos, { pitch: 0.7 }); }
          a._wasWet = true;
          if (!M.poolSeen) { M.poolSeen = true; M.emit('pool', p); }
          break;
        }
      }
      if (pl.alive && pl.grounded) for (let j = 0; j < M.pools.length; j++) { const p = M.pools[j]; const dx = pl.pos.x - p.x, dz = pl.pos.z - p.z; if (dx * dx + dz * dz < p.r * p.r && (pl.vel.x * pl.vel.x + pl.vel.z * pl.vel.z) > 4 && Math.random() < dt * 8) world.fx.spawn(_mv.set(pl.pos.x, p.y + 0.1, pl.pos.z), _mw.set((Math.random() - 0.5) * 2, 2.2, (Math.random() - 0.5) * 2), 0xe8ffff, 0.12, 0.5, { grav: 9 }); }
    }
    // ---- updrafts: lift (net ~18 m/s² up to 11 m/s), a gentle pull to the middle, a double jump ready at the top
    for (let i = 0; i < M.drafts.length; i++) {
      const d = M.drafts[i];
      const dx = pl.pos.x - d.x, dz = pl.pos.z - d.z, inR = dx * dx + dz * dz < d.r * d.r;
      const inside = pl.alive && inR && pl.pos.y > d.y - 0.6 && pl.pos.y < d.top + 0.5;
      if (inside) {
        const toTop = d.top - pl.pos.y;
        if (toTop > 2.2) pl.vel.y = Math.min(11, pl.vel.y + 38 * dt);
        else pl.vel.y = U.damp(pl.vel.y, 2.4 + toTop * 0.8, 6, dt) + 27 * dt;   // (bob at the top; gravity is applied after)
        pl.vel.x -= dx * 2.2 * dt; pl.vel.z -= dz * 2.2 * dt;
        pl.grounded = false; pl.coyote = 0; if (pl.jumps > 1) pl.jumps = 1; pl.jumpHeld = false;
        if (Math.random() < dt * 10) world.fx.spawn(_mv.set(d.x + (Math.random() - 0.5) * 2.4, pl.pos.y - 1.5, d.z + (Math.random() - 0.5) * 2.4), _mw.set(0, 5, 0), 0xffe0b0, 0.14, 0.9, { grav: 0, drag: 0.5, alpha: 0.8 });
        if (!d.inside) {
          d.inside = true;
          if (!d.rode) { d.rode = true; M.emit('updraft', d); }   // (one ride per landing: a bob in and out counts once)
          if (G.Audio) G.Audio.sfx('whoosh', { pitch: 1.2 });
          kick(pl, 6);
        }
      } else {
        if (d.inside) { d.inside = false; if (pl.pos.y > d.top - 2) { pl.jumps = 1; if (G.Audio) G.Audio.sfx('boost', { pitch: 1.6 }); } }
        if (d.rode && !inR && pl.grounded) d.rode = false;   // (landed outside it: the next ride counts again)
      }
    }
    // ---- tumble-rock chutes: while the player is around, a rumble, then a rock rolls down the lane every 7-10 s
    for (let i = 0; i < M.chutes.length; i++) {
      const ch = M.chutes[i];
      const dx = pl.pos.x - (ch.sx + ch.dx * 16), dz = pl.pos.z - (ch.sz + ch.dz * 16);
      if (dx * dx + dz * dz > 55 * 55 || !M.active) continue;
      ch.t -= dt;
      if (ch.warn > 0) {
        ch.warn -= dt;
        if (Math.random() < dt * 14) world.fx.spawn(_mv.set(ch.sx + (Math.random() - 0.5) * 2.5, ch.y + 0.5, ch.sz + (Math.random() - 0.5) * 2.5), _mw.set(0, 1.5, 0), 0xf2d0a8, 0.4, 0.6, { grav: -0.3, drag: 1, alpha: 0.7 });
        if (ch.warn <= 0 && M.rockPool.length && ch.live < 2) { ch.live++; world.addActor(new TumbleRock(world, M, ch, M.rockPool.pop())); }
      } else if (ch.t <= 0) {
        ch.t = 7 + Math.random() * 3; ch.warn = 0.9;
        if (G.Audio) G.Audio.sfxAt('impact', _mv.set(ch.sx, ch.y + 1, ch.sz), { mat: 'ground', pitch: 0.55 });
        // the lane lights up: warm telegraph circles along it, each filling up as the rock gets there (the robots'
        // own warning language: a full circle = the hit), so a rock never rolls in unannounced
        if (G.Enemies && G.Enemies.warnCircle && ch.live < 2) for (let k = 0; k < 5; k++) {
          const u = 4 + k * 6, x = ch.sx + ch.dx * u, z = ch.sz + ch.dz * u;
          G.safe('chute warn', () => G.Enemies.warnCircle(world, _mw.set(x, world.phys.terrain(x, z), z), 1.35, ch.warn + rockArrive(u), 0xffa860));
        }
      }
    }
    // ---- dim zones: spore pods pulse; standing inside one for a moment lights it anyway (never a soft-lock)
    for (let i = 0; i < M.zones.length; i++) {
      const z = M.zones[i];
      if (z.lit) {
        if (z.litT < 1) { z.litT = Math.min(1, z.litT + dt * 1.1); z.dome.material.opacity = 1 - z.litT; if (z.litT >= 1) z.dome.visible = false; }
        continue;
      }
      const dx = pl.pos.x - z.x, dz = pl.pos.z - z.z;
      if (pl.alive && dx * dx + dz * dz < z.R * z.R * 0.55) { z.inT += dt; if (z.inT > 2.5) lightZone(M, world, z, true); } else z.inT = Math.max(0, z.inT - dt);
      for (let j = 0; j < z.pods.length; j++) {
        const pod = z.pods[j];
        if (pod.popped || !pl.alive) continue;
        const ex = pl.pos.x - pod.x, ez = pl.pos.z - pod.z;
        if (ex * ex + ez * ez < 1.5 * 1.5) { pod.actor && (pod.actor.alive = false, pod.actor.dead = true); popSpore(M, world, pod); }
      }
    }
    if (M.podGlow && M.zones.length) {
      for (let i = 0; i < M.podPts.length; i++) {
        const pt = M.podPts[i], pod = findPod(M, i);
        const s = pod && !pod.popped ? 1 + 0.08 * Math.sin(t * 3 + i) : 0;
        _mq.setFromAxisAngle(AXIS_Y, pt.ry); _mm.compose(_mv.set(pt.x, pt.y + (1 - s) * 2.15, pt.z), _mq, _ms.set(s, s, s));
        M.podGlow.setMatrixAt(i, _mm);
      }
      M.podGlow.instanceMatrix.needsUpdate = true;
    }
    // ---- frost crystals also shatter when you bump into one (no aim needed on a phone)
    if (M.crystals.length && pl.alive) for (let i = 0; i < M.crystals.length; i++) {
      const cr = M.crystals[i]; if (!cr.alive) continue;
      const dx = pl.pos.x - cr.x, dz = pl.pos.z - cr.z;
      if (dx * dx + dz * dz < 1.35 * 1.35 && Math.abs(pl.pos.y - cr.y) < 2) { if (cr.actor) { cr.actor.alive = false; cr.actor.dead = true; } shatter(M, world, cr); }
    }
    // ---- frost fields left by shattered crystals: robots inside are marked frosty (for the region challenge)
    if (M.fields && M.fields.length) {
      const A = robotsOf(world);
      for (let f = M.fields.length - 1; f >= 0; f--) {
        const fl = M.fields[f]; fl.t -= dt;
        if (fl.t <= 0) { M.fields.splice(f, 1); continue; }
        if (Math.random() < dt * 12) world.fx.spawn(_mv.set(fl.x + (Math.random() - 0.5) * fl.r * 1.6, fl.y + 0.3, fl.z + (Math.random() - 0.5) * fl.r * 1.6), _mw.set(0, 0.6, 0), 0xe8f8ff, 0.3, 1.2, { grav: -0.1, drag: 0.8, alpha: 0.6 });
        for (let i = 0; i < A.length; i++) { const a = A[i]; if (!isBot(a)) continue; const dx = a.pos.x - fl.x, dz = a.pos.z - fl.z; if (dx * dx + dz * dz < fl.r * fl.r) { a._frost = world.time; a.slowT = Math.max(a.slowT || 0, 0.4); a.slowK = Math.min(a.slowK || 1, 0.35); } }
      }
    }
    // ---- cranes
    for (let i = 0; i < M.cranes.length; i++) craneTick(M, world, M.cranes[i], dt);
    if (M.beltTex) M.beltTex.offset.y = (M.beltTex.offset.y - dt * 3.2 / 2.6) % 1;
  }
  // when a tumble-rock reaches u metres down its lane (TumbleRock: 1.5 m/s, +3.4 m/s² up to 6.2 m/s)
  function rockArrive(u) { const t1 = (6.2 - 1.5) / 3.4, u1 = 1.5 * t1 + 1.7 * t1 * t1; return u <= u1 ? (-1.5 + Math.sqrt(2.25 + 6.8 * u)) / 3.4 : t1 + (u - u1) / 6.2; }
  // after the world moved: ice keeps the momentum, belts carry, cranes hold their catch
  function mechLate(M, world, pl, dt) {
    if (!pl) return;
    // ---- ice: blend this frame's velocity change down to a quarter (no input change can stop you dead); sliding
    // keeps its speed longer; robots on ice wobble a little slower
    if (M.ice.length && pl.alive) {
      const iceNow = pl.grounded && onIce(M, pl.pos.x, pl.pos.z, pl.pos.y);
      if (iceNow && M.preV && pl.vel.y < 2) {
        // the frame's velocity change split along / across the old motion: speeding up keeps 35% of the push,
        // braking 10% (you glide to a stop), steering 18% (wide, gentle turns)
        const px = M.preV.x, pz = M.preV.z, sp = Math.hypot(px, pz);
        let dx = pl.vel.x - px, dz = pl.vel.z - pz;
        if (sp > 0.3) {
          const ux = px / sp, uz = pz / sp, along = dx * ux + dz * uz, ax = ux * along, az = uz * along, cx = dx - ax, cz = dz - az;
          const ka = along > 0 ? 0.35 : 0.1;
          dx = ax * ka + cx * 0.18; dz = az * ka + cz * 0.18;
        } else { dx *= 0.35; dz *= 0.35; }
        pl.vel.x = px + dx; pl.vel.z = pz + dz;
        const hs = Math.hypot(pl.vel.x, pl.vel.z);
        if (hs > 10) { pl.vel.x *= 10 / hs; pl.vel.z *= 10 / hs; }
        if (hs > 6.5 && !M.iceT) { M.iceT = 1.5; M.emit('iceSlide', null); if (G.Audio) G.Audio.sfx('slide', { pitch: 1.3 }); }
        if (hs > 3 && Math.random() < dt * 10) world.fx.spawn(_mv.set(pl.pos.x, pl.pos.y + 0.05, pl.pos.z), _mw.set((Math.random() - 0.5), 1.2, (Math.random() - 0.5)), 0xffffff, 0.1, 0.4, { grav: 4, alpha: 0.9 });
      }
      if (M.iceT > 0) M.iceT = Math.max(0, M.iceT - dt);
      M.onIce = iceNow;
      const A = robotsOf(world);
      for (let i = 0; i < A.length; i++) { const a = A[i]; if (!isBot(a) || a.fly) continue; if (onIce(M, a.pos.x, a.pos.z, a.pos.y)) { a.slowT = Math.max(a.slowT || 0, 0.25); a.slowK = Math.min(a.slowK || 1, 0.75); } }
    }
    // ---- belts carry whatever stands on them (the player and grounded robots), downstream
    if (M.belts.length) {
      const A = robotsOf(world);
      for (let b = 0; b < M.belts.length; b++) {
        const bt = M.belts[b], step = bt.speed * dt;
        if (pl.alive && pl.grounded && onBelt(bt, pl.pos.x, pl.pos.z) && Math.abs(pl.pos.y - bt.top) < 0.5) {
          const nx = pl.pos.x + bt.dx * step, nz = pl.pos.z + bt.dz * step;
          if (world.phys.groundAt(nx, nz, (pl.r || 0.4) * 0.8, pl.pos.y + 0.45) <= pl.pos.y + 0.45) { pl.pos.x = nx; pl.pos.z = nz; }
          if (!bt.rode) { bt.rode = true; M.emit('belt', bt); }
        }
        for (let i = 0; i < A.length; i++) { const a = A[i]; if (!isBot(a) || a.fly || a._craned) continue; if (onBelt(bt, a.pos.x, a.pos.z) && Math.abs(a.pos.y - bt.top) < 0.7) { a.pos.x += bt.dx * step; a.pos.z += bt.dz * step; if (a.mesh) a.mesh.position.copy(a.pos); } }
      }
    }
    for (let i = 0; i < M.cranes.length; i++) craneHold(M, world, M.cranes[i], dt);
  }
  X.mechPre = function (M, pl) { if (!M || !pl) return; if (!M.preV) M.preV = new V3(); M.preV.copy(pl.vel); };
  function onIce(M, x, z, y) {
    for (let i = 0; i < M.ice.length; i++) {
      const p = M.ice[i], dx = x - p.x, dz = z - p.z, d2 = dx * dx + dz * dz;
      if (d2 > p.R * p.R || Math.abs(y - p.y) > 1.2) continue;
      const a = (Math.atan2(dz, dx) + TAU) % TAU, f = a / TAU * 24, i0 = Math.floor(f) % 24, i1 = (i0 + 1) % 24, r = p.radii[i0] + (p.radii[i1] - p.radii[i0]) * (f - Math.floor(f));
      if (d2 < r * r * 0.92) return true;
    }
    return false;
  }
  function onBelt(bt, x, z) {
    const lx = x - bt.mx, lz = z - bt.mz, u = lx * bt.dx + lz * bt.dz, v = -lx * bt.dz + lz * bt.dx;
    return Math.abs(u) < bt.L / 2 - 0.2 && Math.abs(v) < bt.W / 2;
  }
  X.mechBeltAt = function (M, x, z) { if (!M) return null; for (let i = 0; i < M.belts.length; i++) if (onBelt(M.belts[i], x, z)) return M.belts[i]; return null; };
  function findPod(M, i) { for (const z of M.zones) for (const p of z.pods) if (p.i === i) return p; return null; }
  function popSpore(M, world, pod) {
    if (pod.popped) return;
    pod.popped = true;
    const p = _mv.set(pod.x, pod.y + 2.1, pod.z);
    world.fx.burst(p, [0x9ffcff, 0x5cffe1, 0xffffff, 0xc2a2ff], 26, 7, 0.3, 0.8, { grav: -1, drag: 1.2 });
    world.fx.flash(p, 0xbff8ff, 3, 0.25);
    if (G.Audio) G.Audio.sfxAt('teleport', p, { pitch: 1.5 });
    lightZone(M, world, pod.zone, false);
  }
  function lightZone(M, world, z, auto) {
    if (z.lit) return;
    z.lit = true; z.litT = 0; z.auto = auto;
    if (z.lamp) z.lamp.visible = true;
    world.fx.burst(_mv.set(z.x, z.y + 2, z.z), [0x9ffcff, 0xffffff, 0xffe9a8], 40, 9, 0.35, 1.0, { grav: -0.5, drag: 1 });
    world.fx.ring(_mv.set(z.x, z.y + 0.2, z.z), z.R, 0x9ffcff, 0.8);
    if (G.Audio) { G.Audio.sfx('unlock'); G.Audio.sfx('star', { pitch: 1.2 }); }
    for (const pod of z.pods) if (!pod.popped) { pod.popped = true; if (pod.actor && pod.actor.alive) { pod.actor.alive = false; pod.actor.dead = true; } }
    M.emit('lit', z);
  }
  function shatter(M, world, cr) {
    if (!cr.alive) return;
    cr.alive = false;
    const p = _mv.set(cr.x, cr.y + 1, cr.z);
    world.fx.burst(p, [0xff9de2, 0x9fe8ff, 0xffffff], 26, 7, 0.28, 0.7, { grav: 10 });
    world.fx.ring(_mw.set(cr.x, cr.y + 0.15, cr.z), 5.5, 0xbfefff, 0.6);
    if (G.Audio) { G.Audio.sfxAt('freeze', p); G.Audio.sfxAt('crate', p, { pitch: 1.6 }); }
    if (G.Enemies && G.Enemies.puddle) G.safe('frost field', () => G.Enemies.puddle(world, new V3(cr.x, cr.y, cr.z), 5.5, 7, { slowK: 0.35, slowT: 0.5, team: 0, color: 0xcff2ff }));
    (M.fields || (M.fields = [])).push({ x: cr.x, y: cr.y, z: cr.z, r: 5.5, t: 7 });
    if (M.crysMesh) { _mm.makeScale(0, 0, 0); M.crysMesh.setMatrixAt(cr.i, _mm); M.crysMesh.instanceMatrix.needsUpdate = true; }
    M.emit('frostField', cr);
  }
  // ---- magnet crane: ready → (button) grab: the head drops, every robot / metal crate in the ring is pulled up to it →
  // hold 1.3 s → drop (robots take ~65% of their health + 30; crates break) → 12 s cooldown (button red)
  function craneGo(M, world, cr) {
    if (cr.state !== 'ready') { if (G.Audio && cr.state === 'cool') G.Audio.sfxAt('error', _mv.set(cr.bx, cr.by, cr.bz), { pitch: 1.2 }); return; }
    cr.state = 'grab'; cr.t = 0; cr.grabbed.length = 0;
    if (G.Audio) { G.Audio.sfxAt('charge', _mv.set(cr.x, cr.y + 3, cr.z)); G.Audio.sfxAt('zap', _mv.set(cr.bx, cr.by, cr.bz), { pitch: 1.4 }); }
    cr.head.userData.glow.visible = true;
    setBtn(M, cr, 0xffd23f);
  }
  function setBtn(M, cr, hex) { if (M.btnMesh) { M.btnMesh.setColorAt(cr.i, _cc.setHex(hex)); M.btnMesh.instanceColor.needsUpdate = true; } }
  const _cc = new THREE.Color();
  function craneTick(M, world, cr, dt) {
    const pl = world.player;
    if (cr.state === 'ready') {
      cr.hy = U.damp(cr.hy, cr.restY + Math.sin(M.t * 1.2 + cr.i) * 0.15, 4, dt);
      // touching the button works too
      if (pl && pl.alive) { const dx = pl.pos.x - cr.bx, dz = pl.pos.z - cr.bz; if (dx * dx + dz * dz < 1.3 * 1.3) craneGo(M, world, cr); }
    } else if (cr.state === 'grab') {
      cr.t += dt;
      cr.hy = U.damp(cr.hy, cr.y + 5.0, 5, dt);
      if (cr.t > 0.55 && !cr.caught) {
        cr.caught = true;
        const A = robotsOf(world);
        for (let i = 0; i < A.length; i++) {
          const a = A[i];
          const bot = isBot(a), crate = a.isCrate && a.alive && (a.crateKind === 'metal' || a.crateKind === 'lumite' || a.crateKind === 'wood');
          if (!bot && !crate) continue;
          const dx = a.pos.x - cr.x, dz = a.pos.z - cr.z;
          if (dx * dx + dz * dz > cr.r * cr.r) continue;
          a._craned = { ox: dx * 0.35, oz: dz * 0.35, y0: a.pos.y, k: 0, crate };
          cr.grabbed.push(a);
          if (bot) a.stunT = Math.max(a.stunT || 0, 3.4);
        }
        world.fx.ring(_mv.set(cr.x, cr.y + 0.2, cr.z), cr.r, 0xfff2a0, 0.5);
        if (G.Audio) G.Audio.sfxAt('zap', _mv.set(cr.x, cr.y + 3, cr.z), { pitch: 0.8 });
      }
      if (cr.t > 1.9) { cr.state = 'drop'; cr.t = 0; }
    } else if (cr.state === 'drop') {
      cr.t += dt;
      cr.hy = U.damp(cr.hy, cr.restY, 3, dt);
      if (cr.t > 0.35 && !cr.dropped) {
        cr.dropped = true;
        // let go: everything falls (craneHold animates the fall and lands the bonk)
        for (const a of cr.grabbed) { const g = a._craned; if (g) { g.fall = 0; g.hy = a.pos.y; } }
        cr.head.userData.glow.visible = false;
        if (G.Audio) G.Audio.sfxAt('whoosh', _mv.set(cr.x, cr.y + 2, cr.z), { pitch: 0.7 });
      }
      if (cr.t > 1.0) {
        if (cr.landed) M.emit('crane', { crane: cr, n: cr.landed });
        cr.state = 'cool'; cr.cd = 12; cr.caught = false; cr.dropped = false; cr.landed = 0; cr.grabbed.length = 0; setBtn(M, cr, 0xff6b8b);
      }
    } else if (cr.state === 'cool') {
      cr.cd -= dt;
      cr.hy = U.damp(cr.hy, cr.restY, 3, dt);
      if (cr.cd <= 0) { cr.state = 'ready'; setBtn(M, cr, 0x8bea4a); if (G.Audio && pl && pl.pos.distanceToSquared(cr.head.position) < 900) G.Audio.sfxAt('ui', _mv.set(cr.bx, cr.by, cr.bz), { pitch: 1.5 }); }
    }
    cr.head.position.y = cr.hy;
    cr.cable.scale.y = Math.max(0.1, cr.top - cr.hy);
    // the button says its state by size as well as colour (colour-blind players): ready = a big slow pulse, working =
    // large, cooling down = small and still
    if (M.btnMesh) {
      const k = cr.state === 'ready' ? 1.05 + 0.15 * Math.sin(M.t * 4 + cr.i) : cr.state === 'cool' ? 0.55 : 1.25;
      _mm.makeScale(k, k, k).setPosition(cr.bx, cr.by, cr.bz);
      M.btnMesh.setMatrixAt(cr.i, _mm); M.btnMesh.instanceMatrix.needsUpdate = true;
    }
  }
  function craneHold(M, world, cr, dt) {
    const pl = world.player;
    for (let i = 0; i < cr.grabbed.length; i++) {
      const a = cr.grabbed[i], g = a._craned; if (!g) continue;
      if (!a.alive) { a._craned = null; continue; }
      if (g.fall != null) {
        // falling back down (quick, eased in); the landing is the bonk
        g.fall = Math.min(1, g.fall + dt * 3.2);
        const gy = world.phys.groundAt(a.pos.x, a.pos.z, 0.3, g.hy);
        a.pos.y = U.lerp(g.hy, gy, g.fall * g.fall);
        if (a.mesh) { a.mesh.position.copy(a.pos); a.mesh.rotation.z = 0; }
        if (g.fall >= 1) {
          a._craned = null;
          if (g.crate) world.damage(a, 1e3, { src: pl, type: 'explosion' });
          else { _mv.set(0, -1, 0); world.damage(a, a.maxHp * 0.65 + 30, { src: pl, type: 'crush', pos: a.pos.clone(), dir: _mv.clone(), knock: 2 }); cr.landed = (cr.landed || 0) + 1; M.emit('craneDrop', a); }
          world.fx.burst(_mv.set(a.pos.x, a.pos.y + 0.3, a.pos.z), [0x9aa5b8, 0xffd23f, 0xffffff], 10, 4, 0.25, 0.5, { grav: 10 });
          if (G.Audio) G.Audio.sfxAt('impact', a.pos, { mat: 'metal', pitch: 0.75 });
        }
        continue;
      }
      g.k = Math.min(1, g.k + dt * 2.6);
      const k = g.k * g.k * (3 - 2 * g.k);
      const tx = cr.x + g.ox * (1 - k * 0.6), tz = cr.z + g.oz * (1 - k * 0.6), ty = cr.hy - 1.1 - (g.crate ? 0.4 : (a.h || 1.2));
      a.pos.x = U.lerp(a.pos.x, tx, Math.min(1, dt * 8)); a.pos.z = U.lerp(a.pos.z, tz, Math.min(1, dt * 8));
      a.pos.y = U.lerp(g.y0, ty, k) + Math.sin(M.t * 9 + i) * 0.05 * k;
      if (a.mesh) { a.mesh.position.copy(a.pos); if (!g.crate) a.mesh.rotation.z = Math.sin(M.t * 7 + i) * 0.25 * k; }
    }
  }

  function makeMap(hf, painter, pathAt, B, HALF) {
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d'), img = g.createImageData(S, S), d = img.data;
    const wS = new THREE.Color(B.water.shallow), wD = new THREE.Color(B.water.deep), c = new THREE.Color();
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = -HALF + (i + 0.5) / S * HALF * 2, z = -HALF + (j + 0.5) / S * HALF * 2;
      const h = hf(x, z);
      if (h < 0.05) c.copy(wS).lerp(wD, clamp(-h / 5, 0, 1));
      else {
        const s = Math.hypot(hf(x + 1.2, z) - hf(x - 1.2, z), hf(x, z + 1.2) - hf(x, z - 1.2)) / 2.4;
        c.setHex(painter(x, z, h, s));
        c.multiplyScalar(0.85 + clamp(h / 30, 0, 0.3));
      }
      c.convertLinearToSRGB();
      const k = (j * S + i) * 4;
      d[k] = c.r * 255; d[k + 1] = c.g * 255; d[k + 2] = c.b * 255; d[k + 3] = 235;
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
})(window.G);

}).call(window); } catch (e) { console.error('[module 21b_exp_island.js]', e); }
// ---- 21c_exp_mode.js
try { (function () {
// 21c_exp_mode.js — Expedition mode (GDD §11a): G.Game.go('expedition', {mission, biome, difficulty, seed, heat}).
//   mission: story id ('s1_1'…'s5_3'), board id ('b_<seed>_<i>') or a mission object; biome/seed override the
//   mission's (handy for tests). Loop: explore the seeded island → objective → Lift Balloon extraction → results.
// Test hooks (G.Exp.dbg): state(), completeObjective(), killAll(radius?), teleport(x,z), toExtraction(),
//   holdExtraction(), activateAll().
(function (G) {
  'use strict';
  const X = G.Exp, U = G.util, V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2;
  const _v = new V3(), _v2 = new V3();
  let S = null;

  // ---------------------------------------------------------------- art: totem, cage, cart, chest
  function totemMesh() {
    return X.kitCached('exp-totem', k => {
      const P = G.Geo.P;
      for (let i = 0; i < 2; i++) k.add(P.tor(1.05, 0.38, 8, 18), 0x2a2d55, 0, 0.38 + i * 0.62, 0, PI / 2, 0, 0);
      const barrel = P.cyl(0.9, 0.95, 1.5, 14); barrel.translate(0, 2.05, 0);
      G.Geo.colorize(barrel, (x, y) => new THREE.Color(Math.floor(y / 0.38) % 2 ? 0xff7a3d : 0xffd23f));
      k.addRaw(barrel);
      k.add(P.rbox(1.7, 1.25, 1.3, 0.18, 2), 0x5b3a8c, 0, 3.4, 0);
      k.glow(P.rbox(1.25, 0.82, 0.06, 0.1, 1), 0xff3f8e, 0, 3.42, 0.64);
      for (const sx of [-1, 1]) k.add(P.sph(0.12, 8, 6), 0xe8b44a, sx * 0.72, 3.95, 0.62);
      k.add(P.cyl(0.08, 0.1, 1.0, 6), 0x1f2a5a, 0, 4.5, 0);
      k.glow(P.oct(0.34), 0xffd23f, 0, 5.15, 0, 0, 0, 0, 1, 1.4, 1);
      k.add(P.cone(0.5, 0.25, 12), 0xc9d2ea, 0.55, 4.35, 0, 0, 0, -0.9);
      k.add(P.rbox(0.9, 0.5, 0.05, 0.04, 1), 0xff7a3d, -0.48, 4.7, 0);
      k.sprite(0xffd23f, 2.6, 0, 5.15, 0, 0.6);
    }, { rimStr: 0.45, spec: 0.5 });
  }
  // Rescue cage: base + roof (+ bars while locked) in ONE mesh; freeing swaps to the bar-less geometry (1 draw call).
  function cageParts(k, bars) {
    const P = G.Geo.P;
    k.add(P.cyl(1.25, 1.35, 0.3, 18), 0x1f2a5a, 0, 0.15, 0);
    k.add(P.tor(1.25, 0.07, 6, 24), 0xe8b44a, 0, 0.3, 0, PI / 2, 0, 0);
    k.add(G.Geo.lathe([[1.25, 2.1], [1.0, 2.5], [0.5, 2.75], [0, 2.8]], 18), 0xff7a3d, 0, 0, 0);
    k.add(P.sph(0.18, 10, 8), 0xe8b44a, 0, 2.9, 0);
    if (!bars) return;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; k.add(P.cyl(0.05, 0.05, 1.85, 6), 0xc9d2ea, Math.cos(a) * 1.18, 1.2, Math.sin(a) * 1.18); }
    k.add(P.tor(1.18, 0.06, 6, 24), 0xe8b44a, 0, 1.2, 0, PI / 2, 0, 0);
    k.add(P.rbox(0.42, 0.42, 0.2, 0.08, 1), 0xffd23f, 0, 1.15, 1.25);
  }
  function cageMesh(bars) { return X.kitCached(bars ? 'exp-cage-locked' : 'exp-cage', k => cageParts(k, bars), { rimStr: 0.35, spec: 0.3 }); }
  function cartMesh() {
    return X.kitCached('exp-cart', k => {
      const P = G.Geo.P;
      k.add(P.rbox(2.4, 0.9, 1.7, 0.16, 2), 0xd99a5b, 0, 0.95, 0);
      for (const y of [0.7, 1.15]) k.add(P.rbox(2.46, 0.1, 1.76, 0.04, 1), 0xa86a3c, 0, y, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.add(P.cyl(0.45, 0.45, 0.22, 16), 0x1f2a5a, sx * 0.85, 0.45, sz * 0.92, PI / 2, 0, 0); k.add(P.cyl(0.18, 0.18, 0.26, 10), 0xe8b44a, sx * 0.85, 0.45, sz * 0.92, PI / 2, 0, 0); }
      k.add(P.rbox(0.18, 0.18, 1.2, 0.06, 1), 0x1f2a5a, 1.4, 0.75, 0);
      k.glow(P.sph(0.14, 8, 6), 0xffd27a, 1.25, 1.2, 0.7); k.glow(P.sph(0.14, 8, 6), 0xffd27a, 1.25, 1.2, -0.7);
      k.add(P.rbox(1.3, 0.5, 1.1, 0.12, 1), 0x8f6bff, -0.3, 1.6, 0);
      k.add(P.rbox(0.5, 0.35, 0.5, 0.1, 1), 0x3fe0b8, 0.5, 1.55, 0.3);
    }, { rimStr: 0.4 });
  }
  function chestParts() {
    const base = X.kitCached('exp-chest', k => {
      const P = G.Geo.P;
      k.add(P.rbox(1.6, 0.9, 1.1, 0.14, 2), 0xffc21a, 0, 0.45, 0);
      for (const x of [-0.55, 0.55]) k.add(P.rbox(0.16, 0.94, 1.14, 0.05, 1), 0xb07a2a, x, 0.45, 0);
      k.add(P.rbox(0.3, 0.32, 0.12, 0.06, 1), 0x1f2a5a, 0, 0.72, 0.56);
      k.glow(P.rbox(1.4, 0.06, 0.9, 0.03, 1), 0xfff2b0, 0, 0.9, 0);
    }, { rimStr: 0.5, spec: 0.8 });
    const lid = X.kitCached('exp-chestlid', k => {
      const P = G.Geo.P;
      const g = P.cyl(0.55, 0.55, 1.62, 16, false); G.Geo.xf(g, 0, 0, 0, 0, 0, PI / 2); g.scale(1, 0.75, 1);
      k.add(g, 0xffc21a, 0, 0, -0.55);
      for (const x of [-0.55, 0.55]) { const b = P.cyl(0.57, 0.57, 0.16, 16, false); G.Geo.xf(b, 0, 0, 0, 0, 0, PI / 2); b.scale(1, 0.76, 1); k.add(b, 0xb07a2a, x, 0, -0.55); }
      k.add(G.Geo.emblem ? G.Geo.emblem('star', 0xffffff).clone() : P.sph(0.2), null, 0, 0.3, 0.02, 0, 0, 0, 0.45);
    }, { rimStr: 0.5, spec: 0.8 });
    return { base: base.mesh, lid: lid.mesh };
  }
  // Boss chest / mission chest loot fountain (visual + an optional real clink burst).
  X.chestFountain = function (world, pos, opts) {
    opts = opts || {};
    const c = chestParts();
    const root = new THREE.Group(); root.position.copy(pos); root.rotation.y = opts.yaw || 0;
    root.add(c.base); c.lid.position.set(0, 0.9, 0.55); c.base.add(c.lid);
    world.add(root);
    root.scale.setScalar(0.01);
    if (G.Audio) G.Audio.sfxAt('unlock', pos);
    let fired = false;
    world.fx.timed(new THREE.Object3D(), 6, (k, o, dt) => {
      const t = k * 6;
      root.scale.setScalar(Math.min(1, t * 3) * (1 + 0.15 * Math.sin(Math.min(1, t * 3) * PI)) * (opts.scale || 1.3));
      if (t > 0.8) c.lid.rotation.x = -Math.min(1.9, (t - 0.8) * 5);
      if (t > 0.9 && t < 3.2 && Math.random() < 0.8) {
        const p = _v.set(pos.x, pos.y + 1.2, pos.z);
        world.fx.spawn(p, _v2.set(U.rand(-2, 2), U.rand(7, 11), U.rand(-2, 2)), U.pick([0xffd23f, 0xfff2b0, 0xff8fc0, 0x7af0ff]), 0.35, 1.1, { grav: 12, drag: 0.6 });
      }
      if (t > 1 && !fired) {
        fired = true;
        world.fx.confetti(_v.set(pos.x, pos.y + 1.5, pos.z), 60);
        world.fx.flash(_v.set(pos.x, pos.y + 1.2, pos.z), 0xfff2b0, 6, 0.3);
        if (opts.clinks) world.pickups.boltBurst(_v.set(pos.x, pos.y + 1.4, pos.z), opts.clinks);
        if (opts.parts) for (const p of opts.parts) world.pickups.spawn('part', _v.set(pos.x, pos.y + 1.4, pos.z), p, new V3(U.rand(-3, 3), U.rand(6, 9), U.rand(-3, 3)));
        if (G.Audio) G.Audio.sfx('levelup');
      }
    });
    return root;
  };

  // ---------------------------------------------------------------- actors
  class Totem extends G.Actor {
    constructor(world, pos, hp) {
      super(world, { r: 1.45, h: 5.4, team: 1, hp, kind: 'totem' });
      this.isTotem = true; this.immovable = true; this.pos.copy(pos);
      this.mesh = totemMesh().mesh; this.mesh.position.copy(pos);
      this.critY = 4.6; this.spawnT = 2.5; this.punch = 0; this.deathT = 0; this.mmColor = '#ff7a3d';
      this.col = world.phys.addCyl(pos.x, pos.z, 1.2, pos.y, pos.y + 4.6);
      this.kids = [];
    }
    update(dt) {
      this.applyStatus(dt);
      const t = this.world.time;
      if (!this.alive) {
        this.deathT += dt;
        this.mesh.rotation.z = Math.min(1.4, this.deathT * this.deathT * 3);
        this.mesh.position.y = this.pos.y - Math.max(0, this.deathT - 0.5) * 3;
        if (this.deathT > 0.85) {
          const p = _v.set(this.pos.x, this.pos.y + 2, this.pos.z);
          this.world.fx.explosion(p, 3.5, 0xff7a3d); this.world.fx.confetti(p, 50);
          this.world.pickups.boltBurst(p, U.randInt(40, 70));
          this.dead = true;
        }
        return;
      }
      this.punch = U.damp(this.punch, 0, 9, dt);
      const s = 1 + 0.035 * Math.sin(t * 2.4) - this.punch * 0.12;
      this.mesh.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      this.mesh.rotation.y = Math.sin(t * 0.7) * 0.08;
      if (this.hp < this.maxHp && S) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) { this.spawnT = 10; S.totemSpawn(this); }
      }
    }
    onHurt() { this.punch = 1; }
    onDeath() { if (this.col) this.world.phys.remove(this.col); if (G.Audio) G.Audio.sfxAt('explode', this.pos); }
  }
  class Cart extends G.Actor {
    constructor(world, road, hf) {
      super(world, { r: 1.4, h: 2.2, team: 0, hp: 800, kind: 'cart' });
      this.immovable = true;
      // densify the road (2 m steps) with gently smoothed heights
      const pts = [];
      for (let i = 0; i < road.length - 1; i++) {
        const a = road[i], b = road[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(L / 2));
        for (let j = 0; j < n; j++) { const k = j / n; pts.push(new V3(U.lerp(a.x, b.x, k), 0, U.lerp(a.z, b.z, k))); }
      }
      pts.push(new V3(road[road.length - 1].x, 0, road[road.length - 1].z));
      for (const p of pts) p.y = Math.max(0.3, hf(p.x, p.z));
      for (let it = 0; it < 3; it++) for (let i = 1; i < pts.length - 1; i++) pts[i].y = Math.max(hf(pts[i].x, pts[i].z), (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4);
      this.pts = pts; this.cum = [0];
      for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      this.L = this.cum[this.cum.length - 1];
      this.u = 0; this.broken = false; this.waiting = false; this.done = false;
      this.mesh = new THREE.Group();
      this.body = cartMesh().mesh; this.mesh.add(this.body);
      if (G.Geo.npc) { this.beepo = G.safe('npc', () => G.Geo.npc('companion')); if (this.beepo) { this.beepo.group.position.set(-0.3, 1.85, 0); this.beepo.group.rotation.y = PI / 2; this.mesh.add(this.beepo.group); } }
      this.mmColor = '#3fe0b8';
      this.place(0);
    }
    place(u) {
      const c = this.cum; let i = 0;
      while (i < c.length - 2 && c[i + 1] < u) i++;
      const a = this.pts[i], b = this.pts[i + 1] || a, seg = (c[i + 1] - c[i]) || 1, k = U.clamp((u - c[i]) / seg, 0, 1);
      this.pos.set(U.lerp(a.x, b.x, k), U.lerp(a.y, b.y, k), U.lerp(a.z, b.z, k));
      this.mesh.position.copy(this.pos);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z) - PI / 2;
      this.mesh.rotation.y = U.angleDamp(this.mesh.rotation.y, yaw, 6, 0.05);
      this.body.rotation.z = -Math.atan2(b.y - a.y, seg) * 0.8;
    }
    takeDamage(amount, info) {
      if (this.broken || this.done) return { dealt: -0, toShield: -0, killed: false };   // (doubles: 10_world dmgRes's shape)
      amount *= (1 - this.armor); if (info && info.mult) amount *= info.mult;
      const d = Math.min(this.hp - 1, amount);
      this.hp -= d; this.lastHitT = this.world.time; this.flashT = 0.12;
      if (this.hp <= 1.01) { this.broken = true; this.targetable = false; this.hp = 1; this.world.fx.smoke(_v.copy(this.pos).setY(this.pos.y + 1.6), 12); if (G.Audio) G.Audio.sfxAt('error', this.pos); }
      return { dealt: d, toShield: -0, killed: false };
    }
    update(dt) {
      this.applyStatus(dt);
      const pl = this.world.player, t = this.world.time;
      if (this.beepo && this.beepo.animate) this.beepo.animate(t, dt);
      if (this.broken || this.done) { if (this.broken && Math.random() < 0.2) this.world.fx.smoke(_v.copy(this.pos).setY(this.pos.y + 1.5), 1); return; }
      const near = pl && pl.alive && U.distXZ(pl.pos, this.pos) < 15;
      this.waiting = !near;
      // ("Conveyor Chaos": a belt laid on the road carries the cart along faster)
      const belt = near && S && S.mech && X.mechBeltAt ? X.mechBeltAt(S.mech, this.pos.x, this.pos.z) : null;
      if (near) { this.u = Math.min(this.L, this.u + 2.5 * (belt ? 2.2 : 1) * dt); this.body.position.y = Math.abs(Math.sin(t * 9)) * 0.04; }
      this.place(this.u);
      if (this.u >= this.L) this.done = true;
    }
  }

  // ---------------------------------------------------------------- objectives
  const OBJ = {};
  OBJ.sweep = {
    init(s) { s.obj.n = s.m.n || (25 + 5 * s.star); s.obj.a = 0; },
    onKill(s) { s.obj.a++; if (s.obj.a >= s.obj.n) s.objDone(); },
    text(s) { return { t: G.t('exp.obj.sweep'), x: G.t('exp.prog.sweep', { a: Math.min(s.obj.a, s.obj.n), b: s.obj.n }), f: s.obj.a / s.obj.n }; },
    markers(s) { s.markNearestCamp(); },
    need(s) { return s.obj.n - s.obj.a; },
  };
  OBJ.parts = {
    init(s) {
      s.obj.part = s.m.part || 'spring'; s.obj.n = s.m.n || 8; s.obj.a = 0; s.obj.caches = []; s.obj.rarity = partRarity(s.obj.part);
      // part caches: guarded metal crates at three camps that always drop the wanted part
      const camps = U.shuffle(s.camps.filter(c => !c.patrol).slice()).slice(0, 3);
      for (const c of camps) { const sl = { pos: new V3(c.x + 1.8, 0, c.z - 1.2), kind: 'metal', cache: true }; s.crateSlots.push(sl); s.obj.caches.push(sl); }
    },
    onKill(s, t) {
      const ch = s.obj.part === 'core' ? (t.elite ? 0.9 : X.tier(t.enemyId) >= 2 ? 0.35 : 0.18) : (X.tier(t.enemyId) >= 2 ? 0.7 : 0.45);
      if (Math.random() < ch) s.world.pickups.spawn('part', t.aimPoint(_v).clone(), { partId: s.obj.part, rarity: s.obj.rarity });
    },
    onPart(s, id, n) { if (id === s.obj.part) { s.obj.a += n; if (s.obj.a >= s.obj.n) s.objDone(); } },
    text(s) { return { t: G.t('exp.obj.parts'), x: G.t('exp.prog.parts', { part: X.partName(s.obj.part), a: Math.min(s.obj.a, s.obj.n), b: s.obj.n }), f: s.obj.a / s.obj.n }; },
    markers(s) { s.markNearestCamp(); },
  };
  OBJ.totem = {
    init(s) {
      const camps = s.camps.slice().sort((a, b) => U.distXZ(b, s.isl.spawn.pos) - U.distXZ(a, s.isl.spawn.pos));
      const pick = [];
      for (const c of camps) { if (pick.length >= (s.m.n || 3)) break; if (pick.every(p => U.distXZ(p, c) > 45)) pick.push(c); }
      for (const c of camps) { if (pick.length >= (s.m.n || 3)) break; if (!pick.includes(c)) pick.push(c); }
      s.obj.n = pick.length; s.obj.a = 0; s.totems = [];
      const hp = 600 * X.diffInfo(s.diff).hp * (s.heat.includes('armored') ? 1.3 : 1);
      for (const c of pick) {
        const t = new Totem(s.world, new V3(c.x, c.y, c.z), hp);
        s.world.addActor(t); s.totems.push(t); c.totem = t;
        if (s.m.guards) c.guards = s.m.guards;
        c.budget += 2;
      }
    },
    update(s) { const a = s.totems.filter(t => !t.alive).length; if (a !== s.obj.a) { s.obj.a = a; if (a > 0) G.HUD.feed(G.t('exp.totemDown'), 'rgba(255,122,61,0.9)'); if (a >= s.obj.n) s.objDone(); } },
    text(s) { return { t: G.t('exp.obj.totem'), x: G.t('exp.prog.totem', { a: s.obj.a, b: s.obj.n }), f: s.obj.a / s.obj.n }; },
    markers(s) { nearestMarks(s, s.totems.map(t => ({ on: t.alive, pos: t.pos, y: 6 })), 'totem'); },
  };
  OBJ.rescue = {
    init(s) {
      s.cages = [];
      for (const c of (s.isl.sites.cages || [])) {
        const y = s.isl.hf(c.x, c.z);
        const root = new THREE.Group(); root.position.set(c.x, y, c.z); root.rotation.y = Math.random() * TAU;
        const body = cageMesh(true).mesh; root.add(body);
        let critter = null;
        if (G.Geo.critter) { critter = G.safe('critter', () => G.Geo.critter(U.pick(['blob', 'bunnyblob']), U.pick([0xff8fc0, 0x8fe3ff, 0xffd45c, 0xa8f08a, 0xc9a8ff]))); if (critter) { critter.group.position.y = 0.3; critter.group.scale.setScalar(1.6); root.add(critter.group); } }
        s.world.add(root);
        const col = s.world.phys.addCyl(c.x, c.z, 1.3, y, y + 2.8);
        const cage = { pos: new V3(c.x, y, c.z), root, body, critter, col, freed: false, prog: 0, near: true, dark: c.dim || null };
        // ("Lights Out": a cage in a dim zone opens once the zone is lit — standing next to it lights it by itself)
        cage.it = s.world.addInteract({ pos: cage.pos, r: 3.0, key: 'exp.int.free', enabled: () => !cage.freed && !s.freeing && !(cage.dark && !cage.dark.lit), onUse: () => { s.freeing = cage; cage.prog = 0; if (G.Audio) G.Audio.sfx('charge'); } });
        s.cages.push(cage);
      }
      s.obj.n = Math.min(s.m.n || 5, s.cages.length); s.obj.a = 0;
    },
    update(s, dt) {
      const pp = s.world.player.pos;
      for (const c of s.cages) {
        // render budget: the critter inside (2 calls) only shows up close; the cage itself only within fog-ish range
        const d = U.distXZ(pp, c.pos), near = d < 48 || c.hop != null;
        if (c.critter && near !== c.near) { c.near = near; if (c.hop == null && !(c.freed && !c.critter.group.visible)) c.critter.group.visible = near; }
        const show = d < 125; if (c.root.visible !== show) c.root.visible = show;
        if (c.critter && near && show && G.Geo.animateCritter) G.Geo.animateCritter(c.critter, s.world.time + c.pos.x, dt);
        if (c.hop != null) {
          c.hop += dt;
          const k = Math.min(1, c.hop / 1.6);
          c.critter.group.position.set(Math.sin(k * PI) * 0 + k * 4, 0.3 + Math.abs(Math.sin(k * PI * 3)) * 1.6 * (1 - k), k * 2);
          c.critter.group.scale.setScalar(1.6 * (k > 0.8 ? (1 - k) * 5 : 1));
          if (k >= 1) { c.critter.group.visible = false; c.hop = null; }
        }
      }
      const f = s.freeing;
      if (f) {
        const pl = s.world.player;
        if (!pl.alive || U.distXZ(pl.pos, f.pos) > 3.6) { s.freeing = null; G.HUD.removeMarker('free'); return; }
        f.prog += dt / 2;
        G.HUD.marker('free', _v.set(f.pos.x, f.pos.y + 3.4, f.pos.z), { icon: mk('rescue'), label: G.t('exp.int.freeing', { n: Math.min(100, Math.round(f.prog * 100)) }), color: '#3fe0b8', dist: false, edge: false });
        if (f.prog >= 1) {
          f.freed = true; s.freeing = null; G.HUD.removeMarker('free');
          f.body.geometry = cageMesh(false).mesh.geometry; s.world.phys.remove(f.col);
          s.world.fx.confetti(_v.set(f.pos.x, f.pos.y + 1.5, f.pos.z), 40);
          if (f.critter) { f.hop = 0; if (f.critter.setExpr) f.critter.setExpr('happy'); }
          if (G.Audio) G.Audio.sfx('unlock');
          G.HUD.feed(G.t('exp.freed'), 'rgba(63,224,184,0.9)');
          s.obj.a++;
          s.world.pickups.boltBurst(_v.set(f.pos.x, f.pos.y + 1, f.pos.z), 25);
          s.ambush(f.pos, 3);
          if (s.obj.a >= s.obj.n) s.objDone();
        }
      }
    },
    text(s) { return { t: G.t('exp.obj.rescue'), x: G.t('exp.prog.rescue', { a: s.obj.a, b: s.obj.n }), f: s.obj.a / s.obj.n }; },
    markers(s) { nearestMarks(s, s.cages.map(c => ({ on: !c.freed, pos: c.pos, y: 3.4 })), 'rescue'); },
  };
  OBJ.escort = {
    init(s) {
      const road = s.isl.road || [s.isl.spawn.pos, s.isl.pads[0] || { x: 0, z: 0 }];
      // ("Conveyor Chaos": the cart rolls up onto the belts laid on its road instead of driving through their frames)
      const M0 = s.isl.mech, hf0 = s.isl.hf;
      const hfCart = M0 && X.mechBeltAt && M0.belts.some(b => b.road) ? (x, z) => { const b = X.mechBeltAt(M0, x, z); return b ? Math.max(hf0(x, z), b.top) : hf0(x, z); } : hf0;
      s.cart = new Cart(s.world, road, hfCart);
      s.world.addActor(s.cart);
      s.obj.waveT = 12; s.obj.repair = 0;
      s.cart.it = s.world.addInteract({ pos: s.cart.pos, r: 3.2, key: 'exp.int.repair', enabled: () => s.cart.broken, onUse: () => { s.obj.repairing = true; s.obj.repair = 0; if (G.Audio) G.Audio.sfx('charge'); } });
    },
    update(s, dt) {
      const c = s.cart;
      if (s.obj.repairing) {
        const pl = s.world.player;
        if (!pl.alive || U.distXZ(pl.pos, c.pos) > 3.8) s.obj.repairing = false;
        else {
          s.obj.repair += dt / 2;
          if (s.obj.repair >= 1) { s.obj.repairing = false; c.broken = false; c.targetable = true; c.hp = c.maxHp * 0.5; G.HUD.feed(G.t('exp.cartFixed'), 'rgba(63,224,184,0.9)'); if (G.Audio) G.Audio.sfx('unlock'); }
        }
      }
      if (!c.done && !c.broken && c.u > 4) {
        s.obj.waveT -= dt;
        if (s.obj.waveT <= 0) {
          s.obj.waveT = 15 + Math.random() * 4;
          const ahead = c.pts[Math.min(c.pts.length - 1, Math.floor(c.u / 2) + 14)] || c.pos;
          const n = 3 + (s.star >= 3 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
          s.spawnSquad(ahead, n, { minD: 10, maxD: 22, assault: c, minAway: 24 });
        }
      }
      if (c.done && !s.obj.reached) { s.obj.reached = true; s.objDone(); }
    },
    text(s) {
      const c = s.cart, pct = Math.round(c.u / c.L * 100);
      return { t: G.t('exp.obj.escort'), x: G.t(c.broken ? 'exp.prog.escortBroken' : c.waiting ? 'exp.prog.escortWait' : 'exp.prog.escort', { a: pct }), f: c.u / c.L };
    },
    markers(s) { const c = s.cart; if (!c.done) G.HUD.marker('obj0', _v.set(c.pos.x, c.pos.y + 3.6, c.pos.z), { icon: mk('escort'), color: c.broken ? '#ff6b8b' : '#3fe0b8' }); else G.HUD.removeMarker('obj0'); },
  };
  OBJ.boss = {
    init(s) { s.obj.spawned = false; s.obj.site = s.isl.sites.arena || { x: 0, z: 0, y: s.isl.hf(0, 0) }; s.obj.bossId = s.m.boss || 'crankcrab'; },
    update(s) {
      const site = s.obj.site, pl = s.world.player;
      if (!s.obj.spawned && pl.alive && U.distXZ(pl.pos, site) < 34) {
        s.obj.spawned = true;
        const pos = new V3(site.x, s.isl.hf(site.x, site.z), site.z);
        s.boss = X.spawnBoss(s.world, s.obj.bossId, pos, { arena: { x: pos.x, z: pos.z, r: 22 }, clearArena: true, difficulty: s.diff, hpMult: s.heat.includes('armored') ? 1.3 : 1, yaw: Math.atan2(pl.pos.x - pos.x, pl.pos.z - pos.z) });
        s.bossName = s.boss.displayName || G.t('boss.name.' + s.obj.bossId);
        if (!s.boss.autoHud) G.UI.banner(s.bossName, G.t('boss.intro.' + s.obj.bossId), 2.6);
        if (G.Audio) { if (!s.boss.autoHud) G.Audio.sfx('bossRoar'); G.Audio.music('boss'); }
        G.HUD.removeMarker('obj0');
      }
      if (s.boss) {
        if (!s.boss.autoHud) G.HUD.setBoss(s.boss.alive ? s.bossName : null, s.boss.alive ? s.boss.hp / s.boss.maxHp : null);
        if (!s.boss.alive && !s.obj.won) {
          s.obj.won = true;
          const p = s.boss.pos.clone();
          if (!s.boss.autoHud) G.UI.banner(G.t('boss.down'), s.bossName, 2.5);
          G.bus.emit('objective', s.m.id);
          setTimeoutWorld(s, 2.2, () => X.chestFountain(s.world, new V3(p.x + 3, s.isl.hf(p.x + 3, p.z), p.z), { clinks: 0, yaw: Math.atan2(pl.pos.x - p.x, pl.pos.z - p.z) }));
          setTimeoutWorld(s, 5.5, () => s.end(true));
          s.phase = 'won';
          // victory window: the arena is cleared (17b bosses do it themselves; this also covers the Pinchbot King)
          // and the player can't be bonked out of the win now
          if (pl) pl.iframes = Math.max(pl.iframes || 0, 30);
          const robots = G.Enemies && G.Enemies.sys ? G.Enemies.sys(s.world).robots.slice() : [];
          for (const a of robots) if (a.alive && !a._parked && a !== s.boss && !a.isBoss && a.team === 1 && U.distXZ(a.pos, p) < 30) { if (a.opts) a.opts.noLoot = true; s.world.damage(a, 1e6, { src: s.boss, friendly: true, silent: true }); }
        }
      }
    },
    text(s) { return s.boss ? { t: G.t('exp.obj.boss'), x: G.t('exp.prog.bossFight', { name: s.bossName }), f: s.boss.hp / s.boss.maxHp } : { t: G.t('exp.obj.boss'), x: G.t('exp.prog.boss'), f: null }; },
    markers(s) { if (!s.obj.spawned) { const st = s.obj.site; G.HUD.marker('obj0', _v.set(st.x, (st.y || s.isl.hf(st.x, st.z)) + 6, st.z), { icon: mk('boss'), color: '#ffd23f' }); } },
  };
  OBJ.reach = {
    init(s) {
      const bm = s.isl.sites.bigMesa;
      const pos = bm && bm.cache ? bm.cache.clone() : s.isl.spawn.pos.clone().add(new V3(20, 0, 0));
      const c = chestParts();
      const root = new THREE.Group(); root.position.copy(pos); root.add(c.base); c.lid.position.set(0, 0.9, 0.55); c.base.add(c.lid);
      root.scale.setScalar(1.1);
      s.world.add(root);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 40, 12, 1, true), G.M.basic(0x39d5ff, { transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.set(0, 20, 0); root.add(beam);
      s.obj.cache = { pos, root, lid: c.lid, beam, open: false };
      s.world.addInteract({ pos, r: 3, key: 'exp.int.cache', enabled: () => !s.obj.cache.open, onUse: () => {
        const ca = s.obj.cache; ca.open = true; ca.beam.visible = false;
        s.world.fx.timed(new THREE.Object3D(), 0.6, k => { ca.lid.rotation.x = -k * 1.9; });
        s.world.fx.confetti(_v.copy(pos).setY(pos.y + 1.4), 50);
        s.world.pickups.boltBurst(_v.copy(pos).setY(pos.y + 1.4), 60);
        G.UI.banner(G.t('exp.cache'), '', 2);
        if (G.Audio) G.Audio.sfx('levelup');
        s.objDone();
      } });
    },
    text(s) { return { t: G.t('exp.obj.reach'), x: G.t('exp.prog.reach'), f: null }; },
    markers(s) { const c = s.obj.cache; if (!c.open) G.HUD.marker('obj0', _v.copy(c.pos).setY(c.pos.y + 2.4), { icon: mk('reach'), color: '#ffd23f' }); else G.HUD.removeMarker('obj0'); },
  };
  OBJ.elitecamps = {
    init(s) {
      const camps = s.camps.slice().sort((a, b) => U.distXZ(b, s.isl.spawn.pos) - U.distXZ(a, s.isl.spawn.pos));
      const pick = [];
      for (const c of camps) { if (pick.length >= (s.m.n || 3)) break; if (pick.every(p => U.distXZ(p, c) > 40)) pick.push(c); }
      for (const c of camps) { if (pick.length >= (s.m.n || 3)) break; if (!pick.includes(c)) pick.push(c); }
      for (const c of pick) { c.eliteCamp = true; c.budget += 2; }
      s.obj.camps = pick; s.obj.n = pick.length; s.obj.a = 0;
    },
    update(s) {
      let a = 0;
      for (const c of s.obj.camps) { if (c.cleared) a++; }
      if (a !== s.obj.a) { s.obj.a = a; G.HUD.feed(G.t('exp.campClear'), 'rgba(255,194,26,0.9)'); if (a >= s.obj.n) s.objDone(); }
    },
    text(s) { return { t: G.t('exp.obj.elitecamps'), x: G.t('exp.prog.elitecamps', { a: s.obj.a, b: s.obj.n }), f: s.obj.a / s.obj.n }; },
    markers(s) { nearestMarks(s, s.obj.camps.map(c => ({ on: !c.cleared, pos: new V3(c.x, c.y, c.z), y: 5 })), 'crown'); },
  };
  // Show markers only for the 3 nearest remaining targets (keeps the screen readable).
  function nearestMarks(s, list, icon) {
    const pl = s.world.player;
    const idx = list.map((e, i) => ({ e, i, d: e.on ? U.distXZ(pl.pos, e.pos) : 1e9 })).sort((a, b) => a.d - b.d);
    idx.forEach((q, k) => { if (q.e.on && k < 3) G.HUD.marker('obj' + q.i, _v.set(q.e.pos.x, q.e.pos.y + q.e.y, q.e.pos.z), { icon: mk(icon), color: '#ffd23f' }); else G.HUD.removeMarker('obj' + q.i); });
  }
  function partRarity(id) {
    const P = G.Data && G.Data.PARTS && G.Data.PARTS[id];
    if (P && P.rarity) return P.rarity;
    return { gel: 'uncommon', chip: 'uncommon', fuel: 'uncommon', crystal: 'rare', servo: 'rare', lens: 'rare', core: 'epic', lumite: 'epic' }[id] || 'common';
  }
  function mk(name) { return '<span style="display:inline-flex;width:15px;height:15px">' + X.icon(name) + '</span>'; }
  function setTimeoutWorld(s, sec, fn) { s.timers.push({ t: sec, fn }); }

  // ---------------------------------------------------------------- mode
  const MODE = {
    layout: 'fps', music: 'expedition', pausable: true,
    // pause → Return to Town: the quit keeps all clinks and half the parts (quitRewards), so the confirm says so — or,
    // once the run is won (boss popped / lift-off, before the results), that the win is kept
    get quitKey() { return S && wonAlready(S) ? 'exp.quitWon' : 'exp.quitConfirm'; },
    enter(params) {
      params = params || {};
      const m = typeof params.mission === 'object' && params.mission ? params.mission : (X.mission(params.mission) || X.MISSIONS[0]);
      const biome = params.biome && X.BIOMES[params.biome] ? params.biome : m.biome;
      const B = X.BIOMES[biome];
      const diff = X.applyDifficulty(params.difficulty);
      const heat = (params.heat || []).filter(h => X.HEAT.some(q => q.id === h)).slice(0, 5);
      const seed = params.seed != null ? params.seed : (m.seed || 1);
      const star = Math.max(m.star || 1, params.star || 0);
      const key = X.geoBiome(biome);
      const wo = G.Geo.biomeWorldOpts ? G.Geo.biomeWorldOpts(key) : {};
      const fogFar = Math.min(B.fog.far, Math.max(G.R.q().draw, B.fog.near + 70));
      const world = new G.World({ sky: Object.assign({}, wo.sky || {}, B.sky), fog: { color: B.fog.color, near: B.fog.near, far: fogFar }, light: Object.assign({}, wo.light || {}, B.light || {}), rules: {} });
      const s = S = {
        world, params: Object.assign({}, params, { mission: m.story ? m.id : (m.board ? m.id : m), biome, seed }), m, B, biome, diff, heat, star, seed,
        time: -0, par: X.parTime(m, heat), phase: 'explore', timers: [], obj: {}, camps: [], squads: [], bots: new Set(), parked: new Set(), crateSlots: [], cp: [],
        alarm: -0, alarmCalm: -0, alarmT: -0, hud: {}, tick: -0, markT: -0, ambT: -0, lastSafe: null, D: X.diffInfo(diff),
      };
      bindState();
      s.run =new X.Run({ badges: s.D.badges, lootMult: m.loot || 1 });
      const isl = s.isl = X.buildIsland(world, { biome, seed, mission: m, star });
      const sp0 = introSpawn(world, isl, m, star);
      s.lastSafe = sp0.pos.clone();
      s.checkpoint = sp0.pos.clone(); s.checkpointYaw = sp0.yaw;
      // ★1 runs and first clears: a quicker lift-off (shorter balloon wait and pad hold, one small wave)
      s.quickEx = star <= 1 || !!(m.story && !X.storyRec(m.id).done);
      X.makePlayer(world, sp0.pos.clone(), sp0.yaw, heat);
      // rules
      world.rules.onPickup = X.pickupRule(s.run, {
        player: () => world.player,
        onPart: (id, n) => { if (OBJ[m.type] && OBJ[m.type].onPart) OBJ[m.type].onPart(s, id, n); },
        onSprocket: (idx, fresh) => { const sp = s.sprockets && s.sprockets.find(q => q.idx === idx); if (sp) sp.taken = true; if (!fresh) s.oldSprocket = true; checkBonus(s); },
      });
      world.rules.onKill = (t, info) => s.onKill(t, info);
      world.rules.onDamage = (t, res, info) => s.onDamage(t, res, info);
      s.ko = X.KO(world, s.run, { respawnPos: () => s.checkpoint, yaw: () => s.checkpointYaw, onFail: () => s.end(false), grace: () => s.phase === 'won' || s.phase === 'liftoff' || s.phase === 'ending' });
      // HUD
      G.HUD.show({ objective: true, timer: true, minimap: true, bolts: true });
      G.HUD.minimapRange = 70;
      G.HUD.minimapDraw = (g, k, pl) => s.drawMinimap(g, k, pl);
      buildHud(s);
      // camps
      const eliteBase = [0, 0, 0, 0, 0.1, 0.2, 0.3][Math.min(6, star)] + (heat.includes('swarm') ? 0.2 : 0) + (m.eliteBoost || 0) + (s.D.elite || 0);
      s.eliteChance = eliteBase;
      s.roster = X.roster(star, biome);
      for (const c of isl.camps) s.camps.push({ x: c.x, y: c.y, z: c.z, i: c.i, budget: Math.round((4 + 2 * star) * (diff === 'breezy' ? 0.75 : 1)), spawned: false, list: [], parked: [], pending: [], cleared: false, alerted: false });
      // patrols (2–3 roaming groups) as small lazy camps along the paths
      const nPat = 2 + (star >= 3 ? 1 : 0);
      for (let i = 0; i < nPat && isl.segs.length; i++) {
        const sg = isl.segs[Math.floor(Math.random() * isl.segs.length)];
        if (Math.hypot(sg.bx - isl.spawn.pos.x, sg.bz - isl.spawn.pos.z) < 55) continue;
        s.camps.push({ x: sg.bx, y: isl.hf(sg.bx, sg.bz), z: sg.bz, i: 100 + i, budget: 2 + star, spawned: false, list: [], parked: [], pending: [], cleared: false, alerted: false, patrol: true, path: sg });
      }
      // objective + bonus
      const O = OBJ[m.type] || OBJ.sweep;
      s.O = O; s.obj.type = m.type;
      O.init(s);
      s.bonus = { type: m.bonus || 'crates', done: false };
      // checkpoints, sprockets, crystals, lumite, crates
      for (const c of isl.checkpoints) s.cp.push({ pos: new V3(c.x, c.y, c.z), active: false });
      for (const sp of isl.sprockets) {
        const old = X.sprocketHas(sp.idx);
        world.pickups.spawn('special', sp.pos, { sprocket: sp.idx, color: old ? 0xc9d2ea : 0xffc21a, life: 1e9, old }, new V3(0, 0, 0));
      }
      s.sprockets = isl.sprockets;
      for (const p of isl.crystals) s.crateSlots.push({ pos: p.clone(), kind: 'crystal' });
      for (const p of isl.lumites) s.crateSlots.push({ pos: p.clone(), kind: 'lumite', high: true });
      for (const c of isl.crates) s.crateSlots.push({ pos: c.pos.clone(), kind: c.kind });
      for (const sl of s.crateSlots) { sl.actor = null; sl.done = false; }
      // every camp robot, crate and a reinforcement reserve: built now, parked until needed (see park / wake)
      s.esys = G.Enemies && G.Enemies.sys ? G.Enemies.sys(world) : null;
      prebuildCamps(s);
      prebuildReserve(s);
      prebuildCrates(s);
      (world._onDispose || (world._onDispose = [])).push(() => { for (const a of s.parked) G.safe('dispose parked', () => a.dispose()); s.parked.clear(); });
      // kiosk
      if (isl.kiosk && isl.kiosk.use) world.addInteract({ pos: isl.kiosk.use, r: 2.8, key: 'exp.int.kiosk', onUse: () => G.UI.open('exp-kiosk', { run: s.run }) });
      // jump pad hint once
      isl.jumpPads.onLaunch = () => { if (!s.padHint) { s.padHint = true; X.beepo('exp.hint.jumppad'); } };
      // beams for active checkpoints (shared material)
      s.beamMat = G.M.basic(0x8bea4a, { transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      s.beamGeo = new THREE.CylinderGeometry(0.35, 0.5, 70, 12, 1, true); s.beamGeo.translate(0, 35, 0);
      // intro
      const name = X.missionName(m);
      // the title card waits for the first frame of play (shown inside enter() it ran out behind the loading screen)
      setTimeoutWorld(s, 0.05, () => G.UI.banner(name, goalText(s), 2.8));
      // (hints only while still exploring: never over the extraction or the results screen)
      setTimeoutWorld(s, 3.0, () => { if (s.phase === 'explore') X.beepo('exp.hint.' + m.type, { part: s.obj.part ? X.partName(s.obj.part) : '' }); });   // after the title banner
      setTimeoutWorld(s, 14, () => { if (s.phase === 'explore') X.beepo('exp.hint.beacon'); });
      startMech(s);
      prewarmProps(s);
      X.prebuildNav(world);
      G.bus.emit('mode-start', 'expedition', s.params);
      s.music = 'expedition';
      return world;
    },
    exit() {
      // left (Return to Town / Restart) in the victory window before the results: still a win, paid and recorded
      if (S && S.run && wonAlready(S)) X.winToast(end(S, true, true));
      else if (S && S.phase !== 'done' && S.run) quitRewards(S);
      G.HUD.minimapDraw = null;
      S = null;
    },
    update(dt) {
      const s = S; if (!s) return;
      if (!s.detached) { s.detached = true; detachParked(s); }   // (the load warm-up has drawn them by now)
      for (let i = s.timers.length - 1; i >= 0; i--) { const t = s.timers[i]; t.t -= dt; if (t.t <= 0) { s.timers.splice(i, 1); t.fn(); } }
      if (s.phase === 'done') return;
      const w = s.world, pl = w.player;
      if (s.phase !== 'liftoff') { s.time += dt; s.run.time = s.time; }
      s.isl.update(dt);
      s.ko.update(dt);
      trickleCamps(s);
      s.tick += dt;
      if (s.tick >= 0.25) { const T = s.tick; s.tick = 0; slowTick(s, T); }
      if (s.O.update) s.O.update(s, dt);
      updateExtraction(s, dt);
      updateSafety(s, dt);
      updateAlarm(s, dt);
      ambient(s, dt);
      updateHud(s, dt);
      if (s.mech) X.mechPre(s.mech, pl);   // (the ice blends the player's velocity change of the coming world step)
    },
    lateUpdate(dt) {
      const s = S; if (!s || !s.mech || !s.mech.late || s.phase === 'done') return;
      s.mech.late(dt);
    },
    restart() { const p = S ? S.params : {}; G.Game.go('expedition', p); },
  };
  G.Game.register('expedition', MODE);
  X.expeditionMode = MODE;

  // First steps: on ★1 story sweep / parts runs the player starts ~34 m from the nearest camp, facing it, so
  // the first bots are in view straight away (the landing pad sits 55+ m from every camp). Falls back to the
  // landing pad when no clear, dry, prop-free spot is found on the way.
  function introSpawn(world, isl, m, star) {
    const base = { pos: isl.spawn.pos, yaw: isl.spawn.yaw };
    if (!(m.story && star <= 1 && (m.type === 'sweep' || m.type === 'parts'))) return base;
    const sp = isl.spawn.pos;
    let best = null, bd = 1e9;
    for (const c of isl.camps) { const d = Math.hypot(c.x - sp.x, c.z - sp.z); if (d < bd) { bd = d; best = c; } }
    if (!best) return base;
    const yawTo = (x, z) => Math.atan2(-(best.x - x), -(best.z - z));
    if (bd < 42) return { pos: base.pos, yaw: yawTo(sp.x, sp.z) };
    const dx = (best.x - sp.x) / bd, dz = (best.z - sp.z) / bd;
    for (const want of [34, 36, 32, 38, 30, 40]) {
      for (const side of [0, 2.5, -2.5, 5, -5]) {
        const x = best.x - dx * want - dz * side, z = best.z - dz * want + dx * side;
        const h = isl.hf(x, z);
        if (h < 1.3) continue;
        if (Math.abs(isl.hf(x + 1.5, z) - isl.hf(x - 1.5, z)) > 1.4 || Math.abs(isl.hf(x, z + 1.5) - isl.hf(x, z - 1.5)) > 1.4) continue;
        if (Math.abs(world.phys.groundAt(x, z, 0.7, h + 30) - h) > 0.3) continue;   // a tree / rock / tent stands here
        return { pos: new V3(x, h + 0.1, z), yaw: yawTo(x, z) };
      }
    }
    return base;
  }
  function goalText(s) {
    const m = s.m, t = m.type;
    if (t === 'sweep') return G.t('exp.goal.sweep', { n: s.obj.n });
    if (t === 'parts') return G.t('exp.goal.parts', { n: s.obj.n, part: X.partName(s.obj.part) });
    if (t === 'totem') return G.t('exp.goal.totem', { n: s.obj.n });
    if (t === 'rescue') return G.t('exp.goal.rescue', { n: s.obj.n });
    if (t === 'boss') return G.t('exp.goal.boss', { name: G.t('boss.name.' + (m.boss || 'crankcrab')) });
    if (t === 'elitecamps') return G.t('exp.goal.elitecamps', { n: s.obj.n });
    return G.t('exp.goal.' + t);
  }

  // ---------------------------------------------------------------- spawning
  function aliveBots(s) { let n = 0; for (const a of s.bots) { if (a.alive) n++; else s.bots.delete(a); } return n; }
  // Per-group limits keep camps varied and fair: never a pack of 3 Rollos (burst) or 3 Squirts (crossfire);
  // Tote-copters only arrive through the alarm (GDD §11a), never sit in a camp.
  const GROUP_MAX = { rollo: 2, squirt: 2, gnat: 2, lobba: 2, bruiser: 1, pinch: 2, zapper: 2 };
  function pickType(s, budgetLeft, opts) {
    const r = s.roster;
    const w = {}, have = (opts && opts.have) || null;
    for (const t of r) {
      const th = X.threat(t, false); if (th > budgetLeft || t === 'tote') continue;
      if (have && (have[t] || 0) >= (GROUP_MAX[t] != null ? GROUP_MAX[t] : 3)) continue;
      w[t] = X.tier(t) === 1 ? 6 : X.tier(t) === 2 ? 3 : 1.4;
    }
    if (opts && opts.noStill) delete w.squirt;
    const keys = Object.keys(w);
    if (!keys.length) return null;
    return U.weighted(w).id;
  }
  function enemyOpts(s, extra) {
    const o = Object.assign({ hpMult: s.heat.includes('armored') ? 1.3 : 1, speedMult: s.heat.includes('zippy') ? 1.2 : 1, difficulty: s.diff }, extra || {});
    return o;
  }
  // ---------------------------------------------------------------- robot + crate pools
  // Nothing is constructed on a gameplay frame as the player explores. Every camp's robots, every crate slot's crate
  // and a small reserve of reinforcement robots are built while the mode loads and parked: out of world.actors (no
  // update, no hits, no minimap dot) with their meshes hidden — the load warm-up (R.warmup) draws hidden objects too,
  // so their programs, buffers, LED faces and bone textures are compiled and uploaded behind the loading screen — and
  // taken out of the scene on the first frame of play. A camp the player comes near wakes its parked robots (an
  // array push and a scene add); a dormant camp far away parks its idle robots again (they used to be destroyed and
  // rebuilt); crates stream in and out the same way. A camp robot build cost 1.5-27 ms on a gameplay frame in the
  // perf runs (first of a kind the most), a crate up to ~2 ms; waking one costs well under 0.1 ms.
  // A parked robot also leaves the enemy system's robot list (crates: its crate list) until it wakes: that list is the
  // live-robot count of the Tote-copter drop cap (40 — ~70-90 parked camp robots in it stopped every drop), the crowd
  // LOD and robot separation, and alert propagation (a live robot alerted within 12 m of a parked one alerted it: an
  // "!" badge and an alert sound over an invisible robot, and a codex entry for a robot never seen).
  function sysList(s, a) { const es = s.esys; return es ? (a.isCrate ? es.crates : es.robots) : null; }
  function park(s, a, atLoad) {
    const w = s.world, i = w.actors.indexOf(a);
    if (i >= 0) w.actors.splice(i, 1);
    s.bots.delete(a);
    a._parked = true;
    s.parked.add(a);
    const L = sysList(s, a), j = L ? L.indexOf(a) : -1;
    if (j >= 0) { L.splice(j, 1); a._sysOut = true; }
    if (a.mesh) { a.mesh.visible = false; if (!atLoad && a.mesh.parent) a.mesh.parent.remove(a.mesh); }
  }
  function wake(s, a, crate) {
    if (!a._parked) return a;
    a._parked = false;
    s.parked.delete(a);
    if (a._sysOut) { a._sysOut = false; const L = sysList(s, a); if (L && L.indexOf(a) < 0) L.push(a); }
    if (a.mesh) a.mesh.visible = true;
    s.world.addActor(a);   // (re-adds the mesh: detached since the first frame)
    // its blob shadows / glow sprites go back into the scene's shared layers (detached, the layers released them to
    // draw on their own: a woken crate cost 2 extra draw calls; robots re-adopt by themselves when they animate)
    if (a.mesh && G.Geo.useLayers) G.Geo.useLayers(a.mesh, s.world);
    if (!crate) s.bots.add(a);
    return a;
  }
  // first frame of play (after the load warm-up drew them): parked meshes leave the scene (no matrix updates, no
  // shared-layer shadows)
  function detachParked(s) {
    for (const a of s.parked) if (a.mesh && a.mesh.parent) a.mesh.parent.remove(a.mesh);
  }
  // a parked robot that was killed anyway is disposed here: it is in no actor list, so the world would never free it
  function dropParked(s, a) { s.parked.delete(a); a._parked = false; a._sysOut = false; G.safe('dispose parked', () => a.dispose()); }
  function campSpot(s, c) {
    const a = Math.random() * TAU, d = c.patrol ? 1 + Math.random() * 3 : 2.5 + Math.random() * 4.5;
    const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
    return new V3(x, s.world.phys.groundAt(x, z, 0.5, s.isl.hf(x, z) + 1.5), z);
  }
  function campBotOpts(s, c, e) {
    const patrol = c.patrol && c.path ? [new V3(c.path.ax, s.isl.hf(c.path.ax, c.path.az), c.path.az), new V3(c.path.bx, s.isl.hf(c.path.bx, c.path.bz), c.path.bz)] : null;
    return enemyOpts(s, { elite: e.elite, group: c, behavior: patrol ? 'roam' : 'guard', patrol, home: new V3(c.x, c.y, c.z), leash: 18, crown: e.elite && c.eliteCamp });
  }
  // (load) every camp's roster, built and parked; a robot that fails to build stays a pending entry (built on wake)
  function prebuildCamps(s) {
    for (const c of s.camps) {
      c.list = []; c.parked = []; c.pending = [];
      const list = campRoster(s, c);
      c.total = list.length;
      for (const e of list) {
        const bot = G.safe('prebuild robot', () => X.spawnEnemy(s.world, e.type, campSpot(s, c), campBotOpts(s, c, e)));
        if (!bot) { c.pending.push(e); continue; }
        bot._camp = c; park(s, bot, true);
        c.list.push(bot); c.parked.push(bot);
      }
    }
  }
  // (load) a reserve for reinforcement squads, totem summons and the alarm: a few of each kind a squad can call
  function prebuildReserve(s) {
    s.reserve = [];
    const types = s.roster.filter(t => t !== 'squirt' && t !== 'tote' && X.threat(t, false) <= 2);
    const per = { escort: 3, rescue: 3, totem: 3 }[s.m.type] || 2, max = 16;
    // (parked far out at sea: the enemy system counts robots near the camera for its crowd LOD)
    const at = new V3(0, -8, -(s.isl.R + 60));
    for (let i = 0; i < per; i++) for (const t of types) {
      if (s.reserve.length >= max) break;
      const bot = G.safe('prebuild reserve', () => X.spawnEnemy(s.world, t, at.clone(), enemyOpts(s, {})));
      if (bot) { park(s, bot, true); s.reserve.push(bot); }
    }
    if (s.roster.includes('tote') && X.enemyKnown('tote')) { const bot = G.safe('prebuild reserve', () => X.spawnEnemy(s.world, 'tote', at.clone(), enemyOpts(s, {}))); if (bot) { park(s, bot, true); s.reserve.push(bot); } }
  }
  // A reserve robot of this kind moved to where the squad appears (its home, ground and path state follow), or null.
  function fromReserve(s, type, p, assault) {
    const R = s.reserve; if (!R) return null;
    for (let i = 0; i < R.length; i++) {
      const a = R[i];
      if (a.enemyId !== type) continue;
      R.splice(i, 1);
      if (!a.alive) { dropParked(s, a); return null; }
      a.pos.copy(p);
      if (a.home && a.home.copy) a.home.copy(p);
      if (a.lastThinkPos && a.lastThinkPos.copy) a.lastThinkPos.copy(p);
      a.groundY = s.world.phys.groundAt(p.x, p.z, a.r * 0.7, p.y + 3);
      if (a.fly) a.pos.y = a.groundY + (a.alt || 0) * 0.9; else a.pos.y = a.groundY;
      if (a.vel) a.vel.set(0, 0, 0);
      if (a._vyaw) a._vyaw.x = NaN;
      a.path = null;
      a.behavior = assault ? 'assault' : 'roam'; a.assaultTarget = assault || null;
      if (a.mesh) a.mesh.position.copy(a.pos);
      wake(s, a);
      if (a.rb && a.rb.spawnIn) G.safe('spawnIn', () => a.rb.spawnIn());
      return a;
    }
    return null;
  }
  // (load) every crate slot's crate, built and parked (streamed in / out by slowTick)
  function crateY(s, sl) { return sl.high ? s.world.phys.groundAt(sl.pos.x, sl.pos.z, 0.3, sl.pos.y + 1.2) : s.world.phys.groundAt(sl.pos.x, sl.pos.z, 0.5, s.isl.hf(sl.pos.x, sl.pos.z) + 1); }
  function prebuildCrates(s) {
    for (const sl of s.crateSlots) {
      sl.actor = G.safe('prebuild crate', () => X.spawnCrate(s.world, sl.kind, new V3(sl.pos.x, crateY(s, sl), sl.pos.z), {})) || null;
      if (sl.actor) park(s, sl.actor, true);
    }
  }
  // The robots a camp holds: guards first, then a mix within its threat budget.
  function campRoster(s, c) {
    let budget = c.budget;
    const list = [];
    if (c.guards && X.enemyKnown(c.guards)) { list.push({ type: c.guards, elite: false }); budget -= 4; }
    let guard = 0;
    const have = {};
    while (budget > 0 && guard++ < 30) {
      const elite = c.eliteCamp || Math.random() < s.eliteChance;
      const type = pickType(s, budget / (elite ? 2 : 1), { noStill: !!c.patrol, have });
      if (!type) break;
      list.push({ type, elite });
      have[type] = (have[type] || 0) + 1;
      budget -= X.threat(type, elite);
    }
    return list;
  }
  // Wake a camp's parked robots (up to the live-robot cap); a pending entry (its build failed at load) is built here,
  // at most one per frame. Returns how many arrived.
  function flushCamp(s, c, maxBuild) {
    const cap = X.maxBots();
    let alive = aliveBots(s), n = 0;
    while (c.parked.length && alive < cap) {
      const a = c.parked.shift();
      if (!a.alive) { dropParked(s, a); continue; }
      wake(s, a); n++; alive++;
      if (c.alerted) X.alert(a, s.world.player);
    }
    let built = 0;
    while (c.pending.length && alive < cap && built < (maxBuild || 1)) {
      const e = c.pending.shift();
      const bot = X.spawnEnemy(s.world, e.type, campSpot(s, c), campBotOpts(s, c, e));
      bot._camp = c;
      if (c.alerted) X.alert(bot, s.world.player);
      c.list.push(bot); s.bots.add(bot);
      alive++; n++; built++;
    }
    return n;
  }
  // Camps the player came near wake their robots (no construction: they were built at load).
  function trickleCamps(s) {
    const pl = s.world.player;
    for (const c of s.camps) {
      if (!c.flush) continue;
      if ((!c.pending.length && !c.parked.length) || U.distXZ(pl.pos, c) > 60 || !flushCamp(s, c, 1)) c.flush = false;
    }
  }
  // Combat pressure: reinforcement squads (ambushes, escort waves, extraction waves, alarm) top the fight up to
  // this many alerted bots near the player, never beyond. The live-robot cap (X.maxBots) is a render budget;
  // this one is about fairness, so a higher-quality phone doesn't mean a harder fight.
  function pressureLeft(s, center) {
    const cap = ({ breezy: 6, normal: 9, spicy: 11, blazing: 13 }[s.diff] || 9) + Math.floor(s.star / 2);
    let n = 0;
    const pl = s.world.player;
    for (const a of s.bots) if (a.alive && X.isAlerted(a) && (U.distXZ(a.pos, pl.pos) < 45 || U.distXZ(a.pos, center) < 30)) n++;
    return cap - n;
  }
  // Out-of-view squad near a point. opts: {minD, maxD, assault, minAway, alert, types, force}
  function spawnSquad(s, center, n, opts) {
    opts = opts || {};
    const pl = s.world.player, out = [];
    const cap = X.maxBots();
    if (!opts.force) n = Math.min(n, Math.max(opts.min || 0, pressureLeft(s, center)));
    for (let i = 0; i < n; i++) {
      if (aliveBots(s) >= cap) break;
      const p = s.isl.spot(center, opts.minD || 10, opts.maxD || 24, pl, opts.minAway != null ? opts.minAway : 22);
      if (!p) continue;
      const type = opts.types ? U.pick(opts.types) : (pickType(s, 2, { noStill: true }) || 'bumbler');
      const assault = opts.assault && Math.random() < 0.6 ? opts.assault : null;
      const elite = Math.random() < s.eliteChance * 0.5;
      // (from the reserve built at load; an elite or a used-up reserve builds one here)
      const bot = (!elite && fromReserve(s, type, p, assault)) || X.spawnEnemy(s.world, type, p, enemyOpts(s, { elite, behavior: assault ? 'assault' : undefined, assaultTarget: assault || undefined }));
      if (opts.alert !== false) X.alert(bot, assault || pl);
      s.bots.add(bot); out.push(bot);
      s.world.fx.ring(p.clone().setY(p.y + 0.1), 2, 0xff7a3d, 0.5);
    }
    return out;
  }
  function slowTick(s, T) {
    const pl = s.world.player;
    // camps: activate near the player, flush queues, alert propagation, cleared state
    for (const c of s.camps) {
      const d = U.distXZ(pl.pos, c);
      // (a region rule may hold a camp's robots back: the Glowcap dim camps until they are lit — see 21b mechanics)
      if (!c.spawned && d < 50 && !c.hold) { c.spawned = true; c.flush = true; }
      for (let i = c.parked.length - 1; i >= 0; i--) if (!c.parked[i].alive) dropParked(s, c.parked.splice(i, 1)[0]);
      if (c.spawned) {
        if ((c.pending.length || c.parked.length) && d < 54 && !c.hold) c.flush = true;
        // dormant camps: idle bots far from the player are parked again (keeps live bots low; nothing is rebuilt later)
        if (!c.alerted && d > 85) {
          for (const a of c.list) if (a.alive && !a._parked && !X.isAlerted(a)) { park(s, a); c.parked.push(a); }
        }
        if (!c.alerted) {
          for (const a of c.list) if (!a._parked && X.isAlerted(a)) { c.alerted = true; break; }
          if (c.alerted) { for (const a of c.list) X.alert(a, pl); s.alarm = Math.min(1, s.alarm + 0.14); }
        }
        if (!c.cleared && !c.pending.length && !c.parked.length && c.list.length && c.list.every(a => !a.alive)) {
          c.cleared = true;
          if (!c.patrol && s.m.type !== 'elitecamps') s.world.pickups.boltBurst(new V3(c.x, c.y + 1, c.z), 12 + s.star * 4);
        }
      }
    }
    // far idle bots are tiny on screen: hide them to save draw calls
    for (const a of s.bots) if (a.alive && a.mesh) { const far = U.distXZ(pl.pos, a.pos) > 58 && !X.isAlerted(a); if (a.mesh.visible === far) a.mesh.visible = !far; }
    // crates: stream in/out
    for (const sl of s.crateSlots) {
      if (sl.done) continue;
      const d = U.distXZ(pl.pos, sl.pos), a = sl.actor;
      if (!a) { if (d < 38) sl.actor = X.spawnCrate(s.world, sl.kind, new V3(sl.pos.x, crateY(s, sl), sl.pos.z), {}); continue; }   // (its build failed at load)
      if (a._parked) { if (d < 38) wake(s, a, true); continue; }
      if (!a.alive) {
        sl.done = true;
        if (sl.kind !== 'crystal') s.run.crates++;
        if (s.obj.caches && s.m.type === 'parts' && sl.cache) { for (let i = 0; i < 2; i++) s.world.pickups.spawn('part', a.pos.clone().setY(a.pos.y + 0.8), { partId: s.obj.part, rarity: s.obj.rarity }); }
      } else if (d > 52 && a.hp >= a.maxHp && !(a.fuseT > 0) && !(a.fuse > 0)) park(s, a);
    }
    // checkpoints
    for (const c of s.cp) {
      if (c.active) continue;
      if (pl.alive && U.distXZ(pl.pos, c.pos) < 3.6 && Math.abs(pl.pos.y - c.pos.y) < 3) activateCheckpoint(s, c);
    }
    // sweep needs enough bots: reinforce near the player when the island runs dry
    if (s.m.type === 'sweep' && s.phase === 'explore') {
      let left = 0; for (const c of s.camps) { left += c.pending.length; for (const a of c.parked) if (a.alive) left++; }
      if (s.O.need(s) > left + aliveBots(s) && aliveBots(s) < 4) { s.reinT = (s.reinT || 0) - T; if (s.reinT <= 0) { s.reinT = 10; spawnSquad(s, pl.pos, 4, { minD: 26, maxD: 40, minAway: 26 }); } }
    }
    // markers (objective + nearest unvisited checkpoint)
    s.O.markers && s.O.markers(s);
    let best = null, bd = 70;
    for (const c of s.cp) { if (c.active) continue; const d = U.distXZ(pl.pos, c.pos); if (d < bd) { bd = d; best = c; } }
    if (best) G.HUD.marker('cp', _v.copy(best.pos).setY(best.pos.y + 3), { icon: mk('beacon'), color: '#9fe8ff', edge: false }); else G.HUD.removeMarker('cp');
    // sprocket hint when near an uncollected one
    // (not during the title card and the mission hint: a start near a camp can also be near a sprocket)
    if (s.time > 6) for (const sp of s.sprockets) { if (!sp.hinted && !X.sprocketHas(sp.idx) && pl.pos.distanceTo(sp.pos) < 22) { sp.hinted = true; X.beepo('exp.hint.sprocket'); } }
    checkBonus(s);
    mechTick(s, T);
    crowdReach(s, T);
    s.nextAct = nextAction(s);
  }
  // Crowd / foliage distance scaling (render budget): while many robots are awake around the player, the windowed
  // grass + flower field draws less far (it is the biggest triangle cost after the robots on High / Ultra; a fight
  // hides the rim anyway). 6 robots or fewer within 70 m (about the robots' full-detail range): full reach; 16 or
  // more: High 0.62, Ultra 0.56 (Medium / Low keep theirs). Eased (0.8 per second in, 0.25 out) so the rim moves
  // smoothly. (The floors were set once parked robots stopped counting as a crowd for the robots' own distance LOD —
  // that ghost crowd had been pushing the robots to their light LOD early and hid ~2k triangles of a 13-robot camp.)
  function crowdReach(s, T) {
    const f = s.isl.foliage; if (!f || !f.setReach) return;
    const q = G.R.qualityName(), lo = q === 'ultra' ? 0.56 : q === 'high' ? 0.62 : 1;
    let n = 0;
    const pl = s.world.player;
    for (const a of s.bots) if (a.alive && a.mesh && a.mesh.visible && U.distXZ(a.pos, pl.pos) < 70) n++;
    const want = lo >= 1 ? 1 : n <= 6 ? 1 : n >= 16 ? lo : U.lerp(1, lo, (n - 6) / 10);
    const cur = f.reachK || 1, step = (want < cur ? 0.8 : 0.25) * T;   // (draws in quickly as a fight starts, out slowly)
    f.setReach(Math.abs(want - cur) <= step ? want : cur + Math.sign(want - cur) * step);
  }
  // The one next thing to do, for the hint line under the objective (+ the marker icon it refers to). Shared
  // constant entries: the HUD compares them by identity (no allocation, no string building per frame).
  const NA = {};
  for (const [id, k, i] of [['balloon', 'exp.next.balloon', 'extract'], ['stay', 'exp.next.stay', 'extract'], ['pad', 'exp.next.pad', 'extract'],
    ['boss', 'exp.next.boss', 'boss'], ['lair', 'exp.next.lair', 'boss'], ['fix', 'exp.next.fix', 'escort'], ['cart', 'exp.next.cart', 'escort'],
    ['pop', 'exp.next.pop', 'sweep'], ['beam', 'exp.next.beam', 'reach'], ['cage', 'exp.next.cage', 'rescue'], ['totem', 'exp.next.totem', 'totem'],
    ['camp', 'exp.next.camp', 'crown'], ['parts', 'exp.next.parts', 'parts'], ['marker', 'exp.next.marker', 'sweep']]) NA[id] = Object.freeze({ k, i });
  function nextAction(s) {
    const pl = s.world.player;
    if (!pl) return null;
    if (s.phase === 'call') return NA.balloon;
    if (s.phase === 'hold') return s.ex && s.ex.inside ? NA.stay : NA.pad;
    if (s.phase !== 'explore' || s.freeing || s.obj.repairing) return null;
    const t = s.m.type;
    if (t === 'boss') return s.boss ? NA.boss : NA.lair;
    if (t === 'escort') return s.cart && s.cart.broken ? NA.fix : NA.cart;
    // "pop" once bots are close (or already fighting); further away the marker leads the way
    let near = false;
    for (const a of s.bots) { if (!a.alive || !a.mesh || !a.mesh.visible) continue; const d = U.distXZ(a.pos, pl.pos); if (d < 20 || (d < 32 && X.isAlerted(a))) { near = true; break; } }
    if (near) return NA.pop;
    if (t === 'reach') return NA.beam;
    if (t === 'rescue') return NA.cage;
    if (t === 'totem') return NA.totem;
    if (t === 'elitecamps') return NA.camp;
    if (t === 'parts') return NA.parts;
    return NA.marker;
  }
  function activateCheckpoint(s, c) {
    c.active = true;
    s.checkpoint = c.pos.clone().add(new V3(1.6, 0.2, 0));
    s.checkpointYaw = s.world.player.yaw;
    const beam = new THREE.Mesh(s.beamGeo, s.beamMat); beam.position.copy(c.pos).setY(c.pos.y + 1); beam.renderOrder = 3;
    s.world.add(beam); c.beam = beam;
    const spr = G.R.glowSprite(0x8bea4a, 3, 0.8); spr.position.copy(c.pos).setY(c.pos.y + 2); s.world.add(spr);
    s.world.fx.ring(c.pos.clone().setY(c.pos.y + 0.3), 4, 0x8bea4a, 0.6);
    s.world.fx.burst(c.pos.clone().setY(c.pos.y + 2), [0x8bea4a, 0xffffff], 20, 6, 0.3, 0.6, { up: 3 });
    G.HUD.feed(G.t('exp.checkpoint'), 'rgba(139,234,74,0.9)');
    if (G.Audio) G.Audio.sfx('quest');
    const p = s.world.player; if (p.alive) { p.hp = Math.max(p.hp, p.maxHp * 0.6); }
  }
  // Totems spawn 3 T1 bots every 10 s while damaged (cap 6 alive per totem).
  function totemSpawn(s, t) {
    t.kids = t.kids.filter(a => a.alive);
    const n = Math.min(3, 6 - t.kids.length);
    for (let i = 0; i < n; i++) {
      if (aliveBots(s) >= X.maxBots()) break;
      const a = Math.random() * TAU, x = t.pos.x + Math.cos(a) * 3.2, z = t.pos.z + Math.sin(a) * 3.2;
      const type = U.pick(X.T1.filter(q => q !== 'squirt'));
      const p = new V3(x, s.isl.hf(x, z), z);
      const bot = fromReserve(s, type, p, null) || X.spawnEnemy(s.world, type, p, enemyOpts(s, { summon: true }));
      X.alert(bot, s.world.player);
      bot._summoned = true;
      t.kids.push(bot); s.bots.add(bot);
      s.world.fx.burst(new V3(x, s.isl.hf(x, z) + 0.8, z), [0xff3f8e, 0xffd23f], 12, 4, 0.3, 0.5);
    }
  }
  function ambush(s, pos, n) { spawnSquad(s, pos, n, { minD: 14, maxD: 22, minAway: 13 }); }

  // ---------------------------------------------------------------- events
  function onKill(s, t, info) {
    if (!t || t.team !== 1 || t.isCrate || t.isTotem || t.isPlayer || t.isHazard) return;
    const summon = !!(info && info.src && !info.src.isPlayer && info.src.team === 0);
    s.run.onPop(summon);
    if (t.elite) s.run.elites++;
    s.alarm = Math.min(1, s.alarm + 0.02); s.alarmCalm = 0;
    if (s.phase === 'explore' && s.O.onKill && !t.isBoss) s.O.onKill(s, t);
    const now = s.world.time;
    if (t._wet && now - t._wet < 1.2) chalAdd(s, 'poolPop');
    if (t._frost && now - t._frost < 1.5) chalAdd(s, 'frostPop');
  }
  function onDamage(s, t, res, info) {
    if (t.isPlayer) { s.run.damage += res.dealt; s.run.onHurt(); s.alarmCalm = 0; return; }
    if (t.team === 1 && info && info.src && info.src.isPlayer) {
      s.alarmCalm = 0;
      const c = t._camp;
      if (c && !c.alerted) { c.alerted = true; for (const a of c.list) X.alert(a, info.src); s.alarm = Math.min(1, s.alarm + 0.14); }
    }
  }
  // What streams in or appears later in a run — crystal nodes and crates (spawned within 38 m), checkpoint beams, the
  // extraction balloon, its ring and beam — is built now and parked hidden in the world: the load warm-up draws hidden
  // objects too (R.warmup), so their shader variants are compiled behind the loading screen (the crystal's faceted
  // vertex-colour variant was otherwise compiled on the frame the first crystal came within range), and the crate
  // kits / balloon geometry are cached before the first one is needed (a first crate kit cost ~0.5 s on a gameplay
  // frame in the perf runs). The extraction pieces are kept and shown by objDone.
  const CRATE_KIT = { wood: 'bolt', ammo: 'ammo', boom: 'explosive', health: 'health', lumite: 'rare' };   // (17_enemies' crate looks)
  function prewarmProps(s) {
    const w = s.world, Gg = G.Geo;
    const park = o => { if (o) { o.visible = false; o.name = o.name || 'expPrewarm'; w.add(o); } return o; };
    const kinds = new Set(s.crateSlots.map(sl => sl.kind));
    for (const k of kinds) G.safe('prewarm crate ' + k, () => {
      if (k === 'crystal') { if (Gg.crystal) park(Gg.crystal(1.1, 0xff7ab8, 7).mesh.clone()).position.set(0, -300, 0); }
      else if (Gg.crate && CRATE_KIT[k]) park(Gg.crate(CRATE_KIT[k])).position.set(0, -300, 0);
    });
    park(new THREE.Mesh(s.beamGeo, s.beamMat)).position.set(0, -300, 0);
    G.safe('prewarm extraction', () => {
      const bal = park(X.balloonProp().mesh);
      const ring = park(new THREE.Mesh(new THREE.TorusGeometry(6, 0.12, 6, 48).rotateX(PI / 2), exRingMat(false)));
      const beam = park(new THREE.Mesh(s.beamGeo, G.M.basic(0xffd23f, { transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
      for (const o of [bal, ring, beam]) o.position.set(0, -300, 0);
      s.exParts = { bal, ring, beam };
    });
  }
  const exRingMat = inside => G.M.basic(inside ? 0x8bea4a : 0xffd23f, { transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  // ---------------------------------------------------------------- region mechanics (21b) + region challenge
  // The island's signature mechanic (kelp pads + tide pools, updrafts + tumble-rocks, dim camps + light spores, ice +
  // frost crystals, belts + magnet cranes) runs on its own (isl.update / lateUpdate); the mode wires its events: the
  // first-time introduction (Beepo + a pulsing marker on the nearest piece, once per profile per region), the
  // Glowcap dim camps (their robots stay parked, shown as peeking eyes, until the camp is lit) and the region
  // challenge — one optional goal per region that uses the mechanic (shown under the bonus; a clink burst, no medal
  // change). Story ties: "Ribbon Ready" gets an updraft beside the tallest mesa, "Lights Out" puts two cages in the
  // dark, "Conveyor Chaos" lays belts on the cart road (the cart rides them faster).
  const CHAL = {
    shoals: { ev: 'poolPop', n: 3, need: M => M.pools.length, icon: 'sweep' },
    mesas: { ev: 'updraft', n: 3, need: M => M.drafts.length, icon: 'reach' },
    grotto: { ev: 'lit', n: 2, need: M => M.zones.length, icon: 'core' },
    frost: { ev: 'frostPop', n: 3, need: M => M.crystals.length, icon: 'shield' },
    junk: { ev: 'craneDrop', n: 3, need: M => M.cranes.length, icon: 'bolt' },
  };
  function startMech(s) {
    const M = X.mechStart && s.isl.mech ? X.mechStart(s.world, s.isl) : null;
    s.mech = M;
    if (!M) return;
    M.active = true;
    M.onEvent = (type, data) => onMech(s, type, data);
    // dim camps keep their robots parked until lit
    for (const c of s.camps) { const ic = !c.patrol && s.isl.camps[c.i]; if (ic && ic.dim) { c.dim = ic.dim; c.hold = true; } }
    const C = CHAL[s.biome];
    if (C && C.need(M) > 0) s.chal = { ev: C.ev, n: Math.min(C.n, C.ev === 'lit' ? M.zones.length : C.n), a: 0, done: false, icon: C.icon, key: 'exp.chal.' + s.biome };
  }
  function chalAdd(s, ev, k) {
    const c = s.chal; if (!c || c.done || c.ev !== ev || s.phase === 'done') return;
    c.a = Math.min(c.n, c.a + (k || 1));
    if (c.a >= c.n) {
      c.done = true;
      G.UI.toast(G.t('exp.chal.done'), { icon: X.icon('badge'), color: '#e6fbff' });
      if (G.Audio) G.Audio.sfx('star', { pitch: 1.15 });
      const pl = s.world.player;
      if (pl) s.world.pickups.boltBurst(_v.copy(pl.pos).setY(pl.pos.y + 1.5), 30 + 10 * s.star);
    }
  }
  function onMech(s, type, data) {
    if (s.phase === 'done') return;
    mechIntro(s, data && data.x != null ? data : null);
    if (type === 'updraft') chalAdd(s, 'updraft');
    else if (type === 'craneDrop') chalAdd(s, 'craneDrop');
    else if (type === 'lit') {
      chalAdd(s, 'lit');
      for (const c of s.camps) if (c.dim === data) { c.hold = false; }
      if (data && data.cage) G.HUD.feed(G.t('exp.mech.cageLit'), 'rgba(159,252,255,0.9)');
      else G.HUD.feed(G.t('exp.mech.lit'), 'rgba(159,252,255,0.9)');
      if (data && data.auto) X.beepo('exp.mech.autolit');
    }
  }
  // First time this profile meets the region's mechanic: Beepo explains it, a marker pulses on the nearest piece.
  function mechIntro(s, at) {
    const M = s.mech; if (!M || s.mechIntroDone) return;
    const pl = s.world.player; if (!pl) return;
    // (an event's own object — a pad, pool, column or zone — is not a piece: the marker takes the piece standing there,
    // so it gets that piece's label, height and ring size instead of the generic "Look!")
    const nb = at ? (M.near(at.x, at.z) || { piece: at, d: 0 }) : M.near(pl.pos.x, pl.pos.z);
    if (!nb || (!at && nb.d > 22)) return;
    s.mechIntroDone = true;
    const tip = 'mech_' + s.biome;
    if (G.Progress && G.Progress.tipSeen && G.Progress.tipSeen(tip)) return;
    if (G.Progress && G.Progress.markTip) G.Progress.markTip(tip);
    const rescueDark = s.biome === 'grotto' && M.zones.some(z => z.cage);
    X.beepo(rescueDark ? 'exp.mech.grottoCage' : 'exp.mech.' + s.biome, null, { dur: 5200 });
    const p = nb.piece, kind = p.kind || 'mech';
    const y = s.isl.hf(p.x, p.z) + (kind === 'dim' ? 5 : kind === 'updraft' ? 4 : 2.8);
    G.HUD.marker('mech', _v.set(p.x, y, p.z), { icon: mk('badge'), label: G.t('exp.mech.cue.' + kind), color: '#9ffcff', edge: true, dist: true });
    s.mechMarkT = 7;
    s.world.fx.ring(_v.set(p.x, s.isl.hf(p.x, p.z) + 0.2, p.z), Math.max(2, Math.min(6, (p.r || p.R || 1.5) + 0.5)), 0x9ffcff, 0.8);
  }
  // per slow tick: the intro check, the cue marker's lifetime, the dim camps' peeking eyes
  const _eyeQ = new THREE.Quaternion(), _eyeM = new THREE.Matrix4(), _eyeS = new V3(), _eyeE = new THREE.Euler();
  let SPORE_MK = null;
  function mechTick(s, T) {
    const M = s.mech; if (!M) return;
    if (!s.mechIntroDone && s.time > 4 && s.phase === 'explore') mechIntro(s, null);
    if (s.mechMarkT > 0 && (s.mechMarkT -= T) <= 0) G.HUD.removeMarker('mech');
    if (M.eyes) {
      const pl = s.world.player, t = s.world.time;
      let n = 0;
      for (const c of s.camps) {
        // (only dim camps in view range: the eyes are one instanced draw, but ~290 triangles a pair)
        if (!c.dim || c.dim.lit || U.distXZ(pl.pos, c) > 85) continue;
        for (const a of c.parked) {
          if (!a.alive || n >= M.eyeCap) continue;
          const ex = a.pos.x, ey = a.pos.y + (a.h || 1.2) * 0.72, ez = a.pos.z;
          const blink = Math.sin(t * 1.3 + a.pos.x * 3.1) > 0.93 ? 0.15 : 1;
          _eyeE.set(0, Math.atan2(pl.pos.x - ex, pl.pos.z - ez), 0); _eyeQ.setFromEuler(_eyeE);
          _eyeM.compose(_v.set(ex, ey, ez), _eyeQ, _eyeS.set(1.4, 1.4 * blink, 1.4));
          M.eyes.setMatrixAt(n++, _eyeM);
        }
      }
      for (const z of M.zones) {
        if (!z.cage || z.lit || n >= M.eyeCap || U.distXZ(pl.pos, z) > 85) continue;
        _eyeE.set(0, Math.atan2(pl.pos.x - z.x, pl.pos.z - z.z), 0); _eyeQ.setFromEuler(_eyeE);
        _eyeM.compose(_v.set(z.x, z.y + 0.9, z.z), _eyeQ, _eyeS.set(1.2, Math.sin(t * 1.7) > 0.9 ? 0.2 : 1.2, 1.2));
        M.eyes.setMatrixAt(n++, _eyeM);
      }
      M.eyes.count = n; M.eyes.visible = n > 0;
      if (n) M.eyes.instanceMatrix.needsUpdate = true;
    }
    // spore pods of an unlit dim zone close by get a marker (they are the way to light it)
    if (M.zones.length) {
      const pl = s.world.player;
      for (let i = 0; i < M.zones.length; i++) {
        const z = M.zones[i], near = !z.lit && U.distXZ(pl.pos, z) < z.R + 16 && s.phase === 'explore';
        for (let j = 0; j < z.pods.length; j++) {
          const pod = z.pods[j];
          if (!pod.mid) pod.mid = 'spore' + i + '_' + j;   // (ids and marker options made once, not every tick)
          const show = near && !pod.popped;
          if (show) { if (!pod.marked || (G.HUD.markers && !G.HUD.markers.has(pod.mid))) { pod.marked = true; G.HUD.marker(pod.mid, _v.set(pod.x, pod.y + 2.8, pod.z), SPORE_MK || (SPORE_MK = { icon: mk('core'), color: '#9ffcff', edge: false, dist: false })); } }
          else if (pod.marked) { pod.marked = false; G.HUD.removeMarker(pod.mid); }
        }
      }
    }
  }

  // ---------------------------------------------------------------- objective done → extraction
  function objDone(s) {
    if (s.phase !== 'explore') return;
    if (s.m.type === 'boss') return;
    s.phase = 'call';
    G.bus.emit('objective', s.m.id);
    G.UI.banner(G.t('exp.objDone'), G.t('exp.extract.call'), 2.4);
    if (G.Audio) G.Audio.sfx('questDone');
    for (let i = 0; i < 6; i++) G.HUD.removeMarker('obj' + i);
    const pl = s.world.player;
    const pads = s.isl.pads.slice();
    // a quick lift-off may also use the landing pad (whichever pad is nearest)
    const land = s.isl.pois.find(q => q.kind === 'spawn');
    if (land && (s.quickEx || !pads.length)) pads.push({ x: land.x, z: land.z, y: s.isl.hf(land.x, land.z) });
    if (!pads.length) pads.push({ x: s.isl.spawn.pos.x, z: s.isl.spawn.pos.z, y: s.isl.spawn.pos.y });
    let pad = pads[0];
    for (const p of pads) if (U.distXZ(p, pl.pos) < U.distXZ(pad, pl.pos)) pad = p;
    const pos = new V3(pad.x, pad.y != null ? pad.y : s.isl.hf(pad.x, pad.z), pad.z);
    // balloon wait / pad hold / bot waves: 20 s / 10 s / difficulty waves, or 8 s / 5 s / one small wave (quickEx)
    const callT = s.quickEx ? 8 : 20;
    s.ex = { pos, t: callT, T: callT, holdT: s.quickEx ? 5 : 10, waves: s.quickEx ? 1 : s.D.waves, hold: 0, wave: 0, lift: 0 };
    const toC = Math.atan2(-pos.z, -pos.x);
    s.ex.bpos = new V3(pos.x + Math.cos(toC) * 3.2, pos.y, pos.z + Math.sin(toC) * 3.2);
    // (built and warmed at load: prewarmProps)
    const xp = s.exParts || {}; s.exParts = null;
    const show = (o, make) => { o = o || make(); o.visible = true; if (o.parent !== s.world.scene) s.world.add(o); return o; };
    const bal = show(xp.bal, () => X.balloonProp().mesh); bal.position.copy(s.ex.bpos).setY(pos.y + 60); s.ex.balloon = bal;
    const ring = show(xp.ring, () => new THREE.Mesh(new THREE.TorusGeometry(6, 0.12, 6, 48).rotateX(PI / 2), exRingMat(false)));
    ring.position.copy(pos).setY(pos.y + 0.45); s.ex.ring = ring;
    const beam = show(xp.beam, () => new THREE.Mesh(s.beamGeo, G.M.basic(0xffd23f, { transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
    beam.position.copy(pos); beam.renderOrder = 3; s.ex.beam = beam;
    setTimeoutWorld(s, 2.6, () => { if (s.phase === 'call' || s.phase === 'hold') X.beepo('exp.hint.extract'); });
  }
  function updateExtraction(s, dt) {
    const e = s.ex; if (!e) return;
    const pl = s.world.player;
    const t = s.world.time;
    e.ring.scale.setScalar(1 + 0.03 * Math.sin(t * 5));
    if (s.phase === 'call') {
      e.t -= dt;
      e.balloon.position.y = e.pos.y + 0.3 + 60 * U.smoothstep(0, e.T, Math.max(0, e.t));
      e.balloon.rotation.y += dt * 0.3;
      if (e.t <= 0) { s.phase = 'hold'; spawnWave(s); }
    } else if (s.phase === 'hold') {
      const inside = pl.alive && U.distXZ(pl.pos, e.pos) < 6 && Math.abs(pl.pos.y - e.pos.y) < 4;
      if (inside) e.hold += dt;
      if (e.inside !== inside) { e.inside = inside; e.ring.material = exRingMat(inside); }
      e.balloon.position.y = e.pos.y + 0.3 + Math.sin(t * 1.5) * 0.15;
      if (e.wave < e.waves && e.hold >= 4.5) spawnWave(s);
      if (e.hold >= e.holdT) {
        s.phase = 'liftoff'; e.lift = 0; if (s.mech) s.mech.active = false;
        pl.inputEnabled = false; pl.vel.set(0, 0, 0); pl.iframes = 99; pl.hideVm = true;
        s.world.fx.confetti(_v.set(e.bpos.x, e.pos.y + 3, e.bpos.z), 70);
        G.UI.banner(G.t('exp.liftoff'), '', 2);
        if (G.Audio) G.Audio.sfx('go');
        for (const a of s.bots) if (a.alive && a.pos.distanceTo(e.pos) < 40) s.world.damage(a, 1e6, { src: null, type: 'magic', silent: true });
      }
    } else if (s.phase === 'liftoff') {
      e.lift += dt;
      const up = e.lift * e.lift * 2.2;
      e.balloon.position.y = e.pos.y + 0.3 + up;
      pl.pos.set(e.bpos.x, e.pos.y + 1.0 + up, e.bpos.z); pl.vel.set(0, 0, 0); pl.grounded = true;
      // cinematic: look out over the island as the balloon rises (not up into the envelope)
      pl.yaw = U.angleDamp(pl.yaw, Math.atan2(e.bpos.x, e.bpos.z), 2.5, dt);
      pl.pitch = U.damp(pl.pitch, -0.42, 2.5, dt);
      if (e.lift > 3.4) { s.phase = 'ending'; s.end(true); }
    }
  }
  function spawnWave(s) {
    const e = s.ex; e.wave++;
    const n = s.quickEx ? 2 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 3);
    G.UI.toast(G.t('exp.extract.wave'), { icon: X.icon('siren'), color: '#ffe0e6' });
    spawnSquad(s, e.pos, n, { minD: 24, maxD: 34, minAway: 20, min: 2 });
  }
  // ---------------------------------------------------------------- safety, alarm, ambient
  function updateSafety(s, dt) {
    const pl = s.world.player; if (!pl || !pl.alive || s.phase === 'liftoff') return;
    const h = s.isl.hf(pl.pos.x, pl.pos.z);
    if (pl.grounded && h > 0.6 && pl.pos.y > 0.4) { s.safeT = (s.safeT || 0) + dt; if (s.safeT > 0.4) { s.lastSafe.copy(pl.pos); s.safeT = 0; } }
    if (pl.pos.y < -1.1) {
      pl.pos.copy(s.lastSafe).y += 0.6; pl.vel.set(0, 0, 0);
      if (s.diff !== 'breezy') s.world.damage(pl, 10, { type: 'fall', friendly: true });
      G.UI.toast(G.t('hud.fell'));
    }
    const r = Math.hypot(pl.pos.x, pl.pos.z), lim = s.isl.R * 1.02;
    if (r > lim) { const k = (r - lim) * 4 * dt; pl.vel.x -= pl.pos.x / r * k * 6; pl.vel.z -= pl.pos.z / r * k * 6; }
  }
  function updateAlarm(s, dt) {
    s.alarmCalm += dt;
    if (s.alarmCalm > 30) s.alarm = Math.max(0, s.alarm - dt * 0.04);
    if (s.alarm >= 1 && s.star >= 2 && s.phase === 'explore') {
      s.alarmT -= dt;
      if (!s.alarmed) { s.alarmed = true; s.alarmT = 6; X.beepo('exp.hint.alarm'); if (G.Audio) G.Audio.sfx('warn'); }
      if (s.alarmT <= 0) {
        s.alarmT = 60;
        const pl = s.world.player;
        if (s.roster.includes('tote') && X.enemyKnown('tote')) spawnSquad(s, pl.pos, 1, { minD: 30, maxD: 42, minAway: 28, types: ['tote'], force: true });
        else spawnSquad(s, pl.pos, 3, { minD: 26, maxD: 38, minAway: 24 });
      }
    } else if (s.alarm < 0.7) s.alarmed = false;
  }
  function ambient(s, dt) {
    const pl = s.world.player; if (!pl) return;
    s.ambT += dt * G.R.q().particles;
    const B = s.B;
    const rate = B.spores ? 0.06 : B.id === 'frost' ? 0.05 : 0.18;
    while (s.ambT > rate) {
      s.ambT -= rate;
      const a = Math.random() * TAU, d = 2 + Math.random() * 14;
      _v.set(pl.pos.x + Math.cos(a) * d, pl.pos.y + Math.random() * 5, pl.pos.z + Math.sin(a) * d);
      if (B.spores) s.world.fx.spawn(_v, _v2.set(U.rand(-0.3, 0.3), U.rand(0.2, 0.6), U.rand(-0.3, 0.3)), U.pick([0x5cffe1, 0x7af0ff, 0xb983ff]), 0.13, 3.5, { grav: -0.05, drag: 0.4, alpha: 0.9 });
      else if (B.id === 'frost') { _v.y = pl.pos.y + 6 + Math.random() * 4; s.world.fx.spawn(_v, _v2.set(U.rand(-0.6, 0.6), -1.4, U.rand(-0.6, 0.6)), 0xffffff, 0.09, 4, { normal: true, grav: 0, drag: 0, alpha: 0.95 }); }
      else if (B.id === 'junk') s.world.fx.spawn(_v, _v2.set(U.rand(-0.4, 0.4), U.rand(0.3, 0.9), U.rand(-0.4, 0.4)), U.pick([0xffb070, 0xffd23f]), 0.07, 2.2, { grav: -0.1, drag: 0.3, alpha: 0.8 });
      else s.world.fx.spawn(_v, _v2.set(U.rand(-0.3, 0.3), U.rand(0.05, 0.3), U.rand(-0.3, 0.3)), 0xfff6c8, 0.06, 3, { grav: 0, drag: 0.2, alpha: 0.7 });
    }
    // sprocket sparkle
    for (const sp of s.sprockets) if (!sp.taken && Math.random() < 0.15 && pl.pos.distanceTo(sp.pos) < 45) s.world.fx.spawn(_v.copy(sp.pos).add(_v2.set(U.rand(-0.5, 0.5), U.rand(0, 0.8), U.rand(-0.5, 0.5))), _v2.set(0, 0.6, 0), 0xffe28a, 0.16, 0.7, { grav: 0 });
  }
  // ---------------------------------------------------------------- bonus objective
  function checkBonus(s) {
    const b = s.bonus; if (b.done) return;
    let ok = false;
    if (b.type === 'sprocket') ok = s.run.sprockets.length > 0 || !!s.oldSprocket;
    else if (b.type === 'elites') ok = s.run.elites >= 3;
    else if (b.type === 'crates') ok = s.run.crates >= 15;
    if (ok) { b.done = true; G.UI.toast(G.t('exp.bonusDone'), { icon: X.icon('badge'), color: '#fff6c8' }); if (G.Audio) G.Audio.sfx('star'); }
  }
  // The bonus row: its label and, in a separate span that never shrinks, its count / mark (on a small phone the label
  // clamps to two lines — the count used to be the end of that text and was cut off with the ellipsis).
  // bonusKey: a number that changes whenever the count does (no string building per frame).
  function bonusKey(s) { const b = s.bonus; return b.type === 'elites' ? Math.min(3, s.run.elites) : b.type === 'crates' ? Math.min(15, s.run.crates) : b.type === 'noko' ? (s.run.kos ? 1 : 0) : (b.done ? 1 : 0); }
  function bonusCount(s) {
    const b = s.bonus;
    if (b.type === 'elites') return Math.min(3, s.run.elites) + '/3';
    if (b.type === 'crates') return Math.min(15, s.run.crates) + '/15';
    if (b.type === 'noko') return s.run.kos ? '✗' : '✓';
    if (b.type === 'par') return X.fmt(s.par);
    return b.done ? '✓' : '';
  }
  // (Japanese labels get phrase breaks — G.UI.setText — so a clamped line never ends inside a word)
  const setRowText = (node, txt) => { if (G.UI.setText) G.UI.setText(node, txt); else node.textContent = txt; };

  // ---------------------------------------------------------------- HUD
  function buildHud(s) {
    const el = G.UI.el;
    const tl = G.HUD.slot('tl');
    const chip = 'background:rgba(255,255,255,0.86);border:3px solid var(--ink);border-radius:12px;padding:3px 9px;font:800 12px/1.3 var(--f-body);box-shadow:0 3px 0 var(--shadow);display:flex;align-items:center;gap:6px';
    // one guide card right under the objective counter: the next action ("Follow the yellow marker to the bots!",
    // one line, with the icon of the marker it means) above the bonus goal (kept short for phone screens)
    const row = 'display:flex;align-items:center;gap:6px;padding:3px 9px;min-width:0';
    const one = 'min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical';
    s.hud.next = el('div.ex-next', { style: { cssText: row + ';background:#fff6c8;border-bottom:2px solid rgba(30,26,77,0.18);display:none' } },
      el('span', { style: { display: 'inline-flex', width: '17px', height: '17px', flex: 'none' } }), el('span', { style: { cssText: one } }));
    const cnt = 'flex:none;margin-left:auto;padding-left:2px;font-weight:900;white-space:nowrap';
    s.hud.bonus = el('div', { style: { cssText: row } }, el('span', { html: X.icon('badge'), style: { display: 'inline-flex', width: '16px', height: '16px', flex: 'none' } }), el('span', { style: { cssText: one } }), el('span.ex-cnt', { style: { cssText: cnt } }));
    s.hud.chal = el('div.ex-chal', { style: { cssText: row + ';border-top:2px solid rgba(30,26,77,0.12);background:#e6fbff;display:none' } }, el('span', { style: { display: 'inline-flex', width: '16px', height: '16px', flex: 'none' } }), el('span', { style: { cssText: one } }), el('span.ex-cnt', { style: { cssText: cnt } }));
    s.hud.guide = el('div.ex-guide', { style: { cssText: chip + ';padding:0;flex-direction:column;align-items:stretch;gap:0;overflow:hidden' } }, s.hud.next, s.hud.bonus, s.hud.chal);
    tl.appendChild(s.hud.guide);
    if (s.run.badges > 0) { s.hud.badges = el('div', { style: { cssText: chip } }); tl.appendChild(s.hud.badges); }
    s.hud.alarm = el('div', { style: { cssText: chip + ';display:none' } }, el('span', { html: X.icon('siren'), style: { display: 'inline-flex', width: '16px', height: '16px' } }), el('div.bar', { style: { flex: '1', height: '8px', minWidth: '70px' } }, el('i', { style: { background: '#ff4d5e', width: '0%' } })));
    tl.appendChild(s.hud.alarm);
    const full = G.HUD.slot('full');
    s.hud.combo = el('div', { style: { position: 'absolute', left: 'calc(50% + 34px)', top: 'calc(50% + 18px)', font: '400 20px var(--f-display)', color: '#ffd23f', webkitTextStroke: '2px var(--ink)', paintOrder: 'stroke fill', textShadow: '0 3px 0 var(--ink)', pointerEvents: 'none', transition: 'transform .12s', display: 'none' } });
    full.appendChild(s.hud.combo);
  }
  function updateHud(s) {
    const H = G.HUD, run = s.run;
    let o;
    if (s.phase === 'call' && s.ex) o = { t: G.t('exp.obj.extract'), x: G.t('exp.extract.arrive', { n: Math.ceil(s.ex.t) }), f: 1 - s.ex.t / s.ex.T };
    else if (s.phase === 'hold' && s.ex) o = { t: G.t('exp.obj.extract'), x: s.ex.hold > 0 ? G.t('exp.extract.hold', { n: Math.ceil(s.ex.holdT - s.ex.hold) }) : G.t('exp.extract.go'), f: s.ex.hold / s.ex.holdT };
    else if (s.freeing) o = { t: G.t('exp.obj.rescue'), x: G.t('exp.int.freeing', { n: Math.min(100, Math.round(s.freeing.prog * 100)) }), f: Math.min(1, s.freeing.prog) };
    else if (s.obj.repairing) o = { t: G.t('exp.obj.escort'), x: G.t('exp.int.fixing', { n: Math.min(100, Math.round(s.obj.repair * 100)) }), f: Math.min(1, s.obj.repair) };
    else o = s.O.text(s);
    const key = o.t + '|' + o.x + '|' + (o.f == null ? '' : o.f.toFixed(2));
    if (s.hud.objKey !== key) { s.hud.objKey = key; H.setObjective(o.t, o.x, o.f); }
    H.setTimer(s.time, s.time > s.par);
    H.setBolts(run.clinks);
    // (rebuilt when the action changes or the language was switched from the pause menu)
    const na = s.nextAct || null;
    if (s.hud.nextA !== na || s.hud.nextL !== G.i18n.lang) {
      s.hud.nextA = na; s.hud.nextL = G.i18n.lang;
      s.hud.next.style.display = na ? 'flex' : 'none';
      if (na) { const nt = G.t(na.k, { part: s.obj.part ? X.partName(s.obj.part) : '' }); s.hud.next.firstChild.innerHTML = X.icon(na.i); setRowText(s.hud.next.lastChild, nt); s.hud.next.title = nt; }
    }
    const bk = bonusKey(s) * 2 + (s.bonus.done ? 1 : 0);
    if (s.hud.bonusK !== bk || s.hud.bonusL !== G.i18n.lang) {
      s.hud.bonusK = bk; s.hud.bonusL = G.i18n.lang;
      setRowText(s.hud.bonus.children[1], G.t('exp.bonus.' + s.bonus.type)); s.hud.bonus.lastChild.textContent = bonusCount(s);
      s.hud.bonus.style.opacity = s.bonus.done ? '0.75' : '1';
    }
    if (s.chal) {
      // (rebuilt only when the count, the done state or the language changes: no string building per frame)
      const ck = s.chal.a * 2 + (s.chal.done ? 1 : 0);
      if (s.hud.chalK !== ck || s.hud.chalL !== G.i18n.lang) {
        s.hud.chalK = ck; s.hud.chalL = G.i18n.lang;
        const c = s.chal;
        s.hud.chal.style.display = 'flex'; s.hud.chal.firstChild.innerHTML = X.icon(c.icon);
        setRowText(s.hud.chal.children[1], G.t(c.key, { n: c.n })); s.hud.chal.lastChild.textContent = c.done ? '✓' : c.a + '/' + c.n;
        s.hud.chal.style.opacity = c.done ? '0.75' : '1';
      }
    }
    if (s.hud.badges) { const k = 'b' + run.badges; if (s.hud.badgeK !== k) { s.hud.badgeK = k; s.hud.badges.innerHTML = ''; for (let i = 0; i < s.D.badges; i++) s.hud.badges.appendChild(G.UI.el('span', { html: X.icon('badge'), style: { display: 'inline-flex', width: '18px', height: '18px', opacity: i < run.badges ? '1' : '0.25' } })); } }
    const showA = s.alarm > 0.05 && s.star >= 2;
    s.hud.alarm.style.display = showA ? 'flex' : 'none';
    if (showA) s.hud.alarm.lastChild.firstChild.style.width = (s.alarm * 100).toFixed(0) + '%';
    const cm = run.comboMult;
    const ck = cm > 1 ? 'x' + cm : '';
    if (s.hud.comboK !== ck) {
      s.hud.comboK = ck;
      s.hud.combo.style.display = cm > 1 ? 'block' : 'none';
      s.hud.combo.textContent = G.t('exp.combo', { n: cm });
      s.hud.combo.style.transform = 'scale(1.35)';
      setTimeout(() => { if (s.hud.combo) s.hud.combo.style.transform = 'scale(1)'; }, 120);
    }
    if (run.comboBroke > 0) { run.comboBroke -= G.time.realDt; }
    if (s.ex && s.phase !== 'liftoff') H.marker('ex', _v.copy(s.ex.pos).setY(s.ex.pos.y + 4), { icon: mk('extract'), color: '#8bea4a' });
  }
  function drawMinimap(s, g, k, pl) {
    s.isl.minimap(g, k, pl);
    const dot = (x, z, col, r) => { g.fillStyle = col; g.beginPath(); g.arc((x - pl.pos.x) * k, (z - pl.pos.z) * k, r, 0, TAU); g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1e1a4d'; g.stroke(); };
    for (const c of s.cp) dot(c.pos.x, c.pos.z, c.active ? '#8bea4a' : '#c9d2ea', 3.5);
    if (s.isl.kiosk) dot(s.isl.kiosk.x, s.isl.kiosk.z, '#2cc3d6', 4);
    for (const p of s.isl.pads) dot(p.x, p.z, '#8bea4a', 3);
  }
  // ---------------------------------------------------------------- end + rewards
  // The run is won (boss popped, balloon lifting off) but its results are not up yet.
  function wonAlready(s) { return s.phase === 'won' || s.phase === 'liftoff' || s.phase === 'ending'; }
  // silent: the run is being left (exit) — pay and record it, no banner / results screen
  function end(s, win, silent) {
    if (s.phase === 'done') return null;
    if (!win && wonAlready(s)) return null; // a popped boss / lift-off is a win, whatever happens after
    s.phase = 'done';
    const pl = s.world.player;
    if (pl) pl.inputEnabled = false;
    G.HUD.clearMarkers();
    const run = s.run, m = s.m;
    if (s.bonus.type === 'noko') s.bonus.done = win && run.kos === 0;
    if (s.bonus.type === 'par') s.bonus.done = win && s.time <= s.par;
    const bonuses = (s.bonus.done ? 1 : 0) + run.sprockets.length;
    const sm = win ? X.scoreMedal({ bonuses, kos: run.kos, par: s.par, time: s.time }) : { score: 0, medal: null, stars: 0 };
    let first = false;
    if (m.story && win && !(G.Progress && G.Progress.modeRewards)) {
      const r = X.storyRec(m.id);
      first = !r.done;
      r.done = true; r.clears = (r.clears || 0) + 1;
      const order = ['C', 'B', 'A', 'S'];
      if (!r.medal || order.indexOf(sm.medal) > order.indexOf(r.medal)) r.medal = sm.medal;
      if (r.best == null || sm.score > r.best) r.best = sm.score;
      if (r.time == null || s.time < r.time) r.time = Math.round(s.time);
      if (X.BOSS_OF[m.id]) { const b = X.bossRec(X.BOSS_OF[m.id]); b.kills = (b.kills || 0) + 1; }
      G.Save.save();
    }
    const stats = [
      { key: 'exp.stat.time', value: X.fmt(s.time) + ' / ' + X.fmt(s.par) },
      { key: 'exp.stat.pops', value: run.pops },
      { key: 'exp.stat.crates', value: run.crates },
      { key: 'exp.stat.kos', value: run.kos },
      { key: 'exp.stat.sprockets', value: run.sprockets.length },
      { key: 'exp.stat.bonus', value: s.bonus.done ? G.t('exp.yes') : G.t('exp.no') },
    ];
    if (s.chal) stats.push({ key: 'exp.stat.chal', value: s.chal.done ? G.t('exp.yes') : s.chal.a + '/' + s.chal.n });
    if (win) stats.push({ key: 'exp.stat.score', value: G.i18n.num(sm.score) }, { key: 'exp.stat.medal', value: sm.medal });
    const result = {
      mission: m.story ? m.id : m.id, story: !!m.story, board: !!m.board, type: m.type, biome: s.biome, star: s.star, medal: sm.medal, score: sm.score,
      time: Math.round(s.time), par: s.par, kos: run.kos, pops: run.pops, elites: run.elites, crates: run.crates, damage: Math.round(run.damage),
      bonus: s.bonus.done, challenge: s.chal ? !!s.chal.done : null, sprockets: run.sprockets.slice(), heat: s.heat.slice(), lootMult: m.loot || 1, firstClear: first, boss: m.boss || null, fail: !win,
    };
    const params = s.params;
    const tip = win ? null : G.t('exp.res.tip');
    if (!silent) G.UI.banner(G.t(win ? 'exp.res.clear' : 'exp.res.fail'), '', 1.4);
    // next sortie: a win opens the Mission Board on the next mission; a miss opens it on this one (to pick an
    // easier difficulty, say). Both straight from the results screen. (Picked on tap: the story record of this
    // run is only written by the mode-result inside X.finish.)
    const nextBoard = () => { const list = X.boardMissions(), i = list.findIndex(q => q.id === m.id); return (i < 0 ? list[0] : list[(i + (win ? 1 : 0)) % list.length]).id; };
    const nextId = () => (m.board ? nextBoard() : win ? X.nextMission(m) : m.id);
    return X.finish({ mode: 'expedition', win, stars: sm.stars, stats, run, result, silent: !!silent, medal: sm.medal, title: G.t(win ? 'exp.res.clear' : 'exp.res.fail'),
      subtitle: X.missionName(m) + ' · ' + X.biomeName(s.biome), retry: () => G.Game.go('expedition', params), tip, delay: 1200,
      next: () => X.openBoard(nextId()), nextLabel: win ? 'res.nextMission' : 'res.board' });
  }
  // Quit (pause → town / restart): keep all clinks + 50% parts (GDD §11a "Quit"); a small toast in town says
  // what was kept.
  function quitRewards(s) {
    s.phase = 'done';
    const run = s.run;
    const res = X.finish({ mode: 'expedition', win: false, stars: 0, stats: [], run, silent: true,
      result: { quit: true, mission: s.m.id, type: s.m.type, biome: s.biome, star: s.star, pops: run.pops, kos: run.kos, heat: s.heat.slice(), lootMult: s.m.loot || 1, time: Math.round(s.time) } });
    X.quitToast(res && res.rewards);
  }
  // wire helpers onto the state object
  function bindState() {
    if (!S) return;
    S.objDone = () => objDone(S); S.end = win => end(S, win); S.onKill = (t, i) => onKill(S, t, i); S.onDamage = (t, r, i) => onDamage(S, t, r, i);
    S.totemSpawn = t => totemSpawn(S, t); S.ambush = (p, n) => ambush(S, p, n); S.spawnSquad = (c, n, o) => spawnSquad(S, c, n, o);
    S.drawMinimap = (g, k, pl) => drawMinimap(S, g, k, pl);
    S.markNearestCamp = () => {
      const pl = S.world.player; let best = null, bd = 1e9;
      for (const c of S.camps) { if (c.cleared || c.patrol) continue; const d = U.distXZ(pl.pos, c); if (d < bd) { bd = d; best = c; } }
      if (best && bd > 30) G.HUD.marker('obj0', _v.set(best.x, best.y + 5, best.z), { icon: mk('sweep'), color: '#ffd23f' }); else G.HUD.removeMarker('obj0');
    };
  }
  // Kiosk (field shop): refill all ammo, Health Pop, Shield Cell — paid from this run's clinks first.
  G.UI.def('exp-kiosk', {
    modal: true, dim: false,
    build(p, close, entry) {
      if (X.ui) X.ui.styleOnce();
      entry.el.classList.add('ex-screen');
      const el = G.UI.el, run = p.run, w = G.Game.world, pl = w && w.player;
      const miss = X.ammoMissing(pl);
      const items = [
        { key: 'exp.kiosk.refill', cost: miss > 0.01 ? Math.max(10, Math.ceil(miss * 60)) : 0, icon: X.icon('bolt'), ok: miss > 0.01, act: () => { for (const wp of pl.weapons) if (wp.refill) wp.refill(); } },
        { key: 'exp.kiosk.pop', cost: 40, icon: X.icon('heart'), ok: pl && pl.hp < pl.maxHp - 1, act: () => pl.heal(50) },
        { key: 'exp.kiosk.shield', cost: 60, icon: X.icon('shield'), ok: pl && pl.maxShield > 0 && pl.shield < pl.maxShield - 1, act: () => pl.addShield(25) },
      ];
      const pay = cost => {
        if (run.clinks >= cost) { run.clinks -= cost; return true; }
        const rest = cost - run.clinks;
        if (G.Progress && G.Progress.spend && G.safe('spend', () => G.Progress.spend(rest))) { run.clinks = 0; return true; }
        return false;
      };
      const rows = items.map(it => el('div.card', { style: { flexDirection: 'row', alignItems: 'center', gap: '10px' } },
        el('span', { html: it.icon, style: { width: '30px', height: '30px', display: 'inline-flex', flex: 'none' } }),
        el('h3', { i18n: it.key, style: { flex: '1' } }),
        G.UI.btn(null, () => {
          if (!it.ok) { G.UI.toast(G.t('exp.kiosk.full')); return; }
          if (!pay(it.cost)) { G.UI.toast(G.t('exp.kiosk.noMoney')); if (G.Audio) G.Audio.sfx('error'); return; }
          it.act(); if (G.Audio) G.Audio.sfx('buy'); G.UI.refresh();
        }, it.ok ? 'primary' : '', { icon: '<i class="coin"></i>', raw: true, disabled: !it.ok }),
      ));
      rows.forEach((r, i) => { const b = r.querySelector('button'); if (b) b.appendChild(document.createTextNode(String(items[i].cost))); });
      return G.UI.panel('exp.kiosk.title', close, [el('div.row', { style: { justifyContent: 'flex-end' } }, G.UI.money(run.clinks)), el('div.col', rows), el('p.muted.small', { i18n: 'exp.kiosk.hint' })], { narrow: true, icon: X.icon('kiosk') });
    },
  });

  // ---------------------------------------------------------------- debug/test hooks
  X.dbg = {
    state() {
      if (!S || !S.world) return null;
      const pl = S.world.player;
      return { phase: S.phase, type: S.m.type, mission: S.m.id, biome: S.biome, obj: Object.assign({}, S.obj, { camps: undefined, caches: undefined, cache: undefined, site: undefined }), time: +S.time.toFixed(1), par: S.par,
        bots: aliveBots(S), parked: S.parked.size, camps: S.camps.length, crates: S.crateSlots.length, cp: S.cp.length, cpActive: S.cp.filter(c => c.active).length,
        run: { clinks: S.run.clinks, parts: S.run.parts, pops: S.run.pops, kos: S.run.kos, badges: S.run.badges, crates: S.run.crates, combo: S.run.comboMult, sprockets: S.run.sprockets },
        player: pl ? { pos: pl.pos.toArray().map(v => +v.toFixed(1)), hp: Math.round(pl.hp), alive: pl.alive } : null, alarm: +S.alarm.toFixed(2), bonus: S.bonus,
        ex: S.ex ? { t: +S.ex.t.toFixed(1), hold: +S.ex.hold.toFixed(1), T: S.ex.T, holdT: S.ex.holdT, waves: S.ex.waves } : null, next: S.nextAct ? S.nextAct.k : null, quickEx: !!S.quickEx, boss: S.boss ? { hp: Math.round(S.boss.hp), alive: S.boss.alive } : null };
    },
    island() { return S && S.isl; },
    // region mechanic summary (tests)
    mech() {
      const M = S && S.mech; if (!M) return null;
      return { kind: M.kind, pads: M.pads.length, pools: M.pools.length, drafts: M.drafts.length, chutes: M.chutes.length, zones: M.zones.map(z => ({ lit: z.lit, cage: !!z.cage, pods: z.pods.length })),
        ice: M.ice.length, crystals: M.crystals.filter(c => c.alive).length, belts: M.belts.length, cranes: M.cranes.map(c => c.state), pieces: M.pieces.length, chal: S.chal ? Object.assign({}, S.chal) : null, onIce: !!M.onIce, eyes: M.eyes ? M.eyes.count : 0 };
    },
    S() { return S; },
    teleport(x, z, y) { const pl = S.world.player; pl.pos.set(x, y != null ? y : S.isl.hf(x, z) + 1, z); pl.vel.set(0, 0, 0); },
    lookAt(x, y, z) { const pl = S.world.player; const dx = x - pl.pos.x, dz = z - pl.pos.z, dy = y - (pl.pos.y + 1.6); pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
    killAll(r) { const pl = S.world.player; let n = 0; for (const a of S.world.actors.slice()) if (a.alive && a.team === 1 && !a.isCrate && !a.isHazard && (!r || a.pos.distanceTo(pl.pos) < r)) { S.world.damage(a, 1e6, { src: pl, type: 'test' }); n++; } return n; },
    completeObjective() { if (S.m.type === 'boss') { if (!S.boss) { const st = S.obj.site; this.teleport(st.x + 20, st.z); OBJ.boss.update(S); } if (S.boss) S.world.damage(S.boss, 1e7, { src: S.world.player }); return; } S.objDone(); },
    toExtraction() { if (S.phase === 'explore') S.objDone(); if (S.ex) { S.ex.t = 0.01; this.teleport(S.ex.pos.x + 1, S.ex.pos.z + 1); } },
    holdExtraction() { if (S.ex) { S.ex.hold = S.ex.holdT - 0.1; } },
    activateAll() { for (const c of S.cp) if (!c.active) activateCheckpoint(S, c); },
    ko() { const pl = S.world.player; pl.iframes = 0; S.world.damage(pl, 1e6, { type: 'fall', friendly: true }); },
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 21c_exp_mode.js]', e); }
// ---- 21d_boss.js
try { (function () {
// 21d_boss.js — Boss Hunt (GDD §11g): G.Game.go('boss', {boss:'crankcrab'|'buzzhive'|'titan', difficulty, heat:[], rush})
// One handcrafted arena per boss built from the biome kit: Crankcrab's Peach Mesas sand bowl (40 m, 4 rock
// pillars), Queen Buzzhive's Glowcap clearing (45 m, glowing giant mushrooms), Vend-o-Titan's Junkyard
// factory roof (50 m square, 4 cover crates, edge strips that electrify in phase 2+). 3 s intro, boss HP
// persists through KOs (respawn at the arena entrance), par-time medals, boss chest fountain, results.
// Boss Rush (rush:true): all three back-to-back; HP/shield refill between fights, ammo does not.
(function (G) {
  'use strict';
  const X = G.Exp, U = G.util, V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2;
  const _v = new V3();

  G.i18n.add('en', {
    'boss.title': 'Boss Hunt', 'boss.select': 'Boss Hunt', 'boss.rush': 'Boss Rush', 'boss.rushD': 'All three bosses back-to-back. HP refills between fights, ammo does not!',
    'boss.name.crankcrab': 'CRANKCRAB', 'boss.name.buzzhive': 'QUEEN BUZZHIVE', 'boss.name.titan': 'VEND-O-TITAN', 'boss.name.pinchking': 'Pinchbot King',
    'boss.intro.crankcrab': 'Terror of the Peach Mesas', 'boss.intro.buzzhive': 'Ruler of Glowcap Grotto', 'boss.intro.titan': 'Piloted by Mega-Mayor Mox!', 'boss.intro.pinchking': 'The crabbiest crab in the Shoals',
    'boss.lair.crankcrab': 'Peach Mesas sand lair', 'boss.lair.buzzhive': 'Glowcap Grotto clearing', 'boss.lair.titan': 'Junkyard Rim factory roof',
    'boss.down': 'Boss popped!', 'boss.locked': 'Defeat it in the story first', 'boss.par': 'Gold {t} · Silver {s} · Bronze {b}', 'boss.best': 'Best {t}',
    'boss.fight': 'Defeat {name}', 'boss.phase': 'Phase {n}/{m}', 'boss.rushStage': 'Boss {n}/3', 'boss.next': 'Next boss coming up!', 'boss.edge': 'The edges are buzzing! Stay off the strips!',
    'boss.stat.boss': 'Boss', 'boss.stat.time': 'Time', 'boss.stat.medal': 'Medal', 'boss.stat.kos': 'Bonks', 'boss.stat.damage': 'Damage taken',
    'boss.medal.gold': 'Gold', 'boss.medal.silver': 'Silver', 'boss.medal.bronze': 'Bronze', 'boss.medal.none': '—', 'boss.res.win': 'Boss defeated!', 'boss.res.lose': 'Great try!',
    'boss.tip.crankcrab': 'Break the claw joints to open its face core!', 'boss.tip.buzzhive': 'Pop the hive pods first — she is tough while they orbit!', 'boss.tip.titan': 'Hide behind a crate when the Mega Beam charges!',
  });
  G.i18n.add('ja', {
    'boss.title': 'ボスハント', 'boss.select': 'ボスハント', 'boss.rush': 'ボスラッシュ', 'boss.rushD': '3体のボスとつづけてたたかうよ。HPはかいふくするけど、たまはそのまま！',
    'boss.name.crankcrab': 'クランククラブ', 'boss.name.buzzhive': 'クイーン・バズハイブ', 'boss.name.titan': 'ベンド・オ・タイタン', 'boss.name.pinchking': 'ピンチボットキング',
    'boss.intro.crankcrab': 'ピーチメサのあばれガニ', 'boss.intro.buzzhive': 'ヒカリタケのもりの女王', 'boss.intro.titan': 'メガ市長モックスがのってるぞ！', 'boss.intro.pinchking': 'ショールいちばんのガンコなカニ',
    'boss.lair.crankcrab': 'ピーチメサのすなのすみか', 'boss.lair.buzzhive': 'ヒカリタケのもりのひろば', 'boss.lair.titan': 'ガラクタ・リムのこうじょうのやね',
    'boss.down': 'ボスをポップした！', 'boss.locked': 'まずストーリーでたおそう', 'boss.par': 'ゴールド{t}・シルバー{s}・ブロンズ{b}', 'boss.best': 'ベスト {t}',
    'boss.fight': '{name}をやっつけよう', 'boss.phase': 'フェーズ {n}/{m}', 'boss.rushStage': 'ボス {n}/3', 'boss.next': 'つぎのボスがくるよ！', 'boss.edge': 'はしっこがビリビリ！ストライプにのらないで！',
    'boss.stat.boss': 'ボス', 'boss.stat.time': 'タイム', 'boss.stat.medal': 'メダル', 'boss.stat.kos': 'ボンッ', 'boss.stat.damage': 'うけたダメージ',
    'boss.medal.gold': 'ゴールド', 'boss.medal.silver': 'シルバー', 'boss.medal.bronze': 'ブロンズ', 'boss.medal.none': '—', 'boss.res.win': 'ボスをたおした！', 'boss.res.lose': 'おしかった！',
    'boss.tip.crankcrab': 'ツメのつけねをこわすと、かおのコアがひらくよ！', 'boss.tip.buzzhive': 'まわっているハイブポッドをさきにこわそう！', 'boss.tip.titan': 'メガビームがきたら、はこのうしろにかくれよう！',
  });

  X.BOSS_IDS = ['crankcrab', 'buzzhive', 'titan'];
  X.BOSS_BIOME = { crankcrab: 'mesas', buzzhive: 'grotto', titan: 'junk' };
  X.bossPar = id => { const B = (G.Data && G.Data.BOSSES && G.Data.BOSSES[id]) || (G.Enemies && G.Enemies.BOSSES && G.Enemies.BOSSES[id]); return (B && B.par) || { crankcrab: 210, buzzhive: 240, titan: 330 }[id] || 240; };
  X.bossMedal = (id, t) => { const p = X.bossPar(id); return t <= p ? 'gold' : t <= p * 1.15 ? 'silver' : t <= p * 1.3 ? 'bronze' : null; };
  let S = null;

  // ---------------------------------------------------------------- arenas
  // (each arena's height function gets its argument-free twin for the phys samplers, 05_phys _hfUpdate: it reads x, z
  // from Phys.hIn and writes exactly hf(x, z) to Phys.hOut[0])
  const withTwin = hf => { const HI_ = G.Phys.hIn, HO_ = G.Phys.hOut; hf.s = () => { HO_[0] = hf(HI_[0], HI_[1]); }; return hf; };
  function arenaCrab(world, B) {
    const R = 20;
    const hf = (x, z) => { const r = Math.hypot(x, z); return U.smoothstep(R + 1, R + 9, r) * 9 + (r > R ? G.noise.fbm2(x * 0.08, z * 0.08, 3) * 2 * U.smoothstep(R, R + 6, r) : 0) + G.noise.n2(x * 0.15, z * 0.15) * 0.08; };
    world.phys.heightFn = withTwin(hf); world.phys.bounds = { minX: -31, maxX: 31, minZ: -31, maxZ: 31 };
    const sand = new THREE.Color(0xebc786), sandL = new THREE.Color(0xf7e3b0), c = new THREE.Color(), band = B.paint.cliff.map(h => new THREE.Color(h));
    world.add(G.Terrain.build({ heightFn: hf, minX: -60, maxX: 60, minZ: -60, maxZ: 60, res: 2, chunks: 2, colorFn: (x, z, h, s) => {
      c.copy(sand).lerp(sandL, U.clamp(0.5 + G.noise.n2(x * 0.1, z * 0.1) * 0.8, 0, 1));
      const r = Math.hypot(x, z);
      if (r < R && Math.abs(r - 14) < 0.5) c.lerp(band[1], 0.35);
      if (s > 0.25) c.lerp(band[Math.floor(h / 1.6) % band.length], U.clamp((s - 0.25) * 8, 0, 1));
      return c.getHex();
    } }));
    const bake = new THREE.Group(), Gg = G.Geo;
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4; Gg.place(world, Gg.rock(2.8, 31 + i, 'sand'), Math.cos(a) * 11, -0.4, Math.sin(a) * 11, a, bake); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.2, r = 33 + (i % 3) * 3; Gg.place(world, Gg.mesa(6 + (i % 4), 10 + (i % 5) * 2.2, 70 + i, { bands: B.paint.cliff, cap: 0xa8c95f, seg: 18 }), Math.cos(a) * r, hf(Math.cos(a) * r, Math.sin(a) * r) - 1.5, Math.sin(a) * r, a, bake); }
    for (let i = 0; i < 2; i++) Gg.place(world, Gg.pillarArch(9, 5, 90 + i, { bands: B.paint.cliff }), (i ? -1 : 1) * 26, hf(26, 0) - 1.2, (i ? 8 : -8), PI / 2 + i, bake);
    world.add(Gg.bake(bake));
    world.add(Gg.distantMountains(140, 22, [0xf2b98a, 0xe88a5a, 0xc9624a, 0xffd8b0], { haze: B.fog.color, bands: B.paint.cliff, seed: 4 }));
    // wall: terrain is always climbable, so the player is held at the foot of the canyon wall (round, matching
    // the cliffs) instead of hitting the square physics bounds up on the plateau with open ground beyond.
    return { hf, spawn: new V3(0, 0.1, R - 3), center: new V3(0, 0, -4), arena: { x: 0, z: -2, r: R - 1 }, R, wall: R + 2.4 };
  }
  function arenaHive(world, B) {
    const R = 22.5;
    const hf = (x, z) => { const r = Math.hypot(x, z); return U.smoothstep(R, R + 10, r) * 5 + G.noise.fbm2(x * 0.06 + 3, z * 0.06, 3) * 1.2 * U.smoothstep(R - 4, R + 4, r) + G.noise.n2(x * 0.2, z * 0.2) * 0.06; };
    world.phys.heightFn = withTwin(hf); world.phys.bounds = { minX: -32, maxX: 32, minZ: -32, maxZ: 32 };
    const moss = new THREE.Color(0x2f6e6a), mossL = new THREE.Color(0x4aa08a), path = new THREE.Color(0x5a5fb0), glow = new THREE.Color(0x5cffe1), c = new THREE.Color();
    world.add(G.Terrain.build({ heightFn: hf, minX: -64, maxX: 64, minZ: -64, maxZ: 64, res: 2, chunks: 2, colorFn: (x, z) => {
      c.copy(moss).lerp(mossL, U.clamp(0.5 + G.noise.n2(x * 0.09, z * 0.09) * 0.9, 0, 1));
      const r = Math.hypot(x, z);
      if (Math.abs(r - 9) < 0.7 || Math.abs(r - 17) < 0.5) c.lerp(glow, 0.35);
      if (G.noise.n2(x * 0.05 + 7, z * 0.05) > 0.3) c.lerp(path, 0.4);
      return c.getHex();
    } }));
    const bake = new THREE.Group(), Gg = G.Geo;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.15, r = R + 3 + (i % 3) * 2.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
      Gg.place(world, Gg.mushroom(2.4 + (i % 4) * 0.8, [0xff6f91, 0xb983ff, 0xff8fc0][i % 3], { glow: 0x7af0ff }), x, hf(x, z) - 0.2, z, a, bake);
    }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.5, r = R + 9, x = Math.cos(a) * r, z = Math.sin(a) * r; Gg.place(world, Gg.tree('round', 1.6, 3 + i, { palette: 'teal' }), x, hf(x, z) - 0.2, z, a, bake); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4, x = Math.cos(a) * 15, z = Math.sin(a) * 15; Gg.place(world, Gg.crystal(1.4, 0x5cffe1, 40 + i, { halo: true }), x, hf(x, z) - 0.1, z, a, bake); }
    world.add(Gg.bake(bake));
    world.add(Gg.distantMountains(150, 20, [0x2a3270, 0x3a4a8a, 0x45569e, 0x52507a], { haze: B.fog.color, seed: 6 }));
    return { hf, spawn: new V3(0, 0.1, R - 3), center: new V3(0, 0, -3), arena: { x: 0, z: 0, r: R - 1 }, R, spores: true, wall: R + 7.2 };   // inside the giant-mushroom ring
  }
  function arenaTitan(world, B) {
    const H = 25;
    const hf = (x, z) => (Math.abs(x) <= H + 0.05 && Math.abs(z) <= H + 0.05 ? 0 : -60);
    world.phys.heightFn = withTwin(hf); world.phys.bounds = { minX: -H - 6, maxX: H + 6, minZ: -H - 6, maxZ: H + 6 }; world.phys.floorY = -20;
    // roof slab with painted lanes + hazard trim
    const k = new G.Geo.Kit(), P = G.Geo.P;
    const slab = P.box(H * 2, 2, H * 2); slab.translate(0, -1, 0);
    G.Geo.colorize(slab, (x, y, z, nx, ny) => {
      if (ny < 0.5) return new THREE.Color(0x5b3a8c);
      const e = Math.max(Math.abs(x), Math.abs(z));
      if (e > H - 2.2) return new THREE.Color(Math.floor((x + z) / 1.4) % 2 ? 0xffd23f : 0x1f2a5a);
      const g = (Math.floor(x / 5) + Math.floor(z / 5)) % 2 ? 0x9aa5b8 : 0xa8b2c4;
      return new THREE.Color(Math.abs(x) < 0.4 || Math.abs(z) < 0.4 ? 0xff7a3d : g);
    });
    // subdivide-free: big quads are fine for a flat roof
    k.addRaw(slab);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.cyl(1.6, 1.8, 3, 10), 0x6a6a8a, sx * (H - 4), 1.5, sz * (H - 4));
    const vents = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, x = Math.cos(a) * (H - 1.2) * 0.98, z = Math.sin(a) * (H - 1.2) * 0.98; if (Math.max(Math.abs(x), Math.abs(z)) > H - 3) continue; k.add(P.rbox(2.2, 1.2, 2.2, 0.2, 1), 0xc9d2ea, x, 0.6, z); vents.push([x, z]); }
    const roof = X.kitMesh(k, { rimStr: 0.15 });
    world.add(roof);
    for (const [x, z] of vents) world.phys.addBox(x, 0.6, z, 2.2, 1.2, 2.2);   // low cover, solid (was walk-through)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) world.phys.addCyl(sx * (H - 4), sz * (H - 4), 1.8, 0, 3);
    // cover crates (4) — each soaks Mega Beams via line of sight
    const crates = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + PI / 4, x = Math.cos(a) * 10, z = Math.sin(a) * 10;
      const m = X.kitCached('boss-cover', kk => { kk.add(P.rbox(3.2, 2.4, 3.2, 0.25, 2), 0x8e88c8, 0, 1.2, 0); for (const y of [0.4, 2.0]) kk.add(P.rbox(3.3, 0.18, 3.3, 0.06, 1), 0xe8b44a, 0, y, 0); kk.add(P.rbox(1.2, 1.2, 0.1, 0.1, 1), 0xff7a3d, 0, 1.2, 1.62); }).mesh;
      m.position.set(x, 0, z); m.rotation.y = a; world.add(m);
      world.phys.addBox(x, 1.2, z, 3.2, 2.4, 3.2);
      crates.push(m);
    }
    // The electrified edge strips (phase 2+) belong to the Titan itself (17b: visual + 5 dmg/s), so they also
    // work in the Expedition lair; the arena only passes its half-size so they line up with the hazard trim.
    // factory skyline below the roof
    const bake = new THREE.Group();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + 0.2, r = 55 + (i % 4) * 14; G.Geo.place(null, X.towerProp(18 + (i % 5) * 6, i), Math.cos(a) * r, -40, Math.sin(a) * r, a, bake); }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = 40 + (i % 3) * 8; G.Geo.place(null, X.scrapPileProp(i), Math.cos(a) * r, -14 - (i % 3) * 3, Math.sin(a) * r, a, bake); }
    const sky = bake; world.add(G.Geo.bake(sky));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-PI / 2), G.M.toon(0x6a5aa8, { rim: false })); floor.position.y = -40; world.add(floor);
    world.add(G.Geo.distantMountains(160, 22, [0x8f7be0, 0xb07ac8, 0xd99a6c, 0x6a5aa8], { haze: B.fog.color, seed: 8, height: 30 }));
    return { hf, spawn: new V3(0, 0.05, H - 5), center: new V3(0, 0, -6), arena: { x: 0, z: 0, half: H }, half: H, crates, roof: true };
  }
  const ARENAS = { crankcrab: arenaCrab, buzzhive: arenaHive, titan: arenaTitan };

  // ---------------------------------------------------------------- mode
  const MODE = {
    layout: 'fps', music: 'boss', pausable: true,
    enter(params) {
      params = params || {};
      const rush = !!params.rush;
      const idx = rush ? (params.rushIdx || 0) : 0;
      const id = rush ? X.BOSS_IDS[idx] : (X.BOSS_IDS.includes(params.boss) ? params.boss : 'crankcrab');
      const diff = X.applyDifficulty(params.difficulty);
      const heat = (params.heat || []).filter(h => X.HEAT.some(q => q.id === h)).slice(0, 5);
      const biome = X.BIOME_IDS.includes(params.biome) ? params.biome : X.BOSS_BIOME[id];
      const B = X.BIOMES[biome];
      const key = X.geoBiome(biome);
      const wo = G.Geo.biomeWorldOpts ? G.Geo.biomeWorldOpts(key) : {};
      const world = new G.World({ sky: Object.assign({}, wo.sky || {}, B.sky), fog: { color: B.fog.color, near: B.fog.near + 20, far: Math.min(B.fog.far + 60, 320) }, light: Object.assign({}, wo.light || {}, B.light || {}), rules: {} });
      const A = ARENAS[id](world, B);
      const carry = rush && idx > 0 ? X._rushCarry : null;
      const D = X.diffInfo(diff);
      const s = S = { world, params: Object.assign({}, params, { boss: id }), id, diff, heat, B, A, rush, idx, D, time: carry ? carry.time : 0, phase: 'intro', introT: 2.6, timers: [], hud: {}, ambT: 0 };
      s.run = carry ? carry.run : new X.Run({ badges: D.badges });
      s.par = Math.round(X.bossPar(id) * (heat.includes('tight') ? 0.75 : 1));
      const pl = X.makePlayer(world, A.spawn.clone(), 0, heat);
      if (carry && carry.ammo) pl.weapons.forEach((w, i) => { const a = carry.ammo[i]; if (a != null && w.maxAmmo > 0 && isFinite(a)) w.ammo = Math.min(w.maxAmmo, a); });
      lookAt(pl, A.center);
      pl.inputEnabled = false;
      world.rules.onPickup = X.pickupRule(s.run, { player: () => world.player });
      world.rules.onDamage = (t, res) => { if (t.isPlayer) { s.run.damage += res.dealt; s.run.onHurt(); } };
      world.rules.onKill = (t, info) => { if (t && t.team === 1 && !t.isCrate && !t.isBossPart && !t.isPlayer) { s.run.onPop(!!(info && info.src && !info.src.isPlayer)); if (t.elite) s.run.elites++; } };
      s.ko = X.KO(world, s.run, { respawnPos: () => A.spawn.clone(), yaw: () => yawTo(world.player, A.center), onFail: () => end(false), grace: () => s.phase === 'won' || s.phase === 'next' });
      G.HUD.show({ objective: false, timer: true, minimap: true, bolts: true, boss: true });
      G.HUD.minimapRange = 40;
      const mm = new THREE.Color(B.paint.ground[1]).getStyle();
      G.HUD.minimapDraw = (g, k) => { g.fillStyle = mm; g.globalAlpha = 0.8; if (A.half) g.fillRect(-A.half * k - (world.player.pos.x) * k, -A.half * k - world.player.pos.z * k, A.half * 2 * k, A.half * 2 * k); else { g.beginPath(); g.arc(-world.player.pos.x * k, -world.player.pos.z * k, A.R * k, 0, TAU); g.fill(); } g.globalAlpha = 1; };
      buildHud(s);
      // the boss
      const bpos = A.center.clone(); bpos.y = A.hf(bpos.x, bpos.z);
      s.boss = X.spawnBoss(world, id, bpos, { difficulty: diff, hpMult: heat.includes('armored') ? 1.3 : 1, arena: A.arena, clearArena: true, yaw: Math.atan2(A.spawn.x - bpos.x, A.spawn.z - bpos.z) });
      s.bossName = (s.boss && s.boss.displayName) || G.t('boss.name.' + id);
      if (s.boss && !s.boss.autoHud) G.UI.banner(s.bossName, G.t('boss.intro.' + id), 2.6);
      if (rush && idx > 0) G.UI.toast(G.t('boss.rushStage', { n: idx + 1 }), { icon: X.icon('boss') });
      X.prebuildNav(world);
      G.bus.emit('mode-start', 'boss', s.params);
      return world;
    },
    // pause → Return to Town: the quit keeps the run's clinks and half its parts (G.Exp.finish), so say that — or, once
    // the boss has popped (the chest fountain before the results), that the win is kept
    get quitKey() { return S && wonAlready(S) ? 'exp.quitWon' : 'exp.quitConfirm'; },
    exit() {
      // left (Return to Town / Restart) in the victory window before the results: still a win, paid and recorded
      if (S && wonAlready(S)) { const res = end(true, true); X.winToast(res); }
      // (a Boss Rush moving on to its next boss exits through here too: that is no quit — the run carries over)
      else if (S && S.phase !== 'done' && !(S.phase === 'next' && S.toNext)) { if (S.phase === 'next') X._rushCarry = null; const res = X.finish({ mode: 'boss', win: false, stars: 0, stats: [], run: S.run, silent: true, result: { boss: S.id, quit: true, rush: S.rush, time: Math.round(S.time) } }); X.quitToast(res && res.rewards); }
      G.HUD.minimapDraw = null; G.HUD.setBoss(null);
      S = null;
    },
    update(dt) {
      const s = S; if (!s) return;
      for (let i = s.timers.length - 1; i >= 0; i--) { const t = s.timers[i]; t.t -= dt; if (t.t <= 0) { s.timers.splice(i, 1); t.fn(); } }
      if (s.phase === 'done' || s.phase === 'next') return;
      const pl = s.world.player;
      if (s.phase === 'intro') {
        s.introT -= dt;
        lookAt(pl, s.boss ? s.boss.pos : s.A.center, dt);
        if (s.introT <= 0) { s.phase = 'fight'; pl.inputEnabled = true; if (G.Audio) G.Audio.sfx('go'); }
      } else if (s.phase === 'fight') s.time += dt;
      s.ko.update(dt);
      if (s.A.wall && pl.alive) {
        const r = Math.hypot(pl.pos.x, pl.pos.z), lim = s.A.wall;
        if (r > lim) {
          const nx = pl.pos.x / r, nz = pl.pos.z / r, vr = pl.vel.x * nx + pl.vel.z * nz;
          pl.pos.x = nx * lim; pl.pos.z = nz * lim; pl.pos.y = Math.max(pl.pos.y, s.A.hf(pl.pos.x, pl.pos.z));
          if (vr > 0) { pl.vel.x -= nx * vr; pl.vel.z -= nz * vr; }
        }
      }
      const b = s.boss;
      if (b && !b.autoHud) G.HUD.setBoss(b.alive ? s.bossName : null, b.alive ? b.hp / b.maxHp : null);
      // phase chip
      const ph = b && b.phase ? b.phase : 1;
      const mph = b && b.maxPhase ? b.maxPhase : 3;
      if (s.hud.phase !== ph) { s.hud.phase = ph; G.UI.setText(s.hud.phaseEl, G.t('boss.phase', { n: ph, m: mph })); s.hud.phaseEl.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300 }); }
      // titan: electrified edges from phase 2 (the boss draws + deals them); Beepo warns once the banner is gone
      if (s.A.roof) {
        const on = b && b.alive && ph >= 2;
        if (on && !s.edgeWarned) { s.edgeWarned = true; s.timers.push({ t: 2.2, fn: () => { if (s.phase === 'fight' && s.boss && s.boss.alive) X.beepo('boss.edge'); } }); }
        if (pl.alive && pl.pos.y < -6) { pl.pos.copy(s.A.spawn); pl.vel.set(0, 0, 0); if (s.diff !== 'breezy') s.world.damage(pl, 10, { type: 'fall', friendly: true }); G.UI.toast(G.t('hud.fell')); }
      }
      if (b && !b.alive && s.phase === 'fight') {
        s.phase = 'won';
        // victory window: the boss popped its arena clean (17b); the player can't be bonked out of a win now
        if (pl) pl.iframes = Math.max(pl.iframes || 0, 30);
        const p = b.pos.clone(); p.y = s.A.hf(p.x, p.z);
        G.bus.emit('objective', 'boss_' + s.id);
        s.timers.push({ t: 2.2, fn: () => X.chestFountain(s.world, new V3(p.x * 0.5 + s.A.spawn.x * 0.5, 0.02 + s.A.hf(p.x * 0.5, p.z * 0.5 + s.A.spawn.z * 0.5), p.z * 0.5 + s.A.spawn.z * 0.5), { yaw: Math.atan2(pl.pos.x - p.x, pl.pos.z - p.z) }) });
        s.timers.push({ t: 6, fn: () => (s.rush && s.idx < 2 ? nextRush(s) : end(true)) });
      }
      G.HUD.setTimer(s.time, s.time > s.par);
      G.HUD.setBolts(s.run.clinks);
      ambient(s, dt);
      comboHud(s);
    },
    restart() { const p = S ? S.params : {}; if (p.rush) p.rushIdx = 0; G.Game.go('boss', p); },
  };
  G.Game.register('boss', MODE);

  function yawTo(pl, p) { return Math.atan2(-(p.x - pl.pos.x), -(p.z - pl.pos.z)); }
  function lookAt(pl, p, dt) { const y = yawTo(pl, p); pl.yaw = dt ? U.angleDamp(pl.yaw, y, 6, dt) : y; const dy = (p.y || 0) + 2.5 - (pl.pos.y + 1.6), d = Math.hypot(p.x - pl.pos.x, p.z - pl.pos.z); pl.pitch = U.damp(pl.pitch, Math.atan2(dy, d), dt ? 6 : 99, dt || 1); }
  function buildHud(s) {
    const el = G.UI.el;
    const tc = G.HUD.slot('tc');
    // (.boss-phase, style.css: 12 px, never under the 11 px floor once the narrow-frame column scale --tc-k applies)
    s.hud.phaseEl = el('div.hud-chip.boss-phase');
    tc.appendChild(s.hud.phaseEl);
    const tl = G.HUD.slot('tl');
    if (s.run.badges > 0) { s.hud.badges = el('div.hud-chip'); tl.appendChild(s.hud.badges); }
    s.hud.combo = el('div', { style: { position: 'absolute', left: 'calc(50% + 34px)', top: 'calc(50% + 18px)', font: 'var(--fw-d) 20px var(--f-display)', color: '#ffd23f', webkitTextStroke: 'max(1px, calc(2px * var(--ds, 1))) var(--ink)', paintOrder: 'stroke fill', textShadow: '0 3px 0 var(--ink)', pointerEvents: 'none', display: 'none' } });
    G.HUD.slot('full').appendChild(s.hud.combo);
  }
  function comboHud(s) {
    const cm = s.run.comboMult, k = cm > 1 ? cm : 0;
    if (s.hud.ck !== k) { s.hud.ck = k; s.hud.combo.style.display = k ? 'block' : 'none'; s.hud.combo.textContent = G.t('exp.combo', { n: cm }); }
    if (s.hud.badges) { const bk = s.run.badges; if (s.hud.bk !== bk) { s.hud.bk = bk; s.hud.badges.innerHTML = ''; for (let i = 0; i < s.D.badges; i++) s.hud.badges.appendChild(G.UI.el('span', { html: X.icon('badge'), style: { display: 'inline-flex', width: '18px', height: '18px', opacity: i < bk ? '1' : '0.25' } })); } }
  }
  function ambient(s, dt) {
    if (!s.A.spores && s.id !== 'titan') return;
    const pl = s.world.player; s.ambT += dt * G.R.q().particles;
    while (s.ambT > 0.08) {
      s.ambT -= 0.08;
      const a = Math.random() * TAU, d = 2 + Math.random() * 16;
      _v.set(pl.pos.x + Math.cos(a) * d, pl.pos.y + Math.random() * 5, pl.pos.z + Math.sin(a) * d);
      if (s.A.spores) s.world.fx.spawn(_v, new V3(U.rand(-0.3, 0.3), U.rand(0.2, 0.6), U.rand(-0.3, 0.3)), U.pick([0x5cffe1, 0x7af0ff, 0xb983ff]), 0.13, 3.5, { grav: -0.05, drag: 0.4 });
      else s.world.fx.spawn(_v, new V3(U.rand(-0.4, 0.4), U.rand(0.3, 0.9), U.rand(-0.4, 0.4)), U.pick([0xffb070, 0xffd23f]), 0.07, 2.2, { grav: -0.1, drag: 0.3 });
    }
  }
  function nextRush(s) {
    s.phase = 'next';
    const pl = s.world.player;
    X._rushCarry = { time: s.time, run: s.run, ammo: pl.weapons.map(w => (w.maxAmmo > 0 ? w.ammo : null)) };
    G.UI.banner(G.t('boss.next'), G.t('boss.rushStage', { n: s.idx + 2 }), 2);
    const p = Object.assign({}, s.params, { rush: true, rushIdx: s.idx + 1 });
    setTimeout(() => { if (S === s) { s.toNext = true; G.Game.go('boss', p); } }, 1200);   // (not after a quit to town in between)
  }
  // The boss popped and the run is a win (a Boss Rush only with its last boss), results not shown yet.
  function wonAlready(s) { return s.phase === 'won' && !(s.rush && s.idx < 2); }
  // silent: the run is being left (exit) — pay and record it, no banner / results screen
  function end(win, silent) {
    const s = S; if (!s || s.phase === 'done') return null;
    if (!win && (s.phase === 'won' || s.phase === 'next')) return null; // a popped boss is a win, whatever happens after
    s.phase = 'done';
    const pl = s.world.player; if (pl) pl.inputEnabled = false;
    const run = s.run;
    const medal = win ? X.bossMedal(s.id, s.time * (s.heat.includes('tight') ? 1 / 0.75 : 1)) : null;
    const stars = win ? ({ gold: 3, silver: 2, bronze: 1 }[medal] || 1) : 0;
    const bossKey = s.rush ? 'boss.rush' : 'boss.name.' + s.id;
    const stats = [
      { key: 'boss.stat.boss', value: G.t(bossKey) },
      { key: 'boss.stat.time', value: X.fmt(s.time) + ' / ' + X.fmt(s.par) },
      { key: 'boss.stat.medal', value: G.t('boss.medal.' + (medal || 'none')) },
      { key: 'boss.stat.kos', value: run.kos },
      { key: 'boss.stat.damage', value: Math.round(run.damage) },
    ];
    const first = !(G.Progress && G.Progress.modeRewards) ? !(X.bossRec(s.id).huntPaid) : undefined;
    if (!(G.Progress && G.Progress.modeRewards) && win) { const r = X.bossRec(s.id); r.huntPaid = true; r.clears = (r.clears || 0) + 1; if (r.best == null || s.time < r.best) r.best = Math.round(s.time); G.Save.save(); }
    const params = Object.assign({}, s.params, s.rush ? { rushIdx: 0 } : {});
    X._rushCarry = null;
    // next sortie: after a win the Boss Hunt lobby opens on another open boss still missing its gold medal (else
    // the next open one); after a miss, on the same boss (to pick an easier difficulty)
    const others = X.BOSS_IDS.filter(id => id !== s.id && X.bossOpen(id));
    const nextBoss = s.rush ? 'rush' : win ? (others.find(id => !((X.bossRec(id).medal || 0) >= 3)) || others[0] || s.id) : s.id;
    return X.finish({ mode: 'boss', win, stars, stats, run, silent: !!silent, medal: medal ? medal.charAt(0).toUpperCase() : null, title: G.t(win ? 'boss.res.win' : 'boss.res.lose'), subtitle: G.t(bossKey),
      result: { boss: s.rush ? 'titan' : s.id, rush: s.rush, time: Math.round(s.time), par: s.par, kos: run.kos, heat: s.heat.slice(), medal, firstKill: first },
      retry: () => G.Game.go('boss', params), tip: win ? null : G.t('boss.tip.' + s.id), delay: 600,
      next: () => X.openLobbyFromResults('boss-select', { boss: nextBoss }), nextLabel: win && nextBoss !== s.id && nextBoss !== 'rush' ? 'res.nextBoss' : 'res.bossList' });
  }
  X.bossDbg = {
    state() { return S ? { id: S.id, phase: S.phase, time: +S.time.toFixed(1), boss: S.boss ? { hp: Math.round(S.boss.hp), max: Math.round(S.boss.maxHp), alive: S.boss.alive, phase: S.boss.phase } : null, run: { kos: S.run.kos, clinks: S.run.clinks }, rush: S.rush, idx: S.idx } : null; },
    kill() { if (S && S.boss && S.boss.alive) S.world.damage(S.boss, 1e7, { src: S.world.player }); },
    hurt(f) { if (S && S.boss && S.boss.alive) S.world.damage(S.boss, S.boss.maxHp * f, { src: S.world.player }); },
    S() { return S; },
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 21d_boss.js]', e); }
// ---- 21e_exp_select.js
try { (function () {
// 21e_exp_select.js — lobby screens: 'expedition-select' (Mission Board: story list + 4 rotating board
// missions, difficulty with PR locks, Heat, best medal, rewards preview) and 'boss-select' (Boss Hunt).
// Shared lobby widgets (G.Exp.ui): diffPicker, heatPicker, art, styleOnce. 'defense-select' lives in 22.
(function (G) {
  'use strict';
  const X = G.Exp, U = G.util;
  const el = (...a) => G.UI.el(...a);

  const CSS = `
.ex-screen { background: rgba(20,16,60,0.5); }
.ex-panel { max-width: min(1020px, 100%); padding: 10px 12px; gap: 8px; }
.ex-cols { display: flex; gap: 12px; min-height: 0; flex: 1; }
.ex-list { flex: 1.35; min-width: 0; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; padding: 2px 4px 6px 2px; }
.ex-side { flex: 1; min-width: 250px; max-width: 360px; display: flex; flex-direction: column; gap: 7px; min-height: 0; padding: 2px; }
.ex-side-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; display: flex; flex-direction: column; gap: 8px; padding: 2px 4px 6px 2px; -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 12px), transparent); mask-image: linear-gradient(180deg, #000 calc(100% - 12px), transparent); }
.ex-side-scroll > * { flex: none; }
/* Stack the columns only in a genuinely portrait frame (narrow desktop window / side panel). The game frame
   is always landscape on phones (rotated when held upright, G.Screen). Stacked, .ex-cols is the only
   scroller: list and details keep their natural height (flex:none — a flex:1/min-height:0 child collapsed
   to 8px and spilled over the Start button), .ex-side becomes display:contents so the Start row can stick
   to the bottom of the scroller and stay visible and clickable at any scroll position. */
@media (max-width: 680px) and (max-aspect-ratio: 1/1) {
  html:not(.force-landscape) .ex-cols { flex-direction: column; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; gap: 10px; }
  html:not(.force-landscape) .ex-side { display: contents; }
  html:not(.force-landscape) .ex-list, html:not(.force-landscape) .ex-side-scroll { flex: none; min-height: auto; overflow: visible; -webkit-mask-image: none; mask-image: none; }
  html:not(.force-landscape) .ex-startrow { position: sticky; bottom: 0; z-index: 3; background: var(--panel); padding: 6px 2px 2px; box-shadow: 0 -10px 12px -8px rgba(30,26,77,0.35); }
}
.ex-sec { font: 400 15px/1.1 var(--f-display); margin: 8px 2px 6px; display: flex; align-items: center; gap: 8px; }
.ex-sec .ex-dot { width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--ink); flex: none; }
.ex-sec .ex-lk { font: 800 11px var(--f-body); color: var(--ink-soft); }
.ex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 9px; }
.ex-card { position: relative; background: #fff; border: 3px solid var(--ink); border-radius: 16px; overflow: hidden; cursor: pointer; box-shadow: 0 4px 0 rgba(30,26,77,0.35); display: flex; flex-direction: column; min-width: 0; transition: transform .08s; }
.ex-card:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(30,26,77,0.35); }
.ex-card.sel { outline: 4px solid var(--sun); outline-offset: 1px; }
.ex-card.locked { filter: grayscale(0.75); opacity: 0.72; }
.ex-art { position: relative; height: 70px; border-bottom: 3px solid var(--ink); overflow: hidden; }
.ex-art svg.ex-sil { position: absolute; left: 0; bottom: 0; width: 100%; height: 100%; }
.ex-oi { position: absolute; left: 8px; bottom: 6px; width: 36px; height: 36px; border-radius: 50%; background: #fff; border: 3px solid var(--ink); display: grid; place-items: center; box-shadow: 0 3px 0 rgba(30,26,77,0.35); }
.ex-oi svg { width: 24px; height: 24px; }
.ex-stars { position: absolute; right: 7px; top: 6px; font: 400 13px var(--f-display); color: #ffd23f; -webkit-text-stroke: 1.5px var(--ink); paint-order: stroke fill; letter-spacing: 1px; }
.ex-medal { position: absolute; right: 7px; bottom: 6px; width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--ink); display: grid; place-items: center; font: 400 14px var(--f-display); box-shadow: 0 2px 0 var(--ink); transform: rotate(-8deg); }
.ex-ct { padding: 6px 9px 8px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
/* card title + subtitle wrap to two lines (long translations) instead of being cut with an ellipsis */
.ex-ct b { font: 800 14px/1.2 var(--f-body); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.ex-ct span { font: 700 11px/1.3 var(--f-body); color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.ex-ct span.ex-why { color: #8a3a52; display: flex; align-items: flex-start; gap: 4px; -webkit-line-clamp: unset; }
/* Japanese / Korean card subtitles ("objective · region") wrap at their spaces, never inside a word: the shared sheet
   lets clamped descriptions break anywhere (style.css), so this rule is more specific; a third line makes room so the
   end of a subtitle is not clamped away */
:lang(ja) .ex-card .ex-ct span:not(.ex-why), :lang(ko) .ex-card .ex-ct span:not(.ex-why) { word-break: keep-all; overflow-wrap: anywhere; -webkit-line-clamp: 3; }
.ex-ct span.ex-why svg { width: 13px; height: 13px; flex: none; margin-top: 1px; }
.ex-more { min-height: 40px; width: 100%; border-radius: 12px; border: 3px dashed rgba(30,26,77,0.4); background: rgba(255,255,255,0.7); font: 800 13px var(--f-body); color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; flex: none; }
.ex-more small { font: 700 11px var(--f-body); color: var(--ink-soft); }
.ex-medals { display: flex; gap: 6px; flex-wrap: wrap; }
.ex-medals > span { display: inline-flex; align-items: center; gap: 5px; font: 800 12px var(--f-body); background: var(--panel-2); border: 2px solid var(--ink); border-radius: 99px; padding: 1px 8px 1px 2px; }
.ex-medals i { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--ink); display: grid; place-items: center; font: 400 11px/1 var(--f-display); font-style: normal; }
.ex-lock { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(30,26,77,0.18); }
.ex-lock svg { width: 34px; height: 34px; filter: drop-shadow(0 3px 0 var(--ink)); }
.ex-tagrow { position: absolute; left: 6px; top: 6px; display: flex; gap: 4px; }
.ex-tag { font: 800 10px/1.6 var(--f-body); padding: 0 7px; border-radius: 99px; border: 2px solid var(--ink); background: #fff; text-transform: uppercase; letter-spacing: .03em; }
.ex-hero { position: relative; height: 92px; border-radius: 16px; border: 3px solid var(--ink); overflow: hidden; box-shadow: 0 4px 0 rgba(30,26,77,0.35); flex: none; }
.ex-hero .ex-oi { width: 50px; height: 50px; left: 10px; bottom: 10px; } .ex-hero .ex-oi svg { width: 34px; height: 34px; }
.ex-hero h3 { position: absolute; left: 74px; bottom: 30px; right: 8px; margin: 0; font: 400 clamp(17px, 2.6vw, 22px)/1.05 var(--f-display); color: #fff; -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill; text-shadow: 0 3px 0 var(--ink); }
.ex-hero p { position: absolute; left: 76px; bottom: 9px; right: auto; max-width: calc(100% - 84px); box-sizing: border-box; margin: 0; padding: 0 7px; border-radius: 8px; background: rgba(30,26,77,.62); font: 800 12px var(--f-body); color: #fff; text-shadow: 0 1px 0 var(--ink), 0 0 4px rgba(30,26,77,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ex-box { background: #fff; border: 3px solid var(--ink); border-radius: 14px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 3px 0 rgba(30,26,77,0.25); }
.ex-box h4 { margin: 0; font: 400 13px var(--f-display); color: var(--grape-ink); letter-spacing: .03em; }
.ex-line { display: flex; align-items: center; gap: 7px; font: 700 13px/1.3 var(--f-body); }
.ex-line svg { width: 18px; height: 18px; flex: none; }
.ex-pills { display: flex; gap: 5px; flex-wrap: wrap; }
.ex-pill { min-height: 38px; padding: 4px 10px; border-radius: 12px; border: 3px solid var(--ink); background: #fff; font: 800 13px var(--f-body); cursor: pointer; box-shadow: 0 3px 0 var(--ink); display: inline-flex; align-items: center; gap: 4px; }
.ex-pill.on { background: var(--sun); }
.ex-pill.locked { opacity: .55; cursor: not-allowed; }
.ex-pill svg { width: 16px; height: 16px; }
.ex-pill small { font: 700 10px var(--f-body); color: var(--ink-soft); }
.ex-rw { display: flex; gap: 6px; flex-wrap: wrap; }
.ex-rw > div { display: inline-flex; align-items: center; gap: 5px; background: var(--panel-2); border: 2px solid var(--ink); border-radius: 10px; padding: 2px 8px; font: 800 13px var(--f-body); }
.ex-rw svg { width: 16px; height: 16px; }
.ex-start { min-height: 52px; font-size: 20px; width: 100%; flex: none; margin: 0; }
.ex-startrow { flex: none; display: flex; flex-direction: column; gap: 3px; }
.ex-startrow .ex-note { text-align: center; }
@media (max-height: 460px) {
  .ex-hero { height: 68px; } .ex-hero .ex-oi { width: 42px; height: 42px; left: 8px; bottom: 9px; } .ex-hero .ex-oi svg { width: 28px; height: 28px; }
  .ex-hero h3 { left: 60px; bottom: 26px; font-size: 18px; } .ex-hero p { left: 61px; bottom: 7px; font-size: 12px; max-width: calc(100% - 69px); }
  .ex-art { height: 58px; } .ex-bosses .ex-art { height: 70px; } .ex-oi { width: 32px; height: 32px; } .ex-oi svg { width: 21px; height: 21px; }
  .ex-start { min-height: 46px; font-size: 18px; } .ex-pill { min-height: 34px; padding: 3px 9px; } .ex-box { padding: 6px 9px; gap: 5px; }
}
.ex-note { font: 700 11px/1.4 var(--f-body); color: var(--ink-soft); margin: 0; }
.ex-bosses { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
.ex-bosses .ex-art { height: 92px; }
`;
  function styleOnce() {
    if (document.getElementById('ex-style')) return;
    const s = document.createElement('style'); s.id = 'ex-style'; s.textContent = CSS; document.head.appendChild(s);
  }

  // biome silhouettes for card art
  const SIL = {
    shoals: '<path d="M0 52 Q30 44 60 50 T120 48 T200 50 V70 H0Z" fill="#6ccb5f"/><path d="M0 58 Q50 52 100 58 T200 56 V70 H0Z" fill="#f7e3b0"/><path d="M150 50 C150 32 152 22 156 14" stroke="#a86a3c" stroke-width="3" fill="none"/><path d="M156 14 q-14 -2 -20 6 M156 14 q12 -6 20 2 M156 14 q-6 -10 -16 -10 M156 14 q8 -10 18 -8" stroke="#3e9e57" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="40" cy="47" r="7" fill="#ff9fd0"/><circle cx="52" cy="49" r="5" fill="#ffd45c"/>',
    mesas: '<path d="M10 70 V30 Q10 26 16 26 H58 Q64 26 64 30 V70Z" fill="#e88a5a"/><path d="M10 38 H64 M10 48 H64 M10 58 H64" stroke="#c9624a" stroke-width="5"/><path d="M8 28 Q37 20 66 28 V32 H8Z" fill="#a8c95f"/><path d="M120 70 V44 Q120 40 126 40 H168 Q174 40 174 44 V70Z" fill="#f2b98a"/><path d="M120 52 H174 M120 61 H174" stroke="#d97b7b" stroke-width="4"/><path d="M0 64 Q100 58 200 64 V70 H0Z" fill="#ebc786"/>',
    grotto: '<path d="M0 60 Q100 54 200 60 V70 H0Z" fill="#2f6e6a"/><path d="M40 60 V36" stroke="#fff1dc" stroke-width="7"/><path d="M18 38 Q40 12 62 38Z" fill="#ff6f91"/><circle cx="32" cy="30" r="3" fill="#fff"/><circle cx="47" cy="27" r="2.5" fill="#fff"/><path d="M140 62 V44" stroke="#fff1dc" stroke-width="5"/><path d="M124 46 Q140 26 156 46Z" fill="#b983ff"/><circle cx="90" cy="20" r="2" fill="#5cffe1"/><circle cx="110" cy="34" r="1.6" fill="#5cffe1"/><circle cx="170" cy="18" r="2" fill="#5cffe1"/><circle cx="70" cy="44" r="1.6" fill="#7af0ff"/>',
    frost: '<path d="M0 56 L30 30 L52 50 L80 20 L112 52 L140 34 L170 54 L200 40 V70 H0Z" fill="#bdebff"/><path d="M30 30 L38 37 L24 36Z M80 20 L90 30 L70 29Z" fill="#fff"/><path d="M0 62 Q100 56 200 62 V70 H0Z" fill="#f4fbff"/><path d="M150 60 L156 44 L162 60Z" fill="#ff9de2"/><path d="M160 60 L164 50 L168 60Z" fill="#c8b8ff"/>',
    junk: '<path d="M20 70 V24 H38 V70Z" fill="#ff7a3d"/><path d="M20 32 H38 M20 44 H38 M20 56 H38" stroke="#5b3a8c" stroke-width="6"/><path d="M60 70 V36 H74 V70Z" fill="#5b3a8c"/><path d="M60 44 H74 M60 56 H74" stroke="#ff7a3d" stroke-width="5"/><path d="M0 62 Q60 54 120 62 T200 60 V70 H0Z" fill="#d99a6c"/><path d="M130 62 l10 -14 l8 8 l10 -10 l10 16Z" fill="#9aa5b8"/><circle cx="170" cy="18" r="9" fill="#fff0c8"/>',
  };
  function art(biome, opts) {
    opts = opts || {};
    const B = X.BIOMES[biome] || X.BIOMES.shoals;
    const c = B.css;
    const a = el('div.ex-art', { style: { background: 'linear-gradient(180deg,' + c[0] + ' 0%,' + c[1] + ' 78%)' } });
    a.appendChild(el('span', { html: '<svg class="ex-sil" viewBox="0 0 200 70" preserveAspectRatio="xMidYMax slice">' + (SIL[biome] || '') + '</svg>' }));
    if (opts.icon) a.appendChild(el('div.ex-oi', { html: opts.icon }));
    if (opts.stars) a.appendChild(el('div.ex-stars', { text: '★'.repeat(Math.min(6, opts.stars)) }));
    if (opts.medal) a.appendChild(el('div.ex-medal', { text: String(opts.medal).charAt(0).toUpperCase(), style: { background: X.medalColor(opts.medal) } }));
    if (opts.tags && opts.tags.length) a.appendChild(el('div.ex-tagrow', opts.tags.map(t => el('span.ex-tag', { text: t.text, style: { background: t.bg || '#fff' } }))));
    if (opts.locked) a.appendChild(el('div.ex-lock', { html: X.icon('lock') }));
    return a;
  }
  // Difficulty picker (PR locks: Spicy 10, Blazing 18). onPick(d).
  function diffPicker(cur, onPick) {
    return el('div.ex-pills', X.DIFFS.map(d => {
      const ok = X.diffUnlocked(d);
      const need = X.diffInfo(d).pr;
      return el('button.ex-pill' + (d === cur ? '.on' : '') + (ok ? '' : '.locked'), {
        type: 'button', onclick: () => { if (!ok) { G.UI.toast(G.t('exp.locked.rank', { n: need }), { icon: X.icon('lock') }); return; } onPick(d); },
      }, ok ? null : el('span', { html: X.icon('lock') }), el('span', { i18n: 'set.diff.' + d }), ok ? null : el('small', { text: G.t('exp.locked.rank', { n: need }) }));
    }));
  }
  function heatPicker(cur, onToggle) {
    const ok = X.heatUnlocked();
    const box = el('div.ex-pills', X.HEAT.map(h => el('button.ex-pill' + (cur.includes(h.id) ? '.on' : '') + (ok ? '' : '.locked'), {
      type: 'button', title: G.t('exp.heat.' + h.id + '.d'),
      onclick: () => { if (!ok) { G.UI.toast(G.t('exp.heat.locked', { n: X.HEAT_PR }), { icon: X.icon('lock') }); return; } onToggle(h.id); },
    }, el('span', { html: X.icon(h.icon) }), el('span', { i18n: 'exp.heat.' + h.id }))));
    return el('div.col', { style: { gap: '4px' } }, box, el('p.ex-note', { text: ok ? cur.map(h => G.t('exp.heat.' + h + '.d')).join(' · ') : G.t('exp.heat.locked', { n: X.HEAT_PR }) }));
  }
  function rewardPreview(mode, res) {
    let r = null;
    if (G.Progress && G.Progress.modeRewards) r = G.safe('preview', () => G.Progress.modeRewards(mode, Object.assign({ win: true }, res)));
    if (!r) r = X.localRewards(mode, Object.assign({ win: true }, res));
    const chest = r.loot && r.loot.length ? r.loot.reduce((a, l) => a + (l.rolls || 1), 0) : (r.chest ? (r.chestRolls || 1) : 0);
    return el('div.ex-rw',
      el('div', el('i.coin', { style: { width: '15px', height: '15px' } }), el('span', { text: G.i18n.num(Math.round(r.clinks || 0)) })),
      el('div', el('span', { text: 'XP ' + G.i18n.num(Math.round(r.xp || 0)) })),
      chest ? el('div', el('span', { html: X.icon('crown') }), el('span', { text: '×' + chest })) : null);
  }
  // Details column: everything scrolls in its own region; the Start button sits below it (never on top of it).
  function sideCol(children, start) { return el('div.ex-side', el('div.ex-side-scroll', children), start ? el('div.ex-startrow', start) : null); }
  // G.UI.refresh only keeps .panel-body scroll; keep the lobby's own scrollers too (picking a difficulty
  // at the bottom of the details column must not jump it back to the top).
  // side=false (a new mission/boss was picked): the details column starts at the top so its goal is visible.
  // Stacked (portrait) layout: .ex-cols is the scroller; keep it, and when a playable pick is made (reveal) glide
  // the details into view. A locked pick stays put: the sticky Start row already shows why it is locked.
  function stacked(entry) { const c = entry.el && entry.el.querySelector('.ex-cols'); return !!c && getComputedStyle(c).flexDirection === 'column'; }
  function keepScroll(entry, side, reveal) {
    const sel = side === false ? ['.ex-list', '.ex-cols'] : ['.ex-list', '.ex-side-scroll', '.ex-cols'];
    const pos = sel.map(q => { const n = entry.el && entry.el.querySelector(q); return n ? n.scrollTop : 0; });
    G.UI.refresh(entry);
    sel.forEach((q, i) => { const n = entry.el.querySelector(q); if (n && pos[i]) n.scrollTop = pos[i]; });
    if (side === false && reveal && stacked(entry)) {
      const cols = entry.el.querySelector('.ex-cols'), d = entry.el.querySelector('.ex-side-scroll');
      if (cols && d) {
        // measured in the game frame (a phone held upright shows the frame rotated) and divided by the menu zoom
        // (Text & UI size): scrollTop counts the scroller's own CSS pixels, the rects count frame pixels
        const loc = r => (G.Screen && G.Screen.rectToLocal ? G.Screen.rectToLocal(r) : r);
        const z = G.UI.zoomOf ? G.UI.zoomOf(cols) : 1;
        const top = Math.max(0, cols.scrollTop + (loc(d.getBoundingClientRect()).top - loc(cols.getBoundingClientRect()).top) / z - 4);
        if (cols.scrollTo) cols.scrollTo({ top, behavior: 'smooth' }); else cols.scrollTop = top;
      }
    }
  }
  X.ui = { styleOnce, art, diffPicker, heatPicker, rewardPreview, SIL, sideCol, keepScroll, stacked };
  // region challenge counts (21c CHAL; the Glowcap count is capped by the dark spots an island gets, always >= 2)
  const CHAL_N = { shoals: 3, mesas: 3, grotto: 2, frost: 3, junk: 3 };
  // small mechanic glyphs for the Mission Board line (kelp pad, updraft, light spore, ice crystal, magnet)
  const MECH_ICON = {
    shoals: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="17" rx="9" ry="4" fill="#ff8fb0" stroke="#1e1a4d" stroke-width="1.8"/><path d="M12 13V3M8 6l4-3 4 3" fill="none" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mesas: '<svg viewBox="0 0 24 24"><path d="M6 21c0-6 4-6 4-12M12 21c0-6 4-6 4-12M18 21c0-5-3-6-3-10" fill="none" stroke="#e88a5a" stroke-width="2.4" stroke-linecap="round"/><path d="M5 9l5-6 5 6" fill="none" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grotto: '<svg viewBox="0 0 24 24"><path d="M12 22V12" stroke="#3aa58a" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="8" r="5.5" fill="#9ffcff" stroke="#1e1a4d" stroke-width="1.8"/><circle cx="10.4" cy="6.6" r="1.6" fill="#fff"/></svg>',
    frost: '<svg viewBox="0 0 24 24"><path d="M12 2l4 7-4 13-4-13z" fill="#bfe8ff" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 20h16" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/></svg>',
    junk: '<svg viewBox="0 0 24 24"><path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z" fill="#ff4d5e" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 4h4v3H6zM14 4h4v3h-4z" fill="#e8eefc" stroke="#1e1a4d" stroke-width="1.4"/></svg>',
  };
  const mechIcon = b => MECH_ICON[b] || X.icon('badge');

  // ---------------------------------------------------------------- Mission Board
  G.UI.def('expedition-select', {
    dim: false,
    build(p, close, entry) {
      styleOnce();
      entry.el.classList.add('ex-screen');
      // params: {tab:'story'|'board', sel: mission id to pre-select, fromResults: opened from a results screen}
      const firstBuild = !entry.st;
      const st = entry.st || (entry.st = { tab: p.tab || 'story', sel: p.sel || null, diff: G.Save.set.difficulty || 'normal', heat: [], more: false });
      if (!X.diffUnlocked(st.diff)) st.diff = 'normal';
      const board = X.boardMissions();
      const story = X.MISSIONS;
      // a board mission from an earlier rotation is gone: pick the first one on the board instead
      if (st.sel && String(st.sel).startsWith('b_') && !board.some(q => q.id === st.sel)) st.sel = board[0].id;
      if (!st.sel) { st.sel = st.tab === 'board' ? board[0].id : (story.find(m => X.isUnlocked(m) && !X.storyRec(m.id).done) || story[0]).id; }
      const refresh = () => keepScroll(entry);
      const m = X.mission(st.sel) || story[0];
      // --- list
      const card = mm => {
        const unlocked = X.isUnlocked(mm);
        const rec = mm.story ? X.storyRec(mm.id) : null;
        const tags = [];
        if (mm.breezy) tags.push({ text: G.t('exp.board.breezy'), bg: '#bff5dc' });
        if (mm.loot) tags.push({ text: G.t('exp.board.loot'), bg: '#ffe9a8' });
        // a locked card says why on the card itself
        const sub = unlocked ? el('span', { text: G.t('exp.obj.' + mm.type) + ' · ' + X.biomeName(mm.biome) }) : el('span.ex-why', el('span', { html: X.icon('lock') }), el('span', { text: lockReason(mm) }));
        return el('div.ex-card' + (mm.id === st.sel ? '.sel' : '') + (unlocked ? '' : '.locked'), {
          onclick: () => { st.sel = mm.id; if (mm.breezy && X.diffUnlocked('breezy')) st.diff = 'breezy'; keepScroll(entry, false, unlocked); }, role: 'button', tabindex: '0',
        }, art(mm.biome, { icon: X.icon(mm.type), stars: mm.star, medal: rec && rec.done ? rec.medal : null, locked: !unlocked, tags }),
        el('div.ex-ct', el('b', { text: X.missionName(mm) }), sub));
      };
      let list;
      if (st.tab === 'story') {
        list = X.BIOME_IDS.map(b => {
          const B = X.BIOMES[b], open = X.biomeOpen(b);
          return el('div', el('div.ex-sec', el('span.ex-dot', { style: { background: B.css[2] } }), el('span', { text: X.biomeName(b) + '  ★' + B.star }), open ? null : el('span.ex-lk', { text: G.t('exp.lockedBiome', { n: B.star }) })),
            el('div.ex-grid', story.filter(q => q.biome === b).map(card)));
        });
      } else {
        const mins = Math.max(1, Math.ceil(((X.boardSeed() + 1) * 1.8e6 - Date.now()) / 60000));
        list = [el('div.ex-sec', el('span', { text: G.t('exp.board.refresh', { m: mins }) })), el('div.ex-grid', board.map(card))];
      }
      // --- details
      const unlocked = X.isUnlocked(m);
      const rec = m.story ? X.storyRec(m.id) : null;
      const goal = goalOf(m);
      const par = X.parTime(m, st.heat);
      const fold = (m.star || 1) <= 1 && !st.heat.length;
      const moreBtn = open => el('button.ex-more', { type: 'button', onclick: () => { st.more = !open; refresh(); } },
        el('span', { text: G.t(open ? 'exp.lessOpts' : 'exp.moreOpts') + (open ? ' ▴' : ' ▾') }), open ? null : el('small', { text: G.t('exp.diff') + ': ' + G.t('set.diff.' + st.diff) }));
      const side = sideCol([
        el('div.ex-hero', { style: { background: 'linear-gradient(180deg,' + X.BIOMES[m.biome].css[0] + ',' + X.BIOMES[m.biome].css[1] + ')' } },
          el('span', { html: '<svg class="ex-sil" viewBox="0 0 200 70" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%">' + (SIL[m.biome] || '') + '</svg>' }),
          el('div.ex-oi', { html: X.icon(m.type) }), el('h3', { text: X.missionName(m) }), el('p', { text: X.biomeName(m.biome) + ' · ★' + m.star })),
        el('div.ex-box',
          el('div.ex-line', el('span', { html: X.icon(m.type) }), el('span', { text: goal })),
          el('div.ex-line', el('span', { html: X.icon('badge') }), el('span', { text: G.t('exp.bonus') + ': ' + G.t('exp.bonus.' + (m.bonus || 'crates')) })),
          // what this region plays like (its signature mechanic) and the optional region challenge that uses it
          G.i18n.has('exp.mechline.' + m.biome) ? el('div.ex-line.ex-mech', el('span', { html: mechIcon(m.biome) }), el('span', { text: G.t('exp.mechline.' + m.biome) })) : null,
          G.i18n.has('exp.chal.' + m.biome) ? el('div.ex-line', el('span', { html: X.icon('sprocket') }), el('span', { text: G.t('exp.chal') + ': ' + G.t('exp.chal.' + m.biome, { n: CHAL_N[m.biome] || 3 }) })) : null,
          el('div.ex-line', el('span', { html: X.icon('clock') }), el('span', { text: G.t('exp.par', { t: X.fmt(par) }) + (rec && rec.done ? '   ' + G.t('exp.best') + ': ' + (rec.medal || '—') : '') }))),
        // ★1 missions keep Difficulty and Heat folded under "More options" (one less thing to read first)
        ...(fold && !st.more ? [moreBtn(false)] : [
          fold ? moreBtn(true) : null,
          el('div.ex-box', el('h4', { i18n: 'exp.diff' }), diffPicker(st.diff, d => { st.diff = d; refresh(); })),
          el('div.ex-box', el('h4', { i18n: 'exp.heat' }), heatPicker(st.heat, h => { const i = st.heat.indexOf(h); if (i >= 0) st.heat.splice(i, 1); else if (st.heat.length < 5) st.heat.push(h); refresh(); }))]),
        medalBox(par),
        el('div.ex-box', el('h4', { i18n: 'exp.rewards' }), rewardPreview('expedition', { star: m.star, missionStar: m.star, stars: 3, medal: 'S', difficulty: st.diff, heat: st.heat, lootMult: m.loot || 1, mission: m.id, boss: m.boss && X.BOSS_IDS && X.BOSS_IDS.includes(m.boss) ? m.boss : null }))],
        unlocked ? G.UI.btn('exp.start', () => { p._started = true; G.Game.hold = false; G.Game.go('expedition', { mission: m.id, difficulty: st.diff, seed: m.seed, heat: st.heat.slice() }); }, 'primary big ex-start')
          : el('div.ex-box', el('div.ex-line', el('span', { html: X.icon('lock') }), el('span', { text: lockReason(m) }))));
      const tabs = el('div.tabs', ['story', 'board'].map(t => el('button.tab' + (t === st.tab ? '.on' : ''), { type: 'button', i18n: 'exp.tab.' + t, onclick: () => { st.tab = t; if (t === 'board') st.sel = board[0].id; else st.sel = null; G.UI.refresh(entry); } })));
      const money = G.Progress && G.Progress.wallet ? G.UI.money(G.Progress.wallet().clinks) : null;
      const panel = G.UI.panel('exp.select.title', close, [el('div.ex-cols', el('div.ex-list', list), side)], { top: tabs, headRight: money, icon: X.icon('extract') });
      panel.classList.add('ex-panel');
      panel.querySelector('.panel-body').style.overflow = 'hidden';
      panel.querySelector('.panel-body').style.display = 'flex';
      if (firstBuild) requestAnimationFrame(() => G.safe('board scroll', () => revealSel(entry)));
      return panel;
    },
    onClose: lobbyClosed,
  });
  // On opening, scroll the mission list so the pre-selected card is in view (a save with many clears opens on a
  // ★3 mission far down the list). Only the list's own scroller moves; the stacked layout scrolls as one column.
  function revealSel(entry) {
    const lst = entry.el && entry.el.isConnected && entry.el.querySelector('.ex-list'), card = lst && lst.querySelector('.ex-card.sel');
    if (!card || stacked(entry) || lst.scrollHeight <= lst.clientHeight + 4) return;
    const a = G.Screen.rectToLocal(card.getBoundingClientRect()), b = G.Screen.rectToLocal(lst.getBoundingClientRect());
    if (a.top >= b.top && a.bottom <= b.bottom) return;
    // the region heading above the card stays visible too
    lst.scrollTop = Math.max(0, lst.scrollTop + (a.top - b.top) - 34);
  }
  // Opened from a results screen (G.Exp.openLobbyFromResults): the finished run was on hold behind the lobby;
  // leaving without starting goes home to Fizzport (the Mission Board kiosk).
  // (One tick later: when the close comes from a G.Game.go elsewhere — Game.go closes every screen before it
  // marks itself switching — that switch is under way by then and wins; no second load is started.)
  function lobbyClosed(params) {
    G.Game.hold = false;
    if (!(params && params.fromResults && !params._started)) return;
    const from = G.Game.modeId;
    setTimeout(() => { if (!G.Game._switching && G.Game.modeId === from && !G.UI.isOpen('expedition-select') && !G.UI.isOpen('boss-select')) G.Game.go(G.Game.modes.hub ? 'hub' : 'title', { at: 'fountain' }); }, 0);
  }
  // Why a mission is still locked, as the next step that opens it: a story mission opens when the one before it
  // is cleared (clearing a region's last mission also opens the next region, so that comes first); otherwise
  // its region still needs a Guild ★.
  function lockReason(m) {
    const prev = m.story ? X.MISSIONS[m.index - 1] : null;
    if (prev && !X.storyRec(prev.id).done) return G.t('exp.lockedAfter', { name: X.missionName(prev) });
    if (!X.biomeOpen(m.biome)) return G.t('exp.lockedBiome', { n: X.BIOMES[m.biome].star });
    return G.t('exp.locked');
  }
  // Medal criteria before the start (score = 1,000 + 300 per bonus goal / Star Sprocket + 2 per second under par
  // − 100 per bonk; S ≥ 1,800, A ≥ 1,400, B ≥ 1,000 — G.Exp.scoreMedal).
  function medalBox(par) {
    const pill = (g, txt) => el('span', el('i', { text: g, style: { background: X.medalColor(g) } }), el('span', { text: txt }));
    return el('div.ex-box', el('h4', { i18n: 'exp.medals' }),
      el('div.ex-medals', pill('B', G.t('exp.medal.b')), pill('A', G.i18n.num(1400)), pill('S', G.i18n.num(1800))),
      el('p.ex-note', { text: G.t('exp.medal.rule', { t: X.fmt(par) }) }));
  }
  function goalOf(m) {
    const t = m.type;
    if (t === 'sweep') return G.t('exp.goal.sweep', { n: m.n || 25 + 5 * m.star });
    if (t === 'parts') return G.t('exp.goal.parts', { n: m.n || 8, part: X.partName(m.part || 'spring') });
    if (t === 'totem') return G.t('exp.goal.totem', { n: m.n || 3 });
    if (t === 'rescue') return G.t('exp.goal.rescue', { n: m.n || 5 });
    if (t === 'boss') return G.t('exp.goal.boss', { name: G.t('boss.name.' + m.boss) });
    if (t === 'elitecamps') return G.t('exp.goal.elitecamps', { n: m.n || 3 });
    return G.t('exp.goal.' + t);
  }
  X.goalOf = goalOf;

  // ---------------------------------------------------------------- Boss Hunt lobby
  G.UI.def('boss-select', {
    dim: false,
    build(p, close, entry) {
      styleOnce();
      entry.el.classList.add('ex-screen');
      const firstBuild = !entry.st;
      const st = entry.st || (entry.st = { sel: p.boss || null, diff: G.Save.set.difficulty || 'normal', heat: [] });
      if (!X.diffUnlocked(st.diff)) st.diff = 'normal';
      const ids = X.BOSS_IDS;
      if (!st.sel) st.sel = ids.find(id => X.bossOpen(id)) || ids[0];
      const refresh = () => keepScroll(entry);
      const rushOpen = X.allUnlocked() || X.guildStar() >= 6;
      const recOf = id => (G.Save.prof.records && G.Save.prof.records.boss && G.Save.prof.records.boss[id]) || {};
      const medalOf = r => (typeof r.medal === 'number' ? ['', 'bronze', 'silver', 'gold'][r.medal] || null : r.medal || null);
      const cards = ids.map(id => {
        const open = X.bossOpen(id), r = recOf(id), md = medalOf(r);
        return el('div.ex-card' + (st.sel === id ? '.sel' : '') + (open ? '' : '.locked'), { role: 'button', tabindex: '0', onclick: () => { st.sel = id; keepScroll(entry, false, open); } },
          art(X.BOSS_BIOME[id], { icon: X.icon('boss'), medal: md, locked: !open }),
          el('div.ex-ct', el('b', { text: G.t('boss.name.' + id) }), el('span', { text: G.t('boss.lair.' + id) }), el('span', { text: r.best ? G.t('boss.best', { t: X.fmt(r.best) }) : (open ? G.t('boss.intro.' + id) : G.t('boss.locked')) })));
      });
      if (rushOpen) cards.push(el('div.ex-card' + (st.sel === 'rush' ? '.sel' : ''), { role: 'button', tabindex: '0', onclick: () => { st.sel = 'rush'; keepScroll(entry, false, true); } },
        art('junk', { icon: X.icon('crown'), stars: 6 }), el('div.ex-ct', el('b', { i18n: 'boss.rush' }), el('span', { i18n: 'boss.rushD' }))));
      const sel = st.sel;
      const isRush = sel === 'rush';
      const open = isRush ? rushOpen : X.bossOpen(sel);
      const par = isRush ? 0 : X.bossPar(sel);
      const side = sideCol([
        el('div.ex-hero', { style: { background: 'linear-gradient(180deg,' + X.BIOMES[isRush ? 'junk' : X.BOSS_BIOME[sel]].css[0] + ',' + X.BIOMES[isRush ? 'junk' : X.BOSS_BIOME[sel]].css[1] + ')' } },
          el('span', { html: '<svg class="ex-sil" viewBox="0 0 200 70" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%">' + (SIL[isRush ? 'junk' : X.BOSS_BIOME[sel]] || '') + '</svg>' }),
          el('div.ex-oi', { html: X.icon(isRush ? 'crown' : 'boss') }), el('h3', { text: G.t(isRush ? 'boss.rush' : 'boss.name.' + sel) }), el('p', { text: isRush ? '' : G.t('boss.lair.' + sel) })),
        el('div.ex-box',
          isRush ? el('div.ex-line', el('span', { html: X.icon('boss') }), el('span', { i18n: 'boss.rushD' }))
            : el('div.ex-line', el('span', { html: X.icon('clock') }), el('span', { text: G.t('boss.par', { t: X.fmt(par), s: X.fmt(par * 1.15), b: X.fmt(par * 1.3) }) })),
          isRush ? null : el('div.ex-line', el('span', { html: X.icon('boss') }), el('span', { text: G.t('boss.tip.' + sel) }))),
        el('div.ex-box', el('h4', { i18n: 'exp.diff' }), diffPicker(st.diff, d => { st.diff = d; refresh(); })),
        el('div.ex-box', el('h4', { i18n: 'exp.heat' }), heatPicker(st.heat, h => { const i = st.heat.indexOf(h); if (i >= 0) st.heat.splice(i, 1); else st.heat.push(h); refresh(); })),
        el('div.ex-box', el('h4', { i18n: 'exp.rewards' }), rewardPreview('boss', { boss: isRush ? 'titan' : sel, difficulty: st.diff, heat: st.heat }))],
        open ? G.UI.btn('exp.start', () => { p._started = true; G.Game.hold = false; G.Game.go('boss', isRush ? { rush: true, rushIdx: 0, difficulty: st.diff, heat: st.heat.slice() } : { boss: sel, difficulty: st.diff, heat: st.heat.slice() }); }, 'primary big ex-start')
          : el('div.ex-box', el('div.ex-line', el('span', { html: X.icon('lock') }), el('span', { i18n: 'boss.locked' }))));
      const panel = G.UI.panel('boss.select', close, [el('div.ex-cols', el('div.ex-list', el('div.ex-bosses', cards)), side)], { icon: X.icon('boss') });
      panel.classList.add('ex-panel');
      panel.querySelector('.panel-body').style.overflow = 'hidden';
      panel.querySelector('.panel-body').style.display = 'flex';
      if (firstBuild) requestAnimationFrame(() => G.safe('boss list scroll', () => revealSel(entry)));   // ("Next boss" may pre-pick one further down)
      return panel;
    },
    onClose: lobbyClosed,
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 21e_exp_select.js]', e); }
// ---- 22_defense.js
try { (function () {
// 22_defense.js — Fountain Guard (GDD §11e): G.Game.go('defense', {difficulty, endless}).
// Fizzport plaza at night during a Gizmob raid: 70 m arena, 3 spawn gates (N/E/W) with lanes, the Fizz
// Core (2,000 HP, team 0 Actor) in the fountain, 4 turret pads, 10 waves (threat 6 + 4·wave; unlocks w3
// Shieldy+Gnat, w5 Lobba+Zapper, w6 Pinchbot, w8 Bruiser). Each wave follows a PLAN (theme, featured types,
// which gates, exact elites; Big Waves 5 / 10 with mini-bosses Pinch King / Mini Crankcrab). During the 20 s
// skippable breaks the next wave is previewed per gate (role icons + counts) and its lanes glow; quick prep
// buttons (repair / trap / ammo) sit in the break chip; a wave start flashes the used lanes with edge arrows.
// Fizz Tokens from pops (T1 1 / T2 2 / T3 4, elite ×2, Pinch King +4, flawless wave +3) are spent on
// Pop Turrets (10), upgrades (15), Goo Slow Traps (6), Core Repair (8), Ammo Refill (4). Endless after 10.
// Lobby: G.UI.open('defense-select'). Test hooks: G.Exp.defDbg.
(function (G) {
  'use strict';
  const X = G.Exp, U = G.util, V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2;
  const _v = new V3(), _v2 = new V3();

  G.i18n.add('en', {
    'def.title': 'Fountain Guard', 'def.select': 'Fountain Guard', 'def.core': 'Fizz Core', 'def.wave': 'Wave {n}/{m}', 'def.waveEndless': 'Wave {n}',
    'def.tokens': '{n}', 'def.break': 'Next wave in {n}s', 'def.startWave': 'Start!', 'def.bigWave': 'BIG WAVE!', 'def.waveIn': 'Wave {n}', 'def.waveSub': 'Protect the Fizz Core!',
    'def.waveClear': 'Wave cleared!', 'def.boss': 'Mini Crankcrab incoming!', 'def.coreHit': 'The Fizz Core is under attack!', 'def.coreLow': 'The core is fizzling out! Repair it!',
    'def.int.pad': 'Build Pop Turret', 'def.int.upgrade': 'Upgrade turret', 'def.int.maxed': 'Turret maxed', 'def.int.shop': 'Guard Shop',
    'def.shop.title': 'Guard Shop', 'def.shop.turret': 'Pop Turret (on a pad)', 'def.shop.upgrade': 'Turret upgrade (×2 damage)', 'def.shop.trap': 'Goo Slow Trap (drops at your feet)',
    'def.shop.repair': 'Core Repair (+300)', 'def.shop.ammo': 'Ammo Refill', 'def.shop.hint': 'Pop bots to earn Fizz Tokens. Turrets are built on the glowing pads.',
    'def.shop.noTokens': 'Not enough Fizz Tokens!', 'def.shop.full': 'Already full!', 'def.built': 'Pop Turret built!', 'def.upgraded': 'Turret upgraded!', 'def.trap': 'Goo trap placed!', 'def.repaired': 'Core repaired!',
    'def.mode.standard': '10 Waves', 'def.mode.endless': 'Endless', 'def.mode.endlessLocked': 'Win once to unlock Endless',
    'def.how1': 'Bots march in from 3 gates. Keep them off the Fizz Core!', 'def.how2': 'Pop bots for Fizz Tokens. Spend them on turrets and repairs.', 'def.how3': 'Survive 10 waves. Every 5th wave is a BIG one!',
    'def.best': 'Best wave: {n}', 'def.bestEndless': 'Endless best: {n}', 'def.res.win': 'Fountain saved!', 'def.res.lose': 'Great defense!', 'def.lost': 'The Fizz Core fizzled!',
    'def.stat.waves': 'Waves cleared', 'def.stat.core': 'Core HP left', 'def.stat.pops': 'Bots popped', 'def.stat.turrets': 'Turrets built', 'def.stat.tokens': 'Tokens earned', 'def.stat.time': 'Time',
    'def.tip': 'Tip: build turrets on the pads closest to the gates!',
  });
  G.i18n.add('ja', {
    'def.title': 'ファウンテンガード', 'def.select': 'ファウンテンガード', 'def.core': 'フィズコア', 'def.wave': 'ウェーブ {n}/{m}', 'def.waveEndless': 'ウェーブ {n}',
    'def.tokens': '{n}', 'def.break': 'つぎのウェーブまで {n}びょう', 'def.startWave': 'スタート！', 'def.bigWave': 'ビッグウェーブ！', 'def.waveIn': 'ウェーブ {n}', 'def.waveSub': 'フィズコアをまもろう！',
    'def.waveClear': 'ウェーブクリア！', 'def.boss': 'ミニ・クランククラブがくるぞ！', 'def.coreHit': 'フィズコアがねらわれてる！', 'def.coreLow': 'コアがピンチ！なおそう！',
    'def.int.pad': 'ポップタレットをたてる', 'def.int.upgrade': 'タレットをパワーアップ', 'def.int.maxed': 'タレットはさいきょう', 'def.int.shop': 'ガードショップ',
    'def.shop.title': 'ガードショップ', 'def.shop.turret': 'ポップタレット（パッドの上）', 'def.shop.upgrade': 'タレットパワーアップ（ダメージ×2）', 'def.shop.trap': 'グーのスロートラップ（足もとにおくよ）',
    'def.shop.repair': 'コアしゅうり（+300）', 'def.shop.ammo': 'たまをほじゅう', 'def.shop.hint': 'ボットをポップするとフィズトークンがもらえるよ。タレットは光るパッドにたてよう。',
    'def.shop.noTokens': 'フィズトークンがたりないよ！', 'def.shop.full': 'もういっぱいだよ！', 'def.built': 'ポップタレットをたてた！', 'def.upgraded': 'タレットをパワーアップ！', 'def.trap': 'グートラップをおいた！', 'def.repaired': 'コアをなおした！',
    'def.mode.standard': '10ウェーブ', 'def.mode.endless': 'エンドレス', 'def.mode.endlessLocked': '1かいかつとエンドレスがあそべるよ',
    'def.how1': 'ボットが3つのゲートからやってくる。フィズコアをまもろう！', 'def.how2': 'ボットをポップしてトークンをゲット。タレットやしゅうりにつかおう。', 'def.how3': '10ウェーブまもりきろう。5ウェーブごとにビッグウェーブ！',
    'def.best': 'ベストウェーブ：{n}', 'def.bestEndless': 'エンドレスベスト：{n}', 'def.res.win': 'ふんすいをまもった！', 'def.res.lose': 'ナイスディフェンス！', 'def.lost': 'フィズコアのフィズがきれちゃった！',
    'def.stat.waves': 'クリアしたウェーブ', 'def.stat.core': 'のこりのコアHP', 'def.stat.pops': 'ポップしたボット', 'def.stat.turrets': 'たてたタレット', 'def.stat.tokens': 'もらったトークン', 'def.stat.time': 'タイム',
    'def.tip': 'ヒント：ゲートにちかいパッドにタレットをたてよう！',
  });

  const ARENA_R = 35, GATE_R = 33, WAVES = 10;
  const GATES = [{ id: 'N', x: 0, z: -GATE_R }, { id: 'E', x: GATE_R, z: 0 }, { id: 'W', x: -GATE_R, z: 0 }];
  const PADS = [45, 135, 225, 315].map(d => { const a = d * PI / 180; return { x: Math.sin(a) * 13, z: -Math.cos(a) * 13 }; });
  const COST = { turret: 10, upgrade: 15, trap: 6, repair: 8, ammo: 4 };
  const FLAWLESS = 3;            // bonus Fizz Tokens for a wave cleared without the core losing any HP
  let S = null;

  // ---------------------------------------------------------------- wave plan: every wave changes something
  // Budget stays 6 + 4·wave (Breezy ×0.8), so the difficulty curve is unchanged; the plan changes the mix and the
  // route: feat = featured types (+3 weight per point on top of the tier weights 5/3/1.5, only once waveTypes has
  // unlocked them), gates = the spawn gates this wave uses (the break preview and the lane glow show them),
  // elites = exact elite count among the T2/T3 picks, big = Big Wave (30 % elite chance per pick), boss = mini-boss
  // (wave 5 Pinch King: an elite Pinchbot with ×3 HP; wave 10 Mini Crankcrab).
  const PLAN = [null,
    { gates: ['N'], feat: { bumbler: 3, hopper: 3 } },                                   // 1 Warm-up (one gate)
    { gates: ['N', 'E'], feat: { rollo: 4, squirt: 2 } },                                // 2 Rolling rush
    { gates: ['N', 'E', 'W'], feat: { shieldy: 4, gnat: 1 } },                            // 3 Shields up! (new: Shieldy, Gnat)
    { gates: ['E', 'W'], feat: { gnat: 4, bumbler: 2 }, elites: 1 },                     // 4 Sky snipers (+1 elite)
    { gates: ['N', 'E', 'W'], big: true, boss: 'pinchking' },                            // 5 BIG: Pinch King
    { gates: ['W', 'N'], feat: { lobba: 4, zapper: 3 } },                                // 6 Artillery (new: Lobba, Zapper)
    { gates: ['N', 'E'], feat: { pinch: 3, shieldy: 3 }, elites: 1 },                    // 7 Crab march (new: Pinchbot)
    { gates: ['N', 'E', 'W'], feat: { bruiser: 4, rollo: 2 }, elites: 1 },               // 8 Heavy hitters (new: Bruiser)
    { gates: ['E', 'W'], feat: { gnat: 2, lobba: 2, pinch: 2, zapper: 2 }, elites: 2 },  // 9 Pincer attack
    { gates: ['N', 'E', 'W'], big: true, boss: 'crankcrab' },                            // 10 BIG: Mini Crankcrab
  ];
  // endless waves cycle the plan, with the one-gate warm-up swapped for the pincer attack (11, 21, ...)
  const themeIdx = w => { const i = 1 + ((Math.max(1, w) - 1) % WAVES); return w > WAVES && i === 1 ? 9 : i; };
  const planOf = w => PLAN[themeIdx(w)];
  // Gizmob roles, shown under the preview icons (and in the "new bot" call-out)
  const ROLE = { bumbler: 'flyer', hopper: 'jumper', rollo: 'roller', squirt: 'turret', gnat: 'sniper', shieldy: 'shield', lobba: 'artillery', zapper: 'zapper', pinch: 'tank', bruiser: 'heavy', tote: 'carrier', pinchking: 'boss', crankcrab: 'boss' };
  const ROLE_COL = { flyer: '#ffa62b', jumper: '#ff8a4c', roller: '#ff7a3d', turret: '#8bea4a', sniper: '#9be15d', shield: '#ff5fa2', artillery: '#ffb627', zapper: '#5cc8ff', tank: '#ff7a3d', heavy: '#e8b44a', carrier: '#ffd23f', boss: '#ffc21a' };
  const INK = '#1e1a4d';
  // role badge: a coloured disc with a white role glyph (ink outline), so a wave's make-up reads at a glance
  const GLYPH = {
    flyer: '<path d="M6 9h12M12 9v3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="15" r="3.6" fill="#fff"/>',
    jumper: '<rect x="8.5" y="6" width="7" height="6" rx="2" fill="#fff"/><path d="M9 14l6 1.5-6 1.5 6 1.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    roller: '<circle cx="11" cy="14" r="4.6" fill="#fff"/><path d="M14 10l2.5-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="17.2" cy="6.2" r="1.6" fill="#ffd23f"/>',
    turret: '<path d="M7 18l2-6h6l2 6" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="3.4" fill="#fff"/><path d="M14.5 8.5l3-2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
    sniper: '<circle cx="12" cy="12" r="5.2" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 4.5v4M12 15.5v4M4.5 12h4M15.5 12h4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    shield: '<path d="M12 18.5c-4-2.6-6-5-6-8a3.2 3.2 0 0 1 6-1.6 3.2 3.2 0 0 1 6 1.6c0 3-2 5.4-6 8z" fill="#fff"/>',
    artillery: '<path d="M5 18c2-7 6-10 13-11" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="2.4 2"/><circle cx="17.5" cy="7.5" r="2.6" fill="#fff"/>',
    zapper: '<path d="M13.5 4l-6 9h4.5l-2 7 6.5-10h-4.5z" fill="#fff"/>',
    tank: '<path d="M5 9c0-2.5 4-3 4 0l-2 2zM19 9c0-2.5-4-3-4 0l2 2z" fill="#fff"/><rect x="7.5" y="11" width="9" height="6" rx="3" fill="#fff"/>',
    heavy: '<rect x="6.5" y="8" width="11" height="9" rx="3" fill="#fff"/><path d="M9 8V6.5M12 8V6M15 8V6.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    carrier: '<path d="M5 8h14" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><rect x="8" y="10" width="8" height="7" rx="2" fill="#fff"/>',
    boss: '<path d="M5.5 16l-1-8 4.5 3.5L12 6l3 5.5L19.5 8l-1 8z" fill="#fff"/>',
  };
  function roleIcon(type) {
    const r = ROLE[type] || 'flyer';
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="' + (ROLE_COL[r] || '#ff7a3d') + '" stroke="' + INK + '" stroke-width="2"/><g stroke="' + INK + '" stroke-width="0.6">' + (GLYPH[r] || GLYPH.flyer) + '</g></svg>';
  }
  // Pre-roll a wave: the queue is fixed when the break before it starts, so the preview tells the truth.
  function planWave(s, w) {
    const P = planOf(w);
    let budget = 6 + 4 * w;
    if (s.diff === 'breezy') budget = Math.round(budget * 0.8);
    const types = waveTypes(w);
    const eliteP = (P.big ? 0.3 : 0) + (w > WAVES ? 0.03 * (w - WAVES) : 0);
    let elites = P.elites || 0;
    const weights = {};
    for (const t of types) { const tr = X.tier(t); weights[t] = (tr === 1 ? 5 : tr === 2 ? 3 : 1.5) + (P.feat && P.feat[t] ? P.feat[t] * 3 : 0); }
    const gates = P.gates.map(id => GATES.findIndex(g => g.id === id)).filter(i => i >= 0);
    const queue = [];
    let gi = Math.floor(Math.random() * gates.length), guard = 0;
    while (budget > 0 && guard++ < 80) {
      const opts = types.filter(t => X.threat(t, false) <= budget);
      if (!opts.length) break;
      const wt = {}; for (const t of opts) wt[t] = weights[t];
      const type = U.weighted(wt).id;
      let elite = Math.random() < eliteP;
      if (!elite && elites > 0 && X.tier(type) >= 2 && X.threat(type, true) <= budget) { elite = true; elites--; }
      queue.push({ type, elite, g: gates[gi++ % gates.length] });
      budget -= X.threat(type, elite);
    }
    if (P.boss) queue.splice(Math.floor(queue.length / 2), 0, { boss: P.boss, g: gates[0] });
    return { w, plan: P, queue, gates };
  }

  // ---------------------------------------------------------------- stage dressing kit (shared by the mode stages)
  // G.StageKit: original fair-ground dressing for the mode stages (Fountain Guard here; Starskiff Rally, Goo Turf and the
  // Training Range use it too — this file loads first of them). Nothing here has a collider.
  //   critterGeo(kind)               cheering critter ('puff' | 'bot' | 'jelly'), origin at the feet, facing +Z, ~0.8 m,
  //                                  white body so the per-instance colour tints it (~200 triangles)
  //   crowd(world, pts, o)           one InstancedMesh of critters (wind-sway material) + a hop written straight into the
  //                                  instance buffer each frame (typed arrays, index loop: no per-frame allocation);
  //                                  pts [{x, y, z, ry, color, kind?}] (o.kind: one geometry per crowd)
  //   bunting(fb, kit, a, b, o)      a sagging string of pennants from a to b ([x, y, z]); the pennants go into a
  //                                  G.Geo.flagBatch (they wave in the house flag shader), the string into the Kit
  //   arch(kit, x, y, z, ry, o)      inflatable arch (puffy segment chain, ballast feet, crown medallion)
  //   stand(kit, x, y, z, ry, o)     bleacher stand (tiers, seat rails, canopy with a scalloped valance) -> seat points
  //   lights(kit, a, b, o)           a sagging string of glow bulbs (into the Kit's glow part)
  //   meshes(world, kit, name)       the Kit's solid (+ glow) parts as meshes (house vc material, cached)
  const SK = G.StageKit = G.StageKit || {};
  const skGeo = new Map();
  const skWhite = 0xffffff, skInk = 0x1e1a4d;
  SK.critterGeo = function (kind, lite, hi) {
    const key = 'critter|' + kind + (lite ? '|lite' : '') + (hi ? '|hi' : '');
    let g = skGeo.get(key);
    if (g) return g;
    // (low-poly on purpose — a crowd is hundreds of these: an icosphere body, octahedron details, 4-sided arms; `lite`
    // (~90 triangles, for crowds only ever seen from afar, like the race stands): a 20-face body, no ears / feet / cheeks;
    // `hi` (~3k triangles, review pass): the same critter smooth enough to stand 10 m tall as an inflatable mascot;
    // hi === 2: its Low-tier cut, ~1k triangles)
    const Geo = G.Geo, xf = Geo.xf, parts = [], hb = hi === 2 ? 2 : 4, hp = hi === 2 ? 1 : 2;
    const ico = (r, d) => new THREE.IcosahedronGeometry(r, lite ? 0 : hi ? hb : d == null ? 1 : d), oct = r => (hi ? new THREE.IcosahedronGeometry(r, hp) : new THREE.OctahedronGeometry(r, 0));
    const add = (geo, c, x, y, z, rx, ry, rz, sx, sy, sz) => { geo.deleteAttribute('uv'); parts.push(Geo.colorize(xf(geo, x, y, z, rx, ry, rz, sx, sy, sz), c)); };
    const addF = (geo, c, x, y, z, rx, ry, rz, sx, sy, sz) => { if (!lite) add(geo, c, x, y, z, rx, ry, rz, sx, sy, sz); };   // full-detail only
    const eyes = (y, z, sep, r) => { for (const s of [-1, 1]) { add(oct(r), skWhite, s * sep, y, z, 0, 0, 0, 1, 1.25, 0.7); add(oct(r * 0.6), skInk, s * sep, y + r * 0.08, z + r * 0.42, 0, 0, 0, 1, 1.15, 0.6); if (hi) add(oct(r * 0.2), skWhite, s * sep + r * 0.16, y + r * 0.34, z + r * 0.72); addF(oct(r * 0.55), 0xff9ab8, s * (sep + r * 1.1), y - r * 1.25, z - r * 0.2, 0, 0, 0, 1, 0.55, 0.35); } };
    // both arms up and out, with round mitten hands (a cheer)
    const arms = (y, x0, len, col) => { for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.05, 0.06, len, hi ? 10 : 4, 1, true), col, s * (x0 + len * 0.3), y + len * 0.42, 0.02, 0, 0, -s * 0.62); add(oct(0.085), col, s * (x0 + len * 0.62), y + len * 0.86, 0.03); } };
    if (kind === 'bot') {
      add(new THREE.BoxGeometry(0.4, 0.32, 0.32), skWhite, 0, 0.26, 0);
      add(ico(0.23, 1), skWhite, 0, 0.56, 0, 0, 0, 0, 1, 0.85, 0.95);
      add(new THREE.BoxGeometry(0.32, 0.15, 0.05), 0x2a2f5a, 0, 0.57, 0.19);
      for (const s of [-1, 1]) { add(oct(0.045), 0x9ff6ff, s * 0.075, 0.585, 0.22); addF(oct(0.06), 0xff9ab8, s * 0.165, 0.5, 0.17, 0, 0, 0, 1, 0.6, 0.4); addF(oct(0.09), 0x2a2f5a, s * 0.12, 0.05, 0.03, 0, 0, 0, 1, 0.6, 1.3); }
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 3, 1, true), 0x2a2f5a, 0, 0.84, 0); add(ico(0.055, 0), 0xffd23f, 0, 0.95, 0);
      arms(0.34, 0.2, 0.26, skWhite);
    } else if (kind === 'jelly') {
      add(ico(0.3, 1), skWhite, 0, 0.36, 0, 0, 0, 0, 1, 1.05, 0.95);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; addF(oct(0.1), skWhite, Math.cos(a) * 0.2, 0.07, Math.sin(a) * 0.2, 0, a, 0, 1, 0.7, 1); }
      add(ico(0.07, 0), skWhite, 0.03, 0.7, 0);
      eyes(0.42, 0.25, 0.1, 0.07);
      arms(0.3, 0.24, 0.26, skWhite);
    } else {
      add(ico(0.3, 1), skWhite, 0, 0.36, 0, 0, 0, 0, 1, 0.95, 0.95);
      for (const s of [-1, 1]) { add(oct(0.11), skWhite, s * 0.2, 0.63, -0.02, 0, 0, s * -0.4, 0.8, 1.4, 0.7); addF(oct(0.11), skWhite, s * 0.13, 0.05, 0.05, 0, 0, 0, 1, 0.5, 1.3); }
      addF(oct(0.11), skWhite, 0, 0.3, 0.21, 0, 0, 0, 1.3, 0.85, 0.7);
      eyes(0.44, 0.24, 0.1, 0.07);
      arms(0.36, 0.22, 0.24, skWhite);
    }
    g = Geo.merge(parts); g.computeBoundingSphere(); g.userData.shared = true;
    skGeo.set(key, g);
    return g;
  };
  // A crowd: one draw call. The hop runs only while the crowd is within o.near (default 110 m) of the camera.
  SK.crowd = function (world, pts, o) {
    o = o || {};
    if (!pts.length || !G.Geo || !G.Geo.instancedAt) return null;
    for (let i = 0; i < pts.length; i++) if (pts[i].s == null) pts[i].s = 1;
    const mesh = G.Geo.instancedAt(SK.critterGeo(o.kind || 'puff', !!o.lite), G.Geo.windMat ? G.Geo.windMat(o.sway != null ? o.sway : 0.55) : G.M.vc(), pts);
    mesh.name = o.name || 'crowd';
    const n = pts.length, base = new Float32Array(n), ph = new Float32Array(n), sp = new Float32Array(n);
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) { base[i] = pts[i].y; ph[i] = Math.random() * TAU; sp[i] = 5.5 + Math.random() * 3.5; cx += pts[i].x; cz += pts[i].z; }
    cx /= n; cz /= n;
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 0.6;
    const arr = mesh.instanceMatrix.array, amp = o.hop != null ? o.hop : 0.22, near2 = (o.near || 110) * (o.near || 110), cam = G.R.camera.position;
    // (one updater per crowd, registered as is: the world calls it with (dt, t); index loop over typed arrays)
    const tick = (dt, t) => {
      const dx = cam.x - cx, dz = cam.z - cz;
      if (dx * dx + dz * dz > near2 || !mesh.visible) return;
      // (reduced motion: small hops, as the town's ambient motion is scaled)
      const a = amp * (G.Save.set.reducedMotion ? 0.35 : 1);
      for (let i = 0; i < n; i++) {
        const s = Math.sin(t * sp[i] + ph[i]);
        // hop in bursts: a cheering group jumps for a while, then just sways (the wind material) for a while
        const burst = Math.sin(t * 0.7 + ph[i] * 0.37);
        arr[i * 16 + 13] = base[i] + (burst > 0.1 && s > 0 ? s * a : 0);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    world.add(mesh);
    if (o.animate !== false) world.onUpdate(tick);
    return { mesh, n, tick };
  };
  // Giant inflatable critter mascots (review pass): the smooth `hi` critter at mascot size, all in one InstancedMesh
  // with the wind-sway material (an inflatable wobbles on its tethers; Reduced motion calms it with the foliage), each
  // standing on a ballast plinth and held by four guy ropes (the plinths and ropes go into the caller's Kit). No collider:
  // only ever placed out of reach. pts [{x, y, z, ry, s (height scale, ~12 = 10 m), color, kind}] (one kind per call);
  // o.lo: the Low-tier geometry (~1k triangles instead of ~3k).
  SK.mascots = function (world, kit, pts, o) {
    o = o || {};
    if (!pts.length || !G.Geo || !G.Geo.instancedAt) return null;
    const P = G.Geo.P;
    for (const q of pts) {
      kit.add(P.cyl(0.6 * q.s * 0.36, 0.66 * q.s * 0.36, 0.5, 14), o.plinth || 0x2a2f5a, q.x, q.y + 0.25, q.z);
      kit.add(P.tor(0.6 * q.s * 0.36, 0.08, 4, 18), 0xffd23f, q.x, q.y + 0.5, q.z, PI / 2, 0, 0);
      for (let k = 0; k < 4; k++) { const a = q.ry + PI / 4 + k * PI / 2, r = q.s * 0.42; SK.bunting(null, kit, [q.x + Math.sin(a) * q.s * 0.2, q.y + q.s * 0.36, q.z + Math.cos(a) * q.s * 0.2], [q.x + Math.sin(a) * r, q.y + 0.1, q.z + Math.cos(a) * r], { sag: 0.15, line: 0xfff6e0 }); }
    }
    const lifted = pts.map(q => ({ x: q.x, y: q.y + 0.25, z: q.z, ry: q.ry, s: q.s, color: q.color }));
    const mesh = G.Geo.instancedAt(SK.critterGeo(o.kind || 'puff', false, o.lo ? 2 : true), G.Geo.windMat ? G.Geo.windMat(o.sway != null ? o.sway : 0.35) : G.M.vc(), lifted);
    mesh.name = o.name || 'mascots';
    world.add(mesh);
    return mesh;
  };
  // pennant string: the string sags by o.sag (default 6 % of its length); pennants every o.step m (default 0.62),
  // colours cycle through o.cols
  SK.bunting = function (fb, kit, a, b, o) {
    o = o || {};
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    if (L < 0.5) return;
    const sag = o.sag != null ? o.sag : L * 0.06, step = o.step || 0.62, n = Math.max(2, Math.round(L / step));
    const cols = o.cols || [0xff6b8b, 0xffd23f, 0x3fe0b8, 0x5fc8ff, 0xb983ff], w = o.w || 0.42, h = o.h || 0.55;
    const at = t => [a[0] + dx * t, a[1] + dy * t - sag * 4 * t * (1 - t), a[2] + dz * t];
    // the string: a few thin 3-sided segments (6 triangles each; G.Geo.P.cyl would round up to 6 sides with caps)
    const segs = Math.max(3, Math.round(L / 3));
    for (let i = 0; i < segs; i++) {
      const p = at(i / segs), q = at((i + 1) / segs), sl = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      const cyl = new THREE.CylinderGeometry(0.02, 0.02, sl, 3, 1, true); cyl.deleteAttribute('uv');
      // orient +Y along p->q
      const v = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize(), qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      cyl.applyQuaternion(qq); cyl.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
      kit.addRaw(cyl, o.line || 0xfff6e0);
    }
    if (!fb) return;
    const hx = dx / L, hz = dz / L, hl = Math.hypot(hx, hz) || 1, ux = hx / hl, uz = hz / hl;
    const pos = [], col = [], c = new THREE.Color();
    for (let i = 1; i < n; i++) {
      const p = at(i / n);
      c.setHex(cols[(i + (o.ofs || 0)) % cols.length]);
      // a triangle hanging from the string, two-sided through the flag material
      pos.push(p[0] - ux * w / 2, p[1], p[2] - uz * w / 2, p[0] + ux * w / 2, p[1], p[2] + uz * w / 2, p[0], p[1] - h, p[2]);
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const yAt = (x, z) => { const t = U.clamp(((x - a[0]) * ux + (z - a[2]) * uz) / (Math.hypot(dx, dz) || 1), 0, 1); return a[1] + dy * t - sag * 4 * t * (1 - t); };
    fb.raw(g, (x, y, z) => U.clamp((yAt(x, z) - y) / h, 0, 1) * 0.8, new THREE.Vector3(-uz, 0, ux));
  };
  // inflatable arch over the local X axis (feet at x = ±span/2, faces ±Z): o {span, h, r (tube), cols [a, b], crown,
  // faceTo [x, z] (review: bulbs and crown emblem only on the face toward that point — for arches only ever seen from
  // one side, like the stage gates seen from inside the play area)}
  SK.arch = function (kit, x, y, z, ry, o) {
    o = o || {};
    const Geo = G.Geo, P = Geo.P, xf = Geo.xf;
    const span = o.span || 8, hgt = o.h || 5.5, r = o.r || 0.55, cols = o.cols || [0xff6b8b, skWhite], seg = o.seg || 13;
    const rx = span / 2, ryy = hgt - r;
    const only = o.faceTo ? ((o.faceTo[0] - x) * Math.sin(ry) + (o.faceTo[1] - z) * Math.cos(ry) > 0 ? 1 : -1) : 0;
    const put = (geo, col, lx, ly, lz, ax, ay, az, sx, sy, sz) => { xf(geo, lx, ly, lz, ax, ay, az, sx, sy, sz); xf(geo, x, y, z, 0, ry, 0); kit.addRaw(geo, col); };
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, a = PI * t, px = -Math.cos(a) * rx, py = Math.sin(a) * ryy + r * 0.6;
      // tangent angle (segments stretched along the tube: reads as inflated chambers)
      const tx = Math.sin(a) * rx, ty = Math.cos(a) * ryy, ang = Math.atan2(ty, tx);
      put(P.sph(r, 8, 6), cols[i % cols.length], px, py, 0, 0, 0, ang, 1.32, 1, 1);
      // o.bulbs: glow bulbs on both faces between the chambers (night stages)
      if (o.bulbs && i < seg) {
        const a2 = PI * (i + 0.5) / seg, bx = -Math.cos(a2) * rx, by = Math.sin(a2) * ryy + r * 0.6;
        for (const fz of [-1, 1]) { if (only && fz !== only) continue; const g = new THREE.OctahedronGeometry(0.11, 0); xf(g, bx, by + r * 0.55, fz * r * 0.7); xf(g, x, y, z, 0, ry, 0); kit.glowRaw(g, o.bulbs[i % o.bulbs.length]); }
      }
    }
    for (const sd of [-1, 1]) {
      put(P.sph(r * 1.25, 8, 5), cols[0], sd * rx, r * 0.45, 0, 0, 0, 0, 1.2, 0.55, 1.2);
      put(P.rbox(r * 1.6, r * 0.7, r * 1.6, 0.14, 1), o.base || 0x2a2f5a, sd * rx, r * 0.35 - 0.1, 0);
    }
    if (o.crown !== false) {
      put(P.cyl(r * 1.9, r * 1.9, 0.22, 18), o.crownCol || skWhite, 0, hgt + r * 0.85, 0, PI / 2, 0, 0);
      put(P.tor(r * 1.9, 0.09, 5, 18), o.trim || 0xffd23f, 0, hgt + r * 0.85, 0.02, 0, 0, 0);
      if (o.emblem && Geo.emblem) for (const sd of [-1, 1]) if (!only || sd === only) put(Geo.emblem(o.emblem, o.emblemCol).clone(), null, 0, hgt + r * 0.85, sd * 0.13, 0, sd > 0 ? 0 : PI, 0, r * 2.1);
    }
  };
  // bleacher stand facing local +Z, tiers stepping up toward -Z. o {len, rows, cols: [seat a, seat b, frame, roof a,
  // roof b], roof (default true)}. Returns the seat points (world space) for a crowd: [{x, y, z, ry}].
  SK.stand = function (kit, x, y, z, ry, o) {
    o = o || {};
    const Geo = G.Geo, P = Geo.P, xf = Geo.xf;
    const len = o.len || 12, rows = o.rows || 3, td = o.depth || 1.2, th = o.rise || 0.55, cols = o.cols || [0x5fc8ff, 0xfff6e0, 0x2a2f5a, 0xff6b8b, skWhite];
    const c = Math.cos(ry), s = Math.sin(ry);
    const put = (geo, col, lx, ly, lz, ax, ay, az, sx, sy, sz) => { xf(geo, lx, ly, lz, ax, ay, az, sx, sy, sz); xf(geo, x, y, z, 0, ry, 0); kit.addRaw(geo, col); };
    const seats = [];
    // (plain boxes: a stand is seen across the arena; rounded edges only where the eye lands — the seat rails' faces)
    for (let i = 0; i < rows; i++) {
      const top = th * (i + 1), lz = -i * td;
      put(P.box(len, top, td), i % 2 ? Geo.lighten(cols[2], 0.08) : cols[2], 0, top / 2, lz);
      put(P.box(len + 0.04, 0.12, 0.36), i % 2 ? cols[0] : cols[1], 0, top + 0.02, lz + td / 2 - 0.2);
      for (let k = 0; k < Math.floor(len / 0.95); k++) seats.push({ lx: -len / 2 + 0.5 + k * 0.95, ly: top + 0.04, lz: lz - 0.05 });
    }
    for (const sd of [-1, 1]) put(P.box(0.3, th * rows + 0.5, td * rows), cols[0], sd * (len / 2 + 0.15), (th * rows + 0.5) / 2, -(rows - 1) * td / 2);
    const back = -(rows - 0.5) * td - 0.1;
    put(P.box(len + 0.6, th * rows + 0.9, 0.22), cols[1], 0, (th * rows + 0.9) / 2, back);
    if (o.roof !== false) {
      const rh = th * rows + 2.4;
      for (const sd of [-1, 1]) put(P.cyl(0.08, 0.1, rh, 6), cols[2], sd * (len / 2 - 0.2), rh / 2, back + 0.15);
      put(P.box(len + 0.8, 0.16, td * rows + 0.6), cols[3], 0, rh, back + (td * rows) / 2 - 0.1, -0.12, 0, 0);
      // scalloped valance along the front edge
      const nv = Math.round(len / 0.8), fz = back + td * rows + 0.18, fy = rh - 0.25;
      for (let k = 0; k < nv; k++) put(P.cyl(0.38, 0.38, 0.05, 6, false), k % 2 ? cols[3] : cols[4], -len / 2 + (k + 0.5) * (len / nv), fy, fz, PI / 2, 0, 0, 1, 1, 1);
    }
    return seats.map(q => ({ x: x + q.lx * c + q.lz * s, y: y + q.ly, z: z - q.lx * s + q.lz * c, ry }));
  };
  // string of glow bulbs (night dressing)
  SK.lights = function (kit, a, b, o) {
    o = o || {};
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    const sag = o.sag != null ? o.sag : L * 0.07, n = Math.max(2, Math.round(L / (o.step || 0.9))), cols = o.cols || [0xffe9a8, 0xff9ad0, 0x9ff6ff, 0xffd27a];
    // (octahedron bulbs: 8 triangles each, unlit glow — the facets don't show)
    for (let i = 1; i < n; i++) { const t = i / n, g = new THREE.OctahedronGeometry(o.r || 0.1, 0); g.deleteAttribute('uv'); kit.glow(g, cols[i % cols.length], a[0] + dx * t, a[1] + dy * t - sag * 4 * t * (1 - t) - 0.06, a[2] + dz * t); }
    SK.bunting(null, kit, a, b, { sag, line: o.line || 0x2a2f5a });
  };
  // a bunch of six party balloons at (x, y, z) on strings tied to a knot, tethered down to (ax, ay, az)
  SK.balloons = function (kit, x, y, z, ax, ay, az, cols) {
    const P = G.Geo.P, rr = G.rng(Math.round(x * 3 + z * 7));
    const knot = [x, y - 2.2, z];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + rr() * 0.4, d = i ? 0.95 : 0, bx = x + Math.cos(a) * d, by = y + (i ? rr() * 0.8 - 0.3 : 0.7), bz = z + Math.sin(a) * d;
      const g = new THREE.IcosahedronGeometry(0.62, 1); g.deleteAttribute('uv');
      kit.add(g, cols[i % cols.length], bx, by, bz, 0, 0, 0, 1, 1.18, 1);
      kit.add(P.cone(0.12, 0.18, 5), G.Geo.darken(cols[i % cols.length], 0.15), bx, by - 0.78, bz, PI, 0, 0);
      SK.bunting(null, kit, [bx, by - 0.85, bz], knot, { sag: 0, line: 0xffffff });
    }
    SK.bunting(null, kit, knot, [ax, ay, az], { sag: 0.4, line: 0xffffff });
  };
  SK.meshes = function (world, kit, name, matOpts) {
    const d = kit.data();
    const out = [];
    if (d.solid) { const m = new THREE.Mesh(d.solid, G.M.vc(matOpts || { rimStr: 0.25 })); m.name = name; m.matrixAutoUpdate = false; m.updateMatrix(); world.add(m); out.push(m); }
    if (d.glow) { const m = new THREE.Mesh(d.glow, G.Geo.glowMat()); m.name = name + '-glow'; m.matrixAutoUpdate = false; m.updateMatrix(); world.add(m); out.push(m); }
    return out;
  };

  // ---------------------------------------------------------------- props
  function coreMesh() {
    return X.kitCached('def-core', k => {
      const P = G.Geo.P;
      k.glow(P.sph(1.15, 20, 14), 0x7af0ff, 0, 0, 0);
      k.glow(P.tor(1.75, 0.08, 6, 36), 0xc8f6ff, 0, 0, 0, PI / 2, 0, 0);
      k.glow(P.tor(1.45, 0.06, 6, 30), 0x5cffe1, 0, 0, 0, 0.6, 0, 0.4);
      k.sprite(0x7af0ff, 7, 0, 0, 0, 0.75);
      k.sprite(0xffffff, 2.6, 0, 0, 0, 0.9);
    });
  }
  function padMesh() {
    return X.kitCached('def-pad', k => {
      const P = G.Geo.P;
      k.add(P.cyl(1.9, 2.1, 0.32, 6), 0x1f2a5a, 0, 0.16, 0);
      k.add(P.cyl(1.6, 1.6, 0.06, 6), 0x2c3a78, 0, 0.34, 0);
      k.glow(P.tor(1.55, 0.07, 4, 6), 0x5cffe1, 0, 0.37, 0, PI / 2, 0, 0);
      k.glow(P.rbox(0.9, 0.04, 0.22, 0.04, 1), 0x5cffe1, 0, 0.38, 0); k.glow(P.rbox(0.22, 0.04, 0.9, 0.04, 1), 0x5cffe1, 0, 0.38, 0);
    });
  }
  function turretParts() {
    const base = X.kitCached('def-tbase', k => {
      const P = G.Geo.P;
      k.add(P.cyl(0.75, 0.95, 0.9, 10), 0x2cc3d6, 0, 0.75, 0);
      k.add(P.tor(0.8, 0.09, 6, 16), 0xe8b44a, 0, 1.2, 0, PI / 2, 0, 0);
      k.add(P.cyl(0.35, 0.4, 0.5, 8), 0x1f2a5a, 0, 1.4, 0);
    }, { rimStr: 0.4, spec: 0.6 });
    const head = X.kitCached('def-thead', k => {
      const P = G.Geo.P;
      k.add(P.sph(0.55, 14, 10), 0xfff1dc, 0, 0, 0);
      k.add(P.rbox(0.62, 0.26, 0.2, 0.08, 1), 0x1f2a5a, 0, 0.08, 0.45);
      k.glow(P.rbox(0.5, 0.12, 0.05, 0.04, 1), 0x7af0ff, 0, 0.1, 0.56);
      for (const sx of [-0.18, 0.18]) { k.add(P.cyl(0.08, 0.1, 0.8, 8), 0x1f2a5a, sx, -0.05, 0.75, PI / 2, 0, 0); k.glow(P.tor(0.09, 0.03, 4, 10), 0x5cffe1, sx, -0.05, 1.14, 0, 0, 0); }
      k.add(P.cyl(0.03, 0.03, 0.5, 4), 0x1f2a5a, 0, 0.7, -0.15); k.glow(P.sph(0.08, 6, 5), 0xffd23f, 0, 0.98, -0.15);
    }, { rimStr: 0.5, spec: 0.8 });
    return { base: base.mesh, head: head.mesh };
  }

  // ---------------------------------------------------------------- actors
  class Core extends G.Actor {
    constructor(world, hp) {
      super(world, { r: 4.4, h: 7.2, team: 0, hp, kind: 'core' });
      this.isCore = true; this.immovable = true; this.pos.set(0, 0, 0);
      this.mesh = coreMesh().mesh; this.mesh.position.set(0, 5.2, 0);
      this.mmColor = '#5cffe1'; this.pulse = 0;
    }
    // Aim at the floating orb (well above the fountain's stem collider, so attackers get line of sight).
    aimPoint(out) { return (out || new V3()).set(0, 4.5, 0); }
    update(dt) {
      this.applyStatus(dt);
      const t = this.world.time;
      this.pulse = U.damp(this.pulse, 0, 6, dt);
      const k = this.hp / this.maxHp;
      this.mesh.position.y = 5.2 + Math.sin(t * 1.6) * 0.18;
      this.mesh.rotation.y += dt * (0.6 + (1 - k) * 2);
      this.mesh.rotation.x = Math.sin(t * 0.7) * 0.2;
      this.mesh.scale.setScalar((0.75 + 0.25 * k) * (1 + this.pulse * 0.18));
      if (Math.random() < 0.5 * G.R.q().particles) this.world.fx.spawn(_v.set(U.rand(-1, 1), 4.6 + Math.random(), U.rand(-1, 1)), _v2.set(U.rand(-1.2, 1.2), U.rand(2, 4), U.rand(-1.2, 1.2)), U.pick([0x7af0ff, 0xc8f6ff, 0x5cffe1]), 0.22, 1.1, { grav: 3 });
    }
    onHurt() { this.pulse = 1; }
    onDeath() { if (S) S.coreDown(); }
  }
  class Turret extends G.Actor {
    constructor(world, pos) {
      super(world, { r: 0.9, h: 1.9, team: 0, hp: 1, kind: 'turret', targetable: false });
      this.isTurret = true; this.immovable = true; this.pos.copy(pos);
      const t = turretParts();
      this.mesh = new THREE.Group(); this.mesh.position.copy(pos);
      this.mesh.add(t.base); this.head = t.head; this.head.position.y = 1.85; this.mesh.add(this.head);
      this.cd = 0.5; this.level = 1; this.target = null; this.scanT = 0; this.recoil = 0; this.barrel = 0;
      this.ring = null;
    }
    upgrade() {
      this.level = 2;
      if (!this.ring) { this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 6, 20).rotateX(PI / 2), G.M.toon(0xffc21a, { emissive: 0xffc21a, ei: 0.5 })); this.ring.position.y = 1.55; this.mesh.add(this.ring); }
    }
    update(dt) {
      const w = this.world;
      this.cd -= dt; this.scanT -= dt;
      this.recoil = U.damp(this.recoil, 0, 12, dt);
      if (this.scanT <= 0 || (this.target && !this.target.alive)) {
        this.scanT = 0.3;
        const eye = _v.set(this.pos.x, this.pos.y + 1.85, this.pos.z);
        this.target = w.enemiesNear(eye, 18, 0, eye)[0] || null;
        if (this.target && (this.target.isCrate || this.target.isBossPart)) this.target = null;
      }
      const t = this.target;
      if (t && t.alive) {
        const ap = t.aimPoint(_v2);
        const yaw = Math.atan2(ap.x - this.pos.x, ap.z - this.pos.z);
        this.head.rotation.y = U.angleDamp(this.head.rotation.y, yaw, 14, dt);
        const pitch = -Math.atan2(ap.y - (this.pos.y + 1.85), Math.hypot(ap.x - this.pos.x, ap.z - this.pos.z));
        this.head.rotation.x = U.damp(this.head.rotation.x, pitch, 10, dt);
        if (this.cd <= 0 && Math.abs(U.wrapAngle(this.head.rotation.y - yaw)) < 0.25) {
          this.cd = 0.25;
          this.barrel = 1 - this.barrel;
          const o = _v.set(this.pos.x, this.pos.y + 1.8, this.pos.z);
          const sx = this.barrel ? 0.18 : -0.18, yw = this.head.rotation.y;
          o.x += Math.cos(yw) * sx + Math.sin(yw) * 1.1; o.z += -Math.sin(yw) * sx + Math.cos(yw) * 1.1;
          const dir = _v2.copy(ap).sub(o).normalize();
          w.projectiles.spawn({ pos: o, dir, speed: 34, damage: this.level > 1 ? 16 : 8, src: this, team: 0, color: this.level > 1 ? 0xffd23f : 0x7af0ff, size: 0.14, life: 0.8, kind: 'bolt' });
          this.recoil = 1;
          if (G.Audio && Math.random() < 0.5) G.Audio.sfxAt('blaster', o, { vol: 0.35, pitch: 1.4 });
        }
      } else this.head.rotation.y += dt * 0.6;
      this.head.position.z = -this.recoil * 0.08;
    }
  }

  // ---------------------------------------------------------------- arena
  // Festival dressing of the night plaza (visual only, no colliders — everything stands where the player can't go, past
  // the 36.4 m ring the mode keeps them inside, or hangs overhead): an inflatable gate arch with glow bulbs behind each
  // spawn gate, planters with topiary balls round the outside of the fence (taller ones flanking the arches), bunting
  // masts between them, party balloons over the rooftops, a halo of hovering glow orbs strung with bulbs high over the
  // plaza, string lights from lamp post to lamp post, a mosaic star ring round the fountain and glowing inlays (rings,
  // sun rays) in the cobbles, clear of the gate lanes. One merged mesh + its glow part; the pennants join the plaza's
  // flag batch. Low tier: arches, masts, bunting and the fountain's inlay ring only. Medium (review): half the small
  // planters and no rooftop balloons, so a wave-10 crowd still fits the phone budget; High / Ultra: all of it.
  // Review pass: a lit festival skyline beyond the rooftops, so the night plaza reads as a theme park from the very first
  // view (the spawn faces the fountain and the north gate): a slowly turning "Star Wheel" (bulb-lit rim, star hubs,
  // upright gondolas) north-east of the north gate and a bulb-ringed drop tower north-west of it, both well outside the
  // play area and clear of the gate lanes. The wheel is one mesh + its glow part + one instanced gondola mesh (3 draw
  // calls, not on Low); the tower and the wheel's A-frame join the dressing mesh. Reduced motion: a third of the speed.
  function festSkyline(world, kit, hf, rich) {
    const Gg = G.Geo, P = Gg.P;
    const BUL = [0xffe9a8, 0xff9ad0, 0x9ff6ff, 0xffd27a, 0xc8a8ff];
    // (bulbs: octahedra — 8 triangles; unlit and blooming, their facets never show)
    const ico = (r, d) => { const g = d ? new THREE.IcosahedronGeometry(r, d) : new THREE.OctahedronGeometry(r, 0); g.deleteAttribute('uv'); return g; };
    // drop tower (NW, left of the top-centre HUD from the spawn): striped column on a plinth, a ring of seats two-thirds
    // up, a crown with a star, rings of bulbs
    {
      const a = -41 * PI / 180, x = Math.sin(a) * 76, z = -Math.cos(a) * 76, y = hf(x, z) - 0.4, H = 27;
      kit.add(P.cyl(4.2, 4.8, 1.6, 18), 0x2a2f5a, x, y + 0.8, z);
      kit.add(P.tor(4.3, 0.18, 5, 24), 0xffd23f, x, y + 1.6, z, PI / 2, 0, 0);
      // (stacked bands: crisp stripes, which per-vertex colour on one tall cylinder would blur)
      for (let i = 0; i < 12; i++) { const rb = 1.5 - 0.25 * i / 12, rt = 1.5 - 0.25 * (i + 1) / 12; kit.add(P.cyl(rt, rb, H / 12, 12, true), i & 1 ? 0xc8a8ff : 0xfff1dc, x, y + 1.6 + (i + 0.5) * H / 12, z); }
      const sy = y + 1.6 + H * 0.66;
      kit.add(P.tor(3.0, 0.42, 6, 24), 0xff9ad0, x, sy, z, PI / 2, 0, 0);
      kit.add(P.cyl(1.6, 1.6, 0.6, 16), 0x2a2f5a, x, sy, z);
      for (let k = 0; k < 4; k++) kit.add(P.box(3.0, 0.22, 0.3), 0xfff1dc, x + Math.sin(k * PI / 2 + PI / 4) * 1.5, sy, z + Math.cos(k * PI / 2 + PI / 4) * 1.5, 0, k * PI / 2 + PI / 4 + PI / 2, 0);
      for (let k = 0; k < 10; k++) { const t = (k / 10) * TAU; kit.add(P.box(0.9, 0.9, 0.7), [0x7fe8d0, 0xffd27a, 0x9ff6ff][k % 3], x + Math.sin(t) * 3.0, sy - 0.55, z + Math.cos(t) * 3.0, 0, t, 0); }
      const ty = y + 1.6 + H;
      kit.add(P.cyl(2.1, 1.5, 1.4, 16), 0xff9ad0, x, ty + 0.7, z);
      kit.add(P.cone(1.9, 2.6, 16), 0xfff1dc, x, ty + 2.7, z);
      if (Gg.emblem) kit.add(Gg.emblem('star', 0xffd23f).clone(), null, x, ty + 4.9, z, 0, Math.atan2(-x, -z), 0, 2.4);   // (facing the plaza)
      kit.glow(ico(0.7, 1), 0xfff1a8, x, ty + 4.2, z);
      const rings = rich ? 9 : 3;
      for (let r = 0; r < rings; r++) {
        const ry = y + 3 + r * (H - 2) / rings, rr = 1.5 - 0.25 * (ry - y) / H + 0.12;
        for (let k = 0; k < 10; k++) { const t = (k / 10) * TAU + r * 0.3; kit.glow(ico(0.2), BUL[(k + r) % BUL.length], x + Math.sin(t) * rr, ry, z + Math.cos(t) * rr); }
      }
      if (rich) for (let k = 0; k < 14; k++) { const t = (k / 14) * TAU; kit.glow(ico(0.2), BUL[k % BUL.length], x + Math.sin(t) * 3.5, sy + 0.1, z + Math.cos(t) * 3.5); }
    }
    if (!rich) return;
    // Star Wheel (NE): A-frame in the kit, the wheel turning about its axle, which points at the plaza centre
    const a = 30 * PI / 180, x = Math.sin(a) * 82, z = -Math.cos(a) * 82, y0 = hf(x, z) - 0.4, R = 13.5, hy = y0 + R + 4.2;
    const ry = Math.atan2(x, z), c = Math.cos(ry), s = Math.sin(ry);
    kit.add(P.cyl(8.5, 9.5, 1.4, 20), 0x2a2f5a, x, y0 + 0.7, z);
    kit.add(P.tor(8.6, 0.2, 5, 28), 0xffd23f, x, y0 + 1.4, z, PI / 2, 0, 0);
    for (const sd of [-1, 1]) for (const lg of [-1, 1]) {
      // legs: from the plinth (spread along the wheel plane) up to the axle ends (the axle runs along the radial dir)
      const fx = x + lg * 6.5 * c + sd * 1.8 * s, fz = z - lg * 6.5 * s + sd * 1.8 * c, tx = x + sd * 1.3 * s, tz = z + sd * 1.3 * c;
      const dx = tx - fx, dy = hy - (y0 + 1.4), dz = tz - fz, L = Math.hypot(dx, dy, dz);
      const g = P.cyl(0.3, 0.42, L, 8);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L)));
      g.translate((fx + tx) / 2, (y0 + 1.4 + hy) / 2, (fz + tz) / 2); kit.addRaw(g, 0xfff1dc);
    }
    const wk = new Gg.Kit();
    // (the wheel's local +Z — its star face — turns toward the plaza: the mesh's yaw is atan2(x, z), so +Z points away;
    // the star goes on the -Z face)
    wk.add(P.tor(R, 0.4, 6, 48), 0xff9ad0, 0, 0, 0);
    wk.add(P.tor(R - 1.5, 0.17, 4, 40), 0xfff1dc, 0, 0, 0);
    wk.add(P.cyl(1.5, 1.5, 3.0, 14), 0x2a2f5a, 0, 0, 0, PI / 2, 0, 0);
    if (Gg.emblem) wk.add(Gg.emblem('star', 0xffd23f).clone(), null, 0, 0, -1.6, 0, PI, 0, 4.2);
    for (let k = 0; k < 16; k++) { const t = (k / 16) * TAU, sp = P.cyl(0.12, 0.12, R - 0.4, 5, true); sp.translate(0, (R - 0.4) / 2, 0); sp.rotateZ(t); wk.addRaw(sp, k & 1 ? 0xc8a8ff : 0xfff1dc); }
    for (let k = 0; k < 48; k++) { const t = (k / 48) * TAU; wk.glow(ico(0.32), BUL[k % BUL.length], Math.cos(t) * (R + 0.5), Math.sin(t) * (R + 0.5), 0); }
    for (let k = 0; k < 24; k++) { const t = (k / 24) * TAU + 0.1; wk.glow(ico(0.2), BUL[(k + 2) % BUL.length], Math.cos(t) * (R - 1.5), Math.sin(t) * (R - 1.5), -0.32); }
    const wd = wk.data();
    const wheel = new THREE.Mesh(wd.solid, G.M.vc({ rimStr: 0.3 }));
    if (wd.glow) { const gm = new THREE.Mesh(wd.glow, Gg.glowMat()); gm.userData.glow = true; wheel.add(gm); }
    wheel.position.set(x, hy, z); wheel.rotation.order = 'YXZ'; wheel.rotation.y = ry; wheel.name = 'plazaStarWheel';
    world.add(wheel);
    // gondolas (one instanced mesh, upright, riding the rim): cabin + striped canopy + hanger
    // (a 10-sided cabin: ~1/5 of a rounded box's triangles, and these are only ever seen from 80 m)
    const cab = Gg.merge([Gg.colorize(P.cyl(0.8, 0.74, 0.55, 8).translate(0, -0.42, 0), 0xffffff), Gg.colorize(P.cyl(0.82, 0.8, 0.45, 8, true).translate(0, 0.08, 0), 0x9ff6ff), Gg.colorize(P.cyl(0.86, 0.82, 0.4, 8).translate(0, 0.5, 0), 0xffffff)]);
    const roof = P.cone(1.15, 0.7, 8); roof.translate(0, 1.05, 0); Gg.colorize(roof, (px, py, pz) => (Math.floor((Math.atan2(pz, px) + PI) / (PI / 5)) & 1 ? 0xffffff : 0xff9ad0));
    const hang = P.cyl(0.06, 0.06, 1.2, 4); hang.translate(0, 1.85, 0); Gg.colorize(hang, 0x2a2f5a);
    const GC = [0xffd27a, 0x9ff6ff, 0xff9ad0, 0xc8a8ff, 0x7fe8d0, 0xffffff];
    const pts = [];
    for (let k = 0; k < 12; k++) pts.push({ x, y: hy, z, s: 1, ry, color: GC[k % GC.length] });
    const gond = Gg.instancedAt(Gg.merge([cab, roof, hang]), G.M.vc({ rimStr: 0.3 }), pts);
    gond.name = 'plazaGondolas'; gond.frustumCulled = false;
    world.add(gond);
    const arr = gond.instanceMatrix.array, ang = new Float64Array(1);   // (the angle in a typed array: a closure let would box)
    world.onUpdate(dt => {
      ang[0] += dt * 0.09 * (G.Save.set.reducedMotion ? 0.35 : 1);
      const a0 = ang[0];
      wheel.rotation.z = a0;
      for (let k = 0; k < 12; k++) {
        const t = a0 + k * (TAU / 12), lx = Math.cos(t) * R, ly = Math.sin(t) * R - 2.0;
        arr[k * 16 + 12] = x + lx * c; arr[k * 16 + 13] = hy + ly; arr[k * 16 + 14] = z - lx * s;
      }
      gond.instanceMatrix.needsUpdate = true;
    });
  }
  function dressPlaza(world, flags, ao, gateA, hf) {
    const Gg = G.Geo, P = Gg.P, kit = new Gg.Kit(), rich = !G.R.tierRank || G.R.tierRank() > 0, full = !G.R.tierRank || G.R.tierRank() > 1;
    const pinkL = 0xff9ad0, lilac = 0xb983ff, mint = 0x7fe8d0, cream = 0xfff1dc, gold = 0xffd23f, navy = 0x2a2f5a;
    const BULBS = [0xffe9a8, 0xff9ad0, 0x9ff6ff, 0xffd27a, 0xc8a8ff];
    // gate arches (beyond the spawn portals, framing them from the plaza)
    GATES.forEach((g, i) => {
      const a = gateA[i], ux = g.x / GATE_R, uz = g.z / GATE_R, R = 39.4;
      SK.arch(kit, ux * R, 0, uz * R, a, { span: 13, h: 8.8, r: 0.78, seg: 15, cols: [[lilac, cream], [mint, cream], [pinkL, cream]][i], base: navy, crownCol: cream, trim: gold, emblem: rich ? 'shield' : null, emblemCol: 0xff6f91, bulbs: BULBS, faceTo: [0, 0] });
    });
    // planters (and the tall pair at each arch)
    const planter = (x, z, s, tall) => {
      // (review: 8-sided pots and 3-sided rims — the plaza dressing has to leave room for a wave-10 crowd on Medium)
      kit.add(P.cyl(0.62 * s, 0.48 * s, 0.75 * s, 8), 0xffb38a, x, 0.37 * s, z);
      kit.add(P.tor(0.6 * s, 0.07 * s, 3, 10), gold, x, 0.74 * s, z, PI / 2, 0, 0);
      kit.add(P.cyl(0.66 * s, 0.66 * s, 0.12 * s, 8), navy, x, 0.06 * s, z);
      const balls = tall ? [[0, 1.45, 0.62], [0, 2.4, 0.48], [0, 3.15, 0.34]] : [[0, 1.25, 0.66]];
      for (const b of balls) {
        const g = new THREE.IcosahedronGeometry(b[2] * s, 1); g.deleteAttribute('uv');
        kit.add(g, (px, py, pz) => (Math.sin(px * 9 + pz * 7) + Math.cos(py * 8) > 1.2 ? [0xff9ad0, 0xffe9a8, 0xc8a8ff][((px + pz) * 10 & 3) % 3] : 0x3fa87a), x, b[1] * s, z);
      }
      if (tall) kit.add(P.cyl(0.06, 0.06, 1.0 * s, 4), 0x7a5a3a, x, 1.0 * s, z);
      ao.push({ x, z, r: 1.3 * s, k: 0.28 });
    };
    if (rich) {
      for (let i = 0; i < 24; i++) {
        const a = (i + 0.5) / 24 * TAU;
        if (gateA.some(ga => Math.abs(U.wrapAngle(a - ga)) < 0.3) || (!full && (i & 1))) continue;
        planter(Math.sin(a) * 39.2, -Math.cos(a) * 39.2, 1, false);
      }
      GATES.forEach((g, i) => { const ux = g.x / GATE_R, uz = g.z / GATE_R; for (const sd of [-1, 1]) planter(ux * 39.0 - uz * sd * 7.6, uz * 39.0 + ux * sd * 7.6, 1.15, true); });
    }
    // bunting masts round the ring (between the planters), strings mast to mast except across the gates
    const ms = [];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, gate = gateA.some(ga => Math.abs(U.wrapAngle(a - ga)) < 0.25);
      if (gate) { ms.push(null); continue; }
      const x = Math.sin(a) * 38.4, z = -Math.cos(a) * 38.4;
      kit.add(P.cyl(0.07, 0.09, 6.2, 6), cream, x, 3.1, z); kit.glow(new THREE.OctahedronGeometry(0.26, 0), BULBS[i % BULBS.length], x, 6.35, z);
      ms.push([x, 5.9, z]);
    }
    if (flags) for (let i = 0; i < ms.length; i++) { const p = ms[i], q = ms[(i + 1) % ms.length]; if (p && q) SK.bunting(flags, kit, p, q, { cols: [0xff6b8b, 0xffd23f, 0x7af0ff, 0xb983ff, 0xffffff], sag: 1.2, ofs: i }); }
    if (hf) G.safe('def skyline', () => festSkyline(world, kit, hf, rich));
    // party balloons over the rooftops between the gates (a festive skyline)
    if (full && SK.balloons) for (const deg of [45, 135, 160, 200, 225, 315]) {
      const a = deg * PI / 180, sx = Math.sin(a), sz = -Math.cos(a);
      SK.balloons(kit, sx * 44, 13.5 + (deg % 2), sz * 44, sx * 46.5, 6.5, sz * 46.5, [[0xff9ad0, 0xffe9a8, 0x9ff6ff], [0xc8a8ff, 0xffffff, 0xff9ad0], [0x7fe8d0, 0xffd27a, 0xffffff]][deg % 3]);
    }
    // a festival halo high over the plaza: twelve hovering glow orbs (anti-grav party lights) strung with bulbs, well
    // above the bots' flight height and clear of the core (High / Ultra: review budget trim for Medium's wave 10)
    if (full) {
      const orbs = [];
      for (let i = 0; i < 12; i++) {
        const a = (i + 0.5) / 12 * TAU, x = Math.sin(a) * 16.5, z = -Math.cos(a) * 16.5, y = 8.6 + (i & 1) * 0.5;
        { const g = new THREE.IcosahedronGeometry(0.42, 1); g.deleteAttribute('uv'); kit.glow(g, BULBS[i % BULBS.length], x, y, z); }
        kit.add(P.tor(0.5, 0.07, 3, 12), gold, x, y, z, PI / 2, 0, 0);
        orbs.push([x, y - 0.1, z]);
      }
      for (let i = 0; i < 12; i++) SK.lights(kit, orbs[i], orbs[(i + 1) % 12], { sag: 0.7, step: 0.9, cols: BULBS });
    }
    // string lights between the plaza lamp posts (they hang from below the lamp heads, 2.5+ m over the cobbles)
    if (rich) for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * TAU + 0.31, a1 = ((i + 1) / 10) * TAU + 0.31;
      SK.lights(kit, [Math.sin(a0) * 30, 3.25, -Math.cos(a0) * 30], [Math.sin(a1) * 30, 3.25, -Math.cos(a1) * 30], { sag: 0.75, step: 0.85, cols: BULBS });
    }
    // mosaic star ring round the fountain (a flat decal a few cm over the cobbles)
    if (rich) {
      const pos = [], col = [], c = new THREE.Color(), N = 48, r0 = 5.0, r1 = 7.6, y = 0.035;
      const ring = (ra, rb, colOf, n) => {
        for (let k = 0; k < n; k++) {
          const t0 = k / n * TAU, t1 = (k + 1) / n * TAU;
          c.setHex(colOf(k));
          const pa = [Math.cos(t0) * ra, Math.sin(t0) * ra], pb = [Math.cos(t1) * ra, Math.sin(t1) * ra], pc = [Math.cos(t1) * rb, Math.sin(t1) * rb], pd = [Math.cos(t0) * rb, Math.sin(t0) * rb];
          // (wound counter-clockwise seen from above: x right, z toward the viewer)
          pos.push(pa[0], y, pa[1], pb[0], y, pb[1], pc[0], y, pc[1], pa[0], y, pa[1], pc[0], y, pc[1], pd[0], y, pd[1]);
          for (let q = 0; q < 6; q++) col.push(c.r, c.g, c.b);
        }
      };
      ring(r0, r0 + 0.3, () => gold, N);
      ring(r0 + 0.3, r1 - 0.3, k => [lilac, cream, mint, cream][k % 4], 16);
      ring(r1 - 0.3, r1, () => gold, N);
      // star points between the rings
      for (let k = 0; k < 8; k++) {
        const t = k / 8 * TAU + PI / 16, ca = Math.cos(t), sa = Math.sin(t), w = 0.5;
        c.setHex(k & 1 ? pinkL : 0x7af0ff);
        const tip = [ca * (r1 + 1.6), sa * (r1 + 1.6)], l = [ca * r1 - sa * w, sa * r1 + ca * w], rr = [ca * r1 + sa * w, sa * r1 - ca * w];
        pos.push(l[0], y, l[1], tip[0], y, tip[1], rr[0], y, rr[1]);
        for (let q = 0; q < 3; q++) col.push(c.r, c.g, c.b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      kit.addRaw(g, null);
    }
    // glowing inlay rings in the cobbles (round the fountain, and either side of the painted pink ring), broken where
    // the gate lanes run so their stripes stay clear
    {
      const pos = [], col = [], c = new THREE.Color(), y = 0.045;
      const arc = (rm, w, hex) => {
        const n = Math.round(rm * 2.2);
        c.setHex(hex);
        for (let k = 0; k < n; k++) {
          const t0 = k / n * TAU, t1 = (k + 1) / n * TAU, tm = (t0 + t1) / 2;
          // (angles measured as the plaza does: atan2(x, -z); lanes run from the gates at 0, +90 and -90 degrees)
          if (rm > 9 && gateA.some(ga => Math.abs(U.wrapAngle(tm - ga)) < Math.asin(Math.min(1, 3.6 / rm)))) continue;
          const p = (t, r) => [Math.sin(t) * r, -Math.cos(t) * r];
          const a0 = p(t0, rm - w / 2), a1 = p(t1, rm - w / 2), b1 = p(t1, rm + w / 2), b0 = p(t0, rm + w / 2);
          pos.push(a0[0], y, a0[1], a1[0], y, a1[1], b1[0], y, b1[1], a0[0], y, a0[1], b1[0], y, b1[1], b0[0], y, b0[1]);
          for (let q = 0; q < 6; q++) col.push(c.r, c.g, c.b);
        }
      };
      arc(4.95, 0.22, 0x9ff6ff);
      if (rich) {
        arc(19.2, 0.14, 0xffb8e6); arc(20.8, 0.14, 0xffb8e6); arc(36.0, 0.12, 0xc8a8ff);
        // sun-ray inlays between the lanes (over the pale paving rays), tapering outward
        for (let k = 0; k < 8; k++) {
          const t = (22.5 + 45 * k) * PI / 180, r0 = 9.6, r1 = 18.6, dl = 0.26 / r0, dd = 0.09 / r1;
          const p = (tt, r) => [Math.sin(tt) * r, -Math.cos(tt) * r];
          const A = p(t - dl, r0), B = p(t + dl, r0), C = p(t + dd, r1), D = p(t - dd, r1);
          c.setHex(k & 1 ? 0xffd6f0 : 0xc8f6ff);
          pos.push(A[0], y, A[1], B[0], y, B[1], C[0], y, C[1], A[0], y, A[1], C[0], y, C[1], D[0], y, D[1]);
          for (let q = 0; q < 6; q++) col.push(c.r, c.g, c.b);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      kit.glowRaw(g, null);
    }
    SK.meshes(world, kit, 'plazaDressing', { rimStr: 0.25 });
  }
  function buildPlaza(world) {
    const hf = (x, z) => { const r = Math.hypot(x, z); return r < 50 ? 0 : (r - 50) * 0.18 + G.noise.fbm2(x * 0.03, z * 0.03, 3) * 3 * U.smoothstep(50, 70, r); };
    // (its argument-free twin for the phys samplers, 05_phys _hfUpdate: reads x, z from Phys.hIn, writes exactly hf(x, z))
    const HI_ = G.Phys.hIn, HO_ = G.Phys.hOut;
    hf.s = () => { HO_[0] = hf(HI_[0], HI_[1]); };
    world.phys.heightFn = hf;
    world.phys.bounds = { minX: -38, maxX: 38, minZ: -38, maxZ: 38 };
    // night palette: slightly deeper cobbles so the lamp pools, glowing pads and the robots read against them
    const cob = new THREE.Color(0xd9c8b4), cobD = new THREE.Color(0xc2ad97), tile = new THREE.Color(0xc2dade), lane = new THREE.Color(0x8f84b2), laneE = new THREE.Color(0xff7a3d), grass = new THREE.Color(0x3a8f7a), grassL = new THREE.Color(0x4aa08a), c = new THREE.Color();
    const rayC = new THREE.Color(0xfff4e0), pinkC = new THREE.Color(0xff9fd0);
    const colorFn = (x, z) => {
      const r = Math.hypot(x, z), a = Math.atan2(x, -z);
      if (r > 41) { c.copy(grass).lerp(grassL, U.clamp(0.5 + G.noise.n2(x * 0.08, z * 0.08), 0, 1)); return c.getHex(); }
      if (r < 8) { c.copy(tile); if ((Math.floor(x / 1.5) + Math.floor(z / 1.5)) % 2) c.lerp(cobD, 0.18); return c.getHex(); }
      c.copy(cob);
      const ring = Math.floor(r / 3), seg = Math.floor(a * r / 3.2);
      if ((ring + seg) % 2) c.lerp(cobD, 0.75);
      if (G.noise.n2(x * 0.4, z * 0.4) > 0.35) c.lerp(cobD, 0.4);
      // pale "sun ray" paving between the gate lanes, from the fountain mosaic out to the pink ring (art pass)
      if (r > 9.5 && r < 18.8) { const d = (((a * 180 / PI - 22.5) % 45) + 45) % 45, dw = Math.min(d, 45 - d), wd = 4.2 * 12 / r; if (dw < wd) c.lerp(rayC, 0.55 * (1 - dw / wd)); }
      if (Math.abs(r - 20) < 0.6 || Math.abs(r - 36) < 0.8) c.lerp(pinkC, 0.55);
      // lanes from the gates toward the fountain, with chevrons
      for (const g of GATES) {
        const gl = Math.hypot(g.x, g.z), ux = -g.x / gl, uz = -g.z / gl;
        const along = (x - g.x) * ux + (z - g.z) * uz, side = Math.abs((x - g.x) * -uz + (z - g.z) * ux);
        if (along > -2 && along < gl - 7 && side < 3.2) {
          c.lerp(lane, side > 2.6 ? 0.85 : 0.5);
          const ch = (along % 4.5) - Math.abs(side) * 0.7;
          if (ch > 1.0 && ch < 2.1 && side < 2.2) c.lerp(laneE, 0.9);
        }
      }
      return c.getHex();
    };
    // Fine 1.5 m grid only where the lanes and cobbles are (±42); the surrounding lawn and hills use a
    // 6 m grid whose inner vertices tuck under the plaza mesh (~29k -> ~9k triangles).
    const TM = G.Terrain.terrainMat ? G.Terrain.terrainMat({ rimStr: 0.05, detail: [0.13, 0.08, 0.3] }) : G.M.vc({ rimStr: 0.05 });
    const terr = G.Terrain.build({ heightFn: hf, colorFn, minX: -42, maxX: 42, minZ: -42, maxZ: 42, res: 1.5, chunks: 2, material: TM });
    world.add(terr);
    const hfOuter = (x, z) => (Math.abs(x) < 41.9 && Math.abs(z) < 41.9 ? hf(x, z) - 0.6 : hf(x, z));
    const outer = G.Terrain.build({ heightFn: hfOuter, colorFn, minX: -90, maxX: 90, minZ: -90, maxZ: 90, res: 6, chunks: 2, material: TM });
    world.add(outer);
    const Gg = G.Geo, bake = new THREE.Group(), ao = [];
    const place = (prop, x, y, z, ry) => { const r = Gg.place(world, prop, x, y, z, ry || 0, bake); if (Gg.aoFromCols) Gg.aoFromCols(r.cols, ao, hf); return r; };
    const flags = Gg.flagBatch ? Gg.flagBatch() : null;
    place(Gg.plazaFountain(4.5), 0, 0, 0, 0);
    // buildings ring, gaps at the three gates (and the south arch)
    const kinds = ['guild', 'workshop', 'shop', 'cafe', 'gallery', 'house', 'training', 'hangar', 'house', 'arena'];
    const angs = [];
    for (let d = 0; d < 360; d += 31) { const near = [0, 90, 270].some(g => Math.abs(((d - g + 540) % 360) - 180) < 22); if (!near) angs.push(d); }
    angs.forEach((d, i) => {
      const a = d * PI / 180, x = Math.sin(a) * 47, z = -Math.cos(a) * 47;
      const pr = Gg.building(kinds[i % kinds.length], { seed: i, lod: 0.42 });
      for (const ch of pr.mesh.children.slice()) if (ch.material && ch.material.map) pr.mesh.remove(ch);
      place(pr, x, 0, z, Math.atan2(-x, -z));
    });
    // gate arches + spawn portals, lamp posts, benches, fences between buildings
    for (const g of GATES) {
      const a = Math.atan2(g.x, -g.z);
      place(Gg.teleporter(0xb983ff), g.x, 0, g.z, a);
      for (const s of [-1, 1]) { const px = g.x + Math.cos(a) * s * 4.2, pz = g.z + Math.sin(a) * s * 4.2; place(Gg.banner(0xff7a3d, 'bolt', flags ? { cloth: false } : undefined), px, 0, pz, a); if (flags) flags.banner(0xff7a3d, 'bolt', px, 0, pz, a); }
    }
    // street lamps: one halo batch + warm light pools on the cobbles (both one draw call)
    const lamps = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.31, x = Math.sin(a) * 30, z = -Math.cos(a) * 30; place(Gg.lampPost(), x, 0, z, 0); lamps.push([x, z]); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.52 + 0.2, x = Math.sin(a) * 23, z = -Math.cos(a) * 23; place(Gg.bench(), x, 0, z, Math.atan2(-x, -z)); }
    // perimeter trees: instanced (3 draw calls) and swaying in the night breeze
    const treeV = [Gg.treeGeo('round', 6, { palette: 'teal' }), Gg.treeGeo('round', 9, { palette: 'green' }), Gg.treeGeo('palm', 5, {})], treeP = [[], [], []];
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, r = 60 + (i % 3) * 6, x = Math.sin(a) * r, z = -Math.cos(a) * r; treeP[i % 3 ? i % 2 : 2].push({ x, y: hf(x, z) - 0.2, z, s: 1.3 + (i % 4) * 0.2, ry: a }); ao.push({ x, z, r: 3.6, k: 0.3 }); }
    treeV.forEach((g, i) => { if (treeP[i].length) world.add(Gg.instancedAt(g, Gg.windMat ? Gg.windMat(0.24) : G.M.vc(), treeP[i])); });
    G.safe('def dressing', () => dressPlaza(world, flags, ao, GATES.map(g => Math.atan2(g.x, -g.z)), hf));
    const baked = Gg.bake(bake); baked.name = 'plaza'; world.add(baked);
    if (flags && flags.count) world.add(flags.mesh());
    {
      const hp = [], pool = [];
      for (const [x, z] of lamps) { hp.push(x, 3.72, z); pool.push({ x, y: 0.04, z, s: 7.5 }); }
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
      const halo = new THREE.Points(hg, new THREE.PointsMaterial({ map: G.R.glowTex(), color: 0xffd890, size: 3.4, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      halo.renderOrder = 6; halo.name = 'lampHalos'; world.add(halo);
      const pg = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2);
      const pm = new THREE.MeshBasicMaterial({ map: G.R.glowTex(), color: 0xffaa50, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      const pools = Gg.instancedAt(pg, pm, pool); pools.renderOrder = 2; pools.name = 'lampPools'; world.add(pools);
    }
    // perimeter fence on the painted r = 36 ring (solid), stepped back behind each spawn gate (visual only), so
    // the arena edge is a visible barrier everywhere instead of the square physics bounds in open cobbles.
    const fence = new THREE.Group();
    const gateA = GATES.map(g => Math.atan2(g.x, -g.z));
    for (let i = 0; i < 40; i++) {
      const a = (i + 0.5) / 40 * TAU, nearGate = gateA.some(ga => Math.abs(U.wrapAngle(a - ga)) < 0.17), r = nearGate ? 40.5 : 37.2;
      Gg.place(nearGate ? null : world, Gg.fence(6.2), Math.sin(a) * r, 0, -Math.cos(a) * r, -a, fence);
    }
    world.add(Gg.bake(fence));
    world.add(Gg.distantMountains(150, 22, [0x3a4a8a, 0x45569e, 0x52507a, 0x2a3270], { haze: 0x2f3578, seed: 3 }));
    // ground occlusion: buildings, fence posts, lamps, benches, trees
    for (let i = 0; i < 40; i++) { const a = (i + 0.5) / 40 * TAU, nearGate = gateA.some(ga => Math.abs(U.wrapAngle(a - ga)) < 0.17), r = nearGate ? 40.5 : 37.2; ao.push({ x: Math.sin(a) * r, z: -Math.cos(a) * r, r: 2.2, k: 0.22 }); }
    G.Terrain.bakeAO(terr, ao); G.Terrain.bakeAO(outer, ao);
    // night life: fireflies over the plaza and moonlit lawn beyond the fence
    if (G.Terrain.ambient) G.safe('def ambient', () => G.Terrain.ambient(world, { heightFn: hf, seed: 4, fireflies: { count: 70, color: 0xd8ff8a, box: [40, 6, 40] }, motes: { count: 30, color: 0x9fb4ff, size: 0.06, drift: [0.12, 0.05, 0.08] } }));
    if (G.Terrain.foliage) G.safe('def foliage', () => G.Terrain.foliage(world, {
      heightFn: hf, grid: outer, bounds: { minX: -64, maxX: 64, minZ: -64, maxZ: 64 }, blockPhys: true, seed: 8, densityK: 0.9, flowerK: 0.5,
      tint: [0.95, 1.05, 1.0], flowerColors: [0xc2a2ff, 0x7af0ff, 0xffffff], flowerGlow: 1.8,
      density: (x, z) => { const r = Math.hypot(x, z); return U.smoothstep(41.5, 43.5, r) * (1 - U.smoothstep(60, 63, r)); },
      flowers: (x, z) => { const r = Math.hypot(x, z); return U.smoothstep(42, 44, r) * (1 - U.smoothstep(58, 62, r)) * U.smoothstep(0.1, 0.45, G.noise.n2(x * 0.07, z * 0.07)); },
    }));
    return { hf };
  }

  // Lane glow: one additive strip per gate lane (one mesh, one draw call), chevrons flowing toward the core. During
  // a break the lanes the next wave will use glow (brighter = more bots); when the wave starts they flash, then fade.
  function laneGlow(world) {
    const pos = [], uv = [], lane = [], idx = [];
    GATES.forEach((g, li) => {
      const gl = Math.hypot(g.x, g.z), ux = -g.x / gl, uz = -g.z / gl, px = -uz, pz = ux;
      const L = gl - 7, Wd = 3.3, n = 14, b = pos.length / 3;
      for (let k = 0; k <= n; k++) { const a = -2 + (L + 2) * k / n; for (const sd of [-1, 1]) { pos.push(g.x + ux * a + px * sd * Wd, 0.07, g.z + uz * a + pz * sd * Wd); uv.push(sd * 0.5 + 0.5, a + 2); lane.push(li); } }
      for (let k = 0; k < n; k++) { const q = b + k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }   // CCW seen from above
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('aLane', new THREE.Float32BufferAttribute(lane, 1));
    geo.setIndex(idx); geo.computeBoundingSphere();
    const uI = { value: new THREE.Vector3() }, uT = { value: 0 };
    const mat = new THREE.ShaderMaterial({
      uniforms: { uI, uT },
      vertexShader: 'attribute vec2 aUv; attribute float aLane; varying vec2 vUv; varying float vL; void main(){ vUv = aUv; vL = aLane; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uI; uniform float uT; varying vec2 vUv; varying float vL; void main(){ float I = vL < 0.5 ? uI.x : vL < 1.5 ? uI.y : uI.z; if (I < 0.003) discard;' +
        ' float ax = abs(vUv.x - 0.5); float edge = 1.0 - smoothstep(0.32, 0.5, ax); float rim = smoothstep(0.36, 0.48, ax) * (1.0 - smoothstep(0.48, 0.5, ax));' +
        ' float ch = fract(vUv.y * 0.22 + ax * 0.9 - uT * 0.8); float band = smoothstep(0.0, 0.08, ch) * (1.0 - smoothstep(0.3, 0.38, ch));' +
        ' float fade = smoothstep(0.0, 3.0, vUv.y); vec3 col = vec3(0.6, 0.4, 1.0) * (0.14 * edge + 0.62 * band * edge + 0.5 * rim) * fade;' +
        ' gl_FragColor = vec4(col * I, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3; mesh.name = 'laneGlow';
    world.add(mesh);
    return { mesh, uI, uT, k: [0, 0, 0], want: [0, 0, 0] };
  }
  // Break-HUD text follows Text & UI size (--ui-t) through --def-t, capped (1.3, narrow phones 1.15, tiny phones 1.05)
  // so the 3-gate preview and the prep row keep fitting between the vitals and the minimap; no preview text is drawn
  // below 11 px (the gate columns show their arrow only — the gate name is the column's tooltip / accessible name).
  // In the top-centre column, which narrow phones scale down (style.css --tc-k), text keeps to that 11 px floor on
  // screen with max(calc(11px / var(--tc-k, 1)), ...); on tiny phones the prep buttons are packed tighter, so longer
  // labels (de "Reparieren", "Munition") need less of fitHud's zoom.
  let cssDone = false;
  function injectCss() {
    if (cssDone || document.getElementById('def-css')) { cssDone = true; return; }
    cssDone = true;
    const st = document.createElement('style'); st.id = 'def-css';
    st.textContent = `
#hud .def-prev, #hud .def-quick, #hud .def-brk { --def-t: min(var(--ui-t, 1), 1.3); }
html.gw-narrow #hud .def-prev, html.gw-narrow #hud .def-quick, html.gw-narrow #hud .def-brk { --def-t: min(var(--ui-t, 1), 1.15); }
html.gw-tiny #hud .def-prev, html.gw-tiny #hud .def-quick, html.gw-tiny #hud .def-brk { --def-t: min(var(--ui-t, 1), 1.05); }
#hud .def-brk { font-size:max(calc(11px / var(--tc-k, 1)), calc(14px * var(--def-t, 1))); }
#hud .def-clk { display:inline-flex; width:1.05em; height:1.05em; margin-right:4px; vertical-align:-0.15em; }
#hud .def-clk svg { width:100%; height:100%; }
html.gw-tiny #hud .def-cols { gap:3px; } html.gw-tiny #hud .def-chips { gap:4px; } html.gw-tiny #hud .def-col { padding:2px 4px 2px 3px; gap:3px; }
#hud .def-prev { display:flex; flex-direction:row; align-items:center; gap:7px; background:rgba(30,26,77,.66); border-radius:12px; padding:3px 8px; color:#fff; pointer-events:none; }
#hud .def-prev h4 { margin:0; font:800 max(12px, calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1)))/1.15 var(--f-body); white-space:nowrap; display:flex; flex-direction:column; align-items:flex-start; gap:0; }
#hud .def-prev h4 .t2 { font-weight:700; color:#e6d6ff; display:flex; align-items:center; gap:4px; }
#hud .def-prev.notheme h4 .t2 { display:none; }
#hud .def-prev h4 .big { background:#ff5fa2; border:1.5px solid #fff; border-radius:6px; padding:0 4px; font-size:max(12px, calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1))); line-height:1.2; }
#hud .def-prev.tight .def-col.off { display:none; }
#hud .def-prev.stack { flex-wrap:wrap; justify-content:center; row-gap:2px; }
#hud .def-prev.stack h4 { flex-basis:100%; align-items:center; }
#hud .def-cols { display:flex; gap:5px; }
#hud .def-col { display:flex; align-items:center; gap:5px; background:rgba(255,255,255,.12); border-radius:9px; padding:2px 6px 2px 4px; }
#hud .def-col.off { opacity:.35; }
#hud .def-col > b { font:800 max(14px, calc(14px * var(--def-t, 1)))/1 var(--f-body); display:flex; flex-direction:column; align-items:center; color:#e6d6ff; min-width:16px; }
#hud .def-col > small { font-size:max(12px, calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1))); }
#hud .def-chips { display:flex; gap:7px; }
#hud .def-chip { display:flex; flex-direction:column; align-items:center; gap:1px; font:800 max(12px, calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1)))/1.05 var(--f-body); }
#hud .def-chip .ic { width:24px; height:24px; position:relative; display:block; }
#hud .def-chip .ic svg { width:100%; height:100%; display:block; }
#hud .def-chip .n { position:absolute; right:-9px; bottom:-5px; background:#fff; color:#1e1a4d; border:1.5px solid #1e1a4d; border-radius:6px; font:900 max(12px, calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1)))/1.1 var(--f-body); padding:0 2px; }
#hud .def-chip.elite .ic svg { filter:drop-shadow(0 0 3px #ffd23f) drop-shadow(0 0 2px #ffd23f); }
#hud .def-chip small { font-size:max(12px, calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1))); max-width:max(58px, calc(58px * 11 / 12 / var(--tc-k, 1)), calc(58px * var(--def-t, 1))); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.95; margin-top:5px; }
#hud .def-prev.compact .def-chip small { display:none; }
#hud .def-prev.compact .def-chips { gap:10px; }
#hud .def-more { align-self:center; font:900 max(12px, calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1))) var(--f-body); color:#e6d6ff; }
#hud .def-padg { align-self:center; margin-right:0; width:auto; min-width:1.7em; padding:0 3px; border-radius:8px; background:#5b5f8f; font-size:max(calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1))); }
#hud .def-kbd { align-self:center; background:#1e1a4d; color:#fff; border:2px solid #fff; border-radius:7px; padding:1px 7px; font:900 max(calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1)))/1.3 var(--f-body); }
#hud .def-quick { display:flex; gap:5px; pointer-events:auto; justify-content:center; flex-wrap:nowrap; white-space:nowrap; }
#hud .def-quick .btn { min-height:30px; padding:1px 8px; font-size:max(calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1))); gap:4px; }
#hud .def-quick .btn.dim { opacity:.74; filter:saturate(.3); }
#hud .def-quick.nolabel .btn > .ql { display:none; }
#hud .def-quick .btn svg { width:14px; height:14px; }
#hud .def-quick .btn b { font:900 max(calc(11px / var(--tc-k, 1)), calc(12px * var(--def-t, 1))) var(--f-body); display:inline-flex; align-items:center; gap:2px; }
html.gw-tiny #hud .def-quick { gap:3px; } html.gw-tiny #hud .def-quick .btn { padding:1px 5px; gap:3px; } html.gw-tiny #hud .def-quick .btn b { gap:1px; }
`;
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- mode
  const MODE = {
    layout: 'fps', music: 'defense', pausable: true,
    enter(params) {
      params = params || {};
      const diff = X.applyDifficulty(params.difficulty);
      const night = G.Geo.biomes && G.Geo.biomes.night;
      const world = new G.World({
        sky: Object.assign({}, night ? night.sky : {}, { horizon: 0x4a4a9a, stars: true }),
        fog: { color: 0x2f3578, near: 55, far: Math.min(230, Math.max(G.R.q().draw, 140)) },
        // moonlit raid: cool blue key, violet bounce, warm lamp pools; a touch of vignette and extra bloom
        light: Object.assign({}, night ? night.light : {}, { exposure: 1.1, sun: 0xb4c8ff, sky: 0x98a2f0, ground: 0x76649e, shadow: 0x3a3f8e, shadowK: 0.44, rim: 0xb0d8ff,
          grade: { sat: 0.12, contrast: 0.09, vignette: 0.17, bloom: 1.5, tint: 0xa8b8ff, tintK: 0.04 } }),
        rules: {},
      });
      const A = buildPlaza(world);
      const D = X.diffInfo(diff);
      injectCss();
      const s = S = { world, params, diff, D, endless: !!params.endless, A, wave: 0, cleared: 0, phase: 'break', breakT: 8, queue: [], waveBots: new Set(), spawnT: 0,
        tokens: 0, tokensEarned: 0, turrets: [], traps: [], time: 0, timers: [], hud: {}, built: 0, coreWarn: 0, lastPopT: 0, seen: new Set(), dirT: 0, flawless: 0, prevDelay: 0 };
      s.lanes = laneGlow(world);
      s.next = planWave(s, 1);
      s.run = new X.Run({});
      s.core = new Core(world, 2000);
      world.addActor(s.core);
      const pl = X.makePlayer(world, new V3(3, 0, 19), 0, []);
      pl.yaw = 0.12; pl.pitch = 0.1;
      world.rules.onPickup = X.pickupRule(s.run, { player: () => world.player });
      world.rules.onKill = (t, info) => onKill(s, t, info);
      world.rules.onDamage = (t, res, info) => { if (t.isPlayer) { s.run.damage += res.dealt; s.run.onHurt(); } else if (t.isCore) { s.coreWarn -= 0; if (!s.coreHitMsg) { s.coreHitMsg = true; X.beepo('def.coreHit'); } } };
      s.ko = X.KO(world, s.run, { delay: 5, respawnPos: () => new V3(0, 0, 8.2), yaw: () => 0 });
      // pads + shop
      s.pads = PADS.map((p, i) => {
        const m = padMesh().mesh; m.position.set(p.x, 0, p.z); world.add(m);
        const pad = { i, pos: new V3(p.x, 0, p.z), turret: null, mesh: m };
        world.addInteract({ pos: pad.pos, r: 2.6, get key() { return !pad.turret ? 'def.int.pad' : pad.turret.level < 2 ? 'def.int.upgrade' : 'def.int.maxed'; }, onUse: () => padUse(s, pad) });
        return pad;
      });
      const ka = -2.2, kx = Math.sin(ka) * 10.5, kz = -Math.cos(ka) * 10.5;
      const kp = X.kioskProp(); G.Geo.place(world, kp, kx, 0, kz, Math.atan2(-kx, -kz) + PI * 0.15);
      world.addInteract({ pos: new V3(kx * 0.8, 0, kz * 0.8), r: 2.8, key: 'def.int.shop', onUse: () => G.UI.open('def-shop', {}) });
      // HUD
      G.HUD.show({ objective: false, timer: false, minimap: true, bolts: true, boss: true });
      G.HUD.minimapRange = 42;
      G.HUD.minimapDraw = (g, k, p2) => drawMinimap(s, g, k, p2);
      buildHud(s);
      G.UI.banner(G.t('def.title'), G.t('def.waveSub'), 2.6);
      s.timers.push({ t: 1.2, fn: () => X.beepo('def.how2') });
      X.prebuildNav(world);
      G.bus.emit('mode-start', 'defense', params);
      return world;
    },
    exit() {
      if (S && S.phase !== 'done') X.finish({ mode: 'defense', win: false, stars: 0, stats: [], run: S.run, silent: true, result: { waves: S.cleared, endless: S.endless, quit: true } });
      G.HUD.minimapDraw = null; G.HUD.setBoss(null);
      for (const id of ['defdir0', 'defdir1', 'defdir2', 'defboss']) G.HUD.removeMarker(id);
      if (FITRO.ro) { FITRO.ro.disconnect(); FITRO.ro = null; } if (FITRO.probe) FITRO.probe.remove(); FITRO.probe = null; FITRO.s = null; FIT.q = false;
      S = null;
    },
    update(dt) {
      const s = S; if (!s) return;
      for (let i = s.timers.length - 1; i >= 0; i--) { const t = s.timers[i]; t.t -= dt; if (t.t <= 0) { s.timers.splice(i, 1); t.fn(); } }
      if (s.phase === 'done') return;
      s.time += dt;
      s.ko.update(dt);
      const pl = s.world.player;
      if (pl && pl.alive) { const r = Math.hypot(pl.pos.x, pl.pos.z); if (r > 36.4) { const nx = pl.pos.x / r, nz = pl.pos.z / r, vr = pl.vel.x * nx + pl.vel.z * nz; pl.pos.x = nx * 36.4; pl.pos.z = nz * 36.4; if (vr > 0) { pl.vel.x -= nx * vr; pl.vel.z -= nz * vr; } } }
      if (s.phase === 'break') {
        s.breakT -= dt;
        // desktop (pointer locked, the quick buttons can't be clicked): B opens the Guard Shop during the break; on a
        // controller the View / Select button does (06_input hands it out as mapP, unused in this mode otherwise)
        const dev = G.input.device;
        if (((G.input.itemP && dev === 'desktop') || (G.input.mapP && dev === 'gamepad')) && !G.UI.anyOpen()) G.UI.open('def-shop', {});
        if (s.breakT <= 0) startWave(s);
      } else if (s.phase === 'wave') {
        s.spawnT -= dt;
        if (s.queue.length && s.spawnT <= 0) spawnNext(s);
        let alive = 0; for (const a of s.waveBots) { if (a.alive) alive++; else s.waveBots.delete(a); }
        if (!s.queue.length && alive === 0) waveCleared(s);
        else stragglers(s, alive);
      }
      // slow traps
      for (let i = s.traps.length - 1; i >= 0; i--) {
        const tr = s.traps[i]; tr.t -= dt;
        if (tr.t <= 0) { s.world.remove(tr.mesh); s.traps.splice(i, 1); continue; }
        tr.tick -= dt;
        if (tr.tick <= 0) { tr.tick = 0.2; for (const a of s.world.actors) if (a.alive && a.team === 1 && !a.isBoss && U.distXZ(a.pos, tr.pos) < 3) { a.slowT = Math.max(a.slowT || 0, 0.4); a.slowK = Math.min(a.slowK || 1, 0.6); } }
        tr.mesh.material.opacity = 0.75 * Math.min(1, tr.t / 2);
      }
      // core warnings
      const k = s.core.hp / s.core.maxHp;
      if (k < 0.3 && !s.lowWarned) { s.lowWarned = true; X.beepo('def.coreLow'); if (G.Audio) G.Audio.sfx('warn'); }
      if (k > 0.45) s.lowWarned = false;
      updateHud(s);
    },
    restart() { const p = S ? S.params : {}; G.Game.go('defense', p); },
  };
  G.Game.register('defense', MODE);

  // ---------------------------------------------------------------- waves
  function waveTypes(w) {
    const t = ['bumbler', 'hopper', 'rollo', 'squirt'];
    if (w >= 3) t.push('shieldy', 'gnat');
    if (w >= 5) t.push('lobba', 'zapper');
    if (w >= 6) t.push('pinch');
    if (w >= 8) t.push('bruiser');
    return t.filter(q => X.enemyKnown(q));
  }
  function startWave(s) {
    s.wave++;
    s.phase = 'wave';
    const w = s.wave;
    const nx = s.next && s.next.w === w ? s.next : planWave(s, w);
    s.next = null;
    const big = !!nx.plan.big;
    s.queue.length = 0;
    for (const e of nx.queue) s.queue.push(e);
    s.waveGates = nx.gates.slice();
    s.spawnT = 1.2; s.gi = Math.floor(Math.random() * 3); s.lastPopT = s.time;
    s.hpMult = w > WAVES ? 1 + 0.08 * (w - WAVES) : 1;
    s.waveCoreHp = s.core.hp;
    G.UI.banner(big ? G.t('def.bigWave') : G.t('def.waveIn', { n: w }), G.t('def.theme.' + themeIdx(w)), 2.2);
    if (G.Audio) G.Audio.sfx(big ? 'warn' : 'countdown');
    // incoming direction: the used gates flash, their lanes light up and edge arrows point at them for 4 s
    for (const gi of s.waveGates) {
      const g = GATES[gi];
      s.world.fx.ring(new V3(g.x, 0.4, g.z), 4, 0xb983ff, 0.8);
      G.HUD.marker('defdir' + gi, _v.set(g.x, 4.2, g.z), { icon: '<span style="font:900 15px/1 var(--f-body)">!</span>', label: G.t('def.gate.' + g.id), color: '#b983ff', dist: false });
    }
    s.dirT = 4;
    // first time a bot type shows up this run: Beepo names it and its role
    const fresh = [];
    for (const e of s.queue) { const t = e.boss || e.type; if (!s.seen.has(t)) { s.seen.add(t); if (!e.boss && w > 1) fresh.push(t); } }
    fresh.slice(0, 2).forEach((t, i) => s.timers.push({ t: 1.6 + i * 3.2, fn: () => X.beepo('def.newFoe', { name: G.t('enemy.' + t + '.name'), role: G.t('def.role.' + (ROLE[t] || 'flyer')) }) }));
    buildPreview(s);
  }
  function spawnNext(s) {
    if (X.Enemies_count(s) >= X.maxBots() + 2) { s.spawnT = 0.5; return; }
    const e = s.queue.shift();
    let g;
    if (e.g != null && GATES[e.g]) g = GATES[e.g];
    else { g = GATES[s.gi % 3]; s.gi++; }
    const pos = new V3(g.x + U.rand(-2.5, 2.5), 0, g.z + U.rand(-2.5, 2.5));
    if (e.boss === 'pinchking') {
      // wave 5 mini-boss: an elite (crowned) Pinchbot with ×3 HP that marches with the Big Wave
      const b = X.spawnEnemy(s.world, 'pinch', pos, { elite: true, difficulty: s.diff, behavior: 'assault', assaultTarget: s.core, alerted: true, wave: s.wave, hpMult: s.hpMult * 3 });
      if (b) { b.isMiniBoss = true; s.waveBots.add(b); s.miniBoss = b; }
      G.UI.banner(G.t('def.pinchKing'), G.t('def.pinchKingSub'), 2);
      if (G.Audio) G.Audio.sfx('bossRoar', { pitch: 1.2 });
    } else if (e.boss) {
      const b = X.spawnBoss(s.world, e.boss, new V3(g.x * 0.85, 0, g.z * 0.85), { difficulty: s.diff, hp: 1500, maxPhase: 1, scale: 0.7, arena: { x: 0, z: 0, r: 30 }, intro: false, noBanner: true, autoHud: false, hpMult: s.hpMult });
      if (b) { b.assaultTarget = s.core; s.waveBots.add(b); s.miniBoss = b; }
      G.UI.banner(G.t('def.boss'), '', 2);
      if (G.Audio) G.Audio.sfx('bossRoar');
    } else {
      // stationary turrets (Squirt) deploy mid-lane so they can reach the core
      if (e.type === 'squirt') { const k = U.rand(0.42, 0.55), sd = U.rand(-4, 4), gl = Math.hypot(g.x, g.z); pos.set(g.x * k + (-g.z / gl) * sd, 0, g.z * k + (g.x / gl) * sd); s.world.fx.ring(pos.clone().setY(0.2), 2.5, 0xb983ff, 0.6); }
      const bot = X.spawnEnemy(s.world, e.type, pos, { elite: e.elite, difficulty: s.diff, behavior: 'assault', assaultTarget: s.core, alerted: true, wave: s.wave, hpMult: s.hpMult });
      s.waveBots.add(bot);
    }
    s.world.fx.burst(new V3(g.x, 1.5, g.z), [0xb983ff, 0xffffff, 0x7af0ff], 14, 5, 0.3, 0.5);
    s.spawnT = s.wave >= 8 ? 0.5 : 0.75;
  }
  X.Enemies_count = s => { let n = 0; for (const a of s.waveBots) if (a.alive) n++; return n; };
  // Wave tail: once the queue is empty and only a few bots are left, mark them (edge arrows) so a kid can find a
  // sniper hovering by the rooftops; if nothing pops for 25 s, far stragglers are teleported back onto a lane near
  // the core. A wave can never stall forever.
  function stragglers(s, alive) {
    const H = G.HUD;
    if (s.queue.length || alive > 3) { if (s.stragMarked) { for (let i = 0; i < 4; i++) H.removeMarker('strag' + i); s.stragMarked = false; } return; }
    let i = 0;
    for (const a of s.waveBots) { if (!a.alive || i >= 4) continue; H.marker('strag' + i, _v.set(a.pos.x, a.pos.y + (a.h || 1.5) + 0.6, a.pos.z), { icon: '!', color: '#ff7a3d', dist: true }); i++; }
    for (; i < 4; i++) H.removeMarker('strag' + i);
    s.stragMarked = true;
    if (s.time - s.lastPopT < 25) return;
    s.lastPopT = s.time;
    for (const a of s.waveBots) {
      if (!a.alive || a.isBoss || Math.hypot(a.pos.x, a.pos.z) < 22) continue;
      let g = GATES[0], bd = 1e9; for (const q of GATES) { const d = Math.hypot(q.x - a.pos.x, q.z - a.pos.z); if (d < bd) { bd = d; g = q; } }
      const gl = Math.hypot(g.x, g.z), k = 18 / gl;
      s.world.fx.burst(a.pos.clone(), [0xb983ff, 0xffffff], 12, 4, 0.3, 0.5);
      a.pos.set(g.x * k, 0, g.z * k); if (a.fly) a.pos.y = (a.alt || 3); a.vel.set(0, 0, 0);
      if (a.relocPos) a.relocT = 0;
      s.world.fx.ring(a.pos.clone().setY(0.2), 2.5, 0xb983ff, 0.6);
      X.alert(a, s.core);
    }
  }
  function waveCleared(s) {
    s.cleared = s.wave;
    for (let i = 0; i < 4; i++) G.HUD.removeMarker('strag' + i);
    s.stragMarked = false;
    s.miniBoss = null; G.HUD.removeMarker('defboss');
    G.HUD.setBoss(G.t('def.core'), s.core.hp / s.core.maxHp);
    // optional goal: no core damage this wave → bonus tokens
    const flawless = s.waveCoreHp != null && s.core.hp >= s.waveCoreHp - 0.5;
    if (flawless) { s.tokens += FLAWLESS; s.tokensEarned += FLAWLESS; s.flawless++; }
    if (!s.endless && s.wave >= WAVES) { end(s, true); return; }
    s.phase = 'break'; s.breakT = 20;
    if (s.dirT > 0) s.dirT = 1e-3;
    s.prevDelay = 1.9;                 // the preview appears once the "Wave cleared!" banner is gone
    s.next = planWave(s, s.wave + 1);
    buildPreview(s);
    G.UI.banner(G.t('def.waveClear'), flawless ? G.t('def.flawless', { n: FLAWLESS }) : G.t('def.wave', { n: s.wave, m: s.endless ? '∞' : WAVES }), 1.8);
    if (G.Audio) G.Audio.sfx('questDone');
    if (flawless && G.Audio) G.Audio.sfx('coin', { pitch: 1.4 });
    const pl = s.world.player;
    if (pl && pl.alive) { pl.hp = Math.min(pl.maxHp, pl.hp + 25); }
    s.world.pickups.boltBurst(new V3(0, 6, 0), 20 + s.wave * 4);
  }
  function onKill(s, t, info) {
    if (!t || t.team !== 1 || t.isCrate || t.isBossPart) return;
    s.lastPopT = s.time;
    s.run.onPop(!!(info && info.src && !info.src.isPlayer));
    if (t.elite) s.run.elites++;
    const n = t.isBoss ? 10 : X.threat(t.enemyId, t.elite) + (t.isMiniBoss ? 4 : 0);
    s.tokens += n; s.tokensEarned += n;
    if (G.HUD) G.HUD.pick('+' + n, '<span style="display:inline-flex;width:16px;height:16px">' + X.icon('token') + '</span>');
  }
  function padUse(s, pad) {
    if (!pad.turret) {
      if (s.tokens < COST.turret) { G.UI.toast(G.t('def.shop.noTokens'), { icon: X.icon('token') }); if (G.Audio) G.Audio.sfx('error'); return; }
      s.tokens -= COST.turret; s.built++;
      const t = new Turret(s.world, pad.pos.clone().setY(0.35));
      s.world.addActor(t); pad.turret = t; s.turrets.push(t);
      s.world.fx.ring(pad.pos.clone().setY(0.5), 3, 0x5cffe1, 0.5); s.world.fx.confetti(pad.pos.clone().setY(1.5), 24);
      G.UI.toast(G.t('def.built'), { icon: X.icon('turret') }); if (G.Audio) G.Audio.sfx('buy');
    } else if (pad.turret.level < 2) {
      if (s.tokens < COST.upgrade) { G.UI.toast(G.t('def.shop.noTokens'), { icon: X.icon('token') }); if (G.Audio) G.Audio.sfx('error'); return; }
      s.tokens -= COST.upgrade; pad.turret.upgrade();
      s.world.fx.ring(pad.pos.clone().setY(0.5), 3, 0xffc21a, 0.5);
      G.UI.toast(G.t('def.upgraded'), { icon: X.icon('turret') }); if (G.Audio) G.Audio.sfx('levelup');
    }
  }
  function buy(s, what) {
    const pl = s.world.player;
    const c = COST[what];
    if (what === 'repair' && s.core.hp >= s.core.maxHp - 1) return G.UI.toast(G.t('def.shop.full'));
    if (what === 'ammo' && X.ammoMissing(pl) < 0.01) return G.UI.toast(G.t('def.shop.full'));
    if (s.tokens < c) { G.UI.toast(G.t('def.shop.noTokens'), { icon: X.icon('token') }); if (G.Audio) G.Audio.sfx('error'); return; }
    s.tokens -= c;
    if (what === 'repair') { s.core.hp = Math.min(s.core.maxHp, s.core.hp + 300); s.world.fx.ring(new V3(0, 5, 0), 4, 0x5cffe1, 0.6); G.UI.toast(G.t('def.repaired'), { icon: X.icon('core') }); }
    else if (what === 'ammo') { for (const w of pl.weapons) if (w.refill) w.refill(); }
    else if (what === 'trap') {
      const pos = new V3(pl.pos.x, 0.03, pl.pos.z);
      const m = new THREE.Mesh(G.Geo.splatGeo ? G.Geo.splatGeo(1) : new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x8bea4a, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      m.rotation.x = -PI / 2; m.position.copy(pos); m.scale.setScalar(3); s.world.add(m);
      s.traps.push({ pos, mesh: m, t: 30, tick: 0 });
      G.UI.toast(G.t('def.trap'));
    }
    if (G.Audio) G.Audio.sfx('buy');
  }
  function coreDown(s) {
    if (s.phase === 'done') return;
    s.world.fx.explosion(new V3(0, 5, 0), 6, 0x7af0ff);
    G.UI.banner(G.t('def.lost'), '', 2.2);
    s.timers.push({ t: 1.8, fn: () => end(s, s.endless && s.cleared >= WAVES) });
    s.phase = 'lost';
  }
  function end(s, win) {
    if (s.phase === 'done') return;
    s.phase = 'done';
    const pl = s.world.player; if (pl) pl.inputEnabled = false;
    const k = Math.max(0, s.core.hp / s.core.maxHp);
    const stars = win ? (k >= 0.75 ? 3 : k >= 0.4 ? 2 : 1) : (s.cleared >= 5 ? 1 : 0);
    if (!(G.Progress && G.Progress.modeRewards)) { const r = X.waveRec(); if (s.endless) r.endlessBest = Math.max(r.endlessBest || 0, s.cleared); else r.best = Math.max(r.best || 0, s.cleared); if (win) r.wins = (r.wins || 0) + 1; G.Save.save(); }
    const stats = [
      { key: 'def.stat.waves', value: s.cleared },
      { key: 'def.stat.core', value: Math.round(k * 100) + '%' },
      { key: 'def.stat.pops', value: s.run.pops },
      { key: 'def.stat.turrets', value: s.built },
      { key: 'def.stat.tokens', value: s.tokensEarned },
      { key: 'def.stat.time', value: X.fmt(s.time) },
    ];
    for (const a of s.world.actors) if (a.alive && a.team === 1) a.stunT = 99;
    // a loss is titled by how far you got, in an encouraging tone ("Nice try! You reached wave 3"), never "Great
    // defense!" after wave 0 and never sad; the subtitle says what happened
    X.finish({ mode: 'defense', win, stars, stats, run: s.run, title: win ? G.t('def.res.win') : G.t('def.res.loseWave', { n: Math.max(1, s.wave) }), subtitle: win ? null : G.t('def.res.loseSub'),
      result: { waves: s.cleared, endless: s.endless, core: Math.round(k * 100), pops: s.run.pops, turrets: s.built, time: Math.round(s.time) },
      retry: () => G.Game.go('defense', s.params), tip: win ? null : G.t('def.tip'), delay: 900 });
  }

  // ---------------------------------------------------------------- HUD
  function buildHud(s) {
    const el = G.UI.el, tc = G.HUD.slot('tc');
    FIT.w = 0;   // a new run measures afresh
    // row 1: wave + tokens, and during a break the countdown + Start chip (never wraps: the shrink-to-fit HUD column
    // would otherwise wrap it differently from break to break on narrow phones);
    // row 2 (break only): the prep choices (repair the core, drop a goo trap, refill ammo) right here instead of only
    // at the kiosk, each with its token cost, greyed out when you can't afford / don't need it; row 3: the preview.
    // Kept compact so the stack ends above the crosshair on a 390 px tall phone.
    s.hud.row = el('div.row', { style: { gap: '6px', flexWrap: 'nowrap', justifyContent: 'center' } });
    // (the chips never shrink or wrap: "Wave 1/10" squeezed into three lines by a long countdown read badly; a row too
    // wide for its place is handled by fitHud — compact countdown, then zoom)
    s.hud.wave = el('div.hud-chip', { style: { fontSize: 'max(calc(11px / var(--tc-k, 1)), 13px)', whiteSpace: 'nowrap', flexShrink: '0' } });
    s.hud.tok = el('div.hud-chip', { style: { flexShrink: '0' } }, el('span', { html: X.icon('token'), style: { display: 'inline-flex', width: '18px', height: '18px' } }), el('b', { text: '0' }));
    s.hud.row.append(s.hud.wave, s.hud.tok);
    tc.appendChild(s.hud.row);
    const tok = '<span style="display:inline-flex;width:14px;height:14px">' + X.icon('token') + '</span>';
    const qb = (id, key, icon) => {
      const b = el('button.btn.small.cool.clickable', { type: 'button', title: G.t('def.shop.' + id), 'aria-label': G.t('def.shop.' + id), onclick: ev => { ev.stopPropagation(); if (S && S.phase === 'break') { buy(S, id); updateQuick(S, true); } } },
        el('span', { html: icon, style: { display: 'inline-flex', width: '15px', height: '15px' } }), el('span.ql', { i18n: key }), el('b', { html: tok + COST[id] }));
      b.dataset.q = id; return b;
    };
    s.hud.brk = el('div.hud-chip.def-brk', { style: { gap: '8px', pointerEvents: 'auto', padding: '2px 4px 2px 12px', whiteSpace: 'nowrap', flexShrink: '0' } }, el('span'),
      el('button.btn.small.go.clickable', { type: 'button', style: { minHeight: '30px', padding: '2px 12px', fontSize: 'max(calc(11px / var(--tc-k, 1)), 13px)' }, onclick: ev => { ev.stopPropagation(); if (S && S.phase === 'break') S.breakT = 0; } }, el('span', { i18n: 'def.startWave' })));
    s.hud.row.appendChild(s.hud.brk);
    s.hud.kbd = el('kbd.def-kbd', { text: 'B' });
    // controller: the View / Select button opens the Guard Shop during the break (same pad glyph look as the HUD's prompts)
    s.hud.padg = el('span.pad-g.def-padg', { text: '⧉', 'aria-hidden': 'true' });
    s.hud.quick = el('div.def-quick', s.hud.kbd, s.hud.padg, qb('repair', 'def.q.repair', X.icon('core')), qb('trap', 'def.q.trap', X.icon('sweep')), qb('ammo', 'def.q.ammo', X.icon('bolt')));
    tc.appendChild(s.hud.quick);
    s.hud.prev = el('div.def-prev'); s.hud.prev.hidden = true;
    tc.appendChild(s.hud.prev);
    buildPreview(s);
  }
  // Next-wave preview (shown during the break): theme + one column per gate (W | N | E, as seen from the core's
  // south side) with the bots coming through it: role icon, count, role name; elites glow gold; unused gates dim.
  const GATE_ORDER = [2, 0, 1];
  const ARROW = { N: '▲', E: '▶', W: '◀' };
  function buildPreview(s) {
    const box = s.hud && s.hud.prev; if (!box) return;
    const nx = s.next;
    box.textContent = '';
    if (!nx) { box.hidden = true; return; }
    const el = G.UI.el;
    // two short lines beside the gate columns ("Next: wave 5" / "Pinch King's Big Wave" + BIG): one row of
    // preview, so it never has to be zoomed below 12 px to stay above the crosshair
    const head = el('h4', { title: G.t('def.nextWave', { n: nx.w, theme: G.t('def.theme.' + themeIdx(nx.w)) }) },
      el('span.t1', { text: G.t('def.nextWaveN', { n: nx.w }) }),
      el('span.t2', el('span', { text: G.t('def.theme.' + themeIdx(nx.w)) }), nx.plan.big ? el('span.big', { i18n: 'def.bigTag' }) : null));
    const cols = el('div.def-cols');
    for (const gi of GATE_ORDER) {
      const g = GATES[gi], list = nx.queue.filter(e => e.g === gi);
      const by = new Map();
      for (const e of list) { const k = (e.boss || e.type) + (e.elite ? '*' : ''); by.set(k, (by.get(k) || 0) + 1); }
      const all = Array.from(by.keys()).sort((a, b) => (b.indexOf('king') >= 0 || b === 'crankcrab' ? 9 : 0) - (a.indexOf('king') >= 0 || a === 'crankcrab' ? 9 : 0) || by.get(b) - by.get(a));
      const cap = nx.gates.length >= 3 ? 2 : 3;          // keeps a 3-gate preview narrow enough for a phone
      const keys = all.slice(0, cap);
      let more = 0; for (const k of all.slice(cap)) more += by.get(k);
      const chips = el('div.def-chips', keys.map(k => {
        const elite = k.endsWith('*'), t = elite ? k.slice(0, -1) : k;
        const role = G.t('def.role.' + (ROLE[t] || 'flyer'));
        return el('div.def-chip' + (elite ? '.elite' : ''), { title: role }, el('span.ic', el('span', { html: roleIcon(t) }), el('span.n', { text: '×' + by.get(k) })), el('small', { text: role }));
      }), more ? el('b.def-more', { text: '+' + more }) : null);
      const gate = G.t('def.gate.' + g.id);
      cols.appendChild(el('div.def-col' + (list.length ? '' : '.off'), { title: gate }, el('b', { 'aria-label': gate }, el('span', { text: ARROW[g.id], 'aria-hidden': 'true' })), list.length ? chips : el('small', { text: '—' })));
    }
    box.append(head, cols);
    box.hidden = s.phase !== 'break' || s.prevDelay > 0;
    // lanes the next wave uses glow, brighter where more bots come through
    const tot = Math.max(1, nx.queue.length);
    for (let i = 0; i < 3; i++) { const c = nx.queue.filter(e => e.g === i).length; s.lanes.want[i] = c ? 0.5 + 0.5 * Math.min(1, c * 3 / tot) : 0; }
  }
  // Size policy for the break HUD (wave row, prep buttons, next-wave preview) at every Text & UI size: the CSS caps
  // (--def-t) keep it compact, and this fit makes sure nothing overlaps whatever it actually meets on this screen —
  // the minimap (it grows with the text size), the vitals and the touch buttons. The countdown first swaps its sentence
  // for a clock + 0:20; a block that would still reach something is zoomed down (CSS zoom, so the blocks under it move
  // up too) by just enough, never below 0.6; the preview also shrinks (to 0.7) to stay above the crosshair. Runs only
  // when the layout can have changed (screen size, text size, language, break on / off, preview shown / next wave,
  // token digits, input device); never per frame.
  const FIT = { w: 0, h: 0, ts: '', lang: '', brk: false, pv: false, nw: -1, tl: 0, wv: -1, dev: '', settle: 0, q: false };
  function fitWatch(s, brk, pv) {
    // (the renderer's cached game-frame size: G.Screen.w() reads window.innerWidth, which forces a style + layout
    // flush when called every frame from the mode update)
    const w = G.R.w || (G.Screen ? G.Screen.w() : innerWidth), h = G.R.h || (G.Screen ? G.Screen.h() : innerHeight);
    const ts = G.Save.set.textSize, lang = G.i18n.lang, nw = s.next ? s.next.w : -1, tl = String(s.tokens).length, dev = G.input.device;
    if (w === FIT.w && h === FIT.h && ts === FIT.ts && lang === FIT.lang && brk === FIT.brk && pv === FIT.pv && nw === FIT.nw && tl === FIT.tl && s.wave === FIT.wv && dev === FIT.dev) {
      // one more fit once the layout has settled (~0.8 s of frames after a change: the touch buttons are placed and the
      // HUD columns sized a few frames after a mode start / resize / device switch, and a fit measured against their
      // first, provisional spots would keep a needless zoom)
      if (FIT.settle > 0 && (FIT.settle -= Math.min(0.05, G.time.realDt || 0.016)) <= 0) queueFit(s);
      return;
    }
    FIT.w = w; FIT.h = h; FIT.ts = ts; FIT.lang = lang; FIT.brk = brk; FIT.pv = pv; FIT.nw = nw; FIT.tl = tl; FIT.wv = s.wave; FIT.dev = dev;
    FIT.settle = 0.8;
    queueFit(s);
  }
  // The fit measures the layout that is actually painted, after the browser's own layout of the frame: a ResizeObserver
  // callback (a hidden probe is re-observed, which always reports once) — reading there is free, where the old
  // microtask right after the frame's DOM writes forced a synchronous style + layout flush for every read. (Measured
  // in the middle of the mode update, the touch buttons and vitals were caught in a provisional state.)
  const FITRO = { ro: null, probe: null, s: null };
  function queueFit(s) {
    if (FIT.q) return;
    FIT.q = true; FITRO.s = s;
    if (typeof ResizeObserver === 'undefined') { Promise.resolve().then(() => { FIT.q = false; if (S === s) G.safe('def hud fit', () => fitHud(s)); }); return; }
    if (!FITRO.ro) FITRO.ro = new ResizeObserver(() => { if (!FIT.q) return; FIT.q = false; const q = FITRO.s; if (q && S === q) G.safe('def hud fit', () => fitHud(q)); });
    // (the probe is a direct child of <body>, shallower than the HUD columns: the fit's own layout changes resize
    // .hud-tc, whose observer then reports in the same frame's next round instead of raising the "ResizeObserver
    // loop" error it raised with the probe deeper in the HUD)
    if (!FITRO.probe || !FITRO.probe.isConnected) {
      FITRO.probe = G.UI.el('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '0', top: '0', width: '1px', height: '1px', visibility: 'hidden', pointerEvents: 'none' } });
      document.body.appendChild(FITRO.probe);
    }
    FITRO.ro.unobserve(FITRO.probe); FITRO.ro.observe(FITRO.probe);
  }
  // The break countdown: "Next wave in 20s", or — when the wave row would otherwise have to shrink (big text on a small
  // phone, long languages) — a clock glyph + "0:20" (language-neutral), so the row keeps its text size where it can.
  function brkText(s) {
    const bn = Math.ceil(s.breakT), lang = G.i18n.lang, t = s.hud.brk.firstChild;
    s.hud.bn = bn; s.hud.bL = lang; s.hud.bC = !!s.hud.compact;
    if (s.hud.compact) { t.innerHTML = '<span class="def-clk" aria-hidden="true">' + X.icon('clock') + '</span>' + U.fmtClock(bn); t.title = G.t('def.break', { n: bn }); }
    else { t.textContent = G.t('def.break', { n: bn }); t.removeAttribute('title'); }
  }
  function fitHud(s) {
    const blocks = [s.hud.row, s.hud.quick, s.hud.prev].filter(Boolean);
    for (const b of blocks) b.style.zoom = '';
    if (s.hud.compact) { s.hud.compact = false; brkText(s); }   // every fit starts from the full countdown sentence
    if (s.hud.prev) s.hud.prev.classList.remove('compact', 'tight', 'notheme', 'stack');     // ... and the preview with its role labels
    const loc = r => (G.Screen && G.Screen.rectToLocal ? G.Screen.rectToLocal(r) : r);
    const vis = e => !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
    const obs = [];
    for (const sel of ['#hud .minimap', '#hud .vitals']) { const e = document.querySelector(sel); if (vis(e)) obs.push(loc(e.getBoundingClientRect())); }
    // (and the chips under the minimap — the clinks counter: on a 568 px phone the preview's last gate went under it)
    for (const e of document.querySelectorAll('#hud .hud-tr > .hud-chip')) if (vis(e)) obs.push(loc(e.getBoundingClientRect()));
    for (const e of document.querySelectorAll('#touch .tbtn')) if (vis(e)) obs.push(loc(e.getBoundingClientRect()));
    const W = G.Screen ? G.Screen.w() : innerWidth, PAD = 5;
    // how far (frame px) a block reaches into an obstacle or past the frame edge (0 = clear)
    const needOf = (b, r) => {
      const cx = (r.left + r.right) / 2;
      let need = Math.max(0, PAD - r.left, r.right - (W - PAD));
      for (const o of obs) {
        if (o.bottom <= r.top || o.top >= r.bottom || o.right <= r.left - PAD || o.left >= r.right + PAD) continue;
        need = Math.max(need, (o.left + o.right) / 2 >= cx ? r.right - (o.left - PAD) : (o.right + PAD) - r.left);
      }
      return need;
    };
    // first the countdown gives up its words (clock + 0:20); only what still reaches something is zoomed down
    const info = FIT.info = { W, obs: obs.map(o => [o.left, o.top, o.right, o.bottom].map(Math.round)), row0: null, need0: 0, zooms: [] };   // (tests: X.defFitInfo)
    if (s.phase === 'break' && vis(s.hud.row)) {
      const r0 = loc(s.hud.row.getBoundingClientRect());
      info.row0 = [r0.left, r0.top, r0.right, r0.bottom].map(Math.round); info.need0 = Math.round(needOf(s.hud.row, r0));
      if (info.need0 > 0.5) { s.hud.compact = true; brkText(s); }
    }
    // the preview gives up words before it ever shrinks (it is information only): the role labels first (icons and
    // counts stay; each chip keeps its role as a tooltip), then the theme line and the gates no robot comes through,
    // then it stacks (heading over the gate columns: narrower, one line taller). Its text never drops under 12 px
    // (zoom floor = 12 px / its CSS size: no zoom at all at Text size M).
    const pv0 = s.hud.prev, lim0 = (G.Screen ? G.Screen.h() : innerHeight) / 2 - 4;
    const prevBad = () => { const r = loc(pv0.getBoundingClientRect()); return needOf(pv0, r) > 0.5 || r.bottom - lim0 > 0.5; };
    if (vis(pv0) && prevBad()) {
      pv0.classList.add('compact'); info.prevCompact = true;
      if (prevBad()) { pv0.classList.add('tight', 'notheme'); info.prevTight = true; }
      // still too wide (a small phone between the vitals and the minimap): the heading goes above the gate columns —
      // kept only if the taller block still ends above the crosshair
      const r1 = loc(pv0.getBoundingClientRect());
      if (needOf(pv0, r1) > 0.5) {
        pv0.classList.add('stack');
        if (loc(pv0.getBoundingClientRect()).bottom - lim0 > 0.5) pv0.classList.remove('stack'); else info.prevStack = true;
      }
    }
    const defT = vis(pv0) ? (parseFloat(getComputedStyle(pv0).getPropertyValue('--def-t')) || 1) : 1, prevMinZ = Math.min(1, 1 / Math.max(1, defT));
    // the prep buttons also give up words before they shrink: a row that still reaches something drops the button names
    // (icon + cost stay; the name is each button's tooltip and accessible name), and the row is never zoomed so far that
    // its text drops under 11 px as drawn (CSS size x zoom x the top-centre column's scale on narrow phones)
    const q0 = s.hud.quick;
    let quickMinZ = 0.6;
    if (q0) {
      q0.classList.remove('nolabel');
      if (vis(q0) && needOf(q0, loc(q0.getBoundingClientRect())) > 0.5) { q0.classList.add('nolabel'); info.quickNoLabel = true; }
      const tc = q0.closest('.hud-tc'), mt = tc ? getComputedStyle(tc).transform : 'none';
      const colK = mt && mt !== 'none' ? (parseFloat(mt.slice(mt.indexOf('(') + 1)) || 1) : 1;
      const qb0 = q0.querySelector('.btn'), qfs = qb0 ? parseFloat(getComputedStyle(qb0).fontSize) || 12 : 12;
      quickMinZ = Math.min(1, 11.05 / (qfs * colK));
      info.quickMinZ = +quickMinZ.toFixed(3);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const b of blocks) {
        if (!vis(b)) continue;
        const r = loc(b.getBoundingClientRect()), wd = r.right - r.left;
        if (wd < 4) continue;
        const need = needOf(b, r);
        if (need <= 0.5) continue;
        const z0 = parseFloat(b.style.zoom) || 1, k = Math.max(b === pv0 ? prevMinZ : b === q0 ? quickMinZ : 0.6, z0 * (1 - 2 * need / wd));
        info.zooms.push([blocks.indexOf(b), [r.left, r.top, r.right, r.bottom].map(Math.round), Math.round(need), +k.toFixed(3)]);
        if (k < z0 - 0.004) b.style.zoom = k.toFixed(3);
      }
    }
    // and the stack ends above the crosshair's centre: the preview (information only, no touch target) gives the room
    const pv = s.hud.prev;
    if (vis(pv)) {
      const lim = (G.Screen ? G.Screen.h() : innerHeight) / 2 - 4;
      const r = loc(pv.getBoundingClientRect()), hgt = r.bottom - r.top, over = r.bottom - lim;
      if (over > 0.5 && hgt > 8) {
        const z0 = parseFloat(pv.style.zoom) || 1, k = Math.max(prevMinZ, z0 * (hgt - over) / hgt);
        if (k < z0 - 0.004) pv.style.zoom = k.toFixed(3);
      }
      info.prevZoom = parseFloat(pv.style.zoom) || 1; info.prevMinPx = +(12 * Math.max(1, defT) * info.prevZoom).toFixed(1);
    }
  }
  X.defFit = () => { if (S) fitHud(S); };   // (tests)
  X.defFitInfo = () => FIT.info || null;    // (tests: what the last fit measured and decided)
  const QBIT = { repair: 1, trap: 2, ammo: 4 };
  function updateQuick(s, force) {
    const q = s.hud.quick; if (!q) return;
    const pl = s.world.player;
    // bitmask (no per-frame objects / strings): 1 repair, 2 trap, 4 ammo usable right now
    const key = (s.tokens >= COST.repair && s.core.hp < s.core.maxHp - 1 ? 1 : 0) | (s.tokens >= COST.trap ? 2 : 0) | (s.tokens >= COST.ammo && !!pl && X.ammoMissing(pl) >= 0.01 ? 4 : 0);
    if (!force && s.hud.qk === key) return;
    s.hud.qk = key;
    for (const b of q.children) if (b.dataset.q) b.classList.toggle('dim', !(key & QBIT[b.dataset.q]));
  }
  function updateHud(s) {
    const H = G.HUD;
    H.setBoss(G.t('def.core'), s.core.hp / s.core.maxHp);
    // texts are rebuilt only when their number or the language changes (no per-frame strings)
    const lang = G.i18n.lang;
    if (s.hud.wn !== s.wave || s.hud.wL !== lang) { s.hud.wn = s.wave; s.hud.wL = lang; s.hud.wave.textContent = s.endless ? G.t('def.waveEndless', { n: Math.max(1, s.wave) }) : G.t('def.wave', { n: Math.max(1, s.wave), m: WAVES }); }
    const tk = String(s.tokens);
    if (s.hud.tk !== tk) { s.hud.tk = tk; s.hud.tok.lastChild.textContent = tk; s.hud.tok.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 200 }); }
    const brk = s.phase === 'break';
    if (s.hud.brkOn !== brk) { s.hud.brkOn = brk; s.hud.brk.style.display = s.hud.quick.style.display = brk ? 'flex' : 'none'; }
    if (s.hud.lang !== lang) { s.hud.lang = lang; buildPreview(s); }
    const dev = G.input.device;
    if (s.hud.desk !== dev) { s.hud.desk = dev; s.hud.kbd.style.display = dev === 'desktop' ? '' : 'none'; if (s.hud.padg) s.hud.padg.style.display = dev === 'gamepad' ? '' : 'none'; }
    if (brk) { const bn = Math.ceil(s.breakT); if (s.hud.bn !== bn || s.hud.bL !== lang || s.hud.bC !== !!s.hud.compact) brkText(s); updateQuick(s); }
    if (s.prevDelay > 0) s.prevDelay -= G.time.dt || 0.016;
    const pv = brk && !!s.next && !(s.prevDelay > 0);
    if (s.hud.prev && s.hud.prev.hidden === pv) s.hud.prev.hidden = !pv;
    fitWatch(s, brk, pv);
    // lane glow: the break preview's lanes; at a wave start the used lanes flash for the 4 s of direction arrows
    const dt = G.time.dt || 0.016, L = s.lanes;
    if (s.dirT > 0) { s.dirT -= dt; if (s.dirT <= 0) for (let i = 0; i < 3; i++) H.removeMarker('defdir' + i); }
    if (L) {
      let mx = 0;
      for (let i = 0; i < 3; i++) {
        const want = brk ? L.want[i] : s.phase === 'wave' && s.dirT > 0 && s.waveGates && s.waveGates.indexOf(i) >= 0 ? 0.85 + 0.15 * Math.sin(s.time * 9) : 0;
        L.k[i] = U.damp(L.k[i], want, brk ? 3 : 4, dt); mx = Math.max(mx, L.k[i]);
      }
      L.uI.value.set(L.k[0], L.k[1], L.k[2]);
      L.uT.value += dt * (G.Save.set.reducedMotion ? 0.3 : 1);
      L.mesh.visible = mx > 0.003;
    }
    // mini-boss tag (Pinch King / Mini Crankcrab) while it is alive
    if (s.miniBoss && s.miniBoss.alive) {
      const bo = s.hud.bossOpts || (s.hud.bossOpts = { icon: '<span style="display:inline-flex;width:15px;height:15px">' + X.icon('crown') + '</span>', label: G.t(s.miniBoss.isMiniBoss ? 'def.pinchKingName' : 'def.crankName'), color: '#ffc21a' });
      H.marker('defboss', _v.set(s.miniBoss.pos.x, s.miniBoss.pos.y + (s.miniBoss.h || 2) + 1, s.miniBoss.pos.z), bo);
    } else if (s.hud.bossMk !== false) { H.removeMarker('defboss'); s.hud.bossOpts = null; }
    s.hud.bossMk = !!(s.miniBoss && s.miniBoss.alive);
    H.setBolts(s.run.clinks);
    const afford = s.tokens >= COST.turret;
    for (const p of s.pads) if (!p.turret && afford) H.marker('pad' + p.i, _v.set(p.pos.x, 1.6, p.pos.z), { icon: '<span style="display:inline-flex;width:14px;height:14px">' + X.icon('turret') + '</span>', color: '#5cffe1', edge: false, dist: false }); else H.removeMarker('pad' + p.i);
    if (afford && !s.padHint) { s.padHint = true; X.beepo('def.how2'); }
  }
  function drawMinimap(s, g, k, pl) {
    g.fillStyle = '#e8d6bf'; g.beginPath(); g.arc(-pl.pos.x * k, -pl.pos.z * k, ARENA_R * k, 0, TAU); g.fill();
    g.fillStyle = '#7af0ff'; g.beginPath(); g.arc(-pl.pos.x * k, -pl.pos.z * k, 4.5 * k, 0, TAU); g.fill();
    // gates; the ones the next / current wave uses get a white ring
    const used = s.phase === 'break' && s.next ? s.next.gates : s.phase === 'wave' ? s.waveGates : null;
    GATES.forEach((gt, i) => {
      g.fillStyle = '#b983ff'; g.beginPath(); g.arc((gt.x - pl.pos.x) * k, (gt.z - pl.pos.z) * k, 5, 0, TAU); g.fill();
      if (used && used.indexOf(i) >= 0) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc((gt.x - pl.pos.x) * k, (gt.z - pl.pos.z) * k, 7.5, 0, TAU); g.stroke(); }
    });
  }
  // bind helpers
  const _coreDown = coreDown;
  Object.defineProperty(MODE, 'state', { get: () => S });
  function bindHelpers() { if (S) S.coreDown = () => _coreDown(S); }
  const _enter = MODE.enter;
  MODE.enter = function (p) { const w = _enter.call(MODE, p); bindHelpers(); return w; };

  // ---------------------------------------------------------------- shop + lobby screens
  G.UI.def('def-shop', {
    modal: true, dim: false,
    build(p, close, entry) {
      if (X.ui) X.ui.styleOnce();
      entry.el.classList.add('ex-screen');
      const el = G.UI.el, s = S;
      if (!s) return el('div');
      const items = [
        { id: 'repair', key: 'def.shop.repair', icon: X.icon('core') },
        { id: 'ammo', key: 'def.shop.ammo', icon: X.icon('bolt') },
        { id: 'trap', key: 'def.shop.trap', icon: X.icon('sweep') },
      ];
      const rows = items.map(it => el('div.card', { style: { flexDirection: 'row', alignItems: 'center', gap: '10px' } },
        el('span', { html: it.icon, style: { width: '30px', height: '30px', display: 'inline-flex', flex: 'none' } }),
        el('h3', { i18n: it.key, style: { flex: '1' } }),
        G.UI.btn(String(COST[it.id]), () => { buy(s, it.id); G.UI.refresh(); }, s.tokens >= COST[it.id] ? 'primary' : '', { raw: true, icon: '<span style="display:inline-flex;width:18px;height:18px">' + X.icon('token') + '</span>' })));
      const tok = el('div.hud-chip', el('span', { html: X.icon('token'), style: { display: 'inline-flex', width: '18px', height: '18px' } }), el('b', { text: String(s.tokens) }));
      return G.UI.panel('def.shop.title', close, [el('div.col', rows), el('p.muted.small', { i18n: 'def.shop.hint' })], { narrow: true, headRight: tok, icon: X.icon('kiosk') });
    },
  });
  G.UI.def('defense-select', {
    dim: false,
    build(p, close, entry) {
      if (X.ui) X.ui.styleOnce();
      entry.el.classList.add('ex-screen');
      const el = G.UI.el;
      const st = entry.st || (entry.st = { diff: G.Save.set.difficulty || 'normal', endless: false });
      if (!X.diffUnlocked(st.diff)) st.diff = 'normal';
      const rec = (G.Save.prof.records && G.Save.prof.records.wave) || X.waveRec();
      const wins = (G.Save.prof.records && G.Save.prof.records.defense && G.Save.prof.records.defense.wins) || rec.wins || 0;
      const endlessOk = wins > 0 || X.allUnlocked();
      const refresh = () => X.ui.keepScroll(entry);
      const how = el('div.ex-grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } }, [['core', 'def.how1'], ['turret', 'def.how2'], ['crown', 'def.how3']].map(([ic, k]) =>
        el('div.ex-box', { style: { alignItems: 'center', textAlign: 'center' } }, el('span', { html: X.icon(ic), style: { width: '40px', height: '40px', display: 'inline-flex' } }), el('p.ex-note', { i18n: k, style: { color: 'var(--ink)', fontSize: '12px' } }))));
      const hero = el('div.ex-hero', { style: { background: 'linear-gradient(180deg,#1b1f4d,#3e3f8f)' } },
        el('span', { html: '<svg viewBox="0 0 200 70" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0;width:100%;height:100%"><path d="M0 62 Q100 56 200 62 V70 H0Z" fill="#e8d6bf"/><path d="M88 62 Q100 50 112 62Z" fill="#cfe3e8"/><circle cx="100" cy="40" r="9" fill="#7af0ff"/><circle cx="100" cy="40" r="15" fill="none" stroke="#c8f6ff" stroke-width="2"/><rect x="20" y="34" width="22" height="28" rx="3" fill="#2ec4b6"/><path d="M18 36 L31 24 L44 36Z" fill="#ff8a4c"/><rect x="156" y="38" width="24" height="24" rx="3" fill="#3fa9ff"/><circle cx="60" cy="14" r="1.5" fill="#fff"/><circle cx="140" cy="10" r="1.5" fill="#fff"/><circle cx="170" cy="22" r="1.2" fill="#fff"/></svg>' }),
        el('div.ex-oi', { html: X.icon('core') }), el('h3', { i18n: 'def.title' }), el('p', { text: G.t('def.best', { n: rec.best || 0 }) + (rec.endlessBest ? '  ·  ' + G.t('def.bestEndless', { n: rec.endlessBest }) : '') }));
      const modes = el('div.ex-pills',
        el('button.ex-pill' + (!st.endless ? '.on' : ''), { type: 'button', onclick: () => { st.endless = false; refresh(); } }, el('span', { i18n: 'def.mode.standard' })),
        el('button.ex-pill' + (st.endless ? '.on' : '') + (endlessOk ? '' : '.locked'), { type: 'button', onclick: () => { if (!endlessOk) { G.UI.toast(G.t('def.mode.endlessLocked'), { icon: X.icon('lock') }); return; } st.endless = true; refresh(); } }, endlessOk ? null : el('span', { html: X.icon('lock') }), el('span', { i18n: 'def.mode.endless' })));
      const body = el('div.ex-cols',
        el('div.ex-list', hero, el('div', { style: { height: '8px' } }), how),
        X.ui.sideCol([
          el('div.ex-box', el('h4', { i18n: 'exp.diff' }), X.ui.diffPicker(st.diff, d => { st.diff = d; refresh(); })),
          el('div.ex-box', el('h4', { text: G.t('def.title') }), modes),
          el('div.ex-box', el('h4', { i18n: 'exp.rewards' }), X.ui.rewardPreview('defense', { waves: 10, difficulty: st.diff }))],
          G.UI.btn('exp.start', () => G.Game.go('defense', { difficulty: st.diff, endless: st.endless }), 'primary big ex-start')));
      const panel = G.UI.panel('def.select', close, [body], { icon: X.icon('core') });
      panel.classList.add('ex-panel');
      panel.querySelector('.panel-body').style.overflow = 'hidden';
      panel.querySelector('.panel-body').style.display = 'flex';
      return panel;
    },
  });

  X.defDbg = {
    state() { const s = S; return s ? { phase: s.phase, wave: s.wave, cleared: s.cleared, queue: s.queue.length, alive: X.Enemies_count(s), tokens: s.tokens, core: Math.round(s.core.hp), turrets: s.turrets.length, breakT: +s.breakT.toFixed(1), clinks: s.run.clinks } : null; },
    skip() { if (S && S.phase === 'break') S.breakT = 0; },
    killWave() { const s = S; if (!s) return; s.queue.length = 0; for (const a of s.waveBots) if (a.alive) s.world.damage(a, 1e7, { src: s.world.player }); },
    tokens(n) { if (S) S.tokens += n; },
    build(i) { if (S) padUse(S, S.pads[i || 0]); },
    setWave(n) { if (S) { S.wave = n - 1; S.cleared = n - 1; S.next = planWave(S, n); buildPreview(S); } },
    next() { const s = S; return s && s.next ? { w: s.next.w, gates: s.next.gates.map(i => GATES[i].id), queue: s.next.queue.map(e => (e.boss || e.type) + (e.elite ? '*' : '') + '@' + GATES[e.g].id), big: !!s.next.plan.big } : null; },
    plan(w) { return S ? planWave(S, w).queue.map(e => (e.boss || e.type) + (e.elite ? '*' : '')) : null; },
    hurtCore(n) { if (S) S.world.damage(S.core, n, { src: null, type: 'test' }); },
    S() { return S; },
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 22_defense.js]', e); }
})();
