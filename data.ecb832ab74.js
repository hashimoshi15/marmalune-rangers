/* Marmalune Rangers — data: 13_data.js 13b_wardrobe.js 14_progress.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 13_data.js
try { (function () {
// 13_data.js — G.Data: the game catalogue (rarity, parts, weapons, turf kits, gear, gadgets, mods,
// recipes, shop, XP/ranks, guild, rewards, difficulty, loot, enemies/bosses display info, quests,
// dailies/weeklies, stickers, tips) + profile defaults and derived helpers:
//   defaultProfile(), playerStats(p?), loadout(p?), gadget(p?), diffId(), difficultyMult(kind),
//   rollLoot(table, opts|luck), rollRarity(table, opts), partColor(id, rarity), partIcon(id),
//   icon(name), gearStats(id, lvl), weaponStats(id, lvl, mods, tune), maxAmmo(id, p?), modFits(mod, weapon).
// Progression logic (wallet, crafting, quests, stickers) lives in 14_progress.js.
(function (G) {
  'use strict';
  const D = G.Data = G.Data || {};
  const U = G.util;

  // ------------------------------------------------------------------ strings (en + ja)
  const EN = {}, JA = {};
  const S = (key, en, ja) => { EN[key] = en; JA[key] = ja; };
  // N(prefix, id, [enName, jaName], [enDesc, jaDesc])
  const N = (prefix, id, nm, ds) => { S(prefix + '.' + id + '.name', nm[0], nm[1]); if (ds) S(prefix + '.' + id + '.desc', ds[0], ds[1]); };

  // Currencies, rarity, difficulty
  S('cur.clinks', 'Clinks', 'クリンク'); S('cur.lumite', 'Lumite', 'ルマイト');
  S('cur.sprocket', 'Star Sprockets', 'スタースプロケット'); S('cur.stamps', 'Guild Stamps', 'ギルドスタンプ');
  S('rarity.common', 'Common', 'コモン'); S('rarity.uncommon', 'Uncommon', 'アンコモン'); S('rarity.rare', 'Rare', 'レア');
  S('rarity.epic', 'Epic', 'エピック'); S('rarity.legendary', 'Legendary', 'レジェンド'); S('rarity.prismatic', 'Prismatic', 'プリズマティック');
  S('rarity.mythic', 'Prismatic', 'プリズマティック');
  S('diff.breezy', 'Breezy', 'そよかぜ'); S('diff.normal', 'Normal', 'ふつう'); S('diff.spicy', 'Spicy', 'ピリから'); S('diff.blazing', 'Blazing', 'もえもえ');
  S('diff.breezy.desc', 'Relaxed: bots hit softly and slowly.', 'のんびり：ボットのこうげきが よわくて ゆっくり。');
  S('diff.normal.desc', 'The way Marmalune is meant to be played.', 'ふつうのむずかしさ。おすすめ！');
  S('diff.spicy.desc', 'Tougher bots, better loot and rewards.', 'ボットが強くなるかわりに、ごほうびアップ！');
  S('diff.blazing.desc', 'For ace rangers: fierce bots, the best rewards.', 'エースむけ：とても強いボット、さいこうのごほうび。');

  // Stats labels
  const STAT = {
    damage: ['Damage', 'ダメージ'], rate: ['Fire rate', 'れんしゃ'], range: ['Range', 'しゃてい'], ammo: ['Ammo', 'だんすう'],
    spread: ['Spread', 'ばらつき'], dps: ['Power', 'パワー'], aoe: ['Blast radius', 'はんい'], heat: ['Heat', 'ねつ'],
    charge: ['Charge time', 'チャージ'], shield: ['Shield', 'シールド'], hp: ['Max HP', 'さいだいHP'], regen: ['Regen', 'かいふく'],
    speed: ['Speed', 'スピード'], jump: ['Jump', 'ジャンプ'], magnet: ['Magnet', 'マグネット'], cooldown: ['Cooldown', 'クールダウン'],
    level: ['Level', 'レベル'], xp: ['XP', 'XP'], mods: ['Mods', 'MOD'], power: ['Power', 'パワー'], capacity: ['Capacity', 'キャパシティ'],
    handling: ['Handling', 'ハンドリング'], owned: ['Owned', 'もっている'], price: ['Price', 'ねだん'], sell: ['Sell', 'うる'],
    need: ['Need', 'ひつよう'], have: ['Have', 'もちもの'], duration: ['Duration', 'こうか時間'], radius: ['Radius', 'はんけい'],
    knockback: ['Knockback', 'ノックバック'], tank: ['Tank use', 'タンクしょうひ'], hits: ['Hits to KO', 'ダウンまでの回数'],
    paint: ['Paint', 'ぬり'], special: ['Special', 'スペシャル'], tier: ['Tier', 'ランク'], pops: ['Pops', 'ポップ数'], time: ['Time', 'タイム'],
  };
  for (const k in STAT) S('stat.' + k, STAT[k][0], STAT[k][1]);
  const SLOT = { head: ['Head', 'あたま'], body: ['Body', 'からだ'], back: ['Back', 'せなか'], feet: ['Feet', 'あし'], trinket: ['Trinket', 'おまもり'], weapon: ['Weapon', 'ぶき'], gadget: ['Gadget', 'ガジェット'], ability: ['Ability', 'アビリティ'] };
  for (const k in SLOT) S('slot.' + k, SLOT[k][0], SLOT[k][1]);
  const ROLE = {
    pistol: ['Starter pistol', 'スターターピストル'], shotgun: ['Shotgun', 'ショットガン'], grenade: ['Grenade launcher', 'グレネード'],
    chain: ['Chain beam', 'チェーンビーム'], ricochet: ['Ricochet disc', 'はねかえりディスク'], sniper: ['Charge sniper', 'チャージスナイパー'],
    minigun: ['Minigun', 'ミニガン'], rockets: ['Lock-on rockets', 'ロックオンロケット'], summon: ['Summon', 'しょうかん'],
    control: ['Crowd control', 'おどらせる'], transform: ['Transform', 'へんしんさせる'], frost: ['Frost cone', 'ひえひえ'],
    painter: ['Painter rifle', 'ペイントライフル'], roller: ['Roller', 'ローラー'], ultimate: ['Ultimate', 'アルティメット'],
  };
  for (const k in ROLE) S('weapon.role.' + k, ROLE[k][0], ROLE[k][1]);
  S('fam.tidy', 'Tidy', 'シンプル'); S('fam.tradeoff', 'Trade-off', 'トレードオフ'); S('fam.wild', 'Wild', 'ワイルド');
  S('tune.power', 'Power', 'パワー'); S('tune.capacity', 'Capacity', 'キャパシティ'); S('tune.handling', 'Handling', 'ハンドリング');

  // Weapons: name, desc, W5 MAX behavior
  const WSTR = {
    fizz: ['Fizz Blaster', 'フィズブラスター', 'Your trusty starter. It never runs out, but let it cool down before it overheats!', 'たよれるスターター武器。弾はむげんだけど、熱くなりすぎたら少し休ませてね！', 'Shots ricochet to a nearby bot.', 'たまが近くのボットにはねかえる。'],
    scatter: ['Pop Scatter', 'ポップスキャッター', 'A popcorn-powered shotgun. Great up close, and it bonks bots back!', 'ポップコーンパワーのショットガン。近くでつよい！ボットをはじきとばすよ。', '12 pellets and extra knockback.', 'たまが12発に。ノックバックもアップ。'],
    lobber: ['Bubble Lobber', 'バブルロバー', 'Lobs bouncy bubbles that burst in a big splash. Hold to see the arc.', 'はずむバブルをなげて、大きくはじけさせる。長おしで きどうが見えるよ。', 'Bursts split into 3 mini-bubbles.', 'はじけると ミニバブル3こに分かれる。'],
    zap: ['Zap Coil', 'ザップコイル', 'A zappy beam that chains to two more bots nearby.', 'ビリビリビームが 近くのボット2体にもつながるよ。', 'Chains to 4 bots and slows them.', '4体までつながって、スピードを下げる。'],
    saw: ['Saw Skipper', 'ソースキッパー', 'Flings a spinning disc that ricochets between bots and walls.', 'くるくるディスクをとばして、ボットやカベにはねかえらせる。', 'Fires 2 discs in a V.', 'ディスクを2まい V字にとばす。'],
    lancer: ['Beam Lancer', 'ビームランサー', 'Hold to charge a mega beam. Aim for weak spots!', '長おしでメガビームをチャージ。弱点をねらおう！', 'Full charge pierces 3 bots.', 'フルチャージで3体をつらぬく。'],
    gatling: ['Gale Gatling', 'ゲイルガトリング', 'Spins up into a whirlwind of shots. You move a bit slower while firing.', '回りだしたら たまのあらし！うっているあいだは少しおそくなるよ。', 'Every 10th round is a mini-blast.', '10発ごとにミニばくはつ。'],
    swarm: ['Confetti Swarm', 'かみふぶきスウォーム', 'Hold to lock onto up to 4 bots, then release for homing confetti rockets.', '長おしで4体までロックオン。はなすと かみふぶきロケットがおいかける！', '6 locks; rockets split into bomblets.', '6体ロック。ロケットが小ばくだんに分かれる。'],
    buddy: ['Buddy Hive', 'バディハイブ', 'Deploys two helper bots that orbit you and shoot for you.', 'おてつだいボットを2体出して、いっしょにたたかってもらう。', '3 buddies; their shots chain.', 'バディが3体に。たまがつながる。'],
    groove: ['Groove Globe', 'グルーヴボール', 'Throw a disco ball and nearby bots can\'t stop dancing!', 'ミラーボールをなげると、まわりのボットがおどりだす！', 'Explodes when the song ends.', '曲がおわると ばくはつ！'],
    bloom: ['Bloom Bomb', 'おはなボム', 'Turns bots into harmless potted plants for a few seconds.', 'ボットを少しのあいだ、うえきばちの花にかえちゃう。', 'Plants take damage over time.', '花になったボットに じわじわダメージ。'],
    chill: ['Chill Mister', 'ひえひえミスター', 'A frosty mist that slows bots, then freezes them solid.', 'つめたいミストで ボットをおそくして、カチコチにこおらせる。', 'Longer cone, faster freeze.', 'ミストが長くなり、早くこおる。'],
    splat: ['Goo Splatter', 'グースプラッター', 'A goo rifle that paints the ground and slows bots in puddles.', 'じめんをぬれるグーライフル。グーの水たまりでボットがおそくなる。', 'Bigger paint splats, longer range.', 'ぬりがひろく、しゃていも長く。'],
    roller: ['Wide Roller', 'ワイドローラー', 'Hold to roll a wide goo strip, tap to flick a splashy wave.', '長おしでグーをころがしてぬる。タップでバシャッとはねとばす。', 'Wider strip, longer flicks.', 'ぬるはばが広く、とばしも遠く。'],
    prism: ['Prism Party Cannon', 'プリズムパーティーキャノン', 'The ultimate! Lock up to 8 targets for a rainbow rocket party.', 'さいきょう武器！8体ロックオンして にじいろロケットパーティー！', 'Rainbow trails pop into bomblets.', 'にじのしっぽが 小ばくだんになる。'],
  };
  for (const id in WSTR) { const a = WSTR[id]; N('weapon', id, [a[0], a[1]], [a[2], a[3]]); S('weapon.' + id + '.max', a[4], a[5]); }

  // Goo Turf kits
  const TSTR = {
    fizz: ['Fizz Blaster', 'フィズブラスター', 'Quick shots that leave a trail of goo droplets. 4 hits to splat a rival.', 'すばやいたまで グーのしずくをのこす。4発でライバルをスプラット。'],
    scatter: ['Pop Scatter', 'ポップスキャッター', 'Splashy blobs up close. Can splat in one or two blasts.', '近くでバシャッとぬる。1〜2発でスプラット。'],
    lobber: ['Bubble Lobber', 'バブルロバー', 'Big round splats from afar. A direct hit splats at once.', '遠くに大きなまるいぬり。ちょくげきで一発スプラット。'],
    zap: ['Zap Coil', 'ザップコイル', 'Paints dots at the end of its beam while it zaps.', 'ビームの先に 点々とグーをぬる。'],
    saw: ['Saw Skipper', 'ソースキッパー', 'Paints a splat on every bounce plus a thin trail.', 'はねるたびにぬって、細い線ものこす。'],
    lancer: ['Beam Lancer', 'ビームランサー', 'Paints a long straight line. A full charge splats instantly.', 'まっすぐ長い線をぬる。フルチャージで一発スプラット。'],
    gatling: ['Gale Gatling', 'ゲイルガトリング', 'Sprays lots of little splats. Great for holding a lane.', '小さなぬりをたくさんまく。みちをまもるのにぴったり。'],
    swarm: ['Confetti Swarm', 'かみふぶきスウォーム', 'Homing rockets that paint round splats where they land.', 'おいかけるロケットが 着地したところをまるくぬる。'],
    chill: ['Chill Mister', 'ひえひえミスター', 'Paints a cone strip and slows rivals.', 'せんじょうにぬって、ライバルをおそくする。'],
    splat: ['Goo Splatter', 'グースプラッター', 'The painter\'s rifle: fast, cheap and splashy.', 'ペイントのきほん！はやくて タンクにやさしい。'],
    roller: ['Wide Roller', 'ワイドローラー', 'Roll a wide strip of goo, or flick a big wave.', '広いはばでぬったり、大きな波をとばしたり。'],
  };
  for (const id in TSTR) { const a = TSTR[id]; N('turfw', id, [a[0], a[1]], [a[2], a[3]]); }
  N('turfsp', 'storm', ['Goo Storm', 'グーストーム'], ['Throw a goo cloud that drifts and paints a strip.', 'グーの雲をなげて、ただよいながらぬっていく。']);
  N('turfsp', 'splash', ['Mega Splashdown', 'メガスプラッシュダウン'], ['Leap and slam down for a huge splash.', 'ジャンプして ドーン！大きくぬりひろげる。']);
  N('turfsp', 'triple', ['Triple Splash', 'トリプルスプラッシュ'], ['Lob three mega-blobs in a row.', '大きなグーを3つ なげる。']);
  N('turfsp', 'bubble', ['Bubble Bomb', 'バブルボム'], ['Sticky bomb that bursts one second after landing.', 'くっついて1秒後にはじけるボム。']);

  // Parts
  const PSTR = {
    scrap: ['Scrap Plate', 'スクラッププレート', 'A bent metal plate. Every bot drops these.', 'まがった金属の板。どのボットもよく落とすよ。'],
    spring: ['Coil Spring', 'コイルバネ', 'A bouncy silver coil. Hoppers are full of them.', 'ぼよんとはずむ銀のバネ。ホッパーがよく持ってる。'],
    wire: ['Wire Noodle', 'ワイヤーヌードル', 'A curly blue wire. Bumblers and Zappers drop it.', 'くるくるの青いワイヤー。バンブラーやザッパーが落とす。'],
    gel: ['Goo Gel', 'グージェル', 'A wobbly lime jelly cube from Squirts and Turf matches.', 'プルプルのライムゼリー。スクワートやグーターフで手に入る。'],
    chip: ['Circuit Chip', 'かいろチップ', 'A tiny green brain for gadgets.', 'ガジェットの小さな みどりの頭脳。'],
    fuel: ['Fizz Fuel', 'フィズねんりょう', 'A can of super-fizzy fuel. Shake carefully!', 'シュワシュワのねんりょう。ふりすぎ注意！'],
    crystal: ['Coral Crystal', 'サンゴクリスタル', 'A glowing pink prism grown in the reefs.', 'サンゴしょうで育った、光るピンクのクリスタル。'],
    servo: ['Servo Motor', 'サーボモーター', 'A sturdy brass motor from big bots.', '大きなボットから出る、がんじょうなモーター。'],
    lens: ['Focus Lens', 'フォーカスレンズ', 'A violet lens from Gnat Snipers.', 'ナットスナイパーの むらさきのレンズ。'],
    core: ['Gizmo Core', 'ギズモコア', 'A glowing power orb. Elites and Tote-copters carry them.', 'かがやくパワーのたま。エリートやトートコプターが持ってる。'],
    lumite: ['Lumite', 'ルマイト', 'A rare cyan star crystal used for Tune-Ups and top recipes.', 'チューンナップや すごいレシピにつかう、めずらしい星のクリスタル。'],
    claw: ['Crankcrab Claw', 'クランククラブのハサミ', 'A giant orange claw from CRANKCRAB.', 'クランククラブの大きなオレンジのハサミ。'],
    heart: ['Hive Heart', 'ハイブハート', 'A golden honeycomb heart from QUEEN BUZZHIVE.', 'クイーン・バズハイブの金色のハチの巣ハート。'],
    medal: ['Mox Medallion', 'モックスメダル', 'A big coin with a top hat, dropped by VEND-O-TITAN.', 'ベンド・オ・タイタンが落とす、シルクハットの大きなコイン。'],
    sprocket: ['Star Sprocket', 'スタースプロケット', 'A shiny star-gear hidden somewhere on Marmalune.', 'マーマルーンのどこかに かくれている、キラキラの星の歯車。'],
  };
  for (const id in PSTR) { const a = PSTR[id]; N('part', id, [a[0], a[1]], [a[2], a[3]]); }

  // Gear
  const GSTR = {
    shield1: ['Bubble Shield Mk1', 'バブルシールド Mk1', 'A bubbly shield that soaks 50 damage and refills itself.', '50ダメージをふせいで、自動でもどるバブルのシールド。'],
    shield2: ['Bubble Shield Mk2', 'バブルシールド Mk2', 'A thicker bubble: 75 shield.', 'もっとぶあついバブル：シールド75。'],
    shield3: ['Bubble Shield Mk3', 'バブルシールド Mk3', 'A sturdy bubble: 100 shield.', 'がんじょうなバブル：シールド100。'],
    shield4: ['Bubble Shield Mk4', 'バブルシールド Mk4', 'The best bubble: 125 shield that refills faster.', 'さいこうのバブル：シールド125、もどるのも速い。'],
    beanie: ['Puffy Beanie', 'ふかふかビーニー', '+25 max HP and you get knocked back less.', 'さいだいHP+25。ふっとばされにくくなる。'],
    visor: ['Scout Visor', 'スカウトバイザー', 'Pings mark bots longer, shows Star Sprockets nearby and speeds up Beepo Scan.', 'マークが長もちし、近くのスタースプロケットがわかる。ビーポスキャンも早くなる。'],
    puffpack: ['Puff Pack', 'パフパック', 'A little jetpack: hold jump after your double jump to fly up.', '小さなジェットパック。2だんジャンプのあと ジャンプ長おしで上昇！'],
    wings: ['Glide Wings', 'グライドウィング', 'Hold jump while falling to glide gently.', 'おちるときにジャンプ長おしで、ふんわりかっくう。'],
    tankpack: ['Goo Tank Pack', 'グータンクパック', '+30% ammo, and your Goo Tank refills faster in Turf.', '弾+30%。グーターフではタンクのかいふくも速い。'],
    sneakers: ['Spring Sneakers', 'バネスニーカー', 'Jump higher and get a third hop in the air.', 'もっと高くジャンプ！空中で3だんめのジャンプもできる。'],
    skates: ['Slide Skates', 'スライドスケート', 'Faster, longer slides and speedy slide-jumps.', 'スライディングが速く長く、スライドジャンプもスピードアップ。'],
    magnet: ['Magnet Charm', 'マグネットチャーム', 'Pulls in Clinks and parts from much farther away.', 'クリンクやパーツを ずっと遠くからすいよせる。'],
    medipump: ['Medi-Pump', 'メディポンプ', 'Two quick heals of 50 HP. Charges refill over time.', '50HPかいふくが2回。時間でチャージされる。'],
  };
  for (const id in GSTR) { const a = GSTR[id]; N('gear', id, [a[0], a[1]], [a[2], a[3]]); }

  // Abilities / gadgets
  N('gadget', 'dash', ['Puff Dash', 'パフダッシュ'], ['A quick puff that zips you 5 m. You can\'t be hit mid-dash!', 'ポフッと5mダッシュ。ダッシュ中はこうげきが当たらない！']);
  N('gadget', 'scan', ['Beepo Scan', 'ビーポスキャン'], ['Beepo pings bots, crates and secrets through walls. Marked bots take extra damage.', 'ビーポがカベごしにボットや箱、ひみつを見つける。マークしたボットにダメージアップ。']);
  N('gadget', 'grapple', ['Grapple Ribbon', 'グラップルリボン'], ['Zip to glowing blue anchor rings.', '光る青いリングまで ビューンととんでいく。']);
  N('gadget', 'dome', ['Bubble Dome', 'バブルドーム'], ['Pop up a big bubble that blocks enemy shots.', '大きなバブルをはって、てきのたまをふせぐ。']);

  // Mods
  const MSTR = {
    m_power: ['Punch Chip', 'パンチチップ', '+8% damage.', 'ダメージ+8%。'],
    m_mag: ['Deep Pocket', 'ふかふかポケット', '+20% ammo (Fizz Blaster: less heat).', '弾+20%（フィズブラスターは ねつが少なくなる）。'],
    m_quick: ['Quick Trigger', 'クイックトリガー', '+8% fire rate (charge weapons charge faster).', 'れんしゃ+8%（チャージ武器はチャージが速く）。'],
    m_steady: ['Steady Grip', 'しっかりグリップ', '-25% spread.', 'ばらつき-25%。'],
    m_clink: ['Clink Magnet', 'クリンクマグネット', 'Bots popped with this weapon drop +15% Clinks.', 'この武器でポップすると クリンク+15%。'],
    m_glass: ['Glass Cannon', 'ガラスのたいほう', '+25% damage, but -20% ammo.', 'ダメージ+25%、でも弾-20%。'],
    m_hasty: ['Hasty Hands', 'せっかちハンド', '+20% fire rate, but -10% damage.', 'れんしゃ+20%、でもダメージ-10%。'],
    m_heavy: ['Heavy Hitter', 'ヘビーヒッター', '+15% damage and more knockback, but -15% fire rate.', 'ダメージ+15%・ノックバックアップ、でもれんしゃ-15%。'],
    m_bouncy: ['Bouncy Shots', 'ぽよんショット', 'Projectiles bounce once off surfaces.', 'たまが1回はねかえる。'],
    m_split: ['Splitter', 'スプリッター', 'Explosions spawn 2 mini-blasts.', 'ばくはつが ミニばくはつ2つに分かれる。'],
    m_frost: ['Frosty Tips', 'ひんやりチップ', 'Each hit chills bots a little.', '当てるたびにボットを少しひやす。'],
    m_juice: ['Juice Box', 'ジュースボックス', '3% of damage dealt refills your shield.', 'あたえたダメージの3%でシールドがもどる。'],
    m_goo: ['Goo Coat', 'グーコート', 'Turf: bigger paint. Field: hits leave slowing goo puddles.', 'ターフ：ぬりが大きく。フィールド：当てたところにグーの水たまり。'],
  };
  for (const id in MSTR) { const a = MSTR[id]; N('mod', id, [a[0], a[1]], [a[2], a[3]]); }

  // Enemies + bosses (codex blurbs: .desc and .tip)
  const ESTR = {
    bumbler: ['Bumbler', 'バンブラー', 'A bee-shaped hover drone with a buzzy propeller. It pings little pellets.', 'ハチみたいなホバードローン。プロペラでブンブン飛んで、小さなたまをうってくるよ。', 'Any weapon works. Just keep moving!', 'どの武器でもOK。うごきつづけよう！'],
    hopper: ['Hopper', 'ホッパー', 'A cylinder on a giant spring. It leaps high, then belly-flops!', '大きなバネにのった つつ型ボット。高くジャンプしてドスン！とおちてくる。', 'Shoot it mid-air for bonus damage.', '空中にいるときにうつと ダメージアップ！'],
    rollo: ['Rollo', 'ローロ', 'A striped ball bot that rolls in fast and goes boom.', 'しましまのボールボット。すごいスピードでころがってきて、ドカン！', 'Pop it early. Its blast bonks other bots too!', '早めにポップしよう。ばくはつは まわりのボットにもきくよ！'],
    squirt: ['Squirt', 'スクワート', 'A dome turret on a tripod that lobs sticky goo.', '三本足のドームたいほう。ネバネバのグーをとばしてくる。', 'Flank it, or lob a bubble over its dome.', '横から回りこむか、バブルロバーで上からねらおう。'],
    gnat: ['Gnat Sniper', 'ナットスナイパー', 'A stick-insect sniper with a big lens eye.', '大きなレンズの目をもつ ナナフシみたいなスナイパー。', 'When its laser flashes, dash or duck behind cover!', 'レーザーがピカッと光ったら、ダッシュか ものかげへ！'],
    shieldy: ['Shieldy', 'シールディ', 'A box bot hiding behind a heart-shaped riot plate.', 'ハートがたの たてにかくれた はこ型ボット。', 'Flank it, bounce a Saw Skipper, or splash it.', '横から回りこむか、ソースキッパーやばくはつでねらおう。'],
    lobba: ['Lobba', 'ロッバ', 'A squat bot with a back mortar that rains bombs.', 'せなかのほうだいから ばくだんをふらせる ずんぐりボット。', 'Watch the landing circles and close the distance.', '着地のサークルを見て、近づいてポップしよう。'],
    zapper: ['Zapper', 'ザッパー', 'A tesla-coil walker that sends out shock rings.', 'でんきのリングを出す テスラコイルのロボ。', 'Jump over the rings and keep your distance.', 'リングはジャンプでとびこえよう。きょりをとってね。'],
    pinch: ['Pinchbot', 'ピンチボット', 'A mini crab tank with a snappy claw and a cannon.', 'ハサミとたいほうをもった ミニカニタンク。', 'Get behind it: its rear vent is a weak spot.', 'うしろに回りこもう。おしりのダクトが弱点だよ。'],
    bruiser: ['Bruiser', 'ブルーザー', 'A big gorilla-shaped bot that slams and charges.', 'ドシン！ととっしんしてくる、ゴリラみたいな大型ボット。', 'Dodge its charge into a wall, then hit the back battery.', 'とっしんをかわしてカベにぶつけたら、せなかのバッテリーをねらえ！'],
    tote: ['Tote-copter', 'トートコプター', 'A delivery copter that drops more bots from its hatch.', 'ハッチから なかまのボットを落としてくる、おとどけヘリ。', 'Hit the rotor hub and pop it fast!', 'まんなかのローターをねらって、すばやくポップ！'],
    crankcrab: ['CRANKCRAB', 'クランククラブ', 'A giant crab tank guarding its Peach Mesas lair.', 'ピーチメサのすみかをまもる、きょだいなカニタンク。', 'Break a claw joint to open its face core.', 'ハサミのつけねをこわすと、顔のコアがひらくよ。'],
    buzzhive: ['QUEEN BUZZHIVE', 'クイーン・バズハイブ', 'A floating hive queen with orbiting hive pods.', 'ハイブポッドをまわらせて ういている、女王バチ型ボット。', 'Pop her pods first. She\'s tough while they spin.', 'まずはポッドをポップ！ポッドがあるあいだは かたいよ。'],
    titan: ['VEND-O-TITAN', 'ベンド・オ・タイタン', 'Mega-Mayor Mox\'s walking vending machine.', 'メガ市長モックスがのる、歩く じどうはんばいき。', 'Aim for the coin slot and hide from the Mega Beam.', 'コインの投入口をねらって、メガビームからはかくれよう。'],
    pinch_king: ['Pinchbot King', 'ピンチボットキング', 'A royal Pinchbot with a crown and extra armor.', 'かんむりをかぶった、ピンチボットの王さま。', 'Circle around to its rear vent.', 'ぐるっと回って おしりのダクトをねらおう。'],
  };
  for (const id in ESTR) { const a = ESTR[id]; N('enemy', id, [a[0], a[1]], [a[2], a[3]]); S('enemy.' + id + '.tip', a[4], a[5]); }
  S('enemy.elite', 'Elite {name}', 'エリート{name}');

  // Biomes, modes, tracks, classes
  // Region names: the single source for every screen (G.Exp.biomeName); quest / boss lines use the same names.
  const BSTR = { shoals: ['Sunny Shoals', 'サニーショール'], mesas: ['Peach Mesas', 'ピーチメサ'], grotto: ['Glowcap Grotto', 'ヒカリタケのもり'], frost: ['Frostfizz Bluffs', 'フロストフィズのがけ'], junk: ['Junkyard Rim', 'ガラクタ・リム'], hub: ['Fizzport', 'フィズポート'], space: ['Star Lanes', 'スターレーン'], turf: ['Turf Arenas', 'ターフアリーナ'] };
  for (const id in BSTR) N('biome', id, BSTR[id]);
  const MOSTR = {
    expedition: ['Expedition', 'たんけん', 'Explore an island, pop bots, grab parts and extract!', '島をたんけん！ボットをポップして、パーツを集めて だっしゅつしよう！'],
    race: ['Star Skiff Rally', 'スタースキフ・ラリー', 'Race star-skiffs through rings, drifts and boost pads.', 'スキフにのって リングやブーストパッドをかけぬけるレース！'],
    turf: ['Goo Turf', 'グーターフ', 'Paint the arena in your team\'s goo, 4 against 4.', '4対4で、アリーナをチームのグーでぬりつぶそう！'],
    royale: ['Sky Drop Royale', 'スカイドロップ・ロワイヤル', 'Drop in with 15 bot rangers. Be the last one standing!', '15人のボットレンジャーと とびおりて、さいごの1人をめざそう！'],
    defense: ['Fountain Guard', 'ファウンテンガード', 'Protect the Fizz Core from waves of robot raiders.', 'つぎつぎくるロボットから フィズコアをまもりぬこう！'],
    training: ['Training Range', 'トレーニング場', 'Practice moves, try weapons and chase medals.', 'うごきの練習、武器のおためし、メダルあつめ！'],
    boss: ['Boss Hunt', 'ボスハント', 'Rematch the big bosses for great loot.', '大ボスとリベンジマッチ！すごいおたからをゲット。'],
  };
  for (const id in MOSTR) { const a = MOSTR[id]; N('mode', id, [a[0], a[1]], [a[2], a[3]]); }
  const TRSTR = { coral_loop: ['Coral Comet Loop', 'コーラルコメットループ'], mesa_run: ['Mesa Meteor Run', 'メサメテオラン'], glowcap_gauntlet: ['Glowcap Gauntlet', 'グロウキャップガントレット'], frostfizz_spiral: ['Frostfizz Spiral', 'フロストフィズスパイラル'], junkyard_jumpline: ['Junkyard Jumpline', 'ジャンクヤードジャンプライン'], sunbeam_speedway: ['Sunbeam Speedway', 'サンビームスピードウェイ'], daily: ['Daily Track', 'きょうのコース'] };
  for (const id in TRSTR) N('track', id, TRSTR[id]);
  const CLSTR = { breeze: ['Breeze', 'ブリーズ'], gale: ['Gale', 'ゲイル'], storm: ['Storm', 'ストーム'], comet: ['Comet', 'コメット'] };
  for (const id in CLSTR) S('class.' + id, CLSTR[id][0], CLSTR[id][1]);
  const HSTR = {
    armored: ['Armored Bots', 'よろいボット', 'Bots have +30% HP.', 'ボットのHP+30%。'],
    zippy: ['Zippy Bots', 'すばしこボット', 'Bots move 20% faster.', 'ボットが20%すばやい。'],
    noregen: ['No Shield Regen', 'シールドかいふくなし', 'Your shield does not refill.', 'シールドが自動でもどらない。'],
    tight: ['Tight Timer', 'きびしいタイム', 'Par time is 25% shorter.', 'めやすタイムが25%みじかい。'],
    swarm: ['Elite Swarm', 'エリートだらけ', 'Elites appear 20% more often.', 'エリートが20%出やすい。'],
  };
  for (const id in HSTR) { const a = HSTR[id]; N('heat', id, [a[0], a[1]], [a[2], a[3]]); }

  // Ranks, guild, titles, cosmetics, toggles, items, ship
  const RANKS = [['Fresh Sprout', 'ふたばルーキー'], ['Puddle Jumper', 'みずたまジャンパー'], ['Reef Rookie', 'リーフルーキー'], ['Bolt Buddy', 'ボルトなかま'], ['Gizmo Buster', 'ギズモバスター'], ['Turf Trailblazer', 'ターフかいたくしゃ'], ['Sky Skipper', 'そらとぶスキッパー'], ['Star Ranger', 'スターレンジャー'], ['Reef Hero', 'リーフヒーロー'], ['Marmalune Legend', 'マーマルーンのでんせつ']];
  RANKS.forEach((r, i) => S('rank.' + (i + 1), r[0], r[1]));
  S('rank.star', 'Star Rank {n}', 'スターランク{n}');
  const GUILD_T = [['Rookie', 'ルーキー'], ['Scout', 'スカウト'], ['Ranger', 'レンジャー'], ['Ace', 'エース'], ['Hero', 'ヒーロー'], ['Legend', 'レジェンド']];
  GUILD_T.forEach((r, i) => S('guild.' + (i + 1), r[0], r[1]));
  S('title.legend', 'Legend', 'レジェンド'); S('title.seeker', 'Sprocket Seeker', 'スプロケットシーカー');
  const COS = {
    gauntlet_kiko: ['Kiko\'s Gauntlet', 'キコのガントレット'], hat_party: ['Beepo Party Hat', 'ビーポのパーティーぼうし'], hat_cap: ['Beepo Ranger Cap', 'ビーポのレンジャーぼう'],
    trail_bubbles: ['Bubble Trail', 'バブルトレイル'], hat_crown: ['Beepo Crown', 'ビーポのかんむり'], trail_stars: ['Star Trail', 'スタートレイル'],
    hat_wizard: ['Beepo Wizard Hat', 'ビーポのまほうつかいぼう'], skin_gold: ['Golden Gauntlet', 'ゴールドガントレット'], paint_streak: ['Silver Streak Paint', 'シルバーストリーク塗装'],
    paint_prismatic: ['Prismatic Paint', 'プリズマティック塗装'], paint_golden: ['Golden Skiff Paint', 'ゴールデンスキフ塗装'],
  };
  for (const id in COS) S('cos.' + id, COS[id][0], COS[id][1]);
  S('toggle.bigHead', 'Big Head Bots', 'でかあたまボット'); S('toggle.rainbowGoo', 'Rainbow Goo', 'にじいろグー'); S('toggle.lowGrav', 'Low Gravity', 'ふわふわ重力');
  const ITEMS = {
    healthPop: ['Health Pop', 'ヘルスポップ', 'Field snack: restores 25 HP. Carry up to 3.', 'フィールドのおやつ：HPを25かいふく。3こまで持てる。'],
    shieldCell: ['Shield Cell', 'シールドセル', 'Restores 25 shield. Carry up to 3.', 'シールドを25かいふく。3こまで持てる。'],
    revive: ['Revive Token', 'ふっかつトークン', 'Get back up once in a mission without using a badge.', 'ミッション中に1回、バッジをつかわずに ふっかつ。'],
    polish: ['Polish Kit', 'ピカピカキット', 'Raises a gear item one level (L3 needs 2 kits).', 'ギアのレベルを1つ上げる（L3には2こ ひつよう）。'],
    boostXp: ['Fizzy Float', 'フィズフロート', '+25% XP for your next 3 matches.', 'つぎの3試合、XP+25%。'],
    boostClinks: ['Clink Cookie', 'クリンククッキー', '+25% Clinks for your next 3 matches.', 'つぎの3試合、クリンク+25%。'],
  };
  for (const id in ITEMS) { const a = ITEMS[id]; N('item', id, [a[0], a[1]], [a[2], a[3]]); }
  S('item.bundle', '{name} ×{n}', '{name} ×{n}');
  S('ship.hull', 'Hull', 'ボディ'); S('ship.engine', 'Engine', 'エンジン'); S('ship.boost', 'Boost', 'ブースト'); S('ship.blaster', 'Blasters', 'ブラスター');
  const BLD = { guild: ['Guild Hall', 'ギルドホール'], workshop: ['Workshop', 'ワークショップ'], shop: ['Pop Shop', 'ポップショップ'], cafe: ['Fizz Café', 'フィズカフェ'], gallery: ['Gallery', 'ギャラリー'], training: ['Training Range', 'トレーニング場'], hangar: ['Hangar', 'ハンガー'], arena: ['Arena Gate', 'アリーナゲート'], tower: ['Royale Tower', 'ロワイヤルタワー'], fountain: ['Fizz Fountain', 'フィズのふんすい'], gate: ['South Gate', 'みなみの門'] };
  for (const id in BLD) N('bld', id, BLD[id]);

  // Loading-screen tips (≥ 20)
  const TIPS = {
    slide: ['Sprint, then slide to zoom under bars and keep your speed!', 'ダッシュからスライディングで、バーの下をすべりぬけよう！'],
    weak: ['Glowing spots are weak spots: hits there do 75% more damage.', '光っているところは弱点！ダメージが75%アップ。'],
    dash: ['Puff Dash makes you un-hittable for a split second.', 'パフダッシュ中は一しゅん こうげきが当たらないよ。'],
    heat: ['Fizz Blaster overheating? Stop firing for a moment to cool it.', 'フィズブラスターが熱くなったら、少しうつのをやめて冷まそう。'],
    vault: ['Parts go to the Vault when a mission ends. Crafting uses the Vault.', 'パーツはミッションのあとに 保管庫へ。クラフトは保管庫からつかうよ。'],
    quit: ['Leaving a mission keeps all your Clinks and half your parts.', 'ミッションを ぬけても、クリンクはぜんぶ、パーツは半分もらえるよ。'],
    hopper: ['Hoppers take extra damage while they are in the air.', 'ホッパーは空中にいるとき ダメージが大きくなる。'],
    rollo: ['Pop Rollos early. Their blast bonks other bots too!', 'ローロは早めにポップ！ばくはつは ほかのボットにもきくよ。'],
    gnat: ['A Gnat\'s laser flashes right before it fires. Dash!', 'ナットのレーザーは うつ直前に光る。ダッシュでよけよう！'],
    shieldy: ['Shieldy blocks from the front. Go around it!', 'シールディは前からのこうげきをふせぐ。横に回りこもう！'],
    rings: ['Shock rings are low: jump right over them.', 'でんきのリングはひくいよ。ジャンプでとびこえよう。'],
    combo: ['Pop bots without getting hit to raise your Clink combo.', 'ダメージを受けずにポップしつづけると、クリンクのコンボがアップ。'],
    levels: ['Weapons level up as you use them, all the way to MAX.', '武器はつかうほど レベルアップ。めざせMAX！'],
    tune: ['Spend Lumite on Tune-Ups at the Workshop.', 'ルマイトはワークショップのチューンナップにつかおう。'],
    mods: ['Mods are free to swap. Try different combos!', 'MODはつけかえ自由。いろいろためしてみよう！'],
    pin: ['Pin a recipe and Beepo will tell you when you can craft it.', 'レシピをピンどめすると、作れるようになったら ビーポが教えてくれる。'],
    turfdive: ['In Goo Turf, dive into your own goo to swim fast and refill.', 'グーターフでは 自分のグーにもぐると、はやく泳げてタンクもかいふく。'],
    turfwalls: ['Painted walls help you climb, but only the floor counts!', 'カベをぬると のぼれるけど、点数はゆかだけ！'],
    drift: ['In races, hold drift through corners for a big boost.', 'レースでは カーブでドリフトして、大きなブーストをゲット。'],
    ring: ['In Royale, stay inside the ring. The storm outside hurts!', 'ロワイヤルでは リングの中にいよう。外はダメージを受けるよ。'],
    turret: ['In Fountain Guard, spend Fizz Tokens on turrets and traps.', 'ファウンテンガードでは フィズトークンでタレットやワナを買おう。'],
    breezy: ['Too tricky? Try Breezy difficulty in Settings any time.', 'むずかしい？ せっていで いつでも「そよかぜ」にできるよ。'],
    sprockets: ['Star Sprockets hide on mesa tops, in caves and behind grapple routes.', 'スタースプロケットは メサの上や洞くつ、リボンの先にかくれている。'],
    dailies: ['Check the Guild Hall for daily quests and Guild Stamps.', 'ギルドホールで デイリークエストとギルドスタンプをチェック！'],
    cafe: ['Visit the Fizz Café every day for a free treat.', 'フィズカフェに まいにち行くと、おやつがもらえるよ。'],
    scan: ['Beepo Scan shows bots and secrets through walls.', 'ビーポスキャンで カベのむこうのボットやひみつが見える。'],
  };
  for (const id in TIPS) S('tip.' + id, TIPS[id][0], TIPS[id][1]);
  D.TIPS = Object.keys(TIPS).map(k => 'tip.' + k);

  G.i18n.add('en', EN);
  G.i18n.add('ja', JA);

  // ------------------------------------------------------------------ rarity
  D.RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'prismatic'];
  const RAR = (id, color, pips, beam, rdmg, w, o) => Object.assign({ id, color, css: U.cssHex(color), nameKey: 'rarity.' + id, pips, beam, royaleDmg: rdmg, w, order: D.RARITY_ORDER.indexOf(id), cls: 'rar-' + id }, o || {});
  D.RARITY = {
    common: RAR('common', 0xC9D1DC, 1, 0, 1.00, 45),
    uncommon: RAR('uncommon', 0x3DDC97, 2, 0, 1.08, 30, { sparkle: true }),
    rare: RAR('rare', 0x3FA9FF, 3, 1.5, 1.16, 17),
    epic: RAR('epic', 0xA66BFF, 4, 3, 1.24, 7, { chime: true }),
    legendary: RAR('legendary', 0xFFC21A, 5, 6, 1.32, 1, { fanfare: true, cls: 'rar-legendary' }),
    prismatic: RAR('prismatic', 0xFF8FE0, 5, 6, 1.32, 0, { star: true, prismatic: true, cls: 'rar-mythic' }),
  };
  D.RARITY.mythic = D.RARITY.prismatic; // CONTRACT alias (core pickups check 'mythic')
  D.rarityRank = r => { const R = D.RARITY[r]; return R ? R.order : 0; };
  // Hue-cycling color for prismatic items (0.25 Hz). t in seconds.
  D.prismaticColor = t => { const c = new THREE.Color(); c.setHSL(((t || 0) * 0.25) % 1, 0.85, 0.68); return c.getHex(); };

  // ------------------------------------------------------------------ parts
  const PART = (id, rarity, color, sell, o) => Object.assign({ id, rarity, color, sell, nameKey: 'part.' + id + '.name', descKey: 'part.' + id + '.desc' }, o || {});
  D.PARTS = {
    scrap: PART('scrap', 'common', 0xA9B4C8, 4),
    spring: PART('spring', 'common', 0xB9C6DC, 5),
    wire: PART('wire', 'common', 0x4FA8FF, 5),
    gel: PART('gel', 'uncommon', 0xA8E06A, 12),
    chip: PART('chip', 'uncommon', 0x3DDC97, 14),
    fuel: PART('fuel', 'uncommon', 0xFF9F45, 14),
    crystal: PART('crystal', 'rare', 0xFF7AC8, 40),
    servo: PART('servo', 'rare', 0xE8B44A, 45),
    lens: PART('lens', 'rare', 0x9B7BFF, 45),
    core: PART('core', 'epic', 0x5FE6FF, 140),
    lumite: PART('lumite', 'epic', 0x39D5FF, 0, { currency: true, noSell: true }),
    claw: PART('claw', 'legendary', 0xFF8A4C, 450, { boss: 'crankcrab' }),
    heart: PART('heart', 'legendary', 0xFFC21A, 450, { boss: 'buzzhive' }),
    medal: PART('medal', 'legendary', 0xFFD45C, 450, { boss: 'titan' }),
    sprocket: PART('sprocket', 'legendary', 0xFFC93C, 0, { collectible: true, noSell: true }),
  };
  // The 13 Vault parts (profile.parts keys). Lumite is a wallet currency, sprockets a collectible.
  D.PART_IDS = ['scrap', 'spring', 'wire', 'gel', 'chip', 'fuel', 'crystal', 'servo', 'lens', 'core', 'claw', 'heart', 'medal'];
  D.PARTS_BY_RARITY = { common: ['scrap', 'spring', 'wire'], uncommon: ['gel', 'chip', 'fuel'], rare: ['crystal', 'servo', 'lens'], epic: ['core'], legendary: ['claw', 'heart', 'medal'] };
  D.partColor = function (id, rarity) {
    const p = D.PARTS[id];
    if (p) return p.color;
    const r = D.RARITY[rarity];
    return r ? r.color : 0x7ff3ff;
  };

  // ------------------------------------------------------------------ icons (inline SVG, 24×24, ink outline)
  const INK = '#1e1a4d';
  const sv = body => '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">' + body + '</svg>';
  const st = (w) => ' stroke="' + INK + '" stroke-width="' + (w || 1.6) + '"';
  const PICON = {
    scrap: sv('<path d="M4 7l9-3 7 4-2 10-10 2-5-6z" fill="#A9B4C8"' + st() + '/><path d="M6.5 8.6l7-2.2" stroke="#fff" stroke-width="1.4" opacity=".8"/><circle cx="9" cy="14" r="1.3" fill="' + INK + '"/><circle cx="15" cy="12" r="1.3" fill="' + INK + '"/>'),
    spring: sv('<path d="M7 4.5h10M7 19.5h10"' + st(2.2) + '/><path d="M7 4.5c11 1 11 3.5 0 5c11 1 11 3.5 0 5c11 1 11 3.5 0 5" fill="none" stroke="' + INK + '" stroke-width="4"/><path d="M7 4.5c11 1 11 3.5 0 5c11 1 11 3.5 0 5c11 1 11 3.5 0 5" fill="none" stroke="#C9D5E8" stroke-width="2"/>'),
    wire: sv('<path d="M3 17c3-8 6 4 9-4s6 4 9-6" fill="none" stroke="' + INK + '" stroke-width="4.6"/><path d="M3 17c3-8 6 4 9-4s6 4 9-6" fill="none" stroke="#4FA8FF" stroke-width="2.6"/><circle cx="3" cy="17" r="1.6" fill="#FFD23F"' + st(1.2) + '/><circle cx="21" cy="7" r="1.6" fill="#FFD23F"' + st(1.2) + '/>'),
    gel: sv('<rect x="4" y="5" width="16" height="15" rx="5" fill="#A8E06A"' + st() + '/><path d="M8 9h4" stroke="#fff" stroke-width="2.2"/><circle cx="15.5" cy="15" r="1.6" fill="#6FB83F"/><circle cx="9" cy="16" r="1" fill="#6FB83F"/>'),
    chip: sv('<path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"' + st() + '/><rect x="6" y="6" width="12" height="12" rx="2" fill="#3DDC97"' + st() + '/><rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="#1F7A55"/>'),
    fuel: sv('<rect x="10" y="2.5" width="4" height="2.4" rx="1" fill="#C8D2E0"' + st(1.2) + '/><rect x="7" y="4.5" width="10" height="16.5" rx="3" fill="#FF9F45"' + st() + '/><path d="M7 8.5h10M7 17h10"' + st(1.3) + '/><path d="M10 11l2 2.5 2-2.5" fill="none" stroke="#fff" stroke-width="1.7"/>'),
    crystal: sv('<path d="M12 2l6 4v10l-6 6-6-6V6z" fill="#FF7AC8"' + st() + '/><path d="M12 2v20M6 6l6 4 6-4" fill="none" stroke="#FFD0EC" stroke-width="1.3"/>'),
    servo: sv('<path d="M6 8V5.5h7V8" fill="none"' + st() + '/><rect x="3" y="8" width="13" height="10.5" rx="2.5" fill="#E8B44A"' + st() + '/><path d="M16 11h3.5v4.5H16" fill="#C9923A"' + st() + '/><circle cx="9.5" cy="13.2" r="2.7" fill="#FFE08A"' + st(1.3) + '/>'),
    lens: sv('<circle cx="12" cy="12" r="8.5" fill="#9B7BFF"' + st() + '/><circle cx="12" cy="12" r="5" fill="#CBB8FF"' + st(1.2) + '/><path d="M9 9.6a4 4 0 0 1 3-1.6" stroke="#fff" stroke-width="1.7" fill="none"/>'),
    core: sv('<circle cx="12" cy="12" r="10" fill="#7AF0FF" opacity=".35"/><path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5"' + st(1.6) + '/><circle cx="12" cy="12" r="6.3" fill="#39D5FF"' + st() + '/><circle cx="12" cy="12" r="2.6" fill="#fff"/>'),
    lumite: sv('<path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="#39D5FF"' + st() + '/><path d="M12 6.5v11M6.5 12h11" stroke="#DDF8FF" stroke-width="1.3"/>'),
    claw: sv('<path d="M6 21.5c-2.2-6-.3-12.4 4.8-15.6 3.3-2.1 7.3-2 9.7.1-3.3 0-6.1 1-7.4 3 3.2-1 6.3 0 7.5 2.1-3.2-1-6.3.1-8.3 2.3-2 2.9-2.3 5.8-1.4 8.1z" fill="#FF8A4C"' + st() + '/><circle cx="9" cy="12" r="1.1" fill="' + INK + '"/>'),
    heart: sv('<path d="M12 21C5 16 2 12 3.5 8 5 4.5 9.5 4 12 7.5 14.5 4 19 4.5 20.5 8 22 12 19 16 12 21z" fill="#FFC21A"' + st() + '/><path d="M8.5 10.5l1.5-1h2l1.5 1v2l-1.5 1h-2l-1.5-1zM13.5 13.5l1.5-1h1.5l1 1v1.5l-1 .8" fill="none" stroke="#B9780A" stroke-width="1.2"/>'),
    medal: sv('<circle cx="12" cy="13.5" r="8" fill="#FFD45C"' + st() + '/><rect x="9" y="6.5" width="6" height="5.5" rx="1" fill="#2A1B3D"/><rect x="7.2" y="11.5" width="9.6" height="1.9" rx=".95" fill="#2A1B3D"/><circle cx="12" cy="17" r="1.5" fill="#E8A33A"/>'),
    sprocket: sv('<circle cx="12" cy="12" r="8.6" fill="none" stroke="' + INK + '" stroke-width="4.6" stroke-dasharray="2.6 2.5"/><circle cx="12" cy="12" r="8.6" fill="none" stroke="#E09A00" stroke-width="3" stroke-dasharray="2.6 2.5"/><circle cx="12" cy="12" r="7" fill="#FFC93C"' + st(1.4) + '/><path d="M12 7.3l1.4 3 3.2.3-2.4 2.2.7 3.2L12 14.4l-2.9 1.6.7-3.2-2.4-2.2 3.2-.3z" fill="#fff"' + st(1) + '/>'),
  };
  const OICON = {
    clinks: sv('<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="#FFC93C"' + st() + '/><circle cx="12" cy="12" r="3.4" fill="#FFF3C4"' + st(1.4) + '/>'),
    xp: sv('<path d="M12 2.5l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3 1.2-6.4-4.7-4.4 6.4-.8z" fill="#FFD23F"' + st() + '/>'),
    stamps: sv('<path d="M4 4h16v16H4z" fill="#FFF1DC"' + st() + ' stroke-dasharray="2 1.5"/><circle cx="12" cy="12" r="4.5" fill="#FF7A93"' + st(1.3) + '/><path d="M10 12l1.5 1.5 3-3" fill="none" stroke="#fff" stroke-width="1.6"/>'),
    heart: sv('<path d="M12 20.5C5.5 16 2.5 12 4 8.2 5.5 4.8 9.6 4.5 12 7.8c2.4-3.3 6.5-3 8 .4 1.5 3.8-1.5 7.8-8 12.3z" fill="#FF5A6E"' + st() + '/><path d="M7.5 9a2.5 2.5 0 0 1 2-1.5" stroke="#fff" stroke-width="1.6" fill="none"/>'),
    star: sv('<path d="M12 2.5l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3 1.2-6.4-4.7-4.4 6.4-.8z" fill="#39D5FF"' + st() + '/>'),
    chest: sv('<rect x="3" y="9" width="18" height="11" rx="2" fill="#FFC21A"' + st() + '/><path d="M3 11c0-4 3.5-6.5 9-6.5s9 2.5 9 6.5z" fill="#FFD45C"' + st() + '/><rect x="10" y="10" width="4" height="5" rx="1" fill="#2A1B3D"/>'),
    blueprint: sv('<rect x="3" y="4" width="18" height="16" rx="2" fill="#3FA9FF"' + st() + '/><path d="M7 9h10M7 13h6M7 17h8" stroke="#DDF0FF" stroke-width="1.5"/>'),
    gift: sv('<rect x="4" y="10" width="16" height="10" rx="2" fill="#FF7A93"' + st() + '/><rect x="3" y="7" width="18" height="4" rx="1.5" fill="#FF9FC2"' + st() + '/><path d="M12 7v13"' + st() + '/><path d="M12 7c-2-3-6-3-5 0M12 7c2-3 6-3 5 0" fill="none"' + st() + '/>'),
    lock: sv('<rect x="5" y="10" width="14" height="10" rx="2.5" fill="#C9D1DC"' + st() + '/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none"' + st() + '/>'),
    gear: sv('<circle cx="12" cy="12" r="8" fill="none" stroke="' + INK + '" stroke-width="4" stroke-dasharray="3 2.6"/><circle cx="12" cy="12" r="6.5" fill="#8E88C8"' + st() + '/><circle cx="12" cy="12" r="2.4" fill="#fff"' + st(1.2) + '/>'),
  };
  OICON.lumite = PICON.lumite; OICON.sprocket = PICON.sprocket;
  D.partIcon = id => PICON[id] || OICON.gear;
  D.icon = name => OICON[name] || PICON[name] || OICON.gear;
  // Simple per-slot gear glyph tinted by rarity (menus may use richer art).
  const SLOT_PATH = {
    head: '<path d="M4 15a8 8 0 0 1 16 0v2H4z" fill="C"' + st() + '/><circle cx="12" cy="6" r="2" fill="#fff"' + st(1.2) + '/>',
    body: '<path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" fill="C"' + st() + '/><path d="M9 9.5a3.5 3.5 0 0 1 3-2" stroke="#fff" stroke-width="1.6" fill="none"/>',
    back: '<rect x="6" y="4" width="12" height="15" rx="4" fill="C"' + st() + '/><path d="M8 19l-1 3M16 19l1 3"' + st() + '/>',
    feet: '<path d="M3 15h9l3-5h3l3 5v4H3z" fill="C"' + st() + '/><path d="M3 19h18" stroke="#fff" stroke-width="1.4"/>',
    trinket: '<circle cx="12" cy="14" r="6" fill="C"' + st() + '/><path d="M12 8V3"' + st() + '/><circle cx="12" cy="3" r="1.2" fill="' + INK + '"/>',
  };
  D.gearIcon = function (id) {
    const g = D.GEAR[id]; if (!g) return OICON.gear;
    return sv(SLOT_PATH[g.slot].replace('fill="C"', 'fill="' + U.cssHex(g.color || D.RARITY[g.rarity].color) + '"'));
  };

  // ------------------------------------------------------------------ weapons
  const W = (id, o) => Object.assign({ id, nameKey: 'weapon.' + id + '.name', descKey: 'weapon.' + id + '.desc', maxKey: 'weapon.' + id + '.max', heavy: false, turf: true, autoFire: true, infinite: false, price: null, recipe: null, quest: null, shopQuest: null }, o);
  // stats = Level-1 field display values (GDD §5.2). Combat tuning lives in 16_weapons.js.
  D.WEAPONS = {
    fizz: W('fizz', { order: 1, role: 'pistol', class: 'blaster', rarity: 'common', color: 0x2EC4B6, acquire: 'start', price: 0, guild: 1, refill: 0, infinite: true, royale: true, stats: { damage: 18, rate: 5, ammo: 0, range: 30, aoe: 0, dps: 90, spread: 0.6, heat: 7 } }),
    scatter: W('scatter', { order: 2, role: 'shotgun', class: 'shotgun', rarity: 'uncommon', color: 0xFF6B6B, acquire: 'shop', price: 800, shopQuest: 'q02', guild: 1, refill: 2, royale: true, stats: { damage: 10, pellets: 8, rate: 1.25, ammo: 24, range: 10, aoe: 0, dps: 100, spread: 6 } }),
    lobber: W('lobber', { order: 3, role: 'grenade', class: 'launcher', rarity: 'uncommon', color: 0xFF8FC0, acquire: 'shop', price: 1200, guild: 1, refill: 6, royale: true, stats: { damage: 65, rate: 1.4, ammo: 16, range: 22, aoe: 3.5, dps: 91, spread: 0 } }),
    zap: W('zap', { order: 4, role: 'chain', class: 'beam', rarity: 'rare', color: 0xB8F34A, acquire: 'shop', price: 2500, guild: 2, refill: 0.5, royale: true, stats: { damage: 9, rate: 10, ammo: 150, range: 16, aoe: 6, dps: 90, spread: 0 } }),
    saw: W('saw', { order: 5, role: 'ricochet', class: 'disc', rarity: 'rare', color: 0x3DDC97, acquire: 'craft', recipe: 'saw', guild: 2, refill: 3, royale: true, stats: { damage: 32, rate: 1.6, ammo: 30, range: 25, aoe: 0, dps: 51, spread: 0 } }),
    lancer: W('lancer', { order: 6, role: 'sniper', class: 'charge', rarity: 'epic', color: 0x8C7BFF, acquire: 'craft', recipe: 'lancer', guild: 3, refill: 10, autoFire: false, royale: true, stats: { damage: 150, rate: 0.87, ammo: 12, range: 80, aoe: 0, dps: 130, spread: 0, charge: 0.9 } }),
    gatling: W('gatling', { order: 7, role: 'minigun', class: 'minigun', rarity: 'epic', color: 0x3FA9FF, heavy: true, acquire: 'shop', price: 6000, guild: 4, refill: 0.3, royale: true, stats: { damage: 9, rate: 14, ammo: 240, range: 30, aoe: 0, dps: 126, spread: 3.5 } }),
    swarm: W('swarm', { order: 8, role: 'rockets', class: 'rockets', rarity: 'legendary', color: 0xFFD45C, heavy: true, acquire: 'craft', recipe: 'swarm', guild: 4, refill: 12, royale: true, stats: { damage: 60, rate: 1, ammo: 20, range: 45, aoe: 2.5, dps: 160, spread: 0 } }),
    buddy: W('buddy', { order: 9, role: 'summon', class: 'summon', rarity: 'epic', color: 0xFFB627, acquire: 'craft', recipe: 'buddy', guild: 3, refill: 50, turf: false, stats: { damage: 6, rate: 3, ammo: 4, range: 12, aoe: 0, dps: 36, spread: 2, duration: 18 } }),
    groove: W('groove', { order: 10, role: 'control', class: 'throwable', rarity: 'legendary', color: 0xB983FF, acquire: 'craft', recipe: 'groove', guild: 4, refill: 90, turf: false, stats: { damage: 0, rate: 1, ammo: 3, range: 15, aoe: 8, dps: 0, spread: 0, duration: 6 } }),
    bloom: W('bloom', { order: 11, role: 'transform', class: 'throwable', rarity: 'legendary', color: 0x6CCB5F, acquire: 'craft', recipe: 'bloom', guild: 4, refill: 70, turf: false, stats: { damage: 0, rate: 1, ammo: 4, range: 16, aoe: 5, dps: 0, spread: 0, duration: 5 } }),
    chill: W('chill', { order: 12, role: 'frost', class: 'sprayer', rarity: 'epic', color: 0x9FE8FF, acquire: 'craft', recipe: 'chill', guild: 3, refill: 0.6, royale: true, stats: { damage: 6, rate: 10, ammo: 120, range: 10, aoe: 0, dps: 60, spread: 20 } }),
    splat: W('splat', { order: 13, role: 'painter', class: 'rifle', rarity: 'uncommon', color: 0xA8E06A, acquire: 'quest', quest: 'q07', price: 600, guild: 2, refill: 0.4, royale: true, stats: { damage: 14, rate: 8, ammo: 200, range: 18, aoe: 0, dps: 112, spread: 4 } }),
    roller: W('roller', { order: 14, role: 'roller', class: 'roller', rarity: 'rare', color: 0xFF8A1F, acquire: 'shop', price: 1500, guild: 2, refill: 0.8, stats: { damage: 60, rate: 1.2, ammo: 100, range: 8, aoe: 2.4, dps: 85, spread: 0 } }),
    prism: W('prism', { order: 15, role: 'ultimate', class: 'ultimate', rarity: 'prismatic', color: 0xF7F4FF, heavy: true, acquire: 'craft', recipe: 'prism', quest: 'q28', guild: 5, refill: 150, turf: false, stats: { damage: 90, rate: 0.8, ammo: 10, range: 50, aoe: 3, dps: 480, spread: 0 } }),
  };
  D.WEAPON_IDS = Object.keys(D.WEAPONS).sort((a, b) => D.WEAPONS[a].order - D.WEAPONS[b].order);
  // W1–W5 (GDD §5.4): cumulative XP, damage/ammo multipliers, mod slots, max tune rank.
  D.WEAPON_LEVELS = [null,
    { lvl: 1, xp: 0, dmg: 1.00, ammo: 1.00, slots: 1, tune: 1 },
    { lvl: 2, xp: 150, dmg: 1.10, ammo: 1.00, slots: 1, tune: 1 },
    { lvl: 3, xp: 400, dmg: 1.20, ammo: 1.25, slots: 2, tune: 2 },
    { lvl: 4, xp: 800, dmg: 1.30, ammo: 1.25, slots: 2, tune: 2 },
    { lvl: 5, xp: 1400, dmg: 1.40, ammo: 1.50, slots: 3, tune: 3 },
  ];
  D.WEAPON_MAX_LVL = 5;
  D.FIZZ_HEAT_PER_LVL = -0.10;
  // Tune-Ups (GDD §5.5): 3 tracks × 3 ranks, cost 1/2/3 Lumite, rank N needs W(2N−1).
  D.TUNE = { tracks: ['power', 'capacity', 'handling'], cost: [1, 2, 3], reqLevel: [1, 3, 5], power: 0.05, capacity: 0.10, fizzHeat: -0.08, rate: 0.06, spread: -0.10, charge: -0.08, gadgetCd: -0.10, gadgetRadius: 0.10 };

  // ------------------------------------------------------------------ Goo Turf kits (GDD §5.3)
  const TW = (id, o) => Object.assign({ id, weapon: id, nameKey: 'turfw.' + id + '.name', descKey: 'turfw.' + id + '.desc' }, o);
  D.TURF_WEAPONS = {
    fizz: TW('fizz', { damage: 25, hitsToKO: 4, tank: 1.2, refillDelay: 0.30, paint: 0.6, special: 'storm' }),
    scatter: TW('scatter', { damage: 12, pellets: 8, hitsToKO: 2, tank: 6, refillDelay: 0.50, paint: 0.45, special: 'splash' }),
    lobber: TW('lobber', { damage: 60, direct: 100, hitsToKO: 2, tank: 9, refillDelay: 0.60, paint: 2.2, special: 'triple' }),
    zap: TW('zap', { damage: 7, tick: true, hitsToKO: 14, tank: 1, refillDelay: 0.40, paint: 0.35, special: 'storm' }),
    saw: TW('saw', { damage: 40, hitsToKO: 3, tank: 5, refillDelay: 0.50, paint: 0.8, special: 'triple' }),
    lancer: TW('lancer', { damage: 160, minDamage: 40, hitsToKO: 1, tank: 18, tapTank: 4, refillDelay: 0.60, paint: 0.5, special: 'triple' }),
    gatling: TW('gatling', { damage: 12, hitsToKO: 9, tank: 0.7, refillDelay: 0.60, paint: 0.4, special: 'splash' }),
    swarm: TW('swarm', { damage: 35, splash: 15, hitsToKO: 2, tank: 8, refillDelay: 0.70, paint: 1.6, special: 'triple' }),
    chill: TW('chill', { damage: 5, tick: true, hitsToKO: 20, tank: 1, refillDelay: 0.40, paint: 1.0, special: 'storm' }),
    splat: TW('splat', { damage: 34, hitsToKO: 3, tank: 0.9, refillDelay: 0.25, paint: 0.9, special: 'storm' }),
    roller: TW('roller', { damage: 120, flick: [35, 120], hitsToKO: 1, tank: 8, rollTank: 6, refillDelay: 0.50, paint: 2.4, special: 'splash' }),
  };
  D.TURF_SPECIALS = {
    storm: { id: 'storm', nameKey: 'turfsp.storm.name', descKey: 'turfsp.storm.desc', cost: 200 },
    splash: { id: 'splash', nameKey: 'turfsp.splash.name', descKey: 'turfsp.splash.desc', cost: 200 },
    triple: { id: 'triple', nameKey: 'turfsp.triple.name', descKey: 'turfsp.triple.desc', cost: 200 },
  };
  D.TURF_SUB = { id: 'bubble', nameKey: 'turfsp.bubble.name', descKey: 'turfsp.bubble.desc', tank: 70 };

  // ------------------------------------------------------------------ gear (GDD §6.2), stats scale +10%/level via Polish Kits
  D.GEAR_SLOTS = ['head', 'body', 'back', 'feet', 'trinket'];
  const GR = (id, slot, rarity, color, base) => ({ id, slot, rarity, color, base, nameKey: 'gear.' + id + '.name', descKey: 'gear.' + id + '.desc', recipe: id, maxLvl: 3 });
  D.GEAR = {
    shield1: GR('shield1', 'body', 'common', 0x8FDFFF, { shield: 50, regenDelay: 4, shieldRegen: 25 }),
    shield2: GR('shield2', 'body', 'uncommon', 0x5FD0FF, { shield: 75, regenDelay: 4, shieldRegen: 25 }),
    shield3: GR('shield3', 'body', 'rare', 0x39B5FF, { shield: 100, regenDelay: 4, shieldRegen: 25 }),
    shield4: GR('shield4', 'body', 'epic', 0x7F8CFF, { shield: 125, regenDelay: 3, shieldRegen: 35 }),
    beanie: GR('beanie', 'head', 'uncommon', 0xFF9FC2, { hp: 25, knockback: 0.8 }),
    visor: GR('visor', 'head', 'rare', 0x39D5FF, { pingMark: 8, radar: 25, scanCd: 0.75 }),
    puffpack: GR('puffpack', 'back', 'epic', 0xFFB37A, { jetFuel: 1.6, jetAccel: 26, jetMaxUp: 5, jetRefill: 2.0 }),
    wings: GR('wings', 'back', 'rare', 0xB983FF, { glideFall: 2.5, glideSpeed: 8 }),
    tankpack: GR('tankpack', 'back', 'uncommon', 0xA8E06A, { ammoMult: 1.3, turfRefill: 1.25 }),
    sneakers: GR('sneakers', 'feet', 'common', 0xFFD23F, { jumpV: 7.8, airHops: 1, hopV: 5 }),
    skates: GR('skates', 'feet', 'rare', 0x3FA9FF, { slideBoost: 4.5, slideCap: 12, slideLen: 1.5, slideJump: 1.1 }),
    magnet: GR('magnet', 'trinket', 'common', 0xFF6B6B, { magnetR: 8 }),
    medipump: GR('medipump', 'trinket', 'uncommon', 0x3DDC97, { charges: 2, heal: 50, healTime: 2, refill: 45 }),
  };
  D.GEAR_IDS = Object.keys(D.GEAR);
  const r2 = v => Math.round(v * 100) / 100;
  // Stats of gear `id` at level 1–3: the main stat gets +10% per level above 1.
  D.gearStats = function (id, lvl) {
    const g = D.GEAR[id]; if (!g) return {};
    const k = 1 + 0.1 * (U.clamp(lvl || 1, 1, 3) - 1), b = g.base;
    switch (id) {
      case 'shield1': case 'shield2': case 'shield3': case 'shield4': return { shield: Math.round(b.shield * k), regenDelay: b.regenDelay, shieldRegen: b.shieldRegen };
      case 'beanie': return { hp: Math.round(b.hp * k), knockback: r2(1 - 0.2 * k) };
      case 'visor': return { pingMark: r2(b.pingMark * k), radar: r2(b.radar * k), scanCd: r2(1 - 0.25 * k) };
      case 'puffpack': return { jetFuel: r2(b.jetFuel * k), jetAccel: b.jetAccel, jetMaxUp: b.jetMaxUp, jetRefill: b.jetRefill };
      case 'wings': return { glideFall: b.glideFall, glideSpeed: r2(b.glideSpeed * k) };
      case 'tankpack': return { ammoMult: r2(1 + 0.3 * k), turfRefill: r2(1 + 0.25 * k) };
      case 'sneakers': return { jumpV: r2(7 + 0.8 * k), airHops: 1, hopV: b.hopV };
      case 'skates': return { slideBoost: r2(b.slideBoost * k), slideCap: b.slideCap, slideLen: r2(1 + 0.5 * k), slideJump: r2(1 + 0.1 * k) };
      case 'magnet': return { magnetR: r2(b.magnetR * k) };
      case 'medipump': return { charges: b.charges, heal: Math.round(b.heal * k), healTime: b.healTime, refill: b.refill };
    }
    return Object.assign({}, b);
  };

  // ------------------------------------------------------------------ abilities / gadgets (GDD §6.1)
  D.ABILITIES = {
    dash: { id: 'dash', type: 'ability', nameKey: 'gadget.dash.name', descKey: 'gadget.dash.desc', cooldown: 2.5, charges: 2, distance: 5, iframes: 0.2, unlock: 'start', color: 0xFFF1DC },
    scan: { id: 'scan', type: 'gadget', nameKey: 'gadget.scan.name', descKey: 'gadget.scan.desc', cooldown: 20, radius: 25, duration: 4, markMult: 1.1, unlock: 'q01', color: 0x39D5FF },
    grapple: { id: 'grapple', type: 'context', nameKey: 'gadget.grapple.name', descKey: 'gadget.grapple.desc', cooldown: 0.5, range: 20, speed: 18, cone: 30, unlock: 'q08', color: 0x39D5FF },
    dome: { id: 'dome', type: 'gadget', nameKey: 'gadget.dome.name', descKey: 'gadget.dome.desc', cooldown: 30, radius: 4, hp: 600, duration: 7, unlock: 'craft', recipe: 'dome', guild: 3, color: 0x7FE8E0 },
  };
  D.GADGETS = D.ABILITIES;

  // ------------------------------------------------------------------ mods (GDD §8.5)
  const PROJ = ['fizz', 'scatter', 'lobber', 'saw', 'gatling', 'swarm', 'splat', 'buddy', 'prism', 'roller'];
  const AOE = ['lobber', 'swarm', 'prism', 'groove', 'roller'];
  const MD = (id, family, fx, clinks, parts, applies) => ({ id, family, fx, nameKey: 'mod.' + id + '.name', descKey: 'mod.' + id + '.desc', recipe: id, cost: { clinks, parts }, applies: applies || null });
  D.MODS = {
    m_power: MD('m_power', 'tidy', { damage: 0.08 }, 600, { chip: 2 }),
    m_mag: MD('m_mag', 'tidy', { ammo: 0.20, fizzHeat: -0.15 }, 500, { scrap: 3, chip: 1 }),
    m_quick: MD('m_quick', 'tidy', { rate: 0.08, charge: -0.08 }, 600, { spring: 2, chip: 1 }),
    m_steady: MD('m_steady', 'tidy', { spread: -0.25 }, 500, { scrap: 2, lens: 1 }),
    m_clink: MD('m_clink', 'tidy', { clinks: 0.15 }, 800, { wire: 2, lens: 1 }),
    m_glass: MD('m_glass', 'tradeoff', { damage: 0.25, ammo: -0.20 }, 1500, { core: 1 }),
    m_hasty: MD('m_hasty', 'tradeoff', { rate: 0.20, damage: -0.10 }, 1500, { servo: 2 }),
    m_heavy: MD('m_heavy', 'tradeoff', { damage: 0.15, knock: 0.40, rate: -0.15 }, 1500, { servo: 2, crystal: 1 }),
    m_bouncy: MD('m_bouncy', 'wild', { bounce: 1 }, 3000, { core: 1, spring: 2, lumite: 1 }, PROJ),
    m_split: MD('m_split', 'wild', { split: 2, splitDmg: 0.35 }, 3000, { core: 1, crystal: 2, lumite: 1 }, AOE),
    m_frost: MD('m_frost', 'wild', { chill: 0.10, chillMax: 0.40 }, 3000, { core: 1, gel: 2, lumite: 1 }),
    m_juice: MD('m_juice', 'wild', { shieldLeech: 0.03 }, 3500, { core: 1, lens: 1, lumite: 1 }),
    m_goo: MD('m_goo', 'wild', { paint: 0.25, puddle: 0.20 }, 2500, { gel: 4, lumite: 1 }),
  };
  D.MOD_IDS = Object.keys(D.MODS);
  D.MOD_FAMILIES = { tidy: { nameKey: 'fam.tidy', feature: 'modbench' }, tradeoff: { nameKey: 'fam.tradeoff', guild: 3 }, wild: { nameKey: 'fam.wild' } };
  D.modFits = (modId, weaponId) => { const m = D.MODS[modId]; return !!m && !!D.WEAPONS[weaponId] && (!m.applies || m.applies.includes(weaponId)); };
  D.FORGE_STREAK = 5;

  // ------------------------------------------------------------------ recipes (GDD §8.3–8.5). Key = output item id.
  const RC = (id, kind, guild, clinks, parts, o) => Object.assign({ id, kind, out: id, guild, clinks, parts }, o || {});
  D.RECIPES = {
    saw: RC('saw', 'weapon', 2, 1800, { scrap: 6, spring: 4, servo: 2 }),
    lancer: RC('lancer', 'weapon', 3, 3500, { lens: 3, wire: 6, servo: 2 }),
    chill: RC('chill', 'weapon', 3, 3000, { crystal: 4, fuel: 4, chip: 2 }),
    buddy: RC('buddy', 'weapon', 3, 4500, { chip: 6, servo: 4, core: 1 }),
    swarm: RC('swarm', 'weapon', 4, 6500, { fuel: 6, chip: 4, core: 2 }),
    bloom: RC('bloom', 'weapon', 4, 7000, { gel: 6, crystal: 3, heart: 1 }),
    groove: RC('groove', 'weapon', 4, 8000, { lens: 3, crystal: 3, core: 1, claw: 1 }),
    prism: RC('prism', 'weapon', 5, 25000, { claw: 2, heart: 2, medal: 2, core: 6, lumite: 10 }, { locked: true }),
    shield1: RC('shield1', 'gear', 1, 300, { scrap: 4 }, { tutorial: true }),
    shield2: RC('shield2', 'gear', 2, 2000, { chip: 3, crystal: 2 }),
    shield3: RC('shield3', 'gear', 3, 6000, { servo: 3, core: 2 }),
    shield4: RC('shield4', 'gear', 5, 15000, { core: 3, medal: 1, lumite: 3 }),
    sneakers: RC('sneakers', 'gear', 1, 900, { spring: 8 }, { locked: true }),
    magnet: RC('magnet', 'gear', 1, 800, { scrap: 6, chip: 2 }),
    beanie: RC('beanie', 'gear', 2, 1000, { scrap: 6, gel: 4 }),
    visor: RC('visor', 'gear', 2, 1500, { lens: 2, wire: 4 }),
    tankpack: RC('tankpack', 'gear', 2, 1800, { gel: 8, chip: 2 }),
    medipump: RC('medipump', 'gear', 2, 1500, { gel: 4, crystal: 2 }),
    skates: RC('skates', 'gear', 3, 2200, { spring: 6, servo: 2 }),
    wings: RC('wings', 'gear', 3, 2500, { wire: 6, lens: 2 }),
    puffpack: RC('puffpack', 'gear', 4, 4500, { fuel: 10, crystal: 4 }),
    dome: RC('dome', 'gadget', 3, 3000, { gel: 4, servo: 2, core: 1 }),
    polish: RC('polish', 'item', 2, 300, { chip: 2 }, { repeat: true }),
  };
  for (const id of D.MOD_IDS) {
    const m = D.MODS[id];
    D.RECIPES[id] = RC(id, 'mod', m.family === 'tradeoff' ? 3 : 1, m.cost.clinks, m.cost.parts, { repeat: true, blueprint: true, family: m.family });
  }
  D.recipeName = id => {
    const r = D.RECIPES[id]; if (!r) return id;
    const k = r.kind === 'weapon' ? 'weapon.' : r.kind === 'gear' ? 'gear.' : r.kind === 'gadget' ? 'gadget.' : r.kind === 'mod' ? 'mod.' : 'item.';
    return G.t(k + r.out + '.name');
  };

  // ------------------------------------------------------------------ Pop Shop (GDD §9.3)
  const SH = (id, kind, price, o) => Object.assign({ id, kind, price }, o || {});
  D.SHOP = {
    items: {
      healthPop: SH('healthPop', 'consumable', 40, { carry: 3, nameKey: 'item.healthPop.name' }),
      shieldCell: SH('shieldCell', 'consumable', 60, { carry: 3, nameKey: 'item.shieldCell.name' }),
      revive: SH('revive', 'consumable', 400, { carry: 1, nameKey: 'item.revive.name' }),
      scrap10: SH('scrap10', 'part', 100, { part: 'scrap', n: 10 }),
      spring10: SH('spring10', 'part', 120, { part: 'spring', n: 10 }),
      wire10: SH('wire10', 'part', 120, { part: 'wire', n: 10 }),
      gel5: SH('gel5', 'part', 160, { part: 'gel', n: 5 }),
      chip5: SH('chip5', 'part', 200, { part: 'chip', n: 5 }),
      fuel5: SH('fuel5', 'part', 200, { part: 'fuel', n: 5 }),
      crystal: SH('crystal', 'part', 220, { part: 'crystal', n: 1, daily: 5 }),
      servo: SH('servo', 'part', 250, { part: 'servo', n: 1, daily: 5 }),
      lens: SH('lens', 'part', 250, { part: 'lens', n: 1, daily: 5 }),
      core: SH('core', 'part', 1200, { part: 'core', n: 1, daily: 1 }),
      polish: SH('polish', 'item', 300, { item: 'polish', daily: 3, nameKey: 'item.polish.name' }),
      lumite: SH('lumite', 'lumite', 0, { stamps: 60, n: 1, weekly: 3, building: 'guild', nameKey: 'cur.lumite' }),
      boostXp: SH('boostXp', 'boost', 300, { boost: 'xp', matches: 3, building: 'cafe', nameKey: 'item.boostXp.name' }),
      boostClinks: SH('boostClinks', 'boost', 300, { boost: 'clinks', matches: 3, building: 'cafe', nameKey: 'item.boostClinks.name' }),
      scatter: SH('scatter', 'weapon', 800, { weapon: 'scatter', guild: 1, needs: 'q02' }),
      lobber: SH('lobber', 'weapon', 1200, { weapon: 'lobber', guild: 1 }),
      splat: SH('splat', 'weapon', 600, { weapon: 'splat', guild: 2 }),
      roller: SH('roller', 'weapon', 1500, { weapon: 'roller', guild: 2 }),
      zap: SH('zap', 'weapon', 2500, { weapon: 'zap', guild: 2 }),
      gatling: SH('gatling', 'weapon', 6000, { weapon: 'gatling', guild: 4 }),
    },
    buyRatio: 2.5,
  };
  for (const k in D.SHOP.items) { const it = D.SHOP.items[k]; if (!it.nameKey) it.nameKey = it.kind === 'weapon' ? 'weapon.' + it.weapon + '.name' : 'part.' + it.part + '.name'; }
  D.shopName = id => { const it = D.SHOP.items[id]; if (!it) return id; return it.kind === 'part' && it.n > 1 ? G.t('item.bundle', { name: G.t(it.nameKey), n: it.n }) : G.t(it.nameKey); };

  // ------------------------------------------------------------------ XP, Player Rank, Guild Rank (GDD §9.4–9.5)
  const RANK_BANDS = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27];
  D.XP = {
    cap: 30, starChest: 10000,
    toNext(L) { return L >= 30 ? Infinity : Math.round((100 + 60 * Math.pow(L - 1, 1.5)) / 10) * 10; },
    // Cumulative XP needed to reach PR L from PR 1.
    total(L) { let s = 0; for (let i = 1; i < Math.min(L, 30); i++) s += D.XP.toNext(i); return s; },
    titleKey(pr) { let k = 1; for (let i = 0; i < RANK_BANDS.length; i++) if (pr >= RANK_BANDS[i]) k = i + 1; return 'rank.' + k; },
    // Player-Rank features (informational; the rules live in 14_progress.js RULES). Places and Daily quests
    // open by missions played instead (1 → Workshop + Pop Shop … 4 → Gallery + Royale Tower + Boss Hunt).
    unlocks: { 1: ['expedition', 'training'], 5: ['modbench'], 10: ['spicy'], 12: ['weeklies', 'weeklyExp'], 15: ['dailyTrack'], 18: ['blazing'], 20: ['heat'], 30: ['starRank'] },
    rankReward(pr) {
      const r = { clinks: 200 * pr };
      if (pr % 5 === 0) { r.lumite = 1; r.loot = [{ table: 'gold', rolls: 1 }]; r.cosmetic = { 5: 'hat_cap', 10: 'trail_bubbles', 15: 'hat_crown', 20: 'trail_stars', 25: 'hat_wizard', 30: 'skin_gold' }[pr]; }
      return r;
    },
    sources: { t1: 2, t2: 5, t3: 10, elite: 40, boss: 300, craft: 50, codex: 25 },
  };
  D.GUILD = [null,
    { star: 1, pr: 1, keys: ['q02', 'q03'], promo: 'q06', biome: 'shoals', titleKey: 'guild.1' },
    { star: 2, pr: 3, keys: ['q07', 'q08', 'q09'], promo: 'q12', biome: 'mesas', titleKey: 'guild.2' },
    { star: 3, pr: 7, keys: ['q13', 'q14', 'q17'], promo: 'q18', biome: 'grotto', titleKey: 'guild.3' },
    { star: 4, pr: 12, keys: ['q19', 'q20'], promo: 'q24', biome: 'frost', titleKey: 'guild.4' },
    { star: 5, pr: 18, keys: ['q25', 'q26'], promo: 'q29', biome: 'junk', titleKey: 'guild.5' },
    { star: 6, pr: 24, keys: [], promo: null, biome: null, titleKey: 'guild.6' },
  ];

  // ------------------------------------------------------------------ difficulty (GDD §4.5) + heat + elites
  const DF = (id, dmg, hp, rate, tele, tokens, reward, pr, shift) => ({ id, nameKey: 'diff.' + id, descKey: 'diff.' + id + '.desc', dmg, hp, rate, telegraph: tele, tokens, reward, pr, shift, regenStep: pr >= 10 ? 25 : 0 });
  D.DIFFICULTY = {
    breezy: DF('breezy', 0.5, 0.7, 0.85, 1.3, 2, 1.0, 1, null),
    normal: DF('normal', 1.0, 1.0, 1.0, 1.0, 3, 1.25, 1, null),
    spicy: DF('spicy', 1.35, 1.3, 1.15, 1.0, 4, 1.6, 10, { rare: 6, epic: 4 }),
    blazing: DF('blazing', 1.75, 1.6, 1.3, 0.9, 5, 2.0, 18, { rare: 10, epic: 7, legendary: 3 }),
  };
  D.DIFF_IDS = ['breezy', 'normal', 'spicy', 'blazing'];
  D.HEAT = {
    armored: { id: 'armored', nameKey: 'heat.armored.name', descKey: 'heat.armored.desc', hp: 1.3 },
    zippy: { id: 'zippy', nameKey: 'heat.zippy.name', descKey: 'heat.zippy.desc', speed: 1.2 },
    noregen: { id: 'noregen', nameKey: 'heat.noregen.name', descKey: 'heat.noregen.desc', noShieldRegen: true },
    tight: { id: 'tight', nameKey: 'heat.tight.name', descKey: 'heat.tight.desc', par: 0.75 },
    swarm: { id: 'swarm', nameKey: 'heat.swarm.name', descKey: 'heat.swarm.desc', elite: 0.2 },
  };
  D.HEAT_REWARD = 0.10; D.HEAT_MAX = 5;
  D.ELITE = { chanceByStar: { 1: 0, 2: 0, 3: 0, 4: 0.1, 5: 0.2, 6: 0.3 }, shield: 1.0, speed: 1.2, rate: 1.25, clinkMult: 3, extraRolls: 1, coreWeight: 15 };
  // Current difficulty id (accepts legacy easy/hard setting values).
  D.diffId = function () {
    let d = G.Save && G.Save.data && G.Save.data.settings ? G.Save.data.settings.difficulty : 'normal';
    if (d === 'easy') d = 'breezy'; else if (d === 'hard') d = 'spicy';
    return D.DIFFICULTY[d] ? d : 'normal';
  };
  // 'taken' = damage the player takes (enemy dmg mult); 'dealt' = 1 (enemy HP is scaled by the
  // enemies module with DIFFICULTY[id].hp). Also 'hp' | 'rate' | 'reward' | 'telegraph' | 'tokens'.
  D.difficultyMult = function (kind) {
    const d = D.DIFFICULTY[D.diffId()];
    switch (kind) {
      case 'taken': return d.dmg;
      case 'dealt': return 1;
      case 'hp': return d.hp;
      case 'rate': return d.rate;
      case 'reward': return d.reward;
      case 'telegraph': return d.telegraph;
      case 'tokens': return d.tokens;
    }
    return 1;
  };

  // ------------------------------------------------------------------ enemies / bosses (display + loot; combat stats in 17_enemies.js)
  const EN_ = (id, tier, hp, clinks, rolls, parts, biome) => ({ id, nameKey: 'enemy.' + id + '.name', descKey: 'enemy.' + id + '.desc', tipKey: 'enemy.' + id + '.tip', tier, hp, clinks, rolls, parts, biome });
  const ENEMY_INFO = {
    bumbler: EN_('bumbler', 1, 40, [3, 6], 1, { scrap: 55, wire: 35, chip: 10 }, 'shoals'),
    hopper: EN_('hopper', 1, 60, [4, 8], 1, { spring: 60, scrap: 30, chip: 10 }, 'shoals'),
    rollo: EN_('rollo', 1, 30, [2, 5], 1, { scrap: 50, fuel: 35, chip: 15 }, 'shoals'),
    squirt: EN_('squirt', 1, 80, [5, 9], 1, { gel: 65, scrap: 25, crystal: 10 }, 'shoals'),
    gnat: EN_('gnat', 2, 70, [6, 10], 1, { lens: 25, wire: 45, chip: 30 }, 'mesas'),
    shieldy: EN_('shieldy', 2, 120, [8, 14], 1, { scrap: 50, chip: 30, servo: 20 }, 'mesas'),
    lobba: EN_('lobba', 2, 90, [7, 12], 1, { fuel: 40, scrap: 35, crystal: 15, chip: 10 }, 'mesas'),
    zapper: EN_('zapper', 2, 110, [8, 13], 1, { wire: 50, chip: 30, crystal: 20 }, 'grotto'),
    pinch: EN_('pinch', 3, 220, [15, 25], 2, { scrap: 50, servo: 30, crystal: 20 }, 'grotto'),
    bruiser: EN_('bruiser', 3, 450, [25, 40], 2, { scrap: 45, servo: 40, crystal: 10, core: 5 }, 'frost'),
    tote: EN_('tote', 3, 300, [20, 35], 2, { fuel: 40, chip: 35, servo: 15, core: 10 }, 'frost'),
  };
  ENEMY_INFO.shieldy.plate = 150;
  D.ENEMY_IDS = Object.keys(ENEMY_INFO);
  D.ENEMIES = Object.assign(D.ENEMIES || {}, ENEMY_INFO);
  const BOSS_INFO = {
    crankcrab: { id: 'crankcrab', nameKey: 'enemy.crankcrab.name', descKey: 'enemy.crankcrab.desc', tipKey: 'enemy.crankcrab.tip', hp: 3000, part: 'claw', clinks: [600, 900], second: 0.35, biome: 'mesas', par: 210, mission: 's2_3' },
    buzzhive: { id: 'buzzhive', nameKey: 'enemy.buzzhive.name', descKey: 'enemy.buzzhive.desc', tipKey: 'enemy.buzzhive.tip', hp: 3600, part: 'heart', clinks: [600, 900], second: 0.35, biome: 'grotto', par: 240, mission: 's3_3' },
    titan: { id: 'titan', nameKey: 'enemy.titan.name', descKey: 'enemy.titan.desc', tipKey: 'enemy.titan.tip', hp: 5000, part: 'medal', clinks: [600, 900], second: 0.35, biome: 'junk', par: 330, mission: 's5_3' },
  };
  D.BOSS_IDS = Object.keys(BOSS_INFO);
  D.BOSSES = Object.assign(D.BOSSES || {}, BOSS_INFO);
  D.BOSS_LITE = { pinch_king: { id: 'pinch_king', base: 'pinch', nameKey: 'enemy.pinch_king.name', descKey: 'enemy.pinch_king.desc', hp: 800, mission: 's1_3' } };
  D.enemyTier = id => (ENEMY_INFO[id] ? ENEMY_INFO[id].tier : BOSS_INFO[id] ? 4 : 1);

  // Lists used by menus/quests (modes may keep richer tables of their own).
  D.BIOMES = D.BIOMES || {
    shoals: { id: 'shoals', nameKey: 'biome.shoals.name', guild: 1 }, mesas: { id: 'mesas', nameKey: 'biome.mesas.name', guild: 2 },
    grotto: { id: 'grotto', nameKey: 'biome.grotto.name', guild: 3 }, frost: { id: 'frost', nameKey: 'biome.frost.name', guild: 4 },
    junk: { id: 'junk', nameKey: 'biome.junk.name', guild: 5 },
  };
  D.MODES = {
    expedition: { id: 'expedition', nameKey: 'mode.expedition.name', descKey: 'mode.expedition.desc', building: 'fountain' },
    race: { id: 'race', nameKey: 'mode.race.name', descKey: 'mode.race.desc', building: 'hangar' },
    turf: { id: 'turf', nameKey: 'mode.turf.name', descKey: 'mode.turf.desc', building: 'arena' },
    royale: { id: 'royale', nameKey: 'mode.royale.name', descKey: 'mode.royale.desc', building: 'tower' },
    defense: { id: 'defense', nameKey: 'mode.defense.name', descKey: 'mode.defense.desc', building: 'fountain' },
    training: { id: 'training', nameKey: 'mode.training.name', descKey: 'mode.training.desc', building: 'training' },
    boss: { id: 'boss', nameKey: 'mode.boss.name', descKey: 'mode.boss.desc', building: 'guild' },
  };
  D.MODE_IDS = Object.keys(D.MODES);
  D.BUILDINGS = ['guild', 'workshop', 'shop', 'cafe', 'gallery', 'gate', 'training', 'hangar', 'arena', 'tower', 'fountain'];
  D.TRACKS = {
    coral_loop: { id: 'coral_loop', nameKey: 'track.coral_loop.name', guild: 2 }, mesa_run: { id: 'mesa_run', nameKey: 'track.mesa_run.name', guild: 2 },
    glowcap_gauntlet: { id: 'glowcap_gauntlet', nameKey: 'track.glowcap_gauntlet.name', guild: 3 }, frostfizz_spiral: { id: 'frostfizz_spiral', nameKey: 'track.frostfizz_spiral.name', guild: 4 },
    junkyard_jumpline: { id: 'junkyard_jumpline', nameKey: 'track.junkyard_jumpline.name', guild: 5 }, sunbeam_speedway: { id: 'sunbeam_speedway', nameKey: 'track.sunbeam_speedway.name', guild: 5 },
    daily: { id: 'daily', nameKey: 'track.daily.name', pr: 15 },
  };
  D.TRACK_IDS = ['coral_loop', 'mesa_run', 'glowcap_gauntlet', 'frostfizz_spiral', 'junkyard_jumpline', 'sunbeam_speedway'];
  D.CLASSES = { breeze: { id: 'breeze', nameKey: 'class.breeze', mult: 1.0 }, gale: { id: 'gale', nameKey: 'class.gale', mult: 1.15, guild: 3 }, storm: { id: 'storm', nameKey: 'class.storm', mult: 1.3, guild: 4 }, comet: { id: 'comet', nameKey: 'class.comet', mult: 1.45, quest: 'q26' } };
  D.COSMETICS = ['gauntlet_kiko', 'hat_party', 'hat_cap', 'trail_bubbles', 'hat_crown', 'trail_stars', 'hat_wizard', 'skin_gold', 'paint_streak', 'paint_prismatic', 'paint_golden'];
  D.TOGGLES = ['bigHead', 'rainbowGoo', 'lowGrav'];
  D.SPROCKET_COUNT = 30;
  D.SPROCKET_MILESTONES = [{ n: 5, cosmetic: 'hat_party' }, { n: 10, toggle: 'bigHead' }, { n: 15, toggle: 'rainbowGoo' }, { n: 20, note: 'prism' }, { n: 25, toggle: 'lowGrav' }, { n: 30, cosmetic: 'paint_golden', title: 'seeker' }];
  D.CAFE_TREATS = [{ clinks: 200 }, { randomParts: 3 }, { clinks: 300 }, { items: { polish: 1 } }, { clinks: 400 }, { lumite: 1 }, { loot: [{ table: 'gold', rolls: 1 }] }];
  // Hangar ship upgrades: level n costs 400·n² clinks + 2n fuel (+ n−2 servo from L3).
  D.SHIP = { tracks: ['hull', 'engine', 'boost', 'blaster'], max: 5, cost: n => ({ clinks: 400 * n * n, parts: n >= 3 ? { fuel: 2 * n, servo: n - 2 } : { fuel: 2 * n } }) };
  D.MEDALS = ['none', 'bronze', 'silver', 'gold', 'platinum'];
  D.medalTier = function (m) {
    if (typeof m === 'number') return U.clamp(Math.floor(m), 0, 4);
    if (!m) return 0;
    const s = String(m).toLowerCase();
    const i = D.MEDALS.indexOf(s); if (i >= 0) return i;
    return { b: 1, s: 2, g: 3, p: 4 }[s[0]] || 0;
  };
  D.gradeTier = g => ({ c: 0, b: 1, a: 2, s: 3 })[String(g || 'c').toLowerCase()] || 0; // Expedition S/A/B/C

  // ------------------------------------------------------------------ rewards per mode (GDD §9.2; base × difficulty reward mult)
  D.REWARDS = {
    expedition: { clinks: [0, 300, 500, 800, 1200, 1800, 2500], xp: [0, 150, 300, 450, 650, 900, 1200], xpPerStar: 50, failXp: 0.5, failParts: 0.5, chest: 'gold' },
    turf: { win: 600, loss: 300, perPoints: 10, pointsCap: 400, xpWin: 250, xpLoss: 150, gel: 2, gelPer: 1000 },
    race: { place: [300, 220, 170, 130, 100, 80, 65, 50], ring: 50, xp: 150, medalXp: [0, 50, 100, 150, 250], firstMedal: [null, { fuel: 1 }, { fuel: 2, chip: 1 }, { fuel: 3, servo: 1 }, { lumite: 1 }] },
    royale: { base: 100, perPlace: 40, perPop: 20, win: 500, xp: 50, xpPerPlace: 15, field: 16, chest: 'gold' },
    defense: { perWave: 60, win: 800, winWave: 10, xpPerWave: 30, metalEvery: 5, chest: 'gold' },
    boss: { first: 1200, repeat: 600, xp: 300, chest: 'boss' },
    training: { clinks: [0, 100, 200, 400, 0], xp: [0, 50, 100, 150, 0], platSticker: 'train_plat' },
    daily: { clinks: [150, 300], xp: 120, stamps: 10 },
    weekly: { xp: 500, lumite: 1, stamps: 30, bonusLumite: 2 },
    combo: { max: 5, step: 4 },
    boost: 0.25,
  };

  // ------------------------------------------------------------------ loot (GDD §7.5, §8.2)
  D.LOOT = {
    tiers: {
      wood: { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0 },
      metal: { common: 45, uncommon: 33, rare: 17, epic: 5, legendary: 0 },
      elite: { common: 30, uncommon: 35, rare: 25, epic: 9, legendary: 1 },
      gold: { common: 20, uncommon: 35, rare: 30, epic: 12, legendary: 3 },
      boss: { common: 0, uncommon: 20, rare: 40, epic: 28, legendary: 12 },
      floor: { common: 45, uncommon: 30, rare: 17, epic: 7, legendary: 1 },   // Royale floor loot (rarity only)
      bin: { common: 20, uncommon: 35, rare: 30, epic: 13, legendary: 2 },     // Royale supply bins
    },
    crates: { wood: { clinks: [6, 12], rollChance: 0.25 }, metal: { clinks: [15, 30], rolls: 1 }, lumite: { lumite: [1, 3] } },
    enemies: ENEMY_INFO, bosses: BOSS_INFO,
    pity: { epic: 12, leg: 40, boss: 3 },
    metalPlus: ['metal', 'elite', 'gold', 'boss'], legSources: ['elite', 'gold', 'boss'],
    blueprintChance: 0.12, heatShift: 2,
  };
  // Top-level aliases so `G.Data.LOOT[tableId]` is truthy for every valid rollLoot table id.
  for (const k in D.LOOT.tiers) D.LOOT[k] = D.LOOT.tiers[k];
  for (const k in ENEMY_INFO) D.LOOT[k] = ENEMY_INFO[k];
  for (const k in BOSS_INFO) { D.LOOT[k] = BOSS_INFO[k]; D.LOOT['boss_' + k] = BOSS_INFO[k]; }
  D.LOOT.lumite = D.LOOT.crates.lumite; D.LOOT.legendary = { legendary: 1 };

  // ------------------------------------------------------------------ quests (GDD §12)
  const Q = (id, rank, type, target, goal, mode, rewards, o) => Object.assign({ id, rank, type, target, goal, mode, rewards, titleKey: 'quest.' + id + '.title', descKey: 'quest.' + id + '.desc', key: false, promo: false }, o || {});
  const K = { key: true }, P = { promo: true };
  const rw = (clinks, xp, extra) => Object.assign({ clinks, xp }, extra || {});
  D.QUESTS = {
    q01: Q('q01', 1, 'visit', {}, 6, 'hub', rw(200, 100, { gadget: 'scan' })),
    q02: Q('q02', 1, 'hunt', { enemy: 'bumbler' }, 10, 'expedition', rw(300, 150, { unlock: 'shop' }), K),
    q03: Q('q03', 1, 'gather', { part: 'spring' }, 8, 'expedition', rw(300, 150, { recipe: 'sneakers' }), K),
    q04: Q('q04', 1, 'trial', { trial: 'hop', medal: 1 }, 1, 'training', rw(200, 100)),
    q05: Q('q05', 1, 'crates', {}, 20, 'expedition', rw(250, 120)),
    q06: Q('q06', 1, 'boss', { boss: 'pinch_king', mission: 's1_3' }, 1, 'expedition', rw(600, 300, { heartPlate: 1, guild: 2 }), P),
    q07: Q('q07', 2, 'turfwin', { coverage: 0 }, 1, 'turf', rw(500, 250, { weapon: 'splat' }), K),
    q08: Q('q08', 2, 'mission', { mission: 's2_1' }, 1, 'expedition', rw(400, 200, { gadget: 'grapple' }), K),
    q09: Q('q09', 2, 'racemedal', { track: 'coral_loop', medal: 1 }, 1, 'race', rw(400, 200, { parts: { fuel: 3 } }), K),
    q10: Q('q10', 2, 'survive', { waves: 5 }, 1, 'defense', rw(500, 250)),
    q11: Q('q11', 2, 'sprockets', {}, 3, 'any', rw(400, 200)),
    q12: Q('q12', 2, 'boss', { boss: 'crankcrab', mission: 's2_3' }, 1, 'expedition', rw(1200, 600, { parts: { claw: 1 }, heartPlate: 1, guild: 3 }), P),
    q13: Q('q13', 3, 'placement', { place: 5 }, 1, 'royale', rw(800, 400), K),
    q14: Q('q14', 3, 'plates', {}, 15, 'expedition', rw(800, 400), K),
    q15: Q('q15', 3, 'popup', { score: 3000 }, 1, 'training', rw(600, 300)),
    q16: Q('q16', 3, 'craft', {}, 3, 'workshop', rw(600, 300, { lumite: 2 })),
    q17: Q('q17', 3, 'mission', { mission: 's3_2' }, 1, 'expedition', rw(800, 400), K),
    q18: Q('q18', 3, 'boss', { boss: 'buzzhive', mission: 's3_3' }, 1, 'expedition', rw(1800, 900, { parts: { heart: 1 }, heartPlate: 1, guild: 4 }), P),
    q19: Q('q19', 4, 'turfwin', { coverage: 55 }, 1, 'turf', rw(1200, 600), K),
    q20: Q('q20', 4, 'racemedal', { medal: 2 }, 2, 'race', rw(1200, 600, { cosmetic: 'paint_streak' }), K),
    q21: Q('q21', 4, 'elitesrun', {}, 5, 'expedition', rw(1200, 600, { parts: { core: 1 } })),
    q22: Q('q22', 4, 'survive', { waves: 10, win: true }, 1, 'defense', rw(1200, 600)),
    q23: Q('q23', 4, 'level', { lvl: 5 }, 1, 'any', rw(1000, 500, { lumite: 1 })),
    q24: Q('q24', 4, 'bosstime', { boss: 'crankcrab', diff: 'spicy', time: 300 }, 1, 'boss', rw(2500, 1200, { heartPlate: 1, guild: 5 }), P),
    q25: Q('q25', 5, 'placement', { place: 1 }, 1, 'royale', rw(1800, 900), K),
    q26: Q('q26', 5, 'racemedal', { medal: 3 }, 3, 'race', rw(1800, 900, { shipClass: 'comet' }), K),
    q27: Q('q27', 5, 'noko', { star: 5 }, 1, 'expedition', rw(1800, 900, { blueprint: 'wild' })),
    q28: Q('q28', 5, 'sprockets', {}, 20, 'any', rw(2000, 1000, { recipe: 'prism' })),
    q29: Q('q29', 5, 'boss', { boss: 'titan', mission: 's5_3' }, 1, 'expedition', rw(3500, 1800, { parts: { medal: 1 }, guild: 6, title: 'legend' }), P),
    q30: Q('q30', 6, 'bossrush', {}, 1, 'boss', rw(4000, 2000, { lumite: 3, cosmetic: 'paint_prismatic' })),
    q31: Q('q31', 6, 'racemedal', { medal: 4 }, 1, 'race', rw(2500, 1200)),
    q32: Q('q32', 6, 'survive', { waves: 20, endless: true, diff: 'spicy' }, 1, 'defense', rw(2500, 1200, { loot: [{ table: 'legendary', rolls: 1 }] })),
  };
  D.QUEST_IDS = Object.keys(D.QUESTS);
  // Story quests pay Guild Stamps: max(20, ★ × 10).
  D.questStamps = q => Math.max(20, (q.rank || 1) * 10);

  // Daily (3/day, GDD §9.6) and weekly (5/week) templates. goal: n or [min, max] (step).
  D.DAILY_TEMPLATES = {
    pop: { id: 'pop', type: 'hunt', target: {}, goal: [15, 30], step: 5, mode: null },
    gather: { id: 'gather', type: 'gather', target: {}, goal: [5, 15], step: 1, parts: ['scrap', 'spring', 'wire', 'gel', 'chip', 'fuel'], mode: 'expedition' },
    turf: { id: 'turf', type: 'turfwin', target: { coverage: 0 }, goal: 1, mode: 'turf' },
    race: { id: 'race', type: 'racetop', target: { place: 3 }, goal: 1, mode: 'race' },
    royale: { id: 'royale', type: 'placement', target: { place: 8 }, goal: 1, mode: 'royale' },
    survive: { id: 'survive', type: 'survive', target: { waves: 5 }, goal: 1, mode: 'defense' },
    medal: { id: 'medal', type: 'trainmedal', target: { medal: 1 }, goal: 1, mode: 'training' },
    craft: { id: 'craft', type: 'craft', target: {}, goal: 1, mode: 'workshop' },
    paint: { id: 'paint', type: 'paint', target: {}, goal: 500, mode: 'turf' },
    clinks: { id: 'clinks', type: 'clinks', target: {}, goal: 1000, mode: null },
  };
  D.WEEKLY_TEMPLATES = {
    pop: { id: 'pop', type: 'hunt', target: {}, goal: 300, mode: null },
    turf: { id: 'turf', type: 'turfwin', target: { coverage: 0 }, goal: 3, mode: 'turf' },
    gold: { id: 'gold', type: 'racegold', target: { medal: 3 }, goal: 1, mode: 'race' },
    boss: { id: 'boss', type: 'bossany', target: {}, goal: 1, mode: 'boss' },
    rare: { id: 'rare', type: 'gather', target: { rarity: 'rare' }, goal: 30, mode: 'expedition' },
    royale: { id: 'royale', type: 'placement', target: { place: 3 }, goal: 2, mode: 'royale' },
    guard: { id: 'guard', type: 'survive', target: { waves: 10, win: true }, goal: 1, mode: 'defense' },
    craft: { id: 'craft', type: 'craft', target: {}, goal: 5, mode: 'workshop' },
    elite: { id: 'elite', type: 'hunt', target: { elite: true }, goal: 10, mode: 'expedition' },
  };
  for (const k in D.DAILY_TEMPLATES) { const t = D.DAILY_TEMPLATES[k]; t.titleKey = 'quest.d_' + k + '.title'; t.descKey = 'quest.d_' + k + '.desc'; }
  for (const k in D.WEEKLY_TEMPLATES) { const t = D.WEEKLY_TEMPLATES[k]; t.titleKey = 'quest.w_' + k + '.title'; t.descKey = 'quest.w_' + k + '.desc'; }

  // ------------------------------------------------------------------ stickers (40 achievements, 8 × 5 categories)
  const ST = (id, cat, stat, goal, reward) => ({ id, cat, stat, goal, reward, nameKey: 'sticker.' + id + '.name', descKey: 'sticker.' + id + '.desc' });
  D.STICKER_CATS = ['combat', 'crafting', 'explorer', 'racer', 'turf'];
  D.STICKERS = [
    ST('pop100', 'combat', 'pops', 100, { clinks: 100 }), ST('pop1000', 'combat', 'pops', 1000, { clinks: 500 }),
    ST('pop5000', 'combat', 'pops', 5000, { clinks: 1000 }), ST('elite10', 'combat', 'elites', 10, { clinks: 300 }),
    ST('boss1', 'combat', 'bossKinds', 1, { clinks: 500 }), ST('freeze50', 'combat', 'freezes', 50, { clinks: 300 }),
    ST('dance25', 'combat', 'dances', 25, { clinks: 300 }), ST('gnat_laser', 'combat', 'gnatLaser', 1, { clinks: 200 }),
    ST('craft1', 'crafting', 'crafts', 1, { clinks: 100 }), ST('weapons5', 'crafting', 'weaponCrafts', 5, { clinks: 500 }),
    ST('crafts25', 'crafting', 'crafts', 25, { clinks: 600 }), ST('mod1', 'crafting', 'modsForged', 1, { clinks: 150 }),
    ST('mods10', 'crafting', 'modsForged', 10, { clinks: 400 }), ST('tune_full', 'crafting', 'tuneFull', 1, { clinks: 600 }),
    ST('max_weapon', 'crafting', 'maxWeapon', 1, { clinks: 500 }), ST('polish3', 'crafting', 'polish3', 1, { clinks: 300 }),
    ST('spr10', 'explorer', 'sprockets', 10, { clinks: 400 }), ST('spr30', 'explorer', 'sprockets', 30, { clinks: 1000 }),
    ST('codex_all', 'explorer', 'codexKinds', 11, { clinks: 500 }), ST('train_plat', 'explorer', 'trainPlat', 1, { clinks: 400 }),
    ST('days3', 'explorer', 'days', 3, { clinks: 100 }), ST('days7', 'explorer', 'days', 7, { clinks: 200 }),
    ST('days14', 'explorer', 'days', 14, { clinks: 400 }), ST('days30', 'explorer', 'days', 30, { clinks: 1000 }),
    ST('race1', 'racer', 'races', 1, { clinks: 100 }), ST('podium', 'racer', 'podiums', 1, { clinks: 200 }),
    ST('race_win', 'racer', 'raceWins', 1, { clinks: 300 }), ST('races10', 'racer', 'races', 10, { clinks: 300 }),
    ST('gold1', 'racer', 'goldTracks', 1, { clinks: 300 }), ST('gold3', 'racer', 'goldTracks', 3, { clinks: 500 }),
    ST('gold_all', 'racer', 'goldTracks', 6, { clinks: 1000 }), ST('plat1', 'racer', 'platTracks', 1, { clinks: 600 }),
    ST('turf_win1', 'turf', 'turfWins', 1, { clinks: 200 }), ST('turf_win10', 'turf', 'turfWins', 10, { clinks: 500 }),
    ST('paint10k', 'turf', 'paintM2', 10000, { clinks: 800 }), ST('coverage60', 'turf', 'coverage60', 1, { clinks: 400 }),
    ST('royale_top3', 'turf', 'royaleTop3', 1, { clinks: 300 }), ST('royale_win', 'turf', 'royaleWins', 1, { clinks: 600 }),
    ST('royale_noheal', 'turf', 'royaleNoHeal', 1, { clinks: 800 }), ST('guard_win', 'turf', 'guardWins', 1, { clinks: 500 }),
  ];
  D.STICKER_IDS = D.STICKERS.map(s => s.id);

  // ------------------------------------------------------------------ profile defaults (GDD §16; soft currency at top-level `clinks`)
  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  D.todayStr = todayStr;
  D.newWeapon = (lvl, xp) => ({ own: true, lvl: lvl || 1, xp: xp || 0, ammo: -1, tune: [0, 0, 0], mods: [null, null, null] });
  D.defaultProfile = function () {
    const parts = {}; for (const id of D.PART_IDS) parts[id] = 0;
    const boss = {}; for (const id of D.BOSS_IDS) boss[id] = { kills: 0, best: null, medal: 0, clears: 0, chests: 0 };
    return {
      v: 1,
      profile: { created: Date.now(), playSec: 0, daysPlayed: 0, lastDay: null, title: null },
      rank: { pr: 1, xp: 0, starXp: 0, guild: 1, heartPlates: 0 },
      clinks: 200,      // tutorial reward card (GDD §17 step 10) is pre-granted
      lumite: 0,
      stamps: 0,
      parts,
      weapons: { fizz: D.newWeapon(1, 0) },
      mods: {},
      blueprints: ['m_power', 'm_mag', 'm_quick', 'm_steady', 'm_clink'],
      gear: {},
      abilities: { dash: true, scan: false, grapple: false, dome: false },
      loadout: {
        wheel: ['fizz', null, null, null, null, null, null, null],
        fav: ['fizz', null, null, null],
        gadget: 'scan',
        gear: { head: null, body: null, back: null, feet: null, trinket: null },
        consumables: { healthPop: 0, shieldCell: 0, revive: 0 },
        pinnedRecipe: null,
      },
      items: { polish: 0 },
      quests: { active: [], done: [], claimed: [], prog: {}, paused: [], visited: [] },
      daily: { day: null, ids: [], goals: [], params: [], prog: [0, 0, 0], claimed: [false, false, false], rerolls: 1, crate: false },
      weekly: { wk: null, ids: [], goals: [], params: [], prog: [0, 0, 0, 0, 0], claimed: [false, false, false, false, false], expedition: false, bonus: false },
      cafe: { lastTreat: null, treatDay: 0, boost: { xp: 0, clinks: 0 } },
      shopDaily: { day: null, bought: { crystal: 0, servo: 0, lens: 0, core: 0, polish: 0 } },
      shopWeekly: { wk: null, lumite: 0 },
      pity: { epic: 0, leg: 0, boss: { crankcrab: 0, buzzhive: 0, titan: 0 }, forge: 0 },
      sprockets: '0'.repeat(D.SPROCKET_COUNT),
      codex: {},
      seen: {},
      stickers: [],
      story: {},
      records: {
        race: {}, ghosts: {}, trials: {}, popup: 0,
        wave: { best: 0, endlessBest: 0 },
        royale: { wins: 0, best: 16, played: 0, top3: 0, noHeal: 0 },
        turf: { wins: 0, played: 0, bestPaint: 0, cov60: 0 },
        boss,
        medals: { race: {}, trials: {} },     // best medal tier per track / trial (0–4)
        rewarded: { race: {}, trials: {} },   // highest first-time medal tier already paid
        races: { played: 0, podiums: 0, wins: 0 },
        defense: { wins: 0 },
      },
      ship: { hull: 0, engine: 0, boost: 0, blaster: 0, paint: 'default' },
      unlocks: { buildings: ['guild', 'fountain', 'training', 'gate'], modes: ['expedition', 'training'], biomes: ['shoals'], tracks: [], classes: ['breeze'], cosmetics: [], toggles: [], recipes: [], features: [], all: false },
      tutorial: { done: false, step: 0, tips: {} },
      stats: { pops: 0, elites: 0, crates: 0, paintCells: 0, crafts: 0, kos: 0, dances: 0, freezes: 0, matches: 0, missions: 0, weaponCrafts: 0, modsForged: 0, gnatLaser: 0, clinksEarned: 0, plates: 0, firstCrafts: [] },
    };
  };

  // ------------------------------------------------------------------ derived helpers
  let _fallback = null;
  // Profile accessor safe before G.Save.load().
  const prof = D.prof = function (p) {
    if (p) return p;
    if (G.Save && G.Save.data && G.Save.data.profile) return G.Save.data.profile;
    return _fallback || (_fallback = D.defaultProfile());
  };
  const ownsGear = (p, id) => !!(id && p.gear && p.gear[id] && p.gear[id].own);

  // Player stats for G.Player (CONTRACT keys + extras for gear-specific systems).
  D.playerStats = function (profile) {
    const p = prof(profile);
    const hp = 100 + 25 * U.clamp((p.rank && p.rank.heartPlates) || 0, 0, 4);
    const s = {
      maxHp: hp, maxShield: 0, regenDelay: 4, shieldRegen: 0, hpRegen: 5, hpRegenDelay: 6, hpRegenStep: 0,
      speedMult: 1, jumpMult: 1, doubleJump: true, airJumps: 1, hopV: 6, glide: false, glideFall: 2.5, glideSpeed: 8,
      jetpack: false, jetFuel: 0, jetAccel: 26, jetMaxUp: 5, jetRefill: 2.0,
      magnetMult: 1, armor: 0, knockbackMult: 1, dashCharges: 2, dashRecharge: 2.5, mantle: true, wallKick: true,
      luck: 0, ammoMult: 1, turfRefill: 1, slideBoost: 3, slideCap: 10.5, slideLenMult: 1, slideJumpMult: 1,
      scanCdMult: 1, pingMark: 0, sprocketRadar: 0, medipump: null,
    };
    const eq = (p.loadout && p.loadout.gear) || {};
    for (const slot of D.GEAR_SLOTS) {
      const id = eq[slot];
      if (!ownsGear(p, id) || !D.GEAR[id] || D.GEAR[id].slot !== slot) continue;
      const g = D.gearStats(id, p.gear[id].lvl || 1);
      switch (id) {
        case 'shield1': case 'shield2': case 'shield3': case 'shield4': s.maxShield = g.shield; s.regenDelay = g.regenDelay; s.shieldRegen = g.shieldRegen; break;
        case 'beanie': s.maxHp += g.hp; s.knockbackMult = g.knockback; break;
        case 'visor': s.pingMark = g.pingMark; s.sprocketRadar = g.radar; s.scanCdMult = g.scanCd; break;
        case 'puffpack': s.jetpack = true; s.jetFuel = g.jetFuel; s.jetAccel = g.jetAccel; s.jetMaxUp = g.jetMaxUp; s.jetRefill = g.jetRefill; break;
        case 'wings': s.glide = true; s.glideFall = g.glideFall; s.glideSpeed = g.glideSpeed; break;
        case 'tankpack': s.ammoMult = g.ammoMult; s.turfRefill = g.turfRefill; break;
        case 'sneakers': s.jumpMult = r2(g.jumpV / 7); s.airJumps = 2; s.hopV = g.hopV; break;
        case 'skates': s.slideBoost = g.slideBoost; s.slideCap = g.slideCap; s.slideLenMult = g.slideLen; s.slideJumpMult = g.slideJump; break;
        case 'magnet': s.magnetMult = r2(g.magnetR / 3); break;
        case 'medipump': s.medipump = g; break;
      }
    }
    const d = D.DIFFICULTY[D.diffId()];
    if (d && d.regenStep) s.hpRegenStep = d.regenStep;  // Spicy/Blazing: regen only to the next 25-HP boundary
    return s;
  };

  // Up to 4 equipped weapons: [{id, level, mods, tune, xp, ammo}] (ammo -1 = full).
  D.loadout = function (profile) {
    const p = prof(profile);
    const out = [];
    const fav = (p.loadout && p.loadout.fav) || [];
    for (const id of fav) {
      const w = id && p.weapons && p.weapons[id];
      if (!w || !w.own || !D.WEAPONS[id] || out.some(o => o.id === id)) continue;
      out.push({ id, level: w.lvl || 1, mods: (w.mods || []).filter(Boolean), tune: (w.tune || [0, 0, 0]).slice(), xp: w.xp || 0, ammo: w.ammo == null ? -1 : w.ammo });
      if (out.length >= 4) break;
    }
    if (!out.length) out.push({ id: 'fizz', level: (p.weapons && p.weapons.fizz && p.weapons.fizz.lvl) || 1, mods: [], tune: [0, 0, 0], xp: 0, ammo: -1 });
    return out;
  };
  // Equipped gadget id (owned GADGET-type ability) or null.
  D.gadget = function (profile) {
    const p = prof(profile);
    const ab = p.abilities || {};
    const g = p.loadout && p.loadout.gadget;
    if (g && ab[g] && D.ABILITIES[g] && D.ABILITIES[g].type === 'gadget') return g;
    for (const id of ['scan', 'dome']) if (ab[id]) return id;
    return null;
  };

  // Display stats for a weapon at level/mods/tune (mirror of GDD numbers; 16_weapons.js is authoritative).
  D.weaponStats = function (id, lvl, mods, tune) {
    const w = D.WEAPONS[id]; if (!w) return null;
    const L = D.WEAPON_LEVELS[U.clamp(lvl || 1, 1, 5)];
    tune = tune || [0, 0, 0]; mods = (mods || []).filter(Boolean);
    let dmg = 1 + D.TUNE.power * tune[0], ammo = 1 + D.TUNE.capacity * tune[1], rate = 1 + D.TUNE.rate * tune[2], spread = 1 + D.TUNE.spread * tune[2];
    for (const m of mods) { const fx = D.MODS[m] && D.MODS[m].fx; if (!fx) continue; dmg += fx.damage || 0; ammo += fx.ammo || 0; rate += fx.rate || 0; spread += fx.spread || 0; }
    const b = w.stats;
    return {
      damage: r2(b.damage * L.dmg * dmg), rate: r2(b.rate * rate), range: b.range, aoe: b.aoe,
      ammo: w.infinite ? 0 : Math.round(b.ammo * L.ammo * ammo), spread: r2(b.spread * Math.max(0.1, spread)),
      dps: Math.round(b.dps * L.dmg * dmg * rate), slots: L.slots, infinite: w.infinite,
    };
  };
  // Max field ammo for an owned weapon (0 = infinite). Prefers G.Weapons.statsFor when present.
  D.maxAmmo = function (id, profile) {
    const p = prof(profile); const w = p.weapons && p.weapons[id]; const def = D.WEAPONS[id];
    if (!def || def.infinite) return 0;
    const lvl = (w && w.lvl) || 1, mods = w ? (w.mods || []).filter(Boolean) : [];
    let n = 0;
    if (G.Weapons && G.Weapons.statsFor) { const s = G.safe('statsFor', () => G.Weapons.statsFor(id, lvl, mods)); if (s && (s.maxAmmo || s.ammo)) n = s.maxAmmo || s.ammo; }
    if (!n) n = D.weaponStats(id, lvl, mods, w && w.tune).ammo;
    return Math.round(n * D.playerStats(p).ammoMult);
  };

  // ---------- loot rolls
  const R_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  function weightedKey(w, rng) {
    let total = 0; for (const k in w) total += Math.max(0, w[k]);
    if (total <= 0) return null;
    let r = rng() * total;
    for (const k in w) { const v = Math.max(0, w[k]); if (v <= 0) continue; r -= v; if (r < 0) return k; }
    for (const k in w) if (w[k] > 0) return k;
    return null;
  }
  // Move difficulty/heat loot points from Common (then Uncommon) into R/E/L. noLeg folds L into E.
  function applyShift(w, ctx, noLeg) {
    const d = D.DIFFICULTY[ctx.diff];
    const sh = {};
    if (d && d.shift) for (const k in d.shift) sh[k] = d.shift[k];
    if (ctx.heat > 0) { const h = D.LOOT.heatShift * Math.min(ctx.heat, D.HEAT_MAX) / 2; sh.rare = (sh.rare || 0) + h; sh.epic = (sh.epic || 0) + h; }
    if (noLeg && sh.legendary) { sh.epic = (sh.epic || 0) + sh.legendary; delete sh.legendary; }
    let take = 0; for (const k in sh) take += sh[k];
    if (take <= 0) return w;
    let got = Math.min(w.common || 0, take); w.common = (w.common || 0) - got;
    if (got < take) { const g2 = Math.min(w.uncommon || 0, take - got); w.uncommon = (w.uncommon || 0) - g2; got += g2; }
    const k = got / take;
    for (const r in sh) w[r] = (w[r] || 0) + sh[r] * k;
    return w;
  }
  function applyLuck(w, luck) { if (luck > 0) for (const r of ['rare', 'epic', 'legendary']) if (w[r]) w[r] *= 1 + luck; return w; }
  function tierWeights(source, ctx) {
    const w = Object.assign({}, D.LOOT.tiers[source]);
    applyShift(w, ctx, false); applyLuck(w, ctx.luck);
    if (ctx.minRarity) { const mr = R_ORDER.indexOf(ctx.minRarity); R_ORDER.forEach((r, i) => { if (i < mr) w[r] = 0; }); }
    return w;
  }
  // Stage 1 for tier sources, with pity counters (separate per tier).
  function rollTier(source, ctx) {
    let r = weightedKey(tierWeights(source, ctx), ctx.rng) || 'common';
    const pity = ctx.pity, metal = D.LOOT.metalPlus.includes(source), leg = D.LOOT.legSources.includes(source);
    if (pity) {
      if (leg && pity.leg >= D.LOOT.pity.leg) r = 'legendary';
      else if (metal && pity.epic >= D.LOOT.pity.epic && R_ORDER.indexOf(r) < 3) r = 'epic';
      if (metal) pity.epic = R_ORDER.indexOf(r) >= 3 ? 0 : pity.epic + 1;
      if (leg) pity.leg = r === 'legendary' ? 0 : pity.leg + 1;
    }
    return r;
  }
  // Stage 2: a part within the tier (enemy table first, else uniform within the tier).
  function partInTier(r, ctx, out) {
    if (r === 'legendary') {
      if (ctx.bossPart) out.push({ type: 'part', partId: ctx.bossPart, rarity: 'legendary', n: 1 });
      else if (ctx.anyLegendary) out.push({ type: 'part', partId: U.pick(D.PARTS_BY_RARITY.legendary), rarity: 'legendary', n: 1 });
      else out.push({ type: 'part', partId: 'lumite', rarity: 'legendary', n: 1 });
      return;
    }
    if (r === 'epic') {
      out.push({ type: 'part', partId: 'core', rarity: 'epic', n: 1 });
      if (ctx.blueprints && ctx.rng() < D.LOOT.blueprintChance) out.push({ type: 'blueprint', id: 'wild' });
      return;
    }
    let id = null;
    if (ctx.parts) {
      const w = {}; for (const k in ctx.parts) if (D.PARTS[k] && D.PARTS[k].rarity === r) w[k] = ctx.parts[k];
      id = weightedKey(w, ctx.rng);
    }
    if (!id) { const list = D.PARTS_BY_RARITY[r] || D.PARTS_BY_RARITY.common; id = list[Math.floor(ctx.rng() * list.length)]; }
    out.push({ type: 'part', partId: id, rarity: r, n: 1 });
  }
  function ensurePity(p) {
    if (!p.pity) p.pity = { epic: 0, leg: 0, boss: {}, forge: 0 };
    if (!p.pity.boss) p.pity.boss = {};
    return p.pity;
  }
  const rint = (rng, a, b) => Math.floor(a + rng() * (b - a + 1));
  // rollLoot(table, opts) — a full drop. table: enemy id | boss id | 'boss_<id>' | 'wood'|'metal'|'elite'|'gold'|
  //   'boss'|'floor'|'bin'|'lumite'|'legendary'. opts: {difficulty, luck, elite, rolls, boss, firstKill, heat,
  //   clinkMult, extraRolls, blueprints, rng, noPity, profile}.
  // rollLoot(table, luck:number) — CONTRACT single-roll form (used by 17_enemies.rollParts): exactly ONE part
  //   roll from that table, no clinks (tier tables keep their pity counters).
  // Returns [{type:'part', partId, rarity, n} | {type:'bolt', value} | {type:'blueprint', id} (only with opts.blueprints)].
  D.rollLoot = function (table, opts) {
    const single = typeof opts === 'number';
    if (single) opts = { luck: opts };
    opts = opts || {};
    if (table && typeof table === 'object') { let id = null; for (const k in D.LOOT) if (D.LOOT[k] === table) { id = k; break; } table = id || table.id || null; }
    if (typeof table === 'string' && table.indexOf('boss_') === 0) { opts = Object.assign({}, opts, { boss: table.slice(5) }); table = 'boss'; }
    const p = prof(opts.profile);
    const rng = opts.rng || Math.random;
    const ctx = {
      diff: D.DIFFICULTY[opts.difficulty] ? opts.difficulty : D.diffId(), heat: opts.heat || 0,
      luck: opts.luck != null ? opts.luck : (D.playerStats(p).luck || 0), rng,
      pity: opts.noPity ? null : ensurePity(p), blueprints: !!opts.blueprints,
    };
    const out = [];
    const E = D.LOOT.enemies[table];
    const B = D.LOOT.bosses[table] || (table === 'boss' ? D.LOOT.bosses[opts.boss] : null);
    if (single) {
      if (E) {
        const tw = {}; for (const k in E.parts) { const r = D.PARTS[k].rarity; tw[r] = (tw[r] || 0) + E.parts[k]; }
        partInTier(weightedKey(applyLuck(applyShift(tw, ctx, true), ctx.luck), rng) || 'common', Object.assign({}, ctx, { parts: E.parts }), out);
      } else if (B || table === 'boss') {
        const bctx = Object.assign({}, ctx, { bossPart: B ? B.part : null, anyLegendary: !B });
        partInTier(rollTier('boss', bctx), bctx, out);
      } else if (D.LOOT.tiers[table]) partInTier(rollTier(table, ctx), ctx, out);
      else if (table === 'lumite') out.push({ type: 'part', partId: 'lumite', rarity: 'epic', n: rint(rng, 1, 3) });
      else if (table === 'legendary') partInTier('legendary', Object.assign({}, ctx, { anyLegendary: true }), out);
    } else if (E) {
      const elite = !!opts.elite;
      const v = Math.round(rint(rng, E.clinks[0], E.clinks[1]) * (elite ? D.ELITE.clinkMult : 1) * (opts.clinkMult || 1));
      if (v > 0) out.push({ type: 'bolt', value: v });
      const parts = Object.assign({}, E.parts); if (elite) parts.core = (parts.core || 0) + D.ELITE.coreWeight;
      const tw = {}; for (const k in parts) { const r = D.PARTS[k].rarity; tw[r] = (tw[r] || 0) + parts[k]; }
      const pctx = Object.assign({}, ctx, { parts, blueprints: false });
      const rolls = E.rolls + (opts.extraRolls || 0);
      for (let i = 0; i < rolls; i++) {
        const w = applyLuck(applyShift(Object.assign({}, tw), ctx, true), ctx.luck);
        partInTier(weightedKey(w, rng) || 'common', pctx, out);
      }
      if (elite) partInTier(rollTier('elite', Object.assign({}, ctx, { minRarity: 'rare' })), ctx, out);
    } else if (table === 'wood' || table === 'metal') {
      const C = D.LOOT.crates[table];
      out.push({ type: 'bolt', value: rint(rng, C.clinks[0], C.clinks[1]) });
      const rolls = table === 'wood' ? (rng() < C.rollChance ? 1 : 0) : C.rolls;
      for (let i = 0; i < rolls + (opts.extraRolls || 0); i++) partInTier(rollTier(table, ctx), ctx, out);
    } else if (table === 'lumite') {
      out.push({ type: 'part', partId: 'lumite', rarity: 'epic', n: rint(rng, 1, 3) });
    } else if (table === 'legendary') {
      for (let i = 0; i < (opts.rolls || 1); i++) partInTier('legendary', Object.assign({}, ctx, { anyLegendary: true }), out);
    } else if (B || table === 'boss') {
      const bid = B ? B.id : null;
      const bctx = Object.assign({}, ctx, { bossPart: B ? B.part : null, anyLegendary: !B });
      const start = out.length;
      for (let i = 0; i < (opts.rolls || 3); i++) partInTier(rollTier('boss', bctx), bctx, out);
      if (B) {
        let got = out.slice(start).filter(e => e.partId === B.part).length;
        const pb = ctx.pity ? ctx.pity.boss : {};
        if (opts.firstKill) {
          if (!got) { out.push({ type: 'part', partId: B.part, rarity: 'legendary', n: 1 }); got++; }
          if (rng() < B.second) out.push({ type: 'part', partId: B.part, rarity: 'legendary', n: 1 });
        } else if (!got && (pb[bid] || 0) >= D.LOOT.pity.boss - 1) { out.push({ type: 'part', partId: B.part, rarity: 'legendary', n: 1 }); got++; }
        if (ctx.pity) pb[bid] = got ? 0 : (pb[bid] || 0) + 1;
      }
    } else if (D.LOOT.tiers[table]) {
      for (let i = 0; i < (opts.rolls || 1); i++) partInTier(rollTier(table, ctx), ctx, out);
    } else {
      console.warn('[Data] unknown loot table', table);
    }
    if (ctx.pity && G.Save && G.Save.data && p === G.Save.data.profile) G.Save.save();
    return out;
  };
  // Rarity-only roll (Royale floor/bin loot etc.). No pity unless opts.pity.
  D.rollRarity = function (table, opts) {
    opts = opts || {};
    const ctx = { diff: D.DIFFICULTY[opts.difficulty] ? opts.difficulty : D.diffId(), heat: 0, luck: opts.luck || 0, rng: opts.rng || Math.random, pity: null };
    return weightedKey(tierWeights(D.LOOT.tiers[table] ? table : 'floor', ctx), ctx.rng) || 'common';
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 13_data.js]', e); }
// ---- 13b_wardrobe.js
try { (function () {
// 13b_wardrobe.js — the Ranger Locker data and G.Wardrobe API: four playable rangers (each its own silhouette,
// three colourways), gauntlet tints, Beepo hats, dash/jump trails and skiff paints. Pure data + profile state;
// the models are built by 15b_geo_chars.js (G.Geo.ranger / companion hats), the first-person glove by
// 16b_weapons_vm.js (palette), the locker screen by 30b_menus_town.js.
//
//   G.Wardrobe.RANGERS                     [{id, build, helmet, face, unlock, cws:[{id, suit, suit2, trim, glove, gloveDark, cuff, boot,
//                                           extra, extra2, skin, skin2, eye, visor}]}]
//   G.Wardrobe.equipped() -> {ranger, cw, gauntlet, hat, trail, paint}   (lazily initialised profile state: G.Save.prof.wardrobe)
//   G.Wardrobe.equip(slot, id, cw?) -> bool    slot 'ranger' | 'gauntlet' | 'hat' | 'trail' | 'paint'; emits bus 'wardrobe'(slot, id)
//   G.Wardrobe.owns(slot, id) / list(slot) -> [{id, owned, on, nameKey, name, hint}] / hint(slot, id) -> localized unlock text
//   G.Wardrobe.palette() -> {glove, gloveDark, cuff, sleeve, sleeveDark, badge|null, band|null, gold, key}   (first-person rig)
//   G.Wardrobe.rangerColors(id?, cw?, gauntlet?) -> full colour set for G.Geo.ranger (equipped look by default)
//   G.Wardrobe.rangerName(id?) / shipColors(paint?) -> {main, accent, glow}|null / trailStyle(id?) -> {shape, colors, size}|null
//   G.Wardrobe.checkNew() — newly granted looks are put on once if that slot still shows the default (rewards are seen at once)
// Unlocks: Kiko and Pip are free; Juno arrives with the Player Rank 5 reward (Beepo Ranger Cap), Tuck with the Rank 10 reward
// (Bubble Trail). Cosmetics are owned when 14_progress has granted them (profile.unlocks.cosmetics, 13_data D.COSMETICS).
(function (G) {
  'use strict';
  const SLOTS = ['ranger', 'gauntlet', 'hat', 'trail', 'paint'];
  // ------------------------------------------------------------------ rangers (original designs)
  // build: body proportions in G.Geo.ranger; helmet: the head piece; face: 'toon' | 'led'.
  const RANGERS = [
    { id: 'kiko', build: 'standard', helmet: 'bubble', face: 'toon', unlock: { free: true },
      cws: [
        { id: 'reef', suit: 0x2ec4b6, suit2: 0x1d8a80, trim: 0xffd23f, glove: 0x2ec4b6, gloveDark: 0x22a89b, cuff: 0xffd23f, boot: 0xffffff, extra: 0xff9fc2, extra2: 0x7af0ff, skin: 0xffdcc8 },
        { id: 'sunset', suit: 0xff8a65, suit2: 0xd9614a, trim: 0xfff1a8, glove: 0xff8a65, gloveDark: 0xe06c50, cuff: 0xfff1a8, boot: 0xfff6e8, extra: 0xffb0d0, extra2: 0xffd23f, skin: 0xffdcc8 },
        { id: 'starlight', suit: 0x6c7cf0, suit2: 0x4652c4, trim: 0x9ff6ff, glove: 0x6c7cf0, gloveDark: 0x5462d0, cuff: 0x9ff6ff, boot: 0xf3faff, extra: 0xc9a8ff, extra2: 0xffd23f, skin: 0xffdcc8 },
      ] },
    { id: 'pip', build: 'compact', helmet: 'dome', face: 'toon', unlock: { free: true },
      cws: [
        { id: 'bubblegum', suit: 0xff8fc0, suit2: 0xe066a0, trim: 0xffd23f, glove: 0xfff1dc, gloveDark: 0xefd9bf, cuff: 0xff5fa2, boot: 0xfff1dc, extra: 0xffffff, extra2: 0xffd23f, skin: 0xbfe9ff },
        { id: 'mint', suit: 0x6fe0b4, suit2: 0x3fbf8f, trim: 0xff8fc0, glove: 0xfff1dc, gloveDark: 0xefd9bf, cuff: 0xff8fc0, boot: 0xfff6fb, extra: 0xffffff, extra2: 0xff8fc0, skin: 0xffe0ee },
        { id: 'lemon', suit: 0xffd45c, suit2: 0xf0a830, trim: 0x5cc8ff, glove: 0xffffff, gloveDark: 0xe6eef8, cuff: 0x5cc8ff, boot: 0xf3faff, extra: 0xffffff, extra2: 0x5cc8ff, skin: 0xdcd0ff },
      ] },
    { id: 'juno', build: 'tall', helmet: 'fins', face: 'led', unlock: { rank: 5, cosmetic: 'hat_cap' },
      cws: [
        { id: 'lilac', suit: 0xb983ff, suit2: 0x8a5fe0, trim: 0x7af0ff, glove: 0xf3faff, gloveDark: 0xd6e2f2, cuff: 0x7af0ff, boot: 0x5b3a8c, extra: 0x7af0ff, extra2: 0xf3faff, skin: 0xf3faff, eye: 0x7af0ff, visor: 0x2a1b3d },
        { id: 'ocean', suit: 0x3fa9ff, suit2: 0x2a7fd6, trim: 0xffd23f, glove: 0xf3faff, gloveDark: 0xd6e2f2, cuff: 0xffd23f, boot: 0x1f2a5a, extra: 0xffd23f, extra2: 0xf3faff, skin: 0xf3faff, eye: 0xffe066, visor: 0x1f2a5a },
        { id: 'mango', suit: 0xffa53d, suit2: 0xe07a20, trim: 0xff7ab8, glove: 0xfff6e8, gloveDark: 0xf0dcc8, cuff: 0xff7ab8, boot: 0x5b3a3a, extra: 0xff7ab8, extra2: 0xfff6e8, skin: 0xfff6e8, eye: 0xa8ffcf, visor: 0x3a2050 },
      ] },
    { id: 'tuck', build: 'sturdy', helmet: 'goggles', face: 'toon', unlock: { rank: 10, cosmetic: 'trail_bubbles' },
      cws: [
        { id: 'acorn', suit: 0x3ddc97, suit2: 0x26a874, trim: 0xffd23f, glove: 0xff8a4c, gloveDark: 0xe06a30, cuff: 0xffd23f, boot: 0x8a5a3c, extra: 0xff8a4c, extra2: 0x9ff6ff, skin: 0xe0b088, skin2: 0xfff1dc },
        { id: 'berry', suit: 0x8f6bff, suit2: 0x6a48d8, trim: 0xff8fc0, glove: 0xffd23f, gloveDark: 0xe8b020, cuff: 0xff8fc0, boot: 0x5b3a8c, extra: 0xffd23f, extra2: 0x9ff6ff, skin: 0xd8a47c, skin2: 0xfff1dc },
        { id: 'sky', suit: 0x33b5ff, suit2: 0x1f8ad8, trim: 0xfff1dc, glove: 0xff6b8b, gloveDark: 0xe04f70, cuff: 0xfff1dc, boot: 0x2b3170, extra: 0xff6b8b, extra2: 0xfff6a8, skin: 0xe8bc94, skin2: 0xfff6e8 },
      ] },
  ];
  const RBY = {}; for (const r of RANGERS) RBY[r.id] = r;
  // ------------------------------------------------------------------ gauntlets (first-person glove + the ranger's mittens)
  // 'suit' = the ranger's own gloves. badge = star emblem on the back of the mitten, band = a ring on the cuff.
  const GAUNTLETS = {
    suit: null,
    gauntlet_kiko: { glove: 0x2ec4b6, gloveDark: 0x22a89b, cuff: 0xffd23f, badge: 0xffd23f, band: 0xff9f45 },
    skin_gold: { glove: 0xffc21a, gloveDark: 0xe8a010, cuff: 0xfff6d8, badge: 0xffffff, band: 0xff9f45, gold: true },
  };
  const HATS = ['none', 'hat_party', 'hat_cap', 'hat_crown', 'hat_wizard'];
  const TRAILS = {
    none: null,
    // saturated pastels: the puffs are alpha-blended, so they keep their colour on sand, snow and the bright plaza
    trail_bubbles: { shape: 'ring', colors: [0x4fc8ff, 0x7fdcff, 0x9f8cff], size: 0.2, grav: -1.4, spin: 0, dot: 0.9, dotShape: 'glow', dotA: 0.3 },   // ring + a faint fill = a bubble
    // the FX sparkle has thin rays and a white core: a small glossy candy dot of the same colour sits in its middle so
    // each star keeps its colour and reads at a glance
    trail_stars: { shape: 'star', colors: [0xffb81a, 0xff5fa8, 0x3fc4ff], size: 0.3, grav: 0.4, spin: 4, dot: 0.36, dotShape: 'blob', dotA: 0.92 },
  };
  // same colours as the Rally's own table (23_race.js PAINTS); 'none' = the classic teal skiff
  const PAINTS = {
    none: { main: 0x2ec4b6, accent: 0xffd23f, glow: 0x7af0ff },
    paint_streak: { main: 0xff5fa2, accent: 0x7af0ff, glow: 0xffd23f },
    paint_prismatic: { main: 0xb983ff, accent: 0x7af0ff, glow: 0xff9de2 },
    paint_golden: { main: 0xffc21a, accent: 0xfff1dc, glow: 0xffe9a8 },
  };
  const DEF = { ranger: 'kiko', cw: 0, gauntlet: 'suit', hat: 'none', trail: 'none', paint: 'none' };
  const IDS = { ranger: RANGERS.map(r => r.id), gauntlet: Object.keys(GAUNTLETS), hat: HATS, trail: Object.keys(TRAILS), paint: Object.keys(PAINTS) };

  // ------------------------------------------------------------------ profile state (lazy, repairs damaged values)
  function prof() { return G.Save && G.Save.data ? G.Save.prof : null; }
  let _mem = null;   // before the save exists (boot) / storage blocked
  function st() {
    const p = prof();
    let s = p ? p.wardrobe : _mem;
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      s = Object.assign({ seen: [] }, DEF);
      // a skiff paint bought before the locker existed (23_race reads profile.ship.paint)
      if (p && p.ship && PAINTS[p.ship.paint] && p.ship.paint !== 'none') s.paint = p.ship.paint;
      // seen stays empty: looks earned before the locker existed were never visible, so checkNew puts them on once too
      if (p) p.wardrobe = s; else _mem = s;
    }
    for (const k of SLOTS) if (IDS[k].indexOf(s[k]) < 0) s[k] = DEF[k];
    s.cw = Math.max(0, Math.min(2, Math.round(+s.cw) || 0));
    if (!Array.isArray(s.seen)) s.seen = [];
    return s;
  }
  function ownedCosmetics(p) { p = p || prof(); const u = p && p.unlocks; return u && Array.isArray(u.cosmetics) ? u.cosmetics : []; }
  function debugAll(p) { p = p || prof(); return !!(p && p.unlocks && p.unlocks.all); }
  function playerRank() { try { return G.Progress && G.Progress.rankInfo ? G.Progress.rankInfo().pr : 1; } catch (e) { return 1; } }
  function save() { if (G.Save && G.Save.data) G.Save.save(); }

  const W = G.Wardrobe = { SLOTS, RANGERS, GAUNTLETS, HATS, TRAILS, PAINTS, IDS };
  W.ranger = id => RBY[id] || RBY.kiko;
  W.state = st;
  W.equipped = function () { const s = st(); return { ranger: s.ranger, cw: s.cw, gauntlet: s.gauntlet, hat: s.hat, trail: s.trail, paint: s.paint }; };
  W.owns = function (slot, id) {
    if (slot === 'ranger') {
      const r = RBY[id]; if (!r) return false;
      const u = r.unlock || {};
      if (u.free || debugAll()) return true;
      if (u.cosmetic && ownedCosmetics().indexOf(u.cosmetic) >= 0) return true;
      return !!(u.rank && playerRank() >= u.rank);
    }
    if (IDS[slot] && IDS[slot].indexOf(id) < 0) return false;
    if (id === 'none' || id === 'suit') return true;
    return debugAll() || ownedCosmetics().indexOf(id) >= 0;
  };
  W.equip = function (slot, id, cw) {
    if (SLOTS.indexOf(slot) < 0 || !W.owns(slot, id)) return false;
    const s = st();
    const prev = slot === 'ranger' ? s.ranger + ':' + s.cw : s[slot];
    s[slot] = id;
    if (slot === 'ranger' && cw != null) s.cw = Math.max(0, Math.min(2, cw | 0));
    if (slot === 'paint') { const p = prof(); if (p && p.ship && typeof p.ship === 'object') p.ship.paint = id === 'none' ? 'default' : id; }   // ('default' = the profile's own default value)
    save();
    const now = slot === 'ranger' ? s.ranger + ':' + s.cw : s[slot];
    if (now !== prev) { _palKey = ''; G.bus.emit('wardrobe', slot, id); }
    return true;
  };
  // ------------------------------------------------------------------ names + unlock hints
  const t = (k, p) => G.t(k, p);
  W.nameKey = function (slot, id) {
    if (slot === 'ranger') return 'ranger.' + id;
    if (id === 'suit') return 'wr.suitGloves';
    if (id === 'none') return slot === 'hat' ? 'wr.hatNone' : slot === 'trail' ? 'wr.trailNone' : 'wr.paintNone';
    return 'cos.' + id;
  };
  W.name = (slot, id) => t(W.nameKey(slot, id));
  W.rangerName = id => t('ranger.' + (RBY[id] ? id : st().ranger));
  // Where a cosmetic comes from, read from the progression tables (13_data): tutorial, rank reward, sprocket milestone, quest.
  function source(id) {
    const D = G.Data || {};
    if (id === 'gauntlet_kiko') return { kind: 'tutorial' };
    if (D.XP && D.XP.rankReward) for (let pr = 1; pr <= (D.XP.cap || 30); pr++) { const r = D.XP.rankReward(pr); if (r && r.cosmetic === id) return { kind: 'rank', n: pr }; }
    for (const m of D.SPROCKET_MILESTONES || []) if (m.cosmetic === id) return { kind: 'sprockets', n: m.n };
    for (const q in D.QUESTS || {}) { const rw = D.QUESTS[q].rewards; if (rw && [].concat(rw.cosmetic || []).indexOf(id) >= 0) return { kind: 'quest', id: q }; }
    return null;
  }
  W.source = source;
  W.hint = function (slot, id) {
    if (slot === 'ranger') { const u = (RBY[id] || {}).unlock || {}; return u.free ? t('wr.hint.free') : t('wr.hint.rank', { n: u.rank || 1 }); }
    const s = source(id);
    if (!s) return '';
    if (s.kind === 'tutorial') return t('wr.hint.tutorial');
    if (s.kind === 'rank') return t('wr.hint.rank', { n: s.n });
    if (s.kind === 'sprockets') return t('wr.hint.sprockets', { n: s.n });
    const qk = 'quest.' + s.id + '.title';
    return t('wr.hint.quest', { name: G.i18n.has(qk) ? t(qk) : s.id });
  };
  W.list = function (slot) {
    const e = W.equipped();
    return (IDS[slot] || []).map(id => ({ id, owned: W.owns(slot, id), on: e[slot] === id, nameKey: W.nameKey(slot, id), name: W.name(slot, id), hint: W.owns(slot, id) ? '' : W.hint(slot, id) }));
  };

  // ------------------------------------------------------------------ colours
  function cwOf(id, cw) { const r = W.ranger(id); return r.cws[Math.max(0, Math.min(r.cws.length - 1, cw | 0))]; }
  W.colorway = cwOf;
  // Full colour set for the 3D ranger: colourway + gauntlet tint (gloves, cuffs, badge) + the golden accent.
  W.rangerColors = function (id, cw, gauntlet) {
    const e = st();
    if (id == null) { id = e.ranger; if (cw == null) cw = e.cw; }
    if (gauntlet == null) gauntlet = e.gauntlet;
    const C = Object.assign({ ranger: W.ranger(id).id }, cwOf(id, cw));
    const g = GAUNTLETS[gauntlet];
    C.badge = null; C.band = null; C.gold = false;
    if (g) { C.glove = g.glove; C.gloveDark = g.gloveDark; C.cuff = g.cuff; C.badge = g.badge; C.band = g.band; C.gold = !!g.gold; }
    if (C.gold) C.trim = 0xffc21a;
    C.key = [C.ranger, C.id, C.suit, C.suit2, C.trim, C.glove, C.gloveDark, C.cuff, C.badge, C.band].join(',');
    return C;
  };
  // First-person rig palette: the equipped ranger's sleeves + the equipped gloves (same values the 3D mittens use).
  let _palKey = '', _pal = null;
  W.palette = function () {
    const s = st(), key = s.ranger + '|' + s.cw + '|' + s.gauntlet;
    if (_pal && key === _palKey) return _pal;
    const C = W.rangerColors(s.ranger, s.cw, s.gauntlet);
    _pal = { glove: C.glove, gloveDark: C.gloveDark || C.glove, cuff: C.cuff, sleeve: C.suit2, sleeveDark: C.suit2, suit: C.suit, badge: C.badge, band: C.band, gold: C.gold, key: C.key };
    _palKey = key;
    return _pal;
  };
  W.shipColors = function (paint) { const id = paint != null ? paint : st().paint; return id && id !== 'none' && PAINTS[id] ? PAINTS[id] : null; };
  W.trailStyle = function (id) { return TRAILS[id != null ? id : st().trail] || null; };

  // ------------------------------------------------------------------ new rewards are worn at once
  // A newly granted gauntlet / hat / trail / paint is equipped once when that slot still shows its default, so the
  // "New look!" reward is visible straight away (the 'seen' list keeps a later un-equip respected).
  W.checkNew = function () {
    const p = prof(); if (!p) return [];
    const s = st(), owned = ownedCosmetics(p), put = [];
    for (const id of owned) {
      if (s.seen.indexOf(id) >= 0) continue;
      s.seen.push(id);
      const slot = GAUNTLETS[id] !== undefined ? 'gauntlet' : HATS.indexOf(id) >= 0 ? 'hat' : TRAILS[id] !== undefined ? 'trail' : PAINTS[id] ? 'paint' : null;
      if (slot && s[slot] === DEF[slot] && W.equip(slot, id)) put.push({ slot, id });
    }
    if (put.length || owned.length !== s._n) { s._n = owned.length; save(); }
    return put;
  };
  // Toast for looks put on automatically. Never in the middle of a results reveal: while a mode is paying out
  // (G.Progress holds its fx) it waits for the results screen, which shows it with its own held toasts once the
  // stars / count-up / chimes are over (G.Menus.heldToast); with no results screen revealing it shows at once.
  // (G.Progress releases a hold on its own after a few seconds, so a wait here always ends.) Looks put on in separate
  // checks while one toast is waiting (a rank-up hat, then a quest's trail) each keep their own line, one per slot.
  let pend = [], pendT = 0;
  function flush() {
    clearTimeout(pendT); pendT = 0;
    if (!pend.length) return;
    const Pr = G.Progress;
    if ((Pr && Pr.isHolding && Pr.isHolding()) || (G.Game && G.Game._switching)) { pendT = setTimeout(flush, 300); return; }   // results about to open
    const list = pend; pend = [];
    for (const it of list) {
      const txt = t('wr.autoEquip', { name: W.name(it.slot, it.id) }), o = { color: '#f3eeff' };
      G.safe('wardrobe toast', () => { if (!(G.Menus && G.Menus.heldToast && G.Menus.heldToast(txt, o))) G.UI.toast(txt, o); });
    }
  }
  function announce(put) {
    if (!put.length || !G.UI || !G.UI.toast) return;
    const it = put[put.length - 1];
    pend = pend.filter(q => q.slot !== it.slot);   // a newer look for the same slot replaces the waiting one
    pend.push(it);
    clearTimeout(pendT); pendT = setTimeout(flush, 120);
  }
  W._toastPending = () => pend.length > 0;   // (tests)
  const recheck = () => G.safe('wardrobe check', () => announce(W.checkNew()));
  if (G.bus) {
    G.bus.on('mode', recheck);
    G.bus.on('rank-up', recheck);
    G.bus.on('quest-complete', () => setTimeout(recheck, 50));
    G.bus.on('sprocket', recheck);
    G.bus.on('ui-empty', recheck);
    G.bus.on('save-reset', () => { _mem = null; _palKey = ''; G.bus.emit('wardrobe', 'reset', null); });
  }

  // ------------------------------------------------------------------ dash / jump trail (first person)
  // Little bubbles or stars puff out on a dash, a jump, a double jump and a hard landing. First person only shows what is
  // in front: a phone in landscape sees just ~29° below the horizon, so a puff at the feet (or nearer than ~2 m) is never
  // on screen. The puffs therefore start 1.8–3.4 m ahead, 0.6–1.3 m to the side and 0.5–1.1 m below the eye, i.e. in the
  // lower corners of the view (>= 12° from the crosshair), and the ranger rising / dashing past makes them slide down and
  // out. Alpha-blended (they keep their colour on bright ground), shared particle systems (no draw call of their own),
  // sparse and short (0.4–0.6 s); half as many with Reduce motion.
  const _p = { x: 0, y: 0, z: 0 }, _v = { x: 0, y: 0, z: 0 }, _o = { shape: 'ring', grav: 0, drag: 2.2, spin: 0, alpha: 0.92, normal: true };
  const _P = { px: 0, py: 0, pz: 0, fx: 0, fz: -1, rx: 1, rz: 0, vx: 0, vz: 0 };   // this tick's player frame (no allocation)
  function puff(w, T, x, y, z, vx, vy, vz, k) {
    _p.x = x; _p.y = y; _p.z = z; _v.x = vx; _v.y = vy; _v.z = vz;
    _o.shape = T.shape; _o.grav = T.grav; _o.spin = T.spin; _o.drag = 2.2;
    const c = T.colors[(Math.random() * T.colors.length) | 0], s = T.size * (0.75 + Math.random() * 0.5) * (k || 1), life = 0.42 + Math.random() * 0.2;
    w.fx.spawn(_p, _v, c, s, life, _o);
    if (T.dot) { _o.shape = T.dotShape; _o.spin = 0; _o.alpha = T.dotA; w.fx.spawn(_p, _v, c, s * T.dot, life, _o); _o.alpha = 0.92; }
  }
  // n puffs alternating left / right of the view: a0..a0+0.8 m ahead, 0.6–1.3 m aside, y0..y0+0.35 m above the feet,
  // drifting outward (+ up) and carried along by half the ranger's run so they do not vanish behind at once
  function fan(w, T, n, a0, y0, up, k) {
    const P = _P;
    for (let i = 0; i < n; i++) {
      const sd = i % 2 ? 1 : -1, a = a0 + Math.random() * 0.8, l = 0.6 + Math.random() * 0.7, ox = P.rx * sd, oz = P.rz * sd, s = 0.8 + Math.random() * 0.6;
      puff(w, T, P.px + P.fx * a + ox * l, P.py + y0 + Math.random() * 0.35, P.pz + P.fz * a + oz * l, ox * s + P.vx * 0.5, up + Math.random() * 0.5, oz * s + P.vz * 0.5, k);
    }
  }
  function trailTick(w, S, dt) {
    const p = w.player;
    if (!p || !p.isPlayer || !w.fx || p.alive === false || p.hidden) return;
    const T = TRAILS[st().trail];
    if (!T) { S.dash = p.dashT > 0; S.jumps = p.jumps || 0; S.g = !!p.grounded; S.vy = p.vel ? p.vel.y : 0; return; }
    const rm = G.Save && G.Save.data && G.Save.set.reducedMotion ? 0.5 : 1;
    const yaw = p.yaw || 0, P = _P, v = p.vel || _v;
    P.fx = -Math.sin(yaw); P.fz = -Math.cos(yaw); P.rx = -P.fz; P.rz = P.fx;   // view forward / right on the ground
    P.px = p.pos.x; P.py = p.pos.y; P.pz = p.pos.z; P.vx = v.x || 0; P.vz = v.z || 0;
    const dash = p.dashT > 0, jumps = p.jumps || 0, g = !!p.grounded;
    // dash: a stream along both lower corners, carried a little by the dash, so it slides past during the 0.18 s burst
    if (dash) {
      S.acc += dt * 50 * rm;
      while (S.acc >= 1) {
        S.acc -= 1;
        const sd = Math.random() < 0.5 ? -1 : 1, a = 1.8 + Math.random() * 1.6, l = 0.75 + Math.random() * 0.45;
        puff(w, T, P.px + P.fx * a + P.rx * sd * l, P.py + 0.5 + Math.random() * 0.45, P.pz + P.fz * a + P.rz * sd * l, P.vx * 0.45 + P.rx * sd * 0.8, 0.4 + Math.random() * 0.5, P.vz * 0.45 + P.rz * sd * 0.8);
      }
    } else S.acc = 0.6;
    // ground jump: a fan of puffs left behind as the ranger rises; air jump: a fuller, bigger burst
    if (jumps > S.jumps && jumps >= 1) {
      const air = jumps >= 2;
      // they take ~45 % of the take-off speed with them (then drag slows them), so they stay in the lower third of a
      // phone's view for most of their 0.5 s instead of dropping out of it in the first 0.1 s of the rise
      const lift = 0.45 * Math.max(0, p.vel ? p.vel.y : 0);
      fan(w, T, Math.round((air ? 10 : 8) * rm), air ? 1.9 : 2.0, air ? 0.7 : 0.75, (air ? 0.2 : 0.4) + lift, air ? 1.1 : 1);
    }
    // landing from a fall: a puff of them kicked up ahead
    if (g && !S.g && S.vy < -7) fan(w, T, Math.round(6 * rm), 1.9, 0.6, 1.0, 0.9);
    S.dash = dash; S.jumps = jumps; S.g = g; S.vy = p.vel ? p.vel.y : 0;
  }
  if (G.World && Array.isArray(G.World.created)) {
    G.World.created.push(w => {
      const S = { dash: false, jumps: 0, g: true, vy: 0, acc: 0.6 };
      w.onUpdate(dt => { if (dt > 0) trailTick(w, S, dt); });
    });
  }
  // test hook: own every look (scenarios only)
  W._grantAll = function () { const p = prof(); if (!p || !p.unlocks) return; for (const id of (G.Data && G.Data.COSMETICS) || []) if (p.unlocks.cosmetics.indexOf(id) < 0) p.unlocks.cosmetics.push(id); st().seen = ownedCosmetics(p).slice(); };
})(window.G);

}).call(window); } catch (e) { console.error('[module 13b_wardrobe.js]', e); }
// ---- 14_progress.js
try { (function () {
// 14_progress.js — meta-progression on top of G.Data:
//   G.Progress  wallet (clinks/lumite/stamps/sprockets), parts Vault, XP + Player Rank, Guild Rank,
//               weapon XP W1–W5, Tune-Ups, crafting, mods, shop buy/sell/refill, loadout equip,
//               rewards (modeRewards → grantRewards → result lines), unlocks, codex, café, ship.
//   G.Quests    32 story quests + dailies (3/day) + weeklies (5/week), auto-tracked from bus events.
//   G.Stickers  40 achievements tracked the same way.
// Listens to bus: kill, damage, pickup, craft, purchase, mode-start, mode-result, crate-break, paint,
// weapon-levelup, rank-up, player-ko, plus optional visit(buildingId), plate-break, freeze, dance.
(function (G) {
  'use strict';
  const D = G.Data, U = G.util;

  // ------------------------------------------------------------------ strings (en + ja)
  const EN = {}, JA = {};
  const S = (k, en, ja) => { EN[k] = en; JA[k] = ja; };
  // Quests: [title en, title ja, desc en, desc ja]
  const QSTR = {
    q01: ['Welcome to Fizzport', 'ようこそフィズポートへ', 'Visit 6 places around Fizzport.', 'フィズポートの6か所をたずねよう。'],
    q02: ['First Pops', 'はじめてのポップ', 'Pop 10 Bumblers on an Expedition.', 'たんけんで バンブラーを10体ポップしよう。'],
    q03: ['Spring Cleaning', 'バネのおそうじ', 'Collect 8 Coil Springs.', 'コイルバネを8こ 集めよう。'],
    q04: ['Range Rookie', 'くんれんルーキー', 'Earn Bronze on Hop Hop Hooray at the Training Range.', 'トレーニング場の「ホップホップフーレイ」でブロンズをとろう。'],
    q05: ['Crate Crusher', 'はこクラッシャー', 'Break 20 crates.', '箱を20こ こわそう。'],
    q06: ['King of the Pinch', 'ピンチの王さま', 'Defeat the Pinchbot King in Sunny Shoals.', 'サニーショールで ピンチボットキングをたおそう。'],
    q07: ['Paint the Pier', 'さんばしをぬりつぶせ', 'Win 1 Goo Turf match.', 'グーターフで1回 勝とう。'],
    q08: ['Ribbon Ready', 'リボンじゅんびOK', 'Find the Ribbon cache on the tallest mesa.', 'いちばん高いメサで リボンのかくし場所を見つけよう。'],
    q09: ['Ring Runner', 'リングランナー', 'Earn Bronze or better on Coral Comet Loop.', 'コーラルコメットループで ブロンズ以上をとろう。'],
    q10: ['Hold the Fountain', 'ふんすいを守れ', 'Survive 5 waves in Fountain Guard.', 'ファウンテンガードで 5ウェーブ守りきろう。'],
    q11: ['Shiny Things', 'キラキラだいすき', 'Own 3 Star Sprockets.', 'スタースプロケットを3こ 集めよう。'],
    q12: ['Crab Rave Crash', 'カニさわぎ大作戦', 'Defeat CRANKCRAB in Peach Mesas.', 'ピーチメサで クランククラブをたおそう。'],
    q13: ['Drop Zone', 'ドロップゾーン', 'Finish in the top 5 of 16 in Sky Drop Royale.', 'スカイドロップ・ロワイヤルで 16人中5位以内に入ろう。'],
    q14: ['Shield Smasher', 'シールドスマッシャー', 'Break 15 Shieldy plates.', 'シールディのたてを15まい こわそう。'],
    q15: ['Quick Draw', 'はやうち名人', 'Score 3,000 or more in the Pop-Up Challenge.', 'ポップアップチャレンジで 3,000点以上とろう。'],
    q16: ['Craft Club', 'クラフトクラブ', 'Craft 3 items at the Workshop.', 'ワークショップで アイテムを3つ作ろう。'],
    q17: ['Cart Wheels', 'カートでゴー', 'Escort Beepo\'s cart all the way in Glowcap Grotto.', 'ヒカリタケのもりで ビーポのカートを ゴールまで守ろう。'],
    q18: ['Hive Alive', 'ハイブ・アライブ', 'Defeat QUEEN BUZZHIVE in Glowcap Grotto.', 'ヒカリタケのもりで クイーン・バズハイブをたおそう。'],
    q19: ['Goo Domination', 'グーで大しょうり', 'Win Goo Turf with 55% coverage or more.', 'グーターフで 55%以上ぬって勝とう。'],
    q20: ['Silver Streak', 'シルバーストリーク', 'Earn Silver on 2 tracks.', '2つのコースで シルバーをとろう。'],
    q21: ['Elite Patrol', 'エリートパトロール', 'Pop 5 elite bots in one run.', '1回のたんけんで エリートボットを5体ポップしよう。'],
    q22: ['Tenacious Ten', 'ねばりの10ウェーブ', 'Win Fountain Guard (all 10 waves).', 'ファウンテンガードで 10ウェーブ守りきろう。'],
    q23: ['Max Power', 'マックスパワー', 'Level any weapon to W5.', 'どれか1つの武器を W5まで育てよう。'],
    q24: ['Crab Rematch', 'カニとリベンジ', 'Beat CRANKCRAB in Boss Hunt on Spicy or harder in under 5:00.', 'ボスハントで ピリから以上・5分以内に クランククラブをたおそう。'],
    q25: ['Last Ranger Standing', 'さいごのレンジャー', 'Win a Sky Drop Royale (1st of 16).', 'スカイドロップ・ロワイヤルで 1位になろう。'],
    q26: ['Gold Rush', 'ゴールドラッシュ', 'Earn Gold on 3 tracks.', '3つのコースで ゴールドをとろう。'],
    q27: ['Not a Scratch', 'キズひとつなし', 'Clear a ★5 mission without getting knocked out.', '★5のミッションを 1回もダウンせずにクリアしよう。'],
    q28: ['Sprocket Hunter', 'スプロケットハンター', 'Own 20 Star Sprockets.', 'スタースプロケットを20こ 集めよう。'],
    q29: ['Mayor Mayhem', '市長さわぎ', 'Defeat VEND-O-TITAN and send Mega-Mayor Mox packing!', 'ベンド・オ・タイタンをたおして、メガ市長モックスを おいはらおう！'],
    q30: ['Grand Gauntlet', 'グランドガントレット', 'Clear the Boss Rush.', 'ボスラッシュを クリアしよう。'],
    q31: ['Platinum Pilot', 'プラチナパイロット', 'Earn Platinum on any track.', 'どれかのコースで プラチナをとろう。'],
    q32: ['Twenty Below', '20ウェーブのかべ', 'Reach wave 20 in Endless Fountain Guard on Spicy or harder.', 'ピリから以上のエンドレスで 20ウェーブに とどこう。'],
  };
  for (const id in QSTR) { const a = QSTR[id]; S('quest.' + id + '.title', a[0], a[1]); S('quest.' + id + '.desc', a[2], a[3]); }
  const DSTR = {
    d_pop: ['Pop {n} bots', 'ボットを{n}体ポップ', 'Pop bots in any mode.', 'どのモードでもOK。'],
    d_gather: ['Gather {n} × {part}', '{part}を{n}こ集めよう', 'Pick them up out in the field.', 'フィールドで ひろおう。'],
    d_turf: ['Win a Goo Turf match', 'グーターフで1回勝とう', 'Paint more than the other team!', 'あいてチームより たくさんぬろう！'],
    d_race: ['Top 3 in a race', 'レースで3位以内', 'Finish a Star Skiff Rally in the top 3.', 'スタースキフ・ラリーで3位以内にゴール。'],
    d_royale: ['Top 8 in Royale', 'ロワイヤルで8位以内', 'Last until the final 8 in Sky Drop Royale.', 'スカイドロップ・ロワイヤルで のこり8人まで がんばろう。'],
    d_survive: ['Survive 5 waves', '5ウェーブ守りきろう', 'Hold out for 5 waves in Fountain Guard.', 'ファウンテンガードで 5ウェーブ守ろう。'],
    d_medal: ['Earn a Training medal', 'くんれんメダルをとろう', 'Any medal at the Training Range counts.', 'トレーニング場のメダルなら なんでもOK。'],
    d_craft: ['Craft 1 item', 'アイテムを1つ作ろう', 'Make anything at the Workshop.', 'ワークショップで なにか作ろう。'],
    d_paint: ['Paint {n} m² of turf', 'グーで{n}m²ぬろう', 'Paint the floor in Goo Turf.', 'グーターフで ゆかをぬろう。'],
    d_clinks: ['Collect {n} Clinks', '{n}クリンク集めよう', 'Every Clink you earn counts.', 'かせいだクリンクは ぜんぶカウント。'],
    w_pop: ['Pop {n} bots', 'ボットを{n}体ポップ', 'Pop bots in any mode this week.', '今週、どのモードでもOK。'],
    w_turf: ['Win {n} Goo Turf matches', 'グーターフで{n}回勝とう', 'Win Turf matches this week.', '今週、ターフで勝とう。'],
    w_gold: ['Gold on any track', 'どれかのコースでゴールド', 'Earn a Gold medal in a race.', 'レースでゴールドメダルをとろう。'],
    w_boss: ['Defeat any boss', 'ボスをたおそう', 'Any big boss counts.', '大ボスなら どれでもOK。'],
    w_rare: ['Collect {n} rare parts', 'レアパーツを{n}こ集めよう', 'Rare or better parts picked up in the field.', 'フィールドで レア以上のパーツをひろおう。'],
    w_royale: ['Top 3 in Royale {n} times', 'ロワイヤルで3位以内を{n}回', 'Reach the final 3 in Sky Drop Royale.', 'スカイドロップ・ロワイヤルで3位以内に入ろう。'],
    w_guard: ['Win Fountain Guard', 'ファウンテンガードで勝とう', 'Survive all 10 waves.', '10ウェーブ ぜんぶ守りきろう。'],
    w_craft: ['Craft {n} items', 'アイテムを{n}こ作ろう', 'Make things at the Workshop this week.', '今週、ワークショップで作ろう。'],
    w_elite: ['Pop {n} elite bots', 'エリートを{n}体ポップ', 'Elites wear gold trim and crowns.', 'エリートは 金色のかざりとかんむりが目じるし。'],
  };
  for (const id in DSTR) { const a = DSTR[id]; S('quest.' + id + '.title', a[0], a[1]); S('quest.' + id + '.desc', a[2], a[3]); }
  const STSTR = {
    pop100: ['Pop Rookie', 'ポップみならい', 'Pop 100 bots.', 'ボットを100体ポップ。'],
    pop1000: ['Pop Pro', 'ポッププロ', 'Pop 1,000 bots.', 'ボットを1,000体ポップ。'],
    pop5000: ['Pop Legend', 'ポップでんせつ', 'Pop 5,000 bots.', 'ボットを5,000体ポップ。'],
    elite10: ['Crown Collector', 'かんむりコレクター', 'Pop 10 elite bots.', 'エリートボットを10体ポップ。'],
    boss1: ['Boss Bonker', 'ボスボンカー', 'Defeat a big boss.', '大ボスをたおす。'],
    freeze50: ['Brain Freeze', 'カチコチ名人', 'Freeze 50 bots.', 'ボットを50体こおらせる。'],
    dance25: ['Dance Party', 'ダンスパーティー', 'Make 25 bots dance.', 'ボットを25体おどらせる。'],
    gnat_laser: ['Lens Flare', 'レンズフレア', 'Pop a Gnat Sniper while it aims its laser.', 'レーザーをねらっているナットスナイパーをポップ。'],
    craft1: ['First Fabrication', 'はじめてのクラフト', 'Craft your first item.', 'はじめてアイテムを作る。'],
    weapons5: ['Arsenal Artist', '武器アーティスト', 'Craft 5 weapons.', '武器を5つ作る。'],
    crafts25: ['Busy Builder', 'いそがしビルダー', 'Craft 25 items.', 'アイテムを25こ作る。'],
    mod1: ['Modder', 'MODデビュー', 'Forge your first mod.', 'はじめてMODを作る。'],
    mods10: ['Mod Maniac', 'MODマニア', 'Forge 10 mods.', 'MODを10こ作る。'],
    tune_full: ['Fine Tuner', 'チューンの達人', 'Fully tune a weapon (all 9 ranks).', '武器をフルチューン（9ランクぜんぶ）。'],
    max_weapon: ['Maxed Out', 'マックス到達', 'Level any weapon to W5.', '武器をW5まで育てる。'],
    polish3: ['Spit Shine', 'ピッカピカ', 'Polish a gear item to L3.', 'ギアをL3までみがく。'],
    spr10: ['Sprocket Spotter', 'スプロケット発見', 'Find 10 Star Sprockets.', 'スタースプロケットを10こ見つける。'],
    spr30: ['Sprocket Seeker', 'スプロケットシーカー', 'Find all 30 Star Sprockets.', 'スタースプロケットを30こ ぜんぶ見つける。'],
    codex_all: ['Robot Researcher', 'ロボット博士', 'Add all 11 bot types to the Codex.', '11しゅるいのボットを ずかんに登録。'],
    train_plat: ['Range Ace', 'くんれんエース', 'Earn a Platinum medal at the Training Range.', 'トレーニング場で プラチナメダルをとる。'],
    days3: ['Regular Ranger', 'いつものレンジャー', 'Play on 3 different days.', '3日あそぶ。'],
    days7: ['Weekly Ranger', '1週間レンジャー', 'Play on 7 different days.', '7日あそぶ。'],
    days14: ['Loyal Ranger', 'なかよしレンジャー', 'Play on 14 different days.', '14日あそぶ。'],
    days30: ['Forever Ranger', 'ずっとレンジャー', 'Play on 30 different days.', '30日あそぶ。'],
    race1: ['Green Flag', 'グリーンフラッグ', 'Finish your first race.', 'はじめてレースをゴール。'],
    podium: ['Podium Pal', 'ひょうしょうだい', 'Finish a race in the top 3.', 'レースで3位以内。'],
    race_win: ['Checkered Champ', 'チェッカーチャンプ', 'Win a race.', 'レースで1位。'],
    races10: ['Lap Lover', 'ラップだいすき', 'Finish 10 races.', 'レースを10回ゴール。'],
    gold1: ['Golden Glider', 'ゴールドグライダー', 'Earn a Gold medal on a track.', 'コースでゴールドをとる。'],
    gold3: ['Triple Gold', 'トリプルゴールド', 'Earn Gold on 3 tracks.', '3コースでゴールド。'],
    gold_all: ['Star Skiff Star', 'スキフのスター', 'Earn Gold on all 6 tracks.', '6コースぜんぶでゴールド。'],
    plat1: ['Shiny Pilot', 'ピカピカパイロット', 'Earn a Platinum medal on any track.', 'どれかのコースでプラチナ。'],
    turf_win1: ['First Splash', 'はじめてのスプラッシュ', 'Win a Goo Turf match.', 'グーターフで勝つ。'],
    turf_win10: ['Turf Boss', 'ターフのボス', 'Win 10 Goo Turf matches.', 'グーターフで10回勝つ。'],
    paint10k: ['Master Painter', 'ペイントマスター', 'Paint 10,000 m² of turf.', 'グーで10,000m²ぬる。'],
    coverage60: ['Goo Tsunami', 'グーのつなみ', 'Win Goo Turf with 60% coverage or more.', 'グーターフで60%以上ぬって勝つ。'],
    royale_top3: ['Sky High', 'スカイハイ', 'Reach the top 3 in Sky Drop Royale.', 'ロワイヤルで3位以内。'],
    royale_win: ['Last One Floating', 'さいごのひとり', 'Win a Sky Drop Royale.', 'ロワイヤルで1位。'],
    royale_noheal: ['Tough Cookie', 'タフなクッキー', 'Win a Royale without healing.', 'かいふくせずにロワイヤルで1位。'],
    guard_win: ['Fountain Hero', 'ふんすいのヒーロー', 'Win Fountain Guard.', 'ファウンテンガードで勝つ。'],
  };
  for (const id in STSTR) { const a = STSTR[id]; S('sticker.' + id + '.name', a[0], a[1]); S('sticker.' + id + '.desc', a[2], a[3]); }
  const CATS = { combat: ['Combat', 'バトル'], crafting: ['Crafting', 'クラフト'], explorer: ['Explorer', 'たんけん'], racer: ['Racer', 'レーサー'], turf: ['Turf', 'ターフ'] };
  for (const id in CATS) S('cat.' + id, CATS[id][0], CATS[id][1]);
  const UNL = { modbench: ['Mod Bench', 'MODベンチ'], dailies: ['Daily quests', 'デイリークエスト'], weeklies: ['Weekly challenges', 'ウィークリーチャレンジ'], spicy: ['Spicy difficulty', 'ピリからモード'], blazing: ['Blazing difficulty', 'もえもえモード'], heat: ['Heat modifiers', 'ヒートモディファイア'], dailyTrack: ['Daily Track', 'きょうのコース'], weeklyExp: ['Weekly Expedition', 'ウィークリーたんけん'], starRank: ['Star Rank', 'スターランク'], tuneup: ['Tune-Ups', 'チューンナップ'] };
  for (const id in UNL) S('unlock.' + id, UNL[id][0], UNL[id][1]);
  const PSTR = {
    'prog.rankUp': ['Rank Up!', 'ランクアップ！'], 'prog.rankUpSub': ['Player Rank {n} · {title}', 'プレイヤーランク{n}・{title}'],
    'prog.starRank': ['Star Rank bonus chest!', 'スターランクのボーナスたからばこ！'],
    'prog.weaponLevelUp': ['{name} reached W{n}!', '{name}が W{n} になった！'], 'prog.weaponMax': ['{name} is MAX!', '{name}が MAX になった！'],
    'prog.questDone': ['Quest complete: {name}', 'クエスト達成：{name}'], 'prog.questClaim': ['Claim it at the Guild Hall!', 'ギルドホールで うけとろう！'],
    'prog.sticker': ['Sticker: {name}', 'ステッカー：{name}'], 'prog.unlocked': ['Now open: {name}!', '{name} がオープン！'],
    'prog.codexNew': ['New Codex entry: {name}', 'ずかんに登録：{name}'], 'prog.pinReady': ['You can craft {name} now!', '{name}が作れるよ！'],
    'prog.crafted': ['Crafted {name}!', '{name}を作った！'], 'prog.bought': ['Bought {name}!', '{name}を買った！'],
    'prog.sold': ['Sold for {n} Clinks', '{n}クリンクで売った'], 'prog.refilled': ['Ammo refilled!', '弾をおぎなった！'],
    'prog.guildUp': ['Guild Rank ★{n}!', 'ギルドランク★{n}！'], 'prog.guildUpSub': ['{title} · new places to explore!', '{title}・あたらしい場所へ行けるよ！'],
    'prog.sprocket': ['Star Sprocket! ({n}/30)', 'スタースプロケット！（{n}/30）'], 'prog.dailyCrate': ['Daily Crate opened!', 'デイリーボックスをあけた！'],
    'prog.weeklyBonus': ['Weekly bonus chest!', 'ウィークリーボーナス！'], 'prog.treat': ['Café treat · Day {n}', 'カフェのおやつ・{n}日目'],
    'prog.tuned': ['{name}: {track} {n}!', '{name}：{track} {n}！'], 'prog.equipped': ['Equipped {name}', '{name}をそうび'],
    'prog.shipUp': ['{name} upgraded to Lv {n}!', '{name}が Lv{n} に！'], 'prog.polished': ['{name} is now L{n}!', '{name}が L{n} に！'],
    'prog.claimed': ['Rewards claimed!', 'ごほうびをうけとった！'], 'prog.questAccepted': ['Quest started: {name}', 'クエスト開始：{name}'],
    'line.clinks': ['+{n} Clinks', '+{n} クリンク'], 'line.xp': ['+{n} XP', '+{n} XP'], 'line.lumite': ['+{n} Lumite', '+{n} ルマイト'],
    'line.stamps': ['+{n} Guild Stamps', '+{n} ギルドスタンプ'], 'line.part': ['{name} ×{n}', '{name} ×{n}'], 'line.weapon': ['New weapon: {name}', 'あたらしい武器：{name}'],
    'line.gear': ['New gear: {name}', 'あたらしいギア：{name}'], 'line.gadget': ['New gadget: {name}', 'あたらしいガジェット：{name}'],
    'line.recipe': ['New recipe: {name}', 'あたらしいレシピ：{name}'], 'line.blueprint': ['Mod blueprint: {name}', 'MODせっけいず：{name}'],
    'line.heartPlate': ['Heart Plate! Max HP +25', 'ハートプレート！さいだいHP+25'], 'line.guild': ['Guild Rank ★{n}', 'ギルドランク★{n}'],
    'line.title': ['New title: {name}', 'あたらしい称号：{name}'], 'line.cosmetic': ['New look: {name}', 'あたらしい見た目：{name}'],
    'line.toggle': ['Fun toggle: {name}', 'おたのしみ設定：{name}'], 'line.class': ['Speed class: {name}', 'スピードクラス：{name}'],
    'line.unlock': ['{name} unlocked!', '{name} がかいほう！'], 'line.item': ['{name} ×{n}', '{name} ×{n}'], 'line.sticker': ['Sticker: {name}', 'ステッカー：{name}'],
    'err.unknown': ['That doesn\'t exist.', 'それは ないみたい。'], 'err.locked': ['Not unlocked yet.', 'まだ かいほうされていないよ。'],
    'err.rank': ['Needs Guild Rank ★{n}.', 'ギルドランク★{n}がひつようだよ。'], 'err.blueprint': ['You need the blueprint first.', 'まずは せっけいずがひつようだよ。'],
    'err.owned': ['You already have it.', 'もう持っているよ。'], 'err.clinks': ['Not enough Clinks.', 'クリンクがたりないよ。'],
    'err.parts': ['Need {n} more {name}.', '{name}があと{n}こ ひつようだよ。'], 'err.lumite': ['Not enough Lumite.', 'ルマイトがたりないよ。'],
    'err.stamps': ['Not enough Guild Stamps.', 'ギルドスタンプがたりないよ。'], 'err.daily': ['Sold out today. Come back tomorrow!', '今日は売りきれ。また明日きてね！'],
    'err.weekly': ['Sold out this week.', '今週は売りきれだよ。'], 'err.carry': ['You can\'t carry more.', 'これいじょう 持てないよ。'],
    'err.level': ['Needs W{n}.', 'W{n}がひつようだよ。'], 'err.max': ['Already maxed out.', 'もうマックスだよ。'],
    'err.slot': ['No free mod slot.', 'あいているMODスロットがないよ。'], 'err.fit': ['That mod doesn\'t fit this weapon.', 'そのMODは この武器につけられないよ。'],
    'err.notOwned': ['You don\'t own that yet.', 'まだ持っていないよ。'], 'err.wrongSlot': ['That doesn\'t go in this slot.', 'そのスロットには つけられないよ。'],
    'err.notDone': ['Not finished yet.', 'まだ おわっていないよ。'], 'err.claimed': ['Already claimed.', 'もう うけとったよ。'],
    'err.noRerolls': ['No rerolls left today.', '今日の入れかえは もうできないよ。'], 'err.modbench': ['The Mod Bench opens at Player Rank 5.', 'MODベンチは プレイヤーランク5でオープン。'],
    'err.last': ['Keep at least one weapon equipped.', '武器を1つは そうびしてね。'], 'err.quest': ['Finish the quest "{name}" first.', 'まずはクエスト「{name}」をクリアしよう。'],
    'err.cooldown': ['Come back tomorrow!', 'また明日きてね！'], 'err.polish': ['Need {n} Polish Kits.', 'ピカピカキットが{n}こ ひつようだよ。'],
    'err.noSell': ['That can\'t be sold.', 'それは 売れないよ。'], 'err.inUse': ['That mod is in use on another weapon.', 'そのMODは べつの武器につけているよ。'],
    'codex.lvl0': ['Unknown', 'みはっけん'], 'codex.lvl1': ['Spotted', 'はっけん'], 'codex.lvl2': ['Studied', 'けんきゅう中'], 'codex.lvl3': ['Mastered', 'マスター'],
    // (sugg.*: Fizzport's next-step chip, 2-3 short lines — the Japanese keeps a space between phrases, like the hub's own
    // hub.sug.* lines, so a line never has to break inside a word)
    'sugg.claim': ['Claim your quest rewards at the Guild Hall!', 'ギルドホールで ごほうびを うけとろう！'],
    'sugg.guild': ['Visit the Guild Hall', 'ギルドホールに 行ってみよう'], 'sugg.expedition': ['Head out on an Expedition!', 'たんけんに 出かけよう！'],
    'sugg.shield': ['Craft a Bubble Shield at the Workshop', 'ワークショップで バブルシールドを 作ろう'], 'sugg.scrap': ['Get Scrap Plates at the Pop Shop', 'ポップショップで スクラッププレートを 買おう'], 'sugg.equip': ['Equip your new gear in the Loadout', 'あたらしいギアを そうびしよう'],
    'sugg.turf': ['Try Goo Turf!', 'グーターフを やってみよう！'], 'sugg.race': ['Try a Star Skiff race!', 'スキフのレースを やってみよう！'],
    'sugg.cafe': ['Grab your free Café treat', 'カフェで おやつを もらおう'], 'sugg.craft': ['You can craft something new!', 'あたらしいものが 作れるよ！'],
    'sugg.royale': ['Try Sky Drop Royale!', 'スカイドロップ・ロワイヤルを やってみよう！'], 'sugg.defense': ['Defend the fountain in Fountain Guard!', 'ファウンテンガードで ふんすいを守ろう！'],
  };
  for (const k in PSTR) S(k, PSTR[k][0], PSTR[k][1]);
  G.i18n.add('en', EN);
  G.i18n.add('ja', JA);

  // ------------------------------------------------------------------ helpers
  const P = () => D.prof();
  const save = () => { if (G.Save && G.Save.data) G.Save.save(); };
  const t = (k, p) => G.t(k, p);
  // Reward reveal: while a mode hands out its end-of-match rewards (G.Exp.finish), progression sounds,
  // toasts and banners are held (holdFx) and the results screen replays them in step with its rows
  // (releaseFx). A hold that is never released (error) flushes itself after a few seconds.
  let held = null, heldT = 0;
  const sfx = n => { if (held) { if (held.sfx.length < 24) held.sfx.push(n); return; } if (G.Audio && G.Audio.sfx) G.safe('sfx', () => G.Audio.sfx(n)); };
  let quiet = 0;
  const toast = (text, opts) => { if (quiet) return; if (held) { if (held.toasts.length < 8) held.toasts.push([text, opts]); return; } if (G.UI && G.UI.toast && document.getElementById('toasts')) G.UI.toast(text, opts); };
  const banner = (a, b, d) => { if (quiet) return; if (held) { held.banners.push([a, b, d]); return; } if (G.UI && G.UI.banner && document.getElementById('banner')) G.UI.banner(a, b, d); };
  const emit = (ev, a, b, c) => G.bus.emit(ev, a, b, c);
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const isoWeek = d => {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
    return x.getUTCFullYear() + '-W' + String(Math.ceil(((x - y0) / 86400000 + 1) / 7)).padStart(2, '0');
  };
  const today = () => D.todayStr();
  const weekId = () => isoWeek(new Date());
  const wid = w => (typeof w === 'string' ? w : w && (w.id || (w.def && w.def.id))) || null;
  const byPlayer = src => !!(src && (src.isPlayer || (src.owner && src.owner.isPlayer)));
  const NON_BOTS = ['crate', 'prop', 'target', 'balloon', 'totem', 'core', 'dummy', 'cart', 'pod'];
  const enemyKey = tg => (tg && (tg.enemyId || tg.bossId || tg.type)) || null;
  const bossKey = tg => {
    if (!tg) return null;
    const k = tg.bossId || tg.enemyId;
    if (D.BOSSES[k] || D.BOSS_LITE[k]) return k;
    if (tg.isBoss && k === 'pinch') return 'pinch_king';
    return null;
  };
  const isBot = (tg, info) => !!tg && !tg.isPlayer && !NON_BOTS.includes(tg.kind) && !tg.noCount && (!!(tg.enemyId || tg.isBoss) || byPlayer(info && info.src));
  // Numeric field from a mode-result: top-level, stats object, stats [{key,value}] array, or data.
  function num(r, k) {
    if (!r) return 0;
    if (typeof r[k] === 'number') return r[k];
    const s = r.stats;
    if (s && !Array.isArray(s) && typeof s[k] === 'number') return s[k];
    if (Array.isArray(s)) for (const e of s) { if (!e || typeof e.value !== 'number') continue; const key = e.id || e.key; if (key === k || (typeof key === 'string' && key.split('.').pop() === k)) return e.value; }
    if (r.data && typeof r.data[k] === 'number') return r.data[k];
    return 0;
  }
  const coverage = r => { const c = num(r, 'coverage'); return c > 0 && c <= 1 ? c * 100 : c; };
  const resultBoss = r => r && (r.boss || r.bossId) || null;
  const diffRank = id => Math.max(0, D.DIFF_IDS.indexOf(id || 'normal'));
  const resultDiff = r => (r && D.DIFFICULTY[r.difficulty] ? r.difficulty : D.diffId());
  const trialKey = r => r.trial || r.challenge || null;

  // Fill fields missing from older saves (Save merges defaults, but be defensive).
  function ensure(p) {
    const d = D.defaultProfile();
    for (const k in d) if (p[k] == null) p[k] = d[k];
    for (const k of ['rank', 'loadout', 'quests', 'records', 'stats', 'unlocks', 'pity', 'cafe', 'tutorial', 'profile', 'items', 'ship']) {
      if (typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = d[k];
      for (const j in d[k]) if (p[k][j] == null) p[k][j] = d[k][j];
    }
    for (const id of D.PART_IDS) if (typeof p.parts[id] !== 'number') p.parts[id] = 0;
    if (!p.weapons.fizz || !p.weapons.fizz.own) p.weapons.fizz = D.newWeapon(1, 0);
    for (const id in p.weapons) { const w = p.weapons[id]; if (!Array.isArray(w.tune)) w.tune = [0, 0, 0]; if (!Array.isArray(w.mods)) w.mods = [null, null, null]; if (w.ammo == null) w.ammo = -1; }
    for (const id of D.BOSS_IDS) { const b = p.records.boss[id] || (p.records.boss[id] = {}); for (const k of ['kills', 'medal', 'clears', 'chests']) if (typeof b[k] !== 'number') b[k] = 0; }
    for (const k of ['medals', 'rewarded']) { if (!p.records[k]) p.records[k] = {}; if (!p.records[k].race) p.records[k].race = {}; if (!p.records[k].trials) p.records[k].trials = {}; }
    if (typeof p.sprockets !== 'string' || p.sprockets.length !== D.SPROCKET_COUNT) p.sprockets = (String(p.sprockets || '') + '0'.repeat(D.SPROCKET_COUNT)).slice(0, D.SPROCKET_COUNT).replace(/[^01]/g, '0');
    if (!Array.isArray(p.stats.firstCrafts)) p.stats.firstCrafts = [];
    return p;
  }

  // ------------------------------------------------------------------ G.Progress
  const Pr = G.Progress = {};
  let inited = false;
  const run = { mode: null, elites: 0, kos: 0, heals: 0 };
  Pr.run = run;
  // Weapon XP: 16_weapons.js reports it via weaponXP(id, n). Only when no weapons module is loaded does
  // G.Progress derive it from bus damage/kill/paint events. Setting autoWeaponXP = false suspends all
  // gameplay weapon XP (e.g. the Training Range) — weaponXP(id, n, true) still forces it.
  Pr.autoWeaponXP = true;
  const deriveXP = () => Pr.autoWeaponXP !== false && !(G.Weapons && G.Weapons.create);
  function ready() { if (!inited) init(true); return P(); }
  Pr.holdFx = function () {
    if (!held) { held = { sfx: [], toasts: [], banners: [] }; clearTimeout(heldT); heldT = setTimeout(() => Pr.releaseFx(true), 9000); }
    return true;
  };
  Pr.isHolding = () => !!held;
  // Ends the hold and returns what was held ({sfx:[names], toasts:[[text, opts]], banners}); replay=true plays
  // it now instead (each sound once, toasts in order; banners are dropped: the results screen has callouts).
  Pr.releaseFx = function (replay) {
    const h = held; held = null; clearTimeout(heldT);
    if (!h) return null;
    if (replay) {
      for (const n of new Set(h.sfx)) sfx(n);
      for (const tt of h.toasts) toast(tt[0], tt[1]);
    }
    return h;
  };
  // Bonus ledger: rewards paid on top of a mode's own payout since it started (rank-up bonuses, sticker
  // rewards, sprocket milestones, Star Rank chests), so the results screen can list everything granted.
  const ledger = { bonus: [] };
  const resetLedger = () => { ledger.bonus.length = 0; };
  G.bus.on('mode-start', (id, params) => { if (!(params && params.rush && params.rushIdx > 0)) resetLedger(); });   // a Boss Rush is one run
  G.bus.on('mode', id => { if (id === 'hub' || id === 'title') resetLedger(); });
  Pr.runLedger = () => ({ bonus: ledger.bonus.slice() });

  // ---------- wallet
  const walletChanged = () => emit('wallet', Pr.wallet());
  Pr.wallet = () => { const p = P(); return { clinks: p.clinks, lumite: p.lumite, stamps: p.stamps, sprockets: Pr.sprocketCount() }; };
  Object.defineProperty(Pr, 'clinks', { get: () => P().clinks, enumerable: true });
  Object.defineProperty(Pr, 'lumite', { get: () => P().lumite, enumerable: true });
  Object.defineProperty(Pr, 'allUnlocked', { get: () => !!(P().unlocks && P().unlocks.all), enumerable: true });
  Pr.addBolts = function (n) {
    n = Math.max(0, Math.floor(n || 0)); if (!n) return 0;
    const p = ready(); p.clinks += n; p.stats.clinksEarned = (p.stats.clinksEarned || 0) + n;
    questEvent('clinks', n); walletChanged(); checkPinned(); save(); return n;
  };
  Pr.addClinks = Pr.addBolts;
  Pr.canAfford = n => P().clinks >= Math.ceil(n || 0);
  Pr.spend = function (n) {
    n = Math.max(0, Math.ceil(n || 0)); const p = ready();
    if (p.clinks < n) return false;
    p.clinks -= n; walletChanged(); save(); return true;
  };
  Pr.addLumite = function (n) { n = Math.max(0, Math.floor(n || 0)); if (!n) return 0; const p = ready(); p.lumite += n; walletChanged(); checkPinned(); save(); return n; };
  Pr.spendLumite = function (n) { const p = ready(); if (p.lumite < n) return false; p.lumite -= n; walletChanged(); save(); return true; };
  Pr.addStamps = function (n) { n = Math.max(0, Math.floor(n || 0)); const p = ready(); p.stamps += n; walletChanged(); save(); return n; };
  Pr.spendStamps = function (n) { const p = ready(); if (p.stamps < n) return false; p.stamps -= n; walletChanged(); save(); return true; };

  // ---------- parts Vault
  Pr.partCount = id => { const p = P(); return id === 'lumite' ? p.lumite : id === 'sprocket' ? Pr.sprocketCount() : (p.parts[id] || 0); };
  Pr.addPart = function (id, n) {
    n = n == null ? 1 : Math.floor(n); if (n <= 0) return 0;
    if (id === 'lumite') return Pr.addLumite(n);
    if (id === 'sprocket') { for (let i = 0; i < n; i++) Pr.addSprocket(); return n; }
    if (!D.PARTS[id]) { console.warn('[Progress] unknown part', id); return 0; }
    const p = ready(); p.parts[id] = (p.parts[id] || 0) + n;
    checkPinned(); save(); return n;
  };
  // costs: {partId: n, clinks?, lumite?} or a recipe-like {clinks, parts:{...}}.
  const norm = c => (c && c.parts ? Object.assign({ clinks: c.clinks || 0 }, c.parts) : Object.assign({}, c || {}));
  Pr.missing = function (costs) {
    const c = norm(costs), p = P(), miss = {};
    for (const k in c) { if (k === 'clinks') continue; const need = c[k] || 0, have = Pr.partCount(k); if (have < need) miss[k] = need - have; }
    if (c.clinks && p.clinks < c.clinks) miss.clinks = c.clinks - p.clinks;
    return miss;
  };
  Pr.hasParts = costs => Object.keys(Pr.missing(costs)).length === 0;
  Pr.takeParts = function (costs) {
    if (!Pr.hasParts(costs)) return false;
    const c = norm(costs), p = ready();
    for (const k in c) {
      const n = c[k] || 0; if (!n) continue;
      if (k === 'clinks') p.clinks -= n; else if (k === 'lumite') p.lumite -= n; else p.parts[k] -= n;
    }
    walletChanged(); save(); return true;
  };

  // ---------- XP / Player Rank / Guild Rank
  Pr.rankInfo = function () {
    const p = P(), r = p.rank, pr = r.pr;
    const next = D.XP.toNext(pr);
    return {
      pr, xp: r.xp, next: isFinite(next) ? next : D.XP.starChest, frac: isFinite(next) ? r.xp / next : (r.starXp || 0) / D.XP.starChest,
      title: t(D.XP.titleKey(pr)), titleKey: D.XP.titleKey(pr), total: D.XP.total(pr) + r.xp, star: pr >= D.XP.cap, starXp: r.starXp || 0,
      guild: r.guild, guildTitle: t('guild.' + r.guild), heartPlates: r.heartPlates,
    };
  };
  Pr.addXP = function (n) {
    n = Math.max(0, Math.floor(n || 0)); if (!n) return 0;
    const p = ready(), r = p.rank;
    if (r.pr >= D.XP.cap) { addStarXp(p, n); save(); return n; }
    r.xp += n;
    while (r.pr < D.XP.cap && r.xp >= D.XP.toNext(r.pr)) { r.xp -= D.XP.toNext(r.pr); r.pr++; rankUp(r.pr); }
    if (r.pr >= D.XP.cap && r.xp > 0) { addStarXp(p, r.xp); r.xp = 0; }
    emit('xp', n); save(); return n;
  };
  function addStarXp(p, n) {
    p.rank.starXp = (p.rank.starXp || 0) + n;
    while (p.rank.starXp >= D.XP.starChest) { p.rank.starXp -= D.XP.starChest; Pr.grantRewards({ loot: [{ table: 'gold', rolls: 1 }] }, { keep: true, src: 'star' }); toast(t('prog.starRank'), { icon: D.icon('chest') }); }
  }
  // Rank-up: the bonus (200 × PR clinks, extras every 5 ranks) is paid now and logged in the bonus ledger so
  // the results screen lists it. Newly opened features are announced by the "New in Fizzport!" card.
  function rankUp(pr) {
    const rw = D.XP.rankReward(pr);
    Pr.grantRewards(rw, { keep: true, src: 'rank', pr });
    banner(t('prog.rankUp'), t('prog.rankUpSub', { n: pr, title: t(D.XP.titleKey(pr)) }), 2);
    sfx('rankup');
    emit('rank-up', pr);
  }
  function promote(n) {
    const p = P();
    if (n <= p.rank.guild) return false;
    p.rank.guild = Math.min(6, n);
    const gd = D.GUILD[p.rank.guild];
    if (gd && gd.biome && !p.unlocks.biomes.includes(gd.biome)) p.unlocks.biomes.push(gd.biome);
    if (p.rank.guild >= 3) { for (const m of D.MOD_IDS) if (D.MODS[m].family === 'tradeoff' && !p.blueprints.includes(m)) p.blueprints.push(m); if (!p.unlocks.classes.includes('gale')) p.unlocks.classes.push('gale'); }
    if (p.rank.guild >= 4 && !p.unlocks.classes.includes('storm')) p.unlocks.classes.push('storm');
    banner(t('prog.guildUp', { n: p.rank.guild }), t('prog.guildUpSub', { title: t('guild.' + p.rank.guild) }), 2.2);
    sfx('unlock');
    emit('guild-up', p.rank.guild);
    return true;
  }
  Pr.guildInfo = function () {
    const p = P(), g = p.rank.guild, gd = D.GUILD[g], nx = D.GUILD[g + 1];
    return { star: g, titleKey: 'guild.' + g, keys: gd ? gd.keys.map(id => ({ id, done: qIsDone(p, id) })) : [], promo: gd ? gd.promo : null, nextPr: nx ? nx.pr : null, eligible: !nx || p.rank.pr >= nx.pr };
  };

  // ---------- weapons
  const wl = lvl => D.WEAPON_LEVELS[U.clamp(lvl, 1, 5)];
  Pr.weaponInfo = function (id) {
    const p = P(), w = p.weapons[id];
    if (!w || !w.own) return { id, owned: false, level: w ? w.lvl : 0, xp: w ? w.xp : 0, next: null, frac: 0, mods: [null, null, null], slots: 0, tune: w ? w.tune.slice() : [0, 0, 0], tuneups: w ? w.tune.slice() : [0, 0, 0], ammo: 0, maxAmmo: 0, max: false };
    const lv = w.lvl, cur = wl(lv).xp, nx = lv < 5 ? wl(lv + 1).xp : null;
    const max = D.maxAmmo(id, p);
    return {
      id, owned: true, level: lv, xp: w.xp, next: nx, frac: nx ? U.clamp((w.xp - cur) / (nx - cur), 0, 1) : 1, mods: w.mods.slice(0, 3), slots: wl(lv).slots,
      tune: w.tune.slice(), tuneups: w.tune.slice(), ammo: D.WEAPONS[id].infinite ? -1 : (w.ammo < 0 ? max : Math.min(w.ammo, max)), maxAmmo: max, max: lv >= 5,
      stats: D.weaponStats(id, lv, w.mods, w.tune),
    };
  };
  Pr.owned = id => { const p = P(); return !!((p.weapons[id] && p.weapons[id].own) || (p.gear[id] && p.gear[id].own) || p.abilities[id] || (p.mods[id] > 0)); };
  Pr.ownedWeapons = () => D.WEAPON_IDS.filter(id => P().weapons[id] && P().weapons[id].own);
  Pr.weaponXP = function (id, n, force) {
    const p = ready(), w = p.weapons[id];
    if (!w || !w.own || !(n > 0) || (Pr.autoWeaponXP === false && !force)) return 0;
    n = Math.floor(n); if (!n) return 0;
    const cap = wl(5).xp;
    w.xp = Math.min(cap, w.xp + n);
    while (w.lvl < 5 && w.xp >= wl(w.lvl + 1).xp) {
      w.lvl++;
      const name = t('weapon.' + id + '.name');
      banner(t(w.lvl >= 5 ? 'prog.weaponMax' : 'prog.weaponLevelUp', { name, n: w.lvl }), null, 1.2);
      sfx('levelup');
      emit('weapon-levelup', id, w.lvl);
    }
    save(); return n;
  };
  const xpAcc = {};
  function autoXP(id, amount) { if (!id || !(amount > 0)) return; xpAcc[id] = (xpAcc[id] || 0) + amount; const whole = Math.floor(xpAcc[id]); if (whole >= 1) { xpAcc[id] -= whole; Pr.weaponXP(id, whole); } }
  Pr.setAmmo = function (id, n) { const w = P().weapons[id]; if (!w) return; w.ammo = n == null || n < 0 ? -1 : Math.floor(n); save(); };
  Pr.ammoOf = id => Pr.weaponInfo(id).ammo;
  function giveWeapon(id) {
    const p = P(); const prev = p.weapons[id];
    if (prev && prev.own) return false;
    p.weapons[id] = prev ? Object.assign(prev, { own: true, ammo: -1 }) : D.newWeapon(1, 0);
    const fav = p.loadout.fav; const fi = fav.indexOf(null); if (fi >= 0 && !fav.includes(id)) fav[fi] = id;
    const wh = p.loadout.wheel; const wi = wh.indexOf(null); if (wi >= 0 && !wh.includes(id)) wh[wi] = id;
    emit('weapon-unlock', id);
    return true;
  }
  // Tune-Ups: track 0..2 or 'power'|'capacity'|'handling' (omit to pick the first available).
  const trackIdx = tr => (typeof tr === 'number' ? tr : D.TUNE.tracks.indexOf(tr));
  Pr.tuneInfo = function (id, track) {
    const w = P().weapons[id], ti = trackIdx(track);
    if (!w || !w.own) return { ok: false, reason: 'notOwned' };
    if (ti < 0 || ti > 2) return { ok: false, reason: 'unknown' };
    const rank = w.tune[ti];
    if (rank >= 3) return { ok: false, reason: 'max', rank };
    const cost = D.TUNE.cost[rank], need = D.TUNE.reqLevel[rank];
    if (w.lvl < need) return { ok: false, reason: 'level', need, cost, rank };
    if (P().lumite < cost) return { ok: false, reason: 'lumite', cost, rank };
    return { ok: true, cost, rank, need };
  };
  Pr.tuneUp = function (id, track) {
    ready();
    let ti = trackIdx(track);
    if (track == null) { ti = [0, 1, 2].find(i => Pr.tuneInfo(id, i).ok); if (ti == null) ti = 0; }
    const st = Pr.tuneInfo(id, ti);
    if (!st.ok) return fail(st.reason, st);
    const w = P().weapons[id];
    Pr.spendLumite(st.cost);
    w.tune[ti]++;
    sfx('craft');
    toast(t('prog.tuned', { name: t('weapon.' + id + '.name'), track: t('tune.' + D.TUNE.tracks[ti]), n: w.tune[ti] }), { icon: D.icon('lumite') });
    emit('tune-up', id, ti, w.tune[ti]);
    stickerCheck(); save();
    return { ok: true, id, track: ti, rank: w.tune[ti] };
  };
  Pr.upgradeWeapon = Pr.tuneUp;

  // ---------- errors
  function fail(reason, extra) {
    const r = Object.assign({ ok: false, reason }, extra || {});
    r.text = errText(r);
    return r;
  }
  function errText(r) {
    switch (r.reason) {
      case 'rank': return t('err.rank', { n: r.need });
      case 'level': return t('err.level', { n: r.need });
      case 'parts': { const k = Object.keys(r.missing || {}).find(x => x !== 'clinks'); return k ? t('err.parts', { n: r.missing[k], name: t(k === 'lumite' ? 'cur.lumite' : 'part.' + k + '.name') }) : t('err.parts', { n: 1, name: '' }); }
      case 'quest': return t('err.quest', { name: t('quest.' + r.quest + '.title') });
      case 'polish': return t('err.polish', { n: r.need });
      default: return t('err.' + r.reason);
    }
  }

  // ---------- crafting
  const guildOK = (p, n) => p.unlocks.all || p.rank.guild >= (n || 1);
  Pr.canCraft = function (id) {
    const p = ready(), r = D.RECIPES[id];
    if (!r) return fail('unknown');
    if (r.kind === 'mod') {
      if (!p.unlocks.all && !Pr.isUnlocked('modbench')) return fail('modbench');
      if (!p.blueprints.includes(id) && !p.unlocks.all) return fail('blueprint');
    }
    if (!guildOK(p, r.guild)) return fail('rank', { need: r.guild });
    if (r.locked && !p.unlocks.all && !p.unlocks.recipes.includes(id)) return fail('locked');
    if (!r.repeat && Pr.owned(id)) return fail('owned');
    const miss = Pr.missing({ clinks: r.clinks, parts: r.parts });
    const partMiss = Object.keys(miss).filter(k => k !== 'clinks');
    if (partMiss.length) return fail(partMiss.includes('lumite') && partMiss.length === 1 ? 'lumite' : 'parts', { missing: miss });
    if (miss.clinks) return fail('clinks', { missing: miss });
    return { ok: true, id, kind: r.kind };
  };
  Pr.recipeList = function (kind) {
    return Object.keys(D.RECIPES).filter(id => !kind || D.RECIPES[id].kind === kind).map(id => {
      const r = D.RECIPES[id], st = Pr.canCraft(id);
      const parts = Object.keys(r.parts).map(k => ({ id: k, need: r.parts[k], have: Pr.partCount(k) }));
      return { id, recipe: r, name: D.recipeName(id), ok: st.ok, reason: st.reason || null, text: st.text || '', clinks: r.clinks, parts, owned: !r.repeat && Pr.owned(id) };
    });
  };
  function giveItem(r) {
    const p = P();
    switch (r.kind) {
      case 'weapon': giveWeapon(r.out); break;
      case 'gear': p.gear[r.out] = Object.assign(p.gear[r.out] || { lvl: 1 }, { own: true }); autoEquipGear(r.out); break;
      case 'gadget': p.abilities[r.out] = true; break;
      case 'mod': p.mods[r.out] = (p.mods[r.out] || 0) + 1; break;
      case 'item': p.items[r.out] = (p.items[r.out] || 0) + 1; break;
    }
  }
  function autoEquipGear(id) { const p = P(), g = D.GEAR[id]; if (g && !p.loadout.gear[g.slot]) p.loadout.gear[g.slot] = id; }
  // opts.silent: no "Crafted!" toast (the Workshop shows its own fabricator animation)
  Pr.craft = function (id, opts) {
    const st = Pr.canCraft(id);
    if (!st.ok) { sfx('error'); return st; }
    const p = P(), r = D.RECIPES[id];
    Pr.takeParts({ clinks: r.clinks, parts: r.parts });
    giveItem(r);
    const lines = [];
    const name = D.recipeName(id);
    lines.push(mkLine(r.kind === 'mod' || r.kind === 'item' ? 'item' : r.kind, 1, r.out));
    if (r.kind === 'weapon') p.stats.weaponCrafts = (p.stats.weaponCrafts || 0) + 1;
    if (r.kind === 'mod') {
      p.stats.modsForged = (p.stats.modsForged || 0) + 1;
      p.pity.forge = (p.pity.forge || 0) + 1;
      if (p.pity.forge >= D.FORGE_STREAK) { p.pity.forge = 0; const bp = giveBlueprint('wild'); if (bp) lines.push(mkLine('blueprint', 1, bp)); }
    }
    const first = !p.stats.firstCrafts.includes(id);
    if (first) p.stats.firstCrafts.push(id);
    sfx('craft');
    if (!(opts && opts.silent)) toast(t('prog.crafted', { name }), { icon: r.kind === 'gear' ? D.gearIcon(r.out) : D.icon('gear') });
    if (p.loadout.pinnedRecipe === id && r.kind !== 'mod' && r.kind !== 'item') p.loadout.pinnedRecipe = null;
    pinNotified = false;
    emit('craft', id);
    if (first) { lines.push(mkLine('xp', D.XP.sources.craft)); Pr.addXP(D.XP.sources.craft); }
    save();
    return { ok: true, id, kind: r.kind, first, lines };
  };
  function giveBlueprint(which) {
    const p = P();
    let id = which;
    if (which === 'wild' || !D.MODS[which]) {
      const pool = D.MOD_IDS.filter(m => D.MODS[m].family === 'wild' && !p.blueprints.includes(m));
      if (!pool.length) return null;
      id = U.pick(pool);
    }
    if (!p.blueprints.includes(id)) p.blueprints.push(id);
    return id;
  }
  Pr.giveBlueprint = giveBlueprint;
  // Dismantle: refunds 100% of recipe parts, 0% clinks. Weapon level/Tune-Ups are kept for re-crafting.
  Pr.dismantle = function (id) {
    const p = ready(), r = D.RECIPES[id];
    if (!r || r.kind === 'item' || id === 'fizz') return fail('unknown');
    if (!Pr.owned(id)) return fail('notOwned');
    if (r.kind === 'weapon') {
      p.weapons[id].own = false;
      p.loadout.fav = p.loadout.fav.map(x => (x === id ? null : x)); p.loadout.wheel = p.loadout.wheel.map(x => (x === id ? null : x));
      if (!p.loadout.fav.some(Boolean)) p.loadout.fav[0] = 'fizz';
    } else if (r.kind === 'gear') { p.gear[id].own = false; for (const s in p.loadout.gear) if (p.loadout.gear[s] === id) p.loadout.gear[s] = null; }
    else if (r.kind === 'gadget') { p.abilities[id] = false; }
    else if (r.kind === 'mod') { p.mods[id]--; trimMods(id); }
    for (const k in r.parts) Pr.addPart(k, r.parts[k]);
    save();
    return { ok: true, id, refund: Object.assign({}, r.parts) };
  };
  // Polish Kits raise gear L1 → L3 (L3 needs 2 kits).
  Pr.polishGear = function (id) {
    const p = ready(), g = p.gear[id];
    if (!g || !g.own) return fail('notOwned');
    if (g.lvl >= 3) return fail('max');
    const need = g.lvl >= 2 ? 2 : 1;
    if ((p.items.polish || 0) < need) return fail('polish', { need });
    p.items.polish -= need; g.lvl++;
    sfx('craft'); toast(t('prog.polished', { name: t('gear.' + id + '.name'), n: g.lvl }), { icon: D.gearIcon(id) });
    stickerCheck(); save();
    return { ok: true, id, lvl: g.lvl };
  };
  // Pin one recipe: a toast fires once when the Vault can afford it.
  let pinNotified = false;
  Pr.pinRecipe = function (id) { const p = ready(); p.loadout.pinnedRecipe = D.RECIPES[id] ? id : null; pinNotified = false; checkPinned(); save(); return p.loadout.pinnedRecipe; };
  function checkPinned() {
    const p = P(), id = p.loadout && p.loadout.pinnedRecipe;
    if (!id) return;
    const ok = Pr.canCraft(id).ok;
    if (ok && !pinNotified) { pinNotified = true; toast(t('prog.pinReady', { name: D.recipeName(id) }), { icon: D.icon('gear') }); emit('pin-ready', id); }
    else if (!ok) pinNotified = false;
  }

  // ---------- shop
  function shopReset(p) {
    const d = today(), w = weekId();
    if (p.shopDaily.day !== d) p.shopDaily = { day: d, bought: {} };
    if (!p.shopWeekly || p.shopWeekly.wk !== w) p.shopWeekly = { wk: w, lumite: 0 };
  }
  Pr.canBuy = function (id, n) {
    n = Math.max(1, Math.floor(n || 1));
    const p = ready(), it = D.SHOP.items[id];
    if (!it) return fail('unknown');
    shopReset(p);
    if (it.guild && !guildOK(p, it.guild)) return fail('rank', { need: it.guild });
    if (it.needs && !p.unlocks.all && !qIsDone(p, it.needs)) return fail('quest', { quest: it.needs });
    if (it.kind === 'weapon' && p.weapons[it.weapon] && p.weapons[it.weapon].own) return fail('owned');
    if (it.kind === 'weapon') n = 1;
    if (it.kind === 'consumable' && (p.loadout.consumables[id] || 0) + n > it.carry) return fail('carry');
    if (it.kind === 'boost' && (p.cafe.boost[it.boost] || 0) > 0) return fail('owned');
    if (it.daily && (p.shopDaily.bought[id] || 0) + n > it.daily) return fail('daily');
    if (it.weekly && (p.shopWeekly.lumite || 0) + n > it.weekly) return fail('weekly');
    if (it.stamps) { if (p.stamps < it.stamps * n) return fail('stamps'); return { ok: true, cost: 0, stamps: it.stamps * n, n }; }
    const cost = it.price * n;
    if (p.clinks < cost) return fail('clinks', { cost });
    return { ok: true, cost, n };
  };
  Pr.shopList = function () {
    const p = ready(); shopReset(p);
    return Object.keys(D.SHOP.items).map(id => {
      const it = D.SHOP.items[id], st = Pr.canBuy(id);
      return { id, item: it, name: D.shopName(id), price: it.price, stamps: it.stamps || 0, ok: st.ok, reason: st.reason || null, text: st.text || '', left: it.daily ? it.daily - (p.shopDaily.bought[id] || 0) : it.weekly ? it.weekly - (p.shopWeekly.lumite || 0) : null };
    });
  };
  Pr.buy = function (id, n) {
    const st = Pr.canBuy(id, n);
    if (!st.ok) { sfx('error'); return st; }
    const p = P(), it = D.SHOP.items[id];
    n = st.n;
    if (st.stamps) Pr.spendStamps(st.stamps); else Pr.spend(st.cost);
    switch (it.kind) {
      case 'consumable': p.loadout.consumables[id] = (p.loadout.consumables[id] || 0) + n; break;
      case 'part': Pr.addPart(it.part, it.n * n); break;
      case 'item': p.items[it.item] = (p.items[it.item] || 0) + n; break;
      case 'lumite': Pr.addLumite(it.n * n); p.shopWeekly.lumite = (p.shopWeekly.lumite || 0) + n; break;
      case 'boost': p.cafe.boost[it.boost] = it.matches; break;
      case 'weapon': giveWeapon(it.weapon); break;
    }
    if (it.daily) p.shopDaily.bought[id] = (p.shopDaily.bought[id] || 0) + n;
    sfx('buy');
    toast(t('prog.bought', { name: D.shopName(id) }), { icon: it.kind === 'part' ? D.partIcon(it.part) : D.icon('clinks') });
    emit('purchase', id, st.cost || 0);
    save();
    return { ok: true, id, n, cost: st.cost || 0, stamps: st.stamps || 0 };
  };
  Pr.sell = function (partId, n) {
    n = Math.max(1, Math.floor(n || 1));
    const p = ready(), part = D.PARTS[partId];
    if (!part) return fail('unknown');
    if (part.noSell) return fail('noSell');
    if ((p.parts[partId] || 0) < n) return fail('parts', { missing: { [partId]: n - (p.parts[partId] || 0) } });
    p.parts[partId] -= n;
    const gained = part.sell * n;
    p.clinks += gained;
    sfx('buy'); walletChanged(); save();
    return { ok: true, partId, n, gained };
  };
  Pr.refillCost = function () {
    const p = P(), units = {}; let cost = 0;
    for (const id of Pr.ownedWeapons()) {
      const def = D.WEAPONS[id]; if (def.infinite || !def.refill) continue;
      const max = D.maxAmmo(id, p), w = p.weapons[id], cur = w.ammo < 0 ? max : Math.min(w.ammo, max);
      if (max - cur > 0) { units[id] = max - cur; cost += (max - cur) * def.refill; }
    }
    return { cost: Math.ceil(cost), units };
  };
  Pr.refillAmmo = function () {
    const p = ready(), rc = Pr.refillCost();
    if (!rc.cost) { for (const id of Object.keys(rc.units)) p.weapons[id].ammo = -1; return { ok: true, cost: 0 }; }
    if (!Pr.spend(rc.cost)) { sfx('error'); return fail('clinks', { cost: rc.cost }); }
    for (const id of Pr.ownedWeapons()) p.weapons[id].ammo = -1;
    sfx('buy'); toast(t('prog.refilled'), { icon: D.icon('clinks') });
    emit('purchase', 'refill', rc.cost);
    save();
    return { ok: true, cost: rc.cost };
  };
  Pr.useConsumable = function (id) { const p = ready(); if ((p.loadout.consumables[id] || 0) <= 0) return false; p.loadout.consumables[id]--; save(); return true; };

  // ---------- loadout
  const changed = () => { emit('loadout-change'); save(); };
  Pr.equipWeapon = function (slot, id) {
    const p = ready(), fav = p.loadout.fav;
    slot = U.clamp(slot | 0, 0, 3);
    if (id == null) { if (fav.filter(Boolean).length <= 1 && fav[slot]) return fail('last'); fav[slot] = null; changed(); return { ok: true }; }
    if (!p.weapons[id] || !p.weapons[id].own) return fail('notOwned');
    const at = fav.indexOf(id);
    if (at >= 0 && at !== slot) fav[at] = fav[slot];
    fav[slot] = id;
    if (!p.loadout.wheel.includes(id)) { const wi = p.loadout.wheel.indexOf(null); if (wi >= 0) p.loadout.wheel[wi] = id; }
    changed(); return { ok: true, slot, id };
  };
  Pr.equipGear = function (slot, id) {
    const p = ready();
    if (id == null) { if (!D.GEAR_SLOTS.includes(slot)) return fail('wrongSlot'); p.loadout.gear[slot] = null; changed(); return { ok: true }; }
    const g = D.GEAR[id];
    if (!g) return fail('unknown');
    if (slot == null) slot = g.slot;
    if (g.slot !== slot) return fail('wrongSlot');
    if (!p.gear[id] || !p.gear[id].own) return fail('notOwned');
    p.loadout.gear[slot] = id;
    changed(); return { ok: true, slot, id };
  };
  Pr.equipGadget = function (id) {
    const p = ready(), a = D.ABILITIES[id];
    if (!a || a.type !== 'gadget') return fail('wrongSlot');
    if (!p.abilities[id]) return fail('notOwned');
    p.loadout.gadget = id; changed(); return { ok: true, id };
  };
  // Mods: one copy per weapon; owned count limits how many weapons use it at once (oldest moves).
  function modUses(p, modId) { const out = []; for (const w in p.weapons) if (p.weapons[w].own !== false && p.weapons[w].mods.includes(modId)) out.push(w); return out; }
  function trimMods(modId) { const p = P(); let uses = modUses(p, modId); while (uses.length > (p.mods[modId] || 0)) { const w = p.weapons[uses.pop()]; w.mods = w.mods.map(m => (m === modId ? null : m)); uses = modUses(p, modId); } }
  Pr.equipMod = function (weaponId, modId, slot) {
    const p = ready(), w = p.weapons[weaponId];
    if (!w || !w.own) return fail('notOwned');
    const slots = wl(w.lvl).slots;
    if (modId == null) { if (slot != null && slot < 3) w.mods[slot] = null; changed(); return { ok: true }; }
    if (!D.MODS[modId]) return fail('unknown');
    if (!(p.mods[modId] > 0)) return fail('notOwned');
    if (!D.modFits(modId, weaponId)) return fail('fit');
    if (slot == null) { slot = w.mods.findIndex((m, i) => i < slots && !m); if (w.mods.includes(modId)) return { ok: true, slot: w.mods.indexOf(modId) }; }
    if (slot < 0 || slot >= slots) return fail('slot');
    const cur = w.mods.indexOf(modId);
    if (cur >= 0 && cur !== slot) w.mods[cur] = null;
    w.mods[slot] = modId;
    // Free a copy from another weapon if all owned copies are in use.
    const uses = modUses(p, modId).filter(x => x !== weaponId);
    if (uses.length + 1 > p.mods[modId]) { const o = p.weapons[uses[0]]; o.mods = o.mods.map(m => (m === modId ? null : m)); }
    changed(); return { ok: true, slot };
  };
  // Generic equip: number → weapon slot, gear slot name → gear, 'gadget' → gadget.
  Pr.equip = function (slot, id) {
    if (typeof slot === 'number') return Pr.equipWeapon(slot, id);
    if (slot === 'gadget') return Pr.equipGadget(id);
    return Pr.equipGear(slot, id);
  };
  Pr.loadout = () => D.loadout();

  // ---------- rewards
  function mkLine(type, n, id, extra) {
    const l = Object.assign({ type, n: n || 0, id: id || null }, extra || {});
    const nm = id => {
      switch (type) {
        case 'part': return t(id === 'lumite' ? 'cur.lumite' : 'part.' + id + '.name');
        case 'weapon': return t('weapon.' + id + '.name');
        case 'gear': return t('gear.' + id + '.name');
        case 'gadget': return t('gadget.' + id + '.name');
        case 'recipe': case 'item': return D.RECIPES[id] ? D.recipeName(id) : t('item.' + id + '.name');
        case 'blueprint': return t('mod.' + id + '.name');
        case 'title': return t('title.' + id);
        case 'cosmetic': return t('cos.' + id);
        case 'toggle': return t('toggle.' + id);
        case 'class': return t('class.' + id);
        case 'sticker': return t('sticker.' + id + '.name');
        case 'unlock': return BLD_NAME(id);
      }
      return '';
    };
    l.name = id ? nm(id) : '';
    l.text = t('line.' + type, { n: l.n, name: l.name });
    l.icon = type === 'part' ? D.partIcon(id) : type === 'clinks' ? D.icon('clinks') : type === 'xp' ? D.icon('xp') : type === 'lumite' ? D.icon('lumite')
      : type === 'stamps' ? D.icon('stamps') : type === 'heartPlate' ? D.icon('heart') : type === 'gear' ? D.gearIcon(id) : type === 'blueprint' ? D.icon('blueprint')
        : type === 'weapon' && G.Weapons && G.Weapons.icon ? (G.safe('wicon', () => G.Weapons.icon(id)) || D.icon('star')) : D.icon(type === 'guild' ? 'star' : 'gift');
    if (type === 'part') l.rarity = id === 'lumite' ? 'epic' : (D.PARTS[id] || {}).rarity;
    return l;
  }
  Pr.line = mkLine;
  const BLD_NAME = id => (G.i18n.has('bld.' + id + '.name') ? t('bld.' + id + '.name') : G.i18n.has('mode.' + id + '.name') ? t('mode.' + id + '.name') : G.i18n.has('unlock.' + id) ? t('unlock.' + id) : id);
  // Grant a rewards object. Keys: clinks, xp, lumite, stamps, parts{}, loot[{table, rolls, boss, firstKill}],
  // weapon, gear, gadget, recipe, blueprint, heartPlate, guild, title, cosmetic, toggle, shipClass, unlock,
  // items{}, consumables{}, sticker, weaponXP{id:n}, mark (first-time bookkeeping from modeRewards).
  // Returns result lines [{type, id, n, name, text, icon, rarity?}] for the results screen.
  Pr.grantRewards = function (rw, opts) {
    if (!rw) return [];
    opts = opts || {};
    const p = ready(), lines = [];
    const add = (type, n, id, extra) => { const l = mkLine(type, n, id, extra); lines.push(l); return l; };
    let clinks = Math.max(0, Math.round(rw.clinks || 0));
    const parts = {};
    for (const k in (rw.parts || {})) if (rw.parts[k] > 0) parts[k] = (parts[k] || 0) + Math.floor(rw.parts[k]);
    const bps = [];
    for (const lt of (rw.loot || [])) {
      const got = D.rollLoot(lt.table, { rolls: lt.rolls, boss: lt.boss, firstKill: lt.firstKill, blueprints: true, difficulty: rw.difficulty, heat: rw.heat || 0 });
      for (const e of got) {
        if (e.type === 'bolt') clinks += e.value;
        else if (e.type === 'part') parts[e.partId] = (parts[e.partId] || 0) + (e.n || 1);
        else if (e.type === 'blueprint') bps.push(e.id);
      }
      if (lt.boss && p.records.boss[lt.boss]) p.records.boss[lt.boss].chests++;
    }
    if (clinks > 0) { Pr.addBolts(clinks); add('clinks', clinks); }
    if (rw.lumite > 0) { Pr.addLumite(rw.lumite); add('lumite', rw.lumite); }
    if (parts.lumite) { Pr.addLumite(parts.lumite); add('lumite', parts.lumite); delete parts.lumite; }
    if (rw.stamps > 0) { Pr.addStamps(rw.stamps); add('stamps', rw.stamps); }
    const order = Object.keys(parts).sort((a, b) => D.rarityRank((D.PARTS[b] || {}).rarity) - D.rarityRank((D.PARTS[a] || {}).rarity));
    for (const k of order) if (parts[k] > 0 && Pr.addPart(k, parts[k])) add('part', parts[k], k);
    for (const b of bps.concat(rw.blueprint ? [rw.blueprint] : [])) { const id = giveBlueprint(b); if (id) add('blueprint', 1, id); }
    if (rw.weapon && giveWeapon(rw.weapon)) add('weapon', 1, rw.weapon);
    if (rw.gear && D.GEAR[rw.gear]) { p.gear[rw.gear] = Object.assign(p.gear[rw.gear] || { lvl: 1 }, { own: true }); autoEquipGear(rw.gear); add('gear', 1, rw.gear); }
    if (rw.gadget && D.ABILITIES[rw.gadget] && !p.abilities[rw.gadget]) { p.abilities[rw.gadget] = true; add('gadget', 1, rw.gadget); }
    if (rw.recipe && !p.unlocks.recipes.includes(rw.recipe)) { p.unlocks.recipes.push(rw.recipe); add('recipe', 1, rw.recipe); }
    if (rw.heartPlate) { const before = p.rank.heartPlates; p.rank.heartPlates = Math.min(4, before + rw.heartPlate); if (p.rank.heartPlates > before) add('heartPlate', p.rank.heartPlates - before); }
    if (rw.guild && promote(rw.guild)) add('guild', rw.guild);
    if (rw.title) { p.profile.title = rw.title; add('title', 1, rw.title); }
    for (const c of [].concat(rw.cosmetic || [])) if (c && !p.unlocks.cosmetics.includes(c)) { p.unlocks.cosmetics.push(c); add('cosmetic', 1, c); }
    for (const c of [].concat(rw.toggle || [])) if (c && !p.unlocks.toggles.includes(c)) { p.unlocks.toggles.push(c); add('toggle', 1, c); }
    if (rw.shipClass && !p.unlocks.classes.includes(rw.shipClass)) { p.unlocks.classes.push(rw.shipClass); add('class', 1, rw.shipClass); }
    for (const u of [].concat(rw.unlock || [])) if (u) { const list = D.BUILDINGS.includes(u) ? p.unlocks.buildings : D.MODE_IDS.includes(u) ? p.unlocks.modes : p.unlocks.features; if (!list.includes(u)) { list.push(u); add('unlock', 1, u); } }
    for (const k in (rw.items || {})) { p.items[k] = (p.items[k] || 0) + rw.items[k]; add('item', rw.items[k], k); }
    for (const k in (rw.consumables || {})) { const c = D.SHOP.items[k]; p.loadout.consumables[k] = Math.min(c ? c.carry : 9, (p.loadout.consumables[k] || 0) + rw.consumables[k]); }
    for (const k in (rw.weaponXP || {})) Pr.weaponXP(k, rw.weaponXP[k]);
    if (rw.sticker) G.Stickers.earn(rw.sticker);
    const mk = rw.mark;
    if (mk) {
      if (mk.race) p.records.rewarded.race[mk.race.track] = Math.max(p.records.rewarded.race[mk.race.track] || 0, mk.race.tier);
      if (mk.trial) p.records.rewarded.trials[mk.trial.key] = Math.max(p.records.rewarded.trials[mk.trial.key] || 0, mk.trial.tier);
      if (mk.boss && p.records.boss[mk.boss]) p.records.boss[mk.boss].huntPaid = true;
    }
    if (rw.boostUse) for (const k of ['xp', 'clinks']) if (p.cafe.boost[k] > 0) p.cafe.boost[k]--;
    if (rw.xp > 0) { add('xp', Math.round(rw.xp)); Pr.addXP(rw.xp); }
    // opts.src ('rank' | 'sticker' | 'milestone' | 'star'): a bonus paid on top of a mode's payout → ledger
    if (opts.src) for (const l of lines) { l.src = opts.src; if (opts.pr) l.pr = opts.pr; if (ledger.bonus.length < 60) ledger.bonus.push(l); }
    checkUnlocks(); refreshQuests(); save();
    if (!opts.keep) Pr.lastGrant = lines;
    return lines;
  };
  // Base rewards (GDD §9.2) × difficulty reward multiplier (+10% per Heat). Pure: grant with grantRewards.
  // result: {win, stars, medal, missionStar, mission, boss, place, pops, points, coverage, waves, endless,
  //          track, rings, trial, challenge, score, time, kos, heat, difficulty, collected:{clinks, parts, lumite}}.
  Pr.modeRewards = function (modeId, result) {
    result = result || {};
    const p = ready();
    modeId = modeId || result.mode;
    const diff = resultDiff(result);
    const heat = Math.min(D.HEAT_MAX, Array.isArray(result.heat) ? result.heat.length : (num(result, 'heat') || 0));
    let mult = D.DIFFICULTY[diff].reward * (1 + D.HEAT_REWARD * heat);
    if (modeId === 'training') mult = 1;
    const R = D.REWARDS[modeId] || {};
    const rw = { mode: modeId, difficulty: diff, heat, mult, clinks: 0, xp: 0, lumite: 0, parts: {}, loot: [], mark: null };
    const win = !!result.win;
    let bc = 0, bx = 0, partShare = 1;
    const addParts = obj => { for (const k in (obj || {})) { if (k === 'lumite') rw.lumite += obj[k]; else rw.parts[k] = (rw.parts[k] || 0) + obj[k]; } };
    const bossChest = (id, first) => { if (D.BOSSES[id]) rw.loot.push({ table: 'boss', boss: id, rolls: 3, firstKill: !!first }); };
    switch (modeId) {
      case 'expedition': {
        const star = U.clamp(Math.round(num(result, 'missionStar') || num(result, 'star') || num(result, 'tier') || 1), 1, 6);
        const stars = U.clamp(num(result, 'stars'), 0, 3);
        const grade = result.medal != null ? D.gradeTier(result.medal) : stars;
        bx = R.xp[star] + R.xpPerStar * stars;
        if (win) {
          bc = R.clinks[star];
          rw.loot.push({ table: R.chest, rolls: 1 + grade });
          const b = resultBoss(result);
          if (b && D.BOSSES[b]) bossChest(b, (p.records.boss[b] || {}).chests === 0);
        } else { bx *= R.failXp; partShare = R.failParts; }
        break;
      }
      case 'turf': {
        const pts = Math.max(0, num(result, 'points'));
        bc = (win ? R.win : R.loss) + Math.min(Math.floor(pts / R.perPoints), R.pointsCap);
        bx = win ? R.xpWin : R.xpLoss;
        rw.parts.gel = R.gel + Math.floor(pts / R.gelPer);
        break;
      }
      case 'race': {
        const m = D.medalTier(result.medal);
        if (result.timeTrial) {
          // Time Trial has no placing: pay by medal (bronze..platinum) instead of as 8th place.
          bc = [60, 110, 170, 240, 320][U.clamp(m, 0, 4)] + R.ring * num(result, 'rings');
        } else {
          const place = U.clamp(Math.round(num(result, 'place') || 8), 1, 8);
          bc = R.place[place - 1] + R.ring * num(result, 'rings');
        }
        bx = R.xp + R.medalXp[m];
        const track = result.track;
        if (track && m > 0) {
          const paid = p.records.rewarded.race[track] || 0;
          for (let tier = paid + 1; tier <= m; tier++) addParts(R.firstMedal[tier]);
          if (m > paid) rw.mark = { race: { track, tier: m } };
        }
        break;
      }
      case 'royale': {
        const place = U.clamp(Math.round(num(result, 'place') || R.field), 1, R.field);
        const pops = num(result, 'pops') || num(result, 'kills');
        const won = win || place === 1;
        bc = R.base + R.perPlace * (17 - place) + R.perPop * pops + (won ? R.win : 0);
        bx = R.xp + R.xpPerPlace * (17 - place);
        if (won) rw.loot.push({ table: R.chest, rolls: 1 });
        break;
      }
      case 'defense': {
        const waves = Math.max(0, Math.floor(num(result, 'waves')));
        bc = R.perWave * waves + (win ? R.win : 0);
        bx = R.xpPerWave * waves;
        const metal = Math.floor(waves / R.metalEvery);
        if (metal > 0) rw.loot.push({ table: 'metal', rolls: metal });
        if (win) rw.loot.push({ table: R.chest, rolls: 1 });
        break;
      }
      case 'boss': {
        const id = resultBoss(result);
        if (win) {
          const B = p.records.boss[id] || {};
          const first = typeof result.firstKill === 'boolean' ? result.firstKill && !B.huntPaid : !B.huntPaid;
          bc = first ? R.first : R.repeat; bx = R.xp;
          bossChest(id, first);
          if (first && D.BOSSES[id]) rw.mark = { boss: id };
        } else partShare = 0.5;
        break;
      }
      case 'training': {
        const key = trialKey(result) || 'popup';
        const m = D.medalTier(result.medal);
        const paid = p.records.rewarded.trials[key] || 0;
        for (let tier = paid + 1; tier <= m; tier++) { bc += R.clinks[tier]; bx += R.xp[tier]; }
        if (m > paid) rw.mark = { trial: { key, tier: m } };
        if (m >= 4) rw.sticker = R.platSticker;
        break;
      }
      default: bc = num(result, 'clinks'); bx = num(result, 'xp');
    }
    rw.clinks = Math.round(bc * mult * (num(result, 'lootMult') || 1));
    rw.xp = Math.round(bx * mult);
    const boost = p.cafe.boost || {};
    if (boost.clinks > 0) { rw.clinks = Math.round(rw.clinks * (1 + D.REWARDS.boost)); rw.boostClinks = true; }
    if (boost.xp > 0) { rw.xp = Math.round(rw.xp * (1 + D.REWARDS.boost)); rw.boostXp = true; }
    if (boost.clinks > 0 || boost.xp > 0) rw.boostUse = true;
    // Field pickups (Vault rule): all on success, 50% parts on fail/quit; clinks always kept.
    const c = result.collected;
    if (c) {
      rw.clinks += Math.max(0, Math.round(c.clinks || 0));
      rw.lumite += Math.max(0, Math.round(c.lumite || 0));
      for (const k in (c.parts || {})) { const n = Math.floor((c.parts[k] || 0) * partShare); if (n > 0) { if (k === 'lumite') rw.lumite += n; else rw.parts[k] = (rw.parts[k] || 0) + n; } }
    }
    return rw;
  };
  // Convenience for modes: compute + grant. Returns {rewards, lines}; pass `lines` to the results screen.
  Pr.finish = function (modeId, result) {
    const rewards = Pr.modeRewards(modeId, result);
    const lines = Pr.grantRewards(rewards);
    return { rewards, lines };
  };

  // ---------- unlocks (GDD §10.2, staged over the first four missions so only one or two places open at a time:
  // 1 → Workshop + Pop Shop, 2 → Hangar (Star Skiff Rally) + Arena (Goo Turf), 3 → Guard Post (Fountain Guard) +
  // Fizz Café + Daily quests, 4 → Gallery + Royale Tower + Boss Hunt). Opened ids are kept in profile.unlocks, so
  // nothing ever closes again.
  const UNLOCK_LIST = { buildings: ['workshop', 'shop', 'arena', 'hangar', 'cafe', 'tower', 'gallery'], modes: ['turf', 'race', 'defense', 'royale', 'boss'], features: ['modbench', 'dailies', 'weeklies', 'spicy', 'blazing', 'heat', 'dailyTrack', 'weeklyExp', 'starRank'] };
  const m_ = p => p.stats.missions || 0, g_ = p => p.rank.guild, pr_ = p => p.rank.pr;
  const anyBoss = p => D.BOSS_IDS.some(id => (p.records.boss[id] || {}).kills > 0);
  const MISSION_GATE = { workshop: 1, tuneup: 1, shop: 1, hangar: 2, race: 2, arena: 2, turf: 2, defense: 3, cafe: 3, dailies: 3, gallery: 4, tower: 4, royale: 4, boss: 4 };
  const mg = id => p => m_(p) >= MISSION_GATE[id];
  const RULES = {
    guild: () => true, fountain: () => true, training: () => true, gate: () => true, expedition: () => true,
    workshop: mg('workshop'), tuneup: p => RULES.workshop(p),
    shop: p => qIsDone(p, 'q02') || mg('shop')(p),
    hangar: p => g_(p) >= 2 || mg('hangar')(p), race: p => RULES.hangar(p),
    arena: p => g_(p) >= 2 || mg('arena')(p), turf: p => RULES.arena(p),
    defense: p => g_(p) >= 2 || mg('defense')(p),
    cafe: p => g_(p) >= 2 || mg('cafe')(p),
    dailies: mg('dailies'),
    gallery: p => p.stickers.length >= 3 || mg('gallery')(p),
    tower: p => g_(p) >= 3 || mg('tower')(p), royale: p => RULES.tower(p),
    boss: p => anyBoss(p) || mg('boss')(p),
    modbench: p => pr_(p) >= 5, weeklies: p => pr_(p) >= 12, weeklyExp: p => pr_(p) >= 12,
    dailyTrack: p => pr_(p) >= 15, spicy: p => pr_(p) >= 10, blazing: p => pr_(p) >= 18, heat: p => pr_(p) >= 20, starRank: p => pr_(p) >= 30,
  };
  // The schedule before the staged unlocks (everything within two matches, dailies at PR 3). Applied once to
  // saves made before it (no profile.unlocks.ann yet) so an existing player never loses an open place.
  const LEGACY = {
    workshop: p => m_(p) >= 1, shop: p => m_(p) >= 1, arena: p => m_(p) >= 1, turf: p => m_(p) >= 1, hangar: p => m_(p) >= 1, race: p => m_(p) >= 1, defense: p => m_(p) >= 1,
    cafe: p => m_(p) >= 2, tower: p => m_(p) >= 2, royale: p => m_(p) >= 2, gallery: p => m_(p) >= 2, boss: p => m_(p) >= 2, dailies: p => pr_(p) >= 3,
  };
  // "New in Fizzport!" announcements, in display order. id = hub facility id (G.Hub.travel / G.Hub.open take it),
  // rule = progression feature id, go = hub place a "Go there" button leads to (null: nothing to visit).
  const ANN = [
    { kind: 'facility', id: 'workshop', rule: 'workshop', nameKey: 'hub.b.workshop', subKey: 'menu.place.workshop', icon: 'wrench', go: 'workshop' },
    { kind: 'facility', id: 'shop', rule: 'shop', nameKey: 'hub.b.shop', subKey: 'menu.place.shop', icon: 'coin', go: 'shop' },
    { kind: 'facility', id: 'hangar', rule: 'hangar', nameKey: 'hub.b.hangar', subKey: 'mode.race.name', icon: 'rocket', go: 'hangar' },
    { kind: 'facility', id: 'arena', rule: 'arena', nameKey: 'hub.b.arena', subKey: 'mode.turf.name', icon: 'splat', go: 'arena' },
    { kind: 'facility', id: 'defense', rule: 'defense', nameKey: 'hub.b.defense', subKey: 'mode.defense.name', icon: 'shield', go: 'defense' },
    { kind: 'facility', id: 'cafe', rule: 'cafe', nameKey: 'hub.b.cafe', subKey: 'menu.place.cafe', icon: 'cup', go: 'cafe' },
    { kind: 'feature', id: 'dailies', rule: 'dailies', nameKey: 'unlock.dailies', subKey: 'hub.b.guild', icon: 'scroll', go: 'guild', params: { tab: 'daily' } },
    { kind: 'facility', id: 'gallery', rule: 'gallery', nameKey: 'hub.b.gallery', subKey: 'menu.place.gallery', icon: 'trophy', go: 'gallery' },
    { kind: 'facility', id: 'royale', rule: 'tower', nameKey: 'hub.b.royale', subKey: 'mode.royale.name', icon: 'airship', go: 'royale' },
    { kind: 'mode', id: 'boss', rule: 'boss', nameKey: 'mode.boss.name', subKey: 'hub.b.guild', icon: 'bot', go: 'guild', screen: 'boss-select' },
    { kind: 'feature', id: 'modbench', rule: 'modbench', nameKey: 'unlock.modbench', subKey: 'hub.b.workshop', icon: 'chip', go: 'workshop', params: { tab: 'mods' } },
    { kind: 'feature', id: 'spicy', rule: 'spicy', nameKey: 'unlock.spicy', subKey: 'hub.b.fountain', icon: 'bolt', go: 'fountain' },
    { kind: 'feature', id: 'weeklies', rule: 'weeklies', nameKey: 'unlock.weeklies', subKey: 'hub.b.guild', icon: 'scroll', go: 'guild', params: { tab: 'daily' } },
    { kind: 'feature', id: 'dailyTrack', rule: 'dailyTrack', nameKey: 'unlock.dailyTrack', subKey: 'hub.b.hangar', icon: 'rocket', go: 'hangar' },
    { kind: 'feature', id: 'blazing', rule: 'blazing', nameKey: 'unlock.blazing', subKey: 'hub.b.fountain', icon: 'bolt', go: 'fountain' },
    { kind: 'feature', id: 'heat', rule: 'heat', nameKey: 'unlock.heat', subKey: 'hub.b.fountain', icon: 'bolt', go: 'fountain' },
    { kind: 'feature', id: 'starRank', rule: 'starRank', nameKey: 'unlock.starRank', subKey: null, icon: 'star', go: null },
  ];
  Pr.ANNOUNCE = ANN;
  // featureId: building (guild workshop shop cafe gallery training hangar arena tower fountain gate),
  // mode (expedition race turf royale defense training boss), feature (modbench dailies weeklies spicy
  // blazing heat dailyTrack weeklyExp starRank tuneup), or prefixed: boss_<id> biome_<id> track_<id> class_<id> diff_<id>.
  Pr.isUnlocked = function (f) {
    const p = P(), u = p.unlocks;
    if (!f) return false;
    if (u.all) return true;
    if (u.buildings.includes(f) || u.modes.includes(f) || (u.features || []).includes(f)) return true;
    if (RULES[f]) return !!RULES[f](p);
    const i = f.indexOf('_'); if (i < 0) return false;
    const kind = f.slice(0, i), id = f.slice(i + 1);
    switch (kind) {
      case 'boss': return (p.records.boss[id] || {}).kills > 0 || (id === 'crankcrab' && RULES.boss(p));
      case 'biome': return u.biomes.includes(id) || (D.BIOMES[id] && g_(p) >= D.BIOMES[id].guild);
      case 'track': { const tr = D.TRACKS[id]; if (!tr) return false; if (tr.pr) return pr_(p) >= tr.pr; return Pr.isUnlocked('race') && (tr.guild <= 2 || g_(p) >= tr.guild); }
      case 'class': return u.classes.includes(id) || (D.CLASSES[id] && D.CLASSES[id].guild && g_(p) >= D.CLASSES[id].guild);
      case 'diff': return D.DIFFICULTY[id] ? pr_(p) >= D.DIFFICULTY[id].pr : false;
    }
    return false;
  };
  Pr.unlockAll = function () {
    const p = ready();
    p.unlocks.all = true;
    for (const k in UNLOCK_LIST) for (const id of UNLOCK_LIST[k]) { const list = k === 'features' ? p.unlocks.features : p.unlocks[k]; if (!list.includes(id)) list.push(id); }
    for (const b in D.BIOMES) if (!p.unlocks.biomes.includes(b)) p.unlocks.biomes.push(b);
    for (const c in D.CLASSES) if (!p.unlocks.classes.includes(c)) p.unlocks.classes.push(c);
    for (const tr of D.TRACK_IDS) if (!p.unlocks.tracks.includes(tr)) p.unlocks.tracks.push(tr);
    p.unlocks.ann = ANN.map(a => a.id);   // debug unlock: nothing to announce
    emit('unlock', 'all'); save();
    return true;
  };
  // Records newly reached unlocks. No toast: they are announced together by the "New in Fizzport!" card
  // (results screen, hub) from Pr.newUnlocks().
  function checkUnlocks(rules) {
    const p = P();
    rules = rules || RULES;
    for (const k in UNLOCK_LIST) {
      const list = k === 'features' ? p.unlocks.features : p.unlocks[k];
      for (const id of UNLOCK_LIST[k]) {
        if (list.includes(id) || !(rules[id] && rules[id](p))) continue;
        list.push(id);
        emit('unlock', id);
      }
    }
  }
  Pr.checkUnlocks = () => checkUnlocks();
  // One-time step for saves from before the staged unlocks: keep everything the old schedule opened, and
  // count it as already announced.
  function migrateUnlocks(p) {
    if (Array.isArray(p.unlocks.ann)) return;
    checkUnlocks(LEGACY);
    checkUnlocks();
    p.unlocks.ann = ANN.filter(a => Pr.isUnlocked(a.rule)).map(a => a.id);
  }
  // Unlocks not announced yet: [{kind:'facility'|'mode'|'feature', id, nameKey, icon, subKey, go, params?, screen?}].
  Pr.newUnlocks = function () {
    const p = ready();
    if (!Array.isArray(p.unlocks.ann)) migrateUnlocks(p);
    const ann = p.unlocks.ann;
    return ANN.filter(a => !ann.includes(a.id) && Pr.isUnlocked(a.rule)).map(a => {
      const o = { kind: a.kind, id: a.id, nameKey: a.nameKey, icon: a.icon, subKey: a.subKey, go: a.go };
      if (a.params) o.params = Object.assign({}, a.params);
      if (a.screen) o.screen = a.screen;
      return o;
    });
  };
  // Mark unlocks as announced (persisted). ids: an id, an array of ids, or nothing = everything new now.
  Pr.ackUnlocks = function (ids) {
    const p = ready();
    if (!Array.isArray(p.unlocks.ann)) migrateUnlocks(p);
    if (ids == null) ids = Pr.newUnlocks().map(u => u.id);
    let n = 0;
    for (const id of [].concat(ids)) if (typeof id === 'string' && ANN.some(a => a.id === id) && !p.unlocks.ann.includes(id)) { p.unlocks.ann.push(id); n++; }
    if (n) { save(); emit('unlock-ack', ids); }
    return n;
  };

  // ---------- codex, seen, visits, tutorial
  // New Codex entries met together (a whole camp noticing you at once, e.g. right after the first mission's start
  // near a camp) share one toast instead of a stack of them.
  let codexQ = [], codexT = 0;
  function codexToast(id) {
    codexQ.push(id);
    if (codexT) return;
    codexT = setTimeout(() => {
      codexT = 0;
      const q = codexQ; codexQ = [];
      if (q.length === 1) toast(t('prog.codexNew', { name: t('enemy.' + q[0] + '.name') }), { icon: D.icon('star') });
      else if (q.length > 1) toast(t('prog.codexNewN', { n: q.length }), { icon: D.icon('star') });
    }, 1200);
  }
  Pr.markSeen = function (kind, id) {
    const p = ready();
    const s = p.seen[kind] || (p.seen[kind] = {});
    if (s[id]) return false;
    s[id] = 1;
    if (kind === 'enemy') {
      if (!p.codex[id]) p.codex[id] = 0;
      if (!quiet) codexToast(id);
      Pr.addXP(D.XP.sources.codex);
    }
    save(); return true;
  };
  Pr.isSeen = (kind, id) => !!(P().seen[kind] && P().seen[kind][id]);
  Pr.codex = function (id) {
    const n = P().codex[id] || 0;
    const level = n >= 25 ? 3 : n >= 10 ? 2 : n >= 1 ? 1 : 0;
    return { id, pops: n, level, levelKey: 'codex.lvl' + level, seen: Pr.isSeen('enemy', id) || n > 0, info: D.ENEMIES[id] || D.BOSSES[id] || null };
  };
  Pr.codexList = () => D.ENEMY_IDS.concat(D.BOSS_IDS).map(Pr.codex);
  Pr.visit = function (buildingId) {
    const p = ready();
    if (!buildingId || p.quests.visited.includes(buildingId)) return false;
    p.quests.visited.push(buildingId);
    refreshQuests(); save();
    return true;
  };
  Pr.tipSeen = id => !!P().tutorial.tips[id];
  Pr.markTip = function (id) { const p = ready(); if (p.tutorial.tips[id]) return false; p.tutorial.tips[id] = 1; save(); return true; };
  Pr.setTutorialStep = function (n) { const p = ready(); p.tutorial.step = n; save(); };
  Pr.completeTutorial = function () {
    const p = ready();
    if (p.tutorial.done) return [];
    p.tutorial.done = true;
    return Pr.grantRewards({ cosmetic: 'gauntlet_kiko' });
  };

  // ---------- Star Sprockets (30, bitmask string)
  Pr.sprocketCount = function (p) { p = p || P(); let n = 0; const s = p.sprockets || ''; for (let i = 0; i < s.length; i++) if (s[i] === '1') n++; return n; };
  Pr.hasSprocket = idx => P().sprockets[idx] === '1';
  Pr.addSprocket = function (idx) {
    const p = ready();
    if (idx == null || idx < 0 || idx >= D.SPROCKET_COUNT) idx = p.sprockets.indexOf('0');
    if (idx < 0 || p.sprockets[idx] === '1') return false;
    p.sprockets = p.sprockets.slice(0, idx) + '1' + p.sprockets.slice(idx + 1);
    const n = Pr.sprocketCount(p);
    toast(t('prog.sprocket', { n }), { icon: D.partIcon('sprocket') });
    sfx('unlock');
    for (const m of D.SPROCKET_MILESTONES) if (m.n === n) Pr.grantRewards({ cosmetic: m.cosmetic, toggle: m.toggle, title: m.title }, { keep: true, src: 'milestone' });
    emit('sprocket', idx, n);
    refreshQuests(); stickerCheck(); walletChanged(); save();
    return true;
  };

  // ---------- Café, ship
  Pr.cafeStatus = () => { const p = P(); return { available: p.cafe.lastTreat !== today(), day: (p.cafe.treatDay % 7) + 1, boost: Object.assign({}, p.cafe.boost) }; };
  Pr.cafeTreat = function (opts) {
    const p = ready();
    if (p.cafe.lastTreat === today()) return fail('cooldown');
    p.cafe.treatDay = (p.cafe.treatDay % 7) + 1;
    p.cafe.lastTreat = today();
    const tr = D.CAFE_TREATS[p.cafe.treatDay - 1];
    const rw = Object.assign({}, tr);
    if (tr.randomParts) { rw.parts = {}; const pool = D.PARTS_BY_RARITY.common.concat(D.PARTS_BY_RARITY.uncommon); for (let i = 0; i < tr.randomParts; i++) { const k = U.pick(pool); rw.parts[k] = (rw.parts[k] || 0) + 1; } }
    const lines = Pr.grantRewards(rw);
    if (!(opts && opts.silent)) toast(t('prog.treat', { n: p.cafe.treatDay }), { icon: D.icon('gift') });
    return { ok: true, day: p.cafe.treatDay, lines };
  };
  Pr.shipCost = function (track) { const lv = P().ship[track]; if (lv == null) return null; return lv >= D.SHIP.max ? null : D.SHIP.cost(lv + 1); };
  Pr.upgradeShip = function (track) {
    const p = ready(), c = Pr.shipCost(track);
    if (p.ship[track] == null) return fail('unknown');
    if (!c) return fail('max');
    const miss = Pr.missing(c);
    if (Object.keys(miss).length) { sfx('error'); return fail(miss.clinks && Object.keys(miss).length === 1 ? 'clinks' : 'parts', { missing: miss }); }
    Pr.takeParts(c);
    p.ship[track]++;
    sfx('buy'); toast(t('prog.shipUp', { name: t('ship.' + track), n: p.ship[track] }));
    emit('purchase', 'ship_' + track, c.clinks); save();
    return { ok: true, track, level: p.ship[track] };
  };
  // How far a locked building / mode / feature is from opening: {missions} = missions still to finish, {pr} =
  // Player Rank needed, {guild} = Guild ★ needed, {story: true} = beat it in the story first; plus `text`, the
  // short localized line. null when open (or unknown). Hub facility ids work too ('royale' = Royale Tower).
  const PR_GATE = { modbench: 5, spicy: 10, weeklies: 12, weeklyExp: 12, dailyTrack: 15, blazing: 18, heat: 20, starRank: 30 };
  Pr.unlockInfo = function (f) {
    if (!f || Pr.isUnlocked(f)) return null;
    const p = P();
    let o = null;
    if (MISSION_GATE[f]) o = { missions: Math.max(1, MISSION_GATE[f] - m_(p)) };
    else if (PR_GATE[f]) o = { pr: PR_GATE[f] };
    else if (f.startsWith('diff_') && D.DIFFICULTY[f.slice(5)]) o = { pr: D.DIFFICULTY[f.slice(5)].pr };
    else if (f.startsWith('boss_')) o = { story: true };
    else if (f.startsWith('biome_') && D.BIOMES[f.slice(6)]) o = { guild: D.BIOMES[f.slice(6)].guild };
    else if (f.startsWith('track_') && D.TRACKS[f.slice(6)]) { const tr = D.TRACKS[f.slice(6)]; o = tr.pr ? { pr: tr.pr } : !Pr.isUnlocked('race') ? Pr.unlockInfo('race') : { guild: tr.guild }; }
    if (!o) return null;
    o.text = o.text || (o.missions ? t(o.missions === 1 ? 'unlock.hint.m1' : 'unlock.hint.mn', { n: o.missions }) : o.pr ? t('unlock.hint.pr', { n: o.pr }) : o.guild ? t('unlock.hint.guild', { n: o.guild }) : t('unlock.hint.story'));
    return o;
  };
  // Short localized condition text for a locked facility / mode / feature ('Opens after 1 more mission'),
  // null when it is open.
  Pr.unlockHint = function (f) { const o = Pr.unlockInfo(f); return o ? o.text : null; };
  // Next suggested action for the hub chip: {key, building}.
  Pr.suggestion = function () {
    const p = ready();
    if (G.Quests.claimable() > 0) return { key: 'sugg.claim', building: 'guild' };
    // first session: meet Quill once, then straight to the Mission Board
    if (!m_(p)) return !p.quests.visited.includes('guild') ? { key: 'sugg.guild', building: 'guild' } : { key: 'sugg.expedition', building: 'fountain' };
    if (Pr.isUnlocked('workshop') && !(p.gear.shield1 && p.gear.shield1.own)) {
      // The guided first craft: point at the Workshop only when it can really be made; otherwise send the
      // player to the Pop Shop for the missing Scrap Plates (always stocked) or back out on a mission.
      const st = Pr.canCraft('shield1');
      if (st.ok) return { key: 'sugg.shield', building: 'workshop', ready: true };
      const miss = st.missing || {}, only = Object.keys(miss).every(k => k === 'scrap');
      if (only && miss.scrap && Pr.isUnlocked('shop') && p.clinks >= D.RECIPES.shield1.clinks + D.SHOP.items.scrap10.price) return { key: 'sugg.scrap', building: 'shop' };
    }
    if (Pr.isUnlocked('cafe') && Pr.cafeStatus().available) return { key: 'sugg.cafe', building: 'cafe' };
    if (Pr.isUnlocked('turf') && !p.records.turf.played) return { key: 'sugg.turf', building: 'arena' };
    if (Pr.isUnlocked('race') && !p.records.races.played) return { key: 'sugg.race', building: 'hangar' };
    if (Pr.isUnlocked('royale') && !p.records.royale.played) return { key: 'sugg.royale', building: 'tower' };
    if (Pr.recipeList().some(r => r.ok && r.recipe.kind !== 'item' && r.recipe.kind !== 'mod')) return { key: 'sugg.craft', building: 'workshop' };
    return { key: 'sugg.expedition', building: 'fountain' };
  };

  // ------------------------------------------------------------------ G.Quests
  const Qs = G.Quests = {};
  Qs.autoAccept = true;   // GDD: quests track automatically; abandon() pauses until accept()
  const qIsDone = (p, id) => p.quests.done.includes(id) || p.quests.claimed.includes(id);
  // Quest type handlers. Each event handler returns an increment, {set:n} (max), or 0. state() = computed value.
  let plateEvents = false;
  const QT = {
    visit: { state: (tg, p) => p.quests.visited.length },
    hunt: { kill: (tg, target, info) => (!isBot(target, info) || (tg.enemy && enemyKey(target) !== tg.enemy) || (tg.elite && !target.elite) ? 0 : 1) },
    gather: {
      pickup: (tg, type, data) => {
        if (type !== 'part' || !data) return 0;
        const id = data.partId;
        if (tg.part && id !== tg.part) return 0;
        if (tg.rarity && D.rarityRank(data.rarity || (D.PARTS[id] || {}).rarity) < D.rarityRank(tg.rarity)) return 0;
        return data.n || 1;
      },
    },
    crates: { 'crate-break': () => 1 },
    plates: { 'plate-break': () => 1, kill: (tg, target) => (!plateEvents && enemyKey(target) === 'shieldy' ? 1 : 0) },
    boss: {
      kill: (tg, target) => (bossKey(target) === tg.boss ? { set: 1 } : 0),
      'mode-result': (tg, r) => (r.win && ((tg.boss && resultBoss(r) === tg.boss) || (tg.mission && r.mission === tg.mission)) ? { set: 1 } : 0),
    },
    mission: { 'mode-result': (tg, r) => (r.mode === 'expedition' && r.win && r.mission === tg.mission ? { set: 1 } : 0), objective: (tg, id) => (id === tg.mission ? { set: 1 } : 0) },
    trial: { 'mode-result': (tg, r) => (r.mode === 'training' && (!tg.trial || trialKey(r) === tg.trial) && D.medalTier(r.medal) >= (tg.medal || 1) ? { set: 1 } : 0) },
    trainmedal: { 'mode-result': (tg, r) => (r.mode === 'training' && D.medalTier(r.medal) >= 1 ? 1 : 0) },
    turfwin: { 'mode-result': (tg, r) => (r.mode === 'turf' && r.win && coverage(r) >= (tg.coverage || 0) ? 1 : 0) },
    racemedal: {
      state: (tg, p) => {
        const m = p.records.medals.race;
        if (tg.track) return (m[tg.track] || 0) >= tg.medal ? 1 : 0;
        return Object.keys(m).filter(k => k !== 'daily' && m[k] >= tg.medal).length;
      },
    },
    racetop: { 'mode-result': (tg, r) => { const pl = num(r, 'place'); return r.mode === 'race' && pl >= 1 && pl <= tg.place ? 1 : 0; } },
    racegold: { 'mode-result': (tg, r) => (r.mode === 'race' && D.medalTier(r.medal) >= (tg.medal || 3) ? 1 : 0) },
    survive: {
      'mode-result': (tg, r) => {
        if (r.mode !== 'defense' || num(r, 'waves') < tg.waves) return 0;
        if ((tg.win && !r.win) || (tg.endless && !r.endless) || (tg.diff && diffRank(resultDiff(r)) < diffRank(tg.diff))) return 0;
        return 1;
      },
    },
    sprockets: { state: (tg, p) => Pr.sprocketCount(p) },
    placement: { 'mode-result': (tg, r) => { const pl = num(r, 'place') || (r.win ? 1 : 0); return r.mode === 'royale' && pl >= 1 && pl <= tg.place ? 1 : 0; } },
    popup: { 'mode-result': (tg, r) => (r.mode === 'training' && trialKey(r) === 'popup' && num(r, 'score') >= tg.score ? { set: 1 } : 0) },
    craft: { craft: () => 1 },
    elitesrun: { kill: (tg, target, info) => (target && target.elite && isBot(target, info) ? { set: run.elites } : 0) },
    level: { state: (tg, p) => (maxWeaponLevel(p) >= tg.lvl ? 1 : 0) },
    bosstime: {
      'mode-result': (tg, r) => {
        const tm = num(r, 'time');
        return r.mode === 'boss' && r.win && resultBoss(r) === tg.boss && diffRank(resultDiff(r)) >= diffRank(tg.diff) && tm > 0 && tm <= tg.time ? { set: 1 } : 0;
      },
    },
    noko: {
      'mode-result': (tg, r) => {
        const star = num(r, 'missionStar') || num(r, 'star') || num(r, 'tier');
        const kos = typeof r.kos === 'number' ? r.kos : (r.stats && typeof r.stats.kos === 'number' ? r.stats.kos : run.kos);
        return r.mode === 'expedition' && r.win && star >= tg.star && kos === 0 ? { set: 1 } : 0;
      },
    },
    bossrush: { 'mode-result': (tg, r) => (r.mode === 'boss' && r.win && r.rush ? { set: 1 } : 0) },
    bossany: { kill: (tg, target) => (D.BOSSES[bossKey(target)] ? 1 : 0) },
    paint: { paint: (tg, team, cells, src) => (isPlayerPaint(team, src) ? Math.max(0, cells || 0) * 0.25 : 0) },
    clinks: { clinks: (tg, n) => n },
  };
  Qs.TYPES = QT;
  function isPlayerPaint(team, src) {
    if (src === 'player' || byPlayer(src)) return true;
    if (src != null) return false;
    const w = G.Game && G.Game.world, pl = w && w.player;
    if (!pl) return true;
    return team === pl.team || team === pl.inkTeam;
  }
  function maxWeaponLevel(p) { let m = 0; for (const id in p.weapons) if (p.weapons[id].own) m = Math.max(m, p.weapons[id].lvl); return m; }
  const applyInc = (cur, r) => (r && typeof r === 'object' ? Math.max(cur, r.set) : cur + (r || 0));

  function qUnlocked(q, p) {
    if (p.rank.guild < q.rank) return false;
    if (q.promo) {
      const gd = D.GUILD[q.rank];
      if (gd && !gd.keys.every(k => qIsDone(p, k))) return false;
      const nx = D.GUILD[q.rank + 1];
      if (nx && p.rank.pr < nx.pr) return false;
    }
    return true;
  }
  function qValue(q, p) { const T = QT[q.type]; if (T && T.state) return T.state(q.target, p); return p.quests.prog[q.id] || 0; }
  Qs.status = function (id) {
    const p = P(), q = D.QUESTS[id];
    if (!q) return null;
    if (p.quests.claimed.includes(id)) return 'claimed';
    if (p.quests.done.includes(id)) return 'complete';
    if (p.quests.active.includes(id)) return 'active';
    return qUnlocked(q, p) ? 'available' : 'locked';
  };
  function view(id) {
    const p = P(), q = D.QUESTS[id];
    const value = Math.min(q.goal, qValue(q, p)), status = Qs.status(id);
    const rewards = Object.assign({ stamps: D.questStamps(q) }, q.rewards);
    return { id, def: q, kind: 'story', titleKey: q.titleKey, descKey: q.descKey, title: t(q.titleKey), desc: t(q.descKey), rank: q.rank, key: q.key, promo: q.promo, mode: q.mode, value: Math.floor(value), goal: q.goal, frac: q.goal ? U.clamp(value / q.goal, 0, 1) : 0, status, done: status === 'complete' || status === 'claimed', claimed: status === 'claimed', rewards };
  }
  Qs.all = () => D.QUEST_IDS.map(view);
  Qs.available = () => { ready(); return D.QUEST_IDS.filter(id => Qs.status(id) === 'available').map(view); };
  Qs.active = () => { ready(); return P().quests.active.filter(id => D.QUESTS[id] && !P().quests.claimed.includes(id)).map(view); };
  Qs.accept = function (id) {
    const p = ready(), st = Qs.status(id);
    if (st !== 'available') return st === 'active' || st === 'complete' ? { ok: true, id } : fail(st === 'claimed' ? 'claimed' : st ? 'locked' : 'unknown');
    p.quests.paused = p.quests.paused.filter(x => x !== id);
    p.quests.active.push(id);
    sfx('quest');
    refreshQuests(); save();
    return { ok: true, id };
  };
  Qs.abandon = function (id) {
    const p = ready();
    if (!p.quests.active.includes(id) || p.quests.done.includes(id)) return fail('notDone');
    p.quests.active = p.quests.active.filter(x => x !== id);
    if (!p.quests.paused.includes(id)) p.quests.paused.push(id);
    const q = D.QUESTS[id]; if (q && !(QT[q.type] && QT[q.type].state)) p.quests.prog[id] = 0;
    save();
    return { ok: true, id };
  };
  Qs.progressOf = function (id) {
    if (typeof id === 'string' && (id.startsWith('d:') || id.startsWith('w:'))) { const v = periodicView(id[0] === 'd' ? 'daily' : 'weekly', +id.slice(2)); return v ? { id, value: v.value, goal: v.goal, frac: v.frac, done: v.done, claimed: v.claimed, status: v.status } : null; }
    if (!D.QUESTS[id]) return null;
    const v = view(id);
    return { id, value: v.value, goal: v.goal, frac: v.frac, done: v.done, claimed: v.claimed, status: v.status };
  };
  function completeQuest(id, title) {
    toast(t('prog.questDone', { name: title }), { icon: D.icon('star'), color: '#3ddc97' });
    sfx('questDone');
    emit('quest-complete', id);
  }
  function refreshQuests() {
    if (!inited) return;
    const p = P();
    for (const id of D.QUEST_IDS) {
      const q = D.QUESTS[id];
      if (Qs.autoAccept && !p.quests.active.includes(id) && !qIsDone(p, id) && !p.quests.paused.includes(id) && qUnlocked(q, p)) p.quests.active.push(id);
      if (p.quests.active.includes(id) && !qIsDone(p, id) && qValue(q, p) >= q.goal) { p.quests.done.push(id); completeQuest(id, t(q.titleKey)); }
    }
    for (const kind of ['daily', 'weekly']) {
      const o = p[kind];
      if (!o || !o.ids || !Pr.isUnlocked(kind === 'daily' ? 'dailies' : 'weeklies')) continue;
      o.done = o.done || [];
      o.ids.forEach((tid, i) => {
        const v = periodicView(kind, i);
        if (v && v.value >= v.goal && !o.done[i]) { o.done[i] = true; completeQuest((kind === 'daily' ? 'd:' : 'w:') + i, v.title); }
      });
    }
  }
  Qs.refresh = () => { ready(); rotate(); refreshQuests(); save(); };
  // Dispatch one event to every quest (story + daily + weekly). Same args as the bus event.
  function questEvent(ev, a, b, c) {
    if (!inited) return;
    const p = P();
    for (const id of D.QUEST_IDS) {
      const q = D.QUESTS[id];
      if (q.rank > p.rank.guild || qIsDone(p, id) || (p.quests.paused.includes(id) && !p.quests.active.includes(id))) continue;
      const h = QT[q.type] && QT[q.type][ev];
      if (!h) continue;
      const r = h(q.target, a, b, c);
      if (!r) continue;
      const cur = p.quests.prog[id] || 0, nv = Math.min(q.goal, applyInc(cur, r));
      if (nv !== cur) { p.quests.prog[id] = nv; emit('quest-progress', id, nv); }
    }
    for (const kind of ['daily', 'weekly']) {
      const o = p[kind];
      if (!o || !o.ids || !o.ids.length || !Pr.isUnlocked(kind === 'daily' ? 'dailies' : 'weeklies')) continue;
      const T = kind === 'daily' ? D.DAILY_TEMPLATES : D.WEEKLY_TEMPLATES;
      o.ids.forEach((tid, i) => {
        const tpl = T[tid]; if (!tpl || o.claimed[i]) return;
        const h = QT[tpl.type] && QT[tpl.type][ev]; if (!h) return;
        const tg = Object.assign({}, tpl.target, o.params[i] || {});
        const r = h(tg, a, b, c); if (!r) return;
        const cur = o.prog[i] || 0, nv = Math.min(o.goals[i], applyInc(cur, r));
        if (nv !== cur) { o.prog[i] = nv; emit('quest-progress', (kind === 'daily' ? 'd:' : 'w:') + i, nv); }
      });
    }
  }
  // Contract: G.Quests.progress(event, ...args) feeds an event manually (same args as the bus event).
  Qs.progress = function (ev, a, b, c) { ready(); dispatch(ev, a, b, c); };

  // ---------- dailies / weeklies (deterministic from the local date / ISO week)
  function modeOK(mode) { return !mode || Pr.isUnlocked(mode); }
  function pickTemplate(kind, i, rng, exclude) {
    const p = P(), o = p[kind], T = kind === 'daily' ? D.DAILY_TEMPLATES : D.WEEKLY_TEMPLATES;
    const used = o.ids.filter((x, j) => j !== i).concat(exclude || []);
    let pool = Object.keys(T).filter(k => !used.includes(k) && modeOK(T[k].mode));
    if (!pool.length) pool = Object.keys(T).filter(k => !T[k].mode);
    const id = pool[Math.floor(rng() * pool.length)];
    const tpl = T[id];
    let goal = tpl.goal;
    if (Array.isArray(goal)) { const st = tpl.step || 1; const steps = Math.floor((goal[1] - goal[0]) / st); goal = goal[0] + st * Math.floor(rng() * (steps + 1)); }
    const params = {};
    if (tpl.parts) params.part = tpl.parts[Math.floor(rng() * tpl.parts.length)];
    o.ids[i] = id; o.goals[i] = goal; o.params[i] = params; o.prog[i] = 0; o.claimed[i] = false; if (o.done) o.done[i] = false;
    if (kind === 'daily') { o.rewards = o.rewards || []; const R = D.REWARDS.daily.clinks; o.rewards[i] = R[0] + 25 * Math.floor(rng() * ((R[1] - R[0]) / 25 + 1)); }
  }
  function rotate() {
    const p = P(), d = today(), wk = weekId();
    if (p.daily.day !== d || !p.daily.ids || p.daily.ids.length !== 3) {
      p.daily = { day: d, ids: [], goals: [], params: [], prog: [0, 0, 0], claimed: [false, false, false], done: [false, false, false], rewards: [], rerolls: 1, rerollsUsed: 0, crate: false };
      const rng = G.rng(fnv('daily:' + d));
      for (let i = 0; i < 3; i++) pickTemplate('daily', i, rng);
    }
    if (p.weekly.wk !== wk || !p.weekly.ids || p.weekly.ids.length !== 5) {
      const old = p.weekly && p.weekly.ids ? { ids: p.weekly.ids.slice(), prog: (p.weekly.prog || []).slice(), claimed: (p.weekly.claimed || []).slice() } : null;
      p.weekly = { wk, ids: [], goals: [], params: [], prog: [0, 0, 0, 0, 0], claimed: [false, false, false, false, false], done: [false, false, false, false, false], expedition: false, bonus: false };
      const rng = G.rng(fnv('weekly:' + wk));
      for (let i = 0; i < 5; i++) pickTemplate('weekly', i, rng);
      // In-progress challenges carry over if the new week rolls the same template.
      if (old) p.weekly.ids.forEach((id, i) => { const j = old.ids.indexOf(id); if (j >= 0 && !old.claimed[j]) p.weekly.prog[i] = Math.min(p.weekly.goals[i], old.prog[j] || 0); });
    }
    // A day / week rolled while most modes were still locked repeats the mode-free template (pickTemplate's fallback),
    // e.g. "Pop 300 bots" three times, all filled by the same pops. Once another template is open, a repeat that is
    // not claimed or finished becomes that template (the first copy keeps its progress).
    for (const kind of ['daily', 'weekly']) {
      const o = p[kind], T = kind === 'daily' ? D.DAILY_TEMPLATES : D.WEEKLY_TEMPLATES;
      if (!o || !o.ids) continue;
      o.ids.forEach((id, i) => {
        if (o.ids.indexOf(id) === i || (o.claimed && o.claimed[i]) || (o.prog[i] || 0) >= o.goals[i]) return;
        if (!Object.keys(T).some(k => !o.ids.includes(k) && modeOK(T[k].mode))) return;
        pickTemplate(kind, i, G.rng(fnv(kind + ':' + (kind === 'daily' ? o.day : o.wk) + ':dup' + i)));
      });
    }
  }
  function periodicView(kind, i) {
    const p = P(), o = p[kind]; if (!o || !o.ids || o.ids[i] == null) return null;
    const T = kind === 'daily' ? D.DAILY_TEMPLATES : D.WEEKLY_TEMPLATES, tpl = T[o.ids[i]];
    if (!tpl) return null;
    const goal = o.goals[i], value = Math.min(goal, o.prog[i] || 0);
    const params = Object.assign({ n: goal }, o.params[i] || {});
    if (params.part) params.part = t('part.' + params.part + '.name');
    const R = D.REWARDS[kind];
    const rewards = kind === 'daily' ? { clinks: (o.rewards || [])[i] || R.clinks[0], xp: R.xp, stamps: R.stamps } : { xp: R.xp, lumite: R.lumite, stamps: R.stamps };
    const done = value >= goal;
    return { id: (kind === 'daily' ? 'd:' : 'w:') + i, kind, tpl: o.ids[i], titleKey: tpl.titleKey, descKey: tpl.descKey, title: t(tpl.titleKey, params), desc: t(tpl.descKey, params), params, value: Math.floor(value), goal, frac: goal ? value / goal : 0, done, claimed: !!o.claimed[i], status: o.claimed[i] ? 'claimed' : done ? 'complete' : 'active', rewards };
  }
  Qs.dailies = function () { ready(); rotate(); if (!Pr.isUnlocked('dailies')) return []; return [0, 1, 2].map(i => periodicView('daily', i)).filter(Boolean); };
  Qs.weeklies = function () { ready(); rotate(); if (!Pr.isUnlocked('weeklies')) return []; return [0, 1, 2, 3, 4].map(i => periodicView('weekly', i)).filter(Boolean); };
  Qs.dailyInfo = () => { const p = ready(); rotate(); return { day: p.daily.day, rerolls: p.daily.rerolls, crate: p.daily.crate, unlocked: Pr.isUnlocked('dailies') }; };
  Qs.weeklyInfo = () => { const p = ready(); rotate(); return { wk: p.weekly.wk, bonus: p.weekly.bonus, unlocked: Pr.isUnlocked('weeklies') }; };
  Qs.reroll = function (id) {
    const p = ready(); rotate();
    const i = typeof id === 'number' ? id : +String(id).replace('d:', '');
    if (!(i >= 0 && i < 3)) return fail('unknown');
    if (p.daily.rerolls <= 0) return fail('noRerolls');
    if (p.daily.claimed[i]) return fail('claimed');
    const old = p.daily.ids[i];
    p.daily.rerolls--; p.daily.rerollsUsed = (p.daily.rerollsUsed || 0) + 1;
    pickTemplate('daily', i, G.rng(fnv('daily:' + p.daily.day + ':r' + i + ':' + p.daily.rerollsUsed)), [old]);
    save();
    return { ok: true, id: 'd:' + i, tpl: p.daily.ids[i] };
  };
  Qs.claimable = function () {
    const p = P(); let n = p.quests.done.filter(id => !p.quests.claimed.includes(id)).length;
    for (const kind of ['daily', 'weekly']) { const o = p[kind]; if (o && o.ids && Pr.isUnlocked(kind === 'daily' ? 'dailies' : 'weeklies')) o.ids.forEach((x, i) => { const v = periodicView(kind, i); if (v && v.done && !v.claimed) n++; }); }
    return n;
  };
  // opts.silent: no "Rewards claimed!" toast (the Guild Hall plays its own stamp animation)
  Qs.claim = function (id, opts) {
    const p = ready();
    if (typeof id === 'string' && (id.startsWith('d:') || id.startsWith('w:'))) {
      const kind = id[0] === 'd' ? 'daily' : 'weekly', i = +id.slice(2), o = p[kind];
      const v = periodicView(kind, i);
      if (!v) return fail('unknown');
      if (v.claimed) return fail('claimed');
      if (!v.done) return fail('notDone');
      o.claimed[i] = true;
      const lines = Pr.grantRewards(v.rewards);
      if (kind === 'daily' && !o.crate && o.claimed.every(Boolean)) {
        o.crate = true;
        const rare = U.pick(D.PARTS_BY_RARITY.rare);
        lines.push(...Pr.grantRewards({ loot: [{ table: 'gold', rolls: 1 }], parts: { [rare]: 1 } }));
        toast(t('prog.dailyCrate'), { icon: D.icon('chest') });
      }
      if (kind === 'weekly' && !o.bonus && o.claimed.every(Boolean)) {
        o.bonus = true;
        lines.push(...Pr.grantRewards({ loot: [{ table: 'gold', rolls: 1 }], lumite: D.REWARDS.weekly.bonusLumite }));
        toast(t('prog.weeklyBonus'), { icon: D.icon('chest') });
      }
      sfx('questDone'); save(); Pr.lastGrant = lines;
      return { ok: true, id, lines };
    }
    const q = D.QUESTS[id];
    if (!q) return fail('unknown');
    if (p.quests.claimed.includes(id)) return fail('claimed');
    if (!p.quests.done.includes(id)) return fail('notDone');
    p.quests.claimed.push(id);
    p.quests.active = p.quests.active.filter(x => x !== id);
    const lines = Pr.grantRewards(Object.assign({ stamps: D.questStamps(q) }, q.rewards));
    sfx('questDone'); if (!(opts && opts.silent)) toast(t('prog.claimed'), { icon: D.icon('star') });
    refreshQuests(); stickerCheck(); save(); Pr.lastGrant = lines;
    return { ok: true, id, lines };
  };

  // ------------------------------------------------------------------ G.Stickers (40)
  const Stk = G.Stickers = {};
  function statValue(stat, p) {
    const rec = p.records, s = p.stats;
    switch (stat) {
      case 'bossKinds': return D.BOSS_IDS.filter(id => (rec.boss[id] || {}).kills > 0 || (rec.boss[id] || {}).clears > 0).length;
      case 'tuneFull': return Object.keys(p.weapons).some(id => p.weapons[id].own && p.weapons[id].tune.reduce((a, b) => a + b, 0) >= 9) ? 1 : 0;
      case 'maxWeapon': return maxWeaponLevel(p) >= 5 ? 1 : 0;
      case 'polish3': return Object.keys(p.gear).some(id => p.gear[id].own && p.gear[id].lvl >= 3) ? 1 : 0;
      case 'sprockets': return Pr.sprocketCount(p);
      case 'codexKinds': return D.ENEMY_IDS.filter(id => (p.codex[id] || 0) > 0).length;
      case 'trainPlat': return Object.keys(rec.medals.trials).some(k => rec.medals.trials[k] >= 4) ? 1 : 0;
      case 'days': return p.profile.daysPlayed || 0;
      case 'races': return rec.races.played || 0;
      case 'podiums': return rec.races.podiums || 0;
      case 'raceWins': return rec.races.wins || 0;
      case 'goldTracks': return D.TRACK_IDS.filter(k => (rec.medals.race[k] || 0) >= 3).length;
      case 'platTracks': return Object.keys(rec.medals.race).filter(k => rec.medals.race[k] >= 4).length;
      case 'turfWins': return rec.turf.wins || 0;
      case 'paintM2': return (s.paintCells || 0) * 0.25;
      case 'coverage60': return rec.turf.cov60 || 0;
      case 'royaleTop3': return rec.royale.top3 || 0;
      case 'royaleWins': return rec.royale.wins || 0;
      case 'royaleNoHeal': return rec.royale.noHeal || 0;
      case 'guardWins': return rec.defense.wins || 0;
    }
    return s[stat] || 0;
  }
  Stk.value = id => { const d = D.STICKERS.find(x => x.id === id); return d ? statValue(d.stat, P()) : 0; };
  Stk.has = id => P().stickers.includes(id);
  Stk.count = () => P().stickers.length;
  Stk.list = function () { const p = P(); return D.STICKERS.map(d => { const v = statValue(d.stat, p); return { id: d.id, def: d, cat: d.cat, nameKey: d.nameKey, descKey: d.descKey, name: t(d.nameKey), desc: t(d.descKey), value: Math.min(v, d.goal), goal: d.goal, frac: U.clamp(v / d.goal, 0, 1), earned: p.stickers.includes(d.id), reward: d.reward }; }); };
  Stk.earn = function (id) {
    const p = ready(), d = D.STICKERS.find(x => x.id === id);
    if (!d || p.stickers.includes(id)) return false;
    p.stickers.push(id);
    Pr.grantRewards(d.reward, { keep: true, src: 'sticker' });
    toast(t('prog.sticker', { name: t(d.nameKey) }), { icon: D.icon('star'), color: '#a66bff' });
    sfx('unlock');
    emit('sticker', id);
    save();
    return true;
  };
  function stickerCheck() {
    if (!inited) return [];
    const p = P(), got = [];
    for (const d of D.STICKERS) if (!p.stickers.includes(d.id) && statValue(d.stat, p) >= d.goal) { Stk.earn(d.id); got.push(d.id); }
    if (got.length) checkUnlocks();
    return got;
  }
  Stk.check = stickerCheck;

  // ------------------------------------------------------------------ bus events → stats, records, quests, stickers
  function onKill(target, info) {
    if (!isBot(target, info)) return;
    const p = P(), s = p.stats;
    s.pops++;
    const key = enemyKey(target), bk = bossKey(target);
    let xp = D.XP.sources['t' + U.clamp(D.enemyTier(key), 1, 3)] || 2;
    if (target.elite) { s.elites++; run.elites++; xp = D.XP.sources.elite; }
    if (target.isBoss || D.BOSSES[bk]) xp = D.XP.sources.boss;
    if (D.BOSSES[bk] && p.records.boss[bk]) p.records.boss[bk].kills++;
    if (key && (D.ENEMIES[key] || D.BOSSES[key])) { p.codex[key] = (p.codex[key] || 0) + 1; Pr.markSeen('enemy', key); }
    if (key === 'gnat' && (target.lasering || target.midAttack || target.aiming || target.telegraphing)) s.gnatLaser = (s.gnatLaser || 0) + 1;
    if (target.frozen && target.frozenCounted !== true) { /* freezes are counted from the 'freeze' event */ }
    Pr.addXP(xp);
    if (deriveXP() && info && byPlayer(info.src)) {
      const id = wid(info.weapon) || (info.src.weapon && info.src.weapon.def && info.src.weapon.def.id);
      autoXP(id, 5 * U.clamp(D.enemyTier(key), 1, 3) * (info.src.isPlayer ? 1 : 0.5));
    }
  }
  function onModeResult(r) {
    const p = P(), rec = p.records;
    p.stats.matches = (p.stats.matches || 0) + 1;
    // unlock pacing ("opens after N missions") counts finished matches: not practice, not a quit from the pause menu
    if (r.mode !== 'training' && !r.quit) p.stats.missions = (p.stats.missions || 0) + 1;
    const win = !!r.win;
    switch (r.mode) {
      case 'expedition': {
        if (r.mission) {
          const s = p.story[r.mission] || (p.story[r.mission] = { done: false, medal: null, best: null });
          if (win) { s.done = true; if (r.medal != null && D.gradeTier(r.medal) >= D.gradeTier(s.medal)) s.medal = r.medal; const tm = num(r, 'time'); if (tm > 0 && (s.best == null || tm < s.best)) s.best = tm; }
        }
        break;
      }
      case 'race': {
        const pl = num(r, 'place'), m = D.medalTier(r.medal), tr = r.track;
        rec.races.played++; if (pl >= 1 && pl <= 3) rec.races.podiums++; if (pl === 1) rec.races.wins++;
        if (tr) {
          rec.medals.race[tr] = Math.max(rec.medals.race[tr] || 0, m);
          const cls = r.speedClass || r.cls || 'breeze', tm = num(r, 'time');
          const e = (rec.race[tr] = rec.race[tr] || {})[cls] || (rec.race[tr][cls] = { best: null, lap: null, medal: 0 });
          e.medal = Math.max(e.medal || 0, m); if (tm > 0 && (e.best == null || tm < e.best)) e.best = tm;
          const lap = num(r, 'lap') || num(r, 'bestLap'); if (lap > 0 && (e.lap == null || lap < e.lap)) e.lap = lap;
        }
        break;
      }
      case 'turf': {
        rec.turf.played++; if (win) rec.turf.wins++;
        rec.turf.bestPaint = Math.max(rec.turf.bestPaint || 0, num(r, 'points'));
        if (win && coverage(r) >= 60) rec.turf.cov60 = (rec.turf.cov60 || 0) + 1;
        break;
      }
      case 'royale': {
        const pl = num(r, 'place') || (win ? 1 : 16);
        rec.royale.played++; rec.royale.best = Math.min(rec.royale.best || 16, pl);
        if (pl === 1) rec.royale.wins++;
        if (pl <= 3) rec.royale.top3 = (rec.royale.top3 || 0) + 1;
        const heals = typeof r.heals === 'number' ? r.heals : (r.stats && typeof r.stats.heals === 'number' ? r.stats.heals : run.heals);
        if (pl === 1 && heals === 0) rec.royale.noHeal = (rec.royale.noHeal || 0) + 1;
        break;
      }
      case 'defense': {
        const w = num(r, 'waves');
        if (r.endless) rec.wave.endlessBest = Math.max(rec.wave.endlessBest || 0, w); else rec.wave.best = Math.max(rec.wave.best || 0, w);
        if (win) rec.defense.wins = (rec.defense.wins || 0) + 1;
        break;
      }
      case 'training': {
        const key = trialKey(r), m = D.medalTier(r.medal);
        if (key) {
          rec.medals.trials[key] = Math.max(rec.medals.trials[key] || 0, m);
          const e = rec.trials[key] || (rec.trials[key] = { best: null, medal: 0 });
          e.medal = Math.max(e.medal || 0, m); const tm = num(r, 'time'); if (tm > 0 && (e.best == null || tm < e.best)) e.best = tm;
        }
        const sc = num(r, 'score'); if (key === 'popup' && sc > (rec.popup || 0)) rec.popup = sc;
        break;
      }
      case 'boss': {
        const id = resultBoss(r), b = rec.boss[id];
        if (b && win) {
          b.clears = (b.clears || 0) + 1;
          const tm = num(r, 'time'); if (tm > 0 && (b.best == null || tm < b.best)) b.best = tm;
          const par = (D.BOSSES[id] || {}).par;
          if (par && tm > 0) b.medal = Math.max(b.medal || 0, tm <= par ? 3 : tm <= par * 1.15 ? 2 : tm <= par * 1.3 ? 1 : 0);
        }
        break;
      }
    }
  }
  // Central handler: stats/records first, then quests, stickers, unlocks.
  function handle(ev, a, b, c) {
    if (!inited) return;
    const p = P();
    switch (ev) {
      case 'kill': onKill(a, b); break;
      case 'pickup':
        if (a === 'sprocket' || (b && (b.sprocket != null || b.kind === 'sprocket' || b.partId === 'sprocket'))) {
          const idx = b ? (typeof b.index === 'number' ? b.index : typeof b.sprocket === 'number' ? b.sprocket : null) : null;
          if (idx != null) Pr.addSprocket(idx);   // only explicit slots (modes may also call addSprocket directly)
        }
        if (a === 'health' || a === 'shield') run.heals++;
        break;
      case 'crate-break': p.stats.crates++; break;
      case 'paint': if (isPlayerPaint(a, c)) {
        p.stats.paintCells = (p.stats.paintCells || 0) + Math.max(0, b || 0);
        if (deriveXP()) { const pl = G.Game && G.Game.world && G.Game.world.player, w = pl && pl.weapon; autoXP(w && w.def && w.def.id, Math.max(0, b || 0) / 20); }
      } break;
      case 'craft': p.stats.crafts++; break;
      case 'player-ko': p.stats.kos++; run.kos++; break;
      case 'heal': run.heals++; break;
      case 'freeze': p.stats.freezes = (p.stats.freezes || 0) + 1; break;
      case 'dance': p.stats.dances = (p.stats.dances || 0) + 1; break;
      case 'plate-break': plateEvents = true; p.stats.plates = (p.stats.plates || 0) + 1; break;
      case 'visit': if (a && !p.quests.visited.includes(a)) p.quests.visited.push(a); break;  // (normalised in dispatch)
      case 'mode-start': run.mode = a; run.elites = 0; run.kos = 0; run.heals = 0; break;
      case 'mode-result': if (a && a.mode) onModeResult(a); break;
    }
    questEvent(ev, a, b, c);
    if (ev === 'mode-result') { run.elites = 0; run.kos = 0; run.heals = 0; }
    refreshQuests();
    if (ev !== 'damage') stickerCheck();
    if (ev === 'mode-result' || ev === 'rank-up' || ev === 'craft') checkUnlocks();
    if (ev === 'rank-up') rotate();
    save();
  }
  const EVENTS = ['kill', 'pickup', 'craft', 'purchase', 'mode-start', 'mode-result', 'crate-break', 'paint', 'weapon-levelup', 'rank-up', 'player-ko', 'visit', 'plate-break', 'freeze', 'dance', 'objective', 'heal'];
  // Normalise object payloads ({id}, {target, info}, {type, data}) to the bus argument shapes.
  function dispatch(ev, a, b, c) {
    if (a && typeof a === 'object' && b === undefined) {
      if (ev === 'visit' || ev === 'objective' || ev === 'craft') a = a.id || a.building || a.mission || null;
      else if (ev === 'kill' && a.target) { b = a.info || {}; a = a.target; }
      else if (ev === 'pickup' && a.type && !a.enemyId) { b = a.data || a; a = a.type; }
      else if (ev === 'paint' && a.cells != null) { c = a.src; b = a.cells; a = a.team; }
    }
    handle(ev, a, b, c);
  }
  for (const ev of EVENTS) G.bus.on(ev, (a, b, c) => dispatch(ev, a, b, c));
  // Weapon XP from damage: floor(damage / 10) (+ 5 × tier per pop in onKill). Summons count 50%.
  G.bus.on('damage', (target, res, info) => {
    if (!inited || !deriveXP() || !info || !res || !(res.dealt > 0) || !byPlayer(info.src) || (target && target.isPlayer)) return;
    const id = wid(info.weapon) || (info.src.weapon && info.src.weapon.def && info.src.weapon.def.id);
    autoXP(id, res.dealt / 10 * (info.src.isPlayer ? 1 : 0.5));
  });
  // Visiting a building panel counts for q01 (screen ids that match building ids).
  G.bus.on('ui-open', id => { if (inited && D.BUILDINGS.includes(id)) Pr.visit(id); if (inited && id === 'boss-select' && Pr.isUnlocked('boss')) Pr.ackUnlocks('boss'); });
  // Walking into a newly opened place counts as its announcement (no "New in Fizzport!" for it later).
  G.bus.on('hub-visit', id => { if (inited && ANN.some(a => a.id === id) && Pr.isUnlocked(ANN.find(a => a.id === id).rule)) Pr.ackUnlocks(id); });

  // ------------------------------------------------------------------ init
  function init(silent) {
    if (!G.Save || !G.Save.data) return;
    inited = true;
    const p = ensure(P());
    const d = today();
    if (p.profile.lastDay !== d) { p.profile.lastDay = d; p.profile.daysPlayed = (p.profile.daysPlayed || 0) + 1; }
    rotate();
    quiet++;
    try { migrateUnlocks(p); checkUnlocks(); refreshQuests(); stickerCheck(); } finally { quiet--; }
    if (!silent) save();
  }
  Pr.init = () => init(false);
  G.bus.on('boot', () => init(false));
  G.bus.on('save-reset', () => { inited = false; for (const k in xpAcc) delete xpAcc[k]; plateEvents = false; pinNotified = false; init(false); });
})(window.G);

}).call(window); } catch (e) { console.error('[module 14_progress.js]', e); }
})();
