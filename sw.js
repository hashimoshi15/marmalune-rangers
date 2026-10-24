// build 1.3.0-8e69389-64d40b47
// Marmalune Rangers — service worker for the public site (GitHub Pages). Copied to the site root by
// tools/make_public.mjs, which fills in BUILD / PRECACHE / HASHED / LAZY below; scope = the site folder.
//   install   precache this build's files into its own cache ('mr-v' + build id). Content-hashed files another
//             build already cached are copied over instead of downloaded again, so an update only fetches what
//             changed. The page itself must carry this build id (a deploy landing mid-install fails the install,
//             and the browser simply tries again on a later update check).
//   activate  delete the caches of older builds (never the font cache), enable navigation preload, claim the page.
//             Baked textures and language packs (LAZY) are not precached: cached on first use, and the ones a device
//             already used are carried over when the next build installs (content-hashed ones copied, others revalidated).
//   fetch     page (navigation / index.html): network first (navigation preload; a slow network gives way to the
//             cached page after a few seconds), the cached page when offline. Hashed files: cache first (any
//             build's cache). Other files of this build (manifest, icons, textures): this build's cache first.
//             Google Fonts: kept in 'mr-fonts' so text keeps its real fonts offline.
//   message   {type:'build'} -> {type:'build', build} (port or source); {type:'skip-waiting'} activates a waiting
//             update — sent by the page only when the player taps "Restart" (99_main G.PWA), so a new version never
//             swaps code under a running game.
'use strict';
const BUILD = {"id":"1.3.0-8e69389-64d40b47","version":"1.3.0","commit":"8e69389"};
const PRECACHE = ["three.7b1c5d75b2.js","core.83b77a8797.js","world.b2c77c0671.js","data.ecb832ab74.js","geo.cdb57ca820.js","actors.ed582a6d95.js","pve.2ce7ba63af.js","arena.93a2a9a390.js","royale.bd0f5abd76.js","menus.77d0ea9ba5.js","lang-en.a2ee943995.js","main.cb191116bb.js","style.3b45869c7a.css","assets/manifest.json","icon.svg","icon-192.png","manifest.webmanifest","./"];
const HASHED = new Set(["three.7b1c5d75b2.js","core.83b77a8797.js","world.b2c77c0671.js","data.ecb832ab74.js","geo.cdb57ca820.js","actors.ed582a6d95.js","pve.2ce7ba63af.js","arena.93a2a9a390.js","royale.bd0f5abd76.js","menus.77d0ea9ba5.js","lang-en.a2ee943995.js","main.cb191116bb.js","lang-de.7159607968.js","lang-es.87e4531680.js","lang-fr.377491dd25.js","lang-id.94f549ddce.js","lang-it.a600970f10.js","lang-ja.8d8a76f665.js","lang-ko.e319c479b6.js","lang-pt-br.8a50fb254b.js","lang-ru.d6dbdab0a9.js","lang-zh-hans.2407c6082e.js","lang-zh-hant.f5e3f8d8e5.js","style.3b45869c7a.css"]);
const LAZY = ["lang-de.7159607968.js","lang-es.87e4531680.js","lang-fr.377491dd25.js","lang-id.94f549ddce.js","lang-it.a600970f10.js","lang-ja.8d8a76f665.js","lang-ko.e319c479b6.js","lang-pt-br.8a50fb254b.js","lang-ru.d6dbdab0a9.js","lang-zh-hans.2407c6082e.js","lang-zh-hant.f5e3f8d8e5.js","assets/surface_grain_512.png","assets/terrain_detail_1024.png"];                     // baked textures + language packs: cached on first use, kept across updates once used
const PREFIX = 'mr-v';
const CACHE = PREFIX + BUILD.id;
const FONT_CACHE = 'mr-fonts';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const FONT_MAX = 400;
const SCOPE = self.registration.scope;               // e.g. https://hashimoshi15.github.io/marmalune-rangers/
const PAGE = new URL('./', SCOPE).href;              // the page is cached under the scope URL
const PAGE_TIMEOUT = 4000;
const abs = p => new URL(p, SCOPE).href;
const PRE = new Set(PRECACHE.map(abs));
const LAZY_SET = new Set(LAZY.map(abs));

// ---------------------------------------------------------------- install
async function precache() {
  const cache = await caches.open(CACHE);
  const others = (await caches.keys()).filter(n => n.startsWith(PREFIX) && n !== CACHE);
  const one = async path => {
    const url = abs(path);
    if (await cache.match(url)) return;              // a retried install
    let res = null;
    if (HASHED.has(path)) {
      for (const n of others) { res = await (await caches.open(n)).match(url); if (res) break; }
    }
    // hashed files never change, so the HTTP cache may serve them (the page just loaded them); anything else is
    // revalidated so the cache holds exactly this build
    if (!res) res = await fetch(url, { cache: HASHED.has(path) ? 'default' : 'no-cache', credentials: 'same-origin' });
    if (!res || !res.ok) throw new Error('precache ' + path + ' ' + (res ? res.status : 'failed'));
    if (url === PAGE) {
      const text = await res.clone().text();
      if (text.indexOf(BUILD.id) < 0) throw new Error('the page on the server is not build ' + BUILD.id);
    }
    await cache.put(url, res);
  };
  // a few at a time (phones on cellular)
  const queue = PRECACHE.slice();
  const lane = async () => { while (queue.length) await one(queue.shift()); };
  await Promise.all([lane(), lane(), lane(), lane()]);
  // textures / language packs this device already used under an older build come along: a content-hashed file is
  // copied from the old cache (it never changes), anything else revalidated (usually a cheap 304). A language whose
  // pack changed in this build (new hashed name) is fetched anew when the device had an older pack of it, so an update
  // installed online keeps the player's language offline too.
  const langsUsed = new Set();
  for (const n of others) {
    for (const req of await (await caches.open(n)).keys()) { const m = /\/lang-([A-Za-z-]+)\.[0-9a-f]{10}\.js$/.exec(req.url); if (m) langsUsed.add(m[1]); }
  }
  for (const path of LAZY) {
    const url = abs(path);
    if (await cache.match(url)) continue;
    let had = null;
    for (const n of others) { had = await (await caches.open(n)).match(url); if (had) break; }
    const lm = /^lang-([A-Za-z-]+)\.[0-9a-f]{10}\.js$/.exec(path);
    if (!had && !(lm && langsUsed.has(lm[1]))) continue;
    if (had && HASHED.has(path)) { await cache.put(url, had); continue; }
    try { const res = await fetch(url, { cache: HASHED.has(path) ? 'default' : 'no-cache', credentials: 'same-origin' }); if (res.ok) await cache.put(url, res); } catch (err) { /* first use will fetch it */ }
  }
}
self.addEventListener('install', e => { e.waitUntil(precache()); });

// ---------------------------------------------------------------- activate
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (err) { /* optional */ } }
    for (const n of await caches.keys()) if (n.startsWith(PREFIX) && n !== CACHE) await caches.delete(n);
    await self.clients.claim();
  })());
});

// ---------------------------------------------------------------- messages
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skip-waiting') self.skipWaiting();
  else if (d.type === 'build') {
    const msg = { type: 'build', build: BUILD };
    if (e.ports && e.ports[0]) e.ports[0].postMessage(msg);
    else if (e.source && e.source.postMessage) e.source.postMessage(msg);
  }
});

// ---------------------------------------------------------------- fetch
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (!req.url.startsWith(SCOPE)) return;
    const path = url.pathname;
    if (path.endsWith('/sw.js') || path.endsWith('/version.json')) return;   // always the network's
    if (req.mode === 'navigate' || url.href === PAGE || path === new URL(PAGE).pathname + 'index.html') { e.respondWith(page(e)); return; }
    e.respondWith(file(e, url));
    return;
  }
  if (FONT_HOSTS.indexOf(url.hostname) >= 0) e.respondWith(font(e, url));
});

const timeout = ms => new Promise(r => setTimeout(r, ms, null));
async function cachedPage() {
  const c = await caches.open(CACHE);
  return (await c.match(PAGE)) || (await caches.match(PAGE));
}
// Network first. A response is used as soon as it arrives; after PAGE_TIMEOUT the cached page answers instead (lie-fi
// on a phone), and offline it answers at once. The network copy is not stored: the cached page must stay the one that
// matches this build's cached files.
async function page(e) {
  const net = (async () => {
    try {
      const pre = e.preloadResponse ? await e.preloadResponse : null;
      if (pre) return pre;
      return await fetch(e.request);
    } catch (err) { return null; }
  })();
  // (kept alive until the network answers even when the cached page wins: the browser then also settles the
  // navigation preload instead of cancelling it with a console warning)
  e.waitUntil(net);
  const first = await Promise.race([net, timeout(PAGE_TIMEOUT)]);
  if (first && (first.ok || first.type === 'opaqueredirect')) return first;
  const cached = await cachedPage();
  if (cached) return cached;
  const late = first || await net;
  return late || Response.error();
}
async function file(e, url) {
  const req = e.request;
  const hashed = HASHED.has(url.href.slice(SCOPE.length));
  const own = await caches.open(CACHE);
  let hit = await own.match(req);
  if (!hit && hashed) hit = await caches.match(req);          // immutable: any build's copy is the same file
  if (hit) return hit;
  try {
    const res = await fetch(req);
    // this build's files (and baked textures that were not precached) are kept for offline play
    if (res.ok && (PRE.has(url.href) || LAZY_SET.has(url.href))) e.waitUntil(own.put(req, res.clone()).catch(() => {}));
    return res;
  } catch (err) {
    const any = await caches.match(req, { ignoreSearch: true });
    if (any) return any;
    throw err;
  }
}
let fontPuts = 0;
async function font(e, url) {
  const c = await caches.open(FONT_CACHE);
  // (Google may vary these responses on request headers a cached copy cannot repeat: match by URL)
  const hit = await c.match(e.request, { ignoreVary: true });
  // font files never change at a given URL; the stylesheet is refreshed in the background
  if (hit && url.hostname === 'fonts.gstatic.com') return hit;
  const net = fetch(e.request).then(res => {
    if (res && (res.ok || res.type === 'opaque')) {
      e.waitUntil(c.put(e.request, res.clone()).then(trimFonts).catch(() => {}));
    }
    return res;
  });
  if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
  return net;
}
async function trimFonts() {
  if (++fontPuts % 25) return;
  const c = await caches.open(FONT_CACHE);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - FONT_MAX; i++) await c.delete(keys[i]);
}
