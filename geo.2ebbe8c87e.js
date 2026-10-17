/* Marmalune Rangers — geo: 15_geo.js 15b_geo_chars.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 15_geo.js
try { (function () {
// 15_geo.js — G.Geo: procedural WORLD art kit for Marmalune Rangers (no external assets).
// Look: Slime-Rancher sunny pastels (soft rounded toon forms, 6-band sandstone mesas, coral,
// mushrooms, big sky) + Ratchet-style chunky sci-fi town + Splatoon-style plaza splats (GDD §2, §10).
// Characters / robots / NPCs / critters / ships / icons live in 15b_geo_chars.js (same namespace).
//
// CONVENTIONS
//   * LOCAL space, +Y up, origin at the prop's base centre, fronts (doors, counters, signs) face +Z.
//     Colours are vertex colours rendered with G.M.vc() unless noted.
//   * Prop makers return {mesh, colliders, anchors, meta}. colliders are local
//     {type:'cyl', x,z,r,y0,y1} | {type:'box', cx,cy,cz,sx,sy,sz}; anchors are named local THREE.Vector3.
//     Prop geometry is cached by parameters and flagged userData.shared (never disposed by
//     G.R.disposeTree); every call returns a NEW Mesh sharing it, so many copies are cheap.
//   * Glowing parts are merged into ONE child mesh with unlit vertex colours (Geo.glowMat()).
//
// UTILITIES
//   merge(geos[])                 -> indexed BufferGeometry (position, normal, color; uv only if every
//                                    part has uv). Non-indexed parts get identity indices; missing
//                                    normals are computed; parts without colour get white. Inputs untouched.
//   colorize(geo, hex|Color|fn)   -> geo. Writes `color`. fn(x,y,z,nx,ny,nz,i) -> hex|THREE.Color.
//   tint(geo, hex)                -> geo. Multiplies the existing colour attribute (adds one if missing).
//   xf(geo, x,y,z, rx,ry,rz, sx,sy,sz) -> geo transformed in place (Euler XYZ, scale defaults 1).
//   smooth(geo, creaseDeg=180)    -> non-indexed geo with normals averaged over coincident vertices.
//   bake(object3D, {matOpts})     -> ONE Mesh (G.M.vc) in object3D-local space carrying the root's
//                                    transform. Material colours are multiplied into vertex colours.
//                                    userData.glow / unlit MeshBasicMaterial / strong emissive meshes go
//                                    into one child glow mesh; glossy parts (metalMat(), Kit.metal) into one
//                                    child glossy mesh. Transparent or textured meshes, sprites,
//                                    InstancedMesh and userData.keep objects are re-parented untouched.
//                                    Typical use: place() many props into a Group, then world.add(bake(g)).
//   bakeQuads(object3D, {cx, cz, halves, axis, matOpts}) -> [Mesh] the children split by position around
//                                    (cx, cz) into 4 quarters (or 2 halves along axis 'x'|'z'), each baked on its
//                                    own so it frustum-culls separately (each part costs up to 3 draw calls).
//   roundedBox(w,h,d,r=0.1,seg=2) -> centred box with smooth rounded edges (seg 1 = 108 tris).
//   blob(radius, detail=2, amp=0.18, seed=1, {freq, sy}) -> noise-displaced icosphere, smooth normals.
//   lathe(points[[r,y,colour?]...], seg=16, rfn?) -> seamless smooth lathe (profile bottom->top faces
//                                    outward; r=0 closes). banded(profile, [[yFrom,colour]..]) adds crisp
//                                    colour bands for lathe().
//   scatter({count, area:{minX,maxX,minZ,maxZ}, heightFn, avoid(x,z)->bool, geo, color|colors,
//            scale:[min,max], yOffset, seed, tilt, slopeMax, minY, maxY, material, matOpts})
//                                 -> InstancedMesh (instanceColor when colors[]); userData.points=[{x,y,z,s,ry}].
//   instancedAt(geo, mat, [{x,y,z,s,ry,color?}]) -> InstancedMesh.
//   place(world, prop, x,y,z, rotY=0, parent?) -> {mesh, items, anchors, cols}: adds prop.mesh (cloned if
//                                    already parented) to parent||world.scene, registers colliders with
//                                    world.phys (world may be null) and returns world-space anchors.
//                                    90° steps keep exact boxes; other angles turn slab boxes into the
//                                    rotated-footprint AABB and walls into cylinder chains (worldColliders()).
//   emblem(kind, colour?) -> ~1 m vc icon geometry facing +Z: star gear coin wing splat pod shield
//                   target cup trophy bolt heart.   Kit / P: the builder + primitives used internally.
//   PAL palette, CANOPY tree palettes, ROCK_PAL, BPAL building palettes, FLOOR_Y (=0.3).
//
// NATURE  (all -> {mesh, colliders, anchors?})
//   rock(size=1, seed, palette 'sand'|'cool'|'ember'|'frost'|'moss'|'coral'|'slate'|[dark,mid,light])
//   mesa(radius=8, height=10, seed, {bands, cap}) anchors.top  (stacked layers, crisp 6-band sandstone,
//     grass cap, walkable top)   pillarArch(span=10, height=6, seed, {bands, cap})
//   coral(kind 0 fan|1 tubes|2 branch|3 brain|4 bubbles, colour, size)  mushroom(size, cap, {glow})
//   tree('round'|'palm'|'pine'|'candy', size, seed, {palette, snow})  crystal(size, colour, seed, {halo})
//   bush(size, colour, seed, berry)  flowerPatch(seed, colours)  bigFlower(colour, size)
//   cloudPuff(size, seed) (fog-free)  shell(colour)  starfish(colour)  skyIsland(radius, seed)
//   scatter geometry: grassTuftGeo flowerGeo bushGeo pebbleGeo rockGeo shellGeo starfishGeo coralGeo
//     crystalGeo treeGeo (userData.trunk {h,r}) cloudGeo mushroomParts(cap, glow, seed, lite: true|'glow') -> {solid, glow}
//   distantMountains(radius=320, count=22, colours[], {haze, height, bands}) -> Mesh (1 call, fog-free)
//
// REGION SET PIECES (expedition landmarks + dressing; {mesh, colliders, anchors} unless noted)
//   lighthouse() jetty(len, deckY) tidePool(seed) beachSpot(seed)          Sunny Shoals
//   bloomGeo(kind 0..2, colour, seed) (geometry) hoodoo(h, seed, {bands})   Peach Mesas
//   elderGlowcap(seed) glowSproutGeo(colour) (geometry)                     Glowcap Grotto
//   frozenFall(h, seed) snowdriftGeo(seed) (geometry)                       Frostfizz Bluffs
//   gizmoFactory() conveyor(len, h) magnetCrane(h, seed) junkCluster(seed)  Junkyard Rim
//   Materials: woodCol(base, axis) / stoneCol(c0, c1) colour functions; Kit.metal() parts render glossy.
// FIZZPORT  badgeGeo(emblem, colour) (facility medallion, front +Z) doorProps(kind, colour) (purpose props in
//   door-local space: +Z out of the door, walkway |x| < 1.6 kept clear)
//
// TOWN  (-> {mesh, colliders, anchors, meta})
//   building(kind, {label, palette, seed}) kinds: guild workshop shop hangar arena royale defense training
//     cafe gallery house. Open-front walk-in rooms (house = closed decor): floor top y=0.3 (step-up),
//     door side +Z, ≥3 m openings, 8–16 m wide, ≈5.6–7.4k tris, 2 draw calls (+1 text plane when
//     label given; meta.sign = {w,h,bg,border} lets callers draw their own label at anchors.sign).
//     anchors: door spawn sign counter npc use (+ guild.board, workshop.machine, hangar.ship, arena.gate,
//     royale.pod/launch, defense.core, training.lane/target0..2, gallery.pedestal0..4).
//     Foundation extends 2 m below y=0 for slopes.
//   plazaFountain(r=3.2) plaza(radius) paving(w,d,{tile}) lampPost({halo, mast, pennant}) bench() fence(len) bridge(len)
//   platform(w,d,h) (origin = top surface) ramp(w,len,h) / stairs(w,h) (rise toward -Z) jumpPad()
//   teleporter() beacon(colour) (+ additive 'beam' child) extractionPad() barrel(colour) banner(colour)
//   sign(text,{w,h,posts,postH,bg,fg,border,frame}) signTexture(text,opts) textPlane(text,w,h,opts)
//   crate('bolt'|'metal'|'ammo'|'health'|'explosive'|'rare'; aliases wood/boom/lumite) -> Mesh only
//     (origin at base, no colliders, GDD §8.2 looks).
// PICKUPS  pickupMesh('health'|'ammo'|'shield'|'special', {color, big}) -> Group (~0.4 m, centred, glow
//          sprite). health = pink Health Pop orb (GDD §4.3).
// DECALS   splatGeo(variant 0..3) -> cached unit-radius ink splat in the XY plane facing +Z (+droplets).
// BIOMES   biomes{meadow reef ember frost jungle space night shoals mesas grotto junk hub turf}:
//          {sky, light, fog, colorFn(x,z,h,slope), water:{shallow,deep,y}|null, props[], dress{recipe}}
//          painter(opts) builds a colorFn; biomeWorldOpts(id) -> {sky, fog, light} for new G.World.
//          dressBiome(world, id, {area, heightFn, density, avoid, seed, clouds, horizon}) -> colliders[]
//          (world-space descriptors with .item; .group = the added Object3D). Counts scale with
//          density × G.R.q().props; landmarks are baked into one mesh, everything else is instanced.
(function (G) {
  'use strict';
  const Geo = G.Geo = G.Geo || {};
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ------------------------------------------------------------------ palette
  const PAL = Geo.PAL = {
    grass: 0x6ccb5f, grassTip: 0xa8e06a, grassDark: 0x3e9e57, grassShade: 0x3a8f7a,
    sandL: 0xf7e3b0, sand: 0xebc786, sandWet: 0xd9a86c,
    bands: [0xf7e1b5, 0xf2b98a, 0xe88a5a, 0xc9624a, 0xd97b7b, 0x9e4b45],
    cool: [0x6e64a8, 0x8e88c8, 0xc4bff0],
    coral: [0xff8a4c, 0xff7a93, 0xff5fa2, 0xffb37a, 0xb983ff, 0xffd45c],
    mushCap: 0xff6f91, stem: 0xfff1dc, nightGlow: 0x7af0ff, bio: 0x5cffe1,
    water: { shallow: 0x7fe8e0, mid: 0x2cc3d6, deep: 0x1489b8 }, foam: 0xf2ffff,
    gold: 0xe8b44a, brass: 0xb07a2a, navy: 0x1f2a5a, navyD: 0x141b3d, coil: 0x4fd8ff, coilCore: 0xc8f6ff,
    cream: 0xfff1dc, white: 0xfbf8f2, ink: 0x1e1a4d, teal: 0x2cc3d6, mint: 0x3fe0b8, coralA: 0xff6b8b,
    sun: 0xffd23f, grape: 0x8f6bff, sky: 0x33b5ff, wood: 0xd99a5b, woodD: 0xa86a3c, steel: 0xc9d2ea,
    teamA: 0xff8a1f, teamB: 0x3d7bff, cloud: [0xffffff, 0xd6e4f8, 0xb9c2ee], red: 0xff4d5e, green: 0x33d17a,
  };

  // ------------------------------------------------------------------ colour helpers
  const _cc = new Map();
  const C = h => { if (h && h.isColor) return h; let c = _cc.get(h); if (!c) { c = new THREE.Color(h); _cc.set(h, c); } return c; };
  const _t1 = new THREE.Color(), _t2 = new THREE.Color(), _t3 = new THREE.Color();
  // Linear-space mix -> temp Color (copy it if kept).
  const mixC = (a, b, t, out) => { const o = out || _t1; const ca = C(a), cb = C(b); o.r = ca.r + (cb.r - ca.r) * t; o.g = ca.g + (cb.g - ca.g) * t; o.b = ca.b + (cb.b - ca.b) * t; return o; };
  const mixHex = (a, b, t) => mixC(a, b, clamp(t, 0, 1), _t2).getHex();
  const ramp3 = (c0, c1, c2, t, out) => (t < 0.5 ? mixC(c0, c1, clamp(t * 2, 0, 1), out) : mixC(c1, c2, clamp(t * 2 - 1, 0, 1), out));
  const lighten = (h, t) => mixHex(h, 0xffffff, t);
  const darken = (h, t) => mixHex(h, 0x2a1f55, t);
  Geo.mixHex = mixHex; Geo.lighten = lighten; Geo.darken = darken;

  // ------------------------------------------------------------------ seeded 3D value noise
  function hash3(x, y, z, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + Math.imul(s, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vn3(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let u = x - xi, v = y - yi, w = z - zi;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
    const a = lerp(hash3(xi, yi, zi, s), hash3(xi + 1, yi, zi, s), u), b = lerp(hash3(xi, yi + 1, zi, s), hash3(xi + 1, yi + 1, zi, s), u);
    const c = lerp(hash3(xi, yi, zi + 1, s), hash3(xi + 1, yi, zi + 1, s), u), d = lerp(hash3(xi, yi + 1, zi + 1, s), hash3(xi + 1, yi + 1, zi + 1, s), u);
    return lerp(lerp(a, b, v), lerp(c, d, v), w) * 2 - 1;
  }
  function fbm3(x, y, z, s, oct) {
    let a = 0.5, f = 1, sum = 0, n = 0;
    for (let i = 0; i < (oct || 3); i++) { sum += a * vn3(x * f, y * f, z * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
    return sum / n;
  }
  // Seamless noise around a circle (for wobbly lathe silhouettes).
  const circN = (th, f, layer, seed) => vn3(Math.cos(th) * f + 11.3, Math.sin(th) * f + 5.7, layer * 3.71, seed);
  Geo.noise3 = vn3;

  // ------------------------------------------------------------------ geometry utilities
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3();
  const UP = new V3(0, 1, 0);
  function xf(g, x, y, z, rx, ry, rz, sx, sy, sz) {
    if (sx == null) sx = 1; if (sy == null) sy = sx; if (sz == null) sz = sx;
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e);
    _m4.compose(_p.set(x || 0, y || 0, z || 0), _q, _s.set(sx, sy, sz));
    g.applyMatrix4(_m4);
    return g;
  }
  Geo.xf = xf;

  Geo.merge = function (geos) {
    geos = (geos || []).filter(g => g && g.attributes && g.attributes.position && g.attributes.position.count);
    const out = new THREE.BufferGeometry();
    if (!geos.length) return out;
    const anyCol = geos.some(g => g.attributes.color);
    const allUv = geos.every(g => g.attributes.uv);
    let nv = 0, ni = 0;
    const list = geos.map(g => {
      if (!g.attributes.normal) { g = g.clone(); g.computeVertexNormals(); }
      nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count;
      return g;
    });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
    const col = anyCol ? new Float32Array(nv * 3) : null, uv = allUv ? new Float32Array(nv * 2) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of list) {
      const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, u = g.attributes.uv, cnt = p.count;
      for (let i = 0; i < cnt; i++) {
        const k = (vo + i) * 3;
        pos[k] = p.getX(i); pos[k + 1] = p.getY(i); pos[k + 2] = p.getZ(i);
        nor[k] = n.getX(i); nor[k + 1] = n.getY(i); nor[k + 2] = n.getZ(i);
        if (col) { if (c) { col[k] = c.getX(i); col[k + 1] = c.getY(i); col[k + 2] = c.getZ(i); } else col[k] = col[k + 1] = col[k + 2] = 1; }
        if (uv) { uv[(vo + i) * 2] = u.getX(i); uv[(vo + i) * 2 + 1] = u.getY(i); }
      }
      if (g.index) { const ia = g.index; for (let j = 0; j < ia.count; j++) idx[io + j] = ia.getX(j) + vo; io += ia.count; }
      else { for (let j = 0; j < cnt; j++) idx[io + j] = vo + j; io += cnt; }
      vo += cnt;
    }
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  };

  Geo.colorize = function (geo, c) {
    const p = geo.attributes.position, n = geo.attributes.normal, cnt = p.count;
    const old = geo.attributes.color;
    const arr = old && old.itemSize === 3 && !old.isInterleavedBufferAttribute && old.array.length === cnt * 3 ? old.array : new Float32Array(cnt * 3);
    if (typeof c === 'function') {
      for (let i = 0; i < cnt; i++) {
        const r = C(c(p.getX(i), p.getY(i), p.getZ(i), n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0, i));
        arr[i * 3] = r.r; arr[i * 3 + 1] = r.g; arr[i * 3 + 2] = r.b;
      }
    } else {
      const r = C(c == null ? 0xffffff : c);
      for (let i = 0; i < cnt; i++) { arr[i * 3] = r.r; arr[i * 3 + 1] = r.g; arr[i * 3 + 2] = r.b; }
    }
    if (old && arr === old.array) old.needsUpdate = true;
    else geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  Geo.tint = function (geo, c) {
    if (!geo.attributes.color) return Geo.colorize(geo, c);
    const a = geo.attributes.color, k = C(c);
    for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * k.r, a.getY(i) * k.g, a.getZ(i) * k.b);
    a.needsUpdate = true; return geo;
  };

  Geo.smooth = function (geo, creaseDeg) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position, n = p.count;
    const fn = new Float32Array(n * 3);
    const a = new V3(), b = new V3(), c = new V3();
    for (let i = 0; i + 2 < n; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      b.sub(a); c.sub(a); b.cross(c);
      for (let k = 0; k < 3; k++) { fn[(i + k) * 3] = b.x; fn[(i + k) * 3 + 1] = b.y; fn[(i + k) * 3 + 2] = b.z; }
    }
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const key = Math.round(p.getX(i) * 2000) + ',' + Math.round(p.getY(i) * 2000) + ',' + Math.round(p.getZ(i) * 2000);
      let arr = groups.get(key); if (!arr) groups.set(key, arr = []); arr.push(i);
    }
    const out = new Float32Array(n * 3);
    const full = creaseDeg == null || creaseDeg >= 180, cosT = full ? -2 : Math.cos(creaseDeg * PI / 180);
    for (const arr of groups.values()) {
      if (full) {
        let x = 0, y = 0, z = 0;
        for (const j of arr) { x += fn[j * 3]; y += fn[j * 3 + 1]; z += fn[j * 3 + 2]; }
        const l = Math.hypot(x, y, z) || 1;
        for (const i of arr) { out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l; }
        continue;
      }
      for (const i of arr) {
        const ix = fn[i * 3], iy = fn[i * 3 + 1], iz = fn[i * 3 + 2], il = Math.hypot(ix, iy, iz) || 1;
        let x = 0, y = 0, z = 0;
        for (const j of arr) {
          const jx = fn[j * 3], jy = fn[j * 3 + 1], jz = fn[j * 3 + 2], jl = Math.hypot(jx, jy, jz) || 1;
          if ((ix * jx + iy * jy + iz * jz) / (il * jl) < cosT) continue;
          x += jx; y += jy; z += jz;
        }
        const l = Math.hypot(x, y, z) || 1;
        out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l;
      }
    }
    g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    return g;
  };

  Geo.roundedBox = function (w, h, d, r, seg) {
    seg = seg == null ? 2 : seg;
    r = Math.min(r == null ? 0.1 : r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    if (!(r > 0.002) || seg < 1) return new THREE.BoxGeometry(w, h, d);
    const n = 2 * seg + 1;
    const g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
    g.deleteAttribute('uv');
    const p = g.attributes.position, nr = g.attributes.normal;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const map = (u, half) => { const i = Math.round((u + 0.5) * n); return i <= seg ? -half + r * (i / seg) : half - r + r * ((i - seg - 1) / seg); };
    const v = new V3();
    for (let i = 0; i < p.count; i++) {
      const x = map(p.getX(i), hw), y = map(p.getY(i), hh), z = map(p.getZ(i), hd);
      const ix = clamp(x, -hw + r, hw - r), iy = clamp(y, -hh + r, hh - r), iz = clamp(z, -hd + r, hd - r);
      v.set(x - ix, y - iy, z - iz);
      if (v.lengthSq() < 1e-12) v.set(nr.getX(i), nr.getY(i), nr.getZ(i)); else v.normalize();
      p.setXYZ(i, ix + v.x * r, iy + v.y * r, iz + v.z * r);
      nr.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeBoundingSphere();
    return g;
  };

  Geo.blob = function (radius, detail, amp, seed, o) {
    o = o || {};
    const g = new THREE.IcosahedronGeometry(1, detail == null ? 2 : detail);
    g.deleteAttribute('uv');
    const p = g.attributes.position;
    amp = amp == null ? 0.18 : amp; seed = (seed || 1) | 0;
    const f = o.freq || 1.4, sy = o.sy || 1;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = radius * (1 + amp * fbm3(x * f + 7.1, y * f + 3.3, z * f + 1.9, seed, 3) * 1.6);
      p.setXYZ(i, x * k, y * k * sy, z * k);
    }
    return Geo.smooth(g);
  };

  // Seamless lathe ("ring stack"). prof: [[r, y, colorHex?], ...] bottom->top.
  // rfn(theta, y, ringIndex) -> radius mult; yfn(theta, ringIndex) -> y offset (wobbly band edges).
  // If profile entries carry a colour, the geometry is vertex-coloured per ring (crisp bands when two
  // rings share almost the same y). userData.ring = ring index per vertex.
  function ringStack(prof, seg, rfn, yfn) {
    const pos = [], idx = [], rings = [], ringOf = [];
    for (let i = 0; i < prof.length; i++) {
      const pr = prof[i], r = pr.isVector2 ? pr.x : pr[0], y = pr.isVector2 ? pr.y : pr[1];
      if (r < 1e-5) { rings.push({ single: pos.length / 3 }); pos.push(0, y, 0); ringOf.push(i); continue; }
      const start = pos.length / 3;
      for (let j = 0; j < seg; j++) {
        const th = (j / seg) * TAU, k = rfn ? rfn(th, y, i) : 1;
        pos.push(Math.cos(th) * r * k, y + (yfn ? yfn(th, i) : 0), Math.sin(th) * r * k);
        ringOf.push(i);
      }
      rings.push({ start });
    }
    for (let i = 0; i < rings.length - 1; i++) {
      const a = rings[i], b = rings[i + 1];
      if (a.single != null && b.single != null) continue;
      for (let j = 0; j < seg; j++) {
        const j1 = (j + 1) % seg;
        if (a.single != null) idx.push(a.single, b.start + j, b.start + j1);
        else if (b.single != null) idx.push(a.start + j, b.single, a.start + j1);
        else { const a0 = a.start + j, a1 = a.start + j1, b0 = b.start + j, b1 = b.start + j1; idx.push(a0, b0, b1, a0, b1, a1); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.userData.ring = ringOf;
    if (prof.some(p => p[2] != null)) {
      let last = 0xffffff;
      const rc = prof.map(p => (last = p[2] != null ? p[2] : last));
      Geo.colorize(g, (x, y, z, nx, ny, nz, i) => rc[ringOf[i]]);
    }
    return g;
  }
  Geo.lathe = (points, seg, rfn) => ringStack(points, seg || 16, rfn);
  // Insert near-duplicate rings at the given heights so per-ring colours change crisply there.
  // bands: [[yFrom, colour], ...] ascending; returns a coloured profile for ringStack.
  function banded(prof, bands, eps) {
    eps = eps || 0.015;
    const colAt = y => { let c = bands[0][1]; for (const b of bands) if (y >= b[0] - 1e-6) c = b[1]; return c; };
    const out = [];
    for (let i = 0; i < prof.length; i++) {
      const a = prof[i];
      out.push([a[0], a[1], colAt(a[1])]);
      const b = prof[i + 1]; if (!b) break;
      const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
      const cuts = bands.map(x => x[0]).filter(y => y > lo + eps && y < hi - eps);
      if (b[1] < a[1]) cuts.reverse();
      for (const y of cuts) {
        const dir = b[1] > a[1] ? 1 : -1;
        for (const yy of [y - eps * dir, y + eps * dir]) { const t = (yy - a[1]) / (b[1] - a[1]); out.push([lerp(a[0], b[0], t), yy, colAt(yy)]); }
      }
    }
    return out;
  }
  Geo.banded = banded;

  // Cylinder between two points (radius r0 at a, r1 at b).
  function tubeAB(a, b, r0, r1, seg) {
    const d = _p.copy(b).sub(a); const len = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, seg || 8, 1, false);
    g.deleteAttribute('uv'); g.translate(0, len / 2, 0);
    _q.setFromUnitVectors(UP, d.normalize());
    g.applyMatrix4(_m4.compose(a, _q, _s.set(1, 1, 1)));
    return g;
  }
  function flipCopy(g) { // back-face copy for thin double-sided sheets
    const b = (g.index ? g.toNonIndexed() : g.clone());
    const p = b.attributes.position, n = b.attributes.normal, c = b.attributes.color;
    for (let i = 0; i < p.count; i += 3) {
      for (const at of [p, n, c]) { if (!at) continue; const x = at.getX(i + 1), y = at.getY(i + 1), z = at.getZ(i + 1); at.setXYZ(i + 1, at.getX(i + 2), at.getY(i + 2), at.getZ(i + 2)); at.setXYZ(i + 2, x, y, z); }
    }
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    return b;
  }
  function extrude(shape, depth, bevel, curveSeg, bevelSeg) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bevelSeg || 2, curveSegments: curveSeg || 8 });
    g.deleteAttribute('uv'); g.translate(0, 0, -depth / 2);
    return Geo.smooth(g, 55);
  }
  function starShape(ro, ri, n) {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = PI / 2 + (i * PI) / n, r = i % 2 ? ri : ro; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    s.closePath(); return s;
  }
  function gearShape(ro, ri, teeth, hole) {
    const s = new THREE.Shape(), n = teeth * 4;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, r = i % 4 < 2 ? ro : ri; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    s.closePath();
    if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
    return s;
  }
  function circleShape(r, x, y) { const s = new THREE.Shape(); s.absarc(x || 0, y || 0, r, 0, TAU, false); return s; }
  Geo._shapes = { star: starShape, gear: gearShape, circle: circleShape, extrude };

  // ------------------------------------------------------------------ materials
  const glowMat = () => G.M.basic(0xffffff, { vertexColors: true });
  // Glossy vertex-colour material for metal / glazed / ice parts (Kit.metal): the house toon shader with a
  // specular highlight and a stronger rim. bake() keeps these parts in their own merged child mesh.
  const metalMat = () => { const m = G.M.vc({ spec: 0.72, rimStr: 0.42 }); m.userData.metal = true; return m; };
  Geo.metalMat = metalMat;
  const _nofog = new Map();
  // Fog-free soft-toon vertex-colour material (sky decoration, horizon).
  function noFogMat(opts) {
    const key = JSON.stringify(opts || {});
    let m = _nofog.get(key);
    if (!m) { m = G.M.toonUnique(0xffffff, Object.assign({ vc: true }, opts || {})); m.fog = false; m.userData.shared = true; _nofog.set(key, m); }
    return m;
  }
  Geo.glowMat = glowMat;

  // ------------------------------------------------------------------ kit builder
  class Kit {
    constructor() { this.s = []; this.g = []; this.m = []; this.c = []; this.a = {}; this.sp = []; this.meta = {}; }
    _paint(geo, col) { if (col != null) Geo.colorize(geo, col); else if (!geo.attributes.color) Geo.colorize(geo, 0xffffff); return geo; }
    add(geo, col, x, y, z, rx, ry, rz, sx, sy, sz) { xf(geo, x, y, z, rx, ry, rz, sx, sy, sz); this.s.push(this._paint(geo, col)); return geo; }
    addRaw(geo, col) { this.s.push(this._paint(geo, col)); return geo; }
    glow(geo, col, x, y, z, rx, ry, rz, sx, sy, sz) { xf(geo, x, y, z, rx, ry, rz, sx, sy, sz); this.g.push(this._paint(geo, col)); return geo; }
    glowRaw(geo, col) { this.g.push(this._paint(geo, col)); return geo; }
    // glossy parts (metal, glaze, ice): merged into one child mesh with the specular material
    metal(geo, col, x, y, z, rx, ry, rz, sx, sy, sz) { xf(geo, x, y, z, rx, ry, rz, sx, sy, sz); this.m.push(this._paint(geo, col)); return geo; }
    metalRaw(geo, col) { this.m.push(this._paint(geo, col)); return geo; }
    box(cx, cy, cz, sx, sy, sz) { this.c.push({ type: 'box', cx, cy, cz, sx, sy, sz }); return this; }
    cyl(x, z, r, y0, y1) { this.c.push({ type: 'cyl', x, z, r, y0, y1 }); return this; }
    anchor(n, x, y, z) { this.a[n] = new V3(x, y, z); return this; }
    sprite(color, size, x, y, z, op) { this.sp.push({ color, size, x, y, z, op }); return this; }
    // Rounded block resting on y0 (+ box collider unless solid===false).
    block(x, y0, z, w, h, d, col, r, seg, solid) {
      this.add(Geo.roundedBox(w, h, d, r != null ? r : Math.min(0.14, w * 0.25, h * 0.25, d * 0.25), seg != null ? seg : 1), col, x, y0 + h / 2, z);
      if (solid !== false) this.box(x, y0 + h / 2, z, w, h, d);
      return this;
    }
    data(matOpts) {
      return { solid: this.s.length ? Geo.merge(this.s) : null, glow: this.g.length ? Geo.merge(this.g) : null, metal: this.m.length ? Geo.merge(this.m) : null, c: this.c, a: this.a, sp: this.sp, m: this.meta, matOpts: matOpts || null };
    }
  }
  Geo.Kit = Kit;
  function inst(d) {
    const mat = d.mat || G.M.vc(d.matOpts || undefined);
    const mesh = d.solid ? new THREE.Mesh(d.solid, mat) : d.metal ? new THREE.Mesh(d.metal, metalMat()) : new THREE.Mesh(d.glow, glowMat());
    if (d.solid && d.metal) mesh.add(new THREE.Mesh(d.metal, metalMat()));
    if ((d.solid || d.metal) && d.glow) { const gm = new THREE.Mesh(d.glow, glowMat()); gm.userData.glow = true; mesh.add(gm); }
    for (const s of d.sp) { const sp = G.R.glowSprite(s.color, s.size, s.op != null ? s.op : 0.8); sp.position.set(s.x, s.y, s.z); mesh.add(sp); }
    const anchors = {}; for (const k in d.a) anchors[k] = d.a[k].clone();
    return { mesh, colliders: d.c.map(o => Object.assign({}, o)), anchors, meta: d.m || {} };
  }
  const pcache = new Map();
  function cached(key, build, matOpts, mat) {
    let d = pcache.get(key);
    if (!d) {
      const k = new Kit(); build(k); d = k.data(matOpts);
      if (mat) d.mat = mat;
      if (d.solid) d.solid.userData.shared = true;
      if (d.glow) d.glow.userData.shared = true;
      if (d.metal) d.metal.userData.shared = true;
      pcache.set(key, d);
    }
    return inst(d);
  }
  const gcache = new Map();
  function cachedGeo(key, make) {
    let g = gcache.get(key);
    if (!g) { g = make(); g.userData.shared = true; gcache.set(key, g); }
    return g;
  }
  Geo._cache = { props: pcache, geos: gcache };

  // ------------------------------------------------------------------ bake / place / scatter
  Geo.bake = function (root, opts) {
    opts = opts || {};
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const solid = [], glow = [], metal = [], keep = [];
    const m = new THREE.Matrix4();
    const take = (o, rel) => {
      const mm = Array.isArray(o.material) ? o.material[0] : o.material;
      if (o.userData.keep || !mm || !mm.color || mm.transparent || mm.map || !o.geometry || !o.geometry.attributes.position) return false;
      const g = o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
      g.morphAttributes = {};
      g.applyMatrix4(rel);
      if (mm.vertexColors && g.attributes.color) Geo.tint(g, mm.color); else Geo.colorize(g, mm.color);
      const em = mm.emissive;
      const isGlow = o.userData.glow === true || (o.userData.glow !== false && (mm.isMeshBasicMaterial || (em && em.r + em.g + em.b > 0.6)));
      (isGlow ? glow : mm.userData && mm.userData.metal ? metal : solid).push(g);
      return true;
    };
    const visit = o => {
      for (const ch of o.children.slice()) {
        if (!ch.visible) continue;
        if (ch.isMesh && !ch.isInstancedMesh && !ch.isSkinnedMesh) {
          m.multiplyMatrices(inv, ch.matrixWorld);
          if (!take(ch, m)) { keep.push(ch); continue; }
          visit(ch);
        } else if (ch.isSprite || ch.isInstancedMesh || ch.isLine || ch.isPoints || ch.isSkinnedMesh || ch.userData.keep) keep.push(ch);
        else visit(ch);
      }
    };
    if (root.isMesh && !root.isInstancedMesh) take(root, m.identity());
    visit(root);
    // main mesh: the matte parts (else the glossy, else the glow parts); the other buckets ride along as children
    const main = solid.length ? new THREE.Mesh(Geo.merge(solid), G.M.vc(opts.matOpts || undefined))
      : metal.length ? new THREE.Mesh(Geo.merge(metal), metalMat()) : new THREE.Mesh(Geo.merge(glow), glowMat());
    if (solid.length && metal.length) main.add(new THREE.Mesh(Geo.merge(metal), metalMat()));
    if ((solid.length || metal.length) && glow.length) { const gm = new THREE.Mesh(Geo.merge(glow), glowMat()); gm.userData.glow = true; main.add(gm); }
    for (const k of keep) {
      m.multiplyMatrices(inv, k.matrixWorld);
      if (k.parent) k.parent.remove(k);
      m.decompose(k.position, k.quaternion, k.scale);
      main.add(k);
    }
    main.position.copy(root.position); main.quaternion.copy(root.quaternion); main.scale.copy(root.scale);
    main.name = root.name;
    return main;
  };

  // bake() per quadrant: the root's children are split by their position around (cx, cz) and each quarter is
  // baked on its own, so a big static group (an island's props, the plaza dressing) frustum-culls per quarter
  // instead of always drawing whole. Returns the baked meshes (named root.name + '-q0..3').
  // opts.halves: split along one axis only (opts.axis 'x' | 'z', default 'x') — two culling halves for half the
  // draw calls (each part can carry a glossy and a glow child, so 4 quarters cost up to 12 calls).
  Geo.bakeQuads = function (root, opts) {
    opts = opts || {};
    const cx = opts.cx || 0, cz = opts.cz || 0, quads = [[], [], [], []], out = [], zAxis = opts.axis === 'z';
    for (const ch of root.children.slice()) {
      const ix = ch.position.x >= cx ? 1 : 0, iz = ch.position.z >= cz ? 1 : 0;
      quads[opts.halves ? (zAxis ? iz * 2 : ix) : ix + iz * 2].push(ch);
    }
    quads.forEach((list, i) => {
      if (!list.length) return;
      const g = new THREE.Group(); g.position.copy(root.position); g.quaternion.copy(root.quaternion); g.scale.copy(root.scale);
      for (const ch of list) g.add(ch);
      const m = Geo.bake(g, opts); m.name = (root.name || 'baked') + '-q' + i;
      out.push(m);
    });
    return out;
  };

  Geo.place = function (world, prop, x, y, z, rotY, parent) {
    rotY = rotY || 0;
    let mesh = prop.mesh;
    if (mesh.parent) mesh = mesh.clone();
    mesh.position.set(x, y, z); mesh.rotation.y = rotY;
    if (parent) parent.add(mesh); else if (world) world.add(mesh);
    const P = world && world.phys, items = [], cols = worldCols(prop, x, y, z, rotY);
    if (P) for (const cl of cols) { cl.item = cl.type === 'cyl' ? P.addCyl(cl.x, cl.z, cl.r, cl.y0, cl.y1, cl.tag) : P.addBox(cl.cx, cl.cy, cl.cz, cl.sx, cl.sy, cl.sz, cl.tag); items.push(cl.item); }
    const c = Math.cos(rotY), s = Math.sin(rotY), anchors = {};
    for (const k in prop.anchors || {}) { const a = prop.anchors[k]; anchors[k] = new V3(x + a.x * c + a.z * s, y + a.y, z - a.x * s + a.z * c); }
    return { mesh, items, anchors, cols };
  };

  Geo.scatter = function (o) {
    const rnd = G.rng(o.seed || 1), A = o.area, geo = o.geo;
    const count = Math.max(0, Math.round(o.count || 0));
    let colors = o.colors || null;
    const hasVC = !!geo.attributes.color;
    if (!colors && hasVC && o.color != null) colors = [o.color];
    const mat0 = o.material || (hasVC ? G.M.vc(o.matOpts || undefined) : G.M.toon(colors ? 0xffffff : (o.color != null ? o.color : 0xffffff), o.matOpts || undefined));
    const mat = G.M.inst ? G.M.inst(mat0, !!colors) : mat0;   // instanced twin of a cached material (see G.M.inst)
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new V3(), s = new V3();
    const sc = o.scale || [1, 1], tilt = o.tilt || 0, hf = o.heightFn, pts = [];
    let n = 0;
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0, ok = false;
      for (let t = 0; t < (o.tries || 8) && !ok; t++) {
        x = A.minX + rnd() * (A.maxX - A.minX); z = A.minZ + rnd() * (A.maxZ - A.minZ);
        ok = !o.avoid || !o.avoid(x, z);
        if (ok && hf && (o.minY != null || o.maxY != null)) { const h = hf(x, z); if ((o.minY != null && h < o.minY) || (o.maxY != null && h > o.maxY)) ok = false; }
        if (ok && hf && o.slopeMax != null) { const sl = Math.hypot(hf(x + 0.7, z) - hf(x - 0.7, z), hf(x, z + 0.7) - hf(x, z - 0.7)) / 1.4; if (sl > o.slopeMax) ok = false; }
      }
      if (!ok) continue;
      const y = (hf ? hf(x, z) : 0) + (o.yOffset || 0);
      const k = sc[0] + rnd() * (sc[1] - sc[0]), ry = rnd() * TAU;
      e.set((rnd() - 0.5) * 2 * tilt, ry, (rnd() - 0.5) * 2 * tilt); q.setFromEuler(e);
      m.compose(p.set(x, y, z), q, s.set(k, k, k));
      mesh.setMatrixAt(n, m);
      if (colors) mesh.setColorAt(n, C(colors[Math.floor(rnd() * colors.length)]));
      pts.push({ x, y, z, s: k, ry }); n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (mesh.computeBoundingSphere) mesh.computeBoundingSphere(); else mesh.frustumCulled = false;
    mesh.userData.points = pts;
    return mesh;
  };
  // Instanced mesh from explicit points [{x,y,z,s,ry,tilt?,color?}].
  function instancedAt(geo, mat, pts) {
    // a cached house material is swapped for its instanced twin (see G.M.inst): no per-frame program re-evaluation
    if (G.M.inst) { let col = false; for (let i = 0; i < pts.length && !col; i++) col = pts[i].color != null; mat = G.M.inst(mat, col); }
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new V3(), s = new V3();
    pts.forEach((t, i) => {
      e.set(t.tx || 0, t.ry || 0, t.tz || 0); q.setFromEuler(e);
      m.compose(p.set(t.x, t.y, t.z), q, s.set(t.s, t.sy || t.s, t.s));
      mesh.setMatrixAt(i, m);
      if (t.color != null) mesh.setColorAt(i, C(t.color));
    });
    mesh.count = pts.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (mesh.computeBoundingSphere) mesh.computeBoundingSphere(); else mesh.frustumCulled = false;
    return mesh;
  }
  Geo.instancedAt = instancedAt;

  // ================================================================== primitives (new geometry each call)
  // LOD scales primitive segment counts (buildings are generated at LOD 0.6 to stay ~6k tris).
  let LOD = 1;
  const sg = (n, min) => Math.max(min, Math.round(n * LOD));
  const P = {
    box: (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); g.deleteAttribute('uv'); return g; },
    rbox: (w, h, d, r, seg) => Geo.roundedBox(w, h, d, r, seg == null ? 1 : seg),
    cyl: (rt, rb, h, seg, open) => { const g = new THREE.CylinderGeometry(rt, rb == null ? rt : rb, h, sg(seg || 12, 6), 1, !!open); g.deleteAttribute('uv'); return g; },
    sph: (r, ws, hs) => { const g = new THREE.SphereGeometry(r, sg(ws || 12, 6), sg(hs || 8, 4)); g.deleteAttribute('uv'); return g; },
    ico: (r, d) => Geo.smooth(new THREE.IcosahedronGeometry(r, d == null ? 1 : d)),
    cap: (r, len, cs, rs) => { const g = new THREE.CapsuleGeometry(r, len, sg(cs || 3, 2), sg(rs || 10, 6)); g.deleteAttribute('uv'); return g; },
    tor: (R, t, rs, ts, arc) => { const g = new THREE.TorusGeometry(R, t, sg(rs || 8, 4), sg(ts || 20, 8), arc || TAU); g.deleteAttribute('uv'); return g; },
    cone: (r, h, seg) => { const g = new THREE.ConeGeometry(r, h, sg(seg || 12, 5)); g.deleteAttribute('uv'); return g; },
    oct: r => Geo.smooth(new THREE.OctahedronGeometry(r, 0), 10),
  };
  Geo.P = P;
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

  // ================================================================== NATURE
  const ROCK_PAL = {
    sand: { c: [0xd2785a, 0xf0b08a, 0xfbe2c0], cap: PAL.grass },
    cool: { c: [0x5a5098, 0x8e88c8, 0xcfcaf5], cap: null },
    ember: { c: [0x4e2747, 0x9a3f45, 0xff8a4c], cap: null },
    frost: { c: [0x7e78c0, 0xb8c0ee, 0xf4f6ff], cap: 0xffffff },
    moss: { c: [0x46706a, 0x78a08a, 0xb6d2b2], cap: 0x5cc86a },
    coral: { c: [0xc9624a, 0xff9a8a, 0xffdcc8], cap: null },
    slate: { c: [0x34406e, 0x5f6ea0, 0xa4b4d8], cap: null },
  };
  Geo.ROCK_PAL = ROCK_PAL;
  const rockPal = p => (p == null ? ROCK_PAL.sand : typeof p === 'string' ? (ROCK_PAL[p] || ROCK_PAL.sand) : Array.isArray(p) ? { c: p, cap: null } : p);

  function rockGeo(size, seed, pal, detail) {
    const rnd = G.rng(seed * 7 + 3);
    const g = Geo.blob(size, detail, 0.32, seed, { freq: 1.05 });
    const p = g.attributes.position;
    const sy = 0.55 + rnd() * 0.35, sx = 0.9 + rnd() * 0.35, fl = -size * 0.3;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) * sy; if (y < fl) y = fl + (y - fl) * 0.2;
      p.setXYZ(i, p.getX(i) * sx, y - fl * 0.8, p.getZ(i));
    }
    Geo.smooth(g);
    g.computeBoundingBox();
    const top = g.boundingBox.max.y;
    Geo.colorize(g, (x, y, z, nx, ny) => {
      const t = clamp(y / top, 0, 1);
      const c = ramp3(pal.c[0], pal.c[1], pal.c[2], 0.1 + t * 0.85 + vn3(x * 1.3, y * 2.5, z * 1.3, seed) * 0.14, _t3);
      if (pal.cap != null && ny > 0.6 && t > 0.45) return mixC(c, pal.cap, sstep(0.6, 0.8, ny));
      return c;
    });
    groundAO([g], 0, 0.24, top * 0.5);
    return g;
  }
  Geo.rock = function (size, seed, palette) {
    size = size || 1; seed = (seed || 1) | 0;
    const pal = rockPal(palette);
    return cached('rock|' + size.toFixed(2) + '|' + seed + '|' + JSON.stringify(pal), k => {
      const g = k.addRaw(rockGeo(size, seed, pal, size > 1.8 ? 3 : 2));
      const bb = g.boundingBox;
      k.cyl(0, 0, Math.min(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.42, bb.min.y, bb.max.y * 0.94);
      k.anchor('top', 0, bb.max.y, 0);
    });
  };
  Geo.rockGeo = (size, seed, palette, detail) => cachedGeo('rockG|' + size + '|' + seed + '|' + detail + '|' + JSON.stringify(rockPal(palette)), () => rockGeo(size, seed | 0 || 1, rockPal(palette), detail == null ? 2 : detail));
  Geo.pebbleGeo = (seed, palette) => Geo.rockGeo(0.32, seed || 1, palette, 1);

  // Mesa: stacked rounded sandstone layers, each split into two crisp wobbly colour bands
  // (6 sandstone bands top->bottom), overhanging lips, grass cap with a draped edge. Walkable top.
  Geo.mesa = function (radius, height, seed, opts) {
    opts = opts || {}; radius = radius || 8; height = height || 10; seed = (seed || 1) | 0;
    const bands = opts.bands || PAL.bands, cap = opts.cap !== undefined ? opts.cap : PAL.grass;
    const key = ['mesa', radius.toFixed(1), height.toFixed(1), seed, bands.join(','), cap, opts.seg || 0].join('|');
    return cached(key, k => {
      const rnd = G.rng(seed * 13 + 1);
      const nL = clamp(Math.round(height / 3.2), 2, 6);
      const ws = []; let tot = 0;
      for (let i = 0; i < nL; i++) { const w = 0.75 + rnd() * 0.6; ws.push(w); tot += w; }
      const deep = bands[bands.length - 1];
      const capD = cap != null ? darken(cap, 0.16) : 0;
      const prof = [], wob = [], layerOf = [], layers = [];
      const push = (r, y, col, w, L) => { prof.push([r, y, col]); wob.push(w || 0); layerOf.push(L); };
      let yc = 0;
      push(radius * 1.14, -3, deep, 0, 0);
      for (let i = 0; i < nL; i++) {
        const h = (ws[i] / tot) * height, y0 = yc, y1 = yc + h, ri = radius * (1 - i * 0.07 - rnd() * 0.025);
        const kTop = nL - 1 - i, nb = bands.length, bi = j => bands[clamp(Math.round((j * (nb - 1)) / Math.max(1, 2 * nL - 1)), 0, nb - 1)];
        const cU = bi(kTop * 2), cL = bi(kTop * 2 + 1);
        const mid = y0 + h * (0.42 + rnd() * 0.16), bw = Math.min(0.35, h * 0.12);
        push(ri * 0.94, y0 + 0.05, cL, 0, i); push(ri * 0.995, y0 + 0.22, cL, 0, i);
        push(ri * 1.0, mid - 0.02, cL, bw, i); push(ri * 1.0, mid + 0.02, cU, bw, i);
        if (i < nL - 1) {
          push(ri * 1.02, y1 - 0.34, cU, 0, i); push(ri * 1.065, y1 - 0.12, cU, 0, i); push(ri * 1.04, y1 + 0.0, cU, 0, i);
          push(ri * 0.9, y1 + 0.05, cU, 0, i);
        } else {
          push(ri * 1.02, y1 - 0.5, cU, 0, i);
          if (cap != null) {
            push(ri * 1.03, y1 - 0.4, cU, 0.12, i); push(ri * 1.03, y1 - 0.37, capD, 0.12, i);
            push(ri * 1.085, y1 - 0.22, capD, 0, i); push(ri * 1.07, y1 + 0.05, cap, 0, i);
            push(ri * 0.8, y1 + 0.22, cap, 0, i); push(ri * 0.42, y1 + 0.32, cap, 0, i); push(0, y1 + 0.34, cap, 0, i);
          } else {
            push(ri * 1.06, y1 - 0.15, cU, 0, i); push(ri * 1.0, y1 + 0.05, cU, 0, i); push(ri * 0.6, y1 + 0.2, cU, 0, i); push(0, y1 + 0.25, cU, 0, i);
          }
        }
        layers.push({ y0: i === 0 ? -3 : y0, y1, r: ri });
        yc = y1;
      }
      const g = ringStack(prof, opts.seg || 36,
        (th, y, ri) => 1 + 0.13 * circN(th, 0.9, 0, seed) + 0.06 * circN(th, 2.3, layerOf[ri] + 1, seed) + 0.022 * circN(th, 6, layerOf[ri] + 7, seed),
        (th, ri) => (wob[ri] ? wob[ri] * circN(th, 3.2, layerOf[ri] + 20, seed) : 0));
      // gentle shading on top of the ring colours: lighter tops, darker undersides, tip highlight on the cap
      const col = g.attributes.color, nrm = g.attributes.normal, pos = g.attributes.position, rTop = layers[nL - 1].r;
      const capL = cap != null ? (opts.capTip || (cap === PAL.grass ? PAL.grassTip : lighten(cap, 0.3))) : 0;
      for (let i = 0; i < col.count; i++) {
        _t1.setRGB(col.getX(i), col.getY(i), col.getZ(i));
        const ny = nrm.getY(i);
        if (cap != null && prof[g.userData.ring[i]][2] === cap) { const rr = Math.hypot(pos.getX(i), pos.getZ(i)) / rTop; _t1.lerp(C(capL), clamp((1 - rr) * 0.9, 0, 0.8)); }
        else if (ny < -0.3) _t1.lerp(C(deep), 0.28);
        else if (ny > 0.45) _t1.lerp(C(0xffffff), 0.12);
        col.setXYZ(i, _t1.r, _t1.g, _t1.b);
      }
      groundAO([g], 0, 0.2, 2.6);
      k.addRaw(g);
      for (const L of layers) k.cyl(0, 0, L.r * 0.93, L.y0, L.y1);
      k.c[k.c.length - 1].y1 = height + 0.26;
      k.anchor('top', 0, height + 0.3, 0);
    });
  };

  // Natural sandstone arch: two wobbly pillars + a noisy half-torus with a grassy top.
  Geo.pillarArch = function (span, height, seed, opts) {
    opts = opts || {}; span = span || 10; height = height || 6; seed = (seed || 1) | 0;
    const bands = opts.bands || PAL.bands, cap = opts.cap !== undefined ? opts.cap : PAL.grass;
    const lite = !!opts.lite; // fewer segments for set dressing seen from afar (~45% of the triangles)
    return cached(['arch', span.toFixed(1), height.toFixed(1), seed, bands.join(','), cap, lite].join('|'), k => {
      const t = opts.thick || clamp(span * 0.11, 0.8, 2.2);
      const parts = [];
      const topY = height + span / 2 + t * 1.3, bH = topY / bands.length, pb = [];
      for (let i = bands.length - 1; i >= 0; i--) pb.push([topY - (i + 1) * bH, bands[i]]);
      pb[0][0] = -10;
      for (const sx of [-1, 1]) {
        const g = ringStack(banded([[t * 1.4, -1.5], [t * 1.32, 0], [t * 1.12, height * 0.3], [t * 1.2, height * 0.56], [t * 1.0, height * 0.82], [t * 1.06, height + 0.2], [t * 0.85, height + t * 0.7]], pb, 0.03), lite ? 10 : 16,
          (th, y, ri) => 1 + 0.12 * circN(th, 1.4, (sx > 0 ? 9 : 0), seed) + 0.04 * circN(th, 4, ri * 0.3, seed),
          (th, ri) => 0.18 * circN(th, 2.5, (sx > 0 ? 3 : 7), seed));
        g.translate(sx * span / 2, 0, 0);
        parts.push(g);
        k.cyl(sx * span / 2, 0, t * 1.05, -1.5, height + 0.4);
      }
      const arc = lite ? P.tor(span / 2, t, 8, 18, PI) : P.tor(span / 2, t, 12, 28, PI);
      const ap = arc.attributes.position, v = new V3();
      for (let i = 0; i < ap.count; i++) {
        v.fromBufferAttribute(ap, i);
        const ang = Math.atan2(v.y, v.x), cx = Math.cos(ang) * span / 2, cy = Math.sin(ang) * span / 2;
        const th = 1 + 0.2 * vn3(v.x * 0.45, v.y * 0.45, v.z * 0.45, seed + 3) + 0.12 * Math.sin(ang);
        ap.setXYZ(i, cx + (v.x - cx) * th, height + cy + (v.y - cy) * th, v.z * th);
      }
      const arcG = Geo.smooth(arc);
      const top = height + span / 2 + t * 1.3, bandH = top / bands.length;
      Geo.colorize(arcG, (x, y, z, nx, ny) => {
        if (cap != null && ny > 0.55 && y > height + span * 0.28) return mixC(cap, PAL.grassTip, clamp((ny - 0.55) * 2, 0, 1));
        const wob = vn3(x * 0.4, y * 0.25, z * 0.4, seed) * 0.4 * bandH;
        return C(bands[clamp(Math.floor((top - y + wob) / bandH), 0, bands.length - 1)]);
      });
      parts.push(arcG);
      k.addRaw(Geo.merge(parts));
      for (let i = 0; i < 5; i++) { const a = PI * (0.1 + (0.8 * i) / 4); k.box(Math.cos(a) * span / 2, height + Math.sin(a) * span / 2, 0, t * 1.7, t * 1.7, t * 1.9); }
      k.anchor('top', 0, height + span / 2 + t, 0);
    });
  };

  // ---- coral (0 fan, 1 tubes, 2 branching, 3 brain, 4 bubbles)
  function coralGeo(kind, color, seed) {
    kind = (((kind | 0) % 5) + 5) % 5;
    color = color != null ? color : PAL.coral[kind];
    const base = darken(color, 0.3), tip = lighten(color, 0.42), hole = darken(color, 0.5);
    const grad = (y0, y1) => (x, y) => ramp3(base, color, tip, clamp((y - y0) / (y1 - y0), 0, 1));
    const rnd = G.rng((seed || 0) * 97 + (kind + 1) * 31);
    const parts = [];
    if (kind === 0) {
      const holes = [[0.45, 0.9], [0.45, 1.57], [0.45, 2.25], [0.76, 0.7], [0.76, 1.25], [0.76, 1.9], [0.76, 2.45]];
      const mk = (sc, rot, off, withHoles) => {
        const s = new THREE.Shape();
        s.moveTo(-0.07, 0); s.lineTo(0.07, 0);
        const N = 7;
        for (let i = 0; i <= N; i++) {
          const a = lerp(0.42, PI - 0.42, i / N), x = Math.cos(a) * 0.72, y = 0.18 + Math.sin(a) * 0.82;
          if (i === 0) s.lineTo(x, y);
          else { const am = lerp(0.42, PI - 0.42, (i - 0.5) / N); s.quadraticCurveTo(Math.cos(am) * 0.86, 0.18 + Math.sin(am) * 0.98, x, y); }
        }
        s.lineTo(-0.07, 0);
        if (withHoles) for (const [rr, a] of holes) { const hp = new THREE.Path(); hp.absarc(Math.cos(a) * 0.72 * rr, 0.18 + Math.sin(a) * 0.82 * rr, 0.055 + rnd() * 0.025, 0, TAU, true); s.holes.push(hp); }
        const g = extrude(s, 0.05, 0.014, 3, 1);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.32 * p.getX(i) * p.getX(i));
        Geo.smooth(g, 55);
        xf(g, off, 0, 0, 0, rot, 0, sc);
        return Geo.colorize(g, grad(0, 1.05 * sc));
      };
      parts.push(mk(1, 0, 0, true), mk(0.68, 0.8, 0.14, false));
      parts.push(Geo.colorize(xf(P.cyl(0.07, 0.12, 0.26, 7), 0, 0.08, 0), base));
    } else if (kind === 1) {
      const n = 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rnd() * 0.5, d = i === 0 ? 0 : 0.18 + rnd() * 0.12;
        const r = 0.09 + rnd() * 0.06, h = (0.5 + rnd() * 0.65) * (i === 0 ? 1.35 : 1);
        const g = ringStack([[r * 1.3, -0.05], [r, h * 0.35], [r * 1.06, h * 0.82], [r * 1.32, h], [r * 1.12, h + 0.03], [r * 0.8, h * 0.94], [0, h * 0.88]], 10);
        Geo.colorize(g, (x, y, z) => (Math.hypot(x, z) < r * 0.9 && y > h * 0.86 ? C(hole) : ramp3(base, color, tip, clamp(y / h, 0, 1))));
        xf(g, Math.cos(a) * d, 0, Math.sin(a) * d, (rnd() - 0.5) * 0.35, 0, (rnd() - 0.5) * 0.35);
        parts.push(g);
      }
    } else if (kind === 2) {
      const gr = grad(0, 1.25);
      const rec = (a, dir, len, r, depth) => {
        const b = a.clone().addScaledVector(dir, len);
        parts.push(Geo.colorize(tubeAB(a, b, r, r * 0.8, 6), gr));
        if (depth === 0) { parts.push(Geo.colorize(xf(P.sph(r * 1.25, 6, 4), b.x, b.y, b.z), tip)); return; }
        parts.push(Geo.colorize(xf(P.sph(r * 0.84, 6, 3), b.x, b.y, b.z), gr));
        for (let i = 0; i < 2; i++) {
          const th = rnd() * TAU + i * PI, ax = new V3(Math.cos(th), 0, Math.sin(th));
          const nd = dir.clone().applyAxisAngle(ax, 0.45 + rnd() * 0.4);
          if (nd.y < 0.3) nd.y = 0.3;
          rec(b, nd.normalize(), len * (0.7 + rnd() * 0.15), r * 0.74, depth - 1);
        }
      };
      rec(new V3(0, -0.05, 0), new V3(0, 1, 0), 0.4, 0.11, 3);
    } else if (kind === 3) {
      const g = new THREE.IcosahedronGeometry(1, 2); g.deleteAttribute('uv');
      const p = g.attributes.position, ridge = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const rd = 1 - Math.abs(vn3(x * 2.4 + 3, y * 2.4, z * 2.4, (seed || 0) + 41));
        ridge[i] = rd;
        const k = 0.5 * (1 + 0.14 * rd * rd);
        p.setXYZ(i, x * k, Math.max(y * k * 0.66, -0.06) + 0.06, z * k);
      }
      Geo.smooth(g);
      Geo.colorize(g, (x, y, z, nx, ny, nz, i) => mixC(base, tip, clamp(ridge[i] * ridge[i] * 1.1 + y * 0.4, 0, 1)));
      parts.push(g);
    } else {
      const n = 6 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, d = i === 0 ? 0 : 0.12 + rnd() * 0.25, h = 0.15 + rnd() * 0.45 + (i === 0 ? 0.3 : 0), r = 0.09 + rnd() * 0.09;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        parts.push(Geo.colorize(tubeAB(new V3(x * 0.3, 0, z * 0.3), new V3(x, h, z), 0.045, 0.03, 5), base));
        parts.push(Geo.colorize(xf(P.sph(r, 8, 5), x, h + r * 0.75, z), (px, py, pz, nx, ny) => mixC(color, tip, clamp(ny * 0.6 + 0.35, 0, 1))));
      }
    }
    return Geo.merge(parts);
  }
  Geo.coralGeo = (kind, color, seed) => cachedGeo('coral|' + kind + '|' + color + '|' + (seed || 0), () => coralGeo(kind, color, seed));
  Geo.coral = function (kind, color, size, seed) {
    size = size || 1;
    return cached(['coralP', kind, color, size.toFixed(2), seed || 0].join('|'), k => {
      k.add(coralGeo(kind, color, seed), null, 0, 0, 0, 0, 0, 0, size);
      k.cyl(0, 0, 0.32 * size, 0, 0.9 * size);
    });
  };

  // ---- mushroom
  // lite: true = a small dressing mushroom (cheapest: fewer rings, 4 low-poly spots, no gill ring);
  // 'glow' = the same lite build but its glow keeps the gill ring (the glow set of the giant mushrooms)
  function mushroomParts(cap, glowCol, seed, lite) {
    const tiny = lite === true;
    lite = !!lite;
    const rnd = G.rng((seed || 5) * 11 + 1);
    const capD = darken(cap, 0.2), capL = lighten(cap, 0.38), gill = mixHex(PAL.stem, cap, 0.22), stemD = mixHex(PAL.stem, 0xd9a86c, 0.45);
    const lean = (rnd() - 0.5) * 0.22;
    const stem = ringStack(lite ? [[0.25, -0.05], [0.17, 0.5], [0.17, 0.98], [0, 1.0]] : [[0.25, -0.05], [0.2, 0.22], [0.155, 0.65], [0.17, 0.98], [0, 1.0]], lite ? 7 : 12);
    const sp = stem.attributes.position;
    for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); sp.setX(i, sp.getX(i) + lean * y * y); }
    stem.computeVertexNormals();
    Geo.colorize(stem, (x, y) => mixC(stemD, PAL.stem, clamp(y * 1.4, 0, 1)));
    const capG = ringStack(lite ? [[0.13, 0.96], [0.6, 0.94], [0.68, 1.06], [0.56, 1.32], [0.3, 1.5], [0, 1.54]] : [[0.13, 0.96], [0.42, 0.93], [0.6, 0.95], [0.68, 1.02], [0.67, 1.12], [0.58, 1.3], [0.4, 1.45], [0.2, 1.52], [0, 1.54]], lite ? 11 : 18,
      th => 1 + 0.035 * circN(th, 2, 0, seed || 5));
    capG.translate(lean, 0, 0);
    Geo.colorize(capG, (x, y, z, nx, ny) => (ny < -0.15 && y < 1.0 ? C(gill) : ramp3(capD, cap, capL, clamp((y - 0.95) / 0.6, 0, 1))));
    const spots = [];
    const n = new V3();
    const nSp = lite ? 4 : 7;
    for (let i = 0; i < nSp; i++) {
      const phi = (i / nSp) * TAU + rnd() * 0.5, th = i === 0 ? 0.05 : 0.45 + rnd() * 0.6;
      const a = 0.66, b = 0.52;
      const px = a * Math.sin(th) * Math.cos(phi), py = 1.02 + b * Math.cos(th), pz = a * Math.sin(th) * Math.sin(phi);
      n.set((Math.sin(th) * Math.cos(phi)) / a, Math.cos(th) / b, (Math.sin(th) * Math.sin(phi)) / a).normalize();
      let g;
      if (tiny) { g = new THREE.SphereGeometry(0.09 + rnd() * 0.05, 5, 3); g.deleteAttribute('uv'); }
      else g = lite ? P.sph(0.09 + rnd() * 0.05, 5, 3) : P.sph(0.07 + rnd() * 0.05, 7, 4);
      g.scale(1, 0.4, 1);
      _q.setFromUnitVectors(UP, n);
      g.applyMatrix4(_m4.compose(_p.set(px + lean, py, pz), _q, _s.set(1, 1, 1)));
      spots.push(Geo.colorize(g, glowCol != null ? glowCol : 0xfffaf0));
    }
    // glowing mushrooms also light their gills: a soft ring under the cap
    if (glowCol != null && !tiny) spots.push(Geo.colorize(xf(P.tor(0.38, 0.1, 3, lite ? 8 : 12), lean, 0.95, 0, PI / 2, 0, 0, 1, 1, 0.35), mixHex(glowCol, 0xffffff, 0.25)));
    return glowCol != null ? { solid: Geo.merge([stem, capG]), glow: Geo.merge(spots) } : { solid: Geo.merge([stem, capG].concat(spots)), glow: null };
  }
  Geo.mushroomParts = (cap, glowCol, seed, lite) => {
    const key = 'mush|' + cap + '|' + glowCol + '|' + (seed || 0) + '|' + (lite === true ? 'lite' : lite || '');
    let d = gcache.get(key);
    if (!d) { d = mushroomParts(cap, glowCol, seed, lite); d.solid.userData.shared = true; if (d.glow) d.glow.userData.shared = true; gcache.set(key, d); }
    return d;
  };
  Geo.mushroom = function (size, capColor, opts) {
    size = size || 1; capColor = capColor != null ? capColor : PAL.mushCap; opts = opts || {};
    const gc = opts.glow ? (opts.glow === true ? PAL.nightGlow : opts.glow) : null;
    return cached(['mushP', size.toFixed(2), capColor, gc, opts.seed || 0].join('|'), k => {
      const d = mushroomParts(capColor, gc, opts.seed || 0);
      k.add(d.solid, null, 0, 0, 0, 0, 0, 0, size);
      if (d.glow) k.glow(d.glow, null, 0, 0, 0, 0, 0, 0, size);
      k.cyl(0, 0, 0.19 * size, 0, 1.0 * size);
      if (size >= 1.2) k.cyl(0, 0, 0.62 * size, 0.97 * size, 1.48 * size);
      k.anchor('top', 0, 1.5 * size, 0);
    });
  };

  // ---- trees
  const CANOPY = {
    green: [0x3e9e57, 0x6ccb5f, 0xb4e66e], mint: [0x2a9c84, 0x5fd6a8, 0xbaf2d6], pink: [0xd8679a, 0xff9ac0, 0xffd6e6],
    peach: [0xe07a48, 0xffb37a, 0xffe2b8], lime: [0x6fae38, 0xb6e05a, 0xeaf8a6], lilac: [0x7c62cc, 0xb39aff, 0xe4d8ff],
    teal: [0x1d6e58, 0x2f9e6a, 0x74d48e], autumn: [0xd0583a, 0xff8a4c, 0xffc878], pine: [0x23705a, 0x379a6c, 0x7fd08a],
    ember: [0x8a2f4a, 0xe0604a, 0xffa86a], frost: [0x6a78c8, 0x9ab0f0, 0xe8eeff], candy: [0xff9ac0, 0xb0f0d0, 0xd8c8ff],
  };
  Geo.CANOPY = CANOPY;
  const canopyCol = (pal, cy, r) => (x, y, z, nx, ny) => ramp3(pal[0], pal[1], pal[2], clamp(0.48 + ny * 0.36 + ((y - cy) / r) * 0.24, 0, 1));
  function trunkGeo(h, r0, r1, lean, seed, c0, c1) {
    const g = ringStack([[r0 * 1.45, -0.25], [r0 * 1.12, 0.14], [r0, h * 0.25], [lerp(r0, r1, 0.6), h * 0.7], [r1, h], [0, h + 0.05]], 9,
      (th, y) => 1 + 0.09 * circN(th, 1.5, Math.floor(y * 2), seed));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = Math.max(0, p.getY(i)) / h; p.setX(i, p.getX(i) + lean * t * t); }
    g.computeVertexNormals();
    return Geo.colorize(g, (x, y) => mixC(c0, c1, clamp(y / h, 0, 1)));
  }
  function frondGeo(len, w, droop, c0, c1, rows) {
    const N = rows || 7, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = t * len, y = Math.sin(t * PI * 0.55) * len * 0.22 - t * t * droop;
      const ww = w * Math.pow(Math.sin(Math.min(1, t * 1.1 + 0.05) * PI), 0.7) + 0.015, f = ww * 0.32;
      pos.push(x, y - f * 0.3, -ww, x, y + f, 0, x, y - f * 0.3, ww);
    }
    for (let i = 0; i < N; i++) { const a = i * 3; idx.push(a, a + 4, a + 3, a, a + 1, a + 4, a + 1, a + 5, a + 4, a + 1, a + 2, a + 5); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    Geo.colorize(g, (x, y, z, nx, ny, nz, i) => mixC(c0, c1, clamp(x / len + (i % 3 === 1 ? 0.15 : 0), 0, 1)));
    return Geo.merge([g, flipCopy(g)]);
  }
  function treeGeo(kind, seed, o) {
    o = o || {};
    const rnd = G.rng((seed || 1) * 7919 + kind.length);
    const parts = [];
    let trunkH = 2.4, trunkR = 0.3;
    if (kind === 'palm') {
      // o.lite: a cheaper palm for big stands (beach belts): 5 trunk rings, 6 sides, 7 fronds of 5 rows
      const H = 4.2 + rnd() * 1.4, lean = 0.6 + rnd() * 0.9, la = rnd() * TAU, N = o.lite ? 5 : 6;
      const pt = t => new V3(Math.cos(la) * lean * t * t, t * H, Math.sin(la) * lean * t * t);
      for (let i = 0; i < N; i++) {
        const a = pt(i / N), b = pt((i + 1) / N), r = lerp(0.26, 0.15, i / N);
        parts.push(Geo.colorize(tubeAB(a, b, r * 1.12, r * 0.86, o.lite ? 6 : 7), (x, y) => mixC(i % 2 ? 0xc98b55 : 0xb07a4a, 0xe8b07a, clamp((y - a.y) / (b.y - a.y) - 0.6, 0, 1) * 1.6)));
      }
      const top = pt(1);
      const pal = CANOPY[o.palette] || CANOPY.green;
      const fr = frondGeo(2.4, 0.36, 1.25, pal[0], pal[2], o.lite ? 5 : 7);
      const nF = o.lite ? 7 : 8;
      for (let i = 0; i < nF; i++) {
        const g = fr.clone();
        xf(g, 0, 0, 0, 0, 0, 0.25 + rnd() * 0.25);
        xf(g, top.x, top.y + 0.05, top.z, 0, (i / nF) * TAU + rnd() * 0.3, 0);
        parts.push(g);
      }
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; parts.push(Geo.colorize(xf(P.sph(0.15, 6, 4), top.x + Math.cos(a) * 0.18, top.y - 0.15, top.z + Math.sin(a) * 0.18), 0x8a5a3a)); }
      parts.push(Geo.colorize(xf(P.sph(0.2, 6, 4), top.x, top.y, top.z), pal[0]));
      trunkH = H * 0.7; trunkR = 0.24;
    } else if (kind === 'pine') {
      const pal = CANOPY[o.palette] || CANOPY.pine, tiers = 4, s = 0.9 + rnd() * 0.2;
      parts.push(trunkGeo(1.3, 0.24, 0.18, 0, seed, 0x8a5a3a, 0xb07a4a));
      for (let i = 0; i < tiers; i++) {
        const y0 = 0.9 + i * 0.95 * s, r = (1.65 - i * 0.34) * s, th = 1.55 * s;
        const g = ringStack([[0, y0], [r * 0.9, y0 + 0.02], [r, y0 + 0.2], [r * 0.82, y0 + 0.42], [r * 0.45, y0 + th * 0.74], [0, y0 + th]], 14,
          (a, y, ri) => 1 + (ri > 0 && ri < 4 ? 0.1 * circN(a * 1, 2.5, i, seed) + 0.06 * Math.sin(a * 7 + i) : 0));
        Geo.colorize(g, (x, y, z, nx, ny) => {
          const c = ramp3(pal[0], pal[1], pal[2], clamp(0.35 + ny * 0.3 + (y - y0) / th * 0.45, 0, 1));
          return o.snow && ny > 0.35 && y > y0 + 0.25 ? mixC(c, 0xf6f4ff, sstep(0.35, 0.6, ny)) : c;
        });
        parts.push(g);
      }
      trunkH = 1.4; trunkR = 0.24;
    } else if (kind === 'candy') {
      const h = 2.4 + rnd() * 0.6, lean = (rnd() - 0.5) * 0.4;
      const tr = trunkGeo(h, 0.24, 0.17, lean, seed, 0xffffff, 0xffffff);
      Geo.colorize(tr, (x, y, z) => (Math.sin(Math.atan2(z, x - lean * (y / h) * (y / h)) * 2 + y * 5) > 0 ? C(0xff7aa8) : C(0xfff6fa)));
      parts.push(tr);
      const pal = CANOPY[o.palette] || CANOPY.candy;
      const blobs = [[0, h + 1.0, 0, 1.25], [0.75, h + 0.45, 0.35, 0.8], [-0.7, h + 0.55, -0.3, 0.75]];
      blobs.forEach((b, i) => {
        const col = pal[i % pal.length];
        const g = Geo.blob(b[3], 2, 0.06, seed * 5 + i);
        xf(g, b[0] + lean, b[1], b[2]);
        Geo.colorize(g, (x, y, z, nx, ny) => {
          const st = Math.sin(Math.atan2(z - b[2], x - b[0] - lean) * 3 + (y - b[1]) * 4) > 0.45;
          return st ? mixC(col, 0xffffff, 0.75) : mixC(darken(col, 0.12), lighten(col, 0.3), clamp(0.5 + ny * 0.5, 0, 1));
        });
        parts.push(g);
      });
      trunkH = h; trunkR = 0.24;
    } else { // round
      const pals = o.palette ? [o.palette] : ['green', 'green', 'mint', 'lime', 'pink', 'peach'];
      const pal = CANOPY[pick(rnd, pals)] || CANOPY.green;
      const h = 2.2 + rnd() * 0.8, lean = (rnd() - 0.5) * 0.7;
      parts.push(trunkGeo(h, 0.3, 0.2, lean, seed, 0x8a5a3a, 0xc98b55));
      const blobs = [[lean, h + 1.0, 0, 1.55 + rnd() * 0.3, 2]];
      const nb = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < nb; i++) { const a = (i / nb) * TAU + rnd() * 0.6; blobs.push([lean + Math.cos(a) * 1.05, h + 0.45 + rnd() * 0.7, Math.sin(a) * 1.05, 0.85 + rnd() * 0.3, 1]); }
      blobs.push([lean + (rnd() - 0.5) * 0.5, h + 2.0, (rnd() - 0.5) * 0.5, 0.95, 1]);
      const cc = canopyCol(pal, h + 1.1, 1.9);
      blobs.forEach((b, i) => { const g = Geo.blob(b[3], b[4], 0.13, seed * 3 + i); xf(g, b[0], b[1], b[2]); parts.push(Geo.colorize(g, cc)); });
      trunkH = h; trunkR = 0.3;
    }
    const g = Geo.merge(parts);
    g.userData.trunk = { h: trunkH, r: trunkR };
    return g;
  }
  Geo.treeGeo = (kind, seed, o) => cachedGeo('tree|' + kind + '|' + (seed || 1) + '|' + JSON.stringify(o || {}), () => treeGeo(kind || 'round', seed || 1, o));
  Geo.tree = function (kind, size, seed, opts) {
    kind = kind || 'round'; size = size || 1; seed = seed || 1;
    return cached(['treeP', kind, size.toFixed(2), seed, JSON.stringify(opts || {})].join('|'), k => {
      const g = treeGeo(kind, seed, opts);
      const t = g.userData.trunk;
      k.add(g, null, 0, 0, 0, 0, 0, 0, size);
      k.cyl(0, 0, t.r * 1.1 * size, 0, t.h * size);
    });
  };

  // ---- crystal cluster (faceted, self-lit)
  const CRYSTAL_MAT = { emissive: 0xffffff, ei: 0.12, flat: true, spec: 0.5, rimStr: 0.6 };
  function crystalGeo(seed, color) {
    const rnd = G.rng((seed || 3) * 131 + 7), parts = [];
    const n = 4 + Math.floor(rnd() * 3);
    const dark = darken(color, 0.35), light = lighten(color, 0.6);
    for (let i = 0; i < n; i++) {
      const main = i === 0, h = main ? 1.15 : 0.4 + rnd() * 0.55, r = main ? 0.22 : 0.09 + rnd() * 0.08;
      const g = Geo.merge([xf(P.cyl(r, r * 1.1, h, 6), 0, h / 2, 0), xf(P.cone(r, r * 1.7, 6), 0, h + r * 0.85, 0)]);
      const a = rnd() * TAU, tilt = main ? rnd() * 0.15 : 0.35 + rnd() * 0.45, d = main ? 0 : 0.12 + rnd() * 0.14;
      xf(g, Math.cos(a) * d, -0.05, Math.sin(a) * d, Math.sin(a) * tilt, rnd() * 1, -Math.cos(a) * tilt);
      parts.push(Geo.colorize(g, (x, y) => ramp3(dark, color, light, clamp(y / 1.45, 0, 1))));
    }
    const base = rockGeo(0.32, (seed || 3) + 5, ROCK_PAL.slate, 1);
    base.scale(1.1, 0.5, 1.1);
    parts.push(base);
    return Geo.merge(parts);
  }
  Geo.CRYSTAL_MAT = CRYSTAL_MAT;
  Geo.crystalGeo = (seed, color) => cachedGeo('crys|' + (seed || 3) + '|' + color, () => crystalGeo(seed, color));
  Geo.crystal = function (size, color, seed, opts) {
    size = size || 1; color = color != null ? color : 0x7af0ff; opts = opts || {};
    return cached(['crysP', size.toFixed(2), color, seed || 3, !!opts.halo].join('|'), k => {
      k.add(crystalGeo(seed, color), null, 0, 0, 0, 0, 0, 0, size);
      k.cyl(0, 0, 0.35 * size, 0, 1.2 * size);
      if (opts.halo) k.sprite(color, 2.6 * size, 0, 0.8 * size, 0, 0.45);
    }, CRYSTAL_MAT);
  };

  // ---- bush / flowers / grass
  function bushGeo(seed, color, berry) {
    const rnd = G.rng((seed || 9) * 53 + 1);
    color = color != null ? color : PAL.grass;
    const c0 = darken(color, 0.32), c2 = lighten(color, 0.35), parts = [];
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(), d = i === 0 ? 0 : 0.38 + rnd() * 0.12, r = i === 0 ? 0.64 : 0.44 + rnd() * 0.14;
      const g = Geo.blob(r, 1, 0.16, (seed || 9) * 3 + i);
      xf(g, Math.cos(a) * d, r * 0.72, Math.sin(a) * d, 0, 0, 0, 1, 0.86, 1);
      parts.push(g);
    }
    const g = Geo.merge(parts);
    Geo.colorize(g, (x, y, z, nx, ny) => ramp3(c0, color, c2, clamp(0.3 + ny * 0.42 + y * 0.32, 0, 1)));
    if (berry != null) {
      const bs = [];
      for (let i = 0; i < 5; i++) { const a = rnd() * TAU, y = 0.55 + rnd() * 0.45, r = 0.6 + 0.12 * (1 - y); bs.push(Geo.colorize(xf(P.sph(0.075, 6, 3), Math.cos(a) * r, y, Math.sin(a) * r), berry)); }
      return Geo.merge([g].concat(bs));
    }
    return g;
  }
  Geo.bushGeo = (seed, color, berry) => cachedGeo('bush|' + (seed || 9) + '|' + color + '|' + berry, () => bushGeo(seed, color, berry));
  Geo.bush = function (size, color, seed, berry) {
    size = size || 1;
    return cached(['bushP', size.toFixed(2), color, seed || 9, berry].join('|'), k => {
      k.add(bushGeo(seed, color, berry), null, 0, 0, 0, 0, 0, 0, size);
      k.cyl(0, 0, 0.7 * size, 0, 1.0 * size);
    });
  };
  function petalDisc(r, col, lobes, centre) {
    lobes = lobes || 5;
    const N = lobes * 3, pos = [0, 0.012, 0], idx = [];
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU, rr = r * (0.5 + 0.5 * Math.abs(Math.cos((a * lobes) / 2))); pos.push(Math.cos(a) * rr, 0.035 * (rr / r), Math.sin(a) * rr); }
    for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const cl = centre != null ? centre : lighten(col, 0.55);
    return Geo.colorize(g, (x, y, z) => mixC(cl, col, clamp((Math.hypot(x, z) / r) * 2.2 - 0.25, 0, 1)));
  }
  function flowerGeo(seed, colors) {
    colors = colors || [0xff7a93, 0xffd45c, 0xffffff, 0xb983ff, 0xff8a4c];
    const rnd = G.rng((seed || 4) * 17 + 3), parts = [];
    const n = 4 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = rnd() * 0.45, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.2 + rnd() * 0.24;
      const col = colors[Math.floor(rnd() * colors.length)];
      parts.push(Geo.colorize(xf(P.cyl(0.018, 0.024, h, 3, true), x, h / 2, z), PAL.grassDark));
      const tx = (rnd() - 0.5) * 0.5, tz = (rnd() - 0.5) * 0.5;
      parts.push(xf(petalDisc(0.1 + rnd() * 0.05, col, 5, col === 0xffd45c ? 0xff8a4c : 0xffd23f), x, h, z, tx, rnd() * TAU, tz));
    }
    return Geo.merge(parts);
  }
  Geo.flowerGeo = (seed, colors) => cachedGeo('flow|' + (seed || 4) + '|' + (colors || []).join(','), () => flowerGeo(seed, colors));
  Geo.flowerPatch = function (seed, colors) { return cached('flowP|' + (seed || 4) + '|' + (colors || []).join(','), k => { k.addRaw(flowerGeo(seed, colors)); }); };
  function tuftGeo(seed, base, tip) {
    const rnd = G.rng((seed || 2) * 29 + 5), pos = [], col = [];
    const cb = C(base != null ? base : PAL.grassDark), ct = C(tip != null ? tip : PAL.grassTip);
    for (let i = 0; i < 7; i++) {
      const a = rnd() * TAU, d = rnd() * 0.13, x = Math.cos(a) * d, z = Math.sin(a) * d;
      const h = 0.26 + rnd() * 0.32, w = 0.045 + rnd() * 0.03, fa = rnd() * TAU, lean = 0.08 + rnd() * 0.15;
      const px = -Math.sin(fa) * w, pz = Math.cos(fa) * w, tx = x + Math.cos(fa) * lean, tz = z + Math.sin(fa) * lean;
      pos.push(x - px, 0, z - pz, x + px, 0, z + pz, tx, h, tz, x - px, 0, z - pz, tx, h, tz, x + px, 0, z + pz);
      col.push(cb.r, cb.g, cb.b, cb.r, cb.g, cb.b, ct.r, ct.g, ct.b, cb.r, cb.g, cb.b, ct.r, ct.g, ct.b, cb.r, cb.g, cb.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const nor = new Float32Array(pos.length); for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  Geo.grassTuftGeo = (seed, base, tip) => cachedGeo('tuft|' + (seed || 2) + '|' + base + '|' + tip, () => tuftGeo(seed, base, tip));
  Geo.grassTuft = Geo.grassTuftGeo;

  // ---- clouds (fog-free so they read against the sky at any distance)
  function cloudGeo(seed) {
    const rnd = G.rng((seed || 1) * 71 + 9), parts = [];
    const puffs = [[-1.25, 0, 0, 0.7], [-0.45, 0.15, 0.1, 1.05], [0.5, 0.1, -0.1, 1.0], [1.35, -0.05, 0.05, 0.65], [0.05, 0.75, 0, 0.8]];
    for (const pf of puffs) {
      const r = pf[3] * (0.85 + rnd() * 0.3);
      const g = Geo.blob(r, pf[3] > 0.9 ? 2 : 1, 0.08, (seed || 1) * 5 + parts.length);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -r * 0.25) p.setY(i, -r * 0.25 + (y + r * 0.25) * 0.35); }
      Geo.smooth(g);
      xf(g, pf[0], pf[1], pf[2] + (rnd() - 0.5) * 0.4);
      parts.push(g);
    }
    const g = Geo.merge(parts);
    return Geo.colorize(g, (x, y, z, nx, ny) => ramp3(0xd2daf6, 0xeaf1ff, 0xffffff, clamp(0.5 + ny * 0.6 + y * 0.2, 0, 1)));
  }
  Geo.cloudGeo = seed => cachedGeo('cloud|' + (seed || 1), () => cloudGeo(seed));
  Geo.cloudMat = tint => noFogMat({ rimStr: 0.35, rimColor: tint != null ? lighten(tint, 0.5) : 0xffffff, emissive: tint != null ? tint : 0xffffff, ei: 0.16 });
  Geo.cloudPuff = function (size, seed) {
    const mesh = new THREE.Mesh(Geo.cloudGeo(seed), Geo.cloudMat());
    mesh.scale.setScalar(size || 6);
    return { mesh, colliders: [], anchors: {} };
  };

  // ---- beach decor
  function starfishGeo(color) {
    color = color != null ? color : 0xff8a4c;
    const g = extrude(starShape(0.2, 0.085, 5), 0.05, 0.03, 4, 2);
    xf(g, 0, 0.035, 0, -PI / 2, 0, 0, 1, 1, 0.9);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); if (p.getY(i) > 0.03) p.setY(i, p.getY(i) + 0.03 * (1 - r / 0.23)); }
    Geo.smooth(g, 55);
    const cl = lighten(color, 0.4);
    return Geo.colorize(g, (x, y, z) => mixC(cl, color, clamp(Math.hypot(x, z) / 0.18, 0, 1)));
  }
  function shellGeo(color) {
    color = color != null ? color : 0xffd8e6;
    const s = new THREE.Shape(), N = 7;
    s.moveTo(-0.04, 0); s.lineTo(0.04, 0);
    for (let i = 0; i <= N; i++) {
      const a = lerp(0.25, PI - 0.25, i / N), x = Math.cos(a) * 0.18, y = Math.sin(a) * 0.2;
      if (!i) s.lineTo(x, y); else { const am = lerp(0.25, PI - 0.25, (i - 0.5) / N); s.quadraticCurveTo(Math.cos(am) * 0.215, Math.sin(am) * 0.235, x, y); }
    }
    s.lineTo(-0.04, 0);
    const g = extrude(s, 0.03, 0.015, 2, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); if (p.getZ(i) > 0) p.setZ(i, p.getZ(i) + 0.06 * Math.max(0, 1 - (x * x + (y - 0.06) * (y - 0.06)) / 0.04)); }
    Geo.smooth(g, 55);
    xf(g, 0, 0.03, 0.08, -PI / 2 + 0.25, 0, 0);
    const cd = darken(color, 0.18), cl = lighten(color, 0.4);
    return Geo.colorize(g, (x, y, z) => { const a = Math.atan2(-(z - 0.08), x); return Math.sin(a * 14) > 0.2 ? C(cl) : C(cd); });
  }
  Geo.starfishGeo = color => cachedGeo('star|' + color, () => starfishGeo(color));
  Geo.shellGeo = color => cachedGeo('shell|' + color, () => shellGeo(color));
  Geo.starfish = color => cached('starP|' + color, k => { k.addRaw(starfishGeo(color)); });
  Geo.shell = color => cached('shellP|' + color, k => { k.addRaw(shellGeo(color)); });

  // ---- giant flower
  Geo.bigFlower = function (color, size) {
    color = color != null ? color : 0xff7a93; size = size || 1;
    return cached(['bigF', color, size.toFixed(2)].join('|'), k => {
      const pts = [new V3(0, 0, 0), new V3(0.12, 0.9, 0.02), new V3(-0.04, 1.8, 0.08), new V3(0.08, 2.5, 0.22)];
      const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.075, 5, false); stem.deleteAttribute('uv');
      k.add(Geo.colorize(stem, (x, y) => mixC(PAL.grassDark, PAL.grass, y / 2.5)), null, 0, 0, 0, 0, 0, 0, size);
      for (const [y, a] of [[0.55, 0.3], [1.15, 2.9]]) {
        const lf = P.sph(0.5, 8, 4); lf.translate(0.5, 0, 0); lf.scale(1, 0.12, 0.42);
        const lp = lf.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i); lp.setY(i, lp.getY(i) + 0.25 * Math.sin(x * 2.4) - 0.15 * x * x); }
        lf.computeVertexNormals();
        k.add(Geo.colorize(lf, (x) => mixC(PAL.grassDark, PAL.grassTip, x)), null, 0, y * size, 0, 0, a, 0.25, size);
      }
      const head = [], cl = lighten(color, 0.45), cd = darken(color, 0.15);
      for (let i = 0; i < 8; i++) {
        const pt = P.sph(0.5, 7, 4); pt.scale(0.55, 0.09, 0.3); pt.translate(0.42, 0, 0);
        const pp = pt.attributes.position; for (let j = 0; j < pp.count; j++) { const x = pp.getX(j); pp.setY(j, pp.getY(j) + 0.12 * x * x); }
        pt.computeVertexNormals();
        Geo.colorize(pt, (x) => mixC(cl, cd, clamp((x - 0.15) / 0.6, 0, 1)));
        xf(pt, 0, 0, 0, 0, (i / 8) * TAU, 0);
        head.push(pt);
      }
      const ctr = P.sph(0.22, 10, 5); ctr.scale(1, 0.55, 1);
      head.push(Geo.colorize(ctr, (x, y, z) => (Math.hypot(x, z) > 0.19 ? C(0xff8a4c) : mixC(0xffb627, 0xffe066, clamp(y * 8 + 0.4, 0, 1)))));
      const hg = Geo.merge(head);
      xf(hg, 0.08, 2.52, 0.22, 0.75, 0, 0);
      k.add(hg, null, 0, 0, 0, 0, 0, 0, size);
      k.cyl(0, 0, 0.16 * size, 0, 2.4 * size);
      k.anchor('top', 0.08 * size, 2.6 * size, 0.3 * size);
    });
  };

  // ---- floating sky island (for vistas)
  Geo.skyIsland = function (radius, seed, opts) {
    radius = radius || 6; seed = (seed || 1) | 0; opts = opts || {};
    const bands = opts.bands || PAL.bands;
    return cached(['skyI', radius.toFixed(1), seed, bands.join(',')].join('|'), k => {
      const R = radius, rnd = G.rng(seed * 19 + 2);
      const prof = [[0, -R * 1.5], [R * 0.22, -R * 1.28], [R * 0.48, -R * 0.85], [R * 0.76, -R * 0.45], [R * 0.95, -R * 0.16], [R * 1.0, -0.35], [R * 1.05, -0.12], [R * 1.04, 0.1], [R * 0.85, 0.32], [R * 0.45, 0.45], [0, 0.5]];
      const g = ringStack(prof, 26, (th, y, ri) => 1 + (ri > 0 ? 0.14 * circN(th, 1.1, 0, seed) + (y < -0.4 ? 0.08 * circN(th, 3, ri, seed) : 0) : 0));
      const depth = R * 1.5, bandH = depth / bands.length;
      Geo.colorize(g, (x, y, z, nx, ny) => {
        if (y > -0.2) return ramp3(PAL.grassDark, PAL.grass, PAL.grassTip, clamp(0.4 + (y + 0.2) * 1.2 + (1 - Math.hypot(x, z) / R) * 0.4, 0, 1));
        return C(bands[clamp(Math.floor((-y + vn3(x * 0.5, y * 0.3, z * 0.5, seed) * 0.4 * bandH) / bandH), 0, bands.length - 1)]);
      });
      k.addRaw(g);
      for (let i = 0; i < 3; i++) {
        const a = rnd() * TAU, d = R * (0.35 + rnd() * 0.3), s = R * (0.18 + rnd() * 0.12);
        const st = ringStack([[s, 0], [s * 0.7, -s * 1.2], [0, -s * 2.4]].reverse().map(p => p), 10);
        Geo.colorize(st, (x, y) => C(bands[clamp(3 + Math.floor(-y / s), 0, bands.length - 1)]));
        k.add(st, null, Math.cos(a) * d, -R * (0.5 + rnd() * 0.4) + s, Math.sin(a) * d);
      }
      const tg = treeGeo('round', seed + 3, {});
      k.add(tg, null, R * 0.25, 0.35, -R * 0.15, 0, 0, 0, clamp(R / 7, 0.5, 1.3));
      k.add(bushGeo(seed + 1, PAL.grass), null, -R * 0.4, 0.3, R * 0.3, 0, 0, 0, clamp(R / 6, 0.6, 1.4));
      k.cyl(0, 0, R * 0.92, -R * 0.5, 0.42);
      k.anchor('top', 0, 0.45, 0);
    });
  };

  // ---- distant horizon ring (one mesh, fog-free, colours pre-hazed)
  Geo.distantMountains = function (radius, count, colors, opts) {
    radius = radius || 320; count = count || 22; opts = opts || {};
    colors = colors && colors.length ? colors : [0x8fd6a0, 0xf2b98a, 0xa8d8b0, 0xbfc8f2];
    const haze = opts.haze != null ? opts.haze : 0xcff3ff, seed = opts.seed || 5, rnd = G.rng(seed * 3 + 1);
    const H = opts.height || radius * 0.09, parts = [];
    const front = colors.length > 1 ? colors.slice(0, -1) : colors, back = colors[colors.length - 1];
    for (let row = 1; row >= 0; row--) {
      const R = radius * (row ? 1.2 : 1), n = Math.round(count * (row ? 0.8 : 1));
      for (let i = 0; i < n; i++) {
        const a = ((i + rnd() * 0.7) / n) * TAU, w = ((R * TAU) / n) * (0.75 + rnd() * 0.7), h = H * (0.45 + rnd() * 0.8) * (row ? 1.4 : 1);
        const type = rnd();
        let prof;
        if (type < 0.4) prof = [[w * 0.62, -14], [w * 0.56, 0], [w * 0.5, h * 0.55], [w * 0.46, h * 0.9], [w * 0.41, h], [w * 0.2, h * 1.02], [0, h * 1.03]];
        else if (type < 0.82) prof = [[w * 0.66, -14], [w * 0.6, 0], [w * 0.5, h * 0.35], [w * 0.32, h * 0.76], [w * 0.15, h * 0.96], [0, h]];
        else prof = [[w * 0.5, -14], [w * 0.45, 0], [w * 0.3, h * 0.45], [w * 0.12, h * 0.86], [0, h]];
        const g = ringStack(prof, 10, (th, y, ri) => 1 + 0.14 * circN(th, 1.2, ri, seed + i + row * 50));
        g.scale(1, 1, 0.5);
        const base = row ? back : front[Math.floor(rnd() * front.length)];
        const dk = darken(base, 0.15), lt = lighten(base, 0.18), hz = row ? 0.5 : 0.26;
        const banded = type < 0.4 && opts.bands;
        Geo.colorize(g, (x, y) => {
          const t = clamp(y / h, 0, 1);
          const c = banded ? C(opts.bands[clamp(Math.floor((1 - t) * opts.bands.length * 0.999), 0, opts.bands.length - 1)]) : mixC(dk, lt, t, _t3);
          return mixC(c, haze, hz + (1 - t) * 0.3);
        });
        xf(g, Math.cos(a) * R, -2, Math.sin(a) * R, 0, PI / 2 - a, 0);
        parts.push(g);
      }
    }
    const mesh = new THREE.Mesh(Geo.merge(parts), noFogMat({ rim: false }));
    mesh.renderOrder = -5;
    mesh.userData.horizon = true;
    return mesh;
  };

  // ================================================================== EMBLEMS / SPLATS / SIGNS
  function splatShapes(seed, lite) {
    const rnd = G.rng((seed || 3) * 7 + 1), shapes = [], s = new THREE.Shape(), N = lite ? 30 : 56;
    const lobes = [];
    for (let i = 0; i < 7; i++) lobes.push({ a: rnd() * TAU, w: 0.22 + rnd() * 0.3, h: 0.08 + rnd() * 0.2 });
    const a1 = rnd() * TAU, a2 = rnd() * TAU;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      let r = 0.6 + 0.045 * Math.sin(a * 3 + a1) + 0.035 * Math.sin(a * 7 + a2);
      for (const l of lobes) { const d = Math.abs(((a - l.a + PI * 3) % TAU) - PI); if (d < l.w) r += l.h * (0.5 + 0.5 * Math.cos((d / l.w) * PI)); }
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i) s.lineTo(x, y); else s.moveTo(x, y);
    }
    s.closePath(); shapes.push(s);
    for (let i = 0; i < (lite ? 3 : 6); i++) { const a = rnd() * TAU, d = 0.86 + rnd() * 0.12, r = 0.035 + rnd() * 0.055; shapes.push(circleShape(r, Math.cos(a) * d, Math.sin(a) * d)); }
    return shapes;
  }
  // Cached flat ink splat: unit radius, XY plane, facing +Z (so lookAt orients it). variant 0..3;
  // 4..7 = lighter outlines (for baked decor).
  Geo.splatGeo = function (variant) {
    const v = (variant | 0) & 7;
    return cachedGeo('splat|' + v, () => {
      const g = new THREE.ShapeGeometry(splatShapes(3 + (v & 3) * 5, v > 3), v > 3 ? 2 : 4);
      g.computeBoundingSphere();
      return g;
    });
  };
  function heartShape(s) {
    const h = new THREE.Shape();
    h.moveTo(0, -0.45 * s);
    h.bezierCurveTo(-0.15 * s, -0.3 * s, -0.5 * s, -0.05 * s, -0.5 * s, 0.17 * s);
    h.bezierCurveTo(-0.5 * s, 0.42 * s, -0.2 * s, 0.5 * s, 0, 0.28 * s);
    h.bezierCurveTo(0.2 * s, 0.5 * s, 0.5 * s, 0.42 * s, 0.5 * s, 0.17 * s);
    h.bezierCurveTo(0.5 * s, -0.05 * s, 0.15 * s, -0.3 * s, 0, -0.45 * s);
    return h;
  }
  function shieldShape(s) {
    const h = new THREE.Shape();
    h.moveTo(-0.42 * s, 0.4 * s); h.quadraticCurveTo(0, 0.56 * s, 0.42 * s, 0.4 * s);
    h.quadraticCurveTo(0.44 * s, -0.12 * s, 0, -0.5 * s); h.quadraticCurveTo(-0.44 * s, -0.12 * s, -0.42 * s, 0.4 * s);
    return h;
  }
  function radial(cA, cB, r) { return (x, y) => mixC(cA, cB, clamp(Math.hypot(x, y) / r, 0, 1)); }
  function emblemGeo(kind, col) {
    const parts = [];
    switch (kind) {
      case 'gear': {
        col = col || 0xffd45c;
        parts.push(Geo.colorize(extrude(gearShape(0.48, 0.37, 9, 0.15), 0.14, 0.04, 6, 1), radial(lighten(col, 0.3), darken(col, 0.15), 0.5)));
        break;
      }
      case 'coin': {
        col = col || PAL.sun;
        parts.push(Geo.colorize(xf(P.cyl(0.46, 0.46, 0.12, 24), 0, 0, 0, PI / 2, 0, 0), darken(col, 0.1)));
        parts.push(Geo.colorize(xf(P.tor(0.42, 0.05, 6, 24), 0, 0, 0.06), lighten(col, 0.35)));
        parts.push(Geo.colorize(extrude(starShape(0.26, 0.11, 5), 0.06, 0.02, 4, 1), lighten(col, 0.25)).translate(0, 0, 0.07));
        break;
      }
      case 'wing': {
        col = col || PAL.sky;
        for (const sx of [-1, 1]) {
          const s = new THREE.Shape();
          s.moveTo(0.12, 0.08); s.quadraticCurveTo(0.45, 0.3, 0.7, 0.18); s.lineTo(0.55, 0.06); s.lineTo(0.62, -0.02); s.lineTo(0.45, -0.08); s.lineTo(0.48, -0.16); s.quadraticCurveTo(0.25, -0.15, 0.12, -0.06);
          const g = Geo.colorize(extrude(s, 0.08, 0.025, 6, 1), radial(lighten(col, 0.4), col, 0.7));
          if (sx < 0) { g.scale(-1, 1, 1); const f = flipCopy(g); parts.push(f); } else parts.push(g);
        }
        parts.push(Geo.colorize(xf(P.sph(0.16, 12, 8), 0, 0, 0, 0, 0, 0, 1, 1, 0.6), PAL.gold));
        break;
      }
      case 'splat': {
        const g = new THREE.ExtrudeGeometry(splatShapes(11, true), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 3 });
        g.deleteAttribute('uv'); g.translate(0, 0, -0.03); g.scale(0.55, 0.55, 1);
        parts.push(Geo.colorize(Geo.smooth(g, 55), col || 0xff5fa2));
        break;
      }
      case 'pod': {
        col = col || 0xff8a1f;
        parts.push(Geo.colorize(xf(P.cap(0.2, 0.36, 4, 12), 0, 0, 0), (x, y) => (y > 0.05 ? C(0xffffff) : C(col))));
        parts.push(Geo.colorize(xf(P.sph(0.1, 10, 6), 0, 0.12, 0.17, 0, 0, 0, 1, 1, 0.5), 0x9ff0ff));
        for (let i = 0; i < 3; i++) parts.push(Geo.colorize(xf(P.rbox(0.05, 0.22, 0.16, 0.02, 1), Math.cos((i / 3) * TAU + PI / 2) * 0.2, -0.3, Math.sin((i / 3) * TAU + PI / 2) * 0.2, 0, -(i / 3) * TAU - PI / 2, 0), PAL.navy));
        break;
      }
      case 'shield': {
        col = col || PAL.mint;
        parts.push(Geo.colorize(extrude(shieldShape(1), 0.12, 0.04, 8, 1), radial(lighten(col, 0.35), darken(col, 0.1), 0.5)));
        parts.push(Geo.colorize(extrude(shieldShape(0.55), 0.08, 0.02, 8, 1).translate(0, 0.02, 0.06), 0xffffff));
        break;
      }
      case 'target': {
        const rings = [[0.48, 0xffffff], [0.38, 0xff4d5e], [0.27, 0xffffff], [0.16, 0xff4d5e], [0.07, 0xffd23f]];
        rings.forEach(([r, c], i) => parts.push(Geo.colorize(xf(P.cyl(r, r, 0.08, 24), 0, 0, i * 0.02, PI / 2, 0, 0), c)));
        break;
      }
      case 'cup': {
        col = col || 0xff7a93;
        const body = ringStack([[0.2, -0.3], [0.24, -0.25], [0.3, 0.2], [0.32, 0.28], [0.26, 0.29], [0, 0.22]], 18);
        parts.push(Geo.colorize(body, (x, y, z, nx, ny) => (y > 0.25 && ny > 0.5 ? C(0x8a5a3a) : y > -0.12 && y < 0.05 ? C(col) : C(0xfffaf4))));
        parts.push(Geo.colorize(xf(P.tor(0.12, 0.04, 6, 14), 0.31, 0, 0), 0xfffaf4));
        break;
      }
      case 'trophy': {
        col = col || PAL.gold;
        const body = ringStack([[0.26, -0.5], [0.26, -0.42], [0.12, -0.38], [0.07, -0.18], [0.1, -0.08], [0.26, 0.0], [0.32, 0.3], [0.33, 0.38], [0.27, 0.39], [0, 0.32]], 18);
        parts.push(Geo.colorize(body, (x, y, z, nx, ny) => mixC(darken(col, 0.15), lighten(col, 0.45), clamp(0.5 + nx * 0.3 + ny * 0.3, 0, 1))));
        for (const sx of [-1, 1]) parts.push(Geo.colorize(xf(P.tor(0.12, 0.035, 6, 12, PI), sx * 0.32, 0.18, 0, 0, 0, sx > 0 ? -PI / 2 : PI / 2), col));
        break;
      }
      case 'bolt': {
        col = col || PAL.sun;
        parts.push(Geo.colorize(xf(P.cyl(0.42, 0.42, 0.18, 6), 0, 0, 0, PI / 2, 0, 0), (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.5 ? C(lighten(col, 0.2)) : C(darken(col, 0.15)))));
        parts.push(Geo.colorize(xf(P.cyl(0.17, 0.17, 0.2, 14), 0, 0, 0, PI / 2, 0, 0), darken(col, 0.45)));
        break;
      }
      case 'heart': {
        col = col || 0xff5f8a;
        parts.push(Geo.colorize(extrude(heartShape(1), 0.14, 0.05, 10, 2), radial(lighten(col, 0.35), col, 0.5)));
        break;
      }
      default: { // star
        col = col || PAL.sun;
        parts.push(Geo.colorize(extrude(starShape(0.5, 0.22, 5), 0.14, 0.05, 4, 2), radial(lighten(col, 0.45), darken(col, 0.05), 0.5)));
      }
    }
    return Geo.merge(parts);
  }
  Geo.emblem = (kind, col) => cachedGeo('emb|' + kind + '|' + col, () => emblemGeo(kind, col));

  function roundRectPath(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  const css = h => (typeof h === 'number' ? '#' + h.toString(16).padStart(6, '0') : h);
  // Canvas text texture for boards. opts: {w, h (px), bg, fg, border, bw, radius, font, stripe}
  Geo.signTexture = function (text, opts) {
    opts = Object.assign({ w: 512, h: 160, bg: '#fff6e6', fg: '#1e1a4d', border: '#1e1a4d', bw: 10, radius: 34, stripe: null,
      font: "800 {s}px 'M PLUS Rounded 1c','Dela Gothic One','Arial Rounded MT Bold',system-ui,sans-serif" }, opts || {});
    const lines = String(text == null ? '' : text).split('\n');
    const draw = (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const bw = opts.bw;
      roundRectPath(g, bw / 2, bw / 2, w - bw, h - bw, opts.radius);
      g.fillStyle = css(opts.bg); g.fill();
      if (opts.stripe) { g.save(); g.clip(); g.fillStyle = css(opts.stripe); g.fillRect(0, h - bw * 2.4, w, bw * 2.4); g.restore(); }
      g.lineWidth = bw; g.strokeStyle = css(opts.border); g.stroke();
      let size = Math.floor(((h - bw * 4) / lines.length) * 0.8);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (;;) {
        g.font = opts.font.replace('{s}', size);
        let mw = 0; for (const l of lines) mw = Math.max(mw, g.measureText(l).width);
        if (mw <= w - bw * 6 || size <= 12) break;
        size -= 2;
      }
      g.fillStyle = css(opts.fg);
      lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1 + size * 0.04));
    };
    // Ultra on a high-density display: the canvas is drawn at 1.5x (same layout, crisper letters up close)
    // with stronger anisotropic filtering; every other case is exactly as before.
    const k = G.R.tierRank && G.R.tierRank() >= 3 && (G.R.prMax || 1) >= 1.5 ? Math.min(1.5, 2048 / opts.w) : 1;
    const paint = k === 1 ? draw : (g, w, h) => { g.setTransform(k, 0, 0, k, 0, 0); draw(g, w / k, h / k); g.setTransform(1, 0, 0, 1, 0, 0); };
    const tex = G.R.canvasTex(Math.round(opts.w * k), Math.round(opts.h * k), paint);
    if (k !== 1) { const r = G.R.renderer; tex.anisotropy = r && r.capabilities ? Math.min(8, r.capabilities.getMaxAnisotropy() || 1) : 2; }
    try {
      if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => { const c = tex.image; if (c && c.getContext) { paint(c.getContext('2d'), c.width, c.height); tex.needsUpdate = true; } });
    } catch (e) { /* fonts API optional */ }
    return tex;
  };
  function textPlane(text, w, h, opts) {
    const pxW = clamp(Math.round((160 * w) / h / 32) * 32, 128, 1024);
    const tex = Geo.signTexture(text, Object.assign({ w: pxW, h: 160 }, opts || {}));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35 }));
    m.userData.keep = true;
    return m;
  }
  Geo.textPlane = textPlane;
  // Free-standing (posts) or wall-mounted board with text (already translated).
  Geo.sign = function (text, opts) {
    opts = opts || {};
    const len = String(text || '').length;
    const w = opts.w || clamp(0.8 + len * 0.3, 1.8, 6), h = opts.h || 0.9, posts = opts.posts !== false, ph = opts.postH || 1.6;
    const frame = opts.frame != null ? opts.frame : PAL.navy;
    const prop = cached(['signB', w.toFixed(2), h.toFixed(2), posts, ph, frame].join('|'), k => {
      const y = posts ? ph + h / 2 : h / 2 + 0.1;
      k.add(P.rbox(w + 0.22, h + 0.22, 0.16, 0.08, 1), frame, 0, y, 0);
      // the back is a finished face too (cream panel + a gold star), not a bare navy slab
      k.add(P.box(w - 0.1, h - 0.1, 0.03), 0xfff1dc, 0, y, -0.085);
      k.add(xf(emblemGeo('star', PAL.gold).clone(), 0, 0, 0, 0, PI, 0, Math.min(0.75, h * 0.7)), null, 0, y, -0.12);
      if (posts) {
        for (const sx of [-1, 1]) {
          k.add(P.cyl(0.07, 0.09, ph + h * 0.6, 8), frame, sx * (w / 2 - 0.15), (ph + h * 0.6) / 2, -0.02);
          k.add(P.sph(0.1, 8, 6), PAL.gold, sx * (w / 2 - 0.15), ph + h * 0.6 + 0.04, -0.02);
          k.add(P.rbox(0.36, 0.18, 0.36, 0.06, 1), frame, sx * (w / 2 - 0.15), 0.09, -0.02);
        }
        k.box(0, (ph + h) / 2, 0, w + 0.2, ph + h, 0.25);
      }
      k.anchor('text', 0, y, 0.085);
    });
    const tp = textPlane(text, w, h, { bg: opts.bg || '#fff6e6', fg: opts.fg || '#1e1a4d', border: css(opts.border || '#e8b44a') });
    tp.position.copy(prop.anchors.text);
    prop.mesh.add(tp);
    return prop;
  };

  // ================================================================== TOWN KIT
  const FY = 0.3; // interior floor top of buildings (step < 0.45)
  Geo.FLOOR_Y = FY;
  // Round window with real depth: a dark reveal (inward-facing tube) through the wall, the lit pane set back in
  // the middle of the wall, a frame ring and a little sill on both faces.
  function porthole(k, x, y, z, r, axis, frame, glass, thick) {
    const th = thick || 0.6, rv = darken(frame, 0.5), ax = axis === 'x';
    const rx = ax ? 0 : PI / 2, rz = ax ? PI / 2 : 0;
    if (th > 0.2) k.add(flipCopy(P.cyl(r * 0.9, r * 0.9, th, 12, true)), rv, x, y, z, rx, 0, rz);
    k.glow(P.cyl(r * 0.88, r * 0.88, th > 0.2 ? 0.06 : th, 12), glass, x, y, z, rx, 0, rz);
    for (const s of [-1, 1]) {
      if (ax) { k.add(P.tor(r, r * 0.2, 5, 16), frame, x + (s * th) / 2, y, z, 0, PI / 2, 0); k.add(P.box(0.18, 0.09, r * 1.5), frame, x + (s * (th / 2 + 0.05)), y - r * 1.12, z); }
      else { k.add(P.tor(r, r * 0.2, 5, 16), frame, x, y, z + (s * th) / 2); k.add(P.box(r * 1.5, 0.09, 0.18), frame, x, y - r * 1.12, z + (s * (th / 2 + 0.05))); }
    }
  }
  function wallZ(k, x, z, W, H, t, p, y0) { // wall along X
    y0 = y0 == null ? FY : y0;
    k.add(P.rbox(W, H, t, 0.12, 1), p.wall, x, y0 + H / 2, z);
    k.add(P.rbox(W + 0.06, 1.1, t + 0.12, 0.1, 1), p.panel, x, y0 + 0.55, z);
    k.add(P.box(W + 0.1, 0.16, t + 0.16), p.trim, x, y0 + 1.12, z);
    k.box(x, y0 + H / 2, z, W, H, t);
  }
  function wallX(k, x, z, D, H, t, p, win) { // wall along Z
    k.add(P.rbox(t, H, D, 0.12, 1), p.wall, x, FY + H / 2, z);
    k.add(P.rbox(t + 0.12, 1.1, D + 0.06, 0.1, 1), p.panel, x, FY + 0.55, z);
    k.add(P.box(t + 0.16, 0.16, D + 0.1), p.trim, x, FY + 1.12, z);
    k.box(x, FY + H / 2, z, t, H, D);
    if (win) porthole(k, x, FY + 2.55, z - D * 0.08, 0.55, 'x', p.trim, p.glow, t + 0.08);
  }
  // Open-front room shell. o: {W, D, H, p, t, roof, header, sides, window, pillars}
  function shell(k, o) {
    const { W, D, H, p } = o, t = o.t || 0.5;
    k.add(P.rbox(W + 0.8, 2.3, D + 0.8, 0.22, 1), p.base, 0, FY - 1.15, 0);
    k.box(0, FY - 1.15, 0, W + 0.8, 2.3, D + 0.8);
    k.add(P.box(W + 0.5, 0.12, 0.5), p.trim, 0, FY - 0.04, D / 2 + 0.2);
    k.add(P.box(W - 1.1, 0.06, D - 1.3), p.floor, 0, FY, -0.1);
    if (o.rug !== false) { k.add(P.box(W * 0.42, 0.03, D * 0.36), p.rug || p.accent, 0, FY + 0.035, D * 0.12); k.add(P.box(W * 0.42 + 0.3, 0.025, D * 0.36 + 0.3), p.trim, 0, FY + 0.03, D * 0.12); }
    wallZ(k, 0, -D / 2 + t / 2, W, H, t, p);
    if (o.sides !== false) for (const sx of [-1, 1]) wallX(k, sx * (W / 2 - t / 2), 0, D, H, t, p, o.window !== false);
    if (o.pillars !== false) {
      for (const sx of [-1, 1]) {
        const px = sx * (W / 2 - 0.4), pz = D / 2 - 0.4;
        k.add(P.rbox(0.95, H, 0.95, 0.24, 1), p.panel, px, FY + H / 2, pz);
        k.add(P.rbox(1.12, 0.4, 1.12, 0.12, 1), p.trim, px, FY + 0.2, pz);
        k.add(P.rbox(1.12, 0.3, 1.12, 0.1, 1), p.trim, px, FY + H - 1.35, pz);
        k.box(px, FY + H / 2, pz, 0.95, H, 0.95);
      }
    }
    if (o.header !== false) {
      k.add(P.rbox(W + 0.3, 1.0, 0.85, 0.22, 1), p.panel, 0, FY + H - 0.5, D / 2 - 0.3);
      k.add(P.box(W - 1.4, 0.14, 0.95), p.trim, 0, FY + H - 1.02, D / 2 - 0.3);
      k.box(0, FY + H - 0.5, D / 2 - 0.3, W, 1.0, 0.85);
    }
    if (o.roof !== false) {
      k.add(P.rbox(W + 1.5, 0.55, D + 1.5, 0.26, 2), p.roof, 0, FY + H + 0.27, 0);
      k.add(P.box(W + 1.0, 0.2, 0.3), p.trim, 0, FY + H - 0.04, -D / 2 - 0.35);
      for (const sx of [-1, 1]) k.add(P.box(0.3, 0.2, D + 1.0), p.trim, sx * (W / 2 + 0.35), FY + H - 0.04, 0);
      k.add(P.box(W - 0.4, 0.1, D - 0.4), p.ceil || lighten(p.wall, 0.55), 0, FY + H - 0.05, 0);
      if (o.lamps !== false) k.glow(P.box(W * 0.5, 0.05, 0.42), lighten(p.glow, 0.4), 0, FY + H - 0.12, -D * 0.18);
      if (o.lamps !== false) for (const lx of W > 10 ? [-W * 0.22, W * 0.22] : [0]) {
        k.add(P.cyl(0.025, 0.025, 0.7, 4), PAL.navy, lx, FY + H - 0.42, 0.6);
        k.add(P.cone(0.34, 0.24, 10), p.panel, lx, FY + H - 0.82, 0.6);
        k.glow(P.sph(0.17, 8, 6), p.glow, lx, FY + H - 0.98, 0.6);
      }
      k.box(0, FY + H + 0.27, 0, W + 1.5, 0.55, D + 1.5);
    }
    k.anchor('door', 0, FY, D / 2 + 0.6);
    k.anchor('spawn', 0, 0, D / 2 + 4);
  }
  // Marquee name board: a big plate (1.3 m tall, readable on a phone from across the plaza) standing in front of
  // the roof edge and riding over the roof line, on two bracket arms back to the header, with a row of marquee
  // bulbs along its crest and round caps in the facility's accent colour. The caller draws the translated label
  // at anchors.sign (meta.sign = plate size + colours).
  function signBoard(k, W, D, H, p, w, o) {
    o = o || {};
    w = w || Math.min(W * 0.5, 7);
    const sh = o.h || 1.3, y = o.y != null ? o.y : FY + H - 0.12, z = o.z != null ? o.z : D / 2 + 0.95;
    k.add(P.rbox(w + 0.42, sh + 0.32, 0.26, 0.14, 1), p.trim, 0, y, z);
    k.add(P.box(w + 0.12, sh + 0.04, 0.1), darken(p.trim, 0.25), 0, y, z + 0.1);   // recessed lip
    k.add(P.rbox(w, sh, 0.12, 0.06, 1), p.sign || 0xfff6e6, 0, y, z + 0.12);
    for (const sx of [-1, 1]) {
      k.add(P.cyl(0.24, 0.24, 0.2, 10), p.accent, sx * (w / 2 + 0.36), y, z + 0.06, PI / 2, 0, 0);
      k.add(P.sph(0.12, 6, 4), lighten(p.accent, 0.4), sx * (w / 2 + 0.36), y, z + 0.17);
      if (o.brackets !== false) {
        const bz = o.backZ != null ? o.backZ : D / 2 + 0.05, bl = z - bz;
        if (bl > 0.1) k.add(P.box(0.16, 0.16, bl), PAL.navy, sx * (w / 2 - 0.5), y - sh * 0.3, bz + bl / 2);
      }
    }
    const nb = Math.max(5, Math.round(w / 0.85));
    // (8 cm glowing bulbs read as dots from any distance: 16-triangle beads, below the primitive minimum)
    const bulb = () => { const g = new THREE.SphereGeometry(0.085, 4, 2); g.deleteAttribute('uv'); return g; };
    for (let i = 0; i < nb; i++) k.glow(bulb(), i % 2 ? 0xfff2b0 : lighten(p.accent, 0.55), -w / 2 + (i + 0.5) * (w / nb), y + sh / 2 + 0.16, z + 0.12);
    k.anchor('sign', 0, y, z + 0.19);
    k.meta.sign = { w: w - 0.06, h: sh - 0.04, bg: p.sign || 0xfff6e6, border: p.trim };
  }
  function counter(k, x, z, w, d, p, top, rotY) {
    const g1 = P.rbox(w, 1.0, d, 0.14, 1), g2 = P.rbox(w + 0.24, 0.12, d + 0.24, 0.05, 1), g3 = P.rbox(w - 0.4, 0.46, 0.06, 0.03, 1);
    const ry = rotY || 0;
    const put = (g, col, lx, ly, lz) => { xf(g, lx, ly, lz); xf(g, x, 0, z, 0, ry, 0); k.addRaw(g, col); };
    put(g1, p.panel, 0, FY + 0.5, 0); put(g2, top || p.trim, 0, FY + 1.06, 0); put(g3, p.accent, 0, FY + 0.55, d / 2 + 0.02);
    const odd = Math.abs(Math.sin(ry)) > 0.5;
    k.box(x, FY + 0.56, z, odd ? d + 0.24 : w + 0.24, 1.12, odd ? w + 0.24 : d + 0.24);
    const s = Math.sin(ry), c = Math.cos(ry), nb = -(d / 2 + 0.85), use = d / 2 + 1.0;
    k.anchor('counter', x, FY + 1.12, z);
    k.anchor('npc', x + nb * s, FY, z + nb * c);
    k.anchor('use', x + use * s, FY, z + use * c);
  }
  function antenna(k, x, y, z, h, col, tip) {
    k.add(P.cyl(0.05, 0.08, h, 6), col, x, y + h / 2, z);
    k.add(P.rbox(0.36, 0.16, 0.36, 0.05, 1), col, x, y + 0.08, z);
    k.glow(P.sph(0.13, 8, 6), tip, x, y + h + 0.08, z);
  }
  function dish(k, x, y, z, r, col, ry) {
    k.add(P.cyl(0.07, 0.1, 0.7, 6), PAL.navy, x, y + 0.35, z);
    const d = ringStack([[0.06, -0.05], [r * 0.55, 0.04], [r, 0.22], [r * 0.96, 0.26], [r * 0.5, 0.12], [0, 0.08]], 16);
    xf(d, 0, 0, 0, -0.9, 0, 0); xf(d, x, y + 0.75, z, 0, ry || 0, 0);
    k.addRaw(d, col);
    k.glow(P.sph(0.07, 6, 4), 0xff6b8b, x + Math.sin(ry || 0) * r * 0.45, y + 0.95, z + Math.cos(ry || 0) * r * 0.45);
  }
  function flatSplat(k, variant, col, size, x, y, z, rx, ry, rz) { k.add(Geo.splatGeo(4 + (variant & 3)).clone(), col, x, y, z, rx, ry, rz, size, size, 1); }
  function scallopAwning(k, W, zFront, yTop, cols, drop) {
    const n = Math.max(4, Math.round(W / 0.9)), sw = W / n, depth = 1.7, ang = 0.5;
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + sw * (i + 0.5), col = cols[i % cols.length];
      k.add(P.box(sw + 0.02, 0.08, depth), col, x, yTop - Math.sin(ang) * depth / 2, zFront + Math.cos(ang) * depth / 2, ang, 0, 0);
      const s = P.cyl(sw / 2, sw / 2, 0.08, 10, false); xf(s, 0, 0, 0, PI / 2, 0, 0, 1, 1, 1);
      const sc = Geo.merge([s]); const sp = sc.attributes.position;
      for (let j = 0; j < sp.count; j++) if (sp.getY(j) > 0) sp.setY(j, 0);
      sc.computeVertexNormals();
      k.add(sc, col, x, yTop - Math.sin(ang) * depth - (drop || 0), zFront + Math.cos(ang) * depth + 0.02);
    }
  }
  function cupGeo(col) { return emblemGeo('cup', col); }

  const BPAL = {
    guild: { wall: 0xfff1dc, panel: 0x3d55b8, trim: PAL.gold, roof: 0x2ec4b6, accent: 0xff6b8b, floor: 0xf2d7a6, glow: 0xffe9a8, base: 0xe8c99a },
    workshop: { wall: 0x62cfc2, panel: 0x2b6f86, trim: 0xffd45c, roof: 0xff8a4c, accent: 0x1f2a5a, floor: 0xd8dcef, glow: PAL.coil, base: 0xc9b8a0 },
    shop: { wall: 0xffe08a, panel: 0xff7a93, trim: 0xfffaf2, roof: 0xff5fa2, accent: 0x3fe0b8, floor: 0xf6e6c8, glow: 0xfff2b0, base: 0xe8c99a },
    hangar: { wall: 0x3fa9ff, panel: 0x2a5cc0, trim: PAL.gold, roof: 0xe8eefc, accent: 0xff8a1f, floor: 0xc9d3ea, glow: 0x9ff0ff, base: 0xb8c0d8 },
    arena: { wall: 0xf4f1ea, panel: 0x2a2f5a, trim: 0xffd23f, roof: 0x2a2f5a, accent: PAL.teamA, accent2: PAL.teamB, floor: 0xe6e2da, glow: 0xff9ad0, base: 0xcfcac0 },
    royale: { wall: 0xfdfbff, panel: 0x8f6bff, trim: PAL.gold, roof: 0x5b3fc4, accent: 0xff8a1f, floor: 0xe4dcff, glow: 0xffb36b, base: 0xd0c8e8 },
    defense: { wall: 0xecd6b2, panel: 0x6e64a8, trim: 0x5cffe1, roof: 0x4a3f8a, accent: 0x3fe0b8, floor: 0xd8c8a8, glow: 0x5cffe1, base: 0xc9a880 },
    training: { wall: 0xa8e06a, panel: 0x3e9e57, trim: 0xffd23f, roof: 0xff6b5a, accent: 0xfffaf2, floor: 0xe8d8b0, glow: 0xffe066, base: 0xd8c8a0 },
    cafe: { wall: 0xffd6e0, panel: 0x9a6440, trim: 0xfff6ea, roof: 0x3ddc97, accent: 0xff7a93, floor: 0xf6e2c8, glow: 0xfff0c0, base: 0xe8c99a },
    gallery: { wall: 0xfff1dc, panel: 0x8f6bff, trim: PAL.gold, roof: 0x6a4fd8, accent: 0xff5fa2, floor: 0xf0e0c8, glow: 0xfff2b0, base: 0xe0d0b8 },
    house: { wall: 0xffd6e0, panel: 0xfffaf2, trim: 0xfffaf2, roof: 0xff6b6b, accent: 0x9a6440, floor: 0xf0e0c8, glow: 0xfff0b0, base: 0xd8c0a0 },
  };
  Geo.BPAL = BPAL;
  const B = {};

  B.guild = (k, p) => {
    const W = 14, D = 11, H = 5.2, rnd = G.rng(77);
    shell(k, { W, D, H, p });
    const bz = -D / 2 + 0.62;
    k.add(P.rbox(6.6, 3.2, 0.3, 0.14, 2), 0xa86a3c, 0, FY + 2.65, bz);
    k.add(P.rbox(6.0, 2.6, 0.12, 0.05, 1), 0xf3c48a, 0, FY + 2.6, bz + 0.14);
    const notes = [0xfffaf0, 0xffe08a, 0xbaf2d6, 0xffd6e6, 0xcfe0ff, 0xfffaf0, 0xffe2b8, 0xe4d8ff, 0xbaf2d6, 0xffe08a];
    for (let i = 0; i < 10; i++) {
      const x = -2.4 + (i % 5) * 1.2 + (rnd() - 0.5) * 0.2, y = FY + 1.95 + Math.floor(i / 5) * 1.25 + (rnd() - 0.5) * 0.12;
      k.add(P.box(0.78, 0.58, 0.03), notes[i], x, y, bz + 0.22, 0, 0, (rnd() - 0.5) * 0.3);
      k.add(P.sph(0.05, 6, 4), i % 2 ? 0xff4d5e : 0x3d7bff, x, y + 0.22, bz + 0.25);
    }
    k.add(P.rbox(3.0, 0.55, 0.22, 0.1, 1), p.trim, 0, FY + 4.3, bz + 0.1);
    k.add(xf(emblemGeo('star').clone(), 0, 0, 0, 0, 0, 0, 0.45), null, 0, FY + 4.3, bz + 0.26);
    k.anchor('board', 0, FY + 2.6, bz + 0.5);
    counter(k, 3.6, 0.6, 3.4, 0.9, p);
    // round table + stools
    k.add(P.cyl(0.9, 0.9, 0.12, 18), 0xa86a3c, -3.6, FY + 0.9, 0.8); k.add(P.cyl(0.14, 0.3, 0.85, 8), PAL.navy, -3.6, FY + 0.42, 0.8);
    k.cyl(-3.6, 0.8, 0.95, FY, FY + 0.96);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.4, sx = -3.6 + Math.cos(a) * 1.45, sz = 0.8 + Math.sin(a) * 1.45; k.add(P.cyl(0.3, 0.26, 0.5, 12), p.accent, sx, FY + 0.25, sz); k.cyl(sx, sz, 0.32, FY, FY + 0.5); }
    // hanging banners on the front pillars
    for (const sx of [-1, 1]) {
      const bx = sx * (W / 2 - 0.4);
      k.add(P.rbox(0.8, 2.0, 0.08, 0.04, 1), p.accent, bx, FY + 2.6, D / 2 + 0.1);
      k.add(xf(emblemGeo('star', 0xfff1dc).clone(), 0, 0, 0, 0, 0, 0, 0.42), null, bx, FY + 2.9, D / 2 + 0.17);
      k.add(P.rbox(0.9, 0.12, 0.12, 0.04, 1), p.trim, bx, FY + 3.62, D / 2 + 0.1);
      k.glow(P.sph(0.2, 10, 8), p.glow, bx, FY + 1.6, D / 2 + 0.3);
      k.add(P.cyl(0.24, 0.16, 0.12, 10), p.trim, bx, FY + 1.85, D / 2 + 0.3);
    }
    // roof: dome + spire + star, front pediment
    const dome = P.sph(2.7, 22, 10); { const dp = dome.attributes.position; for (let i = 0; i < dp.count; i++) if (dp.getY(i) < 0) dp.setY(i, 0); }
    dome.scale(1, 0.78, 1); dome.computeVertexNormals();
    k.add(dome, (x, y, z, nx, ny) => (Math.sin(Math.atan2(z, x) * 8) > 0.6 && y < 1.9 ? C(lighten(p.roof, 0.2)) : mixC(p.roof, lighten(p.roof, 0.35), clamp(y / 2.1, 0, 1))), 0, FY + H + 0.5, -1);
    k.add(P.tor(2.72, 0.16, 8, 32), p.trim, 0, FY + H + 0.62, -1, PI / 2, 0, 0);
    k.add(P.cyl(0.12, 0.2, 1.4, 8), p.trim, 0, FY + H + 2.6, -1);
    k.add(xf(emblemGeo('star').clone(), 0, 0, 0, 0, 0, 0, 1.3), null, 0, FY + H + 3.75, -1);
    const ped = new THREE.Shape(); ped.absarc(0, 0, 2.3, 0, PI, false); ped.lineTo(2.3, 0);
    k.add(extrude(ped, 0.5, 0.1, 16, 1), p.roof, 0, FY + H + 0.55, D / 2 + 0.25);
    k.add(P.tor(2.35, 0.13, 6, 24, PI), p.trim, 0, FY + H + 0.55, D / 2 + 0.52);
    k.add(xf(emblemGeo('star', 0xfff1dc).clone(), 0, 0, 0, 0, 0, 0, 1.2), null, 0, FY + H + 1.45, D / 2 + 0.6);
    signBoard(k, W, D, H, p, 6.4);
  };

  B.workshop = (k, p) => {
    const W = 13, D = 11, H = 5;
    shell(k, { W, D, H, p, rug: false });
    const mz = -1.7;
    // hazard frame on floor
    for (let i = 0; i < 14; i++) { const x = -2.6 + i * 0.4; for (const zz of [mz - 1.6, mz + 1.6]) k.add(P.box(0.2, 0.02, 0.32), i % 2 ? PAL.navy : 0xffd23f, x, FY + 0.04, zz, 0, 0.5, 0); }
    // fabricator (anvil-like crafting machine)
    k.add(P.rbox(3.1, 1.1, 1.9, 0.22, 1), PAL.navy, 0, FY + 0.55, mz);
    k.add(P.rbox(1.7, 0.55, 1.3, 0.12, 1), 0x9aa6c8, 0, FY + 1.35, mz);
    k.add(P.rbox(2.7, 0.48, 1.35, 0.2, 1), 0xdfe6f6, 0, FY + 1.84, mz);
    k.add(P.cone(0.36, 1.0, 10), 0xdfe6f6, 1.75, FY + 1.86, mz, 0, 0, -PI / 2);
    k.glow(P.rbox(1.9, 0.34, 0.06, 0.05, 1), PAL.coil, 0, FY + 0.62, mz + 0.96);
    for (const sx of [-1, 1]) k.glow(P.sph(0.1, 8, 6), sx > 0 ? 0xff6b8b : 0x8bea4a, sx * 1.2, FY + 0.62, mz + 0.97);
    const a0 = new V3(-1.9, FY + 0.9, mz - 0.7), a1 = new V3(-1.5, FY + 3.2, mz - 0.4), a2 = new V3(-0.25, FY + 2.95, mz);
    k.addRaw(tubeAB(a0, a1, 0.16, 0.13, 8), 0xffd45c); k.addRaw(tubeAB(a1, a2, 0.13, 0.11, 8), 0xffd45c);
    for (const j of [a0, a1, a2]) k.add(P.sph(0.22, 10, 8), PAL.navy, j.x, j.y, j.z);
    k.glow(P.cone(0.18, 0.35, 8), PAL.coil, -0.25, FY + 2.65, mz, PI, 0, 0);
    k.box(0, FY + 1.05, mz, 3.3, 2.1, 2.1);
    k.anchor('machine', 0, FY + 2.1, mz);
    // glowing tube banks on the back wall
    const tz = -D / 2 + 0.85;
    for (const bx of [-4.2, 4.2]) {
      for (let i = -1; i <= 1; i++) {
        const x = bx + i * 0.75;
        k.glow(P.cyl(0.22, 0.22, 2.4, 12), i === 0 ? 0x8bea4a : PAL.coil, x, FY + 1.75, tz);
        k.add(P.cyl(0.3, 0.3, 0.3, 12), PAL.brass, x, FY + 0.45, tz); k.add(P.cyl(0.3, 0.3, 0.3, 12), PAL.brass, x, FY + 3.05, tz);
        k.add(P.tor(0.24, 0.04, 5, 12), PAL.navy, x, FY + 1.75, tz, PI / 2, 0, 0);
      }
      k.box(bx, FY + 1.7, tz, 2.4, 3.4, 0.75);
    }
    k.add(P.cyl(0.13, 0.13, 10, 8), PAL.navy, 0, FY + 3.55, tz, 0, 0, PI / 2);
    k.addRaw(tubeAB(new V3(0, FY + 3.55, tz), new V3(0, FY + 3.55, mz - 0.4), 0.12, 0.12, 8), PAL.navy);
    k.addRaw(tubeAB(new V3(0, FY + 3.55, mz - 0.4), new V3(0, FY + 2.1, mz - 0.4), 0.12, 0.12, 8), PAL.navy);
    // workbench / counter
    counter(k, 4.2, 1.8, 2.4, 0.9, p, 0xdfe6f6, -PI / 2);
    k.add(P.rbox(0.5, 0.3, 0.4, 0.06, 1), 0xff8a4c, 4.0, FY + 1.27, 1.4); k.add(P.cyl(0.08, 0.08, 0.5, 6), 0xffd45c, 4.3, FY + 1.18, 2.3, 0, 0, PI / 2);
    // roof details: chimneys, vents, gear
    for (const [cx, cz] of [[-4.2, -2.6], [-2.6, -3.2]]) {
      k.add(P.cyl(0.45, 0.5, 1.8, 12), p.roof, cx, FY + H + 1.3, cz);
      k.add(P.tor(0.48, 0.1, 6, 14), PAL.navy, cx, FY + H + 2.1, cz, PI / 2, 0, 0);
      k.add(P.cyl(0.55, 0.55, 0.16, 12), PAL.navy, cx, FY + H + 2.28, cz);
    }
    for (let i = 0; i < 3; i++) k.add(P.rbox(1.2, 0.4, 0.7, 0.15, 1), 0xdfe6f6, 3.2, FY + H + 0.7, -2.8 + i * 1.1);
    k.add(P.rbox(2.6, 2.6, 0.4, 0.3, 1), PAL.navy, 0, FY + H + 1.7, D / 2 - 0.2);
    k.add(xf(emblemGeo('gear').clone(), 0, 0, 0, 0, 0, 0, 2.0), null, 0, FY + H + 1.75, D / 2 + 0.05);
    k.add(xf(emblemGeo('gear', 0xff8a4c).clone(), 0, 0, 0, 0, 0, 0, 1.0), null, 1.25, FY + H + 0.95, D / 2 + 0.12);
    signBoard(k, W, D, H, p, 6);
  };

  B.shop = (k, p) => {
    const W = 11, D = 9, H = 4.7, rnd = G.rng(31);
    shell(k, { W, D, H, p });
    scallopAwning(k, W - 0.6, D / 2 + 0.1, FY + H - 1.0, [p.roof, 0xfffaf2]);
    counter(k, -0.9, -0.4, 5.0, 0.9, p, 0xfffaf2);
    k.add(P.rbox(0.8, 0.5, 0.6, 0.1, 1), PAL.navy, 0.9, FY + 1.37, -0.5); k.glow(P.rbox(0.6, 0.3, 0.05, 0.04, 1), 0x8bea4a, 0.9, FY + 1.42, -0.18);
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.85);
      k.add(P.rbox(0.7, 3.1, 4.4, 0.08, 1), 0xa86a3c, x + sx * 0.05, FY + 1.55, -1.2); k.box(x, FY + 1.55, -1.2, 0.8, 3.1, 4.4);
      for (let s = 0; s < 3; s++) {
        const y = FY + 0.55 + s * 1.0;
        k.add(P.box(0.8, 0.08, 4.5), 0xf3c48a, x, y, -1.2);
        for (let i = 0; i < 5; i++) {
          const col = pick(rnd, PAL.coral.concat([PAL.mint, PAL.sky, PAL.grape])), z = -3.1 + i * 0.95, r = rnd();
          if (r < 0.4) k.add(P.box(0.42, 0.42, 0.42), col, x, y + 0.25, z, 0, rnd(), 0);
          else if (r < 0.7) k.add(P.sph(0.22, 10, 8), col, x, y + 0.26, z);
          else k.add(P.cyl(0.16, 0.16, 0.5, 10), col, x, y + 0.29, z);
        }
      }
    }
    k.add(P.rbox(4.2, 2.0, 0.12, 0.08, 1), p.panel, 0, FY + 2.7, -D / 2 + 0.58);
    k.add(xf(emblemGeo('coin').clone(), 0, 0, 0, 0, 0, 0, 1.6), null, 0, FY + 2.7, -D / 2 + 0.78);
    k.add(P.cyl(0.12, 0.16, 1.4, 8), PAL.navy, 0, FY + H + 1.2, -0.5);
    k.add(xf(emblemGeo('coin').clone(), 0, 0, 0, 0, 0, 0, 2.4), null, 0, FY + H + 2.6, -0.5);
    k.add(P.rbox(1.0, 0.25, 1.0, 0.08, 1), PAL.navy, 0, FY + H + 0.62, -0.5);
    { // gumball dome
      const gx = 2.9, gz = -2.2, gy = FY + H + 0.55, rnd2 = G.rng(8);
      k.add(ringStack([[0.9, 0], [0.95, 0.15], [0.75, 0.75], [0.85, 0.85], [0, 0.9]], 14), 0xff4d6e, gx, gy, gz);
      k.add(P.sph(1.15, 16, 12), (x, y, z, nx, ny) => mixC(0xbff0ff, 0xffffff, clamp(ny * 0.5 + 0.4, 0, 1)), gx, gy + 1.85, gz);
      for (let i = 0; i < 16; i++) { const th = Math.acos(1 - rnd2() * 1.3), ph = rnd2() * TAU; k.add(P.sph(0.2, 6, 4), pick(rnd2, [0xff5fa2, 0xffd45c, 0x3fe0b8, 0x8f6bff, 0xff8a4c]), gx + Math.sin(th) * Math.cos(ph) * 1.02, gy + 1.85 + Math.cos(th) * 1.02 * (th > 1.2 ? -1 : 1), gz + Math.sin(th) * Math.sin(ph) * 1.02); }
      k.add(P.cyl(0.25, 0.32, 0.25, 10), PAL.gold, gx, gy + 3.05, gz); k.add(P.sph(0.14, 8, 6), 0xff4d6e, gx, gy + 3.25, gz);
    }
    signBoard(k, W, D, H, p, 5.4);
  };

  B.hangar = (k, p) => {
    const W = 16, D = 14, H = 4.8;
    shell(k, { W, D, H, p, roof: false, rug: false });
    const sh = new THREE.Shape(); sh.absarc(0, 0, W / 2 + 0.75, 0, PI, false); sh.absarc(0, 0, W / 2 + 0.15, PI, 0, true);
    const arch = extrude(sh, D + 1.0, 0.08, 22, 1);
    xf(arch, 0, FY + H - 0.1, 0, 0, 0, 0, 1, 0.42, 1);
    k.addRaw(arch, (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.6 ? C(p.trim) : Math.sin(x * 1.1) > 0.82 ? C(0xc8d4f0) : C(p.roof)));
    const gab = new THREE.Shape(); gab.absarc(0, 0, W / 2 + 0.2, 0, PI, false); gab.lineTo(W / 2 + 0.2, 0);
    const gg = extrude(gab, 0.4, 0.05, 20, 1); xf(gg, 0, FY + H - 0.1, -D / 2 + 0.25, 0, 0, 0, 1, 0.42, 1);
    k.addRaw(gg, p.wall);
    porthole(k, 0, FY + H + 1.4, -D / 2 + 0.25, 0.75, 'z', p.trim, p.glow, 0.5);
    for (const zz of [-D / 3, 0, D / 3]) { const r = P.tor(W / 2 + 0.78, 0.14, 6, 30, PI); xf(r, 0, FY + H - 0.1, zz, 0, 0, 0, 1, 0.42, 1); k.addRaw(r, 0xffffff); }
    const fr = P.tor(W / 2 + 0.5, 0.32, 8, 30, PI); xf(fr, 0, FY + H - 0.1, D / 2 + 0.55, 0, 0, 0, 1, 0.42, 1); k.addRaw(fr, p.trim);
    k.box(0, FY + H + 0.15, 0, W + 1.2, 0.5, D + 1.2);
    // parked-open sliding doors
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 1.85);
      k.add(P.rbox(3.0, H - 1.2, 0.4, 0.12, 1), p.panel, x, FY + (H - 1.2) / 2, D / 2 - 1.15);
      for (let i = 0; i < 5; i++) k.add(P.box(0.5, 0.35, 0.44), i % 2 ? PAL.navy : 0xffd23f, x - 1.2 + i * 0.6, FY + 0.3, D / 2 - 1.15);
      k.glow(P.rbox(1.8, 0.5, 0.44, 0.1, 1), p.glow, x, FY + 2.6, D / 2 - 1.15);
      k.box(x, FY + (H - 1.2) / 2, D / 2 - 1.15, 3.0, H - 1.2, 0.4);
    }
    // landing pad markings + floor lights
    const ring = P.tor(3.0, 0.14, 4, 36); k.add(ring, 0xffd23f, 0, FY + 0.05, -0.5, PI / 2, 0, 0, 1, 1, 0.25);
    for (const sx of [-1, 1]) k.add(P.box(0.35, 0.03, 2.6), 0xffd23f, sx * 0.9, FY + 0.05, -0.5);
    k.add(P.box(1.8, 0.03, 0.35), 0xffd23f, 0, FY + 0.05, -0.5);
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) k.glow(P.box(0.3, 0.08, 0.3), p.glow, sx * (W / 2 - 1.1), FY + 0.07, -D / 2 + 2 + i * 2.4);
    k.anchor('ship', 0, FY, -0.5);
    // workbench, fuel tanks
    counter(k, -5.2, -D / 2 + 1.7, 3.0, 0.9, p, 0xdfe6f6);
    for (let i = 0; i < 2; i++) { const x = 5.4 - i * 1.3; k.add(P.cap(0.5, 1.2, 4, 12), i ? 0xff8a1f : 0xff4d5e, x, FY + 1.1, -D / 2 + 1.4); k.add(P.tor(0.5, 0.06, 5, 14), PAL.navy, x, FY + 1.1, -D / 2 + 1.4, PI / 2, 0, 0); k.cyl(x, -D / 2 + 1.4, 0.55, FY, FY + 2.2); }
    const archY = x => FY + H - 0.1 + 0.42 * Math.sqrt(Math.max(0, (W / 2 + 0.75) * (W / 2 + 0.75) - x * x));
    dish(k, 5.0, archY(5.0) - 0.25, -3.2, 1.0, 0xfdfbff, 0.6);
    antenna(k, -5.0, archY(5.0) - 0.2, -3.6, 2.0, PAL.navy, 0xff6b6b);
    { // parked skiff on the crest (GDD: "skiff on the roof")
      const sy = archY(0) + 0.55, sz = -0.6;
      k.add(P.cap(0.55, 2.3, 4, 12), (x, y, z) => (z > 0.9 ? C(0xff8a1f) : C(0xfdfbff)), 0, sy, sz, PI / 2, 0, 0);
      k.add(P.cone(0.5, 0.9, 12), 0xff8a1f, 0, sy, sz + 2.05, PI / 2, 0, 0);
      k.glow(P.sph(0.42, 12, 8), 0x9ff0ff, 0, sy + 0.38, sz + 0.5, 0, 0, 0, 0.8, 0.7, 1.4);
      for (const sx of [-1, 1]) { k.add(P.rbox(1.9, 0.14, 1.0, 0.06, 1), 0x3fa9ff, sx * 1.3, sy - 0.1, sz - 0.3, 0, sx * 0.35, sx * -0.12); k.glow(P.sph(0.12, 6, 4), sx < 0 ? 0xff6b6b : 0x8bea4a, sx * 2.2, sy - 0.1, sz - 0.55); }
      k.add(P.rbox(0.12, 0.9, 0.8, 0.05, 1), 0x3fa9ff, 0, sy + 0.55, sz - 1.25, -0.3, 0, 0);
      k.glow(P.tor(0.34, 0.1, 6, 14), PAL.coil, 0, sy, sz - 1.55);
      for (const sx of [-1, 1]) k.add(P.cyl(0.06, 0.08, 0.7, 6), PAL.navy, sx * 0.4, sy - 0.75, sz);
    }
    k.add(xf(emblemGeo('wing').clone(), 0, 0, 0, 0, 0, 0, 1.8), null, 0, FY + H + 2.1, D / 2 + 0.9);
    signBoard(k, W, D, H, p, 6.4);
  };

  B.arena = (k, p) => {
    const W = 14, D = 10, H = 5.4, A = p.accent, Bc = p.accent2 || PAL.teamB, rnd = G.rng(19);
    shell(k, { W, D, H, p, header: false, rug: false });
    const R = 5.0;
    const gate = P.tor(R, 0.62, 12, 30, PI);
    k.add(gate, (x, y, z, nx) => (Math.abs(x) < 0.25 ? C(0xffffff) : x < 0 ? C(A) : C(Bc)), 0, FY, D / 2 + 0.1);
    for (const sx of [-1, 1]) { k.add(P.rbox(1.5, 0.6, 1.5, 0.15, 1), PAL.navy, sx * R, FY + 0.3, D / 2 + 0.1); k.box(sx * R, FY + 1.5, D / 2 + 0.1, 1.3, 3, 1.3); }
    k.add(P.rbox(W + 0.3, 0.9, 0.85, 0.22, 2), p.panel, 0, FY + H - 0.45, D / 2 - 0.3);
    k.box(0, FY + H - 0.45, D / 2 - 0.3, W, 0.9, 0.85);
    for (const sx of [-1, 1]) {
      const tx = sx * (W / 2 + 0.3), tz = D / 2 - 0.6, col = sx < 0 ? A : Bc, th = H + 3;
      const tb = []; for (let y = 0; y < th; y += 1.4) tb.push([y, (Math.round(y / 1.4) % 2) ? col : 0xfdfbf5]);
      k.add(ringStack(banded([[1.3, 0], [1.22, th * 0.5], [1.15, th]], tb), 12), null, tx, 0, tz);
      const dome = P.sph(1.25, 16, 8); { const dp = dome.attributes.position; for (let i = 0; i < dp.count; i++) if (dp.getY(i) < 0) dp.setY(i, 0); } dome.computeVertexNormals();
      k.add(dome, col, tx, th, tz);
      k.add(P.tor(1.25, 0.14, 6, 20), PAL.navy, tx, th, tz, PI / 2, 0, 0);
      k.glow(P.sph(0.32, 10, 8), lighten(col, 0.3), tx, th + 1.4, tz);
      k.add(P.cyl(0.08, 0.08, 0.6, 6), PAL.navy, tx, th + 1.05, tz);
      k.cyl(tx, tz, 1.3, -2, th + 1);
    }
    // paint splats on walls and floor
    const sc = [A, Bc, 0xff5fa2, 0x8bea4a];
    for (let i = 0; i < 6; i++) flatSplat(k, i, sc[i % 4], 0.7 + rnd() * 0.5, -W / 2 + 1.5 + i * 2.2, FY + 1.8 + rnd() * 2.2, -D / 2 + 0.78, 0, 0, rnd() * 6);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) flatSplat(k, i + 1, sc[(i + (sx > 0 ? 1 : 0)) % 4], 0.6 + rnd() * 0.5, sx * (W / 2 + 0.03), FY + 1.6 + rnd() * 2.8, -D / 2 + 1.6 + i * 2.6, 0, sx * PI / 2, rnd() * 6);
    for (let i = 0; i < 5; i++) flatSplat(k, i, sc[i % 4], 0.6 + rnd() * 0.6, (rnd() - 0.5) * (W - 3), FY + 0.05 + i * 0.002, (rnd() - 0.5) * (D - 3), -PI / 2, 0, rnd() * 6);
    flatSplat(k, 2, A, 0.8, -R - 0.2, FY + 2.6, D / 2 + 0.76, 0, 0, 1); flatSplat(k, 3, Bc, 0.8, R + 0.2, FY + 3.2, D / 2 + 0.76, 0, 0, 2);
    // big screen
    k.add(P.rbox(6.4, 2.8, 0.3, 0.16, 1), PAL.navy, 0, FY + 3.1, -D / 2 + 0.68);
    k.glow(P.rbox(2.85, 2.2, 0.06, 0.06, 1), lighten(A, 0.15), -1.45, FY + 3.1, -D / 2 + 0.86); k.glow(P.rbox(2.85, 2.2, 0.06, 0.06, 1), lighten(Bc, 0.25), 1.45, FY + 3.1, -D / 2 + 0.86);
    k.add(P.rbox(0.12, 2.2, 0.08, 0.03, 1), 0xffffff, 0, FY + 3.1, -D / 2 + 0.9);
    counter(k, 0, -0.6, 4.2, 0.9, p, 0xffd23f);
    // roof: tipped paint can + speakers
    k.add(P.cyl(1.1, 1.1, 1.8, 18), (x, y) => (y > 0.55 ? C(0xfdfbf5) : C(0xb8c0d8)), -2.6, FY + H + 1.5, -1.6, 0, 0, 1.1);
    flatSplat(k, 1, A, 1.6, -0.9, FY + H + 0.58, -1.2, -PI / 2, 0, 0.4);
    for (const sx of [-1, 1]) { k.add(P.rbox(1.3, 1.7, 1.1, 0.2, 1), PAL.navy, sx * 3.6 + 1.5, FY + H + 1.4, -2.6); k.add(P.cyl(0.42, 0.42, 0.12, 14), sx < 0 ? A : Bc, sx * 3.6 + 1.5, FY + H + 1.55, -2.0, PI / 2, 0, 0); }
    k.add(xf(emblemGeo('splat', 0xff5fa2).clone(), 0, 0, 0, 0, 0, 0, 2.4), null, 0, FY + H + 1.6, D / 2 - 0.1);
    k.anchor('gate', 0, FY, D / 2 + 1.2);
    p.sign = 0xfffaf2;
    signBoard(k, W, D, H - 0.1, p, 5.4);
  };

  B.royale = (k, p) => {
    const W = 12, D = 10, H = 4.8;
    shell(k, { W, D, H, p });
    const tz = -1.6, y0 = FY + H + 0.55, th = 9.5;
    const cb = []; for (let y = 0; y < th; y += 1.6) cb.push([y, (Math.round(y / 1.6) % 2) ? p.panel : p.wall]);
    k.add(ringStack(banded([[1.6, 0], [1.45, 0.4], [1.25, th * 0.5], [1.15, th], [0, th + 0.05]], cb), 18), null, 0, y0, tz);
    for (let i = 0; i < 3; i++) {
      const yy = y0 + 2.2 + i * 2.6, rr = 1.42 - i * 0.08;
      k.add(P.tor(rr, 0.16, 6, 24), p.trim, 0, yy, tz, PI / 2, 0, 0);
      for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU + i * 0.4; k.glow(P.oct(0.12), p.glow, Math.cos(a) * (rr + 0.12), yy + 0.18, tz + Math.sin(a) * (rr + 0.12)); }
    }
    const ty = y0 + th;
    k.add(P.cyl(2.5, 2.2, 0.45, 22), p.roof, 0, ty + 0.2, tz); k.add(P.tor(2.5, 0.14, 6, 26), p.trim, 0, ty + 0.42, tz, PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + PI / 2; k.addRaw(tubeAB(new V3(Math.cos(a) * 1.9, ty + 0.4, tz + Math.sin(a) * 1.9), new V3(Math.cos(a) * 0.8, ty + 2.4, tz + Math.sin(a) * 0.8), 0.12, 0.09, 6), PAL.navy); }
    k.add(P.cap(0.78, 1.3, 6, 16), (x, y) => (y > -0.1 ? C(0xfdfbff) : C(p.accent)), 0, ty + 2.0, tz);
    k.add(P.cone(0.5, 0.7, 14), p.accent, 0, ty + 3.35, tz);
    k.glow(P.sph(0.36, 12, 8), 0x9ff0ff, 0, ty + 2.3, tz + 0.62, 0, 0, 0, 1, 1, 0.45);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + PI / 2; k.add(P.rbox(0.12, 0.8, 0.6, 0.04, 1), p.accent, Math.cos(a) * 0.82, ty + 1.15, tz + Math.sin(a) * 0.82, 0, -a, 0); }
    k.glow(P.tor(0.5, 0.12, 6, 16), p.glow, 0, ty + 0.95, tz, PI / 2, 0, 0);
    k.cyl(0, tz, 1.6, FY + H, ty + 0.45);
    k.anchor('pod', 0, ty + 2.0, tz); k.anchor('launch', 0, FY, 0.5);
    { // docked airship balloon (GDD)
      const ax = 4.4, ay = ty - 0.6, az = tz - 0.5;
      const env = ringStack(banded([[0, -2.8], [0.8, -2.4], [1.3, -1.4], [1.45, 0], [1.3, 1.4], [0.8, 2.4], [0, 2.8]], [[-3, p.panel], [-1.6, 0xfdfbff], [-0.55, p.panel], [0.55, 0xfdfbff], [1.6, p.panel]]), 14);
      k.add(env, null, ax, ay, az, 0, 0, PI / 2);
      for (const [rx, rz] of [[0, 0], [PI / 2, 0]]) { k.add(P.rbox(0.1, 1.0, 0.9, 0.04, 1), p.accent, ax - 2.6, ay, az, rx, 0, rz); }
      k.add(P.rbox(1.4, 0.55, 0.7, 0.18, 1), 0xa86a3c, ax, ay - 1.75, az);
      for (const sx of [-1, 1]) k.add(P.cyl(0.02, 0.02, 0.5, 3), PAL.navy, ax + sx * 0.5, ay - 1.35, az);
      k.addRaw(tubeAB(new V3(ax - 1.4, ay, az), new V3(1.2, ay + 0.3, tz), 0.03, 0.03, 4), PAL.navy);
      k.glow(P.sph(0.1, 6, 4), 0xff6b6b, ax + 2.8, ay, az);
    }
    // lobby: counter, mockup pods, launch map screen
    counter(k, -3.2, -1.4, 3.2, 0.9, p);
    k.add(P.rbox(5.2, 2.4, 0.2, 0.14, 1), PAL.navy, 1.6, FY + 2.7, -D / 2 + 0.66);
    k.glow(P.rbox(4.7, 1.95, 0.05, 0.08, 1), 0x8f7bff, 1.6, FY + 2.7, -D / 2 + 0.79);
    for (let i = 0; i < 4; i++) k.glow(P.sph(0.12, 6, 4), i === 2 ? 0xff6b6b : 0xffe066, 0.2 + i * 0.9, FY + 2.3 + (i % 2) * 0.7, -D / 2 + 0.84);
    for (let i = 0; i < 2; i++) {
      const x = 3.6, z = 0.4 + i * 2.0;
      k.add(P.cyl(0.6, 0.7, 0.4, 14), PAL.navy, x, FY + 0.2, z);
      k.add(P.cap(0.42, 0.6, 4, 12), (xx, y) => (y > 0.85 ? C(0xfdfbff) : C(i ? 0x3fe0b8 : p.accent)), x, FY + 1.05, z);
      k.cyl(x, z, 0.65, FY, FY + 1.9);
    }
    k.add(xf(emblemGeo('pod').clone(), 0, 0, 0, 0, 0, 0, 1.8), null, -3.8, FY + H + 1.6, D / 2 - 0.6);
    k.add(P.rbox(1.4, 0.3, 1.4, 0.1, 1), PAL.navy, -3.8, FY + H + 0.65, D / 2 - 0.6);
    signBoard(k, W, D, H, p, 5.4);
  };

  B.defense = (k, p) => {
    const W = 14, D = 12, H = 4.6, t = 1.0, door = 4.8;
    k.add(P.rbox(W + 0.8, 2.3, D + 0.8, 0.22, 1), p.base, 0, FY - 1.15, 0); k.box(0, FY - 1.15, 0, W + 0.8, 2.3, D + 0.8);
    k.add(P.rbox(W - 1.6, 0.06, D - 1.6, 0.03, 1), p.floor, 0, FY, 0);
    const stone = (x, z, w, d, h, y0) => {
      y0 = y0 == null ? FY : y0;
      k.add(P.rbox(w, h, d, 0.18, 1), p.wall, x, y0 + h / 2, z);
      k.add(P.rbox(w + 0.08, 0.9, d + 0.08, 0.14, 1), darken(p.wall, 0.12), x, y0 + 0.45, z);
      k.box(x, y0 + h / 2, z, w, h, d);
      const along = w > d, L = along ? w : d, n = Math.max(1, Math.floor(L / 1.25));
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const o = -L / 2 + (L / n) * (i + 0.5);
        k.add(P.box(along ? (L / n) * 0.9 : w + 0.1, 0.7, along ? d + 0.1 : (L / n) * 0.9), p.wall, x + (along ? o : 0), y0 + h + 0.35, z + (along ? 0 : o));
      }
      k.add(P.rbox(w + 0.12, 0.14, d + 0.12, 0.05, 1), p.panel, x, y0 + h - 0.05, z);
    };
    stone(0, -D / 2 + t / 2, W, t, H);
    for (const sx of [-1, 1]) stone(sx * (W / 2 - t / 2), 0, t, D - 2 * t, H);
    const segW = (W - door) / 2;
    for (const sx of [-1, 1]) stone(sx * (door / 2 + segW / 2), D / 2 - t / 2, segW, t, H);
    // lintel / gatehouse over the door with raised portcullis
    k.add(P.rbox(door + 1.2, 1.4, t + 0.4, 0.2, 2), p.panel, 0, FY + H - 0.1, D / 2 - t / 2);
    k.box(0, FY + H - 0.1, D / 2 - t / 2, door + 1.2, 1.4, t + 0.4);
    for (let i = 0; i < 6; i++) k.add(P.cyl(0.07, 0.07, 1.1, 6), PAL.navy, -door / 2 + 0.5 + i * ((door - 1) / 5), FY + H - 0.95, D / 2 - 0.1);
    k.add(P.rbox(door, 0.12, 0.14, 0.04, 1), PAL.navy, 0, FY + H - 1.45, D / 2 - 0.1);
    k.add(xf(emblemGeo('shield').clone(), 0, 0, 0, 0, 0, 0, 1.3), null, 0, FY + H + 1.85, D / 2 - 0.25);
    // corner towers with shield emitters
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (W / 2 - 0.3), z = sz * (D / 2 - 0.3), th = H + 1.8;
      k.add(P.cyl(1.25, 1.4, th, 16), p.wall, x, FY + th / 2 - 0.3, z);
      k.add(P.tor(1.3, 0.14, 6, 18), p.panel, x, FY + th - 0.3, z, PI / 2, 0, 0);
      k.add(P.cone(1.45, 1.6, 16), p.roof, x, FY + th + 0.5, z);
      k.glow(P.sph(0.34, 10, 8), p.glow, x, FY + th + 1.55, z);
      k.cyl(x, z, 1.35, -2, FY + th + 1.3);
    }
    // the core
    const cz = -1.2;
    k.add(ringStack([[1.5, 0], [1.5, 0.3], [1.1, 0.4], [1.1, 0.8], [0.7, 0.9], [0.6, 1.4], [0.9, 1.55], [0, 1.6]], 18), (x, y) => (y > 1.45 ? C(p.trim) : y > 0.85 ? C(p.panel) : C(darken(p.wall, 0.08))), 0, FY, cz);
    k.glow(P.sph(0.85, 18, 12), p.glow, 0, FY + 2.6, cz);
    k.add(P.tor(1.25, 0.09, 6, 28), PAL.gold, 0, FY + 2.6, cz, 1.2, 0.3, 0);
    k.add(P.tor(1.45, 0.09, 6, 28), PAL.gold, 0, FY + 2.6, cz, -0.9, 0.9, 0);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + PI / 4, x = Math.cos(a) * 2.6, z = cz + Math.sin(a) * 2.6; k.add(P.rbox(0.4, 1.6, 0.4, 0.1, 1), p.panel, x, FY + 0.8, z); k.glow(P.oct(0.24), p.glow, x, FY + 1.85, z); k.cyl(x, z, 0.3, FY, FY + 1.7); }
    k.glow(P.tor(2.0, 0.07, 4, 36), p.glow, 0, FY + 0.06, cz, PI / 2, 0, 0);
    k.cyl(0, cz, 1.5, FY, FY + 1.6); k.cyl(0, cz, 0.9, FY + 1.6, FY + 3.5);
    k.anchor('core', 0, FY + 2.6, cz);
    counter(k, -4.3, 2.4, 2.4, 0.9, p, p.trim, PI / 2);
    k.anchor('door', 0, FY, D / 2 + 0.6); k.anchor('spawn', 0, 0, D / 2 + 4);
    signBoard(k, W, D, H, Object.assign({}, p, { trim: p.panel, accent: p.trim }), door + 1.2, { y: FY + H + 0.12, z: D / 2 + 0.45, backZ: D / 2 + 0.2 });
  };

  B.training = (k, p) => {
    const W = 14, D = 14, H = 4.2;
    shell(k, { W, D, H, p, roof: false, window: false, rug: false });
    k.add(P.rbox(W + 1.5, 0.5, 6.0, 0.24, 2), p.roof, 0, FY + H + 0.25, D / 2 - 2.6);
    k.add(P.rbox(W + 1.0, 0.18, 5.6, 0.08, 1), p.trim, 0, FY + H - 0.03, D / 2 - 2.6);
    k.box(0, FY + H + 0.25, D / 2 - 2.6, W + 1.5, 0.5, 6.0);
    for (let i = 0; i < 7; i++) k.add(P.rbox(2.0, 0.12, 0.1, 0.04, 1), i % 2 ? 0xffffff : p.roof, -W / 2 + 1 + i * 2.0, FY + H + 0.52, D / 2 + 0.36);
    // berm + scoreboard
    k.add(P.rbox(W - 0.6, H + 1.2, 1.2, 0.4, 2), 0xd8b47a, 0, FY + (H + 1.2) / 2, -D / 2 + 1.0); k.box(0, FY + (H + 1.2) / 2, -D / 2 + 1.0, W - 0.6, H + 1.2, 1.2);
    k.add(P.rbox(4.6, 1.3, 0.3, 0.14, 1), PAL.navy, 0, FY + H + 0.9, -D / 2 + 1.5);
    for (let i = 0; i < 3; i++) k.glow(P.rbox(1.1, 0.7, 0.06, 0.05, 1), [0xff6b6b, 0xffe066, 0x8bea4a][i], -1.4 + i * 1.4, FY + H + 0.9, -D / 2 + 1.67);
    // shooting rail with a walk-through gap on the right
    const rz = D / 2 - 4.8, gap = 2.6, rw = W - 1.0 - gap;
    k.add(P.rbox(rw, 1.05, 0.45, 0.14, 1), p.panel, -W / 2 + 0.5 + rw / 2, FY + 0.52, rz);
    k.add(P.rbox(rw + 0.1, 0.12, 0.6, 0.05, 1), p.trim, -W / 2 + 0.5 + rw / 2, FY + 1.1, rz);
    k.box(-W / 2 + 0.5 + rw / 2, FY + 0.58, rz, rw, 1.16, 0.5);
    for (const lx of [-W / 6, W / 6]) k.add(P.box(0.12, 0.02, D - 7), 0xffffff, lx, FY + 0.05, -1.4);
    // targets
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * (W / 3), z = -D / 2 + 2.6;
      k.add(P.cyl(0.08, 0.1, 1.5, 8), PAL.navy, x, FY + 0.75, z - 0.1);
      k.add(P.rbox(0.8, 0.2, 0.5, 0.06, 1), PAL.navy, x, FY + 0.1, z - 0.1);
      k.add(xf(emblemGeo('target').clone(), 0, 0, 0, 0, 0, 0, 1.6), null, x, FY + 1.75, z);
      k.box(x, FY + 1.2, z, 1.6, 2.4, 0.4);
      k.anchor('target' + i, x, FY + 1.75, z + 0.12);
      const bc = [0xff5fa2, 0xffd23f, 0x39d5ff][i];
      k.add(P.sph(0.42, 12, 9), (xx, y, zz, nx, ny) => mixC(darken(bc, 0.1), lighten(bc, 0.45), clamp(ny * 0.6 + 0.4, 0, 1)), x + 0.6, FY + 3.6, z, 0, 0, 0, 1, 1.15, 1);
      k.add(P.cone(0.08, 0.14, 6), bc, x + 0.6, FY + 3.04, z, PI, 0, 0);
      k.add(P.cyl(0.012, 0.012, 1.2, 3), 0xfffaf2, x + 0.35, FY + 2.4, z, 0, 0, 0.4);
    }
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) k.add(P.cap(0.22, 0.5, 3, 8), 0xe8c88a, sx * (W / 2 - 1.2), FY + 0.24 + (i === 2 ? 0.4 : 0), -D / 2 + 2.0 + (i === 2 ? 0.25 : i * 0.5), 0, 0, PI / 2);
    k.anchor('lane', 0, FY, rz + 1.2);
    counter(k, -4.4, D / 2 - 2.3, 2.6, 0.8, p);
    k.add(xf(emblemGeo('target').clone(), 0, 0, 0, 0, 0, 0, 1.6), null, 3.4, FY + H + 1.3, D / 2 - 0.2);
    k.add(P.cyl(0.1, 0.1, 0.8, 6), PAL.navy, 3.4, FY + H + 0.7, D / 2 - 0.35);
    signBoard(k, W, D, H, p, 5.2);
  };

  B.cafe = (k, p) => {
    const W = 8, D = 6.6, H = 3.7;
    shell(k, { W, D, H, p, window: false });
    scallopAwning(k, W - 0.4, D / 2 + 0.05, FY + H - 1.0, [p.roof, 0xfffaf2]);
    counter(k, 0, -0.9, 5.2, 0.85, p, 0xfff6ea);
    k.add(P.rbox(1.2, 0.8, 0.6, 0.12, 1), 0xdfe6f6, -1.4, FY + 1.5, -1.0); k.glow(P.sph(0.07, 6, 4), 0xff6b6b, -1.7, FY + 1.6, -0.68); k.glow(P.sph(0.07, 6, 4), 0x8bea4a, -1.45, FY + 1.6, -0.68);
    for (let i = 0; i < 3; i++) k.add(xf(cupGeo([0xff7a93, 0x3fe0b8, 0xffd45c][i]), 0, 0, 0, 0, 0, 0, 0.3), null, 0.4 + i * 0.5, FY + 1.22, -0.9);
    k.add(P.rbox(2.6, 1.5, 0.1, 0.06, 1), 0x2f5a4a, 0, FY + 2.5, -D / 2 + 0.56);
    for (let i = 0; i < 4; i++) k.add(P.box(1.6 - (i % 2) * 0.4, 0.08, 0.02), [0xffd6e0, 0xfff1b8, 0xbaf2d6, 0xffffff][i], -0.2, FY + 3.0 - i * 0.3, -D / 2 + 0.62);
    const cup = cupGeo(p.accent); xf(cup, 0, 0, 0, 0, 0.4, 0, 2.6);
    k.add(cup, null, 0, FY + H + 1.35, -0.4);
    for (let i = 0; i < 3; i++) { const g = Geo.blob(0.32 - i * 0.06, 1, 0.1, 40 + i); k.add(g, 0xfffaf6, Math.sin(i * 1.7) * 0.25, FY + H + 2.6 + i * 0.5, -0.4); }
    for (const [tx, tz] of [[-2.2, D / 2 + 2.4], [2.2, D / 2 + 2.6]]) {
      k.add(P.cyl(0.6, 0.6, 0.08, 16), 0xfffaf2, tx, 0.78, tz); k.add(P.cyl(0.07, 0.09, 0.75, 6), PAL.navy, tx, 0.38, tz); k.add(P.cyl(0.32, 0.36, 0.06, 12), PAL.navy, tx, 0.03, tz);
      k.cyl(tx, tz, 0.62, 0, 0.82);
      for (const sx of [-1, 1]) { k.add(P.cyl(0.24, 0.2, 0.45, 12), p.accent, tx + sx * 0.95, 0.23, tz); k.cyl(tx + sx * 0.95, tz, 0.25, 0, 0.45); }
    }
    for (const sx of [-1, 1]) { k.add(P.cyl(0.32, 0.24, 0.5, 12), 0xd0805a, sx * (W / 2 + 0.2), FY + 0.25, D / 2 + 0.3); k.add(bushGeo(12 + sx, PAL.grass, 0xff7a93), null, sx * (W / 2 + 0.2), FY + 0.45, D / 2 + 0.3, 0, 0, 0, 0.55); }
    signBoard(k, W, D, H, p, 5.0);
  };

  B.gallery = (k, p) => {
    const W = 13, D = 11, H = 5.4;
    shell(k, { W, D, H, p, pillars: false, rug: false });
    for (const x of [-5.7, -2.2, 2.2, 5.7]) {
      const c = ringStack([[0.62, 0], [0.62, 0.3], [0.46, 0.4], [0.42, H * 0.5], [0.44, H - 1.4], [0.5, H - 1.25], [0.66, H - 1.15], [0.66, H - 0.95], [0, H - 0.9]], 14,
        (th, y, ri) => (ri >= 2 && ri <= 4 ? 1 + 0.06 * Math.max(0, Math.cos(th * 10)) : 1));
      k.add(c, (xx, y) => (y < 0.42 || y > H - 1.3 ? C(p.trim) : C(0xfffaf2)), x, FY, D / 2 - 0.4);
      k.cyl(x, D / 2 - 0.4, 0.55, FY, FY + H);
    }
    const ped = new THREE.Shape(); ped.moveTo(-W / 2 - 0.4, 0); ped.lineTo(W / 2 + 0.4, 0); ped.lineTo(0, 2.2); ped.closePath();
    k.add(extrude(ped, 0.6, 0.12, 4, 1), p.roof, 0, FY + H + 0.5, D / 2 + 0.1);
    const ped2 = new THREE.Shape(); ped2.moveTo(-W / 2 + 0.6, 0.25); ped2.lineTo(W / 2 - 0.6, 0.25); ped2.lineTo(0, 1.75); ped2.closePath();
    k.add(extrude(ped2, 0.2, 0.05, 4, 1), lighten(p.roof, 0.25), 0, FY + H + 0.5, D / 2 + 0.48);
    k.add(xf(emblemGeo('trophy').clone(), 0, 0, 0, 0, 0, 0, 1.2), null, 0, FY + H + 1.4, D / 2 + 0.75);
    { // glass dome with gold ribs (GDD)
      const dy = FY + H + 0.5, dz = -1.4, R = 3.0;
      const dome = P.sph(R, 20, 10); { const dp = dome.attributes.position; for (let i = 0; i < dp.count; i++) if (dp.getY(i) < 0) dp.setY(i, 0); } dome.scale(1, 0.8, 1); dome.computeVertexNormals();
      k.add(dome, (x, y, z, nx, ny) => mixC(0xa8e4ff, 0xf2fcff, clamp(ny * 0.7 + 0.2, 0, 1)), 0, dy, dz);
      for (let i = 0; i < 4; i++) { const rib = P.tor(R + 0.03, 0.08, 4, 16, PI); xf(rib, 0, 0, 0, 0, (i / 4) * PI, 0, 1, 0.8, 1); k.add(rib, PAL.gold, 0, dy, dz); }
      k.add(P.tor(R, 0.14, 6, 24), PAL.gold, 0, dy + 0.05, dz, PI / 2, 0, 0);
      k.add(xf(emblemGeo('star').clone(), 0, 0, 0, 0, 0, 0, 0.9), null, 0, dy + R * 0.8 + 0.55, dz);
    }
    k.add(P.rbox(1.6, 0.04, D - 2, 0.02, 1), p.accent, 0, FY + 0.04, -0.4);
    const peds = [[-3.6, -3.4], [0, -3.6], [3.6, -3.4], [-4.6, 0.2], [4.6, 0.2]];
    const prizes = ['trophy', 'star', 'gem', 'bolt', 'heart'];
    peds.forEach(([x, z], i) => {
      k.add(P.cyl(0.6, 0.7, 1.0, 16), 0xfffaf2, x, FY + 0.5, z); k.add(P.cyl(0.7, 0.7, 0.12, 16), p.trim, x, FY + 1.04, z); k.add(P.cyl(0.75, 0.75, 0.1, 16), p.panel, x, FY + 0.05, z);
      if (prizes[i] === 'gem') k.glow(P.oct(0.42), 0x7af0ff, x, FY + 1.65, z, 0, 0.4, 0, 1, 1.3, 1);
      else k.add(xf(emblemGeo(prizes[i]).clone(), 0, 0, 0, 0, 0, 0, i === 0 ? 1.0 : 0.8), null, x, FY + 1.6, z);
      k.glow(P.tor(0.6, 0.03, 4, 18), p.glow, x, FY + 1.11, z, PI / 2, 0, 0);
      k.cyl(x, z, 0.72, FY, FY + 1.1);
      k.anchor('pedestal' + i, x, FY + 1.1, z);
    });
    for (let i = 0; i < 3; i++) { k.add(P.rbox(1.8, 1.3, 0.1, 0.06, 1), p.trim, -3.6 + i * 3.6, FY + 3.3, -D / 2 + 0.56); k.add(P.rbox(1.5, 1.0, 0.06, 0.04, 1), [0x9ad8ff, 0xffd6e0, 0xbaf2d6][i], -3.6 + i * 3.6, FY + 3.3, -D / 2 + 0.63); }
    counter(k, -3.3, 2.0, 2.4, 0.8, p, p.trim);
    signBoard(k, W, D, H, p, 5.6);
  };

  B.house = (k, p, o) => {
    const rnd = G.rng((o.seed || 1) * 37 + 5);
    const wall = (o.palette && o.palette.wall) || pick(rnd, [0xffd6e0, 0xfff1b8, 0xc8f0e0, 0xd8d0ff, 0xffd8b0, 0xcfe8ff]);
    const roof = (o.palette && o.palette.roof) || pick(rnd, [0xff6b6b, 0x3fbfb0, 0x5b6fd8, 0xff9a4c, 0x8f6bff]);
    const W = 7, D = 6, H = 3.2;
    k.add(P.rbox(W + 0.6, 1.6, D + 0.6, 0.18, 1), p.base, 0, FY - 0.8, 0); k.box(0, FY - 0.8, 0, W + 0.6, 1.6, D + 0.6);
    k.add(P.rbox(W, H, D, 0.28, 2), wall, 0, FY + H / 2, 0); k.box(0, FY + H / 2, 0, W, H, D);
    k.add(P.rbox(W + 0.12, 0.6, D + 0.12, 0.12, 1), darken(wall, 0.1), 0, FY + 0.3, 0);
    k.add(P.rbox(W + 0.16, 0.14, D + 0.16, 0.05, 1), 0xfffaf2, 0, FY + H - 0.08, 0);
    const gs = new THREE.Shape(); gs.moveTo(-W / 2 - 0.5, 0); gs.lineTo(W / 2 + 0.5, 0); gs.lineTo(0.35, 2.2); gs.quadraticCurveTo(0, 2.45, -0.35, 2.2); gs.closePath();
    const roofD = darken(roof, 0.14), roofL = lighten(roof, 0.12);
    k.add(extrude(gs, D + 0.8, 0.14, 6, 2), (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.6 ? C(roofD) : ny < -0.5 ? C(roofD) : C(roof)), 0, FY + H, 0);
    for (const sx of [-1, 1]) k.add(P.box(0.18, 0.12, D + 1.0), roofL, sx * (W / 2 + 0.25), FY + H + 0.22, 0, 0, 0, sx * -0.72);
    k.add(P.rbox(0.5, 0.3, D + 1.1, 0.12, 1), roofL, 0, FY + H + 2.32, 0);
    k.box(0, FY + H + 0.6, 0, W + 1, 1.2, D + 1);
    k.add(P.rbox(0.7, 1.7, 0.7, 0.12, 1), 0xe8a07a, 1.8, FY + H + 1.3, -0.8); k.add(P.rbox(0.9, 0.2, 0.9, 0.06, 1), PAL.navy, 1.8, FY + H + 2.2, -0.8);
    k.add(P.rbox(1.3, 2.2, 0.2, 0.18, 2), 0x9a6440, 0, FY + 1.1, D / 2 + 0.04); k.add(P.sph(0.08, 8, 6), PAL.gold, 0.42, FY + 1.1, D / 2 + 0.18);
    k.add(P.rbox(1.9, 0.14, 0.7, 0.06, 1), roof, 0, FY + 2.45, D / 2 + 0.3, -0.25, 0, 0);
    k.add(P.rbox(1.8, 0.24, 0.9, 0.08, 1), 0xd8c0a0, 0, FY - 0.12, D / 2 + 0.6);
    for (const sx of [-1, 1]) {
      porthole(k, sx * 2.1, FY + 1.9, D / 2, 0.42, 'z', 0xfffaf2, p.glow, 0.12);
      k.add(P.rbox(1.0, 0.24, 0.3, 0.06, 1), 0x9a6440, sx * 2.1, FY + 1.3, D / 2 + 0.18);
      for (let i = 0; i < 3; i++) k.add(P.sph(0.12, 6, 4), [0xff7a93, 0xffd45c, 0xff8a4c][i], sx * 2.1 - 0.3 + i * 0.3, FY + 1.5, D / 2 + 0.2);
      porthole(k, sx * (W / 2), FY + 1.9, 0, 0.42, 'x', 0xfffaf2, p.glow, 0.12);
    }
    k.anchor('door', 0, FY, D / 2 + 0.8); k.anchor('spawn', 0, 0, D / 2 + 3);
  };

  Geo.BUILDING_KINDS = Object.keys(B);
  // Baked ground occlusion for kit parts: vertical faces darken toward the ground line y0 (and more on the
  // foundation below it), floors get a faint film, so buildings sit on the plaza instead of floating.
  function groundAO(geos, y0, k, hh) {
    k = k == null ? 0.26 : k; hh = hh || 1.5;
    for (const g of geos) {
      const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
      if (!p || !n || !c) continue;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), ny = n.getY(i);
        let m = 1;
        if (Math.abs(ny) < 0.6) m = y < y0 - 0.05 ? 1 - k * 1.1 : 1 - k * (1 - sstep(y0 - 0.05, y0 + hh, y));
        else if (ny > 0 && y < y0 + 0.08) m = 0.95;
        if (m < 0.999) c.setXYZ(i, c.getX(i) * m, c.getY(i) * m, c.getZ(i) * m);
      }
      c.needsUpdate = true;
    }
  }
  Geo.groundAO = groundAO;
  // building(kind, {label, palette:{...}, seed, lod}) -> {mesh, colliders, anchors, meta}
  // lod: primitive segment scale (default 0.6; distant set dressing can use ~0.4).
  Geo.building = function (kind, opts) {
    opts = opts || {};
    if (!B[kind]) kind = 'house';
    const pal = Object.assign({}, BPAL[kind], opts.palette || {});
    const lod = opts.lod || 0.6;
    const key = 'bld|' + kind + '|' + JSON.stringify(opts.palette || {}) + '|' + (opts.seed || 0) + (lod !== 0.6 ? '|lod' + lod : '');
    let prop;
    LOD = lod;
    try { prop = cached(key, k => { B[kind](k, pal, opts); groundAO(k.s.concat(k.m), FY); }, { rimStr: 0.2 }); } finally { LOD = 1; }
    prop.kind = kind;
    const sm = prop.meta && prop.meta.sign;
    if (opts.label && sm && prop.anchors.sign) {
      const tp = textPlane(opts.label, sm.w, sm.h, { bg: css(sm.bg), border: css(sm.border), fg: '#1e1a4d', bw: 8, radius: 26 });
      tp.position.copy(prop.anchors.sign).z += 0.012;
      prop.mesh.add(tp);
    }
    return prop;
  };
  // ------------------------------------------------------------------ plaza & street props
  // Paved ground (flat, 6 cm, no collider). plaza(radius): concentric tile rings with a coloured border;
  // paving(w, d, {tile, colors, border}): rectangular tile grid. Origin at the centre, top at y≈0.06.
  function tileQuads(pos, col, quads) {
    for (const q of quads) {
      const c = C(q.c);
      for (const v of [q.a, q.b, q.d, q.b, q.e, q.d]) { pos.push(v[0], 0.06, v[1]); col.push(c.r, c.g, c.b); }
    }
  }
  function flatGeo(pos, col) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  Geo.plaza = function (radius, opts) {
    radius = radius || 14; opts = opts || {};
    const cols = opts.colors || [0xfff1dc, 0xf7dcb8, 0xffe6c8], border = opts.border != null ? opts.border : 0x5fd6c8, grout = opts.grout || 0xe0c49c;
    return cached(['plaza', radius.toFixed(1), cols.join(','), border, grout].join('|'), k => {
      const rings = Math.max(3, Math.round(radius / 1.5)), pos = [], col = [], quads = [], rnd = G.rng(5), gap = 0.07;
      for (let i = 0; i < rings; i++) {
        const r0 = (radius * i) / rings + (i ? gap : 0), r1 = (radius * (i + 1)) / rings - gap;
        const segs = i === 0 ? 1 : Math.max(8, Math.round((TAU * r1) / 1.5));
        if (i === 0) { const n = 16; for (let j = 0; j < n; j++) { const a0 = (j / n) * TAU, a1 = ((j + 1) / n) * TAU; quads.push({ a: [0, 0], b: [0, 0], d: [Math.cos(a1) * r1, -Math.sin(a1) * r1], e: [Math.cos(a0) * r1, -Math.sin(a0) * r1], c: cols[0] }); } continue; }
        for (let j = 0; j < segs; j++) {
          const da = gap / r1, a0 = (j / segs) * TAU + da, a1 = ((j + 1) / segs) * TAU - da;
          const c = i === rings - 1 ? border : (i === rings - 2 && j % 2 ? 0xffd45c : cols[(i + j + (rnd() < 0.15 ? 1 : 0)) % cols.length]);
          quads.push({ a: [Math.cos(a0) * r0, -Math.sin(a0) * r0], b: [Math.cos(a0) * r1, -Math.sin(a0) * r1], d: [Math.cos(a1) * r0, -Math.sin(a1) * r0], e: [Math.cos(a1) * r1, -Math.sin(a1) * r1], c });
        }
      }
      tileQuads(pos, col, quads);
      k.addRaw(flatGeo(pos, col));
      k.add(ringStack([[radius + 0.15, -0.3], [radius + 0.15, 0.02], [radius, 0.04], [0, 0.04]], 48), grout, 0, 0, 0);
    });
  };
  Geo.paving = function (w, d, opts) {
    w = w || 20; d = d || 10; opts = opts || {};
    const t = opts.tile || 1.6, cols = opts.colors || [0xfff1dc, 0xf7dcb8, 0xeedcc4], border = opts.border != null ? opts.border : 0x5fd6c8, grout = opts.grout || 0xe0c49c;
    return cached(['paving', w, d, t, cols.join(','), border, grout].join('|'), k => {
      const nx = Math.max(1, Math.round(w / t)), nz = Math.max(1, Math.round(d / t)), tw = w / nx, td = d / nz, gap = 0.06, pos = [], col = [], quads = [], rnd = G.rng(9);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const x0 = -w / 2 + i * tw + gap, x1 = x0 + tw - gap * 2, z0 = -d / 2 + j * td + gap, z1 = z0 + td - gap * 2;
        const edge = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
        const c = edge ? border : cols[(i + j * 2 + (rnd() < 0.2 ? 1 : 0)) % cols.length];
        quads.push({ a: [x0, z1], b: [x1, z1], d: [x0, z0], e: [x1, z0], c });
      }
      tileQuads(pos, col, quads);
      k.addRaw(flatGeo(pos, col));
      k.add(P.box(w + 0.2, 0.34, d + 0.2), grout, 0, -0.13, 0);
    });
  };
  // Plaza fountain (GDD "Fizz Fountain"): tiled rim of radius r, centre bowl + soda jet scaled with r.
  Geo.plazaFountain = function (r) {
    r = r || 3.2;
    return cached('fount|' + r.toFixed(2), k => {
      const s = clamp(r / 3.2, 0.6, 2);
      const rim = ringStack([[r + 0.1, -0.3], [r + 0.15, 0.05], [r, 0.5], [r + 0.08, 0.62], [r + 0.02, 0.78], [r - 0.32, 0.8], [r - 0.42, 0.62], [r - 0.45, 0.25]], 40);
      k.addRaw(rim, (x, y, z, nx, ny) => (y > 0.6 ? C(0xfff1dc) : y > 0.2 && y < 0.45 && ny < 0.5 ? C(0x2cc3d6) : C(0xf2d7a6)));
      const tiles = Math.round(r * 5.5);
      for (let i = 0; i < tiles; i++) { const a = (i / tiles) * TAU; k.add(P.box(0.32, 0.2, 0.07), i % 2 ? 0xffd45c : 0xff7a93, Math.cos(a) * (r + 0.08), 0.33, Math.sin(a) * (r + 0.08), 0, -a + PI / 2, 0); }
      k.add(P.cyl(r - 0.4, r - 0.4, 0.06, 32), (x, y, z) => mixC(0x2cc3d6, 0x9ff6f0, clamp(1 - Math.hypot(x, z) / r, 0, 1)), 0, 0.5, 0);
      const c = new THREE.Group();
      k.add(ringStack([[0.75, 0.4], [0.55, 0.6], [0.42, 1.6], [0.5, 1.8], [0, 1.82]], 16), 0xfff1dc, 0, 0, 0, 0, 0, 0, s);
      const bowl = ringStack([[0.3, 1.75], [1.15, 2.0], [1.32, 2.22], [1.18, 2.3], [0, 2.18]], 22);
      Geo.colorize(bowl, (x, y, z, nx, ny) => (ny > 0.6 && y > 2.15 ? C(0x7fe8e0) : C(0xf2d7a6)));
      k.add(bowl, null, 0, 0, 0, 0, 0, 0, s);
      k.add(P.tor(1.3, 0.07, 6, 24), PAL.gold, 0, 2.24 * s, 0, PI / 2, 0, 0, s);
      k.add(ringStack([[0.25, 2.15], [0.18, 2.8], [0.24, 3.0], [0, 3.05]], 12), 0xfff1dc, 0, 0, 0, 0, 0, 0, s);
      k.add(P.sph(0.32, 14, 10), PAL.gold, 0, 3.25 * s, 0, 0, 0, 0, s);
      const jetH = 1.2 * r;
      k.glow(P.cyl(0.07 * s, 0.2 * s, jetH, 8, true), 0xd8fbff, 0, 3.3 * s + jetH / 2, 0);
      for (let i = 0; i < 3; i++) k.glow(P.sph((0.32 - i * 0.07) * s, 8, 5), 0xf2ffff, Math.sin(i * 2.1) * 0.25 * s, 3.3 * s + jetH + i * 0.22 * s, Math.cos(i * 2.1) * 0.25 * s);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, arc = P.tor(0.7, 0.06, 5, 12, PI * 0.75);
        xf(arc, 0.7, 0, 0, 0, 0, PI * 0.25); xf(arc, 0.6, 2.25, 0, 0, -a, 0, s);
        k.glowRaw(arc, 0xc8f6ff);
        k.glow(P.sph(0.16, 8, 5), 0xe8ffff, Math.cos(a) * 2.0 * s, 0.6, -Math.sin(a) * 2.0 * s, 0, 0, 0, 1.4 * s, 0.35, 1.4 * s);
      }
      void c;
      k.cyl(0, 0, r + 0.12, -0.3, 0.8);
      k.cyl(0, 0, 0.6 * s, 0.8, 2.3 * s);
      k.anchor('center', 0, 0.8, 0); k.anchor('top', 0, 3.3 * s + jetH, 0);
    });
  };
  Geo.lampPost = function (opts) {
    opts = opts || {};
    const col = opts.color != null ? opts.color : 0xfff2b0, mast = opts.mast || 0;
    // opts.mast: the pole carries on above the lamp to this height (a flag mast for bunting), with a finial
    // and a little pennant; anchors.mast = the top
    return cached('lamp|' + col + '|' + !!opts.halo + '|' + mast + '|' + (opts.pennant || 0), k => {
      k.add(P.rbox(0.55, 0.32, 0.55, 0.1, 1), PAL.navy, 0, 0.16, 0);
      k.metal(P.cyl(0.08, 0.11, 3.3, 8), PAL.navy, 0, 1.8, 0);
      for (const y of [0.45, 2.9]) k.metal(P.tor(0.12, 0.04, 4, 8), PAL.gold, 0, y, 0, PI / 2, 0, 0);
      k.metal(P.cyl(0.22, 0.3, 0.12, 10), PAL.gold, 0, 3.45, 0);
      k.glow(P.sph(0.26, 8, 6), col, 0, 3.72, 0);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; k.metal(P.cyl(0.025, 0.025, 0.55, 4), PAL.gold, Math.cos(a) * 0.27, 3.72, Math.sin(a) * 0.27); }
      k.add(P.cone(0.36, 0.3, 10), PAL.navy, 0, 4.1, 0);
      k.metal(P.sph(0.07, 6, 4), PAL.gold, 0, 4.3, 0);
      if (mast > 4.6) {
        k.metal(P.cyl(0.05, 0.065, mast - 4.25, 6), PAL.navy, 0, (mast + 4.25) / 2, 0);
        k.metal(P.tor(0.09, 0.03, 4, 8), PAL.gold, 0, mast - 0.55, 0, PI / 2, 0, 0);
        k.metal(P.sph(0.13, 6, 5), PAL.gold, 0, mast + 0.08, 0);
        const pn = new THREE.Shape(); pn.moveTo(0, 0); pn.lineTo(0.95, -0.2); pn.lineTo(0, -0.42); pn.closePath();
        k.add(extrude(pn, 0.03, 0.01, 1, 1), opts.pennant || 0xff6b8b, 0.04, mast - 0.12, 0);
        k.anchor('mast', 0, mast - 0.25, 0);
      }
      if (opts.halo) k.sprite(col, 2.2, 0, 3.72, 0, 0.5);
      groundAO(k.s.concat(k.m), 0, 0.22, 0.9);
      k.cyl(0, 0, 0.2, 0, 4.2);
      k.anchor('light', 0, 3.72, 0);
    });
  };
  Geo.bench = function (color) {
    color = color != null ? color : PAL.wood;
    return cached('bench|' + color, k => {
      for (let i = 0; i < 3; i++) k.add(P.rbox(2.0, 0.07, 0.15, 0.03, 1), i % 2 ? darken(color, 0.08) : color, 0, 0.47, -0.17 + i * 0.17);
      for (let i = 0; i < 2; i++) k.add(P.rbox(2.0, 0.15, 0.06, 0.03, 1), color, 0, 0.72 + i * 0.22, -0.3 - i * 0.03, -0.18, 0, 0);
      for (const sx of [-1, 1]) {
        k.add(P.rbox(0.09, 0.5, 0.5, 0.03, 1), PAL.navy, sx * 0.9, 0.25, 0);
        k.add(P.rbox(0.09, 0.62, 0.08, 0.03, 1), PAL.navy, sx * 0.9, 0.78, -0.31, -0.18, 0, 0);
        k.add(P.rbox(0.12, 0.07, 0.55, 0.03, 1), PAL.gold, sx * 0.9, 0.68, 0.0);
      }
      groundAO(k.s, 0, 0.24, 0.6);
      k.box(0, 0.45, -0.05, 2.1, 0.9, 0.62);
      k.anchor('seat', 0, 0.5, 0.05);
    });
  };
  Geo.fence = function (length, color) {
    length = length || 6; color = color != null ? color : 0xfffaf2;
    // round posts + rails (~390 tris per 6 m; long perimeters of these were costing ~50k triangles)
    return cached('fence|' + length.toFixed(2) + '|' + color, k => {
      const n = Math.max(1, Math.ceil(length / 1.8));
      for (let i = 0; i <= n; i++) {
        const x = -length / 2 + (length / n) * i;
        k.add(P.cyl(0.09, 0.105, 1.0, 8), color, x, 0.5, 0);
        k.add(P.cyl(0.12, 0.12, 0.08, 8), darken(color, 0.12), x, 0.04, 0);
        k.add(P.sph(0.125, 7, 4), PAL.gold, x, 1.06, 0);
      }
      for (const y of [0.42, 0.8]) k.add(P.cyl(0.045, 0.045, length, 6), PAL.teal, 0, y, 0, 0, 0, PI / 2);
      groundAO(k.s, 0, 0.22, 0.7);
      k.box(0, 0.55, 0, length + 0.2, 1.1, 0.3);
    });
  };
  Geo.bridge = function (length, width) {
    length = length || 10; width = width || 3.6;
    return cached('bridge|' + length.toFixed(2) + '|' + width.toFixed(2), k => {
      const n = Math.max(2, Math.round(length / 0.5)), pl = length / n;
      for (let i = 0; i < n; i++) k.add(P.rbox(width, 0.16, pl - 0.05, 0.04, 1), i % 2 ? PAL.wood : darken(PAL.wood, 0.1), 0, 0.3, -length / 2 + pl * (i + 0.5));
      for (const sx of [-1, 1]) k.add(P.rbox(0.3, 0.3, length, 0.08, 1), PAL.navy, sx * (width / 2 - 0.4), 0.08, 0);
      const arch = P.tor(length / 2, 0.16, 6, 24, PI); xf(arch, 0, 0, 0, 0, PI / 2, 0, 1, 0.22, 1);
      for (const sx of [-1, 1]) { const g = arch.clone(); xf(g, sx * (width / 2 - 0.4), -length * 0.11 + 0.1, 0); k.addRaw(g, PAL.gold); }
      const np = Math.max(2, Math.round(length / 2));
      for (const sx of [-1, 1]) {
        for (let i = 0; i <= np; i++) { const z = -length / 2 + (length / np) * i; k.add(P.rbox(0.16, 1.0, 0.16, 0.05, 1), PAL.navy, sx * (width / 2 + 0.02), 0.85, z); k.add(P.sph(0.1, 6, 4), PAL.gold, sx * (width / 2 + 0.02), 1.38, z); }
        k.add(P.rbox(0.14, 0.12, length, 0.05, 1), PAL.gold, sx * (width / 2 + 0.02), 1.3, 0);
        k.add(P.rbox(0.08, 0.08, length, 0.03, 1), PAL.teal, sx * (width / 2 + 0.02), 0.8, 0);
        k.box(sx * (width / 2 + 0.02), 0.95, 0, 0.22, 1.1, length);
      }
      k.box(0, 0.19, 0, width + 0.2, 0.38, length);
      k.anchor('start', 0, 0.38, length / 2); k.anchor('end', 0, 0.38, -length / 2);
    });
  };
  // Floating sci-fi platform. Origin = centre of the walkable TOP surface; deck spans y in [-h, 0].
  Geo.platform = function (w, d, h) {
    w = w || 6; d = d || 6; h = h || 0.6;
    return cached(['plat', w, d, h].join('|'), k => {
      const deck = P.rbox(w, h, d, Math.min(0.3, h * 0.45), 2);
      k.add(deck, (x, y, z, nx, ny) => (ny > 0.7 ? ((Math.abs(x) > w / 2 - 0.55 || Math.abs(z) > d / 2 - 0.55) ? C(0xffd23f) : C(0xf0fbff)) : C(0x2cc3d6)), 0, -h / 2, 0);
      k.add(P.rbox(w + 0.14, 0.14, d + 0.14, 0.06, 1), PAL.gold, 0, -h * 0.72, 0);
      const hull = P.cyl(Math.min(w, d) * 0.42, 0.3, 1.5, 8); xf(hull, 0, 0, 0, 0, PI / 8, 0, 1, 1, 1);
      k.add(hull, (x, y) => mixC(PAL.navy, 0x3d55b8, clamp(y + 0.75, 0, 1)), 0, -h - 0.75, 0, 0, 0, 0, w / Math.min(w, d), 1, d / Math.min(w, d));
      k.glow(P.tor(0.38, 0.1, 6, 16), PAL.coil, 0, -h - 1.52, 0, PI / 2, 0, 0);
      k.glow(P.cyl(0.3, 0.2, 0.12, 12), 0xc8f6ff, 0, -h - 1.56, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.glow(P.sph(0.1, 6, 4), PAL.coil, sx * (w / 2 - 0.25), -h * 0.72, sz * (d / 2 + 0.07));
      k.box(0, -h / 2, 0, w, h, d);
      k.anchor('top', 0, 0, 0);
    });
  };
  // Ramp rising toward -Z: low end at z=+len/2 (y=0), high end at z=-len/2 (y=h). Stepped colliders.
  Geo.ramp = function (w, len, h) {
    w = w || 3; len = len || 6; h = h || 2;
    return cached(['ramp', w, len, h].join('|'), k => {
      const n = Math.max(2, Math.round(len / 0.75));
      const g = new THREE.BoxGeometry(w, 1, len, 1, 1, n); g.deleteAttribute('uv');
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = p.getZ(i), top = (h * (len / 2 - z)) / len; p.setY(i, p.getY(i) > 0 ? top : 0); }
      g.computeVertexNormals();
      const gg = Geo.smooth(g, 30);
      k.addRaw(gg, (x, y, z, nx, ny) => (ny > 0.3 ? (Math.abs(x) > w / 2 - 0.35 ? C(0xffd23f) : (Math.round((z + len) / (len / n)) % 2 ? C(0xf0fbff) : C(0xd0e2ff))) : C(0x3d55b8)));
      for (const sx of [-1, 1]) { const rail = P.box(0.14, 0.14, Math.hypot(len, h)); xf(rail, sx * (w / 2 + 0.04), h / 2 + 0.07, 0, Math.atan2(h, len), 0, 0); k.addRaw(rail, PAL.gold); }
      const steps = Math.max(2, Math.ceil(h / 0.25));
      for (let i = 1; i <= steps; i++) {
        const z0 = len / 2 - (len * i) / steps, z1 = len / 2 - (len * (i - 1)) / steps, top = (h * (i - 0.35)) / steps;
        k.box(0, top / 2, (z0 + z1) / 2, w, top, z1 - z0);
      }
      k.anchor('bottom', 0, 0, len / 2 + 0.5); k.anchor('top', 0, h, -len / 2);
    });
  };
  // Stairs rising toward -Z, centred.
  Geo.stairs = function (w, h, stepD) {
    w = w || 3; h = h || 2; stepD = stepD || 0.45;
    return cached(['stairs', w, h, stepD].join('|'), k => {
      const n = Math.max(1, Math.ceil(h / 0.3)), sh = h / n, L = n * stepD;
      for (let i = 0; i < n; i++) {
        const top = sh * (i + 1), z = L / 2 - stepD * (i + 0.5);
        k.add(P.rbox(w, top, stepD + 0.02, 0.05, 1), i % 2 ? 0xfff1dc : 0xf2d7a6, 0, top / 2, z);
        k.add(P.rbox(w + 0.04, 0.06, 0.1, 0.02, 1), PAL.gold, 0, top - 0.03, z + stepD / 2 - 0.04);
        k.box(0, top / 2, z, w, top, stepD);
      }
      for (const sx of [-1, 1]) k.add(P.rbox(0.25, h + 0.1, L, 0.08, 1), PAL.navy, sx * (w / 2 + 0.12), (h + 0.1) / 2, 0);
      k.anchor('bottom', 0, 0, L / 2 + 0.5); k.anchor('top', 0, h, -L / 2);
    });
  };
  Geo.jumpPad = function (color) {
    color = color != null ? color : PAL.bio;
    return cached('jpad|' + color, k => {
      k.add(ringStack([[1.35, -0.1], [1.35, 0.12], [1.25, 0.24], [1.0, 0.26], [0, 0.26]], 28), PAL.navy, 0, 0, 0);
      k.add(P.tor(1.3, 0.08, 6, 30), PAL.gold, 0, 0.18, 0, PI / 2, 0, 0);
      k.glow(P.tor(0.9, 0.07, 5, 28), color, 0, 0.27, 0, PI / 2, 0, 0);
      k.glow(P.cyl(0.62, 0.62, 0.04, 24), lighten(color, 0.4), 0, 0.27, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + PI / 4, s = new THREE.Shape(); s.moveTo(-0.14, 0); s.lineTo(0, 0.16); s.lineTo(0.14, 0); s.lineTo(0.14, 0.06); s.lineTo(0, 0.22); s.lineTo(-0.14, 0.06); s.closePath();
        const g = new THREE.ShapeGeometry(s); xf(g, 0, 0, 0, -PI / 2, 0, 0); xf(g, Math.cos(a) * 1.1, 0.27, Math.sin(a) * 1.1, 0, -a - PI / 2, 0);
        k.glowRaw(g, color);
      }
      k.cyl(0, 0, 1.35, -0.1, 0.26);
      k.anchor('pad', 0, 0.26, 0);
    });
  };
  Geo.teleporter = function (color) {
    color = color != null ? color : 0xb983ff;
    return cached('tele|' + color, k => {
      k.add(ringStack([[1.9, -0.1], [1.9, 0.18], [1.75, 0.34], [1.4, 0.36], [0, 0.36]], 30), (x, y, z) => (Math.hypot(x, z) > 1.5 ? C(0xf0fbff) : C(PAL.navy)), 0, 0, 0);
      k.glow(P.cyl(1.2, 1.2, 0.04, 28), lighten(color, 0.35), 0, 0.37, 0);
      for (let i = 0; i < 3; i++) { const g = P.tor(0.4 + i * 0.3, 0.035, 4, 24, PI * 1.2); k.glow(g, color, 0, 0.4, 0, PI / 2, 0, i * 2.1); }
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + PI / 2, x = Math.cos(a) * 1.65, z = Math.sin(a) * 1.65;
        k.add(P.rbox(0.42, 2.4, 0.42, 0.14, 2), 0xf0fbff, x, 1.4, z, 0, -a, 0);
        k.add(P.rbox(0.48, 0.22, 0.48, 0.08, 1), PAL.gold, x, 2.6, z, 0, -a, 0);
        k.glow(P.oct(0.2), color, x, 2.95, z);
        k.glow(P.rbox(0.1, 1.6, 0.46, 0.04, 1), color, x, 1.4, z, 0, -a, 0);
        k.cyl(x, z, 0.32, 0, 2.7);
      }
      k.glow(P.tor(1.15, 0.08, 6, 30), color, 0, 3.0, 0, PI / 2, 0, 0);
      groundAO(k.s, 0, 0.22, 0.6);
      k.cyl(0, 0, 1.9, -0.1, 0.36);
      k.anchor('pad', 0, 0.36, 0); k.anchor('ring', 0, 3.0, 0);
    });
  };
  // Objective beacon with a tall additive light beam (child mesh 'beam').
  Geo.beacon = function (color) {
    color = color != null ? color : 0xffd23f;
    const prop = cached('beacon|' + color, k => {
      k.add(ringStack([[0.85, -0.1], [0.85, 0.18], [0.6, 0.3], [0.5, 0.9], [0.62, 1.05], [0, 1.08]], 6), (x, y) => (y > 0.95 ? C(PAL.gold) : C(PAL.navy)), 0, 0, 0);
      k.glow(P.tor(0.56, 0.05, 4, 6), color, 0, 0.65, 0, PI / 2, 0, 0);
      k.glow(P.oct(0.42), color, 0, 2.0, 0, 0, 0, 0, 1, 1.5, 1);
      k.glow(P.tor(1.2, 0.06, 4, 28), color, 0, 0.04, 0, PI / 2, 0, 0);
      k.cyl(0, 0, 0.8, -0.1, 1.08);
      k.anchor('top', 0, 2.0, 0); k.anchor('base', 0, 1.08, 0);
    });
    const bg = cachedGeo('beaconBeam', () => { const g = P.cyl(0.4, 0.55, 60, 14, true); g.translate(0, 31, 0); return g; });
    const beam = new THREE.Mesh(bg, G.M.basic(color, { transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.name = 'beam'; beam.renderOrder = 3;
    prop.mesh.add(beam);
    return prop;
  };
  Geo.extractionPad = function (color) {
    color = color != null ? color : 0x8bea4a;
    return cached('extract|' + color, k => {
      const R = 3.6;
      k.add(ringStack([[R + 0.1, -0.15], [R + 0.1, 0.16], [R - 0.05, 0.3], [0, 0.3]], 40), (x, y, z) => {
        const r = Math.hypot(x, z);
        if (r > R - 0.7 && r < R - 0.1) return Math.floor(((Math.atan2(z, x) + PI) / TAU) * 24) % 2 ? C(0xffd23f) : C(PAL.navy);
        return r > R - 0.1 ? C(0xf0fbff) : C(0xe8eef8);
      }, 0, 0, 0);
      k.glow(P.tor(R - 1.3, 0.09, 5, 36), color, 0, 0.31, 0, PI / 2, 0, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU, s = new THREE.Shape(); s.moveTo(-0.45, 0); s.lineTo(0, -0.5); s.lineTo(0.45, 0); s.lineTo(0.45, 0.22); s.lineTo(0, -0.28); s.lineTo(-0.45, 0.22); s.closePath();
        const g = new THREE.ShapeGeometry(s); xf(g, 0, 0, 0, -PI / 2, 0, 0); xf(g, Math.cos(a) * 1.4, 0.31, Math.sin(a) * 1.4, 0, -a + PI / 2, 0);
        k.glowRaw(g, color);
      }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + PI / 8; k.add(P.cyl(0.16, 0.2, 0.2, 8), PAL.navy, Math.cos(a) * (R + 0.15), 0.25, Math.sin(a) * (R + 0.15)); k.glow(P.sph(0.13, 8, 6), color, Math.cos(a) * (R + 0.15), 0.42, Math.sin(a) * (R + 0.15)); }
      k.cyl(0, 0, R + 0.1, -0.15, 0.3);
      k.anchor('pad', 0, 0.3, 0); k.anchor('center', 0, 0.3, 0);
    });
  };
  Geo.barrel = function (color) {
    color = color != null ? color : 0x5b6fd8;
    return cached('barrel|' + color, k => {
      const bc = darken(color, 0.06);
      k.add(ringStack(banded([[0.36, 0], [0.42, 0.15], [0.46, 0.5], [0.42, 0.85], [0.36, 1.0], [0.3, 1.02], [0, 1.0]], [[0, bc], [0.1, PAL.gold], [0.2, color], [0.8, PAL.gold], [0.9, bc], [1.0, darken(color, 0.25)]]), 16), null, 0, 0, 0);
      k.add(P.cyl(0.07, 0.07, 0.06, 8), PAL.gold, 0.15, 1.03, 0.1);
      groundAO(k.s, 0, 0.24, 0.5);
      k.cyl(0, 0, 0.45, 0, 1.02);
    });
  };
  // Banner cloth + emblem in banner-local space (hangs from the rod at y≈4, +Z front).
  function bannerClothGeo(color, emblem) {
    return cachedGeo('bannerCloth|' + color + '|' + emblem, () => {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.0, 0); s.lineTo(1.0, -1.8); s.lineTo(0.5, -1.45); s.lineTo(0, -1.8); s.closePath();
      const cloth = extrude(s, 0.04, 0.02, 3, 1);
      // a few extra rows so the wave has vertices to bend
      const cp = cloth.attributes.position;
      for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i); cp.setZ(i, cp.getZ(i) + 0.1 * Math.sin(x * 4.5 + y * 1.5) * (x + 0.2)); }
      Geo.smooth(cloth, 50);
      Geo.colorize(cloth, (x, y) => (y > -0.28 ? C(PAL.gold) : y < -1.3 ? C(darken(color, 0.15)) : C(color)));
      xf(cloth, 0.08, 3.98, 0);
      const em = xf(emblemGeo(emblem || 'star', 0xfff6ea).clone(), 0, 0, 0, 0, 0, 0, 0.5); xf(em, 0.6, 3.1, 0.06);
      return Geo.merge([cloth, em]);
    });
  }
  // banner(colour, emblem, {cloth:false}) — without the cloth the pole/rod/finial stay a static prop and the
  // cloth goes into a flagBatch() so every banner in a scene waves in one draw call.
  Geo.banner = function (color, emblem, opts) {
    color = color != null ? color : 0xff6b8b;
    const cloth = !(opts && opts.cloth === false);
    return cached('banner|' + color + '|' + emblem + (cloth ? '' : '|bare'), k => {
      k.add(P.cyl(0.07, 0.09, 4.2, 8), PAL.navy, 0, 2.1, 0);
      k.add(P.rbox(0.4, 0.2, 0.4, 0.06, 1), PAL.navy, 0, 0.1, 0);
      k.add(P.sph(0.15, 10, 8), PAL.gold, 0, 4.28, 0);
      k.add(P.cyl(0.04, 0.04, 1.2, 6), PAL.gold, 0.55, 4.0, 0, 0, 0, PI / 2);
      groundAO(k.s, 0, 0.22, 0.8);
      if (cloth) k.addRaw(bannerClothGeo(color, emblem).clone());
      k.cyl(0, 0, 0.15, 0, 4.2);
    });
  };
  // Waving cloth: aFlex (0 at the attached edge .. 1 free) and aFlexN (world-space cloth normal) drive a
  // travelling ripple in the vertex shader (house wind clock and reduced-motion factor).
  let FLAG_MAT = null;
  Geo.flagMat = function () {
    if (FLAG_MAT) return FLAG_MAT;
    if (!G.Terrain || !G.Terrain.toonVariant) { FLAG_MAT = G.M.vc({ rimStr: 0.25 }); return FLAG_MAT; }
    FLAG_MAT = G.Terrain.toonVariant(0xffffff, { vc: true, rimStr: 0.25, side: THREE.DoubleSide }, {
      defines: { FLAG: '' },
      vsHead: '#ifdef FLAG\nattribute float aFlex; attribute vec3 aFlexN;\n#ifndef WIND\nuniform float uTime; uniform float uWindK;\n#endif\n#endif',
      vsPre: ['#ifdef FLAG',
        '  { float fph = uTime * 3.3 - aFlex * 3.8 + dot(wp.xz, vec2(0.23, 0.19));',
        '    float famp = aFlex * (0.12 + 0.05 * sin(uTime * 0.7 + wp.x * 0.1)) * uWindK;',
        '    wp.xyz += aFlexN * (sin(fph) * famp) - vec3(0.0, abs(sin(fph)) * famp * 0.12, 0.0); }',
        '#endif'].join('\n'),
    });
    return FLAG_MAT;
  };
  // Collects waving cloth into one mesh. banner(colour, emblem, x, y, z, ry) matches a placed
  // Geo.banner(colour, emblem, {cloth:false}); raw(geo, flex(x,y,z)->0..1, normal V3) adds any cloth.
  Geo.flagBatch = function () {
    const parts = [];
    const withFlex = (g, flexFn, nrm) => {
      const p = g.attributes.position, n = p.count, fl = new Float32Array(n), fn = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { fl[i] = clamp(flexFn(p.getX(i), p.getY(i), p.getZ(i)), 0, 1); fn[i * 3] = nrm.x; fn[i * 3 + 1] = nrm.y; fn[i * 3 + 2] = nrm.z; }
      g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1)); g.setAttribute('aFlexN', new THREE.BufferAttribute(fn, 3));
      return g;
    };
    const fb = {
      banner(color, emblem, x, y, z, ry) {
        const g = bannerClothGeo(color, emblem).clone();
        // flex from the hanging edge (local y 3.98) down, a little more toward the free side
        const p = g.attributes.position, fl = new Float32Array(p.count);
        for (let i = 0; i < p.count; i++) fl[i] = clamp((3.98 - p.getY(i)) / 1.8, 0, 1) * (0.75 + 0.25 * clamp(p.getX(i), 0, 1));
        xf(g, x, y, z, 0, ry || 0, 0);
        const nrm = new V3(Math.sin(ry || 0), 0, Math.cos(ry || 0));
        withFlex(g, () => 0, nrm); g.attributes.aFlex.array.set(fl);
        parts.push(g);
        return fb;
      },
      raw(g, flexFn, nrm) { parts.push(withFlex(g, flexFn, nrm)); return fb; },
      get count() { return parts.length; },
      mesh() {
        if (!parts.length) return null;
        const g = mergeFlex(parts);
        const m = new THREE.Mesh(g, Geo.flagMat()); m.name = 'flags';
        return m;
      },
    };
    return fb;
  };
  // merge() plus the flag attributes
  function mergeFlex(parts) {
    const g = Geo.merge(parts);
    let n = 0; for (const p of parts) n += p.attributes.position.count;
    const fl = new Float32Array(n), fn = new Float32Array(n * 3);
    let o = 0;
    for (const p of parts) { fl.set(p.attributes.aFlex.array, o); fn.set(p.attributes.aFlexN.array, o * 3); o += p.attributes.position.count; }
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1)); g.setAttribute('aFlexN', new THREE.BufferAttribute(fn, 3));
    return g;
  }
  Geo._mergeFlex = mergeFlex;

  // ------------------------------------------------------------------ crates (Mesh only, origin at base)
  // GDD §8.2 looks. Kinds: bolt (pale wood) | metal (lavender, rivets) | ammo (cream, cyan stripe) |
  // health (soft pink, heart) | explosive (red-orange, yellow stripes) | rare (navy, cyan Lumite spikes).
  // Aliases: wood->bolt, boom->explosive, lumite->rare. ~0.9 m, ≈250–450 tris, 1–2 draw calls.
  const nut = (k, x, y, z, rx, ry, s, col) => {
    k.add(P.cyl(0.4 * s, 0.4 * s, 0.14 * s, 6), col || PAL.sun, x, y, z, rx, ry, 0);
    k.add(P.cyl(0.16 * s, 0.16 * s, 0.16 * s, 8), darken(col || PAL.sun, 0.45), x, y, z, rx, ry, 0);
  };
  const crystalSpike = (h, r) => Geo.merge([xf(P.cyl(r, r * 1.1, h, 6), 0, h / 2, 0), xf(P.cone(r, r * 1.8, 6), 0, h + r * 0.9, 0)]);
  const CRATE = {
    bolt: k => {
      k.add(P.rbox(0.9, 0.9, 0.9, 0.12, 1), 0xf0c890, 0, 0.45, 0);
      for (const y of [0.3, 0.6]) k.add(P.box(0.93, 0.06, 0.93), 0xc89460, 0, y, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.box(0.14, 0.93, 0.14), 0xb07a4a, sx * 0.41, 0.45, sz * 0.41);
      nut(k, 0, 0.45, 0.46, PI / 2, 0, 0.5); nut(k, 0, 0.45, -0.46, PI / 2, 0, 0.5); nut(k, 0, 0.91, 0, 0, 0, 0.5);
    },
    metal: k => {
      k.add(P.rbox(0.9, 0.9, 0.9, 0.14, 1), 0xb4a8ec, 0, 0.45, 0);
      k.add(P.box(0.94, 0.16, 0.94), 0x8a7cd0, 0, 0.45, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0.12, 0.78]) k.add(P.sph(0.05, 5, 3), PAL.brass, sx * 0.4, y, sz * 0.46);
      nut(k, 0, 0.91, 0, 0, 0, 0.55, 0xe8eefc);
    },
    ammo: k => {
      k.add(P.rbox(0.92, 0.7, 0.72, 0.13, 1), 0xfff1dc, 0, 0.35, 0);
      k.add(P.box(0.95, 0.16, 0.75), 0x39d5ff, 0, 0.36, 0);
      for (const sx of [-1, 1]) k.add(P.box(0.08, 0.26, 0.3), PAL.navy, sx * 0.48, 0.5, 0);
      for (let i = 0; i < 3; i++) { const x = -0.22 + i * 0.22; k.add(P.cyl(0.06, 0.06, 0.2, 6), PAL.gold, x, 0.78, 0); k.add(P.cone(0.06, 0.1, 6), 0xff8a4c, x, 0.93, 0); }
    },
    health: k => {
      k.add(P.rbox(0.86, 0.76, 0.86, 0.18, 1), 0xffb3cf, 0, 0.38, 0);
      k.add(P.box(0.9, 0.1, 0.9), 0xfffaf2, 0, 0.1, 0);
      const hg = new THREE.ExtrudeGeometry(heartShape(0.42), { depth: 0.05, bevelEnabled: false, curveSegments: 4 }); hg.deleteAttribute('uv'); hg.translate(0, 0, -0.025);
      Geo.colorize(hg, 0xff5f8a);
      for (const [x, z, ry] of [[0, 0.44, 0], [0, -0.44, PI], [0.44, 0, PI / 2], [-0.44, 0, -PI / 2]]) k.add(hg.clone(), null, x, 0.42, z, 0, ry, 0);
    },
    explosive: k => {
      k.add(P.rbox(0.85, 0.85, 0.85, 0.16, 1), 0xff6a3d, 0, 0.43, 0);
      for (let i = 0; i < 12; i++) {
        const f = i % 4, t = ((i / 4) | 0) - 1, a = (f * PI) / 2;
        k.add(P.box(0.24, 0.15, 0.04), i % 2 ? PAL.navy : 0xffd23f, Math.sin(a) * 0.43 + Math.cos(a) * t * 0.27, 0.43, Math.cos(a) * 0.43 - Math.sin(a) * t * 0.27, 0, a, 0.5);
      }
      k.add(P.cyl(0.17, 0.21, 0.12, 8), PAL.navy, 0, 0.9, 0);
      k.glow(P.sph(0.13, 6, 4), 0xffb020, 0, 1.0, 0);
      for (const sv of [-1, 1]) { k.add(P.box(0.09, 0.25, 0.04), 0xffffff, 0, 0.66, sv * 0.44); k.add(P.box(0.09, 0.08, 0.04), 0xffffff, 0, 0.48, sv * 0.44); }
    },
    rare: k => {
      k.add(P.rbox(0.86, 0.7, 0.86, 0.14, 1), 0x24306a, 0, 0.35, 0);
      for (const y of [0.12, 0.58]) k.add(P.box(0.9, 0.07, 0.9), 0x5f6ec8, 0, y, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4, d = i ? 0.22 : 0, h = i ? 0.32 : 0.52;
        k.glowRaw(Geo.colorize(xf(crystalSpike(h, 0.08), Math.cos(a) * d, 0.62, Math.sin(a) * d, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4), (x, y) => mixC(0x4fd8ff, 0xe8ffff, clamp((y - 0.6) / 0.6, 0, 1))));
      }
    },
  };
  const CRATE_ALIAS = { wood: 'bolt', boom: 'explosive', lumite: 'rare' };
  Geo.CRATE_KINDS = Object.keys(CRATE);
  Geo.crate = function (kind) {
    kind = CRATE_ALIAS[kind] || kind;
    if (!CRATE[kind]) kind = 'bolt';
    let pr;
    LOD = 0.7;
    try { pr = cached('crate|' + kind, k => { CRATE[kind](k); }, { rimStr: 0.4 }); } finally { LOD = 1; }
    pr.mesh.userData.crate = kind;
    return pr.mesh;
  };

  // ------------------------------------------------------------------ pickups (~0.4 m, centred)
  // GDD §4.3: Health Pop = pink orb (data.big -> Big Pop, larger), Shield Cell = cyan cell,
  // ammo = chunky crate with bullets, special = gold star. data.color overrides the tint.
  const PICK = {
    health: { color: 0xff6f9a, geo: c => {
      c = c || 0xff6f9a;
      const orb = P.sph(0.2, 14, 10);
      Geo.colorize(orb, (x, y, z, nx, ny) => mixC(darken(c, 0.12), lighten(c, 0.35), clamp(0.55 + ny * 0.5, 0, 1)));
      const parts = [orb];
      for (const sz of [-1, 1]) { parts.push(Geo.colorize(xf(P.box(0.2, 0.065, 0.05), 0, 0, sz * 0.185), 0xffffff)); parts.push(Geo.colorize(xf(P.box(0.065, 0.2, 0.05), 0, 0, sz * 0.185), 0xffffff)); }
      parts.push(Geo.colorize(xf(P.cyl(0.02, 0.03, 0.08, 6), 0, 0.22, 0), 0x3e9e57), Geo.colorize(xf(P.sph(0.06, 6, 3), 0.05, 0.25, 0, 0, 0, 0.6, 1, 0.35, 0.7), 0x6ccb5f));
      return Geo.merge(parts);
    } },
    ammo: { color: 0xffd23f, geo: () => {
      const parts = [Geo.colorize(xf(P.rbox(0.36, 0.22, 0.26, 0.06, 1), 0, -0.06, 0), 0xfff1dc), Geo.colorize(xf(P.box(0.38, 0.07, 0.28), 0, -0.06, 0), 0x39d5ff)];
      for (let i = 0; i < 3; i++) { const x = -0.1 + i * 0.1; parts.push(Geo.colorize(xf(P.cyl(0.035, 0.035, 0.13, 7), x, 0.1, 0), PAL.gold)); parts.push(Geo.colorize(xf(P.cone(0.035, 0.06, 7), x, 0.195, 0), 0xff8a4c)); }
      return Geo.merge(parts);
    } },
    shield: { color: 0x39d5ff, geo: () => Geo.merge([
      Geo.colorize(xf(P.cyl(0.15, 0.15, 0.1, 6), 0, 0.12, 0), 0x2f7bff), Geo.colorize(xf(P.cyl(0.15, 0.15, 0.1, 6), 0, -0.12, 0), 0x2f7bff),
      Geo.colorize(xf(P.cyl(0.17, 0.17, 0.05, 6), 0, 0.19, 0), PAL.gold), Geo.colorize(xf(P.cyl(0.17, 0.17, 0.05, 6), 0, -0.19, 0), PAL.gold),
      Geo.colorize(xf(P.cyl(0.05, 0.06, 0.06, 8), 0, 0.24, 0), PAL.navy)]),
    glow: () => Geo.colorize(P.cyl(0.13, 0.13, 0.16, 6), 0x9ff0ff) },
    special: { color: 0xffd23f, geo: c => Geo.colorize(extrude(starShape(0.24, 0.11, 5), 0.08, 0.04, 4, 2), radial(lighten(c || 0xffd23f, 0.55), c || 0xffc21a, 0.25)) },
  };
  Geo.pickupMesh = function (type, data) {
    data = data || {};
    const def = PICK[type] || PICK.special, col = data.color;
    const g = new THREE.Group();
    const m = new THREE.Mesh(cachedGeo('pick|' + type + '|' + (col || ''), () => def.geo(col)), G.M.vc({ spec: 0.75, rimStr: 0.6 }));
    if (data.big) m.scale.setScalar(1.35);
    g.add(m);
    if (def.glow) g.add(new THREE.Mesh(cachedGeo('pickG|' + type, def.glow), glowMat()));
    g.add(G.R.glowSprite(col || def.color, data.big ? 1.5 : 1.15, 0.5));
    g.userData.pickup = type;
    return g;
  };

  // ================================================================== REGION SET PIECES (expedition landmarks + dressing)
  // Landmarks are big single props (one baked mesh + glossy child + glow child); they are built at a reduced
  // primitive LOD because they are mostly seen from afar. Colours follow the region palettes.
  function cachedLod(key, lod, build, matOpts) {
    let pr;
    LOD = lod;
    try { pr = cached(key, k => { build(k); }, matOpts); } finally { LOD = 1; }
    return pr;
  }
  Geo._cachedLod = cachedLod;
  // wood planks: alternating board tones with a soft grain streak; stone: noise-varied blocks
  const woodCol = (base, axis) => (x, y, z) => { const t = axis === 'x' ? x : axis === 'y' ? y : z, g = vn3(x * 3.1, y * 3.1, z * 3.1, 17); return mixC(darken(base, 0.08), lighten(base, 0.12), clamp(0.5 + Math.sin(t * 9 + g * 2.5) * 0.3 + g * 0.4, 0, 1)); };
  const stoneCol = (c0, c1) => (x, y, z) => mixC(c0, c1, clamp(0.5 + vn3(x * 1.7, y * 1.7, z * 1.7, 5) * 0.9, 0, 1));
  Geo.woodCol = woodCol; Geo.stoneCol = stoneCol;

  // ---- Sunny Shoals: pastel candy-stripe lighthouse on a rocky foot (door + windows face +Z)
  Geo.lighthouse = function () {
    return cachedLod('lighthouse', 0.8, k => {
      const pink = 0xff8fb0, cream = 0xfff6ea, mint = 0x7fe8d0;
      // rocky foot
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3, g = rockGeo(1.4 + (i % 2) * 0.5, 61 + i, ROCK_PAL.coral, 2); k.add(g, null, Math.cos(a) * 2.6, -0.5, Math.sin(a) * 2.6, 0, a, 0); }
      k.add(ringStack([[3.0, -1.2], [2.95, 0.5], [2.75, 0.75], [2.7, 1.05], [0, 1.05]], 22), stoneCol(0xe8d2b4, 0xf8ead2), 0, 0, 0);
      k.add(P.tor(2.72, 0.09, 6, 26), PAL.navy, 0, 1.05, 0, PI / 2, 0, 0);
      // tower: tapering stripes
      const T0 = 1.05, T1 = 12.4, bands = [];
      for (let i = 0; i < 6; i++) bands.push([T0 + i * (T1 - T0) / 6, i % 2 ? pink : cream]);
      bands[0][0] = -1;
      const tower = ringStack(banded([[2.05, T0], [1.92, T0 + 3], [1.66, T0 + 7.5], [1.45, T1]], bands, 0.02), 20);
      k.addRaw(tower);
      groundAO([tower], T0, 0.2, 2.2);
      // spiral of recessed windows + the door (teal, gold knob, little awning)
      for (let i = 0; i < 3; i++) {
        const a = PI / 2 - 0.8 + i * 1.35, y = T0 + 3.2 + i * 2.7, rr = 1.92 - i * 0.18;
        const wx = Math.cos(a) * rr, wz = Math.sin(a) * rr, ry = -a + PI / 2;
        k.add(P.rbox(0.72, 1.05, 0.22, 0.12, 1), cream, wx, y, wz, 0, ry, 0);
        k.glow(P.rbox(0.48, 0.78, 0.08, 0.1, 1), 0xffe9a8, wx * 1.04, y, wz * 1.04, 0, ry, 0);
        k.add(P.rbox(0.8, 0.1, 0.32, 0.03, 1), PAL.navy, wx * 1.06, y - 0.6, wz * 1.06, 0, ry, 0);
      }
      k.add(P.rbox(1.25, 2.1, 0.5, 0.3, 2), PAL.navy, 0, T0 + 1.0, 1.78);
      k.add(P.rbox(1.0, 1.85, 0.2, 0.28, 2), 0x2cc3d6, 0, T0 + 0.95, 2.0);
      k.metal(P.sph(0.07, 8, 5), PAL.gold, 0.32, T0 + 0.95, 2.12);
      k.add(P.rbox(1.6, 0.12, 0.7, 0.05, 1), mint, 0, T0 + 2.25, 2.12, -0.3, 0, 0);
      // gallery deck + railing
      k.add(ringStack([[1.55, T1 - 0.1], [2.45, T1 + 0.1], [2.45, T1 + 0.32], [0, T1 + 0.32]], 22), PAL.navy, 0, 0, 0);
      k.metal(P.tor(2.32, 0.06, 5, 26), PAL.gold, 0, T1 + 1.15, 0, PI / 2, 0, 0);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; k.metal(P.cyl(0.045, 0.045, 0.85, 5), PAL.gold, Math.cos(a) * 2.32, T1 + 0.74, Math.sin(a) * 2.32); }
      // lantern room: glass + mullions, roof dome + finial
      k.add(P.cyl(1.25, 1.25, 0.35, 18), cream, 0, T1 + 0.5, 0);
      k.glow(P.cyl(1.05, 1.05, 1.7, 14, true), 0xfff4c0, 0, T1 + 1.5, 0);
      k.glow(P.sph(0.55, 10, 8), 0xffffff, 0, T1 + 1.5, 0);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; k.metal(P.cyl(0.06, 0.06, 1.75, 5), PAL.navy, Math.cos(a) * 1.08, T1 + 1.5, Math.sin(a) * 1.08); }
      k.add(ringStack([[1.4, T1 + 2.3], [1.38, T1 + 2.5], [0.9, T1 + 3.15], [0.35, T1 + 3.55], [0, T1 + 3.62]], 18), 0xff6b8b, 0, 0, 0);
      k.metal(P.cyl(0.08, 0.1, 0.7, 6), PAL.gold, 0, T1 + 3.9, 0);
      k.metal(P.sph(0.2, 10, 8), PAL.gold, 0, T1 + 4.3, 0);
      k.metal(xf(emblemGeo('star', 0xffd23f).clone(), 0, 0, 0, 0, 0, 0, 0.55), null, 0, T1 + 4.85, 0);
      k.cyl(0, 0, 2.95, -1.2, T0); k.cyl(0, 0, 1.95, T0, T1 + 0.3);
      k.anchor('lamp', 0, T1 + 1.5, 0); k.anchor('top', 0, T1 + 4.9, 0); k.anchor('door', 0, 0, 2.6);
    });
  };
  // ---- jetty: plank deck on posts, rope rails, a lamp + life ring at the sea end. Land end at z=0, runs +Z.
  Geo.jetty = function (len, deckY) {
    len = len || 16; deckY = deckY != null ? deckY : 1.1;
    return cachedLod('jetty|' + len.toFixed(1) + '|' + deckY.toFixed(2), 0.8, k => {
      const W = 2.4, n = Math.round(len / 0.55), pl = len / n;
      for (let i = 0; i < n; i++) k.add(P.box(W, 0.12, pl - 0.07), woodCol(i % 3 ? 0xd99a5b : 0xc8884a, 'x'), (i % 2 ? 0.04 : -0.04), deckY - 0.06, pl * (i + 0.5), 0, (i % 5 - 2) * 0.006, 0);
      for (const sx of [-1, 1]) k.add(P.rbox(0.22, 0.26, len, 0.05, 1), 0xa86a3c, sx * (W / 2 - 0.25), deckY - 0.25, len / 2);
      const np = Math.max(2, Math.round(len / 3));
      for (let i = 0; i <= np; i++) {
        const z = (len * i) / np;
        for (const sx of [-1, 1]) {
          k.add(P.cyl(0.15, 0.17, deckY + 3.4, 7), woodCol(0x9a6440, 'y'), sx * (W / 2 + 0.05), deckY + 0.95 - (deckY + 3.4) / 2, z);
          k.add(P.tor(0.17, 0.05, 4, 8), 0xf2e2b8, sx * (W / 2 + 0.05), deckY + 0.55, z, PI / 2, 0, 0);
          k.add(P.sph(0.17, 7, 4), 0xfff6ea, sx * (W / 2 + 0.05), deckY + 0.98, z);
        }
      }
      for (const sx of [-1, 1]) for (let i = 0; i < np; i++) {
        const z0 = (len * i) / np, z1 = (len * (i + 1)) / np, zm = (z0 + z1) / 2;
        k.add(tubeAB(new V3(sx * (W / 2 + 0.05), deckY + 0.85, z0), new V3(sx * (W / 2 + 0.05), deckY + 0.7, zm), 0.035, 0.035, 5), 0xf2e2b8);
        k.add(tubeAB(new V3(sx * (W / 2 + 0.05), deckY + 0.7, zm), new V3(sx * (W / 2 + 0.05), deckY + 0.85, z1), 0.035, 0.035, 5), 0xf2e2b8);
      }
      // sea end: lamp, life ring, bollard
      k.metal(P.cyl(0.07, 0.09, 2.6, 6), PAL.navy, W / 2 - 0.3, deckY + 1.3, len - 0.4);
      k.glow(P.sph(0.22, 10, 8), 0xfff2b0, W / 2 - 0.3, deckY + 2.75, len - 0.4);
      k.metal(P.cone(0.3, 0.26, 10), PAL.navy, W / 2 - 0.3, deckY + 3.05, len - 0.4);
      const ring = P.tor(0.38, 0.11, 8, 16); Geo.colorize(ring, (x, y) => (Math.floor((Math.atan2(y, x) + PI) / (PI / 4)) % 2 ? C(0xff6b6b) : C(0xffffff)));
      k.add(ring, null, -W / 2 - 0.12, deckY + 0.55, len - 1.2, 0, PI / 2, 0);
      k.metal(ringStack([[0.24, 0], [0.2, 0.32], [0.3, 0.42], [0.3, 0.5], [0, 0.52]], 10), PAL.navy, -W / 2 + 0.45, deckY, len - 0.5);
      k.box(0, deckY - 0.16, len / 2, W, 0.32, len);
      for (const sx of [-1, 1]) k.box(sx * (W / 2 + 0.05), deckY + 0.5, len / 2 + 0.6, 0.25, 1.0, len - 1.2);
      k.anchor('end', 0, deckY, len - 0.8);
    });
  };
  // ---- tide pool: a ring of smooth rocks around a sunlit pool (bright centre, foam rim), starfish + coral inside
  Geo.tidePool = function (seed) {
    seed = (seed || 1) % 4;
    return cachedLod('tidepool|' + seed, 0.8, k => {
      const rnd = G.rng(seed * 31 + 9), R = 2.0 + seed * 0.25;
      const pool = P.cyl(R * 0.92, R * 0.92, 0.08, 22);
      k.add(pool, (x, y, z) => { const t = Math.hypot(x, z / 0.82) / (R * 0.92); return t > 0.86 ? C(0xf4ffff) : mixC(0xb8fff2, 0x39c0d0, clamp(t * 1.1, 0, 1)); }, 0, 0.06, 0, 0, 0, 0, 1, 1, 0.82);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rnd() * 0.4, rr = R * (0.95 + rnd() * 0.15), s = 0.5 + rnd() * 0.4;
        k.add(rockGeo(s, 70 + seed * 9 + i, ROCK_PAL.coral, 1), null, Math.cos(a) * rr, -0.08, Math.sin(a) * rr * 0.82, 0, rnd() * TAU, 0);
      }
      k.add(starfishGeo(0xff8a4c), null, R * 0.25, 0.08, -0.2, 0, rnd() * TAU, 0);
      k.add(shellGeo(0xffe8b0), null, -R * 0.1, 0.06, -R * 0.4, 0, rnd() * TAU, 0);
      k.add(coralGeo(seed % 2 ? 4 : 1, PAL.coral[seed + 1], seed), null, R * 0.45, 0.04, R * 0.3, 0, 0, 0, 0.55);
    });
  };

  // ---- beach spot: striped parasol, a towel, a beach ball and a little sand castle with a flag
  Geo.beachSpot = function (seed) {
    seed = (seed || 1) % 4;
    return cachedLod('beachSpot|' + seed, 0.8, k => {
      const cols = [[0xff6b8b, 0xfff6ea], [0x39c6e8, 0xfff6ea], [0xffd23f, 0xff8a4c], [0x8f6bff, 0xfff6ea]][seed];
      const rnd = G.rng(seed * 13 + 3), tilt = 0.18;
      k.add(P.cyl(0.04, 0.05, 2.5, 6), 0xfff6ea, 0, 1.2, 0, tilt, 0, 0);
      const can = ringStack([[0.08, 2.48], [1.5, 2.05], [1.55, 2.0], [0, 2.52]], 12);
      Geo.colorize(can, (x, y, z) => (Math.floor((Math.atan2(z, x) + PI) / TAU * 12) % 2 ? C(cols[0]) : C(cols[1])));
      k.add(can, null, 0, 0, 0, tilt, 0, 0);
      k.add(P.sph(0.07, 6, 4), PAL.gold, 0, 2.55, 0.46);
      k.add(Geo.colorize(P.rbox(1.0, 0.03, 1.9, 0.02, 1), (x, y, z) => (Math.floor((z + 1) * 3.2) % 2 ? C(cols[0]) : C(0xfff6ea))), null, 0.9, 0.03, 0.6, 0, 0.4, 0);   // stripes across the towel
      const ball = P.sph(0.32, 12, 8);
      Geo.colorize(ball, (x, y, z) => C([0xff4d5e, 0xfff6ea, 0x39c6e8, 0xffd23f][Math.floor((Math.atan2(z, x) + PI) / TAU * 6) % 4]));
      k.add(ball, null, -1.1, 0.32, 0.9);
      const sand = 0xf2d49a, sandD = 0xe0b878;
      k.add(P.cyl(0.42, 0.5, 0.42, 10), sandD, 1.2, 0.21, -1.0);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4, x = 1.2 + Math.cos(a) * 0.48, z = -1.0 + Math.sin(a) * 0.48; k.add(P.cyl(0.13, 0.15, 0.55, 8), sand, x, 0.28, z); k.add(P.cone(0.15, 0.22, 8), sandD, x, 0.66, z); }
      k.add(P.cyl(0.2, 0.24, 0.7, 8), sand, 1.2, 0.77, -1.0); k.add(P.cone(0.24, 0.3, 8), sandD, 1.2, 1.27, -1.0);
      k.add(P.cyl(0.012, 0.012, 0.5, 3), 0x1f2a5a, 1.2, 1.6, -1.0);
      k.add(P.box(0.24, 0.14, 0.01), cols[0], 1.32, 1.76, -1.0);
      const cr = rnd();
      k.add(P.rbox(0.6, 0.4, 0.4, 0.08, 1), 0x3fe0b8, -0.6, 0.2, -0.9, 0, cr, 0);
      k.add(P.rbox(0.64, 0.08, 0.44, 0.03, 1), 0xfff6ea, -0.6, 0.42, -0.9, 0, cr, 0);
      k.cyl(0, 0, 0.2, 0, 2.5); k.cyl(1.2, -1.0, 0.55, 0, 1.0);
    });
  };
  // ---- Peach Mesas: desert blooms (instanced geometry, ~0.6–1.4 m, origin at the base)
  function bloomGeo(kind, color, seed) {
    const rnd = G.rng((seed || 1) * 41 + kind * 7), parts = [];
    const g0 = 0x3fae7a, g1 = 0x6fd49a, g2 = 0xbaf0c8;
    if (kind === 0) {   // barrel cactus with a flower crown
      const b = ringStack([[0.36, -0.05], [0.44, 0.15], [0.48, 0.42], [0.42, 0.72], [0.26, 0.9], [0, 0.95]], 14, th => 1 + 0.07 * Math.cos(th * 10));
      Geo.colorize(b, (x, y, z, nx, ny) => { const rib = Math.cos(Math.atan2(z, x) * 10); return ramp3(g0, g1, g2, clamp(0.3 + y * 0.5 + rib * 0.25, 0, 1)); });
      parts.push(b);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + rnd(); parts.push(xf(petalDisc(0.14, color, 5, 0xffd23f), Math.cos(a) * 0.12, 0.95, Math.sin(a) * 0.12, (rnd() - 0.5) * 0.6, rnd() * TAU, (rnd() - 0.5) * 0.6)); }
    } else if (kind === 1) {   // paddle cactus with buds
      const pads = [[0, 0.42, 0, 0, 0.42], [0.28, 0.95, 0.02, -0.5, 0.32], [-0.26, 0.9, -0.02, 0.55, 0.3], [0.05, 1.35, 0, 0.1, 0.24]];
      for (const [x, y, z, rz, s] of pads) {
        const g = P.sph(1, 8, 5); g.scale(s * 0.95, s * 1.25, s * 0.32); xf(g, x, y, z, 0, 0, rz);
        parts.push(Geo.colorize(g, (px, py, pz, nx, ny) => ramp3(g0, g1, g2, clamp(0.45 + ny * 0.35 + (py - y) * 0.8, 0, 1))));
        parts.push(Geo.colorize(xf(P.sph(0.075, 5, 3), x + Math.sin(-rz) * s * 1.2, y + Math.cos(rz) * s * 1.2, z), color));
      }
    } else {   // rosette + tall flower stalk with bells
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + rnd() * 0.3, g = P.sph(1, 5, 3);
        g.scale(0.1, 0.05, 0.42); g.translate(0, 0, 0.36); xf(g, 0, 0.12, 0, -0.55 - rnd() * 0.3, a, 0);
        parts.push(Geo.colorize(g, (x, y, z, nx, ny) => mixC(g0, g2, clamp(y * 1.6 + 0.3, 0, 1))));
      }
      const top = new V3(0.05, 1.7, 0.03);
      parts.push(Geo.colorize(tubeAB(new V3(0, 0.1, 0), top, 0.04, 0.025, 5), 0x8ab84a));
      for (let i = 0; i < 3; i++) {
        const y = 1.05 + i * 0.26, a = i * 2.1, bx = Math.cos(a) * 0.12, bz = Math.sin(a) * 0.12;
        parts.push(Geo.colorize(xf(P.cone(0.1, 0.17, 6), bx, y, bz, PI, 0, 0), color));
        parts.push(Geo.colorize(xf(P.sph(0.05, 5, 3), bx, y - 0.1, bz), lighten(color, 0.5)));
      }
    }
    const g = Geo.merge(parts);
    groundAO([g], 0, 0.22, 0.4);
    return g;
  }
  Geo.bloomGeo = (kind, color, seed) => cachedGeo('bloom|' + kind + '|' + color + '|' + (seed || 1), () => bloomGeo(kind, color, seed));
  // ---- hoodoo: banded sandstone spire with a balanced cap rock
  Geo.hoodoo = function (h, seed, opts) {
    opts = opts || {}; h = h || 9; seed = (seed || 1) | 0;
    const bands = opts.bands || PAL.bands;
    return cachedLod('hoodoo|' + h.toFixed(1) + '|' + seed + '|' + bands.join(','), 0.8, k => {
      const bH = h / bands.length, pb = [];
      for (let i = bands.length - 1; i >= 0; i--) pb.push([h - (i + 1) * bH, bands[i]]);
      pb[0][0] = -3;
      const body = ringStack(banded([[1.9, -2], [1.7, 0], [1.3, h * 0.25], [1.05, h * 0.5], [0.85, h * 0.78], [0.95, h * 0.95], [0.6, h], [0, h + 0.05]], pb, 0.03), 14,
        (th, y, ri) => 1 + 0.14 * circN(th, 1.3, ri * 0.4, seed) + 0.05 * circN(th, 4, ri, seed));
      k.addRaw(body);
      const cap = rockGeo(1.6, seed + 40, ROCK_PAL.sand, 2); cap.scale(1.2, 0.75, 1.1);
      k.add(cap, null, 0.15, h - 0.25, 0, 0, seed, 0.06);
      groundAO([body], 0, 0.22, 2.0);
      k.cyl(0, 0, 1.3, -2, h + 1.2);
      k.anchor('top', 0, h + 1.2, 0);
    });
  };

  // ---- Glowcap Grotto: the Elder Glowcap — a towering mushroom with a lit cottage door, glowing spots and gills
  Geo.elderGlowcap = function (seed) {
    seed = (seed || 1) | 0;
    return cachedLod('elderGlowcap|' + seed, 0.8, k => {
      const capA = 0xa64dff, capB = 0xff5fa2, glowC = 0x7af0ff, stem = 0xfff1dc, H = 13;
      const lean = (y) => Math.sin(y / H * PI) * 0.9;
      const st = ringStack([[2.6, -0.6], [2.1, 0.4], [1.55, 2.2], [1.25, 6], [1.3, 10], [1.65, H - 0.6], [1.9, H], [0, H + 0.2]], 16, (th, y) => 1 + 0.05 * circN(th, 2, y * 0.3, seed));
      const sp = st.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setX(i, sp.getX(i) + lean(sp.getY(i)));
      st.computeVertexNormals();
      Geo.colorize(st, (x, y) => mixC(mixHex(stem, 0x9a7ae0, 0.35), stem, clamp(y / 4, 0, 1)));
      groundAO([st], 0, 0.28, 2.5);
      k.addRaw(st);
      // cap: big lilac-to-pink dome with a rolled rim
      const cap = ringStack([[1.6, H - 0.2], [5.2, H - 0.5], [7.2, H + 0.1], [7.5, H + 0.6], [7.1, H + 1.5], [5.6, H + 3.2], [3.2, H + 4.4], [0, H + 4.8]], 26,
        th => 1 + 0.05 * circN(th, 2, 0, seed));
      Geo.colorize(cap, (x, y, z, nx, ny) => (ny < -0.2 ? C(0xd8c8ff) : ramp3(darken(capA, 0.15), capA, capB, clamp((y - H) / 4.5 + 0.2, 0, 1))));
      k.add(cap, null, lean(H), 0, 0);
      // glowing gills ring + spots
      k.glow(P.tor(4.2, 0.55, 6, 24), glowC, lean(H), H - 0.35, 0, PI / 2, 0, 0, 1, 1, 0.35);
      k.glow(P.tor(7.32, 0.16, 4, 30), 0xffb8e8, lean(H), H + 0.55, 0, PI / 2, 0, 0);
      const rnd = G.rng(seed * 7 + 3), nSp = 14, n = new V3();
      for (let i = 0; i < nSp; i++) {
        const phi = (i / nSp) * TAU + rnd() * 0.4, th = 0.3 + rnd() * 0.85, a = 7.2, b = 4.6;
        const px = a * Math.sin(th) * Math.cos(phi), py = H + 0.2 + b * Math.cos(th) * 0.95, pz = a * Math.sin(th) * Math.sin(phi);
        n.set(Math.sin(th) * Math.cos(phi) / a, Math.cos(th) / b, Math.sin(th) * Math.sin(phi) / a).normalize();
        const g = P.sph(0.5 + rnd() * 0.35, 8, 4); g.scale(1, 0.35, 1);
        _q.setFromUnitVectors(UP, n); g.applyMatrix4(_m4.compose(_p.set(px + lean(H), py, pz), _q, _s.set(1, 1, 1)));
        k.glowRaw(g, i % 3 ? 0xe8ffff : glowC);
      }
      // shelf fungi spiralling up the stem
      for (let i = 0; i < 5; i++) {
        const a = i * 1.9, y = 2.5 + i * 1.9, r = 1.3, x = Math.cos(a) * r + lean(y), z = Math.sin(a) * r;
        const sh = P.sph(0.55, 8, 4); sh.scale(1, 0.28, 1); { const p = sh.attributes.position; for (let j = 0; j < p.count; j++) if (p.getY(j) < 0) p.setY(j, p.getY(j) * 0.3); }
        k.glow(sh, i % 2 ? 0x9fffe8 : 0xc8b8ff, x, y, z, 0, -a, 0);
      }
      // cottage door + round windows at the foot (facing +Z)
      const dz = 2.05;
      k.add(P.rbox(1.5, 2.3, 0.4, 0.5, 2), 0x5b3fa8, lean(1), 1.0, dz);
      k.add(P.rbox(1.15, 1.95, 0.2, 0.45, 2), 0x8f6bff, lean(1), 0.95, dz + 0.18);
      k.metal(P.sph(0.08, 8, 5), PAL.gold, lean(1) + 0.35, 0.95, dz + 0.3);
      for (const sx of [-1, 1]) porthole(k, lean(2.8) + sx * 0.85, 2.85, 1.38, 0.32, 'z', 0xfff1dc, 0xffd27a, 0.3);
      k.add(P.rbox(1.9, 0.2, 1.0, 0.08, 1), stoneCol(0x6a6aa8, 0x9a9ad0), lean(0), 0.05, dz + 0.6);
      k.glow(P.sph(0.2, 8, 6), 0xffd27a, lean(1) + 1.1, 2.4, dz + 0.25);
      k.cyl(lean(4), 0, 1.6, -0.6, H); k.cyl(lean(H), 0, 6.8, H - 0.4, H + 3.6);
      k.anchor('top', lean(H), H + 4.8, 0); k.anchor('door', lean(1), 0, dz + 0.8);
    });
  };
  // path-side glow sprouts (instanced, unlit glow colours): a stubby stalk with a glowing round cap. Hundreds line
  // the paths, so they bypass the primitive minimums: a 4-sided stalk + a 6x3 dome, 32 triangles each.
  Geo.glowSproutGeo = function (color) {
    return cachedGeo('glowSprout|' + color, () => {
      const stg = new THREE.CylinderGeometry(0.035, 0.05, 0.26, 4, 1, true); stg.deleteAttribute('uv');
      const st = Geo.colorize(xf(stg, 0, 0.13, 0), mixHex(color, 0xffffff, 0.35));
      const cap = new THREE.SphereGeometry(0.14, 6, 3); cap.deleteAttribute('uv'); { const p = cap.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.3); }
      xf(cap, 0, 0.27, 0);
      Geo.colorize(cap, (x, y) => mixC(color, 0xffffff, clamp((y - 0.27) * 4, 0, 0.6)));
      return Geo.merge([st, cap]);
    });
  };

  // ---- Frostfizz Bluffs: frozen waterfall pouring off a snow-capped bluff into an ice pool (falls toward +Z)
  Geo.frozenFall = function (h, seed) {
    h = h || 15; seed = (seed || 1) | 0;
    return cachedLod('frozenFall|' + h.toFixed(1) + '|' + seed, 0.8, k => {
      const bands = [0xf6faff, 0xc8dcf8, 0x9ab4e8, 0x8a8ad8, 0x7a6cc0, 0x6458a8], R = 7.5, cz = -R * 0.75;
      // the bluff: a wide wobbly banded lathe with a snow cap
      const bH = h / bands.length, pb = [];
      for (let i = bands.length - 1; i >= 0; i--) pb.push([h - (i + 1) * bH, bands[i]]);
      pb[0][0] = -4;
      const bluff = ringStack(banded([[R * 1.15, -3], [R * 1.05, 0], [R * 0.98, h * 0.4], [R, h * 0.7], [R * 0.95, h - 0.4], [R * 1.02, h - 0.1], [R * 0.85, h + 0.6], [R * 0.4, h + 1.1], [0, h + 1.2]], pb, 0.03), 22,
        (th, y, ri) => 1 + 0.18 * circN(th, 1.2, 0, seed) + 0.08 * circN(th, 3.5, ri * 0.5, seed));
      Geo.colorize(bluff, (x, y, z, nx, ny) => (ny > 0.55 && y > h - 0.6 ? C(0xffffff) : C(bands[clamp(Math.floor((h - y + vn3(x * 0.3, y * 0.2, z * 0.3, seed) * 1.2) / bH), 0, bands.length - 1)])));
      bluff.scale(1.6, 1, 0.78);
      k.add(bluff, null, 0, 0, cz);
      groundAO([bluff], 0, 0.2, 2.5);
      // frosty boulders at its feet and snowy pines along the top break the silhouette
      for (const sx of [-1, 1]) { const g = rockGeo(3.0 + (sx > 0 ? 0.6 : 0), seed + 50 + sx, ROCK_PAL.frost, 2); k.add(g, null, sx * R * 1.32, -0.6, cz + R * 0.45, 0, sx, 0); }
      const pine = treeGeo('pine', 1, { palette: 'pine', snow: true });
      for (const [px, pz, ps] of [[-4.2, -0.6, 1.3], [-1.6, -1.8, 1.0], [3.4, -0.9, 1.15], [5.8, -2.2, 0.9]]) k.add(pine.clone(), null, px, h + 0.7, cz + pz, 0, px, 0, ps);
      // ice curtain: a rippled sheet curving out of the bluff face, glassy pale cyan with bright streaks
      const fw = 5.2, seg = 14, rows = 10, pos = [], idx = [];
      const faceZ = cz + R * 0.8 + 0.25;
      for (let j = 0; j <= rows; j++) {
        const t = j / rows, y = h - 0.4 - t * (h - 0.6);
        for (let i = 0; i <= seg; i++) {
          const u = i / seg - 0.5, x = u * fw * (1 + t * 0.35);
          const bulge = Math.sin(t * PI) * 0.9 + t * 1.1, rip = Math.sin(u * 22 + seed) * 0.12 + Math.sin(u * 9 + t * 4) * 0.1;
          pos.push(x, y, faceZ + bulge + rip - Math.abs(u) * 1.2);
        }
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const sheet = new THREE.BufferGeometry(); sheet.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sheet.setIndex(idx); sheet.computeVertexNormals();
      Geo.colorize(sheet, (x, y) => { const st = Math.pow(Math.abs(Math.sin(x * 3.7 + seed)), 6); return mixC(0x9fe8ff, 0xf4ffff, clamp(st * 0.9 + (y / h) * 0.25, 0, 1)); });
      k.metalRaw(sheet); k.metalRaw(flipCopy(sheet));
      // icicles along the lip + frozen pool with a snow rim and ice chunks
      for (let i = 0; i < 9; i++) { const x = (i / 8 - 0.5) * (fw + 1.5), l = 0.6 + ((i * 37) % 7) * 0.12; k.metal(P.cone(0.14, l, 6), 0xd8f8ff, x, h - 0.4 - l / 2, faceZ + 0.2 - Math.abs(x) * 0.1, PI, 0, 0); }
      // (coloured in its own space before it is moved: pale in the middle, deeper blue toward the rim)
      const pool = Geo.colorize(P.cyl(4.6, 4.6, 0.1, 24), (x, y, z) => mixC(0xe8fbff, 0x8fd8f8, clamp(Math.hypot(x, z) / 4.6 + vn3(x, 0, z, 3) * 0.3, 0, 1)));
      k.metal(pool, null, 0, 0.08, faceZ + 3.2, 0, 0, 0, 1.15, 1, 0.8);
      k.add(P.tor(4.7, 0.42, 6, 24), 0xffffff, 0, 0.1, faceZ + 3.2, PI / 2, 0, 0, 1.15, 0.8, 0.5);
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.4; k.metal(crystalGeo(80 + i, i % 2 ? 0x9fe8ff : 0xc8e8ff), null, Math.cos(a) * 3.4, 0, faceZ + 3.2 + Math.sin(a) * 2.2, 0, a, 0, 0.9 + (i % 2) * 0.4); }
      k.cyl(0, cz, R * 0.8, -3, h + 1); for (const sx of [-1, 1]) { k.cyl(sx * R * 0.75, cz - 0.6, R * 0.62, -3, h * 0.85); k.cyl(sx * R * 1.2, cz - 0.4, R * 0.42, -3, h * 0.6); }
      k.anchor('top', 0, h + 1.2, cz); k.anchor('pool', 0, 0.1, faceZ + 3.2);
    });
  };
  // ---- snowdrift: soft white mound (instanced ground cover around rocks and pines)
  Geo.snowdriftGeo = function (seed) {
    return cachedGeo('snowdrift|' + (seed || 1), () => {
      const g = Geo.blob(1, 1, 0.12, (seed || 1) + 3, { sy: 0.32 });
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.15);
      g.computeVertexNormals();
      return Geo.colorize(g, (x, y, z, nx, ny) => mixC(0xd0e2fa, 0xffffff, clamp(0.35 + ny * 0.6, 0, 1)));
    });
  };

  // ---- Junkyard Rim: the Gizmo Works — a huge friendly robot-faced factory (front +Z)
  Geo.gizmoFactory = function () {
    return cachedLod('gizmoFactory', 0.7, k => {
      const W = 24, D = 15, H = 10, wall = 0xffb07a, wall2 = 0xff8a4c, plum = 0x5b3a8c, cream = 0xfff1dc, navy = PAL.navy;
      k.add(P.rbox(W + 1.2, 2.4, D + 1.2, 0.3, 1), stoneCol(0x8a7aa8, 0xa898c0), 0, -0.9, 0);
      const body = P.rbox(W, H, D, 1.2, 2);
      k.add(body, (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.7 ? (Math.floor((y + H / 2) / 1.6) % 2 ? C(wall) : C(lighten(wall, 0.18))) : Math.floor((y + H / 2) / 2.2) % 2 ? C(wall2) : C(plum)), 0, H / 2 + 0.3, 0);
      // panel seams + rivets on the sides
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) k.add(P.box(0.1, H - 1.6, 0.14), darken(wall2, 0.3), sx * (W / 2 + 0.02), H / 2 + 0.3, -D / 2 + 2 + i * 3.7);
      // sawtooth roof with glowing skylights
      for (let i = 0; i < 4; i++) {
        const z = -D / 2 + 2 + i * 3.6, sh = new THREE.Shape(); sh.moveTo(-1.7, 0); sh.lineTo(1.7, 0); sh.lineTo(1.7, 2.2); sh.closePath();
        const g = extrude(sh, W - 3, 0.08, 1, 1); xf(g, 0, 0, 0, 0, PI / 2, 0); k.add(g, plum, 0, H + 0.3, z);
        k.glow(P.box(W - 3.4, 1.6, 0.08), 0x9ff0ff, 0, H + 1.3, z + 1.62, -0.13, 0, 0);
      }
      // the friendly face on the front wall: visor band, big eyes, smile, cheeks
      const fz = D / 2 + 0.3, ey = 8.4;
      k.add(P.rbox(W - 5, 4.8, 0.5, 2.0, 2), navy, 0, 7.5, fz);
      for (const sx of [-1, 1]) {
        k.glow(P.cyl(1.3, 1.3, 0.3, 22), 0x5cffe1, sx * 4.4, ey, fz + 0.2, PI / 2, 0, 0);
        k.glow(P.cyl(0.55, 0.55, 0.34, 16), 0xffffff, sx * 4.4 + 0.32, ey + 0.32, fz + 0.24, PI / 2, 0, 0);
        k.metal(P.tor(1.4, 0.17, 6, 22), 0xfff1dc, sx * 4.4, ey, fz + 0.3);
        k.add(P.cyl(0.75, 0.75, 0.12, 16), 0xff8fb0, sx * 7.0, 6.6, fz + 0.28, PI / 2, 0, 0);
        // gear ears on the sides
        k.metal(xf(Geo.emblem('gear', 0xffd23f).clone(), 0, 0, 0, 0, PI / 2, 0, 5.5), null, sx * (W / 2 + 0.3), H * 0.68, 0);
      }
      const smile = P.tor(1.9, 0.28, 6, 20, PI); k.add(smile, cream, 0, 7.4, fz + 0.3, PI, 0, 0);
      // antenna with a glowing bulb
      k.metal(P.cyl(0.18, 0.28, 4.5, 8), navy, 0, H + 2.5, -1);
      k.glow(P.sph(0.75, 12, 8), 0xffd23f, 0, H + 5.2, -1);
      // big rolling door with hazard stripes + conveyor hatch on the right
      k.add(P.rbox(7.0, 4.6, 0.6, 0.4, 1), plum, 0, 2.6, fz);
      k.add(P.rbox(6.0, 4.0, 0.3, 0.3, 1), (x, y) => (Math.floor(y * 2.2) % 2 ? C(0xd8dcef) : C(0xbcc2dc)), 0, 2.4, fz + 0.2);
      for (let i = 0; i < 8; i++) k.add(P.box(0.75, 0.42, 0.34), i % 2 ? navy : 0xffd23f, -2.65 + i * 0.76, 0.55, fz + 0.36, 0, 0, 0.5);
      k.add(P.rbox(3.2, 2.4, 0.6, 0.3, 1), navy, 8.2, 2.0, fz);
      k.glow(P.rbox(2.6, 1.8, 0.1, 0.2, 1), 0xffd27a, 8.2, 2.0, fz + 0.26);
      // chimney stacks: striped, glowing rings, puffy pastel smoke
      for (const [cx, cz2, ch] of [[-8.5, -3.5, 22], [-4.8, -5.2, 18]]) {
        const tb = []; for (let y = 0; y < ch; y += 2.2) tb.push([y, Math.round(y / 2.2) % 2 ? wall2 : plum]);
        k.add(ringStack(banded([[1.9, 0], [1.75, ch * 0.5], [1.6, ch]], tb), 14), null, cx, 0, cz2);
        k.add(P.cyl(2.0, 2.0, 0.6, 14), 0xe8b44a, cx, ch + 0.3, cz2);
        k.glow(P.tor(1.75, 0.16, 5, 16), 0xffd23f, cx, ch - 1.2, cz2, PI / 2, 0, 0);
        for (let i = 0; i < 3; i++) { const g = Geo.blob(1.3 - i * 0.2, 1, 0.12, 30 + i); k.add(g, mixHex(0xf4ecff, 0xffd8e8, i * 0.4), cx + i * 0.8, ch + 1.6 + i * 1.5, cz2 + i * 0.3); }
        k.cyl(cx, cz2, 1.9, 0, ch);
      }
      // a big gear wheel turning slowly is out of budget: a static one leans against the left wall
      k.metal(xf(Geo.emblem('gear', 0xc9d2ea).clone(), 0, 0, 0, 0, 0.3, 0.15, 4.0), null, -W / 2 - 1.2, 1.9, 4.5);
      k.box(0, H / 2 + 0.3, 0, W, H + 0.4, D);
      k.box(8.2, 1.2, fz + 0.4, 3.2, 2.4, 0.8);
      k.anchor('door', 0, 0, fz + 1); k.anchor('hatch', 8.2, 1.2, fz + 0.8); k.anchor('top', 0, H + 6, -1);
    });
  };
  // ---- conveyor ramp: an inclined belt on legs carrying crates up to a hopper (walkable, stepped colliders).
  // Low end at z=+len/2 (y=0), high end at z=-len/2 (y=h), like ramp().
  Geo.conveyor = function (len, h) {
    len = len || 9; h = h || 3.4;
    return cachedLod('conveyor|' + len.toFixed(1) + '|' + h.toFixed(1), 0.8, k => {
      const w = 2.4, ang = Math.atan2(h, len), L = Math.hypot(len, h);
      const belt = P.rbox(w, 0.3, L, 0.08, 1);
      k.add(belt, (x, y, z, nx, ny) => (ny > 0.5 ? (Math.abs(x) < w / 2 - 0.25 ? ((((z * 1.4) % 1) + 1) % 1 < 0.32 && Math.abs(x) < 0.5 + Math.abs((((z * 1.4) % 1) + 1) % 1 - 0.16) * 2 ? C(0xffd23f) : C(0x2a2f5a)) : C(0x3d4a8a)) : C(0x2a2f5a)), 0, h / 2 - 0.1, 0, ang, 0, 0);
      for (const sx of [-1, 1]) {
        k.add(P.rbox(0.22, 0.5, L + 0.3, 0.08, 1), 0xff8a4c, sx * (w / 2 + 0.05), h / 2 + 0.05, 0, ang, 0, 0);
        const nR = Math.round(L / 1.1);
        for (let i = 0; i <= nR; i++) { const t = i / nR - 0.5; k.metal(P.cyl(0.13, 0.13, 0.08, 10), 0xd8dcef, sx * (w / 2 + 0.18), h / 2 + 0.06 - t * h, t * len, 0, 0, PI / 2); }
      }
      for (const t of [0.15, 0.45]) {
        const z = -len / 2 + t * len * 2 * 0.5, top = h * (0.5 - z / len) - 0.2;
        for (const sx of [-1, 1]) k.metal(P.cyl(0.11, 0.13, top, 6), PAL.navy, sx * (w / 2 - 0.2), top / 2, z);
        k.metal(P.rbox(w - 0.2, 0.12, 0.12, 0.04, 1), PAL.navy, 0, top * 0.55, z);
      }
      // hopper at the top + crates riding the belt
      k.add(ringStack([[0.9, 0], [1.4, 1.2], [1.5, 1.3], [1.35, 1.32], [0.8, 0.15]], 4), 0x5b3a8c, 0, h - 0.05, -len / 2 - 0.9, 0, PI / 4, 0);
      for (let i = 0; i < 3; i++) { const t = 0.2 + i * 0.27, z = len / 2 - t * len, y = t * h + 0.2; k.add(P.rbox(0.7, 0.6, 0.7, 0.08, 1), [0xf0c890, 0xb4a8ec, 0xfff1dc][i], 0, y + 0.3, z, ang, i * 0.4, 0); }
      const steps = Math.max(2, Math.ceil(h / 0.25));
      for (let i = 1; i <= steps; i++) { const z0 = len / 2 - (len * i) / steps, z1 = len / 2 - (len * (i - 1)) / steps, top = (h * (i - 0.35)) / steps; k.box(0, top / 2, (z0 + z1) / 2, w, top, z1 - z0); }
      k.cyl(0, -len / 2 - 0.9, 1.3, h - 0.1, h + 1.3);
      k.anchor('top', 0, h, -len / 2); k.anchor('bottom', 0, 0, len / 2 + 0.5);
    });
  };
  // ---- magnet crane: yellow lattice tower, orange cab, jib with a counterweight, red horseshoe magnet lifting a
  // squashed scrap car (front +Z, the jib reaches over +Z)
  Geo.magnetCrane = function (h, seed) {
    h = h || 11; seed = (seed || 1) | 0;
    return cachedLod('magnetCrane|' + h.toFixed(1) + '|' + seed, 0.8, k => {
      const yel = 0xffd23f, s = 0.8;
      k.add(P.rbox(3.0, 0.8, 3.0, 0.15, 1), (x, y, z) => (Math.floor((x + z) * 1.5) % 2 ? C(0xffd23f) : C(0x2a2f5a)), 0, 0.4, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.metal(P.box(0.2, h, 0.2), yel, sx * s, h / 2 + 0.8, sz * s);
      for (let lv = 0; lv < Math.floor(h / 1.6); lv++) {
        const y = 1.6 + lv * 1.6;
        for (let f = 0; f < 4; f++) { const a = f * PI / 2; k.metal(P.box(0.08, 2.0, 0.08), darken(yel, 0.12), Math.sin(a) * s, y, Math.cos(a) * s, 0, a, (lv % 2 ? 1 : -1) * 0.68); }
      }
      const top = h + 0.8;
      k.add(P.rbox(2.0, 1.6, 2.0, 0.3, 1), 0xff8a4c, 0, top + 0.8, -0.2);
      k.glow(P.rbox(1.5, 0.7, 0.08, 0.1, 1), 0x9ff0ff, 0, top + 1.0, 0.82);
      const jl = 7.5;
      for (const sx of [-1, 1]) k.metal(P.box(0.14, 0.14, jl + 3), yel, sx * 0.35, top + 1.9, jl / 2 - 1.5);
      for (let i = 0; i < 8; i++) k.metal(P.box(0.06, 0.06, 0.8), darken(yel, 0.12), 0, top + 1.9, -2 + i * 1.3, 0, PI / 2, 0, 1, 1, 1);
      k.add(P.rbox(1.6, 1.2, 1.4, 0.2, 1), stoneCol(0x8a8aa8, 0xb0b0c8), 0, top + 1.6, -2.6);
      const mz = jl - 0.8, cableTop = top + 1.8, my = top - 3.6;
      k.metal(P.cyl(0.04, 0.04, cableTop - my - 0.6, 4), PAL.navy, 0, (cableTop + my + 0.6) / 2, mz);
      const mag = P.tor(0.7, 0.28, 8, 14, PI); k.add(mag, 0xff4d5e, 0, my, mz, PI, 0, 0);
      for (const sx of [-1, 1]) k.metal(P.rbox(0.58, 0.4, 0.58, 0.08, 1), 0xe8eefc, sx * 0.7, my - 0.15, mz);
      const car = P.rbox(2.4, 0.9, 1.4, 0.3, 1); k.add(car, (x, y) => (y > my - 0.95 ? C(0x7fd8ff) : C(0x3fa9ff)), 0, my - 1.0, mz, 0.08, 0.3, 0.05);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.tor(0.24, 0.1, 5, 10), 0x2a2f5a, sx * 0.8, my - 1.45, mz + sz * 0.7, 0, 0.3, 0);
      k.cyl(0, 0, 1.4, 0, top + 2);
      k.anchor('top', 0, top + 2.2, 0);
    });
  };
  // ---- junk cluster: tyre stack, crate, oil drum, a leaning scrap plate, a bent pipe and a big spring
  Geo.junkCluster = function (seed) {
    seed = (seed || 1) % 4;
    return cachedLod('junkCluster|' + seed, 0.75, k => {
      const rnd = G.rng(seed * 19 + 5), cols = [0x9aa5b8, 0x7a86c8, 0xff7a3d, 0x5b3a8c, 0xc9d2ea, 0x3fa9ff];
      const tx = -0.9 + rnd() * 0.3;
      for (let i = 0; i < 2 + (seed % 2); i++) k.add(P.tor(0.48, 0.2, 6, 14), 0x2f2f4a, tx, 0.2 + i * 0.4, -0.3, PI / 2, 0, 0);
      k.add(P.cyl(0.22, 0.22, 0.3, 10), 0x9aa5b8, tx, 0.18, -0.3);
      k.add(P.rbox(0.9, 0.9, 0.9, 0.1, 1), woodCol(0xd8a868, 'y'), 0.6, 0.45, 0.4, 0, rnd(), 0);
      k.add(P.box(0.94, 0.08, 0.94), 0xa86a3c, 0.6, 0.62, 0.4, 0, rnd(), 0);
      k.add(ringStack(banded([[0.36, 0], [0.4, 0.15], [0.42, 0.5], [0.4, 0.85], [0.36, 1.0], [0, 1.0]], [[0, cols[seed + 2]], [0.12, 0xffd23f], [0.2, cols[seed + 2]], [0.8, 0xffd23f], [0.88, cols[seed + 2]]]), 12), null, -0.2, 0, 1.0);
      k.add(P.rbox(1.5, 1.1, 0.1, 0.05, 1), cols[(seed + 1) % 6], 1.2, 0.5, -0.6, -0.35, 0.5, 0.2);
      k.metal(tubeAB(new V3(-1.4, 0.15, 0.6), new V3(-1.0, 0.7, 1.1), 0.12, 0.12, 8), 0xc9d2ea);
      k.metal(tubeAB(new V3(-1.0, 0.7, 1.1), new V3(-0.3, 0.75, 1.7), 0.12, 0.12, 8), 0xc9d2ea);
      for (let i = 0; i < 5; i++) k.metal(P.tor(0.22, 0.045, 5, 12), 0xffd23f, 1.4, 0.12 + i * 0.12, 0.9, PI / 2 - 0.12, 0, 0);
      groundAO(k.s, 0, 0.24, 0.6);
      k.cyl(0, 0.2, 1.35, 0, 1.2);
    });
  };

  // ---- Fizzport: facility badge (pylon) and door props
  // Badge: a round medallion in the facility colour with a cream rim and the facility emblem (front +Z only:
  // the hub turns it to face the camera).
  Geo.badgeGeo = function (kind, color) {
    return cachedGeo('badge|' + kind + '|' + color, () => {
      LOD = 0.8;
      try {
        const disc = Geo.colorize(xf(P.cyl(0.62, 0.62, 0.16, 22), 0, 0, 0, PI / 2, 0, 0), (x, y, z) => (z > 0 ? mixC(lighten(color, 0.28), color, clamp(Math.hypot(x, y) / 0.6, 0, 1)) : C(darken(color, 0.25))));
        const rim = Geo.colorize(xf(P.tor(0.64, 0.07, 5, 18), 0, 0, 0.02), 0xfff6ea);
        const em = xf(emblemGeo(kind, 0xfff6ea).clone(), 0, 0, 0.13, 0, 0, 0, 0.78);
        return Geo.merge([disc, rim, em]);
      } finally { LOD = 1; }
    });
  };
  // Door props per facility kind, in door-local space: origin on the ground at the door, +Z out toward the
  // fountain, x sideways. They keep the walkway (|x| < 1.6) and the door interaction zone clear and stand
  // within x 2.2..7, z 0.8..3.2 (the banner pole sits at x -3.1, z 2.6). colour = facility colour.
  Geo.doorProps = function (kind, color) {
    return cachedLod('doorProps|' + kind + '|' + color, 0.5, k => {
      const navy = PAL.navy, cream = 0xfff6ea;
      const crate = (x, z, s, col, ry) => { k.add(P.box(0.9 * s, 0.9 * s, 0.9 * s), woodCol(col || 0xd8a868, 'y'), x, 0.45 * s, z, 0, ry || 0, 0); k.add(P.box(0.95 * s, 0.07 * s, 0.95 * s), darken(col || 0xd8a868, 0.2), x, 0.62 * s, z, 0, ry || 0, 0); k.cyl(x, z, 0.55 * s, 0, 0.9 * s); };
      // planter: a pot in the facility colour with one round shrub and three blossoms
      const planter = (x, z, flower) => {
        k.add(ringStack([[0.45, 0], [0.5, 0.1], [0.46, 0.45], [0.52, 0.5], [0.48, 0.55], [0, 0.52]], 12), (px, py) => (py > 0.48 ? C(cream) : C(color)), x, 0, z);
        k.add(Geo.blob(0.42, 1, 0.16, 80 + (x > 0 ? 1 : 2), { sy: 0.82 }), (px, py, pz, nx, ny) => mixC(darken(PAL.grass, 0.3), lighten(PAL.grass, 0.3), clamp(0.5 + ny * 0.45 + (py - 0.78) * 0.6, 0, 1)), x, 0.78, z);
        for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; k.add(P.sph(0.09, 6, 4), flower, x + Math.cos(a) * 0.3, 0.98 + (i % 2) * 0.1, z + Math.sin(a) * 0.3); }
        k.cyl(x, z, 0.5, 0, 0.9);
      };
      const stand = (x, z, h) => { k.add(P.cyl(0.55, 0.65, 0.18, 14), navy, x, 0.09, z); k.metal(P.cyl(0.08, 0.1, h, 6), navy, x, h / 2 + 0.1, z); k.cyl(x, z, 0.6, 0, h); };
      switch (kind) {
        case 'guild': {   // quest notice board with pinned notes + a scroll stand + supply crate
          const bx = 4.4, bz = 1.6;
          for (const sx of [-1, 1]) k.add(P.cyl(0.09, 0.1, 2.2, 6), 0x9a6440, bx + sx * 1.0, 1.1, bz);
          k.add(P.box(2.3, 1.4, 0.14), 0xa86a3c, bx, 1.55, bz);
          k.add(P.box(2.1, 1.2, 0.06), 0xf3c48a, bx, 1.55, bz + 0.07);
          const notes = [0xfffaf0, 0xffe08a, 0xbaf2d6, 0xffd6e6, 0xcfe0ff, 0xe4d8ff];
          for (let i = 0; i < 6; i++) { const nx = bx - 0.7 + (i % 3) * 0.7, ny = 1.85 - Math.floor(i / 3) * 0.55; k.add(P.box(0.5, 0.38, 0.02), notes[i], nx, ny, bz + 0.11, 0, 0, (i % 2 ? 0.08 : -0.06)); k.add(P.sph(0.04, 5, 3), i % 2 ? 0xff4d5e : 0x3d7bff, nx, ny + 0.15, bz + 0.13); }
          k.add(P.box(2.5, 0.22, 0.3), color, bx, 2.3, bz); k.metal(xf(emblemGeo('star').clone(), 0, 0, 0, 0, 0, 0, 0.36), null, bx, 2.62, bz + 0.05);
          k.box(bx, 1.2, bz, 2.4, 2.4, 0.4);
          stand(-5.2, 1.4, 0.9); k.add(P.cyl(0.18, 0.18, 0.7, 10), 0xfff1dc, -5.2, 1.1, 1.4, 0, 0, PI / 2); k.add(P.cyl(0.2, 0.2, 0.08, 10), 0xe8b44a, -5.55, 1.1, 1.4, 0, 0, PI / 2);
          crate(6.2, 2.6, 0.8);
          break;
        }
        case 'workshop': {   // big gear leaning on a crate, an anvil on a stump, a toolbox and a spring
          k.metal(xf(emblemGeo('gear', 0xffd45c).clone(), 0, 0, 0, 0, 0, 0, 2.3), null, 4.6, 1.15, 1.2, -0.12, 0.3, 0);
          k.box(4.6, 1.1, 1.2, 2.2, 2.2, 0.5);
          k.add(ringStack([[0.55, 0], [0.5, 0.6], [0.52, 0.7], [0, 0.7]], 12), woodCol(0xb07a4a, 'y'), -4.8, 0, 1.6);
          k.metal(P.box(0.9, 0.3, 0.45), 0x6a7290, -4.8, 0.85, 1.6);
          k.metal(P.cone(0.2, 0.5, 8), 0x6a7290, -4.15, 0.88, 1.6, 0, 0, -PI / 2);
          k.metal(P.box(0.5, 0.25, 0.3), 0x6a7290, -4.8, 0.62, 1.6);
          k.cyl(-4.8, 1.6, 0.6, 0, 1.0);
          k.add(P.box(0.8, 0.45, 0.4), 0xff4d5e, 6.1, 0.23, 2.4); k.metal(P.tor(0.18, 0.04, 5, 10, PI), PAL.gold, 6.1, 0.46, 2.4);
          for (let i = 0; i < 5; i++) k.metal(P.tor(0.26, 0.05, 5, 12), 0xffd23f, -6.3, 0.1 + i * 0.13, 2.6, PI / 2, 0, 0);
          k.cyl(6.1, 2.4, 0.45, 0, 0.5);
          break;
        }
        case 'shop': {   // a striped goods cart with fruit-bright goods + a coin sign on a post
          const cx = 4.6, cz = 1.7;
          k.add(P.box(2.2, 0.9, 1.1), 0xff7a93, cx, 0.75, cz);
          k.add(P.box(2.3, 0.1, 1.2), cream, cx, 1.22, cz);
          for (const sx of [-1, 1]) { k.add(P.tor(0.3, 0.08, 6, 12), navy, cx + sx * 0.8, 0.3, cz + 0.6); k.metal(P.cyl(0.05, 0.05, 1.5, 5), navy, cx + sx * 1.0, 1.9, cz - 0.45); }
          for (let i = 0; i < 6; i++) { const a = i % 3, b = Math.floor(i / 3); k.add(P.sph(0.17, 8, 6), [0xffd45c, 0x3fe0b8, 0xff8a4c, 0x8f6bff, 0xff5fa2, 0x7fd8ff][i], cx - 0.6 + a * 0.6, 1.42, cz - 0.25 + b * 0.45); }
          const aw = []; for (let i = 0; i < 6; i++) aw.push(i);
          for (const i of aw) k.add(P.box(0.4, 0.06, 1.4), i % 2 ? cream : 0xff5fa2, cx - 1.0 + i * 0.4, 2.6, cz - 0.2, 0.3, 0, 0);
          k.box(cx, 0.7, cz, 2.3, 1.4, 1.2);
          stand(-5.0, 2.0, 1.9); k.metal(xf(emblemGeo('coin').clone(), 0, 0, 0, 0, 0, 0, 1.0), null, -5.0, 2.3, 2.0);
          crate(-6.4, 1.0, 0.7, 0xffd6e0, 0.4);
          break;
        }
        case 'cafe': {   // café tables with parasols and cups, a menu easel
          for (const [tx, tz] of [[4.6, 1.8], [-5.0, 2.0]]) {
            k.add(P.cyl(0.6, 0.6, 0.07, 16), cream, tx, 0.78, tz); k.metal(P.cyl(0.06, 0.08, 0.76, 6), navy, tx, 0.38, tz); k.add(P.cyl(0.3, 0.34, 0.06, 12), navy, tx, 0.03, tz);
            k.metal(P.cyl(0.035, 0.035, 2.4, 5), navy, tx, 1.95, tz);
            const para = ringStack([[0.06, 2.9], [1.25, 2.45], [1.3, 2.4], [0, 2.95]], 10);
            Geo.colorize(para, (x, y, z) => (Math.floor((Math.atan2(z, x) + PI) / TAU * 10) % 2 ? C(color) : C(cream)));
            k.addRaw(xf(para, tx, 0, tz));
            for (let i = 0; i < 2; i++) k.add(xf(cupGeo([0xff7a93, 0xffd45c][i]), 0, 0, 0, 0, 0, 0, 0.28), null, tx - 0.2 + i * 0.4, 0.9, tz + (i ? 0.1 : -0.15));
            for (const sx of [-1, 1]) { k.add(P.cyl(0.24, 0.2, 0.45, 12), 0xff7a93, tx + sx * 0.95, 0.23, tz); k.cyl(tx + sx * 0.95, tz, 0.25, 0, 0.45); }
            k.cyl(tx, tz, 0.62, 0, 0.82);
          }
          k.add(P.box(0.8, 1.1, 0.06), 0x2f5a4a, 2.6, 0.95, 3.0, -0.18, 0.3, 0);
          for (let i = 0; i < 3; i++) k.add(P.box(0.5 - i * 0.08, 0.05, 0.02), [0xffd6e0, 0xfff1b8, 0xbaf2d6][i], 2.6, 1.2 - i * 0.2, 3.05, -0.18, 0.3, 0);
          for (const sx of [-1, 1]) k.add(P.cyl(0.03, 0.03, 1.2, 4), 0xa86a3c, 2.6 + sx * 0.3, 0.55, 2.95, -0.18, 0.3, 0);
          break;
        }
        case 'gallery': {   // an easel with a framed picture + a trophy on a pedestal behind a velvet rope
          // (all on the left of the door: the Ranger Locker cabinet stands in front of the right side, at about
          // x 3.5, z 4.7, and hid the old easel there from the plaza)
          const ex = -6.3, ez = 1.4, er = 0.35, ec = Math.cos(er), es = Math.sin(er);
          const at = (lx, lz) => [ex + lx * ec + lz * es, ez - lx * es + lz * ec];   // easel-local -> door-local
          { const [x, z] = at(0, -0.1); k.add(P.cyl(0.04, 0.04, 2.0, 4), 0xa86a3c, x, 1.0, z, -0.2, er, 0); }
          for (const sx of [-1, 1]) { const [x, z] = at(sx * 0.4, 0.15); k.add(P.cyl(0.04, 0.04, 2.0, 4), 0xa86a3c, x, 0.95, z, 0.15, er, sx * 0.12); }
          { const [x, z] = at(0, 0.02); k.add(P.box(1.3, 1.0, 0.1), PAL.gold, x, 1.5, z, -0.2, er, 0); }
          { const [x, z] = at(0, 0.08), pic = Geo.colorize(P.box(1.1, 0.8, 0.06), (px, py) => (py > 0.05 ? C(0x9ad8ff) : C(0x8ae070))); k.add(pic, null, x, 1.5, z, -0.2, er, 0); }
          { const [x, z] = at(0.3, 0.12); k.add(P.sph(0.14, 8, 6), 0xffd23f, x, 1.72, z); }
          k.cyl(ex, ez, 0.6, 0, 2.0);
          k.add(P.cyl(0.42, 0.5, 1.0, 14), cream, -4.4, 0.5, 1.5); k.add(P.cyl(0.5, 0.5, 0.1, 14), color, -4.4, 1.05, 1.5);
          k.metal(xf(emblemGeo('trophy').clone(), 0, 0, 0, 0, 0, 0, 0.8), null, -4.4, 1.5, 1.5);
          k.cyl(-4.4, 1.5, 0.55, 0, 1.1);
          const posts = [-7.0, -5.35, -3.75];
          for (const x of posts) { k.metal(P.cyl(0.06, 0.08, 0.9, 6), PAL.gold, x, 0.45, 2.9); k.metal(P.sph(0.09, 6, 4), PAL.gold, x, 0.95, 2.9); }
          for (let i = 0; i < posts.length - 1; i++) {
            const a = posts[i], b = posts[i + 1], m = (a + b) / 2;
            k.add(tubeAB(new V3(a, 0.85, 2.9), new V3(m, 0.66, 2.9), 0.04, 0.04, 5), 0xd8336a); k.add(tubeAB(new V3(m, 0.66, 2.9), new V3(b, 0.85, 2.9), 0.04, 0.04, 5), 0xd8336a);
          }
          break;
        }
        case 'defense': {   // a little shield fountain (glowing basin) + a shield on a stand
          k.add(ringStack([[0.95, 0], [1.0, 0.1], [0.95, 0.45], [1.05, 0.5], [0.85, 0.52], [0.8, 0.3], [0, 0.32]], 16), stoneCol(0xd8c8a8, 0xecdcbc), 4.8, 0, 1.8);
          k.glow(P.cyl(0.8, 0.8, 0.05, 16), 0x9ff6f0, 4.8, 0.44, 1.8);
          k.add(P.cyl(0.12, 0.16, 0.9, 8), 0xecd6b2, 4.8, 0.85, 1.8); k.glow(P.sph(0.2, 8, 6), 0x5cffe1, 4.8, 1.38, 1.8);
          k.cyl(4.8, 1.8, 1.0, 0, 0.6);
          stand(-5.0, 1.8, 1.0); k.metal(xf(emblemGeo('shield', color).clone(), 0, 0, 0, 0, 0, 0, 1.15), null, -5.0, 1.65, 1.8);
          break;
        }
        case 'training': {   // bullseye targets on stands + practice cones + hay bales
          for (const [x, z] of [[4.4, 1.6], [6.2, 2.4]]) { stand(x, z, 1.1); k.add(xf(emblemGeo('target').clone(), 0, 0, 0, 0, 0, 0, 1.05), null, x, 1.45, z + 0.05); }
          for (let i = 0; i < 3; i++) { const x = -4.0 - i * 1.1, z = 2.4 + (i % 2) * 0.3; k.add(P.cone(0.24, 0.6, 10), 0xff8a4c, x, 0.3, z); k.add(P.cyl(0.18, 0.2, 0.08, 10), cream, x, 0.25, z); k.add(P.box(0.5, 0.06, 0.5), 0xff8a4c, x, 0.03, z); }
          k.add(Geo.colorize(P.cyl(0.55, 0.55, 1.1, 12), (x, y, z) => (Math.abs(Math.sin(y * 9)) > 0.85 ? C(0xc8a048) : C(0xf0d070))), null, -5.6, 0.55, 1.2, 0, 0, PI / 2);   // twine bands round the bale
          k.cyl(-5.6, 1.2, 0.6, 0, 1.1);
          break;
        }
        case 'hangar': {   // a little display skiff on a stand + fuel barrels + landing cones
          stand(4.6, 1.8, 1.2);
          // the display skiff (nose toward +Z in its own space, then turned a little toward the walkway and banked):
          // cream hull with an orange nose and a stripe in the hangar colour, glass canopy, swept wings with tip
          // lights, a tail fin and a glowing thruster. Parts are coloured in skiff space before the stand transform.
          {
            const SK = g => xf(g, 4.6, 1.64, 1.8, 0, 0.4, 0.07), sc = 1.25;
            k.metal(P.cyl(0.2, 0.12, 0.12, 10), PAL.gold, 4.6, 1.33, 1.8);   // cradle on the pole top
            const hull = ringStack([[0, -0.86], [0.2, -0.82], [0.3, -0.6], [0.34, -0.2], [0.32, 0.2], [0.26, 0.5], [0.15, 0.76], [0, 0.9]], 14);
            Geo.colorize(hull, (x, y) => (y > 0.48 ? C(0xff8a1f) : y > -0.2 && y < 0.02 ? C(color) : C(0xfdfbff)));
            hull.rotateX(PI / 2); hull.scale(1.1 * sc, 0.78 * sc, sc);
            k.addRaw(SK(hull));
            const canopy = P.sph(0.3, 12, 8); xf(canopy, 0, 0.2 * sc, 0.18 * sc, 0, 0, 0, 0.72 * sc, 0.56 * sc, 1.25 * sc);
            k.glowRaw(SK(canopy), 0x9ff0ff);
            for (const sx of [-1, 1]) {
              const wing = Geo.colorize(xf(P.rbox(0.86, 0.07, 0.42, 0.03, 1), sx * 0.55 * sc, -0.03, -0.2 * sc, 0, sx * 0.45, -sx * 0.1, sc), color);
              k.addRaw(SK(wing));
              k.glowRaw(SK(xf(P.sph(0.07, 8, 5), sx * 0.93 * sc, -0.01, -0.39 * sc)), sx > 0 ? 0x7dffc0 : 0xff7aa8);
            }
            k.addRaw(SK(Geo.colorize(xf(P.rbox(0.06, 0.4, 0.34, 0.025, 1), 0, 0.3 * sc, -0.62 * sc, -0.35, 0, 0, sc), color)));
            k.metalRaw(SK(Geo.colorize(xf(P.cyl(0.17, 0.22, 0.22, 12), 0, 0, -0.9 * sc, PI / 2, 0, 0, sc), PAL.navy)));
            k.glowRaw(SK(xf(P.cyl(0.14, 0.14, 0.04, 12), 0, 0, -1.03 * sc, PI / 2, 0, 0, sc)), 0xffb36b);
          }
          for (let i = 0; i < 2; i++) { const x = -4.6 - i * 0.95; k.add(ringStack(banded([[0.36, 0], [0.42, 0.15], [0.44, 0.5], [0.42, 0.85], [0.36, 1.0], [0, 1.0]], [[0, 0xff4d5e], [0.12, cream], [0.2, 0xff4d5e], [0.8, cream], [0.88, 0xff4d5e]]), 12), null, x, 0, 1.6); k.cyl(x, 1.6, 0.45, 0, 1.0); }
          for (let i = 0; i < 2; i++) { const x = -6.4, z = 1.0 + i * 1.2; k.add(P.cone(0.22, 0.55, 10), 0xffd23f, x, 0.28, z); k.add(P.cyl(0.17, 0.19, 0.07, 10), navy, x, 0.22, z); }
          break;
        }
        case 'arena': {   // goo splats on the ground in both team colours, tipped paint buckets
          const A = PAL.teamA, Bc = PAL.teamB;
          flatSplat(k, 0, A, 1.4, 4.6, 0.04, 1.8, -PI / 2, 0, 0.4); flatSplat(k, 1, Bc, 1.1, 6.0, 0.045, 3.0, -PI / 2, 0, 2.0);
          flatSplat(k, 2, Bc, 1.3, -4.8, 0.04, 2.0, -PI / 2, 0, 1.0); flatSplat(k, 3, A, 0.9, -6.2, 0.045, 1.0, -PI / 2, 0, 2.6);
          for (const [x, z, c, ry] of [[4.2, 1.2, A, 0.6], [-5.2, 2.6, Bc, -0.9]]) {
            k.add(ringStack([[0.32, -0.2], [0.36, 0.2], [0.38, 0.22], [0.3, 0.24], [0, 0.2]], 12), (px, py) => (py > 0.15 ? C(c) : C(0xdfe6f6)), x, 0.32, z, PI / 2, ry, 0);
            k.cyl(x, z, 0.4, 0, 0.7);
          }
          break;
        }
        default: {   // royale: a drop pod on a launch stand + supply crates
          stand(4.6, 1.8, 0.6);
          k.add(Geo.colorize(P.cap(0.45, 0.7, 4, 12), (x, y) => (y > 0.05 ? C(0xfdfbff) : C(color))), null, 4.6, 1.3, 1.8);
          k.glow(P.sph(0.18, 8, 6), 0x9ff0ff, 4.6, 1.42, 2.2, 0, 0, 0, 1, 1, 0.5);
          for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + PI / 2; k.add(P.box(0.06, 0.4, 0.3), navy, 4.6 + Math.cos(a) * 0.45, 0.82, 1.8 + Math.sin(a) * 0.45, 0, -a, 0); }
          crate(-4.8, 1.6, 0.85, 0xb4a8ec); crate(-5.6, 2.5, 0.65, 0xffd6e0, 0.5);
          break;
        }
      }
      planter(kind === 'cafe' ? 6.6 : 7.0, 0.9, [0xff7a93, 0xffd45c, 0xb983ff, 0xff8a4c][kind.length % 4]);
      groundAO(k.s, 0, 0.24, 0.6);
    });
  };

  // ================================================================== BIOMES
  const _bc = new THREE.Color(), _bd = new THREE.Color();
  const N2 = (x, z) => G.noise.n2(x, z);
  const bandsAt = (bands, bandH, x, z, y) => bands[(((Math.floor((y + N2(x * 0.15, z * 0.15) * 0.9) / bandH)) % bands.length) + bands.length) % bands.length];
  // Generic terrain painter: beach -> ground (noise blended 3 tones) -> cliff bands on steep slopes.
  function painter(o) {
    return function (x, z, h, s) {
      const wy = o.waterY || 0;
      if (o.beach && h < wy + 0.3) return o.beach[0];
      const n = N2(x * 0.06, z * 0.06), n2 = N2(x * 0.23 + 5.3, z * 0.23 - 2.1);
      ramp3(o.ground[0], o.ground[1], o.ground[2], clamp(0.5 + n * 0.62 + n2 * 0.18, 0, 1), _bc);
      // macro drift: large sun-warmed and cool-shaded fields, and a little more light up on the heights
      const mn = o.macro === false ? 0 : N2(x * 0.017 + 3.3, z * 0.017 - 7.1);
      if (mn > 0.15) _bc.lerp(_bd.copy(C(o.ground[2])).multiplyScalar(1.05).lerp(C(0xffe9a0), 0.18), clamp((mn - 0.15) * 1.6, 0, 0.42));
      else if (mn < -0.2) _bc.lerp(_bd.copy(C(o.ground[0])).lerp(C(o.shade), 0.3), clamp((-0.2 - mn) * 1.4, 0, 0.36));
      if (o.lift !== false) _bc.lerp(C(o.ground[2]), clamp((h - (o.waterY || 0) - 4) / 18, 0, 0.22));
      if (o.patch) { const pn = N2(x * 0.045 + 9, z * 0.045 - 4); if (pn > 0.26) _bc.lerp(C(o.patch), sstep(0.26, 0.5, pn) * (o.patchK || 0.85)); }
      if (s > (o.shadeS || 0.16)) _bc.lerp(C(o.shade), clamp((s - (o.shadeS || 0.16)) / 0.16, 0, 0.6));
      if (o.cliff && s > (o.cliffS || 0.3)) {
        const k = clamp((s - (o.cliffS || 0.3)) / 0.06, 0, 1);
        _bc.lerp(_bd.copy(C(bandsAt(o.cliff, o.bandH || 1.9, x, z, h))), k);
      }
      if (o.beach && h < wy + 1.3) _bc.lerp(_bd.copy(C(o.beach[1])), clamp((wy + 1.3 - h) / 1.0, 0, 1));
      if (o.peak != null && h > o.peakY) _bc.lerp(C(o.peak), clamp((h - o.peakY) / 3, 0, 0.9) * (1 - clamp((s - 0.25) * 4, 0, 1)));
      return _bc.getHex();
    };
  }
  // painter({ground:[dark,mid,light], patch, patchK, shade, shadeS, cliff:[bands], cliffS, bandH, beach:[wet,dry], waterY, peak, peakY})
  Geo.painter = painter;
  const SUN = new V3(0.5, 0.74, 0.45).normalize();
  Geo.biomes = {
    meadow: {
      sky: { top: 0x2fa8e8, mid: 0x5cc8f2, horizon: 0xcff3ff, bottom: 0xbde8f5, sun: 0xfffbe8, halo: 0xffe9a8, sunDir: SUN.clone(), clouds: true, cloudColor: 0xffffff },
      light: { sunDir: SUN.clone(), sun: 0xfff0d2, sky: 0xe6f4ff, ground: 0xecc69a, shadow: 0x6870ce, shadowK: 0.47, exposure: 1.01, rim: 0xfff2d4, grade: { sat: 0.12, tint: 0xfff0dc, tintK: 0.035 } },
      fog: { color: 0xcff3ff, near: 60, far: 260 },
      water: { shallow: 0x7fe8e0, deep: 0x1489b8, y: 0 },
      colorFn: painter({ ground: [0x58b85a, PAL.grass, PAL.grassTip], patch: 0xc8e86a, shade: PAL.grassShade, cliff: PAL.bands, beach: [PAL.sandWet, PAL.sandL] }),
      props: ['tree', 'bush', 'rock', 'mesa', 'pillarArch', 'flowerPatch', 'grassTuftGeo', 'mushroom', 'bigFlower', 'cloudPuff'],
      dress: {
        mesas: 0.7, arches: 0.25, bigRocks: 4, rockPal: 'sand', pebbles: 8, bands: PAL.bands,
        trees: [{ kind: 'round', palette: 'green', seed: 1 }, { kind: 'round', palette: 'green', seed: 7 }, { kind: 'round', palette: 'mint', seed: 3 }, { kind: 'round', palette: 'pink', seed: 4 }, { kind: 'round', palette: 'lime', seed: 5 }],
        treeD: 5.5, treeScale: [0.95, 1.45], bushes: 7, bushColors: [0x5cc85a, 0x48b87a, 0x7ad35a], berry: 0xff7a93,
        flowers: 16, flowerColors: [[0xff7a93, 0xffd45c, 0xffffff], [0xb983ff, 0xff8a4c, 0xfff1b8], [0xff5fa2, 0xffffff, 0x7fd8ff]],
        tufts: 170, tuft: [0x4aa85a, 0xcdf07a], mushrooms: 2, mushCaps: [0xff6f91, 0xffb37a], bigFlowers: 1.2, bigFlowerColors: [0xff7a93, 0xffd45c, 0xb983ff],
        clouds: 11, horizon: [0x8fd6a0, 0x7cc89a, 0xf2b98a, 0xc4cff5],
      },
    },
    reef: {
      sky: { top: 0x1fa0e0, mid: 0x50d0f0, horizon: 0xd8fbff, bottom: 0xa8f0f0, sun: 0xfffbe8, halo: 0xffe9a8, sunDir: SUN.clone(), clouds: true, cloudColor: 0xffffff },
      light: { sunDir: SUN.clone(), sun: 0xfff0d6, sky: 0xe2faff, ground: 0xf2d2a4, shadow: 0x6676d4, shadowK: 0.45, exposure: 1.02, rim: 0xfff4d6, grade: { sat: 0.12, tint: 0xfff2e2, tintK: 0.035 } },
      fog: { color: 0xc8f4f8, near: 70, far: 290 },
      water: { shallow: 0x7fe8e0, deep: 0x1489b8, y: 0 },
      colorFn: painter({ ground: [0xebc786, 0xf2d49a, PAL.sandL], patch: 0x9ad86a, shade: 0xe0a878, cliff: [0xfff0d8, 0xffc8a8, 0xff9a8a, 0xf07a7a, 0xd9658a, 0xb9557a], cliffS: 0.28, beach: [PAL.sandWet, 0xf2d49a] }),
      props: ['tree:palm', 'coral', 'pillarArch', 'rock', 'shell', 'starfish', 'mesa'],
      dress: {
        mesas: 0.35, arches: 0.7, bigRocks: 3, rockPal: 'coral', pebbles: 6, bands: [0xfff0d8, 0xffc8a8, 0xff9a8a, 0xf07a7a, 0xd9658a, 0xb9557a],
        trees: [{ kind: 'palm', seed: 1 }, { kind: 'palm', seed: 2 }, { kind: 'palm', seed: 5, palette: 'lime' }], treeD: 5, treeScale: [0.9, 1.25],
        bushes: 3, bushColors: [0x5fd6a8, 0x7ad35a], corals: 14, beach: 14, tufts: 60, tuft: [0x8ac860, 0xeaf0a0], flowers: 5,
        flowerColors: [[0xff7a93, 0xffffff, 0xffd45c]], clouds: 12, horizon: [0xf2b98a, 0xffc8a8, 0xe88a5a, 0xb8e4f0],
      },
    },
    ember: {
      sky: { top: 0xd85a98, mid: 0xff8aa8, horizon: 0xffd2b4, bottom: 0xffb59a, sun: 0xfff0c8, halo: 0xffb070, sunDir: SUN.clone(), clouds: true, cloudColor: 0xffe0e6 },
      light: { sunDir: SUN.clone(), sun: 0xffe2c4, sky: 0xffd0dc, ground: 0xff9a70, shadow: 0x9a5aa8, shadowK: 0.46, exposure: 1.0, rim: 0xffd0a0 },
      fog: { color: 0xffc6b6, near: 55, far: 240 },
      water: { shallow: 0xffd45c, deep: 0xff5a2a, y: 0, lava: true },
      colorFn: painter({ ground: [0xc86a5a, 0xe8906a, 0xffb48a], patch: 0x8a4a6a, shade: 0x9a4a5e, cliff: [0xffb36b, 0xff8a4c, 0xe0603f, 0xb8483f, 0x8a3a52, 0x5e2f4f], beach: [0x5e2f4f, 0x8a4a5a] }),
      props: ['rock:ember', 'crystal', 'mesa', 'mushroom(glow)', 'tree:pine(ember)'],
      dress: {
        mesas: 0.7, arches: 0.3, bigRocks: 5, rockPal: 'ember', pebbles: 10, bands: [0xffb36b, 0xff8a4c, 0xe0603f, 0xb8483f, 0x8a3a52, 0x5e2f4f], mesaCap: 0xffb08a,
        trees: [{ kind: 'pine', palette: 'ember', seed: 2 }, { kind: 'candy', palette: 'candy', seed: 3 }], treeD: 2.5, treeScale: [0.8, 1.2],
        bushes: 4, bushColors: [0xff7a5a, 0xe0604a], crystals: 7, crystalColors: [0xffa040, 0xff5f8a, 0xffd23f],
        mushrooms: 3, mushCaps: [0xff8a4c, 0xff5f8a], mushGlow: 0xffd45c, tufts: 90, tuft: [0xb84a4a, 0xffb08a], flowers: 4, flowerColors: [[0xffd45c, 0xff8a4c, 0xffffff]],
        clouds: 10, horizon: [0xc9624a, 0xe88a5a, 0x9a4060, 0xffb0a0],
      },
    },
    frost: {
      sky: { top: 0x6cc4f5, mid: 0x9ad8f8, horizon: 0xeaf8ff, bottom: 0xd8eefc, sun: 0xffffff, halo: 0xe0f0ff, sunDir: SUN.clone(), clouds: true, cloudColor: 0xffffff },
      light: { sunDir: SUN.clone(), sun: 0xfffaff, sky: 0xe8f4ff, ground: 0xd0d8ff, shadow: 0x7a88d8, shadowK: 0.42, exposure: 1.0, rim: 0xf0f8ff },
      fog: { color: 0xeaf8ff, near: 60, far: 220 },
      water: { shallow: 0xbff4ff, deep: 0x5aa8e0, y: 0, ice: true },
      colorFn: painter({ macro: false, ground: [0xdceaf8, 0xeaf6ff, 0xf6fbff], patch: 0xbdebff, patchK: 0.6, shade: 0x9fc3e8, cliff: [0xffffff, 0xd8f2ff, 0xbdebff, 0x9fc3e8, 0x8e88c8, 0x6e64a8], cliffS: 0.26, beach: [0x9fb8e0, 0xd8e8ff] }),
      props: ['tree:pine(snow)', 'crystal', 'rock:frost', 'mesa'],
      dress: {
        mesas: 0.5, arches: 0.4, bigRocks: 5, rockPal: 'frost', pebbles: 8, bands: [0xffffff, 0xd8f2ff, 0xbdebff, 0x9fc3e8, 0x8e88c8, 0x6e64a8], mesaCap: 0xf6faff,
        trees: [{ kind: 'pine', palette: 'pine', seed: 1, snow: true }, { kind: 'pine', palette: 'frost', seed: 2, snow: true }, { kind: 'pine', palette: 'pine', seed: 4, snow: true }], treeD: 8, treeScale: [0.8, 1.4],
        bushes: 4, bushColors: [0xd8e4ff, 0xc0d8ff], crystals: 6, crystalColors: [0xff9de2, 0x9fe8ff, 0xc8b8ff], tufts: 60, tuft: [0x9a9ad8, 0xf4f4ff], flowers: 3, flowerColors: [[0x9fe8ff, 0xffffff, 0xc8b8ff]],
        clouds: 12, horizon: [0xeaf4ff, 0xd0e4ff, 0xbdd0f0, 0xa8b0e8],
      },
    },
    jungle: {
      sky: { top: 0x2fb0d0, mid: 0x6ad8d0, horizon: 0xdcffe8, bottom: 0xb8e8d0, sun: 0xfffbe0, halo: 0xfff0a8, sunDir: SUN.clone(), clouds: true, cloudColor: 0xf4fff4 },
      light: { sunDir: SUN.clone(), sun: 0xfff0c8, sky: 0xd8ffe8, ground: 0x9ad070, shadow: 0x3a7a9a, shadowK: 0.5, exposure: 1.0, rim: 0xf0ffd0 },
      fog: { color: 0xc8f0d8, near: 40, far: 210 },
      water: { shallow: 0x6fe0c0, deep: 0x1a8a8a, y: 0 },
      colorFn: painter({ ground: [0x2f9e5a, 0x3fb86a, 0x7ad36a], patch: 0x9ae070, shade: 0x2a7a6a, cliff: [0x9ad88a, 0x6ab87a, 0x4a9a6e, 0x3a8a6a, 0x2f7a62, 0x24685a], beach: [0x8a6a4a, 0xb08a5a] }),
      props: ['mushroom(giant)', 'tree:round(teal)', 'bigFlower', 'bush', 'rock:moss'],
      dress: {
        mesas: 0.3, arches: 0.2, bigRocks: 3, rockPal: 'moss', pebbles: 6, bands: [0x9ad88a, 0x6ab87a, 0x4a9a6e, 0x3a8a6a, 0x2f7a62, 0x24685a], mesaCap: 0x3fb86a,
        trees: [{ kind: 'round', palette: 'teal', seed: 1 }, { kind: 'round', palette: 'green', seed: 2 }, { kind: 'round', palette: 'teal', seed: 6 }], treeD: 10, treeScale: [1.1, 1.7],
        giantMush: 2.5, mushCaps: [0xff6f91, 0xb983ff, 0xffb37a], mushrooms: 3, bigFlowers: 2.5, bigFlowerColors: [0xff5fa2, 0xffd45c, 0xff8a4c],
        bushes: 11, bushColors: [0x2f9e5a, 0x3fb86a, 0x5ac87a], berry: 0xffd45c, tufts: 150, tuft: [0x2a8a4a, 0x8ad86a], flowers: 14,
        flowerColors: [[0xff5fa2, 0xffd45c, 0xffffff], [0xb983ff, 0xff8a4c, 0x7fd8ff]], crystals: 1, crystalColors: [0x5cffe1],
        clouds: 10, horizon: [0x3fa86a, 0x5ac88a, 0x2f8a6a, 0x9adcc0],
      },
    },
    space: {
      sky: { top: 0x0a0a2e, mid: 0x1a1450, horizon: 0x40308a, bottom: 0x120e38, sun: 0xfff0d0, halo: 0xff9ad0, sunDir: new V3(-0.5, 0.35, -0.8).normalize(), sunSize: 0.0016, clouds: false, stars: true, nebula: 0x8f3fff },
      light: { sunDir: new V3(-0.5, 0.6, -0.6).normalize(), sun: 0xffe8f0, sky: 0x8a7aff, ground: 0x3a2a7a, shadow: 0x3a2a8a, shadowK: 0.55, exposure: 1.05, rim: 0x9fe8ff },
      fog: { color: 0x1e1658, near: 150, far: 700 },
      water: null,
      colorFn: painter({ ground: [0x3a3a8a, 0x5a5ab0, 0x8a8ad8], patch: 0x7a5ad0, shade: 0x2a2a6a, cliff: [0xb8b0ff, 0x8a7ae0, 0x6a5ac8, 0x4a3aa0, 0x3a2a80, 0x2a1a60] }),
      props: ['crystal', 'rock:slate'],
      dress: { bigRocks: 4, rockPal: 'slate', pebbles: 6, crystals: 4, crystalColors: [0xb983ff, 0x7af0ff, 0xff5fa2], clouds: 0, horizon: [0x3a2a7a, 0x5a3aa0, 0x2a1a5a] },
    },
  };
  // Night variant of the meadow (stars, moonlight, bioluminescent extras).
  Geo.biomes.night = Object.assign({}, Geo.biomes.meadow, {
    sky: { top: 0x1b1f4d, mid: 0x2a2f6e, horizon: 0x4a4a9a, bottom: 0x2b3170, sun: 0xe8f0ff, halo: 0x9fb7ff, sunDir: new V3(-0.4, 0.5, -0.75).normalize(), sunSize: 0.0009, clouds: true, cloudColor: 0x5a5fa8, stars: true, nebula: 0x3a2a7a },
    light: { sunDir: new V3(-0.4, 0.75, -0.5).normalize(), sun: 0xa8c0ff, sky: 0x6a74c8, ground: 0x40407a, shadow: 0x2b2f6e, shadowK: 0.62, exposure: 0.92, rim: 0xa8c0ff },
    fog: { color: 0x2f3578, near: 50, far: 230 },
    water: { shallow: 0x3fb8c8, deep: 0x142a6a, y: 0 },
    dress: Object.assign({}, Geo.biomes.meadow.dress, { mushrooms: 5, mushCaps: [0x8f6bff, 0x5fc8ff], mushGlow: PAL.bio, crystals: 2, crystalColors: [PAL.bio, 0x9fb7ff], clouds: 8, horizon: [0x3a4a8a, 0x45569e, 0x52507a, 0x2a3270], berry: PAL.bio }),
  });
  // GDD §2.3 biome ids (derived presets): shoals, mesas, grotto, junk, hub, turf. (frost = Frostfizz Bluffs.)
  const derive = (base, o) => Object.assign({}, Geo.biomes[base], o, { dress: Object.assign({}, Geo.biomes[base].dress, o.dress || {}) });
  Object.assign(Geo.biomes, {
    shoals: derive('meadow', {
      colorFn: painter({ ground: [0x5dbd5c, PAL.grass, PAL.grassTip], patch: 0xff9fd0, patchK: 0.8, shade: PAL.grassShade, cliff: PAL.bands, beach: [PAL.sandWet, PAL.sandL] }),
      dress: { mesas: 0.25, arches: 0.4, corals: 8, beach: 14, trees: [{ kind: 'round', palette: 'green', seed: 1 }, { kind: 'palm', seed: 2 }, { kind: 'round', palette: 'pink', seed: 4 }, { kind: 'palm', seed: 5, palette: 'lime' }] },
    }),
    mesas: derive('reef', {
      sky: { top: 0x47b4ee, mid: 0x86cdf0, horizon: 0xffe7c9, bottom: 0xf2d8c0, sun: 0xfffbe8, halo: 0xffd9a0, sunDir: SUN.clone(), clouds: true, cloudColor: 0xfffaf2 },
      light: { sunDir: SUN.clone(), sun: 0xfff0d4, sky: 0xfff0e0, ground: 0xf0c8a0, shadow: 0x8a6ac0, shadowK: 0.44, exposure: 1.02, rim: 0xfff0d0 },
      fog: { color: 0xffe7c9, near: 60, far: 240 },
      colorFn: painter({ ground: [0xe2b878, 0xebc786, 0xf2d49a], patch: 0xa8c95f, patchK: 0.7, shade: 0xe0a070, cliff: PAL.bands, cliffS: 0.24, beach: [PAL.sandWet, PAL.sandL] }),
      dress: { mesas: 1.5, arches: 0.9, corals: 0, beach: 6, treeD: 1.6, trees: [{ kind: 'palm', seed: 1 }, { kind: 'palm', seed: 5, palette: 'lime' }], bushes: 8, bushColors: [0xa8c95f, 0x8ab84a], tufts: 110, tuft: [0x9ab84a, 0xdde08a], bands: PAL.bands, mesaCap: 0xa8c95f, rockPal: 'sand', horizon: [0xf2b98a, 0xe88a5a, 0xc9624a, 0xffd8b0] },
    }),
    grotto: derive('night', {
      fog: { color: 0x2b3170, near: 40, far: 180 },
      colorFn: painter({ ground: [0x2f6e6a, 0x3a8f7a, 0x4aa08a], patch: 0x5a5fb0, patchK: 0.55, shade: 0x2a4f6a, cliff: [0x6a74c8, 0x5a5fb0, 0x4b4f9a, 0x3e4288, 0x343878, 0x2b2f6e], beach: [0x3a3f7a, 0x6a6aa8] }),
      dress: { mesas: 0.2, arches: 0.2, giantMush: 3.4, mushCaps: [0xff6f91, 0xb983ff, 0xff8fc0], mushrooms: 6, mushGlow: PAL.nightGlow, crystals: 3, crystalColors: [PAL.bio, 0x9fb7ff], treeD: 5, trees: [{ kind: 'round', palette: 'teal', seed: 1 }, { kind: 'round', palette: 'teal', seed: 6 }], bushColors: [0x2f6e6a, 0x3a8f7a], berry: PAL.bio, tuft: [0x1f5a5a, 0x4aa89a], flowerColors: [[PAL.bio, 0xb983ff, 0xffffff]], rockPal: 'moss', bands: [0x6a74c8, 0x5a5fb0, 0x4b4f9a, 0x3e4288, 0x343878, 0x2b2f6e], horizon: [0x2a3270, 0x3a4a8a, 0x45569e, 0x52507a] },
    }),
    junk: derive('ember', {
      sky: { top: 0x8f7be0, mid: 0xc890c8, horizon: 0xffb38a, bottom: 0xffc7a8, sun: 0xfff0c8, halo: 0xffb070, sunDir: new V3(0.6, 0.28, -0.75).normalize(), sunSize: 0.002, clouds: true, cloudColor: 0xffd8d0 },
      light: { sunDir: new V3(0.6, 0.45, -0.65).normalize(), sun: 0xffd8b0, sky: 0xffc8d8, ground: 0xd99a6c, shadow: 0x7a5aa8, shadowK: 0.48, exposure: 1.0, rim: 0xffd0a0 },
      fog: { color: 0xffc7a8, near: 50, far: 200 },
      water: { shallow: 0x9fd8d0, deep: 0x5a6ab0, y: 0 },
      colorFn: painter({ ground: [0xc98a62, 0xd99a6c, 0xe8b48a], patch: 0x9aa5b8, patchK: 0.7, shade: 0xa8705a, cliff: [0xffb38a, 0xd99a6c, 0xb87850, 0x9aa5b8, 0x6a6a8a, 0x4b3a6b], beach: [0x4b3a6b, 0xb8a0a0] }),
      dress: { mesas: 0.45, bigRocks: 8, rockPal: 'slate', crystals: 2, crystalColors: [0xffd23f, 0xff7a3d], treeD: 1.2, trees: [{ kind: 'pine', palette: 'ember', seed: 2 }], bushColors: [0xb88a6a, 0x9a7a6a], tuft: [0x8a6a5a, 0xd8b090], mushrooms: 0, bands: [0xffb38a, 0xd99a6c, 0xb87850, 0x9aa5b8, 0x6a6a8a, 0x4b3a6b], mesaCap: 0xd99a6c, horizon: [0x8f7be0, 0xb07ac8, 0xd99a6c, 0x6a5aa8] },
    }),
    hub: derive('meadow', {
      colorFn: painter({ ground: [0x5dbd5c, PAL.grass, PAL.grassTip], patch: 0xff9fd0, patchK: 0.5, shade: PAL.grassShade, cliff: PAL.bands, beach: [PAL.sandWet, PAL.sandL] }),
      dress: { mesas: 0.4, arches: 0.3, treeD: 5, bushes: 10, mushrooms: 1.5, bigFlowers: 0.8 },
    }),
    turf: derive('meadow', {
      fog: { color: 0xcff3ff, near: 80, far: 300 },
      colorFn: painter({ ground: [0xc8d8c8, 0xd2dccf, 0xdce4d8], shade: 0xb8c4c0, cliff: [0xe8d6bf, 0xd9dde8, 0xcfe3e8, 0xc4cad8, 0xb0b8c8, 0x8a93a8], beach: [0xc8bca8, 0xe8d6bf] }),
      dress: { mesas: 0, arches: 0, bigRocks: 1, treeD: 2, bushes: 4, flowers: 4, tufts: 40, mushrooms: 0, bigFlowers: 0, pebbles: 2, clouds: 10 },
    }),
  });
  Geo.biomeWorldOpts = function (id) {
    const b = Geo.biomes[id] || Geo.biomes.meadow, q = G.R && G.R.q ? G.R.q() : { draw: 320 };
    return { sky: Object.assign({}, b.sky), light: Object.assign({}, b.light), fog: { color: b.fog.color, near: b.fog.near, far: Math.min(b.fog.far, Math.max(q.draw, b.fog.near + 60)) } };
  };

  // Populate a terrain with a budgeted, mostly instanced prop mix. Returns world-space collider
  // descriptors ({type,...,item}); the added Object3D is returned as `.group`.
  Geo.dressBiome = function (world, biomeId, o) {
    o = o || {};
    const bio = Geo.biomes[biomeId] || Geo.biomes.meadow, R = bio.dress || {};
    const phys = world && world.phys;
    const A = o.area || (phys && phys.bounds) || { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    const hf = o.heightFn || (phys && phys.heightFn) || (() => 0);
    const q = G.R && G.R.q ? G.R.q() : { props: 1, clouds: true };
    const dens = (o.density != null ? o.density : 1) * (q.props || 1);
    const rnd = G.rng(o.seed || 7);
    const per = ((A.maxX - A.minX) * (A.maxZ - A.minZ)) / 10000;
    const waterY = bio.water ? bio.water.y || 0 : -1e9;
    const group = new THREE.Group(); group.name = 'dress-' + biomeId;
    const bakeG = new THREE.Group(), cols = [], placed = [];
    const slope = (x, z) => Math.hypot(hf(x + 0.8, z) - hf(x - 0.8, z), hf(x, z + 0.8) - hf(x, z - 0.8)) / 1.6;
    const ok = (x, z, maxS, minH, r) => {
      if (o.avoid && (o.avoid(x, z) || (r && (o.avoid(x + r, z) || o.avoid(x - r, z) || o.avoid(x, z + r) || o.avoid(x, z - r))))) return false;
      const h = hf(x, z);
      if (h < waterY + (minH != null ? minH : 0.5)) return false;
      if (slope(x, z) > maxS) return false;
      if (r) for (const p of placed) if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < (p.r + r) * (p.r + r)) return false;
      return true;
    };
    const sample = (n, maxS, minH, r, margin, maxH) => {
      const out = [], m = margin || 0;
      for (let tries = 0; out.length < n && tries < n * 14 + 10; tries++) {
        const x = A.minX + m + rnd() * (A.maxX - A.minX - 2 * m), z = A.minZ + m + rnd() * (A.maxZ - A.minZ - 2 * m);
        if (!ok(x, z, maxS, minH, r)) continue;
        const y = hf(x, z);
        if (maxH != null && y > waterY + maxH) continue;
        if (r) placed.push({ x, z, r });
        out.push({ x, y, z });
      }
      return out;
    };
    // scatter n..m extra points around each centre (natural clumps), respecting avoid/water/slope
    const cluster = (centres, nMin, nMax, rad) => {
      const out = [];
      for (const c of centres) {
        const n = nMin + ((rnd() * (nMax - nMin + 1)) | 0);
        for (let j = 0; j < n; j++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * rad, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; if (ok(x, z, 0.6, 0.4)) out.push({ x, y: hf(x, z), z }); }
      }
      return out;
    };
    const cnt = (k, minQ) => Math.max(0, Math.round((k || 0) * per * Math.max(minQ || 0, dens)));
    const addCol = c => { if (phys) c.item = c.type === 'cyl' ? phys.addCyl(c.x, c.z, c.r, c.y0, c.y1) : phys.addBox(c.cx, c.cy, c.cz, c.sx, c.sy, c.sz); cols.push(c); };
    const placeBaked = (prop, x, y, z, ry) => { const r = Geo.place(null, prop, x, y, z, ry, bakeG); for (const c of worldCols(prop, x, y, z, ry)) addCol(c); return r; };
    // instanced variants: [{geo, mat?, glow?, col(pt)->[colliders]}]
    // ground occlusion under everything solid (baked into the terrain by the caller: cols.ao)
    const ao = [];
    const inst = (variants, pts, sc, extra) => {
      extra = extra || {};
      const buckets = variants.map(() => []);
      for (const p of pts) {
        const vi = Math.floor(rnd() * variants.length), s = sc[0] + rnd() * (sc[1] - sc[0]);
        const pt = { x: p.x, y: p.y + (extra.yOff || 0), z: p.z, s, ry: rnd() * TAU, tx: (rnd() - 0.5) * (extra.tilt || 0), tz: (rnd() - 0.5) * (extra.tilt || 0) };
        if (extra.tint) pt.color = extra.tint[Math.floor(rnd() * extra.tint.length)];
        buckets[vi].push(pt);
        if (variants[vi].col) for (const c of variants[vi].col(pt)) addCol(c);
        if (extra.ao) ao.push({ x: pt.x, z: pt.z, r: extra.ao[0] * s, k: extra.ao[1] });
      }
      variants.forEach((v, i) => {
        if (!buckets[i].length) return;
        const m = instancedAt(v.geo, v.mat || extra.mat || G.M.vc(), buckets[i]); m.name = extra.name || 'inst';
        group.add(m);
        if (v.glow) group.add(instancedAt(v.glow, glowMat(), buckets[i]));
      });
    };
    // 1) landmarks (baked into one mesh): mesas + arches
    const nMesa = cnt(R.mesas, 0.7);
    for (let i = 0; i < nMesa; i++) {
      const rad = 5.5 + rnd() * 6, ht = 5 + rnd() * 8;
      const p = sample(1, 0.5, 1.0, rad * 1.25 + 3, rad + 4)[0];
      if (!p) continue;
      let y = p.y; for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU; y = Math.min(y, hf(p.x + Math.cos(a) * rad * 0.85, p.z + Math.sin(a) * rad * 0.85)); }
      placeBaked(Geo.mesa(rad, ht, (rnd() * 1e4) | 0, { bands: R.bands, cap: R.mesaCap !== undefined ? R.mesaCap : PAL.grass }), p.x, y - 0.2, p.z, rnd() * TAU);
      ao.push({ x: p.x, z: p.z, r: rad * 1.45, k: 0.3 });
    }
    const nArch = cnt(R.arches, 0.7);
    for (let i = 0; i < nArch; i++) {
      const span = 7 + rnd() * 6, ht = 3.5 + rnd() * 3;
      const p = sample(1, 0.35, 0.6, span * 0.7 + 2, span)[0];
      if (!p) continue;
      const ar = ((rnd() * 4) | 0) * (PI / 2);
      placeBaked(Geo.pillarArch(span, ht, (rnd() * 1e4) | 0, { bands: R.bands }), p.x, p.y - 0.3, p.z, ar);
      for (const sx of [-1, 1]) ao.push({ x: p.x + Math.cos(ar) * sx * span / 2, z: p.z - Math.sin(ar) * sx * span / 2, r: 3.2, k: 0.3 });
    }
    if (bakeG.children.length) { bakeG.name = 'landmarks'; for (const bm of Geo.bakeQuads(bakeG, { cx: (A.minX + A.maxX) / 2, cz: (A.minZ + A.maxZ) / 2 })) group.add(bm); }
    // 2) trees
    if (R.trees && R.trees.length) {
      const vs = R.trees.map(t => {
        const geo = Geo.treeGeo(t.kind, t.seed, t.lite ? { palette: t.palette, snow: t.snow, lite: true } : { palette: t.palette, snow: t.snow });
        const tr = geo.userData.trunk;
        return { geo, col: pt => [{ type: 'cyl', x: pt.x, z: pt.z, r: tr.r * 1.1 * pt.s, y0: pt.y - 0.3, y1: pt.y + tr.h * pt.s }] };
      });
      inst(vs, sample(cnt(R.treeD), 0.45, 0.8, 1.6), R.treeScale || [0.9, 1.3], { yOff: -0.1, name: 'trees', mat: windMat(0.26), ao: [2.4, 0.34] });
    }
    // 3) giant mushrooms (walkable caps)
    if (R.giantMush) {
      // R.giantGlow: glowing cap spots (night regions: the giants light the forest)
      // (their glow comes from the lite build: 4 big spots + a gill ring instead of 7 — the same light from afar
      // for half the triangles, which a forest of 20+ giants needs to stay under the High budget)
      const vs = (R.mushCaps || [PAL.mushCap]).map((c, i) => {
        const gl = R.giantGlow != null ? R.giantGlow : null, d = Geo.mushroomParts(c, gl, 20 + i), dl = gl != null ? Geo.mushroomParts(c, gl, 20 + i, 'glow') : null;
        return { geo: d.solid, glow: dl ? dl.glow : d.glow, col: pt => [{ type: 'cyl', x: pt.x, z: pt.z, r: 0.19 * pt.s, y0: pt.y, y1: pt.y + pt.s }, { type: 'cyl', x: pt.x, z: pt.z, r: 0.6 * pt.s, y0: pt.y + 0.97 * pt.s, y1: pt.y + 1.47 * pt.s }] };
      });
      inst(vs, sample(cnt(R.giantMush), 0.35, 0.8, 2.6), R.giantScale || [2.2, 4.0], { name: 'giantMush', ao: [0.9, 0.32] });
    }
    // 4) big rocks
    if (R.bigRocks) {
      const vs = [11, 23, 37].map(sd => {
        const geo = Geo.rockGeo(1.2, sd, R.rockPal, 2), bb = geo.boundingBox;
        return { geo, col: pt => [{ type: 'cyl', x: pt.x, z: pt.z, r: Math.min(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.42 * pt.s, y0: pt.y - 0.5, y1: pt.y + bb.max.y * 0.94 * pt.s }] };
      });
      inst(vs, sample(cnt(R.bigRocks), 0.6, 0.2, 1.5), [0.9, 2.2], { yOff: -0.15, name: 'rocks', ao: [1.7, 0.3] });
    }
    // 5) crystals (self-lit, colliders)
    if (R.crystals) {
      const mat = G.M.vc(CRYSTAL_MAT);
      const vs = (R.crystalColors || [0x7af0ff]).map((c, i) => ({ geo: Geo.crystalGeo(30 + i, c), mat, col: pt => [{ type: 'cyl', x: pt.x, z: pt.z, r: 0.35 * pt.s, y0: pt.y, y1: pt.y + 1.2 * pt.s }] }));
      inst(vs, sample(cnt(R.crystals), 0.7, 0.3, 1.0), [0.8, 2.0], { name: 'crystals', ao: [0.9, 0.22] });
    }
    // 6) corals (reef) + beach decor near the waterline
    if (R.corals) {
      const vs = [];
      for (let kd = 0; kd < 5; kd++) vs.push({ geo: Geo.coralGeo(kd, PAL.coral[(kd * 2 + 1) % 6], kd) }, { geo: Geo.coralGeo(kd, PAL.coral[kd], kd + 7) });
      inst(vs, sample(cnt(R.corals), 0.55, 0.05), [0.8, 1.9], { name: 'corals' });
    }
    if (R.beach) {
      const vs = [{ geo: Geo.shellGeo(0xffd8e6) }, { geo: Geo.shellGeo(0xffe8b0) }, { geo: Geo.starfishGeo(0xff8a4c) }, { geo: Geo.starfishGeo(0xff5fa2) }];
      inst(vs, sample(cnt(R.beach), 0.5, 0.15, 0, 0, 1.6), [0.9, 1.6], { name: 'beach' });
    }
    // 7) bushes, mushrooms, big flowers
    if (R.bushes) {
      const vs = (R.bushColors || [PAL.grass]).map((c, i) => ({ geo: Geo.bushGeo(50 + i, c, i === 0 ? R.berry : undefined) }));
      inst(vs, sample(cnt(R.bushes), 0.5, 0.6), [0.7, 1.35], { yOff: -0.08, name: 'bushes', mat: windMat(0.42), ao: [1.35, 0.26] });
    }
    if (R.mushrooms) {
      const vs = (R.mushCaps || [PAL.mushCap]).map((c, i) => { const d = Geo.mushroomParts(c, R.mushGlow != null ? R.mushGlow : null, 60 + i, true); return { geo: d.solid, glow: d.glow }; });
      inst(vs, cluster(sample(cnt(R.mushrooms), 0.4, 0.6), 2, 4, 1.0), [0.35, 0.85], { name: 'mushrooms' }); // stiff: their glow spots are a separate (unswaying) mesh
    }
    if (R.bigFlowers) {
      const vs = (R.bigFlowerColors || [0xff7a93]).map(c => {
        const pr = Geo.bigFlower(c, 1);
        return { geo: pr.mesh.geometry, col: pt => [{ type: 'cyl', x: pt.x, z: pt.z, r: 0.16 * pt.s, y0: pt.y, y1: pt.y + 2.4 * pt.s }] };
      });
      inst(vs, sample(cnt(R.bigFlowers), 0.4, 0.8, 1.2), [0.9, 1.5], { name: 'bigFlowers', mat: windMat(0.3), ao: [0.8, 0.18] });
    }
    // desert blooms (round cacti + flowering rosettes) in little groups; snowdrifts (soft white mounds)
    if (R.blooms) {
      const bc = R.bloomColors || [0xff7a93, 0xffd45c, 0xff9a5a];
      // (the tall flowering rosettes sway in the house wind; the round cacti stand stiff)
      const vs = [0, 1, 2].map(kd => ({ geo: Geo.bloomGeo(kd, bc[kd % bc.length], kd + 1), mat: kd === 2 ? windMat(0.55) : undefined }));
      inst(vs, cluster(sample(cnt(R.blooms), 0.4, 0.6, 0.8), 1, 3, 1.6), [0.8, 1.5], { yOff: -0.04, name: 'blooms', ao: [0.7, 0.22] });
    }
    if (R.drifts) inst([{ geo: Geo.snowdriftGeo(1) }, { geo: Geo.snowdriftGeo(2) }], sample(cnt(R.drifts), 0.45, 0.4), [1.0, 2.4], { yOff: -0.08, name: 'drifts' });
    // 8) ground cover (no colliders)
    if (R.pebbles) inst([{ geo: Geo.pebbleGeo(3, R.rockPal) }, { geo: Geo.pebbleGeo(9, R.rockPal) }], sample(cnt(R.pebbles), 0.8, 0.0), [0.6, 1.6], { yOff: -0.03, name: 'pebbles' });
    // o.foliage: the caller grows a camera-windowed grass/flower field instead (G.Terrain.foliage)
    if (R.flowers && !o.foliage) inst((R.flowerColors || [null]).map((c, i) => ({ geo: Geo.flowerGeo(70 + i, c) })), cluster(sample(cnt(R.flowers / 4), 0.35, 0.7), 3, 6, 1.8), [1.1, 1.6], { name: 'flowers', mat: windMat(1.0) });
    if (R.tufts && !o.foliage) {
      const t = R.tuft || [PAL.grassDark, PAL.grassTip];
      inst([{ geo: Geo.grassTuftGeo(1, t[0], t[1]) }, { geo: Geo.grassTuftGeo(2, t[0], t[1]) }], cluster(sample(cnt(R.tufts / 6), 0.4, 0.5), 4, 8, 2.2), [1.0, 1.8], { yOff: -0.02, name: 'tufts', tint: [0xffffff, 0xeefff0, 0xfff8e8], mat: windMat(1.2) });
    }
    // 9) sky decoration + horizon ring
    const cx = (A.minX + A.maxX) / 2, cz = (A.minZ + A.maxZ) / 2, ext = Math.max(A.maxX - A.minX, A.maxZ - A.minZ) / 2;
    if (o.clouds !== false && R.clouds) {
      const n = Math.round(R.clouds * (q.clouds === false ? 0.5 : 1)), pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.4, d = ext * (0.7 + rnd() * 0.9) + 40; pts.push({ x: cx + Math.cos(a) * d, y: 48 + rnd() * 40, z: cz + Math.sin(a) * d, s: 5 + rnd() * 6 }); }
      const tint = bio.sky && bio.sky.cloudColor != null ? bio.sky.cloudColor : 0xffffff;
      if (tint !== 0xffffff) for (const p of pts) p.color = tint;
      const m = instancedAt(Geo.cloudGeo(1), Geo.cloudMat(tint), pts.filter((p, i) => i % 2 === 0));
      const m2 = instancedAt(Geo.cloudGeo(2), Geo.cloudMat(tint), pts.filter((p, i) => i % 2 === 1));
      m.name = m2.name = 'clouds';
      group.add(m, m2);
    }
    if (o.horizon !== false && R.horizon) {
      const hm = Geo.distantMountains(ext * 1.45 + 70, 24, R.horizon, { haze: bio.fog.color, bands: R.bands, seed: o.seed || 7 });
      hm.position.set(cx, 0, cz);
      group.add(hm);
    }
    if (world) world.add(group);
    cols.group = group;
    cols.ao = ao;
    return cols;
  };
  // Vertex-coloured foliage that sways in the house wind (instanced: weight = height above each instance).
  const windMat = k => G.M.vc({ wind: k });
  Geo.windMat = windMat;
  // Translate a prop's local colliders to world-space descriptors (same rules as place()).
  // Quarter-turn rotations keep exact boxes. Other angles: slab-like boxes (floors, plinths, roofs)
  // become the AABB of their rotated footprint; walls/blocks become a chain of cylinders.
  function worldCols(prop, x, y, z, rotY) {
    rotY = rotY || 0;
    const c = Math.cos(rotY), s = Math.sin(rotY), q4 = rotY / (PI / 2), quarter = Math.abs(q4 - Math.round(q4)) < 1e-3;
    const odd = ((Math.round(q4) % 4) + 4) % 2 === 1, out = [];
    const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    for (const cl of prop.colliders || []) {
      if (cl.type === 'cyl') { const p = W(cl.x, cl.z); out.push({ type: 'cyl', x: p[0], z: p[1], r: cl.r, y0: y + cl.y0, y1: y + cl.y1, tag: cl.tag }); continue; }
      const p = W(cl.cx, cl.cz);
      if (quarter) { out.push({ type: 'box', cx: p[0], cy: y + cl.cy, cz: p[1], sx: odd ? cl.sz : cl.sx, sy: cl.sy, sz: odd ? cl.sx : cl.sz, tag: cl.tag }); continue; }
      if (cl.sy <= 0.5 * Math.min(cl.sx, cl.sz)) {
        const hx = Math.abs(c) * cl.sx / 2 + Math.abs(s) * cl.sz / 2, hz = Math.abs(s) * cl.sx / 2 + Math.abs(c) * cl.sz / 2;
        out.push({ type: 'box', cx: p[0], cy: y + cl.cy, cz: p[1], sx: hx * 2, sy: cl.sy, sz: hz * 2, tag: cl.tag });
        continue;
      }
      const alongX = cl.sx >= cl.sz, len = alongX ? cl.sx : cl.sz, th = alongX ? cl.sz : cl.sx;
      const r = Math.max(0.3, th / 2), span = Math.max(0, len / 2 - r), n = span > 0.01 ? Math.ceil((2 * span) / (1.3 * r)) + 1 : 1;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : -span + (2 * span * i) / (n - 1), q = W(cl.cx + (alongX ? t : 0), cl.cz + (alongX ? 0 : t));
        out.push({ type: 'cyl', x: q[0], z: q[1], r, y0: y + cl.cy - cl.sy / 2, y1: y + cl.cy + cl.sy / 2, tag: cl.tag });
      }
    }
    return out;
  }
  Geo.worldColliders = worldCols;
  // Ground-occlusion spots ({x,z,r,k} for G.Terrain.bakeAO) from world-space collider descriptors: only
  // colliders that stand on the ground (bottom within 0.8 m of groundFn) leave a pool; walls give one
  // spot per ~2.5 m. Appends to out and returns it.
  Geo.aoFromCols = function (cols, out, groundFn) {
    out = out || [];
    for (const c of cols || []) {
      if (c.type === 'cyl') {
        const g = groundFn ? groundFn(c.x, c.z) : 0;
        if (c.y0 > g + 0.8 || c.y1 < g + 0.15) continue;
        out.push({ x: c.x, z: c.z, r: c.r * 1.45 + 0.7, k: c.r > 2.5 ? 0.3 : 0.32 });
      } else {
        const g = groundFn ? groundFn(c.cx, c.cz) : 0, bot = c.cy - c.sy / 2;
        if (bot > g + 0.8 || c.cy + c.sy / 2 < g + 0.15) continue;
        const L = Math.max(c.sx, c.sz), W = Math.min(c.sx, c.sz), n = Math.min(12, Math.max(1, Math.round(L / 2.5)));
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * (L - W * 0.5);
          out.push({ x: c.cx + (c.sx >= c.sz ? t : 0), z: c.cz + (c.sx >= c.sz ? 0 : t), r: W * 0.75 + 1.1, k: 0.24 });
        }
      }
    }
    return out;
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 15_geo.js]', e); }
// ---- 15b_geo_chars.js
try { (function () {
// 15b_geo_chars.js — G.Geo part 2: the CHARACTER art kit for Marmalune Rangers (no external assets).
// Look: Slime-Rancher soft glossy toon jelly + chunky Ratchet-style cartoon robots in the GDD Gizmob
// livery. Kid-friendly: bots "pop" (squash wide, flash, vanish) — never break apart.
// Self-contained: never depends on 15_geo.js at load time (private helpers below).
//
// CONVENTIONS
//   * Every model faces +Z and stands on y = 0 (turn with obj.rotation.y = Math.atan2(dirX, dirZ)).
//     A robot's armR / an NPC's armR is its OWN right hand (at -X); ship wingR likewise.
//   * Geometry is cached and flagged userData.shared (G.R.disposeTree skips it). Per-instance
//     materials (hit flash, telegraph, face swaps) are freed by dispose() or G.R.disposeTree.
//   * Robots are built at unit height and scaled by spec.size, so equal specs share all geometry.
//   * DRAW-CALL BUDGET: a robot / humanoid draws ALL its vertex-coloured parts as ONE skinned mesh (the
//     part groups are its bones: animate / scale / hide parts exactly as before — part.visible = false
//     collapses that part) + its face = 2 draw calls (+ jet flame, elite bubble). Blob shadows and glow
//     sprites (halo, spark, boss glows) are drawn by two shared InstancedMeshes per scene (adopted
//     automatically by animateRobot / animateHumanoid, or by useLayers). Far LOD = 1 static mesh.
//
// API
//   face(expr, {style:'led'|'toon', color, eyes:'two'|'one'|'visor', screen, mouth, blush, screenColor})
//       -> cached 128² CanvasTexture. expr: idle happy angry hurt dizzy sleep alert(+"!") chomp scared wink blink
//       focused (wind-ups: wide determined eyes under level brow dashes + a pink cheek accent; never slanted brows)
//   robot(spec, {attach}) -> {group, parts, layout, mat, setExpr, setFlash(0..1), setTelegraph(0..1), setAlt(m),
//       kick(k), hit(dirX, dirZ, k, big) (directional flinch / stagger + eased flash), spawnIn(delay) (pop-in),
//       setLOD(0|1|2), muzzleWorld(out), dispose(), height, radius, critY (m), stats:{meshes, tris}}
//     setLOD: 0 full rig (2 calls; setMid(on) swaps its skin for the 0.7 twin) | 1 ONE static rest-pose mesh of the
//       reduced twins + the live face (2 calls; whole-body bob/lean/squash/flash only) | 2 = the coarser twins with
//       the face screen baked in (1 call), without halo / jets / spark. r.mat = the robot's charMat
//       (.emissive whole-body tint/flash, .core weak-spot glow colour). attach: [{to: part | 'model' | 'rig',
//       as (new part group under `to`), at, geo, color, em, ei, pos, rot, scale, key}] = extra static pieces
//       merged into the robot mesh (enemy crowns, coils, cargo). robotLayout(spec) -> unit-space layout.
//     spec {body:'sphere'|'capsule'|'box'|'disc'|'egg'|'barrel', size (m), color, accent, metal, eyes:
//       'led1'|'led2'|'visor'|'toon', eyeColor, coreColor, screenColor, mobility:'legs2'|'legs4'|'spider'|
//       'tripod'|'wheel'|'tread'|'hover'|'prop'|'copter'|'hop'|'ball'|'none', arms:'none'|'blaster'|'claw'|
//       'saw'|'hammer'|'shield'|'cannon'|'rifle'|'fist', armL/armR overrides (+'mitt'), antenna:bool|'dish'|
//       'fuse'|'coil'|'crown', back:'none'|'jet'|'tank'|'spikes'|'missiles'|'mortar', armor 0..1, stripes,
//       emblem/shieldEmblem:'cross'|'star'|'bolt'|'heart', deco:'vending'|'hive', elite, mood, boss, seed}
//     parts: rig model body head eyes(=face) armL armR weapon weapon2 muzzle muzzle2 legs[] wheel prop
//            tailRotor core coreGlow antenna jet spark shield bubble shadow (all Object3D groups; weapon /
//            shield / cannon / core are groups now, not meshes; face is the face mesh)
//   GIZMOB palette; robotPresets {GDD id: spec + {name, role}} (bumbler hopper rollo squirt gnat shieldy lobba
//     zapper pinch bruiser tote + bosses crankcrab buzzhive titan) — Gizmob presets are read live from
//     G.Enemies.defs[id].spec (one source of truth with the game), bosses mirror 17b_bosses.js
//   animateRobot(r, state, t, dt, {speed, look, aim, expr, telegraph, flash, fire, hop, vx, vz, vy, yaw, turn, wind,
//     detail}) state idle|move|attack|windup|hurt|stun|dead -> true once the pop has finished (burst at ROBOT_POP_AT s)
//     (velocity / facing / turn rate drive lean-into-acceleration; without them they are read off the group transform)
//   critter(kind 'blob'|'bunnyblob'|'puffbird'|'snailbot', color) + animateCritter(c, t, dt)
//   npc(kind) -> {group, parts, setExpr, animate(t, dt), greet(), dispose()}; npcPortraitSVG(kind); the companion
//     (Beepo) wears the Ranger Locker hat (synced in animate; setHat(id), fixedHat = true to pin one); hatGeo(id)
//   ranger(id 'kiko'|'pip'|'juno'|'tuck', colors?) -> NPC-shaped playable ranger (colors = G.Wardrobe.rangerColors(),
//     default = the equipped look); RANGER_IDS; rangerPortraitSVG(id, colors?); helmetParts {fins, dome, crest, goggles}
//     NPC_KINDS: guildmaster(Quill) mechanic(Gizma) merchant(Penny Pop) pilot(Ace Wobble) coach(Coach Ping)
//     chef(Barista Bloop) curator(Curator Lumi) companion(Beepo) kiko mox gale; npcInfo[kind].name
//   ship(style 'arrow'|'manta'|'twin'|'bulky'|'needle', {main, accent, glow}) -> {group, parts:{body,
//     engines[], wingL, wingR, cockpit, flames}, setBoost(0..1), update(t, dt), dispose()}; SHIP_STYLES
//   spaceProps.asteroid(size, seed) planet(radius, colors[], ring) station(size) ringGate(radius, color)
//     boostPad(w, l) itemBox() — animated ones expose obj.userData.tick(t, dt)
//   inkBlob(color)   humanoid(colors {main, accent, dark, visor, seed}, opts {seed, helmet, build}) — the seed picks one
//     of 3 helmets (crest / swept fins / antenna dome) × 2 builds (standard / sturdy) — + animateHumanoid(h, state, t, dt,
//     {speed, expr, vx, vz, vy, yaw, turn, grounded, detail}) state idle|run|shoot|jump|swim|hurt|dead; h.setBlob(bool),
//     h.kick(), h.hit(dirX, dirZ, k, big), h.spawnIn(delay), h.setFlash(k),
//     h.setLOD(0|1) (1 = ONE static gun-holding mesh with the visor baked in), h.mat
//   charMat(opts) -> per-character soft-toon ShaderMaterial (vertex colours + 'glow' attr; skinning-ready) with a soft
//     dark-plum silhouette edge (opts.edge, stronger under warm ground light) so bots read on sand / rust
//   useLayers(obj, scene|world?) adopt obj's blob shadows / glow sprites into the scene's shared layers;
//   prepareScene(scene|world) builds those layers up front (run for every new World via G.World.created, with the
//     robots' / rangers' far-LOD meshes parked at spawn, so mode warm-ups compile them);
//   onSceneRender(scene|world, fn(camera)) per-frame hook after matrix update (used by G.Bot name tags)
//   iconSVG(name, color?, size=24) -> inline SVG (24×24 viewBox, ink outline #1e1a4d); ICON_NAMES
//   countTris(object3D) -> {meshes, tris};  hopCurve(p 0..1) -> {y, sy, air};  spring(s {x,v}, target, hz, zeta, dt)
//     (stable sub-stepped damped spring);  popIn(k 0..1) -> overshooting scale
(function (G) {
  'use strict';
  const Geo = G.Geo = G.Geo || {};
  const V3 = THREE.Vector3;
  const PI = Math.PI, TAU = PI * 2, HP = PI / 2;
  const INK = '#1e1a4d';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
  const spow = (v, e) => (v < 0 ? -Math.pow(-v, e) : Math.pow(v, e));
  const rq = v => Math.round(v * 1000) / 1000;
  const hexOf = c => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16) || 0);
  const css = c => (typeof c === 'string' ? c : '#' + ((c >>> 0) & 0xffffff).toString(16).padStart(6, '0'));
  // f < 1 darkens, f > 1 lightens toward white (sRGB space).
  function shade(hex, f) {
    hex = hexOf(hex);
    const ch = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(c => clamp(Math.round(f >= 1 ? c + (255 - c) * (f - 1) : c * f), 0, 255));
    return (ch[0] << 16) | (ch[1] << 8) | ch[2];
  }
  function mixHex(a, b, t) {
    a = hexOf(a); b = hexOf(b);
    const m = s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
    return (m(16) << 16) | (m(8) << 8) | m(0);
  }

  // ------------------------------------------------------------------ geometry cache + primitives
  const GC = new Map();
  function cg(key, make) {
    let g = GC.get(key);
    if (g === undefined) { g = make() || null; if (g) g.userData.shared = true; GC.set(key, g); }
    return g;
  }
  Geo._charGeoCache = GC;

  // Unit superellipsoid grid (half extents 1). e1 = vertical roundness, e2 = horizontal (1 = round,
  // ~0.3 = boxy). o: {taper (x/z scale 1+taper*y), lat0, lat1, lon0, lon1, patch (uv mirrored for
  // front decals), ws, hs}. Analytic normals (no seams). lon = PI/2 is the +Z front.
  function sqGeo(e1, e2, o) {
    o = o || {};
    const ws = o.ws || 18, hs = o.hs || 12, t = o.taper || 0;
    const lat0 = o.lat0 != null ? o.lat0 : -HP, lat1 = o.lat1 != null ? o.lat1 : HP;
    const lon0 = o.lon0 != null ? o.lon0 : 0, lon1 = o.lon1 != null ? o.lon1 : TAU;
    const n = (ws + 1) * (hs + 1);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    const nv = new V3();
    let k = 0;
    for (let i = 0; i <= hs; i++) {
      const lat = lat0 + (lat1 - lat0) * i / hs, cl = Math.max(0, Math.cos(lat)), sl = Math.sin(lat);
      for (let j = 0; j <= ws; j++) {
        const lon = lon0 + (lon1 - lon0) * j / ws, co = Math.cos(lon), so = Math.sin(lon);
        let x = spow(cl, e1) * spow(co, e2), y = spow(sl, e1), z = spow(cl, e1) * spow(so, e2);
        let nx = spow(cl, 2 - e1) * spow(co, 2 - e2), ny = spow(sl, 2 - e1), nz = spow(cl, 2 - e1) * spow(so, 2 - e2);
        if (t) { const s = 1 + t * y; ny -= t * (nx * x + nz * z) / s; nx /= s; nz /= s; x *= s; z *= s; }
        nv.set(nx, ny, nz);
        if (nv.lengthSq() < 1e-14) nv.set(0, sl < 0 ? -1 : 1, 0);
        nv.normalize();
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
        nor[k * 3] = nv.x; nor[k * 3 + 1] = nv.y; nor[k * 3 + 2] = nv.z;
        uv[k * 2] = o.patch ? 1 - j / ws : j / ws; uv[k * 2 + 1] = i / hs;
        k++;
      }
    }
    const idx = [];
    const southPole = lat0 <= -HP + 1e-6, northPole = lat1 >= HP - 1e-6;
    for (let i = 0; i < hs; i++) for (let j = 0; j < ws; j++) {
      const p = i * (ws + 1) + j, q = p + ws + 1;
      if (!(i === 0 && southPole)) idx.push(p, q, p + 1);
      if (!(i === hs - 1 && northPole)) idx.push(q, q + 1, p + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  // Point + normal on a shell {a,b,c,e1,e2,t,cy} at (lat, lon).
  function sqPt(P, lat, lon) {
    const cl = Math.max(0, Math.cos(lat)), sl = Math.sin(lat), co = Math.cos(lon), so = Math.sin(lon), t = P.t || 0;
    let x = spow(cl, P.e1) * spow(co, P.e2), y = spow(sl, P.e1), z = spow(cl, P.e1) * spow(so, P.e2);
    let nx = spow(cl, 2 - P.e1) * spow(co, 2 - P.e2), ny = spow(sl, 2 - P.e1), nz = spow(cl, 2 - P.e1) * spow(so, 2 - P.e2);
    if (t) { const s = 1 + t * y; ny -= t * (nx * x + nz * z) / s; nx /= s; nz /= s; x *= s; z *= s; }
    const n = new V3(nx / P.a, ny / P.b, nz / P.c).normalize();
    return { p: new V3(x * P.a, y * P.b + (P.cy || 0), z * P.c), n };
  }

  // Segment scale for the primitives below: 1 normally; < 1 only while a far-LOD twin of a part is baked (withSeg),
  // which rebuilds the same part from the same builder with fewer segments (cache keys carry the real counts, so the
  // full-detail entries are never touched). Floors keep every shape recognisable.
  let SEGK = 1;
  const sg = (n, min) => (SEGK === 1 ? n : Math.max(Math.min(n, min), Math.round(n * SEGK)));
  function withSeg(k, fn) { const o = SEGK; SEGK = k; try { return fn(); } finally { SEGK = o; } }
  const U = {
    sq: (e1, e2, t, ws, hs) => { ws = sg(ws || 18, 6); hs = sg(hs || 12, 4); return cg(`sq|${e1}|${e2}|${t || 0}|${ws}|${hs}`, () => sqGeo(e1, e2, { taper: t, ws, hs })); },
    sph: (ws, hs) => U.sq(1, 1, 0, ws || 14, hs || 10),
    cyl: (top, rs, open) => { rs = sg(rs || 12, 5); return cg(`cyl|${top}|${rs}|${open ? 1 : 0}`, () => new THREE.CylinderGeometry(top, 1, 1, rs, 1, !!open)); },
    tor: (tube, rs, ts, arc) => { rs = sg(rs || 6, 3); ts = sg(ts || 18, arc && arc < TAU - 0.01 ? 4 : 7); return cg(`tor|${rq(tube)}|${rs}|${ts}|${rq(arc || TAU)}`, () => new THREE.TorusGeometry(1, rq(tube), rs, ts, arc || TAU)); },
    cone: rs => { rs = sg(rs || 10, 5); return cg('cone|' + rs, () => new THREE.ConeGeometry(1, 1, rs)); },
    cap: (r, len, rs, cs) => { rs = sg(rs || 8, 5); cs = SEGK === 1 ? (cs || 2) : Math.max(1, Math.round((cs || 2) * SEGK)); return cg(`cap|${rq(r)}|${rq(len)}|${rs}|${cs}`, () => new THREE.CapsuleGeometry(rq(r), rq(len), cs, rs)); },
    box: () => cg('box', () => new THREE.BoxGeometry(1, 1, 1)),
    plane: () => cg('plane', () => new THREE.PlaneGeometry(1, 1)),
  };

  // Merge parts into one indexed vertex-coloured geometry. item: {g, c (hex), m (Matrix4), o {grad, bright,
  // keepColor, em (hex static self-glow), ei, core (weak-spot glow mask)}, bone (skin index)}
  // grad: vertical gradient (bottom darker, top lighter) in the part's own space — the jelly/toy look.
  // bk {glow: true} adds the vec4 'glow' attribute (rgb static emissive, a = core mask) read by charMat;
  // bk {bones: true} adds a 1-float 'skinIndex' (rigid skinning: each vertex follows exactly one part).
  const _col = new THREE.Color(), _emc = new THREE.Color();
  const GB = { glow: true };
  function bake(items, bk) {
    const GL = !!(bk && bk.glow), BN = !!(bk && bk.bones);
    let nv = 0, ni = 0;
    for (const it of items) { nv += it.g.attributes.position.count; ni += it.g.index ? it.g.index.count : it.g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
    const glw = GL ? new Float32Array(nv * 4) : null, skn = BN ? new Float32Array(nv) : null;
    const idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
    const v = new V3(), nm = new THREE.Matrix3();
    let vo = 0, io = 0;
    for (const it of items) {
      const g = it.g, P = g.attributes.position, N = g.attributes.normal, o = it.o || {};
      const KC = o.keepColor ? g.attributes.color : null; // re-bake already-coloured geometry (LOD)
      const KG = GL && o.keepColor ? g.attributes.glow : null;
      nm.getNormalMatrix(it.m);
      _col.set(it.c);
      let er = 0, eg = 0, eb = 0;
      if (GL && o.em != null) { _emc.set(o.em); const k = o.ei != null ? o.ei : 1; er = _emc.r * k; eg = _emc.g * k; eb = _emc.b * k; }
      const cm = o.core ? 1 : 0, bone = it.bone || 0;
      const br = o.bright || 1;
      let y0 = 0, y1 = 1;
      if (o.grad) { if (!g.boundingBox) g.computeBoundingBox(); y0 = g.boundingBox.min.y; y1 = g.boundingBox.max.y; }
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        let f = br;
        if (o.grad) f *= 1 - o.grad + 2 * o.grad * clamp((v.y - y0) / ((y1 - y0) || 1), 0, 1);
        v.applyMatrix4(it.m);
        const w = (vo + i) * 3;
        pos[w] = v.x; pos[w + 1] = v.y; pos[w + 2] = v.z;
        if (N) v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); else v.set(0, 1, 0);
        nor[w] = v.x; nor[w + 1] = v.y; nor[w + 2] = v.z;
        if (KC) { col[w] = KC.getX(i); col[w + 1] = KC.getY(i); col[w + 2] = KC.getZ(i); }
        else { col[w] = _col.r * f; col[w + 1] = _col.g * f; col[w + 2] = _col.b * f; }
        if (GL) {
          const q = (vo + i) * 4;
          if (KG) { glw[q] = KG.getX(i); glw[q + 1] = KG.getY(i); glw[q + 2] = KG.getZ(i); glw[q + 3] = KG.getW(i); }
          else { glw[q] = er; glw[q + 1] = eg; glw[q + 2] = eb; glw[q + 3] = cm; }
        }
        if (BN) skn[vo + i] = bone;
      }
      const flip = it.m.determinant() < 0;
      const I = g.index ? g.index.array : null, cnt = I ? I.length : P.count;
      for (let i = 0; i < cnt; i += 3) {
        const a = I ? I[i] : i, b = I ? I[i + 1] : i + 1, c = I ? I[i + 2] : i + 2;
        idx[io++] = a + vo;
        if (flip) { idx[io++] = c + vo; idx[io++] = b + vo; } else { idx[io++] = b + vo; idx[io++] = c + vo; }
      }
      vo += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (GL) out.setAttribute('glow', new THREE.BufferAttribute(glw, 4));
    if (BN) out.setAttribute('skinIndex', new THREE.BufferAttribute(skn, 1));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p3 = new V3(), _s3 = new V3();
  const AX_Y = new V3(0, 1, 0), AX_Z = new V3(0, 0, 1);
  function mat4(p, r, s) {
    _q.identity();
    if (r) _q.setFromEuler(_e.set(r[0] || 0, r[1] || 0, r[2] || 0, r[3] || 'XYZ'));
    if (s == null) _s3.set(1, 1, 1); else if (typeof s === 'number') _s3.set(s, s, s); else _s3.set(s[0], s[1], s[2]);
    _p3.set(p ? p[0] : 0, p ? p[1] : 0, p ? p[2] : 0);
    return new THREE.Matrix4().compose(_p3, _q, _s3);
  }
  const arr = v => (Array.isArray(v) ? v : [v.x, v.y, v.z]);
  function kit() {
    const items = [];
    const k = {
      items,
      add(g, c, p, r, s, o) { items.push({ g, c, m: mat4(p, r, s), o }); return k; },
      addM(g, c, m, o) { items.push({ g, c, m, o }); return k; },
      // Cylinder (radius r) from a to b.
      bone(c, a, b, r, o, rs) {
        const A = new V3().fromArray(arr(a)), B = new V3().fromArray(arr(b)), d = B.clone().sub(A), len = d.length() || 1e-4;
        const q = new THREE.Quaternion().setFromUnitVectors(AX_Y, d.multiplyScalar(1 / len));
        items.push({ g: U.cyl(1, rs || 8), c, m: new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new V3(r, len, r)), o });
        return k;
      },
      // Place g with its local `axis` ('y' | 'z') along normal n at p, extra spin about that axis.
      orient(g, c, p, n, axis, s, o, spin) {
        const q = new THREE.Quaternion().setFromUnitVectors(axis === 'z' ? AX_Z : AX_Y, new V3().fromArray(arr(n)).normalize());
        if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(axis === 'z' ? AX_Z : AX_Y, spin));
        const sc = s == null ? new V3(1, 1, 1) : typeof s === 'number' ? new V3(s, s, s) : new V3(s[0], s[1], s[2]);
        items.push({ g, c, m: new THREE.Matrix4().compose(new V3().fromArray(arr(p)), q, sc), o });
        return k;
      },
      build(bk) { return bake(items, bk); },
    };
    return k;
  }
  // Shell = superellipsoid with half extents (a,b,c) centred at y=cy.
  function addShell(k, P, color, seg, o) {
    return k.add(U.sq(P.e1, P.e2, P.t || 0, seg ? seg[0] : 20, seg ? seg[1] : 14), color, [0, P.cy || 0, 0], null, [P.a, P.b, P.c], o);
  }
  // Torus hugging a round shell (e2 = 1) at latitude lat.
  function addBand(k, P, lat, color, tube, grow) {
    const pt = sqPt(P, lat, 0);
    const R = Math.max(0.01, pt.p.x * (grow || 1));
    return k.add(U.tor(tube / R, 4, 20), color, [0, pt.p.y, 0], [HP, 0, 0], R);
  }
  function helixCurve(r, y0, y1, turns) {
    const c = new THREE.Curve();
    c.getPoint = function (t, out) { const a = t * turns * TAU; return (out || new V3()).set(Math.cos(a) * r, lerp(y0, y1, t), Math.sin(a) * r); };
    return c;
  }
  function starShape(ro, ri, n) {
    const sh = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) {
      const a = HP + i * PI / n, r = i % 2 ? ri : ro;
      if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    sh.closePath();
    return sh;
  }
  const heartGeo = () => cg('heart', () => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.95); sh.bezierCurveTo(-0.45, -0.55, -1.05, -0.15, -0.95, 0.35); sh.bezierCurveTo(-0.85, 0.85, -0.25, 0.95, 0, 0.5);
    sh.bezierCurveTo(0.25, 0.95, 0.85, 0.85, 0.95, 0.35); sh.bezierCurveTo(1.05, -0.15, 0.45, -0.55, 0, -0.95);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 1, curveSegments: 3 }).translate(0, 0, -0.125);
  });
  const starGeo = () => cg('star5', () => new THREE.ExtrudeGeometry(starShape(1, 0.45, 5), { depth: 0.25, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 1 }).translate(0, 0, -0.125));
  // Flat slab from a top-view outline [[x,z],...] (thickness along y, centred).
  function slabGeo(pts, thick, bev) {
    const key = 'slab|' + pts.map(p => p.map(rq).join(',')).join(';') + '|' + thick + '|' + bev;
    return cg(key, () => {
      const sh = new THREE.Shape();
      pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 4 });
      g.rotateX(HP); g.translate(0, thick / 2, 0);
      return g;
    });
  }
  // Flame/jet cone pointing -Z from the origin: RGBA vertex colours, a white-hot core inside a coloured
  // sheath, both fading out toward the tip (alpha-blended so it also reads against bright skies).
  function flameGeo(color) {
    color = hexOf(color != null ? color : 0xffb03a);
    return cg('flame|' + color, () => {
      const g = new THREE.CylinderGeometry(1, 0.14, 1, 12, 3, true).translate(0, -0.5, 0).rotateX(HP);
      const inner = new THREE.CylinderGeometry(0.52, 0.06, 0.62, 10, 2, true).translate(0, -0.31, 0).rotateX(HP);
      const c0 = new THREE.Color(color), cw = new THREE.Color(0xffffff).lerp(c0, 0.25);
      const paint = (geo, len, col, a0) => {
        const p = geo.attributes.position, c = [];
        for (let i = 0; i < p.count; i++) { const f = clamp(1 + p.getZ(i) / len, 0, 1); const c2 = col.clone().lerp(cw, f * f * 0.35); c.push(c2.r, c2.g, c2.b, a0 * Math.pow(f, 1.4)); }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 4));
      };
      paint(g, 1, c0, 0.8); paint(inner, 0.62, cw, 1);
      const out = mergeRaw([g, inner]);
      g.dispose(); inner.dispose();
      return out;
    });
  }
  // Merge geometries keeping their own colour attribute (used for glow geometry).
  function mergeRaw(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 4), idx = new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) {
      const P = g.attributes.position, C = g.attributes.color;
      for (let i = 0; i < P.count; i++) {
        pos.set([P.getX(i), P.getY(i), P.getZ(i)], (vo + i) * 3);
        col.set(C ? [C.getX(i), C.getY(i), C.getZ(i), C.itemSize === 4 ? C.getW(i) : 1] : [1, 1, 1, 1], (vo + i) * 4);
      }
      const I = g.index ? g.index.array : null, cnt = I ? I.length : P.count;
      for (let i = 0; i < cnt; i++) idx[io++] = (I ? I[i] : i) + vo;
      vo += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 4));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  // Flame material: unlit, RGBA vertex colours. Shared; ships clone it to modulate opacity on boost.
  let FLAME_MAT = null;
  function flameMat() {
    if (!FLAME_MAT) {
      FLAME_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
      FLAME_MAT.forceSinglePass = true;   // r159 draws transparent double-sided meshes twice otherwise
      FLAME_MAT.userData.shared = true;
    }
    return FLAME_MAT;
  }
  const flame = color => { const m = new THREE.Mesh(flameGeo(color), flameMat()); m.name = 'flame'; m.renderOrder = 3; return m; };
  const vcMatShared = () => G.M.toon(0xffffff, { vc: true, spec: 0.7, rimStr: 0.45 });
  const jellyMat = () => G.M.toon(0xffffff, { vc: true, spec: 0.95, rimStr: 0.6, rimPow: 2.4 });

  // ------------------------------------------------------------------ batched characters (draw-call budget)
  // A robot / humanoid renders ALL its vertex-coloured parts as ONE skinned mesh whose "bones" are the
  // existing part groups (rigid skinning, one bone per vertex). Animating a part group (rotation, scale,
  // position) moves its vertices exactly like a child mesh would, and part.visible = false collapses that
  // part (and its sub-parts). Material = charMat: the house soft-toon shading (same maths as G.M.toon)
  // + a per-vertex 'glow' attribute: rgb = static self-glow (coil, crown, stars), a = weak-spot mask lit by
  // mat.core (the battery core pulses for telegraphs without its own mesh). mat.emissive = whole-body flash.
  const CH_VS = [
    '#include <common>', '#include <color_pars_vertex>', '#include <fog_pars_vertex>', '#include <skinning_pars_vertex>',
    'attribute vec4 glow; varying vec4 vGlow;',
    'varying vec3 vWN; varying vec3 vWP; varying vec3 vVN; varying vec3 vVP;',
    'void main(){',
    '  #include <color_vertex>',
    '  vGlow = glow;',
    '  vec3 objectNormal = normal; vec4 lp = vec4(position, 1.0);',
    '  #ifdef USE_SKINNING',
    '    mat4 skm = bindMatrixInverse * getBoneMatrix(skinIndex.x) * bindMatrix;',
    '    lp = skm * lp; objectNormal = mat3(skm) * objectNormal;',
    '  #endif',
    '  #ifdef USE_INSTANCING',
    '    lp = instanceMatrix * lp; objectNormal = mat3(instanceMatrix) * objectNormal;',
    '  #endif',
    '  vec4 wp = modelMatrix * lp; vWP = wp.xyz;',
    '  vWN = normalize(mat3(modelMatrix) * objectNormal);',
    '  vec4 mvPosition = viewMatrix * wp; vVP = -mvPosition.xyz;',
    '  vVN = normalize(mat3(viewMatrix) * vWN);',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'].join('\n');
  const CH_FS = [
    'uniform vec3 uColor, uEmissive, uCore, uSunDir, uSunCol, uSky, uGround, uShadow, uRimCol, uEdgeCol;',
    'uniform float uShadowK, uExposure, uRim, uRimPow, uOpacity, uSpec, uBand, uEdge;',
    '#include <common>', '#include <color_pars_fragment>', '#include <fog_pars_fragment>',
    'varying vec4 vGlow;',
    'varying vec3 vWN; varying vec3 vWP; varying vec3 vVN; varying vec3 vVP;',
    '#include <mr_sunshadow_pars_fragment>',
    'void main(){',
    '  #ifdef SUN_SHADOW',
    '    if (uShadowPass > 0.5) { gl_FragColor = vec4(1.0); return; }',
    '  #endif',
    '  vec3 albedo = uColor;',
    '  #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )',
    '    albedo *= vColor.rgb;',
    '  #endif',
    '  vec3 n = normalize(vWN) * (gl_FrontFacing ? 1.0 : -1.0);',
    '  float ndl = dot(n, uSunDir);',
    '  float d = clamp((ndl + 0.4) / 1.4, 0.0, 1.0);',
    '  float band = smoothstep(0.42 - uBand, 0.42 + uBand, d);',
    '  float lit = mix(band, d, 0.3);',
    '  vec3 shadeMul = mix(vec3(1.0), uShadow, uShadowK);',
    // Ultra sun shadows, received the way the house toon shader does (04_render TOON_FS): a cast shadow lowers the
    // light term to the same cool toon shade as a side turned from the sun, keeps the colours lively, and takes the
    // sun's glint with it
    '  float shV = 1.0;',
    '  #ifdef SUN_SHADOW',
    '    float shCast = 0.0;',
    '    if (uSunOn > 0.0 && d > 0.12) { shV = mix(1.0, sunVis(vWP, n, ndl), uSunOn * smoothstep(0.12, 0.3, d)); shCast = lit * (1.0 - shV); lit *= shV; }',
    '    shadeMul = mix(shadeMul, vec3(dot(shadeMul, vec3(0.3333))), 0.35 * shCast);',
    '  #endif',
    '  vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5);',
    '  vec3 col = albedo * amb * mix(shadeMul, uSunCol, lit) * uExposure;',
    '  #ifdef SUN_SHADOW',
    '    if (shCast > 0.0) { float cl = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(col, max(mix(vec3(cl), col, 1.5), 0.0), shCast); }',
    '  #endif',
    '  vec3 vdir = normalize(cameraPosition - vWP);',
    '  float rim = pow(1.0 - max(dot(n, vdir), 0.0), uRimPow) * uRim;',
    '  col += uRimCol * rim * (0.35 + 0.65 * lit);',
    '  if (uSpec > 0.0) { vec3 h = normalize(uSunDir + vdir); float sp = smoothstep(0.90, 0.95, pow(max(dot(n, h), 0.0), 40.0)); col += vec3(sp * uSpec * shV); }',
    // soft plum ink edge at the silhouette (GDD §2.5 outlines, no extra draw call): grazing angles fade toward a dark
    // plum, a little stronger when the ambient ground light is warm (sand / rust biomes, where orange bots blend in)
    '  float fres = 1.0 - max(dot(n, vdir), 0.0), warm = clamp((uGround.r - uGround.b) * 1.6, 0.0, 1.0);',
    '  float edge = smoothstep(0.52, 0.9, fres) * uEdge * (1.0 + 0.45 * warm);',
    '  col = mix(col, uEdgeCol * (0.75 + 0.25 * amb), clamp(edge, 0.0, 0.88));',
    // the battery core glows a little brighter under warm light, where it would otherwise sink into the orange
    '  col += uEmissive + vGlow.rgb + vGlow.a * uCore * (1.0 + 0.3 * warm);',
    '  gl_FragColor = vec4(col, uOpacity);',
    '  #include <colorspace_fragment>',
    '  #include <fog_fragment>',
    '}'].join('\n');
  // Per-character material (uncached, so flash/telegraph stay per robot). o {spec, rimStr, rimPow, rimColor,
  // transparent, opacity, side, edge (silhouette ink 0..1), edgeColor}. Accessors like G.M.toon: .color .emissive .opacityU,
  // plus .core (weak-spot glow) and .edge (ink strength).
  const EDGE_PLUM = 0x3b2466;
  function charMat(o) {
    o = o || {};
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(uniforms, G.R.light, {
      uColor: { value: new THREE.Color(0xffffff) }, uEmissive: { value: new THREE.Color(0x000000) }, uCore: { value: new THREE.Color(0x000000) },
      uRim: { value: o.rimStr != null ? o.rimStr : 0.45 }, uRimPow: { value: o.rimPow != null ? o.rimPow : 3.0 },
      uOpacity: { value: o.opacity != null ? o.opacity : 1 }, uSpec: { value: o.spec != null ? o.spec : 0.7 }, uBand: { value: 0.1 },
      uEdge: { value: o.edge != null ? o.edge : 0.62 }, uEdgeCol: { value: new THREE.Color(o.edgeColor != null ? o.edgeColor : EDGE_PLUM) },
    });
    if (o.rimColor != null) uniforms.uRimCol = { value: new THREE.Color(o.rimColor) };
    // tier defines as currently compiled (SUN_SHADOW on Ultra); userData.tierDefs lets G.R.syncToon keep them in line
    const m = new THREE.ShaderMaterial({
      uniforms, vertexShader: CH_VS, fragmentShader: CH_FS, vertexColors: true, fog: true, lights: false,
      transparent: !!o.transparent, depthWrite: !o.transparent, side: o.side || THREE.FrontSide,
      defines: G.R.toonDefines ? G.R.toonDefines() : {},
    });
    m.defaultAttributeValues = { color: [1, 1, 1], uv: [0, 0], uv1: [0, 0], glow: [0, 0, 0, 0] };
    Object.defineProperty(m, 'color', { get: () => uniforms.uColor.value });
    Object.defineProperty(m, 'emissive', { get: () => uniforms.uEmissive.value });
    Object.defineProperty(m, 'core', { get: () => uniforms.uCore.value });
    Object.defineProperty(m, 'opacityU', { get: () => uniforms.uOpacity.value, set: v => { uniforms.uOpacity.value = v; } });
    Object.defineProperty(m, 'edge', { get: () => uniforms.uEdge.value, set: v => { uniforms.uEdge.value = v; } });
    m.userData.toon = true; m.userData.charMat = true; m.userData.tierDefs = true;
    return m;
  }
  Geo.charMat = charMat;
  // Skinning needs WebGL2-style bone textures (three r159); otherwise parts become one merged mesh per part group.
  function skinOK() {
    if (Geo.SKINNING === false) return false;
    const r = G.R && G.R.renderer, c = r && r.capabilities;
    return !!(c && c.isWebGL2 && c.floatVertexTextures);
  }
  const I4 = new THREE.Matrix4(), _skm = new THREE.Matrix4();
  // Skeleton.update replacement: a hidden part (or a part under a hidden part) collapses to one point.
  function skelUpdate(par, hid) {
    return function () {
      const b = this.bones, inv = this.boneInverses, a = this.boneMatrices;
      for (let i = 0; i < b.length; i++) {
        const h = hid[i] = (!b[i].visible || (par[i] >= 0 && hid[par[i]] === 1)) ? 1 : 0;
        if (h) { a.fill(0, i * 16, i * 16 + 15); a[i * 16 + 15] = 1; } else { _skm.multiplyMatrices(b[i].matrixWorld, inv[i]); _skm.toArray(a, i * 16); }
      }
      if (this.boneTexture !== null) this.boneTexture.needsUpdate = true;
    };
  }
  function depthOf(o) { let d = 0; for (let q = o.parent; q; q = q.parent) d++; return d; }
  // Batch pieces [{node, g (baked with glow, in node space), m?}] into one mesh under `host` (bind pose = the
  // current pose; the whole tree must sit at the world origin). Geometry is cached by key, so every
  // instance of a spec shares one GPU buffer. o {cull: false, grow}. Returns {key, geo, mesh, skeleton, bones, nodeMeshes}.
  function assemble(key, pieces, host, mat, o) {
    o = o || {};
    let top = host; while (top.parent) top = top.parent;
    top.updateMatrixWorld(true);
    const bones = [];
    for (const p of pieces) if (p.g && bones.indexOf(p.node) < 0) bones.push(p.node);
    const dep = bones.map(depthOf);
    const order = bones.map((b, i) => i).sort((a, b) => dep[a] - dep[b] || a - b);
    const sorted = order.map(i => bones[i]);
    const inv = new THREE.Matrix4().copy(host.matrixWorld).invert();
    // bind-pose placement of every piece (kept: the far-LOD twins are baked later, when the rig may be animating)
    const placed = [];
    for (const p of pieces) if (p.g) placed.push({ g: p.g, lo: p.lo || null, m: new THREE.Matrix4().multiplyMatrices(inv, p.node.matrixWorld).multiply(p.m || I4), bone: sorted.indexOf(p.node) });
    const geo = cg(key + '|skin', () => {
      const g = bake(placed.map(q => ({ g: q.g, c: 0xffffff, m: q.m, o: { keepColor: true }, bone: q.bone })), { glow: true, bones: true });
      g.computeBoundingBox();
      return g;
    });
    const A = { key, geo, mesh: null, skeleton: null, bones: sorted, nodeMeshes: null, par: null, placed };
    A.par = sorted.map(b => { for (let q = b.parent; q; q = q.parent) { const i = sorted.indexOf(q); if (i >= 0) return i; } return -1; });
    if (skinOK()) {
      const mesh = new THREE.SkinnedMesh(geo, mat);
      mesh.name = 'parts';
      host.add(mesh);
      mesh.updateMatrixWorld(true);
      const sk = new THREE.Skeleton(sorted);
      mesh.bind(sk, mesh.matrixWorld);
      sk.update = skelUpdate(A.par, new Uint8Array(sorted.length));
      const bs = geo.boundingSphere.clone(); bs.radius = bs.radius * (o.grow || 1.35) + 0.08;
      mesh.boundingSphere = bs;
      mesh.boundingBox = geo.boundingBox.clone().expandByScalar(bs.radius * 0.3);
      mesh.frustumCulled = o.cull !== false;
      A.mesh = mesh; A.skeleton = sk;
    } else {
      A.nodeMeshes = sorted.map((node, i) => {
        const g = cg(key + '|node' + i, () => bake(pieces.filter(p => p.g && p.node === node).map(p => ({ g: p.g, c: 0xffffff, m: p.m || I4, o: { keepColor: true } })), GB));
        const m = new THREE.Mesh(g, mat); m.name = 'part'; node.add(m);
        return m;
      });
    }
    return A;
  }
  // Bitmask of parts that are hidden right now (bit i = bone i hidden, inherited from hidden ancestors).
  function hiddenMask(A) {
    let mask = 0;
    const b = A.bones;
    for (let i = 0; i < b.length && i < 31; i++) if (!b[i].visible || (A.par[i] >= 0 && (mask & (1 << A.par[i])))) mask |= 1 << i;
    return mask;
  }
  // Far-LOD levels: segment scale of the reduced twins (LOD1 from L0 = 30 / 22 / 18 m, LOD2 beyond ~60 m). LOD1 uses the
  // same 0.7 twin as the animated mid level below, so the mid -> LOD1 swap changes only the pose (limbs already eased
  // to rest) and never the shape; LOD2 (~8 px tall robots) the coarser 0.45 one.
  const LOD_SEG = [1, 0.7, 0.45];
  // Mid level (still the animated rig): beyond Enemy._lod's resolution-aware mid distance (a robot body ~22 px in
  // radius) the skinned twin at 0.7 replaces the full skin — same skeleton, same animation, ~60–70 % of the triangles;
  // a 13-segment silhouette is within a pixel of the 18-segment one at that size (side-by-side checked, polish_lod.js).
  const MID_SEG = 0.7;
  Geo.LOD_SEG = LOD_SEG; Geo.MID_SEG = MID_SEG;
  // The bind-pose skin at segment scale segK: 1 = the rig's own geometry; < 1 = every piece's reduced twin (pieces
  // without one, e.g. attachments without a reduced builder, keep their geometry), same placement and part indices.
  function skinAt(A, segK) {
    if (!(segK < 1) || !A.placed) return A.geo;
    return cg(A.key + '|skin|lo' + segK, () => {
      const g = bake(A.placed.map(q => ({ g: (q.lo && q.lo(segK)) || q.g, c: 0xffffff, m: q.m, o: { keepColor: true }, bone: q.bone })), { glow: true, bones: true });
      g.computeBoundingBox();
      return g;
    });
  }
  // Static far-LOD geometry: the bind-pose skin of level lv minus hidden parts (+ an optional baked face/screen item).
  function lodGeo(A, mask, extra, lv) {
    const segK = LOD_SEG[lv | 0] || 1;
    return cg(A.key + '|lod|' + mask + (extra ? '|' + extra.key : '') + (segK < 1 ? '|L' + segK : ''), () => {
      const src = skinAt(A, segK), I = src.index.array, S = src.attributes.skinIndex.array, keep = [];
      for (let i = 0; i < I.length; i += 3) if (!(mask & (1 << S[I[i]]))) keep.push(I[i], I[i + 1], I[i + 2]);
      const tmp = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'color', 'glow']) tmp.setAttribute(k, src.attributes[k]);
      tmp.setIndex(keep);
      const items = [{ g: tmp, c: 0xffffff, m: I4, o: { keepColor: true } }];
      if (extra) items.push(extra.item);
      return bake(items, GB);
    });
  }
  Geo._assemble = assemble;

  // ------------------------------------------------------------------ shared per-scene layers
  // Blob shadows and additive glow sprites of every character in a scene draw as TWO instanced meshes.
  // The original shadow mesh / Sprite stays in the character tree as a "proxy" (moved to layer 31 so the
  // camera skips it): code may keep moving, scaling, hiding, recolouring it; each frame (scene.onBeforeRender,
  // after matrices are updated) the layer copies every attached + visible proxy into its instance buffers.
  const PROXY_LAYER = 31;
  function sceneOf(x) { return x && x.isScene ? x : x && x.scene && x.scene.isScene ? x.scene : null; }
  function chainState(o, scene) { // 0 detached, 1 hidden, 2 visible
    let vis = true;
    for (let p = o; p; p = p.parent) { if (!p.visible) vis = false; if (p === scene) return vis ? 2 : 1; }
    return 0;
  }
  let GLOW_MAT = null, GLOW_GEO = null;
  function growInst(F, which, need) {
    const cur = F[which];
    if (cur && cur.userData.cap >= need) return cur;
    let cap = 32; while (cap < need) cap *= 2;
    let m;
    if (which === 'sh') {
      const tmp = G.R.blobShadow(1);
      m = new THREE.InstancedMesh(tmp.geometry, tmp.material, cap);
      m.renderOrder = 1; m.name = 'charShadows';
    } else {
      if (!GLOW_MAT) {
        GLOW_MAT = new THREE.MeshBasicMaterial({ map: G.R.glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        GLOW_MAT.userData.shared = true;
        GLOW_GEO = new THREE.PlaneGeometry(1, 1); GLOW_GEO.userData.shared = true;
      }
      m = new THREE.InstancedMesh(GLOW_GEO, GLOW_MAT, cap);
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      m.name = 'charGlows';
    }
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false; m.count = 0; m.visible = false; m.userData.cap = cap;
    if (cur) {
      m.instanceMatrix.array.set(cur.instanceMatrix.array);   // keep the instances already written this frame
      if (cur.instanceColor && m.instanceColor) m.instanceColor.array.set(cur.instanceColor.array);
      if (cur.parent) cur.parent.remove(cur);
      cur.dispose();
    }
    F.scene.add(m);
    F[which] = m;
    return m;
  }
  const _cx = new V3(), _cy = new V3(), _cz = new V3();
  // Small insertion set over a plain array: the per-frame layer loops are index loops (Set iteration allocates
  // an iterator + result objects per step on some JITs = GC churn at 60 fps). Removal swaps with the last item.
  function aset() {
    const a = [];
    return { a, get size() { return a.length; }, has: o => a.indexOf(o) >= 0, add(o) { if (a.indexOf(o) < 0) a.push(o); return this; },
      delete(o) { const i = a.indexOf(o); if (i < 0) return false; a[i] = a[a.length - 1]; a.pop(); return true; } };
  }
  Geo._aset = aset;
  function fxUpdate(F, camera) {
    let n = 0;
    const SH = F.shadows.a, GL = F.glows.a;
    // backwards: release() swap-removes, and the item swapped in from the end was already visited
    for (let i = SH.length - 1; i >= 0; i--) {
      const o = SH[i];
      const st = chainState(o, F.scene);
      if (st === 0) { release(F, o); continue; }
      if (st === 1) continue;
      const m = growInst(F, 'sh', n + 1);
      o.matrixWorld.toArray(m.instanceMatrix.array, n * 16);
      n++;
    }
    if (F.sh) { F.sh.count = n; F.sh.visible = n > 0; if (n) F.sh.instanceMatrix.needsUpdate = true; }
    n = 0;
    const ce = camera.matrixWorld.elements;
    _cx.set(ce[0], ce[1], ce[2]).normalize(); _cy.set(ce[4], ce[5], ce[6]).normalize(); _cz.set(ce[8], ce[9], ce[10]).normalize();
    for (let i = GL.length - 1; i >= 0; i--) {
      const o = GL[i];
      const st = chainState(o, F.scene);
      if (st === 0) { release(F, o); continue; }
      const mt = o.material;
      if (st === 1 || !mt || !(mt.opacity > 0.004)) continue;
      const m = growInst(F, 'gl', n + 1);
      const e = o.matrixWorld.elements, a = m.instanceMatrix.array, k = n * 16;
      const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]);
      a[k] = _cx.x * sx; a[k + 1] = _cx.y * sx; a[k + 2] = _cx.z * sx; a[k + 3] = 0;
      a[k + 4] = _cy.x * sy; a[k + 5] = _cy.y * sy; a[k + 6] = _cy.z * sy; a[k + 7] = 0;
      a[k + 8] = _cz.x; a[k + 9] = _cz.y; a[k + 10] = _cz.z; a[k + 11] = 0;
      a[k + 12] = e[12]; a[k + 13] = e[13]; a[k + 14] = e[14]; a[k + 15] = 1;
      const c = mt.color, op = mt.opacity, ca = m.instanceColor.array;
      ca[n * 3] = c.r * op; ca[n * 3 + 1] = c.g * op; ca[n * 3 + 2] = c.b * op;
      n++;
    }
    if (F.gl) { F.gl.count = n; F.gl.visible = n > 0; if (n) { F.gl.instanceMatrix.needsUpdate = true; F.gl.instanceColor.needsUpdate = true; } }
    for (let i = 0; i < F.hooks.length; i++) F.hooks[i](camera, F);
  }
  function release(F, o) { F.shadows.delete(o); F.glows.delete(o); o.layers.set(0); if (o.userData.chFx === F) o.userData.chFx = null; }
  function sceneFx(scene) {
    let F = scene.userData.chFx;
    if (F) return F;
    F = scene.userData.chFx = { scene, shadows: aset(), glows: aset(), hooks: [], sh: null, gl: null };
    const prev = scene.onBeforeRender;
    scene.onBeforeRender = function (renderer, sc, camera, rt) {
      if (prev) prev.call(this, renderer, sc, camera, rt);
      if (sc === scene) fxUpdate(F, camera);
    };
    prewarm(scene);
    return F;
  }
  // Compile the static (far-LOD) charMat program once per scene setup, so the first robot that crosses
  // the LOD distance mid-fight does not hitch. The material is kept alive so three keeps the program cached.
  let PRE = null;
  function prewarm(scene) {
    const r = G.R && G.R.renderer;
    if (!r || !r.compile || !G.R.camera || (G.R.isLost && G.R.isLost())) return;
    G.safe('char prewarm', () => {
      if (!PRE) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
        g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(9), 3));
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3));
        g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(12), 4));
        g.userData.shared = true;
        const m = charMat(); m.userData.shared = true;
        PRE = { scene: new THREE.Scene(), mesh: new THREE.Mesh(g, m) };
        PRE.scene.add(PRE.mesh);
      }
      // Its program carries the tier define (SUN_SHADOW on Ultra), so also park a hidden copy in the scene itself:
      // G.R.syncToon then sets the define the load ends up with (an auto-Ultra switch at the first load included) and
      // the load warm-up draws it. The early compile below gets the define the tier has now.
      const pm = PRE.mesh.material, sun = !!(G.R.toonFeatures && G.R.toonFeatures().sun);
      if (sun !== ('SUN_SHADOW' in pm.defines)) { if (sun) pm.defines.SUN_SHADOW = ''; else delete pm.defines.SUN_SHADOW; pm.needsUpdate = true; }
      if (scene.isScene) { const park = new THREE.Mesh(PRE.mesh.geometry, pm); park.name = 'charPrewarm'; park.visible = false; park.frustumCulled = false; scene.add(park); }
      r.compile(PRE.scene, G.R.camera, scene);
    });
  }
  const isBlob = o => o.isMesh && o.material && o.material === G.M._blobMat;
  const isGlow = o => o.isSprite && o.material && o.material.map && o.material.map === G.R._glow && o.material.blending === THREE.AdditiveBlending;
  // Move every blob shadow and glow sprite under obj into its scene's shared layers. obj must already be in a
  // scene (or pass the scene/world). Idempotent; returns true when adopted.
  Geo.useLayers = function (obj, where) {
    let scene = sceneOf(where);
    if (!scene) { let r = obj; while (r.parent) r = r.parent; scene = r.isScene ? r : null; }
    if (!scene || !obj) return false;
    const F = sceneFx(scene);
    obj.traverse(o => {
      const sh = isBlob(o), gl = !sh && isGlow(o);
      if (!sh && !gl) return;
      (sh ? F.shadows : F.glows).add(o);
      o.layers.set(PROXY_LAYER); o.userData.chFx = F;
    });
    return true;
  };
  // Create a scene's shared shadow / glow batches now (count 0, hidden) — called for every new World while its mode is
  // still loading (G.World.created), so the load warm-up compiles and uploads them instead of the first frames of play.
  Geo.prepareScene = function (where) {
    const sc = sceneOf(where); if (!sc) return null;
    const F = sceneFx(sc);
    growInst(F, 'sh', 1); growInst(F, 'gl', 1);
    return F;
  };
  if (G.World && Array.isArray(G.World.created)) G.World.created.push(w => G.safe('chars prepare', () => Geo.prepareScene(w)));
  // Register fn(camera, F) to run each frame right before `scene` renders (after world matrices update).
  Geo.onSceneRender = function (where, fn) { const sc = sceneOf(where); if (!sc) return null; const F = sceneFx(sc); F.hooks.push(fn); return F; };
  Geo.offSceneRender = function (where, fn) { const sc = sceneOf(where); const F = sc && sc.userData.chFx; if (F) { const i = F.hooks.indexOf(fn); if (i >= 0) F.hooks.splice(i, 1); } };
  // Cheap per-frame check used by the animate functions: adopt once per scene the character lands in.
  function autoLayers(c) {
    const sh = c.parts.shadow;
    let r = c.group; while (r.parent) r = r.parent;
    if (!r.isScene) return;
    const F = r.userData.chFx;
    if (F && sh && sh.userData.chFx === F) return;
    Geo.useLayers(c.group, r);
  }
  Geo.autoLayers = autoLayers;

  // ------------------------------------------------------------------ faces
  const FACES = new Map();
  // 'focused' = the wind-up face: wide determined eyes under flat (never slanted) brow lines + a pink accent.
  const EXPRS = ['idle', 'happy', 'angry', 'hurt', 'dizzy', 'sleep', 'alert', 'chomp', 'scared', 'wink', 'blink', 'focused'];
  Geo.FACE_EXPRS = EXPRS.slice(0, 10).concat(['focused']);
  Geo.face = function (expr, opts) {
    opts = opts || {};
    const ex = EXPRS.indexOf(expr) >= 0 ? expr : 'idle';
    const style = opts.style === 'toon' ? 'toon' : 'led';
    const key = [ex, style, opts.color, opts.eyes, opts.screen, opts.mouth, opts.blush, opts.screenColor].join('|');
    let tex = FACES.get(key);
    if (!tex) {
      tex = G.R.canvasTex(128, 128, g => (style === 'toon' ? drawToonFace : drawLedFace)(g, ex, opts));
      tex.userData.shared = true;
      FACES.set(key, tex);
    }
    return tex;
  };
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function zig(g, cx, cy, hw, amp) { for (let i = 0; i <= 4; i++) { const x = cx - hw + hw * i / 2, y = cy + (i % 2 ? -amp : amp); if (i) g.lineTo(x, y); else g.moveTo(x, y); } }
  function spiral(g, cx, cy, s, dir) {
    for (let a = 0, i = 0; a <= 4.2 * PI; a += 0.25, i++) {
      const r = (1 + a * 1.25) * s, x = cx + Math.cos(a * dir) * r, y = cy + Math.sin(a * dir) * r;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
  }
  function zzz(g, col) {
    g.save(); g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 3.5; g.lineCap = g.lineJoin = 'round';
    const Z = (x, y, s) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x + s, y + s); g.stroke(); };
    Z(92, 22, 12); Z(108, 8, 8); g.restore();
  }
  function drawLedFace(g, ex, o) {
    const col = css(o.color != null ? o.color : 0x5cf2ff);
    const eyes = o.eyes === 'one' || o.eyes === 'visor' ? o.eyes : 'two';
    const visor = eyes === 'visor';
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.screen !== false) {
      const sc = o.screenColor != null ? o.screenColor : 0x2a1b3d;
      const grd = g.createLinearGradient(0, 10, 0, 118);
      grd.addColorStop(0, css(shade(sc, 1.3))); grd.addColorStop(1, css(shade(sc, 0.6)));
      g.fillStyle = grd;
      if (visor) rr(g, 4, 34, 120, 62, 31);
      else if (eyes === 'one') { g.beginPath(); g.arc(64, 62, 54, 0, TAU); }
      else rr(g, 6, 12, 116, 102, 32);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; g.stroke();
      g.save(); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.11)';
      g.beginPath(); g.ellipse(38, visor ? 44 : 28, 48, 15, -0.3, 0, TAU); g.fill();
      g.restore();
    }
    const pts = eyes === 'one' ? [[64, 60, 0]] : visor ? [[38, 65, -1], [90, 65, 1]] : [[40, 56, -1], [88, 56, 1]];
    const s = eyes === 'one' ? 1.75 : 1;
    g.shadowColor = col; g.shadowBlur = 16; g.fillStyle = col; g.strokeStyle = col;
    for (const p of pts) ledEye(g, ex, p[0], p[1], p[2], s, visor);
    const mouth = o.mouth !== false && !visor;
    if (mouth) ledMouth(g, ex, eyes === 'one' ? 101 : 90, eyes === 'one' ? 0.8 : 1);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.6)'; g.strokeStyle = 'rgba(255,255,255,0.6)';
    HI = true;
    for (const p of pts) { g.save(); g.translate(p[0], p[1]); g.scale(0.5, 0.5); g.translate(-p[0], -p[1]); ledEye(g, ex, p[0], p[1], p[2], s, visor); g.restore(); }
    HI = false;
    if (ex === 'focused' && eyes === 'two' && !visor && hexOf(o.color != null ? o.color : 0x5cf2ff) !== TELE_PINK) {
      // pink accent: two soft cheek dashes (the telegraph face is all pink already)
      g.fillStyle = 'rgba(255,111,170,0.85)'; rr(g, 16, 76, 16, 6, 3); g.fill(); rr(g, 96, 76, 16, 6, 3); g.fill();
    }
    if (ex === 'sleep') zzz(g, col);
    if (ex === 'alert') { // "!" pop (GDD: alert = yellow LEDs + "!")
      g.save(); g.shadowColor = col; g.shadowBlur = 10; g.fillStyle = col;
      rr(g, 105, visor ? 6 : 4, 10, visor ? 20 : 22, 5); g.fill(); g.beginPath(); g.arc(110, visor ? 32 : 33, 5, 0, TAU); g.fill(); g.restore();
    }
  }
  let HI = false;   // drawing the small white highlight pass of an LED eye
  const TELE_PINK = 0xff3f8e;
  function ledEye(g, ex, cx, cy, side, s, visor) {
    const inner = side === 0 ? 0 : -side;
    if (ex === 'wink') ex = side > 0 || side === 0 ? 'happy' : 'idle';
    g.beginPath();
    switch (ex) {
      case 'blink': g.lineWidth = 6 * s; g.moveTo(cx - 11 * s, cy); g.lineTo(cx + 11 * s, cy); g.stroke(); return;
      case 'sleep': g.lineWidth = 6 * s; g.arc(cx, cy - 7 * s, 11 * s, 0.18 * PI, 0.82 * PI); g.stroke(); return;
      case 'happy': case 'chomp': g.lineWidth = 7 * s; g.arc(cx, cy + 7 * s, 12 * s, 1.15 * PI, 1.85 * PI); g.stroke(); return;
      case 'angry': {
        const w = (visor ? 13 : 9) * s, h = (visor ? 8 : 12) * s;
        if (side === 0) { g.moveTo(cx - w * 1.3, cy - h); g.lineTo(cx, cy - h * 0.15); g.lineTo(cx + w * 1.3, cy - h); g.lineTo(cx + w * 1.1, cy + h); g.lineTo(cx - w * 1.1, cy + h); }
        else { g.moveTo(cx - inner * w, cy - h); g.lineTo(cx + inner * w, cy - h * 0.1); g.lineTo(cx + inner * w, cy + h); g.lineTo(cx - inner * w, cy + h); }
        g.closePath(); g.lineWidth = 5 * s; g.fill(); g.stroke(); return;
      }
      case 'hurt':
        g.lineWidth = 7 * s;
        if (side === 0) { g.moveTo(cx - 9 * s, cy - 9 * s); g.lineTo(cx + 9 * s, cy + 9 * s); g.moveTo(cx + 9 * s, cy - 9 * s); g.lineTo(cx - 9 * s, cy + 9 * s); }
        else { g.moveTo(cx - inner * 8 * s, cy - 10 * s); g.lineTo(cx + inner * 8 * s, cy); g.lineTo(cx - inner * 8 * s, cy + 10 * s); }
        g.stroke(); return;
      case 'dizzy': g.lineWidth = 4 * s; spiral(g, cx, cy, s, side < 0 ? -1 : 1); g.stroke(); return;
      case 'alert': g.lineWidth = 5 * s; g.arc(cx, cy, 12 * s, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cy, 4.5 * s, 0, TAU); g.fill(); return;
      case 'focused': {
        // wide, round, determined eyes; the brow is a level dash (focus), never a slanted angry brow
        const w = (visor ? 15 : side === 0 ? 13 : 11) * s, h = (visor ? 9.5 : side === 0 ? 13 : 14.5) * s;
        rr(g, cx - w, cy - h + 2 * s, 2 * w, 2 * h, Math.min(w, h) * 0.95); g.fill();
        if (!HI) { g.beginPath(); g.lineWidth = 4.5 * s; g.moveTo(cx - w * 0.85, cy - h - 5 * s); g.lineTo(cx + w * 0.85, cy - h - 5 * s); g.stroke(); }
        return;
      }
      case 'scared': g.arc(cx + inner * 2 * s, cy + 2 * s, 6 * s, 0, TAU); g.fill(); return;
      default:
        if (visor) rr(g, cx - 13 * s, cy - 7 * s, 26 * s, 14 * s, 7 * s); else rr(g, cx - 8 * s, cy - 13 * s, 16 * s, 26 * s, 8 * s);
        g.fill();
    }
  }
  function ledMouth(g, ex, y, s) {
    g.beginPath(); g.lineWidth = 5 * s;
    switch (ex) {
      case 'happy': case 'wink': g.arc(64, y - 9 * s, 12 * s, 0.2 * PI, 0.8 * PI); g.stroke(); break;
      case 'chomp': rr(g, 64 - 17 * s, y - 9 * s, 34 * s, 21 * s, 8 * s); g.stroke(); g.beginPath(); g.lineWidth = 3 * s; g.moveTo(64 - 11 * s, y + 1 * s); g.lineTo(64 + 11 * s, y + 1 * s); g.stroke(); break;
      case 'scared': case 'hurt': case 'dizzy': zig(g, 64, y, 15 * s, 3.5 * s); g.stroke(); break;
      case 'alert': g.arc(64, y, 5 * s, 0, TAU); g.stroke(); break;
      case 'focused': g.moveTo(64 - 9 * s, y - 1 * s); g.quadraticCurveTo(64, y + 4 * s, 64 + 9 * s, y - 1 * s); g.stroke(); break;   // small, sure smile
      case 'sleep': g.arc(64, y, 3.5 * s, 0, TAU); g.stroke(); break;
      default: break;
    }
  }
  function drawToonFace(g, ex, o) {
    const ec = css(o.color != null ? o.color : 0x2a1b3d);
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.blush !== false && ex !== 'angry' && ex !== 'scared') {
      g.fillStyle = 'rgba(255,111,160,0.55)'; ell(g, 21, 84, 12, 7.5); g.fill(); ell(g, 107, 84, 12, 7.5); g.fill();
    }
    toonEye(g, ex, 42, 58, -1, ec); toonEye(g, ex, 86, 58, 1, ec);
    if (o.mouth !== false) toonMouth(g, ex, ec);
    if (ex === 'sleep') zzz(g, ec);
    if (ex === 'scared') { g.fillStyle = '#8fdcff'; g.beginPath(); g.moveTo(110, 28); g.quadraticCurveTo(118, 42, 110, 46); g.quadraticCurveTo(102, 42, 110, 28); g.fill(); }
  }
  function toonEye(g, ex, cx, cy, side, ec) {
    const inner = -side;
    if (ex === 'wink') ex = side > 0 ? 'happy' : 'idle';
    g.fillStyle = ec; g.strokeStyle = ec; g.beginPath();
    switch (ex) {
      case 'blink': g.lineWidth = 5.5; g.arc(cx, cy - 2, 10, 0.15 * PI, 0.85 * PI); g.stroke(); return;
      case 'sleep': g.lineWidth = 5.5; g.arc(cx, cy - 5, 10, 0.15 * PI, 0.85 * PI); g.stroke(); return;
      case 'happy': case 'chomp': g.lineWidth = 6.5; g.arc(cx, cy + 8, 11, 1.15 * PI, 1.85 * PI); g.stroke(); return;
      case 'hurt': g.lineWidth = 6.5; g.moveTo(cx - inner * 8, cy - 9); g.lineTo(cx + inner * 7, cy); g.lineTo(cx - inner * 8, cy + 9); g.stroke(); return;
      case 'dizzy': g.lineWidth = 4; spiral(g, cx, cy, 1, side < 0 ? -1 : 1); g.stroke(); return;
      case 'focused': {
        // big bright eyes looking straight ahead, a level little brow above each (determined, friendly)
        g.fillStyle = '#ffffff'; ell(g, cx, cy, 13.5, 16); g.fill(); g.lineWidth = 3; g.stroke();
        g.fillStyle = ec; ell(g, cx + inner * 1.5, cy + 1.5, 8.5, 10); g.fill();
        g.fillStyle = '#ffffff'; ell(g, cx + 3, cy - 3, 3, 3); g.fill(); ell(g, cx - 2.5, cy + 5, 1.5, 1.5); g.fill();
        g.beginPath(); g.lineWidth = 4.5; g.strokeStyle = ec; g.moveTo(cx - 10, cy - 23); g.lineTo(cx + 10, cy - 23); g.stroke();
        return;
      }
      case 'alert': case 'scared': {
        const big = ex === 'alert';
        g.fillStyle = '#ffffff'; ell(g, cx, cy, 13, 16); g.fill(); g.lineWidth = 3; g.stroke();
        g.fillStyle = ec; ell(g, cx + (big ? 0 : inner), cy + (big ? 2 : 4), big ? 7 : 4.5, big ? 8.5 : 5.5); g.fill();
        g.fillStyle = '#ffffff'; ell(g, cx + 2.5, cy - 1, 2.2, 2.2); g.fill();
        if (!big) { g.beginPath(); g.lineWidth = 4; g.moveTo(cx - inner * 12, cy - 19); g.lineTo(cx + inner * 9, cy - 25); g.stroke(); }
        return;
      }
      case 'angry': {
        ell(g, cx, cy + 2, 11, 14); g.fill();
        g.save(); g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.moveTo(cx - inner * 16, cy - 22); g.lineTo(cx + inner * 16, cy - 22); g.lineTo(cx + inner * 16, cy); g.lineTo(cx - inner * 16, cy - 13); g.closePath(); g.fill();
        g.restore();
        g.fillStyle = '#ffffff'; ell(g, cx + 3, cy + 6, 2.6, 2.6); g.fill();
        g.beginPath(); g.lineWidth = 5.5; g.moveTo(cx - inner * 14, cy - 19); g.lineTo(cx + inner * 12, cy - 6); g.stroke();
        return;
      }
      default:
        ell(g, cx, cy, 11, 15); g.fill();
        g.fillStyle = '#ffffff'; ell(g, cx + 4, cy - 6, 4.6, 4.6); g.fill(); ell(g, cx - 3.5, cy + 6, 2.2, 2.2); g.fill();
    }
  }
  function toonMouth(g, ex, ec) {
    g.beginPath(); g.lineWidth = 4; g.fillStyle = ec; g.strokeStyle = ec;
    switch (ex) {
      case 'happy': case 'wink':
        g.moveTo(51, 80); g.arc(64, 80, 13, 0, PI); g.closePath(); g.fill();
        g.fillStyle = '#ff7aa8'; ell(g, 64, 88, 6.5, 3.5); g.fill(); break;
      case 'chomp': ell(g, 64, 88, 15, 14); g.fill(); g.fillStyle = '#ff7aa8'; ell(g, 64, 96, 9, 4.5); g.fill(); break;
      case 'angry': g.arc(64, 98, 9, 1.2 * PI, 1.8 * PI); g.stroke(); break;
      case 'hurt': case 'dizzy': case 'scared': g.lineWidth = 3.5; zig(g, 64, 88, 11, 3); g.stroke(); break;
      case 'sleep': g.lineWidth = 3; ell(g, 64, 86, 3.5, 4); g.stroke(); break;
      case 'alert': ell(g, 64, 87, 5, 6.5); g.fill(); break;
      case 'focused': g.lineWidth = 4; g.moveTo(55, 84); g.quadraticCurveTo(64, 90, 73, 84); g.stroke(); break;
      default: g.arc(64, 75, 8, 0.2 * PI, 0.8 * PI); g.stroke();
    }
  }
  function faceMat(tex) {
    const m = new THREE.MeshBasicMaterial({ map: tex || null, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    return m;
  }
  // Curved face decal hugging a shell P {a,b,c,e1,e2,t,cy}; F {latC, w (lon span), h (lat span)}.
  function facePatch(P, F, mat, grow) {
    const geo = cg(`fp|${P.e1}|${P.e2}|${P.t || 0}|${rq(F.latC)}|${rq(F.w)}|${rq(F.h)}`,
      () => sqGeo(P.e1, P.e2, { taper: P.t, lat0: F.latC - F.h / 2, lat1: F.latC + F.h / 2, lon0: HP - F.w / 2, lon1: HP + F.w / 2, patch: true, ws: 8, hs: 6 }));
    const m = new THREE.Mesh(geo, mat);
    const gr = grow || 1.018;
    m.scale.set(P.a * gr, P.b * gr, P.c * gr);
    m.position.y = P.cy || 0;
    m.renderOrder = 2;
    m.name = 'face';
    return m;
  }
  function facePlane(w, h, mat) {
    const m = new THREE.Mesh(U.plane(), mat);
    m.scale.set(w, h, 1); m.renderOrder = 2; m.name = 'face';
    return m;
  }

  // Hop squash & stretch keyframes (research: anticipation 0.75, launch 1.3, land 0.7, wobble).
  const HOP_K = [[0, 1], [0.12, 0.74], [0.2, 1.3], [0.45, 1.02], [0.7, 1.16], [0.78, 0.7], [0.88, 1.12], [0.95, 0.97], [1, 1]];
  const _hop = { y: 0, sy: 1, air: false };
  function hopCurve(p) {
    p = clamp(p, 0, 1);
    let sy = 1;
    for (let i = 1; i < HOP_K.length; i++) {
      if (p <= HOP_K[i][0]) { const a = HOP_K[i - 1], b = HOP_K[i], u = (p - a[0]) / (b[0] - a[0]); sy = lerp(a[1], b[1], u * u * (3 - 2 * u)); break; }
    }
    const y = p > 0.2 && p < 0.78 ? Math.sin(PI * (p - 0.2) / 0.58) : 0;
    _hop.y = y; _hop.sy = sy; _hop.air = y > 0;
    return _hop;
  }
  Geo.hopCurve = p => Object.assign({}, hopCurve(p));
  function squash(obj, sy, base) {
    const sx = 1 / Math.sqrt(Math.max(0.05, sy)), b = base || 1;
    obj.scale.set(sx * b, sy * b, sx * b);
  }

  Geo.countTris = function (obj) {
    let meshes = 0, tris = 0;
    obj.traverse(o => {
      if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; }
      else if (o.isSprite) meshes++;
    });
    return { meshes, tris: Math.round(tris) };
  };

  // ------------------------------------------------------------------ robots
  // Defaults follow the GDD Gizmob livery: candy orange, brass trim, plum joints, cyan idle LEDs,
  // yellow battery weak spot, deep-plum visor screen.
  const GIZ = Geo.GIZMOB = { orange: 0xff7a3d, plum: 0x5b3a8c, brass: 0xe8b44a, visor: 0x2a1b3d, idle: 0x5cffe1, alert: 0xffd23f, windup: 0xff3f8e, battery: 0xffd23f, gold: 0xffc21a, bubble: 0x9fe8ff, goo: 0x9be15d, elec: 0x7af0ff, cream: 0xfff1dc };
  const RDEF = { body: 'sphere', size: 1.2, color: GIZ.orange, accent: GIZ.brass, metal: GIZ.plum, eyes: 'led2', eyeColor: GIZ.idle, coreColor: null, screenColor: null, mobility: 'legs2', arms: 'none', armL: null, armR: null, antenna: false, back: 'none', armor: 0, emblem: null, shieldEmblem: null, stripes: false, deco: null, elite: false, boss: false, seed: 1 };
  const RKEYS = Object.keys(RDEF);
  const TIRE = 0x2b2f5e, TELE = GIZ.windup;
  function normSpec(spec) {
    const s = {};
    for (const k of RKEYS) s[k] = spec && spec[k] != null ? spec[k] : RDEF[k];
    if (s.coreColor == null) s.coreColor = GIZ.battery;
    s.armor = clamp(+s.armor || 0, 0, 1);
    s.boss = !!s.boss; s.elite = !!s.elite;
    if (s.elite) { s.accent = GIZ.gold; if (!s.antenna || s.antenna === true) s.antenna = 'crown'; }
    return s;
  }
  function armKinds(s) {
    let L = 'none', R = 'none', cannon = 0;
    switch (s.arms) {
      case 'blaster': R = 'blaster'; L = s.boss ? 'blaster' : 'mitt'; break;
      case 'rifle': R = 'rifle'; L = 'mitt'; break;
      case 'claw': L = R = 'claw'; break;
      case 'saw': R = 'saw'; L = s.boss ? 'saw' : 'mitt'; break;
      case 'hammer': R = 'hammer'; L = s.boss ? 'hammer' : 'mitt'; break;
      case 'shield': L = 'shield'; R = 'blaster'; break;
      case 'cannon': cannon = s.boss ? 2 : 1; if (s.mobility !== 'none' && s.mobility !== 'tripod') L = R = 'mitt'; break;
      case 'fist': L = R = 'fist'; break;
      default: break;
    }
    if (s.armL) L = s.armL;
    if (s.armR) R = s.armR;
    return { L, R, cannon };
  }
  // All numbers in unit-height model space (scaled by spec.size). y is relative to the body origin
  // (hip line) unless noted.
  function layout(s) {
    const L = {};
    const mob = s.mobility;
    const legH = { legs2: 0.3, legs4: 0.26, spider: 0.3, tripod: 0.32, wheel: 0.36, tread: 0.2, hover: 0.26, prop: 0.02, copter: 0.12, hop: 0.27, ball: 0, none: 0.17 }[mob];
    L.legH = legH != null ? legH : 0.3;
    const H0 = 1 - L.legH - (mob === 'prop' || mob === 'copter' ? 0.16 : 0);
    let S, Hd = null;
    switch (s.body) {
      case 'egg': { const R = H0 / 2; S = { a: R * 0.86, b: R, c: R * 0.84, e1: 1, e2: 1, t: -0.16, cy: R }; L.face = { latC: 0.3, w: 1.45, h: 1.05 }; L.coreLat = -0.42; break; }
      case 'capsule': { const R = H0 / 2; S = { a: R * 0.62, b: R, c: R * 0.58, e1: 0.6, e2: 1, t: 0, cy: R }; L.face = { latC: 0.45, w: 1.7, h: 0.82 }; L.coreLat = -0.18; break; }
      case 'box': {
        const tb = H0 * 0.25;
        S = { a: 0.3, b: tb, c: 0.23, e1: 0.35, e2: 0.35, t: 0, cy: tb };
        Hd = { a: 0.29, b: H0 * 0.21, c: 0.25, e1: 0.3, e2: 0.3, t: 0 }; Hd.cy = Hd.b + 0.02;
        L.neck = 2 * tb; L.facePlane = { w: Hd.a * 1.62, h: Hd.b * 1.66 };
        break;
      }
      case 'barrel': {
        const tb = H0 * 0.3;
        S = { a: 0.27, b: tb, c: 0.27, e1: 0.3, e2: 1, t: 0, cy: tb };
        Hd = { a: 0.24, b: 0.22, c: 0.24, e1: 1, e2: 1, t: 0, cy: 0.01 };
        L.neck = 2 * tb - 0.03; L.face = { latC: 0.5, w: 1.55, h: 0.9 };
        break;
      }
      case 'disc': {
        S = { a: 0.5, b: 0.12, c: 0.5, e1: 0.55, e2: 1, t: 0, cy: 0.12 };
        Hd = { a: 0.3, b: 0.27, c: 0.3, e1: 1, e2: 1, t: 0, cy: 0.0 };
        L.neck = 0.17; L.face = { latC: 0.4, w: 1.55, h: 1.0 };
        break;
      }
      default: { const R = H0 / 2; S = { a: R * 1.05, b: R, c: R, e1: 1, e2: 1, t: 0, cy: R }; L.face = { latC: 0.14, w: 1.5, h: 1.2 }; L.coreLat = -0.5; }
    }
    L.shell = S; L.head = Hd; L.compact = !Hd;
    L.headY = Hd ? L.neck : S.cy;                     // head group origin (body space)
    L.headTop = Hd ? Hd.cy + Hd.b : S.b;               // top of head (head space)
    L.faceP = Hd ? Hd : Object.assign({}, S, { cy: 0 }); // shell the face sits on (head space)
    // face centre height in head space
    if (L.facePlane) L.faceY = Hd.cy; else L.faceY = sqPt(L.faceP, L.face.latC, HP).p.y;
    L.faceZ = L.facePlane ? Hd.c : sqPt(L.faceP, L.face.latC, HP).p.z;
    if (s.body === 'disc') L.shoulder = [S.a * 0.55, S.cy - 0.03, S.c * 0.5]; // crab claws at the front rim
    else if (s.body === 'box' || s.body === 'barrel') L.shoulder = [S.a + 0.035, S.cy + S.b * 0.42, 0];
    else L.shoulder = [S.a * 0.98, S.cy - S.b * 0.08, 0];
    L.armLen = s.arms === 'fist' ? 0.44 : s.boss ? 0.36 : 0.33;
    if (s.body === 'box' || s.body === 'barrel') { L.core = new V3(0, S.cy - S.b * 0.12, S.c + 0.005); L.coreN = new V3(0, 0, 1); }
    else if (s.body === 'disc') { const q = sqPt(S, -0.45, HP); L.core = q.p; L.coreN = q.n; }
    else { const q = sqPt(S, L.coreLat, HP); L.core = q.p; L.coreN = q.n; }
    L.coreR = s.boss ? 0.05 : 0.058;
    if (s.body === 'box' || s.body === 'barrel') { L.back = new V3(0, S.cy + 0.03, -S.c); L.backN = new V3(0, 0, -1); }
    else if (s.body === 'disc') { const q = sqPt(S, 0.5, -HP); L.back = q.p; L.backN = q.n; }
    else { const q = sqPt(S, 0.12, -HP); L.back = q.p; L.backN = q.n; }
    L.hipX = clamp(S.a * 0.48, 0.1, 0.2);
    L.wheelR = 0.18;
    const spread = mob === 'spider' ? 0.55 : mob === 'tripod' ? 0.45 : mob === 'legs4' ? 0.15 : 0;
    L.shadowR = Math.max(S.a, S.c) + spread;
    return L;
  }

  function bodyGeo(s, L, ak) {
    const k = kit(), S = L.shell, B = s.boss;
    const seg = s.body === 'disc' ? (B ? [32, 12] : [20, 9]) : B ? [28, 18] : [18, 12];
    addShell(k, S, s.color, seg, { grad: 0.16 });
    const round = S.e2 === 1;
    // body-type trim
    if (s.body === 'sphere' || s.body === 'egg') { addBand(k, S, -0.08, s.metal, 0.016, 1.0); k.add(U.sph(10, 6), s.metal, [0, 0.03, 0], null, [S.a * 0.5, 0.05, S.c * 0.5]); }
    if (s.body === 'capsule') { addBand(k, S, -0.02, s.accent, 0.026, 1.0); k.add(U.sph(10, 6), s.metal, [0, 0.03, 0], null, [S.a * 0.62, 0.05, S.c * 0.62]); }
    if (s.body === 'barrel') {
      addBand(k, S, 1.25, s.accent, 0.03, 1.0); addBand(k, S, -1.3, s.accent, 0.03, 1.0);
      k.add(U.cyl(1, 16), s.metal, [0, 2 * S.b, 0], null, [S.a * 0.8, 0.03, S.a * 0.8]);
    }
    if (s.body === 'box') {
      k.add(U.sq(0.3, 0.3, 0, 12, 4), s.accent, [0, S.cy - S.b * 0.62, 0], null, [S.a * 1.04, 0.035, S.c * 1.06]);
      k.add(U.cyl(1, 10), s.metal, [0, 2 * S.b, 0], null, [0.075, 0.05, 0.075]);
      for (let i = -1; i <= 1; i++) k.add(U.box(), shade(s.color, 0.72), [i * 0.07, S.cy + S.b * 0.45, S.c * 0.99], null, [0.036, 0.06, 0.02]);
    }
    if (s.body === 'disc') {
      k.add(U.tor(0.035 / S.a, 4, B ? 40 : 24), s.accent, [0, S.cy, 0], [HP, 0, 0], S.a);
      const nL = B ? 10 : 5;
      for (let i = 0; i < nL; i++) { const a = HP + (i + 0.5) / nL * TAU; k.add(U.sph(5, 3), shade(s.eyeColor, 1.15), [Math.cos(a) * S.a * 1.03, S.cy, Math.sin(a) * S.a * 1.03], null, 0.028, { bright: 1.4 }); }
      k.add(U.cyl(0.7, 14), s.metal, [0, 0.0, 0], null, [S.a * 0.42, 0.06, S.a * 0.42]);
    }
    // hazard stripes (bee drones, ball bots) on round shells
    if (s.stripes && round && s.body !== 'disc') for (const lat of (s.body === 'barrel' ? [0.55, -0.1] : [0.5, 0.0, -0.5])) addBand(k, S, lat, s.metal, 0.034, 1.005);
    // core socket ring + the glowing battery itself (lit by mat.core through the glow mask)
    k.orient(U.tor(0.32, 4, 12), s.metal, L.core, L.coreN, 'z', L.coreR * 1.35);
    k.add(U.sph(9, 6), s.coreColor, arr(L.core.clone().addScaledVector(L.coreN, L.coreR * 0.35)), null, L.coreR, { core: true });
    if (s.deco === 'vending' && s.body === 'box') {
      // Vend-O-Titan front: snack window with soda cans + coin slot
      const z = S.c * 0.97;
      k.add(U.sq(0.3, 0.3, 0, 10, 4), GIZ.visor, [-0.07, S.cy + S.b * 0.25, z], null, [0.15, S.b * 0.5, 0.02]);
      const cans = [0xff5d73, 0x7af0ff, 0x9be15d, 0xffd23f, 0xb983ff, 0xff8a4c];
      for (let i = 0; i < 6; i++) k.add(U.cyl(1, 8), cans[i], [-0.17 + (i % 3) * 0.1, S.cy + S.b * (0.48 - Math.floor(i / 3) * 0.42), z + 0.01], null, [0.03, S.b * 0.32, 0.03], { bright: 1.1 });
      k.add(U.sq(0.4, 0.4, 0, 8, 4), GIZ.brass, [0.2, S.cy + S.b * 0.3, z], null, [0.045, S.b * 0.28, 0.02]);
      k.add(U.box(), GIZ.visor, [0.2, S.cy + S.b * 0.32, z + 0.02], null, [0.012, S.b * 0.32, 0.01]);
    }
    if (s.mobility === 'copter') {
      // tail boom + fin (tail rotor is a separate spinning mesh)
      k.bone(s.metal, [0, S.cy + S.b * 0.3, -S.c * 0.8], [0, S.cy + S.b * 0.5, -S.c - 0.42], 0.035);
      k.add(slabGeo([[0, 0], [0, -0.16], [0.16, -0.2], [0.14, -0.04]], 0.02, 0.01), s.accent, [0, S.cy + S.b * 0.5, -S.c - 0.3], [0, 0, HP]);
    }
    // emblem on the back (healer cross etc.)
    if (s.emblem) emblemInto(k, s.emblem, s.accent, L.back.clone().addScaledVector(L.backN, 0.01), L.backN, 0.09);
    // armor
    if (s.armor >= 0.3) {
      if (round && s.body !== 'disc') addBand(k, S, s.body === 'barrel' ? -0.6 : -0.3, s.accent, 0.03, 1.02);
      else if (s.body === 'box') k.add(U.sq(0.35, 0.35, 0, 8, 4), s.metal, [0, L.core.y, S.c * 0.96], null, [0.15, 0.11, 0.035]);
    }
    if (s.armor >= 0.55 && (ak.L !== 'none' || ak.R !== 'none')) {
      for (const sd of [-1, 1]) {
        k.add(U.sq(0.7, 1, 0, 10, 5), s.accent, [sd * (L.shoulder[0] - 0.01), L.shoulder[1] + 0.06, L.shoulder[2]], [0, 0, -sd * 0.35], [0.1, 0.06, 0.11], { grad: 0.1 });
        if (B) k.orient(U.cone(8), s.metal, [sd * (L.shoulder[0] + 0.02), L.shoulder[1] + 0.12, 0], [sd * 0.6, 1, 0], 'y', [0.035, 0.1, 0.035]);
      }
    }
    if (B) {
      const nS = 10;
      for (let i = 0; i < nS; i++) {
        const a = (i + 0.5) / nS * TAU;
        if (round) { const q = sqPt(S, -0.32, a); k.add(U.sph(6, 4), s.metal, arr(q.p), null, 0.018); }
      }
    }
    // back gear
    const bp = L.back, bn = L.backN;
    if (s.back === 'jet') {
      for (const sd of [-1, 1]) {
        const p = bp.clone().addScaledVector(bn, 0.05); p.x += sd * 0.1;
        k.add(U.cap(0.055, 0.16, 8), s.metal, arr(p));
        k.add(U.cyl(1.3, 8, true), s.accent, [p.x, p.y - 0.14, p.z], null, [0.045, 0.06, 0.045]);
      }
      k.add(U.box(), s.accent, arr(bp.clone().addScaledVector(bn, 0.02)), null, [0.24, 0.1, 0.05]);
    }
    if (s.back === 'tank') {
      const p = bp.clone().addScaledVector(bn, 0.08);
      k.add(U.cap(0.085, 0.14, 8), s.accent, arr(p), null, null, { grad: 0.12 });
      k.add(U.tor(0.22, 4, 10), s.metal, [p.x, p.y + 0.05, p.z], [HP, 0, 0], 0.088);
      k.add(U.tor(0.22, 4, 10), s.metal, [p.x, p.y - 0.05, p.z], [HP, 0, 0], 0.088);
      k.add(U.sph(6, 4), s.metal, [p.x, p.y + 0.17, p.z], null, 0.03);
    }
    if (s.back === 'spikes') {
      const n = B ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const lat = lerp(0.95, -0.05, i / (n - 1));
        const q = round || s.body === 'capsule' ? sqPt(S, lat, -HP) : { p: new V3(0, S.cy + S.b * lerp(1, 0.1, i / (n - 1)) , -S.c), n: new V3(0, lerp(0.8, 0.1, i / (n - 1)), -1).normalize() };
        k.orient(U.cone(8), GIZ.windup, arr(q.p.clone().addScaledVector(q.n, 0.03)), q.n, 'y', [0.05, 0.12 - i * 0.012, 0.05]);
        k.add(U.sph(6, 4), GIZ.windup, arr(q.p.clone().addScaledVector(q.n, 0.03 + (0.12 - i * 0.012) * 0.5)), null, 0.012);
      }
    }
    if (s.back === 'mortar') {
      const p = bp.clone().addScaledVector(bn, 0.08);
      k.add(U.sq(0.4, 0.4, 0, 8, 4), s.metal, [p.x, p.y - 0.02, p.z], null, [0.11, 0.07, 0.08]);
      k.add(U.cyl(0.85, 12, true), s.accent, [p.x, p.y + 0.12, p.z - 0.03], [-0.45, 0, 0], [0.085, 0.24, 0.085], { grad: 0.12 });
      k.add(U.tor(0.22, 4, 14), s.metal, [p.x, p.y + 0.23, p.z - 0.09], [HP - 0.45, 0, 0], 0.085);
      k.add(U.cyl(1, 10), GIZ.visor, [p.x, p.y + 0.235, p.z - 0.095], [-0.45, 0, 0], [0.065, 0.01, 0.065]);
    }
    if (s.back === 'missiles') {
      const p = bp.clone().addScaledVector(bn, 0.07);
      k.add(U.sq(0.35, 0.35, 0, 8, 4), s.metal, [p.x, p.y + 0.02, p.z], [-0.35, 0, 0], [0.15, 0.09, 0.075]);
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 ? 1 : -1) * 0.06 + (i < 2 ? 0 : 0) , z = p.z + (i < 2 ? 0.025 : -0.03);
        const y = p.y + 0.1 + (i < 2 ? 0 : 0.02);
        k.add(U.cyl(1, 8), 0xf3faff, [x, y, z], [-0.35, 0, 0], [0.028, 0.1, 0.028]);
        k.add(U.cone(8), 0xff5d73, [x, y + 0.08 * Math.cos(0.35), z + 0.08 * Math.sin(0.35)], [-0.35, 0, 0], [0.028, 0.06, 0.028]);
      }
    }
    // static mobility parts that live on the body (hover skirt is attached to the body bottom)
    if (s.mobility === 'hover') {
      k.add(U.cyl(1.5, 12), s.metal, [0, -0.04, 0], null, [0.12, 0.09, 0.12]);
      k.add(U.tor(0.2, 4, 16), s.accent, [0, -0.085, 0], [HP, 0, 0], 0.13);
    }
    return k.build(GB);
  }
  function emblemInto(k, kind, color, p, n, size) {
    const q = new THREE.Quaternion().setFromUnitVectors(AX_Z, n.clone().normalize());
    const put = (g, off, sc, rot) => {
      const m = new THREE.Matrix4().compose(p.clone().add(off.clone().applyQuaternion(q)), q.clone().multiply(new THREE.Quaternion().setFromEuler(_e.set(0, 0, rot || 0))), sc);
      k.addM(g, color, m);
    };
    if (kind === 'cross') { put(U.sq(0.4, 0.4, 0, 8, 6), new V3(), new V3(size * 0.32, size, size * 0.2)); put(U.sq(0.4, 0.4, 0, 8, 6), new V3(), new V3(size, size * 0.32, size * 0.2)); }
    else if (kind === 'star') put(starGeo(), new V3(), new V3(size, size, size * 0.5));
    else if (kind === 'heart') put(heartGeo(), new V3(), new V3(size, size, size * 0.5));
    else put(U.cyl(1, 6), new V3(), new V3(size * 0.8, size * 0.25, size * 0.8), 0); // bolt (hex nut)
  }
  function headGeo(s, L) {
    const k = kit(), Hd = L.head, B = s.boss;
    if (Hd) {
      addShell(k, Hd, s.body === 'disc' ? mixHex(s.color, 0xffffff, 0.35) : s.body === 'barrel' ? shade(s.color, 1.12) : s.color, B ? [24, 16] : [14, 10], { grad: 0.14 });
      if (s.body === 'box') {
        // screen bezel (face plane sits just in front of it) + ear bolts
        k.add(U.sq(0.3, 0.3, 0, 8, 4), s.metal, [0, Hd.cy, Hd.c - 0.006], null, [L.facePlane.w * 0.54, L.facePlane.h * 0.54, 0.012]);
        for (const sd of [-1, 1]) {
          k.add(U.cyl(1, 8), s.accent, [sd * (Hd.a + 0.012), Hd.cy, 0], [0, 0, HP], [0.06, 0.035, 0.06]);
          k.add(U.cyl(1, 6), s.metal, [sd * (Hd.a + 0.03), Hd.cy, 0], [0, 0, HP], [0.03, 0.02, 0.03]);
        }
      } else {
        // neck collar / dome ring
        k.add(U.tor(0.14, 4, 18), s.accent, [0, Hd.cy - Hd.b * 0.05, 0], [HP, 0, 0], Hd.a * 1.0);
      }
    }
    if (s.armor >= 0.8) {
      const P = L.faceP, top = L.headTop;
      k.add(U.sq(0.5, 1, 0, 8, 4), s.accent, [0, top - 0.01, 0], null, [0.025, 0.05, P.c * 0.75]);
      if (s.eyes !== 'toon') k.add(U.sq(0.5, 0.6, 0, 10, 4), s.metal, [0, L.faceY + (L.facePlane ? L.facePlane.h * 0.55 : 0.09), L.faceZ * 0.92], [0.15, 0, 0], [L.facePlane ? L.facePlane.w * 0.55 : P.a * 0.62, 0.025, 0.06]);
    }
    if (s.emblem && L.compact) emblemInto(k, s.emblem, s.accent, new V3(0, L.headTop + 0.005, 0), new V3(0, 1, 0.2), 0.08);
    if (s.deco === 'vending') {
      // Mox-style top hat with a brass band
      const top = L.headTop;
      k.add(U.cyl(1, 16), GIZ.visor, [0.03, top + 0.012, 0], [0, 0, -0.12], [0.2, 0.024, 0.2]);
      k.add(U.cyl(0.95, 16), GIZ.visor, [0.04, top + 0.12, 0], [0, 0, -0.12], [0.13, 0.2, 0.13], { grad: 0.2 });
      k.add(U.tor(0.14, 4, 16), GIZ.brass, [0.035, top + 0.06, 0], [HP, 0, -0.12], 0.13);
    }
    if (s.deco === 'hive') {
      // honeycomb crown
      const top = L.headTop;
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = i ? 0.13 : 0; const h = i ? 0.08 : 0.12; k.add(U.cyl(1, 6), i % 2 ? 0xffc21a : 0xffd45c, [Math.cos(a) * r, top + h * 0.5 - 0.01, Math.sin(a) * r], null, [0.07, h, 0.07], { grad: 0.15 }); }
    }
    return k.build(GB);
  }
  function armGeo(kind, s) {
    const k = kit(), B = s.boss;
    if (kind === 'fist') {
      const len = 0.44;
      k.add(U.sph(8, 6), s.accent, [0, 0, 0], null, 0.09);
      k.add(U.cap(0.06, len * 0.32, 7, 1), s.metal, [0, -len * 0.25, 0]);
      k.add(U.sq(0.7, 1, -0.25, 8, 5), s.color, [0, -len * 0.66, 0], null, [0.085, 0.13, 0.085], { grad: 0.12 });
      k.add(U.sq(0.6, 0.7, 0, 8, 5), s.accent, [0, -len, 0.01], null, [0.12, 0.1, 0.12], { grad: 0.12 });
      return k.build(GB);
    }
    const len = B ? 0.36 : 0.33;
    k.add(U.sph(8, 5), s.accent, [0, 0, 0], null, B ? 0.085 : 0.07);
    k.add(U.cap(B ? 0.055 : 0.044, len * 0.62, 6, 1), s.metal, [0, -len * 0.48, 0]);
    if (kind === 'mitt' || kind === 'hammer' || kind === 'shield') k.add(U.sph(9, 6), s.accent, [0, -len, 0], null, B ? [0.1, 0.095, 0.1] : [0.08, 0.075, 0.08], { grad: 0.1 });
    else k.add(U.cyl(0.85, 8), s.metal, [0, -len + 0.01, 0], null, [0.058, 0.05, 0.058]);
    if (kind === 'saw') { for (const sd of [-1, 1]) k.bone(s.metal, [sd * 0.035, -len, 0], [sd * 0.035, -len - 0.17, 0], 0.016); }
    return k.build(GB);
  }
  // Weapon space: origin at the wrist, pointing -Y (cannon: origin at the mount, pointing +Z).
  const MUZZLE = { blaster: [0, -0.31, 0], rifle: [0, -0.56, 0], claw: [0, -0.22, 0], saw: [0, 0, 0], hammer: [0, -0.42, 0], shield: [0, -0.1, 0], cannon: [0, 0, 0.46], mitt: [0, -0.05, 0] };
  function weaponGeo(kind, s, twin) {
    const k = kit(), mt = s.metal, ac = s.accent, co = s.color;
    switch (kind) {
      case 'blaster':
        k.add(U.sq(0.6, 1, 0, 12, 8), co, [0, -0.1, 0], null, [0.08, 0.13, 0.08], { grad: 0.12 });
        k.add(U.tor(0.3, 5, 12), ac, [0, -0.22, 0], [HP, 0, 0], 0.066);
        k.add(U.cyl(1, 8), mt, [0, -0.26, 0], null, [0.042, 0.1, 0.042]);
        k.add(U.sq(0.5, 0.5, 0, 6, 4), ac, [0, -0.1, 0.085], null, [0.02, 0.07, 0.03]);
        break;
      case 'rifle':
        k.add(U.sq(0.6, 1, 0, 10, 6), mt, [0, -0.08, 0], null, [0.062, 0.11, 0.066]);
        k.add(U.cyl(1, 8), co, [0, -0.33, 0], null, [0.027, 0.42, 0.027]);
        k.add(U.tor(0.35, 5, 10), ac, [0, -0.53, 0], [HP, 0, 0], 0.036);
        k.add(U.cyl(1, 8), ac, [0, -0.1, 0.085], null, [0.032, 0.17, 0.032]);
        k.add(U.sph(8, 6), shade(s.eyeColor, 1.2), [0, -0.19, 0.085], null, [0.026, 0.012, 0.026], { bright: 1.4 });
        break;
      case 'claw':
        k.add(U.sph(7, 5), ac, [0, -0.035, 0], null, 0.065);
        for (const sd of [-1, 1]) {
          k.bone(mt, [sd * 0.025, -0.05, 0], [sd * 0.075, -0.14, 0], 0.026);
          k.add(U.sph(5, 3), mt, [sd * 0.075, -0.14, 0], null, 0.026);
          k.bone(ac, [sd * 0.075, -0.14, 0], [sd * 0.022, -0.225, 0], 0.024);
          k.add(U.sph(5, 3), ac, [sd * 0.022, -0.225, 0], null, 0.024);
        }
        break;
      case 'saw': {
        const blade = 0xe3e9f7;
        k.add(U.cyl(1, 18), blade, [0, 0, 0], [0, 0, HP], [0.17, 0.022, 0.17]);
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; k.add(U.cone(4), blade, [0, Math.cos(a) * 0.18, Math.sin(a) * 0.18], [a + HP * 0.5, 0, 0], [0.012, 0.06, 0.03]); }
        k.add(U.cyl(1, 12), ac, [0, 0, 0], [0, 0, HP], [0.06, 0.05, 0.06]);
        k.add(U.cyl(1, 8), mt, [0, 0, 0], [0, 0, HP], [0.025, 0.08, 0.025]);
        break;
      }
      case 'hammer':
        k.add(U.cyl(1, 8), 0x8a5a3c, [0, -0.2, 0], null, [0.026, 0.42, 0.026]);
        k.add(U.sq(0.8, 0.45, 0, 12, 6), ac, [0, -0.43, 0], [0, 0, HP], [0.1, 0.17, 0.1], { grad: 0.1 });
        for (const sd of [-1, 1]) k.add(U.cyl(1, 12), mt, [sd * 0.165, -0.43, 0], [0, 0, HP], [0.1, 0.03, 0.1]);
        k.add(U.tor(0.2, 5, 12), co, [0, -0.43, 0], [0, HP, 0], 0.1);
        break;
      case 'shield':
        k.add(U.sq(0.45, 0.55, 0, 14, 8), co, [0, -0.04, 0], null, [0.27, 0.035, 0.34], { grad: 0.1 });
        k.add(U.sq(0.45, 0.55, 0, 10, 6), ac, [0, -0.07, 0], null, [0.2, 0.02, 0.26]);
        if (s.shieldEmblem) emblemInto(k, s.shieldEmblem, s.shieldEmblem === 'heart' ? 0xff5fa2 : 0xffffff, new V3(0, -0.095, 0), new V3(0, -1, 0), 0.13);
        else { k.add(U.cyl(1, 6), mt, [0, -0.09, 0], null, [0.075, 0.025, 0.075]); k.add(U.cyl(1, 12), shade(s.eyeColor, 1.1), [0, -0.1, 0], null, [0.03, 0.02, 0.03], { bright: 1.5 }); }
        break;
      case 'cannon': {
        k.add(U.sq(0.4, 0.4, 0, 8, 4), mt, [0, 0, -0.02], null, [0.11, 0.1, 0.13], { grad: 0.1 });
        const xs = twin ? [-0.055, 0.055] : [0];
        for (const x of xs) {
          k.add(U.cyl(0.9, 10), co, [x, 0, 0.24], [HP, 0, 0], [twin ? 0.05 : 0.075, 0.34, twin ? 0.05 : 0.075]);
          k.add(U.tor(0.3, 4, 10), ac, [x, 0, 0.41], null, twin ? 0.05 : 0.072);
        }
        k.add(U.sq(0.5, 0.5, 0, 8, 6), ac, [0.11, 0.04, -0.02], null, [0.02, 0.05, 0.09]);
        break;
      }
      default: return null;
    }
    return k.build(GB);
  }
  function legGeo(s, L) {
    const k = kit(), B = s.boss, h = L.legH;
    if (s.mobility === 'legs2') {
      k.add(U.cap(B ? 0.065 : 0.047, h * 0.52, 6, 1), s.metal, [0, -h * 0.42, 0]);
      k.add(U.sph(7, 5), s.accent, [0, -h * 0.45, 0.005], null, B ? 0.075 : 0.055);
      k.add(U.sq(0.5, 0.45, 0, 10, 5), s.accent, [0, -h + (B ? 0.06 : 0.045), 0.035], null, B ? [0.1, 0.06, 0.15] : [0.075, 0.046, 0.11], { grad: 0.12 });
    } else if (s.mobility === 'legs4') {
      k.add(U.cap(0.05, h * 0.45, 6, 1), s.metal, [0, -h * 0.45, 0]);
      k.add(U.sph(8, 5), s.accent, [0, -h + 0.045, 0.015], null, [0.07, 0.048, 0.08], { grad: 0.12 });
    } else if (s.mobility === 'spider' || s.mobility === 'tripod') {
      const knee = [0.2, 0.11, 0], foot = [0.36, -h + 0.03, 0];
      k.bone(s.metal, [0, 0, 0], knee, 0.032, null, 6);
      k.add(U.sph(6, 4), s.accent, knee, null, 0.048);
      k.bone(s.color, knee, foot, 0.028, null, 6);
      k.add(U.sph(6, 4), s.accent, foot, null, [0.04, 0.03, 0.04]);
    } else if (s.mobility === 'hop') {
      k.addM(cg('spring', () => new THREE.TubeGeometry(helixCurve(0.075, -0.02, -(h - 0.06), 4.5), 40, 0.014, 4, false)), s.metal, new THREE.Matrix4());
      k.add(U.sph(10, 5), s.accent, [0, -h + 0.035, 0], null, [0.11, 0.035, 0.11], { grad: 0.15 });
    }
    return k.build(GB);
  }
  // Static model-level base (wheel fork, turret pedestal).
  function baseGeo(s, L) {
    const k = kit(), h = L.legH, wr = L.wheelR;
    if (s.mobility === 'wheel') {
      for (const sd of [-1, 1]) k.add(U.sq(0.5, 0.5, 0, 8, 6), s.metal, [sd * 0.075, (h + wr) / 2 + 0.02, 0], null, [0.02, (h - wr) / 2 + 0.05, 0.045]);
      k.add(U.tor(0.035 / (wr + 0.03), 6, 18, PI), s.accent, [0, wr, 0], [0, HP, 0], wr + 0.03);
      k.add(U.cyl(1, 10), s.metal, [0, wr, 0], [0, 0, HP], [0.025, 0.17, 0.025]);
    } else if (s.mobility === 'copter') {
      const S = L.shell, w = Math.min(0.22, S.a * 0.7);
      for (const sd of [-1, 1]) {
        k.add(U.cap(0.022, 0.5, 6), s.metal, [sd * w, 0.025, 0.02], [HP, 0, 0]);
        k.bone(s.metal, [sd * w, 0.03, 0.12], [sd * w * 0.7, h + 0.03, 0.08], 0.016);
        k.bone(s.metal, [sd * w, 0.03, -0.1], [sd * w * 0.7, h + 0.03, -0.08], 0.016);
      }
    } else if (s.mobility === 'none') {
      k.add(U.cyl(1.25, 18), s.metal, [0, h * 0.5, 0], null, [0.2, h, 0.2], { grad: 0.2 });
      k.add(U.cyl(1, 22), shade(s.metal, 0.85), [0, 0.02, 0], null, [0.34, 0.04, 0.34]);
      k.add(U.tor(0.12, 6, 24), s.accent, [0, h - 0.01, 0], [HP, 0, 0], 0.2);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(U.sph(6, 4), s.accent, [Math.cos(a) * 0.28, 0.045, Math.sin(a) * 0.28], null, 0.022); }
    } else return null;
    return k.build(GB);
  }
  function wheelGeo(s, L) {
    const k = kit(), wr = L.wheelR;
    if (s.mobility === 'wheel') {
      k.add(U.tor(0.055 / (wr - 0.055), 8, 24), TIRE, [0, 0, 0], [0, HP, 0], wr - 0.055);
      k.add(U.cyl(1, 14), s.accent, [0, 0, 0], [0, 0, HP], [wr - 0.07, 0.07, wr - 0.07]);
      k.add(U.cyl(1, 10), s.metal, [0, 0, 0], [0, 0, HP], [0.04, 0.1, 0.04]);
      for (let i = 0; i < 3; i++) k.add(U.box(), shade(s.accent, 0.75), [0, 0, 0], [i / 3 * PI, 0, 0], [0.075, 0.03, wr * 1.6]);
    } else if (s.mobility === 'tread') {
      const S = L.shell, hx = Math.max(0.14, S.a * 0.72);
      for (const sd of [-1, 1]) {
        k.add(U.cap(0.1, 0.3, 12), TIRE, [sd * hx, 0.1, 0], [HP, 0, 0], [0.9, 1, 1]);
        for (const z of [-0.15, 0, 0.15]) k.add(U.cyl(1, 12), s.accent, [sd * (hx + 0.085), 0.1, z], [0, 0, HP], [0.055, 0.03, 0.055]);
      }
      k.add(U.sq(0.35, 0.35, 0, 12, 8), s.metal, [0, 0.17, 0], null, [hx, 0.04, 0.2]);
    } else return null;
    return k.build(GB);
  }
  function propGeo(s) {
    const k = kit();
    if (s.mobility === 'copter') {
      k.add(U.cyl(1, 8), s.metal, [0, -0.06, 0], null, [0.025, 0.13, 0.025]);
      k.add(U.sph(10, 6), s.accent, [0, 0, 0], null, [0.055, 0.04, 0.055]);
      for (const sd of [-1, 1]) k.add(U.sq(0.6, 0.3, 0, 8, 4), s.accent, [sd * 0.36, 0.005, 0], [0, 0, sd * 0.06], [0.34, 0.012, 0.055]);
      return k.build(GB);
    }
    k.add(U.cyl(1, 8), s.metal, [0, -0.05, 0], null, [0.02, 0.11, 0.02]);
    k.add(U.sph(10, 8), s.accent, [0, 0, 0], null, [0.045, 0.035, 0.045]);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.add(U.sq(0.6, 0.35, 0, 8, 4), s.accent, [Math.cos(a) * 0.22, 0.005, Math.sin(a) * 0.22], [0, -a, 0.12], [0.21, 0.012, 0.05]); }
    return k.build(GB);
  }
  function antennaGeo(s) {
    const k = kit(), tip = shade(s.eyeColor, 1.15);
    if (s.antenna === 'dish') {
      k.add(U.cyl(1, 8), s.metal, [0, 0.04, 0], null, [0.014, 0.08, 0.014]);
      k.addM(cg('dish', () => new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.05, 0.012), new THREE.Vector2(0.09, 0.04), new THREE.Vector2(0.1, 0.055)], 14)), s.accent, mat4([0, 0.08, 0], [0.5, 0, 0]));
      k.add(U.sph(8, 6), tip, [0, 0.105, 0.03], null, 0.022, { bright: 1.5 });
    } else if (s.antenna === 'coil') {
      k.add(U.cyl(0.7, 10), s.metal, [0, 0.12, 0], null, [0.04, 0.24, 0.04]);
      for (let i = 0; i < 3; i++) k.add(U.tor(0.24, 4, 14), s.accent, [0, 0.05 + i * 0.07, 0], [HP, 0, 0], 0.075 - i * 0.014);
      k.add(U.sph(10, 7), GIZ.elec, [0, 0.27, 0], null, 0.05, { bright: 1.6 });
    } else if (s.antenna === 'crown') {
      k.add(U.tor(0.22, 5, 18), GIZ.gold, [0, 0.025, 0], [HP, 0, 0], 0.11);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(U.cone(6), GIZ.gold, [Math.cos(a) * 0.11, 0.075, Math.sin(a) * 0.11], null, [0.03, 0.09, 0.03]); k.add(U.sph(6, 4), i % 2 ? 0xff5fa2 : 0x7af0ff, [Math.cos(a) * 0.11, 0.125, Math.sin(a) * 0.11], null, 0.018, { bright: 1.3 }); }
    } else if (s.antenna === 'fuse') {
      k.add(U.cyl(1, 10), s.metal, [0, 0.02, 0], null, [0.045, 0.04, 0.045]);
      const curve = new THREE.QuadraticBezierCurve3(new V3(0, 0.03, 0), new V3(0.06, 0.12, -0.03), new V3(0.01, 0.17, 0.03));
      k.addM(cg('fuse', () => new THREE.TubeGeometry(curve, 10, 0.013, 5, false)), 0xe8c58a, new THREE.Matrix4());
    } else {
      k.add(U.cyl(1, 8), s.metal, [0, 0.065, 0], null, [0.012, 0.13, 0.012]);
      k.add(U.sph(10, 8), tip, [0, 0.14, 0], null, 0.036, { bright: 1.45 });
    }
    return k.build(GB);
  }
  function faceOptsFor(s) {
    if (s.eyes === 'toon') return { style: 'toon' };
    return { style: 'led', color: s.eyeColor, eyes: s.eyes === 'led1' ? 'one' : s.eyes === 'visor' ? 'visor' : 'two', screenColor: s.screenColor != null ? s.screenColor : undefined };
  }
  const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _wv = new V3();

  // Stun stars (hidden part on the head; shown + spun while stunned).
  const starsGeo = () => cg('stunStars2', () => {
    const k = kit();
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.add(starGeo(), 0xffd23f, [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], [0, -a, 0], 0.055, { em: 0xffd23f, ei: 0.5 }); }
    return k.build(GB);
  });
  // xo {attach: [{to: part name | 'model' | 'rig', as: new part name (a group created under `to`, at: [x,y,z]),
  //   geo (BufferGeometry; colour attr kept unless color given), color, em, ei, pos, rot, scale, grad,
  //   key (unique, stable)}]} — extra static pieces merged into the robot's single mesh (crowns, coils...).
  Geo.robot = function (spec, xo) {
    xo = xo || {};
    const s = normSpec(spec || {});
    const L = layout(s), ak = armKinds(s);
    const pkey = 'rb|' + RKEYS.filter(k => k !== 'size').map(k => s[k]).join('|');
    const attach = xo.attach || [];
    const key = pkey + (attach.length ? '|+' + attach.map(a => a.key).join('+') : '');
    const mat = charMat({ spec: 0.7, rimStr: 0.45, edge: s.boss ? 0.5 : 0.72 });
    const fo = faceOptsFor(s);
    const fMat = faceMat(Geo.face('idle', fo));
    const mats = [mat, fMat];
    const group = new THREE.Group(); group.name = 'robot';
    const shadowBase = L.shadowR * 1.05 * s.size;
    const shadow = G.R.blobShadow(shadowBase); shadow.position.y = 0.03; group.add(shadow);
    const rig = new THREE.Group(); rig.name = 'rig'; group.add(rig);
    const model = new THREE.Group(); model.name = 'model'; model.scale.setScalar(s.size); rig.add(model);
    const body = new THREE.Group(); body.name = 'body'; body.position.y = L.legH; model.add(body);
    const pieces = [];
    // lo(segK): the part's reduced twin (the same builder baked again with segment scale segK, cached per scale), or null
    const put = (node, g, lo) => { if (g && g.attributes.position.count) pieces.push({ node, g, lo: lo || null }); };
    const twin = (k, make) => segK => cg(k + '|lo' + segK, () => withSeg(segK, make));
    const putK = (node, k, make) => put(node, cg(k, make), twin(k, make));
    putK(body, pkey + '|body', () => bodyGeo(s, L, ak));
    const head = new THREE.Group(); head.name = 'head'; head.position.y = L.headY; body.add(head);
    putK(head, pkey + '|head', () => headGeo(s, L));
    let face;
    if (L.facePlane) { face = facePlane(L.facePlane.w, L.facePlane.h, fMat); face.position.set(0, L.head.cy, L.head.c + 0.01); }
    else face = facePatch(L.faceP, L.face, fMat);
    head.add(face);
    // core (glowing weak spot): its geometry is part of the body; this group marks where it is
    const core = new THREE.Group(); core.name = 'core';
    core.position.copy(L.core).addScaledVector(L.coreN, L.coreR * 0.35); body.add(core);
    // arms + weapons
    const parts = { rig, model, body, head, eyes: face, face, core, legs: [], shadow, armL: null, armR: null, weapon: null, weapon2: null, muzzle: null, muzzle2: null, wheel: null, prop: null, antenna: null, jet: null, spark: null, shield: null, tailRotor: null, backJet: null };
    const armPivots = {};
    for (const side of ['L', 'R']) {
      const kind = ak[side];
      if (kind === 'none') continue;
      const sd = side === 'L' ? 1 : -1; // faces +Z, so its right hand is at -X
      const piv = new THREE.Group(); piv.name = 'arm' + side;
      piv.position.set(sd * L.shoulder[0], L.shoulder[1], L.shoulder[2]);
      if (s.body === 'disc') { piv.scale.setScalar(s.boss ? 1.45 : 1.25); piv.userData.bias = -0.5; } // big forward crab claws
      body.add(piv);
      putK(piv, pkey + '|arm|' + kind, () => armGeo(kind, s));
      armPivots[side] = { piv, kind };
      piv.userData.kind = kind;
      parts['arm' + side] = piv;
      if (kind !== 'mitt') {
        const wmake = () => weaponGeo(kind, s), wg = cg(pkey + '|wp|' + kind, wmake);
        if (wg) {
          const w = new THREE.Group(); w.name = 'weapon' + side; piv.add(w); put(w, wg, twin(pkey + '|wp|' + kind, wmake));
          w.position.y = -(s.boss ? 0.36 : 0.33) - (kind === 'saw' ? 0.17 : 0);
          const mz = new THREE.Object3D(); mz.name = 'muzzle'; mz.position.fromArray(MUZZLE[kind]); w.add(mz);
          armPivots[side].weapon = w;
          piv.userData.weapon = w; w.userData.baseY = w.position.y;
          if (kind === 'shield') parts.shield = w;
          if (kind !== 'shield' && !parts.weapon) { parts.weapon = w; parts.muzzle = mz; }
          else if (kind !== 'shield') { parts.weapon2 = w; parts.muzzle2 = mz; }
        }
      }
    }
    if (parts.weapon && armPivots.R && armPivots.R.weapon && parts.weapon !== armPivots.R.weapon && armPivots.R.kind !== 'shield') {
      parts.weapon2 = parts.weapon; parts.muzzle2 = parts.muzzle; parts.weapon = armPivots.R.weapon; parts.muzzle = parts.weapon.children[0];
    }
    const cannons = [];
    for (let i = 0; i < ak.cannon; i++) {
      const sd = i === 0 ? -1 : 1, S = L.shell;
      let p;
      if (s.body === 'box') p = new V3(sd * S.a * 0.75, 2 * S.b + 0.06, -0.02);
      else if (s.body === 'barrel') p = s.mobility === 'none' && ak.cannon === 1 ? new V3(sd * (S.a + 0.06), S.cy + S.b * 0.35, 0.02) : new V3(sd * S.a * 0.72, 2 * S.b + 0.05, 0);
      else if (s.body === 'disc') p = new V3(sd * S.a * 0.62, S.cy + S.b + 0.05, 0.05);
      else { const q = sqPt(S, 0.62, sd > 0 ? 0.25 : PI - 0.25); p = q.p.addScaledVector(q.n, 0.06); }
      if (s.body === 'box' || s.body === 'barrel' || s.body === 'disc') p.x = Math.abs(p.x) * sd;
      const g = new THREE.Group(); g.name = 'cannon'; g.position.copy(p); body.add(g);
      putK(g, pkey + '|cannon', () => weaponGeo('cannon', s, s.boss || s.mobility === 'none'));
      const mz = new THREE.Object3D(); mz.name = 'muzzle'; mz.position.fromArray(MUZZLE.cannon); g.add(mz);
      cannons.push(g);
      if (!parts.weapon) { parts.weapon = g; parts.muzzle = mz; } else if (!parts.weapon2) { parts.weapon2 = g; parts.muzzle2 = mz; }
    }
    if (!parts.muzzle) { const mz = new THREE.Object3D(); mz.name = 'muzzle'; mz.position.set(0, L.faceY, L.faceZ + 0.06); head.add(mz); parts.muzzle = mz; }
    // locomotion
    const mob = s.mobility;
    if (mob === 'legs2' || mob === 'legs4' || mob === 'spider' || mob === 'tripod' || mob === 'hop') {
      const lmake = () => legGeo(s, L), lg = cg(pkey + '|leg', lmake), lgLo = twin(pkey + '|leg', lmake);
      const S = L.shell;
      const spots = mob === 'legs2' ? [[-L.hipX, 0], [L.hipX, 0]]
        : mob === 'legs4' ? [[-L.hipX * 1.15, S.c * 0.5], [L.hipX * 1.15, S.c * 0.5], [-L.hipX * 1.15, -S.c * 0.5], [L.hipX * 1.15, -S.c * 0.5]]
          : mob === 'spider' ? [[0.785, 0], [2.356, 0], [-0.785, 0], [-2.356, 0]]
            : mob === 'tripod' ? [[-HP, 0], [HP - 1.047, 0], [HP + 1.047, 0]] : [[0, 0]];
      for (const sp of spots) {
        const piv = new THREE.Group(); piv.name = 'leg';
        if (mob === 'spider' || mob === 'tripod') { const a = sp[0], hr = S.a * 0.55; piv.position.set(Math.cos(a) * hr, L.legH + 0.03, Math.sin(a) * hr); piv.rotation.y = -a; piv.userData.yaw = -a; }
        else piv.position.set(sp[0], L.legH + 0.01, sp[1]);
        model.add(piv); put(piv, lg, lgLo); parts.legs.push(piv);
      }
    }
    putK(model, pkey + '|base', () => baseGeo(s, L));
    if (mob === 'wheel' || mob === 'tread') {
      const whMake = () => wheelGeo(s, L), wg = cg(pkey + '|wheel', whMake);
      const w = new THREE.Group(); w.name = 'wheel';
      if (mob === 'wheel') w.position.y = L.wheelR;
      model.add(w); put(w, wg, twin(pkey + '|wheel', whMake)); parts.wheel = w;
    }
    if (mob === 'prop' || mob === 'copter') {
      const p = new THREE.Group(); p.name = 'prop'; p.position.y = L.headTop + (mob === 'copter' ? 0.13 : 0.1); head.add(p);
      putK(p, pkey + '|prop', () => propGeo(s)); parts.prop = p;
    }
    if (mob === 'copter') {
      const S = L.shell, tr = new THREE.Group(); tr.name = 'tailRotor';
      tr.position.set(0.03, S.cy + S.b * 0.5, -S.c - 0.4); body.add(tr);
      put(tr, cg('tailRotor|' + s.accent + '|' + s.metal, () => { const k = kit(); k.add(U.cyl(1, 8), s.metal, [0, 0, 0], [0, 0, HP], [0.025, 0.04, 0.025]); for (const sd of [-1, 1]) k.add(U.sq(0.6, 0.3, 0, 6, 3), s.accent, [0.02, sd * 0.08, 0], null, [0.008, 0.075, 0.025]); return k.build(GB); }));
      parts.tailRotor = tr;
    }
    if (mob === 'hover') {
      const j = flame(s.eyeColor); j.name = 'jet';
      j.position.set(0, -0.09, 0); j.rotation.x = HP; j.scale.set(0.1, 0.1, 0.22); body.add(j); parts.jet = j;
    }
    if (s.back === 'jet') {
      const jg = new THREE.Group(); jg.name = 'jet';
      for (const sd of [-1, 1]) {
        const j = flame(0xffb03a);
        const p = L.back.clone().addScaledVector(L.backN, 0.05); j.position.set(p.x + sd * 0.1, p.y - 0.17, p.z);
        j.rotation.x = HP; j.scale.set(0.045, 0.045, 0.14); jg.add(j);
      }
      body.add(jg); parts.jet = parts.jet || jg; parts.backJet = jg;
    }
    if (s.antenna) {
      const a = new THREE.Group(); a.name = 'antenna'; a.position.y = L.headTop - 0.012;
      a.rotation.z = (G.rng(s.seed + 11)() - 0.5) * 0.3;
      if (mob === 'prop' || mob === 'copter') a.position.x = 0.1;
      head.add(a); putK(a, pkey + '|ant', () => antennaGeo(s)); parts.antenna = a;
      if (s.antenna === 'fuse') { const sp = G.R.glowSprite(0xffb03a, 0.16, 1); sp.position.set(0.01, 0.175, 0.03); a.add(sp); parts.spark = sp; }
    }
    const stars = new THREE.Group(); stars.name = 'stunStars'; stars.position.y = L.headTop + 0.08; stars.visible = false; head.add(stars);
    // stun stars: their own mesh (charMat, drawn only while stunned) instead of a part of the skin, whose hidden parts
    // still cost their triangles (228 per robot) every frame
    { const sm = new THREE.Mesh(starsGeo(), mat); sm.name = 'stars'; stars.add(sm); }
    // weak-spot halo (GDD: glowing battery + halo sprite) — drawn by the scene's shared glow layer
    const cgs = G.R.glowSprite(s.coreColor, L.coreR * (s.boss ? 9 : 6.5), 0.75); cgs.position.copy(core.position); body.add(cgs); parts.coreGlow = cgs;
    if (s.elite) {
      const H = L.legH + L.headY + L.headTop, br = Math.max(H * 0.62, L.shell.a * 1.25);
      const bub = new THREE.Mesh(U.sph(18, 12), G.M.toon(GIZ.bubble, { transparent: true, opacity: 0.3, spec: 1, rimStr: 1, rimPow: 2 }));
      bub.name = 'bubble'; bub.renderOrder = 4; bub.position.y = H * 0.52; bub.scale.setScalar(br); model.add(bub); parts.bubble = bub;
    }
    for (const a of attach) {
      const par = a.to === 'model' ? model : a.to === 'rig' ? rig : parts[a.to];
      if (!par || !par.isObject3D) continue;
      let node = par;
      if (a.as) {
        node = parts[a.as];
        if (!node) { node = new THREE.Group(); node.name = a.as; if (a.at) node.position.fromArray(a.at); par.add(node); parts[a.as] = node; }
      }
      const attBake = g => bake([{ g, c: a.color != null ? a.color : 0xffffff, m: mat4(a.pos, a.rot, a.scale), o: { keepColor: a.color == null && !!g.attributes.color, em: a.em, ei: a.ei, grad: a.grad } }], GB);
      // (a.lo(segK) -> a reduced version of the piece for the far twins; without it the piece is shared as is)
      if (a.geo) put(node, cg(key + '|att|' + a.key, () => attBake(a.geo)), a.lo ? segK => cg(key + '|att|' + a.key + '|lo' + segK, () => attBake(a.lo(segK) || a.geo)) : null);
    }
    // ONE mesh for every vertex-coloured part; the bind pose is the idle pose (= what the far LOD shows)
    restParts(parts, cannons);
    const A = assemble(key, pieces, model, mat, { cull: !s.boss, grow: 1.6 });
    let midMesh = null;   // the skinned mid-level twin (created below, after the stats)
    // far-LOD stand-in for the face: the LED screen as a solid, softly glowing patch
    let scr = null;
    if (fo.style === 'led') {
      const fm = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(face.matrixWorld);
      const sc = s.screenColor != null ? s.screenColor : GIZ.visor;
      scr = { key: 'scr', item: { g: face.geometry, c: mixHex(sc, s.eyeColor, 0.12), m: fm, o: { em: s.eyeColor, ei: 0.07 } } };
    }
    // dims (metres)
    const S = L.shell;
    const r = {
      group, spec: s, parts, layout: L, size: s.size, cannons, mat, asm: A,
      height: (L.legH + L.headY + L.headTop) * s.size + (mob === 'prop' || mob === 'copter' ? 0.12 * s.size : 0),
      radius: Math.max(S.a, S.c) * s.size,
      critY: (L.legH + L.headY + L.faceY) * s.size,
      anim: robotAnim(),
      expr: 'idle', mood: (spec && spec.mood) || 'idle', flash: 0, tele: 0, alt: 0, popped: false, lod: 0, mid: false,
      _faceKey: '', _shadowBase: shadowBase, _stars: stars, _lodMask: -1,
      // LOD 0: skinned parts + face (2 draw calls). LOD 1: ONE static rest-pose mesh built from the parts' reduced
      // twins (~half the triangles; halo, jets still on; only whole-body bob/lean/squash/flash animate) + the live face
      // (2 calls: the eyes and their expressions stay exactly as at LOD 0 — a crowd brings LOD 1 as near as 16–20 m,
      // where a solid screen patch in place of the eyes read as a pop). LOD 2 (~60 m, a few px): the coarser twins with
      // the face screen baked in as a solid, softly glowing patch (1 call), without halo / jets / spark.
      // Shadows and halos never cost their own draw call (shared scene layers).
      setLOD(lv) {
        lv = lv > 1 ? 2 : lv > 0 ? 1 : 0;
        if (lv === r.lod) return;
        const was = r.lod;
        r.lod = lv;
        if (lv && !was) restPose(r);
        if (lv) r._syncLod(true);
        if (A.mesh) A.mesh.visible = !lv && !r.mid; else for (const m of A.nodeMeshes) m.visible = !lv;
        if (midMesh) midMesh.visible = !lv && r.mid;
        if (r._lodMesh) r._lodMesh.visible = !!lv;
        face.visible = lv < 2;   // (LOD 1 keeps the live face; restPose put the head at the rest pose the LOD mesh shows)
        for (const o of [parts.coreGlow, parts.jet, parts.spark]) if (o) o.visible = lv < 2;
      },
      // Mid level on / off (still LOD 0: the animated rig, face and all): swaps the full skin for its 0.7 twin on the same
      // skeleton, so the pose is identical in the frame of the swap.
      setMid(on) {
        on = !!on && !!midMesh;
        if (on === r.mid) return;
        r.mid = on;
        if (!r.lod && A.mesh) { A.mesh.visible = !on; midMesh.visible = on; }
      },
      _syncLod(force, lvAt) {
        const m = hiddenMask(A), lv = lvAt != null ? lvAt : Math.max(1, r.lod), k = m * 4 + lv;
        if (!force && k === r._lodMask) return;
        r._lodMask = k;
        const g = lodGeo(A, m, lv >= 2 ? scr : null, lv);   // (the baked screen patch only where the live face is off)
        if (!r._lodMesh) { r._lodMesh = new THREE.Mesh(g, mat); r._lodMesh.name = 'lod'; r._lodMesh.visible = false; model.add(r._lodMesh); }
        else r._lodMesh.geometry = g;
      },
      setExpr(e) { r.expr = e || 'idle'; applyFace(); },
      setFlash(k) { k = clamp(k || 0, 0, 1); if (k === r.flash) return; r.flash = k; applyFx(); },
      setTelegraph(k) { k = clamp(k || 0, 0, 1); if (k === r.tele) return; r.tele = k; applyFx(); },
      setAlt(a) { r.alt = a || 0; },
      kick(k) { r.anim.kick = Math.max(r.anim.kick, k == null ? 1 : k); },
      // Hit reaction: (dx, dz) = world direction the blow travels (shot flight / away from the source), k ~0.3..1.2
      // strength, big = stagger. Kicks the lean / roll / squash / head / antenna springs (directional flinch that
      // settles with a wobble) and starts an eased flash. Heavier robots (size, bosses) flinch less.
      hit(dx, dz, k, big) {
        const A = r.anim;
        k = clamp(k == null ? 0.6 : k, 0, 1.5);
        const yw = group.rotation.y, sn = Math.sin(yw), cs = Math.cos(yw);
        let lz = (dx || 0) * sn + (dz || 0) * cs, lx = (dx || 0) * cs - (dz || 0) * sn;
        const l = Math.hypot(lx, lz);
        if (l > 1e-4) { lx /= l; lz /= l; } else { lx = 0; lz = -1; }   // unknown direction: from the front
        const m = massK(r) * motionK(), imp = (big ? 7.5 : 4.4) * k * m;
        A.sLean.v += lz * imp; A.sRoll.v -= lx * imp;
        A.sSq.v -= (big ? 5.5 : 3.4) * k * m;
        A.sHead.v += (A.seed > PI ? 1 : -1) * imp * 1.1;
        A.sAntX.v += lz * imp * 2.4; A.sAntZ.v -= lx * imp * 2.4;
        A.flash = Math.max(A.flash, big ? 1 : 0.6 + 0.4 * Math.min(1, k));
        if (big) A.stag = Math.max(A.stag, Math.min(1, 0.65 + 0.35 * k) * Math.min(1, 1.4 * massK(r)));   // a boss barely rocks
        A.recoil = Math.max(A.recoil, Math.min(1, 0.3 + 0.5 * k));
        A.hitT = 0;
      },
      // Pop-in with overshoot (spawns, drops). delay (s) keeps it invisible first.
      spawnIn(delay) { r.anim.spawnT = -(delay || 0); },
      muzzleWorld(out) { return parts.muzzle.getWorldPosition(out || new V3()); },
      dispose() {
        if (group.parent) group.parent.remove(group);
        for (const m of mats) m.dispose();
        if (A.skeleton) A.skeleton.dispose();
      },
    };
    const foTele = fo.style === 'led' ? Object.assign({}, fo, { color: TELE }) : fo;
    // Face textures and halo materials looked up once per robot (Geo.face builds a cache key string; doing that
    // every frame while a flash fades or a telegraph pulses was steady GC garbage).
    const faceN = {}, faceT = {};
    const faceOf = (ex, tele) => { const c = tele ? faceT : faceN; return c[ex] || (c[ex] = Geo.face(ex, tele ? foTele : fo)); };
    let glowCore = null, glowTele = null, glowWhite = null;
    function applyFace() {
      const tele = r.tele > 0.08;
      const blink = r.anim.blink > 0 && !tele;
      const tex = faceOf(tele ? 'focused' : blink ? 'blink' : r.expr, tele);
      // swapping one texture for another needs no program rebuild (needsUpdate would re-key the shader each time)
      if (fMat.map !== tex) { if (!fMat.map !== !tex) fMat.needsUpdate = true; fMat.map = tex; }
      const f = 1 + r.flash * 1.4, tk = tele ? 0.8 + 0.5 * r.tele : 1;
      fMat.color.setRGB(f * tk, f * tk, f * tk);
    }
    function applyFx() {
      const f = r.flash, t = r.tele;
      mat.emissive.setRGB(f * 0.85, f * 0.85, f * 0.85);
      _c1.set(s.coreColor).multiplyScalar(0.85);
      if (t > 0) _c1.lerp(_c2.set(TELE).multiplyScalar(1.1 + 0.9 * t), clamp(t * 1.4, 0, 1));
      if (f > 0) _c1.lerp(_c2.setRGB(1.6, 1.6, 1.6), f);
      mat.core.copy(_c1);
      if (parts.coreGlow) {
        parts.coreGlow.material = t > 0.3 ? (glowTele || (glowTele = G.M.spriteGlow(TELE, 0.75)))
          : f > 0.5 ? (glowWhite || (glowWhite = G.M.spriteGlow(0xffffff, 0.75))) : (glowCore || (glowCore = G.M.spriteGlow(s.coreColor, 0.75)));
      }
      applyFace();
    }
    r._applyFace = applyFace;
    r._faceOf = faceOf;
    if (parts.antenna) parts.antenna.userData.rz = parts.antenna.rotation.z;
    r.anim.sLean.f = r.anim.sRoll.f = s.boss ? 1.5 : clamp(3.8 - 0.4 * s.size, 2.2, 3.5);   // heavier robots sway slower
    restPose(r);   // joint-angle cache = the rest pose the mesh was bound in
    applyFx();
    r.stats = Geo.countTris(group);
    // the mid-level twin, parked hidden now (its geometry is cached per spec; same material and skinning program as the
    // full skin, so nothing compiles when it first shows)
    if (A.mesh && A.skeleton && !s.boss) {
      midMesh = new THREE.SkinnedMesh(skinAt(A, Geo.MID_SEG || MID_SEG), mat);
      midMesh.name = 'partsMid'; midMesh.visible = false;
      model.add(midMesh);
      midMesh.bind(A.skeleton, A.mesh.bindMatrix);
      midMesh.boundingSphere = A.mesh.boundingSphere; midMesh.boundingBox = A.mesh.boundingBox;
      midMesh.frustumCulled = A.mesh.frustumCulled;
      r._midMesh = midMesh;
    }
    // bake (or fetch) the far-LOD geometry and park its mesh (hidden) now, at spawn: a mode's load warm-up then uploads
    // it and compiles the static program, instead of the first time this robot crosses the LOD distance mid-fight
    // (both reduced levels are baked here — cached per spec, so only the first robot of a kind pays — and the parked
    // mesh holds LOD1, so the swap mid-fight only swaps buffers)
    if (A.mesh) { lodGeo(A, hiddenMask(A), scr, 2); r._syncLod(true, 1); }
    return r;
  };

  // Unit-height layout of a spec (shell, legH, headTop, faceY...) — to place xo.attach pieces before building.
  Geo.robotLayout = spec => layout(normSpec(spec || {}));
  // Draw (and upload) the face textures a robot of this spec swaps to in a fight — the wide-eyed 'focused' wind-up face
  // in its pink telegraph colours and in its own, its mood face, blink, hurt, happy (dance), dizzy (stun / pop), the
  // rig's own 'alert' expression (applyFace draws it before 17_enemies lays its override on top) and that yellow alert
  // '!' override — at load, so no first wind-up / alert / stun / pop mid-fight does a canvas draw or texture upload.
  // Returns how many it touched.
  Geo.prewarmFaces = function (spec) {
    const s = normSpec(spec || {}), fo = faceOptsFor(s), led = fo.style === 'led';
    const list = [Geo.face('focused', led ? Object.assign({}, fo, { color: TELE }) : fo)];
    const exs = ['idle', 'focused', 'blink', 'hurt', 'happy', 'dizzy', 'alert'];
    if (spec && spec.mood && exs.indexOf(spec.mood) < 0) exs.push(spec.mood);
    for (const ex of exs) list.push(Geo.face(ex, fo));
    list.push(Geo.face('alert', { style: led ? 'led' : 'toon', color: GIZ.alert, eyes: s.eyes === 'led1' ? 'one' : s.eyes === 'visor' ? 'visor' : 'two' }));
    const r = G.R && G.R.renderer;
    if (r && r.initTexture && !(G.R.isLost && G.R.isLost())) for (const t of list) G.safe('face upload', () => r.initTexture(t));
    return list.length;
  };

  // Presets = the GDD §7.2 Gizmob roster + §7.4 bosses (ids match G.Enemies type ids; names are English fallbacks — UI
  // text goes through i18n keys). ONE source of truth: a Gizmob preset is read from G.Enemies.defs[id].spec at access
  // time (the spec the game spawns, incl. the rear-core battery colour), so the showcase never drifts from play. The
  // copies below are only the stand-ins used before 17_enemies.js is loaded. Pieces 17_enemies merges in buildRobot
  // (Lobba's mortar tube, Zapper's coil, Rollo's stripes, Shieldy's heart, Tote's crate, elite crowns) need
  // G.Enemies.buildRobot(def) to appear. Bosses mirror the literal specs in 17b_bosses.js (Queen Buzzhive's honeycomb
  // crown is merged there too); the Vend-O-Titan is a custom model in game, so its preset is a showcase stand-in.
  // Add elite:true for the gold-trim/crown/bubble look.
  const O = GIZ.orange, PL = GIZ.plum, BR = GIZ.brass;
  const PRESET_INFO = {
    bumbler: ['Bumbler', 'T1 bee-sphere hover drone'], hopper: ['Hopper', 'T1 cylinder on a big spring'], rollo: ['Rollo', 'T1 striped ball bot (self-destructs)'],
    squirt: ['Squirt', 'T1 egg turret on spider legs (goo lobs)'], gnat: ['Gnat Sniper', 'T2 hover bot with a lens eye'], shieldy: ['Shieldy', 'T2 box bot with a heart riot plate'],
    lobba: ['Lobba', 'T2 squat bot with a tall mortar tube'], zapper: ['Zapper', 'T2 tesla-coil walker'], pinch: ['Pinchbot', 'T3 mini crab tank'],
    bruiser: ['Bruiser', 'T3 big gorilla-shaped bot'], tote: ['Tote-copter', 'T3 delivery rotor bot'],
    crankcrab: ['Crankcrab', 'boss B1: crab tank'], buzzhive: ['Queen Buzzhive', 'boss B2: floating hive-bot'], titan: ['Vend-O-Titan', 'boss B3: walking vending machine (custom model in game)'],
  };
  const PRESET_FALLBACK = {
    bumbler: { body: 'sphere', size: 0.95, color: 0xffa62b, accent: PL, metal: PL, eyes: 'led1', eyeColor: GIZ.idle, mobility: 'prop', antenna: true, armor: 0.3, seed: 31 },
    hopper: { body: 'barrel', size: 1.15, color: O, accent: BR, metal: PL, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'hop', seed: 32 },
    rollo: { body: 'sphere', size: 0.85, color: O, accent: GIZ.cream, metal: PL, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'ball', antenna: 'fuse', seed: 33 },
    squirt: { body: 'egg', size: 1.25, color: O, accent: GIZ.goo, metal: PL, eyes: 'visor', eyeColor: GIZ.idle, mobility: 'spider', arms: 'cannon', seed: 34 },
    gnat: { body: 'capsule', size: 1.35, color: GIZ.goo, accent: BR, metal: PL, eyes: 'led1', eyeColor: GIZ.idle, mobility: 'hover', arms: 'rifle', antenna: 'dish', seed: 35 },
    shieldy: { body: 'box', size: 1.5, color: O, accent: 0xff5fa2, metal: PL, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'legs2', arms: 'shield', armor: 0.6, seed: 36 },
    lobba: { body: 'barrel', size: 1.3, color: O, accent: BR, metal: PL, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'tread', back: 'none', armor: 0.3, seed: 37 },
    zapper: { body: 'capsule', size: 1.55, color: PL, accent: GIZ.elec, metal: 0x3d4470, eyes: 'visor', eyeColor: GIZ.idle, mobility: 'legs2', antenna: true, armor: 0.35, seed: 38 },
    pinch: { body: 'disc', size: 1.7, color: O, accent: BR, metal: PL, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'spider', arms: 'cannon', armL: 'claw', armR: 'claw', back: 'tank', armor: 0.5, coreColor: PL, seed: 39 },
    bruiser: { body: 'box', size: 2.6, color: O, accent: BR, metal: PL, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'legs2', arms: 'fist', back: 'tank', armor: 0.85, coreColor: PL, seed: 40 },
    tote: { body: 'box', size: 2.3, color: O, accent: GIZ.alert, metal: PL, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'prop', back: 'tank', armor: 0.4, seed: 41 },
    crankcrab: { body: 'disc', size: 6.5, color: O, accent: BR, metal: PL, eyes: 'visor', eyeColor: GIZ.idle, mobility: 'spider', arms: 'claw', back: 'spikes', armor: 0.7, boss: true, seed: 51 },
    buzzhive: { body: 'egg', size: 5.2, color: 0xffc21a, accent: PL, metal: 0x3a2a5c, eyes: 'led2', eyeColor: GIZ.idle, mobility: 'hover', antenna: true, armor: 0.6, boss: true, seed: 52 },
    titan: { body: 'box', size: 10, color: 0xff5d73, accent: BR, metal: PL, eyes: 'led1', eyeColor: GIZ.alert, mobility: 'legs2', arms: 'cannon', armL: 'fist', back: 'tank', deco: 'vending', armor: 1, boss: true, seed: 53 },
  };
  function presetSpec(id) {
    const d = G.Enemies && G.Enemies.defs && G.Enemies.defs[id];
    let spec;
    if (d && d.spec) { spec = Object.assign({}, d.spec); if (d.rearCore) spec.coreColor = spec.metal; }   // = what buildRobot spawns
    else spec = Object.assign({}, PRESET_FALLBACK[id]);
    spec.name = PRESET_INFO[id][0]; spec.role = PRESET_INFO[id][1];
    return spec;
  }
  Geo.robotPresets = {};
  for (const id of Object.keys(PRESET_INFO)) Object.defineProperty(Geo.robotPresets, id, { enumerable: true, configurable: true, get: () => presetSpec(id) });

  // ------------------------------------------------------------------ robot animation
  // Motion model (dt-based, frame-rate independent):
  //   * locomotion: a walk weight (anim.amp) eases between idle and walk / run instead of popping; the stride
  //     phase advances by real ground speed over a stride matched to the leg sweep (feet plant instead of
  //     sliding), the swinging foot lifts, and turning on the spot shuffles the feet.
  //   * body: slow targets (speed lean, lean INTO acceleration and turns, wind-up crouch, stagger) drive damped
  //     springs (weight + a little overshoot); gait bob / sway, breathing, shakes and fidgets layer on directly.
  //   * reactions: r.hit() kicks the springs (directional flinch, squash & stretch, head snap) with an eased
  //     flash; big hits stagger; landings squash; an attack's release lunges out of its wind-up; r.spawnIn()
  //     pops in with overshoot; death squashes, inhales, then pops (G.Geo.ROBOT_POP_AT = the burst moment).
  //   * secondary: antennae on whippy springs, loose arms trail the body, per-robot breathing rate / phase.
  //   * opts.detail (0..1) fades limb motion to the rest pose, so the switch to the static far LOD never pops.
  // Hot path is allocation-free in any JIT tier: joint angles are kept in r.anim (no Euler getter reads), damping
  // uses per-call exp factors inline, springs carry their own target / tuning (called with tagged args only),
  // Vector3 fields are written directly, and flash / telegraph setters are only called on change.
  const POSE = {
    mitt: { idle: -0.12, attack: -1.25, windup: -2.6 },
    fist: { idle: -0.22, attack: -0.45, windup: -2.95 },
    blaster: { idle: -0.95, attack: -1.57, windup: -1.8 },
    rifle: { idle: -0.85, attack: -1.57, windup: -1.62 },
    claw: { idle: -0.8, attack: -1.65, windup: -0.35 },
    saw: { idle: -1.05, attack: -1.7, windup: -0.45 },
    hammer: { idle: -2.55, attack: -0.7, windup: -3.15 },
    shield: { idle: -1.3, attack: -1.45, windup: -1.35 },
  };
  const armRestZ = (piv, sd) => sd * (piv.userData.kind === 'mitt' || piv.userData.kind === 'fist' ? 0.2 : 0.05);
  function restParts(P, cannons) {
    P.body.rotation.set(0, 0, 0); P.body.position.x = 0; P.head.rotation.set(0, 0, 0);
    for (const side of ['L', 'R']) {
      const piv = P['arm' + side]; if (!piv) continue;
      const pose = POSE[piv.userData.kind] || POSE.mitt, sd = side === 'L' ? 1 : -1;
      piv.rotation.set(pose.idle + (piv.userData.bias || 0), 0, armRestZ(piv, sd));
      if (piv.userData.weapon) { piv.userData.weapon.position.y = piv.userData.weapon.userData.baseY; piv.userData.weapon.scale.set(1, 1, 1); }
    }
    for (const l of P.legs) { l.rotation.set(0, l.userData.yaw || 0, 0); l.scale.set(1, 1, 1); }
    for (const c of cannons) c.rotation.set(0, 0, 0);
    if (P.antenna) { P.antenna.rotation.x = 0; P.antenna.rotation.z = P.antenna.userData.rz || 0; }
  }
  // rest pose on the parts AND in the cached joint state (so the next animated frame continues from it)
  function restPose(r) {
    const P = r.parts, A = r.anim;
    restParts(P, r.cannons);
    A.hx = A.hy = 0; A.cn = 0;
    A.ax0 = P.armL ? (POSE[P.armL.userData.kind] || POSE.mitt).idle + (P.armL.userData.bias || 0) : 0; A.az0 = P.armL ? armRestZ(P.armL, 1) : 0;
    A.ax1 = P.armR ? (POSE[P.armR.userData.kind] || POSE.mitt).idle + (P.armR.userData.bias || 0) : 0; A.az1 = P.armR ? armRestZ(P.armR, -1) : 0;
  }
  function ensureStars(r) { return r._stars; }
  // Damped spring {x, v, t (target), f (Hz), z (damping ratio)}: semi-implicit Euler sub-stepped at <= 1/120 s —
  // stable for the stiffnesses used here, and a 50 ms hitch integrates like three 16 ms frames.
  const SPR_H = 1 / 120;
  function springStep(s, dt) {
    if (!(dt > 0)) return;
    const w = TAU * s.f, k = w * w, c = 2 * s.z * w, t = s.t;
    let n = Math.ceil(dt / SPR_H); if (n > 8) n = 8;
    const h = dt / n;
    let x = s.x, v = s.v;
    for (let i = 0; i < n; i++) { v += (k * (t - x) - c * v) * h; x += v * h; }
    s.x = x; s.v = v;
  }
  const SP = (f, z) => ({ x: 0, v: 0, t: 0, f, z });
  Geo.springStep = springStep;
  Geo.spring = function (s, target, f, z, dt) {
    s.t = target; s.f = f != null ? f : s.f != null ? s.f : 3; s.z = z != null ? z : s.z != null ? s.z : 0.5;
    springStep(s, dt);
    return s.x;
  };
  const easeOut = k => 1 - (1 - k) * (1 - k);
  const smooth01 = k => k * k * (3 - 2 * k);
  const wrapA = a => a - TAU * Math.round(a / TAU);
  const motionK = () => (G.Save && G.Save.set && G.Save.set.reducedMotion ? 0.4 : 1);   // reduced motion: calmer secondary motion
  // easeOutBack pop-in: 0 -> ~1.2 overshoot -> 1
  const popIn = k => { const c = 2.4, u = k - 1; return Math.max(0.001, 1 + (c + 1) * u * u * u + c * u * u); };
  Geo.popIn = popIn;
  const SPAWN_T = 0.42;
  function massK(r) { return (1 / Math.sqrt(Math.max(0.6, r.size || 1))) * (r.spec && r.spec.boss ? 0.35 : 1); }
  function robotAnim() {
    return {
      state: 'idle', prev: 'idle', st: 0, ph: 0, hopP: 0, blinkT: 1 + Math.random() * 3, blink: 0, kick: 0, recoil: 0, flashT: 0, flash: 0, deadT: 0,
      lean: 0, roll: 0, look: 0, seed: Math.random() * TAU, freq: 6 + Math.random() * 2.2, teleAuto: false,
      amp: 0, px: NaN, py: NaN, pz: NaN, pyaw: NaN, svx: 0, svz: 0, vy: 0, yawRate: 0, alf: 0, ala: 0, stunW: 0,
      sLean: SP(3, 0.5), sRoll: SP(3, 0.5), sSq: SP(4.6, 0.32), sHead: SP(4.5, 0.28), sAntX: SP(2.6, 0.16), sAntZ: SP(2.3, 0.16),
      stag: 0, hitT: 9, spawnT: 99, fidT: 2 + Math.random() * 5, fid: 0, fidK: 0,
      hx: 0, hy: 0, cn: 0, ax0: 0, az0: 0, ax1: 0, az1: 0, spin: 0, whl: 0, tail: 0, saw: 0, starA: 0,
    };
  }
  function stateEnter(r, state) {
    const A = r.anim, prev = A.state, m = massK(r);
    A.prev = prev; A.state = state; A.st = 0;
    if (state === 'hurt') { A.recoil = 1; A.flash = Math.max(A.flash, 0.8); if (A.hitT > 0.1) A.sLean.v -= 3 * m; A.sSq.v -= 2 * m; }
    else if (state === 'attack') { A.kick = Math.max(A.kick, 0.7); if (prev === 'windup') { A.sLean.v += 4.2 * m; A.sSq.v += 3.4 * m; } }   // release: lunge + stretch
    else if (state === 'windup') A.sSq.v -= 1.4 * m;                                                                                    // anticipation dip
    else if (state === 'dead') A.deadT = 0;
    if (r._stars) r._stars.visible = state === 'stun';
  }
  const EMPTY = {};
  const FLY = { hover: 1, prop: 1, copter: 1 };
  const LEGGED = { legs2: 1, legs4: 1, spider: 1, tripod: 1 };
  // state: idle | move | attack | windup | hurt | stun | dead. opts {speed (m/s, drives the stride), look (head yaw),
  // aim (weapon pitch, rad up), expr, telegraph (0..1 to drive it yourself), flash, fire (kick now), hop, look (NaN = auto),
  // vx / vz / vy (world velocity m/s) + yaw (rendered facing) + turn (rad/s) — else derived from the group transform,
  // wind (wind-up progress 0..1; < 0 = unknown), detail (limb detail 0..1, LOD fade)}. Returns true once the 'dead'
  // pop has finished.
  Geo.animateRobot = function (r, state, t, dt, opts) {
    opts = opts || EMPTY;
    const A = r.anim, P = r.parts, s = r.spec, L = r.layout, S = r.size;
    autoLayers(r);
    if (r.lod && r._syncLod) r._syncLod(false);
    if (state !== A.state) stateEnter(r, state);
    A.st += dt; A.hitT += dt;
    if (state === 'dead') return popRobot(r, dt);
    const mob = s.mobility, lod = r.lod, RM = motionK(), fly = FLY[mob] === 1, legged = LEGGED[mob] === 1;
    const D = opts.detail != null ? Math.min(1, Math.max(0, opts.detail)) : 1;
    // per-call damping factors: x += (target - x)·(1 - e^(-k·dt))
    const e6 = Math.exp(-6 * dt), e8 = Math.exp(-8 * dt), e9 = Math.exp(-9 * dt), e10 = Math.exp(-10 * dt), e12 = Math.exp(-12 * dt);
    const e13 = Math.exp(-13 * dt), e16 = Math.exp(-16 * dt), e20 = Math.exp(-20 * dt), e28 = Math.exp(-28 * dt);
    // ---- root motion: world velocity, facing and turn rate
    const g = r.group, gp = g.position, idt = dt > 1e-5 ? 1 / dt : 0;
    let vx = 0, vz = 0, vy = 0;
    if (opts.vx != null) { vx = opts.vx; vz = opts.vz || 0; }
    else if (A.px === A.px && idt) { vx = (gp.x - A.px) * idt; vz = (gp.z - A.pz) * idt; }
    if (opts.vy != null) vy = opts.vy; else if (A.py === A.py && idt) vy = (gp.y - A.py) * idt;
    const yaw = opts.yaw != null ? opts.yaw : g.rotation.y;
    let yr = 0;
    if (opts.turn != null) yr = opts.turn; else if (A.pyaw === A.pyaw) { const dy = yaw - A.pyaw; yr = (dy - TAU * Math.round(dy / TAU)) * idt; }
    if (vx * vx + vz * vz > 1600 || vy * vy > 1600) { vx = vz = vy = 0; A.svx = A.svz = 0; yr = 0; }   // teleport / respawn: no lurch
    A.px = gp.x; A.py = gp.y; A.pz = gp.z; A.pyaw = yaw;
    yr = yr > 10 ? 10 : yr < -10 ? -10 : yr;
    A.yawRate = yr + (A.yawRate - yr) * e16;
    // acceleration ≈ λ·(v − low-passed v), expressed in the robot's frame (forward, left). The filter state is
    // averaged before / after this step: the pre-step value alone reads ~λ·dt/2 too high (+25 % at 20 fps, a lean
    // blip on every hitch frame) — the average is dt-independent to first order.
    const svx0 = A.svx, svz0 = A.svz;
    A.svx = vx + (svx0 - vx) * e10; A.svz = vz + (svz0 - vz) * e10;
    const ax = (vx - 0.5 * (svx0 + A.svx)) * 10, az = (vz - 0.5 * (svz0 + A.svz)) * 10;
    const sn = Math.sin(yaw), cs = Math.cos(yaw), alf = ax * sn + az * cs, ala = ax * cs - az * sn;
    A.alf = alf + (A.alf - alf) * e20; A.ala = ala + (A.ala - ala) * e20;
    if (!fly && mob !== 'hop' && !opts.hop && A.vy < -3.5 && vy > -1) A.sSq.v -= Math.min(1, -A.vy / 14) * 4.5 * massK(r);   // landing squash
    A.vy = vy;
    // ---- locomotion
    const speed = opts.speed != null ? opts.speed : state === 'move' ? 2.5 : 0;
    const moving = speed > 0.15 && state !== 'stun';   // (wind-ups may step: a strafing charge-up must not slide)
    const turning = legged && !moving && state !== 'stun' && (A.yawRate > 0.8 || A.yawRate < -0.8);
    const ampT = moving ? Math.min(1.3, Math.max(0.35, speed / 2.5)) : turning ? 0.45 : 0;
    A.amp = ampT + (A.amp - ampT) * e9;
    const amp = A.amp, amp1 = amp < 1 ? amp : 1;
    // leg swing (rad) and the ground one stride cycle covers with it: two steps of 2·leg·sin(swing), so the planted
    // foot moves backwards exactly as fast as the body moves forwards. The cadence uses the swing the gait is
    // blending TO (ampT): sized by the eased weight, a fresh start would flutter tiny steps at 8–10 Hz for a few frames.
    const ampS = moving ? ampT : amp;
    let swing, cyc;
    if (mob === 'legs2' || mob === 'legs4') { const k = mob === 'legs2' ? 0.62 : 0.55, sw = k * ampS; swing = k * amp; cyc = Math.max(0.25 * S, 4 * L.legH * S * 1.05 * Math.sin(sw > 0.12 ? sw : 0.12)); }
    else if (mob === 'spider' || mob === 'tripod') { const sw = 0.32 * ampS; swing = 0.32 * amp; cyc = Math.max(0.2 * S, 4 * (L.shell.a * 0.55 + 0.3) * S * Math.sin(sw > 0.08 ? sw : 0.08)); }
    else { swing = 0.6 * amp; cyc = 1.15 * S; }
    A.ph += dt * (speed * TAU / cyc + (turning ? Math.abs(A.yawRate) * 2.4 : 0));
    const ph = A.ph;
    if (!lod) {
      const lg = P.legs;
      if (mob === 'legs2' && lg.length === 2) {
        // rotation.x > 0 swings the foot backwards: rising = stance (planted), falling = swing (lifted)
        const a = Math.sin(ph) * swing * D, c = Math.cos(ph), up = 0.16 * amp1 * D;
        lg[0].rotation.set(a, 0, 0); lg[1].rotation.set(-a, 0, 0);
        lg[0].scale.y = 1 - up * (c < 0 ? -c : 0); lg[1].scale.y = 1 - up * (c > 0 ? c : 0);
      } else if (mob === 'legs4') {
        const a = Math.sin(ph) * swing * D;
        for (let i = 0; i < lg.length; i++) lg[i].rotation.set((i === 0 || i === 3) ? a : -a, 0, 0);
      } else if (mob === 'spider' || mob === 'tripod') {
        for (let i = 0; i < lg.length; i++) {
          const l = lg[i], o = ph + (mob === 'tripod' ? i * TAU / 3 : (i === 0 || i === 3 ? 0 : PI)), co = Math.cos(o);
          l.rotation.set(0, l.userData.yaw + Math.sin(o) * swing * D, (co > 0 ? co : 0) * 0.35 * amp1 * D);   // lift on the forward stroke
        }
      } else if (mob === 'wheel' && P.wheel) { A.whl += speed * dt / (L.wheelR * S); P.wheel.rotation.set(A.whl, 0, 0); }
      if (P.prop) { A.spin += dt * (mob === 'copter' ? 26 : 20 + 10 * amp); P.prop.rotation.set(0, A.spin, 0); }
      if (P.tailRotor) { A.tail += dt * 34; P.tailRotor.rotation.set(A.tail, 0, 0); }
    }
    // ---- body: slow targets (springs) + fast layers
    let lean = 0, roll = 0, fLean = 0, fRoll = 0, lift = 0;
    let sy = 1 + 0.028 * RM * Math.sin(t * A.freq + A.seed) * (1 - 0.5 * amp1);   // breathing (per-robot rate / phase)
    if (mob === 'legs2') { const sp = Math.abs(Math.sin(ph)); lift = (1 - sp) * 0.045 * amp; sy *= 1 + 0.05 * amp1 * (0.5 - sp) * RM; lean += 0.1 * amp; fRoll += Math.sin(ph) * 0.07 * amp; }
    else if (mob === 'legs4') { lift = (1 - Math.abs(Math.sin(ph))) * 0.02 * amp; lean += 0.06 * amp; }
    else if (mob === 'spider') lift = Math.abs(Math.sin(ph * 2)) * 0.015 * amp + 0.008 * Math.sin(t * 3 + A.seed);
    else if (mob === 'tripod') { fRoll += 0.02 * Math.sin(t * 1.3 + A.seed); lift = Math.abs(Math.sin(ph * 1.5)) * 0.012 * amp; }
    else if (mob === 'wheel') { lean += 0.12 * amp; fRoll += Math.sin(t * 6 + A.seed) * 0.04 * amp; }
    else if (mob === 'tread') { lift = Math.sin(t * 38 + A.seed) * 0.004 * amp; lean += 0.05 * amp; }
    else if (mob === 'ball') { lift = Math.abs(Math.sin(ph * 1.6)) * 0.02 * amp; fRoll += Math.sin(ph * 0.8) * 0.12 * amp; lean += 0.08 * amp; }
    else if (mob === 'hover') {
      lift = 0.045 * Math.sin(t * 2.3 + A.seed); lean += 0.2 * amp; fRoll += Math.sin(t * 1.7 + A.seed) * 0.04;
      if (P.jet && P.jet.isMesh) P.jet.scale.z = 0.22 * (1 + 0.15 * Math.sin(t * 31) + 0.3 * amp + Math.min(0.4, Math.max(0, A.alf * 0.05)));
    } else if (fly) { lift = 0.06 * Math.sin(t * 2.6 + A.seed); lean += (mob === 'copter' ? 0.15 : 0.25) * amp; fRoll += Math.sin(t * 2.1 + A.seed) * 0.06; }
    if (P.backJet) { const ch = P.backJet.children; for (let i = 0; i < ch.length; i++) ch[i].scale.z = 0.14 * (1 + 0.2 * Math.sin(t * 29 + i * 2) + 0.4 * amp); }
    // lean INTO acceleration and turns (a turn's centripetal pull is part of the lateral acceleration)
    const kA = (fly ? 0.03 : 0.02) * (s.boss ? 0.5 : 1), lf = A.alf * kA, ll = A.ala * kA;
    lean += lf > 0.3 ? 0.3 : lf < -0.3 ? -0.3 : lf; roll -= ll > 0.3 ? 0.3 : ll < -0.3 ? -0.3 : ll;
    // hop locomotion (pogo spring bots, or opts.hop for anything)
    if (mob === 'hop' || opts.hop) {
      const frac = A.hopP % 1;
      if (moving || (frac > 0.001 && frac < 0.999)) A.hopP += dt * 1.6 * Math.min(1.4, Math.max(0.8, speed / 2.5)) * (moving ? 1 : 1.4);
      if (!moving && A.hopP % 1 < 0.02 && A.hopP > 0) A.hopP = Math.floor(A.hopP);
      const h = hopCurve(A.hopP % 1);
      lift = h.y * 0.42; sy = h.sy * (1 + 0.02 * Math.sin(t * A.freq + A.seed));
      if (mob === 'hop' && P.legs[0] && !lod) P.legs[0].scale.y = h.sy < 1 ? Math.pow(h.sy, 1.6) : 1 + (h.sy - 1) * 0.7;
    }
    // state poses: the wind-up crouches deeper and shakes harder as it charges (eased), the release lunges (stateEnter)
    let we = 0;
    if (state === 'windup') {
      const wk = opts.wind != null && opts.wind >= 0 ? Math.min(1, opts.wind) : Math.min(1, A.st / 0.7);
      we = wk * wk * (3 - 2 * wk);
      sy *= 1 - 0.13 * we; lean -= 0.07 + 0.16 * we; fRoll += Math.sin(t * 55) * (0.008 + 0.03 * we) * RM;
    } else if (state === 'attack') lean += 0.06;
    A.recoil *= e6;
    A.kick *= e10;
    if (A.flashT > 0) { A.flashT -= dt; if (A.flash < 1) A.flash = 1; }   // legacy pulse API
    fLean -= 0.07 * A.kick;
    sy *= 1 - 0.04 * A.kick;
    if (A.stag > 0) {   // stagger after a big hit: knocked back, wobbling, arms flailing
      A.stag = Math.max(0, A.stag - dt * 1.5);
      const k = A.stag * A.stag;
      fRoll += Math.sin(t * 12 + A.seed) * 0.13 * k * RM; fLean += Math.sin(t * 8.5 + A.seed) * 0.07 * k * RM; lean -= 0.12 * k;
    }
    const stT = state === 'stun' ? 1 : 0;
    A.stunW = stT + (A.stunW - stT) * e8;
    if (A.stunW > 0.001) { fLean += Math.sin(t * 5) * 0.13 * A.stunW; fRoll += Math.cos(t * 5) * 0.16 * A.stunW; }
    if (state === 'stun') { const st = ensureStars(r); st.visible = true; A.starA += dt * 4; st.rotation.set(0, A.starA, 0); }
    if (opts.fire) r.kick(0.8);
    // idle fidgets (glance aside / little hop / happy wiggle), per-robot timing so a group never moves in lockstep
    let look = 0;
    if (state === 'idle' && !lod && amp < 0.05 && D > 0.5) {
      if (A.fid === 0) { A.fidT -= dt; if (A.fidT <= 0) { A.fid = 1 + ((Math.random() * 3) | 0); A.fidK = 0; A.fidT = 3.5 + Math.random() * 5; } }
    } else A.fid = 0;
    if (A.fid) {
      const k0 = A.fidK / 0.9; A.fidK += dt; const k = A.fidK / 0.9;
      if (k >= 1) A.fid = 0;
      else if (A.fid === 1) look = Math.sin(k * PI) * (A.seed > PI ? 0.85 : -0.85) * RM;
      else if (A.fid === 2) {
        if (k0 < 0.12 && k >= 0.12) A.sSq.v -= 2.4 * RM;
        if (k0 < 0.62 && k >= 0.62) A.sSq.v -= 3 * RM;
        if (k > 0.15 && k < 0.62) lift += 0.07 * Math.sin((k - 0.15) / 0.47 * PI) * RM;
      } else fRoll += Math.sin(k * TAU * 2) * 0.09 * (1 - k) * RM;
    }
    // pop-in
    let base = 1;
    if (A.spawnT < SPAWN_T) {
      A.spawnT += dt;
      if (A.spawnT <= 0) base = 0.001;
      else {
        const k = Math.min(1, A.spawnT / SPAWN_T);
        base = popIn(k);
        sy *= 1 + 0.25 * Math.sin(k * PI) * (1 - k);
        lift += 0.22 * Math.sin(Math.min(1, k * 1.25) * PI) * (fly ? 0.3 : 1);
        if (k >= 1) A.sSq.v -= 3.2;   // touchdown
      }
    }
    // springs (lean / roll tuning per robot size: heavier robots sway slower — set in Geo.robot)
    A.sLean.t = lean; A.sRoll.t = roll;
    springStep(A.sLean, dt); springStep(A.sRoll, dt); springStep(A.sSq, dt); springStep(A.sHead, dt);
    if (!lod) {
      // head: looks around when idle, leads into turns, steadies against the body lean, snaps on hits
      // (a given look target already sits ahead of a turning body, so the turn lead is mostly dropped there: adding it
      // in full swung the head past the target on every lock-on)
      const hasLook = opts.look != null && opts.look === opts.look;   // NaN look = unset
      let yl = A.yawRate * (hasLook ? 0.035 : 0.1); yl = yl > 0.35 ? 0.35 : yl < -0.35 ? -0.35 : yl;
      let lookT = (hasLook ? opts.look : state === 'idle' ? 0.38 * Math.sin(t * 0.55 + A.seed) + look : 0) + yl;
      lookT = (lookT > 1.1 ? 1.1 : lookT < -1.1 ? -1.1 : lookT) * D;
      A.hy = lookT + (A.hy - lookT) * e6;
      const hxT = -A.sLean.x * 0.3 * D;
      A.hx = hxT + (A.hx - hxT) * e10;
      P.head.rotation.set(A.hx, A.hy, (A.sHead.x + (state === 'hurt' ? Math.sin(t * 30) * 0.15 * A.recoil : 0) + Math.sin(t * 15 + A.seed) * 0.1 * A.stag * RM) * D);
      // arms
      const aim = opts.aim || 0;
      for (let si = 0; si < 2; si++) {
        const piv = si === 0 ? P.armL : P.armR; if (!piv) continue;
        const k2 = piv.userData.kind, pose = POSE[k2] || POSE.mitt, sd = si === 0 ? 1 : -1;
        const loose = k2 === 'mitt' || k2 === 'fist';
        let tx, ef = e12;
        if (state === 'attack') { tx = pose.attack - (loose ? 0 : aim); ef = k2 === 'hammer' || k2 === 'fist' ? e28 : e16; }
        else if (state === 'windup') tx = pose.windup + (k2 === 'mitt' ? Math.sin(t * 22 + sd) * 0.25 : 0);
        else if (state === 'stun') tx = -0.1 + Math.sin(t * 4 + sd) * 0.3;
        else if (state === 'hurt') tx = loose ? -0.9 : pose.idle + 0.4;
        else tx = pose.idle + (loose ? Math.sin(ph) * (k2 === 'fist' ? 0.35 : 0.55) * amp * sd + Math.sin(t * 2 + sd + A.seed) * 0.05 : Math.sin(t * 1.8 + sd + A.seed) * 0.04);
        if (loose) tx += -A.sLean.v * 0.05 + Math.sin(t * 16 + sd * 2) * 0.6 * A.stag * RM;   // trail the body, flail when staggered
        const bias = piv.userData.bias || 0, rz = sd * (loose ? 0.2 : 0.05);
        const xT = pose.idle + bias + (tx - pose.idle) * D, zT = rz + sd * (loose ? (state === 'windup' ? 0.25 : 0) + 0.35 * A.stag : 0) * D;
        let ax0 = si === 0 ? A.ax0 : A.ax1, az0 = si === 0 ? A.az0 : A.az1;
        ax0 = xT + (ax0 - xT) * ef; az0 = zT + (az0 - zT) * e10;
        if (si === 0) { A.ax0 = ax0; A.az0 = az0; } else { A.ax1 = ax0; A.az1 = az0; }
        piv.rotation.set(ax0, 0, az0);
        const w = piv.userData.weapon;
        if (w) {
          w.position.y = w.userData.baseY + A.kick * 0.07;
          if (k2 === 'saw') { A.saw += dt * (state === 'attack' || state === 'windup' ? 32 : moving ? 14 : 4); w.rotation.set(A.saw, 0, 0); }
          if (k2 === 'claw') w.scale.x = 1 + (state === 'attack' ? 0.2 * Math.sin(t * 24) : 0);
        }
      }
      if (r.cannons.length) {
        const cT = (-aim - (state === 'windup' ? 0.15 * (0.4 + we) : 0)) * D;
        A.cn = cT + (A.cn - cT) * e8;
        for (let i = 0; i < r.cannons.length; i++) r.cannons[i].rotation.set(A.cn, 0, 0);
      }
      // antenna: a whippy spring that lags the body (stays upright-ish, overshoots, wobbles out)
      if (P.antenna) {
        A.sAntX.t = -A.sLean.x * 0.9 - A.alf * 0.015 + Math.sin(t * 9 + A.seed) * 0.05 * amp;
        A.sAntZ.t = -A.sRoll.x * 0.9 + A.ala * 0.015;
        springStep(A.sAntX, dt); springStep(A.sAntZ, dt);
        const anx = A.sAntX.x, anz = A.sAntZ.x;
        P.antenna.rotation.set((anx > 0.9 ? 0.9 : anx < -0.9 ? -0.9 : anx) * D, 0, (P.antenna.userData.rz || 0) + (anz > 0.9 ? 0.9 : anz < -0.9 ? -0.9 : anz) * D);
      }
    }
    if (P.spark) { const sc = P.spark.scale; sc.x = sc.y = sc.z = 0.13 + 0.06 * Math.abs(Math.sin(t * 37)) + (state === 'windup' ? 0.1 : 0); }
    // flash (eased: a bright pop that fades over ~0.15 s) / telegraph
    if (opts.flash > 0 && opts.flash > A.flash) A.flash = opts.flash;
    A.flash = A.flash > 0.015 ? A.flash * e13 : 0;
    const fl = A.flash * 0.8;
    if (fl !== r.flash) r.setFlash(fl);
    if (opts.telegraph != null) { if (opts.telegraph !== r.tele) r.setTelegraph(opts.telegraph); A.teleAuto = false; }
    else if (state === 'windup') { r.setTelegraph(0.5 + 0.5 * Math.sin(A.st * 6 * TAU)); A.teleAuto = true; }
    else if (A.teleAuto) { r.setTelegraph(0); A.teleAuto = false; }
    // expression + blink
    const ex = opts.expr || (state === 'attack' || state === 'windup' ? 'focused' : state === 'hurt' ? 'hurt' : state === 'stun' ? 'dizzy' : r.mood);
    A.blinkT -= dt;
    if (A.blinkT <= 0) { A.blink = 0.13; A.blinkT = 2 + Math.random() * 3.2; }
    const canBlink = ex === 'idle' || ex === 'focused' || ex === 'alert';
    if (A.blink > 0) A.blink -= dt;
    const blinkOn = canBlink && A.blink > 0;
    if (ex !== r.expr || blinkOn !== r._blinkOn) { r.expr = ex; r._blinkOn = blinkOn; if (!blinkOn) A.blink = 0; r._applyFace(); }
    // apply
    A.lean = A.sLean.x + fLean; A.roll = A.sRoll.x + fRoll;
    if (lod) { P.body.rotation.set(0, 0, 0); const k = 1 - L.legH; P.rig.rotation.set(A.lean * k, 0, A.roll * k); }
    else { P.body.rotation.set(A.lean, 0, A.roll); P.rig.rotation.set(0, 0, 0); }
    P.body.position.x = state === 'windup' && !lod ? Math.sin(t * 55) * (0.004 + 0.012 * we) * RM : 0;
    P.rig.position.y = r.alt + lift * S;
    let q = sy * (1 + A.sSq.x); q = q > 1.6 ? 1.6 : q < 0.55 ? 0.55 : q;
    const qs = base / Math.sqrt(q), rs = P.rig.scale;
    rs.x = qs; rs.y = q * base; rs.z = qs;
    const shk = r._shadowBase * 2.2 * Math.min(1, Math.max(0.45, 1 - (r.alt + lift * S) / 8)) * (base < 1 ? base : 1), ss = P.shadow.scale;
    ss.x = ss.y = ss.z = shk;
    return false;
  };
  // Death: squash down (anticipation), inhale (stretch up), POP (puff up round and vanish). ROBOT_POP_AT = burst moment.
  const POP_AT = 0.15, POP_END = 0.27;
  Geo.ROBOT_POP_AT = POP_AT;
  function popRobot(r, dt) {
    const A = r.anim, P = r.parts;
    A.deadT += dt;
    const T = A.deadT;
    let sx, sy, m = 1;
    if (T < 0.08) { const k = easeOut(T / 0.08); sx = lerp(1, 1.24, k); sy = lerp(1, 0.7, k); }
    else if (T < POP_AT) { const k = smooth01((T - 0.08) / (POP_AT - 0.08)); sx = lerp(1.24, 0.86, k); sy = lerp(0.7, 1.32, k); }
    else {
      const k = clamp((T - POP_AT) / (POP_END - POP_AT), 0, 1), q = easeOut(Math.min(1, k / 0.3));
      sx = lerp(0.86, 1.2, q); sy = lerp(1.32, 1.08, q);
      m = k < 0.3 ? 1 + 0.32 * q : Math.max(0.001, 1.32 * (1 - smooth01((k - 0.3) / 0.7)));
    }
    P.rig.scale.set(sx * m, sy * m, sx * m);
    P.rig.rotation.z = T < POP_AT ? Math.sin(T * 95) * 0.05 * motionK() : 0;
    P.shadow.scale.setScalar(r._shadowBase * 2.2 * Math.max(0.001, m * Math.min(1, sx)));
    if (r.expr !== 'dizzy') { r.expr = 'dizzy'; r._applyFace(); } // GDD: popped = spiral eyes
    r.setFlash(Math.min(1, 0.25 + T * 7));
    if (T >= POP_END) { r.group.visible = false; r.popped = true; return true; }
    return false;
  }

  // ------------------------------------------------------------------ critters (ambient jelly life)
  const PASTELS = [0xff8fc0, 0x8fe3ff, 0xffd45c, 0xa8f08a, 0xc9a8ff, 0xffb37a];
  Geo.critter = function (kind, color) {
    kind = ['blob', 'bunnyblob', 'puffbird', 'snailbot'].indexOf(kind) >= 0 ? kind : 'blob';
    const col = color != null ? hexOf(color) : PASTELS[(Math.random() * PASTELS.length) | 0];
    const group = new THREE.Group(); group.name = 'critter-' + kind;
    const rig = new THREE.Group(); rig.name = 'rig'; group.add(rig);
    const mat = jellyMat(), fMat = faceMat(null);
    const parts = { rig, body: null, face: null, ears: null, wings: [], head: null, eyes: null };
    const light = shade(col, 1.25), dark = shade(col, 0.8);
    let P, F, faceOpts = { style: 'toon' }, shadowR = 0.3, hopH = 0.45;
    const key = 'cr|' + kind + '|' + col;
    if (kind === 'blob' || kind === 'bunnyblob') {
      P = kind === 'blob' ? { a: 0.3, b: 0.26, c: 0.29, e1: 0.85, e2: 1, t: -0.12, cy: 0.26 } : { a: 0.27, b: 0.24, c: 0.26, e1: 0.85, e2: 1, t: -0.1, cy: 0.24 };
      F = { latC: 0.08, w: 1.45, h: 1.15 };
      parts.body = new THREE.Mesh(cg(key + '|b', () => {
        const k = kit();
        addShell(k, P, col, [18, 12], { grad: 0.22 });
        if (kind === 'blob') k.add(U.sq(1, 1, -0.7, 10, 6), light, [0, P.cy + P.b + 0.03, -0.03], [-0.35, 0, 0], [0.06, 0.09, 0.06], { grad: 0.15 });
        else k.add(U.sph(8, 6), 0xffffff, [0, P.cy - 0.02, -P.c - 0.02], null, 0.075);
        return k.build();
      }), mat);
      rig.add(parts.body);
      if (kind === 'bunnyblob') {
        const ears = new THREE.Group(); ears.position.y = P.cy + P.b * 0.85; rig.add(ears);
        ears.add(new THREE.Mesh(cg(key + '|ears', () => {
          const k = kit();
          for (const sd of [-1, 1]) {
            k.add(U.sq(0.9, 1, -0.2, 10, 6), col, [sd * 0.1, 0.17, -0.02], [0, 0, -sd * 0.28], [0.06, 0.2, 0.04], { grad: 0.18 });
            k.add(U.sq(0.9, 1, -0.2, 8, 5), 0xffb3cf, [sd * 0.1 + sd * 0.01, 0.17, 0.018], [0, 0, -sd * 0.28], [0.035, 0.15, 0.012]);
          }
          return k.build();
        }), mat));
        parts.ears = ears; hopH = 0.7;
      }
    } else if (kind === 'puffbird') {
      P = { a: 0.26, b: 0.25, c: 0.25, e1: 1, e2: 1, t: 0, cy: 0.3 };
      F = { latC: 0.38, w: 1.35, h: 0.95 };
      faceOpts = { style: 'toon', mouth: false };
      parts.body = new THREE.Mesh(cg(key + '|b', () => {
        const k = kit();
        addShell(k, P, col, [18, 12], { grad: 0.2 });
        k.add(U.sph(12, 8), shade(col, 1.45), [0, 0.24, 0.12], null, [0.19, 0.17, 0.14]);
        k.add(U.cone(8), 0xffa53d, [0, 0.31, 0.27], [HP, 0, 0], [0.05, 0.1, 0.04]);
        for (let i = -1; i <= 1; i++) k.add(U.sq(1, 1, -0.6, 8, 5), dark, [i * 0.05, P.cy + P.b + 0.04 - Math.abs(i) * 0.02, 0.02], [-0.25, 0, i * 0.5], [0.03, 0.07, 0.03]);
        for (const sd of [-1, 1]) {
          k.add(U.sq(1, 1, 0, 8, 6), dark, [sd * 0.05, 0.34, -0.27], [0.9, sd * 0.3, 0], [0.04, 0.1, 0.02]);
          k.add(U.cyl(1, 6), 0xffa53d, [sd * 0.08, 0.04, 0.03], null, [0.015, 0.08, 0.015]);
          k.add(U.sph(8, 5), 0xffa53d, [sd * 0.08, 0.012, 0.05], null, [0.04, 0.015, 0.05]);
        }
        return k.build();
      }), mat);
      rig.add(parts.body);
      const wg = cg(key + '|w', () => { const k = kit(); k.add(U.sq(1, 1, 0, 10, 6), dark, [0, -0.08, 0], null, [0.035, 0.12, 0.1], { grad: 0.2 }); return k.build(); });
      for (const sd of [-1, 1]) { const w = new THREE.Group(); w.position.set(sd * 0.24, 0.34, -0.01); w.add(new THREE.Mesh(wg, mat)); w.userData.sd = sd; rig.add(w); parts.wings.push(w); }
      hopH = 0.32; shadowR = 0.27;
    } else {
      // snailbot: soft slug + robot shell + glowing eye-stalk antennae
      P = { a: 0.14, b: 0.13, c: 0.13, e1: 1, e2: 1, t: 0, cy: 0.17 };
      F = { latC: 0.1, w: 1.6, h: 1.3 };
      parts.body = new THREE.Mesh(cg(key + '|b', () => {
        const k = kit(), metal = 0xd6dcef;
        k.add(U.sq(0.8, 0.8, 0, 16, 10), col, [0, 0.09, 0], null, [0.15, 0.09, 0.4], { grad: 0.2 });
        k.add(U.sph(16, 12), metal, [0, 0.3, -0.08], null, [0.2, 0.21, 0.21], { grad: 0.15 });
        for (const r of [0.205, 0.14, 0.08]) k.add(U.tor(0.13, 5, 22), mixHex(col, 0x3d4470, 0.25), [0, 0.31 + (0.205 - r) * 0.2, -0.08 - (0.205 - r) * 0.2], [0, HP, 0], [r, r, r * 0.5]);
        k.add(U.cyl(1, 8), 0x7a86c8, [0, 0.52, -0.1], null, [0.025, 0.06, 0.025]);
        return k.build();
      }), mat);
      rig.add(parts.body);
      const head = new THREE.Group(); head.position.set(0, 0.0, 0.26); rig.add(head); parts.head = head;
      head.add(new THREE.Mesh(cg(key + '|h', () => {
        const k = kit();
        addShell(k, P, col, [16, 10], { grad: 0.2 });
        for (const sd of [-1, 1]) {
          k.bone(shade(col, 0.9), [sd * 0.05, P.cy + 0.1, 0], [sd * 0.09, P.cy + 0.26, 0.02], 0.014);
          k.add(U.sph(8, 6), 0x7ff3ff, [sd * 0.09, P.cy + 0.27, 0.02], null, 0.035, { bright: 1.6 });
        }
        return k.build();
      }), mat));
      hopH = 0; shadowR = 0.3;
    }
    const face = facePatch(P, F, fMat, 1.02);
    (parts.head || rig).add(face);
    parts.face = parts.eyes = face;
    const shadow = G.R.blobShadow(shadowR); shadow.position.y = 0.02; group.add(shadow); parts.shadow = shadow;
    const c = {
      group, parts, kind, color: col, airborne: false, sleeping: false, hopHeight: hopH,
      anim: { timer: 0.5 + Math.random() * 2.5, hopP: 0, hopping: false, blinkT: 1 + Math.random() * 3, blink: 0, exprT: 0, seed: Math.random() * TAU, ex: '' },
      expr: 'idle',
      setExpr(e) { c.expr = e || 'idle'; c.anim.exprT = 0; apply(); },
      hop() { if (!c.anim.hopping && hopH > 0) { c.anim.hopping = true; c.anim.hopP = 0; } },
      dispose() { if (group.parent) group.parent.remove(group); fMat.dispose(); },
    };
    function apply() {
      const ex = c.sleeping ? 'sleep' : c.anim.blink > 0 ? 'blink' : c.anim.exprT > 0 ? c.anim.tempEx : c.expr;
      if (ex === c.anim.ex) return;
      c.anim.ex = ex;
      const tex = Geo.face(ex, faceOpts);
      if (!fMat.map) fMat.needsUpdate = true;   // null -> texture changes the program; texture -> texture does not
      fMat.map = tex;
    }
    c._apply = apply;
    apply();
    return c;
  };
  Geo.animateCritter = function (c, t, dt) {
    const A = c.anim, P = c.parts;
    autoLayers(c);
    let sy = 1 + 0.03 * Math.sin(t * TAU * 1.1 + A.seed), y = 0;
    if (c.kind === 'snailbot') {
      const cr = Math.sin(t * 2.2 + A.seed);
      P.rig.scale.set(1, 1 + 0.03 * cr, 1 + 0.07 * cr);
      if (P.head) { P.head.position.z = 0.26 + 0.03 * cr; P.head.rotation.z = 0.08 * Math.sin(t * 1.3 + A.seed); }
      c.airborne = false;
    } else {
      if (!c.sleeping) A.timer -= dt;
      if (!A.hopping && A.timer <= 0) { A.hopping = true; A.hopP = 0; }
      if (A.hopping) {
        A.hopP += dt / 0.85;
        const h = hopCurve(A.hopP);
        y = h.y * c.hopHeight; sy = h.sy;
        if (A.hopP >= 1) { A.hopping = false; A.timer = 1.4 + Math.random() * 2.8; if (Math.random() < 0.35) { A.exprT = 1.4; A.tempEx = Math.random() < 0.5 ? 'happy' : 'wink'; } }
      }
      c.airborne = A.hopping && A.hopP > 0.2 && A.hopP < 0.78;
      P.rig.position.y = y;
      squash(P.rig, sy);
      if (P.ears) P.ears.rotation.x = damp(P.ears.rotation.x, c.airborne ? -0.5 * (y > 0 ? 1 : 0) : (sy < 1 ? 0.35 : 0) + 0.05 * Math.sin(t * 3 + A.seed), 14, dt);
      for (const w of P.wings) w.rotation.z = w.userData.sd * (c.airborne ? 0.6 + 0.6 * Math.sin(t * 40) : 0.08 + 0.08 * Math.sin(t * 5 + A.seed));
    }
    P.shadow.scale.setScalar(2.2 * (c.kind === 'snailbot' ? 0.32 : 0.28) * clamp(1 - y * 0.6, 0.5, 1));
    // blink + temporary expressions
    A.blinkT -= dt;
    if (A.blinkT <= 0) { A.blink = 0.12; A.blinkT = 2 + Math.random() * 3; }
    if (A.blink > 0) A.blink -= dt;
    if (A.exprT > 0) A.exprT -= dt;
    c._apply();
  };

  // ------------------------------------------------------------------ NPCs
  // GDD §1.4 / §10 cast. Hub ids map: quill→guildmaster, gizma→mechanic, penny→merchant, bloop→chef,
  // lumi→curator, ping→coach, ace→pilot, beepo→companion; extras: kiko (hero), mox (villain), gale.
  const NPC_KINDS = Geo.NPC_KINDS = ['guildmaster', 'mechanic', 'merchant', 'pilot', 'coach', 'chef', 'curator', 'companion', 'kiko', 'mox', 'gale'];
  // Display names are English fallbacks (UI text should use i18n npc.* keys).
  Geo.npcInfo = {
    guildmaster: { name: 'Quill', color: 0x3d55b8 }, mechanic: { name: 'Gizma', color: 0xff8a4c },
    merchant: { name: 'Penny Pop', color: 0xff6fb5 }, pilot: { name: 'Ace Wobble', color: 0x3fa9ff },
    coach: { name: 'Coach Ping', color: 0xffd23f }, chef: { name: 'Barista Bloop', color: 0x3ddc97 },
    curator: { name: 'Curator Lumi', color: 0xffd45c }, companion: { name: 'Beepo', color: 0x39d5ff },
    kiko: { name: 'Kiko', color: 0x2ec4b6 }, mox: { name: 'Mega-Mayor Mox', color: 0xff5d73 }, gale: { name: 'Captain Gale', color: 0x2e3f8f },
  };
  const SKIN = 0xffdcc8, GILL = 0xff9fc2;
  function npcArmGeo(col, glove, r, len) {
    const k = kit();
    k.add(U.sph(8, 6), col, [0, 0, 0], null, r * 1.5);
    k.add(U.cap(r, len * 0.6, 6, 1), col === SKIN ? SKIN : 0x5a6290, [0, -len * 0.48, 0]);
    k.add(U.sph(9, 6), glove, [0, -len, 0], null, [r * 1.75, r * 1.65, r * 1.75], { grad: 0.1 });
    return k.build();
  }
  function hoverBits(k, y, ring) {
    k.add(U.cyl(1.5, 14), 0x5a6290, [0, y, 0], null, [0.11, 0.09, 0.11]);
    k.add(U.tor(0.2, 4, 16), ring, [0, y - 0.045, 0], [HP, 0, 0], 0.12);
  }
  function addGlowUnder(parent, color, y, r, len) {
    const j = flame(color); j.name = 'glow';
    j.position.set(0, y, 0); j.rotation.x = HP; j.scale.set(r, r, len); parent.add(j);
    return j;
  }
  function shellPt(P, lat, lon, off) { const q = sqPt(P, lat, lon); return arr(q.p.addScaledVector(q.n, off || 0)); }
  function cap(P, lat0) { // dome cap over a shell from lat0 to the pole
    return cg(`cap|${P.e1}|${P.e2}|${P.t || 0}|${lat0}`, () => sqGeo(P.e1, P.e2, { taper: P.t, lat0, lat1: HP, ws: 16, hs: 5 }));
  }
  function patchG(P, lat0, lat1, lonW, ws) { // curved panel on a shell (front-centred)
    return cg(`pg|${P.e1}|${P.e2}|${P.t || 0}|${lat0}|${lat1}|${lonW}`, () => sqGeo(P.e1, P.e2, { taper: P.t, lat0, lat1, lon0: HP - lonW / 2, lon1: HP + lonW / 2, ws: ws || 10, hs: 6 }));
  }
  const glassMat = () => G.M.toon(0xdff6ff, { transparent: true, opacity: 0.32, spec: 1, rimStr: 0.85, rimPow: 2.2 });
  const visorMat = () => G.M.toon(0xc8f2ff, { transparent: true, opacity: 0.36, spec: 1, rimStr: 1.1, rimPow: 1.8, rimColor: 0xffffff });
  const gills = (k, x, y, z, sd, col) => { for (let i = 0; i < 3; i++) k.add(U.sq(1, 1, -0.4, 8, 5), col, [x + sd * 0.03, y + 0.06 - i * 0.055, z - i * 0.01], [0, 0, sd * (0.9 + i * 0.35)], [0.03, 0.075, 0.025], { grad: 0.15 }); };
  const bowTie = (k, p, col) => { for (const sd of [-1, 1]) k.add(U.cone(6), col, [p[0] + sd * 0.045, p[1], p[2]], [0, 0, sd * HP], [0.04, 0.075, 0.022]); k.add(U.sph(6, 4), shade(col, 0.85), p, null, 0.022); };

  const NPC_BUILD = {
    guildmaster(n) { // Quill: clipboard-bot with a bow tie, guild cap + quill feather, monocle
      const B = { a: 0.33, b: 0.4, c: 0.31, e1: 1, e2: 1, t: -0.14, cy: 0.4 }, H = { a: 0.24, b: 0.21, c: 0.23, e1: 1, e2: 1, t: 0, cy: 0.19 };
      n.hover = true; n.bodyY = 0.3; n.glowColor = 0x7ff3ff;
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0x3d55b8, [18, 12], { grad: 0.16 });
        addBand(k, B, -0.55, 0xffd23f, 0.03, 1.01);
        k.add(U.sq(1, 1, -0.1, 12, 8), 0xfff1dc, shellPt(B, 0.0, HP, -0.08), [-0.12, 0, 0], [0.17, 0.25, 0.1], { grad: 0.1 });
        for (const lat of [0.2, 0.0, -0.2]) k.add(U.sph(6, 4), 0xffd23f, shellPt(B, lat, HP, 0.01), null, 0.026);
        const st = sqPt(B, 0.28, HP - 0.6); emblemInto(k, 'star', 0xffd23f, st.p, st.n, 0.055);
        bowTie(k, shellPt(B, 0.86, HP, 0.03), 0xff5d73);
        hoverBits(k, -0.03, 0xffd23f);
        k.add(U.cyl(1, 10), 0x5a6290, [0, 0.82, 0], null, [0.07, 0.08, 0.07]);
        return k.build();
      };
      n.head = { y: 0.84, P: H, F: { latC: 0.06, w: 1.55, h: 1.15 }, face: { style: 'led', color: 0x3fe0b8, eyes: 'two' } };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, 0xfff1dc, [16, 11], { grad: 0.1 });
        const top = H.cy + H.b;
        k.add(U.cyl(0.95, 14), 0x2b3170, [0, top + 0.02, -0.01], [-0.12, 0, 0], [0.18, 0.13, 0.18], { grad: 0.2 });
        k.add(U.cyl(1, 16), 0x2b3170, [0, top - 0.04, 0.0], [-0.12, 0, 0], [0.235, 0.025, 0.235]);
        k.add(U.tor(0.14, 4, 16), 0xffd23f, [0, top - 0.02, 0.0], [HP - 0.12, 0, 0], 0.185);
        emblemInto(k, 'bolt', 0xffd23f, new V3(0, top + 0.03, 0.17), new V3(0, 0.1, 1), 0.05);
        k.add(U.sq(1, 1, -0.3, 10, 6), 0xff6b8b, [0.14, top + 0.17, -0.06], [-0.55, 0, -0.35], [0.045, 0.2, 0.014]);
        k.add(U.cyl(1, 5), 0xfff1dc, [0.14, top + 0.17, -0.055], [-0.55, 0, -0.35], [0.006, 0.38, 0.006]);
        const q = sqPt(H, 0.12, HP - 0.29);
        k.orient(U.tor(0.16, 5, 16), 0xffd23f, arr(q.p.addScaledVector(q.n, 0.015)), q.n, 'z', 0.06);
        k.add(U.sph(6, 4), 0xffd23f, [q.p.x + 0.02, q.p.y - 0.06, q.p.z - 0.01], null, 0.012);
        return k.build();
      };
      n.arms = { y: 0.52, x: 0.33, r: 0.04, len: 0.3, col: 0x3d55b8, glove: 0xfff1dc };
      n.holdL = () => { const k = kit(); k.add(U.sq(0.3, 0.3, 0, 8, 4), 0xb07a4a, [0, 0.1, 0.06], null, [0.13, 0.17, 0.014]); k.add(U.sq(0.3, 0.3, 0, 8, 4), 0xfff8ea, [0, 0.09, 0.075], null, [0.11, 0.14, 0.006]); for (let i = 0; i < 3; i++) k.add(U.box(), 0x8f8ac9, [-0.01, 0.15 - i * 0.045, 0.083], null, [0.12, 0.012, 0.004]); k.add(U.sq(0.4, 0.4, 0, 6, 4), 0xc9cfe6, [0, 0.26, 0.075], null, [0.045, 0.02, 0.02]); return k.build(); };
      n.poseL = -0.65; n.special = 'check';
    },
    mechanic(n) { // Gizma: stout welder-bot with a flip-up mask
      const B = { a: 0.37, b: 0.3, c: 0.34, e1: 0.35, e2: 1, t: 0, cy: 0.3 }, H = { a: 0.27, b: 0.25, c: 0.27, e1: 1, e2: 1, t: 0, cy: 0.05 };
      n.bodyY = 0.2;
      n.baseGeo = () => {
        const k = kit();
        for (const sd of [-1, 1]) {
          k.add(U.cap(0.1, 0.34, 10), TIRE, [sd * 0.25, 0.1, 0], [HP, 0, 0], [0.9, 1, 1]);
          for (const z of [-0.16, 0, 0.16]) k.add(U.cyl(1, 8), 0xffd23f, [sd * 0.335, 0.1, z], [0, 0, HP], [0.05, 0.03, 0.05]);
        }
        k.add(U.sq(0.35, 0.35, 0, 12, 4), 0x5a6290, [0, 0.19, 0], null, [0.3, 0.035, 0.22]);
        return k.build();
      };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0xff8a4c, [18, 12], { grad: 0.16 });
        k.add(U.sq(0.4, 0.5, 0, 12, 6), 0x33b5ff, [0, 0.27, 0.315], null, [0.22, 0.16, 0.04], { grad: 0.1 });
        k.add(U.sq(0.4, 0.4, 0, 8, 4), 0x2a8fd6, [0, 0.22, 0.352], null, [0.08, 0.05, 0.012]);
        for (const sd of [-1, 1]) { k.bone(0x33b5ff, [sd * 0.15, 0.4, 0.3], [sd * 0.2, 0.6, 0.02], 0.024); k.add(U.sph(6, 4), 0xffd23f, [sd * 0.15, 0.4, 0.33], null, 0.022); }
        addBand(k, B, -0.75, 0x8a5a3c, 0.035, 1.03);
        k.add(U.cyl(1, 6), 0xff4d5e, [0.3, 0.12, 0.2], [0, 0, -0.3], [0.025, 0.14, 0.025]);
        k.add(U.cyl(1, 6), 0xffd23f, [-0.31, 0.12, 0.18], [0, 0, 0.3], [0.022, 0.12, 0.022]);
        k.add(U.cyl(1, 14), 0x5a6290, [0, 0.6, 0], null, [0.24, 0.03, 0.24]);
        return k.build();
      };
      n.head = { y: 0.6, P: H, F: { latC: 0.08, w: 1.55, h: 1.05 }, face: { style: 'toon' } };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, 0xd9def5, [16, 11], { grad: 0.12 });
        // welding mask flipped up onto the dome (hinged at the sides)
        const Pm = Object.assign({}, H, { cy: 0 }), tilt = [-1.15, 0, 0];
        k.add(patchG(Pm, -0.15, 0.75, 1.9, 12), 0x5b3a8c, [0, H.cy, 0], tilt, [H.a * 1.13, H.b * 1.13, H.c * 1.13], { grad: 0.15 });
        k.add(patchG(Pm, 0.22, 0.42, 1.05, 8), 0x2fd4ff, [0, H.cy, 0], tilt, [H.a * 1.15, H.b * 1.15, H.c * 1.15], { bright: 1.25 });
        for (const sd of [-1, 1]) k.add(U.cyl(1, 10), 0xe8b44a, [sd * (H.a + 0.03), H.cy, 0], [0, 0, HP], [0.055, 0.04, 0.055]);
        return k.build();
      };
      n.arms = { y: 0.42, x: 0.39, r: 0.05, len: 0.3, col: 0xff8a4c, glove: 0xffd23f };
      n.holdR = () => { const k = kit(); k.add(U.cyl(1, 8), 0xc9cfe6, [0, 0.18, 0], null, [0.022, 0.36, 0.022]); k.add(U.tor(0.32, 5, 12, PI * 1.4), 0xc9cfe6, [0, 0.4, 0], [0, 0, -PI * 0.2], 0.06); k.add(U.sq(0.5, 0.5, 0, 6, 4), 0xc9cfe6, [0, 0.33, 0], null, [0.035, 0.03, 0.022]); return k.build(); };
      n.poseR = -0.55; n.special = 'tap';
    },
    merchant(n) { // Penny Pop: gumball-machine bot
      const B = { a: 0.3, b: 0.3, c: 0.3, e1: 0.35, e2: 1, t: 0, cy: 0.3 };
      n.bodyY = 0.1;
      n.baseGeo = () => { const k = kit(); for (let i = 0; i < 4; i++) { const a = HP / 2 + i * HP; k.add(U.sph(8, 6), TIRE, [Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22], null, 0.05); k.add(U.cyl(1, 6), 0x5a6290, [Math.cos(a) * 0.22, 0.1, Math.sin(a) * 0.22], null, [0.02, 0.06, 0.02]); } return k.build(); };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0xff6fb5, [18, 12], { grad: 0.14 });
        addBand(k, B, -1.2, 0xfff1dc, 0.03, 1.0);
        k.add(U.sq(0.4, 0.4, 0, 8, 4), 0xe8b44a, shellPt(B, -0.62, HP, -0.01), [-0.2, 0, 0], [0.09, 0.05, 0.02]);
        k.add(U.box(), 0x2a1b3d, shellPt(B, -0.62, HP, 0.012), [-0.2, 0, 0], [0.11, 0.014, 0.01]);
        const cr = sqPt(B, -0.1, 0.0);
        k.add(U.cyl(1, 8), 0xc9cfe6, arr(cr.p.clone().addScaledVector(cr.n, 0.04)), [0, 0, HP], [0.025, 0.08, 0.025]);
        k.add(U.cyl(1, 10), 0xc9cfe6, arr(cr.p.clone().addScaledVector(cr.n, 0.08)), [0, 0, HP], [0.06, 0.02, 0.06]);
        k.add(U.sph(8, 6), 0xff4d5e, arr(cr.p.clone().addScaledVector(cr.n, 0.09).add(new V3(0, 0.05, 0))), null, 0.03);
        k.add(U.tor(0.16, 5, 22), 0xd6dcef, [0, 2 * B.b, 0], [HP, 0, 0], 0.22);
        k.add(U.cyl(1, 18), 0xd6dcef, [0, 2 * B.b - 0.01, 0], null, [0.22, 0.04, 0.22]);
        return k.build();
      };
      n.faceOn = { P: B, F: { latC: 0.3, w: 1.45, h: 0.8 }, face: { style: 'led', color: 0xffe45c, eyes: 'two' } };
      n.top = {
        y: 2 * B.b + 0.27,
        geo: () => {
          const k = kit(), cols = [0xffd23f, 0x3fe0b8, 0x33b5ff, 0xb26bff, 0xff8a4c, 0xff4d5e, 0x9be15d, 0xffffff, 0xff7ab8];
          const rnd = G.rng(7);
          for (let i = 0; i < 18; i++) { const a = rnd() * TAU, rr2 = Math.sqrt(rnd()) * 0.17, y = -0.17 + rnd() * 0.2 + (0.17 - rr2) * 0.3; k.add(U.sph(7, 5), cols[i % cols.length], [Math.cos(a) * rr2, y, Math.sin(a) * rr2], null, 0.065, { bright: 1.05 }); }
          k.add(U.sq(1, 1, 0, 12, 4), 0xd6dcef, [0, 0.27, 0], null, [0.11, 0.05, 0.11], { grad: 0.15 });
          k.add(U.sph(8, 6), 0xff4d5e, [0, 0.33, 0], null, 0.04);
          return k.build();
        },
        glass: { p: [0, 0, 0], s: [0.27, 0.27, 0.27] },
      };
      n.arms = { y: 0.34, x: 0.32, r: 0.036, len: 0.26, col: 0xff6fb5, glove: 0xfff1dc };
      n.holdL = () => { const k = kit(); k.add(U.cyl(1, 14), 0xffc93c, [0, 0.03, 0.04], [HP, 0, 0], [0.06, 0.018, 0.06]); k.add(U.cyl(1, 6), 0xffe9a0, [0, 0.03, 0.05], [HP, 0, 0], [0.03, 0.02, 0.03]); return k.build(); };
      n.poseL = -0.9; n.special = 'open';
    },
    pilot(n) { // Ace Wobble: Marmalunian pilot with goggles
      const B = { a: 0.23, b: 0.27, c: 0.21, e1: 0.7, e2: 1, t: -0.08, cy: 0.27 }, H = { a: 0.26, b: 0.24, c: 0.24, e1: 1, e2: 1, t: 0, cy: 0.2 };
      n.bodyY = 0.3; n.legs = { x: 0.1, h: 0.3, col: 0x5a6290, boot: 0x9a5b3c };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0x3fa9ff, [16, 10], { grad: 0.16 });
        k.add(U.box(), 0xffd23f, shellPt(B, 0.0, HP, 0.004), null, [0.018, 0.4, 0.01]);
        addBand(k, B, -0.75, 0x2a6fc0, 0.03, 1.01);
        addBand(k, B, 0.85, 0xff6b3d, 0.05, 1.08);
        k.add(U.sq(1, 1, 0, 8, 5), 0xffd23f, shellPt(B, 0.35, HP - 0.55, 0.0), [0, 0.5, 0], [0.06, 0.02, 0.012]);
        for (const sd of [-1, 1]) { k.add(U.cap(0.05, 0.12, 8), 0xc9cfe6, [sd * 0.08, 0.32, -B.c - 0.03]); k.add(U.cyl(1.4, 8, true), 0x5a6290, [sd * 0.08, 0.2, -B.c - 0.03], null, [0.04, 0.05, 0.04]); }
        return k.build();
      };
      n.head = { y: 0.52, P: H, F: { latC: 0.0, w: 1.5, h: 1.05 }, face: { style: 'toon' } };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, SKIN, [16, 11], { grad: 0.1 });
        k.add(cap(Object.assign({}, H), 0.55), 0x9a5b3c, [0, H.cy, 0], null, [H.a * 1.05, H.b * 1.05, H.c * 1.05], { grad: 0.15 });
        for (const sd of [-1, 1]) {
          gills(k, sd * H.a * 0.98, H.cy, -0.02, sd, GILL);
          const q = sqPt(H, 0.78, HP + sd * 0.36);
          k.orient(U.cyl(1, 10), 0xe8b44a, arr(q.p.clone().addScaledVector(q.n, 0.04)), q.n, 'y', [0.058, 0.04, 0.058]);
          k.orient(U.cyl(1, 10), 0xffa53d, arr(q.p.clone().addScaledVector(q.n, 0.062)), q.n, 'y', [0.045, 0.006, 0.045], { bright: 1.25 });
        }
        k.add(U.tor(0.08, 4, 22), 0x5b3a3a, [0, H.cy + H.b * 0.72, -0.02], [HP + 0.35, 0, 0], H.a * 0.78);
        return k.build();
      };
      n.arms = { y: 0.4, x: 0.25, r: 0.036, len: 0.26, col: 0x3fa9ff, glove: 0xf3faff };
      n.scarf = { y: 0.52, z: -B.c * 0.6 };
      n.jets = [[-0.08, 0.14, -B.c - 0.03], [0.08, 0.14, -B.c - 0.03]];
      n.special = 'salute';
    },
    coach(n) { // Coach Ping: whistle-faced drone
      const B = { a: 0.3, b: 0.28, c: 0.28, e1: 1, e2: 1, t: 0, cy: 0.28 };
      n.hover = true; n.bodyY = 0.45; n.glowColor = 0xfff06a; n.small = false;
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0xffd23f, [18, 12], { grad: 0.16 });
        addBand(k, B, -0.35, 0xff4d5e, 0.03, 1.01);
        addBand(k, B, 0.62, 0xff4d5e, 0.045, 1.03);
        addBand(k, B, 0.62, 0xffffff, 0.015, 1.06);
        const w = sqPt(B, -0.12, HP);
        k.add(U.cap(0.04, 0.08, 10), 0xd6dcef, arr(w.p.clone().addScaledVector(w.n, 0.05)), [HP, 0, 0]);
        k.add(U.cyl(1, 10), 0xc9cfe6, arr(w.p.clone().addScaledVector(w.n, 0.11)), [HP, 0, 0], [0.025, 0.02, 0.025]);
        k.add(U.sph(6, 4), 0xff4d5e, arr(w.p.clone().addScaledVector(w.n, 0.06).add(new V3(0, 0.035, 0))), null, 0.016);
        k.add(U.cyl(1.4, 12), 0x5a6290, [0, 0.0, 0], null, [0.08, 0.06, 0.08]);
        k.add(U.cyl(1, 8), 0x5a6290, [0, 2 * B.b + 0.03, 0], null, [0.025, 0.08, 0.025]);
        return k.build();
      };
      n.faceOn = { P: B, F: { latC: 0.28, w: 1.5, h: 0.85 }, face: { style: 'led', color: 0xff4d5e, eyes: 'two', mouth: false } };
      n.prop = { y: 2 * B.b + 0.08, col: 0xff4d5e };
      n.arms = { y: 0.24, x: 0.31, r: 0.034, len: 0.24, col: 0xffd23f, glove: 0xffffff };
      n.holdR = () => { const k = kit(); k.add(U.cyl(1, 14), 0xd6dcef, [0, 0.05, 0.03], [HP, 0, 0], [0.055, 0.025, 0.055]); k.add(U.cyl(1, 14), 0xffffff, [0, 0.05, 0.045], [HP, 0, 0], [0.045, 0.01, 0.045]); k.add(U.cyl(1, 6), 0xff4d5e, [0, 0.115, 0.03], null, [0.012, 0.03, 0.012]); return k.build(); };
      n.poseR = -0.8; n.special = 'pump';
    },
    chef(n) { // Barista Bloop: friendly (sleepy) jelly blob in an apron
      const B = { a: 0.42, b: 0.37, c: 0.4, e1: 0.85, e2: 1, t: -0.15, cy: 0.37 };
      n.bodyY = 0; n.jelly = true; n.idleExpr = 'blink';
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0x3ddc97, [20, 13], { grad: 0.24 });
        k.add(U.sq(1, 1, -0.7, 10, 6), shade(0x3ddc97, 1.2), [0.02, 2 * B.b + 0.03, -0.03], [-0.4, 0, -0.3], [0.06, 0.1, 0.06], { grad: 0.15 });
        k.add(patchG(Object.assign({}, B, { cy: 0 }), -0.95, -0.05, 1.5, 12), 0xfff6e0, [0, B.cy, 0], null, [B.a * 1.025, B.b * 1.025, B.c * 1.025], { grad: 0.08 });
        k.add(patchG(Object.assign({}, B, { cy: 0 }), -0.6, -0.32, 0.5, 6), 0xff8fc0, [0, B.cy, 0], null, [B.a * 1.035, B.b * 1.035, B.c * 1.035]);
        addBand(k, B, -0.05, 0xff8fc0, 0.018, 1.02);
        k.add(U.cyl(1, 14), 0xfff6e0, [0.06, 2 * B.b + 0.0, 0.02], [0, 0, -0.25], [0.13, 0.05, 0.13]);
        k.add(U.cyl(1, 14), 0xff8fc0, [0.06, 2 * B.b - 0.02, 0.02], [0, 0, -0.25], [0.135, 0.015, 0.135]);
        return k.build();
      };
      n.faceOn = { P: B, F: { latC: 0.25, w: 1.4, h: 0.95 }, face: { style: 'toon' } };
      n.arms = { y: 0.3, x: 0.44, r: 0.04, len: 0, col: 0x3ddc97, glove: 0x3ddc97, floating: true, jelly: true };
      n.holdR = () => { const k = kit(); k.add(U.cyl(0.8, 12), 0xff8fc0, [0, 0.1, 0.05], [0, 0, 0], [0.06, 0.14, 0.06]); k.add(U.sph(8, 5), 0xfff6e0, [0, 0.18, 0.05], null, [0.065, 0.03, 0.065]); k.add(U.cyl(1, 5), 0x7ff3ff, [0.02, 0.24, 0.05], [0, 0, -0.2], [0.008, 0.14, 0.008]); return k.build(); };
      n.poseR = 0; n.special = 'stir';
    },
    curator(n) { // Curator Lumi: lantern-bot
      n.hover = true; n.bodyY = 0.25; n.glowColor = 0xffd45c;
      n.bodyGeo = () => {
        const k = kit(), teal = 0x29b8c9, gold = 0xffc21a;
        k.add(U.sq(0.4, 1, 0, 16, 6), teal, [0, 0.07, 0], null, [0.22, 0.08, 0.22], { grad: 0.2 });
        k.add(U.tor(0.12, 4, 20), gold, [0, 0.15, 0], [HP, 0, 0], 0.22);
        for (let i = 0; i < 4; i++) { const a = HP / 2 + i * HP; k.add(U.cyl(1, 6), gold, [Math.cos(a) * 0.205, 0.38, Math.sin(a) * 0.205], null, [0.016, 0.46, 0.016]); }
        k.add(U.tor(0.12, 4, 20), gold, [0, 0.61, 0], [HP, 0, 0], 0.215);
        k.add(U.sq(1, 1, 0, 16, 8), teal, [0, 0.66, 0], null, [0.24, 0.12, 0.24], { grad: 0.2 });
        k.add(U.cone(12), teal, [0, 0.82, 0], null, [0.12, 0.16, 0.12]);
        k.add(U.tor(0.16, 5, 16), gold, [0, 0.95, 0], null, 0.07);
        k.add(U.sq(0.3, 0.3, 0, 8, 4), 0x5a6290, [0, 0.4, 0.21], null, [0.13, 0.11, 0.012]);
        bowTie(k, [0, 0.235, 0.215], 0xb26bff);
        hoverBits(k, -0.03, gold);
        return k.build();
      };
      n.faceOn = { P: null, plane: { w: 0.24, h: 0.2, y: 0.4, z: 0.225 }, face: { style: 'led', color: 0xd9b8ff, eyes: 'two' } };
      n.faceDeco = () => { const k = kit(); for (const sd of [-1, 1]) k.add(U.tor(0.14, 5, 16), 0xffd23f, [sd * 0.05, 0.415, 0.235], null, 0.042); k.bone(0xffd23f, [-0.012, 0.42, 0.236], [0.012, 0.42, 0.236], 0.006); return k.build(); };
      n.glass = { p: [0, 0.38, 0], s: [0.2, 0.23, 0.2], cyl: true };
      n.lamp = { y: 0.38, color: 0xfff3a0, r: 0.1 };
      n.arms = { y: 0.12, x: 0.24, r: 0.03, len: 0.24, col: 0x29b8c9, glove: 0xfff1dc };
      n.holdR = () => { const k = kit(); k.add(U.cyl(1, 6), 0x8a5a3c, [0, 0.06, 0.02], null, [0.016, 0.12, 0.016]); k.add(U.tor(0.16, 5, 16), 0xffd23f, [0, 0.19, 0.02], null, 0.07); k.add(U.cyl(1, 14), 0xbff6ff, [0, 0.19, 0.02], [HP, 0, 0], [0.062, 0.006, 0.062], { bright: 1.15 }); return k.build(); };
      n.poseR = -0.7; n.special = 'peek';
    },
    companion(n) { // Beepo: 0.45 m cream sphere, one big screen-eye, bobble antenna, side fins
      const B = { a: 0.225, b: 0.215, c: 0.215, e1: 1, e2: 1, t: 0, cy: 0.215 };
      n.hover = true; n.bodyY = 0.12; n.small = true; n.glowColor = 0x39d5ff;
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0xfff1dc, [18, 12], { grad: 0.12 });
        addBand(k, B, -0.42, 0x39d5ff, 0.014, 1.01);
        for (const sd of [-1, 1]) k.add(U.sq(0.8, 1, -0.5, 10, 6), 0x39d5ff, shellPt(B, 0.05, HP + sd * HP, 0.015), [0, 0, sd * -0.35], [0.03, 0.1, 0.075], { grad: 0.15 });
        k.add(U.cyl(1, 6), 0x1f2a5a, [0, 2 * B.b + 0.045, 0], null, [0.008, 0.09, 0.008]);
        k.add(U.sph(8, 6), 0xff6b8b, [0, 2 * B.b + 0.1, 0], null, 0.03, { bright: 1.15 });
        k.add(U.cyl(1.6, 12), 0x5a6290, [0, 0.0, 0], null, [0.055, 0.05, 0.055]);
        return k.build();
      };
      n.faceOn = { P: B, F: { latC: 0.1, w: 1.55, h: 1.3 }, face: { style: 'led', color: 0x39d5ff, eyes: 'one' } };
      n.arms = { y: 0.2, x: 0.27, r: 0.03, len: 0, col: 0xfff1dc, glove: 0x39d5ff, floating: true };
      n.special = 'spin'; n.hats = B;   // wears the Beepo hat equipped in the Ranger Locker
    },
    kiko(n) { RANGER_BUILD.kiko(n, rangerDefaults('kiko')); },   // the hero NPC = the Reef ranger look (same palette as the first-person glove)
    mox(n) { // Mega-Mayor Mox: 3 m vending machine, top hat, monocle-LED, coin-slot mouth
      const B = { a: 0.55, b: 0.95, c: 0.42, e1: 0.25, e2: 0.25, t: 0, cy: 0.95 };
      n.bodyY = 0.28; n.legs = { x: 0.28, h: 0.28, col: 0x5b3a8c, boot: 0x2a1b3d };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0xff5d73, [16, 12], { grad: 0.14 });
        k.add(U.sq(0.3, 0.3, 0, 10, 4), 0x2a1b3d, [-0.1, 0.72, B.c * 0.98], null, [0.32, 0.42, 0.02]);
        const cans = [0x7af0ff, 0x9be15d, 0xffd23f, 0xb983ff, 0xff8a4c, 0xffffff, 0x3fe0b8, 0xff7ab8, 0x7af0ff];
        for (let i = 0; i < 9; i++) k.add(U.cyl(1, 8), cans[i], [-0.3 + (i % 3) * 0.2, 1.0 - Math.floor(i / 3) * 0.27, B.c * 0.98 + 0.02], null, [0.06, 0.18, 0.06], { bright: 1.1 });
        k.add(U.sq(0.4, 0.4, 0, 8, 4), 0xe8b44a, [0.38, 0.78, B.c * 0.98], null, [0.1, 0.22, 0.02]);
        k.add(U.sq(0.3, 0.3, 0, 8, 4), 0xe8b44a, [0, 0.16, B.c * 0.98], null, [0.32, 0.07, 0.02]);
        k.add(U.box(), 0x2a1b3d, [0, 0.16, B.c * 0.98 + 0.02], null, [0.5, 0.05, 0.01]);
        const top = 2 * B.b;
        k.add(U.cyl(1, 18), 0x2a1b3d, [0.05, top + 0.02, 0], [0, 0, -0.1], [0.42, 0.04, 0.42]);
        k.add(U.cyl(0.95, 18), 0x2a1b3d, [0.06, top + 0.3, 0], [0, 0, -0.1], [0.28, 0.55, 0.28], { grad: 0.2 });
        k.add(U.tor(0.12, 4, 20), 0xe8b44a, [0.055, top + 0.12, 0], [HP, 0, -0.1], 0.285);
        return k.build();
      };
      n.faceOn = { P: null, plane: { w: 0.62, h: 0.42, y: 1.52, z: B.c + 0.012 }, face: { style: 'led', color: 0xffd23f, eyes: 'one' } };
      n.faceDeco = () => { const k = kit(); k.add(U.sq(0.3, 0.3, 0, 8, 4), 0x5a6290, [0, 1.52, B.c - 0.006], null, [0.34, 0.24, 0.015]); k.add(U.tor(0.1, 5, 18), 0xe8b44a, [0.0, 1.54, B.c + 0.03], null, 0.17); k.bone(0xe8b44a, [0.15, 1.46, B.c + 0.03], [0.24, 1.2, B.c + 0.02], 0.008); return k.build(); };
      n.arms = { y: 1.15, x: 0.58, r: 0.07, len: 0.5, col: 0xff5d73, glove: 0xffffff };
      n.special = 'open'; n.idleExpr = 'focused';   // determined, never angry (same as the boss Mox in 17b)
    },
    gale(n) { // Captain Gale: walrus-ish Marmalunian airship captain
      const B = { a: 0.55, b: 0.55, c: 0.48, e1: 0.9, e2: 1, t: -0.1, cy: 0.55 }, H = { a: 0.4, b: 0.36, c: 0.36, e1: 1, e2: 1, t: 0, cy: 0.3 };
      n.bodyY = 0.12; n.legs = { x: 0.24, h: 0.14, col: 0x1e2a5a, boot: 0x1e2a5a };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, 0x2e3f8f, [18, 12], { grad: 0.14 });
        k.add(patchG(Object.assign({}, B, { cy: 0 }), -0.8, 0.7, 1.1, 10), 0xfff1dc, [0, B.cy, 0], null, [B.a * 1.02, B.b * 1.02, B.c * 1.02]);
        for (const lat of [0.4, 0.05, -0.3]) k.add(U.sph(6, 4), 0xe8b44a, shellPt(B, lat, HP - 0.42, 0.01), null, 0.035);
        k.add(U.sq(0.5, 1, 0, 8, 4), 0xffc21a, shellPt(B, 0.75, HP + 0.95, 0.0), [0, 0, 0.6], [0.09, 0.025, 0.06]);
        return k.build();
      };
      n.head = { y: 1.0, P: H, F: { latC: 0.32, w: 1.25, h: 0.7 }, face: { style: 'toon', mouth: false } };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, 0xc99a7a, [16, 11], { grad: 0.12 });
        for (const sd of [-1, 1]) {
          k.add(U.sph(10, 7), 0xf2dcc8, [sd * 0.11, H.cy - 0.1, H.c * 0.8], null, [0.13, 0.11, 0.1]);
          k.add(U.cone(8), 0xfffaf2, [sd * 0.1, H.cy - 0.27, H.c * 0.82], [PI, 0, 0], [0.035, 0.2, 0.035]);
          for (let i = 0; i < 3; i++) k.bone(0x8a6a5a, [sd * 0.14, H.cy - 0.08 - i * 0.03, H.c * 0.86], [sd * 0.3, H.cy - 0.06 - i * 0.05, H.c * 0.7], 0.006);
        }
        k.add(U.sph(8, 6), 0x5a3a3a, [0, H.cy - 0.04, H.c * 0.98], null, [0.06, 0.045, 0.05]);
        const top = H.cy + H.b;
        k.add(U.cyl(1, 20), 0x1e2a5a, [0, top - 0.06, 0], null, [0.44, 0.04, 0.44]);
        k.add(U.cyl(0.92, 18), 0xfffaf2, [0, top + 0.08, 0], null, [0.32, 0.24, 0.32], { grad: 0.1 });
        k.add(U.cyl(1, 18), 0x1e2a5a, [0, top + 0.0, 0], null, [0.325, 0.07, 0.325]);
        k.add(U.sph(8, 6), 0xffc21a, [0, top + 0.06, 0.31], null, [0.06, 0.06, 0.03]);
        return k.build();
      };
      n.arms = { y: 0.8, x: 0.56, r: 0.07, len: 0.4, col: 0x2e3f8f, glove: 0xc99a7a };
      n.special = 'salute';
    },
  };

  // ------------------------------------------------------------------ playable rangers (Ranger Locker)
  // Four original rangers with different silhouettes: Kiko (standard build, axolotl gills under a bubble visor), Pip
  // (compact, big head under an antenna dome), Juno (tall and lanky robot scout, ear-fin helmet, LED visor) and Tuck
  // (round and sturdy, goggles cap, chunky gloves). Colours C come from G.Wardrobe.rangerColors (13b_wardrobe.js):
  // {suit, suit2, trim, glove, gloveDark, cuff, boot, extra, extra2, skin, skin2, eye, visor, badge, band, key} — the
  // gloves / cuffs / badge are the equipped gauntlet, i.e. exactly the palette the first-person glove uses.
  const RANGER_FALLBACK = { kiko: { suit: 0x2ec4b6, suit2: 0x1d8a80, trim: 0xffd23f, glove: 0x2ec4b6, gloveDark: 0x22a89b, cuff: 0xffd23f, boot: 0xffffff, extra: 0xff9fc2, extra2: 0x7af0ff, skin: 0xffdcc8 } };
  function rangerDefaults(id) {
    const W = G.Wardrobe;
    if (W && W.rangerColors) return W.rangerColors(id, 0, 'suit');
    const C = Object.assign({}, RANGER_FALLBACK.kiko); C.key = 'fallback'; return C;
  }
  // Ranger arm: shoulder ball, sleeve, cuff (+ gauntlet band), mitten with a thumb toward the body and the gauntlet's
  // star badge on the back of the hand. sd = +1 left arm (+X), -1 right arm.
  function rangerArmGeo(C, r, len, sd, o) {
    o = o || {};
    const k = kit(), g = o.mitt || 1.85, ch = o.cuffH || 0.045, cy = -len * (o.cuffAt || 0.78);
    k.add(U.sph(8, 6), C.suit, [0, 0, 0], null, r * 1.45);
    k.add(U.cap(r, len * 0.56, 6, 1), C.suit2, [0, -len * 0.4, 0]);
    k.add(U.cyl(1, 12), C.cuff, [0, cy, 0], null, [r * 1.42, ch, r * 1.42], { grad: 0.1 });
    if (C.band != null) k.add(U.tor(0.18, 4, 16), C.band, [0, cy - ch * 0.2, 0], [HP, 0, 0], r * 1.5);
    k.add(U.sph(10, 7), C.glove, [0, -len, 0.006], null, [r * g, r * g * 0.92, r * g * 1.05], { grad: 0.1 });
    k.add(U.sph(7, 5), C.gloveDark != null ? C.gloveDark : C.glove, [-sd * r * g * 0.66, -len + r * 0.35, r * g * 0.45], null, r * g * 0.42);   // thumb (inner side)
    k.add(U.sq(0.7, 1, 0, 8, 4), C.gloveDark != null ? C.gloveDark : C.glove, [0, -len - r * g * 0.55, r * g * 0.25], [0.3, 0, 0], [r * g * 0.82, r * 0.5, r * g * 0.7]);   // rolled fingers
    if (C.badge != null) k.orient(starGeo(), C.badge, [sd * r * g * 1.0, -len + 0.004, r * 0.25], [sd, 0.15, 0.35], 'z', [r * 0.95, r * 0.95, r * 0.5], { bright: 1.08 });
    return k.build();
  }
  function bootLeg(k, h, C, o) {
    o = o || {};
    const r = o.r || 0.045, bw = o.boot || 1;
    k.add(U.cap(r, h * (o.thigh || 0.5), 7, 1), C.suit2, [0, -h * 0.42, 0]);
    if (o.knee) k.add(U.sph(7, 5), o.knee, [0, -h * 0.5, 0.01], null, r * 1.25);
    if (o.band != null) k.add(U.cyl(1, 10), o.band, [0, -h + 0.075 * bw, 0], null, [r * 1.35, 0.018, r * 1.35]);
    k.add(U.sq(0.5, 0.45, 0, 10, 6), C.boot, [0, -h + 0.045 * bw, 0.035 * bw], null, [0.075 * bw, 0.048 * bw, 0.11 * bw], { grad: 0.12 });
    if (o.stripe != null) k.add(U.box(), o.stripe, [0, -h + 0.05 * bw, 0.035 * bw], null, [0.155 * bw, 0.02 * bw, 0.15 * bw]);
  }
  const RANGER_BUILD = {
    kiko(n, C) { // standard build: Reef Ranger with axolotl gills, sunny trim, water-tank pack, bubble visor
      const B = { a: 0.24, b: 0.28, c: 0.21, e1: 0.7, e2: 1, t: -0.06, cy: 0.28 }, H = { a: 0.29, b: 0.27, c: 0.27, e1: 1, e2: 1, t: 0, cy: 0.23 };
      n.bodyY = 0.32; n.legs = { x: 0.11, h: 0.32, geo: () => { const k = kit(); bootLeg(k, 0.32, C, { r: 0.056, boot: 1.25, stripe: C.trim }); return k.build(); } };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, C.suit, [16, 10], { grad: 0.16 });
        addBand(k, B, -0.72, C.trim, 0.035, 1.02);
        addBand(k, B, 0.82, C.trim, 0.04, 1.06);
        k.add(U.box(), C.trim, shellPt(B, 0.0, HP, 0.004), null, [0.02, 0.42, 0.01]);
        k.add(U.sq(1, 1, 0, 8, 5), C.extra, shellPt(B, 0.3, HP - 0.55, 0.0), [0, 0.5, 0], [0.04, 0.04, 0.012]);
        k.add(U.cap(0.09, 0.14, 10), C.extra2, [0, 0.3, -B.c - 0.07], null, null, { bright: 1.1 });
        for (const y of [0.2, 0.42]) k.add(U.tor(0.2, 4, 14), C.trim, [0, y, -B.c - 0.07], [HP, 0, 0], 0.094);
        k.add(U.cyl(1, 8), C.suit2, [0.06, 0.5, -B.c - 0.08], [0, 0, -0.4], [0.018, 0.08, 0.018]);
        return k.build();
      };
      n.head = { y: 0.56, P: H, F: { latC: 0.02, w: 1.5, h: 1.1 }, face: { style: 'toon' } };
      n.headGlass = { lat0: -0.6, lat1: 1.22, lonW: 2.45, grow: 1.13 };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, C.skin, [18, 12], { grad: 0.1 });
        for (const sd of [-1, 1]) gills(k, sd * H.a * 0.97, H.cy + 0.03, -0.05, sd, C.extra);
        k.add(U.sq(1, 1, -0.5, 8, 5), shade(C.skin, 0.94), [0.03, H.cy + H.b + 0.02, 0.02], [-0.3, 0, -0.4], [0.035, 0.06, 0.03]);
        const G2 = Object.assign({}, H, { a: H.a * 1.13, b: H.b * 1.13, c: H.c * 1.13 });
        // visor frame: two side rails following the glass edge from chin to crown, a chin rail, hinge studs
        const R0 = H.b * 1.13 + 0.004;
        for (const sd of [-1, 1]) {
          const phi = HP + sd * 1.22;
          const rh = 1.13 * Math.hypot(H.a * Math.cos(phi), H.c * Math.sin(phi)) + 0.004;
          k.add(U.tor(0.014 / R0, 4, 18, 1.82), C.trim, [0, H.cy, 0], [0, -phi, -0.6, 'YZX'], [rh, R0, R0]);
          const q = sqPt(G2, 0.22, phi); k.orient(U.cyl(1, 12), C.trim, arr(q.p.addScaledVector(q.n, 0.006)), q.n, 'y', [0.04, 0.024, 0.04]);
        }
        { const lat = -0.6, R = 1.13 * Math.cos(lat) * (H.a + H.c) * 0.5 + 0.004; k.add(U.tor(0.014 / R, 4, 20, 2.44), C.trim, [0, H.cy + Math.sin(lat) * H.b * 1.13, 0], [HP, 0, HP - 1.22], R); }
        return k.build();
      };
      n.arms = { y: 0.42, x: 0.26, r: 0.04, len: 0.27, geo: sd => rangerArmGeo(C, 0.04, 0.27, sd) };
      n.special = 'salute'; n.shadowR = 0.36;
    },
    pip(n, C) { // compact build: big round head under an antenna dome, puffy suit, mini bubble jetpack, big mitts
      const B = { a: 0.21, b: 0.2, c: 0.2, e1: 0.9, e2: 1, t: -0.12, cy: 0.2 }, H = { a: 0.27, b: 0.25, c: 0.25, e1: 1, e2: 1, t: 0, cy: 0.21 };
      n.bodyY = 0.2; n.legs = { x: 0.085, h: 0.2, geo: () => { const k = kit(); bootLeg(k, 0.2, C, { r: 0.045, boot: 1.05, band: C.cuff, thigh: 0.35 }); return k.build(); } };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, C.suit, [18, 12], { grad: 0.18 });
        addBand(k, B, 0.78, C.trim, 0.03, 1.05);
        addBand(k, B, -0.5, C.suit2, 0.026, 1.02);
        k.add(U.sph(12, 8), shade(C.suit, 1.28), shellPt(B, 0.05, HP, -0.03), null, [0.11, 0.1, 0.04]);   // tummy patch
        emblemInto(k, 'star', C.trim, new V3().fromArray(shellPt(B, 0.08, HP, 0.012)), new V3(0, 0.05, 1), 0.04);
        for (const sd of [-1, 1]) {   // bubble jetpack: two round tanks with little fins
          k.add(U.sph(10, 8), C.suit2, [sd * 0.075, 0.24, -B.c - 0.05], null, [0.065, 0.085, 0.06], { grad: 0.12 });
          k.add(slabGeo([[0, 0.04], [0, -0.04], [0.07, -0.06], [0.06, 0.0]], 0.014, 0.005), C.trim, [sd * 0.12, 0.2, -B.c - 0.05], [0, 0, HP - sd * 1.1]);
        }
        return k.build();
      };
      n.head = { y: 0.38, P: H, F: { latC: -0.1, w: 1.55, h: 1.05 }, face: { style: 'toon' } };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, C.skin, [18, 12], { grad: 0.1 });
        const top = domeInto(k, H, C.extra, C.suit, C.suit2, null, 0.15, 0.48);
        k.orient(starGeo(), C.extra2, [0, top + 0.035, 0], [0, 0, 1], 'z', [0.06, 0.06, 0.05], { bright: 1.15 });
        for (const sd of [-1, 1]) { const q = sqPt(H, 0.2, HP + sd * 1.5); k.orient(U.cyl(1, 14), C.suit, arr(q.p.addScaledVector(q.n, 0.02)), q.n, 'y', [0.07, 0.04, 0.07], { grad: 0.1 }); k.orient(U.cyl(1, 12), C.extra2, arr(q.p.addScaledVector(q.n, 0.045)), q.n, 'y', [0.04, 0.012, 0.04], { bright: 1.15 }); }
        return k.build();
      };
      n.arms = { y: 0.27, x: 0.215, r: 0.034, len: 0.17, geo: sd => rangerArmGeo(C, 0.034, 0.17, sd, { mitt: 2.2, cuffH: 0.035 }) };
      n.special = 'spin'; n.shadowR = 0.3;
    },
    juno(n, C) { // tall and lanky robot scout: slim torso, long limbs, ear-fin helmet with an LED visor, long gauntlets, scarf
      const B = { a: 0.19, b: 0.29, c: 0.16, e1: 0.55, e2: 1, t: -0.14, cy: 0.29 }, H = { a: 0.21, b: 0.215, c: 0.21, e1: 0.9, e2: 1, t: 0, cy: 0.2 };
      n.bodyY = 0.56; n.legs = { x: 0.085, h: 0.56, geo: () => { const k = kit(); bootLeg(k, 0.56, C, { r: 0.04, boot: 1.05, knee: C.trim, thigh: 0.66, band: C.trim }); return k.build(); } };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, C.suit, [16, 10], { grad: 0.16 });
        k.add(U.sq(0.5, 0.6, 0, 10, 5), C.extra2, shellPt(B, 0.35, HP, -0.04), [-0.1, 0, 0], [0.13, 0.1, 0.05], { grad: 0.1 });   // chest plate
        k.add(U.sph(8, 6), C.trim, shellPt(B, 0.36, HP, 0.012), null, [0.03, 0.03, 0.012], { bright: 1.3 });           // power light
        addBand(k, B, -0.62, C.suit2, 0.03, 1.02);
        for (const sd of [-1, 1]) k.add(U.sq(0.7, 1, 0, 10, 5), C.suit2, [sd * 0.2, 0.52, 0], [0, 0, -sd * 0.35], [0.075, 0.05, 0.085], { grad: 0.1 });
        for (const sd of [-1, 1]) k.add(slabGeo([[0, 0.05], [0, -0.05], [0.22, -0.1], [0.2, -0.03]], 0.016, 0.006), C.extra, [sd * 0.06, 0.42, -B.c - 0.02], [0, 0, HP - sd * 0.5]);   // glide fins on the back
        k.add(U.cyl(1, 10), C.suit2, [0, 2 * B.b + 0.01, 0], null, [0.05, 0.05, 0.05]);
        return k.build();
      };
      n.head = { y: 0.6, P: H, F: { latC: 0.12, w: 1.85, h: 0.82 }, face: { style: 'led', eyes: 'visor', color: C.eye != null ? C.eye : 0x7af0ff, screenColor: C.visor != null ? C.visor : 0x2a1b3d } };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, C.skin, [16, 11], { grad: 0.12 });
        k.add(U.sq(0.5, 1, 0, 8, 4), C.suit, [0, H.cy + H.b - 0.012, -0.02], null, [0.03, 0.05, 0.15]);   // top stripe
        finsInto(k, H, C.extra, 1.2, 0.3);
        for (const sd of [-1, 1]) k.add(U.cyl(1, 12), C.suit, [sd * (H.a + 0.006), H.cy, 0], [0, 0, HP], [0.05, 0.03, 0.05]);
        return k.build();
      };
      n.arms = { y: 0.5, x: 0.235, r: 0.03, len: 0.36, geo: sd => rangerArmGeo(C, 0.03, 0.36, sd, { cuffH: 0.1, cuffAt: 0.74, mitt: 1.9 }) };
      n.scarf = { y: 0.56, z: -B.c * 0.5, col: C.trim, col2: shade(C.trim, 0.86) };
      n.special = 'salute'; n.shadowR = 0.3;
    },
    tuck(n, C) { // round and sturdy: furry Marmalunian mechanic with round ears, goggles cap, overalls, chunky gloves
      const B = { a: 0.33, b: 0.31, c: 0.3, e1: 1, e2: 1, t: -0.18, cy: 0.31 }, H = { a: 0.25, b: 0.23, c: 0.24, e1: 1, e2: 1, t: 0, cy: 0.17 };
      n.bodyY = 0.22; n.legs = { x: 0.15, h: 0.22, geo: () => { const k = kit(); bootLeg(k, 0.22, C, { r: 0.07, boot: 1.35, thigh: 0.35 }); return k.build(); } };
      n.bodyGeo = () => {
        const k = kit();
        addShell(k, B, C.suit, [18, 12], { grad: 0.16 });
        k.add(patchG(Object.assign({}, B, { cy: 0 }), 0.1, 0.95, 1.4, 10), C.skin2 != null ? C.skin2 : 0xfff1dc, [0, B.cy, 0], null, [B.a * 1.01, B.b * 1.01, B.c * 1.01]);   // shirt
        k.add(patchG(Object.assign({}, B, { cy: 0 }), -0.25, 0.55, 0.9, 8), C.suit, [0, B.cy, 0], null, [B.a * 1.022, B.b * 1.022, B.c * 1.022]);   // bib
        for (const sd of [-1, 1]) { k.bone(C.trim, shellPt(B, 0.5, HP + sd * 0.42, 0.012), shellPt(B, 1.2, HP + sd * 0.9, 0.0), 0.016); k.add(U.sph(6, 4), C.trim, shellPt(B, 0.5, HP + sd * 0.42, 0.016), null, 0.02); }
        addBand(k, B, -0.3, C.trim, 0.03, 1.03);   // tool belt
        k.add(U.sq(0.4, 0.4, 0, 8, 4), C.suit2, shellPt(B, -0.34, HP + 0.75, 0.03), [0, 0.6, 0], [0.065, 0.06, 0.04], { grad: 0.1 });   // pouch
        k.add(U.cyl(1, 8), 0xc9cfe6, shellPt(B, -0.3, HP - 0.8, 0.05), [0, 0, 0.5], [0.014, 0.11, 0.014]);                                  // wrench handle
        k.add(U.tor(0.32, 5, 12, PI * 1.4), 0xc9cfe6, (() => { const q = shellPt(B, -0.1, HP - 0.88, 0.06); return q; })(), [0, 0, -PI * 0.2], 0.03);
        return k.build();
      };
      n.head = { y: 0.6, P: H, F: { latC: -0.02, w: 1.55, h: 1.1 }, face: { style: 'toon' } };
      n.headGeo = () => {
        const k = kit();
        addShell(k, H, C.skin, [18, 12], { grad: 0.1 });
        k.add(U.sph(12, 8), C.skin2 != null ? C.skin2 : 0xfff1dc, shellPt(H, -0.42, HP, -0.06), null, [0.11, 0.075, 0.07]);   // muzzle
        k.add(U.sph(8, 6), 0x5b3a5a, shellPt(H, -0.22, HP, 0.004), null, [0.032, 0.024, 0.022]);                                // nose
        for (const sd of [-1, 1]) {   // round ears peeking out under the cap
          const q = sqPt(H, 0.5, HP + sd * 1.3), en = new V3(q.n.x * 0.6, 0.25, 1).normalize();   // ears face forward-out
          const ep = q.p.addScaledVector(q.n, 0.05);
          k.orient(U.cyl(1, 14), C.skin, arr(ep), arr(en), 'y', [0.075, 0.04, 0.075], { grad: 0.1 });
          k.orient(U.cyl(1, 12), C.skin2 != null ? C.skin2 : 0xfff1dc, arr(ep.clone().addScaledVector(en, 0.021)), arr(en), 'y', [0.048, 0.01, 0.048]);
        }
        goggleCapInto(k, H, C.extra, 0x5a6290, C.extra2);
        return k.build();
      };
      n.arms = { y: 0.44, x: 0.345, r: 0.052, len: 0.25, geo: sd => rangerArmGeo(C, 0.052, 0.25, sd, { mitt: 1.95, cuffH: 0.05 }) };
      n.special = 'pump'; n.shadowR = 0.42;
    },
  };
  Geo.RANGER_IDS = Object.keys(RANGER_BUILD);
  // Playable ranger model (Ranger Locker turntable, title / results vignette): G.Geo.ranger(id, colors?) -> the NPC
  // object shape {group, parts, setExpr, greet, animate(t, dt), dispose, ranger, colors, height}. colors default to the
  // equipped look when id is the equipped ranger (else that ranger's first colourway with the equipped gloves).
  Geo.ranger = function (id, C) {
    const W = G.Wardrobe;
    if (!RANGER_BUILD[id]) id = W && W.state ? W.state().ranger : 'kiko';
    if (!RANGER_BUILD[id]) id = 'kiko';
    if (!C) C = W && W.rangerColors ? (W.state().ranger === id ? W.rangerColors() : W.rangerColors(id, 0)) : rangerDefaults(id);
    const n = { kind: 'ranger-' + id };
    RANGER_BUILD[id](n, C);
    const name = W && W.rangerName ? W.rangerName(id) : id;
    // geometry cache key: G.Wardrobe colours carry one; a hand-made colour set is keyed by its values (never shared)
    const ck = C.key || Object.keys(C).sort().map(k => k + ':' + C[k]).join(',');
    const o = assembleNpc('ranger-' + id, n, 'rg|' + id + '|' + ck, name);
    o.ranger = id; o.colors = C;
    o.height = { kiko: 1.4, pip: 1.25, juno: 1.72, tuck: 1.25 }[id];
    return o;
  };

  // Beepo hats, in Beepo body space (shell B centred at B.cy). The antenna stays inside or pokes through the top.
  function hatGeo(id, B) {
    return cg('hat|' + id, () => {
      const k = kit(), top = B.cy + B.b;
      if (id === 'hat_party') {
        const h = 0.22, r = 0.088;
        k.add(U.cone(14), 0xff6fb5, [0.01, top + h * 0.5 - 0.012, 0], [0, 0, -0.12], [r, h, r], { grad: 0.15 });
        for (const f of [0.22, 0.52]) k.add(U.tor(0.16, 4, 16), 0xffd23f, [0.01 + 0.12 * h * f * 0.9, top - 0.012 + h * f, 0], [HP, 0.12, 0], r * (1 - f) * 1.02);
        k.add(U.sph(10, 8), 0xffffff, [0.01 + Math.sin(0.12) * h, top + h - 0.012, 0], null, 0.03, { bright: 1.05 });
      } else if (id === 'hat_cap') {
        const Q = Object.assign({}, B, { cy: 0 });
        k.add(cap(Q, 0.55), 0x2ec4b6, [0, B.cy, 0], null, [B.a * 1.05, B.b * 1.05, B.c * 1.05], { grad: 0.12 });
        k.add(U.sph(14, 6), 0x2ec4b6, [0, B.cy + B.b * 0.82, B.c * 0.62], [-0.18, 0, 0], [0.14, 0.016, 0.12], { grad: 0.1 });
        const q = sqPt(B, 0.88, HP); emblemInto(k, 'star', 0xffd23f, q.p.clone().addScaledVector(q.n, 0.015), q.n, 0.035);
        addBand(k, Object.assign({}, B, { a: B.a * 1.05, b: B.b * 1.05, c: B.c * 1.05 }), 0.55, 0xffd23f, 0.012, 1.0);
      } else if (id === 'hat_crown') {
        const r = 0.085, y = top - 0.008;
        k.add(U.tor(0.2, 5, 20), 0xffc21a, [0, y, 0], [HP, 0, 0], r, { em: 0xffc21a, ei: 0.12 });
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU + HP;
          k.add(U.cone(6), 0xffc21a, [Math.cos(a) * r, y + 0.04, Math.sin(a) * r], null, [0.022, 0.07, 0.022], { em: 0xffc21a, ei: 0.12 });
          k.add(U.sph(6, 4), i % 2 ? 0xff5fa2 : 0x7af0ff, [Math.cos(a) * r, y + 0.08, Math.sin(a) * r], null, 0.014, { bright: 1.3 });
        }
      } else if (id === 'hat_wizard') {
        k.add(U.cyl(1, 20), 0x6a4fe0, [0, top - 0.004, 0], null, [0.17, 0.012, 0.17]);
        k.add(U.cone(16), 0x7a5cff, [0, top + 0.13, 0], null, [0.105, 0.27, 0.105], { grad: 0.18 });
        k.add(U.cone(10), 0x7a5cff, [0.035, top + 0.3, -0.01], [0, 0, -0.6], [0.04, 0.1, 0.04]);
        k.add(U.tor(0.18, 4, 16), 0xffd23f, [0, top + 0.02, 0], [HP, 0, 0], 0.1);
        for (let i = 0; i < 3; i++) { const a = HP + (i - 1) * 0.7, rr2 = 0.08 - i * 0.008, y = top + 0.07 + i * 0.055; k.orient(starGeo(), 0xffd23f, [Math.cos(a) * rr2, y, Math.sin(a) * rr2], [Math.cos(a), 0.35, Math.sin(a)], 'z', [0.022, 0.022, 0.012], { em: 0xffd23f, ei: 0.2 }); }
        k.add(U.sph(8, 6), 0xffd23f, [0.075, top + 0.33, -0.01], null, 0.016, { em: 0xffd23f, ei: 0.3 });
      } else return null;
      return k.build();
    });
  }
  Geo.hatGeo = id => hatGeo(id, { a: 0.225, b: 0.215, c: 0.215, e1: 1, e2: 1, t: 0, cy: 0.215 });

  Geo.npc = function (kind) {
    if (!NPC_BUILD[kind]) kind = 'companion';
    const n = { kind };
    NPC_BUILD[kind](n);
    return assembleNpc(kind, n, 'npc|' + kind, Geo.npcInfo[kind].name);
  };
  // Shared NPC / ranger assembly from a build record n (see NPC_BUILD / RANGER_BUILD); key prefixes the geometry cache.
  function assembleNpc(kind, n, key, name) {
    const mat = vcMatShared();
    const fMat = faceMat(null);
    const group = new THREE.Group(); group.name = 'npc-' + kind;
    const rig = new THREE.Group(); rig.name = 'rig'; group.add(rig);
    const body = new THREE.Group(); body.name = 'body'; body.position.y = n.bodyY; rig.add(body);
    const mk = (geo, parent, name, m) => { const o = new THREE.Mesh(geo, m || mat); o.name = name; parent.add(o); return o; };
    mk(cg(key + '|body', n.bodyGeo), body, 'bodyMesh', n.jelly ? jellyMat() : mat);
    if (n.baseGeo) mk(cg(key + '|base', n.baseGeo), rig, 'base');
    const parts = { rig, body, head: null, face: null, eyes: null, armL: null, armR: null, legs: [], wheel: null, glow: null, scarf: null, jets: [], held: [], prop: null, top: null };
    let face, faceOpts;
    if (n.head) {
      const head = new THREE.Group(); head.name = 'head'; head.position.y = n.head.y; body.add(head); parts.head = head;
      mk(cg(key + '|head', n.headGeo), head, 'headMesh');
      faceOpts = n.head.face;
      face = facePatch(n.head.P, n.head.F, fMat);
      head.add(face);
      if (n.headGlass) {   // bubble visor: a clear front half-dome over the face
        const hgP = n.headGlass, P = n.head.P;
        const gg = cg(`hglass|${P.e1}|${P.e2}|${P.t || 0}|${hgP.lat0}|${hgP.lat1}|${hgP.lonW}`, () => sqGeo(P.e1, P.e2, { taper: P.t, lat0: hgP.lat0, lat1: hgP.lat1, lon0: HP - hgP.lonW / 2, lon1: HP + hgP.lonW / 2, ws: 16, hs: 10 }));
        const gm = new THREE.Mesh(gg, visorMat()); gm.name = 'visor'; gm.renderOrder = 3;
        gm.scale.set(P.a * hgP.grow, P.b * hgP.grow, P.c * hgP.grow); gm.position.y = P.cy; head.add(gm); parts.visor = gm;
      }
    } else {
      const fo2 = n.faceOn;
      faceOpts = fo2.face;
      const fg = new THREE.Group(); fg.name = 'faceGroup'; body.add(fg);
      if (fo2.plane) { face = facePlane(fo2.plane.w, fo2.plane.h, fMat); face.position.set(0, fo2.plane.y, fo2.plane.z); }
      else face = facePatch(fo2.P, fo2.F, fMat, 1.02);
      fg.add(face);
      if (n.faceDeco) mk(cg(key + '|fdeco', n.faceDeco), fg, 'faceDeco');
      parts.head = fg;
    }
    parts.face = parts.eyes = face;
    if (n.top) {
      const tg = new THREE.Group(); tg.name = 'top'; tg.position.y = n.top.y; body.add(tg); parts.top = tg; parts.head = tg;
      mk(cg(key + '|top', n.top.geo), tg, 'topMesh');
      if (n.top.glass) { const gm = new THREE.Mesh(U.sph(18, 12), glassMat()); gm.name = 'glass'; gm.renderOrder = 3; gm.position.fromArray(n.top.glass.p); gm.scale.fromArray(n.top.glass.s); tg.add(gm); }
    }
    if (n.glass) { const gm = new THREE.Mesh(n.glass.cyl ? U.cyl(1, 16, true) : U.sph(18, 12), glassMat()); gm.name = 'glass'; gm.renderOrder = 3; gm.position.fromArray(n.glass.p); gm.scale.set(n.glass.s[0], n.glass.cyl ? n.glass.s[1] * 2 : n.glass.s[1], n.glass.s[2]); body.add(gm); }
    // arms
    const A = n.arms;
    const armG = A.geo ? null : cg(key + '|arm', () => (A.floating ? (() => { const k = kit(); k.add(U.sph(10, 7), A.glove, [0, 0, 0], null, A.jelly ? 0.07 : 0.045, { grad: 0.12 }); return k.build(); })() : npcArmGeo(A.col, A.glove, A.r, A.len)));
    for (const side of ['L', 'R']) {
      const sd = side === 'L' ? 1 : -1;
      const piv = new THREE.Group(); piv.name = 'arm' + side; piv.position.set(sd * A.x, A.y, 0.02); body.add(piv);
      mk(A.geo ? cg(key + '|arm' + side, () => A.geo(sd)) : armG, piv, 'armMesh', A.jelly ? jellyMat() : mat);
      parts['arm' + side] = piv;
      const hold = n['hold' + side];
      if (hold) {
        const h = new THREE.Group(); h.name = 'held'; h.position.y = -A.len; piv.add(h);
        mk(cg(key + '|hold' + side, hold), h, 'heldMesh');
        h.rotation.x = -(n['pose' + side] || 0);
        piv.userData.hold = h; parts.held.push(h);
      }
      piv.userData.pose = n['pose' + side] != null ? n['pose' + side] : -0.08;
      piv.rotation.x = piv.userData.pose;
    }
    if (n.legs) {
      const Lg = n.legs;
      const lg = cg(key + '|leg', () => { if (Lg.geo) return Lg.geo(); const k = kit(); const fw = Lg.chunky ? 1.25 : 1; k.add(U.cap(0.045 * fw, Lg.h * 0.5, 7, 1), Lg.col, [0, -Lg.h * 0.42, 0]); k.add(U.sq(0.5, 0.45, 0, 10, 6), Lg.boot, [0, -Lg.h + 0.045 * fw, 0.035], null, [0.075 * fw, 0.048 * fw, 0.11 * fw], { grad: 0.12 }); if (Lg.stripe) k.add(U.box(), Lg.stripe, [0, -Lg.h + 0.05 * fw, 0.035], null, [0.155 * fw, 0.02 * fw, 0.15 * fw]); return k.build(); });
      for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * Lg.x, Lg.h + 0.01, 0); rig.add(piv); mk(lg, piv, 'legMesh'); parts.legs.push(piv); }
    }
    if (n.hover) parts.glow = addGlowUnder(body, n.glowColor || 0x7ff3ff, n.small ? -0.035 : -0.08, n.small ? 0.04 : 0.09, n.small ? 0.12 : 0.24);
    if (n.prop) {
      const p = new THREE.Group(); p.name = 'prop'; p.position.y = n.prop.y; body.add(p); parts.prop = p;
      mk(cg(key + '|prop', () => { const k = kit(); k.add(U.sph(8, 6), n.prop.col, [0, 0, 0], null, [0.04, 0.03, 0.04]); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.add(U.sq(0.6, 0.35, 0, 8, 4), n.prop.col, [Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17], [0, -a, 0.12], [0.16, 0.01, 0.04]); } return k.build(); }), p, 'propMesh');
    }
    if (n.scarf) {
      const sc = new THREE.Group(); sc.position.set(0, n.scarf.y, n.scarf.z); body.add(sc); parts.scarf = sc;
      const c1 = n.scarf.col != null ? n.scarf.col : 0xff6b3d, c2 = n.scarf.col2 != null ? n.scarf.col2 : 0xff8a5a;
      mk(cg(key + '|scarf', () => { const k = kit(); k.add(U.sq(0.7, 0.9, 0, 10, 6), c1, [0.03, -0.02, -0.12], [0.5, 0.2, 0.1], [0.05, 0.016, 0.13]); k.add(U.sq(0.7, 0.9, 0, 10, 6), c2, [-0.04, -0.06, -0.1], [0.75, -0.25, -0.1], [0.045, 0.016, 0.11]); return k.build(); }), sc, 'scarfMesh');
    }
    if (n.jets) for (const p of n.jets) { const j = flame(0xffb03a); j.position.fromArray(p); j.rotation.x = HP; j.scale.set(0.035, 0.035, 0.1); body.add(j); parts.jets.push(j); }
    if (n.lamp) {
      const lm = G.M.toon(n.lamp.color, { emissive: n.lamp.color, ei: 0.9, spec: 0.5 });
      const bulb = new THREE.Mesh(U.sph(10, 7), lm); bulb.scale.setScalar(n.lamp.r || 0.045); bulb.position.y = n.lamp.y; body.add(bulb);
      const gs = G.R.glowSprite(n.lamp.color, (n.lamp.r || 0.045) * 7, 0.7); gs.position.y = n.lamp.y; body.add(gs); parts.lamp = gs;
    }
    const sR = n.shadowR || (kind === 'mox' ? 0.7 : kind === 'gale' ? 0.6 : n.small ? 0.2 : 0.4);
    const shadow = G.R.blobShadow(sR); shadow.position.y = 0.02; group.add(shadow); parts.shadow = shadow;
    // Beepo hats (Ranger Locker): one swappable mesh on the body, synced to the equipped hat while animating
    let hatMesh = null;
    if (n.hats) { hatMesh = new THREE.Mesh(U.box(), mat); hatMesh.name = 'hat'; hatMesh.visible = false; body.add(hatMesh); parts.hat = hatMesh; }
    const npcObj = {
      group, parts, kind, name, hat: 'none',
      // Beepo only: put on a hat ('none' | hat_party | hat_cap | hat_crown | hat_wizard)
      setHat(id) {
        if (!hatMesh) return;
        const g = id && id !== 'none' ? hatGeo(id, n.hats) : null;
        npcObj.hat = g ? id : 'none';
        if (g) hatMesh.geometry = g;
        hatMesh.visible = !!g;
      },
      anim: { seed: Math.random() * TAU, blinkT: 1 + Math.random() * 3, blink: 0, gT: 2 + Math.random() * 3, gesture: null, gt: 0, exprT: 0, ex: '', sR },
      expr: n.idleExpr || 'idle',
      setExpr(e) { npcObj.expr = e || 'idle'; apply(); },
      greet() { const a = npcObj.anim; a.gesture = 'wave'; a.gt = 0; a.exprT = 2.2; a.tempEx = 'happy'; apply(); },
      dispose() { if (group.parent) group.parent.remove(group); fMat.dispose(); },
      animate(t, dt) {
        autoLayers(npcObj);
        if (hatMesh && !npcObj.fixedHat && G.Wardrobe && G.Wardrobe.state) { const h = G.Wardrobe.state().hat; if (h !== npcObj.hat) npcObj.setHat(h); }
        npcAnimate(npcObj, n, t, dt);
      },
    };
    function apply() {
      const a = npcObj.anim;
      const ex = a.blink > 0 && npcObj.expr !== 'happy' && npcObj.expr !== 'blink' ? 'blink' : a.exprT > 0 ? a.tempEx : npcObj.expr;
      if (ex === a.ex) return;
      a.ex = ex; if (!fMat.map) fMat.needsUpdate = true; fMat.map = Geo.face(ex, faceOpts);
    }
    npcObj._apply = apply;
    apply();
    if (hatMesh && G.Wardrobe && G.Wardrobe.state) G.safe('beepo hat', () => npcObj.setHat(G.Wardrobe.state().hat));
    return npcObj;
  }
  Geo._assembleNpc = assembleNpc;
  const GESTURES = ['wave', 'nod', 'bounce'];
  function npcAnimate(o, n, t, dt) {
    const A = o.anim, P = o.parts;
    const ph = t + A.seed;
    let y = n.hover ? 0.045 * Math.sin(ph * 2.1) : 0, sy = 1 + (n.jelly ? 0.045 : 0.022) * Math.sin(ph * (n.jelly ? 3.1 : 2.4));
    let headX = 0, headY = 0.25 * Math.sin(ph * 0.45), headZ = 0.06 * Math.sin(ph * 0.9);
    let armR = null, armL = null, armRz = 0, armLz = 0, spin = 0;
    A.gT -= dt;
    if (!A.gesture && A.gT <= 0) { const r2 = Math.random() * 5; A.gesture = r2 < 3 ? GESTURES[r2 | 0] : n.special; A.gt = 0; }
    if (A.gesture) {
      A.gt += dt;
      const g = A.gt, e = Math.sin(clamp(g / 1.6, 0, 1) * PI);
      switch (A.gesture) {
        case 'wave': armR = -2.7 * e; armRz = -0.35 - 0.4 * Math.sin(g * 11) * e; break;
        case 'nod': headX = 0.22 * Math.sin(g * 9) * e; break;
        case 'bounce': { const h = hopCurve(clamp(g / 0.8, 0, 1)); y += h.y * 0.12; sy = h.sy; break; }
        case 'check': armL = P.armL.userData.pose - 0.5 * e; headX = 0.3 * e; headY = 0.15 * e; break;
        case 'tap': armR = P.armR.userData.pose - 0.9 * Math.max(0, Math.sin(g * 9)) * e; break;
        case 'open': armR = -0.9 * e; armL = -0.9 * e; armRz = -0.7 * e; armLz = 0.7 * e; break;
        case 'salute': armR = -2.4 * e; armRz = 0.6 * e; break;
        case 'pump': armR = P.armR.userData.pose - 1.6 * e * (0.6 + 0.4 * Math.sin(g * 12)); y += Math.abs(Math.sin(g * 6)) * 0.03 * e; break;
        case 'stir': armR = P.armR.userData.pose - 0.4 * e; armRz = 0.3 * Math.sin(g * 8) * e; break;
        case 'peek': armR = P.armR.userData.pose - 0.9 * e; headX = 0.12 * e; headY = -0.25 * e; break;
        case 'spin': spin = clamp(g / 1.6, 0, 1); break;
        default: break;
      }
      if (A.gt > 1.6) { A.gesture = null; A.gT = 3 + Math.random() * 4; }
    }
    P.rig.position.y = y;
    squash(P.rig, sy);
    P.rig.rotation.y = spin > 0 ? (1 - Math.cos(spin * PI)) * PI : 0;
    if (P.head) { P.head.rotation.x = damp(P.head.rotation.x, headX * (n.head ? 1 : 0.5), 10, dt); P.head.rotation.y = damp(P.head.rotation.y, headY * (n.head ? 1 : 0.3), 6, dt); P.head.rotation.z = headZ * (n.head ? 1 : 0.6); }
    const fl = n.arms.floating;
    if (P.armR) { P.armR.rotation.x = damp(P.armR.rotation.x, armR != null ? armR : P.armR.userData.pose + 0.05 * Math.sin(ph * 1.7), 9, dt); P.armR.rotation.z = damp(P.armR.rotation.z, armRz - (fl ? 0 : 0.12), 9, dt); if (P.armR.userData.hold) P.armR.userData.hold.rotation.x = -P.armR.rotation.x * (A.gesture === 'wave' ? 0 : 1); }
    if (P.armL) { P.armL.rotation.x = damp(P.armL.rotation.x, armL != null ? armL : P.armL.userData.pose + 0.05 * Math.sin(ph * 1.7 + 2), 9, dt); P.armL.rotation.z = damp(P.armL.rotation.z, armLz + (fl ? 0 : 0.12), 9, dt); if (P.armL.userData.hold) P.armL.userData.hold.rotation.x = -P.armL.rotation.x; }
    if (fl) { P.armL.position.y = n.arms.y + 0.02 * Math.sin(ph * 3); P.armR.position.y = n.arms.y + 0.02 * Math.sin(ph * 3 + 1.5) + (armR != null ? 0.12 * Math.max(0, -armR) / 2.7 : 0); }
    if (P.scarf) { P.scarf.rotation.x = 0.15 * Math.sin(ph * 3.1); P.scarf.rotation.y = 0.25 * Math.sin(ph * 2.3); }
    for (let i = 0; i < P.jets.length; i++) P.jets[i].scale.z = 0.1 * (1 + 0.25 * Math.sin(t * 31 + i * 2));
    if (P.glow) P.glow.scale.z = (n.small ? 0.12 : 0.24) * (1 + 0.15 * Math.sin(t * 27));
    if (P.prop) P.prop.rotation.y += dt * 22;
    if (P.lamp) { const f = 1 + 0.12 * Math.sin(ph * 5.3) + 0.06 * Math.sin(ph * 13); P.lamp.scale.setScalar((n.lamp.r || 0.045) * 7 * f); }
    if (P.top && !n.head) P.top.rotation.z = 0.05 * Math.sin(ph * 1.6);
    P.shadow.scale.setScalar(2.2 * A.sR * clamp(1 - y * 2, 0.6, 1));
    // blink
    A.blinkT -= dt;
    if (A.blinkT <= 0) { A.blink = 0.12; A.blinkT = 2.2 + Math.random() * 3; }
    if (A.blink > 0) A.blink -= dt;
    if (A.exprT > 0) A.exprT -= dt;
    o._apply();
  }

  // ------------------------------------------------------------------ NPC portraits (SVG, 128×128)
  const SVGH = (bg, kind, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><defs><clipPath id="pc-${kind}"><circle cx="64" cy="64" r="61"/></clipPath></defs><circle cx="64" cy="64" r="61" fill="${bg}"/><g clip-path="url(#pc-${kind})" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${body}</g><circle cx="64" cy="64" r="61" fill="none" stroke="${INK}" stroke-width="4"/></svg>`;
  const ledEyesSVG = (x1, x2, y, col, mood) => mood === 'happy'
    ? `<path d="M${x1 - 6} ${y + 3}q6-9 12 0M${x2 - 6} ${y + 3}q6-9 12 0" fill="none" stroke="${col}" stroke-width="4.5"/>`
    : `<rect x="${x1 - 4.5}" y="${y - 7}" width="9" height="14" rx="4.5" fill="${col}" stroke="none"/><rect x="${x2 - 4.5}" y="${y - 7}" width="9" height="14" rx="4.5" fill="${col}" stroke="none"/><circle cx="${x1 - 1}" cy="${y - 3}" r="1.8" fill="#fff" stroke="none"/><circle cx="${x2 - 1}" cy="${y - 3}" r="1.8" fill="#fff" stroke="none"/>`;
  const screenSVG = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#2a1b3d"/><path d="M${x + 6} ${y + 7}q${w * 0.3} -4 ${w * 0.55} 0" fill="none" stroke="#ffffff" stroke-opacity=".25" stroke-width="3"/>`;
  const toonEyesSVG = (x1, x2, y, mood) => {
    const arc = x => `<path d="M${x - 7} ${y + 3}q7-10 14 0" fill="none" stroke="#2a1b3d" stroke-width="4.5"/>`;
    const lid = x => `<path d="M${x - 7} ${y - 1}q7 8 14 0" fill="none" stroke="#2a1b3d" stroke-width="4.5"/>`;
    const e = x => `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="9" fill="#2a1b3d" stroke="none"/><circle cx="${x + 2.4}" cy="${y - 3.4}" r="2.7" fill="#fff" stroke="none"/><circle cx="${x - 2}" cy="${y + 3.6}" r="1.3" fill="#fff" stroke="none"/>`;
    if (mood === 'happy') return arc(x1) + arc(x2);
    if (mood === 'sleepy') return lid(x1) + lid(x2);
    if (mood === 'wink') return e(x1) + arc(x2);
    return e(x1) + e(x2);
  };
  const blushSVG = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="6" ry="3.6" fill="#ff6fa0" fill-opacity=".55" stroke="none"/><ellipse cx="${x2}" cy="${y}" rx="6" ry="3.6" fill="#ff6fa0" fill-opacity=".55" stroke="none"/>`;
  const smileSVG = (x, y, w) => `<path d="M${x - w} ${y}q${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="#2a1b3d" stroke-width="3.5"/>`;
  const gillsSVG = (x, y, sd) => [0, 1, 2].map(i => `<ellipse cx="${x + sd * (7 + i * 1.5)}" cy="${y - 12 + i * 11}" rx="9" ry="4.6" transform="rotate(${sd * (-28 + i * 28)} ${x + sd * (7 + i * 1.5)} ${y - 12 + i * 11})" fill="#ff9fc2" stroke-width="3"/>`).join('');
  const PORTRAITS = {
    guildmaster: () => SVGH('#dfe6ff', 'guildmaster',
      `<path d="M14 132c2-30 22-44 50-44s48 14 50 44z" fill="#3d55b8"/><path d="M50 92h28l-3 40H53z" fill="#fff1dc"/><circle cx="64" cy="106" r="3" fill="#ffd23f" stroke-width="2.5"/><circle cx="64" cy="118" r="3" fill="#ffd23f" stroke-width="2.5"/><path d="M90 100l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z" fill="#ffd23f" stroke-width="2.5"/>` +
      `<rect x="57" y="80" width="14" height="10" fill="#5a6290"/><path d="M50 84l12 6-12 6zM78 84l-12 6 12 6z" fill="#ff5d73" stroke-width="3"/><circle cx="64" cy="90" r="3.5" fill="#d94a5c" stroke-width="2.5"/>` +
      `<ellipse cx="64" cy="60" rx="31" ry="27" fill="#fff1dc"/>` + screenSVG(40, 44, 48, 32, 13) + ledEyesSVG(52, 76, 58, '#3fe0b8') + `<path d="M58 68q6 5 12 0" fill="none" stroke="#3fe0b8" stroke-width="3"/>` +
      `<circle cx="76" cy="58" r="10.5" fill="none" stroke="#ffd23f" stroke-width="3.5"/><path d="M84 65q6 10 2 18" fill="none" stroke="#ffd23f" stroke-width="2"/>` +
      `<path d="M86 32c6-18 20-26 30-25-3 12-14 22-27 27z" fill="#ff6b8b"/><path d="M88 32q12-12 24-22" fill="none" stroke="#fff1dc" stroke-width="2"/><path d="M42 38v-14c0-6 44-6 44 0v14z" fill="#2b3170"/><rect x="34" y="35" width="60" height="8" rx="4" fill="#2b3170"/><rect x="42" y="29" width="44" height="6" fill="#ffd23f" stroke-width="3"/><path d="M64 13l4.5 2.6v5.2L64 23.4l-4.5-2.6v-5.2z" fill="#ffd23f" stroke-width="2.5"/>`),
    mechanic: () => SVGH('#ffe2cc', 'mechanic',
      `<path d="M10 132c2-30 24-46 54-46s52 16 54 46z" fill="#ff8a4c"/><path d="M38 98h52v36H38z" fill="#33b5ff"/><path d="M42 98l-6-12M86 98l6-12" stroke="#33b5ff" stroke-width="7"/><circle cx="44" cy="101" r="3" fill="#ffd23f" stroke-width="2.5"/><circle cx="84" cy="101" r="3" fill="#ffd23f" stroke-width="2.5"/>` +
      `<circle cx="64" cy="64" r="30" fill="#d9def5"/>` + toonEyesSVG(52, 76, 70) + blushSVG(42, 86, 80) + smileSVG(64, 81, 6) +
      `<path d="M30 52c2-22 16-34 34-34s32 12 34 34c-8-6-20-9-34-9s-26 3-34 9z" fill="#5b3a8c"/><path d="M44 33q20-8 40 0l-2 7q-18-6-36 0z" fill="#2fd4ff" stroke-width="3"/><circle cx="32" cy="58" r="5.5" fill="#e8b44a" stroke-width="3"/><circle cx="96" cy="58" r="5.5" fill="#e8b44a" stroke-width="3"/>` +
      `<path d="M106 128V94" stroke="#c9cfe6" stroke-width="7"/><path d="M98 86a10 10 0 1 1 16 0l-4-5h-8z" fill="#c9cfe6"/>`),
    merchant: () => SVGH('#ffe0ef', 'merchant',
      `<path d="M26 132V84c0-8 6-12 12-12h52c6 0 12 4 12 12v48z" fill="#ff6fb5"/><path d="M26 118h76" stroke="#fff1dc" stroke-width="6"/>` + screenSVG(40, 80, 48, 30, 11) + ledEyesSVG(54, 74, 92, '#ffe45c', 'happy') + `<path d="M59 99q5 4 10 0" fill="none" stroke="#ffe45c" stroke-width="3"/>` +
      `<rect x="54" y="122" width="20" height="8" rx="3" fill="#e8b44a" stroke-width="3"/><path d="M102 98h10M112 90v16" stroke="#c9cfe6" stroke-width="5"/><circle cx="112" cy="88" r="5" fill="#ff4d5e" stroke-width="3"/>` +
      `<rect x="38" y="64" width="52" height="10" rx="5" fill="#d6dcef"/><circle cx="64" cy="40" r="28" fill="#dff6ff" fill-opacity=".85"/>` +
      `<circle cx="52" cy="54" r="6" fill="#ffd23f" stroke-width="2.5"/><circle cx="66" cy="56" r="6" fill="#3fe0b8" stroke-width="2.5"/><circle cx="78" cy="50" r="6" fill="#ff4d5e" stroke-width="2.5"/><circle cx="58" cy="43" r="6" fill="#b26bff" stroke-width="2.5"/><circle cx="72" cy="40" r="6" fill="#33b5ff" stroke-width="2.5"/><circle cx="46" cy="44" r="5.5" fill="#ff8a4c" stroke-width="2.5"/>` +
      `<path d="M46 28q8-10 18-10" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".9"/><path d="M54 14h20v-4a10 6 0 0 0-20 0z" fill="#d6dcef" stroke-width="3"/><circle cx="64" cy="7" r="4" fill="#ff4d5e" stroke-width="3"/>`),
    pilot: () => SVGH('#d6f0ff', 'pilot',
      `<path d="M16 132c2-28 22-40 48-40s46 12 48 40z" fill="#3fa9ff"/><path d="M64 96v36" stroke="#ffd23f" stroke-width="4"/><path d="M40 94c8 7 40 7 48 0l-3 10c-10 5-32 5-42 0z" fill="#ff6b3d"/><path d="M84 100q16 6 28 2-6 10-22 8z" fill="#ff8a5a"/>` +
      gillsSVG(33, 66, -1) + gillsSVG(95, 66, 1) +
      `<circle cx="64" cy="64" r="31" fill="#ffdcc8"/>` + toonEyesSVG(52, 76, 68) + blushSVG(42, 86, 78) + smileSVG(64, 80, 6) +
      `<path d="M32 56c0-20 14-34 32-34s32 14 32 34c-9-5-20-7-32-7s-23 2-32 7z" fill="#9a5b3c"/><circle cx="52" cy="38" r="8" fill="#ffa53d" stroke="#e8b44a" stroke-width="4"/><circle cx="76" cy="38" r="8" fill="#ffa53d" stroke="#e8b44a" stroke-width="4"/><path d="M60 38h8" stroke="#e8b44a" stroke-width="4"/>`),
    coach: () => SVGH('#fff6c8', 'coach',
      `<path d="M36 22l-20-6M92 22l20-6" stroke="#ff4d5e" stroke-width="7"/><path d="M64 26v-8" stroke-width="5"/><circle cx="64" cy="17" r="5" fill="#ff4d5e" stroke-width="3"/>` +
      `<circle cx="64" cy="68" r="38" fill="#ffd23f"/><path d="M30 50a38 38 0 0 1 68 0" fill="none" stroke="#ff4d5e" stroke-width="7"/><path d="M28 86h72" stroke="#ff4d5e" stroke-width="5"/>` + screenSVG(42, 52, 44, 26, 11) + ledEyesSVG(54, 74, 65, '#ff4d5e') +
      `<rect x="56" y="84" width="16" height="10" rx="5" fill="#d6dcef" stroke-width="3"/><path d="M72 89h8" stroke="#c9cfe6" stroke-width="4"/><circle cx="62" cy="89" r="2.4" fill="#ff4d5e" stroke="none"/><path d="M50 118l14-8 14 8" fill="none" stroke="#5a6290" stroke-width="5"/>`),
    chef: () => SVGH('#d6ffe9', 'chef',
      `<path d="M14 132c0-46 22-82 50-82s50 36 50 82z" fill="#3ddc97"/><path d="M36 96h56c-2 20-8 32-28 36-20-4-26-16-28-36z" fill="#fff6e0"/><rect x="56" y="104" width="16" height="12" rx="4" fill="#ff8fc0" stroke-width="3"/><path d="M30 60q8-14 20-18" fill="none" stroke="#fff" stroke-width="4" stroke-opacity=".7"/>` +
      toonEyesSVG(50, 78, 72, 'sleepy') + blushSVG(38, 90, 82) + smileSVG(64, 84, 5) +
      `<path d="M54 50c6-14 16-14 22-6l-4 8c-4-4-10-4-14 2z" fill="#fff6e0" stroke-width="3"/><path d="M53 50l25-4" stroke="#ff8fc0" stroke-width="4"/><path d="M66 50q4-14 12-14" fill="none" stroke="#3ddc97" stroke-width="6"/>`),
    curator: () => SVGH('#fff4cf', 'curator',
      `<path d="M30 132v-12c0-6 4-8 8-8h52c4 0 8 2 8 8v12z" fill="#29b8c9"/><rect x="36" y="44" width="56" height="68" rx="8" fill="#fff3a0" fill-opacity=".75"/><circle cx="64" cy="78" r="24" fill="#fff8c8" stroke="none"/><path d="M38 46v64M90 46v64" stroke="#ffc21a" stroke-width="5"/>` +
      screenSVG(46, 60, 36, 26, 9) + ledEyesSVG(56, 72, 73, '#d9b8ff') + `<circle cx="56" cy="73" r="8" fill="none" stroke="#ffd23f" stroke-width="3"/><circle cx="72" cy="73" r="8" fill="none" stroke="#ffd23f" stroke-width="3"/><path d="M63 72h2" stroke="#ffd23f" stroke-width="3"/>` +
      `<path d="M52 104l12 5 12-5-12 4z" fill="#b26bff" stroke-width="3"/><path d="M30 46c4-16 18-24 34-24s30 8 34 24z" fill="#29b8c9"/><circle cx="64" cy="14" r="7" fill="none" stroke="#ffc21a" stroke-width="4"/><path d="M64 21v3" stroke="#ffc21a" stroke-width="4"/>`),
    companion: () => SVGH('#dff6ff', 'companion',
      `<path d="M22 84c-10-10-8-28 2-34l8 10c-4 6-4 14 2 20zM106 84c10-10 8-28-2-34l-8 10c4 6 4 14-2 20z" fill="#39d5ff"/>` +
      `<circle cx="64" cy="70" r="40" fill="#fff1dc"/><path d="M28 88a40 40 0 0 0 72 0" fill="none" stroke="#39d5ff" stroke-width="5"/><circle cx="64" cy="66" r="24" fill="#2a1b3d"/><rect x="57" y="53" width="14" height="24" rx="7" fill="#39d5ff" stroke="none"/><circle cx="62" cy="58" r="3" fill="#fff" stroke="none"/><path d="M50 52q8-6 18-6" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".3"/>` +
      `<path d="M64 30V18" stroke-width="3"/><circle cx="64" cy="14" r="5.5" fill="#ff6b8b" stroke-width="3"/>`),
    kiko: () => SVGH('#d4f7f3', 'kiko',
      `<path d="M16 132c2-28 22-40 48-40s46 12 48 40z" fill="#2ec4b6"/><path d="M64 96v36" stroke="#ffd23f" stroke-width="4"/><path d="M36 100q28 12 56 0" fill="none" stroke="#ffd23f" stroke-width="5"/>` +
      gillsSVG(32, 62, -1) + gillsSVG(96, 62, 1) +
      `<circle cx="64" cy="60" r="33" fill="#ffdcc8"/>` + toonEyesSVG(52, 76, 62) + blushSVG(41, 87, 73) + `<path d="M57 74q7 7 14 0z" fill="#2a1b3d" stroke-width="3"/>` +
      `<path d="M62 28q6-12 14-8-4 2-6 10" fill="#ffc8a8" stroke-width="3"/>`),
    mox: () => SVGH('#ffe0e6', 'mox',
      `<rect x="22" y="40" width="84" height="100" rx="12" fill="#ff5d73"/>` + screenSVG(34, 50, 60, 34, 10) + `<path d="M58 60l12 4-12 4z" fill="none"/><circle cx="64" cy="67" r="9" fill="#ffd23f" stroke="none"/><path d="M52 58l24 4" stroke="#ffd23f" stroke-width="4"/><circle cx="64" cy="67" r="13" fill="none" stroke="#e8b44a" stroke-width="3.5"/><path d="M76 74q8 8 6 18" fill="none" stroke="#e8b44a" stroke-width="2"/>` +
      `<rect x="44" y="92" width="40" height="12" rx="4" fill="#e8b44a"/><path d="M50 98h28" stroke="#2a1b3d" stroke-width="4"/><rect x="34" y="110" width="44" height="22" rx="4" fill="#2a1b3d"/><rect x="38" y="114" width="8" height="14" rx="2" fill="#7af0ff" stroke-width="2"/><rect x="50" y="114" width="8" height="14" rx="2" fill="#9be15d" stroke-width="2"/><rect x="62" y="114" width="8" height="14" rx="2" fill="#ffd23f" stroke-width="2"/>` +
      `<rect x="28" y="36" width="72" height="8" rx="4" fill="#2a1b3d"/><rect x="40" y="6" width="48" height="32" rx="4" fill="#2a1b3d"/><rect x="40" y="26" width="48" height="6" fill="#e8b44a" stroke-width="3"/>`),
    gale: () => SVGH('#dbe3ff', 'gale',
      `<path d="M8 132c2-32 24-48 56-48s54 16 56 48z" fill="#2e3f8f"/><path d="M48 92h32l-4 40H52z" fill="#fff1dc"/><circle cx="40" cy="104" r="3" fill="#e8b44a" stroke-width="2.5"/><circle cx="40" cy="118" r="3" fill="#e8b44a" stroke-width="2.5"/>` +
      `<ellipse cx="64" cy="66" rx="36" ry="30" fill="#c99a7a"/>` + toonEyesSVG(50, 78, 58) +
      `<path d="M52 84l-3 18M76 84l3 18" stroke="#fffaf2" stroke-width="6"/><ellipse cx="54" cy="78" rx="12" ry="9" fill="#f2dcc8"/><ellipse cx="74" cy="78" rx="12" ry="9" fill="#f2dcc8"/><ellipse cx="64" cy="70" rx="6" ry="4.5" fill="#5a3a3a"/><path d="M42 80l-14-2M42 84l-14 3M86 80l14-2M86 84l14 3" stroke-width="2"/>` +
      `<rect x="26" y="38" width="76" height="8" rx="4" fill="#1e2a5a"/><path d="M38 40c0-16 12-24 26-24s26 8 26 24z" fill="#fffaf2"/><rect x="38" y="32" width="52" height="7" fill="#1e2a5a" stroke-width="3"/><circle cx="64" cy="26" r="4.5" fill="#ffc21a" stroke-width="2.5"/>`),
  };
  // Ranger portraits (Locker cards, title / results requests): 128×128, same ink style as the NPC portraits.
  const RP = {
    kiko: (c) => `<path d="M16 132c2-28 22-40 48-40s46 12 48 40z" fill="${c.suit}"/><path d="M64 96v36" stroke="${c.trim}" stroke-width="4"/><path d="M36 100q28 12 56 0" fill="none" stroke="${c.trim}" stroke-width="5"/>` +
      [0, 1, 2].map(i => `<ellipse cx="${32 - (7 + i * 1.5)}" cy="${50 + i * 11}" rx="9" ry="4.6" transform="rotate(${28 - i * 28} ${32 - (7 + i * 1.5)} ${50 + i * 11})" fill="${c.extra}" stroke-width="3"/><ellipse cx="${96 + 7 + i * 1.5}" cy="${50 + i * 11}" rx="9" ry="4.6" transform="rotate(${-28 + i * 28} ${96 + 7 + i * 1.5} ${50 + i * 11})" fill="${c.extra}" stroke-width="3"/>`).join('') +
      `<circle cx="64" cy="60" r="33" fill="${c.skin}"/>` + toonEyesSVG(52, 76, 62) + blushSVG(41, 87, 73) + `<path d="M57 74q7 7 14 0z" fill="#2a1b3d" stroke-width="3"/>` +
      `<path d="M27 64a37 38 0 0 1 74 0" fill="#dff6ff" fill-opacity=".32" stroke="#ffffff" stroke-opacity=".9" stroke-width="3"/><path d="M27 64a37 38 0 0 1 74 0" fill="none" stroke-width="2"/><path d="M38 40q10-12 26-13" fill="none" stroke="#fff" stroke-width="4" stroke-opacity=".9"/>` +
      `<circle cx="27" cy="66" r="5" fill="${c.trim}" stroke-width="3"/><circle cx="101" cy="66" r="5" fill="${c.trim}" stroke-width="3"/>`,
    pip: (c) => `<path d="M30 132c2-22 14-32 34-32s32 10 34 32z" fill="${c.suit}"/><path d="M40 104q24 9 48 0" fill="none" stroke="${c.trim}" stroke-width="5"/><path d="M64 112l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="${c.trim}" stroke-width="2"/>` +
      `<circle cx="64" cy="64" r="36" fill="${c.skin}"/>` + toonEyesSVG(51, 77, 70) + blushSVG(38, 90, 82) + smileSVG(64, 82, 6) +
      `<path d="M27 58a37 36 0 0 1 74 0z" fill="${c.extra}"/><path d="M27 58h74" stroke="${c.suit}" stroke-width="6"/><path d="M40 40q10-10 22-11" fill="none" stroke="#fff" stroke-width="4" stroke-opacity=".9"/>` +
      `<circle cx="26" cy="66" r="9" fill="${c.suit}"/><circle cx="102" cy="66" r="9" fill="${c.suit}"/><circle cx="26" cy="66" r="4" fill="${c.extra2}" stroke-width="2"/><circle cx="102" cy="66" r="4" fill="${c.extra2}" stroke-width="2"/>` +
      `<path d="M64 23V8" stroke-width="3.5"/><path d="M64 0l3.6 7.4 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z" fill="${c.extra2}" stroke-width="2.5"/>`,
    juno: (c) => `<path d="M24 132c2-26 18-38 40-38s38 12 40 38z" fill="${c.suit}"/><path d="M40 96q24 12 48 0l-4 10q-20 9-40 0z" fill="${c.trim}"/><path d="M80 102q16 6 24 2-4 10-18 8z" fill="${c.trim}"/>` +
      `<path d="M32 50l-18-32 8-2 20 26z" fill="${c.extra}"/><path d="M96 50l18-32-8-2-20 26z" fill="${c.extra}"/>` +
      `<ellipse cx="64" cy="58" rx="31" ry="30" fill="${c.skin}"/><path d="M60 29h8v12h-8z" fill="${c.suit}" stroke-width="2.5"/>` +
      `<rect x="38" y="48" width="52" height="25" rx="12.5" fill="#${(c.visor != null ? c.visor : 0x2a1b3d).toString(16).padStart(6, '0')}"/><rect x="47" y="55" width="12" height="9" rx="4.5" fill="#${(c.eye != null ? c.eye : 0x7af0ff).toString(16).padStart(6, '0')}" stroke="none"/><rect x="69" y="55" width="12" height="9" rx="4.5" fill="#${(c.eye != null ? c.eye : 0x7af0ff).toString(16).padStart(6, '0')}" stroke="none"/><path d="M44 53q10-4 22-3" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>` +
      `<circle cx="33" cy="60" r="5" fill="${c.suit}" stroke-width="3"/><circle cx="95" cy="60" r="5" fill="${c.suit}" stroke-width="3"/>`,
    tuck: (c) => `<path d="M8 132c2-30 24-44 56-44s54 14 56 44z" fill="${c.suit}"/><path d="M40 92l-6 40M88 92l6 40" stroke="${c.trim}" stroke-width="6"/><path d="M44 96h40v36H44z" fill="${c.skin2 || '#fff1dc'}"/><path d="M50 112h28v20H50z" fill="${c.suit}"/>` +
      `<circle cx="30" cy="40" r="12" fill="${c.skin}"/><circle cx="98" cy="40" r="12" fill="${c.skin}"/><circle cx="30" cy="40" r="6" fill="${c.skin2 || '#fff1dc'}" stroke-width="2.5"/><circle cx="98" cy="40" r="6" fill="${c.skin2 || '#fff1dc'}" stroke-width="2.5"/>` +
      `<circle cx="64" cy="64" r="32" fill="${c.skin}"/><ellipse cx="64" cy="80" rx="14" ry="10" fill="${c.skin2 || '#fff1dc'}"/><ellipse cx="64" cy="74" rx="5" ry="3.6" fill="#5b3a5a" stroke="none"/>` + toonEyesSVG(51, 77, 64) + blushSVG(39, 89, 76) + `<path d="M58 84q6 5 12 0" fill="none" stroke="#2a1b3d" stroke-width="3"/>` +
      `<path d="M31 50c0-20 14-30 33-30s33 10 33 30z" fill="${c.extra}"/><path d="M38 50h52l10 6H28z" fill="${c.extra}"/><circle cx="52" cy="38" r="8" fill="${c.extra2}" stroke="#5a6290" stroke-width="4"/><circle cx="76" cy="38" r="8" fill="${c.extra2}" stroke="#5a6290" stroke-width="4"/><path d="M60 38h8" stroke="#5a6290" stroke-width="3"/>`,
  };
  const hx = v => (typeof v === 'number' ? '#' + (v >>> 0).toString(16).padStart(6, '0').slice(-6) : v);
  Geo.rangerPortraitSVG = function (id, C) {
    if (!RP[id]) id = 'kiko';
    C = C || rangerDefaults(id);
    const c = {};
    for (const k in C) c[k] = (k === 'visor' || k === 'eye' || typeof C[k] !== 'number') ? C[k] : hx(C[k]);
    const bg = hx(mixHex(hexOf(C.suit), 0xffffff, 0.8));
    return SVGH(bg, 'rg-' + id, RP[id](c));
  };
  PORTRAITS.kiko = () => Geo.rangerPortraitSVG('kiko', rangerDefaults('kiko'));
  Geo.npcPortraitSVG = function (kind) { return (PORTRAITS[kind] || PORTRAITS.companion)(); };

  // ------------------------------------------------------------------ ships (racing + hangar)
  const SHIP_STYLES = Geo.SHIP_STYLES = ['arrow', 'manta', 'twin', 'bulky', 'needle'];
  const SHIP_METAL = 0x3b4373;
  // Ships face +Z (nose), engines exhaust toward -Z; origin at the hull centre. Units: metres (~4 m long).
  // Each style: body(k, C), wing(k, C) for the wing on the +X side (the pilot's LEFT, since ships face
  // +Z) in pivot space; it is mirrored for wingR at -X. wingAt, cockpit {p, s}, engines [{p, r}] on the
  // body, wingEngines on the +X wing (mirrored too).
  const FUSE = (k, C, e1, e2, t, a, len, h, p, col, ws, hs) => k.add(U.sq(e1, e2, t, ws || 16, hs || 9), col != null ? col : C.main, p || [0, 0, 0], [HP, 0, 0], [a, len, h]);
  const nozzle = (k, C, p, r) => {
    k.add(U.cyl(0.78, 12, true), SHIP_METAL, [p[0], p[1], p[2] + r * 0.6], [HP, 0, 0], [r, r * 1.3, r]);
    k.add(U.tor(0.16, 4, 14), C.accent, [p[0], p[1], p[2]], null, r * 1.02);
    k.add(U.cyl(1, 12), C.glow, [p[0], p[1], p[2] + r * 0.9], [HP, 0, 0], [r * 0.82, 0.02, r * 0.82], { bright: 1.6 });
  };
  const SHIPS = {
    arrow: {
      body(k, C) {
        FUSE(k, C, 0.7, 0.9, -0.55, 0.56, 2.05, 0.42);
        k.add(U.sq(0.5, 0.5, 0, 8, 4), C.accent, [0, 0.39, -0.35], [HP, 0, 0], [0.09, 0.95, 0.04]);
        for (const sd of [-1, 1]) k.add(U.sq(0.6, 0.6, 0, 10, 6), SHIP_METAL, [sd * 0.5, -0.06, 0.1], [HP, 0, 0], [0.12, 0.4, 0.15]);
        k.add(slabGeo([[0, -1.25], [0, -0.45], [0.78, -1.3], [0.78, -1.6]], 0.07, 0.03), C.accent, [0, 0.3, 0], [0, 0, HP]);
        k.add(U.sph(10, 6), C.accent, [0, 0, 2.02], null, [0.08, 0.08, 0.08]);
      },
      wing(k, C) {
        k.add(slabGeo([[0, 0.45], [0, -1.15], [1.85, -1.45], [1.85, -1.05]], 0.08, 0.035), C.main, [0, 0, 0]);
        k.add(slabGeo([[0, -1.0], [0, -1.45], [0.38, -1.52], [0.36, -1.22]], 0.05, 0.02), C.accent, [1.84, 0, 0], [0, 0, HP]);
        k.add(slabGeo([[0.9, -0.72], [0.9, -1.08], [1.62, -1.35], [1.62, -1.0]], 0.02, 0), C.accent, [0, 0.052, 0]);
      },
      wingAt: [0.45, -0.05, 0], cockpit: { p: [0, 0.3, 0.55], s: [0.3, 0.3, 0.72] }, engines: [{ p: [0, 0, -2.1], r: 0.29 }],
    },
    manta: {
      body(k, C) {
        FUSE(k, C, 0.5, 0.75, 0, 2.0, 1.25, 0.24, null, null, 20, 8);
        FUSE(k, C, 0.3, 0.75, 0, 2.06, 1.3, 0.06, [0, -0.02, 0], C.accent, 20, 3);
        FUSE(k, C, 0.8, 1, -0.2, 0.55, 1.2, 0.38, [0, 0.08, 0.05], shade(C.main, 1.12), 14, 8);
        for (const sd of [-1, 1]) k.add(U.sq(1, 1, -0.6, 10, 6), C.accent, [sd * 0.55, 0, 1.32], [HP, 0, -sd * 0.28], [0.12, 0.4, 0.06]);
        k.add(U.cone(8), C.accent, [0, 0.05, -1.85], [-HP, 0, 0], [0.07, 1.4, 0.07]);
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) k.add(U.sph(5, 3), C.glow, [sd * (0.95 + i * 0.32), 0.21 - i * 0.03, 0.15 - i * 0.12], null, 0.045, { bright: 1.5 });
      },
      wing(k, C) { k.add(slabGeo([[0, 0.3], [0, -0.6], [0.48, -0.72], [0.42, -0.12]], 0.05, 0.02), C.accent, [0, 0, 0], [0, 0, HP - 0.35]); },
      wingAt: [1.9, 0.04, -0.1], cockpit: { p: [0, 0.42, 0.35], s: [0.32, 0.26, 0.55] }, engines: [{ p: [-0.62, 0.02, -1.18], r: 0.2 }, { p: [0.62, 0.02, -1.18], r: 0.2 }],
    },
    twin: {
      body(k, C) {
        FUSE(k, C, 0.75, 1, -0.45, 0.42, 1.25, 0.38, [0, 0, 0.35]);
        for (const sd of [-1, 1]) {
          FUSE(k, C, 0.6, 1, -0.2, 0.26, 1.7, 0.26, [sd * 1.25, 0, -0.35], null, 12, 8);
          k.add(U.sq(1, 1, -0.5, 8, 5), C.accent, [sd * 1.25, 0, 1.3], [HP, 0, 0], [0.2, 0.32, 0.2]);
          k.add(slabGeo([[0, -1.4], [0, -1.95], [0.58, -2.05], [0.52, -1.7]], 0.06, 0.025), C.accent, [sd * 1.25, 0.2, 0], [0, 0, HP]);
        }
        k.add(slabGeo([[-1.25, -1.55], [-1.25, -1.92], [1.25, -1.92], [1.25, -1.55]], 0.06, 0.025), C.accent, [0, 0.12, 0]);
        k.add(U.sq(0.5, 0.5, 0, 8, 4), SHIP_METAL, [0, -0.02, -0.3], null, [1.2, 0.05, 0.25]);
      },
      wing(k, C) {
        k.add(slabGeo([[0, 0.45], [0, -0.55], [1.75, -0.72], [1.75, 0.05]], 0.08, 0.035), C.main, [0, 0, 0]);
        k.add(slabGeo([[1.4, -0.66], [1.4, 0.0], [1.75, 0.05], [1.75, -0.72]], 0.09, 0.03), C.accent, [0, 0, 0]);
      },
      wingAt: [0.38, -0.02, 0], cockpit: { p: [0, 0.3, 0.62], s: [0.28, 0.28, 0.6] }, engines: [{ p: [-1.25, 0, -2.08], r: 0.22 }, { p: [1.25, 0, -2.08], r: 0.22 }],
    },
    bulky: {
      body(k, C) {
        FUSE(k, C, 0.35, 0.45, 0, 0.85, 1.55, 0.62, null, null, 14, 8);
        k.add(U.sq(0.5, 0.5, 0, 12, 4), C.accent, [0, -0.25, 1.55], null, [0.92, 0.12, 0.16]);
        k.add(U.sq(0.5, 0.5, 0, 8, 4), C.accent, [0, 0.61, -0.25], [HP, 0, 0], [0.16, 0.9, 0.04]);
        for (const sd of [-1, 1]) k.add(U.sph(8, 5), C.glow, [sd * 0.52, 0.08, 1.56], null, [0.13, 0.09, 0.05], { bright: 1.6 });
        k.add(U.sq(0.5, 0.5, 0, 8, 4), SHIP_METAL, [0, -0.6, 0], null, [0.6, 0.06, 1.2]);
      },
      wing(k, C) {
        k.add(slabGeo([[0, 0.4], [0, -0.7], [0.78, -0.6], [0.78, -0.1]], 0.18, 0.05), C.main, [0, 0, 0]);
        FUSE(k, C, 0.6, 1, -0.15, 0.3, 0.75, 0.3, [0.95, 0, -0.3], C.accent, 12, 7);
        nozzle(k, C, [0.95, 0, -1.05], 0.2);
      },
      wingAt: [0.8, -0.1, 0], cockpit: { p: [0, 0.55, 0.5], s: [0.45, 0.3, 0.62] }, engines: [{ p: [0, 0.05, -1.62], r: 0.32 }], wingEngines: [{ p: [0.95, 0, -1.08], r: 0.2 }],
    },
    needle: {
      body(k, C) {
        FUSE(k, C, 0.8, 1, -0.35, 0.3, 2.3, 0.3, [0, 0, -0.2]);
        k.add(U.cone(10), C.accent, [0, 0, 2.6], [HP, 0, 0], [0.09, 1.35, 0.09]);
        k.add(U.tor(0.09, 6, 36), C.accent, [0, 0, -1.8], null, 0.78);
        for (let i = 0; i < 3; i++) { const a = HP + i * TAU / 3; k.bone(SHIP_METAL, [Math.cos(a) * 0.22, Math.sin(a) * 0.22, -1.75], [Math.cos(a) * 0.74, Math.sin(a) * 0.74, -1.8], 0.03); }
        k.add(slabGeo([[0, -0.9], [0, -1.6], [0.42, -1.72], [0.36, -1.2]], 0.05, 0.02), C.accent, [0, 0.22, 0], [0, 0, HP]);
      },
      wing(k, C) {
        k.add(slabGeo([[0, 0.05], [0, -0.6], [0.98, -0.98], [0.98, -0.68]], 0.05, 0.02), C.main, [0, 0, 0]);
        k.add(slabGeo([[0.7, -0.62], [0.7, -0.88], [0.98, -0.98], [0.98, -0.68]], 0.06, 0.02), C.accent, [0, 0, 0]);
      },
      wingAt: [0.25, 0, -0.9], cockpit: { p: [0, 0.22, 0.75], s: [0.18, 0.2, 0.62] }, engines: [{ p: [0, 0, -2.55], r: 0.22 }],
    },
  };
  Geo.ship = function (style, colors) {
    style = SHIPS[style] ? style : 'arrow';
    const D = SHIPS[style];
    const C = Object.assign({ main: 0x2ec4b6, accent: 0xffd23f, glow: 0x7af0ff }, colors || {}); // GDD player paint
    C.main = hexOf(C.main); C.accent = hexOf(C.accent); C.glow = hexOf(C.glow);
    const key = `ship|${style}|${C.main}|${C.accent}|${C.glow}`;
    const mat = G.M.toon(0xffffff, { vc: true, spec: 0.85, rimStr: 0.5 });
    const glass = G.M.toon(0x3d5bd9, { spec: 1, rimStr: 0.9, rimColor: 0xbff6ff });
    const fMatShip = flameMat().clone(); fMatShip.userData = {};
    const group = new THREE.Group(); group.name = 'ship-' + style;
    const body = new THREE.Group(); body.name = 'body'; group.add(body);
    body.add(new THREE.Mesh(cg(key + '|body', () => { const k = kit(); D.body(k, C); for (const e of D.engines) nozzle(k, C, e.p, e.r); return k.build(); }), mat));
    const cockpit = new THREE.Mesh(U.sph(14, 8), glass); cockpit.name = 'cockpit';
    cockpit.position.fromArray(D.cockpit.p); cockpit.scale.fromArray(D.cockpit.s); body.add(cockpit);
    const engines = [], flames = [];
    const addEngine = (parent, e, mirror) => {
      const o = new THREE.Object3D(); o.name = 'engine'; o.position.set(e.p[0] * (mirror ? -1 : 1), e.p[1], e.p[2]); parent.add(o);
      const f = new THREE.Mesh(flameGeo(C.glow), fMatShip); f.name = 'flame'; f.renderOrder = 3; o.add(f);
      const sp = new THREE.Sprite(G.M.spriteGlow(C.glow, 0.85)); o.add(sp);
      o.userData = { r: e.r, flame: f, sprite: sp };
      engines.push(o); flames.push(f);
    };
    for (const e of D.engines) addEngine(body, e, false);
    const wings = {};
    for (const side of ['L', 'R']) {
      const mirror = side === 'R'; // pilot's right wing sits at -X
      const piv = new THREE.Group(); piv.name = 'wing' + side;
      piv.position.set((mirror ? -1 : 1) * D.wingAt[0], D.wingAt[1], D.wingAt[2]); body.add(piv);
      const wg = cg(key + '|wing' + side, () => { const k = kit(); D.wing(k, C); if (mirror) { const m = new THREE.Matrix4().makeScale(-1, 1, 1); for (const it of k.items) it.m.premultiply(m); } return k.build(); });
      piv.add(new THREE.Mesh(wg, mat));
      wings[side] = piv;
      for (const e of D.wingEngines || []) addEngine(piv, e, mirror);
    }
    const ship = {
      group, style, colors: C, boost: 0,
      parts: { body, engines, wingL: wings.L, wingR: wings.R, cockpit, flames },
      setBoost(k) {
        k = clamp(k || 0, 0, 1); ship.boost = k;
        for (let i = 0; i < engines.length; i++) {
          const o = engines[i], r = o.userData.r;
          o.userData.flame.scale.set(r * (1 + 0.3 * k), r * (1 + 0.3 * k), r * (2.2 + 5 * k) * (o.userData.flick || 1));
          o.userData.sprite.scale.setScalar(r * (2.6 + 2.4 * k));
        }
        fMatShip.opacity = 0.8 + 0.2 * k;
      },
      update(t) { for (let i = 0; i < engines.length; i++) engines[i].userData.flick = 1 + 0.09 * Math.sin(t * 43 + i * 1.7) + 0.05 * Math.sin(t * 71 + i); ship.setBoost(ship.boost); },
      dispose() { if (group.parent) group.parent.remove(group); fMatShip.dispose(); },
    };
    ship.setBoost(0);
    return ship;
  };

  // ------------------------------------------------------------------ space props
  // 3D value noise (deterministic) for lumpy rocks / planet bands.
  function hash3(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const c = (i, j, k2) => hash3(xi + i, yi + j, zi + k2);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
  }
  // Average normals over coincident vertices (fixes grid seams + poles after displacement).
  function smoothSeams(g) {
    g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, map = new Map();
    for (let i = 0; i < P.count; i++) {
      const key = Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4);
      let e = map.get(key); if (!e) { e = { n: new V3(), ids: [] }; map.set(key, e); }
      e.n.x += N.getX(i); e.n.y += N.getY(i); e.n.z += N.getZ(i); e.ids.push(i);
    }
    for (const e of map.values()) { e.n.normalize(); for (const i of e.ids) N.setXYZ(i, e.n.x, e.n.y, e.n.z); }
    N.needsUpdate = true;
    return g;
  }
  const ROCK_TINTS = [0xc4b5f0, 0xf2c09a, 0xa8e6cf, 0xeeb0c4, 0xa9c8f2, 0xf0dfb0];
  function asteroidGeo(seed) {
    return cg('ast|' + seed, () => {
      const g = sqGeo(1, 1, { ws: 18, hs: 12 });
      g.deleteAttribute('uv');
      const r = G.rng(seed * 131 + 7), o = [r() * 50, r() * 50, r() * 50];
      const sc = [0.85 + r() * 0.35, 0.75 + r() * 0.3, 0.85 + r() * 0.35];
      const tint = new THREE.Color(ROCK_TINTS[seed % ROCK_TINTS.length]), dark = tint.clone().multiplyScalar(0.62);
      const P = g.attributes.position, col = new Float32Array(P.count * 3), c = new THREE.Color();
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        const n = vn3(x * 1.3 + o[0], y * 1.3 + o[1], z * 1.3 + o[2]) * 0.2 + vn3(x * 2.9 + o[1], y * 2.9 + o[2], z * 2.9 + o[0]) * 0.07;
        const cr = vn3(x * 2.3 + o[2], y * 2.3 + o[0], z * 2.3 + o[1]);
        const pit = cr > 0.38 ? (cr - 0.38) * 0.35 : 0;
        const f = 1 + n - pit;
        P.setXYZ(i, x * f * sc[0], y * f * sc[1], z * f * sc[2]);
        c.copy(tint).lerp(dark, clamp(pit * 9 + (0.12 - n) * 0.8, 0, 0.8)).multiplyScalar(0.95 + y * 0.08);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return smoothSeams(g);
    });
  }
  Geo.spaceProps = {
    asteroid(size, seed) {
      const m = new THREE.Mesh(asteroidGeo((seed | 0) % 64 || 1), G.M.toon(0xffffff, { vc: true, spec: 0.12, rimStr: 0.35 }));
      m.name = 'asteroid'; m.scale.setScalar(size || 1);
      const spin = 0.15 + ((seed | 0) % 7) * 0.05;
      m.userData.tick = (t) => { m.rotation.set(t * spin * 0.6, t * spin, 0); };
      return m;
    },
    planet(radius, colors, ring) {
      colors = (colors && colors.length ? colors : [0xffb37a, 0xff7a93, 0xffe0a8]).map(hexOf);
      const key = 'planet|' + colors.join(',');
      const geo = cg(key, () => {
        const g = sqGeo(1, 1, { ws: 36, hs: 22 });
        const P = g.attributes.position, col = new Float32Array(P.count * 3), cs = colors.map(h => new THREE.Color(h));
        const nb = colors.length * 2 + 1;
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
          const u = (y * 0.5 + 0.5) * nb + 0.55 * vn3(x * 2.2 + 3, y * 1.4, z * 2.2) + 0.2 * vn3(x * 6, y * 3, z * 6);
          const bi = Math.floor(u), fr = u - bi;
          const c = cs[((bi % cs.length) + cs.length) % cs.length].clone().lerp(cs[(((bi + 1) % cs.length) + cs.length) % cs.length], clamp((fr - 0.8) / 0.2, 0, 1));
          c.multiplyScalar(1 - 0.12 * Math.abs(y));
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
      });
      const grp = new THREE.Group(); grp.name = 'planet';
      const mat = G.M.toonUnique(0xffffff, { vc: true, rimStr: 0.85, rimPow: 2.2, rimColor: shade(colors[0], 1.45) });
      mat.fog = false;
      const ball = new THREE.Mesh(geo, mat); ball.scale.setScalar(radius || 10); grp.add(ball);
      if (ring) {
        const rg = cg('pring|' + colors.join(','), () => {
          const g = new THREE.RingGeometry(1.35, 2.2, 72, 4).rotateX(-HP);
          const P = g.attributes.position, col = new Float32Array(P.count * 3);
          const a = new THREE.Color(colors[colors.length - 1]), b = new THREE.Color(0xffffff);
          for (let i = 0; i < P.count; i++) { const d = Math.hypot(P.getX(i), P.getZ(i)); const s = 0.5 + 0.5 * Math.sin(d * 18); const c = a.clone().lerp(b, s * 0.5).multiplyScalar(0.75 + 0.25 * s); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3));
          return g;
        });
        const rm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, side: THREE.DoubleSide, fog: false, depthWrite: false });
        const rmesh = new THREE.Mesh(rg, rm); rmesh.scale.setScalar(radius || 10); grp.add(rmesh);
      }
      grp.rotation.set(0.25, 0, 0.38);
      grp.userData.tick = (t) => { ball.rotation.y = t * 0.05; };
      return grp;
    },
    station(size) {
      const s = size || 1, grp = new THREE.Group(); grp.name = 'station';
      const mat = G.M.toon(0xffffff, { vc: true, spec: 0.7, rimStr: 0.45 });
      const hull = 0xe8ecff, acc = 0xff8a4c, panel = 0x3d6bff;
      grp.add(new THREE.Mesh(cg('station|core', () => {
        const k = kit();
        k.add(U.sph(18, 12), hull, [0, 0, 0], null, 0.55, { grad: 0.15 });
        k.add(U.tor(0.12, 5, 24), acc, [0, 0, 0], [HP, 0, 0], 0.56);
        k.add(U.cyl(1, 12), SHIP_METAL, [0, 0, 0], null, [0.14, 2.4, 0.14]);
        k.add(U.sph(12, 8), hull, [0, 1.2, 0], null, [0.25, 0.18, 0.25]);
        k.add(U.tor(0.25, 5, 16), acc, [0, -1.25, 0], [HP, 0, 0], 0.22);
        k.add(U.cyl(1, 8), SHIP_METAL, [0, 0, 0], [0, 0, HP], [0.05, 3.6, 0.05]);
        for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
          k.add(U.box(), i % 2 ? panel : shade(panel, 1.3), [sd * (0.75 + i * 0.27), 0, 0], null, [0.25, 0.02, 0.6]);
        }
        k.addM(cg('dish', () => new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.05, 0.012), new THREE.Vector2(0.09, 0.04), new THREE.Vector2(0.1, 0.055)], 14)), acc, mat4([0, 1.4, 0.05], [0.6, 0, 0], 2.2));
        return k.build();
      }), mat));
      const ring = new THREE.Mesh(cg('station|ring', () => {
        const k = kit();
        k.add(U.tor(0.08, 6, 40), hull, [0, 0, 0], [HP, 0, 0], 1.55);
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; k.bone(SHIP_METAL, [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], [Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5], 0.04); }
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.add(U.sph(6, 4), 0xfff06a, [Math.cos(a) * 1.55, 0.13, Math.sin(a) * 1.55], null, 0.04, { bright: 1.6 }); }
        return k.build();
      }), mat);
      grp.add(ring);
      const lights = [[1.85, 0, 0], [-1.85, 0, 0], [0, 1.55, 0.2]].map((p, i) => { const sp = G.R.glowSprite(i === 2 ? 0xff5d73 : 0x7ff3ff, 0.45, 0.9); sp.position.fromArray(p); grp.add(sp); return sp; });
      grp.scale.setScalar(s);
      grp.userData.tick = (t) => { ring.rotation.y = t * 0.3; for (let i = 0; i < lights.length; i++) lights[i].visible = Math.sin(t * 3 + i * 2.1) > -0.2; };
      return grp;
    },
    ringGate(radius, color) {
      const R = radius || 6, col = hexOf(color != null ? color : 0x7ff3ff);
      const grp = new THREE.Group(); grp.name = 'ringGate';
      const mat = G.M.toon(0xffffff, { vc: true, emissive: col, ei: 0.35, spec: 0.8, rimStr: 0.5 });
      grp.add(new THREE.Mesh(cg('gate|' + col, () => {
        const k = kit();
        k.add(U.tor(0.07, 8, 48), col, [0, 0, 0], null, 1);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.add(U.sq(0.5, 0.5, 0, 6, 4), 0xffffff, [Math.cos(a), Math.sin(a), 0], [0, 0, a], [0.09, 0.05, 0.11]); }
        return k.build();
      }), mat));
      const gm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      const glow = new THREE.Mesh(U.tor(0.17, 6, 40), gm); grp.add(glow);
      grp.scale.setScalar(R);
      grp.userData.tick = (t) => { gm.opacity = 0.22 + 0.14 * Math.sin(t * 4); glow.rotation.z = t * 0.5; };
      grp.userData.setColor = (c) => { gm.color.setHex(hexOf(c)); };
      return grp;
    },
    boostPad(w, l) {
      w = w || 3; l = l || 6;
      const grp = new THREE.Group(); grp.name = 'boostPad';
      const base = boostTex();
      const tex = base.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, Math.max(1, Math.round(l / w * 1.5)));
      const strip = new THREE.Mesh(U.plane(), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true }));
      strip.rotation.x = -HP; strip.scale.set(w, l, 1); strip.position.y = 0.06; grp.add(strip);
      const frame = new THREE.Mesh(U.sq(0.2, 0.2, 0, 12, 4), G.M.toon(0x2b3170, { spec: 0.4 }));
      frame.scale.set(w / 2 + 0.15, 0.05, l / 2 + 0.15); grp.add(frame);
      grp.userData.tick = (t) => { tex.offset.y = (t * 1.6) % 1; };
      grp.userData.dispose = () => { tex.dispose(); strip.material.dispose(); };
      return grp;
    },
    itemBox() {
      const grp = new THREE.Group(); grp.name = 'itemBox';
      const piv = new THREE.Group(); grp.add(piv);
      if (!Geo._itemMat) { Geo._itemMat = new THREE.MeshBasicMaterial({ map: itemTex() }); Geo._itemMat.userData.shared = true; }
      const inner = new THREE.Mesh(cg('itemCube', () => new THREE.BoxGeometry(0.62, 0.62, 0.62)), Geo._itemMat); piv.add(inner);
      const shell = new THREE.Mesh(U.sq(0.35, 0.35, 0, 16, 10), G.M.toon(0xe8f6ff, { transparent: true, opacity: 0.35, spec: 1, rimStr: 0.9 }));
      shell.scale.setScalar(0.48); piv.add(shell);
      const gl = G.R.glowSprite(0xfff3c0, 1.5, 0.45); piv.add(gl);
      grp.userData.tick = (t) => { piv.rotation.set(0.35 * Math.sin(t * 0.9), t * 1.3, 0.2 * Math.cos(t * 0.8)); piv.position.y = 0.12 * Math.sin(t * 2.4); };
      return grp;
    },
  };
  function boostTex() {
    if (Geo._boostTex) return Geo._boostTex;
    const t = G.R.canvasTex(64, 64, (g) => {
      const grd = g.createLinearGradient(0, 0, 64, 0);
      grd.addColorStop(0, 'rgba(255,120,40,0.85)'); grd.addColorStop(0.5, 'rgba(255,170,40,0.95)'); grd.addColorStop(1, 'rgba(255,120,40,0.85)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = '#fff6b0'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(12, 14); g.lineTo(32, 40); g.lineTo(52, 14); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(3, 0); g.lineTo(3, 64); g.moveTo(61, 0); g.lineTo(61, 64); g.stroke();
    });
    t.userData.shared = true;
    Geo._boostTex = t;
    return t;
  }
  function itemTex() {
    const t = G.R.canvasTex(128, 128, (g) => {
      const grd = g.createLinearGradient(0, 0, 128, 128);
      grd.addColorStop(0, '#ff7ab8'); grd.addColorStop(0.35, '#ffd23f'); grd.addColorStop(0.7, '#5cf2c8'); grd.addColorStop(1, '#7fa8ff');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 116);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const q = (lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(64, 48, 20, PI * 1.05, PI * 2.2); g.quadraticCurveTo(64, 66, 64, 76); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(64, 98, lw * 0.62, 0, TAU); g.fill(); };
      q(22, INK); q(13, '#ffffff');
    });
    t.userData.shared = true;
    return t;
  }

  // ------------------------------------------------------------------ ink blob decoration
  Geo.inkBlob = function (color) {
    const col = hexOf(color != null ? color : 0xff8a1f);
    const grp = new THREE.Group(); grp.name = 'inkBlob';
    const rig = new THREE.Group(); grp.add(rig);
    const P = { a: 0.22, b: 0.2, c: 0.21, e1: 0.85, e2: 1, t: -0.4, cy: 0.2 };
    rig.add(new THREE.Mesh(cg('inkblob|' + col, () => {
      const k = kit();
      addShell(k, P, col, [16, 10], { grad: 0.25 });
      k.add(U.sq(1, 1, -0.75, 8, 5), shade(col, 1.2), [0.02, 0.43, -0.02], [-0.5, 0, -0.3], [0.045, 0.08, 0.045]);
      for (let i = 0; i < 4; i++) { const a = PI * 0.65 + i * 0.6; k.add(U.sph(8, 5), col, [Math.cos(a) * 0.2, 0.03, -Math.abs(Math.sin(a)) * 0.2 - 0.02], null, [0.075, 0.035, 0.075]); }
      return k.build();
    }), jellyMat()));
    const fm = faceMat(Geo.face('happy', { style: 'toon' }));
    rig.add(facePatch(P, { latC: 0.0, w: 1.5, h: 1.2 }, fm));
    const sh = G.R.blobShadow(0.24); sh.position.y = 0.02; grp.add(sh);
    const seed = Math.random() * TAU;
    grp.userData.tick = (t) => { squash(rig, 1 + 0.05 * Math.sin(t * 3.2 + seed)); rig.rotation.y = 0.15 * Math.sin(t * 0.8 + seed); };
    return grp;
  };

  // ------------------------------------------------------------------ helmet pieces shared by rangers and bot rangers
  // All take a head shell P {a,b,c,e1,e2,t,cy} and add to a kit k in head space.
  // Swept-back fins on both sides (Juno's "ear-fin" helmet).
  const FIN_PTS = [[0, 0.07], [0, -0.07], [0.19, -0.19], [0.235, -0.15]];
  function finsInto(k, P, col, size, lean) {
    const sz = size || 1;
    for (const sd of [-1, 1]) k.add(slabGeo(FIN_PTS, 0.026, 0.01), col, [sd * P.a * 0.9, P.cy + P.b * 0.25, -P.c * 0.12], [0, 0, HP - sd * (lean != null ? lean : 0.32)], sz, { grad: 0.12 });
  }
  // Dome cap over the top of the head + antenna stalk + ball (Pip's "antenna dome"); ball = null to skip the tip.
  function domeInto(k, P, col, band, stalk, ball, h, lat0) {
    const l0 = lat0 != null ? lat0 : 0.25;
    k.add(cap(Object.assign({}, P, { cy: 0 }), l0), col, [0, P.cy, 0], null, [P.a * 1.06, P.b * 1.06, P.c * 1.06], { grad: 0.12 });
    addBand(k, Object.assign({}, P, { a: P.a * 1.06, b: P.b * 1.06, c: P.c * 1.06 }), l0, band, 0.022, 1.0);
    const top = P.cy + P.b * 1.06, hh = h || 0.14;
    k.add(U.cyl(1, 8), stalk, [0, top + hh * 0.5, 0], null, [0.011, hh, 0.011]);
    if (ball != null) k.add(U.sph(10, 8), ball, [0, top + hh + 0.02, 0], null, 0.034, { bright: 1.25 });
    return top + hh + 0.02;
  }
  // Top crest fin + ear studs (the classic bot-ranger helmet).
  function crestInto(k, P, col) {
    k.add(U.sq(0.5, 1, 0, 8, 4), col, [0, P.cy + P.b - 0.01, -0.01], null, [0.028, 0.07, 0.14]);
    for (const sd of [-1, 1]) k.add(U.cyl(1, 10), col, [sd * (P.a + 0.01), P.cy, 0], [0, 0, HP], [0.06, 0.04, 0.06]);
  }
  // Soft cap with a front brim and goggles resting on it (Tuck's "goggles cap"). lens = goggle glass colour.
  function goggleCapInto(k, P, col, frame, lens) {
    const Q = Object.assign({}, P, { cy: 0 });
    k.add(cap(Q, 0.38), col, [0, P.cy, 0], null, [P.a * 1.07, P.b * 1.07, P.c * 1.07], { grad: 0.14 });
    const fb = sqPt(P, 0.42, HP);
    k.add(U.sph(14, 6), col, [0, fb.p.y - 0.005, fb.p.z + 0.035], [-0.12, 0, 0], [P.a * 0.9, 0.022, P.c * 0.62], { grad: 0.1 });   // brim
    k.add(U.sph(8, 6), shade(col, 1.15), [0, P.cy + P.b * 1.07, 0], null, 0.026);   // button
    for (const sd of [-1, 1]) {
      const q = sqPt(P, 0.72, HP + sd * 0.42);
      const pp = q.p.clone().addScaledVector(q.n, 0.03);
      k.orient(U.tor(0.22, 6, 16), frame, arr(pp), q.n, 'z', 0.05);
      k.orient(U.cyl(1, 14), lens, arr(pp), q.n, 'y', [0.044, 0.012, 0.044], { bright: 1.2 });
    }
    // strap round the cap
    addBand(k, Object.assign({}, P, { a: P.a * 1.07, b: P.b * 1.07, c: P.c * 1.07 }), 0.62, frame, 0.012, 1.0);
  }
  Geo.helmetParts = { fins: finsInto, dome: domeInto, crest: crestInto, goggles: goggleCapInto };

  // ------------------------------------------------------------------ humanoid ink rangers (bots)
  // ~1.65 m chunky robo-ranger, faces +Z, gun held at the right hip. colors {main (team), accent, dark, visor, seed}.
  // opts {seed, helmet 0..2, build 0..1}: the seed picks one of 3 helmets (crest / swept fins / antenna dome, the same
  // pieces the playable rangers wear) × 2 builds (standard / sturdy: broad barrel chest, chunky limbs), so a 16-ranger
  // lobby reads as different people by silhouette, not only by colour. Without a seed each new ranger takes the next one.
  let humAuto = 0;
  Geo.humanoid = function (colors, opts) {
    opts = opts || {};
    const C = Object.assign({ main: 0xff8a1f, accent: 0xf3faff, dark: 0x3a3f6b, visor: null }, colors || {});
    C.main = hexOf(C.main); C.accent = hexOf(C.accent); C.dark = hexOf(C.dark);
    const vis = C.visor != null ? hexOf(C.visor) : mixHex(C.main, 0xffffff, 0.5);
    let seed = opts.seed != null ? opts.seed : C.seed != null ? C.seed : humAuto++;
    seed = Math.abs(Math.round(+seed || 0));
    const helm = opts.helmet != null ? opts.helmet % 3 : seed % 3, build = opts.build != null ? opts.build % 2 : Math.floor(seed / 3) % 2;
    // hip height = leg length. Both builds keep the same height: the bots' hit boxes and head-crit lines are fixed
    // (G.Bot critY 1.4, royale 1.36, turf 1.38), so a shorter build would hide its visor below the crit line.
    const sturdy = build === 1, LL = 0.7;
    const key = `hum|${C.main}|${C.accent}|${C.dark}|h${helm}b${build}`;
    const mat = charMat({ spec: 0.7, rimStr: 0.45, edge: 0.55 });
    const fo = { style: 'led', color: vis, eyes: 'visor' };
    const fMat = faceMat(Geo.face('idle', fo));
    const blobFM = faceMat(Geo.face('happy', { style: 'toon' }));
    const group = new THREE.Group(); group.name = 'humanoid';
    const rig = new THREE.Group(); rig.name = 'rig'; group.add(rig);
    const pieces = [];
    const put = (node, g) => { if (g && g.attributes.position.count) pieces.push({ node, g }); };
    const hips = new THREE.Group(); hips.name = 'hips'; hips.position.y = LL; rig.add(hips);
    const torso = new THREE.Group(); torso.name = 'torso'; hips.add(torso);
    const SX = sturdy ? 1.2 : 1, sh = sturdy ? 0.37 : 0.31;   // chest width factor, shoulder x
    put(torso, cg(key + '|torso', () => {
      const k = kit();
      k.add(U.sq(0.5, 0.5, 0, 10, 5), C.dark, [0, 0.04, 0], null, [0.22 * SX, 0.11, 0.15 * SX]);
      if (sturdy) k.add(U.sq(0.8, 0.85, 0, 16, 10), C.main, [0, 0.31, 0], null, [0.355, 0.27, 0.235], { grad: 0.14 });   // round barrel chest
      else k.add(U.sq(0.45, 0.5, 0, 16, 9), C.main, [0, 0.33, 0], null, [0.29, 0.24, 0.19], { grad: 0.14 });
      k.add(U.sq(0.4, 0.5, 0, 10, 5), C.accent, [0, 0.38, sturdy ? 0.205 : 0.17], null, [0.18 * SX, 0.11, 0.045]);
      k.add(U.sq(0.3, 0.5, 0, 12, 4), C.dark, [0, 0.12, 0], null, [0.28 * SX, 0.04, 0.195 * SX]);
      const bz = sturdy ? -0.29 : -0.26;
      k.add(U.cap(0.11, 0.2, 10), mixHex(C.main, 0xffffff, 0.35), [0, 0.34, bz], null, null, { bright: 1.1 });
      k.add(U.cyl(1, 10), C.dark, [0, 0.52, bz], null, [0.08, 0.04, 0.08]);
      k.add(U.cyl(1, 10), C.dark, [0, 0.16, bz], null, [0.08, 0.04, 0.08]);
      k.add(U.cyl(1, 10), C.dark, [0, 0.58, 0], null, [0.08, 0.06, 0.08]);
      for (const sd of [-1, 1]) k.add(U.sq(0.7, 1, 0, 10, 5), C.main, [sd * sh, 0.52, 0], [0, 0, -sd * 0.3], [0.115 * (sturdy ? 1.12 : 1), 0.08, 0.125], { grad: 0.1 });
      return k.build(GB);
    }));
    const head = new THREE.Group(); head.name = 'head'; head.position.y = 0.6; torso.add(head);
    const HP_ = { a: 0.215, b: 0.2, c: 0.21, e1: 1, e2: 1, t: 0, cy: 0.18 };
    put(head, cg(key + '|head', () => {
      const k = kit();
      addShell(k, HP_, C.accent, [14, 10], { grad: 0.1 });
      if (helm === 1) { finsInto(k, HP_, C.main, 0.95); for (const sd of [-1, 1]) k.add(U.cyl(1, 10), C.dark, [sd * (HP_.a + 0.005), HP_.cy, 0], [0, 0, HP], [0.045, 0.03, 0.045]); }
      else if (helm === 2) domeInto(k, HP_, C.main, C.dark, C.dark, mixHex(C.main, 0xffffff, 0.45), 0.13);
      else crestInto(k, HP_, C.main);
      return k.build(GB);
    }));
    const face = facePatch(HP_, { latC: 0.06, w: 1.75, h: 0.82 }, fMat); head.add(face);
    const armG = cg(key + '|arm', () => { const k = kit(); const ar = sturdy ? 0.07 : 0.06; k.add(U.cap(ar, 0.2, 6, 1), C.dark, [0, -0.16, 0]); k.add(U.sph(9, 6), C.accent, [0, -0.33, 0], null, sturdy ? [0.09, 0.085, 0.09] : [0.078, 0.074, 0.078], { grad: 0.1 }); return k.build(GB); });
    const arms = {};
    for (const side of ['L', 'R']) {
      const sd = side === 'L' ? 1 : -1;
      const p = new THREE.Group(); p.name = 'arm' + side; p.position.set(sd * (sh + 0.02), 0.49, 0); torso.add(p);
      put(p, armG); arms[side] = p;
    }
    const gun = new THREE.Group(); gun.name = 'gun'; gun.position.set(-0.13, 0.3, 0.33); torso.add(gun);
    put(gun, cg(key + '|gun', () => {
      const k = kit();
      k.add(U.sq(0.5, 0.6, 0, 10, 6), C.accent, [0, 0, 0], null, [0.07, 0.08, 0.2], { grad: 0.1 });
      k.add(U.cap(0.045, 0.14, 8), mixHex(C.main, 0xffffff, 0.2), [0, 0.1, -0.03], [HP, 0, 0], null, { bright: 1.1 });
      k.add(U.cyl(0.85, 10), C.dark, [0, 0, 0.27], [HP, 0, 0], [0.04, 0.16, 0.04]);
      k.add(U.tor(0.3, 5, 12), C.main, [0, 0, 0.35], null, 0.042);
      k.add(U.sq(0.5, 0.5, 0, 6, 4), C.dark, [0, -0.1, -0.05], [0.3, 0, 0], [0.03, 0.07, 0.035]);
      return k.build(GB);
    }));
    const muzzle = new THREE.Object3D(); muzzle.name = 'muzzle'; muzzle.position.set(0, 0, 0.38); gun.add(muzzle);
    const legG = cg(key + '|leg', () => {
      const k = kit(), lk = LL / 0.7, lw = sturdy ? 1.15 : 1;
      k.add(U.cap(0.095 * lw, 0.3 * lk, 8, 1), C.dark, [0, -0.3 * lk, 0]);
      k.add(U.sph(8, 5), C.main, [0, -0.32 * lk, 0.075], null, [0.08 * lw, 0.08, 0.055]);
      k.add(U.sq(0.5, 0.45, 0, 10, 6), C.main, [0, -(LL - 0.1), 0.045], null, [0.12 * lw, 0.095, 0.17 * (sturdy ? 1.06 : 1)], { grad: 0.15 });
      return k.build(GB);
    });
    const legs = [];
    // leg Euler order YXZ: yaw first points the foot along the direction of travel (hip twist), then the swing
    for (const sd of [1, -1]) { const p = new THREE.Group(); p.name = 'leg'; p.position.set(sd * (sturdy ? 0.15 : 0.135), LL, 0); p.rotation.order = 'YXZ'; rig.add(p); put(p, legG); legs.push(p); }
    // jelly blob form (for swimming in own ink) — its own jelly-material mesh, only drawn while swimming
    const blob = new THREE.Group(); blob.name = 'blob'; blob.visible = false; group.add(blob);
    const BP = { a: 0.36, b: 0.27, c: 0.42, e1: 0.8, e2: 1, t: -0.25, cy: 0.25 };
    const blobMesh = new THREE.Mesh(cg(key + '|blob', () => { const k = kit(); addShell(k, BP, C.main, [16, 10], { grad: 0.25 }); k.add(U.sq(1, 1, -0.7, 8, 5), shade(C.main, 1.2), [0, 0.53, -0.06], [-0.6, 0, 0], [0.06, 0.1, 0.06]); return k.build(); }), jellyMat());
    blobMesh.name = 'blobMesh'; blob.add(blobMesh);
    blob.add(facePatch(BP, { latC: 0.12, w: 1.3, h: 1.0 }, blobFM));
    const shadow = G.R.blobShadow(0.4); shadow.position.y = 0.02; group.add(shadow);
    // ONE skinned mesh for the whole ranger; bind pose = holding the gun (also what the far LOD shows)
    arms.L.rotation.set(-1.25, 0, -0.55); arms.R.rotation.set(-1.05, 0, 0.12);
    const A = assemble(key, pieces, rig, mat, { grow: 1.3 });
    const fm = new THREE.Matrix4().copy(rig.matrixWorld).invert().multiply(face.matrixWorld);
    const scr = { key: 'scr' + vis, item: { g: face.geometry, c: mixHex(GIZ.visor, vis, 0.2), m: fm, o: { em: vis, ei: 0.1 } } };
    const h = {
      group, colors: C, height: 1.68 - (0.7 - LL), critY: 1.45 - (0.7 - LL), mat, asm: A, seed, helmet: helm, build, legL: LL * 0.943,
      parts: { rig, hips, torso, body: torso, head, face, eyes: face, visor: face, armL: arms.L, armR: arms.R, gun, weapon: gun, muzzle, legs, legL: legs[0], legR: legs[1], blob, shadow, mesh: A.mesh },
      anim: humAnim(),
      expr: 'idle', flash: 0, isBlob: false, popped: false, lod: 0, _lodMask: -1,
      setExpr(e) { e = e || 'idle'; if (e === h.expr) return; h.expr = e; fMat.map = faces[e] || (faces[e] = Geo.face(e, fo)); },
      setFlash(k) { if (k === h.flash) return; h.flash = k; mat.emissive.setRGB(k * 0.85, k * 0.85, k * 0.85); },
      setBlob(on) { on = !!on; if (on === h.isBlob) return; h.isBlob = on; h.anim.morphT = 0; },
      kick(k) { h.anim.kick = Math.max(h.anim.kick, k == null ? 1 : k); },
      // Hit reaction: (dx, dz) = world direction the blow travels; k ~0.3..1.2; big = stagger. Uses the facing the
      // last animate call saw (anim.yaw). Directional torso flinch + squash + head snap + eased flash.
      hit(dx, dz, k, big) {
        const A = h.anim;
        k = clamp(k == null ? 0.6 : k, 0, 1.5);
        const sn = Math.sin(A.yaw), cs = Math.cos(A.yaw);
        let lz = (dx || 0) * sn + (dz || 0) * cs, lx = (dx || 0) * cs - (dz || 0) * sn;
        const l = Math.hypot(lx, lz);
        if (l > 1e-4) { lx /= l; lz /= l; } else { lx = 0; lz = -1; }
        const rm = motionK(), imp = (big ? 7 : 4.2) * k * rm;
        A.sLean.v += lz * imp; A.sRoll.v -= lx * imp;
        A.sSq.v -= (big ? 5 : 3) * k * rm;
        A.sHead.v += (lx >= 0 ? -1 : 1) * imp * 1.2;
        A.flash = Math.max(A.flash, big ? 1 : 0.6 + 0.4 * Math.min(1, k));
        if (big) A.stag = Math.max(A.stag, Math.min(1, 0.65 + 0.35 * k));
        A.recoil = Math.max(A.recoil, 0.5 * k);
        A.hitT = 0;
      },
      spawnIn(delay) { h.anim.spawnT = -(delay || 0); },
      // LOD 0: skinned ranger + visor face (2 draw calls). LOD 1: ONE static mesh in the gun-holding pose
      // with the visor baked in; only the root bob / squash / blob morph / flash animate.
      setLOD(lv) {
        lv = lv ? 1 : 0;
        if (lv === h.lod) return;
        h.lod = lv;
        if (lv) { humRest(h); h._syncLod(true); } else rig.rotation.x = 0;
        if (A.mesh) A.mesh.visible = !lv; else for (const m of A.nodeMeshes) m.visible = !lv;
        if (h._lodMesh) h._lodMesh.visible = !!lv;
        face.visible = !lv;
      },
      _syncLod(force) {
        const m = hiddenMask(A);
        if (!force && m === h._lodMask) return;
        h._lodMask = m;
        const g = lodGeo(A, m, scr);
        if (!h._lodMesh) { h._lodMesh = new THREE.Mesh(g, mat); h._lodMesh.name = 'lod'; h._lodMesh.visible = false; rig.add(h._lodMesh); }
        else h._lodMesh.geometry = g;
      },
      dispose() { if (group.parent) group.parent.remove(group); mat.dispose(); fMat.dispose(); blobFM.dispose(); if (A.skeleton) A.skeleton.dispose(); },
    };
    const faces = { idle: fMat.map };
    if (A.mesh) h._syncLod(true);   // bake the far-LOD geometry and park its (hidden) mesh at spawn, so warm-ups compile it
    return h;
  };
  function humAnim() {
    return {
      state: 'idle', prev: 'idle', st: 0, ph: 0, kick: 0, recoil: 0, morphT: 1, deadT: 0, flashT: 0, flash: 0, seed: Math.random() * TAU,
      freq: 2.2 + Math.random() * 0.8, mv: 0, lf: 0, ll: 0, dirS: 1, legYaw: 0, resid: 0, yaw: 0, pyaw: NaN, yawRate: 0, svx: 0, svz: 0, alf: 0, ala: 0,
      vy: 0, air: 0, wasAir: false, aimW: 0, bph: 0, by: 0,
      sLean: SP(3.2, 0.55), sRoll: SP(3.2, 0.55), sSq: SP(4.8, 0.32), sHead: SP(4.5, 0.28), sGun: SP(5, 0.4),
      stag: 0, hitT: 9, spawnT: 99, fidT: 3 + Math.random() * 5, fid: 0, fidK: 0, arx: -1.05, alx: -1.25, hy: 0,
    };
  }
  function humRest(h) {
    const P = h.parts, A = h.anim;
    P.legs[0].rotation.set(0, 0, 0); P.legs[1].rotation.set(0, 0, 0); P.legs[0].scale.set(1, 1, 1); P.legs[1].scale.set(1, 1, 1);
    P.armL.rotation.set(-1.25, 0, -0.55); P.armR.rotation.set(-1.05, 0, 0.12);
    P.gun.position.set(-0.13, 0.3, 0.33); P.gun.rotation.set(0, 0, 0);
    P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
    A.arx = -1.05; A.alx = -1.25; A.hy = 0;
  }
  function humEnter(h, state) {
    const A = h.anim;
    A.prev = A.state; A.state = state; A.st = 0;
    if (state === 'hurt') { A.flash = Math.max(A.flash, 0.8); if (A.hitT > 0.1) { A.sLean.v -= 3; A.sSq.v -= 2; } }
    if (state === 'shoot') A.kick = 1;
    if (state === 'dead') A.deadT = 0;
  }
  function humDead(h, dt) {
    const A = h.anim, P = h.parts;
    A.deadT += dt;
    const T = A.deadT;
    let sx, sy, m = 1;
    if (T < 0.08) { const k = easeOut(T / 0.08); sx = lerp(1, 1.22, k); sy = lerp(1, 0.72, k); }
    else if (T < POP_AT) { const k = smooth01((T - 0.08) / (POP_AT - 0.08)); sx = lerp(1.22, 0.88, k); sy = lerp(0.72, 1.28, k); }
    else {
      const k = clamp((T - POP_AT) / (POP_END - POP_AT), 0, 1), q = easeOut(Math.min(1, k / 0.3));
      sx = lerp(0.88, 1.2, q); sy = lerp(1.28, 1.06, q);
      m = k < 0.3 ? 1 + 0.3 * q : Math.max(0.001, 1.3 * (1 - smooth01((k - 0.3) / 0.7)));
    }
    const tgt = h.isBlob ? P.blob : P.rig;
    tgt.scale.set(sx * m, sy * m, sx * m);
    h.setFlash(Math.min(1, 0.25 + T * 7)); h.setExpr('hurt');
    P.shadow.scale.setScalar(0.88 * Math.max(0.001, m));
    if (T >= POP_END) { h.group.visible = false; h.popped = true; return true; }
    return false;
  }
  // Ranger gait: the stride phase advances by ground speed over a step matched to the leg sweep (no skating); the
  // legs swing along the direction of travel relative to the body (hip twist up to ~45°, the rest as a side-step),
  // reversed when backpedalling, so strafing / retreating rangers never moonwalk. Torso lean / roll ride springs
  // (speed, acceleration, turns, hits); take-offs stretch, landings squash; idle breathes, shifts weight, glances.
  // state idle|run|shoot|jump|swim|hurt|dead. opts {speed, expr, vx / vz / vy (world velocity), yaw (world facing of
  // the model, +Z forward), turn (rad/s), grounded, detail (0..1 LOD fade)} — without vx/vz it moves forwards.
  // Allocation-free hot path, same rules as animateRobot.
  const LEG_L = 0.66;
  Geo.animateHumanoid = function (h, state, t, dt, opts) {
    opts = opts || EMPTY;
    const A = h.anim, P = h.parts, RM = motionK();
    autoLayers(h);
    if (state !== A.state) humEnter(h, state);
    A.st += dt; A.hitT += dt;
    if (state === 'swim') h.setBlob(true); else if (state !== 'dead') h.setBlob(false);
    // morph between ranger and jelly blob (0.18 s squash/pop)
    A.morphT += dt;
    const mk = Math.min(1, A.morphT / 0.18);
    const toBlob = h.isBlob;
    const humS = toBlob ? 1 - mk : mk, blobS = toBlob ? mk : 1 - mk;
    P.rig.visible = humS > 0.01; P.blob.visible = blobS > 0.01;
    if (state === 'dead') return humDead(h, dt);
    const D = opts.detail != null ? Math.min(1, Math.max(0, opts.detail)) : 1;
    const speed = opts.speed != null ? opts.speed : state === 'run' ? 5 : 0;
    const e7 = Math.exp(-7 * dt), e9 = Math.exp(-9 * dt), e10 = Math.exp(-10 * dt), e12 = Math.exp(-12 * dt), e13 = Math.exp(-13 * dt);
    const e14 = Math.exp(-14 * dt), e16 = Math.exp(-16 * dt), e20 = Math.exp(-20 * dt), e6 = Math.exp(-6 * dt);
    // ---- root motion in the body frame
    const idt = dt > 1e-5 ? 1 / dt : 0;
    const yaw = opts.yaw != null ? opts.yaw : A.yaw;
    let yr = 0;
    if (opts.turn != null) yr = opts.turn; else if (A.pyaw === A.pyaw) { const dy = yaw - A.pyaw; yr = (dy - TAU * Math.round(dy / TAU)) * idt; }
    A.pyaw = yaw; A.yaw = yaw;
    let fwd = speed, lat = 0;
    if (opts.vx != null) {
      const vx = opts.vx, vz = opts.vz || 0, sn = Math.sin(yaw), cs = Math.cos(yaw);
      fwd = vx * sn + vz * cs; lat = vx * cs - vz * sn;
      const dvx = vx - A.svx, dvz = vz - A.svz;
      if (dvx * dvx + dvz * dvz > 400) { A.svx = vx; A.svz = vz; }   // respawn / launch pad: no lurch
      else {
        // acceleration from the low-passed velocity, filter state averaged over the step (dt-independent, see robots)
        const svx0 = A.svx, svz0 = A.svz;
        A.svx = vx + (svx0 - vx) * e10; A.svz = vz + (svz0 - vz) * e10;
        const ax = (vx - 0.5 * (svx0 + A.svx)) * 10, az = (vz - 0.5 * (svz0 + A.svz)) * 10;
        const alf = ax * sn + az * cs, ala = ax * cs - az * sn;
        A.alf = alf + (A.alf - alf) * e20; A.ala = ala + (A.ala - ala) * e20;
      }
    }
    yr = yr > 30 || yr < -30 ? 0 : yr > 10 ? 10 : yr < -10 ? -10 : yr;
    A.yawRate = yr + (A.yawRate - yr) * e16;
    A.lf = fwd + (A.lf - fwd) * e12; A.ll = lat + (A.ll - lat) * e12;
    const air = state === 'jump' || opts.grounded === false;
    if (air && !A.wasAir) A.sSq.v += 2.4;                                                                     // take-off stretch
    else if (!air && A.wasAir && state !== 'swim') A.sSq.v -= Math.min(1, Math.max(0.35, -A.vy / 10)) * 4.2;   // landing squash
    A.wasAir = air;
    const airT = air ? 1 : 0;
    A.air = airT + (A.air - airT) * e12;
    const moving = speed > 0.3 && !air;
    const mvT = moving ? 1 : 0;
    A.mv = mvT + (A.mv - mvT) * e9;
    const mv = A.mv;
    // direction of travel relative to the body; hysteresis around ±90° between walking forwards and backpedalling
    let mang = A.lf * A.lf + A.ll * A.ll > 0.16 ? Math.atan2(A.ll, A.lf) : 0;
    let back = A.dirS < 0;
    if (!back && (mang > HP + 0.17 || mang < -HP - 0.17)) back = true; else if (back && mang < HP - 0.17 && mang > -HP + 0.17) back = false;
    if (back !== A.dirS < 0) { A.dirS = back ? -1 : 1; A.ph += PI; }   // same pose, reversed stroke: no pop
    if (back) { mang -= PI; mang -= TAU * Math.round(mang / TAU); }
    const ly = mang > 0.8 ? 0.8 : mang < -0.8 ? -0.8 : mang, lyT = ly * mv, rsT = (mang - ly) * mv;
    A.legYaw = lyT + (A.legYaw - lyT) * e10; A.resid = rsT + (A.resid - rsT) * e10;
    // stride: swing grows with speed, phase advances by ground covered over the step length (2·leg·sin(swing))
    // (cadence from the full swing at this speed, not the eased one: blending in from idle / a landing must not flutter
    // tiny fast steps; airborne the stroke winds down while the legs blend into the tuck)
    const thS = Math.min(0.85, Math.max(0.3, 0.3 + speed * 0.085)), th = mv * thS;
    A.ph += dt * PI * speed * (1 - A.air) / (2 * (h.legL || LEG_L) * Math.sin(thS));
    const ph = A.ph, swingA = Math.sin(ph) * th * A.dirS, c = Math.cos(ph);
    // ---- body: slow targets (springs) + fast layers
    const lfk = A.lf / 5, llk = A.ll / 5, al = A.alf * 0.02, aa = A.ala * 0.02;
    let lean = 0.15 * (lfk > 1.2 ? 1.2 : lfk < -0.6 ? -0.6 : lfk) * mv, roll = -0.07 * (llk > 1 ? 1 : llk < -1 ? -1 : llk) * mv;
    lean += al > 0.25 ? 0.25 : al < -0.25 ? -0.25 : al; roll -= aa > 0.25 ? 0.25 : aa < -0.25 ? -0.25 : aa;   // lean into acceleration / turns
    let fLean = 0, fRoll = 0, lift = 0, twist = 0, look = 0;
    let sy = 1 + 0.02 * RM * Math.sin(t * A.freq + A.seed);   // breathing (per-ranger rate / phase)
    if (mv > 0.01) {
      const sk = Math.min(1.2, Math.max(0.3, speed / 5)) * mv, ac = c < 0 ? -c : c;
      lift = ac * Math.sqrt(ac) * 0.05 * sk;          // highest as the legs pass, lowest at foot contact
      fRoll += Math.sin(ph) * 0.045 * mv * A.dirS;    // sway over the stance leg (dirS: unchanged across a backpedal flip)
      twist = Math.sin(ph) * 0.12 * mv * A.dirS;      // shoulders counter the legs
      sy *= 1 + 0.03 * sk * (ac - 0.5) * RM;
    }
    sy *= 1 + 0.05 * A.air;
    if (mv < 0.05 && !air) {
      fRoll += 0.025 * Math.sin(t * 0.6 + A.seed) * RM;   // idle weight shift
      if (state === 'idle' && D > 0.5) {
        if (!A.fid) { A.fidT -= dt; if (A.fidT <= 0) { A.fid = 1; A.fidK = 0; A.fidT = 4 + Math.random() * 6; } }
      } else A.fid = 0;
    } else A.fid = 0;
    if (A.fid) { A.fidK += dt; const k = A.fidK / 1.1; if (k >= 1) A.fid = 0; else look = Math.sin(k * PI) * (A.seed > PI ? 0.7 : -0.7) * RM; }   // glance aside
    // aim / shoot (aim raise eased, not snapped)
    const shooting = state === 'shoot';
    if (shooting && (Math.floor(t * 7) !== Math.floor((t - dt) * 7)) && A.kick < 0.8) A.kick = 0.8;
    A.kick *= e14; A.recoil *= e6;
    const aT = shooting ? 1 : 0;
    A.aimW = aT + (A.aimW - aT) * e14;
    const aim = A.aimW;
    if (A.flashT > 0) { A.flashT -= dt; if (A.flash < 1) A.flash = 1; }
    if (opts.flash > 0 && opts.flash > A.flash) A.flash = opts.flash;
    A.flash = A.flash > 0.015 ? A.flash * e13 : 0;
    const fl = A.flash * 0.8;
    if (fl !== h.flash) h.setFlash(fl);
    fLean -= A.kick * 0.05;
    if (A.stag > 0) {
      A.stag = Math.max(0, A.stag - dt * 1.5);
      const k = A.stag * A.stag;
      fRoll += Math.sin(t * 12 + A.seed) * 0.12 * k * RM; fLean += Math.sin(t * 8.5 + A.seed) * 0.06 * k * RM; lean -= 0.12 * k;
    }
    // pop-in
    let base = 1;
    if (A.spawnT < SPAWN_T) {
      A.spawnT += dt;
      if (A.spawnT <= 0) base = 0.001;
      else { const k = Math.min(1, A.spawnT / SPAWN_T); base = popIn(k); sy *= 1 + 0.22 * Math.sin(k * PI) * (1 - k); if (k >= 1) A.sSq.v -= 3; }
    }
    let gy = -A.yawRate * 0.04; gy = gy > 0.25 ? 0.25 : gy < -0.25 ? -0.25 : gy;
    A.sLean.t = lean; A.sRoll.t = roll; A.sGun.t = gy;
    springStep(A.sLean, dt); springStep(A.sRoll, dt); springStep(A.sSq, dt); springStep(A.sHead, dt); springStep(A.sGun, dt);
    const LEAN = A.sLean.x + fLean, ROLL = A.sRoll.x + fRoll;
    if (!h.lod) {
      // legs: gait blended with the air pose (tucked while rising, reaching down while falling)
      const ja = A.air, vk = Math.min(1, Math.max(0, 0.5 + A.vy / 8));
      const cr = Math.cos(A.resid), sr = Math.sin(A.resid), ky = A.legYaw * (1 - ja) * D, nj = 1 - ja;
      const up = 0.14 * mv * Math.min(1, Math.max(0.3, speed / 3)) * nj * D;
      P.legs[0].rotation.set((swingA * cr * nj + (-0.3 - 0.5 * vk) * ja) * D, ky, -swingA * sr * nj * D);
      P.legs[1].rotation.set((-swingA * cr * nj + (0.2 + 0.25 * vk) * ja) * D, ky, swingA * sr * nj * D);
      P.legs[0].scale.y = 1 - up * (c < 0 ? -c : 0); P.legs[1].scale.y = 1 - up * (c > 0 ? c : 0);   // lift the swinging foot
      // gun + arms
      const gp = P.gun.position;
      gp.z = 0.33 - A.kick * 0.06 + aim * 0.04;
      gp.y = 0.3 + aim * 0.08 + (1 - aim) * Math.sin(ph * 2) * 0.012 * mv;
      P.gun.rotation.set(-A.kick * 0.15, A.sGun.x * D, 0);
      const flail = Math.sin(t * 15) * 0.4 * A.stag * RM;
      const arT = -1.05 + (-aim * 0.4 + A.kick * 0.15 + flail) * D, alT = -1.25 + (-aim * 0.3 - flail) * D;
      A.arx = arT + (A.arx - arT) * e14; A.alx = alT + (A.alx - alT) * e14;
      P.armR.rotation.set(A.arx, 0, 0.12); P.armL.rotation.set(A.alx, 0, -0.55);
      P.torso.rotation.set(LEAN, twist * D, ROLL);
      let hyT = A.yawRate * 0.08; hyT = ((hyT > 0.3 ? 0.3 : hyT < -0.3 ? -0.3 : hyT) + look) * D;
      A.hy = hyT + (A.hy - hyT) * e7;
      P.head.rotation.set(-LEAN * 0.6, A.hy, (A.sHead.x + Math.sin(t * 15 + A.seed) * 0.1 * A.stag * RM) * D);
      P.rig.rotation.set(0, 0, 0);
    } else P.rig.rotation.set(LEAN * 0.5, 0, ROLL * 0.5);   // pivot at the feet: half the angle keeps the head where it was
    P.rig.position.y = lift;
    let q = sy * (1 + A.sSq.x); q = q > 1.5 ? 1.5 : q < 0.6 ? 0.6 : q;
    const isx = 1 / Math.sqrt(q), hb = humS < 1 ? (toBlob ? 1 - mk * mk : mk) : 1, rs = P.rig.scale;
    rs.x = rs.z = isx * (0.6 + 0.4 * hb) * base; rs.y = q * hb * base;
    // blob form: bob, stretch along travel
    A.bph += dt * (4 + 8 * Math.min(1, speed / 3));
    const bs = blobS * (1 + 0.25 * Math.sin(mk * PI) * (toBlob ? 1 : 0)) * base;
    const st = speed > 0.3 ? Math.min(0.35, speed / 10) : 0;
    const bsy = (1 + 0.07 * Math.sin(A.bph + A.seed) - st * 0.5) * (1 + A.sSq.x * 0.7), bq = bs / Math.sqrt(bsy), bl = P.blob.scale;
    bl.x = bq * (1 - st * 0.3); bl.y = bs * bsy; bl.z = bq * (1 + st);
    const byT = speed > 0.3 ? -0.06 : 0;
    A.by = byT + (A.by - byT) * e10; P.blob.position.y = A.by;
    h.setExpr(opts.expr || (shooting ? 'focused' : state === 'hurt' ? 'hurt' : 'idle'));
    const shk = 0.88 * (h.isBlob ? 1.1 : 1) * (base < 1 ? base : 1) * (1 - (lift * 2 > 0.3 ? 0.3 : lift * 2)), ss = P.shadow.scale;
    ss.x = ss.y = ss.z = shk;
    if (opts.vy != null) A.vy = opts.vy;
    return false;
  };

  // ------------------------------------------------------------------ UI icons (24×24, ink outline)
  function cogPath(cx, cy, n, ro, ri, hole) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, w = TAU / n;
      const pts = [[a0 - w * 0.22, ri], [a0 - w * 0.13, ro], [a0 + w * 0.13, ro], [a0 + w * 0.22, ri]];
      for (const [a, r] of pts) d += (d ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2);
      const a2 = a0 + w * 0.78;
      d += `A${ri} ${ri} 0 0 1 ${(cx + Math.cos(a2) * ri).toFixed(2)} ${(cy + Math.sin(a2) * ri).toFixed(2)}`;
    }
    d += 'Z';
    if (hole) d += `M${cx + hole} ${cy}a${hole} ${hole} 0 1 0 ${-2 * hole} 0a${hole} ${hole} 0 1 0 ${2 * hole} 0Z`;
    return d;
  }
  const STAR24 = 'M12 2.6l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z';
  const ICONS = {
    bolt: { c: 0xffc93c, d: (C, D) => `<path d="M12 2.6l8.2 4.7v9.4L12 21.4l-8.2-4.7V7.3z" fill="${C}"/><circle cx="12" cy="12" r="3.6" fill="#fff6d0"/><path d="M7.2 8.4l4.8-2.8" stroke="#fff" stroke-width="1.6" stroke-opacity=".85"/>` },
    part: { c: 0x4aa8ff, d: (C, D) => `<path d="M9 3.5v2.5M12 3.5v2.5M15 3.5v2.5M9 18v2.5M12 18v2.5M15 18v2.5M3.5 9h2.5M3.5 12h2.5M3.5 15h2.5M18 9h2.5M18 12h2.5M18 15h2.5"/><rect x="6" y="6" width="12" height="12" rx="2.6" fill="${C}"/><rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1.2" fill="${D}"/><path d="M8 8.6h3" stroke="#fff" stroke-width="1.4" stroke-opacity=".8"/>` },
    gear: { c: 0x8f6bff, d: (C, D) => `<path d="M12 4.6V2.8" /><circle cx="12" cy="2.6" r="1.3" fill="#ffd23f" stroke-width="1.4"/><path d="M4 14.5a8 8 0 0 1 16 0v3a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.5z" fill="${C}"/><rect x="6.6" y="12.6" width="10.8" height="4" rx="2" fill="#7ff3ff"/><path d="M8.5 13.8h2.5" stroke="#fff" stroke-width="1.3"/>` },
    cog: { c: 0xc3cbd6, d: (C) => `<path d="${cogPath(12, 12, 8, 9.6, 7.2, 2.8)}" fill="${C}" fill-rule="evenodd"/>` },
    settings: { c: 0xc3cbd6, d: (C) => `<path d="${cogPath(12, 12, 6, 9.8, 7.4, 3)}" fill="${C}" fill-rule="evenodd"/>` },
    quest: { c: 0xfff1c9, d: (C) => `<rect x="6" y="5" width="12" height="14" fill="${C}"/><rect x="4" y="3" width="16" height="4" rx="2" fill="#e8b44a"/><rect x="4" y="17" width="16" height="4" rx="2" fill="#e8b44a"/><path d="M12 9.2v3.6" stroke-width="2.4"/><circle cx="12" cy="15.3" r="1.2" fill="${INK}" stroke="none"/>` },
    craft: { c: 0xc3cbd6, d: (C) => `<path d="M15.3 3.4a5 5 0 0 0-5.1 6.7l-6.3 6.3a2 2 0 0 0 0 2.8l.9.9a2 2 0 0 0 2.8 0l6.3-6.3a5 5 0 0 0 6.7-5.1l-3.2 3.2-3.1-1-1-3.1z" fill="${C}"/><circle cx="6.3" cy="17.7" r="1" fill="${INK}" stroke="none"/>` },
    shop: { c: 0xff6b8b, d: (C) => `<path d="M9 9.5V7a3 3 0 0 1 6 0v2.5"/><path d="M5 8.5h14l-1.1 11a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8z" fill="${C}"/><path d="M12 11.6l2.4 1.4v2.8L12 17.2l-2.4-1.4V13z" fill="#ffd23f" stroke-width="1.5"/>` },
    race: { c: 0x33b5ff, d: (C) => `<path d="M7.6 12.6L4.6 15.8v3.4l3-1.6M16.4 12.6l3 3.2v3.4l-3-1.6" fill="#ff6b8b"/><path d="M12 2.6c3.3 2.3 4.6 5.7 4.6 9.3v4.6H7.4v-4.6c0-3.6 1.3-7 4.6-9.3z" fill="${C}"/><circle cx="12" cy="9.6" r="2.1" fill="#bff6ff"/><path d="M9.8 18.7c0 1.5.9 2.4 2.2 3.1 1.3-.7 2.2-1.6 2.2-3.1z" fill="#ffb627"/>` },
    ink: { c: 0xff8a1f, d: (C) => `<path d="M12 4.2c1.7 0 2.3 1.7 3.3 2.5 1.3.9 3.7.3 4.2 1.9.5 1.6-1.4 2.5-1.4 3.9s2 2.7 1.1 4.1c-.9 1.5-3.1.3-4.4 1.1-1.2.8-1.1 3-2.8 3s-1.6-2.1-2.8-2.9c-1.3-.8-3.5.4-4.4-1.1-.8-1.4 1.1-2.7 1.1-4.1S3.9 10.2 4.4 8.6c.5-1.6 2.9-1 4.2-1.9C9.7 5.9 10.3 4.2 12 4.2z" fill="${C}"/><circle cx="20.4" cy="4.2" r="1.4" fill="${C}" stroke-width="1.5"/><circle cx="3.6" cy="20" r="1.1" fill="${C}" stroke-width="1.5"/><path d="M9 11a3 3 0 0 1 2.6-2.2" stroke="#fff" stroke-width="1.6" stroke-opacity=".85"/>` },
    royale: { c: 0xffd23f, d: (C, D) => `<path d="M4.2 17L3 7.4l5 3.8 4-6.6 4 6.6 5-3.8L19.8 17z" fill="${C}"/><rect x="4" y="17" width="16" height="3.6" rx="1.4" fill="${D}"/><circle cx="12" cy="12.8" r="1.5" fill="#ff6b8b" stroke-width="1.4"/><circle cx="3" cy="6.6" r="1.1" fill="${C}" stroke-width="1.3"/><circle cx="21" cy="6.6" r="1.1" fill="${C}" stroke-width="1.3"/>` },
    defense: { c: 0x8f6bff, d: (C, D) => `<path d="M6.5 10h11v11h-11z" fill="${C}"/><path d="M5 10.5V4h3v2h2.5V4h3v2H16V4h3v6.5z" fill="${D}"/><path d="M10 21v-3.6a2 2 0 0 1 4 0V21" fill="${INK}"/>` },
    training: { c: 0xff4d5e, d: (C) => `<circle cx="11" cy="13" r="8.4" fill="#fff"/><circle cx="11" cy="13" r="5.4" fill="${C}"/><circle cx="11" cy="13" r="2.3" fill="#fff"/><path d="M11 13l8-8" stroke-width="2.2"/><path d="M16.6 3.8h3.6v3.6" stroke-width="2.2"/>` },
    gallery: { c: 0x8fd8ff, d: (C) => `<rect x="3" y="4" width="18" height="16" rx="2.6" fill="#fff6e0"/><rect x="5.6" y="6.6" width="12.8" height="10.8" rx="1" fill="${C}" stroke-width="1.6"/><path d="M5.6 17.4l4-4.6 3 3 2-2 3.8 3.6z" fill="#3fe0b8" stroke-width="1.6"/><circle cx="15" cy="9.6" r="1.6" fill="#ffd23f" stroke-width="1.4"/>` },
    cafe: { c: 0xff8fc0, d: (C) => `<path d="M8 6.2c0-1 1-1.3 1-2.3M12 6.2c0-1 1-1.3 1-2.3" stroke-width="1.7"/><path d="M16.5 10.5h1.4a2.6 2.6 0 0 1 0 5.2h-1.6"/><path d="M4 9h12.6v5.8a5.2 5.2 0 0 1-5.2 5.2H9.2A5.2 5.2 0 0 1 4 14.8z" fill="${C}"/><path d="M6.6 11.4v3" stroke="#fff" stroke-width="1.6" stroke-opacity=".8"/>` },
    star: { c: 0xffd23f, d: (C) => `<path d="${STAR24}" fill="${C}"/><path d="M9 9.8l1.2-.2" stroke="#fff" stroke-width="1.5" stroke-opacity=".85"/>` },
    trophy: { c: 0xffc93c, d: (C, D) => `<path d="M7 6H4.4v1.6a3.2 3.2 0 0 0 3.2 3.2M17 6h2.6v1.6a3.2 3.2 0 0 1-3.2 3.2"/><path d="M7 3.6h10v5.6a5 5 0 0 1-10 0z" fill="${C}"/><path d="M12 14.2v3"/><rect x="7.4" y="17.2" width="9.2" height="3.6" rx="1.3" fill="${D}"/><path d="M9.4 6v3" stroke="#fff" stroke-width="1.5" stroke-opacity=".85"/>` },
    shield: { c: 0x33b5ff, d: (C) => `<path d="M12 2.8l7.6 3v5.8c0 4.7-3.2 8.3-7.6 9.8-4.4-1.5-7.6-5.1-7.6-9.8V5.8z" fill="${C}"/><path d="M12 8v7.4M8.3 11.7h7.4" stroke="#fff" stroke-width="2.4"/>` },
    heart: { c: 0xff5a6e, d: (C) => `<path d="M12 20.6s-8.2-4.7-8.2-10.6A4.5 4.5 0 0 1 12 7.3a4.5 4.5 0 0 1 8.2 2.7c0 5.9-8.2 10.6-8.2 10.6z" fill="${C}"/><path d="M7 10.2a2.2 2.2 0 0 1 1.9-1.9" stroke="#fff" stroke-width="1.6" stroke-opacity=".85"/>` },
    lock: { c: 0xffc93c, d: (C) => `<path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="${C}"/><circle cx="12" cy="14.6" r="1.5" fill="${INK}" stroke="none"/><path d="M12 15.4v2.2" stroke-width="1.8"/>` },
    check: { c: 0x33d17a, d: (C) => `<circle cx="12" cy="12" r="9" fill="${C}"/><path d="M7.6 12.4l3 3 5.8-6.2" stroke="#fff" stroke-width="2.6"/>` },
    map: { c: 0x8fe3a8, d: (C) => `<path d="M3.5 6.6l5.5-2 6 2 5.5-2v12.8l-5.5 2-6-2-5.5 2z" fill="${C}"/><path d="M9 4.6v12.8M15 6.6v12.8" stroke-width="1.6"/><path d="M15.4 8.8c0 2-2.4 4.4-2.4 4.4s-2.4-2.4-2.4-4.4a2.4 2.4 0 0 1 4.8 0z" fill="#ff6b8b" stroke-width="1.6"/>` },
    ko: { c: 0xffd23f, d: (C) => `<path d="M12 4l2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z" fill="${C}" transform="rotate(-12 12 12)"/><path d="M9.2 11.3a.9.9 0 1 1 .9.9M13.6 11.3a.9.9 0 1 1 .9.9" stroke-width="1.3"/><path d="M10.4 14.6q1.6-1 3.2 0" stroke-width="1.3"/><path d="M19.6 2.6v2.6M18.3 3.9h2.6M3.4 17.8v2.2M2.3 18.9h2.2" stroke-width="1.4"/>` },
    play: { c: 0x33d17a, d: (C) => `<path d="M8 4.6v14.8a1 1 0 0 0 1.5.9l11-7.4a1 1 0 0 0 0-1.7l-11-7.4A1 1 0 0 0 8 4.6z" fill="${C}"/>` },
    home: { c: 0xffb37a, d: (C, D) => `<path d="M6 10v9.6a1 1 0 0 0 1 1h3.6v-5.2h2.8v5.2H17a1 1 0 0 0 1-1V10l-6-5.2z" fill="${C}"/><path d="M3.4 11.6L12 4l8.6 7.6" stroke-width="2.2"/><rect x="15.2" y="4.6" width="2.6" height="3.6" fill="${D}" stroke-width="1.6"/>` },
    language: { c: 0x8fd8ff, d: (C) => `<circle cx="12" cy="12" r="9" fill="${C}"/><path d="M3 12h18M12 3c2.8 2.5 4 5.6 4 9s-1.2 6.5-4 9c-2.8-2.5-4-5.6-4-9s1.2-6.5 4-9z" stroke-width="1.7"/><path d="M5 7.5h14M5 16.5h14" stroke-width="1.4"/>` },
    sound: { c: 0xffd23f, d: (C) => `<path d="M3.8 9.4h3.6L12 5.4v13.2l-4.6-4H3.8z" fill="${C}"/><path d="M15.4 9a4 4 0 0 1 0 6M18 6.4a7.6 7.6 0 0 1 0 11.2"/>` },
    music: { c: 0xb983ff, d: (C) => `<path d="M9.2 17.4V6.2l10-2.2v11.4M9.2 9.2l10-2.2"/><ellipse cx="6.9" cy="17.6" rx="2.6" ry="2.2" fill="${C}"/><ellipse cx="16.9" cy="15.6" rx="2.6" ry="2.2" fill="${C}"/>` },
    info: { c: 0x33b5ff, d: (C) => `<circle cx="12" cy="12" r="9" fill="${C}"/><path d="M12 11v5.6" stroke="#fff" stroke-width="2.6"/><circle cx="12" cy="7.6" r="1.6" fill="#fff" stroke="none"/>` },
    arrowL: { c: 0x3fe0b8, d: (C) => `<path d="M12.6 4.4L5 12l7.6 7.6v-4.4h6.4V8.8h-6.4z" fill="${C}"/>` },
    arrowR: { c: 0x3fe0b8, d: (C) => `<path d="M11.4 4.4L19 12l-7.6 7.6v-4.4H5V8.8h6.4z" fill="${C}"/>` },
    close: { c: 0xff5a6e, d: (C) => `<circle cx="12" cy="12" r="9" fill="${C}"/><path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" stroke="#fff" stroke-width="2.6"/>` },
    plus: { c: 0x33d17a, d: (C) => `<circle cx="12" cy="12" r="9" fill="${C}"/><path d="M12 7.6v8.8M7.6 12h8.8" stroke="#fff" stroke-width="2.6"/>` },
    pause: { c: 0x8fd8ff, d: (C) => `<rect x="5.6" y="4.6" width="4.6" height="14.8" rx="1.6" fill="${C}"/><rect x="13.8" y="4.6" width="4.6" height="14.8" rx="1.6" fill="${C}"/>` },
    flag: { c: 0xff6b8b, d: (C) => `<path d="M5.4 21V3.6"/><path d="M5.4 4.4c4-2 6 2 10 0l3.4-.8v8.6l-3.4.8c-4 2-6-2-10 0z" fill="${C}"/>` },
    gift: { c: 0xff6b8b, d: (C) => `<rect x="4" y="10" width="16" height="10.4" rx="1.6" fill="${C}"/><rect x="3" y="7" width="18" height="4" rx="1.4" fill="${C}"/><path d="M12 7v13.4" stroke="#ffd23f" stroke-width="2.6"/><path d="M12 7c-2-4-6-4-5.6-1.4C6.8 7 10 7 12 7zM12 7c2-4 6-4 5.6-1.4C17.2 7 14 7 12 7z" fill="#ffd23f" stroke-width="1.6"/>` },
  };
  Geo.ICON_NAMES = Object.keys(ICONS);
  Geo.iconSVG = function (name, color, size) {
    const ic = ICONS[name] || ICONS.star;
    const base = color != null ? hexOf(color) : ic.c;
    const C = css(base), D = css(shade(base, 0.75));
    const sz = size || 24;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.d(C, D)}</svg>`;
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 15b_geo_chars.js]', e); }
})();
