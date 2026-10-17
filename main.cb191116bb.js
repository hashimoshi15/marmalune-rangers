/* Marmalune Rangers — main: 99_main.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 99_main.js
try { (function () {
// Boot: load save, pick language, init renderer/input/HUD/audio, enter the title mode.
(function (G) {
  // Boot splash (index.html): stage updates, removal once the first mode is on screen, friendly stop.
  const splash = () => window.MR_BOOT || null;
  // A localised stop screen with a Retry button: on the boot splash when it is there, else #fatal.
  function fatal(text) {
    const B = splash();
    if (B && B.fail && !B.over) { B.fail(text); return; }
    const f = document.getElementById('fatal'); if (!f) return;
    f.hidden = false; f.textContent = '';
    const p = document.createElement('p'); p.textContent = text; p.style.margin = '0 0 16px';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary';
    b.textContent = G.t ? G.t('ui.retry') : 'Retry';
    b.addEventListener('click', () => location.reload());
    const box = document.createElement('div'); box.append(p, b); f.appendChild(box);
  }
  function boot() {
    if (!window.THREE) {
      // Normally the page already stopped right after the three.js tags (build.mjs); this is the
      // fallback when it could not (no splash, document.write refused).
      const B = splash();
      if (B && B.noEngine && !B.over) B.noEngine(); else fatal(G.t ? G.t('err.engine') : 'The 3D engine could not be loaded.');
      return;
    }
    const B = splash();
    if (B && B.step) B.step('boot');
    G.Save.load();
    const s = G.Save.set;
    if (!s.lang) s.lang = G.i18n.detect();
    G.i18n.set(s.lang);
    const app = document.getElementById('app');
    if (!G.R.init(app)) {
      fatal(G.t('err.webgl'));
      return;
    }
    G.Input.init(app);
    G.HUD.init();
    if (G.Audio && G.Audio.init) G.safe('audio init', () => G.Audio.init());
    G.applySettings();
    G.Game.start();
    const first = G.Game.modes.title ? 'title' : 'hub';
    // The splash stays up until the first mode (title) is built and showing, then fades out.
    if (B && B.done) { const off = G.bus.on('mode', () => { off(); B.done(); }); }
    G.Game.go(first);
    if (B && B.step) B.step('world');
    G.bus.emit('boot');
  }
  function safeBoot() {
    try { boot(); } catch (e) {
      console.error('[boot]', e);
      fatal(G.t ? G.t('err.boot') : 'Something went wrong while starting the game.');
    }
  }
  // Apply settings that have global side effects. Called on every slider step (volume, button
  // size), so the renderer is only rebuilt when the quality choice itself changed — re-applying it
  // would resize the canvas and throw away the dynamic-resolution level each step. Pass true to force.
  let appliedQuality, appliedHudScale;
  G.applySettings = function (force) {
    const s = G.Save.set;
    document.getElementById('app').classList.toggle('reduced-motion', !!s.reducedMotion);
    document.documentElement.style.setProperty('--hud-scale', s.hudScale);
    const app = document.getElementById('app');
    app.style.setProperty('--team-a', s.colorblind ? '#ffc61a' : '#ff8a1f');
    app.style.setProperty('--team-b', s.colorblind ? '#5a3dff' : '#3d7bff');
    if (G.Audio && G.Audio.setVolumes) G.Audio.setVolumes(s.master, s.sfx, s.music);
    if (G.R.renderer && (force === true || s.quality !== appliedQuality)) { appliedQuality = s.quality; G.R.applyQuality(); }
    if (s.hudScale !== appliedHudScale) {
      appliedHudScale = s.hudScale;
      if (G.HUD && G.HUD.layoutVars) G.HUD.layoutVars();
      if (G.HudLayout && G.HudLayout.apply && G.Input.layout) G.safe('hud layout', () => G.HudLayout.apply(G.Input.layout));
    }
  };
  // Portrait on a phone during action modes: suggest rotating (dismissible).
  let portraitOk = false;
  function checkOrientation() {
    const app = document.getElementById('app'); if (!app) return;
    let ov = document.getElementById('rotate');
    const m = G.Game.mode;
    const action = m && ['fps', 'turf', 'race', 'royale'].includes(m.layout);
    // With the landscape lock (G.Screen) the game never shows upright, so the prompt only appears if the lock is unavailable.
    const locked = G.Screen && (G.Screen.forced || G.Screen.wants());
    const show = !locked && G.input.device === 'touch' && window.innerHeight > window.innerWidth * 1.1 && action && !portraitOk && !G.UI.anyOpen();
    if (show && !ov) {
      ov = G.UI.el('div#rotate.screen.dim', { style: { zIndex: 15 } },
        G.UI.el('div.panel.narrow', { style: { alignItems: 'center', textAlign: 'center' } },
          G.UI.el('div', { html: '<svg viewBox="0 0 96 96" width="96" height="96"><rect x="30" y="14" width="36" height="64" rx="7" fill="#fff" stroke="#1e1a4d" stroke-width="5"/><path d="M18 60a34 34 0 0 0 30 22M78 36A34 34 0 0 0 48 14" fill="none" stroke="#8f6bff" stroke-width="5" stroke-linecap="round"/><path d="M48 6l8 8-8 8" fill="none" stroke="#8f6bff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
          G.UI.el('h2', { i18n: 'ui.rotate', style: { margin: 0, font: '400 22px var(--f-display)' } }),
          G.UI.btn('ui.playPortrait', () => { portraitOk = true; checkOrientation(); }, 'small')));
      document.getElementById('ui').appendChild(ov);
    } else if (!show && ov) ov.remove();
    G.Game.hold = !!show;
  }
  window.addEventListener('resize', () => setTimeout(checkOrientation, 120));
  G.bus.on('mode', () => setTimeout(checkOrientation, 50));
  G.bus.on('device', checkOrientation);
  G.bus.on('ui-empty', checkOrientation);
  // WebGL context lost (phones under memory pressure / after backgrounding): the loop freezes the
  // simulation (10_world) and three.js re-uploads everything on restore. Tell the player what is
  // going on, and offer a reload if the browser never gives the context back.
  let glTimer = 0;
  G.bus.on('gl-lost', () => {
    if (document.getElementById('gllost')) return;
    const reload = G.UI.btn('ui.reload', () => { if (G.Save.data) G.Save.save(true); location.reload(); }, 'primary');
    const stuck = G.UI.el('p', { i18n: 'ui.glStuck', style: { margin: 0, lineHeight: '1.5' } });
    reload.hidden = true; stuck.hidden = true;
    const ov = G.UI.el('div#gllost.screen.dim', { style: { zIndex: 25 } },
      G.UI.el('div.panel.narrow', { style: { alignItems: 'center', textAlign: 'center' } },
        G.UI.el('div.ld-orb'),
        G.UI.el('h2', { i18n: 'ui.glLost', style: { margin: 0, font: '400 22px var(--f-display)' } }),
        G.UI.el('p', { i18n: 'ui.glLostSub', style: { margin: 0, lineHeight: '1.5' } }), stuck, reload));
    document.getElementById('ui').appendChild(ov);
    clearTimeout(glTimer);
    glTimer = setTimeout(() => { reload.hidden = false; stuck.hidden = false; }, 5000);
    G.input.fire = false;
  });
  G.bus.on('gl-restored', () => {
    clearTimeout(glTimer);
    const ov = document.getElementById('gllost'); if (ov) ov.remove();
  });
  // ---------------------------------------------------------------- the public site as an app (G.PWA)
  // Only on the multi-file public site (tools/make_public.mjs sets window.MR_PAGES): the service worker (pages/sw.js)
  // is registered over https — or when a test sets window.MR_SW_FORCE — once the title is up and the page has loaded,
  // so it never competes with boot. Updates install in the background; this page asks a waiting worker which build it
  // carries: its own build (the page was already fetched fresh) activates silently, a newer one shows a friendly
  // "A new version is ready — Restart" note only where nothing can be lost — the title, Fizzport with no menu open, or a
  // results screen; never in a mission, the tutorial or a mode switch (dismissed: back at the next town / title visit).
  // Restart saves (G.Save.save(true)), activates the update and reloads; the new build then says "Updated to vX".
  // Also here: the Full screen button / switch (G.Screen.fs) and the iPhone "Add to Home Screen" hint.
  const PWA = G.PWA = { state: 'off', reg: null, update: null, page: null, dismissed: false, log: [] };
  const pagesInfo = window.MR_PAGES || null;
  PWA.page = pagesInfo ? String(pagesInfo.build || '') : null;
  PWA.allowed = () => !!(pagesInfo && navigator.serviceWorker && (location.protocol === 'https:' || window.MR_SW_FORCE === true));
  // "Add to Home Screen" only means something on the public site (not in the artifact viewer or the offline ZIP)
  PWA.installable = () => !!pagesInfo;
  const UPD_KEY = 'mr-updated-from';
  const ui = (...a) => G.UI.el(...a);
  const ICO_GIFT = '<svg viewBox="0 0 32 32"><rect x="5" y="13" width="22" height="15" rx="3" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="2.4"/><rect x="3" y="9" width="26" height="6" rx="2.5" fill="#ffd23f" stroke="#1e1a4d" stroke-width="2.4"/><path d="M16 9v19" stroke="#1e1a4d" stroke-width="2.4"/><path d="M16 9c-2-5-8-6-8-2.5S13 9 16 9c3 0 8-.9 8-2.5S18 4 16 9z" fill="#3fe0b8" stroke="#1e1a4d" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  const ICO_RESTART = '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M19.5 3.5v5h-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>';
  const ICO_OK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3fe0b8" stroke="#1e1a4d" stroke-width="2.2"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#1e1a4d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO_FS = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO_FS_OFF = '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Safari's Share glyph (box with an arrow), its "Add to Home Screen" glyph, and the home-screen icon in miniature
  const ICO_SHARE = '<svg viewBox="0 0 24 24"><path d="M12 3v11.5M7.8 7.2L12 3l4.2 4.2" fill="none" stroke="#0a7aff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" fill="none" stroke="#0a7aff" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const ICO_ADD = '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="#fff" stroke="#1e1a4d" stroke-width="2.2"/><path d="M12 8v8M8 12h8" stroke="#1e1a4d" stroke-width="2.4" stroke-linecap="round"/></svg>';
  const ICO_APP = '<svg viewBox="0 0 40 40"><defs><linearGradient id="pwaSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b7fe0"/><stop offset="1" stop-color="#9fe0ff"/></linearGradient></defs><rect width="40" height="40" rx="9" fill="url(#pwaSky)"/><path d="M20 11V7.5" stroke="#1e1a4d" stroke-width="1.8"/><circle cx="20" cy="6.5" r="2.4" fill="#ff6b8b" stroke="#1e1a4d" stroke-width="1.2"/><ellipse cx="8.6" cy="23" rx="2.8" ry="4.8" fill="#39d5ff" stroke="#1e1a4d" stroke-width="1.3"/><ellipse cx="31.4" cy="23" rx="2.8" ry="4.8" fill="#39d5ff" stroke="#1e1a4d" stroke-width="1.3"/><circle cx="20" cy="23" r="11.5" fill="#fff1dc" stroke="#1e1a4d" stroke-width="1.8"/><rect x="12" y="17.6" width="16" height="11" rx="5" fill="#1e2a5a"/><circle cx="16.4" cy="22.4" r="2.1" fill="#5ae2ff"/><circle cx="23.6" cy="22.4" r="2.1" fill="#5ae2ff"/><path d="M16.6 25.6q3.4 2.2 6.8 0" fill="none" stroke="#5ae2ff" stroke-width="1.3" stroke-linecap="round"/></svg>';
  // G.t with an inline icon where the translation has {share}
  function withIcon(key, svg) {
    const parts = G.t(key, { share: '\u0001' }).split('\u0001');
    const out = [parts[0]];
    for (let i = 1; i < parts.length; i++) out.push(ui('span.pwa-share', { html: svg, 'aria-hidden': 'true' }), parts[i]);
    return out;
  }
  let cssOn = false;
  function css() {
    if (cssOn) return; cssOn = true;
    const st = document.createElement('style'); st.id = 'pwa-style';
    st.textContent = '.pwa-note{position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:10px;max-width:calc(100% - 28px);padding:5px 5px 5px 10px;background:#fff6e0;color:var(--ink);border:3px solid var(--ink);border-radius:999px;box-shadow:0 4px 0 var(--shadow);font:800 15px/1.2 var(--f-body);pointer-events:auto;animation:pwaDrop .5s var(--ease-out) both}'
      + '.pwa-note.in-hud{position:relative;left:auto;top:auto;transform:none;margin-top:2px;max-width:48vw;font-size:max(14px,calc(14px * var(--ui-t,1)))}'
      + '.pwa-note .pwa-ico{width:28px;height:28px;flex:none;display:inline-flex}.pwa-note .pwa-ico svg{width:100%;height:100%}'
      + '.pwa-note .pwa-txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.pwa-note .btn.small{min-height:36px;flex:none;border-radius:999px;white-space:nowrap}.pwa-note .btn.icon{width:36px;height:36px}.pwa-note .btn.icon svg{width:16px;height:16px}'
      + '.pwa-hint{position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);display:flex;align-items:center;gap:12px;width:max-content;max-width:min(640px,calc(100% - 28px));padding:7px 8px 7px 8px;background:#fff6e0;color:var(--ink);border:3px solid var(--ink);border-radius:20px;box-shadow:0 4px 0 var(--shadow);font:700 14px/1.3 var(--f-body);text-align:start;pointer-events:auto;animation:pwaDrop .5s 1.1s var(--ease-out) both}'
      + '.pwa-hint.out{opacity:0;transition:opacity .2s}.pwa-hint .pwa-app{width:42px;height:42px;flex:none;display:inline-flex;filter:drop-shadow(0 2px 0 var(--shadow))}.pwa-hint .pwa-app svg{width:100%;height:100%}'
      + '.pwa-hint .pwa-hint-txt{min-width:0}.pwa-hint b{display:block;font:800 15px/1.2 var(--f-body);margin-bottom:1px}'
      + '.pwa-share{display:inline-flex;width:22px;height:22px;vertical-align:-5px;margin:0 2px;background:#fff;border-radius:6px;box-shadow:0 0 0 1.5px rgba(30,26,77,.25)}.pwa-share svg{width:100%;height:100%}'
      + '.pwa-hint .pwa-hint-btns{display:flex;gap:6px;flex:none}.pwa-hint .btn.small{min-height:36px;white-space:nowrap}'
      + '.pwa-steps{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}'
      + '.pwa-steps li{display:flex;align-items:center;gap:12px;background:#fff;border:3px solid var(--ink);border-radius:16px;padding:9px 14px;box-shadow:0 3px 0 var(--shadow);font:700 15px/1.45 var(--f-body)}'
      + '.pwa-steps .pwa-n{width:30px;height:30px;flex:none;border-radius:50%;background:#ffd23f;border:3px solid var(--ink);display:inline-flex;align-items:center;justify-content:center;font:800 15px var(--f-body)}'
      + '.pwa-steps .pwa-pic{width:38px;height:38px;flex:none;display:inline-flex}.pwa-steps .pwa-pic svg{width:100%;height:100%}'
      + '.pwa-save{margin:10px 2px 0;line-height:1.5}'
      + '@media (max-height:440px){.pwa-steps{gap:7px}.pwa-steps li{padding:6px 12px;font-size:14px;line-height:1.35}.pwa-steps .pwa-pic{width:30px;height:30px}.pwa-save{margin-top:7px}}'
      + '.pwa-tight-l .mm-corner.tl,.pwa-tight-r .mm-corner.tr{visibility:hidden}'
      + '@keyframes pwaDrop{from{opacity:0;translate:0 -14px}to{opacity:1;translate:0 0}}'
      + '.reduced-motion .pwa-note,.reduced-motion .pwa-hint{animation:none}@media (prefers-reduced-motion:reduce){.pwa-note,.pwa-hint{animation:none}}';
    document.head.appendChild(st);
  }

  // ---- service worker
  // -> Promise<build|null>: the build a worker carries ({type:'build'} over a MessageChannel)
  function ask(w) {
    return new Promise(res => {
      if (!w) { res(null); return; }
      let done = false;
      const ch = new MessageChannel();
      const t = setTimeout(() => { if (!done) { done = true; res(null); } }, 4000);
      ch.port1.onmessage = e => { if (done) return; done = true; clearTimeout(t); res(e.data && e.data.build ? e.data.build : null); };
      try { w.postMessage({ type: 'build' }, [ch.port2]); } catch (e) { done = true; clearTimeout(t); res(null); }
    });
  }
  const seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  function track(w, first) {
    if (seen) { if (seen.has(w)) return; seen.add(w); }
    const step = () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) consider(w);
      else if (w.state === 'activated') { PWA.state = 'ready'; if (first) { PWA.offlineNote = true; arm(); } }
      // a failed install (e.g. a deploy landing mid-install): the browser retries at a later update check
      else if (w.state === 'redundant' && PWA.state === 'installing') PWA.state = PWA.reg && PWA.reg.active ? 'ready' : 'error';
    };
    w.addEventListener('statechange', step);
    step();
  }
  // a waiting update: the build this page already runs activates silently; a newer one waits for the player's Restart
  function consider(w) {
    ask(w).then(b => {
      if (!b || !b.id) return;
      if (b.id === PWA.page) { PWA.silent = true; try { w.postMessage({ type: 'skip-waiting' }); } catch (e) { /* stays waiting */ } return; }
      setUpdate(b);
    });
  }
  function setUpdate(b) {
    if (PWA.update && PWA.update.id === b.id) return;
    PWA.update = b; PWA.dismissed = false;
    G.bus.emit('pwa-update', b);
    arm(); render();
  }
  PWA._setUpdate = setUpdate;   // (tests)
  function onController() {
    if (PWA.reloading) { if (!PWA._reloaded) { PWA._reloaded = true; location.reload(); } return; }
    if (!PWA.hadController) { PWA.hadController = true; return; }   // the first install claiming this page
    if (PWA.silent) { PWA.silent = false; return; }
    // another tab activated a newer version: this one offers the restart at its next safe moment
    ask(navigator.serviceWorker.controller).then(b => { if (b && b.id && b.id !== PWA.page) setUpdate(b); });
  }
  let checkedAt = 0;
  const RECHECK_MS = 10 * 60 * 1000;
  PWA.check = function () {
    checkedAt = performance.now();
    if (!PWA.reg || navigator.onLine === false) return Promise.resolve(false);
    return PWA.reg.update().then(() => true, () => false);
  };
  function startSW() {
    if (PWA.state !== 'off' || !PWA.allowed()) return;
    const sw = navigator.serviceWorker;
    PWA.state = 'registering';
    PWA.hadController = !!sw.controller;
    sw.addEventListener('controllerchange', onController);
    let first = false;   // no worker before this visit: the first install (says "ready to play offline" once done)
    sw.getRegistration().catch(() => null).then(prev => {
      first = !(prev && (prev.active || prev.waiting || prev.installing)) && !sw.controller;
      return sw.register(pagesInfo.sw || 'sw.js', { scope: './', updateViaCache: 'none' });
    }).then(reg => {
      PWA.reg = reg;
      checkedAt = performance.now();
      PWA.state = reg.active ? 'ready' : 'installing';
      if (first && reg.active && !reg.installing) { PWA.offlineNote = true; arm(); }   // (installed before register() answered)
      if (reg.installing) track(reg.installing, first);
      if (reg.waiting && sw.controller) consider(reg.waiting);
      reg.addEventListener('updatefound', () => { if (reg.installing) track(reg.installing, first && !reg.active); });
      // a game left open for days still hears about updates: on return to the tab, every 30 min, entering town / title
      setInterval(() => { if (!document.hidden) PWA.check(); }, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && performance.now() - checkedAt > RECHECK_MS) PWA.check(); });
    }, err => { PWA.state = 'error'; console.warn('[pwa] service worker not registered:', err && err.message); });
  }
  if (PWA.allowed()) {
    const off = G.bus.on('mode', () => {
      off();
      const go = () => setTimeout(startSW, 1500);
      if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    });
  }
  try {
    const from = window.sessionStorage.getItem(UPD_KEY);
    if (from !== null) { window.sessionStorage.removeItem(UPD_KEY); if (from !== PWA.page) PWA.updatedNote = true; }
  } catch (e) { /* storage blocked */ }

  // ---- the notice and the one-off toasts, shown only at a safe spot
  // -> where the note may sit now: the title or results screen (inside it, so the pad can reach it), Fizzport's HUD
  // top-centre column (no menu open), else null (mission, tutorial, mode switch, any other screen on top)
  const RESULTS = /^(results|exp-results|turf-results|royale-results|race-results)$/;   // a finished match (modes' fallbacks too)
  function spot() {
    const Gm = G.Game;
    if (!Gm || !Gm.mode || Gm._switching || Gm.hold || PWA.reloading) return null;
    const top = G.UI.top();
    if (top) return ((top.id === 'title' && Gm.modeId === 'title') || RESULTS.test(top.id)) && top.el.isConnected ? top.el : null;
    if (Gm.modeId === 'hub' && G.HUD && G.HUD.visible && G.HUD.slot) return G.HUD.slot('tc') || null;
    return null;
  }
  PWA.spot = spot;
  let note = null, timer = 0;
  function buildNote() {
    const go = G.UI.btn('pwa.restart', restart, 'go small', { icon: ICO_RESTART });
    go.classList.add('pwa-go');
    const later = ui('button.btn.icon.pwa-x', { type: 'button', 'data-snd': 'back', 'aria-label': G.t('pwa.later'), title: G.t('pwa.later'), html: ICO_X, onclick: () => { PWA.dismissed = true; render(); } });
    const n = ui('div#pwa-note.pwa-note', { role: 'status', 'aria-live': 'polite' }, ui('span.pwa-ico', { html: ICO_GIFT, 'aria-hidden': 'true' }), ui('span.pwa-txt', { i18n: 'pwa.update' }), go, later);
    n._lang = G.i18n.lang;
    n.addEventListener('click', e => e.stopPropagation());   // (the title starts the game on a tap anywhere else)
    return n;
  }
  function render() {
    css();
    const host = PWA.update && !PWA.dismissed ? spot() : null;
    if (!host) { if (note && note.parentNode) note.remove(); }
    else {
      if (!note || note._lang !== G.i18n.lang) { if (note) note.remove(); note = buildNote(); }
      // (a closing screen strips the ids inside its fading copy, ours included: 07_ui retire)
      if (note.parentNode !== host) { note.id = 'pwa-note'; note.classList.toggle('in-hud', !host.classList.contains('screen')); host.appendChild(note); }
    }
    const up = !!(note && note.parentNode);
    document.querySelectorAll('.pwa-hint').forEach(h => { h.hidden = up; });   // one note at a time at the top
    untangle();
    if ((PWA.offlineNote || PWA.updatedNote) && spot()) {
      if (PWA.updatedNote) { PWA.updatedNote = false; PWA.log.push('updated'); G.UI.toast(G.t('pwa.updated', { v: G.VERSION }), { icon: ICO_GIFT, dur: 3400 }); }
      if (PWA.offlineNote) { PWA.offlineNote = false; PWA.log.push('offline'); G.UI.toast(G.t('pwa.offline'), { icon: ICO_OK, dur: 3400 }); }
    }
    if (!(PWA.update && !PWA.dismissed) && !PWA.offlineNote && !PWA.updatedNote) { clearInterval(timer); timer = 0; }
  }
  PWA.render = render;
  // On a narrow title (an SE-size phone, a long language) the top-centre note / banner would run into the corners:
  // the Full screen button (top left, also in Settings) and the version line (top right) step aside while it shows.
  function untangle() {
    const w = document.querySelector('[data-screen="title"]');
    if (!w) return;
    const box = [w.querySelector('#pwa-note'), w.querySelector('.pwa-hint:not([hidden])')].find(n => n && n.getClientRects().length);
    const r = box ? G.Screen.rectToLocal(box.getBoundingClientRect()) : null;
    const hit = sel => {
      const c = r && w.querySelector(sel);
      if (!c || !c.getClientRects().length) return false;
      const q = G.Screen.rectToLocal(c.getBoundingClientRect());
      return q.right + 8 > r.left && q.left - 8 < r.right && q.bottom + 4 > r.top && q.top - 4 < r.bottom;
    };
    w.classList.toggle('pwa-tight-l', hit('.mm-corner.tl'));
    w.classList.toggle('pwa-tight-r', hit('.mm-corner.tr'));
  }
  PWA.untangle = untangle;
  G.bus.on('resize', () => setTimeout(untangle, 60));
  // event driven, plus a light check while something waits (the HUD clears its slots, screens rebuild, a menu over the
  // title closes: no bus event for that one)
  function arm() { if (!timer) timer = setInterval(render, 700); }
  if (PWA.updatedNote) arm();
  G.bus.on('mode', id => {
    if (PWA.dismissed && (id === 'hub' || id === 'title')) { PWA.dismissed = false; arm(); }
    if ((id === 'hub' || id === 'title') && PWA.reg && performance.now() - checkedAt > RECHECK_MS) PWA.check();
    setTimeout(render, 30);
  });
  G.bus.on('ui-open', () => setTimeout(render, 0));
  G.bus.on('ui-empty', () => setTimeout(render, 0));
  G.bus.on('lang', () => setTimeout(render, 0));
  function restart() {
    if (PWA.reloading) return;
    G.safe('pwa save', () => { if (G.Save && G.Save.data) G.Save.save(true); });
    try { window.sessionStorage.setItem(UPD_KEY, PWA.page || ''); } catch (e) { /* storage blocked */ }
    PWA.reloading = true;
    if (note) note.remove();
    G.UI.loading(true, 'ui.loading');
    const w = PWA.reg && PWA.reg.waiting;
    if (w) {
      try { w.postMessage({ type: 'skip-waiting' }); } catch (e) { location.reload(); return; }
      setTimeout(() => { if (!PWA._reloaded) { PWA._reloaded = true; location.reload(); } }, 4000);   // (no controllerchange)
    } else setTimeout(() => location.reload(), 80);
  }
  PWA.restart = restart;

  // ---- full screen: title corner button and Settings → Graphics switch (G.Screen.fs; hidden where it cannot work)
  function fsLabel(b) {
    const on = G.Screen.fs.on(), key = on ? 'pwa.fsExit' : 'pwa.fs';
    if (b._fsKey === key + '|' + G.i18n.lang) return;
    b._fsKey = key + '|' + G.i18n.lang;
    b.textContent = '';
    b.append(ui('span', { html: on ? ICO_FS_OFF : ICO_FS, style: { display: 'inline-flex' }, 'aria-hidden': 'true' }), ui('span', { i18n: key }));
    b.setAttribute('aria-pressed', String(on));
  }
  PWA.fsButton = function () {
    if (!G.Screen || !G.Screen.fs || G.Screen.fs.mode() !== 'toggle') return null;
    const b = G.UI.btn(null, ev => { if (ev) ev.stopPropagation(); if (G.Audio && G.Audio.unlock) G.Audio.unlock(); G.Screen.fs.toggle(); }, 'small');
    b.classList.add('pwa-fs');
    fsLabel(b);
    return b;
  };
  function syncSwitch(t) { const on = G.Screen.fs.on(); t.classList.toggle('on', on); t.setAttribute('aria-checked', String(on)); }
  // row: the settings screen's own row(labelKey, control) builder
  PWA.settingsRow = function (row) {
    const fs = G.Screen && G.Screen.fs, mode = fs ? fs.mode() : '';
    if (mode === 'toggle') {
      const t = ui('div.toggle.pwa-fs-sw', { role: 'switch', tabindex: '0', id: 'set-fullscreen', 'aria-checked': 'false', 'aria-label': G.t('pwa.fsRow') });
      const flip = () => { fs.toggle(); if (G.Audio) G.Audio.sfx('ui'); };
      t.addEventListener('click', flip);
      t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      syncSwitch(t);
      return row('pwa.fsRow', t);
    }
    if (mode === 'hint' && PWA.installable()) return row('pwa.fsRow', G.UI.btn('pwa.how', () => G.UI.open('home-hint'), 'small', { icon: ICO_SHARE }));
    return null;
  };
  G.bus.on('fullscreen', () => {
    document.querySelectorAll('.pwa-fs').forEach(b => G.safe('fs label', () => fsLabel(b)));
    document.querySelectorAll('.pwa-fs-sw').forEach(t => G.safe('fs switch', () => syncSwitch(t)));
  });

  // ---- iPhone (no Fullscreen API, not launched from the home screen): a one-time title banner, and the steps screen
  function hintSeen() {
    PWA._hintUp = false;
    if (G.Save.data && !G.Save.set.homeHint) { G.Save.set.homeHint = true; G.Save.save(); }
    document.querySelectorAll('.pwa-hint').forEach(n => G.UI.leave(n, 220));
    setTimeout(() => { document.querySelectorAll('.pwa-hint').forEach(n => n.remove()); untangle(); }, 260);
  }
  PWA.homeBanner = function () {
    const fs = G.Screen && G.Screen.fs;
    if (!fs || fs.mode() !== 'hint' || !PWA.installable() || !G.Save.data || G.Save.set.homeHint) return null;
    css();
    PWA._hintUp = true;
    const ok = G.UI.btn('pwa.hint.ok', hintSeen, 'primary small');
    const how = G.UI.btn('pwa.how', () => G.UI.open('home-hint'), 'small');
    const b = ui('div.pwa-hint', { role: 'note', 'aria-label': G.t('pwa.hint.title') },
      ui('span.pwa-app', { html: ICO_APP, 'aria-hidden': 'true' }),
      ui('div.pwa-hint-txt', ui('b', { text: G.t('pwa.hint.title') }), ui('span', withIcon('pwa.hint.short', ICO_SHARE))),
      ui('div.pwa-hint-btns', how, ok));
    b.addEventListener('click', e => e.stopPropagation());
    if (note && note.parentNode) b.hidden = true;
    setTimeout(untangle, 50);
    return b;
  };
  // leaving the title with the banner up counts as seen (one time only); the steps stay in Settings → Graphics
  G.bus.on('mode', id => { if (PWA._hintUp && id !== 'title') hintSeen(); });
  G.UI.def('home-hint', {
    modal: true,
    build(p, close) {
      css();
      const step = (n, svg, text) => ui('li', ui('span.pwa-n', { text: String(n) }), ui('span.pwa-pic', { html: svg, 'aria-hidden': 'true' }), ui('span', text));
      const steps = ui('ol.pwa-steps', step(1, ICO_SHARE, withIcon('pwa.hint.s1', ICO_SHARE)), step(2, ICO_ADD, G.t('pwa.hint.s2')), step(3, ICO_APP, G.t('pwa.hint.s3')));
      // (iOS gives a home-screen web app its own storage: the save code carries progress over, Settings → Game)
      const save = ui('p.muted.small.pwa-save', { text: G.t('pwa.hint.save', { settings: G.t('set.title'), game: G.t('set.tab.game'), code: G.t('set.saveCode') }) });
      const ok = G.UI.btn('pwa.hint.ok', () => { hintSeen(); close(); }, 'primary', { icon: ICO_OK });
      return G.UI.panel('pwa.hint.title', close, [steps, save], { style: { maxWidth: '700px' }, foot: ui('div.row', { style: { justifyContent: 'center', paddingTop: '10px' } }, ok) });
    },
  });

  window.addEventListener('error', e => { console.error('[global]', e.message); });
  // Viewer hot-update hook: progress lives in localStorage, so a republish just needs a save flush.
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(() => { if (G.Save.data) G.Save.save(true); return { mode: G.Game.modeId }; }); } catch (e) { /* optional */ } }
  function start() { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeBoot); else setTimeout(safeBoot, 0); }
  if (hot && hot.ready) { try { hot.ready(start); } catch (e) { start(); } } else start();
})(window.G);

}).call(window); } catch (e) { console.error('[module 99_main.js]', e); }
})();
