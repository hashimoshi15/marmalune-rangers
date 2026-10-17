/* Marmalune Rangers — actors: 16_weapons.js 16b_weapons_vm.js 17_enemies.js 17b_bosses.js 17c_bots.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 16_weapons.js
try { (function () {
// 16_weapons.js — G.Weapons (runtime for all 15 weapons + Goo Turf variants) and G.Gadgets.
// Viewmodels + HUD icons live in 16b_weapons_vm.js (G.Weapons.VM, G.Weapons.icon, G.Gadgets.icon).
//
// PUBLIC API
//   G.Weapons.defs{id}        field stats (GDD §5.2) + colours (§5.7) + price/refill (§5.6). def.range, def.noAuto.
//   G.Weapons.turfDefs{id}    Goo Turf variants (§5.3): dmg, ink (% of tank per shot/tick, rollInk per s),
//                             refill (s delay), paint radii, special id. Not allowed in turf: buddy groove bloom prism.
//   G.Weapons.create(id, level, mods, owner, opts) -> Weapon. id 'turf_<id>' = turf variant.
//       opts {rarity:'common'..'legendary', infiniteAmmo, turf, ammo, ammoMult, tune:[power,capacity,handling], xp}
//       A weapon also switches to its turf variant by itself when owner.ink !== undefined (turf mode).
//   G.Weapons.statsFor(id, level, mods, opts) -> stats (level §5.4 + Tune-Ups §5.5 + mods §8.5 + rarity).
//   G.Weapons.XP_LEVELS [0,150,400,800,1400], levelForXP(xp), ids, turfIds, RARITY_MULT, addAmmo(owner, cur, other)
//   Weapon: {id, def, level, ammo, maxAmmo, spreadNow, heat, charge, update(dt, ctx), idle(dt), reload(), refill(),
//            addAmmo(frac), buildViewmodel(), onEquip(), onUnequip(), xpFrac(), ammoText(), setLevel(n), moveMult}
//   G.Gadgets.defs{scan, dome, grapple}, use(id, ctx) -> false if it can't fire, anchorInRange(owner, eye, dir),
//            anchorMesh() (glowing ring for modes to place at grapple anchors).
// ACTOR FIELDS WRITTEN (for enemies/bots/core): a.dmgTakenMult (groove 1.25, plant 1.5, scan 1.1 — applied by
//   weapon damage unless world.dmgTakenMultBuiltin), a.dancing, a.planted, a.frozen, a.chilled (slow 0..1),
//   a.atkMult (attack-speed multiplier while chilled), a.marked (scan). Damage info carries {weapon, summon,
//   clinkMult, pierceShield, type:'impact'|'splash'|'beam'|'cold'|'dot'}.
// OWNER FIELDS: onFired(kick, vmKick, shake) (optional), speedMod (multiplied by moveMult unless owner.usesMoveMult),
//   ink (turf tank 0..100) + inkRefillT (seconds until the tank may refill) + lastInkT, inkColor (optional).
// PAINT: world.rules.paint(point, radius, team, normal, owner) — owner is passed because projectile paint lands
//   after Weapon.update returns. A numeric return (cells painted) feeds weapon XP (1 per 20 cells).
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;
  const U = G.util;
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const UP = new V3(0, 1, 0);

  // ------------------------------------------------------------------ strings
  G.i18n.add('en', {
    'wpn.fizz.name': 'Fizz Blaster', 'wpn.fizz.desc': 'Trusty starter pistol. Never runs dry, just don\'t let it overheat!', 'wpn.fizz.max': 'Shots bounce to a nearby bot',
    'wpn.scatter.name': 'Pop Scatter', 'wpn.scatter.desc': 'Popcorn shotgun. Big bonk up close and pushes bots back.', 'wpn.scatter.max': '12 pellets, extra push',
    'wpn.lobber.name': 'Bubble Lobber', 'wpn.lobber.desc': 'Lobs bouncy goo bubbles that burst with a splash. Hold to see the arc.', 'wpn.lobber.max': 'Bursts into 3 mini bubbles',
    'wpn.zap.name': 'Zap Coil', 'wpn.zap.desc': 'Lightning beam that hops to more bots nearby.', 'wpn.zap.max': 'Chains to 4 bots and slows them',
    'wpn.saw.name': 'Saw Skipper', 'wpn.saw.desc': 'Ricochet disc! Bounces off walls and zips from bot to bot.', 'wpn.saw.max': 'Throws 2 discs at once',
    'wpn.lancer.name': 'Beam Lancer', 'wpn.lancer.desc': 'Hold to charge and zoom, let go for a mega beam. Aim for weak spots!', 'wpn.lancer.max': 'Full charge goes through 3 bots',
    'wpn.gatling.name': 'Gale Gatling', 'wpn.gatling.desc': 'Spins up, then sprays a storm of shots. A bit heavy to carry.', 'wpn.gatling.max': 'Every 10th shot goes boom',
    'wpn.swarm.name': 'Confetti Swarm', 'wpn.swarm.desc': 'Hold to lock on to bots, let go to launch homing party rockets.', 'wpn.swarm.max': '6 locks, rockets split into bomblets',
    'wpn.buddy.name': 'Buddy Hive', 'wpn.buddy.desc': 'Sends out little buddy bots that circle you and help out.', 'wpn.buddy.max': '3 buddies, zappy shots',
    'wpn.groove.name': 'Groove Globe', 'wpn.groove.desc': 'Disco ball! Nearby bots can\'t stop dancing and take extra damage.', 'wpn.groove.max': 'Goes boom when the song ends',
    'wpn.bloom.name': 'Bloom Bomb', 'wpn.bloom.desc': 'Turns bots into potted plants for a few seconds. So pretty!', 'wpn.bloom.max': 'Plants get hurt over time',
    'wpn.chill.name': 'Chill Mister', 'wpn.chill.desc': 'Frosty spray that slows bots down, then freezes them solid.', 'wpn.chill.max': 'Longer spray, freezes faster',
    'wpn.splat.name': 'Goo Splatter', 'wpn.splat.desc': 'Rapid goo rifle. Leaves sticky puddles that slow bots.', 'wpn.splat.max': 'Bigger splats, longer reach',
    'wpn.roller.name': 'Wide Roller', 'wpn.roller.desc': 'Hold to roll and squish, tap to flick a wave of goo.', 'wpn.roller.max': 'Wider roller, longer flick',
    'wpn.prism.name': 'Prism Party Cannon', 'wpn.prism.desc': 'The ultimate! Locks up to 8 bots and fires a rainbow rocket party.', 'wpn.prism.max': 'Rainbow trails drop bomblets',
    'wpn.maxName': '{name} MAX', 'wpn.levelup': '{name} reached Lv {n}!',
    'wpn.role.starter': 'Starter', 'wpn.role.shotgun': 'Shotgun', 'wpn.role.grenade': 'Lobber', 'wpn.role.beam': 'Beam',
    'wpn.role.ricochet': 'Ricochet', 'wpn.role.sniper': 'Charge', 'wpn.role.minigun': 'Minigun', 'wpn.role.lockon': 'Lock-on',
    'wpn.role.summon': 'Summon', 'wpn.role.cc': 'Dance party', 'wpn.role.transform': 'Transform', 'wpn.role.frost': 'Frost',
    'wpn.role.painter': 'Painter', 'wpn.role.roller': 'Roller', 'wpn.role.ultimate': 'Ultimate',
    'wpn.stat.damage': 'Damage', 'wpn.stat.rate': 'Fire rate', 'wpn.stat.ammo': 'Ammo', 'wpn.stat.range': 'Range', 'wpn.stat.power': 'Power',
    'wpn.special.storm': 'Goo Storm', 'wpn.special.splashdown': 'Mega Splashdown', 'wpn.special.triple': 'Triple Splash',
    'hud.overheat': 'HOT!', 'hud.empty': 'Empty!', 'hud.ink': 'Goo',
    'gad.scan.name': 'Beepo Scan', 'gad.scan.desc': 'Beepo pings the area: bots glow through walls and take extra damage.',
    'gad.dome.name': 'Bubble Dome', 'gad.dome.desc': 'Pops up a bubble shield that blocks bot shots. You can still shoot out!',
    'gad.grapple.name': 'Grapple Ribbon', 'gad.grapple.desc': 'Zip over to glowing blue anchor rings.', 'gad.grapple.none': 'No anchor in reach',
    'gad.dash.name': 'Puff Dash', 'gad.dash.desc': 'A quick puffy dodge. Two charges.',
  });
  G.i18n.add('ja', {
    'wpn.fizz.name': 'フィズブラスター', 'wpn.fizz.desc': 'さいしょの相棒ピストル。弾はむげん！ でもアツくなりすぎに注意。', 'wpn.fizz.max': 'タマがちかくのボットにはねかえる',
    'wpn.scatter.name': 'ポップスキャッター', 'wpn.scatter.desc': 'ポップコーンのショットガン。ちかくのボットをドーンとおしかえす！', 'wpn.scatter.max': 'タマが12こに！ もっとふっとぶ',
    'wpn.lobber.name': 'バブルロッバー', 'wpn.lobber.desc': 'はずむグーのあわをポーン！ はじけてスプラッシュ。長おしでとぶ道が見えるよ。', 'wpn.lobber.max': 'はじけると小さなあわが3つに',
    'wpn.zap.name': 'ザップコイル', 'wpn.zap.desc': 'イナズマビーム！ ちかくのボットにもビリビリつたわる。', 'wpn.zap.max': '4たいにつたわって、おそくする',
    'wpn.saw.name': 'ソースキッパー', 'wpn.saw.desc': 'はねかえるディスク！ かべやボットにあたってどんどんとびうつる。', 'wpn.saw.max': 'ディスクを2まいなげる',
    'wpn.lancer.name': 'ビームランサー', 'wpn.lancer.desc': '長おしでチャージ＆ズーム、はなしてメガビーム！ じゃくてんをねらおう！', 'wpn.lancer.max': 'フルチャージで3たいをつらぬく',
    'wpn.gatling.name': 'ゲイルガトリング', 'wpn.gatling.desc': 'くるくる回ってからタマのあらし！ ちょっとおもいよ。', 'wpn.gatling.max': '10発ごとにドカン！',
    'wpn.swarm.name': 'かみふぶきスウォーム', 'wpn.swarm.desc': '長おしでボットをロックオン、はなすとパーティーロケット発射！', 'wpn.swarm.max': '6たいロック＆ロケットがぶんれつ',
    'wpn.buddy.name': 'バディハイブ', 'wpn.buddy.desc': 'ちいさなバディボットがまわりをとびまわって助けてくれる。', 'wpn.buddy.max': 'バディが3たいに！ ビリビリショット',
    'wpn.groove.name': 'ノリノリミラーボール', 'wpn.groove.desc': 'ミラーボールでボットがおどりだす！ おどってる間はダメージアップ。', 'wpn.groove.max': '曲がおわるとドカン！',
    'wpn.bloom.name': 'おはなボム', 'wpn.bloom.desc': 'ボットをしばらく植木ばちに変えちゃう。かわいい！', 'wpn.bloom.max': '植木ばちにじわじわダメージ',
    'wpn.chill.name': 'ひえひえミスト', 'wpn.chill.desc': 'つめたいミストでボットをおそくして、カチコチにこおらせる。', 'wpn.chill.max': 'とどくきょりアップ、すぐこおる',
    'wpn.splat.name': 'グースプラッター', 'wpn.splat.desc': 'れんしゃできるグーライフル。ネバネバの水たまりでボットがおそくなる。', 'wpn.splat.max': 'しぶきが大きく、とおくまでとどく',
    'wpn.roller.name': 'ワイドローラー', 'wpn.roller.desc': '長おしでコロコロ、タップでグーをバシャッ！', 'wpn.roller.max': 'ローラーが広く、バシャッがとおくへ',
    'wpn.prism.name': 'プリズムパーティーキャノン', 'wpn.prism.desc': 'さいきょう！ 8たいまでロックして、にじ色ロケットパーティー！', 'wpn.prism.max': 'にじの道からミニばくだん',
    'wpn.maxName': '{name} MAX', 'wpn.levelup': '{name}が Lv {n} になった！',
    'wpn.role.starter': 'スターター', 'wpn.role.shotgun': 'ショットガン', 'wpn.role.grenade': 'なげる', 'wpn.role.beam': 'ビーム',
    'wpn.role.ricochet': 'はねかえり', 'wpn.role.sniper': 'チャージ', 'wpn.role.minigun': 'ガトリング', 'wpn.role.lockon': 'ロックオン',
    'wpn.role.summon': 'しょうかん', 'wpn.role.cc': 'ダンス', 'wpn.role.transform': 'へんしん', 'wpn.role.frost': 'こおり',
    'wpn.role.painter': 'ぬる', 'wpn.role.roller': 'ローラー', 'wpn.role.ultimate': 'アルティメット',
    'wpn.stat.damage': 'ダメージ', 'wpn.stat.rate': 'れんしゃ', 'wpn.stat.ammo': 'だんすう', 'wpn.stat.range': 'しゃてい', 'wpn.stat.power': 'パワー',
    'wpn.special.storm': 'グーストーム', 'wpn.special.splashdown': 'メガスプラッシュダウン', 'wpn.special.triple': 'トリプルスプラッシュ',
    'hud.overheat': 'アツい！', 'hud.empty': 'カラッポ！', 'hud.ink': 'グー',
    'gad.scan.name': 'ビーポスキャン', 'gad.scan.desc': 'ビーポがまわりをスキャン！ かべのむこうのボットが光って、ダメージアップ。',
    'gad.dome.name': 'バブルドーム', 'gad.dome.desc': 'あわのバリアでボットのタマをふせぐ。中からはうてるよ！',
    'gad.grapple.name': 'グラップルリボン', 'gad.grapple.desc': '青く光るリングまでビューンととんでいく。', 'gad.grapple.none': 'とどくリングがないよ',
    'gad.dash.name': 'パフダッシュ', 'gad.dash.desc': 'すばやくパフッとよける。2回つかえる。',
  });

  // ------------------------------------------------------------------ data (GDD §5.2 / §5.3 / §5.6 / §5.7)
  // spread/cone values are degrees here; statsFor converts to radians.
  const DEFS = {
    fizz: { role: 'starter', ammoType: 'heat', dmg: 18, rate: 5, speed: 70, spread: 0.6, spreadMax: 2.0, bloom: 0.3, recover: 4, ammo: 0, range: 30, rangeMax: 60, falloff: 0.6,
      heat: 0.07, cool: 0.45, coolDelay: 0.25, lockT: 1.2, kick: 0.009, vmKick: 0.04, shake: 0.03, sfx: 'blaster',
      color: 0x2EC4B6, trim: 0xE8B44A, glow: 0x4FD8FF, price: 0, refillCost: 0, unlock: 'start' },
    scatter: { role: 'shotgun', ammoType: 'mag', dmg: 10, pellets: 8, rate: 1.25, speed: 60, life: 0.35, spread: 6, ammo: 24, range: 10, rangeMax: 20, falloff: 0.4,
      knock: 3, knockCap: 6, kick: 0.035, vmKick: 0.09, shake: 0.15, sfx: 'shotgun',
      color: 0xFF6B6B, trim: 0xFFF1DC, glow: 0xFF9F45, price: 800, refillCost: 2, unlock: 'shop' },
    lobber: { role: 'grenade', ammoType: 'mag', dmg: 65, rate: 1.4, speed: 20, pitch: 12, gravity: 18, fuse: 1.6, aoe: 3.5, inner: 1.5, edge: 0.4, ammo: 16, range: 22,
      noAuto: true, throwW: true, kick: 0.02, vmKick: 0.05, shake: 0.06, sfx: 'grenade',
      color: 0xFF8FC0, trim: 0xFFC8E0, glow: 0xFFC8E0, price: 1200, refillCost: 6, unlock: 'shop' },
    zap: { role: 'beam', ammoType: 'energy', dmg: 9, rate: 10, ammo: 150, range: 16, chainR: 6, chain: [0.7, 0.5], kick: 0.0012, vmKick: 0.006, sfx: 'zap',
      color: 0x1F2A5A, trim: 0xE8B44A, glow: 0xB8F34A, price: 2500, refillCost: 0.5, unlock: 'shop' },
    saw: { role: 'ricochet', ammoType: 'mag', dmg: 32, rate: 1.6, speed: 26, life: 2.5, ammo: 30, range: 25, bounceMult: 0.85, maxBots: 4, seekR: 8,
      kick: 0.012, vmKick: 0.05, shake: 0.05, sfx: 'disc', color: 0x3DDC97, trim: 0xDDE6F0, glow: 0xFFFFFF, refillCost: 3, unlock: 'craft' },
    lancer: { role: 'sniper', ammoType: 'mag', dmg: 30, dmgMax: 150, charge: 0.9, recoverT: 0.25, tapSpread: 0.5, spread: 0, ammo: 12, range: 80, zoom: 2, noAuto: true,
      kick: 0.03, vmKick: 0.07, shake: 0.18, sfx: 'chargeShot', color: 0x8C7BFF, trim: 0xF2F5FF, glow: 0xC8B8FF, refillCost: 10, unlock: 'craft' },
    gatling: { role: 'minigun', ammoType: 'mag', dmg: 9, rate: 14, spinUp: 0.6, spinDown: 0.4, speed: 65, spread: 3.5, spreadMin: 2.0, tighten: 2, ammo: 240, range: 30, rangeMax: 45, falloff: 0.6,
      moveMult: 0.8, heavy: true, kick: 0.0035, vmKick: 0.012, shake: 0.02, sfx: 'needle',
      color: 0x3FA9FF, trim: 0x8E88C8, glow: 0xCFF3FF, price: 6000, refillCost: 0.3, unlock: 'shop' },
    swarm: { role: 'lockon', ammoType: 'mag', dmg: 40, aoeDmg: 20, aoe: 2.5, speed: 22, speed0: 12, turn: 120, ammo: 20, lockRange: 45, lockCone: 8, lockTime: 0.25, locks: 4,
      range: 45, noAuto: true, heavy: true, kick: 0.015, vmKick: 0.05, shake: 0.06, sfx: 'rocket',
      color: 0xFFD45C, trim: 0xFF5FA2, glow: 0xFF8FD0, refillCost: 12, unlock: 'craft' },
    buddy: { role: 'summon', ammoType: 'mag', dmg: 6, rate: 1, buddyRate: 3, speed: 40, spread: 2, ammo: 4, range: 12, count: 2, life: 18, maxActive: 4, noAuto: true,
      kick: 0.008, vmKick: 0.04, sfx: 'npc', color: 0xFFB627, trim: 0xFFE08A, glow: 0xFFF3A0, refillCost: 50, unlock: 'craft' },
    groove: { role: 'cc', ammoType: 'mag', dmg: 0, rate: 1, speed: 14, gravity: 18, ammo: 3, range: 15, aoe: 8, dur: 6, dmgTaken: 1.25, bossDance: 1.0, noAuto: true, throwW: true,
      kick: 0.01, vmKick: 0.06, sfx: 'groove', color: 0xB983FF, trim: 0xE6ECFF, glow: 0xF0B8FF, refillCost: 90, unlock: 'craft' },
    bloom: { role: 'transform', ammoType: 'mag', dmg: 0, rate: 1, speed: 16, gravity: 18, ammo: 4, range: 16, aoe: 5, dur: 5, dmgTaken: 1.5, noAuto: true, throwW: true,
      kick: 0.01, vmKick: 0.06, sfx: 'bounce', color: 0x6CCB5F, trim: 0xFF7A93, glow: 0xA8E06A, refillCost: 70, unlock: 'craft' },
    chill: { role: 'frost', ammoType: 'energy', dmg: 6, rate: 10, ammo: 120, range: 10, cone: 20, slow: 0.4, freezeAt: 2.0, freezeT: 2.0,
      kick: 0.0008, vmKick: 0.004, sfx: 'freeze', color: 0x9FE8FF, trim: 0xF4FBFF, glow: 0x7AF0FF, refillCost: 0.6, unlock: 'craft' },
    splat: { role: 'painter', ammoType: 'mag', dmg: 14, rate: 8, speed: 40, gravity: 6, spread: 4, ammo: 200, range: 18, life: 0.62, puddle: 0.9, puddleSlow: 0.15,
      goo: true, kick: 0.004, vmKick: 0.02, shake: 0.02, sfx: 'ink', color: 0xA8E06A, trim: 0x1B2A4A, glow: 0xA8E06A, price: 600, refillCost: 0.4, unlock: 'quest' },
    roller: { role: 'roller', ammoType: 'paint', dmg: 60, flickMin: 25, flickMax: 80, rate: 1.2, speed: 18, gravity: 12, fan: 60, blobs: 5, ammo: 100, flickCost: 4, rollCost: 3,
      range: 8, strip: 2.4, rollSpeed: 4.5, rollCd: 0.5, goo: true, kick: 0.02, vmKick: 0.06, sfx: 'inkHeavy',
      color: 0xA8E06A, trim: 0xFFF1DC, glow: 0xA8E06A, price: 1500, refillCost: 0.8, unlock: 'shop' },
    prism: { role: 'ultimate', ammoType: 'mag', dmg: 60, aoeDmg: 30, aoe: 3, speed: 26, speed0: 14, turn: 160, rate: 0.8, ammo: 10, lockRange: 50, lockCone: 8, lockTime: 0.15,
      locks: 8, rockets: 8, range: 50, noAuto: true, heavy: true, kick: 0.02, vmKick: 0.08, shake: 0.12, sfx: 'missile',
      color: 0xF7F4FF, trim: 0xFF8FD0, glow: 0xFFFFFF, refillCost: 150, unlock: 'craft', prismatic: true },
  };
  const IDS = Object.keys(DEFS);
  for (const id of IDS) {
    const d = DEFS[id];
    d.id = id; d.nameKey = 'wpn.' + id + '.name'; d.descKey = 'wpn.' + id + '.desc'; d.maxKey = 'wpn.' + id + '.max'; d.roleKey = 'wpn.role.' + d.role;
    // Prefer the catalogue's strings (13_data registers weapon.<id>.*) so names match menus; wpn.* stay as aliases.
    if (G.i18n.has('weapon.' + id + '.name')) { d.nameKey = 'weapon.' + id + '.name'; if (G.i18n.has('weapon.' + id + '.desc')) d.descKey = 'weapon.' + id + '.desc'; if (G.i18n.has('weapon.' + id + '.max')) d.maxKey = 'weapon.' + id + '.max'; }
    if (d.rangeMax == null) d.rangeMax = d.range;
  }
  // Goo Turf (vs 100-HP rangers). ink = % of the 100% tank per shot / tick (rollInk per second).
  const TURF = {
    fizz: { dmg: 25, ink: 1.2, refill: 0.30, paint: 0.6, drop: 0.3, dropEvery: 2, special: 'storm' },
    scatter: { dmg: 12, ink: 6, refill: 0.50, paint: 0.45, special: 'splashdown' },
    lobber: { dmg: 60, direct: 100, ink: 9, refill: 0.60, paint: 2.2, special: 'triple' },
    zap: { dmg: 7, ink: 1, refill: 0.40, paint: 0.35, special: 'storm' },
    saw: { dmg: 40, ink: 5, refill: 0.50, paint: 0.8, trail: 0.3, special: 'triple' },
    lancer: { dmg: 40, dmgMax: 160, ink: 4, inkMax: 18, refill: 0.60, lineTap: [0.35, 12], lineFull: [0.5, 25], special: 'triple' },
    gatling: { dmg: 12, ink: 0.7, refill: 0.60, paint: 0.4, special: 'splashdown' },
    swarm: { dmg: 35, aoeDmg: 15, ink: 8, refill: 0.70, paint: 1.6, special: 'triple' },
    chill: { dmg: 5, ink: 1, refill: 0.40, paint: 0.5, special: 'storm' },
    splat: { dmg: 34, ink: 0.9, refill: 0.25, paint: 0.9, drop: 0.35, dropEvery: 1.5, special: 'storm' },
    roller: { dmg: 120, flickMin: 35, flickMax: 120, ink: 8, rollInk: 6, refill: 0.50, paint: 0.8, special: 'splashdown' },
  };
  const TURF_DEFS = {};
  for (const id in TURF) TURF_DEFS[id] = Object.assign({}, DEFS[id], TURF[id], { turf: true, ammoType: 'ink', goo: true, specialKey: 'wpn.special.' + TURF[id].special });
  const LVL_DMG = [1, 1.1, 1.2, 1.3, 1.4], LVL_AMMO = [1, 1, 1.25, 1.25, 1.5];
  const XP_LEVELS = [0, 150, 400, 800, 1400];
  const RARITY_MULT = {
    common: { dmg: 1.0, mag: 1.0 }, uncommon: { dmg: 1.08, mag: 1.1 }, rare: { dmg: 1.16, mag: 1.2 },
    epic: { dmg: 1.24, mag: 1.3 }, legendary: { dmg: 1.32, mag: 1.4 }, mythic: { dmg: 1.32, mag: 1.4 }, prismatic: { dmg: 1.32, mag: 1.4 },
  };
  const TEAM_INK = [0xFF8A1F, 0x2F7BFF, 0x2F7BFF, 0xFFD21F, 0x8A3FFC];
  function levelForXP(xp) { let l = 1; for (let i = 1; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i]) l = i + 1; return l; }

  function modSet(mods) {
    const s = new Set();
    if (Array.isArray(mods)) for (const m of mods) { if (typeof m === 'string') s.add(m); else if (m && m.id) s.add(m.id); }
    return s;
  }
  // Stats for (id, level, mods, opts{turf, rarity, tune, ammoMult}).
  function statsFor(id, level, mods, opts) {
    opts = opts || {};
    const turf = !!opts.turf && !!TURF_DEFS[id];
    const d = turf ? TURF_DEFS[id] : DEFS[id];
    if (!d) return null;
    level = clamp((level | 0) || 1, 1, 5);
    const ms = modSet(mods);
    const tune = opts.tune || (mods && mods.tune) || [0, 0, 0];
    const s = Object.assign({}, d);
    s.level = level; s.max = level >= 5; s.turf = turf; s.mods = ms;
    let dmgM = LVL_DMG[level - 1], ammoM = LVL_AMMO[level - 1], rateM = 1, spreadM = 1, knockM = 1, chargeM = 1, heatM = 1, radiusM = 1;
    if (id === 'fizz') { heatM *= 1 - 0.1 * (level - 1); ammoM = 1; }
    const tp = tune[0] | 0, tc = tune[1] | 0, th = tune[2] | 0;
    dmgM *= 1 + 0.05 * tp;
    if (id === 'fizz') heatM *= 1 - 0.08 * tc; else ammoM *= 1 + 0.1 * tc;
    rateM *= 1 + 0.06 * th; spreadM *= 1 - 0.1 * th; chargeM *= 1 - 0.08 * th;
    if (id === 'groove' || id === 'bloom' || id === 'buddy') radiusM *= 1 + 0.1 * th;
    if (ms.has('m_power')) dmgM *= 1.08;
    if (ms.has('m_mag')) { if (id === 'fizz') heatM *= 0.85; else ammoM *= 1.2; }
    if (ms.has('m_quick')) { rateM *= 1.08; chargeM *= 0.92; }
    if (ms.has('m_steady')) spreadM *= 0.75;
    if (ms.has('m_glass')) { dmgM *= 1.25; ammoM *= 0.8; }
    if (ms.has('m_hasty')) { rateM *= 1.2; dmgM *= 0.9; }
    if (ms.has('m_heavy')) { dmgM *= 1.15; knockM *= 1.4; rateM *= 0.85; }
    const rar = RARITY_MULT[opts.rarity] || RARITY_MULT.common;
    dmgM *= rar.dmg; ammoM *= rar.mag * (opts.ammoMult || 1);
    s.dmgMult = dmgM;
    s.dmg = d.dmg * dmgM;
    if (d.dmgMax) s.dmgMax = d.dmgMax * dmgM;
    if (d.aoeDmg) s.aoeDmg = d.aoeDmg * dmgM;
    if (d.flickMin) { s.flickMin = d.flickMin * dmgM; s.flickMax = d.flickMax * dmgM; }
    if (d.direct) s.direct = d.direct * dmgM;
    s.rate = (d.rate || 1) * rateM;
    s.spread = (d.spread || 0) * DEG * spreadM;
    s.spreadMax = (d.spreadMax || d.spread || 0) * DEG * spreadM;
    s.spreadMin = (d.spreadMin || d.spread || 0) * DEG * spreadM;
    s.bloom = (d.bloom || 0) * DEG * spreadM;
    s.recover = (d.recover || 4) * DEG;
    s.tapSpread = (d.tapSpread || 0) * DEG * spreadM;
    s.heat = (d.heat || 0) * heatM;
    s.chargeTime = (d.charge || 0.9) * chargeM;
    s.knock = (d.knock || 0) * knockM; s.knockCap = (d.knockCap || 0) * knockM; s.knockMult = knockM;
    s.aoe = (d.aoe || 0) * radiusM;
    s.ammo = d.ammo ? Math.max(1, Math.round(d.ammo * ammoM)) : 0;
    s.lockCone = (d.lockCone || 8) * DEG; s.cone = (d.cone || 20) * DEG; s.fan = (d.fan || 60) * DEG;
    s.clinkMult = ms.has('m_clink') ? 1.15 : 1;
    s.bouncy = ms.has('m_bouncy'); s.split = ms.has('m_split'); s.frost = ms.has('m_frost'); s.juice = ms.has('m_juice'); s.gooMod = ms.has('m_goo');
    s.paintMult = s.gooMod && turf ? 1.25 : 1;
    // W5 "MAX" behaviours (§5.4)
    if (s.max) {
      if (id === 'scatter') { s.pellets = 12; s.knock *= 1.5; s.knockCap *= 1.5; }
      if (id === 'zap') s.chain = [0.7, 0.5, 0.35, 0.25];
      if (id === 'swarm') s.locks = 6;
      if (id === 'buddy') s.count = 3;
      if (id === 'chill') { s.range = 14; s.freezeAt = 1.2; }
      if (id === 'splat') { s.paintMult *= 1.35; s.puddle *= 1.35; s.life *= 1.2; s.range *= 1.2; }
      if (id === 'roller') { s.strip = 3.2; s.flickRange = 1.3; }
    }
    if (!s.flickRange) s.flickRange = 1;
    return s;
  }

  // ------------------------------------------------------------------ temps + small helpers
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _e = new V3(), _f = new V3();
  const _dir = new V3(), _dir2 = new V3(), _p1 = new V3(), _pg = new V3(), _t1 = new V3(), _t2 = new V3(), _s1 = new V3(), _h1 = new V3();
  const _right = new V3(1, 0, 0);
  // Random direction inside a cone of half-angle `half` around `base` (unit).
  function coneDir(out, base, half) {
    if (!(half > 0)) return out.copy(base);
    const ax = Math.abs(base.y) < 0.95 ? UP : _right;
    _t1.crossVectors(base, ax).normalize(); _t2.crossVectors(base, _t1);
    const r = Math.sqrt(Math.random()) * Math.tan(half), th = Math.random() * Math.PI * 2;
    return out.copy(base).addScaledVector(_t1, Math.cos(th) * r).addScaledVector(_t2, Math.sin(th) * r).normalize();
  }
  // Like coneDir, but never closer to the axis than inner × the cone radius (a ring-shaped spray).
  function hollowConeDir(out, base, half, inner) {
    const ax = Math.abs(base.y) < 0.95 ? UP : _right;
    _t1.crossVectors(base, ax).normalize(); _t2.crossVectors(base, _t1);
    const r = Math.sqrt(inner * inner + (1 - inner * inner) * Math.random()) * Math.tan(half), th = Math.random() * Math.PI * 2;
    return out.copy(base).addScaledVector(_t1, Math.cos(th) * r).addScaledVector(_t2, Math.sin(th) * r).normalize();
  }
  // Rotate `vel` toward unit `want` by at most maxAng radians (keeps speed).
  function steer(vel, want, maxAng) {
    const sp = vel.length(); if (sp < 1e-6) { vel.copy(want); return; }
    _s1.copy(vel).divideScalar(sp);
    const ang = Math.acos(clamp(_s1.dot(want), -1, 1));
    if (ang <= maxAng) { vel.copy(want).multiplyScalar(sp); return; }
    _s1.lerp(want, maxAng / ang).normalize(); vel.copy(_s1).multiplyScalar(sp);
  }
  // Weak-spot test for a projectile impact (the glowing battery sphere via G.critAt, else the head line).
  function critAt(a, p) { return G.critAt ? G.critAt(a, p.pos, p.r || 0) : (a.critY != null && p.pos.y > a.pos.y + a.critY); }
  function isFoe(a, team) { return a.alive && a.targetable && !a.hidden && a.team !== team && !a.isDome; }
  // Automatic targeting (locks, seeking, chains, buddies, CC) ignores noAssist actors such as crates.
  function isAutoFoe(a, team) { return isFoe(a, team) && !a.noAssist; }
  function tierOf(a) { return a.tier || (a.isBoss ? 5 : 1); }
  function stagger(a, t) { if (!a.isBoss && !a.isPlayer && tierOf(a) <= 1) a.stunT = Math.max(a.stunT || 0, t || 0.3); }
  // Nearest foe to `pos` within r (optional LOS from pos), excluding a set/array/actor.
  function nearestFoe(world, pos, r, team, exclude, los) {
    let best = null, bd = r;
    for (const a of world.actors) {
      if (!isAutoFoe(a, team)) continue;
      if (exclude && (exclude === a || (exclude.has && exclude.has(a)) || (Array.isArray(exclude) && exclude.indexOf(a) >= 0))) continue;
      a.aimPoint(_h1);
      const d = _h1.distanceTo(pos) - a.r;
      if (d >= bd) continue;
      if (los && !world.phys.los(pos, _h1, false)) continue;
      bd = d; best = a;
    }
    return best;
  }
  function audio(w, name, opts) {
    if (!G.Audio) return;
    if (w.owner.isPlayer) G.Audio.sfx(name, opts); else G.Audio.sfxAt(name, w.owner.pos, opts);
  }
  const hasSfx = id => !!(G.Audio && G.Audio.has && G.Audio.has(id));
  // 09_audio contract ids with soft fallbacks (the generic 'empty' click is too harsh for a warning)
  const _lowA = { pitch: 1, vol: 1 }, _lowB = { pitch: 1.7, vol: 0.4 };
  function lowAmmoTick(last) {
    if (!G.Audio) return;
    if (hasSfx('lowAmmo')) { _lowA.pitch = last ? 1.18 : 1; _lowA.vol = last ? 0.95 : 0.8; G.Audio.sfx('lowAmmo', _lowA); }
    else { _lowB.pitch = last ? 1.9 : 1.6; G.Audio.sfx('ui', _lowB); }
  }
  function hsl(h, s, l) { return _col.setHSL(((h % 1) + 1) % 1, s, l).getHex(); }
  const _col = new THREE.Color();
  const RAINBOW = [0xFF5FA2, 0xFF9F45, 0xFFD45C, 0x8CE05A, 0x3FD0FF, 0x6C8BFF, 0xB983FF, 0xFF7AD9];
  const CONFETTI = [0xFF6B8B, 0xFFD23F, 0x3FE0B8, 0x33B5FF, 0x8F6BFF];

  // ------------------------------------------------------------------ Ribbon (camera-facing strip, no per-frame allocation)
  // Soft-edged glowing strip (white-hot core fading to the edges) drawn with the FX trail shader
  // (G.FX.ribbonMaterial), so its program is already compiled with the world and nothing compiles
  // the first time a beam or grapple shows. setOpacity() replaces mat.opacity.
  class Ribbon {
    constructor(scene, max, color, width, opacity) {
      this.max = max; this.n = 0; this.width = width; this.taper = true;
      this.pts = []; for (let i = 0; i < max; i++) this.pts.push(new V3());
      this.pos = new Float32Array(max * 6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      const tc = new Uint8Array(max * 8).fill(255), side = new Float32Array(max * 2);
      for (let i = 0; i < max * 2; i++) side[i] = (i & 1) ? 1 : -1;
      geo.setAttribute('tcol', new THREE.BufferAttribute(tc, 4, true));
      geo.setAttribute('side', new THREE.BufferAttribute(side, 1));
      const idx = [];
      for (let i = 0; i < max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setIndex(idx);
      geo.setDrawRange(0, 0);
      this.geo = geo;
      this.mat = G.FX && G.FX.ribbonMaterial ? G.FX.ribbonMaterial(color, opacity != null ? opacity : 0.9)
        : new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity != null ? opacity : 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; this.mesh.visible = false;
      scene.add(this.mesh);
    }
    setOpacity(v) { if (this.mat.uniforms && this.mat.uniforms.uOpacity) this.mat.uniforms.uOpacity.value = v; else this.mat.opacity = v; }
    // Write points then call draw(count).
    draw(n) {
      n = Math.min(n, this.max); this.n = n;
      if (n < 2) { this.mesh.visible = false; return; }
      const cam = G.R.camera.position, P = this.pts, pos = this.pos;
      for (let i = 0; i < n; i++) {
        const p = P[i], q = P[i < n - 1 ? i + 1 : i], o = P[i > 0 ? i - 1 : i];
        _t1.copy(q).sub(o); if (_t1.lengthSq() < 1e-10) _t1.set(0, 0, 1);
        _t2.copy(cam).sub(p);
        _t1.cross(_t2); const l = _t1.length() || 1;
        const w = this.width * 0.5 * (this.taper ? (0.35 + 0.65 * Math.sin(Math.PI * (i + 0.5) / n)) : 1) / l;
        pos[i * 6] = p.x + _t1.x * w; pos[i * 6 + 1] = p.y + _t1.y * w; pos[i * 6 + 2] = p.z + _t1.z * w;
        pos[i * 6 + 3] = p.x - _t1.x * w; pos[i * 6 + 4] = p.y - _t1.y * w; pos[i * 6 + 5] = p.z - _t1.z * w;
      }
      this.geo.attributes.position.needsUpdate = true;
      this.geo.setDrawRange(0, (n - 1) * 6);
      this.mesh.visible = true;
    }
    // Jagged lightning between a and b.
    bolt(a, b, n, jitter) {
      n = Math.min(n, this.max);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const j = (i === 0 || i === n - 1) ? 0 : jitter;
        this.pts[i].lerpVectors(a, b, t).add(_e.set(U.rand(-j, j), U.rand(-j, j), U.rand(-j, j)));
      }
      this.draw(n);
    }
    hide() { this.mesh.visible = false; }
  }

  // ------------------------------------------------------------------ shared meshes (module-level, flagged shared)
  const SHARED = {};
  function shared(key, make) { let g = SHARED[key]; if (!g) { g = make(); if (g.userData) g.userData.shared = true; SHARED[key] = g; } return g; }
  function vcGeo(parts) {
    // parts: [geometry, hex] → merged geometry with vertex colours
    const geos = parts.map(([g, hex]) => {
      if (g.index) g = g.toNonIndexed();
      const n = g.attributes.position.count, c = new Float32Array(n * 3); _col.setHex(hex);
      for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      if (g.attributes.uv) g.deleteAttribute('uv');
      return g;
    });
    let total = 0; for (const g of geos) total += g.attributes.position.count;
    const P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3);
    let o = 0;
    for (const g of geos) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    out.setAttribute('color', new THREE.BufferAttribute(C, 3));
    out.computeBoundingSphere();
    out.userData.shared = true;
    return out;
  }
  const xf = (g, x, y, z, rx, ry, rz, sx, sy, sz) => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
    m.compose(new V3(x || 0, y || 0, z || 0), q, new V3(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz));
    return g.applyMatrix4(m);
  };
  function buddyGeo() {
    return shared('buddyBody', () => vcGeo([
      [xf(new THREE.SphereGeometry(0.2, 14, 10), 0, 0, 0, 0, 0, 0, 1, 0.92, 1), 0xFFB627],
      [xf(new THREE.TorusGeometry(0.17, 0.035, 6, 18), 0, 0.02, 0, Math.PI / 2, 0, 0), 0x3A2A55],
      [xf(new THREE.TorusGeometry(0.15, 0.03, 6, 18), 0, -0.09, 0, Math.PI / 2, 0, 0), 0x3A2A55],
      [xf(new THREE.SphereGeometry(0.11, 10, 8), 0, 0.03, 0.13, 0, 0, 0, 1.2, 0.85, 0.5), 0x2A1B3D],
      [xf(new THREE.SphereGeometry(0.1, 10, 6), -0.19, 0.08, -0.02, 0, 0, 0.6, 0.35, 1, 0.8), 0xFFF3C8],
      [xf(new THREE.SphereGeometry(0.1, 10, 6), 0.19, 0.08, -0.02, 0, 0, -0.6, 0.35, 1, 0.8), 0xFFF3C8],
      [xf(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5), 0, 0.23, 0), 0x3A2A55],
      [xf(new THREE.SphereGeometry(0.035, 8, 6), 0, 0.3, 0), 0xFF5FA2],
    ]));
  }
  function buddyEyeGeo() { return shared('buddyEye', () => xf(new THREE.SphereGeometry(0.045, 10, 8), 0, 0.035, 0.17, 0, 0, 0, 1.6, 1, 0.5)); }
  function potGeo() {
    return shared('pot', () => {
      const lathe = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.36, 0.42), new THREE.Vector2(0.44, 0.46), new THREE.Vector2(0.44, 0.56), new THREE.Vector2(0.38, 0.56)], 16);
      const parts = [[lathe, 0xE07A4F], [xf(new THREE.CylinderGeometry(0.37, 0.37, 0.04, 16), 0, 0.52, 0), 0x7A4A3A],
        [xf(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6), 0, 0.82, 0), 0x3E9E57]];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; parts.push([xf(new THREE.SphereGeometry(0.16, 8, 6), Math.cos(a) * 0.16, 0.75 + (i % 2) * 0.12, Math.sin(a) * 0.16, 0, -a, 0.5, 1.2, 0.35, 0.6), 0x6CCB5F]); }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; parts.push([xf(new THREE.SphereGeometry(0.11, 8, 6), Math.cos(a) * 0.13, 1.16, Math.sin(a) * 0.13, 0, -a, 0, 1, 0.45, 0.65), 0xFF7A93]); }
      parts.push([xf(new THREE.SphereGeometry(0.08, 8, 6), 0, 1.18, 0), 0xFFD45C]);
      // a little smiley band on the pot
      parts.push([xf(new THREE.TorusGeometry(0.41, 0.025, 5, 20), 0, 0.28, 0, Math.PI / 2, 0, 0), 0xFFF1DC]);
      return vcGeo(parts);
    });
  }
  const sphereGeo = shared('sph', () => new THREE.SphereGeometry(1, 20, 14));
  const icoGeo = shared('ico', () => new THREE.IcosahedronGeometry(1, 1));
  const ringGeo = shared('ring', () => new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2));
  const thinRingGeo = shared('ring2', () => new THREE.RingGeometry(0.965, 1, 64).rotateX(-Math.PI / 2));
  const coneBeamGeo = shared('beams', () => {
    const parts = [];
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const g = new THREE.ConeGeometry(0.5, 4, 8, 1, true); g.translate(0, -2, 0);
      xf(g, 0, 0, 0, 0.75, a, 0);
      parts.push([g, RAINBOW[i]]);
    }
    return vcGeo(parts);
  });

  // ------------------------------------------------------------------ per-world effects system
  const SYS = new WeakMap();
  function sysFor(world) {
    let s = SYS.get(world);
    if (!s) { s = new Sys(world); SYS.set(world, s); }
    return s;
  }
  class Sys {
    constructor(world) {
      this.world = world; this.t = 0;
      this.buddies = []; this.globes = []; this.puddles = []; this.domes = []; this.scans = []; this.grapples = []; this.bomblets = [];
      this.affected = new Set(); this.ribbons = new Map(); this.potPool = []; this.icePool = []; this.arc = null; this.markers = new Set();
      this.gadgetIcon = null;
      world.onUpdate(dt => G.safe('weapons sys', () => this.update(dt)));
      const late = new THREE.Object3D(); late.name = 'weapons-late';
      world.fx.timed(late, 1e12, (k, o, dt) => G.safe('weapons late', () => this.late(dt || G.time.dt)));
    }
    ribbon(key, max, color, width, opacity) {
      let r = this.ribbons.get(key);
      if (!r) { r = new Ribbon(this.world.scene, max, color, width, opacity); this.ribbons.set(key, r); }
      return r;
    }
    status(a) {
      if (!a.wx) a.wx = { groove: 0, plant: 0, plantDps: 0, plantW: null, scan: 0, expo: 0, expoLast: -9, chillT: 0, chillK: 1, frozenT: 0, frost: 0, frostT: 0, puddleT: 0, puddleK: 1, zapT: 0, pot: null, ice: null };
      this.affected.add(a);
      return a.wx;
    }
    update(dt) {
      this.t += dt;
      const world = this.world;
      // ---- status effects on actors
      for (const a of this.affected) {
        const x = a.wx;
        if (!a.alive || a.dead) { this._clearStatus(a); continue; }
        x.groove = Math.max(0, x.groove - dt); x.plant = Math.max(0, x.plant - dt); x.scan = Math.max(0, x.scan - dt);
        x.frozenT = Math.max(0, x.frozenT - dt); x.chillT = Math.max(0, x.chillT - dt); x.puddleT = Math.max(0, x.puddleT - dt); x.zapT = Math.max(0, x.zapT - dt);
        if (world.time - x.expoLast > 0.15) x.expo = Math.max(0, x.expo - dt);
        if (x.frostT > 0) { x.frostT -= dt; if (x.frostT <= 0) x.frost = 0; }
        const player = a.isPlayer;
        let mult = 1;
        if (x.groove > 0) mult *= 1.25;
        if (x.plant > 0) mult *= 1.5;
        if (x.scan > 0) mult *= 1.1;
        a.dmgTakenMult = mult;
        a.marked = x.scan > 0;
        a.dancing = x.groove > 0 && !a.isBoss && !player;
        a.planted = x.plant > 0 && !player;
        a.frozen = x.frozenT > 0 && !player;
        if ((a.dancing || a.planted || a.frozen) && !player) a.stunT = Math.max(a.stunT || 0, 0.12);
        // slows
        let k = 1;
        if (x.chillT > 0) k = Math.min(k, x.chillK);
        if (x.puddleT > 0) k = Math.min(k, x.puddleK);
        if (x.frost > 0) k = Math.min(k, 1 - x.frost);
        if (x.zapT > 0) k = Math.min(k, 0.9);
        a.chilled = x.chillT > 0 ? 1 - x.chillK : 0;
        a.atkMult = x.chillT > 0 ? x.chillK : 1;
        if (k < 1) {
          if (!(a.slowT > 0) || k < a.slowK) a.slowK = k;
          a.slowT = Math.max(a.slowT || 0, 0.1);
        }
        // potted plants take damage over time at W5
        if (x.plant > 0 && x.plantDps > 0 && x.plantW) x.plantW.hit(a, x.plantDps * dt, { kind: 'dot', type: 'dot', silent: true, noFx: true });
        if (x.plant <= 0 && x.pot) this._unpot(a);
        if (x.frozenT <= 0 && x.ice) this._unice(a);
        if (x.plant > 0 && !x.pot && !player) this._pot(a);
        if (x.frozenT > 0 && !x.ice && !player) this._ice(a);
        const active = x.groove > 0 || x.plant > 0 || x.scan > 0 || x.expo > 0 || x.frozenT > 0 || x.chillT > 0 || x.frost > 0 || x.puddleT > 0 || x.zapT > 0;
        if (!active && !x.pot && !x.ice) this._clearStatus(a);
      }
      // ---- puddles (splat goo / m_goo): slow foes standing in them
      for (let i = this.puddles.length - 1; i >= 0; i--) {
        const p = this.puddles[i]; p.t -= dt;
        if (p.t <= 0) { this.puddles.splice(i, 1); continue; }
      }
      if (this.puddles.length && (G.time.frame % 3) === 0) {
        for (const a of world.actors) {
          if (!a.alive || a.isDome || !a.targetable) continue;
          for (const p of this.puddles) {
            if (a.team === p.team) continue;
            const dx = a.pos.x - p.x, dz = a.pos.z - p.z;
            if (dx * dx + dz * dz < (p.r + a.r) * (p.r + a.r) && Math.abs(a.pos.y - p.y) < 1.2) {
              const x = this.status(a); x.puddleT = p.slowT; x.puddleK = Math.min(x.puddleT > 0 ? x.puddleK : 1, p.k);
              break;
            }
          }
        }
      }
      updateBuddies(this, dt);
      updateGlobes(this, dt);
      updateBomblets(this, dt);
      updateDomes(this, dt);
      updateScans(this, dt);
      updateGrapples(this, dt);
      // gadget button icon for the local player (the player drives the cooldown ring itself)
      const pl = world.player;
      if (pl && pl.isPlayer && pl.gadget && G.Input && G.Input.setIcon && G.Gadgets.defs[pl.gadget] && world === (G.Game && G.Game.world)) {
        if (this.gadgetIcon !== pl.gadget && G.Gadgets.icon) { this.gadgetIcon = pl.gadget; G.Input.setIcon('gadget', G.Gadgets.icon(pl.gadget)); }
      }
    }
    // Runs after actors have updated (visual overrides: hidden planted bots, dance wobble, pots/ice follow).
    late(dt) {
      const t = this.world.time;
      for (const a of this.affected) {
        const x = a.wx; if (!x) continue;
        if (x.pot) {
          x.pot.position.set(a.pos.x, a.pos.y, a.pos.z);
          const s = x.potS = Math.min(1, (x.potS || 0) + dt * 6);
          const wob = 1 + Math.sin(t * 9 + a.id) * 0.04;
          x.pot.scale.set(x.potScale * s * wob, x.potScale * s / wob, x.potScale * s * wob);
          x.pot.rotation.z = Math.sin(t * 3 + a.id) * 0.06;
          if (a.mesh) a.mesh.visible = false;
        }
        if (x.ice) { x.ice.position.set(a.pos.x, a.pos.y + a.h * 0.5, a.pos.z); }
        if (a.mesh && a.dancing) {
          // actors with their own dance animation (G.Enemies define danceT) only get the music notes
          if (a.danceT === undefined) { a.mesh.rotation.z = Math.sin(t * Math.PI * 4 + a.id) * 0.28; x.danced = true; }
          if (Math.random() < dt * 3) this.world.fx.spawn(_a.set(a.pos.x + U.rand(-0.3, 0.3), a.pos.y + a.h + 0.2, a.pos.z + U.rand(-0.3, 0.3)), _b.set(0, 1.2, 0), U.pick(RAINBOW), 0.22, 0.8, { grav: -0.5 });
        } else if (a.mesh && x.danced) { a.mesh.rotation.z = 0; x.danced = false; }
      }
      for (const b of this.buddies) placeBuddy(b, t);
    }
    _clearStatus(a) {
      const x = a.wx;
      if (x) { if (x.pot) this._unpot(a, true); if (x.ice) this._unice(a, true); if (x.danced && a.mesh) a.mesh.rotation.z = 0; }
      a.dmgTakenMult = 1; a.dancing = false; a.planted = false; a.frozen = false; a.chilled = 0; a.atkMult = 1; a.marked = false;
      a.wx = null; this.affected.delete(a);
    }
    _pot(a) {
      const x = a.wx;
      let m = this.potPool.pop();
      if (!m) { m = new THREE.Mesh(potGeo(), G.M.vc({ spec: 0.5 })); }
      x.pot = m; x.potS = 0; x.potScale = clamp((a.h || 1.4) / 1.5, 0.6, 2.2);
      m.position.copy(a.pos); m.visible = true;
      this.world.scene.add(m);
      if (a.mesh) a.mesh.visible = false;
      this.world.fx.burst(_a.set(a.pos.x, a.pos.y + 0.8, a.pos.z), [0xFF7A93, 0x6CCB5F, 0xFFD45C, 0xffffff], 18, 4, 0.22, 0.6, { grav: 3 });
      this.world.fx.smoke(_a, 4, 0xEFFFF0);
    }
    _unpot(a, quiet) {
      const x = a.wx; if (!x || !x.pot) return;
      this.world.scene.remove(x.pot); this.potPool.push(x.pot); x.pot = null;
      if (a.mesh) a.mesh.visible = true;
      if (!quiet) this.world.fx.burst(_a.set(a.pos.x, a.pos.y + 0.8, a.pos.z), [0xFF7A93, 0x6CCB5F, 0xffffff], 12, 3.5, 0.2, 0.5, { grav: 4 });
      else if (a.mesh) a.mesh.visible = true;
    }
    _ice(a) {
      const x = a.wx;
      let m = this.icePool.pop();
      if (!m) m = new THREE.Mesh(icoGeo, G.M.toon(0xBDEBFF, { transparent: true, opacity: 0.55, spec: 0.9, rimStr: 0.9, rimColor: 0xffffff, flat: true, emissive: 0x7AF0FF, ei: 0.15 }));
      const s = Math.max(a.r * 1.5, (a.h || 1.4) * 0.62);
      m.scale.set(s * 0.9, s, s * 0.9); m.rotation.set(0, Math.random() * 6, 0);
      this.world.scene.add(m); x.ice = m;
      this.world.fx.burst(_a.set(a.pos.x, a.pos.y + a.h * 0.5, a.pos.z), ICE_C, 16, 4, 0.2, 0.5, { grav: 6 });
      if (this.world.fx.sparkle) { this.world.fx.sparkle(_a, 0xDFF8FF, 4, 0.45); this.world.fx.shock(_a, Math.max(1, a.h * 0.8), 0xBDEBFF, 0.25, 0.8); }
      if (G.Audio) G.Audio.sfxAt('freeze', a.pos);
    }
    _unice(a) {
      const x = a.wx; if (!x || !x.ice) return;
      this.world.scene.remove(x.ice); this.icePool.push(x.ice); x.ice = null;
      // ice shatters into tumbling shards that bounce on the floor
      this.world.fx.burst(_a.set(a.pos.x, a.pos.y + a.h * 0.5, a.pos.z), ICE_C, 14, 5, 0.2, 0.9, ICE_O);
      this.world.fx.burst(_a, [0xffffff, 0x9FE8FF], 8, 4, 0.16, 0.45, { grav: 10 });
    }
    addPuddle(pos, r, k, slowT, team) {
      if (this.puddles.length >= 30) this.puddles.shift();
      this.puddles.push({ x: pos.x, y: pos.y, z: pos.z, r, k, slowT, team, t: 4 });
    }
    arcPreview() { if (!this.arc) this.arc = new ArcPreview(this.world); return this.arc; }
  }

  const ICE_C = [0xffffff, 0x9FE8FF, 0x7AF0FF, 0xDFF8FF], ICE_O = { normal: true, shape: 'chip', curve: 'flat', grav: 15, drag: 0.8, up: 2, spin: 16, ground: true };
  // ------------------------------------------------------------------ arc preview (lobbed weapons, player only)
  // Drawn through the world's FX quad batch (no meshes, no extra draw call): glowing dots that march
  // along the throw arc toward a pulsing landing ring that marks the splash radius. Re-issued every
  // frame while the throw is held, so it simply stops drawing when the player lets go.
  class ArcPreview {
    constructor(world) {
      this.world = world; this.N = 34; this.shown = -1; this.n = 0;
      this.pos = new Float32Array((this.N + 1) * 3);
      this.cum = new Float32Array(this.N + 1);
    }
    show(start, vel, grav, maxT, radius, color, bounces) {
      this.shown = G.time.frame;
      const ph = this.world.phys, N = this.N, step = maxT / N, P = this.pos;
      _a.copy(start); _b.copy(vel);
      let n = 0, hit = null, bleft = bounces || 0;
      for (let i = 0; i < N; i++) {
        P[n * 3] = _a.x; P[n * 3 + 1] = _a.y; P[n * 3 + 2] = _a.z; n++;
        _c.copy(_b).multiplyScalar(step);
        const len = _c.length();
        if (len > 1e-5) {
          _d.copy(_c).divideScalar(len);
          const h = ph.raycast(_a.x, _a.y, _a.z, _d.x, _d.y, _d.z, len);
          if (h) {
            _a.set(h.x, h.y, h.z);
            if (bleft > 0) { bleft--; _e.set(h.nx, h.ny, h.nz); const vn = _b.dot(_e); _b.addScaledVector(_e, -2 * vn).multiplyScalar(0.5); _a.addScaledVector(_e, 0.03); continue; }
            hit = h; break;
          }
        }
        _a.add(_c); _b.y -= grav * step;
      }
      P[n * 3] = _a.x; P[n * 3 + 1] = _a.y; P[n * 3 + 2] = _a.z; n++;
      this.n = n;
      const fx = this.world.fx; if (!fx || !fx.quad) return;
      // arc length table, then dots every SP metres, phase-shifted over time so they flow forward
      const C = this.cum; C[0] = 0;
      for (let i = 1; i < n; i++) C[i] = C[i - 1] + Math.hypot(P[i * 3] - P[i * 3 - 3], P[i * 3 + 1] - P[i * 3 - 2], P[i * 3 + 2] - P[i * 3 - 1]);
      const total = C[n - 1], SP = 0.55, ph0 = (G.time.now * 1.6) % 1;
      let j = 0;
      for (let dd = (ph0 + 0.6) * SP; dd < total - 0.2; dd += SP) {
        while (j < n - 2 && C[j + 1] < dd) j++;
        const f = (dd - C[j]) / Math.max(1e-4, C[j + 1] - C[j]);
        _f.set(P[j * 3] + (P[j * 3 + 3] - P[j * 3]) * f, P[j * 3 + 1] + (P[j * 3 + 4] - P[j * 3 + 1]) * f, P[j * 3 + 2] + (P[j * 3 + 5] - P[j * 3 + 2]) * f);
        const u = dd / Math.max(total, 1e-3);
        fx.quad(0, 0, _f, null, 0.2 + 0.08 * (1 - u), 0.2 + 0.08 * (1 - u), 0, color, 0.85 * Math.min(1, dd / 0.8), 0, 0, 0.45);
      }
      // landing ring + soft fill on the surface that will be hit
      if (hit) _e.set(hit.nx, hit.ny, hit.nz); else _e.copy(UP);
      _f.copy(_a).addScaledVector(_e, 0.06);
      const pulse = 1 + Math.sin(G.time.now * 8) * 0.05, rr = radius * 2 * pulse;
      fx.quad(2, 2, _f, _e, rr, rr, G.time.now * 0.6, color, 0.85, 0.07, 0.35, 0.5);
      fx.quad(2, 2, _f, _e, rr * 0.55, rr * 0.55, 0, 0xffffff, 0.35 + 0.25 * Math.sin(G.time.now * 8), 0.12, 0, 0.2);
      fx.quad(0, 0, _f, null, 0.9, 0.9, 0, color, 0.6);
    }
    hide() { this.shown = -1; }
  }

  // ------------------------------------------------------------------ Weapon instance
  class Weapon {
    constructor(id, level, mods, owner, opts) {
      opts = opts || {};
      this.id = id; this.owner = owner; this.opts = opts;
      this.mods = Array.isArray(mods) ? mods : [];
      this.level = clamp((level | 0) || 1, 1, 5);
      this.turf = !!opts.turf && !!TURF_DEFS[id];
      this.rarity = opts.rarity || null;
      this.infinite = !!opts.infiniteAmmo;
      this.xp = opts.xp != null ? opts.xp : XP_LEVELS[this.level - 1];
      this.xpAcc = 0; this.cells = 0;
      this._restat();
      this.ammo = opts.ammo != null && opts.ammo >= 0 ? Math.min(this.maxAmmo, opts.ammo) : this.maxAmmo;
      this.cd = 0; this.fireT = 9; this.shots = 0; this.heat = 0; this.locked = 0; this.coolT = 0;
      this.spreadNow = this.st.spread; this.held = false; this.holdT = 0; this.pressed = false; this.released = false;
      this.charge = 0; this.charging = false; this.chargeVis = 0; this.recover = 0; this.zoomF = 1; this.unzoomT = 0;
      this.spin = 0; this.fireHold = 0; this.tickT = 0; this.frost = 0;
      this.locks = []; this.lockT = 0; this.locking = false; this.queue = []; this.qT = 0;
      this.rolling = false; this.rollDist = 0; this.paintT = 0; this.flickT = 9; this.rollHits = new Map(); this.drum = 0;
      this.moveMult = 1; this._moveApplied = 1;
      this.emptyT = 0; this.flourishT = 0; this.equipped = false;
      this.beamTargets = []; this.beamEnd = new V3(); this.beamOn = false;
      this.loopH = null; this.loopName = null;
      this.vm = null; this.vmS = {};
    }
    get def() { return this.turf ? TURF_DEFS[this.id] : DEFS[this.id]; }
    get world() { return this.owner.world; }
    get isBot() { return !this.owner.isPlayer; }
    inkMode() { return this.owner.ink !== undefined; }
    _restat() {
      const o = this.owner, gearAmmo = o && o.isPlayer && o.stats && o.stats.ammoMult > 0 ? o.stats.ammoMult : 1;
      this.st = statsFor(this.id, this.level, this.mods, { turf: this.turf, rarity: this.rarity, tune: this.opts.tune, ammoMult: (this.opts.ammoMult || 1) * gearAmmo });
      const old = this.maxAmmo || 0;
      this.maxAmmo = this.st.ammo;
      if (this.ammo != null && this.maxAmmo > old) this.ammo = Math.min(this.maxAmmo, this.ammo + (this.maxAmmo - old));
    }
    setTurf(on) {
      on = !!on && !!TURF_DEFS[this.id];
      if (on === this.turf) return;
      this.turf = on; this._restat();
    }
    setLevel(lvl) {
      lvl = clamp(lvl | 0, 1, 5);
      if (lvl === this.level) return;
      const up = lvl > this.level, wasMax = this.level >= 5;
      this.level = lvl; this.xp = Math.max(this.xp, XP_LEVELS[lvl - 1]);
      this._restat();
      if (up) this.flourishT = 0.7;
      if (this.vm && (lvl >= 5) !== wasMax) this._rebuildVm();
    }
    _rebuildVm() {
      const old = this.vm; if (!old) return;
      const parent = old.parent;
      this.vm = null; const nv = this.buildViewmodel();
      if (nv) { this.vm = nv; if (parent) { parent.remove(old); parent.add(nv); } }
      else this.vm = old;
    }
    // ---- per-frame
    update(dt, ctx) {
      if (!ctx || !ctx.world) return;
      const o = this.owner;
      if (!this.turf && o.ink !== undefined && TURF_DEFS[this.id]) this.setTurf(true);
      this.equipped = true;
      this.cd -= dt; this.fireT += dt; this.emptyT -= dt; this.flourishT -= dt;
      const firing = !!ctx.firing || (!!ctx.fireP && !(o.swapLock != null ? o.swapLock : o.equipT > 0.08));
      this.pressed = firing && !this.held;
      this.released = !firing && this.held;
      if (this.pressed) this.holdT = 0;
      if (firing) this.holdT += dt;
      this.held = firing;
      if (o.isPlayer) sysFor(this.world);
      // Player shots leave from the on-screen viewmodel muzzle (projected into the world).
      if (o.isPlayer && this.vm && G.Weapons.VM && G.Weapons.VM.muzzleWorld && ctx.aimPoint) {
        const m = G.Weapons.VM.muzzleWorld(this, this._mo || (this._mo = new V3()), 0.7, ctx.eye);
        if (m && this.world.phys.los(ctx.eye, m, false)) {
          ctx.origin = m;
          ctx.dir = (this._md || (this._md = new V3())).copy(ctx.aimPoint).sub(m).normalize();
        }
      }
      const B = BEH[this.id];
      let mm = 1;
      if (B) { const r = B.update(this, dt, ctx, firing); if (typeof r === 'number') mm = r; }
      if (this.def.heavy && o.sprinting) mm *= 0.9;
      this.setMove(mm);
      if (!firing) this.holdT = this.released ? this.holdT : 0;
      // spread recovery
      if (this.st.recover && this.spreadNow > this.st.spread && this.id !== 'gatling') this.spreadNow = Math.max(this.st.spread, this.spreadNow - this.st.recover * dt);
      // zoom (player only)
      if (o.isPlayer) this._zoom(dt);
      if (this.vm && G.Weapons.VM) G.Weapons.VM.animate(this, dt);
    }
    idle(dt) {
      if (this.equipped) this.onUnequip();
      this.cd -= dt;
      if (this.id === 'fizz') coolFizz(this, dt);
      this.spin = Math.max(0, this.spin - dt / (this.st.spinDown || 0.4));
      this.chargeVis = Math.max(0, this.chargeVis - dt * 3);
    }
    onEquip() {
      this.equipped = true; this.held = false; this.holdT = 0; this.charging = false; this.charge = 0; this.locks.length = 0; this.locking = false;
      this.rolling = false; this.flickT = 9;
      if (this.owner.isPlayer && this.owner.ink === undefined && this.ammo <= 0 && !this.infinite && this.maxAmmo > 0) this.emptyT = 1;
    }
    onUnequip() {
      this.equipped = false;
      this.charging = false; this.charge = 0; this.locking = false; this.rolling = false; this.beamOn = false;
      this._clearLocks();
      this._stopLoop();
      this.setMove(1);
      if (this.zoomF !== 1 && this.owner.isPlayer) { this.zoomF = 1; if (this.owner.setZoom) this.owner.setZoom(1); else if (this.owner.fovKick !== undefined) this.owner.fovKick = 0; }
      const s = SYS.get(this.world); if (s) { for (const [k, r] of s.ribbons) if (k.startsWith('w' + this._uid())) r.hide(); if (s.arc) s.arc.hide(); }
    }
    _uid() { return this.__uid || (this.__uid = U.uid()); }
    reload() {
      // Field weapons have no reloads (GDD §5.1). The Fizz Blaster vents some heat instead.
      if (this.id === 'fizz' && this.heat > 0.25 && this.locked <= 0 && this.owner.ink === undefined) {
        this.heat = Math.max(0, this.heat - 0.35); this.coolT = 0.4; audio(this, 'reload', { vol: 0.6 }); this.fireT = 0.2; return true;
      }
      return false;
    }
    refill() { this.ammo = this.maxAmmo; this.heat = 0; this.locked = 0; this.spin = 0; this.charge = 0; }
    addAmmo(frac) { if (!this.maxAmmo) return 0; const n = Math.max(1, Math.round(this.maxAmmo * frac)); const before = this.ammo; this.ammo = Math.min(this.maxAmmo, this.ammo + n); return this.ammo - before; }
    xpFrac() {
      let xp = this.xp;
      const prof = G.Progress && G.Save && G.Save.data && G.Save.prof;
      const pw = prof && prof.weapons && prof.weapons[this.id];
      if (pw && typeof pw.xp === 'number' && this.owner.isPlayer) xp = pw.xp;
      const L = this.level;
      if (L >= 5) return 1;
      return clamp((xp - XP_LEVELS[L - 1]) / (XP_LEVELS[L] - XP_LEVELS[L - 1]), 0, 1);
    }
    ammoText() {
      const o = this.owner;
      if (o.ink !== undefined) return Math.max(0, Math.floor(o.ink)) + '<small>%</small>';
      if (this.infinite) return '∞';
      if (this.st.ammoType === 'heat') {
        // A little heat gauge reads at a glance (kids don't need to parse "59%"); 5% steps keep DOM churn low.
        if (this.locked > 0) return '∞<i class="heat hot"><b style="width:100%"></b></i><small> ' + G.t('hud.overheat') + '</small>';
        const pct = Math.round(clamp(this.heat, 0, 1) * 20) * 5;
        return '∞<i class="heat' + (pct >= 70 ? ' warm' : '') + '"><b style="width:' + pct + '%"></b></i>';
      }
      if (this.ammo <= 0) return '<span class="low">0</span><small> ' + G.t('hud.empty') + '</small>';
      const n = Math.ceil(this.ammo);
      return (n <= this.maxAmmo * 0.25 ? '<span class="low">' + n + '</span>' : n) + '<small>/' + this.maxAmmo + '</small>';
    }
    buildViewmodel() {
      if (!G.Weapons.VM) return new THREE.Group();
      this.vm = G.Weapons.VM.build(this);
      return this.vm;
    }
    // ---- ammo / ink
    canAfford(n, ink) {
      const o = this.owner;
      if (o.ink !== undefined) return this.infinite || o.ink >= (ink != null ? ink : (this.def.ink || 2)) - 1e-6;
      if (this.infinite || this.st.ammoType === 'heat') return this.locked <= 0;
      return this.ammo >= n - 1e-6;
    }
    spend(n, ink) {
      const o = this.owner;
      if (o.ink !== undefined) {
        const c = ink != null ? ink : (this.def.ink || 2);
        if (!this.infinite) { if (o.ink < c - 1e-6) { this._empty(); return false; } o.ink = Math.max(0, o.ink - c); }
        o.inkRefillT = Math.max(o.inkRefillT || 0, this.def.refill || 0.4);
        o.lastInkT = this.world.time;
        return true;
      }
      if (this.infinite || this.st.ammoType === 'heat') return true;
      if (this.ammo < n - 1e-6) { this._empty(); return false; }
      const before = this.ammo;
      this.ammo = Math.max(0, this.ammo - n);
      // low-ammo tick when the player's magazine crosses 25% and again at 10% (the HUD count turns red at 25%)
      if (o.isPlayer && this.maxAmmo >= 4) {
        const m = this.maxAmmo, f0 = before / m, f1 = this.ammo / m;
        if ((f0 > 0.25 && f1 <= 0.25) || (f0 > 0.1 && f1 <= 0.1)) lowAmmoTick(f1 <= 0.1);
      }
      return true;
    }
    _empty() {
      if (this.emptyT > 0) return;
      this.emptyT = 0.45;
      if (this.owner.isPlayer && G.Audio) G.Audio.sfx('empty');
    }
    // ---- shot bookkeeping
    fired(kickScale) {
      const d = this.def, k = kickScale == null ? 1 : kickScale;
      this.fireT = 0; this.shots++;
      const o = this.owner;
      if (o.onFired) o.onFired((d.kick || 0.01) * k, (d.vmKick || 0.04) * k, (d.shake || 0) * k);
      if (this._ctxOrigin) muzzleFx(this, k);
    }
    // Folds moveMult into owner.speedMod (unless the owner reads weapon.moveMult itself: owner.usesMoveMult).
    // If someone else rewrote speedMod since our last write, their value is taken as the new base.
    setMove(m) {
      const o = this.owner;
      this.moveMult = m;
      if (o.usesMoveMult || typeof o.speedMod !== 'number') return;
      const over = this._moveWrote == null || Math.abs(o.speedMod - this._moveWrote) > 1e-6;
      if (!over && Math.abs(m - this._moveApplied) < 1e-4) return;
      if (over && m === 1) { this._moveApplied = 1; this._moveWrote = null; return; }
      const base = over ? o.speedMod : o.speedMod / this._moveApplied;
      o.speedMod = base * m;
      this._moveApplied = m; this._moveWrote = m === 1 ? null : o.speedMod;
    }
    _zoom(dt) {
      const o = this.owner;
      let f = this.zoomF;
      if (this.unzoomT > 0) { this.unzoomT -= dt; f = 1 + (f - 1) * Math.max(0, this.unzoomT / 0.15); if (this.unzoomT <= 0) f = 1; this.zoomF = f; }
      if (o.setZoom) { o.setZoom(f); return; }
      if (f === 1 || o.fovKick === undefined) return;
      // Feed the player's fovKick so that after its own damping (rate 4) the camera lands on base/zoom.
      const base = G.fovV ? G.fovV(G.R.camera && G.R.camera.aspect) : (G.Save.set.fov || 75);
      const target = 2 * Math.atan(Math.tan(base * DEG / 2) / f) / DEG;
      const t = G.Save.set.reducedMotion ? 0 : (o.sprinting ? 5 : 0), e = Math.exp(-4 * dt);
      o.fovKick = (target - base - t) / e + t;
    }
    // ---- damage / xp
    falloff(d) {
      const s = this.st;
      if (!s.rangeMax || s.rangeMax <= s.range || d <= s.range) return 1;
      return lerp(1, s.falloff || 1, clamp((d - s.range) / (s.rangeMax - s.range), 0, 1));
    }
    // info: {kind:'impact'|'splash'|'beam'|'dot', type, crit, pos, dir, knock, summon, silent, noFx}
    hit(a, base, info) {
      if (!a || !a.alive || !(base > 0)) return null;
      const world = this.world;
      let amt = base;
      const kind = info.kind || 'impact';
      // weak spot: ×1.75 impact / ×1.25 splash & beam ticks; actors whose crit zone is their glowing battery
      // (G.Enemies.attachCore) scale that bonus by critK, since the battery sits where centre-mass aim lands
      if (info.crit) amt *= 1 + (kind === 'impact' ? 0.75 : 0.25) * (a.critK > 0 ? a.critK : 1);
      if (a.wx && a.wx.frozenT > 0 && kind === 'impact') amt *= 1.25;
      if (!world.dmgTakenMultBuiltin && a.dmgTakenMult) amt *= a.dmgTakenMult;
      if (!this.owner.isPlayer && typeof this.owner.damageMult === 'number') amt *= this.owner.damageMult;
      const frozen = !!(a.wx && a.wx.frozenT > 0);
      const res = world.damage(a, amt, {
        src: this.owner, type: info.type || kind, pos: info.pos, dir: info.dir, crit: !!info.crit, knock: info.knock || 0,
        weapon: this.id, summon: !!info.summon, silent: !!info.silent, clinkMult: this.st.clinkMult * (frozen ? 1.5 : 1),
        pierceShield: !!info.pierceShield, dance: !!a.dancing,
      });
      if (res && res.dealt > 0) this._dealt(a, res, info);
      return res;
    }
    _dealt(a, res, info) {
      const o = this.owner, st = this.st;
      if (typeof o.damageDealt === 'number') o.damageDealt += res.dealt;
      const k = info.summon ? 0.5 : 1;
      let xp = res.dealt / 10 * k;
      if (res.killed && !a.isDome && !a.noXP) xp += 5 * tierOf(a) * k;
      this.addXP(xp);
      if (st.juice && o.addShield && o.maxShield > 0) o.addShield(res.dealt * 0.03);
      if (st.frost && a.alive && !a.isPlayer && !a.noAssist) { const x = sysFor(this.world).status(a); x.frost = Math.min(0.4, x.frost + 0.1); x.frostT = 3; }
      if (st.gooMod && !this.inkMode() && a.alive && info.kind !== 'dot' && info.kind !== 'beam') {
        sysFor(this.world).addPuddle(_h1.set(a.pos.x, a.pos.y, a.pos.z), 1.0, 0.8, 3, o.team);
      }
    }
    addXP(n) {
      if (!(n > 0) || !this.owner.isPlayer) return;
      this.xpAcc += n;
      if (this.xpAcc < 1) return;
      const whole = Math.floor(this.xpAcc); this.xpAcc -= whole;
      if (G.Progress && G.Progress.weaponXP) { G.safe('weaponXP', () => G.Progress.weaponXP(this.id, whole)); this.xp += whole; return; }
      this.xp += whole;
      const lvl = levelForXP(this.xp);
      if (lvl > this.level) {
        this.setLevel(lvl);
        G.bus.emit('weapon-levelup', this.id, lvl);
        if (G.Audio) G.Audio.sfx('levelup');
        if (G.UI && G.UI.banner) G.UI.banner(G.t('wpn.levelup', { name: G.t(this.def.nameKey), n: lvl }), '', 1.2);
      }
    }
    // ---- paint (turf)
    paint(point, r, normal) {
      const rules = this.world.rules;
      if (!rules || !rules.paint) return 0;
      const n = rules.paint(point, r * this.st.paintMult, this.owner.team, normal || UP, this.owner);
      if (typeof n === 'number' && n > 0) { this.cells += n; if (this.cells >= 20) { const x = Math.floor(this.cells / 20); this.cells -= x * 20; this.addXP(x); } }
      return n;
    }
    paintGround(x, y, z, r) {
      const rules = this.world.rules; if (!rules || !rules.paint) return 0;
      const gy = this.world.phys.groundAt(x, z, 0.1, y + 0.3);
      if (y - gy > 8) return 0;
      _pg.set(x, gy, z);
      return this.paint(_pg, r, UP);
    }
    gooColor() {
      const o = this.owner;
      if (o.inkColor != null) return o.inkColor;
      const r = this.world && this.world.rules;
      if (r && r.inkColor) { const c = r.inkColor(o.team); if (c != null) return c; }
      if (this.inkMode() || (r && r.paint)) return TEAM_INK[o.team] != null ? TEAM_INK[o.team] : 0xFF8A1F;
      return 0xA8E06A;
    }
    // ---- loops
    _loop(name, opts) {
      if (!G.Audio || !G.Audio.loop) return null;
      if (this.loopH && this.loopName === name && this.loopH.playing) { if (opts) this.loopH.set(opts); return this.loopH; }
      this._stopLoop();
      const o = Object.assign({}, opts || {});
      if (!this.owner.isPlayer) o.pos = this.owner.pos;
      this.loopH = G.Audio.loop(name, o); this.loopName = name;
      return this.loopH;
    }
    _stopLoop() { if (this.loopH) { this.loopH.stop(0.12); this.loopH = null; this.loopName = null; } }
    _clearLocks() {
      if (this.owner.isPlayer && G.HUD && G.HUD.removeMarker && this._mk) for (let i = 0; i < 8; i++) G.HUD.removeMarker('wlock' + i);
      this._mk = 0;
      this.locks.length = 0; this.lockT = 0;
    }
    // ---- projectile spawn helper
    proj(ctx, dir, o) {
      o.pos = o.pos || ctx.origin; o.dir = dir; o.src = this.owner; o.team = this.owner.team; o.weapon = this.id;
      if (this.st.bouncy && o.bounce == null && o.kind !== 'grenade') o.bounce = 1;
      if (this.inkMode() || (this.world.rules && this.world.rules.paint)) { o.kind = o.kind === 'rocket' || o.kind === 'disc' ? o.kind : 'ink'; o.color = this.gooColor(); if (o.data) o.data.color = o.color; }
      return this.world.projectiles.spawn(o);
    }
  }

  // ------------------------------------------------------------------ generic projectile hit handler
  // p.data: {w, dmg, speed, color, knock, knockCap, shot, stagger, paint, drop, dropEvery, ricochet, goo, blast, summon, chain, flick}
  function shotHit(p, hit, world) {
    const d = p.data, w = d.w;
    if (!w) return false;
    if (hit.actor) {
      const a = hit.actor;
      const dist = p.age * (d.speed || 40);
      let dmg = d.dmg;
      if (d.flick) dmg = lerp(d.flick[0], d.flick[1], clamp((dist - 3 * w.st.flickRange) / (5 * w.st.flickRange), 0, 1));
      else dmg *= w.falloff(dist);
      const crit = critAt(a, p);
      let knock = 0;
      if (d.knock) {
        const sh = d.shot; let acc = 0, idx = sh.ids.indexOf(a.id);
        if (idx < 0) { idx = sh.ids.length; sh.ids.push(a.id); sh.kn.push(0); }
        acc = sh.kn[idx]; knock = Math.max(0, Math.min(d.knock, d.knockCap - acc)); sh.kn[idx] = acc + knock;
      }
      const res = w.hit(a, dmg, { kind: 'impact', crit, pos: p.pos.clone(), dir: p.vel.clone().normalize(), knock, summon: d.summon, pierceShield: d.pierceShield });
      if (d.stagger) stagger(a, 0.35);
      impactFx(world, p.pos, hit.normal, d.color, true, crit, dmg, res);
      if (crit && res && res.dealt >= 40 && w.owner.isPlayer) G.time.hitStop(0.032);
      if (d.paint) w.paintGround(p.pos.x, p.pos.y, p.pos.z, d.paint);
      if (d.ricochet && a) fizzRicochet(w, a, p);
      if (d.chain) buddyChain(w, a, p, d);
      if (d.blast) splash(w, p.pos, 1.5, 25 * w.st.dmgMult, { style: 'pop', color: d.color, inner: 0.3, exclude: null });
      return false;
    }
    // world surface
    if (d.paint) w.paint(p.pos, d.paint, hit.normal);
    if (d.goo) gooSplat(w, p.pos, hit.normal, d);
    else { impactFx(world, p.pos, hit.normal, d.color, false, false, d.dmg); impactSnd(p.pos, hit.normal); }
    if (d.blast) splash(w, p.pos, 1.5, 25 * w.st.dmgMult, { style: 'pop', color: d.color, inner: 0.3 });
    if (p.bounce > 0) return true;
    return false;
  }
  // Layered impact (flash, sparks, puff, mark — see FX.impact) sized by the hit's damage. Hits that
  // land on a shield add a cool blue ripple so players can tell shield from body at a glance.
  const _imp = { actor: false, crit: false, scale: 1 };
  function impactFx(world, pos, normal, color, actor, crit, dmg, res) {
    const fx = world.fx;
    if (!fx.impact) { fx.sparks(pos, color, actor ? 7 : 4); return; }
    _imp.actor = actor; _imp.crit = !!crit; _imp.scale = clamp(Math.sqrt((dmg || 12) / 14), 0.65, 1.9);
    fx.impact(pos, normal, color, _imp);
    if (res && res.toShield > 0 && fx.shock) { fx.shock(pos, 0.45 + 0.25 * _imp.scale, 0x8FE3FF, 0.18, 0.85); fx.sparkle(pos, 0xCFF6FF, 1, 0.3); }
  }
  // Shots landing on the world make a small material-pitched tick (09_audio 'impact'; the audio module spaces
  // repeats): floors thud, walls / props ping. Silent without the id.
  const _impO = { mat: 'ground', vol: 0.8 };
  function impactSnd(pos, normal, mat) {
    if (!hasSfx('impact')) return;
    _impO.mat = mat || (normal && normal.y > 0.6 ? 'ground' : 'metal');
    G.Audio.sfxAt('impact', pos, _impO);
  }
  // Turf droplets / trails painted along the flight path.
  function shotTick(p, dt, world) {
    const d = p.data;
    if (d.dropEvery) {
      const dist = p.age * (d.speed || 40);
      if (dist >= d.nextDrop) { d.nextDrop += d.dropEvery; d.w.paintGround(p.pos.x, p.pos.y, p.pos.z, d.drop); }
    }
  }
  let splatSfxT = 0;
  const _gooR = { normal: null, alpha: 0.5 };
  const _gooC = [0, 0xffffff, 0], _gooO = { normal: true, grav: 11, drag: 1.2, dir: null, spread: 0.75, shape: 'blob' };
  function gooSplat(w, pos, normal, d) {
    const world = w.world;
    const paintMode = !!(world.rules && world.rules.paint);
    const r = d.puddle || 0.6;
    if (!paintMode) {
      world.fx.decal(pos, normal, d.color, r * 1.25, 0.92);
      if (d.puddle && normal.y > 0.55) sysFor(world).addPuddle(pos, r, 1 - (w.st.puddleSlow || 0.15), 3, w.owner.team);
    }
    // glossy goo crown thrown off the surface, plus a quick splash ring
    _gooC[0] = _gooC[2] = d.color; _gooO.dir = normal;
    world.fx.burst(pos, _gooC, 6, 3.4, 0.11, 0.42, _gooO);
    // (skipped right in front of the lens, where it would only clutter the view)
    if (world.fx.shock && G.R.camera.position.distanceToSquared(pos) > 6.25) { _gooR.normal = normal; world.fx.ring(_h1.copy(pos).addScaledVector(normal, 0.04), r * (paintMode ? 0.6 : 0.85), d.color, 0.2, undefined, _gooR); }
    if (G.Audio && world.time - splatSfxT > 0.12) { splatSfxT = world.time; G.Audio.sfxAt('splat', pos, { vol: 0.5 }); }
  }
  function fizzRicochet(w, a, p) {
    const world = w.world;
    const t = nearestFoe(world, p.pos, 6, w.owner.team, a, true);
    if (!t) return;
    t.aimPoint(_a); _dir.copy(_a).sub(p.pos).normalize();
    world.projectiles.spawn({ pos: p.pos, dir: _dir, speed: 60, life: 0.3, radius: 0.1, kind: 'bolt', size: 0.06, color: 0xFFD45C, src: w.owner, team: w.owner.team, weapon: w.id,
      onHit: shotHit, data: { w, dmg: p.data.dmg * 0.5, speed: 60, color: 0xFFD45C } });
  }
  function buddyChain(w, a, p, d) {
    const world = w.world;
    const t = nearestFoe(world, p.pos, 6, w.owner.team, a, true);
    if (!t) return;
    t.aimPoint(_a);
    world.fx.tracer(p.pos, _a, 0xFFF3A0, 0.05, 0.1);
    w.hit(t, d.dmg * 0.6, { kind: 'beam', summon: true, pos: _a.clone() });
  }

  // ------------------------------------------------------------------ splash damage (custom falloff, GDD §5.2)
  // o: {inner (fraction of r at full damage), edge (0.4), knock:false, color, style:'goo'|'boom'|'confetti'|'pop'|'none', paint, noSplit, exclude, fx:false}
  function splash(w, pos, r, dmg, o) {
    o = o || {};
    const world = w.world, owner = w.owner;
    const inner = o.inner != null ? o.inner : 0.3, edge = o.edge != null ? o.edge : 0.4;
    const P = pos.clone();
    for (let i = 0; i < world.actors.length; i++) {
      const a = world.actors[i];
      if (!a.alive || !a.targetable || a === owner || a === o.exclude) continue;
      if (a.team === owner.team) continue;
      a.aimPoint(_a);
      const d = Math.max(0, _a.distanceTo(P) - a.r);
      if (d > r) continue;
      if (d > r * 0.35 && !world.phys.los(P, _a, false)) continue;
      const f = d <= r * inner ? 1 : lerp(1, edge, (d - r * inner) / Math.max(0.01, r - r * inner));
      const kn = o.knock === false ? 0 : lerp(5, 1.5, d / r) * (w.st.knockMult || 1);
      w.hit(a, dmg * f, { kind: 'splash', type: o.type || 'splash', pos: P, dir: _a.clone().sub(P), knock: kn, summon: o.summon });
    }
    if (world.rules.onExplode) G.safe('onExplode', () => world.rules.onExplode(P, r, { src: owner, weapon: w.id, dmg, color: o.color }));
    if (o.paint) w.paintGround(P.x, P.y + 0.5, P.z, o.paint);
    if (o.fx !== false) blastFx(world, P, r, o.color || w.def.glow, o.style || 'boom');
    if (w.st.split && !o.noSplit && dmg > 0) {
      for (let k = 0; k < 2; k++) {
        const ang = Math.random() * Math.PI * 2;
        _b.set(P.x + Math.cos(ang) * r * 0.7, P.y, P.z + Math.sin(ang) * r * 0.7);
        splash(w, _b, r * 0.6, dmg * 0.35, { style: 'pop', color: o.color, noSplit: true, knock: false, summon: o.summon });
      }
    }
    if (owner.isPlayer && world.player === owner) { const dd = owner.pos.distanceTo(P); if (dd < r * 3) world.fx.shake(0.35 * (1 - dd / (r * 3))); }
  }
  const _gooB = { grav: 11, normal: true, shape: 'blob', ground: true, curve: 'flat', drag: 0.9, up: 1.5 };
  const _popC = [0, 0xffffff], _popO = { grav: 8, shape: 'streak', hot: 0.6, drag: 3 };
  function blastFx(world, pos, r, color, style) {
    const fx = world.fx;
    if (style === 'none') return;
    if (style === 'boom' || style === 'confetti') {
      fx.explosion(pos, r, color);
      if (style === 'confetti') fx.confetti(pos, 28);
      return;
    }
    if (style === 'goo') {
      // goo bomb: bright pop, a wobbly bubble, glossy blobs that rain down, a splat where it landed
      fx.flash(pos, 0xffffff, r * 1.6, 0.12);
      fx.sphereFlash(pos, r * 0.85, color, 0.3, { alpha: 0.55, fill: 0.35 });
      if (fx.shock) fx.shock(pos, r * 1.25, color, 0.28, 0.7);
      const gy = world.phys.groundAt(pos.x, pos.z, 0.2, pos.y + 0.6);
      if (pos.y - gy < r) {
        fx.ring(_h1.set(pos.x, gy + 0.06, pos.z), r * 1.2, color, 0.42);
        if (!(world.rules && world.rules.paint)) fx.decal(_h1, UP, color, r * 0.55, 0.9);
      }
      _gooC[0] = _gooC[2] = color;
      fx.burst(pos, _gooC, 22, r * 4, 0.24, 0.75, _gooB);
      if (G.Audio) G.Audio.sfxAt('inkHeavy', pos, { size: r });
      return;
    }
    // small pop
    fx.flash(pos, color, r * 1.4, 0.1);
    if (fx.shock) fx.shock(pos, r * 1.1, color, 0.2, 0.75);
    fx.sphereFlash(pos, r * 0.6, color, 0.16, { alpha: 0.5, fill: 0.4 });
    _popC[0] = color;
    fx.burst(pos, _popC, 9, r * 4.5, 0.08, 0.35, _popO);
    if (fx.sparkle) fx.sparkle(pos, color, 2, 0.3);
    if (G.Audio) G.Audio.sfxAt('grenade', pos, { vol: 0.5, pitch: 1.4 });
  }

  // ------------------------------------------------------------------ behaviours
  function autoFire(w, firing, shoot, ctx) {
    if (firing) {
      let guard = 0;
      while (w.cd <= 0 && guard++ < 4) {
        if (!shoot(w, ctx)) { w.cd = Math.max(w.cd, 0.12); break; }
        w.cd += 1 / w.st.rate;
      }
    } else if (w.cd < 0) w.cd = 0;
  }
  function coolFizz(w, dt) {
    if (w.locked > 0) { w.locked -= dt; if (w.locked <= 0) { w.locked = 0; w.heat = 0.99; } return; }
    w.coolT -= dt;
    if (w.coolT <= 0) w.heat = Math.max(0, w.heat - w.st.cool * dt);
  }
  function remember(w, ctx) { w._ctxOrigin = ctx.origin; w._ctxDir = ctx.dir; }

  // ------------------------------------------------------------------ muzzle effects (world space)
  // Bots get the full flash at their gun (they have no viewmodel). The player's viewmodel draws its
  // own flash, so the player only gets world-space sparks / smoke / goo that fly out past the barrel
  // (tiny: the muzzle point sits 0.7 m in front of the eye). s: flash size (0 = none), shape:
  // 'star' | 'glow' | 'ring', n: sparks, smoke: chance of a wisp, goo: droplets, sp: spark speed.
  const MUZ = {
    fizz: { s: 0.5, n: 2, sp: 7 }, scatter: { s: 0.95, n: 6, smoke: 1, sp: 8 }, lobber: { s: 0.45, shape: 'glow' },
    zap: { s: 0 }, saw: { s: 0.55, n: 3, shape: 'ring' }, lancer: { s: 0.85, n: 5, shape: 'ring', sp: 9 }, gatling: { s: 0.6, n: 1, smoke: 0.1, sp: 8 },
    swarm: { s: 0.7, n: 2, smoke: 1, shape: 'glow' }, buddy: { s: 0.5, shape: 'glow' }, groove: { s: 0.45, shape: 'glow' }, bloom: { s: 0.45, shape: 'glow' },
    chill: { s: 0 }, splat: { s: 0.4, goo: 2, shape: 'glow' }, roller: { s: 0.5, goo: 5, shape: 'glow' }, prism: { s: 0.8, n: 3, smoke: 1, shape: 'glow' },
  };
  const _mzO = { dir: null, scale: 1, life: 0.14 }, _mzS = { size: 0.35, rise: 0.4, life: 0.6 };
  function muzzleFx(w, k) {
    const M = MUZ[w.id]; if (!M || !(M.s > 0)) return;
    const world = w.world, fx = world.fx, o = w.owner, pos = w._ctxOrigin, dir = w._ctxDir;
    if (!fx || !fx.quads) return;
    const col = w.inkMode() || (world.rules && world.rules.paint) ? w.gooColor() : w.def.glow;
    const ks = Math.min(1.6, Math.max(0.5, k));
    if (!o.isPlayer) {
      if (world.time - (w._flashAt || -9) < 0.05) return;
      w._flashAt = world.time;
      if (M.shape === 'ring') { fx.shock(pos, M.s * 0.6 * ks, col, 0.14, 0.9); fx.flash(pos, col, M.s * ks, 0.08); }
      else if (M.shape === 'glow') fx.pop(pos, col, M.s * 1.4 * ks, 0.12, 0.85);
      else fx.muzzle(pos, col, M.s * ks, 0.06);
      if (M.n && dir) { _mzO.dir = dir; _mzO.scale = 1.2; _mzO.life = 0.2; fx.sparks(pos, col, M.n, _mzO); }
      if (M.smoke && Math.random() < M.smoke) fx.smoke(pos, 1, 0xf1eef8, _mzS);
      return;
    }
    if (!dir) return;
    if (M.n) {
      const q = fx.q;
      for (let i = 0; i < M.n; i++) {
        if (Math.random() > q) continue;
        _e.set(U.rand(-1, 1), U.rand(-1, 1), U.rand(-1, 1)).multiplyScalar(0.28).add(dir).normalize().multiplyScalar((M.sp || 7) * U.rand(0.6, 1.1));
        fx.add.add(pos.x, pos.y, pos.z, _e.x, _e.y, _e.z, Math.random() < 0.5 ? col : 0xffffff, 0.016 * ks, U.rand(0.1, 0.17), 6, 4, 1, 1, 4, col, 0.7);
      }
    }
    if (M.smoke && Math.random() < M.smoke) {
      _e.copy(dir).multiplyScalar(U.rand(0.5, 0.9));
      fx.norm.add(pos.x + dir.x * 0.06, pos.y + dir.y * 0.06, pos.z + dir.z * 0.06, _e.x, _e.y + 0.25, _e.z, 0xf4f2fa, 0.06 * ks, U.rand(0.45, 0.65), -0.4, 2.2, 0.32, 5, 1, 0xffffff, 0, U.rand(-1, 1));
    }
    if (M.goo) {
      for (let i = 0; i < M.goo; i++) {
        _e.set(U.rand(-1, 1), U.rand(-0.5, 1), U.rand(-1, 1)).multiplyScalar(0.35).add(dir).normalize().multiplyScalar(U.rand(2.5, 4.5));
        fx.norm.add(pos.x, pos.y, pos.z, _e.x, _e.y, _e.z, col, U.rand(0.018, 0.03), U.rand(0.18, 0.28), 9, 1.5, 1, 4, 0);
      }
    }
  }

  const BEH = {};

  // 1 Fizz Blaster — heat, bolts, W5 ricochet
  BEH.fizz = {
    update(w, dt, ctx, firing) {
      remember(w, ctx);
      if (!w.inkMode()) coolFizz(w, dt); else { w.heat = 0; w.locked = 0; }
      autoFire(w, firing, BEH.fizz.shoot, ctx);
      if (w.locked > 0 || w.heat > 0.8) barrelSmoke(w, ctx, dt, w.locked > 0 ? 1 : (w.heat - 0.8) * 2);
    },
    shoot(w, ctx) {
      if (w.locked > 0) { if (w.pressed || Math.random() < 0.05) w._empty(); return false; }
      if (!w.spend(1)) return false;
      const st = w.st;
      let sp = w.spreadNow * (w.pressed ? 0.5 : 1);
      if (w.heat > 0.7) sp += U.rand(0, 1) * DEG;
      coneDir(_dir, ctx.dir, sp);
      const col = w.heat > 0.7 ? 0xFF9F45 : st.glow;
      w.proj(ctx, _dir, { speed: st.speed, life: st.rangeMax / st.speed, radius: 0.1, kind: 'bolt', size: 0.065, color: col, onHit: shotHit, onTick: shotTick,
        data: { w, dmg: st.dmg, speed: st.speed, color: col, ricochet: st.max, paint: st.paint, drop: st.drop, dropEvery: st.dropEvery, nextDrop: st.dropEvery || 0 } });
      w.spreadNow = Math.min(st.spreadMax, w.spreadNow + st.bloom);
      if (!w.inkMode()) {
        w.heat += st.heat; w.coolT = st.coolDelay;
        if (w.heat >= 1) {
          w.heat = 1; w.locked = st.lockT;
          if (hasSfx('overheat')) audio(w, 'overheat', { vol: w.owner.isPlayer ? 0.9 : 0.6 });
          else { audio(w, 'error', { vol: 0.7, pitch: 1.3 }); if (w.owner.isPlayer) audio(w, 'shieldBreak', { vol: 0.25, pitch: 1.6 }); }
        }
      }
      audio(w, 'blaster', { pitch: 1 + w.heat * 0.25, vol: 0.85 });
      w.fired();
      return true;
    },
  };

  // 2 Pop Scatter — pellets with capped knockback, staggers T1
  BEH.scatter = {
    update(w, dt, ctx, firing) { remember(w, ctx); autoFire(w, firing, BEH.scatter.shoot, ctx); },
    shoot(w, ctx) {
      if (!w.spend(1)) return false;
      const st = w.st, n = st.pellets;
      const shot = { ids: [], kn: [] };
      const life = st.life * (st.rangeMax / 20);
      for (let i = 0; i < n; i++) {
        coneDir(_dir, ctx.dir, st.spread * (i === 0 ? 0.3 : 1));
        w.proj(ctx, _dir.clone(), { speed: st.speed, life, radius: 0.09, kind: 'orb', size: 0.05, color: st.glow, onHit: shotHit,
          data: { w, dmg: st.dmg, speed: st.speed, color: st.glow, knock: st.knock, knockCap: st.knockCap, shot, stagger: true, paint: st.paint } });
      }
      // popcorn puff at the muzzle
      w.world.fx.burst(ctx.origin, [0xFFF1DC, 0xFFD45C, 0xffffff], 5, 3, 0.09, 0.3, { grav: 6, normal: true });
      audio(w, 'shotgun');
      w.fired();
      return true;
    },
  };

  // Unit launch direction that makes a projectile (speed, gravity g) pass through `to` (low arc). Targets past
  // `reach` (speed × life) are pulled in along the line so a far / sky aim point does not tilt the shot up.
  const _bt = new V3();
  function ballisticDir(out, from, to, speed, g, reach, fallback) {
    _bt.copy(to).sub(from);
    const L = _bt.length();
    if (L < 0.05 || !(g > 0) || !(speed > 0)) return out.copy(fallback);
    if (reach > 0 && L > reach) _bt.multiplyScalar(reach / L);
    const x = Math.hypot(_bt.x, _bt.z), y = _bt.y, v2 = speed * speed;
    if (x < 0.05) return out.copy(fallback);
    const disc = v2 * v2 - g * (g * x * x + 2 * y * v2);
    if (disc < 0) return out.copy(fallback);
    const th = Math.atan2(v2 - Math.sqrt(disc), g * x), c = Math.cos(th);
    return out.set(_bt.x / x * c, Math.sin(th), _bt.z / x * c).normalize();
  }
  // Throwables (lobber / groove / bloom): hold shows the arc, release throws. Bots throw at once.
  function throwVel(w, ctx, speed, pitchDeg, out) {
    const d = ctx.eyeDir;
    const h = Math.hypot(d.x, d.z) || 1;
    const pitch = Math.atan2(d.y, h) + (pitchDeg || 0) * DEG;
    out.set(d.x / h * Math.cos(pitch), Math.sin(pitch), d.z / h * Math.cos(pitch)).multiplyScalar(speed);
    return out;
  }
  function throwUpdate(w, dt, ctx, firing, launch, opts) {
    remember(w, ctx);
    const st = w.st;
    if (w.isBot) {
      if (firing && w.cd <= 0) { if (w.canAfford(1)) { launch(w, ctx); w.cd = 1 / st.rate; } else w._empty(); }
      return;
    }
    if (firing && w.cd <= 0 && w.canAfford(1)) {
      throwVel(w, ctx, st.speed, opts.pitch, _dir2);
      sysFor(w.world).arcPreview().show(ctx.origin, _dir2, st.gravity || 18, opts.maxT, opts.radius, opts.color, opts.bounces || 0);
    } else if (firing && w.pressed && !w.canAfford(1)) w._empty();
    if (w.released && w.cd <= 0) {
      if (w.canAfford(1)) { launch(w, ctx); w.cd = 1 / st.rate; }
    }
  }

  // 3 Bubble Lobber — bounces once, bursts on 2nd contact / bot / 1.6 s; W5 mini bubbles
  BEH.lobber = {
    update(w, dt, ctx, firing) { throwUpdate(w, dt, ctx, firing, BEH.lobber.launch, { pitch: w.st.pitch, maxT: 1.6, radius: w.st.aoe, color: 0xFF8FC0, bounces: 1 }); },
    launch(w, ctx) {
      if (!w.spend(1)) return;
      const st = w.st;
      throwVel(w, ctx, st.speed, st.pitch, _dir2);
      const p = w.proj(ctx, _dir2.clone().normalize(), { speed: st.speed, gravity: st.gravity, life: st.fuse, radius: 0.18, kind: 'grenade', size: 0.16, color: 0xFF8FC0, bounce: 3,
        onHit: lobHit, onTick: lobTick, data: { w, contacts: 0, color: 0xFF8FC0 } });
      p.data.color = p.color;
      audio(w, 'grenade', { pitch: 1.6 });
      w.fired();
    },
  };
  function lobBurst(p, world, direct) {
    const d = p.data, w = d.w; if (d.done) return; d.done = true;
    const st = w.st;
    if (direct && st.direct) w.hit(direct, st.direct - st.dmg, { kind: 'impact', pos: p.pos.clone(), dir: p.vel.clone().normalize() });
    splash(w, p.pos, st.aoe, st.dmg, { inner: st.inner / st.aoe, edge: st.edge, style: 'goo', color: d.color, paint: st.paint });
    if (st.max) {
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 + Math.random();
        world.projectiles.spawn({ pos: p.pos.clone().add(_a.set(0, 0.3, 0)), vel: _b.set(Math.cos(a) * 3.5, 5, Math.sin(a) * 3.5), gravity: 18, life: 0.65, radius: 0.12, kind: 'grenade', size: 0.08,
          color: 0xFFC8E0, src: w.owner, team: w.owner.team, weapon: w.id, noActors: false, bounce: 2,
          onHit: (q, h) => { if (h.actor) { miniBurst(q); return false; } return true; }, onTick: q => { if (q.life <= 0) miniBurst(q); }, data: { w, color: 0xFFC8E0 } });
      }
    }
  }
  function miniBurst(q) { const d = q.data; if (d.done) return; d.done = true; splash(d.w, q.pos, 2, 25 * d.w.st.dmgMult, { style: 'goo', color: d.color, inner: 0.3, noSplit: true, paint: d.w.st.paint ? 1 : 0 }); q.life = 0; }
  function lobHit(p, hit, world) {
    const d = p.data;
    if (hit.actor) { lobBurst(p, world, hit.actor); return false; }
    d.contacts++;
    if (d.contacts >= 2) { lobBurst(p, world, null); return false; }
    p.vel.multiplyScalar(0.5 / 0.62);
    if (G.Audio) G.Audio.sfxAt('bounce', p.pos, { vol: 0.6, pitch: 1.4 });
    return true;
  }
  function lobTick(p, dt, world) { if (p.life <= 0) lobBurst(p, world, null); }

  // 4 Zap Coil — 10 ticks/s chain beam, sticky aim, W5 4 chains + slow
  BEH.zap = {
    update(w, dt, ctx, firing) {
      remember(w, ctx);
      const st = w.st, world = w.world, owner = w.owner;
      const s = sysFor(world), key = 'w' + w._uid();
      const ZK = w._zk || (w._zk = [key + 'z0', key + 'z1', key + 'z2', key + 'z3', key + 'z4']);
      const active = firing && w.canAfford(1, w.def.ink);
      if (!active) {
        if (firing && w.pressed) w._empty();
        if (w.beamOn) { w.beamOn = false; w._stopLoop(); for (let i = 0; i < 5; i++) { const r = s.ribbons.get(ZK[i]); if (r) r.hide(); } }
        w.tickT = 0; return;
      }
      w.beamOn = true;
      // find primary target (hitscan, then sticky to the aim-assist target)
      const hit = world.hitscan(ctx.eye, ctx.eyeDir, st.range, owner);
      let tgt = hit && hit.actor && isFoe(hit.actor, owner.team) ? hit.actor : null, crit = !!(hit && hit.crit);
      if (!tgt && ctx.target && ctx.target.alive) {
        ctx.target.aimPoint(_a); _b.copy(_a).sub(ctx.eye); const dd = _b.length();
        if (dd <= st.range + ctx.target.r && _b.normalize().dot(ctx.eyeDir) > Math.cos(6 * DEG) && world.phys.los(ctx.eye, _a, false)) tgt = ctx.target;
      }
      if (tgt) tgt.aimPoint(w.beamEnd); else if (hit) w.beamEnd.copy(hit.point); else w.beamEnd.copy(ctx.eye).addScaledVector(ctx.eyeDir, st.range);
      w.tickT -= dt;
      let guard = 0;
      while (w.tickT <= 0 && guard++ < 3) {
        w.tickT += 1 / st.rate;
        if (!w.spend(1, w.def.ink)) break;
        w.beamTargets.length = 0;
        if (tgt) {
          w.beamTargets.push(tgt);
          w.hit(tgt, st.dmg, { kind: 'beam', crit, pos: w.beamEnd.clone(), dir: ctx.eyeDir.clone() });
          let last = tgt;
          for (let c = 0; c < st.chain.length; c++) {
            last.aimPoint(_c);
            const nx = nearestFoe(world, _c, st.chainR, owner.team, w.beamTargets, true);
            if (!nx) break;
            w.beamTargets.push(nx);
            w.hit(nx, st.dmg * st.chain[c], { kind: 'beam', pos: nx.pos.clone() });
            if (st.max && nx.alive) sysFor(world).status(nx).zapT = 0.6;
            last = nx;
          }
          if (st.max && tgt.alive) sysFor(world).status(tgt).zapT = 0.6;
          if (Math.random() < 0.35) audio(w, 'zap', { vol: 0.5 });
          world.fx.sparks(w.beamEnd, st.glow, 3);
        }
        if (w.inkMode() || (world.rules && world.rules.paint)) w.paintGround(w.beamEnd.x, w.beamEnd.y, w.beamEnd.z, w.def.paint || 0.35);
        w.fired(0.6);
      }
      // visuals (every frame): soft lightning (re-jittered each frame, width flickers), glows
      const jitter = 0.09, fx = world.fx, fl = 0.75 + Math.random() * 0.5;
      const main = s.ribbon(ZK[0], 10, st.glow, 0.2, 0.95);
      main.width = 0.2 * fl;
      main.bolt(ctx.origin, w.beamEnd, 10, jitter);
      if (fx.glow) {
        fx.glow(w.beamEnd, st.glow, (tgt ? 0.9 : 0.5) * fl, 0.75);
        if (!owner.isPlayer) fx.glow(ctx.origin, st.glow, 0.45 * fl, 0.8);
        for (let i = 1; i < w.beamTargets.length; i++) { const b = w.beamTargets[i]; if (b.alive) fx.glow(b.aimPoint(_c), st.glow, 0.7 * fl, 0.6); }
      }
      for (let i = 1; i < 5; i++) {
        const r = s.ribbons.get(ZK[i]);
        const a = w.beamTargets[i - 1], b = w.beamTargets[i];
        if (a && b && a.alive && b.alive) {
          const rr = r || s.ribbon(ZK[i], 8, st.glow, 0.15, 0.85);
          a.aimPoint(_c); b.aimPoint(_d); rr.bolt(_c, _d, 8, jitter * 1.2);
        } else if (r) r.hide();
      }
      w._loop('beam', { pitch: 1.1, vol: 0.8 });
    },
  };

  // 5 Saw Skipper — ricochet disc, seeks bots, W5 twin V
  // The W5 V closes on the crosshair: the two discs leave from either side of the muzzle and
  // cross on the aim point (about 10° apart at mid range), so a lone bot takes both discs at
  // any distance and the pair fans out past it to catch neighbours. (An opening ±5° V passed
  // ~0.7 m either side of a bot at 8 m, so the max level missed every single target.)
  const SAW_SIDE = 0.22, _sawSide = new V3(), _sawAim = new V3(), _sawO = new V3();
  BEH.saw = {
    update(w, dt, ctx, firing) { remember(w, ctx); autoFire(w, firing, BEH.saw.shoot, ctx); },
    shoot(w, ctx) {
      if (!w.spend(1, w.def.ink)) return false;
      const st = w.st;
      const n = st.max ? 2 : 1;
      let conv = 0;
      if (n > 1) {
        conv = ctx.aimPoint ? ctx.aimPoint.distanceTo(ctx.origin) : st.range;
        conv = clamp(conv, 2, st.range || 25);
        _sawAim.copy(ctx.origin).addScaledVector(ctx.dir, conv);
        _sawSide.crossVectors(ctx.dir, UP);
        if (_sawSide.lengthSq() < 1e-4) _sawSide.set(1, 0, 0);
        _sawSide.normalize();
      }
      for (let i = 0; i < n; i++) {
        let pos = null;
        _dir.copy(ctx.dir);
        if (n > 1) {
          _sawO.copy(ctx.origin).addScaledVector(_sawSide, i ? SAW_SIDE : -SAW_SIDE);
          // hugging a wall: launch from the muzzle itself rather than inside the wall
          if (!w.world.phys.los(ctx.origin, _sawO, false)) _sawO.copy(ctx.origin);
          pos = _sawO;
          _dir.copy(_sawAim).sub(_sawO).normalize();
        }
        w.proj(ctx, _dir.clone(), { pos, speed: st.speed, life: st.life, radius: 0.16, kind: 'disc', size: 0.13, color: 0xDDFFF0, spin: 28, bounce: 8, pierce: 99, onHit: sawHit, onTick: shotTick,
          data: { w, dmg: st.dmg, factor: 1, bots: 0, speed: st.speed, color: st.color, paint: st.paint, drop: st.trail, dropEvery: st.trail ? 1.5 : 0, nextDrop: 1.5 } });
      }
      audio(w, 'disc');
      w.fired();
      return true;
    },
  };
  function sawHit(p, hit, world) {
    const d = p.data, w = d.w, st = w.st;
    p.dmg = 0;
    if (hit.actor) {
      const a = hit.actor;
      const crit = critAt(a, p);
      w.hit(a, d.dmg * d.factor, { kind: 'impact', crit, pos: p.pos.clone(), dir: p.vel.clone().normalize(), pierceShield: true });
      impactFx(world, p.pos, hit.normal, 0xDDFFF0, true, crit, d.dmg * d.factor);
      if (G.Audio) G.Audio.sfxAt('bounce', p.pos, { pitch: 2.2, vol: 0.5 });
      d.factor *= st.bounceMult; d.bots++;
      if (d.paint) w.paintGround(p.pos.x, p.pos.y, p.pos.z, d.paint);
      if (d.bots >= st.maxBots) return false;
      // seek the next bot
      const ex = p.hitSet ? p.hitSet : null;
      let next = null, bd = st.seekR;
      for (const b of world.actors) {
        if (b === a || !isAutoFoe(b, w.owner.team) || (ex && ex.has(b.id))) continue;
        b.aimPoint(_a); const dd = _a.distanceTo(p.pos);
        if (dd < bd && world.phys.los(p.pos, _a, false)) { bd = dd; next = b; }
      }
      const sp = p.vel.length();
      if (next) { next.aimPoint(_a); p.vel.copy(_a).sub(p.pos).normalize().multiplyScalar(sp); }
      else { _b.copy(p.pos).sub(a.aimPoint(_a)).setY(0); if (_b.lengthSq() < 1e-4) _b.set(Math.random() - 0.5, 0, Math.random() - 0.5); _b.normalize(); const vn = p.vel.dot(_b); if (vn < 0) p.vel.addScaledVector(_b, -2 * vn); }
      p.life = Math.max(p.life, 0.8);
      return true;
    }
    // wall: keep speed (core multiplies by 0.62), lose 15% damage
    d.factor *= st.bounceMult;
    p.vel.multiplyScalar(1 / 0.62);
    impactFx(world, p.pos, hit.normal, 0xDDFFF0, false, false, 10);
    impactSnd(p.pos, null, 'metal');
    if (d.paint) w.paint(p.pos, d.paint, hit.normal);
    if (p.bounce <= 0) return false;
    return true;
  }

  // 6 Beam Lancer — charge 0.9 s, 2x zoom, W5 piercing full charge
  BEH.lancer = {
    update(w, dt, ctx, firing) {
      remember(w, ctx);
      const st = w.st, owner = w.owner;
      w.recover -= dt;
      w.chargeVis = w.charging ? w.charge : Math.max(0, w.chargeVis - dt * 3);
      const inkCostTap = w.def.ink || 4;
      if (firing && !w.charging && w.recover <= 0) {
        if (w.canAfford(1, inkCostTap)) { w.charging = true; w.charge = 0; }
        else if (w.pressed) w._empty();
      }
      if (w.charging) {
        let rate = 1 / st.chargeTime;
        if (w.inkMode() && owner.ink < (w.def.inkMax || 18)) rate *= 0.33;
        const before = w.charge;
        w.charge = Math.min(1, w.charge + dt * rate);
        if (before < 1 && w.charge >= 1) audio(w, 'ui', { pitch: 1.8, vol: 0.6 });
        if (owner.isPlayer && w.holdT > 0.12) { w.zoomF = 1 + (st.zoom - 1) * U.smoothstep(0.05, 0.45, w.charge); w.unzoomT = 0; }
        w._loop('charge', { pitch: 0.7 + w.charge * 1.1, vol: 0.7 });
        chargeFx(w, ctx, dt, before);
        // laser sight (telegraph for bots, aim aid for players)
        const s = sysFor(w.world);
        const sight = s.ribbon(w._sk || (w._sk = 'w' + w._uid() + 'sight'), 2, 0x8C7BFF, 0.01, 0.5);
        sight.taper = false; sight.width = 0.012 + w.charge * 0.016; sight.setOpacity(0.25 + w.charge * 0.5);
        const h = w.world.hitscan(ctx.eye, ctx.eyeDir, st.range, owner);
        sight.pts[0].copy(ctx.origin); sight.pts[1].copy(h ? h.point : _a.copy(ctx.eye).addScaledVector(ctx.eyeDir, st.range));
        sight.draw(2);
        const botRelease = w.isBot && w.charge >= (owner.botCharge || 1);
        if (!firing || botRelease) BEH.lancer.fire(w, ctx);
      }
    },
    fire(w, ctx) {
      const st = w.st, world = w.world, owner = w.owner, k = w.charge;
      const s = sysFor(world); const sight = s.ribbons.get(w._sk); if (sight) sight.hide();
      w.charging = false; w._stopLoop();
      if (owner.isPlayer && w.zoomF > 1) w.unzoomT = 0.15;
      const inkCost = lerp(w.def.ink || 4, w.def.inkMax || 18, k);
      if (!w.spend(1, inkCost)) { w.charge = 0; return; }
      const dmg = lerp(st.dmg, st.dmgMax, k);
      coneDir(_dir, ctx.eyeDir, k < 0.15 ? st.tapSpread : 0);
      const pierce = st.max && k >= 0.99 ? 3 : 1;
      const hits = []; const off = [];
      let last = null;
      for (let i = 0; i < pierce; i++) {
        last = world.hitscan(ctx.eye, _dir, st.range, owner);
        if (!last || !last.actor) break;
        hits.push(last); last.actor.targetable = false; off.push(last.actor);
      }
      for (const a of off) a.targetable = true;
      for (const h of hits) w.hit(h.actor, dmg, { kind: 'impact', crit: h.crit, pos: h.point, dir: _dir.clone(), type: 'beam' });
      const end = last ? last.point : _a.copy(ctx.eye).addScaledVector(_dir, st.range).clone();
      const col = st.glow, fx = world.fx;
      // beam: a wide coloured streak that lingers and a white-hot core that snaps toward the target
      fx.tracer(ctx.origin, end, G.FX.mixHex ? G.FX.mixHex(w.def.color, col, 0.35) : col, 0.07 + 0.16 * k, 0.24 + 0.1 * k, _lzA);
      fx.tracer(ctx.origin, end, 0xffffff, 0.025 + 0.05 * k, 0.16, _lzB);
      fx.flash(end, col, 0.8 + k * 1.6, 0.16);
      _lzS.dir = last && last.normal ? last.normal : null; _lzS.scale = 0.9 + k * 0.6;
      fx.sparks(end, col, 6 + Math.round(k * 10), _lzS);
      if (k > 0.95) {
        fx.ring(end, 1.2, col, 0.3);
        if (fx.shock) { fx.shock(end, 1.4, col, 0.26, 0.85); if (!owner.isPlayer) fx.shock(ctx.origin, 0.35, col, 0.16, 0.8); }
        if (owner.isPlayer && hits.length) G.time.hitStop(0.055);
      }
      if (hits.length && fx.sparkle) for (const h of hits) if (h.crit) fx.sparkle(h.point, 0xffe066, 3, 0.4);
      // turf paint line
      if (w.inkMode() || (world.rules && world.rules.paint)) {
        const lt = w.def.lineTap || [0.35, 12], lf = w.def.lineFull || [0.5, 25];
        const r = lerp(lt[0], lf[0], k), L = Math.min(lerp(lt[1], lf[1], k), last ? last.t : st.range);
        for (let t = 1; t < L; t += r * 1.5) w.paintGround(ctx.eye.x + _dir.x * t, ctx.eye.y + _dir.y * t, ctx.eye.z + _dir.z * t, r);
      }
      audio(w, k > 0.95 ? 'chargeShot' : 'laser', { vol: 0.6 + 0.4 * k });
      w.fired(0.4 + k);
      w.recover = st.recoverT;
      w.chargeVis = k; w.charge = 0;
    },
  };

  const _lzA = { retract: 0.25, over: 0.45 }, _lzB = { retract: 0.6, over: 0 }, _lzS = { dir: null, scale: 1, life: 0.32 };
  // Charge-up: a glow at the muzzle that swells (and flickers when full) for bots, sparks drawn in
  // toward the muzzle at a rate that rises with charge for everyone, and a ping when it tops out.
  function chargeFx(w, ctx, dt, before) {
    const fx = w.world.fx, k = w.charge, o = w.owner, m = ctx.origin, col = w.st.glow;
    if (!fx || !fx.quads) return;
    const full = k >= 1;
    if (!o.isPlayer) fx.glow(m, col, 0.3 + k * 0.9 + (full ? Math.sin(w.world.time * 40) * 0.08 : 0), 0.5 + 0.4 * k);
    w._chg = (w._chg || 0) + dt * (6 + 26 * k) * fx.q;
    const R = o.isPlayer ? 0.16 : 0.5;
    while (w._chg >= 1) {
      w._chg -= 1;
      _e.set(U.rand(-1, 1), U.rand(-1, 1), U.rand(-1, 1)).normalize();
      const r = R * U.rand(0.7, 1.2), life = 0.16;
      fx.add.add(m.x + _e.x * r, m.y + _e.y * r, m.z + _e.z * r, -_e.x * r / life, -_e.y * r / life, -_e.z * r / life, Math.random() < 0.4 ? 0xffffff : col, (o.isPlayer ? 0.012 : 0.04) * (1 + k), life, 0, 0, 0.9, 1, 4, col, 0.5);
    }
    if (before < 1 && full) {
      if (fx.shock) fx.shock(m, o.isPlayer ? 0.05 : 0.6, col, 0.2, o.isPlayer ? 0.6 : 0.9);
      if (!o.isPlayer && fx.sparkle) fx.sparkle(m, col, 3, 0.35);
    }
  }

  // 7 Gale Gatling — spin-up, tightening spread, move slow, W5 every 10th round blasts
  BEH.gatling = {
    update(w, dt, ctx, firing) {
      remember(w, ctx);
      const st = w.st;
      const can = firing && w.canAfford(1, w.def.ink);
      if (firing && w.pressed && !can) w._empty();
      if (can) w.spin = Math.min(1, w.spin + dt / st.spinUp); else w.spin = Math.max(0, w.spin - dt / st.spinDown);
      if (can && w.spin >= 1) {
        w.fireHold += dt;
        w.spreadNow = lerp(st.spread, st.spreadMin, clamp(w.fireHold / (st.tighten || 2), 0, 1));
        autoFire(w, true, BEH.gatling.shoot, ctx);
      } else { w.fireHold = 0; w.spreadNow = st.spread; if (w.cd < 0) w.cd = 0; }
      if (w.spin > 0.02) w._loop('engine', { pitch: 0.45 + w.spin * 0.9, vol: 0.35 + w.spin * 0.3 }); else w._stopLoop();
      // hot barrels: smoke wisps curl off the muzzle after a long burst and keep going a moment
      w.smokeK = clamp((w.smokeK || 0) + dt * (can && w.spin >= 1 ? 0.6 : -0.45), 0, 1);
      if (w.smokeK > 0.35) barrelSmoke(w, ctx, dt, (w.smokeK - 0.35) / 0.65);
      return firing || w.spin > 0.3 ? st.moveMult : 1;
    },
    shoot(w, ctx) {
      if (!w.spend(1, w.def.ink)) return false;
      const st = w.st;
      coneDir(_dir, ctx.dir, w.spreadNow);
      const blast = st.max && (w.shots % 10) === 9;
      w.proj(ctx, _dir, { speed: st.speed, life: st.rangeMax / st.speed, radius: 0.09, kind: 'bolt', size: blast ? 0.08 : 0.045, color: blast ? 0xFFD45C : st.glow, onHit: shotHit,
        data: { w, dmg: st.dmg, speed: st.speed, color: blast ? 0xFFD45C : 0x9FDcff, blast, paint: st.paint } });
      audio(w, 'needle', { vol: 0.7 });
      w.fired();
      return true;
    },
  };

  // Soft wisps rising from the muzzle (gatling after long bursts, an overheated Fizz Blaster).
  function barrelSmoke(w, ctx, dt, k) {
    const fx = w.world.fx; if (!fx || !fx.norm) return;
    w._smk = (w._smk || 0) + dt * (4 + 10 * k) * fx.q;
    if (w._smk < 1) return;
    w._smk -= 1;
    const m = ctx.origin, pl = w.owner.isPlayer;
    fx.norm.add(m.x + U.rand(-0.02, 0.02), m.y, m.z + U.rand(-0.02, 0.02), U.rand(-0.15, 0.15) + ctx.dir.x * 0.3, U.rand(0.35, 0.6), U.rand(-0.15, 0.15) + ctx.dir.z * 0.3,
      0xf2f0f8, (pl ? 0.05 : 0.18) * (0.8 + 0.4 * k), U.rand(0.6, 0.9), -0.5, 1.6, 0.28 + 0.2 * k, 5, 1, 0xffffff, 0, U.rand(-1.2, 1.2));
  }

  // 8/15 Lock-on launchers (Confetti Swarm, Prism Party Cannon)
  const LOCK_IDS = ['wlock0', 'wlock1', 'wlock2', 'wlock3', 'wlock4', 'wlock5', 'wlock6', 'wlock7'];
  const LOCK_ICON = '<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="10" cy="10" r="6" fill="none" stroke="#1e1a4d" stroke-width="3"/><circle cx="10" cy="10" r="2.2" fill="#1e1a4d"/></svg>';
  function findLock(w, ctx, cone, range) {
    const world = w.world, team = w.owner.team;
    let best = null, ba = cone, dup = null, da = cone;
    for (const a of world.actors) {
      if (!isAutoFoe(a, team)) continue;
      a.aimPoint(_a); _b.copy(_a).sub(ctx.eye); const d = _b.length();
      if (d > range || d < 0.5) continue;
      const ang = Math.acos(clamp(_b.dot(ctx.eyeDir) / d, -1, 1)) - Math.atan2(a.r, d) * 0.5;
      if (ang > cone) continue;
      if (!world.phys.los(ctx.eye, _a, false)) continue;
      if (w.locks.indexOf(a) < 0) { if (ang < ba) { ba = ang; best = a; } }
      else if (ang < da) { da = ang; dup = a; }
    }
    return best || dup;
  }
  function lockUpdate(w, dt, ctx, firing, P) {
    remember(w, ctx);
    const st = w.st;
    // launch queue (staggered)
    if (w.queue.length) {
      w.qT -= dt;
      while (w.qT <= 0 && w.queue.length) { const q = w.queue.shift(); P.launch(w, ctx, q); w.qT += P.gap; }
    }
    for (let i = w.locks.length - 1; i >= 0; i--) if (!w.locks[i].alive) w.locks.splice(i, 1);
    if (w.isBot) {
      if (firing && w.cd <= 0 && !w.queue.length) {
        if (!w.canAfford(1, w.def.ink)) { w._empty(); return; }
        w.locks.length = 0; if (ctx.target && ctx.target.alive) w.locks.push(ctx.target);
        P.volley(w, ctx); w.cd = 1 / st.rate;
      }
      return;
    }
    if (firing && w.cd <= 0 && !w.queue.length) {
      if (!w.canAfford(1, w.def.ink)) { if (w.pressed) w._empty(); }
      else {
        w.locking = true; w.lockT += dt;
        if (w.locks.length < P.max && w.lockT >= st.lockTime) {
          const t = findLock(w, ctx, st.lockCone, st.lockRange);
          if (t) { w.locks.push(t); w.lockT = 0; audio(w, 'ui', { pitch: 1.2 + w.locks.length * 0.18, vol: 0.7 }); }
        }
      }
    }
    // markers
    if (G.HUD && G.HUD.marker) {
      for (let i = 0; i < 8; i++) {
        const a = w.locking ? w.locks[i] : null;
        if (a) { a.aimPoint(_a); _a.y += a.h * 0.35 + 0.3; G.HUD.marker(LOCK_IDS[i], _a, { icon: LOCK_ICON, color: P.markColor, dist: false, edge: false, label: '' }); }
        else if (w._mk & (1 << i)) G.HUD.removeMarker(LOCK_IDS[i]);
        if (a) w._mk |= (1 << i); else w._mk &= ~(1 << i);
      }
    }
    if (w.released && w.locking) {
      w.locking = false; w.lockT = 0;
      P.volley(w, ctx);
      w.cd = 1 / st.rate;
      if (G.HUD && G.HUD.removeMarker) for (let i = 0; i < 8; i++) G.HUD.removeMarker(LOCK_IDS[i]);
      w._mk = 0;
    }
    if (!firing && !w.released) { w.locking = false; w.lockT = 0; }
  }
  function rocketTick(p, dt, world) {
    const d = p.data, w = d.w;
    if (p.life <= 0) { rocketBurst(p, world, null); return; }
    // accelerate
    const sp = Math.min(d.vmax, d.v0 + p.age * d.acc);
    if (d.spiral && d.axis && p.age < (d.aim ? 0.24 : 0.5)) p.vel.applyAxisAngle(d.axis, d.spiral * dt * (d.aim ? 1 - p.age / 0.24 : 1));
    let t = d.target;
    if (t && (!t.alive || t.hidden)) t = d.target = null;
    // No lock: fly to the point under the crosshair (after a short launch flair), firmly enough to land on it
    // from 3 m out; once there (or past it) the rocket may re-seek like before.
    const aiming = !t && d.aim && !d.aimDone;
    if (aiming && p.age > d.aimDelay) {
      _a.copy(d.aim).sub(p.pos); const dist = _a.length();
      if (dist < 0.9 || _a.dot(p.vel) <= 0) d.aimDone = true;
      else { _a.divideScalar(dist); steer(p.vel, _a, Math.min(14, 5 + p.age * 30) * dt); }
    }
    if (!t && !aiming && p.age > 0.25 && (G.time.frame + d.seed) % 6 === 0) {
      // re-seek a foe roughly ahead
      _a.copy(p.vel).normalize();
      let best = null, bs = -1;
      for (const a of world.actors) {
        if (!isAutoFoe(a, w.owner.team)) continue;
        a.aimPoint(_b); _c.copy(_b).sub(p.pos); const dd = _c.length(); if (dd > 30) continue;
        const sc = _c.dot(_a) / dd - dd / 60; if (sc > bs && _c.dot(_a) > 0) { bs = sc; best = a; }
      }
      d.target = t = best;
    }
    if (t && p.age > d.delay) { t.aimPoint(_a); _a.sub(p.pos).normalize(); steer(p.vel, _a, d.turn * dt); }
    p.vel.setLength(sp);
    // confetti / rainbow sparkle trail + a puffy smoke line
    const fx = world.fx, q = fx.q;
    if (Math.random() < 48 * dt * q) fx.add.add(p.pos.x, p.pos.y, p.pos.z, U.rand(-0.5, 0.5), U.rand(-0.5, 0.5), U.rand(-0.5, 0.5), d.prism ? hsl(world.time * 0.6 + d.seed * 0.13, 0.9, 0.62) : U.pick(CONFETTI), 0.18, 0.4, 1, 1, 0.9, 0, 0, 0xffffff, 0.3);
    d.smk = (d.smk || 0) + dt * 30 * q;
    if (d.smk >= 1 && fx.norm) { d.smk -= 1; fx.norm.add(p.pos.x, p.pos.y, p.pos.z, U.rand(-0.3, 0.3), U.rand(0, 0.4), U.rand(-0.3, 0.3), 0xf4f1fb, U.rand(0.16, 0.24), U.rand(0.45, 0.7), -0.4, 2.5, 0.5, 5, 1, 0xffffff, 0, U.rand(-1, 1)); }
    // prism W5: drop bomblets along the trail
    if (d.drops > 0 && p.age > d.nextDrop) { d.nextDrop += 0.11; d.drops--; dropBomblet(w, p.pos, 12 * w.st.dmgMult, 0.55); }
  }
  function rocketHit(p, hit, world) { rocketBurst(p, world, hit.actor || null); return false; }
  function rocketBurst(p, world, direct) {
    const d = p.data, w = d.w; if (d.done) return; d.done = true; p.life = 0;
    if (direct) {
      const crit = critAt(direct, p);
      w.hit(direct, d.dmg, { kind: 'impact', crit, pos: p.pos.clone(), dir: p.vel.clone().normalize() });
    }
    splash(w, p.pos, d.aoe, d.aoeDmg, { style: d.prism ? 'confetti' : 'boom', color: d.color, inner: 0.3, paint: d.paint });
    if (d.split) for (let i = 0; i < 3; i++) dropBomblet(w, p.pos, 10 * w.st.dmgMult, 0.35 + i * 0.1, true);
  }
  function dropBomblet(w, pos, dmg, fuse, scatter) {
    const s = sysFor(w.world);
    if (s.bomblets.length > 40) return;
    const v = scatter ? _a.set(U.rand(-4, 4), U.rand(3, 6), U.rand(-4, 4)) : _a.set(U.rand(-1, 1), -1, U.rand(-1, 1));
    const p = w.world.projectiles.spawn({ pos, vel: v, gravity: 14, life: fuse + 0.6, radius: 0.1, kind: 'orb', size: 0.07, color: U.pick(RAINBOW), src: w.owner, team: w.owner.team, weapon: w.id, noActors: true, trail: false, stick: true,
      onHit: () => true, data: {} });
    s.bomblets.push({ p, t: fuse, w, dmg });
  }
  function updateBomblets(s, dt) {
    for (let i = s.bomblets.length - 1; i >= 0; i--) {
      const b = s.bomblets[i]; b.t -= dt;
      if (b.t <= 0) { splash(b.w, b.p.pos, 1.5, b.dmg, { style: 'pop', color: b.p.color, inner: 0.3, noSplit: true }); b.p.life = 0; s.bomblets.splice(i, 1); }
    }
  }
  function launchRocket(w, ctx, q, P) {
    const st = w.st;
    if (!q.paid && !w.spend(1, w.def.ink)) return;
    _dir.copy(q.dir || ctx.dir);
    const tgt = q.target && q.target.alive ? q.target : null;
    if (!q.dir) {
      // launch flair: pops up and a little sideways out of the tube (smaller without a lock, where the rocket
      // has to come back onto the crosshair line within a few metres)
      _a.crossVectors(_dir, UP).normalize();
      if (tgt) _dir.applyAxisAngle(_a, U.rand(0.1, 0.35)).applyAxisAngle(UP, U.rand(-0.35, 0.35)).normalize();
      else _dir.applyAxisAngle(_a, U.rand(0.05, 0.14)).applyAxisAngle(UP, U.rand(-0.12, 0.12)).normalize();
    }
    const aim = !tgt && ctx.aimPoint && w.owner.isPlayer ? ctx.aimPoint.clone() : null;
    const col = P.prism ? RAINBOW[(q.i || 0) % RAINBOW.length] : U.pick([0xFF5FA2, 0xFFD45C, 0x3FD0FF, 0x8CE05A]);
    w.proj(ctx, _dir.clone(), { speed: st.speed0, life: 4, radius: 0.15, kind: 'rocket', size: 0.11, color: col, onHit: rocketHit, onTick: rocketTick, trail: false, ribbon: true,
      data: { w, target: tgt, dmg: st.dmg, aoeDmg: st.aoeDmg, aoe: st.aoe, color: col, v0: st.speed0, vmax: st.speed, acc: (st.speed - st.speed0) / 0.6, turn: st.turn * DEG,
        delay: q.spiral ? 0.5 : 0.12, spiral: q.spiral || 0, axis: q.axis || null, prism: !!P.prism, seed: U.randInt(0, 99), split: !P.prism && st.max, drops: P.prism && st.max ? 6 : 0, nextDrop: 0.15, paint: w.def.paint,
        aim, aimDelay: q.spiral ? 0.07 : 0.05, aimDone: false } });
    audio(w, P.prism ? 'missile' : 'rocket', { vol: 0.6 });
    w.fired(P.prism ? 0.35 : 1);
  }
  BEH.swarm = {
    P: null,
    update(w, dt, ctx, firing) { lockUpdate(w, dt, ctx, firing, SWARM_P(w)); },
  };
  function SWARM_P(w) {
    return w._P || (w._P = {
      max: 4, gap: 0.08, markColor: '#FFD45C',
      launch: (ww, ctx, q) => launchRocket(ww, ctx, q, ww._P),
      volley: (ww, ctx) => {
        ww._P.max = ww.st.locks;
        if (ww.locks.length) { for (const t of ww.locks) ww.queue.push({ target: t }); }
        else {
          // tap: one rocket at the nearest target in the cone (Brawl-style)
          const t = findLock(ww, ctx, ww.st.lockCone, ww.st.lockRange) || (ctx.target && ctx.target.alive ? ctx.target : null);
          ww.queue.push({ target: t });
        }
        ww.locks.length = 0; ww.qT = 0;
      },
    });
  }
  BEH.prism = {
    update(w, dt, ctx, firing) {
      const P = PRISM_P(w);
      lockUpdate(w, dt, ctx, firing, P);
      w.spin = w.queue.length ? Math.min(1, w.spin + dt * 4) : Math.max(0, w.spin - dt);
      return 1;
    },
  };
  function PRISM_P(w) {
    return w._P || (w._P = {
      max: 8, gap: 0.06, markColor: '#FF8FD0', prism: true,
      launch: (ww, ctx, q) => launchRocket(ww, ctx, q, ww._P),
      volley: (ww, ctx) => {
        if (!ww.spend(1, ww.def.ink)) return;
        const n = ww.st.rockets;
        if (ww.locks.length) {
          for (let i = 0; i < n; i++) ww.queue.push({ target: ww.locks[i % ww.locks.length], paid: true, i });
        } else {
          // spiral volley forward
          const base = ctx.dir.clone();
          _a.crossVectors(base, UP).normalize(); _b.crossVectors(_a, base).normalize();
          for (let i = 0; i < n; i++) {
            const ang = i / n * Math.PI * 2;
            // a ring of rockets that twists out and closes back onto the crosshair point (was 0.22 rad = 12° off)
            const dir = base.clone().addScaledVector(_a, Math.cos(ang) * 0.14).addScaledVector(_b, Math.sin(ang) * 0.14).normalize();
            ww.queue.push({ dir, axis: base, spiral: 7, paid: true, i });
          }
        }
        ww.locks.length = 0; ww.qT = 0;
        audio(ww, 'craft', { vol: 0.8 });
        if (ww.owner.isPlayer) audio(ww, 'levelup', { vol: 0.35, pitch: 1.2 });
      },
    });
  }

  // 9 Buddy Hive — deploy orbiting helper bots
  BEH.buddy = {
    update(w, dt, ctx, firing) {
      remember(w, ctx);
      const st = w.st, s = sysFor(w.world);
      let mine = 0; for (const b of s.buddies) if (b.owner === w.owner) mine++;
      const want = w.isBot ? (firing && mine < st.count) : w.pressed;
      if (want && w.cd <= 0) {
        if (!w.spend(1, w.def.ink)) return;
        for (let i = 0; i < st.count; i++) spawnBuddy(s, w, ctx, i);
        // cap active buddies per owner (oldest pop first)
        let n = 0; for (const b of s.buddies) if (b.owner === w.owner) n++;
        for (let i = 0; i < s.buddies.length && n > st.maxActive; i++) { const b = s.buddies[i]; if (b.owner === w.owner) { popBuddy(s, b); i--; n--; } }
        w.cd = 1 / st.rate;
        audio(w, 'npc', { pitch: 1.6, vol: 0.9 });
        audio(w, 'teleport', { pitch: 1.6, vol: 0.4 });
        w.fired();
      }
    },
  };
  function spawnBuddy(s, w, ctx, i) {
    const g = new THREE.Group(); g.scale.setScalar(0.85);
    const body = new THREE.Mesh(buddyGeo(), G.M.vc({ spec: 0.7 }));
    const eye = new THREE.Mesh(buddyEyeGeo(), G.M.toon(0x5CFFE1, { emissive: 0x5CFFE1, ei: 0.9 }));
    g.add(body, eye);
    g.position.copy(ctx.origin);
    s.world.scene.add(g);
    const b = { owner: w.owner, w, mesh: g, pos: g.position, vel: ctx.dir.clone().multiplyScalar(9).add(_a.set(U.rand(-2, 2), 3, U.rand(-2, 2))),
      ang: Math.random() * Math.PI * 2, life: w.st.life, cd: 0.4 + i * 0.15, idx: i, t: 0, target: null, seekT: 0, bob: Math.random() * 6 };
    s.buddies.push(b);
    s.world.fx.burst(ctx.origin, [0xFFB627, 0xFFF3A0, 0xffffff], 10, 4, 0.15, 0.4, { grav: 4 });
    if (s.world.fx.sparkle) s.world.fx.sparkle(ctx.origin, 0xFFE08A, 2, 0.3);
  }
  function popBuddy(s, b) {
    const i = s.buddies.indexOf(b); if (i >= 0) s.buddies.splice(i, 1);
    s.world.scene.remove(b.mesh);
    s.world.fx.burst(b.pos, [0xFFB627, 0xFFF3A0, 0xffffff], 14, 4, 0.18, 0.5, { grav: 6 });
    s.world.fx.ring(b.pos, 0.8, 0xFFE08A, 0.3);
  }
  function updateBuddies(s, dt) {
    const world = s.world;
    for (let i = s.buddies.length - 1; i >= 0; i--) {
      const b = s.buddies[i], o = b.owner;
      b.t += dt; b.life -= dt; b.cd -= dt; b.seekT -= dt;
      if (b.life <= 0 || !o || (o.dead && !o.isPlayer) || world.actors.indexOf(o) < 0) { popBuddy(s, b); continue; }
      let n = 0, k = 0; for (const x of s.buddies) { if (x.owner !== o) continue; if (x === b) k = n; n++; }
      const a = world.time * 1.4 + k * (Math.PI * 2 / Math.max(1, n));
      const orb = o.isPlayer ? 2.3 : 1.7, hy = o.isPlayer ? 2.6 : 2.1;
      _a.set(o.pos.x + Math.cos(a) * orb, o.pos.y + hy + Math.sin(world.time * 2.2 + b.bob) * 0.15, o.pos.z + Math.sin(a) * orb);
      if (b.t < 0.5) { b.vel.y -= 9 * dt; b.pos.addScaledVector(b.vel, dt); b.pos.lerp(_a, 1 - Math.exp(-dt * 2 * b.t * 4)); }
      else b.pos.lerp(_a, 1 - Math.exp(-dt * 6));
      if (b.seekT <= 0) { b.seekT = 0.25; b.target = nearestFoe(world, b.pos, b.w.st.range, o.team, null, true); }
      if (b.target && (!b.target.alive)) b.target = null;
      if (b.target && b.cd <= 0) {
        b.cd = 1 / b.w.st.buddyRate;
        b.target.aimPoint(_b); _dir.copy(_b).sub(b.pos).normalize(); coneDir(_dir2, _dir, b.w.st.spread * DEG);
        world.projectiles.spawn({ pos: b.pos, dir: _dir2, speed: b.w.st.speed, life: 0.5, radius: 0.08, kind: 'orb', size: 0.045, color: 0xFFF3A0, src: o, team: o.team, weapon: b.w.id,
          onHit: shotHit, data: { w: b.w, dmg: b.w.st.dmg, speed: b.w.st.speed, color: 0xFFE08A, summon: true, chain: b.w.st.max } });
        if (G.Audio) G.Audio.sfxAt('blaster', b.pos, { vol: 0.35, pitch: 1.9 });
        if (world.fx.pop) world.fx.pop(b.pos, 0xFFF3A0, 0.45, 0.1, 0.8);
        b.kick = 1;
      }
      b.kick = Math.max(0, (b.kick || 0) - dt * 6);
      // blink before expiring
      b.mesh.visible = b.life > 2 || Math.sin(b.life * 18) > -0.3;
    }
  }
  function placeBuddy(b, t) {
    const m = b.mesh;
    if (b.target) { b.target.aimPoint(_a); m.rotation.y = Math.atan2(_a.x - b.pos.x, _a.z - b.pos.z); }
    else m.rotation.y += 0.02;
    m.rotation.z = Math.sin(t * 3 + b.bob) * 0.12;
    const s = 0.85 * (1 + (b.kick || 0) * 0.12); m.scale.set(s, 0.72 / s, s);
  }

  // 10 Groove Globe / 11 Bloom Bomb
  BEH.groove = {
    update(w, dt, ctx, firing) { throwUpdate(w, dt, ctx, firing, BEH.groove.launch, { pitch: 10, maxT: 2, radius: w.st.aoe, color: 0xB983FF }); },
    launch(w, ctx) {
      if (!w.spend(1)) return;
      const st = w.st; throwVel(w, ctx, st.speed, 10, _dir2);
      w.proj(ctx, _dir2.clone().normalize(), { speed: st.speed, gravity: st.gravity, life: 3, radius: 0.18, kind: 'grenade', size: 0.15, color: 0xC8A0FF,
        onHit: grooveLand, onTick: (p, dt, wo) => { if (p.life <= 0) grooveLand(p, { actor: null, point: p.pos, normal: UP }, wo); }, data: { w } });
      audio(w, 'grenade', { pitch: 1.2 });
      w.fired();
    },
  };
  function grooveLand(p, hit, world) {
    const d = p.data; if (d.done) return false; d.done = true;
    const w = d.w, st = w.st;
    const gy = world.phys.groundAt(p.pos.x, p.pos.z, 0.2, p.pos.y + 0.5);
    const pos = new V3(p.pos.x, gy, p.pos.z);
    const s = sysFor(world);
    // disco ball: flat-shaded icosahedron with per-face colours (own geometry so faces can flicker)
    const geo = new THREE.IcosahedronGeometry(0.45, 1);
    const n = geo.attributes.position.count; const col = new Float32Array(n * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const ball = new THREE.Mesh(geo, G.M.toon(0xffffff, { vc: true, flat: true, spec: 0.9, emissive: 0x6a3fb0, ei: 0.35, rimStr: 0.6 }));
    const beams = new THREE.Mesh(coneBeamGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const glow = G.R.glowSprite(0xD8B0FF, 2.4, 0.7);
    const grp = new THREE.Group(); grp.add(ball, beams, glow); grp.position.set(pos.x, pos.y + 1.5, pos.z); grp.scale.setScalar(0.01);
    const ring = new THREE.Mesh(thinRingGeo, new THREE.MeshBasicMaterial({ color: 0xB983FF, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    ring.position.set(pos.x, pos.y + 0.06, pos.z); ring.renderOrder = 3;
    const edge = new THREE.Mesh(thinRingGeo, new THREE.MeshBasicMaterial({ color: 0xE6D4FF, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    edge.position.copy(ring.position); edge.scale.setScalar(st.aoe);
    world.scene.add(grp, ring, edge);
    s.globes.push({ w, pos, grp, ball, beams, geo, ring, edge, t: 0, dur: st.dur, beatT: 0, flickT: 0, bosses: new Set(), r: st.aoe });
    world.fx.ring(pos, st.aoe, 0xB983FF, 0.5, pos.y + 0.1);
    world.fx.burst(_a.set(pos.x, pos.y + 1, pos.z), RAINBOW, 20, 5, 0.2, 0.6, { grav: 4 });
    if (G.Audio) G.Audio.sfxAt('bounce', pos, { pitch: 1.3 });
    return false;
  }
  function updateGlobes(s, dt) {
    const world = s.world;
    for (let i = s.globes.length - 1; i >= 0; i--) {
      const g = s.globes[i]; g.t += dt;
      const k = g.t / g.dur;
      const sc = Math.min(1, g.t * 4) * (k > 0.95 ? Math.max(0.01, (1 - k) * 20) : 1);
      g.grp.scale.setScalar(sc);
      g.grp.position.y = g.pos.y + 1.5 + Math.sin(g.t * Math.PI * 2) * 0.12;
      g.ball.rotation.y += dt * 2.2; g.beams.rotation.y -= dt * 1.3;
      g.flickT -= dt;
      if (g.flickT <= 0) {
        g.flickT = 0.12;
        const c = g.geo.attributes.color, arr = c.array;
        for (let f = 0; f < arr.length / 9; f++) {
          const hx = Math.random() < 0.55 ? (g.w.st.max ? 0xFFD45C : 0xE6ECFF) : U.pick(RAINBOW);
          _col.setHex(hx);
          for (let v = 0; v < 3; v++) { arr[f * 9 + v * 3] = _col.r; arr[f * 9 + v * 3 + 1] = _col.g; arr[f * 9 + v * 3 + 2] = _col.b; }
        }
        c.needsUpdate = true;
      }
      g.beatT -= dt;
      if (g.beatT <= 0) {
        g.beatT += 0.5; // 120 BPM
        g.ring.material.color.setHex(U.pick(RAINBOW));
        if (G.Audio) G.Audio.sfxAt('groove', g.pos);
      }
      const bk = 1 - g.beatT / 0.5;
      g.ring.scale.setScalar(Math.max(0.01, g.r * (0.25 + 0.75 * bk)));
      g.ring.material.opacity = 0.85 * (1 - bk) * sc;
      g.edge.material.opacity = 0.3 * sc + Math.sin(g.t * Math.PI * 4) * 0.08;
      for (const a of world.actors) {
        if (!isAutoFoe(a, g.w.owner.team)) continue;
        const dx = a.pos.x - g.pos.x, dz = a.pos.z - g.pos.z;
        if (dx * dx + dz * dz > g.r * g.r || Math.abs(a.pos.y - g.pos.y) > 6) continue;
        if (a.isBoss) { if (!g.bosses.has(a)) { g.bosses.add(a); a.stunT = Math.max(a.stunT || 0, g.w.st.bossDance); const x = s.status(a); x.groove = Math.max(x.groove, 0.2); if (g.w.owner.isPlayer) G.bus.emit('dance', a, g.w.owner); } continue; }
        const x = s.status(a);
        if (x.groove <= 0 && !a.isPlayer && g.w.owner.isPlayer) G.bus.emit('dance', a, g.w.owner);
        x.groove = Math.max(x.groove, 0.3);
      }
      if (g.t >= g.dur) {
        if (g.w.st.max) splash(g.w, _a.set(g.pos.x, g.pos.y + 1, g.pos.z), 6, 80 * g.w.st.dmgMult, { style: 'confetti', color: 0xB983FF, inner: 0.3 });
        else { world.fx.confetti(_a.set(g.pos.x, g.pos.y + 1.4, g.pos.z), 30); world.fx.smoke(_a, 4); }
        world.scene.remove(g.grp, g.ring, g.edge); g.geo.dispose(); g.beams.material.dispose(); g.ring.material.dispose(); g.edge.material.dispose();
        s.globes.splice(i, 1);
      }
    }
  }
  BEH.bloom = {
    update(w, dt, ctx, firing) { throwUpdate(w, dt, ctx, firing, BEH.bloom.launch, { pitch: 10, maxT: 2, radius: w.st.aoe, color: 0x8CE05A }); },
    launch(w, ctx) {
      if (!w.spend(1)) return;
      const st = w.st; throwVel(w, ctx, st.speed, 10, _dir2);
      w.proj(ctx, _dir2.clone().normalize(), { speed: st.speed, gravity: st.gravity, life: 3, radius: 0.16, kind: 'grenade', size: 0.13, color: 0x8CE05A,
        onHit: bloomBurst, onTick: (p, dt, wo) => { if (p.life <= 0) bloomBurst(p, { actor: null, point: p.pos, normal: UP }, wo); }, data: { w } });
      audio(w, 'grenade', { pitch: 1.5 });
      w.fired();
    },
  };
  function bloomBurst(p, hit, world) {
    const d = p.data; if (d.done) return false; d.done = true;
    const w = d.w, st = w.st, s = sysFor(world), pos = p.pos.clone();
    world.fx.sphereFlash(pos, st.aoe * 0.7, 0x8CE05A, 0.3);
    world.fx.ring(pos, st.aoe, 0xFF7A93, 0.5);
    world.fx.burst(pos, [0xFF7A93, 0xFFD45C, 0x6CCB5F, 0xffffff, 0xFFB3C8], 34, 6, 0.24, 0.9, { grav: 3, normal: true });
    if (G.Audio) { G.Audio.sfxAt('bounce', pos, { pitch: 1.6 }); G.Audio.sfxAt('splat', pos, { pitch: 1.4, vol: 0.6 }); }
    for (const a of world.actors) {
      if (!isAutoFoe(a, w.owner.team)) continue;
      a.aimPoint(_a); if (_a.distanceTo(pos) - a.r > st.aoe) continue;
      if (a.isBoss) { a.stunT = Math.max(a.stunT || 0, 0.5); world.fx.smoke(_a, 6, 0xEFFFF0); continue; }
      if (a.isPlayer) continue;
      const x = s.status(a);
      x.plant = a.elite ? st.dur * 0.5 : st.dur;
      x.plantDps = st.max ? 8 * st.dmgMult : 0; x.plantW = w;
    }
    return false;
  }

  // 12 Chill Mister — cone ticks, slow, freeze accumulation
  BEH.chill = {
    update(w, dt, ctx, firing) {
      remember(w, ctx);
      const st = w.st, world = w.world;
      const active = firing && w.canAfford(1, w.def.ink);
      if (!active) {
        if (firing && w.pressed) w._empty();
        w.tickT = 0; w.frost = Math.max(0, w.frost - dt * 0.6);
        if (w.beamOn) { w.beamOn = false; w._stopLoop(); }
        return;
      }
      w.beamOn = true; w.frost = Math.min(1, w.frost + dt * 0.5);
      // mist particles (~300/s at full quality, accumulated so the cloud is as dense at 30 or 120 fps)
      const q = world.fx.q;
      w._mistAcc = (w._mistAcc || 0) + dt * 300 * q;
      const n = Math.min(12, Math.floor(w._mistAcc)); w._mistAcc -= n;
      const sp = st.range / 0.7;
      // The player's cloud blooms from 3 m out along the eye cone (the damage cone) and only drifts away, so
      // nothing opaque sits over the crosshair; bots keep the full cloud from their nozzle.
      const pl = w.owner.isPlayer, src = pl ? ctx.eye : ctx.origin, axis = pl ? ctx.eyeDir : ctx.dir;
      for (let i = 0; i < n; i++) {
        // player: a hollow cone (puffs 55–100% of the way out to the rim) so the robot under the crosshair stays
        // visible through the middle of the cloud
        if (pl) hollowConeDir(_dir, axis, st.cone * 0.85, 0.55); else coneDir(_dir, axis, st.cone * 0.85);
        _b.copy(src).addScaledVector(_dir, pl ? U.rand(3, 3.8) : U.rand(0.3, 1.2));
        world.fx.spawn(_b, _a.copy(_dir).multiplyScalar(sp * U.rand(pl ? 0.35 : 0.5, pl ? 0.8 : 1)), U.pick(MIST_C), U.rand(0.2, 0.36), U.rand(0.5, 0.75), pl ? _mistP : _mist);
      }
      // a thin, faint frosty jet links the nozzle to the cloud (small puffs, low alpha, gone within ~2 m)
      if (pl) {
        w._jetAcc = (w._jetAcc || 0) + dt * 70 * q;
        for (let j = Math.min(4, Math.floor(w._jetAcc)); j > 0; j--) {
          w._jetAcc -= 1;
          _b.copy(ctx.origin).addScaledVector(ctx.dir, U.rand(0.05, 0.6));
          world.fx.spawn(_b, _a.copy(ctx.dir).multiplyScalar(sp * U.rand(0.25, 0.45)), U.pick(MIST_C), U.rand(0.03, 0.055), U.rand(0.14, 0.22), _jet);
        }
      }
      if (Math.random() < 36 * dt * q) world.fx.spawn(_b.copy(src).addScaledVector(axis, U.rand(pl ? 3.2 : 2, st.range * 0.85)), _a.set(U.rand(-0.5, 0.5), U.rand(-0.2, 0.6), U.rand(-0.5, 0.5)), 0xffffff, U.rand(0.12, 0.2), 0.6, _snow);
      w.tickT -= dt;
      let guard = 0;
      while (w.tickT <= 0 && guard++ < 3) {
        w.tickT += 1 / st.rate;
        if (!w.spend(1, w.def.ink)) break;
        chillTick(w, ctx);
        w.fired(0.5);
      }
      w._loop('whoosh', { pitch: 2.4, vol: 0.7 });
    },
  };
  const _snow = { grav: 0.5, drag: 1, shape: 'star', curve: 'pop', spin: 2, hot: 0.3 };
  // frosty mist: soft puffs that swell as they slow (reads as a cloud, not as bubbles)
  const MIST_C = [0xffffff, 0xDDF8FF, 0xA8ECFF], _mist = { drag: 1.6, grav: -0.3, alpha: 0.38, normal: true, shape: 'puff', curve: 'grow', end: 0xffffff, spin: 1 };
  const _jet = { drag: 2.5, grav: -0.2, alpha: 0.26, normal: true, shape: 'puff', curve: 'shrink' };
  const _mistP = Object.assign({}, _mist, { alpha: 0.3 });   // the player's own cloud: a little lighter
  function chillTick(w, ctx) {
    const st = w.st, world = w.world, s = sysFor(world);
    for (const a of world.actors) {
      if (!isFoe(a, w.owner.team)) continue;
      a.aimPoint(_a); _b.copy(_a).sub(ctx.eye); const dd = _b.length();
      if (dd - a.r > st.range) continue;
      const c = _b.dot(ctx.eyeDir) / (dd || 1);
      if (c < Math.cos(st.cone + Math.atan2(a.r, Math.max(dd, 0.5)))) continue;
      if (!world.phys.los(ctx.eye, _a, false)) continue;
      w.hit(a, st.dmg, { kind: 'beam', type: 'cold', pos: _a.clone(), dir: ctx.eyeDir.clone() });
      if (!a.alive || a.noAssist) continue;
      const x = s.status(a);
      x.chillT = 0.35; x.chillK = a.isBoss ? 0.75 : 1 - st.slow;
      if (!a.isBoss && !a.isPlayer && x.frozenT <= 0) {
        x.expo += 1 / st.rate; x.expoLast = world.time;
        if (x.expo >= st.freezeAt) { x.expo = 0; x.frozenT = st.freezeT; if (w.owner.isPlayer) G.bus.emit('freeze', a, w.owner); }
      }
    }
    if (w.inkMode() || (world.rules && world.rules.paint)) {
      for (let t = 1.2; t <= st.range; t += 1.6) w.paintGround(ctx.eye.x + ctx.eyeDir.x * t, ctx.eye.y + ctx.eyeDir.y * t, ctx.eye.z + ctx.eyeDir.z * t, w.def.paint || 0.5);
    }
  }

  // 13 Goo Splatter — goo with droop, puddles
  BEH.splat = {
    update(w, dt, ctx, firing) { remember(w, ctx); autoFire(w, firing, BEH.splat.shoot, ctx); },
    shoot(w, ctx) {
      if (!w.spend(1, w.def.ink)) return false;
      const st = w.st, col = w.gooColor();
      const n = st.max ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const o = n > 1 ? _p1.copy(ctx.origin).add(_a.set(0, 0, 0).addScaledVector(_b.crossVectors(ctx.dir, UP).normalize(), i ? 0.05 : -0.05)) : ctx.origin;
        // the goo droops (gravity 6): launch on the ballistic arc that lands on the crosshair point (within its
        // reach), then add the spray. Player only: bots (G.Bot) already pitch up for the arc and their aimPoint
        // lies along that raised line, so solving it again aims above the target (~1 m over at full reach) and
        // shifts the bots' tuned hit rate (measured 18 m: 50% → 93% of goo on the player).
        if (ctx.aimPoint && w.owner.isPlayer) ballisticDir(_dir2, o, ctx.aimPoint, st.speed, st.gravity || 0, st.speed * st.life, ctx.dir); else _dir2.copy(ctx.dir);
        coneDir(_dir, _dir2, st.spread * (w.pressed ? 0.5 : 1));
        w.proj(ctx, _dir.clone(), { pos: o.clone(), speed: st.speed, gravity: st.gravity, life: st.life, radius: 0.11, kind: 'ink', size: 0.085, color: col, onHit: shotHit, onTick: shotTick,
          data: { w, dmg: n > 1 ? st.dmg * 0.6 : st.dmg, speed: st.speed, color: col, goo: true, puddle: st.puddle, paint: st.paint, drop: st.drop, dropEvery: st.dropEvery, nextDrop: st.dropEvery || 0 } });
      }
      audio(w, 'ink', { vol: 0.7 });
      w.fired();
      return true;
    },
  };

  // 14 Wide Roller — hold to roll (contact damage + strip paint), tap to flick a 5-blob fan
  BEH.roller = {
    update(w, dt, ctx, firing) {
      remember(w, ctx);
      const st = w.st, world = w.world, o = w.owner;
      w.flickT += dt;
      if (w.isBot) {
        // bots: roll when the target is close, otherwise flick
        const t = ctx.target; const close = t && t.alive && t.pos.distanceTo(o.pos) < 3;
        if (firing && close) w.rolling = true; else { w.rolling = false; if (firing && w.cd <= 0) BEH.roller.flick(w, ctx); }
      } else {
        if (firing && w.holdT >= 0.18 && !w.rolling && w.canAfford(0.1, 0.5)) w.rolling = true;
        if (w.released) { if (!w.rolling && w.holdT < 0.18 && w.cd <= 0) BEH.roller.flick(w, ctx); w.rolling = false; }
        if (!firing) w.rolling = false;
      }
      const hs = Math.hypot(o.vel.x, o.vel.z);
      w.drum += hs * dt / 0.08 * (w.rolling ? 1 : 0.15);
      if (!w.rolling) { w._stopLoop(); return 1; }
      if (!w.spend(st.rollCost * dt, (w.def.rollInk || 6) * dt)) { w.rolling = false; return 1; }
      // contact damage in a strip in front
      let fx = ctx.eyeDir.x, fz = ctx.eyeDir.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
      const rx = -fz, rz = fx, half = st.strip / 2;
      for (const a of world.actors) {
        if (!isFoe(a, o.team)) continue;
        const dx = a.pos.x - o.pos.x, dz = a.pos.z - o.pos.z;
        const f = dx * fx + dz * fz, r = dx * rx + dz * rz;
        if (f < -0.2 || f > 1.3 + a.r || Math.abs(r) > half + a.r || Math.abs(a.pos.y - o.pos.y) > 1.6) continue;
        const last = w.rollHits.get(a.id);
        if (last != null && world.time - last < st.rollCd) continue;
        w.rollHits.set(a.id, world.time);
        const t1 = !a.isBoss && tierOf(a) <= 1;
        const side = r >= 0 ? 1 : -1;
        w.hit(a, st.dmg, { kind: 'impact', type: 'roll', pos: a.pos.clone(), dir: new V3(rx * side + fx * 0.4, 0, rz * side + fz * 0.4), knock: t1 ? 7 : 2.5 });
        if (t1) stagger(a, 0.4);
        world.fx.burst(_a.set(a.pos.x, a.pos.y + 0.5, a.pos.z), [w.gooColor(), 0xffffff], 10, 4, 0.18, 0.45, { grav: 10, normal: true });
      }
      if (w.rollHits.size > 64) w.rollHits.clear();
      // paint strip / goo trail
      w.paintT -= dt; w.rollDist += hs * dt;
      const paintMode = !!(world.rules && world.rules.paint);
      if (paintMode) { if (w.paintT <= 0) { w.paintT = 0.08; w.paintGround(o.pos.x + fx * 0.9, o.pos.y + 0.3, o.pos.z + fz * 0.9, half); } }
      else if (w.rollDist > 0.9 && o.grounded !== false) {
        w.rollDist = 0;
        _a.set(o.pos.x + fx * 0.9, world.phys.groundAt(o.pos.x + fx * 0.9, o.pos.z + fz * 0.9, 0.1, o.pos.y + 0.5), o.pos.z + fz * 0.9);
        world.fx.decal(_a, UP, w.gooColor(), half * 1.05, 0.85);
      }
      if (Math.random() < hs * dt * 1.5) world.fx.spawn(_a.set(o.pos.x + fx * 0.9 + rx * U.rand(-half, half), o.pos.y + 0.1, o.pos.z + fz * 0.9 + rz * U.rand(-half, half)), _b.set(U.rand(-1, 1), U.rand(1.5, 3), U.rand(-1, 1)), w.gooColor(), 0.12, 0.4, { normal: true, grav: 9 });
      w._loop('swim', { pitch: 0.8 + hs * 0.08, vol: 0.6 });
      w.fireT = 0.2;
      const base = (G.PLAYER_BASE ? (o.sprinting ? G.PLAYER_BASE.sprint : G.PLAYER_BASE.walk) : 6.2);
      return clamp(st.rollSpeed / base, 0.3, 1);
    },
    flick(w, ctx) {
      const st = w.st;
      if (!w.spend(st.flickCost, w.def.ink || 8)) return;
      const col = w.gooColor();
      const sp = st.speed * Math.sqrt(st.flickRange);
      for (let i = 0; i < st.blobs; i++) {
        const yaw = lerp(-st.fan / 2, st.fan / 2, i / (st.blobs - 1));
        _dir.copy(ctx.dir).applyAxisAngle(UP, yaw); _dir.y += 0.08; _dir.normalize();
        w.proj(ctx, _dir.clone(), { speed: sp, gravity: st.gravity, life: 0.75 * st.flickRange, radius: 0.16, kind: 'ink', size: 0.13, color: col, onHit: shotHit,
          data: { w, dmg: st.flickMax, flick: [st.flickMax, st.flickMin], speed: sp, color: col, goo: true, puddle: 0.7, paint: w.def.paint || 0 } });
      }
      w.cd = 1 / st.rate; w.flickT = 0;
      audio(w, 'inkHeavy');
      w.fired();
    },
  };

  // ------------------------------------------------------------------ gadgets
  const GDEFS = {
    scan: { id: 'scan', cooldown: 20, radius: 25, dur: 4, color: 0x39D5FF },
    dome: { id: 'dome', cooldown: 30, radius: 4, hp: 600, dur: 7, push: 4, color: 0x9FE8FF },
    grapple: { id: 'grapple', cooldown: 0.5, range: 20, cone: 30, speed: 18, color: 0x39D5FF },
  };
  for (const id in GDEFS) { GDEFS[id].nameKey = 'gad.' + id + '.name'; GDEFS[id].descKey = 'gad.' + id + '.desc'; }

  const SCAN_ICON = '<svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 3l2.2 4.6 5 .7-3.6 3.5.9 5L10 14.4 5.5 16.8l.9-5L2.8 8.3l5-.7z" fill="#1e1a4d"/></svg>';
  function useScan(ctx, d) {
    const world = ctx.world, o = ctx.owner, s = sysFor(world);
    const c = _a.set(o.pos.x, o.pos.y + 1, o.pos.z);
    world.fx.ring(c, d.radius, d.color, 0.9, o.pos.y + 0.15);
    world.fx.ring(c, d.radius * 0.6, 0xffffff, 0.7, o.pos.y + 0.6);
    world.fx.sphereFlash(c, 2.2, d.color, 0.4);
    if (G.Audio) { G.Audio.sfx('ring', { pitch: 0.9 }); G.Audio.sfx('teleport', { vol: 0.5, pitch: 1.4 }); }
    let n = 0;
    for (const a of world.actors) {
      if (!a.alive || a.team === o.team || !a.targetable || a.isDome) continue;
      if (a.pos.distanceTo(o.pos) > d.radius) continue;
      const x = s.status(a); x.scan = d.dur; n++;
      if (o.isPlayer && n <= 16) s.scans.push({ a, t: d.dur, id: 'wscan' + a.id });
    }
    // parts / specials on the ground glow too
    if (o.isPlayer && world.pickups && world.pickups.items) {
      let m = 0;
      for (const it of world.pickups.items) {
        if ((it.type !== 'part' && it.type !== 'special') || m >= 6) continue;
        if (it.pos.distanceTo(o.pos) > d.radius) continue;
        s.scans.push({ item: it, t: d.dur, id: 'wscanp' + (m++) });
      }
    }
    return true;
  }
  function updateScans(s, dt) {
    for (let i = s.scans.length - 1; i >= 0; i--) {
      const m = s.scans[i]; m.t -= dt;
      const gone = m.t <= 0 || (m.a && (!m.a.alive || m.a.dead)) || (m.item && s.world.pickups.items.indexOf(m.item) < 0);
      if (gone) { if (G.HUD) G.HUD.removeMarker(m.id); s.scans.splice(i, 1); continue; }
      if (!G.HUD || !G.HUD.marker) continue;
      if (m.a) { m.a.aimPoint(_a); _a.y += m.a.h * 0.5 + 0.2; G.HUD.marker(m.id, _a, { icon: SCAN_ICON, color: '#39D5FF', dist: false, edge: false }); }
      else { _a.copy(m.item.pos); _a.y += 0.5; G.HUD.marker(m.id, _a, { icon: '✦', color: '#FFD23F', dist: false, edge: false }); }
    }
  }

  // Bubble Dome materials (the shell is per dome: it flashes and fades on its own)
  const DOME_SHELL = { transparent: true, opacity: 0.2, rimStr: 1.4, rimPow: 2.2, rimColor: 0xE8FDFF, spec: 0.9, side: THREE.DoubleSide, emissive: 0x39D5FF, ei: 0.08 };
  const domeRingMat = () => new THREE.MeshBasicMaterial({ color: 0x39D5FF, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const domeInnerMat = () => new THREE.MeshBasicMaterial({ color: 0x39D5FF, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false });
  class DomeActor extends G.Actor {
    constructor(world, owner, center, d) {
      super(world, { r: d.radius, h: d.radius * 1.2, team: owner.team, hp: d.hp, kind: 'dome' });
      this.owner = owner; this.d = d; this.center = center.clone(); this.life = d.dur; this.t = 0;
      this.pos.set(center.x, center.y - d.radius * 0.6, center.z);
      this.isDome = true; this.noXP = true; this.immovable = true; this.mmColor = '#9FE8FF';
      const g = new THREE.Group();
      this.mat = G.M.toonUnique(0x9FE8FF, DOME_SHELL);
      this.shell = new THREE.Mesh(sphereGeo, this.mat); this.shell.renderOrder = 8;
      this.ringM = new THREE.Mesh(ringGeo, domeRingMat());
      this.ringM.position.y = 0.06;
      this.inner = new THREE.Mesh(sphereGeo, domeInnerMat());
      g.add(this.shell, this.inner, this.ringM);
      g.position.copy(this.center);
      this.mesh = g; this.shell.scale.setScalar(0.01);
      this.flash = 0;
    }
    aimPoint(out) { return (out || new V3()).set(this.center.x, this.center.y + 1, this.center.z); }
    update(dt) {
      this.t += dt; this.life -= dt;
      const r = this.d.radius, world = this.world;
      const grow = Math.min(1, this.t / 0.25), wob = 1 + Math.sin(this.t * 7) * 0.012;
      this.shell.scale.set(r * grow * wob, r * grow / wob, r * grow * wob);
      this.inner.scale.copy(this.shell.scale).multiplyScalar(0.99);
      this.inner.material.opacity = (0.08 + this.flash * 0.15) * (this.life < 1.5 ? (Math.sin(this.life * 20) > 0 ? 1 : 0.4) : 1);
      if (Math.random() < dt * 6) { const a = Math.random() * Math.PI * 2, el = Math.random() * 1.2; world.fx.spawn(_a.set(this.center.x + Math.cos(a) * Math.cos(el) * r, this.center.y + Math.sin(el) * r, this.center.z + Math.sin(a) * Math.cos(el) * r), _b.set(0, 0.6, 0), 0xE8FDFF, 0.18, 0.7, { grav: -0.3 }); }
      this.ringM.scale.setScalar(r * grow);
      this.flash = Math.max(0, this.flash - dt * 4);
      const blink = this.life < 1.5 ? (Math.sin(this.life * 20) > 0 ? 1 : 0.4) : 1;
      this.mat.opacityU = (0.18 + this.flash * 0.3) * blink;
      this.mat.emissive.setRGB(0.04 + this.flash * 0.5, 0.2 + this.flash * 0.5, 0.25 + this.flash * 0.5);
      // push foes out
      for (const a of world.actors) {
        if (!a.alive || a.team === this.team || a.isDome || a.immovable || a.isBoss) continue;
        const dx = a.pos.x - this.center.x, dz = a.pos.z - this.center.z, dd = Math.hypot(dx, dz);
        if (dd > r + a.r || Math.abs(a.pos.y - this.center.y) > r) continue;
        const nx = dd > 1e-3 ? dx / dd : 1, nz = dd > 1e-3 ? dz / dd : 0;
        a.pos.x += nx * this.d.push * dt; a.pos.z += nz * this.d.push * dt;
        if (a.vel) { const vn = a.vel.x * nx + a.vel.z * nz; if (vn < 0) { a.vel.x -= nx * vn; a.vel.z -= nz * vn; } }
      }
      // destroy foe projectiles entering the bubble
      const list = world.projectiles.list;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (p.team === this.team || p.life <= 0) continue;
        if (p.pos.distanceToSquared(this.center) > r * r) continue;
        const dmg = (p.dmg || 0) + (p.aoe > 0 ? (p.aoeDmg || 0) * 0.5 : 0);
        p.life = -1; p.onTick = null; p.onHit = null; p.aoe = 0; p.fuse = false; p.dmg = 0;
        world.fx.sparks(p.pos, 0x9FE8FF, 8);
        world.fx.flash(p.pos, 0xE8FDFF, 0.8, 0.12);
        if (dmg > 0) world.damage(this, dmg, { src: p.src, type: 'proj', pos: p.pos.clone() });
        this.flash = 1;
      }
      if (this.life <= 0 && this.alive) { this.alive = false; this.onDeath({}); }
    }
    onHurt() { this.flash = 1; if (G.Audio) G.Audio.sfxAt('hurtShield', this.center, { vol: 0.4, pitch: 1.4 }); }
    onDeath() {
      this.dead = true; this.alive = false;
      const w = this.world;
      w.fx.sphereFlash(this.center, this.d.radius * 1.1, 0x9FE8FF, 0.3);
      w.fx.burst(_a.copy(this.center).add(_b.set(0, 1.5, 0)), [0xE8FDFF, 0x9FE8FF, 0xffffff], 30, 7, 0.22, 0.6, { grav: 4 });
      if (G.Audio) G.Audio.sfxAt('shieldBreak', this.center, { vol: 0.6, pitch: 1.3 });
      const s = SYS.get(w); if (s) { const i = s.domes.indexOf(this); if (i >= 0) s.domes.splice(i, 1); }
    }
    dispose() { if (this.mesh) this.world.scene.remove(this.mesh); if (this.mat) this.mat.dispose(); if (this.ringM) this.ringM.material.dispose(); if (this.inner) this.inner.material.dispose(); }
  }
  function useDome(ctx, d) {
    const world = ctx.world, o = ctx.owner, s = sysFor(world);
    for (const old of s.domes.slice()) if (old.owner === o && old.alive) { old.alive = false; old.onDeath({}); }
    const gy = world.phys.groundAt(o.pos.x, o.pos.z, 0.2, o.pos.y + 0.5);
    const dome = new DomeActor(world, o, _a.set(o.pos.x, gy, o.pos.z), d);
    world.addActor(dome);
    s.domes.push(dome);
    world.fx.ring(dome.center, d.radius * 1.2, 0x9FE8FF, 0.5, gy + 0.1);
    if (G.Audio) G.Audio.sfxAt('shieldBubble', dome.center);
    return true;
  }
  function updateDomes(s) { for (let i = s.domes.length - 1; i >= 0; i--) if (s.domes[i].dead) s.domes.splice(i, 1); }
  // The first dome of a mode load must not compile its shell program mid-fight (a transparent double-sided toon variant
  // nothing else in a scene uses): when the profile's equipped gadget is the Bubble Dome, every new world parks a hidden
  // stand-in of its three meshes, so the load warm-up compiles them. Programs are keyed by their parameters, so the
  // real dome (a per-dome copy of the same shell) finds them ready. Not in modes without the ranger's gadget.
  const DOME_SKIP = { title: 1, race: 1, turf: 1, royale: 1 };
  function prewarmDome(world) {
    if (!world || !world.scene || (G.Game && DOME_SKIP[G.Game.modeId])) return;
    const prof = G.Save && G.Save.prof;
    const gid = G.Data && G.Data.gadget ? G.Data.gadget(prof) : (prof && prof.loadout && prof.loadout.gadget);
    if (gid !== 'dome' && !(prof && prof.loadout && prof.loadout.gadget === 'dome')) return;
    const g = new THREE.Group(); g.name = 'domePrewarm'; g.visible = false; g.position.set(0, -400, 0);
    g.add(new THREE.Mesh(sphereGeo, G.M.toon(0x9FE8FF, DOME_SHELL)), new THREE.Mesh(sphereGeo, domeInnerMat()), new THREE.Mesh(ringGeo, domeRingMat()));
    world.scene.add(g);
  }
  if (G.World && Array.isArray(G.World.created)) G.World.created.push(w => G.safe('dome prewarm', () => prewarmDome(w)));

  function anchorInRange(owner, eye, dir) {
    const world = owner.world; const list = world && world.grappleAnchors;
    if (!list || !list.length) return null;
    const d = GDEFS.grapple;
    if (!eye) { eye = _e.set(owner.pos.x, owner.pos.y + 1.6, owner.pos.z); }
    if (!dir) dir = owner.forward ? owner.forward(_f) : _f.set(0, 0, -1);
    let best = null, ba = d.cone * DEG;
    for (const an of list) {
      if (!an || !an.pos || an.enabled === false) continue;
      _c.copy(an.pos).sub(eye); const dd = _c.length();
      if (dd > d.range || dd < 1) continue;
      const ang = Math.acos(clamp(_c.dot(dir) / dd, -1, 1));
      if (ang < ba && world.phys.los(eye, an.pos, false)) { ba = ang; best = an; }
    }
    return best;
  }
  function useGrapple(ctx, d) {
    const o = ctx.owner, world = ctx.world;
    const an = anchorInRange(o, ctx.eye, ctx.eyeDir);
    if (!an) return false;
    const s = sysFor(world);
    for (let i = s.grapples.length - 1; i >= 0; i--) if (s.grapples[i].owner === o) endGrapple(s, i);
    const rib = new Ribbon(world.scene, 14, d.color, 0.07, 0.95);
    s.grapples.push({ owner: o, anchor: an, t: 0, rib });
    o.grounded = false;
    if (G.Audio) G.Audio.sfx('teleport', { pitch: 0.8, vol: 0.7 });
    world.fx.flash(an.pos, 0x9FF6FF, 1.6, 0.25);
    return true;
  }
  function endGrapple(s, i) {
    const g = s.grapples[i]; s.grapples.splice(i, 1);
    s.world.scene.remove(g.rib.mesh); g.rib.geo.dispose(); g.rib.mat.dispose();
  }
  function updateGrapples(s, dt) {
    for (let i = s.grapples.length - 1; i >= 0; i--) {
      const g = s.grapples[i], o = g.owner;
      g.t += dt;
      _a.set(o.pos.x, o.pos.y + 1.0, o.pos.z);
      _b.copy(g.anchor.pos).sub(_a); const dist = _b.length();
      if (dist < 1.3 || g.t > 2.5 || !o.alive) {
        if (o.alive && o.vel) { o.vel.y = Math.max(o.vel.y, 5); }
        if (o.jumps != null) o.jumps = Math.min(o.jumps, 1);
        endGrapple(s, i); continue;
      }
      _b.divideScalar(dist);
      const sp = GDEFS.grapple.speed;
      o.vel.lerp(_c.copy(_b).multiplyScalar(sp), 1 - Math.exp(-10 * dt));
      const PB = G.PLAYER_BASE || {};
      o.vel.y += ((o.vel.y > 0 ? PB.gravUp : PB.gravDown) || PB.gravity || 22) * dt;
      o.grounded = false;
      if (o.jumps != null) o.jumps = Math.min(o.jumps, 1);
      // ribbon from the hand to the anchor with a little wave
      const n = 14, t = s.world.time;
      _d.set(o.pos.x, o.pos.y + 1.3, o.pos.z);
      if (o.forward) { o.forward(_e); _d.addScaledVector(_e, 0.4); }
      for (let k = 0; k < n; k++) {
        const u = k / (n - 1);
        g.rib.pts[k].lerpVectors(_d, g.anchor.pos, u);
        g.rib.pts[k].y += Math.sin(u * Math.PI * 3 - t * 20) * 0.12 * (1 - u) * Math.min(1, g.t * 4);
      }
      g.rib.draw(n);
    }
  }
  function anchorMesh() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 24), G.M.toon(0x39D5FF, { emissive: 0x39D5FF, ei: 0.8, spec: 0.8 }));
    g.add(ring, G.R.glowSprite(0x9FF6FF, 2.2, 0.7));
    g.userData.tick = (t) => { ring.rotation.y = t * 1.5; ring.scale.setScalar(1 + Math.sin(t * 4) * 0.06); };
    return g;
  }

  // ------------------------------------------------------------------ public
  function create(id, level, mods, owner, opts) {
    opts = Object.assign({}, opts || {});
    if (typeof id === 'string' && id.indexOf('turf_') === 0) { id = id.slice(5); opts.turf = true; }
    if (!DEFS[id]) { console.error('[weapons] unknown weapon', id); return null; }
    if (!owner) owner = { isPlayer: false, team: 1, pos: new V3(), vel: new V3(), world: null };
    return new Weapon(id, level, mods, owner, opts);
  }
  // Ammo orb / crate helper: +cur of the current weapon's max, +other of every other weapon (GDD §5.1).
  function addAmmo(owner, cur, other) {
    if (!owner || !owner.weapons) return 0;
    let n = 0;
    owner.weapons.forEach((w, i) => { if (w && w.addAmmo) n += w.addAmmo(i === owner.wi ? cur : (other != null ? other : cur / 3)); });
    return n;
  }
  G.bus.on('weapon-levelup', (id, lvl) => {
    const pl = G.Game && G.Game.world && G.Game.world.player;
    if (pl && pl.weapons) for (const w of pl.weapons) if (w && w.id === id && w.setLevel && lvl > w.level) w.setLevel(lvl);
  });

  const W = G.Weapons = G.Weapons || {};
  Object.assign(W, {
    defs: DEFS, turfDefs: TURF_DEFS, ids: IDS, turfIds: Object.keys(TURF_DEFS), create, statsFor, levelForXP, XP_LEVELS, RARITY_MULT, addAmmo,
    Weapon, _sysFor: sysFor, _BEH: BEH, Ribbon, _shotHit: shotHit, ballisticDir,
  });
  if (!W.icon) W.icon = id => '';
  const GG = G.Gadgets = G.Gadgets || {};
  Object.assign(GG, {
    defs: GDEFS,
    use(id, ctx) {
      const d = GDEFS[id];
      if (!d || !ctx || !ctx.world || !ctx.owner || !ctx.owner.alive) return false;
      const fn = id === 'scan' ? useScan : id === 'dome' ? useDome : id === 'grapple' ? useGrapple : null;
      if (!fn) return false;
      return fn(ctx, d) !== false;
    },
    anchorInRange, anchorMesh, DomeActor,
  });
  if (!GG.icon) GG.icon = id => '';
})(window.G);

}).call(window); } catch (e) { console.error('[module 16_weapons.js]', e); }
// ---- 16b_weapons_vm.js
try { (function () {
// 16b_weapons_vm.js — first-person viewmodels (shared "Ranger Gauntlet" rig, GDD §2.7, + a procedural gun per
// weapon, §5.7) and bold inline-SVG icons for weapons and gadgets.
//   G.Weapons.VM.build(weapon) -> Object3D for G.R.vmRoot (cached per weapon id / MAX form / outline quality)
//   G.Weapons.VM.animate(weapon, dt)  internal part animation (called by Weapon.update)
//   G.Weapons.VM.applyPalette(pal?)   recolour the glove / cuff / sleeve of every cached viewmodel in place (vertex
//       colours of the rig's tagged ranges; the gauntlet's star badge and cuff band appear or collapse) — runs by itself
//       on the bus 'wardrobe' event and on build(). pal defaults to G.Wardrobe.palette() (the 3D ranger uses the same).
//   G.Weapons.icon(id) / G.Gadgets.icon(id) -> '<svg viewBox="0 0 48 48">…' (ink outline #1e1a4d)
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const W = G.Weapons = G.Weapons || {};
  const GG = G.Gadgets = G.Gadgets || {};

  // palette
  const TEAL = 0x2EC4B6, TEAL_D = 0x22A89B, CUFF = 0xFFD23F, SLEEVE = 0x1D8A80, NAVY = 0x1F2A5A, GOLD = 0xE8B44A, CREAM = 0xFFF1DC,
    WHITE = 0xF4F7FF, SILVER = 0xDDE6F0, MAXGOLD = 0xFFC21A;
  const CONF = [0xFF5FA2, 0x3FD0FF, 0x8CE05A, 0xFFD45C, 0xB983FF, 0xFF9F45];
  const RAIN = [0xFF5FA2, 0xFF9F45, 0xFFD45C, 0x8CE05A, 0x3FD0FF, 0x6C8BFF, 0xB983FF, 0xFF7AD9];

  // ------------------------------------------------------------------ geometry helpers
  const cyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg || 16);
  const cylZ = (rBack, rFront, h, seg) => cyl(rBack, rFront, h, seg).rotateX(PI / 2);   // +Y → +Z: radiusTop sits at the back
  const cylX = (r, h, seg) => cyl(r, r, h, seg).rotateZ(PI / 2);
  const sph = (r, ws, hs) => new THREE.SphereGeometry(r, ws || 14, hs || 10);
  const hemi = (r, ws) => new THREE.SphereGeometry(r, ws || 14, 8, 0, TAU, 0, PI / 2);
  const tor = (R, r, rs, ts, arc) => new THREE.TorusGeometry(R, r, rs || 8, ts || 22, arc || TAU);     // ring around Z
  const box = (w, h, d, r, seg) => (G.Geo && G.Geo.roundedBox && r) ? G.Geo.roundedBox(w, h, d, r, seg || 2) : new THREE.BoxGeometry(w, h, d);
  const cap = (r, l, seg) => new THREE.CapsuleGeometry(r, l, 4, seg || 14);
  const capZ = (r, l) => cap(r, l).rotateX(PI / 2);
  const cone = (r, h, seg) => new THREE.ConeGeometry(r, h, seg || 12);
  const coneZ = (r, h, seg) => cone(r, h, seg).rotateX(-PI / 2);                               // tip toward -Z
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 18);
  const latheZ = (pts, seg) => lathe(pts, seg).rotateX(-PI / 2);                                // profile +Y → -Z
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _v = new V3(), _s = new V3(), _col = new THREE.Color();
  const YAX = new V3(0, 1, 0);
  function place(g, p, r, s) {
    _eu.set(r ? r[0] || 0 : 0, r ? r[1] || 0 : 0, r ? r[2] || 0 : 0); _q.setFromEuler(_eu);
    if (s == null) _s.set(1, 1, 1); else if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
    _m.compose(_v.set(p ? p[0] : 0, p ? p[1] : 0, p ? p[2] : 0), _q, _s);
    return g.applyMatrix4(_m);
  }
  function between(g, a, b) { // geometry built along +Y with length |b-a| centred at origin → from a to b
    const d = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = d.length();
    _q.setFromUnitVectors(YAX, d.normalize());
    _m.compose(_v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(1, 1, 1));
    return g.applyMatrix4(_m);
  }
  function paint(g, hex) {
    if (g.index) g = g.toNonIndexed();
    if (g.attributes.uv) g.deleteAttribute('uv');
    const n = g.attributes.position.count, c = new Float32Array(n * 3); _col.setHex(hex);
    for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }
  function mergeGeos(list, roles) {
    let total = 0; for (const g of list) total += g.attributes.position.count;
    const P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3);
    let o = 0;
    const R = [];
    for (let i = 0; i < list.length; i++) {
      const g = list[i], n = g.attributes.position.count, role = roles ? roles[i] : null;
      if (!g.attributes.normal) g.computeVertexNormals();
      P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3);
      if (role) { const last = R[R.length - 1]; if (last && last.role === role && last.start + last.count === o) last.count += n; else R.push({ role, start: o, count: n }); }
      o += n;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    out.setAttribute('color', new THREE.BufferAttribute(C, 3));
    out.computeBoundingSphere();
    out.userData.shared = true;
    if (R.length) {
      // optional pieces (badge, band) keep their rest positions so they can collapse to a point and come back
      for (const r of R) if (OPTIONAL[r.role]) r.base = P.slice(r.start * 3, (r.start + r.count) * 3);
      out.userData.roles = R;
    }
    return out;
  }
  // Static parts collected with vertex colours and merged into one mesh. role(r) tags the following parts (glove, cuff,
  // sleeve...): the merged geometry keeps their vertex ranges in userData.roles so a palette can recolour them later.
  class Kit {
    constructor() { this.list = []; this.roles = []; this._role = null; }
    role(r) { this._role = r || null; return this; }
    push(g) { this.list.push(g); this.roles.push(this._role); return this; }
    add(g, hex, p, r, s) { return this.push(paint(place(g, p, r, s), hex)); }
    addM(g, hex, m) { return this.push(paint(g.applyMatrix4(m), hex)); }
    tube(a, b, r0, r1, hex, seg) { const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); return this.push(paint(between(cyl(r1, r0, len, seg || 10), a, b), hex)); }
    caps(a, b, r, hex, seg) { const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); return this.push(paint(between(cap(r, Math.max(0.001, len), seg), a, b), hex)); }
    geo() { return this.list.length ? mergeGeos(this.list, this.roles) : null; }
  }

  // ------------------------------------------------------------------ materials
  const MAT = {
    vc: () => G.M.vc({ spec: 0.6, rimStr: 0.38 }),
    toon: (c, o) => G.M.toon(c, Object.assign({ spec: 0.6 }, o || {})),
    glow: (c, ei) => G.M.toon(c, { emissive: c, ei: ei != null ? ei : 0.85, spec: 0.6 }),
    glowU: (c, ei) => G.M.toonUnique(c, { emissive: c, ei: ei != null ? ei : 0.85, spec: 0.6 }),
    glass: (c, op) => G.M.toon(c || 0xCFF3FF, { transparent: true, opacity: op || 0.32, spec: 0.95, rimStr: 1.0, rimColor: 0xffffff }),
  };
  let OUTLINE = null;
  function outlineMat() {
    if (OUTLINE) return OUTLINE;
    OUTLINE = new THREE.ShaderMaterial({
      uniforms: { uThick: { value: 0.0022 }, uColor: { value: new THREE.Color(0x2A1B3D) } },
      vertexShader: 'uniform float uThick;\nvoid main(){ vec3 p = position + normalize(normal) * uThick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 uColor;\nvoid main(){ gl_FragColor = vec4(uColor, 1.0);\n#include <colorspace_fragment>\n}',
      side: THREE.BackSide,
    });
    OUTLINE.userData.shared = true;
    return OUTLINE;
  }
  // Cartoon starburst texture for muzzle flashes.
  let STAR = null;
  function starTex() {
    if (STAR) return STAR;
    STAR = G.R.canvasTex(64, 64, (g, w, h) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 11 : 31; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
      g.closePath(); g.fill();
    });
    STAR.userData.shared = true;
    return STAR;
  }
  function sprite(color, size, tex, opacity) {
    const m = new THREE.SpriteMaterial({ map: tex || G.R.glowTex(), color, transparent: true, opacity: opacity != null ? opacity : 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false });
    const s = new THREE.Sprite(m); s.scale.setScalar(size); s.renderOrder = 20;
    return s;
  }

  // ------------------------------------------------------------------ builder context
  // Weapon root pose inside G.R.vmRoot (the player places vmRoot at ~(0.25,-0.25,-0.46) and adds bob/recoil).
  const POSE = { pos: [0.05, 0.065, -0.13], rot: [0.09, 0.72, 0.1] };
  function Builder(id, max, outline) {
    const root = new THREE.Group(); root.name = 'vm-' + id;
    const gun = new THREE.Group(); root.add(gun);
    root.position.set(POSE.pos[0], POSE.pos[1], POSE.pos[2]);
    root.rotation.set(POSE.rot[0], POSE.rot[1], POSE.rot[2]);
    const b = { id, max, outline, root, gun, k: new Kit(), P: {} };
    b.part = (g, mat, p, r, s, opts) => {
      opts = opts || {};
      const m = new THREE.Mesh(place(g, null, null, null), mat);
      if (p) m.position.set(p[0], p[1], p[2]);
      if (r) m.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
      if (s != null) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
      (opts.parent || gun).add(m);
      if (opts.outline && outline && !mat.transparent) addOutline(m);
      return m;
    };
    b.kitMesh = (kit, parent) => {
      const geo = kit.geo(); if (!geo) return null;
      const m = new THREE.Mesh(geo, MAT.vc()); (parent || gun).add(m);
      if (outline) addOutline(m);
      return m;
    };
    return b;
  }
  function addOutline(m) { const o = new THREE.Mesh(m.geometry, outlineMat()); o.renderOrder = -1; m.add(o); return o; }
  // Shared gloved hand on the grip (GDD §2.7): navy grip capsule, gold trigger guard, mitten, cuff, sleeve. The mitten /
  // cuff / sleeve take the equipped gauntlet + ranger palette (G.Wardrobe.palette(), the same colours as the 3D ranger's
  // mittens; default = Kiko's teal mitten with the yellow cuff). The gauntlet's star badge sits flush on the back of the
  // hand and a band rings the cuff; both collapse to a point when the equipped gloves have none.
  const OPTIONAL = { badge: 1, band: 1 };
  let STAR_G = null;
  function starGeo() {
    if (!STAR_G) {
      const sh = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, r = i % 2 ? 0.45 : 1; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      sh.closePath();
      STAR_G = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false, curveSegments: 1 });
    }
    return STAR_G.clone();
  }
  const _rq = new THREE.Quaternion(), _rz = new V3(0, 0, 1), _rd = new V3();
  function rig(k) {
    // grip (top leans forward like a pistol grip) + trigger guard
    k.role('grip').add(cap(0.026, 0.06, 10), NAVY, [0, -0.056, 0.012], [-0.3, 0, 0]);
    k.role(null).add(tor(0.024, 0.006, 6, 16, PI * 1.25), GOLD, [0, -0.018, -0.03], [0, PI / 2, -0.5]);
    // mitten: chunky palm around the grip, rolled fingers in front, short thumb on the gun's left flank
    k.role('glove').add(box(0.088, 0.084, 0.092, 0.038), TEAL, [0.006, -0.058, 0.016], [-0.3, 0, 0]);
    k.role('gloveDark').caps([-0.038, -0.058, -0.028], [0.044, -0.062, -0.028], 0.022, TEAL_D, 12);
    k.role('glove').caps([-0.045, -0.03, 0.014], [-0.048, -0.012, -0.02], 0.018, TEAL, 10);
    k.role(null).add(sph(0.012, 8, 6), 0xFFFFFF, [0.034, -0.03, 0.048], null, [1, 0.7, 1]);
    k.add(box(0.07, 0.012, 0.02, 0.006), 0xFFFFFF, [0.008, -0.03, 0.06], [-0.3, 0, 0]);
    // cuff + sleeve heading down-right out of view
    k.role('cuff').tube([0.02, -0.092, 0.072], [0.032, -0.118, 0.11], 0.05, 0.052, CUFF, 18);
    k.role('sleeve').caps([0.038, -0.134, 0.122], [0.11, -0.31, 0.34], 0.048, SLEEVE, 12);   // (mostly off-screen: fewer segments)
    k.role('cuff').tube([0.044, -0.146, 0.137], [0.05, -0.161, 0.157], 0.052, 0.052, CUFF, 18);
    // gauntlet star on the mitten's -X face (the side the eye sees under the gun), turned a little toward the eye
    k.role('badge').add(starGeo().translate(0, 0, -0.11), CUFF, [-0.0405, -0.062, 0.024], [-0.3, -1.26, 0], 0.018);
    // gauntlet band round the middle of the cuff
    _rd.set(0.012, -0.026, 0.038).normalize(); _rq.setFromUnitVectors(_rz, _rd);
    k.role('band').addM(tor(0.0535, 0.0058, 4, 22), GOLD, new THREE.Matrix4().compose(new V3(0.026, -0.105, 0.091), _rq, new V3(1, 1, 1)));
    k.role(null);
  }
  const DEF_PAL = { glove: TEAL, gloveDark: TEAL_D, cuff: CUFF, sleeve: SLEEVE, badge: null, band: null, gold: false, key: 'default' };
  function curPal() {
    const W = G.Wardrobe;
    if (!W || !W.palette) return DEF_PAL;
    let p = null;
    try { p = W.palette(); } catch (e) { p = null; }
    return p && p.glove != null ? p : DEF_PAL;
  }
  function roleHex(role, pal) {
    switch (role) {
      case 'glove': return pal.glove; case 'gloveDark': return pal.gloveDark != null ? pal.gloveDark : pal.glove;
      case 'cuff': return pal.cuff; case 'sleeve': return pal.sleeve; case 'badge': return pal.badge; case 'band': return pal.band;
      case 'grip': return pal.gold ? 0x3a2f6a : NAVY;
      default: return null;
    }
  }
  // Recolour one viewmodel's rig in place (each merged geometry once, even when an outline mesh shares it).
  function paintRig(root, pal) {
    root.traverse(o => {
      const g = o.isMesh && o.geometry, R = g && g.userData.roles;
      if (!R || g.userData.palKey === pal.key) return;
      g.userData.palKey = pal.key;
      const C = g.attributes.color.array, Pp = g.attributes.position.array;
      let moved = false;
      for (const r of R) {
        const hex = roleHex(r.role, pal), s0 = r.start * 3, s1 = (r.start + r.count) * 3;
        if (r.base) {
          const show = hex != null;
          if (show !== (r.shown !== false)) {   // collapse to the piece's first vertex, or restore it
            if (show) Pp.set(r.base, s0);
            else for (let i = s0; i < s1; i += 3) { Pp[i] = r.base[0]; Pp[i + 1] = r.base[1]; Pp[i + 2] = r.base[2]; }
            r.shown = show; moved = true;
          }
          if (!show) continue;
        }
        if (hex == null) continue;
        _col.setHex(hex);
        for (let i = s0; i < s1; i += 3) { C[i] = _col.r; C[i + 1] = _col.g; C[i + 2] = _col.b; }
      }
      g.attributes.color.needsUpdate = true;
      if (moved) g.attributes.position.needsUpdate = true;
    });
  }
  function maxBand(b, p, R, rot) { if (!b.max) return; b.part(tor(R, 0.0075, 6, 24), G.M.toon(MAXGOLD, { emissive: MAXGOLD, ei: 0.4, spec: 0.9 }), p, rot || null); }
  function finish(b, muzzle, color, anim, opts) {
    opts = opts || {};
    b.kitMesh(b.k);
    const flash = sprite(color, opts.flash || 0.11, starTex(), 1);
    const core = sprite(0xffffff, (opts.flash || 0.11) * 0.55, null, 1);
    flash.position.set(muzzle[0], muzzle[1], muzzle[2]); core.position.copy(flash.position);
    flash.visible = core.visible = false;
    b.gun.add(flash, core);
    let meshes = 0; b.root.traverse(o => { if (o.isMesh || o.isSprite) meshes++; });
    b.root.userData.vm = { pose: b.pose || null, id: b.id, P: b.P, anim, flash, core, gun: b.gun, root: b.root, flashSize: opts.flash || 0.11, noFlash: !!opts.noFlash, meshes, muzzle: new V3(muzzle[0], muzzle[1], muzzle[2]), base: b.root.position.clone() };
    return b.root;
  }
  const easeOut = k => 1 - (1 - k) * (1 - k);

  // ------------------------------------------------------------------ the 15 viewmodels
  const BUILD = {};

  BUILD.fizz = b => {
    const k = b.k; rig(k);
    k.add(capZ(0.045, 0.15), TEAL, [0, 0.035, -0.105]);
    k.add(sph(0.042, 14, 10), GOLD, [0, 0.035, -0.02], null, [1, 1, 0.5]);
    k.add(latheZ([[0.036, 0], [0.036, 0.03], [0.022, 0.06], [0.016, 0.085], [0.022, 0.092], [0.022, 0.104], [0.012, 0.106]]), 0xCFF3FF, [0, 0.035, -0.2]);
    k.add(box(0.012, 0.032, 0.07, 0.005), GOLD, [0, 0.085, -0.075]);
    k.add(box(0.03, 0.012, 0.03, 0.005), GOLD, [0, 0.077, -0.16]);
    k.add(tor(0.03, 0.006, 6, 16), GOLD, [-0.056, 0.05, -0.095], [0, PI / 2, 0]);
    const coil = MAT.glowU(0x4FD8FF, 0.9);
    b.P.coilMat = coil;
    b.part(tor(0.05, 0.011, 8, 24), coil, [0, 0.035, -0.06], null, null, { outline: true });
    b.part(tor(0.05, 0.011, 8, 24), coil, [0, 0.035, -0.135], null, null, { outline: true });
    b.P.vial = b.part(sph(0.027), MAT.glass(0x9FF6FF, 0.45), [-0.058, 0.05, -0.095]);
    const bub = MAT.glow(0x4FD8FF, 1.0);
    b.P.bubs = [b.part(sph(0.007, 8, 6), bub, [-0.058, 0.04, -0.09]), b.part(sph(0.005, 8, 6), bub, [-0.055, 0.05, -0.1])];
    if (b.max) {
      b.P.vial2 = b.part(sph(0.024), MAT.glass(0xFFD45C, 0.5), [0.056, 0.05, -0.1]);
      k.add(tor(0.027, 0.006, 6, 16), GOLD, [0.056, 0.05, -0.1], [0, PI / 2, 0]);
      k.add(box(0.008, 0.06, 0.05, 0.004), GOLD, [0, 0.105, -0.12], [0.6, 0, 0]);
      maxBand(b, [0, 0.035, -0.1], 0.047);
    }
    b.P.steam = sprite(0xffffff, 0.05, null, 0.6); b.P.steam.position.set(0, 0.06, -0.23); b.gun.add(b.P.steam);
    return finish(b, [0, 0.035, -0.32], 0x4FD8FF, (w, dt, P, S, t) => {
      const h = w.heat || 0;
      const c = h < 0.5 ? _col.setHex(0x4FD8FF).lerp(_col2.setHex(0xFF9F45), h * 2) : _col.setHex(0xFF9F45).lerp(_col2.setHex(0xFF5FA2), (h - 0.5) * 2);
      const fl = w.fireT < 0.08 ? 1 - w.fireT / 0.08 : 0;
      P.coilMat.color.copy(c); P.coilMat.emissive.copy(c).multiplyScalar(0.35 + fl * 0.7 + (w.locked > 0 ? Math.sin(t * 30) * 0.3 : 0));
      S.bt = (S.bt || 0) + dt * (1 + h * 2.5);
      for (let i = 0; i < P.bubs.length; i++) { const u = ((S.bt * (0.6 + i * 0.35) + i * 0.5) % 1); P.bubs[i].position.y = 0.032 + u * 0.035; P.bubs[i].scale.setScalar(0.6 + u); }
      // vent (reload sets coolT 0.4; ordinary shots only 0.25): a quick twist of the gun
      if ((w.coolT || 0) > 0.3 && !(S.pc > 0.3)) S.vent = 0.45;
      S.pc = w.coolT || 0;
      S.vent = Math.max(0, (S.vent || 0) - dt);
      const vk = S.vent > 0 ? 1 - S.vent / 0.45 : 1;
      b.gun.rotation.z = S.vent > 0 ? Math.sin(vk * PI) * 0.55 * (1 - vk * 0.3) : 0;
      b.gun.position.y = S.vent > 0 ? Math.sin(vk * PI) * 0.012 : 0;
      P.steam.visible = w.locked > 0 || h > 0.8 || S.vent > 0;
      if (P.steam.visible) { const u = (t * 2.5) % 1; P.steam.position.y = 0.06 + u * 0.06; P.steam.material.opacity = 0.5 * (1 - u); P.steam.scale.setScalar(0.04 + u * 0.06); }
    });
  };
  const _col2 = new THREE.Color();

  BUILD.scatter = b => {
    const k = b.k; rig(k);
    k.add(cylZ(0.07, 0.07, 0.15, 20), 0xFF6B6B, [0, 0.042, -0.09]);
    k.add(cylZ(0.074, 0.074, 0.02, 20), CREAM, [0, 0.042, -0.03]);
    k.add(cylZ(0.074, 0.074, 0.02, 20), CREAM, [0, 0.042, -0.15]);
    k.add(sph(0.068, 18, 10), 0xE85A5A, [0, 0.042, -0.015], null, [1, 1, 0.45]);
    k.add(hemi(0.046), CREAM, [0, 0.105, -0.085]);
    const pop = [[0, 0.15, -0.085], [0.02, 0.142, -0.07], [-0.022, 0.14, -0.09], [0.01, 0.14, -0.108], [-0.012, 0.148, -0.07]];
    pop.forEach((p, i) => k.add(sph(0.014 + (i % 2) * 0.003, 8, 6), i % 2 ? 0xFFE9A8 : 0xFFFFFF, p));
    const bk = new Kit();
    const bar = [[0, 0.03], [-0.03, -0.018], [0.03, -0.018]];
    if (b.max) bar.push([0, -0.0]);
    bar.forEach(([x, y], i) => {
      const r0 = i === 3 ? 0.012 : 0.016, r1 = i === 3 ? 0.02 : 0.028;
      bk.add(cylZ(r0, r1, 0.11, 14), CREAM, [x, y, 0]);
      bk.add(tor(r1 - 0.002, 0.005, 6, 16), 0xFF9F45, [x, y, -0.055]);
    });
    if (b.max) bk.add(tor(0.06, 0.008, 6, 24), SILVER, [0, 0.0, 0.045]);
    b.P.barrels = new THREE.Group(); b.P.barrels.position.set(0, 0.042, -0.21); b.gun.add(b.P.barrels);
    b.kitMesh(bk, b.P.barrels);
    maxBand(b, [0, 0.042, -0.09], 0.072);
    b.P.puffs = [0, 1, 2].map(() => { const s = sprite(0xFFF1DC, 0.03, null, 0.9); s.visible = false; b.gun.add(s); return s; });
    return finish(b, [0, 0.045, -0.29], 0xFF9F45, (w, dt, P, S, t) => {
      const k2 = w.fireT < 0.25 ? 1 - w.fireT / 0.25 : 0;
      P.barrels.position.z = -0.21 + easeOut(k2) * 0.025;
      // the barrel cluster revolves a third of a turn after every shot, like a pump-action cylinder
      if (S.cs !== w.shots) { if (S.cs !== undefined) S.cyc = (S.cyc || 0) + TAU / 3; S.cs = w.shots; }
      S.cycA = (S.cycA || 0) + ((S.cyc || 0) - (S.cycA || 0)) * (1 - Math.exp(-dt * 14));
      if (S.cyc > 60) { S.cyc -= TAU * 9; S.cycA -= TAU * 9; }
      P.barrels.rotation.z = S.cycA;
      for (let i = 0; i < 3; i++) {
        const s = P.puffs[i], u = w.fireT / 0.45;
        s.visible = u < 1;
        if (s.visible) { s.position.set((i - 1) * 0.02, 0.15 + u * 0.08, -0.085 + (i - 1) * 0.01); s.scale.setScalar(0.02 + u * 0.03); s.material.opacity = 0.9 * (1 - u); }
      }
    }, { flash: 0.16 });
  };

  BUILD.lobber = b => {
    const k = b.k; rig(k);
    k.add(cylZ(0.046, 0.05, 0.17, 18), 0xFF8FC0, [0, 0.03, -0.1]);
    k.add(tor(0.05, 0.01, 8, 22), 0xFFC8E0, [0, 0.03, -0.186]);
    k.add(sph(0.046, 16, 10), 0xF27AB0, [0, 0.03, -0.015], null, [1, 1, 0.6]);
    k.add(cyl(0.035, 0.048, 0.03, 18), 0xFFC8E0, [0, 0.075, -0.07]);
    k.add(box(0.012, 0.03, 0.05, 0.005), 0xFFC8E0, [0, 0.07, -0.15]);
    b.P.bowl = b.part(sph(0.075, 20, 14), MAT.glass(0xCFF3FF, 0.3), [0, 0.142, -0.07]);
    const bm = G.M.toon(0xFF8FC0, { spec: 0.95, rimStr: 0.7, emissive: 0xFF8FC0, ei: 0.2 });
    b.P.bubbles = [];
    if (b.max) [[-0.022, 0.135, -0.07], [0.022, 0.135, -0.07], [0, 0.16, -0.075]].forEach(p => b.P.bubbles.push(b.part(sph(0.024), bm, p)));
    else b.P.bubbles.push(b.part(sph(0.036), bm, [0, 0.14, -0.07]));
    b.P.bubbles.forEach(m => { m.userData.base = m.position.clone(); });
    maxBand(b, [0, 0.03, -0.1], 0.05);
    return finish(b, [0, 0.03, -0.2], 0xFFC8E0, (w, dt, P, S, t) => {
      const wob = w.fireT < 0.5 ? Math.sin(w.fireT * 40) * (0.5 - w.fireT) * 0.18 : 0;
      P.bowl.scale.set(1 + wob, 1 - wob, 1 + wob);
      const regrow = w.cd > 0 ? clamp(1 - w.cd * (w.st.rate || 1), 0, 1) : 1;
      const has = w.owner.ink !== undefined ? true : (w.infinite || w.ammo > 0);
      P.bubbles.forEach((m, i) => {
        const s = has ? easeOut(regrow) : 0;
        m.scale.setScalar(Math.max(0.001, s * (1 + Math.sin(t * 5 + i) * 0.05)));
        m.position.y = m.userData.base.y + Math.sin(t * 2.5 + i * 2) * 0.004;
      });
    }, { flash: 0.09 });
  };

  BUILD.zap = b => {
    const k = b.k; rig(k);
    k.add(box(0.074, 0.074, 0.17, 0.02), NAVY, [0, 0.035, -0.07]);
    k.add(box(0.03, 0.012, 0.13, 0.005), GOLD, [0, 0.077, -0.07]);
    k.add(cylZ(0.013, 0.013, 0.22, 10), GOLD, [0, 0.035, -0.24]);
    k.add(cylZ(0.03, 0.03, 0.02, 14), GOLD, [0, 0.035, -0.16]);
    const ck = new Kit();
    const n = b.max ? 4 : 3;
    for (let i = 0; i < n; i++) ck.add(tor(0.036 - i * 0.002, 0.0095, 8, 22), 0xffffff, [0, 0, -i * 0.04]);
    const geo = ck.geo(); b.P.coils = new THREE.Mesh(geo, G.M.toonUnique(0xffffff, { vc: true, emissive: 0xB8F34A, ei: 0.0, spec: 0.9 }));
    b.P.coils.material.color.setHex(GOLD);
    b.P.coils.position.set(0, 0.035, -0.18); b.gun.add(b.P.coils); if (b.outline) addOutline(b.P.coils);
    const br = b.max ? 0.036 : 0.028, bz = b.max ? -0.38 : -0.34;
    b.P.ball = b.part(sph(br, 16, 12), MAT.glowU(0xB8F34A, 0.9), [0, 0.035, bz], null, null, { outline: true });
    b.P.glow = sprite(0xB8F34A, 0.09, null, 0.8); b.P.glow.position.set(0, 0.035, bz); b.gun.add(b.P.glow);
    b.P.arcs = [0, 1].map(() => { const s = sprite(0xE8FF9A, 0.035, starTex(), 1); s.visible = false; b.gun.add(s); return s; });
    maxBand(b, [0, 0.035, -0.07], 0.06);
    return finish(b, [0, 0.035, bz], 0xB8F34A, (w, dt, P, S, t) => {
      const on = !!w.beamOn;
      const jit = on ? 0.003 : 0;
      P.ball.position.set((Math.random() - 0.5) * jit * 2, 0.035 + (Math.random() - 0.5) * jit * 2, bz);
      P.ball.material.emissive.setHex(0xB8F34A).multiplyScalar(on ? 1.2 + Math.random() * 0.6 : 0.7 + Math.sin(t * 3) * 0.15);
      P.glow.scale.setScalar(on ? 0.12 + Math.random() * 0.05 : 0.07);
      P.coils.material.emissive.setHex(0xB8F34A).multiplyScalar(on ? 0.35 + 0.35 * Math.sin(t * 40) : 0);
      for (const s of P.arcs) {
        s.visible = on && Math.random() < 0.7;
        if (s.visible) { s.position.set((Math.random() - 0.5) * 0.06, 0.035 + (Math.random() - 0.5) * 0.06, -0.18 - Math.random() * 0.14); s.material.rotation = Math.random() * 6; }
      }
    }, { noFlash: true });
  };

  BUILD.saw = b => {
    const k = b.k; rig(k);
    k.add(box(0.06, 0.06, 0.13, 0.02), 0x3DDC97, [0, 0.03, -0.05]);
    const houses = b.max ? [0.079, 0.124] : [0.079];
    houses.forEach(y => {
      k.add(cyl(0.072, 0.072, 0.011, 28), 0x3DDC97, [0, y - 0.016, -0.115]);
      k.add(cyl(0.072, 0.072, 0.011, 28), 0x2FC283, [0, y + 0.016, -0.115]);
      k.add(tor(0.072, 0.005, 6, 28), WHITE, [0, y + 0.022, -0.115], [PI / 2, 0, 0]);
      k.add(cyl(0.012, 0.012, 0.03, 8), SILVER, [0.06, y, -0.08]);
      k.add(cyl(0.012, 0.012, 0.03, 8), SILVER, [-0.06, y, -0.08]);
    });
    k.add(box(0.05, 0.03, 0.05, 0.01), 0x2FC283, [0, 0.055, -0.07]);
    function discGeo() {
      const dk = new Kit();
      dk.add(cyl(0.083, 0.083, 0.008, 28), SILVER, [0, 0, 0]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; dk.add(cone(0.02, 0.034, 4), WHITE, [Math.cos(a) * 0.088, 0, Math.sin(a) * 0.088], [0, -a, -PI / 2], [1, 1, 0.35]); }
      dk.add(cyl(0.024, 0.024, 0.012, 12), 0x3DDC97, [0, 0, 0]);
      dk.add(cyl(0.008, 0.008, 0.014, 8), WHITE, [0, 0, 0]);
      return dk.geo();
    }
    const dg = discGeo();
    b.P.discs = houses.map(y => { const m = new THREE.Mesh(dg, MAT.vc()); m.position.set(0, y, -0.14); b.gun.add(m); if (b.outline) addOutline(m); return m; });
    maxBand(b, [0, 0.03, -0.05], 0.045);
    return finish(b, [0, 0.079, -0.24], 0xffffff, (w, dt, P, S, t) => {
      const loaded = w.cd > 0 ? clamp(1 - w.cd * w.st.rate, 0, 1) : 1;
      const has = w.owner.ink !== undefined || w.infinite || w.ammo > 0;
      S.spin = (S.spin || 0) + dt * (6 + 36 * (w.held ? 1 : 0.2) * loaded);
      P.discs.forEach((m, i) => {
        m.rotation.y = S.spin * (i ? -1 : 1);
        const k2 = has ? easeOut(loaded) : 0;
        m.scale.set(Math.max(0.001, k2), 1, Math.max(0.001, k2));
        m.position.z = -0.14 + (1 - k2) * 0.06;
      });
      const kick = w.fireT < 0.2 ? Math.sin(w.fireT / 0.2 * PI) * 0.012 : 0;
      b.gun.position.x = -kick;
    }, { flash: 0.08 });
  };

  BUILD.lancer = b => {
    const k = b.k; rig(k);
    k.add(box(0.06, 0.07, 0.16, 0.02), 0x8C7BFF, [0, 0.035, -0.045]);
    k.add(box(0.074, 0.066, 0.075, 0.014), 0x6E5FE0, [0, 0.04, 0.06]);
    k.add(cylZ(0.015, 0.015, 0.45, 10), WHITE, [0, 0.045, -0.34]);
    k.add(cylZ(0.024, 0.029, 0.08, 14), 0x8C7BFF, [0, 0.045, -0.15]);
    k.add(cylZ(0.016, 0.016, 0.085, 12), 0x5A4BC8, [0, 0.095, -0.05]);
    k.add(box(0.012, 0.03, 0.02, 0.004), 0x5A4BC8, [0, 0.077, -0.03]);
    k.add(cylZ(0.02, 0.012, 0.03, 12), WHITE, [0, 0.045, -0.575]);
    b.P.cap = b.part(box(0.078, 0.024, 0.045, 0.006), MAT.glowU(0xC8B8FF, 0.4), [0, 0.046, 0.06]);
    b.P.lens = b.part(sph(0.012, 10, 8), MAT.glowU(0xC8B8FF, 0.6), [0, 0.095, -0.094]);
    b.P.rings = [-0.21, -0.33, -0.45].map(z => b.part(tor(0.028, 0.0075, 8, 22), MAT.glowU(0xC8B8FF, 0.1), [0, 0.045, z], null, null, { outline: true }));
    if (b.max) {
      const pm = MAT.glow(0xFFFFFF, 0.6);
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; b.part(new THREE.OctahedronGeometry(0.011, 0), pm, [Math.cos(a) * 0.022, 0.045 + Math.sin(a) * 0.022, -0.585], [0, 0, a], [1, 1, 1.8]); }
      maxBand(b, [0, 0.035, -0.045], 0.05, [0, 0, 0]);
    }
    b.P.tip = sprite(0xC8B8FF, 0.03, null, 0.9); b.P.tip.position.set(0, 0.045, -0.6); b.gun.add(b.P.tip);
    return finish(b, [0, 0.045, -0.6], 0xC8B8FF, (w, dt, P, S, t) => {
      const c = w.charging ? w.charge : (w.chargeVis || 0);
      const full = w.charging && w.charge >= 1;
      const dis = w.fireT < 0.2 ? 1 - w.fireT / 0.2 : 0; // discharge flare: fades from the hand end, so it runs out the muzzle
      for (let i = 0; i < 3; i++) {
        const v = clamp(c * 3 - i, 0, 1), d = clamp(dis * 1.6 - (2 - i) * 0.3, 0, 1);
        P.rings[i].material.emissive.setHex(0xC8B8FF).multiplyScalar(0.1 + v * 1.4 + d * 1.5 + (full ? Math.sin(t * 25) * 0.3 : 0));
      }
      P.cap.material.emissive.setHex(0xC8B8FF).multiplyScalar(0.3 + c * 1.2 + dis * 0.8);
      P.tip.scale.setScalar(0.02 + c * 0.11 + dis * 0.08 + (full ? Math.sin(t * 30) * 0.01 : 0));
      P.tip.material.opacity = Math.min(1, 0.5 + c * 0.5 + dis * 0.5);
      b.gun.position.x = full ? Math.sin(t * 91) * 0.0011 : 0; // full-charge tremble: a smooth buzz, same at any frame rate
    }, { flash: 0.15 });
  };

  BUILD.gatling = b => {
    const k = b.k; rig(k);
    k.add(box(0.085, 0.085, 0.13, 0.026), 0x3FA9FF, [0, 0.042, -0.05]);
    k.add(cylX(0.05, 0.05, 20), 0x8E88C8, [0.06, 0.012, -0.05]);
    k.add(cylX(0.028, 0.054, 12), 0x6E64A8, [0.06, 0.012, -0.05]);
    k.add(tor(0.057, 0.013, 8, 26), 0xCFF3FF, [0, 0.042, -0.13]);
    k.add(box(0.03, 0.02, 0.08, 0.008), 0x8E88C8, [0, 0.092, -0.05]);
    if (b.max) for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; k.add(box(0.012, 0.04, 0.03, 0.004), 0xCFF3FF, [Math.cos(a) * 0.075, 0.042 + Math.sin(a) * 0.075, -0.13], [0, 0, a - PI / 2]); }
    const rk = new Kit();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rk.add(cylZ(0.009, 0.009, 0.22, 8), i % 2 ? 0xBFD8EE : 0x8E9CB8, [Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0]); }
    rk.add(cylZ(0.012, 0.012, 0.23, 8), 0x5A6080, [0, 0, 0]);
    rk.add(cylZ(0.044, 0.044, 0.012, 16), 0x3FA9FF, [0, 0, -0.095]);
    rk.add(cylZ(0.044, 0.044, 0.012, 16), 0x3FA9FF, [0, 0, 0.06]);
    b.P.rotor = new THREE.Group(); b.P.rotor.position.set(0, 0.042, -0.21); b.gun.add(b.P.rotor);
    // same look as the shared vertex-colour material, but its own emissive: barrels glow with heat
    b.P.rotorMat = G.M.toonUnique(0xffffff, { vc: true, spec: 0.6, rimStr: 0.38 });
    const rotorMesh = new THREE.Mesh(rk.geo(), b.P.rotorMat); b.P.rotor.add(rotorMesh); if (b.outline) addOutline(rotorMesh);
    maxBand(b, [0, 0.042, -0.05], 0.066);
    return finish(b, [0, 0.042, -0.335], 0xCFF3FF, (w, dt, P, S, t) => {
      const spin = w.spin || 0;
      P.rotor.rotation.z += spin * 15 * TAU * dt * 0.35 + spin * 0.9;
      // heat builds while the barrels are spun up and firing, then cools to a dull glow
      const firing = w.fireT < 0.1;
      S.heat = clamp((S.heat || 0) + dt * (firing ? 0.45 : -0.3 * (1.2 - spin)), 0, 1);
      P.rotorMat.emissive.setRGB(1, 0.42, 0.12).multiplyScalar(S.heat * S.heat * 0.6);
      // smooth motor buzz (spin-up hum, stronger while firing) instead of per-frame noise
      const buzz = (firing ? 0.0035 : 0.0012 * spin);
      b.gun.position.set(Math.sin(t * 97) * buzz, Math.sin(t * 83 + 1.3) * buzz, 0);
    }, { flash: 0.1 });
  };

  BUILD.swarm = b => {
    const k = b.k; rig(k);
    k.add(cylZ(0.046, 0.046, 0.02, 18), 0x8A5A3A, [0, 0.035, -0.015]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; k.add(sph(0.028, 10, 6), i % 2 ? 0xFFD45C : 0xFFC21A, [Math.cos(a) * 0.066, 0.035 + Math.sin(a) * 0.066, -0.012], [0, 0, a], [1.5, 0.6, 0.3]); }
    const cols = b.max ? [-0.05, 0, 0.05] : [-0.026, 0.026];
    k.add(box(b.max ? 0.15 : 0.1, 0.1, 0.06, 0.02), 0xFF5FA2, [0, 0.035, -0.06]);
    const tubes = [];
    for (const y of [0.061, 0.009]) for (const x of cols) tubes.push([x, y]);
    tubes.forEach(([x, y]) => { k.add(cylZ(0.022, 0.022, 0.13, 14), 0xFFE0F0, [x, y, -0.115]); k.add(tor(0.022, 0.005, 6, 16), 0xFF5FA2, [x, y, -0.18]); });
    b.P.rockets = tubes.map(([x, y], i) => b.part(coneZ(0.017, 0.05, 12), G.M.toonUnique(CONF[i % CONF.length], { emissive: CONF[i % CONF.length], ei: 0.15, spec: 0.8 }), [x, y, -0.19], null, null, { outline: false }));
    maxBand(b, [0, 0.035, -0.06], 0.06);
    return finish(b, [0, 0.035, -0.21], 0xFF8FD0, (w, dt, P, S, t) => {
      if (S.shots !== w.shots) { const d = w.shots - (S.shots || 0); S.shots = w.shots; S.ejected = Math.min(P.rockets.length, (S.ejected || 0) + Math.max(1, d)); S.ejT = 0.6; }
      S.ejT = (S.ejT || 0) - dt; if (S.ejT <= 0) S.ejected = 0;
      const locks = w.locking ? w.locks.length : 0;
      const has = w.owner.ink !== undefined || w.infinite || w.ammo > 0;
      P.rockets.forEach((m, i) => {
        const gone = i < (S.ejected || 0) || !has;
        const target = gone ? 0.001 : 1;
        m.scale.setScalar(lerp(m.scale.x, target, 1 - Math.exp(-dt * 10)));
        const lit = i < locks;
        m.material.emissive.setHex(m.material.color.getHex()).multiplyScalar(lit ? 0.9 + Math.sin(t * 20) * 0.2 : 0.15);
        m.position.z = -0.19 - (lit ? 0.008 : 0);
      });
    }, { flash: 0.12 });
  };

  BUILD.buddy = b => {
    const k = b.k; rig(k);
    k.add(cylZ(0.075, 0.075, 0.15, 6), 0xFFB627, [0, 0.05, -0.1], [0, 0, PI / 6]);
    k.add(cylZ(0.07, 0.07, 0.014, 6), 0xFFE08A, [0, 0.05, -0.02], [0, 0, PI / 6]);
    for (const [x, y, z] of [[0.066, 0.06, -0.07], [0.066, 0.03, -0.11], [0.066, 0.075, -0.13], [-0.066, 0.045, -0.09]]) k.add(cyl(0.016, 0.016, 0.012, 6), 0xE09A10, [x, y, z], [0, 0, PI / 2]);
    k.add(box(0.02, 0.012, 0.04, 0.004), 0xFFE08A, [0, 0.118, -0.04]);
    b.P.hinge = new THREE.Group(); b.P.hinge.position.set(0, 0.112, -0.178); b.gun.add(b.P.hinge);
    b.P.lid = b.part(cylZ(0.072, 0.072, 0.012, 6), G.M.toon(0xFFE08A, { spec: 0.6 }), [0, -0.062, 0], [0, 0, PI / 6], null, { parent: b.P.hinge, outline: true });
    const bk = new Kit();
    bk.add(sph(0.026, 12, 10), 0xFFD27A, [0, 0, 0]);
    bk.add(sph(0.016, 10, 8), 0x2A1B3D, [0, 0.004, -0.018], null, [1.3, 0.9, 0.6]);
    bk.add(sph(0.006, 8, 6), 0x5CFFE1, [0, 0.006, -0.026]);
    bk.add(cyl(0.002, 0.002, 0.02, 4), 0x3A2A55, [0, 0.032, 0]);
    bk.add(sph(0.005, 6, 4), 0xFF5FA2, [0, 0.043, 0]);
    const bg = bk.geo();
    const pos = b.max ? [[-0.036, 0.122, -0.09], [0, 0.128, -0.11], [0.036, 0.122, -0.09]] : [[-0.028, 0.124, -0.095], [0.028, 0.124, -0.095]];
    b.P.buds = pos.map(p => { const m = new THREE.Mesh(bg, MAT.vc()); m.position.set(p[0], p[1], p[2]); m.userData.base = p; b.gun.add(m); return m; });
    maxBand(b, [0, 0.05, -0.1], 0.078, [0, 0, PI / 6]);
    return finish(b, [0, 0.05, -0.18], 0xFFF3A0, (w, dt, P, S, t) => {
      const open = w.fireT < 0.45 ? Math.sin(w.fireT / 0.45 * PI) : 0;
      P.hinge.rotation.x = -open * 1.4;
      const has = w.owner.ink !== undefined || w.infinite || w.ammo > 0;
      const ready = w.cd > 0 ? clamp(1 - w.cd * w.st.rate, 0, 1) : 1;
      P.buds.forEach((m, i) => {
        const bb = m.userData.base;
        const up = has ? easeOut(ready) : 0;
        m.position.set(bb[0], bb[1] - 0.04 * (1 - up) + Math.abs(Math.sin(t * 3 + i * 1.7)) * 0.006, bb[2]);
        m.rotation.y = Math.sin(t * 1.3 + i) * 0.5;
        m.visible = up > 0.05;
      });
    }, { flash: 0.07 });
  };

  BUILD.groove = b => {
    const k = b.k; rig(k);
    k.add(lathe([[0.012, 0], [0.034, 0.004], [0.05, 0.03], [0.06, 0.052], [0.056, 0.058], [0.044, 0.035], [0.001, 0.03]], 20), 0xE6ECFF, [0, 0.0, -0.075]);
    k.add(tor(0.058, 0.005, 6, 22), 0xB983FF, [0, 0.055, -0.075], [PI / 2, 0, 0]);
    k.add(box(0.03, 0.025, 0.06, 0.01), 0xB983FF, [0, -0.005, -0.035]);
    if (b.max) {
      for (const s of [-1, 1]) { k.add(coneZ(0.024, 0.03, 14).rotateY(-s * PI / 2), 0x2A1B3D, [s * 0.066, 0.03, -0.075]); k.add(cyl(0.026, 0.026, 0.012, 14).rotateZ(PI / 2), 0xB983FF, [s * 0.055, 0.03, -0.075]); }
    }
    const geo = new THREE.IcosahedronGeometry(0.062, 1);
    const n = geo.attributes.position.count; geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    geo.userData.shared = true;
    b.P.ballGeo = geo;
    b.P.ball = b.part(geo, G.M.toon(0xffffff, { vc: true, flat: true, spec: 0.95, emissive: b.max ? 0x806010 : 0x5a3a9a, ei: 0.3, rimStr: 0.5 }), [0, 0.1, -0.075]);
    b.P.glow = sprite(b.max ? 0xFFD45C : 0xD8B0FF, 0.16, null, 0.55); b.P.glow.position.set(0, 0.1, -0.08); b.gun.add(b.P.glow);
    maxBand(b, [0, 0.03, -0.075], 0.053, [PI / 2, 0, 0]);
    return finish(b, [0, 0.1, -0.075], 0xF0B8FF, (w, dt, P, S, t) => {
      P.ball.rotation.y += dt * 1.8; P.ball.rotation.x = 0.3;
      S.fl = (S.fl || 0) - dt;
      if (S.fl <= 0) {
        S.fl = 0.1;
        const arr = P.ballGeo.attributes.color.array;
        for (let f = 0; f < arr.length / 9; f++) {
          _col.setHex(Math.random() < 0.55 ? (b.max ? 0xFFD45C : 0xE6ECFF) : RAIN[(Math.random() * RAIN.length) | 0]);
          for (let v = 0; v < 3; v++) { arr[f * 9 + v * 3] = _col.r; arr[f * 9 + v * 3 + 1] = _col.g; arr[f * 9 + v * 3 + 2] = _col.b; }
        }
        P.ballGeo.attributes.color.needsUpdate = true;
      }
      const has = w.owner.ink !== undefined || w.infinite || w.ammo > 0;
      const ready = w.cd > 0 ? clamp(1 - w.cd * w.st.rate, 0, 1) : 1;
      const s = has ? easeOut(ready) : 0.001;
      P.ball.scale.setScalar(Math.max(0.001, s)); P.glow.scale.setScalar(0.16 * s);
      // the hand bounces to the beat (120 BPM) while equipped
      b.gun.position.y = Math.abs(Math.sin(t * PI * 2)) * 0.008;
      b.gun.rotation.z = Math.sin(t * PI * 2) * 0.03;
    }, { flash: 0.09 });
  };

  BUILD.bloom = b => {
    const k = b.k; rig(k);
    k.add(latheZ([[0.001, 0], [0.038, 0], [0.05, 0.1], [0.064, 0.108], [0.064, 0.128], [0.055, 0.128]], 18), 0x6CCB5F, [0, 0.04, -0.05]);
    k.add(cylZ(0.053, 0.053, 0.008, 18), 0x7A4A3A, [0, 0.04, -0.17]);
    k.add(tor(0.052, 0.007, 6, 22), 0xFF7A93, [0, 0.04, -0.105]);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + PI / 2; k.add(sph(0.012, 8, 6), 0x3E9E57, [Math.cos(a) * 0.06, 0.04 + Math.sin(a) * 0.06, -0.155]); }
    if (b.max) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; k.add(cone(0.007, 0.022, 6), 0x2E7E47, [Math.cos(a) * 0.058, 0.04 + Math.sin(a) * 0.058, -0.09], [0, 0, a - PI / 2]); }
    b.P.pod = b.part(sph(0.032, 14, 10), MAT.glowU(0xA8E06A, 0.35), [0, 0.04, -0.175], null, [1, 1, 1.15], { outline: true });
    b.P.petals = [0, 1, 2].map(i => {
      const g = new THREE.Group(); const a = i / 3 * TAU - PI / 2; g.position.set(Math.cos(a) * 0.064, 0.04 + Math.sin(a) * 0.064, -0.175); g.rotation.z = a; b.gun.add(g);
      b.part(sph(0.03, 10, 8), G.M.toon(0xFF7A93, { spec: 0.6, rimStr: 0.5 }), [0.025, 0, 0.01], null, [1.2, 0.55, 0.25], { parent: g, outline: true });
      return g;
    });
    maxBand(b, [0, 0.04, -0.12], 0.06);
    return finish(b, [0, 0.04, -0.2], 0xA8E06A, (w, dt, P, S, t) => {
      const has = w.owner.ink !== undefined || w.infinite || w.ammo > 0;
      const ready = w.cd > 0 ? clamp(1 - w.cd * w.st.rate, 0, 1) : 1;
      const s = has ? easeOut(ready) : 0.001;
      P.pod.scale.set(s, s, s * 1.15); P.pod.position.z = -0.175 + (1 - s) * 0.04;
      P.pod.material.emissive.setHex(0xA8E06A).multiplyScalar(0.3 + Math.sin(t * 4) * 0.1 + (w.held ? 0.4 : 0));
      const flut = w.fireT < 0.6 ? (0.6 - w.fireT) * 1.4 : 0.12;
      P.petals.forEach((g, i) => { g.rotation.y = Math.sin(t * 9 + i * 2) * flut; });
    }, { flash: 0.09 });
  };

  BUILD.chill = b => {
    const k = b.k; rig(k);
    k.add(capZ(0.047, 0.1), 0x9FE8FF, [0, 0.045, -0.07]);
    k.add(tor(0.048, 0.007, 6, 22), WHITE, [0, 0.045, -0.035]);
    k.add(tor(0.048, 0.007, 6, 22), WHITE, [0, 0.045, -0.105]);
    k.add(cylZ(0.03, 0.012, 0.09, 16), WHITE, [0, 0.045, -0.18]);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + PI / 2; k.add(box(0.006, 0.04, 0.045, 0.002), WHITE, [Math.cos(a) * 0.05, 0.045 + Math.sin(a) * 0.05, 0.0], [0, 0, a - PI / 2]); }
    k.add(box(0.03, 0.02, 0.05, 0.008), 0x7FD4F0, [0, 0.0, -0.03]);
    if (b.max) {
      for (let i = 0; i < 3; i++) k.add(box(0.004, 0.07, 0.008, 0.002), WHITE, [0, 0.13, -0.07], [i * PI / 3, 0, 0]);
      k.add(sph(0.01, 8, 6), 0x7AF0FF, [0, 0.13, -0.07]);
      maxBand(b, [0, 0.045, -0.07], 0.049);
    }
    b.P.tipRing = b.part(tor(0.014, 0.0045, 6, 16), MAT.glowU(0x7AF0FF, 0.9), [0, 0.045, -0.226]);
    b.P.frost = b.part(sph(0.026, 12, 10), G.M.toonUnique(0xFFFFFF, { transparent: true, opacity: 0.0, spec: 0.9, rimStr: 1, flat: true }), [0, 0.045, -0.215]);
    b.P.mist = [0, 1].map(() => { const s = sprite(0xE8FBFF, 0.05, null, 0.7); s.visible = false; b.gun.add(s); return s; });
    return finish(b, [0, 0.045, -0.235], 0x7AF0FF, (w, dt, P, S, t) => {
      const fr = w.frost || 0;
      P.frost.material.opacityU = fr * 0.8;
      P.frost.scale.set(0.6 + fr * 0.6, 0.6 + fr * 0.6, 0.6 + fr * 0.9);
      P.tipRing.material.emissive.setHex(0x7AF0FF).multiplyScalar(w.beamOn ? 1.3 + Math.random() * 0.4 : 0.6);
      P.mist.forEach((s, i) => {
        s.visible = !!w.beamOn;
        if (s.visible) { const u = ((t * 4 + i * 0.5) % 1); s.position.set((Math.random() - 0.5) * 0.02, 0.045, -0.24 - u * 0.09); s.scale.setScalar(0.04 + u * 0.08); s.material.opacity = 0.7 * (1 - u); }
      });
    }, { noFlash: true });
  };

  BUILD.splat = b => {
    const k = b.k; rig(k);
    k.add(box(0.05, 0.06, 0.2, 0.016), 0x1B2A4A, [0, 0.03, -0.09]);
    k.add(box(0.044, 0.052, 0.07, 0.016), 0x2B3D66, [0, 0.026, 0.04]);
    k.add(cyl(0.012, 0.012, 0.03, 8), 0x2B3D66, [0, 0.062, -0.07]);
    const bars = b.max ? [-0.016, 0.016] : [0];
    bars.forEach(x => { k.add(cylZ(0.016, 0.013, 0.12, 12), WHITE, [x, 0.03, -0.235]); });
    k.add(box(0.008, 0.02, 0.06, 0.003), 0xA8E06A, [0.026, 0.03, -0.09]);
    b.P.tank = b.part(sph(0.052, 18, 14), MAT.glass(0xEAFBFF, 0.28), [0, 0.1, -0.07]);
    b.P.gooMat = G.M.toonUnique(0xA8E06A, { emissive: 0xA8E06A, ei: 0.25, spec: 0.9, rimStr: 0.5 });
    b.P.goo = b.part(sph(0.047, 16, 12), b.P.gooMat, [0, 0.1, -0.07]);
    b.P.tips = bars.map(x => b.part(sph(0.015, 10, 8), b.P.gooMat, [x, 0.03, -0.298]));
    maxBand(b, [0, 0.03, -0.12], 0.042, [0, 0, 0]);
    return finish(b, [0, 0.03, -0.31], 0xA8E06A, (w, dt, P, S, t) => {
      const c = w.gooColor ? w.gooColor() : 0xA8E06A;
      if (S.c !== c) { S.c = c; P.gooMat.color.setHex(c); P.gooMat.emissive.setHex(c).multiplyScalar(0.25); b.root.userData.vm.flash.material.color.setHex(c); }
      const o = w.owner;
      const frac = o.ink !== undefined ? clamp(o.ink / 100, 0, 1) : (w.infinite ? 1 : clamp(w.ammo / (w.maxAmmo || 1), 0, 1));
      S.f = lerp(S.f == null ? frac : S.f, frac, 1 - Math.exp(-dt * 6));
      const sl = w.fireT < 0.3 ? Math.sin(w.fireT * 30) * (0.3 - w.fireT) * 0.5 : 0;
      const fy = Math.max(0.05, S.f);
      const M = o.vmMotion;
      if (M && G.feelSpring) { S.slosh = S.slosh || { x: 0, v: 0 }; G.feelSpring(S.slosh, clamp(-M.x * 9 - M.roll * 0.5, -0.45, 0.45), 2.6, 0.25, dt); }
      P.goo.scale.set(0.98, fy, 0.98); P.goo.position.y = 0.1 - 0.047 * (1 - fy); P.goo.rotation.z = sl + (S.slosh ? S.slosh.x : 0);
    }, { flash: 0.09 });
  };

  BUILD.roller = b => {
    b.pose = { pos: [0.03, 0.07, -0.05], rot: [0.04, 0.12, 0.06] };
    const k = b.k; rig(k);
    k.add(sph(0.02, 10, 8), CREAM, [0, 0.0, 0.0]);
    const arm = new THREE.Group(); b.gun.add(arm); b.P.arm = arm;
    const ak = new Kit();
    const D = [-0.12, -0.3, -0.5], half = b.max ? 0.25 : 0.2;   // drum 5 cm lower than v1.1 (it hid 31 % of the lower-centre floor)
    ak.tube([0, 0.0, 0.02], [D[0], D[1] + 0.12, D[2] + 0.02], 0.013, 0.012, CREAM, 10);
    ak.add(sph(0.018, 10, 8), 0xA8E06A, [D[0], D[1] + 0.12, D[2] + 0.02]);
    ak.tube([D[0] - half - 0.012, D[1] + 0.12, D[2] + 0.02], [D[0] + half + 0.012, D[1] + 0.12, D[2] + 0.02], 0.01, 0.01, CREAM, 8);
    for (const s of [-1, 1]) {
      ak.tube([D[0] + s * (half + 0.012), D[1] + 0.12, D[2] + 0.02], [D[0] + s * (half + 0.012), D[1], D[2]], 0.009, 0.009, CREAM, 8);
      ak.add(cylX(0.086, 0.012, 18), CREAM, [D[0] + s * (half + 0.004), D[1], D[2]]);
      if (b.max) { ak.add(box(0.03, 0.05, 0.11, 0.008), 0xFFD45C, [D[0] + s * (half + 0.03), D[1] - 0.02, D[2]]); ak.add(box(0.032, 0.02, 0.1, 0.004), 0x2A1B3D, [D[0] + s * (half + 0.03), D[1] - 0.05, D[2]]); }
    }
    const guard = new THREE.CylinderGeometry(0.098, 0.098, half * 2 + 0.01, 18, 1, true, PI * 0.62, PI * 0.3).rotateZ(PI / 2);
    const guard2 = guard.clone();   // clone before place(): Kit.add bakes the offset into the geometry
    ak.add(guard, CREAM, D);
    ak.add(guard2, CREAM, D, null, [1, 0.97, 0.97]);
    b.kitMesh(ak, arm);
    b.P.drumMat = G.M.toonUnique(0xA8E06A, { emissive: 0xA8E06A, ei: 0.15, spec: 0.8, rimStr: 0.5 });
    b.P.drum = b.part(cylX(0.08, half * 2, 22), b.P.drumMat, D, null, null, { parent: arm, outline: true });
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; b.part(box(half * 1.9, 0.008, 0.012), G.M.toon(0xFFFFFF, { spec: 0.6 }), [0, Math.cos(a) * 0.081, Math.sin(a) * 0.081], [a, 0, 0], null, { parent: b.P.drum }); }
    maxBand(b, [D[0], D[1], D[2]], 0.082, [0, PI / 2, 0]);
    return finish(b, [D[0], D[1], D[2] - 0.08], 0xA8E06A, (w, dt, P, S, t) => {
      const c = w.gooColor ? w.gooColor() : 0xA8E06A;
      if (S.c !== c) { S.c = c; P.drumMat.color.setHex(c); P.drumMat.emissive.setHex(c).multiplyScalar(0.15); b.root.userData.vm.flash.material.color.setHex(c); }
      P.drum.rotation.x = -(w.drum || 0);
      const roll = w.rolling ? 1 : 0;
      S.roll = lerp(S.roll || 0, roll, 1 - Math.exp(-dt * 10));
      const fk = w.flickT < 0.4 ? Math.sin(w.flickT / 0.4 * PI) : 0;
      arm.rotation.x = S.roll * 0.18 + fk * 1.22;
      arm.position.y = -S.roll * 0.03 + fk * 0.04;
      arm.position.z = -S.roll * 0.02;
    }, { flash: 0.14 });
  };

  BUILD.prism = b => {
    const k = b.k; rig(k);
    k.add(capZ(0.05, 0.15), 0xF7F4FF, [0, 0.042, -0.09]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + PI / 2; k.add(box(0.008, 0.05, 0.05, 0.004, 1), i % 2 ? 0xE8E0FF : 0xFFFFFF, [Math.cos(a) * 0.055, 0.042 + Math.sin(a) * 0.055, 0.005], [0, 0, a - PI / 2]); }
    k.add(cylZ(0.03, 0.03, 0.03, 16), 0xE8E0FF, [0, 0.042, -0.175]);
    if (b.max) for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.018; k.add(cone(0.008, 0.035 - Math.abs(i - 2) * 0.006, 6), MAXGOLD, [x, 0.105 - Math.abs(i - 2) * 0.004, -0.09]); }
    b.P.stripes = [-0.04, -0.09, -0.14].map(z => b.part(tor(0.051, 0.0085, 6, 22), G.M.toonUnique(0xFF5FA2, { emissive: 0xFF5FA2, ei: 0.6, spec: 0.8 }), [0, 0.042, z]));
    const rk = new Kit();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; rk.add(cylZ(0.012, 0.012, 0.08, 10), RAIN[i], [Math.cos(a) * 0.038, Math.sin(a) * 0.038, 0]); }
    rk.add(cylZ(0.022, 0.022, 0.085, 12), 0xF7F4FF, [0, 0, 0]);
    rk.add(tor(0.05, 0.007, 5, 22), 0xF7F4FF, [0, 0, -0.04]);
    b.P.rotor = new THREE.Group(); b.P.rotor.position.set(0, 0.042, -0.22); b.gun.add(b.P.rotor);
    b.kitMesh(rk, b.P.rotor);
    if (b.max) { b.P.star = sprite(0xFFFFFF, 0.06, starTex(), 0.9); b.P.star.position.set(0, 0.042, -0.275); b.gun.add(b.P.star); }
    maxBand(b, [0, 0.042, -0.065], 0.052);
    return finish(b, [0, 0.042, -0.275], 0xFFFFFF, (w, dt, P, S, t) => {
      const pf = w.fireT < 0.12 ? 1 - w.fireT / 0.12 : 0;
      P.stripes.forEach((m, i) => {
        _col.setHSL(((t * 0.25 + i * 0.18) % 1 + 1) % 1, 0.85, 0.62 + pf * 0.25);
        m.material.color.copy(_col); m.material.emissive.copy(_col).multiplyScalar(0.55 + pf * 0.6);
      });
      const lockBoost = w.locking ? 0.6 : 0;
      P.rotor.rotation.z += dt * (0.8 + (w.spin || 0) * 22 + lockBoost * 4);
      if (P.star) { P.star.material.rotation = t * 2; P.star.scale.setScalar(0.05 + Math.sin(t * 6) * 0.01); _col.setHSL((t * 0.25) % 1, 0.9, 0.7); P.star.material.color.copy(_col); }
      if (b.root.userData.vm.flash.visible) { _col.setHSL(Math.random(), 0.9, 0.65); b.root.userData.vm.flash.material.color.copy(_col); }
    }, { flash: 0.13 });
  };

  // ------------------------------------------------------------------ build / animate API
  const CACHE = new Map();
  function build(w) {
    const id = w.id, max = w.level >= 5;
    const outline = !G.R.qualityName || G.R.qualityName() !== 'low';
    const key = id + (max ? '+' : '') + (outline ? 'o' : '');
    let root = CACHE.get(key);
    if (!root) {
      const fn = BUILD[id]; if (!fn) return new THREE.Group();
      root = fn(Builder(id, max, outline));
      CACHE.set(key, root);
    }
    if (root.parent) root.parent.remove(root);
    const vm = root.userData.vm;
    const pal = curPal();
    if (vm.palKey !== pal.key) { paintRig(root, pal); vm.palKey = pal.key; }
    const ps = vm.pose || POSE;
    vm.base.set(ps.pos[0], ps.pos[1], ps.pos[2]);
    root.position.copy(vm.base); root.rotation.set(ps.rot[0], ps.rot[1], ps.rot[2]); vm.gun.position.set(0, 0, 0); vm.gun.rotation.set(0, 0, 0);
    vm.flash.visible = vm.core.visible = false;
    root.visible = true; // may have been parked hidden for a warm-up (Player._prewarmVms)
    return root;
  }
  // Muzzle flash timing (s): the starburst pops and fades over FLASH_T; the white core then cools
  // into a soft halo in the weapon's colour over HALO_T. Driven by time since the shot, so it looks
  // the same at any frame rate, and a fresh shot always gets one full-strength frame.
  const FLASH_T = 0.06, HALO_T = 0.15, _white = new THREE.Color(0xffffff);
  function animate(w, dt) {
    const root = w.vm; const vm = root && root.userData.vm; if (!vm) return;
    const S = w.vmS || (w.vmS = {});
    const t = G.time.elapsed;
    if (!vm.noFlash) {
      if (S.flashShot === undefined) S.flashShot = w.shots;
      const fresh = S.flashShot !== w.shots && w.fireT < 0.1;
      if (S.flashShot !== w.shots) S.flashShot = w.shots;
      if (fresh) { S.flashRot = Math.random() * TAU; S.flashS = vm.flashSize * (0.85 + Math.random() * 0.4); }
      const age = fresh ? 0 : w.fireT;
      const fl = age < FLASH_T, halo = age < HALO_T;
      vm.flash.visible = fl; vm.core.visible = halo;
      if (halo) {
        const s = S.flashS || vm.flashSize;
        if (fl) {
          const k = age / FLASH_T;
          vm.flash.scale.setScalar(s * (0.8 + 0.45 * Math.sqrt(k)));
          vm.flash.material.opacity = 1 - k * k;
          vm.flash.material.rotation = (S.flashRot || 0) + k * 0.6;
        }
        const hk = clamp(age / HALO_T, 0, 1);
        vm.core.material.color.copy(_white).lerp(vm.flash.material.color, Math.min(1, hk * 1.6));
        vm.core.material.opacity = fl ? 1 : 0.6 * (1 - hk) * (1 - hk);
        vm.core.scale.setScalar(s * (fl ? 0.5 : 0.5 + 0.7 * hk));
      }
    }
    // level-up flourish: one full spin of the gun around its barrel axis
    if (w.flourishT > 0) {
      const k = 1 - w.flourishT / 0.7;
      const ps = vm.pose || POSE;
      root.rotation.z = ps.rot[2] - (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2) * TAU;
      root.position.y = vm.base.y + Math.sin(k * PI) * 0.03;
      S.flour = true;
    } else if (S.flour) { S.flour = false; const ps = vm.pose || POSE; root.rotation.z = ps.rot[2]; root.position.y = vm.base.y; }
    G.safe('vm anim ' + w.id, () => vm.anim(w, dt, vm.P, S, t));
  }
  // World-space point that appears exactly at the viewmodel muzzle on screen, `dist` metres from the eye.
  const _mz = new V3(), _md = new V3();
  function muzzleWorld(w, out, dist, eye) {
    const root = w.vm, vm = root && root.userData.vm;
    if (!vm || !root.parent || !G.R.showViewmodel) return null;
    const cam = G.R.camera, o = w.owner;
    vm.gun.updateWorldMatrix(true, false);
    _mz.copy(vm.muzzle); vm.gun.localToWorld(_mz);
    _mz.project(G.R.vmCamera);
    if (!(Math.abs(_mz.x) < 1.2 && Math.abs(_mz.y) < 1.2)) return null;
    // camera-space ray through that pixel, oriented by the owner's *current* view (the camera itself updates later)
    _md.set(_mz.x, _mz.y, 0.5).applyMatrix4(cam.projectionMatrixInverse).normalize();
    if (o && o.yaw != null) { _eu.set(o.pitch || 0, o.yaw, 0, 'YXZ'); _q.setFromEuler(_eu); _md.applyQuaternion(_q); _eu.order = 'XYZ'; }
    else { cam.updateMatrixWorld(); _md.transformDirection(cam.matrixWorld); }
    if (eye) return out.copy(eye).addScaledVector(_md, dist || 0.7);
    return out.copy(cam.position).addScaledVector(_md, dist || 0.7);
  }
  // Recolour every cached viewmodel (the equipped one included) for a new gauntlet / ranger palette.
  function applyPalette(pal) {
    pal = pal || curPal();
    for (const root of CACHE.values()) { paintRig(root, pal); root.userData.vm.palKey = pal.key; }
  }
  if (G.bus) G.bus.on('wardrobe', () => G.safe('vm palette', () => applyPalette()));
  W.VM = { build, animate, muzzleWorld, applyPalette, BUILD, POSE, _cache: CACHE };

  // ------------------------------------------------------------------ icons (48×48, bold, ink outline)
  const INK = '#1e1a4d';
  const svg = body => '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' + body + '</g></svg>';
  const GRIP = '<path d="M13 31l-3 11h8l3-11z" fill="#1F2A5A"/>';
  const HL = (x, y, w, h) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (h / 2) + '" fill="#fff" stroke="none" opacity=".75"/>';
  const ICONS = {
    fizz: svg(GRIP + '<rect x="4" y="17" width="28" height="15" rx="7.5" fill="#2EC4B6"/><path d="M32 20h3l3-2.5h6v14h-6l-3-2.5h-3z" fill="#CFF3FF"/>' +
      '<rect x="11.5" y="14.5" width="5" height="20" rx="2.5" fill="#4FD8FF"/><rect x="21" y="14.5" width="5" height="20" rx="2.5" fill="#4FD8FF"/><circle cx="9" cy="10" r="4.5" fill="#9FF6FF"/>' + HL(6, 19.5, 4, 3)),
    scatter: svg(GRIP + '<rect x="3" y="19" width="25" height="16" rx="6" fill="#FF6B6B"/><path d="M9 19v16M22 19v16" stroke-width="3"/><path d="M7 19a8.5 8.5 0 0 1 17 0z" fill="#FFF1DC"/>' +
      '<path d="M28 19l15-4v7l-15 2zM28 26l15 0v7l-15-2.5z" fill="#FFF1DC"/><circle cx="12" cy="12" r="2.5" fill="#FFE9A8"/><circle cx="18" cy="11" r="2.5" fill="#fff"/><path d="M43 15v7M43 26v7" stroke="#FF9F45" stroke-width="3"/>'),
    lobber: svg(GRIP + '<rect x="8" y="27" width="30" height="11" rx="5" fill="#FF8FC0"/><path d="M38 26.5h4v12h-4z" fill="#FFC8E0"/><circle cx="20" cy="15" r="11" fill="#CFF3FF"/>' +
      '<circle cx="20" cy="16" r="5.5" fill="#FF8FC0"/>' + HL(13, 9, 5, 3)),
    zap: svg(GRIP + '<rect x="4" y="18" width="20" height="15" rx="4" fill="#1F2A5A"/><path d="M24 25.5h10" stroke-width="3"/><ellipse cx="27" cy="25.5" rx="2.6" ry="7" fill="#E8B44A"/>' +
      '<ellipse cx="33" cy="25.5" rx="2.6" ry="6" fill="#E8B44A"/><circle cx="41" cy="25.5" r="5" fill="#B8F34A"/><path d="M38 9l-4 7h4l-3 6" fill="none" stroke="#B8F34A" stroke-width="3.5"/><path d="M38 9l-4 7h4l-3 6" fill="none" stroke-width="1.2"/>'),
    saw: svg(GRIP + '<rect x="5" y="22" width="18" height="11" rx="4" fill="#3DDC97"/><path d="M32 6l3.6 5.2 6.3-.6-1.9 6 4.5 4.4-6 2 0 6.3-5.6-3-5.6 3 .1-6.3-6-2 4.5-4.4-1.9-6 6.3.6z" fill="#DDE6F0"/>' +
      '<circle cx="32" cy="17" r="4.5" fill="#3DDC97"/><rect x="18" y="28" width="26" height="6" rx="3" fill="#3DDC97"/>'),
    lancer: svg(GRIP + '<rect x="3" y="19" width="19" height="13" rx="4" fill="#8C7BFF"/><rect x="22" y="23" width="21" height="5" rx="2.5" fill="#F2F5FF"/><rect x="5" y="12" width="12" height="5" rx="2.5" fill="#5A4BC8"/>' +
      '<path d="M27 21v9M33 21v9M39 21v9" stroke="#C8B8FF" stroke-width="3"/><path d="M27 21v9M33 21v9M39 21v9" stroke-width="1"/><circle cx="45" cy="25.5" r="2.5" fill="#fff"/>'),
    gatling: svg(GRIP + '<rect x="3" y="17" width="17" height="17" rx="5" fill="#3FA9FF"/><rect x="20" y="17.5" width="23" height="4.5" rx="2.2" fill="#CFF3FF"/><rect x="20" y="23.5" width="24" height="4.5" rx="2.2" fill="#BFD8EE"/>' +
      '<rect x="20" y="29.5" width="23" height="4.5" rx="2.2" fill="#CFF3FF"/><rect x="22" y="14" width="5" height="23" rx="2.5" fill="#8E88C8"/><circle cx="9" cy="38" r="6" fill="#8E88C8"/>'),
    swarm: svg(GRIP + '<circle cx="12" cy="24" r="10" fill="#FFD45C"/><circle cx="12" cy="24" r="4.5" fill="#8A5A3A"/><rect x="18" y="14" width="18" height="21" rx="4" fill="#FF5FA2"/>' +
      '<path d="M36 15h4l4 3.5-4 3.5h-4zM36 27h4l4 3.5-4 3.5h-4z" fill="#3FD0FF"/><circle cx="24" cy="19" r="2" fill="#fff" stroke="none"/><circle cx="30" cy="29" r="2" fill="#fff" stroke="none"/><circle cx="25" cy="30" r="1.6" fill="#8CE05A" stroke="none"/>'),
    buddy: svg(GRIP + '<path d="M13 12l11-6 11 6v13l-11 6-11-6z" fill="#FFB627"/><path d="M19 14l5-3 5 3v6l-5 3-5-3z" fill="#E09A10" stroke-width="2"/><circle cx="35" cy="31" r="8" fill="#FFD27A"/>' +
      '<ellipse cx="36" cy="31" rx="4.5" ry="3.5" fill="#2A1B3D"/><circle cx="37" cy="30.5" r="1.6" fill="#5CFFE1" stroke="none"/><path d="M35 23v-4" stroke-width="2.5"/><circle cx="35" cy="18" r="2" fill="#FF5FA2"/>'),
    groove: svg('<path d="M14 30h20l-4 11H18z" fill="#E6ECFF"/><circle cx="24" cy="18" r="12" fill="#B983FF"/><path d="M12.5 15h23M12.5 21h23M24 6c-5 4-5 20 0 24M24 6c5 4 5 20 0 24" fill="none" stroke-width="2"/>' +
      '<rect x="17" y="11" width="4" height="4" fill="#fff" stroke="none"/><rect x="26" y="16" width="4" height="4" fill="#FFD45C" stroke="none"/><path d="M41 6l1.5 3.5L46 11l-3.5 1.5L41 16l-1.5-3.5L36 11l3.5-1.5zM7 30l1 2.5 2.5 1-2.5 1L7 37l-1-2.5-2.5-1 2.5-1z" fill="#FFD45C" stroke-width="1.5"/>'),
    bloom: svg('<path d="M12 27h24l-3 15H15z" fill="#6CCB5F"/><rect x="10" y="24" width="28" height="6" rx="2" fill="#4FB35A"/><path d="M24 24V14" stroke-width="3"/>' +
      '<circle cx="24" cy="10" r="4" fill="#FFD45C"/><circle cx="18" cy="10" r="4.2" fill="#FF7A93"/><circle cx="30" cy="10" r="4.2" fill="#FF7A93"/><circle cx="24" cy="4.5" r="4" fill="#FF7A93"/><circle cx="24" cy="10" r="3.2" fill="#FFD45C"/><path d="M24 20c-5 0-7-3-7-3s4-2 7 0" fill="#A8E06A" stroke-width="2"/>'),
    chill: svg(GRIP + '<rect x="4" y="18" width="24" height="15" rx="7.5" fill="#9FE8FF"/><path d="M28 21l10 2.5v4L28 30z" fill="#F4FBFF"/><path d="M11 18v15M20 18v15" stroke="#fff" stroke-width="3"/>' +
      '<path d="M41 13v18M33 22h16M35.5 16l11 12M46.5 16l-11 12" stroke="#7AF0FF" stroke-width="3"/><path d="M41 13v18M33 22h16M35.5 16l11 12M46.5 16l-11 12" stroke-width="1"/>'),
    splat: svg(GRIP + '<rect x="3" y="22" width="30" height="10" rx="3.5" fill="#1B2A4A"/><rect x="33" y="24" width="9" height="6" rx="2" fill="#F4F7FF"/><circle cx="16" cy="13" r="8.5" fill="#E8FBFF"/>' +
      '<path d="M8 14.5a8 8 0 0 0 16 0z" fill="#A8E06A"/><path d="M45 31c2 3 2 5 0 6.5-2-1.5-2-3.5 0-6.5z" fill="#A8E06A" stroke-width="2"/>' + HL(11, 8, 4, 2.5)),
    roller: svg('<path d="M37 44L28 22" stroke-width="7"/><path d="M37 44L28 22" stroke="#FFF1DC" stroke-width="3"/><path d="M8 17h34" stroke-width="3"/><path d="M8 17v-4M42 17v-4" stroke-width="3"/>' +
      '<rect x="6" y="4" width="38" height="13" rx="6.5" fill="#A8E06A"/><path d="M14 5v11M22 5v11M30 5v11M38 5v11" stroke="#fff" stroke-width="1.6" opacity=".8"/><rect x="2" y="5" width="5" height="11" rx="2" fill="#FFF1DC"/><rect x="43" y="5" width="5" height="11" rx="2" fill="#FFF1DC"/>'),
    prism: svg(GRIP + '<rect x="3" y="17" width="29" height="16" rx="8" fill="#F7F4FF"/><path d="M10 17v16" stroke="#FF5FA2" stroke-width="4"/><path d="M16 17v16" stroke="#FFD45C" stroke-width="4"/>' +
      '<path d="M22 17v16" stroke="#3FD0FF" stroke-width="4"/><rect x="3" y="17" width="29" height="16" rx="8" fill="none"/><rect x="32" y="18" width="7" height="14" rx="2" fill="#B983FF"/>' +
      '<path d="M43 14l1.8 4.2 4.2 1.8-4.2 1.8L43 26l-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#FFD45C" stroke-width="2"/>'),
  };
  const GICONS = {
    scan: svg('<path d="M6 30a18 18 0 0 1 36 0" fill="none" stroke="#39D5FF" stroke-width="3"/><path d="M11 30a13 13 0 0 1 26 0" fill="none" stroke="#39D5FF" stroke-width="3"/>' +
      '<circle cx="24" cy="30" r="10" fill="#FFF1DC"/><rect x="17" y="25.5" width="14" height="9" rx="4.5" fill="#1e1a4d"/><circle cx="24" cy="30" r="2.6" fill="#39D5FF" stroke="none"/><path d="M24 20v-4" stroke-width="2.5"/><circle cx="24" cy="14.5" r="2" fill="#FF5FA2"/>'),
    dome: svg('<path d="M4 38h40" stroke-width="3"/><path d="M7 38a17 17 0 0 1 34 0z" fill="#9FE8FF" fill-opacity=".85"/><path d="M14 27a12 12 0 0 1 8-8" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="24" cy="33" r="3.5" fill="#2EC4B6"/><path d="M33 12l2-5M40 18l4-3" stroke="#39D5FF" stroke-width="3"/>'),
    grapple: svg('<circle cx="34" cy="13" r="8" fill="none" stroke="#39D5FF" stroke-width="6"/><circle cx="34" cy="13" r="8" fill="none" stroke-width="2"/>' +
      '<path d="M8 42c4-6 8 2 12-4s6-12 10-16" fill="none" stroke="#FF5FA2" stroke-width="5"/><path d="M8 42c4-6 8 2 12-4s6-12 10-16" fill="none" stroke-width="1.5"/>'),
    dash: svg('<path d="M10 30a7 7 0 0 1 4-12 9 9 0 0 1 16-2 7 7 0 0 1 6 12z" fill="#fff"/><path d="M20 38h18l-4-4M38 38l-4 4" fill="none" stroke="#39D5FF" stroke-width="3.5"/>' +
      '<path d="M4 26h6M2 32h8" stroke="#9FF6FF" stroke-width="3"/>'),
  };
  W.icon = id => ICONS[id] || ICONS[String(id).replace(/^turf_/, '')] || '';
  W.ICONS = ICONS;
  GG.icon = id => GICONS[id] || '';
  GG.ICONS = GICONS;
})(window.G);

}).call(window); } catch (e) { console.error('[module 16b_weapons_vm.js]', e); }
// ---- 17_enemies.js
try { (function () {
// 17_enemies.js — G.Enemies: the Gizmob robot roster (GDD §7), elite modifier, attack tokens,
// navgrid + steering, readable telegraphs, POP-into-loot deaths and field crates (§8.2).
// Bosses live in 17b_bosses.js, humanoid ranger bots (G.Bot) in 17c_bots.js.
//
// API
//   G.Enemies.defs{id}                 11 robot types (bumbler hopper rollo squirt gnat shieldy lobba
//                                      zapper pinch bruiser tote): hp, speed, tier, clinks, rolls, parts
//                                      (part weights), loot (G.Data.LOOT id), atk{...} tuning, band, spec (art),
//                                      nameKey/descKey (enemy.<id>.name/.desc, owned by 13_data.js).
//   G.Enemies.spawn(world, id, pos, opts) -> Enemy actor (team 1) added to the world.
//       opts {elite, difficulty (id|object), target (Actor), behavior 'roam'|'guard'|'assault'|'patrol',
//             patrol [V3], assaultTarget (Actor, e.g. the fountain core), wave, alerted, home (V3), leash (m),
//             hp (base), hpMult, dmgMult, speedMult, scale, displayName, noLoot, lootMult, heat, dropTypes
//             (tote), team, yaw, popIn (false = no pop-in; robots spawned mid-fight — world.time > 0.5 s — pop in with a sparkle)}
//   enemy.alert(target?) — alert it now (propagates to robots within 12 m).
//   G.Enemies.spawnPinchKing(world, pos, opts) — boss-lite (elite Pinchbot, 800 HP, 1.5x, crown, bossId pinch_king).
//   G.Enemies.spawnCrate(world, kind, pos, opts) kind wood|metal|ammo|health|boom|lumite|gold -> Crate actor
//       (isCrate, noAssist, hidden from aim assist/minimap, noCount; emits bus 'crate-break'(kind, crate)).
//   G.Enemies.difficulty(id?) -> {id, dmg, hp, fire, tele, tokens, aim, react, botDmg, luck}
//   G.Enemies.list(world) / count(world) / crates(world) / tokensInUse(world) / setCap(world, n)
//   G.Enemies.nav(world) -> NavGrid {findPath(sx,sz,gx,gz) -> [V3]|null, blocked(x,z)} (2 m cells, built lazily:
//       call once during mode enter to avoid a first-use hitch on big maps)
//   helpers used by bosses/bots: hurt(src,target,amt,info) blast(world,pos,r,dmg,o) after(world,sec,fn)
//       shockRing(world,src,pos,maxR,speed,dmg,height,color) warnCircle(world,pos,r,dur,color,{follow})
//       beam(world,color,width) puddle(world,pos,r,dur,o) lob(src,from,to,T,o) shoot(src,from,to,o)
//       dataDrop(world,pos,table,opts) dropLoot(world,pos,o) popFx(world,pos,colors,size) alertPop(actor)
//   Actor fields on every robot: enemyId, elite, isBoss(false), isEnemy, tier, displayName, midAttack,
//   telegraphing. Honoured status: stunT, slowT/slowK, atkMult, and the 16_weapons flags frozen / dancing /
//   planted (+ frozenT/danceT/plantT). dmgTakenMult is applied by the weapons module (or here when
//   world.dmgTakenMultBuiltin). Damage to the player is difficulty-scaled by the core ('taken').
(function (G) {
  'use strict';
  const V3 = THREE.Vector3;
  const U = G.util;
  const TAU = Math.PI * 2;
  const E = G.Enemies = G.Enemies || {};
  // Strings: 13_data.js owns enemy.<id>.name/.desc/.tip; register ours only where missing.
  function addMissing(code, dict) {
    const p = (G.i18n.packs && G.i18n.packs[code]) || {};
    const out = {};
    for (const k in dict) if (p[k] == null) out[k] = dict[k];
    G.i18n.add(code, out);
  }
  E.addMissing = addMissing;

  addMissing('en', {
    'enemy.bumbler.name': 'Bumbler', 'enemy.hopper.name': 'Hopper', 'enemy.rollo.name': 'Rollo', 'enemy.squirt.name': 'Squirt',
    'enemy.gnat.name': 'Gnat Sniper', 'enemy.shieldy.name': 'Shieldy', 'enemy.lobba.name': 'Lobba', 'enemy.zapper.name': 'Zapper',
    'enemy.pinch.name': 'Pinchbot', 'enemy.bruiser.name': 'Bruiser', 'enemy.tote.name': 'Tote-copter',
    'enemy.bumbler.desc': 'A buzzy bee-drone that plinks slow pellets. Its antenna glows before it shoots.',
    'enemy.hopper.desc': 'Boing! It crouches, then belly-flops. Shoot it in mid-air for extra damage.',
    'enemy.rollo.desc': 'A striped ball that rolls up close and goes BOOM. Pop it early!',
    'enemy.squirt.desc': 'A goo turret on a tripod. Watch for the landing circle and sidestep.',
    'enemy.gnat.desc': 'A hover sniper with a laser sight. When the laser flashes, dash or hide!',
    'enemy.shieldy.desc': 'Hides behind a heart-shaped plate. Flank it or bounce shots around it.',
    'enemy.lobba.desc': 'Lobs three bombs from far away. Get close and it panics.',
    'enemy.zapper.desc': 'A tesla walker. Jump over its shock rings!',
    'enemy.pinch.desc': 'A tiny crab tank. Its rear vent is the weak spot.',
    'enemy.bruiser.desc': 'Big and grumpy. Jump the slam ring and dodge the charge into a wall.',
    'enemy.tote.desc': 'A delivery copter full of bots. Pop it before it drops them all!',
    'enemy.elite': 'Elite {name}', 'enemy.pinch_king.name': 'Pinchbot King',
    'enemy.crate.wood': 'Wood Crate', 'enemy.crate.metal': 'Metal Crate', 'enemy.crate.ammo': 'Ammo Crate',
    'enemy.crate.health': 'Health Crate', 'enemy.crate.boom': 'Boom Crate', 'enemy.crate.lumite': 'Lumite Crate',
    'enemy.crate.gold': 'Gold Chest',
    'enemy.bot.name': '{adj} {animal} {n}',
    'enemy.botAdj.0': 'Zippy', 'enemy.botAdj.1': 'Bouncy', 'enemy.botAdj.2': 'Fizzy', 'enemy.botAdj.3': 'Sunny',
    'enemy.botAdj.4': 'Wobbly', 'enemy.botAdj.5': 'Sparkly', 'enemy.botAdj.6': 'Comfy', 'enemy.botAdj.7': 'Jolly',
    'enemy.botAdj.8': 'Snappy', 'enemy.botAdj.9': 'Breezy', 'enemy.botAdj.10': 'Peppy', 'enemy.botAdj.11': 'Cozy',
    'enemy.botAdj.12': 'Dizzy', 'enemy.botAdj.13': 'Plucky', 'enemy.botAdj.14': 'Bubbly', 'enemy.botAdj.15': 'Speedy',
    'enemy.botAnimal.0': 'Otter', 'enemy.botAnimal.1': 'Puffin', 'enemy.botAnimal.2': 'Gecko', 'enemy.botAnimal.3': 'Panda',
    'enemy.botAnimal.4': 'Koala', 'enemy.botAnimal.5': 'Turtle', 'enemy.botAnimal.6': 'Bunny', 'enemy.botAnimal.7': 'Seal',
    'enemy.botAnimal.8': 'Ferret', 'enemy.botAnimal.9': 'Penguin', 'enemy.botAnimal.10': 'Hamster', 'enemy.botAnimal.11': 'Lemur',
    'enemy.botAnimal.12': 'Corgi', 'enemy.botAnimal.13': 'Owl', 'enemy.botAnimal.14': 'Crab', 'enemy.botAnimal.15': 'Narwhal',
  });
  addMissing('ja', {
    'enemy.bumbler.name': 'ブンブラー', 'enemy.hopper.name': 'ホッパー', 'enemy.rollo.name': 'ローロ', 'enemy.squirt.name': 'スクワート',
    'enemy.gnat.name': 'ナット・スナイパー', 'enemy.shieldy.name': 'シールディ', 'enemy.lobba.name': 'ロッバ', 'enemy.zapper.name': 'ザッパー',
    'enemy.pinch.name': 'ピンチボット', 'enemy.bruiser.name': 'ブルーザー', 'enemy.tote.name': 'トートコプター',
    'enemy.bumbler.desc': 'ブンブンとぶハチ型ドローン。アンテナが光ったら、ゆっくりなタマをうってくるよ。',
    'enemy.hopper.desc': 'ボヨーン！ しゃがんでからおなかでドスン。ジャンプ中をねらうと大ダメージ！',
    'enemy.rollo.desc': 'しましまボール。ちかよってドカン！ はやめにポップしよう！',
    'enemy.squirt.desc': '三本足のグーほうだい。まるいマークが出たら、よけてね。',
    'enemy.gnat.desc': 'レーザーでねらうスナイパー。レーザーがチカチカしたら、ダッシュかかくれよう！',
    'enemy.shieldy.desc': 'ハートのたてにかくれるロボ。よこやうしろからねらおう。',
    'enemy.lobba.desc': 'とおくからバクダンを3つなげてくる。ちかづくとあわてるよ。',
    'enemy.zapper.desc': 'ビリビリ歩くロボ。でんきのわっかはジャンプでよけよう！',
    'enemy.pinch.desc': 'ちいさなカニせんしゃ。うしろの通気口がよわてん。',
    'enemy.bruiser.desc': 'おおきくてごきげんナナメ。わっかはジャンプ、とっしんはカベにぶつけよう。',
    'enemy.tote.desc': 'ロボをはこぶヘリコプター。ぜんぶおとされるまえにポップしよう！',
    'enemy.elite': 'エリート{name}', 'enemy.pinch_king.name': 'ピンチボットキング',
    'enemy.crate.wood': 'きのはこ', 'enemy.crate.metal': 'メタルのはこ', 'enemy.crate.ammo': 'だんやくばこ',
    'enemy.crate.health': 'かいふくばこ', 'enemy.crate.boom': 'ドカンばこ', 'enemy.crate.lumite': 'ルマイトのはこ',
    'enemy.crate.gold': 'きんのたからばこ',
    'enemy.bot.name': '{adj}{animal}{n}',
    'enemy.botAdj.0': 'すばやい', 'enemy.botAdj.1': 'ぽよぽよ', 'enemy.botAdj.2': 'しゅわしゅわ', 'enemy.botAdj.3': 'ひなたの',
    'enemy.botAdj.4': 'ゆらゆら', 'enemy.botAdj.5': 'きらきら', 'enemy.botAdj.6': 'ふわふわ', 'enemy.botAdj.7': 'にこにこ',
    'enemy.botAdj.8': 'パキパキ', 'enemy.botAdj.9': 'そよかぜ', 'enemy.botAdj.10': 'げんきな', 'enemy.botAdj.11': 'ぬくぬく',
    'enemy.botAdj.12': 'くるくる', 'enemy.botAdj.13': 'ゆうかんな', 'enemy.botAdj.14': 'あわあわ', 'enemy.botAdj.15': 'びゅんびゅん',
    'enemy.botAnimal.0': 'ラッコ', 'enemy.botAnimal.1': 'パフィン', 'enemy.botAnimal.2': 'ヤモリ', 'enemy.botAnimal.3': 'パンダ',
    'enemy.botAnimal.4': 'コアラ', 'enemy.botAnimal.5': 'カメ', 'enemy.botAnimal.6': 'ウサギ', 'enemy.botAnimal.7': 'アザラシ',
    'enemy.botAnimal.8': 'フェレット', 'enemy.botAnimal.9': 'ペンギン', 'enemy.botAnimal.10': 'ハムスター', 'enemy.botAnimal.11': 'キツネザル',
    'enemy.botAnimal.12': 'コーギー', 'enemy.botAnimal.13': 'フクロウ', 'enemy.botAnimal.14': 'カニ', 'enemy.botAnimal.15': 'イッカク',
  });

  // ------------------------------------------------------------------ palette (GDD §2.8)
  const C = E.COLORS = {
    orange: 0xff7a3d, plum: 0x5b3a8c, brass: 0xe8b44a, visor: 0x2a1b3d, idle: 0x5cffe1, alert: 0xffd23f,
    pink: 0xff3f8e, goo: 0x9be15d, elec: 0x7af0ff, gold: 0xffc21a, bubble: 0x9fe8ff, cream: 0xfff1dc, yellow: 0xffd23f,
  };

  // ------------------------------------------------------------------ difficulty (GDD §4.5, §11c)
  const DIFF = {
    // heavy = how many burst attacks (sniper laser, rollo boom, mortar volley, bruiser slam/charge) may be in
    // flight against the player at once; gap = minimum seconds between two robots starting an attack on the
    // player (staggers telegraphs so they stay readable and damage arrives in waves, not in one spike).
    breezy: { dmg: 0.5, hp: 0.7, fire: 0.85, tele: 1.3, tokens: 2, heavy: 1, gap: 0.75, aim: 9, react: 0.9, botDmg: 0.6, luck: 0 },
    normal: { dmg: 1.0, hp: 1.0, fire: 1.0, tele: 1.0, tokens: 3, heavy: 1, gap: 0.45, aim: 5, react: 0.55, botDmg: 1, luck: 0 },
    spicy: { dmg: 1.35, hp: 1.3, fire: 1.15, tele: 1.0, tokens: 4, heavy: 2, gap: 0.3, aim: 3, react: 0.4, botDmg: 1, luck: 10 },
    blazing: { dmg: 1.75, hp: 1.6, fire: 1.3, tele: 0.9, tokens: 5, heavy: 2, gap: 0.18, aim: 1.8, react: 0.3, botDmg: 1, luck: 20 },
  };
  const okNum = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
  E.difficulty = function (id) {
    let over = null;
    if (id && typeof id === 'object') { if (id._resolved) return id; over = id; id = over.id; }
    if (id === 'easy') id = 'breezy'; else if (id === 'hard') id = 'spicy';
    if (!id || !DIFF[id]) id = (G.Data && G.Data.diffId ? G.Data.diffId() : (G.Save && G.Save.data && G.Save.set.difficulty)) || 'normal';
    if (!DIFF[id]) id = 'normal';
    const out = Object.assign({ id, _resolved: true }, DIFF[id]);
    for (const d of [G.Data && G.Data.DIFFICULTY && G.Data.DIFFICULTY[id], over]) {
      if (!d || typeof d !== 'object') continue;
      const pick = (keys, field, lo, hi) => { for (const k of keys) if (okNum(d[k], lo, hi)) { out[field] = d[k]; return; } };
      pick(['enemyDmg', 'enemyDamage', 'dmg', 'damage', 'taken'], 'dmg', 0.05, 10);
      pick(['enemyHp', 'enemyHP', 'hp', 'health'], 'hp', 0.05, 10);
      pick(['enemyFire', 'fireRate', 'fire', 'rate'], 'fire', 0.05, 10);
      pick(['telegraph', 'tele', 'telegraphMult'], 'tele', 0.2, 5);
      pick(['tokens', 'attackTokens'], 'tokens', 1, 20);
      pick(['botAim', 'aimError', 'aim'], 'aim', 0, 45);
      pick(['botReaction', 'reaction', 'react'], 'react', 0, 5);
      pick(['botDmg', 'botDamage'], 'botDmg', 0.05, 10);
      pick(['luck', 'lootShift'], 'luck', 0, 100);
    }
    return out;
  };
  const heatN = h => (Array.isArray(h) ? h.length : (+h || 0));

  // ------------------------------------------------------------------ roster (GDD §7.2)
  // atk values are the GDD numbers; brains below read them. band = preferred distance to target.
  E.defs = {
    bumbler: { tier: 1, hp: 40, speed: 4, fly: true, alt: 3, clinks: [3, 6], rolls: 1, parts: { scrap: 55, wire: 35, chip: 10 },
      atk: { pellet: { dmg: 8, speed: 14, cd: 1.6, range: 20, tele: 0.5 } }, band: [7, 15],
      spec: { body: 'sphere', size: 0.95, color: 0xffa62b, accent: C.plum, metal: C.plum, eyes: 'led1', eyeColor: C.idle, mobility: 'prop', antenna: true, armor: 0.3, seed: 31 } },
    hopper: { tier: 1, hp: 60, speed: 3, clinks: [4, 8], rolls: 1, parts: { spring: 60, scrap: 30, chip: 10 },
      atk: { leap: { dmg: 15, r: 2, dist: 8, air: 1.0, cd: 2.4, tele: 0.6, airMult: 1.5 } }, band: [3, 8],
      spec: { body: 'barrel', size: 1.15, color: C.orange, accent: C.brass, metal: C.plum, eyes: 'led2', eyeColor: C.idle, mobility: 'hop', seed: 32 } },
    rollo: { tier: 1, hp: 30, speed: 7.5, noToken: true, clinks: [2, 5], rolls: 1, parts: { scrap: 50, fuel: 35, chip: 15 },
      atk: { boom: { dmg: 30, r: 3, arm: 2.5, tele: 0.8, popMult: 0.5 } }, band: [0, 2],
      spec: { body: 'sphere', size: 0.85, color: C.orange, accent: C.cream, metal: C.plum, eyes: 'led2', eyeColor: C.idle, mobility: 'ball', antenna: 'fuse', seed: 33 } },
    squirt: { tier: 1, hp: 80, speed: 0, turret: true, turn: Math.PI / 2, immovable: true, clinks: [5, 9], rolls: 1, parts: { gel: 65, scrap: 25, crystal: 10 },
      atk: { lob: { dmg: 12, puddle: 2, slow: 0.3, slowT: 3, cd: 2.0, range: 25, tele: 0.6 } }, band: [0, 25],
      spec: { body: 'egg', size: 1.25, color: C.orange, accent: C.goo, metal: C.plum, eyes: 'visor', eyeColor: C.idle, mobility: 'spider', arms: 'cannon', seed: 34 } },
    gnat: { tier: 2, hp: 70, speed: 3, fly: true, alt: 4.2, clinks: [6, 10], rolls: 1, parts: { lens: 25, wire: 45, chip: 30 },
      atk: { laser: { dmg: 25, range: 50, cd: 4, tele: 1.2, lock: 0.3, relocate: 6 } }, band: [18, 38],
      spec: { body: 'capsule', size: 1.35, color: 0x9be15d, accent: C.brass, metal: C.plum, eyes: 'led1', eyeColor: C.idle, mobility: 'hover', arms: 'rifle', antenna: 'dish', seed: 35 } },
    shieldy: { tier: 2, hp: 120, plate: 150, speed: 3.5, clinks: [8, 14], rolls: 1, parts: { scrap: 50, chip: 30, servo: 20 },
      atk: { bash: { dmg: 18, range: 2.6, cd: 2.5, tele: 0.5 }, blaster: { dmg: 10, rate: 1, cd: 2.0, tele: 0.5, range: 20 }, plate: { arc: 120, regrow: 6, splash: 0.5 } }, band: [2, 9],
      spec: { body: 'box', size: 1.5, color: C.orange, accent: 0xff5fa2, metal: C.plum, eyes: 'led2', eyeColor: C.idle, mobility: 'legs2', arms: 'shield', armor: 0.6, seed: 36 } },
    lobba: { tier: 2, hp: 90, speed: 2.5, clinks: [7, 12], rolls: 1, parts: { fuel: 40, scrap: 35, crystal: 15, chip: 10 },
      atk: { mortar: { dmg: 20, r: 2.5, n: 3, cd: 4, tele: 0.6, warn: 1.0 } }, band: [15, 30],
      spec: { body: 'barrel', size: 1.3, color: C.orange, accent: C.brass, metal: C.plum, eyes: 'led2', eyeColor: C.idle, mobility: 'tread', back: 'none', armor: 0.3, seed: 37 } },   // its big mortar tube is attached in buildRobot (reads from the front)
    zapper: { tier: 2, hp: 110, speed: 3, clinks: [8, 13], rolls: 1, parts: { wire: 50, chip: 30, crystal: 20 },
      atk: { ring: { dmg: 20, r: 6, speed: 8, height: 0.6, cd: 5, tele: 1.0 }, bolt: { dmg: 12, chains: 1, range: 10, cd: 2.5, tele: 0.5 } }, band: [4, 9],
      spec: { body: 'capsule', size: 1.55, color: C.plum, accent: C.elec, metal: 0x3d4470, eyes: 'visor', eyeColor: C.idle, mobility: 'legs2', antenna: true, armor: 0.35, seed: 38 } },
    pinch: { tier: 3, hp: 220, speed: 4, clinks: [15, 25], rolls: 2, parts: { scrap: 50, servo: 30, crystal: 20 },
      atk: { claw: { dmg: 25, range: 2.7, cd: 2.0, tele: 0.6 }, cannon: { dmg: 10, n: 3, speed: 18, cd: 3, tele: 0.5 }, vent: 1.75 }, band: [2, 11],
      spec: { body: 'disc', size: 1.7, color: C.orange, accent: C.brass, metal: C.plum, eyes: 'led2', eyeColor: C.idle, mobility: 'spider', arms: 'cannon', armL: 'claw', armR: 'claw', back: 'tank', armor: 0.5, seed: 39 }, rearCore: true },
    bruiser: { tier: 3, hp: 450, speed: 2.8, immovable: true, clinks: [25, 40], rolls: 2, parts: { scrap: 45, servo: 40, crystal: 10, core: 5 },
      atk: { slam: { dmg: 30, r: 3, ringR: 10, ringSpeed: 8, ringDmg: 15, height: 0.5, cd: 4, tele: 0.9 }, charge: { dmg: 25, speed: 9, cd: 6, tele: 1.0, stun: 1.5 }, battery: 1.75 }, band: [0, 7],
      spec: { body: 'box', size: 2.6, color: C.orange, accent: C.brass, metal: C.plum, eyes: 'led2', eyeColor: C.idle, mobility: 'legs2', arms: 'fist', back: 'tank', armor: 0.85, seed: 40 }, rearCore: true },
    tote: { tier: 3, hp: 300, speed: 5, fly: true, alt: 12, immovable: true, noToken: true, clinks: [20, 35], rolls: 2, parts: { fuel: 40, chip: 35, servo: 15, core: 10 },
      atk: { drop: { n: 3, every: 12, hatch: 2, drops: 3, hub: 1.5 } }, band: [0, 10],
      spec: { body: 'box', size: 2.3, color: C.orange, accent: C.yellow, metal: C.plum, eyes: 'led2', eyeColor: C.idle, mobility: 'prop', back: 'tank', armor: 0.4, seed: 41 } },
  };
  for (const id in E.defs) { E.defs[id].id = id; E.defs[id].loot = id; E.defs[id].nameKey = 'enemy.' + id + '.name'; E.defs[id].descKey = 'enemy.' + id + '.desc'; }
  E.T1 = ['bumbler', 'hopper', 'rollo', 'squirt'];
  E.ids = Object.keys(E.defs);

  // ------------------------------------------------------------------ loot (GDD §7.5, §8.1)
  const PART_RAR = { scrap: 'common', spring: 'common', wire: 'common', gel: 'uncommon', chip: 'uncommon', fuel: 'uncommon', crystal: 'rare', servo: 'rare', lens: 'rare', core: 'epic', lumite: 'epic', claw: 'legendary', heart: 'legendary', medal: 'legendary' };
  const TIER_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const TIER_POOL = { common: ['scrap', 'spring', 'wire'], uncommon: ['gel', 'chip', 'fuel'], rare: ['crystal', 'servo', 'lens'], epic: ['core'], legendary: ['lumite'] };
  const TIER_W = { wood: [70, 25, 5, 0, 0], metal: [45, 33, 17, 5, 0], elite: [30, 35, 25, 9, 1], gold: [20, 35, 30, 12, 3], boss: [0, 20, 40, 28, 12] };
  E.TIER_WEIGHTS = TIER_W;
  function partRarity(id) {
    const p = G.Data && G.Data.PARTS && G.Data.PARTS[id];
    if (p && p.rarity) return p.rarity;
    return PART_RAR[id] || 'common';
  }
  E.partRarity = partRarity;
  // Shift points from common toward rarer tiers (Spicy 10: R+6 E+4; Blazing 20: R+10 E+7 L+3).
  function shiftTiers(w, luck) {
    w = w.slice();
    if (!(luck > 0)) return w;
    const take = Math.min(luck, w[0] + w[1]);
    const fromC = Math.min(take, w[0]); w[0] -= fromC; w[1] -= take - fromC;
    const split = luck >= 20 ? [0, 0, 0.5, 0.35, 0.15] : [0, 0, 0.6, 0.4, 0];
    for (let i = 2; i < 5; i++) w[i] += take * split[i];
    return w;
  }
  function pickW(obj) {
    let tot = 0; for (const k in obj) tot += obj[k];
    if (tot <= 0) return null;
    let r = Math.random() * tot;
    for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
    return Object.keys(obj)[0];
  }
  // One local two-stage roll. o: {weights (part table), tierW (array), luck, minTier, bossPart}
  function rollLocal(o) {
    let tw;
    if (o.tierW) tw = o.tierW.slice();
    else { tw = [0, 0, 0, 0, 0]; for (const id in o.weights) tw[TIER_ORDER.indexOf(partRarity(id))] += o.weights[id]; }
    tw = shiftTiers(tw, o.luck || 0);
    if (o.minTier) for (let i = 0; i < TIER_ORDER.indexOf(o.minTier); i++) tw[i] = 0;
    const tobj = {}; TIER_ORDER.forEach((t, i) => { if (tw[i] > 0) tobj[t] = tw[i]; });
    const tier = pickW(tobj) || 'common';
    if (tier === 'legendary') { const id = o.bossPart || 'lumite'; return { partId: id, rarity: o.bossPart ? 'legendary' : partRarity(id), n: 1 }; }
    const cand = {};
    if (o.weights) for (const id in o.weights) if (partRarity(id) === tier) cand[id] = o.weights[id];
    const id = pickW(cand) || U.pick(TIER_POOL[tier]);
    return { partId: id, rarity: partRarity(id), n: 1 };
  }
  function normLoot(res) {
    const out = [];
    const one = r => {
      if (!r) return;
      if (typeof r === 'string') out.push({ partId: r, rarity: partRarity(r), n: 1 });
      else if (Array.isArray(r)) r.forEach(one);
      else if (typeof r === 'object') {
        const id = r.partId || r.id || r.part;
        if (id) out.push({ partId: id, rarity: r.rarity || r.tier || partRarity(id), n: Math.max(1, Math.min(9, r.n || r.count || r.qty || 1)) });
        else if (r.parts) one(r.parts);
      }
    };
    one(res);
    return out;
  }
  // Roll n parts from a loot table id (G.Data.LOOT when present) with a local GDD fallback.
  // o: {weights, tierW, luck, minTier, bossPart}
  E.rollParts = function (tableId, n, o) {
    o = o || {};
    const out = [];
    for (let i = 0; i < n; i++) {
      let got = null;
      const D = G.Data;
      if (D && typeof D.rollLoot === 'function' && tableId && (!D.LOOT || D.LOOT[tableId])) {
        try {
          // the data module applies the difficulty shift itself; luck here is the player's luck stat only
          got = normLoot(D.rollLoot(tableId, o.extraLuck || 0));
        } catch (e) { got = null; }
        if (got && o.minTier) got = got.filter(r => TIER_ORDER.indexOf(r.rarity) >= TIER_ORDER.indexOf(o.minTier));
      }
      if (!got || !got.length) got = [rollLocal(o)];
      for (const r of got) out.push(r);
    }
    return out;
  };
  const _lv = new V3();
  function spawnPart(world, pos, r) {
    for (let k = 0; k < (r.n || 1); k++) {
      _lv.set(U.rand(-2.5, 2.5), U.rand(5, 8), U.rand(-2.5, 2.5));
      world.pickups.spawn('part', pos, { partId: r.partId, rarity: r.rarity }, _lv);
    }
  }
  E.spawnPart = spawnPart;
  // o: {clinks:[a,b]|n, rolls, table, weights, tierW, elite, lootMult, frozen, luck, ammo, health, minTier}
  // Spawn a G.Data.rollLoot result list ([{type:'bolt', value} | {type:'part', partId, rarity, n}]).
  E.spawnDrops = function (world, pos, list) {
    let bolts = 0;
    for (const e of list || []) {
      if (!e) continue;
      if (e.type === 'bolt') bolts += e.value || 0;
      else if (e.type === 'part' || e.partId) spawnPart(world, pos, { partId: e.partId, rarity: e.rarity || partRarity(e.partId), n: e.n || 1 });
    }
    if (bolts > 0) world.pickups.boltBurst(pos, Math.round(bolts));
  };
  // Full drop from a G.Data loot table (enemy id, 'wood', 'metal', 'gold', 'boss_<id>' ...). Returns false
  // when the data module is not available so callers can use the local GDD fallback.
  E.dataDrop = function (world, pos, table, opts) {
    const D = G.Data;
    if (!D || typeof D.rollLoot !== 'function' || !D.LOOT || !D.LOOT[table]) return false;
    let list = null;
    try { list = D.rollLoot(table, opts || {}); } catch (e) { console.warn('[enemies] rollLoot failed', e); return false; }
    if (!Array.isArray(list)) return false;
    E.spawnDrops(world, pos, list);
    return true;
  };
  E.dropLoot = function (world, pos, o) {
    o = o || {};
    if (!world || !world.pickups) return;
    let cl = Array.isArray(o.clinks) ? U.randInt(o.clinks[0], o.clinks[1]) : (o.clinks || 0);
    cl *= (o.elite ? 3 : 1) * (o.frozen ? 1.5 : 1) * (o.lootMult || 1);
    if (cl > 0) world.pickups.boltBurst(pos, Math.round(cl));
    const n = o.rolls || 0;
    if (n > 0) {
      let weights = o.weights;
      if (o.elite && weights) { weights = Object.assign({}, weights); weights.core = (weights.core || 0) + 15; }
      for (const r of E.rollParts(o.elite ? null : o.table, n, { weights, tierW: o.tierW, luck: o.luck, minTier: o.minTier })) spawnPart(world, pos, r);
    }
    if (o.elite) for (const r of E.rollParts('elite', 1, { tierW: TIER_W.elite, luck: o.luck, minTier: 'rare', weights: o.weights })) spawnPart(world, pos, r);
    if (o.ammo != null ? Math.random() < o.ammo : false) world.pickups.spawn('ammo', pos, { value: 0.15, others: 0.05 });
    if (o.health != null ? Math.random() < o.health : false) world.pickups.spawn('health', pos, { value: 25 });
  };

  // ------------------------------------------------------------------ shared textures / geometry
  const shared = g => { g.userData.shared = true; return g; };
  const GEO = {};
  function geo(name) {
    if (GEO[name]) return GEO[name];
    let g;
    switch (name) {
      case 'circ': g = new THREE.CircleGeometry(1, 36).rotateX(-Math.PI / 2); break;
      case 'ring': g = new THREE.RingGeometry(0.86, 1, 44).rotateX(-Math.PI / 2); break;
      case 'band': g = new THREE.CylinderGeometry(1, 1, 1, 44, 1, true).translate(0, 0.5, 0); break;
      case 'beam': g = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0); break;
      case 'sph': g = new THREE.SphereGeometry(1, 20, 14); break;
      case 'tor': g = new THREE.TorusGeometry(1, 0.09, 6, 26).rotateX(Math.PI / 2); break;
      case 'cone': g = new THREE.ConeGeometry(1, 1, 6); break;
      default: g = new THREE.BoxGeometry(1, 1, 1);
    }
    return (GEO[name] = shared(g));
  }
  E._geo = geo;
  const TEX = {};
  function chipTex() {
    if (TEX.chip) return TEX.chip;
    TEX.chip = G.R.canvasTex(64, 64, (g) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = '#2a1b3d'; g.lineWidth = 4;
      for (let i = 0; i < 3; i++) { const p = 20 + i * 12; g.beginPath(); g.moveTo(p, 6); g.lineTo(p, 14); g.moveTo(p, 50); g.lineTo(p, 58); g.moveTo(6, p); g.lineTo(14, p); g.moveTo(50, p); g.lineTo(58, p); g.stroke(); }
      g.fillStyle = '#3fe0a0'; g.beginPath(); g.moveTo(18, 12); g.arcTo(52, 12, 52, 52, 7); g.arcTo(52, 52, 12, 52, 7); g.arcTo(12, 52, 12, 12, 7); g.arcTo(12, 12, 52, 12, 7); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#2a1b3d'; g.beginPath(); g.arc(25, 28, 3.6, 0, TAU); g.arc(39, 28, 3.6, 0, TAU); g.fill();
      g.beginPath(); g.lineWidth = 3.5; g.arc(32, 34, 8, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,120,170,0.7)'; g.beginPath(); g.arc(20, 37, 3.5, 0, TAU); g.arc(44, 37, 3.5, 0, TAU); g.fill();
    });
    TEX.chip.userData.shared = true;
    return TEX.chip;
  }
  function alertTex() {
    if (TEX.alert) return TEX.alert;
    TEX.alert = G.R.canvasTex(64, 64, (g) => {
      g.fillStyle = '#ffd23f'; g.strokeStyle = '#2a1b3d'; g.lineWidth = 5;
      g.beginPath(); g.arc(32, 32, 26, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#2a1b3d'; g.beginPath(); g.moveTo(27, 13); g.lineTo(37, 13); g.lineTo(34, 38); g.lineTo(30, 38); g.closePath(); g.fill();
      g.beginPath(); g.arc(32, 47, 4.5, 0, TAU); g.fill();
    });
    TEX.alert.userData.shared = true;
    return TEX.alert;
  }
  // Wind-up icon: hot-pink badge with a white "!" (yellow "!" = alerted, pink = attack incoming).
  function teleTex() {
    if (TEX.tele) return TEX.tele;
    TEX.tele = G.R.canvasTex(64, 64, (g) => {
      g.fillStyle = '#ff3f8e'; g.strokeStyle = '#2a1b3d'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(32, 5); g.lineTo(59, 52); g.lineTo(5, 52); g.closePath(); g.lineJoin = 'round'; g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(28, 20); g.lineTo(36, 20); g.lineTo(34, 38); g.lineTo(30, 38); g.closePath(); g.fill();
      g.beginPath(); g.arc(32, 45, 3.6, 0, TAU); g.fill();
    });
    TEX.tele.userData.shared = true;
    return TEX.tele;
  }
  let _teleMat = null;
  function teleIcon(world) {
    const s = sys(world);
    let sp = (s.teleIcons || (s.teleIcons = [])).pop();
    if (!sp) {
      if (!_teleMat) { _teleMat = new THREE.SpriteMaterial({ map: teleTex(), transparent: true, depthWrite: false, sizeAttenuation: false }); _teleMat.userData.shared = true; }
      sp = new THREE.Sprite(_teleMat); sp.renderOrder = 19; sp.name = 'teleIcon';
    }
    world.scene.add(sp);
    return sp;
  }
  function teleIconFree(world, sp) { if (!sp) return; if (sp.parent) sp.parent.remove(sp); const s = world._esys; if (s && s.teleIcons) s.teleIcons.push(sp); }
  E.alertTex = alertTex; E.chipTex = chipTex; E.teleTex = teleTex;
  // Telegraph circle = ONE disc mesh (was 3): faint base + growing fill (normal blend) + pulsing additive rim,
  // composited in one premultiplied-alpha pass.
  const WARN_FS = [
    'uniform vec3 uColor; uniform float uK, uPulse; varying vec2 vP;',
    'void main(){',
    '  float r = length(vP);',
    '  float a = 0.12 + 0.08 * uPulse;',
    '  float f = (1.0 - smoothstep(uK - 0.015, uK, r)) * (0.28 + 0.2 * uK);',
    '  a = a + f * (1.0 - a);',
    '  float e = smoothstep(0.85, 0.87, r) * (0.55 + 0.45 * uPulse);',
    '  vec3 c = linearToOutputTexel(vec4(uColor, 1.0)).rgb;',
    '  gl_FragColor = vec4(c * (a + e), a);',
    '}'].join('\n');
  // Every telegraph circle of a world = ONE instanced draw call (was one mesh each: a Blazing brawl showed 8+ at
  // once). WARN_FS's look; colour / fill / pulse are per-instance attributes.
  const WARN_CAP = 48;
  const WARN_IVS = ['attribute vec3 iColor; attribute vec2 iKP; varying vec2 vP; varying vec3 vC; varying vec2 vKP;',
    'void main(){ vP = position.xz; vC = iColor; vKP = iKP; vec4 p = vec4(position, 1.0);',
    '#ifdef USE_INSTANCING', ' p = instanceMatrix * p;', '#endif',
    ' gl_Position = projectionMatrix * modelViewMatrix * p; }'].join('\n');
  const WARN_IFS = WARN_FS.replace('uniform vec3 uColor; uniform float uK, uPulse; varying vec2 vP;', 'varying vec2 vP; varying vec3 vC; varying vec2 vKP;')
    .replace('void main(){', 'void main(){ vec3 uColor = vC; float uK = vKP.x, uPulse = vKP.y;');
  function warnLayer(s) {
    if (s.warnIM) return s.warnIM;
    const g = geo('circ').clone();
    g.userData = {}; // per-world copy: disposed with the world (the cached original stays shared)
    g.setAttribute('iColor', new THREE.InstancedBufferAttribute(new Float32Array(WARN_CAP * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iKP', new THREE.InstancedBufferAttribute(new Float32Array(WARN_CAP * 2), 2).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({ vertexShader: WARN_IVS, fragmentShader: WARN_IFS, transparent: true, premultipliedAlpha: true, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    mat.forceSinglePass = true;
    const im = new THREE.InstancedMesh(g, mat, WARN_CAP);
    im.name = 'warnCircles'; im.count = 0; im.frustumCulled = false; im.renderOrder = 3;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    s.world.scene.add(im);
    return (s.warnIM = im);
  }
  // Pack the live circles into the instance buffers (called after every tick and when a circle starts).
  function writeWarns(s) {
    const im = s.warnIM; if (!im) return;
    const M = im.instanceMatrix.array, CA = im.geometry.attributes.iColor, KA = im.geometry.attributes.iKP;
    let n = 0;
    for (const c of s.warns) {
      if (n >= WARN_CAP) break;
      const o = n * 16;
      M[o] = c.r; M[o + 1] = 0; M[o + 2] = 0; M[o + 3] = 0; M[o + 4] = 0; M[o + 5] = 1; M[o + 6] = 0; M[o + 7] = 0;
      M[o + 8] = 0; M[o + 9] = 0; M[o + 10] = c.r; M[o + 11] = 0; M[o + 12] = c.gx; M[o + 13] = c.gy; M[o + 14] = c.gz; M[o + 15] = 1;
      CA.array[n * 3] = c.col.r; CA.array[n * 3 + 1] = c.col.g; CA.array[n * 3 + 2] = c.col.b;
      KA.array[n * 2] = c.k; KA.array[n * 2 + 1] = c.pulse;
      n++;
    }
    im.count = n; im.visible = n > 0;
    if (n) { im.instanceMatrix.needsUpdate = true; CA.needsUpdate = true; KA.needsUpdate = true; }
  }
  function transMat(color, opacity, additive) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  }

  // Elite bubble shells of every robot in a world = ONE instanced draw call (was one mesh per elite). Each robot
  // keeps an invisible transform node (rb.extras.bubble) that _animate() poses; the layer copies the node's world
  // matrix right before the scene renders (after three updated the world matrices).
  const BUB_CAP = 40;
  function bubbleLayer(s) {
    if (s.bub || !G.Geo || !G.Geo.onSceneRender) return;
    const mat = G.M.toon(C.bubble, { transparent: true, opacity: 0.32, rimStr: 1.3, rimPow: 1.6, rimColor: 0xffffff, spec: 0.9, side: THREE.FrontSide });
    const im = new THREE.InstancedMesh(geo('sph'), mat, BUB_CAP);
    im.name = 'eliteBubbles'; im.count = 0; im.frustumCulled = false; im.renderOrder = 7;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    s.world.scene.add(im);
    s.bub = im;
    G.Geo.onSceneRender(s.world.scene, () => {
      let n = 0;
      for (const r of s.robots) {
        const b = r.rb && r.rb.extras && r.rb.extras.bubble;
        if (!b || !b.userData.on || !r.alive || !r.mesh || !r.mesh.visible || n >= BUB_CAP) continue;
        im.setMatrixAt(n++, b.matrixWorld);
      }
      im.count = n; im.visible = n > 0;   // no empty instanced draw call while there is no elite
      if (n) im.instanceMatrix.needsUpdate = true;
    });
  }
  // Called for every new World while its mode is still loading (G.World.created): sets up the enemy layers
  // and parks hidden stand-ins for the materials robots use — telegraph circles, elite bubbles, the ring /
  // puddle material, the screen-space "!" badge and one robot rig (its skinned char material + LED face) —
  // so the load warm-up compiles them and the first robot / telegraph mid-fight costs no shader compile.
  // Skipped for the town, title and rally (no robots there).
  const NO_PREWARM = { hub: 1, title: 1, race: 1 };
  E.prewarm = function (world, force) {
    if (!world || world._ePrewarm || !world.scene) return;
    if (!force && G.Game && NO_PREWARM[G.Game.modeId]) return;
    world._ePrewarm = true;
    const s = sys(world);
    warnLayer(s);
    focusExpr();   // its one-time face probe draws two LED textures: now, not at the first wind-up
    // every kind's fight faces (the pink 'focused' wind-up face, alert '!', hurt, blink...): drawn and uploaded now
    if (G.Geo && G.Geo.prewarmFaces) for (const id in E.defs) { const d = E.defs[id]; if (d && d.spec) G.safe('prewarm faces ' + id, () => G.Geo.prewarmFaces(d.spec)); }
    const keep = o => { o.visible = false; o.name = 'enemyPrewarm'; world.scene.add(o); return o; };
    keep(new THREE.Mesh(geo('ring'), transMat(0xffffff, 0.5, true)));
    if (!_teleMat) { _teleMat = new THREE.SpriteMaterial({ map: teleTex(), transparent: true, depthWrite: false, sizeAttenuation: false }); _teleMat.userData.shared = true; }
    keep(new THREE.Sprite(_teleMat));
    if (G.Geo && G.Geo.robot) {
      const rb = G.safe('prewarm robot', () => buildRobot(E.defs.bumbler, 1, false));
      if (rb) {
        rb.group.position.set(0, -400, 0); keep(rb.group);
        // the warm-up draw gives its skeleton a bone texture that disposeTree does not free
        (world._onDispose || (world._onDispose = [])).push(() => rb.dispose());
      }
    }
  };

  // ------------------------------------------------------------------ per-world system
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _q = new THREE.Quaternion();
  const UPV = new V3(0, 1, 0);
  function sys(world) {
    if (world._esys) return world._esys;
    const s = world._esys = { world, holders: new Set(), heavy: new Set(), tokMax: 3, heavyMax: 1, gap: 0.45, nextAtkT: 0, warns: [], warnIM: null, rings: [], puddles: [], timers: [], robots: [], crates: [], nav: null, pathBudget: 3 };
    world.onUpdate(dt => G.safe('enemy-sys', () => tickSys(s, dt)));
    bubbleLayer(s);
    return s;
  }
  E.sys = sys;
  function tickSys(s, dt) {
    const w = s.world;
    s.pathBudget = 3;
    // crowd size for the distance LOD (Enemy._lod): live robots within 45 m of the camera (index loop, no garbage)
    let crowd = 0;
    const cp = G.R && G.R.camera ? G.R.camera.position : null;
    if (cp) for (let i = 0; i < s.robots.length; i++) { const r = s.robots[i]; if (!r.alive || r.isBoss) continue; const dx = r.pos.x - cp.x, dz = r.pos.z - cp.z; if (dx * dx + dz * dz < 2025) crowd++; }
    s.crowd = crowd;
    for (const h of s.holders) if (!h.alive || h.dead || !h.atk) s.holders.delete(h);
    for (const h of s.heavy) if (!h.alive || h.dead || !h.atk) s.heavy.delete(h);
    // telegraph circles (drawn by the shared instanced layer)
    for (let i = s.warns.length - 1; i >= 0; i--) {
      const c = s.warns[i];
      c.t += dt;
      c.k = Math.max(0.01, U.clamp(c.t / c.dur, 0, 1));
      c.pulse = 0.5 + 0.5 * Math.sin(c.t * 6 * TAU);
      if (c.follow && c.follow.alive && !c.locked) { c.pos.x = U.damp(c.pos.x, c.follow.pos.x, 6, dt); c.pos.z = U.damp(c.pos.z, c.follow.pos.z, 6, dt); }
      c.gx = c.pos.x; c.gy = w.phys.groundAt(c.pos.x, c.pos.z, 0.1, c.pos.y + 3) + 0.06; c.gz = c.pos.z;
      if (c.t >= c.dur + (c.hold || 0.06) || c.killed) s.warns.splice(i, 1);
    }
    if (s.warnIM) writeWarns(s);
    // shockwave rings
    for (let i = s.rings.length - 1; i >= 0; i--) {
      const g = s.rings[i];
      g.r += g.speed * dt;
      const k = g.r / g.maxR;
      g.band.scale.set(g.r, g.height, g.r);
      g.flat.scale.setScalar(g.r);
      g.band.material.opacity = 0.75 * (1 - k * k);
      g.flat.material.opacity = 0.6 * (1 - k);
      for (const a of w.actors) {
        if (!a.alive || !a.targetable || a.isCrate || g.hit.has(a) || (g.src && a.team === g.src.team) || a === g.src) continue;
        const d = Math.hypot(a.pos.x - g.pos.x, a.pos.z - g.pos.z);
        if (Math.abs(d - g.r) > 0.55 + Math.min(1, a.r * 0.5)) continue;
        if (a.pos.y - g.pos.y > g.height || a.pos.y + a.h < g.pos.y - 0.2) continue;
        g.hit.add(a);
        _a.set(a.pos.x - g.pos.x, 0.3, a.pos.z - g.pos.z).normalize();
        E.hurt(g.src, a, g.dmg, { type: 'shock', pos: g.pos.clone(), dir: _a.clone(), knock: 5 });
      }
      if (g.r >= g.maxR) { w.scene.remove(g.group); g.band.material.dispose(); g.flat.material.dispose(); s.rings.splice(i, 1); }
    }
    // goo puddles
    for (let i = s.puddles.length - 1; i >= 0; i--) {
      const p = s.puddles[i];
      p.t += dt;
      const fade = U.clamp((p.dur - p.t) / 0.6, 0, 1);
      p.mesh.material.opacity = 0.85 * fade;
      p.mesh.scale.setScalar(p.r * U.clamp(p.t / 0.15, 0.3, 1));
      for (const a of w.actors) {
        if (!a.alive || a.isCrate || (p.team != null && a.team === p.team) || !a.grounded) continue;
        if (Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) > p.r + a.r * 0.5) continue;
        a.slowT = Math.max(a.slowT || 0, p.slowT);
        a.slowK = Math.min(a.slowK || 1, p.slowK);
      }
      if (p.t >= p.dur) { w.scene.remove(p.mesh); p.mesh.material.dispose(); s.puddles.splice(i, 1); }
    }
    // delayed callbacks
    for (let i = s.timers.length - 1; i >= 0; i--) {
      const t = s.timers[i];
      t.t -= dt;
      if (t.t <= 0) { s.timers.splice(i, 1); G.safe('enemy-timer', t.fn); }
    }
  }
  E.after = function (world, sec, fn) { sys(world).timers.push({ t: sec, fn }); };

  // ------------------------------------------------------------------ combat helpers
  // Difficulty-aware damage from an enemy-side source. The core already scales damage taken by the
  // player through G.Data.difficultyMult('taken'), so only non-player targets get src.dmgK here.
  // Mercy window (fair for kids): robot damage to the player beyond this much per second is cut by 65%, so a
  // pile of attacks landing together can't erase a full health bar in one beat. Bosses (big telegraphed hits)
  // and Blazing are exempt.
  const MERCY = { breezy: 18, normal: 32, spicy: 46 };
  E.hurt = function (src, target, amount, info) {
    if (!target || !target.alive || !(amount > 0)) return null;
    if (target.isPlayer && ((target.dashT || 0) > 0 || (target.iframeT || 0) > 0)) return null;
    let k = src && src.dmgExtra != null ? src.dmgExtra : 1;
    const coreScales = target.isPlayer && G.Data && typeof G.Data.difficultyMult === 'function';
    if (!coreScales && src && src.dmgK != null) k *= src.dmgK;
    info = info || {};
    info.src = src || info.src || null;
    if (!info.pos && src && src.pos) info.pos = src.pos.clone();
    const w = (src && src.world) || (target && target.world);
    if (!w) return null;
    if (target.isPlayer && src && !src.isBoss && src.diff && MERCY[src.diff.id]) {
      const s = sys(w), cap = MERCY[src.diff.id];
      if (w.time - (s.mercyT || -9) > 1) { s.mercyT = w.time; s.mercyDmg = 0; }
      const taken = coreScales ? (G.Data.difficultyMult('taken') || 1) : 1;
      const est = amount * k * taken, over = s.mercyDmg + est - cap;
      if (over > 0) k *= 1 - 0.65 * Math.min(1, over / est);
      s.mercyDmg += amount * k * taken;
    }
    return w.damage(target, amount * k, info);
  };
  // Radial blast. o: {src, friendly, color, knock, fx:false, los:true, ring}
  E.blast = function (world, pos, radius, dmg, o) {
    o = o || {};
    if (o.fx !== false) world.fx.explosion(pos, radius, o.color);
    const src = o.src || null;
    for (const a of world.actors) {
      if (!a.alive || !a.targetable || a === src) continue;
      if (src && a.team === src.team && !o.friendly) continue;
      const c = a.aimPoint(_b);
      const d = Math.max(0, c.distanceTo(pos) - a.r);
      if (d > radius) continue;
      if (o.los !== false && d > radius * 0.35 && !world.phys.los(pos, c, false)) continue;
      const k = 1 - 0.6 * U.clamp(d / radius, 0, 1);
      _c.copy(c).sub(pos); if (_c.lengthSq() < 1e-4) _c.set(0, 1, 0);
      E.hurt(src, a, dmg * k, { type: 'explosion', pos: pos.clone(), dir: _c.clone(), knock: (o.knock != null ? o.knock : 6) * k, friendly: !!o.friendly });
    }
    const pl = world.player;
    if (pl && o.fx !== false) { const d = pl.pos.distanceTo(pos); if (d < radius * 3) world.fx.shake(0.45 * (1 - d / (radius * 3))); }
  };
  // Flat telegraph circle on the ground. Returns a handle {pos, kill(), lock(), follow}.
  // A fresh handle per circle (a pooled handle could be kill()ed by a stale owner after reuse).
  E.warnCircle = function (world, pos, radius, dur, color, opts) {
    const s = sys(world);
    warnLayer(s);
    const c = { pos: new V3().copy(pos), col: new THREE.Color(color != null ? color : C.pink), r: radius, dur: Math.max(0.05, dur), t: 0, k: 0.01, pulse: 0,
      killed: false, locked: false, follow: opts && opts.follow || null, hold: opts && opts.hold || 0.06 };
    c.kill = () => { c.killed = true; };
    c.lock = () => { c.locked = true; };
    c.gx = c.pos.x; c.gy = world.phys.groundAt(c.pos.x, c.pos.z, 0.1, c.pos.y + 3) + 0.06; c.gz = c.pos.z;
    s.warns.push(c);
    writeWarns(s);
    return c;
  };
  // Expanding ground shockwave (jump it). Damages hostile actors whose feet are below `height`.
  E.shockRing = function (world, src, pos, maxR, speed, dmg, height, color) {
    const s = sys(world);
    color = color != null ? color : C.elec;
    const group = new THREE.Group();
    const band = new THREE.Mesh(geo('band'), transMat(color, 0.75, true));
    const flat = new THREE.Mesh(geo('ring'), transMat(color, 0.6, true));
    flat.position.y = 0.04;
    group.add(band, flat);
    const gy = world.phys.groundAt(pos.x, pos.z, 0.2, pos.y + 2);
    group.position.set(pos.x, gy + 0.02, pos.z);
    world.scene.add(group);
    const g = { group, band, flat, pos: new V3(pos.x, gy, pos.z), r: 0.4, maxR, speed, dmg, height: height || 0.6, src, hit: new Set() };
    s.rings.push(g);
    return g;
  };
  // Goo puddle: slows hostile grounded actors. o: {slowK, slowT, team, color}
  E.puddle = function (world, pos, radius, dur, o) {
    o = o || {};
    const s = sys(world);
    const g = G.Geo && G.Geo.splatGeo ? G.Geo.splatGeo() : null;
    const mat = transMat(o.color != null ? o.color : C.goo, 0.85);
    const mesh = new THREE.Mesh(g || geo('circ'), mat);
    const gy = world.phys.groundAt(pos.x, pos.z, 0.2, pos.y + 2);
    mesh.position.set(pos.x, gy + 0.05, pos.z);
    if (g) { mesh.rotation.x = -Math.PI / 2; mesh.rotateZ(Math.random() * TAU); } else mesh.rotation.y = Math.random() * TAU;
    mesh.renderOrder = 2;
    world.scene.add(mesh);
    s.puddles.push({ mesh, pos: new V3(pos.x, gy, pos.z), r: radius, dur: dur || 4, t: 0, slowK: o.slowK != null ? o.slowK : 0.7, slowT: o.slowT != null ? o.slowT : 3, team: o.team });
  };
  // Glowing beam between two points (laser sights, boss lasers). Drawn as a soft camera-facing strip with the
  // FX ribbon shader (G.Weapons.Ribbon → G.FX.ribbonMaterial): the same program as every projectile trail, so
  // a beam never compiles a material mid-fight, and it fades right at the lens. width = radius (soft strip 2.6×).
  // Returns {set(a,b), opacity(v), width(v), color(hex), kill()}.
  E.beam = function (world, color, width, additive) {
    const RB = G.Weapons && G.Weapons.Ribbon;
    if (RB && G.FX && G.FX.ribbonMaterial) {
      const rib = new RB(world.scene, 2, color != null ? color : C.pink, (width || 0.04) * 2.6, 0.9);
      rib.taper = false;
      // a danger beam must read on a bright sky: cover more of the background than a glowing trail does
      if (rib.mat.uniforms && rib.mat.uniforms.uOver) rib.mat.uniforms.uOver.value = 0.65;
      let on = false;
      const h = {
        mesh: rib.mesh,
        set(a, b) { rib.pts[0].copy(a); rib.pts[1].copy(b); rib.draw(2); on = true; return h; },
        opacity(v) { rib.setOpacity(v); return h; },
        width(v) { rib.width = v * 2.6; if (on) rib.draw(2); return h; },
        color(c) { const u = rib.mat.uniforms && rib.mat.uniforms.uColor; if (u) u.value.set(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255); return h; },
        kill() { if (rib.mesh.parent) rib.mesh.parent.remove(rib.mesh); rib.geo.dispose(); rib.mat.dispose(); },
      };
      return h;
    }
    const mat = transMat(color, 0.9, !!additive);
    const m = new THREE.Mesh(geo('beam'), mat);
    m.renderOrder = 6;
    m.frustumCulled = false;
    world.scene.add(m);
    let w = width || 0.04;
    const h = {
      mesh: m,
      set(a, b) {
        _d.copy(b).sub(a); const len = _d.length() || 1e-3;
        _q.setFromUnitVectors(UPV, _d.multiplyScalar(1 / len));
        m.quaternion.copy(_q); m.position.copy(a); m.scale.set(w, len, w);
        return h;
      },
      opacity(v) { mat.opacity = v; return h; },
      width(v) { w = v; m.scale.x = m.scale.z = v; return h; },
      color(c) { mat.color.setHex(c); return h; },
      kill() { if (m.parent) m.parent.remove(m); mat.dispose(); },
    };
    return h;
  };
  // Straight projectile from `from` toward point `to`. o: {speed, dmg, color, size, kind, life, radius, spread, onImpact}
  E.shoot = function (src, from, to, o) {
    o = o || {};
    const w = src.world;
    const dir = _d.copy(to).sub(from).normalize();
    if (o.spread) { dir.x += U.rand(-o.spread, o.spread); dir.y += U.rand(-o.spread, o.spread) * 0.5; dir.z += U.rand(-o.spread, o.spread); dir.normalize(); }
    const dmg = o.dmg || 0, color = o.color != null ? o.color : C.pink;
    return w.projectiles.spawn({
      pos: from, dir: dir.clone(), speed: o.speed || 14, gravity: o.gravity || 0, life: o.life || 3, radius: o.radius || 0.18,
      damage: 0, src, team: src.team, color, size: o.size || 0.16, kind: o.kind || 'orb', trail: true, homing: o.homing || 0, spin: o.spin || 0,
      onHit(p, hit, world) {
        if (hit.actor) {
          if (hit.actor.isCrate) return false;
          E.hurt(src, hit.actor, dmg, { type: 'proj', pos: src.pos ? src.pos.clone() : p.pos.clone(), dir: p.vel.clone().normalize(), knock: o.knock || 1.5 });
          world.fx.sparks(p.pos, color, 6);
          if (o.onImpact) o.onImpact(p.pos, hit);
          return false;
        }
        if (o.onImpact) { o.onImpact(p.pos, hit); return false; }
        return undefined;
      },
    });
  };
  // Ballistic lob that lands at `to` after T seconds (with a ground warning circle shown for T).
  // o: {dmg, r, color, kind, size, gravity, warn:false, onImpact(pos), friendly}
  E.lob = function (src, from, to, T, o) {
    o = o || {};
    const w = src.world;
    const g = o.gravity || 16;
    const vel = new V3((to.x - from.x) / T, (to.y - from.y) / T + 0.5 * g * T, (to.z - from.z) / T);
    const color = o.color != null ? o.color : 0xff9a3d;
    const warn = o.warn === false ? null : E.warnCircle(w, to, o.r || 2, T, o.warnColor != null ? o.warnColor : C.pink);
    let done = false;
    const impact = (pos) => {
      if (done) return; done = true;
      if (warn) warn.kill();
      if (o.onImpact) o.onImpact(pos);
      else E.blast(w, pos, o.r || 2, o.dmg || 0, { src, color, friendly: o.friendly, knock: o.knock != null ? o.knock : 5 });
    };
    return w.projectiles.spawn({
      pos: from, vel, gravity: g, life: T + 1.5, radius: 0.25, damage: 0, src, team: src.team, color, size: o.size || 0.3, kind: o.kind || 'grenade',
      spin: 6, trail: true,
      onHit(p, hit) { if (hit.actor && hit.actor.isCrate) return false; impact(p.pos.clone()); return false; },
      onTick(p) { if (p.life <= 0.02 && !done) impact(p.pos.clone()); },
    });
  };
  // Melee strike in front of an enemy: target within range and arc (deg) gets dmg + knock.
  E.melee = function (e, range, arcDeg, dmg, knock) {
    const t = e.target; if (!t || !t.alive) return false;
    const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z, d = Math.hypot(dx, dz);
    if (d - (t.r || 0.4) > range) return false;
    if (Math.abs(t.pos.y - e.pos.y) > Math.max(2.2, e.h)) return false;
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
    if (d > 0.3 && (dx * fx + dz * fz) / d < Math.cos(arcDeg * Math.PI / 360)) return false;
    _a.set(dx, 0, dz).normalize();
    E.hurt(e, t, dmg, { type: 'melee', dir: _a.clone(), knock: knock || 6 });
    e.world.fx.sparks(_b.set(t.pos.x, t.pos.y + 1, t.pos.z), 0xffffff, 10);
    return true;
  };
  // POP burst (GDD §2.8): the robot pops into its parts and stars — body-coloured blobs, chunky toon bits that
  // bounce on the floor, twinkling stars, a quick shock ring + ground ring, confetti and sparks. Even the
  // smallest T1 pop spreads ≥ 1.2 m so it reads at 10 m on a phone; the white flash is kept small and short
  // so it never hides the robots fighting behind it.
  const POP_STARS = [0xfff3a0, 0xffffff, 0xffd23f];
  E.popFx = function (world, pos, colors, size) {
    size = size || 1;
    const fx = world.fx, k = Math.max(0.85, size);
    fx.burst(pos, colors, Math.round(24 * Math.min(2, size)), 3.5 + 5 * Math.min(1.6, size), 0.3 * Math.max(0.8, size * 0.8), 0.5, { grav: 9, drag: 1.5 });
    if (fx.debris) fx.debris(pos, colors, Math.round(7 + 5 * Math.min(2, size)), 4.2 + 2.2 * Math.min(1.5, size));
    if (fx.sparkle) { fx.sparkle(pos, POP_STARS[0], Math.round(4 + 3 * Math.min(2, size)), 0.36 * k); fx.sparkle(pos, POP_STARS[2], 2, 0.5 * k); }
    if (fx.shock) fx.shock(pos, 1.25 * k, 0xffffff, 0.22, 0.7);
    fx.ring(pos, 3 * size, colors[0], 0.22, pos.y - 0.4 * size);
    fx.confetti(pos, Math.round(26 * Math.min(2.5, size)));
    fx.sparks(pos, 0xffffff, 10);
    fx.flash(pos, 0xffffff, 1.8 * size, 0.1);
  };
  // Smiling brain-chip that floats up 2 m and fades ("it just reboots at the factory").
  E.chipFloat = function (world, pos, scale) {
    const mat = new THREE.SpriteMaterial({ map: chipTex(), transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    const s0 = 0.55 * (scale || 1);
    sp.position.copy(pos); sp.scale.setScalar(s0);
    const y0 = pos.y;
    world.fx.timed(sp, 1.3, (k, o) => { o.position.y = y0 + 2 * Math.sqrt(k); o.material.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; o.material.rotation = Math.sin(k * 9) * 0.25; o.scale.setScalar(s0 * (k < 0.12 ? k / 0.12 : 1)); });
  };
  // "!" pop above an actor's head for 0.45 s.
  E.alertPop = function (actor, height) {
    const w = actor.world;
    const mat = new THREE.SpriteMaterial({ map: alertTex(), transparent: true, depthWrite: false, depthTest: false });
    const sp = new THREE.Sprite(mat);
    sp.renderOrder = 20;
    const hh = height != null ? height : actor.h + 0.55;
    w.fx.timed(sp, 0.55, (k, o) => {
      o.position.set(actor.pos.x, actor.pos.y + hh + k * 0.3, actor.pos.z);
      const s = k < 0.15 ? 0.2 + 5 * k : k > 0.8 ? (1 - k) * 5 : 0.95 + 0.05 * Math.sin(k * 30);
      o.scale.setScalar(0.75 * s);
    });
  };
  function sfx(name, pos, opts) { if (G.Audio) { if (pos) G.Audio.sfxAt(name, pos, opts); else G.Audio.sfx(name, opts); } }
  E.sfx = sfx;
  function markSeen(id) { if (G.Progress && typeof G.Progress.markSeen === 'function') G.safe('markSeen', () => G.Progress.markSeen('enemy', id)); }
  E.markSeen = markSeen;

  // ------------------------------------------------------------------ navgrid (2 m cells, A*)
  class NavGrid {
    constructor(phys, cell) {
      this.phys = phys;
      cell = this.cell = cell || 2;
      const B = phys.bounds;
      const minX = Math.max(B.minX, -320), maxX = Math.min(B.maxX, 320), minZ = Math.max(B.minZ, -320), maxZ = Math.min(B.maxZ, 320);
      this.x0 = minX; this.z0 = minZ;
      const nx = this.nx = Math.max(1, Math.ceil((maxX - minX) / cell)), nz = this.nz = Math.max(1, Math.ceil((maxZ - minZ) / cell));
      const n = nx * nz;
      this.block = new Uint8Array(n);
      const tmp = [];
      for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
        const cx = minX + (ix + 0.5) * cell, cz = minZ + (iz + 0.5) * cell;
        const g = phys.terrain(cx, cz);
        const list = phys.query(cx - 0.9, cz - 0.9, cx + 0.9, cz + 0.9, tmp);
        for (const it of list) {
          if (it.dead) continue;
          let top, bot, inside;
          const rr = 0.7;
          if (it.k === 0) { top = it.maxy; bot = it.miny; inside = cx + rr > it.minx && cx - rr < it.maxx && cz + rr > it.minz && cz - rr < it.maxz; }
          else { top = it.y1; bot = it.y0; const dx = cx - it.x, dz = cz - it.z; inside = dx * dx + dz * dz < (it.r + rr) * (it.r + rr); }
          if (inside && top > g + 0.5 && bot < g + 1.7) { this.block[iz * nx + ix] = 1; break; }
        }
      }
      this.g = new Float32Array(n); this.f = new Float32Array(n); this.came = new Int32Array(n);
      this.seen = new Uint32Array(n); this.shut = new Uint32Array(n); this.stamp = 0;
      this.heap = new Int32Array(n); this.hn = 0;
    }
    idx(x, z) { const ix = Math.floor((x - this.x0) / this.cell), iz = Math.floor((z - this.z0) / this.cell); if (ix < 0 || iz < 0 || ix >= this.nx || iz >= this.nz) return -1; return iz * this.nx + ix; }
    blocked(x, z) { const i = this.idx(x, z); return i < 0 || this.block[i] === 1; }
    _free(i) {
      if (i >= 0 && !this.block[i]) return i;
      if (i < 0) return -1;
      const nx = this.nx, ix = i % nx, iz = (i / nx) | 0;
      for (let r = 1; r <= 3; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const x = ix + dx, z = iz + dz;
        if (x < 0 || z < 0 || x >= nx || z >= this.nz) continue;
        const j = z * nx + x; if (!this.block[j]) return j;
      }
      return -1;
    }
    _push(i) { const h = this.heap, f = this.f; let k = this.hn++; h[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (f[h[p]] <= f[i]) break; h[k] = h[p]; k = p; } h[k] = i; }
    _pop() {
      const h = this.heap, f = this.f; const top = h[0]; const last = h[--this.hn];
      let k = 0; const n = this.hn;
      while (true) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && f[h[c + 1]] < f[h[c]]) c++; if (f[h[c]] >= f[last]) break; h[k] = h[c]; k = c; }
      if (n > 0) h[k] = last;
      return top;
    }
    // Returns smoothed waypoints [V3] (excluding the start) or null.
    findPath(sx, sz, gx, gz, maxExp) {
      const s = this._free(this.idx(sx, sz)), t = this._free(this.idx(gx, gz));
      if (s < 0 || t < 0) return null;
      if (s === t) return [new V3(gx, 0, gz)];
      const st = ++this.stamp, nx = this.nx, nz = this.nz, cell = this.cell;
      const tx = t % nx, tz = (t / nx) | 0;
      const hfn = i => { const dx = Math.abs(i % nx - tx), dz = Math.abs(((i / nx) | 0) - tz); return (dx + dz + (1.4142 - 2) * Math.min(dx, dz)); };
      this.hn = 0;
      this.g[s] = 0; this.f[s] = hfn(s); this.came[s] = -1; this.seen[s] = st; this._push(s);
      let exp = 0, found = false;
      maxExp = maxExp || 2600;
      while (this.hn > 0 && exp < maxExp) {
        const cur = this._pop();
        if (this.shut[cur] === st) continue;
        this.shut[cur] = st; exp++;
        if (cur === t) { found = true; break; }
        const cx = cur % nx, cz = (cur / nx) | 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const x = cx + dx, z = cz + dz;
          if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
          const j = z * nx + x;
          if (this.block[j] || this.shut[j] === st) continue;
          if (dx && dz && (this.block[cz * nx + x] || this.block[z * nx + cx])) continue;
          const ng = this.g[cur] + (dx && dz ? 1.4142 : 1);
          if (this.seen[j] !== st || ng < this.g[j]) {
            this.seen[j] = st; this.g[j] = ng; this.f[j] = ng + hfn(j); this.came[j] = cur; this._push(j);
          }
        }
      }
      if (!found) return null;
      const cells = [];
      for (let i = t; i >= 0 && i !== s; i = this.came[i]) cells.push(i);
      cells.reverse();
      const pts = cells.map(i => new V3(this.x0 + (i % nx + 0.5) * cell, 0, this.z0 + (((i / nx) | 0) + 0.5) * cell));
      pts[pts.length - 1] = new V3(gx, 0, gz);
      // string-pull with horizontal rays at knee/chest height
      const out = [];
      let ax = sx, az = sz, i = 0;
      while (i < pts.length) {
        let far = i;
        for (let j = Math.min(pts.length - 1, i + 8); j > i; j--) { if (this._clear(ax, az, pts[j].x, pts[j].z)) { far = j; break; } }
        out.push(pts[far]); ax = pts[far].x; az = pts[far].z; i = far + 1;
      }
      for (const p of out) p.y = this.phys.terrain(p.x, p.z);
      return out;
    }
    _clear(ax, az, bx, bz) {
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      if (L < 0.1) return true;
      const y = Math.max(this.phys.terrain(ax, az), this.phys.terrain(bx, bz)) + 0.9;
      const nxv = dx / L, nzv = dz / L;
      if (this.phys.rayHit(ax, y, az, nxv, 0, nzv, L, true)) return false;
      // offset rays for body width
      const px = -nzv * 0.45, pz = nxv * 0.45;
      return !this.phys.rayHit(ax + px, y, az + pz, nxv, 0, nzv, L, true) && !this.phys.rayHit(ax - px, y, az - pz, nxv, 0, nzv, L, true);
    }
  }
  E.NavGrid = NavGrid;
  E.nav = function (world) { const s = sys(world); if (!s.nav) s.nav = new NavGrid(world.phys, 2); return s.nav; };
  E.rebuildNav = function (world) { sys(world).nav = null; };

  // ------------------------------------------------------------------ robot visuals
  // The attached pieces below take a segment scale k (1 = full; the robots' far twins pass 15b's LOD_SEG / MID_SEG
  // values through attach.lo), cached per scale; floors keep every shape recognisable.
  const segOf = (n, k, min) => (k === 1 ? n : Math.max(Math.min(n, min), Math.round(n * k)));
  function crownGeo(k) {
    k = k > 0 && k < 1 ? k : 1;
    const key = 'crown' + (k === 1 ? '' : k);
    if (GEO[key]) return GEO[key];
    const parts = [];
    const ring = new THREE.TorusGeometry(0.11, 0.025, segOf(6, k, 3), segOf(18, k, 8)).rotateX(Math.PI / 2);
    parts.push(ring);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      const c = new THREE.ConeGeometry(0.03, 0.09, segOf(6, k, 4)).translate(Math.cos(a) * 0.11, 0.05, Math.sin(a) * 0.11);
      parts.push(c);
      const s = new THREE.SphereGeometry(0.018, segOf(6, k, 4), segOf(4, k, 3)).translate(Math.cos(a) * 0.11, 0.1, Math.sin(a) * 0.11);
      parts.push(s);
    }
    const g = G.Geo && G.Geo.merge ? G.Geo.merge(parts.map(p => { p.deleteAttribute('uv'); return p; })) : ring;
    return (GEO[key] = shared(g));
  }
  function coilGeo(k) {
    k = k > 0 && k < 1 ? k : 1;
    const key = 'coil' + (k === 1 ? '' : k);
    if (GEO[key]) return GEO[key];
    const parts = [new THREE.CylinderGeometry(0.035, 0.05, 0.26, segOf(10, k, 5)).translate(0, 0.13, 0)];
    for (let i = 0; i < 3; i++) parts.push(new THREE.TorusGeometry(0.075 - i * 0.014, 0.018, segOf(6, k, 3), segOf(16, k, 7)).rotateX(Math.PI / 2).translate(0, 0.06 + i * 0.075, 0));
    parts.push(new THREE.SphereGeometry(0.055, segOf(10, k, 6), segOf(8, k, 4)).translate(0, 0.3, 0));
    const g = G.Geo && G.Geo.merge ? G.Geo.merge(parts.map(p => { p.deleteAttribute('uv'); return p; })) : parts[0];
    return (GEO[key] = shared(g));
  }
  // Lobba's signature: a tall mortar tube on its back that rises above the head, so the artillery role reads
  // from the front (unit layout; the robot scales it). Origin = the pivot ball, tube along +Y.
  function mortarGeo(k) {
    k = k > 0 && k < 1 ? k : 1;
    const key = 'mortar' + (k === 1 ? '' : k);
    if (GEO[key]) return GEO[key];
    const parts = [], Geo = G.Geo;
    const add = (g, col, x, y, z, rx) => { if (g.attributes.uv) g.deleteAttribute('uv'); if (rx) g.rotateX(rx); g.translate(x, y, z); Geo.colorize(g, col); parts.push(g); };
    add(new THREE.SphereGeometry(0.1, segOf(12, k, 6), segOf(8, k, 4)), C.brass, 0, 0, 0);
    add(new THREE.CylinderGeometry(0.082, 0.096, 0.5, segOf(16, k, 7)), C.plum, 0, 0.27, 0);
    add(new THREE.TorusGeometry(0.098, 0.022, segOf(6, k, 3), segOf(18, k, 8)), C.brass, 0, 0.12, 0, Math.PI / 2);
    add(new THREE.TorusGeometry(0.09, 0.02, segOf(6, k, 3), segOf(18, k, 8)), C.brass, 0, 0.34, 0, Math.PI / 2);
    add(new THREE.TorusGeometry(0.088, 0.032, segOf(8, k, 4), segOf(20, k, 8)), C.yellow, 0, 0.52, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.066, 0.066, 0.012, segOf(14, k, 7)), C.visor, 0, 0.525, 0);
    // side braces down to the body
    for (const sd of [-1, 1]) add(new THREE.BoxGeometry(0.03, 0.2, 0.05), C.brass, sd * 0.1, 0.05, 0);
    return (GEO[key] = shared(Geo.merge(parts)));
  }
  // rollo's stripes: the shared torus, reduced for the far twins
  function stripeGeo(k) {
    k = k > 0 && k < 1 ? k : 1;
    if (k === 1) return geo('tor');
    const key = 'torLo' + k;
    return GEO[key] || (GEO[key] = shared(new THREE.TorusGeometry(1, 0.09, segOf(6, k, 3), segOf(26, k, 10)).rotateX(Math.PI / 2)));
  }
  function buildRobot(def, scale, elite) {
    const spec = Object.assign({}, def.spec);
    spec.size = (spec.size || 1) * (scale || 1);
    if (elite) { spec.accent = C.gold; spec.seed = (spec.seed || 1) + 100; }
    // Robots whose weak spot is on the back (Pinch's vent, Bruiser's battery): the chest button stays unlit
    // and the glow sits on the rear tank instead (see the vent glow below).
    if (def.rearCore) spec.coreColor = spec.metal;
    // Extra static pieces are merged into the robot's single skinned mesh (no draw call of their own);
    // 'as' pieces get their own part group (rollo's tumbling stripes, the tote's cargo) so they still animate.
    const L0 = G.Geo.robotLayout ? G.Geo.robotLayout(spec) : null;
    const att = [];
    if (L0) {
      if (spec.mobility === 'ball') {
        // stripes high and low on the ball, clear of the face (they crossed the visor at ±0.18)
        for (const lat of [-0.34, 0.34]) {
          const rr = Math.sqrt(Math.max(0.01, 1 - (lat / L0.shell.b) * (lat / L0.shell.b))) * L0.shell.a * 1.02;
          att.push({ to: 'body', as: 'roller', at: [0, L0.shell.cy, 0], geo: geo('tor'), lo: stripeGeo, color: spec.accent, pos: [0, lat, 0], scale: [rr, rr * 1.2, rr], key: 'roll' + lat });
        }
      }
      if (def.id === 'zapper') att.push({ to: 'head', geo: coilGeo(), lo: coilGeo, color: spec.accent, em: spec.accent, ei: 0.35, pos: [0.11, L0.headTop - 0.02, -0.03], key: 'coil' });
      if (def.id === 'lobba') {
        const S = L0.shell;
        att.push({ to: 'body', as: 'mortar', at: [0, S.cy + S.b * 0.75, -S.c * 0.55], geo: mortarGeo(), lo: mortarGeo, pos: [0, 0, 0], key: 'mortar' });
      }
      if (def.id === 'shieldy' && G.Geo.emblem) {
        const em = G.safe('emblem', () => G.Geo.emblem('heart', 0xffffff));
        if (em) att.push({ to: 'shield', geo: em, em: 0xff7ab8, ei: 0.25, pos: [0, -0.09, 0.02], rot: [Math.PI / 2, 0, 0], scale: 0.16, key: 'heart' });
      }
      if (def.id === 'tote') {
        att.push({ to: 'body', as: 'cargo', at: [0, -0.12, 0], geo: crateGeo('wood'), pos: [0, -0.36, 0], scale: 0.36, key: 'crate' });
        att.push({ to: 'body', as: 'cargo', geo: geo('beam'), color: C.plum, pos: [0, -0.2, 0], scale: [0.012, 0.22, 0.012], key: 'cable' });
      }
      if (elite) att.push({ to: 'head', geo: crownGeo(), lo: crownGeo, color: C.gold, em: C.gold, ei: 0.25, pos: [spec.antenna ? -0.1 : 0, L0.headTop + 0.01, 0], key: 'crown' });
    }
    const rb = G.Geo.robot(spec, { attach: att });
    const P = rb.parts, L = rb.layout;
    rb.extras = {};
    if (spec.mobility === 'ball') {
      // Striped ball bot: drop the body to the ground; the stripes tumble with the roll.
      P.model.position.y = -L.legH * spec.size * 0.98;
      rb.height -= L.legH * spec.size; rb.critY -= L.legH * spec.size;
      if (P.roller) rb.extras.roller = P.roller;
    }
    if (def.id === 'zapper') {
      const glow = G.R.glowSprite(C.elec, 0.32, 0.9); glow.position.set(0.11, L.headTop + 0.28, -0.03); P.head.add(glow);
      rb.extras.coilGlow = glow;
    }
    if (def.id === 'tote') {
      const hatch = G.R.glowSprite(C.yellow, 0.7, 0); hatch.material = hatch.material.clone(); hatch.position.set(0, L.legH - 0.06, 0); P.body.add(hatch);
      rb.extras.hatch = hatch;
      if (P.cargo) rb.extras.cargo = P.cargo;   // slung delivery crate (hidden once every drop is delivered)
    }
    if (def.id === 'bruiser') {
      // gorilla silhouette: a forward hunch and stout arms ending in big brass fists that are held up in front
      // (see _animate) — the old long mitt arms reached the floor and read as four legs
      for (const k of ['armL', 'armR']) if (P[k]) { P[k].scale.set(1.35, 1.12, 1.35); P[k].position.y -= 0.02; }
      P.model.rotation.x = 0.12;
    }
    if (def.id === 'lobba' && P.mortar) {
      const mz = new THREE.Object3D(); mz.name = 'mortarMuzzle'; mz.position.set(0, 0.53, 0); P.mortar.add(mz);
      rb.extras.mortar = P.mortar; rb.extras.mortarMz = mz; P.mortar.userData.y0 = P.mortar.position.y;   // rest = the bind pose (upright)
    }
    if (def.rearCore) {
      // weak spot on the back: no halo on the (unlit) chest button, a yellow glow on the rear tank instead
      if (P.coreGlow) P.coreGlow.scale.setScalar(1e-4);
      const vg = G.R.glowSprite(C.yellow, L.coreR * 7.5, def.id === 'bruiser' ? 0.3 : 0.7); vg.material = vg.material.clone();
      vg.position.copy(L.back).addScaledVector(L.backN, 0.2); vg.position.y += 0.06;
      P.body.add(vg); vg.userData.base = vg.scale.x; vg.userData.op = vg.material.opacity;
      rb.extras.ventGlow = vg;
    }
    // Wind-up aura (GDD §7.1 telegraph standard): a pink additive halo around the body pulsing at 6 Hz while an
    // attack charges. Readable at 20 m on a phone where the LED eyes are a few pixels. Shared glow layer = no
    // extra draw call.
    {
      const tg = G.R.glowSprite(C.pink, 1, 0); tg.material = tg.material.clone(); tg.material.opacity = 0;
      tg.position.set(0, rb.height * 0.5, 0); tg.userData.base = Math.max(1.5, rb.height * 1.55, rb.radius * 3);
      tg.scale.setScalar(tg.userData.base);
      rb.group.add(tg); rb.extras.teleGlow = tg;
    }
    if (elite) {
      const bub = G.Geo.onSceneRender ? new THREE.Object3D() : new THREE.Mesh(geo('sph'), G.M.toon(C.bubble, { transparent: true, opacity: 0.32, rimStr: 1.3, rimPow: 1.6, rimColor: 0xffffff, spec: 0.9, side: THREE.FrontSide }));
      bub.userData.on = true;
      const R = Math.max(rb.height * 0.62, rb.radius * 1.5);
      bub.scale.set(R * 1.05, rb.height * 0.62, R * 1.05); bub.position.y = rb.height * 0.5;
      bub.renderOrder = 7;
      rb.group.add(bub);
      rb.extras.bubble = bub;
    }
    return rb;
  }
  E.buildRobot = buildRobot;
  // Weak spot from a robot rig: actor.critPt(out) -> world position of rb.parts.core (rendered facing, hop lift
  // and squash included; null when dead) and actor.critR (halo radius + 8 cm). Modes with their own robot
  // actors (training targets, expedition props) can call it too. on === false clears it.
  // Balance (tuned): the battery sits at chest height, right where centre-mass / aim-assisted shots land, so a
  // battery crit pays ×1.4 (impact) / ×1.13 (splash, beam ticks) instead of the head-line ×1.75 / ×1.25.
  // Measured with the Fizz Blaster aimed at the aim-assist point (8 / 14 m, 9 robot types): crit share 0.25 → 0.85,
  // so the roster's mean damage per shot moves 1.20 → 1.34 (centre-mass) and 1.25 → 1.12 (shots spread over
  // the silhouette) instead of 1.20 → 1.63 at ×1.75.
  const CORE_CRIT_K = 0.53;
  function coreCritPt(out) {
    const c = this._coreL;
    if (!c || !this.alive || !this._coreRb) return null;
    const g = this._coreRb.group, rig = this._coreRb.parts.rig;
    const yaw = g.rotation.y, sn = Math.sin(yaw), cs = Math.cos(yaw), sy = rig.scale.y || 1;
    return out.set(this.pos.x + c.x * cs + c.z * sn, this.pos.y + rig.position.y + c.y * sy, this.pos.z - c.x * sn + c.z * cs);
  }
  E.attachCore = function (a, rb, on) {
    a._coreL = null; a.critR = 0; a._coreRb = null; a.critK = 0;
    if (on === false || !rb || !rb.parts || !rb.parts.core || !rb.group) return a;
    const g = rb.group, px = g.position.x, py = g.position.y, pz = g.position.z, ry = g.rotation.y;
    g.position.set(0, 0, 0); g.rotation.y = 0; g.updateMatrixWorld(true);
    a._coreL = rb.parts.core.getWorldPosition(new V3());
    g.position.set(px, py, pz); g.rotation.y = ry; g.updateMatrixWorld(true);
    const L = rb.layout;
    a.critR = (L && L.coreR ? L.coreR : 0.058) * (rb.spec && rb.spec.boss ? 9 : 6.5) * 0.5 * (rb.size || 1) + 0.08;
    a._coreRb = rb; a.critK = CORE_CRIT_K;
    a.critPt = coreCritPt;
    return a;
  };

  // ------------------------------------------------------------------ brains (per-type behaviour)
  const _m1 = new V3(), _m2 = new V3(), _m3 = new V3();
  const BR = {};
  E.brains = BR;
  const atkOf = (e, k) => e.def.atk[k];

  BR.bumbler = {
    strafe: 0.75,
    attacks: [{
      id: 'pellet', min: 0, max: 20, cd: 1.6, tele: 0.5, rec: 0.25,
      teleTick(e, dt, a, k) { if (e.rb.parts.antenna) e.rb.parts.antenna.scale.setScalar(1 + 0.5 * k); },
      exec(e) {
        const A = atkOf(e, 'pellet');
        if (e.rb.parts.antenna) e.rb.parts.antenna.scale.setScalar(1);
        E.shoot(e, e.muzzle(_m1), e.target.aimPoint(_m2), { speed: A.speed, dmg: A.dmg, color: C.pink, size: 0.17 });
        sfx('enemyShoot', e.pos);
      },
      end(e) { if (e.rb.parts.antenna) e.rb.parts.antenna.scale.setScalar(1); },
    }],
  };
  BR.hopper = {
    strafe: 0.3,
    attacks: [{
      id: 'leap', min: 2.5, max: 9, cd: 2.4, tele: 0.6, rec: 0.55, telePitch: 1.15,
      exec(e, a) {
        const A = atkOf(e, 'leap');
        const t = e.target;
        let dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z; const d = Math.hypot(dx, dz) || 1;
        const k = Math.min(1, A.dist / d); dx *= k; dz *= k;
        const land = new V3(e.pos.x + dx, 0, e.pos.z + dz);
        land.y = e.world.phys.groundAt(land.x, land.z, 0.3, Math.max(e.pos.y, t.pos.y) + 2);
        const T = A.air, g = 20;
        a.data.warn = E.warnCircle(e.world, land, A.r, T, C.pink);
        e.vel.set(dx / T, (land.y - e.pos.y) / T + 0.5 * g * T, dz / T);
        e.leaping = true; e.leapG = g; e.grounded = false;
        e.rb.anim.hopP = Math.floor(e.rb.anim.hopP) + 0.18;
        sfx('jump', e.pos, { pitch: 0.8 });
        return 2.2;
      },
      act(e, dt, a) {
        if (a.t > 0.25 && e.grounded) {
          const A = atkOf(e, 'leap');
          e.leaping = false;
          E.blast(e.world, _m1.set(e.pos.x, e.pos.y + 0.3, e.pos.z), A.r, A.dmg, { src: e, fx: false, knock: 6 });
          e.world.fx.ring(_m1.set(e.pos.x, e.pos.y + 0.05, e.pos.z), A.r * 1.2, C.orange, 0.35);
          e.world.fx.smoke(e.pos, 6);
          e.rb.kick(1);
          sfx('land', e.pos, { pitch: 0.7 });
          const pl = e.world.player; if (pl && pl.pos.distanceTo(e.pos) < 8) e.world.fx.shake(0.15);
          return true;
        }
        return false;
      },
      end(e, a) { e.leaping = false; if (a.data.warn) a.data.warn.kill(); },
    }],
  };
  BR.rollo = {
    chase: true,
    // While another burst attack holds the player's heavy slot (or the cadence gap is running), circle at ~4.5 m
    // beeping instead of piling in: several Rollos never arm on the player at the same moment.
    move(e) {
      const t = e.target, s = sys(e.world);
      const dx0 = e.pos.x - t.pos.x, dz0 = e.pos.z - t.pos.z, d = Math.hypot(dx0, dz0) || 1;
      const blocked = t.isPlayer && !s.heavy.has(e) && (s.heavy.size >= s.heavyMax || e.world.time < s.nextAtkT || e.world.time < (e.firstAtkT || 0));
      if (!blocked || d > 6) { e.steerTo(t.pos.x, t.pos.z, e.speed, 0.4); return; }
      const ux = dx0 / d, uz = dz0 / d, radial = d < 4 ? 1 : d > 5 ? -0.6 : 0;
      e.steerDir(-uz * e.strafeDir + ux * radial, ux * e.strafeDir + uz * radial, e.speed * 0.5);
    },
    attacks: [{
      id: 'boom', min: 0, max: 2.5, cd: 0, tele: 0.8, rec: 0, token: false, los: false, heavy: true, teleSfx: null,
      begin(e, a) { a.data.beep = 0; },
      teleTick(e, dt, a, k) {
        a.data.beep -= dt;
        if (a.data.beep <= 0) { a.data.beep = 1 / U.lerp(2, 10, k); sfx('countdown', e.pos, { pitch: 1.2 + k * 0.6 }); }
        const t = e.target; if (t) { _m1.set(t.pos.x - e.pos.x, 0, t.pos.z - e.pos.z); const d = _m1.length(); if (d > 0.8) e.steerDir(_m1.x / d, _m1.z / d, e.speed * 0.45); }
      },
      exec(e) { e.selfDestruct(1); return 0; },
    }],
    onDeath(e) { if (!e.exploded) e.selfDestruct(atkOf(e, 'boom').popMult, true); },
  };
  BR.squirt = {
    turret: true,
    attacks: [{
      id: 'lob', min: 2.5, max: 25, cd: 2.0, tele: 0.6, rec: 0.3, telePitch: 1.25,
      teleTick(e, dt, a, k) { const c = e.rb.cannons[0]; if (c) c.scale.setScalar(1 + 0.4 * k * (0.75 + 0.25 * Math.sin(a.t * 40))); },
      exec(e) {
        const A = atkOf(e, 'lob');
        const c = e.rb.cannons[0]; if (c) c.scale.setScalar(1);
        const from = e.muzzle(_m1).clone();
        const t = e.target;
        const to = new V3(t.pos.x, 0, t.pos.z); to.y = e.world.phys.groundAt(to.x, to.z, 0.2, t.pos.y + 1);
        const d = Math.hypot(to.x - from.x, to.z - from.z);
        const T = U.clamp(d / 13, 0.9, 1.7);
        E.lob(e, from, to, T, { color: C.goo, kind: 'ink', size: 0.32, gravity: 14, r: A.puddle, onImpact: p => gooSplash(e, p) });
        sfx('splat', e.pos, { pitch: 1.3 });
      },
      end(e) { const c = e.rb.cannons[0]; if (c) c.scale.setScalar(1); },
    }],
  };
  function gooSplash(e, p) {
    const A = atkOf(e, 'lob'), w = e.world;
    E.blast(w, p, 1.6, A.dmg, { src: e, fx: false, knock: 2 });
    w.fx.burst(p, [C.goo, 0xd8ff8a, 0xffffff], 18, 6, 0.3, 0.6, { normal: true, grav: 12 });
    E.puddle(w, p, A.puddle, 4, { slowK: 1 - A.slow, slowT: A.slowT, team: e.team, color: C.goo });
    sfx('splat', p);
  }
  BR.gnat = {
    strafe: 0.15,
    move(e, dt) {
      const t = e.target;
      e.relocT -= dt;
      if (!e.relocPos || e.relocT <= 0) {
        e.relocT = atkOf(e, 'laser').relocate;
        const base = Math.atan2(e.pos.x - t.pos.x, e.pos.z - t.pos.z) + U.rand(-1, 1);
        const dist = U.rand(e.band[0] + 2, Math.min(e.band[1], 32));
        e.relocPos = (e.relocPos || new V3()).set(t.pos.x + Math.sin(base) * dist, 0, t.pos.z + Math.cos(base) * dist);
      }
      e.steerTo(e.relocPos.x, e.relocPos.z, e.speed, 1.2);
      e.faceTarget = true;
    },
    attacks: [{
      id: 'laser', min: 4, max: 50, cd: 4, tele: 1.2, rec: 0.5, heavy: true,
      begin(e, a) {
        a.data.beam = E.beam(e.world, C.pink, 0.03);
        a.data.dir = new V3(); a.data.end = new V3();
        e.target.aimPoint(_m2); a.data.dir.copy(_m2).sub(e.muzzle(_m1)).normalize();
        if (G.Audio && G.Audio.loop) a.data.loop = G.Audio.loop('charge', { pos: e.pos, vol: 0.5, pitch: 1 });
      },
      teleTick(e, dt, a, k) {
        const from = e.muzzle(_m1);
        const lockAt = a.tele - atkOf(e, 'laser').lock * e.teleK;
        const locked = a.t >= lockAt;
        if (!locked && e.target && e.target.alive) {
          e.target.aimPoint(_m2); _m3.copy(_m2).sub(from).normalize();
          a.data.dir.lerp(_m3, Math.min(1, dt * 9)).normalize();
        }
        const h = e.world.phys.raycast(from.x, from.y, from.z, a.data.dir.x, a.data.dir.y, a.data.dir.z, 50);
        let L = h ? h.t : 50;
        if (e.target && e.target.isPlayer) { const dT = from.distanceTo(e.target.aimPoint(_m3)); if (L > dT - 1.8) L = Math.max(0.5, dT - 1.8); }
        a.data.end.copy(from).addScaledVector(a.data.dir, L);
        a.data.beam.set(from, a.data.end);
        if (locked) { const on = Math.sin(a.t * 15 * TAU) > 0; a.data.beam.opacity(on ? 1 : 0.25).width(on ? 0.06 : 0.035); }
        else a.data.beam.opacity(0.45 + 0.3 * k).width(0.025 + 0.01 * k);
        if (a.data.loop) a.data.loop.set({ pitch: 1 + k * 1.2, pos: e.pos });
      },
      exec(e, a) {
        const w = e.world, from = e.muzzle(_m1).clone(), dir = a.data.dir;
        const wh = w.phys.raycast(from.x, from.y, from.z, dir.x, dir.y, dir.z, 50);
        const wt = wh ? wh.t : 50;
        const hit = w.rayActors(from, dir, wt, e, e.team);
        const endT = hit ? hit.t : wt;
        const end = from.clone().addScaledVector(dir, endT);
        if (hit && !hit.actor.isCrate) E.hurt(e, hit.actor, atkOf(e, 'laser').dmg, { type: 'laser', dir: dir.clone(), knock: 2 });
        w.fx.tracer(from, end, C.pink, 0.16, 0.16);
        w.fx.sparks(end, C.pink, 12);
        w.fx.flash(end, C.pink, 1.6, 0.12);
        sfx('laser', e.pos, { pitch: 0.8 });
      },
      end(e, a) { if (a.data.beam) a.data.beam.kill(); a.data.beam = null; if (a.data.loop) a.data.loop.stop(0.05); a.data.loop = null; },
    }],
  };
  BR.shieldy = {
    strafe: 0.4,
    attacks: [{
      id: 'bash', min: 0, max: 2.6, cd: 2.5, tele: 0.5, rec: 0.5,
      exec(e, a) { a.data.hit = false; _m1.set(Math.sin(e.yaw), 0, Math.cos(e.yaw)); e.vel.x += _m1.x * 6; e.vel.z += _m1.z * 6; return 0.35; },
      act(e, dt, a) { if (!a.data.hit && a.t > 0.1) { a.data.hit = true; const A = atkOf(e, 'bash'); if (E.melee(e, A.range + 0.3, 120, A.dmg, 7)) sfx('hit', e.pos, { pitch: 0.6 }); } return a.t > 0.35; },
    }, {
      id: 'blaster', min: 2.5, max: 20, cd: 2.0, tele: 0.5, rec: 0.2,
      exec(e, a) { a.data.n = 0; return 1.2; },
      act(e, dt, a) {
        const A = atkOf(e, 'blaster');
        if (a.data.n < 3 && a.t >= a.data.n * 0.33 && e.target) { E.shoot(e, e.muzzle(_m1), e.target.aimPoint(_m2), { speed: 16, dmg: A.dmg, color: C.pink, size: 0.15 }); sfx('enemyShoot', e.pos, { pitch: 1.1 }); e.rb.kick(0.6); a.data.n++; }
        return a.data.n >= 3 && a.t > 0.75;
      },
    }],
    damageMod(e, amount, info) {
      if (e.plateHp <= 0) return amount;
      const inc = incoming(e, info, _m1);
      if (!inc) return amount;
      const front = inc.x * Math.sin(e.yaw) + inc.z * Math.cos(e.yaw) > Math.cos(atkOf(e, 'plate').arc * Math.PI / 360);
      if (!front) return amount;
      const splash = info.type === 'explosion' || info.type === 'splash';
      const toPlate = splash ? amount * 0.5 : amount;
      e.plateHp -= toPlate; e.plateHitT = e.world.time;
      e.blocked = (e.blocked || 0) + toPlate;
      if (e.rb.parts.shield) e.world.fx.sparks(e.rb.parts.shield.getWorldPosition(_m2), 0xffffff, 5);
      if (e.plateHp <= 0) {
        e.plateHp = 0;
        const sh = e.rb.parts.shield;
        if (sh) { sh.getWorldPosition(_m2); sh.visible = false; E.popFx(e.world, _m2, [0xff5fa2, C.orange, 0xffffff], 0.7); }
        sfx('shieldBreak', e.pos, { pitch: 1.3 });
      } else sfx('bounce', e.pos, { pitch: 1.4 });
      return splash ? amount * atkOf(e, 'plate').splash : 0;
    },
    tick(e, dt) {
      const P = atkOf(e, 'plate');
      if (e.plateHp > 0 && e.plateHp < e.plateMax && e.world.time - e.plateHitT > P.regrow) e.plateHp = Math.min(e.plateMax, e.plateHp + e.plateMax * 0.5 * dt);
    },
  };
  BR.lobba = {
    strafe: 0.35,
    attacks: [{
      id: 'mortar', min: 6, max: 32, cd: 4, tele: 0.6, rec: 0.4, heavy: true,
      exec(e, a) { a.data.n = 0; return 1.2; },
      act(e, dt, a) {
        const A = atkOf(e, 'mortar');
        if (a.data.n < A.n && a.t >= a.data.n * 0.3 && e.target) {
          const t = e.target;
          const off = a.data.n === 0 ? 0 : U.rand(1.2, 2.6), ang = Math.random() * TAU;
          const to = new V3(t.pos.x + Math.cos(ang) * off, 0, t.pos.z + Math.sin(ang) * off);
          to.y = e.world.phys.groundAt(to.x, to.z, 0.2, t.pos.y + 2);
          // shells leave from the mortar tube's mouth (it is raised and tilted forward by the wind-up)
          const mz = e.rb.extras.mortarMz;
          if (mz) { e.rb.group.updateMatrixWorld(true); mz.getWorldPosition(_m1); }
          else _m1.set(e.pos.x - Math.sin(e.yaw) * 0.3 * e.size, e.pos.y + e.h * 0.95, e.pos.z - Math.cos(e.yaw) * 0.3 * e.size);
          E.lob(e, _m1.clone(), to, Math.max(1.05, A.warn * e.teleK + 0.15), { dmg: A.dmg, r: A.r, color: 0xff9a3d, gravity: 16 });
          e.world.fx.smoke(_m1, 2);
          if (e.world.fx.pop) e.world.fx.pop(_m1, 0xffd23f, 0.5 * e.size, 0.12, 0.8);
          sfx('grenade', e.pos);
          e.rb.kick(0.5); e._mortarKick = 1;
          a.data.n++;
        }
        return a.data.n >= A.n && a.t > 0.8;
      },
    }],
  };
  BR.zapper = {
    strafe: 0.5,
    attacks: [{
      id: 'ring', min: 0, max: 6.5, cd: 5, tele: 1.0, rec: 0.6,
      begin(e) { if (!hasSfx('teleRing')) sfx('zap', e.pos, { pitch: 0.7 }); },
      teleTick(e, dt, a, k) {
        a.data.sp = (a.data.sp || 0) - dt;
        if (a.data.sp <= 0) { a.data.sp = 0.09; const ex = e.rb.extras; if (ex.coilGlow) { ex.coilGlow.getWorldPosition(_m1); e.world.fx.sparks(_m1, C.elec, 4); } }
        if (e.rb.extras.coilGlow) e.rb.extras.coilGlow.scale.setScalar(0.32 + 0.4 * k);
      },
      exec(e) { const A = atkOf(e, 'ring'); E.shockRing(e.world, e, e.pos, A.r, A.speed, A.dmg, A.height, C.elec); sfx('zap', e.pos, { pitch: 0.5 }); e.rb.kick(1); },
      end(e) { if (e.rb.extras.coilGlow) e.rb.extras.coilGlow.scale.setScalar(0.32); },
    }, {
      id: 'bolt', min: 1.5, max: 10, cd: 2.5, tele: 0.5, rec: 0.3, telePitch: 1.45,
      exec(e) { zapBolt(e); },
    }],
  };
  function zigTracer(w, a, b, color) {
    const n = 4; let px = a.x, py = a.y, pz = a.z;
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const j = i === n ? 0 : 0.35;
      _m3.set(U.lerp(a.x, b.x, k) + U.rand(-j, j), U.lerp(a.y, b.y, k) + U.rand(-j, j), U.lerp(a.z, b.z, k) + U.rand(-j, j));
      w.fx.tracer(new V3(px, py, pz), _m3.clone(), color, 0.09, 0.16);
      px = _m3.x; py = _m3.y; pz = _m3.z;
    }
  }
  E.zigTracer = zigTracer;
  function zapBolt(e) {
    const A = atkOf(e, 'bolt'), w = e.world, t = e.target;
    const from = (e.rb.extras.coilGlow ? e.rb.extras.coilGlow.getWorldPosition(_m1) : e.muzzle(_m1)).clone();
    const to = t.aimPoint(new V3());
    if (!w.phys.los(from, to, false)) {
      const d = to.clone().sub(from); const L = d.length(); d.multiplyScalar(1 / L);
      const h = w.phys.raycast(from.x, from.y, from.z, d.x, d.y, d.z, L);
      const end = from.clone().addScaledVector(d, h ? h.t : L);
      zigTracer(w, from, end, C.elec); w.fx.sparks(end, C.elec, 8);
    } else {
      zigTracer(w, from, to, C.elec);
      E.hurt(e, t, A.dmg, { type: 'zap', dir: to.clone().sub(from).normalize(), knock: 1 });
      w.fx.sparks(to, C.elec, 10);
      let chains = A.chains, cur = t;
      const done = new Set([t]);
      while (chains-- > 0) {
        let best = null, bd = 6;
        for (const a of w.actors) {
          if (!a.alive || !a.targetable || a.team === e.team || done.has(a) || a.isCrate) continue;
          const d = a.pos.distanceTo(cur.pos); if (d < bd) { bd = d; best = a; }
        }
        if (!best) break;
        const p2 = best.aimPoint(new V3());
        zigTracer(w, cur.aimPoint(new V3()), p2, C.elec);
        E.hurt(e, best, A.dmg, { type: 'zap', knock: 1 });
        done.add(best); cur = best;
      }
    }
    sfx('zap', e.pos, { pitch: 1.2 });
  }
  BR.pinch = {
    strafe: 1.0, scuttle: true,
    attacks: [{
      id: 'claw', min: 0, max: 2.7, cd: 2.0, tele: 0.6, rec: 0.5,
      exec(e, a) { a.data.hit = false; _m1.set(Math.sin(e.yaw), 0, Math.cos(e.yaw)); e.vel.x += _m1.x * 4; e.vel.z += _m1.z * 4; return 0.3; },
      act(e, dt, a) { if (!a.data.hit && a.t > 0.1) { a.data.hit = true; const A = atkOf(e, 'claw'); if (E.melee(e, A.range + 0.4, 150, A.dmg, 7)) sfx('hit', e.pos, { pitch: 0.5 }); } return a.t > 0.3; },
    }, {
      id: 'cannon', min: 3.5, max: 22, cd: 3, tele: 0.5, rec: 0.3,
      exec(e, a) { a.data.n = 0; return 0.8; },
      act(e, dt, a) {
        const A = atkOf(e, 'cannon');
        if (a.data.n < A.n && a.t >= a.data.n * 0.18 && e.target) { E.shoot(e, e.muzzle(_m1), e.target.aimPoint(_m2), { speed: A.speed, dmg: A.dmg, color: 0xff9a3d, size: 0.17, spread: 0.03 }); sfx('enemyShoot', e.pos, { pitch: 0.8 }); e.rb.kick(0.4); a.data.n++; }
        return a.data.n >= A.n && a.t > 0.5;
      },
    }],
    damageMod(e, amount, info) {
      const inc = incoming(e, info, _m1);
      if (inc && inc.x * Math.sin(e.yaw) + inc.z * Math.cos(e.yaw) < -0.45) { info.crit = true; return amount * atkOf(e, 'vent'); }
      return amount;
    },
  };
  BR.bruiser = {
    strafe: 0.15,
    attacks: [{
      id: 'slam', min: 0, max: 4.2, cd: 4, tele: 0.9, rec: 0.8, heavy: true, telePitch: 0.9,
      exec(e) {
        const A = atkOf(e, 'slam'), w = e.world;
        const p = new V3(e.pos.x + Math.sin(e.yaw) * 1.4, e.pos.y + 0.2, e.pos.z + Math.cos(e.yaw) * 1.4);
        E.blast(w, p, A.r, A.dmg, { src: e, fx: false, knock: 8 });
        w.fx.ring(p, A.r * 1.3, C.orange, 0.4, e.pos.y + 0.05);
        w.fx.smoke(p, 10); w.fx.sparks(p, C.yellow, 14);
        E.shockRing(w, e, p, A.ringR, A.ringSpeed, A.ringDmg, A.height, C.orange);
        sfx('explode', p, { size: 1.6 });
        const pl = w.player; if (pl) { const d = pl.pos.distanceTo(p); if (d < 16) w.fx.shake(0.4 * (1 - d / 16)); }
        e.rb.kick(1);
      },
    }, {
      id: 'charge', min: 5.5, max: 20, cd: 6, tele: 1.0, rec: 0.4, heavy: true,
      teleTick(e, dt, a) {
        a.data.dust = (a.data.dust || 0) - dt;
        if (a.data.dust <= 0) { a.data.dust = 0.15; e.world.fx.smoke(_m1.set(e.pos.x - Math.sin(e.yaw) * 0.6, e.pos.y + 0.1, e.pos.z - Math.cos(e.yaw) * 0.6), 2, 0xe8d6bf); sfx('step', e.pos, { pitch: 0.5 }); }
      },
      exec(e, a) {
        const t = e.target;
        a.data.dir = new V3(t.pos.x - e.pos.x, 0, t.pos.z - e.pos.z).normalize();
        a.data.hit = false; e.charging = true;
        sfx('boost', e.pos, { pitch: 0.6 });
        return 2.4;
      },
      act(e, dt, a) {
        const A = atkOf(e, 'charge'), d = a.data.dir;
        e.yaw = Math.atan2(d.x, d.z);
        e.wishX = d.x * A.speed * e.moveK(); e.wishZ = d.z * A.speed * e.moveK();
        if (a.t % 0.2 < dt) e.world.fx.smoke(e.pos, 1, 0xe8d6bf);
        const t = e.target;
        if (!a.data.hit && t && t.alive && Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z) < e.r + (t.r || 0.4) + 0.4 && Math.abs(t.pos.y - e.pos.y) < 2) {
          a.data.hit = true;
          E.hurt(e, t, A.dmg, { type: 'melee', dir: d.clone().setY(0.4), knock: 10 });
          sfx('hit', e.pos, { pitch: 0.4 });
        }
        if (e.hitWall && a.t > 0.15 && (e.wallN.x * d.x + e.wallN.z * d.z) < -0.4) {
          e.wallStunT = A.stun;
          e.world.fx.sparks(_m1.set(e.pos.x + d.x * e.r, e.pos.y + e.h * 0.6, e.pos.z + d.z * e.r), C.yellow, 18);
          e.world.fx.ring(e.pos, 2.5, C.yellow, 0.35, e.pos.y + 0.1);
          sfx('explode', e.pos, { size: 0.6 });
          const pl = e.world.player; if (pl && pl.pos.distanceTo(e.pos) < 14) e.world.fx.shake(0.25);
          e.vel.x = -d.x * 3; e.vel.z = -d.z * 3;
          return true;
        }
        return a.t > 2.2;
      },
      end(e) { e.charging = false; },
    }],
    damageMod(e, amount, info) {
      if (e.wallStunT > 0) {
        const inc = incoming(e, info, _m1);
        if (inc && inc.x * Math.sin(e.yaw) + inc.z * Math.cos(e.yaw) < -0.3) { info.crit = true; return amount * atkOf(e, 'battery'); }
      }
      return amount;
    },
  };
  BR.tote = {
    custom(e, dt) {
      const A = atkOf(e, 'drop'), w = e.world, t = e.target;
      const ex = e.rb.extras;
      e.faceTarget = false;
      if (e.toteState === 'leave') {
        e.wishX = e.leaveDir.x * e.speed * 1.6; e.wishZ = e.leaveDir.z * e.speed * 1.6; e.altBoost = Math.min(30, e.altBoost + dt * 4);
        e.yaw = U.angleDamp(e.yaw, Math.atan2(e.leaveDir.x, e.leaveDir.z), 3, dt);
        e.toteT += dt;
        if (e.toteT > 6) { e.alive = false; e.vanish = true; }
        return;
      }
      // hover near (not over) the target
      if (t) {
        const ang = Math.atan2(e.pos.x - t.pos.x, e.pos.z - t.pos.z);
        e.steerTo(t.pos.x + Math.sin(ang) * 7, t.pos.z + Math.cos(ang) * 7, e.speed, 2);
        e.yaw = U.angleDamp(e.yaw, Math.atan2(t.pos.x - e.pos.x, t.pos.z - e.pos.z), 2, dt);
      }
      e.toteT += dt;
      if (e.toteState === 'fly' && e.toteT >= (e.dropsLeft === A.drops ? 2.5 : A.every - A.hatch * e.teleK)) {
        e.toteState = 'hatch'; e.toteT = 0;
        sfx('warn', e.pos, { pitch: 0.7 });
        e.shadowWarn = E.warnCircle(w, e.pos, 2.6, A.hatch * e.teleK, C.yellow, { follow: e });
      } else if (e.toteState === 'hatch') {
        const k = e.toteT / (A.hatch * e.teleK);
        if (ex.hatch) ex.hatch.material.opacity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(e.toteT * 6 * TAU)) * k;
        if (k >= 1) {
          e.toteState = 'fly'; e.toteT = 0;
          if (ex.hatch) ex.hatch.material.opacity = 0;
          const types = e.opts.dropTypes || ['bumbler', 'hopper', 'rollo'];
          const s = sys(w);
          for (let i = 0; i < A.n; i++) {
            if (s.robots.length >= (s.cap || 40)) break;
            const ty = U.pick(types);
            const p = new V3(e.pos.x + U.rand(-1.2, 1.2), e.pos.y - 0.5, e.pos.z + U.rand(-1.2, 1.2));
            const child = E.spawn(w, ty, p, { alerted: true, difficulty: e.diff, behavior: e.behavior === 'assault' ? 'assault' : 'roam', assaultTarget: e.assaultTarget, target: e.opts.target, wave: e.opts.wave, fromAir: true });
            if (child) { child.vel.set(U.rand(-2, 2), -1, U.rand(-2, 2)); w.fx.smoke(p, 3); if (e.opts.onDrop) e.opts.onDrop(child); }
          }
          sfx('grenade', e.pos, { pitch: 0.6 });
          e.dropsLeft--;
          if (e.dropsLeft <= 0) { e.toteState = 'leave'; e.toteT = 0; e.leaveDir = new V3(Math.sin(e.yaw + Math.PI), 0, Math.cos(e.yaw + Math.PI)); }
        }
      }
    },
  };
  // Unit XZ vector from the enemy toward where the damage came from.
  function incoming(e, info, out) {
    if (!info) return null;
    if (info.dir && info.dir.lengthSq && info.dir.lengthSq() > 1e-6) out.set(-info.dir.x, 0, -info.dir.z);
    else if (info.pos) out.set(info.pos.x - e.pos.x, 0, info.pos.z - e.pos.z);
    else if (info.src && info.src.pos) out.set(info.src.pos.x - e.pos.x, 0, info.src.pos.z - e.pos.z);
    else return null;
    const l = Math.hypot(out.x, out.z);
    if (l < 1e-4) return null;
    out.x /= l; out.z /= l;
    return out;
  }
  E.incoming = incoming;

  // Wind-up face: the chars kit's wide-eyed 'focused' mood when it has one, else the round-eyed 'alert'.
  let FOCUS = null;
  function focusExpr() {
    if (FOCUS === null) FOCUS = G.Geo && G.Geo.face && G.Geo.face('focused', {}) !== G.Geo.face('idle', {}) ? 'focused' : 'alert';
    return FOCUS;
  }
  E.focusExpr = focusExpr;
  // ------------------------------------------------------------------ telegraph sounds
  // Every attack announces itself with its own wind-up sound (09_audio contract ids) whose length is the real
  // wind-up time on this difficulty and whose pitch follows the robot's size, so roles can be told apart by
  // ear: melee = rising whoosh, sniper = lock-on beeps, artillery = tube thoonk + whistle, charge = engine rev,
  // ring = electric hum swell, guns = spin-up whirr. Without the audio module's ids it falls back to the old
  // generic 'enemyCharge'. Rollo's fuse countdown is its own telegraph (teleSfx: null).
  const TELE_SFX = { pellet: 'teleSpin', leap: 'teleMelee', lob: 'teleArtillery', laser: 'teleSnipe', bash: 'teleMelee', blaster: 'teleSpin',
    mortar: 'teleArtillery', ring: 'teleRing', bolt: 'teleRing', claw: 'teleMelee', cannon: 'teleSpin', slam: 'teleMelee', charge: 'teleCharge' };
  const hasSfx = id => !!(G.Audio && G.Audio.has && G.Audio.has(id));
  E.hasSfx = hasSfx;
  const _teleO = { dur: 1, pitch: 1, vol: 1 };
  function teleSound(e, a, tele) {
    const id = a.teleSfx !== undefined ? a.teleSfx : TELE_SFX[a.id];
    if (id === null) return;
    if (id && hasSfx(id)) {
      _teleO.dur = tele; _teleO.pitch = U.clamp(1.32 - 0.2 * (e.size || 1), 0.7, 1.25) * (a.telePitch || 1); _teleO.vol = 1;
      sfx(id, e.pos, _teleO);
    } else if (a.tele >= 0.5) sfx('enemyCharge', e.pos, { pitch: 0.9 + 0.5 / a.tele });
  }
  E.teleSound = teleSound;

  // ------------------------------------------------------------------ Enemy actor
  const NO_DMG = { dealt: 0, toShield: 0, killed: false };
  const WHISK = [0, 0.55, -0.55, 1.1, -1.1, 1.6, -1.6];
  let _stagger = 0;
  class Enemy extends G.Actor {
    constructor(world, def, pos, opts) {
      opts = opts || {};
      const diff = E.difficulty(opts.difficulty);
      const scale = opts.scale || 1;
      const elite = !!opts.elite;
      const rb = buildRobot(def, scale, elite);
      const D = G.Data && G.Data.ENEMIES && G.Data.ENEMIES[def.id];
      const baseHp = opts.hp != null ? opts.hp : (D && okNum(D.hp, 1, 1e5) ? D.hp : def.hp);
      const hp = Math.max(1, Math.round(baseHp * diff.hp * (opts.hpMult || 1)));
      super(world, { r: Math.max(0.35, rb.radius * 0.95), h: Math.max(0.6, rb.height), team: opts.team != null ? opts.team : 1, hp, kind: 'enemy' });
      const s = sys(world);
      s.tokMax = diff.tokens; s.heavyMax = diff.heavy || 1; s.gap = diff.gap != null ? diff.gap : 0.45;
      this.def = def; this.opts = opts; this.diff = diff;
      this.brain = BR[def.id] || {};
      this.enemyId = def.id; this.tier = (D && D.tier) || def.tier; this.elite = elite; this.isBoss = false; this.isEnemy = true;
      this.displayName = opts.displayName || (elite ? G.t('enemy.elite', { name: G.t(def.nameKey) }) : G.t(def.nameKey));
      this.clinks = D && Array.isArray(D.clinks) ? D.clinks : def.clinks;
      this.rolls = D && okNum(D.rolls, 0, 9) ? D.rolls : def.rolls;
      this.partW = D && D.parts && typeof D.parts === 'object' ? D.parts : def.parts;
      this.rb = rb; this.mesh = rb.group; this.size = (def.spec.size || 1) * scale;
      // Weak spot = the glowing chest battery (GDD §2.8), not the old "anything above the face line": a sphere
      // the size of its halo (+8 cm of forgiveness) tested by rayActors / G.critAt through critPt(). Pinch and
      // Bruiser keep their weak spot on the back (brain.damageMod), where their glow now sits.
      this.critY = null;
      E.attachCore(this, rb, !def.rearCore);
      this.hitPad = this.tier === 1 ? 0.14 : 0.08;
      this.immovable = !!def.immovable;
      this.dmgK = diff.dmg; this.dmgExtra = opts.dmgMult || 1;
      this.fireK = diff.fire * (elite ? 1.25 : 1);
      this.teleK = diff.tele;
      this.speed = def.speed * (elite ? 1.2 : 1) * (opts.speedMult || 1);
      this.speedMult = opts.speedMult || 1; this._honoursHpMult = true; this._scaled = (opts.scale || 1) !== 1;
      this.patrol = Array.isArray(opts.patrol) && opts.patrol.length ? opts.patrol : null; this.patrolI = 0;
      this.band = def.band;
      if (elite) { this.maxShield = this.shield = Math.round(hp); }
      this.fly = !!def.fly; this.alt = def.alt || 0; this.altBoost = 0;
      this.dmgTakenMult = 1; this.frozenT = 0; this.danceT = 0; this.plantT = 0; this.wallStunT = 0;
      this.behavior = opts.behavior === 'patrol' ? 'roam' : (opts.behavior || 'roam');
      this.assaultTarget = opts.assaultTarget || null;
      this.prefersPlayer = Math.random() < 0.4;
      this.home = (opts.home || pos).clone();
      this.leash = opts.leash || 20;
      this.yaw = opts.yaw != null ? opts.yaw : Math.random() * TAU;
      this.state = 'idle'; this.stateT = 0;
      this.target = null; this.hasLOS = false; this.lastSeen = new V3(); this.lastSeenT = -99; this.seenOnce = false;
      this.thinkT = (_stagger++ % 5) * 0.04;
      this.cds = {}; this.atk = null;
      this.wishX = 0; this.wishZ = 0; this.moveDirX = 0; this.moveDirZ = 0; this.avoidAng = 0; this.sepX = 0; this.sepZ = 0;
      this.strafeDir = Math.random() < 0.5 ? 1 : -1; this.strafeT = U.rand(0.8, 2);
      this.path = null; this.pathI = 0; this.pathGoal = new V3(); this.pathT = 0; this.stuckN = 0; this.lastThinkPos = new V3();
      this.detourT = 0; this.detourAng = 0;
      this.hurtT = 0; this.alertT = 0; this.popT = 0;
      this.leaping = false; this.charging = false; this.faceTarget = false;
      this.relocT = 0; this.relocPos = null;
      this._ao = { speed: 0, telegraph: 0, expr: undefined, look: NaN, aim: 0, flash: 0, vx: 0, vz: 0, vy: 0, yaw: 0, turn: 0, wind: -1, detail: 1 };
      // rendered facing: a critically damped spring on the sim yaw (see _animate); NaN = snap on the first frame
      this._vyaw = { x: NaN, v: 0, t: 0, f: U.clamp(3.4 - 0.35 * this.size, 2.0, 3.2), z: 1 };   // heavier robots turn a touch slower
      this._detail = 1; this._dk = 1;   // limb detail (LOD fade, see _lod)
      this._critPop = 0; this._fistK = 0; this._mortarKick = 0; this._mortarRx = null;   // _poseExtras state
      this.groundY = 0;
      // fields the per-frame code would otherwise add later, each robot in its own order (a new hidden class per
      // order: megamorphic property access and "wrong map" deopts in update / _animate / _lod): declared up front,
      // with values that read exactly like the old "not set yet"
      this.midAttack = false; this.telegraphing = false; this.alerted = false; this.firstAtkT = 0; this.aimPitch = 0;
      this._lv = null; this._faceForced = false; this._teleIcon = null; this.leapG = 0; this._roll = 0; this.wantPath = false; this.pathRetryT = 0;
      if (def.plate) { this.plateMax = this.plateHp = Math.round(def.plate * diff.hp * (opts.hpMult || 1)); this.plateHitT = -99; }
      if (def.id === 'tote') { this.toteState = 'fly'; this.toteT = 0; this.dropsLeft = def.atk.drop.drops; this.leaveDir = new V3(); }
      // placement
      this.pos.copy(pos);
      const gy = world.phys.groundAt(pos.x, pos.z, this.r * 0.7, pos.y + 3);
      this.groundY = gy;
      if (this.fly) this.pos.y = Math.max(pos.y, gy + this.alt * (opts.fromAir ? 1 : 0.9));
      else if (!opts.fromAir) this.pos.y = gy;
      this.lastThinkPos.copy(this.pos);
      if (opts.alerted || this.behavior === 'assault' || def.id === 'tote') { this.alerted = true; this.setState('engage'); const kn = opts.target || (this.behavior === 'assault' && this.assaultTarget) || world.player; if (kn && kn.pos) { this.lastSeen.copy(kn.pos); this.lastSeenT = world.time; } this.firstAtkT = world.time + U.rand(0.5, 1.1) * (diff.react || 0.55) / 0.55; }
      rb.group.position.copy(this.pos); rb.group.rotation.y = this.yaw;
      s.robots.push(this);
    }
    get eyeY() { return this.pos.y + Math.max(0.4, this.h * 0.75); }
    eye(out) { return out.set(this.pos.x, this.eyeY, this.pos.z); }
    muzzle(out) { if (this.rb.parts.muzzle) { this.rb.group.updateMatrixWorld(true); return this.rb.parts.muzzle.getWorldPosition(out); } return this.eye(out); }
    moveK() { return (this.slowT > 0 ? this.slowK || 1 : 1); }
    setState(s) { if (this.state !== s) { this.state = s; this.stateT = 0; } }

    // ---------------- perception
    _pickTarget() {
      const w = this.world, pl = w.player;
      const plOk = pl && pl.alive && pl.targetable && pl.team !== this.team;
      let t = null;
      if (this.opts.target && this.opts.target.alive) t = this.opts.target;
      else if (this.aggro && this.aggro.alive && w.time < this.aggroUntil && this.behavior !== 'assault' && (!plOk || this.aggro.pos.distanceTo(this.pos) < pl.pos.distanceTo(this.pos))) t = this.aggro;
      if (this.behavior === 'assault' && this.assaultTarget && this.assaultTarget.alive) {
        if (plOk && pl.pos.distanceTo(this.pos) < 12) t = pl;
        else t = (this.prefersPlayer && plOk) ? pl : this.assaultTarget;
      } else if (!t && plOk) t = pl;
      if (!t) {
        // any other hostile actor nearby (allied ranger bots, buddies)
        let bd = 25;
        for (const a of w.actors) {
          if (!a.alive || !a.targetable || a.team === this.team || a.isCrate || a.hidden || a.isBossPart) continue;
          const d = a.pos.distanceTo(this.pos); if (d < bd) { bd = d; t = a; }
        }
      }
      if (t !== this.target) { this.target = t; this.hasLOS = false; }
    }
    _think() {
      const w = this.world;
      this._pickTarget();
      const t = this.target;
      if (t) {
        const tp = t.aimPoint(_m2);
        const d = this.pos.distanceTo(t.pos);
        this.hasLOS = d < 70 && w.phys.los(this.eye(_m1), tp, false);
        if (this.hasLOS) { this.lastSeen.copy(t.pos); this.lastSeenT = w.time; }
        if (!this.alerted) {
          let notice = false;
          if (this.hasLOS && d < 25) {
            const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
            const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z, dd = Math.hypot(dx, dz) || 1;
            if ((dx * fx + dz * fz) / dd > 0.5 || d < 4) notice = true;
          }
          if (!notice && t.isPlayer && t.lastFireT != null && w.time - t.lastFireT < 0.3 && d < 35) notice = true;
          if (notice) this.alert();
        }
      }
      // avoidance whiskers + stuck detection
      const moved = Math.hypot(this.pos.x - this.lastThinkPos.x, this.pos.z - this.lastThinkPos.z);
      const wantMove = Math.hypot(this.wishX, this.wishZ) > 1;
      if (wantMove && moved < 0.12 && !this.turretMode()) this.stuckN++; else this.stuckN = Math.max(0, this.stuckN - 1);
      this.lastThinkPos.copy(this.pos);
      if (this.stuckN >= 3) { this.stuckN = 0; this.detourT = 1.0; this.detourAng = (Math.random() < 0.5 ? 1 : -1) * U.rand(1.0, 2.0); this.wantPath = true; }
      const ml = Math.hypot(this.moveDirX, this.moveDirZ);
      if (ml > 0.1) {
        const a = this._whisker(this.moveDirX / ml, this.moveDirZ / ml);
        if (a === null) { this.wantPath = true; this.avoidAng = this.detourAng || 1.4; } else this.avoidAng = a;
      } else this.avoidAng = 0;
      // separation from other robots
      this.sepX = 0; this.sepZ = 0;
      for (const o of sys(w).robots) {
        if (o === this || !o.alive || o.fly !== this.fly) continue;
        const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, rr = this.r + o.r + 1.2;
        const d2 = dx * dx + dz * dz;
        if (d2 > rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), k = (rr - d) / rr;
        this.sepX += dx / d * k; this.sepZ += dz / d * k;
      }
      // strafe flip
      this.strafeT -= 0.2;
      if (this.strafeT <= 0) { this.strafeT = U.rand(0.8, 2.2); if (Math.random() < 0.6) this.strafeDir *= -1; }
      // pick an attack
      if (this.state === 'engage' && t && t.alive && !this.atk) this._chooseAttack();
    }
    turretMode() { return !!this.brain.turret; }
    _whisker(dx, dz) {
      const ph = this.world.phys;
      const y = this.pos.y + Math.min(0.7, this.h * 0.5);
      const L = this.r + 1.2 + Math.hypot(this.vel.x, this.vel.z) * 0.25;
      const pref = this.avoidAng >= 0 ? 1 : -1;
      for (let i = 0; i < WHISK.length; i++) {
        const a = WHISK[i] * pref;
        const c = Math.cos(a), s = Math.sin(a);
        const rx = dx * c + dz * s, rz = -dx * s + dz * c;
        const h = ph.raycast(this.pos.x, y, this.pos.z, rx, 0, rz, L, true);
        if (!h || h.ny > 0.6) return a;
      }
      return null;
    }
    alert(target, fromAlly) {
      if (target && target.pos && target.alive && target.team !== this.team && !target.isPlayer) { this.aggro = target; this.aggroUntil = this.world.time + 6; }
      // Being alerted (shot at, ally shout, alarm, spawn wave) tells the robot where the threat is. Without this
      // lastSeen stayed at (0,0,0) and robots that had no line of sight marched off to the map origin.
      const kn = target && target.pos && target.alive && target.team !== this.team ? target : this.world.player;
      if (kn && kn.alive && !this.hasLOS && this.alive) { this.lastSeen.copy(kn.pos); this.lastSeenT = this.world.time; }
      if (this.alerted || !this.alive) return;
      this.alerted = true;
      this.setState('alert');
      this.alertT = 0.45;
      this.firstAtkT = this.world.time + 0.45 + (this.diff.react || 0.55) * U.rand(1.0, 1.8);
      E.alertPop(this);
      sfx('enemyAlert', this.pos);
      if (!this.seenOnce) { this.seenOnce = true; markSeen(this.enemyId); }
      if (!fromAlly) for (const o of sys(this.world).robots) if (o !== this && !o.alerted && o.alive && o.pos.distanceTo(this.pos) < 12) E.after(this.world, U.rand(0.15, 0.45), () => o.alert(null, true));
    }
    _chooseAttack() {
      const t = this.target, br = this.brain;
      if (!br.attacks || !t) return;
      const d = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) - (t.isPlayer ? 0 : (t.r || 0) * 0.8);
      const now = this.world.time, s = sys(this.world), vsPl = !!t.isPlayer;
      if (vsPl && (now < (this.firstAtkT || 0) || now < s.nextAtkT)) return;
      for (const a of br.attacks) {
        if ((this.cds[a.id] || 0) > now) continue;
        if (d < a.min || d > a.max) continue;
        if (a.los !== false && !this.hasLOS) continue;
        if (a.heavy && vsPl && !s.heavy.has(this) && s.heavy.size >= s.heavyMax) continue;
        if (a.token !== false && !this.def.noToken && !this._takeToken()) return;
        if (a.heavy && vsPl) s.heavy.add(this);
        this._startAttack(a);
        if (vsPl) s.nextAtkT = now + s.gap * (a.heavy ? 1.5 : 1);
        return;
      }
    }
    _takeToken() {
      const t = this.target;
      if (!t || !t.isPlayer) return true;
      const s = sys(this.world);
      if (s.holders.has(this)) return true;
      if (s.holders.size >= s.tokMax) return false;
      s.holders.add(this);
      return true;
    }
    _releaseToken() { const s = this.world._esys; if (s) { s.holders.delete(this); s.heavy.delete(this); } }
    _startAttack(a) {
      this.atk = { def: a, t: 0, phase: 'tele', tele: Math.max(0.5, a.tele * this.teleK / Math.max(0.3, this.atkMult || 1)), dur: 0, data: {} };
      this.setState('atk');
      teleSound(this, a, this.atk.tele);
      if (a.begin) a.begin(this, this.atk);
      this._edgeMarker(true);
    }
    _edgeMarker(on) {
      if (!G.HUD || !G.HUD.marker || !this.target || !this.target.isPlayer) return;
      const id = 'etele' + this.id;
      if (on) {
        _m1.set(this.pos.x, this.pos.y + this.h, this.pos.z).project(G.R.camera);
        const off = _m1.z > 1 || Math.abs(_m1.x) > 1 || Math.abs(_m1.y) > 1;
        if (off) { G.HUD.marker(id, _m1.set(this.pos.x, this.pos.y + this.h, this.pos.z), { icon: '!', color: '#ff3f8e', dist: false }); this._marker = id; }
      } else if (this._marker) { G.HUD.removeMarker(this._marker); this._marker = null; }
    }
    _abortAttack() {
      const a = this.atk;
      if (!a) return;
      if (a.def.end) G.safe('atk end', () => a.def.end(this, a, true));
      this.atk = null;
      this.cds[a.def.id] = this.world.time + (a.def.cd || 1) * 0.5;
      this._releaseToken();
      this._edgeMarker(false);
      if (this._teleIcon) { teleIconFree(this.world, this._teleIcon); this._teleIcon = null; }
      if (this.state === 'atk') this.setState('engage');
    }
    _atkUpdate(dt) {
      const a = this.atk, d = a.def;
      a.t += dt;
      if (a.phase === 'tele') {
        const k = U.clamp(a.t / a.tele, 0, 1);
        if (d.teleTick) d.teleTick(this, dt, a, k);
        if (!this.target || !this.target.alive) { this._abortAttack(); return; }
        if (this._marker && G.HUD) G.HUD.marker(this._marker, _m1.set(this.pos.x, this.pos.y + this.h, this.pos.z), { icon: '!', color: '#ff3f8e', dist: false });
        if (a.t >= a.tele) {
          a.phase = 'act'; a.t = 0;
          this._edgeMarker(false);
          a.dur = d.exec ? (d.exec(this, a) || 0) : 0;
          if (this.dead || !this.alive || !this.atk) return;
        }
      } else if (a.phase === 'act') {
        const done = d.act ? d.act(this, dt, a) : a.t >= a.dur;
        if (done || a.t > Math.max(a.dur, 0) + 3) { a.phase = 'rec'; a.t = 0; if (d.end) d.end(this, a, false); this._releaseToken(); }
      } else if (a.phase === 'rec') {
        if (a.t >= (d.rec || 0.3)) {
          this.cds[d.id] = this.world.time + (d.cd || 1) / (this.fireK * (this.atkMult || 1));
          this.atk = null;
          this.setState('engage');
        }
      }
    }

    // ---------------- movement helpers
    steerDir(dx, dz, speed) {
      this.moveDirX = dx; this.moveDirZ = dz;
      let a = this.avoidAng;
      if (this.detourT > 0) a += this.detourAng;
      const c = Math.cos(a), s = Math.sin(a);
      let rx = dx * c + dz * s, rz = -dx * s + dz * c;
      rx += this.sepX * 0.9; rz += this.sepZ * 0.9;
      const l = Math.hypot(rx, rz) || 1;
      const sp = speed * this.moveK();
      this.wishX = rx / l * sp; this.wishZ = rz / l * sp;
    }
    steerTo(gx, gz, speed, arrive) {
      let dx = gx - this.pos.x, dz = gz - this.pos.z;
      let d = Math.hypot(dx, dz);
      if (d < (arrive || 0.6)) { this.moveDirX = this.moveDirZ = 0; this.wishX = this.sepX * speed * 0.5; this.wishZ = this.sepZ * speed * 0.5; return d; }
      // navgrid path when blocked (ground units only)
      if (!this.fly) {
        this.pathT -= 0.016;
        if (this.wantPath && sys(this.world).pathBudget > 0 && this.world.time >= (this.pathRetryT || 0) && (!this.path || Math.hypot(this.pathGoal.x - gx, this.pathGoal.z - gz) > 3 || this.pathT <= 0)) {
          sys(this.world).pathBudget--;
          this.wantPath = false;
          this.path = E.nav(this.world).findPath(this.pos.x, this.pos.z, gx, gz, 2600);
          this.pathI = 0; this.pathGoal.set(gx, 0, gz); this.pathT = 4;
          if (!this.path) this.pathRetryT = this.world.time + 1.5;   // unreachable: don't re-run A* every frame
        }
        if (this.path && Math.hypot(this.pathGoal.x - gx, this.pathGoal.z - gz) < 5 && this.pathT > 0) {
          let wp = this.path[this.pathI];
          while (wp && Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z) < 1.0 && this.pathI < this.path.length - 1) wp = this.path[++this.pathI];
          if (wp) { dx = wp.x - this.pos.x; dz = wp.z - this.pos.z; const dl = Math.hypot(dx, dz) || 1; this.steerDir(dx / dl, dz / dl, speed); return d; }
        } else if (this.path) this.path = null;
      }
      this.steerDir(dx / d, dz / d, speed);
      return d;
    }
    _bandMove() {
      const t = this.target, br = this.brain;
      if (!t) { this.wishX = this.wishZ = 0; return; }
      let dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
      const dc = Math.hypot(dx, dz) || 1;
      const d = dc - (t.isPlayer ? 0 : (t.r || 0) * 0.8);
      dx /= dc; dz /= dc;
      if (!this.hasLOS && this.world.time - this.lastSeenT < 6) { if (d > 6) this.wantPath = true; this.steerTo(this.lastSeen.x, this.lastSeen.z, this.speed, 1); return; }
      if (!this.hasLOS && d > 4) { this.wantPath = true; this.steerTo(t.pos.x, t.pos.z, this.speed, 1); return; }
      const band = this.band;
      let radial = d > band[1] ? 1 : d < band[0] ? -1 : 0;
      if (d > band[1] + 8) { this.steerTo(t.pos.x, t.pos.z, this.speed, 1); return; }
      const strafe = (br.strafe != null ? br.strafe : 0.5) * this.strafeDir;
      let mx = dx * radial + (-dz) * strafe, mz = dz * radial + dx * strafe;
      const ml = Math.hypot(mx, mz);
      if (ml < 0.05) { this.wishX = this.sepX * 2; this.wishZ = this.sepZ * 2; this.moveDirX = this.moveDirZ = 0; return; }
      const sp = this.speed * (radial === 0 ? 0.65 : 1);
      this.steerDir(mx / ml, mz / ml, sp);
      if (this.hitWall && radial === 0) this.strafeDir *= -1;
    }

    // ---------------- FSM
    _fsm(dt) {
      this.stateT += dt;
      const t = this.target, br = this.brain;
      if (this.detourT > 0) this.detourT -= dt;
      if (br.tick) br.tick(this, dt);
      switch (this.state) {
        case 'idle': {
          if (this.behavior === 'guard') { this.wishX = this.sepX; this.wishZ = this.sepZ; this.moveDirX = this.moveDirZ = 0; if (this.stateT > 3) { this.stateT = 0; this.yaw += U.rand(-1, 1); } }
          else if (this.speed > 0 && this.patrol) {
            const wp = this.patrol[this.patrolI % this.patrol.length];
            if (this.steerTo(wp.x, wp.z, this.speed * 0.5, 1.2) < 1.5) this.patrolI++;
          } else if (this.speed > 0) {
            if (!this.wander || this.stateT > this.wanderT) {
              this.wander = (this.wander || new V3()).set(this.home.x + U.rand(-9, 9), 0, this.home.z + U.rand(-9, 9));
              this.wanderT = U.rand(3, 6); this.stateT = 0; this.pauseT = U.rand(0.5, 2);
            }
            if (this.stateT < this.pauseT) { this.wishX = this.wishZ = 0; this.moveDirX = this.moveDirZ = 0; }
            else this.steerTo(this.wander.x, this.wander.z, this.speed * 0.45, 1);
          } else { this.wishX = this.wishZ = 0; this.yaw += Math.sin(this.world.time * 0.4 + this.id) * 0.3 * dt; }
          if (this.alerted) this.setState('engage');
          break;
        }
        case 'alert': {
          this.wishX = this.wishZ = 0; this.moveDirX = this.moveDirZ = 0;
          if (this.stateT > 0.45) this.setState('engage');
          break;
        }
        case 'engage': {
          if (!t || !t.alive) {
            if (this.behavior === 'assault' && this.assaultTarget && this.assaultTarget.alive) { this.steerTo(this.assaultTarget.pos.x, this.assaultTarget.pos.z, this.speed, 3); break; }
            this.setState('search'); break;
          }
          if (br.custom) { br.custom(this, dt); break; }
          if (this.behavior === 'guard' && this.home.distanceTo(this.pos) > this.leash + 6 && t.pos.distanceTo(this.home) > this.leash) { this.setState('return'); break; }
          if (!this.hasLOS && this.world.time - this.lastSeenT > 6 && this.behavior !== 'assault') { this.setState('search'); break; }
          if (this.speed <= 0) { this.wishX = this.wishZ = 0; break; }
          if (br.move) br.move(this, dt);
          else if (br.chase) this.steerTo(t.pos.x, t.pos.z, this.speed, 0.4);
          else this._bandMove();
          break;
        }
        case 'atk': {
          // keep a bit of footwork during telegraphs (slow strafe), none while executing
          const a = this.atk;
          if (a && a.phase === 'tele' && !br.turret && a.def.id !== 'boom' && this.speed > 0) {
            const tt = this.target; if (tt) { _m1.set(-(tt.pos.z - this.pos.z), 0, tt.pos.x - this.pos.x).normalize(); this.steerDir(_m1.x * this.strafeDir, _m1.z * this.strafeDir, this.speed * 0.25); }
          } else if (!this.charging && a && a.def.id !== 'boom') { this.wishX = this.wishZ = 0; this.moveDirX = this.moveDirZ = 0; }
          if (this.atk) this._atkUpdate(dt);
          else this.setState('engage');
          break;
        }
        case 'search': {
          if (t && t.alive && this.hasLOS) { this.setState('engage'); break; }
          const d = this.steerTo(this.lastSeen.x, this.lastSeen.z, this.speed * 0.7, 1.5);
          if (d < 1.5) { this.wishX = this.wishZ = 0; this.yaw += dt * 1.5; }
          if (this.stateT > 8) { this.alerted = false; this.setState(this.behavior === 'guard' ? 'return' : 'idle'); }
          break;
        }
        case 'return': {
          const d = this.steerTo(this.home.x, this.home.z, this.speed, 1.2);
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1 * dt);
          if (d < 1.5) { this.alerted = false; this.setState('idle'); }
          if (t && t.alive && this.hasLOS && t.pos.distanceTo(this.home) < this.leash) { this.alerted = true; this.setState('engage'); }
          break;
        }
        default: this.setState('idle');
      }
    }

    // ---------------- update
    update(dt) {
      const w = this.world;
      this.applyStatus(dt);
      if (!this.alive) { this._popUpdate(dt); return; }
      if (this.frozenT > 0) this.frozenT -= dt;
      if (this.danceT > 0) this.danceT -= dt;
      if (this.plantT > 0) this.plantT -= dt;
      if (this.wallStunT > 0) this.wallStunT -= dt;
      if (this.hurtT > 0) this.hurtT -= dt;
      const disabled = this.stunT > 0 || this.frozenT > 0 || this.danceT > 0 || this.plantT > 0 || this.wallStunT > 0 || this.frozen || this.dancing || this.planted;
      this.midAttack = !!this.atk; this.telegraphing = !!(this.atk && this.atk.phase === 'tele');
      if (disabled) {
        if (this.atk) this._abortAttack();
        this.wishX = this.wishZ = 0; this.moveDirX = this.moveDirZ = 0;
        if (!this.alerted && (this.stunT > 0 || this.frozenT > 0 || this.frozen)) this.alerted = true;
      } else {
        this.thinkT -= dt;
        if (this.thinkT <= 0) { this.thinkT = 0.2 + Math.random() * 0.03; this._think(); }
        this._fsm(dt);
      }
      this._facing(dt, disabled);
      this._move(dt);
      if (!this.alive) { this._popUpdate(dt); return; }
      this._animate(dt, disabled);
      if (this.vanish) { this.dead = true; }
    }
    _facing(dt, disabled) {
      if (disabled || this.charging) return;
      const t = this.target;
      let want = null;
      if (t && (this.state === 'atk' || this.state === 'alert' || ((this.state === 'engage') && (this.hasLOS || this.faceTarget || this.brain.scuttle)))) want = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
      else if (Math.hypot(this.wishX, this.wishZ) > 0.4) want = Math.atan2(this.wishX, this.wishZ);
      if (want === null) return;
      if (this.def.turn) { const dd = U.wrapAngle(want - this.yaw), mx = this.def.turn * dt * (this.slowT > 0 ? this.slowK : 1); this.yaw += U.clamp(dd, -mx, mx); }
      else this.yaw = U.angleDamp(this.yaw, want, this.state === 'atk' && this.atk && this.atk.phase !== 'tele' ? 3 : 7, dt);
      if (t && this.state === 'atk') {
        const ty = t.aimPoint(_m2).y, ey = this.pos.y + this.h * 0.6;
        const hd = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) || 1;
        this.aimPitch = Math.atan2(ty - ey, hd);
      } else this.aimPitch = U.damp(this.aimPitch || 0, 0, 4, dt);
    }
    _move(dt) {
      const w = this.world, v = this.vel;
      if (this.fly) {
        const gy = w.phys.groundAt(this.pos.x, this.pos.z, this.r, this.pos.y + 1);
        this.groundY = gy;
        const bob = Math.sin(w.time * 2.2 + this.id) * 0.25;
        const tgtY = gy + this.alt + this.altBoost + bob + (this.hitWall ? 2 : 0);
        if (this.hitWall) this.altBoost = Math.min(8, this.altBoost + dt * 6); else this.altBoost = Math.max(this.toteState === 'leave' ? this.altBoost : 0, this.altBoost - dt * 1.5);
        v.y = U.clamp((tgtY - this.pos.y) * 2.5, -6, 6);
        const k = 1 - Math.exp(-4 * dt);
        v.x += (this.wishX - v.x) * k; v.z += (this.wishZ - v.z) * k;
      } else {
        if (this.leaping) { v.y -= (this.leapG || 20) * dt; }
        else {
          if (!this.grounded) v.y -= 22 * dt;
          const ground = this.grounded;
          const acc = ground ? (this.charging ? 30 : 14) : 2;
          const k = 1 - Math.exp(-acc * dt * 0.5);
          v.x += (this.wishX - v.x) * k; v.z += (this.wishZ - v.z) * k;
        }
        if (v.y < -28) v.y = -28;
      }
      w.phys.moveBody(this, dt);
      if (!this.fly && this.grounded) this.groundY = this.pos.y;
      if (this.fell) { this.alive = false; this.vanish = true; this.dead = true; }
    }
    // Distance LOD with hysteresis (tier-3 bots keep detail 35% longer): < L0 the full rig (skinned parts +
    // face = 2 draw calls; L0 = 30 m on High, 22 m on Medium, 18 m on Low — a robot past that is ~15–20 px tall
    // on a phone, where limb animation doesn't read), then ONE static rest-pose mesh + the live face (2 calls), beyond
    // ~60 m the face baked in (1 call), no halo / jets and no shadow for flyers; beyond 90 m the animation is skipped
    // (root transform only).
    // The swap is pop-free in both directions: past L0 + 2 the limbs first ease to the rest pose (~0.6 s; the rig
    // stays until they have; this._dk -> animateRobot opts.detail), and after a swap back (inside L0 - 2) they ease in
    // from it — so the rig animates fully right up to the switch distance. Bosses stay full.
    // Busy camps: past 6 robots within 45 m the full-rig distance shrinks 4% per extra robot (to 65%: 30 m -> 19.5 m on
    // High with 15 around), so a crowd keeps only its nearest robots as full rigs and the rest on the reduced LOD1
    // twins (15b LOD_SEG). Each step moves L0 by ~1 m, inside the ±2 m hysteresis, so a robot joining or leaving the
    // crowd never makes the others flicker between levels.
    _lod(dt) {
      const d2 = G.R.camera.position.distanceToSquared(this.pos);
      const d = Math.sqrt(d2) / (this.tier === 3 ? 1.35 : 1);
      const es = this.world && this.world._esys, crowd = es ? es.crowd | 0 : 0;
      // (never under 16 m, and a robot winding up / attacking keeps the full distance: its wind-up face stays readable)
      const qn = G.R.qualityName ? G.R.qualityName() : 'high', LB = qn === 'low' ? 18 : qn === 'med' ? 22 : 30;
      const L0 = this.state === 'atk' ? LB : Math.max(Math.min(LB, 16), LB * U.clamp(1 - (crowd - 6) * 0.04, 0.65, 1));
      let lv = this._lv;
      if (lv == null) { lv = d > L0 ? (d > 60 ? 2 : 1) : 0; this._dk = lv ? 0 : 1; }
      else if (lv === 0) { if (d > L0 + 2) lv = d > 62 ? 2 : 1; }
      else if (lv === 1) { if (d < L0 - 2) lv = 0; else if (d > 62) lv = 2; }
      else if (d < 58) lv = d < L0 - 2 ? 0 : 1;
      if (this.isBoss) lv = 0;
      // _dk runs 1 -> -1: detail eases to 0 over 0.3 s, then 0.3 s more for the eased joints (head / arms) to land
      // on the rest pose before the static mesh takes over
      const step = (dt || 0) / 0.3;
      if (lv === 0) this._dk = Math.min(1, Math.max(0, this._dk) + step);
      else if (this._lv === 0 && this._dk > -1) { this._dk = Math.max(-1, this._dk - step); lv = 0; }   // settle limbs first
      else this._dk = 0;
      const k = this._dk > 0 ? this._dk : 0;
      this._detail = k * k * (3 - 2 * k);
      if (lv !== this._lv) {
        this._lv = lv;
        if (this.rb.setLOD) this.rb.setLOD(lv);
        const P = this.rb.parts;
        if (P.shadow) P.shadow.visible = !(lv === 2 && this.fly);
      }
      // Mid level, still the full animated rig: once the robot's body is under ~22 px in radius on this screen (size-
      // and resolution-aware: ~10 m for a Bumbler at 720 px, ~7 m on a 390 px phone, further for big robots; up to 25 %
      // nearer in a crowd) its skin swaps for the 0.7 twin on the same skeleton (15b setMid) — same pose, same face,
      // a silhouette within a pixel, about two thirds of the triangles. ±0.6 m hysteresis.
      if (this.rb.setMid) {
        const cam = G.R.camera, pxm = (G.R.h || 720) / (2 * Math.tan((cam.fov || 60) * Math.PI / 360));
        const dm = U.clamp(pxm * (this.rb.radius || 0.45) / 22 * U.clamp(1 - (crowd - 6) * 0.03, 0.75, 1), 5, 24), dr = Math.sqrt(d2);
        const mid = lv === 0 && !this.isBoss && (this.rb.mid ? dr > dm - 0.6 : dr > dm + 0.6);
        if (mid !== !!this.rb.mid) this.rb.setMid(mid);
      }
      return d2;
    }
    _animate(dt, disabled) {
      const rb = this.rb, o = this._ao, t = this.world.time;
      const hs = Math.hypot(this.vel.x, this.vel.z);
      // rendered facing: critically damped spring on the sim yaw — turns ease in and out instead of starting at
      // full rate, and sim-side snaps (charge lock-on, patrol corners, strafe flips) never show as a snap. The sim
      // yaw (melee arcs, shield plate, aim) is untouched; the visual lag is ~2/ω ≈ 0.1 s.
      const vyw = this._vyaw;
      if (vyw.x !== vyw.x) { vyw.x = this.yaw; vyw.v = 0; }
      vyw.t = vyw.x + U.wrapAngle(this.yaw - vyw.x);
      G.Geo.springStep(vyw, dt);
      if (Math.abs(vyw.x) > 40) vyw.x = U.wrapAngle(vyw.x);
      if (this._lod(dt) > 90 * 90 && !this.isBoss) {
        // root transform only out here; a pending pop-in is skipped (it would otherwise play the moment the robot
        // first comes within 90 m, shrinking a robot that was already visible)
        if (rb.anim.spawnT < 1) { rb.anim.spawnT = 99; rb.parts.rig.scale.set(1, 1, 1); }
        rb.group.position.copy(this.pos); rb.group.rotation.y = vyw.x; return;
      }
      let st = 'idle';
      // real ground speed in every state: charges, bash / claw lunges and wind-up footwork step instead of sliding
      o.speed = hs; o.telegraph = 0; o.expr = undefined; o.flash = 0; o.wind = -1;
      o.aim = this.aimPitch || 0;
      o.look = NaN;   // unset: idle robots look around / glance on their own
      o.vx = this.vel.x; o.vz = this.vel.z; o.vy = this.fly || this.grounded ? 0 : this.vel.y;
      o.yaw = vyw.x; o.turn = vyw.v; o.detail = this._detail;
      // engaged robots keep their eyes on the target: the head leads, the body follows on its (slower) spring
      const lt = this.target;
      if (lt && lt.alive && !disabled && (this.state === 'engage' || this.state === 'atk' || this.state === 'alert')) o.look = U.clamp(U.wrapAngle(Math.atan2(lt.pos.x - this.pos.x, lt.pos.z - this.pos.z) - vyw.x), -1.1, 1.1) * 0.8;
      const dancing = this.danceT > 0 || this.dancing;
      if (disabled) st = dancing ? 'move' : 'stun';
      else if (this.state === 'atk' && this.atk) {
        if (this.atk.phase === 'tele') { st = 'windup'; o.wind = U.clamp(this.atk.t / this.atk.tele, 0, 1); o.telegraph = 0.55 + 0.45 * Math.sin(this.atk.t * 6 * TAU); }
        else st = 'attack';
        if (this.atk.def.id === 'boom') { st = 'move'; o.speed = hs; o.telegraph = this.atk.phase === 'tele' ? (Math.sin(this.atk.t * U.lerp(2, 10, this.atk.t / this.atk.tele) * TAU) > 0 ? 1 : 0.15) : 1; }
      } else if (hs > 0.3 || this.def.mobility === 'prop') { st = 'move'; o.speed = Math.max(hs, 0.5); }
      if (dancing) { o.speed = 2; o.expr = 'happy'; }
      const iced = this.frozenT > 0 || this.frozen;
      if (iced) { rb.group.position.copy(this.pos); rb.group.rotation.y = vyw.x; if (!this._iced) { if (rb.mat && rb.mat.emissive) rb.mat.emissive.setRGB(0.2, 0.38, 0.58); this._iced = true; } return; }
      if (this.state === 'alert') o.expr = 'alert';
      else if (this.hurtT > 0 && st !== 'windup') o.expr = 'hurt';
      else if (this.state === 'atk' && this.atk) o.expr = focusExpr();   // determined, never angry
      if (this.def.id === 'rollo' && st === 'idle') { st = 'move'; o.speed = hs; }
      G.Geo.animateRobot(rb, st, t, dt, o);
      const P = rb.parts;
      this._poseExtras(st, o, t, dt);
      const tg = rb.extras.teleGlow;
      if (tg) {
        const a = this.state === 'atk' && this.atk && this.atk.phase === 'tele' ? this.atk : null;
        const k = a ? U.clamp(a.t / a.tele, 0, 1) : 0;
        const op = a ? (0.35 + 0.45 * k) * (0.55 + 0.45 * Math.sin(a.t * 6 * TAU)) : 0;
        tg.material.opacity = U.damp(tg.material.opacity, op, a ? 30 : 12, dt);
        if (a) tg.scale.setScalar(tg.userData.base * (0.85 + 0.35 * k));
        // screen-constant "!" badge over attackers aiming at the player (on-screen; off-screen ones get the edge arrow)
        const want = a && this.target && this.target.isPlayer && !this._marker;
        if (want && !this._teleIcon) this._teleIcon = teleIcon(this.world);
        else if (!want && this._teleIcon) { teleIconFree(this.world, this._teleIcon); this._teleIcon = null; }
        if (this._teleIcon) {
          this._teleIcon.position.set(this.pos.x, this.pos.y + this.h + 0.45 + 0.08 * Math.sin(a.t * 12), this.pos.z);
          this._teleIcon.scale.setScalar(0.055 + 0.02 * k + 0.008 * Math.sin(a.t * 6 * TAU));
        }
      }
      // LED face overrides (texture -> texture swaps: no program rebuild): yellow "!" while alerted, and the
      // wide-eyed 'focused' face (pink LEDs while charging) for wind-ups and attacks — the rig's own telegraph
      // face is the slanted 'angry' one, which read as scary.
      const wantFace = this.state === 'alert' ? 1 : this.state === 'atk' && this.atk && rb._faceOf && !(this.hurtT > 0 && this.atk.phase !== 'tele') ? 2 : 0;
      if (wantFace && P.face && P.face.material) {
        const tex = wantFace === 1 ? (rb._alertTex || (rb._alertTex = G.Geo.face('alert', { style: rb.spec.eyes === 'toon' ? 'toon' : 'led', color: C.alert, eyes: rb.spec.eyes === 'led1' ? 'one' : rb.spec.eyes === 'visor' ? 'visor' : 'two' })))
          : rb._faceOf(focusExpr(), rb.tele > 0.08);
        if (P.face.material.map !== tex) P.face.material.map = tex;
        this._faceForced = true;
      } else if (this._faceForced) { this._faceForced = false; rb.expr = '?'; rb._applyFace && rb._applyFace(); }
      // frozen = icy tint, dance = wiggle
      if (this._iced) { this._iced = false; rb.flash = -1; rb.setFlash(0); }
      if (dancing) { P.rig.position.y += Math.abs(Math.sin(t * 9)) * 0.18 * this.size; P.body.rotation.z = Math.sin(t * 9) * 0.25; this.yaw += dt * 3; }
      if (rb.extras.cargo) {
        // slung crate: a damped pendulum that hangs plumb against the copter's tilt and swings back on acceleration
        const cg = rb.extras.cargo, A = rb.anim, cs = this._cargo || (this._cargo = { x: { x: 0, v: 0, t: 0, f: 0.9, z: 0.15 }, z: { x: 0, v: 0, t: 0, f: 0.9, z: 0.15 } });
        cg.visible = this.dropsLeft > 0 && this.toteState !== 'leave';
        cs.x.t = U.clamp(-A.lean + A.alf * 0.05 - hs * 0.02, -0.6, 0.6);
        cs.z.t = U.clamp(-A.roll - A.ala * 0.05, -0.6, 0.6) + Math.sin(t * 2.3 + this.id) * 0.05;
        G.Geo.springStep(cs.x, dt); G.Geo.springStep(cs.z, dt);
        cg.rotation.set(cs.x.x, 0, cs.z.x);
      }
      // rollo tumbling stripes
      if (rb.extras.roller) { this._roll = (this._roll || 0) + hs * dt / Math.max(0.2, 0.33 * this.size); rb.extras.roller.rotation.x = this._roll; }
      // tote: shadow under copter
      rb.group.position.copy(this.pos);
      rb.group.rotation.y = vyw.x;
      if (this.fly && P.shadow) {
        const hgt = this.pos.y - this.groundY;
        P.shadow.position.y = -hgt + 0.03;
        P.shadow.scale.setScalar(rb._shadowBase * 2.2 * U.clamp(1.2 - hgt / 16, 0.5, 1.2));
      }
      if (rb.extras.bubble) {
        const b = rb.extras.bubble;
        b.visible = b.userData.on = this.shield > 0;
        if (b.visible) { const p = 1 + 0.03 * Math.sin(t * 5 + this.id); b.scale.x = b.userData.sx || (b.userData.sx = b.scale.x); b.scale.set(b.userData.sx * p, b.scale.y, b.userData.sx * p); }
      }
    }

    // Per-type poses layered on the rig after animateRobot (full-detail rig only; the far LOD is the rest pose):
    // Bruiser holds its fists up in front, Lobba's mortar rises and swings forward over its head during the
    // wind-up and kicks on each shot; weak-spot glows pulse (Bruiser's back battery only while wall-stunned)
    // and pop when crit.
    _poseExtras(st, o, t, dt) {
      const rb = this.rb, P = rb.parts, ex = rb.extras, full = !rb.lod;
      if (this.def.id === 'bruiser' && full && P.armL && P.armR) {
        this._fistK = U.damp(this._fistK || 0, st === 'windup' || st === 'attack' || st === 'stun' ? 0 : -0.62, 8, dt);
        P.armL.rotation.x += this._fistK; P.armR.rotation.x += this._fistK;
      }
      const mt = ex.mortar;
      if (mt) {
        let rx = 0, up = 0;
        if (st === 'windup') { const k = o.wind >= 0 ? o.wind : 0, ks = k * k * (3 - 2 * k); rx = 0.5 * ks + Math.sin(t * 40) * 0.025 * ks; up = 0.08 * ks; }
        else if (st === 'attack') { rx = 0.5; up = 0.08; }
        const kick = this._mortarKick || 0;
        if (kick > 0) this._mortarKick = Math.max(0, kick - dt * 5);
        this._mortarRx = this._mortarRx == null ? rx : U.damp(this._mortarRx, rx, st === 'windup' ? 14 : 7, dt);
        if (full) { mt.rotation.x = this._mortarRx - kick * 0.2; mt.position.y = mt.userData.y0 + up - kick * 0.04; mt.scale.set(1 + kick * 0.08, 1 - kick * 0.14, 1 + kick * 0.08); }
      }
      if (this._critPop > 0) this._critPop = Math.max(0, this._critPop - dt * 4);
      const vg = ex.ventGlow;
      if (vg) {
        const brz = this.def.id === 'bruiser', open = !brz || this.wallStunT > 0;
        const want = (open ? (brz ? 1 : vg.userData.op) : vg.userData.op) * (open ? 0.82 + 0.18 * Math.sin(t * 9) : 1);
        vg.material.opacity = U.damp(vg.material.opacity, want, 10, dt);
        const sc = vg.userData.base * (open && brz ? 1.6 : 1) * (1 + 0.7 * this._critPop);
        if (Math.abs(vg.scale.x - sc) > 1e-4) vg.scale.setScalar(sc);
      } else if (P.coreGlow && this._coreL) {
        const cg = P.coreGlow, b = cg.userData.base || (cg.userData.base = cg.scale.x), sc = b * (1 + 0.9 * this._critPop);
        if (Math.abs(cg.scale.x - sc) > 1e-4) cg.scale.setScalar(sc);
      }
    }
    // ---------------- damage / death
    takeDamage(amount, info) {
      if (!this.alive) return NO_DMG;
      info = info || {};
      if (this.world.dmgTakenMultBuiltin) amount *= this.dmgTakenMult || 1;
      if (this.leaping && this.def.atk.leap) amount *= this.def.atk.leap.airMult;
      if (this.brain.damageMod) amount = this.brain.damageMod(this, amount, info);
      if (!(amount > 0)) {
        // blocked (shield plate): a small eased flash + a nudge, no damage
        if (this.rb.hit) this._react(info, 6, false, 0.25); else this.rb.anim.flashT = 0.04;
        if (!this.alerted) this.alert();
        const b = this.blocked || 0; this.blocked = 0;
        return b > 0 ? { dealt: b, toShield: b, killed: false } : NO_DMG;
      }
      return super.takeDamage(amount, info);
    }
    onShieldBreak() {
      const b = this.rb.extras.bubble;
      if (b) { E.popFx(this.world, _m1.set(this.pos.x, this.pos.y + this.h * 0.5, this.pos.z), [C.bubble, 0xffffff, C.gold], 0.6); }
      sfx('shieldBreak', this.pos, { pitch: 1.4 });
    }
    // Directional hit reaction on the rig (flinch away from the blow, squash, head snap, eased flash); big hits
    // (>= 20% of the health pool, or a blast >= 10%) stagger. Damage-over-time ticks only glow.
    _react(info, amt, big, kOverride) {
      const rb = this.rb;
      if (info && info.type === 'dot') { rb.anim.flash = Math.max(rb.anim.flash, 0.3); return; }
      let dx = 0, dz = 0;
      const d = info && info.dir, sp = (info && info.pos) || (info && info.src && info.src.pos);
      if (d && d.lengthSq && d.lengthSq() > 1e-6) { dx = d.x; dz = d.z; }
      else if (sp) { dx = this.pos.x - sp.x; dz = this.pos.z - sp.z; }
      const k = kOverride != null ? kOverride : U.clamp(0.35 + amt / Math.max(20, this.maxHp * 0.3), 0.35, 1.2);
      // rapid fire: later hits within 60 ms push less, so a stream of pellets leans the robot back instead of rattling it
      rb.hit(dx, dz, rb.anim.hitT < 0.06 && !big ? k * 0.35 : k, big);
    }
    onHurt(info, amt) {
      if (this.rb.hit) {
        const frac = amt / Math.max(1, this.maxHp + this.maxShield);
        this._react(info, amt, amt >= 30 && (frac >= 0.2 || (!!info && info.type === 'explosion' && frac >= 0.1)));
      } else this.rb.anim.flashT = 0.06;
      this.rb.anim.recoil = Math.max(this.rb.anim.recoil, Math.min(1, 0.25 + amt / Math.max(20, this.maxHp * 0.3)));
      if (info && info.crit) this._critPop = 1;   // the weak spot's glow pops on a crit
      this.hurtT = 0.22;
      if (!this.alerted) this.alert();
      if (info && info.src && info.src.alive && info.src.team !== this.team && !info.src.isPlayer && !info.src.isCrate) { this.aggro = info.src; this.aggroUntil = this.world.time + 5; }
    }
    selfDestruct(k, killed) {
      if (this.exploded) return;
      this.exploded = true;
      this.selfDestructed = !killed;
      const A = this.def.atk.boom;
      E.blast(this.world, _m1.set(this.pos.x, this.pos.y + 0.4, this.pos.z), A.r, A.dmg * k, { src: this, friendly: true, color: C.orange, knock: 8 });
      if (!killed) {
        this.alive = false; this.hp = 0;
        this._cleanup();
        this.popT = 0;
      }
    }
    onDeath(info) {
      const w = this.world;
      this._cleanup();
      this.popT = 0;
      if (this.brain.onDeath) G.safe('onDeath', () => this.brain.onDeath(this, info));
      const p = _m3.set(this.pos.x, this.pos.y + this.h * 0.5, this.pos.z).clone();
      // the burst (blobs, ring, confetti, chip) fires when the death animation actually pops (after its squash +
      // inhale, G.Geo.ROBOT_POP_AT), so the visual and the effect land on the same frame; sound + loot stay instant
      this._popFxDue = true;
      sfx('enemyDie', this.pos, { pitch: this.tier === 3 ? 0.75 : 1 });
      if (!this.opts.noLoot && !this.selfDestructed) {
        const ck = (info && info.clinkMult > 0 ? info.clinkMult : 1) * (this.frozenT > 0 ? 1.5 : 1) * (this.opts.lootMult != null ? this.opts.lootMult : 1);
        const ok = !this.opts.localLoot && E.dataDrop(w, p, this.def.loot, { elite: this.elite, difficulty: this.diff.id, clinkMult: ck, extraRolls: this.opts.extraRolls || 0, heat: heatN(this.opts.heat) });
        if (!ok) E.dropLoot(w, p, { clinks: this.clinks, rolls: this.rolls, table: null, weights: this.partW, elite: this.elite, lootMult: ck, luck: (this.diff.luck || 0) + (this.opts.luck || 0) });
        if (Math.random() < 0.2) w.pickups.spawn('ammo', p, { value: 0.15, others: 0.05 });
        if (Math.random() < 0.1) w.pickups.spawn('health', p, { value: 25 });
        if (this.bossLite) E.dataDrop(w, p, 'metal', { difficulty: this.diff.id, extraRolls: 1 });
      }
    }
    _cleanup() {
      if (this.atk) this._abortAttack();
      this._releaseToken();
      if (this.rb && this.rb.extras.teleGlow) this.rb.extras.teleGlow.material.opacity = 0;
      if (this._teleIcon) { teleIconFree(this.world, this._teleIcon); this._teleIcon = null; }
      this._edgeMarker(false);
      if (this.shadowWarn) { this.shadowWarn.kill(); this.shadowWarn = null; }
    }
    _popUpdate(dt) {
      if (this.vanish && !this.selfDestructed) { this.dead = true; return; }
      this.popT += dt;
      const done = G.Geo.animateRobot(this.rb, 'dead', this.world.time, dt, this._ao);
      if (this._popFxDue && (this.rb.anim.deadT >= (G.Geo.ROBOT_POP_AT || 0) || done || this.popT > 0.8)) { this._popFxDue = false; this._popBurst(); }
      this.rb.group.position.copy(this.pos);
      if (done || this.popT > 0.8) this.dead = true;
    }
    _popBurst() {
      const w = this.world, p = _m3.set(this.pos.x, this.pos.y + this.h * 0.5, this.pos.z);
      E.popFx(w, p, [this.def.spec.color, this.def.spec.accent, this.def.spec.metal], Math.max(0.7, this.size * 0.75));
      if (this.elite) w.fx.confetti(p, 50);
      E.chipFloat(w, _m1.set(this.pos.x, this.pos.y + this.h * 0.8, this.pos.z), 1);
    }
    dispose() {
      this._cleanup();
      const s = this.world._esys;
      if (s) { const i = s.robots.indexOf(this); if (i >= 0) s.robots.splice(i, 1); }
      if (this.rb && this.rb.extras.teleGlow) this.rb.extras.teleGlow.material.dispose();
      if (this.rb) this.rb.dispose();
      super.dispose();
    }
  }
  E.Enemy = Enemy;

  E.spawn = function (world, typeId, pos, opts) {
    const def = E.defs[typeId];
    if (!def) { console.warn('[enemies] unknown type', typeId); return null; }
    if (!G.Geo || !G.Geo.robot) { console.warn('[enemies] G.Geo.robot missing'); return null; }
    const e = new Enemy(world, def, pos || new V3(), opts || {});
    world.addActor(e);
    if (G.Geo.useLayers && e.mesh) G.Geo.useLayers(e.mesh, world.scene);   // shadow + halo via the shared scene layers
    // pop in (overshoot + sparkle) only when the robot appears mid-fight (waves, drops, boss adds, camps waking up):
    // robots placed while a level populates are simply there (they used to all pop at once on the first frame)
    if (e.rb.spawnIn && !(opts && opts.popIn === false) && world.time > 0.5) { e.rb.spawnIn(); spawnSparkle(world, e); }
    return e;
  };
  function spawnSparkle(w, e) {
    if (!w.fx) return;
    const pl = w.player;
    if (pl && pl.pos && pl.pos.distanceToSquared(e.pos) > 55 * 55) return;
    const k = Math.min(2, e.size);
    w.fx.burst(_m1.set(e.pos.x, e.pos.y + e.h * 0.45, e.pos.z), [0xffffff, e.def.spec.accent || C.yellow, 0xfff3a0], Math.round(8 + 6 * k), 2.6 + 1.2 * k, 0.15, 0.5, { grav: -2.5, drag: 2.5 });
  }
  E.list = function (world) { const s = world && world._esys; return s ? s.robots.filter(r => r.alive) : []; };
  E.count = function (world) { const s = world && world._esys; let n = 0; if (s) for (const r of s.robots) if (r.alive) n++; return n; };
  E.tokensInUse = function (world) { const s = world && world._esys; return s ? s.holders.size : 0; };
  E.setCap = function (world, n) { sys(world).cap = n; };
  // Pinchbot King (Q06 boss-lite): elite Pinchbot, 800 HP, 1.5x size, crown.
  E.spawnPinchKing = function (world, pos, opts) {
    const e = E.spawn(world, 'pinch', pos, Object.assign({ elite: true, hp: 800, scale: 1.5, displayName: G.t('enemy.pinch_king.name') }, opts || {}));
    if (e) { e.isBoss = true; e.bossLite = true; e.bossId = 'pinch_king'; e.rolls = 3; e.clinks = [120, 180]; e.immovable = true; }
    return e;
  };

  // ------------------------------------------------------------------ crates (GDD §8.2)
  const CRATES = {
    wood: { hits: 1, col: 0xf0d3a2, dark: 0xc99a66, clinks: [6, 12], roll: 0.25, table: 'wood' },
    metal: { hits: 3, col: 0xbdb5ec, dark: 0x8e88c8, clinks: [15, 30], roll: 1, table: 'metal' },
    ammo: { hits: 1, col: 0xfff1dc, dark: 0x39d5ff },
    health: { hits: 1, col: 0xff9fc2, dark: 0xffffff },
    boom: { hits: 1, col: 0xff5a3d, dark: 0xffd23f, fuse: 3.0, dmg: 40, r: 3.5 },
    lumite: { hits: 3, col: 0x1f2a5a, dark: 0x7af0ff, lumite: [1, 3] },
    gold: { hits: 1, col: 0xffc21a, dark: 0xb8741a, table: 'gold' },
  };
  E.CRATES = CRATES;
  const CRATE_GEO = {};
  function crateGeo(kind) {
    if (CRATE_GEO[kind]) return CRATE_GEO[kind];
    const cd = CRATES[kind];
    const Geo = G.Geo;
    const parts = [];
    const add = (g, col, x, y, z, rx, ry, rz, sx, sy, sz) => { if (g.attributes.uv) g.deleteAttribute('uv'); Geo.xf(g, x, y, z, rx, ry, rz, sx, sy, sz); Geo.colorize(g, col); parts.push(g); };
    const rb = (w, h, d, r) => (Geo.roundedBox ? Geo.roundedBox(w, h, d, r, 2) : new THREE.BoxGeometry(w, h, d));
    const S = 0.9;
    if (kind === 'gold') {
      add(rb(1.0, 0.55, 0.7, 0.08), cd.col, 0, 0.28, 0);
      add(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 16, 1, false, 0, Math.PI), 0xffd75a, 0, 0.56, 0, 0, 0, Math.PI / 2, 1, 1, 1);
      for (const x of [-0.42, 0, 0.42]) add(rb(0.08, 0.92, 0.74, 0.03), cd.dark, x, 0.42, 0);
      add(rb(0.18, 0.2, 0.06, 0.03), 0xfff3c0, 0, 0.5, 0.37);
    } else {
      add(rb(S, S, S, 0.12), cd.col, 0, S / 2, 0);
      if (kind === 'wood') {
        for (const y of [0.18, 0.45, 0.72]) add(rb(S + 0.02, 0.07, S + 0.02, 0.02), cd.dark, 0, y, 0);
        add(rb(0.08, 1.15, S * 0.94 + 0.04, 0.02), cd.dark, 0, S / 2, S / 2 + 0.005, 0, 0, 0.78, 1, 1, 0.08);
      } else if (kind === 'metal') {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(rb(0.12, S + 0.04, 0.12, 0.04), cd.dark, sx * 0.4, S / 2, sz * 0.4);
        for (const sx of [-1, 1]) for (const sy of [0.2, 0.7]) for (const f of [1, -1]) add(new THREE.SphereGeometry(0.04, 6, 4), C.brass, sx * 0.28, sy, f * (S / 2 + 0.01));
      } else if (kind === 'ammo') {
        add(rb(S + 0.03, 0.18, S + 0.03, 0.05), 0x39d5ff, 0, S * 0.5, 0);
        for (const f of [1, -1]) add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6), C.brass, 0, S * 0.78, f * (S / 2 + 0.01), Math.PI / 2, 0, 0);
      } else if (kind === 'health') {
        for (const f of [1, -1]) {
          add(new THREE.SphereGeometry(0.11, 10, 8), 0xffffff, -0.09, S * 0.58, f * (S / 2 + 0.01), 0, 0, 0, 1, 1, 0.3);
          add(new THREE.SphereGeometry(0.11, 10, 8), 0xffffff, 0.09, S * 0.58, f * (S / 2 + 0.01), 0, 0, 0, 1, 1, 0.3);
          add(new THREE.ConeGeometry(0.19, 0.2, 4), 0xffffff, 0, S * 0.43, f * (S / 2 + 0.01), Math.PI, Math.PI / 4, 0, 1, 1, 0.25);
        }
      } else if (kind === 'boom') {
        for (const y of [0.22, 0.68]) add(rb(S + 0.03, 0.14, S + 0.03, 0.04), cd.dark, 0, y, 0);
        add(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), 0x3d4470, 0, S + 0.07, 0);
      } else if (kind === 'lumite') {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(rb(0.1, S + 0.03, 0.1, 0.03), 0x39d5ff, sx * 0.41, S / 2, sz * 0.41);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; add(new THREE.ConeGeometry(0.09, 0.42, 5), cd.dark, Math.cos(a) * 0.2, S + 0.15, Math.sin(a) * 0.2, Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); }
        add(new THREE.ConeGeometry(0.11, 0.55, 5), 0xc8ffff, 0, S + 0.24, 0);
      }
    }
    const g = Geo.merge(parts);
    return (CRATE_GEO[kind] = shared(g));
  }
  class Crate extends G.Actor {
    constructor(world, kind, pos, opts) {
      opts = opts || {};
      const cd = CRATES[kind] || CRATES.wood;
      super(world, { r: kind === 'gold' ? 0.62 : 0.56, h: 1.0, team: opts.team != null ? opts.team : 1, hp: 1, kind: 'crate' });
      this.crateKind = CRATES[kind] ? kind : 'wood';
      this.cd = cd; this.opts = opts;
      this.isCrate = true; this.noAssist = true; this.hidden = true; this.immovable = true; this.noCount = true; this.noXP = true;
      this.mmColor = 'rgba(0,0,0,0)';
      this.hitsLeft = cd.hits;
      this.fuseT = -1; this.squash = 0; this.popT = -1; this.lastHitBy = null;
      this.pos.copy(pos);
      this.pos.y = world.phys.groundAt(pos.x, pos.z, 0.3, pos.y + 2);
      const group = new THREE.Group();
      let mesh = null;
      const KIT = { wood: 'bolt', ammo: 'ammo', boom: 'explosive', health: 'health', lumite: 'rare' };
      if (G.Geo && G.Geo.crate && KIT[this.crateKind] && opts.kitMesh !== false) mesh = G.safe('crate mesh', () => G.Geo.crate(KIT[this.crateKind]));
      if (!mesh) mesh = new THREE.Mesh(crateGeo(this.crateKind), G.M.vc({ spec: this.crateKind === 'metal' || this.crateKind === 'gold' ? 0.6 : 0.2, rimStr: 0.35 }));
      this.body = mesh;
      group.add(mesh);
      const sh = G.R.blobShadow(0.6); sh.position.y = 0.03; group.add(sh);
      if (this.crateKind === 'boom' || this.crateKind === 'lumite' || this.crateKind === 'gold') {
        const gl = G.R.glowSprite(this.crateKind === 'boom' ? 0xffd23f : this.crateKind === 'lumite' ? C.elec : 0xffe27a, this.crateKind === 'boom' ? 0.8 : 1.4, this.crateKind === 'boom' ? 0 : 0.45);
        gl.material = gl.material.clone();
        gl.position.y = this.crateKind === 'boom' ? 1.0 : 0.9;
        group.add(gl); this.glow = gl;
      }
      this.hitGlow = G.R.glowSprite(0xffffff, 1.6, 0); this.hitGlow.material = this.hitGlow.material.clone(); this.hitGlow.position.y = 0.5; group.add(this.hitGlow);
      group.position.copy(this.pos);
      group.rotation.y = opts.yaw != null ? opts.yaw : Math.floor(Math.random() * 4) * Math.PI / 2 + U.rand(-0.15, 0.15);
      this.mesh = group;
      sys(world).crates.push(this);
    }
    aimPoint(out) { return (out || new V3()).set(this.pos.x, this.pos.y + 0.5, this.pos.z); }
    takeDamage(amount, info) {
      if (!this.alive || this.popT >= 0) return NO_DMG;
      info = info || {};
      if (info.type === 'dot' || !(amount >= 0.5)) return NO_DMG;
      if (info.src && info.src !== this) this.lastHitBy = info.src;
      const boom = info.type === 'explosion';
      this.flashT = 0.07; this.squash = 1;
      if (this.crateKind === 'boom') {
        const f = boom ? 0.3 : this.cd.fuse;
        if (this.fuseT < 0 || f < this.fuseT) this.fuseT = f;
        sfx('hit', this.pos, { pitch: 0.7 });
        return NO_DMG;
      }
      this.hitsLeft -= boom ? 99 : 1;
      if (this.hitsLeft <= 0) this.breakOpen(info);
      else { sfx('hit', this.pos, { pitch: 0.55 }); this.world.fx.sparks(this.aimPoint(_m1), 0xffffff, 6); }
      if (info.src && info.src.isPlayer && G.HUD && G.HUD.hitmark) G.HUD.hitmark(this.hitsLeft <= 0);
      return NO_DMG;
    }
    breakOpen(info) {
      if (!this.alive) return;
      this.alive = false; this.hp = 0; this.popT = 0;
      const w = this.world, cd = this.cd, k = this.crateKind;
      const p = this.aimPoint(new V3());
      const col = [cd.col, cd.dark, 0xffffff];
      w.fx.burst(p, col, U.randInt(6, 10) * 3, 6, 0.32, 1.0, { normal: true, grav: 14, drag: 1 });
      w.fx.flash(p, 0xffffff, 2.2, 0.07);
      w.fx.smoke(p, 3);
      sfx(k === 'boom' ? 'explode' : 'hit', this.pos, k === 'boom' ? { size: 1.2 } : { pitch: 0.4 });
      const df = E.difficulty(this.opts.difficulty), luck = df.luck || 0;
      if (k === 'wood') { if (!E.dataDrop(w, p, 'wood', { difficulty: df.id })) E.dropLoot(w, p, { clinks: cd.clinks, rolls: Math.random() < cd.roll ? 1 : 0, tierW: TIER_W.wood, luck }); }
      else if (k === 'metal') { if (!E.dataDrop(w, p, 'metal', { difficulty: df.id })) E.dropLoot(w, p, { clinks: cd.clinks, rolls: 1, tierW: TIER_W.metal, luck }); }
      else if (k === 'ammo') w.pickups.spawn('ammo', p, { value: 0.3, others: 0.1, crate: true });
      else if (k === 'health') w.pickups.spawn('health', p, { value: 25 });
      else if (k === 'lumite') spawnPart(w, p, { partId: 'lumite', rarity: partRarity('lumite'), n: U.randInt(cd.lumite[0], cd.lumite[1]) });
      else if (k === 'gold') {
        w.fx.confetti(p, 40); sfx('pickupRare', this.pos);
        if (!E.dataDrop(w, p, 'gold', { difficulty: df.id, rolls: 1 + (this.opts.extraRolls || 0) })) for (const r of E.rollParts(null, 1 + (this.opts.extraRolls || 0), { tierW: TIER_W.gold, luck })) spawnPart(w, p, r);
      }
      else if (k === 'boom') {
        const src = this.lastHitBy && this.lastHitBy.alive ? this.lastHitBy : this;
        E.blast(w, _m1.set(this.pos.x, this.pos.y + 0.5, this.pos.z), cd.r, cd.dmg, { src, friendly: true, color: 0xff7a3d, knock: 8 });
      }
      G.bus.emit('crate-break', k, this);
    }
    update(dt) {
      if (this.popT >= 0) {
        this.popT += dt;
        const k = this.popT / 0.15;
        const s = k < 0.4 ? 1 + 0.2 * (k / 0.4) : Math.max(0.001, 1.2 * (1 - (k - 0.4) / 0.6));
        this.body.scale.set(s * 1.1, s * (k < 0.4 ? 0.85 : 1), s * 1.1);
        if (this.glow) this.glow.visible = false;
        if (this.popT >= 0.15) this.dead = true;
        return;
      }
      if (this.flashT > 0) this.flashT -= dt;
      this.hitGlow.material.opacity = this.flashT > 0 ? 0.9 : 0;
      if (this.squash > 0) { this.squash = Math.max(0, this.squash - dt * 7); const s = 1 + 0.2 * Math.sin(this.squash * Math.PI) * this.squash; this.body.scale.set(s, 2 - s, s); }
      const w = this.world;
      // solid: push actors out (crates are not phys colliders so blasts keep line of sight)
      for (const a of w.actors) {
        if (a === this || !a.alive || a.isCrate || a.fly || a.isBossPart || !a.vel) continue;
        if (a.pos.y > this.pos.y + 0.85 || a.pos.y + (a.h || 1) < this.pos.y) continue;
        const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z, rr = this.r + (a.r || 0.4);
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-3, push = rr - d;
        a.pos.x += dx / d * push; a.pos.z += dz / d * push;
        if (this.crateKind === 'boom' && this.fuseT < 0 && !a.isEnemy) { this.fuseT = this.cd.fuse; this.lastHitBy = a; }
      }
      if (this.crateKind === 'boom' && this.fuseT >= 0) {
        this.fuseT -= dt;
        const hz = U.lerp(10, 2, U.clamp(this.fuseT / this.cd.fuse, 0, 1));
        this.blinkPh = (this.blinkPh || 0) + dt * hz;
        const on = (this.blinkPh % 1) < 0.5;
        if (this.glow) { this.glow.material.opacity = on ? 1 : 0.1; this.glow.scale.setScalar(on ? 1.3 : 0.8); }
        if (on && !this._lastOn) sfx('countdown', this.pos, { pitch: 1.6 });
        this._lastOn = on;
        if (this.fuseT <= 0) this.breakOpen({});
      } else if (this.glow && this.crateKind !== 'boom') this.glow.material.opacity = 0.35 + 0.15 * Math.sin(w.time * 3 + this.id);
    }
    dispose() {
      const s = this.world._esys;
      if (s) { const i = s.crates.indexOf(this); if (i >= 0) s.crates.splice(i, 1); }
      if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
      if (this.glow) this.glow.material.dispose();
      if (this.hitGlow) this.hitGlow.material.dispose();
    }
  }
  E.Crate = Crate;
  E.spawnCrate = function (world, kind, pos, opts) {
    const c = new Crate(world, kind, pos || new V3(), opts || {});
    world.addActor(c);
    if (G.Geo && G.Geo.useLayers && c.mesh) G.Geo.useLayers(c.mesh, world.scene);   // shadow + glows via shared layers
    return c;
  };
  E.crates = function (world) { const s = world && world._esys; return s ? s.crates.filter(c => c.alive) : []; };
  if (G.World && Array.isArray(G.World.created)) G.World.created.push(w => E.prewarm(w));
})(window.G);

}).call(window); } catch (e) { console.error('[module 17_enemies.js]', e); }
// ---- 17b_bosses.js
try { (function () {
// 17b_bosses.js — G.Enemies.spawnBoss: CRANKCRAB, QUEEN BUZZHIVE, VEND-O-TITAN (GDD §7.4, §11g).
// Multi-phase patterns with theatrical telegraphs, breakable weak points (separate BossPart actors),
// adds, a camera-safe intro (banner + roar) and a big loot fountain on pop.
//
// API
//   G.Enemies.spawnBoss(world, 'crankcrab'|'buzzhive'|'titan' (alias 'vendotitan'), pos, opts) -> Boss actor
//     enemyId/bossId match G.Data.BOSSES ids (crankcrab, buzzhive, titan).
//     opts {difficulty, hp (base, before difficulty), hpMult, dmgMult, maxPhase (1 = phase-1 attacks only,
//           e.g. wave-10 "Mini Crankcrab" {hp:1500, maxPhase:1, scale:0.7}), scale, arena {x,z,r}|{x,z,half},
//           intro:false, autoHud:false, noBanner, lootMult, yaw, team, displayName}
//   boss fields: displayName, hp/maxHp, phase, maxPhase, phaseMarks [0.66,0.33], isBoss, enemyId, parts[],
//     adds[], autoHud (true = drives G.HUD.setBoss each frame), onPhase(n)/onBeamEnd() optional hooks.
//   G.Enemies.BossPart — targetable weak point actor (claw joints, hive pods): isBossPart, owner.
(function (G) {
  'use strict';
  const E = G.Enemies;
  if (!E) return;
  const V3 = THREE.Vector3;
  const U = G.util;
  const TAU = Math.PI * 2;
  const C = E.COLORS;

  E.addMissing('en', {
    'enemy.crankcrab.name': 'CRANKCRAB', 'enemy.buzzhive.name': 'QUEEN BUZZHIVE', 'enemy.titan.name': 'VEND-O-TITAN',
  });
  E.addMissing('ja', {
    'enemy.crankcrab.name': 'クランククラブ', 'enemy.buzzhive.name': 'クイーン・バズハイブ', 'enemy.titan.name': 'ベンド・オ・タイタン',
  });
  G.i18n.add('en', {
    'enemy.crankcrab.sub': 'Rowdiest Crab of the Peach Mesas', 'enemy.buzzhive.sub': 'Ruler of Glowcap Grotto',
    'enemy.titan.sub': 'Piloted by Mega-Mayor Mox!',
    'enemy.phase2': '{name} is getting mad!', 'enemy.phase3': '{name} is going all out!', 'enemy.phaseTitle': '!',
    'enemy.bossPopped': '{name} popped!',
    'enemy.mox.eject': 'Mox: "Blorp! This isn\'t over! ...after my nap!"',
  });
  G.i18n.add('ja', {
    'enemy.crankcrab.sub': 'ピーチメサのあばれガニ', 'enemy.buzzhive.sub': 'グロウキャップのどうくつの女王',
    'enemy.titan.sub': 'メガ市長モックスがのってるぞ！',
    'enemy.phase2': '{name}がおこったぞ！', 'enemy.phase3': '{name}がほんきになった！', 'enemy.phaseTitle': '！',
    'enemy.bossPopped': '{name}をポップした！',
    'enemy.mox.eject': 'モックス「ぶもー！ おぼえてろー！ …おひるねしたらね！」',
  });

  const BOSSES = E.BOSSES = {
    crankcrab: { hp: 3000, nameKey: 'enemy.crankcrab.name', subKey: 'enemy.crankcrab.sub', marks: [0.66, 0.33], part: 'claw', second: 0.35, clinks: [600, 900], par: 210 },
    buzzhive: { hp: 3600, nameKey: 'enemy.buzzhive.name', subKey: 'enemy.buzzhive.sub', marks: [0.5], part: 'heart', second: 0, clinks: [650, 950], par: 240 },
    titan: { hp: 5000, nameKey: 'enemy.titan.name', subKey: 'enemy.titan.sub', marks: [0.7, 0.35], part: 'medal', second: 0, clinks: [800, 1100], par: 330 },
  };
  const ALIAS = { vendotitan: 'titan', crab: 'crankcrab', hive: 'buzzhive', queen: 'buzzhive' };
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3();
  const sfx = E.sfx;
  const hasSfx = id => !!(G.Audio && G.Audio.has && G.Audio.has(id));
  // Boss wind-up sound: the 09_audio contract id sized to the real wind-up time ('teleBoss' = the big readable
  // horn for signature attacks, 'teleArtillery' / 'teleSpin' / 'teleMelee' for volleys), else the old generic
  // charge (oldPitch null = no fallback, e.g. when a charge loop already plays).
  const _btO = { dur: 1, pitch: 1, vol: 1 };
  function bossTele(b, id, dur, pitch, oldPitch) {
    if (hasSfx(id)) { _btO.dur = dur; _btO.pitch = pitch; _btO.vol = 1; sfx(id, b.pos, _btO); }
    else if (oldPitch != null) sfx('enemyCharge', b.pos, { pitch: oldPitch });
  }
  // Sprite sized in metres in the world, whatever the parent chain's scale (the robot-rigged bosses sit in a
  // model scaled ×5–7, which blew 1.6 m glows up to 10 m blooms that washed out the whole boss).
  function worldSize(sprite, metres) {
    let k = 1; for (let o = sprite.parent; o; o = o.parent) k *= o.scale.x || 1;
    sprite.scale.setScalar(metres / k); sprite.userData.base = metres / k;
    return sprite;
  }

  // ------------------------------------------------------------------ weak-point actor
  class BossPart extends G.Actor {
    constructor(world, owner, o) {
      super(world, { r: o.r || 1, h: o.h || 2, team: owner.team, hp: o.hp || 200, kind: 'bosspart' });
      this.owner = owner; this.isBossPart = true; this.noCount = true; this.noXP = false; this.pass = o.pass != null ? o.pass : 0.5;
      this.immovable = true; this.mmColor = 'rgba(0,0,0,0)';
      this.partKind = o.kind || 'part';
      this.colors = o.colors || [C.orange, C.brass, 0xffffff];
      if (o.mesh) this.mesh = o.mesh;
    }
    aimPoint(out) { return (out || new V3()).set(this.pos.x, this.pos.y + this.h * 0.5, this.pos.z); }
    takeDamage(amount, info) {
      if (!this.alive || !this.owner.alive) return { dealt: 0, toShield: 0, killed: false };
      const res = super.takeDamage(amount * (this.world.dmgTakenMultBuiltin ? this.owner.dmgTakenMult || 1 : 1), info);
      if (this.pass > 0 && res.dealt > 0 && this.owner.alive) {
        const dm = info && info.src && info.src.isPlayer && G.Data && G.Data.difficultyMult ? G.Data.difficultyMult('dealt') : 1;
        this.world.damage(this.owner, res.dealt * this.pass / (dm || 1), Object.assign({}, info, { silent: true, fromPart: true }));
      }
      return res;
    }
    onHurt() { if (this.owner.onPartHurt) this.owner.onPartHurt(this); }
    onDeath(info) {
      E.popFx(this.world, this.aimPoint(_a), this.colors, Math.max(0.8, this.r));
      sfx('enemyDie', this.pos, { pitch: 0.7 });
      this.dead = true;
      if (this.owner.onPartBroken) G.safe('part broken', () => this.owner.onPartBroken(this, info));
    }
    update(dt) { this.applyStatus(dt); }
    dispose() { if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh); }
  }
  E.BossPart = BossPart;

  // ------------------------------------------------------------------ boss base
  class Boss extends G.Actor {
    constructor(world, id, pos, opts, dims) {
      opts = opts || {};
      const cfg = BOSSES[id];
      const diff = E.difficulty(opts.difficulty);
      const D = G.Data && G.Data.BOSSES && G.Data.BOSSES[id];
      const base = opts.hp != null ? opts.hp : (D && D.hp > 0 ? D.hp : cfg.hp);
      const hp = Math.max(1, Math.round(base * diff.hp * (opts.hpMult || 1)));
      super(world, { r: dims.r, h: dims.h, team: opts.team != null ? opts.team : 1, hp, kind: 'boss' });
      this.bossId = id; this.cfg = cfg; this.opts = opts; this.diff = diff; this.noCount = false;
      this.enemyId = id; this.isBoss = true; this.isEnemy = true; this.elite = false; this.tier = 4;
      this.displayName = opts.displayName || G.t(cfg.nameKey);
      this.dmgK = diff.dmg; this.dmgExtra = opts.dmgMult || 1; this.teleK = diff.tele; this.fireK = diff.fire;
      this.immovable = true; this.dmgTakenMult = 1; this.frozenT = 0; this.danceT = 0; this.plantT = 0;
      this.maxPhase = Math.min(cfg.marks.length + 1, opts.maxPhase || 9);
      this.phaseMarks = cfg.marks.slice(0, this.maxPhase - 1);
      this.phase = 1;
      this.scale = opts.scale || 1;
      this.pos.copy(pos);
      this.pos.y = world.phys.groundAt(pos.x, pos.z, 1, pos.y + 5);
      this.groundY = this.pos.y;
      const A = opts.arena || {};
      const ac = A.center || A.pos || null;
      this.arena = { x: A.x != null ? A.x : ac ? ac.x : pos.x, z: A.z != null ? A.z : ac ? ac.z : pos.z, r: A.r || A.radius || 22, half: A.half || 0 };
      this.yaw = opts.yaw != null ? opts.yaw : 0;
      this.state = 'intro'; this.introT = opts.intro === false ? 0.01 : 2.6;
      this.pat = null; this.restT = 1.2; this.lastPat = null;
      this.parts = []; this.adds = []; this.vis = [];
      this.autoHud = opts.autoHud !== false;
      this.target = null; this.speedK = 1;
      this.wishX = 0; this.wishZ = 0; this.strafeDir = 1; this.strafeT = 2;
      this.critMult = 2; this.coreOpenT = 0;
      this.deadT = 0;
      // Breezy is for kids: fewer adds and lazier homing; Blazing keeps the full GDD pressure.
      const di = diff.id || 'normal';
      this.addsN = { breezy: 2, normal: 3, spicy: 4, blazing: 4 }[di] || 3;
      this.addsCap = { breezy: 4, normal: 6, spicy: 8, blazing: 8 }[di] || 6;
      this.homK = { breezy: 0.45, normal: 0.75, spicy: 0.95, blazing: 1.15 }[di] || 0.75;
    }
    get t() { return this.world.time; }
    _afterAdd() {
      for (const p of this.parts) this.world.addActor(p);
      if (G.Geo.useLayers && this.mesh) G.Geo.useLayers(this.mesh, this.world.scene);   // shadow + glows: shared layers
      if (this.opts.intro !== false) {
        if (!this.opts.noBanner && G.UI && G.UI.banner) G.UI.banner(this.displayName, G.t(this.cfg.subKey), 2.6);
        sfx('bossRoar', this.pos);
        // a bright horn layered on the low roar so the entrance carries on phone speakers
        if (hasSfx('teleBoss')) sfx('teleBoss', this.pos, { dur: 1.2, pitch: 0.85, vol: 0.9 });
        this.world.fx.shake(0.3);
      }
      E.markSeen(this.enemyId);
    }
    pickTarget() {
      const w = this.world, pl = w.player;
      const plOk = pl && pl.alive && pl.targetable && pl.team !== this.team;
      // wave defense: go for the core unless the player is close (GDD §11e)
      const at = this.assaultTarget || this.opts.assaultTarget;
      if (at && at.alive) { this.target = plOk && pl.pos.distanceTo(this.pos) < 14 ? pl : at; return; }
      if (plOk) { this.target = pl; return; }
      let best = null, bd = 80;
      for (const a of w.actors) {
        if (!a.alive || !a.targetable || a.team === this.team || a.isCrate || a.isBossPart) continue;
        const d = a.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = a; }
      }
      this.target = best;
    }
    distTo(t) { return Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z); }
    yawTo(p) { return Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }
    faceTo(p, rate, dt) { this.yaw = U.angleDamp(this.yaw, this.yawTo(p), rate, dt); }
    tele(sec) { return Math.max(0.5, sec * this.teleK); }
    update(dt) {
      this.applyStatus(dt);
      if (!this.alive) { this._deadUpdate(dt); return; }
      // boss rules for crowd control: no freeze (max -25% slow), dance <= 1 s, bloom = 0.5 s sneeze-stun
      if (this.frozenT > 0) { this.frozenT = 0; this.slowT = Math.max(this.slowT, 2); }
      if (this.slowT > 0) this.slowK = Math.max(0.75, this.slowK || 1);
      if (this.danceT > 0) {
        if (this.t >= (this.danceLock || 0)) { this.stunT = Math.max(this.stunT, Math.min(1, this.danceT)); this.danceLock = this.t + 6; }
        this.danceT = 0;
      }
      if (this.plantT > 0) { this.stunT = Math.max(this.stunT, 0.5); this.plantT = 0; }
      if (this.coreOpenT > 0) this.coreOpenT -= dt;
      this.pickTarget();
      const frac = this.hp / this.maxHp;
      while (this.phase < this.maxPhase && frac <= this.phaseMarks[this.phase - 1]) this._enterPhase(this.phase + 1);
      if (this.state === 'intro') {
        this.introT -= dt;
        this.wishX = this.wishZ = 0;
        if (this.target) this.faceTo(this.target.pos, 2, dt);
        if (this.introT <= 0) this.state = 'fight';
      } else if (this.stunT > 0) {
        if (this.pat) this._endPat(true);
        this.wishX = this.wishZ = 0;
      } else {
        if (this.pat) {
          const p = this.pat;
          p.t += dt;
          const done = p.def.tick(this, dt, p);
          if (done) this._endPat(false);
        } else {
          this.restT -= dt;
          this.roam(dt);
          if (this.restT <= 0 && this.target) this._choosePat();
        }
        this.timers(dt);
      }
      this.move(dt);
      this.positionParts(dt);
      this.animate(dt);
      this._weakUi();
      if (this.autoHud && G.HUD && G.HUD.setBoss) {
        const f = Math.round(this.hp / this.maxHp * 500) / 500;
        if (f !== this._hudF) { this._hudF = f; G.HUD.setBoss(this.displayName, f); }
      }
    }
    _choosePat() {
      const list = this.patterns();
      const w = {};
      for (const k in list) if (list[k] > 0 && k !== this.lastPat) w[k] = list[k];
      if (!Object.keys(w).length) for (const k in list) if (list[k] > 0) w[k] = list[k];
      if (!Object.keys(w).length) { this.restT = 1; return; }
      const id = U.weighted(w).id;
      const def = this.PATS[id];
      if (!def) { this.restT = 1; return; }
      this.pat = { id, def, t: 0, step: 0, data: {} };
      this.lastPat = id;
      if (def.start && def.start(this, this.pat) === false) { this.pat = null; this.restT = 0.2; }
    }
    _endPat(aborted) {
      const p = this.pat; this.pat = null;
      if (p && p.def.end) G.safe('boss pat end', () => p.def.end(this, p, aborted));
      this.restT = (p && p.def.rest != null ? p.def.rest : 1.2) / Math.max(0.5, this.fireK) * (this.phase === 3 ? 0.8 : 1);
    }
    _enterPhase(n) {
      this.phase = n;
      if (this.pat) this._endPat(true);
      this.restT = 1.4;
      if (!this.opts.noBanner && G.UI && G.UI.banner) G.UI.banner(G.t('enemy.phaseTitle'), G.t('enemy.phase' + Math.min(3, n), { name: this.displayName }), 1.5);
      this.world.fx.flash(_a.set(this.pos.x, this.pos.y + this.h * 0.6, this.pos.z), C.pink, 6 * this.scale, 0.25);
      this.world.fx.ring(this.pos, 7 * this.scale, C.pink, 0.5, this.groundY + 0.1);
      sfx('bossRoar', this.pos, { pitch: 1.1 + n * 0.05 });
      if (hasSfx('teleBoss')) sfx('teleBoss', this.pos, { dur: 0.9, pitch: 1 + n * 0.08, vol: 0.85 });
      this.world.fx.shake(0.35);
      if (this.onPhase) G.safe('onPhase', () => this.onPhase(n));
      if (this.opts.onPhase) G.safe('opts.onPhase', () => this.opts.onPhase(this, n));
    }
    // movement shared: wish -> velocity, ground or hover, clamp to arena
    walk(dt, accel) {
      const v = this.vel, k = 1 - Math.exp(-(accel || 4) * dt);
      v.x += (this.wishX - v.x) * k; v.z += (this.wishZ - v.z) * k;
    }
    clampArena() {
      const A = this.arena, m = this.r + 1;
      if (A.half) { this.pos.x = U.clamp(this.pos.x, A.x - A.half + m, A.x + A.half - m); this.pos.z = U.clamp(this.pos.z, A.z - A.half + m, A.z + A.half - m); return; }
      const dx = this.pos.x - A.x, dz = this.pos.z - A.z, d = Math.hypot(dx, dz), lim = Math.max(2, A.r - m);
      if (d > lim) { this.pos.x = A.x + dx / d * lim; this.pos.z = A.z + dz / d * lim; }
    }
    // Keep a distance band to the target while sidestepping.
    bandMove(dt, mn, mx, speed) {
      const t = this.target;
      if (!t) { this.wishX = this.wishZ = 0; return; }
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = U.rand(1.5, 3.5); if (Math.random() < 0.6) this.strafeDir *= -1; }
      let dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      const rad = d > mx ? 1 : d < mn ? -1 : 0;
      let mxv = dx * rad - dz * this.strafeDir * 0.8, mzv = dz * rad + dx * this.strafeDir * 0.8;
      const l = Math.hypot(mxv, mzv) || 1;
      const sp = speed * this.speedK * (this.slowT > 0 ? this.slowK : 1);
      this.wishX = mxv / l * sp; this.wishZ = mzv / l * sp;
    }
    spawnAdd(type, pos, o) {
      this.adds = this.adds.filter(a => a.alive);
      if (this.adds.length >= (o && o.cap || 10)) return null;
      const e = E.spawn(this.world, type, pos, Object.assign({ alerted: true, difficulty: this.diff, noLoot: false, lootMult: 0.5, fromAir: false }, o || {}));
      if (e) { this.adds.push(e); this.world.fx.smoke(pos, 5); this.world.fx.ring(pos, 2, C.yellow, 0.4, pos.y + 0.1); }
      return e;
    }
    takeDamage(amount, info) {
      if (!this.alive || this.state === 'intro' && this.introT > 2.4) return { dealt: 0, toShield: 0, killed: false };
      info = info || {};
      if (this.world.dmgTakenMultBuiltin) amount *= this.dmgTakenMult || 1;
      // weak point open: crits deal x2 (weapons already applied their own crit factor: info.mult or x1.75)
      if (info.crit && this.coreOpenT > 0) amount = amount / (info.mult || 1.75) * this.critMult;
      amount = this.modDamage(amount, info);
      if (!(amount > 0)) return { dealt: 0, toShield: 0, killed: false };
      return super.takeDamage(amount, info);
    }
    modDamage(a) { return a; }
    // Hit feedback: an eased flash plus a small, mass-scaled flinch on the rig (rb.hit scales by size; bosses barely
    // rock). Facing is never smoothed for bosses: sweep / beam damage arcs follow the sim yaw exactly.
    onHurt(info, amt) {
      this.hitFlash = 0.06;
      if (!this.rb || !this.rb.hit) return;
      if (info && info.type === 'dot') { this.rb.anim.flash = Math.max(this.rb.anim.flash, 0.3); return; }   // DoT ticks: a soft glow only
      let dx = 0, dz = 0;
      const d = info && info.dir, sp = (info && info.pos) || (info && info.src && info.src.pos);
      if (d && d.lengthSq && d.lengthSq() > 1e-6) { dx = d.x; dz = d.z; } else if (sp) { dx = this.pos.x - sp.x; dz = this.pos.z - sp.z; }
      const k = U.clamp(0.3 + (amt || 0) / 120, 0.3, 1);
      this.rb.hit(dx, dz, this.rb.anim.hitT < 0.06 ? k * 0.35 : k, (amt || 0) >= this.maxHp * 0.05);
    }
    // Wind-up face for the robot-rigged bosses: the determined 'focused' LEDs (pink while charging) instead of
    // the rig's slanted 'angry' telegraph face. Texture swaps only (no program rebuild).
    _windFace(st) {
      const rb = this.rb, f = rb && rb.parts && rb.parts.face;
      if (!f || !f.material || !rb._faceOf) return;
      if (st === 'windup' && E.focusExpr) { const tex = rb._faceOf(E.focusExpr(), rb.tele > 0.08); if (f.material.map !== tex) f.material.map = tex; this._faceForced = true; }
      else if (this._faceForced) { this._faceForced = false; rb.expr = '?'; if (rb._applyFace) rb._applyFace(); }
    }
    // anim opts shared by the robot-rigged bosses (velocity / facing for lean, wind-up progress)
    _motion(o, p) {
      o.vx = this.vel.x; o.vz = this.vel.z; o.vy = 0; o.yaw = this.yaw; o.detail = 1;
      o.wind = p && p.tele && p.data && p.data.tele ? U.clamp(p.t / p.data.tele, 0, 1) : -1;
    }
    onDeath(info) {
      const w = this.world;
      this.state = 'dead'; this.deadT = 0;
      if (this.pat) this._endPat(true);
      this.cleanupVis();
      for (const p of this.parts) if (p.alive) { p.alive = false; p.dead = true; }
      // Every add (incl. Tote-copter drops) pops with the boss. opts.clearArena (Boss Hunt / Expedition lair): any
      // other robot inside the arena pops too, so nothing keeps shooting during the victory window. (Fountain
      // Guard's mini-boss does not clear its arena: that would wipe the wave around the core.)
      const pop = a => { if (a && a.alive && a !== this && !a.isBoss && !a.isBossPart && a.team === 1) { if (a.opts) a.opts.noLoot = true; w.damage(a, 1e6, { src: this, friendly: true, silent: true }); } };
      for (const a of this.adds) pop(a);
      this.adds.length = 0;
      const A = this.arena;
      if (A && E.sys && this.opts.clearArena) {
        const rr = A.half ? A.half * 1.5 : (A.r || 22) + 8;
        for (const a of E.sys(w).robots.slice()) if (a && a.alive && U.distXZ(a.pos, A) < rr) pop(a);
      }
      if (G.HUD && G.HUD.setBoss && this.autoHud) G.HUD.setBoss(null);
      G.time.hitStop(0.11, true);
      G.time.slowMo(0.9, 0.4);
      sfx('enemyDie', this.pos, { pitch: 0.55 });
      sfx('explode', this.pos, { size: 3 });
      w.fx.shake(0.6);
      if (!this.opts.noBanner && G.UI && G.UI.banner) G.UI.banner(G.t('enemy.bossPopped', { name: this.displayName }), '', 2.2);
      this.lootFountain();
      if (this.onDefeat) G.safe('boss defeat', () => this.onDefeat(info));
    }
    lootFountain() {
      const w = this.world, cfg = this.cfg, s = this.scale;
      const mini = this.maxPhase < cfg.marks.length + 1 || s < 0.95;
      const total = Math.round(U.randInt(cfg.clinks[0], cfg.clinks[1]) * (mini ? 0.35 : 1) * (this.opts.lootMult || 1));
      const c0 = new V3(this.pos.x, this.groundY + Math.min(this.h, 6) * 0.5, this.pos.z);
      const n = 7;
      for (let i = 0; i < n; i++) {
        E.after(w, i * 0.2, () => {
          const p = c0.clone().add(_a.set(U.rand(-2, 2) * s, U.rand(0, 2) * s, U.rand(-2, 2) * s));
          w.pickups.boltBurst(p, Math.round(total / n));
          E.popFx(w, p, [C.orange, C.brass, C.gold, C.plum], 1.2 * s);
          sfx('coin', p, { pitch: 1 + i * 0.08 });
        });
      }
      const luck = (this.diff.luck || 0) + (this.opts.luck || 0);
      const did = this.diff.id;
      // a couple of field parts for the spectacle (metal table)
      for (let i = 0; i < (mini ? 1 : 2); i++) E.after(w, 0.5 + i * 0.3, () => { if (!E.dataDrop(w, c0, 'metal', { difficulty: did })) for (const r of E.rollParts(null, 1, { tierW: E.TIER_WEIGHTS.metal, luck })) E.spawnPart(w, c0, r); });
      if (this.opts.chest && !mini) {
        // boss chest in the field (only for modes that do not grant it through G.Progress mode-result rewards)
        E.after(w, 1.2, () => {
          if (!E.dataDrop(w, c0, 'boss_' + this.bossId, { difficulty: did, rolls: 3, firstKill: !!this.opts.firstKill })) {
            const loot = E.rollParts(null, 3, { tierW: E.TIER_WEIGHTS.boss, luck, bossPart: cfg.part });
            loot.push({ partId: cfg.part, rarity: E.partRarity(cfg.part), n: 1 });
            if (Math.random() < cfg.second) loot.push({ partId: cfg.part, rarity: E.partRarity(cfg.part), n: 1 });
            loot.forEach(r => E.spawnPart(w, c0, r));
          }
        });
      }
      E.after(w, 0.2, () => E.chipFloat(w, c0.clone().setY(c0.y + 1), 3 * s));
      for (let i = 0; i < 4; i++) E.after(w, i * 0.35, () => w.fx.confetti(c0.clone().add(_b.set(U.rand(-3, 3), U.rand(1, 4), U.rand(-3, 3))), 60));
    }
    _deadUpdate(dt) {
      this.deadT += dt;
      if (this.deadAnim(dt)) this.dead = true;
    }
    track(o) { this.vis.push(o); return o; }
    cleanupVis() {
      for (const o of this.vis) { if (!o) continue; if (o.kill) o.kill(); else if (o.stop) o.stop(0.1); else if (o.parent) o.parent.remove(o); }
      this.vis.length = 0;
      this._weakUiOff();
    }
    dispose() {
      this.cleanupVis();
      for (const p of this.parts) { p.alive = false; p.dead = true; }
      if (this.autoHud && G.HUD && G.HUD.setBoss && this.alive) G.HUD.setBoss(null);
      if (this.rb) this.rb.dispose();
      super.dispose();
    }
    // Punish window UI: while the boss is open (core / coin slot / stuck), a callout chip names it and a gold
    // target marker sits on the weak point. weakWindow() -> {key, t (s left for the callout), pt (V3|null)} | null.
    _weakUi() {
      const w = this.alive && this.state !== 'intro' ? this.weakWindow() : null;
      const pl = this.world.player;
      const on = !!(w && pl && pl.alive && G.HUD && G.HUD.callout);
      if (on) {
        const mk = this._weakKey || (this._weakKey = 'bossweak' + this.id);   // (no per-frame string)
        if (w.t > 0.05) G.HUD.callout(G.t(w.key), Math.min(w.t, 4));
        if (w.pt && G.HUD.marker) { G.HUD.marker(mk, w.pt, WEAK_MK); this._weakMk = true; }
        else if (this._weakMk) { G.HUD.removeMarker(mk); this._weakMk = false; }
        this._weakOn = w.key;
      } else if (this._weakOn || this._weakMk) this._weakUiOff();
    }
    _weakUiOff() {
      if (G.HUD) {
        if (this._weakOn && G.HUD.clearCallout) G.HUD.clearCallout(G.t(this._weakOn));
        if (this._weakMk && G.HUD.removeMarker) G.HUD.removeMarker(this._weakKey || 'bossweak' + this.id);
      }
      this._weakOn = null; this._weakMk = false;
    }
    weakWindow() { return null; }
    // overridables
    patterns() { return {}; }
    roam() { }
    timers() { }
    move() { }
    positionParts() { }
    animate() { }
    deadAnim() { return true; }
  }
  E.Boss = Boss;

  // shared helpers
  const WEAK_MK = { icon: '<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="10" cy="10" r="6.5" fill="none" stroke="#1e1a4d" stroke-width="2.6"/><circle cx="10" cy="10" r="2.4" fill="#1e1a4d"/></svg>', color: '#ffd23f', dist: false, edge: false, label: '' };
  const _wp = new V3();
  const PINK = new THREE.Color(C.pink);
  function feetAbove(a, gy) { return a.pos.y - gy; }
  function sweepHit(b, p, ang0, ang1, gy, maxH, rMin, rMax, dmg, losFrom) {
    // Hostile actors whose bearing lies between ang0 and ang1 (this frame's sweep) get hit once.
    p.data.hit = p.data.hit || new Set();
    const lo = Math.min(ang0, ang1) - 0.06, hi = Math.max(ang0, ang1) + 0.06;
    for (const a of b.world.actors) {
      if (!a.alive || !a.targetable || a.team === b.team || a.isCrate || a.isBossPart || p.data.hit.has(a)) continue;
      const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z, d = Math.hypot(dx, dz);
      if (d < rMin || d > rMax) continue;
      let ang = Math.atan2(dx, dz);
      const mid = (lo + hi) / 2;
      ang = mid + U.wrapAngle(ang - mid);
      if (ang < lo || ang > hi) continue;
      if (feetAbove(a, gy) > maxH) continue;
      if (losFrom && !b.world.phys.los(losFrom, _d.set(a.pos.x, a.pos.y + 1, a.pos.z), false)) continue;
      p.data.hit.add(a);
      E.hurt(b, a, dmg, { type: 'boss', dir: _c.set(dx, 0.3, dz).normalize().clone(), knock: 9 });
    }
  }
  function gooSplash(b, pos, dmg, r) {
    const w = b.world;
    E.blast(w, pos, r, dmg, { src: b, fx: false, knock: 4 });
    w.fx.burst(pos, [C.goo, 0xd8ff8a, 0xffffff], 22, 7, 0.35, 0.6, { normal: true, grav: 12 });
    w.fx.ring(pos, r * 1.2, C.goo, 0.35, pos.y + 0.05);
    E.puddle(w, pos, r * 0.8, 3, { team: b.team, color: C.goo, slowK: 0.75, slowT: 2 });
    sfx('splat', pos, { pitch: 0.8 });
  }

  // ================================================================== CRANKCRAB
  class Crankcrab extends Boss {
    constructor(world, pos, opts) {
      opts = opts || {};
      const s = opts.scale || 1;
      const rb = G.Geo.robot({ body: 'disc', size: 6.5 * s, color: C.orange, accent: C.brass, metal: C.plum, eyes: 'visor', eyeColor: C.idle, mobility: 'spider', arms: 'claw', boss: true, armor: 0.7, back: 'spikes', seed: 51 });
      super(world, 'crankcrab', pos, opts, { r: rb.radius * 0.8, h: rb.height * 0.85 });
      this.rb = rb; this.mesh = rb.group;
      this.reach = 6.4 * s;
      this.rollT = 12;
      this.sink = 0;
      this.claws = {};
      const hpPart = Math.round(400 * this.diff.hp * (opts.hpMult || 1) * (opts.hp ? opts.hp / 3000 : 1));
      for (const side of ['L', 'R']) {
        const piv = rb.parts['arm' + side];
        if (!piv) continue;
        const weapon = piv.children.find(c => c.name === 'weapon' + side);
        const part = new BossPart(world, this, { hp: hpPart, r: 1.15 * s, h: 2.3 * s, pass: 0.5, kind: 'claw', colors: [C.orange, C.brass, C.plum] });
        part.side = side;
        this.parts.push(part);
        this.claws[side] = { piv, weapon, part, broken: false, sd: side === 'R' ? 1 : -1 };
        if (weapon) {
          weapon.scale.setScalar(2.3);
          // weak-spot halo on each claw joint (GDD §2.8: weak spots glow #FFD23F) so kids know what to shoot
          const hg = G.R.glowSprite(C.yellow, 0.75, 0.5); hg.material = hg.material.clone(); weapon.add(hg);
          worldSize(hg, 2.2 * s);   // ~2 m halo (it was 16 m wide through the rig's scale chain)
          this.claws[side].halo = hg;
        }
      }
      const L = rb.layout;
      this.faceGlow = G.R.glowSprite(C.pink, 1.6, 0); this.faceGlow.material = this.faceGlow.material.clone();
      this.faceGlow.position.set(0, L.faceY, L.faceZ + 0.08); rb.parts.head.add(this.faceGlow); worldSize(this.faceGlow, 2.4 * s);
      this.backGlow = G.R.glowSprite(C.goo, 1.2, 0); this.backGlow.material = this.backGlow.material.clone();
      this.backGlow.position.set(0, L.headY + 0.15, -0.3); rb.parts.body.add(this.backGlow); worldSize(this.backGlow, 2.2 * s);
      // wind-ups pulse a pink rim around the silhouette (own rim colour; the shared one stays for everyone else)
      this._rimU = rb.mat.uniforms.uRimCol = { value: new THREE.Color().copy(G.R.light.uRimCol.value) };
      this._rimBase = rb.mat.uniforms.uRim.value; this._rimK = 0;
      this._ao = { speed: 0, telegraph: 0, expr: undefined, look: 0, aim: 0, flash: 0, vx: 0, vz: 0, vy: 0, yaw: 0, wind: -1, detail: 1 };
      for (const k in this.claws) { const c = this.claws[k]; c.rx = c.piv.rotation.x; c.rz = c.piv.rotation.z; }
      rb.group.position.copy(this.pos); rb.group.rotation.y = this.yaw;
      this.PATS = CRAB_PATS;
    }
    patterns() {
      const intact = Object.values(this.claws).some(c => !c.broken);
      const p = { mortar: 1 };
      if (intact) p.sweep = 1.3;
      if (this.phase >= 2) p.burrow = 1.1;
      if (this.phase >= 3) { p.laser = 1.6; p.mortar = 0.7; }
      return p;
    }
    onPhase(n) { if (n === 3) this.speedK = 1.2; if (n === 2) this.rollT = 4; }
    timers(dt) {
      if (this.phase >= 2) {
        this.rollT -= dt;
        if (this.rollT <= 0) {
          this.rollT = 20;
          for (let i = 0; i < Math.min(3, this.addsN); i++) { const a = this.yaw + Math.PI + (i - 1) * 0.9; this.spawnAdd('rollo', new V3(this.pos.x + Math.sin(a) * (this.r + 2.5), this.pos.y, this.pos.z + Math.cos(a) * (this.r + 2.5)), { cap: 8 }); }
          sfx('warn', this.pos, { pitch: 0.6 });
        }
      }
    }
    roam(dt) { this.bandMove(dt, 8, 14, 3); if (this.target) this.faceTo(this.target.pos, 2.5, dt); }
    move(dt) {
      if (this.sink > 0.5) { this.vel.set(0, 0, 0); return; }
      this.walk(dt, 3);
      if (!this.grounded) this.vel.y -= 22 * dt;
      this.world.phys.moveBody(this, dt);
      if (this.grounded) this.groundY = this.pos.y;
      this.clampArena();
    }
    positionParts() {
      this.rb.group.position.set(this.pos.x, this.pos.y - this.sink * this.h, this.pos.z);
      this.rb.group.rotation.y = this.yaw;
      this.rb.group.updateMatrixWorld(true);
      for (const k in this.claws) {
        const c = this.claws[k];
        if (c.broken || !c.weapon) continue;
        c.weapon.getWorldPosition(_a);
        c.part.pos.set(_a.x, _a.y - c.part.h * 0.55, _a.z);
        c.part.targetable = this.sink < 0.3;
      }
    }
    onPartBroken(part) {
      const c = this.claws[part.side];
      if (!c || c.broken) return;
      c.broken = true;
      if (c.weapon) c.weapon.visible = false;
      if (c.halo) c.halo.material.opacity = 0;
      this.stunT = 3;
      this.coreOpenT = 7;
      this.critY = this.rb.critY * 0.9;
      this.world.fx.shake(0.4);
      sfx('bossRoar', this.pos, { pitch: 1.3 });
      this.world.fx.burst(part.aimPoint(_a), [C.orange, C.brass, 0xffffff], 30, 9, 0.4, 0.9, { normal: true, grav: 14 });
    }
    animate(dt) {
      const rb = this.rb, o = this._ao, p = this.pat;
      let st = 'idle';
      o.telegraph = 0; o.speed = 0; o.expr = undefined;
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (this.state === 'intro') { st = 'windup'; o.telegraph = 0.3 + 0.3 * Math.sin(this.t * 8); }
      else if (this.stunT > 0) st = 'stun';
      else if (p && p.tele) { st = 'windup'; o.telegraph = 0.55 + 0.45 * Math.sin(p.t * 6 * TAU); }
      else if (p && p.acting) st = 'attack';
      else if (hs > 0.3) { st = 'move'; o.speed = hs * 1.4; }
      if (this.coreOpenT > 0 && st !== 'windup') { o.expr = 'dizzy'; o.telegraph = 0.3 + 0.3 * Math.sin(this.t * 10); }
      else if (st === 'windup' && E.focusExpr) o.expr = E.focusExpr();
      o.flash = 0;   // hit flash: eased inside the rig (onHurt -> rb.hit)
      if (this.hitFlash > 0) this.hitFlash -= dt;
      this._motion(o, p);
      G.Geo.animateRobot(rb, st, this.t, dt, o);
      this._windFace(st);
      // Wind-up readability: a pink rim pulse on the silhouette (6 Hz like every telegraph) instead of a growing
      // additive bloom; the battery halo shrinks while winding up so the claws and body stay clear.
      const wind = st === 'windup' && this.state !== 'intro';
      this._rimK = U.damp(this._rimK, wind ? 1 : 0, 12, dt);
      const rk = this._rimK * (0.55 + 0.45 * Math.sin(this.t * 6 * TAU)) * (G.Save.set.reducedMotion ? 0.7 : 1);
      if (this._rimU) { this._rimU.value.copy(G.R.light.uRimCol.value).lerp(PINK, Math.min(1, this._rimK)); rb.mat.uniforms.uRim.value = this._rimBase + 1.2 * Math.max(0, rk); }
      const cg = rb.parts.coreGlow;
      if (cg) { const b0 = cg.userData.base || (cg.userData.base = cg.scale.x), sc = b0 * (1 - 0.45 * this._rimK); if (Math.abs(cg.scale.x - sc) > 1e-4) cg.scale.setScalar(sc); }
      // custom claw poses (after the kit animation so they win): big claws held forward like a crab. Poses are eased
      // (raise for the sweep, droop when stunned, back to guard) — they used to snap between states.
      const snapping = st === 'attack' || st === 'windup';
      const eF = Math.exp(-16 * dt), eS = Math.exp(-7 * dt);
      for (const k in this.claws) {
        const c = this.claws[k];
        if (c.broken) continue;
        if (c.weapon) c.weapon.scale.set(2.3 * (1 + (snapping ? 0.12 * Math.sin(this.t * 22 + c.sd) : 0.04 * Math.sin(this.t * 3 + c.sd))), 2.3, 2.3);
        if (c.halo) c.halo.material.opacity = this.sink > 0.3 ? 0 : (0.38 + 0.2 * Math.sin(this.t * 4 + c.sd)) * (1 - 0.5 * this._rimK);
        let tx, tz, e = eS;
        if (p && p.id === 'sweep' && p.data.side === k) {
          const raise = p.step === 0 ? U.smoothstep(0, 0.6, p.t / p.data.tele) : 0;
          tx = p.step === 0 ? -0.3 * raise : 0;
          tz = p.step === 0 ? c.sd * (Math.PI / 2 + 0.9 * raise) : c.sd * Math.PI / 2;
          e = eF;   // the swing itself must track the damage arc tightly
        } else {
          const droop = this.stunT > 0 ? 1 : 0;
          tx = U.lerp(-1.6, -0.55, droop) + Math.sin(this.t * 2.2 + c.sd) * 0.06 - (p && p.tele ? 0.3 : 0);
          tz = c.sd * (0.45 + (p && p.tele ? 0.08 * Math.sin(p.t * 25) : 0));
        }
        c.rx = tx + (c.rx - tx) * e; c.rz = tz + (c.rz - tz) * e;
        c.piv.rotation.set(c.rx, 0, c.rz);
      }
    }
    deadAnim(dt) {
      const done = G.Geo.animateRobot(this.rb, 'dead', this.t, dt * 0.45, this._ao);
      this.rb.group.position.set(this.pos.x, this.pos.y - this.sink * this.h, this.pos.z);
      return done || this.deadT > 1.5;
    }
    cleanupVis() { super.cleanupVis(); if (this.faceGlow) this.faceGlow.material.opacity = 0; if (this.backGlow) this.backGlow.material.opacity = 0; this.sink = 0; this.hidden = false; this.targetable = true; if (this.rb) this.rb.group.visible = true; }
    // a broken claw opens the face core for 7 s: callout during the 3 s stun (+0.5 s), marker the whole time
    weakWindow() {
      if (!(this.coreOpenT > 0) || this.sink > 0.3) return null;
      return { key: 'enemy.coreOpen', t: Math.max(0, this.coreOpenT - 3.5), pt: this.faceGlow ? this.faceGlow.getWorldPosition(_wp) : null };
    }
  }
  const CRAB_PATS = {
    sweep: {
      rest: 1.0,
      start(b, p) {
        const sides = Object.keys(b.claws).filter(k => !b.claws[k].broken);
        if (!sides.length) return false;
        p.data.side = U.pick(sides);
        p.data.tele = b.tele(1.0);
        p.tele = true;
        p.data.warn = b.track(E.warnCircle(b.world, b.pos, b.reach + 0.6, p.data.tele, C.pink));
        bossTele(b, 'teleBoss', p.data.tele, 0.9, 0.45);
        sfx('warn', b.pos, { pitch: 0.5 });
      },
      tick(b, dt, p) {
        const c = b.claws[p.data.side];
        if (!c || c.broken) return true;
        b.wishX = b.wishZ = 0;
        if (p.step === 0) {
          if (b.target) b.faceTo(b.target.pos, 4, dt);
          if (p.t >= p.data.tele) { p.step = 1; p.t = 0; p.tele = false; p.acting = true; p.data.prev = b.yaw + c.sd * Math.PI / 2; sfx('whoosh', b.pos); sfx('boost', b.pos, { pitch: 0.5 }); }
        } else if (p.step === 1) {
          const dur = 0.8 / b.speedK;
          b.yaw -= c.sd * Math.PI / dur * dt;
          const cur = b.yaw + c.sd * Math.PI / 2;
          sweepHit(b, p, p.data.prev, cur, b.groundY, 0.75, b.r * 0.4, b.reach + 0.6, 30);
          p.data.prev = cur;
          if (Math.random() < 0.5) { c.weapon && c.weapon.getWorldPosition(_a); b.world.fx.smoke(_a.setY(b.groundY + 0.3), 1, 0xe8c79a); }
          if (p.t >= dur) { p.step = 2; p.t = 0; p.acting = false; }
        } else if (p.t > 0.5) return true;
        return false;
      },
    },
    mortar: {
      rest: 1.2,
      start(b, p) { p.tele = true; p.data.tele = b.tele(0.7); bossTele(b, 'teleArtillery', p.data.tele, 0.7, 0.6); },
      tick(b, dt, p) {
        b.backGlow.material.opacity = p.step === 0 ? 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(p.t * 6 * TAU)) : 0;
        b.roam(dt);
        if (p.step === 0) { if (p.t >= p.data.tele) { p.step = 1; p.t = 0; p.tele = false; p.acting = true; p.data.n = 0; } return false; }
        if (p.data.n < 5 && p.t >= p.data.n * 0.2 && b.target) {
          const t = b.target, off = p.data.n === 0 ? 0 : U.rand(1.5, 4.5), ang = Math.random() * TAU;
          const to = new V3(t.pos.x + Math.cos(ang) * off, 0, t.pos.z + Math.sin(ang) * off);
          to.y = b.world.phys.groundAt(to.x, to.z, 0.2, t.pos.y + 3);
          b.backGlow.getWorldPosition(_a);
          E.lob(b, _a.clone(), to, Math.max(1.05, b.tele(1.0) + 0.2), { gravity: 16, color: C.goo, kind: 'ink', size: 0.5 * b.scale, r: 2.5, onImpact: pos => gooSplash(b, pos, 20, 2.5) });
          sfx('grenade', b.pos, { pitch: 0.7 });
          p.data.n++;
        }
        return p.data.n >= 5 && p.t > 1.2;
      },
      end(b) { b.backGlow.material.opacity = 0; },
    },
    burrow: {
      rest: 1.5,
      start(b, p) { p.tele = true; bossTele(b, 'teleBoss', 0.8, 0.75, 0.4); },
      tick(b, dt, p) {
        const w = b.world, t = b.target;
        b.wishX = b.wishZ = 0;
        if (p.step === 0) { // dig in
          b.sink = U.clamp(p.t / 0.8, 0, 1);
          if (Math.random() < 0.6) w.fx.smoke(_a.set(b.pos.x + U.rand(-b.r, b.r), b.groundY + 0.2, b.pos.z + U.rand(-b.r, b.r)), 1, 0xe8c79a);
          if (p.t >= 0.8) {
            p.step = 1; p.t = 0; p.tele = false; b.targetable = false; b.hidden = true; b.rb.group.visible = false;
            p.data.ring = b.track(E.warnCircle(w, t ? t.pos : b.pos, 3, b.tele(2.0) + b.tele(1.2), 0xffb37a, { follow: t }));
            sfx('step', b.pos, { pitch: 0.3 });
          }
        } else if (p.step === 1 || p.step === 2) { // track, then lock
          const ring = p.data.ring;
          b.pos.x = ring.pos.x; b.pos.z = ring.pos.z;
          if (Math.random() < 0.5) w.fx.burst(_a.set(ring.pos.x + U.rand(-3, 3), b.groundY + 0.15, ring.pos.z + U.rand(-3, 3)), [0xe8c79a, 0xf7e3b0], 2, 3, 0.25, 0.5, { normal: true, grav: 10 });
          if (p.step === 1 && p.t >= b.tele(2.0)) { p.step = 2; p.t = 0; ring.lock(); sfx('warn', ring.pos, { pitch: 0.8 }); }
          else if (p.step === 2 && p.t >= b.tele(1.2)) {
            p.step = 3; p.t = 0; p.acting = true;
            ring.kill();
            b.pos.y = w.phys.groundAt(b.pos.x, b.pos.z, 1, b.pos.y + 10); b.groundY = b.pos.y;
            b.rb.group.visible = true; b.hidden = false;
            E.blast(w, _a.set(b.pos.x, b.groundY + 0.5, b.pos.z), 3, 40, { src: b, knock: 10, color: 0xffb37a });
            w.fx.burst(_a, [0xe8c79a, 0xf7e3b0, C.orange], 40, 12, 0.4, 0.9, { normal: true, grav: 14 });
            sfx('bossRoar', b.pos, { pitch: 1.2 });
          }
        } else if (p.step === 3) { // rise
          b.sink = 1 - U.clamp(p.t / 0.45, 0, 1);
          if (p.t > 0.45) { b.sink = 0; b.targetable = true; }
          if (p.t > 1.0) return true;
        }
        return false;
      },
      end(b) { b.sink = 0; b.targetable = true; b.hidden = false; b.rb.group.visible = true; },
    },
    laser: {
      rest: 1.4,
      start(b, p) {
        p.tele = true; p.data.tele = b.tele(1.5);
        if (G.Audio && G.Audio.loop) p.data.loop = b.track(G.Audio.loop('charge', { pos: b.pos, vol: 0.7, pitch: 0.6 }));
        p.data.beams = [b.track(E.beam(b.world, C.pink, 0.3)), b.track(E.beam(b.world, C.pink, 0.3))];
        p.data.beams.forEach(x => x.opacity(0));
        p.data.dir = Math.random() < 0.5 ? 1 : -1;
        bossTele(b, 'teleBoss', p.data.tele, 1.05, null);
      },
      tick(b, dt, p) {
        const w = b.world, fg = b.faceGlow;
        b.wishX = b.wishZ = 0;
        if (p.step === 0) {
          const k = U.clamp(p.t / p.data.tele, 0, 1);
          fg.material.opacity = 0.3 + 0.5 * k; fg.scale.setScalar(fg.userData.base * (1 + 0.6 * k) * (0.92 + 0.08 * Math.sin(p.t * 40)));
          if (p.data.loop) p.data.loop.set({ pitch: 0.6 + 1.4 * k });
          if (b.target) b.faceTo(b.target.pos, 4, dt);
          if (p.t >= p.data.tele) { p.step = 1; p.t = 0; p.tele = false; p.acting = true; p.data.a0 = b.yaw - p.data.dir * Math.PI / 4; p.data.prev = p.data.a0; sfx('laser', b.pos, { pitch: 0.4 }); }
          return false;
        }
        if (p.step === 1) {
          const dur = 2.0, k = U.clamp(p.t / dur, 0, 1);
          const ang = p.data.a0 + p.data.dir * (Math.PI / 2) * k;
          b.yaw = ang;
          fg.getWorldPosition(_a);
          const gy = b.groundY, H = 0.95, sx = Math.sin(ang), sz = Math.cos(ang);
          const mid = _b.set(b.pos.x + sx * (b.r + 2), gy + H, b.pos.z + sz * (b.r + 2));
          const h = w.phys.raycast(mid.x, mid.y, mid.z, sx, 0, sz, 30, true);
          const far = _c.set(mid.x + sx * (h ? h.t : 30), gy + H, mid.z + sz * (h ? h.t : 30));
          p.data.beams[0].opacity(0.95).set(_a, mid); p.data.beams[1].opacity(0.95).set(mid, far);
          p.data.beams[0].width(0.28 + 0.06 * Math.sin(p.t * 50)); p.data.beams[1].width(0.28 + 0.06 * Math.sin(p.t * 50));
          if (Math.random() < 0.6) w.fx.sparks(far, C.pink, 3);
          sweepHit(b, p, p.data.prev, ang, gy, 0.7, b.r * 0.5, b.r + 2 + (h ? h.t : 30), 40);
          p.data.prev = ang;
          if (p.t >= dur) { p.step = 2; p.t = 0; p.acting = false; p.data.beams.forEach(x => x.opacity(0)); fg.material.opacity = 0; if (p.data.loop) p.data.loop.stop(0.1); }
          return false;
        }
        return p.t > 0.6;
      },
      end(b, p) { if (p.data.beams) p.data.beams.forEach(x => x.kill()); if (p.data.loop) p.data.loop.stop(0.05); b.faceGlow.material.opacity = 0; },
    },
  };

  // ================================================================== QUEEN BUZZHIVE
  function hexCrownGeo() {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, rr = i === 6 ? 0 : 0.13;
      const h = i === 6 ? 0.16 : 0.1 + 0.03 * (i % 2);
      const g = new THREE.CylinderGeometry(0.06, 0.07, h, 6); g.deleteAttribute('uv');
      g.translate(Math.cos(a) * rr, h / 2, Math.sin(a) * rr);
      G.Geo.colorize(g, i % 2 ? 0xffd23f : 0xffb020);
      parts.push(g);
      const cap = new THREE.CylinderGeometry(0.04, 0.04, 0.012, 6); cap.deleteAttribute('uv');
      cap.translate(Math.cos(a) * rr, h + 0.005, Math.sin(a) * rr);
      G.Geo.colorize(cap, 0xb86a00); parts.push(cap);
    }
    const g = G.Geo.merge(parts); g.userData.shared = true;
    return g;
  }
  let _crownGeo = null, _podGeo = null, _wingGeo = null;
  function podGeo() {
    if (_podGeo) return _podGeo;
    const g = new THREE.IcosahedronGeometry(1, 1); g.deleteAttribute('uv');
    G.Geo.colorize(g, (x, y) => (y > 0.3 ? 0xffd23f : y < -0.3 ? 0xe89a10 : 0xffb627));
    const core = new THREE.SphereGeometry(0.45, 10, 8); core.deleteAttribute('uv'); core.translate(0, 0, 0.75); G.Geo.colorize(core, 0xff5fa2);
    _podGeo = G.Geo.merge([g, core]); _podGeo.userData.shared = true;
    return _podGeo;
  }
  function wingGeo() {
    if (_wingGeo) return _wingGeo;
    const g = new THREE.CircleGeometry(1, 20); g.scale(1, 0.45, 1); g.translate(1, 0, 0);
    G.Geo.colorize(g, 0xdff8ff);   // vertex colour: the wings render through a vertex-coloured charMat
    _wingGeo = g; g.userData.shared = true;
    return g;
  }
  const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _pp = new V3(), _ps = new V3();
  const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
  class Buzzhive extends Boss {
    constructor(world, pos, opts) {
      opts = opts || {};
      const s = opts.scale || 1;
      const spec = { body: 'egg', size: 5.2 * s, color: 0xffc21a, accent: C.plum, metal: 0x3a2a5c, eyes: 'led2', eyeColor: C.idle, mobility: 'hover', boss: true, armor: 0.6, antenna: true, seed: 52 };
      if (!_crownGeo) _crownGeo = hexCrownGeo();
      const L0 = G.Geo.robotLayout ? G.Geo.robotLayout(spec) : null;
      // the honeycomb crown is merged into the boss's single robot mesh
      const att = L0 ? [{ to: 'head', geo: _crownGeo, em: 0xffb020, ei: 0.15, pos: [0, L0.headTop - 0.03, 0], scale: 1.4, key: 'hivecrown' }] : [];
      const rb = G.Geo.robot(spec, { attach: att });
      super(world, 'buzzhive', pos, opts, { r: rb.radius * 0.9, h: rb.height * 0.9 });
      this.rb = rb; this.mesh = rb.group;
      this.alt = 4.2 * s; this.altBoost = 0;
      this.pos.y = this.groundY + this.alt;
      const L = rb.layout, P = rb.parts;
      if (!L0) { const crown = new THREE.Mesh(_crownGeo, G.M.vc({ spec: 0.7, emissive: 0xffb020, ei: 0.15 })); crown.position.set(0, L.headTop - 0.03, 0); crown.scale.setScalar(1.4); P.head.add(crown); }
      // two flapping glass wings = ONE transparent skinned mesh (each wing group is a bone)
      const wg0 = wingGeo();
      this.wingMat = G.Geo.charMat({ transparent: true, opacity: 0.5, rimStr: 0.9, rimColor: 0xffffff, side: THREE.DoubleSide, spec: 0.8 });
      this.wingMat.forceSinglePass = true;   // one pass for the double-sided glass (r159 would draw it twice)
      this.wings = [];
      const wingPieces = [];
      for (const sd of [-1, 1]) {
        const wg = new THREE.Group(); wg.name = 'wing';
        wg.scale.set(sd * 0.36, 0.36, 0.36); wg.position.set(sd * 0.12, L.shell.cy + 0.15, -0.18); wg.rotation.y = sd * 0.3;
        P.body.add(wg); this.wings.push(wg); wingPieces.push({ node: wg, g: wg0 });
      }
      this.wingAsm = G.Geo._assemble('hivewings', wingPieces, P.body, this.wingMat, { cull: false });
      for (const m of this.wingAsm.mesh ? [this.wingAsm.mesh] : this.wingAsm.nodeMeshes) m.renderOrder = 8;
      this.stingGlow = G.R.glowSprite(0xffb627, 1.6, 0); this.stingGlow.material = this.stingGlow.material.clone();
      this.stingGlow.position.set(0, L.legH * 0.5, 0); P.model.add(this.stingGlow); worldSize(this.stingGlow, 2.6 * s);
      this.orbit = 0; this.podsRegrown = false; this.stuckT = 0;
      this.podHp = Math.round(250 * this.diff.hp * (opts.hpMult || 1) * (opts.hp ? opts.hp / 3600 : 1));
      this._makePods();
      this._ao = { speed: 0, telegraph: 0, expr: undefined, look: 0, aim: 0, flash: 0, vx: 0, vz: 0, vy: 0, yaw: 0, wind: -1, detail: 1 };
      this.PATS = HIVE_PATS;
      rb.group.position.copy(this.pos);
    }
    // The 4 orbiting pods share ONE instanced mesh (slot i = instance i; popped pods collapse to nothing).
    _makePods() {
      const s = this.scale;
      if (!this.podMesh) {
        const pm = this.podMesh = new THREE.InstancedMesh(podGeo(), G.M.vc({ spec: 0.8, rimStr: 0.5, emissive: 0xff8a00, ei: 0.12 }), 4);
        pm.name = 'hivePods'; pm.frustumCulled = false; pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        for (let i = 0; i < 4; i++) pm.setMatrixAt(i, ZERO_M);
        this.world.scene.add(pm);
        this.track(pm);
      }
      for (let i = 0; i < 4; i++) {
        const part = new BossPart(this.world, this, { hp: this.podHp, r: 0.95 * s, h: 1.9 * s, pass: 0.15, kind: 'pod', colors: [0xffd23f, 0xffb627, 0xff5fa2] });
        part.slot = i;
        this.parts.push(part);
      }
    }
    podsAlive() { let n = 0; for (const p of this.parts) if (p.alive && p.partKind === 'pod') n++; return n; }
    modDamage(a, info) {
      if (this.stuckT > 0) { const base = info.crit ? a / (info.mult || 1.75) : a; info.crit = true; return base * 2; }
      if (this.podsAlive() > 0 && !info.fromPart) return a * 0.25;
      return a;
    }
    onPhase(n) {
      if (n >= 2 && !this.podsRegrown) {
        this.podsRegrown = true;
        this.parts = this.parts.filter(p => p.alive);
        const before = this.parts.length;
        if (before < 4) {
          for (const p of this.parts) { p.alive = false; p.dead = true; }
          this.parts = [];
          this._makePods();
          for (const p of this.parts) this.world.addActor(p);
          sfx('shieldBubble', this.pos, { pitch: 0.7 });
        }
      }
    }
    patterns() {
      const p = { barrage: 1.2, swarm: this.adds.filter(a => a.alive).length < this.addsCap ? 0.7 : 0, dive: 1.1 };
      if (this.phase >= 2) p.rain = 1.1;
      return p;
    }
    roam(dt) {
      const t = this.target;
      if (!t) { this.wishX = this.wishZ = 0; return; }
      this.bandMove(dt, 10, 14, 4);
      this.faceTo(t.pos, 2.5, dt);
    }
    move(dt) {
      const w = this.world;
      const gy = w.phys.groundAt(this.pos.x, this.pos.z, 1, this.pos.y + 1);
      this.groundY = gy;
      if (!(this.pat && this.pat.id === 'dive' && this.pat.step >= 2 && this.pat.step <= 4)) {
        const tgt = gy + this.alt + this.altBoost + Math.sin(this.t * 1.7) * 0.4;
        this.vel.y = U.clamp((tgt - this.pos.y) * 2.2, -8, 8);
        this.walk(dt, 2.5);
        w.phys.moveBody(this, dt);
      }
      this.clampArena();
    }
    positionParts(dt) {
      this.orbit += (0.55 + (this.phase >= 2 ? 0.25 : 0)) * (dt || 0.016);
      const s = this.scale;
      for (const p of this.parts) {
        if (!p.alive || p.partKind !== 'pod') continue;
        const a = this.orbit * TAU * 0.25 + p.slot * TAU / 4;
        const R = 5.5 * s, y = this.pos.y + this.h * 0.35 + Math.sin(this.t * 2 + p.slot) * 0.5 - p.h * 0.5;
        p.pos.set(this.pos.x + Math.cos(a) * R, y, this.pos.z + Math.sin(a) * R);
      }
      const pm = this.podMesh;
      if (pm) {
        for (let i = 0; i < 4; i++) pm.setMatrixAt(i, ZERO_M);
        for (const p of this.parts) {
          if (!p.alive || p.partKind !== 'pod') continue;
          const a = this.orbit * TAU * 0.25 + p.slot * TAU / 4;
          _pq.setFromEuler(_pe.set(Math.sin(this.t * 3 + p.slot) * 0.2, -a + Math.PI / 2, 0));
          pm.setMatrixAt(p.slot, _pm.compose(_pp.set(p.pos.x, p.pos.y + p.h * 0.5, p.pos.z), _pq, _ps.setScalar(0.8 * s)));
        }
        pm.instanceMatrix.needsUpdate = true;
      }
      this.rb.group.position.copy(this.pos);
      this.rb.group.rotation.y = this.yaw;
    }
    animate(dt) {
      const rb = this.rb, o = this._ao, p = this.pat;
      let st = 'move';
      o.telegraph = 0; o.expr = undefined; o.speed = Math.hypot(this.vel.x, this.vel.z) + 1;
      if (this.state === 'intro') { st = 'windup'; o.telegraph = 0.3 + 0.3 * Math.sin(this.t * 8); }
      else if (this.stunT > 0 || this.stuckT > 0) { st = 'stun'; if (this.stuckT > 0) o.telegraph = 0.25 + 0.25 * Math.sin(this.t * 12); }
      else if (p && p.tele) { st = 'windup'; o.telegraph = 0.55 + 0.45 * Math.sin(p.t * 6 * TAU); }
      else if (p && p.acting) st = 'attack';
      o.flash = 0;   // eased inside the rig (onHurt -> rb.hit)
      if (this.hitFlash > 0) this.hitFlash -= dt;
      this._motion(o, p);
      if (st === 'windup' && E.focusExpr) o.expr = E.focusExpr();
      G.Geo.animateRobot(rb, st, this.t, dt, o);
      this._windFace(st);
      const flap = this.stuckT > 0 ? 0.1 : 0.55;
      this.wings.forEach((wg, i) => { wg.rotation.z = (i ? 1 : -1) * (0.25 + flap * Math.sin(this.t * 45 + i)); });
    }
    timers(dt) { if (this.stuckT > 0) this.stuckT -= dt; }
    // stuck in the ground after a dive: every hit counts double
    weakWindow() { return this.stuckT > 0 ? { key: 'enemy.hiveStuck', t: this.stuckT, pt: null } : null; }
    deadAnim(dt) {
      this.vel.y -= 14 * dt; this.pos.y = Math.max(this.groundY, this.pos.y + this.vel.y * dt);
      const done = G.Geo.animateRobot(this.rb, 'dead', this.t, dt * 0.45, this._ao);
      this.rb.group.position.copy(this.pos);
      return done || this.deadT > 1.6;
    }
    cleanupVis() { super.cleanupVis(); if (this.stingGlow) this.stingGlow.material.opacity = 0; this.altBoost = 0; this.stuckT = 0; }
    dispose() {
      super.dispose();
      if (this.podMesh) this.podMesh.dispose();
      if (this.wingAsm && this.wingAsm.skeleton) this.wingAsm.skeleton.dispose();
      if (this.wingMat) this.wingMat.dispose();
    }
  }
  const HIVE_PATS = {
    barrage: {
      rest: 1.1,
      start(b, p) { p.tele = true; p.data.tele = b.tele(0.7); bossTele(b, 'teleSpin', p.data.tele, 0.8, 0.7); },
      tick(b, dt, p) {
        b.roam(dt);
        b.stingGlow.material.opacity = p.step === 0 ? 0.5 + 0.5 * Math.sin(p.t * 6 * TAU) : 0.6;
        if (p.step === 0) { if (p.t >= p.data.tele) { p.step = 1; p.t = 0; p.tele = false; p.acting = true; p.data.n = 0; } return false; }
        if (p.data.n < 8 && p.t >= p.data.n * 0.25 / b.fireK && b.target) {
          b.stingGlow.getWorldPosition(_a);
          E.shoot(b, _a.clone(), b.target.aimPoint(_b), { speed: 9, dmg: 10, color: 0xffb627, size: 0.34, homing: 1.3 * b.homK, life: 5, spread: 0.25 });
          sfx('splat', b.pos, { pitch: 1.6 });
          p.data.n++;
        }
        return p.data.n >= 8 && p.t > 2.2;
      },
      end(b) { b.stingGlow.material.opacity = 0; },
    },
    swarm: {
      rest: 1.0,
      start(b, p) { p.tele = true; p.data.tele = b.tele(1.0); sfx('warn', b.pos, { pitch: 1.4 }); },
      tick(b, dt, p) {
        b.wishX = b.wishZ = 0;
        if (p.step === 0 && p.t >= p.data.tele) {
          p.step = 1; p.tele = false;
          const alive = b.adds.filter(a => a.alive && a.enemyId === 'bumbler').length;
          const n = Math.max(0, Math.min(4, b.addsN + 1, b.addsCap - alive));
          for (let i = 0; i < n; i++) { const a = i / 4 * TAU + b.yaw; b.spawnAdd('bumbler', new V3(b.pos.x + Math.sin(a) * 3, b.pos.y + 1, b.pos.z + Math.cos(a) * 3), { cap: 10, fromAir: true }); }
          sfx('enemyAlert', b.pos, { pitch: 0.8 });
        }
        return p.step === 1 && p.t > p.data.tele + 0.6;
      },
    },
    dive: {
      rest: 1.2,
      start(b, p) { p.tele = true; sfx('missile', b.pos, { pitch: 0.6 }); bossTele(b, 'teleBoss', b.tele(1.2), 1.1, null); },
      tick(b, dt, p) {
        const w = b.world, t = b.target;
        if (p.step === 0) { // rise 1.2 s
          b.wishX = b.wishZ = 0;
          b.altBoost = 4 * U.smoothstep(0, 1, p.t / b.tele(1.2));
          if (p.t >= b.tele(1.2)) { p.step = 1; p.t = 0; p.data.ring = b.track(E.warnCircle(w, t ? t.pos : b.pos, 3.5, b.tele(1.0) + 0.35, C.pink, { follow: t })); sfx('warn', b.pos, { pitch: 1.2 }); }
        } else if (p.step === 1) { // shadow tracks for 1 s then locks
          b.wishX = b.wishZ = 0;
          if (p.t >= b.tele(1.0)) { p.step = 2; p.t = 0; p.data.ring.lock(); p.data.from = b.pos.clone(); p.tele = false; p.acting = true; sfx('boost', b.pos, { pitch: 0.7 }); }
        } else if (p.step === 2) { // dive
          const k = U.clamp(p.t / 0.35, 0, 1), r = p.data.ring;
          const gy = w.phys.groundAt(r.pos.x, r.pos.z, 1, r.pos.y + 10);
          b.pos.set(U.lerp(p.data.from.x, r.pos.x, k), U.lerp(p.data.from.y, gy - b.h * 0.15, k * k), U.lerp(p.data.from.z, r.pos.z, k));
          b.vel.set(0, 0, 0);
          if (k >= 1) {
            r.kill();
            b.groundY = gy;
            E.blast(w, _a.set(b.pos.x, gy + 0.4, b.pos.z), 3.5, 35, { src: b, knock: 10, color: 0xffb627 });
            w.fx.burst(_a, [0xffd23f, 0xffb627, 0xffffff], 30, 10, 0.4, 0.8, { normal: true, grav: 14 });
            b.stuckT = 2.5; p.step = 3; p.t = 0; p.acting = false; b.altBoost = 0;
            sfx('bossRoar', b.pos, { pitch: 1.4 });
          }
        } else if (p.step === 3) { // stuck 2.5 s (core exposed x2)
          b.vel.set(0, 0, 0);
          if (p.t >= 2.5) { p.step = 4; p.t = 0; }
        } else if (p.step === 4) { // rise back
          b.pos.y += (b.groundY + b.alt - b.pos.y) * Math.min(1, dt * 3);
          if (p.t > 0.9) return true;
        }
        return false;
      },
      end(b) { b.altBoost = 0; b.stuckT = 0; },
    },
    rain: {
      rest: 1.2,
      start(b, p) { p.tele = true; p.data.tele = b.tele(0.5); bossTele(b, 'teleArtillery', p.data.tele, 0.85, 0.9); },
      tick(b, dt, p) {
        b.roam(dt);
        if (p.step === 0 && p.t >= p.data.tele) {
          p.step = 1; p.tele = false; p.acting = true;
          const t = b.target; if (!t) return true;
          for (let i = 0; i < 6; i++) {
            const off = i === 0 ? 0 : U.rand(2, 8), ang = Math.random() * TAU;
            const to = new V3(t.pos.x + Math.cos(ang) * off, 0, t.pos.z + Math.sin(ang) * off);
            to.y = b.world.phys.groundAt(to.x, to.z, 0.2, t.pos.y + 3);
            const T = Math.max(1.0, b.tele(1.0));
            E.lob(b, new V3(to.x + U.rand(-1, 1), to.y + 16, to.z + U.rand(-1, 1)), to, T, { gravity: 6, color: C.goo, kind: 'ink', size: 0.45, r: 2, onImpact: pos => gooSplash(b, pos, 15, 2) });
          }
        }
        return p.step === 1 && p.t > 1.5;
      },
    },
  };

  // ================================================================== VEND-O-TITAN
  let _titanGeo = null;
  function titanGeos() {
    if (_titanGeo) return _titanGeo;
    const Geo = G.Geo;
    const add = (arr, g, col, x, y, z, rx, ry, rz, sx, sy, sz) => { if (g.attributes.uv) g.deleteAttribute('uv'); Geo.xf(g, x, y, z, rx, ry, rz, sx, sy, sz); Geo.colorize(g, col); arr.push(g); return g; };
    const rbx = (w, h, d, r) => Geo.roundedBox(w, h, d, r, 2);
    const W = 5.2, H = 6.0, D = 3.2;
    // body (origin at body bottom centre)
    const b = [];
    add(b, rbx(W, H, D, 0.45), 0xff7a3d, 0, H / 2, 0);
    add(b, rbx(W + 0.12, 0.35, D + 0.12, 0.15), C.plum, 0, 0.2, 0);
    add(b, rbx(W + 0.12, 0.35, D + 0.12, 0.15), C.plum, 0, H - 0.2, 0);
    // window frame + cans (left 60%)
    const wx = -0.75, ww = 3.0, wh = 4.2, wy = 3.3, fz = D / 2;
    add(b, rbx(ww + 0.3, wh + 0.3, 0.2, 0.08), C.brass, wx, wy, fz);
    add(b, new THREE.PlaneGeometry(ww, wh), 0x2a3a7a, wx, wy, fz + 0.11);
    const canCols = [0xff5fa2, 0xffd23f, 0x39d5ff, 0x9be15d, 0xff8a4c, 0xb983ff];
    for (let r = 0; r < 3; r++) {
      add(b, new THREE.BoxGeometry(ww - 0.1, 0.08, 0.3), 0xcfd6ff, wx, wy - wh / 2 + 0.55 + r * 1.35, fz);
      for (let c = 0; c < 4; c++) add(b, new THREE.CylinderGeometry(0.24, 0.24, 0.8, 12), canCols[(r * 4 + c) % canCols.length], wx - ww / 2 + 0.42 + c * 0.72, wy - wh / 2 + 1.0 + r * 1.35, fz + 0.05);
    }
    // right panel: buttons, slot frame, tray
    const px = 1.75;
    add(b, rbx(1.3, 4.2, 0.18, 0.08), 0x5b3a8c, px, wy, fz);
    for (let i = 0; i < 6; i++) add(b, new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12), canCols[i], px + (i % 2 ? 0.28 : -0.28), wy + 1.5 - Math.floor(i / 2) * 0.5, fz + 0.12, Math.PI / 2, 0, 0);
    add(b, rbx(0.9, 0.5, 0.12, 0.06), 0x2a1b3d, px, wy - 0.5, fz + 0.1);
    add(b, rbx(4.2, 0.7, 0.5, 0.12), 0x5b3a8c, -0.1, 0.75, fz + 0.1);
    add(b, rbx(3.6, 0.35, 0.3, 0.08), 0x1b1440, -0.1, 0.8, fz + 0.3);
    // rivets
    for (const sx of [-1, 1]) for (const sy of [0.6, H - 0.6]) add(b, new THREE.SphereGeometry(0.12, 8, 6), C.brass, sx * (W / 2 - 0.25), sy, fz + 0.02);
    // shoulder pods + dome collar
    for (const sx of [-1, 1]) add(b, new THREE.SphereGeometry(0.75, 14, 10), C.plum, sx * (W / 2 + 0.15), H - 1.0, 0);
    add(b, new THREE.CylinderGeometry(1.5, 1.7, 0.4, 24), C.brass, 0, H + 0.15, 0);
    const body = Geo.merge(b);
    // leg (origin at hip, hangs down 2.6)
    const l = [];
    add(l, new THREE.CylinderGeometry(0.55, 0.45, 1.4, 14), C.plum, 0, -0.7, 0);
    add(l, new THREE.SphereGeometry(0.6, 12, 10), C.brass, 0, -1.4, 0);
    add(l, new THREE.CylinderGeometry(0.45, 0.55, 1.1, 14), 0xff7a3d, 0, -1.95, 0);
    add(l, rbx(1.5, 0.55, 2.0, 0.22), C.plum, 0, -2.35, 0.2);
    const leg = Geo.merge(l);
    // cannon arm (origin at shoulder, points +Z)
    const a1 = [];
    add(a1, new THREE.SphereGeometry(0.6, 12, 10), C.brass, 0, 0, 0);
    add(a1, new THREE.CylinderGeometry(0.55, 0.62, 2.6, 16), 0xff7a3d, 0, 0, 1.3, Math.PI / 2, 0, 0);
    add(a1, new THREE.TorusGeometry(0.62, 0.12, 8, 18), C.brass, 0, 0, 2.6);
    add(a1, new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), 0x1b1440, 0, 0, 2.62, Math.PI / 2, 0, 0);
    const cannon = Geo.merge(a1);
    // mitt arm (origin at shoulder, hangs down)
    const a2 = [];
    add(a2, new THREE.SphereGeometry(0.6, 12, 10), C.brass, 0, 0, 0);
    add(a2, new THREE.CylinderGeometry(0.4, 0.4, 2.0, 12), C.plum, 0, -1.1, 0);
    add(a2, new THREE.SphereGeometry(0.95, 14, 10), 0xff7a3d, 0, -2.4, 0, 0, 0, 0, 1, 0.9, 1);
    const mitt = Geo.merge(a2);
    // Mox: little vending machine with top hat + monocle (origin at its base)
    const m = [];
    add(m, rbx(1.0, 1.15, 0.75, 0.2), 0x6a4bb0, 0, 0.6, 0);
    add(m, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 18), 0x2a1b3d, 0, 1.2, 0);
    add(m, new THREE.CylinderGeometry(0.3, 0.32, 0.55, 18), 0x2a1b3d, 0, 1.5, 0);
    add(m, new THREE.CylinderGeometry(0.325, 0.325, 0.12, 18), 0xffc21a, 0, 1.32, 0);
    add(m, new THREE.TorusGeometry(0.16, 0.035, 6, 16), 0xffc21a, 0.22, 0.78, 0.39);
    add(m, rbx(0.36, 0.08, 0.05, 0.03), 0x1b1440, 0, 0.36, 0.38);
    const mox = Geo.merge(m);
    // coin slot: dark box, glow mask a = 1 (lit by the boss material's core colour when the slot opens)
    const slot = new THREE.BoxGeometry(0.6, 0.18, 0.1); slot.deleteAttribute('uv'); slot.translate(px, wy - 0.5, fz + 0.18); Geo.colorize(slot, 0x1b1440);
    const sg = new Float32Array(slot.attributes.position.count * 4); for (let i = 3; i < sg.length; i += 4) sg[i] = 1;
    slot.setAttribute('glow', new THREE.BufferAttribute(sg, 4));
    for (const g of [body, leg, cannon, mitt, mox, slot]) g.userData.shared = true;
    _titanGeo = { body, leg, cannon, mitt, mox, slot, W, H, D, wy, wx, px, fz };
    return _titanGeo;
  }
  let _chuteGeo = null;
  function chuteGeo() {
    if (_chuteGeo) return _chuteGeo;
    const g = new THREE.SphereGeometry(1.4, 16, 6, 0, TAU, 0, Math.PI / 2.2); g.deleteAttribute('uv');
    G.Geo.colorize(g, (x, y, z) => ((Math.floor((Math.atan2(z, x) + Math.PI) / (TAU / 8)) % 2) ? 0xffffff : 0xff5fa2));
    const lines = [];
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; const c = new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4); c.deleteAttribute('uv'); G.Geo.xf(c, Math.cos(a) * 0.65, 0.05, Math.sin(a) * 0.65, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); G.Geo.colorize(c, 0xffffff); lines.push(c); }
    _chuteGeo = G.Geo.merge([g].concat(lines.map(c => { c.translate(0, -0.85, 0); return c; })));
    _chuteGeo.userData.shared = true;
    return _chuteGeo;
  }
  class VendoTitan extends Boss {
    constructor(world, pos, opts) {
      opts = opts || {};
      const s = opts.scale || 1;
      super(world, 'titan', pos, opts, { r: 2.8 * s, h: 8.6 * s });
      const T = titanGeos();
      this.T = T;
      // body + slot + arms + legs = ONE skinned mesh (hips / arms / legs are its bones); the slot is lit
      // through the weak-spot glow mask (mat.core), the whole machine flashes via mat.emissive.
      const mat = G.Geo.charMat ? G.Geo.charMat({ spec: 0.6, rimStr: 0.4 }) : G.M.toonUnique(0xffffff, { vc: true, spec: 0.6, rimStr: 0.4 });
      this.mat = mat;
      const pieces = [];
      const root = new THREE.Group(); root.scale.setScalar(s);
      const hips = new THREE.Group(); hips.name = 'hips'; hips.position.y = 2.6; root.add(hips);
      pieces.push({ node: hips, g: T.body }, { node: hips, g: T.slot });
      this.hips = hips; this.body = hips;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 4.2), G.M.toon(0xbff3ff, { transparent: true, opacity: 0.28, rimStr: 0, spec: 0.9 }));
      glass.position.set(T.wx, T.wy, T.fz + 0.25); glass.renderOrder = 6; hips.add(glass);
      this.windowGlow = G.R.glowSprite(C.pink, 4, 0); this.windowGlow.material = this.windowGlow.material.clone(); this.windowGlow.position.set(T.wx, T.wy, T.fz + 0.6); hips.add(this.windowGlow);
      const slot = new THREE.Object3D(); slot.name = 'slot'; slot.position.set(T.px, T.wy - 0.5, T.fz + 0.18); hips.add(slot);
      this.slot = slot;
      this.slotGlow = G.R.glowSprite(0xffd23f, 1.8, 0); this.slotGlow.material = this.slotGlow.material.clone(); this.slotGlow.position.copy(slot.position).z += 0.2; hips.add(this.slotGlow);
      // dome + Mox
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 12, 0, TAU, 0, Math.PI / 2), G.M.toon(0xcff8ff, { transparent: true, opacity: 0.3, rimStr: 1.1, rimColor: 0xffffff, spec: 0.9 }));
      dome.position.y = T.H + 0.3; dome.renderOrder = 7; hips.add(dome);
      this.dome = dome;
      const mox = new THREE.Group(); mox.position.set(0, T.H + 0.32, 0); hips.add(mox);
      const moxBody = new THREE.Mesh(T.mox, G.M.vc({ spec: 0.6 })); mox.add(moxBody);
      // Mox looks determined (wide 'focused' LED eye), never angry
      const faceMat = new THREE.MeshBasicMaterial({ map: G.Geo.face(E.focusExpr ? E.focusExpr() : 'alert', { style: 'led', color: 0xffd23f, eyes: 'one' }), transparent: true, depthWrite: false });
      this.moxFace = faceMat;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.62), faceMat); face.position.set(0, 0.72, 0.38); mox.add(face);
      this.mox = mox;
      // arms
      const armL = new THREE.Group(); armL.name = 'armL'; armL.position.set(-(T.W / 2 + 0.15), T.H - 1.0, 0); hips.add(armL);
      pieces.push({ node: armL, g: T.cannon });
      const armR = new THREE.Group(); armR.name = 'armR'; armR.position.set(T.W / 2 + 0.15, T.H - 1.0, 0); hips.add(armR);
      pieces.push({ node: armR, g: T.mitt });
      this.armL = armL; this.armR = armR;
      this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0, 0, 2.7); armL.add(this.muzzle);
      this.cannonGlow = G.R.glowSprite(C.pink, 1.6, 0); this.cannonGlow.material = this.cannonGlow.material.clone(); this.cannonGlow.position.set(0, 0, 2.7); armL.add(this.cannonGlow);
      // legs
      this.legs = [];
      for (const sx of [-1, 1]) { const lg = new THREE.Group(); lg.name = 'leg'; lg.position.set(sx * 1.45, 2.6, 0); root.add(lg); pieces.push({ node: lg, g: T.leg }); this.legs.push(lg); }
      if (G.Geo._assemble) this.titanAsm = G.Geo._assemble('titan', pieces, root, mat, { cull: false });
      else for (const pc of pieces) pc.node.add(new THREE.Mesh(pc.g, mat));
      const sh = G.R.blobShadow(3.4); sh.position.y = 0.04; root.add(sh);
      this.mesh = root;
      this.walkPh = 0; this.slotOpenT = 0; this.stompLeg = 0; this.lean = 0;
      this.flashK = 0; this.svx = 0; this.svz = 0;
      this.sHip = { x: 0, v: 0, t: 0, f: 1.4, z: 0.45 }; this.sHipZ = { x: 0, v: 0, t: 0, f: 1.4, z: 0.45 };   // flinch / lean springs (heavy: slow)
      this.edge = null; this.edgeT = 0; this.saleT = 3; this.totesSent = false;
      this.critY = null;
      this.PATS = TITAN_PATS;
      root.position.copy(this.pos); root.rotation.y = this.yaw;
    }
    patterns() {
      const p = { cans: 1.1, coins: 1 };
      if (this.phase >= 2) p.stomp = 1.2;
      if (this.phase >= 3) { p.beam = 1.5; p.coins = 0.6; }
      return p;
    }
    onPhase(n) {
      if (n >= 2 && !this.totesSent) {
        this.totesSent = true;
        const A = this.arena, R = (A.half || A.r) * 0.8;
        for (const sd of [-1, 1]) {
          const a = this.yaw + sd * Math.PI / 2;
          // the bots a Tote drops are boss adds too (they pop with the Titan)
          const e = E.spawn(this.world, 'tote', new V3(A.x + Math.sin(a) * R, this.groundY + 12, A.z + Math.cos(a) * R), { alerted: true, difficulty: this.diff, fromAir: true, dropTypes: ['bumbler', 'rollo', 'hopper'], lootMult: 0.5, onDrop: c => this.adds.push(c) });
          if (e) this.adds.push(e);
        }
        this._electrify();
      }
      if (n >= 3) this.speedK = 1.15;
    }
    _electrify() {
      const A = this.arena, w = this.world;
      let geo;
      if (A.half) {
        const parts = [];
        for (let i = 0; i < 4; i++) { const g = new THREE.PlaneGeometry(A.half * 2, 2.5).rotateX(-Math.PI / 2); g.translate(0, 0, A.half - 1.25); g.rotateY(i * Math.PI / 2); parts.push(g); }
        geo = G.Geo.merge(parts);
      } else geo = new THREE.RingGeometry(A.r - 2.5, A.r, 64).rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x19b8ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.position.set(A.x, this.groundY + 0.07, A.z);
      w.scene.add(m);
      this.edge = this.track(m);
      sfx('zap', this.pos, { pitch: 0.5 });
    }
    inEdge(a) {
      const A = this.arena;
      if (A.half) { const dx = Math.abs(a.pos.x - A.x), dz = Math.abs(a.pos.z - A.z); return Math.max(dx, dz) > A.half - 2.5 && Math.max(dx, dz) < A.half + 1; }
      const d = Math.hypot(a.pos.x - A.x, a.pos.z - A.z); return d > A.r - 2.5 && d < A.r + 1;
    }
    timers(dt) {
      const w = this.world;
      if (this.edge) {
        this.edge.material.opacity = 0.45 + 0.2 * Math.sin(this.t * 9) + (Math.random() < 0.1 ? 0.25 : 0);
        if (Math.random() < 0.25) { const A = this.arena, a = Math.random() * TAU, R = A.half ? A.half - 1.2 : A.r - 1.2; this.world.fx.sparks(_b.set(A.x + Math.cos(a) * R, this.groundY + 0.2, A.z + Math.sin(a) * R), C.elec, 3); }
        this.edgeT -= dt;
        if (this.edgeT <= 0) {
          this.edgeT = 0.25;
          for (const a of w.actors) {
            if (!a.alive || !a.targetable || a.team === this.team || a.isCrate || a.isBossPart) continue;
            if (a.pos.y - this.groundY > 1.2 || !this.inEdge(a)) continue;
            E.hurt(this, a, 5 * 0.25, { type: 'shock', knock: 0, silent: true });
            w.fx.sparks(_a.set(a.pos.x, a.pos.y + 0.2, a.pos.z), C.elec, 3);
          }
        }
      }
      if (this.phase >= 3) {
        this.saleT -= dt;
        if (this.saleT <= 0 && this.target) {
          this.saleT = 1.5 / Math.max(0.6, this.fireK);
          const t = this.target, ang = Math.random() * TAU, off = U.rand(0, 10);
          const to = new V3(t.pos.x + Math.cos(ang) * off, 0, t.pos.z + Math.sin(ang) * off);
          to.y = w.phys.groundAt(to.x, to.z, 0.2, t.pos.y + 3);
          this.hips.updateMatrixWorld(true);
          const from = this.dome.getWorldPosition(new V3());
          E.lob(this, from, to, Math.max(1.1, this.tele(1.2)), { gravity: 14, color: C.goo, kind: 'ink', size: 0.5, r: 2.2, onImpact: pos => gooSplash(this, pos, 15, 2.2) });
        }
      }
      if (this.slotOpenT > 0) this.slotOpenT -= dt;
    }
    roam(dt) { this.bandMove(dt, 12, 18, 1.6); if (this.target) this.faceTo(this.target.pos, 1.5, dt); }
    move(dt) {
      this.walk(dt, 2);
      if (!this.grounded) this.vel.y -= 22 * dt;
      this.world.phys.moveBody(this, dt);
      if (this.grounded) this.groundY = this.pos.y;
      this.clampArena();
    }
    modDamage(a, info) {
      if (this.slotOpenT > 0 && info.pos) {
        this.slot.getWorldPosition(_a);
        if (info.pos.distanceTo(_a) < 1.6 * this.scale) { const base = info.crit ? a / (info.mult || 1.75) : a; info.crit = true; return base * 2; }
      }
      return a;
    }
    positionParts() { this.mesh.position.copy(this.pos); this.mesh.rotation.y = this.yaw; }
    // the coin slot is open (x2) from the Coin Spray wind-up until 1.6 s after it
    weakWindow() { return this.slotOpenT > 0 ? { key: 'enemy.slotOpen', t: this.slotOpenT, pt: this.slotGlow ? this.slotGlow.getWorldPosition(_wp) : null } : null; }
    onHurt(info, amt) {
      this.hitFlash = 0.06;
      if (info && info.type === 'dot') { this.flashK = Math.max(this.flashK, 0.3); return; }   // DoT ticks: a soft glow only
      this.flashK = Math.max(this.flashK, U.clamp(0.5 + (amt || 0) / 60, 0.5, 1));
      let dx = 0, dz = 0;
      const d = info && info.dir, sp = (info && info.pos) || (info && info.src && info.src.pos);
      if (d && d.lengthSq && d.lengthSq() > 1e-6) { dx = d.x; dz = d.z; } else if (sp) { dx = this.pos.x - sp.x; dz = this.pos.z - sp.z; }
      const l = Math.hypot(dx, dz) || 1, sn = Math.sin(this.yaw), cs = Math.cos(this.yaw), k = U.clamp(0.25 + (amt || 0) / 150, 0.25, 0.8) * 0.12;
      this.sHip.v += (dx * sn + dz * cs) / l * k; this.sHipZ.v -= (dx * cs - dz * sn) / l * k;
    }
    animate(dt) {
      const hs = Math.hypot(this.vel.x, this.vel.z), p = this.pat;
      // stride matched to the leg sweep: one step covers 2·leg·sin(swing) (was ~60% foot slide)
      const sw = 0.35 * Math.min(1, hs);
      this.walkPh += dt * Math.PI * hs / (2 * 2.6 * this.scale * Math.sin(Math.max(0.12, sw)));
      const stomp = p && p.id === 'stomp' ? p.data.lift || 0 : 0;
      this.legs.forEach((lg, i) => {
        const s = i ? -1 : 1;
        lg.rotation.x = Math.sin(this.walkPh) * sw * s - (i === this.stompLeg ? stomp * 0.9 : 0);
      });
      this.hips.position.y = 2.6 + Math.abs(Math.sin(this.walkPh)) * 0.12 * Math.min(1, hs) + (this.state === 'intro' ? Math.sin(this.t * 14) * 0.05 : 0);
      // heavy body: leans a little into acceleration and rocks back from hits on slow springs
      const ax = (this.vel.x - this.svx) * 6, az = (this.vel.z - this.svz) * 6;
      this.svx = U.damp(this.svx, this.vel.x, 6, dt); this.svz = U.damp(this.svz, this.vel.z, 6, dt);
      const sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
      this.sHip.t = U.clamp((ax * sn + az * cs) * 0.012, -0.06, 0.06); this.sHipZ.t = -U.clamp((ax * cs - az * sn) * 0.012, -0.06, 0.06);
      G.Geo.springStep(this.sHip, dt); G.Geo.springStep(this.sHipZ, dt);
      this.hips.rotation.z = Math.sin(this.walkPh) * 0.03 * Math.min(1, hs) + stomp * 0.06 * (this.stompLeg ? -1 : 1) + this.sHipZ.x;
      this.lean = U.damp(this.lean, p && p.tele ? -0.08 : p && p.acting ? 0.06 : 0, 6, dt);
      this.hips.rotation.x = this.lean + this.sHip.x + (this.stunT > 0 ? Math.sin(this.t * 6) * 0.06 : 0);
      this.mox.position.y = this.T.H + 0.32 + Math.abs(Math.sin(this.t * 7)) * 0.05;
      this.mox.rotation.y = Math.sin(this.t * 1.3) * 0.4;
      // cannon aims at target
      if (this.target) { const d = this.distTo(this.target); this.armL.rotation.x = U.damp(this.armL.rotation.x, -Math.atan2(this.target.pos.y + 1 - (this.pos.y + 7.6 * this.scale), d) * 0.6, 4, dt); }
      this.armR.rotation.x = U.damp(this.armR.rotation.x, p && p.id === 'stomp' && p.tele ? -1.2 : Math.sin(this.walkPh) * 0.2, 6, dt);
      const slotOn = this.slotOpenT > 0;
      if (this.mat.core) this.mat.core.setRGB(slotOn ? 1 : 0.1, slotOn ? 0.82 : 0.08, slotOn ? 0.25 : 0.02);
      this.slotGlow.material.opacity = slotOn ? 0.6 + 0.4 * Math.sin(this.t * 6 * TAU) : 0;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      this.flashK = this.flashK > 0.015 ? this.flashK * Math.exp(-12 * dt) : 0;   // eased hit flash
      const fl = this.flashK * 0.6;
      const tele = p && p.tele ? 0.25 + 0.2 * Math.sin(p.t * 6 * TAU) : 0;
      this.mat.emissive.setRGB(fl + tele, fl + tele * 0.3, fl + tele * 0.5);
    }
    deadAnim(dt) {
      const k = U.clamp(this.deadT / 1.2, 0, 1);
      if (!this.moxEjected) this._ejectMox();
      const sx = k < 0.3 ? 1 + 0.25 * (k / 0.3) : Math.max(0.001, 1.25 * (1 - (k - 0.3) / 0.7));
      const sy = k < 0.3 ? 1 - 0.3 * (k / 0.3) : sx;
      this.mesh.scale.set(sx * this.scale, sy * this.scale, sx * this.scale);
      this.mat.emissive.setRGB(k, k, k);
      if (Math.random() < 0.3) this.world.fx.sparks(_a.set(this.pos.x + U.rand(-3, 3), this.pos.y + U.rand(1, 8), this.pos.z + U.rand(-2, 2)), C.yellow, 6);
      return k >= 1 && this.moxDone;
    }
    _ejectMox() {
      this.moxEjected = true;
      const w = this.world;
      this.mox.updateMatrixWorld(true);
      const wp = this.mox.getWorldPosition(new V3());
      this.mox.parent.remove(this.mox);
      const g = new THREE.Group(); g.position.copy(wp); g.scale.setScalar(this.scale * 1.2);
      g.add(this.mox); this.mox.position.set(0, 0, 0);
      const chute = new THREE.Mesh(chuteGeo(), G.M.vc({ spec: 0.4 })); chute.position.y = 2.6; chute.scale.setScalar(0.01); g.add(chute);
      w.scene.add(g);
      this.moxFace.map = G.Geo.face('dizzy', { style: 'led', color: 0xffd23f, eyes: 'one' }); this.moxFace.needsUpdate = true;
      const away = new V3(Math.sin(this.yaw + Math.PI), 0, Math.cos(this.yaw + Math.PI));
      const vel = new V3(away.x * 3, 10, away.z * 3);
      let talk = 0;
      w.fx.timed(g, 6, (k, o, dt) => {
        const t = k * 6;
        if (t > 0.7) { vel.y = Math.max(-1.6, vel.y - 20 * dt); chute.scale.setScalar(Math.min(1, (t - 0.7) * 3)); }
        else vel.y -= 14 * dt;
        o.position.addScaledVector(vel, dt);
        o.rotation.z = Math.sin(t * 2.5) * 0.25; o.rotation.y += dt * 0.6;
        talk -= dt;
        if (talk <= 0 && t < 3) { talk = 0.35; sfx('npc', o.position, { pitch: 0.6 + Math.random() * 0.3 }); }
        if (k >= 1) this.moxDone = true;
      });
      E.after(w, 6.2, () => { this.moxDone = true; });
      if (G.UI && G.UI.toast) G.UI.toast(G.t('enemy.mox.eject'), { dur: 3500 });
      E.popFx(w, wp, [C.yellow, 0xffffff, C.plum], 1.2);
    }
    cleanupVis() { super.cleanupVis(); this.edge = null; if (this.windowGlow) this.windowGlow.material.opacity = 0; if (this.cannonGlow) this.cannonGlow.material.opacity = 0; this.slotOpenT = 0; }
    dispose() { super.dispose(); if (this.mesh) G.R.disposeTree(this.mesh); if (this.mat) this.mat.dispose(); if (this.titanAsm && this.titanAsm.skeleton) this.titanAsm.skeleton.dispose(); }
  }
  const TITAN_PATS = {
    cans: {
      rest: 1.2,
      start(b, p) { p.tele = true; p.data.tele = b.tele(0.8); bossTele(b, 'teleArtillery', p.data.tele, 0.65, 0.6); },
      tick(b, dt, p) {
        b.roam(dt);
        b.cannonGlow.material.opacity = p.step === 0 ? 0.5 + 0.5 * Math.sin(p.t * 6 * TAU) : 0;
        if (p.step === 0) { if (p.t >= p.data.tele) { p.step = 1; p.t = 0; p.tele = false; p.acting = true; p.data.n = 0; } return false; }
        if (p.data.n < 3 && p.t >= p.data.n * 0.3 && b.target) {
          const t = b.target, off = p.data.n === 0 ? 0 : U.rand(1.5, 4), ang = Math.random() * TAU;
          const to = new V3(t.pos.x + Math.cos(ang) * off, 0, t.pos.z + Math.sin(ang) * off);
          to.y = b.world.phys.groundAt(to.x, to.z, 0.2, t.pos.y + 3);
          b.mesh.updateMatrixWorld(true);
          const from = b.muzzle.getWorldPosition(new V3());
          const d = Math.hypot(to.x - from.x, to.z - from.z);
          E.lob(b, from, to, Math.max(1.1, b.tele(1.0) + 0.1, d / 16), { gravity: 16, dmg: 18, r: 2.5, color: [0xff5fa2, 0x39d5ff, 0xffd23f][p.data.n % 3], kind: 'grenade', size: 0.45 });
          b.world.fx.smoke(from, 3); b.world.fx.flash(from, 0xffe28a, 2, 0.1);
          sfx('grenade', b.pos, { pitch: 0.6 });
          p.data.n++;
        }
        return p.data.n >= 3 && p.t > 1.0;
      },
      end(b) { b.cannonGlow.material.opacity = 0; },
    },
    coins: {
      rest: 1.2,
      start(b, p) { p.tele = true; p.data.tele = b.tele(0.8); b.slotOpenT = p.data.tele + 1.6; sfx('coin', b.pos, { pitch: 0.5 }); bossTele(b, 'teleSpin', p.data.tele, 0.7, 0.8); },
      tick(b, dt, p) {
        b.wishX = b.wishZ = 0;
        if (b.target) b.faceTo(b.target.pos, 3, dt);
        if (p.step === 0) {
          if (p.t >= p.data.tele && b.target) {
            p.step = 1; p.t = 0; p.tele = false; p.acting = true;
            b.mesh.updateMatrixWorld(true);
            const from = b.slot.getWorldPosition(new V3());
            const t = b.target.aimPoint(new V3());
            const base = Math.atan2(t.x - from.x, t.z - from.z), d = Math.hypot(t.x - from.x, t.z - from.z);
            const pitch = Math.atan2(t.y - from.y, d);
            for (let i = 0; i < 9; i++) {
              const a = base + (i - 4) * (Math.PI / 180) * 10;
              const to = new V3(from.x + Math.sin(a) * 10, from.y + Math.tan(pitch) * 10, from.z + Math.cos(a) * 10);
              E.shoot(b, from, to, { speed: 15, dmg: 8, color: 0xffc21a, size: 0.28, kind: 'disc', spin: 14, life: 3 });
            }
            sfx('coin', b.pos, { pitch: 1.2 }); sfx('enemyShoot', b.pos, { pitch: 0.7 });
          }
          return false;
        }
        return p.t > 0.9;
      },
    },
    stomp: {
      rest: 1.3,
      start(b, p) { p.tele = true; p.data.tele = b.tele(0.9); b.stompLeg = Math.random() < 0.5 ? 0 : 1; bossTele(b, 'teleBoss', p.data.tele, 0.7, 0.4); },
      tick(b, dt, p) {
        b.wishX = b.wishZ = 0;
        if (p.step === 0) {
          p.data.lift = U.smoothstep(0, 1, p.t / p.data.tele);
          if (p.t >= p.data.tele) {
            p.step = 1; p.t = 0; p.tele = false; p.acting = true; p.data.lift = 0;
            const lg = b.legs[b.stompLeg]; lg.updateMatrixWorld(true);
            const fp = lg.localToWorld(new V3(0, -2.4, 0.4)); fp.y = b.groundY;
            E.blast(b.world, fp.clone().setY(fp.y + 0.3), 3, 20, { src: b, fx: false, knock: 9 });
            E.shockRing(b.world, b, fp, 12, 8, 20, 0.6, C.orange);
            b.world.fx.ring(fp, 4, C.orange, 0.4, fp.y + 0.05); b.world.fx.smoke(fp, 12);
            sfx('explode', fp, { size: 2 });
            const pl = b.world.player; if (pl) { const d = pl.pos.distanceTo(fp); if (d < 20) b.world.fx.shake(0.5 * (1 - d / 20)); }
          }
          return false;
        }
        return p.t > 0.7;
      },
      end(b, p) { p.data.lift = 0; },
    },
    beam: {
      rest: 1.6,
      start(b, p) {
        p.tele = true; p.data.tele = b.tele(2.0);
        if (G.Audio && G.Audio.loop) p.data.loop = b.track(G.Audio.loop('charge', { pos: b.pos, vol: 0.8, pitch: 0.5 }));
        p.data.beams = [b.track(E.beam(b.world, C.pink, 0.6)), b.track(E.beam(b.world, C.pink, 0.6))];
        p.data.beams.forEach(x => x.opacity(0));
        p.data.dir = Math.random() < 0.5 ? 1 : -1;
        sfx('warn', b.pos, { pitch: 0.6 });
        bossTele(b, 'teleBoss', p.data.tele, 0.6, null);
      },
      tick(b, dt, p) {
        const w = b.world;
        b.wishX = b.wishZ = 0;
        if (p.step === 0) {
          const k = U.clamp(p.t / p.data.tele, 0, 1);
          b.windowGlow.material.opacity = 0.3 + 0.7 * k; b.windowGlow.scale.setScalar((3 + 4 * k) * (0.9 + 0.1 * Math.sin(p.t * 40)));
          if (p.data.loop) p.data.loop.set({ pitch: 0.5 + 1.3 * k });
          if (b.target) b.faceTo(b.target.pos, 2, dt);
          if (p.t >= p.data.tele) { p.step = 1; p.t = 0; p.tele = false; p.acting = true; p.data.a0 = b.yaw - p.data.dir * 1.3; p.data.prev = p.data.a0; sfx('laser', b.pos, { pitch: 0.3 }); }
          return false;
        }
        if (p.step === 1) {
          const dur = 2.5, k = U.clamp(p.t / dur, 0, 1);
          const ang = p.data.a0 + p.data.dir * 2.6 * k;
          b.yaw = ang;
          b.mesh.updateMatrixWorld(true);
          b.windowGlow.getWorldPosition(_a);
          const gy = b.groundY, sx = Math.sin(ang), sz = Math.cos(ang);
          const mid = _b.set(b.pos.x + sx * (b.r + 3), gy + 1.3, b.pos.z + sz * (b.r + 3));
          const h = w.phys.raycast(mid.x, mid.y, mid.z, sx, 0, sz, 45, true);
          const far = _c.set(mid.x + sx * (h ? h.t : 45), gy + 1.3, mid.z + sz * (h ? h.t : 45));
          const wd = 0.55 + 0.1 * Math.sin(p.t * 50);
          p.data.beams[0].opacity(0.95).width(wd).set(_a, mid); p.data.beams[1].opacity(0.95).width(wd).set(mid, far);
          if (Math.random() < 0.7) { w.fx.sparks(far, C.pink, 4); w.fx.smoke(far, 1); }
          const lo = _d.set(b.pos.x, gy + 1.3, b.pos.z);
          sweepHit(b, p, p.data.prev, ang, gy, 2.2, b.r * 0.5, 60, 40, lo.clone());
          p.data.prev = ang;
          if (p.t >= dur) { p.step = 2; p.t = 0; p.acting = false; p.data.beams.forEach(x => x.opacity(0)); b.windowGlow.material.opacity = 0; if (p.data.loop) p.data.loop.stop(0.1); if (b.onBeamEnd) G.safe('onBeamEnd', () => b.onBeamEnd()); if (b.opts.onBeamEnd) G.safe('onBeamEnd', () => b.opts.onBeamEnd(b)); }
          return false;
        }
        return p.t > 0.6;
      },
      end(b, p) { if (p.data.beams) p.data.beams.forEach(x => x.kill()); if (p.data.loop) p.data.loop.stop(0.05); b.windowGlow.material.opacity = 0; },
    },
  };

  // ------------------------------------------------------------------ spawn
  const KINDS = { crankcrab: Crankcrab, buzzhive: Buzzhive, titan: VendoTitan };
  E.Crankcrab = Crankcrab; E.Buzzhive = Buzzhive; E.VendoTitan = VendoTitan;
  E.bossIds = Object.keys(KINDS);
  E.bosses = BOSSES;
  E.spawnBoss = function (world, id, pos, opts) {
    id = ALIAS[id] || id;
    if (id === 'pinchking' || id === 'pinch_king') return E.spawnPinchKing(world, pos || new V3(), opts || {});
    const K = KINDS[id];
    if (!K) { console.warn('[enemies] unknown boss', id); return null; }
    const b = new K(world, pos || new V3(), opts || {});
    world.addActor(b);
    b._afterAdd();
    return b;
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 17b_bosses.js]', e); }
// ---- 17c_bots.js
try { (function () {
// 17c_bots.js — G.Bot: humanoid ranger combatant for team fights (Goo Turf teams 0/1, Sky Drop Royale
// FFA teams, test arenas). Carries G.Weapons instances and fires them through the same ctx the player
// uses; human-like aim (reaction delay, error that shrinks while tracking, turn-rate limit) scaled by
// difficulty and skill; strafes, hops, slides, retreats at low HP; pluggable goals for modes.
//
// API
//   new G.Bot(world, opts) -> Actor (NOT auto-added: world.addActor(bot)); G.Bot.spawn(world, pos, opts) adds it.
//     opts {team, colors {main, accent, dark, visor}, name, difficulty, skill ('weak'|'medium'|'strong'|0..1|
//           {aimErr deg, react s, turn, strafe, burst, engage}), hp, shield, weapons:[id|{id,level,mods}|inst],
//           weapon, royale (KO removes the actor), removeOnKO, nameTag (false = no head sprite), ink (number => turf tank), regen {delay, rate,
//           swimRate}, fleeHp (0..1, default 0.3), engageRange, autoTarget (default true), pos, yaw, goal, onThink}
//   bot.goal = {type:'moveTo', pos, r?, sprint?} | {type:'loot', pos} | {type:'attack', target, range?}
//            | {type:'paint', area {x,z,r} | {minX,maxX,minZ,maxZ}} | {type:'flee', from (V3|Actor), pos?} | null
//   bot.onThink = fn(bot) — called ~4x/s before the bot decides (mode logic: set goal/target/holdFire).
//   bot.target (Actor) — current aim target (auto-picked: nearest visible actor of another team, incl. the
//     player; set autoTarget=false to drive it yourself), bot.hasLOS (read). bot.holdFire, bot.speedMod, bot.firing (read).
//   bot.ink / bot.inkRefillT (turf tank; weapons spend it), bot.swimming (blob form via humanoid.setBlob),
//   bot.canSwimAt(x, z) optional hook -> bot dives on own goo while travelling/fleeing.
//   bot.walkable(x, z) optional hook -> false keeps the bot from walking there (e.g. royale sea).
//   bot.setWeapons(list), bot.equip(i), bot.weapon, bot.respawn(pos), bot.onKO(bot, info) hook, bot.kills,
//   bot.damageDealt, bot.damageMult (rival bots on Breezy: 0.6 — weapons may read owner.damageMult).
//   G.Bot.randomName() -> safe generated name ("Zippy Otter 7").
//   G.Bot.nav(world) -> height-aware navgrid {findPath(sx,sz,gx,gz,maxExp,filter,sy,gy) -> [V3 (y = surface)],
//     lineOK(ax,az,ay,bx,bz,filter), heightAt(x,z), walkable(x,z)} used for bot routes up ramps / onto pads,
//     perches and decks (G.Enemies.nav would see those as walls). Built lazily once per world; modes may call
//     it at load time. Bots plan a route whenever the straight line to their goal is not walkable.
//   Rendering budget: the ranger is 2 draw calls (< ~30 m), 1 (static LOD, then capsule impostor > ~60 m),
//   hidden > ~220 m (bot.lod 0..3). bot.tag is an invisible Object3D drawn by the scene's shared name-tag
//   atlas (all tags = 1 draw call); move/hide/remove it as before (a Sprite only if the atlas is full).
(function (G) {
  'use strict';
  const E = G.Enemies;
  const V3 = THREE.Vector3;
  const U = G.util;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _e = new V3(), _f = new V3();

  const TEAM_COLORS = [0xff8a1f, 0x2f7bff, 0x12c2b0, 0xff4fa3, 0xffd21f, 0x8a3ffc, 0x6ccb5f, 0xff6b6b, 0x39d5ff, 0xb983ff, 0xffb627, 0x3fe0b8, 0xff7a93, 0x9fe8ff, 0xd99a5b, 0x48b87a];
  const SKILLS = {
    weak: { err: 1.6, react: 1.3, turn: 4.5, strafe: 0.5, burst: 0.9, engage: 26 },
    medium: { err: 1.1, react: 1.0, turn: 6.5, strafe: 0.8, burst: 1.4, engage: 32 },
    strong: { err: 0.7, react: 0.75, turn: 9, strafe: 1, burst: 2.2, engage: 40 },
  };
  let nameN = 0;
  // Stable small integer from a name (FNV-1a): the fallback humanoid seed for bots that get no slot seed.
  function nameSeed(name) {
    let h = 2166136261;
    const s = String(name || '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 997;
  }
  function randomName() {
    const a = U.randInt(0, 15), b = U.randInt(0, 15);
    nameN = (nameN + U.randInt(1, 7)) % 90;
    return G.t('enemy.bot.name', { adj: G.t('enemy.botAdj.' + a), animal: G.t('enemy.botAnimal.' + b), n: String(nameN + 2) });
  }

  // ------------------------------------------------------------------ visuals
  const CACHE = new Map();
  function farGeo(main, accent) {
    const key = main + '|' + accent;
    if (CACHE.has(key)) return CACHE.get(key);
    const Geo = G.Geo;
    const parts = [];
    const add = (g, col, x, y, z, sx, sy, sz) => { if (g.attributes.uv) g.deleteAttribute('uv'); Geo.xf(g, x, y, z, 0, 0, 0, sx, sy, sz); Geo.colorize(g, col); parts.push(g); };
    add(new THREE.CapsuleGeometry(0.3, 0.55, 3, 8), main, 0, 0.85, 0);
    add(new THREE.SphereGeometry(0.24, 10, 8), accent, 0, 1.45, 0);
    add(new THREE.BoxGeometry(0.34, 0.12, 0.1), 0x39d5ff, 0, 1.47, 0.2);
    add(new THREE.CapsuleGeometry(0.1, 0.35, 2, 6), 0x3a3f6b, -0.13, 0.3, 0);
    add(new THREE.CapsuleGeometry(0.1, 0.35, 2, 6), 0x3a3f6b, 0.13, 0.3, 0);
    const g = Geo.merge(parts); g.userData.shared = true;
    CACHE.set(key, g);
    return g;
  }
  // Minimal humanoid used only if the art kit has no G.Geo.humanoid.
  function miniHumanoid(colors) {
    const group = new THREE.Group();
    const rig = new THREE.Group(); group.add(rig);
    const body = new THREE.Mesh(farGeo(colors.main, colors.accent), G.M.vc({ spec: 0.6 })); rig.add(body);
    const blob = new THREE.Mesh(E._geo('sph'), G.M.toon(colors.main, { spec: 0.9, rimStr: 0.6 })); blob.scale.set(0.38, 0.26, 0.45); blob.position.y = 0.26; blob.visible = false; group.add(blob);
    const sh = G.R.blobShadow(0.4); sh.position.y = 0.02; group.add(sh);
    const h = { group, parts: { rig, blob, shadow: sh, muzzle: null }, anim: { kick: 0 }, isBlob: false,
      setBlob(on) { h.isBlob = !!on; rig.visible = !on; blob.visible = !!on; }, kick() { }, setFlash() { }, dispose() { if (group.parent) group.parent.remove(group); } };
    return h;
  }
  function animateMini(h, state, t, dt, o) {
    if (state === 'dead') { h.anim.deadT = (h.anim.deadT || 0) + dt; const k = U.clamp(h.anim.deadT / 0.25, 0, 1); h.group.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1) { h.group.visible = false; return true; } return false; }
    h.setBlob(state === 'swim');
    h.parts.rig.position.y = (o && o.speed > 0.5) ? Math.abs(Math.sin(t * 11)) * 0.06 : 0;
    h.parts.rig.rotation.set(0, 0, 0);   // Bot._visual adds slide / dance offsets on top every frame
    return false;
  }
  // Name tag artwork (256x64 local canvas units): dark pill + team badge with a tiny robot face + name.
  // shape 'diamond' (opts.tagShape): the badge is a rounded diamond instead of a disc, so two teams differ by shape as
  // well as colour (Goo Turf: circle = Team A, diamond = Team B, like the roster pips and spawn rings).
  function drawTag(g, name, color, shape) {
    g.font = '700 26px "M PLUS Rounded 1c","Fredoka",system-ui,sans-serif';
    const tw = Math.min(176, g.measureText(name).width);
    const w = tw + 76, x0 = (256 - w) / 2;
    g.fillStyle = 'rgba(30,26,77,0.72)';
    g.beginPath(); g.moveTo(x0 + 22, 8); g.arcTo(x0 + w, 8, x0 + w, 56, 22); g.arcTo(x0 + w, 56, x0, 56, 22); g.arcTo(x0, 56, x0, 8, 22); g.arcTo(x0, 8, x0 + w, 8, 22); g.closePath(); g.fill();
    // robot badge: team-coloured disc (or diamond) with a tiny robot face
    const cx = x0 + 30, cy = 32;
    g.fillStyle = '#' + (color >>> 0).toString(16).padStart(6, '0');
    g.beginPath();
    if (shape === 'diamond') { const r = 22; g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.lineJoin = 'round'; }
    else g.arc(cx, cy, 18, 0, TAU);
    g.fill();
    g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - 10, cy - 7); g.arcTo(cx + 10, cy - 7, cx + 10, cy + 8, 4); g.arcTo(cx + 10, cy + 8, cx - 10, cy + 8, 4); g.arcTo(cx - 10, cy + 8, cx - 10, cy - 7, 4); g.arcTo(cx - 10, cy - 7, cx + 10, cy - 7, 4); g.closePath(); g.fill();
    g.fillStyle = '#1e1a4d'; g.beginPath(); g.arc(cx - 4.5, cy, 2.6, 0, TAU); g.arc(cx + 4.5, cy, 2.6, 0, TAU); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx, cy - 13); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(cx, cy - 14, 3, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
    g.fillText(name, x0 + 56, 33, 176);
  }
  function tagTexture(name, color, shape) { return G.R.canvasTex(256, 64, (g) => drawTag(g, name, color, shape)); }
  // All G.Bot name tags of a scene share ONE canvas atlas (4x16 slots of 256x64) and ONE instanced billboard
  // mesh = 1 draw call; each bot keeps an invisible Object3D (bot.tag) that is moved/hidden as before and is
  // copied into the instance buffer right before the scene renders.
  const TAG_COLS = 4, TAG_ROWS = 16, TAG_CAP = TAG_COLS * TAG_ROWS;
  const TAG_VS = [
    'attribute vec4 aUv; varying vec2 vUv;',
    'void main(){',
    '  vUv = aUv.xy + uv * aUv.zw;',
    '  vec4 mv = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0);',
    '  mv.xy += position.xy * vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));',
    '  gl_Position = projectionMatrix * mv;',
    '}'].join('\n');
  const TAG_FS = ['uniform sampler2D map; varying vec2 vUv;', 'void main(){', '  vec4 c = texture2D(map, vUv); if (c.a < 0.01) discard;', '  gl_FragColor = c;', '  #include <colorspace_fragment>', '}'].join('\n');
  function tagLayer(world) {
    const scene = world && world.scene;
    if (!scene || !G.Geo || !G.Geo.onSceneRender) return null;
    if (scene.userData.botTags) return scene.userData.botTags;
    const canvas = document.createElement('canvas'); canvas.width = 256 * TAG_COLS; canvas.height = 64 * TAG_ROWS;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2;
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: TAG_VS, fragmentShader: TAG_FS, transparent: true, depthWrite: false });
    mat.addEventListener('dispose', () => tex.dispose());
    const geo = new THREE.PlaneGeometry(1, 1);
    const uvA = new THREE.InstancedBufferAttribute(new Float32Array(TAG_CAP * 4), 4); uvA.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aUv', uvA);
    const mesh = new THREE.InstancedMesh(geo, mat, TAG_CAP);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.name = 'botTags'; mesh.frustumCulled = false; mesh.renderOrder = 9; mesh.count = 0; mesh.visible = false;
    scene.add(mesh);
    const T = scene.userData.botTags = { scene, ctx: canvas.getContext('2d'), tex, mesh, uvA, free: [], items: G.Geo._aset ? G.Geo._aset() : new Set() };
    for (let i = TAG_CAP - 1; i >= 0; i--) T.free.push(i);
    G.Geo.onSceneRender(scene, () => tagUpdate(T));
    return T;
  }
  function tagUpdate(T) {
    const a = T.mesh.instanceMatrix.array, u = T.uvA.array, items = T.items.a || Array.from(T.items);
    let n = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let vis = true, att = false;
      for (let p = it.obj; p; p = p.parent) { if (!p.visible) vis = false; if (p === T.scene) { att = true; break; } }
      if (!att || !vis) continue;
      const e = it.obj.matrixWorld.elements, k = n * 16;
      a.fill(0, k, k + 16);
      a[k] = Math.hypot(e[0], e[1], e[2]); a[k + 5] = Math.hypot(e[4], e[5], e[6]); a[k + 10] = 1;
      a[k + 12] = e[12]; a[k + 13] = e[13]; a[k + 14] = e[14]; a[k + 15] = 1;
      u[n * 4] = it.u; u[n * 4 + 1] = it.v; u[n * 4 + 2] = 1 / TAG_COLS; u[n * 4 + 3] = 1 / TAG_ROWS;
      n++;
    }
    T.mesh.count = n; T.mesh.visible = n > 0;
    if (n) { T.mesh.instanceMatrix.needsUpdate = true; T.uvA.needsUpdate = true; }
  }
  function tagAcquire(world, obj, name, color, shape) {
    const T = tagLayer(world);
    if (!T || !T.free.length) return null;
    const slot = T.free.pop(), col = slot % TAG_COLS, row = (slot / TAG_COLS) | 0, g = T.ctx;
    g.save();
    g.translate(col * 256, row * 64);
    g.clearRect(0, 0, 256, 64);
    g.translate(8, 2); g.scale(240 / 256, 60 / 64);   // 8/2 px gutters: no mip bleeding between slots
    drawTag(g, name, color, shape);
    g.restore();
    T.tex.needsUpdate = true;
    const it = { obj, slot, u: col / TAG_COLS, v: 1 - (row + 1) / TAG_ROWS, T };
    T.items.add(it);
    return it;
  }
  function tagRelease(it) { if (!it) return; it.T.items.delete(it); it.T.free.push(it.slot); }

  // ------------------------------------------------------------------ height-aware navgrid
  // G.Enemies.nav treats every collider that rises above the knees as a wall, so a bot could never plan a route
  // up a ramp onto a spawn pad, perch, castle wall or wreck deck. BotNav stores the walkable surface height of each
  // cell instead (the ground under arches and canopies, the tops of pads / ramp steps / crates) and links
  // neighbours only when the step between them is climbable (<= CLIMB, hopping above STEP) or a safe drop.
  // Ledge cells (blocked only by the body margin next to a drop) get one-way 2-cell drop links, so bots can hop
  // off pads and mesas too. Built lazily per world: 1 m cells for small arenas, 2 m for big maps.
  const NAV_CLIMB = 1.15, NAV_STEP = 0.55, NAV_DROP = 6;
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  class BotNav {
    constructor(phys) {
      this.phys = phys;
      const B = phys.bounds;
      const minX = Math.max(B.minX, -320), maxX = Math.min(B.maxX, 320), minZ = Math.max(B.minZ, -320), maxZ = Math.min(B.maxZ, 320);
      const cell = this.cell = Math.max(maxX - minX, maxZ - minZ) <= 140 ? 1 : 2;
      this.x0 = minX; this.z0 = minZ;
      const nx = this.nx = Math.max(1, Math.ceil((maxX - minX) / cell)), nz = this.nz = Math.max(1, Math.ceil((maxZ - minZ) / cell));
      const n = nx * nz;
      this.h = new Float32Array(n); this.ok = new Uint8Array(n);
      const m = this.margin = cell === 1 ? 0.5 : 0.7;
      const tmp = [];
      for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
        const k = iz * nx + ix, cx = minX + (ix + 0.5) * cell, cz = minZ + (iz + 0.5) * cell;
        const g = phys.terrain(cx, cz);
        const lo = phys.groundAt(cx, cz, 0.2, g + 0.45), hi = phys.groundAt(cx, cz, 0.2, g + 60);
        const list = phys.query(cx - m, cz - m, cx + m, cz + m, tmp);
        let y = NaN;
        if (this._clear(list, cx, cz, m, lo)) y = lo;
        else if (hi > lo + 0.3 && this._clear(list, cx, cz, m, hi)) y = hi;
        if (y === y) { this.ok[k] = 1; this.h[k] = y; } else this.h[k] = hi;
      }
      // outgoing links: bits 0..7 = 8 neighbours, bits 8..11 = 2-cell drops over a ledge (orthogonal);
      // hop bits 0..7 = that neighbour sits on a ledge we must hop up onto (ramps/slopes need no hop)
      this.link = new Uint16Array(n); this.hop = new Uint8Array(n);
      for (let k = 0; k < n; k++) {
        if (!this.ok[k]) continue;
        const ix = k % nx, iz = (k / nx) | 0, h0 = this.h[k];
        let L = 0, Hm = 0;
        for (let d = 0; d < 8; d++) {
          const x = ix + N8[d][0], z = iz + N8[d][1];
          if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
          const j = z * nx + x;
          if (!this.ok[j]) continue;
          const dh = this.h[j] - h0;
          if (-dh > NAV_DROP) continue;
          if (d >= 4) {   // diagonals need both orthogonal cells passable at a similar height
            const a = iz * nx + x, b = z * nx + ix;
            if (!this.ok[a] || !this.ok[b] || Math.abs(this.h[a] - h0) > NAV_STEP || Math.abs(this.h[b] - h0) > NAV_STEP) continue;
          }
          if (Math.abs(dh) > NAV_STEP) {
            const slope = Math.abs(dh) <= cell * 1.05 && this._slope(k, j);
            if (!slope) { if (dh > NAV_CLIMB) continue; if (dh > 0) Hm |= 1 << d; }
          }
          L |= 1 << d;
        }
        this.hop[k] = Hm;
        for (let d = 0; d < 4; d++) {
          if (L & (1 << d)) continue;
          const x1 = ix + N8[d][0], z1 = iz + N8[d][1], x2 = ix + N8[d][0] * 2, z2 = iz + N8[d][1] * 2;
          if (x2 < 0 || z2 < 0 || x2 >= nx || z2 >= nz) continue;
          const j1 = z1 * nx + x1, j2 = z2 * nx + x2;
          if (this.ok[j1] || !this.ok[j2]) continue;
          const drop = h0 - this.h[j2];
          if (drop >= 0.5 && drop <= NAV_DROP && this.h[j1] <= h0 + 0.3) L |= 1 << (8 + d);
        }
        this.link[k] = L;
      }
      // connected regions over two-way links: pockets (building interiors behind narrow doors, roofs, wall tops)
      // show up as small regions, so modes can skip loot or goals placed in them.
      const OPP = [1, 0, 3, 2, 7, 6, 5, 4];
      const comp = this.comp = new Int32Array(n).fill(-1), size = this.compSize = [];
      const stack = new Int32Array(n);
      for (let k0 = 0; k0 < n; k0++) {
        if (!this.ok[k0] || comp[k0] >= 0) continue;
        const id = size.length;
        let sp = 0, cnt = 0; stack[sp++] = k0; comp[k0] = id;
        while (sp) {
          const k = stack[--sp]; cnt++;
          const L = this.link[k], ix = k % nx, iz = (k / nx) | 0;
          for (let d = 0; d < 8; d++) {
            if (!(L & (1 << d))) continue;
            const j = (iz + N8[d][1]) * nx + ix + N8[d][0];
            if (comp[j] >= 0 || !(this.link[j] & (1 << OPP[d]))) continue;
            comp[j] = id; stack[sp++] = j;
          }
        }
        size.push(cnt);
      }
      this.g = new Float32Array(n); this.f = new Float32Array(n); this.came = new Int32Array(n);
      this.seen = new Uint32Array(n); this.shut = new Uint32Array(n); this.stamp = 0;
      this.heap = new Int32Array(n + 16); this.hn = 0;
    }
    // Is the step between neighbour cells a walkable slope (ramp) rather than a ledge? A ramp's midpoint sits halfway.
    _slope(a, b) {
      const ha = this.h[a], hb = this.h[b], mx = (this.cx(a) + this.cx(b)) / 2, mz = (this.cz(a) + this.cz(b)) / 2;
      const hm = this.phys.groundAt(mx, mz, 0.2, Math.max(ha, hb) + 0.1);
      return Math.abs(hm - (ha + hb) / 2) < Math.abs(hb - ha) * 0.3;
    }
    _clear(list, cx, cz, m, y) {
      const a = y + 0.52, b = y + 1.6;
      for (const it of list) {
        if (it.dead) continue;
        let top, bot, inside;
        if (it.k === 0) { top = it.maxy; bot = it.miny; inside = cx + m > it.minx && cx - m < it.maxx && cz + m > it.minz && cz - m < it.maxz; }
        else { top = it.y1; bot = it.y0; const dx = cx - it.x, dz = cz - it.z; inside = dx * dx + dz * dz < (it.r + m) * (it.r + m); }
        if (inside && top > a && bot < b) return false;
      }
      return true;
    }
    idx(x, z) { const ix = Math.floor((x - this.x0) / this.cell), iz = Math.floor((z - this.z0) / this.cell); if (ix < 0 || iz < 0 || ix >= this.nx || iz >= this.nz) return -1; return iz * this.nx + ix; }
    cx(k) { return this.x0 + (k % this.nx + 0.5) * this.cell; }
    cz(k) { return this.z0 + (((k / this.nx) | 0) + 0.5) * this.cell; }
    heightAt(x, z) { const k = this.idx(x, z); return k < 0 ? null : this.h[k]; }
    walkable(x, z) { const k = this.idx(x, z); return k >= 0 && this.ok[k] === 1; }
    // Region of the walkable cell nearest (x, z[, y]): {id, size} (size in cells) or null.
    region(x, z, y) { const k = this._near(x, z, y, null); return k < 0 ? null : { id: this.comp[k], size: this.compSize[this.comp[k]] || 0 }; }
    // Nearest walkable cell (ring search), preferring cells near height y when given.
    _near(x, z, y, filter) {
      const k0 = this.idx(U.clamp(x, this.x0 + 0.01, this.x0 + this.nx * this.cell - 0.01), U.clamp(z, this.z0 + 0.01, this.z0 + this.nz * this.cell - 0.01));
      if (k0 < 0) return -1;
      const good = k => this.ok[k] && (!filter || filter(this.cx(k), this.cz(k)) !== false);
      if (good(k0) && (y == null || Math.abs(this.h[k0] - y) < 0.9)) return k0;
      const ix0 = k0 % this.nx, iz0 = (k0 / this.nx) | 0;
      let best = -1, bs = Infinity;
      for (let r = 1; r <= 4; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x2 = ix0 + dx, z2 = iz0 + dz;
          if (x2 < 0 || z2 < 0 || x2 >= this.nx || z2 >= this.nz) continue;
          const k = z2 * this.nx + x2;
          if (!good(k)) continue;
          const s = Math.hypot(dx, dz) + (y == null ? 0 : Math.abs(this.h[k] - y) * 1.5);
          if (s < bs) { bs = s; best = k; }
        }
        if (best >= 0 && (y == null || bs < r + 1.5)) break;
      }
      if (best < 0 && good(k0)) best = k0;
      return best;
    }
    _push(i) { const h = this.heap, f = this.f; let k = this.hn++; h[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (f[h[p]] <= f[i]) break; h[k] = h[p]; k = p; } h[k] = i; }
    _pop() {
      const h = this.heap, f = this.f; const top = h[0]; const last = h[--this.hn];
      let k = 0; const n = this.hn;
      for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && f[h[c + 1]] < f[h[c]]) c++; if (f[h[c]] >= f[last]) break; h[k] = h[c]; k = c; }
      if (n > 0) h[k] = last;
      return top;
    }
    // A* from (sx,sz) at height sy to (gx,gz[,gy]). Returns smoothed waypoints [V3 (y = surface)] excluding the
    // start; when the goal is unreachable the route ends at the explored cell closest to it (partial path).
    findPath(sx, sz, gx, gz, maxExp, filter, sy, gy) {
      const s = this._near(sx, sz, sy, filter), t = this._near(gx, gz, gy, filter);
      if (s < 0 || t < 0) return null;
      if (s === t) return [new V3(gx, this.h[t], gz)];
      const st = ++this.stamp, nx = this.nx, cell = this.cell;
      const tx = t % nx, tz = (t / nx) | 0;
      const hfn = i => { const dx = Math.abs(i % nx - tx), dz = Math.abs(((i / nx) | 0) - tz); return dx + dz + (1.4142 - 2) * Math.min(dx, dz); };
      this.hn = 0;
      this.g[s] = 0; this.f[s] = hfn(s); this.came[s] = -1; this.seen[s] = st; this._push(s);
      let exp = 0, found = false, bestK = s, bestH = this.f[s];
      maxExp = maxExp || 2600;
      while (this.hn > 0 && exp < maxExp) {
        const cur = this._pop();
        if (this.shut[cur] === st) continue;
        this.shut[cur] = st; exp++;
        if (cur === t) { found = true; break; }
        const hc = hfn(cur); if (hc < bestH) { bestH = hc; bestK = cur; }
        const L = this.link[cur], cx = cur % nx, cz = (cur / nx) | 0, h0 = this.h[cur];
        for (let d = 0; d < 12; d++) {
          if (!(L & (1 << d))) continue;
          const mul = d >= 8 ? 2 : 1, dd = d >= 8 ? d - 8 : d;
          const j = (cz + N8[dd][1] * mul) * nx + cx + N8[dd][0] * mul;
          if (this.shut[j] === st) continue;
          if (filter && filter(this.cx(j), this.cz(j)) === false) continue;
          const hopUp = d < 8 && (this.hop[cur] & (1 << d));
          const ng = this.g[cur] + (d >= 8 ? 2.6 : dd >= 4 ? 1.4142 : 1) + (hopUp ? 2.5 + (this.h[j] - h0) : 0);
          if (this.seen[j] !== st || ng < this.g[j]) { this.seen[j] = st; this.g[j] = ng; this.f[j] = ng + hfn(j); this.came[j] = cur; this._push(j); }
        }
      }
      const closed = !found && this.hn === 0;   // explored everything reachable: we stand in a closed pocket
      const end = found ? t : bestK;
      if (end === s) { if (closed) { const o = []; o.partial = true; o.closed = true; return o; } return null; }
      const cells = [];
      for (let i = end; i >= 0 && i !== s; i = this.came[i]) cells.push(i);
      cells.reverse();
      const pts = cells.map(i => new V3(this.cx(i), this.h[i], this.cz(i)));
      if (found) { pts[pts.length - 1].x = gx; pts[pts.length - 1].z = gz; }
      // string-pull: skip waypoints we can walk to in a straight, level-enough line
      const out = [];
      let ax = sx, az = sz, ay = this.h[s], i = 0;
      while (i < pts.length) {
        let far = i;
        for (let j = Math.min(pts.length - 1, i + 8); j > i; j--) { if (this.lineOK(ax, az, ay, pts[j].x, pts[j].z, filter)) { far = j; break; } }
        out.push(pts[far]); ax = pts[far].x; az = pts[far].z; ay = pts[far].y; i = far + 1;
      }
      out.partial = !found; out.closed = closed;
      return out;
    }
    // Straight walk check: every sampled cell walkable, neighbour cells linked without a hop (ramps are fine),
    // no drop > 1.2 m, and no thin wall across a level stretch.
    lineOK(ax, az, ay, bx, bz, filter) {
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      if (L < 0.05) return true;
      const n = Math.max(1, Math.ceil(L / (this.cell * 0.5)));
      let kp = this.idx(ax, az);
      let ph = kp >= 0 && this.ok[kp] && (ay == null || Math.abs(this.h[kp] - ay) < 0.8) ? this.h[kp] : ay, hmax = ph, hmin = ph;
      for (let i = 1; i <= n; i++) {
        const t = i / n, x = ax + dx * t, z = az + dz * t, k = this.idx(x, z);
        if (k < 0 || !this.ok[k]) return false;
        if (k === kp) continue;
        const h = this.h[k];
        if (ph != null) {
          const ddx = (k % this.nx) - (kp % this.nx), ddz = ((k / this.nx) | 0) - ((kp / this.nx) | 0);
          let d = -1; for (let q = 0; q < 8; q++) if (N8[q][0] === ddx && N8[q][1] === ddz) { d = q; break; }
          if (kp >= 0 && this.ok[kp] && d >= 0) { if (!(this.link[kp] & (1 << d)) || (this.hop[kp] & (1 << d)) || ph - h > 1.2) return false; }
          else if (h - ph > NAV_STEP || ph - h > 1.2) return false;
        }
        if (filter && filter(x, z) === false) return false;
        kp = k; ph = h; if (h > hmax) hmax = h; if (h < hmin) hmin = h;
      }
      if (hmax - hmin < 0.6) {
        const y = hmax + 0.9, nxv = dx / L, nzv = dz / L;
        if (this.phys.rayHit(ax, y, az, nxv, 0, nzv, L, true)) return false;
      }
      return true;
    }
  }
  function botNav(world) {
    if (!world) return null;
    if (!world._botNav) world._botNav = new BotNav(world.phys);
    return world._botNav;
  }
  function itemTop(it) { return !it ? Infinity : it.k === 0 ? it.maxy : it.y1; }

  // ------------------------------------------------------------------ fallback weapon (no G.Weapons)
  function fallbackWeapon(owner) {
    const w = {
      def: { id: 'botblaster', range: 30 }, level: 1, ammo: Infinity, maxAmmo: 0, cd: 0,
      update(dt, ctx) {
        this.cd -= dt;
        if (!ctx.firing || this.cd > 0) return;
        if (owner.ink !== undefined) { if (owner.ink < 2) return; owner.ink -= 2; owner.inkRefillT = 0.4; }
        this.cd = 0.2;
        const dir = _f.copy(ctx.dir); dir.x += U.rand(-0.02, 0.02); dir.y += U.rand(-0.01, 0.01); dir.z += U.rand(-0.02, 0.02); dir.normalize();
        ctx.world.projectiles.spawn({ pos: ctx.origin, dir: dir.clone(), speed: 55, damage: 18 * (owner.damageMult || 1), src: owner, team: owner.team, color: owner.colors.main, size: 0.12, kind: 'bolt', life: 1.2 });
        if (owner.onFired) owner.onFired(0.01, 0.03, 0);
        if (G.Audio) G.Audio.sfxAt('blaster', owner.pos, { vol: 0.6 });
      },
      idle(dt) { this.cd -= dt; },
    };
    return w;
  }

  // ------------------------------------------------------------------ Bot
  const WHISK = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5];
  const EDGE = [30, 60, 220], NO_OPTS = {};   // LOD distances (m); empty anim opts (KO pop)
  // weapon tick without a per-frame closure (G.safe(label, () => ...) allocated one per weapon per frame)
  function wUpdate(w, dt, ctx) { try { w.update(dt, ctx); } catch (e) { console.error('[bot weapon]', e); G.bus.emit('error', 'bot weapon', e); } }
  function wIdle(w, dt) { try { w.idle(dt); } catch (e) { console.error('[bot weapon]', e); G.bus.emit('error', 'bot weapon', e); } }
  class Bot extends G.Actor {
    constructor(world, opts) {
      opts = opts || {};
      super(world, { r: 0.4, h: 1.7, team: opts.team != null ? opts.team : 1, hp: opts.hp != null ? opts.hp : 100, shield: opts.shield || 0, kind: 'bot' });
      this.opts = opts;
      this.isBot = true; this.isRanger = true;
      this.critY = 1.4; this.step = 0.5;
      const main = opts.colors && opts.colors.main != null ? opts.colors.main : TEAM_COLORS[((this.team % TEAM_COLORS.length) + TEAM_COLORS.length) % TEAM_COLORS.length];
      this.colors = Object.assign({ main, accent: 0xf3faff, dark: 0x3a3f6b, visor: null }, opts.colors || {});
      this.name = opts.name || randomName();
      this.diff = E.difficulty(opts.difficulty);
      this.skillOpt = opts.skill;
      const pl = world.player;
      this.damageMult = (!pl || pl.team !== this.team) ? (this.diff.botDmg || 1) : 1;
      // visuals
      this.mesh = new THREE.Group();
      // explicit helmet / build seed: the mode's slot (opts.seed or colors.seed), else a hash of the name, so a ranger
      // looks the same whatever order the bots were spawned in (G.Geo.humanoid's own fallback counts spawns)
      const seed = opts.seed != null ? opts.seed : this.colors.seed != null ? this.colors.seed : nameSeed(this.name);
      this.hum = (G.Geo && G.Geo.humanoid && G.safe('bot humanoid', () => G.Geo.humanoid(this.colors, { seed }))) || miniHumanoid(this.colors);
      this.animFn = G.Geo && G.Geo.humanoid && this.hum.anim && this.hum.anim.morphT != null ? G.Geo.animateHumanoid : animateMini;
      this.critY = (this.hum && this.hum.critY) || 1.4;   // head-crit line follows the model (1.45 m on the art kit's rangers)
      this.mesh.add(this.hum.group);
      this.far = new THREE.Mesh(farGeo(this.colors.main, this.colors.accent), G.M.vc({ spec: 0.5 }));
      this.far.visible = false; this.mesh.add(this.far);
      this.tag = null; this.tagTex = null; this._tagIt = null;
      if (opts.nameTag !== false) {
        const proxy = new THREE.Object3D(); proxy.name = 'nameTag';
        this._tagIt = tagAcquire(world, proxy, this.name, this.colors.main, opts.tagShape);
        if (this._tagIt) this.tag = proxy;
        else {   // atlas full / unavailable: own sprite (1 draw call)
          this.tagTex = tagTexture(this.name, this.colors.main, opts.tagShape);
          this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tagTex, transparent: true, depthWrite: false }));
        }
        this.tag.scale.set(1.7, 0.425, 1); this.tag.position.y = 2.15; this.tag.renderOrder = 9;
        this.mesh.add(this.tag);
      }
      this.lod = -1;
      // rendered facing (critically damped spring on the sim yaw; NaN = snap on the first frame), reused anim opts,
      // eased slide / dance offsets
      this._vyaw = { x: NaN, v: 0, t: 0, f: 2.9, z: 1 };
      this._ho = { speed: 0, expr: undefined, vx: 0, vz: 0, vy: 0, yaw: 0, turn: 0, grounded: true, detail: 1 };
      this._slideK = 0; this._danceK = 0; this._dk = 1;
      this._wctx = { world, owner: this, firing: false, fireP: false, eye: null, eyeDir: null, origin: null, dir: null, aimPoint: null, target: null, team: this.team };
      // weapons
      this.weapons = []; this.wi = 0;
      const wl = opts.weapons || (opts.weapon ? [opts.weapon] : null);
      if (wl && wl.length) this.setWeapons(wl);
      else if (!opts.royale) this.setWeapons(['fizz']);
      // ai state
      this.goal = opts.goal || null; this.onThink = opts.onThink || null;
      this.target = null; this.autoTarget = opts.autoTarget !== false; this.hasLOS = false; this.lastSeen = new V3(); this.lastSeenT = -99;
      this.yaw = opts.yaw != null ? opts.yaw : Math.random() * TAU; this.aimYaw = this.yaw; this.aimPitch = 0;
      this.speedMod = 1; this.holdFire = false; this.firing = false; this._wasFiring = false;
      if (opts.ink != null) { this.ink = opts.ink; this.inkRefillT = 0; this.lastInkT = -9; }
      this.swimming = false; this.canSwimAt = opts.canSwimAt || null;
      this.kills = 0; this.damageDealt = 0;
      this.removeOnKO = opts.removeOnKO != null ? !!opts.removeOnKO : !!opts.royale;
      this.regen = opts.regen || null;
      this.fleeHp = opts.fleeHp != null ? opts.fleeHp : 0.3;
      this.engageRange = opts.engageRange || 0;
      this.thinkT = Math.random() * 0.25;
      this.reactT = 0.5; this.trackT = 0; this.errT = 0; this.err = new V3(); this.lastTgt = null;
      this.burstT = 0; this.strafeDir = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0; this.pauseT = 0;
      this.retreatT = 0; this.slideT = 0; this.slideCd = 0; this.jumpCd = 0;
      this.stuckT = 0; this.sideT = 0; this.sideDir = 1;
      this.avoidAng = 0; this.path = null; this.pathI = 0; this.pathGoal = new V3(); this.pathT = 0; this.wantPath = false;
      this.wander = new V3(); this.wanderT = 0;
      this.hurtT = 0; this.koT = 0; this.lastAttacker = null;
      this.moveDirX = 0; this.moveDirZ = 0;
      this.safePos = new V3();
      // fields update() / _aimAndFire() / _steerTo() would otherwise add on the fly (one hidden class for every bot;
      // values read exactly like "not set yet")
      this._hop = false; this._painting = false; this._sprint = false; this.hidden = false; this._skill = null;
      this._aimP = null; this._pd = null; this._cand = null; this._candD = null; this._walkF = null;
      this._stX = 0; this._stZ = 0; this._stT = -1e9; this._noNavT = 0; this._stuckN = 0; this._stuckLastT = -99;
      if (opts.pos) { this.pos.copy(opts.pos); this.pos.y = world.phys.groundAt(opts.pos.x, opts.pos.z, 0.3, opts.pos.y + 2); }
      this.safePos.copy(this.pos);
      this.mesh.position.copy(this.pos);
    }
    get weapon() { return this.weapons[this.wi] || null; }
    get sprinting() { return this._sprint || false; }
    aimPoint(out) { return (out || new V3()).set(this.pos.x, this.pos.y + (this.swimming ? 0.25 : 1.05), this.pos.z); }
    eyePos(out) { return out.set(this.pos.x, this.pos.y + (this.swimming ? 0.4 : 1.45), this.pos.z); }
    forward(out) { const cp = Math.cos(this.aimPitch); return out.set(-Math.sin(this.aimYaw) * cp, Math.sin(this.aimPitch), -Math.cos(this.aimYaw) * cp); }
    onFired(kick) { if (this.hum && this.hum.kick) this.hum.kick(Math.min(1, 0.5 + (kick || 0) * 10)); }
    setWeapons(list) {
      const cur = this.weapon;
      const out = [];
      for (const w of list || []) {
        if (!w) continue;
        if (typeof w === 'object' && typeof w.update === 'function') { out.push(w); continue; }
        const id = typeof w === 'string' ? w : w.id;
        let inst = null;
        if (G.Weapons && G.Weapons.create) inst = G.safe('bot weapon', () => G.Weapons.create(id, (w && w.level) || 1, (w && w.mods) || [], this, w && w.opts));
        out.push(inst || fallbackWeapon(this));
      }
      if (!out.length && !this.opts.royale) out.push(fallbackWeapon(this));
      this.weapons = out;
      const ci = out.indexOf(cur);
      this.wi = ci >= 0 ? ci : 0;
    }
    equip(i) {
      if (!this.weapons.length) return;
      i = ((i % this.weapons.length) + this.weapons.length) % this.weapons.length;
      if (i === this.wi) return;
      const old = this.weapon; if (old && old.onUnequip) G.safe('bot unequip', () => old.onUnequip());
      this.wi = i;
      const nw = this.weapon; if (nw && nw.onEquip) G.safe('bot equip', () => nw.onEquip());
    }
    skill() {
      let s = this.skillOpt;
      if (s == null && this.royEnt && this.royEnt.skill) s = this.royEnt.skill;
      const d = this.diff;
      if (s && typeof s === 'object') {
        return { aimErr: s.aimErr != null ? s.aimErr : d.aim, react: s.react != null ? s.react : d.react, turn: s.turn || 7, strafe: s.strafe != null ? s.strafe : 0.8, burst: s.burst || 1.4, engage: s.engage || 32 };
      }
      let k = SKILLS.medium;
      if (typeof s === 'string' && SKILLS[s]) k = SKILLS[s];
      if (typeof s === 'number') { const t = U.clamp(s, 0, 1); k = { err: U.lerp(1.6, 0.7, t), react: U.lerp(1.3, 0.75, t), turn: U.lerp(4.5, 9, t), strafe: U.lerp(0.5, 1, t), burst: U.lerp(0.9, 2.2, t), engage: U.lerp(26, 40, t) }; }
      return { aimErr: d.aim * k.err, react: d.react * k.react, turn: k.turn, strafe: k.strafe, burst: k.burst, engage: k.engage };
    }
    weaponRange() { const w = this.weapon; return (w && w.def && w.def.range) || 30; }

    // ---------------- perception / decisions (~4 Hz)
    _pickTarget() {
      const w = this.world;
      const eye = this.eyePos(_a);
      const sense = Math.max(60, this.engageRange || 0);
      // three nearest candidates (biased toward the current target and a recent attacker), then LOS in order
      const c = this._cand || (this._cand = [null, null, null]), cd = this._candD || (this._candD = [0, 0, 0]);
      c[0] = c[1] = c[2] = null;
      for (const o of w.actors) {
        if (o === this || !o.alive || !o.targetable || o.team === this.team || o.isCrate || o.isBossPart || o.noAssist) continue;
        let d = o.pos.distanceTo(this.pos);
        if (o.hidden && !o.isPlayer && d > 5) continue;
        if (d > sense) continue;
        if (o === this.lastAttacker && w.time - this.lastHitT < 3) d -= 12;
        if (o === this.target) d -= 4;
        for (let i = 0; i < 3; i++) {
          if (!c[i] || d < cd[i]) { for (let j = 2; j > i; j--) { c[j] = c[j - 1]; cd[j] = cd[j - 1]; } c[i] = o; cd[i] = d; break; }
        }
      }
      let best = null, vis = false;
      for (let i = 0; i < 3 && c[i]; i++) {
        if (w.phys.los(eye, c[i].aimPoint(_b), false)) { best = c[i]; vis = true; break; }
      }
      if (!best) best = c[0];
      this.target = best;
      this.hasLOS = vis;
    }
    _think() {
      const w = this.world;
      if (this.onThink) G.safe('bot onThink', () => this.onThink(this));
      if (this.autoTarget) this._pickTarget();
      else if (this.target && this.target.alive) this.hasLOS = w.phys.los(this.eyePos(_a), this.target.aimPoint(_b), false);
      else this.hasLOS = false;
      if (this.target && this.hasLOS) { this.lastSeen.copy(this.target.pos); this.lastSeenT = w.time; }
      // low health retreat (when the mode did not ask for a fight)
      const frac = (this.hp + this.shield) / Math.max(1, this.maxHp + this.maxShield);
      const g = this.goal;
      if (frac < this.fleeHp && this.target && this.hasLOS && (!g || g.type !== 'attack') && this.retreatT <= 0) this.retreatT = U.rand(2, 3.5);
      if (this.ink !== undefined && this.ink < 20 && this.retreatT <= 0 && (!g || g.type !== 'attack')) this.retreatT = 1.5;
      // whiskers for current move direction
      const ml = Math.hypot(this.moveDirX, this.moveDirZ);
      // whisker length: never look past where we are going (loot lying against a wall is not an obstacle)
      const gd = this._stT != null && w.time - this._stT < 0.35 ? Math.hypot(this._stX - this.pos.x, this._stZ - this.pos.z) : 9;
      if (ml > 0.1) { const a = this._whisker(this.moveDirX / ml, this.moveDirZ / ml, U.clamp(gd - 0.3, 0.45, 1.6)); if (a === null) { this.wantPath = true; this.avoidAng = 1.3 * this.sideDir; } else this.avoidAng = a; }
      else this.avoidAng = 0;
      // plan a route as soon as the straight line to where we are heading is not walkable (ledges, ramps, walls)
      if (!this.wantPath && this._stT != null && w.time - this._stT < 0.35 && !((this._noNavT || 0) > w.time)) {
        const gx = this._stX, gz = this._stZ;
        const following = this.path && this.pathT > 0 && Math.hypot(this.pathGoal.x - gx, this.pathGoal.z - gz) < 5;
        if (!following && Math.hypot(gx - this.pos.x, gz - this.pos.z) > 2.5 && !this._lineClear(gx, gz)) this.wantPath = true;
      }
      if (this.path && this.pathI < this.path.length) this.avoidAng *= 0.5;   // on a planned route: trust it more than the whiskers
      // strafe rhythm
      const sk = this.skill();
      this.strafeT -= 0.25;
      if (this.strafeT <= 0) { this.strafeT = U.rand(0.8, 2.2); this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.pauseT = Math.random() < 0.25 ? 0.5 : 0; }
      // combat hops / slides
      if (this.target && this.hasLOS && this.grounded && !this.swimming && this.jumpCd <= 0 && Math.random() < 0.07 * sk.strafe) this._jump();
      this._skill = sk;
    }
    _whisker(dx, dz, L) {
      const ph = this.world.phys, y = this.pos.y + 0.8;
      L = L || 1.6;
      const pref = this.avoidAng >= 0 ? 1 : -1;
      for (let i = 0; i < WHISK.length; i++) {
        const a = WHISK[i] * pref;
        const c = Math.cos(a), s = Math.sin(a);
        const h = ph.raycast(this.pos.x, y, this.pos.z, dx * c + dz * s, 0, -dx * s + dz * c, L, true);
        // steep ramp steps and crates we can hop onto are not walls
        if (!h || h.ny > 0.6 || itemTop(h.item) <= this.pos.y + NAV_CLIMB) return a;
      }
      return null;
    }
    // Is the straight line to (gx, gz) walkable for us? (height-aware navgrid + mode walkable hook)
    _lineClear(gx, gz) {
      const nav = botNav(this.world);
      if (!nav) return true;
      return nav.lineOK(this.pos.x, this.pos.z, this.pos.y, gx, gz, this.walkable ? this._walkF || (this._walkF = (x, z) => this.walkable(x, z)) : null);
    }
    _jump(v) {
      if (!this.grounded || this.swimming) return;
      this.vel.y = v || 7.2; this.grounded = false; this.jumpCd = U.rand(0.9, 1.8);
      if (G.Audio && this.world.player && this.pos.distanceTo(this.world.player.pos) < 20) G.Audio.sfxAt('jump', this.pos, { vol: 0.5 });
    }
    // world-space wish direction toward a point (whiskers + navgrid when blocked); returns distance
    _walkFn() { return this._walkF || (this._walkF = (x, z) => this.walkable(x, z)); }
    _steerTo(gx, gz, out, gy) {
      let dx = gx - this.pos.x, dz = gz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) { out.set(0, 0, 0); return d; }
      const now = this.world.time;
      this._stX = gx; this._stZ = gz; this._stT = now;
      this.pathT -= 0.016;
      const s = E.sys(this.world);
      if (this.wantPath && (this._noNavT || 0) > now) this.wantPath = false;
      if (this.wantPath && s.pathBudget > 0 && (!this.path || Math.hypot(this.pathGoal.x - gx, this.pathGoal.z - gz) > 3 || this.pathT <= 0)) {
        s.pathBudget--; this.wantPath = false;
        const nav = botNav(this.world), walk = this.walkable ? this._walkFn() : null;
        this.path = nav ? G.safe('bot path', () => nav.findPath(this.pos.x, this.pos.z, gx, gz, 2600, walk, this.pos.y, gy)) || null : null;
        this.pathI = 0; this.pathGoal.set(gx, 0, gz);
        // unreachable goals give a partial route: follow it longer before asking again (A* is not free)
        this.pathT = (this.path && this.path.partial ? 8 : 4) + Math.min(6, d * 0.08);
        // standing in a pocket the grid cannot leave (narrow doorway, odd prop pile): steer by feel for a while
        if (this.path && this.path.closed) { this.path = null; this._noNavT = now + 5; }
      }
      let up = false;
      if (this.path && this.pathT > 0 && Math.hypot(this.pathGoal.x - gx, this.pathGoal.z - gz) < 5) {
        let wp = this.path[this.pathI];
        while (wp && Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z) < 0.9 && Math.abs(wp.y - this.pos.y) < 1.0 && this.pathI < this.path.length - 1) wp = this.path[++this.pathI];
        if (wp) { dx = wp.x - this.pos.x; dz = wp.z - this.pos.z; up = wp.y > this.pos.y + 0.45; }
      } else if (this.path) this.path = null;
      const l = Math.hypot(dx, dz) || 1;
      out.set(dx / l, 0, dz / l);
      // hop up onto a crate / ledge right in front of us (ramps rise in small steps and need no hop)
      if ((up || this.hitWall) && this.grounded) {
        const ph = this.world.phys, ahead = ph.groundAt(this.pos.x + out.x * 0.75, this.pos.z + out.z * 0.75, 0.2, this.pos.y + NAV_CLIMB + 0.2);
        if (ahead > this.pos.y + this.step && ahead <= this.pos.y + NAV_CLIMB + 0.2) this._hop = true;
      }
      return d;
    }
    // ---------------- per-frame
    update(dt) {
      const w = this.world;
      this.applyStatus(dt);
      if (!this.alive) { this._koUpdate(dt); return; }
      this.hurtT -= dt; this.jumpCd -= dt; this.slideCd -= dt; this.retreatT -= dt; this.sideT -= dt;
      const stunned = this.stunT > 0 || this.dancing || this.planted || this.frozen;
      // regen + ink
      const R = this.regen;
      if (R && w.time - this.lastHitT > (R.delay || 1)) this.hp = Math.min(this.maxHp, this.hp + (this.swimming ? (R.swimRate || R.rate * 3) : R.rate) * dt);
      if (this.ink !== undefined) {
        if (this.inkRefillT > 0) this.inkRefillT -= dt;
        else this.ink = Math.min(100, this.ink + (this.swimming ? 35 : 10) * dt);
      }
      this.thinkT -= dt;
      if (this.thinkT <= 0) { this.thinkT = 0.22 + Math.random() * 0.06; this._think(); }
      // ---- movement intent
      let mx = 0, mz = 0, spd = 0;
      this._hop = false;
      const g = this.goal, t = this.target && this.target.alive ? this.target : null;
      const sk = this._skill || this.skill();
      let fightTarget = null;
      if (!stunned) {
        const engage = this.engageRange || sk.engage || 32;
        if (this.retreatT > 0 && t) {
          // back away from the threat (and dive if we can)
          _a.set(this.pos.x - t.pos.x, 0, this.pos.z - t.pos.z).normalize();
          mx = _a.x + -_a.z * this.strafeDir * 0.4; mz = _a.z + _a.x * this.strafeDir * 0.4; spd = 6.4;
          if (t.pos.distanceTo(this.pos) < 9 && this.hasLOS) fightTarget = t;
        } else if (g && g.type === 'attack' && g.target && g.target.alive) {
          fightTarget = g.target;
          if (!this.autoTarget || !t) this.target = g.target;
          const r = this._fightMove(g.target, g.range || U.clamp(this.weaponRange() * 0.5, 6, 22), sk);
          mx = r.x; mz = r.z; spd = r.y;
        } else if (g && g.type === 'flee' && g.from) {
          const f = g.from.pos || g.from;
          _a.set(this.pos.x - f.x, 0, this.pos.z - f.z); const l = Math.hypot(_a.x, _a.z) || 1; mx = _a.x / l; mz = _a.z / l;
          if (g.pos) { this._steerTo(g.pos.x, g.pos.z, _b); mx = mx * 0.5 + _b.x * 0.5; mz = mz * 0.5 + _b.z * 0.5; }
          spd = 6.8;
          if (t && this.hasLOS && t.pos.distanceTo(this.pos) < 7) fightTarget = t;
        } else if (g && (g.type === 'moveTo' || g.type === 'loot') && g.pos) {
          let d = this._steerTo(g.pos.x, g.pos.z, _a, g.type === 'loot' ? g.pos.y : undefined);
          // the goal cannot be reached (inside a building, on a roof): the end of the partial route is as close as it gets
          const P = this.path;
          if (P && P.partial && P.length && this.pathI >= P.length - 1 && Math.hypot(P[P.length - 1].x - this.pos.x, P[P.length - 1].z - this.pos.z) < 1.2) d = 0;
          if (d > (g.r || 0.7)) { mx = _a.x; mz = _a.z; spd = g.sprint || d > 25 ? 7.0 : 5.2; if (d < 3) spd *= Math.max(0.35, d / 3); }
          else if (g.type === 'moveTo') g.done = true;
          if (t && this.hasLOS && t.pos.distanceTo(this.pos) < engage && !g.passive) fightTarget = t;
        } else if (g && g.type === 'paint' && g.area) {
          if (t && this.hasLOS && t.pos.distanceTo(this.pos) < Math.min(engage, this.weaponRange() * 1.1)) {
            fightTarget = t; const r = this._fightMove(t, U.clamp(this.weaponRange() * 0.5, 5, 14), sk); mx = r.x; mz = r.z; spd = r.y;
          } else {
            this.wanderT -= dt;
            const A = g.area;
            if (this.wanderT <= 0 || Math.hypot(this.wander.x - this.pos.x, this.wander.z - this.pos.z) < 1.5) {
              this.wanderT = U.rand(2, 4);
              // pick a spot we may and can stand on (not a forbidden zone, wall top or roof)
              const nav = botNav(w);
              for (let tries = 0; tries < 6; tries++) {
                if (A.r != null) { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * A.r; this.wander.set(A.x + Math.cos(a) * rr, 0, A.z + Math.sin(a) * rr); }
                else this.wander.set(U.rand(A.minX, A.maxX), 0, U.rand(A.minZ, A.maxZ));
                const x = this.wander.x, z = this.wander.z;
                if (this.walkable && !this._walkAt(x, z)) continue;
                const h = nav ? nav.heightAt(x, z) : null;
                if (nav && (!nav.walkable(x, z) || h > this.pos.y + 3.2)) continue;
                break;
              }
            }
            this._steerTo(this.wander.x, this.wander.z, _a); mx = _a.x; mz = _a.z; spd = 4.6;
            this._painting = true;
          }
        } else if (t) {
          // default: hunt the nearest rival
          if (this.hasLOS && t.pos.distanceTo(this.pos) < engage) { fightTarget = t; const r = this._fightMove(t, U.clamp(this.weaponRange() * 0.5, 6, 18), sk); mx = r.x; mz = r.z; spd = r.y; }
          else { const p = this.hasLOS || w.time - this.lastSeenT > 8 ? t.pos : this.lastSeen; this._steerTo(p.x, p.z, _a); mx = _a.x; mz = _a.z; spd = 5.6; }
        }
        if (g && g.type !== 'paint') this._painting = false;
        if (!g) this._painting = false;
      }
      this.moveDirX = mx; this.moveDirZ = mz;
      // avoidance rotation + stuck side-step
      let ang = this.avoidAng + (this.sideT > 0 ? this.sideDir * 1.15 : 0);
      if (ang !== 0 && (mx || mz)) { const c = Math.cos(ang), s = Math.sin(ang); const nx = mx * c + mz * s; mz = -mx * s + mz * c; mx = nx; }
      // optional mode hook: keep off unwalkable ground (sea, hazards) by probing 3 m ahead
      if (this.walkable && (mx || mz) && !this._walkOk(mx, mz)) {
        if (this._walkOk(-mz, mx)) { const t0 = mx; mx = -mz; mz = t0; }
        else if (this._walkOk(mz, -mx)) { const t0 = mx; mx = mz; mz = -t0; }
        else { mx = -mx; mz = -mz; }
      }
      // swimming (turf): dive on own goo when travelling or fleeing
      if (this.canSwimAt && !stunned) {
        const want = (spd > 5 && !fightTarget) || this.retreatT > 0 || (this.ink !== undefined && this.ink < 20);
        const ok = G.safe('canSwimAt', () => this.canSwimAt(this.pos.x, this.pos.z)) && this.grounded;
        this.swimming = !!(want && ok);
      }
      if (this.swimming) { spd = spd > 0 ? 10 : 0; this.hidden = true; } else if (this.hidden && !this.opts.hidden) this.hidden = false;
      // slide when sprinting into a fight
      if (!this.swimming && this.grounded && spd >= 6.4 && this.slideCd <= 0 && fightTarget && Math.random() < 0.01) { this.slideT = 0.7; this.slideCd = 2.5; if (G.Audio && w.player && this.pos.distanceTo(w.player.pos) < 18) G.Audio.sfxAt('slide', this.pos, { vol: 0.5 }); }
      if (this.slideT > 0) { this.slideT -= dt; spd = Math.max(spd, 9 * (this.slideT / 0.7) + 4); this.h = 1.05; } else this.h = this.swimming ? 0.6 : 1.7;
      this._sprint = spd >= 6.5;
      spd *= this.speedMod * (this.slowT > 0 ? this.slowK || 1 : 1) * (this.royEnt && this.royEnt.healing ? 0.6 : 1);
      // ---- physics
      const v = this.vel;
      const k = this.grounded ? Math.min(1, 12 * dt) : Math.min(1, 2.5 * dt);
      v.x += (mx * spd - v.x) * k; v.z += (mz * spd - v.z) * k;
      if (this._hop && this.grounded && !this.swimming && this.jumpCd <= 0 && spd > 0.5) this._jump(7.4);
      if (this.grounded && spd > 0.5 && this.hitWall) {
        this.stuckT += dt;
        if (this.stuckT > 0.18 && this.jumpCd <= 0) this._jump();
        if (this.stuckT > 0.7) {
          this.sideT = 0.9; this.sideDir = Math.random() < 0.5 ? -1 : 1; this.stuckT = 0; this.wantPath = true; this.pathT = 0;
          // stuck again and again on a planned route: the grid is wrong here, fall back to whiskers for a while
          this._stuckN = w.time - (this._stuckLastT || -99) < 4 ? (this._stuckN || 0) + 1 : 1; this._stuckLastT = w.time;
          if (this._stuckN >= 3) { this._noNavT = w.time + 4; this.path = null; this.wantPath = false; this._stuckN = 0; }
        }
      } else if (!this.hitWall) this.stuckT = Math.max(0, this.stuckT - dt);
      v.y -= (v.y > 0 ? 20 : 27) * dt; if (v.y < -28) v.y = -28;
      w.phys.moveBody(this, dt);
      if (this.grounded) this.safePos.copy(this.pos);
      if (this.fell) { this.pos.copy(this.safePos); this.pos.y += 0.5; v.set(0, 0, 0); }
      // ---- aim + fire
      this._aimAndFire(dt, fightTarget, stunned, sk);
      this._visual(dt, stunned);
      this._wasFiring = this.firing;
    }
    _walkOk(dx, dz) { try { return this.walkable(this.pos.x + dx * 3, this.pos.z + dz * 3) !== false; } catch (e) { return true; } }
    _walkAt(x, z) { try { return this.walkable(x, z) !== false; } catch (e) { return true; } }
    // Returns V3(x=dirX, z=dirZ, y=speed) for fighting at a preferred range with strafing.
    _fightMove(tgt, pref, sk) {
      const dx = tgt.pos.x - this.pos.x, dz = tgt.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      const nx = dx / d, nz = dz / d;
      const radial = !this.hasLOS ? 1 : d > pref + 3 ? 1 : d < pref - 3 ? -0.8 : 0;
      this.pauseT -= 0.016;
      const side = this.pauseT > 0 ? 0 : this.strafeDir * (sk ? sk.strafe : 0.8);
      let wx = nx * radial - nz * side, wz = nz * radial + nx * side;
      const l = Math.hypot(wx, wz);
      if (l < 0.01) return _e.set(0, 0, 0);
      if (!this.hasLOS) { this._steerTo(tgt.pos.x, tgt.pos.z, _d); wx = _d.x; wz = _d.z; return _e.set(wx, 5.4, wz); }
      return _e.set(wx / l, radial > 0 ? 5.4 : 4.4, wz / l);
    }
    _aimAndFire(dt, fightTarget, stunned, sk) {
      const w = this.world;
      const tgt = fightTarget || (this.target && this.target.alive && this.hasLOS ? this.target : null);
      this.firing = false;
      const wpn = this.weapon;
      if (tgt && !stunned && !this.swimming) {
        const dist = this.pos.distanceTo(tgt.pos);
        if (tgt !== this.lastTgt) { this.lastTgt = tgt; this.reactT = sk.react * U.rand(0.8, 1.25); this.trackT = 0; this.errT = 0; }
        this.trackT += dt;
        this.errT -= dt;
        if (this.errT <= 0) {
          this.errT = U.rand(0.28, 0.55);
          const settle = U.lerp(2.0, 1.0, U.clamp(this.trackT / 1.6, 0, 1));
          const err = sk.aimErr * DEG * settle * (tgt.isPlayer ? 1 : 0.9);
          const mag = Math.tan(err) * dist * U.rand(0.25, 1.1);
          this.err.set(U.rand(-1, 1), U.rand(-0.5, 0.5), U.rand(-1, 1)).normalize().multiplyScalar(mag);
        }
        tgt.aimPoint(_b).add(this.err);
        // lead moving targets by the projectile's flight time (hitscan needs none); strong bots lead more fully
        const st = wpn ? (wpn.st || wpn.s || wpn.def || {}) : {};
        const pv = st.speed || 0, pg = st.gravity != null ? st.gravity : (st.grav || 0);
        if (tgt.vel && pv > 0) _b.addScaledVector(tgt.vel, Math.min(1.1, dist / pv) * U.clamp(sk.turn / 9, 0.35, 1));
        this.eyePos(_a);
        const dx = _b.x - _a.x, dy = _b.y - _a.y, dz = _b.z - _a.z, hd = Math.hypot(dx, dz);
        const wantYaw = Math.atan2(-dx, -dz);
        let wantPitch = Math.atan2(dy, hd);
        // arcing goo / grenades: solve the low ballistic arc (throwables add their own launch pitch)
        if (pv > 0 && pg > 0 && hd > 0.5) {
          const v2 = pv * pv, disc = v2 * v2 - pg * (pg * hd * hd + 2 * dy * v2);
          wantPitch = (disc > 0 ? Math.atan((v2 - Math.sqrt(disc)) / (pg * hd)) : Math.PI / 4) - (st.pitch || 0) * DEG;
        }
        this.aimYaw = U.angleDamp(this.aimYaw, wantYaw, sk.turn, dt);
        this.aimPitch = U.damp(this.aimPitch, wantPitch, sk.turn, dt);
        this.reactT -= dt;
        const off = Math.abs(U.wrapAngle(this.aimYaw - wantYaw)) + Math.abs(this.aimPitch - wantPitch);
        const range = wpn && wpn.def ? (wpn.def.range || 40) * 1.15 : 40;
        this.burstT -= dt;
        if (this.burstT < -U.rand(0.3, 0.7)) this.burstT = sk.burst * U.rand(0.7, 1.3);
        if (!this.holdFire && this.reactT <= 0 && off < 0.3 && dist < range && this.burstT > 0) this.firing = true;
        this.yaw = U.angleDamp(this.yaw, this.aimYaw, 10, dt);
      } else {
        this.reactT = Math.max(this.reactT, 0.2);
        this.lastTgt = tgt;
        const hs = Math.hypot(this.vel.x, this.vel.z);
        if (hs > 0.6) { this.yaw = U.angleDamp(this.yaw, Math.atan2(-this.vel.x, -this.vel.z), 8, dt); this.aimYaw = this.yaw; }
        this.aimPitch = U.damp(this.aimPitch, this._painting ? -0.35 : 0, 4, dt);
        // painting: spray the floor ahead while wandering
        if (this._painting && !this.holdFire && !this.swimming && !stunned && (this.ink === undefined || this.ink > 25)) this.firing = true;
      }
      for (let i = 0; i < this.weapons.length; i++) {
        const wi = this.weapons[i];
        if (i === this.wi) wUpdate(wi, dt, this._ctx(this.firing, tgt));
        else if (wi.idle) wIdle(wi, dt);
      }
    }
    // Weapon ctx (same shape the player passes). One object per bot, refilled each frame — weapons read it during
    // update() and keep only copies, so reuse is safe and saves a per-frame allocation per bot.
    _ctx(firing, tgt) {
      const eye = this.eyePos(_c);
      const dir = this.forward(_d);
      const right = _e.set(Math.cos(this.aimYaw), 0, -Math.sin(this.aimYaw));
      const origin = _f.copy(eye).addScaledVector(dir, 0.5).addScaledVector(right, 0.2); origin.y -= 0.2;
      const aim = (this._aimP || (this._aimP = new V3())).copy(eye).addScaledVector(dir, tgt ? Math.max(2, eye.distanceTo(tgt.pos)) : 30);
      const pdir = (this._pd || (this._pd = new V3())).copy(aim).sub(origin).normalize();
      const c = this._wctx;
      c.world = this.world; c.firing = firing; c.fireP = firing && !this._wasFiring; c.eye = eye; c.eyeDir = dir; c.origin = origin; c.dir = pdir; c.aimPoint = aim; c.target = tgt; c.team = this.team;
      return c;
    }
    // Distance LOD with hysteresis: < ~30 m the full skinned ranger (2 draw calls: parts + visor), up to ~60 m
    // ONE static mesh in the gun-holding pose (hum.setLOD(1), 1 call; root bob / squash / blob morph still
    // run), then the 1-call capsule impostor (bot.far, ~600 tris), hidden beyond ~220 m. Rigs without
    // setLOD (fallback mini humanoid) use the impostor from ~30 m.
    _visual(dt, stunned) {
      const cam = G.R.camera;
      const d2 = cam.position.distanceToSquared(this.pos), d = Math.sqrt(d2);
      const hasLod = !!this.hum.setLOD;
      let lod = this.lod < 0 ? (d > 220 ? 3 : d > 60 ? 2 : d > 30 ? 1 : 0) : this.lod;
      while (lod < 3 && d > EDGE[lod] + 2) lod++;
      while (lod > 0 && d < EDGE[lod - 1] - 2) lod--;
      // limb detail: before the skinned rig gives way to the static gun-holding mesh the limbs ease to that pose
      // (0.3 s + 0.3 s for the eased joints to land; the swap waits), and after a swap back they ease in from it
      if (this.lod < 0) this._dk = lod ? 0 : 1;
      const step = dt / 0.3;
      if (lod === 0) this._dk = Math.min(1, Math.max(0, this._dk) + step);
      else if (this.lod === 0 && this._dk > -1) { this._dk = Math.max(-1, this._dk - step); lod = 0; }
      else this._dk = 0;
      if (lod !== this.lod) {
        this.lod = lod;
        const rig = lod === 0 || (lod === 1 && hasLod);
        if (hasLod) this.hum.setLOD(lod >= 1 ? 1 : 0);
        this.hum.group.visible = rig; this.far.visible = !rig && lod < 3;
        this.mesh.visible = lod < 3;
      }
      // rendered facing: critically damped spring on the sim yaw — turns ease in / out, and instant sim snaps
      // (throw / special facing, strafe flips while not aiming) never show as a snap
      const vy = this._vyaw;
      if (vy.x !== vy.x) { vy.x = this.yaw; vy.v = 0; }
      vy.t = vy.x + U.wrapAngle(this.yaw - vy.x);
      G.Geo.springStep(vy, dt);
      if (vy.x > 40 || vy.x < -40) vy.x = U.wrapAngle(vy.x);
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = vy.x + Math.PI;
      if (this.tag) this.tag.visible = d2 < 28 * 28 && !this.swimming;
      const hs = Math.hypot(this.vel.x, this.vel.z), t = this.world.time;
      // slide crouch / dance wiggle ease in and out instead of snapping
      this._slideK = U.damp(this._slideK, this.slideT > 0 ? 1 : 0, 14, dt);
      this._danceK = U.damp(this._danceK, this.dancing ? 1 : 0, 8, dt);
      if (this.hum.group.visible) {
        const state = this.swimming ? 'swim' : stunned ? 'hurt' : this.hurtT > 0 ? 'hurt' : this.firing ? 'shoot' : !this.grounded ? 'jump' : hs > 0.6 ? 'run' : 'idle';
        const o = this._ho;
        o.speed = hs; o.expr = this.dancing ? 'happy' : undefined;
        o.vx = this.vel.x; o.vz = this.vel.z; o.vy = this.vel.y; o.yaw = vy.x + Math.PI; o.turn = vy.v; o.grounded = !!this.grounded;
        const dk = this._dk > 0 ? this._dk : 0;
        o.detail = dk * dk * (3 - 2 * dk);
        this.animFn(this.hum, state, t, dt, o);
        const rig = this.hum.parts && this.hum.parts.rig;
        if (rig) {
          rig.position.y += -0.35 * this._slideK;
          if (this._slideK > 0.001) rig.rotation.x += -0.35 * this._slideK;     // lean back into the slide
          if (this._danceK > 0.001) rig.rotation.z += Math.sin(t * 12) * 0.25 * this._danceK;
        }
      } else if (this.far.visible) {
        this.far.position.y = this.grounded && hs > 0.6 ? Math.abs(Math.sin(t * 11 + this.id)) * 0.07 : 0;
        this.far.scale.set(1, this.swimming ? 0.35 : 1 - 0.35 * this._slideK, 1);
      }
    }
    onHurt(info, amt) {
      this.hurtT = 0.15;
      // directional flinch on the ranger (eased flash, squash, head snap); big hits (>= 25 % of the pool) stagger
      const h = this.hum;
      if (h && h.hit && !(info && info.type === 'dot')) {
        let dx = 0, dz = 0;
        const d = info && info.dir, sp = (info && info.pos) || (info && info.src && info.src.pos);
        if (d && d.lengthSq && d.lengthSq() > 1e-6) { dx = d.x; dz = d.z; } else if (sp) { dx = this.pos.x - sp.x; dz = this.pos.z - sp.z; }
        const a = amt || 0, pool = Math.max(1, this.maxHp + this.maxShield);
        const k = U.clamp(0.35 + a / 40, 0.35, 1.1);
        h.hit(dx, dz, h.anim && h.anim.hitT < 0.06 ? k * 0.35 : k, a >= pool * 0.25);
      }
      const src = info && info.src;
      if (src && src.alive && src !== this && src.team !== this.team) {
        this.lastAttacker = src;
        if (this.autoTarget && (!this.target || !this.hasLOS)) { this.target = src; this.thinkT = Math.min(this.thinkT, 0.05); }
      }
    }
    onDeath(info) {
      const w = this.world;
      this.koT = 0;
      this.firing = false; this.swimming = false;
      const p = this.aimPoint(_a);
      w.fx.confetti(p, 30);
      w.fx.burst(p, [this.colors.main, this.colors.accent, 0xffffff], 22, 6, 0.28, 0.6, { normal: true });
      w.fx.ring(this.pos, 2.2, this.colors.main, 0.45, this.pos.y + 0.1);
      if (w.fx.decal && G.Geo && G.Geo.splatGeo) w.fx.decal(_b.set(this.pos.x, this.pos.y + 0.02, this.pos.z), _c.set(0, 1, 0), this.colors.main, 1.4);
      if (G.Audio) G.Audio.sfxAt('enemyDie', p, { pitch: 1.2 });
      if (this.tag) this.tag.visible = false;
      if (this.onKO) G.safe('bot onKO', () => this.onKO(this, info));
    }
    _koUpdate(dt) {
      this.koT += dt;
      if (this.hum.group.visible) this.animFn(this.hum, 'dead', this.world.time, dt, NO_OPTS);
      if (this.far.visible) this.far.scale.setScalar(Math.max(0.001, 1 - this.koT / 0.25));
      this.mesh.position.copy(this.pos);
      if (this.removeOnKO && this.koT > 0.5) this.dead = true;
    }
    respawn(pos) {
      if (pos) this.pos.copy(pos);
      this.vel.set(0, 0, 0);
      this.hp = this.maxHp; this.shield = this.maxShield; this.alive = true; this.dead = false;
      this.lastHitT = -99; this.retreatT = 0; this.slideT = 0; this.swimming = false; this.hidden = false;
      this.stunT = 0; this.slowT = 0; this.dotT = 0;
      if (this.ink !== undefined) this.ink = 100;
      for (const w of this.weapons) if (w.refill) G.safe('bot refill', () => w.refill());
      const h = this.hum;
      h.group.visible = true; h.popped = false;
      if (h.parts) { if (h.parts.rig) h.parts.rig.scale.set(1, 1, 1); if (h.parts.blob) h.parts.blob.scale.set(1, 1, 1); if (h.parts.shadow) h.parts.shadow.scale.setScalar(0.88); }
      if (h.anim) { h.anim.state = 'idle'; h.anim.deadT = 0; h.anim.flash = 0; }
      if (h.setFlash) h.setFlash(0);
      if (h.setBlob) h.setBlob(false);
      if (h.spawnIn) h.spawnIn();   // pop back in with a little overshoot
      this.far.scale.setScalar(1);
      this.lod = -1;
      this._vyaw.x = NaN; this._slideK = 0; this._danceK = 0;
      this.safePos.copy(this.pos);
      if (this.world.actors.indexOf(this) < 0) this.world.addActor(this);
      this.world.fx.ring(_a.copy(this.pos), 2, this.colors.main, 0.5, this.pos.y + 0.1);
      this.world.fx.burst(_a.set(this.pos.x, this.pos.y + 0.9, this.pos.z), [0xffffff, this.colors.main, 0xfff3a0], 14, 3, 0.15, 0.5, { grav: -2.5, drag: 2.5 });
    }
    dispose() {
      for (const w of this.weapons) if (w.onUnequip) G.safe('bot unequip', () => w.onUnequip());
      if (this.hum && this.hum.dispose) this.hum.dispose();
      if (this._tagIt) { tagRelease(this._tagIt); this._tagIt = null; }
      else if (this.tag && this.tag.material) { this.tag.material.dispose(); if (this.tagTex) this.tagTex.dispose(); }
      super.dispose();
    }
  }
  Bot.randomName = randomName;
  Bot.TEAM_COLORS = TEAM_COLORS;
  Bot.SKILLS = SKILLS;
  Bot.NavGrid = BotNav;
  Bot.nav = botNav;          // G.Bot.nav(world) -> height-aware navgrid (built once per world; call at load time)
  Bot.spawn = function (world, pos, opts) {
    const b = new Bot(world, Object.assign({}, opts || {}, { pos }));
    world.addActor(b);
    return b;
  };
  G.Bot = Bot;
  // Count pops for bots (weapons do not track kills on their owner).
  G.bus.on('kill', (target, info) => { const s = info && info.src; if (s && s.isBot && s !== target && typeof s.kills === 'number') s.kills++; });
})(window.G);

}).call(window); } catch (e) { console.error('[module 17c_bots.js]', e); }
})();
