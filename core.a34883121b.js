/* Marmalune Rangers — core: 00_core.js 00b_screen.js 01_i18n.js 02_save.js 03_strings_core.js 04_render.js 04b_post.js 05_phys.js 06_input.js 07_ui.js 07b_screens_core.js 07c_hud_layout.js 08_hud.js 09_audio.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 00_core.js
try { (function () {
// Core: global namespace, math helpers, seeded RNG, noise, event bus, time, pooling.
'use strict';
window.G = window.G || {};
(function (G) {
  const U = G.util = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  // Frame-rate independent exponential smoothing toward a target.
  U.damp = (a, b, lambda, dt) => b + (a - b) * Math.exp(-lambda * dt);
  U.smoothstep = (a, b, v) => { const t = U.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.chance = p => Math.random() < p;
  U.wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  U.angleDamp = (a, b, lambda, dt) => a + U.wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));
  U.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  // table: [{w:weight, ...}] or {key: weight}
  U.weighted = (table, rnd = Math.random) => {
    if (!Array.isArray(table)) table = Object.keys(table).map(k => ({ id: k, w: table[k] }));
    let total = 0; for (const e of table) total += e.w;
    let r = rnd() * total;
    for (const e of table) { r -= e.w; if (r <= 0) return e; }
    return table[table.length - 1];
  };
  U.fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60); const r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(r < 10 && m === 0 ? 1 : 0).replace(/\.0$/, ''); };
  U.fmtClock = s => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); const r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
  U.fmtMs = s => { const m = Math.floor(s / 60); const r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
  let _uid = 1; U.uid = () => _uid++;
  U.hexToRgb = hex => ({ r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 });
  U.cssHex = hex => '#' + hex.toString(16).padStart(6, '0');
  U.distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // Seeded RNG (mulberry32). G.rng(seed) -> () => [0,1)
  G.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  };

  // Value noise + fbm (deterministic, seedable).
  const N = G.noise = {};
  let perm = new Uint8Array(512);
  N.seed = function (s) {
    const r = G.rng(s); const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  };
  N.seed(1337);
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad2 = (h, x, y) => { const g = h & 7; const u = g < 4 ? x : y; const v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); };
  // Perlin-style gradient noise, returns roughly [-1,1]
  N.n2 = function (x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return U.lerp(U.lerp(grad2(perm[a], x, y), grad2(perm[b], x - 1, y), u),
      U.lerp(grad2(perm[a + 1], x, y - 1), grad2(perm[b + 1], x - 1, y - 1), u), v) * 0.5;
  };
  N.fbm2 = function (x, y, oct = 4, lac = 2, gain = 0.5) {
    let amp = 1, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += amp * N.n2(x * f, y * f); norm += amp; amp *= gain; f *= lac; }
    return sum / norm;
  };
  N.ridge2 = function (x, y, oct = 4) {
    let amp = 0.5, f = 1, sum = 0;
    for (let i = 0; i < oct; i++) { sum += amp * (1 - Math.abs(N.n2(x * f, y * f))); amp *= 0.5; f *= 2; }
    return sum;
  };

  // Event bus
  const listeners = {};
  G.bus = {
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => G.bus.off(ev, fn); },
    off(ev, fn) { const l = listeners[ev]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
    emit(ev, a, b, c) { const l = listeners[ev]; if (!l) return; for (const fn of l.slice()) { try { fn(a, b, c); } catch (e) { console.error('[bus]', ev, e); } } },
  };

  // Time: dt is the scaled, clamped frame step; realDt ignores hit-stop/slow-mo.
  // Frame pacing (pace): rAF timestamps jitter by a millisecond or two (iOS especially) and now and
  // then arrive doubled or halved, which shows up as micro-stutter if the raw delta drives motion.
  // pace() estimates the display refresh interval from recent deltas; while frames line up with it
  // each step is snapped to a whole number of refresh intervals (the period is tracked precisely,
  // so time does not drift), otherwise (VRR, irregular load) the step is low-passed while conserving
  // total time. Discontinuities (tab return, mode loads: resync()) give one nominal frame instead of
  // a lurch. rawDt keeps the measured delta; vsync/refresh are the current/best refresh estimates.
  const RATES = [24, 30, 40, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];
  const RING = 24;
  // Snap a measured interval to the nearest common refresh rate when within 6%.
  const snapRate = sec => {
    const hz = 1 / sec;
    let best = 0, bd = 1;
    for (let i = 0; i < RATES.length; i++) { const e = Math.abs(hz - RATES[i]) / RATES[i]; if (e < bd) { bd = e; best = RATES[i]; } }
    return bd < 0.06 ? 1 / best : sec;
  };
  G.time = {
    dt: 0, realDt: 0, rawDt: 0, now: 0, elapsed: 0, frame: 0, scale: 1, _stop: 0, _slow: 0, _slowScale: 1,
    vsync: 1 / 60, refresh: 1 / 60, paced: false,
    _ring: new Float64Array(RING), _sorted: new Float64Array(RING), _n: 0, _i: 0, _debt: 0, _prev: 1 / 60, _lp: 1 / 60, _fast: 0, _resync: 1,
    hitStop(sec) { this._stop = Math.max(this._stop, sec); },
    slowMo(sec, scale) { this._slow = Math.max(this._slow, sec); this._slowScale = scale; },
    // The next `frames` deltas are treated as discontinuities (nominal step, not measured).
    resync(frames) { this._resync = Math.max(this._resync, frames || 1); this._debt = 0; },
    pace(raw) {
      this.rawDt = raw > 0 ? raw : 0;
      const v = this.vsync;
      // > 1 s is a suspension (tab/app switch without a visibility event): restart, don't lurch.
      // Shorter hitches still advance time (capped at 3 refreshes below / 50 ms in step()).
      if (this._resync > 0 || !(raw > 0) || raw > 1) {
        if (this._resync > 0) this._resync--;
        this._debt = 0; this._lp = v; this._fast = 0;
        return (this._prev = v);
      }
      if (raw < 0.1) { this._ring[this._i] = raw; this._i = (this._i + 1) % RING; if (this._n < RING) this._n++; }
      // Several frames in a row clearly shorter than the locked refresh: the rate went up (60 fps
      // again after a heavy 30 fps stretch, Low Power Mode switched off). Re-lock now rather than
      // stretch each of them to a whole old refresh until the percentile catches up (time would
      // run fast meanwhile).
      if (raw < v * 0.7) {
        if (++this._fast >= 3) { this._fast = 0; this._n = 0; this._i = 0; this.vsync = snapRate(raw); }
      } else this._fast = 0;
      this._estimate(raw);
      const vv = this.vsync;
      // A hitch longer than 3 refreshes (50 ms when unpaced, as in step()) is dropped, not paid back.
      const cap = this.paced ? 3 * vv : 0.05, rc = raw < cap ? raw : cap;
      this._lp += (rc - this._lp) * 0.35;
      let d;
      if (this.paced && raw > vv * 0.7) {
        // Whole refreshes. The period itself is refined continuously (59.94 Hz panels, slightly
        // fast/slow clocks), and the remaining error is paid back in slivers of at most 4% of a
        // refresh, so total time stays true without a jittery frame ever being pushed over a
        // rounding boundary (which would show as a double step).
        const q = rc / vv;
        let n = Math.round(q);
        if (n >= 1 && n <= 3) { const per = raw / n; if (Math.abs(per - vv) < vv * 0.08) this.vsync = vv + (per - vv) * 0.02; }
        // Halfway between whole counts right after a short frame (time is ahead): let the running
        // error round down, so the pair lands back on the refresh grid instead of gaining a refresh.
        const f = q - Math.floor(q);
        if (f > 0.3 && f < 0.7 && this._debt < 0) n = Math.round((rc + this._debt) / vv);
        if (n < 1) n = 1; else if (n > 3) n = 3;
        this._debt = Math.max(-2 * vv, Math.min(2 * vv, this._debt + rc - n * vv));
        const corr = Math.max(-0.04 * vv, Math.min(0.04 * vv, this._debt * 0.05));
        this._debt -= corr;
        d = n * vv + corr;
      } else {
        // Irregular frames (VRR, heavy load, a frame shorter than the refresh): one-pole low-pass
        // plus a slow payback of the difference, so total time is conserved. The step stays within
        // +-25% of the smoothed delta: never negative, no ringing after a hitch.
        const lo = this._lp * 0.75, hi = this._lp * 1.25;
        d = this._lp + this._debt * 0.1;
        d = d < lo ? lo : d > hi ? hi : d;
        this._debt = Math.max(-0.05, Math.min(0.05, this._debt + rc - d));
      }
      return (this._prev = d);
    },
    _estimate(raw) {
      const n = this._n;
      if (n < 8) return;
      const s = this._sorted, ring = this._ring;
      for (let i = 0; i < n; i++) { const x = ring[i]; let j = i - 1; while (j >= 0 && s[j] > x) { s[j + 1] = s[j]; j--; } s[j + 1] = x; }
      // 40th percentile: the single-refresh interval (doubled frames sit above it)...
      let base = s[Math.floor(n * 0.4)];
      // ...unless most frames are doubled (a 60 Hz screen at 35-40 fps): then the single-refresh
      // frames form a cluster at half of it.
      let half = 0;
      for (let i = 0; i < n; i++) if (Math.abs(s[i] - base * 0.5) < base * 0.06) half++;
      if (half >= n * 0.15) base *= 0.5;
      base = snapRate(base);
      // Re-lock only on a real change of rate (60 <-> 30 <-> 120 ...); within a rate the period is
      // refined continuously in pace().
      const v = this.vsync;
      if (Math.abs(base - v) > v * 0.12) this.vsync = base;
      // Best (shortest) refresh seen: a phone in Low Power Mode (30 Hz from boot) is not mistaken
      // for a game that cannot hold 60. It relaxes toward the current estimate only over minutes,
      // so a game that is merely GPU-bound at 30 still reads as slow to dynamic resolution.
      this.refresh = this.vsync < this.refresh ? this.vsync : this.refresh + (this.vsync - this.refresh) * Math.min(1, raw / 300);
      let hit = 0;
      const vv = this.vsync;
      for (let i = 0; i < n; i++) { const q = ring[i] / vv, k = Math.round(q); if (k >= 1 && k <= 4 && Math.abs(q - k) < 0.18) hit++; }
      const conf = hit / n;
      this.paced = this.paced ? conf > 0.6 : conf > 0.8;
    },
    step(raw) {
      this.realDt = Math.min(raw, 1 / 20);
      this.now += raw; this.frame++;
      let s = 1;
      if (this._stop > 0) { this._stop -= this.realDt; s = 0.05; }
      if (this._slow > 0) { this._slow -= this.realDt; s = Math.min(s, this._slowScale); }
      this.scale = s;
      this.dt = this.realDt * s;
      this.elapsed += this.dt;
    },
  };

  // Simple object pool
  G.Pool = class {
    constructor(make, reset) { this.make = make; this.reset = reset; this.free = []; }
    get() { const o = this.free.pop() || this.make(); return o; }
    put(o) { if (this.reset) this.reset(o); this.free.push(o); }
  };

  // Safe wrapper: run fn, log and swallow errors (used around per-mode hooks)
  G.safe = function (label, fn) { try { return fn(); } catch (e) { console.error('[' + label + ']', e); G.bus.emit('error', label, e); return undefined; } };

  G.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  G.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (G.isTouch && Math.min(screen.width, screen.height) < 820);
  // Build stamp injected by build.mjs (version.json + source commit).
  G.BUILD = window.MR_BUILD || { version: '1.0.0', commit: 'local', date: '', channel: 'dev' };
  G.VERSION = G.BUILD.version;
})(window.G);

}).call(window); } catch (e) { console.error('[module 00_core.js]', e); }
// ---- 00b_screen.js
try { (function () {
// Landscape lock. The game always presents in landscape: on phones held upright we first try the
// Screen Orientation API (needs fullscreen on most browsers) and otherwise rotate the whole #app
// 90° with CSS. Everything that reads screen coordinates must go through G.Screen so pointer
// positions, sizes and DOM rects are expressed in the game's (landscape) frame.
// A tall window on a mouse/keyboard device (a narrow desktop browser) is not rotated; the game
// keeps a landscape frame letterboxed in the middle of the window instead.
(function (G) {
  // Narrowest landscape frame the layouts are built for (iPad 1024x768).
  const MIN_ASPECT = 4 / 3;
  const S = G.Screen = {
    forced: false, // phone/tablet held upright: #app is rotated 90° with CSS
    dir: 1,        // rotation: 1 = game top toward the screen's right edge, -1 = toward its left edge
    box: null,     // letterbox frame {x, y, w, h} inside a tall non-rotated window, else null
    w() { return S.forced ? window.innerHeight : S.box ? S.box.w : window.innerWidth; },
    h() { return S.forced ? window.innerWidth : S.box ? S.box.h : window.innerHeight; },
    // Client (physical screen) point -> game-frame point.
    toLocal(cx, cy) {
      if (S.forced) return S.dir > 0 ? { x: cy, y: window.innerWidth - cx } : { x: window.innerHeight - cy, y: cx };
      if (S.box) return { x: cx - S.box.x, y: cy - S.box.y };
      return { x: cx, y: cy };
    },
    // DOMRect from getBoundingClientRect -> rect in the game frame.
    rectToLocal(r) {
      if (!S.forced && !S.box) return r;
      const a = S.toLocal(r.left, r.top), b = S.toLocal(r.right, r.bottom);
      const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y), right = Math.max(a.x, b.x), bottom = Math.max(a.y, b.y);
      return { left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top };
    },
    // Touch-first devices get the rotation; a tall desktop window gets the letterbox instead.
    wants() {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      return !!(G.isTouch && (G.isMobile || coarse));
    },
    // Which way the device was last held sideways (iOS window.orientation, else Screen Orientation
    // angle). If the page flips to upright while the phone is still held sideways (a tilt, or the
    // OS auto-rotating), the game turns the same way and stays upright in the player's hands.
    sideways() {
      let a = typeof window.orientation === 'number' ? window.orientation : null;
      if (a === null && screen.orientation && typeof screen.orientation.angle === 'number') a = screen.orientation.angle;
      if (a === 90) return 1;
      if (a === -90 || a === 270) return -1;
      return 0;
    },
    update() {
      const app = document.getElementById('app');
      const vw = window.innerWidth, vh = window.innerHeight;
      const side = S.sideways();
      if (side) S.dir = side;
      const f = S.wants() && vh > vw;
      let box = null;
      if (!f && vw / vh < MIN_ASPECT - 0.01) {
        const bh = Math.round(vw / MIN_ASPECT);
        box = { x: 0, y: Math.round((vh - bh) / 2), w: vw, h: bh };
      }
      const changed = f !== S.forced || !!box !== !!S.box || (f && S._dir !== S.dir);
      S.forced = f; S.box = box; S._dir = S.dir;
      const de = document.documentElement;
      de.classList.toggle('force-landscape', f);
      de.classList.toggle('rot-ccw', f && S.dir < 0);
      de.classList.toggle('letterbox', !!box);
      if (app) {
        const st = app.style;
        if (f) { st.width = vh + 'px'; st.height = vw + 'px'; st.left = st.top = ''; }
        else if (box) { st.width = box.w + 'px'; st.height = box.h + 'px'; st.left = box.x + 'px'; st.top = box.y + 'px'; }
        else st.width = st.height = st.left = st.top = '';
      }
      if (G.R && G.R.renderer) G.R.resize();
      if (changed && G.bus) G.bus.emit('screen', f);
    },
    // Best effort real lock (Android Chrome etc.); silently falls back to the CSS rotation. The lock needs
    // full screen on most browsers, so a refused lock enters full screen (which locks again, S.fs.enter).
    tryLock() {
      if (S._tried || !S.wants()) return;
      S._tried = true;
      const o = screen.orientation;
      if (!o || !o.lock) return;
      o.lock('landscape').catch(() => { S.fs.enter(); });
    },
  };

  // ---- Full screen (Fullscreen API: Android, desktop, iPad). iPhone Safari has no element full screen: there the
  // game offers "Add to Home Screen" instead (99_main G.PWA), and a home-screen launch is already chrome-free.
  // Bus event `fullscreen(on)` on every change (title button, Settings row).
  const docEl = document.documentElement;
  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const FS = S.fs = {
    // the API exists and the page may use it (an iframe without allowfullscreen reports fullscreenEnabled false)
    can() {
      const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
      const en = document.fullscreenEnabled !== undefined ? document.fullscreenEnabled : document.webkitFullscreenEnabled;
      return typeof req === 'function' && en !== false;
    },
    on() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    // launched from the home screen / installed (or the browser's own F11 full screen): no browser bars to hide
    standalone() { return navigator.standalone === true || mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)'); },
    ios() { const ua = navigator.userAgent || ''; return /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); },
    // an app's built-in browser (LINE, Instagram, Facebook, X, TikTok, WeChat, the Google app): no "Add to Home Screen"
    inApp() { return /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|Twitter|TikTok|musical_ly|Bytedance|\bGSA\//.test(navigator.userAgent || ''); },
    // what a full-screen control should do here: 'toggle' (API available), 'hint' (iPhone in Safari: Add to Home
    // Screen), or '' (nothing to offer: already immersive, or no way to get there)
    mode() {
      if (FS.on()) return 'toggle';
      if (FS.standalone()) return '';
      if (FS.can()) return 'toggle';
      return FS.ios() && !FS.inApp() ? 'hint' : '';
    },
    // -> Promise<bool on>. Phones also lock to landscape once full screen (Android: the lock needs full screen).
    enter() {
      if (FS.on() || !FS.can()) return Promise.resolve(FS.on());
      let p;
      try { p = docEl.requestFullscreen ? docEl.requestFullscreen({ navigationUI: 'hide' }) : docEl.webkitRequestFullscreen(); } catch (e) { return Promise.resolve(false); }
      return Promise.resolve(p).then(() => {
        const o = screen.orientation;
        if (S.wants() && o && o.lock) o.lock('landscape').catch(() => {});
        return FS.on();
      }, () => false);
    },
    exit() {
      if (!FS.on()) return Promise.resolve(false);
      let p;
      try { p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen(); } catch (e) { p = null; }
      return Promise.resolve(p).then(() => FS.on(), () => FS.on());
    },
    toggle() { return FS.on() ? FS.exit() : FS.enter(); },
  };
  const fsChange = () => { if (G.bus) G.bus.emit('fullscreen', FS.on()); setTimeout(S.update, 120); };
  document.addEventListener('fullscreenchange', fsChange);
  document.addEventListener('webkitfullscreenchange', fsChange);
  const css = document.createElement('style');
  css.textContent = 'html.force-landscape #app{inset:auto;top:0;left:0;right:auto;bottom:auto;transform-origin:0 0;transform:rotate(90deg) translateY(-100%);}' +
    'html.force-landscape.rot-ccw #app{transform:rotate(-90deg) translateX(-100%);}' +
    'html.letterbox #app{right:auto;bottom:auto;border-radius:14px;box-shadow:0 0 0 2px rgba(255,255,255,0.08),0 18px 60px rgba(0,0,0,0.45);}' +
    'html.letterbox body{background:radial-gradient(ellipse at 50% 40%,#2a3f8f,#0d1030 70%);}' +
    '#app{container-type:size;container-name:game;}';
  css.dataset.mrFrame = '1';
  document.head.appendChild(css);

  // Viewport units and size media queries describe the physical screen, which is wrong while the
  // page is rotated. Every stylesheet in the page (style.css and CSS injected by modules) is
  // rewritten to container units/queries against #app, i.e. the game frame. When not rotated the
  // frame equals the viewport, so nothing changes.
  const CQ = !!(window.CSS && CSS.supports && CSS.supports('width', '1cqw'));
  // (tools/make_public.mjs runs this same function, read from between the markers, to ship style.css already
  // converted inside @supports (width: 1cqw) for the multi-file site — keep it self-contained)
  // <convertCss>
  S.convertCss = function (text) {
    let t = text
      .replace(/(\d*\.?\d+)[sdl]?vh\b/g, '$1cqh')
      .replace(/(\d*\.?\d+)[sdl]?vw\b/g, '$1cqw')
      .replace(/(\d*\.?\d+)vmin\b/g, '$1cqmin')
      .replace(/(\d*\.?\d+)vmax\b/g, '$1cqmax');
    t = t.replace(/@media([^{]+)\{/g, (m, q) => {
      if (/prefers-|hover|pointer|print|forced-colors|color-gamut/.test(q)) return m;
      if (!/(width|height|orientation|aspect-ratio)/.test(q)) return m;
      const parts = q.split(',').map(x => x.replace(/\b(only\s+)?(screen|all)\s+and\b/g, '').trim()).filter(Boolean);
      return '@container game ' + parts.join(' or ') + ' {';
    });
    return t;
  };
  // </convertCss>
  function fixStyle(st) {
    if (!CQ || st.dataset.mrFrame) return;
    const txt = st.textContent;
    if (!txt || st._mrDone === txt) return;
    const out = S.convertCss(txt);
    st._mrDone = out;
    if (out !== txt) st.textContent = out;
  }
  S.fixAllStyles = () => document.querySelectorAll('style').forEach(fixStyle);
  if (CQ) {
    S.fixAllStyles();
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        const n = m.target.nodeType === 1 ? m.target : m.target.parentNode;
        if (n && n.tagName === 'STYLE') fixStyle(n);
        m.addedNodes && m.addedNodes.forEach(a => { if (a.tagName === 'STYLE') fixStyle(a); else if (a.parentNode && a.parentNode.tagName === 'STYLE') fixStyle(a.parentNode); });
      }
    });
    // Modules inject their CSS into <head>; style.css (in the page body) was converted above.
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  }
  window.addEventListener('resize', S.update);
  window.addEventListener('orientationchange', () => setTimeout(S.update, 200));
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(S.update, 200));
  window.addEventListener('pointerdown', S.tryLock, { once: true, capture: true });
  S.update();
})(window.G);

}).call(window); } catch (e) { console.error('[module 00b_screen.js]', e); }
// ---- 01_i18n.js
try { (function () {
// i18n: language registry, detection, translation with {param} interpolation.
// Language packs register with G.i18n.add(code, dict). English is the fallback.
(function (G) {
  const packs = {};
  const LANGS = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' },
    { code: 'zh-Hans', name: '简体中文' },
    { code: 'zh-Hant', name: '繁體中文' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt-BR', name: 'Português (BR)' },
    { code: 'it', name: 'Italiano' },
    { code: 'ru', name: 'Русский' },
    { code: 'id', name: 'Bahasa Indonesia' },
  ];
  const I = G.i18n = {
    langs: LANGS,
    lang: 'en',
    add(code, dict) { packs[code] = Object.assign(packs[code] || {}, dict); },
    has(key) { return !!((packs[I.lang] && packs[I.lang][key] != null) || (packs.en && packs.en[key] != null)); },
    detect() {
      const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).map(s => String(s));
      for (const p of prefs) {
        const l = p.toLowerCase();
        if (l.startsWith('zh')) {
          if (/(hant|tw|hk|mo)/.test(l)) return 'zh-Hant';
          return 'zh-Hans';
        }
        if (l.startsWith('pt')) return 'pt-BR';
        const base = l.split('-')[0];
        const hit = LANGS.find(x => x.code === base);
        if (hit) return hit.code;
      }
      return 'en';
    },
    set(code) {
      if (!LANGS.find(l => l.code === code)) code = 'en';
      I.lang = code;
      document.documentElement.lang = code;
      I._nf = null;
      I.apply(document);
      G.bus.emit('lang', code);
    },
    // Translate. Missing keys fall back to English, then to the key itself.
    t(key, params) {
      let s = packs[I.lang] && packs[I.lang][key];
      if (s == null) s = packs.en && packs.en[key];
      if (s == null) return key;
      if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? (typeof params[k] === 'number' ? I.num(params[k]) : params[k]) : m));
      return s;
    },
    num(n) {
      try {
        if (!I._nf) I._nf = new Intl.NumberFormat(I.lang);
        return I._nf.format(n);
      } catch (e) { return String(n); }
    },
    // Re-localize every element under root that carries data-i18n="key".
    apply(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = I.t(el.getAttribute('data-i18n')); });
      root.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('aria-label', I.t(el.getAttribute('data-i18n-title'))); });
    },
    missing(code) {
      const en = packs.en || {}; const p = packs[code] || {};
      return Object.keys(en).filter(k => p[k] == null);
    },
    packs,
  };
  G.t = I.t;
})(window.G);

}).call(window); } catch (e) { console.error('[module 01_i18n.js]', e); }
// ---- 02_save.js
try { (function () {
// Save system: one JSON blob in localStorage (guarded), deep-merged over defaults so older saves pick
// up new fields. Profile defaults come from G.Data.defaultProfile().
// Safety (GDD §16): every save carries an explicit version `v` (old saves run through the migrate(v)
// chain), the build that wrote it (`builtWith` = G.BUILD) and an FNV-1a checksum (`sum`, the last
// property, over the exact text before it; a missing or legacy checksum — a save rewritten by a build that
// does not maintain it — is valid, see parse). Each successful write keeps the previous generation in
// KEY + '.bak', so writes alternate between two good copies. An unreadable or damaged main save is
// never overwritten silently: when a good backup exists, writes are held (S.hold) until the player
// picks "Restore backup" / "Keep" / "Start fresh" (07b_screens_core 'save-recover'). Export/import
// codes are base64 of the same checksummed text. G.Motion turns the comfort settings into scalars.
(function (G) {
  const KEY = 'marmalune_save_v1';          // kept as is: every older save lives under this key
  const BAK = KEY + '.bak', PRE2 = KEY + '.pre2', CORRUPT = KEY + '_corrupt';
  const SAVE_V = 2;                         // explicit save format version (see MIGRATE)
  const CODE_PFX = 'MR2:';
  const ls = () => window.localStorage;
  const S = G.Save = {
    data: null,
    _timer: 0,
    V: SAVE_V, KEY, BAK,
    storageOk: true,        // a probe write at load worked (false: private mode / blocked in-app browser)
    writeOk: true,          // the last write worked (false: quota full or storage went away)
    hold: false,            // true while a damaged save waits for the player's choice: nothing is written
    recovery: null,         // {why: 'json'|'sum'|'shape'|'missing', bak, bakInfo, cur, curInfo} while unresolved
    loadedV: 0,             // version of the save as found on disk (0 = none)
    loadedFrom: null,       // builtWith of the save as found on disk
    settings() {
      return {
        lang: null,             // null = auto-detect on first boot
        sens: 1.0,              // look sensitivity multiplier
        invertY: false,
        quality: 'auto',        // auto | low | med | high | ultra (04_render R.QUALITY)
        master: 0.8, sfx: 0.9, music: 0.55,
        amb: 0.7, uiVol: 0.8,   // ambience beds and menu sounds (09_audio)
        autoFire: true,         // touch: fire automatically when crosshair is on a target
        lookSmooth: true,       // touch: smooth the look path (06_input)
        aimAssist: 0.6,         // 0..1
        colorblind: false,
        inkPatterns: false,     // Goo Turf: stripes/dots in team ink (forced on with colorblind)
        reducedMotion: false,   // master comfort switch: sets the four controls below to their reduced values
        shake: 1,               // screen shake 0..1 (11_systems fx.shake; amplitude follows it linearly)
        flashes: 'on',          // on | reduced: big impact/explosion flashes, hurt vignette (11_systems, 08_hud)
        speedLines: 'on',       // on | reduced | off: rally speed lines (23_race reads G.Motion.speedLines())
        camBob: true,           // first-person head bob (12_player reads G.Motion.bob())
        motionSnap: {},         // the four values above as they were when Reduced motion was switched on
        fov: 75,                // legacy vertical FOV (still read by the rally / sky-drop cameras)
        fovH: 100,              // horizontal field of view, 85–110° (GDD §4.2; converted per aspect by G.fovV)
        fovHMig: 0,             // 1 once a customised legacy `fov` has been carried over to fovH (12_player)
        hudScale: 1.0,          // touch BUTTON size only (07c_hud_layout); presets never change it
        textSize: 'm',          // s | m | l | xl: HUD text, menus and the minimap (08_hud layoutVars, GDD §13.4)
        leftHanded: false,
        showFps: false,
        bloom: true,            // glow (bloom) in the post-processed quality tiers (04b_post)
        difficulty: 'normal',   // breezy | normal | spicy | blazing
        captions: true,         // sound captions line in the HUD (08_hud, fed by G.Audio.onCaption)
        xhStyle: 'classic',     // crosshair: classic | dot | circle (08_hud)
        xhColor: 'white',       // white | yellow | cyan | pink | green (always with a dark outline)
        xhSize: 1,              // 0.6..1.6
        xhOpacity: 1,           // 0.3..1
        gpSens: 1,              // controller right-stick look speed (06_input)
        preset: null,           // easy | classic | pro (control preset chosen on first run)
        btnLayout: {},          // custom touch-button positions per layout {fps:{fire:{x,y,s}}} (07c_hud_layout)
        btnOpacity: 1,
        homeHint: false,        // iPhone: the one-time "Add to Home Screen for full screen" title hint was seen (99_main G.PWA)
      };
    },
    defaults() {
      const prof = G.Data && G.Data.defaultProfile ? G.Data.defaultProfile() : {};
      return { v: SAVE_V, settings: S.settings(), profile: prof, created: Date.now() };
    },
    load() {
      S.hold = false; S.recovery = null; S._lastRaw = null; S.loadedV = 0; S.loadedFrom = null;
      S.storageOk = probe(); S.writeOk = true;
      let raw = null;
      try { raw = ls().getItem(KEY); } catch (e) { raw = null; }
      let data = null;
      const main = parse(raw);
      if (main && main.ok) {
        data = main.data; S._lastRaw = raw;
        if (main.stale) console.info('[save] legacy checksum (the save was rewritten by an older build): loaded as is, re-checksummed on the next write');
      }
      else {
        if (main) {
          // Unreadable save (e.g. a write cut off mid-way): keep a copy before anything can overwrite it.
          try { ls().setItem(CORRUPT, raw); } catch (e2) { /* storage full/blocked */ }
          console.warn('[save] damaged save (' + main.why + ') kept as ' + CORRUPT);
        }
        let bakRaw = null;
        try { bakRaw = ls().getItem(BAK); } catch (e) { bakRaw = null; }
        const bak = parse(bakRaw);
        const bakOk = !!(bak && bak.ok);
        if (main || bakOk) {
          // A damaged main save with a good backup: hold every write until the player chooses. Without a
          // backup there is nothing better to protect (the raw text is in CORRUPT): carry on, but say so.
          const cur = main && main.data && typeof main.data === 'object' ? main.data : null;
          S.recovery = { why: main ? main.why : 'missing', bak: bakOk ? bak.data : null, bakInfo: bakOk ? info(bak.data) : null, cur, curInfo: cur ? info(cur) : null, bakRaw: bakOk ? bakRaw : null };
          S.hold = bakOk;
          if (cur) data = cur;   // checksum mismatch but readable: play on it while the choice is open
        }
      }
      S.loadedV = data && typeof data.v === 'number' ? data.v : (data ? 1 : 0);
      S.loadedFrom = data && data.builtWith && typeof data.builtWith === 'object' ? data.builtWith : null;
      if (data && S._lastRaw && S.loadedV < SAVE_V) keepPre(raw);
      S.data = build(data);
      return S.data;
    },
    // Debounced write; call freely after any change.
    save(now) {
      if (now) return S._write();
      clearTimeout(S._timer);
      S._timer = setTimeout(S._write, 400);
    },
    _write() {
      if (!S.data || S.hold) return false;      // a damaged save waits for the player's choice
      let raw;
      try { raw = serialize(S.data); } catch (e) { console.warn('[save] serialise failed', e); return false; }
      try { ls().setItem(KEY, raw); } catch (e) { status(false); return false; }
      // the previous good generation becomes the backup (two good copies, written alternately)
      const prev = S._lastRaw;
      S._lastRaw = raw;
      if (prev && prev !== raw) { try { ls().setItem(BAK, prev); } catch (e) { /* quota: the main copy is written */ } }
      else if (!prev) { try { ls().setItem(BAK, raw); } catch (e) { /* ok */ } }
      status(true);
      return true;
    },
    reset() {
      const keepSettings = S.data ? S.data.settings : null;
      S.data = S.defaults();
      if (keepSettings) S.data.settings = keepSettings;
      S.hold = false; S.recovery = null; S._lastRaw = null;   // "cannot be undone": both copies start fresh
      S._write();
      G.bus.emit('save-reset');
    },
    get set() { return S.data.settings; },
    get prof() { return S.data.profile; },
    blocked() { return !S.storageOk || !S.writeOk; },
  };
  // ------------------------------------------------------------------ checksum / codec
  // FNV-1a (32 bit) over UTF-16 code units, as 8 hex digits.
  function fnv(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  S.fnv = fnv;
  const buildInfo = () => { const b = G.BUILD || {}; return { version: String(b.version || G.VERSION || '?'), commit: String(b.commit || 'local'), channel: String(b.channel || '') }; };
  // Text written to storage / codes: the JSON with `"sum":"xxxxxxxx"` appended as its last property,
  // computed over the exact JSON text without it (key order of a re-parsed object never matters).
  function serialize(d) {
    d.v = Math.max(typeof d.v === 'number' ? d.v : 0, SAVE_V);
    d.t = Date.now();
    d.builtWith = buildInfo();
    if ('sum' in d) delete d.sum;
    const body = JSON.stringify(d);
    return body.slice(0, -1) + ',"sum":"' + fnv(body) + '"}';
  }
  const SUM_RE = /,"sum":"([0-9a-f]{8})"\}\s*$/;
  // -> null (nothing stored) | {ok:true, data, legacy, stale?} | {ok:false, why: 'json'|'shape'|'sum', data?}
  // Only real damage fails: unreadable JSON, the wrong shape, or a checksum that no longer matches text THIS writer
  // produced. A save without a checksum (older builds) is valid, and so is one with a legacy checksum: a build that
  // does not know `sum` (the v1.0 public build) keeps unknown fields when it rewrites the save, so its clean save
  // still carries the stale `sum` of the last checksummed write. Such a save is not in this writer's shape (the
  // settings come in that build's own key order; the `sum` is no longer the trailing property after a reorder), so it
  // loads as a legacy save (`stale`) and the next write gives it a fresh checksum — no confusing recovery prompt.
  function parse(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    let data;
    try { data = JSON.parse(raw); } catch (e) { return { ok: false, why: 'json' }; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, why: 'shape' };
    const m = SUM_RE.exec(raw);
    if (m && fnv(raw.slice(0, m.index) + '}') !== m[1]) {
      if (!ownShape(data)) return { ok: true, data: strip(data), legacy: true, stale: true };
      return { ok: false, why: 'sum', data: strip(data) };
    }
    return { ok: true, data: strip(data), legacy: !m, stale: !m && 'sum' in data };
  }
  // Was this text written by a checksumming writer (this build or an earlier 1.1 one)? Such a writer always puts the
  // settings it knows first, in its S.settings() order (build() merges over the defaults, and settings are only ever
  // assigned in place); later builds only add keys. So the known keys a save has must come in the same relative order
  // as here; a key out of that order (the v1.0 build puts every newer setting after its own) means the save was
  // re-written by a build that does not maintain the checksum. A save from an earlier 1.1 build that lacks a newer key
  // keeps its order, so real damage to it is still flagged.
  function ownShape(d) {
    const s = d.settings;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return true;   // (no settings to judge by: stay strict)
    const def = S.settings(), want = Object.keys(def).filter(k => k in s);
    let i = 0;
    for (const k of Object.keys(s)) if (k in def) { if (k !== want[i]) return false; i++; }
    return true;
  }
  const strip = d => { if (d && typeof d === 'object' && 'sum' in d) delete d.sum; return d; };
  S.serialize = serialize; S.parse = parse;
  // A few facts about a save for the recovery / import screens (no translation here).
  function info(d) {
    const p = d && d.profile && typeof d.profile === 'object' ? d.profile : {};
    const num = v => (typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v) ? +v : 0));
    return {
      pr: Math.max(1, num(p.rank && p.rank.pr) || 1), clinks: Math.max(0, num(p.clinks)),
      missions: Math.max(0, num(p.stats && p.stats.missions)), t: num(d && d.t) || num(d && d.created) || 0,
      v: num(d && d.v) || 1, build: d && d.builtWith && typeof d.builtWith === 'object' ? d.builtWith : null,
    };
  }
  S.info = info;
  // ------------------------------------------------------------------ migration
  // migrate(v): each step takes a raw save object of version v and returns it as version v+1. Steps only
  // add or rename; unknown fields always survive (the merge keeps them), so a migration never loses data.
  const REDUCED = { shake: 0.1, flashes: 'reduced', speedLines: 'reduced', camBob: false };
  const MIGRATE = {
    // v1 -> v2: comfort, text size, crosshair and controller settings; save metadata.
    1(d) {
      const s = d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings) ? d.settings : (d.settings = {});
      const def = S.settings();
      const rm = s.reducedMotion === true;
      for (const k of ['shake', 'flashes', 'speedLines', 'camBob']) if (!(k in s)) s[k] = rm ? REDUCED[k] : def[k];
      for (const k of ['textSize', 'xhStyle', 'xhColor', 'xhSize', 'xhOpacity', 'gpSens', 'motionSnap']) if (!(k in s)) s[k] = def[k];
      if (typeof s.textSize === 'string') s.textSize = s.textSize.toLowerCase();
      if (!('created' in d)) d.created = Date.now();
      d.v = 2;
      return d;
    },
  };
  function migrate(d) {
    let v = typeof d.v === 'number' && isFinite(d.v) ? Math.floor(d.v) : 1;
    if (v < 1) v = 1;
    for (let guard = 0; v < SAVE_V && MIGRATE[v] && guard < 50; guard++) {
      const out = G.safe ? G.safe('save migrate v' + v, () => MIGRATE[v](d)) : MIGRATE[v](d);
      if (!out) break;
      d = out; v = typeof d.v === 'number' ? d.v : v + 1;
    }
    return d;   // a newer save (v > SAVE_V) is kept as is: fields this build does not know survive the merge
  }
  S.migrate = migrate; S.MIGRATE = MIGRATE;
  // raw save object (or null) -> live data: migrate, merge over defaults, sanitize
  function build(d) {
    const src = d && typeof d === 'object' && !Array.isArray(d) ? migrate(d) : {};
    const out = merge(S.defaults(), src);
    if (typeof out.v !== 'number' || out.v < SAVE_V) out.v = SAVE_V;
    sanitizeSettings(out.settings);
    G.safe ? G.safe('save sanitize', () => sanitizeProfile(out.profile)) : sanitizeProfile(out.profile);
    return out;
  }
  // The save as it was before its first migration is kept once (PRE2), so an update can always be undone by hand.
  function keepPre(raw) {
    try { if (!ls().getItem(PRE2)) ls().setItem(PRE2, raw); } catch (e) { /* storage full/blocked */ }
  }
  function probe() {
    try { const k = '__mr_probe'; ls().setItem(k, '1'); const ok = ls().getItem(k) === '1'; ls().removeItem(k); return ok; } catch (e) { return false; }
  }
  function status(ok) {
    if (S.writeOk === ok) return;
    S.writeOk = ok;
    if (G.bus) G.bus.emit('save-status', S.blocked());
  }
  // ------------------------------------------------------------------ recovery (07b 'save-recover')
  S.restoreBackup = function () {
    const r = S.recovery; if (!r || !r.bak) return false;
    S.data = build(r.bak);
    S.hold = false; S.recovery = null; S._lastRaw = r.bakRaw;   // the backup stays as it was
    S._write();
    G.bus.emit('save-restored', 'backup');
    return true;
  };
  // keep the readable-but-damaged save (checksum mismatch): it becomes the main save again
  S.keepCurrent = function () {
    const r = S.recovery; if (!r) return false;
    S.hold = false; S.recovery = null; S._lastRaw = r.bakRaw;   // the good backup is not overwritten by it
    S._write();
    return true;
  };
  S.startFresh = function () {
    const lang = S.data && S.data.settings ? S.data.settings.lang : null;
    S.data = build(null);
    if (lang) S.data.settings.lang = lang;
    S.hold = false; S.recovery = null; S._lastRaw = null;
    S._write();
    G.bus.emit('save-restored', 'fresh');
    return true;
  };
  // ------------------------------------------------------------------ export / import codes
  function b64enc(s) {
    const b = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64dec(c) {
    const bin = atob(c);
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  }
  S.exportCode = function () {
    const copy = JSON.parse(JSON.stringify(S.data));
    return CODE_PFX + b64enc(serialize(copy));
  };
  // -> {ok:true, data, info} | {ok:false, why:'empty'|'code'|'sum'}
  S.readCode = function (code) {
    let c = String(code || '').replace(/\s+/g, '');
    if (!c) return { ok: false, why: 'empty' };
    if (/^MR\d+:/i.test(c)) c = c.slice(c.indexOf(':') + 1);
    c = c.replace(/-/g, '+').replace(/_/g, '/');
    while (c.length % 4) c += '=';
    let raw;
    try { raw = b64dec(c); } catch (e) { return { ok: false, why: 'code' }; }
    const r = parse(raw);
    if (!r || !r.ok) return { ok: false, why: r && r.why === 'sum' ? 'sum' : 'code' };
    if (r.legacy) return { ok: false, why: 'sum' };   // a code always carries its checksum
    if (!r.data.profile || typeof r.data.profile !== 'object') return { ok: false, why: 'code' };
    return { ok: true, data: r.data, info: info(r.data) };
  };
  S.importData = function (d) {
    if (!d || typeof d !== 'object') return false;
    S.data = build(JSON.parse(JSON.stringify(d)));
    S.hold = false; S.recovery = null;
    S._write();
    G.bus.emit('save-restored', 'import');
    return true;
  };
  // ------------------------------------------------------------------ merge / sanitize
  // Deep merge: values from src override defaults; arrays replaced wholesale. Structural mismatches
  // (an array where the default is a list, an object where the default is a value) keep the default
  // so a damaged save cannot crash code that relies on the shape.
  // Primitive defaults also fix the type: a number field takes a finite number (or a numeric
  // string, converted), a string/boolean field only the same type — so a hand-edited or damaged
  // `clinks: "500"` cannot turn later additions into string concatenation.
  function merge(def, src) {
    if (src === null || src === undefined) return def;
    if (Array.isArray(def)) return Array.isArray(src) ? src : def;
    if (def === null) return src;
    if (typeof def !== 'object') {
      if (typeof def === 'number') {
        const n = typeof src === 'number' ? src : (typeof src === 'string' && src.trim() !== '' ? +src : NaN);
        return isFinite(n) ? n : def;
      }
      return typeof src === typeof def ? src : def;
    }
    if (typeof src !== 'object' || Array.isArray(src)) return def;
    const out = {};
    for (const k of Object.keys(def)) out[k] = merge(def[k], src[k]);
    for (const k of Object.keys(src)) if (!(k in def)) out[k] = src[k];
    return out;
  }
  S.merge = merge;
  // Settings are fully known here: enforce types, enums and ranges (a bad value such as quality
  // 'extreme' or sens 'abc' would otherwise break rendering or aiming on every boot).
  const ENUMS = {
    quality: ['auto', 'low', 'med', 'high', 'ultra'], difficulty: ['breezy', 'normal', 'spicy', 'blazing'],
    textSize: ['s', 'm', 'l', 'xl'], flashes: ['on', 'reduced'], speedLines: ['on', 'reduced', 'off'],
    xhStyle: ['classic', 'dot', 'circle'], xhColor: ['white', 'yellow', 'cyan', 'pink', 'green'],
  };
  const RANGES = { sens: [0.1, 4], master: [0, 1], sfx: [0, 1], music: [0, 1], amb: [0, 1], uiVol: [0, 1], aimAssist: [0, 1], fov: [50, 110], fovH: [85, 110], hudScale: [0.6, 1.5], btnOpacity: [0.2, 1],
    shake: [0, 1], xhSize: [0.6, 1.6], xhOpacity: [0.3, 1], gpSens: [0.3, 2.5] };
  S.ENUMS = ENUMS; S.RANGES = RANGES;
  function sanitizeSettings(set) {
    const def = S.settings();
    if (typeof set.textSize === 'string') set.textSize = set.textSize.toLowerCase();
    for (const k in def) {
      const d = def[k], v = set[k];
      if (d === null) { if (v !== null && typeof v !== 'string') set[k] = null; continue; }
      if (typeof d === 'number') { const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? +v : NaN); set[k] = isFinite(n) ? n : d; }
      else if (typeof d === 'object') { if (!v || typeof v !== 'object' || Array.isArray(v)) set[k] = d; }
      else if (typeof v !== typeof d) set[k] = d;
      if (ENUMS[k] && !ENUMS[k].includes(set[k])) set[k] = d;
      if (RANGES[k]) set[k] = Math.min(RANGES[k][1], Math.max(RANGES[k][0], set[k]));
    }
    if (set.lang !== null && G.i18n && G.i18n.langs && !hasLang(set.lang)) set.lang = null; // re-detect
    set.btnLayout = sanitizeBtnLayout(set.btnLayout);
    return set;
  }
  function hasLang(code) {
    const L = G.i18n.langs;
    if (Array.isArray(L)) return L.some(l => l === code || (l && l.code === code));
    return !!(L && typeof L === 'object' && Object.prototype.hasOwnProperty.call(L, code));
  }
  // Custom touch-button positions {layout: {btn: {x, y, s}}} as screen fractions (07c_hud_layout):
  // drop entries without finite coordinates (they would place a button at NaN = top-left corner).
  const fin = v => typeof v === 'number' && isFinite(v);
  function sanitizeBtnLayout(bl) {
    const out = {};
    if (!bl || typeof bl !== 'object' || Array.isArray(bl)) return out;
    for (const lay of Object.keys(bl)) {
      const L = bl[lay];
      if (!L || typeof L !== 'object' || Array.isArray(L)) continue;
      const o = {};
      for (const id of Object.keys(L)) {
        const c = L[id];
        if (!c || typeof c !== 'object' || !fin(c.x) || !fin(c.y)) continue;
        o[id] = { x: Math.min(1, Math.max(0, c.x)), y: Math.min(1, Math.max(0, c.y)), s: fin(c.s) && c.s > 0 ? Math.min(1.6, Math.max(0.6, c.s)) : 1 };
      }
      if (Object.keys(o).length) out[lay] = o;
    }
    return out;
  }
  S.sanitizeSettings = sanitizeSettings;
  // Profile maps whose entries the defaults cannot describe key by key: owned weapons are merged
  // over the catalogue template so a damaged entry (lvl "max", xp null, a bare number) is repaired.
  function sanitizeProfile(p) {
    if (!p || typeof p !== 'object') return p;
    const D = G.Data;
    if (D && D.newWeapon && p.weapons && typeof p.weapons === 'object') {
      const maxLv = D.WEAPON_MAX_LVL || 5;
      for (const id of Object.keys(p.weapons)) {
        const w = p.weapons[id];
        if (!w || typeof w !== 'object' || Array.isArray(w)) { delete p.weapons[id]; continue; }
        const m = merge(D.newWeapon(1, 0), w);
        m.lvl = Math.min(maxLv, Math.max(1, Math.round(m.lvl) || 1));
        m.xp = Math.max(0, m.xp);
        p.weapons[id] = m;
      }
      if (!p.weapons.fizz) p.weapons.fizz = D.newWeapon(1, 0); // the starter blaster is always owned
    }
    for (const k of ['clinks', 'lumite', 'stamps']) if (typeof p[k] === 'number' && p[k] < 0) p[k] = 0;
    return p;
  }
  S.sanitizeProfile = sanitizeProfile;
  window.addEventListener('pagehide', () => { if (S.data) S._write(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.data) S._write(); });

  // ------------------------------------------------------------------ comfort settings as scalars
  // Read by 11_systems (shake, flash), 08_hud (flash), 12_player (bob) and 23_race (speed lines). The
  // master "Reduced motion" switch (Settings → Accessibility) sets the four controls to REDUCED and
  // puts the previous values back when it is switched off again; each control stays adjustable.
  const M = G.Motion = {
    REDUCED,
    _s: () => (S.data ? S.data.settings : null),
    shake() { const s = M._s(); return s && typeof s.shake === 'number' ? Math.min(1, Math.max(0, s.shake)) : 1; },
    flash() { const s = M._s(); return s && s.flashes === 'reduced' ? 0.6 : 1; },
    speedLines() { const s = M._s(); return !s ? 1 : s.speedLines === 'off' ? 0 : s.speedLines === 'reduced' ? 0.5 : 1; },
    bob() { const s = M._s(); return !s || s.camBob !== false; },
    setReduced(on) {
      const s = M._s(); if (!s) return;
      on = !!on;
      if (on) {
        const snap = {};
        for (const k in REDUCED) snap[k] = s[k];
        s.motionSnap = snap;
        Object.assign(s, REDUCED);
      } else {
        const snap = s.motionSnap && typeof s.motionSnap === 'object' ? s.motionSnap : {}, def = S.settings();
        // only values still at their reduced setting go back; anything changed since stays as chosen
        for (const k in REDUCED) if (s[k] === REDUCED[k]) s[k] = k in snap ? snap[k] : def[k];
        s.motionSnap = {};
      }
      s.reducedMotion = on;
      sanitizeSettings(s);
      S.save();
    },
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 02_save.js]', e); }
// ---- 03_strings_core.js
try { (function () {
// Core UI strings (English + Japanese). Other languages live in 90_lang_*.js.
(function (G) {
  G.i18n.add('en', {
    'ui.loading': 'Loading…', 'ui.close': 'Close', 'ui.ok': 'OK', 'ui.cancel': 'Cancel', 'ui.confirm': 'Are you sure?',
    'ui.yes': 'Yes', 'ui.no': 'No', 'ui.back': 'Back', 'ui.continue': 'Continue', 'ui.retry': 'Retry', 'ui.start': 'Start',
    'ui.locked': 'Locked', 'ui.new': 'NEW', 'ui.max': 'MAX', 'ui.level': 'Lv {n}',
    'hud.fell': 'Whoops! Back to solid ground.', 'ui.rotate': 'Turn your phone sideways!', 'ui.playPortrait': 'Play upright anyway', 'hud.respawn': 'Respawning in {n}…', 'hud.interact': 'Interact',
    'err.webgl': 'Your browser could not start 3D graphics (WebGL). Try another browser or turn on hardware acceleration.',
    'ui.loadError': 'Oops! That one would not load. Back to town for now.', 'ui.modeMissing': 'That mode is not ready yet.',
    'ui.glLost': 'Repainting the world…', 'ui.glLostSub': 'Your device paused the 3D graphics. Hang tight — the game is frozen until they are back.',
    'ui.glStuck': 'Still blank? Reload the game. Your progress is saved.', 'ui.reload': 'Reload',
  });
  G.i18n.add('ja', {
    'ui.loading': 'よみこみ中…', 'ui.close': 'とじる', 'ui.ok': 'OK', 'ui.cancel': 'キャンセル', 'ui.confirm': 'よろしいですか？',
    'ui.yes': 'はい', 'ui.no': 'いいえ', 'ui.back': 'もどる', 'ui.continue': 'つづける', 'ui.retry': 'もう一度', 'ui.start': 'スタート',
    'ui.locked': 'ロック中', 'ui.new': 'NEW', 'ui.max': 'MAX', 'ui.level': 'Lv {n}',
    'hud.fell': 'おっと！ 安全な場所にもどったよ。', 'ui.rotate': 'スマホを横にしてね！', 'ui.playPortrait': 'このままあそぶ', 'hud.respawn': '{n}秒後に復活…', 'hud.interact': 'しらべる',
    'err.webgl': '3D表示（WebGL）を開始できませんでした。別のブラウザを試すか、ハードウェアアクセラレーションを有効にしてください。',
    'ui.loadError': 'あれれ、うまく よみこめなかったよ。いったんタウンにもどるね。', 'ui.modeMissing': 'このモードは まだじゅんび中だよ。',
    'ui.glLost': 'せかいを ぬりなおし中…', 'ui.glLostSub': '3Dがめんが いったん止まったよ。もどるまで ゲームは ストップしているから、ちょっとまってね。',
    'ui.glStuck': 'まだ まっくら？ ゲームをよみこみなおしてね。進みぐあいは セーブされているよ。', 'ui.reload': 'よみこみなおす',
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 03_strings_core.js]', e); }
// ---- 04_render.js
try { (function () {
// Rendering: renderer, cameras, viewmodel layer, quality tiers, colour pipeline, hitch-free
// dynamic resolution, toon/rim materials, gradient sky, lighting rigs, glow + blob-shadow helpers,
// the Ultra tier's real-time sun shadows and the optional baked hi-res textures (public build).
// Post-processing (scene target, bloom, grading) lives in 04b_post.js and plugs in through R.post.
(function (G) {
  const R = G.R = {};
  // prCap: max pixel ratio. prMin: lowest effective pixel ratio dynamic resolution may reach.
  // minScale (optional): render-scale floor cap, so a tier with a high prMin can still shed resolution
  // on 1x displays. post: composite tier run by 04b_post ('' = draw straight to the canvas).
  // maxPx: cap on scene-target pixels on the post path (memory/fill); beyond it the composite
  // upscales from a smaller render scale instead. shadows: real-time sun shadow map (WebGL2).
  // surf: world-space surface grain on vertex-coloured props. fogK: [near, far] fog stretch.
  const QUALITY = {
    low: { prCap: 1.0, prMin: 0.55, draw: 140, clouds: false, particles: 0.5, props: 0.55, shadows: false, post: '' },
    med: { prCap: 1.5, prMin: 0.7, draw: 220, clouds: true, particles: 0.8, props: 0.8, shadows: false, post: 'med', maxPx: 1.7e6 },
    high: { prCap: 2.0, prMin: 0.9, draw: 320, clouds: true, particles: 1.0, props: 1.0, shadows: false, post: 'high', maxPx: 2.6e6 },
    // Ultra (capable devices; picked by auto only on non-touch desktops with proven headroom): full device
    // resolution up to 2x, a higher resolution floor, sun shadows, surface grain, denser/longer foliage
    // (11b), MSAA + wider HQ bloom (04b), a little more view distance.
    // (minScale 0.9: the render-scale floor is never below High's — equal on 1x screens, higher on HiDPI ones)
    ultra: { prCap: 2.0, prMin: 1.15, minScale: 0.9, draw: 420, clouds: true, particles: 1.0, props: 1.0, shadows: true, surf: true, post: 'ultra', maxPx: 5.2e6, fogK: [1.15, 1.1] },
  };
  R.QUALITY = QUALITY;
  const TIER_ORDER = ['low', 'med', 'high', 'ultra'];
  // 0 low .. 3 ultra; modules that pick by tier should compare ranks (an unknown tier counts as high).
  R.tierRank = function (name) { const i = TIER_ORDER.indexOf(name || R.qualityName()); return i < 0 ? 2 : i; };

  // ---------- Colour pipeline ----------
  // Every shader encodes its own output to sRGB, whether it draws to the canvas or into a post
  // target. (three.js would otherwise write linear values into render targets and build a second
  // program for every material.) So: one program per material whatever the tier — no recompiles
  // when post-processing toggles — 8-bit targets keep perceptual precision, and blending happens in
  // the same display space as before, so transparent/additive effects look identical with and
  // without post. Consequences: renderer.outputColorSpace stays Linear (it only selects the
  // encoding, which the chunk below forces to sRGB); the fog colour is encoded in the fog chunk;
  // scene.background / setClearColor colours are written unconverted (draw a sky mesh instead).
  const CH = THREE.ShaderChunk;
  const FOG_MIX = 'mix( gl_FragColor.rgb, fogColor, fogFactor )';
  R.colorOk = !!(CH && typeof CH.colorspace_pars_fragment === 'string' && CH.colorspace_pars_fragment.indexOf('vec4 sRGBTransferOETF') >= 0 && typeof CH.fog_fragment === 'string' && CH.fog_fragment.indexOf(FOG_MIX) >= 0);
  if (R.colorOk) {
    CH.colorspace_pars_fragment += '\n#define LinearTransferOETF sRGBTransferOETF\n';
    CH.fog_fragment = CH.fog_fragment.replace(FOG_MIX, 'mix( gl_FragColor.rgb, sRGBTransferOETF( vec4( fogColor, 1.0 ) ).rgb, fogFactor )');
  }

  R.init = function (container) {
    const canvas = document.createElement('canvas');
    canvas.id = 'gl';
    container.appendChild(canvas);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    } catch (e) {
      renderer = null;
    }
    if (!renderer) return false;
    renderer.outputColorSpace = R.colorOk ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = false;
    renderer.info.autoReset = false; // totals across the main + viewmodel (+ post) passes
    R.renderer = renderer;
    R.canvas = canvas;
    // Phones drop the GL context under memory pressure or after backgrounding. three.js rebuilds
    // its GPU state on restore by itself; we freeze the simulation and tell the player (99_main),
    // and rebuild the post targets (their GL objects died with the context).
    R.lost = false;
    R._gl = renderer.getContext();
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); R.lost = true; if (R.post && R.post.lost) R.post.lost(); shadowLost(); G.bus.emit('gl-lost'); }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      R.lost = false;
      G.safe('gl restore', () => R.applyQuality());
      // Everything recompiles/re-uploads on the new context: do it now, behind the "lost" overlay.
      if (R.scene) G.safe('gl restore warmup', () => R.warmup(R.scene));
      G.time.resync(3); R.frameGrace(2);
      G.bus.emit('gl-restored');
    }, false);
    R.camera = new THREE.PerspectiveCamera(75, 1, 0.08, 1500);
    R.vmScene = new THREE.Scene();
    R.vmCamera = new THREE.PerspectiveCamera(58, 1, 0.01, 20);
    const vmHemi = new THREE.HemisphereLight(0xffffff, 0x8a7fb0, 2.2);
    const vmDir = new THREE.DirectionalLight(0xfff3dd, 2.4);
    vmDir.position.set(-0.6, 1.2, 0.8);
    R.vmScene.add(vmHemi, vmDir);
    R.vmLights = { hemi: vmHemi, dir: vmDir };
    R.vmRoot = new THREE.Group();
    R.vmScene.add(R.vmRoot);
    R.scene = new THREE.Scene();
    R.showViewmodel = false;
    R.pr = 1;
    R.applyQuality();
    window.addEventListener('resize', R.resize);
    window.addEventListener('orientationchange', () => setTimeout(R.resize, 250));
    R.resize();
    return true;
  };

  // The 'webglcontextlost' event arrives asynchronously, so a frame (or a mode's shader prewarm)
  // can run on an already-lost context before R.lost flips; three.js then reads a null shader log
  // and throws. Check the context itself too before rendering or compiling.
  R.isLost = function () { return R.lost || !!(R._gl && R._gl.isContextLost && R._gl.isContextLost()); };

  R.qualityName = function () {
    const q = G.Save.set.quality;
    if (q !== 'auto' && QUALITY[q]) return q;
    return R._autoQ || (G.isMobile ? 'med' : 'high');
  };
  R.q = function () { return QUALITY[R.qualityName()]; };
  // Devices that may be promoted to Ultra by auto quality: non-touch desktops with WebGL2.
  const desktopClass = () => !G.isMobile && !G.isTouch;

  // Resolution model.
  //   Post path (med/high): the canvas buffer stays at prMax; the scene renders into a viewport of
  //   size (canvas * scale) inside a target allocated once, and the composite upscales. Changing
  //   the scale costs nothing (no reallocation, no hitch).
  //   Direct path (low, or post unavailable): the canvas pixel ratio itself is changed, rarely and
  //   with strong hysteresis, because every change reallocates the drawing buffer.
  // R.pr is always the effective 3D pixel ratio (viewport px per CSS px) — point-sprite sizing and
  // the FPS readout use it.
  R.postOn = false; R.scale = 1; R.scaleMin = 1; R.scaleMax = 1; R.prMax = 1;
  // auto: true when the change comes from auto quality itself (tier drop mid-game): shader variants are then
  // left as compiled (the shadow pass simply stops) and re-synced at the next mode load, so nothing
  // recompiles mid-game. A change from the settings recompiles at once, behind the open menu.
  R.applyQuality = function (auto) {
    const q = R.q();
    R.prMax = Math.min(window.devicePixelRatio || 1, q.prCap);
    R.prTarget = R.prMax;
    R.postOn = false;
    if (R.renderer && q.post && R.colorOk && R.post && !R._postBroken && !R.isLost()) {
      R.postOn = !!G.safe('post setup', () => R.post.setup(q.post));
    } else if (R.post && R.post.teardown) R.post.teardown();
    R.scale = 1; R.scaleMax = 1;
    R.pr = R.prMax;
    if (R.renderer) R.renderer.setPixelRatio(R.prMax);
    R._sizeKey = '';
    resetDR();
    R.resize();
    if (R.postOn) R.setScale(R.scaleMax);
    if (R.renderer && !R.isLost()) G.safe('shadow setup', () => setupShadows(q));
    // (an automatic tier change mid-game leaves the textures as they are — swapping one, or changing its
    // anisotropy, re-uploads it on a gameplay frame; setScene applies them at the next load)
    if (R.renderer) G.safe('assets', () => { R.assets.want(); if (auto !== true) applyTextures(); });
    // Settings change mid-session (not during a mode load, which syncs in setScene): bring the shader
    // variants in line now and compile them while the settings screen is still up.
    if (R.renderer && auto !== true && !(G.Game && G.Game._switching) && !R.isLost()) {
      if (syncToon() && R.scene) G.safe('quality warmup', () => R.warmup(R.scene));
    }
    G.bus.emit('quality', R.qualityName());
  };

  R.resize = function () {
    if (!R.renderer) return;
    // Game-frame size (swapped when the landscape lock rotates the page).
    const w = G.Screen ? G.Screen.w() : window.innerWidth, h = G.Screen ? G.Screen.h() : window.innerHeight;
    // Assigning canvas.width reallocates (and clears) the drawing buffer even when the value does
    // not change, so skip it unless the size or pixel ratio really changed.
    const key = w + 'x' + h + '@' + R.renderer.getPixelRatio();
    if (key !== R._sizeKey) {
      R._sizeKey = key;
      R.renderer.setSize(w, h, false);
      R.canvas.style.width = w + 'px';
      R.canvas.style.height = h + 'px';
    }
    R.camera.aspect = w / h;
    R.camera.updateProjectionMatrix();
    R.vmCamera.aspect = w / h;
    // Keep the gun framed similarly in portrait.
    R.vmCamera.fov = w < h ? 72 : 58;
    R.vmCamera.updateProjectionMatrix();
    R.w = w; R.h = h;
    // While the context is lost the post targets are gone (R.post.lost); a resize then (phones
    // rotate while backgrounded) must not be taken for a failure: the restore handler re-runs
    // applyQuality, which rebuilds the targets at the current size.
    if (R.postOn && !R.isLost()) {
      const bw = Math.max(1, Math.floor(w * R.prMax)), bh = Math.max(1, Math.floor(h * R.prMax));
      const q = R.q();
      // Touch devices on High get a tighter pixel budget (tablets: GPU memory is shared and Safari
      // drops the context under pressure). Phones sit far below either cap.
      const maxPx = (q.maxPx || 4e6) * (G.isTouch && (q.post === 'high' || q.post === 'ultra') ? 0.8 : 1);
      R.scaleMax = Math.min(1, Math.sqrt(maxPx / (bw * bh)));
      R.scaleMin = Math.min(R.scaleMax, Math.max(0.45, Math.min(q.prMin / R.prMax, q.minScale || 1)));
      if (!G.safe('post resize', () => R.post.resize(bw, bh, R.scaleMax) !== false)) R.disablePost('resize');
      else R.setScale(Math.min(R.scale, R.scaleMax));
    }
    G.bus.emit('resize', w, h);
  };

  // Post path only: render scale, quantised to 5% steps.
  R.setScale = function (s) {
    s = Math.round(G.util.clamp(s, R.scaleMin, R.scaleMax) * 20) / 20;
    s = G.util.clamp(s, R.scaleMin, R.scaleMax);
    R.scale = s;
    R.pr = R.prMax * s;
    if (R.postOn && R.post.setScale) R.post.setScale(s);
  };

  // Turn post-processing off for the rest of the session (failure fallback): render directly.
  R.disablePost = function (why) {
    if (!R.postOn && !R._postBroken) return;
    console.warn('[render] post-processing disabled (' + why + '), rendering directly');
    R._postBroken = true;
    R.postOn = false;
    if (R.post && R.post.teardown) G.safe('post teardown', () => R.post.teardown());
    R.pr = R.prMax; R.prTarget = R.prMax; R.scale = 1;
    if (R.renderer) R.renderer.setPixelRatio(R.pr);
    R._sizeKey = '';
    resetDR();
    R.resize();
  };

  // ---------- Dynamic resolution ----------
  // Fed every frame with the raw frame interval and the CPU time of the frame (simulation + HUD;
  // rendering is excluded because GPU back-pressure can block inside GL calls). The target is the
  // display refresh (G.time.refresh, at most 60 Hz), so a phone in Low Power Mode (30 Hz) does not
  // shed resolution it cannot use. Lowering the resolution only helps when the GPU is the bottleneck:
  // if the CPU time alone fills the frame, resolution stays near full and the tier drop (fewer
  // particles/props, shorter draw distance) is what kicks in.
  const DR = {};
  function resetDR() {
    DR.acc = 0; DR.n = 0; DR.t = 0; DR.cpu = 0; DR.dec = 0; DR.decN = 0; DR.decCpu = 0;
    DR.slow = 0; DR.fast = 0; DR.floorSlow = 0; DR.hold = 0; DR.backoff = 2; DR.cool = 3; DR.grace = 1;
  }
  resetDR();
  // Ignore the next `sec` of frames (loads, tab return, context restore); the partial window from
  // before the discontinuity is dropped too, so it cannot skew the first decision afterwards.
  R.frameGrace = function (sec) { DR.grace = Math.max(DR.grace, sec); DR.acc = 0; DR.n = 0; DR.t = 0; DR.cpu = 0; };
  R.trackFrame = function (raw, cpuMs) {
    if (R.isLost() || !(raw > 0) || raw > 0.25) return;
    if (DR.grace > 0) { DR.grace -= raw; return; }
    DR.acc += raw; DR.n++; DR.t += raw; DR.cpu += cpuMs || 0;
    if (DR.hold > 0) DR.hold -= raw;
    if (DR.cool > 0) DR.cool -= raw;
    if (DR.t < 0.5) return;
    const avg = DR.acc / DR.n, cpu = DR.cpu / DR.n / 1000;
    R.fps = 1 / avg;
    R.cpuMs = cpu * 1000;
    DR.acc = 0; DR.n = 0; DR.t = 0; DR.cpu = 0;
    // Menus (blurred backdrops cost compositor time, not 3D fill) and loads say nothing about
    // gameplay frame cost: measure, but do not act.
    if ((G.UI && G.UI.anyOpen && G.UI.anyOpen()) || (G.Game && (G.Game._switching || G.Game.paused))) { DR.dec = DR.decCpu = DR.decN = 0; DR.fast = 0; return; }
    const T = Math.max(G.time.refresh || 1 / 60, 1 / 60);
    judgeUltra(avg, cpu, T);
    if (R.postOn) decidePost(avg, cpu, T);
    else {
      // Direct path: decide on 2 s averages.
      DR.dec += avg; DR.decCpu += cpu; DR.decN++;
      if (DR.decN >= 4) { const a = DR.dec / DR.decN, c = DR.decCpu / DR.decN; DR.dec = DR.decCpu = DR.decN = 0; decideDirect(a, c, T); }
    }
  };
  function decidePost(avg, cpu, T) {
    const slow = avg > T * 1.2, fast = avg < T * 1.07, cpuBound = cpu > avg * 0.75;
    if (slow) {
      DR.fast = 0;
      const floor = cpuBound ? Math.max(R.scaleMin, Math.min(R.scale, 0.85 * R.scaleMax)) : R.scaleMin;
      if (R.scale > floor + 1e-3) {
        R.setScale(Math.max(floor, R.scale - (avg > T * 1.5 ? 0.1 : 0.05)));
        // Back off from probing upward again: 2 s, 4 s, 8 s ... 30 s after each failure.
        DR.hold = DR.backoff; DR.backoff = Math.min(30, DR.backoff * 2);
        DR.floorSlow = 0;
      } else DR.floorSlow++;
    } else {
      DR.floorSlow = Math.max(0, DR.floorSlow - 1);
      if (fast) {
        DR.fast++;
        if (DR.fast >= 4 && DR.hold <= 0 && R.scale < R.scaleMax - 1e-3) { R.setScale(R.scale + 0.05); DR.fast = 0; }
        if (DR.fast >= 20) DR.backoff = Math.max(2, DR.backoff * 0.5); // long stable stretch: forgive
      } else DR.fast = 0;
    }
    // Still slow at the floor for ~6 s on auto: drop a whole tier (never raised automatically).
    if (DR.floorSlow >= 12) { DR.floorSlow = 0; tierDown(); }
  }
  // Direct path: only the drawing buffer changes (setPixelRatio resizes it); the game-frame size
  // is the same, so no 'resize' event (HUD/menu relayout would add a DOM hitch to the GPU one).
  function setDirectPR(pr) {
    R.pr = pr;
    R.renderer.setPixelRatio(pr);
    R._sizeKey = R.w + 'x' + R.h + '@' + R.renderer.getPixelRatio();
  }
  function decideDirect(avg, cpu, T) {
    const q = R.q();
    if (avg > T * 1.25 && DR.cool <= 0) {
      DR.fast = 0;
      if (R.pr > q.prMin + 1e-3 && cpu < avg * 0.75) {
        setDirectPR(Math.max(q.prMin, R.pr - 0.15));
        DR.cool = 4; DR.hold = DR.backoff; DR.backoff = Math.min(40, DR.backoff * 2);
      }
      if (++DR.slow > 2) { DR.slow = 0; tierDown(); }
    } else if (avg < T * 1.07) {
      DR.slow = Math.max(0, DR.slow - 1);
      if (++DR.fast >= 3 && DR.cool <= 0 && DR.hold <= 0 && R.pr < R.prTarget - 1e-3) {
        setDirectPR(Math.min(R.prTarget, R.pr + 0.1));
        DR.fast = 0; DR.cool = 6;
      }
    } else { DR.fast = 0; DR.slow = Math.max(0, DR.slow - 1); }
  }
  function tierDown() {
    if (G.Save.set.quality !== 'auto' || R.qualityName() === 'low') return;
    const cur = R.qualityName();
    // Ultra that turned out too heavy goes back to High and is never offered again this session.
    if (cur === 'ultra') { UA.blocked = true; UA.pending = false; }
    R._autoQ = cur === 'ultra' ? 'high' : cur === 'high' ? 'med' : 'low';
    R.applyQuality(true);
  }

  // ---------- Auto quality: promotion to Ultra ----------
  // Only on auto, on a non-touch desktop with WebGL2 and the post path, while running High at full
  // render scale with a long clean history. Headroom has to be measured, not guessed: a vsync-locked
  // 60 Hz frame says nothing about spare GPU time, so a window only counts when either the display
  // runs far faster than the 60 Hz target (high-refresh monitors: frames come in < 0.62 T), or a GPU
  // timer query (EXT_disjoint_timer_query_webgl2, sampled every ~30 frames) shows the scene pass under
  // 40 % of the frame — with the CPU side under 40 % too. 40 such windows (20 s of play) without one
  // slow window arm a promotion; it is applied at the next mode load (setScene), behind the loading
  // screen, so the extra shader variants and denser foliage never cost a hitch mid-game. If Ultra is
  // then slow, the regular dynamic-resolution path sheds pixels and finally drops back (tierDown).
  const UA = R.autoUltra = { windows: 0, need: 40, pending: false, blocked: false, apply: false, gpuMs: -1, promoted: 0 };
  function judgeUltra(avg, cpu, T) {
    if (G.Save.set.quality !== 'auto' || UA.blocked || UA.pending) return;
    if (R.qualityName() !== 'high' || !desktopClass() || !R.postOn || !SH.supported || R.scale < R.scaleMax - 1e-3) { UA.windows = 0; return; }
    if (avg > T * 1.07) { UA.windows = 0; return; }
    // Ultra's bigger target cap can draw up to 2x High's pixels (large HiDPI windows): the headroom has to cover it
    const pk = ultraPixelK();
    const fastDisplay = avg * pk < T * 0.62;
    const gpuOk = UA.gpuMs >= 0 && UA.gpuMs * pk < T * 1000 * 0.4;
    if ((fastDisplay || gpuOk) && cpu < avg * 0.4) UA.windows++;
    if (UA.windows >= UA.need) UA.pending = true;
  }
  // Scene-target pixels Ultra would draw / pixels High draws now (same canvas; only the maxPx caps differ): 1..2.
  function ultraPixelK() {
    const px = Math.max(1, Math.floor(R.w * R.prMax) * Math.floor(R.h * R.prMax)), tk = G.isTouch ? 0.8 : 1;
    return Math.min(px, QUALITY.ultra.maxPx * tk) / Math.max(1, Math.min(px, QUALITY.high.maxPx * tk));
  }
  // GPU timer around the scene pass (desktop High on auto only; skipped everywhere else).
  const GT = { ext: undefined, q: null, busy: false, n: 0 };
  function gpuTimerWanted() { return G.Save.set.quality === 'auto' && !UA.blocked && !UA.pending && R.qualityName() === 'high' && desktopClass() && SH.supported; }
  function gpuTimerBegin() {
    if (!gpuTimerWanted() || GT.busy || ++GT.n < 30) return false;
    const gl = R._gl;
    if (GT.ext === undefined) GT.ext = (gl && gl.getExtension && gl.getExtension('EXT_disjoint_timer_query_webgl2')) || null;
    if (!GT.ext) return false;
    if (!GT.q) GT.q = gl.createQuery();
    GT.n = 0;
    gl.beginQuery(GT.ext.TIME_ELAPSED_EXT, GT.q);
    return true;
  }
  function gpuTimerEnd() { const gl = R._gl; gl.endQuery(GT.ext.TIME_ELAPSED_EXT); GT.busy = true; }
  function gpuTimerPoll() {
    if (!GT.busy) return;
    const gl = R._gl;
    if (!gl.getQueryParameter(GT.q, gl.QUERY_RESULT_AVAILABLE)) return;
    const disjoint = gl.getParameter(GT.ext.GPU_DISJOINT_EXT);
    const ns = gl.getQueryParameter(GT.q, gl.QUERY_RESULT);
    GT.busy = false;
    if (!disjoint) UA.gpuMs = UA.gpuMs < 0 ? ns / 1e6 : UA.gpuMs * 0.7 + ns / 1e6 * 0.3;
  }
  // Armed promotion, at a mode switch: the tier name flips while the old world is disposed (so the next
  // mode's enter() already builds Ultra foliage / materials), and the renderer side (post targets, shadow
  // map) is set up in setScene, right before that mode's compile + warm-up — all behind the loading screen.
  function applyPendingUltra() {
    if (!UA.pending || UA.blocked || G.Save.set.quality !== 'auto') { UA.pending = false; return; }
    UA.pending = false; UA.windows = 0; UA.promoted++; UA.apply = true;
    R._autoQ = 'ultra';
    console.info('[render] auto quality: plenty of headroom, switching to Ultra');
  }

  R.setScene = function (scene) {
    R.scene = scene;
    // Mode load (G.Game.go: enter() done, compile + warm-up follow): bring every soft-toon shader variant
    // in line with the tier, swap in the textures for this tier, and tag the shadow casters.
    if (G.Game && G.Game._switching && R.renderer && !R.isLost()) {
      if (UA.apply) { UA.apply = false; G.safe('auto ultra', () => R.applyQuality(true)); }
      G.safe('toon sync', () => { syncToon(); applyTextures(); if (SH.on) tagCasters(scene); });
    }
  };

  // Shared by every sky material: alpha the sky writes (0 into the post target as a bloom mask,
  // 1 on the canvas — some browsers honour canvas alpha even with alpha:false when compositing).
  R.skyAlpha = { value: 1 };
  // Per-frame stats: calls/tris of the scene + viewmodel passes (R.stats.calls: the budget number), the
  // sun-shadow pass (Ultra), post passes and their CPU cost. renderer.info holds the grand total.
  R.stats = { calls: 0, tris: 0, postCalls: 0, postMs: 0, shadowCalls: 0, shadowTris: 0, shadowMs: 0 };
  R.render = function () {
    const r = R.renderer;
    if (R.isLost()) return;
    L.uTime.value = G.time.elapsed;
    L.uWindK.value = G.Save.data && G.Save.set.reducedMotion ? 0.35 : 1;
    r.info.reset();
    const st = R.stats;
    st.shadowCalls = 0; st.shadowTris = 0; SH.fresh = false;
    if (!SH.on) st.shadowMs = 0;
    if (SH.on && R.scene) renderShadows(R.scene);
    st._c0 = r.info.render.calls; st._t0 = r.info.render.triangles;
    const vm = R.showViewmodel && R.vmRoot.children.length > 0;
    gpuTimerPoll();
    if (R.postOn) {
      R.skyAlpha.value = 0;
      if (R.post.render(R.scene, R.camera, vm)) return;
      R.disablePost('render error');
    }
    R.skyAlpha.value = 1;
    r.setRenderTarget(null);
    r.clear(true, true, true);
    if (R.scene) {
      const t = gpuTimerBegin();
      R.beginScene(R.scene);
      try { r.render(R.scene, R.camera); } finally { R.endScene(R.scene); if (t) gpuTimerEnd(); }
    }
    if (vm) {
      r.clearDepth();
      r.render(R.vmScene, R.vmCamera);
    }
    st.calls = r.info.render.calls - st._c0; st.tris = r.info.render.triangles - st._t0; st.postCalls = 0; st.postMs = 0;
  };
  // Around the main scene pass only (04b_post calls these too): sun shadows apply, Ultra's fog stretch, and
  // no second full-scene matrix update when the shadow pass already did it this frame. Everything else that
  // renders with the house materials (viewmodel, locker turntable, previews) sees shadows off.
  const _fog = { f: null, near: 0, far: 0 }, _mwa = { s: null, v: true };
  R.beginScene = function (scene) {
    if (!scene) return;
    L.uSunOn.value = SH.on ? SH.k : 0;
    if (SH.fresh) { _mwa.s = scene; _mwa.v = scene.matrixWorldAutoUpdate; scene.matrixWorldAutoUpdate = false; }
    const fk = R.q().fogK, f = scene.fog;
    if (fk && f && f.isFog) {
      // stretched, never shortened (a fog already beyond 80 % of the far plane stays as it is)
      _fog.f = f; _fog.near = f.near; _fog.far = f.far;
      f.far = Math.min(f.far * fk[1], Math.max(f.far, R.camera.far * 0.8));
      f.near = Math.min(f.near * fk[0], f.far - 1);
    }
  };
  R.endScene = function (scene) {
    L.uSunOn.value = 0;
    if (_mwa.s) { _mwa.s.matrixWorldAutoUpdate = _mwa.v; _mwa.s = null; }
    if (_fog.f) { _fog.f.near = _fog.near; _fog.f.far = _fog.far; _fog.f = null; }
  };
  R._gpuTimerBegin = () => gpuTimerBegin();
  R._gpuTimerEnd = () => gpuTimerEnd();

  // Mode-load warm-up: draw every object once — frustum culling off, hidden objects (pooled
  // effects, projectiles, pickups waiting for their first use) temporarily shown — into a tiny
  // viewport while the loading screen still covers the canvas. Buffer/texture uploads, shader
  // compiles and GPU pipeline creation for the active render target then happen here rather than
  // as hitches the first time something comes into view or the first explosion goes off.
  const _culled = [], _hidden = [];
  const _vp = new THREE.Vector4();
  function warmScene(scene, cam) {
    _culled.length = 0; _hidden.length = 0;
    // shadow casters first (culling flags are still the real ones), hidden pooled objects included
    if (SH.on && scene === R.scene) tagCasters(scene, true);
    scene.traverse(o => {
      // (Lights stay as they are: a different light count would compile other program variants.)
      if (!o.visible && !o.isLight) { o.visible = true; _hidden.push(o); }
      if (o.frustumCulled && (o.isMesh || o.isPoints || o.isLine || o.isSprite)) { o.frustumCulled = false; _culled.push(o); }
    });
    const r = R.renderer;
    try {
      // the sun-shadow pass first (its depth-only pipeline for every caster; same programs as the main pass)
      if (SH.on && scene === R.scene) warmShadows(scene);
      if (R.postOn && R.post.warm) R.post.warm(scene, cam);
      else {
        r.setRenderTarget(null);
        r.getViewport(_vp);
        r.setViewport(0, 0, 8, 8);
        try { r.render(scene, cam); } finally { r.setViewport(_vp.x, _vp.y, _vp.z, _vp.w); }
      }
    } finally {
      for (let i = 0; i < _culled.length; i++) _culled[i].frustumCulled = true;
      for (let i = 0; i < _hidden.length; i++) _hidden[i].visible = false;
      _culled.length = 0; _hidden.length = 0;
    }
  }
  // Common built-in material variants that modes and effects create *after* a load (character
  // shadow/glow batches, sprites, spawned enemies' plain meshes). Programs are shared by their
  // parameters, so drawing one object of each variant inside the mode's scene (its fog type)
  // compiles exactly what those late objects will use. Built once, borrowed by every warm-up.
  let zoo = null;
  function warmZoo() {
    if (zoo) return zoo;
    zoo = new THREE.Group();
    zoo.name = 'warmZoo';
    const geo = new THREE.PlaneGeometry(1, 1), tex = R.glowTex();
    const mk = (o) => { o.frustumCulled = false; zoo.add(o); return o; };
    const basic = o => new THREE.MeshBasicMaterial(o);
    const inst = (mat, colors) => { const m = new THREE.InstancedMesh(geo, mat, 1); m.setMatrixAt(0, new THREE.Matrix4()); if (colors) m.setColorAt(0, new THREE.Color(1, 1, 1)); return m; };
    mk(new THREE.Mesh(geo, basic({ color: 0xffffff })));
    mk(new THREE.Mesh(geo, basic({ map: tex, transparent: true, depthWrite: false })));
    mk(new THREE.Mesh(geo, basic({ map: tex, transparent: true, depthWrite: false, fog: false })));
    mk(new THREE.Mesh(geo, basic({ map: tex, transparent: true, side: THREE.DoubleSide })));
    mk(new THREE.Mesh(geo, basic({ vertexColors: true })));
    mk(inst(basic({ map: tex, transparent: true, depthWrite: false }), true));
    mk(inst(basic({ map: tex, transparent: true, depthWrite: false, fog: false }), true));
    mk(inst(basic({ map: tex, transparent: true, depthWrite: false }), false));
    mk(inst(basic({ map: tex, transparent: true, depthWrite: false, fog: false }), false));
    mk(inst(basic({ color: 0xffffff }), true));
    mk(new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })));
    mk(new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false })));
    zoo.traverse(o => { if (o.material) o.material.userData.shared = true; });
    geo.userData.shared = true;
    return zoo;
  }
  R.warmup = function (scene) {
    if (R.isLost() || !R.renderer) return;
    if (scene) {
      const z = warmZoo();
      scene.add(z);
      try { warmScene(scene, R.camera); } finally { scene.remove(z); }
    }
    if (R.vmRoot.children.length) warmScene(R.vmScene, R.vmCamera);
    R.renderer.info.reset();
  };

  // ---------- Materials ----------
  const M = G.M = {};
  const cache = new Map();
  const MARGS = new WeakMap();   // cached material -> the args it was made from (M.inst)
  // Tier-dependent soft-toon shader features as currently compiled into the materials (see syncToon).
  const TOON_FEAT = { SUN_SHADOW: false, SURF_DETAIL: false };
  // Global light state shared (by reference) by every soft-toon material.
  const L = R.light = {
    uSunDir: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() },
    uSunCol: { value: new THREE.Color(0xfff4dc) },
    uSky: { value: new THREE.Color(0xeaf6ff) },
    uGround: { value: new THREE.Color(0xe6c9a0) },
    uShadow: { value: new THREE.Color(0x6e78c8) },
    uShadowK: { value: 0.5 },
    uExposure: { value: 1.0 },
    uRimCol: { value: new THREE.Color(0xfff6d8) },
    uTime: { value: 0 },      // shared clock (scaled game time) for wind sway; set once per frame in R.render
    uWindK: { value: 1 },     // global sway multiplier (reduced motion calms foliage)
    // Sun shadows (Ultra; programs carry them only with the SUN_SHADOW define, see syncToon):
    uSunMap: { value: null },                         // depth map (null: three binds its empty shadow texture)
    uSunMat: { value: new THREE.Matrix4() },          // world -> [0,1] shadow-map uv + depth
    uSunP: { value: new THREE.Vector4(0.03, 0.0005, 1 / 2048, 0) }, // texel size (m), depth bias, texel (uv)
    uSunOn: { value: 0 },                             // shadow strength; non-zero only during the main scene pass
    uShadowPass: { value: 0 },                        // 1 while the shadow map renders: toon programs write depth only
    // Surface grain (Ultra; SURF_DETAIL define on opaque vertex-coloured props): tiling RGB noise, x tile
    // frequency (1/m), y fine-grain amount, z soft-mottle amount.
    uSurfTex: { value: null },
    uSurfK: { value: new THREE.Vector3(0.55, 0.05, 0.06) },
  };
  // preset: {sunDir:V3, sun, sky, ground, shadow, shadowK, exposure, rim, grade?}
  R.setLighting = function (p) {
    p = p || {};
    if (p.sunDir) L.uSunDir.value.copy(p.sunDir).normalize();
    L.uSunCol.value.setHex(p.sun != null ? p.sun : 0xfff4dc);
    L.uSky.value.setHex(p.sky != null ? p.sky : 0xeaf6ff);
    L.uGround.value.setHex(p.ground != null ? p.ground : 0xe6c9a0);
    L.uShadow.value.setHex(p.shadow != null ? p.shadow : 0x6e78c8);
    L.uShadowK.value = p.shadowK != null ? p.shadowK : 0.5;
    L.uExposure.value = p.exposure != null ? p.exposure : 1.0;
    L.uRimCol.value.setHex(p.rim != null ? p.rim : 0xfff6d8);
    // Optional colour-grade overrides for the post composite (04b_post), e.g.
    // grade: {sat, contrast, vignette, bloom, tint: 0xffe0c0, tintK: 0.06}. Without it the
    // composite derives its split-tone from the sun (highlights) and shadow (shade) colours.
    R.grade = p.grade || null;
  };
  // WIND (opts.wind > 0): foliage sway. The weight is the height above the object's origin (or the
  // instance's origin for InstancedMesh) in world units, so bases stay planted and tips move; a mesh
  // merged in world space sways by absolute height. Phase travels across the world so a field of
  // grass ripples in waves rather than moving in lockstep. Normals are left as-is (small offsets).
  const TOON_VS = [
    '#include <common>', '#include <color_pars_vertex>', '#include <fog_pars_vertex>',
    'varying vec3 vWN; varying vec3 vWP; varying vec3 vVN; varying vec3 vVP;',
    '#ifdef WIND',
    '  uniform float uTime; uniform float uWind; uniform float uWindK;',
    '#endif',
    '#ifdef SURF_DETAIL',
    '  varying vec3 vOP; varying vec3 vON;',
    '#endif',
    'void main(){',
    '  #include <color_vertex>',
    '  vec3 objectNormal = normal; vec4 lp = vec4(position, 1.0);',
    '  vec4 origin = vec4(0.0, 0.0, 0.0, 1.0);',
    '  #ifdef USE_INSTANCING',
    '    lp = instanceMatrix * lp; objectNormal = mat3(instanceMatrix) * objectNormal; origin = instanceMatrix[3];',
    '  #endif',
    '  vec4 wp = modelMatrix * lp;',
    '  #ifdef SURF_DETAIL',
    '    vOP = lp.xyz; vON = objectNormal;', // mesh space: the grain stays put on moving props
    '  #endif',
    '  #ifdef WIND',
    '    vec3 base = (modelMatrix * origin).xyz;',
    '    float wh = clamp(wp.y - base.y, 0.0, 6.0);',
    '    float ph = uTime * 1.55 - dot(base.xz, vec2(0.21, 0.16)) + (wp.x + wp.z) * 0.15;',
    '    float gust = 0.65 + 0.35 * sin(uTime * 0.37 - base.x * 0.031 + base.z * 0.017);',
    '    float sway = (sin(ph) * 0.7 + sin(ph * 2.31 + 1.7) * 0.3) * gust;',
    '    float amt = uWind * uWindK * wh * (0.16 + 0.04 * wh) / (1.0 + 0.12 * wh * wh);',
    '    wp.xz += vec2(0.83, 0.56) * (sway * amt) + vec2(-0.56, 0.83) * (sin(ph * 1.37 + 0.9) * amt * 0.25);',
    '    wp.y -= abs(sway) * amt * amt * 0.5 / max(wh, 0.2);',
    '  #endif',
    '  vWP = wp.xyz;',
    '  vWN = normalize(mat3(modelMatrix) * objectNormal);',
    '  vec4 mvPosition = viewMatrix * wp; vVP = -mvPosition.xyz;',
    '  vVN = normalize(mat3(viewMatrix) * vWN);',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'].join('\n');
  // House soft-toon lighting (shared by every mode):
  //   ramp      soft two-tone band + 30% of the wrapped gradient so forms read inside each tone
  //   terminator the light/shadow boundary picks up a saturated, sun-hued tint (soft subsurface
  //              feel; turns cool under a bluish night sun), shadows keep the preset's cool tint
  //   ambient   sky/ground hemisphere plus sun light bounced off the ground into down-facing shade
  //   rim       fresnel rim, stronger when looking toward the sun (back-lit silhouettes glow)
  //   haze      fog-aware aerial perspective: distant (and low-lying) surfaces drift toward the fog
  //             colour and lose a little saturation before the regular fog takes over
  // Sun-shadow lookup, shared as a shader chunk so other house shaders (characters, the turf floor) can
  // receive too: with the uniforms of G.R.light merged in, `#include <mr_sunshadow_pars_fragment>` and, under
  // #ifdef SUN_SHADOW, `if (uShadowPass > 0.5) { gl_FragColor = vec4(1.0); return; }` first in main() and
  // `lit *= mix(1.0, sunVis(vWP, n, ndl), uSunOn)` on the light term (TOON_FS below also keeps the chroma of the
  // cast part; note `cast` is a reserved word in GLSL ES 3.0 — never name a variable that); create the material with
  // `defines: G.R.toonDefines()` and userData.tierDefs = true so syncToon keeps its define in line with the
  // tier. Opaque userData.toon meshes also cast (unless the mesh has userData.noShadow).
  CH.mr_sunshadow_pars_fragment = [
    '#ifdef SUN_SHADOW',
    '  uniform highp sampler2DShadow uSunMap; uniform mat4 uSunMat; uniform vec4 uSunP; uniform float uSunOn, uShadowPass;',
    '  float sunVis(vec3 p, vec3 n, float ndl){',
    '    vec4 c = uSunMat * vec4(p + n * (uSunP.x * (0.8 + 2.2 * (1.0 - clamp(ndl, 0.0, 1.0)))), 1.0);',
    '    vec2 e = abs(c.xy - 0.5); float edge = max(e.x, e.y);',
    '    if (edge > 0.5 || c.z > 1.0) return 1.0;',
    '    float z = c.z - uSunP.y; vec2 t = vec2(uSunP.z, 0.0), u = vec2(uSunP.z, -uSunP.z);',
    '    float s = texture(uSunMap, vec3(c.xy, z));',
    '    s += texture(uSunMap, vec3(c.xy + t.xy, z)) + texture(uSunMap, vec3(c.xy - t.xy, z)) + texture(uSunMap, vec3(c.xy + t.yx, z)) + texture(uSunMap, vec3(c.xy - t.yx, z));',
    '    s += texture(uSunMap, vec3(c.xy + t.xx, z)) + texture(uSunMap, vec3(c.xy - t.xx, z)) + texture(uSunMap, vec3(c.xy + u, z)) + texture(uSunMap, vec3(c.xy - u, z));',
    '    return mix(s / 9.0, 1.0, smoothstep(0.4, 0.5, edge));',
    '  }',
    '#endif'].join('\n');
  //   sun shadow (SUN_SHADOW, Ultra) a shadowed texel lowers the light term itself, so a cast shadow takes the
  //              same cool toon shade as a form turned away from the sun — never black — and the rim/spec
  //              follow; the cast part keeps its chroma (softer tint + re-saturation), so sand, wood and
  //              peach walls stay colourful in the shade instead of turning grey. 3x3 hardware-PCF taps
  //              (4x4 texel footprint), normal-offset lookup, faded at the rim of the shadow box.
  //   surface grain (SURF_DETAIL, Ultra) faint triplanar grain + mottling on opaque vertex-coloured props
  //              (mesh space), fading out with distance: toy plastic / painted wood rather than flat fill.
  const TOON_FS = [
    'uniform vec3 uColor, uEmissive, uSunDir, uSunCol, uSky, uGround, uShadow, uRimCol;',
    'uniform float uShadowK, uExposure, uRim, uRimPow, uOpacity, uSpec, uBand;',
    '#include <common>', '#include <color_pars_fragment>', '#include <fog_pars_fragment>',
    'varying vec3 vWN; varying vec3 vWP; varying vec3 vVN; varying vec3 vVP;',
    '#include <mr_sunshadow_pars_fragment>',
    '#if defined( SURF_DETAIL ) && !defined( TERRAIN_DETAIL ) && !defined( FOL_FADE )',
    '  #define SURF_GRAIN',
    '  uniform sampler2D uSurfTex; uniform vec3 uSurfK; varying vec3 vOP; varying vec3 vON;',
    '#endif',
    'void main(){',
    '  #ifdef SUN_SHADOW',
    '    if (uShadowPass > 0.5) { gl_FragColor = vec4(1.0); return; }',
    '  #endif',
    '  vec3 albedo = uColor;',
    '  #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )',
    '    albedo *= vColor.rgb;',
    '  #endif',
    '  #ifdef FLAT',
    '    vec3 n = normalize(cross(dFdx(vWP), dFdy(vWP)));',
    '  #else',
    '    vec3 n = normalize(vWN) * (gl_FrontFacing ? 1.0 : -1.0);',
    '  #endif',
    '  #ifdef SURF_GRAIN',
    '  {',
    '    vec3 an = abs(normalize(vON)); an *= an; an *= an; an /= an.x + an.y + an.z;',
    '    vec3 sp = vOP * uSurfK.x;',
    '    vec3 tg = texture2D(uSurfTex, sp.zy).rgb * an.x + texture2D(uSurfTex, sp.xz + 0.37).rgb * an.y + texture2D(uSurfTex, sp.xy + 0.71).rgb * an.z;',
    '    float sfade = 1.0 - smoothstep(12.0, 38.0, length(vVP));',
    '    albedo *= 1.0 + (tg.r - 0.5) * uSurfK.y * sfade + (tg.g - 0.5) * uSurfK.z * (0.4 + 0.6 * sfade);',
    '  }',
    '  #endif',
    '  vec3 vdir = normalize(cameraPosition - vWP);',
    '  float ndl = dot(n, uSunDir);',
    '  float d = clamp((ndl + 0.4) / 1.4, 0.0, 1.0);',
    '  float band = smoothstep(0.42 - uBand, 0.42 + uBand, d);',
    '  float lit = mix(band, d, 0.3);',
    '  vec3 shadeMul = mix(vec3(1.0), uShadow, uShadowK);',
    '  #ifdef SUN_SHADOW',
    '    float shCast = 0.0;',
    '    if (uSunOn > 0.0 && d > 0.12) { float sv = mix(1.0, sunVis(vWP, n, ndl), uSunOn * smoothstep(0.12, 0.3, d)); shCast = lit * (1.0 - sv); lit *= sv; band *= sv; }',
    // cast shade keeps the toy colours: the cool multiply alone greys warm albedos (sand, peach, wood), so where a
    // cast shadow took the light the shade tint is softened a little and the colour re-saturated below
    '    shadeMul = mix(shadeMul, vec3(dot(shadeMul, vec3(0.3333))), 0.35 * shCast);',
    '  #endif',
    '  vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5);',
    '  vec3 sunLit = mix(shadeMul, uSunCol, lit);',
    '  vec3 col = albedo * amb * sunLit;',
    '  float down = clamp(0.2 - n.y * 0.8, 0.0, 1.0);',
    '  col += albedo * uGround * uSunCol * (down * (1.0 - lit) * 0.16);',
    '  float term = 1.0 - clamp(abs(d - 0.42) / (uBand + 0.14), 0.0, 1.0); term *= term * (3.0 - 2.0 * term);',
    '  vec3 sunHue = uSunCol / max(max(uSunCol.r, uSunCol.g), max(uSunCol.b, 1e-3));',
    '  vec3 tint = 1.0 + (sunHue - dot(sunHue, vec3(0.3333))) * 0.9;',
    '  vec3 vivid = max(mix(vec3(dot(albedo, vec3(0.299, 0.587, 0.114))), albedo, 1.3), 0.0);',
    '  col = mix(col, vivid * amb * sunLit * tint, term * 0.4);',
    '  #ifdef SUN_SHADOW',
    '    if (shCast > 0.0) { float cl = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(col, max(mix(vec3(cl), col, 1.5), 0.0), shCast); }',
    '  #endif',
    '  col *= uExposure;',
    '  float back = clamp(0.5 - dot(vdir, uSunDir) * 0.5, 0.0, 1.0);',
    '  float rim = pow(1.0 - max(dot(n, vdir), 0.0), uRimPow) * uRim * (0.85 + 0.45 * back * back);',
    '  col += uRimCol * rim * mix(0.35 + 0.65 * lit, 1.0, back * back * 0.6);',
    '  if (uSpec > 0.0) { vec3 h = normalize(uSunDir + vdir); float sp = smoothstep(0.90, 0.95, pow(max(dot(n, h), 0.0), 40.0)); col += mix(vec3(1.0), uSunCol, 0.35) * (sp * uSpec * (0.45 + 0.55 * band)); }',
    '  #if defined( USE_FOG ) && !defined( FOG_EXP2 )',
    '    float aer = smoothstep(fogNear * 0.25, fogFar, vFogDepth) * (0.6 + 0.4 * exp(-max(vWP.y, 0.0) * 0.03));',
    '    float cl = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '    col = mix(col, mix(vec3(cl), col, 0.7) * 0.65 + fogColor * 0.35, aer * 0.3);',
    '  #endif',
    '  col += uEmissive;',
    '  gl_FragColor = vec4(col, uOpacity);',
    '  #include <colorspace_fragment>',
    '  #include <fog_fragment>',
    '}'].join('\n');
  // Soft-toon materials share the light uniforms of R.light by reference. A plain ShaderMaterial clone deep-copies
  // them (cloneUniforms): the copy would keep its own frozen uSunOn / uShadowPass and a private copy of the sun
  // shadow depth texture, which three then uploads as a second full-size depth texture (16-64 MB per copy; e.g.
  // 23_race's fog-free planet copies). Copies made with material.clone() keep every uniform the source shares.
  class ToonMaterial extends THREE.ShaderMaterial {
    copy(src) {
      super.copy(src);
      if (src.uniforms) for (const k in L) if (src.uniforms[k] === L[k]) this.uniforms[k] = L[k];
      return this;
    }
  }
  // Soft toon material. opts: {emissive, ei, rim(false|strength), rimStr, rimPow, vc, transparent, opacity, side, flat, spec, band, wind}
  M.toon = function (color, opts) {
    opts = opts || {};
    const key = 'toon|' + color + '|' + JSON.stringify(opts);
    if (cache.has(key)) return cache.get(key);
    const em = new THREE.Color(opts.emissive != null ? opts.emissive : 0x000000).multiplyScalar(opts.emissive != null ? (opts.ei != null ? opts.ei : 1) : 0);
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(uniforms, L, {
      uColor: { value: new THREE.Color(opts.vc ? 0xffffff : color) },
      uEmissive: { value: em },
      uRim: { value: opts.rim === false ? 0 : (opts.rimStr != null ? opts.rimStr : 0.32) },
      uRimPow: { value: opts.rimPow != null ? opts.rimPow : 3.0 },
      uOpacity: { value: opts.opacity != null ? opts.opacity : 1 },
      uSpec: { value: opts.spec || 0 },
      uBand: { value: opts.band != null ? opts.band : 0.1 },
      uWind: { value: opts.wind > 0 ? +opts.wind : 0 },
    });
    if (opts.rimColor != null) uniforms.uRimCol = { value: new THREE.Color(opts.rimColor) };
    const defines = {};
    if (opts.flat) defines.FLAT = '';
    if (opts.wind > 0) defines.WIND = '';
    // tier features as currently compiled (syncToon keeps every toon material in line on tier changes)
    if (TOON_FEAT.SUN_SHADOW) defines.SUN_SHADOW = '';
    if (TOON_FEAT.SURF_DETAIL && opts.vc && !opts.transparent) defines.SURF_DETAIL = '';
    const mat = new ToonMaterial({
      uniforms, vertexShader: TOON_VS, fragmentShader: TOON_FS,
      vertexColors: !!opts.vc, fog: true, lights: false,
      transparent: !!opts.transparent, side: opts.side || THREE.FrontSide,
      depthWrite: opts.transparent ? opts.depthWrite === true : true,
      defines,
      extensions: { derivatives: !!opts.flat },
    });
    mat.userData.toon = true;
    MARGS.set(mat, { color, opts: Object.assign({}, opts) });   // (M.inst builds the instanced twin from these)
    // Convenience accessors so callers can tweak like a standard material.
    Object.defineProperty(mat, 'color', { get: () => uniforms.uColor.value });
    Object.defineProperty(mat, 'emissive', { get: () => uniforms.uEmissive.value });
    Object.defineProperty(mat, 'opacityU', { get: () => uniforms.uOpacity.value, set: v => { uniforms.uOpacity.value = v; } });
    cache.set(key, mat);
    return mat;
  };
  // Uncached copy (for per-object flashing / fading).
  M.toonUnique = function (color, opts) {
    const base = M.toon(color, opts);
    const m = base.clone();   // ShaderMaterial.clone already deep-copies the uniforms (and the defines)
    for (const k in L) m.uniforms[k] = L[k];
    if (opts && opts.rimColor != null) m.uniforms.uRimCol = { value: new THREE.Color(opts.rimColor) };
    const u = m.uniforms;
    Object.defineProperty(m, 'color', { get: () => u.uColor.value });
    Object.defineProperty(m, 'emissive', { get: () => u.uEmissive.value });
    Object.defineProperty(m, 'opacityU', { get: () => u.uOpacity.value, set: v => { u.uOpacity.value = v; } });
    m.userData.toon = true;
    return m;
  };
  M.vc = function (opts) { return M.toon(0xffffff, Object.assign({ vc: true }, opts || {})); };
  M.basic = function (color, opts) {
    opts = opts || {};
    const key = 'basic|' + color + '|' + JSON.stringify(opts);
    if (cache.has(key)) return cache.get(key);
    const mat = new THREE.MeshBasicMaterial(Object.assign({ color }, opts));
    // Additive double-sided glow (beams, light shafts): three draws a transparent double-sided material in two passes
    // (back faces, then front) and flags a program change for each pass. Additive blending doesn't depend on draw
    // order (and these don't write depth), so one pass looks the same: half the draw calls, no per-frame program
    // re-evaluation.
    if (opts.transparent && opts.blending === THREE.AdditiveBlending && opts.side === THREE.DoubleSide && opts.depthWrite === false && opts.forceSinglePass == null) mat.forceSinglePass = true;
    MARGS.set(mat, { color, opts: Object.assign({}, opts), basic: true });
    cache.set(key, mat); return mat;
  };
  // Instanced twin of a cached house material (M.toon / M.vc / M.basic). three.js re-evaluates a material's program
  // (getParameters, ~25 KB of garbage, and a full uniform upload) each time it is drawn by an InstancedMesh right after a
  // plain Mesh or the other way round — and between instanced meshes with and without instanceColor — so one cached
  // material shared by merged props and instanced scatter flipped 2-8 times a frame. Instanced meshes take this cached
  // copy instead: same program parameters (no extra shader), its own program state. Other materials pass through.
  M.inst = function (mat, colored) {
    // (a side table, not userData: Material.copy JSON-copies userData, and clones must stay their own material)
    const a = mat && MARGS.get(mat);
    if (!a || a.twin) return mat;
    const k = colored ? 2 : 1;
    let tw;
    if (!a.basic) tw = M.toon(a.color, Object.assign({}, a.opts, { inst: k }));
    else {
      const key = 'basic|' + a.color + '|' + JSON.stringify(a.opts) + '|inst' + k;
      tw = cache.get(key);
      if (!tw) { tw = new THREE.MeshBasicMaterial(Object.assign({ color: a.color }, a.opts)); tw.forceSinglePass = mat.forceSinglePass; cache.set(key, tw); MARGS.set(tw, { twin: true }); }
    }
    const ta = MARGS.get(tw);
    if (ta && !ta.twin) ta.twin = true;
    // flags callers set on the shared material after creating it (e.g. Geo.metalMat's userData.metal)
    for (const f in mat.userData) if (!(f in tw.userData)) tw.userData[f] = mat.userData[f];
    return tw;
  };
  M.glowMat = function (color, opacity) {
    const key = 'glow|' + color + '|' + opacity;
    if (cache.has(key)) return cache.get(key);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity != null ? opacity : 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    cache.set(key, mat); return mat;
  };
  M.spriteGlow = function (color, opacity) {
    const key = 'sglow|' + color + '|' + opacity;
    if (cache.has(key)) return cache.get(key);
    const mat = new THREE.SpriteMaterial({ map: R.glowTex(), color, transparent: true, opacity: opacity != null ? opacity : 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    cache.set(key, mat); return mat;
  };

  // ---------- Tier features in the soft-toon shaders ----------
  // SUN_SHADOW / SURF_DETAIL are compile-time defines, so lower tiers run exactly the programs they always
  // had. syncToon() brings every toon material (the cache, plus whatever the current scene and viewmodel
  // use: toonUnique clones, terrain/foliage variants, character materials) in line with the tier. It runs
  // at each mode load (setScene: before compile + warm-up) and after a settings change (followed by a
  // warm-up); an automatic tier drop mid-game leaves the variants as they are (the shadow pass just stops)
  // until the next load. Returns true when any program has to change.
  R.toonFeatures = function () {
    const q = R.q();
    return { sun: !!(q.shadows && SH.supported && !R._shadowBroken), surf: !!q.surf };
  };
  // The tier defines as currently compiled, for house shaders built outside G.M (merge into `defines` at
  // creation and set material.userData.tierDefs = true, so syncToon keeps them in line too). Materials
  // with userData.charMat are only synced when they opt in that way: a character material created
  // mid-game without the defines must find the program the warm-up compiled.
  R.toonDefines = function () { const d = {}; if (TOON_FEAT.SUN_SHADOW) d.SUN_SHADOW = ''; return d; };
  // The tier uniforms the SUN_SHADOW / SURF_DETAIL programs read are always the shared ones (a material copied or
  // built by hand could otherwise bind a stale copy of the shadow map, or none: a sampler/format mismatch).
  const TIER_U = ['uSunMap', 'uSunMat', 'uSunP', 'uSunOn', 'uShadowPass', 'uSurfTex', 'uSurfK'];
  function applyDefs(m) {
    if (m.userData.charMat && !m.userData.tierDefs) return false;
    const u = m.uniforms;
    if (u) for (let i = 0; i < TIER_U.length; i++) { const k = TIER_U[i]; if (u[k] !== L[k]) u[k] = L[k]; }
    const d = m.defines || (m.defines = {});
    const sun = TOON_FEAT.SUN_SHADOW;
    const surf = TOON_FEAT.SURF_DETAIL && !!m.vertexColors && !m.transparent && m.fog !== false && !m.userData.charMat;
    let ch = false;
    if (sun !== ('SUN_SHADOW' in d)) { if (sun) d.SUN_SHADOW = ''; else delete d.SUN_SHADOW; ch = true; }
    if (surf !== ('SURF_DETAIL' in d)) { if (surf) d.SURF_DETAIL = ''; else delete d.SURF_DETAIL; ch = true; }
    if (ch) m.needsUpdate = true;
    return ch;
  }
  function syncToon() {
    const f = R.toonFeatures();
    TOON_FEAT.SUN_SHADOW = f.sun; TOON_FEAT.SURF_DETAIL = f.surf;
    if (f.sun) SH.sunEver = true;
    let changed = false;
    const seen = new Set();
    const visit = m => {
      if (!m || seen.has(m)) return;
      seen.add(m);
      if (m.isShaderMaterial && m.userData && m.userData.toon && applyDefs(m)) changed = true;
    };
    for (const m of cache.values()) visit(m);
    const walk = o => { const mm = o.material; if (Array.isArray(mm)) mm.forEach(visit); else visit(mm); };
    if (R.scene) R.scene.traverse(walk);
    if (R.vmScene) R.vmScene.traverse(walk);
    if (f.surf && !L.uSurfTex.value) L.uSurfTex.value = R.surfTex();
    if (f.sun && !L.uSunMap.value && R.renderer && !R.isLost()) L.uSunMap.value = mapOrDummy();
    return changed;
  }
  R.syncToon = syncToon;

  // ---------- Sun shadows (Ultra) ----------
  // One directional shadow map that follows the camera: the box sits a little ahead of the view, its
  // origin snapped to whole shadow texels in light space (and the box never rotates with the camera), so
  // shadow edges stay perfectly still while walking and turning — no shimmer. Depth only: casters render
  // with their own materials (skinning, instancing, wind and foliage fades all match the main pass) into a
  // depth texture, colour writes locked off, and the house toon programs exit right after the vertex stage
  // (uShadowPass). Casters are tagged with a layer: opaque soft-toon meshes (characters, robots, props,
  // buildings, trees) that frustum-cull; terrain, foliage fields, fog-free decor (clouds, far mountains)
  // and transparent things never cast. The ortho box itself is the caster distance limit (frustum culling
  // in the shadow pass). Receivers: everything drawn with the toon shader (terrain, buildings, props,
  // foliage). Characters (15b charMat) cast; they receive once their shader reads SUN_SHADOW too.
  const SHADOW_LAYER = 29, SHADOW_BIT = 1 << SHADOW_LAYER;
  const SH = R.shadow = {
    supported: false, on: false, size: 0, range: 30, up: 110, down: 50, k: 0.8, rt: null, fresh: false,
    cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), tagN: 0, casters: 0, center: new THREE.Vector3(),
  };
  SH.cam.matrixAutoUpdate = false; SH.cam.matrixWorldAutoUpdate = false;
  SH.cam.layers.set(SHADOW_LAYER);
  // A real (allocated) 1x1 compare-mode depth texture for SUN_SHADOW programs whenever the map itself is not
  // bindable: during the shadow pass (it is the depth attachment then) and after shadows were switched off
  // while the variants stay compiled. (An unallocated texture would leave the unit on GL's default RGBA
  // texture: a format/sampler mismatch that WebGL rejects at every draw.)
  let DUMMY = null;
  function dummyShadow() {
    if (DUMMY) return DUMMY.depthTexture;
    const dt = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    dt.format = THREE.DepthFormat; dt.compareFunction = THREE.LessEqualCompare;
    DUMMY = new THREE.WebGLRenderTarget(1, 1, { format: THREE.RedFormat, depthBuffer: true, stencilBuffer: false, depthTexture: dt, generateMipmaps: false });
    const r = R.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(DUMMY); r.clear(false, true, false); r.setRenderTarget(prev);
    return dt;
  }
  const mapOrDummy = () => (SH.rt ? SH.rt.depthTexture : SH.supported && R.renderer ? dummyShadow() : null);
  let _weak = null;
  function weakGpu() {
    if (_weak !== null) return _weak;
    let s = '';
    try { const gl = R._gl, ext = gl.getExtension('WEBGL_debug_renderer_info'); s = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || ''); } catch (e) { s = ''; }
    SH.gpu = s;
    return (_weak = /Intel|SwiftShader|llvmpipe|Software|Mali|Adreno|PowerVR|Microsoft Basic/i.test(s));
  }
  // context lost: every GL object is gone (the GPU timer query and its extension object too)
  function shadowLost() { SH.rt = null; SH.on = false; DUMMY = null; L.uSunMap.value = null; GT.q = null; GT.busy = false; GT.ext = undefined; }
  // (the 1x1 stand-in once SUN_SHADOW programs existed this session — a material kept outside the scene during a
  // tier change may still carry the define — so a session that never ran Ultra never allocates anything)
  function disposeShadows() { if (SH.rt) SH.rt.dispose(); SH.rt = null; SH.on = false; SH.casters = 0; L.uSunMap.value = (TOON_FEAT.SUN_SHADOW || SH.sunEver) && SH.supported && R.renderer && !R.isLost() ? dummyShadow() : null; }
  function setupShadows(q) {
    const r = R.renderer, caps = r.capabilities;
    SH.supported = !!caps.isWebGL2;
    const want = !!(q.shadows && SH.supported && !R._shadowBroken);
    if (!want) { disposeShadows(); blobFade(); return; }
    // discrete / Apple desktop GPUs: 4096 texels over a wide box; integrated or software renderers and touch
    // devices (tablets, phones on manual Ultra): 2048 (a quarter of the memory and fill)
    const big = desktopClass() && caps.maxTextureSize >= 4096 && !weakGpu();
    const size = big ? 4096 : 2048;
    SH.range = big ? 44 : desktopClass() ? 32 : 30;
    if (!SH.rt || SH.size !== size) {
      disposeShadows();
      const dt = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
      dt.format = THREE.DepthFormat;
      dt.compareFunction = THREE.LessEqualCompare;
      dt.minFilter = dt.magFilter = THREE.LinearFilter;
      const rt = new THREE.WebGLRenderTarget(size, size, { format: THREE.RedFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false, depthTexture: dt, generateMipmaps: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      rt.texture.name = 'sunShadowColor'; dt.name = 'sunShadow';
      // allocate now and check the framebuffer (a failure turns shadows off for the session)
      r.setRenderTarget(rt);
      const gl = r.getContext(), ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      r.setRenderTarget(null);
      if (!ok) { rt.dispose(); R._shadowBroken = true; console.warn('[render] sun shadows unavailable (framebuffer incomplete)'); blobFade(); return; }
      SH.rt = rt; SH.size = size;
    }
    const texel = 2 * SH.range / SH.size;
    L.uSunP.value.set(texel, 0.00045, 1 / SH.size, 0);
    L.uSunMap.value = SH.rt.depthTexture;
    SH.on = true; SH.tagN = 99;
    blobFade();
  }
  // Blob shadows stay for the lower tiers; with real shadows they keep only a faint contact darkening.
  function blobFade() { if (M._blobMat) M._blobMat.opacity = SH.on ? 0.32 : 1; }
  const _sx = new THREE.Vector3(), _sy = new THREE.Vector3(), _sz = new THREE.Vector3(), _sf = new THREE.Vector3(), _sp = new THREE.Vector3();
  const _sm = new THREE.Matrix4();
  const SH_BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  function fitShadow(cam) {
    const sd = L.uSunDir.value, rg = SH.range, c = SH.cam;
    _sz.copy(sd).normalize();
    _sx.set(0, 1, 0).cross(_sz);
    if (_sx.lengthSq() < 1e-6) _sx.set(1, 0, 0);
    _sx.normalize(); _sy.crossVectors(_sz, _sx);
    // centre: ahead of the camera on the horizontal plane, a little below the eye
    const ce = cam.matrixWorld.elements;
    _sf.set(-ce[8], 0, -ce[10]);
    if (_sf.lengthSq() < 1e-6) _sf.set(0, 0, -1);
    _sf.normalize();
    _sp.setFromMatrixPosition(cam.matrixWorld).addScaledVector(_sf, rg * 0.42); _sp.y -= 1.5;
    const tx = 2 * rg / SH.size;
    const lx = Math.round(_sp.dot(_sx) / tx) * tx, ly = Math.round(_sp.dot(_sy) / tx) * tx, lz = _sp.dot(_sz);
    SH.center.set(0, 0, 0).addScaledVector(_sx, lx).addScaledVector(_sy, ly).addScaledVector(_sz, lz);
    _sm.makeBasis(_sx, _sy, _sz).setPosition(SH.center);
    c.matrixWorld.copy(_sm); c.matrixWorldInverse.copy(_sm).invert();
    if (c.right !== rg || c.near !== -SH.up || c.far !== SH.down) {
      c.left = -rg; c.right = rg; c.top = rg; c.bottom = -rg; c.near = -SH.up; c.far = SH.down;
      c.updateProjectionMatrix();
    }
    L.uSunMat.value.multiplyMatrices(SH_BIAS, c.projectionMatrix).multiply(c.matrixWorldInverse);
  }
  let _tagAll = false;   // warm-up: hidden (pooled) objects count too
  function isCaster(o) {
    if (!o.isMesh || !o.frustumCulled || (!o.visible && !_tagAll)) return false;
    // only what the main camera draws (an object moved to another layer to hide it must not cast either)
    if ((o.layers.mask & ~SHADOW_BIT & R.camera.layers.mask) === 0) return false;
    const ud = o.userData;
    if (ud.terrain || ud.noShadow) return false;
    const m = o.material;
    if (!m || Array.isArray(m) || !m.userData.toon || m.transparent || m.depthWrite === false || m.colorWrite === false || m.fog === false || m.visible === false) return false;
    const d = m.defines;
    if (d && (d.TERRAIN_DETAIL !== undefined || d.FOL_FADE !== undefined)) return false;
    return true;
  }
  let _casters = 0;
  // Lights are tagged too: three collects only the lights the camera's layers see, and the light counts are part
  // of every program's cache key (even for lights:false materials). A shadow pass without the scene's lights would
  // need a second program per caster material — compiled mid-game the first time a robot or prop spawned after the
  // load is drawn into the shadow map. With the same lights, both passes share one program.
  const _tag = o => {
    if (o.isLight) { if (o.layers.mask & R.camera.layers.mask) o.layers.mask |= SHADOW_BIT; return; }
    if (isCaster(o)) { o.layers.mask |= SHADOW_BIT; _casters++; } else if (o.layers.mask & SHADOW_BIT) o.layers.mask &= ~SHADOW_BIT;
  };
  // (a cheap walk; at load, and every 10 shadow frames for objects spawned or changed since)
  function tagCasters(scene, all) { _casters = 0; _tagAll = !!all; scene.traverse(_tag); _tagAll = false; SH.casters = _casters; SH.tagN = 0; }
  R.tagCasters = tagCasters;
  const noop = function () {};
  // The shadow pass renders the live scene with the shadow camera: scene hooks (foliage windows, the
  // character billboard layer) are skipped — they belong to the main camera and run in the main pass.
  function shadowDraw(scene, warm) {
    const r = R.renderer, cb = r.state.buffers.color, ob = scene.onBeforeRender;
    scene.onBeforeRender = noop;
    L.uShadowPass.value = 1;
    // the map is the depth attachment now: it must not also be bound to a sampler (WebGL rejects the draw
    // as a feedback loop even when the shader never reads it), so the programs get the 1x1 one meanwhile
    L.uSunMap.value = dummyShadow();
    cb.setMask(false); cb.setLocked(true);
    try {
      r.setRenderTarget(SH.rt);
      if (warm) SH.rt.viewport.set(0, 0, 8, 8); else SH.rt.viewport.set(0, 0, SH.size, SH.size);
      r.clear(false, true, false);
      r.render(scene, SH.cam);
    } finally {
      cb.setLocked(false); cb.setMask(true);
      L.uShadowPass.value = 0;
      L.uSunMap.value = mapOrDummy();
      scene.onBeforeRender = ob;
      SH.rt.viewport.set(0, 0, SH.size, SH.size);
      r.setRenderTarget(null);
    }
  }
  function renderShadows(scene) {
    const r = R.renderer, st = R.stats;
    try {
      const t0 = performance.now();
      if (++SH.tagN >= 10) tagCasters(scene);
      fitShadow(R.camera);
      shadowDraw(scene, false);
      SH.fresh = scene.matrixWorldAutoUpdate !== false;
      st.shadowCalls = r.info.render.calls; st.shadowTris = r.info.render.triangles;
      st.shadowMs += (performance.now() - t0 - st.shadowMs) * 0.1;
    } catch (e) {
      console.error('[render] sun shadows disabled:', e);
      R._shadowBroken = true; disposeShadows(); blobFade();
    }
  }
  function warmShadows(scene) {
    fitShadow(R.camera);
    try { shadowDraw(scene, true); } catch (e) { console.error('[render] shadow warm-up', e); }
  }

  // ---------- Textures ----------
  R.canvasTex = function (w, h, draw, opts) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (opts && opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 2;
    return t;
  };
  R.glowTex = function () {
    if (R._glow) return R._glow;
    R._glow = R.canvasTex(64, 64, (g, w, h) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.65)');
      grd.addColorStop(0.6, 'rgba(255,255,255,0.15)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    R._glow.userData.shared = true;
    return R._glow;
  };
  R.blobTex = function () {
    if (R._blob) return R._blob;
    R._blob = R.canvasTex(64, 64, (g, w, h) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(30,20,60,0.55)'); grd.addColorStop(0.6, 'rgba(30,20,60,0.3)'); grd.addColorStop(1, 'rgba(30,20,60,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    R._blob.userData.shared = true;
    return R._blob;
  };
  const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  R.blobShadow = function (radius) {
    if (!M._blobMat) { M._blobMat = new THREE.MeshBasicMaterial({ map: R.blobTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); blobFade(); }
    const m = new THREE.Mesh(blobGeo, M._blobMat);
    m.scale.set(radius * 2.2, 1, radius * 2.2);
    m.renderOrder = 1;
    return m;
  };
  R.glowSprite = function (color, size, opacity) {
    const s = new THREE.Sprite(M.spriteGlow(color, opacity));
    s.scale.set(size, size, size);
    return s;
  };

  // ---------- Tiling noise generators ----------
  // Periodic value noise / fbm (integer cell counts per tile, period doubling per octave) so textures tile
  // seamlessly. The runtime makes small versions; game/tools/bake_textures.mjs runs these very generators
  // at high resolution in headless Chromium and writes game/assets/ (public build only, optional).
  function nHash(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function nVal(x, y, P, s) {
    const xi = Math.floor(x), yi = Math.floor(y); let u = x - xi, v = y - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    const a = nHash(x0, y0, s), b = nHash(x1, y0, s), c = nHash(x0, y1, s), d = nHash(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // S x S samples, base P cells, oct octaves, amplitude gain per octave; unnormalised sum of a_i * n_i.
  // Octave periods grow by ~2.03 (rounded to whole cells, so the tile still wraps) and each octave's lattice
  // is offset: the cell grids of successive octaves never line up into visible horizontal/vertical streaks.
  function tileFbm(S, P, oct, seed, gain) {
    const out = new Float32Array(S * S), per = [], ox = [], oy = [];
    for (let o = 0; o < oct; o++) { per.push(Math.max(1, Math.round(P * Math.pow(2.03, o)))); ox.push(o * 0.37); oy.push(o * 0.61); }
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      let sum = 0, a = 0.5;
      for (let o = 0; o < oct; o++) { const p = per[o]; sum += a * nVal(i / S * p + ox[o], j / S * p + oy[o], p, seed + o * 7); a *= gain; }
      out[j * S + i] = sum;
    }
    return out;
  }
  function stats(a) { let m = 0; for (let i = 0; i < a.length; i++) m += a[i]; m /= a.length; let v = 0; for (let i = 0; i < a.length; i++) v += (a[i] - m) * (a[i] - m); return { mean: m, std: Math.sqrt(v / a.length) }; }
  // remap a field to a given mean / standard deviation (a high-res bake keeps the look of the small one)
  function remap(a, mean, std) { const s = stats(a), k = std / Math.max(1e-6, s.std); for (let i = 0; i < a.length; i++) a[i] = (a[i] - s.mean) * k + mean; return a; }
  function pack(S, chans) {
    const d = new Uint8Array(S * S * 4);
    for (let i = 0; i < S * S; i++) {
      for (let c = 0; c < 3; c++) { const f = chans[c] || chans[0]; d[i * 4 + c] = Math.max(0, Math.min(255, Math.round(f[i] * 255))); }
      d[i * 4 + 3] = 255;
    }
    return d;
  }
  R.noise = { hash: nHash, val: nVal, fbm: tileFbm, stats, remap, pack };
  // Surface grain for SURF_DETAIL: R fine grain (24..192 cells per 1.8 m tile), G soft mottling (3..12 cells).
  // Both channels are remapped to fixed statistics, so the 128² runtime version and a baked 512² one only
  // differ in crispness.
  R.genSurf = function (S) {
    const oct = Math.max(2, Math.min(4, Math.round(Math.log2(S / 32))));
    const r = remap(tileFbm(S, 24, oct, 101, 0.62), 0.5, 0.16);
    const g = remap(tileFbm(S, 3, 3, 131, 0.5), 0.5, 0.15);
    return { w: S, h: S, data: pack(S, [r, g, g]) };
  };
  // Cloud noise for the sky (R): the sky shader's 4-octave value fbm over a 16-cell tile, with octaves
  // continued down to 2 texels per cell; remapped to the 4-octave field's statistics so the cloud cover
  // and the soft cloud threshold read exactly as before — just with finer wisps and no aliasing.
  R.genCloud = function (S) {
    const oct = Math.max(4, Math.round(Math.log2(S / 32)) + 1);
    const ref = stats(tileFbm(128, 16, 4, 61, 0.5));
    const c = remap(tileFbm(S, 16, oct, 61, 0.5), ref.mean, ref.std);
    return { w: S, h: S, data: pack(S, [c]) };
  };
  function dataTex(g, opts) {
    const t = new THREE.DataTexture(g.data, g.w, g.h, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = maxAniso((opts && opts.aniso) || 4);
    t.needsUpdate = true; t.userData.shared = true;
    return t;
  }
  const maxAniso = n => { const r = R.renderer; return r && r.capabilities ? Math.min(n, r.capabilities.getMaxAnisotropy() || 1) : 1; };
  R.surfTex = function () { if (!R._surf) R._surf = dataTex(R.genSurf(128), { aniso: 8 }); return R._surf; };

  // ---------- Baked hi-res textures (public build, optional) ----------
  // The public page may carry assets/manifest.json + PNGs written by game/tools/bake_textures.mjs (the
  // generators above and 11b's terrain detail, run at higher resolution than a load-time generation could
  // afford). High and Ultra use them when present; file:// pages, the artifact and the download ZIP never
  // look (no request at all), and any failure keeps the procedural textures. Textures swap only at a mode
  // load or a settings change (applyTextures), never mid-game. window.MR_ASSETS = '<base url>' forces a
  // base (tests).
  const A = R.assets = { state: 'off', tex: {}, base: null, manifest: null, err: null, bytes: 0 };
  function assetBase() {
    if (typeof window.MR_ASSETS === 'string') return window.MR_ASSETS;
    return G.BUILD && G.BUILD.channel === 'public' ? 'assets/' : null;
  }
  A.want = function () {
    if (A.state !== 'off' || R.tierRank() < 2) return;
    const p = location.protocol, base = assetBase();
    if ((p !== 'http:' && p !== 'https:') || !base || typeof fetch !== 'function' || typeof createImageBitmap !== 'function') { A.state = 'skip'; return; }
    A.state = 'loading'; A.base = base;
    fetch(base + 'manifest.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('manifest ' + r.status))))
      .then(man => {
        if (!man || man.v !== 1 || !man.files) throw new Error('manifest format');
        A.manifest = man;
        return Promise.all(Object.keys(man.files).map(k => loadAsset(k, man.files[k])));
      })
      .then(() => { A.state = 'ready'; console.info('[render] baked textures ready (' + Object.keys(A.tex).join(', ') + ', ' + Math.round(A.bytes / 1024) + ' KB)'); G.bus.emit('assets', 'ready'); })
      .catch(e => { A.state = 'failed'; A.err = String((e && e.message) || e); for (const k in A.tex) A.tex[k].dispose(); A.tex = {}; console.info('[render] baked textures unavailable, procedural ones stay (' + A.err + ')'); });
  };
  function bitmap(blob) {
    try { return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).catch(() => createImageBitmap(blob)); } catch (e) { return createImageBitmap(blob); }
  }
  function loadAsset(key, f) {
    if (!f || typeof f.file !== 'string' || /[\\/]|^\./.test(f.file)) return Promise.reject(new Error('bad entry ' + key));
    return fetch(A.base + f.file)
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error(f.file + ' ' + r.status))))
      .then(b => { A.bytes += b.size; return bitmap(b); })
      .then(bmp => {
        if (f.w && (bmp.width !== f.w || bmp.height !== f.h)) throw new Error(f.file + ' size');
        const t = new THREE.Texture(bmp);
        t.colorSpace = THREE.NoColorSpace; t.flipY = false;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
        t.anisotropy = maxAniso(key === 'cloud' ? 4 : 8);
        t.needsUpdate = true; t.userData.shared = true; t.name = 'baked:' + key;
        A.tex[key] = t;
      });
  }
  // Tier textures: baked versions on High/Ultra when loaded, procedural otherwise; uploaded right away
  // (mode load / settings change), so no texture upload ever lands on a gameplay frame.
  function applyTextures() {
    const hi = R.tierRank() >= 2 && A.state === 'ready', r = R.renderer;
    const det = hi && A.tex.detail ? A.tex.detail : null, DU = G.Terrain && G.Terrain.detailUniform;
    // (only touched when the baked one comes or goes: the procedural texture is still made on first use)
    if (DU && G.Terrain.setDetail && (det || (DU.value && DU.value.name === 'baked:detail'))) G.Terrain.setDetail(det);
    // ground detail filtering: 16x anisotropic on Ultra (crisp at grazing angles); High keeps 4x (8x baked)
    const pd = DU && DU.value;
    if (pd) { const an = maxAniso(R.tierRank() >= 3 ? 16 : pd === det ? 8 : 4); if (pd.anisotropy !== an) { pd.anisotropy = an; pd.needsUpdate = true; } }
    if (TOON_FEAT.SURF_DETAIL) L.uSurfTex.value = (hi && A.tex.surf) || R.surfTex();
    if (r && r.initTexture) {
      if (det) r.initTexture(det);
      if (L.uSurfTex.value) r.initTexture(L.uSurfTex.value);
    }
  }
  R.applyTextures = applyTextures;
  R.cloudTex = () => (R.tierRank() >= 2 && A.state === 'ready' && A.tex.cloud) || null;

  // ---------- Sky ----------
  // opts: {top, horizon, bottom, sun, sunDir:Vector3, sunSize, clouds:bool, stars:bool, nebula:color}
  R.makeSky = function (opts) {
    opts = Object.assign({ top: 0x2fa8e8, mid: 0x5cc8f2, horizon: 0xcff3ff, bottom: 0xbde8f5, sun: 0xfffbe8, halo: 0xffe9a8, sunDir: new THREE.Vector3(0.3, 0.55, -0.75), sunSize: 0.0012, clouds: true, stars: false, nebula: 0x000000, cloudColor: 0xffffff }, opts || {});
    const q = R.q();
    const uni = {
      uTop: { value: new THREE.Color(opts.top) }, uMid: { value: new THREE.Color(opts.mid) }, uHalo: { value: new THREE.Color(opts.halo) }, uHor: { value: new THREE.Color(opts.horizon) }, uBot: { value: new THREE.Color(opts.bottom) },
      uSun: { value: new THREE.Color(opts.sun) }, uSunDir: { value: opts.sunDir.clone().normalize() }, uSunSize: { value: opts.sunSize },
      uClouds: { value: opts.clouds && q.clouds ? 1 : 0 }, uStars: { value: opts.stars ? 1 : 0 }, uNeb: { value: new THREE.Color(opts.nebula) },
      uCloudCol: { value: new THREE.Color(opts.cloudColor) }, uTime: { value: 0 }, uSkyA: R.skyAlpha,
    };
    // High/Ultra with the baked cloud noise (public build): one mip-mapped tap instead of 4 octaves of
    // value noise — finer wisps, no aliasing near the horizon. The same cover and threshold otherwise.
    const ctex = opts.clouds && q.clouds ? R.cloudTex() : null;
    if (ctex) uni.uCloudTex = { value: ctex };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, side: THREE.BackSide, depthWrite: false, fog: false, defines: ctex ? { CLOUD_TEX: '' } : {},
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: [
        'uniform vec3 uTop,uMid,uHalo,uHor,uBot,uSun,uSunDir,uNeb,uCloudCol; uniform float uSunSize,uClouds,uStars,uTime,uSkyA; varying vec3 vDir;',
        '#ifdef CLOUD_TEX',
        'uniform sampler2D uCloudTex;',
        '#endif',
        'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
        'float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }',
        'float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }',
        'void main(){ vec3 d = normalize(vDir); float y = d.y;',
        ' vec3 col = y > 0.0 ? (y < 0.35 ? mix(uHor, uMid, smoothstep(0.0, 0.35, y)) : mix(uMid, uTop, smoothstep(0.35, 1.0, y))) : mix(uHor, uBot, clamp(-y*3.0,0.0,1.0));',
        ' float sd = max(dot(d, normalize(uSunDir)), 0.0);',
        ' col = mix(col, uSun, smoothstep(1.0 - uSunSize, 1.0 - uSunSize*0.5, sd)); col += uHalo * (pow(sd, 260.0) * 0.55 + pow(sd, 24.0) * 0.18 + pow(sd, 5.0) * 0.06);',
        '#ifdef CLOUD_TEX',
        // sampled outside the branch: implicit derivatives (mip selection) need uniform control flow
        ' vec2 cpt = d.xz / (max(y, 0.0) + 0.18) * 1.6 + vec2(uTime*0.01, 0.0); float cn = texture2D(uCloudTex, cpt * 0.0625).r;',
        ' if (uClouds > 0.5 && y > 0.0) { float c = smoothstep(0.52, 0.78, cn); col = mix(col, uCloudCol, c * 0.85 * smoothstep(0.0, 0.25, y)); }',
        '#else',
        ' if (uClouds > 0.5 && y > 0.0) { vec2 cp = d.xz / (y + 0.18) * 1.6 + vec2(uTime*0.01, 0.0); float c = smoothstep(0.52, 0.78, fbm(cp)); col = mix(col, uCloudCol, c * 0.85 * smoothstep(0.0, 0.25, y)); }',
        '#endif',
        ' if (uStars > 0.5) { vec2 sp = vec2(atan(d.z, d.x)*260.0, asin(clamp(d.y,-1.0,1.0))*260.0); vec2 cell = floor(sp); vec2 fr = fract(sp) - 0.5; float hc = h(cell); float st = step(0.975, hc) * smoothstep(0.32, 0.06, length(fr)); float tw = 0.55 + 0.45*sin(uTime*3.0 + hc*60.0); col += vec3(st*tw*(0.6 + 0.8*fract(hc*91.0)));',
        '   float nb = fbm(d.xy*2.2 + d.z*1.3) * fbm(d.zy*1.7 + 3.0); col += uNeb * smoothstep(0.2, 0.55, nb) * 0.9; }',
        // uSkyA is 0 while rendering into the post target: alpha 0 marks bare sky for the bloom mask.
        ' gl_FragColor = vec4(col, uSkyA);',
        ' #include <colorspace_fragment>',
        // +-0.5 LSB of noise after encoding: smooth 8-bit gradients (night skies band otherwise).
        ' gl_FragColor.rgb += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;',
        '}',
      ].join('\n'),
    });
    const geo = new THREE.SphereGeometry(1000, 32, 16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1e6; // drawn last among opaques so early-z skips covered sky pixels
    mesh.userData.uni = uni;
    mesh.onBeforeRender = function (r, s, cam) { mesh.position.copy(cam.position); uni.uTime.value = G.time.elapsed; };
    return mesh;
  };

  // Lighting rig: sets the shared soft-toon light state and adds matching built-in lights
  // (for any stock lit materials). preset: see R.setLighting plus {hemiI, sunI}.
  R.lightRig = function (scene, preset) {
    preset = Object.assign({ sunDir: new THREE.Vector3(0.45, 0.8, 0.35) }, preset || {});
    R.setLighting(preset);
    const hemi = new THREE.HemisphereLight(preset.sky || 0xeaf6ff, preset.ground || 0xe6c9a0, preset.hemiI || 1.2);
    const sun = new THREE.DirectionalLight(preset.sun || 0xfff4dc, preset.sunI || 2.2);
    sun.position.copy(preset.sunDir).normalize().multiplyScalar(100);
    scene.add(hemi, sun);
    return { hemi, sun };
  };

  // Dispose every geometry/material/texture under an Object3D (skips cached materials).
  const cachedMats = () => new Set(cache.values());
  R.disposeTree = function (root) {
    // The current world going away during a mode switch: the moment to apply an armed Ultra promotion
    // (before the next mode builds its foliage / materials).
    if (root && root === R.scene && G.Game && G.Game._switching && UA.pending) G.safe('auto ultra', applyPendingUltra);
    const keep = cachedMats();
    root.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.isInstancedMesh && !o.userData.shared) o.dispose(); // frees the instance buffers
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { if (!keep.has(m) && !m.userData.shared) { if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); } }
      }
    });
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 04_render.js]', e); }
// ---- 04b_post.js
try { (function () {
// Post-processing for the 'med', 'high' and 'ultra' quality tiers ('low' draws straight to the canvas).
// The scene and the viewmodel render into one off-screen target allocated at the maximum size;
// the dynamic render scale (R.setScale) only shrinks the viewport inside it — no reallocation, no
// hitch, no resolution pop — and a single composite pass upscales to the canvas while applying
// bloom, colour grading, vignette and dither.
//   ultra: as high, plus MSAA x8 on desktops when the target is at most ~1600x900 and the GPU offers it,
//         a 5-level bloom chain whose later levels use a 13-tap anti-flicker downsample, and
//         a light contrast-adaptive sharpen at native scale (crisper texture detail; edges are left alone).
//   high: MSAA x4 target (WebGL2; FXAA in the composite otherwise), HalfFloat scene target on
//         non-touch desktops when renderable (bloom keys on over-bright values), 4-level bloom from 1/2 res.
//   med:  MSAA x4 target (WebGL2; FXAA otherwise), 8-bit scene target, 2-level bloom from 1/4 res,
//         grading + vignette in the same composite pass.
// Bloom is a dual-filter (down 5 taps / up 8 taps) mip chain: very little bandwidth, wide and soft.
// All targets and programs are created and drawn once at setup (tiny viewports), so nothing
// compiles mid-game. Any failure turns post off for the session (R.disablePost) and the renderer
// falls back to direct rendering. Stored colours are display-referred sRGB (see the colour
// pipeline note in 04_render.js), so grading works directly on what the player sees.
(function (G) {
  const R = G.R;
  const P = R.post = { ready: false, tier: '', samples: 0, fxaa: false, hdr: false, levels: 0 };
  // base: divisor of the first bloom level; levels: bloom mip count; bloom: intensity; key: soft
  // threshold on the brightest channel [threshold, knee, white, sky] for 8-bit and for HalfFloat
  // scene targets (over-bright emissives/glows sit above 1 there, so the threshold sits higher);
  // white: how much unsaturated brights (white walls, highlights) bloom relative to saturated
  // glows; sky: bloom weight of bare sky (the sky writes alpha 0, see R.makeSky), so a bright sky
  // does not veil the whole frame while effects drawn over it still glow. sat: vibrance; con:
  // S-curve strength; vig: vignette; shK/hiK: split-tone amounts toward the preset's shade/sun
  // colours; lift: soft (never pure) black.
  const TIER = {
    med: { base: 4, levels: 2, bloom: 1.2, key: [0.76, 0.18, 0.22, 0.12], keyHdr: [0.95, 0.15, 0.25, 0.3], sat: 0.09, con: 0.07, vig: 0.1, shK: 0.05, hiK: 0.04, lift: [0.012, 0.009, 0.018] },
    high: { base: 2, levels: 4, bloom: 1.4, key: [0.76, 0.18, 0.22, 0.12], keyHdr: [0.95, 0.15, 0.25, 0.3], sat: 0.1, con: 0.07, vig: 0.12, shK: 0.05, hiK: 0.04, lift: [0.012, 0.009, 0.018] },
    // hq: 13-tap downsample; sharp: native-scale sharpen amount; msaa8: allow 8 samples on desktops
    ultra: { base: 2, levels: 5, bloom: 1.4, key: [0.76, 0.18, 0.22, 0.12], keyHdr: [0.95, 0.15, 0.25, 0.3], sat: 0.1, con: 0.07, vig: 0.12, shK: 0.05, hiK: 0.04, lift: [0.012, 0.009, 0.018], hq: true, sharp: 0.16, msaa8: true },
  };
  let T = TIER.med;
  let r = null, gl = null;
  let S = null;                         // scene target (MSAA when available)
  const B = [];                         // bloom chain, B[0] largest
  let bw = 1, bh = 1;                   // canvas drawing-buffer size
  let sw = 0, sh = 0;                   // scene target allocation
  let vw = 1, vh = 1;                   // scene viewport (render scale)
  let stale = false, warmed = false, mats = null;
  let fsScene = null, fsCam = null, quad = null;
  const _vp = new THREE.Vector4();
  const _c = new THREE.Color();

  // ---------- Shaders ----------
  const VS = 'varying vec2 vUv;\nvoid main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const TAP = [
    'uniform sampler2D tSrc; uniform vec2 uScale; uniform vec2 uTexel; varying vec2 vUv;',
    // Clamp inside the valid sub-rectangle so bilinear taps never read stale texels outside it.
    'vec3 tap(vec2 uv){ return texture2D(tSrc, clamp(uv, uTexel * 0.5, uScale - uTexel * 0.5)).rgb; }',
  ].join('\n');
  const PRE_FS = [TAP,
    'uniform vec4 uKey; uniform vec2 uKey2;', // threshold, knee, white weight, sky weight | output gain
    'vec3 key(vec4 t){',
    '  vec3 c = min(max(t.rgb, vec3(0.0)), vec3(16.0));',
    '  float br = max(c.r, max(c.g, c.b));',
    '  float sat = (br - min(c.r, min(c.g, c.b))) / max(br, 1e-4);',
    '  float soft = clamp(br - uKey.x + uKey.y, 0.0, 2.0 * uKey.y);',
    '  soft = soft * soft / (4.0 * uKey.y + 1e-4);',
    '  return c * (max(soft, br - uKey.x) / max(br, 1e-4)) * mix(uKey.z, 1.0, sat) * mix(uKey.w, 1.0, clamp(t.a, 0.0, 1.0));',
    '}',
    'vec4 tap4(vec2 uv){ return texture2D(tSrc, clamp(uv, uTexel * 0.5, uScale - uTexel * 0.5)); }',
    'float kw(vec3 c){ return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }',
    'void main(){',
    '  vec2 uv = vUv * uScale; vec2 o = uTexel;',
    '  vec3 a = key(tap4(uv - o)), b = key(tap4(uv + vec2(o.x, -o.y))), c = key(tap4(uv + vec2(-o.x, o.y))), d = key(tap4(uv + o));',
    // Karis average: weighting by 1/(1+brightness) keeps lone bright pixels from flickering.
    '  float wa = kw(a), wb = kw(b), wc = kw(c), wd = kw(d);',
    '  gl_FragColor = vec4((a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd) * uKey2.x, 1.0);',
    '}'].join('\n');
  const DOWN_FS = [TAP,
    'void main(){',
    '  vec2 uv = vUv * uScale; vec2 o = uTexel;',
    '  vec3 s = tap(uv) * 4.0 + tap(uv - o) + tap(uv + o) + tap(uv + vec2(o.x, -o.y)) + tap(uv - vec2(o.x, -o.y));',
    '  gl_FragColor = vec4(s * 0.125, 1.0);',
    '}'].join('\n');
  // Ultra: 13 taps over a 4x4-texel footprint (centre box + four overlapping corner boxes): a smoother,
  // non-flickering downsample for moving thin highlights.
  const DOWN13_FS = [TAP,
    'void main(){',
    '  vec2 uv = vUv * uScale; vec2 o = uTexel;',
    '  vec3 a = tap(uv + o * vec2(-2.0, -2.0)), b = tap(uv + o * vec2(0.0, -2.0)), c = tap(uv + o * vec2(2.0, -2.0));',
    '  vec3 d = tap(uv + o * vec2(-2.0, 0.0)), e = tap(uv), f = tap(uv + o * vec2(2.0, 0.0));',
    '  vec3 g = tap(uv + o * vec2(-2.0, 2.0)), h = tap(uv + o * vec2(0.0, 2.0)), i = tap(uv + o * vec2(2.0, 2.0));',
    '  vec3 j = tap(uv - o), k = tap(uv + vec2(o.x, -o.y)), l = tap(uv + vec2(-o.x, o.y)), m = tap(uv + o);',
    '  gl_FragColor = vec4(e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125, 1.0);',
    '}'].join('\n');
  const UP_FS = [TAP,
    'void main(){',
    '  vec2 uv = vUv * uScale; vec2 o = uTexel;',
    '  vec3 s = tap(uv + vec2(-2.0 * o.x, 0.0)) + tap(uv + vec2(2.0 * o.x, 0.0)) + tap(uv + vec2(0.0, -2.0 * o.y)) + tap(uv + vec2(0.0, 2.0 * o.y));',
    '  s += (tap(uv + vec2(-o.x, o.y)) + tap(uv + o) + tap(uv + vec2(o.x, -o.y)) + tap(uv - o)) * 2.0;',
    '  gl_FragColor = vec4(s / 12.0, 1.0);',
    '}'].join('\n');
  const COMP_FS = [
    'uniform sampler2D tScene, tBloom; uniform vec2 uScale, uTexel, uBScale, uBTexel;',
    'uniform float uBloom, uSat, uCon, uVig, uSharp, uFrame;',
    'uniform vec3 uSh, uHi, uLift, uVigCol;',
    'varying vec2 vUv;',
    'vec3 tapS(vec2 uv){ return texture2D(tScene, clamp(uv, uTexel * 0.5, uScale - uTexel * 0.5)).rgb; }',
    'float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }',
    '#ifdef FXAA',
    // Compact FXAA (edge-direction blur, early-out on flat areas) for targets without MSAA.
    'vec3 fxaa(vec2 uv){',
    '  vec2 px = uTexel;',
    '  vec3 nw = tapS(uv + vec2(-px.x, -px.y)), ne = tapS(uv + vec2(px.x, -px.y)), sw = tapS(uv + vec2(-px.x, px.y)), se = tapS(uv + px), m = tapS(uv);',
    '  float lNW = lum(nw), lNE = lum(ne), lSW = lum(sw), lSE = lum(se), lM = lum(m);',
    '  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));',
    '  if (lMax - lMin < max(0.0312, lMax * 0.125)) return m;',
    '  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));',
    '  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);',
    '  dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), -8.0, 8.0) * px;',
    '  vec3 a = 0.5 * (tapS(uv - dir * 0.1667) + tapS(uv + dir * 0.1667));',
    '  vec3 b = a * 0.5 + 0.25 * (tapS(uv - dir * 0.5) + tapS(uv + dir * 0.5));',
    '  float lB = lum(b);',
    '  return (lB < lMin || lB > lMax) ? a : b;',
    '}',
    '#endif',
    'void main(){',
    '  vec2 uv = vUv * uScale;',
    '  #ifdef FXAA',
    '    vec3 c = fxaa(uv);',
    '  #else',
    '    vec3 c = tapS(uv);',
    '    if (uSharp > 0.0) {',
    // Contrast-adaptive sharpening while upscaling a reduced render scale (gentler on edges that
    // are already contrasty, so no halos).
    '      vec3 n = tapS(uv + vec2(0.0, uTexel.y)), s = tapS(uv - vec2(0.0, uTexel.y)), e = tapS(uv + vec2(uTexel.x, 0.0)), w = tapS(uv - vec2(uTexel.x, 0.0));',
    '      vec3 mn = min(c, min(min(n, s), min(e, w))), mx = max(c, max(max(n, s), max(e, w)));',
    '      vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, vec3(1e-3)), 0.0, 1.0));',
    '      vec3 wgt = -amp * uSharp * 0.2;',
    '      c = (c + (n + s + e + w) * wgt) / (1.0 + 4.0 * wgt);',
    '    }',
    '  #endif',
    '  c = clamp(c, 0.0, 1.0);',
    '  #ifdef BLOOM',
    // Screen blend: glows lift what is under them without clipping already-bright areas to white.
    '    vec3 bl = min(texture2D(tBloom, clamp(vUv * uBScale, uBTexel * 0.5, uBScale - uBTexel * 0.5)).rgb * uBloom, 1.0);',
    '    c = 1.0 - (1.0 - c) * (1.0 - bl);',
    '  #endif',
    // Grade in display space: split-tone toward the preset's shade/sun hues (tints are normalised
    // to unit luma, so brightness is preserved), a gentle S-curve that leaves black and white where
    // they are, vibrance (dull colours gain more than vivid ones), and a soft lifted black.
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  c *= mix(uSh, uHi, smoothstep(0.08, 0.92, l));',
    '  c = clamp(c, 0.0, 1.0);',
    '  c += uCon * (c - 0.5) * c * (1.0 - c) * 4.0;',
    '  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));',
    '  l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  c = clamp(mix(vec3(l), c, 1.0 + uSat * (1.0 - (mx - mn))), 0.0, 1.0);',
    '  c = uLift + c * (1.0 - uLift);',
    '  vec2 q = vUv * 2.0 - 1.0;',
    '  c *= mix(vec3(1.0), uVigCol, smoothstep(0.45, 1.75, dot(q, q)) * uVig);',
    // Triangular dither of +-1 LSB (interleaved gradient noise, animated) so sky gradients and
    // soft shading never band in 8 bits.
    '  vec2 p = gl_FragCoord.xy + uFrame * vec2(5.588, 3.17);',
    '  float n1 = fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));',
    '  float n2 = fract(52.9829189 * fract(dot(p + vec2(17.0, 31.0), vec2(0.06711056, 0.00583715))));',
    '  c += (n1 + n2 - 1.0) / 255.0;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'].join('\n');

  function texUniforms() { return { tSrc: { value: null }, uScale: { value: new THREE.Vector2(1, 1) }, uTexel: { value: new THREE.Vector2(1, 1) } }; }
  function makeMats() {
    const base = { vertexShader: VS, depthTest: false, depthWrite: false, fog: false, lights: false, toneMapped: false };
    const mk = (fs, uniforms, extra) => new THREE.ShaderMaterial(Object.assign({ uniforms, fragmentShader: fs }, base, extra || {}));
    mats = {
      pre: mk(PRE_FS, Object.assign(texUniforms(), { uKey: { value: new THREE.Vector4() }, uKey2: { value: new THREE.Vector2(1, 0) } })),
      down: mk(DOWN_FS, texUniforms()),
      down13: mk(DOWN13_FS, texUniforms()),   // compiled only when a tier uses it (warmPasses draws what the tier runs)
      // Upsample adds into the next larger level (ONE, ONE): no extra targets needed.
      up: mk(UP_FS, texUniforms(), { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }),
      comp: [],
    };
    const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    black.needsUpdate = true;
    for (let i = 0; i < 4; i++) {
      const defines = {};
      if (i & 2) defines.FXAA = '';
      if (i & 1) defines.BLOOM = '';
      mats.comp.push(mk(COMP_FS, {
        tScene: { value: null }, tBloom: { value: black },
        uScale: { value: new THREE.Vector2(1, 1) }, uTexel: { value: new THREE.Vector2(1, 1) },
        uBScale: { value: new THREE.Vector2(1, 1) }, uBTexel: { value: new THREE.Vector2(1, 1) },
        uBloom: { value: 0 }, uSat: { value: 0 }, uCon: { value: 0 }, uVig: { value: 0 }, uSharp: { value: 0 }, uFrame: { value: 0 },
        uSh: { value: new THREE.Vector3(1, 1, 1) }, uHi: { value: new THREE.Vector3(1, 1, 1) },
        uLift: { value: new THREE.Vector3() }, uVigCol: { value: new THREE.Vector3(0.36, 0.33, 0.62) },
      }, { defines }));
    }
    // One oversized triangle covers the viewport (no diagonal seam, fewer helper invocations).
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    quad = new THREE.Mesh(geo, mats.down);
    quad.frustumCulled = false;
    fsScene = new THREE.Scene();
    fsScene.add(quad);
    fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // ---------- Targets ----------
  function makeTarget(w, h, type, samples, depth) {
    const t = new THREE.WebGLRenderTarget(w, h, {
      type, format: THREE.RGBAFormat, depthBuffer: !!depth, stencilBuffer: false, generateMipmaps: false,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, samples: samples || 0,
    });
    t.texture.name = 'post';
    return t;
  }
  function complete(rt) {
    r.setRenderTarget(rt);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    r.setRenderTarget(null);
    return st === gl.FRAMEBUFFER_COMPLETE;
  }
  function disposeTargets() {
    if (S) S.dispose();
    S = null; sw = sh = 0;
    for (const t of B) t.dispose();
    B.length = 0;
  }
  // Allocate (or resize) the scene target and bloom chain; falls back HDR -> 8-bit, MSAA -> FXAA.
  function alloc(w, h) {
    disposeTargets();
    // Ultra on a desktop: 8 samples while the target is small enough (<= ~1600x900) to afford them
    if (P.samples > 0) P.samples = P.can8 && w * h <= 1.6e6 ? 8 : P.maxS;
    for (;;) {
      S = makeTarget(w, h, P.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, P.samples, true);
      if (complete(S)) break;
      S.dispose(); S = null;
      if (P.samples > 4) { P.samples = P.maxS; P.can8 = false; continue; }
      if (P.hdr) { P.hdr = false; continue; }
      if (P.samples > 0) { P.samples = 0; P.fxaa = true; continue; }
      return false;
    }
    sw = w; sh = h;
    // The post passes never read depth: resolve colour only. r159 otherwise blits the multisampled
    // depth buffer too on every resolve (a second full-target pass on tilers / ANGLE-Metal); this
    // flag (r159's XR path, later exposed as resolveDepthBuffer:false) invalidates it instead.
    if (S.samples > 0) r.properties.get(S).__ignoreDepthValues = true;
    for (let k = 0; k < P.levels; k++) {
      const d = T.base << k;
      const t = makeTarget(Math.max(1, Math.ceil(w / d)), Math.max(1, Math.ceil(h / d)), P.bloomType, 0, false);
      if (!complete(t)) {
        t.dispose();
        if (P.bloomType !== THREE.UnsignedByteType) { P.bloomType = THREE.UnsignedByteType; return alloc(w, h); }
        for (const b of B) b.dispose();
        B.length = 0; P.levels = 0;
        break;
      }
      B.push(t);
    }
    return true;
  }

  // ---------- API (driven by 04_render) ----------
  P.setup = function (tier) {
    r = R.renderer; gl = r.getContext();
    if (stale) { S = null; B.length = 0; sw = sh = 0; stale = false; warmed = false; }
    if (!mats) makeMats();
    T = TIER[tier] || TIER.med;
    const caps = r.capabilities, gl2 = !!caps.isWebGL2;
    const flt = gl2 && (r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float'));
    P.tier = tier;
    P.samples = P.maxS = gl2 ? Math.min(4, caps.maxSamples || 0) : 0;
    P.can8 = !!(T.msaa8 && gl2 && (caps.maxSamples || 0) >= 8 && !G.isMobile && !G.isTouch);
    P.fxaa = P.samples === 0;
    P.hdr = (tier === 'high' || tier === 'ultra') && flt && !G.isMobile && !G.isTouch; // desktop only: 2x target bandwidth/memory
    P.bloomType = flt ? THREE.HalfFloatType : THREE.UnsignedByteType;
    P.levels = T.levels;
    disposeTargets();
    warmed = false;
    P.ready = true;
    return true;
  };
  P.teardown = function () { if (!stale) disposeTargets(); P.ready = false; };
  // Context lost: every GL object is gone; drop references (deleting them would touch the new
  // context) and rebuild on restore (R.applyQuality -> setup).
  P.lost = function () { P.ready = false; stale = true; };

  // Canvas buffer size changed. Grow the scene target when it is too small, shrink only when it
  // is far too large: the viewport sub-rectangle makes a somewhat oversized target free, so small
  // window / toolbar changes never reallocate.
  P.resize = function (w, h, smax) {
    if (!P.ready) return false;
    bw = w; bh = h;
    const nw = Math.max(16, Math.ceil(w * smax)), nh = Math.max(16, Math.ceil(h * smax));
    const grow = !S || nw > sw || nh > sh, shrink = !!S && nw * nh < sw * sh * 0.55;
    if (grow || shrink) {
      // ~6% slack when growing an existing target, so creeping window sizes settle quickly.
      const aw = S && grow ? Math.max(nw, Math.min(Math.ceil(nw * 1.06), Math.ceil(w))) : nw;
      const ah = S && grow ? Math.max(nh, Math.min(Math.ceil(nh * 1.06), Math.ceil(h))) : nh;
      if (!alloc(aw, ah)) { P.ready = false; return false; }
      warmed = false;
    }
    P.setScale(R.scale);
    if (!warmed) { warmed = true; warmPasses(); }
    return true;
  };
  P.setScale = function (s) {
    vw = Math.max(1, Math.min(sw, Math.round(bw * s)));
    vh = Math.max(1, Math.min(sh, Math.round(bh * s)));
  };

  function pass(mat, target, w, h) {
    quad.material = mat;
    target.viewport.set(0, 0, w, h);
    r.setRenderTarget(target);
    r.render(fsScene, fsCam);
  }
  function src(u, tex, w, h, aw, ah) {
    u.tSrc.value = tex;
    u.uScale.value.set(w / aw, h / ah);
    u.uTexel.value.set(1 / aw, 1 / ah);
  }
  function lvl(k, full) { const d = T.base << k; return Math.max(1, Math.ceil(full / d)); }
  function runBloom() {
    const pu = mats.pre.uniforms;
    src(pu, S.texture, vw, vh, sw, sh);
    const gain = P.bloomType === THREE.UnsignedByteType ? 0.5 : 1; // 8-bit chain: headroom for the level sum
    const k = P.hdr ? T.keyHdr : T.key;
    pu.uKey.value.set(k[0], k[1], k[2], k[3]);
    pu.uKey2.value.set(gain, 0);
    pass(mats.pre, B[0], lvl(0, vw), lvl(0, vh));
    const n = B.length, dm = T.hq ? mats.down13 : mats.down;
    for (let k = 1; k < n; k++) {
      src(dm.uniforms, B[k - 1].texture, lvl(k - 1, vw), lvl(k - 1, vh), lvl(k - 1, sw), lvl(k - 1, sh));
      pass(dm, B[k], lvl(k, vw), lvl(k, vh));
    }
    for (let k = n - 1; k > 0; k--) {
      src(mats.up.uniforms, B[k].texture, lvl(k, vw), lvl(k, vh), lvl(k, sw), lvl(k, sh));
      pass(mats.up, B[k - 1], lvl(k - 1, vw), lvl(k - 1, vh));
    }
    return gain * n;
  }
  // Preset colour (linear THREE.Color) -> display-space tint with unit luma, mixed toward white.
  function tint(out, col, k) {
    col.getRGB(_c, THREE.SRGBColorSpace);
    const l = Math.max(0.05, 0.2126 * _c.r + 0.7152 * _c.g + 0.0722 * _c.b);
    out.set(1 + (Math.min(2, Math.max(0.5, _c.r / l)) - 1) * k, 1 + (Math.min(2, Math.max(0.5, _c.g / l)) - 1) * k, 1 + (Math.min(2, Math.max(0.5, _c.b / l)) - 1) * k);
  }
  const _hex = new THREE.Color(), _tv = new THREE.Vector3(), NOGRADE = Object.freeze({});
  function composite(bloom, norm, warm) {
    const m = mats.comp[(P.fxaa ? 2 : 0) + (bloom ? 1 : 0)], u = m.uniforms, g = R.grade || NOGRADE;
    u.tScene.value = S.texture;
    u.uScale.value.set(vw / sw, vh / sh);
    u.uTexel.value.set(1 / sw, 1 / sh);
    if (bloom) {
      u.tBloom.value = B[0].texture;
      u.uBScale.value.set(lvl(0, vw) / lvl(0, sw), lvl(0, vh) / lvl(0, sh));
      u.uBTexel.value.set(1 / lvl(0, sw), 1 / lvl(0, sh));
      u.uBloom.value = (g.bloom != null ? g.bloom : T.bloom) / norm;
    }
    u.uSat.value = g.sat != null ? g.sat : T.sat;
    u.uCon.value = g.contrast != null ? g.contrast : T.con;
    u.uVig.value = g.vignette != null ? g.vignette : T.vig;
    const L = R.light;
    tint(u.uSh.value, L.uShadow.value, T.shK);
    tint(u.uHi.value, L.uSunCol.value, T.hiK);
    if (g.tint != null) {
      _hex.setHex(g.tint);
      tint(_tv, _hex, g.tintK != null ? g.tintK : 0.06);
      u.uHi.value.multiply(_tv); u.uSh.value.multiply(_tv);
    }
    u.uLift.value.set(T.lift[0], T.lift[1], T.lift[2]);
    // Sharpen when the scene is upscaled noticeably (reduced render scale or capped target); Ultra adds a
    // light native-scale amount (contrast-adaptive: already contrasty edges get almost none).
    const up = bw / Math.max(1, vw);
    u.uSharp.value = Math.max(up > 1.08 ? Math.min(0.55, (up - 1) * 0.9) : 0, T.sharp || 0);
    u.uFrame.value = G.time.frame & 63;
    quad.material = m;
    r.setRenderTarget(null);
    if (warm) r.setViewport(0, 0, 1, 1); // boot/tier warm-up: one pixel, overwritten next frame
    r.render(fsScene, fsCam);
  }

  P.render = function (scene, cam, vm) {
    if (!P.ready || !S) return false;
    S.viewport.set(0, 0, vw, vh);
    r.setRenderTarget(S);
    r.clear(true, true, false);
    // the world pass (R.beginScene/endScene: sun shadows on, Ultra fog stretch; optional GPU timer)
    const world = () => {
      if (!scene) return;
      const t = R._gpuTimerBegin ? R._gpuTimerBegin() : false;
      if (R.beginScene) R.beginScene(scene);
      try { r.render(scene, cam); } finally { if (R.endScene) R.endScene(scene); if (t) R._gpuTimerEnd(); }
    };
    if (vm && S.samples > 0) {
      // three.js resolves an MSAA target at the end of every render() call. With the viewmodel
      // following, that first resolve (a full-target blit) is wasted: hide the sample count while
      // the world draws (the MSAA framebuffer is already bound by setRenderTarget, and r159 only
      // reads .samples for the resolve), so only the viewmodel pass resolves.
      const ns = S.samples;
      S.samples = 0;
      try { world(); } finally { S.samples = ns; }
      r.clearDepth();
      r.render(R.vmScene, R.vmCamera);
    } else {
      world();
      if (vm) { r.clearDepth(); r.render(R.vmScene, R.vmCamera); }
    }
    const info = r.info.render, st = R.stats;
    // (the sun-shadow pass, when on, ran before this; R.render recorded where the scene passes start)
    st.calls = info.calls - (st._c0 || 0); st.tris = info.triangles - (st._t0 || 0);
    try {
      const t0 = performance.now();
      const bloom = G.Save.set.bloom !== false && B.length > 0;
      const norm = bloom ? runBloom() : 1;
      composite(bloom, norm);
      st.postCalls = info.calls - st.calls - (st._c0 || 0);
      st.postMs += (performance.now() - t0 - st.postMs) * 0.1;
      return true;
    } catch (e) {
      console.error('[post]', e);
      r.setRenderTarget(null);
      return false;
    }
  };

  // Mode-load warm-up (R.warmup): draw the scene into the real target at a tiny viewport so
  // pipelines for this target format/sample count are created behind the loading screen.
  P.warm = function (scene, cam) {
    if (!P.ready || !S) return;
    S.viewport.set(0, 0, Math.min(8, sw), Math.min(8, sh));
    r.setRenderTarget(S);
    try { r.render(scene, cam); } finally { r.setRenderTarget(null); }
  };

  // Boot-time / tier-change warm-up: run every post pass (both composite variants) once on tiny
  // viewports so all post programs are compiled and linked before the first real frame.
  function warmPasses() {
    const ow = vw, oh = vh;
    vw = Math.min(16, sw); vh = Math.min(16, sh);
    S.viewport.set(0, 0, vw, vh);
    r.setRenderTarget(S);
    r.clear(true, true, false);
    r.getViewport(_vp);
    const norm = B.length ? runBloom() : 1;
    if (B.length) composite(true, norm, true);
    composite(false, 1, true);
    r.setRenderTarget(null);
    r.setViewport(_vp.x, _vp.y, _vp.z, _vp.w);
    vw = ow; vh = oh;
  }
})(window.G);

}).call(window); } catch (e) { console.error('[module 04b_post.js]', e); }
// ---- 05_phys.js
try { (function () {
// Collision world: heightfield ground + axis-aligned boxes + vertical cylinders,
// bucketed in a 2D grid. Provides body movement (capsule-ish), ground queries and raycasts.
(function (G) {
  const CELL = 8;
  class Phys {
    constructor(opts) {
      opts = opts || {};
      this.heightFn = opts.heightFn || null;   // (x,z) => y
      this.bounds = opts.bounds || { minX: -200, maxX: 200, minZ: -200, maxZ: 200 };
      this.floorY = opts.floorY != null ? opts.floorY : -50; // kill plane
      this.grid = new Map();
      this.items = [];
      this._stamp = 1;
      this._r = { t: 0.5, nx: 0.5, ny: 0.5, nz: 0.5, tag: null, item: null };   // last _ray hit (doubles from the start)
    }
    // Grid cell key: a small integer, unique for |cell| < 4096 (±32 km). (The old xor hash put about half the cells outside
    // the small-integer range: a heap number allocated on every bucket lookup of every ground / wall / ray test.)
    _key(ix, iz) { return (ix + 4096) * 8192 + (iz + 4096); }
    _insert(it, minx, minz, maxx, maxz) {
      const x0 = Math.floor(minx / CELL), x1 = Math.floor(maxx / CELL), z0 = Math.floor(minz / CELL), z1 = Math.floor(maxz / CELL);
      for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
        const k = this._key(ix, iz); let b = this.grid.get(k); if (!b) { b = []; this.grid.set(k, b); } b.push(it);
      }
      it._s = 0; this.items.push(it);
      return it;
    }
    // Axis-aligned box from min/max corners.
    addAABB(minx, miny, minz, maxx, maxy, maxz, tag) {
      const it = { k: 0, minx, miny, minz, maxx, maxy, maxz, tag: tag || 'solid' };
      return this._insert(it, minx, minz, maxx, maxz);
    }
    // Box from center + full size.
    addBox(cx, cy, cz, sx, sy, sz, tag) { return this.addAABB(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, tag); }
    // Vertical cylinder.
    addCyl(x, z, r, y0, y1, tag) {
      const it = { k: 1, x, z, r, y0, y1, tag: tag || 'solid' };
      return this._insert(it, x - r, z - r, x + r, z + r);
    }
    remove(it) {
      if (!it) return;
      it.dead = true;
      const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1);
      for (const b of this.grid.values()) { const j = b.indexOf(it); if (j >= 0) b.splice(j, 1); }
    }
    // Collect unique items overlapping an XZ rect.
    query(minx, minz, maxx, maxz, out) {
      out = out || [];
      out.length = this._q(minx, minz, maxx, maxz, out);
      return out;
    }
    // query() for the hot paths: writes the items to out[0..n-1] and returns n, leaving out.length alone. (Resetting
    // a scratch array with length = 0 frees its backing store, so every query re-grew it: garbage on each ground /
    // wall / ray test. Entries past n are stale.)
    _q(minx, minz, maxx, maxz, out) {
      const s = ++this._stamp;
      const x0 = Math.floor(minx / CELL), x1 = Math.floor(maxx / CELL), z0 = Math.floor(minz / CELL), z1 = Math.floor(maxz / CELL);
      let n = 0;
      for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
        const b = this.grid.get(this._key(ix, iz)); if (!b) continue;
        for (let i = 0; i < b.length; i++) { const it = b[i]; if (it._s !== s) { it._s = s; out[n++] = it; } }
      }
      return n;
    }
    terrain(x, z) { return this.heightFn ? this.heightFn(x, z) : 0; }

    // Highest walkable surface under a circle that is at or below maxY.
    groundAt(x, z, r, maxY) {
      let g = this.terrain(x, z);
      if (g > maxY) g = Math.min(g, maxY); // terrain is always walkable; avoids tunneling into hills
      const list = _tmpA, n = this._q(x - r, z - r, x + r, z + r, list);
      for (let i = 0; i < n; i++) {
        const it = list[i];
        let top, inside;
        if (it.k === 0) { top = it.maxy; inside = x + r > it.minx && x - r < it.maxx && z + r > it.minz && z - r < it.maxz; }
        else { top = it.y1; const dx = x - it.x, dz = z - it.z; inside = dx * dx + dz * dz < (it.r + r) * (it.r + r); }
        if (inside && top <= maxY && top > g) g = top;
      }
      return g;
    }
    // Lowest ceiling above y (box/cyl bottoms) over a circle.
    ceilingAt(x, z, r, y, headY) {
      let c = Infinity;
      const list = _tmpA, n = this._q(x - r, z - r, x + r, z + r, list);
      for (let i = 0; i < n; i++) {
        const it = list[i];
        let bot, inside;
        if (it.k === 0) { bot = it.miny; inside = x + r > it.minx && x - r < it.maxx && z + r > it.minz && z - r < it.maxz; }
        else { bot = it.y0; const dx = x - it.x, dz = z - it.z; inside = dx * dx + dz * dz < (it.r + r) * (it.r + r); }
        if (inside && bot >= y + 0.3 && bot < c && bot < headY + 1.5) c = bot;
      }
      return c;
    }
    // Push a circle out of walls whose vertical span overlaps [feet+step, head]. Returns pushes count; writes last normal.
    resolveXZ(p, r, feetY, headY, step, nOut) {
      let pushes = 0;
      const list = _tmpB, n = this._q(p.x - r, p.z - r, p.x + r, p.z + r, list);
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < n; i++) {
          const it = list[i];
          if (it.k === 0) {
            if (it.maxy <= feetY + step || it.miny >= headY) continue;
            const cx = Math.max(it.minx, Math.min(p.x, it.maxx));
            const cz = Math.max(it.minz, Math.min(p.z, it.maxz));
            let dx = p.x - cx, dz = p.z - cz;
            let d2 = dx * dx + dz * dz;
            if (d2 >= r * r) continue;
            if (d2 > 1e-8) {
              const d = Math.sqrt(d2); const push = r - d; dx /= d; dz /= d;
              p.x += dx * push; p.z += dz * push;
              if (nOut) { nOut.x = dx; nOut.z = dz; }
            } else {
              // Center inside the box: exit through the nearest face.
              const l = p.x - it.minx, rr = it.maxx - p.x, f = p.z - it.minz, b = it.maxz - p.z;
              const m = Math.min(l, rr, f, b);
              if (m === l) { p.x = it.minx - r; if (nOut) { nOut.x = -1; nOut.z = 0; } }
              else if (m === rr) { p.x = it.maxx + r; if (nOut) { nOut.x = 1; nOut.z = 0; } }
              else if (m === f) { p.z = it.minz - r; if (nOut) { nOut.x = 0; nOut.z = -1; } }
              else { p.z = it.maxz + r; if (nOut) { nOut.x = 0; nOut.z = 1; } }
            }
            pushes++;
          } else {
            if (it.y1 <= feetY + step || it.y0 >= headY) continue;
            let dx = p.x - it.x, dz = p.z - it.z; const rr = it.r + r;
            const d2 = dx * dx + dz * dz;
            if (d2 >= rr * rr) continue;
            const d = Math.sqrt(d2) || 1e-4; if (d2 < 1e-8) { dx = 1; dz = 0; }
            dx /= d; dz /= d;
            p.x = it.x + dx * rr; p.z = it.z + dz * rr;
            if (nOut) { nOut.x = dx; nOut.z = dz; }
            pushes++;
          }
        }
        if (!pushes) break;
      }
      return pushes;
    }
    // Move a body {pos, vel, r, h, step, grounded}. Mutates and sets grounded/hitWall/wallN/landed/ceil.
    moveBody(b, dt) {
      const p = b.pos, v = b.vel, r = b.r, h = b.h, step = b.step != null ? b.step : 0.45;
      const wasG = b.grounded;
      const maxV = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
      const n = Math.min(10, Math.max(1, Math.ceil(maxV * dt / (r * 0.6))));
      const sdt = dt / n;
      b.grounded = false; b.hitWall = false; b.landed = false; b.ceil = false;
      const wn = b.wallN || (b.wallN = { x: 0, z: 0 });
      for (let i = 0; i < n; i++) {
        p.x += v.x * sdt; p.z += v.z * sdt;
        if (this.resolveXZ(p, r, p.y, p.y + h, step, wn)) {
          b.hitWall = true;
          const dot = v.x * wn.x + v.z * wn.z;
          if (dot < 0) { v.x -= wn.x * dot; v.z -= wn.z * dot; }
        }
        p.y += v.y * sdt;
        const fr = r * 0.7;
        const g = this.groundAt(p.x, p.z, fr, p.y + step);
        const snap = (wasG || b.grounded) && v.y <= 0.01 ? 0.35 : 0;
        if (p.y <= g + snap && v.y <= 0.01) {
          if (!wasG && !b.grounded) { b.landed = true; b.landVel = v.y; }
          p.y = g; v.y = 0; b.grounded = true;
        }
        if (v.y > 0) {
          const c = this.ceilingAt(p.x, p.z, fr, p.y, p.y + h);
          if (p.y + h > c) { p.y = c - h; v.y = 0; b.ceil = true; }
        }
      }
      const B = this.bounds;
      if (p.x < B.minX + r) { p.x = B.minX + r; v.x = Math.max(0, v.x); b.hitWall = true; }
      if (p.x > B.maxX - r) { p.x = B.maxX - r; v.x = Math.min(0, v.x); b.hitWall = true; }
      if (p.z < B.minZ + r) { p.z = B.minZ + r; v.z = Math.max(0, v.z); b.hitWall = true; }
      if (p.z > B.maxZ - r) { p.z = B.maxZ - r; v.z = Math.min(0, v.z); b.hitWall = true; }
      b.fell = p.y < this.floorY;
      return b;
    }
    // Find a ledge in front of a body to mantle onto: returns top y or null.
    ledgeAhead(p, dirX, dirZ, r, minUp, maxUp) {
      const fx = p.x + dirX * (r + 0.35), fz = p.z + dirZ * (r + 0.35);
      const top = this.groundAt(fx, fz, 0.2, p.y + maxUp);
      const up = top - p.y;
      if (up < minUp || up > maxUp) return null;
      // Need head room above the ledge.
      const c = this.ceilingAt(fx, fz, 0.2, top, top + 1.8);
      if (c < top + 1.6) return null;
      return top;
    }

    // Ray vs world. Returns {t, x,y,z, nx,ny,nz, tag, item} or null (a new object per hit, so callers may keep it).
    raycast(ox, oy, oz, dx, dy, dz, maxT, skipTerrain) {
      if (!this._ray(ox, oy, oz, dx, dy, dz, maxT, skipTerrain)) return null;
      const R = this._r, t = R.t;
      return { t, nx: R.nx, ny: R.ny, nz: R.nz, tag: R.tag, item: R.item, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t };
    }
    // Same test, yes / no only (no allocation): line of sight, clear-path probes.
    rayHit(ox, oy, oz, dx, dy, dz, maxT, skipTerrain) { return this._ray(ox, oy, oz, dx, dy, dz, maxT, skipTerrain); }
    // The ray test itself: true on a hit, nearest hit in this._r {t, nx, ny, nz, tag, item}. Scalars only (the
    // per-candidate arrays and hit objects it used to build were the biggest per-frame garbage source in combat), and
    // the loop keeps only the distance, the item and a small hit code: the normal is worked out once, for the winner
    // (floats carried through the loop for every closer hit were boxed on each update).
    _ray(ox, oy, oz, dx, dy, dz, maxT, skipTerrain) {
      // hk: 0 none, 1-6 box face (1 + axis * 2 + (sign > 0)), 7 cylinder side, 8 cylinder top, 9 terrain
      let best = maxT, hk = 0, hitem = null;
      // Candidate items along the ray's XZ footprint (bounding rect, capped).
      const ex = ox + dx * maxT, ez = oz + dz * maxT;
      const list = _tmpC, n = this._q(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), list);
      for (let i = 0; i < n; i++) {
        const it = list[i];
        if (it.k === 0) {
          // Slab test, one axis at a time (x, y, z); the entry face gives the normal.
          let tmin = 0, tmax = best, nAxis = -1, nSign = 0, t1, t2, s, inv;
          if (Math.abs(dx) < 1e-9) { if (ox < it.minx || ox > it.maxx) continue; }
          else {
            inv = 1 / dx; t1 = (it.minx - ox) * inv; t2 = (it.maxx - ox) * inv; s = -1;
            if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
            if (t1 > tmin) { tmin = t1; nAxis = 0; nSign = s; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) continue;
          }
          if (Math.abs(dy) < 1e-9) { if (oy < it.miny || oy > it.maxy) continue; }
          else {
            inv = 1 / dy; t1 = (it.miny - oy) * inv; t2 = (it.maxy - oy) * inv; s = -1;
            if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
            if (t1 > tmin) { tmin = t1; nAxis = 1; nSign = s; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) continue;
          }
          if (Math.abs(dz) < 1e-9) { if (oz < it.minz || oz > it.maxz) continue; }
          else {
            inv = 1 / dz; t1 = (it.minz - oz) * inv; t2 = (it.maxz - oz) * inv; s = -1;
            if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
            if (t1 > tmin) { tmin = t1; nAxis = 2; nSign = s; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) continue;
          }
          if (nAxis >= 0 && tmin < best) { best = tmin; hk = 1 + nAxis * 2 + (nSign > 0 ? 1 : 0); hitem = it; }
        } else {
          // Infinite vertical cylinder in XZ, clipped to [y0,y1], plus top cap.
          const px = ox - it.x, pz = oz - it.z;
          const a = dx * dx + dz * dz;
          if (a > 1e-9) {
            const bq = 2 * (px * dx + pz * dz), c = px * px + pz * pz - it.r * it.r;
            const disc = bq * bq - 4 * a * c;
            if (disc >= 0) {
              const t = (-bq - Math.sqrt(disc)) / (2 * a);
              if (t > 0 && t < best) {
                const y = oy + dy * t;
                if (y >= it.y0 && y <= it.y1) { best = t; hk = 7; hitem = it; }
              }
            }
          }
          if (dy < 0) {
            const t = (it.y1 - oy) / dy;
            if (t > 0 && t < best) {
              const hx = px + dx * t, hz = pz + dz * t;
              if (hx * hx + hz * hz <= it.r * it.r) { best = t; hk = 8; hitem = it; }
            }
          }
        }
      }
      if (this.heightFn && !skipTerrain) {
        const tt = this._rayT(ox, oy, oz, dx, dy, dz, best);
        if (tt >= 0 && tt < best) { best = tt; hk = 9; hitem = null; }
      }
      if (hk === 0) return false;
      const R = this._r;
      R.t = best; R.item = hitem;
      if (hk <= 6) {
        const ax = (hk - 1) >> 1, sg = (hk - 1) & 1 ? 1 : -1;
        R.nx = ax === 0 ? sg : 0; R.ny = ax === 1 ? sg : 0; R.nz = ax === 2 ? sg : 0; R.tag = hitem.tag;
      } else if (hk === 7) {
        R.nx = (ox - hitem.x + dx * best) / hitem.r; R.ny = 0; R.nz = (oz - hitem.z + dz * best) / hitem.r; R.tag = hitem.tag;
      } else if (hk === 8) {
        R.nx = 0; R.ny = 1; R.nz = 0; R.tag = hitem.tag;
      } else {
        const x = ox + dx * best, z = oz + dz * best, e = 0.5;
        const hL = this.heightFn(x - e, z), hR = this.heightFn(x + e, z), hD = this.heightFn(x, z - e), hU = this.heightFn(x, z + e);
        const nx = hL - hR, ny = 2 * e, nz = hD - hU, l = Math.hypot(nx, ny, nz);
        R.nx = nx / l; R.ny = ny / l; R.nz = nz / l; R.tag = 'ground';
      }
      return true;
    }
    rayTerrain(ox, oy, oz, dx, dy, dz, maxT) { const t = this._rayT(ox, oy, oz, dx, dy, dz, maxT); return t >= 0 ? t : null; }
    // (-1 = no hit: a number either way, so the hot path never boxes a null-or-float result)
    _rayT(ox, oy, oz, dx, dy, dz, maxT) {
      const hf = this.heightFn;
      let t = 0, prevT = 0;
      if (oy < hf(ox, oz)) return 0;
      const stepBase = 0.6;
      while (t < maxT) {
        const y = oy + dy * t, x = ox + dx * t, z = oz + dz * t;
        const gh = hf(x, z);
        const gap = y - gh;
        if (gap < 0) {
          let lo = prevT, hi = t;
          for (let i = 0; i < 7; i++) { const m = (lo + hi) / 2; if (oy + dy * m < hf(ox + dx * m, oz + dz * m)) hi = m; else lo = m; }
          return hi;
        }
        prevT = t;
        t += Math.max(stepBase, gap * 0.5);
      }
      return -1;
    }
    // Line of sight between two points (true if clear).
    los(a, b, skipTerrain) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z; const L = Math.hypot(dx, dy, dz);
      if (L < 1e-4) return true;
      return !this._ray(a.x, a.y, a.z, dx / L, dy / L, dz / L, L - 0.05, skipTerrain);
    }
  }
  const _tmpA = [], _tmpB = [], _tmpC = [];
  G.Phys = Phys;
})(window.G);

}).call(window); } catch (e) { console.error('[module 05_phys.js]', e); }
// ---- 06_input.js
try { (function () {
// Input: touch (floating joystick, drag-look, on-screen buttons) + keyboard/mouse (pointer lock) + gamepad
// (Gamepad API, standard mapping, with focus navigation for the G.UI screens).
// Game code reads G.input each frame; edge flags (xxxP) are cleared by G.Input.endFrame().
// inp.device is 'touch' | 'desktop' | 'gamepad': it follows the last real use — a touch, a key, real mouse
// movement or a mouse button (never the mouse events a browser synthesises after a tap), or a gamepad
// button / a clearly pushed stick. Only the active device writes the held states, so switching can never
// double an input or leave a button stuck down.
(function (G) {
  const inp = G.input = {
    move: { x: 0, y: 0 }, lookDX: 0, lookDY: 0,
    fire: false, fireP: false, aim: false,
    jump: false, jumpP: false, slide: false, slideP: false, sprint: false,
    interactP: false, reloadP: false, swapP: false, abilityP: false, gadgetP: false, pingP: false, pauseP: false, mapP: false,
    boost: false, brake: false, item: false, itemP: false, steer: 0,
    slotP: -1, wheel: 0,
    device: G.isTouch ? 'touch' : 'desktop',
    touchFiring: false,
  };
  const I = G.Input = { layout: 'none', enabled: true };
  const keys = new Set();
  let root, joyBase, joyKnob, btns = {};
  let dragLook = null;
  let joyId = null, joyCx = 0, joyCy = 0, lookId = null, lookX = 0, lookY = 0, fireId = null, fireLX = 0, fireLY = 0;
  const JOY_R = 58;
  I.LAYOUTS_REF = () => LAYOUTS;
  const LOOKPAD = new Set(['fire', 'jump', 'slide', 'swim', 'ability', 'reload', 'swap']);

  // ---------------------------------------------------------------- touch look smoothing
  // Phones deliver touch moves unevenly relative to the frames (0, 1 or 2 per frame), so summing raw
  // deltas per frame makes the view judder. Every touch-look sample (coalesced ones included) is
  // stamped with its event time and appended to the cumulative look path; each frame reads that path
  // at a short delay behind the frame clock, so consecutive frames get evenly spaced points between
  // two real samples (interpolation only: no prediction, so no overshoot or bounce-back). The delay
  // tunes itself to how old the newest sample is at frame time while the finger keeps moving, which
  // adds about half a touch interval of latency on average. A light 1-euro stage then irons out
  // digitizer jitter at slow speeds, and a gentle response curve speeds up fast flicks only. The
  // output telescopes: once the finger stops, the summed look delta equals the raw sum exactly.
  // Mouse look stays raw. Setting: G.Save.set.lookSmooth (default on).
  const LCFG = {
    minCut: 25, beta: 0.04, dCut: 9,            // 1-euro: Hz at rest, Hz per px/s, speed filter Hz
    accel: 0.3, v0: 650, v1: 2600,              // response curve: +30% gain ramping in between v0..v1 px/s
    latMin: 1, latMax: 40, latPct: 0.95,        // resample delay clamp (ms) and the sample-age percentile it covers
  };
  const LN = 64, AN = 48;
  const LS = {
    t: new Float64Array(LN), x: new Float64Array(LN), y: new Float64Array(LN), head: -1, n: 0,
    rawX: 0, rawY: 0,             // cumulative raw touch-look path (px, already scaled per pad)
    ts: -1e9,                     // last resample time (ms); never runs backwards
    rx: 0, ry: 0,                 // path resampled at ts
    fx: 0, fy: 0, px: 0, py: 0, vx: 0, vy: 0, speed: 0,   // 1-euro state (filtered pos, last raw pos, speed px/s)
    ox: 0, oy: 0,                 // filtered position already handed out
    lat: 17, latGoal: 17, iv: 16.7,   // resample delay (eased toward its goal; prior = one 60 Hz interval) and touch interval (ms)
    ageT: -1, age: -1,            // newest sample time/age seen by the last poll (for delay tuning)
    ages: new Float32Array(AN), agesS: new Float32Array(AN), an: 0, ai: 0, aDirty: 0,
    lastPoll: -1, used: false,
  };
  I.lookFilter = LS; I.lookCfg = LCFG;
  const smoothOn = () => G.Save && G.Save.data ? G.Save.set.lookSmooth !== false : true;
  function lsStamp(e) {
    const t = e && e.timeStamp, now = performance.now();
    // Old engines stamped epoch ms (or 0): fall back to the arrival time.
    return typeof t === 'number' && t > 0 && Math.abs(t - now) < 60000 ? t : now;
  }
  function lsAppend(t, x, y) {
    LS.head = (LS.head + 1) % LN; LS.n = Math.min(LN, LS.n + 1);
    LS.t[LS.head] = t; LS.x[LS.head] = x; LS.y[LS.head] = y;
  }
  // A look pointer went down: pin the path here so the first move starts from rest, not from the
  // previous drag's last sample.
  function lsAnchor(t) {
    if (LS.n && t <= LS.t[LS.head] + 0.05) { LS.x[LS.head] = LS.rawX; LS.y[LS.head] = LS.rawY; return; }
    lsAppend(t, LS.rawX, LS.rawY);
  }
  function lsPush(t, dx, dy) {
    const px = LS.rawX, py = LS.rawY;
    LS.rawX += dx; LS.rawY += dy; LS.used = true;
    if (!LS.n) { lsAppend(t, LS.rawX, LS.rawY); return; }
    const lt = LS.t[LS.head];
    // Same (or older, from another finger) stamp: fold into the newest sample.
    if (t <= lt + 0.05) { LS.x[LS.head] = LS.rawX; LS.y[LS.head] = LS.rawY; return; }
    const gap = t - lt;
    // The newest sample the last frame saw was "on time" if the finger kept moving: remember its age
    // (the delay covers a high percentile of these). Ages across a pause say nothing and are dropped.
    if (LS.age >= 0 && LS.ageT === lt && gap <= LS.iv * 1.6 + 2) {
      LS.ages[LS.ai] = Math.min(LS.age, LCFG.latMax); LS.ai = (LS.ai + 1) % AN;
      if (LS.an < AN) LS.an++;
      LS.aDirty++;
    }
    LS.age = -1;
    if (gap < 40) LS.iv += (Math.max(3, gap) - LS.iv) * 0.1;
    // After a pause the finger only moved during the last interval: hold the old position until then.
    else lsAppend(t - Math.min(LS.iv, gap * 0.5), px, py);
    lsAppend(t, LS.rawX, LS.rawY);
  }
  // Path position at time T (ms) into LS.rx/ry.
  function lsEval(T) {
    let i = LS.head;
    if (T >= LS.t[i]) { LS.rx = LS.x[i]; LS.ry = LS.y[i]; return; }
    for (let k = 1; k < LS.n; k++) {
      const j = (i - 1 + LN) % LN;
      if (LS.t[j] <= T) {
        const span = LS.t[i] - LS.t[j], u = span > 1e-6 ? (T - LS.t[j]) / span : 1;
        LS.rx = LS.x[j] + (LS.x[i] - LS.x[j]) * u; LS.ry = LS.y[j] + (LS.y[i] - LS.y[j]) * u;
        return;
      }
      i = j;
    }
    LS.rx = LS.x[i]; LS.ry = LS.y[i];
  }
  // Drop anything still in flight (layout change, menu): nothing leaks into the next drag.
  function lsFlush() {
    const now = performance.now();
    LS.fx = LS.px = LS.ox = LS.rx = LS.rawX; LS.fy = LS.py = LS.oy = LS.ry = LS.rawY;
    LS.vx = LS.vy = LS.speed = 0; LS.age = -1;
    LS.n = 0; LS.head = -1; lsAppend(now, LS.rawX, LS.rawY);
    LS.ts = -1e9; // the path before `now` is flat, so the next resample can start anywhere
  }
  // Frame clock for resampling: advances by the frame step the simulation uses (G.time.realDt,
  // refresh-paced when the pacer is on) and is pulled gently toward performance.now(), so evenly
  // spaced frames read evenly spaced points even when rAF callbacks jitter by a millisecond or two.
  let clock = -1;
  function frameClock() {
    const now = performance.now();
    const step = G.time && G.time.realDt > 0 ? G.time.realDt * 1000 : 0;
    if (clock < 0 || !step || Math.abs(now - clock - step) > 25) clock = now;
    else { clock += step; clock += (now - clock) * 0.08; }
    return clock;
  }
  // Once per frame (from I.poll): hand the smoothed delta since the last frame to inp.lookDX/DY.
  function lsPoll(nowMs) {
    const now = nowMs != null ? nowMs : frameClock();
    const dtp = LS.lastPoll >= 0 ? Math.min(0.1, Math.max(1e-4, (now - LS.lastPoll) / 1000)) : 1 / 60;
    LS.lastPoll = now;
    if (!LS.used || !LS.n) return;
    LS.ageT = LS.t[LS.head]; LS.age = now - LS.ageT;
    // Delay goal = high percentile of recent on-time ages (sorted copy, no allocation), eased in so
    // the resample clock never jumps: quick to grow (fewer holds), slow to shrink.
    if (LS.aDirty >= (LS.an < AN ? 1 : 4) && LS.an >= 3) {
      LS.aDirty = 0;
      const s = LS.agesS; for (let i = 0; i < AN; i++) s[i] = i < LS.an ? LS.ages[i] : 1e9;
      s.sort();
      LS.latGoal = s[Math.min(LS.an - 1, Math.floor(LS.an * LCFG.latPct))];
    }
    LS.lat += (LS.latGoal - LS.lat) * (1 - Math.exp(-dtp / (LS.latGoal > LS.lat ? 0.05 : 0.8)));
    let T = now - Math.min(LCFG.latMax, Math.max(LCFG.latMin, LS.lat + 0.5));
    if (T < LS.ts) T = LS.ts;
    // Speed is measured over the resample step (floored: a held clock must not read as a spike).
    const dts = Math.max(0.004, (T - LS.ts) / 1000);
    LS.ts = T;
    lsEval(T);
    // 1-euro: speed-adaptive low-pass on the resampled path (frame-rate independent alphas).
    const rvx = (LS.rx - LS.px) / dts, rvy = (LS.ry - LS.py) / dts;
    LS.px = LS.rx; LS.py = LS.ry;
    const ad = 1 - Math.exp(-dtp * 6.2832 * LCFG.dCut);
    LS.vx += (rvx - LS.vx) * ad; LS.vy += (rvy - LS.vy) * ad;
    LS.speed = Math.hypot(LS.vx, LS.vy);
    const a = 1 - Math.exp(-dtp * 6.2832 * (LCFG.minCut + LCFG.beta * LS.speed));
    LS.fx += (LS.rx - LS.fx) * a; LS.fy += (LS.ry - LS.fy) * a;
    // Settled: land exactly on the path (the summed output then equals the raw sum).
    if (Math.abs(LS.rx - LS.fx) < 0.02 && Math.abs(LS.ry - LS.fy) < 0.02 && LS.speed < 2) { LS.fx = LS.rx; LS.fy = LS.ry; }
    let dx = LS.fx - LS.ox, dy = LS.fy - LS.oy;
    LS.ox = LS.fx; LS.oy = LS.fy;
    if (dx === 0 && dy === 0) return;
    // Response curve: exactly 1 below v0 (precise aiming untouched), up to 1 + accel for fast flicks.
    if (LCFG.accel > 0 && LS.speed > LCFG.v0) {
      const u = Math.min(1, (LS.speed - LCFG.v0) / (LCFG.v1 - LCFG.v0));
      const g = 1 + LCFG.accel * u * u * (3 - 2 * u);
      dx *= g; dy *= g;
    }
    inp.lookDX += dx; inp.lookDY += dy;
  }
  // Touch look input from a pad (gain 1 for the look area, 0.9 when dragging on the fire button).
  // Coalesced samples carry the in-between positions and times the browser merged into this event.
  function touchLook(e, lastX, lastY, gain, setLast) {
    const smooth = smoothOn();
    let list = null;
    if (smooth && e.getCoalescedEvents) { try { list = e.getCoalescedEvents(); } catch (err) { list = null; } }
    let lx = lastX, ly = lastY;
    const co = list && list.length ? list : null, n = co ? co.length : 1;
    for (let i = 0; i < n; i++) {
      const ev = co ? co[i] : e;
      const lp = G.Screen ? G.Screen.toLocal(ev.clientX, ev.clientY) : { x: ev.clientX, y: ev.clientY };
      const dx = (lp.x - lx) * gain, dy = (lp.y - ly) * gain;
      lx = lp.x; ly = lp.y;
      if (smooth) { if (dx || dy) lsPush(lsStamp(ev), dx, dy); }
      else { inp.lookDX += dx; inp.lookDY += dy; }
    }
    setLast(lx, ly);
  }
  const setLook = (x, y) => { lookX = x; lookY = y; };
  const setFireLook = (x, y) => { fireLX = x; fireLY = y; };

  // Buttons per layout. pos in CSS (right/bottom in vmin units handled via CSS classes).
  const LAYOUTS = {
    fps: ['fire', 'jump', 'slide', 'reload', 'swap', 'ability', 'gadget', 'interact', 'pause'],
    royale: ['fire', 'jump', 'slide', 'reload', 'swap', 'ability', 'gadget', 'interact', 'pause', 'ping'],
    turf: ['fire', 'jump', 'swim', 'swap', 'ability', 'gadget', 'pause'],
    race: ['boost', 'brake', 'item', 'fire', 'pause'],
    hub: ['jump', 'interact', 'pause', 'fire'],
    menu: [],
    none: [],
  };
  const ICONS = {
    fire: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9" fill="none" stroke="currentColor" stroke-width="4"/><path d="M24 4v10M24 34v10M4 24h10M34 24h10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
    jump: '<svg viewBox="0 0 48 48"><path d="M24 8l14 16h-8v14H18V24h-8z" fill="currentColor"/></svg>',
    slide: '<svg viewBox="0 0 48 48"><path d="M8 34h32M12 26l10-8 8 6 8-4" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    swim: '<svg viewBox="0 0 48 48"><path d="M6 30c6-6 12 6 18 0s12 6 18 0M6 20c6-6 12 6 18 0s12 6 18 0" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/></svg>',
    reload: '<svg viewBox="0 0 48 48"><path d="M38 24a14 14 0 1 1-4-9.9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M38 6v10H28" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    swap: '<svg viewBox="0 0 48 48"><path d="M10 18h26l-7-7M38 30H12l7 7" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ability: '<svg viewBox="0 0 48 48"><path d="M27 4L10 27h12l-3 17 19-25H26z" fill="currentColor"/></svg>',
    gadget: '<svg viewBox="0 0 48 48"><circle cx="24" cy="27" r="13" fill="currentColor"/><path d="M24 14V6M20 6h8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
    interact: '<svg viewBox="0 0 48 48"><path d="M16 22V10a4 4 0 0 1 8 0v10M24 20v-3a4 4 0 0 1 8 0v5M32 22a4 4 0 0 1 8 0v8c0 8-6 14-14 14h-2c-6 0-9-3-12-8l-5-9a3.5 3.5 0 0 1 6-3l3 4V22" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 48 48"><rect x="12" y="10" width="8" height="28" rx="3" fill="currentColor"/><rect x="28" y="10" width="8" height="28" rx="3" fill="currentColor"/></svg>',
    ping: '<svg viewBox="0 0 48 48"><path d="M24 44s14-14 14-24a14 14 0 0 0-28 0c0 10 14 24 14 24z" fill="currentColor"/><circle cx="24" cy="20" r="5" fill="#fff"/></svg>',
    boost: '<svg viewBox="0 0 48 48"><path d="M8 12l14 12L8 36zM24 12l14 12-14 12z" fill="currentColor"/></svg>',
    brake: '<svg viewBox="0 0 48 48"><path d="M10 34c4-12 24-12 28 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="18" r="5" fill="currentColor"/></svg>',
    item: '<svg viewBox="0 0 48 48"><path d="M24 4l5 13h14l-11 8 4 14-12-8-12 8 4-14L5 17h14z" fill="currentColor"/></svg>',
  };
  I.ICONS = ICONS;

  I.init = function (container) {
    // Smooth touch look defaults to on (older saves have no such key).
    if (G.Save && G.Save.data && typeof G.Save.set.lookSmooth !== 'boolean') G.Save.set.lookSmooth = true;
    root = document.createElement('div');
    root.id = 'touch';
    container.appendChild(root);
    joyBase = document.createElement('div'); joyBase.className = 'joy-base';
    joyKnob = document.createElement('div'); joyKnob.className = 'joy-knob';
    joyBase.appendChild(joyKnob); root.appendChild(joyBase);
    joyBase.hidden = true;
    const all = new Set(); Object.values(LAYOUTS).forEach(l => l.forEach(b => all.add(b)));
    all.forEach(id => {
      const b = document.createElement('div');
      b.className = 'tbtn tb-' + id;
      b.innerHTML = '<span class="ico">' + (ICONS[id] || '') + '</span><span class="cd"></span>';
      b.dataset.btn = id;
      b.hidden = true;
      root.appendChild(b);
      btns[id] = b;
    });
    // Touch: everything goes through pointer events on the layer.
    root.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onUp, { passive: false });
    root.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('touchmove', e => { if (I.layout !== 'menu' && I.layout !== 'none') e.preventDefault(); }, { passive: false });
    // Keyboard / mouse
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', e => { keys.delete(e.code); });
    window.addEventListener('blur', () => { keys.clear(); inp.fire = false; });
    // Real mouse use switches to keyboard/mouse (also on touch laptops, after a tap). Pointer events carry the
    // device type, so the compatibility mouse events a tap produces never count; movement needs a few px.
    window.addEventListener('pointerdown', e => {
      if (!e.isTrusted) return;
      if (e.pointerType === 'mouse') setDevice('desktop');
      else if (e.pointerType === 'touch' || e.pointerType === 'pen') setDevice('touch');
    }, { capture: true, passive: true });
    // (moves are measured from the last known cursor position: the synthetic move a browser sends when the
    // page changes under a resting cursor has no distance; moves are coalesced per frame, so the window is wide)
    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !e.isTrusted) return;
      const now = performance.now(), has = mouseLast.t > 0;
      const d = has ? Math.abs(e.clientX - mouseLast.x) + Math.abs(e.clientY - mouseLast.y) : Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
      if (!has || now - mouseLast.t > 1000) mouseLast.acc = 0;
      mouseLast.x = e.clientX; mouseLast.y = e.clientY; mouseLast.t = now;
      if (inp.device === 'desktop') { mouseLast.acc = 0; return; }
      mouseLast.acc += d;
      if (mouseLast.acc >= 6) { mouseLast.acc = 0; setDevice('desktop'); }
    }, { capture: true, passive: true });
    window.addEventListener('gamepadconnected', () => { GP.seen = true; });
    window.addEventListener('mousemove', e => {
      if (I.layout === 'menu' || I.layout === 'none') return;
      if (document.pointerLockElement) { inp.lookDX += e.movementX; inp.lookDY += e.movementY; }
      else if (I.noLock && dragLook && e.buttons) { inp.lookDX += e.clientX - dragLook.x; inp.lookDY += e.clientY - dragLook.y; dragLook.x = e.clientX; dragLook.y = e.clientY; }
    });
    window.addEventListener('mousedown', e => {
      if (inp.device !== 'desktop' || I.layout === 'menu' || I.layout === 'none') return;
      if (e.target && e.target.closest && e.target.closest('#ui .panel, #ui button, #ui .modal')) return;
      if (!document.pointerLockElement && !I.noLock) { I._clickLock = true; I.lock(); dragLook = { x: e.clientX, y: e.clientY }; return; }
      dragLook = { x: e.clientX, y: e.clientY };
      if (e.button === 0) { inp.fire = true; inp.fireP = true; }
      if (e.button === 2) inp.aim = true;
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) inp.fire = false; if (e.button === 2) inp.aim = false; dragLook = null; });
    window.addEventListener('wheel', e => { if (document.pointerLockElement) inp.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockerror', () => { if (I._clickErr) I.noLock = true; });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && I.layout !== 'menu' && I.layout !== 'none' && inp.device === 'desktop' && I._wantLock) {
        inp.pauseP = true; // Esc released the lock: open pause.
      }
      I._wantLock = !!document.pointerLockElement;
    });
  };
  I.lock = function () {
    if (inp.device !== 'desktop') return;
    // Pointer lock is optional (some embeds refuse it): fall back to click-drag look.
    // Only a refusal of a click-initiated request switches to the fallback.
    const fromClick = I._clickLock; I._clickLock = false;
    try {
      const p = G.R.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { if (fromClick) I.noLock = true; });
    } catch (e) { if (fromClick) I.noLock = true; }
  };
  I.unlock = function () { I._wantLock = false; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ } };

  I.setLayout = function (name) {
    I.layout = name;
    const list = LAYOUTS[name] || [];
    for (const id in btns) {
      const b = btns[id];
      b.hidden = !(inp.device === 'touch' && list.includes(id));
      // cooldown state starts over with each layout: a button that is ready when it (re)appears never flashes
      b._ready = undefined; clearTimeout(b._cdT); b.classList.remove('cd-done');
    }
    root.classList.toggle('active', name !== 'menu' && name !== 'none');
    root.dataset.layout = name;
    resetTouch();
    if (name === 'menu' || name === 'none') I.unlock();
  };
  I.show = function (id, on) {
    const b = btns[id]; if (!b) return;
    const hide = !(on && inp.device === 'touch' && (LAYOUTS[I.layout] || []).includes(id));
    if (b.hidden !== hide) b.hidden = hide;
  };
  I.btn = id => btns[id];
  // Cooldown fill 0..1 (1 = ready) and optional label on a button. Written only on change (called every
  // frame). .ready is the state; .cd-done is added for one flash only on the frame a running cooldown
  // completes (style.css), never when a button starts out ready or re-appears.
  I.setCooldown = function (id, frac, label) {
    const b = btns[id]; if (!b) return;
    frac = frac >= 1 ? 1 : frac > 0 ? frac : 0;
    const v = (1 - frac).toFixed(3);
    if (b._cdv !== v) { b._cdv = v; b.style.setProperty('--cd', v); }
    const ready = frac >= 1;
    if (ready !== b._ready) {
      clearTimeout(b._cdT);
      if (ready && b._ready === false) { b.classList.add('cd-done'); b._cdT = setTimeout(() => b.classList.remove('cd-done'), 560); }
      else b.classList.remove('cd-done');
      b._ready = ready;
      b.classList.toggle('ready', ready);
    }
    const cd = b._cdEl || (b._cdEl = b.querySelector('.cd'));
    if (cd && cd._l !== label) { cd.textContent = label || ''; cd._l = label; }
  };
  I.setIcon = function (id, html) { const b = btns[id]; if (b) b.querySelector('.ico').innerHTML = html; };

  function resetTouch() {
    joyId = lookId = fireId = null; inp.move.x = inp.move.y = 0; inp.fire = false; inp.touchFiring = false;
    inp.jump = inp.slide = inp.boost = inp.brake = false; inp.steer = 0;
    if (joyBase) joyBase.hidden = true;
    for (const id in btns) btns[id].classList.remove('down');
    lsFlush();
  }
  I.reset = resetTouch;

  const mouseLast = { x: 0, y: 0, t: 0, acc: 0 };
  function setDevice(d) {
    if (inp.device === d) return;
    const was = inp.device;
    inp.device = d;
    if (was === 'gamepad') padRelease();
    if (was === 'desktop') { keys.clear(); inp.fire = false; inp.aim = false; dragLook = null; }
    if (d === 'gamepad') I.unlock();   // no captured mouse while playing on a pad
    I.setLayout(I.layout);
    G.bus.emit('device', d);
  }
  I.setDevice = setDevice;

  function onDown(e) {
    if (e.pointerType === 'mouse') return; // mouse handled separately
    setDevice('touch');
    e.preventDefault();
    const t = e.target.closest ? e.target.closest('.tbtn') : null;
    const lp = G.Screen ? G.Screen.toLocal(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
    const x = lp.x, y = lp.y;
    if (t && !t.hidden) {
      const id = t.dataset.btn;
      t.classList.add('down');
      t._pid = e.pointerId;
      press(id, true);
      // Right-thumb buttons double as look pads so the thumb never has to lift. (The path is only
      // pinned when no other look finger is live: pinning mid-drag would stall it for a frame.)
      if (LOOKPAD.has(id) && fireId === null) { fireId = e.pointerId; fireLX = x; fireLY = y; if (lookId === null) lsAnchor(lsStamp(e)); }
      return;
    }
    const W = G.Screen ? G.Screen.w() : window.innerWidth;
    const left = G.Save.set.leftHanded ? x > W * 0.55 : x < W * 0.45;
    if (I.layout === 'race') {
      if (joyId === null) { joyId = e.pointerId; joyCx = x; joyCy = y; showJoy(x, y); }
      return;
    }
    if (left && joyId === null) {
      joyId = e.pointerId; joyCx = x; joyCy = y; showJoy(x, y);
    } else if (lookId === null) {
      lookId = e.pointerId; lookX = x; lookY = y; if (fireId === null) lsAnchor(lsStamp(e));
    }
  }
  function showJoy(x, y) {
    joyBase.hidden = false;
    joyBase.style.transform = 'translate(' + (x - JOY_R) + 'px,' + (y - JOY_R) + 'px)';
    joyKnob.style.transform = 'translate(0px,0px)';
  }
  function onMove(e) {
    if (e.pointerType === 'mouse') return;
    const lp = G.Screen ? G.Screen.toLocal(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
    const x = lp.x, y = lp.y;
    if (e.pointerId === joyId) {
      e.preventDefault();
      let dx = x - joyCx, dy = y - joyCy;
      const d = Math.hypot(dx, dy);
      // Floating: drag the base along when the thumb goes far past the edge.
      if (d > JOY_R * 1.3) { const k = (d - JOY_R * 1.3) / d; joyCx += dx * k; joyCy += dy * k; dx = x - joyCx; dy = y - joyCy; showJoy(joyCx, joyCy); }
      const dd = Math.hypot(dx, dy);
      const cl = Math.min(dd, JOY_R);
      const nx = dd > 0 ? dx / dd : 0, ny = dd > 0 ? dy / dd : 0;
      joyKnob.style.transform = 'translate(' + (nx * cl) + 'px,' + (ny * cl) + 'px)';
      let mag = cl / JOY_R; mag = mag < 0.12 ? 0 : (mag - 0.12) / 0.88;
      inp.move.x = nx * mag; inp.move.y = -ny * mag;
      inp.sprint = dd > JOY_R * 1.05;
      inp.steer = G.util.clamp(dx / JOY_R, -1, 1);
    } else if (e.pointerId === lookId) {
      e.preventDefault();
      touchLook(e, lookX, lookY, 1.0, setLook);
    } else if (e.pointerId === fireId) {
      e.preventDefault();
      // Dragging on the fire button aims at the same time (CoD-mobile style).
      touchLook(e, fireLX, fireLY, 0.9, setFireLook);
    }
  }
  function onUp(e) {
    if (e.pointerType === 'mouse') return;
    if (e.pointerId === joyId) { joyId = null; joyBase.hidden = true; inp.move.x = inp.move.y = 0; inp.sprint = false; inp.steer = 0; }
    if (e.pointerId === lookId) lookId = null;
    if (e.pointerId === fireId) fireId = null;
    for (const id in btns) {
      const b = btns[id];
      if (b._pid === e.pointerId) { b._pid = null; b.classList.remove('down'); press(id, false); }
    }
  }
  function press(id, down) {
    switch (id) {
      case 'fire': inp.fire = down; inp.touchFiring = down; if (down) inp.fireP = true; break;
      case 'jump': inp.jump = down; if (down) inp.jumpP = true; break;
      case 'slide': case 'swim': inp.slide = down; if (down) inp.slideP = true; break;
      case 'reload': if (down) inp.reloadP = true; break;
      case 'swap': if (down) inp.swapP = true; break;
      case 'ability': if (down) inp.abilityP = true; break;
      case 'gadget': if (down) inp.gadgetP = true; break;
      case 'interact': if (down) inp.interactP = true; break;
      case 'pause': if (down) inp.pauseP = true; break;
      case 'ping': if (down) inp.pingP = true; break;
      case 'boost': inp.boost = down; break;
      case 'brake': inp.brake = down; break;
      case 'item': inp.item = down; if (down) inp.itemP = true; break;
    }
    if (down && G.Audio && G.Audio.unlock) G.Audio.unlock();
  }

  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if (!e.repeat) setDevice('desktop');
    if (G.Audio && G.Audio.unlock) G.Audio.unlock();
    const c = e.code;
    if (!keys.has(c)) {
      if (c === 'Space') inp.jumpP = true;
      if (c === 'KeyC' || c === 'ControlLeft') inp.slideP = true;
      if (c === 'KeyE' || c === 'KeyF') inp.interactP = true;
      if (c === 'KeyR') inp.reloadP = true;
      if (c === 'KeyQ') inp.abilityP = true;
      if (c === 'KeyG') inp.gadgetP = true;
      if (c === 'KeyX') inp.swapP = true;
      if (c === 'KeyZ' || c === 'KeyV') inp.pingP = true;
      if (c === 'KeyM' || c === 'Tab') inp.mapP = true;
      if (c === 'Escape' || c === 'KeyP') inp.pauseP = true;
      if (c === 'KeyB') inp.itemP = true;
      if (/^Digit[1-6]$/.test(c)) inp.slotP = +c.slice(5) - 1;
    }
    keys.add(c);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(c) && I.layout !== 'menu') e.preventDefault();
  }

  // ---------------------------------------------------------------- gamepad
  // Standard mapping: A jump · B slide/crouch · X use (when something is in reach) else reload · Y swap ·
  // RT fire · LT ability (no weapon zooms on a trigger; also sets inp.aim) · LB gadget · RB ability ·
  // Back map · Start pause · L3 sprint (latched until the stick is let go; a fully pushed stick sprints too)
  // · R3 ping · D-pad weapon slots 1-4 (up, right, down, left). Race: A / RT boost, B / LT brake, X / Y item,
  // RB blaster. Sticks: radial dead zone 0.15 and response exponent 1.6 (GDD §4.3); look speed = gpSens.
  // While a menu is open the pad only navigates the top screen (see menu focus below).
  // Polled from I.poll every frame once a pad has been seen (every ~0.5 s before that), and only the
  // active device writes held states: a pad press switches inp.device to 'gamepad' first.
  const PAD_DEAD = 0.15, PAD_EXP = 1.6, TRIG = 0.35;
  const PAD_YAW = 3.4, PAD_PITCH = 2.3;          // rad/s at full tilt and gpSens 1
  const PAD_K = 0.0022;                          // 12_player look(): rad per look px for non-touch input
  const NB = 17;
  const GP = {
    seen: false, connected: false, scan: 0, id: '',
    cur: new Uint8Array(NB), prev: new Uint8Array(NB),
    lx: 0, ly: 0, lm: 0, rx: 0, ry: 0, rm: 0, lt: 0, rt: 0,
    sprintLatch: false, menu: false,
    nav: '', navT: 0, focus: null, focusSig: '', focusIdx: -1, focusWrap: null,
  };
  I.pad = GP;
  function readPad() {
    let pads = null;
    try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { pads = null; }
    if (!pads) return null;
    let best = null;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (!p || p.connected === false || !p.buttons || !p.axes) continue;
      if (!best || (p.mapping === 'standard' && best.mapping !== 'standard')) best = p;
    }
    return best;
  }
  const btnOn = (b, thr) => !!b && (b.pressed || (typeof b.value === 'number' && b.value > thr));
  // radial dead zone, rescaled to 0..1 (writes GP[ox], GP[oy], GP[om])
  function stickRead(x, y, ox, oy, om) {
    x = +x || 0; y = +y || 0;
    const m = Math.hypot(x, y);
    if (m <= PAD_DEAD) { GP[ox] = GP[oy] = GP[om] = 0; return; }
    const mm = Math.min(1, (m - PAD_DEAD) / (1 - PAD_DEAD));
    GP[ox] = x / m * mm; GP[oy] = y / m * mm; GP[om] = mm;
  }
  const edge = i => GP.cur[i] && !GP.prev[i];
  // Leaving the pad (another device, a menu, a disconnect): nothing it held stays down.
  function padRelease() {
    inp.fire = inp.jump = inp.slide = inp.sprint = inp.aim = inp.boost = inp.brake = inp.item = false;
    inp.move.x = inp.move.y = 0; inp.steer = 0; GP.sprintLatch = false;
  }
  function pollPad() {
    if (!GP.seen && GP.scan-- > 0) return;
    GP.scan = 30;
    const pad = readPad();
    if (!pad) {
      if (GP.connected) {
        GP.connected = false; GP.cur.fill(0); GP.prev.fill(0); GP.lx = GP.ly = GP.lm = GP.rx = GP.ry = GP.rm = GP.lt = GP.rt = 0;
        if (G.UI && G.UI.toast) G.UI.toast(G.t('pad.off'));
        if (inp.device === 'gamepad') {
          // a pad unplugged mid-play pauses (like a dropped call), then the screen's own device takes over
          if (G.Game && G.Game.mode && !(G.UI && G.UI.anyOpen())) inp.pauseP = true;
          setDevice(G.isTouch ? 'touch' : 'desktop');
        }
      }
      return;
    }
    GP.seen = true;
    if (!GP.connected) { GP.connected = true; GP.id = String(pad.id || ''); GP.prev.fill(0); if (G.UI && G.UI.toast && G.Game && G.Game.mode) G.UI.toast(G.t('pad.on')); }
    const B = pad.buttons, A = pad.axes;
    for (let i = 0; i < NB; i++) GP.cur[i] = btnOn(B[i], i === 6 || i === 7 ? TRIG : 0.5) ? 1 : 0;
    GP.lt = B[6] ? +B[6].value || (B[6].pressed ? 1 : 0) : 0; GP.rt = B[7] ? +B[7].value || (B[7].pressed ? 1 : 0) : 0;
    const lm0 = GP.lm, rm0 = GP.rm;
    stickRead(A[0], A[1], 'lx', 'ly', 'lm'); stickRead(A[2], A[3], 'rx', 'ry', 'rm');
    let press = false;
    for (let i = 0; i < NB; i++) if (GP.cur[i] && !GP.prev[i]) { press = true; break; }
    // a stick counts only as it is pushed past 0.6 (a worn stick resting off-centre must not keep stealing the device)
    const push = (GP.lm > 0.6 && lm0 <= 0.6) || (GP.rm > 0.6 && rm0 <= 0.6);
    if (inp.device !== 'gamepad' && (press || push)) setDevice('gamepad');
    if (inp.device === 'gamepad') {
      const menu = I.layout === 'menu' || I.layout === 'none' || !!(G.UI && G.UI.anyOpen());
      if (menu !== GP.menu) { GP.menu = menu; padRelease(); GP.nav = ''; if (!menu) focusRing(null); }
      if (menu) padMenu(); else padPlay();
    }
    GP.prev.set(GP.cur);
  }
  function padPlay() {
    const dt = Math.min(0.05, G.time && G.time.realDt > 0 ? G.time.realDt : 1 / 60);
    const s = G.Save && G.Save.data ? G.Save.set : null;
    // move: left stick (sprint latch on L3, released when the stick is let go)
    inp.move.x = GP.lx; inp.move.y = -GP.ly; inp.steer = GP.lx;
    if (edge(10)) GP.sprintLatch = true;
    if (GP.lm < 0.3) GP.sprintLatch = false;
    inp.sprint = GP.sprintLatch || GP.lm > 0.95;
    if (I.layout === 'race') {
      inp.boost = !!GP.cur[0] || GP.rt > TRIG;
      inp.brake = !!GP.cur[1] || GP.lt > TRIG;
      inp.item = !!(GP.cur[2] || GP.cur[3]);
      if (edge(2) || edge(3)) inp.itemP = true;
      inp.fire = !!GP.cur[5];
      if (edge(5)) inp.fireP = true;
      inp.move.y = inp.boost ? 1 : 0;
    } else {
      const fire = GP.rt > TRIG;
      if (fire && !inp.fire) inp.fireP = true;
      inp.fire = fire;
      inp.aim = GP.lt > TRIG;
      inp.jump = !!GP.cur[0]; if (edge(0)) inp.jumpP = true;
      inp.slide = !!GP.cur[1]; if (edge(1)) inp.slideP = true;
      if (edge(2)) { const pl = G.Game && G.Game.world && G.Game.world.player; if (pl && pl.near) inp.interactP = true; else inp.reloadP = true; }
      if (edge(3)) inp.swapP = true;
      if (edge(4)) inp.gadgetP = true;
      if (edge(5) || edge(6)) inp.abilityP = true;
      if (edge(11)) inp.pingP = true;
      if (edge(12)) inp.slotP = 0; else if (edge(15)) inp.slotP = 1; else if (edge(13)) inp.slotP = 2; else if (edge(14)) inp.slotP = 3;
      inp.boost = inp.brake = inp.item = false;
    }
    if (edge(8)) inp.mapP = true;
    if (edge(9)) inp.pauseP = true;
    // look: right stick, curved, in rad/s (independent of the mouse sensitivity), handed out as look px
    if (GP.rm > 0) {
      const sens = s ? s.sens || 1 : 1, gs = s && s.gpSens > 0 ? s.gpSens : 1;
      const k = Math.pow(GP.rm, PAD_EXP) / GP.rm;
      inp.lookDX += GP.rx * k * PAD_YAW * gs * dt / (PAD_K * sens);
      inp.lookDY += GP.ry * k * PAD_PITCH * gs * dt / (PAD_K * sens);
    }
  }

  // ---------------------------------------------------------------- menu focus (gamepad)
  // D-pad / left stick move a visible focus ring between the pressables of the top screen (spatial: the
  // nearest one in that direction in the game frame, so it also works on a rotated phone frame); A presses,
  // B goes back (the screen's own close / cancel button, or closes it when Esc may), LB / RB switch tabs,
  // left / right step sliders and cycle selects, the right stick scrolls, Start acts like Esc.
  // (.mm-tap is the title's "Tap to play" line, a tappable div: it is the pad's default there)
  const FOCUS_SEL = 'button, [role="switch"], select, input, textarea, [tabindex]:not([tabindex="-1"]), .clickable, .card.clickable, .mm-card.clickable, .mm-slot, .mm-socket, .mm-tap, [data-pad]';
  const BACK_SEL = '[data-snd="back"], [data-i18n="ui.cancel"], [data-i18n="ui.back"], [data-i18n="ui.close"], [data-i18n="ui.no"]';
  function topWrap() {
    const st = G.UI && G.UI.stack; if (!st || !st.length) return null;
    for (let i = st.length - 1; i >= 0; i--) if (st[i].def && st[i].def.modal && st[i].el && st[i].el.isConnected) return st[i];
    const t = st[st.length - 1];
    return t && t.el && t.el.isConnected ? t : null;
  }
  const loc = r => (G.Screen && G.Screen.rectToLocal ? G.Screen.rectToLocal(r) : r);
  function usable(e) {
    if (!e || e.disabled || e.hidden || e.closest('[hidden], .ui-ghost, [inert]')) return false;
    if (e.matches('input[type=hidden]')) return false;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }
  function focusables(wrap) {
    const out = [];
    const all = wrap.querySelectorAll(FOCUS_SEL);
    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      if (e.parentElement && e.parentElement.closest(FOCUS_SEL) && !e.matches('input, select, textarea')) continue;   // nested inside another pressable
      if (usable(e)) out.push(e);
    }
    return out;
  }
  // identity of a control that survives a rebuild of its screen: tag, label key, id and visible text
  function sigOf(e) {
    const k = e.querySelector && e.querySelector('[data-i18n]');
    return e.tagName + '|' + (e.getAttribute('data-i18n') || (k ? k.getAttribute('data-i18n') : '') || '') + '|' + (e.id || '') + '|' + (e.getAttribute('aria-label') || '') + '|' + (e.textContent || '').trim().slice(0, 40);
  }
  function focusRing(e) {
    const old = GP.focus;
    if (old && old !== e) old.classList.remove('gp-focus');
    GP.focus = e || null;
    if (!e) return;
    e.classList.add('gp-focus');
    // keep it in view: let the browser scroll the real scroll areas, then undo any scroll it gave to the
    // fixed frame (#app, the screen wrapper...), which must never move
    // (per axis: a list that scrolls vertically but clips sideways keeps its new scrollTop)
    const fixed = [];
    for (let n = e.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n), root = n === document.body || n === document.documentElement;
      const fy = root || (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll'), fx = root || (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll');
      if (fy || fx) fixed.push([n, fy ? n.scrollTop : -1, fx ? n.scrollLeft : -1]);
    }
    try { e.focus({ preventScroll: true }); } catch (err) { /* old engines */ }
    try { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (err) { /* ok */ }
    for (const f of fixed) { if (f[1] >= 0 && f[0].scrollTop !== f[1]) f[0].scrollTop = f[1]; if (f[2] >= 0 && f[0].scrollLeft !== f[2]) f[0].scrollLeft = f[2]; }
  }
  // the focused control's identity, also kept on its screen entry so closing a screen on top of it lands back there
  function remember(list) { if (GP.focus) { GP.focusSig = sigOf(GP.focus); GP.focusIdx = list.indexOf(GP.focus); if (GP.focusWrap) GP.focusWrap._gpSig = GP.focusSig; } }
  function initialFocus(list) {
    const pick = sel => list.find(e => e.matches(sel));
    return pick('[data-pad="default"], .mm-tap') || pick('.btn.go.big') || pick('.btn.primary.big') || pick('.btn.go') || pick('.btn.primary') || list.find(e => !e.matches(BACK_SEL) && !e.closest('.panel-head')) || list[0];
  }
  function ensureFocus(wrap) {
    if (GP.focus && GP.focus.isConnected && wrap.el.contains(GP.focus) && usable(GP.focus)) return null;
    const list = focusables(wrap.el); if (!list.length) { focusRing(null); return list; }
    // after a rebuild (tab switch, refresh) land on the same control, else the same position; back on a screen
    // that was covered, on the control it had; else the default
    let e = null;
    const same = GP.focusWrap === wrap, sig = same ? GP.focusSig : wrap._gpSig;
    if (sig) e = list.find(x => sigOf(x) === sig) || null;
    if (!e && same && GP.focusIdx >= 0) e = list[Math.min(GP.focusIdx, list.length - 1)];
    focusRing(e || initialFocus(list));
    GP.focusWrap = wrap;
    remember(list);
    return list;
  }
  // Spatial move: up / down go to the nearest row in that direction (then the control in it closest to the
  // current one horizontally), left / right stay in the same row when there is something there.
  function moveFocus(wrap, dir) {
    const list = focusables(wrap.el), cur = GP.focus;
    if (!cur) return;
    const a = loc(cur.getBoundingClientRect()), acx = (a.left + a.right) / 2, acy = (a.top + a.bottom) / 2;
    const vert = dir === 'up' || dir === 'down', cand = [];
    let minA = Infinity;
    for (const e of list) {
      if (e === cur) continue;
      const b = loc(e.getBoundingClientRect()), bcx = (b.left + b.right) / 2, bcy = (b.top + b.bottom) / 2;
      let along, across;
      if (dir === 'down') { if (bcy <= acy + 2) continue; along = Math.max(0, b.top - a.bottom); across = Math.abs(bcx - acx); }
      else if (dir === 'up') { if (bcy >= acy - 2) continue; along = Math.max(0, a.top - b.bottom); across = Math.abs(bcx - acx); }
      else if (dir === 'right') { if (bcx <= acx + 2) continue; along = Math.max(0, b.left - a.right); across = Math.max(0, a.top - b.bottom, b.top - a.bottom); }
      else { if (bcx >= acx - 2) continue; along = Math.max(0, a.left - b.right); across = Math.max(0, a.top - b.bottom, b.top - a.bottom); }
      cand.push({ e, along, across, cd: vert ? 0 : Math.abs(bcy - acy) });
      if (along < minA) minA = along;
    }
    let best = null, bestS = Infinity;
    if (vert) {
      const band = minA + Math.max(8, (a.bottom - a.top) * 0.5);
      for (const c of cand) if (c.along <= band && c.across < bestS) { bestS = c.across; best = c.e; }
    } else {
      for (const c of cand) if (c.across === 0 && c.along + c.cd * 0.1 < bestS) { bestS = c.along + c.cd * 0.1; best = c.e; }
      if (!best) for (const c of cand) if (c.along + c.across * 2 < bestS) { bestS = c.along + c.across * 2; best = c.e; }
    }
    if (best) { focusRing(best); remember(list); if (G.Audio && G.Audio.sfx) G.Audio.sfx('tab'); }
  }
  function stepValue(e, d) {
    if (e.matches('input[type=range]')) {
      const st = +e.step || 0.05, mn = e.min !== '' ? +e.min : 0, mx = e.max !== '' ? +e.max : 1;
      const v = Math.min(mx, Math.max(mn, Math.round(((+e.value) + d * st) / st) * st));
      if (Math.abs(v - +e.value) < 1e-9) return true;
      e.value = String(+v.toFixed(4));
      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
      if (G.Audio && G.Audio.sfx) G.Audio.sfx('tab');
      return true;
    }
    if (e.tagName === 'SELECT') {
      const n = e.options.length; if (!n) return true;
      let i = e.selectedIndex;
      for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!e.options[i].disabled) break; }
      if (i !== e.selectedIndex) { e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })); if (G.Audio && G.Audio.sfx) G.Audio.sfx('tab'); }
      return true;
    }
    return false;
  }
  function pressFocus(wrap) {
    if (ensureFocus(wrap)) return;
    const e = GP.focus; if (!e) return;
    remember(focusables(wrap.el));
    if (e.tagName === 'SELECT') { stepValue(e, 1); return; }
    if (e.matches('input[type=range]')) return;
    if (e.matches('textarea, input[type=text], input:not([type])')) { try { e.focus(); } catch (err) { /* ok */ } return; }
    e.click();
  }
  function goBack(entry) {
    if (!entry) return;
    const w = entry.el;
    const b = w.querySelector(BACK_SEL);
    const btn = b && (b.closest('button, .btn') || b);
    if (btn && usable(btn)) { btn.click(); return; }
    if (entry.def && entry.def.escClose === false) return;
    G.UI.close(entry);
  }
  function switchTab(wrap, d) {
    const on = wrap.el.querySelector('.tab.on, .mm-tab.on, .mm-subtab.on');
    if (!on || !on.parentElement) return;
    const tabs = Array.prototype.filter.call(on.parentElement.children, x => x.matches('.tab, .mm-tab, .mm-subtab') && usable(x));
    const i = tabs.indexOf(on), j = i + d;
    if (i < 0 || j < 0 || j >= tabs.length) return;
    GP.focusSig = sigOf(tabs[j]);
    tabs[j].click();
  }
  function padMenu() {
    const entry = topWrap();
    if (!entry) return;
    if (entry.id === 'hud-editor') { if (edge(1)) goBack(entry); return; }
    if (edge(9)) { inp.pauseP = true; return; }
    // direction with auto-repeat (first step at once, then after 0.38 s every 0.11 s)
    let dir = '';
    if (GP.cur[12] || GP.ly < -0.55) dir = 'up';
    else if (GP.cur[13] || GP.ly > 0.55) dir = 'down';
    else if (GP.cur[14] || GP.lx < -0.55) dir = 'left';
    else if (GP.cur[15] || GP.lx > 0.55) dir = 'right';
    const dt = Math.min(0.05, G.time && G.time.realDt > 0 ? G.time.realDt : 1 / 60);
    let fire = false;
    if (dir !== GP.nav) { GP.nav = dir; GP.navT = 0.38; fire = !!dir; }
    else if (dir) { GP.navT -= dt; if (GP.navT <= 0) { GP.navT = 0.11; fire = true; } }
    if (fire && !ensureFocus(entry)) {   // (the first press only shows the ring when there was none)
      const e = GP.focus;
      if (!(e && (dir === 'left' || dir === 'right') && stepValue(e, dir === 'left' ? -1 : 1))) moveFocus(entry, dir);
    }
    if (edge(0)) pressFocus(entry);
    else if (edge(1)) goBack(entry);
    else if (edge(4)) switchTab(entry, -1);
    else if (edge(5)) switchTab(entry, 1);
    // right stick scrolls the focused control's scroll area (long lists)
    if (Math.abs(GP.ry) > 0.2) {
      const from = GP.focus && entry.el.contains(GP.focus) ? GP.focus : entry.el.querySelector('.panel-body') || entry.el;
      for (let n = from; n && n !== entry.el.parentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) { n.scrollTop += GP.ry * 700 * dt; break; }
      }
    }
    // the focused control was rebuilt (a tab press, a refresh): find it again
    if (GP.focus && !GP.focus.isConnected) ensureFocus(entry);
  }
  // A menu opened while playing on a pad shows its focus ring straight away.
  G.bus.on('ui-open', () => { if (inp.device === 'gamepad') setTimeout(() => { const e = topWrap(); if (e && inp.device === 'gamepad' && e.id !== 'hud-editor') { GP.focusSig = ''; GP.focusIdx = -1; GP.focusWrap = null; focusRing(null); ensureFocus(e); } }, 0); });
  G.bus.on('ui-empty', () => { focusRing(null); GP.focusWrap = null; });
  G.bus.on('device', d => { if (d !== 'gamepad') focusRing(null); });

  // Called once per frame before game update: hands out the smoothed touch look, polls the gamepad and
  // folds keyboard state into the unified input. nowMs (optional, performance.now() clock) is for tests.
  I.poll = function (nowMs) {
    lsPoll(nowMs);
    G.safe ? G.safe('gamepad', pollPad) : pollPad();
    if (inp.device !== 'desktop') return;
    let x = 0, y = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    const l = Math.hypot(x, y) || 1;
    inp.move.x = x / l; inp.move.y = y / l;
    inp.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    inp.jump = keys.has('Space');
    inp.slide = keys.has('KeyC') || keys.has('ControlLeft');
    inp.boost = keys.has('ShiftLeft') || keys.has('Space');
    inp.brake = keys.has('KeyS') || keys.has('ArrowDown') || keys.has('KeyC');
    inp.steer = x;
    inp.item = keys.has('KeyB');
    if (I.layout === 'race') { inp.move.y = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0; }
  };
  I.endFrame = function () {
    inp.lookDX = 0; inp.lookDY = 0;
    inp.fireP = inp.jumpP = inp.slideP = inp.interactP = inp.reloadP = inp.swapP = inp.abilityP = inp.gadgetP = inp.pingP = inp.pauseP = inp.mapP = inp.itemP = false;
    inp.slotP = -1; inp.wheel = 0;
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 06_input.js]', e); }
// ---- 07_ui.js
try { (function () {
// DOM UI framework: element builder, screen registry with a stack, toasts, banners, loading, confirm,
// and the motion layer: screens spring in, closing screens leave an inert fading copy, tab taps slide
// the new tab body in, lists glide (FLIP), and every pressable gets a tactile press state.
(function (G) {
  const UI = G.UI = { defs: {}, stack: [] };
  const $ = id => document.getElementById(id);
  UI.$ = $;
  // Reduced motion: the in-game setting (mirrored on #app.reduced-motion for the CSS) or the OS one.
  const mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  UI.reduced = () => !!(G.Save && G.Save.set && G.Save.set.reducedMotion) || !!(mqReduce && mqReduce.matches);
  // element.animate() with a reduced-motion guard; returns the Animation (or null).
  UI.anim = function (node, frames, opts) {
    if (!node || typeof node.animate !== 'function' || UI.reduced()) return null;
    try { return node.animate(frames, opts); } catch (e) { return null; }
  };

  // el('div.card.sel', {onclick, style, attrs...}, children...)
  UI.el = function (sel, props, ...kids) {
    const m = sel.split('.');
    const tagAndId = m.shift().split('#');
    const e = document.createElement(tagAndId[0] || 'div');
    if (tagAndId[1]) e.id = tagAndId[1];
    if (m.length) e.className = m.join(' ');
    if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else if (k.startsWith('on') && typeof v === 'function') {
          const ev = k.slice(2).toLowerCase();
          if (ev === 'click' || ev === 'tap') bindTap(e, v); else e.addEventListener(ev, v);
        }
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'i18n') { e.setAttribute('data-i18n', v); e.textContent = G.t(v); }
        else if (k === 'cls') e.className += ' ' + v;
        else if (k === 'dataset') Object.assign(e.dataset, v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const k of kids.flat(3)) {
      if (k == null || k === false) continue;
      e.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return e;
  };
  // Fast, reliable tap for touch + mouse, with one UI sound per tap chosen after the handler ran:
  // nothing when the handler played its own sound (tab, error, buy, go...), 'uiOpen' when it opened a
  // screen, 'uiBack' for close / cancel / back buttons that only closed one, 'tab' on tabs, else 'ui'.
  let tapDepth = 0, uiOpened = 0, uiClosed = 0, escF = -1e9;
  const BACK_SEL = '[data-snd="back"], [data-i18n="ui.cancel"], [data-i18n="ui.back"], [data-i18n="ui.close"], [data-i18n="ui.no"]';
  function tapSound(e, mark, o0, c0) {
    const A = G.Audio;
    if (!A || !A.sfx) return;
    if (A._mark && A._mark() !== mark) return;               // the handler already made its own sound
    const opened = uiOpened > o0, closed = uiClosed > c0;
    const back = e.getAttribute('data-snd') === 'back' || (closed && !opened && (e.matches(BACK_SEL) || !!e.querySelector(BACK_SEL)));
    A.sfx(back ? 'uiBack' : opened ? 'uiOpen' : e.matches(TAB_SEL) ? 'tab' : 'ui');
  }
  function bindTap(e, fn) {
    e.addEventListener('click', ev => {
      ev.stopPropagation();
      const A = G.Audio, mark = A && A._mark ? A._mark() : -1, o0 = uiOpened, c0 = uiClosed;
      tapDepth++;
      try { fn(ev); } finally { tapDepth--; G.safe ? G.safe('tap sound', () => tapSound(e, mark, o0, c0)) : tapSound(e, mark, o0, c0); }
    });
  }
  // Esc (and P, its pause twin in 06_input) closes the top screen / opens the pause menu (10_world): the same
  // back / open sounds as a tap. The key counts for the next couple of game frames (a frame window, not a
  // wall-clock one): 10_world handles the key on the next loop however long that frame takes, so a slow phone
  // frame (or a hitch while the pause menu builds) can no longer swallow the sound.
  const KEY_FRAMES = 2;
  const frameNow = () => (G.time ? G.time.frame : 0);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' || (e.code === 'KeyP' && !e.repeat)) escF = frameNow(); }, true);
  function keySound(name) {
    if (tapDepth || frameNow() - escF > KEY_FRAMES) return;
    escF = -1e9;
    if (G.Audio && G.Audio.sfx) G.Audio.sfx(name);
  }
  const el = UI.el;

  UI.btn = function (labelKey, onClick, cls, opts) {
    opts = opts || {};
    const b = el('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), { onclick: onClick, type: 'button' });
    if (opts.icon) b.appendChild(el('span', { html: opts.icon, style: { display: 'inline-flex' } }));
    if (labelKey) b.appendChild(opts.raw ? document.createTextNode(labelKey) : el('span', { i18n: labelKey }));
    if (opts.disabled) b.disabled = true;
    if (opts.title) b.setAttribute('aria-label', opts.title);
    return b;
  };
  UI.closeBtn = function (onClick) {
    return el('button.btn.icon', { onclick: onClick, type: 'button', 'data-snd': 'back', 'aria-label': G.t('ui.close'), html: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>' });
  };
  UI.money = function (n, cls) { return el('span.money' + (cls ? '.' + cls : ''), el('i.coin'), el('b', { text: G.i18n.num(n) })); };

  // Register a screen: def = {build(params, close) => Element, modal?:bool, dim?:bool, onClose?(params),
  //   enter?: 'pop' (default: backdrop fades, content springs in, lists cascade) | 'fade' (full-bleed
  //   roots: no scale) | 'none'}. Roots positioned absolute (inline style) are treated as 'fade'.
  UI.def = function (id, def) { UI.defs[id] = def; };
  const ENTER_MS = 650, GHOST_MS = 200;
  // Open a screen on top of the stack. Returns the root element.
  UI.open = function (id, params) {
    const def = UI.defs[id];
    if (!def) { console.warn('no screen', id); return null; }
    params = params || {};
    const wrap = el('div.screen' + (def.dim !== false ? '.dim' : '') + (def.passthrough ? '.passthrough' : ''), { 'data-screen': id });
    const entry = { id, params, el: wrap, def };
    const close = () => UI.close(entry);
    let content;
    try { content = def.build(params, close, entry); } catch (e) { console.error('screen build', id, e); content = el('div.panel.narrow', el('p', { text: 'Error: ' + e.message }), UI.btn('ui.close', close)); }
    if (content) wrap.appendChild(content);
    // Entrance (pure CSS, see style.css "Screen transitions"): input works from the first frame.
    if (def.enter !== 'none' && !UI.reduced()) {
      wrap.classList.add('ui-enter');
      if (def.enter === 'fade' || (content && content.style && content.style.position === 'absolute')) wrap.classList.add('ui-fb');
      wrap._enterT = setTimeout(() => wrap.classList.remove('ui-enter'), ENTER_MS);
      // Hand-over (one screen closes and the next opens in the same tap): the backdrop stays put. The
      // closing copy drops its backdrop and the new one is there from the first frame, so the scene
      // never dips darker (two half-faded dims stacked) and only one backdrop blur is ever drawn.
      if (dimmed(wrap)) {
        const gs = document.querySelectorAll('#ui .screen.ui-ghost');
        for (let k = 0; k < gs.length; k++) if (dimmed(gs[k])) { gs[k].classList.add('ui-handover'); wrap.classList.add('ui-keepbg'); }
      }
    }
    (def.modal ? $('modals') : $('screens')).appendChild(wrap);
    UI.stack.push(entry);
    uiOpened++;
    keySound('uiOpen');
    G.Input.setLayout('menu');
    $('ui').classList.add('ui-menu');
    G.bus.emit('ui-open', id);
    return wrap;
  };
  UI.close = function (entry) {
    if (!entry) entry = UI.stack[UI.stack.length - 1];
    else if (typeof entry === 'string') entry = UI.stack.slice().reverse().find(s => s.id === entry);
    if (!entry) return;
    const i = UI.stack.indexOf(entry);
    if (i < 0) return;
    UI.stack.splice(i, 1);
    uiClosed++;
    keySound('uiBack');
    retire(entry.el);
    if (entry.def.onClose) G.safe('onClose ' + entry.id, () => entry.def.onClose(entry.params));
    if (entry.params && entry.params.onClose) G.safe('params.onClose', () => entry.params.onClose());
    if (!UI.stack.length) { $('ui').classList.remove('ui-menu'); G.bus.emit('ui-empty'); }
  };
  // A closed screen is gone at once for every query (out of the stack, no data-screen, no ids, inert,
  // pointer-events none) but stays drawn where it was for GHOST_MS while it fades and shrinks away.
  function retire(w) {
    clearTimeout(w._enterT);
    if (!w.isConnected || UI.reduced()) { w.remove(); return; }
    w.removeAttribute('data-screen');
    if (w.id) w.removeAttribute('id');
    const ided = w.querySelectorAll('[id]');
    for (let k = 0; k < ided.length; k++) ided[k].removeAttribute('id');
    w.classList.remove('ui-enter', 'ui-tabswap', 'ui-selpop');
    w.classList.add('ui-ghost');
    w.setAttribute('inert', '');
    w.setAttribute('aria-hidden', 'true');
    setTimeout(() => w.remove(), GHOST_MS + 10);
  }
  const dimmed = w => w.classList.contains('dim') || w.classList.contains('mm-dim');
  UI.closeAll = function () { while (UI.stack.length) UI.close(); };
  UI.top = () => UI.stack[UI.stack.length - 1];
  UI.isOpen = id => UI.stack.some(s => s.id === id);
  UI.anyOpen = () => UI.stack.length > 0;
  // Rebuild the top screen in place (e.g. after buying something). Not an entrance: nothing replays,
  // except that a refresh caused by a tab tap slides the new tab body in, and one caused by picking a
  // card / language / slot pops the new selection.
  UI.refresh = function (entry) {
    entry = entry || UI.top(); if (!entry) return;
    const w = entry.el;
    if (w.classList.contains('ui-ghost')) return; // already closed: its fading copy stays as it was
    const close = () => UI.close(entry);
    const scrollers = Array.from(w.querySelectorAll('.panel-body')).map(n => n.scrollTop);
    if (w._enterT) { clearTimeout(w._enterT); w._enterT = 0; w.classList.remove('ui-enter'); }
    const h = takeHint(w);
    w.innerHTML = '';
    try { w.appendChild(entry.def.build(entry.params, close, entry)); } catch (e) { console.error('refresh', e); }
    w.querySelectorAll('.panel-body').forEach((n, i) => { if (scrollers[i]) n.scrollTop = scrollers[i]; });
    if (h) applyHint(w, h);
  };
  // What the last tap was (captured before the element's own click handler runs).
  let hint = null;
  const TAB_SEL = '.tab, .mm-tab, .mm-subtab';
  const PICK_SEL = '.mm-lang, .mm-preset, .mm-wchip, .mm-slot, .mm-socket, .mm-card.clickable, .card.clickable, .ex-card';
  window.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t || !t.closest('#ui')) return;
    const tab = t.closest(TAB_SEL);
    if (tab) {
      if (tab.classList.contains('on')) return;
      const h = hint = { kind: 'tab', at: performance.now(), wrap: tab.closest('.screen'), dx: 22, dy: 0 };
      // slide from the side of the tapped tab, along the strip's axis (vertical rail or horizontal row)
      const sibs = tab.parentElement ? tab.parentElement.children : [];
      for (let k = 0; k < sibs.length; k++) {
        const s = sibs[k];
        if (s === tab || !s.classList.contains('on')) continue;
        const dx = tab.offsetLeft - s.offsetLeft, dy = tab.offsetTop - s.offsetTop;
        if (Math.abs(dy) > Math.abs(dx)) { h.dx = 0; h.dy = dy > 0 ? 16 : -16; } else h.dx = dx >= 0 ? 22 : -22;
        break;
      }
      return;
    }
    const pick = t.closest(PICK_SEL);
    hint = pick ? { kind: 'pick', at: performance.now(), wrap: pick.closest('.screen') } : null;
  }, true);
  function takeHint(w) {
    const h = hint; hint = null;
    return h && h.wrap === w && performance.now() - h.at < 700 && !UI.reduced() ? h : null;
  }
  function applyHint(w, h) {
    const cls = h.kind === 'tab' ? 'ui-tabswap' : 'ui-selpop';
    if (h.kind === 'tab') { w.style.setProperty('--tab-dx', String(h.dx)); w.style.setProperty('--tab-dy', String(h.dy)); }
    w.classList.add(cls);
    clearTimeout(w['_' + cls]);
    w['_' + cls] = setTimeout(() => w.classList.remove(cls), 420);
  }

  // ---- Press state for every pressable (style.css .pressed) ----
  // Pointer events instead of :active: iOS only applies :active with touch listeners, and a drag that
  // becomes a scroll (native or the rotated-frame scroller below) must let go of the button. A quick
  // tap still shows the full squash (held for at least PRESS_MIN ms).
  const PRESS_SEL = '.btn, .tab, .toggle, .card.clickable, .mm-tab, .mm-big, .mm-qm, .mm-lang, .mm-preset, .mm-subtab, .mm-wchip, .mm-card.clickable, .mm-slot, .mm-socket, .mm-quickbtn, .mm-sugchip';
  const PRESS_MIN = 90;
  let pressEl = null, pressId = -1, pressX = 0, pressY = 0, pressT = 0, relEl = null, relT = 0;
  function unpress() { if (pressEl) pressEl.classList.remove('pressed'); pressEl = null; pressId = -1; }
  // a quick tap's delayed release must not let go of the next press (double taps, rapid +/- buttons)
  function flushRelease() { if (relEl) { clearTimeout(relT); relEl.classList.remove('pressed'); relEl = null; } }
  window.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const t = e.target && e.target.closest ? e.target.closest(PRESS_SEL) : null;
    if (!t || t.disabled || !t.closest('#ui') || t.closest('.ui-ghost')) return;
    flushRelease();
    unpress();
    pressEl = t; pressId = e.pointerId; pressX = e.clientX; pressY = e.clientY; pressT = performance.now();
    t.classList.add('pressed');
  }, { capture: true, passive: true });
  window.addEventListener('pointermove', e => {
    if (pressEl && e.pointerId === pressId && (Math.abs(e.clientX - pressX) > 12 || Math.abs(e.clientY - pressY) > 12)) unpress();
  }, { capture: true, passive: true });
  const release = e => {
    if (!pressEl || e.pointerId !== pressId) return;
    const left = PRESS_MIN - (performance.now() - pressT);
    if (left > 0 && e.type === 'pointerup') {
      flushRelease();
      relEl = pressEl; pressEl = null; pressId = -1;
      relT = setTimeout(() => { if (relEl) relEl.classList.remove('pressed'); relEl = null; }, left);
    } else unpress();
  };
  window.addEventListener('pointerup', release, { capture: true, passive: true });
  window.addEventListener('pointercancel', release, { capture: true, passive: true });

  // FLIP: children of `box` glide from where they were drawn to where `mutate` puts them (toasts,
  // kill feed, pickups). Measured in the game frame so it also works while the page is rotated; the
  // offset rides on the independent `translate` property, so entrance/exit transforms are untouched.
  function localTop(n) {
    const r = n.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return G.Screen && G.Screen.rectToLocal ? G.Screen.rectToLocal(r).top : r.top;
  }
  UI.flip = function (box, mutate) {
    if (!box || !box.firstElementChild || !box.isConnected || UI.reduced() || typeof box.firstElementChild.animate !== 'function') { mutate(); return; }
    const kids = Array.prototype.slice.call(box.children);
    const before = kids.map(localTop);
    mutate();
    for (const k of kids) if (k._flip) { k._flip.cancel(); k._flip = null; }
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      if (k.parentNode !== box || before[i] == null) continue;
      const now = localTop(k);
      if (now == null) continue;
      const dy = before[i] - now;
      if (Math.abs(dy) < 0.5) continue;
      try { k._flip = k.animate([{ translate: '0 ' + dy.toFixed(1) + 'px' }, { translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' }); } catch (e) { k._flip = null; }
    }
  };
  // Let an element play its CSS leave animation (.out), then remove it with its siblings gliding up.
  UI.leave = function (node, ms) {
    if (!node || !node.parentNode || node.classList.contains('out')) return;
    if (UI.reduced()) { node.remove(); return; }
    node.classList.add('out');
    setTimeout(() => { const box = node.parentNode; if (box) UI.flip(box, () => node.remove()); }, ms || 220);
  };
  // Standard panel scaffold.
  UI.panel = function (titleKey, close, body, opts) {
    opts = opts || {};
    const head = el('div.panel-head',
      opts.icon ? el('span', { html: opts.icon, style: { width: '36px', height: '36px', display: 'inline-flex' } }) : null,
      el('h2', titleKey ? (opts.raw ? { text: titleKey } : { i18n: titleKey }) : null),
      opts.headRight || null,
      close ? UI.closeBtn(close) : null);
    const b = el('div.panel-body', body);
    const p = el('div.panel' + (opts.narrow ? '.narrow' : ''), head, opts.top || null, b, opts.foot || null);
    if (opts.style) Object.assign(p.style, opts.style);
    return p;
  };

  // Toasts
  const recentToasts = new Map();
  UI.toast = function (text, opts) {
    opts = opts || {};
    // Drop exact repeats within 3 s (codex/quest spam) and keep the lane short.
    const nowT = performance.now();
    if (recentToasts.has(text) && nowT - recentToasts.get(text) < 3000) return null;
    recentToasts.set(text, nowT);
    if (recentToasts.size > 40) recentToasts.clear();
    const t = el('div.toast', opts.icon ? el('span', { html: opts.icon, style: { display: 'inline-flex', width: '22px', height: '22px' } }) : null, el('span', { text }));
    if (opts.color) t.style.background = opts.color;
    const box = $('toasts');
    const play = toastPlayLane();
    // In play only 2 fit above the crosshair: later ones wait their turn instead of being dropped (and all wait while a
    // banner holds the lane).
    if (play && (bannerHeld || box.querySelectorAll('.toast:not(.out)').length >= 2)) {
      toastQ.push({ t, opts });
      while (toastQ.length > 6) toastQ.shift();
      return t;
    }
    showToast(box, t, opts, play);
    return t;
  };
  const toastQ = [];
  let bannerHeld = false;   // (UI.banner: holdToasts)
  // New toasts spring in; the others glide to make room; extra ones bow out (fade) instead of vanishing.
  function showToast(box, t, opts, play) {
    const lim = play ? 2 : 3;
    UI.flip(box, () => {
      box.appendChild(t);
      let live = 0;
      for (let n = box.lastElementChild; n; n = n.previousElementSibling) if (!n.classList.contains('out') && ++live > lim) dismissToast(n);
      while (box.children.length > lim + 2) box.firstChild.remove();
      placeToasts(box, play);
    });
    const dur = opts.dur || 2200;
    t._end = performance.now() + dur; t._tm = setTimeout(() => dismissToast(t), dur);
  }
  function dismissToast(t) {
    if (!t.parentNode || t.classList.contains('out')) return;
    t.classList.add('out');
    setTimeout(() => {
      const box = t.parentNode;
      if (box) UI.flip(box, () => t.remove());
      pumpToasts();
    }, UI.reduced() ? 0 : 240);
  }
  function pumpToasts() {
    if (!toastQ.length) return;
    const box = $('toasts'), play = toastPlayLane();
    if (play && (bannerHeld || box.querySelectorAll('.toast:not(.out)').length >= 2)) return;
    const n = toastQ.shift();
    showToast(box, n.t, n.opts, play);
  }
  // In play (HUD up, no menu over it) toasts use a compact lane under the top-centre HUD,
  // between the top-left column (vitals/objective) and the top-right one (minimap), and never
  // reach down to the crosshair: at most 2 at once (more wait in toastQ), and the oldest goes
  // early if a tall top-centre HUD pushes the lane too low.
  function toastPlayLane() {
    return !!(G.HUD && G.HUD.visible && !UI.stack.some(s => !s.def.passthrough));
  }
  function localRect(n) {
    if (!n || n.hidden || !n.getClientRects().length) return null;
    const r = G.Screen && G.Screen.rectToLocal ? G.Screen.rectToLocal(n.getBoundingClientRect()) : n.getBoundingClientRect();
    return r.right - r.left > 0 && r.bottom - r.top > 0 ? r : null;
  }
  function placeToasts(box, play) {
    box.classList.toggle('play', play);
    if (!play) { box.style.left = box.style.top = box.style.width = box.style.transform = ''; return; }
    watchHud();
    const W = G.Screen ? G.Screen.w() : innerWidth, H = G.Screen ? G.Screen.h() : innerHeight;
    const hud = $('hud');
    let left = 8, right = W - 8, top = 8;
    const tl = localRect(hud && hud.querySelector('.hud-tl')), tr = localRect(hud && hud.querySelector('.hud-tr'));
    const tc = localRect(hud && hud.querySelector('.hud-tc'));
    if (tl) left = Math.max(left, tl.right + 8);
    if (tr) right = Math.min(right, tr.left - 8);
    if (tc) top = tc.bottom + 6;
    const cx = W / 2, half = Math.min(cx - left, right - cx);
    let x0 = left, w = Math.max(120, right - left);
    if (half * 2 >= 240) { x0 = cx - half; w = half * 2; } // centred under the timer when it fits
    box.style.left = Math.round(x0) + 'px'; box.style.width = Math.round(w) + 'px';
    box.style.top = Math.round(top) + 'px'; box.style.transform = 'none';
    // keep the crosshair (and its spread) clear: drop the oldest while the lane runs too low
    const limit = H / 2 - 26;
    for (let r = localRect(box); r && r.bottom > limit && box.children.length > 1; r = localRect(box)) box.firstChild.remove();
  }
  G.bus.on('resize', () => { const box = $('toasts'); if (box && box.children.length && box.classList.contains('play')) placeToasts(box, toastPlayLane()); });
  // Toasts already on screen follow the HUD: a toast is placed when it shows, but the HUD columns can grow after
  // that (Fountain Guard's break row + next-wave preview, a longer objective, the boss bar), so any size change of
  // the top-left / top-centre / top-right column places the lane again (once per frame at most; no polling). A menu
  // opening or the last one closing switches between the play lane and the menu lane the same way.
  let hudRO = null, rePend = false;
  function replaceToasts() {
    rePend = false;
    const box = $('toasts');
    if (box && box.children.length) placeToasts(box, toastPlayLane());
  }
  function replaceSoon() { if (!rePend) { rePend = true; requestAnimationFrame(replaceToasts); } }
  function watchHud() {
    if (hudRO || typeof ResizeObserver !== 'function') return;
    const hud = $('hud'); if (!hud) return;
    const cols = ['.hud-tl', '.hud-tc', '.hud-tr'].map(s => hud.querySelector(s)).filter(Boolean);
    if (!cols.length) return;
    hudRO = new ResizeObserver(replaceSoon);
    for (const c of cols) hudRO.observe(c);
  }
  UI._replaceToasts = replaceToasts;   // (tests)
  G.bus.on('ui-open', replaceSoon);
  G.bus.on('ui-empty', replaceSoon);
  // Big center banner. Pops in (style.css bannerPop); on expiry it is hidden at once ([hidden] is the
  // logical state) and drawn for one short exit beat (.b-out).
  let bannerTimer = 0, bannerOutT = 0;
  // A banner in play holds the toast lane under the top-centre HUD (they would draw over each other: "Objective
  // complete!" on Beepo's hint): toasts already up fade aside and keep the rest of their time for afterwards, new ones
  // queue, and the lane comes back when the banner goes. Menus hide banners, so a banner over a menu holds nothing.
  function holdToasts(on) {
    if (on === bannerHeld) return;
    bannerHeld = on;
    const box = $('toasts'); if (!box) return;
    box.classList.toggle('b-hold', on);
    const now = performance.now();
    for (const t of box.children) {
      if (t.classList.contains('out')) continue;
      if (on) { clearTimeout(t._tm); t._held = true; t._left = Math.max(1200, (t._end || now) - now); }
      else if (t._held) { t._held = false; const left = t._left || 1500; t._end = now + left; t._tm = setTimeout(() => dismissToast(t), left); }
    }
    if (!on) for (let i = 0; i < 2 && toastQ.length; i++) pumpToasts();   // (refill the lane, up to its 2)
  }
  UI.hideBanner = function () { clearTimeout(bannerTimer); clearTimeout(bannerOutT); const b = $('banner'); b.classList.remove('b-out'); b.hidden = true; holdToasts(false); };
  UI.banner = function (title, sub, dur) {
    const b = $('banner');
    clearTimeout(bannerTimer); clearTimeout(bannerOutT);
    b.classList.remove('b-out');
    b.innerHTML = '';
    b.appendChild(el('div.b-title', { text: title }));
    if (sub) b.appendChild(el('div.b-sub', { text: sub }));
    b.hidden = false;
    if (toastPlayLane()) holdToasts(true);
    bannerTimer = setTimeout(() => {
      b.hidden = true;
      holdToasts(false);
      if (UI.reduced()) return;
      b.classList.add('b-out');
      bannerOutT = setTimeout(() => b.classList.remove('b-out'), 260);
    }, (dur || 1.8) * 1000);
  };
  // Loading screen. Fades in over the scene (opacity runs on the compositor, so it completes even while
  // the mode builds on the main thread) and fades out over the new one. [hidden] flips immediately in
  // both directions; .ld-out only keeps it drawn (without catching taps) while it fades.
  let ldOutT = 0;
  function ldBuild(l) {
    if (l._built) return;
    l._built = true;
    const orb = l.querySelector('.ld-orb');
    if (orb) { const stage = el('div.ld-stage', el('div.ld-shadow')); orb.parentNode.insertBefore(stage, orb); stage.appendChild(orb); }
    const tx = l.querySelector('.ld-text');
    if (tx) { tx.textContent = ''; tx.append(el('span.ld-label'), el('span.ld-dots', el('i'), el('i'), el('i'))); }
  }
  UI.loading = function (show, textKey, tipKey) {
    const l = $('loading');
    ldBuild(l);
    clearTimeout(ldOutT);
    if (show) {
      // still fading out from a moment ago: snap back instead of fading in from nothing
      const back = l.classList.contains('ld-out');
      l.classList.remove('ld-out');
      l.classList.toggle('ld-now', back || UI.reduced());
      l.hidden = false;
      const lab = l.querySelector('.ld-label') || l.querySelector('.ld-text');
      // the dots are animated, so a trailing "..." / "…" in the translation is dropped
      lab.textContent = G.t(textKey || 'ui.loading').replace(/[\s.…。・]+$/u, '');
      const tips = G.Data && G.Data.TIPS ? G.Data.TIPS : [];
      const tk = tipKey || (tips.length ? tips[Math.floor(Math.random() * tips.length)] : '');
      l.querySelector('.ld-tip').textContent = tk ? G.t(tk) : '';
    } else {
      if (l.hidden) return;
      l.hidden = true;
      if (UI.reduced()) return;
      l.classList.add('ld-out');
      ldOutT = setTimeout(() => l.classList.remove('ld-out'), 330);
    }
  };
  // In-page confirm (window.confirm is unavailable in the viewer).
  UI.def('confirm', {
    modal: true,
    build(p, close) {
      return el('div.panel.narrow',
        el('div.panel-head', el('h2', { text: p.title || G.t('ui.confirm') })),
        el('p', { text: p.text, style: { margin: '0', lineHeight: '1.5' } }),
        el('div.row.end',
          UI.btn(p.noKey || 'ui.cancel', () => { close(); if (p.onNo) p.onNo(); }),
          UI.btn(p.yesKey || 'ui.ok', () => { close(); if (p.onYes) p.onYes(); }, p.danger ? 'hot' : 'primary')));
    },
  });
  UI.confirm = (text, onYes, opts) => UI.open('confirm', Object.assign({ text, onYes }, opts || {}));
  UI.fatal = function (msg) { const f = $('fatal'); f.hidden = false; f.textContent = msg; };

  // ---- Touch scrolling inside the rotated frame ----
  // When a phone is held upright the whole #app is rotated 90° with CSS (G.Screen.forced). Browsers
  // cannot pan a rotated scroller natively (the swipe is matched against screen axes, so lists simply
  // never move), which hid everything below the fold — e.g. a mission's Start button. In that state
  // menus are scrolled here instead: native panning is disabled by CSS (style.css) and drags are
  // mapped into the game frame with G.Screen.toLocal, with a short fling on release.
  const SLOP = 9;
  let drag = null, fling = null, dragEndT = -1e9;
  function canScroll(n, axis) {
    const cs = getComputedStyle(n);
    if (axis === 'y') return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1;
    return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 1;
  }
  function scrollers(target) {
    const ui = $('ui'); let y = null, x = null;
    for (let n = target; n && n !== ui && n.nodeType === 1; n = n.parentNode) {
      if (!y && canScroll(n, 'y')) y = n;
      if (!x && canScroll(n, 'x')) x = n;
      if (x && y) break;
    }
    return { y, x };
  }
  function stopFling() { if (fling) { cancelAnimationFrame(fling.raf); fling = null; } }
  // Menu zoom (Settings → Text & UI size: style.css zooms every screen by --ui-mz): a finger moving N frame pixels
  // over a zoomed scroller moves N / zoom of its own CSS pixels (scrollTop units), so content tracks the finger at
  // every text size. Read from the element's screen (the button-layout editor is never zoomed).
  UI.zoomOf = function (n) {
    const s = n && n.closest ? n.closest('.screen') : null;
    if (!s) return 1;
    const z = parseFloat(getComputedStyle(s).zoom);
    return z > 0.2 && z < 5 ? z : 1;
  };
  function rotDown(e) {
    if (!G.Screen || !G.Screen.forced || e.pointerType === 'mouse' || drag) return;
    const t = e.target;
    if (!t || !t.closest || t.closest('input, select, textarea, .hl-root, [data-noscroll], #touch')) return;
    stopFling();
    const sc = scrollers(t);
    if (!sc.x && !sc.y) return;
    const p = G.Screen.toLocal(e.clientX, e.clientY);
    drag = { id: e.pointerId, sx: p.x, sy: p.y, lx: p.x, ly: p.y, sc, el: null, axis: null, top: 0, left: 0, moving: false, samples: [{ x: p.x, y: p.y, t: performance.now() }] };
  }
  function rotMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const p = G.Screen.toLocal(e.clientX, e.clientY);
    const dx = p.x - drag.sx, dy = p.y - drag.sy;
    if (!drag.moving) {
      if (Math.hypot(dx, dy) < SLOP) return;
      const vert = Math.abs(dy) >= Math.abs(dx);
      drag.axis = vert ? (drag.sc.y ? 'y' : 'x') : (drag.sc.x ? 'x' : 'y');
      drag.el = drag.axis === 'y' ? drag.sc.y : drag.sc.x;
      drag.top = drag.el.scrollTop; drag.left = drag.el.scrollLeft;
      drag.z = UI.zoomOf(drag.el);
      drag.moving = true;
    }
    if (drag.axis === 'y') drag.el.scrollTop = drag.top - dy / drag.z; else drag.el.scrollLeft = drag.left - dx / drag.z;
    const now = performance.now();
    drag.samples.push({ x: p.x, y: p.y, t: now });
    while (drag.samples.length > 2 && now - drag.samples[0].t > 90) drag.samples.shift();
    if (e.cancelable) e.preventDefault();
  }
  function rotUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moving || e.type === 'pointercancel') { if (d.moving) dragEndT = performance.now(); return; }
    dragEndT = performance.now();
    const a = d.samples[0], b = d.samples[d.samples.length - 1], dt = Math.max(16, b.t - a.t);
    let v = -((d.axis === 'y' ? b.y - a.y : b.x - a.x) / dt); // frame px per ms, scroll direction
    if (Math.abs(v) < 0.08) return;
    v = G.util.clamp(v, -4, 4) / (d.z || 1);                  // -> the scroller's own (zoomed) px per ms
    const elS = d.el, ax = d.axis;
    let last = performance.now();
    fling = { raf: 0 };
    const step = now => {
      const ms = Math.min(48, now - last); last = now;
      v *= Math.exp(-ms / 320);
      if (ax === 'y') elS.scrollTop += v * ms; else elS.scrollLeft += v * ms;
      if (Math.abs(v) < 0.02 || !elS.isConnected) { fling = null; return; }
      fling.raf = requestAnimationFrame(step);
    };
    fling.raf = requestAnimationFrame(step);
  }
  window.addEventListener('pointerdown', rotDown, { capture: true, passive: true });
  window.addEventListener('pointermove', rotMove, { capture: true, passive: false });
  window.addEventListener('pointerup', rotUp, { capture: true });
  window.addEventListener('pointercancel', rotUp, { capture: true });
  // A drag that scrolled must not also press the button it started on.
  window.addEventListener('click', e => { if (performance.now() - dragEndT < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
  UI._rotScroll = { active: () => !!drag, stop: stopFling };
  // Open menus follow a language change (their text is built with G.t at build time).
  G.bus.on('lang', () => {
    for (const e of UI.stack.slice()) if (!['hud-editor', 'confirm', 'settings'].includes(e.id)) G.safe('lang refresh ' + e.id, () => UI.refresh(e));
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 07_ui.js]', e); }
// ---- 07b_screens_core.js
try { (function () {
// Core screens: pause menu and settings (language, controls, graphics, audio, accessibility), plus the save
// screens: save code export / import ('save-code'), damaged-save recovery ('save-recover', opened on its own
// when G.Save.recovery is set) and the persistent "progress won't be kept" notice on the title and in town.
// Strings for the newer rows live in 93_lang_access.js.
(function (G) {
  const el = (...a) => G.UI.el(...a);
  G.i18n.add('en', {
    'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.settings': 'Settings', 'pause.quit': 'Return to Town',
    'pause.quitConfirm': 'Leave this mission and return to town? Progress in this run will be lost.', 'pause.restart': 'Restart',
    'set.title': 'Settings', 'set.tab.game': 'Game', 'set.tab.controls': 'Controls', 'set.tab.video': 'Graphics', 'set.tab.audio': 'Sound', 'set.tab.access': 'Accessibility',
    'set.lang': 'Language', 'set.difficulty': 'Difficulty', 'set.diff.breezy': 'Breezy', 'set.diff.normal': 'Normal', 'set.diff.spicy': 'Spicy', 'set.diff.blazing': 'Blazing', 'set.diff.lock': '{name} (Rank {n})',
    'set.sens': 'Look sensitivity', 'set.invert': 'Invert look up/down', 'set.autofire': 'Auto-fire (touch)', 'set.assist': 'Aim assist (touch)',
    'set.lefty': 'Left-handed controls', 'set.hudScale': 'Button size', 'set.fov': 'Field of view',
    'set.quality': 'Graphics quality', 'set.q.auto': 'Auto', 'set.q.low': 'Low', 'set.q.med': 'Medium', 'set.q.high': 'High', 'set.fps': 'Show FPS',
    'set.master': 'Master volume', 'set.sfx': 'Effects', 'set.music': 'Music',
    'set.colorblind': 'Colorblind-friendly team colors', 'set.motion': 'Reduce motion (less shake/bob)',
    'set.reset': 'Reset save data', 'set.resetConfirm': 'Erase all progress? This cannot be undone.', 'set.resetDone': 'Save data reset.',
    'set.preset': 'Control style', 'set.presetBtn': 'Choose',
    'set.desktopHint': 'Keyboard: WASD move · Mouse look · Click fire · Space jump · Shift sprint · C slide · Q dash · G gadget · E use · R reload · 1-6 weapons · Esc pause',
  });
  G.i18n.add('ja', {
    'pause.title': 'ポーズ', 'pause.resume': 'つづける', 'pause.settings': 'せってい', 'pause.quit': 'タウンにもどる',
    'pause.quitConfirm': 'ミッションをやめてタウンにもどりますか？ このプレイの成果はなくなります。', 'pause.restart': 'やりなおす',
    'set.title': 'せってい', 'set.tab.game': 'ゲーム', 'set.tab.controls': 'そうさ', 'set.tab.video': 'がめん', 'set.tab.audio': 'サウンド', 'set.tab.access': 'アクセシビリティ',
    'set.lang': 'ことば / Language', 'set.difficulty': 'むずかしさ', 'set.diff.breezy': 'そよかぜ', 'set.diff.normal': 'ふつう', 'set.diff.spicy': 'ピリから', 'set.diff.blazing': 'もえもえ', 'set.diff.lock': '{name}（ランク{n}）',
    'set.sens': '視点のはやさ', 'set.invert': '上下を反転', 'set.autofire': 'オート射撃（タッチ）', 'set.assist': 'エイムアシスト（タッチ）',
    'set.lefty': '左きき用そうさ', 'set.hudScale': 'ボタンの大きさ', 'set.fov': '視野角',
    'set.quality': 'グラフィック品質', 'set.q.auto': '自動', 'set.q.low': '低', 'set.q.med': '中', 'set.q.high': '高', 'set.fps': 'FPSを表示',
    'set.master': '全体の音量', 'set.sfx': '効果音', 'set.music': 'BGM',
    'set.colorblind': '色覚に配慮したチームカラー', 'set.motion': '動きをおさえる（ゆれ・ブレを軽減）',
    'set.reset': 'セーブデータを消す', 'set.resetConfirm': 'すべての進行状況を消しますか？ 元にはもどせません。', 'set.resetDone': 'セーブデータを消しました。',
    'set.preset': 'そうさタイプ', 'set.presetBtn': 'えらぶ',
    'set.desktopHint': 'キーボード: WASD移動・マウス視点・クリック射撃・Spaceジャンプ・Shiftダッシュ・Cスライド・Qブースト・Gガジェット・E調べる・Rリロード・1-6武器・Escポーズ',
  });

  G.UI.def('pause', {
    build(p, close) {
      const m = G.Game.mode || {};
      const inTown = G.Game.modeId === 'hub' || G.Game.modeId === 'title';
      const btns = [G.UI.btn('pause.resume', close, 'go big')];
      if (m.restart) btns.push(G.UI.btn('pause.restart', () => { close(); m.restart(); }, 'cool'));
      btns.push(G.UI.btn('pause.settings', () => G.UI.open('settings'), ''));
      if (G.UI.defs['hud-editor'] && G.input.device === 'touch') btns.push(G.UI.btn('hl.title', () => G.UI.open('hud-editor'), 'grape'));
      // a mode can name its own honest quit line (m.quitKey: e.g. PvE runs keep their clinks and half the parts)
      if (!inTown) btns.push(G.UI.btn('pause.quit', () => G.UI.confirm(G.t(m.quitKey && G.i18n.has(m.quitKey) ? m.quitKey : 'pause.quitConfirm'), () => { G.Game.paused = false; G.Game.go('hub'); }, { danger: true }), 'hot'));
      // (.pause-btns: scrolls when it must; two per row when one column would not fit — fitPause, style.css; the frame
      // after a build re-fits a refreshed list, e.g. after a language change)
      requestAnimationFrame(fitPause);
      return el('div.panel.narrow', { style: { alignItems: 'stretch' } },
        el('div.panel-head', el('h2', { i18n: 'pause.title' })),
        el('div.col.pause-btns', btns));
    },
  });
  // Big text on a small phone: a pause list taller than the frame (the last button was cut in half) goes to rows of two.
  // Fitted when the screen is attached (before its first paint) and after a resize / rotation.
  function fitPause() {
    const e = G.UI.stack.find(s => s.id === 'pause'), list = e && e.el.querySelector('.pause-btns');
    if (!list) return;
    list.classList.remove('two');
    if (list.scrollHeight > list.clientHeight + 1) list.classList.add('two');
  }
  G.bus.on('ui-open', id => { if (id === 'pause') fitPause(); });
  G.bus.on('resize', () => setTimeout(fitPause, 60));
  G.bus.on('screen', () => setTimeout(fitPause, 60));

  function toggle(key, onChange) {
    const s = G.Save.set;
    const t = el('div.toggle' + (s[key] ? '.on' : ''), { role: 'switch', tabindex: '0', 'aria-checked': String(!!s[key]), id: 'set-' + key });
    const flip = () => { s[key] = !s[key]; t.classList.toggle('on', s[key]); t.setAttribute('aria-checked', String(s[key])); G.Save.save(); if (onChange) onChange(s[key]); if (G.Audio) G.Audio.sfx('ui'); };
    t.addEventListener('click', flip);
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    return t;
  }
  function slider(key, min, max, step, onChange, fmt, onRelease) {
    const s = G.Save.set;
    const wrap = el('div.row', { style: { flexWrap: 'nowrap' } });
    // (wide enough for "100%" in every font: it used to clip at 44 px)
    const out = el('b', { style: { minWidth: '52px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', flex: 'none' } });
    const inp = el('input', { type: 'range', min, max, step, value: s[key], id: 'set-' + key });
    const show = () => { out.textContent = fmt ? fmt(+inp.value) : String(inp.value); };
    inp.addEventListener('input', () => { s[key] = +inp.value; show(); if (onChange) onChange(s[key]); G.Save.save(); });
    if (onRelease) inp.addEventListener('change', () => onRelease(+inp.value));   // e.g. a preview blip when let go
    show();
    wrap.append(inp, out);
    return wrap;
  }
  function select(key, options, onChange) {
    const s = G.Save.set;
    const sel = el('select.sel', { id: 'set-' + key });
    for (const o of options) { const op = el('option', { value: o.v, text: o.label }); if (String(s[key]) === String(o.v)) op.selected = true; sel.appendChild(op); }
    sel.addEventListener('change', () => { s[key] = sel.value; G.Save.save(); if (onChange) onChange(sel.value); });
    return sel;
  }
  // Segmented choice (radio group of small buttons): opts [{v, k: label key}].
  function seg(key, opts, onChange) {
    const s = G.Save.set;
    const box = el('div.seg', { role: 'radiogroup', id: 'set-' + key });
    const mark = () => { for (const b of box.children) { const on = b.dataset.v === String(s[key]); b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); } };
    for (const o of opts) box.appendChild(el('button', { type: 'button', role: 'radio', i18n: o.k, dataset: { v: o.v }, onclick: () => { if (String(s[key]) === o.v) return; s[key] = o.v; mark(); G.Save.save(); if (onChange) onChange(o.v); } }));
    mark();
    return box;
  }
  const row = (labelKey, control) => el('div.setting', el('label', { i18n: labelKey, style: { fontWeight: '800' } }), control);
  const sec = key => el('h3.set-sec', { i18n: key });
  const pct = v => Math.round(v * 100) + '%';
  const ICO_WARN = '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z" fill="#ffd23f" stroke="#1e1a4d" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 9.5v5" stroke="#1e1a4d" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18" r="1.5" fill="#1e1a4d"/></svg>';
  const ICO_OK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3fe0b8" stroke="#1e1a4d" stroke-width="2.2"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#1e1a4d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const buildText = () => { const b = G.BUILD || {}; return 'v' + (b.version || G.VERSION || '?') + ' · ' + (b.commit || 'local'); };
  // Clipboard with a fallback for embeds / old browsers that refuse the async API.
  function copyText(text, src) {
    const done = ok => { G.UI.toast(G.t(ok ? 'sv.copied' : 'sv.copyFail')); if (G.Audio && ok) G.Audio.sfx('ui'); };
    const legacy = () => {
      let ok = false, ta = src && src.tagName === 'TEXTAREA' ? src : null, tmp = null;
      try {
        if (!ta) { tmp = ta = el('textarea', { style: { position: 'fixed', left: '0', top: '0', opacity: '0', width: '1px', height: '1px' } }); ta.value = text; document.body.appendChild(ta); }
        ta.focus(); ta.select(); try { ta.setSelectionRange(0, text.length); } catch (e) { /* ok */ }
        ok = !!document.execCommand('copy');
      } catch (e) { ok = false; }
      if (tmp) tmp.remove();
      done(ok);
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(() => done(true), legacy); return; } } catch (e) { /* fall through */ }
    legacy();
  }
  G.UI.copyText = copyText;
  // After a restore / import / fresh start: language and settings of the new data, then back to the title.
  function afterLoad() {
    const s = G.Save.set;
    if (!s.lang) s.lang = G.i18n.detect();
    G.i18n.set(s.lang);
    G.applySettings();
    if (G.HUD && G.HUD.layoutVars) G.HUD.layoutVars();
    G.UI.closeAll();
    G.Game.paused = false;
    G.Game.go(G.Game.modes.title ? 'title' : 'hub');
    notice();
  }
  const textSizeChanged = () => {
    if (G.HUD && G.HUD.layoutVars) G.HUD.layoutVars();
    if (G.HudLayout && G.HudLayout.apply && G.Input.layout) G.safe('hud layout', () => G.HudLayout.apply(G.Input.layout));
  };

  G.UI.def('settings', {
    modal: true,
    build(p, close, entry) {
      const tab = entry.tab || (entry.tab = 'game');
      const tabs = ['game', 'controls', 'video', 'audio', 'access'];
      const blocked = G.Save.blocked && G.Save.blocked();
      const tabBar = el('div.tabs', tabs.map(t => el('button.tab' + (t === tab ? '.on' : ''), { type: 'button', onclick: () => { entry.tab = t; G.UI.refresh(entry); } },
        el('span', { i18n: 'set.tab.' + t }), t === 'game' && (blocked || G.Save.recovery) ? el('span', { html: ICO_WARN, style: { display: 'inline-flex', width: '16px', height: '16px', marginLeft: '4px', verticalAlign: '-3px' } }) : null)));
      let body = [];
      if (tab === 'game') {
        const st = blocked ? el('div.set-note.bad', el('span', { html: ICO_WARN, style: { display: 'inline-flex' } }), el('span', { i18n: 'sv.off' }))
          : el('div.set-note', el('span', { html: ICO_OK, style: { display: 'inline-flex' } }), el('span', { i18n: 'sv.ok' }));
        const ver = el('span.set-build', { text: buildText() });
        body = [
          row('set.lang', select('lang', G.i18n.langs.map(l => ({ v: l.code, label: l.name })), v => { G.i18n.set(v); G.UI.refresh(entry); })),
          row('set.difficulty', (() => {
            // Spicy/Blazing unlock by Player Rank (GDD §4.5).
            const req = { breezy: 0, normal: 0, spicy: 10, blazing: 18 };
            const D = G.Data && G.Data.DIFFICULTY;
            const pr = G.Progress && G.Progress.rankInfo ? G.Progress.rankInfo().pr : 99;
            const sel = select('difficulty', ['breezy', 'normal', 'spicy', 'blazing'].map(d => {
              const need = D && D[d] && D[d].pr != null ? D[d].pr : req[d];
              return { v: d, label: pr >= need ? G.t('set.diff.' + d) : G.t('set.diff.lock', { name: G.t('set.diff.' + d), n: need }), locked: pr < need };
            }));
            Array.from(sel.options).forEach((o, i) => { const d = ['breezy', 'normal', 'spicy', 'blazing'][i]; const need = D && D[d] && D[d].pr != null ? D[d].pr : req[d]; o.disabled = pr < need; });
            return sel;
          })()),
          sec('set.sec.save'),
          row('set.storage', st),
          G.Save.recovery ? row('sv.recRow', G.UI.btn('sv.fix', () => G.UI.open('save-recover'), 'primary small')) : null,
          row('set.saveCode', el('div.row', { style: { gap: '8px' } },
            G.UI.btn('sv.export', () => G.UI.open('save-code', { mode: 'export' }), 'small'),
            G.UI.btn('sv.import', () => G.UI.open('save-code', { mode: 'import' }), 'small'))),
          row('set.build', el('div.row', { style: { gap: '8px', flexWrap: 'nowrap' } }, ver,
            G.UI.btn('sv.copy', () => { const b = G.BUILD || {}; copyText('Marmalune Rangers ' + buildText() + (b.channel ? ' (' + b.channel + (b.date ? ', ' + b.date : '') + ')' : '')); }, 'small'))),
          el('div.row', { style: { paddingTop: '14px' } }, G.UI.btn('set.reset', () => G.UI.confirm(G.t('set.resetConfirm'), () => { G.Save.reset(); G.UI.toast(G.t('set.resetDone')); G.UI.closeAll(); G.Game.go(G.Game.modes.title ? 'title' : 'hub'); notice(); }, { danger: true }), 'hot small')),
        ];
      } else if (tab === 'controls') {
        const pad = G.input.device === 'gamepad';
        body = [
          G.UI.defs['preset-pick'] ? row('set.preset', G.UI.btn('set.presetBtn', () => G.UI.open('preset-pick', { onClose: () => G.UI.refresh(entry) }), 'small')) : null,
          G.UI.defs['hud-editor'] ? row('hl.row', G.UI.btn('hl.edit', () => G.UI.open('hud-editor'), 'grape small')) : null,
          row('set.sens', slider('sens', 0.3, 2.5, 0.05, null, v => v.toFixed(2))),
          row('set.invert', toggle('invertY')),
          row('set.autofire', toggle('autoFire')),
          row('set.lookSmooth', toggle('lookSmooth')),
          row('set.assist', slider('aimAssist', 0, 1, 0.05, null, pct)),
          row('set.lefty', toggle('leftHanded')),
          // touch BUTTON size only; text and menus have their own size (Accessibility → Text & UI size)
          row('set.hudScale', slider('hudScale', 0.75, 1.3, 0.05, () => G.applySettings(), pct)),
          sec('set.sec.pad'),
          row('set.gpSens', slider('gpSens', 0.3, 2.5, 0.05, null, v => v.toFixed(2))),
          el('p.muted.small', { i18n: pad ? 'set.padHint' : 'set.desktopHint', style: { lineHeight: '1.6' } }),
          el('p.muted.small', { i18n: pad ? 'set.desktopHint' : 'set.padHint', style: { lineHeight: '1.6', opacity: '0.8' } }),
        ];
      } else if (tab === 'video') {
        // Glow only exists in the post-processed tiers; on Low it stays settable but dimmed.
        const glow = row('set.bloom', toggle('bloom'));
        if (G.R && !G.R.postOn) glow.style.opacity = '0.55';
        if (G.fovV) G.fovV();   // carries a customised legacy FOV over to fovH first (12_player), so the slider shows it
        // crosshair: a live preview over a little sky / grass swatch, refreshed on every change
        const xh = G.HUD && G.HUD.crosshairPreview ? G.HUD.crosshairPreview() : null;
        const box = el('div.xh-prev', xh);
        const upd = () => { if (xh) G.HUD.crosshairPreview(xh); };
        const cols = ['white', 'yellow', 'cyan', 'pink', 'green'];
        const sw = el('div.swatches', { role: 'radiogroup', id: 'set-xhColor' });
        const markSw = () => { for (const b of sw.children) { const on = b.dataset.v === G.Save.set.xhColor; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); } };
        for (const c of cols) sw.appendChild(el('button', { type: 'button', role: 'radio', 'aria-label': G.t('set.xc.' + c), title: G.t('set.xc.' + c), dataset: { v: c },
          style: { background: (G.HUD && G.HUD.XH_COL && G.HUD.XH_COL[c]) || '#fff' }, onclick: () => { G.Save.set.xhColor = c; markSw(); G.Save.save(); upd(); } }));
        markSw();
        body = [
          // Full screen switch where the Fullscreen API works; "How?" (Add to Home Screen steps) on iPhone (99_main G.PWA)
          G.PWA && G.PWA.settingsRow ? G.PWA.settingsRow(row) : null,
          row('set.quality', select('quality', ['auto', 'low', 'med', 'high', 'ultra'].map(q => ({ v: q, label: G.t('set.q.' + q) })), () => { G.applySettings(); G.UI.refresh(entry); })),
          // what Ultra adds (strings: 93_lang_ultra.js); shown while it is chosen
          G.Save.set.quality === 'ultra' ? el('p.muted.small', { i18n: 'set.q.ultraHint', style: { lineHeight: '1.5', margin: '-2px 0 6px' } }) : null,
          glow,
          row(G.i18n.has && G.i18n.has('set.fovH') ? 'set.fovH' : 'set.fov', slider('fovH', 85, 110, 1, null, v => v + '°')),
          row('set.fps', toggle('showFps')),
          sec('set.sec.xh'),
          el('div.row', { style: { justifyContent: 'center', padding: '4px 0' } }, box),
          row('set.xhStyle', seg('xhStyle', [{ v: 'classic', k: 'set.xh.classic' }, { v: 'dot', k: 'set.xh.dot' }, { v: 'circle', k: 'set.xh.circle' }], upd)),
          row('set.xhColor', sw),
          row('set.xhSize', slider('xhSize', 0.6, 1.6, 0.05, upd, pct)),
          row('set.xhOpacity', slider('xhOpacity', 0.3, 1, 0.05, upd, pct)),
        ];
      } else if (tab === 'audio') {
        const vol = () => G.applySettings();
        const pv = k => () => { if (G.Audio && G.Audio.preview) G.Audio.preview(k); };   // sample on release (09_audio)
        body = [
          row('set.master', slider('master', 0, 1, 0.05, vol, pct, pv('master'))),
          row('set.sfx', slider('sfx', 0, 1, 0.05, vol, pct, pv('sfx'))),
          row('set.music', slider('music', 0, 1, 0.05, vol, pct, pv('music'))),
          row('set.amb', slider('amb', 0, 1, 0.05, vol, pct, pv('amb'))),
          row('set.uiVol', slider('uiVol', 0, 1, 0.05, vol, pct, pv('ui'))),
        ];
      } else {
        // Reduced motion is the master switch: it sets the four comfort controls to their reduced values
        // (G.Motion.setReduced keeps the previous ones and gives them back when it is switched off).
        body = [
          sec('set.sec.see'),
          row('set.textSize', seg('textSize', [{ v: 's', k: 'set.ts.s' }, { v: 'm', k: 'set.ts.m' }, { v: 'l', k: 'set.ts.l' }, { v: 'xl', k: 'set.ts.xl' }], textSizeChanged)),
          row('set.captions', toggle('captions', on => { if (!on && G.HUD && G.HUD.clearCaptions) G.HUD.clearCaptions(); })),
          row('set.colorblind', toggle('colorblind', () => G.applySettings())),
          row('set.inkPatterns', toggle('inkPatterns')),
          sec('set.sec.motion'),
          row('set.motion', toggle('reducedMotion', on => { if (G.Motion) G.Motion.setReduced(on); G.applySettings(); G.UI.refresh(entry); })),
          row('set.shake', slider('shake', 0, 1, 0.05, null, pct)),
          row('set.flashes', seg('flashes', [{ v: 'on', k: 'set.fl.on' }, { v: 'reduced', k: 'set.fl.reduced' }])),
          row('set.speedLines', seg('speedLines', [{ v: 'on', k: 'set.sl.on' }, { v: 'reduced', k: 'set.sl.reduced' }, { v: 'off', k: 'set.sl.off' }])),
          row('set.camBob', toggle('camBob')),
        ];
      }
      return G.UI.panel('set.title', close, body, { narrow: false, top: tabBar, style: { maxWidth: '640px' } });
    },
  });

  // ---- save code: export (copy) / import (paste, check, confirm, load) ----
  G.UI.def('save-code', {
    modal: true,
    build(p, close, entry) {
      const imp = p.mode === 'import';
      const ta = el('textarea.save-code', { id: 'save-code-text', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': G.t(imp ? 'sv.importTitle' : 'sv.exportTitle') });
      const err = el('p.save-err', { role: 'alert' });
      let foot;
      if (imp) {
        ta.placeholder = 'MR2:…';
        const load = () => {
          const r = G.Save.readCode(ta.value);
          if (!r.ok) { err.textContent = G.t('sv.bad.' + r.why); if (G.Audio) G.Audio.sfx('error'); return; }
          err.textContent = '';
          G.UI.confirm(G.t('sv.importConfirm', { pr: r.info.pr, clinks: r.info.clinks }), () => {
            if (!G.Save.importData(r.data)) return;
            G.UI.toast(G.t('sv.importDone'));
            afterLoad();
          }, { danger: true });
        };
        foot = el('div.row.end', G.UI.btn('ui.cancel', close), G.UI.btn('sv.load', load, 'go'));
      } else {
        ta.readOnly = true;
        ta.value = G.Save.exportCode();
        ta.addEventListener('focus', () => { try { ta.select(); } catch (e) { /* ok */ } });
        foot = el('div.row.end', G.UI.btn('ui.close', close), G.UI.btn('sv.copy', () => copyText(ta.value, ta), 'primary'));
      }
      return G.UI.panel(imp ? 'sv.importTitle' : 'sv.exportTitle', close,
        [el('p', { i18n: imp ? 'sv.importHelp' : 'sv.exportHelp', style: { margin: '0 0 8px', lineHeight: '1.5' } }), ta, imp ? err : null],
        { narrow: true, foot });
    },
  });

  // ---- damaged save: restore the backup / keep it / start fresh (nothing is written until then) ----
  G.UI.def('save-recover', {
    modal: true, escClose: false,
    build(p, close) {
      const r = G.Save.recovery;
      if (!r) {
        // Nothing to fix (resolved meanwhile, or opened from a stale notice / by hand): an honest all-clear (or the
        // blocked-storage note) instead of the "save trouble" title, and one tap (or the pad's B) closes it.
        const off = !!(G.Save.blocked && G.Save.blocked());
        // (closing also drops a title pill / town chip left over from the resolved trouble)
        const ok = G.UI.btn('ui.ok', () => { close(); notice(); }, 'primary'); ok.setAttribute('data-snd', 'back');
        return el('div.panel.narrow.save-rec',
          el('div.panel-head', el('span', { html: off ? ICO_WARN : ICO_OK, style: { width: '34px', height: '34px', display: 'inline-flex' } }), el('h2', { i18n: off ? 'sv.blocked' : 'sv.rec.none' })),
          el('div.panel-body.col', { style: { gap: '8px' } }, el('p', { i18n: off ? 'hl.noSave' : 'sv.rec.noneD' })),
          el('div.col', { style: { gap: '8px' } }, ok));
      }
      const facts = (key, inf) => el('div.card', el('p', { text: G.t(key, { pr: inf.pr, clinks: inf.clinks, missions: inf.missions }) }));
      const hold = !!G.Save.hold;
      const btns = [], more = [];
      if (r.bak) btns.push(G.UI.btn('sv.restore', () => { if (G.Save.restoreBackup()) { G.UI.toast(G.t('sv.restored')); afterLoad(); } }, 'go big'));
      if (hold && r.cur) more.push(G.UI.btn('sv.keep', () => { G.Save.keepCurrent(); close(); notice(); }, ''));
      if (hold) more.push(G.UI.btn('sv.fresh', () => G.UI.confirm(G.t('sv.freshConfirm'), () => { G.Save.startFresh(); afterLoad(); }, { danger: true }), 'hot'));
      else btns.push(G.UI.btn('ui.ok', () => { G.Save.recovery = null; close(); notice(); }, 'primary'));
      if (more.length) btns.push(el('div.row', { style: { gap: '8px', flexWrap: 'nowrap' } }, more.map(b => { b.style.flex = '1 1 0'; b.style.minWidth = '0'; return b; })));
      return el('div.panel.narrow.save-rec',
        el('div.panel-head', el('span', { html: ICO_WARN, style: { width: '34px', height: '34px', display: 'inline-flex' } }), el('h2', { i18n: 'sv.rec.title' })),
        el('div.panel-body.col', { style: { gap: '8px' } },
          el('p', { i18n: 'sv.rec.' + r.why }),
          r.bakInfo ? facts('sv.rec.bak', r.bakInfo) : null,
          r.curInfo ? facts('sv.rec.cur', r.curInfo) : null,
          el('p.muted', { i18n: hold ? 'sv.rec.hold' : 'sv.rec.noBak' })),
        el('div.col', { style: { gap: '8px' } }, btns));
    },
  });

  // ---- persistent notices on the title and in town (never a toast that can vanish before it is seen):
  // storage blocked / failing, or a damaged save still waiting for the player's choice. In town it is a HUD
  // chip in the top-centre column (the touch-button layout and the toast lane keep clear of it); on the
  // title a pill at the bottom. Tapping it explains (blocked) or reopens the recovery screen.
  let pill = null;
  function noticeKind() {
    if (G.Save.recovery && G.Save.hold) return 'rec';
    return G.Save.blocked && G.Save.blocked() ? 'blocked' : '';
  }
  function makeNotice(cls, kind) {
    const n = el('button.' + cls, { type: 'button', onclick: () => { if (kind === 'rec') G.UI.open('save-recover'); else G.UI.toast(G.t('hl.noSave'), { dur: 6000, icon: ICO_WARN }); } },
      el('span', { html: ICO_WARN, style: { display: 'inline-flex' } }), el('span', { i18n: kind === 'rec' ? 'sv.recRow' : 'sv.blocked' }));
    n.dataset.kind = kind;
    return n;
  }
  function notice() {
    const kind = noticeKind(), mode = G.Game && G.Game.modeId;
    // title: a pill in the UI layer (under menus / modals)
    const wantPill = kind && mode === 'title';
    if (pill && (!wantPill || pill.dataset.kind !== kind)) { pill.remove(); pill = null; }
    if (wantPill && !pill) {
      pill = makeNotice('save-warn', kind);
      const ui = document.getElementById('ui'), mod = document.getElementById('modals');
      if (ui) ui.insertBefore(pill, mod && mod.parentNode === ui ? mod : null);
    }
    // town: a HUD chip (the HUD clears its custom slots whenever a mode shows it, so it is re-added on 'mode')
    const tc = G.HUD && G.HUD.slot ? G.HUD.slot('tc') : null;
    const chip = tc && tc.querySelector('.save-warn-chip');
    if (chip && (!kind || mode !== 'hub' || chip.dataset.kind !== kind)) chip.remove();
    if (kind && mode === 'hub' && tc && (!chip || chip.dataset.kind !== kind)) {
      const c = makeNotice('hud-chip.save-warn-chip', kind);
      c.style.pointerEvents = 'auto';
      tc.appendChild(c);
    }
  }
  G.SaveNotice = { refresh: notice };
  G.bus.on('mode', () => {
    notice();
    if (G.Save.recovery && !G.UI.isOpen('save-recover')) setTimeout(() => { if (G.Save.recovery && !G.UI.isOpen('save-recover')) G.UI.open('save-recover'); }, 350);
  });
  G.bus.on('save-status', notice);
  G.bus.on('save-reset', notice);
  G.bus.on('lang', () => { if (pill) { pill.remove(); pill = null; } const c = document.querySelector('#hud .save-warn-chip'); if (c) c.remove(); notice(); });
})(window.G);

}).call(window); } catch (e) { console.error('[module 07b_screens_core.js]', e); }
// ---- 07c_hud_layout.js
try { (function () {
// Touch-button layout engine + drag-to-place editor.
// Default positions are computed for the actual game frame (any phone/tablet size, rotated or not):
// buttons sit in arcs around the bottom-right corner, scale with screen size, keep ≥8 px gaps and
// slide out of the way of fixed HUD widgets (minimap, chips, map button). Players can override any
// button per layout (action / goo turf / race / royale / town) in the `hud-editor` screen; custom
// positions are stored as screen fractions in G.Save.set.btnLayout and applied on every layout switch.
(function (G) {
  const el = (...a) => G.UI.el(...a);
  const U = G.util;
  const TABS = ['fps', 'turf', 'race', 'royale', 'hub'];

  G.i18n.add('en', {
    'hl.title': 'Button layout', 'hl.edit': 'Edit layout', 'hl.row': 'Button layout',
    'hl.tab.fps': 'Action', 'hl.tab.turf': 'Goo Turf', 'hl.tab.race': 'Race', 'hl.tab.royale': 'Royale', 'hl.tab.hub': 'Town',
    'hl.hint': 'Drag buttons anywhere. Tap one to resize it.', 'hl.size': 'Size', 'hl.opacity': 'Opacity',
    'hl.reset': 'Reset', 'hl.resetAll': 'Reset all', 'hl.done': 'Done', 'hl.saved': 'Button layout saved!', 'hl.stick': 'Stick area',
    'hl.resetConfirm': 'Put every button in this layout back where it started?',
    'hl.clash': 'Some buttons overlap (red). Move them apart?', 'hl.keep': 'Save anyway', 'hl.fix': 'Keep editing',
    'hl.now': 'Now', 'hl.noSave': 'This browser may not keep your progress or button layout. For saving, open the game in Safari or Chrome.',
  });
  G.i18n.add('ja', {
    'hl.title': 'ボタン配置', 'hl.edit': '配置をへんしゅう', 'hl.row': 'ボタン配置',
    'hl.tab.fps': 'アクション', 'hl.tab.turf': 'グーターフ', 'hl.tab.race': 'レース', 'hl.tab.royale': 'ロワイヤル', 'hl.tab.hub': 'タウン',
    'hl.hint': 'ボタンをドラッグして好きな場所へ。タップで大きさを変えられるよ。', 'hl.size': '大きさ', 'hl.opacity': 'とうめい度',
    'hl.reset': 'もとにもどす', 'hl.resetAll': 'ぜんぶもどす', 'hl.done': 'かんりょう', 'hl.saved': 'ボタン配置をほぞんしたよ！', 'hl.stick': 'スティックのエリア',
    'hl.resetConfirm': 'このモードのボタンをぜんぶ最初の位置にもどしますか？',
    'hl.clash': '重なっているボタンがあるよ（赤色）。はなして置きなおす？', 'hl.keep': 'このまま保存', 'hl.fix': 'なおす',
    'hl.now': 'いま', 'hl.noSave': 'このブラウザでは進行状況やボタン配置が保存されないかもしれません。保存するにはSafariかChromeで開いてね。',
  });
  const L10N = {
    'zh-Hans': ['按钮布局', '编辑布局', '按钮布局', '动作', '黏液地盘战', '竞速', '大乱斗', '城镇', '把按钮拖到任意位置。点按按钮可调整大小。', '大小', '透明度', '还原', '全部还原', '完成', '按钮布局已保存！', '摇杆区域', '要把这个模式的所有按钮放回原位吗？', '有按钮重叠了（红色）。要把它们分开吗？', '直接保存', '继续调整', '当前', '这个浏览器可能无法保存进度和按钮布局。要保存，请用 Safari 或 Chrome 打开游戏。'],
    'zh-Hant': ['按鈕配置', '編輯配置', '按鈕配置', '動作', '黏液地盤戰', '競速', '大亂鬥', '城鎮', '把按鈕拖到任何位置。點一下按鈕可調整大小。', '大小', '透明度', '還原', '全部還原', '完成', '按鈕配置已儲存！', '搖桿區域', '要把這個模式的按鈕全部放回原位嗎？', '有按鈕重疊了（紅色）。要把它們分開嗎？', '直接儲存', '繼續調整', '目前', '這個瀏覽器可能無法儲存進度和按鈕配置。要儲存，請用 Safari 或 Chrome 開啟遊戲。'],
    ko: ['버튼 배치', '배치 편집', '버튼 배치', '액션', '구 영역전', '레이스', '로얄', '마을', '버튼을 원하는 곳으로 드래그하세요. 탭하면 크기를 바꿀 수 있어요.', '크기', '투명도', '되돌리기', '모두 되돌리기', '완료', '버튼 배치를 저장했어요!', '스틱 영역', '이 모드의 버튼을 모두 처음 위치로 되돌릴까요?', '겹친 버튼이 있어요(빨간색). 떨어뜨려 놓을까요?', '그대로 저장', '계속 편집', '현재', '이 브라우저에서는 진행 상황과 버튼 배치가 저장되지 않을 수 있어요. 저장하려면 Safari나 Chrome에서 열어 주세요.'],
    es: ['Botones', 'Editar botones', 'Posición de botones', 'Acción', 'Territorio Gel', 'Carrera', 'Royale', 'Pueblo', 'Arrastra los botones adonde quieras. Toca uno para cambiar su tamaño.', 'Tamaño', 'Opacidad', 'Restablecer', 'Restablecer todo', 'Listo', '¡Botones guardados!', 'Zona del stick', '¿Devolver todos los botones de este modo a su sitio?', 'Hay botones encimados (en rojo). ¿Los separas?', 'Guardar así', 'Seguir editando', 'Ahora', 'Este navegador quizá no guarde tu progreso ni tus botones. Para guardar, abre el juego en Safari o Chrome.'],
    fr: ['Boutons', 'Modifier', 'Disposition des boutons', 'Action', 'Guerre Slime', 'Course', 'Royale', 'Ville', 'Fais glisser les boutons où tu veux. Touche-en un pour changer sa taille.', 'Taille', 'Opacité', 'Réinitialiser', 'Tout réinitialiser', 'Terminé', 'Disposition enregistrée !', 'Zone du stick', 'Remettre tous les boutons de ce mode à leur place ?', 'Des boutons se chevauchent (en rouge). Les écarter ?', 'Enregistrer quand même', 'Continuer', 'Actuel', 'Ce navigateur risque de ne pas garder ta progression ni tes boutons. Pour sauvegarder, ouvre le jeu dans Safari ou Chrome.'],
    de: ['Tastenlayout', 'Layout bearbeiten', 'Tastenlayout', 'Action', 'Glibber-Revier', 'Rennen', 'Royale', 'Stadt', 'Zieh die Tasten, wohin du willst. Tipp eine an, um ihre Größe zu ändern.', 'Größe', 'Deckkraft', 'Zurücksetzen', 'Alles zurücksetzen', 'Fertig', 'Tastenlayout gespeichert!', 'Stick-Bereich', 'Alle Tasten dieses Modus zurücksetzen?', 'Einige Tasten überlappen (rot). Auseinanderschieben?', 'Trotzdem speichern', 'Weiter bearbeiten', 'Aktuell', 'Dieser Browser speichert deinen Fortschritt und dein Tastenlayout vielleicht nicht. Zum Speichern öffne das Spiel in Safari oder Chrome.'],
    'pt-BR': ['Botões', 'Editar botões', 'Posição dos botões', 'Ação', 'Guerra de Gosma', 'Corrida', 'Royale', 'Cidade', 'Arraste os botões para onde quiser. Toque em um para mudar o tamanho.', 'Tamanho', 'Opacidade', 'Restaurar', 'Restaurar tudo', 'Pronto', 'Botões salvos!', 'Área do direcional', 'Voltar todos os botões deste modo ao lugar original?', 'Tem botões sobrepostos (em vermelho). Quer separá-los?', 'Salvar assim', 'Continuar editando', 'Atual', 'Este navegador pode não salvar seu progresso nem seus botões. Para salvar, abra o jogo no Safari ou no Chrome.'],
    it: ['Pulsanti', 'Modifica pulsanti', 'Posizione pulsanti', 'Azione', 'Zona Melma', 'Corsa', 'Royale', 'Città', 'Trascina i pulsanti dove vuoi. Toccane uno per cambiarne la dimensione.', 'Dimensione', 'Opacità', 'Ripristina', 'Ripristina tutto', 'Fatto', 'Pulsanti salvati!', 'Area dello stick', 'Riportare tutti i pulsanti di questa modalità al loro posto?', 'Alcuni pulsanti si sovrappongono (in rosso). Li separi?', 'Salva comunque', 'Continua a modificare', 'Attuale', 'Questo browser potrebbe non salvare i progressi né i pulsanti. Per salvare, apri il gioco in Safari o Chrome.'],
    ru: ['Кнопки', 'Настроить', 'Расположение кнопок', 'Экшен', 'Слайм-захват', 'Гонка', 'Королевская битва', 'Город', 'Перетаскивай кнопки куда угодно. Нажми на кнопку, чтобы изменить размер.', 'Размер', 'Прозрачность', 'Сбросить', 'Сбросить всё', 'Готово', 'Кнопки сохранены!', 'Зона стика', 'Вернуть все кнопки этого режима на место?', 'Некоторые кнопки перекрываются (красные). Раздвинуть их?', 'Сохранить так', 'Продолжить', 'Сейчас', 'Этот браузер может не сохранить прогресс и кнопки. Чтобы сохранять, открой игру в Safari или Chrome.'],
    id: ['Tata letak tombol', 'Ubah tata letak', 'Tata letak tombol', 'Aksi', 'Wilayah Slime', 'Balapan', 'Royale', 'Kota', 'Seret tombol ke mana saja. Ketuk tombol untuk mengubah ukurannya.', 'Ukuran', 'Transparansi', 'Atur ulang', 'Atur ulang semua', 'Selesai', 'Tata letak tombol disimpan!', 'Area stik', 'Kembalikan semua tombol mode ini ke posisi awal?', 'Ada tombol yang bertumpuk (merah). Mau dipisahkan?', 'Simpan saja', 'Lanjut mengatur', 'Sekarang', 'Browser ini mungkin tidak menyimpan progres dan tata letak tombolmu. Untuk menyimpan, buka game di Safari atau Chrome.'],
  };
  const KEYS = ['hl.title', 'hl.edit', 'hl.row', 'hl.tab.fps', 'hl.tab.turf', 'hl.tab.race', 'hl.tab.royale', 'hl.tab.hub', 'hl.hint', 'hl.size', 'hl.opacity', 'hl.reset', 'hl.resetAll', 'hl.done', 'hl.saved', 'hl.stick', 'hl.resetConfirm', 'hl.clash', 'hl.keep', 'hl.fix', 'hl.now', 'hl.noSave'];
  for (const code in L10N) { const d = {}; KEYS.forEach((k, i) => { d[k] = L10N[code][i]; }); G.i18n.add(code, d); }

  // ---------------- layout engine ----------------
  // Base diameters (px at uiScale 1) and default centres as [dx from right edge, dy from bottom edge].
  const SIZE = { fire: 86, jump: 66, slide: 56, swim: 66, reload: 48, swap: 48, ability: 58, gadget: 52, interact: 72, pause: 46, ping: 44, boost: 96, brake: 68, item: 64 };
  const ACTION = { fire: [70, 74], jump: [182, 48], slide: [162, 140], reload: [62, 182], ability: [272, 72], gadget: [252, 164], swap: [156, 228], interact: [368, 150] };
  const DEFAULTS = {
    fps: ACTION,
    // Ping sits on the outer arc of the cluster, clear of the aiming area and the interact label.
    royale: Object.assign({}, ACTION, { ping: [250, 252] }),
    turf: { fire: [70, 74], jump: [182, 48], swim: [166, 144], ability: [276, 76], gadget: [262, 170], swap: [72, 186] },
    race: { boost: [82, 82], brake: [206, 56], item: [86, 202], fire: [206, 166] },
    hub: { jump: [70, 70], fire: [178, 60], interact: [302, 122] },
  };
  const GAP = 8;
  const HL = G.HudLayout = {};
  const store = () => {
    const s = G.Save.set;
    if (!s.btnLayout || typeof s.btnLayout !== 'object') s.btnLayout = {};
    if (s.btnOpacity == null) s.btnOpacity = 1;
    return s.btnLayout;
  };
  const listFor = layout => { const all = G.Input.LAYOUTS_REF ? G.Input.LAYOUTS_REF() : {}; return (all[layout] || []).slice(); };
  const W = () => (G.Screen ? G.Screen.w() : window.innerWidth);
  const H = () => (G.Screen ? G.Screen.h() : window.innerHeight);
  HL.uiScale = () => U.clamp(Math.min(W() / 844, H() / 390), 0.68, 1.3) * (G.Save.set.hudScale || 1);

  // Safe-area insets in the game frame (the rotation swaps which physical edge is which).
  let probe = null;
  function insets() {
    if (!probe) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(probe);
    }
    const cs = getComputedStyle(probe);
    const t = parseFloat(cs.paddingTop) || 0, r = parseFloat(cs.paddingRight) || 0, b = parseFloat(cs.paddingBottom) || 0, l = parseFloat(cs.paddingLeft) || 0;
    // rotate(90deg): game top = physical right, game right = physical bottom, game bottom = physical left, game left = physical top.
    // rotate(-90deg) (G.Screen.dir < 0): game top = physical left, right = top, bottom = right, left = bottom.
    if (G.Screen && G.Screen.forced) return G.Screen.dir < 0 ? { top: l, right: t, bottom: r, left: b } : { top: r, right: b, bottom: l, left: t };
    return { top: t, right: r, bottom: b, left: l };
  }
  // Fixed HUD widgets buttons must not cover (game-frame rects).
  function obstacles() {
    const out = [];
    const sel = '#hud .minimap, #hud .hud-tr > *, #hud .hud-tl > *, #hud .hud-tc > *, #hud .hud-bc > *, #hud .mm-quickbtn, #hud button';
    document.querySelectorAll(sel).forEach(e => {
      if (e.hidden || e.closest('[hidden]')) return;
      const r0 = e.getBoundingClientRect(); if (r0.width < 4 || r0.height < 4) return;
      const r = G.Screen ? G.Screen.rectToLocal(r0) : r0;
      out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    });
    return out;
  }
  const overl = (a, b, g) => a.left < b.right + g && a.right > b.left - g && a.top < b.bottom + g && a.bottom > b.top - g;
  // Compute default {id: {cx, cy, d}} for a layout in the current frame.
  HL.defaults = function (layout, opts) {
    opts = opts || {};
    const u = HL.uiScale(), w = W(), h = H(), ins = insets();
    const lefty = !!G.Save.set.leftHanded;
    const res = {};
    const table = DEFAULTS[layout] || {};
    for (const id of listFor(layout)) {
      const d = (SIZE[id] || 56) * u;
      if (id === 'pause') { res[id] = { cx: Math.max(12, ins.left + 12) + d / 2, cy: Math.max(10, ins.top + 10) + d / 2, d }; continue; }
      const p = table[id] || [120, 120];
      let cx = w - Math.max(ins.right, 0) - p[0] * u, cy = h - Math.max(ins.bottom, 0) - p[1] * u;
      if (lefty) cx = w - cx;
      res[id] = { cx, cy, d };
    }
    if (opts.avoid !== false) { fitBottomRow(res, w, ins, lefty); resolve(res, obstacles(), w, h, ins); }
    return res;
  };
  // The weapon-slot row (bottom centre) moves/shrinks into the free span beside the button cluster
  // instead of pushing buttons around on narrow screens.
  function fitBottomRow(res, w, ins, lefty) {
    const bc = document.querySelector('#hud .hud-bc');
    if (!bc) return;
    bc.style.left = ''; bc.style.transform = ''; bc.style.transformOrigin = '';
    // the buttons are only on screen with touch: keyboard / controller players keep the centred row
    if (G.input.device !== 'touch') return;
    const r0 = bc.getBoundingClientRect();
    if (r0.width < 4 || bc.closest('[hidden]')) return;
    const r = G.Screen ? G.Screen.rectToLocal(r0) : r0;
    const h = H();
    const low = Object.keys(res).filter(id => id !== 'pause' && res[id].cy > h * 0.45).map(id => res[id]);
    if (!low.length) return;
    const hits = low.some(b => b.cx + b.d / 2 > r.left - GAP && b.cx - b.d / 2 < r.right + GAP && b.cy + b.d / 2 > r.top - GAP);
    if (!hits) return;
    let a, z;
    if (!lefty) { a = Math.max(12, ins.left + 12); z = Math.min.apply(null, low.map(b => b.cx - b.d / 2)) - GAP; }
    else { a = Math.max.apply(null, low.map(b => b.cx + b.d / 2)) + GAP; z = w - Math.max(12, ins.right + 12); }
    // the top-left column (vitals, objective, mode cards) reaches down to the row on a small phone or with big text:
    // the row keeps beside it when the free span still holds it (08_hud fitColumns compacts the column otherwise)
    const tl = document.querySelector('#hud .hud-tl');
    if (tl && !tl.closest('[hidden]')) {
      const t0 = tl.getBoundingClientRect();
      if (t0.width > 4) {
        const t = G.Screen ? G.Screen.rectToLocal(t0) : t0;
        if (t.bottom > r.top - GAP && t.right + GAP > a && t.left < z && z - (t.right + GAP) >= r.width * 0.85) a = t.right + GAP;
      }
    }
    const span = Math.max(40, z - a);
    const k = Math.min(1, span / r.width);
    bc.style.left = ((a + z) / 2).toFixed(1) + 'px';
    bc.style.transform = 'translateX(-50%)' + (k < 1 ? ' scale(' + k.toFixed(3) + ')' : '');
    bc.style.transformOrigin = 'bottom center';
  }
  // Nudge buttons out of HUD widgets and each other (small moves, preferring down/outward).
  function resolve(res, obs, w, h, ins) {
    const ids = Object.keys(res).filter(id => id !== 'pause');
    const rectOf = b => ({ left: b.cx - b.d / 2, top: b.cy - b.d / 2, right: b.cx + b.d / 2, bottom: b.cy + b.d / 2 });
    // a pushed button keeps a margin from the bottom edge (and the home indicator), in both hands' layouts
    const mB = Math.max(6, ((ins && ins.bottom) || 0) + 4);
    const fit = b => { b.cx = U.clamp(b.cx, b.d / 2 + 2, w - b.d / 2 - 2); b.cy = U.clamp(b.cy, b.d / 2 + 2, h - b.d / 2 - mB); };
    for (let iter = 0; iter < 6; iter++) {
      let moved = false;
      for (const id of ids) {
        const b = res[id];
        for (const o of obs) {
          const r = rectOf(b);
          if (!overl(r, o, GAP)) continue;
          // Prefer sliding below the widget; otherwise sideways, away from the widget's centre
          // (so a left-handed cluster never gets pushed into the joystick half).
          const down = o.bottom + GAP + b.d / 2;
          if (down + b.d / 2 <= h - mB) b.cy = down;
          else b.cx = b.cx < (o.left + o.right) / 2 ? o.left - GAP - b.d / 2 : o.right + GAP + b.d / 2;
          moved = true;
        }
        for (const jd of ids) {
          if (jd === id) continue;
          const c = res[jd];
          const dx = b.cx - c.cx, dy = b.cy - c.cy, dist = Math.hypot(dx, dy) || 0.01, need = (b.d + c.d) / 2 + GAP;
          if (dist < need) { const k = (need - dist) / 2 / dist; b.cx += dx * k; b.cy += dy * k; c.cx -= dx * k; c.cy -= dy * k; fit(c); moved = true; }
        }
        fit(b);
      }
      if (!moved) break;
    }
    // (a neighbour pushed in the last round was only clamped by its own turn: keep every button on screen)
    for (const id of ids) fit(res[id]);
  }
  // Final placement for a layout: defaults overridden by the player's custom entries.
  HL.layoutFor = function (layout, defs) {
    defs = defs || HL.defaults(layout);
    const saved = store()[layout] || {};
    const u = HL.uiScale();
    const out = {};
    for (const id in defs) {
      const c = saved[id];
      if (c) out[id] = { cx: U.clamp(c.x, 0, 1) * W(), cy: U.clamp(c.y, 0, 1) * H(), d: (SIZE[id] || 56) * u * (c.s || 1), custom: true };
      else out[id] = Object.assign({ custom: false }, defs[id]);
    }
    return out;
  };
  // Position the live buttons of `layout`.
  HL.apply = function (layout) {
    layout = layout || G.Input.layout;
    if (!DEFAULTS[layout]) return;
    const lay = HL.layoutFor(layout);
    const op = G.Save.set.btnOpacity;
    for (const id in lay) {
      const b = G.Input.btn(id); if (!b) continue;
      const p = lay[id];
      b.style.width = b.style.height = p.d.toFixed(1) + 'px';
      b.style.left = (p.cx - p.d / 2).toFixed(1) + 'px';
      b.style.top = (p.cy - p.d / 2).toFixed(1) + 'px';
      b.style.right = 'auto'; b.style.bottom = 'auto';
      b.style.setProperty('--hud-scale', '1');
      b.style.opacity = op != null && op < 1 ? String(op) : '';
    }
    if (G.HUD && G.HUD.invalidateCaptions) G.HUD.invalidateCaptions();   // captions keep clear of the buttons
    if (G.HUD && G.HUD.relayout) G.HUD.relayout();                       // the weapon row may have moved: re-fit the columns
  };
  // Re-apply on layout switches, resizes, rotation, and once more after late HUD widgets appear.
  let lateTimer = 0;
  const schedule = name => { clearTimeout(lateTimer); lateTimer = setTimeout(() => G.safe('hud layout', () => { if (G.Input.layout === name) HL.apply(name); }), 450); };
  const origSetLayout = G.Input.setLayout;
  G.Input.setLayout = function (name) { origSetLayout.call(G.Input, name); G.safe('hud layout', () => HL.apply(name)); schedule(name); };
  G.bus.on('resize', () => { if (G.Input.layout) { G.safe('hud layout', () => HL.apply(G.Input.layout)); schedule(G.Input.layout); } });
  G.bus.on('mode', () => schedule(G.Input.layout));
  // HUD rows that appear late (weapon slots, mode widgets) get a second pass.
  G.bus.on('weapon-equip', () => schedule(G.Input.layout));
  G.bus.on('mode', () => setTimeout(() => G.safe('hud layout', () => HL.apply(G.Input.layout)), 1600));

  // ---------------- editor ----------------
  G.UI.def('hud-editor', {
    modal: true, dim: false, escClose: true,
    onClose() {
      G.Save.save(true);
      document.getElementById('ui').classList.remove('hl-editing');
      if (G.Input.layout) HL.apply(G.Input.layout);
    },
    build(p, close, entry) {
      document.getElementById('ui').classList.add('hl-editing');
      const modeLayout = G.Game.mode && G.Game.mode.layout;
      const tab = entry.tab || (entry.tab = TABS.includes(modeLayout) ? modeLayout : 'fps');
      const lay = store();
      // Defaults: avoid live HUD widgets only when editing the layout that is on screen now.
      const defs = HL.defaults(tab, { avoid: tab === modeLayout });
      const cur = Object.assign({}, lay[tab] || {});
      let sel = entry.sel && defs[entry.sel] ? entry.sel : null;
      const u = HL.uiScale();
      const root = el('div.hl-root' + (G.Save.set.leftHanded ? '.lefty' : ''));
      const stick = el('div.hl-stick' + (G.Save.set.leftHanded ? '.right' : ''), el('span', { i18n: 'hl.stick' }));
      if (tab !== 'race') root.appendChild(stick);
      root.appendChild(el('div.hl-cross'));
      const btnEls = {};
      const posOf = id => {
        const c = cur[id];
        if (c) return { cx: c.x * W(), cy: c.y * H(), d: (SIZE[id] || 56) * u * (c.s || 1), s: c.s || 1 };
        const dd = defs[id]; return { cx: dd.cx, cy: dd.cy, d: dd.d, s: 1 };
      };
      const clashCheck = () => {
        const ids = Object.keys(btnEls); let n = 0;
        ids.forEach(id => btnEls[id].classList.remove('clash'));
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
          const a = posOf(ids[i]), b = posOf(ids[j]);
          if (Math.hypot(a.cx - b.cx, a.cy - b.cy) < (a.d + b.d) / 2 + 2) { btnEls[ids[i]].classList.add('clash'); btnEls[ids[j]].classList.add('clash'); n++; }
        }
        return n;
      };
      const place = id => {
        const e = btnEls[id]; if (!e) return;
        const c = posOf(id);
        e.style.width = e.style.height = c.d + 'px';
        e.style.left = (c.cx - c.d / 2) + 'px'; e.style.top = (c.cy - c.d / 2) + 'px';
        e.style.opacity = String(Math.max(0.4, G.Save.set.btnOpacity != null ? G.Save.set.btnOpacity : 1));
        e.classList.toggle('sel', id === sel);
      };
      const commit = () => { lay[tab] = cur; G.Save.save(true); };
      const select = id => {
        sel = id; entry.sel = id;
        Object.keys(btnEls).forEach(k => btnEls[k].classList.toggle('sel', k === id));
        sizeRow.hidden = !id;
        if (id) { const s = posOf(id).s; sizeIn.value = String(s); sizeOut.textContent = Math.round(s * 100) + '%'; }
      };
      for (const id of Object.keys(defs)) {
        const b = el('div.tbtn.hl-btn.tb-' + id, { html: '<span class="ico">' + (G.Input.ICONS[id] || '') + '</span>', dataset: { id } });
        btnEls[id] = b;
        let drag = null;
        b.addEventListener('pointerdown', ev => {
          ev.preventDefault(); ev.stopPropagation();
          try { b.setPointerCapture(ev.pointerId); } catch (e) { /* optional */ }
          const lp = G.Screen ? G.Screen.toLocal(ev.clientX, ev.clientY) : { x: ev.clientX, y: ev.clientY };
          const c = posOf(id);
          drag = { id: ev.pointerId, ox: c.cx - lp.x, oy: c.cy - lp.y, moved: false };
          select(id);
        });
        b.addEventListener('pointermove', ev => {
          if (!drag || ev.pointerId !== drag.id) return;
          ev.preventDefault();
          const lp = G.Screen ? G.Screen.toLocal(ev.clientX, ev.clientY) : { x: ev.clientX, y: ev.clientY };
          const c = posOf(id), half = c.d / 2;
          // Snap to a 4 px grid and keep the whole button on screen.
          const px = U.clamp(Math.round((lp.x + drag.ox) / 4) * 4, half, W() - half);
          const py = U.clamp(Math.round((lp.y + drag.oy) / 4) * 4, half, H() - half);
          cur[id] = { x: px / W(), y: py / H(), s: c.s };
          if (!drag.moved) { drag.moved = true; root.classList.add('hl-dragging'); }
          place(id); clashCheck();
        });
        const end = ev => {
          if (!drag || ev.pointerId !== drag.id) return;
          if (drag.moved) commit();
          drag = null; root.classList.remove('hl-dragging');
        };
        b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
        root.appendChild(b);
      }
      // Toolbar: layout tabs (with a "now" badge on the one in play) + reset / done.
      const tabs = el('div.hl-tabs', TABS.map(t => el('button.tab' + (t === tab ? '.on' : ''), { type: 'button', onclick: () => { entry.tab = t; entry.sel = null; G.UI.refresh(entry); } },
        el('span', { i18n: 'hl.tab.' + t }), t === modeLayout ? el('i.hl-now', { i18n: 'hl.now' }) : null)));
      const done = () => {
        commit();
        // Back to the game: close the editor and the settings/pause menus it was opened from.
        const finish = () => {
          G.UI.toast(G.t('hl.saved'));
          for (let i = G.UI.stack.length - 1; i >= 0; i--) { const e = G.UI.stack[i]; if (['hud-editor', 'settings', 'pause', 'confirm'].includes(e.id)) G.UI.close(e); else break; }
        };
        if (clashCheck()) G.UI.confirm(G.t('hl.clash'), finish, { yesKey: 'hl.keep', noKey: 'hl.fix' });
        else finish();
      };
      const bar = el('div.hl-bar', tabs,
        el('div.hl-acts',
          G.UI.btn('hl.reset', () => G.UI.confirm(G.t('hl.resetConfirm'), () => { delete lay[tab]; G.Save.save(true); entry.sel = null; G.UI.refresh(entry); }), 'small'),
          G.UI.btn('hl.done', done, 'go small')));
      root.appendChild(bar);
      // Bottom panel: hint, size of the selected button, overall opacity.
      const sizeIn = el('input', { type: 'range', min: '0.6', max: '1.6', step: '0.05', value: '1', id: 'hl-size' });
      const sizeOut = el('b.hl-val');
      const sizeRow = el('label.hl-ctl', el('span', { i18n: 'hl.size' }), sizeIn, sizeOut);
      sizeIn.addEventListener('input', () => {
        if (!sel) return;
        const c = posOf(sel);
        cur[sel] = { x: c.cx / W(), y: c.cy / H(), s: +sizeIn.value };
        sizeOut.textContent = Math.round(+sizeIn.value * 100) + '%';
        place(sel); clashCheck(); commit();
      });
      const opv = G.Save.set.btnOpacity != null ? G.Save.set.btnOpacity : 1;
      const opIn = el('input', { type: 'range', min: '0.3', max: '1', step: '0.05', value: String(opv), id: 'hl-opacity' });
      const opOut = el('b.hl-val', { text: Math.round(opv * 100) + '%' });
      opIn.addEventListener('input', () => { G.Save.set.btnOpacity = +opIn.value; opOut.textContent = Math.round(+opIn.value * 100) + '%'; Object.keys(btnEls).forEach(place); G.Save.save(true); });
      const panel = el('div.hl-panel', el('div.hl-hint', { i18n: 'hl.hint' }), sizeRow, el('label.hl-ctl', el('span', { i18n: 'hl.opacity' }), opIn, opOut));
      root.appendChild(panel);
      root.addEventListener('pointerdown', ev => { if (ev.target === root || ev.target === stick || ev.target.classList.contains('hl-cross')) select(null); });
      Object.keys(btnEls).forEach(place);
      select(sel);
      clashCheck();
      // Keep the active tab visible in the scrollable tab row.
      requestAnimationFrame(() => { const on = tabs.querySelector('.tab.on'); if (on) tabs.scrollLeft = Math.max(0, on.offsetLeft - 8); });
      return root;
    },
  });

  // Storage that cannot persist (some in-app browsers block it) is probed by G.Save.load; the notice is a
  // persistent pill on the title and a chip in town (07b_screens_core), not a toast that can vanish before
  // the title is even up. HL.storageOk stays for older callers.
  G.bus.on('boot', () => { HL.storageOk = !(G.Save.blocked && G.Save.blocked()); });

  const css = document.createElement('style');
  css.textContent = [
    '#ui.hl-editing .screen:not([data-screen="hud-editor"]):not([data-screen="confirm"]){visibility:hidden;}',
    '.screen[data-screen="hud-editor"]{padding:0;background:rgba(20,16,60,0.5);}',
    '.hl-root{position:absolute;inset:0;touch-action:none;pointer-events:auto;background-image:linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px);background-size:32px 32px;}',
    '.hl-stick{position:absolute;left:0;top:0;bottom:0;width:45%;border-right:3px dashed rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;}',
    '.hl-stick.right{left:auto;right:0;border-right:0;border-left:3px dashed rgba(255,255,255,0.35);}',
    '.hl-stick span{font:800 13px var(--f-body);color:rgba(255,255,255,0.8);text-shadow:0 1px 0 var(--ink);pointer-events:none;}',
    '.hl-cross{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border:3px solid rgba(255,255,255,0.8);border-radius:50%;}',
    '.hl-btn{position:absolute;right:auto;bottom:auto;cursor:grab;transform:none!important;animation:none!important;transition:box-shadow .1s;z-index:2;}',
    '.hl-btn.sel{box-shadow:0 0 0 4px var(--sun),0 5px 0 rgba(30,26,77,0.4);z-index:4;}',
    '.hl-btn.clash{box-shadow:0 0 0 4px #ff4d5e,0 5px 0 rgba(30,26,77,0.4);}',
    // Editor panels live in the joystick half (no buttons there by default) so they never cover a button.
    '.hl-bar{position:absolute;left:8px;top:64px;width:calc(45% - 16px);min-width:240px;display:flex;flex-direction:column;gap:6px;align-items:stretch;background:rgba(243,250,255,0.95);border:3px solid var(--ink);border-radius:14px;padding:6px;box-shadow:0 4px 0 var(--shadow);z-index:3;transition:opacity .15s;}',
    '.hl-root.lefty .hl-bar,.hl-root.lefty .hl-panel{left:auto;right:8px;}',
    '.hl-tabs{display:flex;gap:4px;overflow-x:auto;min-width:0;scrollbar-width:none;}', '.hl-tabs::-webkit-scrollbar{display:none;}',
    '.hl-tabs .tab{padding:4px 9px;font-size:12px;white-space:nowrap;position:relative;flex:none;box-shadow:0 2px 0 var(--ink);}',
    '.hl-now{position:absolute;top:-8px;right:-4px;font:800 9px/1 var(--f-body);font-style:normal;background:var(--coral);color:#fff;border:2px solid var(--ink);border-radius:99px;padding:2px 4px;}',
    '.hl-acts{display:flex;gap:6px;flex:none;justify-content:flex-end;}', '.hl-acts .btn.small{min-height:34px;padding:4px 10px;font-size:13px;}',
    '.hl-panel{position:absolute;left:8px;bottom:8px;display:flex;flex-direction:column;gap:2px;background:rgba(243,250,255,0.95);border:3px solid var(--ink);border-radius:12px;padding:4px 10px;box-shadow:0 4px 0 var(--shadow);width:calc(45% - 16px);min-width:240px;z-index:3;transition:opacity .15s;}',
    '.hl-dragging .hl-bar,.hl-dragging .hl-panel{opacity:0.25;pointer-events:none;}',
    '.hl-hint{font:800 11px/1.3 var(--f-body);color:var(--ink-soft);text-align:center;}',
    '.hl-ctl{display:grid;grid-template-columns:auto 1fr 40px;gap:6px;align-items:center;font:800 12px var(--f-body);}',
    '.hl-ctl input{min-height:22px;}', '.hl-val{text-align:right;font-variant-numeric:tabular-nums;}',
  ].join('\n');
  document.head.appendChild(css);
})(window.G);

}).call(window); } catch (e) { console.error('[module 07c_hud_layout.js]', e); }
// ---- 08_hud.js
try { (function () {
// In-game HUD: vitals, ammo, weapon slots, crosshair, hit markers, damage numbers, objective,
// timer, feeds, minimap, world markers, boss/team bars, interact prompt. Modes toggle sections.
// Motion: bars ease with a delayed damage trail, Clinks count up, the crosshair spread is damped and
// kicks on hits, damage arcs keep pointing at the attacker, feeds slide in/out (FLIP), objective and
// timer pulse. The per-frame path only writes to the DOM when a value changes, animates with
// transform/opacity, never reads layout, and does not allocate per hit (damage numbers are pooled).
// Player options: Text & UI size (CSS vars from layoutVars), crosshair style / colour / size / opacity,
// sound captions (G.Audio.onCaption, max 2 lines, never over the crosshair), flash comfort (G.Motion).
// Small phones / big text: fitColumns keeps the top-left column above the weapon block, starts the pickup feed under
// it and fades world markers that fall under a HUD chip (H.relayout; measured on size changes, never per frame).
(function (G) {
  const el = (...a) => G.UI.el(...a);
  const U = G.util;
  const V3 = THREE.Vector3;
  const _v = new V3();
  const H = G.HUD = { cfg: {}, markers: new Map(), nums: [], visible: false };
  let root, R = {};
  const reduced = () => (G.UI.reduced ? G.UI.reduced() : !!G.Save.set.reducedMotion);
  const TRAIL_HOLD = 0.42;      // s the damage trail waits before draining
  const NUM_LIFE = 0.85, NUM_MAX = 24;
  const DIR_LIFE = 1.25;
  const OB_TICK_GAP = 600;      // ms between progress-only objective rings
  // Text & UI size (G.Save.set.textSize): HUD text scale, menu zoom, minimap scale, caption font (px).
  const TEXT_K = { s: 0.9, m: 1, l: 1.15, xl: 1.3 };
  const MENU_Z = { s: 0.92, m: 1, l: 1.1, xl: 1.2 };
  const MM_K = { s: 0.9, m: 1, l: 1.12, xl: 1.25 };
  const CAP_PX = { s: 15, m: 16, l: 19, xl: 22 };
  H.textK = () => TEXT_K[G.Save && G.Save.data ? G.Save.set.textSize : 'm'] || 1;
  // Crosshair colours (always drawn on a dark ink outline); on a target it turns coral (gold when pink is picked).
  const XH_COL = { white: '#ffffff', yellow: '#ffd23f', cyan: '#5ce1ff', pink: '#ff7ac8', green: '#6dff8e' };
  H.XH_COL = XH_COL;
  const flashK = () => (G.Motion ? G.Motion.flash() : 1);

  // Bar with a damage trail: s (pale trail) behind i (fill) behind b (label).
  function makeBar(cls) {
    const e = el('div.vbar' + cls, el('s'), el('i'), el('b'));
    return { el: e, trail: e.children[0], fill: e.children[1], label: e.children[2], v: -1, tv: 0, hold: 0, wf: -1, wt: -1, flash: '', flashT: 0 };
  }
  // A hit drops the fill at once and the trail holds the old level for TRAIL_HOLD s, then drains;
  // heals rise smoothly. Frame-rate independent (damp + a minimum speed so it always lands).
  function stepBar(B, target, dt) {
    target = target > 1 ? 1 : target < 0 ? 0 : target;
    if (B.v < 0) { B.v = B.tv = target; B.hold = 0; }
    else if (target < B.v - 1e-4) {
      const drop = B.v - target;
      if (B.tv < B.v) B.tv = B.v;
      B.v = target; B.hold = TRAIL_HOLD;
      if (drop > 0.04 && B.flashT <= 0 && !reduced() && flashK() >= 1) {
        // restart the white flash by alternating two identical animations (no reflow)
        const n = B.flash === 'fa' ? 'fb' : 'fa';
        if (B.flash) B.el.classList.remove(B.flash);
        B.el.classList.add(n); B.flash = n; B.flashT = 0.12;
      }
    } else if (target > B.v + 1e-4) B.v = Math.min(target, U.damp(B.v, target, 9, dt) + 0.06 * dt);
    if (B.flashT > 0) B.flashT -= dt;
    if (B.tv < B.v) B.tv = B.v;
    // the frame the hold runs out drains for the time left over, so the curve is the same at any rate
    let dd = dt;
    if (B.hold > 0) { B.hold -= dt; if (B.hold > 0) dd = 0; else { dd = -B.hold; B.hold = 0; } }
    if (dd > 0 && B.tv > B.v) B.tv = Math.max(B.v, U.damp(B.tv, B.v, 6.5, dd) - 0.05 * dd);
    if (B.v !== B.wf && (Math.abs(B.v - B.wf) > 0.0015 || B.v === target)) { B.wf = B.v; B.fill.style.transform = 'scaleX(' + B.v.toFixed(4) + ')'; }
    if (B.tv !== B.wt && (Math.abs(B.tv - B.wt) > 0.0015 || B.tv === B.v)) { B.wt = B.tv; B.trail.style.transform = 'scaleX(' + B.tv.toFixed(4) + ')'; }
  }
  const setText = (node, s) => { if (node._s !== s) { node.textContent = s; node._s = s; } };
  const show = (node, on) => { if (node.hidden === !!on) node.hidden = !on; };

  H.init = function () {
    root = document.getElementById('hud');
    root.innerHTML = '';
    R.vig = el('div.vignette'); root.appendChild(R.vig); R.vigO = '0';
    R.dmgdir = el('div.dmgdir'); root.appendChild(R.dmgdir);
    R.dirs = []; R.dirS = [];
    for (let i = 0; i < 4; i++) { const d = el('i'); R.dmgdir.appendChild(d); R.dirs.push(d); R.dirS.push({ t: 0, age: 0, x: 0, z: 0, wa: 1e9, ws: -1, wo: '0' }); }
    R.markers = el('div.markers'); root.appendChild(R.markers);
    R.cross = el('div.crosshair.xh-classic', el('i.c-dot'), el('i.c-l'), el('i.c-r'), el('i.c-t'), el('i.c-b'), el('i.c-ring'));
    root.appendChild(R.cross);
    R.xh = { st: null, col: null, k: -1, op: -1 };
    // Hit marker: four ticks that start 13 px out from the centre (they used to reach 5 px in and cover a
    // small robot right under the crosshair). White = hit, gold = weak spot, coral = pop.
    R.hit = el('div.hitmark', { html: '<svg viewBox="0 0 44 44"><path d="M5 5l8 8M39 5l-8 8M5 39l8-8M39 39l-8-8" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>' });
    R.hit.style.width = R.hit.style.height = '44px'; R.hit.style.margin = '-22px 0 0 -22px';
    R.hitPath = R.hit.querySelector('path'); R.hitCol = '#fff';
    root.appendChild(R.hit);
    // Boss / weak-point callout ("Core open — shoot it!"): a gold chip just under the crosshair, where the eye
    // already is — clear of the reticle and its spread, of the in-play toast lane at the top and of the
    // weapon / ammo block at the bottom.
    R.call = el('div.hud-chip.callout', { style: { position: 'absolute', left: '50%', top: 'calc(50% + 46px)', transform: 'translateX(-50%)', background: '#ffd23f', color: '#1e1a4d', fontWeight: '800', fontSize: 'max(14px, calc(14px * var(--ui-t, 1)))', padding: '4px 12px', whiteSpace: 'nowrap', pointerEvents: 'none' } });
    R.call.hidden = true; R.callT = 0; R.callK = '';
    root.appendChild(R.call);
    R.tl = el('div.hud-tl'); R.tc = el('div.hud-tc'); R.tr = el('div.hud-tr'); R.bl = el('div.hud-bl'); R.bc = el('div.hud-bc');
    root.append(R.tl, R.tc, R.tr, R.bl, R.bc);
    // top-left (right of the pause button): vitals, then objective — clear of the joystick thumb
    R.sb = makeBar('.sh.t1'); R.hb = makeBar('.hp'); R.shTier = 1;
    R.vitals = el('div.vitals', R.sb.el, R.hb.el);
    R.tl.appendChild(R.vitals);
    R.obT = el('div.ob-t'); R.obX = el('div.ob-x'); R.obFill = el('i'); R.obBar = el('div.bar', R.obFill);
    R.obj = el('div.objective', R.obT, R.obX, R.obBar); R.obPulseAt = -1e9;
    R.tl.appendChild(R.obj);
    R.custTL = el('div.col'); R.tl.appendChild(R.custTL);
    // top-center: timer, team bar, boss
    R.timerTxt = el('span'); R.timer = el('div.hud-chip.big', R.timerTxt); R.tc.appendChild(R.timer);
    R.team = el('div.teambar', el('i.ta'), el('i.tb')); R.tc.appendChild(R.team);
    R.bossB = makeBar(''); R.bossN = el('div.bn'); R.boss = el('div.bossbar', R.bossN, R.bossB.el); R.tc.appendChild(R.boss); R.bossT = null;
    R.custTC = el('div.col', { style: { alignItems: 'center' } }); R.tc.appendChild(R.custTC);
    // top-right: minimap, bolts, feed
    R.mm = el('div.minimap'); R.mmc = el('canvas'); R.mmc.width = R.mmc.height = 160; R.mm.appendChild(R.mmc); R.tr.appendChild(R.mm);
    R.coin = el('i.coin'); R.boltsB = el('b', { text: '0' });
    R.bolts = el('div.hud-chip', R.coin, R.boltsB); R.tr.appendChild(R.bolts);
    R.custTR = el('div.col', { style: { alignItems: 'flex-end' } }); R.tr.appendChild(R.custTR);
    R.feed = el('div.feed'); R.tr.appendChild(R.feed);
    // left-middle: pickups feed; bottom-left: custom widgets
    R.pick = el('div.pickfeed'); root.appendChild(R.pick);
    R.custBL = el('div.col'); R.bl.appendChild(R.custBL);
    // bottom-center: weapon slots + ammo
    R.slots = el('div.wslots'); R.bc.appendChild(R.slots);
    R.ammo = el('div.ammo'); R.bc.appendChild(R.ammo);
    R.prompt = el('div.prompt'); root.appendChild(R.prompt); R.prompt.hidden = true; R.promptX = R.promptY = null;
    R.fps = el('div.fps'); root.appendChild(R.fps);
    R.nums = el('div', { style: { position: 'absolute', inset: '0', overflow: 'hidden' } }); root.appendChild(R.nums);
    R.custom = el('div', { style: { position: 'absolute', inset: '0' } }); root.appendChild(R.custom);
    // sound captions: two pooled lines, newest at the bottom
    R.caps = el('div.captions'); root.appendChild(R.caps);
    R.capL = [];
    for (let i = 0; i < 2; i++) {
      const e = el('div.cap', el('span.ar', { html: CAP_ARROW }), el('span'));
      e.hidden = true; R.caps.appendChild(e);
      R.capL.push({ el: e, txt: e.lastChild, text: '', dir: '', t: 0, on: false, out: 0, seq: 0, dx: 0, fs: 0 });
    }
    R.capMax = 2; R.capCross = -1;
    if (G.Audio && G.Audio.onCaption) G.Audio.onCaption(e => { if (e && e.on) H.caption(e.line || e.text, e.dir); });
    R.pickMax = 4; R.occ = [];
    // the column fit (fitColumns) follows the top columns and the weapon block as they change size
    if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => H.relayout()); for (const c of [R.tl, R.tc, R.tr, R.bc]) ro.observe(c); }
    G.bus.on('weapon-equip', () => H.buildSlots());
    G.bus.on('device', () => { H.buildSlots(); capDirty = true; H.relayout(); });
    G.bus.on('lang', () => { if (H.visible) H.buildSlots(); });
    G.bus.on('resize', () => H.layoutVars());
    G.bus.on('screen', () => H.layoutVars());
    G.bus.on('ui-open', () => H.layoutVars());
    H.layoutVars();
    H.hide();
  };
  // Frame-relative sizes for the CSS (vw/vh and media queries follow the physical screen, which is
  // wrong while the frame is CSS-rotated): --gw/--gh game-frame size, --ui-u the touch-button scale
  // (the pause button grows with it, so the top-left column moves right with it), --slot-px weapon
  // slot size (small phones get narrower slots so 4 weapons stay clear of the thumb buttons), and
  // html classes gh-short / gw-narrow / gw-tiny for the compact rules in style.css.
  // Text & UI size: --ui-t (HUD text), --ui-mz (menu zoom; on short frames only part of the gain so
  // panels keep fitting), --mm-px (minimap). Button size stays with --ui-u / --slot-px.
  let lvW = 0, lvH = 0, lvU = 0, lvT = '';
  H.layoutVars = function () {
    const w = G.Screen ? G.Screen.w() : window.innerWidth, h = G.Screen ? G.Screen.h() : window.innerHeight;
    const u = G.HudLayout && G.HudLayout.uiScale ? G.HudLayout.uiScale() : 1;
    const ts = G.Save && G.Save.data && TEXT_K[G.Save.set.textSize] ? G.Save.set.textSize : 'm';
    if (w === lvW && h === lvH && u === lvU && ts === lvT) return;
    lvW = w; lvH = h; lvU = u; lvT = ts;
    capDirty = true;
    const de = document.documentElement;
    de.style.setProperty('--gw', w + 'px'); de.style.setProperty('--gh', h + 'px');
    de.style.setProperty('--ui-u', u.toFixed(3));
    const mz0 = MENU_Z[ts], room = U.clamp((h - 300) / 160, 0.45, 1);
    de.style.setProperty('--ui-t', String(TEXT_K[ts]));
    de.style.setProperty('--ui-mz', (mz0 > 1 ? 1 + (mz0 - 1) * room : mz0).toFixed(3));
    // (a small phone keeps its minimap at the M size at L / XL: it holds no text, and a bigger one only squeezes the
    // top-centre column — Fountain Guard's wave, break and next-wave rows)
    de.style.setProperty('--mm-px', Math.round((w <= 600 ? 92 : h <= 460 ? 96 : 120) * (w <= 600 ? Math.min(1, MM_K[ts]) : MM_K[ts])) + 'px');
    de.style.setProperty('--slot-px', Math.round(44 * U.clamp(0.45 + 0.55 * u, 0.8, 1.2)) + 'px');
    de.classList.toggle('gh-short', h <= 460);
    de.classList.toggle('gw-narrow', w <= 780);
    de.classList.toggle('gw-tiny', w <= 600);
    H.relayout();
  };

  // cfg keys: vitals, weapons, crosshair, minimap, objective, timer, bolts, boss, team, feed
  H.show = function (cfg) {
    H.cfg = Object.assign({ vitals: true, weapons: true, crosshair: true, minimap: true, objective: false, timer: false, bolts: true, boss: false, team: false, feed: true }, cfg || {});
    root.hidden = false; H.visible = true;
    const c = H.cfg;
    R.vitals.hidden = !c.vitals; R.slots.hidden = !c.weapons; R.ammo.hidden = !c.weapons;
    R.cross.hidden = !c.crosshair; R.mm.hidden = !c.minimap; R.obj.hidden = !c.objective;
    R.timer.hidden = !c.timer; R.bolts.hidden = !c.bolts; R.boss.hidden = !c.boss; R.team.hidden = !c.team; R.feed.hidden = !c.feed;
    R.custTL.innerHTML = ''; R.custTC.innerHTML = ''; R.custTR.innerHTML = ''; R.custBL.innerHTML = ''; R.custom.innerHTML = '';
    R.feed.innerHTML = ''; R.pick.innerHTML = '';
    H.clearMarkers();
    H.minimapDraw = null; H.minimapPose = null; H.minimapHideEnemies = false;
    root.style.setProperty('--hud-scale', G.Save.set.hudScale);
    clearCaptions(); capDirty = true;
    // a new mode starts from its own values: bars, counters and the crosshair snap on their first update
    R.sb.v = R.hb.v = R.bossB.v = -1; R.bossT = null;
    boltSnap = true; crossInit = false; R.objShown = false; R.obPulseAt = -1e9; R.timerSec = null; R.timerDown = false;
    // one-shot pulse classes left from the last mode would replay as the HUD is shown again (display
    // none -> block restarts CSS animations): drop them
    for (const B of [R.sb, R.hb, R.bossB]) { if (B.flash) { B.el.classList.remove(B.flash); B.flash = ''; } B.flashT = 0; }
    if (R.obPulse) { R.obj.classList.remove(R.obPulse); R.obPulse = ''; }
    if (R.timerBeat) { R.timerTxt.classList.remove(R.timerBeat); R.timerBeat = ''; }
    for (const d of R.dirS) d.t = 0;
    hurtV = 0;
    H.clearCallout();
    H.buildSlots();
    H.relayout();
  };
  H.hide = function () {
    if (root) root.hidden = true;
    if (R.capL) clearCaptions();
    if (R.call) H.clearCallout();
    H.visible = false; H.clearMarkers();
    for (const n of H.nums) { n.el.className = 'dmgnum off'; numPool.push(n); }
    H.nums.length = 0;
  };
  // Containers modes can fill with their own widgets.
  H.slot = function (where) { return { tl: R.custTL, tc: R.custTC, tr: R.custTR, bl: R.custBL, full: R.custom }[where]; };

  // Objective: a new title flashes + rings, a progress-only change just rings; the fill slides.
  H.setObjective = function (title, text, frac) {
    show(R.obj, true);
    title = title || ''; text = text || '';
    const newTitle = title !== R.obT._s, newText = text !== R.obX._s;
    setText(R.obT, title); setText(R.obX, text);
    show(R.obBar, frac != null);
    if (frac != null) {
      const f = U.clamp(frac, 0, 1), s = 'translateX(' + ((f - 1) * 100).toFixed(1) + '%)';
      if (s !== R.obW) { R.obW = s; R.obFill.style.transform = s; }
      const done = f >= 1;
      if (done !== R.obDone) { R.obDone = done; R.obBar.classList.toggle('done', done); }
    }
    // A progress-only change rings at most once per OB_TICK_GAP ms: a counter that changes every few frames
    // (rescue / repair %) would otherwise restart the ring each frame and freeze it fully lit.
    const now = performance.now();
    if ((newTitle || newText) && R.objShown && !reduced() && (newTitle || now - R.obPulseAt >= OB_TICK_GAP)) {
      const tick = !newTitle;
      if (tick !== R.obTick) { R.obTick = tick; R.obj.classList.toggle('tick', tick); }
      const n = R.obPulse === 'pa' ? 'pb' : 'pa';
      if (R.obPulse) R.obj.classList.remove(R.obPulse);
      R.obj.classList.add(n); R.obPulse = n; R.obPulseAt = now;
    }
    R.objShown = true;
  };
  H.clearObjective = function () { show(R.obj, false); };
  // Timer: red while warned. A countdown running short gets a heartbeat on each new second and a
  // pulsing ring; a count-up timer past par (expedition / boss) beats once when it turns red and then
  // just stays red — a minutes-long alarm would only nag.
  H.setTimer = function (sec, warn) {
    if (sec == null) { show(R.timer, false); R.timerSec = null; return; }
    show(R.timer, true);
    warn = !!warn;
    const s = U.fmtClock(sec);
    const newSec = R.timerTxt._s !== s;
    if (newSec) { if (R.timerSec != null && sec !== R.timerSec) R.timerDown = sec < R.timerSec; R.timerSec = sec; }
    const turned = warn !== R.timerWarn;
    if (turned) { R.timerWarn = warn; R.timer.classList.toggle('warn', warn); }
    const urgent = warn && R.timerDown;
    if (urgent !== R.timerUrgent) { R.timerUrgent = urgent; R.timer.classList.toggle('urgent', urgent); }
    if (newSec || (turned && warn)) {
      setText(R.timerTxt, s);
      if (warn && (urgent || turned) && !reduced()) {
        const n = R.timerBeat === 'ta' ? 'tb' : 'ta';
        if (R.timerBeat) R.timerTxt.classList.remove(R.timerBeat);
        R.timerTxt.classList.add(n); R.timerBeat = n;
      }
    }
  };
  H.setBoss = function (name, frac) {
    if (frac == null) { show(R.boss, false); R.bossT = null; return; }
    if (R.boss.hidden) { R.boss.hidden = false; R.bossB.v = -1; }
    setText(R.bossN, name || '');
    R.bossT = frac;
  };
  H.setTeam = function (a, b) {
    show(R.team, true);
    const sa = (a * 100).toFixed(1) + '%', sb = (b * 100).toFixed(1) + '%';
    if (sa !== R.teamA) { R.teamA = sa; R.team.children[0].style.width = sa; }
    if (sb !== R.teamB) { R.teamB = sb; R.team.children[1].style.width = sb; }
  };
  // Clinks: gains count up (with a coin bump), spending and the first value of a mode snap.
  let boltT = 0, boltV = 0, boltRate = 0, boltSnap = true, boltBump = null;
  function writeBolts() { setText(R.boltsB, G.i18n.num(Math.floor(boltV))); }
  H.setBolts = function (n) {
    n = Math.floor(n) || 0;
    if (n === boltT && !boltSnap) return;
    if (boltSnap || !H.visible || n < boltT || reduced()) { boltT = boltV = n; boltSnap = false; writeBolts(); return; }
    boltT = n;
    const gap = boltT - boltV;
    boltRate = Math.max(24, gap / U.clamp(0.3 + 0.12 * Math.log10(gap + 1), 0.3, 0.9));
    if (!boltBump || boltBump.playState !== 'running') {
      boltBump = G.UI.anim(R.coin, [{ scale: 1, rotate: '0deg' }, { scale: 1.45, rotate: '-14deg', offset: 0.35 }, { scale: 1, rotate: '0deg' }], { duration: 320, easing: 'ease-out' });
      G.UI.anim(R.boltsB, [{ scale: 1.22, color: '#109a4c' }, { scale: 1, color: '#1e1a4d' }], { duration: 360, easing: 'cubic-bezier(.2,.9,.3,1)' });
    }
  };
  // Kill feed (right) and pickups (left): slide in, slide out, the rest glide up.
  H.feed = function (text, color) {
    const d = el('div', { text }); if (color) d.style.background = color;
    R.feed.appendChild(d);
    let live = 0;
    for (let n = R.feed.lastElementChild; n; n = n.previousElementSibling) if (!n.classList.contains('out') && ++live > 5) G.UI.leave(n);
    while (R.feed.children.length > 8) R.feed.firstChild.remove();
    setTimeout(() => G.UI.leave(d), 4000);
    return d;
  };
  H.pick = function (text, iconHtml) {
    const now = performance.now();
    // merge repeated lines (and keep the merged line up a little longer)
    const last = R.pick.lastElementChild;
    if (last && !last.classList.contains('out') && last._t === text && now - last._at < 1500) {
      last._n++; last.lastChild.textContent = text + ' ×' + last._n; last._at = now;
      clearTimeout(last._tm); last._tm = setTimeout(() => G.UI.leave(last), 2600);
      G.UI.anim(last, [{ scale: 1.12 }, { scale: 1 }], { duration: 220, easing: 'ease-out' });
      return;
    }
    const d = el('div', iconHtml ? el('span', { html: iconHtml, style: { display: 'inline-flex', width: '18px', height: '18px' } }) : null, el('span', { text }));
    d._t = text; d._n = 1; d._at = now;
    R.pick.appendChild(d);
    let live = 0;
    // (as many lines as fit between the column above and the bottom edge: fitColumns)
    for (let n = R.pick.lastElementChild; n; n = n.previousElementSibling) if (!n.classList.contains('out') && ++live > R.pickMax) G.UI.leave(n);
    while (R.pick.children.length > 7) R.pick.firstChild.remove();
    d._tm = setTimeout(() => G.UI.leave(d), 2600);
  };
  // Hit marker: one reusable Animation per kind, restarted per hit (no reflow); kills are bigger,
  // coral and twist in. Both also kick the crosshair open a little.
  const HIT_KF = [{ opacity: 1, transform: 'scale(1.45)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(0.96)' }];
  const KILL_KF = [{ opacity: 1, transform: 'scale(1.9) rotate(-14deg)' }, { opacity: 1, transform: 'scale(1.04) rotate(0deg)', offset: 0.28 }, { opacity: 1, transform: 'scale(1.1)', offset: 0.62 }, { opacity: 0, transform: 'scale(1.32)' }];
  const FADE_KF = [{ opacity: 1 }, { opacity: 0 }];
  const hitAnims = {};
  H.hitmark = function (kill, crit) {
    kill = !!kill;
    if (R.hit._kill !== kill) { R.hit.classList.toggle('kill', kill); R.hit._kill = kill; }
    // weak-spot hits flash gold (a kill keeps its coral from the .kill rule)
    const col = crit && !kill ? '#ffd23f' : '#fff';
    if (col !== R.hitCol && R.hitPath) { R.hitCol = col; R.hitPath.setAttribute('stroke', col); }
    if (typeof R.hit.animate !== 'function') return;
    const kind = reduced() ? 'fade' : kill ? 'kill' : 'hit';
    for (const k in hitAnims) if (k !== kind && hitAnims[k].playState === 'running') hitAnims[k].cancel();
    let a = hitAnims[kind];
    if (!a) a = hitAnims[kind] = R.hit.animate(kind === 'fade' ? FADE_KF : kind === 'kill' ? KILL_KF : HIT_KF, { duration: kind === 'kill' ? 380 : 240, easing: 'cubic-bezier(.2,.8,.3,1)' });
    else { a.currentTime = 0; a.play(); }
    if (kind !== 'fade') crossKick = Math.min(10, crossKick + (kill ? 7 : 3.5));
  };
  // Callout chip (boss stun windows: "Core open — shoot it!"). Re-calling with the same text just extends it;
  // it pops in, gently pulses while up and slides away when its time runs out.
  const CALL_IN = [{ opacity: 0, transform: 'translateX(-50%) scale(0.6)' }, { opacity: 1, transform: 'translateX(-50%) scale(1.12)', offset: 0.6 }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }];
  H.callout = function (text, dur, opts) {
    if (!R.call || !text) return;
    const fresh = R.call.hidden || R.callK !== text;
    R.callT = Math.max(dur || 2, fresh ? 0 : R.callT);
    if (fresh) {
      setText(R.call, text); R.callK = text;
      const bg = (opts && opts.color) || '#ffd23f';
      if (R.call._bg !== bg) { R.call._bg = bg; R.call.style.background = bg; }
      R.call.hidden = false; R.call.style.opacity = '1';
      if (!reduced()) G.UI.anim(R.call, CALL_IN, { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1)' });
    }
  };
  // clearCallout(text) only clears that callout (another one may have replaced it meanwhile)
  H.clearCallout = function (text) { if (!R.call || (text && R.callK !== text)) return; R.callT = 0; R.callK = ''; R.call.hidden = true; };
  let hurtV = 0;
  // hurt vignette: with Flashes = Softer it peaks lower and rises less per hit
  H.hurt = function (frac) { const k = flashK(); hurtV = Math.min(k < 1 ? 0.55 : 1, hurtV + (0.35 + frac * 2) * k); };
  H.flashShieldBreak = function () { G.UI.anim(R.sb.el, [{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' }); };
  // Damage direction: up to four arcs; a hit from (roughly) the same side refreshes that arc. Each
  // arc remembers the attacker's position and re-aims every frame as the player turns.
  H.damageFrom = function (pos) {
    const pl = G.Game.world && G.Game.world.player; if (!pl || !pos) return;
    const ang = Math.atan2(pos.x - pl.pos.x, pos.z - pl.pos.z);
    let d = null, best = 0.5;
    for (const s of R.dirS) {
      if (s.t <= 0) continue;
      const dd = Math.abs(U.wrapAngle(Math.atan2(s.x - pl.pos.x, s.z - pl.pos.z) - ang));
      if (dd < best) { best = dd; d = s; }
    }
    if (d) d.age = Math.min(d.age, 0.08);
    else { d = R.dirS[0]; for (const s of R.dirS) if (s.t < d.t) d = s; d.age = 0; }
    d.x = pos.x; d.z = pos.z; d.t = DIR_LIFE;
  };
  // Floating damage numbers, pooled (no DOM churn / allocation per hit).
  const numPool = [];
  let numSide = 1;
  const NUM_CLEAR = 46;   // px: numbers never start (or drift) inside this radius around the crosshair
  H.damageNumber = function (pos, amount, cls) {
    if (!H.visible) return;
    const n = Math.round(amount); if (n <= 0) return;
    let rec = H.nums.length >= NUM_MAX ? H.nums.shift() : numPool.pop();
    if (!rec) { const e = el('div.dmgnum.off'); R.nums.appendChild(e); rec = { el: e, pos: new V3(), t: 0, vx: 0, side: 1, crit: false, txt: '', wo: '' }; }
    rec.el.className = cls ? 'dmgnum ' + cls : 'dmgnum';
    const s = String(n); if (rec.txt !== s) { rec.el.textContent = s; rec.txt = s; }
    rec.pos.copy(pos); rec.pos.x += U.rand(-0.3, 0.3); rec.pos.y += U.rand(0, 0.3); rec.pos.z += U.rand(-0.3, 0.3);
    // numbers fan out to alternating sides and drift away from the crosshair (see H.frame)
    numSide = -numSide;
    rec.t = 0; rec.side = numSide; rec.vx = numSide * U.rand(10, 34); rec.crit = cls === 'crit'; rec.wo = '0';
    rec.el.style.opacity = '0';
    H.nums.push(rec);
  };
  // ---- Sound captions ("[Lock-on beeping, left]", GDD §13.3): fed by G.Audio.onCaption when the Sound captions
  // setting is on. Bottom-centre, above the weapon block and below the crosshair (and the boss callout), shifted
  // sideways into the free span between the touch buttons; at most 2 lines (1 when the gap is short, with the
  // font eased down to 13 px if even one line would not fit); each line fades out after 2.2–6 s. Layout is
  // measured only when a caption arrives after a resize / layout change; the frame loop just counts down.
  const CAP_ARROW = '<svg viewBox="0 0 24 24"><path d="M12 2.5l8.5 10H15v9H9v-9H3.5z" fill="currentColor" stroke="#1e1a4d" stroke-width="2" stroke-linejoin="round"/></svg>';
  let capDirty = true, capLive = false, capSeq = 0, capBot = 0, capMinTop = 0, capLx = 0, capRx = 0, capMine = null;
  const capLife = text => U.clamp(1.6 + text.length * 0.05, 2.2, 6);
  H.invalidateCaptions = function () { capDirty = true; };
  H.clearCaptions = function () { if (R.capL) clearCaptions(); };
  function clearCaptions() {
    for (const c of R.capL) { c.on = false; c.out = 0; c.t = 0; if (!c.el.hidden) c.el.hidden = true; c.el.classList.remove('in', 'out'); }
    capLive = false;
  }
  function capMeasure() {
    capDirty = false;
    const W = G.R.w, Hh = G.R.h, loc = r => (G.Screen ? G.Screen.rectToLocal(r) : r);
    if (!capMine) capMine = new Set([R.vig, R.dmgdir, R.markers, R.cross, R.hit, R.call, R.tl, R.tc, R.tr, R.bl, R.pick, R.prompt, R.fps, R.nums, R.caps, R.custom, R.bc]);
    let bot = Hh - 8, minTop = 0;
    // A widget well below the crosshair (weapon block, race speedo...) caps the band from below. One that starts just
    // under the crosshair (the expedition combo "×5") is a label beside the reticle, not a floor: as a floor it squeezed
    // the band up onto the crosshair, so the captions go below it instead.
    const consider = e => {
      if (!e || e.hidden || !e.getClientRects().length) return;
      const r = loc(e.getBoundingClientRect());
      if (r.right - r.left < 2 || r.bottom - r.top < 2) return;
      if (r.top > Hh * 0.5 && r.left < W * 0.5 + 150 && r.right > W * 0.5 - 150) {
        if (r.top > Hh * 0.5 + 48) bot = Math.min(bot, r.top);
        else minTop = Math.max(minTop, r.bottom + 4);
      }
    };
    if (!R.bc.hidden) for (const k of R.bc.children) consider(k);
    for (const k of R.custom.children) consider(k);
    for (const k of root.children) if (!capMine.has(k)) consider(k);   // mode widgets on the HUD root (race speedo...)
    capBot = bot - 6; capMinTop = minTop;
    // free horizontal span: between the screen edges and any touch button that reaches into the caption band
    let L = W * 0.04, Rr = W * 0.96;
    if (G.input.device === 'touch') {
      const band0 = capBot - 74;
      document.querySelectorAll('#touch.active .tbtn').forEach(b => {
        if (b.hidden) return;
        const st = b.style;
        let l = parseFloat(st.left), t = parseFloat(st.top), d = parseFloat(st.width);
        if (!(l === l && t === t && d === d)) { const r = loc(b.getBoundingClientRect()); l = r.left; t = r.top; d = r.right - r.left; }
        if (t > capBot || t + d < band0) return;
        if (l + d / 2 > W / 2) Rr = Math.min(Rr, l - 8); else L = Math.max(L, l + d + 8);
      });
    } else { L = W * 0.12; Rr = W * 0.88; }
    // the top-left / top-right columns (vitals, objective, minimap...) can reach down into the band on a
    // short frame or at a big text size: stay beside them
    const band0 = capBot - 74;
    for (const col of [R.tl, R.tr]) {
      if (col.hidden || !col.getClientRects().length) continue;
      for (const k of col.children) {
        if (k.hidden || !k.getClientRects().length) continue;
        const r = loc(k.getBoundingClientRect());
        if (r.bottom < band0 || r.right - r.left < 2) continue;
        if ((r.left + r.right) / 2 < W / 2) L = Math.max(L, r.right + 8); else Rr = Math.min(Rr, r.left - 8);
      }
    }
    if (Rr - L < 160) { const c = (L + Rr) / 2; L = c - 80; Rr = c + 80; }
    capLx = L; capRx = Rr;
    R.capCross = -1e9;
  }
  function capPlace() {
    const Hh = G.R.h, k = R.xh.k > 0 ? R.xh.k : 1;
    const ts = G.Save.data && CAP_PX[G.Save.set.textSize] ? G.Save.set.textSize : 'm';
    const ext = H.cfg.crosshair && !R.cross.hidden ? Math.max(14 * k, crossW + 9 * k) : 0;
    let top = Math.max(Hh / 2 + ext + 10, capMinTop);
    const call = R.callT > 0 && !R.call.hidden;
    if (call) top = Math.max(top, Hh / 2 + (R.callOff || 48) + 34 * H.textK());
    const avail = capBot - top, fs0 = CAP_PX[ts], line = f => f * 1.25 + 4;
    let n = avail >= 2 * line(fs0) + 4 ? 2 : 1, fs = fs0;
    if (n === 1 && avail < line(fs0)) fs = Math.max(13, (avail - 4) / 1.25);
    R.capCross = crossW; R.capCall = call;
    const vb = Math.round(Hh - capBot), vf = Math.round(fs * 10) / 10, vx = Math.round((capLx + capRx) / 2), vw = Math.round(capRx - capLx);
    if (vb !== R.capVb || vf !== R.capVf || vx !== R.capVx || vw !== R.capVw) {
      R.capVb = vb; R.capVf = vf; R.capVx = vx; R.capVw = vw;
      const st = R.caps.style;
      st.setProperty('--cap-b', Math.round(Hh - capBot) + 'px'); st.setProperty('--cap-fs', fs.toFixed(1) + 'px');
      st.setProperty('--cap-x', Math.round((capLx + capRx) / 2) + 'px'); st.setProperty('--cap-w', Math.round(capRx - capLx) + 'px');
      for (const c of R.capL) if (c.on) capCenter(c);
    }
    if (n !== R.capMax) { R.capMax = n; capTrim(); }
  }
  // Each line sits as close to the screen centre as the free span allows (it is centred in the span, so a
  // span pushed aside by the thumb buttons would otherwise pull short lines off-centre). Measured on arrival.
  function capCenter(c) {
    const span = capRx - capLx;
    // a line too long for the free span gets a smaller font (not under 13 px) before it would be cut short
    if (c.fs) { c.fs = 0; c.el.style.fontSize = ''; }
    for (let k = 0; k < 2; k++) {
      const t = c.txt, sw = t.scrollWidth, cw = t.clientWidth;
      if (sw <= cw + 1 || cw <= 0) break;
      const f = c.fs || parseFloat(getComputedStyle(c.el).fontSize) || 16, nf = Math.max(13, Math.floor(f * cw / sw * 10) / 10 - 0.3);
      if (nf >= f) break;
      c.fs = nf; c.el.style.fontSize = nf + 'px';
    }
    const w = c.el.offsetWidth;
    const slack = Math.max(0, (span - w) / 2), dx = Math.round(U.clamp(G.R.w / 2 - (capLx + capRx) / 2, -slack, slack));
    if (dx !== c.dx) { c.dx = dx; c.el.style.transform = dx ? 'translateX(' + dx + 'px)' : ''; }
  }
  // drop the oldest visible lines beyond the current maximum
  function capTrim() {
    for (;;) {
      let on = 0, old = null;
      for (const c of R.capL) if (c.on) { on++; if (!old || c.seq < old.seq) old = c; }
      if (on <= R.capMax || !old) return;
      capOff(old);
    }
  }
  function capOff(c) { c.on = false; c.out = 0.3; c.el.classList.remove('in'); c.el.classList.add('out'); }
  function capDir(c, dir) { if (c.dir !== dir) { c.dir = dir; c.el.dataset.dir = dir; } }
  H.caption = function (text, dir) {
    if (!H.visible || !text || !R.capL || !G.Save.data || G.Save.set.captions === false) return;
    dir = dir === 'left' || dir === 'right' || dir === 'behind' ? dir : 'center';
    if (capDirty) capMeasure();
    capPlace();
    for (const c of R.capL) if (c.on && c.text === text) { c.t = capLife(text); capDir(c, dir); return; }   // same cue again: refresh
    let c = null;
    for (const x of R.capL) if (!x.on && (!c || x.seq < c.seq)) c = x;
    if (!c) for (const x of R.capL) if (!c || x.seq < c.seq) c = x;
    c.text = text; c.t = capLife(text); c.on = true; c.out = 0; c.seq = ++capSeq;
    setText(c.txt, text); capDir(c, dir);
    c.el.classList.remove('out', 'in'); c.el.hidden = false;
    R.caps.appendChild(c.el);   // newest at the bottom
    c.el.classList.add('in');
    capCenter(c);
    capTrim();
    capLive = true;
  };
  function stepCaptions(dt) {
    let live = false;
    for (const c of R.capL) {
      if (c.on) { c.t -= dt; if (c.t <= 0) capOff(c); else live = true; }
      if (c.out > 0) { c.out -= dt; if (c.out <= 0) { c.out = 0; c.el.hidden = true; c.el.classList.remove('out'); } else live = true; }
    }
    if (live && (Math.abs(crossW - R.capCross) > 3 || (R.callT > 0) !== R.capCall)) capPlace();
    capLive = live;
  }
  // ---- Column fit (small phones, big text). Runs when a top column or the weapon block changes size, on a layout
  // change and when 07c re-places the buttons — never per frame. (1) The top-left column (vitals, objective, mode
  // cards) must end above the weapon block where they share x: it first grows wider (fewer wrapped lines) if the
  // top-centre column leaves room, then the objective title keeps to one line, and last its text eases down toward
  // the L size (only while it would otherwise run into the weapons). (2) The pickup feed starts under the column on
  // the stick side (left; right when left-handed on touch, where the buttons are on the left) with as many lines as
  // fit above the bottom edge. (3) The HUD chips' rects are kept for the world-marker fade (H.frame).
  let fitPend = false;
  H.relayout = function () {
    capDirty = true;
    if (fitPend || !root) return;
    fitPend = true;
    requestAnimationFrame(() => { fitPend = false; G.safe('hud fit', fitColumns); });
  };
  function fitColumns() {
    if (!H.visible || root.hidden) return;
    const loc = e => (e && !e.hidden && e.getClientRects().length ? (G.Screen ? G.Screen.rectToLocal(e.getBoundingClientRect()) : e.getBoundingClientRect()) : null);
    const W = G.R.w, Hh = G.R.h, k = H.textK(), tl = R.tl;
    // (0) an objective title that is one word ("スクラップスイープ", "目标完成") and would wrap inside it drops its
    // letter spacing, then eases its size down (to 13 px) to stay on one line; if even that wraps it is left as it was
    tl.classList.remove('tl-wide', 'tl-tight'); tl.style.removeProperty('--ui-t');
    const ot = R.obT;
    ot.style.letterSpacing = ''; ot.style.fontSize = '';
    if (!R.obj.hidden && ot.textContent && !/\s/.test(ot.textContent.trim()) && ot.getClientRects().length) {
      const two = () => ot.offsetHeight > (parseFloat(getComputedStyle(ot).fontSize) || 14) * 1.8;
      if (two()) {
        ot.style.letterSpacing = '0';
        for (let i = 0; i < 5 && two(); i++) { const fs = parseFloat(getComputedStyle(ot).fontSize); if (fs <= 13) break; ot.style.fontSize = Math.max(13, fs * 0.92).toFixed(1) + 'px'; }
        if (two()) { ot.style.letterSpacing = ''; ot.style.fontSize = ''; }
      }
    }
    // (1) top-left column vs the weapon block
    const bcs = [];
    if (!R.bc.hidden) for (const c of R.bc.children) { const r = loc(c); if (r && r.right - r.left > 2 && r.bottom - r.top > 2) bcs.push(r); }
    const hits = () => { const t = loc(tl); if (!t) return false; for (const b of bcs) if (t.bottom > b.top - 6 && t.right > b.left && t.left < b.right) return true; return false; };
    if (bcs.length && hits()) {
      const t0 = loc(tl), tc = loc(R.tc);
      if (!tc || tc.bottom - tc.top < 2 || tc.left > t0.left + W * 0.34 + 8) tl.classList.add('tl-wide');
      if (hits()) tl.classList.add('tl-tight');
      if (hits() && k > 1.15) tl.style.setProperty('--ui-t', '1.15');
      if (hits() && k > 1) tl.style.setProperty('--ui-t', '1');
    }
    // (2) pickup feed: under the stick-side column, down to the bottom edge or the weapon block if that sits below it;
    // when that leaves under two lines (a small phone, where 07c moves the weapon block beside the button cluster),
    // beside the weapon block on its screen-centre side instead, as wide as the gap to the buttons allows
    const right = !!G.Save.set.leftHanded && G.input.device === 'touch';
    const col = loc(right ? R.tr : tl);
    const lineH = Math.round(Math.max(18, Math.max(12, 13 * k) * 1.35) + 12) + 4;   // one line + gap (a little generous)
    let bc = null;
    for (const b of bcs) bc = bc ? { left: Math.min(bc.left, b.left), top: Math.min(bc.top, b.top), right: Math.max(bc.right, b.right), bottom: Math.max(bc.bottom, b.bottom) } : b;
    let top = Math.round(Hh * 0.38);
    if (col && col.bottom - col.top > 2) top = Math.max(top, Math.round(col.bottom + 8));
    const reachL = right ? W - 190 : 0, reachR = right ? W : 190;
    let limit = Hh - 4;
    if (bc && bc.right > reachL && bc.left < reachR && bc.top > top - lineH) limit = bc.top - 4;
    let lines = Math.floor((limit - top) / lineH), x = null, maxW = '';
    if (lines < 2 && bc && Hh - 4 - bc.top >= lineH) {
      // the free gap between the weapon block and the nearest bottom button on the centre side
      let edge = right ? 8 : W - 8;
      if (G.input.device === 'touch') for (const b of document.querySelectorAll('#touch.active .tbtn')) {
        if (b.hidden || b.style.display === 'none') continue;
        const l = parseFloat(b.style.left), t = parseFloat(b.style.top), d = parseFloat(b.style.width);
        if (!(l === l && t === t && d === d) || t + d < bc.top) continue;
        if (!right && l >= bc.right) edge = Math.min(edge, l - 8); else if (right && l + d <= bc.left) edge = Math.max(edge, l + d + 8);
      }
      const gap = right ? bc.left - 8 - edge : edge - (bc.right + 8);
      if (gap >= 90) { x = right ? Math.round(W - bc.left + 8) : Math.round(bc.right + 8); maxW = Math.round(gap) + 'px'; top = Math.round(bc.top); lines = Math.floor((Hh - 4 - top) / lineH); }
    }
    if (x == null) top = Math.min(top, Hh - 8 - lineH);
    R.pickMax = U.clamp(lines, 1, 4);
    if (R.pick.classList.contains('right') !== right) R.pick.classList.toggle('right', right);
    R.pick.style.top = top + 'px';
    // beside the weapon block: placed from the block's edge (left, or right when left-handed); else the CSS edge inset
    R.pick.style.left = x != null && !right ? x + 'px' : '';
    R.pick.style.right = x != null && right ? x + 'px' : '';
    R.pick.style.maxWidth = maxW;
    // (the feed is clipped to its lines: a line bowing out still takes its place for a moment, and the newest one must
    // not slide under the bottom edge meanwhile — the clip takes the leaving line off the top instead)
    R.pick.style.maxHeight = (R.pickMax * lineH - 4) + 'px';
    let live = 0;
    for (let n = R.pick.lastElementChild; n; n = n.previousElementSibling) if (!n.classList.contains('out') && ++live > R.pickMax) G.UI.leave(n);
    // (3) chips a world marker should not be read through
    const occ = R.occ; occ.length = 0;
    const add = e => { if (!e || e.hidden || e === R.feed) return; if (e.classList.contains('col')) { for (const c of e.children) add(c); return; } const r = loc(e); if (r && r.right - r.left > 2 && r.bottom - r.top > 2) occ.push({ l: r.left, t: r.top, r: r.right, b: r.bottom }); };
    for (const c of [R.tl, R.tc, R.tr]) if (!c.hidden) for (const e of c.children) add(e);
  }
  // Rough size of a world marker (pin + label) for the fade test: the label width is estimated from its text
  // (CJK glyphs count as a full em), so the frame loop never measures the DOM.
  function markerBox(m, lbl) {
    const fs = Math.max(11, 12 * H.textK());
    let w = 0; for (const ch of lbl) w += /[\u2E80-\uFFEF]/.test(ch) ? fs : fs * 0.58;
    m.hw = Math.max(16, w / 2 + 4); m.hh = lbl ? 34 + fs * 1.25 : 34;
  }

  // World-space marker. opts: {icon:'!'|svg, label, color, edge:true (clamp to screen edge), dist:true}
  H.marker = function (id, pos, opts) {
    let m = H.markers.get(id);
    if (!m) {
      const e = el('div.marker', el('div.mk', el('span')), el('div.ml'));
      R.markers.appendChild(e);
      m = { el: e, pos: new V3(), opts: {}, wx: 1e9, wy: 1e9, disp: '', edge: false, dist: -1, lbl: null, col: null, hw: 16, hh: 34, occ: false };
      H.markers.set(id, m);
    }
    m.pos.copy(pos); m.opts = opts || {};
    if (m.opts.yOff) m.pos.y += m.opts.yOff;
    const mk = m.el.firstChild;
    const col = m.opts.color || '';
    if (col !== m.col) { m.col = col; mk.style.background = col; }
    const ic = m.opts.icon || '!';
    if (mk.firstChild._ic !== ic) { mk.firstChild.innerHTML = ic; mk.firstChild._ic = ic; }
    return m;
  };
  H.removeMarker = function (id) { const m = H.markers.get(id); if (m) { m.el.remove(); H.markers.delete(id); } };
  H.clearMarkers = function () { for (const m of H.markers.values()) m.el.remove(); H.markers.clear(); };

  // Weapon slots are rebuilt only when the loadout (or player / language) changes; switching weapons
  // just moves .on (the CSS transition raises the slot) and pops the new icon.
  H.buildSlots = function () {
    if (!R.slots) return;
    // Touch: ammo sits above the slots so the bottom-centre block stays narrow and clear of the
    // right-thumb button cluster (style.css #hud.touch).
    root.classList.toggle('touch', G.input.device === 'touch');
    const pl = G.Game.world && G.Game.world.player;
    const ws = pl && pl.weapons;
    let sig = G.i18n.lang + '|';
    if (ws) for (const w of ws) sig += (w.def ? w.def.id : '?') + ':' + (w.level || 1) + '|';
    if (pl === R.slotPl && sig === R.slotSig && R.slots.children.length === (ws ? ws.length : 0)) return;
    R.slotPl = pl; R.slotSig = sig; R.slotOn = -1;
    capDirty = true;
    R.slots.innerHTML = '';
    if (!ws) return;
    ws.forEach((w, i) => {
      const icon = w.def && G.Weapons && G.Weapons.icon ? G.Weapons.icon(w.def.id) : '';
      const s = el('div.wslot' + (i === pl.wi ? '.on' : ''), { html: icon });
      s._lv = s.appendChild(el('span.lv', { text: 'Lv' + (w.level || 1) }));
      s._xp = s.appendChild(el('div.xp', el('i'))).firstChild;
      s.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); if (i !== pl.wi) pl.equip(i); });
      R.slots.appendChild(s);
    });
    R.slotOn = pl.wi;
  };

  // Crosshair options (style class, colour / on-target colour / size vars), written only when a setting changes.
  // The hollow on-target look (no dot, thinner outlined ticks) lives in style.css per style.
  function applyXh(node, X) {
    const s = G.Save.set;
    const st = s.xhStyle === 'dot' || s.xhStyle === 'circle' ? s.xhStyle : 'classic';
    const col = XH_COL[s.xhColor] ? s.xhColor : 'white', k = +s.xhSize || 1, op = s.xhOpacity != null ? +s.xhOpacity : 1;
    if (st === X.st && col === X.col && k === X.k && op === X.op) return false;
    if (st !== X.st) { node.classList.remove('xh-classic', 'xh-dot', 'xh-circle'); node.classList.add('xh-' + st); }
    if (col !== X.col) { node.style.setProperty('--xh-c', XH_COL[col]); node.style.setProperty('--xh-on', col === 'pink' ? '#ffd23f' : '#ff6b8b'); }
    if (k !== X.k) node.style.setProperty('--xh-k', String(k));
    X.st = st; X.col = col; X.k = k; X.op = op; X.ops = String(op);
    return true;
  }
  // Place the ticks (inner edge `px` from the centre) and the circle style's ring for a crosshair element.
  function placeXh(node, px, X) {
    const ch = node.children, k = X.k > 0 ? X.k : 1;
    if (X.st === 'classic') {
      const a = (-px - 9 * k).toFixed(1), b = px.toFixed(1);
      ch[1].style.transform = 'translateX(' + a + 'px)'; ch[2].style.transform = 'translateX(' + b + 'px)';
      ch[3].style.transform = 'translateY(' + a + 'px)'; ch[4].style.transform = 'translateY(' + b + 'px)';
    } else if (X.st === 'circle') {
      const r = Math.max(5 * k, px + 3 * k), d = (2 * r).toFixed(1), o = (-r).toFixed(1);
      const g = ch[5].style; g.width = g.height = d + 'px'; g.transform = 'translate(' + o + 'px,' + o + 'px)';
    }
  }
  // A static crosshair showing the current options (Settings preview); call again to refresh it.
  H.crosshairPreview = function (node) {
    if (!node) node = el('div.crosshair.xh-classic', el('i.c-dot'), el('i.c-l'), el('i.c-r'), el('i.c-t'), el('i.c-b'), el('i.c-ring'));
    const X = node._xh || (node._xh = { st: null, col: null, k: -1, op: -1 });
    applyXh(node, X);
    node.style.opacity = X.ops;
    placeXh(node, 6 * X.k, X);
    return node;
  };
  // Per-frame update.
  let crossPx = 0, crossW = -1, crossKick = 0, crossInit = false;
  H.frame = function (dt) {
    if (!H.visible) return;
    dt = dt > 0.05 ? 0.05 : dt > 0 ? dt : 0;
    if (G.time.frame % 15 === 0) H.layoutVars(); // a missed resize event (some webviews) self-heals
    const world = G.Game.world; const pl = world && world.player;
    const cam = G.R.camera;
    const rm = reduced();
    if (pl) {
      if (H.cfg.vitals) {
        const sb = R.sb, hb = R.hb;
        show(sb.el, pl.maxShield > 0);
        stepBar(sb, pl.maxShield > 0 ? pl.shield / pl.maxShield : 0, dt);
        const tier = pl.maxShield >= 125 ? 3 : pl.maxShield >= 75 ? 2 : 1;
        if (tier !== R.shTier) { sb.el.classList.remove('t' + R.shTier); sb.el.classList.add('t' + tier); R.shTier = tier; }
        const hpN = Math.ceil(pl.hp), shN = Math.ceil(pl.shield);
        if (hpN !== hb.n) { hb.n = hpN; hb.label.textContent = String(hpN); }
        if (shN !== sb.n) { sb.n = shN; sb.label.textContent = String(shN); }
        stepBar(hb, pl.hp / pl.maxHp, dt);
        const low = pl.hp / pl.maxHp < 0.3;
        if (low !== R.hpLow) { R.hpLow = low; hb.el.classList.toggle('low', low); }
      }
      if (H.cfg.weapons) {
        const w = pl.weapon;
        let txt = '';
        if (w) {
          if (w.ammoText) txt = w.ammoText();
          else if (w.maxAmmo) txt = Math.ceil(w.ammo) + '<small>/' + w.maxAmmo + '</small>';
        }
        if (R.ammo._s !== txt) { R.ammo.innerHTML = txt; R.ammo._s = txt; }
        // xp bars + level tags on slots; the active slot follows pl.wi
        const slots = R.slots.children;
        for (let i = 0; i < slots.length && i < pl.weapons.length; i++) {
          const wi = pl.weapons[i];
          const fr = wi.xpFrac ? wi.xpFrac() : 0;
          const bar = slots[i]._xp;
          if (bar && bar._f !== fr) { bar._f = fr; const bw = (fr * 100).toFixed(0) + '%'; if (bar._w !== bw) { bar.style.width = bw; bar._w = bw; } }
          const lv = slots[i]._lv; if (lv && lv._n !== wi.level) { lv._n = wi.level; setText(lv, 'Lv' + (wi.level || 1)); }
        }
        if (pl.wi !== R.slotOn && slots.length) {
          const prev = slots[R.slotOn], cur = slots[pl.wi];
          if (prev) prev.classList.remove('on');
          if (cur) { cur.classList.add('on'); if (R.slotOn >= 0) G.UI.anim(cur.firstElementChild, [{ scale: 0.7, rotate: '-12deg' }, { scale: 1.15, rotate: '4deg', offset: 0.55 }, { scale: 1, rotate: '0deg' }], { duration: 300, easing: 'ease-out' }); }
          R.slotOn = pl.wi;
        }
      }
      if (H.cfg.crosshair) {
        const w = pl.weapon;
        const spread = w && w.spreadNow != null ? w.spreadNow : 0.02;
        // The ticks' inner edge sits where the spread cone (half-angle) really lands on screen for the current
        // camera FOV and frame height (scatter's 6° = ~37 px on a 390 px phone, ~56 px at 720p), plus a 4 px
        // core. On a target the centre turns hollow and the ticks open 3 px so a small robot shows through.
        const on = !!pl.target && pl.targetAngle < 0.05;
        const th = Math.tan((cam && cam.fov ? cam.fov : 60) * Math.PI / 360);
        const target = 4 + Math.tan(spread < 0.7 ? spread : 0.7) / th * (G.R.h * 0.5) + (on ? 3 : 0);
        // blooms fast, recovers smoothly; hits kick it open a touch
        if (!crossInit) { crossPx = target; crossKick = 0; crossInit = true; }
        else crossPx = U.damp(crossPx, target, target > crossPx ? 32 : 13, dt);
        crossKick = rm ? 0 : U.damp(crossKick, 0, 15, dt);
        if (applyXh(R.cross, R.xh)) { crossW = -1; R.crossOp = null; }
        const px = crossPx + crossKick;
        if (Math.abs(px - crossW) > 0.08) { crossW = px; placeXh(R.cross, px, R.xh); }
        if (on !== R.crossOn) { R.crossOn = on; R.cross.classList.toggle('on-target', on); }
        const op = pl.alive ? R.xh.ops : '0';
        if (op !== R.crossOp) { R.crossOp = op; R.cross.style.opacity = op; }
      }
      // interact prompt (pops in via CSS each time it appears)
      const near = !!pl.near && !G.UI.anyOpen();
      if (R.prompt.hidden === near) R.prompt.hidden = !near;
      if (near) {
        // rebuilt only when the key, the device or the language changes (no string building per frame);
        // keyboard shows E, a controller its X button (06_input: X = use / reload)
        const dev = G.input.device;
        if (R.prompt._k !== pl.near.key || R.prompt._d !== dev || R.prompt._l !== G.i18n.lang) {
          R.prompt._k = pl.near.key; R.prompt._d = dev; R.prompt._l = G.i18n.lang;
          const html = (dev === 'desktop' ? '<kbd>E</kbd>' : dev === 'gamepad' ? '<span class="pad-g x">X</span>' : '') + G.t(pl.near.key);
          if (R.prompt._s !== html) { R.prompt.innerHTML = html; R.prompt._s = html; }
        }
        // On touch the label floats just above the interact button so they never cover each other.
        // No layout reads: the button's box comes from the inline px placement 07c writes, and the
        // label is anchored by its bottom edge so its own height never has to be measured.
        const ib = G.input.device === 'touch' && G.Input.btn && G.Input.btn('interact');
        const st = ib && !ib.hidden ? ib.style : null;
        const bl = st ? parseFloat(st.left) : NaN, bt = st ? parseFloat(st.top) : NaN, bw = st ? parseFloat(st.width) : NaN;
        if (bl === bl && bt === bt && bw === bw) {
          const cx = Math.round(bl + bw / 2), by = Math.round(G.R.h - bt + 8);
          if (cx !== R.promptX || by !== R.promptY) {
            R.promptX = cx; R.promptY = by;
            R.prompt.style.left = cx + 'px'; R.prompt.style.bottom = by + 'px'; R.prompt.style.top = 'auto';
          }
        } else if (R.promptX !== null) { R.promptX = R.promptY = null; R.prompt.style.left = R.prompt.style.top = R.prompt.style.bottom = ''; }
      }
    }
    // boss bar (also in modes without a Player)
    if (R.bossT != null) stepBar(R.bossB, R.bossT, dt);
    // vignette: hurt flash + a lub-dub heartbeat while HP is low
    hurtV = Math.max(0, hurtV - dt * 1.4);
    let lowV = 0;
    if (pl && pl.alive && pl.hp / pl.maxHp < 0.3) {
      if (rm) lowV = 0.4;
      else {
        const ph = (G.time.now * 1.35) % 1;
        const beat = ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : ph > 0.2 && ph < 0.36 ? 0.55 * Math.sin((ph - 0.2) / 0.16 * Math.PI) : 0;
        lowV = 0.3 + 0.24 * beat;
      }
    }
    const vo = Math.max(hurtV, lowV).toFixed(2);
    if (vo !== R.vigO) { R.vigO = vo; R.vig.style.opacity = vo; }
    // damage arcs: fade in fast, hold, fade out; pop from a little further out; re-aim every frame
    for (let i = 0; i < 4; i++) {
      const d = R.dirS[i];
      if (d.t <= 0) { if (d.wo !== '0') { d.wo = '0'; R.dirs[i].style.opacity = '0'; } continue; }
      d.t -= dt; d.age += dt;
      const op = d.t > 0 ? Math.min(1, d.age / 0.07, d.t / 0.55) : 0;
      const os = op > 0.005 ? op.toFixed(2) : '0';
      if (os !== d.wo) { d.wo = os; R.dirs[i].style.opacity = os; }
      if (op > 0 && pl) {
        const rel = -(Math.atan2(d.x - pl.pos.x, d.z - pl.pos.z) - (pl.yaw + Math.PI));
        const k = 1 - d.age / 0.18, s = rm || k <= 0 ? 1 : 1 + 0.32 * k * k;
        if (Math.abs(rel - d.wa) > 0.004 || s !== d.ws) { d.wa = rel; d.ws = s; R.dirs[i].style.transform = 'rotate(' + rel.toFixed(4) + 'rad) scale(' + s.toFixed(3) + ')'; }
      }
    }
    // Clinks count-up
    if (boltV < boltT) { boltV = Math.min(boltT, boltV + boltRate * dt); writeBolts(); }
    // sound captions: count down, fade, re-place only when the crosshair spread moved them
    if (capLive) stepCaptions(dt);
    // callout: a soft pulse while it is up, gone when its time runs out
    if (R.callT > 0) {
      R.callT -= dt;
      if (R.callT <= 0) H.clearCallout();
      // sits just below the crosshair's lower tick, whatever the current spread
      const off = Math.max(48, Math.round(crossW + 22));
      if (off !== R.callOff) { R.callOff = off; R.call.style.top = 'calc(50% + ' + off + 'px)'; }
      if (R.callT > 0 && !rm) { const o = (0.8 + 0.2 * (0.5 + 0.5 * Math.sin(G.time.now * 8))).toFixed(2); if (o !== R.call._o) { R.call._o = o; R.call.style.opacity = o; } }
    }
    // damage numbers: spring pop, eased rise and drift, fade at the end
    const W = G.R.w, Hh = G.R.h;
    for (let i = H.nums.length - 1; i >= 0; i--) {
      const n = H.nums[i];
      n.t += dt;
      if (n.t > NUM_LIFE) { n.el.className = 'dmgnum off'; H.nums.splice(i, 1); numPool.push(n); continue; }
      const k = n.t / NUM_LIFE, ease = 1 - (1 - k) * (1 - k);
      _v.copy(n.pos); _v.y += ease * 1.1;
      _v.project(cam);
      if (_v.z > 1) { if (n.wo !== '0') { n.wo = '0'; n.el.style.opacity = '0'; } continue; }
      // start a little up and to the number's side, rise and drift; never inside NUM_CLEAR px of the crosshair
      // (pushed straight out from the centre), so the hit robot stays visible under it
      let x = (_v.x * 0.5 + 0.5) * W + n.side * 16 + n.vx * ease * 0.9, y = (-_v.y * 0.5 + 0.5) * Hh - 14 - ease * 34;
      const cdx = x - W * 0.5, cdy = y - Hh * 0.5, cd = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cd < NUM_CLEAR) {
        if (cd < 1) { x = W * 0.5 + n.side * NUM_CLEAR * 0.75; y = Hh * 0.5 - NUM_CLEAR * 0.66; }
        else { const k = NUM_CLEAR / cd; x = W * 0.5 + cdx * k; y = Hh * 0.5 + cdy * k; }
      }
      const sc = rm ? 1 : 1 + (n.crit ? 0.95 : 0.6) * Math.exp(-n.t * 16) * Math.cos(n.t * 24);
      n.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
      const os = k > 0.68 ? ((1 - k) / 0.32).toFixed(2) : '1';
      if (os !== n.wo) { n.wo = os; n.el.style.opacity = os; }
    }
    // markers
    for (const m of H.markers.values()) {
      _v.copy(m.pos).project(cam);
      let x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * Hh;
      const behind = _v.z > 1;
      let edge = false;
      if (m.opts.edge !== false) {
        if (behind) { x = W - x; y = Hh - 40; }
        // Keep edge-clamped markers clear of the top HUD rows (vitals/timer/minimap).
        const pad = 40, top = Math.min(150, Hh * 0.3);
        if (behind || x < pad || x > W - pad || y < top || y > Hh - pad) {
          edge = true;
          x = U.clamp(x, pad, W - pad); y = U.clamp(y, top, Hh - pad);
        }
      } else if (behind) { if (m.disp !== 'none') { m.disp = 'none'; m.el.style.display = 'none'; } continue; }
      if (m.disp !== '') { m.disp = ''; m.el.style.display = ''; m.wx = 1e9; }
      if (edge !== m.edge) { m.edge = edge; m.el.classList.toggle('edge', edge); }
      if (Math.abs(x - m.wx) > 0.1 || Math.abs(y - m.wy) > 0.1) { m.wx = x; m.wy = y; m.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)'; }
      const dist = m.opts.dist !== false && pl ? Math.round(pl.pos.distanceTo(m.pos)) : -1;
      const lbl = m.opts.label || '';
      if (dist !== m.dist || lbl !== m.lbl) {
        m.dist = dist; m.lbl = lbl;
        const s = dist >= 0 ? lbl + (lbl ? ' ' : '') + dist + 'm' : lbl;
        setText(m.el.lastChild, s);
        markerBox(m, s);
      }
      // a marker drawn under a HUD chip (vitals, objective, a hint chip, the minimap...) fades so both stay readable
      let occ = false;
      for (let i = 0; i < R.occ.length; i++) { const o = R.occ[i]; if (x + m.hw > o.l && x - m.hw < o.r && y > o.t && y - m.hh < o.b) { occ = true; break; } }
      if (occ !== m.occ) { m.occ = occ; m.el.style.opacity = occ ? '0.3' : ''; }
    }
    // minimap
    // Modes without a Player (race) can set G.HUD.minimapPose = {pos:{x,z}, yaw}.
    const pose = pl || H.minimapPose;
    if (H.cfg.minimap && pose && world && (G.time.frame & 1) === 0) drawMinimap(world, pose);
    // fps
    if (G.Save.set.showFps) { const t = (G.R.fps ? G.R.fps.toFixed(0) : '--') + ' fps · ' + G.R.pr.toFixed(2) + 'x'; setText(R.fps, t); show(R.fps, true); }
    else show(R.fps, false);
  };

  function drawMinimap(world, pl) {
    const c = R.mmc, g = c.getContext('2d');
    const S = c.width, half = S / 2, range = H.minimapRange || 60, k = half / range;
    g.clearRect(0, 0, S, S);
    g.save();
    g.translate(half, half);
    g.rotate(pl.yaw);
    if (H.minimapDraw) { g.save(); H.minimapDraw(g, k, pl); g.restore(); }
    else { g.fillStyle = 'rgba(160,230,255,0.55)'; g.fillRect(-half * 1.5, -half * 1.5, S * 1.5, S * 1.5); }
    // actors
    for (const a of world.actors) {
      if (a === pl || !a.alive || a.hidden || a.mmHide || a.isCrate || a.isBossPart || a.mmColor === 'none') continue;
      const dx = (a.pos.x - pl.pos.x) * k, dz = (a.pos.z - pl.pos.z) * k;
      if (dx * dx + dz * dz > half * half) continue;
      const friend = a.team === pl.team;
      if (!friend && (!a.targetable || H.minimapHideEnemies)) continue;
      g.fillStyle = a.mmColor || (friend ? '#3fe0b8' : '#ff4d6d');
      g.beginPath(); g.arc(dx, dz, a.isBoss ? 7 : 4, 0, Math.PI * 2); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#1e1a4d'; g.stroke();
    }
    // markers
    for (const m of H.markers.values()) {
      let dx = (m.pos.x - pl.pos.x) * k, dz = (m.pos.z - pl.pos.z) * k;
      const d = Math.hypot(dx, dz);
      if (d > half - 8) { dx *= (half - 8) / d; dz *= (half - 8) / d; }
      g.fillStyle = m.opts.color || '#ffd23f';
      g.beginPath(); g.arc(dx, dz, 5, 0, Math.PI * 2); g.fill(); g.lineWidth = 2; g.strokeStyle = '#1e1a4d'; g.stroke();
    }
    g.restore();
    // player arrow (always up)
    g.save(); g.translate(half, half);
    g.fillStyle = '#fff'; g.strokeStyle = '#1e1a4d'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.stroke(); g.fill();
    g.restore();
  }
})(window.G);

}).call(window); } catch (e) { console.error('[module 08_hud.js]', e); }
// ---- 09_audio.js
try { (function () {
// G.Audio: every sound in the game is synthesized live with WebAudio (no samples, no files, no libraries).
//   init()                       boot hook: listeners only. The AudioContext is created lazily by unlock().
//   unlock()                     call on any user gesture: creates/resumes the context (idempotent, cheap).
//   sfx(name, {vol, pitch, pan, size, n, dur, mat, surface})  one-shot. Returns a voice record or null.
//   sfxAt(name, pos, opts)       positional one-shot relative to G.R.camera: gain 1/(1+d/roll) with roll 8 m (20 m for
//                                threat cues, which also carry further), silent past 60 m (threats 75 m).
//   has(id)                      true for a known sfx or loop id.
//   loop(name, {vol, pitch, pan, pos, keep})  -> {set({pitch, vol, pan, pos}), stop(fadeSec), playing}
//                                continuous: engine, beam, swim, whoosh, zoneWarn, charge, hum, jet (Puff Pack),
//                                glide (Glide Wings); other names retrigger the one-shot. Loops auto-stop when
//                                G.Game.world changes unless {keep:true}.
//   step({speed, sprint, pan, land, vy, vol, surface})  footstep on the surface under the player (picked from the
//                                mode, biome, hub zone, turf ink, water; see surfaceNow). land(impactSpeed).
//   vitals(hpFrac, alive)        once per frame from the Player (allocation-free): low-HP heartbeat below 30 % HP,
//                                synced to the HUD vignette pulse, plus a gentle music low-pass.
//   music(id|null, {rate})       procedural tracks. In-mode changes land on the old track's next downbeat; a call
//                                made while G.Game is switching starts right after the build. 'expedition' picks the
//                                biome variant; layered tracks raise drums + lead with combat intensity (alerted
//                                robots near the player). Loops restart after any intro (loop point per track).
//   leaveMode(nextModeId)        called by G.Game.go before the build: planned music fade, a warp stinger and a
//                                looping loading bed, both pre-rendered buffers that keep playing on the audio thread
//                                while the main thread is blocked; the next track takes over on its first downbeat.
//   ambient(id|null, {lv})       per-place ambience bed; wired automatically from the bus 'mode' event.
//   intensity(v|null)            force the music intensity 0..1 (null = automatic).
//   onCaption(fn)                fn({key, text, line, dir, pan, dist, name, on}) for flagged threat/boss cues.
//   preview(kind)                short sample after a volume slider is released: master | sfx | music | amb | ui.
//   duck(on), setVolumes(master, sfx, music, amb, ui) (0..1; amb/ui default to G.Save.set.amb / uiVol),
//   muted (get/set), list(), loops(), tracks(), track, ready.
// Chain: sfx voices -> sfxBus, ui voices -> uiBus, ambience -> ambBus -> ambDip, music stems + stingers -> musicBus ->
// high-pass (phone speakers on touch) -> low-pass (low HP) -> dip -> master (with makeup gain) -> compressor ->
// soft clipper -> destination.
// Licensing: all sounds and music are synthesized at runtime by this code; no third-party samples.
(function (G) {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  const A = G.Audio = {};
  const MAX_VOICES = 24, MAX_LOOPS = 14, AHEAD = 0.25, TICK_MS = 25, MUSIC_GAIN = 1.6, MAKEUP = 2.1, AMB_GAIN = 1.8;
  const LOWHP_LP = 1700;                // music low-pass while HP is low (Hz)
  const vol = { master: 0.8, sfx: 0.9, music: 0.55, amb: 0.7, ui: 0.8 };
  let ctx = null, broken = !AC, inited = false, muted = false, ducked = false;
  let master = null, comp = null, limiter = null, outNode = null, sfxBus = null, uiBus = null, musicBus = null, musicHP = null, musicLP = null,
    musicDip = null, ambBus = null, ambDip = null, stingBus = null, noiseBuf = null, meter = null;
  const voices = [], loops = [], tracks = [];
  let cur = null;                       // voice whose sources are being created (for stealing)
  let want = null, wantOpts = null, trackId = null, pending = null, plays = 0;
  const warned = {};
  const EMPTY = {};
  const noop = () => {};
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const F = f => (f < 10 ? 10 : f > 20000 ? 20000 : f);
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const curve = v => v * v;             // perceptual slider -> gain
  const dbg = x => Math.pow(10, x / 20);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const settle = pr => { if (pr && pr.catch) pr.catch(noop); };
  function warnOnce(key, msg) { if (warned[key]) return; warned[key] = 1; console.warn('[audio] ' + msg); }

  // ---------------------------------------------------------------- node helpers
  function GN(v) { const g = ctx.createGain(); g.gain.value = v === undefined ? 1 : v; return g; }
  function OSC(type, f) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = F(f); return o; }
  function BQ(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = F(f); if (q) b.Q.value = q; return b; }
  function NZ() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function run(node, t, end, off) { node.start(t, off || 0); node.stop(end); if (cur) cur.srcs.push(node); return node; }
  // Freeze a param at its current value at time t (no jump back when a running ramp is cancelled).
  function holdP(P, t) {
    if (P.cancelAndHoldAtTime) { try { P.cancelAndHoldAtTime(t); return; } catch (e) { /* fall through */ } }
    const v = P.value; P.cancelScheduledValues(t); P.setValueAtTime(v, t);
  }
  // Attack / hold / exponential decay gain envelope. The gain starts at 0 BEFORE t too: a gain created at the
  // default 1 let the first sub-sample frame of a source starting at a fractional time leak through unenveloped
  // (single-sample clicks up to +5 dBFS on noise drum hits).
  function envG(t, a, v, d, h) {
    const g = GN(0), P = g.gain;
    h = h > 0 ? h : 0;
    P.setValueAtTime(0, t);
    P.linearRampToValueAtTime(v, t + a);
    if (h) P.setValueAtTime(v, t + a + h);
    P.exponentialRampToValueAtTime(0.0004, t + a + h + d);
    P.linearRampToValueAtTime(0, t + a + h + d + 0.01);
    return g;
  }
  function sweep(P, t, f0, f1, dur, lin) {
    P.setValueAtTime(F(f0), t);
    if (f1) { if (lin) P.linearRampToValueAtTime(F(f1), t + dur); else P.exponentialRampToValueAtTime(F(f1), t + dur); }
  }
  const FT = { lp: 'lowpass', hp: 'highpass', bp: 'bandpass' };
  function filt(type, f, q, t, f1, ft) {
    const b = ctx.createBiquadFilter(); b.type = type;
    b.frequency.setValueAtTime(F(f), t);
    if (f1) b.frequency.exponentialRampToValueAtTime(F(f1), t + ft);
    if (q) b.Q.value = q;
    return b;
  }
  // LFO into an AudioParam; optional rate sweep to rate1. Returns the depth gain (connect to more params).
  function lfo(t, end, rate, depth, param, rate1, w) {
    const l = ctx.createOscillator(); l.type = w || 'sine';
    l.frequency.setValueAtTime(rate, t);
    if (rate1) l.frequency.linearRampToValueAtTime(rate1, end);
    const lg = GN(depth); l.connect(lg); if (param) lg.connect(param);
    run(l, t, end);
    return lg;
  }
  // Multiplicative tremolo stage (gain swings between 1-depth and 1): zero stays zero, so an LFO can never leak
  // signal past the envelope the way an additive LFO on the envelope gain did.
  function trem(t, end, rate, depth, rate1) { const g = GN(1 - depth * 0.5); lfo(t, end, rate, depth * 0.5, g.gain, rate1); return g; }
  // Oscillator voice. o: {w, f, f1, ft, lin, a, h, d, v, det, lp|hp|bp, q, ff1, fft, am:[rate, depth, rate1]}.
  // Returns osc (osc.g = env gain).
  function tone(t, out, o) {
    const a = o.a || 0.003, h = o.h > 0 ? o.h : 0, d = o.d || 0.15, len = a + h + d;
    const os = ctx.createOscillator(); os.type = o.w || 'sine';
    sweep(os.frequency, t, o.f, o.f1, o.ft || len, o.lin);
    if (o.det) os.detune.value = o.det;
    const g = envG(t, a, o.v || 0.2, d, h);
    let n = os;
    if (o.lp || o.hp || o.bp) {
      const fl = filt(o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass', o.lp || o.hp || o.bp, o.q, t, o.ff1, o.fft || len);
      n.connect(fl); n = fl;
    }
    if (o.am) { const tg = trem(t, t + len + 0.02, o.am[0], o.am[1], o.am[2]); n.connect(tg); n = tg; }
    n.connect(g); g.connect(out);
    run(os, t, t + len + 0.02);
    os.g = g;
    return os;
  }
  // Filtered noise burst. o: {type:'lp'|'hp'|'bp', f, f1, ft, q, a, h, d, v, rate, cut (extra low-pass, Hz)}
  function noise(t, out, o) {
    const a = o.a || 0.002, h = o.h > 0 ? o.h : 0, d = o.d || 0.1, len = a + h + d;
    const s = NZ(); if (o.rate) s.playbackRate.value = o.rate;
    const fl = filt(FT[o.type || 'bp'], o.f || 2000, o.q || 0.8, t, o.f1, o.ft || len);
    const g = envG(t, a, o.v || 0.2, d, h);
    s.connect(fl);
    if (o.cut) { const c = BQ('lowpass', o.cut, 0.7); fl.connect(c); c.connect(g); } else fl.connect(g);
    g.connect(out);
    run(s, t, t + len + 0.02, Math.random() * 3.5);
    return g;
  }
  // Short 1-4 kHz transient (click / crack) so impacts and steps still carry on phone speakers.
  function crack(t, out, f, v, d, q) { return noise(t, out, { type: 'bp', f, q: q || 1.4, a: 0.0015, d: d || 0.025, v }); }
  // 2-op FM. o: {f, f1, ft, r (mod ratio), i (index), i1 (end index), a, h, d, v, w}
  function fm(t, out, o) {
    const a = o.a || 0.002, h = o.h > 0 ? o.h : 0, d = o.d || 0.2, len = a + h + d, r = o.r || 2;
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain();
    c.type = o.w || 'sine';
    sweep(c.frequency, t, o.f, o.f1, o.ft || len);
    sweep(m.frequency, t, o.f * r, o.f1 ? o.f1 * r : 0, o.ft || len);
    const tame = Math.min(1, 2500 / o.f);         // keep sidebands under Nyquist for high notes
    const i0 = (o.i === undefined ? 2 : o.i) * o.f * r * tame, i1 = (o.i1 === undefined ? 0.02 : o.i1) * o.f * r * tame;
    mg.gain.setValueAtTime(Math.max(0.01, i0), t);
    mg.gain.exponentialRampToValueAtTime(Math.max(0.01, i1), t + len);
    m.connect(mg); mg.connect(c.frequency);
    const g = envG(t, a, o.v || 0.2, d, h);
    c.connect(g); g.connect(out);
    run(c, t, t + len + 0.02); run(m, t, t + len + 0.02);
    return c;
  }
  function bell(t, out, f, d, v, r) { return fm(t, out, { f, r: r || 3.5, i: 1.4, i1: 0.02, d, v }); }
  function brass(t, out, f, d, v) {
    const g = envG(t, 0.025, v, Math.max(0.08, d * 0.5), d * 0.5);
    const lp = BQ('lowpass', 500, 1.4);
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(8000, f * 6), t + 0.05);
    lp.frequency.exponentialRampToValueAtTime(Math.min(5000, f * 2.5), t + 0.05 + d);
    for (let i = 0; i < 2; i++) { const os = OSC('sawtooth', f); os.detune.value = i ? 8 : -8; os.connect(lp); run(os, t, t + 0.06 + d * 1.1); }
    lp.connect(g); g.connect(out);
  }
  // Big friendly toy horn: brass + octave + a bright formant layer that carries on phone speakers.
  function horn(t, out, f, d, v) {
    brass(t, out, f, d, v);
    brass(t, out, f * 2, d, v * 0.45);
    const bp = BQ('bandpass', 1250, 3), g = envG(t, 0.04, v * 1.1, Math.max(0.08, d * 0.4), d * 0.6);
    const os = OSC('sawtooth', f * 3); os.connect(bp); bp.connect(g); g.connect(out); run(os, t, t + d + 0.12);
  }
  function sparkle(t, o, p, n) {
    const sc = [0, 2, 4, 7, 9];
    for (let i = 0; i < n; i++) {
      const s = sc[(Math.random() * 5) | 0] + 12 * ((Math.random() * 2) | 0);
      tone(t + i * 0.045 + Math.random() * 0.02, o, { f: 1568 * p * Math.pow(2, s / 12), d: 0.12, v: 0.04 });
    }
  }
  function chirp(t, o, f0, f1, d, v) { return tone(t, o, { f: f0, f1, ft: d * 0.7, d, v }); }
  const tdur = (op, d) => clamp(+op.dur || d, 0.35, 2.5);

  // Footstep layer per surface (k = intensity; landings pass > 1). Every surface pairs a low body (headphones)
  // with a 1-4 kHz transient (phone speakers).
  const SURFACES = ['grass', 'sand', 'stone', 'metal', 'snow', 'wood', 'ink', 'water'];
  const SURF_G = { grass: dbg(3.5), sand: dbg(2.5), stone: dbg(2), metal: dbg(2), snow: dbg(8), wood: dbg(1), ink: dbg(1.5), water: dbg(0.5) };
  function stepSurf(t, o, p, s, k) {
    k *= SURF_G[s] || 1;
    switch (s) {
      case 'grass':
        noise(t, o, { type: 'bp', f: 2700 * p, q: 0.9, a: 0.004, d: 0.05, v: 0.13 * k });
        noise(t, o, { type: 'lp', f: 520, a: 0.002, d: 0.045, v: 0.1 * k });
        tone(t, o, { f: 92 * p, f1: 60 * p, ft: 0.04, d: 0.045, v: 0.06 * k });
        return 0.08;
      case 'sand':          // soft "shff": band noise, no high-pass hiss
        noise(t, o, { type: 'bp', f: 2200 * p, q: 0.7, a: 0.012, d: 0.07, v: 0.11 * k });
        noise(t, o, { type: 'lp', f: 700 * p, a: 0.006, d: 0.06, v: 0.12 * k });
        return 0.09;
      case 'snow':
        for (let i = 0; i < 3; i++) noise(t + i * 0.013 + Math.random() * 0.006, o, { type: 'bp', f: (1500 + Math.random() * 1600) * p, q: 2, d: 0.02, v: 0.11 * k });
        noise(t, o, { type: 'lp', f: 620, a: 0.005, d: 0.07, v: 0.1 * k });
        return 0.1;
      case 'metal':
        crack(t, o, 2400 * p, 0.12 * k, 0.012, 1.6);
        fm(t, o, { f: 2000 * p * (1 + Math.random() * 0.06), r: 1.41, i: 1.4, i1: 0.05, d: 0.14, v: 0.035 * k });
        tone(t, o, { w: 'triangle', f: 180 * p, f1: 120 * p, ft: 0.04, d: 0.05, v: 0.07 * k });
        return 0.16;
      case 'wood':
        tone(t, o, { w: 'triangle', f: 330 * p, f1: 245 * p, ft: 0.05, d: 0.07, v: 0.12 * k });
        noise(t, o, { type: 'bp', f: 1400 * p, q: 2.5, d: 0.035, v: 0.16 * k });
        crack(t, o, 2600 * p, 0.24 * k, 0.012);
        return 0.09;
      case 'ink':
        noise(t, o, { type: 'lp', f: 2200 * p, f1: 350 * p, ft: 0.08, q: 6, d: 0.09, v: 0.13 * k });
        chirp(t + 0.01, o, 380 * p, 160 * p, 0.06, 0.07 * k);
        noise(t, o, { type: 'bp', f: 1700 * p, q: 3, d: 0.03, v: 0.05 * k });
        return 0.11;
      case 'water':
        noise(t, o, { type: 'lp', f: 3200 * p, f1: 600 * p, ft: 0.12, q: 1, d: 0.13, v: 0.15 * k });
        chirp(t + 0.03, o, (400 + Math.random() * 200) * p, 1000 * p, 0.05, 0.045 * k);
        return 0.15;
      default:      // stone / deck / packed ground
        crack(t, o, 1900 * p * (0.9 + Math.random() * 0.2), 0.3 * k, 0.022, 1.8);
        noise(t, o, { type: 'lp', f: (500 + Math.random() * 300) * p, q: 1.2, d: 0.045, v: 0.09 * k });
        tone(t, o, { f: 100 * p, f1: 65 * p, ft: 0.04, d: 0.05, v: 0.05 * k });
        return 0.08;
    }
  }

  // ---------------------------------------------------------------- SFX table
  // def: {f(t, out, pitch, opts) -> seconds, max (per-name voices), v (pitch variance), gap (min s between), dip (music
  // dip level)}. Category, level trim, priority, rolloff and caption come from LEVELS below.
  let boltT = -9, boltN = 0;
  const BOLT_UP = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  const SFX = {
    // ---- UI
    ui: { v: 0.03, f(t, o, p) {
      chirp(t, o, 520 * p, 1100 * p, 0.07, 0.2);
      noise(t, o, { type: 'bp', f: 4200, q: 1, d: 0.012, v: 0.05 });
      return 0.09; } },
    uiBack: { v: 0.03, f(t, o, p) {        // close / back / Esc: a soft two-step drop
      tone(t, o, { w: 'triangle', f: 880 * p, f1: 640 * p, ft: 0.06, d: 0.07, v: 0.16 });
      tone(t + 0.045, o, { f: 560 * p, f1: 430 * p, ft: 0.05, d: 0.08, v: 0.13 });
      noise(t, o, { type: 'bp', f: 2600, q: 1.2, d: 0.01, v: 0.04 });
      return 0.14; } },
    uiOpen: { v: 0.03, f(t, o, p) {        // panel opens: airy upward whoosh with a little tap
      noise(t, o, { type: 'bp', f: 700 * p, f1: 2600 * p, ft: 0.13, q: 1.3, a: 0.04, d: 0.1, v: 0.14 });
      chirp(t + 0.01, o, 480 * p, 960 * p, 0.09, 0.1);
      noise(t, o, { type: 'bp', f: 3600, q: 1, d: 0.01, v: 0.03 });
      return 0.16; } },
    tab: { v: 0.02, f(t, o, p) {
      tone(t, o, { w: 'triangle', f: 1100 * p, d: 0.035, v: 0.18 });
      tone(t + 0.035, o, { w: 'triangle', f: 1650 * p, d: 0.05, v: 0.14 });
      return 0.1; } },
    error: { v: 0, max: 2, f(t, o, p) {
      for (let i = 0; i < 2; i++) {
        tone(t + i * 0.13, o, { w: 'square', f: 196 * p, h: 0.03, d: 0.08, v: 0.1, lp: 1400 });
        tone(t + i * 0.13, o, { w: 'square', f: 185 * p, h: 0.03, d: 0.08, v: 0.08, lp: 1400 });
        tone(t + i * 0.13, o, { w: 'triangle', f: 392 * p, h: 0.03, d: 0.07, v: 0.06 });   // mid layer (phones)
      }
      return 0.3; } },
    buy: { v: 0, max: 3, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 3500, q: 1.5, d: 0.06, v: 0.15 });
      tone(t + 0.02, o, { w: 'square', f: 988 * p, h: 0.03, d: 0.06, v: 0.08, lp: 5000 });
      tone(t + 0.1, o, { w: 'square', f: 1319 * p, d: 0.45, v: 0.08, lp: 5000 });
      bell(t + 0.1, o, 2637 * p, 0.4, 0.05);
      noise(t + 0.1, o, { type: 'hp', f: 7000, d: 0.3, v: 0.04 });
      return 0.6; } },
    craft: { max: 2, f(t, o, p) {
      for (let i = 0; i < 2; i++) {
        const tt = t + i * 0.14, k = i ? 0.8 : 1;
        noise(tt, o, { type: 'bp', f: 900 * k * p, q: 2.5, d: 0.08, v: 0.3 });
        fm(tt, o, { f: 320 * k * p, r: 1.41, i: 3, i1: 0.1, d: 0.18, v: 0.14 });
      }
      [2093, 2637, 3136, 4186].forEach((f, i) => bell(t + 0.32 + i * 0.05, o, f * p, 0.3, 0.06));
      return 0.75; } },
    levelup: { v: 0, max: 1, dip: 0.5, f(t, o, p) {
      const n = [523, 659, 784, 1047, 1319];
      n.forEach((f, i) => {
        const last = i === n.length - 1;
        tone(t + i * 0.07, o, { w: 'triangle', f: f * p, d: last ? 0.45 : 0.12, v: 0.18 });
        tone(t + i * 0.07, o, { w: 'square', f: f * p, d: last ? 0.3 : 0.08, v: 0.04, lp: 3000 });
      });
      sparkle(t + 0.3, o, p, 6);
      return 0.9; } },
    rankup: { v: 0, max: 1, dip: 0.4, f(t, o, p) {
      [392, 523, 659].forEach((f, i) => brass(t + i * 0.09, o, f * p, 0.12, 0.1));
      [523, 659, 784, 1047].forEach(f => brass(t + 0.3, o, f * p, 0.7, 0.07));
      tone(t + 0.3, o, { f: 110, f1: 50, ft: 0.2, d: 0.35, v: 0.32 });
      noise(t + 0.3, o, { type: 'hp', f: 5000, d: 0.8, v: 0.06 });
      sparkle(t + 0.35, o, p, 8);
      return 1.15; } },
    quest: { v: 0, max: 1, f(t, o, p) {
      [784, 1047, 1319].forEach((f, i) => tone(t + i * 0.08, o, { w: 'triangle', f: f * p, d: i === 2 ? 0.35 : 0.1, v: 0.18 }));
      bell(t + 0.16, o, 2637 * p, 0.4, 0.05);
      return 0.6; } },
    questDone: { v: 0, max: 1, dip: 0.5, f(t, o, p) {
      [784, 988, 1175].forEach(f => tone(t, o, { w: 'triangle', f: f * p, d: 0.12, v: 0.1 }));
      [1047, 1319, 1568].forEach(f => {
        tone(t + 0.16, o, { w: 'triangle', f: f * p, d: 0.6, v: 0.1 });
        tone(t + 0.16, o, { w: 'square', f: f * p, d: 0.3, v: 0.025, lp: 2500 });
      });
      sparkle(t + 0.2, o, p, 6);
      return 0.9; } },
    // Goo Turf final minute: a rising gloopy sweep into a bright two-chord hit (excited, never alarming).
    rush: { v: 0, max: 1, dip: 0.6, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 400 * p, f1: 3200 * p, ft: 0.55, q: 2.5, a: 0.05, d: 0.6, v: 0.12 });
      tone(t, o, { w: 'triangle', f: 220 * p, f1: 660 * p, ft: 0.55, d: 0.6, v: 0.12 });
      [659, 831, 988].forEach(f => brass(t + 0.6, o, f * p, 0.14, 0.06));
      [740, 932, 1109].forEach(f => brass(t + 0.78, o, f * p, 0.3, 0.07));
      sparkle(t + 0.8, o, p, 6);
      return 1.2; } },
    // Goo Turf comeback: a quick hopping major run and a held shiny chord.
    comeback: { v: 0, max: 1, dip: 0.45, f(t, o, p) {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.06, o, { w: 'triangle', f: f * p, d: 0.12, v: 0.12 }));
      [784, 988, 1175, 1568].forEach(f => brass(t + 0.34, o, f * p, 0.45, 0.06));
      bell(t + 0.34, o, 2093 * p, 0.6, 0.05);
      sparkle(t + 0.4, o, p, 8);
      return 1.0; } },
    unlock: { v: 0, max: 1, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 2500, q: 3, d: 0.03, v: 0.2 });
      tone(t, o, { w: 'square', f: 1200 * p, d: 0.02, v: 0.06 });
      tone(t + 0.06, o, { f: 500 * p, f1: 2000 * p, ft: 0.3, d: 0.35, v: 0.12 });
      bell(t + 0.36, o, 1319 * p, 0.5, 0.09);
      bell(t + 0.36, o, 1976 * p, 0.5, 0.06);
      sparkle(t + 0.38, o, p, 5);
      return 0.95; } },
    npc: { v: 0.02, max: 2, gap: 0.08, f(t, o, p) {
      const n = 3 + ((Math.random() * 3) | 0);
      let tt = t;
      for (let i = 0; i < n; i++) {
        const f = (520 + Math.random() * 520) * p, d = 0.035 + Math.random() * 0.04;
        fm(tt, o, { f, f1: f * (Math.random() < 0.5 ? 1.25 : 0.8), ft: d, r: 2, i: 0.8, i1: 0.3, a: 0.005, d, v: 0.13, w: 'triangle' });
        tt += d + 0.025 + Math.random() * 0.03;
      }
      return tt - t + 0.05; } },
    door: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 500 * p, f1: 2200 * p, ft: 0.25, q: 1.2, a: 0.03, d: 0.28, v: 0.22 });
      tone(t + 0.28, o, { f: 120 * p, f1: 60 * p, ft: 0.1, d: 0.15, v: 0.28 });
      noise(t + 0.28, o, { type: 'lp', f: 600, d: 0.06, v: 0.15 });
      crack(t + 0.28, o, 1500 * p, 0.1, 0.03);
      return 0.5; } },
    countdown: { v: 0, max: 2, gap: 0.1, f(t, o, p) {
      tone(t, o, { w: 'square', f: 587 * p, h: 0.06, d: 0.12, v: 0.1, lp: 2500 });
      tone(t, o, { f: 587 * p, h: 0.05, d: 0.15, v: 0.12 });
      return 0.25; } },
    go: { v: 0, max: 1, f(t, o, p) {
      [1175, 1760].forEach(f => {
        tone(t, o, { w: 'square', f: f * p, h: 0.1, d: 0.35, v: 0.07, lp: 3500 });
        tone(t, o, { f: f * p, h: 0.1, d: 0.4, v: 0.09 });
      });
      return 0.55; } },
    // Win fanfare (~2.5 s): sparkly run-up, bVI - bVII - I brass, then a tag that lands on a long shiny major chord.
    win: { v: 0, max: 1, dip: 0.3, f(t, o, p) {
      [523, 659, 784, 1047].forEach((f, i) => {
        tone(t + i * 0.07, o, { w: 'square', f: f * p, d: 0.1, v: 0.06, lp: 3000 });
        tone(t + i * 0.07, o, { w: 'triangle', f: f * p, d: 0.12, v: 0.12 });
      });
      [415, 523, 622].forEach(f => brass(t + 0.34, o, f * p, 0.12, 0.07));   // bVI
      [466, 587, 698].forEach(f => brass(t + 0.5, o, f * p, 0.12, 0.07));    // bVII
      [523, 659, 784, 1047].forEach(f => brass(t + 0.66, o, f * p, 0.3, 0.065)); // I
      tone(t + 0.66, o, { f: 120, f1: 45, ft: 0.25, d: 0.4, v: 0.3 });
      crack(t + 0.66, o, 2200, 0.1, 0.05, 0.9);
      noise(t + 0.66, o, { type: 'hp', f: 4500, d: 0.55, v: 0.06 });
      [784, 880, 988].forEach((f, i) => {                                      // tag: G A B ...
        tone(t + 1.06 + i * 0.09, o, { w: 'square', f: f * p, d: 0.08, v: 0.05, lp: 3500 });
        tone(t + 1.06 + i * 0.09, o, { w: 'triangle', f: f * p, d: 0.1, v: 0.11 });
      });
      [523, 659, 784, 1047].forEach(f => brass(t + 1.34, o, f * p, 0.85, 0.06));   // ... C: I again, held
      tone(t + 1.34, o, { w: 'triangle', f: 1047 * p, a: 0.01, h: 0.45, d: 0.55, v: 0.11 });
      bell(t + 1.34, o, 2093 * p, 1.0, 0.05);
      bell(t + 1.4, o, 3136 * p, 0.8, 0.03);
      tone(t + 1.34, o, { f: 110, f1: 45, ft: 0.25, d: 0.45, v: 0.3 });
      crack(t + 1.34, o, 2000, 0.08, 0.05, 0.9);
      noise(t + 1.28, o, { type: 'hp', f: 5000, a: 0.08, d: 1.0, v: 0.06 });      // shimmer swell
      sparkle(t + 1.42, o, p, 12);
      return 2.5; } },
    // "Nice try!" (~1.45 s): a springy hop, a rising major triad and a warm add6 chord with a wink on top. Never sad.
    lose: { v: 0, max: 1, dip: 0.35, f(t, o, p) {
      const os = tone(t, o, { w: 'triangle', f: 196 * p, f1: 392 * p, ft: 0.12, d: 0.2, v: 0.13 });
      lfo(t + 0.05, t + 0.22, 18, 25, os.detune);
      [523, 659, 784].forEach((f, i) => {
        tone(t + 0.2 + i * 0.11, o, { w: 'square', f: f * p, d: 0.1, v: 0.06, lp: 3200 });
        tone(t + 0.2 + i * 0.11, o, { w: 'triangle', f: f * p, d: 0.14, v: 0.13 });
      });
      [523, 659, 784, 880].forEach(f => brass(t + 0.56, o, f * p, 0.55, 0.065));
      tone(t + 0.56, o, { w: 'triangle', f: 1047 * p, a: 0.01, h: 0.2, d: 0.5, v: 0.12 });
      bell(t + 0.56, o, 2093 * p, 0.7, 0.05);
      tone(t + 0.56, o, { f: 130, f1: 65, ft: 0.2, d: 0.3, v: 0.24 });
      crack(t + 0.56, o, 2000, 0.07, 0.04, 1);
      tone(t + 0.98, o, { w: 'triangle', f: 1568 * p, d: 0.08, v: 0.08 });
      tone(t + 1.08, o, { w: 'triangle', f: 2093 * p, d: 0.16, v: 0.08 });
      sparkle(t + 1.0, o, p, 4);
      return 1.45; } },
    star: { v: 0, max: 3, gap: 0.05, f(t, o, p, op) {
      const k = op.n ? [1, 1.26, 1.5][clamp(op.n | 0, 1, 3) - 1] : 1, f = 1047 * p * k;
      chirp(t, o, 400 * p * k, 1200 * p * k, 0.08, 0.18);
      bell(t + 0.03, o, f, 0.6, 0.1);
      bell(t + 0.03, o, f * 2, 0.4, 0.035);
      noise(t, o, { type: 'hp', f: 6000, d: 0.25, v: 0.04 });
      return 0.7; } },

    // ---- Player
    jump: { max: 2, f(t, o, p) {
      chirp(t, o, 260 * p, 620 * p, 0.12, 0.16);
      tone(t, o, { w: 'triangle', f: 130 * p, f1: 310 * p, ft: 0.1, d: 0.1, v: 0.1 });
      noise(t, o, { type: 'bp', f: 1200, f1: 3000, ft: 0.1, q: 0.8, d: 0.1, v: 0.05 });
      return 0.15; } },
    jump2: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 700, f1: 3500, ft: 0.18, q: 1, a: 0.02, d: 0.18, v: 0.14 });
      chirp(t, o, 450 * p, 1300 * p, 0.16, 0.12);
      bell(t + 0.08, o, 2349 * p, 0.25, 0.045);
      bell(t + 0.13, o, 3136 * p, 0.25, 0.035);
      return 0.4; } },
    land: { max: 2, f(t, o, p, op) {
      tone(t, o, { f: 140 * p, f1: 50 * p, ft: 0.1, d: 0.12, v: 0.22 });
      tone(t, o, { w: 'triangle', f: 520 * p, f1: 340 * p, ft: 0.05, d: 0.07, v: 0.12 });   // mid "thock" (phone speakers)
      noise(t, o, { type: 'lp', f: 700, f1: 200, ft: 0.1, d: 0.09, v: 0.15 });
      crack(t, o, 1700 * p, 0.34, 0.04, 1.1);
      stepSurf(t, o, p, op.surface || 'stone', 1.5);
      return 0.16; } },
    slide: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 1400 * p, f1: 600 * p, ft: 0.45, q: 0.9, a: 0.03, h: 0.2, d: 0.25, v: 0.12 });
      noise(t, o, { type: 'lp', f: 400, a: 0.02, h: 0.2, d: 0.2, v: 0.08 });
      return 0.5; } },
    dash: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 350 * p, f1: 2600 * p, ft: 0.1, q: 1.4, a: 0.01, d: 0.22, v: 0.32 });
      tone(t, o, { w: 'triangle', f: 180 * p, f1: 520 * p, ft: 0.12, d: 0.15, v: 0.08 });
      return 0.3; } },
    mantle: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'lp', f: 900, d: 0.05, v: 0.18 });
      tone(t, o, { w: 'triangle', f: 170 * p, f1: 300 * p, ft: 0.08, d: 0.1, v: 0.12 });
      noise(t + 0.08, o, { type: 'bp', f: 1800, f1: 900, ft: 0.12, q: 1.2, d: 0.12, v: 0.08 });
      return 0.25; } },
    // opts.surface: grass | sand | stone | metal | snow | wood | ink | water (G.Audio.step picks it); opts.land = touch-down step
    step: { max: 3, v: 0.1, gap: 0.05, f(t, o, p, op) {
      return stepSurf(t, o, p, op.surface || 'stone', op.land ? 1.35 : 1); } },
    hurt: { max: 2, gap: 0.06, f(t, o, p) {     // a soft toy "bonk" (mid body + tick so phone speakers carry it)
      tone(t, o, { w: 'square', f: 340 * p, f1: 170 * p, ft: 0.14, d: 0.15, v: 0.12, lp: 1600 });
      tone(t, o, { f: 200 * p, f1: 90 * p, ft: 0.12, d: 0.12, v: 0.17 });
      tone(t, o, { w: 'triangle', f: 620 * p, f1: 420 * p, ft: 0.06, d: 0.07, v: 0.1 });
      noise(t, o, { type: 'lp', f: 1200, d: 0.06, v: 0.15 });
      crack(t, o, 1400 * p, 0.16, 0.035, 1.2);
      return 0.2; } },
    hurtShield: { max: 2, gap: 0.06, f(t, o, p) {
      for (let i = 0; i < 6; i++) noise(t + i * 0.018 + Math.random() * 0.01, o, { type: 'bp', f: (2500 + Math.random() * 3000) * p, q: 3, d: 0.015, v: 0.35 });
      tone(t, o, { w: 'sawtooth', f: 110 * p, d: 0.12, v: 0.08, lp: 2000 });
      tone(t, o, { w: 'square', f: 1800 * p, f1: 900 * p, ft: 0.1, d: 0.1, v: 0.035, lp: 5000 });
      return 0.18; } },
    shieldBreak: { max: 1, f(t, o, p) {
      noise(t, o, { type: 'hp', f: 3000, d: 0.04, v: 0.3 });
      chirp(t, o, 2400 * p, 600 * p, 0.13, 0.15);
      [3200, 4130, 5310].forEach((f, i) => tone(t, o, { f: f * p, d: 0.5 - i * 0.1, v: 0.06 }));
      for (let i = 0; i < 5; i++) tone(t + 0.04 + Math.random() * 0.3, o, { f: (3000 + Math.random() * 3500) * p, d: 0.08, v: 0.045 });
      noise(t, o, { type: 'bp', f: 6000, q: 1, a: 0.005, d: 0.35, v: 0.06 });
      return 0.6; } },
    shieldUp: { max: 1, f(t, o, p) {
      tone(t, o, { w: 'sawtooth', f: 180 * p, f1: 720 * p, ft: 0.35, a: 0.04, d: 0.35, v: 0.06, bp: 1200, q: 2 });
      tone(t, o, { f: 400 * p, f1: 1300 * p, ft: 0.35, a: 0.04, d: 0.35, v: 0.1 });
      bell(t + 0.3, o, 1568 * p, 0.35, 0.05);
      return 0.7; } },
    // shield starts recharging (GDD: sine 400 -> 1200 Hz, 0.6 s), soft
    shieldRegen: { max: 1, gap: 0.5, v: 0, f(t, o, p) {
      tone(t, o, { f: 400 * p, f1: 1200 * p, ft: 0.55, a: 0.08, h: 0.2, d: 0.32, v: 0.08 });
      tone(t, o, { w: 'triangle', f: 800 * p, f1: 2400 * p, ft: 0.55, a: 0.1, h: 0.15, d: 0.3, v: 0.03 });
      noise(t, o, { type: 'hp', f: 5000, a: 0.2, d: 0.35, v: 0.02 });
      return 0.62; } },
    heal: { max: 2, v: 0, f(t, o, p) {
      [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.06, o, { f: f * p, d: 0.3, v: 0.09 }));
      noise(t, o, { type: 'hp', f: 6000, a: 0.1, d: 0.35, v: 0.03 });
      return 0.55; } },
    // low-HP heartbeat (lub-dub), scheduled by vitals(); soft thump with a mid body so phones hear it too
    heartbeat: { max: 2, gap: 0.2, v: 0, f(t, o, p) {
      for (let i = 0; i < 2; i++) {
        const tt = t + i * 0.148, k = i ? 0.7 : 1;
        tone(tt, o, { f: 64 * p, f1: 46 * p, ft: 0.1, a: 0.008, d: 0.13, v: 0.28 * k });
        tone(tt, o, { w: 'triangle', f: 150 * p, f1: 92 * p, ft: 0.06, a: 0.006, d: 0.08, v: 0.2 * k });
        noise(tt, o, { type: 'bp', f: 720, q: 1.2, a: 0.004, d: 0.05, v: 0.22 * k });
        tone(tt, o, { w: 'triangle', f: 380 * p, f1: 240 * p, ft: 0.05, a: 0.004, d: 0.065, v: 0.3 * k });   // soft "tok" phones can play
        crack(tt, o, 1200, 0.17 * k, 0.026, 1.5);
      }
      return 0.32; } },
    down: { max: 1, f(t, o, p) {
      const a = tone(t, o, { w: 'square', f: 700 * p, f1: 110 * p, ft: 0.75, a: 0.02, h: 0.3, d: 0.45, v: 0.06, lp: 1500 });
      const b = tone(t, o, { f: 700 * p, f1: 110 * p, ft: 0.75, a: 0.02, h: 0.3, d: 0.45, v: 0.12 });
      lfo(t, t + 0.8, 16, 60, a.detune).connect(b.detune);
      noise(t, o, { type: 'bp', f: 900, f1: 300, ft: 0.7, q: 2, a: 0.05, h: 0.3, d: 0.4, v: 0.05 });
      return 0.85; } },
    respawn: { max: 1, v: 0, f(t, o, p) {
      const sc = [0, 2, 4, 7, 9];
      for (let i = 0; i < 10; i++) tone(t + i * 0.035, o, { w: 'triangle', f: 523 * p * Math.pow(2, (sc[i % 5] + 12 * Math.floor(i / 5)) / 12), d: 0.15, v: 0.07 });
      noise(t, o, { type: 'hp', f: 3000, f1: 8000, ft: 0.5, a: 0.2, d: 0.35, v: 0.05 });
      tone(t, o, { f: 200 * p, f1: 800 * p, ft: 0.5, a: 0.05, d: 0.5, v: 0.06 });
      return 0.75; } },
    // weapon swap: softer latch clicks (band-passed, triangle) instead of the old 3 kHz high-pass + square ticks
    equip: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 2200, q: 1.1, d: 0.014, v: 0.16 });
      tone(t, o, { w: 'triangle', f: 1400 * p, d: 0.02, v: 0.06 });
      tone(t + 0.03, o, { w: 'sawtooth', f: 300 * p, f1: 800 * p, ft: 0.13, a: 0.01, d: 0.14, v: 0.06, bp: 1500, q: 2 });
      noise(t + 0.18, o, { type: 'bp', f: 1800, q: 1.6, d: 0.02, v: 0.16 });
      tone(t + 0.18, o, { w: 'triangle', f: 1100 * p, d: 0.03, v: 0.06 });
      tone(t + 0.18, o, { f: 240 * p, f1: 150 * p, ft: 0.04, d: 0.05, v: 0.08 });
      return 0.25; } },
    reload: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 1600 * p, q: 3, d: 0.03, v: 0.25 });
      noise(t + 0.07, o, { type: 'bp', f: 900 * p, f1: 2200 * p, ft: 0.12, q: 2, a: 0.02, d: 0.12, v: 0.1 });
      noise(t + 0.24, o, { type: 'bp', f: 2200 * p, q: 3, d: 0.03, v: 0.28 });
      tone(t + 0.24, o, { w: 'square', f: 900 * p, d: 0.03, v: 0.05 });
      tone(t + 0.24, o, { f: 220 * p, f1: 120 * p, ft: 0.05, d: 0.06, v: 0.12 });
      return 0.32; } },
    // dry "tk" when the mag is empty, low-passed (was the harshest sound in the set: 3.5 kHz high-pass + square)
    empty: { max: 2, gap: 0.08, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 2400, q: 1.4, d: 0.012, v: 0.18 });
      tone(t, o, { w: 'triangle', f: 1100 * p, f1: 900 * p, ft: 0.02, d: 0.025, v: 0.08 });
      tone(t, o, { f: 320 * p, f1: 200 * p, ft: 0.03, d: 0.035, v: 0.07 });
      return 0.05; } },
    // ammo running low (opts.n = 2: almost empty, three higher ticks)
    lowAmmo: { max: 1, gap: 0.25, v: 0, f(t, o, p, op) {
      const crit = (op.n | 0) >= 2, f0 = (crit ? 1568 : 1319) * p, n = crit ? 3 : 2;
      for (let i = 0; i < n; i++) { tone(t + i * 0.075, o, { w: 'triangle', f: f0 * (i ? 1.335 : 1), d: 0.045, v: 0.22 }); crack(t + i * 0.075, o, 3000, 0.06, 0.006, 2); }
      return n * 0.075 + 0.06; } },
    // Fizz Blaster overheat (GDD: saw 600 -> 200 Hz + hiss), with a little ding so it reads as "cool down", not damage
    overheat: { max: 1, gap: 0.3, v: 0, f(t, o, p) {
      tone(t, o, { w: 'sawtooth', f: 600 * p, f1: 200 * p, ft: 0.45, a: 0.01, h: 0.1, d: 0.35, v: 0.07, lp: 2600 });
      tone(t, o, { w: 'square', f: 300 * p, f1: 100 * p, ft: 0.45, a: 0.01, h: 0.1, d: 0.35, v: 0.03, lp: 1200 });
      noise(t + 0.05, o, { type: 'bp', f: 3600, q: 0.6, a: 0.03, h: 0.2, d: 0.4, v: 0.1 });
      noise(t + 0.05, o, { type: 'bp', f: 6000, q: 1, a: 0.02, h: 0.1, d: 0.3, v: 0.03 });
      bell(t, o, 1568 * p, 0.25, 0.04);
      return 0.72; } },
    swim: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'lp', f: 3500 * p, f1: 400 * p, ft: 0.35, q: 1, d: 0.35, v: 0.22 });
      for (let i = 0; i < 3; i++) { const f = (350 + Math.random() * 300) * p; chirp(t + 0.05 + Math.random() * 0.2, o, f, f * 2.2, 0.06, 0.07); }
      return 0.4; } },
    splat: { max: 3, f(t, o, p) {
      noise(t, o, { type: 'lp', f: 2200 * p, f1: 300 * p, ft: 0.14, q: 7, d: 0.16, v: 0.22 });
      chirp(t, o, 320 * p, 110 * p, 0.1, 0.15);
      return 0.18; } },

    // ---- Weapons
    blaster: { max: 5, f(t, o, p) {
      tone(t, o, { w: 'square', f: 1500 * p, f1: 280 * p, ft: 0.11, d: 0.12, v: 0.08, lp: 4500 });
      chirp(t, o, 760 * p, 180 * p, 0.1, 0.16);
      noise(t, o, { type: 'hp', f: 4000, d: 0.02, v: 0.05 });
      return 0.13; } },
    blasterHeavy: { max: 4, f(t, o, p) {
      tone(t, o, { w: 'sawtooth', f: 950 * p, f1: 110 * p, ft: 0.18, d: 0.2, v: 0.09, lp: 3000 });
      tone(t, o, { f: 160 * p, f1: 55 * p, ft: 0.15, d: 0.18, v: 0.3 });
      noise(t, o, { type: 'lp', f: 1800, f1: 400, ft: 0.1, d: 0.1, v: 0.18 });
      crack(t, o, 1900 * p, 0.1, 0.025);
      return 0.22; } },
    shotgun: { max: 3, f(t, o, p) {
      noise(t, o, { type: 'lp', f: 3000 * p, f1: 500, ft: 0.22, q: 0.8, d: 0.25, v: 0.36 });
      tone(t, o, { f: 130 * p, f1: 45, ft: 0.14, d: 0.16, v: 0.34 });
      noise(t, o, { type: 'hp', f: 3500, d: 0.03, v: 0.15 });
      crack(t, o, 2200 * p, 0.18, 0.035, 1.1);
      noise(t + 0.18, o, { type: 'bp', f: 1300, q: 3, d: 0.03, v: 0.08 });
      return 0.3; } },
    laser: { max: 3, f(t, o, p) {
      fm(t, o, { f: 2200 * p, f1: 380 * p, ft: 0.28, r: 0.5, i: 4, i1: 0.3, d: 0.3, v: 0.13 });
      tone(t, o, { w: 'square', f: 3000 * p, f1: 400 * p, ft: 0.25, d: 0.26, v: 0.04, lp: 6000 });
      noise(t, o, { type: 'hp', f: 5000, d: 0.05, v: 0.18 });
      tone(t, o, { f: 120 * p, f1: 45, ft: 0.15, d: 0.2, v: 0.28 });
      return 0.33; } },
    rocket: { max: 3, f(t, o, p) {
      noise(t, o, { type: 'hp', f: 2000, d: 0.03, v: 0.2 });
      tone(t, o, { f: 200 * p, f1: 60, ft: 0.1, d: 0.12, v: 0.28 });
      noise(t + 0.02, o, { type: 'bp', f: 300 * p, f1: 1500 * p, ft: 0.45, q: 1.3, a: 0.05, d: 0.5, v: 0.25 });
      tone(t + 0.02, o, { w: 'sawtooth', f: 70 * p, f1: 110 * p, ft: 0.5, a: 0.05, d: 0.5, v: 0.08, lp: 400 });
      return 0.6; } },
    grenade: { max: 3, f(t, o, p) {            // launcher "thoomp": low body, tube pop and a crack for phone speakers
      tone(t, o, { f: 190 * p, f1: 70 * p, ft: 0.1, d: 0.12, v: 0.26 });
      tone(t, o, { w: 'triangle', f: 420 * p, f1: 300 * p, ft: 0.08, d: 0.09, v: 0.16 });
      tone(t, o, { w: 'triangle', f: 760 * p, f1: 520 * p, ft: 0.05, d: 0.06, v: 0.1 });
      noise(t, o, { type: 'lp', f: 900, d: 0.06, v: 0.18 });
      crack(t, o, 1800 * p, 0.42, 0.045, 1.2);
      return 0.15; } },
    beam: { max: 2, f(t, o, p) {
      tone(t, o, { w: 'sawtooth', f: 220 * p, a: 0.02, h: 0.15, d: 0.12, v: 0.07, bp: 1600, q: 2 });
      tone(t, o, { w: 'sawtooth', f: 223.5 * p, a: 0.02, h: 0.15, d: 0.12, v: 0.07, bp: 1600, q: 2 });
      fm(t, o, { f: 880 * p, r: 0.25, i: 2, i1: 1.5, a: 0.02, h: 0.15, d: 0.12, v: 0.05 });
      return 0.32; } },
    charge: { max: 2, f(t, o, p) {
      tone(t, o, { w: 'sawtooth', f: 180 * p, f1: 1100 * p, ft: 0.8, a: 0.1, h: 0.6, d: 0.2, v: 0.06, bp: 1200, ff1: 3000, q: 3, am: [7, 0.8, 26] });
      tone(t, o, { f: 300 * p, f1: 2000 * p, ft: 0.85, a: 0.1, h: 0.6, d: 0.2, v: 0.07 });
      return 0.95; } },
    chargeShot: { max: 2, f(t, o, p) {
      tone(t, o, { w: 'square', f: 1900 * p, f1: 180 * p, ft: 0.3, d: 0.32, v: 0.08, lp: 5000 });
      tone(t, o, { f: 110 * p, f1: 38, ft: 0.25, d: 0.35, v: 0.36 });
      noise(t, o, { type: 'lp', f: 4000, f1: 500, ft: 0.3, d: 0.3, v: 0.2 });
      bell(t, o, 2637 * p, 0.35, 0.045);
      return 0.45; } },
    disc: { max: 3, f(t, o, p) {
      tone(t, o, { w: 'sawtooth', f: 320 * p, f1: 250 * p, ft: 0.45, a: 0.02, h: 0.25, d: 0.2, v: 0.08, bp: 1400, q: 1.5, am: [38, 0.7] });
      tone(t, o, { w: 'square', f: 640 * p, f1: 500 * p, ft: 0.45, a: 0.02, h: 0.2, d: 0.2, v: 0.025, lp: 3000 });
      return 0.5; } },
    // gatling round: tick + a short mid "thup" body so the stream has weight
    needle: { max: 6, gap: 0.02, f(t, o, p) {
      tone(t, o, { w: 'square', f: 3000 * p, d: 0.02, v: 0.04, lp: 6000 });
      noise(t, o, { type: 'bp', f: 3800, q: 1, d: 0.015, v: 0.08 });
      chirp(t, o, 900 * p, 500 * p, 0.03, 0.08);
      tone(t, o, { w: 'triangle', f: 260 * p, f1: 150 * p, ft: 0.03, d: 0.035, v: 0.12 });
      return 0.045; } },
    ink: { max: 5, f(t, o, p) {
      noise(t, o, { type: 'lp', f: 500 * p, f1: 1800 * p, ft: 0.06, q: 6, d: 0.1, v: 0.18 });
      chirp(t, o, 520 * p, 200 * p, 0.09, 0.15);
      return 0.12; } },
    inkHeavy: { max: 3, f(t, o, p) {
      noise(t, o, { type: 'lp', f: 300 * p, f1: 2000 * p, ft: 0.08, q: 9, a: 0.005, d: 0.22, v: 0.2 });
      tone(t, o, { f: 220 * p, f1: 70 * p, ft: 0.15, d: 0.18, v: 0.28 });
      chirp(t + 0.1, o, 400 * p, 900 * p, 0.06, 0.07);
      return 0.28; } },
    freeze: { max: 3, f(t, o, p) {
      [2349, 3136, 3951, 4699].forEach((f, i) => {
        tone(t + i * 0.03, o, { f: f * p, d: 0.55 - i * 0.08, v: 0.055 });
        tone(t + i * 0.03, o, { f: f * p * 1.004, d: 0.5 - i * 0.08, v: 0.035 });
      });
      noise(t, o, { type: 'hp', f: 7000, a: 0.01, d: 0.3, v: 0.07 });
      noise(t, o, { type: 'bp', f: 3000, q: 4, d: 0.05, v: 0.12 });
      return 0.65; } },
    zap: { max: 4, f(t, o, p) {
      const os = OSC('sawtooth', 200 * p);
      for (let i = 0; i < 16; i++) os.frequency.setValueAtTime((90 + Math.random() * 1400) * p, t + i * 0.015);
      const hp = BQ('highpass', 700, 0.7), g = envG(t, 0.004, 0.07, 0.16, 0.08);
      os.connect(hp); hp.connect(g); g.connect(o); run(os, t, t + 0.27);
      for (let i = 0; i < 4; i++) noise(t + i * 0.05 + Math.random() * 0.02, o, { type: 'bp', f: 2500 + Math.random() * 2500, q: 2, d: 0.03, v: 0.13 });
      return 0.28; } },
    groove: { max: 3, v: 0, f(t, o, p) {
      const sc = [0, 3, 5, 7, 10, 12];
      for (let i = 0; i < 2; i++) {
        const f = 392 * p * Math.pow(2, sc[(Math.random() * 6) | 0] / 12);
        tone(t + i * 0.09, o, { w: 'square', f, d: 0.1, h: 0.02, v: 0.07, bp: 500, ff1: 2600, fft: 0.08, q: 4 });
        tone(t + i * 0.09, o, { w: 'triangle', f: f / 2, d: 0.08, v: 0.08 });
      }
      tone(t, o, { w: 'square', f: 800 * p, d: 0.04, v: 0.03, bp: 800, q: 6 });   // cowbell-ish tick
      return 0.25; } },
    bounce: { max: 4, f(t, o, p) {
      const os = tone(t, o, { w: 'triangle', f: 220 * p, f1: 520 * p, ft: 0.06, d: 0.25, v: 0.15 });
      os.frequency.exponentialRampToValueAtTime(330 * p, t + 0.25);
      lfo(t, t + 0.3, 22, 40, os.detune);
      return 0.3; } },
    explode: { max: 4, gap: 0.04, dip: 0.55, f(t, o, p, op) {
      const s = clamp((op.size || 3) / 3, 0.4, 3), d = Math.min(1.15, 0.45 + s * 0.22), k = 1 / Math.sqrt(s);
      const g = Math.min(1.2, 0.7 + s * 0.18);
      noise(t, o, { type: 'lp', f: 2400 * k * p, f1: 150, ft: d, q: 0.7, a: 0.004, d, v: 0.4 * g });
      tone(t, o, { f: 120 * k * p, f1: 32, ft: d * 0.6, d: d * 0.7, v: 0.4 * g });
      noise(t, o, { type: 'hp', f: 2500, d: 0.06, v: 0.14 * g });
      crack(t, o, 1800 * k * p, 0.2 * g, 0.05, 0.9);                 // phone-band crack
      noise(t + 0.05, o, { type: 'bp', f: 900 * k, q: 1, a: 0.01, d: d * 0.5, v: 0.14 * g });
      return d + 0.05; } },
    // world hit by a shot (opts.mat: metal | ground | soft)
    impact: { max: 4, gap: 0.04, v: 0.08, f(t, o, p, op) {
      const m = op.mat || 'ground';
      if (m === 'metal') { fm(t, o, { f: 1700 * p, r: 2.76, i: 1.4, i1: 0.05, d: 0.15, v: 0.08 }); crack(t, o, 2600 * p, 0.09, 0.012, 2); return 0.17; }
      if (m === 'soft') { noise(t, o, { type: 'lp', f: 1100 * p, f1: 300, ft: 0.06, d: 0.07, v: 0.5 }); crack(t, o, 1200 * p, 0.12, 0.02); return 0.08; }
      tone(t, o, { f: 160 * p, f1: 70 * p, ft: 0.05, d: 0.07, v: 0.11 });
      crack(t, o, 1900 * p, 0.3, 0.022, 1.1);
      noise(t + 0.01, o, { type: 'bp', f: 900, q: 1, d: 0.06, v: 0.12 });
      return 0.1; } },
    hit: { max: 4, gap: 0.03, v: 0.06, f(t, o, p) {
      tone(t, o, { w: 'square', f: 1700 * p, d: 0.03, v: 0.05 });
      chirp(t, o, 880 * p, 600 * p, 0.05, 0.13);
      return 0.06; } },
    crit: { max: 3, gap: 0.03, f(t, o, p) {
      tone(t, o, { w: 'square', f: 2400 * p, d: 0.025, v: 0.05 });
      bell(t, o, 2637 * p, 0.15, 0.09);
      chirp(t, o, 1320 * p, 900 * p, 0.06, 0.11);
      return 0.18; } },
    kill: { max: 3, f(t, o, p) {
      chirp(t, o, 380 * p, 1300 * p, 0.09, 0.2);
      noise(t, o, { type: 'bp', f: 2200, q: 1.5, d: 0.05, v: 0.18 });
      bell(t + 0.04, o, 1568 * p, 0.22, 0.07);
      return 0.28; } },
    pickupBolt: { max: 4, v: 0, gap: 0.03, f(t, o, p) {
      boltN = t - boltT < 0.6 ? Math.min(boltN + 1, BOLT_UP.length - 1) : 0;
      boltT = t;
      const f = 1175 * p * Math.pow(2, BOLT_UP[boltN] / 12);
      fm(t, o, { f, r: 2.76, i: 1.2, i1: 0.05, d: 0.14, v: 0.09 });
      tone(t, o, { f: f * 2, d: 0.06, v: 0.03 });
      return 0.16; } },
    pickupPart: { max: 3, v: 0.02, f(t, o, p) {
      [1568, 2349, 3136].forEach((f, i) => bell(t + i * 0.035, o, f * p, 0.5, 0.065, 2.01));
      return 0.6; } },
    pickupRare: { max: 2, v: 0, f(t, o, p) {
      const sc = [0, 2, 4, 7, 9];
      for (let i = 0; i < 8; i++) bell(t + i * 0.035, o, 1047 * p * Math.pow(2, (sc[i % 5] + 12 * Math.floor(i / 5)) / 12), 0.3, 0.045);
      noise(t, o, { type: 'hp', f: 6000, a: 0.15, d: 0.5, v: 0.05 });
      [1047, 1319, 1568, 2093].forEach(f => tone(t + 0.3, o, { w: 'triangle', f: f * p, a: 0.02, d: 0.6, v: 0.04 }));
      return 0.95; } },
    coin: { max: 3, v: 0, f(t, o, p) {
      tone(t, o, { w: 'square', f: 988 * p, h: 0.03, d: 0.05, v: 0.09, lp: 5000 });
      tone(t + 0.075, o, { w: 'square', f: 1319 * p, d: 0.3, v: 0.09, lp: 5000 });
      return 0.4; } },

    // ---- Enemies / world
    enemyShoot: { max: 4, f(t, o, p) {
      tone(t, o, { w: 'sawtooth', f: 640 * p, f1: 180 * p, ft: 0.14, d: 0.15, v: 0.07, lp: 2400 });
      tone(t, o, { w: 'triangle', f: 320 * p, f1: 110 * p, ft: 0.12, d: 0.13, v: 0.12 });
      crack(t, o, 1600 * p, 0.06, 0.02, 1.3);
      return 0.16; } },
    enemyAlert: { max: 2, f(t, o, p) {
      tone(t, o, { w: 'square', f: 880 * p, h: 0.02, d: 0.04, v: 0.07, lp: 3000 });
      tone(t + 0.08, o, { w: 'square', f: 1320 * p, h: 0.04, d: 0.1, v: 0.08, lp: 3500 });
      fm(t + 0.08, o, { f: 1320 * p, r: 2, i: 0.6, h: 0.04, d: 0.1, v: 0.06 });
      return 0.25; } },
    enemyDie: { max: 3, f(t, o, p) {
      const os = tone(t, o, { w: 'triangle', f: 320 * p, f1: 140 * p, ft: 0.15, d: 0.25, v: 0.16 });
      lfo(t, t + 0.25, 18, 50, os.detune);
      chirp(t, o, 400 * p, 1200 * p, 0.07, 0.16);
      noise(t, o, { type: 'bp', f: 2000, q: 1, d: 0.05, v: 0.14 });
      bell(t + 0.12, o, 2093 * p, 0.35, 0.07);
      return 0.5; } },
    // generic wind-up (kept for callers that have not moved to the tele* family); stretches to opts.dur
    enemyCharge: { max: 2, f(t, o, p, op) {
      const d = op.dur ? tdur(op, 0.55) : 0.55, h = Math.max(0.1, d - 0.2);
      tone(t, o, { w: 'square', f: 280 * p, f1: 950 * p, ft: d - 0.05, a: 0.02, h, d: 0.15, v: 0.05, lp: 2200, am: [12, 0.6, 24] });
      tone(t, o, { f: 560 * p, f1: 1900 * p, ft: d - 0.05, a: 0.02, h, d: 0.15, v: 0.06 });
      return d; } },
    // ---- Threat telegraphs (wind-ups). opts.dur = wind-up length in s: each one stretches to it so the end of the
    // sound is the moment the attack lands. All positional via sfxAt, louder and with a gentler rolloff than other
    // sfx, with a short music dip at the start and a caption.
    teleMelee: { max: 3, gap: 0.05, f(t, o, p, op) {        // rising whoosh
      const d = tdur(op, 0.6);
      crack(t, o, 2000 * p, 0.08, 0.012, 1.6);
      noise(t, o, { type: 'bp', f: 320 * p, f1: 2800 * p, ft: d, q: 1.8, a: d * 0.75, h: d * 0.2, d: 0.08, v: 0.26 });
      tone(t, o, { w: 'triangle', f: 200 * p, f1: 900 * p, ft: d, a: d * 0.6, h: d * 0.35, d: 0.06, v: 0.1 });
      tone(t, o, { w: 'square', f: 400 * p, f1: 1800 * p, ft: d, a: d * 0.7, h: d * 0.25, d: 0.05, v: 0.02, lp: 3500 });
      return d + 0.1; } },
    teleSnipe: { max: 2, gap: 0.1, f(t, o, p, op) {         // lock-on beeps speeding up, then a held lock tone
      const d = tdur(op, 1.0);
      let x = 0, gap = Math.min(0.24, d * 0.24), k = 0;
      while (x < d - 0.2 && k < 16) {
        const f = (1500 + k * 45) * p;
        tone(t + x, o, { f, d: 0.045, v: 0.12 });
        tone(t + x, o, { w: 'square', f, d: 0.03, v: 0.025, lp: 4200 });
        x += gap; gap = Math.max(0.055, gap * 0.8); k++;
      }
      tone(t + d - 0.17, o, { f: 2100 * p, h: 0.1, d: 0.06, v: 0.12 });
      tone(t + d - 0.17, o, { w: 'square', f: 1050 * p, h: 0.1, d: 0.06, v: 0.03, lp: 3500 });
      tone(t, o, { f: 600 * p, f1: 1200 * p, ft: d, a: d * 0.8, d: 0.05, v: 0.025 });
      return d + 0.05; } },
    teleArtillery: { max: 2, gap: 0.08, f(t, o, p, op) {    // tube "thoonk", then a falling whistle
      const d = tdur(op, 1.0), w = Math.max(0.2, d - 0.14);
      tone(t, o, { f: 230 * p, f1: 70 * p, ft: 0.09, d: 0.14, v: 0.32 });
      tone(t + 0.005, o, { w: 'triangle', f: 360 * p, f1: 300 * p, ft: 0.1, d: 0.12, v: 0.14 });
      noise(t, o, { type: 'lp', f: 1600, f1: 300, ft: 0.08, d: 0.1, v: 0.2 });
      crack(t, o, 1300 * p, 0.14, 0.03, 2);
      tone(t + 0.14, o, { f: 2500 * p, f1: 1050 * p, ft: w, a: w * 0.6, d: w * 0.4 + 0.04, v: 0.075, am: [12, 0.25] });
      tone(t + 0.14, o, { f: 1250 * p, f1: 525 * p, ft: w, a: w * 0.6, d: w * 0.4 + 0.04, v: 0.025 });
      return d + 0.08; } },
    teleCharge: { max: 2, gap: 0.08, f(t, o, p, op) {       // toy engine revving up
      const d = tdur(op, 0.8);
      const lp = filt('lowpass', 420, 3, t, 2600, d), g = envG(t, d * 0.4, 0.13, 0.1, d * 0.58), tr = trem(t, t + d + 0.15, 18, 0.45, 36);
      for (const [wv, k] of [['sawtooth', 1], ['square', 0.5]]) {
        const os = OSC(wv, 62 * p * k); os.frequency.setValueAtTime(F(62 * p * k), t); os.frequency.exponentialRampToValueAtTime(F(200 * p * k), t + d);
        os.connect(lp); run(os, t, t + d + 0.15);
      }
      lp.connect(tr); tr.connect(g); g.connect(o);
      noise(t, o, { type: 'bp', f: 1400 * p, f1: 3200 * p, ft: d, q: 3, a: d * 0.5, h: d * 0.45, d: 0.08, v: 0.2 });
      crack(t, o, 1800 * p, 0.12, 0.02, 1.4);
      return d + 0.12; } },
    teleRing: { max: 2, gap: 0.08, f(t, o, p, op) {         // electric hum swell with crackles
      const d = tdur(op, 1.0);
      const bp = filt('bandpass', 900, 2.2, t, 2200, d), g = envG(t, d * 0.85, 0.2, 0.1, d * 0.1);
      for (const f of [110, 110.7, 220.5]) { const os = OSC('sawtooth', f * p); os.connect(bp); run(os, t, t + d + 0.12); }
      bp.connect(g); g.connect(o);
      tone(t, o, { f: 330 * p, f1: 660 * p, ft: d, a: d * 0.8, h: d * 0.15, d: 0.06, v: 0.08 });
      const n = 4 + Math.round(d * 6);
      for (let i = 0; i < n; i++) { const x = d * Math.sqrt((i + Math.random() * 0.8) / n); noise(t + x, o, { type: 'bp', f: (2600 + Math.random() * 2600) * p, q: 3, d: 0.012, v: 0.1 + 0.16 * x / d }); }
      return d + 0.1; } },
    teleSpin: { max: 2, gap: 0.08, f(t, o, p, op) {         // spin-up whirr
      const d = tdur(op, 0.9);
      tone(t, o, { w: 'sawtooth', f: 110 * p, f1: 880 * p, ft: d, a: d * 0.5, h: d * 0.45, d: 0.08, v: 0.15, bp: 900, ff1: 2600, q: 2, am: [7, 0.6, 38] });
      tone(t, o, { w: 'triangle', f: 220 * p, f1: 1760 * p, ft: d, a: d * 0.6, h: d * 0.35, d: 0.06, v: 0.09 });
      noise(t, o, { type: 'bp', f: 500 * p, f1: 3000 * p, ft: d, q: 1.6, a: d * 0.6, h: d * 0.35, d: 0.06, v: 0.11 });
      return d + 0.1; } },
    teleBoss: { max: 1, gap: 0.3, f(t, o, p, op) {          // big readable horn: a rising fourth
      const d = tdur(op, 1.0), a = d * 0.38, b = d * 0.62;
      horn(t, o, 196 * p, a, 0.075);
      horn(t + a, o, 262 * p, b, 0.085);
      tone(t, o, { f: 98 * p, a: 0.03, h: d * 0.8, d: 0.2, v: 0.1 });
      crack(t, o, 1600 * p, 0.12, 0.04, 1.2); crack(t + a, o, 1800 * p, 0.12, 0.04, 1.2);
      return d + 0.25; } },
    // Boss roar: low toy-mech bellow plus an upper "horn" formant so it carries on phone speakers (a honk, not a growl).
    bossRoar: { max: 1, f(t, o, p) {
      const dur = 1.15, lp = BQ('lowpass', 180, 6), g = envG(t, 0.08, 0.17, 0.55, 0.5);
      lp.frequency.setValueAtTime(180, t);
      lp.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
      lp.frequency.exponentialRampToValueAtTime(220, t + dur);
      const gg = lfo(t, t + dur + 0.05, 28, 14 * p);
      [55, 55.6, 82.4].forEach(f => {
        const os = OSC('sawtooth', f * p);
        os.frequency.setValueAtTime(f * p * 1.08, t);
        os.frequency.exponentialRampToValueAtTime(f * p * 0.8, t + dur);
        gg.connect(os.frequency); os.connect(lp); run(os, t, t + dur + 0.05);
      });
      lp.connect(g); g.connect(o);
      const bp = filt('bandpass', 700, 3, t, 1300, 0.35), g2 = envG(t, 0.06, 0.18, 0.55, 0.45);
      bp.frequency.exponentialRampToValueAtTime(800, t + dur);
      [110, 110.8, 164.8].forEach(f => {
        const os = OSC('sawtooth', f * p * 1.06);
        os.frequency.exponentialRampToValueAtTime(F(f * p * 0.84), t + dur);
        os.connect(bp); run(os, t, t + dur + 0.05);
      });
      bp.connect(g2); g2.connect(o);
      noise(t, o, { type: 'lp', f: 600, f1: 200, ft: dur, a: 0.05, h: 0.4, d: 0.6, v: 0.1 });
      tone(t, o, { f: 48 * p, f1: 34, ft: dur, a: 0.05, h: 0.4, d: 0.6, v: 0.18 });
      crack(t, o, 1500 * p, 0.12, 0.06, 0.9);
      return dur + 0.05; } },
    warn: { max: 1, v: 0, f(t, o, p) {
      for (let i = 0; i < 4; i++) {
        const f = (i % 2 ? 660 : 880) * p;
        tone(t + i * 0.17, o, { w: 'square', f, h: 0.04, d: 0.12, v: 0.06, lp: 3000 });
        tone(t + i * 0.17, o, { f, h: 0.04, d: 0.12, v: 0.07 });
      }
      return 0.72; } },
    zoneWarn: { max: 1, v: 0, f(t, o, p) {
      const lp = BQ('lowpass', 700, 2), g = envG(t, 0.15, 0.1, 0.3, 0.6), tg = trem(t, t + 1.1, 5, 0.8);
      [110, 111, 165].forEach(f => { const os = OSC('sawtooth', f * p); os.connect(lp); run(os, t, t + 1.1); });
      lp.connect(tg); tg.connect(g); g.connect(o);
      tone(t, o, { w: 'triangle', f: 880 * p, h: 0.05, d: 0.2, v: 0.05 });
      return 1.1; } },
    boost: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 300 * p, f1: 3200 * p, ft: 0.4, q: 1.2, a: 0.03, d: 0.5, v: 0.24 });
      tone(t, o, { f: 250 * p, f1: 900 * p, ft: 0.4, a: 0.03, d: 0.45, v: 0.1 });
      tone(t, o, { w: 'sawtooth', f: 125 * p, f1: 450 * p, ft: 0.4, a: 0.03, d: 0.4, v: 0.04, lp: 1500 });
      return 0.55; } },
    ring: { max: 3, v: 0, f(t, o, p) {
      bell(t, o, 1760 * p, 0.4, 0.08);
      bell(t + 0.06, o, 2637 * p, 0.45, 0.07);
      tone(t, o, { w: 'triangle', f: 880 * p, d: 0.2, v: 0.08 });
      return 0.55; } },
    engine: { max: 2, f(t, o, p) {
      const lp = filt('lowpass', 600, 2.5, t, 2000, 0.35), g = envG(t, 0.03, 0.12, 0.2, 0.25);
      [['sawtooth', 1], ['square', 0.502]].forEach(([w, k]) => {
        const os = OSC(w, 80 * p * k); os.frequency.exponentialRampToValueAtTime(F(210 * p * k), t + 0.35); os.connect(lp); run(os, t, t + 0.5);
      });
      lp.connect(g); g.connect(o);
      return 0.5; } },
    item: { max: 2, v: 0, f(t, o, p) {
      [0, 4, 7, 12, 7, 16].forEach((s, i) => tone(t + i * 0.045, o, { w: 'square', f: 784 * p * Math.pow(2, s / 12), d: 0.05, v: 0.09, lp: 4000 }));
      bell(t + 0.28, o, 2093 * p, 0.35, 0.06);
      return 0.65; } },
    missile: { max: 3, f(t, o, p) {
      noise(t, o, { type: 'hp', f: 2500, d: 0.03, v: 0.15 });
      noise(t, o, { type: 'bp', f: 1200 * p, f1: 2500 * p, ft: 0.6, q: 2, a: 0.05, d: 0.6, v: 0.14 });
      tone(t, o, { f: 700 * p, f1: 1500 * p, ft: 0.6, a: 0.05, d: 0.6, v: 0.06 });
      return 0.7; } },
    shieldBubble: { max: 2, f(t, o, p) {
      chirp(t, o, 180 * p, 700 * p, 0.25, 0.18);
      const os = tone(t + 0.1, o, { w: 'triangle', f: 350 * p, a: 0.05, h: 0.25, d: 0.25, v: 0.06 });
      lfo(t + 0.1, t + 0.66, 7, 15, os.detune);
      bell(t + 0.15, o, 1760 * p, 0.4, 0.045);
      noise(t, o, { type: 'hp', f: 5000, a: 0.1, d: 0.35, v: 0.03 });
      return 0.66; } },
    teleport: { max: 2, f(t, o, p) {
      fm(t, o, { f: 300 * p, f1: 2600 * p, ft: 0.35, r: 1.5, i: 2, i1: 0.3, a: 0.02, d: 0.4, v: 0.13 });
      noise(t, o, { type: 'bp', f: 800, f1: 6000, ft: 0.35, q: 2, a: 0.05, d: 0.35, v: 0.11 });
      sparkle(t + 0.3, o, p, 4);
      return 0.6; } },
    // wooden/metal crate bursting open (expedition crates): thump + crunchy noise + a few plank clacks
    crate: { max: 3, gap: 0.04, f(t, o, p) {
      tone(t, o, { f: 150 * p, f1: 60 * p, ft: 0.08, d: 0.12, v: 0.26 });
      noise(t, o, { type: 'lp', f: 2600 * p, f1: 500, ft: 0.15, q: 0.9, d: 0.18, v: 0.28 });
      crack(t, o, 2400 * p, 0.16, 0.03, 1.3);
      for (let i = 0; i < 4; i++) noise(t + 0.02 + i * 0.035 + Math.random() * 0.02, o, { type: 'bp', f: (700 + Math.random() * 900) * p, q: 6, d: 0.04, v: 0.16 });
      bell(t + 0.05, o, 1568 * p, 0.2, 0.03, 2.01);
      return 0.3; } },
    // one-shot air swish (boss dashes); loop('whoosh') stays the continuous wind loop
    whoosh: { max: 3, f(t, o, p) {
      noise(t, o, { type: 'bp', f: 400 * p, f1: 1800 * p, ft: 0.18, q: 1.1, a: 0.06, d: 0.26, v: 0.26 });
      noise(t, o, { type: 'lp', f: 700 * p, a: 0.05, d: 0.25, v: 0.1 });
      return 0.34; } },
    splashBig: { max: 2, f(t, o, p) {
      noise(t, o, { type: 'lp', f: 5000 * p, f1: 300, ft: 0.8, q: 0.8, a: 0.01, d: 0.85, v: 0.3 });
      tone(t, o, { f: 160 * p, f1: 45, ft: 0.3, d: 0.35, v: 0.32 });
      for (let i = 0; i < 5; i++) { const f = (300 + Math.random() * 400) * p; chirp(t + 0.15 + Math.random() * 0.5, o, f, f * 2.4, 0.06, 0.05); }
      return 0.9; } },
  };

  // ---------------------------------------------------------------- target-level table
  // Category targets, LUFS-M (momentary max, BS.1770 K-weighted) of the raw voice render incl. trim:
  //   ui ≈ -32 · player movement ≈ -33..-29 · confirm (hit/crit/kill) ≈ -29 · player weapons ≈ -26 ·
  //   threats / telegraphs ≈ -24 (wind-up cues -22) · rewards ≈ -22 (stingers -19..-20, pickups -27..-25) · world -27..-21.
  // Each entry: [category, trim dB to reach its target, extra {cap: caption key, duck: music dip level}].
  // Priority for voice stealing comes from the category: threat/hurt 4 > weapon/player/confirm 3 > reward/world 2 >
  // pickup 1 > ui 0. Threats also get a gentler distance rolloff (roll 20 m) and reach 75 m.
  const CATS = {
    ui: { pri: 0, ui: 1 }, pickup: { pri: 1 }, reward: { pri: 2 }, world: { pri: 2 }, player: { pri: 3 }, confirm: { pri: 3 },
    weapon: { pri: 3 }, hurt: { pri: 4 }, threat: { pri: 4, roll: 20, cull: 75 },
  };
  const TELE = { duck: 0.7 };
  const LEVELS = {
    // ui (≈ -32; error louder, open whoosh softer). Menu-only sounds: this category follows the Menu sounds slider,
    // steals first and skips the pause duck. 'countdown' (Rollo's fuse, wave / race / match counts) is a gameplay
    // cue and 'npc' doubles as robot chatter and a weapon voice, so both live outside it.
    ui: ['ui', 3.4], uiBack: ['ui', 3], uiOpen: ['ui', 5], tab: ['ui', 3], error: ['ui', -3.6],
    npc: ['world', 4], countdown: ['threat', -2.3],
    // rewards (≈ -22; win -19, lose -20, go -21) and pickups (-30..-24)
    buy: ['reward', 3.9], craft: ['reward', 4.4], levelup: ['reward', 2.1], rankup: ['reward', -1.1], quest: ['reward', 3.6], questDone: ['reward', 2.9],
    unlock: ['reward', 5], rush: ['reward', 1.5], comeback: ['reward', 0.5], go: ['reward', -2.3], win: ['reward', -1.1], lose: ['reward', -0.8], star: ['reward', 4.3], item: ['reward', 5.1],
    pickupBolt: ['pickup', 3.8], pickupPart: ['pickup', 2.3], pickupRare: ['pickup', 3.2], coin: ['pickup', 1.2], heal: ['pickup', 3.2], shieldUp: ['pickup', 4.7],
    // player movement (≈ -33..-29) and hurt (-29..-23)
    jump: ['player', 2.6], jump2: ['player', 2.1], land: ['player', 2.1], slide: ['player', 2.4], dash: ['player', 7.2], mantle: ['player', 6.2], step: ['player', 4],
    swim: ['player', 0.7], splat: ['player', 2.8], down: ['player', -3.2], respawn: ['player', 2.6], shieldRegen: ['player', -4.1], heartbeat: ['hurt', 0],
    hurt: ['hurt', 4], hurtShield: ['hurt', 7.5], shieldBreak: ['hurt', 2.8],
    // player weapons (≈ -26; rapid fire -27..-31) and confirms (≈ -29)
    blaster: ['weapon', 4.5], blasterHeavy: ['weapon', 3.5], shotgun: ['weapon', 2.5], laser: ['weapon', 1], rocket: ['weapon', 4.2], grenade: ['weapon', 2.9],
    beam: ['weapon', 4.2], charge: ['weapon', -2], chargeShot: ['weapon', 1], disc: ['weapon', 6.8], needle: ['weapon', 4.5], ink: ['weapon', 7],
    inkHeavy: ['weapon', 3.2], freeze: ['weapon', -0.5], zap: ['weapon', 6.9], groove: ['weapon', 7.8], equip: ['weapon', 6.8], reload: ['weapon', 7.4],
    empty: ['weapon', 8.2], lowAmmo: ['weapon', 2.5], overheat: ['weapon', -1],
    hit: ['confirm', 4.5], crit: ['confirm', 4.5], kill: ['confirm', 4.1],
    // threats (≈ -24) and wind-up telegraphs (≈ -22, boss -19/-20)
    enemyShoot: ['threat', 7.6], enemyAlert: ['threat', 4.5, { cap: 'cap.enemyAlert' }], enemyCharge: ['threat', 5, { cap: 'cap.teleMelee', duck: 0.8 }],
    teleMelee: ['threat', 3.3, { cap: 'cap.teleMelee', duck: 0.7 }], teleSnipe: ['threat', 3.3, { cap: 'cap.teleSnipe', duck: 0.7 }],
    teleArtillery: ['threat', 7.2, { cap: 'cap.teleArtillery', duck: 0.7 }], teleCharge: ['threat', 0.5, { cap: 'cap.teleCharge', duck: 0.7 }],
    teleRing: ['threat', 3.5, { cap: 'cap.teleRing', duck: 0.7 }], teleSpin: ['threat', 3.5, { cap: 'cap.teleSpin', duck: 0.7 }],
    teleBoss: ['threat', 0.5, { cap: 'cap.teleBoss', duck: 0.6 }], bossRoar: ['threat', -2.5, { cap: 'cap.bossRoar', duck: 0.55 }],
    warn: ['threat', 1.5, { cap: 'cap.warn', duck: 0.7 }], zoneWarn: ['threat', 2.7, { cap: 'cap.zoneWarn', duck: 0.7 }], missile: ['threat', 6, { cap: 'cap.missile' }],
    // world (-31..-22)
    explode: ['world', 1], impact: ['world', 6], enemyDie: ['world', 3], boost: ['world', 4.1], ring: ['world', 3.1], engine: ['world', -1.7],
    shieldBubble: ['world', 0.8], teleport: ['world', 3.4], crate: ['world', 4.4], whoosh: ['world', 8.1], splashBig: ['world', -0.5], bounce: ['world', 4.6], door: ['world', 1.6],
  };
  void TELE;
  for (const n in SFX) {
    const L = LEVELS[n] || ['world', 0], C = CATS[L[0]] || CATS.world, d = SFX[n];
    d.c = L[0]; d.g = dbg(L[1]); d.pri = C.pri; d.roll = C.roll || 8; d.cull = C.cull || 60; d.ui = !!C.ui;
    if (L[2]) { if (L[2].cap) d.cap = L[2].cap; if (L[2].duck) d.duck = L[2].duck; }
  }

  // ---------------------------------------------------------------- voices
  function prune(t) {
    for (let i = voices.length - 1; i >= 0; i--) {
      const v = voices[i];
      if (v.end < t) { voices.splice(i, 1); try { v.out.disconnect(); } catch (e) { /* already gone */ } }
    }
  }
  function kill(v, t) {
    const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1);
    const g = v.out.gain;
    holdP(g, t); g.linearRampToValueAtTime(0, t + 0.02);
    for (const s of v.srcs) { try { s.stop(t + 0.03); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { v.out.disconnect(); } catch (e) { /* gone */ } }, 120);
  }
  // Steal the lowest-priority (then oldest) voice whose priority is not above `pri`; false = everything playing matters more.
  function steal(pri, t) {
    let vi = -1, vp = 99;
    for (let i = 0; i < voices.length; i++) { const p = voices[i].pri; if (p <= pri && p < vp) { vp = p; vi = i; } }
    if (vi < 0) return false;
    kill(voices[vi], t);
    return true;
  }
  // Positional attenuation relative to the main camera. Reuses one object (no per-call allocation).
  const _sp = { att: 1, pan: 0, d: 0, front: 1 };
  function spatial(pos, roll, cull) {
    const cam = G.R && G.R.camera;
    _sp.att = 1; _sp.pan = 0; _sp.d = 0; _sp.front = 1;
    if (!cam || !pos || typeof pos.x !== 'number') return _sp;
    roll = roll || 8; cull = cull || 60;
    const e = cam.matrixWorld.elements;
    const dx = pos.x - e[12], dy = pos.y - e[13], dz = pos.z - e[14];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > cull) return null;
    let att = 1 / (1 + d / roll);
    if (d > cull - 15) att *= (cull - d) / 15;
    _sp.att = att; _sp.d = d;
    if (d > 0.3) {
      _sp.pan = clamp((dx * e[0] + dy * e[1] + dz * e[2]) / d, -1, 1) * Math.min(1, d / 3) * 0.85;
      _sp.front = -(dx * e[8] + dy * e[9] + dz * e[10]) / d;     // camera looks down -Z
    }
    return _sp;
  }
  function play(name, opts, sp) {
    const def = SFX[name];
    if (!def) { warnOnce('s:' + name, 'unknown sfx "' + name + '"'); return null; }
    if (!ctx || ctx.state !== 'running' || muted || vol.master <= 0 || (def.ui ? vol.ui : vol.sfx) <= 0) {
      // A silent game still captions flagged cues: captions exist for players who can't hear them.
      if (def.cap && capFns.length) caption(name, def, sp);
      return null;
    }
    opts = opts || EMPTY;
    const t0 = ctx.currentTime, t = opts.at > t0 ? opts.at : t0;
    if (t0 - (def.last === undefined ? -9 : def.last) < (def.gap === undefined ? 0.025 : def.gap)) return null;
    let g = clamp(opts.vol === undefined ? 1 : +opts.vol || 0, 0, 2) * def.g;
    let pan = opts.pan || 0, d = 0;
    if (sp) { g *= sp.att; pan = sp.pan; d = sp.d; }
    if (g < 0.003) return null;
    prune(t0);
    let same = 0, first = null;
    for (let i = 0; i < voices.length; i++) if (voices[i].name === name) { if (!first) first = voices[i]; same++; }
    if (same >= (def.max || 4)) kill(first, t0);
    while (voices.length >= MAX_VOICES) if (!steal(def.pri, t0)) return null;
    def.last = t0;
    const vr = def.v === undefined ? 0.04 : def.v;
    const p = clamp(+opts.pitch || 1, 0.25, 4) * (1 + (Math.random() * 2 - 1) * vr);
    const out = GN(g);
    let tail = out, lpF = 0;
    const lp0 = def.roll > 8 ? 22 : 14;
    if (d > lp0) lpF = clamp(16000 / (1 + (d - lp0) / 7), 900, 16000);
    if (sp && sp.front < -0.3 && d > 3) lpF = Math.min(lpF || 16000, 6500);   // a little duller from behind
    if (lpF) { const lp = BQ('lowpass', lpF, 0.5); tail.connect(lp); tail = lp; }
    if (pan && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = clamp(pan, -1, 1); tail.connect(pn); tail = pn; }
    tail.connect(def.ui ? uiBus : sfxBus);
    const v = { name, out, srcs: [], end: 0, dur: 0, pri: def.pri };
    let dur = 0.3;
    cur = v;
    try { dur = def.f(t, out, p, opts) || 0.3; } catch (e) { warnOnce('e:' + name, 'sfx "' + name + '" failed: ' + e.message); } finally { cur = null; }
    v.dur = dur; v.end = t + dur + 0.1;
    voices.push(v);
    plays++;
    if (def.dip) dipMusic(def.dip, dur * 0.8);
    else if (def.duck && g > 0.08 && d < 32) dipMusic(def.duck, Math.min(0.7, dur * 0.5));   // near threats only: far wind-ups don't pump the music
    if (def.cap && capFns.length) caption(name, def, sp);
    return v;
  }
  const dip = { level: 1, until: 0 };
  function dipMusic(level, hold) {
    if (!musicDip) return;
    const P = musicDip.gain, t = ctx.currentTime;
    if (t < dip.until && dip.level < level) return;              // a deeper dip is already running
    holdP(P, t);
    P.setTargetAtTime(level, t, 0.03); P.setTargetAtTime(1, t + hold, 0.3);
    dip.level = level; dip.until = t + hold;
  }

  // ---------------------------------------------------------------- captions
  const capFns = [];
  function caption(name, def, sp) {
    const now = performance.now();
    if (now - (def.capT || -1e9) < 1200) return;
    def.capT = now;
    const pan = sp ? sp.pan : 0, dir = sp && sp.front < -0.35 && sp.d > 2 ? 'behind' : pan < -0.3 ? 'left' : pan > 0.3 ? 'right' : 'center';
    const text = G.t ? G.t(def.cap) : def.cap;
    const ev = { key: def.cap, text, line: G.t ? G.t('cap.dir.' + dir, { text }) : text, dir, pan: +pan.toFixed(2), dist: sp ? Math.round(sp.d) : 0, name,
      on: !!(G.Save && G.Save.data && G.Save.set.captions) };
    for (const fn of capFns.slice()) { try { fn(ev); } catch (e) { warnOnce('cap', 'caption listener failed: ' + e.message); } }
  }

  // ---------------------------------------------------------------- loops
  // make(out) builds sources into `out`; returns {srcs, set(pitch, t, timeConstant)}. v = base level.
  const LOOPS = {
    engine: { v: 0.15, make(o) {
      const lp = BQ('lowpass', 900, 2.5), trm = GN(0.8), a = OSC('sawtooth', 110), b = OSC('square', 55.3), c = OSC('sine', 55);
      const bg = GN(0.3), cg = GN(0.5), am = OSC('sine', 22), amg = GN(0.2);
      a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(trm); c.connect(cg); cg.connect(trm); trm.connect(o);
      am.connect(amg); amg.connect(trm.gain);
      return { srcs: [a, b, c, am], set(p, t, k) {
        a.frequency.setTargetAtTime(110 * p, t, k); b.frequency.setTargetAtTime(55.3 * p, t, k); c.frequency.setTargetAtTime(55 * p, t, k);
        am.frequency.setTargetAtTime(22 * p, t, k); lp.frequency.setTargetAtTime(300 + 1000 * p, t, k);
      } };
    } },
    beam: { v: 0.13, make(o) {
      const bp = BQ('bandpass', 1400, 1.8), a = OSC('sawtooth', 220), b = OSC('sawtooth', 221.7), w = OSC('sine', 9), wg = GN(18);
      w.connect(wg); wg.connect(a.detune); wg.connect(b.detune);
      a.connect(bp); b.connect(bp); bp.connect(o);
      const n = NZ(), hp = BQ('highpass', 5000), ng = GN(0.12); n.connect(hp); hp.connect(ng); ng.connect(o);
      return { srcs: [a, b, w, n], set(p, t, k) {
        a.frequency.setTargetAtTime(220 * p, t, k); b.frequency.setTargetAtTime(221.7 * p, t, k); bp.frequency.setTargetAtTime(1400 * p, t, k);
      } };
    } },
    swim: { v: 0.16, make(o) {
      const n = NZ(), lp = BQ('lowpass', 700, 1.5), l = OSC('sine', 1.6), lg = GN(350);
      l.connect(lg); lg.connect(lp.frequency); n.connect(lp); lp.connect(o);
      return { srcs: [n, l], set(p, t, k) { lp.frequency.setTargetAtTime(700 * p, t, k); l.frequency.setTargetAtTime(1.6 * p, t, k); } };
    } },
    whoosh: { v: 0.14, make(o) {
      const n = NZ(), bp = BQ('bandpass', 900, 0.7), l = OSC('sine', 0.4), lg = GN(300);
      l.connect(lg); lg.connect(bp.frequency); n.connect(bp); bp.connect(o);
      return { srcs: [n, l], set(p, t, k) { bp.frequency.setTargetAtTime(500 + 700 * p, t, k); } };
    } },
    zoneWarn: { v: 0.13, make(o) {
      const lp = BQ('lowpass', 650, 2), trm = GN(0.55), l = OSC('sine', 3.2), lg = GN(0.45);
      const oscs = [55, 55.4, 82.6].map(f => { const os = OSC('sawtooth', f); os.connect(lp); return os; });
      lp.connect(trm); trm.connect(o); l.connect(lg); lg.connect(trm.gain);
      return { srcs: oscs.concat([l]), set(p, t, k) {
        oscs[0].frequency.setTargetAtTime(55 * p, t, k); oscs[1].frequency.setTargetAtTime(55.4 * p, t, k); oscs[2].frequency.setTargetAtTime(82.6 * p, t, k);
        l.frequency.setTargetAtTime(3.2 * p, t, k);
      } };
    } },
    charge: { v: 0.1, make(o) {
      const bp = BQ('bandpass', 1200, 3), a = OSC('sawtooth', 200), b = OSC('sine', 400), bg = GN(0.6), trm = GN(0.7), l = OSC('sine', 8), lg = GN(0.3);
      a.connect(bp); bp.connect(trm); b.connect(bg); bg.connect(trm); trm.connect(o); l.connect(lg); lg.connect(trm.gain);
      return { srcs: [a, b, l], set(p, t, k) {
        a.frequency.setTargetAtTime(200 * p, t, k); b.frequency.setTargetAtTime(400 * p, t, k); bp.frequency.setTargetAtTime(1200 * p, t, k); l.frequency.setTargetAtTime(8 * p, t, k);
      } };
    } },
    hum: { v: 0.1, make(o) {
      const a = OSC('triangle', 180), b = OSC('sine', 360), bg = GN(0.5), w = OSC('sine', 5), wg = GN(12);
      w.connect(wg); wg.connect(a.detune); wg.connect(b.detune); a.connect(o); b.connect(bg); bg.connect(o);
      return { srcs: [a, b, w], set(p, t, k) { a.frequency.setTargetAtTime(180 * p, t, k); b.frequency.setTargetAtTime(360 * p, t, k); } };
    } },
    // Puff Pack: airy thrust (band noise + low rumble) with a flutter; pitch ~ thrust / fuel (0.5..1.5)
    jet: { v: 0.13, make(o) {
      const n = NZ(), bp = BQ('bandpass', 1300, 0.9), lp = BQ('lowpass', 320, 0.8), ng = GN(0.7), lg = GN(0.9);
      const fl = OSC('sine', 26), flg = GN(0.22), trm = GN(0.8), hum = OSC('triangle', 70), hg = GN(0.1);
      n.connect(bp); bp.connect(ng); ng.connect(trm); n.connect(lp); lp.connect(lg); lg.connect(trm); fl.connect(flg); flg.connect(trm.gain); trm.connect(o);
      hum.connect(hg); hg.connect(o);
      return { srcs: [n, fl, hum], set(p, t, k) {
        bp.frequency.setTargetAtTime(700 + 900 * p, t, k); lp.frequency.setTargetAtTime(200 + 200 * p, t, k);
        fl.frequency.setTargetAtTime(18 + 14 * p, t, k); hum.frequency.setTargetAtTime(55 + 35 * p, t, k);
      } };
    } },
    // Glide Wings: soft wind over the wings with a faint whistle; pitch ~ air speed (0.5..1.5)
    glide: { v: 0.11, make(o) {
      const n = NZ(), bp = BQ('bandpass', 1400, 0.8), hp = BQ('highpass', 450), l = OSC('sine', 0.7), lg = GN(260);
      l.connect(lg); lg.connect(bp.frequency); n.connect(hp); hp.connect(bp); bp.connect(o);
      const wh = OSC('sine', 1250), wg = GN(0.025), wl = OSC('sine', 5), wlg = GN(14);
      wl.connect(wlg); wlg.connect(wh.detune); wh.connect(wg); wg.connect(o);
      return { srcs: [n, l, wh, wl], set(p, t, k) { bp.frequency.setTargetAtTime(900 + 900 * p, t, k); wh.frequency.setTargetAtTime(1000 + 500 * p, t, k); } };
    } },
  };
  LOOPS.drone = LOOPS.zoneWarn; LOOPS.shieldBubble = LOOPS.hum;

  function startLoop(h) {
    const L = LOOPS[h.name];
    if (!L) { h.live = { re: true, next: 0 }; return; }   // one-shot retriggered by tick()
    const t = ctx.currentTime, pre = GN(1), out = GN(0);
    pre.connect(out);
    let tail = out, pan = null;
    if (ctx.createStereoPanner) { pan = ctx.createStereoPanner(); out.connect(pan); tail = pan; }
    tail.connect(sfxBus);
    const live = L.make(pre);
    live.out = out; live.pan = pan; live.base = L.v; live.lp = -1; live.lv = -1; live.lpan = 0;
    for (const s of live.srcs) s.start(t);
    h.live = live;
    applyLoop(h, true);
  }
  function applyLoop(h, first) {
    const L = h.live; if (!L || L.re || !ctx) return;
    const o = h.o, p = clamp(+o.pitch || 1, 0.1, 4);
    let v = clamp(o.vol === undefined ? 1 : +o.vol || 0, 0, 2) * L.base, pan = o.pan || 0;
    if (o.pos) { const sp = spatial(o.pos); if (sp) { v *= sp.att; pan = sp.pan; } else v = 0; }
    if (!first && Math.abs(p - L.lp) < 0.003 && Math.abs(v - L.lv) < 0.002 && Math.abs(pan - L.lpan) < 0.01) return;
    const t = ctx.currentTime;
    L.out.gain.setTargetAtTime(v, t, first ? 0.03 : 0.05);
    if (L.pan) L.pan.pan.setTargetAtTime(clamp(pan, -1, 1), t, 0.05);
    if (first || Math.abs(p - L.lp) >= 0.003) L.set(p, t, first ? 0.003 : 0.05);
    L.lp = p; L.lv = v; L.lpan = pan;
  }
  function stopLive(h, fade) {
    const L = h.live; h.live = null;
    if (!L || L.re || !ctx) return;
    const t = ctx.currentTime, f = fade === undefined ? 0.12 : Math.max(0.02, +fade || 0.02);
    const P = L.out.gain;
    holdP(P, t); P.linearRampToValueAtTime(0, t + f);
    for (const s of L.srcs) { try { s.stop(t + f + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { L.out.disconnect(); if (L.pan) L.pan.disconnect(); } catch (e) { /* gone */ } }, (f + 0.25) * 1000);
  }

  // ---------------------------------------------------------------- surfaces (footsteps)
  const BIOME_SURF = { shoals: 'grass', mesas: 'sand', grotto: 'grass', frost: 'snow', junk: 'metal' };
  const RACE_BIOME = { coral: 'shoals', mesa: 'mesas', glow: 'grotto', frost: 'frost', junk: 'junk', sun: 'shoals' };
  let surfBiome = null;
  // Biome of the running place (expedition mission / boss arena / race theme), or null.
  function biomeNow(gm) {
    gm = gm || G.Game; if (!gm) return null;
    const p = gm.params || EMPTY, X = G.Exp, id = gm.modeId;
    try {
      if (typeof p.biome === 'string' && BIOME_SURF[p.biome]) return p.biome;
      if (id === 'expedition' && X) {
        const m = p.mission && typeof p.mission === 'object' ? p.mission : (X.mission ? X.mission(p.mission) : null);
        if (m && m.biome) return m.biome;
        if (X.dbg && X.dbg.state) { const s = X.dbg.state(); if (s && s.biome) return s.biome; }
      }
      if (id === 'boss' && X && X.BOSS_BIOME) {
        const b = p.rush && X.BOSS_IDS ? X.BOSS_IDS[p.rushIdx || 0] : p.boss;
        return X.BOSS_BIOME[b] || X.BOSS_BIOME.crankcrab || null;
      }
      if (id === 'race' && G.Race && G.Race.state && G.Race.state.def) return RACE_BIOME[G.Race.state.def.theme] || null;
    } catch (e) { warnOnce('biome', 'biome lookup failed: ' + e.message); }
    return null;
  }
  // Surface under the player: water/ink while swimming, turf ink cells, the Fizzport zones (plaza stone, lawn,
  // beach sand, shallows, wooden floors on buildings and decks), the biome ground in the field, props underfoot.
  function surfaceNow(gm) {
    gm = gm || G.Game; if (!gm) return 'stone';
    const id = gm.modeId, w = gm.world, pl = w && w.player;
    if (pl && pl.swimming) return id === 'turf' ? 'ink' : 'water';
    if (!pl || !pl.pos) return 'stone';
    const x = pl.pos.x, y = pl.pos.y, z = pl.pos.z;
    const h = w.phys && w.phys.terrain ? w.phys.terrain(x, z) : y;
    const onProp = y - h > 0.3;
    switch (id) {
      case 'turf': {
        const m = G.Turf && G.Turf.match, P = gm.turfPaint || (m && m.paint);
        if (P && P.ownerAt) { const c = P.ownerAt(x, z); if (c === 1 || c === 2) return 'ink'; }
        return 'stone';
      }
      case 'hub': case 'title': {
        // the town knows its own floors: building floors and decks are wood (20_hub Hub.surfaceAt), even where
        // the deck sits flush with the ground; anything else raised in the plaza (fountain rim, steps) is stone
        const H = G.Hub;
        if (H && H.surfaceAt && gm === G.Game) {   // (a probe stand-in for G.Game has no town of its own)
          let hs = null;
          try { hs = H.surfaceAt(x, z, y); } catch (e) { warnOnce('surfaceAt', 'Hub.surfaceAt failed: ' + e.message); }
          if (hs) return hs;
        }
        const r = Math.sqrt(x * x + z * z);
        if (onProp) return r < 28.2 ? 'stone' : 'wood';
        if (r < 28.2) return 'stone';
        if (h < -0.62) return 'water';
        return r < 41.5 ? 'grass' : 'sand';
      }
      case 'defense': return onProp ? 'wood' : 'stone';
      case 'training': return onProp ? 'wood' : 'grass';
      case 'royale': return onProp ? 'wood' : (h < 0.4 ? 'sand' : 'grass');
    }
    const b = gm === G.Game ? surfBiome || biomeNow(gm) : biomeNow(gm);
    if (onProp) return b === 'junk' ? 'metal' : b === 'frost' ? 'snow' : 'stone';
    return (b && BIOME_SURF[b]) || 'grass';
  }
  const _so = { vol: 1, pan: 0, pitch: 1, surface: 'stone', land: false }, _lo = { vol: 1, pitch: 1, surface: 'stone' };

  // ---------------------------------------------------------------- vitals (low HP)
  const hp = { on: false, frac: 1, last: -9, next: 0 };
  const _hb = { at: 0, vol: 1 };
  const HB_PERIOD = 1 / 1.35;        // 08_hud vignette pulse: phase = (G.time.now * 1.35) % 1
  function beatAt(now) { const gt = G.time ? +G.time.now || 0 : 0, ph = (gt * 1.35) % 1; return now + (1 - ph) * HB_PERIOD; }
  function setLowHp(on, now) {
    hp.on = on;
    if (musicLP) { const P = musicLP.frequency; holdP(P, now); P.setTargetAtTime(on ? LOWHP_LP : 20000, now, on ? 0.35 : 0.6); }
    if (on) hp.next = beatAt(now);
  }

  // ---------------------------------------------------------------- ambience
  // A bed is a few looping layers (stereo pairs of filtered noise with slow swells / filter drift, or soft tones) plus
  // sparse randomized events, all into ambBus (own volume). Layer: {n:'lp'|'bp'|'hp', f, q, v, am:[rate, depth],
  // sw:[rate, Hz], w: stereo width} or {tone:[Hz...], v, am}. Event: {fn, every:[min, max] s, v, pan, lite}.
  // Low quality keeps the first two layers and only 'lite' events.
  const AMB = {
    fizzport: { g: 0, bed: [
      { n: 'bp', f: 520, q: 0.9, v: 0.05, am: [0.23, 0.5], sw: [0.11, 140] },     // crowd murmur, two moving bands
      { n: 'hp', f: 3400, q: 0.6, v: 0.016, am: [2.3, 0.35], w: 0.25 },           // fountain
      { n: 'bp', f: 1150, q: 1.4, v: 0.022, am: [0.37, 0.6], sw: [0.17, 260] },
      { n: 'lp', f: 260, q: 0.7, v: 0.03, am: [0.07, 0.4] },                       // far sea + rides rumble
    ], ev: [
      { fn: 'gull', every: [7, 16], v: 0.6, pan: 0.8, lite: 1 },
      { fn: 'chatter', every: [2.5, 6], v: 0.55, pan: 0.7, lite: 1 },
      { fn: 'ride', every: [9, 18], v: 0.55, pan: 0.9 },
      { fn: 'chime', every: [16, 30], v: 0.25, pan: 0.6 },
    ] },
    plaza: { g: 0, bed: [
      { n: 'hp', f: 3000, q: 0.6, v: 0.022, am: [2.1, 0.35], w: 0.3 },            // fountain up close
      { n: 'bp', f: 700, q: 0.9, v: 0.025, am: [0.09, 0.6], sw: [0.06, 200] },    // breeze
      { n: 'lp', f: 240, q: 0.7, v: 0.025, am: [0.08, 0.5] },
    ], ev: [{ fn: 'gull', every: [8, 18], v: 0.6, pan: 0.8, lite: 1 }, { fn: 'tweet', every: [6, 14], v: 0.4, pan: 0.8 }] },
    shoals: { g: 0, bed: [
      { n: 'lp', f: 520, q: 0.6, v: 0.07, am: [0.11, 0.85], sw: [0.11, 260] },    // surf swell
      { n: 'hp', f: 2600, q: 0.5, v: 0.018, am: [0.11, 0.9], w: 0.6 },            // foam hiss riding the swell
      { n: 'bp', f: 900, q: 0.8, v: 0.02, am: [0.07, 0.6], sw: [0.05, 300] },     // breeze
    ], ev: [{ fn: 'tweet', every: [3, 8], v: 0.6, pan: 0.9, lite: 1 }, { fn: 'gull', every: [9, 20], v: 0.5, pan: 0.9 }, { fn: 'wave', every: [6, 11], v: 0.6, pan: 0.5 }] },
    mesas: { g: 5, bed: [
      { n: 'bp', f: 420, q: 1.6, v: 0.06, am: [0.09, 0.7], sw: [0.06, 220] },     // warm wind
      { n: 'bp', f: 1700, q: 3, v: 0.012, am: [0.13, 0.8], sw: [0.08, 600] },     // wind whistle over the rocks
      { n: 'lp', f: 200, q: 0.7, v: 0.02, am: [0.05, 0.5] },
    ], ev: [{ fn: 'gust', every: [7, 15], v: 0.7, pan: 0.8, lite: 1 }, { fn: 'tweet', every: [8, 18], v: 0.35, pan: 0.9 }, { fn: 'tick', every: [5, 12], v: 0.4, pan: 0.9 }] },
    grotto: { g: 1, bed: [
      { n: 'lp', f: 380, q: 0.6, v: 0.03, am: [0.06, 0.4] },                       // still night air
      { tone: [220, 277.2, 329.6], v: 0.008, am: [0.21, 0.7] },                    // glowcap hum (soft major chord)
      { n: 'hp', f: 5200, q: 0.5, v: 0.005, am: [0.3, 0.6] },
    ], ev: [{ fn: 'cricket', every: [0.6, 2.2], v: 0.7, pan: 0.9, lite: 1 }, { fn: 'twinkle', every: [5, 12], v: 0.6, pan: 0.8 }, { fn: 'drip', every: [3, 9], v: 0.6, pan: 0.8 }] },
    frost: { g: 3, bed: [
      { n: 'bp', f: 800, q: 1.2, v: 0.05, am: [0.08, 0.7], sw: [0.05, 500] },     // icy wind
      { n: 'hp', f: 4200, q: 0.5, v: 0.014, am: [0.15, 0.8], w: 0.7 },            // snow hiss
      { n: 'bp', f: 2200, q: 4, v: 0.006, am: [0.11, 0.9], sw: [0.07, 700] },
    ], ev: [{ fn: 'chime', every: [5, 12], v: 0.7, pan: 0.8, lite: 1 }, { fn: 'gust', every: [8, 16], v: 0.6, pan: 0.8 }] },
    junk: { g: 6, bed: [
      { n: 'lp', f: 170, q: 0.8, v: 0.05, am: [0.5, 0.3] },                        // conveyor rumble
      { n: 'bp', f: 1400, q: 4, v: 0.007, am: [3.1, 0.7] },                        // motor whine
      { n: 'bp', f: 600, q: 1, v: 0.02, am: [0.08, 0.6], sw: [0.05, 180] },
    ], ev: [{ fn: 'clank', every: [2.5, 6], v: 0.7, pan: 0.9, lite: 1 }, { fn: 'rattle', every: [4, 9], v: 0.6, pan: 0.8 }, { fn: 'steam', every: [7, 15], v: 0.6, pan: 0.8 }] },
    arena: { g: 2, bed: [
      { n: 'bp', f: 600, q: 0.8, v: 0.06, am: [0.19, 0.5], sw: [0.09, 160] },     // stands crowd
      { n: 'bp', f: 1300, q: 1.2, v: 0.025, am: [0.31, 0.6], sw: [0.13, 300] },
      { n: 'lp', f: 220, q: 0.7, v: 0.02, am: [0.05, 0.4] },
    ], ev: [{ fn: 'cheer', every: [8, 18], v: 0.6, pan: 0.6, lite: 1 }, { fn: 'chatter', every: [3, 7], v: 0.5, pan: 0.8 }] },
    island: { g: 5, bed: [
      { n: 'bp', f: 700, q: 0.9, v: 0.04, am: [0.08, 0.7], sw: [0.05, 260] },     // breeze
      { n: 'lp', f: 420, q: 0.6, v: 0.035, am: [0.1, 0.8], sw: [0.1, 200] },      // far surf
    ], ev: [{ fn: 'tweet', every: [4, 10], v: 0.5, pan: 0.9, lite: 1 }, { fn: 'gull', every: [12, 24], v: 0.4, pan: 0.9 }] },
    range: { g: 7, bed: [
      { n: 'bp', f: 800, q: 0.9, v: 0.03, am: [0.08, 0.6], sw: [0.05, 260] },     // breeze
      { n: 'lp', f: 260, q: 0.7, v: 0.02, am: [0.06, 0.4] },
    ], ev: [{ fn: 'tweet', every: [4, 9], v: 0.5, pan: 0.9, lite: 1 }, { fn: 'ding', every: [9, 20], v: 0.4, pan: 0.8 }] },
  };
  // Ambience events: tiny one-offs into the bed (o = per-event panned gain), v = event level.
  const AEV = {
    gull(t, o, v) {
      const n = 2 + ((Math.random() * 2) | 0);
      for (let i = 0; i < n; i++) { const tt = t + i * rnd(0.2, 0.3), f = rnd(1700, 2200); fm(tt, o, { f, f1: f * 0.62, ft: 0.18, r: 1.5, i: 0.9, i1: 0.3, a: 0.02, d: 0.18, v: 0.05 * v, w: 'triangle' }); }
      return 0.9; },
    tweet(t, o, v) {
      const n = 3 + ((Math.random() * 4) | 0), f0 = rnd(2800, 4400);
      for (let i = 0; i < n; i++) chirp(t + i * 0.07, o, f0 * (1 + (i % 2) * 0.18), f0 * (1.3 + (i % 2) * 0.2), 0.05, 0.03 * v);
      return n * 0.07 + 0.1; },
    wave(t, o, v) {
      noise(t, o, { type: 'lp', f: 900, f1: 2600, ft: 0.8, q: 0.5, a: 0.9, d: 1.4, v: 0.08 * v });
      noise(t + 0.7, o, { type: 'hp', f: 3000, a: 0.2, d: 1.2, v: 0.03 * v });
      return 2.4; },
    ride(t, o, v) {
      noise(t, o, { type: 'bp', f: 500, f1: 1600, ft: 1.2, q: 2, a: 1.0, d: 1.2, v: 0.04 * v });
      tone(t + 0.5, o, { w: 'triangle', f: 900, f1: 1400, ft: 0.6, a: 0.25, h: 0.2, d: 0.4, v: 0.012 * v, am: [6, 0.4] });
      return 2.3; },
    chatter(t, o, v) {
      const n = 3 + ((Math.random() * 4) | 0); let x = t;
      for (let i = 0; i < n; i++) { const f = rnd(220, 480), d = rnd(0.06, 0.14); tone(x, o, { w: 'sawtooth', f, f1: f * (Math.random() < 0.5 ? 1.2 : 0.85), ft: d, a: 0.015, d, v: 0.014 * v, bp: 900, q: 1.5 }); x += d + rnd(0.03, 0.11); }
      return x - t + 0.1; },
    chime(t, o, v) {
      const sc = [0, 2, 4, 7, 9];
      for (let i = 0; i < 3; i++) bell(t + i * rnd(0.18, 0.28), o, 1568 * Math.pow(2, sc[(Math.random() * 5) | 0] / 12), 1.2, 0.02 * v);
      return 2; },
    cricket(t, o, v) { tone(t, o, { f: rnd(4200, 5100), a: 0.01, h: 0.12, d: 0.05, v: 0.02 * v, am: [32, 1] }); return 0.25; },
    twinkle(t, o, v) { const f = 2093 * Math.pow(2, [0, 2, 4, 7, 9][(Math.random() * 5) | 0] / 12); bell(t, o, f, 0.9, 0.014 * v); bell(t + 0.14, o, f * 1.5, 0.8, 0.01 * v); return 1.1; },
    drip(t, o, v) { const f = rnd(900, 1600); tone(t, o, { f, f1: f * 1.8, ft: 0.05, d: 0.12, v: 0.03 * v }); return 0.2; },
    gust(t, o, v) { noise(t, o, { type: 'bp', f: 400, f1: 1300, ft: 1.4, q: 1.4, a: 1.1, d: 1.4, v: 0.05 * v }); return 2.6; },
    tick(t, o, v) { for (let i = 0; i < 3; i++) noise(t + i * 0.05, o, { type: 'bp', f: 3600, q: 4, d: 0.01, v: 0.025 * v }); return 0.25; },
    clank(t, o, v) {
      const f = rnd(600, 1500);
      fm(t, o, { f, r: rnd(2.76, 3.2), i: 2.5, i1: 0.05, d: 0.35, v: 0.025 * v });
      noise(t, o, { type: 'bp', f: 1800, q: 1.5, d: 0.02, v: 0.04 * v });
      if (Math.random() < 0.5) fm(t + rnd(0.1, 0.2), o, { f: f * 1.3, r: 2.9, i: 2, i1: 0.05, d: 0.25, v: 0.015 * v });
      return 0.6; },
    rattle(t, o, v) { for (let i = 0; i < 6; i++) noise(t + i * 0.09, o, { type: 'bp', f: 1100 + (i % 2) * 500, q: 4, d: 0.025, v: 0.03 * v }); return 0.65; },
    steam(t, o, v) { noise(t, o, { type: 'hp', f: 2500, a: 0.05, h: 0.25, d: 0.5, v: 0.03 * v }); return 0.85; },
    cheer(t, o, v) {
      noise(t, o, { type: 'bp', f: 900, f1: 1300, ft: 0.8, q: 1.6, a: 0.35, h: 0.3, d: 0.9, v: 0.05 * v });
      noise(t, o, { type: 'bp', f: 2200, q: 2, a: 0.35, h: 0.3, d: 0.8, v: 0.02 * v });
      return 1.7; },
    ding(t, o, v) { bell(t, o, 1319, 0.6, 0.02 * v); return 0.7; },
  };
  let amb = null, wantAmb = null;
  function ambStart(id, lv) {
    const D = AMB[id];
    if (!D || !ctx) return;
    const t = ctx.currentTime, lite = !!(G.R && G.R.qualityName && G.R.qualityName() === 'low');
    const out = GN(0), k = dbg(D.g || 0); out.connect(ambBus);
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(clamp(lv || 1, 0, 2) * k, t + 2.2);
    const live = { id, lv: lv || 1, k, out, srcs: [], evs: [], evNodes: [] };
    const nb = lite ? Math.min(2, D.bed.length) : D.bed.length;
    for (let i = 0; i < nb; i++) ambLayer(D.bed[i], out, live, t);
    for (const E of D.ev) if (!lite || E.lite) live.evs.push({ E, next: t + rnd(0.8, E.every[1] * 0.6), k: lite ? 1.5 : 1 });
    amb = live;
  }
  function ambLayer(L, out, live, t) {
    for (let side = -1; side <= 1; side += 2) {
      let src, head, tail;
      if (L.tone) {
        const f = L.tone[(side + 1) / 2 % L.tone.length], f2 = L.tone[2] || null, g = GN(L.v);
        src = OSC('sine', f * (1 + side * 0.002)); src.connect(g); head = g; live.srcs.push(src);
        if (side > 0 && f2) { const o2 = OSC('sine', f2); o2.connect(g); live.srcs.push(o2); }
      } else {
        src = NZ(); src.playbackRate.value = rnd(0.94, 1.06);
        const fl = BQ(FT[L.n], L.f * (1 + side * 0.04), L.q || 0.7), g = GN(L.v * 0.6);
        src.connect(fl); fl.connect(g); head = g;
        if (L.sw) { const l = OSC('sine', L.sw[0] * (1 + side * 0.17)), lg = GN(L.sw[1]); l.connect(lg); lg.connect(fl.frequency); live.srcs.push(l); }
        live.srcs.push(src);
      }
      tail = head;
      if (L.am) { const tg = GN(1 - L.am[1] * 0.5), l = OSC('sine', L.am[0] * (1 + side * 0.13)), lg = GN(L.am[1] * 0.5); l.connect(lg); lg.connect(tg.gain); tail.connect(tg); tail = tg; live.srcs.push(l); }
      if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = side * (L.w === undefined ? 0.5 : L.w); tail.connect(pn); tail = pn; }
      tail.connect(out);
    }
    for (const s of live.srcs) if (!s._on) { s._on = 1; s.start(t, s.buffer ? Math.random() * 3 : 0); }
  }
  function ambEvent(live, E, t) {
    const g = GN(1);
    let tail = g;
    if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = (Math.random() * 2 - 1) * (E.pan || 0.6); g.connect(pn); tail = pn; }
    tail.connect(live.out);
    let d = 1;
    try { d = AEV[E.fn](t, g, E.v || 1) || 1; } catch (e) { warnOnce('amb:' + E.fn, 'ambience event failed: ' + e.message); }
    live.evNodes.push({ g, tail, end: t + d + 0.3 });
  }
  function ambStop(t, fade) {
    if (!amb) return;
    const live = amb; amb = null;
    const P = live.out.gain;
    holdP(P, t); P.linearRampToValueAtTime(0, t + fade);
    for (const s of live.srcs) { try { s.stop(t + fade + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { live.out.disconnect(); } catch (e) { /* gone */ } }, (fade + 0.4) * 1000);
  }
  function ambTick(now) {
    const live = amb; if (!live) return;
    for (let i = 0; i < live.evs.length; i++) {
      const s = live.evs[i];
      if (now >= s.next) { ambEvent(live, s.E, now + 0.02); s.next = now + rnd(s.E.every[0], s.E.every[1]) * s.k; }
    }
    for (let i = live.evNodes.length - 1; i >= 0; i--) {
      const n = live.evNodes[i];
      if (n.end < now) { live.evNodes.splice(i, 1); try { n.tail.disconnect(); if (n.tail !== n.g) n.g.disconnect(); } catch (e) { /* gone */ } }
    }
  }
  function autoAmbient(id) {
    switch (id) {
      case 'title': return ['fizzport', 0.55];
      case 'hub': return ['fizzport', 1];
      case 'expedition': return [biomeNow() || 'shoals', 1];
      case 'boss': return [biomeNow() || 'mesas', 0.7];
      case 'defense': return ['plaza', 1];
      case 'turf': return ['arena', 1];
      case 'royale': return ['island', 1];
      case 'race': return [biomeNow() || 'shoals', 0.45];
      case 'training': return ['range', 1];
    }
    return [null, 0];
  }

  // ---------------------------------------------------------------- music: instruments
  const ksCache = new Map();
  // Karplus-Strong pluck rendered once per MIDI note at 22.05 kHz; playbackRate corrects the integer-delay tuning.
  function ksBuf(m) {
    let k = ksCache.get(m); if (k) return k;
    const sr = 22050, f = mtof(m), N = Math.max(2, Math.round(sr / f - 0.5)), len = Math.floor(sr * 1.1);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), ring = new Float32Array(N);
    let last = 0;
    for (let i = 0; i < N; i++) { last = last * 0.4 + (Math.random() * 2 - 1) * 0.6; ring[i] = last; }
    // one averaging pass before output (what the loop does every period anyway): the first period is no longer raw
    // noise at this buffer's Nyquist, which played back as single-sample spikes up to ~0.17 (gritty attack)
    const r0 = ring[0];
    for (let i = 0; i < N; i++) ring[i] = (ring[i] + (i + 1 < N ? ring[i + 1] : r0)) * 0.5;
    const damp = Math.pow(0.5, 1 / (f * 0.45));
    for (let i = 0, p = 0; i < len; i++) {
      const nx = p + 1 === N ? 0 : p + 1, v = ring[p];
      d[i] = v; ring[p] = (v + ring[nx]) * 0.5 * damp; p = nx;
    }
    const fi = 40;                                   // ~2 ms fade-in: the pluck keeps its bite without a step click
    for (let i = 0; i < fi; i++) d[i] *= i / fi;
    const fl = Math.floor(sr * 0.08);
    for (let i = 0; i < fl; i++) d[len - 1 - i] *= i / fl;
    k = { b, r: f / (sr / (N + 0.5)) };
    ksCache.set(m, k);
    return k;
  }
  function vib(os, t, dur) {
    if (dur < 0.32) return;
    const P = os.detune; let x = t + 0.18, s = 1;
    P.setValueAtTime(0, x);
    while (x < t + dur) { x += 0.083; P.linearRampToValueAtTime(12 * s, x); s = -s; }
  }
  function mVoice(kind, t, m, dur, v, out) {
    const f = mtof(m);
    switch (kind) {
      case 'ks': { const k = ksBuf(m), s = ctx.createBufferSource(), g = GN(0.4 * v); s.buffer = k.b; s.playbackRate.value = k.r; s.connect(g); g.connect(out); s.start(t); break; }
      case 'pluck': tone(t, out, { w: 'sawtooth', f, a: 0.003, d: 0.28, v: 0.11 * v, lp: Math.min(9000, f * 7), ff1: Math.max(250, f * 1.2), fft: 0.18, q: 2 }); break;
      case 'square': vib(tone(t, out, { w: 'square', f, a: 0.01, h: dur - 0.08, d: 0.12, v: 0.055 * v, lp: 2600, q: 0.8 }), t, dur); break;
      case 'saw':
        vib(tone(t, out, { w: 'sawtooth', f, det: -9, a: 0.01, h: dur - 0.06, d: 0.12, v: 0.045 * v, lp: 3200 }), t, dur);
        tone(t, out, { w: 'sawtooth', f, det: 9, a: 0.01, h: dur - 0.06, d: 0.12, v: 0.045 * v, lp: 3200 });
        break;
      case 'brass': brass(t, out, f, Math.max(0.12, dur), 0.055 * v); break;
      case 'tri': vib(tone(t, out, { w: 'triangle', f, a: 0.012, h: dur - 0.1, d: 0.15, v: 0.15 * v }), t, dur); break;
      case 'bell': bell(t, out, f, 0.7, 0.06 * v); break;
    }
  }
  function mBass(kind, t, m, dur, v, out) {
    const f = mtof(m), h = Math.max(0, dur * 0.7 - 0.02), d = Math.max(0.06, dur * 0.4);
    if (kind === 'round') {
      tone(t, out, { w: 'triangle', f, a: 0.006, h, d, v: 0.26 * v });
      tone(t, out, { w: 'sawtooth', f, a: 0.006, h, d, v: 0.05 * v, lp: f * 4 });
      return;
    }
    tone(t, out, { w: kind === 'square' ? 'square' : 'sawtooth', f, a: 0.005, h, d, v: (kind === 'square' ? 0.1 : 0.13) * v, lp: Math.min(4000, f * 9), ff1: f * 2.2, fft: 0.14, q: 4 });
    tone(t, out, { f, a: 0.005, h, d, v: 0.16 * v });
  }
  function mPad(t, notes, dur, v, out) {
    const lp = BQ('lowpass', 900, 0.7), g = GN(0), end = t + dur + 0.5;
    lp.frequency.setValueAtTime(800, t); lp.frequency.linearRampToValueAtTime(1500, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03 * v, t + 0.35);
    g.gain.setValueAtTime(0.03 * v, t + dur); g.gain.linearRampToValueAtTime(0, end);
    for (const n of notes) for (let i = 0; i < 2; i++) { const os = OSC('sawtooth', mtof(n)); os.detune.value = i ? 9 : -9; os.connect(lp); run(os, t, end + 0.02); }
    lp.connect(g); g.connect(out);
  }
  function mStab(t, notes, dur, v, out) {
    const lp = filt('lowpass', 3200, 2, t, 700, 0.14), g = envG(t, 0.004, 0.035 * v, 0.12, Math.min(0.1, dur * 0.3));
    for (const n of notes) { const os = OSC('square', mtof(n)); os.connect(lp); run(os, t, t + 0.3); }
    lp.connect(g); g.connect(out);
  }
  // Stems: drums (k s c t cr) -> hot, lead / stabs / doubles -> hotFx (both follow intensity on layered tracks);
  // pad, bass, hats and arps stay in the base stem.
  function playEv(tr, e, t, sd) {
    const T = tr.T, v = e[3], dur = e[2] * sd, base = tr.base, hot = tr.hot;
    switch (e[0]) {
      case 'k':
        tone(t, hot, { f: 170, f1: 42, ft: 0.11, a: 0.001, d: 0.28, v: 0.36 * v });
        tone(t, hot, { w: 'triangle', f: 280, f1: 110, ft: 0.03, d: 0.04, v: 0.11 * v });
        noise(t, hot, { type: 'bp', f: 3000, q: 0.8, d: 0.008, v: 0.07 * v });      // beater click (phone speakers)
        break;
      case 's': noise(t, hot, { type: 'bp', f: 1900, q: 0.8, d: 0.13, v: 0.26 * v }); tone(t, hot, { w: 'triangle', f: 200, f1: 160, ft: 0.06, d: 0.07, v: 0.14 * v }); break;
      case 'c': for (let i = 0; i < 3; i++) noise(t + i * 0.011, hot, { type: 'bp', f: 1200, q: 1.5, d: i === 2 ? 0.12 : 0.01, v: 0.18 * v }); break;
      case 'h': noise(t, base, { type: 'hp', f: 6500, cut: 9500, d: 0.03, v: 0.1 * v }); break;     // cymbals band-limited: no
      case 'o': noise(t, base, { type: 'hp', f: 5500, cut: 9000, d: 0.16, v: 0.065 * v }); break;  // near-Nyquist sizzle
      case 'p': tone(t, base, { w: 'triangle', f: 1250, d: 0.035, v: 0.09 * v }); break;
      case 't': { const k = [1, 0.84, 0.7, 0.6][e[1]] || 1; tone(t, hot, { f: 210 * k, f1: 120 * k, ft: 0.16, d: 0.2, v: 0.26 * v }); break; }
      case 'cr': noise(t, hot, { type: 'hp', f: 4000, cut: 8500, d: 1.0, v: 0.065 * v }); break;
      case 'bass': mBass(T.bi || 'saw', t, e[1], dur, v, base); break;
      case 'pad': mPad(t, e[1], dur, v, base); break;
      case 'stab': mStab(t, e[1], dur, v, tr.hotFx); break;
      case 'lead': mVoice(T.li || 'square', t, e[1], dur, v, tr.hotFx); break;
      case 'arp': mVoice(T.ai || 'pluck', t, e[1], dur, v * 0.6, tr.fx); break;
      case 'dbl': mVoice(T.li === 'bell' ? 'ks' : 'bell', t, e[1], dur, v, tr.hotFx); break;
    }
  }

  // ---------------------------------------------------------------- music: composition
  const SC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], harm: [0, 2, 3, 5, 7, 8, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
  const PENT = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };
  // Drum kits: k kick, s snare, c clap, h hat, o open hat, p woodblock. 'x' full, 'o' soft.
  const DK = {
    heroic: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    hub: { k: 'x.......x.....x.', s: '....o.......o...', h: '..o...o...o...o.', p: '.......x.......x' },
    groove: { k: 'x..x..x...x.....', s: '....x.......x..o', h: 'x.x.x.xxx.x.x.xx' },
    boss: { k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'xoxoxoxoxoxoxoxo' },
    synth: { k: 'x...x...x...x...', s: '....x.......x...', c: '....x.......x...', h: 'x...x...x...x...', o: '..x...x...x...x.' },
    funk: { k: 'x..x......x..x..', s: '....x..o.o..x...', h: 'x.xxx.xxx.xxx.x.', o: '..............x.' },
    tenseA: { k: 'x.......x.......', h: '..o...o...o...o.' },
    tense: { k: 'x.....x...x.....', s: '........x.......', h: '..x...x...x...x.' },
    build: { k: 'x...x...x...x...', s: '....x.......x...', c: '....x.......x...', h: 'xoxoxoxoxoxoxoxo' },
    marchA: { k: 'x...x...x...x...', s: '....x.......x.oo', h: '..x...x...x...x.' },
    march: { k: 'x...x...x...x...', s: 'x..ox..ox..ox.oo', h: '..x...x...x...x.' },
    light: { k: 'x.......x.......', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' },
    results: { k: 'x...x...x...x...', s: '....x.......x...', c: '....x.......x...', h: '..x...x...x...x.' },
    // biome kits (expedition variants)
    breezy: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', p: '......x.......x.' },
    shuffle: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.xx.xx.xx.xx.x.', p: '..x.......x.....' },
    night: { k: 'x.......x.......', s: '........o.......', h: '..o...o...o...o.', p: '....x.......x.x.' },
    sleigh: { k: 'x.......x...x...', s: '....x.......x...', h: 'oooooooooooooooo' },
    junkfunk: { k: 'x..x..x...x..x..', s: '....x.......x...', h: 'x.xxx.xxx.xxx.x.', p: '..x.....x.x.....' },
  };
  // Track: bpm, root (MIDI tonic), mode, pent (pentatonic melody), swing, seed, li/ai/bi (lead/arp/bass instrument),
  // mo (melody register offset in semitones, default 12), po (pad octave), lv (level, normalized to ~-21 LUFS-I raw),
  // rh: two 16-step lead rhythms ('x' note, '-' hold), sec: sections (ch = chord degree per bar, [a,b] = half bars;
  // k drum kit, b bass ('1' root '3' '5' '8' octave '7' b7), a arp (digits = chord tones), st stabs, l lead motif set
  // A/B/C, pad, fill), form: section order ('+' = variation: doubled lead + 16th hats), loop: form index the repeat
  // starts from (skips intros), layers: drums + lead follow combat intensity. Forms run 16-32 bars.
  const TRACKS = {
    title: { bpm: 112, root: 62, mo: 7, mode: 'major', seed: 3, li: 'brass', ai: 'bell', bi: 'saw', lv: 1.15, loop: 1,
      rh: ['x---x.x.x---x-..', 'x.x.x-x-x---x...'],
      sec: {
        I: { ch: [0, 5, 3, 4], pad: 1, a: '0.2.4.2.3.2.4.2.' },
        A: { ch: [0, 4, 5, 3], pad: 1, k: 'heroic', b: '1..1..1.1..1..5.', a: '0.1.2.3.2.1.2.3.', l: 'A' },
        B: { ch: [3, 4, [5, 2], 4], pad: 1, k: 'heroic', b: '1.1.1.1.1.1.1.1.', a: '2.1.0.1.2.1.0.1.', l: 'B', fill: 1 },
        C: { ch: [5, 3, 0, 4], pad: 1, k: 'light', b: '1...5...1...5...', a: '0.2.1.2.0.2.1.2.', l: 'C', fill: 1 },
      }, form: ['I', 'A', 'B', 'A+', 'C', 'B+'] },
    hub: { bpm: 96, root: 55, mode: 'major', pent: 1, swing: 0.14, seed: 11, li: 'ks', ai: 'ks', bi: 'round', lv: 0.62,
      rh: ['x..x..x.x-..x...', 'x.x...x.x.x.x-..'],
      sec: {
        A: { ch: [0, 5, 3, 4], pad: 1, k: 'hub', b: '1-----5-1---5---', a: '0..2..1.3..2..1.', l: 'A' },
        B: { ch: [3, 0, [1, 4], 0], pad: 1, k: 'hub', b: '1---5---1---5-3-', a: '0.2.1.2.0.2.1.2.', l: 'B', fill: 1 },
        C: { ch: [5, 3, [1, 4], 0], pad: 1, k: 'hub', b: '1-----5-1---5---', a: '2..1..0.2..1..0.', l: 'C' },
      }, form: ['A', 'A+', 'B', 'A', 'C', 'B'] },
    expedition: { bpm: 118, root: 57, mode: 'dorian', seed: 21, li: 'square', ai: 'pluck', bi: 'saw', lv: 0.95, layers: 1,
      rh: ['x.x.x-..x.x.x---', 'x--x--x-x.x.x...'],
      sec: {
        A: { ch: [0, 6, 3, 0], pad: 1, k: 'groove', b: '1..1..8.1..1.5.8', a: '0.12.0.12.0.12.0', l: 'A' },
        B: { ch: [2, 6, 3, 4], pad: 1, k: 'groove', b: '1.1.8.1.1.1.8.5.', a: '0.2.1.2.0.2.1.2.', st: '..x...x...x...x.', l: 'B', fill: 1 },
        C: { ch: [2, 6, 3, [4, 3]], pad: 1, k: 'light', b: '1...5...1...8...', a: '0.1.2.1.0.1.2.1.', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    // expedition per biome (picked by music('expedition') from the mission's biome)
    exp_shoals: { bpm: 116, root: 55, mode: 'major', pent: 1, swing: 0.08, seed: 23, li: 'ks', ai: 'pluck', bi: 'round', lv: 0.93, layers: 1,
      rh: ['x.x.x-..x.x.x---', 'x..x..x.x-x.x...'],
      sec: {
        A: { ch: [0, 4, 5, 3], pad: 1, k: 'breezy', b: '1..1..8.1..1.5.8', a: '0.12.0.12.0.12.0', l: 'A' },
        B: { ch: [3, 0, [1, 4], 0], pad: 1, k: 'breezy', b: '1.1.8.1.1.1.8.5.', a: '0.2.1.2.0.2.1.2.', l: 'B', fill: 1 },
        C: { ch: [5, 3, 0, 4], pad: 1, k: 'light', b: '1...5...1...5...', a: '2.1.0.1.2.1.0.1.', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    exp_mesas: { bpm: 104, root: 52, mode: 'mixo', swing: 0.16, seed: 25, li: 'square', ai: 'ks', bi: 'saw', lv: 0.98, layers: 1,
      rh: ['x..x..x.x---x...', 'x.x.x-..x..x.x--'],
      sec: {
        A: { ch: [0, 6, 3, 0], pad: 1, k: 'shuffle', b: '1..5..8.1..5..8.', a: '0.1.2.1.0.1.2.1.', l: 'A' },
        B: { ch: [3, 6, 0, [4, 6]], pad: 1, k: 'shuffle', b: '1.1.5.1.1.1.5.8.', st: '..x...x...x...x.', l: 'B', fill: 1 },
        C: { ch: [1, 3, 6, 0], pad: 1, k: 'light', b: '1...5...1...5...', a: '0.2.1.2.0.2.1.2.', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    exp_grotto: { bpm: 96, root: 59, mode: 'dorian', swing: 0.1, seed: 27, li: 'bell', ai: 'ks', bi: 'round', lv: 0.72, layers: 1,
      rh: ['x..x..x.x-......', 'x.x.x...x..x.x..'],
      sec: {
        A: { ch: [0, 3, 0, 6], pad: 1, k: 'night', b: '1-----5-1---5---', a: '0.2.4.2.0.2.4.2.', l: 'A' },
        B: { ch: [2, 6, 3, 4], pad: 1, k: 'night', b: '1---5---1---5-8-', a: '0.1.2.3.4.3.2.1.', l: 'B', fill: 1 },
        C: { ch: [6, 2, 3, 0], pad: 1, k: 'light', b: '1-----5-1-----5-', a: '4.2.0.2.4.2.0.2.', l: 'C' },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    exp_frost: { bpm: 112, root: 64, mo: 0, po: -1, mode: 'major', pent: 1, seed: 33, li: 'tri', ai: 'bell', bi: 'round', lv: 0.87, layers: 1,
      rh: ['x.x.x---x.x.x---', 'x..x..x.x.x.x-..'],
      sec: {
        A: { ch: [0, 5, 3, 4], pad: 1, k: 'sleigh', b: '1...5...1...5...', a: '0.1.2.3.4.3.2.1.', l: 'A' },
        B: { ch: [3, 4, 0, [5, 4]], pad: 1, k: 'sleigh', b: '1.1.5...1.1.5...', a: '4.3.2.1.0.1.2.3.', l: 'B', fill: 1 },
        C: { ch: [5, 3, 1, 4], pad: 1, k: 'light', b: '1-------5-------', a: '0...2...4...2...', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    exp_junk: { bpm: 120, root: 48, mode: 'dorian', swing: 0.06, seed: 29, li: 'square', ai: 'pluck', bi: 'square', lv: 0.9, layers: 1,
      rh: ['x.x..x.x..x.x...', '..x.x..x.x.x..x.'],
      sec: {
        A: { ch: [0, 3, 0, 3], k: 'junkfunk', b: '1..1.8..1.5..8.5', st: '..x...x...x...x.', l: 'A' },
        B: { ch: [2, 3, 4, 6], pad: 1, k: 'junkfunk', b: '1.1..1.81..1.5.8', st: 'x..x..x...x..x..', a: '0.2.1.2.0.2.1.2.', l: 'B', fill: 1 },
        C: { ch: [6, 3, 2, 4], pad: 1, k: 'build', b: '1.1.1.1.1.1.1.1.', a: '0234023402340234', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    boss: { bpm: 140, root: 50, mode: 'harm', seed: 31, li: 'saw', ai: 'pluck', bi: 'saw', lv: 0.84,
      rh: ['x.xx.x.xx-x-x-x.', 'x---x---x.x.x.xx'],
      sec: {
        A: { ch: [0, 5, 3, 4], pad: 1, k: 'boss', b: '1.11.11.1.11.11.', a: '0120312003120312', st: 'x.....x.....x...', l: 'A' },
        B: { ch: [0, 0, 5, 4], pad: 1, k: 'boss', b: '1.11.11.1.11.11.', st: 'x..x..x.x..x..x.', l: 'B', fill: 1 },
        C: { ch: [5, 4, 3, 4], pad: 1, k: 'build', b: '1111111111111111', st: 'x.x.x.x.x.x.x.x.', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'A+', 'B+', 'C', 'B+'] },
    race: { bpm: 150, root: 57, mode: 'minor', seed: 41, li: 'saw', ai: 'pluck', bi: 'square', lv: 0.67,
      rh: ['x-.x-.x-x-.x-.x.', 'x---x---x-x-x---'],
      sec: {
        A: { ch: [0, 5, 2, 6], pad: 1, k: 'synth', b: '1818181818181818', a: '0234023402340234' },
        B: { ch: [0, 5, 2, 6], pad: 1, k: 'synth', b: '1818181818181818', a: '0234023402340234', l: 'A' },
        C: { ch: [3, 0, 5, 6], pad: 1, k: 'synth', b: '1818181818181818', a: '3210321032103210', l: 'B', fill: 1 },
        D: { ch: [5, 6, 3, 4], pad: 1, k: 'build', b: '1818181818181818', a: '0234023402340234', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'C', 'B+', 'D', 'C+'] },
    // race variants (picked per course theme by 23_race.js): D dorian drive, C major "hero lap"
    race_b: { bpm: 156, root: 62, mo: 0, mode: 'dorian', seed: 43, li: 'square', ai: 'pluck', bi: 'saw', lv: 0.8, loop: 1,
      rh: ['x.x-x.x-x.x.x---', 'x--x--x-x-x-x...'],
      sec: {
        A: { ch: [0, 3, 6, 3], pad: 1, k: 'synth', b: '1.8.1.8.1.8.1.8.', a: '0.2.1.2.0.2.1.2.' },
        B: { ch: [0, 3, 6, 4], pad: 1, k: 'synth', b: '1818181818181818', a: '0234023402340234', l: 'A' },
        C: { ch: [5, 6, 0, [3, 4]], pad: 1, k: 'build', b: '1818181818181818', a: '4321432143214321', l: 'B', fill: 1 },
        D: { ch: [2, 6, 3, 3], pad: 1, k: 'synth', b: '1.8.1.8.1.8.1.8.', a: '0.2.1.2.0.2.1.2.', l: 'C' },
      }, form: ['A', 'B', 'C', 'B+', 'D', 'C+'] },
    race_c: { bpm: 146, root: 60, mo: 7, mode: 'major', seed: 47, li: 'brass', ai: 'pluck', bi: 'square', lv: 0.76, loop: 1,
      rh: ['x-.x-.x-x.x.x-..', 'x.x.x---x.x.x---'],
      sec: {
        A: { ch: [0, 4, 5, 3], pad: 1, k: 'heroic', b: '1.1.8.1.1.1.8.5.', a: '0.1.2.1.0.1.2.1.', l: 'A' },
        B: { ch: [3, 4, [5, 2], 4], pad: 1, k: 'synth', b: '1818181818181818', a: '0234023402340234', l: 'B', fill: 1 },
        C: { ch: [5, 3, 0, 4], pad: 1, k: 'synth', b: '1818181818181818', a: '0234023402340234', l: 'C', fill: 1 },
      }, form: ['A', 'A+', 'B', 'A', 'C', 'B+'] },
    turf: { bpm: 128, root: 52, mode: 'dorian', swing: 0.08, seed: 51, li: 'square', ai: 'pluck', bi: 'saw', lv: 1.0,
      rh: ['x.x..x.x..x.x...', '..x.x..x.x.x..x.'],
      sec: {
        A: { ch: [0, 3, 0, 3], k: 'funk', b: '1..1.8..1.5..8.5', st: '..x...x...x...x.', l: 'A' },
        B: { ch: [2, 3, 4, 6], pad: 1, k: 'funk', b: '1.1..1.81..1.5.8', st: 'x..x..x...x..x..', l: 'B', fill: 1 },
        C: { ch: [2, 6, 3, 4], pad: 1, k: 'funk', b: '1..1.8..1.5..8.5', a: '0.2.1.2.0.2.1.2.', l: 'C', fill: 1 },
      }, form: ['A', 'A+', 'B', 'A', 'C', 'B+'] },
    royale: { bpm: 124, root: 59, po: -1, mo: 0, mode: 'minor', seed: 61, li: 'saw', ai: 'pluck', bi: 'saw', lv: 0.88, loop: 2,
      rh: ['x---..x.x---..x.', 'x.x.x.x.x---x---'],
      sec: {
        A: { ch: [0, 0, 5, 5], pad: 1, k: 'tenseA', b: '1.1.1.1.1.1.1.1.' },
        B: { ch: [0, 5, 3, 4], pad: 1, k: 'tense', b: '1.1.1.1.1.1.1.1.', a: '0.1.2.1.0.1.2.1.' },
        C: { ch: [0, 5, 3, 4], pad: 1, k: 'build', b: '1111111111111111', a: '0121012101210121', l: 'A', fill: 1 },
        D: { ch: [5, 6, 0, [0, 4]], pad: 1, k: 'build', b: '1111111111111111', a: '0121012101210121', l: 'B', fill: 1 },
      }, form: ['A', 'B', 'C', 'D', 'B', 'C+', 'D+'] },
    defense: { bpm: 132, root: 60, po: -1, mode: 'harm', seed: 71, li: 'brass', ai: 'pluck', bi: 'saw', lv: 0.92, layers: 1,
      rh: ['x--.x.x-x--.x.x.', 'x.x.x.x.x---x---'],
      sec: {
        A: { ch: [0, 5, 3, 4], pad: 1, k: 'marchA', b: '1...5...1...5...', st: 'x.......x.......', l: 'A' },
        B: { ch: [5, 3, 4, 4], pad: 1, k: 'march', b: '1.1.5.5.1.1.5.5.', a: '0.1.2.1.0.1.2.1.', l: 'B', fill: 1 },
        C: { ch: [3, 5, 4, 4], pad: 1, k: 'marchA', b: '1...5...1...5...', a: '0.1.2.1.0.1.2.1.', l: 'C', fill: 1 },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    training: { bpm: 110, root: 65, po: -1, mode: 'major', pent: 1, seed: 81, li: 'tri', ai: 'ks', bi: 'round', lv: 1.05,
      rh: ['x.x.x...x.x.x...', 'x..x..x.x---....'],
      sec: {
        A: { ch: [0, 3, 4, 0], pad: 1, k: 'light', b: '1...5...1.1.5...', a: '0.1.2.1.0.1.2.1.', l: 'A' },
        B: { ch: [5, 3, 1, 4], pad: 1, k: 'light', b: '1...5...1...5...', a: '2.1.0.1.2.1.0.1.', l: 'B' },
        C: { ch: [3, 4, 5, 4], pad: 1, k: 'light', b: '1...5...1.1.5...', a: '2.1.0.1.2.1.0.1.', l: 'C' },
      }, form: ['A', 'B', 'A+', 'B', 'C', 'B+'] },
    results: { bpm: 120, root: 60, mode: 'major', pent: 1, swing: 0.06, seed: 91, li: 'ks', ai: 'bell', bi: 'round', lv: 0.98,
      rh: ['x.x.x.x.x---x...', 'x.xx.x..x.x.x---'],
      sec: {
        A: { ch: [0, 3, 4, 0], pad: 1, k: 'results', b: '1...5...1...5...', a: '0.1.2.3.4.3.2.1.', l: 'A' },
        B: { ch: [3, 4, [2, 5], [1, 4]], pad: 1, k: 'results', b: '1...5...1...5.8.', a: '0.1.2.3.4.3.2.1.', l: 'B' },
      }, form: ['A', 'B', 'A+', 'B+'] },
    // softer results after a lost run (same tune, light drums): picked by music('results') right after a loss
    results_soft: { bpm: 112, root: 60, mode: 'major', pent: 1, swing: 0.08, seed: 91, li: 'ks', ai: 'bell', bi: 'round', lv: 1.08,
      rh: ['x.x.x.x.x---x...', 'x.xx.x..x.x.x---'],
      sec: {
        A: { ch: [0, 3, 4, 0], pad: 1, k: 'light', b: '1...5...1...5...', a: '0.1.2.3.4.3.2.1.', l: 'A' },
        B: { ch: [3, 4, [2, 5], [1, 4]], pad: 1, k: 'light', b: '1...5...1...5.8.', a: '0.1.2.3.4.3.2.1.', l: 'B' },
      }, form: ['A', 'B', 'A+', 'B+'] },
  };
  const ALIAS = { menu: 'title', shop: 'hub', workshop: 'hub', hangar: 'hub', guild: 'hub', tutorial: 'training', result: 'results' };

  function degMidi(T, d) { const sc = SC[T.mode], o = Math.floor(d / 7); return T.root + 12 * o + sc[d - o * 7]; }
  function triad(T, d) { return [degMidi(T, d), degMidi(T, d + 2), degMidi(T, d + 4)]; }
  function padVoicing(T, d) {
    const lo = T.root - 5 + 12 * (T.po || 0);
    return triad(T, d).map(n => { while (n >= lo + 12) n -= 12; while (n < lo) n += 12; return n; }).sort((a, b) => a - b);
  }
  function eachTok(pat, fn) {
    for (let s = 0; s < 16; s++) {
      const c = pat[s]; if (!c || c === '.' || c === '-') continue;
      let len = 1; while (s + len < 16 && pat[s + len] === '-') len++;
      fn(s, len, c);
    }
  }
  function genMotif(rng, rh) {
    const out = []; let k = rng.pick([0, 2, 4]);
    for (let s = 0; s < 16; s++) {
      if (rh[s] !== 'x') continue;
      let len = 1; while (s + len < 16 && rh[s + len] === '-') len++;
      out.push({ s, d: len, k, v: s % 4 === 0 ? 1 : 0.8 });
      const r = rng();
      k += r < 0.3 ? 1 : r < 0.55 ? -1 : r < 0.7 ? 2 : r < 0.82 ? -2 : r < 0.9 ? 0 : (rng() < 0.5 ? 3 : -3);
      k = clamp(k, -2, 7);
    }
    return out;
  }
  const MOTIF_SET = { A: 'AABA', B: 'CDCD', C: 'EFEG' };
  function compose(T) {
    const rng = G.rng(T.seed || 1), minor = SC[T.mode][2] === 3;
    const ms = T.pent ? PENT[minor ? 'minor' : 'major'] : SC[T.mode];
    const lo = T.root + (T.mo === undefined ? 12 : T.mo) - 3, mid = lo + 7;
    const M = []; for (let n = lo; n <= lo + 21; n++) if (ms.indexOf(((n - T.root) % 12 + 12) % 12) >= 0) M.push(n);
    const pc = n => ((n % 12) + 12) % 12;
    const anchorOf = root => { let best = 0, bd = 99; for (let i = 0; i < M.length; i++) { const dd = Math.abs(M[i] - mid) + (pc(M[i]) === pc(root) ? 0 : 6 + Math.abs(pc(M[i]) - pc(root)) * 0.1); if (dd < bd) { bd = dd; best = i; } } return best; };
    const snap = (idx, pcs) => { for (const o of [0, -1, 1, -2, 2]) { const j = idx + o; if (j >= 0 && j < M.length && pcs.indexOf(pc(M[j])) >= 0) return j; } return idx; };
    const motifs = {}, ev = [];
    const push = (s, e) => { (ev[s] || (ev[s] = [])).push(e); };
    let bar = 0, prevFill = false, loopBar = 0;
    for (let fi = 0; fi < T.form.length; fi++) {
      if (fi === (T.loop || 0)) loopBar = bar;
      const name = T.form[fi], plus = name[name.length - 1] === '+', S = T.sec[plus ? name.slice(0, -1) : name];
      const kit = S.k ? DK[S.k] : null, nb = S.ch.length;
      for (let b = 0; b < nb; b++, bar++) {
        const base = bar * 16, chs = Array.isArray(S.ch[b]) ? S.ch[b] : [S.ch[b]], seg = 16 / chs.length;
        const chordAt = s => chs[Math.min(chs.length - 1, (s / seg) | 0)];
        const lastBar = b === nb - 1, fill = lastBar && S.fill;
        if (S.pad) chs.forEach((d, i) => push(base + i * seg, ['pad', padVoicing(T, d), seg, 1]));
        if (kit) {
          for (const k in kit) {
            const pat = kit[k];
            for (let s = 0; s < 16; s++) {
              const c = pat[s]; if (c !== 'x' && c !== 'o') continue;
              if (fill && s >= 12 && (k === 's' || k === 'k' || k === 'c')) continue;
              push(base + s, [k, 0, 1, c === 'x' ? 1 : 0.5]);
            }
          }
          if (plus) for (let s = 1; s < 16; s += 2) push(base + s, ['h', 0, 1, 0.35]);
          if (fill) for (let s = 12; s < 16; s++) push(base + s, ['t', s - 12, 1, 0.9]);
          if (b === 0 && fi > 0 && (prevFill || plus)) push(base, ['cr', 0, 1, 1]);
        }
        if (S.b) eachTok(S.b, (s, len, c) => {
          const tr = triad(T, chordAt(s));
          let r = tr[0]; while (r >= 48) r -= 12; while (r < 36) r += 12;     // C2..B2: audible on phone speakers
          const n = c === '5' ? r + tr[2] - tr[0] : c === '3' ? r + tr[1] - tr[0] : c === '8' ? r + 12 : c === '7' ? r + 10 : r;
          push(base + s, ['bass', n, len, s % 4 === 0 ? 1 : 0.85]);
        });
        if (S.a) eachTok(S.a, (s, len, c) => {
          const tr = triad(T, chordAt(s)), i = +c;
          push(base + s, ['arp', tr[i % 3] + 12 * (Math.floor(i / 3) + (T.ao === undefined ? 1 : T.ao)), len, s % 4 === 0 ? 1 : 0.8]);
        });
        if (S.st) eachTok(S.st, (s, len) => push(base + s, ['stab', padVoicing(T, chordAt(s)).map(n => n + 12), len, 1]));
        if (S.l) {
          const mk = (MOTIF_SET[S.l] || 'AABA')[b % 4];
          const m = motifs[mk] || (motifs[mk] = genMotif(rng, T.rh[(mk === 'A' || mk === 'D' || mk === 'F') ? 0 : 1]));
          for (let j = 0; j < m.length; j++) {
            const nt = m[j], tr = triad(T, chordAt(nt.s)), anchor = anchorOf(tr[0]);
            let idx = clamp(anchor + nt.k, 0, M.length - 1);
            if (lastBar && j === m.length - 1) idx = anchor;
            else if (nt.s % 4 === 0) idx = snap(idx, tr.map(pc));
            push(base + nt.s, ['lead', M[idx], nt.d, nt.v]);
            if (plus) push(base + nt.s, ['dbl', M[idx] + 12, nt.d, 0.45]);
          }
        }
      }
      prevFill = !!S.fill;
    }
    return { ev, len: bar * 16, bars: bar, loopBar, loopStep: loopBar * 16 };
  }

  // ---------------------------------------------------------------- music: transport
  let intensity = 0, intForce = null, intHold = 0, intT = 0;
  const hasDrums = T => { for (const k in T.sec) if (T.sec[k].k) return true; return false; };
  const hotLevel = tr => (tr.layered ? 0.3 + 0.7 * intensity : 1);
  // Build a track whose step 0 lands at time `at`; gain is 0 until then and ramps in over 60 ms (a clean downbeat).
  function makeTrack(id, rate, at, now) {
    const T = TRACKS[id];
    if (!T._c) T._c = compose(T);
    const ks = k => k === 'ks';
    for (const list of T._c.ev) if (list) for (const e of list) {
      if ((e[0] === 'lead' && ks(T.li)) || (e[0] === 'arp' && ks(T.ai)) || (e[0] === 'dbl' && T.li === 'bell')) ksBuf(e[1]);
    }
    const out = GN(0), base = GN(1), hot = GN(1), hotL = GN(1), hotFx = GN(1), fx = GN(1);
    const dl = ctx.createDelay(1.5), fbf = BQ('lowpass', 2400, 0.5), fb = GN(0.3), wet = GN(0.2);
    out.connect(musicBus); base.connect(out); hot.connect(out); fx.connect(base); fx.connect(dl);
    hotFx.connect(hotL); hotL.connect(out); hotL.connect(dl);
    dl.connect(fbf); fbf.connect(fb); fb.connect(dl); fbf.connect(wet); wet.connect(out);
    dl.delayTime.value = Math.min(1.4, 45 / (T.bpm * rate));       // dotted eighth
    const tr = { id, T, ev: T._c.ev, len: T._c.len, loopStep: T._c.loopStep, rate, step: 0, nextT: at, out, base, hot, hotL, hotFx, fx, dl,
      nodes: [out, base, hot, hotL, hotFx, fx, dl, fbf, fb, wet], stopAt: 0, endAt: 0, layered: !!T.layers, startAt: at };
    const hl = hotLevel(tr); hot.gain.value = hl; hotL.gain.value = hl;
    const P = out.gain;
    P.setValueAtTime(0, now); P.setValueAtTime(0, at - 0.005); P.linearRampToValueAtTime(T.lv || 1, at + 0.06);
    return tr;
  }
  function advance(tr) {
    const b = 15 / (tr.T.bpm * tr.rate), sw = tr.T.swing || 0;
    tr.nextT += b * (tr.step % 2 === 0 ? 1 + sw : 1 - sw);
    tr.step = tr.step + 1 >= tr.len ? tr.loopStep : tr.step + 1;
  }
  // Time of the first downbeat (bar start) at or after `after`, counted from the next unscheduled step.
  function nextBar(tr, after) {
    let s = tr.step, x = tr.nextT;
    const b = 15 / (tr.T.bpm * tr.rate), sw = tr.T.swing || 0;
    for (let i = 0; i < 80; i++) {
      if (s % 16 === 0 && x >= after) return x;
      x += b * (s % 2 === 0 ? 1 + sw : 1 - sw);
      s = s + 1 >= tr.len ? tr.loopStep : s + 1;
    }
    return x;
  }
  function pump(tr, now) {
    if (tr.nextT < now - 0.08) while (tr.nextT < now) advance(tr);      // main-thread stall: skip, don't burst
    const silent = muted || vol.music <= 0.001 || vol.master <= 0.001;
    const sd = 15 / (tr.T.bpm * tr.rate);
    while (tr.nextT < now + AHEAD && !(tr.endAt && tr.nextT >= tr.endAt - 0.002)) {
      const list = tr.ev[tr.step];
      if (list && !silent) for (const e of list) { try { playEv(tr, e, tr.nextT, sd); } catch (err) { warnOnce('mus', 'music event failed: ' + err.message); } }
      advance(tr);
    }
  }
  function liveTrack() { for (let i = 0; i < tracks.length; i++) if (!tracks[i].stopAt) return tracks[i]; return null; }
  function fadeOut(tr, t, f) {
    holdP(tr.out.gain, t); tr.out.gain.linearRampToValueAtTime(0, t + f);
    tr.endAt = t + f; tr.stopAt = t + f + 1.6;
  }
  // Old track plays up to its downbeat `at`, then gets out of the way in 0.3 s while the new one starts on it.
  function fadeAt(tr, t, at) {
    const P = tr.out.gain;
    holdP(P, t); P.setValueAtTime(P.value, Math.max(t, at - 0.03)); P.linearRampToValueAtTime(0, at + 0.3);
    tr.endAt = at; tr.stopAt = at + 2;
  }
  let lastResult = null;
  function resolveTrack(id) {
    if (id === 'expedition') { const b = biomeNow(); if (b && TRACKS['exp_' + b]) return 'exp_' + b; }
    if (id === 'results' && lastResult && !lastResult.win && performance.now() - lastResult.t < 30000) return 'results_soft';
    return id;
  }
  function setMusic(id, rate) {
    const t = ctx.currentTime, real = id ? resolveTrack(id) : null, live = liveTrack();
    if (live && real && live.id === real) {
      if (live.rate !== rate) { live.rate = rate; live.dl.delayTime.setTargetAtTime(Math.min(1.4, 45 / (live.T.bpm * rate)), t, 0.1); }
      stopBed(t, 0.5);
      return;
    }
    if (!real) { if (live) fadeOut(live, t, 0.8); stopBed(t, 0.6); return; }
    let at = t + 0.06, xf = false;
    if (live && !bed) { const b = nextBar(live, t + 0.06); if (b - t < 3) at = b; fadeAt(live, t, at); xf = true; }
    else if (live) fadeOut(live, t, 0.3);
    stopBed(at, 0.5);                                   // the loading bed hands over on the new downbeat
    const tr = makeTrack(real, rate, at, t);
    tracks.push(tr);
    if (xf && hasDrums(tr.T)) playEv(tr, ['cr', 0, 1, 0.8], at, 0);
    pump(tr, t);
  }
  function applyIntensity(now, up) {
    for (const tr of tracks) if (tr.layered && !tr.stopAt) {
      const lv = hotLevel(tr);
      tr.hot.gain.setTargetAtTime(lv, now, up ? 0.25 : 0.9); tr.hotL.gain.setTargetAtTime(lv, now, up ? 0.25 : 0.9);
    }
    if (ambDip) ambDip.gain.setTargetAtTime(1 - 0.35 * intensity, now, up ? 0.3 : 1);
  }
  // Combat intensity from alerted robots near the player (cheap scan every 0.4 s): 0 explore, 0.7 one, 1 two or more.
  function updateIntensity(now) {
    let want = 0;
    if (intForce !== null) want = intForce;
    else {
      const w = G.Game && G.Game.world, pl = w && w.player;
      let n = 0;
      if (w && w.actors && pl && pl.pos) {
        const px = pl.pos.x, pz = pl.pos.z, A = w.actors;
        for (let i = 0; i < A.length; i++) {
          const a = A[i];
          if (!a || !a.alive || a.team !== 1 || !a.alerted || a.isCrate || !a.pos) continue;
          const dx = a.pos.x - px, dz = a.pos.z - pz;
          if (dx * dx + dz * dz < 2500) n++;
        }
      }
      const tgt = n >= 2 ? 1 : n === 1 ? 0.7 : 0;
      if (tgt > 0) intHold = now + 5;
      want = tgt > 0 ? Math.max(tgt, now < intHold ? intensity : 0) : (now < intHold ? intensity : 0);
    }
    if (Math.abs(want - intensity) > 0.01) { const up = want > intensity; intensity = want; applyIntensity(now, up); }
  }

  // ---------------------------------------------------------------- stingers / mode transitions
  // Pre-rendered once (OfflineAudioContext) so they play from the audio thread even while a mode build blocks the
  // main thread: 'warp' = friendly rising warp + chime (~1.4 s); 'bed' = a seamless 4.8 s loading loop (pad, twinkles,
  // a soft tick) whose tail is cross-faded into its head.
  const ST = { warp: null, bed: null };
  const BED_LEN = 4.8, BED_X = 0.6, BED_LV = 0.8, WARP_LV = 0.9;
  let bed = null, leaving = null;
  function warpSynth(t, o) {
    noise(t, o, { type: 'bp', f: 300, f1: 4200, ft: 0.45, q: 1.6, a: 0.12, h: 0.1, d: 0.35, v: 0.2 });
    fm(t, o, { f: 260, f1: 1560, ft: 0.42, r: 1.5, i: 1.6, i1: 0.3, a: 0.05, h: 0.12, d: 0.3, v: 0.09 });
    tone(t, o, { w: 'triangle', f: 130, f1: 520, ft: 0.42, a: 0.05, h: 0.1, d: 0.3, v: 0.12 });
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(t + 0.08 + i * 0.05, o, { w: 'triangle', f: 523 * Math.pow(2, s / 12), d: 0.18, v: 0.07 }));
    [1047, 1319, 1568, 2093].forEach((f, i) => bell(t + 0.48 + i * 0.012, o, f, 0.9, 0.045));
    noise(t + 0.45, o, { type: 'hp', f: 6000, a: 0.02, d: 0.8, v: 0.03 });
    sparkle(t + 0.5, o, 1, 6);
  }
  // cycles = 2 for the offline render (the second cycle feeds the loop cross-fade); the live fallback schedules
  // more cycles from `at` straight into the real-time graph.
  function bedSynth(o, at, cycles) {
    const beat = 0.6, bars = [[60, 64, 67, 71], [57, 60, 65, 69]], z = at || 0, nc = cycles || 2;
    const lim = nc === 2 && !at ? BED_LEN + BED_X : nc * BED_LEN;
    const arp = [[72, 76, 79, 84, 79, 76, 72, 67], [69, 72, 77, 81, 77, 72, 69, 65]];
    for (let c = 0; c < nc; c++) {
      const t0 = c * BED_LEN;
      for (let b = 0; b < 2; b++) {
        const tb = t0 + b * beat * 4;
        if (tb < lim) mPad(z + tb, bars[b], beat * 4, 1.1, o);
        for (let i = 0; i < 8; i++) { const tt = tb + i * beat * 0.5; if (tt < lim) bell(z + tt, o, mtof(arp[b][i]), 0.6, i % 2 ? 0.014 : 0.022); }
        for (let i = 0; i < 4; i++) { const tt = tb + i * beat; if (tt < lim) tone(z + tt, o, { w: 'triangle', f: i ? 1250 : 1480, d: 0.035, v: i ? 0.025 : 0.035 }); }
      }
    }
  }
  function offRender(secs, build) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC || !ctx) return Promise.resolve(null);
    let off;
    try { off = new OAC(1, Math.ceil(ctx.sampleRate * secs), ctx.sampleRate); } catch (e) { return Promise.resolve(null); }
    const real = ctx;
    ctx = off;
    try { const g = off.createGain(); g.connect(off.destination); build(g); }
    catch (e) { warnOnce('off', 'offline render failed: ' + e.message); return Promise.resolve(null); }
    finally { ctx = real; }
    return new Promise(res => {
      off.oncomplete = ev => res(ev.renderedBuffer);
      let pr = null;
      try { pr = off.startRendering(); } catch (e) { res(null); return; }
      if (pr && pr.then) pr.then(res, () => res(null));
    });
  }
  function loopify(b) {
    if (!b) return null;
    const sr = b.sampleRate, n = Math.round(BED_LEN * sr), x = Math.round(BED_X * sr), src = b.getChannelData(0);
    const out = ctx.createBuffer(1, n, sr), d = out.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = src[i];
    for (let i = 0; i < x && n + i < src.length; i++) { const k = i / x; d[i] = d[i] * Math.sin(k * Math.PI / 2) + src[n + i] * Math.cos(k * Math.PI / 2); }
    return out;
  }
  function renderStingers() {
    offRender(1.6, g => warpSynth(0.02, g)).then(b => { if (b) ST.warp = b; });
    offRender(BED_LEN + BED_X + 0.8, g => bedSynth(g)).then(b => { if (b && ctx) ST.bed = loopify(b); });
  }
  function startBed(t) {
    stopBed(t, 0.05);
    const g = GN(0);
    g.connect(stingBus);
    g.gain.setValueAtTime(0, ctx.currentTime); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(BED_LV, t + 0.9);
    let s = null;
    if (ST.bed && !A._liveStingers) { s = ctx.createBufferSource(); s.buffer = ST.bed; s.loop = true; s.connect(g); s.start(t); }
    else bedSynth(g, t, 3);          // buffers not rendered yet (first seconds after unlock): schedule ~14 s live
    bed = { s, g, t };
  }
  function stopBed(t, f) {
    if (!bed) return;
    const b = bed; bed = null;
    const P = b.g.gain, now = ctx.currentTime;
    holdP(P, Math.max(now, Math.min(t, now + 3)));
    P.linearRampToValueAtTime(0, t + f);
    if (b.s) { try { b.s.stop(t + f + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { b.g.disconnect(); } catch (e) { /* gone */ } }, (t - now + f + 0.3) * 1000);
  }

  // ---------------------------------------------------------------- scheduler
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (pending && (!(G.Game && G.Game._switching) || now - pending.t > 15)) { const p = pending; pending = null; try { setMusic(p.id, p.rate); } catch (e) { warnOnce('mx', 'music error ' + e.message); } }
    for (let i = tracks.length - 1; i >= 0; i--) {
      const tr = tracks[i];
      if (tr.stopAt && now > tr.stopAt) { for (const n of tr.nodes) { try { n.disconnect(); } catch (e) { /* gone */ } } tracks.splice(i, 1); continue; }
      pump(tr, now);
    }
    if (now >= intT) { intT = now + 0.4; updateIntensity(now); }
    if (hp.on) {
      if (now - hp.last > 0.5) setLowHp(false, now);
      else if (hp.next < now + AHEAD) {
        if (hp.next > now - 0.05) { _hb.at = hp.next; _hb.vol = 0.65 + 0.35 * clamp(1 - hp.frac / 0.3, 0, 1); play('heartbeat', _hb, null); }
        hp.next = Math.max(hp.next + HB_PERIOD, now);
      }
    }
    if (amb) ambTick(now);
    if (loops.length) {
      const w = G.Game ? G.Game.world || null : null;
      for (let i = loops.length - 1; i >= 0; i--) {
        const h = loops[i]; if (!h) continue;
        if (!h.keep) { if (!h.world) h.world = w; else if (h.world !== w) { h.stop(); continue; } }
        if (!h.live) startLoop(h);
        const L = h.live;
        if (L.re) {
          if (now >= L.next) { const v = play(h.name, h.o, h.o.pos ? spatial(h.o.pos, SFX[h.name].roll, SFX[h.name].cull) : null); L.next = now + (v ? Math.max(0.08, v.dur) : 0.25); }
        } else if (h.o.pos) applyLoop(h);
      }
    }
  }

  // ---------------------------------------------------------------- context lifecycle
  function setP(P, v, t, now) {
    P.cancelScheduledValues(t);
    if (now) P.setValueAtTime(v, t);
    else { P.setValueAtTime(P.value, t); P.setTargetAtTime(v, t, 0.06); }
  }
  function applyGains(now) {
    if (!ctx) return;
    const t = ctx.currentTime, dk = ducked ? 0.4 : 1;
    setP(master.gain, muted ? 0 : curve(vol.master) * MAKEUP, t, now);
    setP(sfxBus.gain, curve(vol.sfx) * dk, t, now);
    setP(uiBus.gain, curve(vol.ui), t, now);                // menu taps stay clear while paused
    setP(musicBus.gain, curve(vol.music) * MUSIC_GAIN * dk, t, now);
    setP(ambBus.gain, curve(vol.amb) * AMB_GAIN * dk, t, now);
  }
  const isTouch = () => !!((G.input && G.input.device === 'touch') || (!G.input && G.isTouch));
  // Phone speakers roll off below ~200-300 Hz: on touch devices the music bus loses its sub-bass (saves headroom
  // for what the speaker can play); desktop keeps it, minus DC / rumble.
  function setTouch() { if (musicHP) musicHP.frequency.setTargetAtTime(isTouch() ? 105 : 28, ctx.currentTime, 0.1); }
  function iosSession() { try { const s = navigator.audioSession; if (s && s.type !== 'playback') s.type = 'playback'; } catch (e) { /* unsupported */ } }
  function create() {
    iosSession();
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
    // Safety soft clipper after the compressor: transparent below 0.8, never above 0.95 (headroom for the
    // 2x oversampling filter and phone DACs).
    limiter = ctx.createWaveShaper();
    const N = 2048, cv = new Float32Array(N), R = 1.6, K = 0.8, H = 0.15;    // curve spans input ±R (pre-scaled by 1/R)
    for (let i = 0; i < N; i++) {
      const v = (i / (N - 1) * 2 - 1) * R, a = Math.abs(v);
      cv[i] = a < K ? v : Math.sign(v) * (K + H * Math.tanh((a - K) / H));
    }
    limiter.curve = cv; limiter.oversample = '2x';
    const pre = GN(1 / R), post = GN(0.94); comp.connect(pre); pre.connect(limiter); limiter.connect(post); post.connect(ctx.destination);
    outNode = post;
    master = GN(0); master.connect(comp);
    sfxBus = GN(0); sfxBus.connect(master);
    uiBus = GN(0); uiBus.connect(master);
    ambDip = GN(1); ambDip.connect(master);
    ambBus = GN(0); ambBus.connect(ambDip);
    musicDip = GN(1); musicDip.connect(master);
    musicLP = BQ('lowpass', 20000, 0.5); musicLP.connect(musicDip);
    musicHP = BQ('highpass', isTouch() ? 105 : 28, 0.7); musicHP.connect(musicLP);
    musicBus = GN(0); musicBus.connect(musicHP);
    stingBus = GN(1); stingBus.connect(musicBus);
    const sr = ctx.sampleRate, n = Math.floor(sr * 4);       // 4 s of noise: no audible 1 Hz repetition in beds
    noiseBuf = ctx.createBuffer(1, n, sr);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // iOS: start one silent frame inside the gesture so output is fully unlocked.
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, sr); s.connect(ctx.destination); s.start(0);
    applyGains(true);
    setInterval(tick, TICK_MS);
    for (const h of loops) if (!h.live) startLoop(h);
    renderStingers();
    if (want) { const w = want; want = null; A.music(w, wantOpts); }
    if (wantAmb) { const w = wantAmb; wantAmb = null; ambStart(w[0], w[1]); }
  }
  function onVisibility() {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === 'running') settle(ctx.suspend()); }
    else if (ctx.state !== 'running') settle(ctx.resume());
  }

  // ---------------------------------------------------------------- public API
  A.init = function () {
    if (inited) return; inited = true;
    if (!AC) { console.warn('[audio] WebAudio unavailable; sound disabled'); return; }
    iosSession();
    const u = () => A.unlock();
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) window.addEventListener(ev, u, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => { if (ctx && ctx.state === 'running') settle(ctx.suspend()); });
    window.addEventListener('pageshow', onVisibility);
    if (G.bus) {
      G.bus.on('pickup', onPickup);
      G.bus.on('mode', onMode);
      G.bus.on('device', () => { if (ctx) setTouch(); });
      G.bus.on('mode-result', r => { lastResult = { win: !!(r && r.win), t: performance.now() }; });
    }
  };
  A.unlock = function () {
    if (broken) return;
    if (!ctx) {
      try { create(); } catch (e) { broken = true; ctx = null; console.warn('[audio] could not start WebAudio', e); return; }
    }
    if (ctx.state !== 'running' && !document.hidden) settle(ctx.resume());
  };
  A.sfx = function (name, opts) { try { return play(name, opts, null); } catch (e) { warnOnce('x:' + name, 'sfx error ' + e.message); return null; } };
  A.sfxAt = function (name, pos, opts) {
    try {
      const def = SFX[name];
      if (!def) return play(name, opts, null);
      if (!ctx) return null;
      const sp = spatial(pos, def.roll, def.cull);
      return sp ? play(name, opts, sp) : null;
    } catch (e) { warnOnce('x:' + name, 'sfx error ' + e.message); return null; }
  };
  A.has = id => !!(id && (SFX[id] || LOOPS[id]));
  A.loop = function (name, opts) {
    const h = {
      name, o: Object.assign({}, opts), live: null, stopped: false, world: G.Game ? G.Game.world || null : null, keep: !!(opts && opts.keep),
      set(o) { if (h.stopped || !o) return h; for (const k in o) h.o[k] = o[k]; if (h.live && ctx) applyLoop(h); return h; },
      stop(fade) { if (h.stopped) return; h.stopped = true; const i = loops.indexOf(h); if (i >= 0) loops.splice(i, 1); stopLive(h, fade); },
      get playing() { return !h.stopped; },
    };
    if (!LOOPS[name] && !SFX[name]) { warnOnce('l:' + name, 'unknown loop "' + name + '"'); h.stopped = true; return h; }
    if (broken) { h.stopped = true; return h; }
    loops.push(h);
    if (loops.length > MAX_LOOPS) loops[0].stop();
    if (ctx) { try { startLoop(h); } catch (e) { warnOnce('lx:' + name, 'loop error ' + e.message); h.stop(); } }
    return h;
  };
  A.stopLoops = function () { for (const h of loops.slice()) h.stop(); };
  A.step = function (o) {
    if (!ctx) return null;
    try {
      o = o || EMPTY;
      const sp = +o.speed || 0;
      _so.surface = o.surface || surfaceNow();
      _so.land = !!o.land;
      _so.vol = o.vol !== undefined ? +o.vol || 0 : (o.land ? 0.8 : 0.62 + 0.38 * Math.min(1, sp / 7.5));
      _so.pan = +o.pan || 0;
      _so.pitch = (o.sprint ? 1.05 : 1) * (+o.pitch || 1);
      return play('step', _so, null);
    } catch (e) { warnOnce('step', 'step error ' + e.message); return null; }
  };
  A.land = function (speed) {
    if (!ctx) return null;
    try {
      const sp = Math.abs(+speed || 0);
      if (sp < 4) return A.step({ land: true, vol: 0.55 + sp * 0.06 });
      _lo.surface = surfaceNow();
      _lo.vol = clamp(0.55 + (sp - 6) * 0.045, 0.5, 1.25);
      _lo.pitch = clamp(1.12 - sp * 0.015, 0.8, 1.1);
      return play('land', _lo, null);
    } catch (e) { warnOnce('land', 'land error ' + e.message); return null; }
  };
  A.vitals = function (f, alive) {
    if (!ctx) return;
    const now = ctx.currentTime;
    hp.last = now; hp.frac = +f || 0;
    const low = !!alive && hp.frac > 0 && hp.frac < (hp.on ? 0.33 : 0.3);
    if (low !== hp.on) setLowHp(low, now);
  };
  A.music = function (id, opts) {
    if (id && !TRACKS[id] && ALIAS[id]) id = ALIAS[id];
    if (id && !TRACKS[id]) { warnOnce('m:' + id, 'unknown music track "' + id + '"'); id = null; }
    const rate = opts && opts.rate > 0 ? clamp(+opts.rate, 0.5, 2) : 1;
    if (!ctx) { want = id; wantOpts = opts; trackId = id; return; }
    try {
      trackId = id;
      if (id && G.Game && G.Game._switching) { pending = { id, rate, t: ctx.currentTime }; return; }   // starts right after the build
      pending = null;
      setMusic(id, rate);
    } catch (e) { warnOnce('mx', 'music error ' + e.message); }
  };
  A.leaveMode = function (next) {
    leaving = { next: next || null, at: ctx ? ctx.currentTime : 0 };
    pending = null;
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;
      // every audible track fades now, including one still playing up to a quantized hand-over downbeat (and the
      // queued track waiting for it), so nothing keeps going under the warp
      for (const tr of tracks) if (!tr.stopAt || tr.endAt > t + 0.45) fadeOut(tr, t, 0.45);
      trackId = null;
      ambStop(t, 0.6);
      if (hp.on) setLowHp(false, t);
      if (muted || vol.music <= 0.001 || vol.master <= 0.001) return;
      const g = GN(WARP_LV);
      g.connect(stingBus);
      if (ST.warp && !A._liveStingers) {
        const s = ctx.createBufferSource();
        s.buffer = ST.warp; s.connect(g); s.start(t + 0.02);
        s.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      } else { warpSynth(t + 0.02, g); setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 4000); }
      startBed(t + 0.75);
    } catch (e) { warnOnce('lv', 'leaveMode error ' + e.message); }
  };
  function onMode(id) {
    surfBiome = biomeNow();
    if (!ctx) { wantAmb = A.ambientAuto ? autoAmbient(id) : null; return; }
    const t = ctx.currentTime;
    if (bed && !pending && !liveTrack()) stopBed(t + 0.3, 1.2);    // a mode without music: let the bed fade away
    leaving = null;
    if (A.ambientAuto) { const a = autoAmbient(id); A.ambient(a[0], { lv: a[1] }); }
  }
  A.ambientAuto = true;
  A.ambient = function (id, opts) {
    const lv = opts && opts.lv > 0 ? +opts.lv : 1;
    if (id && !AMB[id]) { warnOnce('a:' + id, 'unknown ambience "' + id + '"'); id = null; }
    if (!ctx) { wantAmb = id ? [id, lv] : null; return; }
    try {
      const t = ctx.currentTime;
      if (amb && amb.id === id) { if (Math.abs(amb.lv - lv) > 0.01) { amb.lv = lv; amb.out.gain.setTargetAtTime(lv * amb.k, t, 0.5); } return; }
      ambStop(t, 0.8);
      if (id) ambStart(id, lv);
    } catch (e) { warnOnce('ax', 'ambience error ' + e.message); }
  };
  A.intensity = function (v) {
    intForce = v === null || v === undefined ? null : clamp(+v || 0, 0, 1);
    if (ctx) { intT = 0; updateIntensity(ctx.currentTime); }
  };
  A.onCaption = function (fn) {
    if (typeof fn !== 'function') return noop;
    capFns.push(fn);
    return () => { const i = capFns.indexOf(fn); if (i >= 0) capFns.splice(i, 1); };
  };
  A.preview = function (kind) {
    if (!ctx) return;
    try {
      if (kind === 'amb') {
        const live = amb, D = AMB[live ? live.id : 'shoals'];
        if (live && D && D.ev.length) ambEvent(live, D.ev[0], ctx.currentTime + 0.02);
        else { const g = GN(0.9); g.connect(ambBus); AEV.tweet(ctx.currentTime + 0.02, g, 1.2); setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 1500); }
      } else if (kind === 'sfx') { play('pickupBolt', null, null); play('blaster', { vol: 0.8 }, null); }
      else if (kind === 'music') {
        // with no track playing, a little chime through the music bus (so the slider is heard at its new level)
        if (!liveTrack() && !muted && vol.music > 0.001) {
          const g = GN(1), t = ctx.currentTime + 0.02; g.connect(stingBus);
          [72, 76, 79, 84].forEach((m, i) => bell(t + i * 0.07, g, mtof(m), 0.55, 0.05));
          setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 1500);
        }
      } else if (kind === 'ui') play('ui', null, null);
      else play('coin', { vol: 0.8 }, null);             // master: not on the Menu sounds bus (audible even when that is 0)
    } catch (e) { warnOnce('pv', 'preview error ' + e.message); }
  };
  A.duck = function (on) { ducked = !!on; applyGains(false); };
  A.setVolumes = function (m, s, mu, am, ui) {
    const n = (x, d) => (typeof x === 'number' && isFinite(x) ? clamp(x, 0, 1) : d);
    const set = G.Save && G.Save.data ? G.Save.set : null;
    if (am === undefined && set) am = set.amb;
    if (ui === undefined && set) ui = set.uiVol;
    vol.master = n(m, vol.master); vol.sfx = n(s, vol.sfx); vol.music = n(mu, vol.music); vol.amb = n(am, vol.amb); vol.ui = n(ui, vol.ui);
    applyGains(false);
  };
  Object.defineProperty(A, 'muted', { get: () => muted, set: v => { muted = !!v; applyGains(false); }, enumerable: true });
  Object.defineProperty(A, 'ready', { get: () => !!ctx && ctx.state === 'running', enumerable: true });
  Object.defineProperty(A, 'track', { get: () => trackId, enumerable: true });
  A.list = () => Object.keys(SFX);
  A.loops = () => Object.keys(LOOPS);
  A.tracks = () => Object.keys(TRACKS);
  A.autoPickup = true;   // play pickup sounds from the bus 'pickup' event (nothing else in core does)
  function onPickup(type, data) {
    if (!A.autoPickup) return;
    const r = data && data.rarity;
    A.sfx(type === 'bolt' ? 'pickupBolt' : type === 'part' ? (r === 'epic' || r === 'legendary' || r === 'mythic' ? 'pickupRare' : 'pickupPart')
      : type === 'health' ? 'heal' : type === 'shield' ? 'shieldUp' : type === 'special' ? 'pickupRare' : type === 'ammo' ? 'reload' : 'coin');
  }

  // ---------------------------------------------------------------- debug hooks (tests)
  A._liveStingers = false;        // test hook: use the live-graph stinger fallback even when the buffers exist
  A._mark = () => plays;           // count of sfx started so far (07_ui: did a tap handler play its own sound?)
  A._cat = name => (SFX[name] ? SFX[name].c : null);
  A._surfaces = () => SURFACES.slice();
  A._surface = probe => surfaceNow(probe);   // probe: optional {modeId, world, turfPaint} stand-in for G.Game
  A._stats = () => ({ state: ctx ? ctx.state : 'none', voices: voices.length, loops: loops.length, tracks: tracks.map(t => t.id), track: trackId, ks: ksCache.size,
    amb: amb ? amb.id : null, intensity: +intensity.toFixed(2), lowHp: hp.on, bed: !!bed, pending: pending ? pending.id : null, stingers: { warp: !!ST.warp, bed: !!ST.bed } });
  A._trackInfo = id => { const T = TRACKS[id]; if (!T) return null; if (!T._c) T._c = compose(T); return { bpm: T.bpm, bars: T._c.bars, loopBar: T._c.loopBar, layers: !!T.layers }; };
  A._trackState = () => ({ now: ctx ? +ctx.currentTime.toFixed(3) : 0, intensity, bed: !!bed, leaving: leaving ? leaving.next : null, pending: pending ? pending.id : null,
    live: tracks.map(t => ({ id: t.id, step: t.step, nextT: +t.nextT.toFixed(3), startAt: +t.startAt.toFixed(3), endAt: +t.endAt.toFixed(3), stopAt: +t.stopAt.toFixed(3),
      barS: +(240 / (t.T.bpm * t.rate)).toFixed(4) })) });
  // Post-compressor (out) and pre-compressor (pre) peak/RMS meter. _meter(true) starts, _meter() reads, _meter(false) resets.
  A._meter = function (on) {
    if (!ctx) return null;
    if (on === true && !meter) {
      const mk = node => { const an = ctx.createAnalyser(); an.fftSize = 2048; node.connect(an); return { an, buf: new Float32Array(2048), peak: 0, sum: 0, n: 0 }; };
      meter = { out: mk(outNode), pre: mk(master) };
      meter.id = setInterval(() => {
        for (const m of [meter.out, meter.pre]) {
          m.an.getFloatTimeDomainData(m.buf);
          let pk = 0, s = 0;
          for (let i = 0; i < m.buf.length; i++) { const x = m.buf[i]; const ax = x < 0 ? -x : x; if (ax > pk) pk = ax; s += x * x; }
          if (pk > m.peak) m.peak = pk; m.sum += s / m.buf.length; m.n++;
        }
      }, 20);
    }
    if (!meter) return null;
    const rd = m => ({ peak: +m.peak.toFixed(3), rms: +Math.sqrt(m.sum / Math.max(1, m.n)).toFixed(4) });
    const res = { out: rd(meter.out), pre: rd(meter.pre), reduction: typeof comp.reduction === 'number' ? +comp.reduction.toFixed(2) : 0 };
    if (on === false) for (const m of [meter.out, meter.pre]) { m.peak = 0; m.sum = 0; m.n = 0; }
    return res;
  };
  // Render `secs` of a music track offline (track output at full intensity unless o.intensity, before the music bus).
  A._renderMusic = function (id, secs, o) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!TRACKS[id] || !ctx || !OAC) return Promise.resolve(null);
    secs = secs || 8;
    const off = new OAC(1, Math.ceil(ctx.sampleRate * (secs + 1)), ctx.sampleRate), real = ctx, bus = musicBus, int0 = intensity;
    ctx = off; musicBus = off.createGain(); musicBus.connect(off.destination);
    try {
      intensity = o && o.intensity !== undefined ? clamp(+o.intensity, 0, 1) : 1;
      const tr = makeTrack(id, 1, 0.01, 0), sd = 15 / tr.T.bpm;
      const mute = o && o.mute;      // debug: skip these event types (e.g. ['h', 'lead'])
      while (tr.nextT < secs) { const list = tr.ev[tr.step]; if (list) for (const e of list) if (!mute || mute.indexOf(e[0]) < 0) playEv(tr, e, tr.nextT, sd); advance(tr); }
    } finally { ctx = real; musicBus = bus; intensity = int0; }
    return off.startRendering().then(buf => {
      const d = buf.getChannelData(0); let pk = 0, s = 0;
      for (let i = 0; i < d.length; i++) { const ax = Math.abs(d[i]); if (ax > pk) pk = ax; s += d[i] * d[i]; }
      return { id, peak: +pk.toFixed(3), rms: +Math.sqrt(s / d.length).toFixed(4) };
    });
  };
  // Render one sfx offline (raw voice output incl. its level trim) and report its duration/peak/RMS.
  A._render = function (name, opts) {
    const def = SFX[name], OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!def || !ctx || !OAC) return Promise.resolve(null);
    const op = opts || EMPTY, len = Math.max(1.8, (+op.dur || 0) + 1), off = new OAC(1, Math.ceil(ctx.sampleRate * (def === SFX.win ? 3 : len)), ctx.sampleRate), real = ctx;
    let dur = 0;
    ctx = off;
    try { const g = off.createGain(); g.gain.value = def.g; g.connect(off.destination); dur = def.f(0.01, g, 1, op); } finally { ctx = real; }
    return off.startRendering().then(buf => {
      const d = buf.getChannelData(0); let pk = 0, s = 0, lastLoud = 0;
      for (let i = 0; i < d.length; i++) { const ax = Math.abs(d[i]); if (ax > pk) pk = ax; s += d[i] * d[i]; if (ax > 0.001) lastLoud = i; }
      return { name, dur: +dur.toFixed(3), audible: +(lastLoud / buf.sampleRate).toFixed(3), peak: +pk.toFixed(3), rms: +Math.sqrt(s / d.length).toFixed(4) };
    });
  };
  // Render a transition stinger offline ('warp' one-shot or one cycle of the 'bed' loop) like _render.
  A._renderStinger = function (id) {
    if (!ctx) return Promise.resolve(null);
    const p = id === 'bed' ? offRender(BED_LEN + BED_X + 0.8, g => bedSynth(g)) : offRender(1.6, g => warpSynth(0.02, g));
    return p.then(buf => {
      if (!buf) return null;
      const d = buf.getChannelData(0); let pk = 0, s = 0;
      for (let i = 0; i < d.length; i++) { const ax = Math.abs(d[i]); if (ax > pk) pk = ax; s += d[i] * d[i]; }
      return { name: id, dur: +(buf.length / buf.sampleRate).toFixed(3), peak: +pk.toFixed(3), rms: +Math.sqrt(s / d.length).toFixed(4) };
    });
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 09_audio.js]', e); }
})();
