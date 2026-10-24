/* Marmalune Rangers — menus: 30_menus.js 30b_menus_town.js 30c_menus_title.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 30_menus.js
try { (function () {
// 30_menus.js — shared menu kit + cross-mode screens for MARMALUNE RANGERS.
//   G.Menus   : scoped CSS, inline SVG icon set, tolerant data adapters over G.Data / G.Progress /
//               G.Quests / G.Save.prof, and UI components (wallet chips, item tiles, cost rows,
//               reward chips, building panel scaffold with NPC rail).
//   Screens   : 'npc-talk' (portrait dialogue), 'quickmenu' (hub fast travel + mode list),
//               'results' (shared end-of-match screen used by EVERY mode).
// Building screens live in 30b_menus_town.js; title / language / control preset in 30c_menus_title.js.
//
// results contract: G.UI.open('results', {mode, win, stars 0..3, title?, stats:[{key, value}],
//   rewards (array from G.Progress.grantRewards or raw object), onContinue?, onRetry?, medal?, tip?})
(function (G) {
  'use strict';
  const U = G.util;
  // G.UI.el + CSS custom properties: style keys starting with '--' are applied with setProperty
  // (Object.assign on CSSStyleDeclaration ignores them).
  const el = function (sel, props, ...kids) {
    let vars = null;
    if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props) && props.style && typeof props.style === 'object') {
      const style = {};
      for (const k in props.style) { if (k.startsWith('--')) (vars = vars || {})[k] = props.style[k]; else style[k] = props.style[k]; }
      if (vars) props = Object.assign({}, props, { style });
    }
    const e = G.UI.el(sel, props, ...kids);
    if (vars) for (const k in vars) if (vars[k] != null) e.style.setProperty(k, String(vars[k]));
    return e;
  };

  G.i18n.add('en', {
    'menu.close': 'Close', 'menu.back': 'Back', 'menu.locked': 'Locked', 'menu.owned': 'Owned', 'menu.equipped': 'Equipped', 'menu.equip': 'Equip', 'menu.unequip': 'Remove',
    'menu.empty': 'Nothing here yet!', 'menu.soon': 'Coming soon!', 'menu.needStar': 'Guild ★{n}', 'menu.needPr': 'Rank {n}', 'menu.max': 'MAX', 'menu.free': 'FREE',
    'menu.clinks': 'Clinks', 'menu.lumite': 'Lumite', 'menu.stamps': 'Stamps', 'menu.xp': 'XP', 'menu.have': 'Have {n}', 'menu.lv': 'Lv {n}',
    'menu.needMore': 'Need {n} more {name}', 'menu.needClinks': 'Need {n} more Clinks', 'menu.notEnough': 'Not enough yet!', 'menu.done': 'Done!',
    'menu.places': 'Places', 'menu.play': 'Play now', 'menu.map': 'Fizzport Map', 'menu.go': 'Go!', 'menu.travel': 'Zip there', 'menu.controls': 'Controls', 'menu.settings': 'Settings', 'menu.toTitle': 'Title screen',
    'menu.unavailable': 'That mode is still being built. Try again soon!',
    'menu.tap': 'Tap to continue', 'menu.skip': 'Skip',
    'menu.mode.expedition': 'Missions', 'menu.mode.expeditionD': 'Explore islands and pop Gizmob bots.',
    'menu.mode.boss': 'Boss Hunt', 'menu.mode.bossD': 'Rematch the big bosses for rare parts.',
    'menu.mode.turf': 'Goo Turf', 'menu.mode.turfD': '4v4 goo painting battle with bots.',
    'menu.mode.race': 'Star Skiff Rally', 'menu.mode.raceD': 'Race star-skiffs through asteroid rings.',
    'menu.mode.royale': 'Sky Drop Royale', 'menu.mode.royaleD': 'You vs 15 bots. Last one bouncing wins!',
    'menu.mode.defense': 'Fountain Guard', 'menu.mode.defenseD': 'Protect the fountain from robot raids.',
    'menu.mode.training': 'Training Range', 'menu.mode.trainingD': 'Targets, time trials and practice.',
    'menu.place.guild': 'Quests and promotions', 'menu.place.workshop': 'Craft, upgrade and loadout', 'menu.place.shop': 'Buy and sell', 'menu.place.cafe': 'Daily treats and boosters',
    'menu.place.gallery': 'Stickers, Codex and stats', 'menu.place.defense': 'Fountain Guard lobby', 'menu.place.training': 'Practice and medals', 'menu.place.hangar': 'Star Skiff races',
    'menu.place.arena': 'Goo Turf battles', 'menu.place.royale': 'Sky Drop Royale', 'menu.place.fountain': 'Pick a mission',
    'npc.quill': 'Quill', 'npc.gizma': 'Gizma', 'npc.penny': 'Penny Pop', 'npc.bloop': 'Barista Bloop', 'npc.lumi': 'Curator Lumi', 'npc.ping': 'Coach Ping', 'npc.ace': 'Ace Wobble',
    'npc.ticktock': 'Tick & Tock', 'npc.gale': 'Captain Gale', 'npc.beepo': 'Beepo',
    'npc.quill.l1': 'Welcome to the Reef Ranger Guild! I\'m Quill. Everything important goes on my clipboard.',
    'npc.quill.l2': 'Pick a quest from the board. When you finish, I\'ll stamp it and hand out rewards.',
    'npc.quill.l3': 'Clear the Key quests to unlock a Promotion. New stars mean new islands!',
    'npc.quill.l4': 'Mega-Mayor Mox wants to pave our reefs into a parking lot. Not on my clipboard!',
    'npc.gizma.l1': 'Hmph. A new Ranger. Name\'s Gizma. I build things that go POP.',
    'npc.gizma.l2': 'Bring me parts from the field and my Fabricator will print you something wild.',
    'npc.gizma.l3': 'Weapons level up the more you use them. Tune-Ups need Lumite, so spend it wisely.',
    'npc.penny.l1': 'Hiya hiya! Penny Pop\'s the name and shopping\'s the game!',
    'npc.penny.l2': 'I buy your extra parts too. Sell them for shiny Clinks!',
    'npc.penny.l3': 'Rare goodies restock each day, but there\'s no rush. Drop by whenever you like!',
    'npc.bloop.l1': 'Mmm... welcome to the Fizz Café... *yawn*... sit anywhere...',
    'npc.bloop.l2': 'There\'s a free treat for you on each day you play... no hurry, it always waits for you...',
    'npc.bloop.l3': 'A booster before a mission? Very... refreshing...',
    'npc.lumi.l1': 'Welcome to the Gallery. Speak softly... the stickers are sleeping.',
    'npc.lumi.l2': 'Every robot you pop teaches us something. The Codex remembers them all.',
    'npc.lumi.l3': 'Collect stickers and the Gallery walls will glow.',
    'npc.ping.l1': 'TWEEEET! Coach Ping here! Ready to warm up, Ranger?',
    'npc.ping.l2': 'Targets, time trials, pop-up challenges. Let\'s earn some medals!',
    'npc.ping.l3': 'Slide, jump, dash! Good movement wins every match!',
    'npc.ace.l1': 'Ace Wobble, fastest pilot in Marmalune! You wanna race?',
    'npc.ace.l2': 'Star-skiffs, asteroid rings, boost pads... it\'s the best feeling in the galaxy!',
    'npc.ace.l3': 'Drift through the turns to fill your boost. Then WHOOOSH!',
    'npc.ticktock.l1': 'SQUAWK! I\'m Tick! ...And I\'m Tock! SQUAWK SQUAWK!',
    'npc.ticktock.l2': 'Paint more turf than the other team before time runs out!',
    'npc.ticktock.l3': 'Dive into your own goo to refill and zoom around!',
    'npc.gale.l1': 'HO HO! Captain Gale of the Sky Drop airship! Welcome aboard!',
    'npc.gale.l2': 'Leap from my ship, grab loot, and be the last Ranger standing!',
    'npc.gale.l3': 'The storm ring shrinks fast. Keep moving, matey!',
    'npc.beepo.l1': 'Beep boop! This is the Mission Board. Pick an island and let\'s explore!',
    'npc.beepo.l2': 'Fountain Guard is here too. We protect the fountain from robot raids!',
    'res.win': 'Victory!', 'res.clear': 'Mission Clear!', 'res.lose': 'Great run!', 'res.place': '#{n}!', 'res.stats': 'Results', 'res.rewards': 'Rewards',
    'res.continue': 'Continue', 'res.retry': 'Retry', 'res.next': 'Next', 'res.rankup': 'Rank up! PR {n}', 'res.levelup': '{name} reached Lv {n}!', 'res.newStar': 'Guild ★{n}!',
    'res.xp': '+{n} XP', 'res.wxp': '{name} +{n} XP', 'res.chest': 'Gold chest', 'res.chestBoss': 'Boss chest', 'res.noRewards': 'Keep going, Ranger!', 'res.medal': 'Medal',
    'res.tip1': 'Tip: Slide, then jump to keep your speed!', 'res.tip2': 'Tip: Aim for glowing batteries for extra damage!', 'res.tip3': 'Tip: Upgrade your weapons at the Workshop!',
    'res.tip4': 'Tip: Puff Dash makes you dodge attacks!', 'res.tip5': 'Tip: Your shield refills if you avoid hits for a moment.', 'res.tip6': 'Tip: Breezy difficulty makes runs extra relaxed.',
    'res.tip7': 'Tip: Beepo Scan shows hidden bots and crates!', 'res.tip8': 'Tip: Craft a Bubble Shield for extra protection!',
    'res.part': '{name} ×{n}', 'res.sticker': 'New sticker!', 'res.stickerName': 'Sticker: {name}', 'res.item': '{name}',
    'res.s.time': 'Time', 'res.s.pops': 'Bots popped', 'res.s.crates': 'Crates', 'res.s.paint': 'Turf painted', 'res.s.place': 'Place',
    'res.s.score': 'Score', 'res.s.waves': 'Waves', 'res.s.accuracy': 'Accuracy', 'res.s.damage': 'Damage', 'res.s.bonks': 'Bonks taken',
  });
  G.i18n.add('ja', {
    'menu.close': 'とじる', 'menu.back': 'もどる', 'menu.locked': 'ロック中', 'menu.owned': 'もってる', 'menu.equipped': 'そうび中', 'menu.equip': 'そうび', 'menu.unequip': 'はずす',
    'menu.empty': 'まだ なにもないよ！', 'menu.soon': 'もうすぐ！', 'menu.needStar': 'ギルド★{n}', 'menu.needPr': 'ランク{n}', 'menu.max': 'MAX', 'menu.free': 'むりょう',
    'menu.clinks': 'クリンク', 'menu.lumite': 'ルマイト', 'menu.stamps': 'スタンプ', 'menu.xp': 'XP', 'menu.have': '{n}こ もってる', 'menu.lv': 'Lv {n}',
    'menu.needMore': '{name}が あと{n}こ ひつよう', 'menu.needClinks': 'クリンクが あと{n} ひつよう', 'menu.notEnough': 'まだ たりないよ！', 'menu.done': 'できた！',
    'menu.places': 'しせつ', 'menu.play': 'すぐあそぶ', 'menu.map': 'フィズポートマップ', 'menu.go': 'GO！', 'menu.travel': 'ワープ', 'menu.controls': 'そうさ', 'menu.settings': 'せってい', 'menu.toTitle': 'タイトルへ',
    'menu.unavailable': 'そのモードは まだ じゅんび中だよ。また あとでね！',
    'menu.tap': 'タップで つぎへ', 'menu.skip': 'スキップ',
    'menu.mode.expedition': 'ミッション', 'menu.mode.expeditionD': '島をたんけんして ギズモブのロボをポン！',
    'menu.mode.boss': 'ボスハント', 'menu.mode.bossD': 'ボスと再戦して レアパーツをゲット。',
    'menu.mode.turf': 'グーターフ', 'menu.mode.turfD': 'ボットと 4たい4の ぬりあいバトル。',
    'menu.mode.race': 'スタースキフ・ラリー', 'menu.mode.raceD': 'うちゅうの リングを かけぬけるレース。',
    'menu.mode.royale': 'スカイドロップ・ロワイヤル', 'menu.mode.royaleD': 'キミ VS ボット15体。さいごまで のこったら かち！',
    'menu.mode.defense': 'ファウンテンガード', 'menu.mode.defenseD': 'ロボのしゅうげきから ふんすいを まもれ。',
    'menu.mode.training': 'トレーニング場', 'menu.mode.trainingD': 'まと・タイムトライアル・れんしゅう。',
    'menu.place.guild': 'クエストと しょうしん', 'menu.place.workshop': 'クラフト・強化・そうび', 'menu.place.shop': 'かう・うる', 'menu.place.cafe': 'まいにちの おやつ',
    'menu.place.gallery': 'ステッカー・図鑑・きろく', 'menu.place.defense': 'ファウンテンガード', 'menu.place.training': 'れんしゅうと メダル', 'menu.place.hangar': 'スタースキフ・レース',
    'menu.place.arena': 'グーターフの ぬりあいバトル', 'menu.place.royale': 'スカイドロップ・ロワイヤル', 'menu.place.fountain': 'ミッションをえらぶ',
    'npc.quill': 'クイル', 'npc.gizma': 'ギズマ', 'npc.penny': 'ペニー・ポップ', 'npc.bloop': 'バリスタ・ブループ', 'npc.lumi': 'キュレーター・ルミ', 'npc.ping': 'ピンコーチ', 'npc.ace': 'エース・ウォブル',
    'npc.ticktock': 'チック＆タック', 'npc.gale': 'ゲイル船長', 'npc.beepo': 'ビーポ',
    'npc.quill.l1': 'リーフレンジャー・ギルドへ ようこそ！ ボクはクイル。大事なことは ぜんぶ このクリップボードに書いてあるよ。',
    'npc.quill.l2': 'ボードから クエストを えらんでね。おわったら スタンプをおして ほうびを わたすよ。',
    'npc.quill.l3': 'キークエストを クリアすると しょうしんクエストが ひらくよ。★がふえると 新しい島へ 行けるんだ！',
    'npc.quill.l4': 'メガ市長モックスが サンゴしょうを ちゅうしゃじょうに しようとしてるんだ。ゆるさないぞ！',
    'npc.gizma.l1': 'ふん。新入りレンジャーか。アタシはギズマ。ポンとはじける ものを つくってる。',
    'npc.gizma.l2': 'フィールドで パーツを あつめておいで。ファブリケーターで すごいものを つくってやるよ。',
    'npc.gizma.l3': 'ぶきは つかうほど レベルアップする。チューンアップには ルマイトが いるから だいじにね。',
    'npc.penny.l1': 'ハイハーイ！ ペニー・ポップだよ！ おかいもの だいすき！',
    'npc.penny.l2': 'あまったパーツも かいとるよ。ピカピカの クリンクに かえちゃおう！',
    'npc.penny.l3': 'レアなものは まいにち すこしずつ 入荷するよ。いそがなくて いいから、すきなときに 来てね！',
    'npc.bloop.l1': 'んん…… フィズカフェへ ようこそ…… ふわぁ…… すきな せきに どうぞ……',
    'npc.bloop.l2': 'あそんだ日には むりょうの おやつが あるよ…… いそがなくても ずっと まってるよ……',
    'npc.bloop.l3': 'ミッションの まえに ブースター…… シュワっと げんきに なるよ……',
    'npc.lumi.l1': 'ギャラリーへ ようこそ。しずかにね…… ステッカーたちが ねむっているの。',
    'npc.lumi.l2': 'ポンしたロボは みんな 図鑑が おぼえているわ。',
    'npc.lumi.l3': 'ステッカーを あつめると ギャラリーの かべが かがやくのよ。',
    'npc.ping.l1': 'ピピーッ！ ピンコーチだ！ ウォーミングアップの じゅんびは いいか？',
    'npc.ping.l2': 'まと、タイムトライアル、ポップアップ・チャレンジ。メダルを ねらえ！',
    'npc.ping.l3': 'スライド、ジャンプ、ダッシュ！ うごきが しょうぶを きめるぞ！',
    'npc.ace.l1': 'オレは エース・ウォブル、マーマルーンいちの パイロットさ！ レースするかい？',
    'npc.ace.l2': 'スタースキフ、アステロイドリング、ブーストパッド…… さいこうの きぶんだぜ！',
    'npc.ace.l3': 'カーブで ドリフトして ブーストを ためろ。そして ビューン！',
    'npc.ticktock.l1': 'ガーガー！ ボクはチック！ ……ボクはタック！ ガーガー！',
    'npc.ticktock.l2': 'じかんまでに あいてより たくさん ぬったら かち！',
    'npc.ticktock.l3': 'じぶんの グーに もぐると ほじゅうできて はやく うごけるよ！',
    'npc.gale.l1': 'ガッハッハ！ スカイドロップ号の ゲイル船長だ！ ようこそ！',
    'npc.gale.l2': 'ふねから とびおりて アイテムを ひろい、さいごの1人に なれ！',
    'npc.gale.l3': 'あらしのリングは どんどん ちぢむぞ。うごきつづけろ！',
    'npc.beepo.l1': 'ピポパ！ ここが ミッションボードだよ。島をえらんで たんけんしよう！',
    'npc.beepo.l2': 'ファウンテンガードも ここだよ。ロボのしゅうげきから ふんすいを まもるんだ！',
    'res.win': 'しょうり！', 'res.clear': 'ミッションクリア！', 'res.lose': 'ナイスファイト！', 'res.place': '{n}い！', 'res.stats': 'けっか', 'res.rewards': 'ほうび',
    'res.continue': 'つづける', 'res.retry': 'もう一度', 'res.next': 'つぎへ', 'res.rankup': 'ランクアップ！ PR {n}', 'res.levelup': '{name}が Lv {n}に！', 'res.newStar': 'ギルド★{n}！',
    'res.xp': '+{n} XP', 'res.wxp': '{name} +{n} XP', 'res.chest': 'ゴールドチェスト', 'res.chestBoss': 'ボスチェスト', 'res.noRewards': 'このちょうしで がんばろう！', 'res.medal': 'メダル',
    'res.tip1': 'ヒント：スライドしてから ジャンプすると スピードが のこるよ！', 'res.tip2': 'ヒント：ひかる バッテリーを ねらうと 大ダメージ！', 'res.tip3': 'ヒント：ワークショップで ぶきを 強化しよう！',
    'res.tip4': 'ヒント：パフダッシュで こうげきを よけられるよ！', 'res.tip5': 'ヒント：しばらく あたらないと シールドが もどるよ。', 'res.tip6': 'ヒント：むずかしさ「そよかぜ」なら のんびり あそべるよ。',
    'res.tip7': 'ヒント：ビーポスキャンで かくれたロボや 箱が 見えるよ！', 'res.tip8': 'ヒント：バブルシールドを つくると まもりが アップ！',
    'res.s.time': 'タイム', 'res.s.pops': 'ポンしたロボ', 'res.s.crates': 'はこ', 'res.s.paint': 'ぬったエリア', 'res.s.place': 'じゅんい',
    'res.s.score': 'スコア', 'res.s.waves': 'ウェーブ', 'res.s.accuracy': 'めいちゅう', 'res.s.damage': 'ダメージ', 'res.s.bonks': 'ボンクされた',
    'res.part': '{name} ×{n}', 'res.sticker': 'ステッカー ゲット！', 'res.stickerName': 'ステッカー：{name}', 'res.item': '{name}',
  });

  const M = G.Menus = G.Menus || {};
  M.el = el;

  // ================================================================== CSS (scoped .mm-*)
  const CSS = `
.screen.mm-dim { background: rgba(20, 16, 60, 0.52); }
.mm-wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; min-height: 0; }
/* .mm-pop panels: the entrance now comes from the shared screen transition (style.css .ui-enter) */
@keyframes mmPop { from { transform: scale(0.92); } to { transform: none; } }
@keyframes mmRise { 0% { opacity: 0; translate: 0 14px; } 60% { opacity: 1; translate: 0 -2px; } 100% { opacity: 1; translate: 0 0; } }
/* building panel arrival: portrait bounces in, speech bubble grows from its tail, badges pop */
:where(.screen.ui-enter) .mm-portrait { animation: mmPortraitIn 0.5s 0.08s var(--ease-out) backwards; }
@keyframes mmPortraitIn { 0% { scale: 0.4; rotate: -20deg; opacity: 0; } 60% { scale: 1.12; rotate: 6deg; opacity: 1; } 100% { scale: 1; rotate: 0deg; opacity: 1; } }
:where(.screen.ui-enter) .mm-say { animation: mmSayIn 0.38s 0.16s var(--ease-out) backwards; transform-origin: 14px 100%; }
@keyframes mmSayIn { 0% { scale: 0.6; opacity: 0; } 60% { scale: 1.04; opacity: 1; } 100% { scale: 1; opacity: 1; } }
:where(.screen.ui-enter) .mm-tab .mm-dot { animation: mmDotIn 0.38s 0.22s var(--ease-bouncy) backwards; }
@keyframes mmDotIn { from { scale: 0; } }
:where(.screen.ui-enter) .mm-wallet > * { animation: uiItemIn 0.26s 0.1s var(--ease-out) backwards; }
.mm-ico { display: inline-flex; width: 22px; height: 22px; flex: none; }
.mm-ico svg { width: 100%; height: 100%; display: block; }
.mm-chip { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 3px solid var(--ink); border-radius: 99px; padding: 3px 11px 3px 5px; font: 800 15px/1.2 var(--f-body); box-shadow: 0 3px 0 var(--shadow); white-space: nowrap; font-variant-numeric: tabular-nums; }
.mm-chip .mm-ico { width: 22px; height: 22px; }
.mm-chip.dark { background: rgba(30,26,77,0.78); color: #fff; border-color: var(--ink); }
.mm-wallet { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; justify-content: flex-end; }
/* --- building panel: NPC rail + main --- */
.mm-bp { --bc: #33b5ff; --bc2: #1f8ad8; position: relative; display: grid; grid-template-columns: minmax(170px, 23%) minmax(0, 1fr); width: min(1000px, 100%); height: min(660px, 100%);
  background: #fff6e0; border: 4px solid var(--ink); border-radius: 26px; box-shadow: 0 7px 0 var(--ink), 0 18px 40px rgba(20,16,60,0.3); overflow: hidden; min-height: 0; }
.mm-rail { background: linear-gradient(170deg, var(--bc), var(--bc2)); border-right: 4px solid var(--ink); padding: 12px 10px; display: flex; flex-direction: column; gap: 9px; min-height: 0; position: relative; overflow: hidden; }
.mm-rail::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 20% 0%, rgba(255,255,255,0.35), transparent 55%), repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 14px, transparent 14px 28px); pointer-events: none; }
.mm-who { display: flex; align-items: center; gap: 9px; position: relative; }
.mm-portrait { width: 64px; height: 64px; border-radius: 50%; border: 3px solid var(--ink); background: radial-gradient(circle at 40% 35%, #fff, #dff1ff); overflow: hidden; flex: none; box-shadow: 0 3px 0 var(--ink); display: grid; place-items: center; }
.mm-portrait svg { width: 100%; height: 100%; display: block; }
.mm-who-txt { min-width: 0; color: #fff; text-shadow: 0 2px 0 var(--ink); }
.mm-who-name { font: var(--fw-d) 17px/1.1 var(--f-display); -webkit-text-stroke: max(1px, calc(1px * var(--ds, 1))) var(--ink); paint-order: stroke fill; overflow-wrap: anywhere; }
.mm-who-name.long { font-size: 12.5px; letter-spacing: -0.01em; }
.mm-rail-art { margin-top: auto; align-self: center; width: min(150px, 86%); aspect-ratio: 1; min-height: 0; border-radius: 50%; border: 4px solid var(--ink); background: radial-gradient(circle at 40% 35%, #fff, rgba(255,255,255,0.55)); box-shadow: 0 5px 0 var(--ink); overflow: hidden; position: relative; animation: mmBob 2.6s ease-in-out infinite; }
.mm-rail-art svg { width: 100%; height: 100%; display: block; }
.mm-who-role { display: inline-block; vertical-align: top; margin-top: 3px; font: 800 11.5px/1.25 var(--f-body); background: rgba(30,26,77,0.62); border-radius: 9px; padding: 1px 7px 2px; text-shadow: none; max-width: 100%; white-space: normal; overflow-wrap: break-word; hyphens: auto; box-sizing: border-box; }
.mm-who-name { -webkit-text-stroke-width: max(1px, calc(1.5px * var(--ds, 1))); text-shadow: 0 2px 0 var(--ink); }
.mm-say { position: relative; background: #fff; border: 3px solid var(--ink); border-radius: 14px 14px 14px 4px; padding: 7px 10px; font: 700 13px/1.4 var(--f-body); color: var(--ink); box-shadow: 0 3px 0 rgba(30,26,77,0.35); }
.mm-tabs { display: flex; flex-direction: column; gap: 7px; position: relative; margin-top: 2px; overflow-y: auto; min-height: 0; padding: 2px 3px 6px; }
.mm-tab { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 6px 10px; border-radius: 14px; border: 3px solid var(--ink); background: rgba(255,255,255,0.88); font: 800 14px/1.15 var(--f-body); color: var(--ink); box-shadow: 0 3px 0 var(--ink); cursor: pointer; text-align: left; position: relative; flex: none; }
.mm-tab:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); }
.mm-tab.on { background: var(--sun); transform: translateX(4px); }
.mm-tab .mm-ico { width: 24px; height: 24px; }
.mm-tab.has-dot { padding-right: 24px; }
/* count badges: white 12 px on raspberry (4.7:1) */
.mm-tab .mm-dot { position: absolute; right: 6px; top: -7px; min-width: 22px; height: 22px; border-radius: 99px; background: var(--badge); color: #fff; border: 2px solid var(--ink); font: 800 12px/18px var(--f-body); text-align: center; padding: 0 5px; box-sizing: border-box; font-variant-numeric: tabular-nums; }
.mm-main { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.mm-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px 8px 16px; border-bottom: 3px dashed rgba(30,26,77,0.14); }
.mm-head h2 { margin: 0; flex: 1; min-width: 0; font: var(--fw-d) clamp(19px, 3vw, 27px)/1.1 var(--f-display); letter-spacing: 0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mm-head h2.two { white-space: normal; font-size: clamp(16px, 2.4vw, 22px); line-height: 1.05; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: break-word; }
.mm-body { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 12px 14px 16px; -webkit-overflow-scrolling: touch; touch-action: pan-y; }
.mm-body::-webkit-scrollbar { width: 8px; } .mm-body::-webkit-scrollbar-thumb { background: rgba(30,26,77,0.35); border-radius: 8px; }
.mm-sub { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.mm-subtab { padding: 6px 12px; border-radius: 99px; border: 3px solid var(--ink); background: #fff; font: 800 13px var(--f-body); cursor: pointer; box-shadow: 0 2px 0 var(--ink); }
.mm-subtab.on { background: var(--sun); color: var(--ink); text-shadow: none; }
.mm-sec { font: var(--fw-d) 15px/1.2 var(--f-display); color: var(--ink-soft); margin: 4px 2px 8px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.02em; }
.mm-sec::after { content: ''; flex: 1; height: 3px; border-radius: 3px; background: rgba(30,26,77,0.1); }
.mm-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); }
.mm-grid.tight { grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr)); }
.mm-card { background: #fff; border: 3px solid var(--ink); border-radius: 16px; padding: 10px; display: flex; gap: 10px; box-shadow: 0 4px 0 var(--rc, rgba(30,26,77,0.3)); position: relative; min-width: 0; }
.mm-card.col { flex-direction: column; }
.mm-card.dim { background: #f1eef6; }
.mm-card.sel { outline: 4px solid var(--sun); outline-offset: 1px; }
.mm-card.glow { box-shadow: 0 4px 0 var(--rc, rgba(30,26,77,0.3)), 0 0 0 4px rgba(255,210,63,0.6); }
.mm-card.clickable { cursor: pointer; } .mm-card.clickable:active { transform: translateY(2px); }
.mm-tile { width: 58px; height: 58px; border-radius: 14px; border: 3px solid var(--ink); background: radial-gradient(circle at 35% 30%, #fff, var(--tc, #dff1ff)); display: grid; place-items: center; flex: none; position: relative; }
.mm-tile svg { width: 44px; height: 44px; }
.mm-tile.sm { width: 42px; height: 42px; border-radius: 11px; } .mm-tile.sm svg { width: 30px; height: 30px; }
.mm-tile .mm-pips { position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); display: flex; gap: 2px; }
.mm-pips i { width: 7px; height: 7px; border-radius: 50%; background: var(--rc, #c9d1dc); border: 1.5px solid var(--ink); }
.mm-ct { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.mm-ct h3 { margin: 0; font: 800 15px/1.2 var(--f-body); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mm-ct p { margin: 0; font: 600 12.5px/1.4 var(--f-body); color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.mm-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mm-row.end { justify-content: flex-end; } .mm-row.between { justify-content: space-between; } .mm-row.center { justify-content: center; }
.mm-cost { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px 2px 3px; border-radius: 99px; border: 2px solid var(--ink); background: #f3faff; font: 800 12px/1.3 var(--f-body); font-variant-numeric: tabular-nums; }
.mm-cost .mm-ico { width: 18px; height: 18px; }
.mm-cost.ok { background: #d8f8e6; } .mm-cost.no { background: #ffe0e4; color: #b3263a; }
.mm-tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px; border-radius: 99px; border: 2px solid var(--ink); font: 800 12px/1.35 var(--f-body); background: var(--panel-2); text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
/* (every tag colour keeps its text at 4.5:1 or more: ink on the light ones, white on the deep raspberry / grape) */
.mm-tag.gold { background: var(--sun); } .mm-tag.mint { background: var(--mint); } .mm-tag.coral { background: var(--badge); color: #fff; } .mm-tag.grape { background: var(--grape-ink); color: #fff; } .mm-tag.sky { background: var(--sky); color: var(--ink); }
.mm-bar { height: 12px; border-radius: 99px; background: rgba(30,26,77,0.12); border: 2px solid var(--ink); overflow: hidden; position: relative; }
.mm-bar > i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(180deg, #7dffc6, #22c48b); border-radius: 99px; transition: width 0.6s cubic-bezier(.2,.8,.2,1); }
.mm-bar.xp > i { background: linear-gradient(180deg, #c8a8ff, #8f6bff); } .mm-bar.gold > i { background: linear-gradient(180deg, #ffe58a, #ffb627); }
.mm-bar > b { position: absolute; inset: 0; display: grid; place-items: center; font: 800 11px/1 var(--f-body); color: var(--ink); }
.mm-empty { text-align: center; padding: 26px 10px; color: var(--ink-soft); font: 700 15px/1.5 var(--f-body); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.mm-empty .mm-ico { width: 54px; height: 54px; opacity: 0.85; }
.mm-note { font: 700 12px/1.4 var(--f-body); color: var(--ink-soft); }
.mm-note.bad { color: #c22e45; } .mm-note.good { color: #138a55; }
.mm-btn-sm { min-height: 38px !important; padding: 5px 12px !important; font-size: 14px !important; border-radius: 12px !important; }
.mm-big { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 20px; border: 4px solid var(--ink); background: linear-gradient(160deg, #fff, #eaf7ff); box-shadow: 0 5px 0 var(--ink); cursor: pointer; min-height: 88px; text-align: left; font: inherit; color: inherit; width: 100%; }
.mm-big:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--ink); }
.mm-big .mm-tile { width: 64px; height: 64px; }
.mm-big h3 { margin: 0 0 3px; font: var(--fw-d) 19px/1.15 var(--f-display); }
.mm-big p { margin: 0; font: 700 13px/1.4 var(--f-body); color: var(--ink-soft); }
.mm-big.locked { filter: grayscale(0.7); opacity: 0.7; }
.mm-pulse { animation: mmPulse 1.2s ease-in-out infinite; }
/* (independent scale: composes with the press transform of .btn) */
@keyframes mmPulse { 0%,100% { scale: 1; } 50% { scale: 1.05; } }
.mm-flash { animation: mmFlash 0.6s ease-out; }
@keyframes mmFlash { 0% { background: #fff6a8; } 100% { background: #fff; } }
/* --- npc talk --- */
.mm-talk { position: relative; width: min(760px, 100%); display: flex; align-items: flex-end; gap: 0; margin-top: auto; margin-bottom: 4px; cursor: pointer; }
.mm-talk-por { width: 128px; height: 128px; border-radius: 50%; border: 4px solid var(--ink); background: radial-gradient(circle at 40% 30%, #fff, var(--bc, #bfe8ff)); box-shadow: 0 6px 0 var(--ink); overflow: hidden; flex: none; z-index: 1; animation: mmBob 2.4s ease-in-out infinite; display: grid; place-items: center; }
.mm-talk-por svg { width: 100%; height: 100%; display: block; }
@keyframes mmBob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
.mm-talk-box { flex: 1; min-width: 0; margin-left: -22px; background: #fff; border: 4px solid var(--ink); border-radius: 22px; padding: 12px 18px 12px 34px; box-shadow: 0 6px 0 var(--ink); position: relative; min-height: 112px; display: flex; flex-direction: column; gap: 6px; }
.mm-talk-name { position: absolute; top: -17px; left: 30px; background: var(--bc, var(--sky)); color: #fff; border: 3px solid var(--ink); border-radius: 99px; padding: 2px 14px; font: var(--fw-d) 15px/1.3 var(--f-display); text-shadow: 0 2px 0 var(--ink); }
.mm-talk-text { font: 700 16px/1.5 var(--f-body); min-height: 48px; padding-top: 6px; }
:lang(ja) .mm-talk-text, :lang(ko) .mm-talk-text, :lang(zh-Hans) .mm-talk-text, :lang(zh-Hant) .mm-talk-text { line-height: 1.6; }
.mm-talk-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mm-talk-hint { font: 800 12px var(--f-body); color: var(--ink-soft); animation: mmBlink 1s ease-in-out infinite alternate; }
.mm-talk-hint .pad-g { margin: 0 0.25em; font-size: 0.95em; }
/* (the line is the pad's default only so A advances it: no ring on it — style.css's ring is !important, so is this) */
#ui .mm-talk-text.gp-focus { outline: none !important; }
@keyframes mmBlink { to { opacity: 0.35; } }
.mm-talk-dots { display: flex; gap: 4px; } .mm-talk-dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(30,26,77,0.2); transition: background-color 0.2s, scale 0.3s var(--ease-bouncy); } .mm-talk-dots i.on { background: var(--ink); }
.mm-talk-dots i.cur { scale: 1.35; }
/* dialogue slides up from the bottom edge on arrival */
:where(.screen.ui-enter) .mm-talk { animation: mmTalkIn 0.34s var(--ease-out) backwards; transform-origin: 30% 100%; }
@keyframes mmTalkIn { 0% { translate: 0 18px; scale: 0.92; opacity: 0; } 35% { opacity: 1; } 60% { translate: 0 -3px; scale: 1.015; } 100% { translate: 0 0; scale: 1; opacity: 1; } }
/* --- hub HUD widgets + Beepo bubble --- */
.mm-rankchip { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.9); border: 3px solid var(--ink); border-radius: 14px; padding: 3px 8px 3px 4px; box-shadow: 0 3px 0 var(--shadow); width: max-content; max-width: 100%; }
.mm-rank-star { background: var(--sun); border: 2px solid var(--ink); border-radius: 10px; padding: 1px 6px; font: var(--fw-d) 14px/1.2 var(--f-display); }
.mm-rank-mid { display: flex; flex-direction: column; gap: 2px; min-width: 70px; }
.mm-rank-pr { font: 800 12px/1.1 var(--f-body); }
.mm-rank-bar { height: 7px; border-radius: 9px; background: rgba(30,26,77,0.15); border: 1.5px solid var(--ink); overflow: hidden; }
.mm-rank-bar > i { display: block; height: 100%; background: var(--grape); width: 0; transition: width 0.4s; }
.mm-sugchip { pointer-events: auto; display: flex; align-items: center; gap: 6px; background: rgba(30,26,77,0.78); color: #fff; border: 3px solid var(--ink); border-radius: 14px; padding: 4px 10px 4px 6px; font: 800 12.5px/1.25 var(--f-body); box-shadow: 0 3px 0 var(--shadow); max-width: min(300px, 34vw); text-align: left; cursor: pointer; }
.mm-sugchip .mm-sug-ico { width: 20px; height: 20px; flex: none; display: inline-flex; animation: mmPulse 1.4s ease-in-out infinite; }
.mm-sug-text { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.mm-quickbtn { pointer-events: auto; display: flex; align-items: center; gap: 5px; background: var(--sun); border: 3px solid var(--ink); border-radius: 99px; padding: 4px 12px 4px 6px; box-shadow: 0 4px 0 var(--ink); font: 800 14px var(--f-body); cursor: pointer; min-height: 44px; }
.mm-quickbtn span { width: 32px; height: 32px; display: inline-flex; }
.mm-quickbtn:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.mm-bubble { position: absolute; left: 0; top: 0; max-width: min(320px, 70vw); display: flex; gap: 8px; align-items: center; background: #fff; border: 3px solid var(--ink); border-radius: 18px 18px 18px 6px; padding: 7px 12px 7px 7px; box-shadow: 0 4px 0 var(--shadow); font: 800 14px/1.35 var(--f-body); color: var(--ink); will-change: transform; pointer-events: none; }
.mm-bubble.pop { animation: mmBubble 0.3s cubic-bezier(.34,1.56,.64,1); }
@keyframes mmBubble { from { opacity: 0; scale: 0.7; } to { opacity: 1; scale: 1; } }
.mm-bubble-face { width: 34px; height: 34px; flex: none; display: inline-flex; }
/* --- results --- */
.mm-res { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: calc(10px + env(safe-area-inset-top,0px)) 16px calc(10px + env(safe-area-inset-bottom,0px)); overflow: hidden; cursor: default; }
.mm-res.win { background: radial-gradient(ellipse at 50% 20%, rgba(255,236,150,0.95), rgba(255,170,90,0.82) 45%, rgba(255,107,139,0.78)); }
.mm-res.lose { background: radial-gradient(ellipse at 50% 20%, rgba(220,236,255,0.95), rgba(150,170,255,0.85) 50%, rgba(143,107,255,0.82)); }
.mm-res::before { content: ''; position: absolute; inset: -50%; background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.13) 0deg 10deg, transparent 10deg 20deg); animation: mmSpin 40s linear infinite; pointer-events: none; }
@keyframes mmSpin { to { transform: rotate(360deg); } }
.mm-res > * { position: relative; flex: none; }
body.mm-res-open #hud { visibility: hidden; }
/* toasts during results / a reward overlay: the top lane, never over the Retry / Next / Continue buttons or the card
   ("#ui.ui-menu" so it beats the menus' bottom lane in style.css, which otherwise won on specificity) */
body.mm-res-open #ui.ui-menu #toasts, body.mm-turn-open #ui.ui-menu #toasts { top: calc(6px + env(safe-area-inset-top, 0px)); bottom: auto; flex-direction: column; }
body.mm-res-open #ui.ui-menu #toasts .toast.out, body.mm-turn-open #ui.ui-menu #toasts .toast.out { animation-name: toastLeave; }
.mm-res-top { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.mm-res-hd { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
.mm-res-title { font: var(--fw-d) clamp(32px, 7.5vmin, 64px)/1 var(--f-display); color: #fff; -webkit-text-stroke: max(1px, calc(5px * var(--ds, 1))) var(--ink); paint-order: stroke fill; text-shadow: 0 6px 0 var(--ink); animation: bannerIn 0.5s cubic-bezier(.2,1.7,.4,1) backwards; text-align: center; letter-spacing: 0.02em; }
/* subtitle / tip: white on a soft ink pill, readable on the bright win and loss backdrops alike */
.mm-res-sub { font: 800 clamp(13px, 2.4vmin, 17px)/1.3 var(--f-body); color: #fff; text-shadow: 0 1px 0 rgba(30,26,77,0.6); margin-top: 2px; text-align: center; background: rgba(30,26,77,0.72); border-radius: 12px; padding: 1px 12px 2px; max-width: 100%; box-sizing: border-box; }
/* the ranger you play as (Ranger Locker look) beside the title */
.mm-res-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mm-res-ranger { width: clamp(56px, 12vmin, 92px); height: clamp(56px, 12vmin, 92px); flex: none; border-radius: 50%; border: 4px solid var(--ink); background: #fff; box-shadow: 0 5px 0 var(--ink); overflow: hidden; transform-origin: 50% 100%; }
.mm-res-ranger svg { width: 100%; height: 100%; display: block; }
.mm-res-ranger.cheer { animation: mmCheer 0.9s cubic-bezier(.3,1.6,.5,1) backwards; }
.mm-res-ranger.wobble { animation: mmWobble 0.8s ease-out backwards; }
@keyframes mmCheer { 0% { transform: scale(0.4); } 30% { transform: translateY(-14px) scale(1.08) rotate(-6deg); } 55% { transform: translateY(0) scale(0.96, 1.04); } 75% { transform: translateY(-5px) rotate(4deg); } 100% { transform: none; } }
@keyframes mmWobble { 0% { transform: scale(0.4); } 40% { transform: scale(1.04) rotate(-5deg); } 70% { transform: rotate(3deg); } 100% { transform: none; } }
.reduced-motion .mm-res-ranger { animation: none !important; }   /* reduced motion: simply there */
/* short game frame (also when a phone held upright shows the rotated landscape frame) */
html.gh-short .mm-res-id { gap: 10px; } html.gh-short .mm-res-ranger { width: 50px; height: 50px; border-width: 3px; box-shadow: 0 3px 0 var(--ink); }
.mm-stars { display: flex; gap: 6px; align-items: flex-end; justify-content: center; }
.mm-star { width: clamp(40px, 10vmin, 70px); height: clamp(40px, 10vmin, 70px); transform: scale(0) rotate(-40deg); }
.mm-star.mid { width: clamp(50px, 12.5vmin, 86px); height: clamp(50px, 12.5vmin, 86px); }
.mm-star.on { animation: mmStar 0.45s cubic-bezier(.34,1.8,.5,1) forwards; }
.mm-star.off { opacity: 0.75; animation: mmStarOff 0.3s ease-out forwards; }
@keyframes mmStar { 0% { transform: scale(2.2) rotate(-60deg); } 100% { transform: scale(1) rotate(0deg); } }
@keyframes mmStarOff { to { transform: scale(1) rotate(0deg); } }
.mm-res > .mm-res-panel { flex: 0 1 auto; }
.mm-res-panel { width: min(860px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 12px; background: #fff6e0; border: 4px solid var(--ink); border-radius: 24px; box-shadow: 0 6px 0 var(--ink); padding: 12px 14px; min-height: 0; max-height: 52vh; overflow: hidden; animation: mmPop 0.35s 0.2s cubic-bezier(.34,1.56,.64,1) backwards; }
.mm-res-col { display: flex; flex-direction: column; gap: 6px; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.mm-res-col::-webkit-scrollbar { width: 6px; } .mm-res-col::-webkit-scrollbar-thumb { background: rgba(30,26,77,0.3); border-radius: 6px; }
.mm-res-h { font: var(--fw-d) 14px/1.2 var(--f-display); color: var(--ink-soft); letter-spacing: 0.03em; }
.mm-statrow { display: flex; justify-content: space-between; gap: 10px; padding: 4px 10px; background: #fff; border: 2px solid rgba(30,26,77,0.18); border-radius: 10px; font: 700 14px/1.3 var(--f-body); animation: mmSlide 0.35s cubic-bezier(.2,.9,.3,1.2) backwards; }
.mm-statrow b { font: 800 15px var(--f-body); font-variant-numeric: tabular-nums; white-space: nowrap; }
@keyframes mmSlide { from { transform: translateX(-16px) scale(0.96); } to { transform: none; } }
.mm-rewards { display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; }
.mm-rchip { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 3px solid var(--ink); border-radius: 13px; padding: 4px 10px 4px 5px; font: 800 14px/1.2 var(--f-body); box-shadow: 0 3px 0 var(--rc, rgba(30,26,77,0.3)); animation: mmChip 0.4s cubic-bezier(.34,1.7,.5,1) backwards; font-variant-numeric: tabular-nums; }
.mm-rchip .mm-ico { width: 24px; height: 24px; }
.mm-rchip.big { font-size: 17px; padding: 6px 13px 6px 7px; } .mm-rchip.big .mm-ico { width: 28px; height: 28px; }
@keyframes mmChip { from { transform: translateY(12px) scale(0.6); } to { transform: none; } }
.mm-callout { display: flex; align-items: center; gap: 8px; background: linear-gradient(90deg, var(--grape-deep), #a35cf0); color: #fff; border: 3px solid var(--ink); border-radius: 14px; padding: 5px 12px; font: var(--fw-d) 15px/1.25 var(--f-display); text-shadow: 0 2px 0 var(--ink); box-shadow: 0 3px 0 var(--ink); animation: mmChip 0.5s cubic-bezier(.34,1.7,.5,1) backwards; }
.mm-callout.gold { background: linear-gradient(90deg, #ffb627, #ffd23f); color: var(--ink); text-shadow: none; }
.mm-calls { display: flex; flex-direction: column; gap: 6px; }
.mm-callout > span { min-width: 0; overflow-wrap: anywhere; }
html.gh-short .mm-calls { flex-direction: row; flex-wrap: wrap; } html.gh-short .mm-calls > .mm-callout { flex: 1 1 auto; }
/* short screens: the rank bar right under the chips (its fill is part of the reveal), the callouts after it */
html.gh-short .mm-res-col > .mm-xpline { order: 1; } html.gh-short .mm-res-col > .mm-calls { order: 2; } html.gh-short .mm-res-col > .mm-qstrip { order: 3; }
.mm-medal { width: 58px; height: 58px; border-radius: 50%; border: 4px solid var(--ink); display: grid; place-items: center; font: var(--fw-d) 28px/1 var(--f-display); box-shadow: 0 4px 0 var(--ink); animation: mmStamp 0.4s 0.9s cubic-bezier(.3,1.8,.5,1) backwards; transform: rotate(-10deg); flex: none; }
@keyframes mmStamp { from { transform: scale(2.6) rotate(-30deg); opacity: 0; } to { transform: scale(1) rotate(-10deg); opacity: 1; } }
.mm-res-tip { font: 800 13px/1.4 var(--f-body); color: #fff; text-shadow: 0 1px 0 rgba(30,26,77,0.6); text-align: center; max-width: 720px; background: rgba(30,26,77,0.7); border-radius: 12px; padding: 3px 12px; box-sizing: border-box; }
.mm-res-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; animation: mmPop 0.3s 0.5s backwards; }
.mm-res.skip *, .mm-res.skip *::before { animation-delay: 0s !important; animation-duration: 0.01s !important; }
.mm-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.mm-confetti i { position: absolute; top: -20px; width: 10px; height: 14px; border-radius: 3px; animation: mmFall linear forwards; }
@keyframes mmFall { 0% { transform: translate3d(0, -20px, 0) rotate(0); opacity: 1; } 100% { transform: translate3d(var(--dx), 110vh, 0) rotate(var(--rot)); opacity: 1; } }
/* bonus chips (rank-up / sticker clinks paid on top of the payout) and short part chips on phones */
.mm-rchip .mm-ico.sm { width: 18px; height: 18px; margin-left: 2px; }
.mm-rchip.bonus b { font-weight: 800; font-variant-numeric: tabular-nums; }
/* (the short "×n" is drawn from data-short, so the chip's text — what screen readers and tests read — stays "Name ×n" once) */
html.gh-short .mm-rewards.many .mm-rchip.part .mm-rt { display: none; }
html.gh-short .mm-rewards.many .mm-rchip.part::after { content: attr(data-short); }
html.gh-short .mm-rewards.many .mm-rchip.part { padding-right: 7px; }
/* short screens: the rank-up bonus chip already says it (and the XP line shows the new rank) */
html.gh-short .mm-res-col.has-bonus .mm-callout.rank { display: none; }
/* results that would scroll (big text, short screen, long reward list: M.fitText) — part chips take the short "×n"
   form, then the rank bar moves up under the header; what still does not fit gets a soft fade and a "more" button at
   the column's foot (phone scrollbars are hidden), which scrolls the column on */
.mm-rewards.short .mm-rchip.part .mm-rt { display: none; }
.mm-rewards.short .mm-rchip.part::after { content: attr(data-short); }
.mm-rewards.short .mm-rchip.part { padding-right: 7px; }
.mm-res .mm-res-col.xp-up > .mm-res-h { order: -2; } .mm-res .mm-res-col.xp-up > .mm-xpline { order: -1; }
/* (the foot is a real strip of its own, sticky at the column's bottom: rows scroll behind its fade instead of passing
   under the button — on a 568x320 phone at XL the button sat on the last row's value, "2:04.31 (−1.27)") */
.mm-more { display: none; position: sticky; bottom: 0; height: 30px; margin-top: -4px; order: 99; grid-column: 1 / -1; align-self: stretch; z-index: 1; pointer-events: none; flex: none; }
.mm-res-col.more > .mm-more { display: block; }
.mm-more::before { content: ''; position: absolute; left: -2px; right: -2px; bottom: 0; height: 44px; background: linear-gradient(rgba(255,246,224,0), #fff6e0 14px); pointer-events: none; }
.mm-more-b { position: absolute; left: 50%; bottom: 1px; width: 40px; height: 26px; margin-left: -20px; padding: 0; border-radius: 99px; border: 3px solid var(--ink); background: var(--sun); color: var(--ink); box-shadow: 0 2px 0 var(--ink); display: grid; place-items: center; cursor: pointer; pointer-events: auto; animation: mmMoreBob 1.5s ease-in-out infinite; }
.mm-more-b svg { width: 16px; height: 16px; display: block; }
@keyframes mmMoreBob { 0%, 100% { translate: 0 0; } 50% { translate: 0 2px; } }
.reduced-motion .mm-more-b, .mm-res.skip .mm-more-b { animation: none !important; }
.mm-res.tight .mm-res-sub, .mm-res.tight .mm-res-tip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.mm-res.tight .mm-new { padding-top: 3px; padding-bottom: 3px; }
.mm-res.tight .mm-new-h { max-width: 22%; }
.mm-res.tight .mm-new-list { flex-wrap: nowrap; }
.mm-res.tight .mm-new-go { flex: 1 1 0; min-width: 0; min-height: 38px; }
.mm-res.tight .mm-new-t small, .mm-res.tight .mm-go-t { display: none; }
.mm-res.tight .mm-go-a { display: block; padding: 0 2px; }
.mm-res.tight .mm-new-t b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* tight: a smaller header row, stars and buttons give the panel its rows back (a 568x320 phone at XL showed one) */
.mm-res.tight .mm-res-ranger { width: 42px; height: 42px; border-width: 3px; box-shadow: 0 3px 0 var(--ink); }
.mm-res.tight .mm-res-id { gap: 8px; } .mm-res.tight .mm-res-top { gap: 12px; }
.mm-res.tight .mm-star { width: 30px; height: 30px; } .mm-res.tight .mm-star.mid { width: 36px; height: 36px; }
.mm-res.tight .mm-medal { width: 36px; height: 36px; font-size: 18px; border-width: 3px; box-shadow: 0 3px 0 var(--ink); }
.mm-res.tight .mm-res-btns .btn.big { min-height: 40px; font-size: 15px; padding: 4px 18px; border-radius: 14px; }
.mm-res.tight .mm-new-h { font-size: 13px; } .mm-res.tight .mm-new-h .mm-ico { width: 22px; height: 22px; }
.mm-res.tight .mm-res-sub { font-size: 12px; } .mm-res.tight .mm-res-tip { font-size: 11.5px; padding: 2px 10px; }
/* a short landscape frame keeps stats and rewards side by side (the narrow-screen rule below stacks them, which left each
   column a sliver on a 568x320 phone); a small phone lists the stats in one column so their labels stay readable */
html.gh-short .mm-res > .mm-res-panel { grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); overflow: hidden; }
html.gh-short.gw-tiny .mm-res .mm-res-col.stats { display: flex; }
/* a 568x320 phone (de / ru at XL): the buttons share one row, so the panel keeps the line a wrapped button took; full-width
   stat rows (personal best, podium names) and the tight tip wrap instead of ending in "…". Each button keeps its own
   width (an equal split squeezed "Ещё раз" onto two lines beside a short "Лобби") and only shrinks when the row is full;
   the buttons keep their full height (the smaller .tight size above only when the panel is short of rows). */
html.gh-short.gw-tiny .mm-res-btns { flex-wrap: nowrap; gap: 6px; }
html.gh-short.gw-tiny .mm-res-btns .btn.big { flex: 0 1 auto; min-width: 0; max-width: 190px; padding-left: 12px; padding-right: 12px; }
html.gh-short .mm-res-col.stats > .mm-statrow.wide > span { white-space: normal; overflow: visible; text-overflow: clip; }
html.gh-short .mm-res.tight .mm-res-tip { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.25; }
/* "New in Fizzport!" card: one strip for every newly opened place, each with a Go there button */
.mm-new { width: min(860px, 100%); display: flex; align-items: center; gap: 10px; background: linear-gradient(100deg, #fff6c8, #ffe28a); border: 4px solid var(--ink); border-radius: 18px; box-shadow: 0 5px 0 var(--ink); padding: 6px 10px; animation: mmChip 0.5s cubic-bezier(.34,1.7,.5,1) backwards; }
.mm-new-h { display: flex; align-items: center; gap: 6px; font: var(--fw-d) 18px/1.1 var(--f-display); color: #5b3fc4; flex: 0 1 auto; max-width: 28%; min-width: 0; overflow-wrap: anywhere; }
.mm-new-h .mm-ico { width: 30px; height: 30px; }
.mm-new-list { display: flex; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; align-items: center; }
.mm-new-go { display: flex; align-items: center; gap: 7px; background: #fff; border: 3px solid var(--ink); border-radius: 14px; padding: 3px 6px 3px 4px; box-shadow: 0 3px 0 var(--ink); cursor: pointer; font: inherit; color: inherit; text-align: left; min-height: 46px; flex: 1 1 170px; min-width: 0; max-width: 270px; }
.mm-new-go:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); }
.mm-new-go.static { cursor: default; }
.mm-new-go .mm-tile { width: 36px; height: 36px; border-radius: 10px; border-width: 2.5px; } .mm-new-go .mm-tile svg { width: 26px; height: 26px; }
.mm-new-t { min-width: 0; flex: 1; }
.mm-new-t b { display: block; font: 800 13.5px/1.15 var(--f-body); overflow-wrap: anywhere; }
.mm-new-t small { display: block; font: 700 11px/1.2 var(--f-body); color: var(--ink-soft); overflow-wrap: anywhere; }
.mm-new-go .mm-go { flex: none; background: var(--mint); border: 2px solid var(--ink); border-radius: 99px; padding: 1px 8px; font: 800 12px/1.45 var(--f-body); white-space: nowrap; }
.mm-new-more { font: 800 12px var(--f-body); white-space: nowrap; }
.mm-go-a { display: none; font: 800 17px/1 var(--f-body); }
.mm-xpline { display: flex; align-items: center; gap: 8px; font: 800 13px var(--f-body); }
.mm-qstrip { display: flex; flex-direction: column; gap: 4px; margin-top: 2px; }
.mm-qline { display: grid; grid-template-columns: 18px minmax(0, 1fr) 70px auto; align-items: center; gap: 6px; font: 800 12px/1.2 var(--f-body); animation: mmSlide 0.35s 1.1s cubic-bezier(.2,.9,.3,1.2) backwards; }
.mm-qline .mm-ico { width: 18px; height: 18px; }
.mm-qline span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mm-qline .mm-bar { height: 9px; } .mm-qline b { font-variant-numeric: tabular-nums; }
.mm-qline.done span { color: #138a55; }
.mm-xpline .mm-bar { flex: 1; }
/* --- quick menu --- */
.mm-qm-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); }
.mm-qm { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 15px; border: 3px solid var(--ink); background: #fff; box-shadow: 0 3px 0 var(--ink); cursor: pointer; text-align: left; font: inherit; color: inherit; min-height: 58px; }
.mm-qm:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); }
.mm-qm .mm-tile { width: 42px; height: 42px; border-radius: 12px; } .mm-qm .mm-tile svg { width: 30px; height: 30px; }
.mm-qm b { display: block; font: 800 14px/1.2 var(--f-body); }
.mm-qm small { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font: 700 11.5px/1.3 var(--f-body); color: var(--ink-soft); }
.mm-qm.locked { background: #ece9f2; } .mm-qm.locked .mm-tile { filter: grayscale(1); opacity: 0.7; }
/* --- title --- */
.mm-title { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(8px, 2.4vh, 18px); padding: calc(12px + env(safe-area-inset-top,0px)) 16px calc(12px + env(safe-area-inset-bottom,0px)); cursor: pointer; background: radial-gradient(ellipse at 50% 45%, rgba(20,16,60,0.0) 30%, rgba(20,16,60,0.28)); }
/* Logo: letters pop in one by one, bob, and a candy shine runs across them every few seconds; the
   whole logo floats (individual translate/rotate) while 30c adds a gentle parallax on transform.
   The soft shadow is a static blob behind it — a drop-shadow filter over bobbing letters would
   re-filter the logo every frame. */
.mm-logo { display: flex; flex-direction: column; align-items: center; gap: 0; position: relative; isolation: isolate; animation: mmLogoFloat 5.2s ease-in-out infinite; }
.mm-logo::before { content: ''; position: absolute; left: -8%; right: -8%; top: 20%; bottom: -16%; background: radial-gradient(ellipse 50% 50% at 50% 55%, rgba(30,26,77,0.34), rgba(30,26,77,0) 72%); z-index: -1; pointer-events: none; }
@keyframes mmLogoFloat { 0%,100% { translate: 0 0; rotate: -1deg; } 50% { translate: 0 -7px; rotate: 1deg; } }
.mm-logo-row { display: flex; gap: 0.02em; font: 400 clamp(36px, min(11vw, 15vh), 96px)/1 'Fredoka', 'Dela Gothic One', 'Arial Rounded MT Bold', var(--f-display); letter-spacing: 0; }
.mm-logo-row.r2 { font-size: clamp(26px, min(7.4vw, 10vh), 64px); margin-top: -0.06em; }
.mm-logo-row span { position: relative; display: inline-block; color: #fff; -webkit-text-stroke: 6px var(--ink); paint-order: stroke fill; text-shadow: 0 6px 0 var(--ink); animation: mmLetterIn 0.6s var(--ease-out) backwards, mmLetter 2.6s ease-in-out infinite; }
.mm-logo-row.r2 span { color: var(--sun); -webkit-text-stroke: 5px var(--ink); }
.mm-logo-row span::after { content: attr(data-ch); position: absolute; left: 0; top: 0; color: transparent; -webkit-text-stroke: 0; text-shadow: none; background: linear-gradient(172deg, #ffffff 16%, #fff3a0 48%, #ff9fd0 94%); -webkit-background-clip: text; background-clip: text; opacity: 0; pointer-events: none;
  animation: mmShine 5.6s ease-in-out infinite; animation-delay: calc(1.5s + var(--i, 0) * 0.055s); }
.mm-logo-row.r2 span::after { background: linear-gradient(172deg, #ffffff 22%, #fffbe8 58%, #ffe680 96%); -webkit-background-clip: text; background-clip: text; }
@keyframes mmLetter { 0%,100% { translate: 0 0; } 50% { translate: 0 -5px; } }
@keyframes mmLetterIn { 0% { opacity: 0; scale: 0.15; rotate: -25deg; } 55% { opacity: 1; scale: 1.2; rotate: 6deg; } 78% { scale: 0.94; rotate: -2deg; } 100% { opacity: 1; scale: 1; rotate: 0deg; } }
@keyframes mmShine { 0%, 100% { opacity: 0; } 4% { opacity: 0.95; } 11% { opacity: 0; } }
/* twinkles around the logo */
.mm-spark { position: absolute; width: 18px; height: 18px; background: #fffbe0; clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%); opacity: 0; pointer-events: none; animation: mmTwinkle 2.6s ease-in-out infinite; }
.mm-spark.b { width: 12px; height: 12px; background: #ffd6ec; } .mm-spark.c { width: 14px; height: 14px; background: #c8f4ff; }
@keyframes mmTwinkle { 0%, 100% { opacity: 0; scale: 0.2; rotate: 0deg; } 18% { opacity: 1; scale: 1.15; rotate: 45deg; } 34% { opacity: 0; scale: 0.4; rotate: 90deg; } }
.mm-tagline { font: 800 clamp(14px, 3vmin, 21px)/1.35 var(--f-body); color: #fff; text-shadow: 0 2px 0 var(--ink), 0 0 10px rgba(30,26,77,0.5); text-align: center; max-width: 640px; animation: mmRise 0.5s 0.55s var(--ease-out) backwards; }
.mm-tap { font: var(--fw-d) clamp(18px, 4.2vmin, 30px)/1 var(--f-display); color: var(--ink); background: var(--sun); border: 4px solid var(--ink); border-radius: 99px; padding: 12px 30px; box-shadow: 0 6px 0 var(--ink); animation: mmTapIn 0.5s 0.75s var(--ease-out) backwards, mmPulse 1.3s 1.25s ease-in-out infinite; letter-spacing: 0.04em; cursor: pointer; position: relative; overflow: hidden; }
@keyframes mmTapIn { 0% { opacity: 0; scale: 0.5; } 60% { opacity: 1; scale: 1.08; } 100% { opacity: 1; scale: 1; } }
button.mm-tap { -webkit-appearance: none; appearance: none; margin: 0; text-align: center; -webkit-tap-highlight-color: transparent; }
button.mm-tap:focus-visible { outline: 4px solid #fff; outline-offset: 3px; }
.mm-tap .pad-g.mm-tap-g { margin: 0 0.12em; vertical-align: -0.16em; font-size: 0.8em; box-shadow: 0 0 0 3px var(--ink); letter-spacing: 0; }
/* a glint sweeps across the TAP button */
.mm-tap::after { content: ''; position: absolute; top: -30%; bottom: -30%; left: 0; width: 38%; background: linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.8) 50%, rgba(255,255,255,0)); transform: translateX(-170%) skewX(-18deg); animation: mmSweep 3s 1.6s ease-in-out infinite; pointer-events: none; }
@keyframes mmSweep { 0% { transform: translateX(-170%) skewX(-18deg); } 40%, 100% { transform: translateX(380%) skewX(-18deg); } }
.mm-title .mm-corner { animation: mmRise 0.45s 0.9s var(--ease-out) backwards; }
/* reduced motion: the intro has no travel, so nothing should wait out a stagger delay hidden either */
.reduced-motion .mm-title :is(.mm-logo-row span, .mm-tagline, .mm-tap, .mm-corner) { animation-delay: 0s !important; }
@media (prefers-reduced-motion: reduce) { .mm-title :is(.mm-logo-row span, .mm-tagline, .mm-tap, .mm-corner) { animation-delay: 0s !important; } }
.mm-corner { position: absolute; display: flex; gap: 8px; }
.mm-corner.bl { left: calc(14px + env(safe-area-inset-left,0px)); bottom: calc(12px + env(safe-area-inset-bottom,0px)); }
.mm-corner.br { right: calc(14px + env(safe-area-inset-right,0px)); bottom: calc(12px + env(safe-area-inset-bottom,0px)); }
.mm-corner.tr { right: calc(14px + env(safe-area-inset-right,0px)); top: calc(12px + env(safe-area-inset-top,0px)); }
.mm-ver { font: 700 11px var(--f-body); color: rgba(255,255,255,0.85); text-shadow: 0 1px 0 var(--ink); }
.mm-langs { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr)); }
.mm-lang { min-height: 50px; border-radius: 14px; border: 3px solid var(--ink); background: #fff; font: 800 16px var(--f-body); box-shadow: 0 3px 0 var(--ink); cursor: pointer; padding: 6px 10px; }
.mm-lang.on { background: var(--sun); outline: 3px solid #fff; outline-offset: -7px; }
.mm-presets { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 14px 8px 6px; }
.mm-preset { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 10px; border-radius: 20px; border: 4px solid var(--ink); background: #fff; box-shadow: 0 5px 0 var(--ink); cursor: pointer; text-align: center; font: inherit; color: inherit; position: relative; }
.mm-preset.on { background: #fff6c8; outline: 4px solid var(--sun); outline-offset: 2px; transform: translateY(-3px); }
.mm-preset .mm-pic { width: 70px; height: 70px; } .mm-preset .mm-pic svg { width: 100%; height: 100%; }
.mm-preset.on .mm-pic { animation: mmPresetBop 1.1s ease-in-out infinite; }
@keyframes mmPresetBop { 0%,100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-5px) rotate(-6deg); } 60% { transform: translateY(0) rotate(5deg); } }
.mm-preset h3 { margin: 0; font: var(--fw-d) 20px/1.1 var(--f-display); }
.mm-preset p { margin: 0; font: 700 12.5px/1.4 var(--f-body); color: var(--ink-soft); }
.mm-preset .mm-row { justify-content: center; }
.mm-badge { position: absolute; top: -12px; right: 10px; max-width: calc(100% - 20px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: var(--badge); color: #fff; border: 3px solid var(--ink); border-radius: 99px; padding: 1px 9px; font: 800 12px/1.4 var(--f-body); transform: rotate(6deg); }
/* --- responsive --- */
@media (max-height: 460px) {
  .mm-bp { border-radius: 20px; height: 100%; }
  .mm-rail { padding: 8px 8px; gap: 6px; }
  .mm-portrait { width: 46px; height: 46px; }
  .mm-who-name { font-size: 15px; }
  .mm-say { font-size: 11.5px; line-height: 1.35; padding: 5px 8px; }
  .mm-say > span { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
  .mm-rail-art { max-height: 38%; }
  .mm-tab { min-height: 38px; padding: 4px 8px; font-size: 13px; border-radius: 12px; }
  .mm-tab .mm-ico { width: 20px; height: 20px; }
  .mm-head { padding: 6px 8px 5px 12px; }
  .mm-head .btn.icon, html.gh-short .mm-head .btn.icon { width: 40px; height: 40px; min-height: 0; padding: 0; }
  .mm-body { padding: 8px 10px 12px; }
  .mm-tile { width: 48px; height: 48px; } .mm-tile svg { width: 36px; height: 36px; }
  .mm-talk-por { width: 92px; height: 92px; }
  .mm-talk-box { min-height: 92px; padding: 10px 14px 10px 30px; }
  .mm-talk-text { font-size: 14.5px; }
  .mm-res { gap: 6px; padding-top: calc(10px + env(safe-area-inset-top,0px)); padding-bottom: calc(8px + env(safe-area-inset-bottom,0px)); }
  .mm-res-top { flex-direction: row; gap: 18px; }
  .mm-res-id { gap: 10px; } .mm-res-ranger { width: 50px; height: 50px; border-width: 3px; box-shadow: 0 3px 0 var(--ink); }
  .mm-res-title { font-size: clamp(28px, 9vh, 40px); -webkit-text-stroke-width: max(1px, calc(4px * var(--ds, 1))); text-shadow: 0 4px 0 var(--ink); }
  .mm-res-sub { font-size: 13px; }
  .mm-star { width: 36px; height: 36px; } .mm-star.mid { width: 44px; height: 44px; }
  .mm-medal { width: 44px; height: 44px; font-size: 22px; border-width: 3px; }
  .mm-res-panel { max-height: none; padding: 8px 10px; gap: 10px; border-radius: 18px; }
  .mm-res-col.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 4px 6px; }
  .mm-res-col.stats > .mm-res-h, .mm-res-col.stats > .mm-note, .mm-res-col.stats > .mm-statrow.wide { grid-column: 1 / -1; }
  .mm-statrow { padding: 3px 8px; font-size: 12.5px; gap: 6px; } .mm-statrow b { font-size: 13.5px; }
  .mm-statrow span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mm-rchip { font-size: 13px; padding: 3px 8px 3px 4px; border-radius: 11px; } .mm-rchip .mm-ico { width: 20px; height: 20px; }
  .mm-rchip.big { font-size: 15px; padding: 4px 10px 4px 5px; } .mm-rchip.big .mm-ico { width: 24px; height: 24px; }
  .mm-callout { font-size: 13.5px; padding: 3px 10px; }
  .mm-calls { flex-direction: row; flex-wrap: wrap; } .mm-calls > .mm-callout { flex: 1 1 auto; }
  .mm-res-col > .mm-xpline { order: 1; } .mm-res-col > .mm-calls { order: 2; } .mm-res-col > .mm-qstrip { order: 3; }
  .mm-new { padding: 4px 8px; gap: 8px; border-width: 3px; border-radius: 15px; box-shadow: 0 4px 0 var(--ink); }
  .mm-new-h { font-size: 15px; } .mm-new-h .mm-ico { width: 24px; height: 24px; }
  .mm-new-go { min-height: 40px; padding: 2px 5px 2px 3px; border-width: 2.5px; } .mm-new-go .mm-tile { width: 30px; height: 30px; } .mm-new-go .mm-tile svg { width: 22px; height: 22px; }
  .mm-new-t b { font-size: 12.5px; } .mm-new-t small { font-size: 11px; } .mm-new-go .mm-go { font-size: 11.5px; padding: 0 6px; }
  /* three places on a phone: names only, and the Go there pill becomes an arrow */
  .mm-new.many .mm-new-h { max-width: 20%; } .mm-new.many .mm-new-t small { display: none; }
  .mm-new.many .mm-new-go { flex-basis: 120px; } .mm-new.many .mm-go-t { display: none; } .mm-new.many .mm-go-a { display: block; padding: 0 2px; }
  .mm-res-tip { font-size: 12px; }
  .mm-res-btns .btn.big { min-height: 46px; font-size: 17px; padding: 6px 22px; }
  .mm-big { min-height: 70px; padding: 10px; } .mm-big .mm-tile { width: 52px; height: 52px; } .mm-big h3 { font-size: 17px; }
  .mm-preset { padding: 8px 8px; gap: 3px; } .mm-preset .mm-pic { width: 42px; height: 42px; } .mm-preset h3 { font-size: 16px; } .mm-preset p { font-size: 11px; line-height: 1.3; } .mm-preset .mm-tag { font-size: 11px; }
  .mm-presets { padding-top: 12px; gap: 8px; }
  .mm-tap { padding: 9px 24px; }
}
@media (max-width: 640px) {
  .mm-bp { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); height: 100%; }
  .mm-rail { border-right: 0; border-bottom: 4px solid var(--ink); flex-direction: column; }
  .mm-tabs { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding-bottom: 6px; }
  .mm-tab { flex: none; } .mm-tab.on { transform: translateY(-2px); }
  .mm-say { display: none; } .mm-rail-art { display: none; }
  .mm-res-panel { grid-template-columns: 1fr; max-height: 52vh; overflow-y: auto; }
  .mm-presets { grid-template-columns: 1fr; }
  .mm-preset { flex-direction: row; text-align: left; } .mm-preset .mm-row { justify-content: flex-start; }
  .mm-talk-por { width: 84px; height: 84px; }
}
`;
  function injectCSS() {
    if (document.getElementById('mm-css')) return;
    const s = document.createElement('style'); s.id = 'mm-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  if (document.head) injectCSS(); else document.addEventListener('DOMContentLoaded', injectCSS);

  // ================================================================== icons (inline SVG, ink outline)
  const S = (body, vb) => '<svg viewBox="' + (vb || '0 0 32 32') + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  const INK = '#1e1a4d';
  const st = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
  const I = M.ICONS = {
    clinks: S('<path d="M16 3l11 6.3v13.4L16 29 5 22.7V9.3z" fill="#ffc93c" ' + st + '/><circle cx="16" cy="16" r="5" fill="#fff6c8" ' + st + '/>'),
    lumite: S('<path d="M16 2l4 9 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1z" fill="#6ef0ff" ' + st + '/><path d="M16 8l2 5 5 .6-4 3.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
    stamps: S('<rect x="5" y="5" width="22" height="22" rx="4" fill="#ff8fc0" ' + st + '/><circle cx="16" cy="15" r="5" fill="#fff" ' + st + '/><path d="M10 23h12" ' + st + '/>'),
    xp: S('<circle cx="16" cy="16" r="12" fill="#b78bff" ' + st + '/><path d="M16 8l2.4 5 5.4.6-4 3.7 1.1 5.4L16 20l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="#fff" ' + st + ' stroke-width="1.8"/>'),
    scroll: S('<path d="M8 6h16a3 3 0 0 1 0 6H23v12a3 3 0 0 1-3 3H8a3 3 0 0 1 0-6h1V9a3 3 0 0 0-1-3z" fill="#fff1c8" ' + st + '/><path d="M12 13h7M12 17h7M12 21h5" ' + st + ' stroke-width="2"/>'),
    wrench: S('<path d="M21 4a7 7 0 0 0-6.5 9.6L5 23a2.8 2.8 0 0 0 4 4l9.4-9.5A7 7 0 0 0 28 11l-4.4 2.2-3-1.5-.8-3.3L22 4.2z" fill="#9fd8ff" ' + st + '/>'),
    coin: S('<circle cx="16" cy="16" r="12" fill="#ffd23f" ' + st + '/><circle cx="16" cy="16" r="7.5" fill="none" stroke="#e09a00" stroke-width="2"/><path d="M16 11v10M13 13.5h5a1.8 1.8 0 0 1 0 3.6h-4a1.8 1.8 0 0 0 0 3.6h5" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>'),
    cup: S('<path d="M6 11h16v7a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z" fill="#3ddc97" ' + st + '/><path d="M22 13h2a3.5 3.5 0 0 1 0 7h-2.5" fill="none" ' + st + '/><path d="M11 4c-1 2 1 3 0 5M16 4c-1 2 1 3 0 5" fill="none" ' + st + ' stroke-width="2"/><path d="M5 28h20" ' + st + '/>'),
    trophy: S('<path d="M9 4h14v8a7 7 0 0 1-14 0z" fill="#ffd23f" ' + st + '/><path d="M9 7H5a4 4 0 0 0 5 6M23 7h4a4 4 0 0 1-5 6" fill="none" ' + st + '/><path d="M16 19v4M10 28h12l-2-5h-8z" fill="#ffb627" ' + st + '/>'),
    shield: S('<path d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7z" fill="#8f7bff" ' + st + '/><path d="M16 8v16M10 13h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'),
    target: S('<circle cx="16" cy="16" r="12" fill="#ff6b8b" ' + st + '/><circle cx="16" cy="16" r="7.5" fill="#fff" ' + st + '/><circle cx="16" cy="16" r="3" fill="#ff6b8b" ' + st + '/>'),
    rocket: S('<path d="M16 3c5 4 7 9 6 16H10C9 12 11 7 16 3z" fill="#e8f0ff" ' + st + '/><circle cx="16" cy="12" r="2.8" fill="#39d5ff" ' + st + ' stroke-width="1.8"/><path d="M10 15l-4 5 4 1M22 15l4 5-4 1" fill="#ff6b8b" ' + st + '/><path d="M13 22c0 3 1.5 5 3 7 1.5-2 3-4 3-7" fill="#ffb627" ' + st + '/>'),
    splat: S('<path d="M16 4c2 0 2 4 4 4s4-3 6-1-2 4 0 6 5 1 5 4-4 2-4 4 2 4 0 6-4-1-6 0-1 5-5 5-2-4-4-4-5 2-6-1 2-4 1-6-6-1-5-4 4-2 4-4-3-4-1-6 4 1 6 0 0-4 3-4z" fill="#ff8a1f" ' + st + ' stroke-width="2"/><circle cx="13" cy="14" r="2" fill="#fff"/>'),
    airship: S('<ellipse cx="16" cy="12" rx="12" ry="7" fill="#b78bff" ' + st + '/><path d="M8 11h16" stroke="#fff" stroke-width="2"/><path d="M12 19h8l-1 5h-6z" fill="#ffb627" ' + st + '/><path d="M14 19l-1-1M18 19l1-1" ' + st + ' stroke-width="1.8"/>'),
    pin: S('<path d="M16 29s9-8.5 9-15a9 9 0 0 0-18 0c0 6.5 9 15 9 15z" fill="#ff6b8b" ' + st + '/><circle cx="16" cy="13.5" r="3.6" fill="#fff" ' + st + '/>'),
    star: S('<path d="M16 3l3.8 7.9 8.6 1.1-6.3 6 1.6 8.6L16 22.4l-7.7 4.2 1.6-8.6-6.3-6 8.6-1.1z" fill="#ffd23f" ' + st + '/>'),
    lock: S('<rect x="7" y="14" width="18" height="14" rx="4" fill="#ffc21a" ' + st + '/><path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" ' + st + '/><circle cx="16" cy="21" r="2.2" fill="' + INK + '"/>'),
    gear: S('<path d="M14 3h4l.8 3.5 2.6 1.1 3-2 2.8 2.8-2 3 1.1 2.6L29 14v4l-3.5.8-1.1 2.6 2 3-2.8 2.8-3-2-2.6 1.1L18 29h-4l-.8-3.5-2.6-1.1-3 2-2.8-2.8 2-3-1.1-2.6L3 18v-4l3.5-.8 1.1-2.6-2-3 2.8-2.8 3 2 2.6-1.1z" fill="#c9d4f0" ' + st + ' stroke-width="2"/><circle cx="16" cy="16" r="4.5" fill="#fff" ' + st + '/>'),
    globe: S('<circle cx="16" cy="16" r="12" fill="#7fdcff" ' + st + '/><path d="M4 16h24M16 4c-4 4-4 20 0 24M16 4c4 4 4 20 0 24" fill="none" ' + st + ' stroke-width="2"/>'),
    check: S('<circle cx="16" cy="16" r="12" fill="#3ddc97" ' + st + '/><path d="M10 16.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    play: S('<circle cx="16" cy="16" r="12" fill="#3ddc97" ' + st + '/><path d="M13 10l9 6-9 6z" fill="#fff" ' + st + ' stroke-width="2"/>'),
    chest: S('<rect x="4" y="13" width="24" height="14" rx="3" fill="#ffb627" ' + st + '/><path d="M4 13a12 7 0 0 1 24 0" fill="#ffd23f" ' + st + '/><rect x="13" y="15" width="6" height="6" rx="1.5" fill="#fff6c8" ' + st + ' stroke-width="2"/>'),
    sticker: S('<path d="M6 6h20v14l-6 6H6z" fill="#ffd6e6" ' + st + '/><path d="M20 26v-6h6" fill="#ff8fc0" ' + st + '/><path d="M12 12l2 4 4 .5-3 2.5 1 4-4-2-4 2 1-4-3-2.5 4-.5z" fill="#ffd23f" ' + st + ' stroke-width="1.6"/>'),
    book: S('<path d="M5 6h9a3 3 0 0 1 2 1 3 3 0 0 1 2-1h9v20h-9a3 3 0 0 0-2 1 3 3 0 0 0-2-1H5z" fill="#9fe8ff" ' + st + '/><path d="M16 7v19" ' + st + ' stroke-width="2"/>'),
    chart: S('<rect x="4" y="4" width="24" height="24" rx="5" fill="#fff" ' + st + '/><path d="M9 22v-5M14 22v-9M19 22v-6M24 22V9" stroke="#8f6bff" stroke-width="3.4" stroke-linecap="round"/>'),
    hammer: S('<path d="M5 25l11-11 3 3L8 28z" fill="#d99a5b" ' + st + '/><path d="M14 9l6-6 9 9-4 4-4-2-3 3-4-4 3-3z" fill="#9aa5c8" ' + st + '/>'),
    up: S('<circle cx="16" cy="16" r="12" fill="#ffd23f" ' + st + '/><path d="M16 23V10M10 15l6-6 6 6" fill="none" ' + st + ' stroke-width="3"/>'),
    chip: S('<rect x="8" y="8" width="16" height="16" rx="3" fill="#3ddc97" ' + st + '/><path d="M12 4v4M16 4v4M20 4v4M12 24v4M16 24v4M20 24v4M4 12h4M4 16h4M4 20h4M24 12h4M24 16h4M24 20h4" ' + st + ' stroke-width="2"/><rect x="12" y="12" width="8" height="8" rx="1.5" fill="#fff" ' + st + ' stroke-width="1.8"/>'),
    bag: S('<path d="M7 11h18l-2 16H9z" fill="#ff8a4c" ' + st + '/><path d="M11 11V9a5 5 0 0 1 10 0v2" fill="none" ' + st + '/><path d="M12 17h8" ' + st + '/>'),
    cart: S('<path d="M3 5h4l3 14h14l3-10H9" fill="none" ' + st + '/><path d="M9 9h18l-3 10H10z" fill="#ffd23f" ' + st + '/><circle cx="12" cy="25" r="2.5" fill="#fff" ' + st + '/><circle cx="22" cy="25" r="2.5" fill="#fff" ' + st + '/>'),
    tag: S('<path d="M4 15V5h10l14 14-10 10z" fill="#3ddc97" ' + st + '/><circle cx="10" cy="10" r="2.4" fill="#fff" ' + st + ' stroke-width="1.8"/>'),
    refill: S('<rect x="9" y="6" width="14" height="22" rx="4" fill="#9fe8ff" ' + st + '/><rect x="12" y="3" width="8" height="4" rx="1.5" fill="#fff" ' + st + ' stroke-width="2"/><path d="M13 16l3-4 3 4h-2v5h-2v-5z" fill="#1e2a5a"/>'),
    gift: S('<rect x="5" y="12" width="22" height="15" rx="3" fill="#ff6b8b" ' + st + '/><rect x="4" y="9" width="24" height="5" rx="2" fill="#ffd23f" ' + st + '/><path d="M16 9v18" stroke="#fff6c8" stroke-width="3.4"/><path d="M16 9c-3-6-9-4-6 0M16 9c3-6 9-4 6 0" fill="none" ' + st + '/>'),
    clock: S('<circle cx="16" cy="16" r="12" fill="#fff" ' + st + '/><path d="M16 9v7l5 3" fill="none" ' + st + '/>'),
    heart: S('<path d="M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27z" fill="#ff5a6e" ' + st + '/>'),
    bolt: S('<path d="M18 3L7 18h8l-2 11 12-16h-8z" fill="#ffd23f" ' + st + '/>'),
    bot: S('<rect x="6" y="9" width="20" height="16" rx="6" fill="#ff7a3d" ' + st + '/><rect x="10" y="13" width="12" height="6" rx="3" fill="#2a1b3d"/><circle cx="13.5" cy="16" r="1.6" fill="#5cffe1"/><circle cx="18.5" cy="16" r="1.6" fill="#5cffe1"/><path d="M16 9V5" ' + st + '/><circle cx="16" cy="4.5" r="2" fill="#ffd23f" ' + st + ' stroke-width="1.6"/>'),
    sparkle: S('<path d="M16 3c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10z" fill="#fff6a8" ' + st + '/>'),
    boot: S('<path d="M8 5h8v11l9 4a3 3 0 0 1 2 3v3H6V7z" fill="#ff6fb5" ' + st + '/><path d="M6 23h21" ' + st + '/>'),
    hat: S('<path d="M6 21a10 10 0 0 1 20 0z" fill="#ff6b8b" ' + st + '/><rect x="4" y="20" width="24" height="5" rx="2.5" fill="#fff6e0" ' + st + '/><circle cx="16" cy="9" r="2.6" fill="#fff" ' + st + '/>'),
    wings: S('<path d="M16 12c-4-6-11-6-13-3 2 0 3 2 2 3 2 0 3 2 2 4 3-1 6 1 9-1zM16 12c4-6 11-6 13-3-2 0-3 2-2 3-2 0-3 2-2 4-3-1-6 1-9-1z" fill="#bfe8ff" ' + st + ' stroke-width="2"/><circle cx="16" cy="14" r="3" fill="#ffd23f" ' + st + ' stroke-width="2"/>'),
    magnet: S('<path d="M7 5h6v11a3 3 0 0 0 6 0V5h6v11a9 9 0 0 1-18 0z" fill="#ff5a6e" ' + st + '/><path d="M7 9h6M19 9h6" stroke="#fff" stroke-width="3"/>'),
    visor: S('<path d="M4 14c4-5 20-5 24 0v4c-4 4-20 4-24 0z" fill="#39d5ff" ' + st + '/><path d="M9 15c3-2 11-2 14 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'),
    jet: S('<rect x="9" y="5" width="14" height="17" rx="5" fill="#9aa5c8" ' + st + '/><path d="M12 22l-1 4h4l-1-4M20 22l-1 4h4l-1-4" fill="#ffb627" ' + st + ' stroke-width="1.8"/><rect x="12" y="9" width="8" height="5" rx="2" fill="#39d5ff" ' + st + ' stroke-width="1.8"/>'),
    potion: S('<path d="M13 4h6v6l5 8a6 6 0 0 1-5 9h-6a6 6 0 0 1-5-9l5-8z" fill="#ff8fc0" ' + st + '/><path d="M10 19h12" stroke="#fff" stroke-width="2.4"/>'),
    paint: S('<rect x="8" y="10" width="16" height="17" rx="4" fill="#fff" ' + st + '/><path d="M8 15c3 3 4-1 8 2s5-1 8-2v-1H8z" fill="#ff6fb5"/><path d="M10 10a6 6 0 0 1 12 0" fill="none" ' + st + '/>'),
    beepo: S('<circle cx="16" cy="17" r="12" fill="#fff1dc" ' + st + '/><rect x="9" y="11" width="14" height="10" rx="4.5" fill="#1e2a5a"/><circle cx="13" cy="16" r="1.9" fill="#39d5ff"/><circle cx="19" cy="16" r="1.9" fill="#39d5ff"/><path d="M16 5V2.5" ' + st + '/><circle cx="16" cy="2.5" r="1.8" fill="#ff6b8b"/>'),
    weapon: S('<path d="M4 13h17l4-3h3v8h-3l-4-2H14l-2 8H7l1-8H4z" fill="#2ec4b6" ' + st + '/><circle cx="18" cy="13" r="1.8" fill="#4fd8ff"/>'),
    part: S('<path d="M16 3l11 6.3v13.4L16 29 5 22.7V9.3z" fill="#c9d4f0" ' + st + '/><circle cx="16" cy="16" r="4.5" fill="#fff" ' + st + '/>'),
    close: S('<path d="M8 8l16 16M24 8L8 24" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>'),
    // play again: a round arrow (the results Retry button; the pause menu's Restart draws the same glyph)
    retry: S('<circle cx="16" cy="16" r="12" fill="#9fe8ff" ' + st + '/><path d="M22 16.5a6 6 0 1 1-1.8-4.3" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/><path d="M21.6 8.6v4.2h-4.2" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  };
  M.botIcon = col => S('<rect x="6" y="9" width="20" height="16" rx="6" fill="' + col + '" ' + st + '/><rect x="10" y="13" width="12" height="6" rx="3" fill="#2a1b3d"/><circle cx="13.5" cy="16" r="1.6" fill="#5cffe1"/><circle cx="18.5" cy="16" r="1.6" fill="#5cffe1"/><path d="M16 9V5" ' + st + '/><circle cx="16" cy="4.5" r="2" fill="#ffd23f" ' + st + ' stroke-width="1.6"/><path d="M9 25v3M23 25v3" ' + st + '/>');
  M.icon = (name, cls) => el('span.mm-ico' + (cls ? '.' + cls : ''), { html: I[name] || I.star });

  // ================================================================== data adapters
  const prof = M.prof = () => (G.Save && G.Save.data ? G.Save.prof : {});
  const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
  M.clinks = () => num(prof().clinks);
  M.lumite = () => { const p = prof(); return num(p.lumite != null ? p.lumite : p.parts && p.parts.lumite != null ? p.parts.lumite : p.wallet && p.wallet.lumite); };
  M.stamps = () => { const p = prof(); return num(p.stamps != null ? p.stamps : p.wallet && p.wallet.stamps); };
  M.partCount = id => { if (id === 'lumite') return M.lumite(); const p = prof(); return num((p.parts && p.parts[id]) != null ? p.parts[id] : p.vault && p.vault[id]); };
  M.rank = function () {
    let ri = null;
    try { ri = G.Progress && G.Progress.rankInfo ? G.Progress.rankInfo() : null; } catch (e) { ri = null; }
    const p = prof();
    const pr = (ri && (ri.pr || ri.level || ri.rank)) || (p.rank && p.rank.pr) || p.pr || 1;
    const guild = (ri && (ri.guild || ri.star)) || (p.rank && p.rank.guild) || p.guild || 1;
    let xp = ri && ri.xp != null ? ri.xp : (p.rank && p.rank.xp) || p.xp || 0;
    const need = ri && (ri.next || ri.need || ri.toNext) || 0;
    let frac = ri && ri.frac != null ? ri.frac : need ? xp / need : 0;
    return { pr, guild, xp, need, frac: U.clamp(frac || 0, 0, 1), raw: ri };
  };
  const pretty = id => String(id || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  M.pretty = pretty;
  const KEYS = {
    weapon: id => ['wpn.' + id, 'wpn.' + id + '.name', 'weapon.' + id + '.name', 'weapon.' + id],
    part: id => ['part.' + id, 'part.' + id + '.name'],
    gear: id => ['gear.' + id, 'gear.' + id + '.name'],
    gadget: id => ['gadget.' + id + '.name', 'gad.' + id, 'gad.' + id + '.name', 'gadget.' + id],
    mod: id => ['mod.' + id, 'mod.' + id + '.name', 'item.' + id],
    item: id => ['item.' + id, 'item.' + id + '.name', 'shop.' + id, 'shop.' + id + '.name'],
    enemy: id => ['enemy.' + id, 'enemy.' + id + '.name'],
    sticker: id => ['sticker.' + id + '.name', 'ach.' + id, 'ach.' + id + '.name', 'sticker.' + id],
  };
  M.inferKind = function (id) {
    const D = G.Data || {};
    if ((D.WEAPONS && D.WEAPONS[id]) || (G.Weapons && G.Weapons.defs && G.Weapons.defs[id])) return 'weapon';
    if (D.PARTS && D.PARTS[id]) return 'part';
    if (D.GEAR && D.GEAR[id]) return 'gear';
    if (D.MODS && D.MODS[id]) return 'mod';
    if ((D.GADGETS && D.GADGETS[id]) || (D.ABILITIES && D.ABILITIES[id]) || (G.Gadgets && G.Gadgets.defs && G.Gadgets.defs[id])) return 'gadget';
    if (/^m_/.test(id)) return 'mod';
    return 'item';
  };
  M.defOf = function (kind, id) {
    const D = G.Data || {};
    const tab = { weapon: D.WEAPONS, part: D.PARTS, gear: D.GEAR, mod: D.MODS, gadget: D.GADGETS || D.ABILITIES, enemy: D.ENEMIES, item: D.ITEMS }[kind];
    let d = tab && (Array.isArray(tab) ? tab.find(x => x.id === id) : tab[id]);
    if (!d && kind === 'weapon' && G.Weapons && G.Weapons.defs) d = G.Weapons.defs[id];
    if (!d && kind === 'gadget' && G.Gadgets && G.Gadgets.defs) d = G.Gadgets.defs[id];
    if (!d && kind === 'enemy' && G.Enemies && G.Enemies.defs) d = G.Enemies.defs[id];
    return d || null;
  };
  M.name = function (kind, id, def) {
    def = def || M.defOf(kind, id);
    if (def && def.nameKey && G.i18n.has(def.nameKey)) return G.t(def.nameKey);
    for (const k of (KEYS[kind] || KEYS.item)(id)) if (G.i18n.has(k)) return G.t(k);
    for (const kk in KEYS) for (const k of KEYS[kk](id)) if (G.i18n.has(k)) return G.t(k);
    if (def && def.name && typeof def.name === 'string') return G.i18n.has(def.name) ? G.t(def.name) : def.name;
    return pretty(id);
  };
  M.desc = function (kind, id, def) {
    def = def || M.defOf(kind, id);
    if (def && def.descKey && G.i18n.has(def.descKey)) return G.t(def.descKey);
    const pre = { weapon: ['wpn.', 'weapon.'], part: ['part.'], gear: ['gear.'], gadget: ['gad.', 'gadget.'], mod: ['mod.'], item: ['item.', 'shop.'], enemy: ['enemy.'], sticker: ['ach.'] }[kind] || ['item.'];
    for (const p of pre) { if (G.i18n.has(p + id + '.desc')) return G.t(p + id + '.desc'); if (G.i18n.has(p + id + '.d')) return G.t(p + id + '.d'); }
    return '';
  };
  const RAR = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const RAR_COL = { common: '#c9d1dc', uncommon: '#3ddc97', rare: '#3fa9ff', epic: '#a66bff', legendary: '#ffc21a', mythic: '#ff4d6d', prismatic: '#ff8fc0' };
  M.rarity = function (kind, id, def) {
    def = def || M.defOf(kind, id);
    let r = def && (def.rarity || def.rar || def.tier);
    if (!r && def && def.family) r = { tidy: 'uncommon', tradeoff: 'rare', wild: 'epic' }[def.family];
    if (typeof r === 'number') r = RAR[U.clamp(r - (r > 0 ? 1 : 0), 0, 5)];
    return r || 'common';
  };
  M.rarityColor = r => {
    const R = G.Data && G.Data.RARITY && G.Data.RARITY[r];
    if (R && R.color != null) return typeof R.color === 'number' ? '#' + R.color.toString(16).padStart(6, '0') : R.color;
    return RAR_COL[r] || RAR_COL.common;
  };
  M.pips = r => Math.max(1, RAR.indexOf(r) + 1 || 1);
  const GEAR_ICON = { shield: 'shield', beanie: 'hat', visor: 'visor', puffpack: 'jet', wings: 'wings', tankpack: 'refill', sneakers: 'boot', skates: 'boot', magnet: 'magnet', medipump: 'heart', polish: 'sparkle', dome: 'shield', scan: 'beepo', grapple: 'pin', dash: 'bolt' };
  M.iconSvg = function (kind, id) {
    try {
      if (kind === 'weapon' && G.Weapons && G.Weapons.icon) { const s = G.Weapons.icon(id); if (s) return s; }
      if (kind === 'part') { if (id === 'lumite') return I.lumite; if (G.Data && G.Data.partIcon) { const s = G.Data.partIcon(id); if (s) return s; } return I.part; }
    } catch (e) { /* fall back */ }
    if (kind === 'weapon') return I.weapon;
    if (kind === 'mod') return I.chip;
    if (kind === 'gear' && G.Data && G.Data.gearIcon && G.Data.GEAR && G.Data.GEAR[id]) { try { return G.Data.gearIcon(id); } catch (e) { /* fall back */ } }
    if (kind === 'gadget') return { scan: I.beepo, dome: I.shield, grapple: I.pin, dash: I.bolt }[id] || I.bolt;
    for (const k in GEAR_ICON) if (String(id).indexOf(k) === 0) return I[GEAR_ICON[k]];
    if (/health|pop/.test(id)) return I.heart; if (/cell|shield/.test(id)) return I.shield; if (/revive/.test(id)) return I.sparkle;
    if (/refill|ammo/.test(id)) return I.refill; if (/lumite/.test(id)) return I.lumite; if (/float|cookie|boost/.test(id)) return I.cup;
    if (/paint|hat|trail|skin/.test(id)) return I.paint;
    return kind === 'gadget' ? I.bolt : I.gift;
  };
  M.tile = function (kind, id, opts) {
    opts = opts || {};
    const r = opts.rarity || M.rarity(kind, id);
    const col = M.rarityColor(r);
    const t = el('div.mm-tile' + (opts.sm ? '.sm' : ''), { style: { '--tc': opts.bg || mixLight(col) } });
    t.innerHTML = opts.svg || M.iconSvg(kind, id);
    if (opts.pips !== false && kind !== 'weapon') {
      const pips = el('div.mm-pips', { style: { '--rc': col } });
      for (let i = 0; i < M.pips(r); i++) pips.appendChild(el('i'));
      t.appendChild(pips);
    }
    return t;
  };
  function mixLight(hex) {
    const h = parseInt(String(hex).replace('#', ''), 16) || 0xdff1ff;
    const r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255;
    const m = c => Math.round(c + (255 - c) * 0.55);
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  M.mixLight = mixLight;
  // parts cost normalisation: {id:n} | [{id,n}] | [[id,n]] -> {id:n}
  M.normParts = function (p) {
    const out = {};
    if (!p) return out;
    if (Array.isArray(p)) for (const e of p) { if (Array.isArray(e)) out[e[0]] = (out[e[0]] || 0) + (e[1] || 1); else if (e && e.id) out[e.id] = (out[e.id] || 0) + (e.n || e.count || e.qty || 1); }
    else for (const k in p) if (typeof p[k] === 'number') out[k] = p[k];
    return out;
  };
  M.hasParts = function (parts) {
    if (G.Progress && G.Progress.hasParts) { try { const r = G.Progress.hasParts(parts); if (typeof r === 'boolean') return r; } catch (e) { /* fallback */ } }
    for (const id in parts) if (M.partCount(id) < parts[id]) return false;
    return true;
  };
  // Cost chips row: clinks + parts with have/need colouring.
  M.costRow = function (clinks, parts, opts) {
    opts = opts || {};
    const row = el('div.mm-row');
    if (clinks) row.appendChild(el('span.mm-cost.' + (M.clinks() >= clinks ? 'ok' : 'no'), el('span.mm-ico', { html: I.clinks }), el('b', { text: G.i18n.num(clinks) })));
    if (opts.lumite) row.appendChild(el('span.mm-cost.' + (M.lumite() >= opts.lumite ? 'ok' : 'no'), el('span.mm-ico', { html: I.lumite }), el('b', { text: M.lumite() + '/' + opts.lumite })));
    if (opts.stamps) row.appendChild(el('span.mm-cost.' + (M.stamps() >= opts.stamps ? 'ok' : 'no'), el('span.mm-ico', { html: I.stamps }), el('b', { text: G.i18n.num(opts.stamps) })));
    for (const id in parts || {}) {
      const have = M.partCount(id), need = parts[id];
      const c = el('span.mm-cost.' + (have >= need ? 'ok' : 'no'), { title: M.name('part', id) }, el('span.mm-ico', { html: M.iconSvg('part', id) }), el('b', { text: have + '/' + need }));
      c.setAttribute('aria-label', M.name('part', id));
      row.appendChild(c);
    }
    return row;
  };
  // First missing cost -> localized reason string (or '').
  M.missingReason = function (clinks, parts, lumite) {
    for (const id in parts || {}) { const have = M.partCount(id), need = parts[id]; if (have < need) return G.t('menu.needMore', { n: need - have, name: M.name('part', id) }); }
    if (lumite && M.lumite() < lumite) return G.t('menu.needMore', { n: lumite - M.lumite(), name: G.t('menu.lumite') });
    if (clinks && M.clinks() < clinks) return G.t('menu.needClinks', { n: clinks - M.clinks() });
    return '';
  };
  M.wallet = function (opts) {
    opts = opts || {};
    const w = el('div.mm-wallet');
    w.appendChild(el('span.mm-chip', el('span.mm-ico', { html: I.clinks }), el('b', { text: G.i18n.num(M.clinks()) })));
    if (opts.lumite !== false) w.appendChild(el('span.mm-chip', el('span.mm-ico', { html: I.lumite }), el('b', { text: G.i18n.num(M.lumite()) })));
    if (opts.stamps) w.appendChild(el('span.mm-chip', el('span.mm-ico', { html: I.stamps }), el('b', { text: G.i18n.num(M.stamps()) })));
    return w;
  };
  M.bar = function (frac, cls, label) {
    return el('div.mm-bar' + (cls ? '.' + cls : ''), el('i', { style: { width: (U.clamp(frac || 0, 0, 1) * 100).toFixed(1) + '%' } }), label != null ? el('b', { text: label }) : null);
  };
  M.empty = function (textKey, icon) { return el('div.mm-empty', M.icon(icon || 'beepo'), el('div', { text: G.t(textKey || 'menu.empty') })); };
  M.sfx = (name, o) => { if (G.Audio) G.Audio.sfx(name, o); };
  // Run a progression call; normalises boolean / {ok, reason} / thrown errors.
  M.call = function (fn, args) {
    if (typeof fn !== 'function') return { ok: false, missing: true };
    let r;
    try { r = fn.apply(G.Progress, args || []); } catch (e) { console.warn('[menus] progress call failed', e); return { ok: false, error: e }; }
    if (r === false) return { ok: false };
    if (r && typeof r === 'object' && r.ok === false) return { ok: false, reason: r.reason || r.msg || r.error, res: r };
    return { ok: r !== false, res: r };
  };
  M.reasonText = function (reason) {
    if (!reason) return G.t('menu.notEnough');
    if (typeof reason === 'string') return G.i18n.has(reason) ? G.t(reason) : G.i18n.has('menu.' + reason) ? G.t('menu.' + reason) : G.t('menu.notEnough');
    return G.t('menu.notEnough');
  };
  M.toastOk = (text, icon) => G.UI.toast(text, { icon: I[icon || 'check'], color: '#e6fff2' });
  M.toastNo = text => { G.UI.toast(text, { icon: I.lock, color: '#ffe8ec' }); M.sfx('error'); };

  // ================================================================== portraits
  const NPC_COL = { quill: ['#3d55b8', '#2e3f8f'], gizma: ['#ff8a4c', '#e0642f'], penny: ['#ff6fb5', '#e0458f'], bloop: ['#3ddc97', '#1fae72'], lumi: ['#b07bff', '#7a4fd8'],
    ping: ['#ffc21a', '#e09a00'], ace: ['#3fa9ff', '#1f7ad8'], ticktock: ['#ff8a1f', '#2f7bff'], gale: ['#8f6bff', '#5b3fc4'], beepo: ['#39d5ff', '#1fa0d8'], defense: ['#6e64a8', '#4a3f8a'] };
  M.npcColors = id => NPC_COL[id] || NPC_COL.beepo;
  const CUSTOM_PORTRAIT = {
    gale: S('<rect width="64" height="64" fill="#cbb8ff"/><circle cx="32" cy="40" r="22" fill="#c99a7a" stroke="' + INK + '" stroke-width="3"/><ellipse cx="25" cy="46" rx="8" ry="6.5" fill="#f2dcc8" stroke="' + INK + '" stroke-width="2.4"/><ellipse cx="39" cy="46" rx="8" ry="6.5" fill="#f2dcc8" stroke="' + INK + '" stroke-width="2.4"/><path d="M26 51l-1.5 9M38 51l1.5 9" stroke="#fffaf2" stroke-width="4" stroke-linecap="round"/><path d="M26 51l-1.5 9M38 51l1.5 9" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="32" cy="41" r="3.4" fill="#5a3a3a"/><circle cx="24" cy="34" r="2.8" fill="' + INK + '"/><circle cx="40" cy="34" r="2.8" fill="' + INK + '"/><rect x="10" y="17" width="44" height="6" rx="3" fill="#1e2a5a" stroke="' + INK + '" stroke-width="2"/><path d="M17 18c0-9 30-9 30 0z" fill="#fffaf2" stroke="' + INK + '" stroke-width="2.4"/><rect x="16" y="15" width="32" height="4" fill="#1e2a5a"/><circle cx="32" cy="12" r="3" fill="#ffc21a" stroke="' + INK + '" stroke-width="1.6"/>', '0 0 64 64'),
    ticktock: S('<rect width="64" height="64" fill="#ffe6b8"/><path d="M14 18l8 4M50 18l-8 4" stroke="' + INK + '" stroke-width="2"/><rect x="8" y="10" width="10" height="7" fill="#ff8a1f" stroke="' + INK + '" stroke-width="1.6"/><rect x="46" y="10" width="10" height="7" fill="#3d7bff" stroke="' + INK + '" stroke-width="1.6"/><circle cx="21" cy="40" r="15" fill="#ff8a1f" stroke="' + INK + '" stroke-width="3"/><circle cx="43" cy="40" r="15" fill="#3d7bff" stroke="' + INK + '" stroke-width="3"/><circle cx="17" cy="36" r="2.6" fill="' + INK + '"/><circle cx="25" cy="36" r="2.6" fill="' + INK + '"/><circle cx="39" cy="36" r="2.6" fill="#fff"/><circle cx="47" cy="36" r="2.6" fill="#fff"/><path d="M18 42l3 4 3-4z" fill="#ffd23f" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M40 42l3 4 3-4z" fill="#ffd23f" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M21 25c0-4 3-5 3-5M43 25c0-4-3-5-3-5" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>', '0 0 64 64'),
  };
  M.portrait = function (id) {
    const artKind = G.Hub && G.Hub.npcKind ? G.Hub.npcKind(id) : null;
    if (CUSTOM_PORTRAIT[id] && !(artKind && G.Geo && G.Geo.npcPortraitSVG)) return CUSTOM_PORTRAIT[id];
    if (id === 'beepo' || id === 'companion') {
      try { if (G.Geo && G.Geo.npcPortraitSVG) { const k = G.Hub && G.Hub.npcKind ? G.Hub.npcKind('companion') : 'companion'; const s = k && G.Geo.npcPortraitSVG(k); if (s) return s; } } catch (e) { /* fallback */ }
      return I.beepo;
    }
    try {
      if (G.Geo && G.Geo.npcPortraitSVG) {
        const k = G.Hub && G.Hub.npcKind ? G.Hub.npcKind(id) : id;
        const s = k && G.Geo.npcPortraitSVG(k);
        if (s) return s;
      }
    } catch (e) { /* fallback */ }
    const c = M.npcColors(id)[0];
    return S('<circle cx="32" cy="34" r="26" fill="' + c + '" stroke="' + INK + '" stroke-width="3"/><rect x="18" y="24" width="28" height="18" rx="8" fill="#fff6e0" stroke="' + INK + '" stroke-width="2.5"/><circle cx="26" cy="33" r="3" fill="' + INK + '"/><circle cx="38" cy="33" r="3" fill="' + INK + '"/><path d="M27 39q5 3 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>', '0 0 64 64');
  };
  M.npcLines = function (id) {
    const out = [];
    for (let i = 1; i <= 6; i++) { const k = 'npc.' + id + '.l' + i; if (G.i18n.has(k)) out.push(k); else break; }
    return out;
  };

  // ================================================================== building panel scaffold
  // Names that would wrap mid-word in the narrow rail get a smaller size (CJK glyphs count double).
  const longName = s => { let w = 0; for (const ch of String(s || '')) w += /[\u2E80-\uFFEF]/.test(ch) ? 2 : 1; return w > 13; };
  // def: {npc, color:[c1,c2], titleKey, tabs:[{id, labelKey, icon, badge}], tab, onTab(id), body(Element[]), say (key|text), roleKey}
  M.buildingPanel = function (o, close) {
    const cols = o.color || M.npcColors(o.npc);
    const p = el('div.mm-bp.mm-pop', { style: { '--bc': cols[0], '--bc2': cols[1] } });
    const rail = el('div.mm-rail');
    const name = o.npc ? G.t('npc.' + o.npc) : '';
    rail.appendChild(el('div.mm-who',
      el('div.mm-portrait', { html: M.portrait(o.npc || 'beepo') }),
      el('div.mm-who-txt', el('div.mm-who-name' + (longName(name || G.t(o.titleKey)) ? '.long' : ''), { text: name || G.t(o.titleKey) }), o.roleKey ? el('div.mm-who-role', { text: G.t(o.roleKey) }) : null)));
    if (o.say) rail.appendChild(el('div.mm-say', el('span', { text: G.i18n.has(o.say) ? G.t(o.say) : o.say })));
    if (o.tabs && o.tabs.length) {
      const tabs = el('div.mm-tabs');
      for (const t of o.tabs) {
        const b = el('button.mm-tab' + (t.id === o.tab ? '.on' : '') + (t.badge ? '.has-dot' : ''), { type: 'button', onclick: () => { if (t.id !== o.tab) { M.sfx('tab'); o.onTab(t.id); } } },
          M.icon(t.icon || 'star'), el('span', { text: G.t(t.labelKey) }), t.badge ? el('span.mm-dot', { text: String(t.badge) }) : null);
        tabs.appendChild(b);
      }
      rail.appendChild(tabs);
    } else if (o.npc) rail.appendChild(el('div.mm-rail-art', { html: M.portrait(o.npc) }));   // single-page panels: a big friendly portrait fills the rail
    const main = el('div.mm-main',
      el('div.mm-head', el('h2', { text: G.t(o.headKey || o.titleKey) }), o.wallet !== false ? M.wallet(o.walletOpts) : null, G.UI.closeBtn(close)),
      el('div.mm-body', o.body));
    p.append(rail, main);
    return el('div.mm-wrap', p);
  };
  // Persist per-screen scroll across refreshes of different tabs (UI.refresh keeps .panel-body only).
  M.keepScroll = function (entry, root) {
    const body = root.querySelector('.mm-body'); if (!body) return root;
    const key = entry.tab || '_';
    entry._scroll = entry._scroll || {};
    requestAnimationFrame(() => { if (entry._scroll[key]) body.scrollTop = entry._scroll[key]; });
    body.addEventListener('scroll', () => { entry._scroll[key] = body.scrollTop; }, { passive: true });
    return root;
  };
  // Open another module's screen if it exists, else a friendly toast.
  M.openExternal = function (id, params) {
    if (G.UI.defs[id]) { G.UI.open(id, params || {}); return true; }
    G.UI.toast(G.t('menu.unavailable'), { icon: I.beepo });
    return false;
  };

  // Screen registration without the core's backdrop blur (blurring a live WebGL canvas is costly on
  // phones); a flat translucent dim is used instead unless def.dim === false.
  M.def = function (id, def) {
    const build = def.build;
    G.UI.def(id, Object.assign({}, def, { dim: false, build(p, close, entry) { if (def.dim !== false) entry.el.classList.add('mm-dim'); fitSoon(entry.el); return build.call(this, p, close, entry); } }));
  };

  // Long translations: once a screen is laid out, a building title that would be cut off next to the wallet
  // chips gets a smaller two-line size, and a results stat label that would be cut off takes the full row.
  // Runs after open/refresh, after web fonts arrive (they change widths) and after a resize/rotation.
  // A results title that wraps on a short screen ("Nice try! You reached wave 3" at 568 px) steps its size down to fit
  // one line, to 20 px at the least; the rewards column is fitted by fitResults.
  M.fitText = function (root) {
    if (!root || !root.isConnected) return;
    root.querySelectorAll('.mm-head h2').forEach(h => { h.classList.remove('two'); if (h.scrollWidth > h.clientWidth + 1) h.classList.add('two'); });
    root.querySelectorAll('.mm-res-col.stats > .mm-statrow:not(.wide) > span').forEach(sp => { if (sp.scrollWidth > sp.clientWidth + 1) sp.parentElement.classList.add('wide'); });
    root.querySelectorAll('.mm-res-title').forEach(t => {
      t.style.fontSize = '';
      for (let i = 0; i < 4; i++) {
        const fs = parseFloat(getComputedStyle(t).fontSize) || 0;
        if (!fs || t.offsetHeight < fs * 1.6 || fs <= 20) break;
        t.style.fontSize = Math.max(20, fs * 0.88).toFixed(1) + 'px';
      }
    });
    root.querySelectorAll('.mm-res-panel').forEach(fitResults);
  };
  // Results columns that would scroll (big text, a short screen, a long reward list): part chips switch to the short
  // "×n" form, then the rank bar moves up under the header; whatever still does not fit is marked by a soft fade and a
  // "more" button at the column's foot (phones hide scrollbars), which scrolls the column on. (style: .mm-more)
  const overflows = c => c.scrollHeight > c.clientHeight + 2;
  function fitResults(panel) {
    const rew = panel.querySelector('.mm-res-col:not(.stats)'), chips = rew && rew.querySelector('.mm-rewards');
    // first the screen around the panel: when the panel is left with less than ~3 rows (a small phone at XL, a long
    // New in Fizzport! card), the card drops its small lines and the subtitle / tip keep to one line (.tight)
    const res = panel.closest('.mm-res');
    if (res) {
      res.classList.remove('tight');
      if (panel.clientHeight < 170 && Array.from(panel.querySelectorAll('.mm-res-col')).some(overflows)) res.classList.add('tight');
      res.querySelectorAll('.mm-new-h').forEach(fitWords);
    }
    if (chips) {
      chips.classList.remove('short'); rew.classList.remove('xp-up');
      if (overflows(rew)) { chips.classList.add('short'); if (overflows(rew) && rew.querySelector('.mm-xpline')) rew.classList.add('xp-up'); }
    }
    panel.querySelectorAll('.mm-res-col').forEach(moreCue);
  }
  // A narrow heading (the New in Fizzport! card's, 22-28% of the row) whose longest word does not fit its width
  // ("フィズポートに" at XL on a 568 px phone, a long German compound) steps its size down, to 11 px at the least, rather
  // than have the word cut in two by the overflow-wrap fallback. Words are measured with that fallback switched off.
  function fitWords(h) {
    h.style.fontSize = '';
    const txt = h.querySelectorAll('span');   // (the :lang rule sets overflow-wrap on every element, so on the text's own)
    for (const t of txt) t.style.overflowWrap = 'normal';
    for (let i = 0; i < 5 && h.scrollWidth > h.clientWidth + 1; i++) {
      const fs = parseFloat(getComputedStyle(h).fontSize) || 0;
      if (!fs || fs <= 11) break;
      h.style.fontSize = Math.max(11, fs * 0.9).toFixed(1) + 'px';
    }
    for (const t of txt) t.style.overflowWrap = '';
  }
  const MORE_SVG = '<svg viewBox="0 0 16 16"><path d="M3 5.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function moreMark(col) { const on = col.scrollHeight - col.clientHeight - col.scrollTop > 2; if (col.classList.contains('more') !== on) col.classList.toggle('more', on); }
  function moreCue(col) {
    if (!col._more) {
      col._more = el('div.mm-more', el('button.mm-more-b', { type: 'button', 'aria-label': G.t('res.more'), title: G.t('res.more'), html: MORE_SVG, onclick: ev => {
        ev.stopPropagation();
        const dy = Math.max(40, col.clientHeight * 0.7);
        try { col.scrollBy({ top: dy, behavior: G.UI.reduced && G.UI.reduced() ? 'auto' : 'smooth' }); } catch (e) { col.scrollTop += dy; }
      } }));
      col.appendChild(col._more);
      col.addEventListener('scroll', () => moreMark(col), { passive: true });
    }
    moreMark(col);
  }
  function fitSoon(root) {
    requestAnimationFrame(() => M.fitText(root));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => M.fitText(root)).catch(() => {});
  }
  G.bus.on('ui-open', id => { const s = G.UI.top(); if (s && s.id === id) M.fitText(s.el); });   // attached now: fit before the first paint
  G.bus.on('resize', () => setTimeout(() => { for (const s of G.UI.stack) M.fitText(s.el); }, 60));
  G.bus.on('screen', () => setTimeout(() => { for (const s of G.UI.stack) M.fitText(s.el); }, 60));

  // Language switched (Settings opened from the title / quick menu / a town screen): those screens build their
  // text with G.t, so only their data-i18n nodes would update by themselves. Rebuild them in place (they already
  // support G.UI.refresh after purchases). Stateful screens (npc-talk typing, results count-up) are left alone.
  const RELOCALIZE = new Set(['title', 'quickmenu', 'guild', 'workshop', 'shop', 'hangar', 'loadout', 'cafe', 'gallery', 'arena', 'royale', 'fountain', 'training-gate', 'preset-pick', 'locker']);
  G.bus.on('lang', () => setTimeout(() => {
    for (const s of G.UI.stack.slice()) if (RELOCALIZE.has(s.id) && G.UI.stack.includes(s)) G.safe('relocalize ' + s.id, () => G.UI.refresh(s));
  }, 0));

  // "Tap to continue" by input device: tap on touch, click or Space with keyboard + mouse, the A button on a controller
  // (06_input hands A and Space / Enter to the [data-pad-top] overlay of the top screen). Follows a device switch.
  M.contHint = function (node) {
    const dev = G.input ? G.input.device : 'touch';
    node.textContent = ''; node.dataset.contDev = dev;
    if (dev === 'gamepad') G.t('menu.tapPad', { a: '\uE000' }).split(/(\uE000)/).forEach(part => { if (part) node.append(part === '\uE000' ? el('span.pad-g.a', { text: 'A' }) : document.createTextNode(part)); });
    else node.textContent = G.t(dev === 'desktop' ? 'menu.tapKb' : 'menu.tap');
    node.classList.add('mm-cont');
    return node;
  };
  G.bus.on('device', () => { for (const n of document.querySelectorAll('#ui .mm-cont')) if (n.dataset.contDev !== G.input.device) M.contHint(n); });
  G.bus.on('lang', () => { for (const n of document.querySelectorAll('#ui .mm-cont')) M.contHint(n); });

  // ================================================================== npc-talk
  // params: {npc, lines:[keys|text], building, intro, then(), title}
  M.def('npc-talk', {
    dim: true,
    build(p, close, entry) {
      const id = p.npc || 'beepo';
      const lines = (p.lines && p.lines.length ? p.lines : M.npcLines(id)).slice(0, 6);
      if (!lines.length) lines.push('menu.empty');
      entry.i = entry.i || 0;
      const cols = M.npcColors(id);
      // (data-pad="default": the pad's focus ring starts on the line, not on Skip — A advances; Skip stays a d-pad step away)
      const textEl = el('div.mm-talk-text', { 'data-pad': 'default' });
      const dots = el('div.mm-talk-dots', lines.map((l, i) => el('i' + (i <= entry.i ? '.on' : ''))));
      const box = el('div.mm-talk-box', el('div.mm-talk-name', { text: G.t('npc.' + id) }), textEl,
        el('div.mm-talk-foot', dots, el('div.mm-row', M.contHint(el('span.mm-talk-hint')), lines.length > 1 ? G.UI.btn('menu.skip', ev => { ev.stopPropagation(); finish(); }, 'small') : null)));
      // (data-pad-top: the pad's A and Space / Enter advance the dialogue, 06_input — A used to press Skip)
      const wrap = el('div.mm-talk', { style: { '--bc': cols[0] }, 'data-pad-top': '1' }, el('div.mm-talk-por', { html: M.portrait(id) }), box);
      let typing = null, full = '';
      // The whole line is laid out from its first letter (Japanese phrase breaks included) and revealed letter by letter:
      // the part still to come waits in a hidden span, so a word never jumps to the next line as the typing reaches it
      // (and the bubble never grows a line mid-sentence). Menus only, so a few nodes per 22 ms tick are fine.
      const rest = el('span', { style: { visibility: 'hidden' }, 'aria-hidden': 'true' });
      const typeTo = n => {
        const cuts = G.i18n.lang === 'ja' ? G.UI.jaBreaks(full) : null;
        textEl.textContent = ''; rest.textContent = '';
        let last = 0, into = textEl;
        const put = b => { if (b > last) into.appendChild(document.createTextNode(full.slice(last, b))); last = b; };
        if (cuts) for (let i = 0; i < cuts.length; i++) { if (into === textEl && cuts[i] > n) { put(n); into = rest; } put(cuts[i]); into.appendChild(document.createElement('wbr')); }
        if (into === textEl) { put(n); into = rest; }
        put(full.length);
        if (rest.firstChild) textEl.appendChild(rest);
      };
      const done = () => typeTo(full.length);
      const show = () => {
        const k = lines[entry.i];
        full = G.i18n.has(k) ? G.t(k) : String(k);
        let n = 0;
        clearInterval(typing);
        typeTo(0);
        const step = Math.max(1, Math.round(full.length / 40));
        typing = setInterval(() => {
          n = Math.min(full.length, n + step);
          typeTo(n);
          if (n % 6 === 0) M.sfx('npc', { pitch: 0.9 + Math.random() * 0.5 });
          if (n >= full.length) { clearInterval(typing); typing = null; done(); }
        }, 22);
        Array.from(dots.children).forEach((d, i) => { d.classList.toggle('on', i <= entry.i); d.classList.toggle('cur', i === entry.i); });
        // each new line gives the bubble a little squash-and-settle
        if (entry.i > 0) G.UI.anim(box, [{ scale: '1.03 0.96' }, { scale: '0.99 1.02', offset: 0.5 }, { scale: '1 1' }], { duration: 260, easing: 'ease-out' });
      };
      const finish = () => { clearInterval(typing); close(); if (p.then) G.safe('npc-talk then', () => p.then()); };
      const next = () => {
        if (typing) { clearInterval(typing); typing = null; done(); return; }
        if (entry.i < lines.length - 1) { entry.i++; show(); } else finish();
      };
      wrap.addEventListener('click', next);
      entry.next = next;
      show();
      const root = el('div.mm-talk-root', { style: { position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '16px' } }, wrap);
      root.addEventListener('click', ev => { if (ev.target === root) next(); });
      return root;
    },
    onClose() {},
  });

  // ================================================================== quick menu
  const PLACE_ICON = { guild: 'scroll', workshop: 'wrench', shop: 'coin', cafe: 'cup', gallery: 'trophy', defense: 'shield', training: 'target', hangar: 'rocket', arena: 'splat', royale: 'airship', fountain: 'pin' };
  M.placeIcon = id => PLACE_ICON[id] || 'star';
  const MODES = [
    { id: 'expedition', icon: 'pin', screen: 'expedition-select', place: 'fountain', color: '#ffd23f' },
    { id: 'boss', icon: 'bot', screen: 'boss-select', place: 'guild', color: '#ff7a3d' },
    { id: 'turf', icon: 'splat', screen: 'turf-lobby', place: 'arena', color: '#ff8a1f' },
    { id: 'race', icon: 'rocket', screen: 'race-select', place: 'hangar', color: '#3fa9ff' },
    { id: 'royale', icon: 'airship', screen: 'royale-lobby', place: 'royale', color: '#8f6bff' },
    { id: 'defense', icon: 'shield', screen: 'defense-select', place: 'defense', color: '#6e64a8' },
    { id: 'training', icon: 'target', go: 'training', place: 'training', color: '#ffc21a' },
  ];
  M.MODES = MODES;
  // Lock lines: the short condition from G.Progress.unlockHint ('Opens after 1 more mission'), else the hub's.
  const hint = id => (G.Progress && G.Progress.unlockHint ? G.safe('unlockHint', () => G.Progress.unlockHint(id)) : null);
  M.placeLockText = function (id) { return hint(id) || (G.Hub && G.Hub.lockText ? G.Hub.lockText(id) : G.t('menu.locked')); };
  M.modeLockText = function (m) {
    const h = hint(m.id);
    if (h) return h;
    if (m.id === 'boss') return G.t('menu.g.bossLocked');
    return M.placeLockText(m.place);
  };
  M.startMode = function (m) {
    const id = typeof m === 'string' ? m : m.id;
    const def = typeof m === 'string' ? MODES.find(x => x.id === m) : m;
    if (!def) return;
    if (def.go) { if (G.Game.modes[def.go]) G.Game.go(def.go, def.params || {}); else M.openExternal('__none'); return; }
    M.openExternal(def.screen, { from: 'hub' });
    void id;
  };
  M.def('quickmenu', {
    build(p, close) {
      const Hub = G.Hub;
      const places = el('div.mm-qm-grid');
      const list = Hub ? Hub.BUILDINGS.concat([Hub.byId('fountain')]) : [];
      const order = ['fountain', 'guild', 'workshop', 'shop', 'cafe', 'gallery', 'training', 'hangar', 'arena', 'royale', 'defense'];
      list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      for (const b of list) {
        if (!b) continue;
        const open = Hub.isUnlocked(b.id);
        const col = '#' + b.color.toString(16).padStart(6, '0');
        const btn = el('button.mm-qm' + (open ? '' : '.locked'), { type: 'button', onclick: () => {
          if (!open) { M.toastNo(M.placeLockText(b.id)); return; }
          close();
          if (G.Game.modeId === 'hub' && Hub.travel(b.id)) setTimeout(() => Hub.open(b.id), 280);
          else Hub.open(b.id);
        } },
        el('div.mm-tile', { style: { '--tc': mixLight(col) }, html: I[M.placeIcon(b.id)] }),
        el('div', { style: { minWidth: 0 } }, el('b', { text: G.t(b.nameKey) }), el('small', { text: open ? G.t('menu.place.' + b.id) : M.placeLockText(b.id) })),
        open ? null : M.icon('lock'));
        places.appendChild(btn);
      }
      // Ranger Locker (your ranger, gloves, Beepo's hat, trail, skiff paint): always open, the tile shows the
      // ranger you wear. In Fizzport it walks you to the plaza cabinet and opens it there, like the other places
      // (20_hub Hub.travel('locker') / Hub.openLocker); elsewhere it opens over the map (closing comes back here).
      if (G.UI.defs.locker && !list.some(b => b && b.id === 'locker')) {
        const W = G.Wardrobe, e = W && W.equipped ? G.safe('qm locker', () => W.equipped()) : null;
        const por = e && G.Geo && G.Geo.rangerPortraitSVG ? G.safe('qm locker', () => G.Geo.rangerPortraitSVG(e.ranger, W.rangerColors())) : null;
        const goLocker = () => {
          if (G.Game.modeId === 'hub' && Hub && Hub.openLocker && Hub.travel && G.safe('qm locker travel', () => Hub.travel('locker'))) {
            close(); setTimeout(() => Hub.openLocker(), 280);
          } else G.UI.open('locker', { from: 'quickmenu' });
        };
        places.appendChild(el('button.mm-qm.mm-qm-locker', { type: 'button', onclick: goLocker },
          el('div.mm-tile', { style: { '--tc': '#e6f6ff' }, html: por || I.hat }),
          el('div', { style: { minWidth: 0 } }, el('b', { text: G.t('wr.locker') }), el('small', { text: G.t('wr.openD') })),
          M.icon('hat')));
      }
      const modes = el('div.mm-qm-grid');
      for (const m of MODES) {
        const open = G.Progress && G.Progress.isUnlocked ? !!G.Progress.isUnlocked(m.id) : Hub ? Hub.isUnlocked(m.place) : true;
        const avail = m.go ? !!G.Game.modes[m.go] : !!G.UI.defs[m.screen];
        const lockTxt = open ? '' : M.modeLockText(m);
        const btn = el('button.mm-qm' + (open ? '' : '.locked'), { type: 'button', onclick: () => {
          if (!open) { M.toastNo(lockTxt); return; }
          if (!avail) { M.openExternal('__none'); return; }
          close(); M.startMode(m);
        } },
        el('div.mm-tile', { style: { '--tc': mixLight(m.color) }, html: I[m.icon] }),
        el('div', { style: { minWidth: 0 } }, el('b', { text: G.t('menu.mode.' + m.id) }), el('small', { text: open ? G.t('menu.mode.' + m.id + 'D') : lockTxt })),
        open ? (avail ? M.icon('play') : null) : M.icon('lock'));
        modes.appendChild(btn);
      }
      const foot = el('div.mm-row.end', { style: { marginTop: '12px' } },
        G.UI.defs['preset-pick'] ? G.UI.btn('menu.controls', () => G.UI.open('preset-pick', { fromMenu: true }), 'small', { icon: I.target }) : null,
        G.UI.btn('menu.settings', () => G.UI.open('settings'), 'small', { icon: I.gear }),
        G.Game.modes.title ? G.UI.btn('menu.toTitle', () => { close(); G.Game.go('title'); }, 'small') : null);
      const body = [el('div.mm-sec', { text: G.t('menu.places') }), places, el('div.mm-sec', { text: G.t('menu.play'), style: { marginTop: '12px' } }), modes, foot];
      const panel = G.UI.panel('menu.map', close, body, { icon: I.pin, style: { maxWidth: '900px', background: '#fff6e0', borderWidth: '4px', borderRadius: '24px' } });
      panel.classList.add('mm-pop');
      return panel;
    },
  });

  // ================================================================== results (shared by every mode)
  // Recent progression events since the last mode switch (rank-ups, weapon level-ups, stickers).
  const recent = [];
  const recentQ = new Map();   // quest id -> latest value, for the results "quest progress strip" (GDD §13.5)
  G.bus.on('mode', id => { recent.length = 0; if (id !== 'hub') recentQ.clear(); });
  G.bus.on('mode-start', () => { recent.length = 0; recentQ.clear(); });
  G.bus.on('quest-progress', (id, v) => { if (id != null) recentQ.set(String(id), v); });
  G.bus.on('rank-up', pr => recent.push({ type: 'rank', pr }));
  G.bus.on('weapon-levelup', (id, lvl) => recent.push({ type: 'wlevel', id, lvl }));
  G.bus.on('sticker', id => recent.push({ type: 'sticker', id }));
  G.bus.on('guild-up', n => recent.push({ type: 'star', n }));
  M.recentEvents = () => recent.slice();
  M.questStrip = function () {
    const Q = G.Quests, out = [];
    if (!Q || !Q.progressOf) return out;
    let dailies = null;
    for (const id of recentQ.keys()) {
      if (out.length >= 3) break;
      const pr = G.safe('quest strip', () => Q.progressOf(id)); if (!pr || !pr.goal) continue;
      let title = '';
      if (id.startsWith('d:') || id.startsWith('w:')) { dailies = dailies || (Q.dailies ? Q.dailies().concat(Q.weeklies ? Q.weeklies() : []) : []); const v = dailies.find(x => x.id === id); title = v ? v.title : ''; }
      else { const d = G.Data && G.Data.QUESTS && G.Data.QUESTS[id]; title = d ? G.t(d.titleKey) : ''; }
      if (!title) continue;
      const done = pr.done || pr.value >= pr.goal;
      out.push(el('div.mm-qline' + (done ? '.done' : ''), M.icon(done ? 'check' : 'scroll'), el('span', { text: title }), M.bar(pr.frac, done ? 'gold' : ''), el('b', { text: G.i18n.num(Math.floor(pr.value)) + '/' + G.i18n.num(pr.goal) })));
    }
    return out;
  };

  // Normalise any rewards shape into display entries {kind, id, n, text, icon, rc, big}.
  M.rewardEntries = function (r) {
    const out = [];
    if (!r) return out;
    const push = (kind, id, n, extra) => { if (n == null || n === 0) return; out.push(Object.assign({ kind, id, n }, extra || {})); };
    const fromObj = o => {
      for (const k in o) {
        const v = o[k];
        if (v == null || v === 0 || v === false) continue;
        if (k === 'clinks' || k === 'bolts' || k === 'coins') push('clinks', 'clinks', v);
        else if (k === 'xp') push('xp', 'xp', v);
        else if (k === 'lumite') push('part', 'lumite', v);
        else if (k === 'stamps') push('stamps', 'stamps', v);
        else if (k === 'parts' && typeof v === 'object') for (const id in v) push('part', id, v[id]);
        else if ((k === 'weaponXP' || k === 'wxp' || k === 'weaponXp') && typeof v === 'object') for (const id in v) push('wxp', id, v[id]);
        else if (k === 'chest') push('chest', v === true ? 'gold' : v, o.chestRolls || 1);
        else if (k === 'loot' && Array.isArray(v) && v.length) push('chest', v[0] && v[0].table === 'boss' ? 'boss' : 'gold', v.reduce((a, l) => a + ((l && l.rolls) || 1), 0));
        else if ((k === 'items' || k === 'unlocks' || k === 'gear' || k === 'weapons' || k === 'mods' || k === 'blueprints') && Array.isArray(v)) for (const it of v) { if (typeof it === 'string') push(k === 'mods' || k === 'blueprints' ? 'mod' : k === 'weapons' ? 'weapon' : k === 'gear' ? 'gear' : M.inferKind(it), it, 1); else if (it && typeof it === 'object') fromEntry(it); }
        else if (k === 'stickers' && Array.isArray(v)) for (const id of v) push('sticker', id, 1);
        else if (k === 'sprockets' || k === 'sprocket') push('item', 'sprocket', v);
      }
    };
    const fromEntry = e => {
      if (typeof e === 'string') { out.push({ kind: 'text', text: G.i18n.has(e) ? G.t(e) : e, n: 1 }); return; }
      const type = e.type || e.kind || e.t || e.k;
      const n = e.n != null ? e.n : e.amount != null ? e.amount : e.value != null ? e.value : e.count != null ? e.count : e.qty != null ? e.qty : 1;
      const id = e.id || e.item || e.part || type;
      if (e.text || e.label) { out.push({ kind: type || 'text', id, n, text: e.text || e.label, icon: e.icon }); return; }
      switch (type) {
        case 'clinks': case 'bolts': case 'bolt': case 'coins': push('clinks', 'clinks', n); break;
        case 'xp': push('xp', 'xp', n); break;
        case 'lumite': push('part', 'lumite', n); break;
        case 'stamps': push('stamps', 'stamps', n); break;
        case 'part': case 'parts': if (e.parts) for (const pid in e.parts) push('part', pid, e.parts[pid]); else push('part', id, n); break;
        case 'wxp': case 'weaponXP': case 'weaponXp': push('wxp', id, n); break;
        case 'chest': push('chest', e.chest || e.id || 'gold', n); break;
        case 'rank': case 'rankup': case 'rank-up': recentExtra.push({ type: 'rank', pr: e.pr || e.n || e.value }); break;
        case 'level': case 'levelup': case 'weapon-levelup': recentExtra.push({ type: 'wlevel', id: e.id || e.weapon, lvl: e.lvl || e.level || e.n }); break;
        case 'sticker': push('sticker', id, 1); break;
        case 'weapon': case 'gear': case 'mod': case 'gadget': case 'item': case 'blueprint': push(type === 'blueprint' ? 'mod' : type, id, n); break;
        default: if (id && typeof id === 'string') push(M.inferKind(id), id, n); else fromObj(e);
      }
    };
    const recentExtra = [];
    if (Array.isArray(r)) for (const e of r) fromEntry(e); else if (typeof r === 'object') fromObj(r);
    // merge duplicates
    const merged = [];
    for (const e of out) {
      const m = merged.find(x => x.kind === e.kind && x.id === e.id && !x.text && !e.text && typeof e.n === 'number');
      if (m) m.n += e.n; else merged.push(e);
    }
    merged.extraEvents = recentExtra;
    return merged;
  };
  M.rewardChip = function (e, i) {
    let icon = I.gift, text = '', rc = null, big = false;
    const n = typeof e.n === 'number' ? Math.round(e.n) : e.n;
    switch (e.kind) {
      case 'clinks': icon = I.clinks; text = '+' + G.i18n.num(n); big = true; rc = '#ffb627'; break;
      case 'xp': icon = I.xp; text = G.t('res.xp', { n }); big = true; rc = '#8f6bff'; break;
      case 'stamps': icon = I.stamps; text = '+' + G.i18n.num(n); break;
      case 'part': icon = M.iconSvg('part', e.id); text = G.t('res.part', { name: e.id === 'lumite' ? G.t('menu.lumite') : M.name('part', e.id), n }); rc = M.rarityColor(e.id === 'lumite' ? 'epic' : M.rarity('part', e.id)); break;
      case 'wxp': icon = M.iconSvg('weapon', e.id); text = G.t('res.wxp', { name: M.name('weapon', e.id), n }); rc = '#2ec4b6'; break;
      case 'chest': icon = I.chest; text = (e.id === 'boss' ? G.t('res.chestBoss') : G.t('res.chest')) + (n > 1 ? ' ×' + n : ''); rc = '#ffc21a'; break;
      case 'sticker': icon = I.sticker; text = G.t('res.sticker'); rc = '#ff8fc0'; break;
      case 'text': icon = e.icon || I.sparkle; text = e.text; rc = e.rc || null; break;
      // bonuses paid on top of the mode's payout (G.Progress.runLedger): label + counted-up amount
      case 'rankbonus': case 'stickerbonus': {
        const c = el('div.mm-rchip.big.bonus', { style: { animationDelay: (e.at != null ? e.at : 0.75 + (i || 0) * 0.08).toFixed(2) + 's', '--rc': e.kind === 'rankbonus' ? '#ffb627' : '#ff8fc0' } },
          el('span.mm-ico', { html: e.kind === 'rankbonus' ? I.up : I.sticker }), el('span', { text: G.t(e.kind === 'rankbonus' ? 'res.rankBonus' : 'res.stickerBonus') }), el('span.mm-ico.sm', { html: I.clinks }), el('b', { text: '+' + G.i18n.num(n) }));
        c.dataset.count = n;
        return c;
      }
      default: icon = e.icon || M.iconSvg(e.kind, e.id); text = e.text || (G.t('res.item', { name: M.name(e.kind, e.id) }) + (n > 1 ? ' ×' + n : ''));
    }
    const c = el('div.mm-rchip' + (big ? '.big' : '') + (e.kind === 'part' ? '.part' : ''), { style: { animationDelay: (e.at != null ? e.at : 0.75 + (i || 0) * 0.08).toFixed(2) + 's', '--rc': rc || 'rgba(30,26,77,0.3)' }, title: text }, el('span.mm-ico', { html: icon }), el('span.mm-rt', { text }));
    // a short "×n" form for parts, used when a long reward list has to fit a phone's short screen: drawn by CSS from
    // data-short (never a second text node, which read "Circuit Chip ×1×1")
    if (e.kind === 'part' && typeof n === 'number') { c.dataset.short = '×' + G.i18n.num(n); c.setAttribute('aria-label', text); }
    if (e.kind === 'clinks' && typeof n === 'number') c.dataset.count = n;
    return c;
  };
  // Count a chip's number up from 0 (coin ticks). The chip's last child holds '+n'. Returns {finish()}.
  function countUp(node, to, delay, opts) {
    opts = opts || {};
    const b = node.lastChild; if (!b) return null;
    const t0 = performance.now() + delay * 1000, dur = opts.dur || 800;
    let lastTick = 0, done = false;
    const fmt = v => '+' + G.i18n.num(v);
    const step = now => {
      if (!node.isConnected || done) return;
      const k = U.clamp((now - t0) / dur, 0, 1);
      if (now >= t0) {
        const v = Math.round(to * (1 - Math.pow(1 - k, 3)));
        b.textContent = fmt(v);
        // (at least one tick even when a slow frame jumps straight to the total)
        if ((k < 1 || !lastTick) && now - lastTick > 90) { lastTick = now; M.sfx('coin', { pitch: (opts.pitch || 1) + k * 0.6, vol: 0.5 }); }
      }
      if (k < 1) requestAnimationFrame(step); else done = true;
    };
    b.textContent = '+0';
    requestAnimationFrame(step);
    return { finish() { if (!done) { done = true; b.textContent = fmt(to); } } };
  }
  function confetti(root, n) {
    if (G.Save.set.reducedMotion) n = Math.round(n * 0.25);
    const box = el('div.mm-confetti');
    const cols = ['#ff6b8b', '#ffd23f', '#3fe0b8', '#33b5ff', '#8f6bff', '#ffffff', '#ff8a1f'];
    for (let i = 0; i < n; i++) {
      const c = el('i');
      c.style.left = 'calc((100% - 14px) * ' + Math.random().toFixed(3) + ')';   // (starts inside the frame)
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = (2.2 + Math.random() * 2.4).toFixed(2) + 's';
      c.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
      c.style.setProperty('--dx', ((Math.random() - 0.5) * 220).toFixed(0) + 'px');
      c.style.setProperty('--rot', ((Math.random() - 0.5) * 1440).toFixed(0) + 'deg');
      if (i % 3 === 0) { c.style.borderRadius = '50%'; c.style.width = c.style.height = '10px'; }
      box.appendChild(c);
    }
    root.appendChild(box);
  }
  const MEDAL_COL = { S: '#ffc21a', A: '#ff8fc0', B: '#9fe8ff', C: '#d8dce8', platinum: '#e6f4ff', gold: '#ffc21a', silver: '#d8dce8', bronze: '#e0a070' };
  const starSvg = on => S('<path d="M32 4l8 16.4 18 2.4-13 12.6 3.2 17.8L32 44.6l-16.2 8.6L19 35.4 6 22.8l18-2.4z" fill="' + (on ? '#ffd23f' : '#ffffff') + '" fill-opacity="' + (on ? 1 : 0.55) + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' + (on ? '<path d="M24 20l4-2" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' : ''), '0 0 64 64');
  // "Go there" from the results screen (New in Fizzport! card): back to Fizzport at that place's door, then open
  // it (first-visit NPC intro included). u: an entry of G.Progress.newUnlocks().
  M.goThere = function (u) {
    if (!u || !u.go) return false;
    const open = () => {
      if (G.Game.modeId !== 'hub' || G.Game._switching || G.UI.anyOpen()) return;
      if (u.screen && G.UI.defs[u.screen]) G.UI.open(u.screen, Object.assign({ from: 'hub' }, u.params || {}));
      else if (G.Hub && G.Hub.open) G.Hub.open(u.go, u.params ? { params: u.params } : {});
    };
    if (G.Game.modeId === 'hub' && G.Hub && G.Hub.travel) { if (G.Hub.travel(u.go)) setTimeout(open, 280); else open(); return true; }
    const off = G.bus.on('mode', id => { off(); if (id === 'hub') setTimeout(open, 500); });
    G.Game.go(G.Game.modes.hub ? 'hub' : 'title', { at: u.go, quiet: true });
    return true;
  };
  // One card for everything that opened since it was last announced (G.Progress.newUnlocks), with a "Go there"
  // button per place. onAck: marks the list as announced (the results screen calls it once the card has shown).
  function newCard(list, close, at, onAck) {
    // (two places on a small phone, the rest as "+n more": three made each name wrap letter by letter)
    const shown = list.slice(0, document.documentElement.classList.contains('gw-tiny') ? 2 : 3);
    const items = shown.map(u => {
      const name = G.i18n.has(u.nameKey) ? G.t(u.nameKey) : u.id;
      const sub = u.subKey && G.i18n.has(u.subKey) ? G.t(u.subKey) : '';
      const kids = [el('div.mm-tile', { html: I[u.icon] || I.star, style: { '--tc': '#fff1c8' } }), el('div.mm-new-t', el('b', { text: name }), sub ? el('small', { text: sub }) : null)];
      if (!u.go) return el('div.mm-new-go.static', kids);
      kids.push(el('span.mm-go', el('span.mm-go-t', { text: G.t('res.goThere') }), el('b.mm-go-a', { text: '›' })));
      return el('button.mm-new-go', { type: 'button', 'aria-label': name + ' · ' + G.t('res.goThere'), onclick: () => { if (onAck) onAck(); close(); M.goThere(u); } }, kids);
    });
    if (list.length > shown.length) items.push(el('span.mm-new-more', { text: G.t('res.newMore', { n: list.length - shown.length }) }));
    return el('div.mm-new' + (shown.length >= 3 ? '.many' : ''), { style: { animationDelay: at.toFixed(2) + 's' } }, el('div.mm-new-h', M.icon('sparkle'), el('span', { text: G.t('res.newTitle') })), el('div.mm-new-list', items));
  }
  // Reveal timelines (seconds after the screen opens). p.fanfare === 'win' (G.Exp.finish: the 2.5 s win fanfare
  // starts with the screen): the three star chimes (major triad, sfx 'star' {n}) land on its beats — the I chord
  // (0.66), the tag (1.0) and the held chord (1.34) — the payout counts up under the held chord (1.45–2.25), and the
  // rank-up / unlock / quest chimes follow once the fanfare has rung out (2.55 →). Otherwise (the mode played its
  // stinger before the screen, or a loss) the reveal starts at once: stars 0.38–1.04, chips 0.75, count-up
  // 0.85–1.65, rank-up 1.75, level / sticker callouts 2.05, New in Fizzport! 2.45, quests 2.85, held toasts 3.4.
  const TL_NOW = { star0: 0.38, starGap: 0.33, chips: 0.75, count: 0.85, xp: 1.3, rank: 1.75, call: 2.05, news: 2.45, quest: 2.85, toast: 3.4 };
  const TL_FANFARE = { star0: 0.66, starGap: 0.34, chips: 1.1, count: 1.45, xp: 1.9, rank: 2.55, call: 2.85, news: 3.2, quest: 3.55, toast: 4.1 };
  M.revealTimeline = p => (p && p.fanfare === 'win' ? TL_FANFARE : TL_NOW);
  // The ranger you play as (Ranger Locker look), beside the title: a cheer hop on a win, a little wobble otherwise.
  function rangerBadge(win) {
    const W = G.Wardrobe, Geo = G.Geo;
    if (!W || !W.equipped || !Geo || !Geo.rangerPortraitSVG) return null;
    const e = G.safe('results ranger', () => W.equipped());
    const svg = e ? G.safe('results ranger', () => Geo.rangerPortraitSVG(e.ranger, W.rangerColors())) : null;
    if (!svg) return null;
    const name = W.rangerName ? W.rangerName(e.ranger) : '';
    return el('div.mm-res-ranger.' + (win ? 'cheer' : 'wobble'), { html: svg, role: 'img', 'aria-label': name, title: name });
  }
  M.def('results', {
    dim: false,
    escClose: false,
    build(p, close, entry) {
      const win = !!p.win;
      const stars = U.clamp(Math.round(p.stars || 0), 0, 3);
      // a rebuild (refresh) shows the final state: no second reveal, no repeated sounds or toasts
      const again = !!p._built; p._built = true;
      for (const tm of (p._timers || [])) clearTimeout(tm);
      const timers = entry.timers = p._timers = [];
      // Reveal clock: every timed step (stars, count-up, chimes, card, toasts) is armed together with the stinger
      // (p.playFanfare, from G.Exp.finish) on the first frame that draws the screen, which is also where the CSS
      // delays of the chips / callouts / card start counting. Building and laying out the screen (slow on a phone)
      // then cannot push the stars off the fanfare's beats. A rebuild arms at once, with no delays.
      const pend = [];
      let armed = false;
      const later = (sec, fn) => { if (armed) timers.push(setTimeout(fn, again ? 0 : sec * 1000)); else pend.push(again ? 0 : sec, fn); };
      const arm = () => {
        if (armed || !G.UI.stack.includes(entry)) return;
        armed = true;
        if (p.playFanfare && p.fanfare && !again && G.Audio) G.safe('results fanfare', () => G.Audio.sfx(p.fanfare === 'win' ? 'win' : 'lose'));
        for (let k = 0; k < pend.length; k += 2) timers.push(setTimeout(pend[k + 1], pend[k] * 1000));
        pend.length = 0;
      };
      const reveal = p.reveal || null, heldSfx = new Set(reveal ? reveal.sfx : []);
      const TL = M.revealTimeline(p);
      const chime = (sec, name, cond) => { if (!again && cond) later(sec, () => { if (!root.classList.contains('skip')) M.sfx(name); }); };
      const root = el('div.mm-res.' + (win ? 'win' : 'lose') + (again ? '.skip' : ''));
      // banner
      let title = p.title;
      if (!title) {
        if (p.place != null) title = G.t('res.place', { n: p.place });
        else if (win) title = G.t(['expedition', 'boss', 'defense', 'mission'].includes(p.mode) ? 'res.clear' : 'res.win');
        else title = G.t('res.lose');
      }
      const modeName = p.subtitle || (p.mode && G.i18n.has('menu.mode.' + p.mode) ? G.t('menu.mode.' + p.mode) : '');
      const ranger = rangerBadge(win);
      if (ranger && !again) ranger.style.animationDelay = (win ? TL.star0 : 0.5).toFixed(2) + 's';   // hops with the first star
      const hd = el('div.mm-res-hd', el('div.mm-res-title', { text: title }), modeName ? el('div.mm-res-sub', { text: modeName }) : null);
      const top = el('div.mm-res-top', ranger ? el('div.mm-res-id', ranger, hd) : hd);
      root.appendChild(top);
      document.body.classList.add('mm-res-open');
      // stars + medal
      const sRow = el('div.mm-stars');
      const starEls = [];
      for (let i = 0; i < 3; i++) {
        const s = el('div.mm-star' + (i === 1 ? '.mid' : ''), { html: starSvg(i < stars) });
        starEls.push(s); sRow.appendChild(s);
      }
      if (p.medal) {
        const m = String(p.medal);
        // a single letter is ambiguous (Expedition grade "S" vs Boss Hunt "S"ilver): prefer the full medal name
        // from the mode result when there is one
        const full = p.result && typeof p.result.medal === 'string' && MEDAL_COL[p.result.medal.toLowerCase()] ? p.result.medal.toLowerCase() : null;
        const col = (full && MEDAL_COL[full]) || (m.length > 2 && MEDAL_COL[m.toLowerCase()]) || MEDAL_COL[m.toUpperCase()] || '#ffd23f';
        sRow.appendChild(el('div.mm-medal', { style: { background: col }, text: m.length <= 2 ? m.toUpperCase() : m.charAt(0).toUpperCase() }));
      }
      top.appendChild(sRow);
      starEls.forEach((s, i) => later(TL.star0 + i * TL.starGap, () => {
        s.classList.add(i < stars ? 'on' : 'off');
        // star chimes climb the major triad (09_audio 'star' {n: 1..3}), on the fanfare's beats when it plays
        if (i < stars && !again && !root.classList.contains('skip')) M.sfx('star', { n: i + 1 });
        // settle to the final pose even if the animation never got a frame (slow devices)
        timers.push(setTimeout(() => { s.style.animation = 'none'; s.style.transform = 'none'; }, 900));
      }));
      // stats + rewards
      const panel = el('div.mm-res-panel');
      const statCol = el('div.mm-res-col.stats', el('div.mm-res-h', { text: G.t('res.stats') }));
      (p.stats || []).slice(0, 10).forEach((s, i) => {
        const last = String(s.key || '').split('.').pop();
        const label = s.label || (G.i18n.has(s.key) ? G.t(s.key) : G.i18n.has('res.s.' + last) ? G.t('res.s.' + last) : pretty(last));
        const val = typeof s.value === 'number' ? G.i18n.num(s.value) : String(s.value != null ? s.value : '');
        // long label + value pairs (track names, podium lines) take the full width in the 2-column layout
        let w = 0; for (const ch of label + val) w += /[\u2E80-\uFFEF]/.test(ch) ? 2 : 1;
        statCol.appendChild(el('div.mm-statrow' + (w > 19 ? '.wide' : ''), { style: { animationDelay: (0.35 + i * 0.07).toFixed(2) + 's' } }, el('span', { text: label }), el('b', { text: val })));
      });
      if (!(p.stats || []).length) statCol.appendChild(el('div.mm-note', { text: G.t('res.noRewards') }));
      const entries = M.rewardEntries(p.rewards);
      // everything else paid during this match (rank-up bonuses, sticker rewards, milestones): the wallet
      // change on this screen adds up
      const bonus = p._bonus || (p._bonus = (G.Progress && G.Progress.runLedger ? G.Progress.runLedger().bonus : []));
      let rankClinks = 0, stickerClinks = 0;
      const extra = [];
      for (const l of bonus) {
        if (l.type === 'clinks' && l.src === 'rank') rankClinks += l.n || 0;
        else if (l.type === 'clinks' && l.src === 'sticker') stickerClinks += l.n || 0;
        else extra.push(l);
      }
      const extraEntries = M.rewardEntries(extra);
      const rewCol = el('div.mm-res-col', el('div.mm-res-h', { text: G.t('res.rewards') }));
      const chips = el('div.mm-rewards');
      let ci = 0;
      // payout chips pop in from TL.chips (a chip's own `at` wins)
      const atChip = (e, i) => (e.at != null ? e : Object.assign({}, e, { at: TL.chips + i * 0.08 }));
      for (const e of entries) {
        chips.appendChild(M.rewardChip(atChip(e, ci), ci++));
        // the bonus chips follow the clinks chip, counted up right after it
        if (e.kind === 'clinks' && (rankClinks || stickerClinks)) {
          if (rankClinks) chips.appendChild(M.rewardChip({ kind: 'rankbonus', n: rankClinks, at: TL.rank }, ci++));
          if (stickerClinks) chips.appendChild(M.rewardChip({ kind: 'stickerbonus', n: stickerClinks, at: TL.call }, ci++));
          rankClinks = stickerClinks = -1;
        }
      }
      if (rankClinks > 0) chips.appendChild(M.rewardChip({ kind: 'rankbonus', n: rankClinks, at: TL.rank }, ci++));
      if (stickerClinks > 0) chips.appendChild(M.rewardChip({ kind: 'stickerbonus', n: stickerClinks, at: TL.call }, ci++));
      for (const e of extraEntries) chips.appendChild(M.rewardChip(Object.assign({ at: TL.rank + 0.1 }, e), ci++));
      // mode awards (e.g. Goo Turf "Top painter"): list of i18n keys, shown as gold trophy chips
      const awards = (Array.isArray(p.medals) ? p.medals : []).filter(k => typeof k === 'string').slice(0, 3);
      awards.forEach(k => chips.appendChild(M.rewardChip({ kind: 'text', text: G.i18n.has(k) ? G.t(k) : k, icon: I.trophy, rc: '#ffc21a', at: TL.chips + ci * 0.08 }, ci++)));
      if (!ci) chips.appendChild(el('div.mm-note', { text: G.t('res.noRewards') }));
      if (chips.querySelectorAll('.mm-rchip').length > 6) chips.classList.add('many');
      if (chips.querySelector('.mm-rchip.bonus')) rewCol.classList.add('has-bonus');
      rewCol.appendChild(chips);
      // rank / level callouts
      const evs0 = M.recentEvents().concat(entries.extraEvents || []);
      // keep only the highest rank / star and the highest level per weapon
      const best = {};
      for (const ev of evs0) {
        const key = ev.type === 'wlevel' ? 'w:' + ev.id : ev.type === 'sticker' ? 's:' + ev.id : ev.type;
        const v = ev.pr || ev.lvl || ev.n || 0;
        if (!best[key] || v > (best[key].pr || best[key].lvl || best[key].n || 0)) best[key] = ev;
      }
      const evs = Object.keys(best).map(k => best[k]).slice(0, 4);
      let hasRank = false, hasLevel = false, hasSticker = false;
      // (one group: a column on big screens; on a phone short callouts share a row, so the XP line stays in view)
      const calls = el('div.mm-calls');
      for (const ev of evs) {
        const at = ev.type === 'rank' ? TL.rank : TL.call;
        const st = { style: { animationDelay: at.toFixed(2) + 's' } };
        if (ev.type === 'rank' && ev.pr) { hasRank = true; calls.appendChild(el('div.mm-callout.gold.rank', st, M.icon('up'), el('span', { text: G.t('res.rankup', { n: ev.pr }) }))); }
        else if (ev.type === 'wlevel' && ev.id) { hasLevel = true; calls.appendChild(el('div.mm-callout', st, el('span.mm-ico', { html: M.iconSvg('weapon', ev.id) }), el('span', { text: G.t('res.levelup', { name: M.name('weapon', ev.id), n: ev.lvl || 2 }) }))); }
        else if (ev.type === 'star' && ev.n) { hasSticker = true; calls.appendChild(el('div.mm-callout.gold', st, M.icon('star'), el('span', { text: G.t('res.newStar', { n: ev.n }) }))); }
        else if (ev.type === 'sticker') { hasSticker = true; calls.appendChild(el('div.mm-callout', st, M.icon('sticker'), el('span', { text: ev.id && G.i18n.has('sticker.' + ev.id + '.name') ? G.t('res.stickerName', { name: G.t('sticker.' + ev.id + '.name') }) : G.t('res.sticker') }))); }
      }
      if (calls.firstChild) rewCol.appendChild(calls);
      // player rank XP line
      const rk = M.rank();
      const xpGain = entries.filter(e => e.kind === 'xp').reduce((a, e) => a + (e.n || 0), 0);
      const xpLine = el('div.mm-xpline', el('span.mm-ico', { html: I.xp }), el('span', { text: G.t('hub.pr', { n: rk.pr }) }), M.bar(0, 'xp'));
      const xpBar = xpLine.querySelector('.mm-bar > i');
      let fromFrac = 0;
      if (rk.need && xpGain && rk.xp >= xpGain) fromFrac = (rk.xp - xpGain) / rk.need;
      xpBar.style.transition = 'none'; xpBar.style.width = (fromFrac * 100).toFixed(1) + '%';
      later(TL.xp, () => { xpBar.style.transition = ''; xpBar.style.width = (rk.frac * 100).toFixed(1) + '%'; });
      rewCol.appendChild(xpLine);
      // quest progress strip: quests that moved during this match
      const qrows = M.questStrip();
      if (qrows.length) { for (const q of qrows) q.style.animationDelay = TL.quest + 's'; rewCol.appendChild(el('div.mm-qstrip', qrows)); }
      panel.append(statCol, rewCol);
      root.appendChild(panel);
      // New in Fizzport! (a rebuild keeps the same list). Acknowledged once the card has really been on screen: its
      // reveal time, a skip tap, a Go there or a rebuild. Leaving (or reloading) before that leaves the places new,
      // so the hub or the next results screen still announces them; once shown, nothing announces them again.
      let news = p._news;
      if (!news) news = p._news = G.Progress && G.Progress.newUnlocks ? G.Progress.newUnlocks() : [];
      const ackNews = () => { if (p._newsAck || !news.length) return; p._newsAck = true; if (G.Progress && G.Progress.ackUnlocks) G.safe('ack unlocks', () => G.Progress.ackUnlocks(news.map(u => u.id))); };
      if (news.length) {
        root.appendChild(newCard(news, close, TL.news, ackNews));
        if (again) ackNews(); else later(TL.news + 0.35, ackNews);
      }
      // tip on a loss (or provided)
      const tipKey = p.tip ? null : 'res.tip' + (1 + Math.floor(Math.random() * 8));
      if (!win || p.tip) root.appendChild(el('div.mm-res-tip', { text: p.tip ? (G.i18n.has(p.tip) ? G.t(p.tip) : p.tip) : G.t(tipKey) }));
      // buttons (each leaves the screen once: a second tap lands on the closing copy, which is inert)
      const retry = p.onRetry || p.retry || p.replay;
      let left = false;
      const leave = fn => () => { if (left) return; left = true; close(); fn(); };
      const cont = leave(() => {
        if (p.onContinue) G.safe('results continue', () => p.onContinue());
        else G.Game.go(G.Game.modes.hub ? 'hub' : 'title', { at: G.Hub && G.Hub._state ? G.Hub._state.lastBuilding : null });
      });
      const next = typeof p.onNext === 'function' ? p.onNext : null;
      root.appendChild(el('div.mm-res-btns',
        retry ? G.UI.btn('res.retry', leave(() => G.safe('results retry', () => retry())), 'cool big', { icon: I.retry }) : null,
        next ? G.UI.btn(p.nextLabel && G.i18n.has(p.nextLabel) ? p.nextLabel : 'res.next', leave(() => G.safe('results next', () => next())), 'go big', { icon: I.rocket }) : null,
        G.UI.btn('res.continue', cont, 'primary big', { icon: I.play })));
      if (win && !again) confetti(root, 70);
      // counters: the payout first, then the bonuses on top of it
      const counters = [];
      root.querySelectorAll('.mm-rchip[data-count]').forEach(c => {
        const b = c.classList.contains('bonus');
        if (again) { c.lastChild.textContent = '+' + G.i18n.num(+c.dataset.count); return; }
        c.lastChild.textContent = '+0';
        // (started on the reveal clock; a skip tap before that finishes it at once)
        later(0, () => { const cu = countUp(c, +c.dataset.count, b ? parseFloat(c.style.animationDelay) || TL.rank : TL.count, b ? { dur: 700, pitch: 1.3 } : null); if (cu && root.classList.contains('skip')) cu.finish(); counters.push(cu); });
      });
      // progression chimes, in step with their rows (only sounds G.Progress held back while paying out)
      chime(TL.rank, 'rankup', hasRank && heldSfx.has('rankup'));
      chime(TL.call, 'levelup', hasLevel && heldSfx.has('levelup'));
      chime(TL.call + 0.12, 'unlock', hasSticker && heldSfx.has('unlock'));
      chime(TL.news, 'unlock', news.length > 0);
      chime(TL.quest, 'questDone', heldSfx.has('questDone'));
      // toasts held while paying out (quest complete, stickers...) and toasts other modules hand to this screen while it
      // reveals (M.heldToast: e.g. the wardrobe's "Now wearing" after a rank-up) appear once the reveal is over
      const held = p._held || (p._held = []);
      const flushToasts = () => {
        p._toastsDone = true;
        if (reveal) { for (const tt of reveal.toasts) G.UI.toast(tt[0], tt[1]); reveal.toasts.length = 0; }
        for (const tt of held) G.UI.toast(tt[0], tt[1]);
        held.length = 0;
      };
      if (again) flushToasts(); else later(TL.toast, flushToasts);
      // any tap skips animations (and the remaining chimes); numbers jump to their totals
      root.addEventListener('pointerdown', ev => {
        if (ev.target.closest('button')) return;
        root.classList.add('skip');
        starEls.forEach((s, i) => s.classList.add(i < stars ? 'on' : 'off'));
        for (const c of counters) if (c) c.finish();
        xpBar.style.transition = ''; xpBar.style.width = (rk.frac * 100).toFixed(1) + '%';
        ackNews();   // (the skip shows the card at once)
      });
      if (G.Audio && !p.noMusic && !again) { G.Audio.music('results'); }
      // arm the reveal: a rebuild now (it is already on screen); a new screen on its first frame (a hidden tab
      // never draws one: the timer stands in)
      if (again) Promise.resolve().then(arm);
      else { requestAnimationFrame(arm); timers.push(setTimeout(arm, 400)); }
      return root;
    },
    onClose(params) {
      for (const tm of (params && params._timers) || []) clearTimeout(tm);
      // toasts still held for this screen are not lost
      const r = params && params.reveal;
      if (r && r.toasts && r.toasts.length) { for (const tt of r.toasts) G.UI.toast(tt[0], tt[1]); r.toasts.length = 0; }
      const hq = params && params._held;
      if (hq && hq.length) { for (const tt of hq) G.UI.toast(tt[0], tt[1]); hq.length = 0; }
      if (params) params._toastsDone = true;
      // the in-match HUD stays hidden behind results; restore it unless another results screen is still up
      if (!G.UI.isOpen('results')) document.body.classList.remove('mm-res-open');
    },
  });
  // A toast that would land in the middle of a results reveal (stars, count-up, chimes) waits for the end of it with
  // the screen's own held toasts. Returns false when no results screen is revealing (show it yourself).
  M.heldToast = function (text, opts) {
    for (let i = G.UI.stack.length - 1; i >= 0; i--) {
      const s = G.UI.stack[i];
      if (s.id !== 'results') continue;
      const p = s.params || {};
      if (p._toastsDone) return false;
      (p._held || (p._held = [])).push([text, opts]);
      return true;
    }
    return false;
  };
  // Safety: a mode switch always clears the results HUD mask.
  G.bus.on('mode', () => { if (!G.UI.isOpen('results')) document.body.classList.remove('mm-res-open'); });

  // Loadout shortcut (opens the workshop on its loadout tab; defined in 30b).
  M.openLoadout = params => { if (G.UI.defs.workshop) G.UI.open('workshop', Object.assign({ tab: 'load' }, params || {})); };
})(window.G);

}).call(window); } catch (e) { console.error('[module 30_menus.js]', e); }
// ---- 30b_menus_town.js
try { (function () {
// 30b_menus_town.js — Fizzport building screens (G.UI.def):
//   guild (Quill: quests, dailies/weeklies, claim, mission + boss board, stamp exchange)
//   workshop (Gizma: fabricate, upgrade/tune-up + gear polish, mods, loadout) + 'loadout' alias
//   shop (Penny Pop: weapons, supplies + refill, parts, sell)
//   cafe (Bloop: daily treat track, boosters, dailies summary)
//   gallery (Lumi: stickers, codex, sprockets, stats, Ranger Locker) + 'locker' alias (opens the Ranger Locker tab)
//   hangar (Ace), arena (Tick & Tock), royale (Captain Gale), fountain (Mission Board / Fountain
//   Guard), training-gate (Coach Ping).
// Everything reads G.Data / G.Progress / G.Quests / G.Stickers (13–14) and degrades gracefully.
(function (G) {
  'use strict';
  const el = (...a) => G.Menus.el(...a);
  const U = G.util;
  const M = G.Menus, I = M.ICONS;

  G.i18n.add('en', {
    'menu.g.title': 'Guild Hall', 'menu.g.role': 'Guild master', 'menu.g.active': 'Active', 'menu.g.available': 'Available', 'menu.g.daily': 'Daily & Weekly', 'menu.g.claim': 'Claim', 'menu.g.board': 'Board',
    'menu.g.say': 'Every finished quest gets a stamp. Tap Claim to collect!', 'menu.g.sayClaim': 'Rewards are ready! Claim them before Mox notices!',
    'menu.g.missions': 'Missions', 'menu.g.missionsD': 'Pick an island expedition', 'menu.g.boss': 'Boss Hunt', 'menu.g.bossD': 'Rematch the big bosses', 'menu.g.bossLocked': 'Defeat a boss in the story first',
    'menu.g.accept': 'Accept', 'menu.g.claimBtn': 'Claim!', 'menu.g.tracking': 'Tracking', 'menu.g.claimed': 'Done', 'menu.g.key': 'Key', 'menu.g.promo': 'Promotion', 'menu.g.locked': 'Locked',
    'menu.g.rank': 'Guild Rank ★{n}', 'menu.g.keys': 'Key quests {a}/{b}', 'menu.g.promoReady': 'Promotion quest open!', 'menu.g.needPr': 'Promotion needs Player Rank {n}',
    'menu.g.noActive': 'No active quests. Check the Available tab!', 'menu.g.noAvail': 'No new quests right now. Rank up for more!', 'menu.g.noClaim': 'Nothing to claim yet. Keep going!',
    'menu.g.dailies': 'Daily quests', 'menu.g.weeklies': 'Weekly challenges', 'menu.g.dailyLocked': 'Daily quests open at Player Rank 3.', 'menu.g.weeklyLocked': 'Weekly challenges open at Player Rank 12.',
    'menu.g.reroll': 'Swap', 'menu.g.rerolls': 'Free swaps: {n}', 'menu.g.crate': 'Finish all 3 for a Daily Crate!', 'menu.g.stampEx': 'Stamp exchange', 'menu.g.stampExD': '60 Guild Stamps → 1 Lumite (3 per week)', 'menu.g.exchange': 'Exchange',
    'menu.w.title': 'Workshop', 'menu.w.role': 'Smith', 'menu.w.fab': 'Fabricate', 'menu.w.up': 'Upgrade', 'menu.w.mods': 'Mods', 'menu.w.load': 'Loadout',
    'menu.w.say': 'Parts in, wonders out. What are we building today?', 'menu.w.sayUp': 'Use a weapon to level it up. Lumite buys Tune-Ups.', 'menu.w.sayMods': 'Mods snap in and out for free. Mix and match!', 'menu.w.sayLoad': 'Pick four favourites, a gadget and your gear.',
    'menu.w.all': 'All', 'menu.w.weapons': 'Weapons', 'menu.w.gear': 'Gear', 'menu.w.gadgets': 'Gadgets', 'menu.w.modsF': 'Mods', 'menu.w.items': 'Items',
    'menu.w.craft': 'Craft', 'menu.w.crafted': 'Crafted!', 'menu.w.firstXp': 'First craft: +{n} XP', 'menu.w.pin': 'Pin', 'menu.w.pinned': 'Pinned', 'menu.w.tapClose': 'Tap to continue',
    'menu.w.lvl': 'W{n}', 'menu.w.xp': '{a}/{b} XP', 'menu.w.maxed': 'MAX level!', 'menu.w.tune': 'Tune-Ups', 'menu.w.tuneNeed': 'Needs W{n}', 'menu.w.gearPolish': 'Gear polish', 'menu.w.polish': 'Polish',
    'menu.w.polishKits': 'Polish Kits: {n}', 'menu.w.gearLv': 'L{n}', 'menu.w.noGear': 'Craft gear in Fabricate to polish it here.',
    'menu.w.slots': 'Mod slots', 'menu.w.ownedMods': 'Your mods', 'menu.w.noMods': 'No mods yet. Forge them in Fabricate (Mod Bench opens at Player Rank 5).', 'menu.w.slotLocked': 'Opens at W{n}', 'menu.w.tapMod': 'Tap a mod to snap it in. Tap a slot to remove.',
    'menu.w.fits': 'Fits', 'menu.w.noFit': 'Doesn\'t fit', 'menu.w.inUse': 'On {name}',
    'menu.w.favs': 'Favourite weapons', 'menu.w.pickSlot': 'Pick a slot, then tap a weapon.', 'menu.w.gadget': 'Gadget', 'menu.w.gearSlots': 'Gear', 'menu.w.statsPrev': 'Your stats', 'menu.w.none': 'Empty', 'menu.w.noGadget': 'Finish "Welcome to Fizzport" to get Beepo Scan.',
    'menu.w.st.hp': 'Max HP', 'menu.w.st.shield': 'Shield', 'menu.w.st.jump': 'Jump', 'menu.w.st.speed': 'Speed', 'menu.w.st.magnet': 'Magnet', 'menu.w.st.dash': 'Dashes',
    'menu.s.title': 'Pop Shop', 'menu.s.role': 'Shopkeeper', 'menu.s.weapons': 'Weapons', 'menu.s.supplies': 'Supplies', 'menu.s.parts': 'Parts', 'menu.s.sell': 'Sell',
    'menu.s.say': 'Everything\'s poppin\' today! What catches your eye?', 'menu.s.saySell': 'I\'ll take those extra parts off your hands!', 'menu.s.buy': 'Buy', 'menu.s.left': '{n} left today', 'menu.s.leftW': '{n} left this week',
    'menu.s.refill': 'Refill All Ammo', 'menu.s.refillD': 'Top up every weapon before your next mission.', 'menu.s.refillBtn': 'Refill', 'menu.s.full': 'Ammo is full!', 'menu.s.sell1': 'Sell 1', 'menu.s.sellAll': 'Sell all',
    'menu.s.each': '{n} each', 'menu.s.noParts': 'No parts to sell. Pop some bots!', 'menu.s.carry': 'Carrying {n}/{m}',
    'menu.c.title': 'Fizz Café', 'menu.c.role': 'Barista', 'menu.c.treat': 'Daily treat', 'menu.c.boost': 'Boosters', 'menu.c.dailies': 'Dailies',
    'menu.c.say': '...oh, hi... your treat is warm and ready...', 'menu.c.sayDone': '...that was today\'s treat... the next one will wait for you, no hurry...', 'menu.c.day': 'Day {n}', 'menu.c.today': 'Today',
    'menu.c.grab': 'Grab today\'s treat!', 'menu.c.tomorrow': 'All done for today!', 'menu.c.treatNote': 'One treat per day you play. Skipping days never resets your track, so there\'s no rush!',
    'menu.c.active': 'Active: {n} matches left', 'menu.c.boostNote': 'Boosters last for your next 3 matches. One of each at a time.',
    'menu.c.dailyNote': 'Claim finished dailies at the Guild Hall.', 'menu.c.toGuild': 'Go to Guild Hall',
    'menu.c.t1': '200 Clinks', 'menu.c.t2': '3 random parts', 'menu.c.t3': '300 Clinks', 'menu.c.t4': 'Polish Kit', 'menu.c.t5': '400 Clinks', 'menu.c.t6': '1 Lumite', 'menu.c.t7': 'Gold chest',
    'menu.ga.title': 'Gallery', 'menu.ga.role': 'Curator', 'menu.ga.stickers': 'Stickers', 'menu.ga.codex': 'Codex', 'menu.ga.sprockets': 'Sprockets', 'menu.ga.stats': 'Stats',
    'menu.ga.say': 'Each sticker tells a story. Which one will you earn next?', 'menu.ga.sayCodex': 'Pop a robot to add it to the Codex. Pop more to learn its secrets.',
    'menu.ga.discover': 'Pop one to discover it!', 'menu.ga.count': '{a}/{b} stickers', 'menu.ga.unknown': '???', 'menu.ga.pops': 'Popped: {n}', 'menu.ga.tier': 'Tier {n}', 'menu.ga.drops': 'Drops', 'menu.ga.next': 'Next research at {n} pops',
    'menu.ga.sprCount': '{a}/{b} Star Sprockets', 'menu.ga.milestone': 'At {n}', 'menu.ga.reward': 'Reward: {r}', 'menu.ga.bosses': 'Bosses',
    'menu.ga.s.pops': 'Bots popped', 'menu.ga.s.elites': 'Elites popped', 'menu.ga.s.crates': 'Crates broken', 'menu.ga.s.crafts': 'Items crafted', 'menu.ga.s.matches': 'Matches played', 'menu.ga.s.clinks': 'Clinks earned',
    'menu.ga.s.turf': 'Goo Turf wins', 'menu.ga.s.races': 'Races played', 'menu.ga.s.raceWins': 'Race wins', 'menu.ga.s.royale': 'Royale wins', 'menu.ga.s.wave': 'Best Fountain Guard wave', 'menu.ga.s.days': 'Days played', 'menu.ga.s.stickers': 'Stickers', 'menu.ga.s.sprockets': 'Star Sprockets', 'menu.ga.s.pr': 'Player Rank',
    'menu.h.title': 'Hangar', 'menu.h.role': 'Star pilot', 'menu.h.race': 'Race!', 'menu.h.raceD': 'Star Skiff Rally: 8 skiffs, asteroid rings, boost pads.', 'menu.h.ship': 'Ship upgrades', 'menu.h.records': 'Track medals',
    'menu.h.say': 'My skiff is fueled and ready. Are you?', 'menu.h.up': 'Upgrade', 'menu.h.noMedal': 'No medal yet', 'menu.h.lv': 'Lv {n}/{m}',
    'menu.a.title': 'Arena Gate', 'menu.a.role': 'Goo Turf referees', 'menu.a.play': 'Goo Turf', 'menu.a.playD': '4 vs 4 painting battle. Most turf wins!', 'menu.a.say': 'SQUAWK! Grab a goo blaster and paint everything!',
    'menu.a.how1': 'Paint the floor in your team\'s goo', 'menu.a.how2': 'Dive into your goo to swim and refill', 'menu.a.how3': 'Most turf when time runs out wins', 'menu.a.wins': 'Wins', 'menu.a.played': 'Played', 'menu.a.best': 'Best paint',
    'menu.r.title': 'Royale Tower', 'menu.r.role': 'Airship captain', 'menu.r.play': 'Sky Drop Royale', 'menu.r.playD': 'You vs 15 friendly bots. Drop in and be the last one standing!', 'menu.r.say': 'All aboard the Sky Drop! The clouds are perfect for jumping!',
    'menu.r.how1': 'Jump from the airship and glide down', 'menu.r.how2': 'Grab weapons, shields and heals', 'menu.r.how3': 'Stay inside the shrinking ring', 'menu.r.best': 'Best place', 'menu.r.wins': 'Wins', 'menu.r.played': 'Played',
    'menu.f.title': 'Mission Board', 'menu.f.role': 'Your robot buddy', 'menu.f.say': 'Beep! Where should we go today?', 'menu.f.missions': 'Missions', 'menu.f.missionsD': 'Explore islands, pop bots, grab parts and extract!',
    'menu.f.guard': 'Fountain Guard', 'menu.f.guardD': 'Protect the Fizz Core from waves of robot raiders.', 'menu.f.boss': 'Boss Hunt', 'menu.f.bossD': 'Rematch big bosses for rare parts.', 'menu.f.bestWave': 'Best wave: {n}',
    'menu.t.title': 'Training Range', 'menu.t.role': 'Coach', 'menu.t.say': 'TWEET! Warm-ups make champions!', 'menu.t.enter': 'Enter the Range', 'menu.t.enterD': 'Targets, time trials and the Pop-Up Challenge.',
    'menu.t.tutorial': 'Replay tutorial', 'menu.t.tutorialD': 'Learn the basics again with Beepo.', 'menu.t.medals': 'Medals', 'menu.t.popup': 'Pop-Up best: {n}', 'menu.t.noMedal': '—',
    'menu.t.hop': 'Hop Hop Hooray', 'menu.t.slide': 'Slide Rider', 'menu.t.grapple': 'Grapple Glide',
    'menu.tryIt': 'Try It', 'menu.w.getParts': 'Get parts',
  });
  G.i18n.add('ja', {
    'menu.g.title': 'ギルドホール', 'menu.g.role': 'ギルドマスター', 'menu.g.active': 'しんこう中', 'menu.g.available': 'うけられる', 'menu.g.daily': 'デイリー＆ウィークリー', 'menu.g.claim': 'うけとる', 'menu.g.board': 'ボード',
    'menu.g.say': 'おわったクエストには スタンプをおすよ。「うけとる」で ほうびを もらってね！', 'menu.g.sayClaim': 'ほうびの じゅんびが できてるよ！ モックスに 見つかるまえに どうぞ！',
    'menu.g.missions': 'ミッション', 'menu.g.missionsD': '島のたんけんを えらぼう', 'menu.g.boss': 'ボスハント', 'menu.g.bossD': '大ボスと リベンジマッチ', 'menu.g.bossLocked': 'まずは ストーリーで ボスをたおそう',
    'menu.g.accept': 'うける', 'menu.g.claimBtn': 'うけとる！', 'menu.g.tracking': 'しんこう中', 'menu.g.claimed': 'かんりょう', 'menu.g.key': 'キー', 'menu.g.promo': 'しょうしん', 'menu.g.locked': 'ロック中',
    'menu.g.rank': 'ギルドランク★{n}', 'menu.g.keys': 'キークエスト {a}/{b}', 'menu.g.promoReady': 'しょうしんクエストが ひらいたよ！', 'menu.g.needPr': 'しょうしんには プレイヤーランク{n}が ひつよう',
    'menu.g.noActive': 'しんこう中のクエストは ないよ。「うけられる」を 見てみよう！', 'menu.g.noAvail': 'いまは 新しいクエストが ないよ。ランクを上げよう！', 'menu.g.noClaim': 'まだ うけとれるものは ないよ。がんばろう！',
    'menu.g.dailies': 'デイリークエスト', 'menu.g.weeklies': 'ウィークリーチャレンジ', 'menu.g.dailyLocked': 'デイリークエストは プレイヤーランク3で ひらくよ。', 'menu.g.weeklyLocked': 'ウィークリーは プレイヤーランク12で ひらくよ。',
    'menu.g.reroll': 'いれかえ', 'menu.g.rerolls': 'むりょう いれかえ：{n}', 'menu.g.crate': '3つ ぜんぶで デイリーボックス！', 'menu.g.stampEx': 'スタンプこうかん', 'menu.g.stampExD': 'ギルドスタンプ60 → ルマイト1（週3回まで）', 'menu.g.exchange': 'こうかん',
    'menu.w.title': 'ワークショップ', 'menu.w.role': 'かじや', 'menu.w.fab': 'クラフト', 'menu.w.up': 'きょうか', 'menu.w.mods': 'MOD', 'menu.w.load': 'そうび',
    'menu.w.say': 'パーツを入れれば すごいものが出てくる。きょうは なにを作る？', 'menu.w.sayUp': 'ぶきは つかうと レベルアップ。ルマイトで チューンナップできるよ。', 'menu.w.sayMods': 'MODは むりょうで つけかえ じゆう。いろいろ ためしてね！', 'menu.w.sayLoad': 'お気に入りの ぶき4つ、ガジェット、ギアを えらぼう。',
    'menu.w.all': 'すべて', 'menu.w.weapons': 'ぶき', 'menu.w.gear': 'ギア', 'menu.w.gadgets': 'ガジェット', 'menu.w.modsF': 'MOD', 'menu.w.items': 'アイテム',
    'menu.w.craft': 'つくる', 'menu.w.crafted': 'できた！', 'menu.w.firstXp': 'はじめてのクラフト：+{n} XP', 'menu.w.pin': 'ピン', 'menu.w.pinned': 'ピン中', 'menu.w.tapClose': 'タップで つぎへ',
    'menu.w.lvl': 'W{n}', 'menu.w.xp': '{a}/{b} XP', 'menu.w.maxed': 'MAXレベル！', 'menu.w.tune': 'チューンナップ', 'menu.w.tuneNeed': 'W{n}が ひつよう', 'menu.w.gearPolish': 'ギアをみがく', 'menu.w.polish': 'みがく',
    'menu.w.polishKits': 'ピカピカキット：{n}', 'menu.w.gearLv': 'L{n}', 'menu.w.noGear': 'クラフトで ギアを作ると ここで みがけるよ。',
    'menu.w.slots': 'MODスロット', 'menu.w.ownedMods': 'もっているMOD', 'menu.w.noMods': 'MODは まだないよ。クラフトで作ろう（MODベンチは プレイヤーランク5で オープン）。', 'menu.w.slotLocked': 'W{n}で ひらく', 'menu.w.tapMod': 'MODを タップで はめこみ。スロットを タップで はずす。',
    'menu.w.fits': 'つけられる', 'menu.w.noFit': 'つけられない', 'menu.w.inUse': '{name}に そうび中',
    'menu.w.favs': 'お気に入りのぶき', 'menu.w.pickSlot': 'スロットを えらんでから ぶきを タップ。', 'menu.w.gadget': 'ガジェット', 'menu.w.gearSlots': 'ギア', 'menu.w.statsPrev': 'ステータス', 'menu.w.none': 'なし', 'menu.w.noGadget': '「ようこそフィズポートへ」を クリアすると ビーポスキャンが もらえるよ。',
    'menu.w.st.hp': 'さいだいHP', 'menu.w.st.shield': 'シールド', 'menu.w.st.jump': 'ジャンプ', 'menu.w.st.speed': 'スピード', 'menu.w.st.magnet': 'マグネット', 'menu.w.st.dash': 'ダッシュ',
    'menu.s.title': 'ポップショップ', 'menu.s.role': 'てんいん', 'menu.s.weapons': 'ぶき', 'menu.s.supplies': 'どうぐ', 'menu.s.parts': 'パーツ', 'menu.s.sell': 'うる',
    'menu.s.say': 'きょうも ポップに 大はりきり！ なにが ほしい？', 'menu.s.saySell': 'あまったパーツ、ぜーんぶ かいとるよ！', 'menu.s.buy': 'かう', 'menu.s.left': 'きょう あと{n}こ', 'menu.s.leftW': 'こんしゅう あと{n}こ',
    'menu.s.refill': 'だんやく ぜんぶ ほじゅう', 'menu.s.refillD': 'つぎのミッションの まえに ぜんぶの ぶきを まんたんに。', 'menu.s.refillBtn': 'ほじゅう', 'menu.s.full': 'だんやくは まんたん！', 'menu.s.sell1': '1こ うる', 'menu.s.sellAll': 'ぜんぶ うる',
    'menu.s.each': '1こ {n}', 'menu.s.noParts': 'うれるパーツが ないよ。ロボを ポンしよう！', 'menu.s.carry': 'もちもの {n}/{m}',
    'menu.c.title': 'フィズカフェ', 'menu.c.role': 'バリスタ', 'menu.c.treat': 'きょうの おやつ', 'menu.c.boost': 'ブースター', 'menu.c.dailies': 'デイリー',
    'menu.c.say': '……あ、いらっしゃい…… おやつ あったかいよ……', 'menu.c.sayDone': '……きょうの おやつは おしまい…… つぎのは ちゃんと まってるからね……', 'menu.c.day': '{n}日目', 'menu.c.today': 'きょう',
    'menu.c.grab': 'きょうの おやつを もらう！', 'menu.c.tomorrow': 'きょうの ぶんは もらったよ！', 'menu.c.treatNote': 'おやつは あそんだ日に 1つずつ。休んでも リセットされないから、いそがなくて だいじょうぶ！',
    'menu.c.active': 'こうか中：あと{n}しあい', 'menu.c.boostNote': 'ブースターは つぎの3しあいの あいだ きくよ。それぞれ 1つずつ。',
    'menu.c.dailyNote': 'おわったデイリーは ギルドホールで うけとってね。', 'menu.c.toGuild': 'ギルドホールへ',
    'menu.c.t1': '200クリンク', 'menu.c.t2': 'ランダムパーツ3こ', 'menu.c.t3': '300クリンク', 'menu.c.t4': 'ピカピカキット', 'menu.c.t5': '400クリンク', 'menu.c.t6': 'ルマイト1こ', 'menu.c.t7': 'ゴールドチェスト',
    'menu.ga.title': 'ギャラリー', 'menu.ga.role': 'キュレーター', 'menu.ga.stickers': 'ステッカー', 'menu.ga.codex': 'ずかん', 'menu.ga.sprockets': 'スプロケット', 'menu.ga.stats': 'きろく',
    'menu.ga.say': 'ステッカーには それぞれの おはなしが あるの。つぎは どれかしら？', 'menu.ga.sayCodex': 'ロボを ポンすると ずかんに のるわ。たくさん ポンすると ひみつが わかるの。',
    'menu.ga.discover': '1体 ポンすると わかるよ！', 'menu.ga.count': 'ステッカー {a}/{b}', 'menu.ga.unknown': '？？？', 'menu.ga.pops': 'ポンした数：{n}', 'menu.ga.tier': 'ランク{n}', 'menu.ga.drops': 'おとすもの', 'menu.ga.next': 'つぎの けんきゅうは {n}体',
    'menu.ga.sprCount': 'スタースプロケット {a}/{b}', 'menu.ga.milestone': '{n}こで', 'menu.ga.reward': 'ほうび：{r}', 'menu.ga.bosses': 'ボス',
    'menu.ga.s.pops': 'ポンしたロボ', 'menu.ga.s.elites': 'ポンしたエリート', 'menu.ga.s.crates': 'こわした箱', 'menu.ga.s.crafts': 'つくったアイテム', 'menu.ga.s.matches': 'あそんだ回数', 'menu.ga.s.clinks': 'かせいだクリンク',
    'menu.ga.s.turf': 'グーターフの勝ち', 'menu.ga.s.races': 'レースの回数', 'menu.ga.s.raceWins': 'レースの勝ち', 'menu.ga.s.royale': 'ロワイヤルの勝ち', 'menu.ga.s.wave': 'ファウンテンガード さいこうウェーブ', 'menu.ga.s.days': 'あそんだ日数', 'menu.ga.s.stickers': 'ステッカー', 'menu.ga.s.sprockets': 'スタースプロケット', 'menu.ga.s.pr': 'プレイヤーランク',
    'menu.h.title': 'ハンガー', 'menu.h.role': 'スターパイロット', 'menu.h.race': 'レース！', 'menu.h.raceD': 'スタースキフ・ラリー：8き、アステロイドリング、ブーストパッド。', 'menu.h.ship': 'スキフ強化', 'menu.h.records': 'コースのメダル',
    'menu.h.say': 'オレのスキフは じゅんびバンタン。キミは どうだい？', 'menu.h.up': '強化', 'menu.h.noMedal': 'メダルなし', 'menu.h.lv': 'Lv {n}/{m}',
    'menu.a.title': 'アリーナゲート', 'menu.a.role': 'グーターフの しんぱん', 'menu.a.play': 'グーターフ', 'menu.a.playD': '4たい4の ぬりあいバトル。たくさん ぬったら 勝ち！', 'menu.a.say': 'ガーガー！ グーブラスターで ぜんぶ ぬっちゃえ！',
    'menu.a.how1': 'ゆかを チームの グーで ぬろう', 'menu.a.how2': 'グーに もぐると およげて ほじゅうも できる', 'menu.a.how3': 'じかんぎれで たくさん ぬったほうが 勝ち', 'menu.a.wins': '勝ち', 'menu.a.played': 'あそんだ回数', 'menu.a.best': 'さいこうの ぬり',
    'menu.r.title': 'ロワイヤルタワー', 'menu.r.role': '飛行船の 船長', 'menu.r.play': 'スカイドロップ・ロワイヤル', 'menu.r.playD': 'キミ VS なかよしボット15体！ とびおりて さいごの1人を めざせ！', 'menu.r.say': 'スカイドロップ号に ようこそ！ きょうは とびおり びよりだ！',
    'menu.r.how1': '飛行船から とびおりて かっくう', 'menu.r.how2': 'ぶき・シールド・かいふくを ひろおう', 'menu.r.how3': 'ちぢむリングの 中に いよう', 'menu.r.best': 'さいこう順位', 'menu.r.wins': '勝ち', 'menu.r.played': 'あそんだ回数',
    'menu.f.title': 'ミッションボード', 'menu.f.role': 'ロボットの あいぼう', 'menu.f.say': 'ピポ！ きょうは どこへ 行く？', 'menu.f.missions': 'ミッション', 'menu.f.missionsD': '島を たんけん！ ロボを ポンして パーツを あつめて だっしゅつ！',
    'menu.f.guard': 'ファウンテンガード', 'menu.f.guardD': 'つぎつぎ くるロボから フィズコアを まもろう。', 'menu.f.boss': 'ボスハント', 'menu.f.bossD': '大ボスと 再戦して レアパーツを ゲット。', 'menu.f.bestWave': 'さいこうウェーブ：{n}',
    'menu.t.title': 'トレーニング場', 'menu.t.role': 'コーチ', 'menu.t.say': 'ピピーッ！ ウォーミングアップが チャンピオンを つくる！', 'menu.t.enter': 'トレーニング場へ', 'menu.t.enterD': 'まと、タイムトライアル、ポップアップ・チャレンジ。',
    'menu.t.tutorial': 'チュートリアルを もう一度', 'menu.t.tutorialD': 'ビーポと きほんを おさらいしよう。', 'menu.t.medals': 'メダル', 'menu.t.popup': 'ポップアップ さいこう：{n}', 'menu.t.noMedal': '—',
    'menu.t.hop': 'ホップホップフーレイ', 'menu.t.slide': 'スライドライダー', 'menu.t.grapple': 'グラップルグライド',
    'menu.tryIt': 'ためす', 'menu.w.getParts': 'パーツを買う',
  });

  // ------------------------------------------------------------------ extra CSS for town screens
  const CSS = `
.mm-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 10px; margin-bottom: 12px; }
.mm-strip .mm-big { min-height: 72px; padding: 10px 12px; }
.mm-strip .mm-big .mm-tile { width: 50px; height: 50px; }
.mm-qcard .mm-tile { --tc: #fff1c8; }
.mm-qcard.done { background: linear-gradient(160deg, #fff, #e3ffef); }
.mm-qcard.claimed { opacity: 0.6; }
.mm-mini { display: flex; flex-wrap: wrap; gap: 4px; }
.mm-mini .mm-cost { background: #fffbe8; }
.mm-act { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 4px; flex: none; }
/* (a grid card whose text column its buttons would squeeze — two shop / workshop columns on a desktop, one on a small
   phone — puts the buttons on a row of their own under the text: Japanese descriptions were cut into six-kana lines and
   clamped after a few words. Card titles keep their text in an inner span, so its phrase breaks (G.UI.wbr) apply.) */
.mm-grid > .mm-card { container-type: inline-size; flex-wrap: wrap; }
@container (max-width: 420px) { .mm-act { flex: 1 0 100%; flex-direction: row; justify-content: flex-end; align-items: center; flex-wrap: wrap; margin-top: -2px; } }
.mm-progline { display: flex; align-items: center; gap: 6px; } .mm-progline .mm-bar { flex: 1; } .mm-progline b { font: 800 12px var(--f-body); font-variant-numeric: tabular-nums; min-width: 44px; text-align: right; }
.mm-rankcard { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 18px; border: 3px solid var(--ink); background: linear-gradient(120deg, #fff6c8, #fff); box-shadow: 0 4px 0 var(--ink); margin-bottom: 12px; }
.mm-rankstar { width: 58px; height: 58px; flex: none; display: grid; place-items: center; font: var(--fw-d) 22px var(--f-display); background: var(--sun); border: 3px solid var(--ink); border-radius: 50%; box-shadow: 0 3px 0 var(--ink); }
.mm-turn { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: radial-gradient(ellipse at 50% 45%, rgba(40,30,110,0.65), rgba(20,16,60,0.85)); border-radius: 22px; cursor: pointer; animation: uiFadeIn 0.22s var(--ease-out) backwards; }
.mm-turn.out { animation: uiFadeOut 0.2s var(--ease-in) forwards; pointer-events: none; }
.mm-turn-stage { position: relative; width: 190px; height: 190px; }
.mm-turn-beam { position: absolute; left: 50%; top: -40px; width: 70px; height: 190px; transform: translateX(-50%); background: linear-gradient(180deg, rgba(79,216,255,0), rgba(79,216,255,0.75) 60%, rgba(200,246,255,0.95)); border-radius: 50% 50% 8px 8px; filter: blur(2px); animation: mmBeam 1.5s ease-in-out forwards; }
@keyframes mmBeam { 0% { opacity: 0; height: 0; } 15% { opacity: 1; } 80% { opacity: 1; height: 190px; } 100% { opacity: 0; height: 190px; } }
.mm-turn-plate { position: absolute; left: 50%; bottom: 8px; width: 170px; height: 46px; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(ellipse at 50% 40%, #9fe8ff, #2b6f86); border: 4px solid var(--ink); box-shadow: 0 6px 0 var(--ink), 0 0 30px rgba(79,216,255,0.8); }
.mm-turn-item { position: absolute; left: 50%; bottom: 34px; width: 112px; height: 112px; margin-left: -56px; display: grid; place-items: center; animation: mmPrint 1.5s cubic-bezier(.2,.8,.3,1) forwards, mmFloat 2.2s 1.5s ease-in-out infinite; filter: drop-shadow(0 0 14px rgba(159,246,255,0.95)); }
.mm-turn-item svg { width: 100%; height: 100%; }
@keyframes mmPrint { 0% { clip-path: inset(100% 0 0 0); transform: scale(0.6); } 85% { clip-path: inset(0 0 0 0); transform: scale(1.05); } 100% { clip-path: inset(0 0 0 0); transform: scale(1); } }
@keyframes mmFloat { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-8px) rotate(5deg); } }
@keyframes mmPopIn { from { transform: scale(0.6); opacity: 0; } to { transform: none; opacity: 1; } }
.mm-turn-title { font: var(--fw-d) 30px/1 var(--f-display); color: #fff; -webkit-text-stroke: max(1px, calc(4px * var(--ds, 1))) var(--ink); paint-order: stroke fill; text-shadow: 0 4px 0 var(--ink); opacity: 0; animation: mmPopIn 0.4s 1.45s cubic-bezier(.34,1.56,.64,1) forwards; }
.mm-turn-name { font: 800 17px var(--f-body); color: #fff; text-shadow: 0 2px 0 var(--ink); opacity: 0; animation: mmPopIn 0.4s 1.55s forwards; text-align: center; }
.mm-turn .mm-rchip { opacity: 0; animation: mmPopIn 0.4s 1.7s forwards; }
.mm-turn .mm-talk-hint { color: #fff; opacity: 0; animation: mmPopIn 0.3s 1.9s forwards, mmBlink 1s 2.2s ease-in-out infinite alternate; }
.mm-pipsrow { display: flex; gap: 4px; }
.mm-pipsrow i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--ink); background: #e8e4f0; }
.mm-pipsrow i.on { background: var(--sky); } .mm-pipsrow.gold i.on { background: var(--sun); }
.mm-tunerow { display: grid; grid-template-columns: minmax(70px, 1fr) auto auto; align-items: center; gap: 8px; padding: 4px 0; border-top: 2px dashed rgba(30,26,77,0.1); }
.mm-tunerow span { font: 800 13px var(--f-body); }
.mm-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 4px 12px; }
.mm-stats div { display: flex; justify-content: space-between; gap: 6px; font: 700 12.5px var(--f-body); color: var(--ink-soft); }
.mm-stats b { color: var(--ink); font-variant-numeric: tabular-nums; }
.mm-chipsel { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.mm-wchip { display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 99px; border: 3px solid var(--ink); background: #fff; font: 800 13px var(--f-body); cursor: pointer; box-shadow: 0 2px 0 var(--ink); }
.mm-wchip .mm-ico { width: 28px; height: 28px; }
.mm-wchip.on { background: var(--sun); }
.mm-sockets { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.mm-socket { width: 112px; min-height: 92px; border-radius: 16px; border: 3px dashed var(--ink); background: #f3faff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px; cursor: pointer; text-align: center; font: 800 11.5px/1.25 var(--f-body); }
.mm-socket.full { border-style: solid; background: #fff; box-shadow: 0 3px 0 var(--grape); }
.mm-socket.locked { opacity: 0.5; cursor: default; }
.mm-socket .mm-ico { width: 36px; height: 36px; }
.mm-slots { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.mm-slot { position: relative; min-height: 82px; border-radius: 16px; border: 3px solid var(--ink); background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 6px; cursor: pointer; font: 800 11.5px/1.2 var(--f-body); text-align: center; box-shadow: 0 3px 0 var(--ink); }
.mm-slot.sel { background: #fff6c8; outline: 4px solid var(--sun); outline-offset: 1px; }
.mm-slot.empty { background: #f1eef6; border-style: dashed; color: var(--ink-soft); }
.mm-slot .mm-ico { width: 40px; height: 40px; }
.mm-slot .mm-n { position: absolute; left: 6px; top: 4px; font: var(--fw-d) 12px var(--f-display); color: var(--ink-soft); }
.mm-gearslots { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr)); gap: 8px; margin-bottom: 10px; }
.mm-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin-bottom: 12px; }
.mm-day { border-radius: 14px; border: 3px solid var(--ink); background: #fff; padding: 6px 4px; display: flex; flex-direction: column; align-items: center; gap: 3px; font: 800 12px/1.2 var(--f-body); text-align: center; min-width: 0; }
.mm-day .mm-ico { width: 30px; height: 30px; }
.mm-day.past { background: #e3ffef; opacity: 0.75; } .mm-day.today { background: #fff6c8; outline: 4px solid var(--sun); transform: translateY(-3px); box-shadow: 0 4px 0 var(--ink); }
.mm-day small { font: 700 11px/1.2 var(--f-body); color: var(--ink-soft); }
.mm-day > span { max-width: 100%; hyphens: manual; } .mm-day > span.long { font-size: 11px; letter-spacing: -0.02em; }
.mm-sticker { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px; border-radius: 16px; border: 3px solid var(--ink); background: #fff; text-align: center; min-width: 0; box-shadow: 0 3px 0 rgba(30,26,77,0.25); }
.mm-sticker .mm-badge2 { width: 54px; height: 54px; border-radius: 50%; border: 3px solid var(--ink); display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, #fff, var(--sc, #ffd6e6)); }
.mm-sticker .mm-badge2 svg { width: 32px; height: 32px; }
.mm-sticker.off .mm-badge2 { filter: grayscale(1) opacity(0.5); background: #e8e4f0; }
.mm-sticker b { font: 800 12px/1.25 var(--f-body); }
.mm-sticker small { font: 600 11.5px/1.3 var(--f-body); color: var(--ink-soft); }
.mm-sticker .mm-bar { width: 100%; height: 17px; }
.mm-sticker .mm-bar > b { font-size: 11px; }
.mm-sprgrid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; margin-bottom: 12px; }
.mm-spr { aspect-ratio: 1; border-radius: 50%; border: 3px solid var(--ink); background: #ece9f2; display: grid; place-items: center; }
.mm-spr.on { background: radial-gradient(circle at 35% 30%, #fff6c8, #ffc93c); box-shadow: 0 0 10px rgba(255,201,60,0.8); }
.mm-spr svg { width: 70%; height: 70%; }
.mm-how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 10px 0; }
.mm-how div { border-radius: 16px; border: 3px solid var(--ink); background: #fff; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; font: 700 12.5px/1.35 var(--f-body); }
.mm-how .mm-ico { width: 36px; height: 36px; }
.mm-how b { font: var(--fw-d) 18px var(--f-display); color: var(--grape-ink); }
.mm-kv { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 6px; }
.mm-kv div { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px; border-radius: 12px; border: 2px solid rgba(30,26,77,0.15); background: #fff; font: 700 13px var(--f-body); }
.mm-kv b { font-variant-numeric: tabular-nums; }
.mm-medal-dot { width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid var(--ink); display: inline-block; flex: none; }
/* Ranger Locker: chips, a sticky 3D stage on the left, the item list scrolling on the right */
.mm-body.wr-body { display: flex; flex-direction: column; overflow: hidden; }
.wr-slots { flex: none; flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; margin-bottom: 8px; padding: 6px 2px 4px; }
.wr-slots::-webkit-scrollbar { display: none; }
.wr-slot { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; padding: 3px 11px 3px 4px; position: relative; flex: none; min-height: 38px; }
.wr-slot .mm-ico { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: #fff; }
.wr-dot { flex: none; min-width: 20px; height: 20px; margin: 0 -4px 0 1px; border-radius: 99px; background: var(--badge); color: #fff; border: 2px solid var(--ink); font: 800 12px/16px var(--f-body); box-sizing: border-box; text-align: center; padding: 0 3px; font-style: normal; text-shadow: none; }
.wr { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(150px, 36%) minmax(0, 1fr); gap: 10px; }
.wr-stage { position: relative; min-height: 0; border-radius: 18px; border: 3px solid var(--ink); background: #e9f7ff; overflow: hidden; box-shadow: 0 4px 0 rgba(30,26,77,0.3); }
.wr-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.wr-stage::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0) 52%, rgba(110,150,230,0.28)); }
.wr-label { position: absolute; left: 6px; right: 6px; top: 6px; z-index: 1; text-align: center; font: var(--fw-d) 15px/1.15 var(--f-display); color: var(--ink); pointer-events: none; text-shadow: 0 2px 0 #fff, 0 -1px 0 #fff; overflow-wrap: anywhere; }
.wr-hint { position: absolute; left: 4px; right: 4px; bottom: 5px; z-index: 1; text-align: center; font: 800 11.5px/1.2 var(--f-body); color: var(--ink-soft); pointer-events: none; }
.wr-fallback { position: absolute; inset: 20% 12%; } .wr-fallback svg { width: 100%; height: 100%; }
.wr-list { min-height: 0; overflow-y: auto; overflow-x: hidden; display: grid; gap: 8px; align-content: start; padding: 2px 4px 10px 2px; -webkit-overflow-scrolling: touch; touch-action: pan-y; overscroll-behavior: contain; }
.wr-card { padding: 8px; align-items: center; }
.wr-card .mm-ct p { -webkit-line-clamp: 2; }
.mm-tile.wr-por { overflow: hidden; }
.mm-tile.wr-por svg { width: 100%; height: 100%; }
.mm-tile.wr-item svg { width: 46px; height: 46px; }
.wr-sw { display: flex; gap: 9px; margin-top: 3px; flex-wrap: wrap; }
.wr-swatch { width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--ink); background: linear-gradient(135deg, var(--a) 56%, var(--b) 57%); cursor: pointer; padding: 0; box-shadow: 0 2px 0 var(--ink); flex: none; }
.wr-swatch.on { outline: 3px solid var(--sun); outline-offset: 2px; }
.mm-locker-link { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.mm-locker-link .mm-tile { overflow: hidden; } .mm-locker-link .mm-tile svg { width: 100%; height: 100%; }
@media (max-height: 460px) { .wr-label { font-size: 13px; } .wr-card { padding: 6px; } .wr-slot { min-height: 34px; padding: 2px 9px 2px 3px; font-size: 12.5px; gap: 4px; } .wr-slot .mm-ico { width: 24px; height: 24px; } .wr-slots { margin-bottom: 6px; gap: 5px; } }
@media (max-width: 640px) { .mm-body.wr-body { display: block; overflow-y: auto; } .wr { grid-template-columns: 1fr; grid-template-rows: 230px auto; } .wr-list { overflow: visible; } }
@media (max-height: 460px) { .mm-slot { min-height: 70px; } .mm-slot .mm-ico { width: 32px; height: 32px; } .mm-socket { min-height: 76px; width: 100px; } .mm-turn-stage { transform: scale(0.8); margin: -20px 0; } .mm-days { gap: 4px; } .mm-day .mm-ico { width: 24px; height: 24px; } }
@media (max-width: 640px) { .mm-slots { grid-template-columns: repeat(2, minmax(0, 1fr)); } .mm-days { grid-template-columns: repeat(4, minmax(0, 1fr)); } .mm-how { grid-template-columns: 1fr; } .mm-sprgrid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
`;
  (function inject() { if (document.getElementById('mm-css-town')) return; const s = document.createElement('style'); s.id = 'mm-css-town'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); })();

  const D = () => G.Data || {};
  const P = () => G.Progress || {};
  const Q = () => G.Quests || {};
  const prof = M.prof;
  const t = (k, p) => G.t(k, p);
  const refresh = entry => G.UI.refresh(entry);
  // Result of a progression call -> toast on failure, true on success.
  function ok(r) {
    if (r && r.ok !== false) return true;
    M.toastNo(r && r.text ? r.text : M.reasonText(r && r.reason));
    return false;
  }
  const btn = (labelKey, fn, cls, opts) => { const b = G.UI.btn(labelKey, fn, cls, opts); b.classList.add('mm-btn-sm'); return b; };
  const tagEl = (text, cls) => el('span.mm-tag' + (cls ? '.' + cls : ''), { text });
  const cssHex = h => (typeof h === 'number' ? '#' + h.toString(16).padStart(6, '0') : h);
  // "Try It": a 30 s drill with the weapon at the Training Range gallery (GDD §11f.1), then straight back
  // into this screen and tab.
  function tryItBtn(weaponId, screen, tab) {
    if (!G.Game.modes.training || !(G.Weapons && G.Weapons.defs && G.Weapons.defs[weaponId]) || G.Game.modeId !== 'hub') return null;
    return btn('menu.tryIt', () => {
      M.sfx('go');
      G.Game.go('training', { tryWeapon: weaponId, returnTo: 'hub', returnParams: { reopen: screen, reopenParams: { tab } } });
    }, 'cool', { icon: I.target });
  }
  M.tryItBtn = tryItBtn;
  // Shop part bundles that can cover a missing recipe part (for the "Get parts" shortcut).
  function shopHasPart(id) { const S = D().SHOP && D().SHOP.items; if (!S) return false; for (const k in S) if (S[k].kind === 'part' && S[k].part === id) return true; return false; }

  // Small rewards row (quest rewards objects from G.Data / G.Quests views).
  function rewardMini(r) {
    const row = el('div.mm-mini');
    if (!r) return row;
    const chip = (svg, text) => row.appendChild(el('span.mm-cost', el('span.mm-ico', { html: svg }), el('b', { text })));
    if (r.clinks) chip(I.clinks, G.i18n.num(r.clinks));
    if (r.xp) chip(I.xp, G.i18n.num(r.xp));
    if (r.stamps) chip(I.stamps, G.i18n.num(r.stamps));
    if (r.lumite) chip(I.lumite, '×' + r.lumite);
    for (const id in (r.parts || {})) chip(M.iconSvg('part', id), '×' + r.parts[id]);
    if (r.weapon) chip(M.iconSvg('weapon', r.weapon), M.name('weapon', r.weapon));
    if (r.gadget) chip(M.iconSvg('gadget', r.gadget), M.name('gadget', r.gadget));
    if (r.gear) chip(M.iconSvg('gear', r.gear), M.name('gear', r.gear));
    if (r.recipe) chip(I.scroll, M.name(M.inferKind(r.recipe), r.recipe));
    if (r.guild) chip(I.star, '★' + r.guild);
    if (r.heartPlate) chip(I.heart, '+25');
    if (r.unlock) chip(I.lock, G.i18n.has('bld.' + r.unlock + '.name') ? t('bld.' + r.unlock + '.name') : M.pretty(r.unlock));
    if (r.loot) chip(I.chest, '×' + r.loot.reduce((a, l) => a + (l.rolls || 1), 0));
    return row;
  }
  const QICON = { visit: 'pin', hunt: 'bot', gather: 'part', trial: 'clock', crates: 'chest', boss: 'bot', turfwin: 'splat', mission: 'pin', racemedal: 'rocket', survive: 'shield', sprockets: 'star', placement: 'airship', plates: 'shield', popup: 'target', craft: 'hammer', level: 'up', elitesrun: 'bot', bosstime: 'clock', noko: 'heart', bossrush: 'bot', trainmedal: 'target', racetop: 'rocket', racegold: 'trophy', bossany: 'bot', paint: 'splat', clinks: 'clinks' };
  function questTypeOf(v) { if (v.def && v.def.type) return v.def.type; const T = v.kind === 'daily' ? D().DAILY_TEMPLATES : D().WEEKLY_TEMPLATES; const tp = T && v.tpl && T[v.tpl]; return tp ? tp.type : 'visit'; }

  // ================================================================== GUILD
  function questCard(v, entry) {
    const type = questTypeOf(v);
    const status = v.status;
    const card = el('div.mm-card.mm-qcard' + (status === 'complete' ? '.done.glow' : status === 'claimed' ? '.claimed' : ''));
    card.appendChild(el('div.mm-tile', { html: I[QICON[type] || 'scroll'] }));
    const tags = [];
    if (v.promo) tags.push(tagEl(t('menu.g.promo'), 'coral'));
    else if (v.key) tags.push(tagEl(t('menu.g.key'), 'gold'));
    if (v.rank) tags.push(tagEl('★' + v.rank));
    const ct = el('div.mm-ct',
      el('h3', el('span', { text: v.title || t(v.titleKey) }), tags),
      el('p', { text: v.desc || t(v.descKey) }),
      el('div.mm-progline', M.bar(v.frac, status === 'complete' || status === 'claimed' ? 'gold' : ''), el('b', { text: G.i18n.num(v.value) + '/' + G.i18n.num(v.goal) })),
      rewardMini(v.rewards));
    card.appendChild(ct);
    const act = el('div.mm-act');
    if (status === 'complete') act.appendChild(btn('menu.g.claimBtn', () => claimQuest(v, entry), 'primary mm-pulse', { icon: I.gift }));
    else if (status === 'available') act.appendChild(btn('menu.g.accept', () => { if (ok(Q().accept(v.id))) { M.sfx('quest'); refresh(entry); } }, 'go'));
    else if (status === 'claimed') act.appendChild(M.icon('check'));
    else if (v.kind === 'daily' && !v.done && entry && entry.canReroll) act.appendChild(btn('menu.g.reroll', () => { if (ok(Q().reroll(v.id))) refresh(entry); }, 'small'));
    if (act.children.length) card.appendChild(act);
    return card;
  }
  function claimQuest(v, entry) {
    const r = Q().claim(v.id, { silent: true });
    if (!ok(r)) return;
    if (r.lines && r.lines.length) showLines(entry, r.lines, t('prog.claimed'));
    else refresh(entry);
  }
  // Reward popup (stamp animation) inside a building panel.
  function showLines(entry, lines, title) {
    const root = entry.el.querySelector('.mm-bp') || entry.el;
    const chips = el('div.mm-rewards', { style: { justifyContent: 'center', maxWidth: '520px' } }, M.rewardEntries(lines).map((e, i) => M.rewardChip(e, i - 7)));
    // (data-pad-top: the pad's A and Space / Enter dismiss it, 06_input; the hint names the device's way, M.contHint)
    const ov = el('div.mm-turn', { onclick: () => dismissTurn(ov, entry), 'data-pad-top': '1' },
      el('div', { html: I.stamps, style: { width: '96px', height: '96px', animation: 'mmStamp 0.45s cubic-bezier(.3,1.8,.5,1) backwards', transform: 'rotate(-10deg)' } }),
      el('div.mm-turn-title', { text: title || t('menu.done'), style: { animationDelay: '0.2s' } }),
      chips,
      M.contHint(el('div.mm-talk-hint', { style: { animationDelay: '0.6s' } })));
    root.appendChild(ov);
    turnMask(true);
    M.sfx('questDone');
  }
  // While a reward / fabricator overlay is up, toasts move out of its way (see CSS in 30_menus.js).
  function turnMask(on) { document.body.classList.toggle('mm-turn-open', !!on && !!document.querySelector('.mm-turn')); }
  // Tap to dismiss: the overlay fades out (inert) and the panel underneath refreshes afterwards.
  function dismissTurn(ov, entry) {
    if (ov._gone) return;
    ov._gone = true;
    const done = () => { ov.remove(); turnMask(false); if (G.UI.stack.includes(entry)) refresh(entry); };
    if (G.UI.reduced && G.UI.reduced()) { done(); return; }
    ov.classList.add('out');
    setTimeout(done, 200);
  }
  G.bus.on('ui-empty', () => turnMask(false));
  M.showLines = showLines;

  M.def('guild', {
    build(p, close, entry) {
      const Qs = Q(), Pr = P();
      const claimN = Qs.claimable ? Qs.claimable() : 0;
      const tab = entry.tab || (entry.tab = p.tab || (claimN > 0 ? 'claim' : 'active'));
      const active = Qs.active ? Qs.active() : [];
      const avail = Qs.available ? Qs.available().filter(v => !active.some(a => a.id === v.id)) : [];
      const dailies = Qs.dailies ? Qs.dailies() : [], weeklies = Qs.weeklies ? Qs.weeklies() : [];
      const body = [];
      const board = () => {
        const bossOpen = Pr.isUnlocked ? Pr.isUnlocked('boss') : true;
        return el('div.mm-strip',
          el('button.mm-big', { type: 'button', onclick: () => { M.openExternal('expedition-select', { from: 'guild' }); } }, el('div.mm-tile', { html: I.pin, style: { '--tc': '#fff1c8' } }), el('div', el('h3', { text: t('menu.g.missions') }), el('p', { text: t('menu.g.missionsD') }))),
          el('button.mm-big' + (bossOpen ? '' : '.locked'), { type: 'button', onclick: () => { if (!bossOpen) { M.toastNo(M.modeLockText({ id: 'boss' })); return; } M.openExternal('boss-select', { from: 'guild' }); } }, el('div.mm-tile', { html: I.bot, style: { '--tc': '#ffd8c8' } }), el('div', el('h3', { text: t('menu.g.boss') }), el('p', { text: bossOpen ? t('menu.g.bossD') : M.modeLockText({ id: 'boss' }) }))));
      };
      if (tab === 'active') {
        body.push(board());
        const list = active.slice().sort((a, b) => (b.status === 'complete') - (a.status === 'complete') || (b.promo - a.promo) || (b.key - a.key) || a.rank - b.rank);
        if (!list.length) body.push(M.empty('menu.g.noActive', 'scroll'));
        else body.push(el('div.mm-grid', list.map(v => questCard(v, entry))));
      } else if (tab === 'available') {
        if (!avail.length) body.push(M.empty('menu.g.noAvail', 'scroll'));
        else body.push(el('div.mm-grid', avail.map(v => questCard(v, entry))));
      } else if (tab === 'daily') {
        const di = Qs.dailyInfo ? Qs.dailyInfo() : { unlocked: false };
        entry.canReroll = di.rerolls > 0;
        body.push(el('div.mm-sec', { text: t('menu.g.dailies') }));
        if (!di.unlocked) body.push(el('div.mm-note', { text: t('menu.g.dailyLocked') }));
        else {
          body.push(el('div.mm-row.between', { style: { marginBottom: '8px' } }, el('span.mm-note', { text: t('menu.g.crate') }), el('span.mm-note', { text: t('menu.g.rerolls', { n: di.rerolls || 0 }) })));
          body.push(el('div.mm-grid', dailies.map(v => questCard(v, entry))));
        }
        const wi = Qs.weeklyInfo ? Qs.weeklyInfo() : { unlocked: false };
        body.push(el('div.mm-sec', { text: t('menu.g.weeklies'), style: { marginTop: '14px' } }));
        if (!wi.unlocked) body.push(el('div.mm-note', { text: t('menu.g.weeklyLocked') }));
        else body.push(el('div.mm-grid', weeklies.map(v => questCard(v, entry))));
        // Stamp exchange (Lumite for Guild Stamps)
        const ex = D().SHOP && D().SHOP.items && D().SHOP.items.lumite;
        if (ex) {
          const st = Pr.canBuy ? Pr.canBuy('lumite') : { ok: false };
          body.push(el('div.mm-sec', { text: t('menu.g.stampEx'), style: { marginTop: '14px' } }));
          body.push(el('div.mm-card', el('div.mm-tile', { html: I.lumite, style: { '--tc': '#d8f8ff' } }),
            el('div.mm-ct', el('h3', el('span', { text: t('cur.lumite') })), el('p', { text: t('menu.g.stampExD') }), M.costRow(0, null, { stamps: ex.stamps })),
            el('div.mm-act', btn('menu.g.exchange', () => { if (ok(Pr.buy('lumite'))) refresh(entry); }, st.ok ? 'primary' : '', { disabled: !st.ok }), st.ok ? null : el('span.mm-note.bad', { text: st.text || '' }))));
        }
      } else if (tab === 'claim') {
        const list = active.filter(v => v.status === 'complete').concat(dailies.filter(v => v.status === 'complete'), weeklies.filter(v => v.status === 'complete'));
        if (!list.length) body.push(M.empty('menu.g.noClaim', 'gift'));
        else body.push(el('div.mm-grid', list.map(v => questCard(v, entry))));
      }
      // rank card on top (all tabs)
      const gi = Pr.guildInfo ? Pr.guildInfo() : { star: M.rank().guild, keys: [] };
      const keysDone = (gi.keys || []).filter(k => k.done).length;
      const rankCard = el('div.mm-rankcard',
        el('div.mm-rankstar', { text: '★' + gi.star }),
        el('div.mm-ct',
          el('h3', { text: t('menu.g.rank', { n: gi.star }) + (G.i18n.has('guild.' + gi.star) ? ' · ' + t('guild.' + gi.star) : '') }),
          gi.keys && gi.keys.length ? el('div.mm-progline', M.bar(keysDone / gi.keys.length, 'gold'), el('b', { text: keysDone + '/' + gi.keys.length })) : null,
          el('p', { text: gi.keys && gi.keys.length ? (keysDone >= gi.keys.length ? (gi.eligible ? t('menu.g.promoReady') : t('menu.g.needPr', { n: gi.nextPr })) : t('menu.g.keys', { a: keysDone, b: gi.keys.length })) : '' })));
      body.unshift(rankCard);
      const view = M.buildingPanel({
        npc: 'quill', titleKey: 'menu.g.title', roleKey: 'menu.g.role', say: claimN > 0 ? 'menu.g.sayClaim' : 'menu.g.say', tab,
        tabs: [
          { id: 'active', labelKey: 'menu.g.active', icon: 'scroll' },
          { id: 'available', labelKey: 'menu.g.available', icon: 'star', badge: avail.length || 0 },
          { id: 'daily', labelKey: 'menu.g.daily', icon: 'clock' },
          { id: 'claim', labelKey: 'menu.g.claim', icon: 'gift', badge: claimN || 0 },
        ],
        onTab: id => { entry.tab = id; refresh(entry); },
        body, walletOpts: { stamps: true },
      }, close);
      return M.keepScroll(entry, view);
    },
  });

  // ================================================================== WORKSHOP
  const KIND_ORDER = { weapon: 0, gear: 1, gadget: 2, mod: 3, item: 4 };
  function recipeCard(r, entry) {
    const rec = r.recipe || {};
    const kind = rec.kind || 'item', out = rec.out || r.id;
    const rar = M.rarity(kind, out);
    const card = el('div.mm-card' + (r.ok ? '.glow' : r.owned ? '.dim' : ''), { style: { '--rc': M.rarityColor(rar) } });
    card.appendChild(M.tile(kind, out, { rarity: rar }));
    const tags = [tagEl(t('rarity.' + rar), null)];
    tags[0].style.background = M.rarityColor(rar);
    if (rec.guild > 1) tags.push(tagEl('★' + rec.guild, M.rank().guild >= rec.guild ? '' : 'coral'));
    if (r.owned) tags.push(tagEl(t('menu.owned'), 'mint'));
    const pinned = prof().loadout && prof().loadout.pinnedRecipe === r.id;
    if (pinned) tags.push(tagEl(t('menu.w.pinned'), 'grape'));
    const parts = {}; for (const pp of r.parts || []) parts[pp.id] = pp.need;
    const desc = M.desc(kind, out);
    const ct = el('div.mm-ct',
      el('h3', el('span', { text: r.name || M.name(kind, out) }), tags),
      desc ? el('p', { text: desc }) : null,
      r.owned ? null : M.costRow(r.clinks, parts),
      !r.ok && !r.owned && r.text ? el('div.mm-note.bad', { text: r.text }) : null);
    card.appendChild(ct);
    const act = el('div.mm-act');
    if (!r.owned) {
      act.appendChild(btn('menu.w.craft', () => doCraft(r, entry), r.ok ? 'primary' : '', { icon: I.hammer, disabled: !r.ok }));
      // missing only shop-stocked parts (and the rank is fine) → one tap to Penny's Parts tab, back here after
      const missing = (r.parts || []).filter(pp => pp.have < pp.need);
      const canShop = !r.ok && r.reason === 'parts' && missing.length && missing.every(pp => shopHasPart(pp.id)) && (!G.Hub || G.Hub.isUnlocked('shop')) && G.UI.defs.shop;
      if (canShop) act.appendChild(btn('menu.w.getParts', () => G.UI.open('shop', { tab: 'parts', from: 'workshop', onClose: () => { if (G.UI.stack.includes(entry)) refresh(entry); } }), 'go', { icon: I.cart }));
      if (kind === 'weapon') { const tb = tryItBtn(out, 'workshop', 'fab'); if (tb) act.appendChild(tb); }
      if (!rec.repeat && !canShop) act.appendChild(btn(pinned ? 'menu.w.pinned' : 'menu.w.pin', () => { P().pinRecipe(pinned ? null : r.id); refresh(entry); }, 'small', { icon: I.pin }));
    }
    card.appendChild(act);
    return card;
  }
  function doCraft(r, entry) {
    const res = P().craft(r.id, { silent: true });
    if (!ok(res)) return;
    const rec = r.recipe || {}, kind = rec.kind || 'item', out = rec.out || r.id;
    const root = entry.el.querySelector('.mm-bp') || entry.el;
    const extra = res.first ? el('div.mm-rchip', el('span.mm-ico', { html: I.xp }), el('span', { text: t('menu.w.firstXp', { n: (D().XP && D().XP.sources.craft) || 50 }) })) : null;
    const ov = el('div.mm-turn', { onclick: () => { if (Date.now() - t0 < 900) return; dismissTurn(ov, entry); }, 'data-pad-top': '1' },
      el('div.mm-turn-stage', el('div.mm-turn-beam'), el('div.mm-turn-plate'), el('div.mm-turn-item', { html: M.iconSvg(kind, out) })),
      el('div.mm-turn-title', { text: t('menu.w.crafted') }),
      el('div.mm-turn-name', { text: r.name || M.name(kind, out) }),
      extra,
      M.contHint(el('div.mm-talk-hint')));
    const t0 = Date.now();
    root.appendChild(ov);
    turnMask(true);
    M.sfx('craft');
    setTimeout(() => { if (ov.isConnected) { M.sfx('unlock'); const w = G.Game.world; if (w && w.player && w.fx) w.fx.confetti(w.player.pos.clone().setY(w.player.pos.y + 2), 30); } }, 1450);
  }
  function weaponUpgradeCard(id, entry) {
    const Pr = P(), wi = Pr.weaponInfo(id);
    const card = el('div.mm-card.col');
    const head = el('div.mm-row', { style: { flexWrap: 'nowrap', gap: '10px' } },
      M.tile('weapon', id, { rarity: M.rarity('weapon', id) }),
      el('div.mm-ct',
        el('h3', el('span', { text: M.name('weapon', id) }), tagEl(t('menu.w.lvl', { n: wi.level }), wi.max ? 'gold' : 'sky')),
        wi.max ? el('div.mm-note.good', { text: t('menu.w.maxed') }) : el('div.mm-progline', M.bar(wi.frac, 'xp'), el('b', { text: t('menu.w.xp', { a: G.i18n.num(wi.xp), b: G.i18n.num(wi.next || 0) }) }))),
      tryItBtn(id, 'workshop', 'up'));
    card.appendChild(head);
    const s = wi.stats;
    if (s) card.appendChild(el('div.mm-stats',
      el('div', el('span', { text: t('stat.damage') }), el('b', { text: G.i18n.num(s.damage) })),
      el('div', el('span', { text: t('stat.rate') }), el('b', { text: G.i18n.num(s.rate) + '/s' })),
      el('div', el('span', { text: t('stat.ammo') }), el('b', { text: s.infinite ? '∞' : G.i18n.num(s.ammo) })),
      el('div', el('span', { text: t('stat.dps') }), el('b', { text: G.i18n.num(s.dps) }))));
    card.appendChild(el('div.mm-note', { text: t('menu.w.tune') }));
    const tracks = (D().TUNE && D().TUNE.tracks) || ['power', 'capacity', 'handling'];
    tracks.forEach((tr, i) => {
      const rank = wi.tune ? wi.tune[i] : 0;
      const ti = Pr.tuneInfo(id, i);
      const pips = el('div.mm-pipsrow', [0, 1, 2].map(k => el('i' + (k < rank ? '.on' : ''))));
      let action;
      if (rank >= 3) action = tagEl(t('menu.max'), 'gold');
      else if (ti.reason === 'level') action = el('span.mm-note', { text: t('menu.w.tuneNeed', { n: ti.need }) });
      else action = btn('', () => { if (ok(Pr.tuneUp(id, i))) refresh(entry); }, ti.ok ? 'primary' : '', { icon: I.lumite, disabled: !ti.ok });
      if (action.tagName === 'BUTTON') action.appendChild(el('b', { text: '+' + (ti.cost || 0) }));
      card.appendChild(el('div.mm-tunerow', el('span', { text: t('tune.' + tr) }), pips, action));
    });
    return card;
  }
  function modsTab(entry, body) {
    const Pr = P(), Dd = D(), p = prof();
    const owned = Pr.ownedWeapons ? Pr.ownedWeapons() : [];
    if (!owned.length) { body.push(M.empty('menu.empty')); return; }
    const sel = entry.modW && owned.includes(entry.modW) ? entry.modW : owned[0];
    entry.modW = sel;
    body.push(el('div.mm-chipsel', owned.map(id => el('button.mm-wchip' + (id === sel ? '.on' : ''), { type: 'button', onclick: () => { entry.modW = id; refresh(entry); } }, el('span.mm-ico', { html: M.iconSvg('weapon', id) }), el('span', { text: M.name('weapon', id) })))));
    const wi = Pr.weaponInfo(sel);
    body.push(el('div.mm-sec', { text: t('menu.w.slots') }));
    const sockets = el('div.mm-sockets');
    const levelFor = [1, 3, 5];
    for (let i = 0; i < 3; i++) {
      const m = wi.mods ? wi.mods[i] : null;
      const open = i < (wi.slots || 1);
      const s = el('div.mm-socket' + (!open ? '.locked' : m ? '.full' : ''), { onclick: () => { if (open && m && ok(Pr.equipMod(sel, null, i))) { M.sfx('equip'); refresh(entry); } } },
        open ? (m ? el('span.mm-ico', { html: I.chip }) : M.icon('chip')) : M.icon('lock'),
        el('span', { text: open ? (m ? M.name('mod', m) : t('menu.w.none')) : t('menu.w.slotLocked', { n: levelFor[i] }) }));
      if (open && !m) s.querySelector('.mm-ico').style.opacity = '0.35';
      sockets.appendChild(s);
    }
    body.push(sockets);
    body.push(el('div.mm-sec', { text: t('menu.w.ownedMods') }));
    const mods = Object.keys(p.mods || {}).filter(id => p.mods[id] > 0 && Dd.MODS && Dd.MODS[id]);
    if (!mods.length) { body.push(el('div.mm-note', { text: t('menu.w.noMods') })); return; }
    body.push(el('div.mm-note', { text: t('menu.w.tapMod'), style: { marginBottom: '8px' } }));
    const grid = el('div.mm-grid');
    for (const id of mods) {
      const fits = Dd.modFits ? Dd.modFits(id, sel) : true;
      const on = wi.mods && wi.mods.includes(id);
      const usedOn = Object.keys(p.weapons || {}).filter(w => w !== sel && p.weapons[w].own && (p.weapons[w].mods || []).includes(id));
      const fam = Dd.MODS[id].family;
      const card = el('div.mm-card.clickable' + (on ? '.sel' : !fits ? '.dim' : ''), { onclick: () => { if (on) return; if (!fits) { M.toastNo(t('err.fit')); return; } if (ok(Pr.equipMod(sel, id))) { M.sfx('equip'); refresh(entry); } } },
        M.tile('mod', id, { sm: true }),
        el('div.mm-ct',
          el('h3', el('span', { text: M.name('mod', id) }), tagEl(t('fam.' + fam), fam === 'wild' ? 'grape' : fam === 'tradeoff' ? 'coral' : 'mint'), p.mods[id] > 1 ? tagEl('×' + p.mods[id]) : null),
          el('p', { text: M.desc('mod', id) }),
          el('div.mm-note' + (fits ? '.good' : '.bad'), { text: on ? t('menu.equipped') : fits ? (usedOn.length ? t('menu.w.inUse', { name: M.name('weapon', usedOn[0]) }) : t('menu.w.fits')) : t('menu.w.noFit') })));
      grid.appendChild(card);
    }
    body.push(grid);
  }
  function loadoutTab(entry, body) {
    const Pr = P(), Dd = D(), p = prof();
    const fav = (p.loadout && p.loadout.fav) || [];
    // Ranger Locker shortcut (your look: ranger, gloves, Beepo's hat, trail, skiff paint)
    if (G.Wardrobe && G.UI.defs.locker && G.Geo && G.Geo.rangerPortraitSVG) {
      const W = G.Wardrobe, e = W.equipped();
      body.push(el('button.mm-big.mm-locker-link', { type: 'button', onclick: () => G.UI.open('locker', { onClose: () => { if (G.UI.stack.includes(entry)) refresh(entry); } }) },
        el('div.mm-tile', { html: G.Geo.rangerPortraitSVG(e.ranger, W.rangerColors()), style: { '--tc': '#e6f6ff' } }),
        el('div', { style: { flex: 1, minWidth: 0 } }, el('h3', { text: t('wr.locker') }), el('p', { text: t('wr.openD') })), M.icon('hat')));
    }
    if (entry.slot == null) { const e = fav.indexOf(null); entry.slot = e >= 0 ? e : 0; }
    body.push(el('div.mm-sec', { text: t('menu.w.favs') }));
    const slots = el('div.mm-slots');
    for (let i = 0; i < 4; i++) {
      const id = fav[i];
      const s = el('div.mm-slot' + (entry.slot === i ? '.sel' : '') + (id ? '' : '.empty'), { onclick: () => { entry.slot = i; M.sfx('tab'); refresh(entry); } },
        el('span.mm-n', { text: String(i + 1) }),
        id ? el('span.mm-ico', { html: M.iconSvg('weapon', id) }) : M.icon('weapon'),
        el('span', { text: id ? M.name('weapon', id) : t('menu.w.none') }),
        id ? tagEl(t('menu.w.lvl', { n: (p.weapons[id] || {}).lvl || 1 }), 'sky') : null);
      if (!id) s.querySelector('.mm-ico').style.opacity = '0.3';
      slots.appendChild(s);
    }
    body.push(slots);
    body.push(el('div.mm-note', { text: t('menu.w.pickSlot'), style: { marginBottom: '8px' } }));
    const owned = Pr.ownedWeapons ? Pr.ownedWeapons() : [];
    body.push(el('div.mm-chipsel', owned.map(id => {
      const at = fav.indexOf(id);
      return el('button.mm-wchip' + (at === entry.slot ? '.on' : ''), { type: 'button', onclick: () => {
        if (at === entry.slot) { if (ok(Pr.equipWeapon(entry.slot, null))) { M.sfx('equip'); refresh(entry); } return; }
        if (ok(Pr.equipWeapon(entry.slot, id))) { M.sfx('equip'); const n = fav.indexOf(null); if (n >= 0) entry.slot = n; refresh(entry); }
      } }, el('span.mm-ico', { html: M.iconSvg('weapon', id) }), el('span', { text: M.name('weapon', id) }), at >= 0 ? tagEl(String(at + 1), 'gold') : null);
    })));
    // gadget
    body.push(el('div.mm-sec', { text: t('menu.w.gadget'), style: { marginTop: '6px' } }));
    const gadgets = Object.keys(Dd.ABILITIES || {}).filter(id => Dd.ABILITIES[id].type === 'gadget' && p.abilities && p.abilities[id]);
    if (!gadgets.length) body.push(el('div.mm-note', { text: t('menu.w.noGadget') }));
    else body.push(el('div.mm-chipsel', gadgets.map(id => el('button.mm-wchip' + (p.loadout.gadget === id ? '.on' : ''), { type: 'button', onclick: () => { if (ok(Pr.equipGadget(id))) { M.sfx('equip'); refresh(entry); } } }, el('span.mm-ico', { html: M.iconSvg('gadget', id) }), el('span', { text: M.name('gadget', id) })))));
    // gear slots
    body.push(el('div.mm-sec', { text: t('menu.w.gearSlots'), style: { marginTop: '6px' } }));
    const gs = el('div.mm-gearslots');
    for (const slot of (Dd.GEAR_SLOTS || ['head', 'body', 'back', 'feet', 'trinket'])) {
      const cur = p.loadout.gear && p.loadout.gear[slot];
      const ownedG = Object.keys(Dd.GEAR || {}).filter(id => Dd.GEAR[id].slot === slot && p.gear && p.gear[id] && p.gear[id].own);
      const open = entry.gearSlot === slot;
      const card = el('div.mm-card.col' + (open ? '.sel' : ''), { style: { gap: '6px' } },
        el('div.mm-row.clickable', { style: { flexWrap: 'nowrap', cursor: 'pointer' }, onclick: () => { entry.gearSlot = open ? null : slot; refresh(entry); } },
          cur ? M.tile('gear', cur, { sm: true }) : el('div.mm-tile.sm', { html: I.gift, style: { opacity: 0.35 } }),
          el('div.mm-ct', el('h3', el('span', { text: t('slot.' + slot) })), el('p', { text: cur ? M.name('gear', cur) + ' · ' + t('menu.w.gearLv', { n: (p.gear[cur] || {}).lvl || 1 }) : t('menu.w.none') }))));
      if (open) {
        const list = el('div.mm-chipsel', { style: { margin: 0 } });
        for (const id of ownedG) list.appendChild(el('button.mm-wchip' + (cur === id ? '.on' : ''), { type: 'button', onclick: () => { if (ok(Pr.equipGear(slot, id))) { M.sfx('equip'); entry.gearSlot = null; refresh(entry); } } }, el('span.mm-ico', { html: M.iconSvg('gear', id) }), el('span', { text: M.name('gear', id) })));
        if (cur) list.appendChild(btn('menu.unequip', () => { if (ok(Pr.equipGear(slot, null))) refresh(entry); }, 'small'));
        if (!ownedG.length) list.appendChild(el('span.mm-note', { text: t('menu.w.noGear') }));
        card.appendChild(list);
      }
      gs.appendChild(card);
    }
    body.push(gs);
    // stats preview
    const st = Dd.playerStats ? Dd.playerStats() : null;
    if (st) {
      body.push(el('div.mm-sec', { text: t('menu.w.statsPrev') }));
      body.push(el('div.mm-kv',
        el('div', el('span', { text: t('menu.w.st.hp') }), el('b', { text: G.i18n.num(st.maxHp) })),
        el('div', el('span', { text: t('menu.w.st.shield') }), el('b', { text: G.i18n.num(st.maxShield || 0) })),
        el('div', el('span', { text: t('menu.w.st.jump') }), el('b', { text: Math.round((st.jumpMult || 1) * 100) + '%' })),
        el('div', el('span', { text: t('menu.w.st.speed') }), el('b', { text: Math.round((st.speedMult || 1) * 100) + '%' })),
        el('div', el('span', { text: t('menu.w.st.magnet') }), el('b', { text: Math.round((st.magnetMult || 1) * 3) + ' m' })),
        el('div', el('span', { text: t('menu.w.st.dash') }), el('b', { text: G.i18n.num(st.dashCharges || 2) }))));
    }
  }
  const WORKSHOP = {
    build(p, close, entry) {
      const Pr = P();
      const tab = entry.tab || (entry.tab = p.tab || 'fab');
      const body = [];
      let say = 'menu.w.say';
      if (tab === 'fab') {
        const filt = entry.filt || 'all';
        const kinds = ['all', 'weapon', 'gear', 'gadget', 'mod', 'item'];
        const lbl = { all: 'menu.w.all', weapon: 'menu.w.weapons', gear: 'menu.w.gear', gadget: 'menu.w.gadgets', mod: 'menu.w.modsF', item: 'menu.w.items' };
        body.push(el('div.mm-sub', kinds.map(k => el('button.mm-subtab' + (k === filt ? '.on' : ''), { type: 'button', text: t(lbl[k]), onclick: () => { entry.filt = k; refresh(entry); } }))));
        let list = Pr.recipeList ? Pr.recipeList(filt === 'all' ? null : filt) : [];
        // hide undiscovered blueprints / quest-locked recipes until they matter
        const benchLocked = list.some(r => r.reason === 'modbench');
        list = list.filter(r => !(r.reason === 'blueprint') && !(r.reason === 'modbench') && !(r.reason === 'locked' && (r.recipe || {}).locked));
        const benchCard = benchLocked && (filt === 'mod' || filt === 'all') ? el('div.mm-card', { style: { margin: filt === 'mod' ? '0 0 10px' : '10px 0 0', background: '#f3eeff' } }, el('div.mm-tile.sm', { html: I.chip }), el('div.mm-ct', el('h3', { text: t('menu.w.modsF') }), el('p', { text: t('err.modbench') }))) : null;
        if (benchCard && filt === 'mod') body.push(benchCard);
        // craftable first, then what is within reach at your Guild Rank, then the dream list; owned last
        const rankOK = r => (r.recipe.guild || 1) <= M.rank().guild;
        list.sort((a, b) => (b.ok - a.ok) || (a.owned - b.owned) || (rankOK(b) - rankOK(a)) || ((a.recipe.guild || 1) - (b.recipe.guild || 1)) || (KIND_ORDER[a.recipe.kind] - KIND_ORDER[b.recipe.kind]) || (a.clinks - b.clinks));
        if (!list.length && !benchCard) body.push(M.empty('menu.empty', 'hammer'));
        else if (list.length) body.push(el('div.mm-grid', list.map(r => recipeCard(r, entry))));
        if (benchCard && filt === 'all') body.push(benchCard);
      } else if (tab === 'up') {
        say = 'menu.w.sayUp';
        const owned = Pr.ownedWeapons ? Pr.ownedWeapons() : [];
        body.push(el('div.mm-grid', owned.map(id => weaponUpgradeCard(id, entry))));
        const pr = prof(), gearIds = Object.keys(pr.gear || {}).filter(id => pr.gear[id].own && D().GEAR && D().GEAR[id]);
        body.push(el('div.mm-sec', { text: t('menu.w.gearPolish'), style: { marginTop: '14px' } }, el('span.mm-tag', { text: t('menu.w.polishKits', { n: (pr.items && pr.items.polish) || 0 }) })));
        if (!gearIds.length) body.push(el('div.mm-note', { text: t('menu.w.noGear') }));
        else body.push(el('div.mm-grid', gearIds.map(id => {
          const lv = pr.gear[id].lvl || 1;
          return el('div.mm-card', { style: { '--rc': M.rarityColor(M.rarity('gear', id)) } }, M.tile('gear', id),
            el('div.mm-ct', el('h3', el('span', { text: M.name('gear', id) }), tagEl(t('menu.w.gearLv', { n: lv }), lv >= 3 ? 'gold' : 'sky')), el('p', { text: M.desc('gear', id) }), el('div.mm-pipsrow.gold', [1, 2, 3].map(k => el('i' + (k <= lv ? '.on' : ''))))),
            el('div.mm-act', lv >= 3 ? tagEl(t('menu.max'), 'gold') : btn('menu.w.polish', () => { if (ok(Pr.polishGear(id))) refresh(entry); }, ((pr.items && pr.items.polish) || 0) >= (lv >= 2 ? 2 : 1) ? 'primary' : '', { icon: I.sparkle })));
        })));
      } else if (tab === 'mods') { say = 'menu.w.sayMods'; modsTab(entry, body); }
      else { say = 'menu.w.sayLoad'; loadoutTab(entry, body); }
      const view = M.buildingPanel({
        npc: 'gizma', titleKey: 'menu.w.title', roleKey: 'menu.w.role', say, tab,
        tabs: [
          { id: 'fab', labelKey: 'menu.w.fab', icon: 'hammer', badge: Pr.recipeList ? Pr.recipeList().filter(r => r.ok).length : 0 },
          { id: 'up', labelKey: 'menu.w.up', icon: 'up' },
          { id: 'mods', labelKey: 'menu.w.mods', icon: 'chip' },
          { id: 'load', labelKey: 'menu.w.load', icon: 'bag' },
        ],
        onTab: id => { entry.tab = id; refresh(entry); },
        body,
      }, close);
      return M.keepScroll(entry, view);
    },
  };
  M.def('workshop', WORKSHOP);
  M.def('loadout', { build(p, close, entry) { if (!entry.tab) entry.tab = 'load'; return WORKSHOP.build(p, close, entry); } });
  // Craftable recipe count for hub hints ("!" over Gizma).
  M.craftableCount = () => { const Pr = P(); return Pr.recipeList ? Pr.recipeList().filter(r => r.ok && r.recipe.kind !== 'mod' && r.recipe.kind !== 'item').length : 0; };

  // ================================================================== SHOP
  function shopCard(s, entry) {
    const it = s.item || {};
    const kind = it.kind === 'weapon' ? 'weapon' : it.kind === 'part' ? 'part' : 'item';
    const id = it.kind === 'weapon' ? it.weapon : it.kind === 'part' ? it.part : s.id;
    const owned = s.reason === 'owned';
    const rar = kind === 'item' ? 'common' : M.rarity(kind, id);
    const card = el('div.mm-card' + (owned ? '.dim' : ''), { style: { '--rc': M.rarityColor(rar) } });
    card.appendChild(M.tile(kind, id, { rarity: rar, pips: kind === 'part' }));
    const tags = [];
    if (owned) tags.push(tagEl(t('menu.owned'), 'mint'));
    if (s.left != null && !owned) tags.push(tagEl(t(it.weekly ? 'menu.s.leftW' : 'menu.s.left', { n: Math.max(0, s.left) }), s.left > 0 ? 'gold' : 'coral'));
    if (it.kind === 'consumable') tags.push(tagEl(t('menu.s.carry', { n: (prof().loadout.consumables || {})[s.id] || 0, m: it.carry })));
    if (it.kind === 'part') tags.push(tagEl(t('menu.have', { n: M.partCount(it.part) }), 'sky'));
    const desc = kind === 'weapon' ? M.desc('weapon', id) : kind === 'part' ? M.desc('part', id) : M.desc('item', s.id);
    card.appendChild(el('div.mm-ct',
      el('h3', el('span', { text: s.name || M.name(kind, id) }), tags),
      desc ? el('p', { text: desc }) : null,
      owned ? null : M.costRow(s.price, null, { stamps: s.stamps }),
      !s.ok && !owned && s.text && s.reason !== 'clinks' ? el('div.mm-note.bad', { text: s.text }) : null));
    const tryB = kind === 'weapon' && entry && entry.id === 'shop' ? tryItBtn(id, 'shop', 'weapons') : null;
    if (!owned) card.appendChild(el('div.mm-act', btn('menu.s.buy', () => { if (ok(P().buy(s.id))) { M.sfx('coin'); refresh(entry); } }, s.ok ? 'primary' : '', { icon: I.cart, disabled: !s.ok }), tryB));
    else if (tryB) card.appendChild(el('div.mm-act', tryB));
    return card;
  }
  M.def('shop', {
    build(p, close, entry) {
      const Pr = P(), Dd = D();
      const tab = entry.tab || (entry.tab = p.tab || 'weapons');
      const list = (Pr.shopList ? Pr.shopList() : []).filter(s => !s.item.building || s.item.building === 'shop');
      const body = [];
      let say = 'menu.s.say';
      if (tab === 'weapons') {
        // buyable now first, then locked by price, owned last
        const ws = list.filter(s => s.item.kind === 'weapon').sort((a, b) => (a.reason === 'owned') - (b.reason === 'owned') || (b.ok - a.ok) || (a.reason === 'clinks' ? 0 : 1) - (b.reason === 'clinks' ? 0 : 1) || a.price - b.price);
        body.push(el('div.mm-grid', ws.map(s => shopCard(s, entry))));
      } else if (tab === 'supplies') {
        const rc = Pr.refillCost ? Pr.refillCost() : { cost: 0 };
        body.push(el('div.mm-card', { style: { marginBottom: '12px', background: 'linear-gradient(120deg,#e6fbff,#fff)' } }, el('div.mm-tile', { html: I.refill, style: { '--tc': '#bff4ff' } }),
          el('div.mm-ct', el('h3', el('span', { text: t('menu.s.refill') })), el('p', { text: rc.cost ? t('menu.s.refillD') : t('menu.s.full') }), rc.cost ? M.costRow(rc.cost) : null),
          el('div.mm-act', btn('menu.s.refillBtn', () => { if (ok(Pr.refillAmmo())) refresh(entry); }, rc.cost && M.clinks() >= rc.cost ? 'primary' : '', { icon: I.refill, disabled: !rc.cost || M.clinks() < rc.cost }))));
        body.push(el('div.mm-grid', list.filter(s => s.item.kind === 'consumable' || s.item.kind === 'item').map(s => shopCard(s, entry))));
      } else if (tab === 'parts') {
        body.push(el('div.mm-grid', list.filter(s => s.item.kind === 'part').map(s => shopCard(s, entry))));
      } else {
        say = 'menu.s.saySell';
        const ids = (Dd.PART_IDS || []).filter(id => M.partCount(id) > 0 && Dd.PARTS[id] && !Dd.PARTS[id].noSell);
        if (!ids.length) body.push(M.empty('menu.s.noParts', 'tag'));
        else body.push(el('div.mm-grid', ids.map(id => {
          const n = M.partCount(id), price = Dd.PARTS[id].sell;
          const sell = k => { const r = Pr.sell(id, k); if (ok(r)) { G.UI.toast(t('prog.sold', { n: r.gained }), { icon: I.clinks }); M.sfx('coin'); refresh(entry); } };
          return el('div.mm-card', { style: { '--rc': M.rarityColor(M.rarity('part', id)) } }, M.tile('part', id),
            el('div.mm-ct', el('h3', el('span', { text: M.name('part', id) }), tagEl('×' + n, 'sky')), el('div.mm-row', el('span.mm-cost', el('span.mm-ico', { html: I.clinks }), el('b', { text: t('menu.s.each', { n: price }) })))),
            el('div.mm-act', btn('menu.s.sell1', () => sell(1), 'small'), n > 1 ? btn('menu.s.sellAll', () => sell(n), 'go', { icon: I.clinks }) : null));
        })));
      }
      const view = M.buildingPanel({
        npc: 'penny', titleKey: 'menu.s.title', roleKey: 'menu.s.role', say, tab,
        tabs: [
          { id: 'weapons', labelKey: 'menu.s.weapons', icon: 'weapon' },
          { id: 'supplies', labelKey: 'menu.s.supplies', icon: 'potion' },
          { id: 'parts', labelKey: 'menu.s.parts', icon: 'part' },
          { id: 'sell', labelKey: 'menu.s.sell', icon: 'tag' },
        ],
        onTab: id => { entry.tab = id; refresh(entry); },
        body,
      }, close);
      return M.keepScroll(entry, view);
    },
  });

  // ================================================================== CAFÉ
  const TREAT_ICON = ['clinks', 'part', 'clinks', 'sparkle', 'clinks', 'lumite', 'chest'];
  M.treatReady = () => { const Pr = P(); return Pr.cafeStatus ? !!Pr.cafeStatus().available : false; };
  M.def('cafe', {
    build(p, close, entry) {
      const Pr = P(), Qs = Q();
      const tab = entry.tab || (entry.tab = p.tab || 'treat');
      const cs = Pr.cafeStatus ? Pr.cafeStatus() : { available: false, day: 1, boost: {} };
      const body = [];
      let say = cs.available ? 'menu.c.say' : 'menu.c.sayDone';
      if (tab === 'treat') {
        const days = el('div.mm-days');
        const lastDay = (prof().cafe && prof().cafe.treatDay) || 0;
        for (let d = 1; d <= 7; d++) {
          const isToday = cs.available ? d === cs.day : d === lastDay;
          const past = cs.available ? d < cs.day : d < lastDay;
          const dayLbl = isToday ? t('menu.c.today') : t('menu.c.day', { n: d });
          days.appendChild(el('div.mm-day' + (isToday ? '.today' : past ? '.past' : ''), el('span' + (dayLbl.length > 8 ? '.long' : ''), { text: dayLbl }), M.icon(TREAT_ICON[d - 1]), el('small', { text: t('menu.c.t' + d) })));
        }
        body.push(days);
        body.push(el('div.mm-row.center', { style: { margin: '6px 0 10px' } },
          cs.available ? G.UI.btn('menu.c.grab', () => { const r = Pr.cafeTreat({ silent: true }); if (ok(r)) { showLines(entry, r.lines || [], t('prog.treat', { n: r.day })); const w = G.Game.world; if (w && w.player) w.fx.confetti(w.player.pos.clone().setY(w.player.pos.y + 2), 40); } }, 'primary big mm-pulse', { icon: I.gift })
            : G.UI.btn('menu.c.tomorrow', null, 'big', { icon: I.clock, disabled: true })));
        body.push(el('p.mm-note', { text: t('menu.c.treatNote'), style: { textAlign: 'center' } }));
      } else if (tab === 'boost') {
        const items = (Pr.shopList ? Pr.shopList() : []).filter(s => s.item.building === 'cafe');
        body.push(el('div.mm-grid', items.map(s => {
          const act = (cs.boost || {})[s.item.boost] || 0;
          const card = shopCard(s, entry);
          if (act > 0) card.querySelector('.mm-ct').appendChild(el('div.mm-note.good', { text: t('menu.c.active', { n: act }) }));
          return card;
        })));
        body.push(el('p.mm-note', { text: t('menu.c.boostNote'), style: { marginTop: '10px' } }));
      } else {
        const ds = Qs.dailies ? Qs.dailies() : [];
        if (!ds.length) body.push(el('div.mm-note', { text: t('menu.g.dailyLocked') }));
        else body.push(el('div.mm-grid', ds.map(v => questCard(Object.assign({}, v, { status: v.status === 'complete' ? 'active-done' : v.status }), null))));
        body.push(el('div.mm-row.between', { style: { marginTop: '10px' } }, el('span.mm-note', { text: t('menu.c.dailyNote') }),
          G.Hub ? btn('menu.c.toGuild', () => { close(); if (G.Game.modeId === 'hub' && G.Hub.travel('guild')) setTimeout(() => G.Hub.open('guild'), 280); else G.UI.open('guild', { tab: 'daily' }); }, 'cool', { icon: I.scroll }) : null));
      }
      const view = M.buildingPanel({
        npc: 'bloop', titleKey: 'menu.c.title', roleKey: 'menu.c.role', say, tab,
        tabs: [
          { id: 'treat', labelKey: 'menu.c.treat', icon: 'gift', badge: cs.available ? 1 : 0 },
          { id: 'boost', labelKey: 'menu.c.boost', icon: 'cup' },
          { id: 'dailies', labelKey: 'menu.c.dailies', icon: 'clock' },
        ],
        onTab: id => { entry.tab = id; refresh(entry); },
        body,
      }, close);
      return M.keepScroll(entry, view);
    },
  });

  // ================================================================== GALLERY
  const ENEMY_COL = { bumbler: '#ffd23f', hopper: '#3fe0b8', rollo: '#ff6b8b', squirt: '#a8e06a', gnat: '#9b7bff', shieldy: '#4a8cff', lobba: '#b983ff', zapper: '#39d5ff', pinch: '#ff8a4c', bruiser: '#ff5a6e', tote: '#ffb627', crankcrab: '#ff8a4c', buzzhive: '#ffc21a', titan: '#9aa5b8' };
  const CAT_ICON = { combat: 'bot', crafting: 'hammer', explorer: 'pin', racer: 'rocket', turf: 'splat' };
  const CAT_COL = { combat: '#ffd0c0', crafting: '#d8f0ff', explorer: '#d8ffe6', racer: '#e6dcff', turf: '#ffe8c8' };
  const GALLERY = {
    build(p, close, entry) {
      const Pr = P(), Dd = D(), pr = prof();
      const tab = entry.tab || (entry.tab = p.tab || 'stickers');
      const body = [];
      let say = 'menu.ga.say';
      if (tab === 'locker') { say = 'wr.say'; lockerBody(entry, body, p); }
      else if (tab === 'stickers') {
        const list = G.Stickers && G.Stickers.list ? G.Stickers.list() : [];
        const earned = list.filter(s => s.earned).length;
        body.push(el('div.mm-row.between', { style: { marginBottom: '8px' } }, el('h3', { text: t('menu.ga.count', { a: earned, b: list.length || 40 }), style: { margin: 0, font: 'var(--fw-d) 17px var(--f-display)' } }), M.bar(list.length ? earned / list.length : 0, 'gold')));
        body[0].lastChild.style.flex = '1'; body[0].lastChild.style.maxWidth = '260px';
        for (const cat of (Dd.STICKER_CATS || [])) {
          const items = list.filter(s => s.cat === cat);
          if (!items.length) continue;
          body.push(el('div.mm-sec', { text: G.i18n.has('cat.' + cat) ? t('cat.' + cat) : M.pretty(cat) }));
          body.push(el('div.mm-grid.tight', items.map(s => el('div.mm-sticker' + (s.earned ? '' : '.off'), { style: { '--sc': CAT_COL[cat] } },
            el('div.mm-badge2', { html: I[CAT_ICON[cat]] || I.sticker }),
            el('b', { text: s.name }), el('small', { text: s.desc }),
            s.earned ? M.icon('check') : M.bar(s.frac, 'gold', G.i18n.num(Math.floor(s.value)) + '/' + G.i18n.num(s.goal))))));
        }
      } else if (tab === 'codex') {
        say = 'menu.ga.sayCodex';
        const list = Pr.codexList ? Pr.codexList() : [];
        const card = c => {
          const info = c.info || {}, lv = c.level;
          const name = lv >= 1 ? t(info.nameKey || ('enemy.' + c.id + '.name')) : t('menu.ga.unknown');
          const next = c.pops < 1 ? 1 : c.pops < 10 ? 10 : c.pops < 25 ? 25 : null;
          const drops = lv >= 3 && info.parts ? el('div.mm-mini', Object.keys(info.parts).map(pid => el('span.mm-cost', el('span.mm-ico', { html: M.iconSvg('part', pid) }), el('b', { text: info.parts[pid] + '%' })))) : null;
          const col = ENEMY_COL[c.id] || '#ff7a3d';
          return el('div.mm-card' + (lv ? '' : '.dim'),
            el('div.mm-tile', { html: M.botIcon(lv ? col : '#9a96b0'), style: { '--tc': lv ? M.mixLight(col) : '#e8e4f0' } }),
            el('div.mm-ct',
              el('h3', el('span', { text: name }), info.tier ? tagEl(t('menu.ga.tier', { n: info.tier })) : tagEl(t('menu.ga.bosses'), 'coral'), lv ? tagEl(t(c.levelKey), lv >= 3 ? 'gold' : 'sky') : null),
              lv >= 1 ? el('p', { text: t(info.descKey || ('enemy.' + c.id + '.desc')) }) : null,
              lv >= 2 ? el('p', { text: '💡 ' + t(info.tipKey || ('enemy.' + c.id + '.tip')) }) : null,
              el('div.mm-progline', M.bar(next ? Math.min(1, c.pops / next) : 1, lv >= 3 ? 'gold' : ''), el('b', { text: t('menu.ga.pops', { n: c.pops }) })),
              next ? el('div.mm-note', { text: c.pops < 1 ? t('menu.ga.discover') : t('menu.ga.next', { n: next }) }) : drops));
        };
        body.push(el('div.mm-grid', list.map(card)));
      } else if (tab === 'sprockets') {
        const n = Pr.sprocketCount ? Pr.sprocketCount() : 0, total = Dd.SPROCKET_COUNT || 30;
        const bits = pr.sprockets || '';
        body.push(el('h3', { text: t('menu.ga.sprCount', { a: n, b: total }), style: { margin: '0 0 8px', font: 'var(--fw-d) 17px var(--f-display)' } }));
        const grid = el('div.mm-sprgrid');
        for (let i = 0; i < total; i++) grid.appendChild(el('div.mm-spr' + (bits[i] === '1' ? '.on' : ''), { html: bits[i] === '1' ? (Dd.partIcon ? Dd.partIcon('sprocket') : I.star) : '' }));
        body.push(grid);
        body.push(el('div.mm-grid', (Dd.SPROCKET_MILESTONES || []).map(m => {
          const r = m.cosmetic ? t('cos.' + m.cosmetic) : m.toggle ? t('toggle.' + m.toggle) : m.note === 'prism' ? M.name('weapon', 'prism') : '';
          return el('div.mm-card' + (n >= m.n ? '.glow' : '.dim'), el('div.mm-tile.sm', { html: n >= m.n ? I.check : I.star }), el('div.mm-ct', el('h3', el('span', { text: t('menu.ga.milestone', { n: m.n }) })), el('p', { text: t('menu.ga.reward', { r }) })));
        })));
      } else {
        const s = pr.stats || {}, rec = pr.records || {};
        const rows = [
          ['menu.ga.s.pr', M.rank().pr], ['menu.ga.s.pops', s.pops], ['menu.ga.s.elites', s.elites], ['menu.ga.s.crates', s.crates], ['menu.ga.s.crafts', s.crafts || ((s.firstCrafts || []).length)],
          ['menu.ga.s.matches', s.matches], ['menu.ga.s.clinks', s.clinksEarned], ['menu.ga.s.turf', rec.turf && rec.turf.wins], ['menu.ga.s.races', rec.races && rec.races.played],
          ['menu.ga.s.raceWins', rec.races && rec.races.wins], ['menu.ga.s.royale', rec.royale && rec.royale.wins], ['menu.ga.s.wave', rec.wave && rec.wave.best],
          ['menu.ga.s.days', pr.profile && pr.profile.daysPlayed], ['menu.ga.s.stickers', (pr.stickers || []).length], ['menu.ga.s.sprockets', Pr.sprocketCount ? Pr.sprocketCount() : 0],
        ];
        body.push(el('div.mm-kv', rows.map(r => el('div', el('span', { text: t(r[0]) }), el('b', { text: G.i18n.num(r[1] || 0) })))));
      }
      const view = M.buildingPanel({
        npc: 'lumi', titleKey: 'menu.ga.title', roleKey: 'menu.ga.role', say, tab,
        tabs: [
          { id: 'stickers', labelKey: 'menu.ga.stickers', icon: 'sticker' },
          { id: 'codex', labelKey: 'menu.ga.codex', icon: 'book' },
          { id: 'sprockets', labelKey: 'menu.ga.sprockets', icon: 'star' },
          { id: 'stats', labelKey: 'menu.ga.stats', icon: 'chart' },
          { id: 'locker', labelKey: 'wr.tabName', icon: 'hat', badge: lockerNew() },
        ],
        onTab: id => { entry.tab = id; refresh(entry); },
        body,
      }, close);
      if (tab === 'locker') {
        view.querySelector('.mm-body').classList.add('wr-body');
        const on = view.querySelector('.mm-tab.on');
        if (on) requestAnimationFrame(() => { const tl = on.parentElement; if (tl && on.offsetTop + on.offsetHeight > tl.scrollTop + tl.clientHeight) tl.scrollTop = on.offsetTop + on.offsetHeight - tl.clientHeight + 4; });
      }
      return M.keepScroll(entry, view);
    },
  };
  M.def('gallery', GALLERY);
  // The Ranger Locker on its own (plaza locker, quick menu, Workshop loadout): the Gallery panel opened on its Locker tab
  // once the Gallery is open; before that (first missions) a panel of its own titled "Ranger Locker", with Beepo in the
  // rail and no Stickers / Codex / Sprockets / Stats tabs, so nothing of the still-locked Gallery shows through.
  // (Language changes rebuild it through 30_menus RELOCALIZE, which lists 'locker'.)
  const galleryOpen = () => !G.Hub || !G.Hub.isUnlocked || !!G.safe('gallery lock', () => G.Hub.isUnlocked('gallery'));
  M.def('locker', {
    build(p, close, entry) {
      if (galleryOpen()) { if (!entry.tab) entry.tab = 'locker'; return GALLERY.build(p, close, entry); }
      entry.tab = 'locker';
      const body = [];
      lockerBody(entry, body, p);
      const view = M.buildingPanel({ npc: 'beepo', titleKey: 'wr.locker', say: 'wr.say', tab: 'locker', tabs: [], body }, close);
      view.querySelector('.mm-body').classList.add('wr-body');
      view.querySelector('.mm-bp').classList.add('wr-solo');
      return M.keepScroll(entry, view);
    },
  });
  // a look put on elsewhere (auto-equip of a new reward) while the locker is open
  G.bus.on('wardrobe', () => { for (const s2 of G.UI.stack) if ((s2.id === 'locker' || s2.id === 'gallery') && s2.tab === 'locker' && !s2._wrBusy) G.safe('locker refresh', () => G.UI.refresh(s2)); });

  // ================================================================== RANGER LOCKER
  // Equip the ranger (+ colourway), gauntlet tint, Beepo hat, dash/jump trail and skiff paint (13b G.Wardrobe). Left: a live
  // 3D turntable of the look you are browsing (drag to spin); right: the items of the chosen slot. Tapping a card previews
  // it, "Wear" equips it; locked items say how to get them.
  const WR = () => G.Wardrobe || null;
  const hexCss = c => '#' + ((c >>> 0) & 0xffffff).toString(16).padStart(6, '0');
  const SVG48 = b => '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><g stroke="#1e1a4d" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">' + b + '</g></svg>';
  const STAR_P = (x, y, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (x + Math.cos(a) * q).toFixed(1) + ' ' + (y + Math.sin(a) * q).toFixed(1); } return d + 'Z'; };
  function mittSvg(g, c, badge, band) {
    return SVG48('<path d="M12 40V21c0-6 4.5-10 10.5-10S33 15 33 21v19z" fill="' + hexCss(g) + '"/><path d="M33 25c4.5-2.5 9-.5 9 3.6S37.5 35 33 35" fill="' + hexCss(g) + '"/>' +
      '<path d="M15 19c1.5-3 3.5-4.4 6-4.6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.4"/>' +
      '<rect x="10" y="36" width="26" height="9" rx="3.5" fill="' + hexCss(c) + '"/>' + (band != null ? '<path d="M10.5 40.5h25" stroke="' + hexCss(band) + '" stroke-width="2.6"/>' : '') +
      (badge != null ? '<path d="' + STAR_P(22.5, 26, 6.5) + '" fill="' + hexCss(badge) + '" stroke-width="1.8"/>' : ''));
  }
  const BEEPO_SVG = '<circle cx="24" cy="28" r="14" fill="#fff1dc"/><circle cx="24" cy="28" r="7.5" fill="#2a1b3d"/><rect x="21.6" y="23.5" width="4.8" height="8" rx="2.4" fill="#39d5ff" stroke="none"/>';
  const HAT_SVG = {
    none: SVG48(BEEPO_SVG + '<path d="M24 14V8"/><circle cx="24" cy="7" r="2.6" fill="#ff6b8b" stroke-width="2"/>'),
    hat_party: SVG48(BEEPO_SVG + '<path d="M16 16L25 1l7 14z" fill="#ff6fb5"/><path d="M19 11l10-1M21.5 6.5l6-.6" stroke="#ffd23f" stroke-width="2.4"/><circle cx="25" cy="2.5" r="2.8" fill="#fff" stroke-width="2"/>'),
    hat_cap: SVG48(BEEPO_SVG + '<path d="M11 19c1-8 6-12 13-12s12 4 13 12z" fill="#2ec4b6"/><path d="M24 17h15c1 0 1.5 2 0 2.5H24z" fill="#2ec4b6"/><path d="' + STAR_P(21, 12.5, 3.4) + '" fill="#ffd23f" stroke-width="1.4"/>'),
    hat_crown: SVG48(BEEPO_SVG + '<path d="M14 15l1-10 5 5 4-7 4 7 5-5 1 10z" fill="#ffc21a"/><circle cx="24" cy="11" r="1.8" fill="#ff5fa2" stroke-width="1.4"/>'),
    hat_wizard: SVG48(BEEPO_SVG + '<path d="M7 16h34" stroke-width="4"/><path d="M7 16h34" stroke="#6a4fe0" stroke-width="2"/><path d="M14 15L26 1l-1 6 8 8z" fill="#7a5cff"/><path d="' + STAR_P(22, 10, 2.8) + '" fill="#ffd23f" stroke-width="1.2"/>'),
  };
  const TRAIL_SVG = {
    none: SVG48('<path d="M8 34c8-10 18-14 32-14" fill="none" stroke-dasharray="3 6" stroke="#9a96b0" stroke-width="3"/><circle cx="40" cy="20" r="4" fill="#d8d4e6" stroke-width="2"/>'),
    trail_bubbles: SVG48('<circle cx="14" cy="32" r="8" fill="#dff6ff" fill-opacity=".7"/><circle cx="30" cy="22" r="6" fill="#bff6ff" fill-opacity=".7"/><circle cx="39" cy="35" r="4.5" fill="#dff6ff" fill-opacity=".7"/><path d="M10 29a4 4 0 0 1 4-3" stroke="#fff" stroke-width="2"/>'),
    trail_stars: SVG48('<path d="' + STAR_P(14, 32, 8) + '" fill="#ffd23f"/><path d="' + STAR_P(30, 20, 6) + '" fill="#ff9fd0" stroke-width="2"/><path d="' + STAR_P(39, 36, 4.5) + '" fill="#9ff6ff" stroke-width="1.8"/>'),
  };
  function skiffSvg(c) {
    return SVG48('<path d="M4 30l13-5 6-12h4l6 12 13 5-13 4H17z" fill="' + hexCss(c.main) + '"/><path d="M21 22h6l2 6h-10z" fill="#bff6ff"/><path d="M17 34l-5 8M31 34l5 8" stroke="' + hexCss(c.accent) + '" stroke-width="3"/>' +
      '<path d="M20 35l4 9 4-9z" fill="' + hexCss(c.glow) + '"/>');
  }
  function itemSvg(slot, id) {
    const W = WR();
    if (slot === 'gauntlet') { const C = W.rangerColors(null, null, id); return mittSvg(C.glove, C.cuff, C.badge, C.band); }
    if (slot === 'hat') return HAT_SVG[id] || HAT_SVG.none;
    if (slot === 'trail') return TRAIL_SVG[id] || TRAIL_SVG.none;
    if (slot === 'paint') return skiffSvg(W.PAINTS[id] || W.PAINTS.none);
    return '';
  }
  function slotIcon(slot) {
    const W = WR();
    if (slot === 'ranger') { const e = W.equipped(); return G.Geo && G.Geo.rangerPortraitSVG ? G.Geo.rangerPortraitSVG(e.ranger, W.rangerColors()) : I.star; }
    if (slot === 'gauntlet') { const p = W.palette(); return mittSvg(p.glove, p.cuff, p.badge, p.band); }
    if (slot === 'hat') return HAT_SVG[W.equipped().hat] || HAT_SVG.none;
    if (slot === 'trail') return TRAIL_SVG.trail_stars;
    return skiffSvg(W.shipColors() || W.PAINTS.none);
  }
  // "NEW" = owned but not yet seen in the locker (state.viewed, lazily kept next to the wardrobe state)
  function viewed() { const W = WR(); const s = W.state(); if (!Array.isArray(s.viewed)) s.viewed = W.IDS.ranger.filter(id => W.owns('ranger', id)).concat(W.IDS.gauntlet, W.IDS.hat, W.IDS.trail, W.IDS.paint).filter(id => id === 'none' || id === 'suit' || W.RANGERS.some(r => r.id === id)); return s.viewed; }
  function isNew(slot, id) { const W = WR(); return W.owns(slot, id) && viewed().indexOf(id) < 0 && id !== 'none' && id !== 'suit'; }
  function lockerNew() { const W = WR(); if (!W) return 0; let n = 0; for (const sl of W.SLOTS) for (const id of W.IDS[sl]) if (isNew(sl, id)) n++; return n; }

  // ---- 3D turntable: the town renderer draws a small scene into its own target, read back into a 2D canvas (no second
  // GL context, the toon programs are already compiled). ~24 fps while the locker is open; released 2.5 s after it closes.
  const PV = { cv: null, ctx: null, rt: null, sc: null, cam: null, root: null, objs: [], key: '', want: null, buf: null, img: null, w: 0, h: 0,
    yaw: 0.5, hold: 0, t: 0, last: 0, raf: 0, gone: 0, dragX: null, cheer: false, model: null, beepo: null, ship: null, pts: null, frameH: 1.4 };
  function pvCanvas() {
    if (PV.cv) return PV.cv;
    const cv = document.createElement('canvas'); cv.className = 'wr-cv';
    cv.setAttribute('role', 'img');
    const loc = e => (G.Screen && G.Screen.toLocal ? G.Screen.toLocal(e.clientX, e.clientY).x : e.clientX);
    cv.addEventListener('pointerdown', e => { PV.dragX = loc(e); PV.hold = 2.5; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } e.stopPropagation(); });
    cv.addEventListener('pointermove', e => { if (PV.dragX == null) return; const x = loc(e); PV.yaw += (x - PV.dragX) * 0.013; PV.dragX = x; PV.hold = 2.5; });
    const up = () => { PV.dragX = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
    PV.cv = cv; PV.ctx = cv.getContext('2d');
    return cv;
  }
  function pvClear() {
    for (const o of PV.objs) { if (o.group && o.group.parent) o.group.parent.remove(o.group); if (o.dispose) G.safe('pv dispose', () => o.dispose()); }
    PV.objs.length = 0; PV.model = PV.beepo = PV.ship = null;
    if (PV.pts) { PV.root.remove(PV.pts); PV.pts.geometry.dispose(); PV.pts.material.dispose(); PV.pts = null; }
  }
  let TRAIL_TEX = {};
  function trailTex(shape) {
    if (TRAIL_TEX[shape]) return TRAIL_TEX[shape];
    const t = G.R.canvasTex(64, 64, g => {
      g.lineJoin = 'round'; g.lineWidth = 5;
      if (shape === 'star') { g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill(); }
      else { g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill(); g.beginPath(); g.arc(24, 24, 6, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); }
    });
    t.userData.shared = true;
    return (TRAIL_TEX[shape] = t);
  }
  function pvBuild(want) {
    const W = WR(), Geo = G.Geo;
    pvClear();
    if (!PV.sc) {
      PV.sc = new THREE.Scene();
      PV.sc.fog = new THREE.Fog(0xffffff, 400, 900);   // same program variant as the worlds' fog (no extra compile)
      PV.root = new THREE.Group(); PV.sc.add(PV.root);
      PV.cam = new THREE.PerspectiveCamera(26, 1, 0.05, 60);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.08, 40), G.M.toon(0xffffff, { spec: 0.3, rimStr: 0.25 }));
      ped.position.y = -0.04; ped.name = 'pedestal'; PV.sc.add(ped);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.025, 6, 48).rotateX(Math.PI / 2), G.M.toon(0x9fe8ff, { emissive: 0x9fe8ff, ei: 0.35 }));
      ring.position.y = 0.0; PV.sc.add(ring);
    }
    if (want.slot === 'paint') {
      const sh = Geo.ship('arrow', W.shipColors(want.paint) || W.PAINTS.none);
      sh.group.scale.setScalar(0.34); sh.group.position.y = 0.55; sh.group.rotation.x = -0.12;
      PV.root.add(sh.group); PV.objs.push(sh); PV.ship = sh;
      // frame the widest turn of the skiff (wings included) so it never clips the stage edges
      const bb = new THREE.Box3().setFromObject(sh.group), sz = bb.getSize(new THREE.Vector3());
      PV.frameW = Math.max(1.2, Math.hypot(sz.x, sz.z) * 0.9); PV.frameH = Math.max(1.0, bb.max.y * 1.5);
      return;
    }
    const b = Geo.npc('companion'); b.fixedHat = true; b.setHat(want.hat);
    PV.objs.push(b); PV.beepo = b;
    if (want.slot === 'hat') {   // hats are Beepo's: Beepo alone, big, on the pedestal
      b.group.scale.setScalar(1.7); b.group.position.set(0, 0.22, 0);
      PV.root.add(b.group); PV.frameH = 1.75; PV.frameW = 1.75;
      return;
    }
    const m = Geo.ranger(want.ranger, W.rangerColors(want.ranger, want.cw, want.gauntlet));
    PV.root.add(m.group); PV.objs.push(m); PV.model = m;
    const H = m.height || 1.4;
    // Beepo hovers beside the ranger (not on the turntable, so it never passes in front of the face)
    b.group.scale.setScalar(0.72);
    b.group.position.set(0.56, Math.min(H * 0.62, 0.95), 0.18);
    b.group.rotation.y = -0.55;
    PV.sc.add(b.group);
    PV.frameH = H * 1.16 + 0.1; PV.frameW = 1.35;
    const T = W.trailStyle(want.trail);
    if (T) {
      const n = 16, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
      for (let i = 0; i < n; i++) { c.setHex(T.colors[i % T.colors.length]); col.set([c.r, c.g, c.b], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      PV.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: trailTex(T.shape), size: 0.13, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.05 }));
      PV.pts.frustumCulled = false; PV.root.add(PV.pts);
    }
  }
  function pvFrame() {
    const cam = PV.cam, H = PV.frameH, half = Math.tan(cam.fov * Math.PI / 360);
    const d = Math.max(H * 0.56 / half, PV.frameW * 0.56 / (half * cam.aspect)) + 0.3;
    cam.position.set(0, H * 0.56, d); cam.lookAt(0, H * 0.45, 0); cam.updateMatrixWorld();
  }
  function pvLoop(now) {
    PV.raf = 0;
    if (!PV.cv) return;
    if (!PV.cv.isConnected) {
      if (!PV.gone) PV.gone = now;
      if (now - PV.gone > 2500) { pvRelease(); return; }
      PV.raf = requestAnimationFrame(pvLoop); return;
    }
    PV.gone = 0;
    PV.raf = requestAnimationFrame(pvLoop);
    const R = G.R, r = R && R.renderer;
    if (!r || (R.isLost && R.isLost()) || !PV.sc) return;
    const dt = PV.last ? Math.min(0.1, (now - PV.last) / 1000) : 1 / 24;
    if (PV.last && dt < 1 / 26) return;   // ~24 fps is plenty for a turntable
    PV.last = now; PV.t += dt;
    // fit the target to the canvas box (capped resolution: the read-back cost scales with it)
    const bw = PV.cv.clientWidth, bh = PV.cv.clientHeight;
    if (!bw || !bh) return;
    let pr = Math.min(1.5, window.devicePixelRatio || 1);
    if (bw * bh * pr * pr > 260000) pr = Math.sqrt(260000 / (bw * bh));
    const w = Math.max(32, Math.round(bw * pr)), h = Math.max(32, Math.round(bh * pr));
    if (w !== PV.w || h !== PV.h || !PV.rt) {
      PV.w = w; PV.h = h; PV.cv.width = w; PV.cv.height = h;
      if (PV.rt) PV.rt.dispose();
      PV.rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
      PV.buf = new Uint8Array(w * h * 4); PV.img = PV.ctx.createImageData(w, h);
      PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); pvFrame();
    }
    const rm = G.UI.reduced && G.UI.reduced();
    if (PV.hold > 0) PV.hold -= dt; else PV.yaw += dt * (rm ? 0.22 : 0.5);
    PV.root.rotation.y = PV.yaw;
    const t = PV.t;
    if (PV.model) PV.model.animate(t, dt);
    if (PV.beepo) PV.beepo.animate(t, dt);
    if (PV.ship) { PV.ship.setBoost(0.35 + 0.25 * Math.sin(t * 1.7)); PV.ship.update(t, dt); PV.ship.group.position.y = 0.55 + 0.04 * Math.sin(t * 1.3); }
    if (PV.pts) {   // the trail swirls up round the ranger's feet
      const a = PV.pts.geometry.attributes.position.array, n = a.length / 3;
      for (let i = 0; i < n; i++) { const u = ((t * 0.35 + i / n) % 1), ang = u * 7 + i * 0.4; a[i * 3] = Math.cos(ang) * (0.42 - u * 0.12); a[i * 3 + 1] = 0.05 + u * 1.1; a[i * 3 + 2] = Math.sin(ang) * (0.42 - u * 0.12); }
      PV.pts.geometry.attributes.position.needsUpdate = true;
      PV.pts.material.opacity = 0.95;
    }
    const prevRT = r.getRenderTarget(), ac = r.autoClear;
    const cc = PV._cc || (PV._cc = new THREE.Color()); r.getClearColor(cc); const ca = r.getClearAlpha();
    try {
      r.setRenderTarget(PV.rt); r.setClearColor(0xe9f7ff, 1); r.clear(true, true, true);
      r.render(PV.sc, PV.cam);
      r.readRenderTargetPixels(PV.rt, 0, 0, w, h, PV.buf);
    } finally { r.setRenderTarget(prevRT); r.setClearColor(cc, ca); r.autoClear = ac; }
    // rows come bottom-up: flip into the image
    const src = PV.buf, dst = PV.img.data, row = w * 4;
    for (let y = 0; y < h; y++) dst.set(src.subarray((h - 1 - y) * row, (h - y) * row), y * row);
    PV.ctx.putImageData(PV.img, 0, 0);
  }
  function pvRelease() {
    if (PV.raf) cancelAnimationFrame(PV.raf);
    PV.raf = 0; pvClear(); PV.key = '';
    if (PV.rt) { PV.rt.dispose(); PV.rt = null; }
    PV.buf = PV.img = null; PV.w = PV.h = 0; PV.cv = null; PV.ctx = null; PV.gone = 0; PV.last = 0;
  }
  // Show `want` {slot, ranger, cw, gauntlet, hat, trail, paint} in the stage element.
  function pvMount(stage, want) {
    if (!G.R || !G.R.renderer || !G.Geo || !G.Geo.ranger) return false;
    const cv = pvCanvas();
    stage.insertBefore(cv, stage.firstChild);
    const key = want.slot === 'paint' ? 'ship|' + want.paint : want.slot === 'hat' ? 'hat|' + want.hat : ['rg', want.ranger, want.cw, want.gauntlet, want.hat, want.trail].join('|');
    if (key !== PV.key) { const ok = G.safe('locker preview', () => { pvBuild(want); return true; }); if (!ok) return false; PV.key = key; if (PV.cam && PV.w) pvFrame(); }
    // a look just put on: the ranger (or Beepo) waves — also when it was already the one on the stage (no rebuild)
    if (PV.cheer) { PV.cheer = false; const o = PV.model || PV.beepo; if (o && o.greet) G.safe('locker cheer', () => o.greet()); }
    if (!PV.raf) { PV.last = 0; PV.raf = requestAnimationFrame(pvLoop); }
    return true;
  }
  M.lockerPreviewState = () => ({ key: PV.key, w: PV.w, h: PV.h, running: !!PV.raf, objs: PV.objs.length });

  function lockerBody(entry, body, params) {
    const W = WR();
    if (!W) { body.push(M.empty('menu.empty')); return; }
    if (params && params.slot && !entry.wslot) entry.wslot = params.slot;
    const slot = W.SLOTS.indexOf(entry.wslot) >= 0 ? entry.wslot : (entry.wslot = 'ranger');
    const e = W.equipped(), pv = entry.prev || (entry.prev = {});
    // slot chips
    body.push(el('div.mm-sub.wr-slots', W.SLOTS.map(sl => {
      let nn = 0; for (const id of W.IDS[sl]) if (isNew(sl, id)) nn++;
      return el('button.mm-subtab.wr-slot' + (sl === slot ? '.on' : ''), { type: 'button', onclick: () => { if (entry.wslot !== sl) { entry.wslot = sl; refresh(entry); } } },
        el('span.mm-ico', { html: slotIcon(sl) }), el('span', { text: t('wr.tab.' + sl) }), nn ? el('i.wr-dot', { text: String(nn) }) : null);
    })));
    // what the stage shows
    const want = { slot, ranger: pv.ranger || e.ranger, cw: pv.ranger ? pv.cw : e.cw, gauntlet: pv.gauntlet || e.gauntlet, hat: pv.hat || e.hat, trail: pv.trail || e.trail, paint: pv.paint || e.paint };
    if (!W.owns('ranger', want.ranger)) { /* locked rangers preview fine, in their first colourway */ want.cw = 0; }
    const stage = el('div.wr-stage');
    const label = slot === 'paint' ? W.name('paint', want.paint) : slot === 'hat' ? W.name('hat', want.hat) : W.rangerName(want.ranger) + ' · ' + t('wr.cw.' + W.colorway(want.ranger, want.cw).id);
    stage.appendChild(el('div.wr-label', { text: label }));
    stage.appendChild(el('div.wr-hint', { text: t('wr.drag') }));
    const mounted = pvMount(stage, want);
    if (mounted && PV.cv) PV.cv.setAttribute('aria-label', label);   // (role img: screen readers name what is on the stage)
    if (!mounted) stage.appendChild(el('div.wr-fallback', { html: G.Geo && G.Geo.rangerPortraitSVG ? G.Geo.rangerPortraitSVG(want.ranger, W.rangerColors(want.ranger, want.cw, want.gauntlet)) : '' }));
    const list = el('div.wr-list');
    const wear = (sl, id, cw) => ev => {
      ev.stopPropagation();
      entry._wrBusy = true;
      const ok = W.equip(sl, id, cw);
      entry._wrBusy = false;
      if (ok) { M.sfx('equip'); PV.cheer = true; pv[sl] = id; if (sl === 'ranger') pv.cw = cw; refresh(entry); }
    };
    if (slot === 'ranger') {
      for (const R of W.RANGERS) {
        const owned = W.owns('ranger', R.id), on = e.ranger === R.id, looking = want.ranger === R.id;
        const cwSel = looking ? want.cw : on ? e.cw : 0;
        const C = W.rangerColors(R.id, cwSel);
        const card = el('div.mm-card.clickable.wr-card' + (looking ? '.sel' : '') + (owned ? '' : '.dim'), { onclick: () => { pv.ranger = R.id; pv.cw = cwSel; refresh(entry); } },
          el('div.mm-tile.wr-por', { html: G.Geo.rangerPortraitSVG(R.id, C), style: { '--tc': hexCss(C.suit) } }),
          el('div.mm-ct',
            el('h3', el('span', { text: W.rangerName(R.id) }), tagEl(t('wr.build.' + R.build), 'sky'), on ? tagEl(t('wr.equipped'), 'gold') : null, isNew('ranger', R.id) ? tagEl(t('wr.new'), 'coral') : null),
            el('p', { text: t('ranger.' + R.id + '.d') }),
            owned ? el('div.wr-sw', R.cws.map((cw, i) => el('button.wr-swatch' + (i === cwSel ? '.on' : ''), { type: 'button', title: t('wr.cw.' + cw.id), 'aria-label': t('wr.cw.' + cw.id), style: { '--a': hexCss(cw.suit), '--b': hexCss(cw.trim) }, onclick: ev => { ev.stopPropagation(); pv.ranger = R.id; pv.cw = i; refresh(entry); } })))
              : el('div.mm-note', el('span.mm-ico', { html: I.lock, style: { width: '16px', height: '16px', verticalAlign: '-3px', marginRight: '4px' } }), el('span', { text: W.hint('ranger', R.id) }))),
          el('div.mm-act', owned ? (on && e.cw === cwSel ? M.icon('check') : btn('wr.equip', wear('ranger', R.id, cwSel), 'primary')) : null));
        list.appendChild(card);
      }
    } else {
      const dKey = { gauntlet: 'wr.gloveD', hat: 'wr.hatD', trail: 'wr.trailD', paint: 'wr.paintD' }[slot];
      for (const it of W.list(slot)) {
        const looking = want[slot] === it.id;
        const card = el('div.mm-card.clickable.wr-card' + (looking ? '.sel' : '') + (it.owned ? '' : '.dim'), { onclick: () => { pv[slot] = it.id; refresh(entry); } },
          el('div.mm-tile.wr-item', { html: itemSvg(slot, it.id) }),
          el('div.mm-ct',
            el('h3', el('span', { text: it.name }), it.on ? tagEl(t('wr.equipped'), 'gold') : null, isNew(slot, it.id) ? tagEl(t('wr.new'), 'coral') : null),
            it.id === 'none' && slot !== 'paint' ? null : el('p', { text: t(it.id === 'suit' ? 'wr.suitGlovesD' : dKey) }),   // (no "Beepo wears it" under "No hat")
            it.owned ? null : el('div.mm-note', el('span.mm-ico', { html: I.lock, style: { width: '16px', height: '16px', verticalAlign: '-3px', marginRight: '4px' } }), el('span', { text: it.hint }))),
          el('div.mm-act', it.owned ? (it.on ? M.icon('check') : btn('wr.equip', wear(slot, it.id), 'primary')) : null));
        list.appendChild(card);
      }
    }
    body.push(el('div.wr', stage, list));
    // the list scrolls on its own (M.keepScroll only keeps .mm-body): keep its position per slot across the refresh that
    // every preview / Wear tap does, so a card further down stays in view after it is tapped
    const sk = entry._wrScroll || (entry._wrScroll = {});
    list.addEventListener('scroll', () => { sk[slot] = list.scrollTop; }, { passive: true });
    if (sk[slot]) {   // right after the refresh attaches the view (no frame drawn at the top), again next frame as a fallback
      const back = () => { if (list.isConnected && Math.abs(list.scrollTop - sk[slot]) > 1) list.scrollTop = sk[slot]; };
      Promise.resolve().then(back); requestAnimationFrame(back);
    }
    // everything of this slot has now been seen (the NEW tags show this once)
    const vw = viewed(); let changed = false;
    for (const id of W.IDS[slot]) if (W.owns(slot, id) && vw.indexOf(id) < 0) { vw.push(id); changed = true; }
    if (changed && G.Save && G.Save.data) G.Save.save();
  }
  M.lockerBody = lockerBody;

  // ================================================================== mode buildings (hangar / arena / royale / fountain / training)
  function bigPlay(icon, titleKey, descKey, onClick, opts) {
    opts = opts || {};
    return el('button.mm-big' + (opts.locked ? '.locked' : '') + (opts.pulse ? '.mm-pulse' : ''), { type: 'button', onclick: onClick, style: opts.style || null },
      el('div.mm-tile', { html: I[icon], style: { '--tc': opts.tc || '#fff1c8' } }),
      el('div', { style: { flex: 1, minWidth: 0 } }, el('h3', { text: t(titleKey) }), el('p', { text: opts.descText || t(descKey) })),
      M.icon(opts.locked ? 'lock' : 'play'));
  }
  const howTo = (keys, icons) => el('div.mm-how', keys.map((k, i) => el('div', el('b', { text: String(i + 1) }), M.icon(icons[i]), el('span', { text: t(k) }))));
  const kv = rows => el('div.mm-kv', rows.map(r => el('div', el('span', { text: t(r[0]) }), el('b', { text: typeof r[1] === 'number' ? G.i18n.num(r[1]) : String(r[1]) }))));
  const MEDAL_HEX = ['#e8e4f0', '#e0a070', '#d8dce8', '#ffc21a', '#e6f4ff'];

  M.def('hangar', {
    build(p, close, entry) {
      const Pr = P(), Dd = D(), pr = prof();
      const body = [bigPlay('rocket', 'menu.h.race', 'menu.h.raceD', () => M.openExternal('race-select', { from: 'hangar' }), { tc: '#d8ecff', pulse: true })];
      const ship = pr.ship || {};
      body.push(el('div.mm-sec', { text: t('menu.h.ship'), style: { marginTop: '12px' } }));
      const max = (Dd.SHIP && Dd.SHIP.max) || 5;
      body.push(el('div.mm-grid', ((Dd.SHIP && Dd.SHIP.tracks) || []).map(tr => {
        const lv = ship[tr] || 0, cost = Pr.shipCost ? Pr.shipCost(tr) : null;
        const can = cost && M.hasParts(Object.assign({}, cost.parts)) && M.clinks() >= cost.clinks;
        return el('div.mm-card', el('div.mm-tile.sm', { html: { hull: I.shield, engine: I.jet, boost: I.bolt, blaster: I.target }[tr] || I.rocket, style: { '--tc': '#d8ecff' } }),
          el('div.mm-ct', el('h3', el('span', { text: t('ship.' + tr) }), tagEl(t('menu.h.lv', { n: lv, m: max }), lv >= max ? 'gold' : 'sky')), el('div.mm-pipsrow', Array.from({ length: max }, (_, k) => el('i' + (k < lv ? '.on' : '')))), cost ? M.costRow(cost.clinks, cost.parts) : null),
          el('div.mm-act', cost ? btn('menu.h.up', () => { if (ok(Pr.upgradeShip(tr))) refresh(entry); }, can ? 'primary' : '', { icon: I.up, disabled: !can }) : tagEl(t('menu.max'), 'gold')));
      })));
      const medals = (pr.records && pr.records.medals && pr.records.medals.race) || {};
      const tracks = (Dd.TRACK_IDS || []).filter(id => Pr.isUnlocked ? Pr.isUnlocked('track_' + id) : true);
      if (tracks.length) {
        body.push(el('div.mm-sec', { text: t('menu.h.records'), style: { marginTop: '12px' } }));
        body.push(el('div.mm-kv', tracks.map(id => { const m = medals[id] || 0; return el('div', el('span', { text: t('track.' + id + '.name') }), el('span.mm-row', el('i.mm-medal-dot', { style: { background: MEDAL_HEX[m] } }), el('b', { text: m ? M.pretty(Dd.MEDALS[m]) : t('menu.h.noMedal') }))); })));
      }
      return M.buildingPanel({ npc: 'ace', titleKey: 'menu.h.title', roleKey: 'menu.h.role', say: 'menu.h.say', body }, close);
    },
  });
  M.def('arena', {
    build(p, close) {
      const rec = (prof().records || {}).turf || {};
      const body = [bigPlay('splat', 'menu.a.play', 'menu.a.playD', () => M.openExternal('turf-lobby', { from: 'arena' }), { tc: '#ffe0c8', pulse: true }),
        howTo(['menu.a.how1', 'menu.a.how2', 'menu.a.how3'], ['splat', 'potion', 'trophy']),
        kv([['menu.a.wins', rec.wins || 0], ['menu.a.played', rec.played || 0], ['menu.a.best', (rec.bestPaint || 0) + '%']])];
      return M.buildingPanel({ npc: 'ticktock', titleKey: 'menu.a.title', roleKey: 'menu.a.role', say: 'menu.a.say', body }, close);
    },
  });
  M.def('royale', {
    build(p, close) {
      const rec = (prof().records || {}).royale || {};
      const body = [bigPlay('airship', 'menu.r.play', 'menu.r.playD', () => M.openExternal('royale-lobby', { from: 'royale' }), { tc: '#e6dcff', pulse: true }),
        howTo(['menu.r.how1', 'menu.r.how2', 'menu.r.how3'], ['airship', 'chest', 'clock']),
        kv([['menu.r.best', rec.played ? '#' + (rec.best || 16) : '—'], ['menu.r.wins', rec.wins || 0], ['menu.r.played', rec.played || 0]])];
      return M.buildingPanel({ npc: 'gale', titleKey: 'menu.r.title', roleKey: 'menu.r.role', say: 'menu.r.say', body }, close);
    },
  });
  M.def('fountain', {
    build(p, close) {
      const Pr = P(), rec = (prof().records || {}).wave || {};
      const guardOpen = G.Hub ? G.Hub.isUnlocked('defense') : true;
      const bossOpen = Pr.isUnlocked ? Pr.isUnlocked('boss') : true;
      const lockText = G.Hub ? G.Hub.lockText('defense') : '';
      const bossLock = M.modeLockText({ id: 'boss' });
      const body = [
        bigPlay('pin', 'menu.f.missions', 'menu.f.missionsD', () => M.openExternal('expedition-select', { from: 'fountain' }), { tc: '#fff1c8', pulse: p.tab !== 'guard' }),
        bigPlay('shield', 'menu.f.guard', 'menu.f.guardD', () => { if (!guardOpen) { M.toastNo(lockText); return; } M.openExternal('defense-select', { from: 'fountain' }); }, { tc: '#e0dcff', locked: !guardOpen, pulse: p.tab === 'guard' && guardOpen, descText: guardOpen ? t('menu.f.guardD') + (rec.best ? '  ' + t('menu.f.bestWave', { n: rec.best }) : '') : lockText }),
        bigPlay('bot', 'menu.f.boss', 'menu.f.bossD', () => { if (!bossOpen) { M.toastNo(bossLock); return; } M.openExternal('boss-select', { from: 'fountain' }); }, { tc: '#ffd8c8', locked: !bossOpen, descText: bossOpen ? null : bossLock }),
      ];
      if (p.tab === 'guard') body.unshift(body.splice(1, 1)[0]);
      body.forEach((b, i) => { if (i) b.style.marginTop = '10px'; });
      // the Guard Post at the South Gate opens this same board, headed as Fountain Guard
      return M.buildingPanel({ npc: 'beepo', titleKey: 'menu.f.title', headKey: p.tab === 'guard' ? 'menu.f.guard' : null, roleKey: 'menu.f.role', say: 'menu.f.say', body, color: p.tab === 'guard' ? M.npcColors('defense') : M.npcColors('beepo') }, close);
    },
  });
  // Fallback only: the training module (26_training.js) owns 'training-gate'.
  if (!G.UI.defs['training-gate']) M.def('training-gate', {
    build(p, close) {
      const pr = prof(), rec = pr.records || {}, trials = (rec.medals && rec.medals.trials) || {};
      const go = tut => { close(); if (G.Game.modes.training) G.Game.go('training', tut ? { tutorial: true } : {}); else M.openExternal('__none'); };
      const Dd = D();
      const body = [
        bigPlay('target', 'menu.t.enter', 'menu.t.enterD', () => go(false), { tc: '#fff1c8', pulse: true }),
        el('div', { style: { height: '10px' } }),
        bigPlay('beepo', 'menu.t.tutorial', 'menu.t.tutorialD', () => go(true), { tc: '#d8f4ff' }),
        el('div.mm-sec', { text: t('menu.t.medals'), style: { marginTop: '12px' } }),
        el('div.mm-kv', ['hop', 'slide', 'grapple'].map(k => { const m = trials[k] || 0; return el('div', el('span', { text: t('menu.t.' + k) }), el('span.mm-row', el('i.mm-medal-dot', { style: { background: MEDAL_HEX[m] } }), el('b', { text: m ? M.pretty((Dd.MEDALS || [])[m] || '') : t('menu.t.noMedal') }))); }).concat([el('div', el('span', { text: t('menu.t.popup', { n: rec.popup || 0 }) }))])),
      ];
      return M.buildingPanel({ npc: 'ping', titleKey: 'menu.t.title', roleKey: 'menu.t.role', say: 'menu.t.say', body }, close);
    },
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 30b_menus_town.js]', e); }
// ---- 30c_menus_title.js
try { (function () {
// 30c_menus_title.js — title screen DOM ('title'), language picker ('lang-pick') and control style
// picker ('preset-pick', GDD §3.7). The 3D backdrop is the 'title' mode in 20_hub.js.
// First launch: TAP → one card (control style, with a language chip in its header) → tutorial
// (G.Tutorial.needed(); 'tut-resume' offers Continue / Start over after a reload) or hub.
// Returning: TAP → hub. Touch shows Easy / Classic / Pro (assistance only: auto-fire + aim assist;
// button size stays its own setting); a controller gets the same cards told as aim help only (auto-fire acts on
// touch alone, 12_player); desktop shows difficulty cards + mouse look speed instead.
// New strings live in 93_lang_onboard.js and 93_lang_fixui.js (controller card texts; all 12 languages).
(function (G) {
  'use strict';
  const el = (...a) => G.Menus.el(...a);
  G.i18n.add('en', {
    'title.tagline': 'Pop bots. Paint turf. Race the stars.', 'title.tap': 'TAP TO PLAY', 'title.click': 'CLICK TO PLAY', 'title.lang': 'Language', 'title.settings': 'Settings',
    'title.pickLang': 'Choose your language', 'title.ok': 'OK!', 'title.pickPreset': 'How do you like to play?', 'title.presetNote': 'You can change this any time from the Map menu.',
    'title.go': 'Let\'s go!', 'title.version': 'v{v}',
    'title.preset.easy': 'Easy', 'title.preset.easyD': 'Auto-fire and strong aim help. Great for younger Rangers!',
    'title.preset.classic': 'Classic', 'title.preset.classicD': 'Standard aim help. You press FIRE yourself.',
    'title.preset.pro': 'Pro', 'title.preset.proD': 'Light aim help and smaller buttons. For sharpshooters!',
    'title.chip.autoOn': 'Auto-fire ON', 'title.chip.autoOff': 'Auto-fire OFF', 'title.chip.aimStrong': 'Aim help: Strong', 'title.chip.aimStd': 'Aim help: Standard', 'title.chip.aimLow': 'Aim help: Low',
    'title.recommended': 'Recommended', 'title.breezy': 'Tip: Breezy difficulty is on for a relaxed start. Change it in Settings.', 'title.presetSet': 'Controls: {name}',
  });
  G.i18n.add('ja', {
    'title.tagline': 'ロボをポン！ ナワバリをぬれ！ 星をかけぬけろ！', 'title.tap': 'タップしてスタート', 'title.click': 'クリックしてスタート', 'title.lang': 'ことば', 'title.settings': 'せってい',
    'title.pickLang': 'ことばを えらんでね', 'title.ok': 'OK！', 'title.pickPreset': 'どんなふうに あそぶ？', 'title.presetNote': 'マップメニューから いつでも かえられるよ。',
    'title.go': 'いくぞ！', 'title.version': 'v{v}',
    'title.preset.easy': 'かんたん', 'title.preset.easyD': 'オート射撃と つよいエイムアシスト。はじめての レンジャーに ぴったり！',
    'title.preset.classic': 'クラシック', 'title.preset.classicD': 'ふつうのエイムアシスト。うつボタンは じぶんで おすよ。',
    'title.preset.pro': 'プロ', 'title.preset.proD': 'エイムアシストは ひかえめ、ボタンは 小さめ。うでじまんに！',
    'title.chip.autoOn': 'オート射撃 ON', 'title.chip.autoOff': 'オート射撃 OFF', 'title.chip.aimStrong': 'エイム：つよい', 'title.chip.aimStd': 'エイム：ふつう', 'title.chip.aimLow': 'エイム：ひかえめ',
    'title.recommended': 'おすすめ', 'title.breezy': 'むずかしさを「そよかぜ」にしたよ。せっていで かえられるよ。', 'title.presetSet': 'そうさ：{name}',
  });
  const M = G.Menus;
  const I = M.ICONS;
  const U = G.util;

  // Control presets (GDD §3.7): control ASSISTANCE only — auto-fire and aim assist (the 0..1 scalar
  // the player controller reads on touch). Button size is its own setting (Settings → Controls →
  // Button size) and is never touched here, so picking a style again keeps a custom size.
  const PRESETS = {
    easy: { autoFire: true, aimAssist: 1.0, chips: ['title.chip.autoOn', 'title.chip.aimStrong'] },
    classic: { autoFire: false, aimAssist: 0.6, chips: ['title.chip.autoOff', 'title.chip.aimStd'] },
    pro: { autoFire: false, aimAssist: 0.3, chips: ['title.chip.autoOff', 'title.chip.aimLow'] },
  };
  M.PRESETS = PRESETS;
  M.applyPreset = function (id) {
    const p = PRESETS[id] || PRESETS.classic, s = G.Save.set;
    s.preset = PRESETS[id] ? id : 'classic'; s.autoFire = p.autoFire; s.aimAssist = p.aimAssist;
    G.Save.save(true);
    if (G.applySettings) G.applySettings();
  };
  M.firstRun = () => !G.Save.set.preset;
  // Auto-fire / aim assist / touch buttons only exist on touch: a mouse player is asked about
  // difficulty and mouse look speed instead (the touch questions would mean nothing to them).
  M.desktopPick = () => !!(G.input && G.input.device === 'desktop');
  const DIFFS = ['breezy', 'normal', 'spicy', 'blazing'];
  const DIFF_PR = { breezy: 0, normal: 0, spicy: 10, blazing: 18 };
  function diffOpen(d) {
    const D = G.Data && G.Data.DIFFICULTY, need = D && D[d] && D[d].pr != null ? D[d].pr : DIFF_PR[d];
    let pr = 1;
    try { pr = G.Progress && G.Progress.rankInfo ? G.Progress.rankInfo().pr || 1 : 1; } catch (e) { pr = 1; }
    return pr >= need;
  }

  // After the title: the tutorial when it is still needed (Continue / Start over when a reload cut it
  // short), else the hub. closeTitle closes the title screen once a mode switch really happens.
  function leaveTitle(closeTitle) {
    let tut = false;
    try { tut = !!(G.Tutorial && G.Tutorial.needed && G.Tutorial.needed()); } catch (e) { tut = false; }
    if (tut && G.Game.modes.training) {
      let step = 0;
      try { step = G.Tutorial.resumeStep ? G.Tutorial.resumeStep() : 0; } catch (e) { step = 0; }
      if (step > 0 && G.UI.defs['tut-resume']) { G.UI.open('tut-resume', { step }); return; }
      if (closeTitle) closeTitle();
      G.Game.go('training', { tutorial: true });
    } else {
      if (closeTitle) closeTitle();
      G.Game.go(G.Game.modes.hub ? 'hub' : 'title');
    }
  }
  M.leaveTitle = leaveTitle;

  // Picker styles (own classes; the cards reuse the menus kit .mm-preset look).
  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style'); st.id = 'mm-title-style';
    st.textContent = '.mm-langchip{flex:none;max-width:44%}.mm-langchip>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.mm-sens{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 14px;background:#fff;border:3px solid var(--ink);border-radius:18px;box-shadow:0 4px 0 var(--shadow);flex-wrap:wrap}'
      + '.mm-sens .mm-sens-ico{width:30px;height:38px;flex:none;display:inline-flex}.mm-sens .mm-sens-ico svg{width:100%;height:100%}'
      + '.mm-sens b{font:800 16px/1.2 var(--f-body);margin-right:auto}.mm-sens small{font:700 13px var(--f-body);color:var(--ink-soft)}'
      + '.mm-sens input{flex:1 1 160px;min-width:120px;accent-color:#3fe0b8}.mm-sens .mm-sensval{min-width:52px;text-align:right;font:800 16px var(--f-body);font-variant-numeric:tabular-nums}'
      + '.mm-presets.n2,.mm-presets.n4{grid-template-columns:repeat(2,minmax(0,1fr))}@media (max-width:640px){.mm-presets.n2,.mm-presets.n4{grid-template-columns:1fr}}'
      + '.mm-corner.tl{left:calc(14px + env(safe-area-inset-left,0px));top:calc(12px + env(safe-area-inset-top,0px))}';
    document.head.appendChild(st);
  }
  const MOUSE_SVG = '<svg viewBox="0 0 30 40"><rect x="2" y="2" width="26" height="36" rx="13" fill="#fff" stroke="#1e1a4d" stroke-width="3"/><path d="M15 3v13M3 16h24" stroke="#1e1a4d" stroke-width="2.5"/><rect x="13" y="7" width="4" height="6" rx="2" fill="#3fe0b8" stroke="#1e1a4d" stroke-width="1.5"/></svg>';
  // The picker follows the input device (a touch laptop that switches gets the right questions).
  G.bus.on('device', () => { const e = G.UI.stack.find(s => s.id === 'preset-pick'); if (e) G.safe('preset device', () => G.UI.refresh(e)); });

  // Title parallax: layers [el, depthX px, depthY px] follow the mouse (desktop) or a slow idle drift
  // (touch), critically damped so they glide; transforms are written only when they move. The loop
  // lives only while this title root is the live, visible screen.
  function parallax(root, layers) {
    if (G.UI.reduced && G.UI.reduced()) return;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, last = 0, mouseT = -1e9, raf = 0;
    const onMove = e => {
      if (e.pointerType !== 'mouse') return;
      const p = G.Screen && G.Screen.toLocal ? G.Screen.toLocal(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
      const w = G.Screen ? G.Screen.w() : innerWidth, h = G.Screen ? G.Screen.h() : innerHeight;
      tx = U.clamp(p.x / w * 2 - 1, -1, 1); ty = U.clamp(p.y / h * 2 - 1, -1, 1); mouseT = performance.now();
    };
    const w0 = layers.map(() => ({ x: 1e9, y: 1e9 }));
    const step = now => {
      if (!root.isConnected || root.closest('.ui-ghost') || (G.UI.reduced && G.UI.reduced())) { window.removeEventListener('pointermove', onMove); return; }
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now;
      if (now - mouseT > 2500) { const t = now / 1000; tx = Math.sin(t * 0.37) * 0.45; ty = Math.sin(t * 0.29 + 1.3) * 0.35; }
      // critically damped spring (omega 6), integrated in two half steps for stability
      for (let k = 0; k < 2; k++) {
        const h = dt / 2, w = 6;
        vx += (w * w * (tx - x) - 2 * w * vx) * h; x += vx * h;
        vy += (w * w * (ty - y) - 2 * w * vy) * h; y += vy * h;
      }
      for (let i = 0; i < layers.length; i++) {
        const L = layers[i], px = x * L[1], py = y * L[2], c = w0[i];
        if (Math.abs(px - c.x) < 0.05 && Math.abs(py - c.y) < 0.05) continue;
        c.x = px; c.y = py;
        L[0].style.transform = 'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0)';
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(step);
    void raf;
  }

  const PRESET_ART = {
    easy: '<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="24" fill="#3ddc97" stroke="#1e1a4d" stroke-width="3.5"/><circle cx="24" cy="30" r="3.4" fill="#1e1a4d"/><circle cx="40" cy="30" r="3.4" fill="#1e1a4d"/><path d="M22 40q10 9 20 0" stroke="#1e1a4d" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M52 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM10 8l1.5 3.5 3.5 1.5-3.5 1.5L10 18l-1.5-3.5L5 13l3.5-1.5z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    classic: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#33b5ff" stroke="#1e1a4d" stroke-width="3.5"/><circle cx="32" cy="32" r="12" fill="#fff" stroke="#1e1a4d" stroke-width="3"/><path d="M32 4v14M32 46v14M4 32h14M46 32h14" stroke="#1e1a4d" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="3.5" fill="#ff6b8b"/></svg>',
    pro: '<svg viewBox="0 0 64 64"><circle cx="30" cy="34" r="22" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="3.5"/><circle cx="30" cy="34" r="13" fill="#fff" stroke="#1e1a4d" stroke-width="3"/><circle cx="30" cy="34" r="5" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="2.5"/><path d="M44 4L36 22h8l-4 14 14-20h-8l6-12z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  };

  // ------------------------------------------------------------------ title
  // "Tap to play" in the words of the device in hand: tap (touch), click (keyboard / mouse) or the pad's A glyph
  // inside the localized line (title.pad, {a} = where the glyph goes, so every language keeps its own word order).
  // A device switch on the title relabels the button in place (no rebuild: the logo would pop in again).
  function tapLabel(btn) {
    const dev = G.input && G.input.device;
    if (btn.dataset.dev === dev + '|' + G.i18n.lang) return;
    btn.dataset.dev = dev + '|' + G.i18n.lang;
    btn.textContent = '';
    if (dev === 'gamepad') {
      const parts = G.t('title.pad', { a: '\u0001' }).split('\u0001');
      btn.append(parts[0] || '', el('span.pad-g.a.mm-tap-g', { text: 'A', 'aria-hidden': 'true' }), parts.slice(1).join(''));
      btn.setAttribute('aria-label', G.t('title.pad', { a: 'A' }));
    } else {
      btn.textContent = G.t(dev === 'desktop' ? 'title.click' : 'title.tap');
      btn.removeAttribute('aria-label');
    }
  }
  G.bus.on('device', () => { const b = document.querySelector('[data-screen="title"] .mm-tap'); if (b) G.safe('title tap label', () => tapLabel(b)); });
  M.def('title', {
    dim: false,
    escClose: false,
    build(p, close) {
      const logo = el('div.mm-logo');
      // Each letter: pop-in (staggered), bob (staggered), and a shine copy (::after, data-ch) whose
      // flash runs across the word via --i.
      const word = (txt, cls, base) => {
        const row = el('div.mm-logo-row' + (cls ? '.' + cls : ''));
        Array.from(txt).forEach((ch, i) => {
          const c = ch === ' ' ? ' ' : ch;
          const s = el('span', { text: c, 'data-ch': c });
          s.style.transform = 'rotate(' + (((i * 37) % 9) - 4) + 'deg)';
          s.style.animationDelay = (0.08 + (base + i) * 0.045).toFixed(3) + 's, ' + ((base + i) * 0.09).toFixed(2) + 's';
          s.style.setProperty('--i', String(base + i));
          row.appendChild(s);
        });
        return row;
      };
      logo.append(word('MARMALUNE', '', 0), word('RANGERS', 'r2', 9));
      // twinkles around the logo (% of the logo box), staggered so one or two are always lit
      [[-4, 8, ''], [101, 4, 'b'], [96, 64, 'c'], [-2, 70, 'b'], [30, -10, 'c'], [70, 96, '']].forEach(([x, y, k], i) => {
        const sp = el('i.mm-spark' + (k ? '.' + k : ''));
        sp.style.left = x + '%'; sp.style.top = y + '%'; sp.style.animationDelay = (0.9 + i * 0.43).toFixed(2) + 's';
        logo.appendChild(sp);
      });
      // a real button (keyboard Tab + Enter, screen readers) and the pad's default focus (data-pad="default"); a tap
      // anywhere else on the title still starts too. Its words follow the input device (tap / click / the pad's A).
      const tap = el('button.mm-tap', { type: 'button', 'data-pad': 'default', onclick: () => start() });
      tapLabel(tap);
      const langName = (G.i18n.langs.find(l => l.code === G.i18n.lang) || {}).name || 'English';
      const langBtn = G.UI.btn(langName, ev => { ev.stopPropagation(); G.Audio && G.Audio.unlock && G.Audio.unlock(); G.UI.open('lang-pick', { onDone: () => G.UI.refresh() }); }, 'small', { icon: I.globe, raw: true, title: G.t('title.lang') });
      const setBtn = G.UI.btn('title.settings', ev => { ev.stopPropagation(); G.Audio && G.Audio.unlock && G.Audio.unlock(); G.UI.open('settings'); }, 'small', { icon: I.gear });
      const tagline = el('div.mm-tagline', { text: G.t('title.tagline') });
      // top-left: Full screen (where the Fullscreen API works); on iPhone Safari a one-time "Add to Home Screen" banner
      // instead (99_main G.PWA; both stay away where the game already runs without browser bars)
      injectCss();
      const fsBtn = G.PWA && G.PWA.fsButton ? G.PWA.fsButton() : null;
      const homeHint = G.PWA && G.PWA.homeBanner ? G.PWA.homeBanner() : null;
      const root = el('div.mm-title',
        logo,
        tagline,
        tap,
        fsBtn ? el('div.mm-corner.tl', fsBtn) : null,
        homeHint,
        el('div.mm-corner.bl', langBtn),
        el('div.mm-corner.br', setBtn),
        el('div.mm-corner.tr', el('span.mm-ver', { text: G.t('title.version', { v: (G.VERSION || '1.0') + (G.BUILD && G.BUILD.commit ? ' · ' + G.BUILD.commit : '') }) })));
      parallax(root, [[logo, 14, 9], [tagline, 7, 4], [tap, 4, 3]]);
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        if (G.Audio) { if (G.Audio.unlock) G.Audio.unlock(); G.Audio.sfx('go'); }
        if (M.firstRun()) {
          // one card: control style (+ the language chip in its header), then the tutorial
          G.UI.open('preset-pick', { first: true, onDone: () => leaveTitle(close) });
          started = false;
        } else { leaveTitle(close); started = false; }
      };
      root.addEventListener('click', ev => { if (ev.target.closest('button')) return; start(); });
      return root;
    },
  });

  // ------------------------------------------------------------------ language picker (endonyms, never flags)
  M.def('lang-pick', {
    modal: true,
    escClose: false,
    build(p, close, entry) {
      const cur = entry.sel || G.i18n.lang;
      const grid = el('div.mm-langs');
      for (const l of G.i18n.langs) {
        const b = el('button.mm-lang' + (l.code === cur ? '.on' : ''), { type: 'button', lang: l.code, text: l.name, onclick: () => {
          entry.sel = l.code;
          G.Save.set.lang = l.code; G.i18n.set(l.code); G.Save.save();
          G.UI.refresh(entry);
          const t = G.UI.stack.find(s => s.id === 'title'); if (t) G.UI.refresh(t);
        } });
        grid.appendChild(b);
      }
      const ok = G.UI.btn('title.ok', () => { G.Save.set.langChosen = true; G.Save.save(); close(); if (p.onDone) p.onDone(); }, 'primary big', { icon: I.check });
      if (!entry.pulsed) { entry.pulsed = true; ok.classList.add('mm-pulse'); setTimeout(() => ok.classList.remove('mm-pulse'), 4000); }
      const panel = G.UI.panel('title.pickLang', p.first ? null : close, [grid], { icon: I.globe, foot: el('div.mm-row.center', ok), style: { maxWidth: '720px', background: '#fff6e0', borderWidth: '4px', borderRadius: '24px' } });
      panel.classList.add('mm-pop');
      return panel;
    },
  });

  // ------------------------------------------------------------------ control style picker
  // Language chip for the picker header (endonym; opens the language card on top).
  function langChip(entry) {
    const name = (G.i18n.langs.find(l => l.code === G.i18n.lang) || {}).name || 'English';
    const b = G.UI.btn(name, ev => { ev.stopPropagation(); G.UI.open('lang-pick', { onDone: () => { if (G.UI.stack.includes(entry)) G.UI.refresh(entry); } }); }, 'small', { icon: I.globe, raw: true, title: G.t('title.lang') });
    b.classList.add('mm-langchip');
    b.lang = G.i18n.lang;
    return b;
  }
  const card = (on, badge, art, title, desc, chips, onclick) => el('button.mm-preset' + (on ? '.on' : ''), { type: 'button', onclick },
    badge ? el('span.mm-badge', { text: G.t('title.recommended') }) : null,
    el('div.mm-pic', { html: art }),
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 } },
      el('h3', { text: title }), el('p', { text: desc }),
      chips && chips.length ? el('div.mm-row', chips.map(k => el('span.mm-tag' + (k === 'title.chip.autoOn' ? '.mint' : ''), { text: G.t(k) }))) : null));
  // Touch: Easy / Classic / Pro (assistance only). A controller sees the same three cards as aim help only: auto-fire
  // and button size mean nothing on a pad (12_player fires by itself on touch alone), while aim help does apply.
  // Picking Easy on the first run still starts on Breezy, as on touch.
  const PAD_CHIPS = { easy: ['title.chip.aimStrong'], classic: ['title.chip.aimStd'], pro: ['title.chip.aimLow'] };
  function touchBody(p, entry, sel) {
    const cards = el('div.mm-presets'), pad = !!(G.input && G.input.device === 'gamepad');
    for (const id of ['easy', 'classic', 'pro']) cards.appendChild(card(id === sel, id === 'classic', PRESET_ART[id], G.t('title.preset.' + id), G.t('title.preset.' + id + (pad ? 'P' : 'D')), pad ? PAD_CHIPS[id] : PRESETS[id].chips, () => { entry.sel = id; M.sfx('tab'); G.UI.refresh(entry); }));
    return [cards];
  }
  // Desktop: difficulty (the two starting ones; Spicy / Blazing once earned) + mouse look speed.
  const DIFF_ART = { breezy: PRESET_ART.easy, normal: PRESET_ART.classic, spicy: PRESET_ART.pro, blazing: PRESET_ART.pro };
  function deskBody(p, entry, dsel) {
    const s = G.Save.set, cards = el('div.mm-presets');
    for (const d of DIFFS) {
      if (d !== 'breezy' && d !== 'normal' && !diffOpen(d)) continue;
      cards.appendChild(card(d === dsel, d === 'normal', DIFF_ART[d], G.t('set.diff.' + d), G.t('title.desk.' + d + 'D'), null, () => { entry.dsel = d; M.sfx('tab'); G.UI.refresh(entry); }));
    }
    if (cards.children.length !== 3) cards.classList.add('n' + cards.children.length);
    const val = el('b.mm-sensval');
    const inp = el('input', { type: 'range', min: 0.3, max: 2.5, step: 0.05, value: s.sens, 'aria-label': G.t('title.desk.sens') });
    const show = () => { val.textContent = (+inp.value).toFixed(2) + '×'; };
    inp.addEventListener('input', () => { s.sens = +inp.value; show(); G.Save.save(); });
    show();
    const sens = el('div.mm-sens', el('span.mm-sens-ico', { html: MOUSE_SVG }), el('b', { text: G.t('title.desk.sens') }),
      el('small', { text: G.t('title.desk.slow') }), inp, el('small', { text: G.t('title.desk.fast') }), val);
    return [cards, sens];
  }
  M.def('preset-pick', {
    modal: true,
    escClose: false,
    build(p, close, entry) {
      injectCss();
      const s = G.Save.set, desk = M.desktopPick();
      // a returning player from before presets existed starts on the card closest to how they already play
      // (just pressing Go keeps their own values and difficulty); a new player starts on the recommended Classic
      let back = false;
      try { back = !!(G.Tutorial && G.Tutorial.needed && !G.Tutorial.needed()); } catch (e) { back = false; }
      const guess = back ? (s.autoFire ? 'easy' : s.aimAssist <= 0.4 ? 'pro' : 'classic') : 'classic';
      const sel = entry.sel || s.preset || guess;
      const dsel = entry.dsel || (DIFFS.includes(s.difficulty) && diffOpen(s.difficulty) ? s.difficulty : 'normal');
      const body = desk ? deskBody(p, entry, dsel) : touchBody(p, entry, sel);
      const go = G.UI.btn(p.first ? 'title.go' : 'title.ok', () => {
        if (desk) {
          // touch assistance defaults (a returning player's own values stay as they are), and onboarding is done
          if (!s.preset) { if (back) s.preset = guess; else M.applyPreset('classic'); }
          if (diffOpen(dsel)) s.difficulty = dsel;
          G.Save.save(true);
        } else {
          const id = entry.sel || sel;
          // (a returning player who just confirms keeps their own aim help / auto-fire values)
          if (back && !entry.sel && !s.preset) { s.preset = id; G.Save.save(true); } else M.applyPreset(id);
          // (the Breezy note is shown inline on the Easy card's footer instead of a toast that would cover the tutorial)
          if (id === 'easy' && s.difficulty === 'normal' && p.first && !back) { s.difficulty = 'breezy'; G.Save.save(); }
          else if (!p.first) G.UI.toast(G.t('title.presetSet', { name: G.t('title.preset.' + id) }), { icon: I.check });
        }
        close();
        if (p.onDone) p.onDone();
      }, 'primary big', { icon: I.play });
      const easyNote = !desk && sel === 'easy' && p.first && !back && s.difficulty === 'normal';
      const note = el('span.mm-note' + (easyNote ? '.good' : ''), { text: G.t(desk ? 'title.presetNoteDesk' : easyNote ? 'title.breezy' : 'title.presetNote'), style: { maxWidth: '320px' } });
      const panel = G.UI.panel('title.pickPreset', p.first ? null : close, body,
        { icon: desk ? MOUSE_SVG : I.gear, headRight: langChip(entry), foot: el('div.mm-row.center', { style: { gap: '14px', flexWrap: 'nowrap' } }, go, note), style: { maxWidth: '860px', background: '#fff6e0', borderWidth: '4px', borderRadius: '24px' } });
      panel.classList.add('mm-pop');
      return panel;
    },
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 30c_menus_title.js]', e); }
})();
