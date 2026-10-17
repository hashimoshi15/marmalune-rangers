/* Marmalune Rangers — lang-more: 91_lang_delta.js 92_lang_combat.js 92_lang_pve.js 92_lang_race.js 92_lang_town.js 93_lang_access.js 93_lang_audio.js 93_lang_chars.js 93_lang_combat.js 93_lang_feel.js 93_lang_fixactors.js 93_lang_fixmodes.js 93_lang_fixui.js 93_lang_fixworld.js 93_lang_loop.js 93_lang_modes.js 93_lang_onboard.js 93_lang_pages.js 93_lang_polish.js 93_lang_race.js 93_lang_render.js 93_lang_ultra.js 93_lang_world.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 91_lang_delta.js
try { (function () {
// Strings added after the main translation snapshot (results stat labels, control preset row).
(function (G) {
  const T = {
    'zh-Hans': { 'res.s.accuracy': '命中率', 'res.s.bonks': '被咚次数', 'res.s.crates': '箱子', 'res.s.damage': '伤害', 'res.s.paint': '涂色面积', 'res.s.place': '名次', 'res.s.pops': '砰掉机器人', 'res.s.score': '得分', 'res.s.time': '时间', 'res.s.waves': '波数', 'set.preset': '操作类型', 'set.presetBtn': '选择' },
    'zh-Hant': { 'res.s.accuracy': '命中率', 'res.s.bonks': '被咚次數', 'res.s.crates': '箱子', 'res.s.damage': '傷害', 'res.s.paint': '塗色面積', 'res.s.place': '名次', 'res.s.pops': '砰掉機器人', 'res.s.score': '得分', 'res.s.time': '時間', 'res.s.waves': '波數', 'set.preset': '操作類型', 'set.presetBtn': '選擇' },
    ko: { 'res.s.accuracy': '명중률', 'res.s.bonks': '당한 횟수', 'res.s.crates': '상자', 'res.s.damage': '대미지', 'res.s.paint': '칠한 영역', 'res.s.place': '순위', 'res.s.pops': '터뜨린 봇', 'res.s.score': '점수', 'res.s.time': '시간', 'res.s.waves': '웨이브', 'set.preset': '조작 방식', 'set.presetBtn': '선택' },
    es: { 'res.s.accuracy': 'Precisión', 'res.s.bonks': 'Coscorrones', 'res.s.crates': 'Cajas', 'res.s.damage': 'Daño', 'res.s.paint': 'Territorio pintado', 'res.s.place': 'Puesto', 'res.s.pops': 'Bots reventados', 'res.s.score': 'Puntos', 'res.s.time': 'Tiempo', 'res.s.waves': 'Oleadas', 'set.preset': 'Estilo de control', 'set.presetBtn': 'Elegir' },
    fr: { 'res.s.accuracy': 'Précision', 'res.s.bonks': 'K.O. subis', 'res.s.crates': 'Caisses', 'res.s.damage': 'Dégâts', 'res.s.paint': 'Terrain peint', 'res.s.place': 'Place', 'res.s.pops': 'Bots éclatés', 'res.s.score': 'Score', 'res.s.time': 'Temps', 'res.s.waves': 'Vagues', 'set.preset': 'Style de contrôle', 'set.presetBtn': 'Choisir' },
    de: { 'res.s.accuracy': 'Treffsicherheit', 'res.s.bonks': 'Kassierte Bonks', 'res.s.crates': 'Kisten', 'res.s.damage': 'Schaden', 'res.s.paint': 'Bemaltes Revier', 'res.s.place': 'Platz', 'res.s.pops': 'Geploppte Bots', 'res.s.score': 'Punkte', 'res.s.time': 'Zeit', 'res.s.waves': 'Wellen', 'set.preset': 'Steuerungsstil', 'set.presetBtn': 'Wählen' },
    'pt-BR': { 'res.s.accuracy': 'Precisão', 'res.s.bonks': 'Pancadas levadas', 'res.s.crates': 'Caixas', 'res.s.damage': 'Dano', 'res.s.paint': 'Área pintada', 'res.s.place': 'Posição', 'res.s.pops': 'Robôs estourados', 'res.s.score': 'Pontos', 'res.s.time': 'Tempo', 'res.s.waves': 'Ondas', 'set.preset': 'Estilo de controle', 'set.presetBtn': 'Escolher' },
    it: { 'res.s.accuracy': 'Precisione', 'res.s.bonks': 'Botte prese', 'res.s.crates': 'Casse', 'res.s.damage': 'Danni', 'res.s.paint': 'Zona dipinta', 'res.s.place': 'Posizione', 'res.s.pops': 'Bot scoppiati', 'res.s.score': 'Punteggio', 'res.s.time': 'Tempo', 'res.s.waves': 'Ondate', 'set.preset': 'Stile comandi', 'set.presetBtn': 'Scegli' },
    ru: { 'res.s.accuracy': 'Точность', 'res.s.bonks': 'Получено бонков', 'res.s.crates': 'Ящики', 'res.s.damage': 'Урон', 'res.s.paint': 'Закрашено', 'res.s.place': 'Место', 'res.s.pops': 'Лопнуто ботов', 'res.s.score': 'Очки', 'res.s.time': 'Время', 'res.s.waves': 'Волны', 'set.preset': 'Стиль управления', 'set.presetBtn': 'Выбрать' },
    id: { 'res.s.accuracy': 'Akurasi', 'res.s.bonks': 'Kena jitak', 'res.s.crates': 'Peti', 'res.s.damage': 'Damage', 'res.s.paint': 'Wilayah dicat', 'res.s.place': 'Peringkat', 'res.s.pops': 'Bot diletuskan', 'res.s.score': 'Skor', 'res.s.time': 'Waktu', 'res.s.waves': 'Gelombang', 'set.preset': 'Gaya kontrol', 'set.presetBtn': 'Pilih' },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 91_lang_delta.js]', e); }
// ---- 92_lang_combat.js
try { (function () {
// 92_lang_combat.js — core/combat strings added in the polish pass (en + ja live in 03_strings_core.js).
// Translations for the other 10 languages.
(function (G) {
  'use strict';
  const T = {
    'zh-Hans': {
      'ui.loadError': '哎呀！没能加载成功，先回小镇吧。', 'ui.modeMissing': '这个模式还没准备好。',
      'ui.glLost': '正在重新绘制世界…', 'ui.glLostSub': '设备暂停了3D画面。请稍等——画面恢复前游戏会暂停。',
      'ui.glStuck': '还是一片空白？请重新加载游戏，进度已经保存。', 'ui.reload': '重新加载',
    },
    'zh-Hant': {
      'ui.loadError': '哎呀！沒能載入成功，先回小鎮吧。', 'ui.modeMissing': '這個模式還沒準備好。',
      'ui.glLost': '正在重新繪製世界…', 'ui.glLostSub': '裝置暫停了3D畫面。請稍候——畫面恢復前遊戲會暫停。',
      'ui.glStuck': '還是一片空白？請重新載入遊戲，進度已經儲存。', 'ui.reload': '重新載入',
    },
    ko: {
      'ui.loadError': '앗! 불러오지 못했어요. 일단 마을로 돌아갈게요.', 'ui.modeMissing': '이 모드는 아직 준비 중이에요.',
      'ui.glLost': '세상을 다시 칠하는 중…', 'ui.glLostSub': '기기가 3D 화면을 잠시 멈췄어요. 돌아올 때까지 게임도 멈춰 있으니 조금만 기다려요.',
      'ui.glStuck': '아직도 화면이 비어 있나요? 게임을 새로고침하세요. 진행 상황은 저장되어 있어요.', 'ui.reload': '새로고침',
    },
    es: {
      'ui.loadError': '¡Uy! No se pudo cargar. Volvemos al pueblo por ahora.', 'ui.modeMissing': 'Este modo aún no está listo.',
      'ui.glLost': 'Repintando el mundo…', 'ui.glLostSub': 'Tu dispositivo pausó los gráficos 3D. Espera un momento: el juego está congelado hasta que vuelvan.',
      'ui.glStuck': '¿Sigue en blanco? Recarga el juego. Tu progreso está guardado.', 'ui.reload': 'Recargar',
    },
    fr: {
      'ui.loadError': 'Oups ! Le chargement a échoué. Retour en ville pour l’instant.', 'ui.modeMissing': 'Ce mode n’est pas encore prêt.',
      'ui.glLost': 'On repeint le monde…', 'ui.glLostSub': 'Ton appareil a mis les graphismes 3D en pause. Patiente un peu : le jeu reste figé jusqu’à leur retour.',
      'ui.glStuck': 'Toujours vide ? Recharge le jeu. Ta progression est sauvegardée.', 'ui.reload': 'Recharger',
    },
    de: {
      'ui.loadError': 'Hoppla! Das ließ sich nicht laden. Erst mal zurück in die Stadt.', 'ui.modeMissing': 'Dieser Modus ist noch nicht bereit.',
      'ui.glLost': 'Die Welt wird neu gemalt …', 'ui.glLostSub': 'Dein Gerät hat die 3D-Grafik pausiert. Einen Moment – das Spiel ist angehalten, bis sie zurück ist.',
      'ui.glStuck': 'Immer noch leer? Lade das Spiel neu. Dein Fortschritt ist gespeichert.', 'ui.reload': 'Neu laden',
    },
    'pt-BR': {
      'ui.loadError': 'Opa! Não deu para carregar. Voltando para a cidade por enquanto.', 'ui.modeMissing': 'Este modo ainda não está pronto.',
      'ui.glLost': 'Repintando o mundo…', 'ui.glLostSub': 'Seu aparelho pausou os gráficos 3D. Aguarde um pouco: o jogo fica parado até eles voltarem.',
      'ui.glStuck': 'Ainda em branco? Recarregue o jogo. Seu progresso está salvo.', 'ui.reload': 'Recarregar',
    },
    it: {
      'ui.loadError': 'Ops! Non è stato possibile caricare. Torniamo in città per ora.', 'ui.modeMissing': 'Questa modalità non è ancora pronta.',
      'ui.glLost': 'Ridipingiamo il mondo…', 'ui.glLostSub': 'Il dispositivo ha messo in pausa la grafica 3D. Aspetta un attimo: il gioco resta fermo finché non torna.',
      'ui.glStuck': 'Ancora tutto vuoto? Ricarica il gioco. I tuoi progressi sono salvati.', 'ui.reload': 'Ricarica',
    },
    ru: {
      'ui.loadError': 'Ой! Не получилось загрузить. Пока вернёмся в город.', 'ui.modeMissing': 'Этот режим ещё не готов.',
      'ui.glLost': 'Перекрашиваем мир…', 'ui.glLostSub': 'Устройство приостановило 3D-графику. Подожди немного — игра на паузе, пока она не вернётся.',
      'ui.glStuck': 'Всё ещё пусто? Перезагрузи игру. Прогресс сохранён.', 'ui.reload': 'Перезагрузить',
    },
    id: {
      'ui.loadError': 'Ups! Gagal dimuat. Kembali ke kota dulu, ya.', 'ui.modeMissing': 'Mode ini belum siap.',
      'ui.glLost': 'Mewarnai ulang dunia…', 'ui.glLostSub': 'Perangkatmu menjeda grafis 3D. Tunggu sebentar — game dihentikan sampai grafisnya kembali.',
      'ui.glStuck': 'Masih kosong? Muat ulang game. Progresmu sudah tersimpan.', 'ui.reload': 'Muat ulang',
    },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 92_lang_combat.js]', e); }
// ---- 92_lang_pve.js
try { (function () {
// PvE QA pass strings (Expedition / Boss Hunt / Fountain Guard / enemies) for the 10 non-en/ja languages.
// en + ja live next to the keys in 21_expedition.js / 17b_bosses.js.
(function (G) {
  'use strict';
  const T = {
    'zh-Hans': { 'exp.int.fixing': '修理中… {n}%', 'enemy.phaseTitle': '！' },
    'zh-Hant': { 'exp.int.fixing': '修理中… {n}%', 'enemy.phaseTitle': '！' },
    ko: { 'exp.int.fixing': '고치는 중… {n}%', 'enemy.phaseTitle': '!' },
    es: { 'exp.int.fixing': 'Arreglando… {n}%', 'enemy.phaseTitle': '!' },
    fr: { 'exp.int.fixing': 'Réparation… {n} %', 'enemy.phaseTitle': '!' },
    de: { 'exp.int.fixing': 'Repariere… {n}%', 'enemy.phaseTitle': '!' },
    'pt-BR': { 'exp.int.fixing': 'Consertando… {n}%', 'enemy.phaseTitle': '!' },
    it: { 'exp.int.fixing': 'Riparazione… {n}%', 'enemy.phaseTitle': '!' },
    ru: { 'exp.int.fixing': 'Чиним… {n}%', 'enemy.phaseTitle': '!' },
    id: { 'exp.int.fixing': 'Memperbaiki… {n}%', 'enemy.phaseTitle': '!' },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 92_lang_pve.js]', e); }
// ---- 92_lang_race.js
try { (function () {
// Star Skiff Rally QA pass strings for the 10 non-en/ja languages (en + ja live next to the keys in
// 23b_race_ui.js): the auto-steer note, and the short one-line "how it works" labels that the race-select
// strip uses on phones.
(function (G) {
  'use strict';
  const T = {
    'zh-Hans': { 'race.select.assistOn': '自动转向会沿安全路线飞，稍微慢一点。想拿金牌就自己转向吧！', 'race.how.s1': '转向 + 点 BOOST', 'race.how.s2': '弯道按 DRIFT → 金色火花', 'race.how.s3': '？箱子 = 道具' },
    'zh-Hant': { 'race.select.assistOn': '自動轉向會沿安全路線飛，稍微慢一點。想拿金牌就自己轉向吧！', 'race.how.s1': '轉向 + 點 BOOST', 'race.how.s2': '彎道按 DRIFT → 金色火花', 'race.how.s3': '？箱子 = 道具' },
    ko: { 'race.select.assistOn': '자동 조종은 안전한 길로 조금 느리게 날아요. 골드를 노린다면 직접 조종해요!', 'race.how.s1': '조종 + BOOST 탭', 'race.how.s2': '커브에서 DRIFT → 금색 불꽃', 'race.how.s3': '? 상자 = 아이템' },
    es: { 'race.select.assistOn': 'El autoguiado va por una trazada segura, algo más lenta. ¡Conduce tú para ir a por el Oro!', 'race.how.s1': 'Gira + toca BOOST', 'race.how.s2': 'DRIFT en curvas → chispas de oro', 'race.how.s3': 'Cajas ? = objetos' },
    fr: { 'race.select.assistOn': 'Le pilote auto suit une trajectoire sûre, un peu plus lente. Pilote toi-même pour viser l’Or !', 'race.how.s1': 'Dirige + touche BOOST', 'race.how.s2': 'DRIFT en virage → étincelles', 'race.how.s3': 'Boîtes ? = objets' },
    de: { 'race.select.assistOn': 'Die Lenkhilfe fliegt eine sichere, etwas langsamere Linie. Lenk selbst, um Gold zu holen!', 'race.how.s1': 'Lenken + BOOST tippen', 'race.how.s2': 'DRIFT in Kurven → Goldfunken', 'race.how.s3': '?-Boxen = Items' },
    'pt-BR': { 'race.select.assistOn': 'A direção auto segue uma linha segura, um pouco mais lenta. Pilote você mesmo para buscar o Ouro!', 'race.how.s1': 'Vire + toque BOOST', 'race.how.s2': 'DRIFT nas curvas → faíscas douradas', 'race.how.s3': 'Caixas ? = itens' },
    it: { 'race.select.assistOn': 'Lo sterzo auto segue una linea sicura, un po’ più lenta. Guida tu per puntare all’Oro!', 'race.how.s1': 'Sterza + tocca BOOST', 'race.how.s2': 'DRIFT in curva → scintille d’oro', 'race.how.s3': 'Scatole ? = oggetti' },
    ru: { 'race.select.assistOn': 'Авторуль ведёт по безопасной линии, чуть медленнее. Рули сам, чтобы взять золото!', 'race.how.s1': 'Руль + жми BOOST', 'race.how.s2': 'DRIFT в повороте → искры', 'race.how.s3': 'Коробки ? = предметы' },
    id: { 'race.select.assistOn': 'Setir otomatis terbang di jalur aman, sedikit lebih lambat. Setir sendiri untuk mengejar Emas!', 'race.how.s1': 'Setir + ketuk BOOST', 'race.how.s2': 'DRIFT di tikungan → percikan emas', 'race.how.s3': 'Kotak ? = item' },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 92_lang_race.js]', e); }
// ---- 92_lang_town.js
try { (function () {
// 92_lang_town.js — town/onboarding strings added in the polish pass (en + ja live in their modules:
// 20_hub.js, 14_progress.js, 30b_menus_town.js). Translations for the other 10 languages.
(function (G) {
  'use strict';
  const T = {
    'zh-Hans': {
      'res.next': '下一条',
      'hub.lock.m1': '{name}：完成下一次任务后开放！', 'hub.lock.m2': '{name}：再完成 2 次任务就开放！',
      'hub.beepo.shield': '吉兹玛现在能给我们做泡泡护盾啦！去工坊！',
      'hub.beepo.scrap': '泡泡护盾需要 4 块废铁板。砰砰商店的佩妮有卖哦！',
      'hub.beepo.turf': '竞技场大门开啦！来黏液地盘战把小镇涂满吧！',
      'hub.beepo.race': '王牌晃晃在机库等我们。星舟比赛时间到！',
      'hub.beepo.royale': '盖尔船长的飞艇准备好了！天降大乱斗，出发！',
      'sugg.scrap': '去砰砰商店买废铁板', 'menu.tryIt': '试用', 'menu.w.getParts': '买零件',
    },
    'zh-Hant': {
      'res.next': '下一條',
      'hub.lock.m1': '{name}：完成下一次任務後開放！', 'hub.lock.m2': '{name}：再完成 2 次任務就開放！',
      'hub.beepo.shield': '吉茲瑪現在能幫我們做泡泡護盾了！去工作坊！',
      'hub.beepo.scrap': '泡泡護盾需要 4 塊廢鐵板。砰砰商店的潘妮有賣喔！',
      'hub.beepo.turf': '競技場大門開了！來黏液地盤戰把小鎮塗滿吧！',
      'hub.beepo.race': '王牌搖搖在機庫等我們。星艇比賽時間到！',
      'hub.beepo.royale': '蓋爾船長的飛艇準備好了！天降大亂鬥，出發！',
      'sugg.scrap': '到砰砰商店買廢鐵板', 'menu.tryIt': '試用', 'menu.w.getParts': '買零件',
    },
    ko: {
      'res.next': '다음 코스',
      'hub.lock.m1': '{name}: 다음 임무를 마치면 열려요!', 'hub.lock.m2': '{name}: 임무를 2번 더 마치면 열려요!',
      'hub.beepo.shield': '기즈마가 이제 버블 실드를 만들어 줄 수 있대요! 공방으로 가요!',
      'hub.beepo.scrap': '버블 실드에는 고철 판 4장이 필요해요. 팡팡 상점의 페니가 팔아요!',
      'hub.beepo.turf': '아레나 게이트가 열렸어요! 구 영역전으로 마을을 칠해 봐요!',
      'hub.beepo.race': '격납고에서 에이스가 기다려요. 스키프 레이스 시간이에요!',
      'hub.beepo.royale': '게일 선장의 비행선이 준비됐어요! 스카이 드롭 로열로 출발!',
      'sugg.scrap': '팡팡 상점에서 고철 판 사기', 'menu.tryIt': '써 보기', 'menu.w.getParts': '부품 사기',
    },
    es: {
      'res.next': 'Siguiente',
      'hub.lock.m1': '{name}: ¡abre tras tu próxima misión!', 'hub.lock.m2': '{name}: ¡abre tras 2 misiones más!',
      'hub.beepo.shield': '¡Gizma ya puede fabricarnos un Escudo Burbuja! ¡Al Taller!',
      'hub.beepo.scrap': 'Un Escudo Burbuja necesita 4 Placas de Chatarra. ¡Penny las vende en la Tienda Pop!',
      'hub.beepo.turf': '¡La Puerta de la Arena está abierta! ¡Pintemos el pueblo en Territorio Gel!',
      'hub.beepo.race': 'Ace nos espera en el Hangar. ¡Hora del Rally Estelar!',
      'hub.beepo.royale': '¡El dirigible del Capitán Gale está listo! ¡Al Royale Celeste!',
      'sugg.scrap': 'Compra Placas de Chatarra en la Tienda Pop', 'menu.tryIt': 'Probar', 'menu.w.getParts': 'Comprar piezas',
    },
    fr: {
      'res.next': 'Suivant',
      'hub.lock.m1': '{name} : ouverture après ta prochaine mission !', 'hub.lock.m2': '{name} : ouverture dans 2 missions !',
      'hub.beepo.shield': 'Gizma peut nous fabriquer un Bouclier Bulle ! À l\'Atelier !',
      'hub.beepo.scrap': 'Un Bouclier Bulle demande 4 Plaques de ferraille. Penny en vend à la Boutique Pop !',
      'hub.beepo.turf': 'La Porte de l\'Arène est ouverte ! On repeint la ville en Guerre Slime !',
      'hub.beepo.race': 'Ace nous attend au Hangar. C\'est l\'heure du Rallye Stellaire !',
      'hub.beepo.royale': 'Le dirigeable du Capitaine Gale est prêt ! En route pour le Royale Céleste !',
      'sugg.scrap': 'Achète des Plaques de ferraille à la Boutique Pop', 'menu.tryIt': 'Essayer', 'menu.w.getParts': 'Acheter',
    },
    de: {
      'res.next': 'Nächste',
      'hub.lock.m1': '{name} öffnet nach deiner nächsten Mission!', 'hub.lock.m2': '{name} öffnet nach 2 weiteren Missionen!',
      'hub.beepo.shield': 'Gizma kann uns jetzt einen Blasenschild bauen! Ab in die Werkstatt!',
      'hub.beepo.scrap': 'Ein Blasenschild braucht 4 Schrottplatten. Penny verkauft sie im Plopp-Shop!',
      'hub.beepo.turf': 'Das Arena-Tor ist offen! Lass uns die Stadt im Glibber-Revier anmalen!',
      'hub.beepo.race': 'Ace wartet im Hangar. Zeit für die Sternenskiff-Rallye!',
      'hub.beepo.royale': 'Kapitän Gales Luftschiff ist startklar! Auf zum Wolkensprung-Royale!',
      'sugg.scrap': 'Hol Schrottplatten im Plopp-Shop', 'menu.tryIt': 'Testen', 'menu.w.getParts': 'Teile kaufen',
    },
    'pt-BR': {
      'res.next': 'Próxima',
      'hub.lock.m1': '{name}: abre depois da sua próxima missão!', 'hub.lock.m2': '{name}: abre depois de mais 2 missões!',
      'hub.beepo.shield': 'A Gizma já pode criar um Escudo Bolha pra gente! Para a Oficina!',
      'hub.beepo.scrap': 'Um Escudo Bolha precisa de 4 Placas de Sucata. A Penny vende na Loja Pop!',
      'hub.beepo.turf': 'O Portão da Arena abriu! Vamos pintar a cidade na Guerra de Gosma!',
      'hub.beepo.race': 'O Ace está esperando no Hangar. Hora do Rali Estelar!',
      'hub.beepo.royale': 'O dirigível do Capitão Gale está pronto! Partiu Royale Salto Celeste!',
      'sugg.scrap': 'Compre Placas de Sucata na Loja Pop', 'menu.tryIt': 'Testar', 'menu.w.getParts': 'Comprar peças',
    },
    it: {
      'res.next': 'Avanti',
      'hub.lock.m1': '{name}: apre dopo la tua prossima missione!', 'hub.lock.m2': '{name}: apre dopo altre 2 missioni!',
      'hub.beepo.shield': 'Gizma ora può costruirci uno Scudo Bolla! In Officina!',
      'hub.beepo.scrap': 'Uno Scudo Bolla richiede 4 Placche di Rottame. Penny le vende al Negozio Pop!',
      'hub.beepo.turf': 'La Porta dell\'Arena è aperta! Dipingiamo la città nella Zona Melma!',
      'hub.beepo.race': 'Ace ci aspetta all\'Hangar. È l\'ora del Rally Navette Stellari!',
      'hub.beepo.royale': 'Il dirigibile del Capitano Gale è pronto! Si parte per lo Sky Drop Royale!',
      'sugg.scrap': 'Compra Placche di Rottame al Negozio Pop', 'menu.tryIt': 'Prova', 'menu.w.getParts': 'Compra pezzi',
    },
    ru: {
      'res.next': 'Следующая',
      'hub.lock.m1': '{name}: откроется после следующей миссии!', 'hub.lock.m2': '{name}: откроется ещё через 2 миссии!',
      'hub.beepo.shield': 'Гизма уже может сделать нам пузырь-щит! В мастерскую!',
      'hub.beepo.scrap': 'Для пузырь-щита нужно 4 жестянки. Пенни продаёт их в Хлоп-лавке!',
      'hub.beepo.turf': 'Ворота арены открыты! Раскрасим город в Слайм-захвате!',
      'hub.beepo.race': 'Ас ждёт нас в ангаре. Время Звёздного ралли!',
      'hub.beepo.royale': 'Дирижабль капитана Шквала готов! Вперёд, в Небесный десант!',
      'sugg.scrap': 'Купи жестянки в Хлоп-лавке', 'menu.tryIt': 'Опробовать', 'menu.w.getParts': 'Купить детали',
    },
    id: {
      'res.next': 'Berikutnya',
      'hub.lock.m1': '{name} buka setelah misi berikutnya!', 'hub.lock.m2': '{name} buka setelah 2 misi lagi!',
      'hub.beepo.shield': 'Gizma sudah bisa membuatkan Perisai Gelembung! Ayo ke Bengkel!',
      'hub.beepo.scrap': 'Perisai Gelembung butuh 4 Pelat Rongsok. Penny menjualnya di Toko Pop!',
      'hub.beepo.turf': 'Gerbang Arena sudah buka! Ayo cat kota di Wilayah Slime!',
      'hub.beepo.race': 'Ace menunggu di Hanggar. Waktunya Reli Perahu Bintang!',
      'hub.beepo.royale': 'Kapal udara Kapten Gale sudah siap! Ayo ke Royale Terjun Langit!',
      'sugg.scrap': 'Beli Pelat Rongsok di Toko Pop', 'menu.tryIt': 'Coba', 'menu.w.getParts': 'Beli komponen',
    },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 92_lang_town.js]', e); }
// ---- 93_lang_access.js
try { (function () {
// Strings for the accessibility / settings / save work: text size, motion and flash comfort, crosshair
// options, sound captions, controller, save codes, save recovery, storage notice and build info
// (02_save.js, 06_input.js, 07b_screens_core.js, 08_hud.js). Every key in all 12 languages. Existing keys
// re-registered here on purpose: set.hudScale (now "touch button size") and set.motion (now the master switch).
(function (G) {
  const S = {
    en: {
      'set.textSize': 'Text & UI size', 'set.ts.s': 'S', 'set.ts.m': 'M', 'set.ts.l': 'L', 'set.ts.xl': 'XL',
      'set.hudScale': 'Touch button size',
      'set.motion': 'Reduce motion (turns all of these down)', 'set.sec.motion': 'Motion & flashes', 'set.sec.see': 'Seeing & hearing',
      'set.shake': 'Screen shake', 'set.flashes': 'Flashes', 'set.fl.on': 'Normal', 'set.fl.reduced': 'Softer',
      'set.speedLines': 'Speed lines (races)', 'set.sl.on': 'Normal', 'set.sl.reduced': 'Fewer', 'set.sl.off': 'Off',
      'set.camBob': 'Camera bob when walking', 'set.captions': 'Sound captions',
      'set.sec.xh': 'Crosshair', 'set.xhStyle': 'Crosshair style', 'set.xh.classic': 'Classic', 'set.xh.dot': 'Dot', 'set.xh.circle': 'Circle',
      'set.xhColor': 'Crosshair color', 'set.xc.white': 'White', 'set.xc.yellow': 'Yellow', 'set.xc.cyan': 'Sky blue', 'set.xc.pink': 'Pink', 'set.xc.green': 'Green',
      'set.xhSize': 'Crosshair size', 'set.xhOpacity': 'Crosshair opacity',
      'set.sec.pad': 'Controller', 'set.gpSens': 'Controller look speed',
      'set.padHint': 'Controller: Left stick move · Right stick look · A jump · B slide · X reload / use · Y swap · RT fire · LT / RB dash · LB gadget · D-pad weapons · Start pause',
      'set.sec.save': 'Save data', 'set.storage': 'Saving', 'sv.ok': 'Saved on this device', 'sv.off': 'Not saving in this browser',
      'sv.blocked': "Progress won't be kept this time",
      'set.saveCode': 'Save code', 'sv.export': 'Copy code', 'sv.import': 'Load code',
      'sv.exportTitle': 'Your save code', 'sv.exportHelp': 'Keep this code somewhere safe. Load it on another device to bring your progress along!',
      'sv.copy': 'Copy', 'sv.copied': 'Copied!', 'sv.copyFail': "Couldn't copy. Select the code and copy it yourself.",
      'sv.importTitle': 'Load a save code', 'sv.importHelp': 'Paste a save code below, then press Load.', 'sv.load': 'Load',
      'sv.importConfirm': 'Replace your progress with this save? (Rank {pr} · {clinks} Clinks)', 'sv.importDone': 'Save loaded!',
      'sv.bad.empty': 'Paste a code first.', 'sv.bad.code': "That doesn't look like a save code.", 'sv.bad.sum': 'This code is damaged. Some letters are missing or changed.',
      'set.build': 'Version',
      'sv.rec.title': 'Uh-oh, save trouble!', 'sv.rec.json': "Your save couldn't be read.", 'sv.rec.shape': "Your save couldn't be read.", 'sv.rec.sum': 'Your save looks damaged.', 'sv.rec.missing': 'Your save is missing.',
      'sv.rec.bak': 'Good news: there is a backup! Rank {pr} · {clinks} Clinks · {missions} missions', 'sv.rec.cur': 'Damaged save: Rank {pr} · {clinks} Clinks · {missions} missions',
      'sv.rec.noBak': "There's no backup, but a copy of the old save was kept. The game starts fresh.", 'sv.rec.hold': 'Nothing is saved until you choose.',
      'sv.restore': 'Restore backup', 'sv.keep': 'Keep using it', 'sv.fresh': 'Start fresh', 'sv.freshConfirm': 'Start a brand-new game? The backup will not be used.',
      'sv.restored': 'Backup restored!', 'sv.recRow': 'Save problem', 'sv.fix': 'Fix it',
      'pad.on': 'Controller connected!', 'pad.off': 'Controller disconnected',
    },
    ja: {
      'set.textSize': '文字とUIの大きさ', 'set.ts.s': '小', 'set.ts.m': '中', 'set.ts.l': '大', 'set.ts.xl': '特大',
      'set.hudScale': 'タッチボタンの大きさ',
      'set.motion': '動きをおさえる（下の項目をまとめて弱める）', 'set.sec.motion': '動きと光', 'set.sec.see': '見る・聞く',
      'set.shake': '画面のゆれ', 'set.flashes': 'ピカッと光る演出', 'set.fl.on': 'ふつう', 'set.fl.reduced': 'ひかえめ',
      'set.speedLines': 'スピード線（レース）', 'set.sl.on': 'ふつう', 'set.sl.reduced': 'すくなめ', 'set.sl.off': 'なし',
      'set.camBob': '歩くときのカメラのゆれ', 'set.captions': '音の字幕',
      'set.sec.xh': '照準', 'set.xhStyle': '照準の形', 'set.xh.classic': 'クラシック', 'set.xh.dot': 'ドット', 'set.xh.circle': 'サークル',
      'set.xhColor': '照準の色', 'set.xc.white': '白', 'set.xc.yellow': '黄色', 'set.xc.cyan': '水色', 'set.xc.pink': 'ピンク', 'set.xc.green': '緑',
      'set.xhSize': '照準の大きさ', 'set.xhOpacity': '照準のこさ',
      'set.sec.pad': 'コントローラー', 'set.gpSens': 'コントローラーの視点のはやさ',
      'set.padHint': 'コントローラー: 左スティック移動・右スティック視点・Aジャンプ・Bスライド・Xリロード/調べる・Y武器チェンジ・RT射撃・LT/RBブースト・LBガジェット・十字キー武器・Startポーズ',
      'set.sec.save': 'セーブデータ', 'set.storage': 'セーブ', 'sv.ok': 'この端末にセーブ中', 'sv.off': 'このブラウザではセーブできません',
      'sv.blocked': '今回のプレイはセーブされません',
      'set.saveCode': 'セーブコード', 'sv.export': 'コードをコピー', 'sv.import': 'コードを読みこむ',
      'sv.exportTitle': 'あなたのセーブコード', 'sv.exportHelp': 'このコードを大切にとっておいてね。ほかの端末で読みこむと、つづきから遊べるよ！',
      'sv.copy': 'コピー', 'sv.copied': 'コピーしたよ！', 'sv.copyFail': 'コピーできませんでした。コードを選んで自分でコピーしてね。',
      'sv.importTitle': 'セーブコードを読みこむ', 'sv.importHelp': '下にセーブコードをはりつけて「読みこむ」をおしてね。', 'sv.load': '読みこむ',
      'sv.importConfirm': 'いまの進行状況をこのセーブに置きかえますか？（ランク{pr}・{clinks}クリンク）', 'sv.importDone': 'セーブを読みこんだよ！',
      'sv.bad.empty': 'まずコードをはりつけてね。', 'sv.bad.code': 'セーブコードではないみたい。', 'sv.bad.sum': 'このコードはこわれています。文字が足りないか、変わっているよ。',
      'set.build': 'バージョン',
      'sv.rec.title': 'あれれ、セーブにトラブル！', 'sv.rec.json': 'セーブデータを読みこめませんでした。', 'sv.rec.shape': 'セーブデータを読みこめませんでした。', 'sv.rec.sum': 'セーブデータがこわれているみたい。', 'sv.rec.missing': 'セーブデータが見つかりません。',
      'sv.rec.bak': 'だいじょうぶ、バックアップがあるよ！ ランク{pr}・{clinks}クリンク・ミッション{missions}回', 'sv.rec.cur': 'こわれたセーブ: ランク{pr}・{clinks}クリンク・ミッション{missions}回',
      'sv.rec.noBak': 'バックアップはないけれど、元のセーブはコピーしてとってあるよ。ゲームは最初から始まります。', 'sv.rec.hold': 'えらぶまで、セーブはされないよ。',
      'sv.restore': 'バックアップからもどす', 'sv.keep': 'このまま使う', 'sv.fresh': '最初から始める', 'sv.freshConfirm': '新しくゲームを始めますか？ バックアップは使われません。',
      'sv.restored': 'バックアップからもどしたよ！', 'sv.recRow': 'セーブのトラブル', 'sv.fix': 'なおす',
      'pad.on': 'コントローラーをつないだよ！', 'pad.off': 'コントローラーがはずれたよ',
    },
    'zh-Hans': {
      'set.textSize': '文字和界面大小', 'set.ts.s': '小', 'set.ts.m': '中', 'set.ts.l': '大', 'set.ts.xl': '特大',
      'set.hudScale': '触屏按钮大小',
      'set.motion': '减少动态效果（下面几项一起调低）', 'set.sec.motion': '动态与闪光', 'set.sec.see': '视觉与听觉',
      'set.shake': '画面震动', 'set.flashes': '闪光效果', 'set.fl.on': '正常', 'set.fl.reduced': '柔和',
      'set.speedLines': '速度线（竞速）', 'set.sl.on': '正常', 'set.sl.reduced': '较少', 'set.sl.off': '关闭',
      'set.camBob': '走路时镜头晃动', 'set.captions': '声音字幕',
      'set.sec.xh': '准星', 'set.xhStyle': '准星样式', 'set.xh.classic': '经典', 'set.xh.dot': '圆点', 'set.xh.circle': '圆圈',
      'set.xhColor': '准星颜色', 'set.xc.white': '白色', 'set.xc.yellow': '黄色', 'set.xc.cyan': '天蓝', 'set.xc.pink': '粉色', 'set.xc.green': '绿色',
      'set.xhSize': '准星大小', 'set.xhOpacity': '准星不透明度',
      'set.sec.pad': '手柄', 'set.gpSens': '手柄视角速度',
      'set.padHint': '手柄：左摇杆移动 · 右摇杆视角 · A跳跃 · B滑铲 · X装弹/调查 · Y换武器 · RT射击 · LT/RB冲刺 · LB道具 · 十字键选武器 · Start暂停',
      'set.sec.save': '存档', 'set.storage': '保存', 'sv.ok': '已保存在这台设备上', 'sv.off': '这个浏览器无法保存',
      'sv.blocked': '这次的进度不会被保存',
      'set.saveCode': '存档码', 'sv.export': '复制存档码', 'sv.import': '读取存档码',
      'sv.exportTitle': '你的存档码', 'sv.exportHelp': '把这个码好好收着。在其他设备上读取它，就能接着玩啦！',
      'sv.copy': '复制', 'sv.copied': '复制好了！', 'sv.copyFail': '没能复制。请选中存档码自己复制。',
      'sv.importTitle': '读取存档码', 'sv.importHelp': '把存档码粘贴到下面，然后点「读取」。', 'sv.load': '读取',
      'sv.importConfirm': '要用这个存档替换现在的进度吗？（等级{pr}·{clinks}叮币）', 'sv.importDone': '存档读取好了！',
      'sv.bad.empty': '请先粘贴存档码。', 'sv.bad.code': '这好像不是存档码。', 'sv.bad.sum': '这个存档码坏了，有些字母少了或变了。',
      'set.build': '版本',
      'sv.rec.title': '哎呀，存档出问题了！', 'sv.rec.json': '存档读取不了。', 'sv.rec.shape': '存档读取不了。', 'sv.rec.sum': '存档好像坏了。', 'sv.rec.missing': '找不到存档。',
      'sv.rec.bak': '好消息：有备份！等级{pr}·{clinks}叮币·任务{missions}次', 'sv.rec.cur': '损坏的存档：等级{pr}·{clinks}叮币·任务{missions}次',
      'sv.rec.noBak': '没有备份，但旧存档已经复制保留了。游戏会从头开始。', 'sv.rec.hold': '在你选择之前，什么都不会保存。',
      'sv.restore': '从备份恢复', 'sv.keep': '继续使用它', 'sv.fresh': '从头开始', 'sv.freshConfirm': '要开始全新的游戏吗？备份将不会被使用。',
      'sv.restored': '已从备份恢复！', 'sv.recRow': '存档问题', 'sv.fix': '修复',
      'pad.on': '手柄已连接！', 'pad.off': '手柄已断开',
    },
    'zh-Hant': {
      'set.textSize': '文字和介面大小', 'set.ts.s': '小', 'set.ts.m': '中', 'set.ts.l': '大', 'set.ts.xl': '特大',
      'set.hudScale': '觸控按鈕大小',
      'set.motion': '減少動態效果（下面幾項一起調低）', 'set.sec.motion': '動態與閃光', 'set.sec.see': '視覺與聽覺',
      'set.shake': '畫面震動', 'set.flashes': '閃光效果', 'set.fl.on': '正常', 'set.fl.reduced': '柔和',
      'set.speedLines': '速度線（競速）', 'set.sl.on': '正常', 'set.sl.reduced': '較少', 'set.sl.off': '關閉',
      'set.camBob': '走路時鏡頭晃動', 'set.captions': '聲音字幕',
      'set.sec.xh': '準星', 'set.xhStyle': '準星樣式', 'set.xh.classic': '經典', 'set.xh.dot': '圓點', 'set.xh.circle': '圓圈',
      'set.xhColor': '準星顏色', 'set.xc.white': '白色', 'set.xc.yellow': '黃色', 'set.xc.cyan': '天藍', 'set.xc.pink': '粉紅', 'set.xc.green': '綠色',
      'set.xhSize': '準星大小', 'set.xhOpacity': '準星不透明度',
      'set.sec.pad': '手把', 'set.gpSens': '手把視角速度',
      'set.padHint': '手把：左搖桿移動 · 右搖桿視角 · A跳躍 · B滑鏟 · X裝彈/調查 · Y換武器 · RT射擊 · LT/RB衝刺 · LB道具 · 十字鍵選武器 · Start暫停',
      'set.sec.save': '存檔', 'set.storage': '儲存', 'sv.ok': '已儲存在這台裝置上', 'sv.off': '這個瀏覽器無法儲存',
      'sv.blocked': '這次的進度不會被儲存',
      'set.saveCode': '存檔碼', 'sv.export': '複製存檔碼', 'sv.import': '讀取存檔碼',
      'sv.exportTitle': '你的存檔碼', 'sv.exportHelp': '把這個碼好好收著。在其他裝置上讀取它，就能接著玩囉！',
      'sv.copy': '複製', 'sv.copied': '複製好了！', 'sv.copyFail': '沒能複製。請選取存檔碼自己複製。',
      'sv.importTitle': '讀取存檔碼', 'sv.importHelp': '把存檔碼貼到下面，然後按「讀取」。', 'sv.load': '讀取',
      'sv.importConfirm': '要用這個存檔取代現在的進度嗎？（等級{pr}·{clinks}叮幣）', 'sv.importDone': '存檔讀取好了！',
      'sv.bad.empty': '請先貼上存檔碼。', 'sv.bad.code': '這好像不是存檔碼。', 'sv.bad.sum': '這個存檔碼壞了，有些字母少了或變了。',
      'set.build': '版本',
      'sv.rec.title': '哎呀，存檔出問題了！', 'sv.rec.json': '存檔讀取不了。', 'sv.rec.shape': '存檔讀取不了。', 'sv.rec.sum': '存檔好像壞了。', 'sv.rec.missing': '找不到存檔。',
      'sv.rec.bak': '好消息：有備份！等級{pr}·{clinks}叮幣·任務{missions}次', 'sv.rec.cur': '損壞的存檔：等級{pr}·{clinks}叮幣·任務{missions}次',
      'sv.rec.noBak': '沒有備份，但舊存檔已經複製保留了。遊戲會從頭開始。', 'sv.rec.hold': '在你選擇之前，什麼都不會儲存。',
      'sv.restore': '從備份還原', 'sv.keep': '繼續使用它', 'sv.fresh': '從頭開始', 'sv.freshConfirm': '要開始全新的遊戲嗎？備份將不會被使用。',
      'sv.restored': '已從備份還原！', 'sv.recRow': '存檔問題', 'sv.fix': '修復',
      'pad.on': '手把已連接！', 'pad.off': '手把已中斷連接',
    },
    ko: {
      'set.textSize': '글자 및 UI 크기', 'set.ts.s': '작게', 'set.ts.m': '보통', 'set.ts.l': '크게', 'set.ts.xl': '아주 크게',
      'set.hudScale': '터치 버튼 크기',
      'set.motion': '움직임 줄이기 (아래 항목을 모두 줄여요)', 'set.sec.motion': '움직임과 번쩍임', 'set.sec.see': '보기와 듣기',
      'set.shake': '화면 흔들림', 'set.flashes': '번쩍이는 효과', 'set.fl.on': '보통', 'set.fl.reduced': '부드럽게',
      'set.speedLines': '속도선 (레이스)', 'set.sl.on': '보통', 'set.sl.reduced': '적게', 'set.sl.off': '끄기',
      'set.camBob': '걸을 때 카메라 흔들림', 'set.captions': '소리 자막',
      'set.sec.xh': '조준점', 'set.xhStyle': '조준점 모양', 'set.xh.classic': '클래식', 'set.xh.dot': '점', 'set.xh.circle': '원',
      'set.xhColor': '조준점 색', 'set.xc.white': '흰색', 'set.xc.yellow': '노란색', 'set.xc.cyan': '하늘색', 'set.xc.pink': '분홍색', 'set.xc.green': '초록색',
      'set.xhSize': '조준점 크기', 'set.xhOpacity': '조준점 진하기',
      'set.sec.pad': '컨트롤러', 'set.gpSens': '컨트롤러 시점 속도',
      'set.padHint': '컨트롤러: 왼쪽 스틱 이동 · 오른쪽 스틱 시점 · A 점프 · B 슬라이드 · X 재장전/조사 · Y 무기 교체 · RT 발사 · LT/RB 대시 · LB 가젯 · 방향키 무기 · Start 일시정지',
      'set.sec.save': '저장 데이터', 'set.storage': '저장', 'sv.ok': '이 기기에 저장 중', 'sv.off': '이 브라우저에서는 저장되지 않아요',
      'sv.blocked': '이번 진행 상황은 저장되지 않아요',
      'set.saveCode': '저장 코드', 'sv.export': '코드 복사', 'sv.import': '코드 불러오기',
      'sv.exportTitle': '나의 저장 코드', 'sv.exportHelp': '이 코드를 잘 보관하세요. 다른 기기에서 불러오면 이어서 할 수 있어요!',
      'sv.copy': '복사', 'sv.copied': '복사했어요!', 'sv.copyFail': '복사하지 못했어요. 코드를 선택해서 직접 복사해 주세요.',
      'sv.importTitle': '저장 코드 불러오기', 'sv.importHelp': '아래에 저장 코드를 붙여 넣고 불러오기를 누르세요.', 'sv.load': '불러오기',
      'sv.importConfirm': '지금 진행 상황을 이 저장으로 바꿀까요? (랭크 {pr} · {clinks} 클링크)', 'sv.importDone': '저장을 불러왔어요!',
      'sv.bad.empty': '먼저 코드를 붙여 넣어 주세요.', 'sv.bad.code': '저장 코드가 아닌 것 같아요.', 'sv.bad.sum': '이 코드는 망가졌어요. 글자가 빠졌거나 바뀌었어요.',
      'set.build': '버전',
      'sv.rec.title': '앗, 저장에 문제가 생겼어요!', 'sv.rec.json': '저장 데이터를 읽을 수 없어요.', 'sv.rec.shape': '저장 데이터를 읽을 수 없어요.', 'sv.rec.sum': '저장 데이터가 망가진 것 같아요.', 'sv.rec.missing': '저장 데이터가 없어요.',
      'sv.rec.bak': '다행이에요, 백업이 있어요! 랭크 {pr} · {clinks} 클링크 · 미션 {missions}회', 'sv.rec.cur': '망가진 저장: 랭크 {pr} · {clinks} 클링크 · 미션 {missions}회',
      'sv.rec.noBak': '백업은 없지만 예전 저장은 복사해 두었어요. 게임은 처음부터 시작해요.', 'sv.rec.hold': '고를 때까지 아무것도 저장되지 않아요.',
      'sv.restore': '백업으로 되돌리기', 'sv.keep': '그대로 쓰기', 'sv.fresh': '처음부터 하기', 'sv.freshConfirm': '새 게임을 시작할까요? 백업은 사용되지 않아요.',
      'sv.restored': '백업으로 되돌렸어요!', 'sv.recRow': '저장 문제', 'sv.fix': '고치기',
      'pad.on': '컨트롤러가 연결됐어요!', 'pad.off': '컨트롤러 연결이 끊겼어요',
    },
    es: {
      'set.textSize': 'Tamaño de texto e interfaz', 'set.ts.s': 'S', 'set.ts.m': 'M', 'set.ts.l': 'L', 'set.ts.xl': 'XL',
      'set.hudScale': 'Tamaño de los botones táctiles',
      'set.motion': 'Reducir movimiento (baja todo lo de abajo)', 'set.sec.motion': 'Movimiento y destellos', 'set.sec.see': 'Ver y oír',
      'set.shake': 'Temblor de pantalla', 'set.flashes': 'Destellos', 'set.fl.on': 'Normal', 'set.fl.reduced': 'Más suaves',
      'set.speedLines': 'Líneas de velocidad (carreras)', 'set.sl.on': 'Normal', 'set.sl.reduced': 'Menos', 'set.sl.off': 'No',
      'set.camBob': 'Balanceo de cámara al caminar', 'set.captions': 'Subtítulos de sonidos',
      'set.sec.xh': 'Mira', 'set.xhStyle': 'Estilo de mira', 'set.xh.classic': 'Clásica', 'set.xh.dot': 'Punto', 'set.xh.circle': 'Círculo',
      'set.xhColor': 'Color de la mira', 'set.xc.white': 'Blanco', 'set.xc.yellow': 'Amarillo', 'set.xc.cyan': 'Celeste', 'set.xc.pink': 'Rosa', 'set.xc.green': 'Verde',
      'set.xhSize': 'Tamaño de la mira', 'set.xhOpacity': 'Opacidad de la mira',
      'set.sec.pad': 'Mando', 'set.gpSens': 'Velocidad de vista con mando',
      'set.padHint': 'Mando: stick izq. moverse · stick der. mirar · A saltar · B deslizarse · X recargar / usar · Y cambiar arma · RT disparar · LT / RB impulso · LB aparato · cruceta armas · Start pausa',
      'set.sec.save': 'Datos guardados', 'set.storage': 'Guardado', 'sv.ok': 'Guardado en este dispositivo', 'sv.off': 'Este navegador no guarda',
      'sv.blocked': 'Esta vez tu progreso no se guardará',
      'set.saveCode': 'Código de partida', 'sv.export': 'Copiar código', 'sv.import': 'Cargar código',
      'sv.exportTitle': 'Tu código de partida', 'sv.exportHelp': 'Guarda este código en un lugar seguro. ¡Cárgalo en otro dispositivo para seguir jugando!',
      'sv.copy': 'Copiar', 'sv.copied': '¡Copiado!', 'sv.copyFail': 'No se pudo copiar. Selecciona el código y cópialo tú.',
      'sv.importTitle': 'Cargar un código', 'sv.importHelp': 'Pega un código abajo y pulsa Cargar.', 'sv.load': 'Cargar',
      'sv.importConfirm': '¿Cambiar tu progreso por esta partida? (Rango {pr} · {clinks} clinks)', 'sv.importDone': '¡Partida cargada!',
      'sv.bad.empty': 'Primero pega un código.', 'sv.bad.code': 'Eso no parece un código de partida.', 'sv.bad.sum': 'Este código está dañado. Faltan letras o han cambiado.',
      'set.build': 'Versión',
      'sv.rec.title': '¡Ups, problema con la partida!', 'sv.rec.json': 'No se pudo leer tu partida.', 'sv.rec.shape': 'No se pudo leer tu partida.', 'sv.rec.sum': 'Tu partida parece dañada.', 'sv.rec.missing': 'No se encuentra tu partida.',
      'sv.rec.bak': '¡Buenas noticias: hay una copia! Rango {pr} · {clinks} clinks · {missions} misiones', 'sv.rec.cur': 'Partida dañada: rango {pr} · {clinks} clinks · {missions} misiones',
      'sv.rec.noBak': 'No hay copia, pero se guardó una copia de la partida antigua. El juego empieza de nuevo.', 'sv.rec.hold': 'No se guarda nada hasta que elijas.',
      'sv.restore': 'Recuperar copia', 'sv.keep': 'Seguir con ella', 'sv.fresh': 'Empezar de nuevo', 'sv.freshConfirm': '¿Empezar una partida nueva? La copia no se usará.',
      'sv.restored': '¡Copia recuperada!', 'sv.recRow': 'Problema de guardado', 'sv.fix': 'Arreglar',
      'pad.on': '¡Mando conectado!', 'pad.off': 'Mando desconectado',
    },
    fr: {
      'set.textSize': 'Taille du texte et de l’interface', 'set.ts.s': 'S', 'set.ts.m': 'M', 'set.ts.l': 'L', 'set.ts.xl': 'XL',
      'set.hudScale': 'Taille des boutons tactiles',
      'set.motion': 'Réduire les mouvements (baisse tout ce qui suit)', 'set.sec.motion': 'Mouvements et flashs', 'set.sec.see': 'Voir et entendre',
      'set.shake': 'Tremblement de l’écran', 'set.flashes': 'Flashs', 'set.fl.on': 'Normal', 'set.fl.reduced': 'Plus doux',
      'set.speedLines': 'Lignes de vitesse (courses)', 'set.sl.on': 'Normal', 'set.sl.reduced': 'Moins', 'set.sl.off': 'Non',
      'set.camBob': 'Balancement de la caméra en marchant', 'set.captions': 'Sous-titres des sons',
      'set.sec.xh': 'Viseur', 'set.xhStyle': 'Style du viseur', 'set.xh.classic': 'Classique', 'set.xh.dot': 'Point', 'set.xh.circle': 'Cercle',
      'set.xhColor': 'Couleur du viseur', 'set.xc.white': 'Blanc', 'set.xc.yellow': 'Jaune', 'set.xc.cyan': 'Bleu ciel', 'set.xc.pink': 'Rose', 'set.xc.green': 'Vert',
      'set.xhSize': 'Taille du viseur', 'set.xhOpacity': 'Opacité du viseur',
      'set.sec.pad': 'Manette', 'set.gpSens': 'Vitesse de visée à la manette',
      'set.padHint': 'Manette : stick gauche bouger · stick droit viser · A sauter · B glisser · X recharger / utiliser · Y changer d’arme · RT tirer · LT / RB élan · LB gadget · croix armes · Start pause',
      'set.sec.save': 'Sauvegarde', 'set.storage': 'Sauvegarde', 'sv.ok': 'Sauvegardé sur cet appareil', 'sv.off': 'Ce navigateur ne sauvegarde pas',
      'sv.blocked': 'Ta progression ne sera pas gardée cette fois',
      'set.saveCode': 'Code de sauvegarde', 'sv.export': 'Copier le code', 'sv.import': 'Charger un code',
      'sv.exportTitle': 'Ton code de sauvegarde', 'sv.exportHelp': 'Garde ce code bien au chaud. Charge-le sur un autre appareil pour continuer ta partie !',
      'sv.copy': 'Copier', 'sv.copied': 'Copié !', 'sv.copyFail': 'Impossible de copier. Sélectionne le code et copie-le toi-même.',
      'sv.importTitle': 'Charger un code', 'sv.importHelp': 'Colle un code ci-dessous, puis appuie sur Charger.', 'sv.load': 'Charger',
      'sv.importConfirm': 'Remplacer ta progression par cette sauvegarde ? (Rang {pr} · {clinks} clinks)', 'sv.importDone': 'Sauvegarde chargée !',
      'sv.bad.empty': 'Colle d’abord un code.', 'sv.bad.code': 'Ça ne ressemble pas à un code de sauvegarde.', 'sv.bad.sum': 'Ce code est abîmé. Des lettres manquent ou ont changé.',
      'set.build': 'Version',
      'sv.rec.title': 'Oups, souci de sauvegarde !', 'sv.rec.json': 'Ta sauvegarde n’a pas pu être lue.', 'sv.rec.shape': 'Ta sauvegarde n’a pas pu être lue.', 'sv.rec.sum': 'Ta sauvegarde semble abîmée.', 'sv.rec.missing': 'Ta sauvegarde a disparu.',
      'sv.rec.bak': 'Bonne nouvelle : il y a une copie ! Rang {pr} · {clinks} clinks · {missions} missions', 'sv.rec.cur': 'Sauvegarde abîmée : rang {pr} · {clinks} clinks · {missions} missions',
      'sv.rec.noBak': 'Il n’y a pas de copie, mais l’ancienne sauvegarde a été gardée de côté. Le jeu repart de zéro.', 'sv.rec.hold': 'Rien n’est sauvegardé tant que tu n’as pas choisi.',
      'sv.restore': 'Récupérer la copie', 'sv.keep': 'La garder', 'sv.fresh': 'Recommencer', 'sv.freshConfirm': 'Commencer une toute nouvelle partie ? La copie ne sera pas utilisée.',
      'sv.restored': 'Copie récupérée !', 'sv.recRow': 'Souci de sauvegarde', 'sv.fix': 'Réparer',
      'pad.on': 'Manette connectée !', 'pad.off': 'Manette déconnectée',
    },
    de: {
      'set.textSize': 'Text- und UI-Größe', 'set.ts.s': 'S', 'set.ts.m': 'M', 'set.ts.l': 'L', 'set.ts.xl': 'XL',
      'set.hudScale': 'Größe der Touch-Tasten',
      'set.motion': 'Bewegung reduzieren (dreht alles darunter herunter)', 'set.sec.motion': 'Bewegung & Blitze', 'set.sec.see': 'Sehen & Hören',
      'set.shake': 'Bildschirmwackeln', 'set.flashes': 'Blitze', 'set.fl.on': 'Normal', 'set.fl.reduced': 'Sanfter',
      'set.speedLines': 'Speed-Linien (Rennen)', 'set.sl.on': 'Normal', 'set.sl.reduced': 'Weniger', 'set.sl.off': 'Aus',
      'set.camBob': 'Kamerawippen beim Gehen', 'set.captions': 'Untertitel für Geräusche',
      'set.sec.xh': 'Fadenkreuz', 'set.xhStyle': 'Fadenkreuz-Stil', 'set.xh.classic': 'Klassisch', 'set.xh.dot': 'Punkt', 'set.xh.circle': 'Kreis',
      'set.xhColor': 'Fadenkreuz-Farbe', 'set.xc.white': 'Weiß', 'set.xc.yellow': 'Gelb', 'set.xc.cyan': 'Himmelblau', 'set.xc.pink': 'Pink', 'set.xc.green': 'Grün',
      'set.xhSize': 'Fadenkreuz-Größe', 'set.xhOpacity': 'Fadenkreuz-Deckkraft',
      'set.sec.pad': 'Controller', 'set.gpSens': 'Controller-Blickgeschwindigkeit',
      'set.padHint': 'Controller: linker Stick laufen · rechter Stick umsehen · A springen · B rutschen · X nachladen / benutzen · Y Waffe wechseln · RT feuern · LT / RB Sprint · LB Gadget · Steuerkreuz Waffen · Start Pause',
      'set.sec.save': 'Spielstand', 'set.storage': 'Speichern', 'sv.ok': 'Auf diesem Gerät gespeichert', 'sv.off': 'Dieser Browser speichert nicht',
      'sv.blocked': 'Dein Fortschritt wird diesmal nicht gespeichert',
      'set.saveCode': 'Spielstand-Code', 'sv.export': 'Code kopieren', 'sv.import': 'Code laden',
      'sv.exportTitle': 'Dein Spielstand-Code', 'sv.exportHelp': 'Heb diesen Code gut auf. Lade ihn auf einem anderen Gerät und spiel dort weiter!',
      'sv.copy': 'Kopieren', 'sv.copied': 'Kopiert!', 'sv.copyFail': 'Kopieren ging nicht. Markiere den Code und kopiere ihn selbst.',
      'sv.importTitle': 'Spielstand-Code laden', 'sv.importHelp': 'Füge unten einen Code ein und drücke dann Laden.', 'sv.load': 'Laden',
      'sv.importConfirm': 'Deinen Fortschritt durch diesen Spielstand ersetzen? (Rang {pr} · {clinks} Clinks)', 'sv.importDone': 'Spielstand geladen!',
      'sv.bad.empty': 'Füge zuerst einen Code ein.', 'sv.bad.code': 'Das sieht nicht wie ein Spielstand-Code aus.', 'sv.bad.sum': 'Dieser Code ist beschädigt. Buchstaben fehlen oder sind anders.',
      'set.build': 'Version',
      'sv.rec.title': 'Oje, Ärger mit dem Spielstand!', 'sv.rec.json': 'Dein Spielstand konnte nicht gelesen werden.', 'sv.rec.shape': 'Dein Spielstand konnte nicht gelesen werden.', 'sv.rec.sum': 'Dein Spielstand scheint beschädigt zu sein.', 'sv.rec.missing': 'Dein Spielstand fehlt.',
      'sv.rec.bak': 'Gute Nachricht: Es gibt eine Sicherung! Rang {pr} · {clinks} Clinks · {missions} Missionen', 'sv.rec.cur': 'Beschädigter Spielstand: Rang {pr} · {clinks} Clinks · {missions} Missionen',
      'sv.rec.noBak': 'Es gibt keine Sicherung, aber eine Kopie des alten Spielstands wurde aufgehoben. Das Spiel beginnt neu.', 'sv.rec.hold': 'Bis du wählst, wird nichts gespeichert.',
      'sv.restore': 'Sicherung laden', 'sv.keep': 'Weiter benutzen', 'sv.fresh': 'Neu anfangen', 'sv.freshConfirm': 'Ein ganz neues Spiel starten? Die Sicherung wird nicht benutzt.',
      'sv.restored': 'Sicherung geladen!', 'sv.recRow': 'Spielstand-Problem', 'sv.fix': 'Beheben',
      'pad.on': 'Controller verbunden!', 'pad.off': 'Controller getrennt',
    },
    'pt-BR': {
      'set.textSize': 'Tamanho do texto e da interface', 'set.ts.s': 'P', 'set.ts.m': 'M', 'set.ts.l': 'G', 'set.ts.xl': 'GG',
      'set.hudScale': 'Tamanho dos botões de toque',
      'set.motion': 'Reduzir movimento (diminui tudo abaixo)', 'set.sec.motion': 'Movimento e flashes', 'set.sec.see': 'Ver e ouvir',
      'set.shake': 'Tremor da tela', 'set.flashes': 'Flashes', 'set.fl.on': 'Normal', 'set.fl.reduced': 'Mais suaves',
      'set.speedLines': 'Linhas de velocidade (corridas)', 'set.sl.on': 'Normal', 'set.sl.reduced': 'Menos', 'set.sl.off': 'Não',
      'set.camBob': 'Balanço da câmera ao andar', 'set.captions': 'Legendas de sons',
      'set.sec.xh': 'Mira', 'set.xhStyle': 'Estilo da mira', 'set.xh.classic': 'Clássica', 'set.xh.dot': 'Ponto', 'set.xh.circle': 'Círculo',
      'set.xhColor': 'Cor da mira', 'set.xc.white': 'Branco', 'set.xc.yellow': 'Amarelo', 'set.xc.cyan': 'Azul-céu', 'set.xc.pink': 'Rosa', 'set.xc.green': 'Verde',
      'set.xhSize': 'Tamanho da mira', 'set.xhOpacity': 'Opacidade da mira',
      'set.sec.pad': 'Controle', 'set.gpSens': 'Velocidade da visão no controle',
      'set.padHint': 'Controle: analógico esq. andar · analógico dir. olhar · A pular · B deslizar · X recarregar / usar · Y trocar arma · RT atirar · LT / RB impulso · LB engenhoca · direcional armas · Start pausa',
      'set.sec.save': 'Dados salvos', 'set.storage': 'Salvamento', 'sv.ok': 'Salvo neste aparelho', 'sv.off': 'Este navegador não salva',
      'sv.blocked': 'Seu progresso não será salvo desta vez',
      'set.saveCode': 'Código do jogo salvo', 'sv.export': 'Copiar código', 'sv.import': 'Carregar código',
      'sv.exportTitle': 'Seu código do jogo salvo', 'sv.exportHelp': 'Guarde este código num lugar seguro. Carregue em outro aparelho para continuar jogando!',
      'sv.copy': 'Copiar', 'sv.copied': 'Copiado!', 'sv.copyFail': 'Não deu para copiar. Selecione o código e copie você mesmo.',
      'sv.importTitle': 'Carregar um código', 'sv.importHelp': 'Cole um código abaixo e toque em Carregar.', 'sv.load': 'Carregar',
      'sv.importConfirm': 'Trocar seu progresso por este jogo salvo? (Nível {pr} · {clinks} clinks)', 'sv.importDone': 'Jogo salvo carregado!',
      'sv.bad.empty': 'Cole um código primeiro.', 'sv.bad.code': 'Isso não parece um código de jogo salvo.', 'sv.bad.sum': 'Este código está estragado. Faltam letras ou elas mudaram.',
      'set.build': 'Versão',
      'sv.rec.title': 'Opa, problema no jogo salvo!', 'sv.rec.json': 'Não deu para ler seu jogo salvo.', 'sv.rec.shape': 'Não deu para ler seu jogo salvo.', 'sv.rec.sum': 'Seu jogo salvo parece estragado.', 'sv.rec.missing': 'Seu jogo salvo sumiu.',
      'sv.rec.bak': 'Boa notícia: existe uma cópia! Nível {pr} · {clinks} clinks · {missions} missões', 'sv.rec.cur': 'Jogo salvo estragado: nível {pr} · {clinks} clinks · {missions} missões',
      'sv.rec.noBak': 'Não há cópia, mas o jogo salvo antigo foi guardado. O jogo começa do zero.', 'sv.rec.hold': 'Nada é salvo até você escolher.',
      'sv.restore': 'Recuperar cópia', 'sv.keep': 'Continuar com ele', 'sv.fresh': 'Começar do zero', 'sv.freshConfirm': 'Começar um jogo novinho? A cópia não será usada.',
      'sv.restored': 'Cópia recuperada!', 'sv.recRow': 'Problema no salvamento', 'sv.fix': 'Consertar',
      'pad.on': 'Controle conectado!', 'pad.off': 'Controle desconectado',
    },
    it: {
      'set.textSize': 'Dimensione di testo e interfaccia', 'set.ts.s': 'S', 'set.ts.m': 'M', 'set.ts.l': 'L', 'set.ts.xl': 'XL',
      'set.hudScale': 'Dimensione dei pulsanti touch',
      'set.motion': 'Riduci movimento (abbassa tutto qui sotto)', 'set.sec.motion': 'Movimento e lampi', 'set.sec.see': 'Vedere e sentire',
      'set.shake': 'Tremolio dello schermo', 'set.flashes': 'Lampi', 'set.fl.on': 'Normali', 'set.fl.reduced': 'Più morbidi',
      'set.speedLines': 'Linee di velocità (corse)', 'set.sl.on': 'Normali', 'set.sl.reduced': 'Meno', 'set.sl.off': 'No',
      'set.camBob': 'Oscillazione della visuale camminando', 'set.captions': 'Sottotitoli dei suoni',
      'set.sec.xh': 'Mirino', 'set.xhStyle': 'Stile del mirino', 'set.xh.classic': 'Classico', 'set.xh.dot': 'Punto', 'set.xh.circle': 'Cerchio',
      'set.xhColor': 'Colore del mirino', 'set.xc.white': 'Bianco', 'set.xc.yellow': 'Giallo', 'set.xc.cyan': 'Azzurro', 'set.xc.pink': 'Rosa', 'set.xc.green': 'Verde',
      'set.xhSize': 'Dimensione del mirino', 'set.xhOpacity': 'Opacità del mirino',
      'set.sec.pad': 'Controller', 'set.gpSens': 'Velocità visuale col controller',
      'set.padHint': 'Controller: levetta sx muoversi · levetta dx guardare · A saltare · B scivolare · X ricaricare / usare · Y cambiare arma · RT sparare · LT / RB scatto · LB gadget · croce armi · Start pausa',
      'set.sec.save': 'Salvataggio', 'set.storage': 'Salvataggio', 'sv.ok': 'Salvato su questo dispositivo', 'sv.off': 'Questo browser non salva',
      'sv.blocked': 'Stavolta i progressi non verranno salvati',
      'set.saveCode': 'Codice di salvataggio', 'sv.export': 'Copia codice', 'sv.import': 'Carica codice',
      'sv.exportTitle': 'Il tuo codice di salvataggio', 'sv.exportHelp': 'Tieni questo codice al sicuro. Caricalo su un altro dispositivo per continuare a giocare!',
      'sv.copy': 'Copia', 'sv.copied': 'Copiato!', 'sv.copyFail': 'Non è stato possibile copiare. Seleziona il codice e copialo tu.',
      'sv.importTitle': 'Carica un codice', 'sv.importHelp': 'Incolla un codice qui sotto, poi premi Carica.', 'sv.load': 'Carica',
      'sv.importConfirm': 'Sostituire i tuoi progressi con questo salvataggio? (Grado {pr} · {clinks} clink)', 'sv.importDone': 'Salvataggio caricato!',
      'sv.bad.empty': 'Prima incolla un codice.', 'sv.bad.code': 'Non sembra un codice di salvataggio.', 'sv.bad.sum': 'Questo codice è rovinato. Mancano lettere o sono cambiate.',
      'set.build': 'Versione',
      'sv.rec.title': 'Ops, problema col salvataggio!', 'sv.rec.json': 'Non è stato possibile leggere il salvataggio.', 'sv.rec.shape': 'Non è stato possibile leggere il salvataggio.', 'sv.rec.sum': 'Il salvataggio sembra rovinato.', 'sv.rec.missing': 'Il salvataggio non c’è più.',
      'sv.rec.bak': 'Buone notizie: c’è una copia! Grado {pr} · {clinks} clink · {missions} missioni', 'sv.rec.cur': 'Salvataggio rovinato: grado {pr} · {clinks} clink · {missions} missioni',
      'sv.rec.noBak': 'Non c’è una copia, ma il vecchio salvataggio è stato messo da parte. Il gioco ricomincia da capo.', 'sv.rec.hold': 'Non viene salvato nulla finché non scegli.',
      'sv.restore': 'Recupera copia', 'sv.keep': 'Continua a usarlo', 'sv.fresh': 'Ricomincia', 'sv.freshConfirm': 'Iniziare una partita tutta nuova? La copia non verrà usata.',
      'sv.restored': 'Copia recuperata!', 'sv.recRow': 'Problema di salvataggio', 'sv.fix': 'Sistema',
      'pad.on': 'Controller collegato!', 'pad.off': 'Controller scollegato',
    },
    ru: {
      'set.textSize': 'Размер текста и интерфейса', 'set.ts.s': 'S', 'set.ts.m': 'M', 'set.ts.l': 'L', 'set.ts.xl': 'XL',
      'set.hudScale': 'Размер сенсорных кнопок',
      'set.motion': 'Меньше движения (снижает всё, что ниже)', 'set.sec.motion': 'Движение и вспышки', 'set.sec.see': 'Зрение и слух',
      'set.shake': 'Тряска экрана', 'set.flashes': 'Вспышки', 'set.fl.on': 'Обычные', 'set.fl.reduced': 'Мягче',
      'set.speedLines': 'Линии скорости (гонки)', 'set.sl.on': 'Обычные', 'set.sl.reduced': 'Меньше', 'set.sl.off': 'Нет',
      'set.camBob': 'Покачивание камеры при ходьбе', 'set.captions': 'Субтитры звуков',
      'set.sec.xh': 'Прицел', 'set.xhStyle': 'Вид прицела', 'set.xh.classic': 'Классика', 'set.xh.dot': 'Точка', 'set.xh.circle': 'Круг',
      'set.xhColor': 'Цвет прицела', 'set.xc.white': 'Белый', 'set.xc.yellow': 'Жёлтый', 'set.xc.cyan': 'Голубой', 'set.xc.pink': 'Розовый', 'set.xc.green': 'Зелёный',
      'set.xhSize': 'Размер прицела', 'set.xhOpacity': 'Яркость прицела',
      'set.sec.pad': 'Геймпад', 'set.gpSens': 'Скорость обзора на геймпаде',
      'set.padHint': 'Геймпад: левый стик — ходьба · правый стик — обзор · A прыжок · B подкат · X перезарядка / действие · Y смена оружия · RT огонь · LT / RB рывок · LB гаджет · крестовина — оружие · Start пауза',
      'set.sec.save': 'Сохранение', 'set.storage': 'Сохранение', 'sv.ok': 'Сохраняется на этом устройстве', 'sv.off': 'Этот браузер не сохраняет',
      'sv.blocked': 'В этот раз прогресс не сохранится',
      'set.saveCode': 'Код сохранения', 'sv.export': 'Копировать код', 'sv.import': 'Загрузить код',
      'sv.exportTitle': 'Твой код сохранения', 'sv.exportHelp': 'Сохрани этот код в надёжном месте. Загрузи его на другом устройстве и играй дальше!',
      'sv.copy': 'Копировать', 'sv.copied': 'Скопировано!', 'sv.copyFail': 'Не получилось скопировать. Выдели код и скопируй его сам.',
      'sv.importTitle': 'Загрузить код', 'sv.importHelp': 'Вставь код ниже и нажми «Загрузить».', 'sv.load': 'Загрузить',
      'sv.importConfirm': 'Заменить твой прогресс этим сохранением? (Ранг {pr} · {clinks} клинков)', 'sv.importDone': 'Сохранение загружено!',
      'sv.bad.empty': 'Сначала вставь код.', 'sv.bad.code': 'Это не похоже на код сохранения.', 'sv.bad.sum': 'Этот код повреждён: каких-то букв не хватает или они изменились.',
      'set.build': 'Версия',
      'sv.rec.title': 'Ой, беда с сохранением!', 'sv.rec.json': 'Не удалось прочитать сохранение.', 'sv.rec.shape': 'Не удалось прочитать сохранение.', 'sv.rec.sum': 'Похоже, сохранение повреждено.', 'sv.rec.missing': 'Сохранение пропало.',
      'sv.rec.bak': 'Хорошие новости: есть резервная копия! Ранг {pr} · {clinks} клинков · миссий: {missions}', 'sv.rec.cur': 'Повреждённое сохранение: ранг {pr} · {clinks} клинков · миссий: {missions}',
      'sv.rec.noBak': 'Резервной копии нет, но старое сохранение отложено. Игра начнётся заново.', 'sv.rec.hold': 'Пока ты не выберешь, ничего не сохраняется.',
      'sv.restore': 'Вернуть копию', 'sv.keep': 'Оставить как есть', 'sv.fresh': 'Начать заново', 'sv.freshConfirm': 'Начать совсем новую игру? Резервная копия не будет использована.',
      'sv.restored': 'Копия возвращена!', 'sv.recRow': 'Проблема с сохранением', 'sv.fix': 'Исправить',
      'pad.on': 'Геймпад подключён!', 'pad.off': 'Геймпад отключён',
    },
    id: {
      'set.textSize': 'Ukuran teks & tampilan', 'set.ts.s': 'S', 'set.ts.m': 'M', 'set.ts.l': 'L', 'set.ts.xl': 'XL',
      'set.hudScale': 'Ukuran tombol sentuh',
      'set.motion': 'Kurangi gerakan (menurunkan semua di bawah)', 'set.sec.motion': 'Gerakan & kilatan', 'set.sec.see': 'Melihat & mendengar',
      'set.shake': 'Guncangan layar', 'set.flashes': 'Kilatan', 'set.fl.on': 'Normal', 'set.fl.reduced': 'Lebih lembut',
      'set.speedLines': 'Garis kecepatan (balapan)', 'set.sl.on': 'Normal', 'set.sl.reduced': 'Sedikit', 'set.sl.off': 'Mati',
      'set.camBob': 'Kamera bergoyang saat berjalan', 'set.captions': 'Teks suara',
      'set.sec.xh': 'Bidikan', 'set.xhStyle': 'Gaya bidikan', 'set.xh.classic': 'Klasik', 'set.xh.dot': 'Titik', 'set.xh.circle': 'Lingkaran',
      'set.xhColor': 'Warna bidikan', 'set.xc.white': 'Putih', 'set.xc.yellow': 'Kuning', 'set.xc.cyan': 'Biru langit', 'set.xc.pink': 'Merah muda', 'set.xc.green': 'Hijau',
      'set.xhSize': 'Ukuran bidikan', 'set.xhOpacity': 'Kepekatan bidikan',
      'set.sec.pad': 'Kontroler', 'set.gpSens': 'Kecepatan pandang kontroler',
      'set.padHint': 'Kontroler: stik kiri bergerak · stik kanan melihat · A lompat · B meluncur · X isi ulang / pakai · Y ganti senjata · RT tembak · LT / RB dorongan · LB gawai · tombol arah senjata · Start jeda',
      'set.sec.save': 'Data simpanan', 'set.storage': 'Penyimpanan', 'sv.ok': 'Tersimpan di perangkat ini', 'sv.off': 'Browser ini tidak menyimpan',
      'sv.blocked': 'Progresmu tidak akan disimpan kali ini',
      'set.saveCode': 'Kode simpanan', 'sv.export': 'Salin kode', 'sv.import': 'Muat kode',
      'sv.exportTitle': 'Kode simpananmu', 'sv.exportHelp': 'Simpan kode ini baik-baik. Muat di perangkat lain untuk melanjutkan permainan!',
      'sv.copy': 'Salin', 'sv.copied': 'Tersalin!', 'sv.copyFail': 'Gagal menyalin. Pilih kodenya dan salin sendiri.',
      'sv.importTitle': 'Muat kode simpanan', 'sv.importHelp': 'Tempel kode simpanan di bawah, lalu tekan Muat.', 'sv.load': 'Muat',
      'sv.importConfirm': 'Ganti progresmu dengan simpanan ini? (Peringkat {pr} · {clinks} Clink)', 'sv.importDone': 'Simpanan dimuat!',
      'sv.bad.empty': 'Tempel kodenya dulu.', 'sv.bad.code': 'Sepertinya itu bukan kode simpanan.', 'sv.bad.sum': 'Kode ini rusak. Ada huruf yang hilang atau berubah.',
      'set.build': 'Versi',
      'sv.rec.title': 'Waduh, simpanan bermasalah!', 'sv.rec.json': 'Simpananmu tidak bisa dibaca.', 'sv.rec.shape': 'Simpananmu tidak bisa dibaca.', 'sv.rec.sum': 'Simpananmu sepertinya rusak.', 'sv.rec.missing': 'Simpananmu hilang.',
      'sv.rec.bak': 'Kabar baik: ada cadangan! Peringkat {pr} · {clinks} Clink · {missions} misi', 'sv.rec.cur': 'Simpanan rusak: peringkat {pr} · {clinks} Clink · {missions} misi',
      'sv.rec.noBak': 'Tidak ada cadangan, tapi salinan simpanan lama sudah disimpan. Permainan dimulai dari awal.', 'sv.rec.hold': 'Tidak ada yang disimpan sampai kamu memilih.',
      'sv.restore': 'Pulihkan cadangan', 'sv.keep': 'Tetap pakai', 'sv.fresh': 'Mulai dari awal', 'sv.freshConfirm': 'Mulai permainan baru? Cadangan tidak akan dipakai.',
      'sv.restored': 'Cadangan dipulihkan!', 'sv.recRow': 'Masalah simpanan', 'sv.fix': 'Perbaiki',
      'pad.on': 'Kontroler tersambung!', 'pad.off': 'Kontroler terputus',
    },
  };
  for (const code in S) G.i18n.add(code, S[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_access.js]', e); }
// ---- 93_lang_audio.js
try { (function () {
// Strings for the audio pass (09_audio.js): the Ambience / Menu sounds volume rows in Settings → Sound and the
// sound-caption texts that G.Audio.onCaption emits for threat and boss cues ({text} wrapped with a direction).
(function (G) {
  const S = {
    en: {
      'set.amb': 'Ambience', 'set.uiVol': 'Menu sounds',
      'cap.enemyAlert': 'Robot spotted you', 'cap.teleMelee': 'Robot winding up', 'cap.teleSnipe': 'Lock-on beeping',
      'cap.teleArtillery': 'Mortar launch', 'cap.teleCharge': 'Engine revving', 'cap.teleRing': 'Electric hum',
      'cap.teleSpin': 'Something spinning up', 'cap.teleBoss': 'Boss horn', 'cap.bossRoar': 'Boss roar',
      'cap.warn': 'Warning beeps', 'cap.zoneWarn': 'Zone alarm', 'cap.missile': 'Missile whoosh',
      'cap.dir.left': '[{text}, left]', 'cap.dir.right': '[{text}, right]', 'cap.dir.behind': '[{text}, behind]', 'cap.dir.center': '[{text}]',
    },
    ja: {
      'set.amb': 'まわりの音', 'set.uiVol': 'メニューの音',
      'cap.enemyAlert': 'ロボットに見つかった', 'cap.teleMelee': 'ロボットがパワーをためている', 'cap.teleSnipe': 'ロックオンの音',
      'cap.teleArtillery': 'たまを うちあげる音', 'cap.teleCharge': 'エンジンをふかす音', 'cap.teleRing': 'ビリビリ電気の音',
      'cap.teleSpin': 'なにかが回りはじめた', 'cap.teleBoss': 'ボスのホーン', 'cap.bossRoar': 'ボスのおたけび',
      'cap.warn': 'けいこくの音', 'cap.zoneWarn': 'ゾーンのアラーム', 'cap.missile': 'ミサイルの音',
      'cap.dir.left': '［{text}・左］', 'cap.dir.right': '［{text}・右］', 'cap.dir.behind': '［{text}・うしろ］', 'cap.dir.center': '［{text}］',
    },
    'zh-Hans': {
      'set.amb': '环境音', 'set.uiVol': '菜单音效',
      'cap.enemyAlert': '机器人发现你了', 'cap.teleMelee': '机器人在蓄力', 'cap.teleSnipe': '锁定提示音',
      'cap.teleArtillery': '炮弹发射', 'cap.teleCharge': '引擎轰鸣', 'cap.teleRing': '电流嗡嗡声',
      'cap.teleSpin': '有东西开始旋转', 'cap.teleBoss': '首领号角', 'cap.bossRoar': '首领咆哮',
      'cap.warn': '警报哔哔声', 'cap.zoneWarn': '区域警报', 'cap.missile': '导弹呼啸',
      'cap.dir.left': '[{text}，左边]', 'cap.dir.right': '[{text}，右边]', 'cap.dir.behind': '[{text}，后面]', 'cap.dir.center': '[{text}]',
    },
    'zh-Hant': {
      'set.amb': '環境音', 'set.uiVol': '選單音效',
      'cap.enemyAlert': '機器人發現你了', 'cap.teleMelee': '機器人在蓄力', 'cap.teleSnipe': '鎖定提示音',
      'cap.teleArtillery': '砲彈發射', 'cap.teleCharge': '引擎轟鳴', 'cap.teleRing': '電流嗡嗡聲',
      'cap.teleSpin': '有東西開始旋轉', 'cap.teleBoss': '頭目號角', 'cap.bossRoar': '頭目咆哮',
      'cap.warn': '警報嗶嗶聲', 'cap.zoneWarn': '區域警報', 'cap.missile': '飛彈呼嘯',
      'cap.dir.left': '[{text}，左邊]', 'cap.dir.right': '[{text}，右邊]', 'cap.dir.behind': '[{text}，後面]', 'cap.dir.center': '[{text}]',
    },
    ko: {
      'set.amb': '주변 소리', 'set.uiVol': '메뉴 소리',
      'cap.enemyAlert': '로봇이 나를 발견했어요', 'cap.teleMelee': '로봇이 힘을 모으는 중', 'cap.teleSnipe': '조준 경고음',
      'cap.teleArtillery': '포탄 발사 소리', 'cap.teleCharge': '엔진 소리 부릉부릉', 'cap.teleRing': '찌릿찌릿 전기 소리',
      'cap.teleSpin': '무언가 빙글빙글 돌기 시작', 'cap.teleBoss': '보스의 뿔나팔', 'cap.bossRoar': '보스의 외침',
      'cap.warn': '경고음', 'cap.zoneWarn': '구역 경보', 'cap.missile': '미사일 소리',
      'cap.dir.left': '[{text}, 왼쪽]', 'cap.dir.right': '[{text}, 오른쪽]', 'cap.dir.behind': '[{text}, 뒤쪽]', 'cap.dir.center': '[{text}]',
    },
    es: {
      'set.amb': 'Ambiente', 'set.uiVol': 'Sonidos del menú',
      'cap.enemyAlert': 'Un robot te ha visto', 'cap.teleMelee': 'Robot cargando un golpe', 'cap.teleSnipe': 'Pitidos de fijación',
      'cap.teleArtillery': 'Disparo de mortero', 'cap.teleCharge': 'Motor acelerando', 'cap.teleRing': 'Zumbido eléctrico',
      'cap.teleSpin': 'Algo empieza a girar', 'cap.teleBoss': 'Bocina del jefe', 'cap.bossRoar': 'Rugido del jefe',
      'cap.warn': 'Pitidos de alerta', 'cap.zoneWarn': 'Alarma de zona', 'cap.missile': 'Silbido de misil',
      'cap.dir.left': '[{text}, a la izquierda]', 'cap.dir.right': '[{text}, a la derecha]', 'cap.dir.behind': '[{text}, detrás]', 'cap.dir.center': '[{text}]',
    },
    fr: {
      'set.amb': 'Ambiance', 'set.uiVol': 'Sons du menu',
      'cap.enemyAlert': 'Un robot t’a repéré', 'cap.teleMelee': 'Un robot prend son élan', 'cap.teleSnipe': 'Bips de verrouillage',
      'cap.teleArtillery': 'Tir de mortier', 'cap.teleCharge': 'Moteur qui vrombit', 'cap.teleRing': 'Bourdonnement électrique',
      'cap.teleSpin': 'Quelque chose se met à tourner', 'cap.teleBoss': 'Corne du boss', 'cap.bossRoar': 'Rugissement du boss',
      'cap.warn': 'Bips d’alerte', 'cap.zoneWarn': 'Alarme de zone', 'cap.missile': 'Sifflement de missile',
      'cap.dir.left': '[{text}, à gauche]', 'cap.dir.right': '[{text}, à droite]', 'cap.dir.behind': '[{text}, derrière]', 'cap.dir.center': '[{text}]',
    },
    de: {
      'set.amb': 'Umgebung', 'set.uiVol': 'Menü-Sounds',
      'cap.enemyAlert': 'Ein Roboter hat dich entdeckt', 'cap.teleMelee': 'Roboter holt aus', 'cap.teleSnipe': 'Zielerfassungs-Piepen',
      'cap.teleArtillery': 'Mörserschuss', 'cap.teleCharge': 'Motor heult auf', 'cap.teleRing': 'Elektrisches Summen',
      'cap.teleSpin': 'Etwas dreht sich hoch', 'cap.teleBoss': 'Boss-Hupe', 'cap.bossRoar': 'Boss-Gebrüll',
      'cap.warn': 'Warnpiepen', 'cap.zoneWarn': 'Zonenalarm', 'cap.missile': 'Raketenzischen',
      'cap.dir.left': '[{text}, links]', 'cap.dir.right': '[{text}, rechts]', 'cap.dir.behind': '[{text}, hinten]', 'cap.dir.center': '[{text}]',
    },
    'pt-BR': {
      'set.amb': 'Ambiente', 'set.uiVol': 'Sons do menu',
      'cap.enemyAlert': 'Um robô te viu', 'cap.teleMelee': 'Robô preparando um golpe', 'cap.teleSnipe': 'Bipes de mira travada',
      'cap.teleArtillery': 'Disparo de morteiro', 'cap.teleCharge': 'Motor acelerando', 'cap.teleRing': 'Zumbido elétrico',
      'cap.teleSpin': 'Algo começando a girar', 'cap.teleBoss': 'Buzina do chefe', 'cap.bossRoar': 'Rugido do chefe',
      'cap.warn': 'Bipes de alerta', 'cap.zoneWarn': 'Alarme da zona', 'cap.missile': 'Assobio de míssil',
      'cap.dir.left': '[{text}, à esquerda]', 'cap.dir.right': '[{text}, à direita]', 'cap.dir.behind': '[{text}, atrás]', 'cap.dir.center': '[{text}]',
    },
    it: {
      'set.amb': 'Ambiente', 'set.uiVol': 'Suoni del menu',
      'cap.enemyAlert': 'Un robot ti ha visto', 'cap.teleMelee': 'Robot che prende la carica', 'cap.teleSnipe': 'Bip di aggancio',
      'cap.teleArtillery': 'Colpo di mortaio', 'cap.teleCharge': 'Motore che romba', 'cap.teleRing': 'Ronzio elettrico',
      'cap.teleSpin': 'Qualcosa inizia a girare', 'cap.teleBoss': 'Clacson del boss', 'cap.bossRoar': 'Ruggito del boss',
      'cap.warn': 'Bip di allarme', 'cap.zoneWarn': 'Allarme della zona', 'cap.missile': 'Sibilo di missile',
      'cap.dir.left': '[{text}, a sinistra]', 'cap.dir.right': '[{text}, a destra]', 'cap.dir.behind': '[{text}, dietro]', 'cap.dir.center': '[{text}]',
    },
    ru: {
      'set.amb': 'Окружение', 'set.uiVol': 'Звуки меню',
      'cap.enemyAlert': 'Робот тебя заметил', 'cap.teleMelee': 'Робот замахивается', 'cap.teleSnipe': 'Писк наведения',
      'cap.teleArtillery': 'Выстрел мортиры', 'cap.teleCharge': 'Рёв мотора', 'cap.teleRing': 'Электрический гул',
      'cap.teleSpin': 'Что-то раскручивается', 'cap.teleBoss': 'Гудок босса', 'cap.bossRoar': 'Рёв босса',
      'cap.warn': 'Сигнал тревоги', 'cap.zoneWarn': 'Тревога зоны', 'cap.missile': 'Свист ракеты',
      'cap.dir.left': '[{text}, слева]', 'cap.dir.right': '[{text}, справа]', 'cap.dir.behind': '[{text}, сзади]', 'cap.dir.center': '[{text}]',
    },
    id: {
      'set.amb': 'Suara sekitar', 'set.uiVol': 'Suara menu',
      'cap.enemyAlert': 'Robot melihatmu', 'cap.teleMelee': 'Robot mengambil ancang-ancang', 'cap.teleSnipe': 'Bunyi bip bidikan',
      'cap.teleArtillery': 'Tembakan mortir', 'cap.teleCharge': 'Mesin meraung', 'cap.teleRing': 'Dengung listrik',
      'cap.teleSpin': 'Ada yang mulai berputar', 'cap.teleBoss': 'Klakson bos', 'cap.bossRoar': 'Raungan bos',
      'cap.warn': 'Bip peringatan', 'cap.zoneWarn': 'Alarm zona', 'cap.missile': 'Desing rudal',
      'cap.dir.left': '[{text}, kiri]', 'cap.dir.right': '[{text}, kanan]', 'cap.dir.behind': '[{text}, belakang]', 'cap.dir.center': '[{text}]',
    },
  };
  for (const code in S) G.i18n.add(code, S[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_audio.js]', e); }
// ---- 93_lang_chars.js
try { (function () {
// Ranger Locker strings (13b_wardrobe.js, 30b_menus_town.js): rangers, colourways, slots, hints — all 12 languages.
(function (G) {
  'use strict';
  const T = {
    en: {
      'wr.locker': 'Ranger Locker', 'wr.tabName': 'Locker', 'wr.say': 'Pick your look for the next adventure!',
      'wr.tab.ranger': 'Ranger', 'wr.tab.gauntlet': 'Gloves', 'wr.tab.hat': 'Beepo hat', 'wr.tab.trail': 'Trail', 'wr.tab.paint': 'Skiff paint',
      'wr.equip': 'Wear', 'wr.equipped': 'Wearing', 'wr.new': 'New!', 'wr.drag': 'Drag to spin',
      'wr.suitGloves': 'Suit gloves', 'wr.suitGlovesD': 'Gloves that match your ranger\'s suit.', 'wr.gloveD': 'You see them on your hands while you play!',
      'wr.hatNone': 'No hat', 'wr.hatD': 'Beepo wears it in town and on missions.',
      'wr.trailNone': 'No trail', 'wr.trailD': 'Puffs out when you dash and jump.',
      'wr.paintNone': 'Classic teal', 'wr.paintD': 'Your Star Skiff wears it in the Rally.',
      'wr.hint.free': 'Free', 'wr.hint.rank': 'Reach Player Rank {n}', 'wr.hint.sprockets': 'Find {n} Star Sprockets', 'wr.hint.quest': 'Quest reward: {name}', 'wr.hint.tutorial': 'Finish the tutorial with Beepo',
      'wr.autoEquip': 'Now wearing: {name}! Change it in the Ranger Locker.', 'wr.openD': 'Change your ranger, gloves, Beepo\'s hat and more.',
      'wr.build.standard': 'Standard', 'wr.build.compact': 'Compact', 'wr.build.tall': 'Tall', 'wr.build.sturdy': 'Sturdy',
      'ranger.kiko': 'Kiko', 'ranger.pip': 'Pip', 'ranger.juno': 'Juno', 'ranger.tuck': 'Tuck',
      'ranger.kiko.d': 'Reef Ranger rookie. Brave, bubbly and always ready!', 'ranger.pip.d': 'A tiny tinkerer with a star on her antenna. Small but mighty!',
      'ranger.juno.d': 'A tall robot scout with fins that catch the wind.', 'ranger.tuck.d': 'A big-hearted mechanic with goggles and a strong grip.',
      'wr.cw.reef': 'Reef', 'wr.cw.sunset': 'Sunset', 'wr.cw.starlight': 'Starlight', 'wr.cw.bubblegum': 'Bubblegum', 'wr.cw.mint': 'Mint', 'wr.cw.lemon': 'Lemon',
      'wr.cw.lilac': 'Lilac', 'wr.cw.ocean': 'Ocean', 'wr.cw.mango': 'Mango', 'wr.cw.acorn': 'Acorn', 'wr.cw.berry': 'Berry', 'wr.cw.sky': 'Sky',
    },
    ja: {
      'wr.locker': 'レンジャーロッカー', 'wr.tabName': 'ロッカー', 'wr.say': 'つぎの ぼうけんの みためを えらんでね！',
      'wr.tab.ranger': 'レンジャー', 'wr.tab.gauntlet': 'グローブ', 'wr.tab.hat': 'ぼうし', 'wr.tab.trail': 'トレイル', 'wr.tab.paint': 'スキフの色',
      'wr.equip': 'これにする', 'wr.equipped': 'そうび中', 'wr.new': 'NEW！', 'wr.drag': 'ドラッグで まわせるよ',
      'wr.suitGloves': 'スーツのグローブ', 'wr.suitGlovesD': 'レンジャーの スーツと おそろいの グローブ。', 'wr.gloveD': 'あそんでいる ときの 手に みえるよ！',
      'wr.hatNone': 'ぼうしなし', 'wr.hatD': 'タウンでも ミッションでも ビーポが かぶるよ。',
      'wr.trailNone': 'トレイルなし', 'wr.trailD': 'ダッシュや ジャンプで ふわっと でるよ。',
      'wr.paintNone': 'クラシックティール', 'wr.paintD': 'ラリーで きみの スタースキフが この色に なるよ。',
      'wr.hint.free': 'さいしょから つかえる', 'wr.hint.rank': 'プレイヤーランク{n}で もらえる', 'wr.hint.sprockets': 'スタースプロケットを {n}こ あつめる', 'wr.hint.quest': 'クエストの ほうび：{name}', 'wr.hint.tutorial': 'ビーポと チュートリアルを クリア',
      'wr.autoEquip': '{name}を そうびしたよ！ レンジャーロッカーで かえられるよ。', 'wr.openD': 'レンジャー、グローブ、ビーポの ぼうしなどを かえよう。',
      'wr.build.standard': 'ふつう', 'wr.build.compact': 'ちびっこ', 'wr.build.tall': 'のっぽ', 'wr.build.sturdy': 'がっしり',
      'ranger.kiko': 'キコ', 'ranger.pip': 'ピップ', 'ranger.juno': 'ジュノ', 'ranger.tuck': 'タック',
      'ranger.kiko.d': 'リーフレンジャーの ルーキー。げんきで ゆうかん、いつでも じゅんびOK！', 'ranger.pip.d': 'アンテナに ほしを つけた ちいさな はつめいか。ちいさくても つよいよ！',
      'ranger.juno.d': '風を つかまえる ヒレを もつ、のっぽの ロボットスカウト。', 'ranger.tuck.d': 'ゴーグルが じまんの、こころやさしい ちからもち メカニック。',
      'wr.cw.reef': 'リーフ', 'wr.cw.sunset': 'サンセット', 'wr.cw.starlight': 'スターライト', 'wr.cw.bubblegum': 'バブルガム', 'wr.cw.mint': 'ミント', 'wr.cw.lemon': 'レモン',
      'wr.cw.lilac': 'ライラック', 'wr.cw.ocean': 'オーシャン', 'wr.cw.mango': 'マンゴー', 'wr.cw.acorn': 'どんぐり', 'wr.cw.berry': 'ベリー', 'wr.cw.sky': 'そらいろ',
    },
    'zh-Hans': {
      'wr.locker': '游侠衣柜', 'wr.tabName': '衣柜', 'wr.say': '为下一次冒险挑选装扮吧！',
      'wr.tab.ranger': '游侠', 'wr.tab.gauntlet': '手套', 'wr.tab.hat': '比波的帽子', 'wr.tab.trail': '尾迹', 'wr.tab.paint': '星舟涂装',
      'wr.equip': '穿上', 'wr.equipped': '穿戴中', 'wr.new': '新！', 'wr.drag': '拖动可以旋转',
      'wr.suitGloves': '制服手套', 'wr.suitGlovesD': '和游侠制服成套的手套。', 'wr.gloveD': '游戏时能在你的手上看到！',
      'wr.hatNone': '不戴帽子', 'wr.hatD': '比波在小镇和任务里都会戴着。',
      'wr.trailNone': '没有尾迹', 'wr.trailD': '冲刺和跳跃时会冒出来。',
      'wr.paintNone': '经典青色', 'wr.paintD': '在拉力赛里，你的星舟会换上这个涂装。',
      'wr.hint.free': '免费', 'wr.hint.rank': '达到玩家等级 {n}', 'wr.hint.sprockets': '找到 {n} 个星星齿轮', 'wr.hint.quest': '任务奖励：{name}', 'wr.hint.tutorial': '和比波一起完成教程',
      'wr.autoEquip': '已穿上：{name}！可以在游侠衣柜里更换。', 'wr.openD': '更换游侠、手套、比波的帽子等等。',
      'wr.build.standard': '标准', 'wr.build.compact': '小巧', 'wr.build.tall': '高挑', 'wr.build.sturdy': '壮实',
      'ranger.kiko': '琪可', 'ranger.pip': '皮普', 'ranger.juno': '朱诺', 'ranger.tuck': '塔克',
      'ranger.kiko.d': '珊瑚礁游侠新人。勇敢活泼，随时准备出发！', 'ranger.pip.d': '天线上顶着星星的小小发明家。个子小，本领大！',
      'ranger.juno.d': '高高的机器人侦察兵，鳍片能乘风而行。', 'ranger.tuck.d': '戴着护目镜的热心机械师，力气可大啦。',
      'wr.cw.reef': '珊瑚礁', 'wr.cw.sunset': '日落', 'wr.cw.starlight': '星光', 'wr.cw.bubblegum': '泡泡糖', 'wr.cw.mint': '薄荷', 'wr.cw.lemon': '柠檬',
      'wr.cw.lilac': '丁香紫', 'wr.cw.ocean': '海洋', 'wr.cw.mango': '芒果', 'wr.cw.acorn': '橡果', 'wr.cw.berry': '莓果', 'wr.cw.sky': '天空',
    },
    'zh-Hant': {
      'wr.locker': '遊俠衣櫃', 'wr.tabName': '衣櫃', 'wr.say': '為下一次冒險挑選裝扮吧！',
      'wr.tab.ranger': '遊俠', 'wr.tab.gauntlet': '手套', 'wr.tab.hat': '比波的帽子', 'wr.tab.trail': '尾跡', 'wr.tab.paint': '星艇塗裝',
      'wr.equip': '穿上', 'wr.equipped': '穿戴中', 'wr.new': '新！', 'wr.drag': '拖曳可以旋轉',
      'wr.suitGloves': '制服手套', 'wr.suitGlovesD': '和遊俠制服成套的手套。', 'wr.gloveD': '遊戲時能在你的手上看到！',
      'wr.hatNone': '不戴帽子', 'wr.hatD': '比波在小鎮和任務裡都會戴著。',
      'wr.trailNone': '沒有尾跡', 'wr.trailD': '衝刺和跳躍時會冒出來。',
      'wr.paintNone': '經典青色', 'wr.paintD': '在拉力賽裡，你的星艇會換上這個塗裝。',
      'wr.hint.free': '免費', 'wr.hint.rank': '達到玩家等級 {n}', 'wr.hint.sprockets': '找到 {n} 個星星齒輪', 'wr.hint.quest': '任務獎勵：{name}', 'wr.hint.tutorial': '和比波一起完成教學',
      'wr.autoEquip': '已穿上：{name}！可以在遊俠衣櫃裡更換。', 'wr.openD': '更換遊俠、手套、比波的帽子等等。',
      'wr.build.standard': '標準', 'wr.build.compact': '小巧', 'wr.build.tall': '高挑', 'wr.build.sturdy': '壯實',
      'ranger.kiko': '琪可', 'ranger.pip': '皮普', 'ranger.juno': '朱諾', 'ranger.tuck': '塔克',
      'ranger.kiko.d': '珊瑚礁遊俠新人。勇敢活潑，隨時準備出發！', 'ranger.pip.d': '天線上頂著星星的小小發明家。個子小，本領大！',
      'ranger.juno.d': '高高的機器人偵察兵，鰭片能乘風而行。', 'ranger.tuck.d': '戴著護目鏡的熱心機械師，力氣可大啦。',
      'wr.cw.reef': '珊瑚礁', 'wr.cw.sunset': '日落', 'wr.cw.starlight': '星光', 'wr.cw.bubblegum': '泡泡糖', 'wr.cw.mint': '薄荷', 'wr.cw.lemon': '檸檬',
      'wr.cw.lilac': '丁香紫', 'wr.cw.ocean': '海洋', 'wr.cw.mango': '芒果', 'wr.cw.acorn': '橡果', 'wr.cw.berry': '莓果', 'wr.cw.sky': '天空',
    },
    ko: {
      'wr.locker': '레인저 사물함', 'wr.tabName': '사물함', 'wr.say': '다음 모험의 모습을 골라 봐!',
      'wr.tab.ranger': '레인저', 'wr.tab.gauntlet': '장갑', 'wr.tab.hat': '비포 모자', 'wr.tab.trail': '꼬리', 'wr.tab.paint': '스키프 도색',
      'wr.equip': '입기', 'wr.equipped': '착용 중', 'wr.new': 'NEW!', 'wr.drag': '드래그해서 돌려 봐',
      'wr.suitGloves': '수트 장갑', 'wr.suitGlovesD': '레인저 수트와 세트인 장갑이야.', 'wr.gloveD': '플레이할 때 손에 보여!',
      'wr.hatNone': '모자 없음', 'wr.hatD': '비포가 마을에서도 임무에서도 써.',
      'wr.trailNone': '꼬리 없음', 'wr.trailD': '대시하거나 점프할 때 뿅 하고 나와.',
      'wr.paintNone': '클래식 청록', 'wr.paintD': '랠리에서 네 스타 스키프가 이 색이 돼.',
      'wr.hint.free': '무료', 'wr.hint.rank': '플레이어 랭크 {n} 달성', 'wr.hint.sprockets': '스타 스프로킷 {n}개 찾기', 'wr.hint.quest': '퀘스트 보상: {name}', 'wr.hint.tutorial': '비포와 튜토리얼 끝내기',
      'wr.autoEquip': '{name} 착용! 레인저 사물함에서 바꿀 수 있어.', 'wr.openD': '레인저, 장갑, 비포의 모자 등을 바꿔 보자.',
      'wr.build.standard': '보통', 'wr.build.compact': '꼬마', 'wr.build.tall': '키다리', 'wr.build.sturdy': '튼튼',
      'ranger.kiko': '키코', 'ranger.pip': '핍', 'ranger.juno': '주노', 'ranger.tuck': '턱',
      'ranger.kiko.d': '리프 레인저 신입. 용감하고 씩씩하고 언제나 준비 완료!', 'ranger.pip.d': '안테나에 별을 단 꼬마 발명가. 작지만 강해!',
      'ranger.juno.d': '바람을 타는 지느러미를 가진 키다리 로봇 정찰병.', 'ranger.tuck.d': '고글을 쓴 마음씨 좋은 정비사. 힘이 장사야!',
      'wr.cw.reef': '리프', 'wr.cw.sunset': '노을', 'wr.cw.starlight': '별빛', 'wr.cw.bubblegum': '풍선껌', 'wr.cw.mint': '민트', 'wr.cw.lemon': '레몬',
      'wr.cw.lilac': '라일락', 'wr.cw.ocean': '바다', 'wr.cw.mango': '망고', 'wr.cw.acorn': '도토리', 'wr.cw.berry': '베리', 'wr.cw.sky': '하늘',
    },
    es: {
      'wr.locker': 'Taquilla Ranger', 'wr.tabName': 'Taquilla', 'wr.say': '¡Elige tu look para la próxima aventura!',
      'wr.tab.ranger': 'Ranger', 'wr.tab.gauntlet': 'Guantes', 'wr.tab.hat': 'Gorro de Beepo', 'wr.tab.trail': 'Estela', 'wr.tab.paint': 'Pintura de nave',
      'wr.equip': 'Ponerse', 'wr.equipped': 'Puesto', 'wr.new': '¡Nuevo!', 'wr.drag': 'Arrastra para girar',
      'wr.suitGloves': 'Guantes del traje', 'wr.suitGlovesD': 'Guantes a juego con el traje de tu ranger.', 'wr.gloveD': '¡Los verás en tus manos mientras juegas!',
      'wr.hatNone': 'Sin gorro', 'wr.hatD': 'Beepo lo lleva en el pueblo y en las misiones.',
      'wr.trailNone': 'Sin estela', 'wr.trailD': 'Sale cuando te impulsas y saltas.',
      'wr.paintNone': 'Turquesa clásico', 'wr.paintD': 'Tu nave lo luce en el Rally Estelar.',
      'wr.hint.free': 'Gratis', 'wr.hint.rank': 'Llega al Rango de jugador {n}', 'wr.hint.sprockets': 'Encuentra {n} Star Sprockets', 'wr.hint.quest': 'Premio de misión: {name}', 'wr.hint.tutorial': 'Termina el tutorial con Beepo',
      'wr.autoEquip': '¡Ya llevas {name}! Cámbialo en la Taquilla Ranger.', 'wr.openD': 'Cambia tu ranger, los guantes, el gorro de Beepo y más.',
      'wr.build.standard': 'Normal', 'wr.build.compact': 'Peque', 'wr.build.tall': 'Alto', 'wr.build.sturdy': 'Fuerte',
      'ranger.kiko': 'Kiko', 'ranger.pip': 'Pip', 'ranger.juno': 'Juno', 'ranger.tuck': 'Tuck',
      'ranger.kiko.d': 'Novata de los Reef Rangers. ¡Valiente, alegre y siempre lista!', 'ranger.pip.d': 'Una inventora diminuta con una estrella en la antena. ¡Pequeña pero poderosa!',
      'ranger.juno.d': 'Una exploradora robot muy alta con aletas que atrapan el viento.', 'ranger.tuck.d': 'Un mecánico de gran corazón, con gafas y mucha fuerza.',
      'wr.cw.reef': 'Arrecife', 'wr.cw.sunset': 'Atardecer', 'wr.cw.starlight': 'Luz estelar', 'wr.cw.bubblegum': 'Chicle', 'wr.cw.mint': 'Menta', 'wr.cw.lemon': 'Limón',
      'wr.cw.lilac': 'Lila', 'wr.cw.ocean': 'Océano', 'wr.cw.mango': 'Mango', 'wr.cw.acorn': 'Bellota', 'wr.cw.berry': 'Baya', 'wr.cw.sky': 'Cielo',
    },
    fr: {
      'wr.locker': 'Casier Ranger', 'wr.tabName': 'Casier', 'wr.say': 'Choisis ton look pour la prochaine aventure !',
      'wr.tab.ranger': 'Ranger', 'wr.tab.gauntlet': 'Gants', 'wr.tab.hat': 'Chapeau de Beepo', 'wr.tab.trail': 'Traînée', 'wr.tab.paint': 'Peinture de skiff',
      'wr.equip': 'Porter', 'wr.equipped': 'Porté', 'wr.new': 'Nouveau !', 'wr.drag': 'Glisse pour tourner',
      'wr.suitGloves': 'Gants de la tenue', 'wr.suitGlovesD': 'Des gants assortis à la tenue de ton ranger.', 'wr.gloveD': 'Tu les vois sur tes mains pendant que tu joues !',
      'wr.hatNone': 'Sans chapeau', 'wr.hatD': 'Beepo le porte en ville et en mission.',
      'wr.trailNone': 'Sans traînée', 'wr.trailD': 'Elle jaillit quand tu fonces et quand tu sautes.',
      'wr.paintNone': 'Turquoise classique', 'wr.paintD': 'Ton skiff la porte pendant le Rallye Stellaire.',
      'wr.hint.free': 'Gratuit', 'wr.hint.rank': 'Atteins le Rang Joueur {n}', 'wr.hint.sprockets': 'Trouve {n} Star Sprockets', 'wr.hint.quest': 'Récompense de quête : {name}', 'wr.hint.tutorial': 'Termine le tutoriel avec Beepo',
      'wr.autoEquip': 'Tu portes maintenant : {name} ! Change-le dans le Casier Ranger.', 'wr.openD': 'Change de ranger, de gants, de chapeau pour Beepo et plus encore.',
      'wr.build.standard': 'Normal', 'wr.build.compact': 'Petit', 'wr.build.tall': 'Grand', 'wr.build.sturdy': 'Costaud',
      'ranger.kiko': 'Kiko', 'ranger.pip': 'Pip', 'ranger.juno': 'Juno', 'ranger.tuck': 'Tuck',
      'ranger.kiko.d': 'Recrue des Reef Rangers. Courageuse, pétillante et toujours prête !', 'ranger.pip.d': 'Une mini inventrice avec une étoile sur son antenne. Petite mais costaude !',
      'ranger.juno.d': 'Une grande éclaireuse robot aux ailerons qui attrapent le vent.', 'ranger.tuck.d': 'Un mécanicien au grand cœur, avec ses lunettes et sa poigne solide.',
      'wr.cw.reef': 'Récif', 'wr.cw.sunset': 'Couchant', 'wr.cw.starlight': 'Étoilé', 'wr.cw.bubblegum': 'Chewing-gum', 'wr.cw.mint': 'Menthe', 'wr.cw.lemon': 'Citron',
      'wr.cw.lilac': 'Lilas', 'wr.cw.ocean': 'Océan', 'wr.cw.mango': 'Mangue', 'wr.cw.acorn': 'Gland', 'wr.cw.berry': 'Baie', 'wr.cw.sky': 'Ciel',
    },
    de: {
      'wr.locker': 'Ranger-Spind', 'wr.tabName': 'Spind', 'wr.say': 'Such dir deinen Look fürs nächste Abenteuer aus!',
      'wr.tab.ranger': 'Ranger', 'wr.tab.gauntlet': 'Handschuhe', 'wr.tab.hat': 'Beepo-Hut', 'wr.tab.trail': 'Spur', 'wr.tab.paint': 'Skiff-Lack',
      'wr.equip': 'Anziehen', 'wr.equipped': 'Angezogen', 'wr.new': 'Neu!', 'wr.drag': 'Zum Drehen ziehen',
      'wr.suitGloves': 'Anzug-Handschuhe', 'wr.suitGlovesD': 'Handschuhe passend zum Anzug deines Rangers.', 'wr.gloveD': 'Beim Spielen siehst du sie an deinen Händen!',
      'wr.hatNone': 'Kein Hut', 'wr.hatD': 'Beepo trägt ihn in der Stadt und auf Missionen.',
      'wr.trailNone': 'Keine Spur', 'wr.trailD': 'Sprudelt bei jedem Spurt und Sprung heraus.',
      'wr.paintNone': 'Klassisches Türkis', 'wr.paintD': 'Dein Sternenskiff trägt ihn in der Rallye.',
      'wr.hint.free': 'Gratis', 'wr.hint.rank': 'Erreiche Spielerrang {n}', 'wr.hint.sprockets': 'Finde {n} Star Sprockets', 'wr.hint.quest': 'Questbelohnung: {name}', 'wr.hint.tutorial': 'Schließ das Tutorial mit Beepo ab',
      'wr.autoEquip': 'Jetzt angezogen: {name}! Im Ranger-Spind kannst du es ändern.', 'wr.openD': 'Wechsle Ranger, Handschuhe, Beepos Hut und mehr.',
      'wr.build.standard': 'Normal', 'wr.build.compact': 'Klein', 'wr.build.tall': 'Groß', 'wr.build.sturdy': 'Kräftig',
      'ranger.kiko': 'Kiko', 'ranger.pip': 'Pip', 'ranger.juno': 'Juno', 'ranger.tuck': 'Tuck',
      'ranger.kiko.d': 'Neuling der Riff-Ranger. Mutig, sprudelnd und immer bereit!', 'ranger.pip.d': 'Eine winzige Tüftlerin mit einem Stern an der Antenne. Klein, aber stark!',
      'ranger.juno.d': 'Eine große Roboter-Späherin mit Flossen, die den Wind einfangen.', 'ranger.tuck.d': 'Ein herzlicher Mechaniker mit Schutzbrille und kräftigem Griff.',
      'wr.cw.reef': 'Riff', 'wr.cw.sunset': 'Abendrot', 'wr.cw.starlight': 'Sternenlicht', 'wr.cw.bubblegum': 'Kaugummi', 'wr.cw.mint': 'Minze', 'wr.cw.lemon': 'Zitrone',
      'wr.cw.lilac': 'Flieder', 'wr.cw.ocean': 'Ozean', 'wr.cw.mango': 'Mango', 'wr.cw.acorn': 'Eichel', 'wr.cw.berry': 'Beere', 'wr.cw.sky': 'Himmel',
    },
    'pt-BR': {
      'wr.locker': 'Armário Ranger', 'wr.tabName': 'Armário', 'wr.say': 'Escolha seu visual para a próxima aventura!',
      'wr.tab.ranger': 'Ranger', 'wr.tab.gauntlet': 'Luvas', 'wr.tab.hat': 'Chapéu do Beepo', 'wr.tab.trail': 'Rastro', 'wr.tab.paint': 'Pintura da nave',
      'wr.equip': 'Usar', 'wr.equipped': 'Usando', 'wr.new': 'Novo!', 'wr.drag': 'Arraste para girar',
      'wr.suitGloves': 'Luvas do traje', 'wr.suitGlovesD': 'Luvas que combinam com o traje do seu ranger.', 'wr.gloveD': 'Você vê nas suas mãos enquanto joga!',
      'wr.hatNone': 'Sem chapéu', 'wr.hatD': 'O Beepo usa na cidade e nas missões.',
      'wr.trailNone': 'Sem rastro', 'wr.trailD': 'Aparece quando você dá uma arrancada e pula.',
      'wr.paintNone': 'Turquesa clássico', 'wr.paintD': 'Sua nave usa esta pintura no Rali Estelar.',
      'wr.hint.free': 'Grátis', 'wr.hint.rank': 'Chegue ao Nível de Jogador {n}', 'wr.hint.sprockets': 'Encontre {n} Star Sprockets', 'wr.hint.quest': 'Prêmio de missão: {name}', 'wr.hint.tutorial': 'Termine o tutorial com o Beepo',
      'wr.autoEquip': 'Agora usando: {name}! Troque no Armário Ranger.', 'wr.openD': 'Troque seu ranger, as luvas, o chapéu do Beepo e mais.',
      'wr.build.standard': 'Normal', 'wr.build.compact': 'Baixinho', 'wr.build.tall': 'Alto', 'wr.build.sturdy': 'Fortão',
      'ranger.kiko': 'Kiko', 'ranger.pip': 'Pip', 'ranger.juno': 'Juno', 'ranger.tuck': 'Tuck',
      'ranger.kiko.d': 'Novata dos Reef Rangers. Corajosa, animada e sempre pronta!', 'ranger.pip.d': 'Uma inventora pequenininha com uma estrela na antena. Pequena, mas poderosa!',
      'ranger.juno.d': 'Uma exploradora robô bem alta, com barbatanas que pegam o vento.', 'ranger.tuck.d': 'Um mecânico de bom coração, com óculos de proteção e muita força.',
      'wr.cw.reef': 'Recife', 'wr.cw.sunset': 'Pôr do sol', 'wr.cw.starlight': 'Luz estelar', 'wr.cw.bubblegum': 'Chiclete', 'wr.cw.mint': 'Menta', 'wr.cw.lemon': 'Limão',
      'wr.cw.lilac': 'Lilás', 'wr.cw.ocean': 'Oceano', 'wr.cw.mango': 'Manga', 'wr.cw.acorn': 'Bolota', 'wr.cw.berry': 'Frutinha', 'wr.cw.sky': 'Céu',
    },
    it: {
      'wr.locker': 'Armadietto Ranger', 'wr.tabName': 'Armadietto', 'wr.say': 'Scegli il tuo look per la prossima avventura!',
      'wr.tab.ranger': 'Ranger', 'wr.tab.gauntlet': 'Guanti', 'wr.tab.hat': 'Cappello di Beepo', 'wr.tab.trail': 'Scia', 'wr.tab.paint': 'Vernice navetta',
      'wr.equip': 'Indossa', 'wr.equipped': 'Indossato', 'wr.new': 'Nuovo!', 'wr.drag': 'Trascina per girare',
      'wr.suitGloves': 'Guanti della tuta', 'wr.suitGlovesD': 'Guanti abbinati alla tuta del tuo ranger.', 'wr.gloveD': 'Li vedi sulle tue mani mentre giochi!',
      'wr.hatNone': 'Niente cappello', 'wr.hatD': 'Beepo lo indossa in città e nelle missioni.',
      'wr.trailNone': 'Niente scia', 'wr.trailD': 'Spunta fuori quando scatti e salti.',
      'wr.paintNone': 'Turchese classico', 'wr.paintD': 'La tua navetta la sfoggia nel Rally.',
      'wr.hint.free': 'Gratis', 'wr.hint.rank': 'Raggiungi il Rango Giocatore {n}', 'wr.hint.sprockets': 'Trova {n} Star Sprocket', 'wr.hint.quest': 'Premio missione: {name}', 'wr.hint.tutorial': 'Finisci il tutorial con Beepo',
      'wr.autoEquip': 'Ora indossi: {name}! Puoi cambiarlo nell\'Armadietto Ranger.', 'wr.openD': 'Cambia ranger, guanti, il cappello di Beepo e altro.',
      'wr.build.standard': 'Normale', 'wr.build.compact': 'Piccolo', 'wr.build.tall': 'Alto', 'wr.build.sturdy': 'Robusto',
      'ranger.kiko': 'Kiko', 'ranger.pip': 'Pip', 'ranger.juno': 'Juno', 'ranger.tuck': 'Tuck',
      'ranger.kiko.d': 'Recluta dei Reef Ranger. Coraggiosa, frizzante e sempre pronta!', 'ranger.pip.d': 'Una piccola inventrice con una stella sull\'antenna. Piccola ma potente!',
      'ranger.juno.d': 'Un\'esploratrice robot altissima con pinne che catturano il vento.', 'ranger.tuck.d': 'Un meccanico dal cuore grande, con gli occhialoni e una presa forte.',
      'wr.cw.reef': 'Barriera', 'wr.cw.sunset': 'Tramonto', 'wr.cw.starlight': 'Luce di stelle', 'wr.cw.bubblegum': 'Gomma rosa', 'wr.cw.mint': 'Menta', 'wr.cw.lemon': 'Limone',
      'wr.cw.lilac': 'Lilla', 'wr.cw.ocean': 'Oceano', 'wr.cw.mango': 'Mango', 'wr.cw.acorn': 'Ghianda', 'wr.cw.berry': 'Frutti di bosco', 'wr.cw.sky': 'Cielo',
    },
    ru: {
      'wr.locker': 'Шкафчик рейнджера', 'wr.tabName': 'Шкафчик', 'wr.say': 'Выбери образ для следующего приключения!',
      'wr.tab.ranger': 'Рейнджер', 'wr.tab.gauntlet': 'Перчатки', 'wr.tab.hat': 'Шапка Бипо', 'wr.tab.trail': 'След', 'wr.tab.paint': 'Краска челнока',
      'wr.equip': 'Надеть', 'wr.equipped': 'Надето', 'wr.new': 'Новое!', 'wr.drag': 'Потяни, чтобы повернуть',
      'wr.suitGloves': 'Перчатки костюма', 'wr.suitGlovesD': 'Перчатки в тон костюму рейнджера.', 'wr.gloveD': 'Их видно на твоих руках во время игры!',
      'wr.hatNone': 'Без шапки', 'wr.hatD': 'Бипо носит её в городе и на миссиях.',
      'wr.trailNone': 'Без следа', 'wr.trailD': 'Появляется, когда ты делаешь рывок и прыгаешь.',
      'wr.paintNone': 'Классическая бирюза', 'wr.paintD': 'Твой челнок носит её в Звёздном ралли.',
      'wr.hint.free': 'Бесплатно', 'wr.hint.rank': 'Достигни ранга игрока {n}', 'wr.hint.sprockets': 'Найди звёздные шестерёнки: {n}', 'wr.hint.quest': 'Награда за задание: {name}', 'wr.hint.tutorial': 'Пройди обучение с Бипо',
      'wr.autoEquip': 'Теперь на тебе: {name}! Поменять можно в шкафчике рейнджера.', 'wr.openD': 'Меняй рейнджера, перчатки, шапку Бипо и многое другое.',
      'wr.build.standard': 'Обычный', 'wr.build.compact': 'Малыш', 'wr.build.tall': 'Высокий', 'wr.build.sturdy': 'Крепыш',
      'ranger.kiko': 'Кико', 'ranger.pip': 'Пип', 'ranger.juno': 'Джуно', 'ranger.tuck': 'Так',
      'ranger.kiko.d': 'Новичок рифовых рейнджеров. Смелая, весёлая и всегда наготове!', 'ranger.pip.d': 'Крошка-изобретательница со звёздочкой на антенне. Маленькая, но сильная!',
      'ranger.juno.d': 'Высокая робот-разведчица с плавниками, ловящими ветер.', 'ranger.tuck.d': 'Добродушный механик в очках-гоглах и с крепкой хваткой.',
      'wr.cw.reef': 'Риф', 'wr.cw.sunset': 'Закат', 'wr.cw.starlight': 'Звёздный свет', 'wr.cw.bubblegum': 'Жвачка', 'wr.cw.mint': 'Мята', 'wr.cw.lemon': 'Лимон',
      'wr.cw.lilac': 'Сирень', 'wr.cw.ocean': 'Океан', 'wr.cw.mango': 'Манго', 'wr.cw.acorn': 'Жёлудь', 'wr.cw.berry': 'Ягода', 'wr.cw.sky': 'Небо',
    },
    id: {
      'wr.locker': 'Loker Ranger', 'wr.tabName': 'Loker', 'wr.say': 'Pilih gayamu untuk petualangan berikutnya!',
      'wr.tab.ranger': 'Ranger', 'wr.tab.gauntlet': 'Sarung tangan', 'wr.tab.hat': 'Topi Beepo', 'wr.tab.trail': 'Jejak', 'wr.tab.paint': 'Cat perahu',
      'wr.equip': 'Pakai', 'wr.equipped': 'Dipakai', 'wr.new': 'Baru!', 'wr.drag': 'Geser untuk memutar',
      'wr.suitGloves': 'Sarung tangan setelan', 'wr.suitGlovesD': 'Sarung tangan yang serasi dengan setelan rangermu.', 'wr.gloveD': 'Kamu bisa melihatnya di tanganmu saat bermain!',
      'wr.hatNone': 'Tanpa topi', 'wr.hatD': 'Beepo memakainya di kota dan saat misi.',
      'wr.trailNone': 'Tanpa jejak', 'wr.trailD': 'Muncul saat kamu melesat dan melompat.',
      'wr.paintNone': 'Toska klasik', 'wr.paintD': 'Perahu Bintangmu memakainya di Reli.',
      'wr.hint.free': 'Gratis', 'wr.hint.rank': 'Capai Peringkat Pemain {n}', 'wr.hint.sprockets': 'Temukan {n} Star Sprocket', 'wr.hint.quest': 'Hadiah misi: {name}', 'wr.hint.tutorial': 'Selesaikan tutorial bersama Beepo',
      'wr.autoEquip': 'Sekarang memakai: {name}! Ganti di Loker Ranger.', 'wr.openD': 'Ganti ranger, sarung tangan, topi Beepo, dan lainnya.',
      'wr.build.standard': 'Biasa', 'wr.build.compact': 'Mungil', 'wr.build.tall': 'Jangkung', 'wr.build.sturdy': 'Kekar',
      'ranger.kiko': 'Kiko', 'ranger.pip': 'Pip', 'ranger.juno': 'Juno', 'ranger.tuck': 'Tuck',
      'ranger.kiko.d': 'Ranger Karang pemula. Berani, ceria, dan selalu siap!', 'ranger.pip.d': 'Penemu mungil dengan bintang di antenanya. Kecil tapi hebat!',
      'ranger.juno.d': 'Pengintai robot jangkung dengan sirip yang menangkap angin.', 'ranger.tuck.d': 'Montir baik hati dengan kacamata pelindung dan genggaman kuat.',
      'wr.cw.reef': 'Karang', 'wr.cw.sunset': 'Senja', 'wr.cw.starlight': 'Cahaya bintang', 'wr.cw.bubblegum': 'Permen karet', 'wr.cw.mint': 'Mint', 'wr.cw.lemon': 'Lemon',
      'wr.cw.lilac': 'Ungu lila', 'wr.cw.ocean': 'Samudra', 'wr.cw.mango': 'Mangga', 'wr.cw.acorn': 'Biji ek', 'wr.cw.berry': 'Beri', 'wr.cw.sky': 'Langit',
    },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_chars.js]', e); }
// ---- 93_lang_combat.js
try { (function () {
// Strings for the combat pass (all 12 languages):
//   set.fovH          settings row for the horizontal field-of-view slider (G.Save.set.fovH, 07b_screens_core)
//   enemy.coreOpen    boss punish-window callouts (17b_bosses.js -> G.HUD.callout): Crankcrab's open face core,
//   enemy.hiveStuck   Queen Buzzhive stuck after a dive,
//   enemy.slotOpen    Vend-O-Titan's open coin slot.
(function (G) {
  const S = {
    en: { 'set.fovH': 'Field of view (width)', 'enemy.coreOpen': 'Core open — shoot it!', 'enemy.hiveStuck': 'She\'s stuck — blast her now!', 'enemy.slotOpen': 'Coin slot open — shoot it!' },
    ja: { 'set.fovH': '視野の広さ（よこ）', 'enemy.coreOpen': 'コアがひらいた！ いまだ、うて！', 'enemy.hiveStuck': 'うごけないぞ！ いまのうちにうて！', 'enemy.slotOpen': 'コインのあながひらいた！ ねらえ！' },
    'zh-Hans': { 'set.fovH': '视野宽度（水平）', 'enemy.coreOpen': '核心打开了——快射击！', 'enemy.hiveStuck': '它卡住了——快开火！', 'enemy.slotOpen': '投币口打开了——快射它！' },
    'zh-Hant': { 'set.fovH': '視野寬度（水平）', 'enemy.coreOpen': '核心打開了——快射擊！', 'enemy.hiveStuck': '它卡住了——快開火！', 'enemy.slotOpen': '投幣口打開了——快射它！' },
    ko: { 'set.fovH': '시야 너비 (가로)', 'enemy.coreOpen': '코어가 열렸어 — 지금 쏴!', 'enemy.hiveStuck': '꼼짝 못 해 — 지금 공격해!', 'enemy.slotOpen': '동전 구멍이 열렸어 — 쏴!' },
    es: { 'set.fovH': 'Campo de visión (ancho)', 'enemy.coreOpen': '¡Núcleo abierto, dispárale!', 'enemy.hiveStuck': '¡Está atascada, dale ahora!', 'enemy.slotOpen': '¡Ranura abierta, dispárale!' },
    fr: { 'set.fovH': 'Champ de vision (largeur)', 'enemy.coreOpen': 'Noyau ouvert, tire dessus !', 'enemy.hiveStuck': 'Elle est coincée, vas-y !', 'enemy.slotOpen': 'Fente à pièces ouverte, vise-la !' },
    de: { 'set.fovH': 'Sichtfeld (Breite)', 'enemy.coreOpen': 'Kern offen – schieß drauf!', 'enemy.hiveStuck': 'Sie steckt fest – jetzt feuern!', 'enemy.slotOpen': 'Münzschlitz offen – triff ihn!' },
    'pt-BR': { 'set.fovH': 'Campo de visão (largura)', 'enemy.coreOpen': 'Núcleo aberto, atire nele!', 'enemy.hiveStuck': 'Ela ficou presa, mande ver!', 'enemy.slotOpen': 'Fenda de moedas aberta, mire nela!' },
    it: { 'set.fovH': 'Campo visivo (larghezza)', 'enemy.coreOpen': 'Nucleo aperto, sparagli!', 'enemy.hiveStuck': 'È bloccata, colpiscila ora!', 'enemy.slotOpen': 'Fessura aperta, mira lì!' },
    ru: { 'set.fovH': 'Обзор (ширина)', 'enemy.coreOpen': 'Ядро открыто — стреляй!', 'enemy.hiveStuck': 'Она застряла — бей сейчас!', 'enemy.slotOpen': 'Щель для монет открыта — стреляй!' },
    id: { 'set.fovH': 'Bidang pandang (lebar)', 'enemy.coreOpen': 'Inti terbuka — tembak!', 'enemy.hiveStuck': 'Dia tersangkut — serang sekarang!', 'enemy.slotOpen': 'Lubang koin terbuka — tembak!' },
  };
  for (const code in S) G.i18n.add(code, S[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_combat.js]', e); }
// ---- 93_lang_feel.js
try { (function () {
// Strings for the game-feel options (06_input.js touch-look smoothing): the settings row label.
// The setting itself is G.Save.set.lookSmooth (boolean, default on; set in G.Input.init).
(function (G) {
  const S = {
    en: { 'set.lookSmooth': 'Smooth look (touch)' },
    ja: { 'set.lookSmooth': 'なめらか視点（タッチ）' },
    'zh-Hans': { 'set.lookSmooth': '平滑视角（触屏）' },
    'zh-Hant': { 'set.lookSmooth': '平滑視角（觸控）' },
    ko: { 'set.lookSmooth': '부드러운 시점 (터치)' },
    es: { 'set.lookSmooth': 'Vista suave (táctil)' },
    fr: { 'set.lookSmooth': 'Visée fluide (tactile)' },
    de: { 'set.lookSmooth': 'Sanfte Kamera (Touch)' },
    'pt-BR': { 'set.lookSmooth': 'Visão suave (toque)' },
    it: { 'set.lookSmooth': 'Visuale fluida (touch)' },
    ru: { 'set.lookSmooth': 'Плавный обзор (сенсор)' },
    id: { 'set.lookSmooth': 'Pandangan halus (sentuh)' },
  };
  for (const code in S) G.i18n.add(code, S[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_feel.js]', e); }
// ---- 93_lang_fixactors.js
try { (function () {
// Strings for the actors-cluster fixes: the Crank Crab's title (boss banner / HUD / codex: enemy.crankcrab.sub, and
// the Boss Hunt intro boss.intro.crankcrab) was "Terror of the Peach Mesas" — the one scary word in the packs. Now a
// rowdy crab, as the Japanese always had it (ピーチメサのあばれガニ). Loaded after every pack, so these win.
// Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const CRAB = [
    'Rowdiest Crab of the Peach Mesas',
    'ピーチメサのあばれガニ',
    '蜜桃台地最闹腾的螃蟹',
    '蜜桃台地最鬧騰的螃蟹',
    '복숭아 메사에서 제일 시끌벅적한 게',
    'Cangrejo revoltoso de las Mesetas Melocotón',
    'Le crabe le plus chahuteur des Mesas Pêche',
    'Die frechste Krabbe der Pfirsich-Mesas',
    'O caranguejo bagunceiro dos Platôs Pêssego',
    'Il granchio birbante degli Altopiani Pesca',
    'Самый шумный краб Персиковых плато',
    'Kepiting paling usil di Mesa Persik',
  ];
  const S = { 'enemy.crankcrab.sub': CRAB, 'boss.intro.crankcrab': CRAB };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_fixactors.js]', e); }
// ---- 93_lang_fixmodes.js
try { (function () {
// Strings for the 1.2 modes fix pass.
//  - Controller prompts in Skydrop Royale (25b_royale_match.js / 25b_royale_hud.js, RY.padT): one sentence each, with
//    {a} {x} {ls} {r3} {map} drawn as the HUD's pad-button glyphs (A, X, left stick, R3, View / Select). The airship
//    map has a controller cursor now (left stick moves it, X marks the landing spot).
//  - Goo Turf intro skip line per device (24f_turf_mode.js): keyboard + mouse and controller wording; touch keeps
//    'turf.skip' ("Tap to skip").
//  - Goo Turf bot names without the random number (24_turf.js T.botNames): "Sparkly Bunny 7" read like an online
//    player's handle.
//  - Race tips with each language's own words for BOOST / DRIFT (the race buttons are icons, so the Latin words matched
//    nothing on screen): the short Hangar tips (race.how.s1/s2) everywhere, and in ja / ko also the long tips, the
//    loading tips and the touch hint, which used the Latin words too.
// Re-registered keys replace the 23b / 24 / 90_* / 92_* wording in every language (this file loads after them; no later
// pack sets them). Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const S = {
    // ---- Skydrop Royale on a controller
    'roy.jumpHintPad': ['Press {a} to drop!', '{a}ボタンでとびおりよう！', '按 {a} 键跳下去！', '按 {a} 鍵跳下去！', '{a} 버튼을 눌러서 뛰어내려요!', '¡Presiona {a} para lanzarte!', 'Appuie sur {a} pour te lancer !', 'Drück {a} zum Absprung!', 'Aperte {a} para saltar!', 'Premi {a} per lanciarti!', 'Жми {a}, чтобы десантироваться!', 'Tekan {a} untuk terjun!'],
    'roy.mapHintPad': ['Move with {ls} · {x} marks a landing spot', '{ls}でうごかして {x}で着地点に目じるし', '用 {ls} 移动 · 按 {x} 标记着陆点', '用 {ls} 移動 · 按 {x} 標記降落地點', '{ls}로 움직이고 {x}로 착지 지점 표시', 'Mueve con {ls} · {x} marca dónde aterrizar', 'Bouge avec {ls} · {x} marque où atterrir', 'Mit {ls} bewegen · {x} markiert den Landepunkt', 'Mova com {ls} · {x} marca onde pousar', 'Muovi con {ls} · {x} segna dove atterrare', '{ls} — двигать · {x} — отметить место высадки', 'Gerakkan dengan {ls} · {x} tandai tempat mendarat'],
    'roy.mapHintPlayPad': ['{r3} marks what you look at · {map} closes the map', '{r3}で見ている場所に目じるし・{map}でとじる', '按 {r3} 标记你看着的地方 · 按 {map} 关闭地图', '按 {r3} 標記你看著的地方 · 按 {map} 關閉地圖', '{r3}로 보고 있는 곳 표시 · {map}로 지도 닫기', '{r3} marca lo que miras · {map} cierra el mapa', '{r3} marque ce que tu regardes · {map} ferme la carte', '{r3} markiert, wohin du schaust · {map} schließt die Karte', '{r3} marca o que você olha · {map} fecha o mapa', '{r3} segna ciò che guardi · {map} chiude la mappa', '{r3} — метка туда, куда смотришь · {map} — закрыть карту', '{r3} menandai yang kamu lihat · {map} menutup peta'],
    // ---- Goo Turf intro: skip line per device
    'turf.skipKb': ['Click or press SPACE to skip', 'クリックかスペースキーでスキップ', '点击或按空格键跳过', '點擊或按空白鍵跳過', '클릭하거나 SPACE를 눌러 건너뛰기', 'Haz clic o presiona ESPACIO para saltar', 'Clique ou appuie sur ESPACE pour passer', 'Klicken oder LEERTASTE zum Überspringen', 'Clique ou aperte ESPAÇO para pular', 'Clicca o premi SPAZIO per saltare', 'Щёлкни или нажми ПРОБЕЛ, чтобы пропустить', 'Klik atau tekan SPASI untuk lewati'],
    'turf.skipPad': ['Press {a} to skip', '{a}ボタンでスキップ', '按 {a} 键跳过', '按 {a} 鍵跳過', '{a} 버튼을 눌러 건너뛰기', 'Presiona {a} para saltar', 'Appuie sur {a} pour passer', '{a} drücken zum Überspringen', 'Aperte {a} para pular', 'Premi {a} per saltare', 'Нажми {a}, чтобы пропустить', 'Tekan {a} untuk lewati'],
    // ---- Goo Turf bot names: adjective + animal, no number
    'turf.botName': ['{adj} {animal}', '{adj}{animal}', '{adj}{animal}', '{adj}{animal}', '{adj} {animal}', '{animal} {adj}', '{animal} {adj}', '{adj} {animal}', '{animal} {adj}', '{animal} {adj}', '{adj} {animal}', '{animal} {adj}'],
    // ---- Hangar race tips (short labels): each language's own words for the BOOST / DRIFT buttons
    'race.how.s1': ['Steer + tap BOOST', 'ハンドル＋ブースト', '转向 + 点加速键', '轉向 + 點「加速」', '조종 + 부스트 탭', 'Gira + toca TURBO', 'Dirige + touche BOOST', 'Lenken + BOOST tippen', 'Vire + toque TURBO', 'Sterza + tocca TURBO', 'Руль + жми УСКОРЕНИЕ', 'Setir + ketuk TURBO'],
    'race.how.s2': ['DRIFT in turns → gold sparks', 'カーブでドリフト→金の火花', '弯道按漂移键 → 金色火花', '彎道按「甩尾」→ 金色火花', '커브에서 드리프트 → 금색 불꽃', 'DERRAPE en curvas → chispas de oro', 'DÉRAPAGE en virage → étincelles', 'DRIFT in Kurven → Goldfunken', 'DERRAPAR nas curvas → faíscas douradas', 'DERAPATA in curva → scintille d’oro', 'ДРИФТ в повороте → искры', 'DRIFT di tikungan → percikan emas'],
  };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
  // Japanese and Korean: the long race tips, loading tips and touch hint said BOOST / DRIFT in Latin letters too
  G.i18n.add('ja', {
    'race.how.1': 'スキフは自動で前にすすむよ。ハンドルとブースト！',
    'race.how.2': 'カーブでドリフトをおして、金の火花ではなそう',
    'race.tip.0': 'ヒント：ドリフトをおしながら曲がって、金の火花でボタンをはなすと大ブースト！',
    'race.tip.3': 'ヒント：GO!が出たしゅんかんにブーストでパーフェクトスタート！',
    'race.hint.touch': 'どこでもドラッグでハンドル・ブーストはエネルギーをつかうよ・ドリフトをおしながら曲がると火花！',
  });
  G.i18n.add('ko', {
    'race.how.1': '스키프는 알아서 앞으로 날아가요. 조종하고 부스트를 탭!',
    'race.how.2': '코너에서 드리프트를 누르고, 금빛 불꽃에서 떼요',
    'race.tip.0': '팁: 조종하면서 드리프트를 꾹 — 금빛 불꽃에서 떼면 엄청난 부스트!',
    'race.tip.3': '팁: GO!가 뜨는 순간 부스트를 탭하면 퍼펙트 스타트!',
    'race.hint.touch': '아무 데나 드래그해서 조종 · 부스트는 에너지 사용 · 드리프트를 누른 채 조종하면 불꽃!',
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_fixmodes.js]', e); }
// ---- 93_lang_fixui.js
try { (function () {
// Strings for the 1.2 UI fix pass: the results "more" button (30_menus.js, a results column that still scrolls on a
// short screen), the control-style cards told as aim help only on a controller (30c_menus_title.js, *P), and calmer
// visit wording with no daily nudge (Penny and Bloop in 30_menus.js, the Fizz Café treat tab in 30b_menus_town.js):
// the treat track and the shop's daily stock stay as they are, the lines just stop asking to come back every day.
// Re-registered keys replace the 90_* wording in every language (this file loads after them; no later pack sets them).
// At the end: Japanese-only name fixes (one name for Goo Turf, one spelling per race track).
// Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const S = {
    // ---- results: the button at the foot of a column that still has more below (30_menus.js)
    'res.more': ['Show more', 'もっと見る', '显示更多', '顯示更多', '더 보기', 'Ver más', 'Voir plus', 'Mehr anzeigen', 'Ver mais', 'Mostra altro', 'Показать ещё', 'Lihat lainnya'],
    // ---- control style on a controller (30c_menus_title.js): aim help only
    'title.preset.easyP': ['Strong aim help. Great for younger Rangers!', 'つよいエイムアシスト。はじめての レンジャーに ぴったり！', '强力瞄准辅助。非常适合小游侠！', '強力瞄準輔助。很適合年紀小的遊俠！', '강한 조준 보조. 어린 레인저에게 딱이에요!', 'Mucha ayuda al apuntar. ¡Ideal para Rangers peques!', 'Forte aide à la visée. Idéal pour les plus jeunes Rangers !', 'Starke Zielhilfe. Super für jüngere Ranger!', 'Ajuda forte na mira. Ótimo para Rangers mais novos!', 'Aiuto mira forte. Perfetto per i Ranger più piccoli!', 'Сильная помощь в прицеливании. Отлично для юных рейнджеров!', 'Bantuan bidik kuat. Cocok untuk Ranger cilik!'],
    'title.preset.classicP': ['Standard aim help for a balanced feel.', 'ふつうのエイムアシスト。バランスの いい そうさだよ。', '标准瞄准辅助，手感均衡。', '標準瞄準輔助，手感均衡。', '보통 조준 보조. 균형 잡힌 조작감이에요.', 'Ayuda al apuntar normal, para un control equilibrado.', 'Aide à la visée standard, pour un bon équilibre.', 'Normale Zielhilfe für ein ausgewogenes Spielgefühl.', 'Ajuda na mira normal, para um controle equilibrado.', 'Aiuto mira normale, per un controllo equilibrato.', 'Стандартная помощь в прицеливании — сбалансированное управление.', 'Bantuan bidik standar untuk kendali yang seimbang.'],
    'title.preset.proP': ['Light aim help. For sharpshooters!', 'エイムアシストは ひかえめ。うでじまんの レンジャーに！', '轻度瞄准辅助。神射手专用！', '輕度瞄準輔助。給神射手！', '약한 조준 보조. 명사수를 위한 설정!', 'Poca ayuda al apuntar. ¡Para gente con buena puntería!', 'Légère aide à la visée. Pour les as de la visée !', 'Leichte Zielhilfe. Für Meisterschützen!', 'Pouca ajuda na mira. Para quem tem mira afiada!', 'Aiuto mira leggero. Per chi ha una mira infallibile!', 'Слабая помощь в прицеливании. Для метких стрелков!', 'Bantuan bidik ringan. Untuk penembak jitu!'],
    // ---- no daily nudges (30_menus.js NPC lines, 30b_menus_town.js café)
    'npc.penny.l3': ['Rare goodies restock each day, but there’s no rush. Drop by whenever you like!', 'レアなものは まいにち すこしずつ 入荷するよ。いそがなくて いいから、すきなときに 来てね！', '稀有好货每天都会补一点，不用急，想来就来逛逛吧！', '稀有好貨每天都會補一點，不用急，想來就來逛逛吧！', '희귀한 물건은 매일 조금씩 들어와요. 서두를 필요 없으니 언제든 편할 때 들러요!', 'Las cosas raras se reponen cada día, pero sin prisa. ¡Pásate cuando quieras!', 'Les trucs rares reviennent chaque jour, mais rien ne presse. Passe quand tu veux !', 'Seltene Sachen kommen jeden Tag nach, aber keine Eile. Schau vorbei, wann immer du magst!', 'As coisas raras voltam ao estoque todo dia, mas sem pressa. Dá um pulinho aqui quando quiser!', 'La roba rara si rifornisce ogni giorno, ma senza fretta. Passa quando vuoi!', 'Редкие штуки понемногу пополняются каждый день, но спешить некуда. Заглядывай, когда захочешь!', 'Barang langka diisi ulang tiap hari, tapi tidak usah buru-buru. Mampir kapan saja kamu mau!'],
    'npc.bloop.l2': ['There’s a free treat for you on each day you play... no hurry, it always waits for you...', 'あそんだ日には むりょうの おやつが あるよ…… いそがなくても ずっと まってるよ……', '你来玩的每一天都有一份免费点心……不用急，它会一直等你……', '你來玩的每一天都有一份免費點心……不用急，它會一直等你……', '플레이하는 날마다 공짜 간식이 있어요... 서두르지 않아도 돼요, 늘 기다리고 있을게요...', 'Cada día que juegas hay un regalito gratis para ti... sin prisa, siempre te espera...', 'Chaque jour où tu joues, une friandise gratuite t’attend... rien ne presse, elle t’attendra...', 'An jedem Tag, an dem du spielst, wartet eine Gratis-Leckerei auf dich... keine Eile, sie läuft nicht weg...', 'Todo dia que você joga tem um mimo grátis para você... sem pressa, ele sempre espera...', 'Ogni giorno in cui giochi c’è uno spuntino gratis per te... senza fretta, ti aspetta sempre...', 'В каждый день, когда ты играешь, тебя ждёт бесплатное угощение... не спеши, оно никуда не денется...', 'Setiap hari kamu bermain, ada camilan gratis untukmu... tidak usah buru-buru, camilannya selalu menunggu...'],
    'menu.c.sayDone': ['...that was today’s treat... the next one will wait for you, no hurry...', '……きょうの おやつは おしまい…… つぎのは ちゃんと まってるからね……', '……今天的点心就到这里……下一份会等着你，不用急……', '……今天的點心就到這裡……下一份會等著你，不用急……', '...오늘 간식은 그게 다예요... 다음 간식은 기다리고 있을게요, 천천히 와요...', '...ese fue el regalito de hoy... el próximo te esperará, sin prisa...', '...c’était la friandise du jour... la prochaine t’attendra, rien ne presse...', '...das war die Leckerei für heute... die nächste wartet auf dich, ganz ohne Eile...', '...esse foi o mimo de hoje... o próximo vai te esperar, sem pressa...', '...questo era lo spuntino di oggi... il prossimo ti aspetterà, senza fretta...', '...это было сегодняшнее угощение... следующее тебя дождётся, не спеши...', '...itu camilan hari ini... yang berikutnya akan menunggumu, santai saja...'],
    'menu.c.tomorrow': ['All done for today!', 'きょうの ぶんは もらったよ！', '今天的已经领过啦！', '今天的已經領過囉！', '오늘 몫은 받았어요!', '¡Listo por hoy!', 'C’est fait pour aujourd’hui !', 'Für heute erledigt!', 'Tudo certo por hoje!', 'Fatto per oggi!', 'На сегодня всё!', 'Sudah diambil hari ini!'],
    'menu.c.treatNote': ['One treat per day you play. Skipping days never resets your track, so there’s no rush!', 'おやつは あそんだ日に 1つずつ。休んでも リセットされないから、いそがなくて だいじょうぶ！', '每个游玩日可领一份点心。中间隔几天也不会重置进度，不用着急！', '每個遊玩日可領一份點心。中間隔幾天也不會重置進度，不用著急！', '플레이하는 날마다 간식 하나. 며칠 쉬어도 진행이 초기화되지 않으니 서두르지 않아도 돼요!', 'Un regalito por cada día que juegas. Saltarte días nunca reinicia tu progreso, ¡así que sin prisa!', 'Une friandise par jour de jeu. Sauter des jours ne remet jamais ta progression à zéro, alors rien ne presse !', 'Eine Leckerei pro Spieltag. Pausen setzen deinen Fortschritt nie zurück, also ganz ohne Eile!', 'Um mimo por dia em que você joga. Pular dias nunca zera seu progresso, então sem pressa!', 'Uno spuntino per ogni giorno in cui giochi. Saltare dei giorni non azzera mai i tuoi progressi, quindi niente fretta!', 'Одно угощение за каждый игровой день. Пропуски никогда не сбрасывают прогресс, так что спешить некуда!', 'Satu camilan untuk setiap hari kamu bermain. Melewatkan hari tidak pernah mengulang progresmu, jadi santai saja!'],
  };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
  // Japanese names, one form each: Goo Turf is グーターフ everywhere (it was also グーぬりバトル in the turf lobby and
  // title), and the Hangar's track cards use the race's ・ spelling (13_data.js wrote the same names without it).
  G.i18n.add('ja', {
    'turf.title': 'グーターフ', 'turf.lobby.title': 'グーターフ',
    'track.coral_loop.name': 'コーラル・コメットループ', 'track.mesa_run.name': 'メサ・メテオラン', 'track.glowcap_gauntlet.name': 'グロウキャップ・ガントレット',
    'track.frostfizz_spiral.name': 'フロストフィズ・スパイラル', 'track.junkyard_jumpline.name': 'ジャンクヤード・ジャンプライン', 'track.sunbeam_speedway.name': 'サンビーム・スピードウェイ',
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_fixui.js]', e); }
// ---- 93_lang_fixworld.js
try { (function () {
// Strings for the world-cluster fixes: leaving a Boss Hunt / Expedition run that is already won (boss popped, balloon
// lifting off, before the results) keeps the win — the pause menu's Return to Town confirm says so (exp.quitWon) and
// the next place confirms it (exp.quit.won; 21_expedition X.winToast).
// Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const S = {
    'exp.quitWon': [
      'Head back to town? This win is already yours: you keep all of its rewards!',
      'タウンにもどる？ このかちは もうきまり！ ごほうびは ぜんぶ もらえるよ！',
      '要回小镇吗？这场胜利已经是你的了，奖励全部保留！',
      '要回城鎮嗎？這場勝利已經是你的了，獎勵全部保留！',
      '마을로 돌아갈까요? 이번 승리는 이미 당신 거예요. 보상도 전부 받아요!',
      '¿Volver al pueblo? Esta victoria ya es tuya: ¡te quedas con todas sus recompensas!',
      'Rentrer en ville ? Cette victoire est déjà à toi : tu gardes toutes ses récompenses !',
      'Zurück in die Stadt? Dieser Sieg gehört dir schon: Du behältst alle Belohnungen!',
      'Voltar para a cidade? Esta vitória já é sua: você fica com todas as recompensas!',
      'Tornare in città? Questa vittoria è già tua: tieni tutte le ricompense!',
      'Вернуться в город? Эта победа уже твоя: все награды останутся у тебя!',
      'Kembali ke kota? Kemenangan ini sudah jadi milikmu: semua hadiahnya tetap kamu dapat!',
    ],
    'exp.quit.won': [
      'Win saved! Your rewards are already in your pack.',
      'かちを セーブしたよ！ ごほうびは もう バッグの中！',
      '胜利已保存！奖励已经放进你的背包啦。',
      '勝利已儲存！獎勵已經放進你的背包囉。',
      '승리를 저장했어요! 보상은 이미 가방에 들어 있어요.',
      '¡Victoria guardada! Tus recompensas ya están en tu mochila.',
      'Victoire enregistrée ! Tes récompenses sont déjà dans ton sac.',
      'Sieg gespeichert! Deine Belohnungen sind schon in deinem Rucksack.',
      'Vitória salva! Suas recompensas já estão na sua mochila.',
      'Vittoria salvata! Le tue ricompense sono già nello zaino.',
      'Победа сохранена! Награды уже у тебя в рюкзаке.',
      'Kemenangan tersimpan! Hadiahmu sudah ada di tasmu.',
    ],
  };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_fixworld.js]', e); }
// ---- 93_lang_loop.js
try { (function () {
// Strings for the first-loop pass (results → rewards/unlocks → next sortie): unlock hints (G.Progress.unlockHint),
// the results bonus chips and "New in Fizzport!" card, Next mission / Next boss buttons, the quit confirm + quit
// summary toast, the expedition next-action line, and Mission Board extras (lock reasons, More options, medals).
// Also re-registers strings whose meaning changed with the staged unlocks (hub lock lines, Daily quests lock,
// pause quit line) and the Japanese Glowcap boss subtitle (one region name everywhere). Loads after the 90_*
// language packs, so these override them.
(function (G) {
  const S = {
    en: {
      'unlock.hint.m1': 'Opens after 1 more mission', 'unlock.hint.mn': 'Opens after {n} more missions',
      'unlock.hint.pr': 'Opens at Player Rank {n}', 'unlock.hint.guild': 'Opens at Guild Rank ★{n}', 'unlock.hint.story': 'Beat it in the story first',
      'res.rankBonus': 'Rank-up bonus', 'res.stickerBonus': 'Sticker bonus', 'res.newTitle': 'New in Fizzport!', 'res.goThere': 'Go there', 'res.newMore': '+{n} more',
      'res.nextMission': 'Next mission', 'res.board': 'Mission Board', 'res.nextBoss': 'Next boss', 'res.bossList': 'Boss Hunt',
      'exp.quit.kept': 'Back in town! Clinks kept: {c} · Parts kept: {p}', 'exp.quit.none': 'Back in town! No loot this time.',
      'exp.quit.keptRestart': 'Fresh start! Kept from the last try: {c} Clinks · {p} parts',
      'prog.codexNewN': '{n} new Codex entries!',
      'exp.quitConfirm': 'Head back to town? You keep every Clink you picked up and half of your parts.',
      'exp.next.marker': 'Follow the yellow marker!', 'exp.next.pop': 'Pop the bots!', 'exp.next.parts': 'Pop bots for {part}!',
      'exp.next.totem': 'Follow the totem marker!', 'exp.next.cage': 'Follow the cage marker!',
      'exp.next.cart': 'Stay next to the cart!', 'exp.next.fix': 'Stand by the cart to fix it!', 'exp.next.beam': 'Climb to the blue beam!',
      'exp.next.camp': 'Follow the crown marker!', 'exp.next.lair': 'Follow the boss marker!', 'exp.next.boss': 'Hit the glowing weak spots!',
      'exp.next.balloon': 'Run to the lift-off balloon!', 'exp.next.pad': 'Stand on the glowing pad!', 'exp.next.stay': 'Stay on the pad!',
      'exp.lockedAfter': 'Clear “{name}” first', 'exp.moreOpts': 'More options', 'exp.lessOpts': 'Fewer options',
      'exp.medals': 'Medals', 'exp.medal.b': 'Clear',
      'exp.medal.rule': 'Points: 1,000 for a clear, +300 for the bonus goal and each Star Sprocket, +2 for every second under par ({t}), −100 for each bonk.',
      'pause.quitConfirm': 'Head back to town now? This round ends here.',
      'hub.lock.workshop': 'The Workshop opens after your first mission. Let\'s go pop some bots!', 'hub.lock.shop': 'The Pop Shop opens after your first mission.',
      'hub.lock.hangar': 'The Hangar opens after 2 missions.', 'hub.lock.arena': 'The Arena Gate opens after 2 missions.',
      'hub.lock.defense': 'The Guard Post opens after 3 missions.', 'hub.lock.cafe': 'The Fizz Café opens after 3 missions.',
      'hub.lock.gallery': 'The Gallery opens after 4 missions.', 'hub.lock.royale': 'The Royale Tower opens after 4 missions.',
      'menu.g.dailyLocked': 'Daily quests open after 3 missions.',
      'enemy.buzzhive.sub': 'Ruler of Glowcap Grotto',
    },
    ja: {
      'unlock.hint.m1': 'あと1ミッションでひらくよ', 'unlock.hint.mn': 'あと{n}ミッションでひらくよ',
      'unlock.hint.pr': 'プレイヤーランク{n}でひらくよ', 'unlock.hint.guild': 'ギルドランク★{n}でひらくよ', 'unlock.hint.story': 'まずはストーリーでたおそう',
      'res.rankBonus': 'ランクアップボーナス', 'res.stickerBonus': 'ステッカーボーナス', 'res.newTitle': 'フィズポートにニューオープン！', 'res.goThere': 'いってみる', 'res.newMore': 'ほか{n}こ',
      'res.nextMission': 'つぎのミッション', 'res.board': 'ミッションボード', 'res.nextBoss': 'つぎのボス', 'res.bossList': 'ボスハント',
      'exp.quit.kept': 'タウンにもどったよ！ もちかえり：クリンク{c}・パーツ{p}こ', 'exp.quit.none': 'タウンにもどったよ！ こんかいは おたからなし。',
      'exp.quit.keptRestart': 'もういちど スタート！ さっきの もちかえり：クリンク{c}・パーツ{p}こ',
      'prog.codexNewN': 'ずかんに {n}しゅるい とうろく！',
      'exp.quitConfirm': 'タウンにもどる？ ひろったクリンクは ぜんぶ、パーツは はんぶん もちかえれるよ。',
      'exp.next.marker': 'きいろいマーカーへ すすもう！', 'exp.next.pop': 'ボットを ポップしよう！', 'exp.next.parts': 'ボットから {part}を ゲット！',
      'exp.next.totem': 'トーテムの マーカーへ！', 'exp.next.cage': 'おりの マーカーへ！',
      'exp.next.cart': 'カートの そばに いよう！', 'exp.next.fix': 'カートの そばで なおそう！', 'exp.next.beam': 'あおい ひかりへ のぼろう！',
      'exp.next.camp': 'かんむりマーカーへ！', 'exp.next.lair': 'ボスの マーカーへ！', 'exp.next.boss': 'ひかる じゃくてんを ねらえ！',
      'exp.next.balloon': 'バルーンへ いそごう！', 'exp.next.pad': 'ひかる パッドに のろう！', 'exp.next.stay': 'パッドの うえに いてね！',
      'exp.lockedAfter': '「{name}」を クリアすると ひらくよ', 'exp.moreOpts': 'もっと せってい', 'exp.lessOpts': 'せっていを とじる',
      'exp.medals': 'メダル', 'exp.medal.b': 'クリア',
      'exp.medal.rule': 'ポイント：クリアで 1,000、ボーナスと スタースプロケット 1こごとに +300、めやす（{t}）より 1びょう はやいごとに +2、ボンッ 1かいで −100。',
      'pause.quitConfirm': 'タウンにもどる？ このラウンドは ここで おわりだよ。',
      'hub.lock.workshop': 'ワークショップは はじめてのミッションのあとに ひらくよ。ロボをポンしに行こう！', 'hub.lock.shop': 'ポップショップは はじめてのミッションのあとに ひらくよ。',
      'hub.lock.hangar': 'ハンガーは ミッション2かいで ひらくよ。', 'hub.lock.arena': 'アリーナゲートは ミッション2かいで ひらくよ。',
      'hub.lock.defense': 'ガードポストは ミッション3かいで ひらくよ。', 'hub.lock.cafe': 'フィズカフェは ミッション3かいで ひらくよ。',
      'hub.lock.gallery': 'ギャラリーは ミッション4かいで ひらくよ。', 'hub.lock.royale': 'ロワイヤルタワーは ミッション4かいで ひらくよ。',
      'menu.g.dailyLocked': 'デイリークエストは ミッション3かいで ひらくよ。',
      'enemy.buzzhive.sub': 'ヒカリタケのもりの女王',
    },
    'zh-Hans': {
      'unlock.hint.m1': '再完成 1 次任务就开放', 'unlock.hint.mn': '再完成 {n} 次任务就开放',
      'unlock.hint.pr': '玩家等级 {n} 开放', 'unlock.hint.guild': '公会★{n} 开放', 'unlock.hint.story': '先在故事里打败它',
      'res.rankBonus': '升级奖励', 'res.stickerBonus': '贴纸奖励', 'res.newTitle': '气泡港新开放！', 'res.goThere': '去看看', 'res.newMore': '还有 {n} 个',
      'res.nextMission': '下一个任务', 'res.board': '任务板', 'res.nextBoss': '下一个首领', 'res.bossList': '首领挑战',
      'exp.quit.kept': '回到小镇啦！保留叮当币：{c} · 保留零件：{p}', 'exp.quit.none': '回到小镇啦！这次没有战利品。',
      'exp.quit.keptRestart': '重新出发！上一次保留：叮当币 {c} · 零件 {p}',
      'prog.codexNewN': '图鉴新增 {n} 个条目！',
      'exp.quitConfirm': '要回小镇吗？捡到的叮当币全部保留，零件保留一半。',
      'exp.next.marker': '跟着黄色标记走！', 'exp.next.pop': '砰掉机器人！', 'exp.next.parts': '打倒机器人，收集{part}！',
      'exp.next.totem': '跟着图腾标记走！', 'exp.next.cage': '跟着笼子标记走！',
      'exp.next.cart': '待在推车旁边！', 'exp.next.fix': '站在推车旁修好它！', 'exp.next.beam': '爬到蓝色光柱那里！',
      'exp.next.camp': '跟着王冠标记走！', 'exp.next.lair': '跟着首领标记走！', 'exp.next.boss': '瞄准发光的弱点！',
      'exp.next.balloon': '快去起飞气球那里！', 'exp.next.pad': '站到发光的平台上！', 'exp.next.stay': '待在平台上别走开！',
      'exp.lockedAfter': '先通关“{name}”', 'exp.moreOpts': '更多选项', 'exp.lessOpts': '收起选项',
      'exp.medals': '奖牌', 'exp.medal.b': '通关',
      'exp.medal.rule': '得分：通关 1,000 分；完成额外挑战和每个星星齿轮 +300；比目标时间（{t}）每快 1 秒 +2；每被咚一次 −100。',
      'pause.quitConfirm': '现在回小镇吗？这一局就到此结束。',
      'hub.lock.workshop': '完成第一个任务后，工坊就会开放。我们去砰几个机器人吧！', 'hub.lock.shop': '完成第一个任务后，砰砰商店就会开放。',
      'hub.lock.hangar': '完成 2 次任务后，机库就会开放。', 'hub.lock.arena': '完成 2 次任务后，竞技场大门就会开放。',
      'hub.lock.defense': '完成 3 次任务后，守卫岗就会开放。', 'hub.lock.cafe': '完成 3 次任务后，气泡咖啡馆就会开放。',
      'hub.lock.gallery': '完成 4 次任务后，展览馆就会开放。', 'hub.lock.royale': '完成 4 次任务后，乱斗塔就会开放。',
      'menu.g.dailyLocked': '完成 3 次任务后，每日委托就会开放。',
      'enemy.buzzhive.sub': '荧光菇洞窟的女王',
    },
    'zh-Hant': {
      'unlock.hint.m1': '再完成 1 次任務就開放', 'unlock.hint.mn': '再完成 {n} 次任務就開放',
      'unlock.hint.pr': '玩家等級 {n} 開放', 'unlock.hint.guild': '公會 ★{n} 開放', 'unlock.hint.story': '先在故事模式中擊敗它',
      'res.rankBonus': '升級獎勵', 'res.stickerBonus': '貼紙獎勵', 'res.newTitle': '氣泡港新開幕！', 'res.goThere': '去看看', 'res.newMore': '還有 {n} 個',
      'res.nextMission': '下一個任務', 'res.board': '任務看板', 'res.nextBoss': '下一個頭目', 'res.bossList': '頭目狩獵',
      'exp.quit.kept': '回到城鎮了！保留叮噹幣：{c} · 保留零件：{p}', 'exp.quit.none': '回到城鎮了！這次沒有戰利品。',
      'exp.quit.keptRestart': '重新出發！上一次保留：叮噹幣 {c} · 零件 {p}',
      'prog.codexNewN': '圖鑑新增 {n} 個項目！',
      'exp.quitConfirm': '要回城鎮嗎？撿到的叮噹幣全部保留，零件保留一半。',
      'exp.next.marker': '跟著黃色標記走！', 'exp.next.pop': '砰掉機器人！', 'exp.next.parts': '打倒機器人，收集{part}！',
      'exp.next.totem': '跟著圖騰標記走！', 'exp.next.cage': '跟著籠子標記走！',
      'exp.next.cart': '待在推車旁邊！', 'exp.next.fix': '站在推車旁修好它！', 'exp.next.beam': '爬到藍色光柱那裡！',
      'exp.next.camp': '跟著王冠標記走！', 'exp.next.lair': '跟著頭目標記走！', 'exp.next.boss': '瞄準發光的弱點！',
      'exp.next.balloon': '快去升空氣球那裡！', 'exp.next.pad': '站到發光的平台上！', 'exp.next.stay': '待在平台上別走開！',
      'exp.lockedAfter': '先完成「{name}」', 'exp.moreOpts': '更多選項', 'exp.lessOpts': '收起選項',
      'exp.medals': '獎牌', 'exp.medal.b': '過關',
      'exp.medal.rule': '分數：過關 1,000 分；完成額外挑戰和每個星星齒輪 +300；比目標時間（{t}）每快 1 秒 +2；每被咚一次 −100。',
      'pause.quitConfirm': '現在回城鎮嗎？這一局就到此結束。',
      'hub.lock.workshop': '完成第一個任務後，工作坊就會開放。我們去砰機器人吧！', 'hub.lock.shop': '完成第一個任務後，砰砰商店就會開放。',
      'hub.lock.hangar': '完成 2 次任務後，機庫就會開放。', 'hub.lock.arena': '完成 2 次任務後，競技場大門就會開放。',
      'hub.lock.defense': '完成 3 次任務後，守衛站就會開放。', 'hub.lock.cafe': '完成 3 次任務後，氣泡咖啡館就會開放。',
      'hub.lock.gallery': '完成 4 次任務後，展覽館就會開放。', 'hub.lock.royale': '完成 4 次任務後，大亂鬥塔就會開放。',
      'menu.g.dailyLocked': '完成 3 次任務後，每日任務就會開放。',
      'enemy.buzzhive.sub': '螢光菇洞窟的統治者',
    },
    ko: {
      'unlock.hint.m1': '미션 1번 더 하면 열려요', 'unlock.hint.mn': '미션 {n}번 더 하면 열려요',
      'unlock.hint.pr': '플레이어 랭크 {n}에서 열려요', 'unlock.hint.guild': '길드 랭크 ★{n}에서 열려요', 'unlock.hint.story': '먼저 스토리에서 물리쳐요',
      'res.rankBonus': '랭크 업 보너스', 'res.stickerBonus': '스티커 보너스', 'res.newTitle': '피즈포트에 새로 열렸어요!', 'res.goThere': '가 보기', 'res.newMore': '{n}개 더',
      'res.nextMission': '다음 미션', 'res.board': '미션 게시판', 'res.nextBoss': '다음 보스', 'res.bossList': '보스 헌트',
      'exp.quit.kept': '마을로 돌아왔어요! 챙긴 클링크: {c} · 챙긴 부품: {p}', 'exp.quit.none': '마을로 돌아왔어요! 이번엔 전리품이 없어요.',
      'exp.quit.keptRestart': '다시 출발! 지난 도전에서 챙긴 클링크: {c} · 부품: {p}',
      'prog.codexNewN': '도감에 새 항목 {n}개!',
      'exp.quitConfirm': '마을로 돌아갈까요? 주운 클링크는 전부, 부품은 절반을 가져가요.',
      'exp.next.marker': '노란 표시를 따라가요!', 'exp.next.pop': '봇을 터뜨려요!', 'exp.next.parts': '봇을 터뜨려 {part} 모으기!',
      'exp.next.totem': '토템 표시를 따라가요!', 'exp.next.cage': '우리 표시를 따라가요!',
      'exp.next.cart': '수레 옆에 있어요!', 'exp.next.fix': '수레 옆에서 고쳐요!', 'exp.next.beam': '파란 빛기둥까지 올라가요!',
      'exp.next.camp': '왕관 표시를 따라가요!', 'exp.next.lair': '보스 표시를 따라가요!', 'exp.next.boss': '빛나는 약점을 노려요!',
      'exp.next.balloon': '이륙 풍선으로 달려가요!', 'exp.next.pad': '빛나는 발판에 서요!', 'exp.next.stay': '발판 위에 있어요!',
      'exp.lockedAfter': '먼저 “{name}” 깨기', 'exp.moreOpts': '옵션 더 보기', 'exp.lessOpts': '옵션 접기',
      'exp.medals': '메달', 'exp.medal.b': '클리어',
      'exp.medal.rule': '점수: 클리어하면 1,000점, 보너스 목표와 스타 스프로킷 하나마다 +300, 기준 시간({t})보다 1초 빠를 때마다 +2, 꽈당할 때마다 −100.',
      'pause.quitConfirm': '지금 마을로 돌아갈까요? 이번 판은 여기서 끝나요.',
      'hub.lock.workshop': '공방은 첫 미션을 마치면 열려요. 봇을 터뜨리러 가요!', 'hub.lock.shop': '팡팡 상점은 첫 미션을 마치면 열려요.',
      'hub.lock.hangar': '격납고는 미션 2번을 마치면 열려요.', 'hub.lock.arena': '아레나 게이트는 미션 2번을 마치면 열려요.',
      'hub.lock.defense': '수비 초소는 미션 3번을 마치면 열려요.', 'hub.lock.cafe': '피즈 카페는 미션 3번을 마치면 열려요.',
      'hub.lock.gallery': '갤러리는 미션 4번을 마치면 열려요.', 'hub.lock.royale': '로열 타워는 미션 4번을 마치면 열려요.',
      'menu.g.dailyLocked': '데일리 퀘스트는 미션 3번을 마치면 열려요.',
      'enemy.buzzhive.sub': '반짝버섯 동굴의 지배자',
    },
    es: {
      'unlock.hint.m1': 'Se abre tras 1 misión más', 'unlock.hint.mn': 'Se abre tras {n} misiones más',
      'unlock.hint.pr': 'Se abre en el Rango de jugador {n}', 'unlock.hint.guild': 'Se abre en Gremio ★{n}', 'unlock.hint.story': 'Primero derrótalo en la historia',
      'res.rankBonus': 'Bonus de rango', 'res.stickerBonus': 'Bonus de pegatina', 'res.newTitle': '¡Novedades en Fizzport!', 'res.goThere': 'Ir allí', 'res.newMore': '+{n} más',
      'res.nextMission': 'Siguiente misión', 'res.board': 'Tablón de Misiones', 'res.nextBoss': 'Siguiente jefe', 'res.bossList': 'Caza de Jefes',
      'exp.quit.kept': '¡De vuelta al pueblo! Clinks guardados: {c} · Piezas guardadas: {p}', 'exp.quit.none': '¡De vuelta al pueblo! Esta vez no hay botín.',
      'exp.quit.keptRestart': '¡Empezamos de nuevo! Del intento anterior guardaste: {c} Clinks · {p} piezas',
      'prog.codexNewN': '¡{n} entradas nuevas en el Códex!',
      'exp.quitConfirm': '¿Volver al pueblo? Te quedas con todos los Clinks que recogiste y con la mitad de las piezas.',
      'exp.next.marker': '¡Sigue el marcador amarillo!', 'exp.next.pop': '¡Revienta los bots!', 'exp.next.parts': '¡Busca {part} en los bots!',
      'exp.next.totem': '¡Sigue el marcador del tótem!', 'exp.next.cage': '¡Sigue el marcador de la jaula!',
      'exp.next.cart': '¡Quédate junto al carrito!', 'exp.next.fix': '¡Repara el carrito!', 'exp.next.beam': '¡Sube hasta el rayo azul!',
      'exp.next.camp': '¡Sigue el marcador de la corona!', 'exp.next.lair': '¡Sigue el marcador del jefe!', 'exp.next.boss': '¡Apunta a los puntos brillantes!',
      'exp.next.balloon': '¡Corre al globo de despegue!', 'exp.next.pad': '¡Súbete a la plataforma!', 'exp.next.stay': '¡Quédate en la plataforma!',
      'exp.lockedAfter': 'Primero supera «{name}»', 'exp.moreOpts': 'Más opciones', 'exp.lessOpts': 'Menos opciones',
      'exp.medals': 'Medallas', 'exp.medal.b': 'Superada',
      'exp.medal.rule': 'Puntos: 1.000 por superarla, +300 por el extra y por cada Star Sprocket, +2 por cada segundo bajo la marca ({t}), −100 por cada coscorrón.',
      'pause.quitConfirm': '¿Volver al pueblo ahora? Esta ronda termina aquí.',
      'hub.lock.workshop': 'El Taller se abre después de tu primera misión. ¡Vamos a reventar unos bots!', 'hub.lock.shop': 'La Tienda Pop se abre después de tu primera misión.',
      'hub.lock.hangar': 'El Hangar se abre tras 2 misiones.', 'hub.lock.arena': 'La Puerta de la Arena se abre tras 2 misiones.',
      'hub.lock.defense': 'El Puesto de Guardia se abre tras 3 misiones.', 'hub.lock.cafe': 'El Café Fizz se abre tras 3 misiones.',
      'hub.lock.gallery': 'La Galería se abre tras 4 misiones.', 'hub.lock.royale': 'La Torre Royale se abre tras 4 misiones.',
      'menu.g.dailyLocked': 'Los encargos diarios se abren tras 3 misiones.',
      'enemy.buzzhive.sub': 'Soberana de la Gruta Hongoluz',
    },
    fr: {
      'unlock.hint.m1': 'Ouvre après encore 1 mission', 'unlock.hint.mn': 'Ouvre après encore {n} missions',
      'unlock.hint.pr': 'Ouvre au Rang Joueur {n}', 'unlock.hint.guild': 'Ouvre au rang de Guilde ★{n}', 'unlock.hint.story': 'Bats-le d\'abord dans l\'histoire',
      'res.rankBonus': 'Bonus de rang', 'res.stickerBonus': 'Bonus d\'autocollant', 'res.newTitle': 'Nouveau à Fizzport !', 'res.goThere': 'Y aller', 'res.newMore': '+{n} autres',
      'res.nextMission': 'Mission suivante', 'res.board': 'Tableau des missions', 'res.nextBoss': 'Boss suivant', 'res.bossList': 'Chasse aux boss',
      'exp.quit.kept': 'De retour en ville ! Clinks gardés : {c} · Pièces gardées : {p}', 'exp.quit.none': 'De retour en ville ! Pas de butin cette fois.',
      'exp.quit.keptRestart': 'C\'est reparti ! Gardé de l\'essai précédent : {c} Clinks · {p} pièces',
      'prog.codexNewN': '{n} nouvelles entrées du Codex !',
      'exp.quitConfirm': 'Rentrer en ville ? Tu gardes tous les Clinks ramassés et la moitié de tes pièces.',
      'exp.next.marker': 'Suis le marqueur jaune !', 'exp.next.pop': 'Éclate les bots !', 'exp.next.parts': 'Éclate des bots : {part} !',
      'exp.next.totem': 'Suis le marqueur du totem !', 'exp.next.cage': 'Suis le marqueur de la cage !',
      'exp.next.cart': 'Reste près du chariot !', 'exp.next.fix': 'Répare le chariot !', 'exp.next.beam': 'Grimpe jusqu\'au rayon bleu !',
      'exp.next.camp': 'Suis le marqueur couronne !', 'exp.next.lair': 'Suis le marqueur du boss !', 'exp.next.boss': 'Vise les points lumineux !',
      'exp.next.balloon': 'Cours vers le ballon !', 'exp.next.pad': 'Monte sur la plateforme !', 'exp.next.stay': 'Reste sur la plateforme !',
      'exp.lockedAfter': 'Termine d\'abord « {name} »', 'exp.moreOpts': 'Plus d\'options', 'exp.lessOpts': 'Moins d\'options',
      'exp.medals': 'Médailles', 'exp.medal.b': 'Réussie',
      'exp.medal.rule': 'Points : 1 000 pour une réussite, +300 pour le bonus et chaque Star Sprocket, +2 par seconde sous la cible ({t}), −100 par K.O.',
      'pause.quitConfirm': 'Rentrer en ville maintenant ? Cette manche s\'arrête ici.',
      'hub.lock.workshop': 'L\'Atelier ouvre après ta première mission. Allons éclater des bots !', 'hub.lock.shop': 'La Boutique Pop ouvre après ta première mission.',
      'hub.lock.hangar': 'Le Hangar ouvre après 2 missions.', 'hub.lock.arena': 'La Porte de l\'Arène ouvre après 2 missions.',
      'hub.lock.defense': 'Le Poste de garde ouvre après 3 missions.', 'hub.lock.cafe': 'Le Café Pétillant ouvre après 3 missions.',
      'hub.lock.gallery': 'La Galerie ouvre après 4 missions.', 'hub.lock.royale': 'La Tour Royale ouvre après 4 missions.',
      'menu.g.dailyLocked': 'Les quêtes du jour ouvrent après 3 missions.',
      'enemy.buzzhive.sub': 'Souveraine de la Grotte Champilume',
    },
    de: {
      'unlock.hint.m1': 'Öffnet nach 1 weiteren Mission', 'unlock.hint.mn': 'Öffnet nach {n} weiteren Missionen',
      'unlock.hint.pr': 'Öffnet ab Spielerrang {n}', 'unlock.hint.guild': 'Öffnet ab Gildenrang ★{n}', 'unlock.hint.story': 'Erst in der Story besiegen',
      'res.rankBonus': 'Rang-Bonus', 'res.stickerBonus': 'Sticker-Bonus', 'res.newTitle': 'Neu in Fizzport!', 'res.goThere': 'Hingehen', 'res.newMore': '+{n} weitere',
      'res.nextMission': 'Nächste Mission', 'res.board': 'Missionstafel', 'res.nextBoss': 'Nächster Boss', 'res.bossList': 'Bossjagd',
      'exp.quit.kept': 'Zurück in der Stadt! Behaltene Clinks: {c} · Behaltene Teile: {p}', 'exp.quit.none': 'Zurück in der Stadt! Diesmal keine Beute.',
      'exp.quit.keptRestart': 'Neuer Start! Vom letzten Versuch behalten: {c} Clinks · {p} Teile',
      'prog.codexNewN': '{n} neue Lexikon-Einträge!',
      'exp.quitConfirm': 'Zurück in die Stadt? Du behältst alle gesammelten Clinks und die Hälfte deiner Teile.',
      'exp.next.marker': 'Folge der gelben Markierung!', 'exp.next.pop': 'Plopp die Bots!', 'exp.next.parts': 'Hol {part} von Bots!',
      'exp.next.totem': 'Folge der Totem-Markierung!', 'exp.next.cage': 'Folge der Käfig-Markierung!',
      'exp.next.cart': 'Bleib beim Karren!', 'exp.next.fix': 'Repariere den Karren!', 'exp.next.beam': 'Kletter zum blauen Strahl!',
      'exp.next.camp': 'Folge der Kronen-Markierung!', 'exp.next.lair': 'Folge der Boss-Markierung!', 'exp.next.boss': 'Ziel auf die Leuchtpunkte!',
      'exp.next.balloon': 'Lauf zum Startballon!', 'exp.next.pad': 'Stell dich aufs Leuchtfeld!', 'exp.next.stay': 'Bleib auf dem Feld!',
      'exp.lockedAfter': 'Schaff zuerst „{name}“', 'exp.moreOpts': 'Mehr Optionen', 'exp.lessOpts': 'Weniger Optionen',
      'exp.medals': 'Medaillen', 'exp.medal.b': 'Geschafft',
      'exp.medal.rule': 'Punkte: 1.000 fürs Schaffen, +300 für das Bonusziel und jeden Star Sprocket, +2 für jede Sekunde unter der Richtzeit ({t}), −100 fürs Umgehauen-Werden.',
      'pause.quitConfirm': 'Jetzt zurück in die Stadt? Diese Runde endet hier.',
      'hub.lock.workshop': 'Die Werkstatt öffnet nach deiner ersten Mission. Lass uns ein paar Bots ploppen!', 'hub.lock.shop': 'Der Plopp-Shop öffnet nach deiner ersten Mission.',
      'hub.lock.hangar': 'Der Hangar öffnet nach 2 Missionen.', 'hub.lock.arena': 'Das Arena-Tor öffnet nach 2 Missionen.',
      'hub.lock.defense': 'Der Wachposten öffnet nach 3 Missionen.', 'hub.lock.cafe': 'Das Sprudel-Café öffnet nach 3 Missionen.',
      'hub.lock.gallery': 'Die Galerie öffnet nach 4 Missionen.', 'hub.lock.royale': 'Der Royale-Turm öffnet nach 4 Missionen.',
      'menu.g.dailyLocked': 'Tagesquests öffnen nach 3 Missionen.',
      'enemy.buzzhive.sub': 'Herrscherin der Leuchtpilz-Grotte',
    },
    'pt-BR': {
      'unlock.hint.m1': 'Abre depois de mais 1 missão', 'unlock.hint.mn': 'Abre depois de mais {n} missões',
      'unlock.hint.pr': 'Abre no Nível de Jogador {n}', 'unlock.hint.guild': 'Abre na Guilda ★{n}', 'unlock.hint.story': 'Derrote primeiro na história',
      'res.rankBonus': 'Bônus de nível', 'res.stickerBonus': 'Bônus de adesivo', 'res.newTitle': 'Novidades em Fizzport!', 'res.goThere': 'Ir lá', 'res.newMore': '+{n} mais',
      'res.nextMission': 'Próxima missão', 'res.board': 'Quadro de Missões', 'res.nextBoss': 'Próximo chefe', 'res.bossList': 'Caça aos Chefes',
      'exp.quit.kept': 'De volta à cidade! Clinks guardados: {c} · Peças guardadas: {p}', 'exp.quit.none': 'De volta à cidade! Nada de prêmio desta vez.',
      'exp.quit.keptRestart': 'Recomeçando! Da tentativa anterior você guardou: {c} Clinks · {p} peças',
      'prog.codexNewN': '{n} novidades no Códex!',
      'exp.quitConfirm': 'Voltar para a cidade? Você fica com todos os Clinks que pegou e metade das peças.',
      'exp.next.marker': 'Siga o marcador amarelo!', 'exp.next.pop': 'Estoure os bots!', 'exp.next.parts': 'Pegue {part} dos bots!',
      'exp.next.totem': 'Siga o marcador do totem!', 'exp.next.cage': 'Siga o marcador da jaula!',
      'exp.next.cart': 'Fique perto do carrinho!', 'exp.next.fix': 'Conserte o carrinho!', 'exp.next.beam': 'Suba até o raio azul!',
      'exp.next.camp': 'Siga o marcador de coroa!', 'exp.next.lair': 'Siga o marcador do chefe!', 'exp.next.boss': 'Mire nos pontos brilhantes!',
      'exp.next.balloon': 'Corra até o balão!', 'exp.next.pad': 'Suba na plataforma brilhante!', 'exp.next.stay': 'Fique na plataforma!',
      'exp.lockedAfter': 'Complete “{name}” primeiro', 'exp.moreOpts': 'Mais opções', 'exp.lessOpts': 'Menos opções',
      'exp.medals': 'Medalhas', 'exp.medal.b': 'Completa',
      'exp.medal.rule': 'Pontos: 1.000 por completar, +300 pelo bônus e por cada Star Sprocket, +2 por segundo abaixo da meta ({t}), −100 por cada nocaute.',
      'pause.quitConfirm': 'Voltar para a cidade agora? Esta rodada termina aqui.',
      'hub.lock.workshop': 'A Oficina abre depois da sua primeira missão. Bora estourar uns bots!', 'hub.lock.shop': 'A Loja Pop abre depois da sua primeira missão.',
      'hub.lock.hangar': 'O Hangar abre depois de 2 missões.', 'hub.lock.arena': 'O Portão da Arena abre depois de 2 missões.',
      'hub.lock.defense': 'O Posto da Guarda abre depois de 3 missões.', 'hub.lock.cafe': 'O Café Fizz abre depois de 3 missões.',
      'hub.lock.gallery': 'A Galeria abre depois de 4 missões.', 'hub.lock.royale': 'A Torre Royale abre depois de 4 missões.',
      'menu.g.dailyLocked': 'As tarefas diárias abrem depois de 3 missões.',
      'enemy.buzzhive.sub': 'Soberana da Gruta Cogumeluz',
    },
    it: {
      'unlock.hint.m1': 'Apre dopo un\'altra missione', 'unlock.hint.mn': 'Apre dopo altre {n} missioni',
      'unlock.hint.pr': 'Apre al Rango Giocatore {n}', 'unlock.hint.guild': 'Apre al rango Gilda ★{n}', 'unlock.hint.story': 'Prima sconfiggilo nella storia',
      'res.rankBonus': 'Bonus rango', 'res.stickerBonus': 'Bonus adesivo', 'res.newTitle': 'Novità a Fizzport!', 'res.goThere': 'Vai lì', 'res.newMore': '+{n} altri',
      'res.nextMission': 'Missione successiva', 'res.board': 'Bacheca Missioni', 'res.nextBoss': 'Boss successivo', 'res.bossList': 'Caccia ai Boss',
      'exp.quit.kept': 'Di nuovo in città! Clinks tenuti: {c} · Pezzi tenuti: {p}', 'exp.quit.none': 'Di nuovo in città! Niente bottino stavolta.',
      'exp.quit.keptRestart': 'Si riparte! Dal tentativo precedente hai tenuto: {c} Clinks · {p} pezzi',
      'prog.codexNewN': '{n} nuove voci nell\'Archivio!',
      'exp.quitConfirm': 'Tornare in città? Tieni tutti i Clinks raccolti e metà dei pezzi.',
      'exp.next.marker': 'Segui il segnale giallo!', 'exp.next.pop': 'Scoppia i bot!', 'exp.next.parts': 'Prendi {part} dai bot!',
      'exp.next.totem': 'Segui il segnale del totem!', 'exp.next.cage': 'Segui il segnale della gabbia!',
      'exp.next.cart': 'Resta vicino al carrello!', 'exp.next.fix': 'Ripara il carrello!', 'exp.next.beam': 'Sali fino al raggio blu!',
      'exp.next.camp': 'Segui il segnale con la corona!', 'exp.next.lair': 'Segui il segnale del boss!', 'exp.next.boss': 'Mira ai punti luminosi!',
      'exp.next.balloon': 'Corri alla mongolfiera!', 'exp.next.pad': 'Sali sulla piattaforma!', 'exp.next.stay': 'Resta sulla piattaforma!',
      'exp.lockedAfter': 'Prima completa «{name}»', 'exp.moreOpts': 'Altre opzioni', 'exp.lessOpts': 'Meno opzioni',
      'exp.medals': 'Medaglie', 'exp.medal.b': 'Completata',
      'exp.medal.rule': 'Punti: 1.000 per completarla, +300 per il bonus e per ogni Star Sprocket, +2 per ogni secondo sotto il target ({t}), −100 per ogni bonk.',
      'pause.quitConfirm': 'Tornare in città adesso? Questo round finisce qui.',
      'hub.lock.workshop': 'L\'Officina apre dopo la tua prima missione. Andiamo a scoppiare qualche bot!', 'hub.lock.shop': 'Il Negozio Pop apre dopo la tua prima missione.',
      'hub.lock.hangar': 'L\'Hangar apre dopo 2 missioni.', 'hub.lock.arena': 'La Porta dell\'Arena apre dopo 2 missioni.',
      'hub.lock.defense': 'Il Posto di Guardia apre dopo 3 missioni.', 'hub.lock.cafe': 'Il Caffè Fizz apre dopo 3 missioni.',
      'hub.lock.gallery': 'La Galleria apre dopo 4 missioni.', 'hub.lock.royale': 'La Torre Royale apre dopo 4 missioni.',
      'menu.g.dailyLocked': 'Gli incarichi giornalieri si aprono dopo 3 missioni.',
      'enemy.buzzhive.sub': 'Regina della Grotta Funghiluce',
    },
    ru: {
      'unlock.hint.m1': 'Откроется после ещё 1 миссии', 'unlock.hint.mn': 'Откроется после ещё {n} миссий',
      'unlock.hint.pr': 'Откроется на ранге игрока {n}', 'unlock.hint.guild': 'Откроется на ранге гильдии ★{n}', 'unlock.hint.story': 'Сначала одолей его в сюжете',
      'res.rankBonus': 'Бонус за ранг', 'res.stickerBonus': 'Бонус за наклейку', 'res.newTitle': 'Новое в Физзпорте!', 'res.goThere': 'Туда', 'res.newMore': 'ещё {n}',
      'res.nextMission': 'Следующая миссия', 'res.board': 'Доска миссий', 'res.nextBoss': 'Следующий босс', 'res.bossList': 'Охота на боссов',
      'exp.quit.kept': 'Ты снова в городе! Сохранено клинксов: {c} · деталей: {p}', 'exp.quit.none': 'Ты снова в городе! В этот раз без добычи.',
      'exp.quit.keptRestart': 'Начинаем заново! С прошлой попытки сохранено клинксов: {c} · деталей: {p}',
      'prog.codexNewN': 'Новых записей в справочнике: {n}!',
      'exp.quitConfirm': 'Вернуться в город? Все собранные клинксы останутся у тебя, а детали — наполовину.',
      'exp.next.marker': 'Иди по жёлтой метке!', 'exp.next.pop': 'Лопай ботов!', 'exp.next.parts': 'Добудь у ботов: {part}!',
      'exp.next.totem': 'Иди по метке тотема!', 'exp.next.cage': 'Иди по метке клетки!',
      'exp.next.cart': 'Держись у тележки!', 'exp.next.fix': 'Почини тележку!', 'exp.next.beam': 'Лезь к синему лучу!',
      'exp.next.camp': 'Иди по метке с короной!', 'exp.next.lair': 'Иди по метке босса!', 'exp.next.boss': 'Целься в светящиеся точки!',
      'exp.next.balloon': 'Беги к воздушному шару!', 'exp.next.pad': 'Встань на площадку!', 'exp.next.stay': 'Стой на площадке!',
      'exp.lockedAfter': 'Сначала пройди «{name}»', 'exp.moreOpts': 'Ещё настройки', 'exp.lessOpts': 'Скрыть настройки',
      'exp.medals': 'Медали', 'exp.medal.b': 'Пройдено',
      'exp.medal.rule': 'Очки: 1 000 за прохождение, +300 за бонус и за каждую звёздную шестерёнку, +2 за каждую секунду быстрее норматива ({t}), −100 за каждый нокаут.',
      'pause.quitConfirm': 'Вернуться в город сейчас? Этот раунд закончится.',
      'hub.lock.workshop': 'Мастерская откроется после первой миссии. Пойдём полопаем ботов!', 'hub.lock.shop': 'Хлоп-лавка откроется после первой миссии.',
      'hub.lock.hangar': 'Ангар откроется после 2 миссий.', 'hub.lock.arena': 'Ворота арены откроются после 2 миссий.',
      'hub.lock.defense': 'Пост стражи откроется после 3 миссий.', 'hub.lock.cafe': 'Кафе «Шипучка» откроется после 3 миссий.',
      'hub.lock.gallery': 'Галерея откроется после 4 миссий.', 'hub.lock.royale': 'Башня десанта откроется после 4 миссий.',
      'menu.g.dailyLocked': 'Ежедневные задания откроются после 3 миссий.',
      'enemy.buzzhive.sub': 'Правительница Грота Светошляпок',
    },
    id: {
      'unlock.hint.m1': 'Buka setelah 1 misi lagi', 'unlock.hint.mn': 'Buka setelah {n} misi lagi',
      'unlock.hint.pr': 'Buka di Peringkat Pemain {n}', 'unlock.hint.guild': 'Buka di Guild ★{n}', 'unlock.hint.story': 'Kalahkan dulu di mode cerita',
      'res.rankBonus': 'Bonus naik peringkat', 'res.stickerBonus': 'Bonus stiker', 'res.newTitle': 'Baru di Fizzport!', 'res.goThere': 'Ke sana', 'res.newMore': '+{n} lagi',
      'res.nextMission': 'Misi berikutnya', 'res.board': 'Papan Misi', 'res.nextBoss': 'Bos berikutnya', 'res.bossList': 'Buru Bos',
      'exp.quit.kept': 'Kembali ke kota! Clinks dibawa: {c} · Komponen dibawa: {p}', 'exp.quit.none': 'Kembali ke kota! Kali ini tidak ada jarahan.',
      'exp.quit.keptRestart': 'Mulai lagi! Dibawa dari percobaan tadi: {c} Clinks · {p} komponen',
      'prog.codexNewN': '{n} entri Kodeks baru!',
      'exp.quitConfirm': 'Kembali ke kota? Semua Clinks yang kamu pungut tetap jadi milikmu, komponennya separuh.',
      'exp.next.marker': 'Ikuti penanda kuning!', 'exp.next.pop': 'Letuskan botnya!', 'exp.next.parts': 'Ambil {part} dari bot!',
      'exp.next.totem': 'Ikuti penanda totem!', 'exp.next.cage': 'Ikuti penanda kandang!',
      'exp.next.cart': 'Tetap di dekat gerobak!', 'exp.next.fix': 'Perbaiki gerobaknya!', 'exp.next.beam': 'Panjat ke berkas biru!',
      'exp.next.camp': 'Ikuti penanda mahkota!', 'exp.next.lair': 'Ikuti penanda bos!', 'exp.next.boss': 'Bidik titik yang bersinar!',
      'exp.next.balloon': 'Lari ke balon!', 'exp.next.pad': 'Berdiri di landasan!', 'exp.next.stay': 'Tetap di landasan!',
      'exp.lockedAfter': 'Selesaikan “{name}” dulu', 'exp.moreOpts': 'Opsi lainnya', 'exp.lessOpts': 'Sembunyikan opsi',
      'exp.medals': 'Medali', 'exp.medal.b': 'Selesai',
      'exp.medal.rule': 'Poin: 1.000 untuk selesai, +300 untuk bonus dan tiap Star Sprocket, +2 tiap detik di bawah target ({t}), −100 tiap kena jitak.',
      'pause.quitConfirm': 'Kembali ke kota sekarang? Ronde ini berakhir di sini.',
      'hub.lock.workshop': 'Bengkel buka setelah misi pertamamu. Ayo letuskan beberapa bot!', 'hub.lock.shop': 'Toko Pop buka setelah misi pertamamu.',
      'hub.lock.hangar': 'Hanggar buka setelah 2 misi.', 'hub.lock.arena': 'Gerbang Arena buka setelah 2 misi.',
      'hub.lock.defense': 'Pos Jaga buka setelah 3 misi.', 'hub.lock.cafe': 'Kafe Soda buka setelah 3 misi.',
      'hub.lock.gallery': 'Galeri buka setelah 4 misi.', 'hub.lock.royale': 'Menara Royale buka setelah 4 misi.',
      'menu.g.dailyLocked': 'Tugas harian buka setelah 3 misi.',
      'enemy.buzzhive.sub': 'Penguasa Gua Jamur Kilau',
    },
  };
  for (const code in S) G.i18n.add(code, S[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_loop.js]', e); }
// ---- 93_lang_modes.js
try { (function () {
// Strings for the modes pass (22_defense, 23_race / 23b_race_ui, 24*_turf, 25*_royale, 17c_bots): Sky Drop Royale says
// plainly that it is you against 15 bots (tagline, Royale Tower / mode list lines, BOT tags), plus the new HUD lines of
// every mode. Loads after the 90_lang_* packs, so the re-registered keys (roy.tagline, roy.introSub, roy.rule.win.d,
// menu.r.playD, menu.mode.royaleD) replace the older "16 rangers" wording in all 12 languages.
(function (G) {
  const add = S => { for (const code in S) G.i18n.add(code, S[code]); };

  // ------------------------------------------------------------------ Sky Drop Royale (25_royale, 25b_royale_hud / _match)
  add({
    en: {
      'roy.tagline': 'You vs 15 bots. 1 island. Be the last one bouncing!', 'roy.introSub': 'You and 15 bot rangers are dropping in!',
      'roy.rule.win.d': 'Bonk the 15 bot rangers. Be the last one standing!',
      'menu.r.playD': 'You vs 15 friendly bots. Drop in and be the last one standing!', 'menu.mode.royaleD': 'You vs 15 bots. Last one bouncing wins!',
      'roy.botTag': 'BOT', 'roy.bots15': '{n} bots',
      'roy.mapHintKb': 'Click the map to mark a landing spot', 'roy.mapHintPlay': 'Tap the map to place a marker', 'roy.mapHintPlayKb': 'Click to place a marker · M closes the map',
      'roy.over.pick': 'Pick a landing spot!', 'roy.over.map': 'Island map',
      'roy.spotIn': 'Your spot: jump in {n}s', 'roy.spotNow': 'Jump now for your spot!', 'roy.spotDist': 'Your spot: {n} m',
      'roy.leftN': '{n} left', 'roy.goal.loot': 'Loot up! Blasters {w}/2 · Heals {h}',
      'roy.goal.win': 'Outlast {n} bots — stay in the zone!', 'roy.goal.final': 'Final {n}! Be the last one bouncing!',
      'roy.storm': 'In the storm! Safe zone {n} m', 'roy.final3': 'Final 3!', 'roy.duel': 'Final duel!',
      'roy.champHint': 'Bonk the crowned bot for bonus loot!', 'roy.champBonus': 'Champion bonked! Bonus loot!',
    },
    ja: {
      'roy.tagline': 'キミ VS ボット15体。ひとつの島で さいごまで のこれ！', 'roy.introSub': 'キミと ボットレンジャー15体が 島へおりてくる！',
      'roy.rule.win.d': 'ボットレンジャー15体を ポン！ さいごまで のこったら優勝！',
      'menu.r.playD': 'キミ VS なかよしボット15体！ とびおりて さいごの1人を めざせ！', 'menu.mode.royaleD': 'キミ VS ボット15体。さいごまで のこったら かち！',
      'roy.botTag': 'ボット', 'roy.bots15': 'ボット{n}体',
      'roy.mapHintKb': 'マップをクリックして着地点に目じるし', 'roy.mapHintPlay': 'マップをタップして目じるしをおく', 'roy.mapHintPlayKb': 'クリックで目じるし・Mキーでとじる',
      'roy.over.pick': '着地点をえらぼう！', 'roy.over.map': '島のマップ',
      'roy.spotIn': '目じるしへは あと{n}びょうで ジャンプ', 'roy.spotNow': 'いまジャンプ！ 目じるしに とどくよ', 'roy.spotDist': '目じるしまで {n}m',
      'roy.leftN': 'のこり{n}人', 'roy.goal.loot': 'アイテムあつめ！ ブラスター {w}/2・かいふく {h}',
      'roy.goal.win': 'ボット{n}体より 長くのころう！ エリアの中でね', 'roy.goal.final': 'のこり{n}人！ さいごの1人になろう！',
      'roy.storm': 'あらしの中！ 安全エリアまで {n}m', 'roy.final3': 'のこり3人！', 'roy.duel': 'さいごの いっきうち！',
      'roy.champHint': '王冠のボットを ポンすると ボーナスアイテム！', 'roy.champBonus': 'チャンピオンを ポン！ ボーナスアイテム！',
    },
    'zh-Hans': {
      'roy.tagline': '你 VS 15个机器人。1座岛。蹦到最后就是你！', 'roy.introSub': '你和15名机器人游侠正在空降！',
      'roy.rule.win.d': '把15名机器人游侠咚晕。成为最后站着的人！',
      'menu.r.playD': '你 VS 15个友好的机器人。空降吧，成为最后站着的人！', 'menu.mode.royaleD': '你 VS 15个机器人。坚持到最后就赢！',
      'roy.botTag': '机器人', 'roy.bots15': '{n}个机器人',
      'roy.mapHintKb': '点击地图标记着陆点', 'roy.mapHintPlay': '点地图放置标记', 'roy.mapHintPlayKb': '点击放置标记 · 按M关闭地图',
      'roy.over.pick': '选一个着陆点！', 'roy.over.map': '岛屿地图',
      'roy.spotIn': '前往标记：{n}秒后跳', 'roy.spotNow': '现在跳，正好到标记！', 'roy.spotDist': '距标记 {n}米',
      'roy.leftN': '剩{n}人', 'roy.goal.loot': '搜集装备！爆能枪 {w}/2 · 治疗 {h}',
      'roy.goal.win': '比{n}个机器人坚持更久——待在安全区里！', 'roy.goal.final': '最后{n}人！成为最后蹦着的那个！',
      'roy.storm': '在风暴里！距安全区 {n}米', 'roy.final3': '最后3人！', 'roy.duel': '最终对决！',
      'roy.champHint': '咚晕戴王冠的机器人有奖励装备！', 'roy.champBonus': '咚晕冠军！奖励装备！',
    },
    'zh-Hant': {
      'roy.tagline': '你 VS 15 個機器人。1 座島。彈到最後的就是你！', 'roy.introSub': '你和 15 名機器人遊俠正在空降！',
      'roy.rule.win.d': '咚倒 15 名機器人遊俠，成為最後站著的人！',
      'menu.r.playD': '你 VS 15 個友善的機器人。空降吧，撐到最後！', 'menu.mode.royaleD': '你 VS 15 個機器人。撐到最後的獲勝！',
      'roy.botTag': '機器人', 'roy.bots15': '{n} 個機器人',
      'roy.mapHintKb': '點擊地圖標記降落地點', 'roy.mapHintPlay': '點地圖放置標記', 'roy.mapHintPlayKb': '點擊放置標記 · 按 M 關閉地圖',
      'roy.over.pick': '選一個降落地點！', 'roy.over.map': '島嶼地圖',
      'roy.spotIn': '前往標記：{n} 秒後跳', 'roy.spotNow': '現在跳，剛好到標記！', 'roy.spotDist': '距離標記 {n} 公尺',
      'roy.leftN': '剩 {n} 人', 'roy.goal.loot': '收集裝備！爆能槍 {w}/2 · 治療 {h}',
      'roy.goal.win': '比 {n} 個機器人撐更久——待在安全區裡！', 'roy.goal.final': '最後 {n} 人！成為最後彈著的那個！',
      'roy.storm': '在風暴裡！距離安全區 {n} 公尺', 'roy.final3': '最後 3 人！', 'roy.duel': '最終對決！',
      'roy.champHint': '咚倒戴王冠的機器人有獎勵裝備！', 'roy.champBonus': '咚倒冠軍！獎勵裝備！',
    },
    ko: {
      'roy.tagline': '나 VS 봇 15명. 섬 하나. 끝까지 통통 남아요!', 'roy.introSub': '나와 봇 레인저 15명이 뛰어내려요!',
      'roy.rule.win.d': '봇 레인저 15명을 콩! 끝까지 남아요!',
      'menu.r.playD': '나 VS 친절한 봇 15명! 뛰어내려서 끝까지 남아요!', 'menu.mode.royaleD': '나 VS 봇 15명. 마지막까지 남으면 승리!',
      'roy.botTag': '봇', 'roy.bots15': '봇 {n}명',
      'roy.mapHintKb': '지도를 클릭해서 착지 지점을 표시해요', 'roy.mapHintPlay': '지도를 탭해서 표시를 남겨요', 'roy.mapHintPlayKb': '클릭해서 표시 · M으로 지도 닫기',
      'roy.over.pick': '착지 지점을 골라요!', 'roy.over.map': '섬 지도',
      'roy.spotIn': '표시 지점: {n}초 뒤 점프', 'roy.spotNow': '지금 점프하면 표시 지점이에요!', 'roy.spotDist': '표시 지점까지 {n}m',
      'roy.leftN': '{n}명 남음', 'roy.goal.loot': '아이템 모으기! 블래스터 {w}/2 · 회복 {h}',
      'roy.goal.win': '봇 {n}명보다 오래 버텨요 — 구역 안에서!', 'roy.goal.final': '{n}명 남았어요! 마지막까지 통통!',
      'roy.storm': '폭풍 속이에요! 안전 구역까지 {n}m', 'roy.final3': '마지막 3명!', 'roy.duel': '최후의 대결!',
      'roy.champHint': '왕관 쓴 봇을 콩 하면 보너스 아이템!', 'roy.champBonus': '챔피언을 콩! 보너스 아이템!',
    },
    es: {
      'roy.tagline': 'Tú contra 15 bots. 1 isla. ¡Rebota hasta el final!', 'roy.introSub': '¡Tú y 15 rangers bot se lanzan!',
      'roy.rule.win.d': 'Dales coscorrones a los 15 rangers bot. ¡Aguanta en pie hasta el final!',
      'menu.r.playD': 'Tú contra 15 bots amistosos. ¡Lánzate y aguanta hasta el final!', 'menu.mode.royaleD': 'Tú contra 15 bots. ¡Gana quien quede al final!',
      'roy.botTag': 'BOT', 'roy.bots15': '{n} bots',
      'roy.mapHintKb': 'Haz clic en el mapa para marcar dónde aterrizar', 'roy.mapHintPlay': 'Toca el mapa para poner una marca', 'roy.mapHintPlayKb': 'Clic para poner una marca · M cierra el mapa',
      'roy.over.pick': '¡Elige dónde aterrizar!', 'roy.over.map': 'Mapa de la isla',
      'roy.spotIn': 'Tu marca: salta en {n} s', 'roy.spotNow': '¡Salta ya para llegar a tu marca!', 'roy.spotDist': 'Tu marca: {n} m',
      'roy.leftN': 'Quedan {n}', 'roy.goal.loot': '¡Equípate! Blásteres {w}/2 · Curas {h}',
      'roy.goal.win': '¡Aguanta más que {n} bots dentro de la zona!', 'roy.goal.final': '¡Quedan {n}! ¡Sé el último en rebotar!',
      'roy.storm': '¡En la tormenta! Zona segura a {n} m', 'roy.final3': '¡Quedan 3!', 'roy.duel': '¡Duelo final!',
      'roy.champHint': '¡Dale un coscorrón al bot con corona y ganarás botín extra!', 'roy.champBonus': '¡Campeón derribado! ¡Botín extra!',
    },
    fr: {
      'roy.tagline': 'Toi contre 15 bots. 1 île. Le dernier rebond sera le tien !', 'roy.introSub': 'Toi et 15 rangers bots sautez sur l\'île !',
      'roy.rule.win.d': 'Sonne les 15 rangers bots. Reste en lice jusqu\'au bout !',
      'menu.r.playD': 'Toi contre 15 bots sympas. Saute et reste en lice jusqu\'au bout !', 'menu.mode.royaleD': 'Toi contre 15 bots. Le dernier en lice gagne !',
      'roy.botTag': 'BOT', 'roy.bots15': '{n} bots',
      'roy.mapHintKb': 'Clique sur la carte pour marquer un point d\'atterrissage', 'roy.mapHintPlay': 'Touche la carte pour poser un repère', 'roy.mapHintPlayKb': 'Clique pour poser un repère · M ferme la carte',
      'roy.over.pick': 'Choisis où atterrir !', 'roy.over.map': 'Carte de l\'île',
      'roy.spotIn': 'Ton repère : saute dans {n} s', 'roy.spotNow': 'Saute maintenant pour ton repère !', 'roy.spotDist': 'Ton repère : {n} m',
      'roy.leftN': 'Encore {n}', 'roy.goal.loot': 'Équipe-toi ! Blasters {w}/2 · Soins {h}',
      'roy.goal.win': 'Tiens plus longtemps que {n} bots, dans la zone !', 'roy.goal.final': 'Plus que {n} ! Sois le dernier à rebondir !',
      'roy.storm': 'Dans la tempête ! Zone sûre à {n} m', 'roy.final3': 'Plus que 3 !', 'roy.duel': 'Duel final !',
      'roy.champHint': 'Sonne le bot couronné pour du butin bonus !', 'roy.champBonus': 'Champion sonné ! Butin bonus !',
    },
    de: {
      'roy.tagline': 'Du gegen 15 Bots. 1 Insel. Hüpf bis zum Schluss!', 'roy.introSub': 'Du und 15 Bot-Ranger springen ab!',
      'roy.rule.win.d': 'Hau die 15 Bot-Ranger um. Halte bis zum Schluss durch!',
      'menu.r.playD': 'Du gegen 15 freundliche Bots. Spring ab und halte bis zum Schluss durch!', 'menu.mode.royaleD': 'Du gegen 15 Bots. Wer zuletzt übrig ist, gewinnt!',
      'roy.botTag': 'BOT', 'roy.bots15': '{n} Bots',
      'roy.mapHintKb': 'Klicke auf die Karte, um einen Landepunkt zu markieren', 'roy.mapHintPlay': 'Tippe auf die Karte für eine Markierung', 'roy.mapHintPlayKb': 'Klicken markiert · M schließt die Karte',
      'roy.over.pick': 'Wähle deinen Landepunkt!', 'roy.over.map': 'Inselkarte',
      'roy.spotIn': 'Dein Punkt: Sprung in {n} s', 'roy.spotNow': 'Jetzt springen für deinen Punkt!', 'roy.spotDist': 'Dein Punkt: {n} m',
      'roy.leftN': 'Noch {n}', 'roy.goal.loot': 'Ausrüsten! Blaster {w}/2 · Heilung {h}',
      'roy.goal.win': 'Halte länger durch als {n} Bots – bleib in der Zone!', 'roy.goal.final': 'Noch {n}! Sei der Letzte, der hüpft!',
      'roy.storm': 'Im Sturm! Sichere Zone in {n} m', 'roy.final3': 'Noch 3!', 'roy.duel': 'Finales Duell!',
      'roy.champHint': 'Hau den Bot mit der Krone um – Bonusbeute!', 'roy.champBonus': 'Champion umgehauen! Bonusbeute!',
    },
    'pt-BR': {
      'roy.tagline': 'Você contra 15 bots. 1 ilha. Fique quicando até o fim!', 'roy.introSub': 'Você e 15 rangers bots estão saltando!',
      'roy.rule.win.d': 'Dê bonk nos 15 rangers bots. Fique de pé até o fim!',
      'menu.r.playD': 'Você contra 15 bots amigáveis. Salte e fique de pé até o fim!', 'menu.mode.royaleD': 'Você contra 15 bots. Quem ficar até o fim vence!',
      'roy.botTag': 'BOT', 'roy.bots15': '{n} bots',
      'roy.mapHintKb': 'Clique no mapa para marcar onde pousar', 'roy.mapHintPlay': 'Toque no mapa para pôr uma marca', 'roy.mapHintPlayKb': 'Clique para pôr uma marca · M fecha o mapa',
      'roy.over.pick': 'Escolha onde pousar!', 'roy.over.map': 'Mapa da ilha',
      'roy.spotIn': 'Sua marca: salte em {n} s', 'roy.spotNow': 'Salte agora para chegar à marca!', 'roy.spotDist': 'Sua marca: {n} m',
      'roy.leftN': 'Restam {n}', 'roy.goal.loot': 'Equipe-se! Blasters {w}/2 · Curas {h}',
      'roy.goal.win': 'Dure mais que {n} bots — fique na zona!', 'roy.goal.final': 'Restam {n}! Seja o último a quicar!',
      'roy.storm': 'Na tempestade! Zona segura a {n} m', 'roy.final3': 'Restam 3!', 'roy.duel': 'Duelo final!',
      'roy.champHint': 'Dê bonk no bot de coroa para ganhar itens bônus!', 'roy.champBonus': 'Campeão derrubado! Itens bônus!',
    },
    it: {
      'roy.tagline': 'Tu contro 15 bot. 1 isola. Resisti fino all\'ultimo rimbalzo!', 'roy.introSub': 'Tu e 15 ranger bot vi state lanciando!',
      'roy.rule.win.d': 'Fai bonk ai 15 ranger bot. Resisti fino alla fine!',
      'menu.r.playD': 'Tu contro 15 bot simpatici. Lanciati e resisti fino alla fine!', 'menu.mode.royaleD': 'Tu contro 15 bot. Vince chi resta per ultimo!',
      'roy.botTag': 'BOT', 'roy.bots15': '{n} bot',
      'roy.mapHintKb': 'Clicca sulla mappa per segnare un punto di atterraggio', 'roy.mapHintPlay': 'Tocca la mappa per mettere un segnale', 'roy.mapHintPlayKb': 'Clic per mettere un segnale · M chiude la mappa',
      'roy.over.pick': 'Scegli dove atterrare!', 'roy.over.map': 'Mappa dell\'isola',
      'roy.spotIn': 'Il tuo punto: salta tra {n} s', 'roy.spotNow': 'Salta ora per il tuo punto!', 'roy.spotDist': 'Il tuo punto: {n} m',
      'roy.leftN': 'Ne restano {n}', 'roy.goal.loot': 'Equipaggiati! Blaster {w}/2 · Cure {h}',
      'roy.goal.win': 'Resisti più di {n} bot: resta nella zona!', 'roy.goal.final': 'Ne restano {n}! Sii l\'ultimo a rimbalzare!',
      'roy.storm': 'Nella tempesta! Zona sicura a {n} m', 'roy.final3': 'Ne restano 3!', 'roy.duel': 'Duello finale!',
      'roy.champHint': 'Fai bonk al bot con la corona per un bottino extra!', 'roy.champBonus': 'Campione abbattuto! Bottino extra!',
    },
    ru: {
      'roy.tagline': 'Ты против 15 ботов. 1 остров. Останься последним!', 'roy.introSub': 'Ты и 15 рейнджеров-ботов идёте на высадку!',
      'roy.rule.win.d': 'Выбивай 15 рейнджеров-ботов. Останься последним на ногах!',
      'menu.r.playD': 'Ты против 15 дружелюбных ботов. Прыгай и продержись до конца!', 'menu.mode.royaleD': 'Ты против 15 ботов. Побеждает последний!',
      'roy.botTag': 'БОТ', 'roy.bots15': 'Ботов: {n}',
      'roy.mapHintKb': 'Щёлкни по карте, чтобы отметить место высадки', 'roy.mapHintPlay': 'Нажми на карту, чтобы поставить метку', 'roy.mapHintPlayKb': 'Щелчок ставит метку · M закрывает карту',
      'roy.over.pick': 'Выбери место высадки!', 'roy.over.map': 'Карта острова',
      'roy.spotIn': 'До метки: прыжок через {n} с', 'roy.spotNow': 'Прыгай сейчас — долетишь до метки!', 'roy.spotDist': 'До метки: {n} м',
      'roy.leftN': 'Осталось: {n}', 'roy.goal.loot': 'Собирай снаряжение! Бластеры {w}/2 · Лечение {h}',
      'roy.goal.win': 'Продержись дольше {n} ботов — не выходи из зоны!', 'roy.goal.final': 'Осталось {n}! Стань последним!',
      'roy.storm': 'Ты в буре! До безопасной зоны {n} м', 'roy.final3': 'Осталось трое!', 'roy.duel': 'Финальная дуэль!',
      'roy.champHint': 'Выбей бота в короне — получишь бонусные трофеи!', 'roy.champBonus': 'Чемпион выбит! Бонусные трофеи!',
    },
    id: {
      'roy.tagline': 'Kamu lawan 15 bot. 1 pulau. Jadilah yang terakhir memantul!', 'roy.introSub': 'Kamu dan 15 ranger bot sedang terjun!',
      'roy.rule.win.d': 'Jitak 15 ranger bot. Jadilah yang terakhir bertahan!',
      'menu.r.playD': 'Kamu lawan 15 bot ramah. Terjun dan jadilah yang terakhir bertahan!', 'menu.mode.royaleD': 'Kamu lawan 15 bot. Yang terakhir menang!',
      'roy.botTag': 'BOT', 'roy.bots15': '{n} bot',
      'roy.mapHintKb': 'Klik peta untuk menandai tempat mendarat', 'roy.mapHintPlay': 'Ketuk peta untuk memasang penanda', 'roy.mapHintPlayKb': 'Klik untuk memasang penanda · M menutup peta',
      'roy.over.pick': 'Pilih tempat mendarat!', 'roy.over.map': 'Peta pulau',
      'roy.spotIn': 'Penandamu: lompat dalam {n} dtk', 'roy.spotNow': 'Lompat sekarang ke penandamu!', 'roy.spotDist': 'Penandamu: {n} m',
      'roy.leftN': 'Sisa {n}', 'roy.goal.loot': 'Kumpulkan barang! Blaster {w}/2 · Penyembuh {h}',
      'roy.goal.win': 'Bertahan lebih lama dari {n} bot — tetap di zona!', 'roy.goal.final': 'Sisa {n}! Jadilah yang terakhir memantul!',
      'roy.storm': 'Di dalam badai! Zona aman {n} m', 'roy.final3': 'Sisa 3!', 'roy.duel': 'Duel terakhir!',
      'roy.champHint': 'Jitak bot bermahkota untuk barang bonus!', 'roy.champBonus': 'Juara dijitak! Barang bonus!',
    },
  });

  // ------------------------------------------------------------------ Goo Turf (24f_turf_mode, 24g_turf_lobby) + Settings row
  add({
    en: { 'turf.rush': 'Goo Rush! Specials charge faster!', 'turf.swing': 'Turf swing! +{n}%', 'turf.comeback': 'Comeback!', 'turf.comebackSub': 'Your team took the lead!',
      'turf.lobby.patterns': 'Ink patterns', 'turf.lobby.patHint': 'Your team: stripes. Rivals: dots.', 'set.inkPatterns': 'Goo Turf team patterns (stripes & dots)' },
    ja: { 'turf.rush': 'グーラッシュ！ スペシャルが はやく たまる！', 'turf.swing': 'ぬりかえし！ +{n}%', 'turf.comeback': '大逆転！', 'turf.comebackSub': 'キミのチームが リード！',
      'turf.lobby.patterns': 'もようで みわける', 'turf.lobby.patHint': 'キミのチームは しまもよう、あいては 水玉もよう。', 'set.inkPatterns': 'グーぬりバトルのチームもよう（しま・水玉）' },
    'zh-Hans': { 'turf.rush': '黏液冲刺！特殊技充得更快！', 'turf.swing': '地盘逆转！+{n}%', 'turf.comeback': '大逆转！', 'turf.comebackSub': '你的队伍领先了！',
      'turf.lobby.patterns': '黏液花纹', 'turf.lobby.patHint': '你的队伍：条纹。对手：圆点。', 'set.inkPatterns': '黏液地盘战队伍花纹（条纹和圆点）' },
    'zh-Hant': { 'turf.rush': '黏液衝刺！特殊技充得更快！', 'turf.swing': '地盤逆轉！+{n}%', 'turf.comeback': '大逆轉！', 'turf.comebackSub': '你的隊伍領先了！',
      'turf.lobby.patterns': '黏液花紋', 'turf.lobby.patHint': '你的隊伍：條紋。對手：圓點。', 'set.inkPatterns': '黏液地盤戰隊伍花紋（條紋和圓點）' },
    ko: { 'turf.rush': '구 러시! 스페셜이 더 빨리 차요!', 'turf.swing': '영역 역전! +{n}%', 'turf.comeback': '대역전!', 'turf.comebackSub': '우리 팀이 앞서요!',
      'turf.lobby.patterns': '구 무늬', 'turf.lobby.patHint': '우리 팀: 줄무늬. 상대 팀: 물방울무늬.', 'set.inkPatterns': '구 영역전 팀 무늬 (줄무늬와 물방울)' },
    es: { 'turf.rush': '¡Fiebre de gel! ¡Los especiales se cargan más rápido!', 'turf.swing': '¡Remontada de terreno! +{n}%', 'turf.comeback': '¡Remontada!', 'turf.comebackSub': '¡Tu equipo va ganando!',
      'turf.lobby.patterns': 'Dibujos de gel', 'turf.lobby.patHint': 'Tu equipo: rayas. Rivales: puntos.', 'set.inkPatterns': 'Dibujos de equipo en Territorio Gel (rayas y puntos)' },
    fr: { 'turf.rush': 'Ruée de slime ! Les spéciaux se chargent plus vite !', 'turf.swing': 'Terrain repris ! +{n} %', 'turf.comeback': 'Retournement !', 'turf.comebackSub': 'Ton équipe passe devant !',
      'turf.lobby.patterns': 'Motifs de slime', 'turf.lobby.patHint': 'Ton équipe : rayures. Rivaux : pois.', 'set.inkPatterns': 'Motifs d\'équipe en Guerre Slime (rayures et pois)' },
    de: { 'turf.rush': 'Glibber-Rausch! Spezialangriffe laden schneller!', 'turf.swing': 'Revier gedreht! +{n} %', 'turf.comeback': 'Aufholjagd!', 'turf.comebackSub': 'Dein Team führt!',
      'turf.lobby.patterns': 'Glibber-Muster', 'turf.lobby.patHint': 'Dein Team: Streifen. Gegner: Punkte.', 'set.inkPatterns': 'Teammuster im Glibber-Revier (Streifen & Punkte)' },
    'pt-BR': { 'turf.rush': 'Corrida de gosma! Os especiais carregam mais rápido!', 'turf.swing': 'Virada no terreno! +{n}%', 'turf.comeback': 'Virada!', 'turf.comebackSub': 'Seu time passou na frente!',
      'turf.lobby.patterns': 'Padrões de gosma', 'turf.lobby.patHint': 'Seu time: listras. Rivais: bolinhas.', 'set.inkPatterns': 'Padrões de time na Guerra de Gosma (listras e bolinhas)' },
    it: { 'turf.rush': 'Corsa alla melma! Le speciali si caricano più in fretta!', 'turf.swing': 'Zona ripresa! +{n}%', 'turf.comeback': 'Rimonta!', 'turf.comebackSub': 'La tua squadra è in testa!',
      'turf.lobby.patterns': 'Motivi melma', 'turf.lobby.patHint': 'La tua squadra: strisce. Rivali: pois.', 'set.inkPatterns': 'Motivi di squadra in Zona Melma (strisce e pois)' },
    ru: { 'turf.rush': 'Слайм-рывок! Суперприёмы копятся быстрее!', 'turf.swing': 'Территория отбита! +{n}%', 'turf.comeback': 'Камбэк!', 'turf.comebackSub': 'Твоя команда впереди!',
      'turf.lobby.patterns': 'Узоры слайма', 'turf.lobby.patHint': 'Твоя команда: полоски. Соперники: точки.', 'set.inkPatterns': 'Узоры команд в слайм-захвате (полоски и точки)' },
    id: { 'turf.rush': 'Serbuan Slime! Spesial terisi lebih cepat!', 'turf.swing': 'Wilayah berbalik! +{n}%', 'turf.comeback': 'Bangkit!', 'turf.comebackSub': 'Timmu memimpin!',
      'turf.lobby.patterns': 'Motif slime', 'turf.lobby.patHint': 'Timmu: garis. Lawan: titik.', 'set.inkPatterns': 'Motif tim Wilayah Slime (garis & titik)' },
  });

  // ------------------------------------------------------------------ Star Skiff Rally (23_race, 23b_race_ui)
  add({
    en: { 'race.cp': 'Checkpoint {n}/{total}', 'race.backToCp': 'Back to the checkpoint!', 'race.hud.pb': 'PB {t}', 'race.newBest': 'New best!', 'race.newBestT': 'New best! {t}',
      'race.stat.pb': 'Personal best', 'race.cleanLap': 'Clean lap! +{n} energy' },
    ja: { 'race.cp': 'チェックポイント {n}/{total}', 'race.backToCp': 'チェックポイントへ もどるよ！', 'race.hud.pb': 'じこベスト {t}', 'race.newBest': 'じこベスト更新！', 'race.newBestT': 'じこベスト更新！ {t}',
      'race.stat.pb': 'じこベスト', 'race.cleanLap': 'ノーミスラップ！ エネルギー+{n}' },
    'zh-Hans': { 'race.cp': '检查点 {n}/{total}', 'race.backToCp': '回到检查点！', 'race.hud.pb': '个人最佳 {t}', 'race.newBest': '刷新个人最佳！', 'race.newBestT': '刷新个人最佳！{t}',
      'race.stat.pb': '个人最佳', 'race.cleanLap': '完美一圈！能量+{n}' },
    'zh-Hant': { 'race.cp': '檢查點 {n}/{total}', 'race.backToCp': '回到檢查點！', 'race.hud.pb': '個人最佳 {t}', 'race.newBest': '刷新個人最佳！', 'race.newBestT': '刷新個人最佳！{t}',
      'race.stat.pb': '個人最佳', 'race.cleanLap': '完美一圈！能量 +{n}' },
    ko: { 'race.cp': '체크포인트 {n}/{total}', 'race.backToCp': '체크포인트로 돌아가요!', 'race.hud.pb': '내 최고 {t}', 'race.newBest': '내 최고 기록!', 'race.newBestT': '내 최고 기록! {t}',
      'race.stat.pb': '내 최고 기록', 'race.cleanLap': '클린 랩! 에너지 +{n}' },
    es: { 'race.cp': 'Control {n}/{total}', 'race.backToCp': '¡De vuelta al control!', 'race.hud.pb': 'MR {t}', 'race.newBest': '¡Nueva marca personal!', 'race.newBestT': '¡Nueva marca! {t}',
      'race.stat.pb': 'Marca personal', 'race.cleanLap': '¡Vuelta limpia! +{n} de energía' },
    fr: { 'race.cp': 'Point de passage {n}/{total}', 'race.backToCp': 'Retour au point de passage !', 'race.hud.pb': 'Record perso {t}', 'race.newBest': 'Nouveau record perso !', 'race.newBestT': 'Record perso ! {t}',
      'race.stat.pb': 'Record perso', 'race.cleanLap': 'Tour sans faute ! +{n} d\'énergie' },
    de: { 'race.cp': 'Checkpoint {n}/{total}', 'race.backToCp': 'Zurück zum Checkpoint!', 'race.hud.pb': 'Bestzeit {t}', 'race.newBest': 'Neue Bestzeit!', 'race.newBestT': 'Neue Bestzeit! {t}',
      'race.stat.pb': 'Persönliche Bestzeit', 'race.cleanLap': 'Saubere Runde! +{n} Energie' },
    'pt-BR': { 'race.cp': 'Checkpoint {n}/{total}', 'race.backToCp': 'De volta ao checkpoint!', 'race.hud.pb': 'Recorde {t}', 'race.newBest': 'Novo recorde pessoal!', 'race.newBestT': 'Novo recorde! {t}',
      'race.stat.pb': 'Recorde pessoal', 'race.cleanLap': 'Volta limpa! +{n} de energia' },
    it: { 'race.cp': 'Checkpoint {n}/{total}', 'race.backToCp': 'Di nuovo al checkpoint!', 'race.hud.pb': 'Record {t}', 'race.newBest': 'Nuovo record personale!', 'race.newBestT': 'Nuovo record! {t}',
      'race.stat.pb': 'Record personale', 'race.cleanLap': 'Giro pulito! +{n} energia' },
    ru: { 'race.cp': 'Чекпоинт {n}/{total}', 'race.backToCp': 'Назад к чекпоинту!', 'race.hud.pb': 'Рекорд {t}', 'race.newBest': 'Новый личный рекорд!', 'race.newBestT': 'Новый рекорд! {t}',
      'race.stat.pb': 'Личный рекорд', 'race.cleanLap': 'Чистый круг! +{n} энергии' },
    id: { 'race.cp': 'Checkpoint {n}/{total}', 'race.backToCp': 'Kembali ke checkpoint!', 'race.hud.pb': 'Terbaik {t}', 'race.newBest': 'Rekor pribadi baru!', 'race.newBestT': 'Rekor baru! {t}',
      'race.stat.pb': 'Rekor pribadi', 'race.cleanLap': 'Putaran bersih! +{n} energi' },
  });

  // ------------------------------------------------------------------ Fountain Guard (22_defense)
  add({
    en: {
      'def.theme.1': 'Warm-up', 'def.theme.2': 'Rolling rush', 'def.theme.3': 'Shields up!', 'def.theme.4': 'Sky snipers',
      'def.theme.5': 'Pinch King\'s Big Wave', 'def.theme.6': 'Artillery parade', 'def.theme.7': 'Crab march', 'def.theme.8': 'Heavy hitters',
      'def.theme.9': 'Pincer attack', 'def.theme.10': 'Mini Crankcrab\'s Big Wave', 'def.role.flyer': 'Flyer', 'def.role.jumper': 'Jumper',
      'def.role.roller': 'Roller', 'def.role.turret': 'Turret', 'def.role.sniper': 'Sniper', 'def.role.shield': 'Shield', 'def.role.artillery': 'Lobber',
      'def.role.zapper': 'Zapper', 'def.role.tank': 'Tank', 'def.role.heavy': 'Heavy', 'def.role.carrier': 'Carrier', 'def.role.boss': 'Boss',
      'def.gate.N': 'North', 'def.gate.E': 'East', 'def.gate.W': 'West', 'def.q.repair': 'Repair', 'def.q.trap': 'Trap', 'def.q.ammo': 'Ammo',
      'def.nextWave': 'Next: wave {n} · {theme}', 'def.bigTag': 'BIG', 'def.newFoe': '{name} ({role}) joins the raid!',
      'def.pinchKing': 'Pinch King incoming!', 'def.pinchKingSub': 'A crowned crab leads the Big Wave!', 'def.pinchKingName': 'Pinch King',
      'def.crankName': 'Mini Crankcrab', 'def.flawless': 'Flawless wave! +{n} tokens', 'def.res.loseWave': 'Nice try! You reached wave {n}',
      'def.res.loseSub': 'The Fizz Core fizzled. You\'ll get it next time!',
    },
    ja: {
      'def.theme.1': 'ウォーミングアップ', 'def.theme.2': 'コロコロ大行進', 'def.theme.3': 'シールドたい', 'def.theme.4': '空からスナイパー', 'def.theme.5': 'ピンチキングのビッグウェーブ',
      'def.theme.6': 'ほうだいパレード', 'def.theme.7': 'カニの大行進', 'def.theme.8': 'ヘビー級たい', 'def.theme.9': 'はさみうち作戦', 'def.theme.10': 'ミニ・クランククラブのビッグウェーブ',
      'def.role.flyer': 'とぶ', 'def.role.jumper': 'はねる', 'def.role.roller': 'ころがる', 'def.role.turret': 'ほうだい', 'def.role.sniper': 'スナイパー',
      'def.role.shield': 'たて', 'def.role.artillery': 'なげる', 'def.role.zapper': 'ビリビリ', 'def.role.tank': 'タンク', 'def.role.heavy': 'パワー',
      'def.role.carrier': 'はこぶ', 'def.role.boss': 'ボス', 'def.gate.N': 'きた', 'def.gate.E': 'ひがし', 'def.gate.W': 'にし', 'def.q.repair': 'しゅうり',
      'def.q.trap': 'トラップ', 'def.q.ammo': 'たま', 'def.nextWave': 'つぎ：ウェーブ{n}・{theme}', 'def.bigTag': 'ビッグ', 'def.newFoe': '{name}（{role}）が あらわれた！',
      'def.pinchKing': 'ピンチキングが くるぞ！', 'def.pinchKingSub': '王冠のカニが ビッグウェーブを ひきいてる！', 'def.pinchKingName': 'ピンチキング', 'def.crankName': 'ミニ・クランククラブ',
      'def.flawless': 'ノーダメージ！ トークン+{n}', 'def.res.loseWave': 'ナイストライ！ ウェーブ{n}まで いったよ', 'def.res.loseSub': 'フィズコアのフィズが きれちゃった。つぎは きっと まもれるよ！',
    },
    'zh-Hans': {
      'def.theme.1': '热身', 'def.theme.2': '滚滚冲锋', 'def.theme.3': '举起盾牌！', 'def.theme.4': '空中狙击手', 'def.theme.5': '钳钳王的超强波次', 'def.theme.6': '炮兵游行',
      'def.theme.7': '螃蟹进行曲', 'def.theme.8': '重量级来袭', 'def.theme.9': '两面夹击', 'def.theme.10': '迷你摇柄巨蟹的超强波次', 'def.role.flyer': '飞行', 'def.role.jumper': '跳跃',
      'def.role.roller': '滚动', 'def.role.turret': '炮台', 'def.role.sniper': '狙击', 'def.role.shield': '盾牌', 'def.role.artillery': '投弹',
      'def.role.zapper': '电击', 'def.role.tank': '坦克', 'def.role.heavy': '重型', 'def.role.carrier': '运输', 'def.role.boss': '首领', 'def.gate.N': '北门',
      'def.gate.E': '东门', 'def.gate.W': '西门', 'def.q.repair': '修理', 'def.q.trap': '陷阱', 'def.q.ammo': '弹药', 'def.nextWave': '下一波：第{n}波 · {theme}',
      'def.bigTag': '超强', 'def.newFoe': '{name}（{role}）加入了突袭！', 'def.pinchKing': '钳钳王来袭！', 'def.pinchKingSub': '戴王冠的螃蟹带领超强波次！', 'def.pinchKingName': '钳钳王',
      'def.crankName': '迷你摇柄巨蟹', 'def.flawless': '完美防守！代币+{n}', 'def.res.loseWave': '不错的尝试！你撑到了第{n}波', 'def.res.loseSub': '气泡核心没气了。下次一定能守住！',
    },
    'zh-Hant': {
      'def.theme.1': '暖身', 'def.theme.2': '滾滾衝鋒', 'def.theme.3': '舉起盾牌！', 'def.theme.4': '空中狙擊手', 'def.theme.5': '夾夾王的超大波', 'def.theme.6': '砲兵遊行',
      'def.theme.7': '螃蟹進行曲', 'def.theme.8': '重量級來襲', 'def.theme.9': '兩面夾擊', 'def.theme.10': '迷你發條蟹的超大波', 'def.role.flyer': '飛行', 'def.role.jumper': '跳躍',
      'def.role.roller': '滾動', 'def.role.turret': '砲台', 'def.role.sniper': '狙擊', 'def.role.shield': '盾牌', 'def.role.artillery': '投彈',
      'def.role.zapper': '電擊', 'def.role.tank': '坦克', 'def.role.heavy': '重型', 'def.role.carrier': '運輸', 'def.role.boss': '首領', 'def.gate.N': '北門',
      'def.gate.E': '東門', 'def.gate.W': '西門', 'def.q.repair': '修理', 'def.q.trap': '陷阱', 'def.q.ammo': '彈藥', 'def.nextWave': '下一波：第 {n} 波 · {theme}',
      'def.bigTag': '超大', 'def.newFoe': '{name}（{role}）加入了突襲！', 'def.pinchKing': '夾夾王來襲！', 'def.pinchKingSub': '戴王冠的螃蟹帶領超大波！', 'def.pinchKingName': '夾夾王',
      'def.crankName': '迷你發條蟹', 'def.flawless': '完美防守！代幣 +{n}', 'def.res.loseWave': '不錯的嘗試！你撐到了第 {n} 波', 'def.res.loseSub': '氣泡核心沒氣了。下次一定守得住！',
    },
    ko: {
      'def.theme.1': '몸풀기', 'def.theme.2': '데굴데굴 돌격', 'def.theme.3': '방패 부대!', 'def.theme.4': '하늘의 저격수', 'def.theme.5': '집게킹의 빅 웨이브',
      'def.theme.6': '포병 퍼레이드', 'def.theme.7': '게들의 행진', 'def.theme.8': '헤비급 부대', 'def.theme.9': '양쪽 협공', 'def.theme.10': '미니 크랭크크랩의 빅 웨이브',
      'def.role.flyer': '비행', 'def.role.jumper': '점프', 'def.role.roller': '굴러가기', 'def.role.turret': '포탑', 'def.role.sniper': '저격', 'def.role.shield': '방패',
      'def.role.artillery': '투척', 'def.role.zapper': '전기', 'def.role.tank': '탱크', 'def.role.heavy': '헤비', 'def.role.carrier': '운반', 'def.role.boss': '보스',
      'def.gate.N': '북쪽', 'def.gate.E': '동쪽', 'def.gate.W': '서쪽', 'def.q.repair': '수리', 'def.q.trap': '함정', 'def.q.ammo': '탄약',
      'def.nextWave': '다음: 웨이브 {n} · {theme}', 'def.bigTag': '빅', 'def.newFoe': '{name}({role}) 등장!', 'def.pinchKing': '집게킹이 와요!',
      'def.pinchKingSub': '왕관 쓴 게가 빅 웨이브를 이끌어요!', 'def.pinchKingName': '집게킹', 'def.crankName': '미니 크랭크크랩', 'def.flawless': '완벽한 방어! 토큰 +{n}',
      'def.res.loseWave': '잘했어요! 웨이브 {n}까지 갔어요', 'def.res.loseSub': '피즈 코어가 꺼졌어요. 다음엔 꼭 지킬 수 있어요!',
    },
    es: {
      'def.theme.1': 'Calentamiento', 'def.theme.2': 'Avalancha rodante', 'def.theme.3': '¡Escudos arriba!', 'def.theme.4': 'Francotiradores del cielo',
      'def.theme.5': 'Gran oleada del Rey Pinzabot', 'def.theme.6': 'Desfile de artillería', 'def.theme.7': 'Marcha de cangrejos',
      'def.theme.8': 'Pesos pesados', 'def.theme.9': 'Ataque en pinza', 'def.theme.10': 'Gran oleada del Mini Cangretuerca', 'def.role.flyer': 'Volador',
      'def.role.jumper': 'Brincador', 'def.role.roller': 'Rodador', 'def.role.turret': 'Torreta', 'def.role.sniper': 'Tirador',
      'def.role.shield': 'Escudo', 'def.role.artillery': 'Lanzador', 'def.role.zapper': 'Eléctrico', 'def.role.tank': 'Tanque', 'def.role.heavy': 'Pesado',
      'def.role.carrier': 'Porteador', 'def.role.boss': 'Jefe', 'def.gate.N': 'Norte', 'def.gate.E': 'Este', 'def.gate.W': 'Oeste',
      'def.q.repair': 'Reparar', 'def.q.trap': 'Trampa', 'def.q.ammo': 'Munición', 'def.nextWave': 'Siguiente: oleada {n} · {theme}', 'def.bigTag': 'GRAN',
      'def.newFoe': '¡{name} ({role}) se une al ataque!', 'def.pinchKing': '¡Llega el Rey Pinzabot!',
      'def.pinchKingSub': '¡Un cangrejo con corona dirige la gran oleada!', 'def.pinchKingName': 'Rey Pinzabot', 'def.crankName': 'Mini Cangretuerca',
      'def.flawless': '¡Oleada perfecta! +{n} fichas', 'def.res.loseWave': '¡Buen intento! Llegaste a la oleada {n}',
      'def.res.loseSub': 'El Núcleo Fizz se apagó. ¡La próxima vez lo lograrás!',
    },
    fr: {
      'def.theme.1': 'Échauffement', 'def.theme.2': 'Ruée roulante', 'def.theme.3': 'Boucliers levés !', 'def.theme.4': 'Snipers du ciel',
      'def.theme.5': 'Grosse vague du Roi Pincebot', 'def.theme.6': 'Défilé d\'artillerie', 'def.theme.7': 'Marche des crabes',
      'def.theme.8': 'Poids lourds', 'def.theme.9': 'Attaque en tenaille', 'def.theme.10': 'Grosse vague du Mini Crabomanivelle', 'def.role.flyer': 'Volant',
      'def.role.jumper': 'Bondisseur', 'def.role.roller': 'Rouleur', 'def.role.turret': 'Tourelle', 'def.role.sniper': 'Sniper', 'def.role.shield': 'Bouclier',
      'def.role.artillery': 'Lanceur', 'def.role.zapper': 'Électrique', 'def.role.tank': 'Tank', 'def.role.heavy': 'Costaud', 'def.role.carrier': 'Porteur',
      'def.role.boss': 'Boss', 'def.gate.N': 'Nord', 'def.gate.E': 'Est', 'def.gate.W': 'Ouest', 'def.q.repair': 'Réparer', 'def.q.trap': 'Piège',
      'def.q.ammo': 'Munitions', 'def.nextWave': 'Ensuite : vague {n} · {theme}', 'def.bigTag': 'GROSSE',
      'def.newFoe': '{name} ({role}) rejoint l\'assaut !', 'def.pinchKing': 'Le Roi Pincebot arrive !',
      'def.pinchKingSub': 'Un crabe couronné mène la grosse vague !', 'def.pinchKingName': 'Roi Pincebot', 'def.crankName': 'Mini Crabomanivelle',
      'def.flawless': 'Vague parfaite ! +{n} jetons', 'def.res.loseWave': 'Bien essayé ! Tu as atteint la vague {n}',
      'def.res.loseSub': 'Le Cœur Pétillant s\'est éteint. Tu y arriveras la prochaine fois !',
    },
    de: {
      'def.theme.1': 'Aufwärmen', 'def.theme.2': 'Roll-Ansturm', 'def.theme.3': 'Schilde hoch!', 'def.theme.4': 'Himmels-Scharfschützen',
      'def.theme.5': 'Riesenwelle des Zwickkönigs', 'def.theme.6': 'Artillerie-Parade', 'def.theme.7': 'Krabbenmarsch', 'def.theme.8': 'Schwergewichte',
      'def.theme.9': 'Zangenangriff', 'def.theme.10': 'Riesenwelle der Mini-Kurbelkrabbe', 'def.role.flyer': 'Flieger', 'def.role.jumper': 'Springer',
      'def.role.roller': 'Roller', 'def.role.turret': 'Geschütz', 'def.role.sniper': 'Schütze', 'def.role.shield': 'Schild', 'def.role.artillery': 'Werfer',
      'def.role.zapper': 'Zapper', 'def.role.tank': 'Panzer', 'def.role.heavy': 'Schwer', 'def.role.carrier': 'Träger', 'def.role.boss': 'Boss',
      'def.gate.N': 'Nord', 'def.gate.E': 'Ost', 'def.gate.W': 'West', 'def.q.repair': 'Reparieren', 'def.q.trap': 'Falle', 'def.q.ammo': 'Munition',
      'def.nextWave': 'Als Nächstes: Welle {n} · {theme}', 'def.bigTag': 'RIESIG', 'def.newFoe': '{name} ({role}) mischt mit!',
      'def.pinchKing': 'Der Zwickkönig kommt!', 'def.pinchKingSub': 'Eine Krabbe mit Krone führt die Riesenwelle an!', 'def.pinchKingName': 'Zwickkönig',
      'def.crankName': 'Mini-Kurbelkrabbe', 'def.flawless': 'Makellose Welle! +{n} Marken', 'def.res.loseWave': 'Gut gemacht! Du hast Welle {n} erreicht',
      'def.res.loseSub': 'Der Sprudelkern ist verpufft. Nächstes Mal klappt es!',
    },
    'pt-BR': {
      'def.theme.1': 'Aquecimento', 'def.theme.2': 'Avalanche rolante', 'def.theme.3': 'Escudos ao alto!', 'def.theme.4': 'Atiradores do céu',
      'def.theme.5': 'Onda gigante do Rei Pinçabô', 'def.theme.6': 'Desfile de artilharia', 'def.theme.7': 'Marcha dos caranguejos',
      'def.theme.8': 'Pesos-pesados', 'def.theme.9': 'Ataque em pinça', 'def.theme.10': 'Onda gigante do Mini Caranguejão', 'def.role.flyer': 'Voador',
      'def.role.jumper': 'Saltador', 'def.role.roller': 'Rolador', 'def.role.turret': 'Torreta', 'def.role.sniper': 'Atirador', 'def.role.shield': 'Escudo',
      'def.role.artillery': 'Lançador', 'def.role.zapper': 'Elétrico', 'def.role.tank': 'Tanque', 'def.role.heavy': 'Pesado',
      'def.role.carrier': 'Carregador', 'def.role.boss': 'Chefe', 'def.gate.N': 'Norte', 'def.gate.E': 'Leste', 'def.gate.W': 'Oeste',
      'def.q.repair': 'Consertar', 'def.q.trap': 'Armadilha', 'def.q.ammo': 'Munição', 'def.nextWave': 'Próxima: onda {n} · {theme}',
      'def.bigTag': 'GIGANTE', 'def.newFoe': '{name} ({role}) entrou no ataque!', 'def.pinchKing': 'Lá vem o Rei Pinçabô!',
      'def.pinchKingSub': 'Um caranguejo de coroa lidera a onda gigante!', 'def.pinchKingName': 'Rei Pinçabô', 'def.crankName': 'Mini Caranguejão',
      'def.flawless': 'Onda perfeita! +{n} fichas', 'def.res.loseWave': 'Boa tentativa! Você chegou à onda {n}',
      'def.res.loseSub': 'O Núcleo Fizz apagou. Da próxima vez você consegue!',
    },
    it: {
      'def.theme.1': 'Riscaldamento', 'def.theme.2': 'Assalto rotolante', 'def.theme.3': 'Scudi alzati!', 'def.theme.4': 'Cecchini del cielo',
      'def.theme.5': 'Ondata gigante del Re Pinzabot', 'def.theme.6': 'Parata d\'artiglieria', 'def.theme.7': 'Marcia dei granchi',
      'def.theme.8': 'Pesi massimi', 'def.theme.9': 'Attacco a tenaglia', 'def.theme.10': 'Ondata gigante del Mini Meccagranchio',
      'def.role.flyer': 'Volante', 'def.role.jumper': 'Saltatore', 'def.role.roller': 'Rotolante', 'def.role.turret': 'Torretta',
      'def.role.sniper': 'Cecchino', 'def.role.shield': 'Scudo', 'def.role.artillery': 'Lanciatore', 'def.role.zapper': 'Elettrico',
      'def.role.tank': 'Carro', 'def.role.heavy': 'Pesante', 'def.role.carrier': 'Trasportatore', 'def.role.boss': 'Boss', 'def.gate.N': 'Nord',
      'def.gate.E': 'Est', 'def.gate.W': 'Ovest', 'def.q.repair': 'Ripara', 'def.q.trap': 'Trappola', 'def.q.ammo': 'Munizioni',
      'def.nextWave': 'Prossima: ondata {n} · {theme}', 'def.bigTag': 'GIGANTE', 'def.newFoe': '{name} ({role}) si unisce all\'assalto!',
      'def.pinchKing': 'Arriva il Re Pinzabot!', 'def.pinchKingSub': 'Un granchio con la corona guida l\'ondata gigante!',
      'def.pinchKingName': 'Re Pinzabot', 'def.crankName': 'Mini Meccagranchio', 'def.flawless': 'Ondata perfetta! +{n} gettoni',
      'def.res.loseWave': 'Bel tentativo! Sei arrivato all\'ondata {n}', 'def.res.loseSub': 'Il Nucleo Fizz si è spento. La prossima volta ce la farai!',
    },
    ru: {
      'def.theme.1': 'Разминка', 'def.theme.2': 'Катящийся натиск', 'def.theme.3': 'Щиты вверх!', 'def.theme.4': 'Небесные снайперы',
      'def.theme.5': 'Большая волна Короля Щипоботов', 'def.theme.6': 'Парад артиллерии', 'def.theme.7': 'Крабий марш', 'def.theme.8': 'Тяжеловесы',
      'def.theme.9': 'Атака в клещи', 'def.theme.10': 'Большая волна Мини-Кранкраба', 'def.role.flyer': 'Летун', 'def.role.jumper': 'Прыгун',
      'def.role.roller': 'Катун', 'def.role.turret': 'Турель', 'def.role.sniper': 'Снайпер', 'def.role.shield': 'Щит', 'def.role.artillery': 'Метатель',
      'def.role.zapper': 'Искрун', 'def.role.tank': 'Танк', 'def.role.heavy': 'Тяжёлый', 'def.role.carrier': 'Носильщик', 'def.role.boss': 'Босс',
      'def.gate.N': 'Север', 'def.gate.E': 'Восток', 'def.gate.W': 'Запад', 'def.q.repair': 'Ремонт', 'def.q.trap': 'Ловушка', 'def.q.ammo': 'Патроны',
      'def.nextWave': 'Далее: волна {n} · {theme}', 'def.bigTag': 'БОЛЬШАЯ', 'def.newFoe': '{name} ({role}) вступает в бой!',
      'def.pinchKing': 'Идёт Король Щипоботов!', 'def.pinchKingSub': 'Краб в короне ведёт большую волну!', 'def.pinchKingName': 'Король Щипоботов',
      'def.crankName': 'Мини-Кранкраб', 'def.flawless': 'Без единой царапины! +{n} жетонов', 'def.res.loseWave': 'Хорошая попытка! Ты дошёл до волны {n}',
      'def.res.loseSub': 'Шипучее ядро выдохлось. В следующий раз получится!',
    },
    id: {
      'def.theme.1': 'Pemanasan', 'def.theme.2': 'Serbuan menggelinding', 'def.theme.3': 'Perisai siap!', 'def.theme.4': 'Penembak jitu udara',
      'def.theme.5': 'Gelombang besar Raja Capitbot', 'def.theme.6': 'Parade artileri', 'def.theme.7': 'Pawai kepiting', 'def.theme.8': 'Kelas berat',
      'def.theme.9': 'Serangan jepit', 'def.theme.10': 'Gelombang besar Kepiting Engkol mini', 'def.role.flyer': 'Penerbang', 'def.role.jumper': 'Peloncat',
      'def.role.roller': 'Gelinding', 'def.role.turret': 'Menara', 'def.role.sniper': 'Penembak', 'def.role.shield': 'Perisai',
      'def.role.artillery': 'Pelempar', 'def.role.zapper': 'Penyetrum', 'def.role.tank': 'Tank', 'def.role.heavy': 'Berat', 'def.role.carrier': 'Pengangkut',
      'def.role.boss': 'Bos', 'def.gate.N': 'Utara', 'def.gate.E': 'Timur', 'def.gate.W': 'Barat', 'def.q.repair': 'Perbaiki', 'def.q.trap': 'Jebakan',
      'def.q.ammo': 'Amunisi', 'def.nextWave': 'Berikutnya: gelombang {n} · {theme}', 'def.bigTag': 'BESAR', 'def.newFoe': '{name} ({role}) ikut menyerbu!',
      'def.pinchKing': 'Raja Capitbot datang!', 'def.pinchKingSub': 'Kepiting bermahkota memimpin gelombang besar!', 'def.pinchKingName': 'Raja Capitbot',
      'def.crankName': 'Kepiting Engkol mini', 'def.flawless': 'Gelombang sempurna! +{n} token',
      'def.res.loseWave': 'Usaha bagus! Kamu sampai gelombang {n}', 'def.res.loseSub': 'Inti Soda padam. Lain kali pasti bisa!',
    },
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_modes.js]', e); }
// ---- 93_lang_onboard.js
try { (function () {
// Strings for the first-hour onboarding pass: boot fallbacks (99_main.js), the control-style picker
// (30c_menus_title.js: Pro no longer changes button size, desktop variant), tutorial resume
// (26_training.js), Fizzport lock plates, facility tags, the first-mission chip and new-facility
// announcements (20_hub.js). Loads after the 90_* packs, so the re-registered keys override them.
// Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const S = {
    // ---- boot (99_main.js; the splash in index.html carries its own tiny dictionary)
    'err.engine': ['The 3D engine couldn’t load. Check your internet connection and try again!', '3Dエンジンを よみこめなかったよ。インターネットの せつぞくを たしかめて、もういちど ためしてね！', '3D引擎加载失败。请检查网络连接后再试一次！', '3D引擎載入失敗。請檢查網路連線後再試一次！', '3D 엔진을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 해 보세요!', 'No se pudo cargar el motor 3D. ¡Revisa tu conexión a internet y vuelve a intentarlo!', 'Le moteur 3D n’a pas pu se charger. Vérifie ta connexion Internet et réessaie !', 'Die 3D-Engine konnte nicht geladen werden. Prüf deine Internetverbindung und versuch es noch mal!', 'Não deu para carregar o motor 3D. Confira sua conexão com a internet e tente de novo!', 'Il motore 3D non si è caricato. Controlla la connessione a Internet e riprova!', 'Не удалось загрузить 3D-движок. Проверь подключение к интернету и попробуй ещё раз!', 'Mesin 3D gagal dimuat. Periksa koneksi internetmu lalu coba lagi!'],
    'err.boot': ['Oops! Something went wrong while starting the game. Let’s try again!', 'あれれ？ ゲームを はじめるときに うまく いかなかったよ。もういちど ためしてね！', '哎呀！游戏启动时出了点问题。我们再试一次吧！', '哎呀！遊戲啟動時出了點問題。我們再試一次吧！', '앗! 게임을 시작하다가 문제가 생겼어요. 다시 해 봐요!', '¡Ups! Algo salió mal al iniciar el juego. ¡Intentémoslo otra vez!', 'Oups ! Un souci est arrivé au démarrage du jeu. On réessaie ?', 'Hoppla! Beim Starten ist etwas schiefgegangen. Versuchen wir es noch mal!', 'Opa! Algo deu errado ao iniciar o jogo. Vamos tentar de novo!', 'Ops! Qualcosa è andato storto all’avvio del gioco. Riproviamo!', 'Ой! Что-то пошло не так при запуске игры. Давай попробуем ещё раз!', 'Ups! Ada masalah saat memulai game. Ayo coba lagi!'],
    'ui.retry': ['Try again', 'もういちど', '再试一次', '再試一次', '다시 하기', 'Reintentar', 'Réessayer', 'Nochmal versuchen', 'Tentar de novo', 'Riprova', 'Ещё раз', 'Coba lagi'],
    // ---- control style picker: presets only change aim help / auto-fire (button size is its own setting)
    'title.preset.proD': ['Light aim help. For sharpshooters!', 'エイムアシストは ひかえめ。うでじまんの レンジャーに！', '轻度瞄准辅助。神射手专用！', '輕度瞄準輔助。給神射手！', '약한 조준 보조. 명사수를 위한 설정!', 'Poca ayuda al apuntar. ¡Para gente con buena puntería!', 'Légère aide à la visée. Pour les as de la visée !', 'Leichte Zielhilfe. Für Meisterschützen!', 'Pouca ajuda na mira. Para quem tem mira afiada!', 'Aiuto mira leggero. Per chi ha una mira infallibile!', 'Слабая помощь в прицеливании. Для метких стрелков!', 'Bantuan bidik ringan. Untuk penembak jitu!'],
    'title.presetNoteDesk': ['You can change these any time in Settings.', 'せっていで いつでも かえられるよ。', '随时可以在设置中更改。', '隨時都可以在設定中更改。', '설정에서 언제든 바꿀 수 있어요.', 'Puedes cambiarlo cuando quieras en Ajustes.', 'Tu peux changer ça à tout moment dans les Options.', 'Du kannst das jederzeit in den Einstellungen ändern.', 'Você pode mudar isso quando quiser em Opções.', 'Puoi cambiarlo quando vuoi nelle Impostazioni.', 'Это можно изменить в любой момент в настройках.', 'Kamu bisa mengubahnya kapan saja di Pengaturan.'],
    'title.desk.breezyD': ['Gentle bots and a relaxed pace. Great for your first adventure!', 'ロボは やさしめで、のんびり あそべるよ。はじめての ぼうけんに ぴったり！', '机器人很温和，节奏轻松。最适合第一次冒险！', '機器人很溫和，節奏輕鬆。最適合第一次冒險！', '순한 로봇과 느긋한 속도. 첫 모험에 딱이에요!', 'Bots amables y ritmo tranquilo. ¡Ideal para tu primera aventura!', 'Des robots gentils et un rythme tranquille. Parfait pour ta première aventure !', 'Sanfte Bots und gemütliches Tempo. Ideal für dein erstes Abenteuer!', 'Robôs bonzinhos e ritmo tranquilo. Ótimo para a sua primeira aventura!', 'Robot gentili e ritmo rilassato. Perfetto per la tua prima avventura!', 'Добрые роботы и спокойный темп. Отлично для первого приключения!', 'Robot yang lembut dan tempo santai. Cocok untuk petualangan pertamamu!'],
    'title.desk.normalD': ['The standard challenge. Bots fight back a little harder!', 'ふつうの むずかしさ。ロボも ちょっぴり てごわいよ！', '标准难度。机器人会更努力地反击！', '標準難度。機器人會更努力地反擊！', '기본 난이도. 로봇이 조금 더 세게 반격해요!', 'El reto normal. ¡Los bots se defienden un poco más!', 'Le défi normal. Les robots ripostent un peu plus fort !', 'Die normale Herausforderung. Die Bots wehren sich etwas mehr!', 'O desafio padrão. Os robôs revidam um pouco mais!', 'La sfida normale. I robot reagiscono un po’ di più!', 'Обычная сложность. Роботы дают сдачи чуть сильнее!', 'Tantangan standar. Robot melawan sedikit lebih kuat!'],
    'title.desk.spicyD': ['Tougher bots for experienced Rangers.', 'てごわい ロボたち。なれた レンジャー むけ。', '更强的机器人，适合老练的游侠。', '更強的機器人，適合老練的遊俠。', '더 강한 로봇. 숙련된 레인저용이에요.', 'Bots más duros para Rangers con experiencia.', 'Des robots plus coriaces pour les Rangers aguerris.', 'Härtere Bots für erfahrene Ranger.', 'Robôs mais durões para Rangers experientes.', 'Robot più tosti per Ranger esperti.', 'Роботы покрепче для опытных рейнджеров.', 'Robot lebih tangguh untuk Ranger berpengalaman.'],
    'title.desk.blazingD': ['The biggest challenge! Bots hit hard and fast.', 'さいきょうの チャレンジ！ ロボの こうげきは はやくて つよいよ。', '最大挑战！机器人攻击又快又猛。', '最大挑戰！機器人攻擊又快又猛。', '최고의 도전! 로봇이 빠르고 세게 공격해요.', '¡El mayor reto! Los bots pegan fuerte y rápido.', 'Le plus grand défi ! Les robots frappent fort et vite.', 'Die größte Herausforderung! Die Bots treffen hart und schnell.', 'O maior desafio! Os robôs batem forte e rápido.', 'La sfida più grande! I robot colpiscono forte e veloce.', 'Самое сложное испытание! Роботы бьют быстро и сильно.', 'Tantangan terbesar! Robot menyerang keras dan cepat.'],
    'title.desk.sens': ['Mouse look speed', 'マウスで 見まわす はやさ', '鼠标视角速度', '滑鼠視角速度', '마우스 시점 속도', 'Velocidad de la vista con el ratón', 'Vitesse de la visée à la souris', 'Blickgeschwindigkeit der Maus', 'Velocidade da mira com o mouse', 'Velocità della visuale col mouse', 'Скорость обзора мышью', 'Kecepatan pandang mouse'],
    'title.desk.slow': ['Slow', 'ゆっくり', '慢', '慢', '느리게', 'Lenta', 'Lente', 'Langsam', 'Lenta', 'Lenta', 'Медленно', 'Lambat'],
    'title.desk.fast': ['Fast', 'はやい', '快', '快', '빠르게', 'Rápida', 'Rapide', 'Schnell', 'Rápida', 'Veloce', 'Быстро', 'Cepat'],
    // ---- tutorial resume (26_training.js)
    'tut.resumeTitle': ['Welcome back!', 'おかえり！', '欢迎回来！', '歡迎回來！', '다시 만나서 반가워요!', '¡Hola de nuevo!', 'Te revoilà !', 'Willkommen zurück!', 'Que bom te ver de volta!', 'Eccoti di nuovo!', 'С возвращением!', 'Selamat datang kembali!'],
    'tut.resumeQ': ['Pick up the tutorial where you left off?', 'チュートリアルの つづきから あそぶ？', '要从上次停下的地方继续教学吗？', '要從上次停下的地方繼續教學嗎？', '튜토리얼을 멈춘 곳부터 이어서 할까요?', '¿Seguimos el tutorial donde lo dejaste?', 'On reprend le tutoriel là où tu en étais ?', 'Möchtest du das Tutorial dort fortsetzen, wo du aufgehört hast?', 'Continuar o tutorial de onde você parou?', 'Riprendiamo il tutorial da dove l’avevi lasciato?', 'Продолжим обучение с того же места?', 'Lanjutkan tutorial dari bagian terakhir?'],
    'tut.resumeStep': ['Step {n} of {total}', 'ステップ {n} / {total}', '第 {n} 步，共 {total} 步', '第 {n} 步，共 {total} 步', '{total}단계 중 {n}단계', 'Paso {n} de {total}', 'Étape {n} sur {total}', 'Schritt {n} von {total}', 'Passo {n} de {total}', 'Passo {n} di {total}', 'Шаг {n} из {total}', 'Langkah {n} dari {total}'],
    'tut.continue': ['Continue', 'つづきから', '继续', '繼續', '이어서 하기', 'Continuar', 'Continuer', 'Weiter', 'Continuar', 'Continua', 'Продолжить', 'Lanjutkan'],
    'tut.restart': ['Start over', 'さいしょから', '从头开始', '從頭開始', '처음부터', 'Empezar de nuevo', 'Recommencer', 'Von vorn', 'Começar de novo', 'Ricomincia', 'Сначала', 'Ulang dari awal'],
    'tut.resumeHi': ['Welcome back, Kiko! Let’s keep going!', 'おかえり、キコ！ つづきから いこう！', '欢迎回来，琪可！我们继续吧！', '歡迎回來，琪可！我們繼續吧！', '다시 왔네요, 키코! 계속해 봐요!', '¡Hola de nuevo, Kiko! ¡Sigamos!', 'Te revoilà, Kiko ! On continue !', 'Willkommen zurück, Kiko! Weiter geht’s!', 'Que bom te ver, Kiko! Vamos continuar!', 'Eccoti, Kiko! Andiamo avanti!', 'С возвращением, Кико! Продолжаем!', 'Selamat datang kembali, Kiko! Ayo lanjut!'],
    // ---- Fizzport locks: a progress lock, never unfinished content ("Locked", not "coming soon")
    'hub.closed': ['Locked', 'ロック中', '未解锁', '未解鎖', '잠김', 'Bloqueado', 'Verrouillé', 'Gesperrt', 'Bloqueado', 'Bloccato', 'Закрыто', 'Terkunci'],
    'hub.use.locked': ['Locked', 'ロック中', '未解锁', '未解鎖', '잠김', 'Bloqueado', 'Verrouillé', 'Gesperrt', 'Bloqueado', 'Bloccato', 'Закрыто', 'Terkunci'],
    'hub.lockShort1': ['Opens after your next mission', 'つぎの ミッションの あとで オープン', '下次任务后开放', '下次任務後開放', '다음 미션 후에 열려요', 'Abre tras tu próxima misión', 'Ouvre après ta prochaine mission', 'Öffnet nach deiner nächsten Mission', 'Abre depois da sua próxima missão', 'Apre dopo la tua prossima missione', 'Откроется после следующей миссии', 'Buka setelah misi berikutnya'],
    'hub.lockShortN': ['Opens after {n} more missions', 'あと {n}かい ミッションで オープン', '再完成 {n} 个任务后开放', '再完成 {n} 個任務後開放', '미션 {n}개 더 하면 열려요', 'Abre tras {n} misiones más', 'Ouvre après {n} missions de plus', 'Öffnet nach {n} weiteren Missionen', 'Abre depois de mais {n} missões', 'Apre dopo altre {n} missioni', 'Миссий до открытия: {n}', 'Buka setelah {n} misi lagi'],
    'hub.lock.mn': ['{name} opens after {n} more missions!', '{name}は あと{n}かい ミッションを クリアすると ひらくよ！', '再完成 {n} 个任务，{name}就会开放！', '再完成 {n} 個任務，{name}就會開放！', '{name}: 미션을 {n}개 더 하면 열려요!', '¡{name} abre tras {n} misiones más!', '{name} ouvre après {n} missions de plus !', '{name} öffnet nach {n} weiteren Missionen!', '{name} abre depois de mais {n} missões!', '{name} apre dopo altre {n} missioni!', '{name} откроется совсем скоро — осталось миссий: {n}!', '{name} buka setelah {n} misi lagi!'],
    'hub.lockPlate': ['Locked\n{hint}', 'ロック中\n{hint}', '未解锁\n{hint}', '未解鎖\n{hint}', '잠김\n{hint}', 'Bloqueado\n{hint}', 'Verrouillé\n{hint}', 'Gesperrt\n{hint}', 'Bloqueado\n{hint}', 'Bloccato\n{hint}', 'Закрыто\n{hint}', 'Terkunci\n{hint}'],
    'hub.lockPrompt': ['Locked · {hint}', 'ロック中・{hint}', '未解锁 · {hint}', '未解鎖 · {hint}', '잠김 · {hint}', 'Bloqueado · {hint}', 'Verrouillé · {hint}', 'Gesperrt · {hint}', 'Bloqueado · {hint}', 'Bloccato · {hint}', 'Закрыто · {hint}', 'Terkunci · {hint}'],
    // ---- the Ranger Locker cabinet on the plaza (20_hub.js; open from the start, looks are cosmetic)
    'hub.use.locker': ['Open the Ranger Locker', 'レンジャーロッカーを ひらく', '打开游侠衣柜', '打開遊俠衣櫃', '레인저 사물함 열기', 'Abrir la Taquilla Ranger', 'Ouvrir le Casier Ranger', 'Ranger-Spind öffnen', 'Abrir o Armário Ranger', 'Apri l’Armadietto Ranger', 'Открыть шкафчик рейнджера', 'Buka Loker Ranger'],
    'hub.tag.new': ['NEW!', 'NEW!', '新！', '新！', 'NEW!', '¡NUEVO!', 'NOUVEAU !', 'NEU!', 'NOVO!', 'NUOVO!', 'НОВОЕ!', 'BARU!'],
    // ---- after the tutorial: straight to the first mission; new facilities are announced once
    'hub.sug.first': ['Start your first mission!', 'はじめての ミッションへ GO！', '开始你的第一个任务！', '開始你的第一個任務！', '첫 미션을 시작해요!', '¡Empieza tu primera misión!', 'Lance ta première mission !', 'Starte deine erste Mission!', 'Comece sua primeira missão!', 'Inizia la tua prima missione!', 'Начни свою первую миссию!', 'Mulai misi pertamamu!'],
    'hub.beepo.first': ['Time for our first mission! Follow the star to the Mission Board!', 'はじめての ミッションだ！ ★を おって ミッションボードへ いこう！', '第一个任务来啦！跟着星星去任务板吧！', '第一個任務來囉！跟著星星去任務看板吧！', '첫 미션 시간이에요! 별을 따라 미션 게시판으로 가요!', '¡Hora de nuestra primera misión! ¡Sigue la estrella hasta el Tablón de Misiones!', 'C’est l’heure de notre première mission ! Suis l’étoile jusqu’au Tableau des missions !', 'Zeit für unsere erste Mission! Folge dem Stern zur Missionstafel!', 'Hora da nossa primeira missão! Siga a estrela até o Quadro de Missões!', 'È l’ora della nostra prima missione! Segui la stella fino alla Bacheca Missioni!', 'Пора на первую миссию! Следуй за звездой к Доске миссий!', 'Saatnya misi pertama kita! Ikuti bintangnya ke Papan Misi!'],
    'hub.beepo.newMany': ['Wow! {n} new places just opened! Follow the markers!', 'わあ！ 新しい ばしょが {n}つも ひらいたよ！ マーカーを おってみて！', '哇！一下开放了 {n} 个新地方！跟着标记走吧！', '哇！一下開放了 {n} 個新地方！跟著標記走吧！', '와! 새로운 곳이 {n}군데나 열렸어요! 표시를 따라가 봐요!', '¡Guau! ¡Se abrieron {n} lugares nuevos! ¡Sigue los marcadores!', 'Waouh ! {n} nouveaux lieux viennent d’ouvrir ! Suis les repères !', 'Wow! {n} neue Orte haben gerade geöffnet! Folge den Markierungen!', 'Uau! {n} lugares novos acabaram de abrir! Siga os marcadores!', 'Wow! Si sono appena aperti {n} posti nuovi! Segui i segnalini!', 'Ух ты! Открылись новые места: {n}! Иди по меткам!', 'Wah! {n} tempat baru baru saja buka! Ikuti penandanya!'],
  };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_onboard.js]', e); }
// ---- 93_lang_pages.js
try { (function () {
// Strings for the public site as an app (99_main.js G.PWA, 00b_screen.js G.Screen.fs, 30c title corner, Settings →
// Graphics): the "new version is ready" notice, offline / updated toasts, the Full screen button and switch, and the
// iPhone "Add to Home Screen" hint ({share} = where the Safari Share icon is drawn; the quoted menu names follow
// iOS's own wording in each language; pwa.hint.save names the game's own Settings labels through placeholders: a
// home-screen web app on iOS keeps its own storage, so the save code is how progress moves over). The home-screen icon is labelled "Marmalune" (apple-mobile-web-app-title).
// Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const S = {
    'pwa.update': ['A new version is ready!', 'あたらしいバージョンが とどいたよ！', '新版本准备好啦！', '新版本準備好囉！', '새 버전이 준비됐어요!', '¡Hay una versión nueva lista!', 'Une nouvelle version est prête !', 'Eine neue Version ist da!', 'Tem uma versão nova pronta!', 'È pronta una nuova versione!', 'Готова новая версия!', 'Versi baru sudah siap!'],
    'pwa.restart': ['Restart', 'リスタート', '重新启动', '重新啟動', '다시 시작', 'Reiniciar', 'Redémarrer', 'Neu starten', 'Reiniciar', 'Riavvia', 'Перезапустить', 'Mulai ulang'],
    'pwa.later': ['Later', 'あとで', '稍后', '稍後', '나중에', 'Más tarde', 'Plus tard', 'Später', 'Depois', 'Più tardi', 'Позже', 'Nanti'],
    'pwa.updated': ['Updated to v{v}!', 'v{v} に アップデートしたよ！', '已更新到 v{v}！', '已更新到 v{v}！', 'v{v} 버전으로 업데이트했어요!', '¡Actualizado a la v{v}!', 'Mis à jour en v{v} !', 'Auf v{v} aktualisiert!', 'Atualizado para a v{v}!', 'Aggiornato alla v{v}!', 'Обновлено до v{v}!', 'Sudah diperbarui ke v{v}!'],
    'pwa.offline': ['Ready to play offline, too!', 'オフラインでも あそべるように なったよ！', '现在离线也能玩啦！', '現在離線也能玩囉！', '이제 오프라인에서도 놀 수 있어요!', '¡Ya puedes jugar también sin conexión!', 'Tu peux aussi jouer hors ligne maintenant !', 'Jetzt kannst du auch offline spielen!', 'Agora dá para jogar offline também!', 'Ora puoi giocare anche offline!', 'Теперь можно играть и без интернета!', 'Sekarang bisa main tanpa internet juga!'],
    'pwa.fs': ['Full screen', 'ぜんがめん', '全屏', '全螢幕', '전체 화면', 'Pantalla completa', 'Plein écran', 'Vollbild', 'Tela cheia', 'Schermo intero', 'Во весь экран', 'Layar penuh'],
    'pwa.fsExit': ['Exit full screen', 'ぜんがめんを やめる', '退出全屏', '結束全螢幕', '전체 화면 끝내기', 'Salir de pantalla completa', 'Quitter le plein écran', 'Vollbild beenden', 'Sair da tela cheia', 'Esci da schermo intero', 'Выйти из полноэкранного режима', 'Keluar dari layar penuh'],
    'pwa.fsRow': ['Full screen', 'ぜんがめん表示', '全屏显示', '全螢幕顯示', '전체 화면', 'Pantalla completa', 'Plein écran', 'Vollbild', 'Tela cheia', 'Schermo intero', 'Полноэкранный режим', 'Layar penuh'],
    'pwa.how': ['How?', 'やりかた', '怎么做？', '怎麼做？', '방법 보기', '¿Cómo?', 'Comment ?', 'Wie?', 'Como?', 'Come?', 'Как?', 'Caranya?'],
    'pwa.hint.title': ['Play in full screen!', 'ぜんがめんで あそぼう！', '全屏来玩吧！', '用全螢幕來玩吧！', '전체 화면으로 놀아요!', '¡Juega a pantalla completa!', 'Joue en plein écran !', 'Spiel im Vollbild!', 'Jogue em tela cheia!', 'Gioca a schermo intero!', 'Играй во весь экран!', 'Main di layar penuh!'],
    'pwa.hint.short': ['Tap {share}, then “Add to Home Screen”.', '{share} を タップして「ホーム画面に追加」を えらんでね。', '点击 {share}，再选“添加到主屏幕”。', '點一下 {share}，再選「加入主畫面」。', '{share} 버튼을 누르고 ‘홈 화면에 추가’를 고르세요.', 'Toca {share} y elige «Añadir a pantalla de inicio».', 'Touche {share}, puis « Sur l’écran d’accueil ».', 'Tippe auf {share} und dann auf „Zum Home-Bildschirm“.', 'Toque em {share} e escolha “Adicionar à Tela de Início”.', 'Tocca {share} e poi «Aggiungi alla schermata Home».', 'Нажми {share}, затем «На экран „Домой“».', 'Ketuk {share}, lalu pilih “Tambah ke Layar Utama”.'],
    // (newer iOS Safari keeps Share inside its "•••" menu in the compact layout)
    'pwa.hint.s1': ['In Safari, tap the Share button {share} (on newer iPhones it may be under “•••”).', 'Safariの 共有ボタン {share} を タップしてね（あたらしい iPhoneでは「•••」の なかに あることも あるよ）。', '在 Safari 中点击共享按钮 {share}（较新的 iPhone 上可能在“•••”里）。', '在 Safari 點一下分享按鈕 {share}（較新的 iPhone 可能在「•••」裡）。', 'Safari에서 공유 버튼 {share}을 누르세요. (최신 iPhone에서는 ‘•••’ 안에 있을 수 있어요.)', 'En Safari, toca el botón Compartir {share} (en los iPhone más nuevos puede estar en «•••»).', 'Dans Safari, touche le bouton Partager {share} (sur les iPhone récents, il peut être dans « ••• »).', 'Tippe in Safari auf „Teilen“ {share} (auf neueren iPhones steckt es eventuell unter „•••“).', 'No Safari, toque no botão Compartilhar {share} (nos iPhones mais novos, ele pode estar em “•••”).', 'In Safari, tocca il pulsante Condividi {share} (sugli iPhone più recenti potrebbe essere in «•••»).', 'В Safari нажми кнопку «Поделиться» {share} (на новых iPhone она может быть в меню «•••»).', 'Di Safari, ketuk tombol Bagikan {share} (di iPhone yang lebih baru, mungkin ada di “•••”).'],
    'pwa.hint.s2': ['Scroll down and choose “Add to Home Screen”.', '下に スクロールして「ホーム画面に追加」を えらんでね。', '向下滑动，选择“添加到主屏幕”。', '往下滑，選擇「加入主畫面」。', '아래로 내려서 ‘홈 화면에 추가’를 고르세요.', 'Desliza hacia abajo y elige «Añadir a pantalla de inicio».', 'Fais défiler vers le bas et choisis « Sur l’écran d’accueil ».', 'Scroll nach unten und wähle „Zum Home-Bildschirm“.', 'Role para baixo e escolha “Adicionar à Tela de Início”.', 'Scorri in basso e scegli «Aggiungi alla schermata Home».', 'Прокрути вниз и выбери «На экран „Домой“».', 'Gulir ke bawah dan pilih “Tambah ke Layar Utama”.'],
    'pwa.hint.s3': ['Open “Marmalune” from your Home Screen. The game fills the whole screen!', 'ホーム画面の「Marmalune」から ひらくと、画面いっぱいで あそべるよ！', '从主屏幕打开“Marmalune”，游戏就会铺满整个屏幕！', '從主畫面打開「Marmalune」，遊戲就會佔滿整個螢幕！', '홈 화면에서 ‘Marmalune’을 열면 화면 가득 놀 수 있어요!', 'Abre «Marmalune» desde tu pantalla de inicio. ¡El juego ocupa toda la pantalla!', 'Ouvre « Marmalune » depuis ton écran d’accueil : le jeu prend tout l’écran !', 'Öffne „Marmalune“ auf deinem Home-Bildschirm – dann füllt das Spiel den ganzen Bildschirm!', 'Abra “Marmalune” pela Tela de Início. O jogo ocupa a tela toda!', 'Apri «Marmalune» dalla schermata Home: il gioco riempie tutto lo schermo!', 'Открой «Marmalune» с экрана «Домой» — игра займёт весь экран!', 'Buka “Marmalune” dari Layar Utama. Gamenya memenuhi seluruh layar!'],
    'pwa.hint.save': ['Your Safari progress doesn’t move over by itself: copy it in {settings} → {game} → {code}, then load it in the Home Screen app.', 'Safariの セーブは 自動では うつらないよ。「{settings}」→「{game}」→「{code}」で コピーして、ホーム画面の アプリで 読みこんでね。', 'Safari 中的进度不会自动转移：先在“{settings}”→“{game}”→“{code}”中复制，再在主屏幕的应用里读取。', 'Safari 裡的進度不會自動轉移：先在「{settings}」→「{game}」→「{code}」中複製，再到主畫面的 App 裡讀取。', 'Safari의 진행 상황은 자동으로 옮겨지지 않아요. ‘{settings}’ → ‘{game}’ → ‘{code}’에서 복사한 뒤 홈 화면 앱에서 불러오세요.', 'Tu progreso de Safari no pasa solo: cópialo en {settings} → {game} → {code} y cárgalo en la app de la pantalla de inicio.', 'Ta progression dans Safari ne suit pas toute seule : copie-la dans {settings} → {game} → {code}, puis charge-la dans l’app de l’écran d’accueil.', 'Dein Spielstand aus Safari wandert nicht von selbst mit: Kopiere ihn unter {settings} → {game} → {code} und lade ihn dann in der App auf dem Home-Bildschirm.', 'Seu progresso no Safari não passa sozinho: copie em {settings} → {game} → {code} e carregue no app da Tela de Início.', 'I progressi di Safari non passano da soli: copiali in {settings} → {game} → {code}, poi caricali nell’app della schermata Home.', 'Прогресс из Safari сам не перенесётся: скопируй его в «{settings}» → «{game}» → «{code}» и загрузи в приложении на экране «Домой».', 'Progres di Safari tidak pindah sendiri: salin lewat {settings} → {game} → {code}, lalu muat di aplikasi Layar Utama.'],
    'pwa.hint.ok': ['Got it!', 'わかった！', '知道了！', '知道了！', '알겠어요!', '¡Entendido!', 'Compris !', 'Alles klar!', 'Entendi!', 'Ho capito!', 'Понятно!', 'Oke, paham!'],
  };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_pages.js]', e); }
// ---- 93_lang_polish.js
try { (function () {
// Strings for the polish pass: the save-recover screen's all-clear (07b_screens_core.js, opened with nothing to fix)
// and Beepo greeting the ranger you actually play as (26_training.js: beepo.hi / tut.resumeHi now take {name} =
// G.Wardrobe.rangerName(), re-registered here so the older "Kiko" wording in the 90_* / 93_lang_onboard packs is
// replaced in every language), and the title's "press A to play" line on a controller (30c_menus_title.js, title.pad).
// Loads after those packs (filename order).
// Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const S = {
    // ---- tutorial greeting (26_training.js)
    'beepo.hi': ['Hi {name}! Let’s warm up!', 'やあ {name}！ ウォーミングアップ しよう！', '嗨，{name}！我们来热身吧！', '嗨，{name}！我們來熱身吧！', '안녕, {name}! 준비 운동해요!', '¡Hola, {name}! ¡Vamos a calentar!', 'Salut {name} ! On s’échauffe ?', 'Hallo {name}! Lass uns aufwärmen!', 'Oi, {name}! Vamos aquecer!', 'Ciao {name}! Scaldiamoci un po’!', 'Привет, {name}! Давай разомнёмся!', 'Hai {name}! Ayo pemanasan!'],
    'tut.resumeHi': ['Welcome back, {name}! Let’s keep going!', 'おかえり、{name}！ つづきから いこう！', '欢迎回来，{name}！我们继续吧！', '歡迎回來，{name}！我們繼續吧！', '다시 왔네요, {name}! 계속해 봐요!', '¡Hola de nuevo, {name}! ¡Sigamos!', 'Te revoilà, {name} ! On continue !', 'Willkommen zurück, {name}! Weiter geht’s!', 'Que bom te ver, {name}! Vamos continuar!', 'Eccoti, {name}! Andiamo avanti!', 'С возвращением, {name}! Продолжаем!', 'Selamat datang kembali, {name}! Ayo lanjut!'],
    // ---- title prompt on a controller (30c_menus_title.js): {a} = the pad's A button glyph
    'title.pad': ['PRESS {a} TO PLAY', '{a} ボタンで スタート', '按 {a} 开始游戏', '按 {a} 開始遊戲', '{a} 버튼을 눌러 시작', 'PULSA {a} PARA JUGAR', 'APPUIE SUR {a} POUR JOUER', 'DRÜCKE {a} ZUM SPIELEN', 'APERTE {a} PARA JOGAR', 'PREMI {a} PER GIOCARE', 'НАЖМИ {a}, ЧТОБЫ ИГРАТЬ', 'TEKAN {a} UNTUK MAIN'],
    // ---- save-recover with nothing to fix (07b_screens_core.js)
    'sv.rec.none': ['Your save is safe!', 'セーブは だいじょうぶ！', '存档安然无恙！', '存檔安然無恙！', '세이브는 안전해요!', '¡Tu partida está a salvo!', 'Ta sauvegarde va bien !', 'Dein Spielstand ist sicher!', 'Seu progresso está seguro!', 'Il tuo salvataggio è al sicuro!', 'Твоё сохранение в порядке!', 'Simpananmu aman!'],
    'sv.rec.noneD': ['Nothing needs fixing. Your progress is saved on this device.', 'なおすものは ないよ。この たんまつに ちゃんと セーブされているよ。', '没有需要修复的地方。你的进度已保存在这台设备上。', '沒有需要修復的地方。你的進度已儲存在這台裝置上。', '고칠 것이 없어요. 진행 상황이 이 기기에 저장되어 있어요.', 'No hay nada que arreglar. Tu progreso está guardado en este dispositivo.', 'Rien à réparer. Ta progression est enregistrée sur cet appareil.', 'Hier gibt es nichts zu reparieren. Dein Fortschritt ist auf diesem Gerät gespeichert.', 'Não há nada para consertar. Seu progresso está salvo neste aparelho.', 'Non c’è niente da sistemare. I tuoi progressi sono salvati su questo dispositivo.', 'Чинить ничего не нужно. Твой прогресс сохранён на этом устройстве.', 'Tidak ada yang perlu diperbaiki. Progresmu tersimpan di perangkat ini.'],
  };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_polish.js]', e); }
// ---- 93_lang_race.js
try { (function () {
// Strings for the Star Skiff Rally polish pass (23b_race_ui.js): the gold-ring chain counter that pops
// under the lap chip while flying through a ring chain ("3/5 rings").
(function (G) {
  const S = {
    en: { 'race.ringCount': 'Rings {n}/{total}' },
    ja: { 'race.ringCount': 'リング {n}/{total}' },
    'zh-Hans': { 'race.ringCount': '金环 {n}/{total}' },
    'zh-Hant': { 'race.ringCount': '金環 {n}/{total}' },
    ko: { 'race.ringCount': '링 {n}/{total}' },
    es: { 'race.ringCount': 'Anillos {n}/{total}' },
    fr: { 'race.ringCount': 'Anneaux {n}/{total}' },
    de: { 'race.ringCount': 'Ringe {n}/{total}' },
    'pt-BR': { 'race.ringCount': 'Anéis {n}/{total}' },
    it: { 'race.ringCount': 'Anelli {n}/{total}' },
    ru: { 'race.ringCount': 'Кольца {n}/{total}' },
    id: { 'race.ringCount': 'Cincin {n}/{total}' },
  };
  for (const code in S) G.i18n.add(code, S[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_race.js]', e); }
// ---- 93_lang_render.js
try { (function () {
// Render settings strings (Graphics tab), all 12 languages.
(function (G) {
  'use strict';
  const T = {
    en: { 'set.bloom': 'Glow effects' },
    ja: { 'set.bloom': 'ひかりのエフェクト' },
    'zh-Hans': { 'set.bloom': '光晕效果' },
    'zh-Hant': { 'set.bloom': '光暈效果' },
    ko: { 'set.bloom': '빛 번짐 효과' },
    es: { 'set.bloom': 'Efectos de brillo' },
    fr: { 'set.bloom': 'Effets lumineux' },
    de: { 'set.bloom': 'Leuchteffekte' },
    'pt-BR': { 'set.bloom': 'Efeitos de brilho' },
    it: { 'set.bloom': 'Effetti luminosi' },
    ru: { 'set.bloom': 'Эффекты свечения' },
    id: { 'set.bloom': 'Efek cahaya' },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_render.js]', e); }
// ---- 93_lang_ultra.js
try { (function () {
// Ultra graphics tier strings (Settings → Graphics), all 12 languages.
(function (G) {
  'use strict';
  const T = {
    en: { 'set.q.ultra': 'Ultra', 'set.q.ultraHint': 'Ultra: real-time sun shadows, a sharper picture and denser grass. Made for powerful devices (uses more battery).' },
    ja: { 'set.q.ultra': 'ウルトラ', 'set.q.ultraHint': 'ウルトラ: リアルタイムの影、よりくっきりした画面、ふさふさの草。パワフルな端末むけです（バッテリーを多くつかいます）。' },
    'zh-Hans': { 'set.q.ultra': '超高', 'set.q.ultraHint': '超高：实时阳光阴影、更清晰的画面和更茂密的草地。适合性能强劲的设备（更耗电）。' },
    'zh-Hant': { 'set.q.ultra': '超高', 'set.q.ultraHint': '超高：即時陽光陰影、更清晰的畫面與更茂密的草地。適合效能強大的裝置（較耗電）。' },
    ko: { 'set.q.ultra': '울트라', 'set.q.ultraHint': '울트라: 실시간 햇빛 그림자, 더 선명한 화면, 더 풍성한 풀. 고성능 기기용이에요(배터리를 더 사용해요).' },
    es: { 'set.q.ultra': 'Ultra', 'set.q.ultraHint': 'Ultra: sombras del sol en tiempo real, imagen más nítida y hierba más densa. Para dispositivos potentes (gasta más batería).' },
    fr: { 'set.q.ultra': 'Ultra', 'set.q.ultraHint': 'Ultra : ombres du soleil en temps réel, image plus nette et herbe plus dense. Pour les appareils puissants (consomme plus de batterie).' },
    de: { 'set.q.ultra': 'Ultra', 'set.q.ultraHint': 'Ultra: Sonnenschatten in Echtzeit, schärferes Bild und dichteres Gras. Für leistungsstarke Geräte (braucht mehr Akku).' },
    'pt-BR': { 'set.q.ultra': 'Ultra', 'set.q.ultraHint': 'Ultra: sombras do sol em tempo real, imagem mais nítida e grama mais densa. Para aparelhos potentes (gasta mais bateria).' },
    it: { 'set.q.ultra': 'Ultra', 'set.q.ultraHint': 'Ultra: ombre del sole in tempo reale, immagine più nitida ed erba più fitta. Per dispositivi potenti (consuma più batteria).' },
    ru: { 'set.q.ultra': 'Ультра', 'set.q.ultraHint': 'Ультра: тени от солнца в реальном времени, более чёткая картинка и густая трава. Для мощных устройств (тратит больше заряда).' },
    id: { 'set.q.ultra': 'Ultra', 'set.q.ultraHint': 'Ultra: bayangan matahari real-time, gambar lebih tajam, dan rumput lebih lebat. Untuk perangkat bertenaga (lebih boros baterai).' },
  };
  for (const code in T) G.i18n.add(code, T[code]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_ultra.js]', e); }
// ---- 93_lang_world.js
try { (function () {
// Strings for the world pass (20_hub.js): Beepo's welcome line now greets the equipped ranger by name
// (G.Wardrobe.rangerName(), passed as {name} at the call site). Loads after the 90_* packs, so the
// re-registered keys override them.
// Columns: en, ja, zh-Hans, zh-Hant, ko, es, fr, de, pt-BR, it, ru, id.
(function (G) {
  const CODES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt-BR', 'it', 'ru', 'id'];
  const S = {
    'hub.beepo.hi': ['Beep boop! Welcome home, {name}!', 'ピポパ！ おかえり、{name}！', '哔哔啵！欢迎回家，{name}！', '嗶嗶啵！歡迎回家，{name}！', '삐빅 삐뽀! 어서 와요, {name}!', '¡Bip bup! ¡Ya estás en casa, {name}!', 'Bip boup ! Bon retour à la maison, {name} !', 'Piep bup! Willkommen zu Hause, {name}!', 'Bip bop! Que bom ter você em casa, {name}!', 'Bip bop! Che bello riaverti a casa, {name}!', 'Бип-буп! С возвращением домой, {name}!', 'Bip bup! Selamat datang di rumah, {name}!'],
  };
  const packs = {};
  for (const c of CODES) packs[c] = {};
  for (const k in S) S[k].forEach((v, i) => { packs[CODES[i]][k] = v; });
  for (const c of CODES) G.i18n.add(c, packs[c]);
})(window.G);

}).call(window); } catch (e) { console.error('[module 93_lang_world.js]', e); }
})();
