/* Marmalune Rangers — royale: 25_royale.js 25b_royale_bots.js 25b_royale_drop.js 25b_royale_hud.js 25b_royale_loot.js 25b_royale_map.js 25b_royale_match.js 25b_royale_ring.js 26_training.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 25_royale.js
try { (function () {
// 25_royale.js — Sky Drop Royale (GDD §11d): 16-ranger solo survival royale vs 15 bots.
// This file: strings (en/ja), shared tables + helpers on G.Royale, the 'royale-lobby' screen, the
// fallback results panel and the mode registration. The match lives in 25b_royale_*.js:
//   25b_royale_map.js   island terrain, POIs, props, launch pads, loot spots
//   25b_royale_loot.js  ground loot (instanced), supply bins, inventory, smart-heal, throwables
//   25b_royale_ring.js  ring rounds, storm wall, ring damage, supply drops
//   25b_royale_drop.js  Captain Gale's airship, skydive + glide-wing landing, sky cameras
//   25b_royale_bots.js  15 FFA bot rangers (G.Bot when available, own fallback otherwise) + brains
//   25b_royale_hud.js   HUD widgets, minimap, overview map, name tags, loot labels, overlays
//   25b_royale_match.js match orchestration, KO / spectate / champion / results flow, pings
// Launch: G.Game.go('royale', {difficulty, fast, skipDrop, seed}) or G.UI.open('royale-lobby').
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};

  G.i18n.add('en', {
    'roy.title': 'Sky Drop Royale', 'roy.tagline': 'You vs 15 bots. 1 island. Be the last one bouncing!',
    'roy.rule.drop.t': 'Sky Drop', 'roy.rule.drop.d': 'Jump from Captain Gale\'s airship and glide down anywhere you like.',
    'roy.rule.loot.t': 'Loot Up', 'roy.rule.loot.d': 'Grab blasters and heals. Glow color shows rarity: gray, green, blue, purple, gold.',
    'roy.rule.ring.t': 'Mind the Ring', 'roy.rule.ring.d': 'The storm ring shrinks. Stay inside the safe zone!',
    'roy.rule.win.t': 'Last One Bouncing', 'roy.rule.win.d': 'Bonk the 15 bot rangers. Be the last one standing!',
    'roy.difficulty': 'Bot skill', 'roy.go': 'Launch!', 'roy.replay': 'Play again', 'roy.lastChamp': 'Last champion: {name}',
    'roy.champBot': 'Champion bot: {name}', 'roy.you': 'You', 'roy.introSub': 'You and 15 bot rangers are dropping in!',
    'roy.airship': 'Captain Gale\'s Airship', 'roy.gale': 'Ahoy, rangers! Jump whenever you\'re ready!',
    'roy.jumpHint': 'Tap JUMP to drop!', 'roy.jumpHintKb': 'Press SPACE to drop!', 'roy.autoDrop': 'Auto-drop in {n}',
    'roy.mapHint': 'Tap the map to mark a landing spot', 'roy.skydive': 'Steer with the stick · look down to dive',
    'roy.skydiveKb': 'WASD to steer · look down to dive', 'roy.glide': 'Glide wings out!', 'roy.landed': 'Loot up!',
    'roy.ring.wait': 'Ring closes in {t}', 'roy.ring.close': 'Ring closing! {t}', 'roy.ring.final': 'Final ring!',
    'roy.ring.banner': 'Ring closing in {t}', 'roy.ring.closingNow': 'The ring is closing!', 'roy.ring.round': 'Round {n}',
    'roy.ring.start': 'The storm is coming!', 'roy.safe.dist': 'Safe zone {n} m', 'roy.safe.in': 'In the safe zone',
    'roy.outside': 'Outside the ring! Get to the safe zone!',
    'roy.feed.ko': '{a} bonked {b}!', 'roy.feed.ring': '{b} got zapped by the storm', 'roy.feed.you': 'You bonked {b}!',
    'roy.feed.youOut': '{a} bonked you!',
    'roy.koBy': 'Knocked out by {name}', 'roy.koRing': 'Knocked out by the storm', 'roy.out': 'Knocked out!',
    'roy.place': '#{n}', 'roy.placeOf': '#{n} of 16', 'roy.champion': 'You\'re the Champion!', 'roy.championSub': 'Last ranger bouncing!',
    'roy.greatRun': 'Great run!', 'roy.secondChance': 'Second Chance!', 'roy.secondChanceSub': 'Breezy bonus: redeploying…',
    'roy.spectate': 'Watching {name}', 'roy.pickup': 'Pick up', 'roy.swap': 'Swap', 'roy.open': 'Open', 'roy.full': 'Full',
    'roy.heal': 'Heal', 'roy.healing': 'Healing… {item}', 'roy.healFull': 'Already full!', 'roy.noHeals': 'No heals left!',
    'roy.healCancel': 'Heal canceled', 'roy.shieldUp': 'Spark Shield Lv {n}!', 'roy.shield': 'Spark Shield',
    'roy.supply': 'Supply drop incoming!', 'roy.supplyLanded': 'Supply drop landed!', 'roy.ride': 'Ride balloon',
    'roy.ping.enemy': 'Enemy here!', 'roy.ping.loot': '{item} here', 'roy.ping.go': 'Going here', 'roy.ping.drop': 'Supply pod here',
    'roy.throw': 'Throw', 'roy.gotItem': '{item}', 'roy.dropped': 'Dropped {item}', 'roy.slotsFull': 'Swap to pick up',
    'roy.it.pop': 'Health Pop', 'roy.it.medkit': 'Med Kit', 'roy.it.cell': 'Shield Cell', 'roy.it.battery': 'Shield Battery',
    'roy.it.grenade': 'Fizz Grenade', 'roy.it.groove': 'Groove Globe', 'roy.it.bloom': 'Bloom Bomb', 'roy.it.ammo': 'Ammo Box',
    'roy.it.bin': 'Supply Bin', 'roy.it.drop': 'Supply Pod', 'roy.it.gale': 'Captain Gale',
    'roy.rar.common': 'Common', 'roy.rar.uncommon': 'Uncommon', 'roy.rar.rare': 'Rare', 'roy.rar.epic': 'Epic', 'roy.rar.legendary': 'Legendary',
    'roy.itemRar': '{rar} {item}',
    'roy.w.fizz': 'Fizz Blaster', 'roy.w.scatter': 'Pop Scatter', 'roy.w.lobber': 'Bubble Lobber', 'roy.w.zap': 'Zap Coil',
    'roy.w.saw': 'Saw Skipper', 'roy.w.lancer': 'Beam Lancer', 'roy.w.gatling': 'Gale Gatling', 'roy.w.swarm': 'Confetti Swarm',
    'roy.w.splat': 'Goo Splatter', 'roy.w.chill': 'Chill Mister', 'roy.w.prism': 'Prism Party Cannon',
    'roy.poi.cove': 'Clink Cove', 'roy.poi.market': 'Mesa Market', 'roy.poi.castle': 'Coral Castle', 'roy.poi.jetty': 'Junk Jetty',
    'roy.poi.garden': 'Glow Garden', 'roy.poi.hill': 'Windmill Hill',
    'roy.stat.place': 'Placement', 'roy.stat.pops': 'Pops', 'roy.stat.damage': 'Damage', 'roy.stat.time': 'Survived',
    'roy.res.win': 'Champion!', 'roy.res.lose': '#{n}!', 'roy.rewards': 'Rewards', 'roy.rw.clinks': '{n} Clinks', 'roy.rw.xp': '{n} XP',
    'roy.rw.chest': 'Gold chest',
    'roy.tip.0': 'Tip: Shields level up as you deal damage. Bonk to grow!',
    'roy.tip.1': 'Tip: Watch the ring timer and move early. The storm hurts more each round.',
    'roy.tip.2': 'Tip: Purple and gold glows mean strong gear. Grab them!',
    'roy.tip.3': 'Tip: Heal behind cover. Firing cancels healing.',
    'roy.tip.4': 'Tip: Launch pads fling you up onto the mesas.',
    'roy.bot.0': 'Pip', 'roy.bot.1': 'Mochi', 'roy.bot.2': 'Zappy', 'roy.bot.3': 'Kiwi', 'roy.bot.4': 'Bubbles', 'roy.bot.5': 'Nova',
    'roy.bot.6': 'Pebble', 'roy.bot.7': 'Sprocket', 'roy.bot.8': 'Ziggy', 'roy.bot.9': 'Puff', 'roy.bot.10': 'Clover', 'roy.bot.11': 'Rusty',
    'roy.bot.12': 'Jelly', 'roy.bot.13': 'Tango', 'roy.bot.14': 'Waffles', 'roy.bot.15': 'Comet', 'roy.bot.16': 'Biscuit', 'roy.bot.17': 'Sunny',
  });
  G.i18n.add('ja', {
    'roy.title': 'スカイドロップ・ロワイヤル', 'roy.tagline': 'キミ VS ボット15体。ひとつの島で さいごまで のこれ！',
    'roy.rule.drop.t': 'スカイドロップ', 'roy.rule.drop.d': 'キャプテン・ゲイルの飛行船からジャンプして、すきな場所へおりよう。',
    'roy.rule.loot.t': 'アイテムあつめ', 'roy.rule.loot.d': 'ブラスターや回復アイテムをひろおう。光の色がレアさのしるし：グレー・みどり・あお・むらさき・きん。',
    'roy.rule.ring.t': 'リングに注意', 'roy.rule.ring.d': 'あらしのリングがちぢむよ。安全エリアの中にいよう！',
    'roy.rule.win.t': 'さいごの1人', 'roy.rule.win.d': 'ボットレンジャー15体を ポン！ さいごまで のこったら優勝！',
    'roy.difficulty': 'ボットのつよさ', 'roy.go': 'しゅっぱつ！', 'roy.replay': 'もう一回', 'roy.lastChamp': '前回のチャンピオン：{name}',
    'roy.champBot': 'チャンピオンボット：{name}', 'roy.you': 'あなた', 'roy.introSub': 'キミと ボットレンジャー15体が 島へおりてくる！',
    'roy.airship': 'キャプテン・ゲイルの飛行船', 'roy.gale': 'やあ、レンジャーたち！ じゅんびができたらジャンプだ！',
    'roy.jumpHint': 'ジャンプボタンでとびおりよう！', 'roy.jumpHintKb': 'スペースキーでとびおりよう！', 'roy.autoDrop': 'あと{n}秒で自動ジャンプ',
    'roy.mapHint': 'マップをタップして着地点に目じるし', 'roy.skydive': 'スティックで方向・下を見るとスピードアップ',
    'roy.skydiveKb': 'WASDで方向・下を見るとスピードアップ', 'roy.glide': 'グライダーオープン！', 'roy.landed': 'アイテムを集めよう！',
    'roy.ring.wait': 'リング縮小まで {t}', 'roy.ring.close': 'リング縮小中！ {t}', 'roy.ring.final': 'さいごのリング！',
    'roy.ring.banner': 'あと{t}でリングが縮むよ', 'roy.ring.closingNow': 'リングが縮みはじめた！', 'roy.ring.round': 'ラウンド{n}',
    'roy.ring.start': 'あらしがやってくる！', 'roy.safe.dist': '安全エリアまで {n}m', 'roy.safe.in': '安全エリアの中',
    'roy.outside': 'リングの外だよ！ 安全エリアへいそごう！',
    'roy.feed.ko': '{a}が{b}をポン！', 'roy.feed.ring': '{b}はあらしでビリッ！', 'roy.feed.you': '{b}をポンした！',
    'roy.feed.youOut': '{a}にポンされた！',
    'roy.koBy': '{name}にノックアウトされた', 'roy.koRing': 'あらしでノックアウト', 'roy.out': 'ノックアウト！',
    'roy.place': '{n}位', 'roy.placeOf': '16人中 {n}位', 'roy.champion': 'チャンピオンだ！', 'roy.championSub': 'さいごまでのこったよ！',
    'roy.greatRun': 'ナイスファイト！', 'roy.secondChance': 'セカンドチャンス！', 'roy.secondChanceSub': 'そよかぜボーナス：もう一度ジャンプ！',
    'roy.spectate': '{name}をかんせん中', 'roy.pickup': 'ひろう', 'roy.swap': 'とりかえる', 'roy.open': 'あける', 'roy.full': 'いっぱい',
    'roy.heal': 'かいふく', 'roy.healing': 'かいふく中… {item}', 'roy.healFull': 'もう満タンだよ！', 'roy.noHeals': 'かいふくアイテムがない！',
    'roy.healCancel': 'かいふくキャンセル', 'roy.shieldUp': 'スパークシールド Lv{n}！', 'roy.shield': 'スパークシールド',
    'roy.supply': '補給ポッドがくるよ！', 'roy.supplyLanded': '補給ポッドが着地した！', 'roy.ride': '気球にのる',
    'roy.ping.enemy': 'てきがいるよ！', 'roy.ping.loot': '{item}があるよ', 'roy.ping.go': 'ここへ行くよ', 'roy.ping.drop': '補給ポッドはここ',
    'roy.throw': 'なげる', 'roy.gotItem': '{item}', 'roy.dropped': '{item}をおいた', 'roy.slotsFull': 'とりかえてひろおう',
    'roy.it.pop': 'ヘルスポップ', 'roy.it.medkit': 'メディキット', 'roy.it.cell': 'シールドセル', 'roy.it.battery': 'シールドバッテリー',
    'roy.it.grenade': 'フィズグレネード', 'roy.it.groove': 'グルーヴグローブ', 'roy.it.bloom': 'ブルームボム', 'roy.it.ammo': 'だんやくボックス',
    'roy.it.bin': 'サプライボックス', 'roy.it.drop': '補給ポッド', 'roy.it.gale': 'キャプテン・ゲイル',
    'roy.rar.common': 'コモン', 'roy.rar.uncommon': 'アンコモン', 'roy.rar.rare': 'レア', 'roy.rar.epic': 'エピック', 'roy.rar.legendary': 'レジェンド',
    'roy.itemRar': '{rar}・{item}',
    'roy.w.fizz': 'フィズブラスター', 'roy.w.scatter': 'ポップスキャッター', 'roy.w.lobber': 'バブルロバー', 'roy.w.zap': 'ザップコイル',
    'roy.w.saw': 'ソースキッパー', 'roy.w.lancer': 'ビームランサー', 'roy.w.gatling': 'ゲイルガトリング', 'roy.w.swarm': 'コンフェッティスウォーム',
    'roy.w.splat': 'グースプラッター', 'roy.w.chill': 'チルミスター', 'roy.w.prism': 'プリズムパーティーキャノン',
    'roy.poi.cove': 'クリンク入り江', 'roy.poi.market': 'メサマーケット', 'roy.poi.castle': 'サンゴのお城', 'roy.poi.jetty': 'ガラクタ桟橋',
    'roy.poi.garden': 'ひかりの庭', 'roy.poi.hill': '風車の丘',
    'roy.stat.place': '順位', 'roy.stat.pops': 'ポップ数', 'roy.stat.damage': 'ダメージ', 'roy.stat.time': 'がんばった時間',
    'roy.res.win': 'チャンピオン！', 'roy.res.lose': '{n}位！', 'roy.rewards': 'ごほうび', 'roy.rw.clinks': '{n} クリンク', 'roy.rw.xp': '{n} XP',
    'roy.rw.chest': 'ゴールドたからばこ',
    'roy.tip.0': 'ヒント：ダメージをあたえるとシールドがレベルアップ！',
    'roy.tip.1': 'ヒント：リングのタイマーを見て、はやめに移動しよう。',
    'roy.tip.2': 'ヒント：むらさきやきんいろに光るアイテムはつよいよ！',
    'roy.tip.3': 'ヒント：かいふくはものかげで。うつとキャンセルされるよ。',
    'roy.tip.4': 'ヒント：ジャンプパッドでメサの上へとびのれるよ。',
    'roy.bot.0': 'ピップ', 'roy.bot.1': 'モチ', 'roy.bot.2': 'ザッピー', 'roy.bot.3': 'キウイ', 'roy.bot.4': 'バブルス', 'roy.bot.5': 'ノヴァ',
    'roy.bot.6': 'ペブル', 'roy.bot.7': 'スプロケット', 'roy.bot.8': 'ジギー', 'roy.bot.9': 'パフ', 'roy.bot.10': 'クローバー', 'roy.bot.11': 'ラスティ',
    'roy.bot.12': 'ジェリー', 'roy.bot.13': 'タンゴ', 'roy.bot.14': 'ワッフル', 'roy.bot.15': 'コメット', 'roy.bot.16': 'ビスケット', 'roy.bot.17': 'サニー',
  });

  // ------------------------------------------------------------------ shared tables (GDD §11d, §2.4, §5.1)
  // Rarity tiers (index 0..4). GDD colors; pips + frame shapes so color is never the only cue.
  RY.RARITY = [
    { id: 'common', color: 0xc9d1dc, css: '#c9d1dc', pips: 1, beam: 0, key: 'roy.rar.common' },
    { id: 'uncommon', color: 0x3ddc97, css: '#3ddc97', pips: 2, beam: 0, sparkle: true, key: 'roy.rar.uncommon' },
    { id: 'rare', color: 0x3fa9ff, css: '#3fa9ff', pips: 3, beam: 1.5, key: 'roy.rar.rare' },
    { id: 'epic', color: 0xa66bff, css: '#a66bff', pips: 4, beam: 3, chime: true, key: 'roy.rar.epic' },
    { id: 'legendary', color: 0xffc21a, css: '#ffc21a', pips: 5, beam: 6, fanfare: true, key: 'roy.rar.legendary' },
  ];
  RY.DMG_MULT = [1.0, 1.08, 1.16, 1.24, 1.32];
  RY.FLOOR_W = [45, 30, 17, 7, 1];
  RY.BIN_W = [20, 35, 30, 13, 2];
  // Ring rounds: wait, close time, shrink-to (fraction of the initial radius), damage per second.
  RY.R0 = 160;
  RY.RING = [
    { wait: 60, close: 50, to: 0.60, dps: 2 },
    { wait: 45, close: 40, to: 0.35, dps: 4 },
    { wait: 35, close: 30, to: 0.18, dps: 8 },
    { wait: 25, close: 25, to: 0.08, dps: 14 },
    { wait: 20, close: 30, to: 0.0, dps: 25 },
  ];
  // Spark Shield: level from damage dealt this match; each level-up refills the shield.
  RY.SHIELD = [{ need: 0, max: 50 }, { need: 150, max: 75 }, { need: 400, max: 100 }, { need: 800, max: 125 }];
  RY.HEALS = {
    pop: { hp: 25, time: 2.5, stack: 4, rar: 0, color: 0xff7ab8 },
    medkit: { hp: 100, time: 5, stack: 2, rar: 2, color: 0xff5a6e },
    cell: { sh: 25, time: 1.5, stack: 4, rar: 0, color: 0x39d5ff },
    battery: { sh: 999, time: 3, stack: 2, rar: 2, color: 0x2f7bff },
  };
  RY.HEAL_ORDER = ['battery', 'cell', 'medkit', 'pop'];
  RY.THROWS = {
    grenade: { stack: 3, rar: 1, color: 0xff8fc0, dmg: 65, r: 3.5 },
    groove: { stack: 1, rar: 3, color: 0xb983ff, r: 8, stun: 6 },
    bloom: { stack: 1, rar: 3, color: 0x6ccb5f, r: 5, stun: 5 },
  };
  RY.WEAPON_POOL = ['scatter', 'lobber', 'zap', 'saw', 'lancer', 'gatling', 'swarm', 'splat', 'chill'];
  RY.WEAPON_COLOR = { fizz: 0x2ec4b6, scatter: 0xff6b6b, lobber: 0xff8fc0, zap: 0xb8f34a, saw: 0x3ddc97, lancer: 0x8c7bff, gatling: 0x3fa9ff, swarm: 0xffd45c, splat: 0xa8e06a, chill: 0x9fe8ff, prism: 0xf7f4ff };
  // Rough per-weapon power used by bots to judge upgrades (higher = better).
  RY.WEAPON_TIER = { fizz: 1, splat: 2, chill: 2, zap: 2.4, scatter: 2.6, saw: 2.5, lobber: 2.3, gatling: 2.8, lancer: 2.7, swarm: 3, prism: 4 };
  RY.DIFFS = ['breezy', 'normal', 'spicy', 'blazing'];
  RY.REWARD_MULT = { breezy: 1.0, normal: 1.25, spicy: 1.6, blazing: 2.0 };
  // Rarity weights shifted by difficulty (GDD §4.5).
  RY.weights = function (base, diff) {
    const w = base.slice();
    if (diff === 'spicy') { w[0] -= 10; w[2] += 6; w[3] += 4; }
    else if (diff === 'blazing') { w[0] -= 20; w[2] += 10; w[3] += 7; w[4] += 3; }
    for (let i = 0; i < w.length; i++) w[i] = Math.max(0, w[i]);
    return w;
  };
  RY.rollRarity = function (w, rnd) {
    let tot = 0; for (const x of w) tot += x;
    let r = (rnd || Math.random)() * tot;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
    return 0;
  };
  // Weapon display name (weapons module keys first, our fallback otherwise).
  RY.weaponName = function (id) {
    const W = G.Weapons && G.Weapons.defs && G.Weapons.defs[id];
    const cands = [];
    if (W && W.nameKey) cands.push(W.nameKey);
    cands.push('wpn.' + id + '.name', 'wpn.' + id, 'weapon.' + id + '.name');
    for (const k of cands) if (G.i18n.has(k)) return G.t(k);
    return G.t('roy.w.' + id);
  };
  RY.itemName = function (it) {
    if (it.kind === 'weapon') return RY.weaponName(it.type);
    return G.t('roy.it.' + it.type);
  };
  RY.itemLabel = function (it) {
    return G.t('roy.itemRar', { rar: G.t(RY.RARITY[it.rar].key), item: RY.itemName(it) });
  };
  RY.pipsHtml = function (rar) {
    let s = '';
    for (let i = 0; i < 5; i++) s += '<i class="' + (i <= rar ? 'on' : '') + '"></i>';
    return s;
  };

  // ------------------------------------------------------------------ icons (inline SVG, ink outline)
  const INK = '#1e1a4d';
  RY.ICON = {
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="4.3" fill="#fff" stroke="' + INK + '" stroke-width="2"/><path d="M4 21.5c0-5 3.6-8 8-8s8 3 8 8z" fill="#fff" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></svg>',
    pop: '<svg viewBox="0 0 24 24"><path d="M12 1.8l2.5 5.6 5.8-1.6-2 5.5 4 2.8-5.7 1.4-.4 5.8-4.2-3.7-4.2 3.7-.4-5.8L1.7 14l4-2.8-2-5.5 5.8 1.6z" fill="#ffd23f" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    ring: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="rgba(122,240,255,.25)" stroke="#7af0ff" stroke-width="4"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-dasharray="3 2.6"/><circle cx="12" cy="12" r="2.4" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/></svg>',
    heal: '<svg viewBox="0 0 48 48"><path d="M18 5h12v13h13v12H30v13H18V30H5V18h13z" fill="currentColor" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/></svg>',
    grenade: '<svg viewBox="0 0 48 48"><circle cx="22" cy="28" r="14" fill="#ff8fc0" stroke="' + INK + '" stroke-width="3.5"/><circle cx="17" cy="23" r="4" fill="#fff" opacity=".8"/><path d="M30 15l6-6M34 7l4 4" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/></svg>',
    crown: '<svg viewBox="0 0 24 24"><path d="M3 18l-1-11 6 5 4-8 4 8 6-5-1 11z" fill="#ffc21a" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/><rect x="3" y="18" width="18" height="3" rx="1" fill="#ffc21a" stroke="' + INK + '" stroke-width="1.8"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8.5 4.9v10.2L12 22l-8.5-4.9V6.9z" fill="#39d5ff" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.5l4 2.3v4.6L12 17l-4-3.6V8.8z" fill="#fff" opacity=".55"/></svg>',
    airship: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="17" rx="19" ry="10" fill="#ff8a4c" stroke="' + INK + '" stroke-width="3"/><path d="M8 17h32" stroke="#fff1dc" stroke-width="3"/><path d="M18 27l-2 6h16l-2-6" fill="none" stroke="' + INK + '" stroke-width="3"/><rect x="15" y="32" width="18" height="8" rx="3" fill="#2cc3d6" stroke="' + INK + '" stroke-width="3"/></svg>',
    glide: '<svg viewBox="0 0 48 48"><path d="M4 22c8-10 32-10 40 0-6-2-10-1-12 2-3-3-13-3-16 0-2-3-6-4-12-2z" fill="#3fe0b8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M16 24l8 14 8-14" fill="none" stroke="' + INK + '" stroke-width="2.5"/><circle cx="24" cy="40" r="4" fill="#ffd23f" stroke="' + INK + '" stroke-width="2.5"/></svg>',
    loot: '<svg viewBox="0 0 48 48"><path d="M24 4v12" stroke="#a66bff" stroke-width="6" stroke-linecap="round" opacity=".7"/><rect x="8" y="18" width="32" height="22" rx="5" fill="#a66bff" stroke="' + INK + '" stroke-width="3"/><rect x="8" y="18" width="32" height="8" rx="4" fill="#c9a6ff" stroke="' + INK + '" stroke-width="3"/><rect x="20" y="24" width="8" height="8" rx="2" fill="#ffc21a" stroke="' + INK + '" stroke-width="2.5"/></svg>',
    storm: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="#7af0ff" stroke-width="6"/><circle cx="24" cy="24" r="18" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M24 14l-5 11h6l-3 9 8-12h-6l3-8z" fill="#ffd23f" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></svg>',
    trophy: '<svg viewBox="0 0 48 48"><path d="M14 6h20v10a10 10 0 0 1-20 0z" fill="#ffc21a" stroke="' + INK + '" stroke-width="3"/><path d="M14 10H7c0 7 4 10 8 10M34 10h7c0 7-4 10-8 10" fill="none" stroke="' + INK + '" stroke-width="3"/><path d="M21 26h6v7h-6zM14 40h20l-2-7H16z" fill="#ffc21a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/></svg>',
    groove: '<svg viewBox="0 0 48 48"><circle cx="24" cy="22" r="14" fill="#b983ff" stroke="' + INK + '" stroke-width="3.5"/><path d="M12 18h24M11 25h26M16 12l4 21M28 11l4 22" stroke="#e6ecff" stroke-width="2.5" opacity=".8"/><path d="M18 38h12l-2 5h-8z" fill="#e8b44a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/></svg>',
    bloom: '<svg viewBox="0 0 48 48"><path d="M14 28h20l-3 14H17z" fill="#d9774a" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/><circle cx="24" cy="16" r="5" fill="#ffd45c" stroke="' + INK + '" stroke-width="3"/><circle cx="16" cy="15" r="5" fill="#ff7a93" stroke="' + INK + '" stroke-width="3"/><circle cx="32" cy="15" r="5" fill="#ff7a93" stroke="' + INK + '" stroke-width="3"/><path d="M24 22v6" stroke="#3e9e57" stroke-width="3.5"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" fill="#ffd23f" stroke="' + INK + '" stroke-width="2"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/></svg>',
    enemy: '<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z" fill="#ff5a6e" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17" r="1.4" fill="#fff"/></svg>',
  };

  RY.HEAL_ICON = {
    pop: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8.5" r="6" fill="#ff7ab8" stroke="' + INK + '" stroke-width="1.6"/><path d="M8 5.5v6M5 8.5h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    medkit: '<svg viewBox="0 0 16 16"><rect x="1.8" y="4" width="12.4" height="9.5" rx="2" fill="#ff5a6e" stroke="' + INK + '" stroke-width="1.6"/><path d="M6 4V2.6h4V4" fill="none" stroke="' + INK + '" stroke-width="1.4"/><path d="M8 6.2v5M5.5 8.7h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    cell: '<svg viewBox="0 0 16 16"><path d="M8 1.6l5.5 3.2v6.4L8 14.4l-5.5-3.2V4.8z" fill="#39d5ff" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    battery: '<svg viewBox="0 0 16 16"><rect x="3.5" y="2.6" width="9" height="12" rx="2" fill="#2f7bff" stroke="' + INK + '" stroke-width="1.6"/><rect x="6" y="1" width="4" height="2" rx=".8" fill="' + INK + '"/><path d="M8.6 5L6.4 9h2.2L7.4 12.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // ------------------------------------------------------------------ lobby
  const el = (...a) => G.UI.el(...a);
  const LOCK_SVG = '<svg viewBox="0 0 16 16" width="12" height="12"><rect x="3" y="7" width="10" height="8" rx="2.2" fill="#ffc21a" stroke="' + INK + '" stroke-width="1.6"/><path d="M5.3 7V5.4a2.7 2.7 0 0 1 5.4 0V7" fill="none" stroke="' + INK + '" stroke-width="1.6"/></svg>';
  function rankReq(d) {
    const D = G.Data && G.Data.DIFFICULTY;
    if (D && D[d] && D[d].pr != null) return D[d].pr;
    return { breezy: 0, normal: 0, spicy: 10, blazing: 18 }[d] || 0;
  }
  function playerRank() { return G.Progress && G.Progress.rankInfo ? (G.Progress.rankInfo().pr || 1) : 99; }
  RY.lastChampion = function () {
    const p = G.Save && G.Save.data && G.Save.prof;
    return p && p.royale && p.royale.lastChamp ? p.royale.lastChamp : null;
  };
  G.UI.def('royale-lobby', {
    build(params, close, entry) {
      if (!entry.diff) entry.diff = (params && params.difficulty) || G.Save.set.difficulty || 'normal';
      const pr = playerRank();
      if (rankReq(entry.diff) > pr) entry.diff = 'normal';
      const rules = [['drop', RY.ICON.airship], ['loot', RY.ICON.loot], ['ring', RY.ICON.storm], ['win', RY.ICON.trophy]];
      const cards = el('div.grid.tight.roy-rules', rules.map(([k, ic]) => el('div.card',
        el('div.roy-rule-ico', { html: ic }), el('h3', { i18n: 'roy.rule.' + k + '.t' }), el('p', { i18n: 'roy.rule.' + k + '.d' }))));
      const diffBtns = el('div.row.roy-diffs', RY.DIFFS.map(d => {
        const need = rankReq(d), locked = need > pr;
        const label = locked ? G.t('set.diff.lock', { name: G.t('set.diff.' + d), n: need }) : G.t('set.diff.' + d);
        if (!locked) return G.UI.btn(label, () => { entry.diff = d; G.UI.refresh(entry); }, 'small' + (entry.diff === d ? ' primary' : ''), { raw: true });
        // locked: the full "Spicy (Rank 10)", or on a narrow phone the short "Spicy 🔒10" (CSS picks one)
        const b = G.UI.btn(null, null, 'small', { disabled: true, title: label });
        b.append(el('span.roy-dl', { text: label }), el('span.roy-ds', el('span', { text: G.t('set.diff.' + d) }), el('span.roy-lk', { html: LOCK_SVG }), el('span', { text: String(need) })));
        return b;
      }));
      const champ = RY.lastChampion();
      const info = el('p.muted.small.center', { text: champ ? G.t('roy.lastChamp', { name: champ }) : G.t('roy.introSub') });
      const start = G.UI.btn('roy.go', () => {
        G.Save.set.difficulty = entry.diff; G.Save.save();
        close();
        G.Game.go('royale', { difficulty: entry.diff });
      }, 'go big', { icon: RY.ICON.airship.replace('<svg ', '<svg width="34" height="34" ') });
      // honest line-up: one player, 15 bot rangers (no online play)
      const vs = el('div.roy-vs',
        el('span', el('span', { html: RY.ICON.person }), el('span', { i18n: 'roy.you' })),
        el('b', { i18n: 'turf.vs' }),
        el('span', el('span', { html: RY.ICON.bot || RY.ICON.enemy }), el('span', { text: G.t('roy.bots15', { n: 15 }) })));
      return G.UI.panel('roy.title', close, [
        el('p.center.roy-tagline', { i18n: 'roy.tagline' }),
        vs,
        cards,
        info,
      ], { icon: RY.ICON.airship, foot: el('div.row.roy-foot', el('div.roy-diffbox', el('span.roy-sub', { i18n: 'roy.difficulty' }), diffBtns), start), style: { maxWidth: '780px' } });
    },
  });

  // ------------------------------------------------------------------ fallback results panel
  // Used only when the shared 'results' screen (30_menus.js) is not registered.
  G.UI.def('royale-results', {
    escClose: false,
    build(p, close) {
      const win = !!p.win;
      const head = el('div.roy-res-head',
        el('div.roy-res-big', { text: win ? G.t('roy.res.win') : G.t('roy.res.lose', { n: p.place }) }),
        el('div.roy-res-sub', { text: win ? G.t('roy.championSub') : G.t('roy.greatRun') }));
      const stars = el('div.results-stars', [0, 1, 2].map(i => el('span', { text: i < (p.stars || 0) ? '★' : '☆' })));
      const rows = el('div.col.roy-res-stats', (p.stats || []).map(s => el('div.stat', el('span', { i18n: s.key }), el('b', { text: String(s.value) }))));
      const rw = el('div.reward-list', (p.rewardList || []).map((r, i) => el('div.reward', { style: { animationDelay: (0.15 + i * 0.12) + 's' } }, r.icon ? el('span', { html: r.icon, style: { display: 'inline-flex', width: '22px', height: '22px' } }) : null, el('span', { text: r.text }))));
      const tip = p.tip ? el('p.muted.small.center', { i18n: p.tip }) : null;
      const goHub = () => { close(); G.Game.go(G.Game.modes.hub ? 'hub' : 'royale', G.Game.modes.hub ? undefined : G.Game.params); };
      const foot = el('div.row.end',
        G.UI.btn('roy.replay', () => { close(); G.Game.go('royale', { difficulty: p.difficulty }); }, 'cool'),
        G.UI.btn('ui.continue', goHub, 'primary'));
      return G.UI.panel(null, null, [head, stars, rows, el('h3.roy-sub', { i18n: 'roy.rewards' }), rw, tip], { narrow: true, foot });
    },
  });

  // ------------------------------------------------------------------ mode
  G.Game.register('royale', {
    layout: 'royale',
    music: 'royale',
    pausable: true,
    enter(params) {
      RY.match = new RY.Match(params || {});
      return RY.match.build();
    },
    exit() { if (RY.match) { G.safe('royale exit', () => RY.match.dispose()); RY.match = null; } },
    update(dt) { if (RY.match) RY.match.update(dt); },
    lateUpdate(dt) { if (RY.match) RY.match.late(dt); },
    restart() { G.Game.go('royale', Object.assign({}, G.Game.params)); },
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 25_royale.js]', e); }
// ---- 25b_royale_bots.js
try { (function () {
// 25b_royale_bots.js — the 15 FFA bot rangers of Sky Drop Royale.
//   RY.Bots.create(match, ent) -> actor. Uses G.Bot (17c_bots.js) when present, else RY.FallbackBot
//     (humanoid near / one-mesh impostor far, steering + launch pads + weapon firing via G.Weapons ctx).
//   RY.Bots.think(match, ent)  royale brain: loot (first ~40 s) -> rotate into the ring -> fight visible
//     rangers (third-partying fights it hears) -> disengage + heal under 30 %. Sets actor.goal =
//     {type:'moveTo'|'loot'|'attack'|'flee', pos, target, from, sprint} and actor.target (opportunistic aim).
//   RY.Bots.SKILL[tier] and RY.Bots.mix(difficulty) (GDD §11d skill mix, aim error 4–10°).
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};
  const U = G.util;
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _e = new V3(), _f = new V3();

  const SKILL = [
    { id: 'weak', aimErr: 10, react: 0.75, engage: 26, sense: 48, turn: 4.5, strafe: 0.5, burst: 0.9 },
    { id: 'medium', aimErr: 7, react: 0.5, engage: 32, sense: 58, turn: 6.5, strafe: 0.8, burst: 1.4 },
    { id: 'strong', aimErr: 4, react: 0.32, engage: 40, sense: 68, turn: 9, strafe: 1, burst: 2.2 },
  ];
  const AIM_SCALE = { breezy: 1.35, normal: 1, spicy: 0.85, blazing: 0.7 };
  const MIX = { breezy: [8, 6, 1], normal: [5, 7, 3], spicy: [3, 7, 5], blazing: [1, 6, 8] };

  // ------------------------------------------------------------------ fallback bot actor
  class FallbackBot extends G.Actor {
    constructor(world, ent, match) {
      super(world, { r: 0.42, h: 1.75, team: ent.team, hp: 100, shield: RY.SHIELD[0].max, kind: 'ranger' });
      this.isBot = true; this.isRanger = true; this.royEnt = ent; this.m = match;
      this.critY = 1.36; this.step = 0.5;
      this.yaw = 0; this.aimYaw = 0; this.aimPitch = 0;
      this.goal = null; this.target = null; this.holdFire = false;
      this.weapons = []; this.wi = 0; this.equipT = 0; this.speedMod = 1;
      this.stuckT = 0; this.sideT = 0; this.sideDir = 1; this.strafeT = 0; this.errT = 0; this.err = new V3();
      this.reactT = 0; this.lastTgt = null; this.burstT = 0; this.pauseT = 0; this.deadT = 0; this.hurtT = 0;
      this.firing = false; this.damageDealt = 0; this.kills = 0;
      this.mesh = new THREE.Group();
      const model = RY.rangerModel(ent.colors);
      this.far = model.group; this.mesh.add(this.far);
      this.hum = null;
      if (G.Geo.humanoid) {
        this.hum = G.safe('bot humanoid', () => G.Geo.humanoid(ent.colors, { seed: ent.colors && ent.colors.seed != null ? ent.colors.seed : ent.idx }));
        if (this.hum) { this.mesh.add(this.hum.group); this.hum.group.visible = false; }
      }
      this.lod = -1;
      // rendered facing (spring on the sim yaw), reused anim opts and weapon ctx (no per-frame objects)
      this._vyaw = { x: NaN, v: 0, t: 0, f: 2.9, z: 1 };
      this._ho = { speed: 0, vx: 0, vz: 0, vy: 0, yaw: 0, turn: 0, grounded: true, detail: 1 };
      this._wctx = { world, owner: this, firing: false, fireP: false, eye: null, eyeDir: null, origin: null, dir: null, aimPoint: null, target: null, team: this.team };
    }
    get weapon() { return this.weapons[this.wi] || null; }
    get sprinting() { return false; }
    onFired() {}
    aimPoint(out) { return (out || new V3()).set(this.pos.x, this.pos.y + 1.05, this.pos.z); }
    onHurt(info, amt) {
      this.hurtT = 0.15;
      const h = this.hum;
      if (h && h.hit && !(info && info.type === 'dot')) {
        let dx = 0, dz = 0;
        const d = info && info.dir, sp = (info && info.pos) || (info && info.src && info.src.pos);
        if (d && d.lengthSq && d.lengthSq() > 1e-6) { dx = d.x; dz = d.z; } else if (sp) { dx = this.pos.x - sp.x; dz = this.pos.z - sp.z; }
        h.hit(dx, dz, U.clamp(0.35 + (amt || 0) / 40, 0.35, 1.1), (amt || 0) >= (this.maxHp + this.maxShield) * 0.25);
      }
    }
    onDeath() {
      this.deadT = 0;
      const w = this.world, p = this.aimPoint(_a);
      w.fx.confetti(p, 34);
      w.fx.burst(p, [this.royEnt.colors.main, this.royEnt.colors.accent, 0xffffff], 22, 6, 0.25, 0.6);
      w.fx.ring(this.pos, 2.2, 0x9ff6ff, 0.5, this.pos.y + 0.1);
      if (G.Audio) G.Audio.sfxAt('enemyDie', p);
    }
    stunned() { return this.stunT > 0 || this.dancing || this.planted || this.frozen; }
    update(dt) {
      const w = this.world, m = this.m;
      this.applyStatus(dt);
      if (!this.alive) {
        this.deadT += dt;
        if (this.hum && this.hum.group.visible && G.Geo.animateHumanoid) G.Geo.animateHumanoid(this.hum, 'dead', w.time, dt);
        const k = U.clamp(this.deadT / 0.3, 0, 1);
        this.far.scale.setScalar(Math.max(0.001, (1 - k) * (1 + 0.4 * Math.sin(k * PI))));
        if (this.deadT > 0.45) this.dead = true;
        return;
      }
      const st = this.stunned();
      const g = this.goal, v = this.vel;
      let wx = 0, wz = 0, spd = 0, face = null;
      if (!st && g) {
        if ((g.type === 'moveTo' || g.type === 'loot') && g.pos) {
          const dx = g.pos.x - this.pos.x, dz = g.pos.z - this.pos.z, d = Math.hypot(dx, dz);
          if (d > (g.r || 0.6)) { wx = dx / d; wz = dz / d; spd = g.sprint ? 7.0 : 5.2; if (d < 3) spd *= Math.max(0.35, d / 3); }
        } else if (g.type === 'attack' && g.target && g.target.alive) {
          const t = g.target, dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
          const pref = g.range || 12;
          const nx = dx / d, nz = dz / d;
          let radial = d > pref + 3 ? 1 : d < pref - 3 ? -0.8 : 0;
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = U.rand(0.8, 2.2); this.sideDir = Math.random() < 0.5 ? -1 : 1; this.pauseT = Math.random() < 0.25 ? 0.5 : 0; }
          const sk = this.royEnt.skill.strafe;
          const side = this.pauseT > 0 ? 0 : this.sideDir * sk;
          this.pauseT -= dt;
          wx = nx * radial - nz * side; wz = nz * radial + nx * side;
          const l = Math.hypot(wx, wz); if (l > 0.01) { wx /= l; wz /= l; spd = radial > 0 ? 5.5 : 4.4; }
          face = t;
        } else if (g.type === 'flee' && g.from) {
          const dx = this.pos.x - g.from.x, dz = this.pos.z - g.from.z, d = Math.hypot(dx, dz) || 1;
          wx = dx / d; wz = dz / d; spd = 6.8;
          if (g.pos) { const ex = g.pos.x - this.pos.x, ez = g.pos.z - this.pos.z, el = Math.hypot(ex, ez) || 1; wx = wx * 0.5 + ex / el * 0.5; wz = wz * 0.5 + ez / el * 0.5; const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l; }
        }
      }
      // obstacle side-step
      if (this.sideT > 0) {
        this.sideT -= dt;
        const a = this.sideDir * 1.15, c = Math.cos(a), s = Math.sin(a);
        const nx = wx * c - wz * s; wz = wx * s + wz * c; wx = nx;
      }
      // keep out of the sea
      if (spd > 0) {
        const ax = this.pos.x + wx * 3, az = this.pos.z + wz * 3;
        if (m.map.hf(ax, az) < 0.3) { const l = Math.hypot(this.pos.x, this.pos.z) || 1; wx = U.lerp(wx, -this.pos.x / l, 0.7); wz = U.lerp(wz, -this.pos.z / l, 0.7); const ll = Math.hypot(wx, wz) || 1; wx /= ll; wz /= ll; }
      }
      spd *= this.speedMod * (this.slowK || 1) * (this.royEnt.healing ? 0.6 : 1);
      if (this.padT > 0) { this.padT -= dt; if (this.grounded && this.padT < 2.3) this.padT = 0; }
      const k = this.padT > 0 ? 0 : this.grounded ? Math.min(1, 12 * dt) : Math.min(1, 2.5 * dt);
      v.x += (wx * spd - v.x) * k; v.z += (wz * spd - v.z) * k;
      // jumps when stuck
      if (this.grounded && spd > 0.5 && this.hitWall) {
        this.stuckT += dt;
        if (this.stuckT > 0.18) { v.y = 7.2; this.grounded = false; if (this.stuckT > 0.6) { this.sideT = 0.9; this.sideDir = Math.random() < 0.5 ? -1 : 1; this.stuckT = 0; } }
      } else if (!this.hitWall) this.stuckT = Math.max(0, this.stuckT - dt);
      // launch pads
      if (this.grounded) for (const p of m.map.pads) {
        if (Math.abs(this.pos.x - p.x) < 1.3 && Math.abs(this.pos.z - p.z) < 1.3 && Math.abs(this.pos.y - p.y) < 0.8) {
          v.set(p.vx, p.vy, p.vz); this.grounded = false; this.padT = 2.5;
          w.fx.ring(this.pos, 1.6, 0x5cffe1, 0.4, this.pos.y + 0.2);
          if (G.Audio) G.Audio.sfxAt('boost', this.pos);
          break;
        }
      }
      v.y -= (v.y > 0 ? 20 : 27) * dt; if (v.y < -28) v.y = -28;
      w.phys.moveBody(this, dt);
      if (this.grounded && this.pos.y > 0.4) { this.safeX = this.pos.x; this.safeZ = this.pos.z; this.safeY = this.pos.y; }
      if (this.fell || this.pos.y < -1.4) {
        const x = this.safeX != null ? this.safeX : 0, z = this.safeZ != null ? this.safeZ : 0;
        this.pos.set(x, (this.safeY != null ? this.safeY : m.map.hf(x, z)) + 0.5, z); v.set(0, 0, 0);
      }
      // aim + fire
      const tgt = face || (this.target && this.target.alive ? this.target : null);
      this.firing = false;
      const wpn = this.weapon;
      if (tgt && !st) {
        const dist = this.pos.distanceTo(tgt.pos);
        this.errT -= dt;
        if (this.errT <= 0 || tgt !== this.lastTgt) {
          this.errT = U.rand(0.25, 0.5);
          const sk = this.royEnt.skill, err = sk.aimErr * DEG * (AIM_SCALE[m.diff] || 1) * (tgt.isPlayer ? 1.0 : 0.9);
          const mag = Math.tan(err) * dist * U.rand(0.2, 1.1);
          this.err.set(U.rand(-1, 1), U.rand(-0.6, 0.6), U.rand(-1, 1)).normalize().multiplyScalar(mag);
          if (tgt !== this.lastTgt) { this.reactT = sk.react * U.rand(0.8, 1.25); this.lastTgt = tgt; }
        }
        tgt.aimPoint(_b).add(this.err);
        _a.set(this.pos.x, this.pos.y + 1.45, this.pos.z);
        const dx = _b.x - _a.x, dy = _b.y - _a.y, dz = _b.z - _a.z;
        const wantYaw = Math.atan2(-dx, -dz), wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
        const turn = this.royEnt.skill.turn;
        this.aimYaw = U.angleDamp(this.aimYaw, wantYaw, turn, dt);
        this.aimPitch = U.damp(this.aimPitch, wantPitch, turn, dt);
        this.reactT -= dt;
        const off = Math.abs(U.wrapAngle(this.aimYaw - wantYaw)) + Math.abs(this.aimPitch - wantPitch);
        const range = wpn && wpn.def ? (wpn.def.range || 40) * 1.15 : 40;
        this.burstT -= dt;
        if (this.burstT < -0.6) this.burstT = this.royEnt.skill.burst * U.rand(0.7, 1.3);
        if (!this.holdFire && this.reactT <= 0 && off < 0.3 && dist < range && this.royEnt.losOk && this.burstT > 0) this.firing = true;
        this.yaw = U.angleDamp(this.yaw, this.aimYaw, 10, dt);
      } else {
        this.reactT = Math.max(this.reactT, 0.2);
        const hs = Math.hypot(v.x, v.z);
        if (hs > 0.6) { this.yaw = U.angleDamp(this.yaw, Math.atan2(-v.x, -v.z), 8, dt); this.aimYaw = this.yaw; }
        this.aimPitch = U.damp(this.aimPitch, 0, 4, dt);
      }
      for (let i = 0; i < this.weapons.length; i++) {
        const wi = this.weapons[i];
        try {
          if (i === this.wi) wi.update(dt, this._ctx(this.firing, tgt));
          else if (wi.idle) wi.idle(dt);
        } catch (e) { console.error('[bot weapon]', e); G.bus.emit('error', 'bot weapon', e); }
      }
      this._visual(dt);
    }
    // weapon ctx: one object per bot refilled each call (weapons copy what they keep)
    _ctx(firing, tgt) {
      const eye = _c.set(this.pos.x, this.pos.y + 1.45, this.pos.z);
      const cp = Math.cos(this.aimPitch);
      const dir = _d.set(-Math.sin(this.aimYaw) * cp, Math.sin(this.aimPitch), -Math.cos(this.aimYaw) * cp);
      const right = _e.set(Math.cos(this.aimYaw), 0, -Math.sin(this.aimYaw));
      const origin = _f.copy(eye).addScaledVector(dir, 0.5).addScaledVector(right, 0.2); origin.y -= 0.2;
      const aim = (this._aimP || (this._aimP = new V3())).copy(eye).addScaledVector(dir, tgt ? Math.max(2, eye.distanceTo(tgt.pos)) : 40);
      const pdir = (this._pd || (this._pd = new V3())).copy(aim).sub(origin).normalize();
      const c = this._wctx;
      c.world = this.world; c.firing = firing; c.fireP = firing && !this._wasFiring; c.eye = eye; c.eyeDir = dir; c.origin = origin; c.dir = pdir; c.aimPoint = aim; c.target = tgt; c.team = this.team;
      return c;
    }
    _visual(dt) {
      const cam = G.R.camera;
      const d2 = cam.position.distanceToSquared(this.pos);
      // hysteresis around the 46 m rig / impostor swap (in at 44 m, out at 48 m) so a bot hovering at the edge never flickers
      const lod = d2 > 200 * 200 ? 2 : (!this.hum || d2 > (this.lod === 0 ? 48 * 48 : 44 * 44)) ? 1 : 0;
      if (lod !== this.lod) {
        this.lod = lod;
        this.far.visible = lod === 1; if (this.hum) this.hum.group.visible = lod === 0;
        this.mesh.visible = lod !== 2;
      }
      // rendered facing eases toward the sim yaw (no snaps)
      const vy = this._vyaw;
      if (vy.x !== vy.x) { vy.x = this.yaw; vy.v = 0; }
      vy.t = vy.x + U.wrapAngle(this.yaw - vy.x);
      if (G.Geo.springStep) G.Geo.springStep(vy, dt); else vy.x = vy.t;
      if (vy.x > 40 || vy.x < -40) vy.x = U.wrapAngle(vy.x);
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = vy.x + PI;
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (lod === 0 && G.Geo.animateHumanoid) {
        const state = this.hurtT > 0 ? 'hurt' : this.firing ? 'shoot' : !this.grounded ? 'jump' : hs > 0.6 ? 'run' : 'idle';
        const o = this._ho;
        o.speed = hs; o.vx = this.vel.x; o.vz = this.vel.z; o.vy = this.vel.y; o.yaw = vy.x + PI; o.turn = vy.v; o.grounded = !!this.grounded;
        o.detail = U.clamp((44 - Math.sqrt(d2)) / 4, 0, 1);   // limbs settle to rest inside 44 m: both swaps (44 / 48 m) are pop-free
        G.Geo.animateHumanoid(this.hum, state, this.world.time, dt, o);
      } else if (lod === 1) {
        const body = this.far.children[0];
        if (body) { body.position.y = this.grounded && hs > 0.6 ? Math.abs(Math.sin(this.world.time * 11 + this.id)) * 0.07 : 0; body.rotation.x = 0; }
      }
      this.hurtT -= dt;
      this._wasFiring = this.firing;
    }
    dispose() {
      super.dispose();
      for (const wpn of this.weapons) if (wpn.onUnequip) G.safe('bot unequip', () => wpn.onUnequip());
      if (this.hum && this.hum.dispose) this.hum.dispose();
    }
  }
  RY.FallbackBot = FallbackBot;

  // ------------------------------------------------------------------ factory
  const Bots = RY.Bots = { SKILL, MIX, BVB: 0.35 };
  Bots.mix = function (diff) {
    const m = MIX[diff] || MIX.normal, out = [];
    for (let i = 0; i < 3; i++) for (let k = 0; k < m[i]; k++) out.push(i);
    return U.shuffle(out);
  };
  const REACT_SCALE = { breezy: 1.3, normal: 1, spicy: 0.85, blazing: 0.7 };
  Bots.create = function (match, ent) {
    let a = null;
    const sk = ent.skill;
    // the slot picks the ranger's helmet / build (G.Geo.humanoid seed), so 15 bots read as different people by
    // silhouette, the same during the sky drop (RY.rangerModel reads ent.colors too) and on the ground
    if (ent.colors && ent.colors.seed == null) ent.colors = Object.assign({ seed: ent.idx != null ? ent.idx : 0 }, ent.colors);
    if (G.Bot && RY.USE_GBOT !== false) {
      a = G.safe('G.Bot create', () => {
        const skill = { aimErr: sk.aimErr * (AIM_SCALE[match.diff] || 1), react: sk.react * (REACT_SCALE[match.diff] || 1), turn: sk.turn, strafe: sk.strafe, burst: sk.burst, engage: sk.engage };
        const b = new G.Bot(match.world, { team: ent.team, colors: ent.colors, name: ent.name, difficulty: match.diff, skill, hp: 100, shield: RY.SHIELD[0].max, royale: true, weapons: [], autoTarget: true, fleeHp: 0.12, engageRange: sk.engage, nameTag: false });
        return b && b.pos ? b : null;
      });
      if (a) {
        a.isRanger = true; a.royEnt = ent; a.maxShield = a.shield = RY.SHIELD[0].max; a.maxHp = a.hp = 100;
        if (a.tag && a.tag.parent) a.tag.parent.remove(a.tag);  // name tags are drawn in the DOM by the royale HUD
        const hf = match.map.hf;
        a.walkable = (x, z) => hf(x, z) >= 0.3;                   // stay out of the sea
        a.onThink = () => G.safe('roy think', () => Bots.think(match, ent));
        a.gbot = true;
        // (no extra LOD override needed: G.Bot's ranger is 2 draw calls up close and 1 beyond ~30 m)
      }
    }
    if (!a) a = new FallbackBot(match.world, ent, match);
    a.mmColor = '#' + ent.colors.main.toString(16).padStart(6, '0');
    // Bot-vs-bot damage is scaled by a pacing director (see Bots.bvb) so the lobby thins out over the whole
    // match and the player always has fights to join; damage from/to the player is unchanged.
    const take = a.takeDamage;
    a.takeDamage = function (amt, info) { return take.call(this, info && info.src && info.src.isBot && info.src !== this ? amt * Bots.bvb(match) : amt, info); };
    return a;
  };
  // Pacing director: rangers left should follow a smooth curve from 16 down to ~2 as the ring closes
  // (~6.5 min). Bot-vs-bot damage drops when bots are eliminating each other too fast, and rises when the
  // island is still crowded late.
  Bots.targetAlive = function (match) {
    const T = 390 * (match.timeK || 1), k = U.clamp(match.t / T, 0, 1);
    return Math.max(2, 16 - 14 * Math.pow(k, 0.85));
  };
  Bots.bvb = function (match) {
    if (match._bvbT != null && Math.abs(match.t - match._bvbT) < 1) return match._bvb;
    match._bvbT = match.t;
    const alive = match.aliveCount(), r = alive / Bots.targetAlive(match), r3 = r * r * r;
    // early skirmishes are scrappy (long fights, room to escape or get third-partied), late ones decisive
    const base = U.lerp(0.2, 0.5, U.smoothstep(60, 300, match.t / (match.timeK || 1)));
    const k = alive > 4 ? U.clamp(r3, 0.45, 2.2) : Math.max(1, Math.min(2.2, r3));
    return (match._bvb = base * k);
  };
  // Push the inventory weapons onto the actor.
  Bots.applyWeapons = function (ent) {
    const a = ent.actor;
    const list = ent.inv.slots.filter(Boolean).map(s => s.inst);
    const cur = a.weapon;
    if (a.setWeapons) { a.setWeapons(list); return; }
    a.weapons = list;
    const ci = list.indexOf(cur);
    a.wi = ci >= 0 ? ci : list.length - 1;
  };

  // ------------------------------------------------------------------ brain
  const near = [];
  function los(match, a, b) {
    _a.set(a.pos.x, a.pos.y + 1.45, a.pos.z);
    _b.set(b.pos.x, b.pos.y + 1.2, b.pos.z);
    return match.world.phys.los(_a, _b, false);
  }
  function itemValue(ent, it) {
    const inv = ent.inv, a = ent.actor;
    switch (it.kind) {
      case 'weapon': {
        const p = RY.weaponPower(it.type, it.rar);
        if (RY.Inv.freeSlot(inv) >= 0) return 4 + p * 2;
        const ws = inv.slots[RY.Inv.worstSlot(inv)];
        const wp = ws ? RY.weaponPower(ws.id, ws.rar) : 0;
        return p > wp + 0.25 ? 2 + (p - wp) * 4 : 0;
      }
      case 'heal': {
        if (inv.heals[it.type] >= RY.HEALS[it.type].stack) return 0;
        const h = RY.HEALS[it.type];
        return (h.sh ? 2.2 : 1.8) + (h.sh && a.shield < a.maxShield ? 1 : 0) + (h.hp && a.hp < 60 ? 1.5 : 0);
      }
      case 'ammo': return RY.Inv.canTake(inv, it) === 'take' ? 1.6 : 0;
      case 'throw': return RY.Inv.canTake(inv, it) === 'take' && ent.skill.id !== 'weak' ? 1.2 : 0;
    }
    return 0;
  }
  // Launch pad that flings a ranger up to a raised spot (mesa / mushroom top) near (x, y, z), if any.
  function padFor(match, x, y, z) {
    for (const p of match.map.pads) if (Math.hypot(p.tx - x, p.tz - z) < 7 && Math.abs(p.ty - y) < 2.5) return p;
    return null;
  }
  // Raised loot (mesa / mushroom tops, castle walls, decks) is worth a detour only when we can get up there:
  // the height-aware navgrid knows ramps; launch pads cover the rest.
  function reachInfo(match, ent, x, y, z) {
    const a = ent.actor;
    const nav = G.Bot && G.Bot.nav ? G.Bot.nav(match.world) : null;
    if (y - a.pos.y < 1.8) {
      // loot tucked into a pocket (building interior behind a narrow door): leave it to the player
      if (nav) { const r = nav.region(x, z, y), me = nav.region(a.pos.x, a.pos.z, a.pos.y); if (r && me && r.id !== me.id && r.size < 40) return { ok: false, pad: null }; }
      return { ok: true, pad: null };
    }
    const pad = padFor(match, x, y, z);
    if (pad) return { ok: true, pad };
    if (nav) {
      const k = nav.idx(x, z);
      if (k >= 0 && nav.ok[k] && Math.abs(nav.h[k] - y) < 1.2) {
        const p = G.safe('roy loot path', () => nav.findPath(a.pos.x, a.pos.z, x, z, 900, (px, pz) => match.map.hf(px, pz) >= 0.3, a.pos.y, y));
        if (p && !p.partial) return { ok: true, pad: null };
      }
    }
    return { ok: false, pad: null };
  }
  function skipped(ent, it, now) { const s = ent.skip; return !!(s && s.has(it) && now < s.get(it)); }
  function findLoot(match, ent, radius) {
    const a = ent.actor, loot = match.loot, now = match.world.time;
    let best = null, bs = 0;
    loot.near(a.pos, radius, near);
    for (const it of near) {
      if (it.vel || (it.claim && it.claim !== ent && now - it.claimT < 5) || skipped(ent, it, now)) continue;
      const v = itemValue(ent, it); if (v <= 0) continue;
      const d = Math.hypot(it.pos.x - a.pos.x, it.pos.z - a.pos.z) + Math.max(0, it.pos.y - a.pos.y - 1.5) * 3;
      const s = v / (d + 6);
      if (s > bs) { bs = s; best = it; }
    }
    for (const b of loot.bins) {
      if (b.open || (b.drop && !b.drop.landed) || skipped(ent, b, now)) continue;
      if (b.claim && b.claim !== ent && now - b.claimT < 6) continue;
      const d = Math.hypot(b.x - a.pos.x, b.z - a.pos.z); if (d > radius) continue;
      const s = (b.drop ? 12 : 4.5) / (d + Math.max(0, b.y - a.pos.y - 1.5) * 3 + 6);
      if (s > bs) { bs = s; best = b; }
    }
    return best;
  }
  function skip(ent, it, now, sec) { (ent.skip || (ent.skip = new Map())).set(it, now + sec); }
  function setGoal(a, type, pos, extra) {
    const g = a.goal || (a.goal = { pos: new V3() });
    g.type = type; if (pos) g.pos.copy(pos);
    g.target = null; g.from = null; g.sprint = false; g.r = 0.6; g.item = null; g.range = 12; g.passive = false; g.done = false;
    if (extra) Object.assign(g, extra);
    return g;
  }
  function pickWeapon(ent, dist) {
    const a = ent.actor, slots = ent.inv.slots.filter(Boolean);
    let bi = 0, bs = -1;
    slots.forEach((s, i) => {
      const inst = s.inst, r = inst.def ? (inst.def.range || 30) : 30;
      if (inst.maxAmmo && isFinite(inst.maxAmmo) && inst.ammo <= 0) return;
      let sc = RY.weaponPower(s.id, s.rar);
      if (dist > r * 1.1) sc *= 0.35;
      if (s.id === 'scatter' && dist < 10) sc *= 1.6;
      if (s.id === 'lancer' && dist > 25) sc *= 1.4;
      if ((s.id === 'lobber' || s.id === 'swarm') && dist < 5) sc *= 0.5;
      if (sc > bs) { bs = sc; bi = i; }
    });
    if (a.wi !== bi) {
      if (a.equip) { a.equip(bi); return; }
      const old = a.weapon; if (old && old.onUnequip) G.safe('bot swap', () => old.onUnequip()); a.wi = bi; const nw = a.weapon; if (nw && nw.onEquip) G.safe('bot equip', () => nw.onEquip());
    }
  }
  Bots.think = function (match, ent) {
    const a = ent.actor, w = match.world, now = w.time, ring = match.ring;
    if (!a.alive) return;
    const sk = ent.skill;
    // --- perception: nearest rangers, LOS on the two closest
    let cand1 = null, cand2 = null, d1 = Infinity, d2 = Infinity;
    for (const o of match.rangers) {
      if (o === ent || !o.alive || o.state !== 'ground' || !o.actor.alive) continue;
      let d = a.pos.distanceTo(o.actor.pos);
      if (d > sk.sense) continue;
      if (ent.lastAttacker === o.actor && now - ent.lastHitT < 4) d -= 25;
      if (d < d1) { d2 = d1; cand2 = cand1; d1 = d; cand1 = o; } else if (d < d2) { d2 = d; cand2 = o; }
    }
    let vis = null, vd = Infinity;
    if (a.gbot) {
      const t = a.target;
      if (t && t.alive && a.hasLOS && t.royEnt && t.royEnt.state === 'ground') { vis = t.royEnt; vd = a.pos.distanceTo(t.pos); }
    } else {
      for (const o of [cand1, cand2]) {
        if (!o) continue;
        if (los(match, a, o.actor)) { const d = a.pos.distanceTo(o.actor.pos); if (d < vd) { vd = d; vis = o; } }
      }
      a.target = vis ? vis.actor : null;
    }
    ent.losOk = !!vis;
    if (vis) ent.seenT = now;
    // --- ring urgency
    const p = a.pos;
    const outside = ring.phase !== 'idle' && !ring.contains(p.x, p.z, 3);
    const outNext = ring.phase !== 'idle' && !ring.inNext(p.x, p.z, 4);
    const tl = ring.timeLeft();
    const travel = ring.distToNext(p.x, p.z) / 6;
    const urgent = outside || (outNext && (ring.phase === 'close' || tl < travel + 12));
    const frac = (a.hp + a.shield) / (a.maxHp + a.maxShield);
    const healN = RY.Inv.healCount(ent.inv);
    const sinceLand = now - (ent.landT || 0);
    // --- healing in progress (keep walking: out of the storm when it is coming, else away from danger)
    if (ent.healing) {
      if (vis && vd < 9) { ent.healing = null; a.holdFire = false; }
      else {
        a.holdFire = true;
        if (urgent) { const sp = ring.safePoint(ent.idx * 7 + Math.floor(now / 20), 10); setGoal(a, 'moveTo', _c.set(sp.x, 0, sp.z), { sprint: true, r: 3 }); }
        else setGoal(a, 'flee', null, { from: ent.lastAttacker && ent.lastAttacker !== a ? ent.lastAttacker.pos : _d.set(p.x + 1, p.y, p.z) });
        return;
      }
    }
    if (ent.lootDur == null) ent.lootDur = 38 + Math.random() * 24;   // staggered: bots do not all turn hostile at once
    const lootPhase = sinceLand < ent.lootDur;
    const threatened = now - ent.lastHitT < 3;
    // Pacing: early on bots loot, and when they have already thinned out faster than planned, they do not pick
    // new fights with each other (they still shoot back). The player is always fair game.
    const calm = lootPhase || match.aliveCount() < Bots.targetAlive(match) - 2;
    a.holdFire = !!(calm && !threatened && a.target && !a.target.isPlayer);
    if (vis) pickWeapon(ent, vd);
    // --- low health: disengage (and heal when possible)
    if (frac < 0.3 && (healN > 0 || frac < 0.2) && (!vis || vd > 10 || now - ent.lastHitT > 2.5 || healN === 0)) {
      if (!vis && now - ent.lastHitT > 1.4 && RY.Inv.smartPick(ent.inv, a)) { match.botStartHeal(ent); return; }
      const from = vis ? vis.actor.pos : (ent.lastAttacker ? ent.lastAttacker.pos : p);
      setGoal(a, 'flee', urgent ? ring.safePoint(ent.idx + 3, 8) : null, { from });
      return;
    }
    // --- top-up heals when calm
    if (!vis && now - ent.lastHitT > 4 && (a.shield < a.maxShield - 20 || a.hp < a.maxHp - 30) && RY.Inv.smartPick(ent.inv, a) && !urgent) { match.botStartHeal(ent); return; }
    // --- ring
    if (urgent) {
      const sp = ring.safePoint(ent.idx * 7 + Math.floor(now / 20), 10);
      setGoal(a, 'moveTo', _c.set(sp.x, 0, sp.z), { sprint: true, r: 3 });
      return;
    }
    // --- fight (early on: only when threatened, or the player comes close)
    const aggro = sk.id === 'strong' ? 1 : sk.id === 'medium' ? 0.75 : 0.5;
    const closeCall = vis && (vis.isPlayer ? vd < (lootPhase ? 12 : sk.engage * aggro) : (!calm && vd < sk.engage * aggro));
    if (vis && (threatened || closeCall)) {
      const wpn = a.weapon, r = wpn && wpn.def ? (wpn.def.range || 25) : 25;
      a.holdFire = false;
      setGoal(a, 'attack', null, { target: vis.actor, range: U.clamp(r * 0.5, 6, 22) });
      if (ent.inv.thr.n > 0 && vd > 7 && vd < 20 && now > (ent.thrCd || 0) && Math.random() < 0.35) match.botThrow(ent, vis.actor);
      return;
    }
    // --- third-party: head for fresh noise
    if (!lootPhase && RY.Inv.power(ent.inv) >= 2.4) {
      let best = null, bd = 85;
      for (const n of match.noise) { if (now - n.t > 4) continue; const d = Math.hypot(n.x - p.x, n.z - p.z); if (d < bd && d > 10) { bd = d; best = n; } }
      if (best && (sk.id !== 'weak' || Math.random() < 0.3) && ring.inNext(best.x, best.z, 0)) { setGoal(a, 'moveTo', _c.set(best.x, 0, best.z), { sprint: true, r: 8 }); return; }
    }
    // --- loot
    const weak = RY.Inv.freeSlot(ent.inv) >= 0 || healN < 2;
    if (lootPhase || weak || (a.goal && a.goal.type === 'loot' && a.goal.item && (a.goal.item.alive || a.goal.item.kind === 'bin'))) {
      const g = a.goal;
      let it = g && g.type === 'loot' && g.item && (g.item.alive || (g.item.kind === 'bin' && !g.item.open)) ? g.item : null;
      // give up on an item we stop closing in on (blocked, unreachable, or another ranger keeps it busy)
      if (it && ent.lootItem === it) {
        const ip = g && g.item === it ? g.pos : (it.pos || _c.set(it.x, it.y, it.z));   // the goal may be the item's launch pad
        const dd = Math.hypot(ip.x - p.x, ip.z - p.z);
        if (dd < ent.lootBest - 0.75) { ent.lootBest = dd; ent.lootProgT = now; }
        if (now - ent.lootProgT > 5 || now - ent.lootT > 25) { skip(ent, it, now, 40); it = null; }
      }
      for (let tries = 0; tries < 3; tries++) {
        if (!it) it = findLoot(match, ent, lootPhase ? 40 : 28);
        if (!it) break;
        const ip = it.pos || _c.set(it.x, it.y, it.z);
        const ri = it === ent.lootItem && ent.lootReach ? ent.lootReach : reachInfo(match, ent, ip.x, ip.y, ip.z);
        if (!ri.ok) { skip(ent, it, now, 45); it = null; continue; }
        if (ent.lootItem !== it) { ent.lootItem = it; ent.lootT = ent.lootProgT = now; ent.lootBest = Infinity; }
        ent.lootReach = ri;
        it.claim = ent; it.claimT = now;
        // raised spot: walk onto its launch pad first (we land next to the loot), else straight to the item
        const viaPad = ri.pad && ip.y - a.pos.y > 1.8;
        const pos = viaPad ? _d.set(ri.pad.x, ri.pad.y, ri.pad.z) : (it.pos || _c.set(it.x, it.y, it.z));
        setGoal(a, 'loot', pos, { item: it, r: viaPad ? 0.25 : 0.5, passive: lootPhase && !threatened });
        return;
      }
    }
    // --- roam toward the safe zone (or a nearby POI)
    const g = a.goal;
    if (!g || g.type !== 'moveTo' || g.done || Math.hypot(g.pos.x - p.x, g.pos.z - p.z) < 6 || now - (ent.roamT || 0) > 18) {
      ent.roamT = now;
      let tx, tz;
      if (ring.phase === 'idle' || Math.random() < 0.4) {
        const poi = match.map.pois[(Math.random() * match.map.pois.length) | 0];
        tx = poi.x + U.rand(-poi.r, poi.r) * 0.6; tz = poi.z + U.rand(-poi.r, poi.r) * 0.6;
        if (ring.phase !== 'idle' && !ring.inNext(tx, tz, 6)) { const sp = ring.safePoint(ent.idx * 13 + now, 10); tx = sp.x; tz = sp.z; }
      } else { const sp = ring.safePoint(ent.idx * 13 + Math.floor(now), 10); tx = sp.x; tz = sp.z; }
      setGoal(a, 'moveTo', _c.set(tx, 0, tz), { r: 4, passive: sk.id !== 'strong' });
    }
    if (a.goal && a.goal.type === 'moveTo' && threatened) a.goal.passive = false;
  };
  // Arrived at loot? (called every frame for bots with a loot goal)
  Bots.reach = function (match, ent) {
    const a = ent.actor, g = a.goal;
    if (!g || g.type !== 'loot' || !g.item) return;
    const it = g.item;
    if (it.kind === 'bin') {
      if (it.open) { g.item = null; return; }
      if (Math.hypot(it.x - a.pos.x, it.z - a.pos.z) < 1.9 && Math.abs(it.y - a.pos.y) < 1.6) { match.loot.openBin(it, ent); g.item = null; ent.thinkT = 0.25; }
      return;
    }
    if (!it.alive) { g.item = null; return; }
    if (Math.hypot(it.pos.x - a.pos.x, it.pos.z - a.pos.z) < 1.5 && Math.abs(it.pos.y - a.pos.y) < 1.6) {
      match.give(ent, it, true);
      g.item = null; ent.thinkT = 0.05;
    }
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 25b_royale_bots.js]', e); }
// ---- 25b_royale_drop.js
try { (function () {
// 25b_royale_drop.js — Captain Gale's airship, skydive + glide-wing landing (player and bots),
// ranger models for third-person views, and the sky / spectate cameras.
//   RY.Airship(match): path {a, b, dir}, pos, k (0..1), update(dt), closestK(x, z), dispose()
//   RY.Sky: start(ent, pos, vel), update(ent, dt, input?) -> true when landed, camera(ent, dt)
//   RY.rangerModel(colors) -> {group, wings, set(pose, t, dt)} (G.Geo.humanoid when available)
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};
  const U = G.util;
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2, HP = PI / 2;
  const _v = new V3(), _w = new V3(), _t = new V3(), _look = new V3();

  // ------------------------------------------------------------------ airship model
  function airshipMesh() {
    const k = new G.Geo.Kit(), P = G.Geo.P;
    const env = G.Geo.lathe([[0, -14], [2.6, -12.6], [5.2, -8.5], [6.4, -3], [6.5, 2], [5.6, 7.5], [3.4, 11.5], [0, 13.5]], 24);
    G.Geo.xf(env, 0, 0, 0, HP, 0, 0);
    k.add(env, (x, y, z) => { const a = Math.atan2(y, x); return Math.sin(a * 4) > 0.55 ? 0xfff1dc : (z > 9 || z < -10) ? 0xff6b8b : 0xff8a4c; }, 0, 11, 0);
    k.add(P.tor(6.55, 0.22, 6, 32), 0xe8b44a, 0, 11, 0, 0, 0, 0);
    for (const s of [[0, 1], [0, -1], [1, 0], [-1, 0]]) k.add(P.rbox(0.35 + Math.abs(s[0]) * 3.2, 0.35 + Math.abs(s[1]) * 3.2, 4.2, 0.15), 0x2cc3d6, s[0] * 2.4, 11 + s[1] * 2.4, -11.5);
    k.add(P.rbox(9, 2.4, 4, 0.5), 0x9a6440, 0, 2.4, 0);
    k.add(P.rbox(9.4, 0.3, 4.4, 0.12), 0xe8b44a, 0, 3.7, 0);
    k.add(P.rbox(9.4, 0.25, 4.4, 0.1), 0x1f2a5a, 0, 1.2, 0);
    for (let i = 0; i < 4; i++) k.glow(P.cyl(0.42, 0.42, 0.15, 12), 0xffe9a8, -3.3 + i * 2.2, 2.6, 2.05, HP, 0, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.cyl(0.07, 0.07, 6, 5), 0x1f2a5a, sx * 3.8, 6.7, sz * 1.6, sz * 0.35, 0, -sx * 0.18);
    for (const sx of [-1, 1]) { k.add(P.cyl(0.35, 0.5, 1.6, 10), 0x5b3a8c, sx * 5.2, 2.8, -1.8, HP, 0, 0); }
    k.add(P.rbox(2.6, 1.6, 2.4, 0.4), 0x2cc3d6, 0, 4.6, 2.2);
    k.glow(P.rbox(2.0, 0.6, 0.1, 0.1), 0xc8f6ff, 0, 4.8, 3.4);
    const d = k.data();
    const mesh = new THREE.Mesh(d.solid, G.M.vc({ rimStr: 0.35, spec: 0.3 }));
    if (d.glow) mesh.add(new THREE.Mesh(d.glow, G.Geo.glowMat()));
    // propellers (spinning)
    const pg = [];
    for (let i = 0; i < 3; i++) pg.push(G.Geo.colorize(G.Geo.xf(P.rbox(0.25, 1.6, 0.1, 0.05), 0, 0.8, 0, 0, 0, (i / 3) * TAU), 0xfff1dc));
    pg.push(G.Geo.colorize(P.sph(0.25, 8, 6), 0xffd23f));
    const props = [];
    const pgeo = G.Geo.merge(pg);
    for (const sx of [-1, 1]) { const pm = new THREE.Mesh(pgeo, G.M.vc()); pm.position.set(sx * 5.2, 2.8, -2.7); mesh.add(pm); props.push(pm); }
    mesh.userData.props = props;
    return mesh;
  }

  class Airship {
    constructor(match) {
      this.m = match; this.world = match.world;
      const rnd = match.rnd;
      const th = rnd() * TAU, off = (rnd() - 0.5) * 90;
      const dir = new V3(Math.cos(th), 0, Math.sin(th)), perp = new V3(-dir.z, 0, dir.x);
      const L = 235;
      this.alt = 112;
      this.a = new V3().copy(perp).multiplyScalar(off).addScaledVector(dir, -L).setY(this.alt);
      this.b = new V3().copy(perp).multiplyScalar(off).addScaledVector(dir, L).setY(this.alt);
      this.dir = dir; this.len = L * 2;
      this.dur = 25 * match.timeK;
      this.t = 0; this.k = 0;
      this.pos = this.a.clone();
      this.mesh = airshipMesh();
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      this.world.add(this.mesh);
      if (G.Geo.npc) {
        const npc = G.safe('gale npc', () => { const kinds = G.Geo.NPC_KINDS || []; const id = kinds.find(n => /gale/i.test(n)) || null; return id ? G.Geo.npc(id) : null; });
        if (npc && npc.group) { npc.group.position.set(0, 3.85, 1.2); npc.group.scale.setScalar(1.2); this.mesh.add(npc.group); this.npc = npc; }
      }
      // auto-drop point: leaving the island on the far side
      this.autoK = 1;
      for (let s = 0.5; s <= 1; s += 0.01) { const p = _v.lerpVectors(this.a, this.b, s); if (Math.hypot(p.x, p.z) > 150) { this.autoK = s; break; } }
    }
    closestK(x, z) {
      const t = ((x - this.a.x) * this.dir.x + (z - this.a.z) * this.dir.z) / this.len;
      return U.clamp(t, 0, 1);
    }
    update(dt) {
      this.t += dt;
      this.k = Math.min(1.25, this.t / this.dur);
      this.pos.lerpVectors(this.a, this.b, this.k);
      this.pos.y = this.alt + Math.sin(this.t * 0.8) * 0.6;
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.z = Math.sin(this.t * 0.6) * 0.03;
      for (const p of this.mesh.userData.props) p.rotation.z += dt * 14;
      if (this.npc && this.npc.animate) this.npc.animate(this.t, dt);
      this.mesh.visible = this.k < 1.24;
    }
    dispose() { if (this.npc && this.npc.dispose) this.npc.dispose(); }
  }
  RY.Airship = Airship;

  // ------------------------------------------------------------------ ranger model (sky phases / fallback bots)
  RY.rangerColors = function (i) {
    const C = [[0x2ec4b6, 0xffd23f], [0xff7a93, 0xfff1dc], [0x8f6bff, 0xffd45c], [0x3d7bff, 0xff8a1f], [0xffb627, 0x1f2a5a], [0x3fe0b8, 0xff5fa2],
      [0xff8a4c, 0x2cc3d6], [0xb983ff, 0x3fe0b8], [0x6ccb5f, 0xff7a93], [0xff5fa2, 0xffe08a], [0x2f7bff, 0xffd23f], [0xd99a5b, 0x8f6bff],
      [0x9fe8ff, 0xff6b8b], [0xffd45c, 0x5b3a8c], [0xff6b6b, 0xc8f6ff], [0x48b87a, 0xffb37a]];
    const c = C[i % C.length];
    return { main: c[0], accent: c[1], dark: 0x1f2a5a, visor: 0x39d5ff };
  };
  let wingGeo = null;
  function wings(color) {
    if (!wingGeo) {
      const P = G.Geo.P, parts = [];
      for (const sx of [-1, 1]) {
        const g = P.rbox(1.5, 0.08, 0.85, 0.04);
        G.Geo.xf(g, sx * 0.85, 0, 0, 0, 0, sx * 0.18);
        parts.push(G.Geo.colorize(g, (x, y, z) => (Math.abs(x) > 1.2 ? 0xffd23f : Math.floor((x + 3) * 2.5) % 2 ? 0xffffff : 0xdddddd)));
      }
      parts.push(G.Geo.colorize(P.rbox(0.4, 0.3, 0.3, 0.08), 0x1f2a5a));
      wingGeo = G.Geo.merge(parts); wingGeo.userData.shared = true;
    }
    const m = new THREE.Mesh(wingGeo, G.M.toon(color, { vc: true, rimStr: 0.4 }));
    return m;
  }
  const fbCache = new Map();
  // One merged vertex-coloured mesh per colour set: a single draw call per ranger.
  function fallbackBody(colors) {
    const key = colors.main + '|' + colors.accent;
    let g = fbCache.get(key);
    if (g) return g;
    const P = G.Geo.P, C = G.Geo.colorize, X = G.Geo.xf;
    const parts = [
      C(X(P.cap(0.33, 0.48, 3, 8), 0, 0.88, 0), colors.main),
      C(X(P.sph(0.31, 10, 7), 0, 1.52, 0), 0xffe0cc),
      C(X(P.sph(0.33, 10, 5), 0, 1.6, -0.04, 0, 0, 0, 1, 0.75, 1), colors.main),
      C(X(P.box(0.66, 0.13, 0.44), 0, 0.98, 0), colors.accent),
      C(X(P.cap(0.085, 0.38, 3, 6), -0.42, 0.98, 0, 0, 0, 0.22), colors.main),
      C(X(P.cap(0.085, 0.38, 3, 6), 0.42, 0.98, 0, 0, 0, -0.22), colors.main),
      C(X(P.sph(0.1, 6, 4), -0.5, 0.74, 0.02), colors.accent),
      C(X(P.sph(0.1, 6, 4), 0.5, 0.74, 0.02), colors.accent),
      C(X(P.cap(0.12, 0.3, 3, 6), -0.15, 0.3, 0), colors.dark),
      C(X(P.cap(0.12, 0.3, 3, 6), 0.15, 0.3, 0), colors.dark),
      C(X(P.box(0.26, 0.14, 0.36), -0.15, 0.07, 0.05), 0xfff1dc),
      C(X(P.box(0.26, 0.14, 0.36), 0.15, 0.07, 0.05), 0xfff1dc),
      C(X(P.rbox(0.44, 0.48, 0.24, 0.08), 0, 1.02, -0.32), colors.dark),
      C(X(P.box(0.46, 0.15, 0.1), 0, 1.55, 0.27), colors.visor),
      C(X(P.cone(0.07, 0.18, 6), -0.24, 1.82, 0, 0, 0, 0.5), 0xff9fc2),
      C(X(P.cone(0.07, 0.18, 6), 0.24, 1.82, 0, 0, 0, -0.5), 0xff9fc2),
    ];
    g = G.Geo.merge(parts); g.userData.shared = true;
    fbCache.set(key, g);
    return g;
  }
  RY.rangerModel = function (colors, opts) {
    opts = opts || {};
    const out = { group: new THREE.Group(), wings: null, h: null };
    if (G.Geo.humanoid && opts.detailed) {
      const h = G.safe('humanoid', () => G.Geo.humanoid(colors, opts));
      if (h && h.group) { out.h = h; out.group.add(h.group); }
    }
    if (!out.h) {
      const body = new THREE.Mesh(fallbackBody(colors), G.M.vc({ spec: 0.6, rimStr: 0.45 }));
      out.body = body;
      out.group.add(body);
    }
    out.wings = wings(colors.accent);
    out.wings.position.set(0, 1.05, -0.25);
    out.wings.visible = false;
    out.group.add(out.wings);
    out.set = function (pose, t, dt) {
      if (out.h && G.Geo.animateHumanoid) {
        G.safe('animHumanoid', () => G.Geo.animateHumanoid(out.h, pose === 'dive' || pose === 'glide' ? 'jump' : pose, t, dt, { speed: pose === 'run' ? 6 : 0 }));
        if (pose === 'dive' || pose === 'glide') { out.h.group.rotation.x = pose === 'dive' ? 1.25 : 0.3; out.h.group.position.y = pose === 'dive' ? 0.8 : 0; }
        else { out.h.group.rotation.x = 0; out.h.group.position.y = 0; }
      } else if (out.body) {
        out.body.rotation.x = pose === 'dive' ? 1.1 : pose === 'glide' ? 0.35 : 0;
        out.body.position.y = pose === 'run' ? Math.abs(Math.sin(t * 12)) * 0.08 : 0;
      }
      out.wings.visible = pose === 'glide';
    };
    return out;
  };

  // ------------------------------------------------------------------ skydive
  // ent.sky = {pos, vel, flare, model, ground}; returns true on landing.
  const Sky = RY.Sky = {
    FLARE: 30,
    start(match, ent, pos, vel) {
      ent.state = 'sky';
      const s = ent.sky || (ent.sky = { pos: new V3(), vel: new V3(), model: null });
      s.pos.copy(pos); s.vel.copy(vel || _v.set(0, 0, 0));
      s.flare = false; s.t = 0;
      if (!s.model) { s.model = RY.rangerModel(ent.colors, { detailed: ent.isPlayer }); match.world.add(s.model.group); }
      if (ent.isPlayer) { ent.actor.near = null; G.Input.show('interact', false); match.lootCand = null; }
      s.model.group.visible = true;
      ent.skyYaw = ent.skyYaw != null ? ent.skyYaw : 0;
    },
    // Player skydive: stick steers relative to the camera, looking down dives (GDD 12 m/s glide, 25 m/s dive).
    updatePlayer(match, ent, dt) {
      const s = ent.sky, inp = G.input, pl = ent.actor, map = match.map;
      const can = !G.UI.anyOpen();
      if (can) pl.look(inp.lookDX, inp.lookDY);
      pl.pitch = U.clamp(pl.pitch, -1.35, 0.5);
      const g = match.world.phys.groundAt(s.pos.x, s.pos.z, 0.4, s.pos.y + 1);
      const alt = s.pos.y - Math.max(g, 0);
      s.t += dt;
      if (!s.flare && alt < Sky.FLARE) { s.flare = true; if (G.Audio) G.Audio.sfx('dash', { pitch: 0.8 }); match.hud && match.hud.flash('roy.glide'); }
      const sy = Math.sin(pl.yaw), cy = Math.cos(pl.yaw);
      const mx = can ? inp.move.x : 0, my = can ? inp.move.y : 0;
      const wx = mx * cy - my * sy, wz = -mx * sy - my * cy;
      const wl = Math.min(1, Math.hypot(mx, my));
      let tvy, tsp;
      if (s.flare) { tvy = -4.5; tsp = 8.5 * wl; }
      else {
        const dive = U.clamp((-pl.pitch - 0.45) / 0.6, 0, 1) * (my > 0.2 ? 1 : 0.6);
        tvy = -U.lerp(9, 25, dive);
        tsp = 12 * wl * (1 - 0.55 * dive);
      }
      s.vel.y = U.damp(s.vel.y, tvy, s.flare ? 3 : 1.6, dt);
      const tx = wl > 0.05 ? wx / wl * tsp : 0, tz = wl > 0.05 ? wz / wl * tsp : 0;
      s.vel.x = U.damp(s.vel.x, tx, 1.8, dt); s.vel.z = U.damp(s.vel.z, tz, 1.8, dt);
      // keep gliders over land near the end
      if (s.flare && !map.isLand(s.pos.x + s.vel.x, s.pos.z + s.vel.z)) { _v.set(-s.pos.x, 0, -s.pos.z).normalize(); s.vel.x += _v.x * 6 * dt; s.vel.z += _v.z * 6 * dt; }
      s.pos.addScaledVector(s.vel, dt);
      const B = RY.BOUND - 2;
      s.pos.x = U.clamp(s.pos.x, -B, B); s.pos.z = U.clamp(s.pos.z, -B, B);
      return Sky._model(match, ent, dt, g);
    },
    // Bot skydive toward ent.dropTarget.
    updateBot(match, ent, dt) {
      const s = ent.sky, tg = ent.dropTarget;
      const g = match.world.phys.groundAt(s.pos.x, s.pos.z, 0.4, s.pos.y + 1);
      const alt = s.pos.y - Math.max(g, 0);
      s.t += dt;
      if (!s.flare && alt < Sky.FLARE) s.flare = true;
      const dx = tg.x - s.pos.x, dz = tg.z - s.pos.z, d = Math.hypot(dx, dz) || 0.001;
      let hv, vy;
      if (s.flare) { hv = Math.min(8, d * 0.9); vy = -4.5; }
      else {
        hv = Math.min(12, d * 0.5 + 1);
        const tReach = d / 12;
        vy = -U.clamp((alt - Sky.FLARE + 2) / Math.max(0.6, tReach), 9, 25);
      }
      s.vel.x = U.damp(s.vel.x, dx / d * hv, 2.2, dt); s.vel.z = U.damp(s.vel.z, dz / d * hv, 2.2, dt);
      s.vel.y = U.damp(s.vel.y, vy, 2, dt);
      s.pos.addScaledVector(s.vel, dt);
      return Sky._model(match, ent, dt, g);
    },
    _model(match, ent, dt, g) {
      const s = ent.sky, m = s.model;
      m.group.position.copy(s.pos);
      const hs = Math.hypot(s.vel.x, s.vel.z);
      if (hs > 0.5) ent.skyYaw = U.angleDamp(ent.skyYaw || 0, Math.atan2(s.vel.x, s.vel.z), 5, dt);
      m.group.rotation.y = ent.skyYaw || 0;
      m.set(s.flare ? 'glide' : 'dive', match.world.time, dt);
      if (Math.random() < 0.25) match.world.fx.spawn(_w.set(s.pos.x, s.pos.y + 0.8, s.pos.z), _t.set(0, 3, 0), s.flare ? 0xffffff : 0xcff3ff, 0.25, 0.4, { grav: 0, normal: true, alpha: 0.6 });
      if (s.pos.y <= Math.max(g, -1.2)) {
        s.pos.y = Math.max(g, -1.2);
        m.group.visible = false;
        return true;
      }
      return false;
    },
    // Third-person sky camera: behind and above, looking down at the diver.
    camera(match, ent, dt) {
      const s = ent.sky, pl = ent.actor, cam = G.R.camera;
      const yaw = pl.yaw, pitch = pl.pitch;
      const back = s.flare ? 5.2 : 6, up = s.flare ? 2.6 : 3.6;
      _v.set(Math.sin(yaw) * back, up - pitch * 3, Math.cos(yaw) * back);
      _w.copy(s.pos).add(_v).addScaledVector(s.vel, 0.04);
      cam.position.lerp(_w, 1 - Math.exp(-(s.t < 0.6 ? 6 : 30) * dt));
      _look.set(s.pos.x - Math.sin(yaw) * 5, s.pos.y - 2.2 + pitch * 3, s.pos.z - Math.cos(yaw) * 5);
      cam.up.set(0, 1, 0);
      cam.lookAt(_look);
      // the horizontal FOV setting converted for this aspect (G.fovV), widened a touch while diving
      const base = G.fovV ? G.fovV(cam.aspect) : (G.Save.set.fov || 75);
      const fov = base + (s.flare ? 2 : 5) * base / 75;
      if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = U.damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix(); }
    },
  };

  // Airship camera: chase from behind/above with free orbit by look input.
  RY.shipCamera = function (match, dt) {
    const ship = match.airship, cam = G.R.camera, pl = match.player.actor, inp = G.input;
    if (!G.UI.anyOpen()) { match.shipYaw = (match.shipYaw || 0) - inp.lookDX * 0.004; match.shipPitch = U.clamp((match.shipPitch || 0.32) + inp.lookDY * 0.003, 0.05, 1.1); }
    const yaw = Math.atan2(ship.dir.x, ship.dir.z) + PI + (match.shipYaw || 0);
    const dist = 40, pitch = match.shipPitch != null ? match.shipPitch : 0.32;
    _v.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 6, Math.cos(yaw) * Math.cos(pitch) * dist);
    _w.copy(ship.pos).add(_v);
    if (match._shipCamInit) cam.position.lerp(_w, 1 - Math.exp(-6 * dt)); else { cam.position.copy(_w); match._shipCamInit = true; }
    _look.copy(ship.pos).addScaledVector(ship.dir, 30); _look.y -= 10;
    cam.up.set(0, 1, 0);
    cam.lookAt(_look);
    const base = G.fovV ? G.fovV(cam.aspect) : (G.Save.set.fov || 75), fov = base + 4 * base / 75;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
    pl.yaw = Math.atan2(ship.dir.x, ship.dir.z) + PI; pl.pitch = -0.6;
  };

  // Spectate camera: orbit a target actor (or a fixed point).
  RY.spectateCamera = function (match, target, pos, dt) {
    const cam = G.R.camera;
    match.specYaw = (match.specYaw || 0) + dt * 0.35;
    const p = target ? _t.copy(target.pos) : _t.copy(pos);
    const yaw = match.specYaw;
    _v.set(Math.sin(yaw) * 7, 3.2, Math.cos(yaw) * 7);
    _w.copy(p).add(_v);
    const g = match.map.hf(_w.x, _w.z) + 1.2;
    if (_w.y < g) _w.y = g;
    cam.position.lerp(_w, 1 - Math.exp(-5 * dt));
    _look.copy(p); _look.y += 1.1;
    cam.up.set(0, 1, 0);
    cam.lookAt(_look);
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 25b_royale_drop.js]', e); }
// ---- 25b_royale_hud.js
try { (function () {
// 25b_royale_hud.js — royale HUD on top of G.HUD: ring chip + compass strip (top-center), rangers
// left / pops (under the minimap), Spark Shield pips (top-left), consumable strip, name tags, loot
// labels, heal progress, storm tint, airship overview map (tap to mark a spot), intro card,
// spectate + champion overlays, minimap drawing (island, ring circles, supply pods).
//   RY.Hud(match): show(), update(dt), msg(text|null, sub), flash(key|text), intro(), spectate(name, place, by),
//   champion(), overview(on, mode), setButtons(phase), dispose()
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};
  const U = G.util;
  const V3 = THREE.Vector3;
  const TAU = Math.PI * 2;
  const _v = new V3();

  const CSS = `
#hud.roy-air .crosshair, #hud.roy-air .wslots, #hud.roy-air .ammo, #hud.roy-air .roy-inv, #hud.roy-air .roy-shieldchip { display: none !important; }
#hud.roy-out .crosshair, #hud.roy-out .wslots, #hud.roy-out .ammo, #hud.roy-out .roy-inv, #hud.roy-out .vitals, #hud.roy-out .roy-shieldchip, #hud.roy-out .prompt, #hud.roy-out .roy-compass, #hud.roy-out .roy-safe, #hud.roy-out .roy-goal, #hud.roy-out .roy-flash, #hud.roy-out .roy-healbar { display: none !important; }
.roy-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; container-type: size; }
.roy-tint { position: absolute; inset: 0; opacity: 0; transition: opacity .35s; background: radial-gradient(ellipse at center, rgba(90,150,255,0.10) 35%, rgba(60,110,255,0.55) 100%); }
.roy-tint::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(115deg, rgba(122,240,255,0.06) 0 14px, transparent 14px 34px); animation: roy-storm 1.2s linear infinite; }
@keyframes roy-storm { from { background-position: 0 0; } to { background-position: 68px 0; } }
.roy-ring { display: flex; align-items: center; gap: 6px; background: rgba(30,26,77,0.72); color: #fff; border-radius: 14px; padding: 3px 12px 3px 6px; font: 800 calc(14px * var(--ui-t, 1)) var(--f-body); box-shadow: 0 3px 0 rgba(30,26,77,0.35); white-space: nowrap; }
.roy-ring svg { width: 22px; height: 22px; display: block; }
.roy-ring.warn { background: rgba(214,60,110,0.85); animation: roy-pulse 0.8s ease-in-out infinite; }
.roy-ring .roy-pips { display: flex; gap: 3px; margin-left: 4px; }
.roy-ring .roy-pips i { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.3); }
.roy-ring .roy-pips i.on { background: #7af0ff; }
@keyframes roy-pulse { 50% { transform: scale(1.06); } }
.roy-safe { font: 800 calc(12px * var(--ui-t, 1)) var(--f-body); color: #fff; text-shadow: 0 1px 0 var(--ink), 0 0 5px rgba(30,26,77,.8); display: flex; align-items: center; gap: 4px; }
.roy-safe b { display: inline-flex; width: 18px; height: 18px; border-radius: 50%; background: #7af0ff; border: 2px solid var(--ink); align-items: center; justify-content: center; } .roy-safe b svg { width: 13px; height: 13px; }
.roy-compass { width: 260px; height: 22px; display: block; }
.roy-chips { display: flex; gap: 6px; }
.roy-chip { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.88); border: 3px solid var(--ink); border-radius: 12px; padding: 1px 8px 1px 4px; font: 800 calc(15px * var(--ui-t, 1)) var(--f-body); box-shadow: 0 3px 0 var(--shadow); font-variant-numeric: tabular-nums; }
.roy-chip svg { width: 20px; height: 20px; display: block; }
.roy-shieldchip { display: flex; align-items: center; gap: 5px; font: 800 calc(11px * var(--ui-t, 1)) var(--f-body); color: #fff; text-shadow: 0 1px 0 var(--ink); }
.roy-shieldchip svg { width: 18px; height: 18px; }
.roy-shieldchip .roy-lv { display: flex; gap: 2px; }
.roy-shieldchip .roy-lv i { width: 12px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.35); border: 1.5px solid var(--ink); }
.roy-shieldchip .roy-lv i.on { background: #39d5ff; }
.roy-shieldchip .roy-next { width: 48px; height: 5px; border-radius: 3px; background: rgba(30,26,77,0.45); overflow: hidden; }
.roy-shieldchip .roy-next > i { display: block; height: 100%; background: #ffd23f; width: 0; }
.roy-inv { position: absolute; left: 50%; bottom: calc(86px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: flex; gap: 5px; }
.roy-inv span { display: flex; align-items: center; gap: 2px; background: rgba(30,26,77,0.6); color: #fff; border-radius: 10px; padding: 1px 6px 1px 3px; font: 800 calc(12px * var(--ui-t, 1)) var(--f-body); }
.roy-inv span.zero { opacity: 0.38; }
.roy-inv em { width: 16px; height: 16px; display: inline-flex; } .roy-inv em svg { width: 100%; height: 100%; }
.roy-tag { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); font: 800 calc(12px * var(--ui-t, 1)) var(--f-body); color: #fff; text-shadow: 0 1px 0 var(--ink), 0 0 4px rgba(30,26,77,.85); white-space: nowrap; display: flex; flex-direction: column; align-items: center; gap: 2px; will-change: transform; }
.roy-tag .roy-hb { width: 38px; height: 5px; border-radius: 3px; background: rgba(30,26,77,0.55); overflow: hidden; display: flex; }
.roy-tag .roy-hb i { display: block; height: 100%; }
.roy-tag .roy-hb i.s { background: #39d5ff; } .roy-tag .roy-hb i.h { background: #ff5a6e; }
.roy-tag svg { width: 15px; height: 15px; vertical-align: -3px; margin-right: 2px; } .roy-tag .c[hidden] { display: none; }
.roy-loot { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); background: rgba(255,255,255,0.95); border: 3px solid var(--ink); border-left: 8px solid var(--rc, #c9d1dc); border-radius: 12px; padding: 4px 10px; font: 800 calc(13px * var(--ui-t, 1)) var(--f-body); box-shadow: 0 4px 0 var(--shadow); white-space: nowrap; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; will-change: transform; }
.roy-loot.small { font-size: calc(11px * var(--ui-t, 1)); padding: 2px 7px; border-width: 2px; border-left-width: 6px; opacity: 0.9; }
.roy-loot.small { transition: opacity .15s; } .roy-loot.small.veil { opacity: 0; }
.roy-loot .roy-rp { display: flex; gap: 2px; }
.roy-loot .roy-rp i { width: 7px; height: 7px; transform: rotate(45deg); background: rgba(30,26,77,0.18); border: 1.5px solid var(--ink); }
.roy-loot .roy-rp i.on { background: var(--rc); }
.roy-loot .roy-act { font-size: calc(11px * var(--ui-t, 1)); color: var(--ink-soft); }
.roy-loot .roy-act:empty { display: none; }
/* touch: the card for the item you're facing docks beside the hand button (name, rarity and action in one block),
   instead of floating at the crosshair where it piled up with the prompt pill and the PING button */
.roy-loot.dock { transform: none; font-size: calc(15px * var(--ui-t, 1)); padding: 5px 12px; gap: 3px; }
.roy-loot.dock .roy-rp i { width: 9px; height: 9px; }
.roy-loot.dock .roy-act { font-size: calc(13px * var(--ui-t, 1)); color: var(--ink); display: flex; align-items: center; gap: 4px; }
.roy-loot.dock .roy-act svg { width: 16px; height: 16px; }
#hud.roy-lootdock .prompt { display: none !important; }
.roy-loot kbd { background: var(--ink); color: #fff; border-radius: 5px; padding: 0 5px; margin-right: 4px; font: 800 calc(11px * var(--ui-t, 1)) var(--f-body); }
.roy-healbar { position: absolute; left: 50%; top: 62%; transform: translateX(-50%); background: rgba(30,26,77,0.72); color: #fff; padding: 4px 12px; border-radius: 12px; font: 800 calc(13px * var(--ui-t, 1)) var(--f-body); display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 150px; }
.roy-healbar .bar2 { width: 140px; height: 7px; border-radius: 4px; background: rgba(255,255,255,0.25); overflow: hidden; }
.roy-healbar .bar2 > i { display: block; height: 100%; background: #3ddc97; width: 0; }
.roy-msg { position: absolute; left: 50%; top: 24%; transform: translateX(-50%); text-align: center; color: #fff; font: 800 clamp(16px, 3.2vw, 24px) var(--f-body); text-shadow: 0 2px 0 var(--ink), 0 0 10px rgba(30,26,77,.7); white-space: nowrap; }
.roy-msg.low { top: auto; bottom: calc(14% + env(safe-area-inset-bottom, 0px)); font-size: clamp(14px, 2.6vw, 20px); }
.roy-msg small { display: block; font-size: 0.65em; opacity: 0.95; margin-top: 4px; }
.roy-flash { position: absolute; left: 50%; top: 36%; transform: translateX(-50%); color: #fff; font: 400 clamp(20px, 4vw, 34px) var(--f-display); -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill; text-shadow: 0 4px 0 var(--ink); animation: roy-flashIn 1.6s ease-out forwards; white-space: nowrap; }
@keyframes roy-flashIn { 0% { opacity: 0; transform: translate(-50%, 10px) scale(0.8); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.08); } 20% { transform: translate(-50%, 0) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; } }
.roy-over { position: absolute; left: calc(16px + env(safe-area-inset-left, 0px)); top: 50%; transform: translateY(-50%); width: min(62vh, 300px); height: min(62vh, 300px); border-radius: 22px; border: 4px solid var(--ink); box-shadow: 0 6px 0 var(--shadow); overflow: hidden; background: #1489b8; pointer-events: auto; }
.roy-over canvas { width: 100%; height: 100%; display: block; }
.roy-over .roy-poi { position: absolute; transform: translate(-50%, -50%); font: 800 calc(10px * var(--ui-t, 1)) var(--f-body); color: #fff; text-shadow: 0 1px 0 var(--ink), 0 0 3px var(--ink); white-space: nowrap; pointer-events: none; }
.roy-over .roy-hint { position: absolute; left: 0; right: 0; bottom: 4px; text-align: center; font: 800 calc(10px * var(--ui-t, 1)) var(--f-body); color: #fff; text-shadow: 0 1px 0 var(--ink); pointer-events: none; }
.roy-over.full { left: 50%; transform: translate(-50%, -50%); width: min(84vh, 420px); height: min(84vh, 420px); }
.roy-intro { position: absolute; left: 50%; top: 18%; transform: translateX(-50%); background: rgba(255,246,224,0.96); border: 4px solid var(--ink); border-radius: 22px; padding: 10px 22px; text-align: center; box-shadow: 0 6px 0 var(--shadow); animation: roy-cardIn 0.4s cubic-bezier(.34,1.56,.64,1); }
.roy-intro h2 { margin: 0; font: 400 clamp(20px, 4vw, 30px) var(--f-display); color: var(--ink); }
.roy-intro p { margin: 4px 0 0; font: 800 calc(13px * var(--ui-t, 1)) var(--f-body); color: var(--ink-soft); display: flex; align-items: center; justify-content: center; gap: 6px; }
.roy-intro p svg { width: 20px; height: 20px; }
.roy-intro.out { animation: roy-cardOut 0.35s forwards; }
@keyframes roy-cardIn { from { opacity: 0; transform: translate(-50%, -20px) scale(0.9); } }
@keyframes roy-cardOut { to { opacity: 0; transform: translate(-50%, -20px) scale(0.9); } }
.roy-spec { position: absolute; left: 0; right: 0; top: 16%; text-align: center; color: #fff; text-shadow: 0 2px 0 var(--ink), 0 0 10px rgba(30,26,77,.7); }
.roy-spec .big { font: 400 clamp(42px, 10vw, 84px)/1 var(--f-display); -webkit-text-stroke: 3px var(--ink); paint-order: stroke fill; }
.roy-spec .mid { font: 800 clamp(16px, 3vw, 22px) var(--f-body); margin-top: 6px; }
.roy-spec .low { position: fixed; left: 0; right: 0; bottom: 16%; font: 800 calc(15px * var(--ui-t, 1)) var(--f-body); }
.roy-champ { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; color: #fff; }
.roy-champ .t { font: 400 clamp(34px, 8vw, 72px)/1.05 var(--f-display); -webkit-text-stroke: 3px var(--ink); paint-order: stroke fill; text-shadow: 0 6px 0 var(--ink); animation: roy-cardIn 0.6s cubic-bezier(.34,1.56,.64,1); }
.roy-champ .s { font: 800 clamp(16px, 3vw, 22px) var(--f-body); text-shadow: 0 2px 0 var(--ink); margin-top: 10px; }
.roy-champ svg { width: 84px; height: 84px; filter: drop-shadow(0 4px 0 var(--ink)); animation: roy-cardIn 0.5s; }
.roy-conf { position: absolute; inset: 0; overflow: hidden; }
.roy-conf i { position: absolute; top: -20px; width: 9px; height: 14px; border-radius: 2px; animation: roy-fall linear forwards; }
@keyframes roy-fall { to { transform: translate(var(--dx), var(--fall, 110vh)) rotate(var(--rot)); } }
#touch[data-layout="royale"] .tb-gadget .cd, #touch[data-layout="royale"] .tb-reload .cd { right: 3px; bottom: 1px; font-size: 13px; position: absolute; }
#touch[data-layout="royale"] .tb-gadget.empty { opacity: 0.45; }
#touch[data-layout="royale"] .tb-gadget { background: rgba(61,220,151,0.9); color: #fff; }
#touch[data-layout="royale"] .tb-reload { background: rgba(255,143,192,0.92); }
#touch[data-layout="royale"].roy-sky .tb-jump { animation: pulse 1s ease-in-out infinite; }
#touch[data-layout="royale"].roy-sky .tb-jump:not([style*="left"]):not([style*="inset"]) { width: 92px; height: 92px; right: calc(28px + env(safe-area-inset-right, 0px)); bottom: calc(30px + env(safe-area-inset-bottom, 0px)); }
.roy-rules { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.roy-rules .card { align-items: center; text-align: center; padding: 8px; gap: 4px; }
.roy-rules .card p { font-size: 12px; line-height: 1.35; }
.roy-rule-ico { width: 42px; height: 42px; } .roy-rule-ico svg { width: 100%; height: 100%; }
.roy-tagline { font-weight: 800; margin: 0 0 8px; color: var(--ink-soft); }
.roy-sub { font: 800 14px var(--f-body); }
.roy-foot { justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.roy-diffbox { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.roy-diffs { gap: 6px; flex-wrap: wrap; }
@media (max-width: 640px) { html:not(.force-landscape) .roy-rules { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.roy-res-head { text-align: center; } .roy-res-big { font: 400 46px/1 var(--f-display); } .roy-res-sub { font-weight: 800; color: var(--ink-soft); }
/* sizes from the game frame (container units on .roy-layer): stay right when #app is rotated to landscape */
.roy-msg { font-size: clamp(16px, 3.2cqw, 24px); } .roy-msg.low { font-size: clamp(14px, 2.6cqw, 20px); }
.roy-flash { font-size: clamp(20px, 4cqw, 34px); } .roy-intro h2 { font-size: clamp(20px, 4cqw, 30px); }
.roy-over { width: min(62cqh, 300px); height: min(62cqh, 300px); } .roy-over.full { width: min(84cqh, 420px); height: min(84cqh, 420px); }
.roy-spec .big { font-size: clamp(42px, 10cqw, 84px); } .roy-spec .mid { font-size: clamp(16px, 3cqw, 22px); }
.roy-champ .t { font-size: clamp(34px, 8cqw, 72px); } .roy-champ .s { font-size: clamp(16px, 3cqw, 22px); }
/* honesty + clarity pass: BOT tags (name tags, kill feed), ring timer bar, safe-zone state, goal line, rangers-left label,
   overview header / hot-drop counts / best-jump marker, lobby "You vs 15 bots" row */
.roy-bot { display: inline-flex; align-items: center; gap: 2px; font: 900 calc(9px * var(--ui-t, 1))/1 var(--f-body); letter-spacing: .05em; color: #fff; background: #5b3a8c; border: 1.5px solid #fff; border-radius: 6px; padding: 1px 4px 1px 2px; margin-left: 4px; text-shadow: none; vertical-align: 1px; white-space: nowrap; }
.roy-bot svg { width: 10px !important; height: 10px !important; margin: 0 !important; vertical-align: 0 !important; display: block; }
.roy-tag .n { display: flex; align-items: center; }
#hud.roy-on .feed .roy-bot { font-size: calc(8px * var(--ui-t, 1)); padding: 1px 3px 1px 2px; margin: 0 3px 0 2px; border-width: 1px; }
#hud.roy-on .feed .roy-fn { font-weight: 900; }
#hud.roy-on .feed .roy-fg { white-space: nowrap; }
.roy-ring { position: relative; overflow: hidden; }
.roy-ring .roy-rbar { position: absolute; left: 30px; right: 12px; bottom: 1px; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.16); overflow: hidden; }
.roy-ring .roy-rbar > i { display: block; height: 100%; width: 100%; background: #7af0ff; transform-origin: left; }
.roy-ring.warn .roy-rbar > i { background: #ffe27a; }
.roy-safe { border-radius: 10px; padding: 1px 8px 1px 3px; }
.roy-safe.in b { background: #5dff9a; }
.roy-safe.go { background: rgba(255,138,76,0.82); text-shadow: 0 1px 0 var(--ink); }
.roy-safe.storm { background: rgba(214,60,110,0.88); animation: roy-pulse 0.8s ease-in-out infinite; }
.roy-goal { display: flex; align-items: center; gap: 4px; font: 800 calc(12px * var(--ui-t, 1)) var(--f-body); color: #fff; background: rgba(30,26,77,0.6); border-radius: 10px; padding: 1px 9px 1px 4px; white-space: nowrap; max-width: 46cqw; overflow: hidden; text-overflow: ellipsis; }
.roy-goal svg { width: 15px; height: 15px; flex: none; }
.roy-goal.final { background: rgba(255,182,39,0.92); color: var(--ink); }
.roy-chip small { font: 800 calc(11px * var(--ui-t, 1)) var(--f-body); margin-left: 1px; }
.roy-chip.pulse { animation: roy-pulse 0.45s ease-out 2; }
.roy-over .roy-ohead { position: absolute; left: 0; right: 0; top: 5px; text-align: center; font: 400 calc(15px * var(--ui-t, 1)) var(--f-display); color: #fff; -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill; pointer-events: none; }
.roy-over .roy-poi .roy-hot { display: inline-flex; align-items: center; gap: 1px; margin-left: 3px; padding: 0 4px 0 2px; border-radius: 6px; background: rgba(30,26,77,0.72); font-size: calc(9px * var(--ui-t, 1)); text-shadow: none; }
.roy-over .roy-poi .roy-hot.busy { background: rgba(214,60,110,0.9); }
.roy-over .roy-poi .roy-hot.calm { background: rgba(40,160,110,0.9); }
.roy-over .roy-poi .roy-hot svg { width: 10px; height: 10px; }
.roy-vs { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 0 0 8px; font: 800 14px var(--f-body); color: var(--ink); }
.roy-vs > span { display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 3px solid var(--ink); border-radius: 12px; padding: 2px 10px 2px 5px; box-shadow: 0 3px 0 var(--shadow); }
.roy-vs svg { width: 22px; height: 22px; }
.roy-vs b { font: 400 18px var(--f-display); color: var(--grape); }
/* lobby: a locked difficulty reads "Spicy (Rank 10)", or "Spicy 🔒10" on a narrow phone */
.roy-diffs .roy-ds { display: none; align-items: center; gap: 3px; }
.roy-diffs .roy-lk { display: inline-flex; margin-left: 2px; }
/* lobby on a narrow phone (568×320, 667×375, 740×360…): the four rule cards were squashed into a ~26 px strip behind
   the difficulty rows. The tagline already says "You vs 15 bots", so the VS row steps aside; the rules become one row
   of icon + title cards; the difficulty buttons (short locked labels) and Launch share the foot */
html.gh-short.gw-narrow .roy-vs { display: none; }
html.gh-short.gw-narrow .roy-tagline { margin: 0 0 4px; font-size: 13px; line-height: 1.25; }
html.gh-short.gw-narrow .roy-rules { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; }
html.gh-short.gw-narrow .roy-rules .card { padding: 4px 3px; gap: 2px; }
html.gh-short.gw-narrow .roy-rules .card h3 { font-size: 12px; line-height: 1.15; overflow-wrap: anywhere; }
html.gh-short.gw-narrow .roy-rules .card p { display: none; }
html.gh-short.gw-narrow .roy-rule-ico { width: 26px; height: 26px; }
html.gh-short.gw-narrow .roy-foot { flex-wrap: nowrap; gap: 6px; margin-top: 2px; }
html.gh-short.gw-narrow .roy-diffbox { gap: 2px 4px; min-width: 0; flex: 1 1 auto; }
html.gh-short.gw-narrow .roy-diffbox .roy-sub { flex: 0 0 100%; font-size: 11px; line-height: 1.1; }
html.gh-short.gw-narrow .roy-diffs { gap: 4px; }
html.gh-short.gw-narrow .roy-diffs .btn { min-height: 32px; padding: 3px 9px; font-size: 12.5px; }
html.gh-short.gw-narrow .roy-diffs .roy-dl { display: none; }
html.gh-short.gw-narrow .roy-diffs .roy-ds { display: inline-flex; }
html.gh-short.gw-narrow .roy-foot .btn.big { flex: none; min-height: 46px; font-size: 16px; padding: 6px 12px; }
/* touch: the kill feed moved into the strip left of the minimap (Hud._feedFit); there its lines drop in and fade out
   in place (the usual sideways slide would pass over the minimap) */
#hud.roy-on .feed.roy-side { position: absolute; width: max-content; }
#hud.roy-on .feed.roy-side > div { max-width: 100%; box-sizing: border-box; white-space: normal; line-height: 1.25; text-align: right; font-size: calc(10.5px * var(--ui-t, 1)); padding: 2px 7px; animation-name: roy-feedIn; }
#hud.roy-on .feed.roy-side > div.out { animation-name: roy-feedOut; }
@keyframes roy-feedIn { 0% { transform: translateY(-6px) scale(0.9); opacity: 0; } 60% { transform: translateY(1px) scale(1.02); opacity: 1; } 100% { transform: none; opacity: 1; } }
@keyframes roy-feedOut { to { transform: translateY(-4px); opacity: 0; } }
/* controller glyphs inside prompts (RY.padFill): A / X discs as the HUD prompt, sticks white, View / Select a pill */
.roy-msg .pad-g, .roy-over .roy-hint .pad-g, .roy-loot .pad-g { margin: 0 0.3em; text-shadow: 0 1px 0 rgba(30,26,77,0.5); }
.roy-over .roy-hint .pad-g { font-size: 1.05em; width: 1.6em; height: 1.6em; vertical-align: -0.4em; }
.roy-loot .pad-g { margin: 0 4px 0 0; }
.pad-g.roy-pst { background: radial-gradient(circle at 50% 45%, #fff 0 45%, #d9dcf2 46% 100%); color: var(--ink); text-shadow: none !important; }
.pad-g.roy-pst:not(:empty) { min-width: 1.45em; width: auto; padding: 0 0.2em; }
.pad-g.roy-pk { width: auto; min-width: 1.7em; padding: 0 0.25em; border-radius: 0.45em; background: #5b5f8f; }
/* Spark Shield label stays on one line (it wrapped to 2–3 lines in ja / ru): no wrapping, slimmer level pips and
   next-level bar on phones (room for the whole ja label at normal text size), an ellipsis only past 9em or when the
   column is still too narrow (XL text), and on 568-wide phones just the shield icon + level pips */
.roy-shieldchip { white-space: nowrap; }
.roy-shieldchip > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; max-width: 9em; }
html.gh-short .roy-shieldchip { gap: 4px; }
html.gh-short .roy-shieldchip .roy-lv i { width: 9px; }
html.gh-short .roy-shieldchip .roy-next { width: 24px; }
html.gh-short.gw-tiny .roy-shieldchip > span:nth-child(2) { display: none; }
`;
  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style'); s.id = 'royale-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  RY.injectCss = injectCss;
  injectCss();
  // Button-layout editor (Settings > Controls): royale repurposes GADGET (smart heal) and RELOAD (throwable).
  if (G.HudLayout && RY.ICON) { const I = G.HudLayout.icons || (G.HudLayout.icons = {}); I.royale = Object.assign(I.royale || {}, { gadget: RY.ICON.heal, reload: RY.ICON.grenade }); }
  const el = (...a) => G.UI.el(...a);
  // Small robot face (BOT tags, hot-drop counts) and a target (goal line).
  RY.ICON.bot = '<svg viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="13" rx="4.5" fill="#fff" stroke="#1e1a4d" stroke-width="2"/><circle cx="9.3" cy="13.3" r="2" fill="#39d5ff"/><circle cx="14.7" cy="13.3" r="2" fill="#39d5ff"/><path d="M12 7V3.5" stroke="#1e1a4d" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="3" r="1.8" fill="#ffd23f" stroke="#1e1a4d" stroke-width="1.2"/></svg>';
  RY.ICON.goal = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#ff7a93" stroke="#1e1a4d" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="#fff" stroke="#1e1a4d" stroke-width="1.6"/><circle cx="12" cy="12" r="2.2" fill="#ff7a93"/></svg>';
  // "BOT" pill: every rival in Sky Drop Royale is a bot, and the name tags / kill feed say so.
  RY.botChip = () => el('span.roy-bot', el('span', { html: RY.ICON.bot }), el('span', { i18n: 'roy.botTag' }));
  // Controller prompts: translated as one sentence with {a} {x} {ls} {r3} {map} placeholders (RY.padT), drawn with the
  // HUD's .pad-g button glyphs (06_input pad map: A jump, X use, left stick, R3 ping, View / Select map).
  const PAD_MARK = { a: '\uE000', x: '\uE001', ls: '\uE002', r3: '\uE003', map: '\uE004' };
  const PAD_GLYPH = { '\uE000': ['.a', 'A'], '\uE001': ['', 'X'], '\uE002': ['.roy-pst', 'L'], '\uE003': ['.roy-pst', 'R3'], '\uE004': ['.roy-pk', '⧉'] };
  const PAD_RE = /([\uE000-\uE004])/;
  RY.padT = key => G.t(key, PAD_MARK);
  RY.padGlyph = ch => { const g = PAD_GLYPH[ch]; return el('span.pad-g' + g[0], { text: g[1] }); };
  // text (possibly with pad marks) into a node: plain text stays one text node
  RY.padFill = (node, text) => {
    node.textContent = '';
    if (!PAD_RE.test(text)) { node.append(document.createTextNode(text)); return; }
    for (const part of text.split(PAD_RE)) { if (!part) continue; node.append(PAD_GLYPH[part] ? RY.padGlyph(part) : document.createTextNode(part)); }
  };
  const SPLIT_A = '\u0001', SPLIT_B = '\u0002';
  // goal-line badge while inside the next safe zone: a green check disc
  const GOAL_IN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#5dff9a" stroke="#1e1a4d" stroke-width="2"/><path d="M7 12.5l3.2 3.2L17 8.6" fill="none" stroke="#1e1a4d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  class Hud {
    constructor(match) { this.m = match; this.cache = {}; this.tags = []; this.smalls = []; this.compT = 0; this.overT = 0; injectCss(); }
    show() {
      const H = G.HUD;
      H.show({ vitals: true, weapons: true, crosshair: true, minimap: true, objective: false, timer: false, bolts: false, feed: true });
      H.minimapRange = 85;
      H.minimapDraw = (g, k, pl) => G.safe('roy minimap', () => this.drawMinimap(g, k, pl));
      this.hudEl = document.getElementById('hud');
      if (this.hudEl) this.hudEl.classList.add('roy-on');
      // top-center: ring chip, safe distance, compass
      const tc = H.slot('tc');
      // ring chip: phase text + round pips + a thin bar running down with the time left in this phase
      this.ring = el('div.roy-ring', el('span', { html: RY.ICON.ring }), el('span.roy-rt'), el('span.roy-pips', [0, 1, 2, 3, 4].map(() => el('i'))), el('span.roy-rbar', el('i')));
      this.safe = el('div.roy-safe');
      this.comp = el('canvas.roy-compass'); this.comp.width = 520; this.comp.height = 44;
      // goal line: what to do right now (pick a spot, loot up, get into the zone, outlast the bots, final 3)
      this.goal = el('div.roy-goal', el('span', { html: RY.ICON.goal }), el('span'));
      this.goal.hidden = true;
      tc.append(this.ring, this.comp, this.safe, this.goal);
      // under minimap: rangers left, pops
      const tr = H.slot('tr');
      this.left = el('div.roy-chip', el('span', { html: RY.ICON.person }), el('b', { text: G.t('roy.leftN', { n: 16 }) }));
      this.pops = el('div.roy-chip', el('span', { html: RY.ICON.pop }), el('b', { text: '0' }));
      tr.append(el('div.roy-chips', this.left, this.pops));
      // top-left: spark shield level
      const tl = H.slot('tl');
      this.shield = el('div.roy-shieldchip', el('span', { html: RY.ICON.shield }), el('span', { i18n: 'roy.shield' }), el('span.roy-lv', [0, 1, 2, 3].map(() => el('i'))), el('span.roy-next', el('i')));
      tl.append(this.shield);
      // full-screen layer
      const full = H.slot('full');
      this.layer = el('div.roy-layer');
      this.tint = el('div.roy-tint');
      this.tagBox = el('div');
      this.lootBox = el('div');
      this.inv = el('div.roy-inv');
      this.invEls = {};
      for (const k of ['pop', 'medkit', 'cell', 'battery']) {
        const s = el('span', el('em', { html: RY.HEAL_ICON[k] }), el('b', { text: '0' }));
        this.invEls[k] = s; this.inv.appendChild(s);
      }
      this.healBar = el('div.roy-healbar', el('span'), el('div.bar2', el('i'))); this.healBar.hidden = true;
      this.msgEl = el('div.roy-msg'); this.msgEl.hidden = true;
      this.layer.append(this.tint, this.tagBox, this.lootBox, this.inv, this.healBar, this.msgEl);
      full.appendChild(this.layer);
      for (let i = 0; i < 15; i++) { const t = el('div.roy-tag', el('span.n', el('span.c', { html: RY.ICON.crown }), el('span.t'), RY.botChip()), el('div.roy-hb', el('i.s'), el('i.h'))); t.hidden = true; this.tagBox.appendChild(t); this.tags.push(t); }
      this.lootMain = this._lootEl(false); this.lootBox.appendChild(this.lootMain);
      for (let i = 0; i < 3; i++) { const s = this._lootEl(true); this.lootBox.appendChild(s); this.smalls.push(s); }
      G.Input.setIcon('gadget', RY.ICON.heal);
      G.Input.setIcon('reload', RY.ICON.grenade);
    }
    _lootEl(small) {
      const e = el('div.roy-loot' + (small ? '.small' : ''), el('span.roy-nm'), el('span.roy-rp', [0, 1, 2, 3, 4].map(() => el('i'))), small ? null : el('span.roy-act'));
      e.hidden = true;
      return e;
    }
    // ---- transient + persistent center messages
    msg(text, sub, low) {
      const key = (text || '') + '|' + (sub || '') + (low ? '|l' : '');
      if (this.cache.msg === key) return;
      this.cache.msg = key;
      if (!text) { this.msgEl.hidden = true; return; }
      this.msgEl.hidden = false;
      this.msgEl.classList.toggle('low', !!low);
      RY.padFill(this.msgEl, text);
      if (sub) this.msgEl.appendChild(el('small', { text: sub }));
    }
    // Kill-feed line with a BOT pill after every bot's name. The template is translated as one sentence and split at
    // the name placeholders, so word order follows each language ("{a}が{b}をポン！").
    feedKO(key, a, b, color) {
      const s = G.t(key, { a: SPLIT_A, b: SPLIT_B });
      G.HUD.feed(s.replace(SPLIT_A, a ? a.name : '').replace(SPLIT_B, b ? b.name : ''), color);
      const box = document.querySelector('#hud .feed'), d = box && box.lastElementChild;
      if (!d) return;
      d.textContent = '';
      // name + BOT pill (+ the punctuation right after it) stay together when a line wraps
      let grp = null;
      for (const part of s.split(/([\u0001\u0002])/)) {
        if (part === SPLIT_A || part === SPLIT_B) {
          const e = part === SPLIT_A ? a : b;
          if (!e) continue;
          grp = el('span.roy-fg', el('span.roy-fn', { text: e.name }));
          if (!e.isPlayer) grp.appendChild(RY.botChip());
          d.appendChild(grp);
        } else if (part) {
          const m = grp && /^[!！?？。、,.]+/.exec(part);
          if (m) grp.appendChild(document.createTextNode(m[0]));
          const rest = m ? part.slice(m[0].length) : part;
          if (rest) d.appendChild(document.createTextNode(rest));
          grp = null;
        }
      }
    }
    // Big centre call-outs ("Loot up!", "Ring closing in 0:15"): at most two at a time, stacked so they never
    // print on top of each other; a repeat of a showing message is dropped.
    flash(keyOrText, params) {
      if (!this.layer || this.spec || (this.hudEl && this.hudEl.classList.contains('roy-out'))) return;   // KO / champion cards own the centre
      const t = G.i18n.has(keyOrText) ? G.t(keyOrText, params) : keyOrText;
      const live = this._fl || (this._fl = []);
      for (let i = live.length - 1; i >= 0; i--) if (!live[i].isConnected) live.splice(i, 1);
      if (live.some(f => f.textContent === t)) return;
      while (live.length >= 2) live.shift().remove();
      const slot = live.some(f => f._slot === 0) ? 1 : 0;
      const f = el('div.roy-flash', { text: t });
      f._slot = slot;
      if (slot) f.style.top = 'calc(36% + 1.45em)';
      this.layer.appendChild(f);
      live.push(f);
      setTimeout(() => f.remove(), 1700);
    }
    intro() {
      const m = this.m;
      const champ = m.champBot;
      const last = RY.lastChampion();
      const card = el('div.roy-intro', el('h2', { i18n: 'roy.title' }),
        el('p', el('span', { html: RY.ICON.bot }), el('span', { text: G.t('roy.introSub') })),
        champ ? el('p', el('span', { html: RY.ICON.crown }), el('span', { text: G.t('roy.champBot', { name: champ.name }) })) : null,
        champ ? el('p', { text: G.t('roy.champHint'), style: { fontSize: '12px', marginTop: '0' } }) : null,
        last ? el('p', el('span', { html: RY.ICON.trophy }), el('span', { text: G.t('roy.lastChamp', { name: last }) })) : null);
      this.layer.appendChild(card);
      setTimeout(() => card.classList.add('out'), 3000);
      setTimeout(() => card.remove(), 3400);
    }
    spectate(byName, place, ring) {
      this.hudEl.classList.add('roy-out');
      this.spec = el('div.roy-spec', el('div.big', { text: G.t('roy.place', { n: place }) }),
        el('div.mid', { text: ring ? G.t('roy.koRing') : byName ? G.t('roy.koBy', { name: byName }) : G.t('roy.out') }),
        byName ? el('div.low', { text: G.t('roy.spectate', { name: byName }) }) : null);
      this.layer.appendChild(this.spec);
    }
    clearSpectate() { if (this.spec) { this.spec.remove(); this.spec = null; } this.hudEl.classList.remove('roy-out'); }
    champion() {
      this.hudEl.classList.add('roy-out');
      const box = el('div.roy-champ', el('div', el('div', { html: RY.ICON.crown }), el('div.t', { i18n: 'roy.champion' }), el('div.s', { i18n: 'roy.championSub' })));
      const conf = el('div.roy-conf');
      const cols = ['#ff6b8b', '#ffd23f', '#3fe0b8', '#33b5ff', '#8f6bff', '#ffffff', '#ff8a1f'];
      const n = G.Save.set.reducedMotion ? 20 : 80;
      for (let i = 0; i < n; i++) {
        const c = el('i');
        c.style.left = (Math.random() * 100).toFixed(1) + '%'; c.style.background = cols[i % cols.length];
        c.style.animationDuration = (2.2 + Math.random() * 2.2).toFixed(2) + 's'; c.style.animationDelay = (Math.random() * 1.4).toFixed(2) + 's';
        c.style.setProperty('--dx', ((Math.random() - 0.5) * 240).toFixed(0) + 'px'); c.style.setProperty('--rot', ((Math.random() - 0.5) * 1440).toFixed(0) + 'deg');
        conf.appendChild(c);
      }
      conf.style.setProperty('--fall', Math.round((G.Screen ? G.Screen.h() : window.innerHeight) * 1.15) + 'px');
      this.layer.append(conf, box);
    }
    // ---- airship overview map (also the full map on M / map key)
    overview(on, full) {
      if (!on) { if (this.over) { this.over.remove(); this.over = null; } return; }
      if (this.over) { this.over.classList.toggle('full', !!full); this._overText(); return; }
      const m = this.m, map = m.map;
      const box = el('div.roy-over' + (full ? '.full' : ''));
      const c = el('canvas'); c.width = c.height = 300;
      box.appendChild(c);
      // during the airship crossing each POI shows how many bots plan to land there (their real drop plans), so a
      // quiet spot for a calm loot-up is easy to pick
      const ship = m.phase === 'ship';
      const plans = ship ? map.pois.map(p => m.rangers.filter(e => !e.isPlayer && e.dropTarget && Math.hypot(e.dropTarget.x - p.x, e.dropTarget.z - p.z) < p.r + 12).length) : null;
      map.pois.forEach((p, i) => {
        const lab = el('div.roy-poi', el('span', { text: G.t(p.key) }));
        if (plans) lab.appendChild(el('span.roy-hot' + (plans[i] >= 3 ? '.busy' : plans[i] <= 1 ? '.calm' : ''), el('span', { html: RY.ICON.bot }), el('span', { text: String(plans[i]) })));
        lab.style.left = ((p.x + 200) / 400 * 100).toFixed(1) + '%'; lab.style.top = ((p.z + 200) / 400 * 100 - 6).toFixed(1) + '%';
        box.appendChild(lab);
      });
      this.overHead = el('div.roy-ohead'); box.appendChild(this.overHead);
      this.overHint = el('div.roy-hint'); box.appendChild(this.overHint); this._hintS = null;
      box.addEventListener('pointerdown', ev => {
        ev.preventDefault(); ev.stopPropagation();
        const r = G.Screen ? G.Screen.rectToLocal(c.getBoundingClientRect()) : c.getBoundingClientRect();
        const lp = G.Screen ? G.Screen.toLocal(ev.clientX, ev.clientY) : { x: ev.clientX, y: ev.clientY };
        const x = ((lp.x - r.left) / r.width) * 400 - 200, z = ((lp.y - r.top) / r.height) * 400 - 200;
        m.pingLocation(new V3(x, map.hf(x, z), z), true);
      });
      this.layer.appendChild(box);
      this.over = box; this.overC = c;
      this._overText();
    }
    // header + device-aware hint: "Pick a landing spot!" / "Tap (Click) the map to mark a landing spot" in the airship,
    // "Island map" / "Tap to place a marker" (desktop: "Click … · M closes the map") during the match. On a controller
    // the airship map has a cursor (left stick moves it, X marks the spot: padCursor); during the match R3 pings
    // what you look at and View / Select closes the map.
    _overText() {
      if (!this.over) return;
      const ship = this.m.phase === 'ship', dev = G.input.device, desk = dev === 'desktop', pad = dev === 'gamepad';
      const head = G.t(ship ? 'roy.over.pick' : 'roy.over.map');
      const hint = ship ? (pad ? RY.padT('roy.mapHintPad') : G.t(desk ? 'roy.mapHintKb' : 'roy.mapHint'))
        : (pad ? RY.padT('roy.mapHintPlayPad') : G.t(desk ? 'roy.mapHintPlayKb' : 'roy.mapHintPlay'));
      if (this.overHead.textContent !== head) this.overHead.textContent = head;
      if (this._hintS !== hint) { this._hintS = hint; RY.padFill(this.overHint, hint); }
    }
    // Controller, airship map: a cursor the left stick moves over the map (it starts on the marked spot, or the island
    // centre); X marks the landing spot under it. Called every frame of the airship phase.
    padCursor(dt) {
      const m = this.m, inp = G.input;
      if (!this.over || m.phase !== 'ship' || inp.device !== 'gamepad' || G.UI.anyOpen()) { this.cur = null; return; }
      const c = this.cur || (this.cur = m.mapPing ? { x: m.mapPing.x, z: m.mapPing.z } : { x: 0, z: 0 });
      const sp = 150 * dt;   // map metres per second at full tilt: the 400 m island crosses in under 3 s
      c.x = U.clamp(c.x + inp.move.x * sp, -195, 195);
      c.z = U.clamp(c.z - inp.move.y * sp, -195, 195);
      if (inp.reloadP || inp.interactP) m.pingLocation(new V3(c.x, m.map.hf(c.x, c.z), c.z), true);
    }
    _drawOverview() {
      const m = this.m, c = this.overC, g = c.getContext('2d'), S = c.width, k = S / 400;
      const X = x => (x + 200) * k;
      g.clearRect(0, 0, S, S);
      g.drawImage(m.map.canvas, 0, 0, S, S);
      const ring = m.ring;
      if (ring.phase !== 'idle') {
        // storm outside the current ring, the next safe zone lightly filled
        g.save(); g.beginPath(); g.rect(0, 0, S, S); g.arc(X(ring.cur.x), X(ring.cur.z), Math.max(0.5, ring.cur.r * k), 0, TAU, true); g.fillStyle = 'rgba(80,120,255,0.32)'; g.fill('evenodd'); g.restore();
        g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.arc(X(ring.next.x), X(ring.next.z), Math.max(1, ring.next.r * k), 0, TAU); g.fill();
        g.lineWidth = 3; g.strokeStyle = 'rgba(122,240,255,0.95)'; g.beginPath(); g.arc(X(ring.cur.x), X(ring.cur.z), ring.cur.r * k, 0, TAU); g.stroke();
        g.setLineDash([6, 5]); g.lineWidth = 2; g.strokeStyle = '#fff'; g.beginPath(); g.arc(X(ring.next.x), X(ring.next.z), ring.next.r * k, 0, TAU); g.stroke(); g.setLineDash([]);
      }
      const ship = m.airship;
      if (ship && m.phase === 'ship') {
        g.setLineDash([8, 6]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.beginPath(); g.moveTo(X(ship.a.x), X(ship.a.z)); g.lineTo(X(ship.b.x), X(ship.b.z)); g.stroke(); g.setLineDash([]);
        // marked spot: the best jump point on the flight path (closest pass) and a dotted glide line to the spot
        if (m.mapPing) {
          const kk = ship.closestK(m.mapPing.x, m.mapPing.z);
          const jx = ship.a.x + (ship.b.x - ship.a.x) * kk, jz = ship.a.z + (ship.b.z - ship.a.z) * kk;
          g.setLineDash([3, 4]); g.lineWidth = 2; g.strokeStyle = '#ffd23f';
          g.beginPath(); g.moveTo(X(jx), X(jz)); g.lineTo(X(m.mapPing.x), X(m.mapPing.z)); g.stroke(); g.setLineDash([]);
          g.fillStyle = kk > ship.k ? '#ffd23f' : 'rgba(255,255,255,0.5)'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2;
          g.beginPath(); g.arc(X(jx), X(jz), 5, 0, TAU); g.fill(); g.stroke();
        }
        const ax = X(ship.pos.x), az = X(ship.pos.z), ang = Math.atan2(ship.dir.z, ship.dir.x);
        g.save(); g.translate(ax, az); g.rotate(ang);
        g.fillStyle = '#ff8a4c'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2.5;
        g.beginPath(); g.ellipse(0, 0, 12, 7, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#2cc3d6'; g.fillRect(-4, 6, 8, 4); g.strokeRect(-4, 6, 8, 4);
        g.restore();
      }
      for (const d of ring.drops) if (d.state === 'announced' || d.state === 'falling' || d.state === 'landed') { g.fillStyle = '#fff1c8'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2; g.beginPath(); g.arc(X(d.pos.x), X(d.pos.z), 5, 0, TAU); g.fill(); g.stroke(); }
      if (m.mapPing) { g.fillStyle = '#ffd23f'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2.5; const px = X(m.mapPing.x), pz = X(m.mapPing.z); g.beginPath(); g.moveTo(px, pz); g.arc(px, pz - 9, 6, Math.PI * 0.8, Math.PI * 2.2); g.closePath(); g.fill(); g.stroke(); }
      // controller cursor (padCursor): a white ring with ticks, inked so it reads on sand, grass and sea
      if (this.cur && m.phase === 'ship') {
        const cx = X(this.cur.x), cz = X(this.cur.z);
        for (const [w, col] of [[5, '#1e1a4d'], [2.5, '#fff']]) {
          g.lineWidth = w; g.strokeStyle = col; g.beginPath(); g.arc(cx, cz, 9, 0, TAU);
          g.moveTo(cx - 15, cz); g.lineTo(cx - 6, cz); g.moveTo(cx + 6, cz); g.lineTo(cx + 15, cz);
          g.moveTo(cx, cz - 15); g.lineTo(cx, cz - 6); g.moveTo(cx, cz + 6); g.lineTo(cx, cz + 15); g.stroke();
        }
      }
      const pe = m.player;
      const pp = pe.state === 'ground' ? pe.actor.pos : pe.state === 'sky' ? pe.sky.pos : null;
      if (pp) {
        g.save(); g.translate(X(pp.x), X(pp.z)); g.rotate(-pe.actor.yaw);
        g.fillStyle = '#fff'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.stroke(); g.fill();
        g.restore();
      }
    }
    // ---- minimap (called by G.HUD inside a frame centred on and rotated with the player)
    drawMinimap(g, k, pl) {
      const m = this.m, map = m.map, ext = map.canvas.ext;
      const px = pl.pos.x, pz = pl.pos.z;
      g.fillStyle = '#1489b8'; g.fillRect(-200, -200, 400, 400);
      g.drawImage(map.canvas, (-ext - px) * k, (-ext - pz) * k, ext * 2 * k, ext * 2 * k);
      const ring = m.ring;
      if (ring.phase !== 'idle') {
        // storm outside the current circle
        g.save();
        g.beginPath(); g.rect(-200, -200, 400, 400); g.arc((ring.cur.x - px) * k, (ring.cur.z - pz) * k, ring.cur.r * k, 0, TAU, true);
        g.fillStyle = 'rgba(80,120,255,0.35)'; g.fill('evenodd');
        g.restore();
        g.lineWidth = 2.5; g.strokeStyle = '#7af0ff'; g.beginPath(); g.arc((ring.cur.x - px) * k, (ring.cur.z - pz) * k, ring.cur.r * k, 0, TAU); g.stroke();
        g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc((ring.next.x - px) * k, (ring.next.z - pz) * k, Math.max(1, ring.next.r * k), 0, TAU); g.stroke(); g.setLineDash([]);
      }
      for (const d of ring.drops) if (d.state !== 'pending' && d.state !== 'done') { g.fillStyle = '#fff1c8'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 2; g.beginPath(); g.arc((d.pos.x - px) * k, (d.pos.z - pz) * k, 4.5, 0, TAU); g.fill(); g.stroke(); }
      // hide bots the player has not spotted (restored at the start of the next mode update)
      const now = m.world.time;
      for (const e of m.rangers) { if (e.isPlayer || !e.actor) continue; e.actor.hidden = !(e.alive && now - (e.spotT || -99) < 1.5); }
      m._mmHidden = true;
    }
    // ---- touch buttons per phase
    setButtons(phase) {
      const all = ['fire', 'jump', 'slide', 'reload', 'swap', 'ability', 'gadget', 'interact', 'pause', 'ping'];
      const on = phase === 'ship' ? ['jump', 'pause', 'ping'] : phase === 'sky' ? ['pause', 'ping'] : phase === 'out' ? ['pause'] : all;
      const key = phase + '|' + G.Input.layout + '|' + G.input.device;
      // re-applying the layout (closing the pause menu, the button-layout editor) shows every royale button again
      const fb = G.Input.btn('fire'), stale = G.Input.layout === 'royale' && G.input.device === 'touch' && fb && fb.hidden === on.includes('fire');
      if (this.cache.btn === key && !stale) return;
      this.cache.btn = key;
      const touch = document.getElementById('touch');
      const sky = phase === 'ship' || phase === 'sky';
      if (touch) touch.classList.toggle('roy-sky', sky && G.Input.layout === 'royale');
      if (G.Input.layout !== 'royale') return;
      for (const b of all) if (b !== 'interact' && b !== 'reload') G.Input.show(b, on.includes(b));
      if (!on.includes('interact')) G.Input.show('interact', false);
      if (!on.includes('reload')) G.Input.show('reload', false);
      this.cache.thr = null;
    }
    update(dt) {
      const m = this.m, pe = m.player, a = pe.actor, H = G.HUD, now = m.world.time;
      if (!this.ring) return;
      const air = pe.state === 'ship' || pe.state === 'sky';
      if (this.cache.air !== air) { this.cache.air = air; this.hudEl.classList.toggle('roy-air', air); }
      // ring chip
      const ring = m.ring;
      let rt, warn = false;
      if (ring.phase === 'idle') rt = G.t('roy.ring.start');
      else if (ring.phase === 'done') rt = G.t('roy.ring.final');
      else if (ring.phase === 'wait') { const s = ring.timeLeft(); rt = G.t('roy.ring.wait', { t: U.fmtClock(s) }); warn = s < 10; }
      else { rt = G.t('roy.ring.close', { t: U.fmtClock(ring.timeLeft()) }); warn = true; }
      if (this.cache.rt !== rt) { this.cache.rt = rt; this.ring.children[1].textContent = rt; }
      if (this.cache.rw !== warn) { this.cache.rw = warn; this.ring.classList.toggle('warn', warn); }
      const rd = ring.phase === 'idle' ? 0 : ring.round + (ring.phase === 'done' ? 1 : 0);
      if (this.cache.rd !== rd) { this.cache.rd = rd; const pips = this.ring.children[2].children; for (let i = 0; i < 5; i++) pips[i].classList.toggle('on', i < rd); }
      // time left in this ring phase as a bar under the chip (quantized: a style write only when it moves a step)
      const R = ring.rounds && ring.rounds[ring.round];
      const dur = R ? (ring.phase === 'wait' ? R.wait : ring.phase === 'close' ? R.close : 0) : 0;
      const rq = dur > 0 ? Math.round(U.clamp(ring.timeLeft() / dur, 0, 1) * 60) : 0;
      if (this.cache.rq !== rq) { this.cache.rq = rq; this.ring.lastChild.firstChild.style.transform = 'scaleX(' + (rq / 60).toFixed(3) + ')'; }
      // safe zone state: in the storm (red) / outside the next zone (orange when the ring is about to move; arrow +
      // distance). Inside the next zone the line steps aside for the goal line, which then carries a green check.
      // (the text is only rebuilt when the state, the rounded distance or the language changes: no per-frame strings)
      let sc = '', dnR = 0;
      const pp = pe.state === 'ground' && a.alive ? a.pos : null;
      if (pp && ring.phase !== 'idle') {
        const dn = ring.distToNext(pp.x, pp.z);
        if (!ring.contains(pp.x, pp.z)) { dnR = Math.round(Math.max(1, dn)); sc = 'storm'; }
        else if (dn > 1) { dnR = Math.round(dn); sc = ring.phase === 'close' || ring.timeLeft() < 15 ? 'go' : 'out'; }
        else sc = 'in';
      }
      const st = sc === 'storm' || sc === 'go' || sc === 'out';
      if (this.cache.sc !== sc || this.cache.dnR !== dnR || this.cache.stL !== G.i18n.lang) {
        this.cache.sc = sc; this.cache.dnR = dnR; this.cache.stL = G.i18n.lang; this.safe.innerHTML = '';
        this.safe.className = 'roy-safe' + (sc ? ' ' + sc : '');
        this.safe.hidden = !st;
        if (st) this.safe.append(el('b', { html: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 8h8M8 4l4 4-4 4" fill="none" stroke="#1e1a4d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), el('span', { text: G.t(sc === 'storm' ? 'roy.storm' : 'roy.safe.dist', { n: dnR }) }));
      }
      if (st && pp) {
        const ang = Math.atan2(ring.next.x - pp.x, -(ring.next.z - pp.z)) + a.yaw;
        const arrow = this.safe.firstChild; if (arrow) arrow.style.transform = 'rotate(' + (ang - Math.PI / 2).toFixed(2) + 'rad)';
      }
      this._goalLine(sc);
      // chips
      const alive = m.aliveCount();
      if (this.cache.leftN !== alive || this.cache.leftL !== G.i18n.lang) {
        const drop = this.cache.leftN != null && alive < this.cache.leftN;
        this.cache.leftN = alive; this.cache.leftL = G.i18n.lang; this.left.lastChild.textContent = G.t('roy.leftN', { n: alive });
        if (drop) { this.left.classList.remove('pulse'); void this.left.offsetWidth; this.left.classList.add('pulse'); }
      }
      const pops = String(pe.pops); if (this.cache.pops !== pops) { this.cache.pops = pops; this.pops.lastChild.textContent = pops; }
      // shield level
      const lv = pe.shieldLv, nxt = RY.SHIELD[lv + 1];
      const sk = lv + '|' + (nxt ? Math.floor((pe.dmg - RY.SHIELD[lv].need) / (nxt.need - RY.SHIELD[lv].need) * 20) : 'max');
      if (this.cache.sk !== sk) {
        this.cache.sk = sk;
        const pips = this.shield.children[2].children; for (let i = 0; i < 4; i++) pips[i].classList.toggle('on', i <= lv);
        const bar = this.shield.children[3].firstChild;
        bar.style.width = nxt ? (U.clamp((pe.dmg - RY.SHIELD[lv].need) / (nxt.need - RY.SHIELD[lv].need), 0, 1) * 100).toFixed(0) + '%' : '100%';
      }
      // consumables + buttons
      const inv = pe.inv;
      for (const k in this.invEls) {
        const n = inv.heals[k]; const e = this.invEls[k];
        if (e._n !== n) { e._n = n; e.lastChild.textContent = String(n); e.classList.toggle('zero', n <= 0); }
      }
      const hc = RY.Inv.healCount(inv);
      const healing = pe.healing;
      G.Input.setCooldown('gadget', healing ? U.clamp(healing.t / healing.dur, 0, 1) : 1, String(hc));
      const gb = G.Input.btn('gadget'); if (gb && gb._e !== (hc <= 0)) { gb._e = hc <= 0; gb.classList.toggle('empty', hc <= 0); }
      const thrN = inv.thr.n > 0 && pe.state === 'ground' && a.alive ? inv.thr.n : 0;
      const tk = thrN + '|' + inv.thr.id + '|' + G.Input.layout;
      if (this.cache.thr !== tk) {
        this.cache.thr = tk;
        G.Input.show('reload', thrN > 0);
        if (thrN > 0) { G.Input.setCooldown('reload', 1, String(thrN)); G.Input.setIcon('reload', RY.ICON[inv.thr.id] || RY.ICON.grenade); }
      }
      // heal progress
      if (healing) {
        this.healBar.hidden = false;
        const ht = G.t('roy.healing', { item: G.t('roy.it.' + healing.type) });
        if (this.healBar._t !== ht) { this.healBar._t = ht; this.healBar.firstChild.textContent = ht; }
        this.healBar.lastChild.firstChild.style.width = (U.clamp(healing.t / healing.dur, 0, 1) * 100).toFixed(0) + '%';
      } else this.healBar.hidden = true;
      // storm tint
      const out = pe.state === 'ground' && a.alive && ring.phase !== 'idle' && !ring.contains(a.pos.x, a.pos.z);
      const tintOp = out ? '1' : '0';
      if (this.cache.tint !== tintOp) { this.cache.tint = tintOp; this.tint.style.opacity = tintOp; }
      this._tags(now);
      this._loot();
      // compass
      this.compT -= dt;
      if (this.compT <= 0) { this.compT = 0.05; this._compass(); }
      if (this.over) { this.overT -= dt; if (this.overT <= 0) { this.overT = 0.06; this._drawOverview(); this._overText(); } }
      this._feedFit();
      void H;
    }
    // Touch: the kill feed (top-right column, under the minimap and chips) grew down over the button cluster (the
    // default layout has SWAP right under the chips). When the lines don't all fit above the first button under them,
    // the feed moves into the free strip left of the minimap (between the top-centre column and the minimap, clear of
    // every button; a long line wraps there, so the BOT pill always shows); without such a strip only the newest lines
    // that fit stay. Re-checked
    // when lines come or go and with the button rects a few times a second (moved buttons in the layout editor count).
    _feedFit() {
      const feed = this._feedEl && this._feedEl.isConnected ? this._feedEl : (this._feedEl = document.querySelector('#hud .feed'));
      if (!feed) return;
      const touch = G.input.device === 'touch';
      // (the top-centre column's width follows the ring / goal texts: their lengths are part of the key)
      let bh = 0; if (touch) for (const b of this._btnRects()) bh = (bh * 31 + b[0] + b[1] * 7 + b[2] * 13 + b[3] * 17) % 1e9;
      const n = feed.childElementCount, key = n + '|' + (touch ? bh + '|' + G.R.w + '|' + G.R.h + '|' + (this.cache.rt || '').length + '|' + (this.cache.goal || '').length + '|' + G.i18n.lang : '-');
      if (this._ffK === key) return;
      this._ffK = key;
      const lines = feed.children;
      for (const d of lines) if (d.style.display) d.style.display = '';
      if (feed.classList.contains('roy-side')) { feed.classList.remove('roy-side'); feed.style.right = feed.style.top = feed.style.maxWidth = ''; }
      if (!touch) return;
      const loc = e => (G.Screen ? G.Screen.rectToLocal(e.getBoundingClientRect()) : e.getBoundingClientRect());
      // lines on screen (short screens show 3 by CSS); the ones sliding out still take their room
      const vis = [];
      let out = 0;
      for (let i = lines.length - 1; i >= 0; i--) { const d = lines[i], dh = d.offsetHeight; if (!dh) continue; if (d.classList.contains('out')) out += dh + 4; else vis.push(d); }
      // how many of the newest lines fit from `top` down to the first button (or extra rect) overlapping [l, r]
      const fit = (l, r, top, extra) => {
        let limit = Infinity;
        for (const b of this._btnRects()) if (b[2] > l && b[0] < r && b[3] > top + 4) limit = Math.min(limit, b[1] - 4);
        if (extra) for (const b of extra) if (b.right > l && b.left < r && b.bottom > top + 4) limit = Math.min(limit, b.top - 4);
        let h = out, keep = 0;
        for (const d of vis) { const dh = d.offsetHeight + (keep ? 4 : 0); if (top + h + dh > limit) break; h += dh; keep++; }
        return keep;
      };
      let fr = loc(feed), wmax = 0;
      for (const d of vis) wmax = Math.max(wmax, d.offsetWidth);
      let keep = fit(fr.right - wmax, fr.right, fr.top);
      if (keep < vis.length) {
        const mm = document.querySelector('#hud .minimap'), tc = document.querySelector('#hud .hud-tc'), tr = feed.parentElement;
        if (mm && tc && tr && mm.offsetWidth) {
          const mr = loc(mm), cr = loc(tc), trr = loc(tr), avail = mr.left - 8 - (cr.right + 8);
          if (avail >= 110) {
            feed.classList.add('roy-side');
            feed.style.right = Math.round(trr.right - (mr.left - 8)) + 'px'; feed.style.top = Math.round(mr.top - trr.top) + 'px';
            feed.style.maxWidth = Math.floor(avail) + 'px';
            fr = loc(feed); wmax = 0;
            for (const d of vis) wmax = Math.max(wmax, d.offsetWidth);
            // (wrapped lines must not run down onto the rangers-left / pops chips under the minimap either)
            const chips = this.left && this.left.parentElement;
            keep = fit(fr.right - wmax, fr.right, fr.top, chips && chips.offsetWidth ? [loc(chips)] : null);
          }
        }
      }
      for (let i = keep; i < vis.length; i++) vis[i].style.display = 'none';
    }
    // The goal line under the compass says what to do now (re-evaluated 4x a second): loot up (blasters / heals
    // count), outlast the bots, final N. It shares the slot with the safe-zone line, which wins while you are outside
    // the next zone (then *that* is the goal); inside the zone the goal line wears a green check instead.
    _goalLine(sc) {
      this.goalT = (this.goalT || 0) - G.time.dt;
      if (this.goalT > 0 && this.cache.gsc === sc) return;
      this.goalT = 0.25; this.cache.gsc = sc;
      const m = this.m, pe = m.player;
      let key = null, params = null, fin = false;
      if (pe.state === 'ground' && pe.actor.alive && m.phase === 'play' && sc !== 'storm' && sc !== 'go' && sc !== 'out') {
        const alive = m.aliveCount();
        const weapons = pe.inv.slots.filter((s, i) => i > 0 && s).length, heals = RY.Inv.healCount(pe.inv);
        if (alive <= 3) { key = 'roy.goal.final'; params = { n: alive }; fin = true; }
        else if (weapons < 2 && m.ring.round === 0 && m.world.time - (pe.landT || 0) < 75) { key = 'roy.goal.loot'; params = { w: weapons, h: heals }; }
        else { key = 'roy.goal.win'; params = { n: alive - 1 }; }
      }
      const txt = key ? G.t(key, params) : '', inZone = sc === 'in';
      if (this.cache.goal !== txt || this.cache.gin !== inZone) {
        this.cache.goal = txt; this.cache.gin = inZone;
        this.goal.hidden = !txt;
        this.goal.lastChild.textContent = txt;
        this.goal.firstChild.innerHTML = inZone ? GOAL_IN : RY.ICON.goal;
        this.goal.title = inZone ? G.t('roy.safe.in') : '';
        this.goal.classList.toggle('final', fin);
      }
    }
    _tags(now) {
      const m = this.m, cam = G.R.camera, W = G.R.w, Hh = G.R.h;
      let n = 0;
      if (m.player.state === 'ground' || m.phase === 'spectate') {
        for (const e of m.rangers) {
          if (e.isPlayer || !e.alive || e.state !== 'ground' || n >= this.tags.length) continue;
          const a = e.actor;
          if (now - (e.spotT || -99) > 0.6) continue;
          const d = cam.position.distanceTo(a.pos);
          if (d > 34) continue;
          _v.set(a.pos.x, a.pos.y + 2.25, a.pos.z).project(cam);
          if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) continue;
          if ((-_v.y * 0.5 + 0.5) * Hh < 118) continue;         // would sit on the ring chip / compass / goal line
          const t = this.tags[n++];
          t.hidden = false;
          const label = e.name;
          if (t._l !== label) { t._l = label; t.firstChild.children[1].textContent = label; t.firstChild.firstChild.hidden = e !== m.champBot; }
          const tot = a.maxHp + a.maxShield;
          t.lastChild.children[0].style.width = (a.shield / tot * 100).toFixed(0) + '%';
          t.lastChild.children[1].style.width = (a.hp / tot * 100).toFixed(0) + '%';
          t.style.transform = 'translate(' + ((_v.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-_v.y * 0.5 + 0.5) * Hh).toFixed(1) + 'px) translate(-50%,-100%)';
          t.style.opacity = d > 26 ? ((34 - d) / 8).toFixed(2) : '1';
        }
      }
      for (let i = n; i < this.tags.length; i++) if (!this.tags[i].hidden) this.tags[i].hidden = true;
    }
    _setLoot(e, it, act, dock, avoid) {
      let pos = null;
      if (!dock) {
        pos = it.pos ? _v.set(it.pos.x, it.pos.y + 1.15, it.pos.z) : _v.set(it.x, it.y + 1.4, it.z);
        pos.project(G.R.camera);
        if (pos.z > 1) { e.hidden = true; return; }
      }
      e.hidden = false;
      const isBin = it.kind === 'bin';
      const rar = isBin ? (it.drop ? 4 : 1) : it.rar;
      const name = isBin ? G.t(it.drop ? 'roy.it.drop' : 'roy.it.bin') : RY.itemName(it);
      const key = name + '|' + rar + '|' + (act || '') + (dock ? '|d' : '') + '|' + G.input.device;
      if (e._k !== key) {
        e._k = key; e._sz = null;
        e.classList.toggle('dock', !!dock);
        e.style.setProperty('--rc', RY.RARITY[rar].css);
        e.children[0].textContent = name;
        const pips = e.children[1].children; for (let i = 0; i < 5; i++) pips[i].classList.toggle('on', i <= rar);
        if (e.children[2]) {
          e.children[2].innerHTML = '';
          if (act) {
            if (G.input.device === 'desktop') e.children[2].appendChild(el('kbd', { text: 'E' }));
            else if (G.input.device === 'gamepad') e.children[2].appendChild(RY.padGlyph(PAD_MARK.x));
            else if (dock && G.Input.ICONS && G.Input.ICONS.interact) e.children[2].appendChild(el('span', { html: G.Input.ICONS.interact, style: { display: 'inline-flex' } }));
            e.children[2].appendChild(document.createTextNode(act));
          }
        }
      }
      if (!e._sz || !e._sz[0]) e._sz = [e.offsetWidth, e.offsetHeight];   // re-measure if it was taken while the HUD was hidden
      const W = G.R.w, Hh = G.R.h, cw = e._sz[0], ch = e._sz[1];
      if (!dock) {
        const sx = (pos.x * 0.5 + 0.5) * W, sy = (-pos.y * 0.5 + 0.5) * Hh;
        e.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,-100%)';
        // touch: a floating label that lands on a button (or on the docked card) fades out of the way
        let veil = false;
        if (avoid) for (const r of avoid) if (sx - cw / 2 < r[2] && sx + cw / 2 > r[0] && sy - ch < r[3] && sy > r[1]) { veil = true; break; }
        if (e._veil !== veil) { e._veil = veil; e.classList.toggle('veil', veil); }
        return;
      }
      // docked: beside the hand button, on the side facing the screen centre, vertically centred on it
      const right = dock.x + dock.w / 2 > W / 2;
      const x = U.clamp(right ? dock.x - 10 - cw : dock.x + dock.w + 10, 6, Math.max(6, W - cw - 6));
      const y = U.clamp(dock.y + dock.h / 2 - ch / 2, 6, Math.max(6, Hh - ch - 6));
      e.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
      const b = this._dockBox || (this._dockBox = [0, 0, 0, 0]);
      b[0] = x; b[1] = y; b[2] = x + cw; b[3] = y + ch;
    }
    // Touch: frame rects [l, t, r, b] of the visible touch buttons (re-read a few times a second).
    _btnRects() {
      const out = this._br || (this._br = []);
      if (G.input.device !== 'touch') { out.length = 0; return out; }
      if (this._brF != null && G.time.frame - this._brF < 8 && this._brL === G.Input.layout) return out;
      this._brF = G.time.frame; this._brL = G.Input.layout; out.length = 0;
      const touch = document.getElementById('touch');
      if (touch) for (const b of touch.querySelectorAll('.tbtn')) { if (b.hidden || !b.offsetWidth) continue; out.push([b.offsetLeft, b.offsetTop, b.offsetLeft + b.offsetWidth, b.offsetTop + b.offsetHeight]); }
      return out;
    }
    // Touch: frame rect of the visible interact (hand) button, or null.
    _dockRect() {
      if (G.input.device !== 'touch') return null;
      const ib = G.Input.btn && G.Input.btn('interact');
      if (!ib || ib.hidden || !ib.offsetWidth) return null;
      const r = this._dr || (this._dr = {});
      r.x = ib.offsetLeft; r.y = ib.offsetTop; r.w = ib.offsetWidth; r.h = ib.offsetHeight;
      return r;
    }
    _loot() {
      const m = this.m, pe = m.player;
      const cand = pe.state === 'ground' && pe.actor.alive ? m.lootCand : null;
      const dock = cand ? this._dockRect() : null;
      // the docked card carries the action ("Swap", "Open") itself, so the core prompt pill steps aside — but only
      // while the hand button acts on this item (a nearby balloon can own the prompt instead)
      const own = !!dock && !!m.lootIt && pe.actor.near === m.lootIt;
      if (this.cache.dock !== own) { this.cache.dock = own; if (this.hudEl) this.hudEl.classList.toggle('roy-lootdock', own); }
      const avoid = G.input.device === 'touch' ? this._btnRects() : null;
      if (cand) this._setLoot(this.lootMain, cand, own ? G.t(m.lootIt.key) : m.lootAction, dock); else this.lootMain.hidden = true;
      if (avoid && dock && !this.lootMain.hidden && this._dockBox) avoid.push(this._dockBox);
      let n = 0;
      if (pe.state === 'ground' && pe.actor.alive) {
        const list = m.loot.near(pe.actor.pos, 5.5, this._nb || (this._nb = []));
        for (const it of list) {
          if (it === cand || it.vel || n >= this.smalls.length) continue;
          this._setLoot(this.smalls[n++], it, null, null, avoid);
        }
      }
      if (avoid && avoid[avoid.length - 1] === this._dockBox) avoid.pop();
      for (let i = n; i < this.smalls.length; i++) this.smalls[i].hidden = true;
    }
    _compass() {
      const m = this.m, pe = m.player, c = this.comp, g = c.getContext('2d');
      const W = c.width, Hh = c.height;
      g.clearRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(30,26,77,0.55)';
      g.beginPath(); g.moveTo(14, 0); g.lineTo(W - 14, 0); g.quadraticCurveTo(W, 0, W, 14); g.lineTo(W, Hh - 14); g.quadraticCurveTo(W, Hh, W - 14, Hh); g.lineTo(14, Hh); g.quadraticCurveTo(0, Hh, 0, Hh - 14); g.lineTo(0, 14); g.quadraticCurveTo(0, 0, 14, 0); g.fill();
      const yaw = pe.state === 'ship' ? Math.atan2(m.airship.dir.x, m.airship.dir.z) + Math.PI : pe.actor.yaw;
      const head = -yaw; // bearing clockwise from north (-Z)
      const fov = Math.PI * 0.75, pxr = W / fov;
      const toX = b => { const d = U.wrapAngle(b - head); return Math.abs(d) > fov / 2 ? null : W / 2 + d * pxr; };
      if (!this._cfont) this._cfont = '800 22px ' + (getComputedStyle(document.body).getPropertyValue('--f-body') || 'sans-serif');
      g.font = this._cfont;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const L = ['N', 'E', 'S', 'W'];
      for (let i = 0; i < 24; i++) {
        const b = i * TAU / 24, x = toX(b);
        if (x == null) continue;
        if (i % 6 === 0) { g.fillStyle = i === 0 ? '#ffd23f' : '#fff'; g.fillText(L[i / 6], x, Hh / 2 + 1); }
        else { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - 1, Hh / 2 - (i % 2 ? 4 : 7), 2, i % 2 ? 8 : 14); }
      }
      const pp = pe.state === 'ground' ? pe.actor.pos : pe.state === 'sky' ? pe.sky.pos : null;
      const mark = (wx, wz, col) => {
        if (!pp) return;
        const b = Math.atan2(wx - pp.x, -(wz - pp.z));
        const x = toX(b); if (x == null) return;
        g.fillStyle = col; g.strokeStyle = '#1e1a4d'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x, Hh - 2); g.lineTo(x - 7, Hh - 12); g.lineTo(x + 7, Hh - 12); g.closePath(); g.fill(); g.stroke();
      };
      const ring = m.ring;
      if (ring.phase !== 'idle') mark(ring.next.x, ring.next.z, '#7af0ff');
      for (const d of ring.drops) if (d.state === 'announced' || d.state === 'falling' || d.state === 'landed') mark(d.pos.x, d.pos.z, '#fff1c8');
      for (const p of m.pings) mark(p.pos.x, p.pos.z, p.color);
      g.fillStyle = '#fff'; g.fillRect(W / 2 - 1.5, 0, 3, 7);
    }
    dispose() {
      const touch = document.getElementById('touch'); if (touch) touch.classList.remove('roy-sky');
      if (this.hudEl) this.hudEl.classList.remove('roy-air', 'roy-out', 'roy-on', 'roy-lootdock');
      if (this._feedEl) { for (const d of this._feedEl.children) d.style.display = ''; this._feedEl.classList.remove('roy-side'); this._feedEl.style.right = this._feedEl.style.top = this._feedEl.style.maxWidth = ''; }
      G.HUD.minimapDraw = null; G.HUD.minimapRange = 60;
      if (G.Input.ICONS) { G.Input.setIcon('gadget', G.Input.ICONS.gadget); G.Input.setIcon('reload', G.Input.ICONS.reload); G.Input.setCooldown('gadget', 1, ''); G.Input.setCooldown('reload', 1, ''); }
      const gb = G.Input.btn('gadget'); if (gb) gb.classList.remove('empty');
    }
  }
  RY.Hud = Hud;
})(window.G);

}).call(window); } catch (e) { console.error('[module 25b_royale_hud.js]', e); }
// ---- 25b_royale_loot.js
try { (function () {
// 25b_royale_loot.js — royale ground loot, supply bins, inventory and smart-heal.
//   RY.Loot(match): populate(map), add(kind, type, rar, pos, extra), take(item), near(pos, r, out),
//     candidate(pos, fwd) (player INTERACT target), rayPick(o, d, maxT), update(dt), dispose().
//   Visuals: one InstancedMesh per item type (weapon types use the weapon viewmodel baked into one
//   geometry), one additive Points cloud for all tier glows, one InstancedMesh for rarity beams,
//   two InstancedMeshes for closed/open supply bins. Only items near the camera are drawn.
//   RY.makeWeapon(id, rar, owner) -> weapon instance (G.Weapons, or RY.FallbackWeapon).
//   RY.Inv: inventory helpers shared by the player and bots (give, smartPick, heal apply, ammo).
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};
  const U = G.util;
  const V3 = THREE.Vector3;
  const TAU = Math.PI * 2;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3(), _c = new THREE.Color(), _v = new V3(), _w = new V3();

  // ------------------------------------------------------------------ weapons
  // Fallback stats (GDD §5.2, simplified) used only when G.Weapons is unavailable.
  const FB = {
    fizz: { dmg: 18, rate: 5, speed: 70, spread: 0.6, ammo: Infinity, kind: 'bolt', range: 60, size: 0.09, snd: 'blaster' },
    scatter: { dmg: 10, pellets: 8, rate: 1.25, speed: 60, life: 0.35, spread: 6, ammo: 24, kind: 'orb', range: 20, size: 0.06, snd: 'shotgun', knock: 3 },
    lobber: { dmg: 0, aoe: 3.5, aoeDmg: 65, rate: 1.4, speed: 20, grav: 18, ammo: 16, kind: 'grenade', range: 22, size: 0.18, snd: 'grenade', bounce: 1, noAuto: true },
    zap: { dmg: 9, rate: 10, hitscan: true, range: 16, ammo: 150, snd: 'zap' },
    saw: { dmg: 32, rate: 1.6, speed: 26, ammo: 30, kind: 'disc', range: 25, size: 0.2, snd: 'disc', bounce: 2, spin: 20 },
    lancer: { dmg: 95, rate: 0.85, hitscan: true, range: 80, ammo: 12, snd: 'chargeShot', noAuto: true },
    gatling: { dmg: 9, rate: 13, speed: 65, spread: 3, ammo: 240, kind: 'bolt', range: 45, size: 0.06, snd: 'blasterHeavy' },
    swarm: { dmg: 40, aoe: 2.5, aoeDmg: 20, rate: 1.5, speed: 22, homing: 2.5, ammo: 20, kind: 'rocket', range: 45, size: 0.16, snd: 'missile', noAuto: true },
    splat: { dmg: 14, rate: 8, speed: 40, grav: 6, spread: 4, ammo: 200, kind: 'ink', range: 18, size: 0.1, snd: 'ink' },
    chill: { dmg: 6, rate: 10, hitscan: true, cone: 20, range: 10, ammo: 120, snd: 'freeze', slow: 0.6 },
    prism: { dmg: 60, aoe: 3, aoeDmg: 30, rate: 1.1, speed: 26, homing: 3.5, ammo: 10, kind: 'rocket', range: 50, size: 0.2, snd: 'rocket', burst: 3 },
  };
  RY.FB_WEAPONS = FB;
  const _fe = new V3(), _fd = new V3(), _fo = new V3();
  class FallbackWeapon {
    constructor(id, rar, owner) {
      const st = FB[id] || FB.fizz;
      this.def = { id, range: st.range || 40, noAuto: !!st.noAuto, color: RY.WEAPON_COLOR[id] || 0x7ff3ff };
      this.st = st; this.id = id; this.owner = owner; this.level = 1; this.rar = rar || 0;
      this.mult = RY.DMG_MULT[this.rar] || 1;
      this.maxAmmo = st.ammo; this.ammo = st.ammo;
      this.cd = 0; this.spreadNow = (st.spread || 1) * Math.PI / 180 * 0.6; this.heat = 0;
    }
    update(dt, ctx) {
      this.cd -= dt;
      const st = this.st;
      if (!ctx.firing || this.cd > 0) { this.spreadNow = U.damp(this.spreadNow, (st.spread || 1) * 0.01, 4, dt); return; }
      if (this.ammo <= 0) { if (this.owner && this.owner.isPlayer && this.cd < -0.3) { this.cd = 0.3; if (G.Audio) G.Audio.sfx('empty'); } return; }
      this.cd = 1 / st.rate;
      if (this.ammo !== Infinity) this.ammo--;
      const w = ctx.world, team = ctx.team, src = ctx.owner;
      const n = st.pellets || st.burst || 1;
      for (let i = 0; i < n; i++) {
        const sp = (st.spread || 0.3) * Math.PI / 180;
        _fd.copy(st.hitscan ? ctx.eyeDir : ctx.dir);
        _fd.x += (Math.random() - 0.5) * 2 * sp; _fd.y += (Math.random() - 0.5) * 2 * sp; _fd.z += (Math.random() - 0.5) * 2 * sp; _fd.normalize();
        if (st.hitscan) {
          const h = w.hitscan(ctx.eye, _fd, st.range, src);
          const end = h ? h.point : _fo.copy(ctx.eye).addScaledVector(_fd, st.range);
          w.fx.tracer(ctx.origin, end, this.def.color, st.cone ? 0.25 : 0.07, 0.07);
          if (h && h.actor) {
            w.damage(h.actor, st.dmg * this.mult, { src, type: 'beam', pos: h.point, dir: _fd.clone(), crit: h.crit, mult: h.crit ? 1.5 : 1, weapon: this });
            if (st.slow && h.actor.alive) { h.actor.slowT = 1.2; h.actor.slowK = st.slow; }
          }
        } else {
          w.projectiles.spawn({ pos: ctx.origin, dir: _fd, speed: st.speed, gravity: st.grav || 0, life: st.life || (st.range / st.speed) * 1.3 + 0.2, radius: 0.12, damage: st.dmg * this.mult, aoe: st.aoe || 0, aoeDmg: (st.aoeDmg || 0) * this.mult, src, team, color: this.def.color, kind: st.kind, size: st.size, bounce: st.bounce || 0, homing: st.homing || 0, knock: st.knock || 0, fuse: st.kind === 'grenade', spin: st.spin || 0, crit: 1.6, weapon: this });
        }
      }
      if (G.Audio) { if (src && src.isPlayer) G.Audio.sfx(st.snd); else G.Audio.sfxAt(st.snd, ctx.origin); }
      if (src && src.onFired) src.onFired(0.006 + (st.dmg * n) * 0.00012, 0.03, st.aoe ? 0.08 : 0.02);
    }
    idle(dt) { this.cd -= dt; }
    refill() { this.ammo = this.maxAmmo; }
    reload() {}
    onEquip() {} onUnequip() {}
    xpFrac() { return 0; }
    ammoText() { return this.ammo === Infinity ? '∞' : Math.ceil(this.ammo) + '<small>/' + this.maxAmmo + '</small>'; }
    buildViewmodel() {
      const g = new THREE.Group();
      const col = this.def.color;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 3, 10).rotateX(Math.PI / 2), G.M.toon(col, { spec: 0.6 }));
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.16, 10).rotateX(Math.PI / 2), G.M.toon(0xe8b44a));
      barrel.position.z = -0.17;
      const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 3, 8), G.M.toon(0x1f2a5a));
      grip.position.set(0, -0.08, 0.04); grip.rotation.x = 0.3;
      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), G.M.basic(RY.RARITY[this.rar].color));
      glow.position.z = -0.06;
      g.add(body, barrel, grip, glow);
      return g;
    }
  }
  RY.FallbackWeapon = FallbackWeapon;

  RY.makeWeapon = function (id, rar, owner) {
    let inst = null;
    if (G.Weapons && G.Weapons.create && (!G.Weapons.defs || G.Weapons.defs[id])) {
      const rid = RY.RARITY[rar || 0].id;
      // Royale ammo: weapons come with 2x base ammo (GDD §5.1); rarity multiplies damage (and mag).
      inst = G.safe('royale weapon', () => G.Weapons.create(id, 1, [], owner, { rarity: rid, ammoMult: id === 'fizz' ? 1 : 2 }));
    }
    if (!inst) { inst = new FallbackWeapon(id, rar, owner); if (isFinite(inst.maxAmmo) && id !== 'fizz') { inst.maxAmmo *= 2; inst.ammo = inst.maxAmmo; } }
    inst.royRar = rar || 0;
    inst.royId = id;
    return inst;
  };
  RY.weaponPower = function (id, rar) { return (RY.WEAPON_TIER[id] || 2) * (1 + (rar || 0) * 0.22); };

  // ------------------------------------------------------------------ inventory (player + bots)
  // ent.inv = {slots:[{id, rar, inst} | null] (slot 0 = Fizz Blaster), heals:{pop,medkit,cell,battery}, thr:{id, n}}
  const Inv = RY.Inv = {
    create(owner) {
      return { slots: [{ id: 'fizz', rar: 0, inst: RY.makeWeapon('fizz', 0, owner) }, null, null], heals: { pop: 0, medkit: 0, cell: 0, battery: 0 }, thr: { id: null, n: 0 } };
    },
    freeSlot(inv) { for (let i = 1; i < inv.slots.length; i++) if (!inv.slots[i]) return i; return -1; },
    worstSlot(inv) {
      let wi = 1, wp = Infinity;
      for (let i = 1; i < inv.slots.length; i++) { const s = inv.slots[i]; const p = s ? RY.weaponPower(s.id, s.rar) : -1; if (p < wp) { wp = p; wi = i; } }
      return wi;
    },
    // Can this item be taken without a swap? Returns 'take' | 'swap' | 'full' | 'useless'
    canTake(inv, it, actor) {
      if (it.kind === 'weapon') return Inv.freeSlot(inv) >= 0 ? 'take' : 'swap';
      if (it.kind === 'heal') return inv.heals[it.type] < RY.HEALS[it.type].stack ? 'take' : 'full';
      if (it.kind === 'throw') {
        if (!inv.thr.id || inv.thr.n <= 0) return 'take';
        if (inv.thr.id === it.type) return inv.thr.n < RY.THROWS[it.type].stack ? 'take' : 'full';
        return 'swap';
      }
      if (it.kind === 'ammo') {
        for (let i = 1; i < inv.slots.length; i++) { const s = inv.slots[i]; if (s && s.inst && s.inst.maxAmmo && isFinite(s.inst.maxAmmo) && s.inst.ammo < s.inst.maxAmmo) return 'take'; }
        return 'useless';
      }
      void actor;
      return 'useless';
    },
    // Ammo Box: +50% of base ammo (= 25% of the doubled royale mag) for every carried loot weapon.
    ammoBox(inv) {
      for (let i = 1; i < inv.slots.length; i++) {
        const s = inv.slots[i]; if (!s || !s.inst || !s.inst.maxAmmo || !isFinite(s.inst.maxAmmo)) continue;
        if (s.inst.addAmmo) s.inst.addAmmo(0.25);
        else s.inst.ammo = Math.min(s.inst.maxAmmo, s.inst.ammo + Math.ceil(s.inst.maxAmmo * 0.25));
      }
    },
    healNeed(actor, type) {
      const h = RY.HEALS[type];
      if (h.hp) return actor.hp < actor.maxHp - 1;
      return actor.shield < actor.maxShield - 1;
    },
    // GDD smart-heal priority.
    smartPick(inv, actor) {
      const shMiss = actor.maxShield - actor.shield, hpMiss = actor.maxHp - actor.hp;
      if (shMiss >= 50 && inv.heals.battery > 0) return 'battery';
      if (shMiss > 1 && inv.heals.cell > 0) return 'cell';
      if (shMiss > 1 && inv.heals.battery > 0) return 'battery';
      if (hpMiss >= 60 && inv.heals.medkit > 0) return 'medkit';
      if (hpMiss > 1 && inv.heals.pop > 0) return 'pop';
      if (hpMiss > 1 && inv.heals.medkit > 0) return 'medkit';
      return null;
    },
    applyHeal(actor, type) {
      const h = RY.HEALS[type];
      if (h.hp) actor.hp = Math.min(actor.maxHp, actor.hp + h.hp);
      if (h.sh) actor.shield = Math.min(actor.maxShield, actor.shield + h.sh);
    },
    healCount(inv) { const h = inv.heals; return h.pop + h.medkit + h.cell + h.battery; },
    power(inv) { let p = 0; for (const s of inv.slots) if (s) p = Math.max(p, RY.weaponPower(s.id, s.rar)); return p; },
  };

  // ------------------------------------------------------------------ item geometry
  const GEO = {};
  function normGeo(g, size) {
    g.computeBoundingBox();
    const bb = g.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const L = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) || 1;
    g.translate(-cx, -cy, -cz); g.scale(size / L, size / L, size / L);
    g.computeBoundingSphere();
    return g;
  }
  function weaponGeo(id) {
    let g = null;
    if (G.Weapons && G.Weapons.create) {
      g = G.safe('roy vm bake', () => {
        const inst = G.Weapons.create(id, 1, [], null, { rarity: 'common' });
        if (!inst || !inst.buildViewmodel) return null;
        const vm = inst.buildViewmodel();
        if (!vm) return null;
        const holder = new THREE.Group(); holder.add(vm); vm.position.set(0, 0, 0); vm.rotation.set(0, 0, 0);
        // drop hands/arms if the weapon tagged them
        vm.traverse(o => { if (o.userData && (o.userData.hand || o.userData.arm)) o.visible = false; });
        const b = G.Geo.bake(holder);
        const geo = b.geometry ? b.geometry.clone() : null;
        if (geo && b.children.length) {
          const extra = b.children.filter(c => c.isMesh && c.geometry && c.material && !c.material.transparent && !c.material.map).map(c => { const cg = c.geometry.clone(); cg.applyMatrix4(c.matrix); return cg; });
          if (extra.length) return G.Geo.merge([geo].concat(extra));
        }
        return geo;
      });
    }
    if (!g || !g.attributes.position || g.attributes.position.count < 8) {
      const P = G.Geo.P, col = RY.WEAPON_COLOR[id] || 0x7ff3ff;
      g = G.Geo.merge([
        G.Geo.colorize(G.Geo.xf(P.cap(0.11, 0.42, 3, 10), 0, 0, 0, Math.PI / 2, 0, 0), col),
        G.Geo.colorize(G.Geo.xf(P.cyl(0.05, 0.06, 0.32, 10), 0, 0.02, -0.38, Math.PI / 2, 0, 0), 0xe8b44a),
        G.Geo.colorize(G.Geo.xf(P.cap(0.06, 0.16, 3, 8), 0, -0.16, 0.12, 0.35, 0, 0), 0x1f2a5a),
        G.Geo.colorize(G.Geo.xf(P.tor(0.12, 0.025, 5, 14), 0, 0, -0.12), 0xffffff),
      ]);
    }
    return normGeo(g, id === 'gatling' || id === 'lancer' ? 1.0 : 0.85);
  }
  function itemGeo(key) {
    if (GEO[key]) return GEO[key];
    if (key === 'w:lo') {
      const P = G.Geo.P, C = G.Geo.colorize, X = G.Geo.xf;
      const g = normGeo(G.Geo.merge([
        C(X(P.cap(0.11, 0.42, 2, 8), 0, 0, 0, Math.PI / 2, 0, 0), 0xffffff),
        C(X(P.cyl(0.055, 0.065, 0.32, 8), 0, 0.02, -0.38, Math.PI / 2, 0, 0), 0xc8c0b0),
        C(X(P.box(0.1, 0.22, 0.12), 0, -0.16, 0.12, 0.35, 0, 0), 0x8890a8),
      ]), 0.85);
      g.userData.shared = true; GEO[key] = g; return g;
    }
    const P = G.Geo.P, C = G.Geo.colorize, X = G.Geo.xf, M = G.Geo.merge;
    let g;
    const [kind, type] = key.split(':');
    if (kind === 'w') g = weaponGeo(type);
    else if (type === 'pop') g = normGeo(M([C(P.sph(0.2, 14, 10), 0xff7ab8), C(X(P.rbox(0.18, 0.06, 0.03, 0.01), 0, 0, 0.2), 0xffffff), C(X(P.rbox(0.06, 0.18, 0.03, 0.01), 0, 0, 0.2), 0xffffff), C(X(P.cyl(0.05, 0.07, 0.08, 8), 0, 0.22, 0), 0xffd23f)]), 0.42);
    else if (type === 'medkit') g = normGeo(M([C(P.rbox(0.5, 0.32, 0.36, 0.08), 0xff5a6e), C(X(P.rbox(0.24, 0.07, 0.04, 0.02), 0, 0, 0.19), 0xffffff), C(X(P.rbox(0.07, 0.24, 0.04, 0.02), 0, 0, 0.19), 0xffffff), C(X(P.tor(0.09, 0.025, 5, 10, Math.PI), 0, 0.17, 0), 0xe8b44a)]), 0.55);
    else if (type === 'cell') g = normGeo(M([C(X(P.cyl(0.13, 0.13, 0.3, 6), 0, 0, 0), 0x39d5ff), C(X(P.cyl(0.15, 0.15, 0.05, 6), 0, 0.17, 0), 0xe8b44a), C(X(P.cyl(0.15, 0.15, 0.05, 6), 0, -0.17, 0), 0xe8b44a)]), 0.42);
    else if (type === 'battery') g = normGeo(M([C(X(P.cyl(0.18, 0.18, 0.42, 6), 0, 0, 0), 0x2f7bff), C(X(P.cyl(0.2, 0.2, 0.06, 6), 0, 0.24, 0), 0xffd23f), C(X(P.cyl(0.2, 0.2, 0.06, 6), 0, -0.24, 0), 0xffd23f), C(X(P.cyl(0.06, 0.07, 0.08, 8), 0, 0.3, 0), 0x1f2a5a), C(X(P.rbox(0.08, 0.28, 0.02, 0.01), 0, 0, 0.17), 0x9ff0ff)]), 0.55);
    else if (type === 'grenade') g = normGeo(M([C(P.sph(0.18, 12, 10), 0xff8fc0), C(X(P.sph(0.06, 8, 6), -0.07, 0.07, 0.12), 0xffffff), C(X(P.cyl(0.03, 0.03, 0.12, 6), 0.05, 0.2, 0, 0, 0, -0.5), 0x1f2a5a)]), 0.4);
    else if (type === 'groove') g = normGeo(M([C(new THREE.IcosahedronGeometry(0.2, 1), (x, y, z) => [0xb983ff, 0xe6ecff, 0xff9ad0, 0x7af0ff][(Math.floor((x + y * 1.7 + z * 2.3) * 12) % 4 + 4) % 4]), C(X(P.cyl(0.12, 0.08, 0.1, 10), 0, -0.22, 0), 0xe8b44a)]), 0.44);
    else if (type === 'bloom') g = normGeo(M([C(G.Geo.lathe([[0.1, 0], [0.15, 0.02], [0.17, 0.2], [0.13, 0.22], [0, 0.2]], 10), 0xd9774a), C(X(P.sph(0.1, 8, 6), 0, 0.3, 0), 0x6ccb5f), C(X(P.sph(0.07, 8, 6), 0.08, 0.38, 0), 0xff7a93), C(X(P.sph(0.07, 8, 6), -0.08, 0.38, 0), 0xffd45c)]), 0.44);
    else if (type === 'ammo') g = normGeo(M([C(P.rbox(0.5, 0.28, 0.34, 0.06), 0x2b5fa8), C(X(P.rbox(0.52, 0.08, 0.36, 0.02), 0, 0, 0), 0xffd23f), C(X(P.cap(0.04, 0.12, 2, 8), -0.12, 0.22, 0), 0xe8b44a), C(X(P.cap(0.04, 0.12, 2, 8), 0, 0.22, 0), 0xe8b44a), C(X(P.cap(0.04, 0.12, 2, 8), 0.12, 0.22, 0), 0xe8b44a)]), 0.5);
    else g = normGeo(P.sph(0.2, 10, 8), 0.4);
    g.userData.shared = true;
    GEO[key] = g;
    return g;
  }
  function binGeo(open) {
    const key = open ? 'bin:open' : 'bin:closed';
    if (GEO[key]) return GEO[key];
    const P = G.Geo.P, C = G.Geo.colorize, X = G.Geo.xf;
    const parts = [
      C(X(P.box(1.4, 0.72, 0.95), 0, 0.4, 0), 0x3d55b8),
      C(X(P.box(1.46, 0.12, 1.0), 0, 0.1, 0), 0xffd23f),
      C(X(P.box(1.46, 0.08, 1.0), 0, 0.5, 0), 0xffd23f),
      C(X(P.box(0.14, 0.82, 1.02), -0.62, 0.41, 0), 0x1f2a5a),
      C(X(P.box(0.14, 0.82, 1.02), 0.62, 0.41, 0), 0x1f2a5a),
    ];
    if (open) {
      parts.push(C(X(P.box(1.4, 0.14, 0.95), 0, 1.0, -0.62, -1.15, 0, 0), 0x5b78e0));
      parts.push(C(X(P.box(1.3, 0.04, 0.85), 0, 0.77, 0), 0x141b3d));
    } else {
      parts.push(C(X(P.box(1.42, 0.16, 0.97), 0, 0.84, 0), 0x5b78e0));
      parts.push(C(X(P.box(1.0, 0.06, 0.04), 0, 0.84, 0.49), 0x7af0ff));
      parts.push(C(X(P.box(0.3, 0.18, 0.06), 0, 0.62, 0.5), 0xffd23f));
    }
    const g = G.Geo.merge(parts); g.userData.shared = true;
    GEO[key] = g;
    return g;
  }

  // ------------------------------------------------------------------ glow points material
  function glowPoints(cap) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3), size = new Float32Array(cap);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 300 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vC; uniform float uScale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c,c); if (d > 0.25) discard; float a = smoothstep(0.25, 0.0, d); gl_FragColor = vec4(vC * a * 0.9, 1.0); }',
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false; pts.renderOrder = 6;
    return pts;
  }

  // ------------------------------------------------------------------ Loot system
  const CELL = 16, OFF = 256;
  const ck = (x, z) => (((x + OFF) / CELL) | 0) * 1000 + (((z + OFF) / CELL) | 0);
  let _iid = 1;
  class Loot {
    constructor(match) {
      this.m = match; this.world = match.world;
      this.items = []; this.bins = []; this.grid = new Map();
      this.meshes = new Map();
      this.drawR = 70;
      const MAXG = 420;
      this.glow = glowPoints(MAXG); this.glowCap = MAXG;
      this.world.add(this.glow);
      const bg = new THREE.CylinderGeometry(0.1, 0.22, 1, 8, 1, true); bg.translate(0, 0.5, 0);
      this.beams = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), 160);
      this.beams.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(160 * 3), 3);
      this.beams.count = 0; this.beams.frustumCulled = false; this.beams.renderOrder = 7;
      this.world.add(this.beams);
      this.sparkT = 0;
    }
    // --- spawning
    rollItem(rnd, w, binMode) {
      const r = rnd();
      const diff = this.m.diff;
      const wts = RY.weights(w, diff);
      if (r < (binMode ? 0.5 : 0.42)) {
        const rar = RY.rollRarity(wts, rnd);
        return { kind: 'weapon', type: RY.WEAPON_POOL[(rnd() * RY.WEAPON_POOL.length) | 0], rar };
      }
      if (r < (binMode ? 0.8 : 0.72)) {
        const h = rnd();
        const type = h < 0.35 ? 'pop' : h < 0.7 ? 'cell' : h < 0.86 ? 'medkit' : 'battery';
        return { kind: 'heal', type, rar: RY.HEALS[type].rar };
      }
      if (r < (binMode ? 0.92 : 0.88)) return { kind: 'ammo', type: 'ammo', rar: 0 };
      const t = rnd();
      const type = t < 0.76 ? 'grenade' : t < 0.88 ? 'groove' : 'bloom';
      return { kind: 'throw', type, rar: RY.THROWS[type].rar };
    }
    populate(map) {
      const rnd = this.m.rnd;
      for (const s of map.spots) {
        const n = s.high ? 2 : (rnd() < 0.4 ? 2 : 1);
        for (let i = 0; i < n; i++) {
          const d = this.rollItem(rnd, RY.FLOOR_W, false);
          if (s.high && i === 0 && d.kind === 'weapon') d.rar = Math.max(d.rar, rnd() < 0.5 ? 2 : 1);
          const a = rnd() * TAU, off = n > 1 ? 0.75 : 0;
          this.add(d.kind, d.type, d.rar, _p.set(s.x + Math.cos(a) * off, s.y, s.z + Math.sin(a) * off));
        }
      }
      const P = this.world.phys;
      for (const b of map.bins) {
        const bin = { id: _iid++, x: b.x, y: b.y, z: b.z, ry: b.ry, open: false, poi: b.poi, kind: 'bin' };
        bin.col = P.addBox(b.x, b.y + 0.42, b.z, 1.4, 0.84, 0.95);
        this.bins.push(bin);
      }
      this._buildBins();
    }
    _buildBins() {
      const n = Math.max(1, this.bins.length);
      const mat = G.M.vc({ rimStr: 0.35, spec: 0.4 });
      this.binClosed = new THREE.InstancedMesh(binGeo(false), mat, n);
      this.binOpen = new THREE.InstancedMesh(binGeo(true), mat, n);
      this.binClosed.name = 'roy-bins'; this.binOpen.name = 'roy-bins-open';
      for (const m of [this.binClosed, this.binOpen]) { m.frustumCulled = false; this.world.add(m); }
      this._packBins();
    }
    // Closed and open bins each packed into their own instance range (no hidden instances drawn).
    _packBins() {
      let nc = 0, no = 0;
      for (const b of this.bins) {
        if (b.drop) continue;
        _e.set(0, b.ry, 0); _q.setFromEuler(_e);
        _m.compose(_p.set(b.x, b.y, b.z), _q, _s.setScalar(1));
        if (b.open) this.binOpen.setMatrixAt(no++, _m); else this.binClosed.setMatrixAt(nc++, _m);
      }
      this.binClosed.count = nc; this.binOpen.count = no;
      this.binClosed.visible = nc > 0; this.binOpen.visible = no > 0;
      this.binClosed.instanceMatrix.needsUpdate = true; this.binOpen.instanceMatrix.needsUpdate = true;
    }
    openBin(bin, who) {
      if (bin.open) return;
      bin.open = true;
      if (!bin.drop) this._packBins();
      const rnd = Math.random;
      const items = bin.contents || null;
      const list = items || [];
      if (!items) {
        const n = 2 + (rnd() < 0.45 ? 1 : 0);
        let hasW = false;
        for (let k = 0; k < n; k++) { const d = this.rollItem(rnd, RY.BIN_W, true); if (d.kind === 'weapon') hasW = true; list.push(d); }
        if (!hasW && rnd() < 0.7) list[0] = { kind: 'weapon', type: RY.WEAPON_POOL[(rnd() * RY.WEAPON_POOL.length) | 0], rar: RY.rollRarity(RY.weights(RY.BIN_W, this.m.diff), rnd) };
      }
      list.forEach((d, k) => {
        const a = (bin.ry || 0) + (k - (list.length - 1) / 2) * 0.9;
        const vel = _v.set(Math.sin(a) * 2.6, 4.2, Math.cos(a) * 2.6);
        this.add(d.kind, d.type, d.rar, _p.set(bin.x, bin.y + 0.9, bin.z), { vel });
      });
      const w = this.world;
      w.fx.burst(_p.set(bin.x, bin.y + 1, bin.z), [0xffd23f, 0x7af0ff, 0xffffff], 16, 4, 0.18, 0.5);
      if (G.Audio) G.Audio.sfxAt('door', _p, { pitch: 1.3 });
      if (bin.drop) { bin.drop.opened = true; if (this.m.onDropOpened) this.m.onDropOpened(bin, who); }
    }
    add(kind, type, rar, pos, extra) {
      const it = { id: _iid++, kind, type, rar: rar || 0, pos: new V3().copy(pos), alive: true, phase: Math.random() * TAU, key: (kind === 'weapon' ? 'w:' : kind === 'heal' ? 'h:' : kind === 'throw' ? 't:' : 'a:') + type, t0: this.world.time, vel: null, cell: 0 };
      if (extra && extra.vel) it.vel = new V3().copy(extra.vel);
      if (extra && extra.ammo != null) it.ammo = extra.ammo;
      if (extra && extra.inst) it.inst = extra.inst;
      this.items.push(it);
      this._gridAdd(it);
      this._ensureMesh(it.key);
      if (kind === 'weapon') this._ensureMesh('w:lo');
      return it;
    }
    take(it) {
      if (!it.alive) return;
      it.alive = false;
      this._gridRemove(it);
      const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1);
    }
    _gridAdd(it) { it.cell = ck(it.pos.x, it.pos.z); let b = this.grid.get(it.cell); if (!b) { b = []; this.grid.set(it.cell, b); } b.push(it); }
    _gridRemove(it) { const b = this.grid.get(it.cell); if (b) { const j = b.indexOf(it); if (j >= 0) b.splice(j, 1); } }
    // Items within r (XZ) of pos. Fills `out`.
    near(pos, r, out) {
      out = out || []; out.length = 0;
      const x0 = ((pos.x - r + OFF) / CELL) | 0, x1 = ((pos.x + r + OFF) / CELL) | 0, z0 = ((pos.z - r + OFF) / CELL) | 0, z1 = ((pos.z + r + OFF) / CELL) | 0;
      const r2 = r * r;
      for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
        const b = this.grid.get(ix * 1000 + iz); if (!b) continue;
        for (const it of b) { const dx = it.pos.x - pos.x, dz = it.pos.z - pos.z; if (dx * dx + dz * dz <= r2 && Math.abs(it.pos.y - pos.y) < 6) out.push(it); }
      }
      return out;
    }
    binsNear(pos, r, closedOnly) {
      const out = [];
      for (const b of this.bins) { if (closedOnly && b.open) continue; const dx = b.x - pos.x, dz = b.z - pos.z; if (dx * dx + dz * dz <= r * r && Math.abs(b.y - pos.y) < 6) out.push(b); }
      return out;
    }
    // Player interact target: nearest item/bin in reach, preferring what the player faces.
    candidate(pos, fwd) {
      let best = null, bs = Infinity;
      const list = this.near(pos, 2.6, this._tmp || (this._tmp = []));
      for (const it of list) {
        if (it.vel) continue;
        const dx = it.pos.x - pos.x, dz = it.pos.z - pos.z, d = Math.hypot(dx, dz);
        if (Math.abs(it.pos.y - pos.y) > 2.2) continue;
        const face = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
        const s = d - face * 0.8;
        if (s < bs) { bs = s; best = it; }
      }
      for (const b of this.bins) {
        if (b.open) continue;
        const dx = b.x - pos.x, dz = b.z - pos.z, d = Math.hypot(dx, dz);
        if (d > 2.4 || Math.abs(b.y - pos.y) > 2.2) continue;
        const face = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
        const s = d - face * 0.8 - 0.3;
        if (s < bs) { bs = s; best = b; }
      }
      return best;
    }
    // Closest loot to a ray (for pings).
    rayPick(o, d, maxT) {
      let best = null, bd = 1.6;
      for (const it of this.items) {
        _v.copy(it.pos).sub(o);
        const t = _v.dot(d);
        if (t < 0 || t > maxT) continue;
        const perp = Math.sqrt(Math.max(0, _v.lengthSq() - t * t));
        const tol = 0.8 + t * 0.02;
        if (perp < tol && perp / tol < bd) { bd = perp / tol; best = it; }
      }
      return best;
    }
    _ensureMesh(key) {
      let e = this.meshes.get(key);
      const need = key === 'w:lo' ? this.items.reduce((n, it) => n + (it.kind === 'weapon' ? 1 : 0), 0) : this.items.reduce((n, it) => n + (it.key === key ? 1 : 0), 0);
      if (e && e.cap >= need) return e;
      const cap = Math.max(8, Math.ceil(need * 1.5) + 6);
      const mat = G.M.vc({ spec: 0.6, rimStr: 0.55 });
      const mesh = new THREE.InstancedMesh(itemGeo(key), mat, cap);
      if (key === 'w:lo') mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      mesh.count = 0; mesh.frustumCulled = false; mesh.visible = false;
      if (e) { this.world.remove(e.mesh); e.mesh.dispose(); }
      this.world.add(mesh);
      e = { mesh, cap, n: 0 };
      this.meshes.set(key, e);
      return e;
    }
    update(dt) {
      const w = this.world, t = w.time, cam = G.R.camera, P = w.phys;
      for (const e of this.meshes.values()) e.n = 0;
      const gp = this.glow.geometry.attributes.position.array, gc = this.glow.geometry.attributes.color.array, gs = this.glow.geometry.attributes.size.array;
      let ng = 0, nb = 0;
      const high = cam.position.y - (this.m.map ? this.m.map.hf(cam.position.x, cam.position.z) : 0) > 60;
      const R2 = this.drawR * this.drawR, B2 = 170 * 170;
      this.sparkT -= dt;
      const spark = this.sparkT <= 0; if (spark) this.sparkT = 0.12;
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        if (it.vel) { // tossed: fly and settle
          it.vel.y -= 18 * dt;
          it.pos.addScaledVector(it.vel, dt);
          const g = P.groundAt(it.pos.x, it.pos.z, 0.2, it.pos.y + 0.6);
          if (it.pos.y <= g) {
            it.pos.y = g;
            if (it.vel.y < -3) { it.vel.y *= -0.3; it.vel.x *= 0.5; it.vel.z *= 0.5; }
            else { it.vel = null; this._gridRemove(it); this._gridAdd(it); }
          }
        }
        const dx = it.pos.x - cam.position.x, dy = it.pos.y - cam.position.y, dz = it.pos.z - cam.position.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const rd = RY.RARITY[it.rar];
        if (rd.beam > 0 && d2 < B2 && nb < 160) {
          _e.set(0, 0, 0); _q.setFromEuler(_e);
          _m.compose(_p.set(it.pos.x, it.pos.y + 0.2, it.pos.z), _q, _s.set(1 + it.rar * 0.15, rd.beam * (0.92 + 0.08 * Math.sin(t * 3 + it.phase)), 1 + it.rar * 0.15));
          this.beams.setMatrixAt(nb, _m); this.beams.setColorAt(nb, _c.setHex(rd.color)); nb++;
        }
        if (high || d2 > R2) continue;
        const lo = it.kind === 'weapon' && d2 > 42;
        const e = this.meshes.get(lo ? 'w:lo' : it.key);
        if (!e || e.n >= e.cap) continue;
        if (lo) e.mesh.setColorAt(e.n, _c.setHex(RY.WEAPON_COLOR[it.type] || 0xffffff));
        const spawnK = Math.min(1, (t - it.t0) * 4);
        const bob = Math.sin(t * TAU * 0.6 + it.phase) * 0.08;
        _e.set(it.kind === 'weapon' ? 0.25 : 0, t * 1.3 + it.phase, 0); _q.setFromEuler(_e);
        _m.compose(_p.set(it.pos.x, it.pos.y + 0.55 + bob, it.pos.z), _q, _s.setScalar(0.25 + 0.75 * spawnK));
        e.mesh.setMatrixAt(e.n++, _m);
        if (ng < this.glowCap) {
          gp[ng * 3] = it.pos.x; gp[ng * 3 + 1] = it.pos.y + 0.55 + bob; gp[ng * 3 + 2] = it.pos.z;
          _c.setHex(it.kind === 'weapon' || it.rar > 0 ? rd.color : (it.kind === 'heal' ? RY.HEALS[it.type].color : 0xffe9a8));
          gc[ng * 3] = _c.r; gc[ng * 3 + 1] = _c.g; gc[ng * 3 + 2] = _c.b;
          gs[ng] = (0.9 + it.rar * 0.28) * (1 + 0.15 * Math.sin(t * 4 * Math.PI + it.phase));
          ng++;
        }
        if (spark && rd.sparkle && d2 < 900 && Math.random() < 0.35) w.fx.spawn(_w.set(it.pos.x + (Math.random() - 0.5) * 0.6, it.pos.y + 0.4 + Math.random() * 0.5, it.pos.z + (Math.random() - 0.5) * 0.6), _v.set(0, 0.8, 0), rd.color, 0.16, 0.6, { grav: 0 });
      }
      for (const e of this.meshes.values()) { e.mesh.count = e.n; e.mesh.visible = e.n > 0; if (e.n) { e.mesh.instanceMatrix.needsUpdate = true; if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true; } }
      this.beams.count = nb; this.beams.visible = nb > 0;
      if (nb) { this.beams.instanceMatrix.needsUpdate = true; this.beams.instanceColor.needsUpdate = true; }
      const gg = this.glow.geometry;
      gg.setDrawRange(0, ng);
      gg.attributes.position.needsUpdate = true; gg.attributes.color.needsUpdate = true; gg.attributes.size.needsUpdate = true;
      this.glow.material.uniforms.uScale.value = G.R.h * G.R.pr * 0.5 / Math.tan(cam.fov * Math.PI / 360);
    }
    dispose() {
      for (const e of this.meshes.values()) e.mesh.dispose();
      this.beams.dispose(); this.glow.geometry.dispose(); this.glow.material.dispose();
      if (this.binClosed) { this.binClosed.dispose(); this.binOpen.dispose(); }
    }
  }
  RY.Loot = Loot;
})(window.G);

}).call(window); } catch (e) { console.error('[module 25b_royale_loot.js]', e); }
// ---- 25b_royale_map.js
try { (function () {
// 25b_royale_map.js — Sky Drop Royale island: terrain (cached height grid), six named POIs built
// from the G.Geo kit and baked to one mesh each, instanced vegetation, launch pads, redeploy
// balloons, loot spot + supply-bin placement, and a painted top-down map canvas for the HUD.
// RY.buildMap(world, rnd, diff) -> map {hf, pois, spots, bins, pads, balloons, canvas, isLand(x,z),
//   landPoint(rnd, cx, cz, r), update(dt, t)}.
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};
  const U = G.util;
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2, HP = PI / 2;
  const HALF = 210;          // terrain mesh extent (±)
  RY.BOUND = 205;            // physics bounds (±)
  const GRID = 2;            // height cache resolution (m)
  const sstep = U.smoothstep;

  // POIs (GDD §11d names). h = flattened ground height, r = flat radius.
  const POIS = [
    { id: 'hill', x: 6, z: -4, r: 15, h: 20.5, coast: false },
    { id: 'cove', x: -26, z: 128, r: 30, h: 1.6, coast: true },
    { id: 'market', x: -116, z: 20, r: 34, h: 4.2, coast: false },
    { id: 'castle', x: -74, z: -104, r: 30, h: 4.6, coast: false },
    { id: 'jetty', x: 124, z: 48, r: 30, h: 1.8, coast: true },
    { id: 'garden', x: 84, z: -96, r: 30, h: 4.0, coast: false },
  ];
  RY.POIS = POIS;

  // ------------------------------------------------------------------ height
  function coastR(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return 170 + 11 * G.noise.n2(c * 1.6 + 3.1, s * 1.6 - 1.7) + 6 * G.noise.n2(c * 4.1 + 0.3, s * 4.1 + 9.2);
  }
  function rawHeight(x, z) {
    const r = Math.sqrt(x * x + z * z);
    const s = coastR(Math.atan2(z, x)) - r; // distance inland from the coastline
    let hin = 3.0 + 7.5 * G.noise.fbm2(x * 0.0105 + 7.3, z * 0.0105 - 3.1, 3) + 1.4 * G.noise.n2(x * 0.042 + 2, z * 0.042 - 5);
    const dx = x - POIS[0].x, dz = z - POIS[0].z;
    hin += 17.5 * Math.exp(-(dx * dx + dz * dz) / (2 * 31 * 31));
    // gentle western mesa plateau (Peach Mesas side of the island)
    hin += 2.2 * sstep(-40, -110, x) * sstep(-150, -40, z) * sstep(130, 40, z);
    if (hin < 1.6) hin = 1.6 + (hin - 1.6) * 0.3;
    const shore = s <= 0 ? U.lerp(-6, 0, sstep(-30, 0, s)) : U.lerp(0, 1.25, sstep(0, 9, s));
    let h = U.lerp(shore, hin, sstep(6, 24, s));
    for (let i = 0; i < POIS.length; i++) {
      const p = POIS[i];
      const ex = x - p.x, ez = z - p.z, d2 = ex * ex + ez * ez, R = p.r + 14;
      if (d2 > R * R) continue;
      let f = sstep(R, p.r, Math.sqrt(d2));
      if (p.coast) f *= sstep(3, 16, s);
      h += (p.h - h) * f;
    }
    return h;
  }
  function makeGrid() {
    const n = Math.ceil((HALF * 2) / GRID) + 1;
    const data = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) data[j * n + i] = rawHeight(-HALF + i * GRID, -HALF + j * GRID);
    const inv = 1 / GRID;
    const hf = function (x, z) {
      let fx = (x + HALF) * inv, fz = (z + HALF) * inv;
      if (fx < 0) fx = 0; else if (fx > n - 1.001) fx = n - 1.001;
      if (fz < 0) fz = 0; else if (fz > n - 1.001) fz = n - 1.001;
      const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, k = iz * n + ix;
      const a = data[k], b = data[k + 1], c = data[k + n], d = data[k + n + 1];
      return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * tz;
    };
    return hf;
  }

  // ------------------------------------------------------------------ terrain colors
  const _ca = new THREE.Color(), _cb = new THREE.Color();
  function makePainter(hf, paths) {
    const B = G.Geo.biomes;
    const meadow = B.meadow.colorFn, reef = B.reef.colorFn;
    return function (x, z, h, s) {
      _ca.setHex(meadow(x, z, h, s));
      const w = sstep(-55, -100, x) * 0.85;
      if (w > 0.01) { _cb.setHex(reef(x, z, h, s)); _ca.lerp(_cb, w); }
      if (h > 0.6 && s < 0.25) {
        let pd = 1e9;
        for (const sg of paths) {
          const vx = sg[2] - sg[0], vz = sg[3] - sg[1], L2 = vx * vx + vz * vz;
          let t = ((x - sg[0]) * vx + (z - sg[1]) * vz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = sg[0] + vx * t - x, qz = sg[1] + vz * t - z, d = qx * qx + qz * qz;
          if (d < pd) pd = d;
        }
        const wob = G.noise.n2(x * 0.2, z * 0.2) * 1.2;
        const k = sstep(3.4 + wob, 1.6 + wob, Math.sqrt(pd));
        if (k > 0) _ca.lerp(_cb.setHex(0xe8d6b0), k * 0.85);
      }
      for (const p of POIS) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < p.r + 4) { const k = sstep(p.r + 4, p.r - 6, d) * 0.35; _ca.lerp(_cb.setHex(p.id === 'jetty' ? 0xd9b08c : p.id === 'garden' ? 0x8fdc8a : 0xf2e2c0), k); }
      }
      return _ca.getHex();
    };
  }

  // ------------------------------------------------------------------ small prop kit helpers
  const Geo = () => G.Geo;
  function kitProp(k) {
    const d = k.data();
    const mesh = new THREE.Mesh(d.solid || d.glow, d.solid ? G.M.vc({ rimStr: 0.2 }) : G.Geo.glowMat());
    if (d.solid && d.glow) { const gm = new THREE.Mesh(d.glow, G.Geo.glowMat()); gm.userData.glow = true; mesh.add(gm); }
    const anchors = {}; for (const a in d.a) anchors[a] = d.a[a].clone();
    return { mesh, colliders: d.c.map(c => Object.assign({}, c)), anchors };
  }
  const RBOX = (w, h, d, r) => G.Geo.P.rbox(w, h, d, r != null ? r : Math.min(0.25, w * 0.2, h * 0.2, d * 0.2), 1);

  function stallProp(color, seed) {
    const P = G.Geo.P, k = new G.Geo.Kit(), rnd = G.rng(seed || 3);
    const wood = 0xd99a5b, woodD = 0xa86a3c;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.cyl(0.09, 0.11, 2.6, 6), woodD, sx * 1.55, 1.3, sz * 0.95);
    k.add(RBOX(3.4, 0.9, 1.2, 0.1), wood, 0, 0.45, 0.45); k.box(0, 0.45, 0.45, 3.4, 0.9, 1.2);
    k.add(RBOX(3.5, 0.12, 1.3, 0.05), 0xfff1dc, 0, 0.95, 0.45);
    for (let i = 0; i < 4; i++) k.add(P.box(0.9, 0.1, 2.5), i % 2 ? 0xfffaf2 : color, -1.35 + i * 0.9, 2.7, 0, 0.32, 0, 0);
    for (let i = 0; i < 4; i++) k.add(P.sph(0.16 + rnd() * 0.06, 6, 4), [0xff7a93, 0xffd45c, 0xff8a4c, 0x8bea4a][(i + seed) % 4], -1 + i * 0.66, 1.15, 0.45);
    k.anchor('front', 0, 0, 1.6);
    return kitProp(k);
  }
  function pierProp(len, w) {
    const P = G.Geo.P, k = new G.Geo.Kit();
    k.add(P.box(w, 0.3, len), 0xd99a5b, 0, 0.15, 0); k.box(0, 0.15, 0, w, 0.3, len);
    const n = Math.max(2, Math.round(len / 1.2));
    for (let i = 0; i < n; i++) k.add(P.box(w + 0.1, 0.06, 0.12), 0xa86a3c, 0, 0.31, -len / 2 + (len / n) * (i + 0.5));
    for (const sx of [-1, 1]) {
      k.add(P.box(0.22, 0.24, len), 0x1f2a5a, sx * (w / 2 - 0.1), 0.42, 0);
      for (let i = 0; i <= Math.round(len / 5); i++) k.add(P.cyl(0.16, 0.18, 3.2, 6), 0x9a6440, sx * (w / 2 - 0.1), -1.4, -len / 2 + i * 5);
    }
    k.anchor('end', 0, 0.3, -len / 2);
    return kitProp(k);
  }
  function padProp() {
    const P = G.Geo.P, k = new G.Geo.Kit();
    k.add(G.Geo.lathe([[1.35, -0.1], [1.35, 0.12], [1.15, 0.26], [0, 0.26]], 16), 0x1f2a5a, 0, 0, 0);
    k.add(P.tor(1.28, 0.07, 4, 16), 0xe8b44a, 0, 0.2, 0, HP, 0, 0);
    k.glow(P.tor(0.85, 0.07, 4, 16), 0x5cffe1, 0, 0.27, 0, HP, 0, 0);
    k.glow(P.cyl(0.6, 0.6, 0.04, 12), 0xb8fff2, 0, 0.27, 0);
    k.cyl(0, 0, 1.35, -0.1, 0.26);
    return kitProp(k);
  }
  function wallProp(len, h, t, col) {
    const P = G.Geo.P, k = new G.Geo.Kit();
    k.add(RBOX(len, h, t, 0.3), col, 0, h / 2, 0); k.box(0, h / 2, 0, len, h, t);
    k.add(RBOX(len + 0.2, 0.5, t + 0.2, 0.12), G.Geo.darken(col, 0.12), 0, 0.25, 0);
    const n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i < n; i++) {
      const x = -len / 2 + (len / n) * (i + 0.5);
      for (const sz of [-1, 1]) k.add(P.box(0.8, 0.7, 0.45), G.Geo.lighten(col, 0.1), x, h + 0.35, sz * (t / 2 - 0.22));
    }
    for (const sz of [-1, 1]) k.box(0, h + 0.35, sz * (t / 2 - 0.22), len, 0.7, 0.45);
    k.add(P.box(len, 0.06, t - 0.8), 0xe8d6bf, 0, h + 0.03, 0);
    return kitProp(k);
  }
  function towerProp(r, h, col, roof) {
    const k = new G.Geo.Kit();
    const g = G.Geo.lathe([[r * 1.15, -1], [r * 1.12, 0.4], [r, 1.2], [r * 0.94, h * 0.85], [r * 1.12, h], [r * 1.12, h + 0.2], [0, h + 0.2]], 18);
    k.add(g, (x, y) => (Math.floor(y / 1.2) % 2 ? G.Geo.lighten(col, 0.08) : col), 0, 0, 0);
    const n = 8;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; k.add(G.Geo.P.box(0.9, 0.9, 0.6), G.Geo.lighten(col, 0.14), Math.cos(a) * r * 0.95, h + 0.6, Math.sin(a) * r * 0.95, 0, -a + HP, 0); }
    if (roof) { k.add(G.Geo.P.cone(r * 1.1, r * 1.6, 16), roof, 0, h + 0.2 + r * 0.8, 0); k.add(G.Geo.P.sph(0.3, 8, 6), 0xffd23f, 0, h + 0.3 + r * 1.6, 0); }
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; k.glow(RBOX(0.5, 0.9, 0.3, 0.12), 0xffe9a8, Math.cos(a) * r * 0.98, h * 0.55 + i * 1.6, Math.sin(a) * r * 0.98, 0, -a + HP, 0); }
    k.cyl(0, 0, r * 1.02, -1, h + 1.0);
    k.anchor('top', 0, h + 0.2, 0);
    return kitProp(k);
  }
  function factoryTowerProp(r, h) {
    const k = new G.Geo.Kit();
    const g = G.Geo.lathe([[r * 1.2, -1], [r * 1.15, 0.3], [r, 0.9], [r * 0.82, h * 0.9], [r * 0.95, h], [r * 0.7, h + 0.4], [0, h + 0.4]], 16);
    k.add(g, (x, y) => (Math.floor(y / 1.6) % 2 ? 0xff7a3d : 0x5b3a8c), 0, 0, 0);
    k.add(G.Geo.P.tor(r * 0.95, 0.18, 6, 20), 0xe8b44a, 0, h * 0.55, 0, HP, 0, 0);
    k.add(G.Geo.P.cyl(r * 0.35, r * 0.4, 2.2, 10), 0x9aa5b8, 0, h + 1.4, 0);
    k.glow(G.Geo.P.tor(r * 0.36, 0.12, 5, 14), 0xffb36b, 0, h + 2.5, 0, HP, 0, 0);
    for (let i = 0; i < 4; i++) { const a = i * HP + 0.4; k.glow(RBOX(0.4, 0.7, 0.3, 0.1), 0xffd27a, Math.cos(a) * r * 0.86, h * 0.3 + i * 1.8, Math.sin(a) * r * 0.86, 0, -a + HP, 0); }
    k.cyl(0, 0, r, -1, h + 2.5);
    return kitProp(k);
  }
  function windmillProp() {
    const k = new G.Geo.Kit(), P = G.Geo.P;
    const g = G.Geo.lathe([[3.6, -1.5], [3.5, 0.3], [3.2, 1.0], [2.5, 10.5], [2.7, 11.0], [0, 11.0]], 18);
    k.add(g, (x, y, z) => (y < 1.0 ? 0xc9b8a0 : Math.floor(y / 1.4) % 2 ? 0xfff6ea : 0xfff1dc), 0, 0, 0);
    k.add(P.cone(3.1, 3.4, 18), 0xff6b6b, 0, 12.6, 0);
    k.add(P.sph(0.35, 8, 6), 0xffd23f, 0, 14.4, 0);
    k.add(RBOX(1.6, 2.4, 0.4, 0.2), 0x9a6440, 0, 1.6, 3.25);
    k.add(P.cyl(0.4, 0.4, 1.4, 10), 0x5b3a8c, 0, 10.6, 2.7, HP, 0, 0);
    for (let i = 0; i < 3; i++) { const y = 4 + i * 2.4, a = i * 2.2 + 1; k.glow(RBOX(0.6, 0.9, 0.25, 0.12), 0xffe9a8, Math.sin(a) * 2.8, y, Math.cos(a) * 2.8, 0, a, 0); }
    k.cyl(0, 0, 3.3, -1.5, 11.5);
    k.anchor('hub', 0, 10.6, 3.4);
    return kitProp(k);
  }
  function windmillBlades() {
    const P = G.Geo.P, parts = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      const blade = G.Geo.merge([G.Geo.colorize(G.Geo.xf(P.box(0.25, 6.2, 0.18), 0, 3.4, 0), 0x9a6440), G.Geo.colorize(G.Geo.xf(RBOX(1.4, 5.0, 0.08, 0.05), 0.8, 3.9, 0), i % 2 ? 0xfffaf2 : 0xff9ac0)]);
      parts.push(G.Geo.xf(blade, 0, 0, 0, 0, 0, a));
    }
    parts.push(G.Geo.colorize(P.sph(0.6, 10, 8), 0xffd23f));
    const m = new THREE.Mesh(G.Geo.merge(parts), G.M.vc({ rimStr: 0.2 }));
    return m;
  }
  function wreckProp() {
    const k = new G.Geo.Kit(), P = G.Geo.P;
    k.add(RBOX(17, 4.2, 6, 1.8), (x, y) => (y > 1.2 ? 0xfff1dc : y > 0.6 ? 0xffd23f : 0xff6b6b), 0, 1.6, 0);
    k.add(P.cone(3.0, 5, 12), 0xff6b6b, 9.8, 1.4, 0, 0, 0, -HP);
    k.add(RBOX(16, 0.35, 5.2, 0.12), 0xd99a5b, 0, 3.75, 0);
    k.add(RBOX(5, 2.4, 4.4, 0.4), 0x2cc3d6, -4.5, 5.0, 0);
    k.add(P.cyl(0.25, 0.3, 9, 8), 0xa86a3c, 2, 8, 0, 0, 0, 0.25);
    k.add(RBOX(4.5, 3.2, 0.1, 0.05), 0xfffaf2, 3.2, 8.6, 0.1, 0, 0, 0.25);
    for (let i = 0; i < 4; i++) k.glow(P.cyl(0.4, 0.4, 0.2, 12), 0xffe9a8, -6 + i * 3.5, 2.2, 3.05, HP, 0, 0);
    k.box(0, 1.8, 0, 17, 3.9, 6);
    k.box(-4.5, 5.0, 0, 5, 2.4, 4.4);
    k.box(9.8, 1.5, 0, 3, 2.6, 4.2);
    k.anchor('deck', 3, 3.95, 0); k.anchor('deck2', -1, 3.95, -1.5); k.anchor('cabin', -4.5, 6.2, 0);
    return kitProp(k);
  }
  function gazeboProp() {
    const k = new G.Geo.Kit(), P = G.Geo.P;
    k.add(G.Geo.lathe([[5.2, -1], [5.2, 0.4], [4.9, 0.6], [0, 0.6]], 24), 0xfff1dc, 0, 0, 0);
    k.cyl(0, 0, 5.1, -1, 0.6);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; k.add(P.cyl(0.18, 0.22, 3.6, 8), 0xfffaf2, Math.cos(a) * 4.4, 2.4, Math.sin(a) * 4.4); k.cyl(Math.cos(a) * 4.4, Math.sin(a) * 4.4, 0.24, 0.6, 4.2); }
    const dome = P.sph(5.0, 20, 10); { const dp = dome.attributes.position; for (let i = 0; i < dp.count; i++) if (dp.getY(i) < 0) dp.setY(i, 0); }
    dome.scale(1, 0.5, 1); dome.computeVertexNormals();
    k.add(dome, (x, y, z) => (Math.sin(Math.atan2(z, x) * 6) > 0 ? 0x8f6bff : 0xb983ff), 0, 4.2, 0);
    k.add(P.sph(0.4, 8, 6), 0xffd23f, 0, 6.8, 0);
    k.glow(P.tor(4.5, 0.08, 4, 30), 0x7af0ff, 0, 4.15, 0, HP, 0, 0);
    k.anchor('center', 0, 0.6, 0);
    return kitProp(k);
  }
  function wellProp() {
    const k = new G.Geo.Kit(), P = G.Geo.P;
    k.add(G.Geo.lathe([[1.3, -0.3], [1.35, 0.9], [1.15, 1.0], [1.05, 0.2], [0, 0.2]], 16), 0xc9b8a0, 0, 0, 0);
    k.add(P.cyl(1.0, 1.0, 0.05, 16), 0x2cc3d6, 0, 0.6, 0);
    for (const sx of [-1, 1]) k.add(P.cyl(0.08, 0.08, 2.2, 6), 0xa86a3c, sx * 1.15, 1.9, 0);
    k.add(P.cone(1.7, 1.0, 4), 0xff6b6b, 0, 3.3, 0, 0, PI / 4, 0);
    k.cyl(0, 0, 1.35, -0.3, 1.0);
    return kitProp(k);
  }
  function balloonProp(color) {
    const k = new G.Geo.Kit(), P = G.Geo.P;
    k.add(G.Geo.lathe([[1.9, -0.2], [1.9, 0.2], [1.7, 0.35], [0, 0.35]], 20), 0x1f2a5a, 0, 0, 0);
    k.glow(P.tor(1.2, 0.09, 5, 24), 0xffd23f, 0, 0.38, 0, HP, 0, 0);
    k.add(P.cyl(0.05, 0.05, 30, 4), 0xfff1dc, 0, 15.3, 0);
    k.cyl(0, 0, 1.9, -0.2, 0.35);
    k.anchor('pad', 0, 0.35, 0);
    const prop = kitProp(k);
    const bal = new G.Geo.Kit();
    bal.add(G.Geo.lathe([[0, -3.4], [1.6, -3.1], [3.2, -1.6], [3.7, 0.5], [3.3, 2.6], [2.0, 3.8], [0, 4.2]], 16), (x, y, z) => (Math.sin(Math.atan2(z, x) * 4) > 0 ? color : 0xfffaf2), 0, 0, 0);
    bal.add(P.cyl(0.35, 0.5, 0.6, 8), 0xa86a3c, 0, -3.8, 0);
    const bp = kitProp(bal);
    bp.mesh.position.y = 34;
    prop.mesh.add(bp.mesh);
    prop.balloon = bp.mesh;
    return prop;
  }

  // ------------------------------------------------------------------ build
  RY.buildMap = function (world, rnd, opts) {
    opts = opts || {};
    const GE = G.Geo;
    const hf = makeGrid();
    const phys = world.phys;
    phys.heightFn = hf;
    const map = { hf, pois: POIS.map(p => Object.assign({ key: 'roy.poi.' + p.id }, p)), spots: [], bins: [], pads: [], balloons: [], anim: [] };
    const sea = 0x2cc3d6;

    // terrain + water
    const paths = POIS.slice(1).map(p => [POIS[0].x, POIS[0].z, p.x, p.z]);
    paths.push([POIS[2].x, POIS[2].z, POIS[3].x, POIS[3].z], [POIS[3].x, POIS[3].z, POIS[5].x, POIS[5].z], [POIS[5].x, POIS[5].z, POIS[4].x, POIS[4].z], [POIS[1].x, POIS[1].z, POIS[2].x, POIS[2].z]);
    map.paths = paths;
    // 5 m cells (the detail texture carries the close-up variation): ~14k triangles for the whole island
    const terr = G.Terrain.build({ heightFn: hf, colorFn: makePainter(hf, paths), minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF, res: 5, chunks: 3 });
    terr.name = 'roy-terrain';
    world.add(terr);
    const water = G.Terrain.water({ size: 1600, y: 0, segments: 40, opacity: 0.9, depth: { heightFn: hf, minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF, size: 256 } });
    water.name = 'roy-water';
    world.add(water);
    void sea;

    // every placed prop leaves a soft occlusion pool on the terrain under its footprint (baked at the end)
    const ao = [];
    const place = (prop, x, y, z, ry, grp) => { const r = GE.place(world, prop, x, y, z, ry || 0, grp); if (GE.aoFromCols) GE.aoFromCols(r.cols, ao, hf); return r; };
    const freeAt = (x, z, r) => {
      const g = hf(x, z), list = phys.query(x - r, z - r, x + r, z + r);
      for (const it of list) {
        if (it.k === 0) { if (x + r > it.minx && x - r < it.maxx && z + r > it.minz && z - r < it.maxz && it.maxy > g + 0.2 && it.miny < g + 2.2) return false; }
        else { const dx = x - it.x, dz = z - it.z; if (dx * dx + dz * dz < (it.r + r) * (it.r + r) && it.y1 > g + 0.2 && it.y0 < g + 2.2) return false; }
      }
      return true;
    };
    map.freeAt = freeAt;
    const spot = (x, y, z, poi, high) => { map.spots.push({ x, y: y != null ? y : phys.groundAt(x, z, 0.3, hf(x, z) + 1.2), z, poi, high: !!high }); };
    const bin = (x, z, ry, poi, y) => { map.bins.push({ x, y: y != null ? y : phys.groundAt(x, z, 0.5, hf(x, z) + 1.2), z, ry: ry || 0, poi }); };
    // Launch pad with a velocity solved toward a landing target (player gravity 20 up / 27 down).
    const pad = (x, z, tx, tz, apexAbove, grp, ty) => {
      const y = phys.groundAt(x, z, 1.0, hf(x, z) + 1.5);
      place(padProp(), x, y, z, 0, grp);
      const tgY = ty != null ? ty : phys.groundAt(tx, tz, 0.5, 999);
      const top = Math.max(y, tgY) + apexAbove;
      const vy = Math.sqrt(2 * 20 * (top - y)), tUp = vy / 20, tDn = Math.sqrt(2 * Math.max(0.5, top - tgY) / 27);
      const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz) || 1, hv = d / (tUp + tDn);
      map.pads.push({ x, y: y + 0.26, z, vx: dx / d * hv, vz: dz / d * hv, vy, tx, ty: tgY, tz });
    };
    const fillSpots = (p, n, rr) => {
      let tries = 0, made = 0;
      while (made < n && tries++ < n * 30) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * (rr || p.r * 0.95);
        const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (hf(x, z) < 0.6 || !freeAt(x, z, 0.45)) continue;
        if (map.spots.some(s => (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z) < 16)) continue;
        spot(x, null, z, p.id); made++;
      }
    };

    // ---- POI builders (local coordinates around p.x/p.z, ground y = p.h)
    const B = {};
    B.cove = (p, grp, dec) => {
      const X = lx => p.x + lx, Z = lz => p.z + lz, h = p.h;
      place(GE.plazaFountain(2.8), X(0), h, Z(-4), 0, grp);
      const hp = [[-12, -17, 0, 1], [12, -17, 0, 2]];
      for (const q of hp) place(GE.building('house', { seed: q[3], lod: 0.5 }), X(q[0]), h, Z(q[1]), q[2], grp);
      const shop = place(GE.building('shop', { lod: 0.5 }), X(0), h, Z(-28), 0, grp);
      for (const s of [[-6, 2], [6, -11]]) place(GE.lampPost(), X(s[0]), h, Z(s[1]), 0, dec);
      place(GE.bench(), X(4.5), h, Z(0.5), 0, dec);
      for (const s of [[17, 4], [15, 7]]) place(GE.barrel(0xff8a4c), X(s[0]), h, Z(s[1]), 0, dec);
      // pier into the bay (south)
      const by = 1.15;
      place(pierProp(26, 4), X(2), by + 0.08, Z(34), 0, grp);
      place(GE.platform(7, 7, 0.6), X(2), by + 0.38, Z(50.5), 0, grp);
      for (const s of [[-1.5, 49], [5.5, 52]]) { const c = GE.crate(s[0] < 0 ? 'ammo' : 'bolt'); const m = c.clone(); m.position.set(X(s[0]), by + 0.38, Z(s[1])); dec.add(m); phys.addBox(X(s[0]), by + 0.38 + 0.45, Z(s[1]), 0.95, 0.9, 0.95); }
      place(GE.barrel(0x2cc3d6), X(4.5), by + 0.38, Z(48), 0, dec);
      // loot
      spot(X(-3), null, Z(-1), p.id); spot(X(3), null, Z(-7), p.id); spot(X(0), null, Z(3), p.id);
      void shop;
      spot(X(-3.5), h + 0.36, Z(-29), p.id); spot(X(3.5), h + 0.36, Z(-26), p.id);
      spot(X(2), by + 0.42 + 0.38, Z(52), p.id, true); spot(X(0), by + 0.39, Z(30), p.id);
      bin(X(-10), Z(-11), 0, p.id); bin(X(10), Z(-11), 0, p.id); bin(X(-4.5), Z(-31), 0, p.id, h + 0.3); bin(X(-1), Z(51.5), 0, p.id, by + 0.38); bin(X(-18), Z(4), HP, p.id);
      fillSpots(p, 7);
    };
    B.market = (p, grp, dec) => {
      const X = lx => p.x + lx, Z = lz => p.z + lz, h = p.h;
      const bands = GE.PAL.bands;
      const mesas = [[-20, -16, 8, 10, 11], [17, -21, 7, 8, 12], [-6, 24, 8.5, 12, 13]];
      for (const m of mesas) {
        const pr = GE.mesa(m[2], m[3], m[4], { bands, seg: 26 });
        const mx = X(m[0]), mz = Z(m[1]);
        place(pr, mx, h - 0.25, mz, rnd() * TAU, grp);
        const top = h - 0.25 + m[3] + 0.3;
        spot(mx + 1.5, top, mz - 1, p.id, true);
        spot(mx - 2, top, mz + 2, p.id, true);
        // launch pad on the market side
        const dx = -m[0], dz = -m[1], dl = Math.hypot(dx, dz);
        const px = mx + dx / dl * (m[2] + 3.2), pz = mz + dz / dl * (m[2] + 3.2);
        pad(px, pz, mx + dx / dl * 2, mz + dz / dl * 2, 2.5, grp, top);
      }
      const cols = [0xff7a93, 0x3fe0b8, 0xffd45c, 0x8f6bff, 0xff8a4c];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.3, x = X(Math.cos(a) * 9), z = Z(Math.sin(a) * 9);
        const ry = Math.round((-a - HP) / HP) * HP;
        place(stallProp(cols[i], i + 1), x, h, z, ry, grp);
        spot(x - Math.cos(a) * 2.2, null, z - Math.sin(a) * 2.2, p.id);
      }
      place(GE.building('shop', { lod: 0.5, palette: { wall: 0xffd8b0, roof: 0xff8a4c, panel: 0x9a6440 } }), X(22), h, Z(12), -HP, grp);
      for (const s of [[-4, -4], [10, -9]]) place(GE.banner([0xff6b8b, 0x3fe0b8, 0xffd23f, 0x8f6bff][(s[0] + 20) % 4], 'star'), X(s[0]), h, Z(s[1]), 0, dec);
      spot(X(23), h + 0.36, Z(10), p.id); spot(X(25), h + 0.36, Z(15), p.id);
      bin(X(0), Z(0), 0, p.id); bin(X(-12), Z(-4), 0, p.id); bin(X(26), Z(8.5), 0, p.id, h + 0.3); bin(X(4), Z(16), 0, p.id);
      fillSpots(p, 4);
    };
    B.castle = (p, grp, dec) => {
      const X = lx => p.x + lx, Z = lz => p.z + lz, h = p.h;
      const col = 0xffd6c8, S = 13, T = 2.2, H = 4.2;
      const segs = [
        [-S + 5.5, -S, 11, 0], [S - 5.5, -S, 11, 0],                  // north (with a broken gap)
        [-S + 4.5, S, 9, 0], [S - 4.5, S, 9, 0],                      // south gate
        [-S, -S + 5.5, 11, HP], [-S, S - 5.5, 11, HP],                // west
        [S, -S + 4.5, 9, HP], [S, S - 4.5, 9, HP],                    // east gate
      ];
      for (const s of segs) place(wallProp(s[2], H, T, col), X(s[0]), h, Z(s[1]), s[3], grp);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(towerProp(3.0, 8.5, 0xffc0b0, sx * sz > 0 ? 0xff5fa2 : 0x8f6bff), X(sx * S), h, Z(sz * S), 0, grp);
      place(GE.ramp(2.6, 7, H), X(-6), h, Z(-S + T / 2 + 3.5), 0, grp);
      place(GE.ramp(2.6, 7, H), X(6), h, Z(S - T / 2 - 3.5), PI, grp);
      place(GE.pillarArch(12, 6, 21, { lite: true, bands: [0xfff0d8, 0xffc8a8, 0xff9a8a, 0xf07a7a, 0xd9658a, 0xb9557a] }), X(0), h - 0.3, Z(S + 9), 0, grp);
      const ccol = GE.PAL.coral;
      for (let i = 0; i < 7; i++) {
        const a = rnd() * TAU, d = 17 + rnd() * 9;
        place(GE.coral(i % 5, ccol[i % ccol.length], 1.6 + rnd() * 1.4, i), X(Math.cos(a) * d), hf(X(Math.cos(a) * d), Z(Math.sin(a) * d)) - 0.1, Z(Math.sin(a) * d), rnd() * TAU, dec);
      }
      place(GE.coral(3, 0xff7a93, 3.2, 5), X(0), h, Z(0), 0, dec);
      // loot
      for (const s of [[-7, -6], [7, -6], [-7, 6], [7, 7], [0, 5]]) spot(X(s[0]), null, Z(s[1]), p.id);
      spot(X(-S + 5.5), h + H + 0.06, Z(-S), p.id, true); spot(X(S - 4.5), h + H + 0.06, Z(S), p.id, true); spot(X(-S), h + H + 0.06, Z(S - 5.5), p.id, true);
      spot(X(-3), null, Z(S + 9), p.id); spot(X(4), null, Z(S + 11), p.id);
      bin(X(-10), Z(-10), 0, p.id); bin(X(10), Z(-10), 0, p.id); bin(X(-10), Z(10), 0, p.id); bin(X(3), Z(-2), 0, p.id); bin(X(18), Z(2), 0, p.id);
      fillSpots(p, 3, 30);
    };
    B.jetty = (p, grp, dec) => {
      const X = lx => p.x + lx, Z = lz => p.z + lz, h = p.h;
      const hall = place(GE.building('workshop', { lod: 0.5, palette: { wall: 0xd99a6c, panel: 0x5b3a8c, roof: 0xff7a3d, trim: 0xe8b44a, accent: 0x1f2a5a } }), X(-14), h, Z(-8), HP, grp);
      void hall;
      place(factoryTowerProp(2.6, 14), X(-24), h, Z(10), 0, grp);
      place(factoryTowerProp(2.0, 11), X(-6), h, Z(16), 0, grp);
      place(factoryTowerProp(3.0, 16), X(-26), h, Z(-24), 0, grp);
      place(GE.platform(6, 6, 0.6), X(4), h + 3.0, Z(-16), 0, grp);
      place(GE.ramp(3, 8, 3.0), X(4), h, Z(-8.5), 0, grp);
      for (let i = 0; i < 4; i++) { const a = rnd() * TAU, d = 6 + rnd() * 10; place(GE.rock(1.2 + rnd() * 0.8, 40 + i, 'slate'), X(-4 + Math.cos(a) * d), h - 0.2, Z(4 + Math.sin(a) * d), rnd() * TAU, dec); }
      for (const s of [[-2, 2], [10, -4], [12, 10]]) place(GE.barrel([0xff7a3d, 0x5b6fd8, 0xffd23f][(s[0] + 9) % 3]), X(s[0]), h, Z(s[1]), 0, dec);
      // beached wreck
      place(wreckProp(), X(10), h - 0.6, Z(20), 0, grp);
      place(GE.ramp(3, 6, 3.0), X(10), h, Z(26.5 + 0.5), PI, grp);
      // pier east
      place(pierProp(24, 4), X(32), 1.23, Z(-4), HP, grp);
      place(GE.platform(7, 7, 0.6), X(47.5), 1.53, Z(-4), 0, grp);
      // loot
      spot(X(-15), h + 0.36, Z(-10), p.id); spot(X(-13), h + 0.36, Z(-5), p.id); spot(X(-16), h + 0.36, Z(-2), p.id);
      spot(X(3), h + 3.05, Z(-17), p.id, true); spot(X(5.5), h + 3.05, Z(-15), p.id, true);
      spot(X(13), h - 0.6 + 3.95, Z(20), p.id, true); spot(X(8), h - 0.6 + 3.95, Z(18.6), p.id, true);
      spot(X(47.5), 1.55, Z(-3), p.id, true); spot(X(20), 1.56, Z(-4), p.id);
      bin(X(-10), Z(-12), 0, p.id, h + 0.3); bin(X(-1), Z(8), 0, p.id); bin(X(6), Z(-18), 0, p.id, h + 3.0); bin(X(46), Z(-6), 0, p.id, 1.53); bin(X(-16), Z(14), 0, p.id);
      fillSpots(p, 3);
    };
    B.garden = (p, grp, dec) => {
      const X = lx => p.x + lx, Z = lz => p.z + lz, h = p.h;
      const caps = [0xff6f91, 0xb983ff, 0xffb37a, 0x5fc8ff];
      const ms = [[-14, -10, 4.0], [12, -14, 3.4], [16, 10, 4.2], [-16, 12, 2.8], [-2, -20, 2.6], [22, -2, 2.4]];
      ms.forEach((m, i) => {
        place(GE.mushroom(m[2], caps[i % caps.length], { glow: 0x7af0ff, seed: i + 3 }), X(m[0]), h, Z(m[1]), rnd() * TAU, grp);
        if (m[2] >= 3.4) {
          const top = h + 1.48 * m[2];
          spot(X(m[0]), top, Z(m[1]), p.id, true);
          const dx = -m[0], dz = -m[1], dl = Math.hypot(dx, dz);
          pad(X(m[0] + dx / dl * 5.5), Z(m[1] + dz / dl * 5.5), X(m[0] + dx / dl * 0.6), Z(m[1] + dz / dl * 0.6), 2.0, grp, top);
        }
      });
      place(gazeboProp(), X(0), h, Z(0), 0, grp);
      const crys = [0x7af0ff, 0xb983ff, 0xff9de2];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5, d = 20 + rnd() * 6; place(GE.crystal(1.2 + rnd() * 1.2, crys[i % 3], i + 2), X(Math.cos(a) * d), h, Z(Math.sin(a) * d), rnd() * TAU, dec); }
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 1.1, d = 9 + rnd() * 3; place(GE.bigFlower([0xff7a93, 0xffd45c, 0xb983ff][i % 3], 1.0 + rnd() * 0.4), X(Math.cos(a) * d), h, Z(Math.sin(a) * d), rnd() * TAU, dec); }
      // loot
      spot(X(2.6), h + 0.62, Z(2), p.id); spot(X(-2.4), h + 0.62, Z(-2.4), p.id);
      for (const s of [[-8, 4], [8, 4], [0, 12], [4, -10], [-10, -2]]) spot(X(s[0]), null, Z(s[1]), p.id);
      bin(X(-6), Z(-8), 0, p.id); bin(X(7), Z(8), 0, p.id); bin(X(-20), Z(0), 0, p.id); bin(X(10), Z(-6), 0, p.id);
      fillSpots(p, 4);
    };
    B.hill = (p, grp, dec) => {
      const X = lx => p.x + lx, Z = lz => p.z + lz, h = p.h;
      const wm = place(windmillProp(), X(0), h, Z(-1), 0, grp);
      const blades = windmillBlades();
      blades.position.copy(wm.anchors.hub);
      world.add(blades);
      map.anim.push((dt, t) => { blades.rotation.z = t * 0.6; });
      place(GE.building('house', { seed: 7, lod: 0.5 }), X(-10.5), h, Z(8), HP, grp);
      place(GE.building('house', { seed: 9, lod: 0.5 }), X(10.5), h, Z(-8), -HP, grp);
      place(wellProp(), X(7), h, Z(7), 0, dec);
      place(GE.lampPost(), X(-7), h, Z(-7), 0, dec);
      place(GE.fence(10), X(0), h, Z(-12.5), 0, grp);
      place(GE.bench(0xff9ac0), X(-4), h, Z(6), 0, dec);
      for (const s of [[-4, 3], [4, -5], [0, 7]]) spot(X(s[0]), null, Z(s[1]), p.id, true);
      spot(X(-10.5 + 4.6), null, Z(8), p.id); spot(X(10.5 - 4.6), null, Z(-8), p.id);
      bin(X(-5), Z(-4), 0, p.id); bin(X(4), Z(10), 0, p.id); bin(X(12), Z(4), 0, p.id);
      fillSpots(p, 4, 20);
      // pads from the hill foot up to the plateau
      for (const a of [0.6, 2.7, 4.6]) {
        const fx = X(Math.cos(a) * 38), fz = Z(Math.sin(a) * 38);
        pad(fx, fz, X(Math.cos(a) * 10), Z(Math.sin(a) * 10), 3, grp, h);
      }
    };

    for (const p of map.pois) {
      const grp = new THREE.Group(), dec = new THREE.Group();
      G.safe('roy poi ' + p.id, () => B[p.id](p, grp, dec));
      const baked = GE.bake(grp);
      baked.name = 'poi-' + p.id;
      world.add(baked);
      p.mesh = baked;
      if (dec.children.length) { const db = GE.bake(dec); db.name = 'poi-dec-' + p.id; world.add(db); p.dec = db; }
    }
    // pads placed without a group (hill) were added to the scene directly; collect strays into one bake
    // (they already are individual meshes in world.scene; fine: <= 3 draw calls).

    // ---- scattered spots + small landmarks between POIs
    const nearPoi = (x, z, m) => map.pois.some(p => Math.hypot(x - p.x, z - p.z) < p.r + (m || 10));
    const scat = new THREE.Group();
    let made = 0, tries = 0;
    while (made < 30 && tries++ < 3000) {
      const a = rnd() * TAU, d = 20 + Math.sqrt(rnd()) * 140;
      const x = Math.cos(a) * d, z = Math.sin(a) * d, y = hf(x, z);
      if (y < 1.6 || nearPoi(x, z, 8)) continue;
      const sl = Math.hypot(hf(x + 1, z) - hf(x - 1, z), hf(x, z + 1) - hf(x, z - 1)) / 2;
      if (sl > 0.35) continue;
      if (map.spots.some(s => s.poi === 'wild' && Math.hypot(s.x - x, s.z - z) < 20)) continue;
      const kind = made % 6;
      if (kind === 1 || kind === 4 || kind === 0) { for (let i = 0; i < 2; i++) place(GE.rock(1.0 + rnd() * 0.6, 60 + made * 3 + i, made % 2 ? 'sand' : 'cool'), x + Math.cos(i * 2.1) * 3.2, hf(x + Math.cos(i * 2.1) * 3.2, z + Math.sin(i * 2.1) * 3.2) - 0.2, z + Math.sin(i * 2.1) * 3.2, rnd() * TAU, scat); }
      else if (kind === 2) { const c = GE.crate('bolt').clone(); c.position.set(x + 2, y, z); scat.add(c); phys.addBox(x + 2, y + 0.45, z, 0.95, 0.9, 0.95); place(GE.barrel(0xff8a4c), x + 2.2, hf(x + 2.2, z + 1.4), z + 1.4, 0, scat); }
      else if (kind === 3 && made < 14) place(GE.pillarArch(8, 4, 30 + made, { lite: true }), x, y - 0.3, z, rnd() < 0.5 ? 0 : HP, scat);
      if (kind === 5 && made % 2 === 1) bin(x + 2, z + 2, 0, 'wild');
      spot(x, null, z, 'wild');
      made++;
    }
    // redeploy balloons
    for (const b of [[-58, 52, 0xff6b8b], [64, 36, 0x3fe0b8]]) {
      const x = b[0], z = b[1], y = hf(x, z);
      const pr = balloonProp(b[2]);
      const r = place(pr, x, y, z, 0, null);
      const balloon = r.mesh.children.find(c => c.position.y > 30) || null;
      map.balloons.push({ x, y: y + 0.35, z, mesh: r.mesh, balloon });
    }
    map.anim.push((dt, t) => { for (const b of map.balloons) if (b.balloon) { b.balloon.position.y = 34 + Math.sin(t * 0.9 + b.x) * 0.6; b.balloon.rotation.y = t * 0.15; } });
    // scatter bake
    if (scat.children.length) { const sb = GE.bake(scat); sb.name = 'roy-scatter'; world.add(sb); }

    // ---- vegetation (instanced; colliders for trunks/rocks)
    const avoid = (x, z) => nearPoi(x, z, 6) || map.spots.some(s => s.poi === 'wild' && Math.abs(s.x - x) < 4 && Math.abs(s.z - z) < 4) || map.pads.some(q => Math.hypot(q.x - x, q.z - z) < 4) || map.balloons.some(q => Math.hypot(q.x - x, q.z - z) < 5);
    const area = { minX: -185, maxX: 185, minZ: -185, maxZ: 185 };
    const qp = G.R.q().props;
    const veg = [];
    const addVeg = (geo, count, o) => {
      const m = GE.scatter(Object.assign({ count: Math.round(count * qp), area, heightFn: hf, avoid, geo, seed: (rnd() * 1e6) | 0 }, o));
      m.name = 'veg';
      world.add(m); veg.push(m);
      if (o.col) for (const pt of m.userData.points) o.col(pt);
      if (o.ao) for (const pt of m.userData.points) ao.push({ x: pt.x, z: pt.z, r: o.ao[0] * pt.s, k: o.ao[1] });
      return m;
    };
    const wind = k => (GE.windMat ? { material: GE.windMat(k) } : {});
    const field = !!G.Terrain.foliage;
    const tree = (kind, seed, palette) => GE.treeGeo(kind, seed, { palette });
    const trunkCol = geo => pt => { const tr = geo.userData.trunk || { r: 0.3, h: 3 }; phys.addCyl(pt.x, pt.z, tr.r * 1.1 * pt.s, pt.y - 0.3, pt.y + tr.h * pt.s); };
    const tg1 = tree('round', 1, 'green'), tg2 = tree('round', 4, 'pink'), tg3 = tree('palm', 2);
    addVeg(tg1, 13, Object.assign({ minY: 2.2, slopeMax: 0.45, scale: [0.9, 1.4], col: trunkCol(tg1), yOffset: -0.1, ao: [2.4, 0.32] }, wind(0.26)));
    addVeg(tg2, 6, Object.assign({ minY: 2.2, slopeMax: 0.45, scale: [0.9, 1.3], col: trunkCol(tg2), yOffset: -0.1, ao: [2.4, 0.32] }, wind(0.26)));
    addVeg(tg3, 8, Object.assign({ minY: 0.4, maxY: 3.0, slopeMax: 0.4, scale: [0.9, 1.3], col: trunkCol(tg3), yOffset: -0.1, ao: [2.2, 0.28] }, wind(0.3)));
    const rg = GE.rockGeo(1.2, 23, 'sand', 2);
    addVeg(rg, 16, { minY: 1, slopeMax: 0.6, scale: [0.9, 2.0], yOffset: -0.15, ao: [1.7, 0.3], col: pt => { const bb = rg.boundingBox; phys.addCyl(pt.x, pt.z, Math.min(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.42 * pt.s, pt.y - 0.5, pt.y + bb.max.y * 0.94 * pt.s); } });
    addVeg(GE.bushGeo(50, 0x5cc85a, 0xff7a93), 14, Object.assign({ minY: 1.4, slopeMax: 0.5, scale: [0.8, 1.4], yOffset: -0.08, ao: [1.4, 0.26] }, wind(0.4)));
    // ground cover: a camera-windowed grass + flower field (below), or the old scattered tufts as a fallback
    if (!field) addVeg(GE.grassTuftGeo(1, 0x4aa85a, 0xbfe870), 260, { minY: 1.4, slopeMax: 0.45, scale: [0.9, 1.6], yOffset: -0.02 });
    if (!field) addVeg(GE.flowerGeo(70, [0xff7a93, 0xffd45c, 0xffffff]), 30, { minY: 1.6, slopeMax: 0.35, scale: [0.9, 1.3] });
    addVeg(GE.coralGeo(0, 0xff7a93, 2), 14, { minY: 0.1, maxY: 1.2, slopeMax: 0.5, scale: [0.9, 1.6] });
    map.veg = veg;
    // clouds and distant islands
    const cpts = [];
    for (let i = 0; i < 8; i++) { const a = rnd() * TAU, d = 60 + rnd() * 260; cpts.push({ x: Math.cos(a) * d, y: 70 + rnd() * 70, z: Math.sin(a) * d, s: 6 + rnd() * 7 }); }
    const cm = GE.instancedAt(GE.cloudGeo(1), GE.cloudMat(), cpts); cm.name = 'clouds'; cm.frustumCulled = false; world.add(cm);
    const hz = GE.distantMountains(560, 18, [0x8fd6a0, 0x7cc89a, 0xf2b98a, 0xc4cff5], { haze: 0xcff3ff, seed: 9 });
    hz.name = 'horizon'; world.add(hz);

    // ---- ground occlusion, living ground cover, ambient life
    G.Terrain.bakeAO(terr, ao);
    const pathD2 = (x, z) => {
      let pd = 1e9;
      for (const sg of paths) {
        const vx = sg[2] - sg[0], vz = sg[3] - sg[1], L2 = vx * vx + vz * vz;
        let t = ((x - sg[0]) * vx + (z - sg[1]) * vz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = sg[0] + vx * t - x, qz = sg[1] + vz * t - z, d = qx * qx + qz * qz;
        if (d < pd) pd = d;
      }
      return pd;
    };
    const ground = (x, z, h) => {
      if (h < 2.0) return 0;
      const sl = (Math.abs(hf(x + 0.9, z) - hf(x - 0.9, z)) + Math.abs(hf(x, z + 0.9) - hf(x, z - 0.9))) / 1.8;
      if (sl > 0.5) return 0;
      return U.smoothstep(2.0, 2.8, h) * (1 - U.smoothstep(0.28, 0.5, sl)) * U.smoothstep(4, 16, pathD2(x, z)) * (1 - 0.65 * U.smoothstep(-55, -100, x));
    };
    if (field) map.foliage = G.safe('roy foliage', () => G.Terrain.foliage(world, {
      heightFn: hf, grid: terr, bounds: area, blockPhys: true, seed: 31,
      density: (x, z, h) => { const g = ground(x, z, h); return g > 0 ? g * (0.55 + 0.45 * U.clamp(0.5 + G.noise.n2(x * 0.11, z * 0.11), 0, 1)) : 0; },
      flowers: (x, z, h) => { const g = ground(x, z, h); return g > 0 ? g * U.smoothstep(0.05, 0.42, G.noise.n2(x * 0.05 + 4.1, z * 0.05 + 1.3)) : 0; },
    }));
    if (G.Terrain.ambient) map.ambient = G.safe('roy ambient', () => G.Terrain.ambient(world, {
      heightFn: hf, seed: 12,
      motes: { count: 50, color: 0xfff0b8 },
      butterflies: { count: 8, near: 26, spot: (r2, cam) => { const p = cam.position; for (let i = 0; i < 8; i++) { const a = r2() * TAU, d = 6 + r2() * 14, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (ground(x, z, hf(x, z)) > 0.3) return { x, z }; } return null; } },
      birds: { count: 7, x: 10, z: 0, r: 150, y: 46, speed: 0.035 },
    }));
    // ---- helpers
    map.isLand = (x, z) => hf(x, z) > 0.4;
    map.landPoint = (r2, cx, cz, rad) => {
      for (let i = 0; i < 60; i++) {
        const a = r2() * TAU, d = Math.sqrt(r2()) * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (Math.abs(x) < RY.BOUND - 5 && Math.abs(z) < RY.BOUND - 5 && hf(x, z) > 1.2 && freeAt(x, z, 0.5)) return new V3(x, phys.groundAt(x, z, 0.4, hf(x, z) + 1.2), z);
      }
      return new V3(POIS[0].x, hf(POIS[0].x, POIS[0].z), POIS[0].z);
    };
    // distance culling: POIs beyond the fog are skipped entirely
    map.update = (dt, t) => {
      for (const f of map.anim) f(dt, t);
      const cam = G.R.camera.position, far = world.scene.fog ? world.scene.fog.far : 900;
      for (const p of map.pois) {
        if (!p.mesh) continue;
        const d = Math.hypot(cam.x - p.x, cam.z - p.z) - p.r;
        p.mesh.visible = d - 25 < far;
        if (p.dec) p.dec.visible = d < 75 && cam.y < p.h + 60;
      }
    };
    map.canvas = paintMap(hf, map);
    return map;
  };

  // ------------------------------------------------------------------ top-down map canvas (HUD)
  function paintMap(hf, map) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
    const ext = 200, k = (ext * 2) / S;
    const col = new THREE.Color(), tmp = new THREE.Color();
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = -ext + (i + 0.5) * k, z = -ext + (j + 0.5) * k, h = hf(x, z);
      if (h < 0) col.setHex(0x1489b8).lerp(tmp.setHex(0x5fd8e0), U.clamp(1 + h / 5, 0, 1));
      else if (h < 1.3) col.setHex(0xf7e3b0);
      else {
        col.setHex(0x6ccb5f).lerp(tmp.setHex(0xa8e06a), U.clamp((h - 2) / 10, 0, 1));
        if (x < -55) col.lerp(tmp.setHex(0xf2b98a), U.clamp((-55 - x) / 50, 0, 0.6));
        if (h > 14) col.lerp(tmp.setHex(0xd8f0b0), U.clamp((h - 14) / 8, 0, 0.7));
      }
      const o = (j * S + i) * 4;
      d[o] = col.r * 255; d[o + 1] = col.g * 255; d[o + 2] = col.b * 255; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const toPx = v => (v + ext) / k;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(232,214,176,0.85)'; g.lineWidth = 2.2;
    for (const s of map.paths) { g.beginPath(); g.moveTo(toPx(s[0]), toPx(s[1])); g.lineTo(toPx(s[2]), toPx(s[3])); g.stroke(); }
    for (const p of map.pois) {
      g.fillStyle = 'rgba(255,246,224,0.75)'; g.strokeStyle = 'rgba(30,26,77,0.55)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(toPx(p.x), toPx(p.z), p.r / k * 0.75, 0, TAU); g.fill(); g.stroke();
    }
    c.ext = ext;
    return c;
  }
})(window.G);

}).call(window); } catch (e) { console.error('[module 25b_royale_map.js]', e); }
// ---- 25b_royale_match.js
try { (function () {
// 25b_royale_match.js — RY.Match: one Sky Drop Royale match.
// Flow: airship crossing (JUMP / Space, auto-drop) -> skydive + glide -> loot -> ring rounds ->
// KO (Breezy Second Chance in rounds 1–2 -> redeploy) / spectate the KO-er 5 s -> results, or
// last ranger standing -> "You're the Champion!" -> results. Emits 'mode-start', 'mode-result',
// 'player-ko', 'heal'. Debug params: fast (ring/drop timings x0.2), skipDrop, seed, timeK, god.
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};
  const U = G.util;
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2;
  const _v = new V3(), _w = new V3(), _f = new V3();
  const cssHex = h => '#' + (h >>> 0).toString(16).padStart(6, '0');

  class Match {
    constructor(params) {
      this.p = params || {};
      this.fast = !!this.p.fast;
      this.timeK = this.p.timeK || (this.fast ? 0.2 : 1);
      this.diff = this.p.difficulty || G.Save.set.difficulty || 'normal';
      if (RY.DIFFS.indexOf(this.diff) < 0) this.diff = 'normal';
      // world.damage scales damage taken by the global difficulty setting: keep them in sync.
      if (G.Save.set.difficulty !== this.diff) G.Save.set.difficulty = this.diff;
      this.seed = this.p.seed != null ? this.p.seed : (Math.random() * 1e9) | 0;
      this.rnd = G.rng(this.seed);
      this.phase = 'ship';
      this.t = 0;
      this.rangers = []; this.pings = []; this.noise = [];
      this.lootCand = null; this.lootAction = '';
      this.pingN = 0; this.spotI = 0; this.thinkRR = 0; this.done = false;
      this.listeners = [];
    }
    // ------------------------------------------------------------------ build
    build() {
      const bio = G.Geo.biomeWorldOpts('meadow');
      const B = RY.BOUND;
      const world = new G.World({
        heightFn: () => 0, bounds: { minX: -B, maxX: B, minZ: -B, maxZ: B },
        sky: bio.sky, fog: { color: bio.fog.color, near: 200, far: 700 }, light: bio.light, floorY: -1.8,
        rules: {
          manualRespawn: true,
          onKill: (t, info) => G.safe('roy onKill', () => this.onKO(t, info)),
          onDamage: (t, res, info) => G.safe('roy onDamage', () => this.onDamage(t, res, info)),
          canDamage: (src, target, info) => {
            const e = target && target.royEnt;
            if (e && e.state !== 'ground') return false;
            if (target.isPlayer && (this.p.god || this.phase === 'champion' || this.phase === 'end')) return false;
            return true;
          },
        },
      });
      this.world = world;
      this.fogBase = { color: new THREE.Color(bio.fog.color), storm: new THREE.Color(0x6f8dff) };
      G.bus.emit('mode-start', 'royale', { difficulty: this.diff });
      this.map = RY.buildMap(world, this.rnd, {});
      this.loot = new RY.Loot(this);
      this.loot.populate(this.map);
      this.ring = new RY.Ring(this);
      // ---- player
      const base = G.Data && G.Data.playerStats ? G.safe('playerStats', () => G.Data.playerStats()) || {} : {};
      const stats = Object.assign({}, base, { maxHp: 100, maxShield: RY.SHIELD[0].max, shieldRegen: 0, regenDelay: 999, hpRegen: this.diff === 'breezy' ? 2 : 0, jetpack: false, glide: false, armor: 0 });
      const pl = new G.Player(world, { stats, loadout: [], spawn: new V3(0, 120, 0), team: 0 });
      pl.noShieldRegen = true;
      pl.maxShield = pl.shield = RY.SHIELD[0].max;
      world.player = pl;
      const pe = this.player = this.makeEnt(0, true, pl);
      pe.name = G.t('roy.you');
      pe.colors = RY.rangerColors(0);
      pe.inv = RY.Inv.create(pl);
      this.applyPlayerWeapons(0);
      // ---- bots
      const mix = RY.Bots.mix(this.diff);
      const names = U.shuffle(Array.from({ length: 18 }, (_, i) => i));
      for (let i = 1; i < 16; i++) {
        const e = this.makeEnt(i, false, null);
        e.name = G.t('roy.bot.' + names[i - 1]);
        e.colors = RY.rangerColors(i);
        e.skill = RY.Bots.SKILL[mix[i - 1]];
        e.actor = RY.Bots.create(this, e);
        e.inv = RY.Inv.create(e.actor);
        RY.Bots.applyWeapons(e);
      }
      this.champBot = this.rangers.find(e => !e.isPlayer && e.skill.id === 'strong') || this.rangers[1];
      // ---- loot interactable + balloons
      this.lootIt = world.addInteract({ pos: new V3(0, -99, 0), r: 2.8, key: 'roy.pickup', enabled: () => !!this.lootCand, onUse: () => this.useLoot() });
      for (const b of this.map.balloons) world.addInteract({ pos: new V3(b.x, b.y, b.z), r: 2.4, key: 'roy.ride', onUse: () => this.balloonRide(b) });
      // ---- airship + bot drop plans
      this.airship = new RY.Airship(this);
      this.planDrops();
      if (G.Bot && G.Bot.nav) G.safe('navgrid', () => G.Bot.nav(world));    // height-aware: mesas, walls, decks, ramps
      else if (G.Enemies && G.Enemies.nav) G.safe('navgrid', () => G.Enemies.nav(world));
      // ---- HUD
      this.hud = new RY.Hud(this);
      this.hud.show();
      this.onEquip = () => this.decorateSlots();
      G.bus.on('weapon-equip', this.onEquip);
      this.listeners.push(['weapon-equip', this.onEquip]);
      this.decorateSlots();
      const mm = document.querySelector('#hud .minimap');
      if (mm) { mm.style.pointerEvents = 'auto'; this._mmEl = mm; this._mmTap = ev => { ev.preventDefault(); ev.stopPropagation(); this.toggleMap(); }; mm.addEventListener('pointerdown', this._mmTap); }
      G.R.showViewmodel = false;
      if (this.p.skipDrop) this.skipDrop();
      else { this.hud.intro(); this.hud.overview(true); }
      RY.debug = this;
      return world;
    }
    makeEnt(idx, isPlayer, actor) {
      const team = isPlayer ? 0 : idx;
      const e = { idx, team, isPlayer, actor, name: '', alive: true, state: 'ship', pops: 0, dmg: 0, dmgTaken: 0, shieldLv: 0, heals: 0, place: 0, lastHitT: -99, lastAttacker: null, spotT: -99, thinkT: Math.random() * 0.3, landT: 0, healing: null, skill: RY.Bots.SKILL[1], losOk: false };
      if (actor) actor.royEnt = e;
      this.rangers.push(e);
      return e;
    }
    aliveCount() { let n = 0; for (const e of this.rangers) if (e.alive) n++; return n; }
    // Spread the bots over the island: about two per POI plus a few wild drops. Each match one POI is a hot drop
    // (+2 bots) and one is quiet (no bot), another +1 / -1, so the bot counts the airship map shows per POI (their
    // real plans) make the landing choice matter: a calm loot-up, or a crowded scramble.
    planDrops() {
      const map = this.map, ship = this.airship, rnd = this.rnd;
      const zones = [];
      const n = map.pois.length, counts = map.pois.map(() => 2);
      if (n >= 4) {
        const order = map.pois.map((p, i) => i).sort((a, b) => ((a * 7919 + this.seed) % 13) - ((b * 7919 + this.seed) % 13) || a - b);
        counts[order[0]] += 2; counts[order[1]] -= 2; counts[order[2]] += 1; counts[order[3]] -= 1;
      }
      map.pois.forEach((p, i) => { for (let k = 0; k < counts[i]; k++) zones.push(p.id); });
      zones.push('wild', 'wild', 'wild');
      U.shuffle(zones);
      let zi = 0;
      for (const e of this.rangers) {
        if (e.isPlayer) continue;
        const z = zones[zi++ % zones.length];
        const list = map.spots.filter(s => s.poi === z && !s.high);
        const s = list.length ? list[(rnd() * list.length) | 0] : map.spots[(rnd() * map.spots.length) | 0];
        e.dropTarget = new V3(s.x + (rnd() - 0.5) * 6, s.y, s.z + (rnd() - 0.5) * 6);
        e.jumpK = U.clamp(ship.closestK(s.x, s.z) - 0.1 + rnd() * 0.12, 0.06, ship.autoK - 0.02);
      }
    }
    skipDrop() {
      const rnd = this.rnd;
      for (const e of this.rangers) {
        let pos;
        if (e.isPlayer) pos = this.p.spawnAt ? new V3().copy(this.p.spawnAt) : this.map.landPoint(rnd, this.map.pois[0].x + 8, this.map.pois[0].z + 8, 6);
        else pos = this.map.landPoint(rnd, e.dropTarget.x, e.dropTarget.z, 4);
        RY.Sky.start(this, e, pos, null);
        this.land(e);
      }
      this.airship.mesh.visible = false;
      this.airship.t = this.airship.dur * 1.3;
      this.startPlay();
    }
    // ------------------------------------------------------------------ inventory
    applyPlayerWeapons(selectSlot) {
      const pe = this.player, pl = pe.actor, inv = pe.inv;
      const list = inv.slots.filter(Boolean).map(s => s.inst);
      const cur = pl.weapon;
      if (cur && list.indexOf(cur) < 0 && cur.onUnequip) G.safe('unequip', () => cur.onUnequip());
      pl.weapons = list;
      let idx = selectSlot != null && inv.slots[selectSlot] ? list.indexOf(inv.slots[selectSlot].inst) : list.indexOf(cur);
      if (idx < 0) idx = 0;
      pl.wi = idx;
      pl.equip(idx, selectSlot == null);
    }
    decorateSlots() {
      const slots = document.querySelectorAll('#hud .wslot');
      const pl = this.player.actor;
      pl.weapons.forEach((w, i) => {
        const s = slots[i]; if (!s) return;
        const r = RY.RARITY[w.royRar || 0];
        s.style.background = 'linear-gradient(to top, ' + r.css + ' 0%, ' + r.css + ' 26%, rgba(255,255,255,0.8) 27%)';
        s.style.boxShadow = '0 3px 0 ' + r.css;
        if (!w.royId || !G.Weapons || !G.Weapons.icon || !G.Weapons.icon(w.royId)) {
          if (!s.querySelector('.roy-wl')) s.appendChild(G.UI.el('span.roy-wl', { text: RY.weaponName(w.royId || 'fizz').slice(0, 1), style: { font: '400 22px var(--f-display)', color: cssHex(RY.WEAPON_COLOR[w.royId] || 0x2ec4b6), WebkitTextStroke: '1.5px #1e1a4d' } }));
        }
      });
    }
    // Give a ground item to a ranger. Returns true when taken.
    give(ent, it, isBot) {
      const inv = ent.inv, a = ent.actor, loot = this.loot;
      if (!it.alive) return false;
      const can = RY.Inv.canTake(inv, it, a);
      if (it.kind === 'weapon') {
        let slot = RY.Inv.freeSlot(inv);
        if (slot < 0) {
          if (isBot) slot = RY.Inv.worstSlot(inv);
          else { const cur = inv.slots.findIndex(s => s && s.inst === a.weapon); slot = cur > 0 ? cur : RY.Inv.worstSlot(inv); }
          const old = inv.slots[slot];
          if (old) {
            if (old.inst.onUnequip) G.safe('unequip', () => old.inst.onUnequip());
            const fw = this.fwd(a, _f);
            loot.add('weapon', old.id, old.rar, _v.set(a.pos.x + fw.x * 0.8, a.pos.y + 0.6, a.pos.z + fw.z * 0.8), { ammo: old.inst.ammo, vel: _w.set(fw.x * 1.5, 3, fw.z * 1.5) });
            if (!isBot) G.HUD.pick(G.t('roy.dropped', { item: RY.itemName({ kind: 'weapon', type: old.id }) }));
          }
        }
        const inst = RY.makeWeapon(it.type, it.rar, a);
        if (it.ammo != null && inst.maxAmmo && isFinite(inst.maxAmmo)) inst.ammo = Math.min(inst.maxAmmo, it.ammo);
        inv.slots[slot] = { id: it.type, rar: it.rar, inst };
        loot.take(it);
        if (isBot) RY.Bots.applyWeapons(ent);
        else {
          this.applyPlayerWeapons(slot);
          this.pickFeed(it);
        }
        return true;
      }
      if (can === 'full' || can === 'useless') { if (!isBot && it === this.lootCand) { G.HUD.pick(G.t('roy.full')); if (G.Audio) G.Audio.sfx('error', { vol: 0.5 }); } return false; }
      if (it.kind === 'heal') inv.heals[it.type]++;
      else if (it.kind === 'ammo') RY.Inv.ammoBox(inv);
      else if (it.kind === 'throw') {
        if (inv.thr.id && inv.thr.id !== it.type && inv.thr.n > 0) {
          for (let i = 0; i < inv.thr.n; i++) loot.add('throw', inv.thr.id, RY.THROWS[inv.thr.id].rar, a.pos, { vel: _w.set(U.rand(-1.5, 1.5), 3, U.rand(-1.5, 1.5)) });
          inv.thr.n = 0; ent.thrInst = null;
        }
        if (inv.thr.id !== it.type) { inv.thr.id = it.type; inv.thr.n = 0; ent.thrInst = null; }
        inv.thr.n = Math.min(RY.THROWS[it.type].stack, inv.thr.n + 1);
      }
      loot.take(it);
      if (!isBot) this.pickFeed(it);
      return true;
    }
    pickFeed(it) {
      const r = RY.RARITY[it.rar];
      G.HUD.pick(RY.itemLabel(it), '<svg viewBox="0 0 18 18"><path d="M9 1l8 8-8 8-8-8z" fill="' + r.css + '" stroke="#1e1a4d" stroke-width="2"/></svg>');
      if (G.Audio) {
        if (it.kind === 'weapon') G.Audio.sfx(it.rar >= 4 ? 'levelup' : it.rar >= 3 ? 'pickupRare' : 'equip', { vol: 0.8 });
        else G.Audio.sfx(it.kind === 'heal' ? (RY.HEALS[it.type].sh ? 'shieldUp' : 'heal') : it.kind === 'ammo' ? 'reload' : 'pickupPart', { vol: 0.7 });
      }
    }
    fwd(a, out) { const y = a.yaw || 0; return out.set(-Math.sin(y), 0, -Math.cos(y)); }
    useLoot() {
      const c = this.lootCand, pe = this.player;
      if (!c || pe.state !== 'ground' || !pe.actor.alive) return;
      if (c.kind === 'bin') { this.loot.openBin(c, pe); return; }
      this.give(pe, c, false);
    }
    playerLoot() {
      const pe = this.player, pl = pe.actor;
      if (pe.state !== 'ground' || !pl.alive) { this.lootCand = null; return; }
      // auto-pickup: ammo / heals / throwables (and weapons into an empty slot) when walking over them
      const list = this.loot.near(pl.pos, 1.25, this._ap || (this._ap = []));
      for (const it of list.slice()) {
        if (it.vel || !it.alive) continue;
        if (Math.abs(it.pos.y - pl.pos.y) > 1.4) continue;
        const can = RY.Inv.canTake(pe.inv, it, pl);
        if (can === 'take' && (it.kind !== 'weapon' || RY.Inv.freeSlot(pe.inv) >= 0)) this.give(pe, it, false);
      }
      const c = this.loot.candidate(pl.pos, this.fwd(pl, _f));
      this.lootCand = c && (c.kind === 'bin' ? !c.open : c.alive) ? c : null;
      if (this.lootCand) {
        const it = this.lootCand;
        if (it.kind === 'bin') { this.lootIt.pos.set(it.x, it.y, it.z); this.lootIt.key = 'roy.open'; }
        else {
          this.lootIt.pos.copy(it.pos);
          const can = RY.Inv.canTake(pe.inv, it, pl);
          this.lootIt.key = can === 'swap' ? 'roy.swap' : can === 'full' || can === 'useless' ? 'roy.full' : 'roy.pickup';
        }
      } else this.lootIt.pos.set(0, -99, 0);
    }
    dropInventory(e) {
      const a = e.actor, inv = e.inv, loot = this.loot;
      let k = 0;
      const toss = () => { const ang = (k++ / 6) * TAU + Math.random(); return _w.set(Math.cos(ang) * 2.2, 4, Math.sin(ang) * 2.2); };
      const p = _v.set(a.pos.x, a.pos.y + 0.8, a.pos.z);
      for (let i = 1; i < inv.slots.length; i++) { const s = inv.slots[i]; if (s) loot.add('weapon', s.id, s.rar, p, { ammo: s.inst.ammo, vel: toss() }); }
      for (const h in inv.heals) for (let i = 0; i < inv.heals[h]; i++) loot.add('heal', h, RY.HEALS[h].rar, p, { vel: toss() });
      if (inv.thr.n > 0) loot.add('throw', inv.thr.id, RY.THROWS[inv.thr.id].rar, p, { vel: toss() });
    }
    // ------------------------------------------------------------------ heal / throw
    startHeal(e, auto) {
      const a = e.actor;
      if (e.healing) return;
      const type = RY.Inv.smartPick(e.inv, a);
      if (!type) {
        if (!auto && e.isPlayer) { this.hud.flash(RY.Inv.healCount(e.inv) > 0 ? 'roy.healFull' : 'roy.noHeals'); if (G.Audio) G.Audio.sfx('error', { vol: 0.6 }); }
        return;
      }
      e.healing = { type, t: 0, dur: RY.HEALS[type].time, fire: a.lastFireT || -9 };
      if (e.isPlayer && G.Audio) G.Audio.sfx('charge', { vol: 0.5, pitch: RY.HEALS[type].sh ? 1.4 : 1 });
    }
    botStartHeal(e) { this.startHeal(e, true); }
    cancelHeal(e, msg) {
      if (!e.healing) return;
      e.healing = null;
      if (e.isPlayer) { e.actor.speedMod = 1; e.actor.hideVm = false; if (msg) G.HUD.pick(G.t('roy.healCancel')); }
    }
    updateHeal(e, dt) {
      const h = e.healing; if (!h) return;
      const a = e.actor;
      if (!a.alive || e.state !== 'ground') { this.cancelHeal(e); return; }
      if (e.isPlayer) {
        if ((G.input.fire && !G.UI.anyOpen()) || (a.lastFireT || -9) > h.fire + 0.01) { this.cancelHeal(e, true); return; }
        a.speedMod = 0.6; a.hideVm = true;
      }
      h.t += dt;
      if (Math.random() < 0.3) this.world.fx.spawn(_v.set(a.pos.x + U.rand(-0.5, 0.5), a.pos.y + U.rand(0.3, 1.6), a.pos.z + U.rand(-0.5, 0.5)), _w.set(0, 1.5, 0), RY.HEALS[h.type].color, 0.18, 0.5, { grav: 0 });
      if (h.t >= h.dur) {
        RY.Inv.applyHeal(a, h.type);
        e.inv.heals[h.type] = Math.max(0, e.inv.heals[h.type] - 1);
        e.heals++;
        e.healing = null;
        if (e.isPlayer) {
          a.speedMod = 1; a.hideVm = false;
          G.bus.emit('heal', h.type);
          if (G.Audio) G.Audio.sfx(RY.HEALS[h.type].sh ? 'shieldUp' : 'heal');
          this.world.fx.ring(a.pos, 1.4, RY.HEALS[h.type].color, 0.4, a.pos.y + 0.1);
        }
      }
    }
    throwInst(e) {
      const id = e.inv.thr.id;
      if (!id) return null;
      if (e.thrInst && e.thrInst.royThr === id) return e.thrInst;
      const wid = id === 'grenade' ? 'lobber' : id;
      let inst = null;
      if (G.Weapons && G.Weapons.create && G.Weapons.defs && G.Weapons.defs[wid]) inst = G.safe('throw inst', () => G.Weapons.create(wid, 1, [], e.actor, { rarity: RY.RARITY[RY.THROWS[id].rar].id, infiniteAmmo: true }));
      if (!inst) inst = new RY.FallbackWeapon('lobber', 1, e.actor);
      inst.royThr = id;
      e.thrInst = inst;
      return inst;
    }
    playerThrow(dt) {
      const pe = this.player, pl = pe.actor;
      if (this.thrStage === 1) {
        const inst = this.throwInst(pe);
        if (inst) G.safe('throw', () => inst.update(dt, pl._ctx(false, false)));
        this.thrStage = 2;
        pe.inv.thr.n = Math.max(0, pe.inv.thr.n - 1);
        return;
      }
      if (this.thrStage === 2) {
        const inst = this.throwInst(pe);
        if (inst) G.safe('throw', () => { inst.update(dt, pl._ctx(false, false)); if (inst.onUnequip) inst.onUnequip(); });
        this.thrStage = 0;
        if (pe.inv.thr.n <= 0) { pe.inv.thr.id = null; pe.thrInst = null; }
        return;
      }
      if (G.input.reloadP && pe.inv.thr.n > 0 && pe.state === 'ground' && pl.alive && !G.UI.anyOpen()) {
        const inst = this.throwInst(pe);
        if (!inst) return;
        this.cancelHeal(pe);
        G.safe('throw', () => inst.update(dt, pl._ctx(true, true)));
        this.thrStage = 1;
      }
    }
    botThrow(e, target) {
      const inst = this.throwInst(e);
      const a = e.actor;
      if (!inst || !a._ctx) return;
      e.thrCd = this.world.time + 7;
      G.safe('bot throw', () => { inst.cd = 0; inst.update(0.016, a._ctx(true, target)); inst.update(0.016, a._ctx(false, target)); });
      e.inv.thr.n = Math.max(0, e.inv.thr.n - 1);
      if (e.inv.thr.n <= 0) { e.inv.thr.id = null; e.thrInst = null; }
    }
    // ------------------------------------------------------------------ events
    onDamage(target, res, info) {
      const now = this.world.time;
      const te = target.royEnt, src = info && info.src, se = src && src.royEnt;
      if (te) { te.lastHitT = now; if (src && src !== target) te.lastAttacker = src; te.dmgTaken += res.dealt; }
      if (se && te && se !== te) {
        se.dmg += res.dealt;
        this.checkShield(se);
        if (this.noise.length > 30) this.noise.shift();
        this.noise.push({ x: src.pos.x, z: src.pos.z, t: now });
        if (te.isPlayer) se.spotT = now;
        if (se.isPlayer) te.spotT = now;
        const pl = this.player.actor;
        if (!se.isPlayer && pl && pl.pos.distanceTo(src.pos) < 55) se.spotT = Math.max(se.spotT, now - 0.6);
      }
    }
    checkShield(e) {
      const a = e.actor;
      while (e.shieldLv < RY.SHIELD.length - 1 && e.dmg >= RY.SHIELD[e.shieldLv + 1].need) {
        e.shieldLv++;
        a.maxShield = RY.SHIELD[e.shieldLv].max;
        a.shield = a.maxShield;
        if (e.isPlayer) {
          this.hud.flash('roy.shieldUp', { n: e.shieldLv + 1 });
          if (G.Audio) G.Audio.sfx('levelup', { vol: 0.8 });
          this.world.fx.ring(a.pos, 2.2, 0x39d5ff, 0.6, a.pos.y + 0.2);
        }
      }
    }
    onKO(target, info) {
      const e = target.royEnt;
      if (!e || !e.alive) return;
      info = info || {};
      const killer = info.src && info.src.royEnt && info.src.royEnt !== e ? info.src.royEnt : null;
      const ring = info.type === 'ring';
      if (this.done) return;
      if (e.isPlayer && this.canSecondChance()) { this.secondChance(killer); return; }
      e.alive = false;
      e.state = 'out';
      e.place = this.aliveCount() + 1;
      e.koBy = killer; e.koT = this.t;
      if (e.healing) e.healing = null;
      if (killer) killer.pops++;
      // kill feed: every bot's name carries a BOT pill (RY.Hud.feedKO), so nobody mistakes the lobby for real people
      const hud = this.hud;
      if (killer && killer.isPlayer) hud.feedKO('roy.feed.you', null, e, 'rgba(255,182,39,0.92)');
      else if (e.isPlayer) hud.feedKO(killer ? 'roy.feed.youOut' : 'roy.feed.ring', killer, e, 'rgba(255,90,110,0.92)');
      else if (ring || !killer) hud.feedKO('roy.feed.ring', null, e, 'rgba(80,120,255,0.8)');
      else hud.feedKO('roy.feed.ko', killer, e);
      for (const p of this.pings) if (p.actor === target) p.t = p.dur;
      if (!e.isPlayer) this.dropInventory(e);
      // bounty: the crowned champion bot (the strongest in the lobby) leaves a bonus stash when YOU bonk it
      if (e === this.champBot && killer && killer.isPlayer) this.champBonus(e);
      if (e.isPlayer) this.playerOut(killer, ring);
      const alive = this.aliveCount();
      if (alive <= 1) {
        const w = this.rangers.find(r => r.alive);
        if (w) w.place = 1;
        this.winner = w || null;
        if (w && w.isPlayer) this.playerWin();
      } else if (this.player.alive && (alive === 3 || alive === 2) && !this['_fin' + alive]) {
        // endgame call-outs, once each: "Final 3!" / "Final duel!"
        this['_fin' + alive] = true;
        hud.flash(alive === 3 ? 'roy.final3' : 'roy.duel');
        if (G.Audio) G.Audio.sfx('warn', { vol: 0.5, pitch: alive === 2 ? 1.25 : 1.1 });
      }
    }
    // Champion's stash: a top-rarity blaster and a Shield Battery pop out where the crowned bot was bonked.
    champBonus(e) {
      const a = e.actor, loot = this.loot;
      const legend = G.Weapons && G.Weapons.defs && G.Weapons.defs.prism ? 'prism' : RY.WEAPON_POOL[(this.rnd() * RY.WEAPON_POOL.length) | 0];
      const p = _v.set(a.pos.x, a.pos.y + 0.9, a.pos.z);
      loot.add('weapon', legend, 4, p, { vel: _w.set(1.6, 4.5, 0.4) });
      loot.add('heal', 'battery', 2, p, { vel: _w.set(-1.4, 4.2, -0.8) });
      this.hud.flash('roy.champBonus');
      this.world.fx.confetti(_f.set(a.pos.x, a.pos.y + 1.6, a.pos.z), 40);
      if (G.Audio) G.Audio.sfx('pickupRare', { vol: 0.8 });
      this.champBonked = true;
    }
    canSecondChance() {
      return this.diff === 'breezy' && !this.secondUsed && this.ring.phase !== 'done' && this.ring.round <= 1 && this.aliveCount() > 2;
    }
    secondChance(killer) {
      this.secondUsed = true;
      const pe = this.player;
      if (killer) killer.pops++;
      pe.state = 'redeploy';
      this.redeployT = 2.2;
      this.cancelHeal(pe);
      G.UI.banner(G.t('roy.secondChance'), G.t('roy.secondChanceSub'), 2.2);
      if (G.Audio) G.Audio.sfx('respawn');
    }
    redeploy() {
      const pe = this.player, pl = pe.actor, w = this.world;
      const ring = this.ring;
      const c = ring.phase === 'idle' ? { x: 0, z: 0, r: 120 } : ring.next;
      const p = this.map.landPoint(this.rnd, c.x, c.z, Math.max(10, c.r * 0.6));
      pl.respawn(new V3(p.x, p.y, p.z));
      pl.maxShield = RY.SHIELD[pe.shieldLv].max; pl.shield = pl.maxShield;
      const i = w.actors.indexOf(pl); if (i >= 0) w.actors.splice(i, 1);
      RY.Sky.start(this, pe, _v.set(p.x, p.y + 95, p.z), _w.set(0, 0, 0));
      pl.pitch = -0.7;
    }
    balloonRide(b) {
      const pe = this.player, pl = pe.actor, w = this.world;
      if (pe.state !== 'ground' || !pl.alive) return;
      this.cancelHeal(pe);
      const i = w.actors.indexOf(pl); if (i >= 0) w.actors.splice(i, 1);
      RY.Sky.start(this, pe, _v.set(b.x, b.y + 62, b.z), _w.set(0, 6, 0));
      pl.pitch = -0.6;
      if (G.Audio) G.Audio.sfx('boost');
      w.fx.ring(_v.set(b.x, b.y, b.z), 3, 0xffd23f, 0.6, b.y + 0.3);
    }
    playerOut(killer, ring) {
      const pe = this.player, pl = pe.actor;
      this.phase = 'spectate';
      this.specT = 5;
      this.specTarget = killer ? killer.actor : null;
      this.specPos = pl.pos.clone();
      this.hud.spectate(killer ? killer.name : null, pe.place, ring);
      this.cancelHeal(pe);
      G.bus.emit('player-ko', ring ? 'ring' : 'bot');
      if (G.Audio) G.Audio.sfx('lose', { vol: 0.6 });
    }
    playerWin() {
      if (this.phase === 'champion' || this.done) return;
      this.phase = 'champion';
      this.champT = 4.5;
      const pl = this.player.actor;
      this.hud.champion();
      for (let i = 0; i < 3; i++) this.world.fx.confetti(_v.set(pl.pos.x + U.rand(-2, 2), pl.pos.y + 2.5, pl.pos.z + U.rand(-2, 2)), 60);
      if (G.Audio) { G.Audio.sfx('win'); G.Audio.music(null); }
    }
    // ------------------------------------------------------------------ phases
    startPlay() {
      if (this.phase === 'ship') this.phase = 'play';
      if (this.ring.phase === 'idle') this.ring.start();
      this.hud.overview(false);
      this.zone = G.Audio && G.Audio.loop ? G.Audio.loop('zoneWarn', { vol: 0 }) : null;
    }
    playerJump() {
      const pe = this.player, ship = this.airship;
      if (pe.state !== 'ship') return;
      RY.Sky.start(this, pe, _v.copy(ship.pos).add(_w.set(0, -4, 0)), _w.copy(ship.dir).multiplyScalar(7));
      pe.actor.yaw = Math.atan2(ship.dir.x, ship.dir.z) + PI; pe.actor.pitch = -0.6;
      this.hud.overview(false);
      this.hud.msg(null);
      if (G.Audio) { G.Audio.sfx('jump'); this.wind = G.Audio.loop ? G.Audio.loop('whoosh', { vol: 0.5 }) : null; }
    }
    botJump(e) {
      const ship = this.airship;
      RY.Sky.start(this, e, _v.copy(ship.pos).add(_w.set(U.rand(-3, 3), -4, U.rand(-3, 3))), _w.copy(ship.dir).multiplyScalar(6));
    }
    land(e) {
      const w = this.world, s = e.sky, pos = s.pos;
      // never land in the sea
      if (this.map.hf(pos.x, pos.z) < 0.4) {
        const l = Math.hypot(pos.x, pos.z) || 1;
        for (let i = 0; i < 80 && this.map.hf(pos.x, pos.z) < 1.2; i++) { pos.x -= pos.x / l * 2; pos.z -= pos.z / l * 2; }
        pos.y = w.phys.groundAt(pos.x, pos.z, 0.4, 999);
      }
      e.state = 'ground';
      e.landT = w.time;
      const a = e.actor;
      a.pos.copy(pos); a.vel.set(0, 0, 0);
      a.grounded = true;
      if (e.isPlayer) {
        a.safePos.copy(pos); a._lastY = pos.y;
        if (w.actors.indexOf(a) < 0) w.addActor(a);
        a.pitch = Math.max(a.pitch, -0.2);
        this.hud.flash('roy.landed');
        if (this.wind) { this.wind.stop(0.4); this.wind = null; }
        if (G.Audio) G.Audio.sfx('land');
        w.fx.ring(pos, 2, 0xffffff, 0.4, pos.y + 0.1);
        // back to first person: the horizontal FOV setting converted for this aspect (the player camera keeps it from here)
        G.R.camera.fov = G.fovV ? G.fovV(G.R.camera.aspect) : (G.Save.set.fov || 75); G.R.camera.updateProjectionMatrix();
      } else {
        a.yaw = (e.skyYaw || 0) + PI; a.aimYaw = a.yaw;
        if (w.actors.indexOf(a) < 0) w.addActor(a);
        a.goal = null;
        e.thinkT = Math.random() * 0.3;
      }
    }
    toggleMap() {
      if (this.phase === 'ship') return;
      if (this.mapOpen) { this.mapOpen = false; this.hud.overview(false); }
      else { this.mapOpen = true; this.hud.overview(true, true); }
    }
    // ------------------------------------------------------------------ pings
    pingLocation(pos, fromMap) {
      this.addPing('go', pos, { label: G.t('roy.ping.go'), color: '#ffd23f', icon: RY.ICON.pin, dur: 20 });
      this.mapPing = pos.clone();
      if (fromMap && this.mapOpen) setTimeout(() => { if (this.mapOpen) this.toggleMap(); }, 700);
    }
    addPing(type, pos, o) {
      const id = 'roy-ping-' + (this.pingN++ % 4);
      const old = this.pings.findIndex(p => p.id === id);
      if (old >= 0) { G.HUD.removeMarker(id); this.pings.splice(old, 1); }
      const p = { id, type, pos: pos.clone(), actor: o.actor || null, item: o.item || null, t: 0, dur: o.dur, color: o.color };
      this.pings.push(p);
      G.HUD.marker(id, p.pos, { icon: o.icon, label: o.label, color: o.color });
      G.HUD.pick(type === 'enemy' ? G.t('roy.ping.enemy') : type === 'loot' ? G.t('roy.ping.loot', { item: o.label }) : o.label, o.icon);
      if (G.Audio) G.Audio.sfx(type === 'enemy' ? 'enemyAlert' : 'ring', { vol: 0.7 });
    }
    doPing() {
      if (!G.input.pingP || G.UI.anyOpen()) return;
      const pe = this.player, pl = pe.actor, w = this.world, cam = G.R.camera;
      let eye, dir;
      if (pe.state === 'ground' && pl.alive) { eye = pl.eyePos(new V3()); dir = pl.forward(new V3()); }
      else { eye = cam.position.clone(); dir = cam.getWorldDirection(new V3()); }
      const hit = w.hitscan(eye, dir, 260, pl);
      const it = this.loot.rayPick(eye, dir, 90);
      const itT = it ? it.pos.distanceTo(eye) : Infinity;
      if (hit && hit.actor && hit.actor.royEnt && hit.t < itT) {
        hit.actor.royEnt.spotT = w.time;
        this.addPing('enemy', hit.actor.aimPoint(new V3()).setY(hit.actor.pos.y + 2.2), { actor: hit.actor, label: hit.actor.royEnt.name, color: '#ff5a6e', icon: RY.ICON.enemy, dur: 5 });
      } else if (it) {
        this.addPing('loot', _v.copy(it.pos).setY(it.pos.y + 1.0), { item: it, label: RY.itemLabel(it), color: RY.RARITY[it.rar].css, icon: '<svg viewBox="0 0 18 18"><path d="M9 1l8 8-8 8-8-8z" fill="' + RY.RARITY[it.rar].css + '" stroke="#1e1a4d" stroke-width="2"/></svg>', dur: 30 });
      } else if (hit) {
        this.pingLocation(hit.point, false);
      } else {
        const t = w.phys.rayTerrain(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, 400);
        if (t != null) this.pingLocation(_v.copy(eye).addScaledVector(dir, t), false);
      }
    }
    updatePings(dt) {
      for (let i = this.pings.length - 1; i >= 0; i--) {
        const p = this.pings[i];
        p.t += dt;
        if (p.actor && p.actor.alive) { p.pos.set(p.actor.pos.x, p.actor.pos.y + 2.3, p.actor.pos.z); G.HUD.markers.get(p.id) && G.HUD.markers.get(p.id).pos.copy(p.pos); }
        if (p.item && !p.item.alive) p.t = p.dur;
        if (p.t >= p.dur) { G.HUD.removeMarker(p.id); this.pings.splice(i, 1); }
      }
    }
    onRing(evt, ring) {
      const H = this.hud;
      if (evt === 'start') H.flash('roy.ring.start');
      else if (evt === 'warn') { H.flash(G.t('roy.ring.banner', { t: U.fmtClock(ring.timeLeft()) })); if (G.Audio) G.Audio.sfx('warn', { vol: 0.6 }); }
      else if (evt === 'close') { H.flash('roy.ring.closingNow'); if (G.Audio) { G.Audio.sfx('zoneWarn'); G.Audio.music('royale', { rate: 1.22 }); } }
      else if (evt === 'round') { if (G.Audio) G.Audio.music('royale', { rate: 1 + ring.round * 0.04 }); }
      else if (evt === 'done') { H.flash('roy.ring.final'); if (G.Audio) G.Audio.music('royale', { rate: 1.27 }); }
    }
    onDrop(evt, d) {
      const id = 'roy-drop-' + this.ring.drops.indexOf(d);
      if (evt === 'announce') {
        this.hud.flash('roy.supply');
        G.HUD.marker(id, d.pos.clone().setY(d.pos.y + 2), { icon: RY.ICON.loot, label: G.t('roy.it.drop'), color: '#fff1c8' });
        if (G.Audio) G.Audio.sfx('warn', { vol: 0.5, pitch: 1.3 });
      } else if (evt === 'landed') {
        const P = this.world.phys;
        const legend = G.Weapons && G.Weapons.defs && G.Weapons.defs.prism ? 'prism' : RY.WEAPON_POOL[(this.rnd() * RY.WEAPON_POOL.length) | 0];
        const bin = { id: 9000 + this.ring.drops.indexOf(d), x: d.pos.x, y: d.pos.y, z: d.pos.z, ry: 0, open: false, kind: 'bin', drop: d, mid: id,
          contents: [{ kind: 'weapon', type: legend, rar: 4 }, { kind: 'heal', type: 'battery', rar: 2 }] };
        bin.col = P.addBox(d.pos.x, d.pos.y + 0.7, d.pos.z, 1.6, 1.4, 1.6);
        d.landT = this.world.time;
        this.loot.bins.push(bin);
        this.hud.flash('roy.supplyLanded');
      }
    }
    onDropOpened(bin) { if (bin.mid) G.HUD.removeMarker(bin.mid); }
    // ------------------------------------------------------------------ per-frame
    update(dt) {
      const w = this.world, pe = this.player, pl = pe.actor;
      this.t += dt;
      if (this._mmHidden) { for (const e of this.rangers) if (!e.isPlayer && e.actor) e.actor.hidden = false; this._mmHidden = false; }
      const ship = this.airship;
      // ---- airship phase
      if (ship.mesh.visible || this.phase === 'ship') ship.update(dt);
      if (this.phase === 'ship') {
        if (pe.state === 'ship') {
          RY.shipCamera(this, dt);
          const left = Math.max(0, (ship.autoK - ship.k) * ship.dur);
          // a marked landing spot turns the sub-line into jump timing: the airship's closest pass to the spot
          let sub = G.t('roy.autoDrop', { n: Math.ceil(left) });
          if (this.mapPing) {
            const sk = Math.min(ship.closestK(this.mapPing.x, this.mapPing.z), ship.autoK), inS = (sk - ship.k) * ship.dur;
            if (inS > 0.6) sub = G.t('roy.spotIn', { n: Math.ceil(inS) });
            else if (inS > -1.5) sub = G.t('roy.spotNow');
          }
          const dev = G.input.device;
          this.hud.msg(dev === 'gamepad' ? RY.padT('roy.jumpHintPad') : G.t(dev === 'desktop' ? 'roy.jumpHintKb' : 'roy.jumpHint'), sub);
          this.hud.padCursor(dt);           // controller: left stick + X mark a landing spot on the airship map
          if ((G.input.jumpP && !G.UI.anyOpen() && ship.t > 0.8) || ship.k >= ship.autoK) this.playerJump();
        }
        for (const e of this.rangers) if (!e.isPlayer && e.state === 'ship' && (ship.k >= e.jumpK || ship.k >= ship.autoK)) this.botJump(e);
        if (ship.k >= Math.min(1, ship.autoK + 0.05) && pe.state !== 'ship') this.startPlay();
      }
      // ---- skydivers
      for (const e of this.rangers) {
        if (e.state !== 'sky') continue;
        const landed = e.isPlayer ? RY.Sky.updatePlayer(this, e, dt) : RY.Sky.updateBot(this, e, dt);
        if (landed) this.land(e);
      }
      if (pe.state === 'ship') pl.pos.copy(ship.pos);
      if (pe.state === 'sky') {
        pl.pos.copy(pe.sky.pos);
        RY.Sky.camera(this, pe, dt);
        // steering hint, plus the distance to a marked landing spot (rounded to 10 m: the line repaints rarely)
        const sp = this.mapPing ? Math.round(Math.hypot(this.mapPing.x - pe.sky.pos.x, this.mapPing.z - pe.sky.pos.z) / 10) * 10 : -1;
        const hint = this.t < 40 && !pe.sky.flare ? G.t(G.input.device === 'desktop' ? 'roy.skydiveKb' : 'roy.skydive') : null;
        const spot = sp >= 0 ? G.t('roy.spotDist', { n: sp }) : null;
        this.hud.msg(hint || spot, hint ? spot : null, true);
        if (this.wind) this.wind.set({ vol: pe.sky.flare ? 0.25 : 0.5 + Math.min(0.5, -pe.sky.vel.y / 50), pitch: 0.8 + Math.min(0.6, -pe.sky.vel.y / 40) });
        G.R.showViewmodel = false;
      } else if (pe.state === 'ship') G.R.showViewmodel = false;
      else if (pe.state === 'redeploy') {
        this.redeployT -= dt;
        if (this.redeployT <= 0) this.redeploy();
      } else if (pe.state === 'ground' && this.phase !== 'end') this.hud.msg(null);
      // ---- systems
      this.ring.update(dt);
      this.loot.update(dt);
      this.map.update(dt, w.time);
      if (pe.state === 'ground' && pl.alive) {
        // launch pads
        if (pl.grounded) for (const p of this.map.pads) {
          if (Math.abs(pl.pos.x - p.x) < 1.25 && Math.abs(pl.pos.z - p.z) < 1.25 && Math.abs(pl.pos.y - p.y) < 0.8) {
            pl.vel.set(p.vx, p.vy, p.vz); pl.grounded = false; pl.jumps = 1; pl.coyote = 0; pl.fovKick = 14;
            w.fx.ring(pl.pos, 1.8, 0x5cffe1, 0.4, pl.pos.y + 0.2);
            if (G.Audio) G.Audio.sfx('boost');
            break;
          }
        }
        if (G.input.gadgetP && !G.UI.anyOpen()) { if (pe.healing) this.cancelHeal(pe, true); else this.startHeal(pe, false); }
        // auto-heal when out of combat
        if (!pe.healing && w.time - pe.lastHitT > 5 && w.time - (pl.lastFireT || -9) > 5 && w.time - (pe.autoHealT || -99) > 7 && !G.input.fire && RY.Inv.smartPick(pe.inv, pl)) {
          pe.autoHealT = w.time; this.startHeal(pe, true);
        }
        if (G.input.mapP) this.toggleMap();
      }
      this.playerLoot();
      this.playerThrow(dt);
      for (const e of this.rangers) this.updateHeal(e, dt);
      this.doPing();
      this.updatePings(dt);
      // ---- bots (time-sliced thinking, ~1/4 per frame)
      let budget = 4;
      for (let k = 0; k < this.rangers.length; k++) {
        const e = this.rangers[(this.thinkRR + k) % this.rangers.length];
        if (e.isPlayer || !e.alive || e.state !== 'ground') continue;
        const a = e.actor;
        if (!a.gbot) {
          e.thinkT -= dt;
          if (e.thinkT <= 0 && budget > 0) { e.thinkT = 0.2 + Math.random() * 0.1; budget--; G.safe('roy think', () => RY.Bots.think(this, e)); }
        } else if (a.grounded) {
          for (const p of this.map.pads) if (Math.abs(a.pos.x - p.x) < 1.25 && Math.abs(a.pos.z - p.z) < 1.25 && Math.abs(a.pos.y - p.y) < 0.8) { a.vel.set(p.vx, p.vy, p.vz); a.grounded = false; w.fx.ring(a.pos, 1.6, 0x5cffe1, 0.4, a.pos.y + 0.2); break; }
        }
        RY.Bots.reach(this, e);
      }
      this.thinkRR = ((this.thinkRR || 0) + 1) % this.rangers.length;
      // ---- player spotting (LOS, 2 bots per frame)
      if (pe.state === 'ground' && pl.alive) {
        const eye = pl.eyePos(_v), fw = pl.forward(_f);
        for (let k = 0; k < 2; k++) {
          this.spotI = (this.spotI + 1) % this.rangers.length;
          const e = this.rangers[this.spotI];
          if (e.isPlayer || !e.alive || e.state !== 'ground') continue;
          const a = e.actor;
          const dx = a.pos.x - eye.x, dz = a.pos.z - eye.z, d = Math.hypot(dx, dz);
          if (d > 75) continue;
          if (d > 8 && (dx * fw.x + dz * fw.z) / d < 0.2) continue;
          _w.set(a.pos.x, a.pos.y + 1.3, a.pos.z);
          if (w.phys.los(eye, _w, false)) e.spotT = w.time;
        }
      }
      // ---- storm feedback
      if (this.zone) {
        let vol = 0;
        if (pe.state === 'ground' && pl.alive && this.ring.phase !== 'idle') {
          const dOut = this.ring.distOutside(pl.pos.x, pl.pos.z);
          vol = dOut > 0 ? 1 : U.clamp(1 + dOut / 14, 0, 1) * 0.55;
        }
        this.zone.set({ vol: vol * 0.9 });
      }
      this.updateFog(dt);
      // supply pod markers fade from the HUD 25 s after landing (the beam and minimap dot stay)
      for (const d of this.ring.drops) if (d.landT != null && !d.markOff && this.world.time - d.landT > 25) { d.markOff = true; G.HUD.removeMarker('roy-drop-' + this.ring.drops.indexOf(d)); }
      // ---- phase timers
      if (this.phase === 'spectate') { this.specT -= dt; if (this.specT <= 0) this.finish(false); }
      if (this.phase === 'champion') { this.champT -= dt; if (this.champT <= 0) this.finish(true); }
      this.hud.setButtons(pe.state === 'ground' && pl.alive ? 'play' : pe.state === 'ship' ? 'ship' : pe.state === 'sky' ? 'sky' : 'out');
      this.hud.update(dt);
    }
    updateFog(dt) {
      const w = this.world, cam = G.R.camera, fog = w.scene.fog;
      if (!fog) return;
      const hAbove = cam.position.y - Math.max(0, this.map.hf(cam.position.x, cam.position.z));
      const k = U.clamp((hAbove - 12) / 55, 0, 1);
      const groundFar = Math.min(300, Math.max(200, G.R.q().draw + 40));
      const tn = U.lerp(70, 220, k), tf = U.lerp(groundFar, 720, k);
      fog.near = U.damp(fog.near, tn, 3, dt); fog.far = U.damp(fog.far, tf, 3, dt);
      const pe = this.player;
      const out = pe.state === 'ground' && pe.actor.alive && this.ring.phase !== 'idle' && !this.ring.contains(pe.actor.pos.x, pe.actor.pos.z);
      this._stormK = U.damp(this._stormK || 0, out ? 1 : 0, 3, dt);
      fog.color.copy(this.fogBase.color).lerp(this.fogBase.storm, this._stormK * 0.6);
      if (out) { fog.far = Math.min(fog.far, 140); fog.near = Math.min(fog.near, 25); }
    }
    late(dt) {
      const pe = this.player, cam = G.R.camera;
      if (this.phase === 'spectate') {
        const t = this.specTarget && this.specTarget.alive ? this.specTarget : null;
        if (t) this.specPos.copy(t.pos);
        RY.spectateCamera(this, t, this.specPos, dt);
        G.R.showViewmodel = false;
        return;
      }
      if (pe.state === 'ground' && pe.actor.alive && this._stormK > 0.05 && !G.Save.set.reducedMotion) {
        cam.rotation.z += Math.sin(this.world.time * 2.7) * 0.022 * this._stormK;
        cam.position.y += Math.sin(this.world.time * 4.1) * 0.03 * this._stormK;
      }
    }
    // ------------------------------------------------------------------ results
    finish(win) {
      if (this.done) return;
      this.done = true;
      this.phase = 'end';
      const pe = this.player;
      const place = win ? 1 : (pe.place || this.aliveCount() + 1);
      const survived = pe.koT != null ? pe.koT : this.t;
      const stars = win ? 3 : place <= 3 ? 2 : place <= 8 ? 1 : 0;
      const stats = [
        { key: 'roy.stat.place', value: G.t('roy.placeOf', { n: place }) },
        { key: 'roy.stat.pops', value: pe.pops },
        { key: 'roy.stat.damage', value: Math.round(pe.dmg) },
        { key: 'roy.stat.time', value: U.fmtClock(survived) },
      ];
      const result = { mode: 'royale', win, place, pops: pe.pops, kills: pe.pops, damage: Math.round(pe.dmg), time: Math.round(survived), heals: pe.heals, difficulty: this.diff, stars, stats };
      let lines = null, rewards = null;
      if (G.Progress && G.Progress.finish) {
        const r = G.safe('royale rewards', () => G.Progress.finish('royale', result));
        if (r) { rewards = r.rewards; lines = r.lines; }
      }
      if (!rewards) {
        const mult = RY.REWARD_MULT[this.diff] || 1;
        rewards = { clinks: Math.round((100 + 40 * (17 - place) + 20 * pe.pops + (win ? 500 : 0)) * mult), xp: Math.round((50 + 15 * (17 - place)) * mult) };
        if (win) rewards.chest = 'gold';
        if (G.Progress && G.Progress.grantRewards) lines = G.safe('grant', () => G.Progress.grantRewards(rewards)) || null;
      }
      result.rewards = rewards;
      // remember the champion name for the next intro card
      const champName = win ? G.t('roy.you') : (this.winner ? this.winner.name : null);
      if (champName && G.Save.data) { const p = G.Save.prof; p.royale = Object.assign({}, p.royale || {}, { lastChamp: champName }); G.Save.save(); }
      G.bus.emit('mode-result', result);
      const retry = () => G.Game.go('royale', { difficulty: this.diff });
      const tip = win ? null : 'roy.tip.' + Math.floor(Math.random() * 5);
      if (G.UI.defs.results) {
        G.UI.open('results', { mode: 'royale', win, stars, place, title: win ? G.t('roy.res.win') : G.t('roy.res.lose', { n: place }), stats, rewards: lines || rewards, onRetry: retry, tip });
      } else {
        const rl = [];
        if (rewards.clinks) rl.push({ text: G.t('roy.rw.clinks', { n: rewards.clinks }) });
        if (rewards.xp) rl.push({ text: G.t('roy.rw.xp', { n: rewards.xp }) });
        if (rewards.chest) rl.push({ text: G.t('roy.rw.chest'), icon: RY.ICON.loot });
        G.UI.open('royale-results', { win, place, stars, stats, rewardList: rl, tip, difficulty: this.diff });
      }
    }
    dispose() {
      for (const [ev, fn] of this.listeners) G.bus.off(ev, fn);
      if (this._mmEl) { this._mmEl.style.pointerEvents = ''; this._mmEl.removeEventListener('pointerdown', this._mmTap); }
      if (this.zone) this.zone.stop(0.2);
      if (this.wind) this.wind.stop(0.2);
      if (this.hud) this.hud.dispose();
      for (const e of this.rangers) {
        if (e.isPlayer) continue;
        if (e.actor && this.world.actors.indexOf(e.actor) < 0) G.safe('bot dispose', () => e.actor.dispose());
      }
      if (this.loot) this.loot.dispose();
      if (this.airship) this.airship.dispose();
      const pl = this.player && this.player.actor;
      if (pl) { pl.speedMod = 1; pl.hideVm = false; }
      if (RY.debug === this) RY.debug = null;
    }
  }
  RY.Match = Match;
  // Test/debug helper: advance the running match by `sec` seconds of simulation without rendering.
  RY.sim = function (sec, dt) {
    dt = dt || 0.05;
    const mode = G.Game.mode, world = G.Game.world;
    if (!mode || !world || !RY.match) return 0;
    let n = Math.ceil(sec / dt);
    const inp = G.input;
    for (let i = 0; i < n; i++) {
      G.time.dt = dt; G.time.elapsed += dt;
      mode.update(dt); world.update(dt); if (mode.lateUpdate) mode.lateUpdate(dt);
      if ((i & 7) === 0) G.HUD.frame(dt);
      inp.jumpP = inp.pingP = inp.interactP = inp.gadgetP = inp.reloadP = inp.mapP = inp.swapP = false;
      if (RY.match && RY.match.done) break;
    }
    return n * dt;
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 25b_royale_match.js]', e); }
// ---- 25b_royale_ring.js
try { (function () {
// 25b_royale_ring.js — the storm ring (GDD §11d rounds), its animated wall, ring damage ticks and
// supply drops. RY.Ring(match): start(), update(dt), contains(x, z, margin), timeLeft(),
// distOutside(x, z), cur/next circles {x, z, r}, round, phase 'idle'|'wait'|'close'|'done', dps.
(function (G) {
  'use strict';
  const RY = G.Royale = G.Royale || {};
  const U = G.util;
  const V3 = THREE.Vector3;
  const TAU = Math.PI * 2;
  const _v = new V3();

  function wallMat() {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uRep: { value: 40 }, uColor: { value: new THREE.Color(0x7af0ff) }, uDeep: { value: new THREE.Color(0x3d7bff) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vWP; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: [
        'uniform float uTime, uRep; uniform vec3 uColor, uDeep; varying vec2 vUv; varying vec3 vN; varying vec3 vWP;',
        'void main(){',
        '  float x = vUv.x * uRep; float y = vWP.y;',
        '  float s1 = 0.5 + 0.5 * sin(x * 6.2831 + y * 0.35 - uTime * 2.2);',
        '  float s2 = 0.5 + 0.5 * sin(x * 2.1 - y * 0.12 + uTime * 0.9);',
        '  float hex = smoothstep(0.82, 1.0, s1) * 0.6 + s2 * 0.25;',
        '  vec3 v = normalize(cameraPosition - vWP);',
        '  float fres = pow(1.0 - abs(dot(v, normalize(vN))), 1.6);',
        '  float fade = smoothstep(150.0, 40.0, y) * smoothstep(-25.0, -5.0, y);',
        '  float base = smoothstep(14.0, 0.0, y) * 0.35;',
        '  float a = (0.12 + hex * 0.3 + fres * 0.3 + base) * fade;',
        '  float dc = length(cameraPosition.xz - vWP.xz);',
        '  a *= mix(0.6, 1.0, smoothstep(3.0, 14.0, dc)) * mix(1.0, 0.22, smoothstep(35.0, 150.0, dc));',
        '  vec3 col = mix(uDeep, uColor, 0.45 + 0.55 * s2) * a;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n'),
    });
  }

  class Ring {
    constructor(match) {
      this.m = match; this.world = match.world;
      const k = match.timeK;
      this.rounds = RY.RING.map(r => ({ wait: r.wait * k, close: r.close * k, to: r.to, dps: r.dps }));
      this.phase = 'idle'; this.round = 0; this.t = 0;
      this.cur = { x: 0, z: 0, r: 182 };
      this.from = { x: 0, z: 0, r: 182 };
      this.next = { x: 0, z: 0, r: 182 };
      this.dps = 0;
      this.tickT = 0;
      this.drops = [];
      const geo = new THREE.CylinderGeometry(1, 1, 1, 128, 1, true); geo.translate(0, 0.5, 0);
      this.mat = wallMat();
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; this.mesh.name = 'roy-ring';
      this.world.add(this.mesh);
      this._place();
    }
    start() {
      this.phase = 'wait'; this.round = 0; this.t = 0;
      this.next = this._pick(this.cur, RY.R0 * this.rounds[0].to);
      this.dps = this.rounds[0].dps;
      this._scheduleDrops(0);
      this.m.onRing && this.m.onRing('start', this);
    }
    _pick(cur, r) {
      const map = this.m.map, rnd = this.m.rnd;
      const maxOff = Math.max(0, (cur.r - r) * 0.82);
      let best = null, bs = -Infinity;
      for (let i = 0; i < 14; i++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * maxOff;
        const x = cur.x + Math.cos(a) * d, z = cur.z + Math.sin(a) * d;
        // score: land coverage under the new circle + mild pull toward the island center
        let land = 0, n = 0;
        for (let j = 0; j < 9; j++) {
          const aa = (j / 9) * TAU, rr = j === 0 ? 0 : r * 0.7;
          if (map.hf(x + Math.cos(aa) * rr, z + Math.sin(aa) * rr) > 1) land++;
          n++;
        }
        const s = land / n - Math.hypot(x, z) / 600 + rnd() * 0.15 + (map.hf(x, z) > 1.2 ? 0.4 : -1);
        if (s > bs) { bs = s; best = { x, z, r }; }
      }
      return best;
    }
    contains(x, z, margin) { const dx = x - this.cur.x, dz = z - this.cur.z; const r = this.cur.r - (margin || 0); return dx * dx + dz * dz <= r * r; }
    inNext(x, z, margin) { const dx = x - this.next.x, dz = z - this.next.z; const r = Math.max(0, this.next.r - (margin || 0)); return dx * dx + dz * dz <= r * r; }
    distOutside(x, z) { return Math.hypot(x - this.cur.x, z - this.cur.z) - this.cur.r; }
    distToNext(x, z) { return Math.max(0, Math.hypot(x - this.next.x, z - this.next.z) - this.next.r); }
    timeLeft() { const R = this.rounds[this.round]; if (!R) return 0; return this.phase === 'wait' ? R.wait - this.t : this.phase === 'close' ? R.close - this.t : 0; }
    // A safe target point inside the next circle (for bots), deterministic per seed value.
    // Only open, walkable ground counts (not inside a building or on a roof), checked on the bots' navgrid.
    safePoint(seed, margin) {
      const c = this.phase === 'done' ? this.cur : this.next;
      const rr = Math.max(0, c.r - (margin || 6));
      const nav = G.Bot && G.Bot.nav ? G.Bot.nav(this.world) : null;
      for (let i = 0; i < 6; i++) {
        const s = seed + i * 7.31;
        const a = (s * 2.399) % TAU, d = rr * (0.25 + ((s * 0.618) % 1) * 0.7) * (1 - i * 0.12);
        const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (this.m.map.hf(x, z) <= 1.2) continue;
        if (nav) { const reg = nav.region(x, z, this.m.map.hf(x, z)); if (!reg || reg.size < 150) continue; }
        return _v.set(x, 0, z);
      }
      return _v.set(c.x, 0, c.z);
    }
    _place() {
      const c = this.cur, r = Math.max(0.5, c.r);
      this.mesh.visible = this.phase !== 'idle';
      this.mesh.position.set(c.x, -25, c.z);
      this.mesh.scale.set(r, 200, r);
      this.mat.uniforms.uRep.value = Math.max(2, Math.round((r * TAU) / 9));
      this.mat.uniforms.uTime.value = this.world.time;
    }
    update(dt) {
      if (this.phase === 'idle') { this._place(); return; }
      this.t += dt;
      const R = this.rounds[this.round];
      if (this.phase === 'wait') {
        const left = R.wait - this.t;
        if (this._warned !== this.round && left <= 15 * Math.min(1, this.m.timeK * 2)) { this._warned = this.round; this.m.onRing && this.m.onRing('warn', this); }
        if (left <= 0) { this.phase = 'close'; this.t = 0; this.from = Object.assign({}, this.cur); this.m.onRing && this.m.onRing('close', this); }
      } else if (this.phase === 'close') {
        const k = U.clamp(this.t / R.close, 0, 1);
        this.cur.x = U.lerp(this.from.x, this.next.x, k); this.cur.z = U.lerp(this.from.z, this.next.z, k); this.cur.r = U.lerp(this.from.r, this.next.r, k);
        if (k >= 1) {
          this.round++;
          if (this.round >= this.rounds.length) { this.phase = 'done'; this.round = this.rounds.length - 1; this.cur.r = Math.max(0, this.next.r); this.m.onRing && this.m.onRing('done', this); }
          else {
            this.phase = 'wait'; this.t = 0;
            this.dps = this.rounds[this.round].dps;
            this.next = this._pick(this.cur, RY.R0 * this.rounds[this.round].to);
            this._scheduleDrops(this.round);
            this.m.onRing && this.m.onRing('round', this);
          }
        }
      }
      this._place();
      // damage ticks (1 s) to every ranger outside the current circle
      this.tickT += dt;
      if (this.tickT >= 1) {
        this.tickT -= 1;
        for (const e of this.m.rangers) {
          if (!e.alive || e.state !== 'ground') continue;
          const a = e.actor;
          if (!a.alive || this.contains(a.pos.x, a.pos.z)) continue;
          this.world.damage(a, this.dps, { type: 'ring', silent: true, friendly: true });
          if (a.isPlayer && G.HUD) G.HUD.hurt(0.05);
        }
      }
      this._updateDrops(dt);
    }
    // ---- supply drops: 2 in round 1, then 1 in rounds 2 and 3 (GDD).
    _scheduleDrops(round) {
      const n = round === 0 ? 2 : round <= 2 ? 1 : 0;
      const k = this.m.timeK;
      for (let i = 0; i < n; i++) {
        const c = this.next, map = this.m.map;
        let p = null;
        for (let j = 0; j < 40 && !p; j++) {
          const a = this.m.rnd() * TAU, d = Math.sqrt(this.m.rnd()) * Math.max(4, c.r * 0.7);
          const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
          if (map.hf(x, z) > 1.4 && map.freeAt(x, z, 1.4)) p = new V3(x, map.hf(x, z), z);
        }
        if (!p) continue;
        p.y = this.world.phys.groundAt(p.x, p.z, 0.8, p.y + 1.5);
        this.drops.push({ pos: p, announceT: (round === 0 ? 8 + i * 6 : 5) * k, fallT: 12 * Math.min(1, k * 1.5), t: 0, state: 'pending', round, mesh: null, beam: null });
      }
    }
    _updateDrops(dt) {
      for (const d of this.drops) {
        if (d.state === 'done') continue;
        d.t += dt;
        if (d.state === 'pending' && d.t >= d.announceT) {
          d.state = 'announced'; d.t = 0;
          this._dropVisual(d);
          this.m.onDrop && this.m.onDrop('announce', d);
        } else if (d.state === 'announced') {
          const lead = 30 * this.m.timeK - d.fallT;
          if (d.t >= Math.max(0, lead)) { d.state = 'falling'; d.t = 0; d.pod.visible = true; if (G.Audio) G.Audio.sfxAt('missile', d.pos, { pitch: 0.6 }); }
        } else if (d.state === 'falling') {
          const k = U.clamp(d.t / d.fallT, 0, 1);
          d.pod.position.set(d.pos.x, d.pos.y + (1 - k) * 130, d.pos.z);
          d.pod.rotation.y += dt * 0.8;
          if (Math.random() < 0.3) this.world.fx.spawn(_v.set(d.pos.x, d.pod.position.y + 4, d.pos.z), _v.clone().set(0, 2, 0), 0xfff1dc, 0.6, 0.8, { grav: 0, normal: true, alpha: 0.6 });
          if (k >= 1) {
            d.state = 'landed';
            d.pod.position.set(d.pos.x, d.pos.y, d.pos.z);
            this.world.fx.explosion(_v.copy(d.pos).setY(d.pos.y + 0.5), 2.5, 0xfff1dc);
            this.world.fx.shake(0.2);
            this.m.onDrop && this.m.onDrop('landed', d);
          }
        }
        if (d.beam) d.beam.material.opacity = 0.22 + 0.08 * Math.sin(this.world.time * 3);
        if (d.state === 'landed' && d.opened) { d.state = 'done'; if (d.beam) d.beam.visible = false; }
      }
    }
    _dropVisual(d) {
      const P = G.Geo.P, C = G.Geo.colorize, X = G.Geo.xf;
      const g = G.Geo.merge([
        C(X(P.rbox(1.6, 1.3, 1.6, 0.3), 0, 0.65, 0), (x, y) => (y > 0.9 ? 0xffc21a : y > 0.35 ? 0xfff1dc : 0xffc21a)),
        C(X(P.rbox(1.7, 0.16, 1.7, 0.06), 0, 1.36, 0), 0x1f2a5a),
        C(X(P.cyl(0.08, 0.08, 3.4, 6), 0, 3.0, 0), 0xfff1dc),
        C(X(G.Geo.lathe([[0, -0.2], [1.8, 0.2], [2.4, 1.0], [2.0, 1.8], [0, 2.2]], 14), 0, 4.4, 0), (x, y, z) => (Math.sin(Math.atan2(z, x) * 4) > 0 ? 0xff6b8b : 0xfffaf2)),
      ]);
      d.pod = new THREE.Mesh(g, G.M.vc({ rimStr: 0.4, spec: 0.5 }));
      d.pod.visible = false;
      this.world.add(d.pod);
      const bg = new THREE.CylinderGeometry(0.6, 0.9, 90, 12, 1, true); bg.translate(0, 45, 0);
      d.beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      d.beam.position.copy(d.pos); d.beam.renderOrder = 7;
      this.world.add(d.beam);
    }
  }
  RY.Ring = Ring;
})(window.G);

}).call(window); } catch (e) { console.error('[module 25b_royale_ring.js]', e); }
// ---- 26_training.js
try { (function () {
// 26_training.js — Training Range (mode 'training', GDD §11f) + first-time tutorial / onboarding (GDD §17).
//
// PUBLIC API (G.Tutorial)
//   needed()                 true until the tutorial was completed or skipped (profile.tutorial.done,
//                            profile.flags.tutorialDone / tutorialSkipped).
//   complete() / skip()      mark it done (G.Progress.completeTutorial() grants the gauntlet skin);
//                            bus 'tutorial-done'(skipped:boolean).
//   start(params)            G.Game.go('training', {tutorial:true, ...params}).
//   hint(key, opts) -> bool  Beepo speech bubble with G.t(key, opts.params). Shown once per profile
//                            (seen keys live in profile.tutorial.tips) unless opts.once === false / force.
//                            opts {dur (s), expr 'happy'|'idle'|'wow'|'wink', face 'beepo'|'coach', params,
//                            sound:false}. say(key, opts) = hint without the once-dedupe. hideHint().
//   ghostThumb(target, opts) -> {remove()}  target 'joystick' | 'look' | touch button id ('fire', 'jump',
//                            'slide', 'ability', 'gadget', 'interact', 'reload', 'swap', 'pause') | Element.
//                            Touch: animated ghost thumb (opts.mode 'tap'|'double'|'push'|'swipe').
//                            Desktop: animated key / mouse chips (opts.sprint adds Shift). opts.dur auto-removes.
//   clearGhosts(), pulse(btnId, sec)  glowing pulse on a touch button (and on desktop key chips).
// MODE 'training'  G.Game.go('training', params)
//   {tutorial:true}  step-by-step tutorial (also automatic when needed() and arriving from the title).
//   {station:'gallery'|'course'|'popup'|'pen'|'kick'}  spawn at a station.   {trial:'hop'} = course.
//   {tryWeapon:id, returnTo}  30 s "Try It" drill at the gallery (GDD §11f.1), then back to returnTo/hub.
// SCREENS  'training-gate' (Coach Ping menu; the hub building opens it), 'train-rack', 'train-result',
//   'tut-reward'.
// Records: profile.records.trials.hop {best, medal, ghost}, records.popup; results go through
//   G.Progress.finish('training', r) + bus 'mode-result' {mode:'training', trial:'hop'|'popup', medal, time|score}.
// Practice actors use kind 'target'|'balloon'|'dummy'|'crate' + noCount (no pops/quests); weapon XP is paused
//   (G.Progress.autoWeaponXP = false) while in the range so practice can't be farmed.
// Kid-proofing inside the range only: airborne auto-mantle shim (core's auto-mantle never fires), slow slides
//   near the slide gate still slide and a blocked player crouches under it, the tutorial camera eases toward
//   each new goal, wall-kick is off during the tutorial's wall step.
(function (G) {
  'use strict';
  const U = G.util, V3 = THREE.Vector3, PI = Math.PI, TAU = PI * 2;
  const el = (...a) => G.UI.el(...a);
  const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3();

  // ================================================================== strings
  G.i18n.add('en', {
    'train.title': 'Training Range', 'train.coach': 'Coach Ping', 'train.talk': 'Talk to Coach Ping',
    'train.rack': 'Weapon rack', 'train.exit': 'Back to town', 'train.exitTitle': 'Back to title',
    'train.enter': 'Enter the Range', 'train.enterD': 'Targets, bots, crates and a wall-kick corner. Free play!',
    'train.replay': 'Replay tutorial', 'train.replayD': 'Learn the moves again with Beepo.', 'train.replayQ': 'Play the tutorial again from the start?',
    'train.popup': 'Pop-Up Challenge', 'train.popupD': '60 seconds! Far targets score more. Don\'t pop the cardboard Puffles!',
    'train.popupStart': 'Start challenge', 'train.trial.hop': 'Hop Hop Hooray', 'train.trialD': 'Jump, slide, climb and dash to the finish. Beat the Gold time!',
    'train.trialGo': 'Go to the start', 'train.trialHint': 'Cross the line to start!', 'train.go': 'GO!', 'train.cancel': 'Run cancelled',
    'train.cp': 'Checkpoint!', 'train.finish': 'Finish!', 'train.newBest': 'New best!', 'train.best': 'Best {t}', 'train.goldT': 'Gold {t}',
    'train.noBest': 'No record yet', 'train.medal.0': 'No medal', 'train.medal.1': 'Bronze', 'train.medal.2': 'Silver', 'train.medal.3': 'Gold',
    'train.medal.4': 'Platinum', 'train.medalGet': '{medal} medal!', 'train.time': 'Time', 'train.score': 'Score', 'train.pops': 'Pops',
    'train.retry': 'Try again', 'train.done': 'OK', 'train.decoy': 'Oops, a friend! −100', 'train.weak': 'Weak spot!',
    'train.tryIt': 'Try It: {name}', 'train.tryEnd': 'Nice shooting!', 'train.keep': 'Keep practicing', 'train.tryBtn': 'Try It (30s)',
    'train.rackTitle': 'Weapon Rack', 'train.rackHint': 'Tap a weapon to hold it. Ammo is free here!', 'train.holding': 'Holding',
    'train.locked': 'Find it in town!', 'train.equip': '{name} ready!', 'train.breather': 'Take a breather!',
    'train.splash': 'Splash! Back to solid ground.', 'train.kickStar': 'Wall-kick star! Super move!', 'train.wallKick': 'Wall-kick!',
    'train.lines': 'Coach Ping', 'train.gallery': 'Target Gallery', 'train.course': 'Hop Hop Hooray', 'train.pen': 'Bonk-Bot Pen',
    'train.kick': 'Kick Corner', 'train.crates': 'Crate Corner', 'train.open': 'Open',
    'train.coach.hi1': 'Tweeet! Welcome to the Range, Ranger!', 'train.coach.hi2': 'Practice makes POP-fect! Tweet tweet!',
    'train.coach.hi3': 'Every great Ranger warms up right here!', 'train.coach.tip': 'Beat my Gold time on Hop Hop Hooray. Tweeet!',
    'beepo.hi': 'Hi {name}! Let\'s warm up!', 'beepo.move': 'Walk over to the glowing ring!', 'beepo.look': 'Balloon-bots! Turn around and look!',
    'beepo.shoot': 'Pop them! Their clinks fly right to you!', 'beepo.jump': 'A gap! Jump over it!',
    'beepo.double': 'Too high! Jump, then jump again in the air!', 'beepo.slide': 'Run fast, then slide under the gate!',
    'beepo.mantle': 'Jump at the wall, then jump again to climb!', 'beepo.dash': 'Too far to jump! Run to the edge and DASH!',
    'beepo.dashNow': 'Now try a DASH!', 'beepo.ramp': 'Wheee! Slide down the ramp!', 'beepo.crate': 'Crates! Pop them open!',
    'beepo.collect': 'Walk close and the clinks zoom to you!', 'beepo.bot': 'A Gizmob bot! It\'s a gentle one. Pop it!',
    'beepo.chest': 'A treasure chest! Open it!', 'beepo.gate': 'Fizzport is this way! Let\'s go!', 'beepo.try1': 'You can do it!',
    'beepo.try2': 'Look for the glowing button!', 'beepo.try3': 'Almost! Give it another try!', 'beepo.splash': 'Splash! Let\'s try that again!',
    'beepo.help': 'Here, I\'ll give you a little boost!', 'beepo.tipGallery': 'Pop targets here! Far ones are trickier.',
    'beepo.tipCourse': 'Cross the start line to start the clock!', 'beepo.tipPen': 'These bots don\'t fight back. Aim for the glowing heads!',
    'beepo.tipSpar': 'That one fights back... gently!', 'beepo.tipRack': 'Try every weapon you own at the rack!',
    'beepo.tipKick': 'Wall-kick: jump into the wall, then jump again!', 'beepo.tipPopup': 'Press the big red button for the Pop-Up Challenge!',
    'tut.move': 'Walk to the ring', 'tut.look': 'Look at the balloons', 'tut.shoot': 'Pop 3 balloon-bots', 'tut.jump': 'Jump the gap',
    'tut.double': 'Jump twice!', 'tut.slide': 'Run, then slide!', 'tut.mantle': 'Jump up the wall', 'tut.dash': 'Dash across!',
    'tut.crate': 'Break the crates', 'tut.collect': 'Grab the clinks', 'tut.bot': 'Pop the bot!', 'tut.chest': 'Open the chest',
    'tut.gate': 'Go to Fizzport!', 'tut.skip': 'Skip', 'tut.skipTitle': 'Skip the tutorial?', 'tut.skipQ': 'You can replay it any time at the Training Range.',
    'tut.skipYes': 'Skip', 'tut.skipNo': 'Keep playing', 'tut.good1': 'Nice!', 'tut.good2': 'Great!', 'tut.good3': 'Awesome!', 'tut.good4': 'Super!',
    'tut.good5': 'Wow!', 'tut.ready': 'You\'re ready!', 'tut.readySub': 'A gift from the Reef Rangers!', 'tut.skin': 'Ranger Gauntlet',
    'tut.clinks': '{n} Clinks', 'tut.parts': 'First parts', 'tut.go': 'Let\'s go!', 'tut.welcome': 'Welcome to Fizzport!',
    'tut.welcomeSub': 'Your adventure starts now!', 'tut.open': 'Open the chest',
    'tut.key.space': 'Space', 'tut.key.shift': 'Shift', 'tut.key.click': 'Click', 'tut.key.mouse': 'Mouse',
  });
  G.i18n.add('ja', {
    'train.title': 'トレーニングじょう', 'train.coach': 'ピンコーチ', 'train.talk': 'ピンコーチと はなす',
    'train.rack': 'ぶきラック', 'train.exit': 'タウンへ もどる', 'train.exitTitle': 'タイトルへ もどる',
    'train.enter': 'トレーニングじょうへ', 'train.enterD': 'まと、ボット、クレート、カベキックコーナー。じゆうに れんしゅう！',
    'train.replay': 'チュートリアル', 'train.replayD': 'ビーポと もう一度 うごきを れんしゅう。', 'train.replayQ': 'チュートリアルを さいしょから あそぶ？',
    'train.popup': 'ポップアップ・チャレンジ', 'train.popupD': '60びょう しょうぶ！ とおくの まとほど こうとくてん。ダンボールの パフルは ポップしちゃダメ！',
    'train.popupStart': 'チャレンジ スタート', 'train.trial.hop': 'ホップ・ホップ・フーレイ', 'train.trialD': 'ジャンプ、スライド、よじのぼり、ダッシュで ゴールへ！ ゴールドタイムを めざそう！',
    'train.trialGo': 'スタートへ いく', 'train.trialHint': 'ラインを こえて スタート！', 'train.go': 'GO！', 'train.cancel': 'タイムアタック ちゅうし',
    'train.cp': 'チェックポイント！', 'train.finish': 'ゴール！', 'train.newBest': 'じこベスト こうしん！', 'train.best': 'ベスト {t}', 'train.goldT': 'ゴールド {t}',
    'train.noBest': 'まだ きろくなし', 'train.medal.0': 'メダルなし', 'train.medal.1': 'ブロンズ', 'train.medal.2': 'シルバー', 'train.medal.3': 'ゴールド',
    'train.medal.4': 'プラチナ', 'train.medalGet': '{medal}メダル！', 'train.time': 'タイム', 'train.score': 'スコア', 'train.pops': 'ポップ',
    'train.retry': 'もう一回', 'train.done': 'OK', 'train.decoy': 'あっ、おともだち！ −100', 'train.weak': 'じゃくてん！',
    'train.tryIt': 'ためしうち：{name}', 'train.tryEnd': 'ナイスショット！', 'train.keep': 'れんしゅうを つづける', 'train.tryBtn': 'ためしうち（30びょう）',
    'train.rackTitle': 'ぶきラック', 'train.rackHint': 'ぶきを タップして もってみよう。ここでは たまは うちほうだい！', 'train.holding': 'もってる',
    'train.locked': 'タウンで 手に入れよう！', 'train.equip': '{name} じゅんびOK！', 'train.breather': 'ちょっと ひとやすみ！',
    'train.splash': 'ポチャン！ じめんに もどったよ。', 'train.kickStar': 'カベキック スター！ すごわざ！', 'train.wallKick': 'カベキック！',
    'train.lines': 'ピンコーチ', 'train.gallery': 'まとあて ギャラリー', 'train.course': 'ホップ・ホップ・フーレイ', 'train.pen': 'ボンクボット ひろば',
    'train.kick': 'キック コーナー', 'train.crates': 'クレート コーナー', 'train.open': 'あける',
    'train.coach.hi1': 'ピピーッ！ トレーニングじょうへ ようこそ、レンジャー！', 'train.coach.hi2': 'れんしゅうすれば ポップも バッチリ！ ピピッ！',
    'train.coach.hi3': 'すごい レンジャーは みんな ここで ウォーミングアップ！', 'train.coach.tip': 'ホップ・ホップ・フーレイで ゴールドタイムを ねらえ！ ピピーッ！',
    'beepo.hi': 'やあ {name}！ ウォーミングアップ しよう！', 'beepo.move': 'ひかる わっかまで あるいてみて！', 'beepo.look': 'ふうせんボットだ！ ふりむいて 見てみて！',
    'beepo.shoot': 'ポップしよう！ クリンクが とんでくるよ！', 'beepo.jump': 'すきまだ！ ジャンプで とびこえよう！',
    'beepo.double': 'たかい！ ジャンプして、空中で もう一回！', 'beepo.slide': 'はやく はしって、ゲートの 下を スライディング！',
    'beepo.mantle': 'カベに ジャンプ、もう一回 ジャンプで よじのぼろう！', 'beepo.dash': 'ジャンプじゃ とどかない！ はしまで いって ダッシュ！',
    'beepo.dashNow': 'こんどは ダッシュを ためしてみて！', 'beepo.ramp': 'ヒャッホー！ スロープを すべりおりよう！', 'beepo.crate': 'クレートだ！ こわして あけよう！',
    'beepo.collect': 'ちかづくと クリンクが すいよせられるよ！', 'beepo.bot': 'ギズモブの ボットだ！ やさしい子だよ。ポップしよう！',
    'beepo.chest': 'たからばこだ！ あけてみて！', 'beepo.gate': 'フィズポートは こっち！ いこう！', 'beepo.try1': 'きみなら できる！',
    'beepo.try2': 'ひかってる ボタンを おしてね！', 'beepo.try3': 'おしい！ もう一回 やってみよう！', 'beepo.splash': 'ポチャン！ もう一回 やってみよう！',
    'beepo.help': 'ちょっとだけ おてつだい するね！', 'beepo.tipGallery': 'ここで まとあて！ とおいほど むずかしいよ。',
    'beepo.tipCourse': 'スタートラインを こえると タイムが はじまるよ！', 'beepo.tipPen': 'この ボットたちは こうげき してこないよ。ひかる あたまを ねらって！',
    'beepo.tipSpar': 'あの子は やりかえして くるよ…やさしくね！', 'beepo.tipRack': 'ラックで もってる ぶきを ぜんぶ ためせるよ！',
    'beepo.tipKick': 'カベキック：カベに むかって ジャンプ、もう一回 ジャンプ！', 'beepo.tipPopup': 'あかい ボタンで ポップアップ・チャレンジ！',
    'tut.move': 'わっかまで あるこう', 'tut.look': 'ふうせんを 見よう', 'tut.shoot': 'ふうせんを 3つ ポップ', 'tut.jump': 'ジャンプで こえよう',
    'tut.double': '2かい ジャンプ！', 'tut.slide': 'はしって スライド！', 'tut.mantle': 'カベを よじのぼろう', 'tut.dash': 'ダッシュで わたろう！',
    'tut.crate': 'クレートを こわそう', 'tut.collect': 'クリンクを あつめよう', 'tut.bot': 'ボットを ポップ！', 'tut.chest': 'たからばこを あけよう',
    'tut.gate': 'フィズポートへ GO！', 'tut.skip': 'スキップ', 'tut.skipTitle': 'チュートリアルを スキップする？', 'tut.skipQ': 'トレーニングじょうで いつでも あそべるよ。',
    'tut.skipYes': 'スキップ', 'tut.skipNo': 'つづける', 'tut.good1': 'ナイス！', 'tut.good2': 'いいね！', 'tut.good3': 'すごい！', 'tut.good4': 'バッチリ！',
    'tut.good5': 'やったね！', 'tut.ready': 'じゅんび OK！', 'tut.readySub': 'リーフレンジャーからの プレゼント！', 'tut.skin': 'レンジャー ガントレット',
    'tut.clinks': '{n} クリンク', 'tut.parts': 'はじめての パーツ', 'tut.go': 'いこう！', 'tut.welcome': 'フィズポートへ ようこそ！',
    'tut.welcomeSub': 'ぼうけんの はじまりだ！', 'tut.open': 'たからばこを あける',
    'tut.key.space': 'スペース', 'tut.key.shift': 'シフト', 'tut.key.click': 'クリック', 'tut.key.mouse': 'マウス',
  });

  // ================================================================== profile helpers
  const prof = () => (G.Save && G.Save.data ? G.Save.prof : null);
  const obj = (o, k) => { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; return o[k]; };
  function tutRec() {
    const p = prof();
    if (!p) return { done: false, step: 0, tips: {} };
    const t = obj(p, 'tutorial'); obj(t, 'tips'); obj(p, 'flags');
    return t;
  }
  function trialRec(id) {
    const p = prof(); if (!p) return { best: null, medal: 0 };
    const t = obj(obj(obj(p, 'records'), 'trials'), id);
    if (typeof t.medal !== 'number') t.medal = 0;
    if (t.best === undefined) t.best = null;
    return t;
  }
  function popupBest() { const p = prof(); const r = p ? obj(p, 'records') : {}; return typeof r.popup === 'number' ? r.popup : 0; }
  function popupMedal() { const p = prof(); const r = p && p.records && p.records.medals && p.records.medals.trials; return r && r.popup ? r.popup : 0; }
  const save = now => { if (G.Save && G.Save.data) G.Save.save(now); };
  const sfx = (n, o) => { if (G.Audio) G.Audio.sfx(n, o); };
  const exitMode = () => (G.Game.modes.hub ? 'hub' : G.Game.modes.title ? 'title' : null);
  function wname(id) {
    const d = G.Weapons && G.Weapons.defs && G.Weapons.defs[id];
    for (const k of [d && d.nameKey, 'wpn.' + id + '.name', 'weapon.' + id + '.name']) if (k && G.i18n.has(k)) return G.t(k);
    return (d && d.name) || id;
  }
  const wicon = id => (G.Weapons && G.Weapons.icon ? G.safe('wicon', () => G.Weapons.icon(id)) || '' : '');

  // ================================================================== CSS (own classes only)
  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const css = `
.tut-layer{position:absolute;inset:0;pointer-events:none;--tut-hint-top:calc(96px + env(safe-area-inset-top,0px))}
.tut-bubble{position:absolute;left:50%;top:var(--tut-hint-top);transform:translateX(-50%);display:flex;align-items:center;gap:8px;max-width:min(560px,86vw);pointer-events:none}
.tut-bubble .tb-face{width:54px;height:54px;flex:none;filter:drop-shadow(0 3px 0 rgba(30,26,77,.35))}
.tut-bubble .tb-face svg{width:100%;height:100%;display:block}
.tut-bubble .tb-text{background:#fff;border:3px solid var(--ink);border-radius:18px 18px 18px 6px;padding:8px 14px;font:800 clamp(15px,2.2vw,19px)/1.3 var(--f-body);color:var(--ink);box-shadow:0 4px 0 rgba(30,26,77,.3);text-wrap:balance}
.tut-bubble.pop{animation:tutPop .34s cubic-bezier(.34,1.56,.64,1)}
.tut-bubble.out{animation:tutOut .28s forwards}
@keyframes tutPop{from{transform:translateX(-50%) scale(.6);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}
@keyframes tutOut{to{transform:translateX(-50%) translateY(-8px) scale(.95);opacity:0}}
.tut-ghost{position:absolute;left:0;top:0;width:0;height:0;will-change:transform}
.tut-ghost .tg-thumb{position:absolute;left:-26px;top:-4px;width:52px;height:70px;transform-origin:26px 4px;filter:drop-shadow(0 5px 6px rgba(30,26,77,.4))}
.tut-ghost .tg-thumb svg,.tut-ghost .tg-chev svg,.tut-ghost .tg-arrows svg{width:100%;height:100%;display:block}
.tut-ghost .tg-ripple{position:absolute;left:-38px;top:-38px;width:76px;height:76px;border-radius:50%;border:4px solid rgba(255,210,63,.95);box-shadow:0 0 14px rgba(255,210,63,.8);opacity:0}
.tut-ghost .tg-ring{display:none}
.tut-ghost.m-tap .tg-thumb{animation:tgTap 1.1s ease-in-out infinite}
.tut-ghost.m-tap .tg-ripple{animation:tgRip 1.1s ease-out infinite}
@keyframes tgTap{0%,100%{transform:translate(16px,26px) scale(1.06)}45%,55%{transform:translate(0,0) scale(.92)}}
@keyframes tgRip{0%,42%{transform:scale(.4);opacity:0}50%{opacity:1}100%{transform:scale(1.35);opacity:0}}
.tut-ghost.m-double .tg-thumb{animation:tgDbl 1.5s ease-in-out infinite}
.tut-ghost.m-double .tg-ripple{animation:tgRip2 1.5s ease-out infinite}
@keyframes tgDbl{0%,100%{transform:translate(16px,26px) scale(1.06)}20%,26%{transform:translate(0,0) scale(.92)}36%{transform:translate(6px,12px)}46%,52%{transform:translate(0,0) scale(.92)}72%{transform:translate(16px,26px) scale(1.06)}}
@keyframes tgRip2{0%,18%{transform:scale(.4);opacity:0}24%{opacity:1}38%{transform:scale(1.2);opacity:0}44%{transform:scale(.4);opacity:0}50%{opacity:1}70%,100%{transform:scale(1.35);opacity:0}}
.tut-ghost.m-push .tg-ring{display:block;position:absolute;left:-58px;top:-58px;width:116px;height:116px;border-radius:50%;border:3px dashed rgba(255,255,255,.9);background:radial-gradient(circle,rgba(255,255,255,.25),rgba(255,255,255,.06));box-shadow:0 0 0 3px rgba(30,26,77,.25)}
.tut-ghost.m-push .tg-thumb{animation:tgPush 1.6s ease-in-out infinite}
@keyframes tgPush{0%,100%{transform:translate(0,0)}15%{transform:translate(0,0) scale(.95)}50%,72%{transform:translate(0,-48px) scale(.95)}}
.tut-ghost .tg-chev{position:absolute;left:-17px;top:-118px;width:34px;height:42px;animation:tgChev 1.6s ease-in-out infinite;filter:drop-shadow(0 2px 0 rgba(30,26,77,.6))}
@keyframes tgChev{0%,100%{transform:translateY(8px);opacity:.3}50%{transform:translateY(-4px);opacity:1}}
.tut-ghost.m-swipe .tg-thumb{animation:tgSwipe 1.8s ease-in-out infinite}
@keyframes tgSwipe{0%,100%{transform:translate(62px,0)}50%{transform:translate(-62px,0)}}
.tut-ghost .tg-arrows{position:absolute;left:-95px;top:-58px;width:190px;height:40px;filter:drop-shadow(0 2px 0 rgba(30,26,77,.6))}
.tut-keysbar{position:absolute;left:50%;bottom:calc(98px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;gap:18px;align-items:center}
.tut-kg{display:flex;gap:6px;align-items:center;padding:8px 12px;background:rgba(27,42,74,.6);border-radius:16px;box-shadow:0 4px 0 rgba(27,42,74,.35)}
.tut-kg.pulse{animation:tkgPulse .5s ease-out 4}
@keyframes tkgPulse{0%{box-shadow:0 0 0 0 rgba(255,210,63,.9)}100%{box-shadow:0 0 0 18px rgba(255,210,63,0)}}
.tut-key{min-width:42px;height:42px;padding:0 10px;display:inline-grid;place-items:center;background:#fff;color:var(--ink);border:3px solid var(--ink);border-radius:10px;box-shadow:0 4px 0 var(--ink);font:800 17px var(--f-body);white-space:nowrap}
.tut-key.wide{min-width:112px}
.tut-key.hot{animation:tkPress 1.1s ease-in-out infinite}
.tut-key.d2{animation-delay:.28s}
.tut-key.hold{background:var(--sun);transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}
.tut-key.lbl{background:transparent;border:none;box-shadow:none;color:#fff;min-width:0;padding:0 2px;text-shadow:0 2px 0 var(--ink);animation:none}
.tut-plus{color:#fff;font:800 22px var(--f-body);text-shadow:0 2px 0 var(--ink)}
@keyframes tkPress{0%,100%{transform:none;box-shadow:0 4px 0 var(--ink)}40%,60%{transform:translateY(3px);box-shadow:0 1px 0 var(--ink);background:var(--sun)}}
.tut-wasd{display:flex;flex-direction:column;align-items:center;gap:4px}.tut-wasd>div{display:flex;gap:4px}
.tut-wasd .tut-key{min-width:34px;height:34px;font-size:15px}
.tut-mouse{width:40px;height:54px;display:inline-block}.tut-mouse svg{width:100%;height:100%;display:block}
.tut-mouse.m-move{animation:tmMove 1.6s ease-in-out infinite}
@keyframes tmMove{0%,100%{transform:translateX(-16px)}50%{transform:translateX(16px)}}
.tut-mouse.m-click .mb-l{animation:tmClick 1.1s infinite}
@keyframes tmClick{0%,100%{fill:#fff}40%,60%{fill:#ff6b8b}}
.tbtn.tut-pulse{animation:tutBtnPulse .9s ease-out infinite}
@keyframes tutBtnPulse{0%{box-shadow:0 5px 0 rgba(30,26,77,.4),0 0 0 0 rgba(255,210,63,.95)}75%{box-shadow:0 5px 0 rgba(30,26,77,.4),0 0 0 22px rgba(255,210,63,0)}100%{box-shadow:0 5px 0 rgba(30,26,77,.4),0 0 0 0 rgba(255,210,63,0)}}
.tut-cap{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.95);border:3px solid var(--ink);border-radius:22px;padding:5px 14px 5px 5px;box-shadow:0 5px 0 rgba(30,26,77,.35);font:800 clamp(16px,2.4vw,22px)/1.15 var(--f-body);color:var(--ink);max-width:min(460px,48vw);animation:tutCapIn .38s cubic-bezier(.34,1.56,.64,1)}
@keyframes tutCapIn{from{transform:scale(.7);opacity:0}to{transform:none;opacity:1}}
.tut-cap .ic{width:46px;height:46px;border-radius:50%;border:3px solid var(--ink);display:grid;place-items:center;flex:none;box-shadow:0 3px 0 rgba(30,26,77,.35);color:var(--ink);position:relative}
.tut-cap .ic svg{width:62%;height:62%;display:block}
.tut-cap .ic b{position:absolute;right:-8px;top:-8px;background:var(--ink);color:#fff;border-radius:99px;font:800 12px/1 var(--f-body);padding:3px 5px}
.tut-cap .tx{text-wrap:balance}
/* Japanese / Korean captions are written with a space between phrases: wrap there, never inside a word */
:lang(ja) .tut-cap .tx,:lang(ko) .tut-cap .tx,:lang(ja) .tut-bubble .tb-text,:lang(ko) .tut-bubble .tb-text{word-break:keep-all;overflow-wrap:anywhere}
.tut-cap .kc{display:flex;gap:4px;align-items:center}
.tut-cap .kc .tut-key{min-width:30px;height:30px;font-size:13px;border-width:2px;box-shadow:0 3px 0 var(--ink);padding:0 6px;animation:none}
.tut-cap .kc .tut-key.wide{min-width:58px}
.tut-cap .kc .tut-mouse{width:22px;height:30px;animation:none}
.tut-cap .kc .tut-key.lbl{border:none;box-shadow:none;background:transparent;color:var(--ink);text-shadow:none;min-width:0;padding:0 1px;font-size:15px}
.tut-pad{width:44px;height:44px;display:inline-grid;place-items:center;border-radius:50%;border:3px solid var(--ink);box-shadow:0 4px 0 var(--ink);font:800 17px/1 var(--f-body);color:#fff;text-shadow:0 1px 0 rgba(30,26,77,.55);background:#3d7bff;white-space:nowrap}
.tut-pad.a{background:#22c46b}.tut-pad.b{background:#ff4d5e}.tut-pad.x{background:#3d7bff}.tut-pad.y{background:#f2b600}
.tut-pad.sh{width:auto;min-width:52px;padding:0 9px;border-radius:12px 12px 8px 8px;background:#5b5f8f;font-size:15px}
.tut-pad.st{background:radial-gradient(circle at 50% 45%,#fff 0 40%,#d9dcf2 41% 100%);color:var(--ink);text-shadow:none;position:relative}
.tut-pad.st::after{content:'';position:absolute;inset:-7px;border-radius:50%;border:2px dashed rgba(255,255,255,.75)}
.tut-pad.hot{animation:tkPress 1.1s ease-in-out infinite}.tut-pad.d2{animation-delay:.28s}
.tut-pad.st.hot{animation:tpStick 1.4s ease-in-out infinite}
@keyframes tpStick{0%,100%{transform:none}30%{transform:translate(0,-5px)}60%{transform:translate(5px,0)}}
.tut-cap .kc .tut-pad{width:30px;height:30px;font-size:12px;border-width:2px;box-shadow:0 3px 0 var(--ink);animation:none}
.tut-cap .kc .tut-pad.sh{width:auto;min-width:36px;padding:0 5px;font-size:11px}
.tut-cap .kc .tut-pad.st::after{inset:-4px}
.reduced-motion .tut-pad{animation:none!important}
.tut-cap .cnt{background:var(--ink);color:#fff;border-radius:99px;padding:3px 10px;font-size:.78em;font-variant-numeric:tabular-nums;white-space:nowrap}
.tut-cap.ok{background:#bff5df}
.tut-cap.ok .ic{background:#3fe0b8 !important;animation:tutOk .45s cubic-bezier(.34,1.56,.64,1)}
@keyframes tutOk{from{transform:scale(.5) rotate(-20deg)}to{transform:none}}
.tut-dots{display:flex;gap:5px;justify-content:center;margin-top:6px}
.tut-dots i{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.75);border:2px solid var(--ink);transition:transform .2s}
.tut-dots i.done{background:#3fe0b8}.tut-dots i.cur{background:#ffd23f;transform:scale(1.3)}
.tut-skip{position:absolute;left:calc(72px + env(safe-area-inset-left,0px));top:calc(62px + env(safe-area-inset-top,0px));pointer-events:auto;opacity:.92}
.tut-praise{position:absolute;left:50%;top:31%;transform:translate(-50%,-50%);font:400 clamp(34px,7vw,64px)/1 var(--f-display);color:#fff;-webkit-text-stroke:4px var(--ink);paint-order:stroke fill;text-shadow:0 6px 0 var(--ink);animation:tutPraise 1.05s cubic-bezier(.2,1.6,.4,1) forwards;white-space:nowrap}
@keyframes tutPraise{0%{transform:translate(-50%,-50%) scale(.3) rotate(-8deg);opacity:0}25%{transform:translate(-50%,-50%) scale(1.12) rotate(3deg);opacity:1}40%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{transform:translate(-50%,-75%);opacity:0}}
.tut-flash{position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.92),rgba(127,232,224,.88));animation:tutFlash .65s ease-out forwards}
@keyframes tutFlash{from{opacity:1}to{opacity:0}}
.tut-count{position:absolute;inset:0;display:grid;place-items:center;font:400 min(28vw,150px)/1 var(--f-display);color:#fff;-webkit-text-stroke:5px var(--ink);paint-order:stroke fill;text-shadow:0 8px 0 var(--ink)}
.tut-count span{animation:tutCd .9s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes tutCd{0%{transform:scale(2.2);opacity:0}25%{transform:scale(1);opacity:1}80%{opacity:1}100%{transform:scale(.8);opacity:0}}
.train-chip{display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(255,255,255,.93);border:3px solid var(--ink);border-radius:16px;padding:4px 14px;box-shadow:0 4px 0 rgba(30,26,77,.35);color:var(--ink)}
.train-chip .big{font:400 26px/1.1 var(--f-display);font-variant-numeric:tabular-nums;display:flex;gap:8px;align-items:center}
.train-chip .sub{font:800 12px/1.2 var(--f-body);color:var(--ink-soft);display:flex;gap:6px;align-items:center;white-space:nowrap}
.train-chip svg{width:22px;height:22px}
.train-medal{width:22px;height:22px;border-radius:50%;border:2px solid var(--ink);display:inline-block;flex:none;box-shadow:inset 0 -3px 0 rgba(0,0,0,.15)}
.train-medal.m0{background:#d7dbe6;opacity:.7}.train-medal.m1{background:radial-gradient(circle at 35% 35%,#ffd9b8,#d9844c)}
.train-medal.m2{background:radial-gradient(circle at 35% 35%,#fff,#b9c4d6)}.train-medal.m3{background:radial-gradient(circle at 35% 35%,#fff6c0,#ffc21a)}
.train-medal.m4{background:radial-gradient(circle at 35% 35%,#fff,#9ff0ff 45%,#c8a8ff)}
.train-stamp{width:112px;height:112px;margin:0 auto;border-width:4px;display:grid;place-items:center;animation:trStamp .5s cubic-bezier(.2,1.7,.4,1) both;box-shadow:inset 0 -8px 0 rgba(0,0,0,.12),0 6px 0 var(--ink)}
.train-stamp svg{width:56%;height:56%}
@keyframes trStamp{from{transform:scale(2.4) rotate(-25deg);opacity:0}to{transform:none;opacity:1}}
/* the result card always fits: header and buttons never scroll away; the middle (stamp, rows, rewards) scrolls as a
   last resort; short screens (html.gh-short: 390 px phones and below) put the stamp beside the medal line and the
   rows side by side */
.train-res{align-items:stretch;text-align:center;overflow:hidden}
.train-res .tr-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:10px;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;padding:2px}
.train-res .tr-body>*,.train-res>.panel-head,.train-res>.tr-foot{flex-shrink:0}
.train-res .tr-top{display:flex;flex-direction:column;align-items:center;gap:8px}
.train-res .tr-sub{font:400 24px/1.1 var(--f-display)}
.train-res .tr-trophy{width:96px;height:96px;margin:0 auto}.train-res .tr-trophy svg{width:100%;height:100%;display:block}
.train-res .rows{display:flex;flex-direction:column;gap:6px}
.train-res .rw{display:flex;justify-content:space-between;gap:12px;font:800 16px var(--f-body);padding:6px 10px;background:#fff;border:3px solid var(--ink);border-radius:12px}
.train-res .rw b{font-variant-numeric:tabular-nums}
html.gh-short .train-res .tr-body{gap:8px}
html.gh-short .train-res .tr-top{flex-direction:row;justify-content:center;gap:12px}
html.gh-short .train-res .train-stamp{width:60px;height:60px;margin:0;border-width:3px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.12),0 4px 0 var(--ink)}
html.gh-short .train-res .tr-trophy{width:56px;height:56px;margin:0}
html.gh-short .train-res .tr-sub{font-size:20px}
html.gh-short .train-res .rows{flex-direction:row;flex-wrap:wrap}
html.gh-short .train-res .rw{flex:1 1 0;min-width:84px;flex-direction:column;align-items:center;gap:0;padding:3px 8px;font-size:15px;border-width:2.5px}
html.gh-short .train-res .rw span{font-size:12px;color:var(--ink-soft)}
html.gh-short .train-res .reward{padding:4px 8px;font-size:13px}
.train-res .nb{display:inline-block;background:#ffd23f;border:2px solid var(--ink);border-radius:99px;padding:2px 10px;font:800 13px var(--f-body);animation:tutCapIn .5s .3s both}
.train-card .tc-h{display:flex;gap:10px;align-items:center}
.train-card .tc-h .ico{width:44px;height:44px;border-radius:12px;border:3px solid var(--ink);display:grid;place-items:center;flex:none}
.train-card .tc-h .ico svg{width:70%;height:70%}
.train-card .tc-s{display:flex;gap:8px;align-items:center;font:800 13px var(--f-body);flex-wrap:wrap}
/* .panel.narrow.tut-reward: three classes so it beats style.css's later .panel.narrow{max-width:460px}. The card scrolls
   as a last resort so its only button can never end up off-screen (touch has no Esc). */
.panel.narrow.tut-reward{align-items:center;text-align:center;max-width:580px;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;background:radial-gradient(circle at 50% 0%,#fff8d6,#f3faff 60%)}
.tut-reward>*{flex-shrink:0}
/* (the headline's entrance only scales: an opacity keyframe once left 'Welcome back!' invisible when Chromium never
   started the animation; unstick() drops such a stuck entrance) */
.tut-reward .ttl{font:400 clamp(30px,6vw,48px)/1 var(--f-display);color:#ffd23f;-webkit-text-stroke:3px var(--ink);paint-order:stroke fill;text-shadow:0 5px 0 var(--ink);animation:tutTtlIn .5s cubic-bezier(.34,1.56,.64,1)}
@keyframes tutTtlIn{from{transform:scale(.7)}to{transform:none}}
.tut-reward .bp{width:70px;height:70px}.tut-reward .bp svg{width:100%;height:100%;display:block}
.tut-reward .sub{margin:0;font:800 17px/1.3 var(--f-body)}
.tut-reward .items{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;max-width:100%}
.tut-reward .item{width:124px;min-width:0;background:#fff;border:3px solid var(--ink);border-radius:16px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 4px 0 rgba(30,26,77,.35);animation:toastIn .5s backwards;font:800 14px/1.2 var(--f-body);overflow-wrap:anywhere}
.tut-reward .item .ico{width:64px;height:64px;display:grid;place-items:center}.tut-reward .item .ico svg{width:100%;height:100%}
@media (max-height:460px){.tut-reward .ttl{font-size:30px;text-shadow:0 4px 0 var(--ink)}.tut-reward .bp{width:46px;height:46px}.tut-reward .sub{font-size:15px}.tut-reward .items{gap:10px;flex-wrap:nowrap}.tut-reward .item{width:auto;flex:0 1 116px;padding:6px 6px 8px;gap:4px;font-size:13px}.tut-reward .item .ico{width:40px;height:40px}}
.tut-resume .tut-cap{margin:0 auto;box-shadow:0 4px 0 rgba(30,26,77,.25)}.tut-resume .tut-dots{margin:0}.tut-resume .rs-step{font:800 14px/1 var(--f-body);color:var(--ink-soft)}
@media (max-height:460px){.tut-resume{gap:8px}.tut-resume .bp{display:none}}
@media (max-height:460px){.tut-cap{font-size:16px}.tut-cap .ic{width:38px;height:38px}.tut-bubble .tb-face{width:44px;height:44px}.tut-bubble .tb-text{font-size:14px;padding:6px 12px}.tut-keysbar{bottom:calc(76px + env(safe-area-inset-bottom,0px))}.tut-skip{top:calc(54px + env(safe-area-inset-top,0px))}}
`;
    const st = document.createElement('style'); st.id = 'tut-style'; st.textContent = css;
    document.head.appendChild(st);
  }
  // The Coach Ping gate / rack / result screens open from the hub before the range ever loaded: the styles
  // must exist up front (otherwise the gate's card icons render at full card width).
  if (document.head) injectCss(); else document.addEventListener('DOMContentLoaded', injectCss);

  // ================================================================== icons (inline SVG)
  const INK = '#1e1a4d';
  function beepoSVG(expr) {
    const eyes = expr === 'wow'
      ? '<circle cx="26" cy="35" r="4.5" fill="#39d5ff"/><circle cx="38" cy="35" r="4.5" fill="#39d5ff"/><circle cx="32" cy="42.5" r="2.4" fill="#39d5ff"/>'
      : expr === 'wink' ? '<path d="M22 37q4-6 8 0" stroke="#39d5ff" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M34 35h8" stroke="#39d5ff" stroke-width="3.6" stroke-linecap="round"/>'
        : expr === 'idle' ? '<rect x="23" y="30" width="6" height="9" rx="3" fill="#39d5ff"/><rect x="35" y="30" width="6" height="9" rx="3" fill="#39d5ff"/>'
          : '<path d="M22 37q4-6 8 0M34 37q4-6 8 0" stroke="#39d5ff" stroke-width="3.6" fill="none" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 64 64"><path d="M32 13V7" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="6" r="4" fill="#ff6b8b" stroke="' + INK + '" stroke-width="2.5"/>'
      + '<ellipse cx="9" cy="37" rx="5" ry="9" fill="#ffd23f" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="55" cy="37" rx="5" ry="9" fill="#ffd23f" stroke="' + INK + '" stroke-width="2.5"/>'
      + '<circle cx="32" cy="37" r="23" fill="#fff1dc" stroke="' + INK + '" stroke-width="3"/><rect x="16" y="24" width="32" height="23" rx="10" fill="#1b2a4a"/>'
      + eyes + '<circle cx="19" cy="49" r="3" fill="#ff9fc2" opacity=".75"/><circle cx="45" cy="49" r="3" fill="#ff9fc2" opacity=".75"/><path d="M20 27q6-4 12-3" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';
  }
  const COACH_FALLBACK = '<svg viewBox="0 0 64 64"><rect x="12" y="4" width="40" height="5" rx="2.5" fill="#cfd6f0" stroke="' + INK + '" stroke-width="2"/><rect x="29" y="7" width="6" height="8" fill="' + INK + '"/><circle cx="32" cy="35" r="21" fill="#f0fbff" stroke="' + INK + '" stroke-width="3"/><path d="M12 31a20 20 0 0 1 40 0z" fill="#ff6b5a" stroke="' + INK + '" stroke-width="3"/><path d="M40 31h15a4 4 0 0 1-4 4H40z" fill="#ff6b5a" stroke="' + INK + '" stroke-width="2.5"/><path d="M21 38q4-5 8 0M35 38q4-5 8 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="24" y="44" width="13" height="8" rx="3" fill="#ffd23f" stroke="' + INK + '" stroke-width="2.5"/><circle cx="40" cy="48" r="5" fill="#ffd23f" stroke="' + INK + '" stroke-width="2.5"/></svg>';
  const coachSVG = () => (G.Geo && G.Geo.npcPortraitSVG ? G.safe('coach portrait', () => G.Geo.npcPortraitSVG('coach')) : null) || COACH_FALLBACK;
  const S24 = body => '<svg viewBox="0 0 48 48">' + body + '</svg>';
  const IC = {
    move: S24('<circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="24" r="7.5" fill="currentColor"/><path d="M24 1.5l4.5 5h-9zM24 46.5l4.5-5h-9zM1.5 24l5-4.5v9zM46.5 24l-5-4.5v9z" fill="currentColor"/>'),
    look: S24('<path d="M5 24c5-8 11.5-12 19-12s14 4 19 12c-5 8-11.5 12-19 12S10 32 5 24z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><circle cx="24" cy="24" r="6.5" fill="currentColor"/>'),
    crate: S24('<rect x="7" y="9" width="34" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M7 19h34M7 29h34M17 9v30M31 9v30" stroke="currentColor" stroke-width="3"/>'),
    coin: S24('<path d="M24 5l16.5 9.5v19L24 43 7.5 33.5v-19z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><circle cx="24" cy="24" r="6" fill="currentColor"/>'),
    bot: S24('<rect x="9" y="14" width="30" height="24" rx="8" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="18" cy="25" r="3.5" fill="currentColor"/><circle cx="30" cy="25" r="3.5" fill="currentColor"/><path d="M24 14V7" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="6" r="3" fill="currentColor"/><path d="M18 32h12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'),
    chest: S24('<path d="M6 22h36v18H6zM6 22c0-9 8-14 18-14s18 5 18 14" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><rect x="20" y="20" width="8" height="9" rx="2" fill="currentColor"/>'),
    gate: S24('<path d="M8 42V22a16 16 0 0 1 32 0v20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M24 30l-6-6M24 30l6-6M24 30v-12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'),
    target: S24('<circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="24" r="3.5" fill="currentColor"/>'),
    timer: S24('<circle cx="24" cy="27" r="16" fill="#fff" stroke="' + INK + '" stroke-width="4"/><path d="M24 27V17M24 27l6 4" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/><path d="M19 5h10M24 5v6" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>'),
    star: S24('<path d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z" fill="#ffd23f" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>'),
    skip: S24('<path d="M8 10l16 14-16 14zM24 10l16 14-16 14z" fill="currentColor"/>'),
    rack: S24('<rect x="5" y="16" width="26" height="12" rx="5" fill="currentColor"/><rect x="29" y="19" width="14" height="6" rx="3" fill="currentColor"/><path d="M12 28l-3 10h7l3-10" fill="currentColor"/>'),
    trophy: S24('<path d="M14 6h20v10a10 10 0 0 1-20 0zM14 10H6c0 7 4 10 8 10M34 10h8c0 7-4 10-8 10M24 26v8M16 42h16l-2-8H18z" fill="#ffd23f" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>'),
    flag: S24('<path d="M10 44V5" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/><path d="M10 6h28l-6 8 6 8H10z" fill="#ff6b8b" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>'),
    skin: S24('<path d="M10 18c0-7 6-11 14-11s14 4 14 11v12c0 7-6 11-14 11S10 37 10 30z" fill="#2ec4b6" stroke="' + INK + '" stroke-width="3.2"/><path d="M10 22h28M10 28h28" stroke="#ffd23f" stroke-width="3.5"/><circle cx="24" cy="25" r="4" fill="#4fd8ff" stroke="' + INK + '" stroke-width="2"/>'),
    gear: S24('<path d="M24 6l4 4 6-1 1 6 5 3-3 5 3 5-5 3-1 6-6-1-4 4-4-4-6 1-1-6-5-3 3-5-3-5 5-3 1-6 6 1z" fill="#c9d2ea" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="5.5" fill="#fff" stroke="' + INK + '" stroke-width="3"/>'),
  };
  const nutSVG = '<svg viewBox="0 0 48 48"><path d="M24 4l17.3 10v20L24 44 6.7 34V14z" fill="#ffc93a" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/><circle cx="24" cy="24" r="7" fill="#c98a12" stroke="' + INK + '" stroke-width="3"/></svg>';
  const THUMB_SVG = '<svg viewBox="0 0 52 70"><path d="M12 70V26C12 13 18 4 26 4s14 9 14 22v44" fill="rgba(255,255,255,0.9)" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/><path d="M18 22c0-7 3.5-11 8-11s8 4 8 11v3c-3 2.4-13 2.4-16 0z" fill="#ffd1dc" stroke="' + INK + '" stroke-width="2"/><path d="M15 44h22M15 52h22" stroke="' + INK + '" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/></svg>';
  const CHEV_SVG = '<svg viewBox="0 0 34 42"><path d="M5 19L17 7l12 12M5 35l12-12 12 12" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SWIPE_SVG = '<svg viewBox="0 0 190 40"><path d="M30 20h130" stroke="#fff" stroke-width="5" stroke-dasharray="2 13" stroke-linecap="round"/><path d="M30 7L15 20l15 13M160 7l15 13-15 13" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MOUSE_SVG = '<svg viewBox="0 0 40 54"><rect x="3" y="3" width="34" height="48" rx="17" fill="#fff" stroke="' + INK + '" stroke-width="3"/><path class="mb-l" d="M20 4.5V22H4.5V20A15.5 15.5 0 0 1 20 4.5z" fill="#fff"/><path d="M20 3v19M4 22h32" stroke="' + INK + '" stroke-width="3"/><rect x="17.5" y="9" width="5" height="8" rx="2.5" fill="' + INK + '"/></svg>';
  const BTN_COL = { move: '#5fc8ff', look: '#b9a2ff', fire: '#ff8fa8', jump: '#7debd0', slide: '#ffffff', ability: '#ffd23f', interact: '#ffd23f', crate: '#e8b06a', coin: '#ffd23f', bot: '#ff8fa8', chest: '#ffd23f', gate: '#7debd0' };
  const btnIcon = id => (G.Input.ICONS && G.Input.ICONS[id]) || IC[id] || '';

  // ================================================================== G.Tutorial: hints, ghost thumbs, pulses
  const T = G.Tutorial = G.Tutorial || {};
  T.needed = function () {
    const p = prof(); if (!p) return false;
    const t = tutRec(), f = p.flags || {};
    return !(t.done || f.tutorialDone || f.tutorialSkipped);
  };
  function markDone(skipped) {
    const t = tutRec(), p = prof();
    let lines = [];
    if (G.Progress && G.Progress.completeTutorial) { t.done = false; lines = G.safe('completeTutorial', () => G.Progress.completeTutorial()) || []; }
    t.done = true; t.step = STEP_IDS.length;
    if (p) { p.flags.tutorialDone = true; if (skipped) { p.flags.tutorialSkipped = true; t.skipped = true; } }
    save(true);
    G.bus.emit('tutorial-done', !!skipped);
    return lines;
  }
  T.complete = () => markDone(false);
  T.skip = () => markDone(true);
  T.reset = function () { const t = tutRec(), p = prof(); t.done = false; t.step = 0; t.skipped = false; t.tips = {}; if (p) { p.flags.tutorialDone = false; p.flags.tutorialSkipped = false; } save(true); };
  T.start = params => G.Game.go('training', Object.assign({ tutorial: true }, params || {}));
  // Saved step of an unfinished first-run tutorial (0 = nothing to resume). A step that depends on the
  // setup of the one before it resumes there: 'shoot' needs the balloons from 'look', 'collect' the
  // clinks from 'crate'. G.Game.go('training', {tutorial:true, resume:i}) continues from step i.
  const RESUME_AT = { shoot: 'look', collect: 'crate' };
  T.resumeStep = function () {
    if (!T.needed()) return 0;
    const n = tutRec().step | 0;
    if (n <= 0 || n >= STEP_IDS.length) return 0;
    return Math.max(0, STEP_IDS.indexOf(RESUME_AT[STEP_IDS[n]] || STEP_IDS[n]));
  };
  T.seen = key => !!tutRec().tips[key];
  let layerEl = null;
  function layer() {
    if (layerEl && layerEl.isConnected) return layerEl;
    injectCss();
    layerEl = el('div.tut-layer');
    const ui = document.getElementById('ui'), scr = document.getElementById('screens');
    if (ui) ui.insertBefore(layerEl, scr && scr.parentNode === ui ? scr : null); else document.body.appendChild(layerEl);
    return layerEl;
  }
  T.layer = layer;
  const HB = { el: null, timer: 0, timer2: 0, key: null };
  T.hint = function (key, opts) {
    opts = opts || {};
    const t = tutRec();
    if (opts.once !== false && !opts.force && t.tips[key]) return false;
    if (opts.once !== false) { t.tips[key] = 1; save(); }
    showBubble(G.i18n.has(key) ? G.t(key, opts.params) : String(key), opts);
    HB.key = key;
    return true;
  };
  T.say = (key, opts) => T.hint(key, Object.assign({}, opts || {}, { once: false }));
  T.hideHint = function () { clearTimeout(HB.timer); clearTimeout(HB.timer2); if (HB.el) HB.el.hidden = true; HB.key = null; };
  function showBubble(text, opts) {
    const L = layer();
    if (!HB.el || !HB.el.isConnected) { HB.el = el('div.tut-bubble', el('div.tb-face'), el('div.tb-text')); L.appendChild(HB.el); }
    HB.el.firstChild.innerHTML = opts.face === 'coach' ? coachSVG() : beepoSVG(opts.expr || 'happy');
    HB.el.lastChild.textContent = text;
    HB.el.hidden = false;
    HB.el.classList.remove('out', 'pop'); void HB.el.offsetWidth; HB.el.classList.add('pop');
    clearTimeout(HB.timer); clearTimeout(HB.timer2);
    const dur = opts.dur || U.clamp(1.8 + text.length * 0.055, 2.8, 6.5);
    HB.timer = setTimeout(() => { if (!HB.el) return; HB.el.classList.add('out'); HB.timer2 = setTimeout(() => { if (HB.el) HB.el.hidden = true; HB.key = null; }, 300); }, dur * 1000);
    if (opts.sound !== false) sfx('npc', { pitch: opts.face === 'coach' ? 1.0 : 1.4 });
  }
  // ----- ghost thumbs / key chips
  const GH = { list: [], raf: 0, bar: null, n: 0 };
  T.ghostThumb = function (target, opts) {
    opts = opts || {};
    const dev = G.input.device;
    const h = dev === 'touch' ? thumbGhost(target, opts) : keyGhost(target, opts, dev === 'gamepad');
    if (!h) return null;
    GH.list.push(h);
    if (opts.dur) h.timer = setTimeout(() => h.remove(), opts.dur * 1000);
    if (!GH.raf) GH.raf = requestAnimationFrame(ghostTick);
    return h;
  };
  T.clearGhosts = function () { for (const h of GH.list.slice()) h.remove(); };
  function mkHandle(e, target, opts, after) {
    const h = { el: e, target, opts, dead: false, remove() { if (h.dead) return; h.dead = true; clearTimeout(h.timer); e.remove(); const i = GH.list.indexOf(h); if (i >= 0) GH.list.splice(i, 1); if (after) after(); } };
    return h;
  }
  function thumbGhost(target, opts) {
    const mode = opts.mode || (target === 'joystick' ? 'push' : target === 'look' ? 'swipe' : 'tap');
    const e = el('div.tut-ghost.m-' + mode, el('div.tg-ring'), el('div.tg-ripple'), el('div.tg-thumb', { html: THUMB_SVG }));
    if (mode === 'push') e.appendChild(el('div.tg-chev', { html: CHEV_SVG }));
    if (mode === 'swipe') e.insertBefore(el('div.tg-arrows', { html: SWIPE_SVG }), e.firstChild);
    layer().appendChild(e);
    const h = mkHandle(e, target, opts);
    h.thumb = true;
    placeGhost(h);
    return h;
  }
  function anchorOf(h) {
    const t = h.target, W = G.Screen ? G.Screen.w() : window.innerWidth, H = G.Screen ? G.Screen.h() : window.innerHeight, lefty = !!(G.Save.set && G.Save.set.leftHanded);
    if (t === 'joystick') return [W * (lefty ? 0.84 : 0.16), H * 0.72];
    if (t === 'look') return [W * (lefty ? 0.3 : 0.66), H * 0.5];
    const node = typeof t === 'string' ? (G.Input.btn && G.Input.btn(t)) : t;
    if (!node || !node.isConnected || node.hidden) return null;
    const r = G.Screen ? G.Screen.rectToLocal(node.getBoundingClientRect()) : node.getBoundingClientRect(); if (r.width < 2) return null;
    return [r.left + r.width / 2, r.top + r.height / 2];
  }
  function placeGhost(h) {
    const a = anchorOf(h);
    if (!a) { h.el.style.display = 'none'; return; }
    h.el.style.display = '';
    h.el.style.transform = 'translate(' + a[0].toFixed(0) + 'px,' + a[1].toFixed(0) + 'px)';
  }
  function ghostTick() {
    GH.raf = 0;
    if (!GH.list.length) return;
    if ((GH.n++ % 4) === 0) for (const h of GH.list) if (h.thumb) placeGhost(h);
    GH.raf = requestAnimationFrame(ghostTick);
  }
  function keyBar() {
    if (!GH.bar || !GH.bar.isConnected) { GH.bar = el('div.tut-keysbar'); layer().appendChild(GH.bar); }
    return GH.bar;
  }
  const chip = (label, cls) => el('span.tut-key' + (cls ? '.' + cls.split(' ').join('.') : ''), { text: label });
  function keysFor(target, opts) {
    switch (target) {
      case 'joystick': return [el('div.tut-wasd', el('div', chip('W', 'hot')), el('div', chip('A'), chip('S'), chip('D')))];
      case 'look': return [el('span.tut-mouse.m-move', { html: MOUSE_SVG }), chip(G.t('tut.key.mouse'), 'lbl')];
      case 'fire': return [el('span.tut-mouse.m-click', { html: MOUSE_SVG }), chip(G.t('tut.key.click'), 'lbl')];
      case 'jump': return opts.mode === 'double' ? [chip(G.t('tut.key.space'), 'wide hot'), chip(G.t('tut.key.space'), 'wide hot d2')] : [chip(G.t('tut.key.space'), 'wide hot')];
      case 'slide': return opts.sprint ? [chip(G.t('tut.key.shift'), 'wide hold'), el('b.tut-plus', { text: '+' }), chip('C', 'hot')] : [chip('C', 'hot')];
      case 'ability': return [chip('Q', 'hot')];
      case 'gadget': return [chip('G', 'hot')];
      case 'interact': return [chip('E', 'hot')];
      case 'reload': return [chip('R', 'hot')];
      case 'swap': return [chip('X', 'hot'), chip('1-6', 'lbl')];
      case 'pause': return [chip('Esc', 'hot')];
      case 'sprint': return [chip(G.t('tut.key.shift'), 'wide hot')];
      default: return null;
    }
  }
  // Controller glyphs (06_input pad map: A jump, B slide, X use / reload, Y swap, RT fire, RB dash, LB gadget, left stick
  // move (click = sprint), right stick look, Start pause), same colours as the HUD's .pad-g prompt glyphs.
  const pad = (label, cls) => el('span.tut-pad' + (cls ? '.' + cls.split(' ').join('.') : ''), { text: label });
  function padFor(target, opts, small) {
    const hot = small ? '' : ' hot';
    switch (target) {
      case 'joystick': return [pad('L', 'st' + hot)];
      case 'look': return [pad('R', 'st' + hot)];
      case 'fire': return [pad('RT', 'sh' + hot)];
      case 'jump': return opts.mode === 'double' ? (small ? [pad('A', 'a'), chip('×2', 'lbl')] : [pad('A', 'a hot'), pad('A', 'a hot d2')]) : [pad('A', 'a' + hot)];
      case 'slide': return [pad('B', 'b' + hot)];
      case 'ability': return [pad('RB', 'sh' + hot)];
      case 'gadget': return [pad('LB', 'sh' + hot)];
      case 'interact': case 'reload': return [pad('X', 'x' + hot)];
      case 'swap': return [pad('Y', 'y' + hot)];
      case 'pause': return [pad('☰', 'sh' + hot)];
      case 'sprint': return [pad('L3', 'st' + hot)];
      default: return null;
    }
  }
  T.padGlyphs = (target, opts) => padFor(target, opts || {}, true);
  function keyGhost(target, opts, gamepad) {
    const keys = gamepad ? padFor(target, opts, false) : keysFor(target, opts);
    if (!keys) return null;
    const bar = keyBar();
    const g = el('div.tut-kg', keys);
    bar.appendChild(g); bar.hidden = false;
    return mkHandle(g, target, opts, () => { if (!bar.children.length) bar.hidden = true; });
  }
  // Small inline key chips for the caption card (desktop).
  function capKeys(target, opts) {
    opts = opts || {};
    switch (target) {
      case 'joystick': return [chip('W'), chip('A'), chip('S'), chip('D')];
      case 'look': return [el('span.tut-mouse', { html: MOUSE_SVG })];
      case 'fire': return [el('span.tut-mouse', { html: MOUSE_SVG })];
      case 'jump': return opts.mode === 'double' ? [chip(G.t('tut.key.space'), 'wide'), chip('×2', 'lbl')] : [chip(G.t('tut.key.space'), 'wide')];
      case 'slide': return [chip(G.t('tut.key.shift'), 'wide'), chip('+', 'lbl'), chip('C')];
      case 'ability': return [chip('Q')];
      case 'interact': return [chip('E')];
      default: return [];
    }
  }
  T.pulse = function (btnId, dur) {
    dur = dur || 2.7;
    const b = G.Input.btn && G.Input.btn(btnId);
    if (b) {
      b.classList.remove('tut-pulse'); void b.offsetWidth; b.classList.add('tut-pulse');
      clearTimeout(b._tutPulse); b._tutPulse = setTimeout(() => b.classList.remove('tut-pulse'), dur * 1000);
    }
    if (GH.bar) GH.bar.querySelectorAll('.tut-kg').forEach(k => { k.classList.remove('pulse'); void k.offsetWidth; k.classList.add('pulse'); });
  };
  function clearPulses() { document.querySelectorAll('.tbtn.tut-pulse').forEach(b => b.classList.remove('tut-pulse')); }
  function praise(text) {
    const p = el('div.tut-praise', { text });
    layer().appendChild(p);
    setTimeout(() => p.remove(), 1150);
  }
  function flashScreen() { const f = el('div.tut-flash'); layer().appendChild(f); setTimeout(() => f.remove(), 700); }

  // ================================================================== yard layout (GDD §11f: 60 × 40 m, -Z north)
  const YARD = { minX: -30, maxX: 30, minZ: -20, maxZ: 20 };
  const POOL = { x0: 6, x1: 28.6, z0: -20.9, z1: 6 };          // goo pool under the obstacle course
  const GOO_Y = -0.75, POOL_FLOOR = -2.6, FALL_Y = -0.95;
  const L1 = 11, L2 = 23, LW = 5;                               // course lanes (north- / southbound)
  const C_TOP = 1.8, E_TOP = 4.6;                               // double-jump deck / mantle deck heights
  const DECKS = [
    { id: 'A', x: L1, z: 4.0, w: LW, d: 5, top: 0, col: 0x3fe0b8 },
    { id: 'B', x: L1, z: -2.0, w: LW, d: 4, top: 0, col: 0x5fc8ff },
    { id: 'C', x: L1, z: -8.5, w: LW, d: 9, top: C_TOP, col: 0xffc93c },
    { id: 'D', x: 12.25, z: -15.5, w: 7.5, d: 5, top: C_TOP, col: 0xff8fb8 },
    { id: 'E', x: 20.75, z: -15.5, w: 9.5, d: 5, top: E_TOP, col: 0xb983ff },
    { id: 'F', x: L2, z: -9.75, w: LW, d: 6.5, top: E_TOP, col: 0x3fe0b8 },
    { id: 'G', x: L2, z: 0.25, w: LW, d: 2.5, top: E_TOP, col: 0xff9a4c },
  ];
  const GATE_Z = -10.2, GATE_Y0 = C_TOP + 1.25, GATE_Y1 = C_TOP + 4.8;
  const RAMP = { x: L2, z: 6.5, len: 10 };
  const START_Z = 6.1, FINISH_Z = 12.4;
  const STAND_X = -8.5, LANES = [-12, -6, 0], DISTS = [10, 25, 45], PTS = [50, 100, 200];
  const PEN = { x: -21, z: 13.5 }, SPAR = { x: -16.5, z: 16.2, r: 2.6 };
  const KICK = { wx: -0.3, lx0: 2.6, lx1: 5.4, z0: -19.4, z1: -12.6, top: 4.2 };
  const SP = {
    tutSpawn: [L1, 0, 15.5, 0], freeSpawn: [0, 0, 14.8, 0], ring: [L1, 0, 9.4],
    balloons: [[2.4, 1.3, 6.2], [0.8, 2.0, 9.4], [2.6, 1.0, 12.4]],
    crates: [[18.4, 0, 15.4], [15.2, 0, 15.0]], tutBot: [8.2, 0, 13.6], chest: [4.4, 0, 17.4], gate: [0, 0, 19.6],
    coach: [-4.6, 0, 11.4], podium: [-7.6, 0, 12.6], rack: [-6.0, 0, 5.4], popupBtn: [-6.2, 0, -16.6],
    stand: [-6.6, 0, -6, PI / 2], course: [L1, 0, 8.6, 0], pen: [-12.5, 0, 13, PI / 2], kick: [1.3, 0, -10.2, 0],
    crateSpots: [[-9.6, 0, 15.6], [-8.0, 0, 17.4], [-11.2, 0, 17.8]],
  };
  const tx = d => STAND_X - d;
  const inPool = (x, z, m) => x > POOL.x0 - (m || 0) && x < POOL.x1 + (m || 0) && z > POOL.z0 - (m || 0) && z < POOL.z1 + (m || 0);
  function hf(x, z) {
    let h = 0;
    const dIn = Math.min(x - POOL.x0, POOL.x1 - x, z - POOL.z0, POOL.z1 - z);
    if (dIn > -0.3) h = POOL_FLOOR * U.smoothstep(-0.3, 0.7, dIn);
    const ox = Math.max(0, Math.abs(x) - 31.5), oz = Math.max(0, Math.abs(z) - 21.5);
    if (ox > 0 || oz > 0) {
      const o = Math.min(Math.hypot(ox, oz), 45);
      const lanes = x < -30 && z > -18 && z < 6;
      const n = G.noise.fbm2(x * 0.035 + 7, z * 0.035 - 3, 3) * Math.min(1, o / 6) * (lanes ? 0.4 : 2.6);
      h += (lanes ? o * 0.11 : o * 0.09 + Math.max(0, o - 8) * 0.13) + n;
      if (z > 21 && Math.abs(x) < 10) h *= U.smoothstep(4, 10, Math.abs(x));
    }
    return h;
  }
  const _gc = new THREE.Color(), _gc2 = new THREE.Color();
  function sandy(x, z) {
    return (x > -13.5 && x < -3.5 && z > -18.5 && z < 7.5) || (x > -6.5 && x < 7.5 && z > 10.5 && z < 20.5) || (x > 8.5 && x < 13.5 && z > 6 && z < 18)
      || (x > -0.6 && x < 5.8 && z > -19.6 && z < -9) || (x > 19.5 && x < 26.5 && z > 6 && z < 14);
  }
  function groundColor(x, z, h) {
    if (h < -0.05 && inPool(x, z, 1)) return h > -0.55 ? 0xf2e2bc : h > -1.5 ? 0x8fe0e8 : 0x5cc6dc;
    if (x > -30.6 && x < 30.6 && z > -20.6 && z < 20.6) {
      _gc.setHex(sandy(x, z) ? 0xf2dcae : ((Math.floor((z + 100) / 2.5) & 1) ? 0x84d870 : 0x70ca60));
      return _gc.offsetHSL(0, 0, G.noise.n2(x * 0.17, z * 0.17) * 0.05).getHex();
    }
    const n = G.noise.fbm2(x * 0.05, z * 0.05, 3);
    _gc.setHex(0x62c25a).lerp(_gc2.setHex(0xa8e06a), U.clamp(0.5 + n * 1.2, 0, 1));
    if (h > 2.5) _gc.lerp(_gc2.setHex(0x4fae63), U.clamp((h - 2.5) / 5, 0, 0.55));
    if (z > 21 && Math.abs(x) < 3.2) _gc.lerp(_gc2.setHex(0xf2dcae), 0.85);
    return _gc.getHex();
  }

  // ================================================================== geometry helpers
  function chevGeo(w, h, t) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2 + t); s.lineTo(0, h / 2); s.lineTo(w / 2, -h / 2 + t); s.lineTo(w / 2, -h / 2); s.lineTo(0, h / 2 - t * 1.4); s.lineTo(-w / 2, -h / 2); s.closePath();
    const g = new THREE.ShapeGeometry(s); g.deleteAttribute('uv'); return g;
  }
  function ringGeo(r0, r1, seg) { const g = new THREE.RingGeometry(r0, r1, seg || 32); g.deleteAttribute('uv'); return g; }
  const GEO = new Map();
  function kitData(key, build) {
    let d = GEO.get(key);
    if (!d) { const k = new G.Geo.Kit(); build(k, G.Geo.P); d = k.data(); if (d.solid) d.solid.userData.shared = true; if (d.glow) d.glow.userData.shared = true; GEO.set(key, d); }
    return d;
  }
  function kitMesh(d, mat) {
    const m = new THREE.Mesh(d.solid || d.glow, d.solid ? (mat || G.M.vc()) : G.Geo.glowMat());
    if (d.solid && d.glow) { const g = new THREE.Mesh(d.glow, G.Geo.glowMat()); g.userData.glow = true; m.add(g); }
    return m;
  }
  const lighten = (h, t) => (G.Geo.lighten ? G.Geo.lighten(h, t) : h), darken = (h, t) => (G.Geo.darken ? G.Geo.darken(h, t) : h);
  // Rotated sub-assembly helper for a Kit: parts given in local space, then turned by rotY and moved.
  function placer(K, x, y, z, rotY) {
    const xf = G.Geo.xf;
    return {
      add(geo, col, lx, ly, lz, rx, ry, rz, sx, sy, sz) { xf(geo, lx, ly, lz, rx, ry, rz, sx, sy, sz); xf(geo, x, y, z, 0, rotY, 0); K.addRaw(geo, col); },
      glow(geo, col, lx, ly, lz, rx, ry, rz, sx, sy, sz) { xf(geo, lx, ly, lz, rx, ry, rz, sx, sy, sz); xf(geo, x, y, z, 0, rotY, 0); K.glowRaw(geo, col); },
    };
  }
  function iconSign(K, x, z, rotY, emblem, col, h) {
    const P = G.Geo.P, s = placer(K, x, 0, z, rotY || 0), ph = h || 1.7;
    for (const sx of [-0.62, 0.62]) { s.add(P.cyl(0.07, 0.09, ph + 0.5, 8), 0x1f2a5a, sx, (ph + 0.5) / 2, 0); s.add(P.sph(0.1, 8, 6), 0xe8b44a, sx, ph + 0.55, 0); }
    s.add(P.rbox(1.6, 1.2, 0.16, 0.12, 1), col, 0, ph, 0);
    s.add(P.rbox(1.38, 0.98, 0.18, 0.1, 1), 0xfff6e0, 0, ph, 0.01);
    s.add(G.Geo.emblem(emblem).clone(), null, 0, ph, 0.14, 0, 0, 0, 0.82);
    K.box(x, ph / 2 + 0.3, z, 1.5, ph + 0.6, 1.5);
  }

  // ================================================================== static yard (one merged Kit mesh + one baked prop mesh)
  function buildYard(R) {
    const w = R.world, Geo = G.Geo, P = Geo.P;
    w.add(G.Terrain.build({ heightFn: hf, colorFn: groundColor, minX: -80, maxX: 80, minZ: -66, maxZ: 76, res: 1.0, chunks: 3 }));
    const goo = G.Terrain.water({ size: 24, y: GOO_Y, shallow: 0xa8f5ff, deep: 0x3fb4e0, segments: 20, opacity: 0.93 });
    goo.scale.set((POOL.x1 - POOL.x0 + 1.6) / 24, 1, (POOL.z1 - POOL.z0 + 1.6) / 24);
    goo.position.set((POOL.x0 + POOL.x1) / 2, GOO_Y, (POOL.z0 + POOL.z1) / 2);
    w.add(goo);
    const K = new Geo.Kit();
    // ---- course decks (rounded pillars rising out of the goo)
    for (const d of DECKS) {
      const bot = POOL_FLOOR - 0.1;
      K.block(d.x, bot, d.z, d.w, d.top - bot, d.d, d.col, 0.2, 1);
      K.add(P.rbox(d.w + 0.06, 0.3, d.d + 0.06, 0.08, 1), lighten(d.col, 0.35), d.x, d.top - 0.42, d.z);
      K.add(P.rbox(d.w + 0.06, 0.22, d.d + 0.06, 0.08, 1), 0xffffff, d.x, GOO_Y + 0.12, d.z);
      K.add(P.rbox(d.w - 0.3, 0.08, d.d - 0.3, 0.035, 1), 0xfff6e0, d.x, d.top - 0.035, d.z);
      for (const s of [-1, 1]) K.add(P.box(0.16, 0.1, d.d - 0.1), 0xffd23f, d.x + s * (d.w / 2 - 0.08), d.top - 0.045, d.z);
    }
    // gap lips (hazard stripes where you take off)
    for (const [x, z, n] of [[L1, 1.55, 6], [L2, -6.45, 6]]) for (let i = 0; i < n; i++) K.add(P.box(LW / n - 0.06, 0.06, 0.34), i % 2 ? 0x1f2a5a : 0xffd23f, x - LW / 2 + (i + 0.5) * LW / n, (z > 0 ? 0 : E_TOP) + 0.01, z + (z > 0 ? 0.17 : -0.17));
    // start / finish
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) K.add(P.box(LW / 10, 0.04, 0.3), (i + j) % 2 ? 0x1e1a4d : 0xffffff, L1 - LW / 2 + (i + 0.5) * LW / 10, 0.02, START_Z + j * 0.3 - 0.15);
    for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) K.add(P.box(6 / 12, 0.04, 0.3), (i + j) % 2 ? 0x1e1a4d : 0xffffff, L2 - 3 + (i + 0.5) * 0.5, 0.02, FINISH_Z + j * 0.3 - 0.15);
    for (const [x, z, col] of [[L1, 6.95, 0x3fe0b8], [L2, FINISH_Z, 0xff6b8b]]) {
      for (const s of [-1, 1]) { K.block(x + s * 3.0, 0, z, 0.5, 3.6, 0.5, 0x1f2a5a, 0.15, 1); K.add(P.sph(0.32, 10, 8), 0xffd23f, x + s * 3.0, 3.75, z); }
      K.add(P.rbox(6.4, 0.7, 0.5, 0.2, 1), col, x, 3.4, z);
      for (let i = 0; i < 8; i++) K.add(P.box(0.7, 0.3, 0.52), i % 2 ? 0x1e1a4d : 0xffffff, x - 2.8 + i * 0.8, 3.4, z);
    }
    // double-jump wall face chevrons + mantle wall chevrons + dash arrows
    for (const y of [0.55, 1.25]) K.glowRaw(Geo.xf(chevGeo(1.6, 0.55, 0.18), L1, y, -3.98), 0xffe066);
    for (const y of [C_TOP + 0.7, C_TOP + 1.6, C_TOP + 2.4]) K.glowRaw(Geo.xf(chevGeo(1.6, 0.55, 0.18), 15.98, y, -15.5, 0, -PI / 2, 0), 0x9ff6ff);
    for (const z of [-7.6, -8.6]) { const g = chevGeo(1.4, 0.6, 0.2); Geo.xf(g, 0, 0, 0, -PI / 2, 0, 0); Geo.xf(g, L2, E_TOP + 0.03, z, 0, PI, 0); K.glowRaw(g, 0xffe066); }
    for (const z of [3.2, 2.2]) { const g = chevGeo(1.4, 0.6, 0.2); Geo.xf(g, 0, 0, 0, -PI / 2, 0, 0); Geo.xf(g, L1, 0.03, z, 0, 0, 0); K.glowRaw(g, 0xffe066); }
    // slide gate: tall panel with a glowing low slot
    const gw = LW + 0.9;
    for (const s of [-1, 1]) K.block(L1 + s * (gw / 2 - 0.2), C_TOP, GATE_Z, 0.44, GATE_Y1 - C_TOP + 0.3, 0.7, 0x1f2a5a, 0.14, 1);
    K.add(P.rbox(gw, GATE_Y1 - GATE_Y0, 0.46, 0.14, 1), 0xff6b8b, L1, (GATE_Y0 + GATE_Y1) / 2, GATE_Z);
    K.box(L1, (GATE_Y0 + GATE_Y1) / 2, GATE_Z, gw, GATE_Y1 - GATE_Y0, 0.46);
    for (const y of [GATE_Y0 + 1.1, GATE_Y0 + 2.3]) K.add(P.box(gw - 0.5, 0.32, 0.5), 0xffffff, L1, y, GATE_Z);
    K.glow(P.box(gw - 0.9, 0.1, 0.5), 0xffe066, L1, GATE_Y0 - 0.03, GATE_Z);
    for (const s of [-1.5, 0, 1.5]) { const g = chevGeo(1.0, 0.55, 0.18); Geo.xf(g, 0, 0, 0, 0, 0, PI); Geo.xf(g, L1 + s, GATE_Y0 + 0.55, GATE_Z + 0.24); K.glowRaw(g, 0xffe066); }
    K.glow(P.box(gw - 0.9, 0.12, 0.06), 0xffe066, L1, GATE_Y0 + 0.06, GATE_Z + 0.25);
    for (const s of [-1, 1]) K.glow(P.box(0.08, GATE_Y0 - C_TOP, 0.06), 0xffe066, L1 + s * (gw / 2 - 0.45), (GATE_Y0 + C_TOP) / 2, GATE_Z + 0.37);
    // ramp support (the ramp itself is a G.Geo prop, baked below)
    K.block(L2, POOL_FLOOR - 0.1, 3.75, LW, -POOL_FLOOR + 0.1, 4.5, 0x5fc8ff, 0.2, 1);
    // pool coping
    const cop = 0xfff1dc;
    for (const [a, b] of [[POOL.x0 - 0.7, L1 - LW / 2 - 0.05], [L1 + LW / 2 + 0.05, L2 - LW / 2 - 0.05], [L2 + LW / 2 + 0.05, POOL.x1 + 0.7]]) K.add(P.rbox(b - a, 0.18, 0.7, 0.07, 1), cop, (a + b) / 2, 0.02, POOL.z1 + 0.15);
    K.add(P.rbox(0.7, 0.18, POOL.z1 - POOL.z0, 0.07, 1), cop, POOL.x0 - 0.15, 0.02, (POOL.z0 + POOL.z1) / 2);
    K.add(P.rbox(0.7, 0.18, POOL.z1 - POOL.z0, 0.07, 1), cop, POOL.x1 + 0.15, 0.02, (POOL.z0 + POOL.z1) / 2);
    // ---- gallery: shooting rail, lane lines, static target posts, backstop
    K.block(STAND_X, 0, -6, 0.6, 1.0, 18, 0x3e9e57, 0.14, 1);
    K.add(P.rbox(0.86, 0.12, 18.2, 0.05, 1), 0xffd23f, STAND_X, 1.04, -6);
    for (const z of [-15, -9, -3, 3]) { K.add(P.box(21, 0.025, 0.14), 0xffffff, STAND_X - 10.6, 0.012, z); K.add(P.rbox(0.3, 0.5, 0.3, 0.08, 1), 0xfff6e0, STAND_X, 1.3, z); K.add(P.sph(0.14, 8, 6), 0xff6b8b, STAND_X, 1.62, z); }
    for (const lz of LANES) for (let di = 0; di < 3; di++) {
      const x = tx(DISTS[di]), y = hf(x, lz);
      K.add(P.rbox(0.9, 0.22, 0.6, 0.08, 1), 0x1f2a5a, x, y + 0.11, lz);
      K.add(P.cyl(0.08, 0.1, 1.0, 8), 0x1f2a5a, x, y + 0.6, lz);
      K.add(P.cyl(0.06, 0.06, 1.0, 8), 0xe8b44a, x, y + 1.05, lz, 0, 0, PI / 2);
    }
    { const bx = -59, by = hf(bx, -6) - 1;
      K.block(bx, by, -6, 1.4, 9, 30, 0xff8fb8, 0.3, 1);
      for (let i = 0; i < 6; i++) K.add(P.box(1.45, 0.7, 30.04), i % 2 ? 0xffffff : 0xffd23f, bx, by + 1.6 + i * 1.2, -6);
      for (let i = 0; i < 9; i++) K.add(P.cyl(0.7, 0.7, 1.3, 14), 0xf2cf6a, bx + 1.6, by + 1.65, -19 + i * 3.2, PI / 2, 0, 0); }
    // pop-up challenge button podium
    { const [x, , z] = SP.popupBtn;
      K.add(P.cyl(0.7, 0.85, 1.0, 18), 0x1f2a5a, x, 0.5, z); K.add(P.tor(0.62, 0.08, 6, 20), 0xffd23f, x, 1.0, z, PI / 2, 0, 0);
      K.add(P.sph(0.5, 16, 10), 0xff4d5e, x, 1.0, z, 0, 0, 0, 1, 0.55, 1); K.cyl(x, z, 0.85, 0, 1.25); }
    // weapon rack
    { const [x, , z] = SP.rack, s = placer(K, x, 0, z, PI / 2);
      for (const sx of [-1.2, 1.2]) s.add(P.rbox(0.18, 2.0, 0.18, 0.06, 1), 0xa86a3c, sx, 1.0, 0);
      for (const y of [0.85, 1.55]) s.add(P.rbox(2.6, 0.12, 0.3, 0.05, 1), 0xd99a5b, 0, y, 0.05);
      s.add(P.rbox(2.9, 0.22, 0.5, 0.08, 1), 0xff6b5a, 0, 2.05, 0);
      const cols = [0x2ec4b6, 0xff6b6b, 0xff8fc0, 0x1f2a5a, 0x3ddc97, 0x8c7bff];
      cols.forEach((c, i) => { const yy = i < 3 ? 1.05 : 1.75, xx = -0.8 + (i % 3) * 0.8; s.add(P.cap(0.08, 0.42, 3, 8), c, xx, yy, 0.2, 0, 0, PI / 2); s.add(P.cyl(0.04, 0.04, 0.3, 6), 0xe8b44a, xx + 0.34, yy, 0.2, 0, 0, PI / 2); });
      K.box(x, 1, z, 0.7, 2.1, 2.8); }
    // tutorial podium (star) + coach pad
    { const [x, , z] = SP.podium; K.add(P.cyl(0.6, 0.75, 0.9, 16), 0xffd23f, x, 0.45, z); K.add(P.tor(0.55, 0.07, 6, 18), 0x1f2a5a, x, 0.9, z, PI / 2, 0, 0); K.cyl(x, z, 0.75, 0, 0.95); }
    { const [x, , z] = SP.coach; K.add(P.cyl(0.9, 1.0, 0.2, 20), 0x3fe0b8, x, 0.1, z); K.glow(P.tor(0.78, 0.05, 4, 22), 0xffe066, x, 0.21, z, PI / 2, 0, 0); }
    // exit gate arch (south)
    { const [x, , z] = SP.gate;
      for (const s of [-1, 1]) { K.block(x + s * 2.7, 0, z, 0.9, 3.8, 0.9, 0xff7a93, 0.3, 1); K.add(P.sph(0.42, 12, 8), 0xffd23f, x + s * 2.7, 4.05, z); }
      K.add(P.tor(2.7, 0.32, 8, 24, PI), 0xff9fc2, x, 3.6, z); K.glow(P.tor(2.25, 0.06, 4, 22, PI), 0xffe066, x, 3.6, z + 0.25);
      K.add(Geo.emblem('star').clone(), null, x, 6.35, z + 0.1, 0, 0, 0, 0.9); }
    // dummy pen fence ring + spar ring
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, x = SPAR.x + Math.cos(a) * (SPAR.r + 0.6), z = SPAR.z + Math.sin(a) * (SPAR.r + 0.6); if (Math.abs(a - PI * 0.0) < 0.5) continue; K.add(P.rbox(0.16, 0.7, 0.16, 0.05, 1), 0xfff6e0, x, 0.35, z); K.add(P.sph(0.1, 6, 5), 0xff6b8b, x, 0.75, z); }
    K.add(P.cyl(SPAR.r + 0.7, SPAR.r + 0.7, 0.05, 28), 0xf2dcae, SPAR.x, 0.02, SPAR.z);
    // kick corner: tall wall + high ledge (needs wall-kick + mantle)
    { const k = KICK, zc = (k.z0 + k.z1) / 2, d = k.z1 - k.z0;
      K.block(k.wx, 0, zc, 0.6, 6.2, d, 0x8c7bff, 0.2, 1);
      for (let i = 0; i < 5; i++) K.add(P.box(0.62, 0.36, d + 0.02), i % 2 ? 0xffffff : 0xffd23f, k.wx, 0.9 + i * 1.1, zc);
      K.block((k.lx0 + k.lx1) / 2, 0, zc, k.lx1 - k.lx0, k.top, d, 0x3fe0b8, 0.2, 1);
      K.add(P.rbox(k.lx1 - k.lx0 - 0.2, 0.08, d - 0.2, 0.03, 1), 0xfff6e0, (k.lx0 + k.lx1) / 2, k.top - 0.035, zc);
      for (const y of [0.9, 1.9, 2.9]) K.glowRaw(Geo.xf(chevGeo(1.0, 0.45, 0.14), k.wx + 0.32, y, zc, 0, PI / 2, 0), 0x9ff6ff); }
    // station icon signs (icons only, no 3D text)
    iconSign(K, -4.4, 2.6, PI / 2, 'target', 0xff6b8b);
    iconSign(K, 14.6, 7.4, 0, 'wing', 0x3fe0b8);
    iconSign(K, -12.4, 9.6, PI / 2, 'shield', 0xffd23f);
    iconSign(K, -6.6, 19.0, 0, 'coin', 0xff9a4c);
    iconSign(K, 4.2, -10.6, 0, 'star', 0x8c7bff);
    // decorative target balloons tied around the fence
    for (const [x, z, c] of [[-29, -19, 0xff6b8b], [29, -19, 0xffd23f], [-29, 19, 0x5fc8ff], [29, 19, 0x3fe0b8], [-29, 0, 0xb983ff], [29, 0, 0xff9a4c]]) {
      K.add(P.cyl(0.015, 0.015, 3.2, 4), 0xffffff, x, 2.4, z);
      K.add(P.sph(0.7, 14, 10), c, x, 4.6, z, 0, 0, 0, 1, 1.15, 1);
      K.add(ringGeo(0.25, 0.42, 20), 0xffffff, x, 4.7, z + 0.69);
    }
    const d = K.data();
    const mesh = kitMesh(d, G.M.vc({ rimStr: 0.22 }));
    mesh.name = 'yard';
    w.add(mesh);
    for (const c of d.c) { if (c.type === 'cyl') w.phys.addCyl(c.x, c.z, c.r, c.y0, c.y1); else w.phys.addBox(c.cx, c.cy, c.cz, c.sx, c.sy, c.sz); }
    // ---- G.Geo props, baked into one mesh
    const bakeG = new THREE.Group();
    const put = (prop, x, y, z, ry) => G.safe('place', () => Geo.place(w, prop, x, y, z, ry || 0, bakeG));
    put(Geo.ramp(LW, RAMP.len, E_TOP), RAMP.x, 0, RAMP.z, 0);
    const fy = 0xffd23f;
    for (let i = 0; i < 6; i++) put(Geo.fence(10, fy), -25 + i * 10, 0, -20.3, 0);
    for (let i = 0; i < 4; i++) { put(Geo.fence(10, fy), -30.3, 0, -15 + i * 10, PI / 2); put(Geo.fence(10, fy), 30.3, 0, -15 + i * 10, PI / 2); }
    for (let i = 0; i < 3; i++) { put(Geo.fence(9.1, fy), -26.5 + i * 9.1 + 0.05, 0, 20.3, 0); put(Geo.fence(9.1, fy), 7.95 + i * 9.1 - 0.05, 0, 20.3, 0); }
    const rnd = G.rng(26);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU, r = 44 + rnd() * 22, x = Math.cos(a) * r * 1.15, z = Math.sin(a) * r * 0.9;
      if (z > 18 && Math.abs(x) < 16) continue;
      if (x < -32 && z > -24 && z < 10) continue;   // keep the gallery lanes clear
      put(Geo.tree(rnd() < 0.3 ? 'palm' : 'round', 0.9 + rnd() * 0.6, (rnd() * 9 | 0) + 1, { palette: ['green', 'mint', 'pink', 'lime'][i % 4] }), x, hf(x, z) - 0.1, z, rnd() * TAU);
    }
    for (let i = 0; i < 10; i++) { const x = -26 + rnd() * 52, z = -24 - rnd() * 6; put(Geo.bush(0.9 + rnd() * 0.5, [0x5cc85a, 0x48b87a, 0x7ad35a][i % 3], i + 3), x, hf(x, z) - 0.05, z, rnd() * TAU); }
    if (Geo.building) {
      put(Geo.building('guild'), 0, 0, 56, PI);
      put(Geo.building('house', { seed: 3 }), -16, 0, 48, PI * 0.9);
      put(Geo.building('house', { seed: 8 }), 16, 0, 49, -PI * 0.9);
    }
    if (bakeG.children.length) { const baked = Geo.bake(bakeG); baked.name = 'props'; w.add(baked); }
    if (Geo.distantMountains) { const hm = G.safe('mtn', () => Geo.distantMountains(170, 22, [0x8fd6a0, 0x7cc89a, 0xf2b98a, 0xc4cff5], { haze: 0xc4ecf8, seed: 26 })); if (hm) w.add(hm); }
    if (Geo.scatter && Geo.grassTuftGeo) {
      const avoid = (x, z) => (Math.abs(x) < 31.5 && Math.abs(z) < 21.5) || (z > 21 && Math.abs(x) < 4) || (x < -31 && z > -18 && z < 6);
      w.add(Geo.scatter({ count: 320 * G.R.q().props, area: { minX: -75, maxX: 75, minZ: -60, maxZ: 70 }, heightFn: hf, avoid, geo: Geo.grassTuftGeo(1, 0x4aa85a, 0xbfe870), scale: [0.8, 1.5], seed: 5 }));
      if (Geo.flowerGeo) w.add(Geo.scatter({ count: 90 * G.R.q().props, area: { minX: -70, maxX: 70, minZ: -55, maxZ: 65 }, heightFn: hf, avoid, geo: Geo.flowerGeo(4, [0xff7a93, 0xffd45c, 0xffffff]), scale: [0.8, 1.3], seed: 9 }));
    }
  }

  // ================================================================== target art (cached kits; per-instance flash material)
  function balloonData(col) {
    return kitData('tb|' + col, (k, P) => {
      k.add(P.sph(0.55, 18, 14), col, 0, 0.62, 0, 0, 0, 0, 1, 1.12, 1);
      k.add(P.sph(0.16, 8, 6), lighten(col, 0.7), -0.22, 0.95, 0.34, 0, 0, 0, 1, 1.4, 0.6);
      k.add(P.cone(0.1, 0.16, 8), darken(col, 0.2), 0, -0.02, 0, PI, 0, 0);
      k.add(P.cyl(0.012, 0.012, 1.2, 4), 0xfff6e0, 0, -0.66, 0);
      k.add(P.sph(0.3, 14, 10), 0x1e2457, 0, 0.66, 0.42, 0, 0, 0, 1.05, 0.62, 0.36);
      k.glow(P.sph(0.065, 8, 6), 0x7ff3ff, -0.12, 0.7, 0.53); k.glow(P.sph(0.065, 8, 6), 0x7ff3ff, 0.12, 0.7, 0.53);
      k.glow(P.tor(0.07, 0.02, 4, 10, PI), 0x7ff3ff, 0, 0.6, 0.53, 0, 0, PI);
    });
  }
  function diskData(R) {
    return kitData('td|' + R, (k, P) => {
      k.add(P.cyl(R, R, 0.1, 28), 0x1f2a5a, 0, R, 0, PI / 2, 0, 0);
      const bands = [[0, 0.2, 0xffd23f], [0.2, 0.45, 0xff5f7a], [0.45, 0.7, 0xffffff], [0.7, 0.9, 0xff5f7a], [0.9, 1.0, 0xffffff]];
      for (const b of bands) k.add(ringGeo(b[0] * R, b[1] * R, 28), b[2], 0, R, 0.052);
      k.add(P.box(0.06, 0.16, 0.1), 0xe8b44a, 0, 0.06, 0);
    });
  }
  function sledData() {
    return kitData('tsled', (k, P) => {
      k.add(P.rbox(0.9, 0.24, 0.7, 0.08, 1), 0x1f2a5a, 0, 0.12, 0);
      k.add(P.cyl(0.08, 0.1, 1.0, 8), 0x1f2a5a, 0, 0.62, 0);
      k.add(P.cyl(0.06, 0.06, 1.0, 8), 0xe8b44a, 0, 1.05, 0, 0, 0, PI / 2);
      for (const sx of [-0.35, 0.35]) for (const sz of [-0.25, 0.25]) k.add(P.cyl(0.11, 0.11, 0.08, 10), 0xffd23f, sx, 0.08, sz, 0, 0, PI / 2);
    });
  }
  function dummyData() {
    return kitData('tdummy', (k, P) => {
      k.add(P.cyl(0.45, 0.5, 0.14, 18), 0x1f2a5a, 0, 0.07, 0);
      for (let i = 0; i < 3; i++) k.add(P.tor(0.22, 0.05, 6, 14), 0xe8b44a, 0, 0.22 + i * 0.1, 0, PI / 2, 0, 0);
      k.add(P.cyl(0.4, 0.36, 0.78, 18), 0xffd23f, 0, 0.82, 0);
      for (const y of [0.62, 1.0]) k.add(P.tor(0.405, 0.05, 6, 20), 0x3fe0b8, 0, y, 0, PI / 2, 0, 0);
      for (const s of [-1, 1]) { k.add(P.cap(0.08, 0.36, 3, 8), 0xffd23f, s * 0.58, 1.05, 0, 0, 0, PI / 2); k.add(P.sph(0.14, 10, 8), 0xfff1dc, s * 0.85, 1.05, 0); }
      k.add(P.sph(0.33, 18, 12), 0xfff1dc, 0, 1.55, 0);
      k.add(P.sph(0.06, 8, 6), 0x1e1a4d, -0.12, 1.66, 0.29); k.add(P.sph(0.06, 8, 6), 0x1e1a4d, 0.12, 1.66, 0.29);
      k.glow(P.tor(0.13, 0.035, 6, 18), 0xff6b8b, 0, 1.48, 0.3); k.glow(P.sph(0.05, 8, 6), 0xffd23f, 0, 1.48, 0.32);
      k.add(P.cyl(0.02, 0.02, 0.24, 5), 0x1f2a5a, 0, 1.97, 0); k.glow(P.sph(0.06, 8, 6), 0xff6b8b, 0, 2.1, 0);
    });
  }
  function decoyData() {
    return kitData('tdecoy', (k, P) => {
      const sh = new THREE.Shape(); sh.absarc(0, 0, 0.5, 0, TAU, false);
      const body = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 20 }); body.deleteAttribute('uv'); body.translate(0, 0, -0.025);
      k.add(body, (x, y, z, nx, ny, nz) => (nz > 0.5 ? 0xffb3d0 : 0xd9b07a), 0, 1.25, 0);
      for (const s of [-1, 1]) { const wg = new THREE.ExtrudeGeometry(new THREE.Shape().absarc(0, 0, 0.18, 0, TAU, false), { depth: 0.04, bevelEnabled: false, curveSegments: 12 }); wg.deleteAttribute('uv'); k.add(wg, (x, y, z, nx, ny, nz) => (nz > 0.5 ? 0xffd6e6 : 0xd9b07a), s * 0.52, 1.22, -0.02); }
      k.add(P.sph(0.06, 8, 6), 0x1e1a4d, -0.15, 1.36, 0.04, 0, 0, 0, 1, 1, 0.4); k.add(P.sph(0.06, 8, 6), 0x1e1a4d, 0.15, 1.36, 0.04, 0, 0, 0, 1, 1, 0.4);
      k.add(P.cone(0.07, 0.14, 8), 0xff9a4c, 0, 1.24, 0.08, PI / 2, 0, 0);
      k.add(P.sph(0.07, 8, 6), 0xff7aa8, -0.28, 1.2, 0.03, 0, 0, 0, 1, 0.6, 0.3); k.add(P.sph(0.07, 8, 6), 0xff7aa8, 0.28, 1.2, 0.03, 0, 0, 0, 1, 0.6, 0.3);
      k.add(G.Geo.emblem('heart').clone(), null, 0, 0.98, 0.05, 0, 0, 0, 0.32);
      k.add(P.box(0.08, 0.9, 0.06), 0xd99a5b, 0, 0.45, -0.06);
      k.add(P.rbox(0.5, 0.1, 0.3, 0.04, 1), 0xa86a3c, 0, 0.05, -0.06);
    });
  }
  function chestData(lid) {
    return kitData('tchest|' + (lid ? 1 : 0), (k, P) => {
      if (!lid) {
        k.add(P.rbox(1.2, 0.7, 0.8, 0.1, 1), 0xd99a5b, 0, 0.35, 0);
        for (const sx of [-0.45, 0.45]) k.add(P.box(0.12, 0.72, 0.82), 0xffc21a, sx, 0.36, 0);
        k.add(P.rbox(0.24, 0.26, 0.08, 0.04, 1), 0xffc21a, 0, 0.6, 0.41);
      } else {
        const lg = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16, 1, false, 0, PI); lg.deleteAttribute('uv');
        k.add(lg, 0xff8a4c, 0, 0, 0.4, 0, 0, PI / 2);
        for (const sx of [-0.45, 0.45]) { const b = new THREE.CylinderGeometry(0.41, 0.41, 0.12, 16, 1, false, 0, PI); b.deleteAttribute('uv'); k.add(b, 0xffc21a, sx, 0, 0.4, 0, 0, PI / 2); }
        k.add(G.Geo.emblem('star').clone(), null, 0, 0.3, 0.75, -0.6, 0, 0, 0.32);
      }
    });
  }

  // ================================================================== practice actors
  const TK = { balloon: { r: 0.56, h: 1.25, hp: 1, kind: 'balloon' }, panel: { r: 0.6, h: 1.3, hp: 1, kind: 'target' }, dummy: { r: 0.5, h: 1.95, hp: 220, kind: 'dummy', critY: 1.22 }, decoy: { r: 0.55, h: 1.25, hp: 1, kind: 'target' } };
  const BALLOON_COLS = [0xff6b8b, 0xffd23f, 0x3fe0b8, 0x5fc8ff, 0xb983ff, 0xff9a4c];
  // kind: balloon | panel | dummy | decoy.  o: {pos:[x,y,z], rotY, size, points, respawn, mover, base, color, onPop}
  class PTarget extends G.Actor {
    constructor(world, kind, o) {
      const k = TK[kind];
      const R = o.size || 0.55;
      super(world, { r: kind === 'panel' ? R + 0.06 : k.r, h: kind === 'panel' ? R * 2 + 0.1 : k.h, team: 1, hp: o.hp || k.hp, kind: k.kind });
      this.practice = true; this.noCount = true; this.enemyId = null; this.tk = kind; this.o = o;
      this.points = o.points || 0;
      this.home = new V3().fromArray(o.pos || [0, 0, 0]);
      this.gy = kind === 'balloon' ? this.home.y : (o.gy != null ? o.gy : world.phys.groundAt(this.home.x, this.home.z, 0.1, 50));
      this.rotY = o.rotY || 0;
      this.lift = 0; this.want = o.startDown ? 0 : 1; this.life = 0; this.reT = -1; this.popT = 0; this.flash = 0; this.wob = 0; this.wobV = 0;
      this.phase = Math.random() * TAU; this.autoRespawn = o.respawn != null && o.respawn >= 0;
      this.mmColor = kind === 'decoy' ? '#ffb3d0' : '#ffd23f';
      if (k.critY) this.critY = k.critY;
      if (kind === 'decoy') this.hidden = true;     // never auto-targeted (but shots still hit it)
      this.mat = G.M.toonUnique(0xffffff, { vc: true, spec: 0.55, rimStr: 0.45 });
      const root = new THREE.Group();
      root.position.set(this.home.x, kind === 'balloon' ? this.home.y : this.gy, this.home.z);
      root.rotation.y = this.rotY;
      if (kind === 'balloon') { this.body = kitMesh(balloonData(o.color || BALLOON_COLS[(Math.random() * BALLOON_COLS.length) | 0]), this.mat); root.add(this.body); }
      else if (kind === 'panel') {
        if (o.base) root.add(kitMesh(sledData()));
        this.pivot = new THREE.Group(); this.pivot.position.y = 1.08; root.add(this.pivot);
        this.body = kitMesh(diskData(R), this.mat); this.pivot.add(this.body);
      } else if (kind === 'dummy') { this.body = kitMesh(dummyData(), this.mat); root.add(this.body); }
      else { this.pivot = new THREE.Group(); root.add(this.pivot); this.body = kitMesh(decoyData(), this.mat); this.pivot.add(this.body); }
      this.mesh = root;
      this.syncPos();
      if (this.want === 0) { this.alive = false; this.targetable = false; this.lift = 0; root.visible = kind !== 'balloon' && kind !== 'decoy'; this.applyLift(); }
      else { this.lift = o.popIn ? 0 : 1; this.applyLift(); }
    }
    syncPos() {
      const m = this.mesh.position;
      if (this.tk === 'panel') this.pos.set(m.x, this.gy + 1.02, m.z);
      else if (this.tk === 'decoy') this.pos.set(m.x, this.gy + 0.6, m.z);
      else this.pos.set(m.x, m.y, m.z);
    }
    applyLift() {
      const L = this.lift;
      if (this.tk === 'panel' || this.tk === 'decoy') {
        const e = L >= 1 ? 1 : 1 - Math.pow(1 - L, 3) * (1 - 2.2 * L * (1 - L));
        this.pivot.rotation.x = -(1 - e) * PI / 2;
      } else if (this.tk === 'balloon') {
        const s = L >= 1 ? 1 : Math.max(0.001, 1 + 0.25 * Math.sin(L * PI) - (1 - L) * (1 - L));
        this.body.scale.setScalar(s);
      } else this.body.scale.setScalar(Math.max(0.001, L >= 1 ? 1 : 1 - (1 - L) * (1 - L) + 0.2 * Math.sin(L * PI)));
    }
    show(life) {
      this.alive = true; this.dead = false; this.hp = this.maxHp; this.want = 1; this.life = life || 0; this.popT = 0; this.reT = -1;
      this.mesh.visible = true; if (this.tk !== 'panel' && this.tk !== 'decoy') this.lift = Math.min(this.lift, 0.01);
      this.body.scale.setScalar(this.tk === 'balloon' || this.tk === 'dummy' ? 0.001 : 1);
      if (this.tk === 'panel' || this.tk === 'decoy') this.body.scale.setScalar(1);
    }
    hide() { this.want = 0; this.life = 0; if (this.tk === 'decoy' || this.tk === 'panel') this.targetable = false; }
    get up() { return this.alive && this.want === 1 && this.lift > 0.9; }
    onHurt(info, amt) { this.flash = 1; this.wobV += Math.min(6, 1.5 + amt * 0.05) * (Math.random() < 0.5 ? -1 : 1); }
    onDeath(info) {
      const w = this.world, p = this.aimPoint(_v1);
      this.flash = 1; this.popT = 0.001; this.want = 0; this.life = 0;
      if (this.autoRespawn) this.reT = this.o.respawn;
      const col = this.tk === 'decoy' ? [0xd9b07a, 0xffb3d0, 0xffffff] : this.tk === 'panel' ? [0xff5f7a, 0xffd23f, 0xffffff] : [0xff6b8b, 0xffd23f, 0x3fe0b8, 0xffffff];
      w.fx.burst(p, col, this.tk === 'balloon' ? 22 : 14, 6, 0.24, 0.6, { normal: true, grav: 9, alpha: 0.95 });
      if (this.tk !== 'decoy') w.fx.confetti(p, 18);
      w.fx.ring(p, 1.4, 0xffffff, 0.3);
      if (G.Audio) G.Audio.sfxAt(this.tk === 'balloon' ? 'splat' : this.tk === 'decoy' ? 'error' : 'enemyDie', p, { pitch: this.tk === 'balloon' ? 1.5 : 1.2 });
      if (this.o.onPop) G.safe('onPop', () => this.o.onPop(this, info));
    }
    update(dt) {
      this.applyStatus(dt);
      const t = this.world.time;
      this.flash = Math.max(0, this.flash - dt * 7);
      const f = this.flash * 0.85;
      this.mat.emissive.setRGB(f, f, f);
      // spring wobble (dummies, decoys)
      this.wobV += (-this.wob * 60 - this.wobV * 6) * dt; this.wob += this.wobV * dt;
      if (this.life > 0 && this.alive) { this.life -= dt; if (this.life <= 0) this.hide(); }
      const rate = this.want ? 4.2 : 6.5;
      this.lift = U.clamp(this.lift + (this.want ? dt : -dt) * rate, 0, 1);
      if (!this.alive && this.want === 0 && (this.tk === 'balloon' || this.tk === 'dummy')) {
        if (this.popT > 0) { this.popT += dt; const k = Math.min(1, this.popT / 0.18); this.body.scale.setScalar(Math.max(0.001, (1 + 0.5 * k) * (1 - k))); if (k >= 1) { this.mesh.visible = false; this.popT = 0; } }
      } else this.applyLift();
      if (this.tk === 'panel' || this.tk === 'decoy') {
        if (!this.alive && this.lift <= 0 && this.tk === 'decoy') this.mesh.visible = false;
        if (this.alive && this.want === 0 && this.lift <= 0) { this.alive = false; }
        this.targetable = this.alive && this.lift > 0.85;
      } else this.targetable = this.alive;
      if (this.o.mover) { const m = this.o.mover; this.mesh.position.z = this.home.z + Math.sin(t * m.speed + this.phase) * m.amp; }
      if (this.tk === 'balloon') {
        this.mesh.position.y = this.home.y + Math.sin(t * 1.7 + this.phase) * 0.16;
        this.mesh.position.x = this.home.x + Math.sin(t * 0.6 + this.phase * 2) * 0.12;
        const cam = G.R.camera; this.mesh.rotation.y = Math.atan2(cam.position.x - this.mesh.position.x, cam.position.z - this.mesh.position.z);
        this.mesh.rotation.z = Math.sin(t * 1.3 + this.phase) * 0.08;
      }
      if (this.tk === 'dummy') { this.body.rotation.z = this.wob * 0.25; this.body.rotation.x = Math.sin(t * 2 + this.phase) * 0.02; if (this.alive && this.hp < this.maxHp && t - this.lastHitT > 2.2) this.hp = this.maxHp; }
      if (this.tk === 'decoy') this.body.rotation.z = this.wob * 0.15;
      this.syncPos();
      if (this.reT > 0) { this.reT -= dt; if (this.reT <= 0) { this.reT = -1; this.show(); } }
    }
    dispose() { if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh); this.mat.dispose(); }
  }

  // Wood / metal crate (GDD §8.2: wood 1 hit, metal 3 hits or one blast). o: {bank, parts, clinks, respawn, onBreak}
  class TCrate extends G.Actor {
    constructor(world, kind, pos, o) {
      super(world, { r: 0.58, h: 0.95, team: 1, hp: 1, kind: 'crate' });
      this.practice = true; this.noCount = true; this.ck = kind; this.o = o || {};
      this.hits = kind === 'metal' ? 3 : 1; this.flash = 0; this.sq = 0; this.reT = -1; this.mmColor = '#e8b06a';
      this.home = new V3().fromArray(pos); this.pos.copy(this.home); this.pos.y = world.phys.groundAt(pos[0], pos[2], 0.1, 50);
      const m = G.Geo.crate(kind === 'metal' ? 'rare' : 'bolt');
      this.mat = G.M.toonUnique(0xffffff, { vc: true, rimStr: 0.4 });
      m.material = this.mat;
      if (kind === 'metal') m.scale.set(1.08, 1.08, 1.08);
      this.mesh = new THREE.Group(); this.mesh.add(m); this.box = m;
      this.mesh.position.copy(this.pos); this.mesh.rotation.y = (Math.random() - 0.5) * 0.6;
      this.collider = world.phys.addBox(this.pos.x, this.pos.y + 0.45, this.pos.z, 0.9, 0.9, 0.9);
    }
    takeDamage(amount, info) {
      if (!this.alive) return { dealt: 0, toShield: 0, killed: false };
      this.hits -= info && (info.type === 'explosion' || info.type === 'splash') ? 99 : 1;
      this.lastHitT = this.world.time; this.flash = 1; this.sq = 1;
      const killed = this.hits <= 0;
      if (killed) { this.alive = false; this.hp = 0; this.onDeath(info || {}); }
      else if (G.Audio) G.Audio.sfxAt('hit', this.pos, { pitch: 0.7 });
      return { dealt: amount, toShield: 0, killed };
    }
    onDeath() {
      const w = this.world, p = _v1.set(this.pos.x, this.pos.y + 0.5, this.pos.z);
      w.fx.flash(p, 0xffffff, 2.2, 0.07);
      w.fx.burst(p, this.ck === 'metal' ? [0x7f8cd8, 0xe8eefc, 0x9ff0ff] : [0xd99a5b, 0xa86a3c, 0xffe0b0], 10, 6, 0.28, 1.0, { normal: true, grav: 14, alpha: 1 });
      w.fx.smoke(p, 5);
      if (G.Audio) G.Audio.sfxAt('grenade', p, { pitch: this.ck === 'metal' ? 0.8 : 1.2 });
      const n = this.o.clinks != null ? this.o.clinks : (this.ck === 'metal' ? U.randInt(15, 30) : U.randInt(6, 12));
      const v = p.clone();
      if (n > 0) w.pickups.boltBurst(v, n);
      // (tag: the tutorial crate's index, so its loot is banked once even across a reload)
      const tag = this.o.tag != null ? this.o.tag : null;
      for (const it of w.pickups.items) if (it.type === 'bolt' && it.age === 0 && it.data.tutCrate == null) { it.data.practice = !this.o.bank; if (tag !== null) it.data.tutCrate = tag; }
      for (const id of (this.o.parts || [])) w.pickups.spawn('part', v, { partId: id, rarity: (G.Data && G.Data.PARTS && G.Data.PARTS[id] && G.Data.PARTS[id].rarity) || 'common', practice: !this.o.bank, tutCrate: tag });
      this.mesh.visible = false;
      if (this.collider) { w.phys.remove(this.collider); this.collider = null; }
      if (this.o.bank) G.bus.emit('crate-break', this.ck);
      if (this.o.respawn > 0) this.reT = this.o.respawn;
      if (this.o.onBreak) G.safe('crate', () => this.o.onBreak(this));
    }
    revive() {
      this.alive = true; this.hits = this.ck === 'metal' ? 3 : 1; this.mesh.visible = true; this.sq = -1;
      if (!this.collider) this.collider = this.world.phys.addBox(this.pos.x, this.pos.y + 0.45, this.pos.z, 0.9, 0.9, 0.9);
      this.world.fx.ring(_v1.copy(this.pos).setY(this.pos.y + 0.05), 1.2, 0xffe066, 0.35);
    }
    update(dt) {
      this.flash = Math.max(0, this.flash - dt * 12);
      this.mat.emissive.setRGB(this.flash, this.flash, this.flash);
      this.sq = U.damp(this.sq, 0, 9, dt);
      const s = 1 + this.sq * 0.2;
      this.box.scale.set((this.ck === 'metal' ? 1.08 : 1) * s, (this.ck === 'metal' ? 1.08 : 1) / s, (this.ck === 'metal' ? 1.08 : 1) * s);
      if (this.reT > 0) { this.reT -= dt; if (this.reT <= 0) { this.reT = -1; this.revive(); } }
    }
    dispose() { if (this.collider) { this.world.phys.remove(this.collider); this.collider = null; } if (this.mesh.parent) this.mesh.parent.remove(this.mesh); this.mat.dispose(); }
  }

  // Sparring bot: robot art, strafes in its pen and lobs slow bubbles that barely sting.
  // o: {home:[x,z], leash, hp, dmg, passive, respawn, aggro, onPop}
  // Weak spot, hit flinch and pop-in match the in-mission robots (17 E.attachCore, rb.hit, rb.spawnIn).
  const _sbo = { speed: 0, vx: 0, vz: 0, yaw: 0, aim: 0 };   // one reused animateRobot opts object (no per-frame allocation)
  class SparBot extends G.Actor {
    constructor(world, o) {
      super(world, { r: 0.55, h: 1.6, team: 1, hp: o.hp || 120, kind: 'dummy' });
      this.practice = true; this.noCount = true; this.enemyId = null; this.o = o; this.mmColor = '#ff9a4c';
      const base = (G.Geo.robotPresets && G.Geo.robotPresets.plinker) || { body: 'capsule', mobility: 'legs2', arms: 'blaster', size: 1.3 };
      this.rb = G.Geo.robot(Object.assign({}, base, { color: 0xff9a4c, accent: 0xfff1dc, eyes: 'toon', mood: 'happy', emblem: 'star', armor: 0, size: 1.15, seed: 77 }, o.spec || {}));
      this.mesh = this.rb.group;
      this.h = Math.max(1.2, this.rb.height * 0.95); this.r = U.clamp(this.rb.radius * 0.85, 0.42, 0.7);
      // crits on the glowing chest battery (not the old face line), like every Gizmob on a mission
      if (G.Enemies && G.Enemies.attachCore) { this.critY = null; G.Enemies.attachCore(this, this.rb); } else this.critY = this.rb.critY - 0.04;
      this.home = new V3(o.home[0], 0, o.home[1]); this.home.y = world.phys.groundAt(this.home.x, this.home.z, 0.1, 50);
      this.pos.copy(this.home); this.yaw = o.yaw || 0; this.fireT = 2 + Math.random(); this.windT = 0; this.state = 'idle';
      this.reT = -1; this.strafe = Math.random() * TAU; this.breathT = 0;
      this.mesh.position.copy(this.pos); this.mesh.rotation.y = this.yaw;
      if (o.popIn && this.rb.spawnIn) this.rb.spawnIn();
    }
    onHurt(info) {
      this.hurtT = 0.25;
      // directional flinch: the blow's travel direction (shot dir, else away from the source)
      if (this.rb.hit && this.alive) {
        let hx = 0, hz = 0;
        if (info && info.dir) { hx = info.dir.x; hz = info.dir.z; } else if (info && info.src && info.src.pos) { hx = this.pos.x - info.src.pos.x; hz = this.pos.z - info.src.pos.z; }
        this.rb.hit(hx, hz, 0.6);
      }
    }
    onDeath(info) {
      const w = this.world, p = this.aimPoint(_v1);
      this.state = 'dead';
      w.fx.confetti(p, 30); w.fx.burst(p, [0xff9a4c, 0xffd23f, 0xffffff], 18, 7, 0.3, 0.7, { normal: true, grav: 10 });
      if (G.Audio) G.Audio.sfxAt('enemyDie', p);
      if (this.o.respawn > 0) this.reT = this.o.respawn;
      if (this.o.onPop) G.safe('spar pop', () => this.o.onPop(this, info));
    }
    revive() {
      this.alive = true; this.hp = this.maxHp; this.state = 'idle'; this.pos.copy(this.home);
      this.rb.group.visible = true; this.rb.popped = false; this.rb.parts.rig.scale.set(1, 1, 1); this.rb.anim.state = 'idle'; this.rb.setFlash(0);
      if (this.rb.spawnIn) this.rb.spawnIn();
      this.world.fx.ring(_v1.copy(this.home).setY(this.home.y + 0.05), 1.6, 0xffe066, 0.4);
    }
    update(dt) {
      this.applyStatus(dt);
      const w = this.world, t = w.time, pl = w.player;
      if (!this.alive) {
        if (!this.rb.popped) G.Geo.animateRobot(this.rb, 'dead', t, dt);
        if (this.reT > 0) { this.reT -= dt; if (this.reT <= 0) { this.reT = -1; this.revive(); } }
        return;
      }
      const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      const active = !this.o.passive && pl.alive && d < (this.o.aggro || 14) && !G.UI.anyOpen();
      let speed = 0, state = 'idle', vx = 0, vz = 0;
      if (active) {
        this.yaw = U.angleDamp(this.yaw, Math.atan2(dx, dz), 6, dt);
        // strafe around home inside the leash
        this.strafe += dt * 0.7;
        const L = this.o.leash || 2.4;
        const tx = this.home.x + Math.cos(this.strafe) * L * 0.8, tz = this.home.z + Math.sin(this.strafe * 1.3) * L * 0.6;
        const mx = tx - this.pos.x, mz = tz - this.pos.z, ml = Math.hypot(mx, mz);
        if (ml > 0.1) { const sp = Math.min(1.5, ml * 2); vx = mx / ml * sp; vz = mz / ml * sp; this.pos.x += vx * dt; this.pos.z += vz * dt; speed = sp; }
        const low = pl.hp / pl.maxHp < 0.4;
        if (low) { if (!this.breathT) { this.breathT = 1; G.HUD && G.HUD.feed(G.t('train.breather'), 'rgba(63,224,184,.85)'); } }
        else this.breathT = 0;
        if (this.windT > 0) {
          this.windT -= dt; state = 'windup';
          if (this.windT <= 0) this.fire(pl);
        } else {
          this.fireT -= dt;
          if (this.fireT <= 0 && !low && w.phys.los(this.aimPoint(_v2), pl.eyePos(_v3), false)) { this.windT = 0.75; this.fireT = 2.4 + Math.random() * 0.8; if (G.Audio) G.Audio.sfxAt('enemyCharge', this.pos, { pitch: 1.3 }); }
        }
        if (state === 'idle') state = speed > 0.2 ? 'move' : 'idle';
      } else { this.yaw = U.angleDamp(this.yaw, this.o.yaw || 0, 2, dt); state = 'idle'; }
      if (this.hurtT > 0) { this.hurtT -= dt; if (state !== 'windup') state = 'hurt'; }
      this.pos.y = w.phys.groundAt(this.pos.x, this.pos.z, 0.3, this.pos.y + 1);
      this.mesh.position.copy(this.pos); this.mesh.rotation.y = this.yaw;
      _sbo.speed = speed; _sbo.vx = vx; _sbo.vz = vz; _sbo.yaw = this.yaw; _sbo.aim = active ? Math.atan2((pl.pos.y + 1.2) - (this.pos.y + 1), Math.max(1, d)) : 0;
      G.Geo.animateRobot(this.rb, state, t, dt, _sbo);
    }
    fire(pl) {
      const w = this.world;
      const from = this.rb.muzzleWorld ? this.rb.muzzleWorld(_v2) : this.aimPoint(_v2);
      const to = _v3.set(pl.pos.x + pl.vel.x * 0.35, pl.pos.y + 1.1, pl.pos.z + pl.vel.z * 0.35);
      const dir = to.sub(from).normalize();
      w.projectiles.spawn({ pos: from.clone(), dir, speed: 9, damage: this.o.dmg || 3, src: this, team: 1, kind: 'orb', color: 0xffb03a, size: 0.2, radius: 0.22, life: 3.2 });
      if (G.Audio) G.Audio.sfxAt('enemyShoot', from, { pitch: 1.4 });
      this.rb.kick(1);
    }
    dispose() { if (this.rb && this.rb.dispose) this.rb.dispose(); else if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh); }
  }

  // ================================================================== small world helpers: goal ring, NPCs, chest, ghost runner
  function makeGoal(world) {
    const g = new THREE.Group(); g.visible = false;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.09, 8, 40), G.M.glowMat(0xffe066, 0.95)); ring.rotation.x = PI / 2; ring.position.y = 0.08;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), G.M.glowMat(0xffe066, 0.14)); disc.rotation.x = -PI / 2; disc.position.y = 0.05;
    const bg = new THREE.CylinderGeometry(1.05, 1.22, 5, 24, 6, true); bg.translate(0, 2.5, 0);
    G.Geo.colorize(bg, (x, y) => { const k = Math.pow(1 - U.clamp(y / 5, 0, 1), 2.2) * 0.32; return new THREE.Color(0xffe066).multiplyScalar(k); });
    const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, forceSinglePass: true }));
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 12), G.M.toon(0xffd23f, { emissive: 0xffd23f, ei: 0.35 })); arrow.rotation.x = PI;
    g.add(ring, disc, beam, arrow); world.add(g);
    const o = {
      group: g, pos: g.position, on: false,
      show(x, y, z) { g.position.set(x, y, z); g.visible = true; o.on = true; },
      hide() { g.visible = false; o.on = false; G.HUD.removeMarker('tut-goal'); },
      update(dt, t) {
        if (!o.on) return;
        ring.scale.setScalar(1 + 0.08 * Math.sin(t * 5)); arrow.position.y = 2.4 + 0.25 * Math.sin(t * 4); arrow.rotation.y += dt * 2;
        // the beam is a far-away beacon: fade it as the player closes in so it never washes out the view
        const cp = G.R.camera.position; beam.material.opacity = U.clamp((Math.hypot(cp.x - g.position.x, cp.z - g.position.z) - 1.5) / 10, 0.25, 1);
        G.HUD.marker('tut-goal', _v4.set(g.position.x, g.position.y + 3.0, g.position.z), { icon: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 8l7 9 7-9z" fill="#1e1a4d"/></svg>', color: '#ffd23f', dist: true });
      },
    };
    return o;
  }
  function makeNpc(kind) {
    if (G.Geo.npc && (G.Geo.NPC_KINDS || []).includes(kind)) { const n = G.safe('npc ' + kind, () => G.Geo.npc(kind)); if (n && n.group) return n; }
    const k = new G.Geo.Kit(), P = G.Geo.P;
    k.add(P.sph(0.3, 16, 12), kind === 'coach' ? 0xf0fbff : 0xfff1dc, 0, 1.3, 0);
    k.add(P.sph(0.2, 12, 8), 0x1b2a4a, 0, 1.33, 0.16, 0, 0, 0, 1, 0.8, 0.5);
    k.glow(P.sph(0.04, 6, 4), 0x39d5ff, -0.07, 1.35, 0.27); k.glow(P.sph(0.04, 6, 4), 0x39d5ff, 0.07, 1.35, 0.27);
    if (kind === 'coach') k.add(P.cyl(0.32, 0.32, 0.06, 16), 0xff6b5a, 0, 1.55, 0);
    const d = k.data(), m = kitMesh(d), group = new THREE.Group(); group.add(m);
    return { group, animate(t) { m.position.y = 0.06 * Math.sin(t * 2.2); }, greet() {}, setExpr() {} };
  }

  // ================================================================== gallery (free play, Try It and the Pop-Up Challenge)
  class Gallery {
    constructor(R) {
      this.R = R; this.mode = 'idle';
      const w = R.world, onPop = (t, info) => R.onTargetPop(t, info);
      this.panels = []; this.movers = []; this.balloons = []; this.decoys = []; this.dummies = [];
      LANES.forEach((lz, li) => DISTS.forEach((d, di) => {
        const x = tx(d), y = hf(x, lz);
        const p = new PTarget(w, 'panel', { pos: [x, y, lz], gy: y, rotY: PI / 2, size: [0.62, 0.56, 0.5][di], points: PTS[di], respawn: 2.2, onPop });
        p.lane = li; p.di = di; this.panels.push(p); w.addActor(p);
      }));
      LANES.forEach((lz, li) => {
        const x = tx(17), y = hf(x, lz);
        const m = new PTarget(w, 'panel', { pos: [x, y, lz], gy: y, rotY: PI / 2, size: 0.5, base: true, points: 100, respawn: 1.8, mover: { speed: 0.8 + li * 0.35, amp: 1.9 }, onPop });
        this.movers.push(m); w.addActor(m);
      });
      for (let i = 0; i < 3; i++) { const b = new PTarget(w, 'balloon', { pos: this.balloonSpot(i), points: 100, onPop }); b.bT = 0; this.balloons.push(b); w.addActor(b); }
      const dspots = [[tx(13), -10.2], [tx(21), -4.2], [tx(33), 1.4]];
      for (const s of dspots) { const dc = new PTarget(w, 'decoy', { pos: [s[0], hf(s[0], s[1]), s[1]], rotY: PI / 2, startDown: true, points: -100, onPop }); this.decoys.push(dc); w.addActor(dc); }
      for (const s of [[tx(15), -9], [tx(30), -3]]) { const dm = new PTarget(w, 'dummy', { pos: [s[0], hf(s[0], s[1]), s[1]], rotY: PI / 2, points: 100, respawn: 2.4, onPop }); this.dummies.push(dm); w.addActor(dm); }
    }
    balloonSpot(i) {
      const lz = LANES[(i != null ? i : (Math.random() * 3) | 0) % 3] + U.rand(-1.6, 1.6), x = tx(U.rand(12, 38));
      return [x, hf(x, lz) + U.rand(1.7, 3.3), lz];
    }
    setMode(m) {
      this.mode = m;
      for (const p of this.panels) { p.autoRespawn = m === 'idle'; if (m === 'idle') { if (!p.alive || p.want === 0) p.show(); } else p.hide(); }
      for (const d of this.decoys) d.hide();
      // dummies are for damage numbers only: they bow out (shrink away) for the score attack and come back after
      for (const d of this.dummies) {
        if (m === 'idle') { if (!d.alive) { d.reT = -1; d.show(); } }
        else if (d.alive) { d.alive = false; d.targetable = false; d.want = 0; d.reT = -1; d.popT = 0.001; }
        else d.reT = -1;
      }
    }
    spawnRandom() {
      if (Math.random() < 0.2) {
        const d = this.decoys.filter(o => !o.alive && o.lift <= 0.02);
        if (d.length) { U.pick(d).show(2.4); return; }
      }
      const free = this.panels.filter(p => !p.alive && p.lift <= 0.02);
      if (free.length) { const p = U.pick(free); p.show([2.3, 2.7, 3.3][p.di]); }
    }
    update(dt) {
      for (const b of this.balloons) {
        if (b.alive) continue;
        b.bT += dt;
        if (b.bT > (this.mode === 'idle' ? 2.6 : 1.6)) { b.bT = 0; b.home.fromArray(this.balloonSpot()); b.mesh.position.copy(b.home); b.show(); }
      }
    }
  }

  // ================================================================== Hop Hop Hooray time trial (+ ghost of the best run)
  const TRIAL_GOLD = 11.0;   // scripted clean run ≈ 7.9 s; gold leaves kids ~40% slack (plat 10.1 / silver 12.7 / bronze 14.3)
  const medalFor = (t, gold) => (t <= gold * 0.92 ? 4 : t <= gold ? 3 : t <= gold * 1.15 ? 2 : t <= gold * 1.3 ? 1 : 0);
  const TSTART = [L1, 0, START_Z + 1.4, 0];
  const CPS = [
    { test: p => p.z < -0.3 && p.y > -0.3 && p.y < 1.2 && Math.abs(p.x - L1) < 3, at: [L1, 0, -1.6, 0] },
    { test: p => p.y > C_TOP - 0.25 && p.y < C_TOP + 1.2 && p.z < -4.4 && p.z > -13 && Math.abs(p.x - L1) < 3, at: [L1, C_TOP, -5.4, 0] },
    { test: p => p.y > C_TOP - 0.25 && p.z < GATE_Z - 0.7 && Math.abs(p.x - L1) < 3.4, at: [L1, C_TOP, -11.4, 0] },
    { test: p => p.y > E_TOP - 0.3 && p.x > 16.2, at: [18.4, E_TOP, -15.5, -PI / 2] },
    // deck G, or the top half of the ramp (a big air-dash can sail right over G)
    { test: p => p.z > -1.2 && p.z < RAMP.z && Math.abs(p.x - L2) < 3 && p.y > 2.0, at: [L2, E_TOP, 0.3, PI] },
  ];
  class Trial {
    constructor(R) {
      this.R = R; this.running = false; this.t = 0; this.cp = 0; this.prevZ = 99; this.samples = []; this.sT = 0; this.chip = null; this.chipS = '';
      const g = trialRec('hop').ghost;
      this.ghost = Array.isArray(g) && g.length > 6 ? g : null;
      this.gMesh = null;
    }
    resetSpot() { return this.cp > 0 ? CPS[this.cp - 1].at : TSTART; }
    begin() {
      this.running = true; this.t = 0; this.cp = 0; this.samples = []; this.sT = 0;
      sfx('go'); G.UI.banner(G.t('train.go'), null, 0.8);
      if (this.ghost && !this.gMesh) {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.0, 4, 10), G.M.toon(0x9ff0ff, { transparent: true, opacity: 0.42, rimStr: 0.8, emissive: 0x39d5ff, ei: 0.3 }));
        m.add(G.R.glowSprite(0x9ff0ff, 1.6, 0.5)); this.gMesh = m; this.R.world.add(m);
      }
    }
    cancel(silent) {
      if (!this.running) return;
      this.running = false; if (this.gMesh) this.gMesh.visible = false;
      if (!silent) G.UI.toast(G.t('train.cancel'));
    }
    ensureChip() {
      if (this.chip && this.chip.isConnected) return this.chip;
      this.chip = el('div.train-chip', el('div.big', el('span', { html: IC.timer }), el('b', { text: '0:00.00' })), el('div.sub'));
      const slot = G.HUD.slot('tc'); if (slot) slot.appendChild(this.chip);
      this.chipS = '';
      return this.chip;
    }
    update(dt) {
      const R = this.R, pl = R.player, p = pl.pos;
      if (R.tut) return;
      const onA = Math.abs(p.x - L1) < LW / 2 + 0.2 && p.y > -0.3 && p.y < 0.9;
      if (onA && this.prevZ > START_Z && p.z <= START_Z && pl.alive) this.begin();
      this.prevZ = p.z;
      const near = Math.abs(p.x - L1) < 6 && p.z > START_Z - 1 && p.z < 12 && p.y < 1;
      if (this.running) {
        this.t += dt;
        this.sT -= dt;
        if (this.sT <= 0) { this.sT += 0.1; this.samples.push(Math.round(p.x * 10), Math.round(p.y * 10), Math.round(p.z * 10)); }
        // in order, but one checkpoint may be skipped (a big hop can clear deck B; a dash can clear deck G)
        const c = CPS[this.cp], c2 = CPS[this.cp + 1];
        const hit = pl.grounded && ((c && c.test(p)) ? 1 : (c2 && c2.test(p)) ? 2 : 0);
        if (hit) { this.cp += hit; sfx('ring', { pitch: 1 + this.cp * 0.06 }); R.world.fx.ring(_v1.copy(p).setY(p.y + 0.1), 2.2, 0x9ff6ff, 0.45); if (this.cp > 1) G.HUD.feed(G.t('train.cp'), 'rgba(63,224,184,.85)'); }
        if (this.cp >= CPS.length && p.z > FINISH_Z && Math.abs(p.x - L2) < 3.4 && p.y < 1) { this.finish(); return; }
        if (this.cp === 0 && p.z > START_Z + 2.2 && onA) this.cancel();
        if (this.ghost && this.gMesh) {
          const n = this.ghost.length / 3, f = this.t * 10, i = Math.floor(f);
          if (i < n - 1) { const k = f - i, a = i * 3, b = a + 3, G3 = this.ghost; this.gMesh.visible = true; this.gMesh.position.set(U.lerp(G3[a], G3[b], k) / 10, U.lerp(G3[a + 1], G3[b + 1], k) / 10 + 0.85, U.lerp(G3[a + 2], G3[b + 2], k) / 10); }
          else this.gMesh.visible = false;
        }
      }
      // HUD chip: live timer while running, best / gold near the start line
      if (this.running || near) {
        const chip = this.ensureChip(); chip.hidden = false;
        const rec = trialRec('hop');
        const medal = this.running ? medalFor(Math.max(this.t, 0.01), TRIAL_GOLD) : rec.medal;
        const s = (this.running ? U.fmtMs(this.t) : G.t('train.trial.hop')) + '|' + medal + '|' + (rec.best || 0) + '|' + G.i18n.lang;
        if (s !== this.chipS) {
          this.chipS = s;
          chip.firstChild.lastChild.textContent = this.running ? U.fmtMs(this.t) : G.t('train.trial.hop');
          chip.firstChild.lastChild.style.font = this.running ? '' : '800 16px var(--f-body)';
          const sub = chip.lastChild; sub.innerHTML = '';
          sub.append(el('span.train-medal.m' + medal), el('span', { text: G.t('train.goldT', { t: U.fmtMs(TRIAL_GOLD) }) }),
            el('span', { text: rec.best != null ? G.t('train.best', { t: U.fmtMs(rec.best) }) : (this.running ? '' : G.t('train.trialHint')) }));
        }
      } else if (this.chip) this.chip.hidden = true;
    }
    finish() {
      const R = this.R, time = this.t;
      this.running = false; if (this.gMesh) this.gMesh.visible = false;
      const medal = medalFor(time, TRIAL_GOLD);
      const rec = trialRec('hop'), prevBest = rec.best, newBest = prevBest == null || time < prevBest;
      const result = { mode: 'training', trial: 'hop', win: true, medal, time, stars: Math.min(3, medal), stats: [{ key: 'train.time', value: time }] };
      let lines = [];
      if (G.Progress && G.Progress.finish) lines = (G.safe('trial finish', () => G.Progress.finish('training', result)) || {}).lines || [];
      result.rewards = lines;
      G.bus.emit('mode-result', result);
      if (!G.Progress) { if (newBest) rec.best = time; rec.medal = Math.max(rec.medal, medal); }
      if (newBest) { rec.ghost = this.samples.slice(0, 1800); this.ghost = rec.ghost; }
      save(true);
      const p = R.player.pos;
      R.world.fx.confetti(_v1.set(p.x, p.y + 2.5, p.z), 60);
      sfx(medal >= 3 ? 'win' : 'questDone');
      G.UI.banner(G.t('train.finish'), U.fmtMs(time), 1.2);
      setTimeout(() => {
        if (S !== R) return;
        openResult({ kind: 'trial', medal, time, best: newBest ? time : prevBest, newBest, lines, gold: TRIAL_GOLD, onRetry: () => R.teleport(TSTART) });
      }, 900);
    }
  }

  // ================================================================== Pop-Up Challenge (60 s score attack, GDD §11f.3)
  const POPUP_T = 60, POPUP_MEDALS = [2000, 3000, 4000, 5000];
  const popupMedalFor = s => (s >= POPUP_MEDALS[3] ? 4 : s >= POPUP_MEDALS[2] ? 3 : s >= POPUP_MEDALS[1] ? 2 : s >= POPUP_MEDALS[0] ? 1 : 0);
  class Popup {
    constructor(R) { this.R = R; this.state = 'idle'; this.score = 0; this.pops = 0; this.chip = null; this.cd = null; }
    start() {
      const R = this.R;
      if (this.state !== 'idle' || R.tut || R.tryRun) return;
      R.trial.cancel(true);
      R.teleport(SP.stand);
      this.state = 'count'; this.t = 3.4; this.score = 0; this.pops = 0; this.spawnT = 0.3; this.lastN = 9;
      R.gallery.setMode('challenge');
      this.cd = el('div.tut-count'); layer().appendChild(this.cd);
      this.chip = el('div.train-chip', el('div.big', el('span', { html: IC.star }), el('b', { text: '0' })), el('div.sub', { text: G.t('train.popup') }));
      const slot = G.HUD.slot('tc'); if (slot) slot.appendChild(this.chip);
    }
    update(dt) {
      const R = this.R;
      if (this.state === 'count') {
        this.t -= dt;
        const n = Math.ceil(this.t - 0.4);
        if (n !== this.lastN) { this.lastN = n; this.cd.innerHTML = ''; this.cd.appendChild(el('span', { text: n > 0 ? String(n) : G.t('train.go') })); sfx(n > 0 ? 'countdown' : 'go'); }
        if (this.t <= 0.4) { this.state = 'run'; this.t = POPUP_T; const cd = this.cd; setTimeout(() => cd && cd.remove(), 800); this.cd = null; }
        return;
      }
      if (this.state !== 'run') return;
      this.t -= dt;
      G.HUD.setTimer(Math.max(0, this.t), this.t < 10);
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = U.lerp(1.0, 0.55, 1 - this.t / POPUP_T) * U.rand(0.8, 1.2); R.gallery.spawnRandom(); }
      if (U.distXZ(R.player.pos, { x: SP.stand[0], z: SP.stand[2] }) > 20) { this.stop(); G.UI.toast(G.t('train.cancel')); return; }
      if (this.t <= 0) this.end();
    }
    onPop(t, info) {
      if (this.state !== 'run') return;
      let pts = t.points || 100;
      if (t.tk === 'decoy') { pts = -100; G.HUD.feed(G.t('train.decoy'), 'rgba(255,77,94,.9)'); }
      else if (info && info.crit) { pts = Math.round(pts * 1.5); G.HUD.feed(G.t('train.weak'), 'rgba(255,194,26,.9)'); }
      this.score = Math.max(0, this.score + pts); if (pts > 0) this.pops++;
      ptsPop(pts);
      if (this.chip) this.chip.firstChild.lastChild.textContent = G.i18n.num(this.score);
    }
    stop() {
      this.state = 'idle'; G.HUD.setTimer(null);
      this.R.gallery.setMode('idle');
      if (this.chip) { this.chip.remove(); this.chip = null; }
      if (this.cd) { this.cd.remove(); this.cd = null; }
    }
    end() {
      const R = this.R, score = this.score, pops = this.pops;
      this.stop();
      const medal = popupMedalFor(score), prevBest = popupBest(), newBest = score > prevBest;
      const result = { mode: 'training', trial: 'popup', challenge: 'popup', win: medal > 0, medal, score, pops, stats: [{ key: 'train.score', value: score }, { key: 'train.pops', value: pops }] };
      let lines = [];
      if (G.Progress && G.Progress.finish) lines = (G.safe('popup finish', () => G.Progress.finish('training', result)) || {}).lines || [];
      result.rewards = lines;
      G.bus.emit('mode-result', result);
      if (!G.Progress) { const p = prof(); if (p && newBest) obj(p, 'records').popup = score; }
      save(true);
      sfx(medal >= 3 ? 'win' : 'questDone');
      openResult({ kind: 'popup', medal, score, pops, best: Math.max(score, prevBest), newBest, lines, onRetry: () => this.start() });
    }
  }
  function ptsPop(n) {
    const e = el('div', { text: (n > 0 ? '+' : '') + G.i18n.num(n), style: { position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)', font: '400 ' + (n >= 200 ? 34 : 26) + 'px var(--f-display)', color: n > 0 ? '#ffd23f' : '#ff4d5e', webkitTextStroke: '3px #1e1a4d', paintOrder: 'stroke fill', textShadow: '0 4px 0 #1e1a4d', transition: 'transform .7s ease-out, opacity .7s ease-in', pointerEvents: 'none' } });
    layer().appendChild(e);
    requestAnimationFrame(() => requestAnimationFrame(() => { e.style.transform = 'translate(-50%,-160%) scale(1.15)'; e.style.opacity = '0'; }));
    setTimeout(() => e.remove(), 800);
  }

  // ================================================================== the tutorial (GDD §17; one mechanic per step, advance only by doing)
  const STEP_IDS = ['move', 'look', 'shoot', 'jump', 'double', 'slide', 'mantle', 'dash', 'crate', 'collect', 'bot', 'chest', 'gate'];
  const inp = () => G.input;
  const boltsLeft = w => { let n = 0; for (const it of w.pickups.items) if (it.type === 'bolt' || it.type === 'part') n++; return n; };
  const STEP = {
    move: {
      icon: 'move', ghost: [['joystick', { mode: 'push' }]], cap: 'joystick', beepo: [L1, 2.7, SP.ring[2]], noFace: true,
      enter(tu, R) { R.goal.show(SP.ring[0], 0, SP.ring[2]); },
      act: () => Math.hypot(inp().move.x, inp().move.y) > 0.3,
      check: (tu, R) => U.distXZ(R.player.pos, R.goal.pos) < 1.7,
    },
    look: {
      icon: 'look', ghost: ['look'], cap: 'look', beepo: [4.6, 3.8, 7.6], noFace: true,
      enter(tu, R) { R.goal.hide(); tu.spawnBalloons(); },
      exit() { G.HUD.removeMarker('tut-look'); },
      act: () => Math.abs(inp().lookDX) + Math.abs(inp().lookDY) > 1.5,
      tick(tu, R, dt) {
        const m = tu.balloons[1]; if (m) G.HUD.marker('tut-look', _v4.set(m.pos.x, m.pos.y + 1.6, m.pos.z), { icon: '!', color: '#ffd23f', dist: false });
        if (tu.pulses < 2) return;   // gentle camera nudge for players who haven't found the look zone yet
        const pl = R.player, b = tu.balloons[1], dx = b.pos.x - pl.pos.x, dz = b.pos.z - pl.pos.z;
        pl.yaw = U.angleDamp(pl.yaw, Math.atan2(-dx, -dz), 1.2, dt);
      },
      check(tu, R, dt) {
        if (tu.pops > 0) return true;
        const pl = R.player, eye = pl.eyePos(_v1), f = pl.forward(_v2);
        let best = 9;
        for (const b of tu.balloons) if (b.alive) { const d = b.aimPoint(_v3).sub(eye).normalize(); best = Math.min(best, Math.acos(U.clamp(d.dot(f), -1, 1))); }
        tu.lookT = best < 0.26 ? (tu.lookT || 0) + dt : 0;
        return tu.lookT > 0.25;
      },
    },
    shoot: {
      icon: 'fire', ghost: ['fire'], pulse: 'fire', cap: 'fire', beepo: [4.6, 3.8, 7.6],
      count: tu => Math.min(3, tu.pops) + '/3',
      enter(tu, R) { R.world.pickups.magnetR = 22; },
      exit(tu, R) { R.world.pickups.magnetR = 4.5; },
      act: () => inp().fire || inp().fireP,
      check: (tu, R) => tu.pops >= 3 && (boltsLeft(R.world) === 0 || tu.stepT - tu.lastPopT > 2.4),
    },
    jump: {
      icon: 'jump', ghost: ['jump'], pulse: 'jump', cap: 'jump', reset: [L1, 0, 5.4, 0], beepo: [L1 + 1.2, 2.6, 0.8],
      enter(tu, R) { R.goal.show(L1, 0, -2.2); },
      act: () => inp().jumpP,
      tick(tu, R) {   // after a few splashes, hop for them at the edge
        const pl = R.player;
        if (tu.splashes >= 3 && pl.grounded && pl.pos.z < 2.1 && pl.pos.z > 1.5 && inp().move.y > 0.3) { pl.vel.y = 7; pl.grounded = false; sfx('jump'); tu.helpOnce(); }
      },
      check: (tu, R) => { const p = R.player.pos; return R.player.grounded && p.z < -0.3 && p.y > -0.3 && p.y < 1 && Math.abs(p.x - L1) < 3; },
    },
    double: {
      icon: 'jump', badge: '×2', ghost: [['jump', { mode: 'double' }]], pulse: 'jump', cap: ['jump', { mode: 'double' }], reset: [L1, 0, -1.6, 0], beepo: [L1 + 1.4, 4.0, -4.8],
      enter(tu, R) { R.player.stats.mantle = false; R.goal.show(L1, C_TOP, -6.4); },
      exit(tu, R) { R.player.stats.mantle = true; },
      act: () => inp().jumpP,
      tick(tu, R) {
        const pl = R.player;
        if (tu.pulses >= 2 && !pl.grounded && pl.jumps === 1 && pl.vel.y < 1.5 && pl.pos.z < -2.6 && pl.pos.z > -4.4 && pl.pos.y < C_TOP) { pl.vel.y = 6.2; pl.jumps = 2; sfx('jump2'); tu.helpOnce(); }
      },
      check: (tu, R) => { const p = R.player.pos; return R.player.grounded && p.y > C_TOP - 0.25 && p.z < -4.3; },
    },
    slide: {
      icon: 'slide', ghostT: [['joystick', { mode: 'push' }], 'slide'], ghostD: [['slide', { sprint: true }]], pulse: 'slide', cap: 'slide', reset: [L1, C_TOP, -5.4, 0], beepo: [L1 + 2.0, C_TOP + 1.6, -8.0],
      enter(tu, R) { R.goal.show(L1, C_TOP, -12.1); },
      act: () => inp().slideP,
      tick(tu, R) {   // Easy assist: after two pulses, auto-slide when running into the gate
        const pl = R.player, p = pl.pos;
        if (tu.pulses >= 2 && pl.grounded && pl.sliding <= 0 && p.z < GATE_Z + 1.5 && p.z > GATE_Z + 0.25 && inp().move.y > 0.3 && Math.abs(p.x - L1) < 2.6) {
          pl.sliding = 1.1; pl.vel.z = -8.5; pl.vel.x *= 0.3; sfx('slide'); tu.helpOnce();
        }
      },
      check: (tu, R) => { const p = R.player.pos; return p.y > C_TOP - 0.25 && p.z < GATE_Z - 0.7 && Math.abs(p.x - L1) < 3; },
    },
    mantle: {
      icon: 'jump', badge: '↑', ghost: [['jump', { mode: 'double' }]], pulse: 'jump', cap: ['jump', { mode: 'double' }], reset: [12.4, C_TOP, -15.5, -PI / 2], beepo: [17.2, E_TOP + 1.7, -15.5],
      enter(tu, R) { R.goal.show(19.2, E_TOP, -15.5); R.player.stats.wallKick = false; },
      exit(tu, R) { R.player.stats.wallKick = true; },
      act: () => inp().jumpP,
      tick(tu, R) {
        const pl = R.player, p = pl.pos;
        if (tu.pulses >= 2 && !pl.grounded && !pl.mantling && p.x > 14.6 && p.x < 16 && p.y < E_TOP - 0.4 && pl._tryMantle) { if (G.safe('mantle', () => pl._tryMantle(1, 0, true))) tu.helpOnce(); }
      },
      check: (tu, R) => R.player.grounded && R.player.pos.y > E_TOP - 0.3,
    },
    dash: {
      icon: 'ability', ghost: ['ability'], pulse: 'ability', cap: 'ability', reset: [L2, E_TOP, -9.4, PI], beepo: [L2 + 1.6, E_TOP + 1.9, -3.8],
      enter(tu, R) { tu.dashUsed = false; tu.crossed = false; R.goal.show(L2, E_TOP, 0.4); },
      act: () => inp().abilityP,
      tick(tu, R) {
        const pl = R.player, p = pl.pos;
        if (pl.dashT > 0) tu.dashUsed = true;
        if (tu.splashes >= 3 && !tu.dashUsed && !pl.grounded && p.y > E_TOP - 0.6 && p.z > -6.6 && p.z < -5.4 && pl.vel.z > 0 && pl.useAbility) { pl.useAbility(0, 1, 1); tu.helpOnce(); }
        // landed on deck G, or on the ramp after a big air-dash
        if (!tu.crossed && pl.grounded && p.z > -1.2 && Math.abs(p.x - L2) < 3.4) { tu.crossed = true; if (!tu.dashUsed) T.say('beepo.dashNow', { expr: 'wow' }); }
      },
      check: (tu, R) => tu.crossed && tu.dashUsed,
    },
    crate: {
      icon: 'crate', ghost: ['fire'], pulse: 'fire', cap: 'fire', beepo: [17.0, 2.4, 13.6],
      face: () => ({ x: (SP.crates[0][0] + SP.crates[1][0]) / 2, z: (SP.crates[0][2] + SP.crates[1][2]) / 2 }),
      count: tu => tu.cratesBroken + '/2',
      enter(tu, R) {
        tu.cratesBroken = 0;
        // Each crate's loot is banked once: a run resumed after a reload (or a replay) only pays what was not
        // collected yet (tutorial.crateLoot[i] = {parts:[ids], clinks}); the rest drops as practice loot.
        // (a tutorial finished without being skipped, before this record existed, collected all of it back then)
        const r = tutRec(), pf = prof(), got = r.crateLoot && typeof r.crateLoot === 'object' ? r.crateLoot : {};
        const skipped = !!(r.skipped || (pf && pf.flags && pf.flags.tutorialSkipped));
        const legacy = (r.crateParts | 0) >= 6 || (!T.needed() && !skipped && !r.crateLoot);
        tu.crates = SP.crates.map((p, i) => {
          // the wood crate banks 4 Scrap Plates: exactly the Bubble Shield Mk1 recipe, so the Workshop's guided
          // first craft (GDD §17) is ready the moment it opens after the first mission
          const all = i === 0 ? ['scrap', 'scrap', 'scrap', 'scrap'] : ['spring', 'chip'], full = i === 0 ? 8 : 18;
          const g = got[i] && typeof got[i] === 'object' ? got[i] : {}, had = Array.isArray(g.parts) ? g.parts.slice() : [];
          const left = legacy ? [] : all.filter(id => { const k = had.indexOf(id); if (k < 0) return true; had.splice(k, 1); return false; });
          const cl = legacy ? 0 : Math.max(0, full - (g.clinks | 0)), bank = left.length > 0 || cl > 0;
          const c = new TCrate(R.world, i === 0 ? 'wood' : 'metal', p, { bank, tag: i, clinks: bank ? cl : full, parts: bank ? left : all, onBreak: () => { tu.cratesBroken++; tu.lastPopT = tu.stepT; } });
          R.world.addActor(c); R.world.fx.ring(_v1.fromArray(p).setY(0.06), 1.4, 0xffe066, 0.5);
          return c;
        });
        R.goal.hide();
        R.world.fx.confetti(_v1.set(17, 1.5, 15), 20);
      },
      act: () => inp().fire || inp().fireP,
      tick(tu, R) { const c = tu.crates.find(o => o.alive); if (c) G.HUD.marker('tut-goal', _v4.set(c.pos.x, 1.9, c.pos.z), { icon: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 8l7 9 7-9z" fill="#1e1a4d"/></svg>', color: '#ffd23f', dist: true }); },
      check: tu => tu.cratesBroken >= 2,
      exit() { G.HUD.removeMarker('tut-goal'); },
    },
    collect: {
      icon: 'coin', ghost: [['joystick', { mode: 'push' }]], cap: 'joystick',
      act: () => Math.hypot(inp().move.x, inp().move.y) > 0.3,
      tick(tu, R) {
        const w = R.world; let n = 0; _v1.set(0, 0, 0);
        for (const it of w.pickups.items) if (it.type === 'bolt' || it.type === 'part') { _v1.add(it.pos); n++; }
        if (n) { _v1.multiplyScalar(1 / n); R.goal.show(_v1.x, 0, _v1.z); tu.beepoAt(_v1.x, 2.4, _v1.z); }
        if (tu.stepT > 11) w.pickups.magnetR = 40;
      },
      exit(tu, R) { R.world.pickups.magnetR = 4.5; R.goal.hide(); },
      check: (tu, R) => boltsLeft(R.world) === 0,
    },
    bot: {
      icon: 'bot', ghost: ['fire'], pulse: 'fire', cap: 'fire', beepo: [10.6, 2.8, 15.6], face: () => ({ x: SP.tutBot[0], z: SP.tutBot[2] }),
      enter(tu, R) {
        R.goal.hide(); tu.botDown = false;
        const pl = R.player, h = SP.tutBot;
        tu.bot = new SparBot(R.world, { home: [h[0], h[2]], hp: 70, dmg: 2, leash: 1.4, aggro: 20, popIn: true, yaw: Math.atan2(pl.pos.x - h[0], pl.pos.z - h[2]),
          onPop: b => { tu.botDown = true; R.world.pickups.boltBurst(b.aimPoint(new V3()), 10); tu.tagLoot('bot'); } });
        R.world.addActor(tu.bot);
        R.world.fx.ring(_v1.set(h[0], 0.06, h[2]), 2, 0xff6b8b, 0.5);
        sfx('enemyAlert');
      },
      act: () => inp().fire || inp().fireP,
      tick(tu) { if (tu.bot && tu.bot.alive) G.HUD.marker('tut-goal', _v4.set(tu.bot.pos.x, tu.bot.pos.y + 2.6, tu.bot.pos.z), { icon: '!', color: '#ff6b8b', dist: true }); },
      exit() { G.HUD.removeMarker('tut-goal'); },
      check: tu => tu.botDown,
    },
    chest: {
      icon: 'interact', ghost: ['interact'], pulse: 'interact', cap: 'interact', beepo: [SP.chest[0] + 1.4, 2.4, SP.chest[2] - 0.6],
      enter(tu, R) { tu.spawnChest(); R.goal.show(SP.chest[0], 0, SP.chest[2]); },
      act: () => inp().interactP,
      check: tu => tu.chestDone,
      exit(tu, R) { R.goal.hide(); },
    },
    gate: {
      icon: 'gate', ghost: [['joystick', { mode: 'push' }]], cap: 'joystick', beepo: [0, 3.2, 18.0],
      enter(tu, R) { R.goal.show(SP.gate[0], 0, SP.gate[2] - 1.0); },
      act: () => Math.hypot(inp().move.x, inp().move.y) > 0.3,
      check: (tu, R) => U.distXZ(R.player.pos, { x: SP.gate[0], z: SP.gate[2] - 1.0 }) < 2.4,
    },
  };
  const LOOT_CAP = { bal: 18, bot: 10 };   // clinks: 3 balloons x 6, the sparring bot's 10
  const CHECK_SVG = '<svg viewBox="0 0 48 48"><path d="M10 25l9 9 19-20" fill="none" stroke="#1e1a4d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Where a resumed tutorial puts the player: the step's own reset spot, else a free spot next to the
  // step's goal (x, y, z, yaw), so Continue drops you right at the thing to do.
  const RESUME_SPOT = { look: [L1, 0, 9.4, 0], crate: [17.0, 0, 12.4, PI], bot: [11.6, 0, 15.4, PI / 2], chest: [7.4, 0, 16.6, PI / 2], gate: [3.2, 0, 16.8, PI / 2] };
  const resumeSpot = i => { const id = STEP_IDS[i], st = id && STEP[id]; return (st && st.reset) || RESUME_SPOT[id] || null; };

  class Tutor {
    constructor(R) {
      this.R = R; this.i = -1; this.id = null; this.cur = null; this.phase = 'intro'; this.t = 0;
      this.resumeAt = U.clamp(R.params.resume | 0, 0, STEP_IDS.length - 1);
      this.firstRun = T.needed();   // false: a replay from the Training Range (pays only never-collected crate loot)
      this.stepT = 0; this.idle = 0; this.pulses = 0; this.acted = false; this.actT = 0; this.ghostsOn = false;
      this.pops = 0; this.lastPopT = 0; this.splashes = 0; this.balloons = []; this.crates = []; this.cratesBroken = 0;
      this.helped = false; this.tryN = 0; this.chestDone = false; this.chestOpened = false;
      const pl = R.player; pl.inputEnabled = false; pl.hideVm = true;
      this.beepo = makeNpc('companion');
      this.beepo.group.visible = false; R.world.add(this.beepo.group);
      this.bTarget = new V3(L1, 2.3, 12.4); this.bPos = this.bTarget.clone(); this.bPop = 0;
      G.HUD.hide();
      this.skipBtn = G.UI.btn('tut.skip', () => this.askSkip(), 'small', { icon: IC.skip });
      this.skipBtn.classList.add('tut-skip');
      layer().appendChild(this.skipBtn);
      this.capWrap = null;
      this.hideTop = () => {};
      this.facePt = new V3(); this.turnT = 0;
    }
    askSkip() {
      if (this.phase === 'end') return;
      G.UI.confirm(G.t('tut.skipQ'), () => this.leave(true), { title: G.t('tut.skipTitle'), yesKey: 'tut.skipYes', noKey: 'tut.skipNo' });
    }
    leave(skipped) {
      if (this.left) return;
      this.left = true;
      if (skipped) T.skip(); else T.complete();
      const to = exitMode();
      G.Game.go(to || 'training', to ? {} : { tutorial: false });
    }
    endIntro() {
      const R = this.R, pl = R.player;
      pl.inputEnabled = true; pl.hideVm = false;
      G.HUD.show({ vitals: true, weapons: true, crosshair: true, minimap: true, bolts: true, feed: true });
      R.hudExtras();
      this.capWrap = el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } });
      const slot = G.HUD.slot('tc'); if (slot) slot.appendChild(this.capWrap);
      this.go(this.resumeAt);
    }
    go(i) {
      const R = this.R;
      if (this.cur && this.cur.exit) G.safe('tut exit', () => this.cur.exit(this, R));
      T.clearGhosts(); clearPulses(); this.ghostsOn = false;
      if (i >= STEP_IDS.length) { this.finish(); return; }
      this.i = i; this.id = STEP_IDS[i]; this.cur = STEP[this.id];
      this.phase = 'step'; this.stepT = 0; this.idle = 0; this.pulses = 0; this.splashes = 0; this.helped = false;
      G.safe('tut enter', () => this.cur.enter && this.cur.enter(this, R));
      if (this.cur.beepo) this.beepoAt(this.cur.beepo[0], this.cur.beepo[1], this.cur.beepo[2]);
      // Turn the camera toward the next goal when it starts off-screen (a short ease; any look input cancels it).
      this.turnT = 0;
      const fp = this.cur.face ? this.cur.face(this, R) : (!this.cur.noFace && R.goal.on ? R.goal.pos : null);
      if (fp) {
        const pl = R.player, want = Math.atan2(-(fp.x - pl.pos.x), -(fp.z - pl.pos.z));
        let d = Math.abs(want - pl.yaw) % (2 * PI); if (d > PI) d = 2 * PI - d;
        if (d > 0.6) { this.facePt.set(fp.x, 0, fp.z); this.turnT = 1.1; }
      }
      this.renderCap(false);
      this.showGhosts();
      T.say('beepo.' + this.id, { expr: this.id === 'bot' || this.id === 'chest' ? 'wow' : 'happy' });
      // the resume point; a replay of a finished tutorial leaves the record alone
      if (T.needed()) { const t = tutRec(); t.step = i; save(); }
    }
    showGhosts(dur) {
      T.clearGhosts();
      const st = this.cur, touch = G.input.device === 'touch';
      const list = (touch ? st.ghostT : st.ghostD) || st.ghost || [];
      for (const g of list) { const a = Array.isArray(g) ? g : [g, {}]; T.ghostThumb(a[0], Object.assign({}, a[1], dur ? { dur } : {})); }
      this.ghostsOn = list.length > 0; this.acted = false; this.actT = 0;
    }
    renderCap(ok) {
      if (!this.capWrap) return;
      const st = this.cur, touch = G.input.device === 'touch';
      const ic = el('div.ic', { html: ok ? CHECK_SVG : btnIcon(st.icon), style: { background: BTN_COL[st.icon] || '#fff' } });
      if (st.badge && !ok) ic.appendChild(el('b', { text: st.badge }));
      const card = el('div.tut-cap' + (ok ? '.ok' : ''), ic, el('div.tx', { text: G.t('tut.' + this.id) }));
      if (!touch && st.cap && !ok) {
        const a = Array.isArray(st.cap) ? st.cap : [st.cap, {}];
        const kc = (G.input.device === 'gamepad' ? padFor(a[0], a[1] || {}, true) : capKeys(a[0], a[1])) || [];
        if (kc.length) card.appendChild(el('div.kc', kc));
      }
      this.cntEl = null;
      if (st.count) { this.cntEl = el('div.cnt', { text: st.count(this, this.R) }); card.appendChild(this.cntEl); }
      const dots = el('div.tut-dots', STEP_IDS.map((s, i) => el('i' + (i < this.i || (ok && i === this.i) ? '.done' : i === this.i ? '.cur' : ''))));
      this.capWrap.innerHTML = ''; this.capWrap.append(card, dots);
    }
    beepoAt(x, y, z) { this.bTarget.set(x, y, z); }
    // balloon / sparring-bot clinks just dropped: tagged so a run resumed after a reload pays them only once (LOOT_CAP)
    tagLoot(key) { for (const it of this.R.world.pickups.items) if (it.type === 'bolt' && it.age === 0 && it.data.tutCrate == null && it.data.tutLoot == null) it.data.tutLoot = key; }
    helpOnce() { if (this.helped) return; this.helped = true; T.say('beepo.help', { expr: 'wink' }); }
    spawnBalloons() {
      const R = this.R;
      this.balloons = SP.balloons.map((p, i) => {
        const b = new PTarget(R.world, 'balloon', { pos: p, color: [0xff6b8b, 0xffd23f, 0x5fc8ff][i], popIn: true, onPop: t => this.onBalloonPop(t) });
        R.world.addActor(b);
        R.world.fx.burst(_v1.fromArray(p).setY(p[1] + 0.6), [0xffffff, 0xffe066], 10, 3, 0.2, 0.5, { grav: 0 });
        return b;
      });
      sfx('unlock', { pitch: 1.2 });
    }
    onBalloonPop(t) {
      this.pops++; this.lastPopT = this.stepT;
      this.R.world.pickups.boltBurst(t.aimPoint(new V3()), 6); this.tagLoot('bal');
      if (this.cntEl && this.cur && this.cur.count) this.cntEl.textContent = this.cur.count(this, this.R);
      sfx('star', { n: Math.min(3, this.pops), pitch: 1.1 });
    }
    spawnChest() {
      const R = this.R, w = R.world, [x, , z] = SP.chest;
      const g = new THREE.Group(); g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(R.player.pos.x - x, R.player.pos.z - z);
      g.add(kitMesh(chestData(false)));
      const lidP = new THREE.Group(); lidP.position.set(0, 0.7, -0.4); g.add(lidP);
      lidP.add(kitMesh(chestData(true)));
      const glow = G.R.glowSprite(0xffe066, 2.6, 0.55); glow.position.y = 0.8; g.add(glow);
      g.scale.setScalar(0.01); w.add(g);
      this.chest = { g, lidP, glow, t: 0, open: 0 };
      this.chestCol = w.phys.addBox(x, 0.45, z, 1.1, 0.9, 1.1);
      w.addInteract({ pos: new V3(x, 0, z), r: 2.7, key: 'tut.open', onUse: () => this.openChest(), enabled: () => this.id === 'chest' && !this.chestOpened });
      w.fx.confetti(_v1.set(x, 1.2, z), 24); sfx('unlock');
    }
    openChest() {
      const R = this.R;
      if (this.chestOpened) return;
      this.chestOpened = true;
      sfx('questDone');
      R.world.fx.confetti(_v1.set(SP.chest[0], 1.4, SP.chest[2]), 50);
      R.world.fx.burst(_v1, [0xffd23f, 0xffffff, 0x3fe0b8], 30, 7, 0.3, 0.8, { up: 4, grav: 8 });
      let parts = 0; const p = prof(); if (p && p.parts) for (const k in p.parts) parts += p.parts[k] || 0;
      setTimeout(() => { if (S !== R) return; G.UI.open('tut-reward', { parts, onClose: () => { this.chestDone = true; } }); }, 800);
    }
    update(dt) {
      const R = this.R;
      this.t += dt;
      this.animBeepo(dt);
      if (this.chest) {
        const c = this.chest; c.t += dt;
        c.g.scale.setScalar(Math.min(1, c.t * 3) < 1 ? Math.max(0.01, 1 - Math.pow(1 - Math.min(1, c.t * 3), 3) + 0.2 * Math.sin(Math.min(1, c.t * 3) * PI)) : 1);
        if (this.chestOpened) c.open = Math.min(1, c.open + dt * 2.5);
        c.lidP.rotation.x = -c.open * 1.9;
        c.glow.material.opacity = 0.4 + 0.2 * Math.sin(this.t * 4);
      }
      if (this.phase === 'intro') {
        R.player.inputEnabled = false;
        if (this.t > 0.6 && !this.hiSaid) {
          this.hiSaid = true; this.beepo.group.visible = true; this.bPop = 0.001;
          // first run: Beepo pops in by the start ring; resumed: right in front of the player
          if (this.resumeAt > 0) { const pl = R.player, f = pl.forward(_v2); this.bPos.set(pl.pos.x + f.x * 3.2, pl.pos.y + 2.0, pl.pos.z + f.z * 3.2); }
          else this.bPos.set(L1, 2.0, 12.2);
          this.bTarget.copy(this.bPos);
          R.world.fx.burst(_v1.copy(this.bPos), [0xffffff, 0x39d5ff, 0xffe066], 18, 4, 0.25, 0.6, { grav: 0 });
          // Beepo greets the ranger you play as (Ranger Locker), not always Kiko
          const name = G.Wardrobe && G.Wardrobe.rangerName ? G.safe('ranger name', () => G.Wardrobe.rangerName()) || '' : '';
          sfx('respawn'); T.say(this.resumeAt > 0 ? 'tut.resumeHi' : 'beepo.hi', { expr: 'happy', dur: 3.4, params: { name } });
          if (this.beepo.greet) G.safe('greet', () => this.beepo.greet());
        }
        if (this.t >= 3.0) this.endIntro();
        return;
      }
      if (this.phase === 'yay') { this.yayT += dt; if (this.yayT > 1.05) this.go(this.i + 1); return; }
      if (this.phase === 'end') { this.endT += dt; this.turn(dt); if (this.endT > 2.8) this.leave(false); return; }
      if (this.phase !== 'step') return;
      this.stepT += dt;
      const st = this.cur;
      this.turn(dt);
      if (st.tick) G.safe('tut tick', () => st.tick(this, R, dt));
      const acting = st.act && st.act(this, R);
      if (acting) { this.idle = 0; this.acted = true; } else this.idle += dt;
      if (this.ghostsOn && this.acted) { this.actT += dt; if (this.actT > 0.9) { T.clearGhosts(); this.ghostsOn = false; } }
      if (this.idle > 8) { this.idle = 0; this.nudge(); }
      if (st.check(this, R, dt)) this.succeed();
    }
    turn(dt) {   // eases the camera toward facePt; any look input hands control straight back
      if (this.turnT <= 0) return;
      this.turnT -= dt;
      const io = inp(), pl = this.R.player, fp = this.facePt;
      if (Math.abs(io.lookDX) + Math.abs(io.lookDY) < 0.5) { pl.yaw = U.angleDamp(pl.yaw, Math.atan2(-(fp.x - pl.pos.x), -(fp.z - pl.pos.z)), 4.5, dt); pl.pitch = U.damp(pl.pitch, -0.05, 4, dt); }
      else this.turnT = 0;
    }
    late() {
      if (this.phase !== 'intro') return;
      const pl = this.R.player, cam = G.R.camera;
      const k = U.smoothstep(0, 1, Math.min(1, this.t / 2.8));
      const e = pl.eyePos(_v1);
      const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
      cam.position.set(-10 * a + 4 * b + e.x * c, 22 * a + 8 * b + e.y * c, 38 * a + 26 * b + e.z * c);
      const f = _v2.set(e.x, e.y, e.z - 6), l0 = _v3.set(8, 0, -2);
      cam.lookAt(l0.lerp(f, U.smoothstep(0.2, 1, k)));
    }
    nudge() {
      this.pulses++;
      const st = this.cur;
      if (st.pulse) T.pulse(st.pulse, 3);
      sfx('quest');
      this.showGhosts(4.5);
      const lines = ['beepo.try1', 'beepo.try2', 'beepo.' + this.id, 'beepo.try3'];
      T.say(lines[this.tryN++ % lines.length], { expr: 'idle' });
    }
    onSplash() {
      this.splashes++;
      T.say(this.splashes === 2 ? 'beepo.' + this.id : 'beepo.splash', { expr: 'wow' });
      if (this.splashes === 2) this.showGhosts(4.5);
    }
    resetSpot() { return (this.cur && this.cur.reset) || null; }
    succeed() {
      const R = this.R, pl = R.player;
      this.phase = 'yay'; this.yayT = 0;
      T.clearGhosts(); this.ghostsOn = false; clearPulses();
      this.renderCap(true);
      praise(G.t('tut.good' + (1 + (this.i % 5))));
      sfx('star', { n: 1 + (this.i % 3), pitch: 1 + this.i * 0.025 });
      if (this.id === 'shoot' || this.id === 'mantle' || this.id === 'dash' || this.id === 'bot') sfx('questDone');
      const f = pl.forward(_v1);
      R.world.fx.confetti(_v2.set(pl.pos.x + f.x * 2.4, pl.pos.y + 2.2, pl.pos.z + f.z * 2.4), 40);
      this.bPop = 0.001;
      if (this.beepo.greet) G.safe('greet', () => this.beepo.greet());
    }
    finish() {
      const R = this.R, pl = R.player;
      this.phase = 'end'; this.endT = 0;
      if (this.capWrap) this.capWrap.innerHTML = '';
      R.goal.hide(); if (this.skipBtn) this.skipBtn.hidden = true;
      this.facePt.set(SP.gate[0], 0, SP.gate[2] + 14); this.turnT = 2.4;   // look out through the arch toward town
      G.UI.banner(G.t('tut.welcome'), G.t('tut.welcomeSub'), 2.6);
      sfx('win');
      for (let i = 0; i < 3; i++) R.world.fx.confetti(_v1.set(pl.pos.x + U.rand(-2, 2), pl.pos.y + 2.5, pl.pos.z + 2.6 + U.rand(-1, 1)), 50);
      T.hideHint();
      this.beepoAt(pl.pos.x - 1.5, pl.pos.y + 1.1, pl.pos.z + 3.0);   // facing +z, -x reads as screen-right, under the banner
    }
    animBeepo(dt) {
      if (!this.beepo || !this.beepo.group.visible) return;
      const g = this.beepo.group, t = this.R.world.time;
      this.bPos.x = U.damp(this.bPos.x, this.bTarget.x, 2.2, dt); this.bPos.y = U.damp(this.bPos.y, this.bTarget.y, 2.2, dt); this.bPos.z = U.damp(this.bPos.z, this.bTarget.z, 2.2, dt);
      g.position.set(this.bPos.x, this.bPos.y + Math.sin(t * 2.4) * 0.12, this.bPos.z);
      const cam = G.R.camera; g.rotation.y = U.angleDamp(g.rotation.y, Math.atan2(cam.position.x - g.position.x, cam.position.z - g.position.z), 6, dt);
      if (this.bPop > 0) { this.bPop = Math.min(1, this.bPop + dt * 2.6); const k = this.bPop; g.scale.setScalar(Math.max(0.01, 1 + 0.35 * Math.sin(k * PI) * (1 - k * 0.3) - (k < 0.3 ? (0.3 - k) * 2.5 : 0))); if (k >= 1) { this.bPop = 0; g.scale.setScalar(1); } }
      if (this.beepo.animate) this.beepo.animate(t, dt);
    }
    onDevice() { if (this.phase === 'step') { this.renderCap(false); this.showGhosts(); } }
    onLang() { if (this.phase === 'step' || this.phase === 'yay') this.renderCap(this.phase === 'yay'); }
    dispose() {
      if (this.cur && this.cur.exit && this.phase === 'step') G.safe('tut exit', () => this.cur.exit(this, this.R));
      T.clearGhosts(); clearPulses(); T.hideHint();
      if (this.skipBtn) this.skipBtn.remove();
      if (this.R.world.player) { this.R.world.player.stats.mantle = true; this.R.world.player.stats.wallKick = true; }
    }
  }

  // ================================================================== the range session
  let S = null, lastMode = null;
  G.bus.on('mode', id => { lastMode = id; });
  class Range {
    constructor(params) {
      this.params = params || {};
      const fromTitle = lastMode === 'title' || lastMode == null;
      this.tutorial = this.params.tutorial === true || (this.params.tutorial !== false && fromTitle && T.needed() && !this.params.station && !this.params.tryWeapon && !this.params.trial);
      this.t = 0; this.clinks = 0; this.offs = []; this.markT = 0; this.tipT = 0; this.slotsBuilt = false; this.respawnT = -1; this.weakT = 0; this.bubT = 0; this.wk = false; this.hintT = 0; this.hintTop = 0;
      const wo = G.Geo && G.Geo.biomeWorldOpts ? G.Geo.biomeWorldOpts('meadow') : {};
      this.world = new G.World(Object.assign({}, wo, {
        heightFn: hf, bounds: YARD, floorY: -40,
        rules: {
          onKill: (t, i) => this.onKill(t, i), onPickup: (ty, d, it) => this.onPickup(ty, d, it), onPlayerDeath: pl => this.onPlayerDeath(pl),
          onDamage: (t, res, info) => this.onDamage(t, res, info), manualRespawn: true,
        },
      }));
      buildYard(this);
      this.makePlayer();
      this.gallery = new Gallery(this);
      this.buildPen();
      this.coach = makeNpc('coach');
      this.coach.group.position.set(SP.coach[0], 0.2, SP.coach[2]); this.coach.group.rotation.y = 0.4;
      this.world.add(this.coach.group);
      this.buildKickStar();
      this.goal = makeGoal(this.world);
      this.trial = new Trial(this);
      this.popup = new Popup(this);
      this.addInteracts();
      this.prevAutoXP = G.Progress ? G.Progress.autoWeaponXP : undefined;
      if (G.Progress) G.Progress.autoWeaponXP = false;
      this.offs.push(G.bus.on('device', () => this.tut && this.tut.onDevice()), G.bus.on('lang', () => { if (this.tut) this.tut.onLang(); if (this.trial) this.trial.chipS = ''; }));
      if (this.tutorial) this.tut = new Tutor(this);
      else this.startFree();
      // resumed tutorial: stand on the step's deck (teleport() never drops a deck spot to the pool floor)
      if (this.tut && this.tut.resumeAt > 0) { const sp = resumeSpot(this.tut.resumeAt); if (sp) this.teleport(sp); }
      G.bus.emit('mode-start', 'training', this.params);
    }
    spawnSpot() {
      if (this.tutorial) return (this.params.resume > 0 && resumeSpot(this.params.resume | 0)) || SP.tutSpawn;
      const st = this.params.tryWeapon ? 'gallery' : this.params.trial ? 'course' : this.params.station;
      return { gallery: SP.stand, popup: SP.stand, course: SP.course, trial: SP.course, pen: SP.pen, kick: SP.kick }[st] || SP.freeSpawn;
    }
    loadoutList() {
      const p = prof() || {}, W = p.weapons || {}, out = [];
      const add = id => { if (!id || out.some(o => o.id === id) || (G.Weapons && G.Weapons.defs && !G.Weapons.defs[id])) return; const w = W[id] || {}; out.push({ id, level: w.lvl || 1, mods: (w.mods || []).filter(Boolean), tune: Array.isArray(w.tune) ? w.tune.slice() : [0, 0, 0], xp: w.xp }); };
      if (this.params.tryWeapon) add(this.params.tryWeapon);
      if (this.tutorial) { add('fizz'); return out; }
      const base = G.Data && G.Data.loadout ? (G.safe('loadout', () => G.Data.loadout(p)) || []) : [];
      for (const b of base) add(b.id);
      for (const id of ((G.Data && G.Data.WEAPON_IDS) || Object.keys(W))) if (W[id] && W[id].own) add(id);
      if (!out.length) add('fizz');
      return out.slice(0, 6);
    }
    makePlayer() {
      const p = prof() || {};
      const stats = Object.assign({}, (G.Data && G.Data.playerStats ? G.safe('stats', () => G.Data.playerStats(p)) : null) || {});
      if (this.tutorial) Object.assign(stats, { doubleJump: true, mantle: true, wallKick: true, dashCharges: Math.max(2, stats.dashCharges || 2) });
      const sp = this.spawnSpot();
      const pl = this.player = new G.Player(this.world, { stats, loadout: [], spawn: new V3(sp[0], hf(sp[0], sp[2]) + sp[1], sp[2]), yaw: sp[3], gadget: G.Data && G.Data.gadget ? G.safe('gadget', () => G.Data.gadget(p)) : null });
      this.world.player = pl; this.world.addActor(pl);
      this.setWeapons(this.loadoutList());
    }
    setWeapons(list) {
      const pl = this.player, arr = [];
      if (G.Weapons && G.Weapons.create) for (const w of list) { const inst = G.safe('weapon', () => G.Weapons.create(w.id, w.level || 1, w.mods || [], pl, { infiniteAmmo: true, tune: w.tune, xp: w.xp })); if (inst) arr.push(inst); }
      if (!arr.length) arr.push(fallbackWeapon(pl));
      pl.weapons = arr; pl.wi = 0; pl.equip(0, true);
    }
    buildPen() {
      const w = this.world, onPop = (t, info) => this.onTargetPop(t, info);
      this.penDummies = [[-26, 11.8], [-22.4, 10.8], [-18.8, 11.8]].map(s => { const d = new PTarget(w, 'dummy', { pos: [s[0], 0, s[1]], rotY: PI / 2 + 0.2, points: 0, respawn: 2.2, onPop }); w.addActor(d); return d; });
      this.spar = new SparBot(w, { home: [SPAR.x, SPAR.z], passive: this.tutorial, hp: 120, dmg: 3, leash: SPAR.r * 0.8, aggro: 11, respawn: 4, yaw: PI / 2, onPop: (b) => { if (!this.tut) w.pickups.boltBurst(b.aimPoint(new V3()), 10); for (const it of w.pickups.items) if (it.age === 0) it.data.practice = true; } });
      w.addActor(this.spar);
      if (!this.tutorial) this.pcrates = SP.crateSpots.map((p, i) => { const c = new TCrate(w, i === 1 ? 'metal' : 'wood', p, { bank: false, respawn: 4 }); w.addActor(c); return c; });
    }
    buildKickStar() {
      const m = new THREE.Mesh(G.Geo.emblem('star'), G.M.vc({ emissive: 0xffd23f, ei: 0.3, rimStr: 0.6 }));
      m.scale.setScalar(0.9); m.add(G.R.glowSprite(0xffe066, 2.2, 0.6));
      m.position.set((KICK.lx0 + KICK.lx1) / 2, KICK.top + 1.1, (KICK.z0 + KICK.z1) / 2);
      this.world.add(m); this.kickStar = { m, reT: 0 };
    }
    addInteracts() {
      const w = this.world, v = a => new V3(a[0], 0, a[2]);
      w.addInteract({ pos: v(SP.coach), r: 2.9, key: 'train.talk', onUse: () => G.UI.open('training-gate', { inRange: true }), enabled: () => !this.tut });
      w.addInteract({ pos: v(SP.rack), r: 2.7, key: 'train.rack', onUse: () => G.UI.open('train-rack'), enabled: () => !this.tut });
      w.addInteract({ pos: v(SP.popupBtn), r: 2.7, key: 'train.popupStart', onUse: () => this.popup.start(), enabled: () => !this.tut && this.popup.state === 'idle' && !this.tryRun });
      w.addInteract({ pos: v(SP.podium), r: 2.5, key: 'train.replay', onUse: () => G.UI.confirm(G.t('train.replayQ'), () => T.start()), enabled: () => !this.tut });
      w.addInteract({ pos: new V3(SP.gate[0], 0, SP.gate[2] - 0.9), r: 2.5, key: G.Game.modes.hub ? 'train.exit' : 'train.exitTitle', onUse: () => this.leave(), enabled: () => !this.tut && !!exitMode() });
    }
    hudExtras() {
      G.HUD.minimapRange = 36;
      G.HUD.minimapDraw = (g, k, pl) => drawMap(g, k, pl);
      G.HUD.setBolts(this.clinks);
      this.slotsBuilt = false;
    }
    startFree() {
      G.HUD.show({ vitals: true, weapons: true, crosshair: true, minimap: true, bolts: true, feed: true });
      this.hudExtras();
      if (this.params.tryWeapon) this.startTry(this.params.tryWeapon);
      else if (this.params.station === 'popup') this.pendingPopup = 0.8;
      else setTimeout(() => { if (S === this && !this.tut) T.say(['train.coach.hi1', 'train.coach.hi2', 'train.coach.hi3'][(Math.random() * 3) | 0], { face: 'coach' }); }, 900);
    }
    startTry(id) {
      const pl = this.player, i = pl.weapons.findIndex(w => w && (w.id === id || (w.def && w.def.id === id)));
      if (i >= 0 && i !== pl.wi) pl.equip(i);
      this.teleport(SP.stand);
      this.tryRun = { id, t: 30, pops: 0 };
      T.say('train.tryIt', { params: { name: wname(id) }, dur: 3 });
      sfx('go');
    }
    updateTry(dt) {
      const tr = this.tryRun; if (!tr) return;
      tr.t -= dt;
      G.HUD.setTimer(Math.max(0, tr.t), tr.t < 5);
      if (tr.t <= 0) {
        this.tryRun = null; G.HUD.setTimer(null); sfx('questDone');
        const back = this.params.returnTo && G.Game.modes[this.params.returnTo] ? this.params.returnTo : exitMode();
        openResult({ kind: 'try', weapon: tr.id, pops: tr.pops, backTo: back, backParams: this.params.returnParams || null });
      }
    }
    goStation(id) {
      this.trial.cancel(true);
      if (id === 'course') { this.teleport(SP.course); T.say('beepo.tipCourse', { once: false }); }
      else if (id === 'popup') this.popup.start();
    }
    teleport(at) {
      const pl = this.player;
      // Deck spots over the goo pool give y explicitly (0 = deck A/B top); never drop to the basin floor.
      pl.pos.set(at[0], Math.max(at[1] || 0, hf(at[0], at[2])) + 0.02, at[2]);
      pl.vel.set(0, 0, 0); pl.yaw = at[3] || 0; pl.pitch = -0.04;
      pl.mantling = null; pl.sliding = 0; pl.dashT = 0; pl.safePos.copy(pl.pos); pl._lastY = pl.pos.y;
      if (!pl.alive) pl.respawn(pl.pos.clone());
    }
    safeSpot() {
      const p = this.player.safePos;
      for (const d of DECKS) {
        if (Math.abs(p.x - d.x) < d.w / 2 + 0.6 && Math.abs(p.z - d.z) < d.d / 2 + 0.6 && Math.abs(p.y - d.top) < 0.8) {
          return [U.clamp(p.x, d.x - d.w / 2 + 0.9, d.x + d.w / 2 - 0.9), d.top, U.clamp(p.z, d.z - d.d / 2 + 0.9, d.z + d.d / 2 - 0.9), this.player.yaw];
        }
      }
      if (inPool(p.x, p.z, 0.8) || p.y < -0.2) return [U.clamp(p.x, POOL.x0 - 2, POOL.x1 + 2), 0, POOL.z1 + 1.8, PI];
      return [p.x, 0, p.z, this.player.yaw];
    }
    splash() {
      const pl = this.player, w = this.world;
      const at = _v1.set(pl.pos.x, GOO_Y + 0.15, pl.pos.z);
      w.fx.burst(at, [0xa8f5ff, 0xffffff, 0x3fb4e0], 26, 7.5, 0.32, 0.8, { normal: true, grav: 14, up: 5, alpha: 0.9 });
      w.fx.ring(at, 2.6, 0xa8f5ff, 0.5);
      sfx('splashBig');
      flashScreen();
      const cp = (this.tut && this.tut.resetSpot()) || (this.trial.running ? this.trial.resetSpot() : null) || this.safeSpot();
      this.teleport(cp);
      if (this.tut) this.tut.onSplash();
      else if (!this.trial.running) G.UI.toast(G.t('train.splash'));
    }
    onTargetPop(t, info) {
      if (this.popup.state === 'run') this.popup.onPop(t, info);
      if (this.tryRun && t.tk !== 'decoy') this.tryRun.pops++;
    }
    onDamage(t, res, info) {
      if (info && info.crit && t && t.practice && info.src && info.src.isPlayer && this.t - this.weakT > 1.2 && this.popup.state !== 'run') { this.weakT = this.t; G.HUD.feed(G.t('train.weak'), 'rgba(255,194,26,.9)'); }
    }
    onKill() {}
    onPickup(type, data) {
      // The first run pays its small rewards; a replay from the Training Range only pays crate loot that was never
      // collected (e.g. after a skip) — balloon and sparring-bot clinks are practice there.
      const crate = !!(data && data.tutCrate != null);
      const bank = !!this.tut && !(data && data.practice) && (this.tut.firstRun || crate);
      // remember what each tutorial crate already paid (a resumed or replayed tutorial never pays it twice)
      const cl = bank && crate ? (obj(obj(tutRec(), 'crateLoot'), data.tutCrate)) : null;
      if (cl && !Array.isArray(cl.parts)) cl.parts = [];
      if (type === 'bolt') {
        const v = Math.max(1, (data && data.value) || 1);
        this.clinks += v; G.HUD.setBolts(this.clinks);
        let pay = bank ? v : 0;
        // the balloons' and the sparring bot's clinks are paid once per tutorial, also across a reload (tutorial.loot)
        if (pay && data && data.tutLoot && LOOT_CAP[data.tutLoot]) { const L = obj(tutRec(), 'loot'); pay = Math.max(0, Math.min(pay, LOOT_CAP[data.tutLoot] - (L[data.tutLoot] | 0))); L[data.tutLoot] = (L[data.tutLoot] | 0) + pay; }
        if (pay && G.Progress && G.Progress.addBolts) G.Progress.addBolts(pay);
        if (cl) cl.clinks = (cl.clinks | 0) + v;
      } else if (type === 'part' && data) {
        if (bank && G.Progress && G.Progress.addPart) G.Progress.addPart(data.partId, data.n || 1);
        if (cl) for (let k = 0; k < (data.n || 1); k++) cl.parts.push(data.partId);
        const key = 'part.' + data.partId + '.name';
        G.HUD.pick(G.i18n.has(key) ? G.t(key) : data.partId, G.Data && G.Data.partIcon ? G.Data.partIcon(data.partId) : '');
      }
      return true;
    }
    onPlayerDeath() { this.respawnT = 0.9; this.trial.cancel(true); }
    // The slide gate must never be a wall for a kid: (1) slide pressed too slowly in the run-up still slides;
    // (2) standing under the panel, or walking into it, crouches you through. Runs before the player update.
    gateHelp() {
      const pl = this.player, p = pl.pos, io = G.input;
      this.gateCrouchNow = false;
      if (!pl.alive || !pl.grounded || pl.sliding > 0 || Math.abs(p.x - L1) > 2.6 || p.y < C_TOP - 0.3 || p.y > C_TOP + 0.6) return;
      const dz = p.z - GATE_Z, hs = Math.hypot(pl.vel.x, pl.vel.z);
      if (io.slideP && dz > 0.2 && dz < 4.5 && hs < 5.5 && Math.cos(pl.yaw) > 0.5 && !G.UI.anyOpen()) {
        pl.sliding = 1.1; pl.vel.z = -8.5; pl.vel.x *= 0.3; sfx('slide'); return;
      }
      if (Math.abs(dz) < 0.32 || (Math.abs(dz) < 1.0 && io.move.y > 0.3 && hs < 1.5)) { io.slide = true; this.gateCrouch = this.gateCrouchNow = true; }
    }
    // Airborne + pushing toward a ledge near the top of a jump = climb it (GDD §4 mantle). Core's own
    // auto-mantle never fires (see report), so the Range does it here so the wall step is teachable.
    autoMantle() {
      const pl = this.player, io = G.input;
      if (this.noAutoMantle || !pl.alive || pl.grounded || pl.mantling || !pl.inputEnabled || G.UI.anyOpen() || !pl.stats.mantle || pl.vel.y >= 3 || !pl._tryMantle) return;
      const mx = io.move.x, my = io.move.y; if (mx * mx + my * my < 0.25) return;
      const s = Math.sin(pl.yaw), c = Math.cos(pl.yaw);
      try { pl._tryMantle(c * mx - s * my, -s * mx - c * my, true); } catch (e) { this.noAutoMantle = true; console.warn('auto mantle', e); }
    }
    leave() { const to = exitMode(); if (to) G.Game.go(to); }
    update(dt) {
      this.t += dt;
      const pl = this.player, w = this.world;
      if (!this.slotsBuilt && G.HUD.visible) { this.slotsBuilt = true; G.HUD.buildSlots(); }
      for (const wp of pl.weapons) if (wp && !wp.infinite && wp.maxAmmo > 0 && wp.ammo < wp.maxAmmo) wp.ammo = wp.maxAmmo;
      this.gateHelp();
      if (this.gateCrouch && !this.gateCrouchNow) { this.gateCrouch = false; if (G.input.device === 'touch') { const b = G.Input.btn && G.Input.btn('slide'); G.input.slide = !!(b && b.classList.contains('down')); } }
      this.autoMantle();
      if (this.respawnT >= 0) { this.respawnT -= dt; if (this.respawnT < 0) { const at = (this.tut && this.tut.resetSpot()) || (this.trial.running ? this.trial.resetSpot() : null) || this.spawnSpot(); pl.respawn(new V3(at[0], (at[1] || 0) + 0.02, at[2])); pl.yaw = at[3] || 0; } }
      // ambient: goo bubbles + coach looks at you
      this.bubT -= dt;
      if (this.bubT <= 0) { this.bubT = 0.12 / G.R.q().particles; w.fx.spawn(_v1.set(U.rand(POOL.x0 + 0.5, POOL.x1 - 0.5), GOO_Y + 0.05, U.rand(POOL.z0 + 0.5, POOL.z1 - 0.5)), _v2.set(0, U.rand(0.4, 1), 0), 0xe8ffff, U.rand(0.12, 0.26), U.rand(0.6, 1.2), { normal: true, grav: -0.6, alpha: 0.75 }); }
      const c = this.coach.group, dxc = pl.pos.x - c.position.x, dzc = pl.pos.z - c.position.z;
      c.rotation.y = U.angleDamp(c.rotation.y, Math.hypot(dxc, dzc) < 9 ? Math.atan2(dxc, dzc) : 0.4, 3, dt);
      if (this.coach.animate) this.coach.animate(w.time, dt);
      this.goal.update(dt, w.time);
      this.gallery.update(dt);
      this.hintT -= dt;
      if (this.hintT <= 0) {   // keep Beepo's bubble just under whatever sits at the top centre (caption, timers)
        this.hintT = 0.35;
        const tc = G.HUD.visible && document.querySelector('#hud .hud-tc'), r = tc && (G.Screen ? G.Screen.rectToLocal(tc.getBoundingClientRect()) : tc.getBoundingClientRect());
        const top = r && r.height > 4 ? Math.round(r.bottom + 10) : 84;
        if (top !== this.hintTop) { this.hintTop = top; layer().style.setProperty('--tut-hint-top', top + 'px'); }
      }
      this.updateKick(dt);
      if (this.tut) this.tut.update(dt);
      else this.freeUpdate(dt);
    }
    freeUpdate(dt) {
      const pl = this.player;
      this.trial.update(dt);
      this.popup.update(dt);
      this.updateTry(dt);
      if (this.pendingPopup > 0) { this.pendingPopup -= dt; if (this.pendingPopup <= 0) this.popup.start(); }
      if (pl.wallKicked && !this.wk && !pl.grounded) G.HUD.feed(G.t('train.wallKick'), 'rgba(143,107,255,.88)');
      this.wk = pl.wallKicked && !pl.grounded;
      this.tipT -= dt;
      if (this.tipT <= 0) {
        this.tipT = 0.5;
        const p = pl.pos, near = (a, r) => U.distXZ(p, { x: a[0], z: a[2] }) < r;
        if (near(SP.stand, 6)) T.hint('beepo.tipGallery');
        else if (near(SP.course, 4.5)) T.hint('beepo.tipCourse');
        else if (near([PEN.x, 0, PEN.z], 7.5)) T.hint('beepo.tipPen');
        else if (near([SPAR.x, 0, SPAR.z], 6.5)) T.hint('beepo.tipSpar');
        else if (near(SP.rack, 4)) T.hint('beepo.tipRack');
        else if (near([1.3, 0, -14], 5)) T.hint('beepo.tipKick');
        else if (near(SP.popupBtn, 4.5)) T.hint('beepo.tipPopup');
      }
      this.markT -= dt;
      if (this.markT <= 0) { this.markT = 0.3; this.updateMarkers(); }
    }
    updateMarkers() {
      const p = this.player.pos;
      const list = [
        ['st-coach', [SP.coach[0], 2.9, SP.coach[2]], 'train.coach', '#3fe0b8', '!'],
        ['st-gallery', [SP.stand[0] + 1.6, 3.2, -6], 'train.gallery', '#ff6b8b', IC.target],
        ['st-course', [L1, 4.8, 6.9], 'train.course', '#7debd0', IC.flag],
        ['st-pen', [PEN.x, 3.4, PEN.z], 'train.pen', '#ffd23f', IC.bot],
        ['st-kick', [1.3, 6.8, -15.5], 'train.kick', '#b9a2ff', IC.star],
        ['st-exit', [SP.gate[0], 5.4, SP.gate[2]], G.Game.modes.hub ? 'train.exit' : 'train.exitTitle', '#ffd23f', IC.gate],
      ];
      for (const [id, pos, key, col, icon] of list) {
        const d = U.distXZ(p, { x: pos[0], z: pos[2] });
        const show = d > 7 && d < 44 && !this.popup.state.startsWith('r') && !this.trial.running;
        if (show) G.HUD.marker(id, _v4.fromArray(pos), { icon: icon.indexOf('<svg') === 0 ? icon.replace('<svg ', '<svg width="14" height="14" ') : icon, label: G.t(key), color: col, edge: false, dist: false });
        else G.HUD.removeMarker(id);
      }
    }
    updateKick(dt) {
      const ks = this.kickStar; if (!ks) return;
      const m = ks.m, pl = this.player;
      if (ks.reT > 0) { ks.reT -= dt; if (ks.reT <= 0) { m.visible = true; this.world.fx.ring(m.position.clone(), 1.2, 0xffe066, 0.4); } return; }
      m.rotation.y += dt * 2.2; m.position.y = KICK.top + 1.1 + Math.sin(this.world.time * 2.5) * 0.15;
      if (pl.alive && Math.abs(pl.pos.x - m.position.x) < 1.3 && Math.abs(pl.pos.z - m.position.z) < 1.3 && Math.abs(pl.pos.y + 0.9 - m.position.y) < 1.6) {
        m.visible = false; ks.reT = 6;
        this.world.fx.confetti(m.position.clone(), 50); sfx('star', { n: 3 }); sfx('questDone');
        G.UI.toast(G.t('train.kickStar'), { icon: IC.star });
      }
    }
    late(dt) {
      const pl = this.player;
      if (pl.alive && (pl.pos.y < FALL_Y || (pl.pos.y < -0.3 && inPool(pl.pos.x, pl.pos.z, 0.3)))) this.splash();
      if (this.tut) this.tut.late(dt);
    }
    exit() {
      for (const off of this.offs) off();
      if (this.tut) this.tut.dispose();
      if (this.popup) this.popup.stop();
      if (G.Progress && this.prevAutoXP !== undefined) G.Progress.autoWeaponXP = this.prevAutoXP;
      T.clearGhosts(); clearPulses(); T.hideHint();
      if (layerEl) { for (const c of Array.from(layerEl.children)) if (!c.classList.contains('tut-bubble')) c.remove(); layerEl.style.removeProperty('--tut-hint-top'); }
      G.HUD.setTimer(null); G.HUD.clearMarkers();
    }
  }
  function drawMap(g, k, pl) {
    const X = x => (x - pl.pos.x) * k, Z = z => (z - pl.pos.z) * k;
    g.fillStyle = '#8fd27c'; g.fillRect(-400, -400, 800, 800);
    g.fillStyle = '#a6e08e'; g.fillRect(X(-30), Z(-20), 60 * k, 40 * k);
    g.fillStyle = '#f2dcae'; g.fillRect(X(-13.5), Z(-18.5), 10 * k, 26 * k); g.fillRect(X(-6.5), Z(10.5), 14 * k, 10 * k);
    g.fillStyle = '#5fd0e6'; g.fillRect(X(POOL.x0), Z(POOL.z0), (POOL.x1 - POOL.x0) * k, (POOL.z1 - POOL.z0) * k);
    g.fillStyle = '#fff1c8'; for (const d of DECKS) g.fillRect(X(d.x - d.w / 2), Z(d.z - d.d / 2), d.w * k, d.d * k);
    g.fillRect(X(L2 - LW / 2), Z(1.5), LW * k, 10 * k);
    g.fillStyle = '#3e9e57'; g.fillRect(X(STAND_X - 0.4), Z(-15), 0.8 * k, 18 * k);
    g.fillStyle = '#8c7bff'; g.fillRect(X(KICK.wx - 0.3), Z(KICK.z0), 0.6 * k, (KICK.z1 - KICK.z0) * k);
    g.fillStyle = '#ff7a93'; g.beginPath(); g.arc(X(SP.gate[0]), Z(SP.gate[2]), 4, 0, TAU); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.strokeRect(X(-30), Z(-20), 60 * k, 40 * k);
  }

  // ================================================================== fallback weapon (only when 16_weapons is missing)
  function fallbackWeapon(owner) {
    let cd = 0;
    const w = {
      id: 'fizz', def: { id: 'fizz', range: 60, glow: 0x4fd8ff }, level: 1, ammo: 0, maxAmmo: 0, spreadNow: 0.012, infinite: true,
      update(dt, ctx) {
        cd -= dt; w.spreadNow = Math.max(0.012, w.spreadNow - dt * 0.05);
        if (ctx.firing && cd <= 0) {
          cd = 0.2;
          const dir = ctx.dir.clone(); dir.x += (Math.random() - 0.5) * w.spreadNow; dir.y += (Math.random() - 0.5) * w.spreadNow; dir.normalize();
          ctx.world.projectiles.spawn({ pos: ctx.origin, dir, speed: 70, damage: 18, src: ctx.owner, team: ctx.team, kind: 'bolt', color: 0x4fd8ff, size: 0.09, life: 1.2 });
          ctx.world.fx.flash(ctx.origin, 0x9ff6ff, 0.5, 0.06);
          if (ctx.owner.onFired) ctx.owner.onFired(0.008, 0.04, 0);
          sfx('blaster'); w.spreadNow = Math.min(0.04, w.spreadNow + 0.006);
        }
      },
      idle() {}, reload() {}, refill() {}, xpFrac: () => 0, ammoText: () => '∞',
      buildViewmodel() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 10), G.M.toon(0x2ec4b6, { spec: 0.6 })); body.rotation.x = PI / 2; g.add(body);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.16, 10), G.M.toon(0xe8b44a)); barrel.rotation.x = PI / 2; barrel.position.z = -0.17; g.add(barrel);
        for (const z of [-0.05, 0.04]) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), G.M.glowMat(0x4fd8ff, 0.95)); c.position.z = z; g.add(c); }
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), G.M.toon(0x1f2a5a)); grip.position.set(0, -0.08, 0.06); grip.rotation.x = 0.3; g.add(grip);
        return g;
      },
    };
    void owner;
    return w;
  }

  // ================================================================== screens
  const medalChip = m => el('span.train-medal.m' + (m || 0));
  G.UI.def('training-gate', {
    dim: false,   // flat dim (menus kit .mm-dim) instead of a costly backdrop blur over the live 3D view
    build(p, close, entry) {
      if (entry && entry.el) entry.el.classList.add('mm-dim');
      const inRange = G.Game.modeId === 'training' && S && !S.tut;
      const tr = trialRec('hop'), pm = popupMedal(), pb = popupBest();
      const lines = ['train.coach.hi1', 'train.coach.hi2', 'train.coach.hi3', 'train.coach.tip'];
      const head = el('div.row', { style: { flexWrap: 'nowrap' } },
        el('div.portrait', { html: coachSVG() }),
        el('div.col', { style: { gap: '4px', flex: '1', minWidth: '0' } }, el('div.npc-name', { text: G.t('train.coach') }), el('div.npc-line', { text: G.t(U.pick(lines)) })));
      const card = (icon, col, title, desc, stats, btnKey, cls, fn) => el('div.card.train-card',
        el('div.tc-h', el('div.ico', { html: icon, style: { background: col } }), el('h3', { text: title })),
        el('p', { text: desc }), stats ? el('div.tc-s', stats) : null, G.UI.btn(btnKey, fn, cls));
      const cards = [];
      if (!inRange) cards.push(card(IC.target, '#ffd23f', G.t('train.enter'), G.t('train.enterD'), null, 'train.enter', 'go', () => { close(); G.Game.go('training', { tutorial: false }); }));
      cards.push(card(IC.flag, '#7debd0', G.t('train.trial.hop'), G.t('train.trialD'),
        [medalChip(tr.medal), el('span', { text: tr.best != null ? G.t('train.best', { t: U.fmtMs(tr.best) }) : G.t('train.noBest') }), el('span.muted', { text: G.t('train.goldT', { t: U.fmtMs(TRIAL_GOLD) }) })],
        'train.trialGo', 'primary', () => { close(); if (inRange) S.goStation('course'); else G.Game.go('training', { station: 'course', tutorial: false }); }));
      cards.push(card(IC.star, '#ff8fa8', G.t('train.popup'), G.t('train.popupD'),
        [medalChip(pm), el('span', { text: G.t('train.best', { t: G.i18n.num(pb) }) })],
        'train.popupStart', 'hot', () => { close(); if (inRange) S.goStation('popup'); else G.Game.go('training', { station: 'popup', tutorial: false }); }));
      cards.push(card(beepoSVG('happy'), '#fff1dc', G.t('train.replay'), G.t('train.replayD'), null, 'train.replay', '', () => { close(); G.UI.confirm(G.t('train.replayQ'), () => T.start()); }));
      // Same look as every other Fizzport building: Coach Ping on the NPC rail (menus kit, 30_menus.js).
      if (G.Menus && G.Menus.buildingPanel) {
        return G.Menus.buildingPanel({ npc: 'ping', titleKey: 'train.title', roleKey: G.i18n.has('menu.t.role') ? 'menu.t.role' : null, say: U.pick(lines), wallet: !inRange,
          body: [el('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(min(210px, 100%), 1fr))' } }, cards)] }, close);
      }
      return G.UI.panel('train.title', close, [head, el('div.grid', { style: { marginTop: '10px' } }, cards)], { icon: IC.target.replace('currentColor', '#ff6b8b').replace(/currentColor/g, '#ff6b8b') });
    },
  });
  G.UI.def('train-rack', {
    build(p, close) {
      const pl = S && S.player;
      if (!pl) return G.UI.panel('train.rackTitle', close, []);
      const held = pl.weapons.map(w => w && (w.id || (w.def && w.def.id)));
      const ids = (G.Data && G.Data.WEAPON_IDS) || (G.Weapons && G.Weapons.ids) || held;
      const cards = ids.map(id => {
        const i = held.indexOf(id), ic = wicon(id) || IC.rack;
        const icon = el('div', { html: ic, style: { width: '54px', height: '54px', alignSelf: 'center', color: '#1e1a4d' } });
        if (i < 0) return el('div.card.locked', icon, el('h3', { text: wname(id) }), el('p', { text: G.t('train.locked') }));
        const w = pl.weapons[i];
        return el('div.card.clickable' + (i === pl.wi ? '.sel' : ''), { onclick: () => { if (i !== pl.wi) pl.equip(i); G.UI.toast(G.t('train.equip', { name: wname(id) })); close(); } },
          icon, el('h3', { text: wname(id) }),
          el('div.row', el('span.tag', { text: G.t('ui.level', { n: w.level || 1 }) }), i === pl.wi ? el('span.tag', { text: G.t('train.holding') }) : null),
          S.tut || S.tryRun || S.popup.state !== 'idle' ? null : G.UI.btn('train.tryBtn', () => { close(); S.startTry(id); }, 'small cool'));
      });
      return G.UI.panel('train.rackTitle', close, [el('p.muted', { i18n: 'train.rackHint', style: { margin: '0 0 8px' } }), el('div.grid.tight', cards)], { icon: IC.rack });
    },
  });
  // A screen that only closes from its own buttons is a trap on touch when they end up off-screen; these cards also
  // close from a tap on the dim backdrop (after a short grace, so a thumb still on the fire button can't dismiss one
  // unseen) — with Esc / gamepad B (escClose) that makes three ways out.
  function backdropClose(entry, close) {
    if (!entry || !entry.el || entry.el._tutBackdrop) return;
    entry.el._tutBackdrop = true;
    const opened = performance.now();
    entry.el.addEventListener('click', e => { if (e.target === entry.el && performance.now() - opened > 700) close(); });
  }
  // CSS entrances on the cards (headline, medal stamp, reward chips): Chromium can leave an animation created while
  // the card is styled pending forever, frozen on its first keyframe (seen on the Continue card: 'Welcome back!' sat
  // at opacity 0). Whatever is still pending after a moment is dropped, which shows the element as it ends.
  function unstick(root) {
    setTimeout(() => {
      if (!root || !root.isConnected || typeof root.getAnimations !== 'function') return;
      for (const a of root.getAnimations({ subtree: true })) if (a.pending && a.startTime == null) G.safe('unstick', () => a.cancel());
    }, 900);
    return root;
  }
  // One result card at a time (a second trial used to open a second card over a first one that couldn't be closed).
  function openResult(params) {
    while (G.UI.isOpen('train-result')) G.UI.close('train-result');
    G.UI.open('train-result', params);
  }
  G.UI.def('train-result', {
    build(p, close, entry) {
      const m = p.medal || 0, kind = p.kind;
      const title = kind === 'trial' ? G.t('train.trial.hop') : kind === 'popup' ? G.t('train.popup') : G.t('train.tryIt', { name: wname(p.weapon) });
      const stamp = kind === 'try' ? el('div.tr-trophy', { html: IC.trophy }) : el('div.train-medal.train-stamp.m' + m, { html: m ? IC.star : '' });
      const sub = el('div.tr-sub', { text: kind === 'try' ? G.t('train.tryEnd') : m ? G.t('train.medalGet', { medal: G.t('train.medal.' + m) }) : G.t('train.medal.0') });
      const rw = (k, v) => el('div.rw', el('span', { text: k }), el('b', { text: v }));
      const rows = [];
      if (kind === 'trial') { rows.push(rw(G.t('train.time'), U.fmtMs(p.time)), rw(G.t('train.goldT', { t: '' }).trim(), U.fmtMs(p.gold || TRIAL_GOLD))); if (p.best != null) rows.push(rw(G.t('train.best', { t: '' }).trim(), U.fmtMs(p.best))); }
      else if (kind === 'popup') rows.push(rw(G.t('train.score'), G.i18n.num(p.score)), rw(G.t('train.pops'), G.i18n.num(p.pops)), rw(G.t('train.best', { t: '' }).trim(), G.i18n.num(p.best)));
      else rows.push(rw(G.t('train.pops'), G.i18n.num(p.pops || 0)));
      const lines = (p.lines || []).filter(l => l && l.text);
      const rewards = lines.length ? el('div.reward-list', lines.map((l, i) => el('div.reward', { style: { animationDelay: (0.3 + i * 0.12) + 's' } }, l.icon ? el('span', { html: l.icon, style: { width: '22px', height: '22px', display: 'inline-flex' } }) : null, el('span', { text: l.text })))) : null;
      const btns = [];
      if (kind === 'try') {
        if (p.backTo) btns.push(G.UI.btn('train.done', () => { close(); G.Game.go(p.backTo, p.backParams || undefined); }, 'primary'));
        btns.push(G.UI.btn('train.keep', close, ''));
      } else {
        if (p.onRetry) btns.push(G.UI.btn('train.retry', () => { close(); p.onRetry(); }, 'cool'));
        btns.push(G.UI.btn('train.done', close, 'primary'));
      }
      backdropClose(entry, close);
      return unstick(el('div.panel.narrow.train-res',
        el('div.panel-head', el('h2', { text: title }), G.UI.closeBtn(close)),
        el('div.tr-body',
          el('div.tr-top', stamp, el('div', sub, p.newBest ? el('div', el('span.nb', { text: G.t('train.newBest') })) : null)),
          el('div.rows', rows), rewards),
        el('div.row.center.tr-foot', btns)));
    },
  });
  G.UI.def('tut-reward', {
    build(p, close, entry) {
      const item = (icon, text, i) => el('div.item', { style: { animationDelay: (0.25 + i * 0.15) + 's' } }, el('div.ico', { html: icon }), el('div', { text }));
      const items = [item(IC.skin, G.t('tut.skin'), 0), item(nutSVG, G.t('tut.clinks', { n: 200 }), 1)];
      if (p.parts > 0) items.push(item(IC.gear, G.t('tut.parts'), 2));
      // Tapping the dim backdrop also closes the card (touch has no Esc, so this is a second way out)
      backdropClose(entry, close);
      return unstick(el('div.panel.narrow.tut-reward',
        el('div.ttl', { text: G.t('tut.ready') }),
        el('div.bp', { html: beepoSVG('wow') }),
        el('p.sub', { text: G.t('tut.readySub') }),
        el('div.items', items),
        G.UI.btn('tut.go', close, 'primary big')));
    },
  });

  // A first-run tutorial cut short by a reload: Continue (from the saved step) or Start over. Opened by the
  // title flow (30c leaveTitle) with {step}; with no params it reads the saved step itself.
  G.UI.def('tut-resume', {
    modal: true,
    escClose: false,
    build(p, close) {
      const step = U.clamp((p.step != null ? p.step : T.resumeStep()) | 0, 0, STEP_IDS.length - 1);
      const id = STEP_IDS[step], st = STEP[id];
      const ic = el('div.ic', { html: btnIcon(st.icon), style: { background: BTN_COL[st.icon] || '#fff' } });
      if (st.badge) ic.appendChild(el('b', { text: st.badge }));
      const go = r => { close(); sfx('go'); T.start({ resume: r }); };
      return unstick(el('div.panel.narrow.tut-reward.tut-resume',
        el('div.ttl', { text: G.t('tut.resumeTitle') }),
        el('div.bp', { html: beepoSVG('happy') }),
        el('p.sub', { text: G.t('tut.resumeQ') }),
        el('div.tut-cap', { style: { animation: 'none', maxWidth: '100%' } }, ic, el('div.tx', { text: G.t('tut.' + id) })),
        el('div.tut-dots', STEP_IDS.map((s, i) => el('i' + (i < step ? '.done' : i === step ? '.cur' : '')))),
        el('div.rs-step', { text: G.t('tut.resumeStep', { n: step + 1, total: STEP_IDS.length }) }),
        el('div.row.center', { style: { gap: '12px', flexWrap: 'wrap' } },
          G.UI.btn('tut.continue', () => go(step), 'primary big', { icon: IC.skip }),
          G.UI.btn('tut.restart', () => go(0), ''))));
    },
  });

  // ================================================================== mode registration
  G.Game.register('training', {
    layout: 'fps', music: 'training', pausable: true,
    enter(params) { S = new Range(params || {}); return S.world; },
    exit() { if (S) G.safe('training exit', () => S.exit()); S = null; },
    update(dt) { if (S) S.update(dt); },
    lateUpdate(dt) { if (S) S.late(dt); },
    restart() { G.Game.go('training', Object.assign({}, G.Game.params)); },
  });
  G.Training = { get session() { return S; }, STEP_IDS, TRIAL_GOLD, POPUP_MEDALS, SP, DECKS, CPS: CPS.map(c => c.at), medalFor };
})(window.G);

}).call(window); } catch (e) { console.error('[module 26_training.js]', e); }
})();
