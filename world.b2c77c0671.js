/* Marmalune Rangers — world: 10_world.js 11_systems.js 11b_terrain.js 12_player.js */
(function () {
if (window.MR_BOOT && MR_BOOT.dead) return;
// ---- 10_world.js
try { (function () {
// World + Actor base classes, mode registry and the main loop.
(function (G) {
  const V3 = THREE.Vector3;
  const _v = new V3(), _v2 = new V3();

  // ---------------- Actor ----------------
  // Anything that can be targeted/damaged: player, enemies, bots, crates, cores.
  class Actor {
    constructor(world, opts) {
      opts = opts || {};
      this.world = world;
      this.id = G.util.uid();
      this.pos = new V3();
      this.vel = new V3();
      // (r / h / hitPad as doubles on every actor: the per-ray actor loops read them across all actor classes, and a field
      // that is a small integer on some classes and a double on others — or missing — is read as a boxed number)
      this.r = -0; this.h = -0; this.hitPad = 0.05;
      this.r = opts.r != null ? opts.r : 0.5;
      this.h = opts.h != null ? opts.h : 1.6;
      this.team = opts.team != null ? opts.team : 1;
      // Numbers that turn fractional in play start as doubles (-0, a .5 value, or -0 then the value): a small-integer
      // field that later takes a fraction is a representation change, which replaces the hidden class of every actor of
      // the shape (their whole map chains are deprecated and rebuilt) and deopts every optimized function using them —
      // the actor update chain fell back to the baseline tier for seconds after each such store.
      this.maxHp = -0; this.hp = -0; this.maxShield = -0; this.shield = -0; this.armor = -0;
      this.maxHp = this.hp = opts.hp != null ? opts.hp : 100;
      this.maxShield = this.shield = opts.shield || 0;
      this.armor = opts.armor || 0;          // flat % damage reduction 0..0.9
      this.alive = true;
      this.dead = false;                     // set when removable
      this.targetable = opts.targetable !== false;
      this.isPlayer = false;
      this.kind = opts.kind || 'actor';
      this.mesh = null;
      this.lastHitT = -99.5;
      this.grounded = false;
      this.step = 0.45;
      // Phys.moveBody outputs, declared here so every actor keeps one hidden class (instead of gaining them at its
      // first move, landVel only at its first landing)
      this.hitWall = false; this.landed = false; this.ceil = false; this.fell = false; this.landVel = -0; this.wallN = null;
      this.flashT = -0;
      this.slowT = -0; this.slowK = -0; this.slowK = 1;        // slowed by effects (groove, freeze)
      this.stunT = -0;
      this.dotT = -0; this.dotDps = -0; this.dotSrc = null;
      this.wx = null;   // weapon status effects (16_weapons Sys.status fills it in on the first hit: declared, one hidden class)
      // ... and the status flags it writes on the actor, declared with their neutral values (a freeze / groove / scan
      // landing on a bot for the first time mid-match added seven fields: every bot's hidden class changed, and the bot,
      // weapon and physics code deopted for seconds)
      this.dmgTakenMult = -0; this.dmgTakenMult = 1; this.marked = false; this.dancing = false; this.planted = false; this.frozen = false;
      this.chilled = -0; this.atkMult = -0; this.atkMult = 1;
      // Fields that keep their first value until a rare event (first landing, ceiling bump, fall, hit, stun, damage over
      // time, weapon status) are stored a second, different time here: V8 tracks a field nobody has changed as
      // "constant", and the first store of another value deopts every optimized store site that assumed it (Phys.moveBody
      // deopted on the first landing of each actor class). Two values at construction = an ordinary field from the start.
      this.lastHitT = -98.5; this.lastHitT = -99.5;
      this.hitWall = true; this.landed = true; this.ceil = true; this.fell = true; this.landVel = -0.5; this.flashT = 0.5;
      this.hitWall = false; this.landed = false; this.ceil = false; this.fell = false; this.landVel = -0; this.flashT = -0;
      this.slowT = 0.5; this.stunT = 0.5; this.dotT = 0.5; this.dotDps = 0.5; this.chilled = 0.5;
      this.slowT = -0; this.stunT = -0; this.dotT = -0; this.dotDps = -0; this.chilled = -0;
      this.marked = true; this.dancing = true; this.planted = true; this.frozen = true;
      this.marked = false; this.dancing = false; this.planted = false; this.frozen = false;
    }
    // Center of mass for aiming.
    aimPoint(out) { return (out || new V3()).set(this.pos.x, this.pos.y + this.h * 0.55, this.pos.z); }
    // Returns {dealt, toShield, killed}
    takeDamage(amount, info) {
      if (!this.alive) return dmgRes(0, 0, false);
      amount *= (1 - this.armor);
      if (info && info.mult) amount *= info.mult;
      let toShield = 0;
      if (this.shield > 0) { toShield = Math.min(this.shield, amount); this.shield -= toShield; amount -= toShield; if (this.shield <= 0 && toShield > 0) this.onShieldBreak(info); }
      const toHp = Math.min(this.hp, amount);
      this.hp -= toHp;
      this.lastHitT = this.world.time;
      this.flashT = 0.12;
      const killed = this.hp <= 0.0001;
      if (killed) { this.hp = 0; this.alive = false; this.onDeath(info || {}); }
      else this.onHurt(info || {}, toHp + toShield);
      return dmgRes(toHp + toShield, toShield, killed);
    }
    heal(n) { if (!this.alive) return 0; const h = Math.min(this.maxHp - this.hp, n); this.hp += h; return h; }
    addShield(n) { const s = Math.min(this.maxShield - this.shield, n); this.shield += s; return s; }
    onHurt() {}
    onShieldBreak() {}
    onDeath() { this.dead = true; }
    update() {}
    applyStatus(dt) {
      if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowK = 1; }
      if (this.stunT > 0) this.stunT -= dt;
      if (this.dotT > 0 && this.alive) { this.dotT -= dt; this.world.damage(this, this.dotDps * dt, { src: this.dotSrc, type: 'dot', silent: true }); }
      if (this.flashT > 0) this.flashT -= dt;
    }
    dispose() { if (this.mesh) { this.world.scene.remove(this.mesh); } }
  }
  G.Actor = Actor;

  // ---------------- World ----------------
  // opts: {heightFn, bounds, sky:{...}|false, fog:{color,near,far}, light:{...}, rules:{...}}
  class World {
    constructor(opts) {
      opts = opts || {};
      this.opts = opts;
      this.scene = new THREE.Scene();
      this.phys = new G.Phys({ heightFn: opts.heightFn, bounds: opts.bounds, floorY: opts.floorY });
      this.time = 0;
      this.actors = [];
      this.interactables = [];
      this.updaters = [];       // functions(dt) for ambient animation
      this.rules = opts.rules || {};
      this.player = null;
      if (opts.sky !== false) { this.sky = G.R.makeSky(opts.sky || {}); this.scene.add(this.sky); }
      if (opts.fog !== false) {
        const f = Object.assign({ color: 0xbfeaff, near: 40, far: G.R.q().draw }, opts.fog || {});
        this.scene.fog = new THREE.Fog(f.color, f.near, f.far);
      }
      if (opts.light !== false) this.lights = G.R.lightRig(this.scene, opts.light || {});
      this.projectiles = new G.Projectiles(this);
      this.pickups = new G.Pickups(this);
      this.fx = new G.FX(this);
      // modules that must set up per-world layers / materials while the mode is still loading (so the load
      // warm-up compiles them) register here: G.World.created.push(world => ...)
      for (let i = 0; i < World.created.length; i++) { const fn = World.created[i]; G.safe('world created', () => fn(this)); }
    }
    add(o) { this.scene.add(o); return o; }
    remove(o) { this.scene.remove(o); }
    // A mesh that comes back into the scene (an actor re-added after a mode took it out, e.g. the expedition's parked
    // robots and crates waking up) goes back into the shared blob-shadow / glow batches if it was in them before
    // (G.Geo.useLayers marks the trees it adopts; while detached their proxies were released to draw on their own).
    addActor(a) {
      this.actors.push(a);
      const m = a.mesh;
      if (m && !m.parent) { this.scene.add(m); if (m.userData.chLayers && G.Geo && G.Geo.useLayers) G.Geo.useLayers(m, this.scene); }
      return a;
    }
    onUpdate(fn) { this.updaters.push(fn); return fn; }
    addInteract(it) { this.interactables.push(it); return it; } // {pos, r, key, icon?, onUse(), enabled?()}
    ground(x, z) { return this.phys.groundAt(x, z, 0.1, 999); }

    update(dt) {
      this.time += dt;
      const ups = this.updaters;
      for (let i = 0; i < ups.length; i++) ups[i](dt, this.time);
      // (G.safe semantics without a closure and a label string per actor per frame)
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i];
        if (!a.dead) { try { a.update(dt); } catch (e) { safeFail('actor ' + a.kind, e); } }
      }
      for (let i = this.actors.length - 1; i >= 0; i--) {
        const a = this.actors[i];
        if (a.dead && !a.isPlayer) { a.dispose(); this.actors.splice(i, 1); }
      }
      this.projectiles.update(dt);
      this.pickups.update(dt);
      this.fx.update(dt);
    }

    // Central damage entry. info: {src, type, pos, dir, crit, weapon, knock, silent, mult}
    damage(target, amount, info) {
      info = info || {};
      if (!target || !target.alive || amount <= 0) return null;
      if (this.rules.canDamage && !this.rules.canDamage(info.src, target, info)) return null;
      if (info.src && info.src.team === target.team && info.src !== target && !info.friendly) return null;
      if (target.isPlayer && G.Data && G.Data.difficultyMult) amount *= G.Data.difficultyMult('taken');
      if (info.src && info.src.isPlayer && G.Data && G.Data.difficultyMult) amount *= G.Data.difficultyMult('dealt');
      const res = target.takeDamage(amount, info);
      if (info.knock && target.vel && !target.immovable) {
        _v.copy(info.dir || _v2.set(0, 0, 0)).setY(0).normalize().multiplyScalar(info.knock * (target.knockbackMult != null ? target.knockbackMult : 1));
        target.vel.add(_v); target.vel.y += info.knock * 0.35 * (target.knockbackMult != null ? target.knockbackMult : 1);
      }
      if (res.dealt > 0) {
        G.bus.emit('damage', target, res, info);
        if (this.rules.onDamage) this.rules.onDamage(target, res, info);
        if (info.src && info.src.isPlayer && !info.silent) {
          const p = target.aimPoint(_v);
          G.HUD && G.HUD.damageNumber(p, res.dealt, res.toShield > 0 && res.toShield >= res.dealt * 0.5 ? 'sh' : (info.crit ? 'crit' : ''));
          G.HUD && G.HUD.hitmark(res.killed, !!info.crit);
          if (G.Audio) G.Audio.sfx(res.killed ? 'kill' : (info.crit ? 'crit' : 'hit'));
          // Hit-stop: a tiny freeze sells kills and big hits.
          if (res.killed) G.time.hitStop(G.util.clamp(0.03 + amount * 0.0008, 0.03, 0.09));
        }
        if (target.isPlayer && info.pos) G.HUD && G.HUD.damageFrom(info.pos);
      }
      if (res.killed) {
        G.bus.emit('kill', target, info);
        if (this.rules.onKill) this.rules.onKill(target, info);
      }
      return res;
    }
    // Radial damage with linear falloff to 35% at the edge. opts: {src, team, color, knock, noSelf, type, fx:false}
    explode(pos, radius, dmg, opts) {
      opts = opts || {};
      if (opts.fx !== false) this.fx.explosion(pos, radius, opts.color);
      for (const a of this.actors) {
        if (!a.alive || !a.targetable) continue;
        if (opts.src && a === opts.src && opts.noSelf !== false) continue;
        const c = a.aimPoint(_v2);
        const d = c.distanceTo(pos) - a.r;
        if (d > radius) continue;
        if (!this.phys.los(pos, c, false) && d > radius * 0.35) continue;
        const k = 1 - 0.65 * G.util.clamp(d / radius, 0, 1);
        const dir = c.clone().sub(pos);
        this.damage(a, dmg * k, { src: opts.src, type: opts.type || 'explosion', pos: pos.clone(), dir, knock: (opts.knock != null ? opts.knock : 6) * k, weapon: opts.weapon });
      }
      if (this.rules.onExplode) this.rules.onExplode(pos, radius, opts);
      const pl = this.player;
      if (pl) { const d = pl.pos.distanceTo(pos); if (d < radius * 3) this.fx.shake(0.5 * (1 - d / (radius * 3))); }
    }
    // Nearest actor intersected by a ray (capsule approximated by sphere stack). Returns {actor, t, crit}
    rayActors(o, d, maxT, ignore, teamMask) {
      const t = this._rayActorsT(o, d, maxT, ignore, teamMask), hit = RA.actor;
      RA.actor = null;
      // one result object for the nearest actor (the crit test only for it: rayCrit has no side effects)
      return hit ? { actor: hit, t, crit: rayCrit(hit, o, d, t) } : null;
    }
    // rayActors without the result object: the nearest actor's distance (-1 = none), the actor in RA.actor.
    _rayActorsT(o, d, maxT, ignore, teamMask) {
      let best = maxT, hit = null;
      const list = this.actors;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a.alive || !a.targetable || a === ignore) continue;
        if (teamMask != null && a.team === teamMask) continue;
        // Closest approach of ray to the actor's vertical segment (inputs through SEGI: no boxed double per actor)
        const r = a.r + (a.hitPad || 0.05), r6 = r * 0.6, top = a.h - r6;   // (|| 0.05: actors that are not G.Actor)
        SEGI[0] = a.pos.x; SEGI[1] = a.pos.y + r6; SEGI[2] = a.pos.z; SEGI[3] = a.pos.y + (top > r6 ? top : r6); SEGI[4] = r; SEGI[5] = best;
        if (segHitS(o, d) && SEG[0] < best) { best = SEG[0]; hit = a; }
      }
      RA.actor = hit;
      return hit ? best : -1;
    }
    // Combined hitscan against world + actors. Returns {t, point, normal, actor?, crit?}
    hitscan(o, d, maxT, src) {
      const w = this.phys.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxT);
      const wt = w ? w.t : maxT;
      const a = this.rayActors(o, d, wt, src, src ? src.team : null);
      if (a) return { t: a.t, point: o.clone().addScaledVector(d, a.t), normal: d.clone().negate(), actor: a.actor, crit: a.crit };
      if (w) return { t: w.t, point: new V3(w.x, w.y, w.z), normal: new V3(w.nx, w.ny, w.nz), tag: w.tag };
      return null;
    }
    // hitscan(...).t without any allocation (the per-frame crosshair probe): distance to whatever the ray hits first
    // (world or actor), -1 when nothing within maxT.
    hitT(o, d, maxT, src) {
      const ph = this.phys, RI = G.Phys.rayIn;
      RI[0] = o.x; RI[1] = o.y; RI[2] = o.z; RI[3] = d.x; RI[4] = d.y; RI[5] = d.z; RI[6] = maxT; RI[7] = 0;
      const wHit = ph.rayS();
      const wt = wHit ? ph._r.t : maxT;
      const at = this._rayActorsT(o, d, wt, src, src ? src.team : null);
      RA.actor = null;
      return at >= 0 ? at : wHit ? wt : -1;
    }
    // Nearest enemy of `team` within radius (enemiesNear(...)[0] without the arrays), or null.
    nearestEnemy(pos, radius, team) {
      let best = null, bd = radius;
      const list = this.actors;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a.alive || !a.targetable || a.team === team || a.noAssist) continue;
        const d = a.pos.distanceTo(pos);
        if (d > radius) continue;
        if (best === null || d < bd) { best = a; bd = d; }
      }
      return best;
    }
    // Enemies of `team` within radius, sorted by distance.
    enemiesNear(pos, radius, team, losFrom) {
      const out = [];
      for (const a of this.actors) {
        if (!a.alive || !a.targetable || a.team === team || a.noAssist) continue;
        const d = a.pos.distanceTo(pos);
        if (d > radius) continue;
        if (losFrom && !this.phys.los(losFrom, a.aimPoint(_v2), false)) continue;
        out.push({ a, d });
      }
      out.sort((x, y) => x.d - y.d);
      return out.map(x => x.a);
    }
    nearestInteract(pos) {
      let best = null, bd = Infinity;
      const list = this.interactables;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        if (it.enabled && !it.enabled()) continue;
        const ix = pos.x - it.pos.x, iz = pos.z - it.pos.z, d = Math.sqrt(ix * ix + iz * iz);   // (not Math.hypot: boxes)
        if (d < (it.r || 2) && d < bd && Math.abs(pos.y - it.pos.y) < 3) { bd = d; best = it; }
      }
      return best;
    }
    dispose() {
      for (const a of this.actors) G.safe('dispose', () => a.dispose());
      // per-world extras that need more than disposeTree (e.g. a warm-up robot rig's skeleton bone texture)
      if (this._onDispose) for (const fn of this._onDispose) G.safe('world dispose hook', fn);
      this.projectiles.dispose(); this.pickups.dispose(); this.fx.dispose();
      G.R.disposeTree(this.scene);
      this.actors.length = 0;
    }
  }
  // Weak spots (GDD §2.8: "glowing batteries or vents"). An actor may expose critPt(out) -> V3|null (world
  // position of its glowing weak spot, e.g. a Gizmob's chest battery) and critR (m): a ray crits when it passes
  // within critR of that point on the near side of the body; an impact crits within critR (+ the projectile's
  // radius). Actors without one (or whose critPt returns null) keep the head-height rule critY.
  const _cp = new V3();
  const RA = { actor: null };   // _rayActorsT's actor out-param
  // takeDamage's result {dealt, toShield, killed}: number fields created as doubles (-0) and then filled in, so the shape
  // never changes representation when the first fractional hit lands (see the Actor constructor note)
  function dmgRes(dealt, toShield, killed) { const r = { dealt: -0, toShield: -0, killed: false }; r.dealt = dealt; r.toShield = toShield; r.killed = killed; return r; }
  function rayCrit(a, o, d, t) {
    const c = a.critPt ? a.critPt(_cp) : null;
    if (c) {
      const px = c.x - o.x, py = c.y - o.y, pz = c.z - o.z, s = px * d.x + py * d.y + pz * d.z, R = a.critR || 0.25;
      return s > 0 && s <= t + R + 0.15 && px * px + py * py + pz * pz - s * s <= R * R;
    }
    return a.critY != null ? (o.y + d.y * t) > a.pos.y + a.critY : false;
  }
  G.critAt = function (a, p, pad) {
    if (!a || !p) return false;
    const c = a.critPt ? a.critPt(_cp) : null;
    if (c) { const R = (a.critR || 0.25) + (pad || 0); return c.distanceToSquared(p) <= R * R; }
    return a.critY != null && p.y > a.pos.y + a.critY;
  };
  // Ray vs vertical capsule segment. Returns t or null.
  function raySegment(o, d, x, y0, z, y1, r, maxT) { return segHit(o, d, x, y0, z, y1, r, maxT) ? SEG[0] : null; }
  // The same test for the per-frame loops (rayActors, projectiles): true on a hit, t in SEG[0]. (A float returned from a
  // call that is not inlined is a fresh heap number: one per actor per ray / projectile per frame.) The loops pass the
  // segment through SEGI (x, y0, z, y1, r, maxT) and call segHitS(o, d): the six doubles would be boxed the same way.
  const SEG = new Float64Array(1), SEGI = new Float64Array(6);
  function segHit(o, d, x, y0, z, y1, r, maxT) { SEGI[0] = x; SEGI[1] = y0; SEGI[2] = z; SEGI[3] = y1; SEGI[4] = r; SEGI[5] = maxT; return segHitS(o, d); }
  function segHitS(o, d) {
    const x = SEGI[0], y0 = SEGI[1], z = SEGI[2], y1 = SEGI[3], r = SEGI[4], maxT = SEGI[5];
    // Sample: solve ray vs infinite cylinder, then clamp to caps via sphere tests.
    const px = o.x - x, pz = o.z - z;
    const a = d.x * d.x + d.z * d.z;
    let best = -1;   // (< 0: no hit yet; a hit has t >= 0 — a number, never null, so it stays an unboxed double)
    if (a > 1e-9) {
      const b = 2 * (px * d.x + pz * d.z), c = px * px + pz * pz - r * r;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        if (t >= 0 && t <= maxT) { const y = o.y + d.y * t; if (y >= y0 && y <= y1) best = t; }
      }
    }
    // the two end-cap spheres, bottom then top (unrolled: no array per call)
    const ox = o.x - x, oz = o.z - z;
    let oy = o.y - y0, b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c;
    if (disc >= 0) { const t = -b - Math.sqrt(disc); if (t >= 0 && t <= maxT && (best < 0 || t < best)) best = t; }
    oy = o.y - y1; b = ox * d.x + oy * d.y + oz * d.z; c = ox * ox + oy * oy + oz * oz - r * r; disc = b * b - c;
    if (disc >= 0) { const t = -b - Math.sqrt(disc); if (t >= 0 && t <= maxT && (best < 0 || t < best)) best = t; }
    if (best < 0) return false;
    SEG[0] = best;
    return true;
  }
  // G.safe's error path (00_core), for hot loops that inline the try/catch instead of passing a closure.
  function safeFail(label, e) { console.error('[' + label + ']', e); G.bus.emit('error', label, e); }
  World.created = [];
  G.World = World;
  G.raySegment = raySegment;
  G.raySegHit = segHit; G.raySegT = SEG; G.raySegIn = SEGI; G.raySegHitS = segHitS;

  // ---------------- Game / modes / loop ----------------
  const Game = G.Game = { modes: {}, mode: null, modeId: null, params: null, paused: false, world: null, running: false };
  // mode: {enter(params) -> World|void, exit(), update(dt), layout, pausable, music}
  Game.register = function (id, mode) { Game.modes[id] = mode; };
  // A menu backdrop (the title: layout 'menu', no player, nothing spawns) compiles and warms only what it shows: the
  // pooled effects, projectiles, hidden LOD twins and the late-object material zoo are left to the first gameplay load,
  // which warms everything behind its own loading screen as before — so boot builds about half the shader programs and
  // nothing compiles mid-game. Game.lightLoad is true while such a mode builds (modules may skip load-time prewarms).
  const isBackdrop = m => !!m && (m.warm === 'visible' || (m.warm == null && m.layout === 'menu'));
  Game.lightLoad = false;
  Game._seq = 0;
  // Shader programs for a load: renderer.compile issues every program at once and, with KHR_parallel_shader_compile, the
  // driver builds them on its own threads while this polls (main thread free: the loading screen keeps animating);
  // without the extension programs report ready at once and the warm-up draw waits for them as before. Hidden subtrees
  // are left out of a backdrop's compile (their materials are lifted off for the synchronous compile call).
  const COMPILE_WAIT = 12000;
  function compileLoad(seq, scene, light, done) {
    const r = G.R.renderer, mats = new Set();
    const add = set => { if (set && set.forEach) set.forEach(m => mats.add(m)); };
    const lifted = [];
    // (the late-object material zoo the warm-up draws: compiled with the scene, so it is in this parallel batch too)
    const zoo = !light && G.R.warmZoo ? G.R.warmZoo() : null;
    try {
      if (zoo) scene.add(zoo);
      if (light) {
        const walk = (o, vis) => {
          const v = vis && (o.visible || !!o.userData.warmAlways);   // (warmAlways: see 04_render warmScene)
          if (!v && o.material) { lifted.push(o, o.material); o.material = null; }
          const ch = o.children;
          for (let i = 0; i < ch.length; i++) walk(ch[i], v);
        };
        walk(scene, true);
      }
      add(r.compile(scene, G.R.camera));
      if (!light && G.R.vmRoot.children.length) add(r.compile(G.R.vmScene, G.R.vmCamera));
    } catch (e) { safeFail('compile', e); }
    finally { for (let i = 0; i < lifted.length; i += 2) lifted[i].material = lifted[i + 1]; if (zoo) scene.remove(zoo); }
    const t0 = performance.now();
    const poll = () => {
      if (seq !== Game._seq) return;   // a newer Game.go took over (its own load finishes the switch)
      if (G.R.isLost()) { done(); return; }
      mats.forEach(m => {
        let ok = true;
        try { const pr = r.properties.get(m).currentProgram; ok = !pr || !pr.isReady || pr.isReady(); } catch (e) { ok = true; }
        if (ok) mats.delete(m);
      });
      if (!mats.size || performance.now() - t0 > COMPILE_WAIT) done(); else setTimeout(poll, 8);
    };
    poll();
  }
  Game.go = function (id, params) {
    const m = Game.modes[id];
    if (!m) { console.error('unknown mode', id); G.UI.toast(G.t('ui.modeMissing')); return; }
    G.UI.closeAll();
    // Planned music hand-off (fade + loading stinger) instead of the scheduler starving mid-phrase
    // while enter() blocks the main thread; the new track starts after the build (mode.music).
    if (G.Audio && G.Audio.leaveMode) G.safe('audio leave', () => G.Audio.leaveMode(id));
    G.UI.loading(true, 'ui.loading');
    G.HUD && G.HUD.hide();
    Game.paused = false;
    Game._switching = true;
    const seq = ++Game._seq;
    // Let the loading screen paint and finish its short fade-in before the heavy build, so the
    // cross-fade never depends on the compositor animating while the main thread is busy.
    const goT0 = performance.now();
    let ok = true, light = false;
    const build = () => {
      if (seq !== Game._seq) return;   // superseded before it began: the newer request builds instead
      if (Game.mode) { G.safe('exit ' + Game.modeId, () => Game.mode.exit && Game.mode.exit()); }
      if (Game.world) { G.safe('dispose', () => Game.world.dispose()); Game.world = null; }
      G.R.vmRoot.clear(); G.R.showViewmodel = false;
      Game.mode = m; Game.modeId = id; Game.params = params || {};
      G.time.scale = 1;
      light = isBackdrop(m);
      Game.lightLoad = light;
      Game._compiling = true;   // (no frame draws the half-prepared world meanwhile)
      try { const w = m.enter(Game.params); if (w) Game.world = w; }
      catch (e) { ok = false; console.error('enter', id, e); }
      // Modes call G.HUD.show() inside enter(), before Game.world points at the new world, so the
      // weapon slots could not see the new player yet: rebuild them now.
      if (Game.world && G.HUD && G.HUD.visible) G.safe('hud slots', () => G.HUD.buildSlots());
      if (Game.world) {
        G.R.setScene(Game.world.scene);
        if (!G.R.isLost()) { compileLoad(seq, Game.world.scene, light, finish); return; }
      }
      finish();
    };
    function finish() {
      if (seq !== Game._seq) return;
      // Draw everything once (frustum culling off, tiny viewport, still behind the loading screen) so geometry /
      // texture uploads and pipeline creation happen now instead of as hitches during the first seconds of play.
      if (Game.world && !G.R.isLost() && G.R.warmup) G.safe('warmup', () => G.R.warmup(Game.world.scene, light));
      Game._compiling = false; Game.lightLoad = false;
      G.Input.setLayout(m.layout || 'fps');
      if (m.music && G.Audio) G.Audio.music(m.music);
      G.UI.loading(false);
      Game._switching = false;
      // The frame that ran enter() took far longer than a refresh: start the new mode with nominal
      // steps (no lurch) and keep the load hitch out of the frame-rate statistics.
      G.time.resync(3);
      if (G.R.frameGrace) G.R.frameGrace(1.5);
      G.bus.emit('mode', id);
      if (!ok && id !== 'hub' && Game.modes.hub) { G.UI.toast(G.t('ui.loadError')); Game.go('hub'); }
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const wait = 170 - (performance.now() - goT0);
      if (wait > 4 && !(G.UI.reduced && G.UI.reduced())) setTimeout(build, wait); else build();
    }));
  };
  Game.pause = function () {
    if (Game.paused || !Game.mode || Game.mode.pausable === false) return;
    Game.paused = true;
    G.Input.unlock();
    if (G.Audio) G.Audio.duck(true);
    G.UI.open('pause', { onClose: () => Game.resume() });
  };
  Game.resume = function () {
    if (!Game.paused) return;
    Game.paused = false;
    if (G.Audio) G.Audio.duck(false);
    if (Game.mode) G.Input.setLayout(Game.mode.layout || 'fps');
    G.Input.lock();
  };
  // Restore gameplay input after a menu closes (menus set layout 'menu').
  G.bus.on('ui-empty', () => { if (Game.mode && !Game.paused && !Game._switching) { G.Input.setLayout(Game.mode.layout || 'fps'); } });

  // Menu render throttle. While a dimmed full-screen menu (Guild, Mission Board, quick map, settings...)
  // covers the town, the 3D view behind the dim is redrawn at most every 50 ms and never two frames in a
  // row (<= 20 fps on a 60 Hz phone, half rate on slower devices): the dim hides the difference, phones
  // save battery and heat, and the UI animations get the frame budget. Only drawing is skipped — the
  // simulation, the HUD and every timer run exactly as before. Screens that leave the scene visible
  // (title, tutorial captions, toasts) keep the full rate. The canvas keeps its last image meanwhile; a
  // resize or a mode switch draws at once.
  const DIM_EVERY = 0.05;
  let dimTop = null, dimN = -1, dimOn = false, dimAcc = 1, dimSkip = 9;
  const dimmed = el => {
    if (!el || !el.classList) return false;
    const c = el.classList;
    if (c.contains('dim') || c.contains('mm-dim') || c.contains('ex-screen') || c.contains('rr-dim')) return true;
    const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(el).backgroundColor || '');
    const a = m ? m[1].split(',') : null;
    return !!(a && a.length === 4 && +a[3] >= 0.35);
  };
  function menuDims() {
    const st = G.UI.stack, n = st.length;
    if (!n) { dimTop = null; dimN = 0; return (dimOn = false); }
    const top = st[n - 1];
    if (top !== dimTop || n !== dimN) {   // re-evaluated only when the stack changes
      dimTop = top; dimN = n; dimOn = false;
      for (let i = 0; i < n && !dimOn; i++) dimOn = dimmed(st[i].el);
    }
    return dimOn;
  }
  Game.menuThrottle = true;   // (false = always draw; for A/B measurements)
  Game.renderThrottled = () => !!(Game.menuThrottle && dimOn && G.UI.stack.length);
  const drawNow = () => { dimAcc = 1; dimSkip = 9; };
  G.bus.on('resize', drawNow); G.bus.on('screen', drawNow); G.bus.on('mode', drawNow); G.bus.on('quality', drawNow);
  G.bus.on('redraw', drawNow);   // (04_render: the drawing buffer was just reallocated — cleared — so draw this frame)
  function shouldDraw() {
    if (Game._switching || !G.UI.stack.length || !Game.menuThrottle || !menuDims()) { dimAcc = 1; dimSkip = 9; return true; }
    dimAcc += G.time.rawDt || G.time.realDt; dimSkip++;
    if (dimAcc < DIM_EVERY || dimSkip < 2) return false;
    dimAcc = 0; dimSkip = 0;
    return true;
  }

  // Pause opened because the browser released the pointer lock (Esc while the mouse is captured: the page
  // never sees that keydown, so 07_ui's Esc sound cannot fire): give it the same 'uiOpen' sound as the
  // Esc / tap paths, unless something already played one while the pause screen opened.
  // (a frame flag, not a time window: 06_input raises pauseP on the same event and the next loop handles it,
  // however long that frame takes)
  // The same frame flag backs up 07_ui's Esc / P key sound, which only counts a key pressed within 400 ms of the
  // pause opening (a slow phone frame can take longer): when the pause opened from a key and nothing played, it plays here.
  let lockLost = false, keyPause = false;
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) lockLost = true; });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' || (e.code === 'KeyP' && !e.repeat)) keyPause = true; }, true);
  function pauseSound() {
    const A = G.Audio, fromLock = lockLost || keyPause, mark = A && A._mark ? A._mark() : -1;
    Game.pause();
    if (fromLock && Game.paused && A && A.sfx && (!A._mark || A._mark() === mark)) G.safe('pause sound', () => A.sfx('uiOpen'));
  }

  // Main loop. The frame step comes from the pacer (G.time.pace: refresh-snapped, low-passed,
  // spike-safe); the raw delta and the CPU time of the frame feed dynamic resolution.
  let last = 0;
  const perf = window.performance && performance.now ? performance : Date;
  Game.loop = function (t) {
    requestAnimationFrame(Game.loop);
    const t0 = perf.now();
    const raw = last && t > last ? (t - last) / 1000 : 0;
    if (t > last) last = t;
    G.time.step(G.time.pace(raw));
    G.Input.poll();
    const inp = G.input;
    if (inp.pauseP && Game.mode && !Game._switching) {
      if (Game.paused) { G.UI.close('pause'); }
      else if (!G.UI.anyOpen()) pauseSound();
      else if (G.UI.top() && G.UI.top().def.escClose !== false) G.UI.close();
    }
    lockLost = false; keyPause = false;
    // (G.safe semantics, inlined: no closures or label strings allocated per frame)
    if (!Game.paused && !Game.hold && !G.R.isLost() && Game.mode && !Game._switching) {
      const dt = G.time.dt;
      try { Game.mode.update(dt, G.time.realDt); } catch (e) { safeFail('mode ' + Game.modeId, e); }
      if (Game.world && Game.mode.worldUpdate !== false) { try { Game.world.update(dt); } catch (e) { safeFail('world', e); } }
      if (Game.mode.lateUpdate) { try { Game.mode.lateUpdate(dt); } catch (e) { safeFail('late', e); } }
    }
    if (G.HUD) { try { G.HUD.frame(G.time.realDt); } catch (e) { safeFail('hud', e); } }
    // CPU time = simulation + HUD, measured before rendering: in a GPU-bound frame some browsers
    // (WebKit) block inside the first GL call until the GPU catches up, which would make every
    // slow frame look CPU-bound and stop resolution scaling from helping.
    G.R.trackFrame(G.time.rawDt, perf.now() - t0);
    if (G.R.scene && !Game._compiling && shouldDraw()) G.R.render();
    G.Input.endFrame();
  };
  Game.start = function () { if (Game.running) return; Game.running = true; requestAnimationFrame(Game.loop); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.mode && Game.mode.pausable !== false && !G.UI.anyOpen()) Game.pause();
    // rAF stops while hidden: the first delta after returning spans the whole absence.
    if (!document.hidden) { G.time.resync(2); if (G.R.frameGrace) G.R.frameGrace(1); }
  });
})(window.G);

}).call(window); } catch (e) { console.error('[module 10_world.js]', e); }
// ---- 11_systems.js
try { (function () {
// Shared per-world systems: projectiles, pickups (bolts/parts/health/ammo), particle FX, hit-stop.
//
// world.fx — everything pooled and allocated when the world is built (shaders compile behind the
// loading screen, nothing is created per effect, no per-frame allocation). Fixed draw calls that
// are only issued while something of that kind is on screen:
//   add / norm   point clouds: additive glow / alpha-blended solids & smoke ............ 1 call each
//   quads        instanced quads, camera-facing / stretched along an axis / flat on a plane:
//                flashes, muzzle stars, shockwaves, ground rings, tracers, glows, light pillars . 1
//   spheres      instanced fresnel bubbles (sphereFlash, explosion fireballs) .................. 1
//   trails       tapered ribbons behind projectiles (also the shared ribbon shader) ............. 1
//   decals       instanced procedural splats: persistent goo + fading impact marks .............. 1
// All colours are display-referred sRGB like the rest of the pipeline (see 04_render.js), so hex
// colours appear exactly as written. Quads, spheres and trails use premultiplied "additive-over"
// blending (ONE, ONE_MINUS_SRC_ALPHA): each effect picks how much it also covers what is behind it
// (0 = pure glow, 1 = opaque paint), so effects keep their colour on bright toon scenes instead of
// washing out to white. Every shader handles fog itself (additive effects fade out into fog
// instead of turning fog-coloured) and fades geometry that hugs the lens (fill rate).
(function (G) {
  const V3 = THREE.Vector3;
  const U = G.util;
  const _a = new V3(), _b = new V3(), _d = new V3(), _e = new V3();
  const _col = new THREE.Color();
  const NO = {};
  const UPV = new V3(0, 1, 0);
  const TAU = Math.PI * 2;
  const DYN = THREE.DynamicDrawUsage;
  const cR = h => ((h >> 16) & 255) / 255, cG = h => ((h >> 8) & 255) / 255, cB = h => (h & 255) / 255;
  // Blend two hex colours (sRGB) → hex.
  function mixHex(a, b, t) {
    const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
    const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t);
    const bl = (a & 255) + (((b & 255) - (a & 255)) * t);
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
  }
  const easeOutBack = t => { const u = t - 1; return 1 + 2.70158 * u * u * u + 1.70158 * u * u; };
  const smooth = t => t * t * (3 - 2 * t);
  // Upload only elements [start, start + count) of a dynamic attribute this frame (no allocation:
  // one reusable range object, widened when several uploads land before a render; three.js clears
  // the list after uploading).
  // (The range object lives in a side table, not on the attribute: a field added to a three.js object mid-fight is a
  // map transition on the shared BufferAttribute class, which deopts every optimized function handling attributes.)
  const RNG = new WeakMap();
  function upload(attr, count, start) {
    if (count <= 0) return;
    start = start || 0;
    let r = RNG.get(attr);
    if (!r) { r = { start: 0, count: 0 }; RNG.set(attr, r); }
    const L = attr.updateRanges;
    if (L.length === 1 && L[0] === r) { const e = Math.max(r.start + r.count, start + count); r.start = Math.min(r.start, start); r.count = e - r.start; }
    else { L.length = 0; r.start = start; r.count = count; L.push(r); }
    attr.needsUpdate = true;
  }
  function dynAttr(geo, name, array, size, normalized, instanced) {
    const a = instanced ? new THREE.InstancedBufferAttribute(array, size, !!normalized) : new THREE.BufferAttribute(array, size, !!normalized);
    a.setUsage(DYN);
    geo.setAttribute(name, a);
    return a;
  }

  // ======================= Hit-stop governor =======================
  // G.time.hitStop(sec, big) requests land here. A short freeze sells a kill or a heavy hit, but
  // chained freezes read as stutter, so: one freeze at a time (a request during a freeze can only
  // stretch it up to its cap, never stack), small requests are dropped while time eases back in and
  // for GAP seconds after, and a leaky budget keeps frozen time to ~12% of any stretch of play —
  // under a stream of kills the freezes get shorter instead of stuttering. Time eases back in over
  // REC seconds (smoothstep) rather than snapping from 5% to full speed. `big` (boss defeats) gets a
  // longer cap and may interrupt a recovery.
  const HS = G.HitStop = {
    CAP: 0.1, BIG: 0.14, HOLD: 0.05, REC: 0.075, GAP: 0.14, BUDGET: 0.12,
    t: -0, held: -0, cap: -0, rec: -0, gap: -0, load: -0, scale: -0, count: 0,   // (-0: doubles from the start; scale set to 1 below)
    request(sec, big) {
      if (!(sec > 0)) return false;
      const cap = big ? this.BIG : this.CAP;
      sec = Math.min(sec, cap);
      if (this.t > 0) {
        this.cap = Math.max(this.cap, cap);
        const total = Math.min(this.cap, Math.max(this.held + this.t, big ? this.held + sec * 0.5 : sec));
        this.t = Math.max(0, total - this.held);
        return true;
      }
      if (!big && (this.rec > 0 || this.gap > 0)) return false;
      const room = (big ? this.BUDGET * 1.5 : this.BUDGET) - this.load;
      sec = Math.min(sec, room);
      if (sec < 0.018) return false;
      this.t = sec; this.held = 0; this.cap = cap; this.rec = 0; this.gap = 0; this.count++;
      return true;
    },
    // Advance by real (unscaled) time; returns the time scale this frame.
    tick(rdt) {
      this.load = Math.max(0, this.load - rdt * this.BUDGET);
      let s = 1;
      if (this.t > 0) {
        this.t -= rdt; this.held += rdt; this.load += rdt; s = this.HOLD;
        if (this.t <= 0) { this.t = 0; this.rec = this.REC; }
      } else if (this.rec > 0) {
        this.rec -= rdt;
        const k = 1 - Math.max(0, this.rec) / this.REC;
        s = this.HOLD + (1 - this.HOLD) * smooth(k);
        if (this.rec <= 0) { this.rec = 0; this.gap = this.GAP; s = 1; }
      } else if (this.gap > 0) this.gap = Math.max(0, this.gap - rdt);
      this.scale = s;
      return s;
    },
    reset() { this.t = this.held = this.rec = this.gap = this.load = 0; this.scale = 1; },
  };
  HS.scale = 1;
  // Route the core clock through the governor (installed once; the core's own _stop path stays
  // available to anything that sets it directly).
  (function install(T) {
    if (!T || T._hsGov) return;
    T._hsGov = true;
    const coreStep = T.step;
    T.hitStop = function (sec, big) { return HS.request(sec, big); };
    T.step = function (raw) {
      coreStep.call(this, raw);
      const s = HS.tick(this.realDt);
      if (s < this.scale) { this.elapsed -= this.dt; this.scale = s; this.dt = this.realDt * s; this.elapsed += this.dt; }
    };
  })(G.time);
  G.bus.on('mode', () => HS.reset());

  // ======================= shared uniforms =======================
  // One world renders at a time; its FX.update refreshes these once per frame.
  const FOG = { uFog: { value: new V3(1, 1, 1) }, uFogR: { value: new V3(0, 1, 0) } };
  const PSU = { uScale: { value: 300 }, uMaxPx: { value: 256 }, uStreak: { value: 0.035 }, uRes: { value: new THREE.Vector2(1, 1) } };
  let maxPointPx = 0;
  function refreshShared(scene) {
    const R = G.R, f = scene && scene.fog;
    if (f) {
      _col.copy(f.color).convertLinearToSRGB();
      FOG.uFog.value.set(_col.r, _col.g, _col.b);
      if (f.isFogExp2) FOG.uFogR.value.set(-f.density, 0, 1); else FOG.uFogR.value.set(f.near, f.far, 1);
    } else FOG.uFogR.value.z = 0;
    const fbH = (R.h || 1) * (R.pr || 1);
    // gl_PointSize is in framebuffer pixels: world size * (fb height / 2) / tan(fov / 2) / depth.
    PSU.uScale.value = fbH * 0.5 / Math.tan((R.camera ? R.camera.fov : 75) * Math.PI / 360);
    PSU.uRes.value.set((R.w || 1) * (R.pr || 1), fbH);
    if (!maxPointPx) {
      maxPointPx = 256;
      G.safe('point range', () => { const gl = R.renderer && R.renderer.getContext(); const r = gl && gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE); if (r && r[1] > 1) maxPointPx = r[1]; });
    }
    // Fill-rate guard: no single sprite taller than ~40% of the screen.
    PSU.uMaxPx.value = Math.max(8, Math.min(maxPointPx, fbH * 0.4));
  }
  // GLSL helpers shared by every FX shader: fog factor (linear or exp2, uFogR = near, far, on).
  const FOG_VS = 'uniform vec3 uFogR; float fogK(float z){ if (uFogR.z < 0.5) return 0.0; return uFogR.x < 0.0 ? 1.0 - exp(-uFogR.x * uFogR.x * z * z) : smoothstep(uFogR.x, uFogR.y, z); }';

  // ======================= FX: particles =======================
  // CPU: life, drag, gravity, colour over life (start → end, optional white-hot start), size/alpha
  // curves, spin, optional settle on the ground under the burst. Stable compaction keeps draw order
  // (older behind newer) so overlapping smoke never flickers. GPU: procedural sprite shapes, sparks
  // stretched along their on-screen motion, size attenuated at the current render scale, sprites
  // that hug the lens or shrink under ~1.5 px fade instead of shimmering, size capped for fill rate.
  const SH = { glow: 0, streak: 1, star: 2, chip: 3, blob: 4, puff: 5, ring: 6 };
  const CV = { shrink: 0, grow: 1, pop: 2, flat: 3, spark: 4 };
  const shapeId = s => (typeof s === 'string' ? (SH[s] != null ? SH[s] : 0) : s);
  const curveId = c => (typeof c === 'string' ? (CV[c] != null ? CV[c] : 0) : c);
  const PS_VS = [
    'attribute float size; attribute vec4 rgba; attribute vec3 vel; attribute vec2 aux;',
    'uniform float uScale, uMaxPx, uStreak; uniform vec2 uRes;', FOG_VS,
    'varying vec4 vC; varying vec4 vA; varying vec2 vR;',
    'void main(){',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vec4 cp = projectionMatrix * mv;',
    '  float z = max(0.05, -mv.z);',
    '  float px = size * uScale / z;',
    '  float a = rgba.a * smoothstep(0.12, 0.6, z);',
    '  vec2 rot = vec2(cos(aux.y), sin(aux.y));',
    '  float st = 1.0;',
    '  if (abs(aux.x - 1.0) < 0.5) {',
    // streak: point along the on-screen motion over uStreak seconds, stretch by its pixel length
    '    vec4 cq = projectionMatrix * (mv + vec4(mat3(modelViewMatrix) * vel * uStreak, 0.0));',
    '    if (cq.w > 0.05) {',
    '      vec2 d = (cq.xy / cq.w - cp.xy / cp.w) * uRes * 0.5;',
    '      float l = length(d);',
    '      if (l > 0.01) { rot = d / l; st = 1.0 + l / max(px, 1.0); }',
    '    }',
    '  }',
    '  float w = max(px, 1.5);',
    '  a *= min(1.0, px / 1.5);',
    // a sprite that would outgrow the fill-rate cap fades instead of shrinking against the scene
    '  a *= clamp(1.6 - 0.6 * w / uMaxPx, 0.0, 1.0);',
    '  float ps = min(w * min(st, 7.0), uMaxPx);',
    '  vA = vec4(aux.x, max(1.0, ps / min(w, uMaxPx)), aux.y, fogK(z));',
    '  vC = vec4(rgba.rgb, a); vR = rot;',
    '  gl_PointSize = ps;',
    '  gl_Position = cp;',
    '}',
  ].join('\n');
  const PS_FS = [
    'uniform vec3 uFog; varying vec4 vC; varying vec4 vA; varying vec2 vR;',
    'void main(){',
    '  vec2 p = vec2(gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y) * 2.0;',
    '  vec2 q = vec2(dot(p, vR), dot(p, vec2(-vR.y, vR.x)));',
    '  float sh = vA.x; vec3 col = vC.rgb; float a;',
    '  if (sh < 0.5) {',                                   // soft glow / soft dot
    '    float g = max(0.0, 1.0 - length(p));',
    '#ifdef ADD',
    '    a = g * g; col += (1.0 - col) * (g * g * g * 0.55);',
    '#else',
    '    a = smoothstep(0.0, 0.3, g);',
    '#endif',
    '  } else if (sh < 1.5) {',                            // streak: bright head, tapering tail
    '    float e = length(vec2(q.x, q.y * vA.y));',
    '    float g = max(0.0, 1.0 - e);',
    '    a = g * (0.35 + 0.65 * smoothstep(-1.0, 0.7, q.x));',
    '    col += (1.0 - col) * g * g * 0.6;',
    '  } else if (sh < 2.5) {',                            // four-point sparkle
    '    vec2 s = abs(q);',
    '    float rays = max(0.0, 1.0 - s.x - s.y * 7.0) + max(0.0, 1.0 - s.y - s.x * 7.0);',
    '    float core = max(0.0, 1.0 - length(s) * 2.4);',
    '    a = min(1.0, rays + core * core * 1.6);',
    '    col += (1.0 - col) * min(1.0, core * 1.4);',
    '  } else if (sh < 3.5) {',                            // confetti chip tumbling in 3D
    '    float flip = abs(sin(vA.z * 1.618));',
    '    vec2 b = abs(q) / vec2(0.9, 0.1 + 0.5 * flip);',
    '    a = 1.0 - smoothstep(0.78, 1.0, max(b.x, b.y));',
    '    col *= 0.68 + 0.32 * flip;',
    '  } else if (sh < 4.5) {',                            // glossy toon blob (goo, chunks)
    '    float r = length(p);',
    '    a = 1.0 - smoothstep(0.8, 1.0, r);',
    '    col *= 0.74 + 0.36 * clamp(0.55 + 0.5 * (p.y * 0.8 - p.x * 0.5), 0.0, 1.0);',
    '    col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.3, length(p - vec2(-0.32, 0.36)))) * 0.75);',
    '  } else if (sh < 5.5) {',                            // cotton puff (smoke, dust), lit from above
    '    float r = length(p);',
    '    a = 1.0 - smoothstep(0.35, 1.0, r);',
    '    col *= 0.72 + 0.38 * clamp(0.5 + 0.65 * (p.y - 0.3 * p.x), 0.0, 1.0);',
    '  } else {',                                          // ring pop
    '    a = max(0.0, 1.0 - abs(length(p) - 0.72) * 5.0);',
    '  }',
    '  a *= vC.a;',
    '#ifdef ADD',
    '  a *= 1.0 - vA.w;',
    '#else',
    '  col = mix(col, uFog, vA.w);',
    '#endif',
    '  gl_FragColor = vec4(col, a);',
    '}',
  ].join('\n');
  function pointsMat(additive) {
    return new THREE.ShaderMaterial({
      uniforms: { uScale: PSU.uScale, uMaxPx: PSU.uMaxPx, uStreak: PSU.uStreak, uRes: PSU.uRes, uFog: FOG.uFog, uFogR: FOG.uFogR },
      defines: additive ? { ADD: 1 } : {},
      vertexShader: PS_VS, fragmentShader: PS_FS,
      transparent: true, depthWrite: false, fog: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
  }
  // Size / alpha factors over normalised age t (0 → 1) — t in CUR[2] — written to CUR[0] / CUR[1]. (A typed array, not
  // closure variables or arguments: every double stored into a closure variable, or passed to a call that is not
  // inlined, is a fresh heap number — several per particle per frame.)
  const CUR = new Float64Array(3);
  function curveAt(c) {
    const t = CUR[2];
    if (c === 1) { CUR[0] = 0.45 + 0.75 * Math.sqrt(t); const f = 1 - t; CUR[1] = Math.min(1, t * 12) * f * f * (1 + t); }        // grow: smoke
    else if (c === 2) { CUR[0] = t < 0.15 ? Math.max(0.05, easeOutBack(t / 0.15)) : 1 - 0.5 * (t - 0.15) / 0.85; CUR[1] = Math.min(1, (1 - t) * 3); } // pop
    else if (c === 3) { CUR[0] = 1; CUR[1] = Math.min(1, (1 - t) * 5); }                                                           // flat: confetti
    else if (c === 4) { CUR[0] = 1 - 0.5 * t; CUR[1] = (1 - t) * (1 - 0.4 * t); }                                                  // spark
    else { CUR[0] = 0.4 + 0.6 * (1 - t); CUR[1] = Math.min(1, (1 - t) * 2.2); }                                                    // shrink (classic)
  }
  // Per-particle CPU state (stride ST): 0 life, 1 max, 2 size, 3 grav, 4 drag, 5 alpha, 6-8 start
  // rgb, 9-11 end rgb, 12 hot, 13 curve, 14 spin, 15 ground y, 16 floor checked.
  const ST = 17, GY_NONE = -1e9;
  const PA = new Float64Array(18);   // PSys.addPA spawn arguments (see there)
  // `post` (on every pooled system) = G.time.frame of the last FX.update. Effects requested later in
  // that same frame (lateUpdate, HUD) are already past this frame's update, so they upload at once;
  // anything requested before the update (actors, projectiles, mode.update) shows its first frame
  // exactly as spawned — a 70 ms flash must not open 70% of the way through at 20 fps.
  const isPost = sys => sys.post === G.time.frame;
  class PSys {
    constructor(scene, additive, cap) {
      this.cap = cap; this.n = 0; this.additive = additive; this.post = -1; this.ground = null;
      this.pos = new Float32Array(cap * 3); this.vel = new Float32Array(cap * 3);
      this.col = new Uint8ClampedArray(cap * 4); this.size = new Float32Array(cap); this.aux = new Float32Array(cap * 2);
      this.D = new Float32Array(cap * ST); this.fresh = new Uint8Array(cap);
      const g = new THREE.BufferGeometry();
      this.aPos = dynAttr(g, 'position', this.pos, 3); this.aVel = dynAttr(g, 'vel', this.vel, 3);
      this.aCol = dynAttr(g, 'rgba', this.col, 4, true); this.aSize = dynAttr(g, 'size', this.size, 1); this.aAux = dynAttr(g, 'aux', this.aux, 2);
      g.setDrawRange(0, 0);
      g.boundingSphere = new THREE.Sphere(new V3(), 1e6);
      this.geo = g;
      this.mat = pointsMat(additive);
      this.points = new THREE.Points(g, this.mat);
      this.points.frustumCulled = false; this.points.visible = false; // (the load warm-up still compiles it)
      this.points.userData.warmAlways = true;   // (light warm-ups too: title / menu backdrops spawn particles)
      this.points.renderOrder = additive ? 5 : 4;
      scene.add(this.points);
    }
    // Legacy-compatible: add(x,y,z, vx,vy,vz, color, size, life, grav, drag, alpha) plus optional
    // shape (SH id), curve (CV id), end colour (hex, <0 = same), hot (0..1 white-hot start),
    // spin (rad/s; also randomises orientation), ground y (settle there). Returns index or -1.
    // (fills the PA scratch array and calls addPA: the hot paths inside FX write PA themselves, so a spray of particles
    // passes no double arguments — a call that is not inlined boxes every double argument into a heap number)
    add(x, y, z, vx, vy, vz, color, size, life, grav, drag, alpha, shape, curve, end, hot, spin, gy) {
      PA[0] = x; PA[1] = y; PA[2] = z; PA[3] = vx; PA[4] = vy; PA[5] = vz; PA[6] = color | 0; PA[7] = size; PA[8] = life;
      PA[9] = grav || 0; PA[10] = drag || 0; PA[11] = alpha != null ? alpha : 1; PA[12] = shape != null ? shape : -1; PA[13] = curve || 0;
      PA[14] = end != null && end >= 0 ? end : -1; PA[15] = hot || 0; PA[16] = spin || 0; PA[17] = gy != null ? gy : GY_NONE;
      return this.addPA();
    }
    // Spawn from PA: 0-2 pos, 3-5 vel, 6 colour, 7 size, 8 life, 9 grav, 10 drag, 11 alpha, 12 shape (<0 = default for the
    // alpha), 13 curve, 14 end colour (<0 = same), 15 hot, 16 spin, 17 ground y (GY_NONE = none).
    addPA() {
      const i = this.n, life = PA[8];
      if (i >= this.cap || !(life > 0)) return -1;
      this.n = i + 1;
      const p = i * 3, o = i * ST, D = this.D;
      this.pos[p] = PA[0]; this.pos[p + 1] = PA[1]; this.pos[p + 2] = PA[2];
      this.vel[p] = PA[3]; this.vel[p + 1] = PA[4]; this.vel[p + 2] = PA[5];
      const a0 = PA[11];
      D[o] = life; D[o + 1] = life; D[o + 2] = PA[7]; D[o + 3] = PA[9]; D[o + 4] = PA[10]; D[o + 5] = a0;
      const color = PA[6] | 0, end = PA[14];
      const r0 = cR(color), g0 = cG(color), b0 = cB(color);
      D[o + 6] = r0; D[o + 7] = g0; D[o + 8] = b0;
      if (end >= 0) { const e = end | 0; D[o + 9] = cR(e); D[o + 10] = cG(e); D[o + 11] = cB(e); } else { D[o + 9] = r0; D[o + 10] = g0; D[o + 11] = b0; }
      D[o + 12] = PA[15]; D[o + 13] = PA[13]; D[o + 14] = PA[16]; D[o + 15] = PA[17]; D[o + 16] = 0;
      const shape = PA[12];
      this.aux[i * 2] = shape >= 0 ? shape : (this.additive ? SH.glow : (a0 < 0.8 ? SH.puff : SH.blob));
      this.aux[i * 2 + 1] = Math.random() * TAU;
      const post = isPost(this);
      this.fresh[i] = post ? 0 : 1;
      CUR[2] = 0; this._look(i, o);
      if (post) this._touch();
      return i;
    }
    // colour / size of particle i (state at o) at normalised age CUR[2]
    _look(i, o) {
      const D = this.D, t = CUR[2];
      curveAt(D[o + 13]);
      this.size[i] = D[o + 2] * CUR[0];
      let r = D[o + 6] + (D[o + 9] - D[o + 6]) * t, g = D[o + 7] + (D[o + 10] - D[o + 7]) * t, b = D[o + 8] + (D[o + 11] - D[o + 8]) * t;
      const hot = D[o + 12];
      if (hot > 0 && t < 0.3) { const h = hot * (1 - t / 0.3) * (1 - t / 0.3); r += (1 - r) * h; g += (1 - g) * h; b += (1 - b) * h; }
      const c = i * 4, C = this.col;
      C[c] = r * 255; C[c + 1] = g * 255; C[c + 2] = b * 255; C[c + 3] = D[o + 5] * CUR[1] * 255;
    }
    _move(from, to) {
      const D = this.D, a = from * ST, b = to * ST;
      for (let k = 0; k < ST; k++) D[b + k] = D[a + k];
      const P = this.pos, V = this.vel, f3 = from * 3, t3 = to * 3;
      P[t3] = P[f3]; P[t3 + 1] = P[f3 + 1]; P[t3 + 2] = P[f3 + 2];
      V[t3] = V[f3]; V[t3 + 1] = V[f3 + 1]; V[t3 + 2] = V[f3 + 2];
      this.aux[to * 2] = this.aux[from * 2]; this.aux[to * 2 + 1] = this.aux[from * 2 + 1];
      this.fresh[to] = this.fresh[from];
    }
    update(dt) {
      this.post = -1;
      const D = this.D, P = this.pos, V = this.vel, A = this.aux, F = this.fresh;
      const n = this.n;
      let w = 0;
      for (let i = 0; i < n; i++) {
        const o = i * ST;
        if (F[i]) { if (w !== i) { this._move(i, w); CUR[2] = 0; this._look(w, w * ST); } F[w] = 0; w++; continue; } // its first frame shows as spawned
        const life = D[o] - dt;
        if (life <= 0) continue;
        if (w !== i) this._move(i, w);
        const q = w * ST, p = w * 3;
        D[q] = life;
        const drag = D[q + 4];
        const dr = drag > 0 ? Math.exp(-drag * dt) : 1;
        let vx = V[p] * dr, vy = V[p + 1] * dr - D[q + 3] * dt, vz = V[p + 2] * dr;
        const x = P[p] + vx * dt, z = P[p + 2] + vz * dt;
        let y = P[p + 1] + vy * dt;
        let gy = D[q + 15];
        if (y < gy && !D[q + 16] && this.ground) {
          // first touch of the burst's floor level: look up the real floor under this particle once
          // (bits thrown over a slope or off a ledge keep falling instead of hovering in the air)
          D[q + 16] = 1;
          gy = D[q + 15] = this.ground(x, z, P[p + 1]);
        }
        if (y < gy) { // settle on the ground (confetti, debris)
          y = gy; vy = vy < -1.5 ? -vy * 0.3 : 0;
          const fr = Math.exp(-7 * dt); vx *= fr; vz *= fr; D[q + 14] *= fr;
        }
        V[p] = vx; V[p + 1] = vy; V[p + 2] = vz; P[p] = x; P[p + 1] = y; P[p + 2] = z;
        const sp = D[q + 14]; if (sp) A[w * 2 + 1] += sp * dt;
        CUR[2] = 1 - life / D[q + 1]; this._look(w, q);
        w++;
      }
      this.n = w;
      this._touch();
    }
    // Hidden while empty: three.js still issues a (zero-length) draw call for an empty draw range.
    _touch() {
      const n = this.n;
      this.geo.drawRange.count = n;
      this.points.visible = n > 0;
      if (!n) return;
      upload(this.aPos, n * 3); upload(this.aVel, n * 3); upload(this.aCol, n * 4); upload(this.aSize, n); upload(this.aAux, n * 2);
    }
    clear() { this.n = 0; this.geo.drawRange.count = 0; this.points.visible = false; }
    dispose() { this.geo.dispose(); this.mat.dispose(); }
  }

  // ======================= FX: instanced quads =======================
  // mode 0 camera-facing (rotated), 1 stretched along iDir and turned toward the camera (tracers,
  // light pillars, stretched glows), 2 flat on the plane with normal iDir (ground rings).
  // Shapes: 0 soft glow with a hot core, 1 starburst (muzzle flash), 2 ring (p1 thickness, p2 inner
  // fill), 3 tapered tracer (bright head, thin fading tail), 4 light pillar, 5 bubble disc.
  const QS = { glow: 0, star: 1, ring: 2, tracer: 3, beam: 4, disk: 5 };
  const QM = { bill: 0, axis: 1, plane: 2 };
  const Q_VS = [
    'attribute vec3 iPos; attribute vec4 iDir; attribute vec4 iSz; attribute vec4 iCol; attribute vec3 iPar;', FOG_VS,
    'varying vec2 vUv; varying vec4 vC; varying vec4 vP;',
    'void main(){',
    '  vec2 c = position.xy; float mode = iDir.w; vec4 mv;',
    '  float cs = cos(iSz.z), sn = sin(iSz.z);',
    '  if (mode < 0.5) {',
    '    mv = modelViewMatrix * vec4(iPos, 1.0);',
    '    float k = min(1.0, 1.6 * max(0.05, -mv.z) / max(iSz.x, iSz.y));', // never wider than the view
    '    mv.xy += vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) * iSz.xy * k;',
    '  } else if (mode < 1.5) {',
    '    vec3 A = iDir.xyz; vec3 toC = cameraPosition - iPos;',
    '    vec3 S = cross(A, toC); float l = length(S);',
    '    S = l > 1e-5 ? S / l : normalize(cross(A, vec3(0.31, 0.95, 0.0)));',
    '    mv = modelViewMatrix * vec4(iPos + A * (c.y * iSz.y) + S * (c.x * iSz.x), 1.0);',
    '  } else {',
    '    vec3 N = iDir.xyz; vec3 T = normalize(cross(N, abs(N.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))); vec3 B = cross(N, T);',
    '    vec2 r = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) * iSz.xy;',
    '    mv = modelViewMatrix * vec4(iPos + T * r.x + B * r.y, 1.0);',
    '  }',
    '  float z = max(0.05, -mv.z);',
    '  vUv = c * 2.0;',
    '  vC = vec4(iCol.rgb, iCol.a * smoothstep(0.1, 0.5, z) * (1.0 - fogK(z)));',
    '  vP = vec4(iSz.w, iPar);',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n');
  const Q_FS = [
    'varying vec2 vUv; varying vec4 vC; varying vec4 vP;',
    'void main(){',
    '  vec2 u = vUv; float r = length(u); float sh = vP.x; float a;',
    '  vec3 col = clamp(mix(vec3(dot(vC.rgb, vec3(0.3, 0.59, 0.11))), vC.rgb, 1.3), 0.0, 1.0);',
    '  if (sh < 0.5) {',
    '    float g = max(0.0, 1.0 - r); a = g * g * (0.6 + 0.4 * g);',
    '    col += (1.0 - col) * g * g * g * g * 0.8;',
    '  } else if (sh < 1.5) {',
    '    vec2 q = abs(u); vec2 d = abs(vec2(u.x + u.y, u.x - u.y)) * 0.7071;',
    '    float rays = max(max(1.0 - q.x - q.y * 5.0, 1.0 - q.y - q.x * 5.0), max(0.72 - d.x - d.y * 6.0, 0.72 - d.y - d.x * 6.0));',
    '    float core = max(0.0, 1.0 - r * 2.0);',
    '    a = clamp(max(rays, 0.0) * 1.15 + core * core, 0.0, 1.0);',
    '    col += (1.0 - col) * min(1.0, core * 1.5);',
    '  } else if (sh < 2.5) {',
    '    float th = max(vP.y, 0.02);',
    '    float band = abs(r - (1.0 - th * 0.5)) / (th * 0.5);',
    '    a = (1.0 - smoothstep(0.45, 1.0, band)) + vP.z * r * r * (1.0 - smoothstep(0.9, 1.0, r));',
    '    col += (1.0 - col) * (1.0 - smoothstep(0.0, 0.5, band)) * 0.45;',
    '  } else if (sh < 3.5) {',
    '    float h = u.y * 0.5 + 0.5;',
    '    float w = mix(0.22, 1.0, h);',
    '    float e = abs(u.x) / w;',
    '    a = (1.0 - smoothstep(0.3, 1.0, e)) * mix(0.12, 1.0, smoothstep(0.0, 0.8, h)) * (1.0 - smoothstep(0.9, 1.0, h));',
    '    col += (1.0 - col) * (1.0 - smoothstep(0.0, 0.45, e)) * 0.75;',
    '  } else if (sh < 4.5) {',
    '    float h = u.y * 0.5 + 0.5; float e = abs(u.x);',
    '    float g = 1.0 - smoothstep(0.0, 1.0, e);',
    '    a = g * g * (1.0 - smoothstep(0.15, 1.0, h)) * smoothstep(0.0, 0.08, h);',
    '    col += (1.0 - col) * (1.0 - smoothstep(0.0, 0.25, e)) * 0.6;',
    '  } else {',
    '    a = (0.22 + 0.78 * r * r * r) * (1.0 - smoothstep(0.9, 1.0, r));',
    '    col += (1.0 - col) * smoothstep(0.75, 0.97, r) * 0.5;',
    '  }',
    '  a *= vC.a;',
    '  gl_FragColor = vec4(col * a, a * vP.w);',
    '}',
  ].join('\n');
  // Persistent quad effect types (evaluated each frame from their slot).
  const QT = { flash: 1, muzzle: 2, ring: 3, shock: 4, tracer: 5, pop: 6 };
  const QCAP = 288, QSLOTS = 128;
  // One quad's values travel in the QA scratch array (0 mode, 1 shape, 2-4 pos, 5-7 dir, 8 w, 9 h, 10 rot, 11 colour,
  // 12 alpha, 13 p1, 14 p2, 15 ov): the per-effect, per-frame writes pass no double arguments (a call that is not inlined
  // boxes each one into a heap number).
  const QA = new Float64Array(16);
  function qa(mode, shape, x, y, z, dx, dy, dz, w, h, rot, color, alpha, p1, p2, ov) {
    QA[0] = mode; QA[1] = shape; QA[2] = x; QA[3] = y; QA[4] = z; QA[5] = dx; QA[6] = dy; QA[7] = dz; QA[8] = w; QA[9] = h; QA[10] = rot;
    QA[11] = color; QA[12] = alpha; QA[13] = p1 || 0; QA[14] = p2 || 0; QA[15] = ov || 0;
  }
  // the QA fields most _eval shapes share: mode, shape, the slot's position and colour; up-facing dir, no roll, no params
  function qbase(mode, shape, s) {
    QA[0] = mode; QA[1] = shape; QA[2] = s.x; QA[3] = s.y; QA[4] = s.z; QA[5] = 0; QA[6] = 1; QA[7] = 0;
    QA[10] = 0; QA[11] = s.color; QA[13] = 0; QA[14] = 0; QA[15] = 0;
  }
  function qput(T, i) {
    const i3 = i * 3, i4 = i * 4, color = QA[11] | 0;
    T.P[i3] = QA[2]; T.P[i3 + 1] = QA[3]; T.P[i3 + 2] = QA[4];
    T.D[i4] = QA[5]; T.D[i4 + 1] = QA[6]; T.D[i4 + 2] = QA[7]; T.D[i4 + 3] = QA[0];
    T.S[i4] = QA[8]; T.S[i4 + 1] = QA[9]; T.S[i4 + 2] = QA[10]; T.S[i4 + 3] = QA[1];
    T.C[i4] = (color >> 16) & 255; T.C[i4 + 1] = (color >> 8) & 255; T.C[i4 + 2] = color & 255; T.C[i4 + 3] = QA[12] * 255;
    T.X[i3] = QA[13]; T.X[i3 + 1] = QA[14]; T.X[i3 + 2] = QA[15];
  }
  function qarrays(n) { return { P: new Float32Array(n * 3), D: new Float32Array(n * 4), S: new Float32Array(n * 4), C: new Uint8ClampedArray(n * 4), X: new Float32Array(n * 3) }; }
  class Quads {
    constructor(scene) {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const A = this.A = qarrays(QCAP);
      this.T = qarrays(QCAP); this.ns = 0;
      this.at = [dynAttr(g, 'iPos', A.P, 3, false, true), dynAttr(g, 'iDir', A.D, 4, false, true), dynAttr(g, 'iSz', A.S, 4, false, true), dynAttr(g, 'iCol', A.C, 4, true, true), dynAttr(g, 'iPar', A.X, 3, false, true)];
      g.instanceCount = 0;
      g.boundingSphere = new THREE.Sphere(new V3(), 1e6);
      this.geo = g;
      this.mat = new THREE.ShaderMaterial({ uniforms: { uFogR: FOG.uFogR }, vertexShader: Q_VS, fragmentShader: Q_FS, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, premultipliedAlpha: true });
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
      scene.add(this.mesh);
      this.slots = [];
      // (number fields as doubles from the start: -0 then the default; see the Actor note in 10_world)
      for (let i = 0; i < QSLOTS; i++) { const q = { on: false, fresh: false, type: 0, t: -0, dur: -0, x: -0, y: -0, z: -0, dx: -0, dy: -0, dz: -0, x2: -0, y2: -0, z2: -0, s: -0, w: -0, rot: -0, spin: -0, color: 0xffffff, a: -0, p: -0, ov: 0.35 }; q.dur = 1; q.dy = 1; q.s = 1; q.w = 1; q.a = 1; this.slots.push(q); }
      this.cur = 0; this.post = -1;
    }
    // One-frame quad (re-issue every frame to keep it on screen). ov: how much it covers the
    // background (0 = pure glow).
    push(mode, shape, x, y, z, dx, dy, dz, w, h, rot, color, alpha, p1, p2, ov) {
      qa(mode, shape, x, y, z, dx, dy, dz, w, h, rot, color, alpha, p1, p2, ov);
      this.pushQA();
    }
    // push() with the values already in QA
    pushQA() {
      if (this.ns >= QCAP || !(QA[12] > 0.003)) return;
      qput(this.T, this.ns++);
    }
    slot(type, dur) {
      const S = this.slots, N = S.length;
      let s = null;
      for (let k = 0; k < N; k++) { const c = S[(this.cur + k) % N]; if (!c.on) { s = c; this.cur = (this.cur + k + 1) % N; break; } }
      if (!s) return null;
      s.on = true; s.fresh = !isPost(this); s.type = type; s.t = 0; s.dur = Math.max(0.016, dur); s.rot = 0; s.spin = 0; s.p = 0; s.a = 1; s.ov = 0.35;
      return s;
    }
    update(dt) {
      this.post = -1;
      const A = this.A, T = this.T;
      // timed effects first (flashes, shockwaves, tracers), then this frame's one-frame quads, so a
      // swarm of projectile glows can never crowd out an explosion
      let n = 0;
      const S = this.slots;
      for (let i = 0; i < S.length; i++) {
        const s = S[i];
        if (!s.on) continue;
        if (s.fresh) s.fresh = false; else s.t += dt;
        if (s.t / s.dur >= 1) { s.on = false; continue; }
        if (n < QCAP - 1) n = this._eval(s, n);
      }
      const m = Math.min(this.ns, QCAP - n);
      for (let j = 0; j < m * 3; j++) { A.P[n * 3 + j] = T.P[j]; A.X[n * 3 + j] = T.X[j]; }
      for (let j = 0; j < m * 4; j++) { A.D[n * 4 + j] = T.D[j]; A.S[n * 4 + j] = T.S[j]; A.C[n * 4 + j] = T.C[j]; }
      n += m;
      this.ns = 0;
      this.geo.instanceCount = n;
      if (n) for (let i = 0; i < 5; i++) upload(this.at[i], n * this.at[i].itemSize);
    }
    // One timed effect's quads at age k = t / dur (written straight into QA: qbase fills the parts shared by most shapes
    // from the slot — no double crosses a call — and each case sets the rest).
    _eval(s, n) {
      const A = this.A, k = s.t / s.dur, f = 1 - k;
      switch (s.type) {
        case QT.flash: { // white-hot pop: snaps open (overshoot), swells a little while fading
          const sz = s.s * (k < 0.2 ? 0.55 + 0.45 * easeOutBack(k / 0.2) : 1 + 0.3 * (k - 0.2));
          qbase(0, QS.glow, s); QA[8] = sz; QA[9] = sz; QA[12] = s.a * f * f; QA[15] = 0.05; qput(A, n++); break;
        }
        case QT.muzzle: { // starburst + glowing core, random roll and scale per shot
          const sz = s.s * (0.8 + 0.45 * Math.sqrt(k));
          qbase(0, QS.star, s); QA[8] = sz; QA[9] = sz * s.w; QA[10] = s.rot + k * 0.5; QA[12] = s.a * (1 - k * k); QA[15] = 0.2; qput(A, n++);
          qbase(0, QS.glow, s); QA[8] = sz * 1.6; QA[9] = sz * 1.6; QA[12] = 0.6 * s.a * f; qput(A, n++); break;
        }
        case QT.ring: { // flat ring expanding over the ground, thinning as it goes
          const R = 0.2 + s.s * smooth(Math.sqrt(k));
          qbase(2, QS.ring, s); QA[5] = s.dx; QA[6] = s.dy; QA[7] = s.dz; QA[8] = R * 2; QA[9] = R * 2; QA[10] = s.rot;
          QA[12] = s.a * Math.pow(f, 1.4); QA[13] = 0.22 * f + 0.05; QA[14] = 0.12 * f; QA[15] = 0.45; qput(A, n++); break;
        }
        case QT.shock: { // camera-facing shockwave: fast ease-out, thick → thin, faint inner fill
          const R = s.s * (1 - f * f * f) + 0.05;
          qbase(0, QS.ring, s); QA[8] = R * 2; QA[9] = R * 2; QA[12] = s.a * Math.pow(f, 1.6); QA[13] = 0.4 * f + 0.04; QA[14] = 0.3 * f; QA[15] = 0.3; qput(A, n++); break;
        }
        case QT.tracer: { // tapered streak whose tail chases the head while it fades
          const pull = Math.pow(k, 1.4) * s.p;
          const tx = s.x2 + (s.x - s.x2) * pull, ty = s.y2 + (s.y - s.y2) * pull, tz = s.z2 + (s.z - s.z2) * pull;
          let dx = s.x - tx, dy = s.y - ty, dz = s.z - tz; const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (L < 1e-3) break;
          dx /= L; dy /= L; dz /= L;
          qbase(1, QS.tracer, s); QA[2] = (s.x + tx) * 0.5; QA[3] = (s.y + ty) * 0.5; QA[4] = (s.z + tz) * 0.5; QA[5] = dx; QA[6] = dy; QA[7] = dz;
          QA[8] = s.w * (1 - 0.35 * k); QA[9] = L; QA[12] = s.a * Math.pow(f, 1.2); QA[15] = s.ov || 0; qput(A, n++); break;
        }
        case QT.pop: { // soft glow that swells and fades (pickup collect, small pops)
          const sz = s.s * (0.5 + 0.8 * Math.sqrt(k));
          qbase(0, QS.glow, s); QA[8] = sz; QA[9] = sz; QA[12] = s.a * f * f; QA[15] = 0.1; qput(A, n++); break;
        }
      }
      return n;
    }
    clear() { for (const s of this.slots) s.on = false; this.ns = 0; this.geo.instanceCount = 0; }
    dispose() { this.geo.dispose(); this.mat.dispose(); }
  }

  // ======================= FX: instanced fresnel spheres =======================
  const SP_VS = [
    'attribute vec3 iPos; attribute vec2 iRad; attribute vec4 iCol;', FOG_VS,
    'varying vec4 vC; varying float vF; varying float vFill;',
    'void main(){',
    '  vec3 wp = iPos + position * iRad.x;',
    '  vF = 1.0 - abs(dot(normal, normalize(cameraPosition - wp)));',
    '  vec4 mv = modelViewMatrix * vec4(wp, 1.0);',
    '  float z = max(0.05, -mv.z);',
    '  vC = vec4(iCol.rgb, iCol.a * (1.0 - fogK(z))); vFill = iRad.y;',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n');
  const SP_FS = [
    'varying vec4 vC; varying float vF; varying float vFill;',
    'void main(){',
    '  float f = vF * vF;',
    '  float a = vC.a * (vFill + (1.0 - vFill) * min(1.0, f * 1.7));',
    '  vec3 col = vC.rgb + (1.0 - vC.rgb) * f * vF * 0.55;',
    '  gl_FragColor = vec4(col * a, a * 0.2);',
    '}',
  ].join('\n');
  const SCAP = 24;
  class Spheres {
    constructor(scene) {
      const base = new THREE.SphereGeometry(1, 22, 14);
      const g = new THREE.InstancedBufferGeometry();
      g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('normal', base.attributes.normal);
      this.P = new Float32Array(SCAP * 3); this.R = new Float32Array(SCAP * 2); this.C = new Uint8ClampedArray(SCAP * 4);
      this.at = [dynAttr(g, 'iPos', this.P, 3, false, true), dynAttr(g, 'iRad', this.R, 2, false, true), dynAttr(g, 'iCol', this.C, 4, true, true)];
      g.instanceCount = 0;
      g.boundingSphere = new THREE.Sphere(new V3(), 1e6);
      this.geo = g;
      this.mat = new THREE.ShaderMaterial({ uniforms: { uFogR: FOG.uFogR }, vertexShader: SP_VS, fragmentShader: SP_FS, transparent: true, depthWrite: false, fog: false, blending: THREE.NormalBlending, premultipliedAlpha: true });
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
      scene.add(this.mesh);
      this.slots = [];
      for (let i = 0; i < SCAP; i++) { const q = { on: false, fresh: false, t: -0, dur: -0, x: -0, y: -0, z: -0, r: -0, color: 0xffffff, a: 0.6, fill: 0.5 }; q.dur = 1; q.r = 1; this.slots.push(q); }
      this.post = -1;
    }
    add(x, y, z, r, color, dur, a, fill) {
      let s = null;
      const SL = this.slots;
      for (let i = 0; i < SL.length; i++) if (!SL[i].on) { s = SL[i]; break; }
      if (!s) { let best = -1; for (let i = 0; i < SL.length; i++) { const c = SL[i], k = c.t / c.dur; if (k > best) { best = k; s = c; } } }
      s.on = true; s.fresh = !isPost(this); s.t = 0; s.dur = Math.max(0.03, dur); s.x = x; s.y = y; s.z = z; s.r = r; s.color = color; s.a = a; s.fill = fill;
    }
    update(dt) {
      this.post = -1;
      let n = 0;
      const SL = this.slots;
      for (let si = 0; si < SL.length; si++) {
        const s = SL[si];
        if (!s.on) continue;
        if (s.fresh) s.fresh = false; else s.t += dt;
        const k = s.t / s.dur;
        if (k >= 1) { s.on = false; continue; }
        const f = 1 - k, i3 = n * 3;
        this.P[i3] = s.x; this.P[i3 + 1] = s.y; this.P[i3 + 2] = s.z;
        // expands fast, the filled core thins into a bright shell as it fades
        this.R[n * 2] = s.r * (0.4 + 0.6 * Math.sqrt(k)); this.R[n * 2 + 1] = s.fill * f;
        const c = s.color, i4 = n * 4;
        this.C[i4] = (c >> 16) & 255; this.C[i4 + 1] = (c >> 8) & 255; this.C[i4 + 2] = c & 255; this.C[i4 + 3] = s.a * f * 255;
        n++;
      }
      this.geo.instanceCount = n;
      if (n) for (let i = 0; i < 3; i++) upload(this.at[i], n * this.at[i].itemSize);
    }
    clear() { for (const s of this.slots) s.on = false; this.geo.instanceCount = 0; }
    dispose() { this.geo.dispose(); this.mat.dispose(); }
  }

  // ======================= FX: projectile trails (+ the shared ribbon shader) =======================
  // Each trail keeps the last ~maxAge seconds of its projectile's path; the head is always exactly
  // at the projectile, the tail end is interpolated at exactly maxAge (so the length never pops) and
  // the ribbon tapers and fades toward it. When the projectile dies the trail detaches, ages out
  // and shrinks into the impact point. All trails share one dynamic buffer and one draw call.
  const R_VS = [
    'attribute vec4 tcol; attribute float side; uniform vec3 uColor; uniform float uOpacity; uniform vec2 uNear;', FOG_VS,
    'varying vec4 vC; varying float vS;',
    'void main(){',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  float z = max(0.05, -mv.z);',
    '  vC = vec4(tcol.rgb * uColor, tcol.a * uOpacity * smoothstep(uNear.x, uNear.y, z) * (1.0 - fogK(z))); vS = side;',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n');
  const R_FS = [
    'uniform float uOver; varying vec4 vC; varying float vS;',
    'void main(){',
    '  float e = abs(vS);',
    '  vec3 col = clamp(mix(vec3(dot(vC.rgb, vec3(0.3, 0.59, 0.11))), vC.rgb, 1.35), 0.0, 1.0);',
    '  col += (1.0 - col) * (1.0 - smoothstep(0.0, 0.5, e)) * 0.7;',
    '  float a = vC.a * (1.0 - e * e);',
    '  gl_FragColor = vec4(col * a, a * uOver);',
    '}',
  ].join('\n');
  // Soft-edged glowing ribbon material (same program as the trails, so it never compiles mid-game).
  // Geometry needs `position`, `tcol` (vec4, normalised bytes) and `side` (-1 / 1 across the strip).
  // over: how much it covers the background (0 = pure glow); near: [z0, z1] fade-in distance from the lens.
  function ribbonMat(color, opacity, over, near) {
    const c = color != null ? color : 0xffffff;
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new V3(cR(c), cG(c), cB(c)) }, uOpacity: { value: opacity != null ? opacity : 1 }, uOver: { value: over != null ? over : 0.15 },
        uNear: { value: new THREE.Vector2(near ? near[0] : 0.1, near ? near[1] : 0.45) }, uFogR: FOG.uFogR },
      vertexShader: R_VS, fragmentShader: R_FS, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.NormalBlending, premultipliedAlpha: true,
    });
  }
  const TCAP = 56, TP = 12;
  class Trails {
    constructor(scene) {
      const V = TCAP * TP * 2;
      this.pos = new Float32Array(V * 3); this.col = new Uint8ClampedArray(V * 4);
      const side = new Float32Array(V); for (let v = 0; v < V; v++) side[v] = (v & 1) ? 1 : -1;
      const idx = new Uint16Array(TCAP * (TP - 1) * 6);
      let k = 0;
      for (let t = 0; t < TCAP; t++) for (let i = 0; i < TP - 1; i++) { const a = (t * TP + i) * 2; idx[k++] = a; idx[k++] = a + 1; idx[k++] = a + 2; idx[k++] = a + 1; idx[k++] = a + 3; idx[k++] = a + 2; }
      const g = new THREE.BufferGeometry();
      this.aPos = dynAttr(g, 'position', this.pos, 3); this.aCol = dynAttr(g, 'tcol', this.col, 4, true);
      g.setAttribute('side', new THREE.BufferAttribute(side, 1));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0);
      g.boundingSphere = new THREE.Sphere(new V3(), 1e6);
      this.geo = g;
      // projectile trails fade near the lens: a shot whizzing past must not paint a band across the view
      this.mat = ribbonMat(0xffffff, 1, 0.4, [0.35, 2.2]);
      this.mesh = new THREE.Mesh(g, this.mat);
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; this.mesh.visible = false;
      scene.add(this.mesh);
      this.list = [];
      // (alpha a: -0 then 1 — a double field from the start, so the first fractional alpha changes no hidden class)
      for (let i = 0; i < TCAP; i++) { const o = { on: false, i, src: null, n: 0, x: new Float32Array(TP), y: new Float32Array(TP), z: new Float32Array(TP), t: new Float32Array(TP), color: 0xffffff, w: 0.1, max: 0.08, a: -0 }; o.a = 1; this.list.push(o); }
    }
    get(src, color, width, maxAge, alpha) {
      let tr = null;
      for (let i = 0; i < this.list.length; i++) if (!this.list[i].on) { tr = this.list[i]; break; }
      if (!tr) return null;
      tr.on = true; tr.src = src; tr.n = 1; tr.color = color; tr.w = width; tr.max = maxAge; tr.a = alpha != null ? alpha : 1;
      tr.x[0] = src.x; tr.y[0] = src.y; tr.z[0] = src.z; tr.t[0] = 0;
      return tr;
    }
    update(dt) {
      const cam = G.R.camera.position;
      let hi = -1;
      const list = this.list;
      for (let li = 0; li < list.length; li++) {
        const tr = list[li];
        if (!tr.on) continue;
        const X = tr.x, Y = tr.y, Z = tr.z, T = tr.t;
        for (let i = 0; i < tr.n; i++) T[i] += dt;
        if (tr.src) {
          // head follows the projectile; commit a history point when it has moved on enough
          const s = tr.src;
          T[0] = 0;
          const sgx = X[1] - s.x, sgy = Y[1] - s.y, sgz = Z[1] - s.z;
          const seg = tr.n > 1 ? Math.sqrt(sgx * sgx + sgy * sgy + sgz * sgz) : 1;   // (not Math.hypot: a built-in call that boxes)
          if (tr.n === 1 || seg > 0.35 || T[1] > 0.025) {
            const m = Math.min(tr.n, TP - 1);
            for (let i = m; i > 0; i--) { X[i] = X[i - 1]; Y[i] = Y[i - 1]; Z[i] = Z[i - 1]; T[i] = T[i - 1]; }
            tr.n = m + 1; T[1] = Math.max(T[1], 1e-4);
          }
          X[0] = s.x; Y[0] = s.y; Z[0] = s.z;
        } else if (T[0] >= tr.max) { tr.on = false; this._blank(tr); continue; }
        // drop history beyond maxAge, keeping one point past it to interpolate the tail end
        while (tr.n > 2 && T[tr.n - 2] >= tr.max) tr.n--;
        this._build(tr, cam);
        if (tr.i > hi) hi = tr.i;
      }
      this.geo.drawRange.count = (hi + 1) * (TP - 1) * 6;
      this.mesh.visible = hi >= 0;
      if (hi >= 0) { upload(this.aPos, (hi + 1) * TP * 6); upload(this.aCol, (hi + 1) * TP * 8); }
    }
    _build(tr, cam) {
      const X = tr.x, Y = tr.y, Z = tr.z, T = tr.t, P = this.pos, C = this.col, base = tr.i * TP * 2;
      let n = tr.n;
      // tail end exactly at maxAge
      let tx = X[n - 1], ty = Y[n - 1], tz = Z[n - 1], tt = T[n - 1];
      if (n >= 2 && T[n - 1] > tr.max) {
        const f = (tr.max - T[n - 2]) / Math.max(1e-5, T[n - 1] - T[n - 2]);
        tx = X[n - 2] + (X[n - 1] - X[n - 2]) * f; ty = Y[n - 2] + (Y[n - 1] - Y[n - 2]) * f; tz = Z[n - 2] + (Z[n - 1] - Z[n - 2]) * f; tt = tr.max;
      }
      const cr = (tr.color >> 16) & 255, cg = (tr.color >> 8) & 255, cb = tr.color & 255;
      let sx = 0, sy = 0, sz = 0;
      for (let i = 0; i < TP; i++) {
        const v = base + i * 2, p = v * 3, c = v * 4;
        if (i >= n) { // park unused vertices on the tail, invisible
          P[p] = P[p + 3] = tx; P[p + 1] = P[p + 4] = ty; P[p + 2] = P[p + 5] = tz;
          C[c + 3] = C[c + 7] = 0; continue;
        }
        const last = i === n - 1;
        const x = last ? tx : X[i], y = last ? ty : Y[i], z = last ? tz : Z[i], t = last ? tt : T[i];
        // tangent from neighbours, side vector facing the camera
        const j0 = i > 0 ? i - 1 : i, j1 = i < n - 1 ? i + 1 : i;
        const ax = (j0 === i ? x : X[j0]) - (j1 === n - 1 ? tx : X[j1]);
        const ay = (j0 === i ? y : Y[j0]) - (j1 === n - 1 ? ty : Y[j1]);
        const az = (j0 === i ? z : Z[j0]) - (j1 === n - 1 ? tz : Z[j1]);
        const vx = cam.x - x, vy = cam.y - y, vz = cam.z - z;
        let cx = ay * vz - az * vy, cy = az * vx - ax * vz, cz = ax * vy - ay * vx;
        const cl = Math.sqrt(cx * cx + cy * cy + cz * cz);
        if (cl > 1e-6) { cx /= cl; cy /= cl; cz /= cl; sx = cx; sy = cy; sz = cz; } else { cx = sx; cy = sy; cz = sz; }
        const u = Math.min(1, t / tr.max);
        const w = tr.w * 0.5 * Math.pow(1 - u, 0.4) * (i === 0 ? 0.85 : 1);
        P[p] = x - cx * w; P[p + 1] = y - cy * w; P[p + 2] = z - cz * w;
        P[p + 3] = x + cx * w; P[p + 4] = y + cy * w; P[p + 5] = z + cz * w;
        const al = tr.a * Math.pow(1 - u, 1.1) * 255;
        C[c] = C[c + 4] = cr; C[c + 1] = C[c + 5] = cg; C[c + 2] = C[c + 6] = cb; C[c + 3] = C[c + 7] = al;
      }
    }
    // A finished trail below the highest live one is still in the draw range: collapse it to a point
    // (zero area, no fill cost) as well as clearing its alpha.
    _blank(tr) {
      const C = this.col, P = this.pos, base = tr.i * TP * 2, x = tr.x[0], y = tr.y[0], z = tr.z[0];
      for (let i = 0; i < TP * 2; i++) { const v = base + i; C[v * 4 + 3] = 0; P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; }
      upload(this.aCol, TP * 8, base * 4); upload(this.aPos, TP * 6, base * 3);
    }
    clear() { for (const tr of this.list) { tr.on = false; tr.src = null; } this.geo.drawRange.count = 0; this.mesh.visible = false; }
    dispose() { this.geo.dispose(); this.mat.dispose(); }
  }

  // ======================= FX: decals =======================
  // Procedural splats on instanced quads: each instance gets its own wobbly outline and droplets
  // from a seed (kind 0, goo / ink), or a soft scorch-free dot with a bright rim (kind 1, impact
  // marks). Splats pop in with a little overshoot; marks fade out over their life; when the
  // persistent ring is full, the oldest splats fade away well before their slot is reused.
  const D_VS = [
    'attribute vec4 aCol; attribute vec2 aSd;', FOG_VS,
    'varying vec2 vUv; varying vec4 vC; varying vec2 vSd; varying float vFog;',
    'void main(){',
    '  vUv = position.xy * 2.0; vC = aCol; vSd = aSd;',
    '  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);',
    '  vFog = fogK(max(0.05, -mv.z));',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n');
  const D_FS = [
    'uniform vec3 uFog; varying vec2 vUv; varying vec4 vC; varying vec2 vSd; varying float vFog;',
    'void main(){',
    '  vec2 p = vUv; float r = length(p); float a; vec3 col = vC.rgb; float s = vSd.x;',
    '  if (vSd.y < 0.5) {',
    '    float an = atan(p.y, p.x);',
    '    float e = 0.56 + 0.07 * sin(an * 5.0 + s) + 0.05 * sin(an * 8.0 + s * 2.7) + 0.035 * sin(an * 13.0 + s * 5.1);',
    '    a = 1.0 - smoothstep(e - 0.035, e + 0.035, r);',
    '    for (int k = 0; k < 3; k++) {',
    '      float fk = float(k); float da = s * 1.7 + fk * 2.3;',
    '      vec2 c = vec2(cos(da), sin(da)) * (0.72 + 0.14 * fract(s * 3.1 + fk * 0.37));',
    '      float rr = 0.06 + 0.06 * fract(s * 7.3 + fk * 0.61);',
    '      a = max(a, 1.0 - smoothstep(rr - 0.03, rr + 0.03, length(p - c)));',
    '    }',
    '    col *= 0.9 + 0.16 * (1.0 - smoothstep(0.0, e, r));',
    '  } else {',
    '    a = (1.0 - smoothstep(0.55, 1.0, r)) * (0.55 + 0.45 * smoothstep(0.2, 0.75, r));',
    '  }',
    '  col = mix(col, uFog, vFog);',
    '  gl_FragColor = vec4(col, a * vC.a);',
    '}',
  ].join('\n');
  const MCAP = 64, DCAP = 176, DST = 12;
  class Decals {
    constructor(scene) {
      const CAP = this.cap = MCAP + DCAP;
      const base = new THREE.PlaneGeometry(1, 1);
      const g = new THREE.BufferGeometry();
      g.index = base.index; g.setAttribute('position', base.attributes.position);
      this.colA = new Uint8ClampedArray(CAP * 4); this.sdA = new Float32Array(CAP * 2);
      this.aCol = dynAttr(g, 'aCol', this.colA, 4, true, true); this.aSd = dynAttr(g, 'aSd', this.sdA, 2, false, true);
      this.mat = new THREE.ShaderMaterial({ uniforms: { uFog: FOG.uFog, uFogR: FOG.uFogR }, vertexShader: D_VS, fragmentShader: D_FS, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      const im = this.mesh = new THREE.InstancedMesh(g, this.mat, CAP);
      im.instanceMatrix.setUsage(DYN);
      im.instanceMatrix.array.fill(0);
      im.count = 0; im.frustumCulled = false; im.renderOrder = 1;
      scene.add(im);
      this.S = new Float32Array(CAP * DST); // x y z, nx ny nz, rot, size, alpha, age, life (<0 persistent), fade (<0 none)
      this.hot = new Uint8Array(CAP); this.list = new Int16Array(CAP); this.nl = 0;
      this.mNext = 0; this.dNext = 0; this.dFull = false; this.hi = -1; this.dirtyM = false;
    }
    add(pos, normal, color, size, alpha, life, kind) {
      let i;
      if (life > 0) { i = this.mNext; this.mNext = (this.mNext + 1) % MCAP; }
      else {
        i = MCAP + this.dNext; this.dNext = (this.dNext + 1) % DCAP;
        if (this.dNext === 0) this.dFull = true;
        if (this.dFull) { const j = MCAP + (this.dNext + 24) % DCAP; const S = this.S; if (S[j * DST + 11] < 0) { S[j * DST + 11] = 1.2; this._hot(j); } }
      }
      const S = this.S, o = i * DST;
      let nx = normal ? normal.x : 0, ny = normal ? normal.y : 1, nz = normal ? normal.z : 0;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      S[o] = pos.x + nx * 0.02; S[o + 1] = pos.y + ny * 0.02; S[o + 2] = pos.z + nz * 0.02;
      S[o + 3] = nx; S[o + 4] = ny; S[o + 5] = nz; S[o + 6] = Math.random() * TAU; S[o + 7] = size;
      S[o + 8] = alpha; S[o + 9] = 0; S[o + 10] = life > 0 ? life : -1; S[o + 11] = -1;
      const c = i * 4; color = color | 0;
      this.colA[c] = (color >> 16) & 255; this.colA[c + 1] = (color >> 8) & 255; this.colA[c + 2] = color & 255; this.colA[c + 3] = 0;
      this.sdA[i * 2] = Math.random() * 40; this.sdA[i * 2 + 1] = kind || 0;
      upload(this.aSd, 2, i * 2);
      if (i > this.hi) { this.hi = i; this.mesh.count = i + 1; }
      this._hot(i);
    }
    _hot(i) { if (!this.hot[i]) { this.hot[i] = 1; this.list[this.nl++] = i; } }
    update(dt) {
      if (!this.nl) return;
      const S = this.S, M = this.mesh.instanceMatrix.array, C = this.colA;
      let w = 0, lo = this.cap, top = -1;
      for (let k = 0; k < this.nl; k++) {
        const i = this.list[k], o = i * DST;
        if (i < lo) lo = i; if (i > top) top = i;
        const age = S[o + 9] += dt;
        let sc = 1, al = S[o + 8], keep = false;
        if (age < 0.16) { sc = 0.55 + 0.45 * easeOutBack(age / 0.16); al *= Math.min(1, age / 0.05); keep = true; }
        const life = S[o + 10];
        if (life > 0) { const f = 1 - age / life; if (f <= 0) { al = 0; sc = 0; } else { al *= Math.min(1, f / 0.4); keep = true; } }
        const fade = S[o + 11];
        if (fade >= 0) { const nf = fade - dt; S[o + 11] = nf; if (nf <= 0) { al = 0; sc = 0; S[o + 11] = -1; S[o + 8] = 0; } else { al *= nf / 1.2; keep = true; } }
        this._matrix(M, i, o, sc);
        C[i * 4 + 3] = al * 255;
        if (keep) this.list[w++] = i; else this.hot[i] = 0;
      }
      this.nl = w;
      // only the span of slots that changed (marks live in the low slots, splats above them)
      upload(this.mesh.instanceMatrix, (top - lo + 1) * 16, lo * 16);
      upload(this.aCol, (top - lo + 1) * 4, lo * 4);
    }
    _matrix(M, i, o, sc) {
      const S = this.S, nx = S[o + 3], ny = S[o + 4], nz = S[o + 5], s = S[o + 7] * 2.2 * sc, r = S[o + 6];
      // tangent basis from the normal, rolled by r
      let tx, ty, tz;
      if (Math.abs(ny) < 0.95) { tx = nz; ty = 0; tz = -nx; } else { tx = 0; ty = -nz; tz = ny; }
      const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
      const c = Math.cos(r), sn = Math.sin(r);
      const ux = tx * c + bx * sn, uy = ty * c + by * sn, uz = tz * c + bz * sn;
      const vx = bx * c - tx * sn, vy = by * c - ty * sn, vz = bz * c - tz * sn;
      const m = i * 16;
      M[m] = ux * s; M[m + 1] = uy * s; M[m + 2] = uz * s; M[m + 3] = 0;
      M[m + 4] = vx * s; M[m + 5] = vy * s; M[m + 6] = vz * s; M[m + 7] = 0;
      M[m + 8] = nx; M[m + 9] = ny; M[m + 10] = nz; M[m + 11] = 0;
      M[m + 12] = S[o]; M[m + 13] = S[o + 1]; M[m + 14] = S[o + 2]; M[m + 15] = 1;
    }
    clear() {
      // zero every slot too: the next add raises count past the mark ring, which would otherwise show old marks again
      this.mesh.count = 0; this.hi = -1; this.nl = 0; this.hot.fill(0); this.mNext = this.dNext = 0; this.dFull = false;
      this.mesh.instanceMatrix.array.fill(0); this.colA.fill(0); this.S.fill(0);
      for (const a of [this.mesh.instanceMatrix, this.aCol]) { a.updateRanges.length = 0; a.needsUpdate = true; } // full upload
    }
    // InstancedMesh.dispose releases the instance-matrix buffer (geometry.dispose does not).
    dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.dispose(); }
  }

  // ======================= FX =======================
  const CONFETTI = [0xff6b8b, 0xffd23f, 0x3fe0b8, 0x33b5ff, 0x8f6bff];
  // Reusable option objects / colour lists for the helpers below (no allocation per hit).
  const O_SPK = { grav: 14, drag: 3.5, shape: SH.streak, curve: CV.spark, hot: 0.6, dir: null, spread: 0.7 }, A_SPK = [0, 0xffffff, 0];
  const O_CNF = { normal: true, shape: SH.chip, curve: CV.flat, grav: 7, drag: 2.0, up: 3.5, spin: 14, ground: true, lifeVar: 0.35 };
  const O_PUF = { normal: true, alpha: 0.5, shape: SH.puff, curve: CV.grow, grav: -0.6, drag: 3, dir: null, spread: 0.9, hot: 0 };
  const O_SPA = { shape: SH.star, curve: CV.pop, grav: -0.5, drag: 2.5, spin: 3, hot: 0.4, sizeVar: 0.4 }, A_SPA = [0, 0xffffff];
  const O_DEB = { normal: true, shape: SH.chip, curve: CV.flat, grav: 16, drag: 0.8, up: 2.5, spin: 18, ground: true };
  const O_IMP = { dir: null, scale: 1, life: 0.28 };
  const O_EX1 = { shape: SH.streak, curve: CV.spark, grav: 12, drag: 3, hot: 0.7 }, A_EX1 = [0, 0xffe28a, 0xffffff];
  const O_EX2 = { shape: SH.glow, grav: -1.4, drag: 2, hot: 0.5, lifeVar: 0.4 }, A_EX2 = [0xffd23f, 0, 0xfff1c0];
  const O_EX3 = { normal: true, shape: SH.chip, curve: CV.flat, grav: 13, drag: 1.4, up: 2.5, spin: 16, ground: true }, A_EX3 = [0, 0xffffff, 0xffd23f, 0xff6b8b, 0x33b5ff, 0x8f6bff];
  const O_SMK = { size: 1, spread: 0, rise: 0.8, life: 1.15, end: 0xe4e0ee, alpha: 0.72 }, O_SPH = { alpha: 0.6, fill: 0.5 };
  class FX {
    constructor(world) {
      this.world = world;
      this.add = new PSys(world.scene, true, 1800);
      this.norm = new PSys(world.scene, false, 1400);
      this.quads = new Quads(world.scene);
      this.spheres = new Spheres(world.scene);
      this.trails = new Trails(world.scene);
      this.decals = new Decals(world.scene);
      this.live = [];       // timed meshes {obj, t, dur, update(k)}
      // quad() for per-frame loops elsewhere: write the 16 values (see QA) into fx.QA and call fx.quadQA() — no double
      // argument is boxed on the way
      this.QA = QA;
      this.trauma = -0; this._shk = -0;   // (doubles from the start: see the Actor note in 10_world)
      this.q = G.R.q().particles;
      this._ib = 8;         // heavy impact layers left this frame (flash / puff / mark)
      this._pp = 6;         // pickup pops left this frame
      // real floor under a settling particle (looked up once, when it first reaches its burst's floor)
      this.add.ground = this.norm.ground = (x, z, y) => (world.phys ? world.phys.groundAt(x, z, 0.05, y + 0.6) + 0.03 : GY_NONE);
      // world updaters run first in world.update: from here until FX.update, effects are "pre-update"
      // (also when a sim helper steps the world several times in one frame)
      if (world.onUpdate) world.onUpdate(() => { this.add.post = this.norm.post = this.quads.post = this.spheres.post = -1; });
    }
    // ---- particles
    // Low-level spawn: additive glowing particle by default. opts: {normal, grav, drag, alpha, shape
    // ('glow'|'streak'|'star'|'chip'|'blob'|'puff'|'ring'), curve ('shrink'|'grow'|'pop'|'flat'|'spark'),
    // end (colour at end of life), hot (white-hot start 0..1), spin (rad/s), ground (settle on the floor)}
    spawn(pos, vel, color, size, life, opts) {
      opts = opts || NO;
      const sys = opts.normal ? this.norm : this.add;
      sys.add(pos.x, pos.y, pos.z, vel.x, vel.y, vel.z, color, size, life, opts.grav, opts.drag, opts.alpha,
        opts.shape != null ? shapeId(opts.shape) : undefined, opts.curve != null ? curveId(opts.curve) : 0,
        opts.end != null ? opts.end : -1, opts.hot, opts.spin, opts.ground ? this._ground(pos) : undefined);
    }
    // Burst of n (× particle quality) from pos. Default look: fast small additive bits streak, slow
    // ones glow; alpha-blended bits are glossy blobs (soft puffs when translucent). opts: as spawn plus
    // {up (extra upward speed), dir (bias direction, unit), spread (0 = along dir .. 1 = all round),
    // sizeVar, lifeVar}.
    burst(pos, color, n, speed, size, life, opts) {
      opts = opts || NO;
      n = Math.max(1, Math.round(n * this.q));
      const normal = !!opts.normal, sys = normal ? this.norm : this.add;
      const alpha = opts.alpha;
      const shape = opts.shape != null ? shapeId(opts.shape) : (normal ? ((alpha != null && alpha < 0.8) ? SH.puff : SH.blob) : (speed >= 5 && size <= 0.26 ? SH.streak : SH.glow));
      const curve = opts.curve != null ? curveId(opts.curve) : 0;
      const hot = opts.hot != null ? opts.hot : (normal ? 0 : 0.3);
      const grav = opts.grav != null ? opts.grav : 9, drag = opts.drag != null ? opts.drag : 2.5;
      const end = opts.end != null && opts.end >= 0 ? opts.end : -1, spin = opts.spin || 0;
      const gyv = opts.ground ? this._ground(pos) : GY_NONE, a0 = alpha != null ? alpha : 1;
      const dir = opts.dir, spread = opts.spread != null ? opts.spread : 0.7;
      const isArr = Array.isArray(color);
      const sv = opts.sizeVar != null ? opts.sizeVar : 0.3, lv = opts.lifeVar != null ? opts.lifeVar : 0.3;
      for (let i = 0; i < n; i++) {
        if (dir) {
          _d.set(U.rand(-1, 1), U.rand(-1, 1), U.rand(-1, 1)).normalize().multiplyScalar(spread).add(dir).normalize();
        } else _d.set(U.rand(-1, 1), U.rand(-0.2, 1), U.rand(-1, 1)).normalize();
        _d.multiplyScalar(speed * U.rand(0.35, 1));
        if (opts.up) _d.y = Math.abs(_d.y) + opts.up;
        PA[0] = pos.x; PA[1] = pos.y; PA[2] = pos.z; PA[3] = _d.x; PA[4] = _d.y; PA[5] = _d.z;
        PA[6] = (isArr ? U.pick(color) : color) | 0; PA[7] = size * U.rand(1 - sv, 1 + sv); PA[8] = life * U.rand(1 - lv * 1.33, 1 + lv * 0.66);
        PA[9] = grav; PA[10] = drag; PA[11] = a0; PA[12] = shape; PA[13] = curve; PA[14] = end; PA[15] = hot; PA[16] = spin ? U.rand(-spin, spin) : 0; PA[17] = gyv;
        sys.addPA();
      }
    }
    // Hot sparks; o: {dir (spray around this unit vector), scale, life}
    sparks(pos, color, n, o) {
      o = o || NO;
      const s = o.scale || 1;
      A_SPK[0] = A_SPK[2] = color; O_SPK.dir = o.dir || null; O_SPK.spread = o.dir ? 0.8 : 0.7;
      this.burst(pos, A_SPK, n || 10, 7.5 * Math.sqrt(s), 0.065 * s, o.life || 0.32, O_SPK);
      O_SPK.dir = null;
    }
    // Soft toon smoke that swells and drifts up. o: {size, spread (spawn radius), rise, life, end}
    smoke(pos, n, color, o) {
      o = o || NO;
      n = Math.max(1, Math.round((n || 6) * this.q));
      const c0 = color || 0xe8e4f4, c1 = o.end != null ? o.end : mixHex(c0, 0xf4f2fa, 0.5);
      const sz = o.size || 0.9, sp = o.spread || 0, rise = o.rise != null ? o.rise : 0.9, life = o.life || 1.0;
      const al = o.alpha || 0.62;
      for (let i = 0; i < n; i++) {
        _d.set(U.rand(-1, 1), U.rand(-0.3, 1), U.rand(-1, 1)).normalize();
        PA[0] = pos.x + _d.x * sp * Math.random(); PA[1] = pos.y + _d.y * sp * Math.random(); PA[2] = pos.z + _d.z * sp * Math.random();
        PA[3] = _d.x * 2.2 * U.rand(0.35, 1); PA[4] = _d.y * 1.4 + rise; PA[5] = _d.z * 2.2 * U.rand(0.35, 1); PA[6] = c0; PA[7] = sz * U.rand(0.7, 1.3); PA[8] = life * U.rand(0.7, 1.4);
        PA[9] = -0.9; PA[10] = 2.2; PA[11] = al; PA[12] = SH.puff; PA[13] = CV.grow; PA[14] = c1; PA[15] = 0; PA[16] = U.rand(-0.6, 0.6); PA[17] = GY_NONE;
        this.norm.addPA();
      }
    }
    // Party confetti: tumbling chips that flutter down and settle on the floor.
    confetti(pos, n, o) {
      o = o || NO;
      this.burst(pos, o.colors || CONFETTI, n || 40, o.speed || 9, 0.2, 2.0, O_CNF);
    }
    // Dust kicked off a surface (soft puffs along `dir`).
    puff(pos, color, n, size, dir) {
      O_PUF.dir = dir || null;
      this.burst(pos, color, n || 3, 1.6, size || 0.35, 0.55, O_PUF);
      O_PUF.dir = null;
    }
    // Twinkling four-point stars.
    sparkle(pos, color, n, size) {
      A_SPA[0] = color;
      this.burst(pos, A_SPA, n || 4, 2.2, size || 0.3, 0.5, O_SPA);
    }
    // Chunky toon bits that bounce on the floor.
    debris(pos, colors, n, speed) {
      this.burst(pos, colors, n || 8, speed || 6, 0.16, 1.1, O_DEB);
    }
    _ground(pos) { const w = this.world; return w.phys ? w.phys.groundAt(pos.x, pos.z, 0.1, pos.y + 0.5) + 0.03 : GY_NONE; }
    // ---- timed meshes (generic): obj is added to the scene, update(k, obj, dt) each frame, removed
    // (and its non-shared material disposed) after dur.
    timed(obj, dur, update) { this.world.scene.add(obj); const e = { obj, t: -0, dur: -0, update }; e.dur = dur; this.live.push(e); return obj; }
    // ---- quads
    // One-frame glow (re-issue every frame). dir + len: stretched along dir. ov: cover amount.
    glow(pos, color, size, alpha, dir, len, ov) { QA[8] = size; QA[9] = len; QA[12] = alpha != null ? alpha : 1; QA[15] = ov || 0; this.glowQA(pos, color, dir); }
    // glow() for the per-frame loops: size, len, alpha and ov already in QA[8], QA[9], QA[12], QA[15] (no double argument)
    glowQA(pos, color, dir) {
      const size = QA[8], len = QA[9];
      QA[1] = QS.glow; QA[2] = pos.x; QA[3] = pos.y; QA[4] = pos.z; QA[10] = 0; QA[11] = color; QA[13] = 0; QA[14] = 0;
      const l = dir && len > size ? dir.length() : 0;
      if (l > 1e-6) { QA[0] = QM.axis; QA[5] = dir.x / l; QA[6] = dir.y / l; QA[7] = dir.z / l; QA[9] = len; }
      else { QA[0] = QM.bill; QA[5] = 0; QA[6] = 1; QA[7] = 0; QA[9] = size; }
      this.quads.pushQA();
    }
    // One-frame raw quad: mode 'bill'|'axis'|'plane', shape 'glow'|'star'|'ring'|'tracer'|'beam'|'disk';
    // ov = how much it covers the background (0 = pure glow).
    quad(mode, shape, pos, dir, w, h, rot, color, alpha, p1, p2, ov) {
      const d = dir || UPV;
      QA[0] = typeof mode === 'string' ? QM[mode] : mode; QA[1] = typeof shape === 'string' ? QS[shape] : shape;
      QA[2] = pos.x; QA[3] = pos.y; QA[4] = pos.z; QA[5] = d.x; QA[6] = d.y; QA[7] = d.z; QA[8] = w; QA[9] = h; QA[10] = rot || 0;
      QA[11] = color; QA[12] = alpha != null ? alpha : 1; QA[13] = p1 || 0; QA[14] = p2 || 0; QA[15] = ov || 0;
      this.quads.pushQA();
    }
    quadQA() { this.quads.pushQA(); }
    // Flashes = Softer (G.Motion.flash(), also set by Reduced motion): big flashes at 60% strength.
    flash(pos, color, size, dur) {
      const s = this.quads.slot(QT.flash, dur || 0.12); if (!s) return null;
      s.x = pos.x; s.y = pos.y; s.z = pos.z; s.s = size; s.color = color; s.a = G.Motion ? G.Motion.flash() : 1;
      return s;
    }
    // Muzzle flash: starburst + core, random roll and scale. o: {aspect, alpha}
    muzzle(pos, color, size, dur, o) {
      const s = this.quads.slot(QT.muzzle, dur || 0.06); if (!s) return null;
      s.x = pos.x; s.y = pos.y; s.z = pos.z; s.s = size * U.rand(0.85, 1.25); s.color = color; s.rot = Math.random() * TAU; s.w = o && o.aspect || 1; s.a = o && o.alpha != null ? o.alpha : 1;
      return s;
    }
    // Flat ring expanding over the ground (or on the plane with normal o.normal).
    ring(pos, radius, color, dur, y, o) {
      const s = this.quads.slot(QT.ring, dur || 0.4); if (!s) return null;
      s.x = pos.x; s.y = y != null ? y : pos.y; s.z = pos.z; s.s = radius; s.color = color; s.a = o && o.alpha != null ? o.alpha : 0.9;
      const n = o && o.normal; if (n) { s.dx = n.x; s.dy = n.y; s.dz = n.z; } else { s.dx = 0; s.dy = 1; s.dz = 0; }
      s.rot = Math.random() * TAU;
      return s;
    }
    // Camera-facing shockwave ring.
    shock(pos, radius, color, dur, alpha) {
      const s = this.quads.slot(QT.shock, dur || 0.3); if (!s) return null;
      s.x = pos.x; s.y = pos.y; s.z = pos.z; s.s = radius; s.color = color; s.a = alpha != null ? alpha : 0.85;
      return s;
    }
    // Soft glow that swells and fades.
    pop(pos, color, size, dur, alpha) {
      const s = this.quads.slot(QT.pop, dur || 0.2); if (!s) return null;
      s.x = pos.x; s.y = pos.y; s.z = pos.z; s.s = size; s.color = color; s.a = alpha != null ? alpha : 0.8;
      return s;
    }
    sphereFlash(pos, radius, color, dur, o) {
      const fk = G.Motion ? G.Motion.flash() : 1;   // softer flashes: the fireball bubble is fainter too
      this.spheres.add(pos.x, pos.y, pos.z, radius, color, dur || 0.25, (o && o.alpha != null ? o.alpha : 0.62) * (fk < 1 ? 0.7 : 1), o && o.fill != null ? o.fill : 0.5);
    }
    // Tapered tracer from → to whose tail chases the head as it fades. o: {retract 0..1 (default 0.85)}
    tracer(from, to, color, width, dur, o) {
      const L = from.distanceTo(to); if (L < 0.05) return null;
      const s = this.quads.slot(QT.tracer, dur || 0.08); if (!s) return null;
      s.x = to.x; s.y = to.y; s.z = to.z; s.x2 = from.x; s.y2 = from.y; s.z2 = from.z;
      s.w = (width || 0.06) * 1.6; s.color = color; s.a = 1; s.p = o && o.retract != null ? o.retract : 0.85; s.ov = o && o.over != null ? o.over : 0.35;
      return s;
    }
    // ---- composites
    // Explosion: white-hot flash, fireball bubble, shockwave + ground ring, sparks, embers, confetti
    // debris and soft smoke. o: {noSmoke, noDebris, sfx:false}
    explosion(pos, radius, color, o) {
      color = color || 0xffa53d; o = o || NO;
      const r = Math.max(0.5, radius), big = Math.min(2.2, r / 2.5);
      this.flash(pos, mixHex(color, 0xfff6e0, 0.6), r * 2.4, 0.15);
      O_SPH.alpha = 0.55; O_SPH.fill = 0.5;
      this.sphereFlash(pos, r * 1.05, mixHex(color, 0xffe9b0, 0.3), 0.32, O_SPH);
      this.shock(pos, r * 1.9, mixHex(color, 0xffffff, 0.45), 0.34, 0.75);
      const gy = this._ground(pos);
      if (gy > GY_NONE && pos.y - gy < r * 1.2) this.ring(_e.set(pos.x, gy + 0.06, pos.z), r * 1.55, color, 0.5, undefined, { alpha: 0.8 });
      A_EX1[0] = color; A_EX2[1] = color; A_EX3[0] = color;
      this.burst(pos, A_EX1, Math.round(14 + 4 * big), r * 6.5, 0.09, 0.42, O_EX1);
      this.burst(pos, A_EX2, Math.round(4 + 2 * big), r * 1.6, 0.16, 1.1, O_EX2);
      if (!o.noDebris) this.burst(pos, A_EX3, Math.round(8 + 4 * big), r * 3.4, 0.24, 1.4, O_EX3);
      O_SMK.size = 0.7 + r * 0.38; O_SMK.spread = r * 0.45;
      if (!o.noSmoke) this.smoke(pos, Math.round(5 + 2 * big), mixHex(color, 0xc4bcd8, 0.62), O_SMK);
      if (G.Audio && o.sfx !== false) G.Audio.sfxAt('explode', pos, { size: radius });
    }
    // Layered hit: flash, sparks (+ dust puff and a fading mark on surfaces); crits add sparkles and
    // a shock ring. Heavy layers are budgeted per frame so a shotgun blast stays cheap.
    // o: {actor (hit a body), crit, scale, mark:false, puff:false}
    impact(pos, normal, color, o) {
      o = o || NO;
      let s = o.scale || 1;
      const crit = !!o.crit, actor = !!o.actor;
      const n = normal || UPV;
      // hits right at the lens (shots landing on the local player) keep only a few small sparks
      const cam = G.R.camera && G.R.camera.position, near = cam ? cam.distanceToSquared(pos) < 2.6 : false;
      if (near) s *= 0.5;
      const heavy = !near && this._ib > 0; if (heavy) this._ib--;
      if (actor) {
        if (heavy) this.flash(pos, mixHex(color, 0xffffff, 0.5), (crit ? 1.15 : 0.6) * s, crit ? 0.13 : 0.09);
        O_IMP.dir = n; O_IMP.scale = s * (crit ? 1.25 : 1); O_IMP.life = 0.28;
        this.sparks(pos, color, Math.round((crit ? 9 : 5) + 2 * s), O_IMP);
        if (crit && !near) {
          this.sparkle(pos, 0xffe066, 3, 0.34 * s);
          if (heavy) this.shock(pos, 0.75 * s, 0xfff1a8, 0.2, 0.9);
        }
      } else {
        if (heavy) this.flash(pos, mixHex(color, 0xffffff, 0.4), 0.42 * s, 0.07);
        O_IMP.dir = n; O_IMP.scale = s * 0.85; O_IMP.life = 0.26;
        this.sparks(pos, color, Math.round(3 + 2 * s), O_IMP);
        if (heavy && o.puff !== false) this.puff(_e.copy(pos).addScaledVector(n, 0.08), mixHex(0xf3ece0, color, 0.22), 2, 0.3 * s, n);
        if (heavy && o.mark !== false && !(this.world.rules && this.world.rules.paint)) this.decals.add(pos, n, mixHex(color, 0xffffff, 0.15), (0.14 + 0.05 * Math.random()) * Math.sqrt(s), 0.6, 4.5, 1);
      }
    }
    // Flat splat on a surface (ink, goo). opacity (default 0.93); o.life → fades away after life s.
    decal(pos, normal, color, size, opacity, o) {
      this.decals.add(pos, normal, color, size, opacity != null ? opacity : 0.93, o && o.life ? o.life : 0, 0);
      return null;
    }
    // Small fading mark (bullet scuff in the shot's colour).
    mark(pos, normal, color, size, alpha) { this.decals.add(pos, normal, color, size, alpha != null ? alpha : 0.6, 4.5, 1); }
    // Ribbon trail following `src` (a Vector3 updated by its owner, e.g. a projectile's pos).
    // Returns a handle for trailEnd(), or null when the pool is full.
    trail(src, color, width, maxAge, alpha) { return this.trails.get(src, color, width, maxAge, alpha); }
    // Detach: the head jumps to the source's final position first (a projectile has just been moved
    // onto its impact point, after this frame's trail update), so the ribbon ends exactly there.
    trailEnd(tr) { if (tr && tr.src) { tr.x[0] = tr.src.x; tr.y[0] = tr.src.y; tr.z[0] = tr.src.z; tr.src = null; } }
    // Collect pop for pickups (rate-limited per frame).
    pickupPop(pos, color, big) {
      if (this._pp <= 0) return; this._pp--;
      this.pop(pos, color, big ? 1.3 : 0.75, big ? 0.24 : 0.16, 0.85);
      this.sparkle(pos, color, big ? 5 : 2, big ? 0.36 : 0.24);
      if (big) this.shock(pos, 0.9, mixHex(color, 0xffffff, 0.4), 0.22, 0.8);
    }
    // Screen shake setting 0..1 (G.Motion.shake(); Reduced motion sets 10%). The camera offset grows with
    // trauma² (12_player), so requests scale by the square root: the setting maps linearly onto the shake
    // amplitude, and 10% matches the old reduced-motion factor (×0.3 per request).
    shake(amount) {
      const k = G.Motion ? G.Motion.shake() : 1;
      if (!(k > 0) || !(amount > 0)) return;
      this._shk = Math.min(1, this._shk + amount * (k < 1 ? Math.sqrt(k) : 1));
    }
    update(dt) {
      this.q = G.R.q().particles;
      this._ib = 8; this._pp = 6;
      refreshShared(this.world.scene);
      for (let i = this.live.length - 1; i >= 0; i--) {
        const l = this.live[i];
        l.t += dt;
        const k = Math.min(1, l.t / l.dur);
        if (l.update) l.update(k, l.obj, dt);
        if (k >= 1) { this.world.scene.remove(l.obj); if (l.obj.material && !l.obj.material.userData.shared) l.obj.material.dispose(); this.live.splice(i, 1); }
      }
      this.add.update(dt); this.norm.update(dt);
      this.quads.update(dt); this.spheres.update(dt); this.trails.update(dt); this.decals.update(dt);
      this.add.post = this.norm.post = this.quads.post = this.spheres.post = G.time.frame;
      // Trauma: requests accumulate into a target that the shake rises to over ~2-3 frames (no
      // single-frame jolt, measured on real time so the jolt lands with a hit-stop freeze; the target
      // holds meanwhile, so the requested peak is reached), then it decays on game time: big shakes
      // faster, the tail eases out.
      if (this._shk > this.trauma + 0.02) {
        const rdt = Math.max(dt, Math.min(0.05, G.time.realDt || 0));
        this.trauma += (this._shk - this.trauma) * (1 - Math.exp(-90 * rdt));
      } else {
        this._shk = Math.max(0, this._shk - dt * (0.9 + 1.2 * this._shk));
        this.trauma = this._shk;
      }
    }
    clear() { this.add.clear(); this.norm.clear(); this.quads.clear(); this.spheres.clear(); this.trails.clear(); this.decals.clear(); }
    dispose() { this.add.dispose(); this.norm.dispose(); this.quads.dispose(); this.spheres.dispose(); this.trails.dispose(); this.decals.dispose(); }
  }
  FX.SH = SH; FX.CV = CV; FX.QS = QS; FX.QM = QM;
  FX.ribbonMaterial = ribbonMat;
  FX.mixHex = mixHex;
  G.FX = FX;

  // ======================= Projectiles =======================
  const projGeo = {
    orb: new THREE.SphereGeometry(1, 10, 8),
    bolt: new THREE.CapsuleGeometry(0.5, 2.4, 3, 8).rotateX(Math.PI / 2),
    disc: new THREE.CylinderGeometry(1, 1, 0.25, 16),
    rocket: new THREE.ConeGeometry(0.6, 2.2, 8).rotateX(-Math.PI / 2),
    grenade: new THREE.IcosahedronGeometry(1, 1),
    needle: new THREE.CylinderGeometry(0.25, 0.25, 3, 6).rotateX(Math.PI / 2),
    ink: new THREE.SphereGeometry(1, 8, 6),
    star: new THREE.OctahedronGeometry(1, 0),
  };
  for (const k in projGeo) projGeo[k].userData.shared = true;
  G.projGeo = projGeo;
  // Kinds that draw a ribbon trail (others leave droplets / bubbles).
  const RIBBON = { bolt: 1, needle: 1, orb: 1, disc: 1, rocket: 1, star: 1 };
  const O_BNC = { dir: null, scale: 0.7 };
  // reused impact options (no allocation per hit); O_AIR: a fuse running out in mid-air (no surface
  // to mark or kick dust from)
  const O_HITA = { actor: true, crit: false, scale: 1 }, O_HITW = { scale: 0.9 }, O_AIR = { scale: 0.9, mark: false, puff: false };
  const _n = new V3();

  class Projectiles {
    constructor(world) {
      this.world = world; this.list = []; this.pool = {};
      // Glow projectiles draw with an untextured, fog-free additive material that some scenes have nothing else of
      // (the Fizzport practice range): a hidden stand-in lets the load warm-up compile that program before the first
      // shot (programs go by parameters, so one colour covers every glow projectile).
      if (world && world.scene && G.M && G.M.glowMat) {
        const m = new THREE.Mesh(projGeo.orb, G.M.glowMat(0x7ff3ff, 0.95));
        m.name = 'projPrewarm'; m.visible = false; m.frustumCulled = false; m.position.set(0, -400, 0);
        world.scene.add(m);
      }
    }
    _mesh(kind, color, size) {
      const key = kind + '|' + color;
      const pool = this.pool[key] || (this.pool[key] = []);
      let m = pool.pop();
      if (!m) {
        const solid = kind === 'grenade' || kind === 'rocket' || kind === 'disc' || kind === 'ink';
        m = new THREE.Mesh(projGeo[kind] || projGeo.orb, solid ? G.M.toon(color, { emissive: color, ei: kind === 'ink' ? 0.25 : 0.5 }) : G.M.glowMat(color, 0.95));
        // Glow halos are drawn through the shared FX quad batch (no extra draw call).
        m.userData.glow = !solid;
        m.userData.key = key;
      }
      m.scale.setScalar(size);
      m.visible = true;
      this.world.scene.add(m);
      return m;
    }
    // See header for opts. Extra: ribbon (true/false: force the ribbon trail on or off).
    spawn(o) {
      const p = {
        pos: o.pos.clone(), vel: o.vel ? o.vel.clone() : o.dir.clone().normalize().multiplyScalar(o.speed || 40),
        grav: -0, life: -0, r: -0,
        dmg: -0, src: o.src || null, team: o.team != null ? o.team : (o.src ? o.src.team : 1),
        aoe: -0, aoeDmg: -0, knock: -0,
        color: o.color || 0x7ff3ff, kind: o.kind || 'orb', bounce: o.bounce || 0, homing: -0, pierce: o.pierce || 0,
        fuse: !!o.fuse, onHit: o.onHit || null, onTick: o.onTick || null, trail: o.trail !== false, crit: -0, weapon: o.weapon || null,
        hitSet: null, spin: -0, stick: !!o.stick, age: -0, data: o.data || {}, slow: o.slow || null, dot: o.dot || null, paint: o.paint || null,
        noActors: !!o.noActors, grow: -0, tr: null, dripT: -0, mesh: null, baseSize: -0,   // (every field in the literal: one hidden class)
      };
      // (the number fields are created as doubles (-0) and filled in here: weapons pass whole numbers and fractions alike,
      // and a small-integer field that later takes a fraction changes representation — every projectile's hidden class
      // would be replaced mid-fight; see the Actor note in 10_world)
      p.grav = o.gravity || 0; p.life = o.life != null ? o.life : 3; p.r = o.radius != null ? o.radius : 0.15;
      p.dmg = o.damage || 0; p.aoe = o.aoe || 0; p.aoeDmg = o.aoeDmg != null ? o.aoeDmg : (o.damage || 0); p.knock = o.knock || 0;
      p.homing = o.homing || 0; p.crit = o.crit || 1; p.spin = o.spin || 0; p.grow = o.grow || 0; p.baseSize = o.size || 0.12;
      p.mesh = this._mesh(p.kind, p.color, o.size || 0.12);
      p.mesh.position.copy(p.pos);
      if (p.vel.lengthSq() > 0) p.mesh.lookAt(_a.copy(p.pos).add(p.vel));
      if (RIBBON[p.kind] && (o.ribbon === true || (o.ribbon !== false && p.trail))) {
        const sp = Math.max(4, p.vel.length());
        p.tr = this.world.fx.trail(p.pos, p.color, U.clamp(p.baseSize * 1.9, 0.08, p.team === 0 ? 0.36 : 0.26), U.clamp(3.4 / sp, 0.05, 0.18), p.team === 0 ? 0.9 : 1);
      }
      this.list.push(p);
      return p;
    }
    _kill(i) {
      const p = this.list[i];
      if (p.tr) { this.world.fx.trailEnd(p.tr); p.tr = null; }
      this.world.scene.remove(p.mesh);
      (this.pool[p.mesh.userData.key] || (this.pool[p.mesh.userData.key] = [])).push(p.mesh);
      this.list.splice(i, 1);
    }
    detonate(p) {
      const w = this.world;
      if (p.aoe > 0) w.explode(p.pos.clone(), p.aoe, p.aoeDmg, { src: p.src, color: p.color, knock: p.knock || 7, weapon: p.weapon, noSelf: true });
      // (own scratch vector: burst() overwrites _d while it reads the spray direction)
      else w.fx.impact(p.pos, p.vel.lengthSq() > 1e-8 ? _n.copy(p.vel).normalize().negate() : _n.set(0, 1, 0), p.color, O_AIR);
    }
    update(dt) {
      const w = this.world, fx = w.fx;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.age += dt; p.life -= dt;
        if (p.onTick) p.onTick(p, dt, w);
        if (p.life <= 0) { if (p.fuse || p.aoe > 0) this.detonate(p); this._kill(i); continue; }
        if (p.homing > 0) {
          const t = w.nearestEnemy ? w.nearestEnemy(p.pos, 30, p.team) : w.enemiesNear(p.pos, 30, p.team)[0];
          if (t) {
            const sp = p.vel.length();
            _d.copy(t.aimPoint(_a)).sub(p.pos).normalize().multiplyScalar(sp);
            p.vel.lerp(_d, Math.min(1, p.homing * dt)).setLength(sp);
          }
        }
        p.vel.y -= p.grav * dt;
        const step = p.vel.length() * dt;
        if (step < 1e-6) { this._glow(p, fx); continue; }
        _d.copy(p.vel).normalize();
        // World (rayS + the phys scratch hit, copied out at once: no result object per projectile per frame; the ray's
        // numbers travel in Phys.rayIn — a double argument to a call that is not inlined is a fresh heap number)
        const ph = w.phys, RI = G.Phys.rayIn;
        RI[0] = p.pos.x; RI[1] = p.pos.y; RI[2] = p.pos.z; RI[3] = _d.x; RI[4] = _d.y; RI[5] = _d.z; RI[6] = step + p.r; RI[7] = 0;
        const wh = ph.rayS();
        let tW = Infinity, wnx = 0, wny = 1, wnz = 0, wtag = null;
        if (wh) { const RH = ph._r; tW = Math.max(0, RH.t - p.r); wnx = RH.nx; wny = RH.ny; wnz = RH.nz; wtag = RH.tag; }
        // Actors
        let hitA = null, tA = Infinity;
        if (!p.noActors) {
          const acts = w.actors, SI = G.raySegIn, ST_ = G.raySegT, segS = G.raySegHitS, lim = step < tW ? step : tW;
          for (let ai = 0; ai < acts.length; ai++) {
            const a = acts[ai];
            if (!a.alive || !a.targetable || a.team === p.team || a === p.src) continue;
            if (p.hitSet && p.hitSet.has(a.id)) continue;
            const r = a.r + p.r, r5 = r * 0.5, top = a.h - r * 0.4;
            SI[0] = a.pos.x; SI[1] = a.pos.y + r5; SI[2] = a.pos.z; SI[3] = a.pos.y + (top > r5 ? top : r5); SI[4] = r; SI[5] = lim;
            if (segS(p.pos, _d) && ST_[0] < tA) { tA = ST_[0]; hitA = a; }
          }
        }
        // (hits are handled out of line: see _hitActor)
        if (hitA && tA <= tW) { this._hitActor(i, p, hitA, tA, w, fx); continue; }
        if (wh && tW <= step) { _b.set(wnx, wny, wnz); this._hitWorld(i, p, tW, wtag, w, fx); continue; }
        p.pos.addScaledVector(p.vel, dt);
        p.mesh.position.copy(p.pos);
        if (p.grow) p.mesh.scale.setScalar(p.baseSize * (1 + p.age * p.grow));
        if (p.spin) p.mesh.rotation.y += p.spin * dt; else p.mesh.lookAt(_a.copy(p.pos).add(p.vel));
        this._glow(p, fx);
        if (p.trail && !p.tr) this._drip(p, fx, dt);
      }
    }
    // A projectile meets an actor / the world. Kept out of update(): a hit is rare per frame, and its many sub-branches
    // (crit, slow, dot, pierce, bounce, fuse, stick, aoe) first run at unpredictable moments of a fight — inside the
    // per-frame loop each one that had never run before sent the whole optimized loop back to the baseline tier, where
    // every double it touches is a fresh heap number (the biggest engine allocation in a royale match). Out here only
    // these small functions pay. _d holds the flight direction (as in update); _hitWorld's surface normal is in _b.
    _hitActor(i, p, hitA, tA, w, fx) {
      p.pos.addScaledVector(_d, tA);
      // weak spot: the glowing battery sphere (G.critAt, padded by the projectile radius) or the head line; on
      // a battery (critK) the bonus is scaled like Weapon.hit does, since centre-mass aim already lands there
      const crit = G.critAt ? G.critAt(hitA, p.pos, p.r) : (hitA.critY != null && p.pos.y > hitA.pos.y + hitA.critY);
      const cm = crit ? 1 + (p.crit - 1) * (hitA.critK > 0 ? hitA.critK : 1) : 1;
      const info = { src: p.src, type: 'proj', pos: p.pos.clone(), dir: _d.clone(), knock: p.knock, crit, mult: cm, weapon: p.weapon };
      if (p.onHit && p.onHit(p, { actor: hitA, point: p.pos, normal: _d.clone().negate() }, w) === false) { this._kill(i); return; }
      if (p.dmg > 0) w.damage(hitA, p.dmg, info);
      if (p.slow && hitA.alive) { hitA.slowT = p.slow.t; hitA.slowK = p.slow.k; }
      if (p.dot && hitA.alive) { hitA.dotT = p.dot.t; hitA.dotDps = p.dot.dps; hitA.dotSrc = p.src; }
      O_HITA.crit = crit; O_HITA.scale = U.clamp(Math.sqrt((p.dmg || 10) / 14), 0.7, 1.8);
      fx.impact(p.pos, _n.copy(_d).negate(), p.color, O_HITA);
      if (p.pierce > 0) { p.pierce--; (p.hitSet || (p.hitSet = new Set())).add(hitA.id); p.mesh.position.copy(p.pos); return; }
      if (p.aoe > 0) this.detonate(p);
      this._kill(i);
    }
    _hitWorld(i, p, tW, wtag, w, fx) {
      p.pos.addScaledVector(_d, tW);
      const nrm = _b;
      if (p.onHit && p.onHit(p, { actor: null, point: p.pos, normal: nrm.clone(), tag: wtag }, w) === false) { this._kill(i); return; }
      if (p.bounce > 0) {
        p.bounce--;
        const vn = p.vel.dot(nrm);
        p.vel.addScaledVector(nrm, -2 * vn).multiplyScalar(0.62);
        p.pos.addScaledVector(nrm, 0.02);
        if (Math.abs(vn) > 3) { if (G.Audio) G.Audio.sfxAt('bounce', p.pos); O_BNC.dir = nrm; fx.sparks(p.pos, p.color, 4, O_BNC); }
        return;
      }
      if (p.fuse && !p.aoe) { p.vel.set(0, 0, 0); return; }
      if (p.stick) { p.vel.set(0, 0, 0); p.grav = 0; p.mesh.position.copy(p.pos); return; }
      if (p.aoe > 0) this.detonate(p);
      else fx.impact(p.pos, nrm, p.color, O_HITW);
      this._kill(i);
    }
    // Halo around glowing projectiles, stretched along the flight path when fast.
    _glow(p, fx) {
      if (!p.mesh.userData.glow) return;
      const gs = p.baseSize * 4.2 * (p.grow ? 1 + p.age * p.grow : 1);
      const sp = p.vel.length();
      QA[8] = gs; QA[9] = gs + sp * 0.008; QA[12] = 0.85; QA[15] = 0.12;
      fx.glowQA(p.pos, p.color, sp > 12 ? p.vel : null);
    }
    // Trail for kinds without a ribbon: goo drips, bubble fizz, or a soft glow stream.
    _drip(p, fx, dt) {
      p.dripT -= dt;
      if (p.dripT > 0) return;
      const q = fx.q;
      // (PSys.add's arguments written straight into PA: no double crosses a call)
      PA[0] = p.pos.x; PA[1] = p.pos.y; PA[2] = p.pos.z; PA[6] = p.color | 0; PA[13] = CV.shrink; PA[14] = -1; PA[15] = 0; PA[16] = 0; PA[17] = GY_NONE;
      if (p.kind === 'ink') {
        p.dripT = 0.045 / q;
        PA[3] = p.vel.x * 0.1; PA[4] = p.vel.y * 0.1; PA[5] = p.vel.z * 0.1; PA[7] = p.baseSize * 0.9 * U.rand(0.6, 1.1); PA[8] = 0.35; PA[9] = 10; PA[10] = 1.5; PA[11] = 1; PA[12] = SH.blob;
        fx.norm.addPA();
      } else if (p.kind === 'grenade') {
        p.dripT = 0.05 / q;
        PA[3] = U.rand(-0.4, 0.4); PA[4] = U.rand(0.2, 0.8); PA[5] = U.rand(-0.4, 0.4); PA[7] = p.baseSize * 2.2; PA[8] = 0.32; PA[9] = -1; PA[10] = 2; PA[11] = 0.65; PA[12] = SH.glow;
        PA[14] = 0xffffff; PA[15] = 0.2;
        fx.add.addPA();
      } else {
        p.dripT = 0.03 / q;
        PA[3] = 0; PA[4] = 0; PA[5] = 0; PA[7] = p.baseSize * 5; PA[8] = 0.22; PA[9] = 0; PA[10] = 0; PA[11] = 0.7; PA[12] = -1; PA[13] = 0;
        fx.add.addPA();
      }
    }
    clear() { for (let i = this.list.length - 1; i >= 0; i--) this._kill(i); }
    dispose() { this.clear(); }
  }
  G.Projectiles = Projectiles;

  // ======================= Pickups =======================
  const BOLT_CAP = 360, PART_CAP = 120;
  let boltGeo = null, partGeo = null;
  function geos() {
    if (boltGeo) return;
    // Hex nut: 6-sided cylinder with a dark inset core look via vertex colors.
    boltGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.1, 6).rotateX(Math.PI / 2); boltGeo.userData.shared = true;
    partGeo = new THREE.OctahedronGeometry(0.22, 0); partGeo.scale(1, 1.35, 1); partGeo.userData.shared = true;
  }
  const POP_COL = { bolt: 0xffd75e, health: 0x7dffb0, shield: 0x7fd6ff, ammo: 0xffe08a, special: 0xffd23f };
  class Pickups {
    constructor(world) {
      geos();
      this.world = world;
      this.items = [];
      this.magnetR = 4.5;
      this.bolts = new THREE.InstancedMesh(boltGeo, G.M.toon(0xffc93a, { emissive: 0xffa200, ei: 0.35, rimColor: 0xfff6c8, rimStr: 0.6 }), BOLT_CAP);
      this.bolts.count = 0; this.bolts.frustumCulled = false;
      this.parts = new THREE.InstancedMesh(partGeo, G.M.toon(0xffffff, { emissive: 0xffffff, ei: 0.25, rimStr: 0.7 }), PART_CAP);
      this.parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PART_CAP * 3), 3);
      this.parts.count = 0; this.parts.frustumCulled = false;
      world.scene.add(this.bolts, this.parts);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new V3(); this._e = new THREE.Euler();
    }
    // type: bolt|part|health|ammo|shield|special. data: {value, partId, rarity, color}
    spawn(type, pos, data, vel) {
      data = data || {};
      const it = { type, pos: pos.clone(), vel: vel ? vel.clone() : new V3(U.rand(-2, 2), U.rand(4, 7), U.rand(-2, 2)), data, age: -0, life: -0, spin: U.rand(0, 6), grounded: false, mesh: null, beam: null,
        pull: -0, hold: -0, refused: 0, bobA: -0, phase: Math.random() * TAU, col: 0xffffff, rar: 0, glintT: U.rand(0.5, 3), base: -0 };
      it.life = data.life || 40; it.base = 1;   // (-0 first: double fields, see the Actor note in 10_world)
      if (type === 'health' || type === 'ammo' || type === 'shield' || type === 'special') {
        it.mesh = G.Geo && G.Geo.pickupMesh ? G.Geo.pickupMesh(type, data) : new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), G.M.toon(type === 'health' ? 0x5dff9a : type === 'shield' ? 0x5fc8ff : 0xffd23f));
        it.base = it.mesh.scale.x || 1; // the model's own scale (big pickups are built at 1.35)
        it.mesh.scale.setScalar(0.001);
        this.world.scene.add(it.mesh);
        it.col = data.color || POP_COL[type] || 0xffffff;
      } else if (type === 'part') {
        it.col = G.Data && G.Data.partColor ? G.Data.partColor(data.partId, data.rarity) : 0x7ff3ff;
        const rar = data.rarity || 'common';
        it.rar = rar === 'mythic' ? 4 : rar === 'legendary' ? 3 : rar === 'epic' ? 2 : rar === 'rare' ? 1 : 0;
        // Epic and better get a light pillar (drawn as a quad each frame, see update).
        if (it.rar >= 2) it.beam = G.Data && G.Data.RARITY && G.Data.RARITY[rar] ? G.Data.RARITY[rar].color : 0xffb627;
      } else it.col = POP_COL.bolt;
      this.items.push(it);
      return it;
    }
    // Burst of bolts totalling `amount`, split into satisfying chunks.
    boltBurst(pos, amount) {
      if (amount <= 0) return;
      const n = U.clamp(Math.round(Math.sqrt(amount) * 1.3), 3, 24);
      let left = amount;
      for (let i = 0; i < n; i++) {
        const v = i === n - 1 ? left : Math.max(1, Math.round(amount / n));
        left -= v;
        if (v <= 0) break;
        this.spawn('bolt', pos, { value: v }, _a.set(U.rand(-3.5, 3.5), U.rand(4, 8.5), U.rand(-3.5, 3.5)));
      }
    }
    update(dt) {
      const w = this.world, pl = w.player, fx = w.fx;
      let nb = 0, np = 0;
      const mag = this.magnetR * (pl && pl.magnetMult ? pl.magnetMult : 1);
      const t = w.time;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.age += dt; it.life -= dt;
        if (it.life <= 0) { this._remove(i); continue; }
        if (it.hold > 0) it.hold -= dt;
        let pulled = false;
        if (pl && pl.alive && it.age > 0.35 && !(it.hold > 0)) {
          _a.set(pl.pos.x, pl.pos.y + 0.9, pl.pos.z);
          _d.subVectors(_a, it.pos);
          const d = _d.length();
          const mr = it.type === 'bolt' || it.type === 'part' ? mag : mag * 0.6;
          const reach = 1.0 + (it.pull > 0 ? it.vel.length() * dt : 0);
          if (d < reach) {
            if (this._collect(it)) { this._pop(it); this._remove(i); continue; }
            // refused (e.g. full health): drop at the player's feet instead of flying on past, retry
            // the pickup now and then, and don't chase again for a while (or until the player has
            // walked away and come back)
            if (it.pull > 0) { it.vel.x *= 0.1; it.vel.z *= 0.1; it.vel.y = Math.min(it.vel.y, 0); }
            it.pull = 0; it.hold = 0.5; it.refused = 3;
          } else if (it.refused > 0) {
            it.refused = d > mr * 1.25 ? 0 : it.refused - dt;
          } else if (d < mr || (it.pull > 0 && d < mr * 1.8 + 2)) {
            // Magnet: a little hop when caught, then the pickup accelerates along a curving path
            // into the player (steered velocity, not a lerp toward a fixed speed).
            if (!(it.pull > 0)) { it.pull = 1e-3; it.vel.y = Math.max(it.vel.y, 2.4); it.grounded = false; }
            pulled = true;
            it.pull += dt;
            const pt = it.pull;
            const sp = Math.min(28, 2.5 + 9 * pt + 40 * pt * pt);
            _d.multiplyScalar(sp / Math.max(d, 1e-4));
            it.vel.lerp(_d, 1 - Math.exp(-(3 + 26 * pt) * dt));
            it.vel.y -= 18 * Math.max(0, 1 - pt / 0.2) * dt; // early on gravity still bends the path into an arc
          } else it.pull = 0;
        }
        if (!pulled) {
          it.vel.y -= 18 * dt;
          const fr = Math.exp(-1.5 * dt); it.vel.x *= fr; it.vel.z *= fr;
        }
        it.pos.addScaledVector(it.vel, dt);
        if (!pulled) {
          const g = w.phys.groundAt(it.pos.x, it.pos.z, 0.1, it.pos.y + 0.5) + 0.25;
          if (it.pos.y < g) {
            it.pos.y = g;
            if (it.vel.y < -2.5) { it.vel.y *= -0.38; if (it.vel.y > 2.2 && it.type !== 'bolt') fx.puff(_e.set(it.pos.x, g - 0.2, it.pos.z), 0xf3ece0, 1, 0.3); }
            else { it.vel.y = 0; it.grounded = true; }
            it.vel.x *= 0.7; it.vel.z *= 0.7;
          }
        }
        // Visuals: scale in (no pop at spawn), bob eases in once grounded, spin faster in flight,
        // blink with rising urgency before despawning and shrink away at the very end.
        it.bobA = U.damp(it.bobA, it.grounded && !pulled ? 1 : 0, 5, dt);
        it.spin += dt * (pulled ? 9 : it.grounded ? 2.4 : 6);
        const bob = it.bobA * (Math.sin(t * 2.6 + it.phase) * 0.07 + 0.11);
        let sc = it.age < 0.24 ? Math.max(0.001, easeOutBack(it.age / 0.24)) : 1;
        if (it.life < 0.25) sc *= Math.max(0.001, it.life / 0.25);
        if (pulled) sc *= 0.82 + 0.18 * U.clamp((_a.distanceTo(it.pos) - 0.6) / 2, 0, 1);
        const blink = it.life < 4 && it.life > 0.25 && Math.sin(it.life * (10 + (4 - it.life) * 5)) > 0.35;
        if (blink) sc = 0.001;
        if (it.type === 'bolt') {
          if (nb < BOLT_CAP) {
            this._e.set(0.3 + (it.grounded ? 0 : Math.sin(it.spin * 0.7) * 0.4), it.spin, 0); this._q.setFromEuler(this._e);
            this._s.setScalar(sc);
            this._m.compose(_b.set(it.pos.x, it.pos.y + bob, it.pos.z), this._q, this._s);
            this.bolts.setMatrixAt(nb++, this._m);
          }
          if (pulled && Math.random() < 27 * dt * fx.q) fx.add.add(it.pos.x, it.pos.y + bob, it.pos.z, 0, 0, 0, 0xffe27a, 0.16, 0.18, 0, 0, 0.8, SH.glow, CV.shrink);
          else if (it.grounded && (it.glintT -= dt) <= 0) { it.glintT = U.rand(1.2, 3.5); if (!blink) fx.add.add(it.pos.x + U.rand(-0.1, 0.1), it.pos.y + bob + 0.08, it.pos.z + U.rand(-0.1, 0.1), 0, 0.15, 0, 0xfff6c8, 0.32, 0.42, 0, 0, 0.9, SH.star, CV.pop, -1, 0.5, 2); }
        } else if (it.type === 'part') {
          if (np < PART_CAP) {
            this._e.set(0, it.spin, 0); this._q.setFromEuler(this._e);
            this._s.setScalar(sc);
            this._m.compose(_b.set(it.pos.x, it.pos.y + bob + 0.1, it.pos.z), this._q, this._s);
            this.parts.setMatrixAt(np, this._m);
            _col.setHex(it.col); this.parts.setColorAt(np, _col);
            np++;
          }
          if (!blink) {
            // rarity glow, and a soft light pillar + rising sparkles for epic and better
            fx.glow(_b.set(it.pos.x, it.pos.y + bob + 0.1, it.pos.z), it.col, (0.7 + it.rar * 0.15) * sc, 0.32 + 0.08 * Math.sin(t * 4 + it.phase));
            if (it.beam != null) {
              fx.quad(QM.axis, QS.beam, _b.set(it.pos.x, it.pos.y + 1.9, it.pos.z), UPV, 0.75 * sc, 3.9, 0, it.beam, 0.5 + 0.1 * Math.sin(t * 3 + it.phase));
              if (Math.random() < dt * (1.5 + it.rar)) fx.add.add(it.pos.x + U.rand(-0.25, 0.25), it.pos.y + 0.2, it.pos.z + U.rand(-0.25, 0.25), 0, U.rand(0.8, 1.6), 0, it.beam, 0.22, 1.1, -0.3, 0.5, 0.9, SH.star, CV.pop, 0xffffff, 0.3, 2);
            }
          }
        } else if (it.mesh) {
          it.mesh.position.set(it.pos.x, it.pos.y + bob, it.pos.z);
          it.mesh.rotation.y = it.spin;
          it.mesh.scale.setScalar(sc * it.base);
          it.mesh.visible = !blink;
        }
      }
      this.bolts.count = nb; this.bolts.instanceMatrix.needsUpdate = true;
      this.parts.count = np; this.parts.instanceMatrix.needsUpdate = true;
      if (this.parts.instanceColor) this.parts.instanceColor.needsUpdate = true;
    }
    _pop(it) {
      const fx = this.world.fx; if (!fx.pickupPop) return;
      fx.pickupPop(it.pos, it.type === 'part' ? (it.beam != null ? it.beam : it.col) : it.col, it.type !== 'bolt' && (it.type !== 'part' || it.rar >= 1));
    }
    _collect(it) {
      const w = this.world;
      // Mode rules may veto (e.g. full health) by returning false.
      if (w.rules.onPickup) { const r = w.rules.onPickup(it.type, it.data, it); if (r === false) return false; }
      G.bus.emit('pickup', it.type, it.data, it);
      return true;
    }
    _remove(i) {
      const it = this.items[i];
      if (it.mesh) { this.world.scene.remove(it.mesh); }
      this.items.splice(i, 1);
    }
    clear() { for (let i = this.items.length - 1; i >= 0; i--) this._remove(i); }
    // (InstancedMesh.dispose frees the instance buffers; the geometries and materials are shared)
    dispose() { this.clear(); this.bolts.dispose(); this.parts.dispose(); }
  }
  G.Pickups = Pickups;
})(window.G);

}).call(window); } catch (e) { console.error('[module 11_systems.js]', e); }
// ---- 11b_terrain.js
try { (function () {
// Terrain helpers: chunked heightfield meshes with vertex colours and analytic normals, a detail-
// textured terrain material, baked ground occlusion, a camera-windowed grass + flower field, cheap
// ambient life (pollen motes, fireflies, butterflies, bird flocks) and stylised animated water with
// depth-aware shallows, shore foam and sun glints.
//
//   build(opts)                -> Group of chunk meshes. group.userData.grid keeps the vertex grid
//                                 (heights + linear colours) for gridColor()/gridH() and bakeAO().
//   terrainMat(opts)           -> soft-toon vc material + two-scale tiling detail texture (speckle, macro
//                                 patches, warm/cool drift). opts.detail = [fine, macro, drift].
//   genDetail(S) / setDetail(tex) -> the detail generator (128² at runtime; the bake tool runs it at 1024²)
//                                 and the shared detail uniform (baked texture on High/Ultra, public build).
//   bakeAO(group, spots)       -> darkens terrain vertex colours under props: spots [{x,z,r,k}].
//   foliage(world, opts)       -> {group, grass, flowers, update(cam)}: instanced tufts/flowers inside a
//                                 window around the camera (2 draw calls), fading out at the rim, swaying
//                                 in the house wind. Placement is precomputed per 8 m chunk at load. Radius
//                                 and density follow the quality tier (Ultra: wider and denser).
//   ambient(world, opts)       -> {group}: motes / fireflies (GPU-animated points, 1 call each),
//                                 butterflies + bird flocks (instanced, wings flap on the GPU).
//   water(opts)                -> animated mesh; opts.depth {heightFn, minX..maxZ} bakes a depth map
//                                 for transparent shallows, shoreline foam and rolling foam bands.
//   toonVariant(color, opts, inj) -> uncached soft-toon material with extra shader code (own programs).
(function (G) {
  const T = G.Terrain = {};
  const _c = new THREE.Color();
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const tierName = () => (G.R && G.R.qualityName ? G.R.qualityName() : 'high');
  const maxAniso = n => { const r = G.R && G.R.renderer; return r && r.capabilities ? Math.min(n, r.capabilities.getMaxAnisotropy() || 1) : 1; };

  // ------------------------------------------------------------------ toon variants
  // A private copy of the house soft-toon shader with injected code. inj: {defines, uniforms, vsHead,
  // vsPre (just before vWP = wp.xyz, i.e. after wind), fsHead, fsAlbedo (after vertex colours),
  // fsEmit (after lighting, fog-aware haze included, just before the emissive term: `col` is the lit colour),
  // fsNoFlip (keep normals on back faces: grass cards lit from above on both sides)}. If the anchors
  // are missing (house shader changed) the plain toon shader is used and a warning is logged.
  function toonVariant(color, opts, inj) {
    const m = G.M.toonUnique(color, opts);
    let vs = m.vertexShader, fs = m.fragmentShader, ok = true;
    const before = (src, anchor, code) => { const i = src.indexOf(anchor); if (i < 0) { ok = false; return src; } return src.slice(0, i) + code + '\n' + src.slice(i); };
    if (inj.vsHead) vs = before(vs, 'void main(){', inj.vsHead);
    if (inj.vsPre) vs = before(vs, '  vWP = wp.xyz;', inj.vsPre);
    if (inj.fsHead) fs = before(fs, 'void main(){', inj.fsHead);
    if (inj.fsEmit) fs = before(fs, '  col += uEmissive;', inj.fsEmit);
    if (inj.fsAlbedo) {
      const a = fs.indexOf('albedo *= vColor.rgb;'), e = a >= 0 ? fs.indexOf('#endif', a) : -1;
      if (e < 0) ok = false; else fs = fs.slice(0, e + 6) + '\n' + inj.fsAlbedo + '\n' + fs.slice(e + 6);
    }
    if (inj.fsNoFlip) { const s = 'normalize(vWN) * (gl_FrontFacing ? 1.0 : -1.0)'; if (fs.indexOf(s) >= 0) fs = fs.replace(s, 'normalize(vWN)'); }
    Object.assign(m.uniforms, inj.uniforms || {});
    if (ok) { m.vertexShader = vs; m.fragmentShader = fs; Object.assign(m.defines, inj.defines || {}); }
    else console.warn('[terrain] toon shader anchors missing; variant falls back to the plain toon shader');
    m.userData.shared = true; m.userData.variantOk = ok;
    return m;
  }
  T.toonVariant = toonVariant;

  // ------------------------------------------------------------------ detail texture
  // 128² tiling RGBA: R fine speckle/clumps, G soft macro patches, B a second macro field (warm drift).
  // genDetail(S) is the generator: S = 128 is the runtime texture (exactly as it always was); larger S (the
  // bake tool, game/tools/bake_textures.mjs) continues the speckle and macro octaves down to ~2 texels and
  // remaps every channel to the 128² statistics — the same ground, just crisper up close.
  const dHash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const dVn = (x, y, P, s) => {
    const xi = Math.floor(x), yi = Math.floor(y); let u = x - xi, v = y - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    const a = dHash(x0, y0, s), b = dHash(x1, y0, s), c = dHash(x0, y1, s), d = dHash(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const dFbm = (u, v, P, s, oct) => { let sum = 0, a = 0.5, n = 0, f = 1; for (let i = 0; i < oct; i++) { sum += a * dVn(u * P * f, v * P * f, P * f, s + i * 7); n += a; a *= 0.5; f *= 2; } return sum / n; };
  function detailChannels(S) {
    const ch = [new Float32Array(S * S), new Float32Array(S * S), new Float32Array(S * S)];
    const hi = S > 128, sp2 = Math.min(S / 2, 512);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = i / S, v = j / S, k = j * S + i;
      if (!hi) {
        const clump = dFbm(u, v, 8, 11, 3), speck = dVn(u * 64, v * 64, 64, 5);
        ch[0][k] = clump * 0.65 + speck * 0.35;
        ch[1][k] = dFbm(u, v, 4, 23, 3);
        ch[2][k] = dFbm(u, v, 3, 41, 2);
      } else {
        const clump = dFbm(u, v, 8, 11, 4), speck = dVn(u * 64, v * 64, 64, 5), fine = dVn(u * 256, v * 256, 256, 6), grit = dVn(u * sp2, v * sp2, sp2, 9);
        ch[0][k] = clump * 0.55 + speck * 0.25 + fine * 0.12 + grit * 0.08;
        ch[1][k] = dFbm(u, v, 4, 23, 5);
        ch[2][k] = dFbm(u, v, 3, 41, 4);
      }
    }
    return ch;
  }
  function minMax(a) { let lo = 1e9, hi = -1e9; for (let k = 0; k < a.length; k++) { const x = a[k]; if (x < lo) lo = x; if (x > hi) hi = x; } return [lo, hi]; }
  T.genDetail = function (S) {
    S = S || 128;
    const data = new Uint8Array(S * S * 4), ch = detailChannels(S);
    if (S <= 128) {
      for (let c = 0; c < 3; c++) {
        const [lo, hi] = minMax(ch[c]);
        for (let k = 0; k < S * S; k++) data[k * 4 + c] = Math.round(clamp((ch[c][k] - lo) / Math.max(1e-6, hi - lo), 0, 1) * 255);
      }
    } else {
      // target statistics: the runtime 128² texture's channels (as stored, 0..1)
      const ref = T.genDetail(128).data, n0 = 128 * 128;
      for (let c = 0; c < 3; c++) {
        let m = 0, v = 0; for (let k = 0; k < n0; k++) m += ref[k * 4 + c] / 255; m /= n0;
        for (let k = 0; k < n0; k++) { const x = ref[k * 4 + c] / 255 - m; v += x * x; } const sd = Math.sqrt(v / n0);
        const a = ch[c]; let am = 0, av = 0; for (let k = 0; k < a.length; k++) am += a[k]; am /= a.length;
        for (let k = 0; k < a.length; k++) { const x = a[k] - am; av += x * x; } const asd = Math.sqrt(av / a.length) || 1;
        for (let k = 0; k < S * S; k++) data[k * 4 + c] = Math.round(clamp((a[k] - am) / asd * sd + m, 0, 1) * 255);
      }
    }
    for (let k = 0; k < S * S; k++) data[k * 4 + 3] = 255;
    return { w: S, h: S, data };
  };
  let DETAIL = null;
  T.detailTex = function () {
    if (DETAIL) return DETAIL;
    const g = T.genDetail(128);
    DETAIL = new THREE.DataTexture(g.data, g.w, g.h, THREE.RGBAFormat);
    DETAIL.wrapS = DETAIL.wrapT = THREE.RepeatWrapping;
    DETAIL.magFilter = THREE.LinearFilter; DETAIL.minFilter = THREE.LinearMipmapLinearFilter;
    DETAIL.generateMipmaps = true; DETAIL.anisotropy = maxAniso(4);
    DETAIL.needsUpdate = true; DETAIL.userData.shared = true;
    return DETAIL;
  };
  // One uniform object shared by every terrain material: 04_render's applyTextures swaps in the baked
  // hi-res detail on High/Ultra (public build) and back, at mode loads / settings changes only.
  const DETAIL_U = { value: null };
  T.setDetail = function (tex) { DETAIL_U.value = tex || T.detailTex(); };
  T.detailUniform = DETAIL_U;

  // ------------------------------------------------------------------ ground surfaces
  // One shared surface preset for every terrain material (and the foliage tint, the AO bake): set by G.R.setLighting
  // from the light preset's `surf` field at each World (mode load), defaults otherwise. Weights 0..1:
  //   grass   meadow colour patches (sunny yellow-green / deep blue-green) + flower speckles, on green ground only
  //   sand    wind ripples + dune tone on sandy ground       snow   violet tints cooled to blue-white, blue hollows, sparkle
  //   moss    softly glowing moss patches + bioluminescent dots (emissive)
  //   metal   bolted plates with seams / rivets, rust stains, grime     strata  fine rock bands on cliffs
  //   foam    wet sand and a washing foam band at the waterline of this world's sea (default 0.6; see setSurface)
  //   accent / accent2  flower colours | moss glow, dots | sparkle tint | rust, plate metal
  //   ao      per-channel exponents of the baked ground occlusion ([1, 1, 1] neutral; > 1 darkens that channel more)
  // The features are uniform-driven (one program for every region: nothing to compile per region); Low (uSurfQ 0)
  // skips the speckles, ripples, plate seams, sparkle and glow dots.
  const SURF = T.surfU = {
    uSurfA: { value: new THREE.Vector4(1, 0, 0, 0) },      // grass, sand, snow, moss
    uSurfB: { value: new THREE.Vector4(0, 0.7, 0, 0) },    // metal, strata, water height, foam
    uSurfC: { value: new THREE.Color(0xff8ab4) }, uSurfD: { value: new THREE.Color(0xffd84a) }, uSurfQ: { value: 1 },
  };
  const AO_E = [1, 1, 1];
  let FOAM = 0;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  // (the shore band stays off until this world builds a sea — T.water with size >= 200 sets its height and turns the
  // band on — so dry arenas at sea level, e.g. the boss canyons, never get wet sand or foam)
  T.setSurface = function (s) {
    s = s || {};
    SURF.uSurfA.value.set(num(s.grass, 1), num(s.sand, 0), num(s.snow, 0), num(s.moss, 0));
    SURF.uSurfB.value.set(num(s.metal, 0), num(s.strata, 0.7), 0, 0);
    FOAM = num(s.foam, 0.6);
    SURF.uSurfC.value.setHex(num(s.accent, 0xff8ab4)); SURF.uSurfD.value.setHex(num(s.accent2, 0xffd84a));
    SURF.uSurfQ.value = G.R && G.R.tierRank && G.R.tierRank() === 0 ? 0 : 1;
    const ao = Array.isArray(s.ao) && s.ao.length === 3 ? s.ao : null;
    for (let i = 0; i < 3; i++) AO_E[i] = ao ? num(ao[i], 1) : 1;
    CONTACT = num(s.contact, 0x231a4a);
  };
  // Colour of soft contact shadows draped on this ground (surf.contact; deep violet by default, a blue-grey on snow).
  let CONTACT = 0x231a4a;
  T.contactColor = () => CONTACT;
  // A tier change mid-mode (Settings, or an automatic drop to Low) switches the cheap path at once: a uniform, nothing
  // to compile.
  G.bus.on('quality', () => { SURF.uSurfQ.value = G.R && G.R.tierRank && G.R.tierRank() === 0 ? 0 : 1; });

  // Terrain material: detail taps (fine ~5 m tile fading out by 70 m; mid ~22 m; macro ~73 m), stronger on cliffs, a
  // warm/cool drift so big lawns never read as one flat colour, then the surface features above.
  const TERRAIN_HEAD = [
    '#ifdef TERRAIN_DETAIL',
    'uniform sampler2D uDetail; uniform vec3 uDetailK;',
    'uniform vec4 uSurfA, uSurfB; uniform vec3 uSurfC, uSurfD; uniform float uSurfQ, uTime, uWindK;',   // (uWindK < 1: reduced motion)
    'float tHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    '#endif'].join('\n');
  const TERRAIN_FS = [
    '#ifdef TERRAIN_DETAIL',
    '  vec3 tEmit = vec3(0.0);',
    '  {',
    '    float tdist = length(vVP);',
    '    vec3 tdf = texture2D(uDetail, vWP.xz * 0.19).rgb;',
    '    vec3 tdm = texture2D(uDetail, vWP.xz * 0.0137 + vec2(0.31, 0.67)).rgb;',
    '    vec3 tdc = texture2D(uDetail, vWP.xz * 0.045 + vec2(0.53, 0.19)).rgb;',
    '    vec3 wn = normalize(vWN);',
    '    float steep = 1.0 - smoothstep(0.6, 0.92, wn.y), flt = 1.0 - steep;',
    // surface classes from the painted (vertex) colour: green meadow, sandy ground
    '    float lum = dot(albedo, vec3(0.2126, 0.7152, 0.0722));',
    '    float grassM = smoothstep(0.02, 0.1, albedo.g - max(albedo.r, albedo.b)) * flt;',
    '    float sandM = smoothstep(0.08, 0.2, albedo.r - albedo.b) * smoothstep(0.2, 0.4, lum) * (1.0 - grassM);',
    '    float fine = (tdf.r - 0.5) * uDetailK.x * (1.0 - smoothstep(25.0, 70.0, tdist)) * (1.0 + steep * 0.8);',
    '    albedo *= 1.0 + fine + (tdm.g - 0.5) * uDetailK.y;',
    '    albedo = mix(albedo, albedo * vec3(1.07, 1.03, 0.86), clamp((tdm.b - 0.45) * uDetailK.z * 2.0, 0.0, 1.0));',
    '    if (uSurfA.x > 0.0) {',     // meadow: big colour patches (T.meadowTint is the CPU twin for the grass tufts) + flowers
    '      float gk = grassM * uSurfA.x;',
    // big soft fields (18-24 m blobs): golden-lime sunny meadow, cool emerald / teal, a finer +-6 % value drift
    '      albedo *= mix(vec3(1.0), vec3(1.16, 1.1, 0.7), smoothstep(0.5, 0.7, tdm.g) * gk * 0.85);',
    '      albedo *= mix(vec3(1.0), vec3(0.64, 0.9, 1.12), smoothstep(0.5, 0.72, tdm.b) * gk * 0.8);',
    '      albedo *= 1.0 + (tdc.g - 0.5) * 0.24 * gk;',
    // painterly light on the rolling ground: slopes turned toward the sun warm toward lime-gold, slopes turned away
    // cool toward teal (relative to flat ground, so the flat-lit grass tufts still match the ground under them)
    '      float gl = clamp((dot(wn, uSunDir) - uSunDir.y) * 2.5, -1.0, 1.0);',
    // (kept fresh: stacked on a golden patch the warm side must not turn olive)
    '      albedo *= mix(vec3(1.0), gl > 0.0 ? vec3(1.08, 1.06, 0.86) : vec3(0.8, 0.94, 1.1), abs(gl) * gk * 0.6);',
    '      if (uSurfQ > 0.5) {',
    // four-petal flowers with a golden heart, in clusters (one candidate per 0.6 m cell, ~26 cm across; thick in the
    // flower patches, a few scattered elsewhere), a soft darker ring of leaves under each
    '        vec2 fc = vWP.xz * 1.65, fi = floor(fc);',
    '        float fr = tHash(fi);',
    '        vec2 fq = fract(fc) - vec2(tHash(fi + 7.3), tHash(fi + 3.1)) * 0.5 - 0.25;',   // (flower + ring stay inside the cell)
    '        vec2 fa = abs(fq); float fl = length(fq);',
    '        float fd = fl / (1.0 - 0.42 * min(fa.x, fa.y) / max(max(fa.x, fa.y), 1e-4));',
    '        float fon = step(0.965 - smoothstep(0.46, 0.7, tdc.r) * 0.5, fr) * gk * (1.0 - smoothstep(24.0, 60.0, tdist));',
    '        float fm = fon * (1.0 - smoothstep(0.15, 0.2, fd));',
    '        albedo *= 1.0 - fon * (1.0 - smoothstep(0.17, 0.25, fl)) * (1.0 - fm) * 0.25;',
    '        vec3 fcol = fl < 0.055 ? vec3(1.0, 0.8, 0.28) : (fr > 0.99 ? vec3(1.0) : (fract(fr * 53.0) > 0.5 ? uSurfC : uSurfD));',
    '        albedo = mix(albedo, fcol * 1.1, fm);',
    '      }',
    '    }',
    '    if (uSurfA.y > 0.0) {',     // sand: clean wind ripples (thin lit crests, soft troughs; near only) and dune tone
    '      float sk = sandM * uSurfA.y * flt;',
    '      float rp = sin(dot(vWP.xz, vec2(0.86, 0.5)) * 4.2 + (tdc.r - 0.5) * 3.0 + (tdm.g - 0.5) * 7.0 + sin(dot(vWP.xz, vec2(-0.5, 0.86)) * 0.35) * 1.2);',
    '      float rk = sk * (1.0 - smoothstep(12.0, 34.0, tdist)) * uSurfQ;',
    '      albedo *= 1.0 - (tdf.r - 0.5) * uDetailK.x * sk * 0.7;',   // calmer grain than meadow ground
    '      albedo *= 1.0 + (smoothstep(0.72, 0.97, rp) * 0.16 - smoothstep(0.1, -0.9, rp) * 0.1) * rk;',
    '      albedo *= mix(vec3(1.0), vec3(1.08, 1.0, 0.86), smoothstep(0.45, 0.7, tdm.r) * sk * 0.6);',
    '    }',
    '    if (uSurfA.z > 0.0) {',     // snow: cool (never violet) white, blue hollows, sparkle (emissive, near only)
    '      float nk = uSurfA.z * flt;',
    '      albedo = mix(albedo, vec3(lum) * vec3(0.95, 0.98, 1.05), nk * 0.35);',
    // blue-white drifts: soft blue hollows (macro), wind-carved ripples (near), a brighter crust on the crests
    '      albedo *= mix(vec3(1.0), vec3(0.74, 0.86, 1.04), smoothstep(0.42, 0.7, tdm.g) * nk * 0.9);',
    '      albedo *= mix(vec3(1.0), vec3(0.86, 0.93, 1.04), smoothstep(0.45, 0.65, tdc.r) * nk * 0.7);',
    // stylised snow light: faces turned toward the sun a creamy warm white, faces turned away a clear sky blue (relative
    // to flat ground), so every drift and dune reads even under a high, frontal sun
    '      float sl = clamp((dot(wn, uSunDir) - uSunDir.y) * 2.8, -1.0, 1.0);',
    '      albedo *= mix(vec3(1.0), sl > 0.0 ? vec3(1.06, 1.03, 0.94) : vec3(0.72, 0.86, 1.08), abs(sl) * nk * 0.8);',
    // sastrugi: long wind-carved ridges with a lit crest and a blue lee groove (near, 1.6 m apart)
    '      float sw = sin(dot(vWP.xz, vec2(0.6, 0.8)) * 3.9 + (tdc.g - 0.5) * 9.0 + (tdm.r - 0.5) * 6.0);',
    '      albedo *= 1.0 + (smoothstep(0.55, 1.0, sw) * 0.07 - smoothstep(-0.1, -0.9, sw) * 0.12 * vec3(1.0, 0.62, 0.15)) * nk * (1.0 - smoothstep(20.0, 50.0, tdist)) * uSurfQ;',
    '      if (uSurfQ > 0.5) {',
    // sugar-sparkle glints: little four-point stars in pastel tints (ice blue, pink, mint, lemon) that wink as the
    // view moves across them and twinkle slowly in place (reduced motion: they hold still)
    '        vec2 sc = vWP.xz * 1.9, si = floor(sc);',
    '        vec3 vd = normalize(cameraPosition - vWP);',
    '        float sh = tHash(si + 1.9);',
    '        float sp = step(0.9, tHash(si + (uWindK > 0.5 ? floor(dot(vd, vec3(7.0, 3.0, 7.0)) + sh * 3.0) : 0.0)));',
    '        vec2 so = abs(fract(sc) - vec2(tHash(si + 5.1), tHash(si + 8.3)) * 0.5 - 0.25);',
    '        float star = (1.0 - smoothstep(0.02, 0.07, length(so))) + (1.0 - smoothstep(0.004, 0.022, min(so.x, so.y))) * (1.0 - smoothstep(0.03, 0.17, max(so.x, so.y)));',
    '        sp *= min(star, 1.0) * nk * (1.0 - smoothstep(8.0, 36.0, tdist)) * (0.65 + 0.35 * sin(uTime * 1.7 * uWindK + sh * 40.0));',
    '        vec3 gcol = sh < 0.4 ? uSurfC : sh < 0.6 ? vec3(1.0, 0.72, 0.9) : sh < 0.8 ? vec3(0.66, 1.0, 0.86) : vec3(1.0, 0.94, 0.62);',
    '        tEmit += gcol * sp * 1.7 * max(dot(wn, uSunDir), 0.25);',
    '      }',
    '    }',
    '    if (uSurfA.w > 0.0) {',     // glowing moss patches and bioluminescent dots
    '      float mk = smoothstep(0.5, 0.7, tdc.g) * uSurfA.w * flt;',
    // (kept deep: the night ground is the dark stage the glowing caps, sprouts and robots' batteries read against)
    '      albedo *= mix(vec3(1.0), vec3(0.74, 0.8, 1.06), smoothstep(0.45, 0.25, tdc.g) * uSurfA.w * flt * 0.8);',   // deeper blue between the moss
    '      albedo = mix(albedo, albedo * vec3(0.7, 1.16, 0.96) + uSurfC * 0.03, mk * 0.7);',
    '      tEmit += uSurfC * mk * 0.11 * (0.75 + 0.25 * sin(uTime * 1.3 + tdm.r * 12.0));',
    '      if (uSurfQ > 0.5) {',
    '        vec2 gc = vWP.xz * 2.2, gi = floor(gc);',
    '        float gr = tHash(gi + 1.3);',
    '        float gd = length(fract(gc) - vec2(tHash(gi + 4.1), tHash(gi + 9.7)) * 0.6 - 0.2);',
    '        float gm = step(0.7, gr) * (1.0 - smoothstep(0.05, 0.12, gd)) * (0.5 + mk) * uSurfA.w * flt * (1.0 - smoothstep(20.0, 50.0, tdist));',
    '        tEmit += mix(uSurfC, uSurfD, step(0.86, gr)) * gm * (0.6 + 0.4 * sin(uTime * 2.0 + gr * 30.0));',
    '      }',
    '    }',
    '    if (uSurfB.x > 0.0) {',     // scrap ground: bolted plates (seams / rivets near only), soft rust, grime
    '      float pk = smoothstep(0.42, 0.58, tdc.b) * uSurfB.x * flt;',
    '      vec2 pp = vWP.xz / vec2(2.6, 1.9);',
    '      pp.x += step(1.0, mod(floor(pp.y), 2.0)) * 0.5;',
    '      vec2 pc = floor(pp), pf = fract(pp);',
    '      vec2 em = min(pf, 1.0 - pf) * vec2(2.6, 1.9);',
    '      float dk = (1.0 - smoothstep(30.0, 75.0, tdist)) * uSurfQ;',
    '      float seam = 1.0 - smoothstep(0.03, 0.08, min(em.x, em.y));',
    '      float rivet = 1.0 - smoothstep(0.035, 0.06, length(abs(pf - 0.5) * vec2(2.6, 1.9) - vec2(1.13, 0.78)));',
    // per-plate tone, a few plates steel blue or dark slate (bolted scrap, never one flat floor; kept cool so the orange
    // Gizmobs still stand out against the ground)
    '      float ph = tHash(pc + 2.7);',
    '      vec3 plate = mix(albedo, uSurfD, 0.55) * (0.84 + 0.28 * fract(ph * 13.0));',
    '      plate = mix(plate, plate * vec3(0.78, 0.9, 1.12), step(0.82, ph));',
    '      plate = mix(plate, plate * vec3(0.8, 0.8, 0.9), step(ph, 0.1));',
    '      plate *= 1.0 - seam * 0.45 * dk;',
    '      plate = mix(plate, plate * 1.25, rivet * dk * (1.0 - seam));',
    '      albedo = mix(albedo, plate, pk);',
    '      albedo = mix(albedo, uSurfC * (0.8 + 0.3 * tdf.r), smoothstep(0.6, 0.8, tdm.g + (tdf.g - 0.5) * 0.3) * uSurfB.x * (0.4 + 0.6 * flt) * 0.4);',
    '      albedo *= 1.0 - smoothstep(0.58, 0.8, tdc.r) * 0.14 * uSurfB.x - seam * 0.06 * pk;',
    '    }',
    '    if (uSurfB.y > 0.0) {',     // cliff strata: wobbling bands of lighter / darker rock with thin dark seams
    '      float sb = vWP.y * 1.1 + (tdf.g - 0.5) * 0.7 + (tdm.r - 0.5) * 3.0, sf = fract(sb);',
    '      float layer = smoothstep(0.05, 0.15, sf) * (1.0 - smoothstep(0.55, 0.65, sf));',
    '      float line = 1.0 - smoothstep(0.0, 0.06, min(sf, 1.0 - sf));',
    '      albedo *= 1.0 + ((layer - 0.5) * 0.14 + (tHash(vec2(floor(sb), 3.7)) - 0.5) * 0.12 - line * 0.2) * steep * uSurfB.y;',
    '    }',
    '    if (uSurfB.w > 0.0) {',     // shore: wet sand and a foam band washing up and down the beach
    '      float ht = vWP.y - uSurfB.z, sh = smoothstep(0.45, 0.65, wn.y);',
    '      albedo *= mix(vec3(1.0), vec3(0.74, 0.78, 0.86), (1.0 - smoothstep(0.05, 0.55, ht)) * uSurfB.w * 0.85);',
    '      float fy = 0.12 + 0.1 * sin(uTime * 0.8 + (tdm.r - 0.5) * 6.0 + (tdc.g - 0.5) * 3.0);',
    '      float fb = (1.0 - smoothstep(0.0, 0.1, abs(ht - fy))) * (0.6 + 0.4 * tdf.r);',
    '      float bub = step(0.62, tHash(floor(vWP.xz * 4.0))) * (1.0 - smoothstep(0.0, 0.25, abs(ht - fy - 0.08))) * uSurfQ;',
    '      albedo = mix(albedo, vec3(1.0), clamp(fb * 0.85 + bub * 0.5, 0.0, 1.0) * uSurfB.w * sh * (1.0 - smoothstep(50.0, 110.0, tdist)));',
    '    }',
    '  }',
    '#endif'].join('\n');
  const _tmats = new Map();
  T.terrainMat = function (opts) {
    opts = opts || {};
    const key = JSON.stringify(opts);
    let m = _tmats.get(key);
    if (m) return m;
    const det = opts.detail || [0.32, 0.15, 0.55];
    const mo = Object.assign({ rimStr: 0.12 }, opts, { vc: true }); delete mo.detail;
    if (!DETAIL_U.value) DETAIL_U.value = T.detailTex();
    m = toonVariant(0xffffff, mo, {
      defines: { TERRAIN_DETAIL: '' },
      uniforms: Object.assign({ uDetail: DETAIL_U, uDetailK: { value: new THREE.Vector3(det[0], det[1], det[2]) } }, SURF),
      fsHead: TERRAIN_HEAD,
      fsAlbedo: TERRAIN_FS,
      fsEmit: '#ifdef TERRAIN_DETAIL\n  col += tEmit;\n#endif',
    });
    _tmats.set(key, m);
    return m;
  };
  // CPU twin of the meadow patches above (grass ground), for instance colours that must agree with the ground under
  // them (the foliage tufts): bilinear taps of the 128² runtime detail data at the shader's mid / macro coordinates.
  function detailAt(u, v, c) {
    const d = T.detailTex().image.data, S = 128;
    let x = u * S - 0.5, y = v * S - 0.5;
    const xi = Math.floor(x), yi = Math.floor(y); x -= xi; y -= yi;
    const x0 = ((xi % S) + S) % S, y0 = ((yi % S) + S) % S, x1 = (x0 + 1) % S, y1 = (y0 + 1) % S;
    const a = d[(y0 * S + x0) * 4 + c], b = d[(y0 * S + x1) * 4 + c], e = d[(y1 * S + x0) * 4 + c], f = d[(y1 * S + x1) * 4 + c];
    return ((a * (1 - x) + b * x) * (1 - y) + (e * (1 - x) + f * x) * y) / 255;
  }
  const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  T.meadowTint = function (x, z, col) {
    const k = SURF.uSurfA.value.x;
    if (!(k > 0)) return col;
    const gm = sst(0.02, 0.1, col.g - Math.max(col.r, col.b)) * k;
    if (!(gm > 0)) return col;
    const mu = x * 0.0137 + 0.31, mv = z * 0.0137 + 0.67;
    const pw = sst(0.5, 0.7, detailAt(mu, mv, 1)) * gm * 0.85;
    const pc = sst(0.5, 0.72, detailAt(mu, mv, 2)) * gm * 0.8;
    const fv = 1 + (detailAt(x * 0.045 + 0.53, z * 0.045 + 0.19, 1) - 0.5) * 0.24 * gm;
    col.r *= (1 + 0.16 * pw) * (1 - 0.36 * pc) * fv; col.g *= (1 + 0.1 * pw) * (1 - 0.1 * pc) * fv; col.b *= (1 - 0.3 * pw) * (1 + 0.12 * pc) * fv;
    return col;
  };

  // ------------------------------------------------------------------ heightfield meshes
  // opts: {heightFn, colorFn(x,z,h,slope)->hex, minX,maxX,minZ,maxZ, res (m per cell), chunks (per side), material}
  T.build = function (opts) {
    const hf = opts.heightFn;
    const minX = opts.minX, maxX = opts.maxX, minZ = opts.minZ, maxZ = opts.maxZ;
    const res = opts.res || 2;
    const chunks = opts.chunks || 4;
    const group = new THREE.Group();
    const mat = opts.material || T.terrainMat({ rimStr: 0.12 });
    const cw = (maxX - minX) / chunks, cd = (maxZ - minZ) / chunks;
    const nx = Math.max(1, Math.round(cw / res)), nz = Math.max(1, Math.round(cd / res));
    // whole-terrain vertex grid (chunks share their edge rows)
    const GX = chunks * nx + 1, GZ = chunks * nz + 1;
    const grid = { minX, minZ, maxX, maxZ, dx: cw / nx, dz: cd / nz, nx: GX, nz: GZ, h: new Float32Array(GX * GZ), c: new Float32Array(GX * GZ * 3), parts: [] };
    const e = 0.75;
    for (let ci = 0; ci < chunks; ci++) for (let cj = 0; cj < chunks; cj++) {
      const x0 = minX + ci * cw, z0 = minZ + cj * cd;
      const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
      const nor = new Float32Array(pos.length);
      const col = new Float32Array(pos.length);
      let k = 0;
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
        const x = x0 + (i / nx) * cw, z = z0 + (j / nz) * cd;
        const h = hf(x, z);
        const hl = hf(x - e, z), hr = hf(x + e, z), hd = hf(x, z - e), hu = hf(x, z + e);
        let ax = hl - hr, ay = 2 * e, az = hd - hu; const l = Math.hypot(ax, ay, az); ax /= l; ay /= l; az /= l;
        pos[k] = x; pos[k + 1] = h; pos[k + 2] = z;
        nor[k] = ax; nor[k + 1] = ay; nor[k + 2] = az;
        _c.setHex(opts.colorFn ? opts.colorFn(x, z, h, 1 - ay) : 0x6ccb5f);
        col[k] = _c.r; col[k + 1] = _c.g; col[k + 2] = _c.b;
        const gi = (cj * nz + j) * GX + ci * nx + i;
        grid.h[gi] = h; grid.c[gi * 3] = _c.r; grid.c[gi * 3 + 1] = _c.g; grid.c[gi * 3 + 2] = _c.b;
        k += 3;
      }
      const idx = [];
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.userData.terrain = true;
      group.add(m);
      grid.parts.push({ ci, cj, nx, nz, col: g.attributes.color });
    }
    group.userData.grid = grid;
    return group;
  };
  const gridOf = g => (g && g.userData && g.userData.grid) || (g && g.h && g.c ? g : null);
  // Bilinear samples of the vertex grid (the mesh itself is triangulated, so these match it to a few cm).
  T.gridH = function (gr, x, z) {
    const g = gridOf(gr); if (!g) return 0;
    let fx = clamp((x - g.minX) / g.dx, 0, g.nx - 1.001), fz = clamp((z - g.minZ) / g.dz, 0, g.nz - 1.001);
    const i = fx | 0, j = fz | 0; fx -= i; fz -= j;
    const k = j * g.nx + i, H = g.h;
    return (H[k] + (H[k + 1] - H[k]) * fx) * (1 - fz) + (H[k + g.nx] + (H[k + g.nx + 1] - H[k + g.nx]) * fx) * fz;
  };
  T.gridColor = function (gr, x, z, out) {
    out = out || new THREE.Color();
    const g = gridOf(gr); if (!g) return out.setRGB(0.3, 0.6, 0.25);
    let fx = clamp((x - g.minX) / g.dx, 0, g.nx - 1.001), fz = clamp((z - g.minZ) / g.dz, 0, g.nz - 1.001);
    const i = fx | 0, j = fz | 0; fx -= i; fz -= j;
    const C = g.c, a = (j * g.nx + i) * 3, b = a + 3, c = a + g.nx * 3, d = c + 3;
    const w0 = (1 - fx) * (1 - fz), w1 = fx * (1 - fz), w2 = (1 - fx) * fz, w3 = fx * fz;
    return out.setRGB(C[a] * w0 + C[b] * w1 + C[c] * w2 + C[d] * w3, C[a + 1] * w0 + C[b + 1] * w1 + C[c + 1] * w2 + C[d + 1] * w3, C[a + 2] * w0 + C[b + 2] * w1 + C[c + 2] * w2 + C[d + 2] * w3);
  };

  // Ground occlusion baked into the terrain vertex colours: soft dark discs under trees, rocks, props.
  // spots [{x, z, r, k (0..1 darkening at the centre)}]. Darkening multiplies and bottoms out at 45%.
  T.bakeAO = function (group, spots) {
    const g = gridOf(group);
    if (!g || !spots || !spots.length) return 0;
    const N = g.nx * g.nz, mul = new Float32Array(N).fill(1);
    let touched = 0;
    // A spot narrower than ~1.6 grid cells darkened only the one or two vertices it happened to cover, which drew as a
    // hard-edged dark diamond on coarse terrain (e.g. under a camp tent on a 2.5 m grid) — or nothing at all, depending
    // on where the prop stood. Small spots are spread to that width with the same total darkening (k scaled by area).
    const rMin = 1.6 * Math.max(g.dx, g.dz);
    for (const s of spots) {
      if (!(s.r > 0)) continue;
      const r = Math.max(s.r, rMin);
      const k = (s.k != null ? s.k : 0.3) * (s.r * s.r) / (r * r);
      const i0 = Math.max(0, Math.floor((s.x - r - g.minX) / g.dx)), i1 = Math.min(g.nx - 1, Math.ceil((s.x + r - g.minX) / g.dx));
      const j0 = Math.max(0, Math.floor((s.z - r - g.minZ) / g.dz)), j1 = Math.min(g.nz - 1, Math.ceil((s.z + r - g.minZ) / g.dz));
      for (let j = j0; j <= j1; j++) {
        const dz = g.minZ + j * g.dz - s.z;
        for (let i = i0; i <= i1; i++) {
          const dx = g.minX + i * g.dx - s.x, d2 = (dx * dx + dz * dz) / (r * r);
          if (d2 >= 1) continue;
          const f = (1 - d2) * (1 - d2);
          mul[j * g.nx + i] *= 1 - k * f;
          touched++;
        }
      }
    }
    if (!touched) return 0;
    // per-channel tint of the occlusion (the surface preset's ao exponents: e.g. a pale blue-grey shade on snow)
    const er = AO_E[0], eg = AO_E[1], eb = AO_E[2], tinted = er !== 1 || eg !== 1 || eb !== 1;
    const tint = (arr, o, m) => { if (tinted) { arr[o] *= Math.pow(m, er); arr[o + 1] *= Math.pow(m, eg); arr[o + 2] *= Math.pow(m, eb); } else { arr[o] *= m; arr[o + 1] *= m; arr[o + 2] *= m; } };
    for (let q = 0; q < N; q++) { const m = Math.max(0.45, mul[q]); if (m < 0.999) tint(g.c, q * 3, m); mul[q] = m; }
    for (const p of g.parts) {
      const a = p.col.array;
      let k = 0;
      for (let j = 0; j <= p.nz; j++) for (let i = 0; i <= p.nx; i++) {
        const m = mul[(p.cj * p.nz + j) * g.nx + p.ci * p.nx + i];
        if (m < 0.999) tint(a, k, m);
        k += 3;
      }
      p.col.needsUpdate = true;
    }
    return touched;
  };

  // The same soft discs on any vertex-coloured geometry (plazas, paving): darkens by XZ distance.
  T.aoGeo = function (geo, spots, maxY) {
    const p = geo.attributes.position, c = geo.attributes.color;
    if (!p || !c || !spots || !spots.length) return;
    const top = maxY != null ? maxY : 1e9;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y > top) continue;
      let m = 1;
      for (let s = 0; s < spots.length; s++) {
        const sp = spots[s], dx = x - sp.x, dz = z - sp.z, d2 = (dx * dx + dz * dz) / (sp.r * sp.r);
        if (d2 < 1) m *= 1 - (sp.k != null ? sp.k : 0.3) * (1 - d2) * (1 - d2);
      }
      if (m < 0.999) { m = Math.max(0.5, m); c.setXYZ(i, c.getX(i) * m, c.getY(i) * m, c.getZ(i) * m); }
    }
    c.needsUpdate = true;
  };

  // Banded colour helper for sandstone-style layers: bands = [hex...], height per band, wobble.
  T.bands = function (bands, bandH, x, z, y, wobble) {
    const w = wobble != null ? wobble : 0.35;
    const t = (y + G.noise.n2(x * 0.15, z * 0.15) * w * 3) / bandH;
    const i = ((Math.floor(t) % bands.length) + bands.length) % bands.length;
    return bands[i];
  };

  // ------------------------------------------------------------------ scene hooks
  // Per-frame work that must land before three builds its render list (instance windows, uniforms):
  // chained onto scene.onBeforeRender, which runs before projection on every render of the scene.
  // (04_render's sun-shadow pass suspends scene.onBeforeRender, so these always see the main camera.)
  function hook(scene, fn) {
    const prev = scene.onBeforeRender;
    scene.onBeforeRender = function (renderer, sc, camera, rt) {
      if (prev) prev.call(this, renderer, sc, camera, rt);
      if (sc === scene && camera) fn(camera);
    };
  }
  T.hook = hook;
  const pxScale = cam => (G.R.h || 400) * (G.R.pr || 1) * 0.5 / Math.tan((cam.fov || 60) * PI / 360);

  // ------------------------------------------------------------------ foliage field
  // Geometry is unit-height; instance scale sets the size. Normals point (mostly) up so the grass is lit
  // like the ground it grows from; vertex colours darken the roots and warm the tips, the instance colour
  // is the terrain colour under the tuft (so a meadow and its grass always agree).
  let TUFT = null, FLOWER = null;
  function tuftGeo() {
    if (TUFT) return TUFT;
    const rnd = G.rng(913), pos = [], nor = [], col = [];
    const n = 6;
    for (let b = 0; b < n; b++) {
      const a = (b / n) * TAU + (rnd() - 0.5) * 0.7, r0 = 0.04 + rnd() * 0.17, w = 0.17 + rnd() * 0.09, h = 0.62 + rnd() * 0.42;
      const lean = 0.14 + rnd() * 0.24, ca = Math.cos(a), sa = Math.sin(a);
      const bx = ca * r0, bz = sa * r0, tx = ca * (r0 + lean), tz = sa * (r0 + lean);
      const px = -sa * w * 0.5, pz = ca * w * 0.5;
      pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz);
      const ox = ca * 0.28, oz = sa * 0.28, nl = Math.hypot(ox, 1, oz);
      for (let q = 0; q < 3; q++) nor.push(ox / nl, 1 / nl, oz / nl);
      const tk = 0.92 + rnd() * 0.16;
      col.push(0.6, 0.64, 0.58, 0.6, 0.64, 0.58, 1.18 * tk, 1.22 * tk, 0.95 * tk);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    g.userData.shared = true;
    TUFT = g;
    return g;
  }
  function flowerGeo() {
    if (FLOWER) return FLOWER;
    const pos = [], nor = [], col = [];
    const tri = (a, b, c, ca, cb, cc, n) => { pos.push(...a, ...b, ...c); col.push(...ca, ...cb, ...cc); for (let q = 0; q < 3; q++) nor.push(n[0], n[1], n[2]); };
    const heads = [[0.06, 0.62, 0.02, 0.17, 0.35], [-0.12, 0.46, -0.07, 0.13, -0.4], [0.13, 0.38, -0.1, 0.11, 0.9]];
    const stem = [0.25, 0.5, 0.2], petal = [1, 1, 1], petalIn = [0.9, 0.9, 0.93], ctr = [1.0, 0.82, 0.28];
    for (const [hx, hy, hz, r, rot] of heads) {
      // stem: thin card from the root to the head
      tri([0.015, 0, 0], [-0.015, 0, 0], [hx, hy, hz], stem, stem, stem, [0, 1, 0]);
      // five rounded petals (scalloped rim, no star points), the head tilted ~40° so it shows its face from
      // eye level instead of a spiky sliver; normals lean only halfway so it is lit like the meadow
      const N = 20, tl = 0.84, tx = Math.sin(rot) * tl, tz = Math.cos(rot) * tl, nl = Math.hypot(tx * 0.5, 1, tz * 0.5);
      const nh = [-tx * 0.5 / nl, 1 / nl, -tz * 0.5 / nl];
      const P = i => { const a = (i / N) * TAU + rot, rr = r * (0.5 + 0.5 * Math.pow(Math.abs(Math.cos(a * 2.5 - rot * 2.5)), 0.6)); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; return [hx + x, hy + 0.02 + x * tx + z * tz, hz + z]; };
      const c0 = [hx, hy + 0.04, hz];
      for (let i = 0; i < N; i++) tri(c0, P(i + 1), P(i), petalIn, petal, petal, nh);
      // raised centre
      for (let i = 0; i < 5; i++) {
        const a0 = (i / 5) * TAU, a1 = ((i + 1) / 5) * TAU, cr = r * 0.3, y = a => hy + 0.05 + (Math.cos(a) * tx + Math.sin(a) * tz) * cr;
        tri([hx, hy + 0.075, hz], [hx + Math.cos(a1) * cr, y(a1), hz + Math.sin(a1) * cr], [hx + Math.cos(a0) * cr, y(a0), hz + Math.sin(a0) * cr], ctr, ctr, ctr, nh);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    g.userData.shared = true;
    FLOWER = g;
    return g;
  }
  // Fade: instances collapse toward their root as they near the window rim (no pop), on both axes.
  const FOL_VS_HEAD = '#ifdef FOL_FADE\nuniform vec3 uFolCam; uniform vec2 uFolFade;\n#endif';
  const FOL_VS = [
    '#ifdef FOL_FADE',
    '  { vec3 fb = (modelMatrix * origin).xyz; vec2 fd = fb.xz - uFolCam.xz;',
    '    float fk = 1.0 - smoothstep(uFolFade.x, uFolFade.y, dot(fd, fd));',
    '    wp.xyz = fb + (wp.xyz - fb) * fk; }',
    '#endif'].join('\n');
  // glow > 0: brighter albedo (bioluminescent flowers for night biomes; the post bloom picks them up).
  // One material per field (not shared): the world's disposeTree disposes it, and its 'dispose' event frees
  // the field's instance buffers (InstancedMesh.dispose) — see T.foliage.
  const FOL_U = { uFolCam: { value: new THREE.Vector3() }, uFolFade: { value: new THREE.Vector2(400, 600) } };
  function foliageMat(glow) {
    const inj = { defines: { FOL_FADE: '' }, uniforms: Object.assign({}, FOL_U), vsHead: FOL_VS_HEAD, vsPre: FOL_VS, fsNoFlip: true };
    if (glow > 0) { inj.defines.FOL_GLOW = ''; inj.uniforms.uFolGlow = { value: glow }; inj.fsHead = '#ifdef FOL_GLOW\nuniform float uFolGlow;\n#endif'; inj.fsAlbedo = '#ifdef FOL_GLOW\n  albedo *= uFolGlow;\n#endif'; }
    const m = toonVariant(0xffffff, { vc: true, wind: 1.25, rimStr: glow > 0 ? 0.3 : 0.05, side: THREE.DoubleSide, band: 0.16 }, inj);
    m.userData.shared = false;
    return m;
  }
  T.foliageMat = foliageMat;

  // Growable per-instance store: x, y, z, s*cos, s*sin, s, r, g, b.
  function store() {
    let a = new Float32Array(9 * 1024), n = 0;
    return {
      push(x, y, z, s, ry, r, g, b) {
        if ((n + 1) * 9 > a.length) { const b2 = new Float32Array(a.length * 2); b2.set(a); a = b2; }
        const o = n * 9; a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = s * Math.cos(ry); a[o + 4] = s * Math.sin(ry); a[o + 5] = s; a[o + 6] = r; a[o + 7] = g; a[o + 8] = b; n++;
      },
      get n() { return n; }, get a() { return a; },
    };
  }
  // opts: {heightFn, grid (terrain group), bounds {minX,maxX,minZ,maxZ}, density(x,z,h)->0..1,
  //        flowers(x,z,h)->0..1, flowerColors [hex], tint [r,g,b], height [min,max], flowerSize [min,max],
  //        densityK, flowerK, flowerGlow (albedo boost, night biomes), blockPhys (skip points inside colliders), seed}
  T.foliage = function (world, o) {
    o = o || {};
    if (!world || !o.heightFn || !o.bounds) return null;
    const q = tierName();
    // Ultra: the field reaches ~40 % further (about 2x the area) and is ~30 % denser, with more flowers
    const R = o.radius || { low: 15, med: 22, high: 24, ultra: 34 }[q] || 22;
    const perM2 = ({ low: 1.4, med: 2.5, high: 2.4, ultra: 3.1 }[q] || 2.5) * (o.densityK != null ? o.densityK : 1);
    const flM2 = 0.14 * (o.flowerK != null ? o.flowerK : 1) * (q === 'low' ? 0.6 : q === 'ultra' ? 1.35 : 1);
    const C = 8, B = o.bounds, hf = o.heightFn;
    const cx = Math.max(1, Math.ceil((B.maxX - B.minX) / C)), cz = Math.max(1, Math.ceil((B.maxZ - B.minZ) / C));
    const rnd = G.rng(o.seed || 17);
    const tint = o.tint || [1, 1.04, 0.9], hgt = o.height || [0.42, 0.74], fsz = o.flowerSize || [0.8, 1.15];
    const fcols = (o.flowerColors || [0xff8ab4, 0xffd84a, 0xffffff, 0xc2a2ff]).map(h => new THREE.Color(h));
    const phys = o.blockPhys ? world.phys : null, tmp = [];
    const blocked = (x, z, h) => {
      if (!phys) return false;
      const list = phys.query(x - 0.2, z - 0.2, x + 0.2, z + 0.2, tmp);
      for (const it of list) {
        if (it.k === 0) { if (x > it.minx - 0.15 && x < it.maxx + 0.15 && z > it.minz - 0.15 && z < it.maxz + 0.15 && it.maxy > h - 0.3 && it.miny < h + 0.9) return true; }
        else { const dx = x - it.x, dz = z - it.z, rr = it.r + 0.2; if (dx * dx + dz * dz < rr * rr && it.y1 > h - 0.3 && it.y0 < h + 0.9) return true; }
      }
      return false;
    };
    const gs = store(), fs = store();
    const gStart = new Int32Array(cx * cz + 1), fStart = new Int32Array(cx * cz + 1);
    const col = new THREE.Color();
    for (let j = 0; j < cz; j++) for (let i = 0; i < cx; i++) {
      const ci = j * cx + i, x0 = B.minX + i * C, z0 = B.minZ + j * C;
      gStart[ci] = gs.n; fStart[ci] = fs.n;
      // stratified jitter: m×m cells per chunk
      const m = Math.max(1, Math.round(Math.sqrt(C * C * perM2))), cs = C / m;
      for (let b = 0; b < m; b++) for (let a = 0; a < m; a++) {
        const x = x0 + (a + rnd()) * cs, z = z0 + (b + rnd()) * cs, r1 = rnd(), r2 = rnd(), r3 = rnd();
        if (x > B.maxX || z > B.maxZ) continue;
        const h = hf(x, z), d = o.density ? o.density(x, z, h) : 1;
        if (!(d > 0) || r1 >= d || blocked(x, z, h)) continue;
        if (o.grid) T.meadowTint(x, z, T.gridColor(o.grid, x, z, col)); else col.setRGB(0.3, 0.62, 0.25);
        // per-tuft value + a few sun-bleached (warmer) tufts
        const v = 0.9 + r3 * 0.2, w = r3 > 0.78 ? (r3 - 0.78) * 4.5 : 0;
        gs.push(x, h - 0.04, z, (hgt[0] + (hgt[1] - hgt[0]) * r2) * (0.6 + 0.4 * d), r3 * TAU * 7.3,
          col.r * tint[0] * v * (1 + 0.12 * w), col.g * tint[1] * v * (1 + 0.04 * w), col.b * tint[2] * v * (1 - 0.25 * w));
      }
      if (o.flowers) {
        const mf = Math.max(1, Math.round(Math.sqrt(C * C * flM2))), fc = C / mf;
        for (let b = 0; b < mf; b++) for (let a = 0; a < mf; a++) {
          const x = x0 + (a + rnd()) * fc, z = z0 + (b + rnd()) * fc, r1 = rnd(), r2 = rnd(), r3 = rnd();
          if (x > B.maxX || z > B.maxZ) continue;
          const h = hf(x, z), d = o.flowers(x, z, h);
          if (!(d > 0) || r1 >= d || blocked(x, z, h)) continue;
          const fcol = fcols[Math.floor(r3 * fcols.length) % fcols.length];
          fs.push(x, h - 0.02, z, fsz[0] + (fsz[1] - fsz[0]) * r2, r3 * TAU * 5.1, fcol.r, fcol.g, fcol.b);
        }
      }
    }
    gStart[cx * cz] = gs.n; fStart[cx * cz] = fs.n;
    if (!gs.n && !fs.n) return null;
    // window = chunks whose rect lies within R of the refresh point; capacity = the worst window. Nearest chunks first:
    // a shorter reach (fol.setReach) draws a prefix of the filled window — no refill, no re-upload.
    const offs = [], od = [];
    const span = Math.ceil(R / C) + 1;
    {
      const list = [];
      for (let dj = -span; dj <= span; dj++) for (let di = -span; di <= span; di++) {
        const ex = Math.max(0, Math.abs(di) - 1) * C, ez = Math.max(0, Math.abs(dj) - 1) * C, d2 = ex * ex + ez * ez;
        if (d2 < R * R) list.push([di, dj, Math.sqrt(d2)]);
      }
      list.sort((a, b) => a[2] - b[2]);
      for (const e of list) { offs.push(e[0], e[1]); od.push(e[2]); }
    }
    const cumG = new Int32Array(od.length + 1), cumF = new Int32Array(od.length + 1);
    const capOf = st => {
      let cap = 1;
      for (let j = 0; j < cz; j++) for (let i = 0; i < cx; i++) {
        let s = 0;
        for (let k = 0; k < offs.length; k += 2) { const a = i + offs[k], b = j + offs[k + 1]; if (a >= 0 && b >= 0 && a < cx && b < cz) { const c = b * cx + a; s += st[c + 1] - st[c]; } }
        if (s > cap) cap = s;
      }
      return cap;
    };
    const mk = (geo, cap, name, glow) => {
      const m = new THREE.InstancedMesh(geo, foliageMat(glow), cap);
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      m.count = 0; m.frustumCulled = false; m.name = name;
      return m;
    };
    const group = new THREE.Group(); group.name = 'foliage';
    const grass = gs.n ? mk(tuftGeo(), capOf(gStart), 'grass') : null;
    const flowers = fs.n ? mk(flowerGeo(), capOf(fStart), 'flowers', o.flowerGlow || 0) : null;
    for (const m of [grass, flowers]) if (m) m.material.addEventListener('dispose', () => m.dispose());
    if (grass) group.add(grass);
    if (flowers) group.add(flowers);
    const fill = (mesh, st, S, cum) => {
      if (!mesh) return;
      const A = S.a, M = mesh.instanceMatrix.array, Cc = mesh.instanceColor.array, cap = mesh.instanceMatrix.count;
      let n = 0, kEnd = 0;
      for (let k = 0; k < offs.length && n < cap; k += 2) {
        cum[k >> 1] = n; kEnd = (k >> 1) + 1;
        const a = fol.ci + offs[k], b = fol.cj + offs[k + 1];
        if (a < 0 || b < 0 || a >= cx || b >= cz) continue;
        const c = b * cx + a;
        for (let p = st[c]; p < st[c + 1] && n < cap; p++, n++) {
          const o9 = p * 9, m = n * 16, sc = A[o9 + 3], ss = A[o9 + 4], s = A[o9 + 5];
          M[m] = sc; M[m + 1] = 0; M[m + 2] = -ss; M[m + 3] = 0;
          M[m + 4] = 0; M[m + 5] = s; M[m + 6] = 0; M[m + 7] = 0;
          M[m + 8] = ss; M[m + 9] = 0; M[m + 10] = sc; M[m + 11] = 0;
          M[m + 12] = A[o9]; M[m + 13] = A[o9 + 1]; M[m + 14] = A[o9 + 2]; M[m + 15] = 1;
          Cc[n * 3] = A[o9 + 6]; Cc[n * 3 + 1] = A[o9 + 7]; Cc[n * 3 + 2] = A[o9 + 8];
        }
      }
      for (let k = kEnd; k <= od.length; k++) cum[k] = n;   // (offsets past a full window: everything is before them)
      // mode-load warm-up with an empty window (camera not over this field yet): still issue one real draw
      // (a zero-size instance) so the GPU pipeline for this program is built behind the loading screen
      if (!n && G.Game && G.Game._switching) { M.fill(0, 0, 16); M[15] = 1; n = 1; cum[od.length] = 1; }
      mesh.count = n;
      mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, n * 16); mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.clearUpdateRanges(); mesh.instanceColor.addUpdateRange(0, n * 3); mesh.instanceColor.needsUpdate = true;
    };
    // reach (0.4..1, fol.setReach): how far out the field draws. Modes shorten it while a crowd of robots is in view
    // (21c) or where the scene is heavy (the hub on Ultra): only the nearest chunks are drawn (a prefix of the window,
    // see offs) and the fade radius shrinks with it, so the rim never pops.
    const prefix = (cum, Rr) => { let k = 0; while (k < od.length && od[k] < Rr) k++; return cum[k]; };
    const applyReach = () => {
      const Rr = R * fol.reachK;
      if (grass) grass.count = Math.max(Math.min(1, grass.count), prefix(cumG, Rr));
      if (flowers) flowers.count = Math.max(Math.min(1, flowers.count), prefix(cumF, Rr));
    };
    const fol = {
      group, grass, flowers, R, ci: -99, cj: -99, refreshes: 0, counts: { grass: gs.n, flowers: fs.n }, reachK: 1,
      setReach(k) {
        k = clamp(k, 0.4, 1);
        if (Math.abs(k - fol.reachK) < 0.005) return;
        fol.reachK = k;
        if (fol.ci > -99) applyReach();
      },
      update(cam) {
        const p = cam.position;
        const fadeEnd = Math.max(6, R * fol.reachK - 4.5), fadeStart = Math.max(3, fadeEnd - 6);
        // high above the ground (drop phase, aerial cameras): nothing to see, skip the draw calls — but never
        // during the mode load, so the load-time warm-up still compiles the foliage program
        const above = p.y - hf(p.x, p.z);
        group.visible = above < fadeEnd || !!(G.Game && G.Game._switching);
        if (!group.visible) return;
        FOL_U.uFolCam.value.copy(p);
        const ff = Math.max(0, fadeEnd * fadeEnd - above * above), fs2 = Math.max(0, fadeStart * fadeStart - above * above);
        FOL_U.uFolFade.value.set(Math.min(fs2, ff - 1), ff);
        // the window is a fixed set of chunks around the camera's chunk: refill (and re-upload) only when the
        // camera crosses into another chunk (everything within the fade radius is always inside the window)
        const ci = Math.floor((p.x - B.minX) / C), cj = Math.floor((p.z - B.minZ) / C);
        if (ci === fol.ci && cj === fol.cj) return;
        fol.ci = ci; fol.cj = cj; fol.refreshes++;
        fill(grass, gStart, gs, cumG); fill(flowers, fStart, fs, cumF);
        if (fol.reachK < 1) applyReach();
      },
    };
    world.add(group);
    hook(world.scene, cam => fol.update(cam));
    // first fill around the camera already (warm-up draws the full window once)
    if (G.R.camera) fol.update(G.R.camera);
    return fol;
  };

  // ------------------------------------------------------------------ ambient life
  // Points that drift on analytic paths inside a box wrapped around the camera: no per-frame CPU work.
  const MOTE_VS = [
    'attribute vec4 aSeed;',
    'uniform float uTime, uPx, uSize, uBlink; uniform vec3 uCam, uBox, uDrift;',
    'varying float vA;',
    'void main(){',
    '  float ph = aSeed.w * 6.2831;',
    '  vec3 p = aSeed.xyz * uBox + uDrift * uTime + vec3(sin(uTime * 0.53 + ph) * 0.8, sin(uTime * 0.71 + ph * 1.7) * 0.45, cos(uTime * 0.47 + ph * 2.3) * 0.8);',
    '  vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;',
    '  vec3 wp = uCam + rel;',
    '  vec4 mv = viewMatrix * vec4(wp, 1.0);',
    '  float edge = 1.0 - smoothstep(uBox.x * 0.3, uBox.x * 0.48, length(rel.xz));',
    '  float tw = uBlink > 0.5 ? pow(max(0.0, sin(uTime * (1.1 + aSeed.w * 1.3) + ph * 7.0)), 3.0) : 0.7 + 0.3 * sin(uTime * 1.7 + ph * 5.0);',
    '  vA = edge * tw * smoothstep(0.8, 2.4, length(rel));',
    '  gl_PointSize = clamp(uSize * (0.7 + 0.6 * fract(aSeed.w * 13.7)) * uPx / max(-mv.z, 0.2), 1.0, 40.0);',
    '  gl_Position = projectionMatrix * mv;',
    '}'].join('\n');
  const MOTE_FS = [
    'uniform vec3 uColor; varying float vA;',
    'void main(){ vec2 c = gl_PointCoord - 0.5; float r = 1.0 - dot(c, c) * 4.0; float a = clamp(r, 0.0, 1.0); a *= a * vA;',
    '  gl_FragColor = vec4(uColor, a);',
    '  #include <colorspace_fragment>',
    '}'].join('\n');
  function motes(n, o) {
    const g = new THREE.BufferGeometry(), seed = new Float32Array(n * 4), rnd = G.rng(o.seed || 3);
    for (let i = 0; i < n * 4; i++) seed[i] = rnd();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const box = o.box || [34, 9, 34];
    const u = {
      uTime: { value: 0 }, uPx: { value: 400 }, uSize: { value: o.size || 0.09 }, uBlink: { value: o.blink ? 1 : 0 },
      uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(box[0], box[1], box[2]) },
      uDrift: { value: new THREE.Vector3().fromArray(o.drift || [0.35, 0.08, 0.22]) }, uColor: { value: new THREE.Color(o.color != null ? o.color : 0xfff3b0) },
    };
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.frustumCulled = false; m.renderOrder = 5; m.name = o.blink ? 'fireflies' : 'motes';
    const yOff = o.yOff != null ? o.yOff : 0.6;
    m.userData.tick = cam => {
      u.uTime.value = G.time.elapsed * (G.Save.set.reducedMotion ? 0.5 : 1);
      u.uCam.value.set(cam.position.x, cam.position.y + yOff, cam.position.z);
      u.uPx.value = pxScale(cam);
    };
    m.userData.uni = u;
    return m;
  }
  // Flappers: instanced creatures whose wings fold on the GPU (aWing: -1 left, +1 right, 0 body).
  const FLAP_VS = [
    '#include <common>', '#include <fog_pars_vertex>',
    'attribute float aWing; attribute float aPhase;',
    'uniform float uTime, uFlap, uAmp; uniform vec3 uSunDir;',
    'varying vec3 vCol; varying float vLit;',
    'void main(){',
    '  vec3 p = position;',
    '  float f = sin(uTime * uFlap + aPhase * 6.2831) * uAmp + uAmp * 0.25;',
    '  float ax = abs(p.x);',
    '  p.y += ax * sin(f); p.x = sign(p.x) * ax * cos(f);',
    '  vCol = color;',
    '  #ifdef USE_INSTANCING_COLOR',
    '    vCol *= mix(vec3(1.0), instanceColor, step(0.5, abs(aWing)));',
    '  #endif',
    '  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);',
    '  vec3 n = normalize(mat3(modelMatrix * instanceMatrix) * vec3(-sign(p.x) * sin(f), cos(f), 0.0));',
    '  vLit = 0.72 + 0.28 * abs(dot(n, uSunDir));',
    '  vec4 mvPosition = viewMatrix * wp;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'].join('\n');
  const FLAP_FS = [
    'uniform vec3 uSunCol, uSky; uniform float uExposure;',
    'varying vec3 vCol; varying float vLit;',
    '#include <common>', '#include <fog_pars_fragment>',
    'void main(){',
    '  vec3 c = vCol * mix(uSky, uSunCol, vLit) * uExposure;',
    '  gl_FragColor = vec4(c, 1.0);',
    '  #include <colorspace_fragment>',
    '  #include <fog_fragment>',
    '}'].join('\n');
  function flapMat(flap, amp) {
    const L = G.R.light;
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(u, { uTime: L.uTime, uSunDir: L.uSunDir, uSunCol: L.uSunCol, uSky: L.uSky, uExposure: L.uExposure, uFlap: { value: flap }, uAmp: { value: amp } });
    return new THREE.ShaderMaterial({ uniforms: u, vertexShader: FLAP_VS, fragmentShader: FLAP_FS, vertexColors: true, fog: true, side: THREE.DoubleSide });
  }
  let BFLY = null, BIRD = null;
  function wingGeo(kind) {
    const pos = [], col = [], wing = [];
    const add = (pts, c, w) => { for (const p of pts) { pos.push(p[0], p[1], p[2]); col.push(c[0], c[1], c[2]); wing.push(w); } };
    if (kind === 'bfly') {
      for (const s of [-1, 1]) {
        // fore + hind wing (rounded fans), white so the instance colour tints them; darker rims
        const fore = [[0, 0, 0.02], [s * 0.2, 0.0, 0.16], [s * 0.26, 0, 0.02]], hind = [[0, 0, -0.01], [s * 0.2, 0, -0.02], [s * 0.13, 0, -0.17]];
        add(fore, [1, 1, 1], s); add([[0, 0, 0.02], [s * 0.26, 0, 0.02], [s * 0.18, 0, -0.06]], [0.9, 0.9, 0.9], s); add(hind, [0.95, 0.95, 0.95], s);
      }
      add([[0.018, 0, 0.1], [-0.018, 0, 0.1], [0, 0, -0.1]], [0.16, 0.13, 0.25], 0);
    } else {
      for (const s of [-1, 1]) {
        add([[0, 0, 0.12], [s * 0.55, 0.05, 0.02], [0, 0, -0.1]], [1, 1, 1], s);
        add([[s * 0.55, 0.05, 0.02], [s * 1.0, -0.05, -0.12], [s * 0.3, 0, -0.08]], [0.92, 0.94, 1.0], s);
      }
      add([[0.07, 0, 0.3], [-0.07, 0, 0.3], [0, 0, -0.3]], [0.95, 0.95, 1.0], 0);
      add([[0.1, 0, -0.3], [-0.1, 0, -0.3], [0, 0, -0.15]], [0.9, 0.9, 0.95], 0);
      add([[0.03, 0.02, 0.38], [-0.03, 0.02, 0.38], [0, -0.01, 0.46]], [1.0, 0.75, 0.25], 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
    g.computeBoundingSphere();
    g.userData.shared = true;
    return g;
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  // opts: {heightFn, motes:{count,color,size,box,drift}, fireflies:{count,color,size}, butterflies:{count, colors,
  //        spot(rnd, cam)->{x,z}|null, near: radius}, birds:{count, x, z, r, y, color}, seed}
  T.ambient = function (world, o) {
    o = o || {};
    const q = G.R.q(), pk = q.particles || 1, rnd = G.rng(o.seed || 9), hf = o.heightFn || (() => 0);
    const group = new THREE.Group(); group.name = 'ambient';
    const ticks = [], amb = { group, motes: null, fireflies: null, butterflies: null, birds: null };
    if (o.motes) { const m = motes(Math.max(8, Math.round((o.motes.count || 70) * pk)), o.motes); group.add(m); ticks.push(m.userData.tick); amb.motes = m; }
    if (o.fireflies) { const m = motes(Math.max(8, Math.round((o.fireflies.count || 50) * pk)), Object.assign({ blink: true, color: 0xd8ff7a, size: 0.13, drift: [0.05, 0.03, 0.04], box: [30, 5, 30], yOff: -0.3 }, o.fireflies)); group.add(m); ticks.push(m.userData.tick); amb.fireflies = m; }
    if (o.butterflies) {
      const B = o.butterflies, n = Math.max(3, Math.round((B.count || 10) * (q.props < 0.7 ? 0.6 : 1)));
      if (!BFLY) BFLY = wingGeo('bfly');
      const geo = BFLY.clone(), ph = new Float32Array(n), st = [];
      geo.userData.shared = false;
      const cols = (B.colors || [0xff8ab4, 0xffd23f, 0x7fd8ff, 0xffffff, 0xff9a4c, 0xc2a2ff]).map(h => new THREE.Color(h));
      for (let i = 0; i < n; i++) { ph[i] = rnd(); st.push({ x: 1e9, z: 1e9, a: rnd() * TAU, r: 1.2 + rnd() * 2.2, w: (0.35 + rnd() * 0.35) * (rnd() < 0.5 ? -1 : 1), h: 0.55 + rnd() * 0.6, y: 0, k: rnd() * 10, born: -9, wait: 0 }); }
      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
      const mesh = new THREE.InstancedMesh(geo, flapMat(16, 0.95), n);
      mesh.material.addEventListener('dispose', () => mesh.dispose());
      for (let i = 0; i < n; i++) mesh.setColorAt(i, cols[i % cols.length]);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.name = 'butterflies';
      group.add(mesh); amb.butterflies = mesh;
      const near = B.near || 22;
      ticks.push(cam => {
        const t = G.time.elapsed, cp = cam.position;
        for (let i = 0; i < n; i++) {
          const s = st[i];
          const dx = s.x - cp.x, dz = s.z - cp.z;
          if (dx * dx + dz * dz > near * near) {
            // re-seat near the camera; when there is no meadow around (beach, sea, cliffs) retry a little later
            // instead of searching every frame
            const sp = t < s.wait ? null : B.spot ? B.spot(rnd, cam) : { x: cp.x + (rnd() - 0.5) * near * 1.4, z: cp.z + (rnd() - 0.5) * near * 1.4 };
            if (!sp) { if (t >= s.wait) s.wait = t + 0.5 + rnd() * 0.5; _m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, _m4); continue; }
            s.x = sp.x; s.z = sp.z; s.y = hf(s.x, s.z); s.born = t;
          }
          const a = s.a + t * s.w;
          let px = s.x + Math.cos(a) * s.r + Math.sin(t * 0.9 + s.k) * 0.4, pz = s.z + Math.sin(a) * s.r * 0.8;
          // never flutter right into the lens: keep 1.6 m clear of the camera
          const ex = px - cp.x, ez = pz - cp.z, e2 = ex * ex + ez * ez;
          if (e2 < 2.56) { const k = 1.6 / Math.sqrt(e2 + 1e-4); px = cp.x + ex * k; pz = cp.z + ez * k; }
          const py = s.y + s.h + Math.sin(t * 2.3 + s.k) * 0.18 + Math.abs(Math.sin(t * 7 + s.k)) * 0.06;
          const yaw = Math.atan2(-Math.sin(a) * s.w, Math.cos(a) * s.w * 0.8);
          _e.set(-0.25 + Math.sin(t * 3 + s.k) * 0.15, yaw, Math.sin(t * 1.7 + s.k) * 0.2);
          _q.setFromEuler(_e);
          // a freshly seated butterfly grows in over ~0.6 s rather than popping into view
          const g = clamp((t - s.born) / 0.6, 0, 1);
          _m4.compose(_p.set(px, py, pz), _q, _s.setScalar(g * g * (3 - 2 * g)));
          mesh.setMatrixAt(i, _m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });
    }
    if (o.birds) {
      const Bd = o.birds, n = Bd.count || 7;
      if (!BIRD) BIRD = wingGeo('bird');
      const geo = BIRD.clone(), ph = new Float32Array(n);
      geo.userData.shared = false;
      for (let i = 0; i < n; i++) ph[i] = rnd();
      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
      const mesh = new THREE.InstancedMesh(geo, flapMat(5.5, 0.55), n);
      mesh.material.addEventListener('dispose', () => mesh.dispose());
      const c = new THREE.Color(Bd.color != null ? Bd.color : 0xffffff);
      for (let i = 0; i < n; i++) mesh.setColorAt(i, c);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.name = 'birds';
      group.add(mesh); amb.birds = mesh;
      const offs = []; for (let i = 0; i < n; i++) { const k = Math.ceil(i / 2), sd = i % 2 ? 1 : -1; offs.push({ f: -k * 2.2 + rnd() * 0.6, s: sd * k * 1.9 + rnd() * 0.5, y: rnd() * 1.2, sc: 1.5 + rnd() * 0.5 }); }
      ticks.push(() => {
        const t = G.time.elapsed * (Bd.speed || 0.05), sx = Bd.x || 0, sz = Bd.z || 0, r = Bd.r || 60, y = Bd.y || 34;
        const a = t, fx = -Math.sin(a), fz = Math.cos(a); // tangent of the circle (counter-clockwise)
        for (let i = 0; i < n; i++) {
          const f = offs[i], rr = r + f.s;
          const px = sx + Math.cos(a) * rr + fx * f.f, pz = sz + Math.sin(a) * rr + fz * f.f;
          _e.set(0, Math.atan2(fx, fz), -0.25 + Math.sin(G.time.elapsed * 0.4 + i) * 0.08);
          _q.setFromEuler(_e);
          _m4.compose(_p.set(px, y + f.y + Math.sin(G.time.elapsed * 0.8 + i * 1.3) * 0.6, pz), _q, _s.setScalar(f.sc));
          mesh.setMatrixAt(i, _m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });
    }
    if (!group.children.length) return null;
    world.add(group);
    hook(world.scene, cam => { for (let i = 0; i < ticks.length; i++) ticks[i](cam); });
    if (G.R.camera) for (const f of ticks) f(G.R.camera);
    return amb;
  };

  // ------------------------------------------------------------------ water
  // Depth map: R = (waterY - ground) / 6 m, clamped (0 on land); the water shader turns it into
  // transparent turquoise shallows, a bright foam lip at the waterline and foam bands rolling ashore.
  // G = how far the ground stands above the water, / 2 m (0 at or below the water), taken as the lowest ground within
  // two texels (so it is 0 all along every shore, where the terrain mesh may sit lower than heightFn between its
  // vertices): the shader discards the sea wherever the land is clearly above its
  // highest wave. The sea can then never draw over land, whatever the depth buffer does — with a 16-bit depth buffer
  // (WebGL1 render targets, some phones) the sea sheet 1 m under Fizzport's plaza z-fought with the floor beyond
  // ~60 m and showed as large pale foam wedges (its foam is solid white under dry land).
  let DEEP1 = null;
  function deepTex() {
    if (DEEP1) return DEEP1;
    DEEP1 = new THREE.DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1, THREE.RGBAFormat);
    DEEP1.needsUpdate = true; DEEP1.userData.shared = true;
    return DEEP1;
  }
  function depthTex(o, y) {
    const D = o.depth, S = D.size || 256, w = D.maxX - D.minX, d = D.maxZ - D.minZ;
    const data = new Uint8Array(S * S * 4), hs = new Float32Array(S * S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) hs[j * S + i] = D.heightFn(D.minX + (i + 0.5) / S * w, D.minZ + (j + 0.5) / S * d);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const h = hs[j * S + i], v = Math.round(clamp((y - h) / 6, 0, 1) * 255), k = (j * S + i) * 4;
      let lo = h;
      for (let b = Math.max(0, j - 2); b <= Math.min(S - 1, j + 2); b++) for (let a = Math.max(0, i - 2); a <= Math.min(S - 1, i + 2); a++) lo = Math.min(lo, hs[b * S + a]);
      data[k] = v; data[k + 1] = Math.round(clamp((lo - y) / 2, 0, 1) * 255); data[k + 2] = v; data[k + 3] = 255;
    }
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
    return { tex: t, rect: new THREE.Vector4(D.minX, D.minZ, 1 / w, 1 / d) };
  }
  const WATER_FS = [
    'uniform vec3 uShallow, uDeep, uSunDir, uFoam; uniform float uOpacity, uTime; uniform sampler2D uDepth; uniform vec4 uDRect;',
    'varying vec3 vWP; varying float vWave;',
    '#include <common>', '#include <fog_pars_fragment>',
    'void main(){',
    '  vec3 dv = cameraPosition - vWP; float dist = length(dv); vec3 v = dv / dist;',
    '  vec2 p = vWP.xz;',
    '  float fres = pow(1.0 - max(v.y, 0.0), 2.0);',
    '  float near = 1.0 - smoothstep(25.0, 140.0, dist);',
    // ripple normal from three analytic waves (glints), calmed with distance against shimmer
    '  vec2 d1 = vec2(0.8, 0.6), d2 = vec2(-0.5, 0.866), d3 = vec2(0.17, -0.985);',
    '  vec2 gr = d1 * cos(dot(p, d1) * 1.7 + uTime * 2.1) * 0.11 + d2 * cos(dot(p, d2) * 2.3 - uTime * 1.7) * 0.09 + d3 * cos(dot(p, d3) * 3.3 + uTime * 2.7) * 0.06;',
    '  vec3 n = normalize(vec3(-gr.x * near, 1.0, -gr.y * near));',
    '  vec2 dl = texture2D(uDepth, (p - uDRect.xy) * uDRect.zw).rg;',
    // (never over land: the ground is in front of the sea there — see depthTex)
    '  if (dl.g * 2.0 > max(vWave, 0.0) + 0.3) discard;',
    '  float dep = dl.r * 6.0;',
    '  vec3 col = mix(uShallow, uDeep, clamp(0.35 + fres * 0.6, 0.0, 1.0));',
    '  float sh = 1.0 - smoothstep(0.0, 3.6, dep);',
    '  col = mix(col, uShallow * 1.1 + vec3(0.03, 0.05, 0.04), sh * 0.8);',
    // stylised swirl lines drifting on the surface
    '  float sw = sin(p.x * 0.55 + sin(p.y * 0.42 + uTime * 0.5) * 1.6 + uTime * 0.45) * sin(p.y * 0.5 + sin(p.x * 0.37 - uTime * 0.6) * 1.5 - uTime * 0.3);',
    '  float swirl = smoothstep(0.86, 0.97, sw) * near * 0.24;',
    '  float crest = smoothstep(0.12, 0.2, vWave) * 0.22;',
    // shore: foam lip where the water meets the land, bands rolling in over the shallows
    '  float lip = 1.0 - smoothstep(0.04, 0.38, dep);',
    '  float roll = sin(dep * 4.4 - uTime * 1.9 + sin(p.x * 0.31 + p.y * 0.23) * 1.3);',
    '  float bands = smoothstep(0.55, 0.85, roll) * (1.0 - smoothstep(0.25, 1.8, dep));',
    '  float foam = clamp(lip * 0.95 + bands * 0.7 + swirl + crest, 0.0, 1.0);',
    '  col = mix(col, uFoam, foam);',
    '  float sparkle = step(0.988, fract(sin(dot(floor(p * 1.5 + uTime * 0.5), vec2(12.9898, 78.233))) * 43758.5453)) * 0.25 * near;',
    '  vec3 h = normalize(uSunDir + v); float nh = max(dot(n, h), 0.0);',
    '  col += vec3(smoothstep(0.3, 0.65, pow(nh, 420.0)) * 0.95 + pow(nh, 70.0) * 0.12 + sparkle);',
    '  float alpha = mix(uOpacity * 0.55, uOpacity, smoothstep(0.0, 2.4, dep));',
    '  gl_FragColor = vec4(col, max(alpha, foam * 0.92));',
    '  #include <colorspace_fragment>',
    '  #include <fog_fragment>',
    '}'].join('\n');
  // Sea surface grid with an island-sized fine core: grid lines every `step` m inside [-inner, inner], then spacing that
  // grows toward the edge (one tensor grid, so the waves never open T-junction cracks), and cells whose corners and
  // centre are all over dry land (land(x, z) true) left out — water under the island is never seen, and those cells were
  // the biggest triangles in view: under SwiftShader, sea triangles that cross the camera's near plane while standing on
  // the plaza drew as large pale foam wedges over the floor.
  function seaGeo(size, inner, step, land) {
    const half = size / 2, xs = [];
    const nIn = Math.max(1, Math.round(inner * 2 / step));
    for (let i = 0; i <= nIn; i++) xs.push(-inner + (i * 2 * inner) / nIn);
    let x = inner, d = step;
    while (x < half - 1e-3) { d = Math.min(d * 1.35, 60); x = Math.min(half, x + d); if (half - x < d * 0.4) x = half; xs.push(x); xs.unshift(-x); }
    const n = xs.length, pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), idx = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = (j * n + i) * 3; pos[k] = xs[i]; pos[k + 2] = xs[j]; nor[k + 1] = 1; }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const x0 = xs[i], x1 = xs[i + 1], z0 = xs[j], z1 = xs[j + 1];
      if (land && land(x0, z0) && land(x1, z0) && land(x0, z1) && land(x1, z1) && land((x0 + x1) / 2, (z0 + z1) / 2)) continue;
      const a = j * n + i, b = a + 1, c = a + n, e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  T.seaGeo = seaGeo;
  // Animated toon water. opts: {size, y, shallow, deep, foam, segments, opacity, depth:{heightFn, minX,maxX,minZ,maxZ, size},
  //   core:{inner, step, land(x, z)} (seaGeo: fine core around an island, no cells under dry land; replaces segments)}
  T.water = function (opts) {
    opts = Object.assign({ size: 400, y: 0, shallow: 0x7fe8e0, deep: 0x1489b8, foam: 0xf4ffff, segments: 64, opacity: 0.88 }, opts || {});
    // a sea (not a fountain basin or a goo pool): the terrain shore band follows its waterline (see setSurface)
    if (opts.size >= 200) { SURF.uSurfB.value.z = opts.y; SURF.uSurfB.value.w = FOAM; }
    const geo = opts.core ? seaGeo(opts.size, opts.core.inner, opts.core.step, opts.core.land) : new THREE.PlaneGeometry(opts.size, opts.size, opts.segments, opts.segments).rotateX(-Math.PI / 2);
    const dp = opts.depth && opts.depth.heightFn ? depthTex(opts, opts.y) : null;
    const uni = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(uni, {
      uTime: { value: 0 }, uShallow: { value: new THREE.Color(opts.shallow) }, uDeep: { value: new THREE.Color(opts.deep) }, uFoam: { value: new THREE.Color(opts.foam) },
      uOpacity: { value: opts.opacity }, uSunDir: G.R.light.uSunDir,
      uDepth: { value: dp ? dp.tex : deepTex() }, uDRect: { value: dp ? dp.rect : new THREE.Vector4(0, 0, 1, 1) },
    });
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, fog: true, depthWrite: false,
      vertexShader: [
        '#include <common>', '#include <fog_pars_vertex>',
        'uniform float uTime; varying vec3 vWP; varying float vWave;',
        'void main(){ vec3 p = position; float w = sin(p.x*0.18 + uTime*1.3)*0.12 + sin(p.z*0.23 + uTime*1.1)*0.1 + sin((p.x+p.z)*0.5 + uTime*2.2)*0.04; p.y += w; vWave = w;',
        ' vec4 wp = modelMatrix * vec4(p,1.0); vWP = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;',
        ' #include <fog_vertex>',
        '}'].join('\n'),
      fragmentShader: WATER_FS,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = opts.y;
    m.renderOrder = 2;
    m.userData.depthMap = dp ? dp.tex : null;
    if (dp) mat.addEventListener('dispose', () => dp.tex.dispose()); // the depth map is a uniform, not a .map
    m.onBeforeRender = () => { uni.uTime.value = G.time.elapsed; };
    return m;
  };
})(window.G);

}).call(window); } catch (e) { console.error('[module 11b_terrain.js]', e); }
// ---- 12_player.js
try { (function () {
// First-person player controller: movement (sprint/slide/double-jump/glide/mantle/dash),
// look with aim assist + auto-fire, weapons & gadget hooks, viewmodel animation, camera FX.
(function (G) {
  const V3 = THREE.Vector3;
  const U = G.util;
  const _f = new V3(), _r = new V3(), _a = new V3(), _b = new V3(), _c = new V3();
  const DEG = Math.PI / 180;

  // Movement tuning — GDD §4.1.
  const BASE = {
    walk: 5.0, sprint: 7.5, crouch: 2.5, accel: 60, brake: 50, airK: 0.35,
    jumpV: 7.0, doubleJumpV: 6.0, gravUp: 20, gravDown: 27, shortHop: 0.55, terminal: 28,
    coyote: 0.12, buffer: 0.15,
    slideMin: 6.0, slideBoost: 3.0, slideCap: 10.5, slideFriction: 6, slideMax: 1.1, slideBoostCd: 1.2,
    hopKeep: 0.95, hopDecay: 0.04,
    vaultMax: 1.0, mantleMin: 0.5, mantleMax: 2.4, vaultT: 0.30, climbT: 0.50, mantleBoostV: 8,
    wallKickUp: 5, wallKickOut: 3, wallKickWindow: 0.2,
    dashDist: 5, dashTime: 0.18, dashIframes: 0.2, dashCharges: 2, dashRecharge: 2.5,
    glideFall: 2.5, glideSpeed: 8,
    jetAccel: 26, jetMaxUp: 5, jetFuel: 1.6, jetRefill: 2.0, jetDelay: 0.3,
    hpRegenDelay: 6,
  };
  G.PLAYER_BASE = BASE;

  // Damped spring s = {x, v} toward `to`: natural frequency f (Hz), damping ratio z (1 = critically
  // damped, < 1 overshoots a little). Sub-stepped semi-implicit Euler (≤ 4 ms steps), so it is stable
  // and practically frame-rate independent at any dt. Callers add impulses to s.v.
  // (no return value — callers read s.x: a double returned from a call that is not inlined is a fresh heap number, and
  // the camera / viewmodel step ~30 springs a frame; the step count clamp is a ternary for the same reason)
  function spring(s, to, f, z, dt) {
    if (!(dt > 0)) return;
    const w = 6.2831853 * f, k = w * w, c = 2 * z * w;
    const n0 = Math.ceil(dt * 250), n = n0 < 16 ? n0 : 16, h = dt / n;
    let x = s.x, v = s.v;
    for (let i = 0; i < n; i++) { v += (k * (to - x) - c * v) * h; x += v * h; }
    s.x = x; s.v = v;
  }
  const sp0 = x => { const s = { x: -0, v: -0 }; if (x) s.x = x; return s; };   // (doubles from the start: see Actor)
  // Critically damped impulse that peaks at `peak` (1/w seconds later) for a spring of frequency f.
  const peakV = (peak, f) => peak * 2.71828 * 6.2831853 * f;
  const easeOutBack = k => { const u = k - 1; return 1 + 2.55 * u * u * u + 1.55 * u * u; };
  // Springs zeroed on a teleport (eye height, FOV and the bob amplitude keep easing on their own).
  const FEEL_RESET = ['land', 'landP', 'lift', 'flinch', 'roll', 'swX', 'swY', 'mvX', 'mvY', 'mvZ', 'mvP', 'mvR', 'kZ', 'kP', 'kR', 'kY'];
  G.feelSpring = spring;

  // Field of view (GDD §4.2): the setting is the HORIZONTAL FOV (G.Save.set.fovH, 85–110°, default 100°),
  // converted to the vertical camera FOV for the current aspect and clamped to 55–75°. On an 844×390 phone
  // 100° horizontal is 57.7° vertical (the old setting drove a vertical 75° = 118° horizontal there, which
  // made robots at fighting range smaller than the crosshair). Older saves keep their legacy vertical `fov`
  // value untouched (modes that still read it); a player who had moved that slider (60–95°, default 75°)
  // keeps the preference once, as the same horizontal offset from the default at 16:9 (fov 60 -> 85°,
  // 70 -> 95°, 80 -> 105°, 95 -> 110°). The fovHMig flag makes that a one-time carry-over per save.
  const FOV_H = [85, 110], FOV_V = [55, 75];
  function migrateFov(s) {
    s.fovHMig = 1;
    if (typeof s.fov === 'number' && s.fov !== 75 && s.fovH === 100) {
      s.fovH = Math.round(U.clamp(100 + G.fovH(s.fov) - G.fovH(75), FOV_H[0], FOV_H[1]));
    }
    if (G.Save.save) G.Save.save();
  }
  G.fovV = function (aspect, hfov) {
    const s = G.Save && G.Save.data ? G.Save.set : null;
    if (s && !s.fovHMig) migrateFov(s);
    let h = hfov != null ? hfov : (s && typeof s.fovH === 'number' ? s.fovH : 100);
    h = U.clamp(h, FOV_H[0], FOV_H[1]);
    const a = aspect > 0 ? aspect : (G.R && G.R.w > 0 && G.R.h > 0 ? G.R.w / G.R.h : 16 / 9);
    return U.clamp(2 * Math.atan(Math.tan(h * DEG / 2) / a) / DEG, FOV_V[0], FOV_V[1]);
  };
  // Horizontal FOV the player actually sees for a given vertical one (for UI / tests).
  G.fovH = (vfov, aspect) => 2 * Math.atan(Math.tan(vfov * DEG / 2) * (aspect > 0 ? aspect : 16 / 9)) / DEG;
  // Weapon swap timing (GDD §2.7): the old gun drops for HOLSTER_T, then the new one rises for RAISE_T.
  // Firing unlocks EQUIP_LOCK s before the raise ends (0.1 + 0.1 = 0.2 s after the press, as before the drop
  // existed; the easeOutBack raise is already at its overshoot by then).
  const HOLSTER_T = 0.1, RAISE_T = 0.22, EQUIP_LOCK = 0.12;
  // (contract ids may be one-shots or loops; checked only when a sound starts, never per frame)
  const has = id => !!(G.Audio && ((G.Audio.has && G.Audio.has(id)) || (G.Audio.loops && G.Audio.loops().indexOf(id) >= 0)));

  class Player extends G.Actor {
    // opts: {stats, loadout:[{id, level, mods}], spawn:V3, yaw, noWeapons, inkTeam}
    constructor(world, opts) {
      opts = opts || {};
      const st = Object.assign({ maxHp: 100, maxShield: 50, speedMult: 1, jumpMult: 1, doubleJump: true, glide: false, jetpack: false, magnetMult: 1, armor: 0, regenDelay: 4, shieldRegen: 25, dashCharges: BASE.dashCharges, dashRecharge: BASE.dashRecharge, mantle: true, hpRegen: 5, hpRegenDelay: BASE.hpRegenDelay, hpRegenStep: null, wallKick: true, airJumps: 1, hopV: 5, jetFuel: BASE.jetFuel, jetAccel: BASE.jetAccel, jetMaxUp: BASE.jetMaxUp, jetRefill: BASE.jetRefill, glideFall: BASE.glideFall, glideSpeed: BASE.glideSpeed, slideBoost: BASE.slideBoost, slideCap: BASE.slideCap, slideLenMult: 1, slideJumpMult: 1, knockbackMult: 1, medipump: null }, opts.stats || {});
      super(world, { r: 0.4, h: 1.8, team: opts.team != null ? opts.team : 0, hp: st.maxHp, shield: st.maxShield, kind: 'player' });
      this.isPlayer = true;
      this.stats = st;
      this.armor = st.armor;
      this.knockbackMult = st.knockbackMult;
      this.medi = st.medipump ? { charges: st.medipump.charges || 2, t: 0, healLeft: 0 } : null;
      this.magnetMult = st.magnetMult;
      this.yaw = -0; this.yaw = opts.yaw || 0; this.pitch = -0;   // (-0 / two-step: double fields from the start, see Actor)
      this.spawn = (opts.spawn || new V3()).clone();
      this.pos.copy(this.spawn);
      this.safePos = this.pos.clone();
      this.eyeH = 1.6; this.eyeCur = 1.6;
      this.coyote = -0; this.jumpBuf = -0; this.jumps = 0;
      this.sliding = -0; this.slideCd = -0; this.crouching = false;
      this.mantling = null; this.dashT = -0; this.dashCharges = st.dashCharges; this.dashRe = -0; this.airDashed = false; this.iframes = -0;
      this.sprinting = false; this.jetting = false; this.near = null; this.autoOn = -0; this.autoOff = -0; this.autoFiring = false; this.fovBase = -0;   // (set per frame; declared up front: one hidden class)
      this.gliding = false; this.jetFuel = -0; this.jetFuel = st.jetFuel || BASE.jetFuel; this.jetT = -0; this.wallT = 9.5; this.wallKicked = false; this.hops = 0; this.lastSlideBoost = -9.5; this.jumpHeld = false;
      this.inputEnabled = true;
      this.weapons = [];
      this.wi = 0;
      this.equipT = -0; this.holsterT = -0; this._holsterVm = null; this._holsterFrom = -0; this.swapLock = false;
      this._regenOn = false; this._gearLoop = null; this._gearLoopId = null;
      this.recoil = -0; this.recoilYaw = -0;
      this.vmKick = -0;
      this.bobPhase = -0; this.stepDist = -0;
      this.swayX = -0; this.swayY = -0;
      this.fovKick = -0;
      this.respawnT = -0;
      this.target = null; this.targetAngle = 99.5;
      this.gadgetCd = -0; this.gadget = opts.gadget || null;
      this.ability = opts.ability || 'dash';
      this.swimming = false;     // set by ink mode
      this.speedMod = -0; this.speedMod = 1;   // set by modes (ink slow etc.)
      this.lastFireT = -9.5;
      this.kills = 0; this.damageDealt = 0.5; this.damageDealt = 0;   // (displayed: +0, never -0; the 0.5 makes the field a double)
      this.hidden = false;
      this.camRoll = -0;
      this.landKick = -0;
      this.critY = 1.45;
      this.noWeapons = !!opts.noWeapons;
      this.zoom = -0; this.zoomCur = -0; this.zoom = 1; this.zoomCur = 1;
      // Camera + viewmodel feel state: springs {x, v} and trackers (see _camera / _viewmodel).
      this._fx = {
        eye: sp0(1.6), fov: sp0(), bobA: sp0(), roll: sp0(),
        land: sp0(), landP: sp0(), lift: sp0(), flinch: sp0(),
        swX: sp0(), swY: sp0(), mvX: sp0(), mvY: sp0(), mvZ: sp0(), mvP: sp0(), mvR: sp0(),
        kZ: sp0(), kP: sp0(), kR: sp0(), kY: sp0(),
        spr: sp0(), sld: sp0(), air: sp0(), cro: sp0(), mnt: sp0(), hot: sp0(),
        step: -0, lx: -0, ly: null, lz: -0, wasG: false, onT: false, lyaw: -0, lpit: -0, wy: -0, wp: -0, vr: -0, vf: -0,
        stride: -0, lastStep: -0, slideSide: 1,
      };
      this._fx.lyaw = this.yaw;
      this.vmMotion = { x: -0, y: -0, roll: -0, speed: -0 }; // gun offset from rest, read by weapon parts (liquid slosh)
      this._wctx = { world, owner: this, firing: false, fireP: false, eye: null, eyeDir: null, origin: null, dir: null, aimPoint: null, target: null, team: this.team };   // (see _ctx)
      this.hopT = 0; this._parked = null;   // (set later; declared here: one hidden class)
      this.lastInkT = -9.5; this.gooDmg = -0;   // (ink modes write these mid-match: declared (as doubles) so no map transition lands mid-fight)
      this.usesMoveMult = true; // weapon.moveMult is applied here, not folded into speedMod
      if (!this.noWeapons) this.setLoadout(opts.loadout || []);
      this.mesh = new THREE.Group(); // invisible body anchor (blob shadow for 3rd-person views)
    }
    setLoadout(list) {
      this.weapons = [];
      for (const w of list) {
        if (!w || !G.Weapons || !G.Weapons.create) continue;
        const inst = G.safe('weapon create', () => G.Weapons.create(w.id, w.level || 1, w.mods || [], this, { tune: w.tune, xp: w.xp, ammo: w.ammo, ammoMult: this.stats && this.stats.ammoMult }));
        if (inst) this.weapons.push(inst);
      }
      // Build every viewmodel now (behind the loading screen) so the first swap mid-fight can't hitch.
      for (const w of this.weapons) if (!w.vm && w.buildViewmodel) w.vm = G.safe('vm', () => w.buildViewmodel());
      this.wi = 0;
      this.equip(0, true);
    }
    // Called by equip() while a mode is loading (modes that assign `weapons` themselves get it too):
    // build every viewmodel and park the holstered ones, hidden, under the viewmodel root. The load-
    // time warm-up draws hidden objects as well, so their meshes are uploaded and their shaders
    // compiled now rather than on the first swap (a weapon with its own material variant would
    // otherwise compile mid-fight). The first frame takes them out again (_unpark).
    _prewarmVms() {
      const cur = this.weapon && this.weapon.vm;
      this._parked = null;
      for (const w of this.weapons) {
        if (!w.vm && w.buildViewmodel) w.vm = G.safe('vm', () => w.buildViewmodel());
        if (!w.vm || w.vm === cur || w.vm.parent) continue;
        w.vm.visible = false; G.R.vmRoot.add(w.vm);
        (this._parked || (this._parked = [])).push(w.vm);
      }
    }
    _unpark() {
      const cur = this.weapon && this.weapon.vm, vr = G.R.vmRoot;
      for (const r of this._parked) if (r !== cur) { if (r.parent === vr) vr.remove(r); r.visible = true; }
      this._parked = null;
    }
    get weapon() { return this.weapons[this.wi] || null; }
    // Swapping: the weapon logic (HUD, ammo, crosshair) switches at once; the viewmodel first drops the old
    // gun out of view (HOLSTER_T, eased in) and then raises the new one (RAISE_T, easeOutBack). Another swap
    // during the drop just retargets it, so scrolling through the wheel keeps the gun down until you stop.
    equip(i, instant) {
      if (!this.weapons.length) { G.R.vmRoot.clear(); G.R.showViewmodel = false; return; }
      i = ((i % this.weapons.length) + this.weapons.length) % this.weapons.length;
      const prev = this.weapon;
      if (prev && prev.onUnequip) prev.onUnequip();
      this.wi = i;
      const w = this.weapon;
      if (w && !w.vm && w.buildViewmodel) w.vm = G.safe('vm', () => w.buildViewmodel());
      if (w && w.onEquip) w.onEquip();
      const cur = G.R.vmRoot.children[0] || null;
      if (instant || !cur || !cur.visible) {
        this.holsterT = 0; this._holsterVm = null;
        this._showVm(instant);
      } else if (!(this.holsterT > 0)) {
        // start the drop with whatever gun is in the hands right now (a raise in progress drops from where it is)
        this.holsterT = HOLSTER_T; this._holsterVm = cur;
        this._holsterFrom = this.equipT > 0 ? U.clamp(this.equipT / RAISE_T, 0, 1) : 0;
        this.equipT = 0;
        const F = this._fx; F.kZ.x = F.kZ.v = F.kP.x = F.kP.v = 0;
      }
      G.R.showViewmodel = true;
      if (G.Game && G.Game._switching) this._prewarmVms();
      G.bus.emit('weapon-equip', w);
    }
    // Put the current weapon's viewmodel in the hands and start its raise.
    _showVm(instant) {
      const w = this.weapon;
      G.R.vmRoot.clear();
      if (w && w.vm) { w.vm.visible = true; G.R.vmRoot.add(w.vm); }
      this.equipT = instant ? 0 : RAISE_T;
      if (!instant) { const F = this._fx; F.kR.v += (Math.random() < 0.5 ? -1 : 1) * 1.6; F.kZ.x = F.kZ.v = F.kP.x = F.kP.v = 0; }
      if (!instant && G.Audio) G.Audio.sfx('equip');
    }
    look(dx, dy) {
      const s = G.Save.set;
      const touch = G.input.device === 'touch';
      let k = (touch ? 0.0052 : 0.0022) * s.sens;
      // Aim assist slowdown near targets (touch and gamepad; the mouse stays raw).
      if ((touch || G.input.device === 'gamepad') && this.target && this.targetAngle < 6 * DEG) k *= 1 - 0.38 * s.aimAssist;
      k /= this.zoomCur; // finer aim while zoomed
      this.yaw -= dx * k;
      this.pitch -= dy * k * (s.invertY ? -1 : 1);
      this.pitch = U.clamp(this.pitch, -1.5, 1.5);
    }
    // Weapons with scopes call this (1 = no zoom, 2 = 2x).
    setZoom(f) { this.zoom = Math.max(1, f || 1); }
    forward(out) { return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)); }
    eyePos(out) { return out.set(this.pos.x, this.pos.y + this.eyeCur, this.pos.z); }

    update(dt) {
      const inp = G.input;
      const world = this.world;
      const can = this.inputEnabled && !G.UI.anyOpen() && this.alive;
      this.applyStatus(dt);
      if (!this.alive) { this._deadUpdate(dt); this._audioTick(false); this._camera(dt); return; }
      if (can) this.look(inp.lookDX, inp.lookDY);
      this._findTarget();
      this._assist(dt, can && inp.fire);

      // ----- movement intent -----
      const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
      const mx = can ? inp.move.x : 0, my = can ? inp.move.y : 0;
      const wantX = mx * cosY - my * sinY;   // world-space wish dir (x right, -z forward)
      const wantZ = -mx * sinY - my * cosY;
      const wishLen = Math.min(1, Math.hypot(mx, my));
      const st = this.stats;
      const sprinting = can && (inp.sprint || (G.input.device === 'touch' && wishLen > 0.9)) && my > 0.4 && !this.crouching && this.sliding <= 0;
      const wm = this.weapon && this.weapon.moveMult ? this.weapon.moveMult : 1;
      let maxSpeed = (sprinting ? BASE.sprint * (this.weapon && this.weapon.def && this.weapon.def.heavy ? 0.9 : 1) : BASE.walk) * st.speedMult * this.speedMod * wm * (this.slowK || 1);
      if (this.crouching && this.sliding <= 0) maxSpeed = BASE.crouch * st.speedMult;
      this.sprinting = sprinting;
      const t = world.time;

      // timers
      this.coyote -= dt; this.jumpBuf -= dt; this.gadgetCd -= dt; this.iframes -= dt; this.wallT += dt;
      if (this.dashCharges < st.dashCharges) { this.dashRe += dt; if (this.dashRe >= st.dashRecharge) { this.dashRe = 0; this.dashCharges++; } }
      if (can && inp.jumpP) this.jumpBuf = BASE.buffer;
      if (this.grounded) { this.coyote = BASE.coyote; this.jumps = 0; this.airDashed = false; this.wallKicked = false; }
      if (this.hitWall && !this.grounded) this.wallT = 0;

      // ----- mantle -----
      if (this.mantling) {
        const m = this.mantling; m.t += dt;
        const k = Math.min(1, m.t / m.dur);
        this.pos.lerpVectors(m.from, m.to, U.smoothstep(0, 1, k));
        if (k < 0.65) this.pos.y = U.lerp(m.from.y, m.to.y + 0.1, U.smoothstep(0, 0.65, k));
        this.vel.set(0, 0, 0);
        // Mantle-boost: jump during the last 0.15 s launches forward.
        if (can && inp.jumpP && m.dur - m.t < 0.15) m.boost = true;
        if (k >= 1) {
          this.mantling = null;
          const sp = m.boost ? BASE.mantleBoostV : 3;
          this.vel.set(m.dx * sp, m.boost ? 3.5 : 0, m.dz * sp);
          if (m.boost) { this.fovKick = 8; this._fx.mvZ.v += 0.8; if (G.Audio) G.Audio.sfx('dash'); }
        }
        this.jetting = this.gliding = false;
        this._audioTick(this._regenOn);
        this._weapons(dt, can); this._camera(dt);
        return;
      }

      const v = this.vel;
      const ground = this.grounded;
      const hs0 = Math.hypot(v.x, v.z);
      // ----- slide: crouch on the ground at speed -----
      if (can && inp.slideP && ground && !this.swimming && this.sliding <= 0 && hs0 >= BASE.slideMin * 0.92) {
        let ns = hs0;
        if (t - this.lastSlideBoost >= BASE.slideBoostCd) { ns = Math.max(hs0, Math.min(st.slideCap, hs0 + st.slideBoost)); this.lastSlideBoost = t; }
        const k = ns / (hs0 || 1); v.x *= k; v.z *= k;
        this.sliding = BASE.slideMax * st.slideLenMult;
        this._fx.slideSide = mx >= 0 ? 1 : -1; this._fx.mvY.v -= 0.6;
        this.fovKick = 8; if (G.Audio) G.Audio.sfx('slide');
        world.fx.burst(_a.set(this.pos.x, this.pos.y + 0.1, this.pos.z), 0xffffff, 6, 3, 0.4, 0.5, { normal: true, alpha: 0.5, grav: -1 });
      }
      this.crouching = can && inp.slide && ground && !this.swimming && this.sliding <= 0;
      if (this.sliding > 0) {
        this.sliding -= dt;
        const hs = Math.hypot(v.x, v.z);
        if (ground) {
          const nd = Math.max(0, hs - BASE.slideFriction * dt);
          const k = hs > 0 ? nd / hs : 0; v.x *= k; v.z *= k;
        } else this.sliding = Math.max(this.sliding, 0.05);
        // light steering along the slide
        if (hs > 0.1 && wishLen > 0.1) {
          const turn = U.clamp((v.x * wantZ - v.z * wantX) / hs, -1, 1) * -1.6 * dt;
          const c = Math.cos(turn), sn = Math.sin(turn); const nx = v.x * c - v.z * sn; v.z = v.x * sn + v.z * c; v.x = nx;
        }
        if ((ground && hs < BASE.walk * 0.9) || this.sliding <= 0 || (can && !inp.slide && G.input.device === 'desktop' && this.sliding < BASE.slideMax * st.slideLenMult - 0.25)) this.sliding = 0;
      } else if (this.dashT > 0) {
        this.dashT -= dt;
        if (this.dashT <= 0) { const hs = Math.hypot(v.x, v.z); const lim = Math.max(maxSpeed, BASE.walk); if (hs > lim) { v.x *= lim / hs; v.z *= lim / hs; } }
      } else if (ground) {
        // ----- ground: accelerate toward wish velocity, brake when idle -----
        const tx = wantX * maxSpeed * wishLen, tz = wantZ * maxSpeed * wishLen;
        const dx = tx - v.x, dz = tz - v.z, dl = Math.hypot(dx, dz);
        const rate = (wishLen > 0.05 ? BASE.accel : BASE.brake) * dt;
        if (dl <= rate) { v.x = tx; v.z = tz; } else { v.x += dx / dl * rate; v.z += dz / dl * rate; }
      } else {
        // ----- air: 35% control, speed above walk is preserved -----
        if (wishLen > 0.05) {
          const hs = Math.hypot(v.x, v.z);
          const a = BASE.accel * BASE.airK * dt;
          v.x += wantX * a * wishLen; v.z += wantZ * a * wishLen;
          const nh = Math.hypot(v.x, v.z);
          const lim = Math.max(hs, maxSpeed);
          if (nh > lim) { v.x *= lim / nh; v.z *= lim / nh; }
        }
      }

      // ----- jumps: ground, coyote, wall-kick, double -----
      if (this.jumpBuf > 0 && can) {
        if (this.coyote > 0 && !this.swimming) {
          const keep = this.sliding > 0 ? st.slideJumpMult : (sprinting ? BASE.hopKeep : 1);
          const decay = Math.max(0.7, 1 - this.hops * BASE.hopDecay);
          v.x *= keep * decay; v.z *= keep * decay;
          v.y = BASE.jumpV * st.jumpMult;
          this.hops = Math.min(8, this.hops + 1); this.hopT = t;
          this.sliding = 0; this.coyote = 0; this.jumpBuf = 0; this.jumps = 1; this.grounded = false; this.jumpHeld = true;
          this._feelJump(1);
          if (G.Audio) G.Audio.sfx('jump');
        } else if (!this.grounded && !this.swimming && this._tryMantle(wantX, wantZ, true)) {
          // Climbing a ledge beats wall-kicking off it.
        } else if (!this.grounded && st.wallKick && this.wallT < BASE.wallKickWindow && !this.wallKicked && this.wallN) {
          v.y = BASE.wallKickUp + 1.5; v.x += this.wallN.x * BASE.wallKickOut; v.z += this.wallN.z * BASE.wallKickOut;
          this.wallKicked = true; this.jumpBuf = 0; this.jumpHeld = true;
          this._feelJump(1.2);
          world.fx.burst(_a.set(this.pos.x, this.pos.y + 0.9, this.pos.z), 0xffffff, 8, 3, 0.3, 0.4, { normal: true, alpha: 0.6 });
          if (G.Audio) G.Audio.sfx('jump2');
        } else if (st.doubleJump && this.jumps < 1 + st.airJumps && !this.swimming) {
          if (!this._tryMantle(wantX, wantZ, true)) {
            // Second jump uses the double-jump speed; Spring Sneakers add a weaker third hop.
            v.y = (this.jumps >= 2 ? st.hopV : BASE.doubleJumpV * st.jumpMult);
            this.jumps = Math.max(2, this.jumps + 1); this.jumpBuf = 0; this.jumpHeld = true;
            this._feelJump(1.3);
            if (wishLen > 0.1) { const hs = Math.hypot(v.x, v.z); const sp = Math.max(hs, maxSpeed * 0.9); v.x = wantX * sp; v.z = wantZ * sp; }
            world.fx.ring(_a.set(this.pos.x, this.pos.y, this.pos.z), 1.2, 0x9ff6ff, 0.3);
            if (G.Audio) G.Audio.sfx('jump2');
          }
        }
      }
      if (this.grounded && t - (this.hopT || 0) > 0.4) this.hops = 0;
      // Short hop: releasing jump while rising cuts the ascent.
      if (this.jumpHeld && !(can && inp.jump)) { if (v.y > 0) v.y *= BASE.shortHop; this.jumpHeld = false; }
      if (v.y <= 0) this.jumpHeld = false;
      // ----- gear: Puff Pack jetpack and Glide Wings -----
      this.gliding = false; this.jetting = false;
      if (!this.grounded && can && inp.jump && this.jumps >= 2 && !this.jumpHeld) {
        if (st.jetpack && this.jetFuel > 0) {
          this.jetFuel -= dt; this.jetting = true;
          v.y = Math.min(st.jetMaxUp, v.y + st.jetAccel * dt);
          if (Math.random() < 0.6) world.fx.spawn(_a.set(this.pos.x, this.pos.y + 0.4, this.pos.z), _b.set(U.rand(-1, 1), -4, U.rand(-1, 1)), 0xffd27a, 0.35, 0.35, _jetO);
        } else if (st.glide && v.y < -st.glideFall) {
          v.y = -st.glideFall; this.gliding = true;
          const hs = Math.hypot(v.x, v.z);
          if (wishLen > 0.1 && hs < st.glideSpeed) { v.x += wantX * 10 * dt; v.z += wantZ * 10 * dt; }
        }
      }
      if (this.grounded) { this.jetT += dt; if (this.jetT > BASE.jetDelay) this.jetFuel = Math.min(st.jetFuel, this.jetFuel + dt * st.jetFuel / st.jetRefill); } else this.jetT = 0;
      if (this.dashT <= 0) v.y -= (v.y > 0 ? BASE.gravUp : BASE.gravDown) * dt;
      if (v.y < -BASE.terminal) v.y = -BASE.terminal;
      // auto-mantle while airborne and pushing into a ledge
      if (!this.grounded && st.mantle && wishLen > 0.5 && v.y < 3) this._tryMantle(wantX, wantZ, false);

      // ----- abilities -----
      if (can && inp.abilityP) this.useAbility(wantX, wantZ, wishLen);
      if (can && inp.gadgetP) this.useGadget();
      G.Input.setCooldown('ability', this.dashCharges > 0 ? 1 : this.dashRe / st.dashRecharge, this.dashCharges > 1 ? '' : String(this.dashCharges));
      if (this.gadget && G.Gadgets && G.Gadgets.defs && G.Gadgets.defs[this.gadget]) {
        const cd = G.Gadgets.defs[this.gadget].cooldown || 10;
        G.Input.setCooldown('gadget', 1 - Math.max(0, this.gadgetCd) / cd, this.gadgetCd > 0 ? String(Math.ceil(this.gadgetCd)) : '');
      }

      this.h = this.sliding > 0 || this.crouching || this.swimming ? 1.1 : 1.8;
      const wasG = this.grounded;
      const vy0 = v.y; // impact speed: moveBody's landVel reads 0 when the landing substep isn't its last
      world.phys.moveBody(this, dt);
      if (this.landed && !wasG) this._feelLand(Math.max(-(this.landVel || 0), -vy0));
      if (this.grounded) this.safePos.copy(this.pos);
      if (this.fell) {
        this.pos.copy(this.safePos).y += 1; v.set(0, 0, 0);
        if (G.Save.set.difficulty !== 'breezy') world.damage(this, 10, { type: 'fall', friendly: true });
        G.UI.toast(G.t('hud.fell'));
      }
      // Stride: one unit per footfall, shared by the camera/viewmodel bob and the footstep sounds, so
      // every dip of the view lands on a step you hear. Longer strides at speed (~2.3 steps/s
      // walking, ~3 sprinting, ~1.4 crouching).
      const hsp = Math.hypot(v.x, v.z), F = this._fx;
      if (this.grounded && hsp > 0.6 && this.sliding <= 0 && !this.swimming) {
        F.stride += hsp * dt / (1.45 + hsp * 0.14);
        this.stepDist += hsp * dt;
        const n = Math.floor(F.stride);
        if (n !== F.lastStep) { F.lastStep = n; this._footstep(hsp); }
      }
      this.bobPhase = F.stride * Math.PI;
      // regen
      const since = world.time - this.lastHitT;
      const regen = since > st.regenDelay && this.shield < this.maxShield && !this.noShieldRegen && st.shieldRegen > 0;
      if (regen) this.shield = Math.min(this.maxShield, this.shield + st.shieldRegen * dt);
      this._audioTick(regen);
      if (since > st.hpRegenDelay && st.hpRegen > 0 && this.hp < this.maxHp) {
        // Spicy/Blazing: regen only up to the next 25-HP boundary (GDD §4.3).
        const d = G.Save.set.difficulty;
        const step = st.hpRegenStep != null ? st.hpRegenStep : ((d === 'spicy' || d === 'blazing') ? 25 : 0);
        const cap = step > 0 ? Math.min(this.maxHp, Math.ceil(this.hp / step - 1e-6) * step || step) : this.maxHp;
        if (this.hp < cap) this.hp = Math.min(cap, this.hp + st.hpRegen * dt);
      }
      // Medi-Pump trinket: auto-heal below 25 HP, charges refill over time.
      if (this.medi) {
        const mp = st.medipump;
        if (this.medi.charges < (mp.charges || 2)) { this.medi.t += dt; if (this.medi.t >= (mp.refill || 45)) { this.medi.t = 0; this.medi.charges++; } }
        if (this.medi.healLeft > 0) { const h = Math.min(this.medi.healLeft, (mp.heal || 50) / (mp.healTime || 2) * dt); this.medi.healLeft -= h; this.heal(h); }
        else if (this.hp < 25 && this.medi.charges > 0) {
          this.medi.charges--; this.medi.healLeft = mp.heal || 50;
          if (G.Audio) G.Audio.sfx('heal');
          world.fx.burst(_a.set(this.pos.x, this.pos.y + 1, this.pos.z), [0x7dffb1, 0xffffff], 14, 3, 0.3, 0.6, { grav: -2 });
        }
      }
      // interact
      this.near = world.nearestInteract(this.pos);
      G.Input.show('interact', !!this.near);
      if (this.near && can && inp.interactP) { const it = this.near; G.safe('interact', () => it.onUse(this)); }
      // weapon input
      this._weapons(dt, can);
      this._camera(dt);
    }
    _tryMantle(wx, wz, fromJump) {
      if (!this.stats.mantle) return false;
      let dx = wx, dz = wz;
      const l = Math.hypot(dx, dz);
      if (l < 0.3) { dx = -Math.sin(this.yaw); dz = -Math.cos(this.yaw); } else { dx /= l; dz /= l; }
      const top = this.world.phys.ledgeAhead(this.pos, dx, dz, this.r, BASE.mantleMin, BASE.mantleMax);
      if (top === null) return false;
      // ledgeAhead only reports surfaces above step height, so a hit means a wall/ledge is in front.
      // When airborne without a jump press, require being right up against it.
      const up = top - this.pos.y;
      if (!fromJump && !this.hitWall) {
        const fx = this.pos.x + dx * (this.r + 0.12), fz = this.pos.z + dz * (this.r + 0.12);
        if (this.world.phys.groundAt(fx, fz, 0.05, this.pos.y + BASE.mantleMax) < this.pos.y + 0.45) return false;
      }
      const dur = up <= BASE.vaultMax ? BASE.vaultT : BASE.climbT;
      this.mantling = { t: 0, dur, from: this.pos.clone(), to: new V3(this.pos.x + dx * (this.r + 0.5), top + 0.02, this.pos.z + dz * (this.r + 0.5)), dx, dz, boost: false };
      this.jumps = 1; this.jumpBuf = 0;
      if (G.Audio) G.Audio.sfx('mantle');
      return true;
    }
    // Puff Dash: 5 m in 0.18 s with brief i-frames; 2 charges; one air dash per airtime.
    useAbility(wx, wz, wl) {
      if (this.dashCharges <= 0 || (!this.grounded && this.airDashed) || this.mantling) return;
      const v = this.vel;
      let dx = wx, dz = wz;
      if (wl < 0.2) { dx = -Math.sin(this.yaw); dz = -Math.cos(this.yaw); } else { dx /= wl; dz /= wl; }
      const sp = BASE.dashDist / BASE.dashTime;
      v.x = dx * sp; v.z = dz * sp; v.y = Math.max(v.y, 0.5);
      this.dashT = BASE.dashTime; this.iframes = BASE.dashIframes;
      if (this.dashCharges === this.stats.dashCharges) this.dashRe = 0;
      this.dashCharges--; if (!this.grounded) this.airDashed = true;
      this.sliding = 0;
      this.fovKick = 12;
      this._fx.mvZ.v += 0.9; // the gun is pulled back by the burst
      this.world.fx.burst(_a.set(this.pos.x, this.pos.y + 0.9, this.pos.z), [0x9ff6ff, 0xffffff], 14, 5, 0.25, 0.35, { grav: 0 });
      if (G.Audio) G.Audio.sfx('dash');
    }
    // Dash i-frames ignore hits.
    takeDamage(amount, info) {
      if (this.iframes > 0 && !(info && info.type === 'fall')) return { dealt: -0, toShield: -0, killed: false };
      return super.takeDamage(amount, info);
    }
    useGadget() {
      if (!this.gadget || this.gadgetCd > 0 || !G.Gadgets) return;
      const def = G.Gadgets.defs && G.Gadgets.defs[this.gadget];
      const ok = G.safe('gadget', () => G.Gadgets.use(this.gadget, this._ctx(false, false)));
      if (ok !== false) this.gadgetCd = def ? def.cooldown : 10;
    }
    // Weapon ctx: one object per player, refilled on every call (weapons read it during update() and keep only
    // copies / the shared vectors, as with the bots' ctx), so the per-frame weapon tick allocates nothing.
    _ctx(firing, fireP) {
      const eye = this.eyePos(_ctxEye);
      const dir = this.forward(_ctxDir);
      // muzzle: down-right of the eye
      const right = _ctxR.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const origin = _ctxO.copy(eye).addScaledVector(right, 0.2).addScaledVector(dir, 0.55); origin.y -= 0.18;
      // aim point = what the crosshair is on. Clamped just past the viewmodel muzzle (0.7 m from the eye) so
      // a shot into a wall right in front of you still lands on the crosshair (was 2 m: 12 cm off at 1.2 m).
      const ht = this.world.hitT ? this.world.hitT(eye, dir, 200, this) : -1;
      const aimPoint = _ctxP.copy(eye).addScaledVector(dir, ht >= 0 ? Math.max(ht, 0.8) : 200);
      const pdir = _ctxPD.copy(aimPoint).sub(origin).normalize();
      const c = this._wctx;
      c.world = this.world; c.owner = this; c.firing = firing; c.fireP = fireP; c.eye = eye; c.eyeDir = dir; c.origin = origin; c.dir = pdir;
      c.aimPoint = aimPoint; c.target = this.target; c.team = this.team;
      return c;
    }
    _weapons(dt, can) {
      const inp = G.input;
      if (this.equipT > 0) this.equipT -= dt;
      // (1e-4: float steps of dt must not add a frame to the 0.2 s swap → fire timing)
      if (this.holsterT > 0) { this.holsterT -= dt; if (this.holsterT <= 1e-4) { this.holsterT = 0; this._holsterVm = null; this._showVm(false); } }
      this.swapLock = this.holsterT > 0 || this.equipT > EQUIP_LOCK + 1e-4;
      if (!this.weapons.length) return;
      if (can) {
        if (inp.swapP || inp.wheel) this.equip(this.wi + (inp.wheel < 0 ? -1 : 1));
        if (inp.slotP >= 0 && inp.slotP < this.weapons.length && inp.slotP !== this.wi) this.equip(inp.slotP);
        if (inp.reloadP && this.weapon && this.weapon.reload) this.weapon.reload();
      }
      let firing = can && inp.fire;
      const s = G.Save.set;
      // Auto-fire: touch players with the option on fire when the crosshair rests on a target.
      // Starts after 130 ms on target and keeps going 200 ms after leaving it. Charge/lob
      // weapons (def.noAuto) always need the manual button.
      let onT = false;
      const w0 = this.weapon;
      if (can && s.autoFire && G.input.device === 'touch' && this.target && !this.sprinting && !(w0 && w0.def && w0.def.noAuto)) {
        const d = this.target.pos.distanceTo(this.pos);
        const tol = Math.max(1.8 * DEG, Math.atan2(this.target.r * 1.15, d));
        const range = w0 && w0.def ? (w0.def.range || 60) : 60;
        onT = this.targetAngle < tol && d < range;
      }
      this.autoOn = onT ? (this.autoOn || 0) + dt : 0;
      this.autoOff = onT ? 0.2 : Math.max(0, (this.autoOff || 0) - dt);
      this.autoFiring = this.autoOn > 0.13 || (this.autoFiring && this.autoOff > 0);
      if (this.autoFiring && can) firing = true;
      if (this.swapLock || this.mantling) firing = false;
      const fireP = can && inp.fireP;
      for (let i = 0; i < this.weapons.length; i++) {
        const w = this.weapons[i];
        // (G.safe semantics, inlined: no closure per frame)
        if (i === this.wi) { try { w.update(dt, this._ctx(firing, fireP)); } catch (e) { G.safeFail('weapon', e); } }
        else if (w.idle) w.idle(dt);
      }
      if (firing) this.lastFireT = this.world.time;
    }
    // Called by weapons when a shot goes off.
    onFired(kick, vmKick, shake) {
      this.recoil += kick || 0.01;
      this.recoilYaw += (Math.random() - 0.5) * (kick || 0.01) * 0.6;
      const k = vmKick != null ? vmKick : 0.04;
      this.vmKick = Math.min(0.12, this.vmKick + k);
      // Viewmodel recoil: a little instant displacement plus an impulse (kick back, muzzle up, random
      // roll/yaw); snappy under-damped springs bring it home with a hint of overshoot. Capped so
      // rapid fire buzzes instead of piling up.
      const F = this._fx, m = G.Save.set.reducedMotion ? 0.6 : 1;
      F.kZ.x = Math.min(0.13, F.kZ.x + k * 0.6 * m); F.kZ.v = Math.min(5, F.kZ.v + k * 42 * m);
      F.kP.x = Math.min(0.34, F.kP.x + k * 1.4 * m); F.kP.v = Math.min(10, F.kP.v + k * 90 * m);
      F.kR.v += (Math.random() - 0.5) * k * 45 * m;
      F.kY.v += (Math.random() - 0.5) * k * 20 * m;
      if (shake) this.world.fx.shake(shake);
      this.sliding = Math.min(this.sliding, 0.4);
    }
    // Take-off: the camera trails the body for a moment and the gun lags (double jump adds a twirl).
    _feelJump(k) {
      const F = this._fx;
      F.lift.v -= 0.5 * k;
      F.mvY.v -= 0.7 * k; F.mvP.v -= 1.6 * k;
      if (k > 1.25) F.kR.v += (Math.random() < 0.5 ? -1 : 1) * 2.2;
    }
    // Landing: view dip and nod scaled by impact speed (critically damped, no bounce), the gun
    // bounces (under-damped), and the sound matches the fall.
    _feelLand(lv) {
      if (!(lv > 2.5)) return;
      const F = this._fx;
      F.land.v += peakV(Math.min(0.15, lv * 0.0055), 4.2);
      F.landP.v += Math.min(2.6, lv * 0.085);
      F.mvY.v -= Math.min(2.6, lv * 0.11);
      F.mvP.v -= Math.min(7, lv * 0.32);
      if (G.Audio) {
        // surface-aware landing / step from the audio module when it has them (09_audio contract)
        if (lv > 6) { if (G.Audio.land) G.Audio.land(lv); else G.Audio.sfx('land', { vol: U.clamp(0.55 + (lv - 6) * 0.045, 0.55, 1.25) }); }
        else if (G.Audio.step) G.Audio.step(_stepO(0, false, 0, true, lv));
        else G.Audio.sfx('step', { vol: 0.75 });
      }
    }
    _footstep(hsp) {
      if (!G.Audio) return;
      const odd = this._fx.lastStep & 1;
      if (G.Audio.step) { G.Audio.step(_stepO(hsp, this.sprinting, odd ? 0.14 : -0.14, false, 0, this.crouching)); return; }
      G.Audio.sfx('step', { vol: this.crouching ? 0.4 : 0.62 + 0.38 * Math.min(1, hsp / BASE.sprint), pan: odd ? 0.14 : -0.14, pitch: this.sprinting ? 1.05 : 1 });
    }
    // Per-frame sound bookkeeping for the local player: vitals (low-HP heartbeat / music filter in 09_audio),
    // the shield starting to recharge, and the Puff Pack / Glide Wings loops. All guarded: missing ids are
    // simply silent.
    _audioTick(regen) {
      const A = G.Audio; if (!A || this.world.player !== this) return;
      if (A.vitals) A.vitals(this.maxHp > 0 ? this.hp / this.maxHp : 1, this.alive);
      if (regen && !this._regenOn && this.alive) {
        if (has('shieldRegen')) A.sfx('shieldRegen'); else A.sfx('shieldUp', { vol: 0.32, pitch: 1.15 });
      }
      this._regenOn = !!regen;
      const id = !this.alive ? null : this.jetting ? 'jet' : this.gliding ? 'glide' : null;
      if (id !== this._gearLoopId) {
        if (this._gearLoop) { this._gearLoop.stop(0.18); this._gearLoop = null; }
        this._gearLoopId = id;
        if (id && has(id) && A.loop) this._gearLoop = A.loop(id, { vol: 0.7 });
      }
      const L = this._gearLoop;
      if (L && L.playing) {
        if (id === 'jet') { _loopO.pitch = 0.85 + 0.45 * U.clamp(this.jetFuel / (this.stats.jetFuel || 1), 0, 1); _loopO.vol = 0.75; }
        else { _loopO.pitch = 0.9 + 0.04 * Math.hypot(this.vel.x, this.vel.z); _loopO.vol = 0.6; }
        L.set(_loopO);
      }
    }
    _stopGearLoop() { if (this._gearLoop) { this._gearLoop.stop(0.1); this._gearLoop = null; } this._gearLoopId = null; }
    // Teleport / respawn: drop the visual offsets so nothing swings in from the old spot.
    _feelReset() {
      const F = this._fx;
      for (let i = 0; i < FEEL_RESET.length; i++) { const sp = F[FEEL_RESET[i]]; sp.x = 0; sp.v = 0; }
      F.step = 0; F.lx = this.pos.x; F.ly = this.pos.y; F.lz = this.pos.z;
      F.lyaw = this.yaw; F.lpit = this.pitch; F.wy = F.wp = 0;
    }
    _findTarget() {
      const eye = this.eyePos(_a);
      const fwd = this.forward(_b);
      const w = this.weapon;
      const range = w && w.def ? (w.def.range || 60) * 1.1 : 60;
      let best = null, bestA = 12 * DEG;
      const list = this.world.actors;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a.alive || !a.targetable || a.team === this.team || a.hidden || a.noAssist) continue;
        const p = a.aimPoint(_c);
        const dx = p.x - eye.x, dy = p.y - eye.y, dz = p.z - eye.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);   // (not Math.hypot / U.clamp: calls that box their result)
        if (d > range || d < 0.5) continue;
        const cos = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d;
        const ang = Math.acos(cos > 1 ? 1 : cos < -1 ? -1 : cos);
        if (ang < bestA) { bestA = ang; best = a; }
      }
      if (best && !this.world.phys.los(eye, best.aimPoint(_c), false)) best = null;
      this.target = best; this.targetAngle = best ? bestA : 99;
    }
    _assist(dt, firing) {
      const s = G.Save.set;
      if ((G.input.device !== 'touch' && G.input.device !== 'gamepad') || !this.target || s.aimAssist <= 0) return;
      if (this.targetAngle > 9 * DEG) return;
      // Magnetism toward target while firing or moving the view.
      const p = this.target.aimPoint(_c);
      const eye = this.eyePos(_a);
      const dx = p.x - eye.x, dy = p.y - eye.y, dz = p.z - eye.z;
      const wantYaw = Math.atan2(-dx, -dz);
      const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
      const str = (firing ? 3.2 : 0.9) * s.aimAssist;
      this.yaw = U.angleDamp(this.yaw, wantYaw, str, dt);
      this.pitch = U.damp(this.pitch, wantPitch, str * 0.8, dt);
    }
    onHurt(info, amt) {
      if (G.Audio) G.Audio.sfx(this.shield > 0 ? 'hurtShield' : 'hurt');
      this.world.fx.shake(Math.min(0.35, amt * 0.012));
      // flinch: a quick roll of the view (off with reduced motion) and a jolt of the gun
      const F = this._fx, sd = Math.random() < 0.5 ? -1 : 1;
      if (!G.Save.set.reducedMotion) F.flinch.v += sd * Math.min(1.4, amt * 0.035);
      F.mvY.v -= Math.min(0.8, amt * 0.02); F.kR.v += sd * Math.min(3, amt * 0.1);
      G.HUD && G.HUD.hurt(amt / this.maxHp);
    }
    onShieldBreak() { if (G.Audio) G.Audio.sfx('shieldBreak'); G.HUD && G.HUD.flashShieldBreak(); }
    onDeath(info) {
      this.respawnT = 2.5;
      this.vel.set(0, 0, 0);
      this._stopGearLoop();
      if (G.Audio) G.Audio.sfx('down');
      this.world.fx.burst(_a.set(this.pos.x, this.pos.y + 1, this.pos.z), [0xff6b8b, 0xffd23f, 0xffffff], 24, 6, 0.3, 0.8);
      if (this.world.rules.onPlayerDeath) this.world.rules.onPlayerDeath(this, info);
    }
    _deadUpdate(dt) {
      this.eyeH = 0.4;
      if (this.world.rules.manualRespawn) return;
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
    }
    respawn(at) {
      this.pos.copy(at || this.spawn); this.vel.set(0, 0, 0);
      this.hp = this.maxHp; this.shield = this.maxShield; this.alive = true; this.dead = false;
      this.lastHitT = -99; this.sliding = 0; this.mantling = null; this.zoom = 1;
      if (this._holsterVm) { this.holsterT = 0; this._holsterVm = null; this._showVm(true); }
      this._regenOn = false;
      // drop the KO tip and any swing left in the springs (a nearby respawn point doesn't trip the
      // teleport check in _camera); the eye still rises from the KO height like getting up
      this._feelReset();
      for (const w of this.weapons) if (w.refill) w.refill();
      if (G.Audio) G.Audio.sfx('respawn');
      this.world.fx.ring(_a.copy(this.pos), 2.5, 0x9ff6ff, 0.6, this.pos.y + 0.1);
      G.bus.emit('player-respawn', this);
    }
    // Camera: everything here is visual only (aim stays on yaw/pitch; eyeCur is the gameplay eye
    // height, eased). Springs integrate on dt, so hit-stop and slow-mo hold them too; the view's
    // angular velocity is measured on unscaled time so hit-stop can't spike the sway.
    _camera(dt) {
      const cam = G.R.camera;
      const s = G.Save.set, F = this._fx, rm = !!s.reducedMotion;
      const sc = G.time.scale > 0.01 ? G.time.scale : 1, rdt = dt / sc;
      // eye height: critically damped, so crouch / slide ease in and out instead of snapping
      const targetEye = !this.alive ? 0.4 : (this.sliding > 0 || this.crouching || this.swimming ? 1.0 : 1.6);
      spring(F.eye, targetEye, this.sliding > 0 ? 6.5 : 4.8, 1, dt);
      this.eyeCur = U.clamp(F.eye.x, 0.3, 1.8);
      // stairs / ledges: a sudden ground-height change becomes a visual offset that eases out (the
      // threshold grows with the distance covered, so walking a slope never lags the view). The
      // heightfield is continuous, so terrain-to-terrain moves only count on a near-cliff: a steep
      // hill climbed at 30 fps covers a lot of height per frame and must not trip the step logic.
      const px = this.pos.x, py = this.pos.y, pz = this.pos.z;
      if (F.ly === null) this._feelReset();
      const dy = py - F.ly, dxz = Math.hypot(px - F.lx, pz - F.lz);
      const onT = this.grounded && Math.abs(py - this.world.phys.terrain(px, pz)) < 0.03;
      const allow = onT && F.onT ? 0.06 + dxz * 1.5 : 0.04 + dxz * 0.75;
      if (dxz > 4 || Math.abs(dy) > 3) this._feelReset();
      else if (this.grounded && F.wasG && !this.mantling && Math.abs(dy) > allow && Math.abs(dy) < 0.8) F.step = U.clamp(F.step - dy, -0.6, 0.6);
      F.lx = px; F.ly = py; F.lz = pz; F.wasG = this.grounded; F.onT = onT;
      F.step = U.damp(F.step, 0, 15, dt);
      // recoil recovery
      this.pitch += this.recoil * dt * 14; this.yaw += this.recoilYaw * dt * 14;
      this.recoil = U.damp(this.recoil, 0, 12, dt); this.recoilYaw = U.damp(this.recoilYaw, 0, 12, dt);
      // angular velocity of the view (rad/s); a snap (respawn, scripted turn) is not a turn
      let dyaw = U.wrapAngle(this.yaw - F.lyaw), dpit = this.pitch - F.lpit;
      F.lyaw = this.yaw; F.lpit = this.pitch;
      if (Math.abs(dyaw) > 1 || Math.abs(dpit) > 1) dyaw = dpit = 0;
      const ir = 1 / Math.max(rdt, 1e-3);
      F.wy = dyaw * ir; F.wp = dpit * ir;
      // velocity in view space: right / forward
      const sY = Math.sin(this.yaw), cY = Math.cos(this.yaw);
      F.vr = this.vel.x * cY - this.vel.z * sY; F.vf = -this.vel.x * sY - this.vel.z * cY;
      const hs = Math.hypot(this.vel.x, this.vel.z), run = Math.min(1, hs / BASE.sprint);
      // pose weights shared with the viewmodel
      const moving = this.grounded && this.sliding <= 0 && !this.swimming && !this.mantling;
      spring(F.bobA, moving ? run : 0, 3.2, 1, dt);
      const firingNow = (G.input.fire && this.inputEnabled) || this.autoFiring || this.world.time - this.lastFireT < 0.3;
      spring(F.spr, this.sprinting && !firingNow ? 1 : 0, 3, 0.9, dt);
      // landing dip / nod and take-off lift (impulses from _feelLand / _feelJump)
      spring(F.land, 0, 4.2, 1, dt); spring(F.landP, 0, 5, 1, dt); spring(F.lift, 0, 5.5, 1, dt);
      this.landKick = F.land.x;
      // roll: lean into strafes, bank a touch into fast turns while running, lean on slides, tip over on KO
      const strafe = this.inputEnabled ? G.input.move.x : 0;
      if (this.sliding > 0 && Math.abs(strafe) > 0.3) F.slideSide = strafe > 0 ? 1 : -1;
      let rollT = -U.clamp(F.vr / BASE.sprint, -1.2, 1.2) * 0.014;
      rollT += U.clamp(F.wy * 0.0035, -0.014, 0.014) * run;
      if (this.sliding > 0) rollT += 0.052 * F.slideSide;
      if (!this.alive) rollT += 0.3;
      spring(F.roll, rollT, this.alive ? 2.8 : 1.4, 0.85, dt);
      this.camRoll = F.roll.x;
      spring(F.flinch, 0, 6, 0.45, dt);
      // head bob: a faint dip just after each footfall and a hair of roll (none with reduced motion)
      const bobOff = G.Motion && G.Motion.bob ? !G.Motion.bob() : rm;   // Accessibility → Camera bob
      const th = this.bobPhase, A = bobOff ? 0 : F.bobA.x;
      const foot = 0.5 + 0.5 * Math.cos(2 * th - 0.45);
      const bobY = -foot * (0.009 + 0.006 * F.spr.x) * A, bobR = Math.sin(th) * 0.0022 * A;
      // shake (trauma model)
      const tr = this.world.fx.trauma, sh = tr * tr;
      const t = this.world.time;
      // (no shake: skip the three noise samples — each returns a fresh heap number — the result is 0 either way)
      const shx = sh > 0 ? sh * 0.05 * G.noise.n2(t * 25, 1.3) : 0, shy = sh > 0 ? sh * 0.05 * G.noise.n2(t * 25, 7.1) : 0, shr = sh > 0 ? sh * 0.04 * G.noise.n2(t * 20, 3.3) : 0;
      const lk = rm ? 0.4 : 1;
      cam.position.set(px, py + this.eyeCur + F.step - F.land.x * lk + F.lift.x + bobY, pz);
      cam.rotation.set(0, 0, 0, 'YXZ');
      cam.rotation.order = 'YXZ';
      cam.rotation.y = this.yaw + shx;
      cam.rotation.x = this.pitch + shy - F.landP.x * lk;
      cam.rotation.z = (rm ? 0 : this.camRoll + bobR + F.flinch.x) + shr;
      // FOV: the horizontal setting converted for this aspect (G.fovV). Kicks (sprint, slide, dash, launch
      // pads) are eased in by a critically damped follower and scaled to the base FOV so they stay a gentle
      // ~10–15% widening on a narrow phone view (reduced motion keeps only a hint of them).
      const base = G.fovV(cam.aspect);
      this.fovBase = base;
      this.fovKick = U.damp(this.fovKick, rm ? 0 : (this.sprinting ? 3.5 : 0), 4, dt);
      spring(F.fov, rm ? this.fovKick * 0.35 : this.fovKick, 5, 1, dt);
      const fk = F.fov.x * (base / 75) * 0.9;
      this.zoomCur = U.damp(this.zoomCur, this.alive ? this.zoom : 1, 14, dt);
      const fov = 2 * Math.atan(Math.tan((base + fk) * DEG / 2) / this.zoomCur) / DEG;
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
      this._viewmodel(dt);
    }
    // Viewmodel: springs driven by the view's angular velocity and the body's velocity, a stride-
    // synced figure-8 bob, pose blends (sprint, slide, airborne, crouch, mantle, overheat), recoil,
    // equip raise with overshoot and idle breathing. Rest pose = (0.25, -0.25, -0.46), no rotation.
    _viewmodel(dt) {
      const vm = G.R.vmRoot, F = this._fx, s = G.Save.set;
      if (this._parked) this._unpark(); // the load-time warm-up has run by the first frame (see _prewarmVms)
      G.R.showViewmodel = this.alive && this.weapons.length > 0 && !this.swimming && !this.hideVm;
      const mot = s.reducedMotion ? 0.35 : 1;
      const steady = 1 / Math.max(1, this.zoomCur); // scoped: steadier gun
      // look sway: the gun trails the turn (position, muzzle and a little bank) and settles with a
      // small overshoot when the view stops; soft-saturated so flicks can't throw it off screen
      spring(F.swX, Math.tanh(F.wy / 6) * 0.07 * mot * steady, 5.2, 0.55, dt);
      spring(F.swY, Math.tanh(F.wp / 6) * 0.05 * mot * steady, 5.2, 0.55, dt);
      // motion sway: strafing drags it sideways, running draws it in a touch, rising lets it lag and
      // falling lets it float up (airborne lift); landings / jumps add impulses to the same springs
      const vy = this.grounded ? 0 : this.vel.y;
      spring(F.mvX, -Math.tanh(F.vr / 8) * 0.016 * mot, 4.2, 0.7, dt);
      spring(F.mvR, -Math.tanh(F.vr / 8) * 0.07 * mot, 4, 0.65, dt);
      spring(F.mvZ, Math.tanh(F.vf / 10) * 0.012 * mot, 3.5, 0.8, dt);
      spring(F.mvY, -Math.tanh(vy / 9) * 0.022 * mot, 4.5, 0.5, dt);
      spring(F.mvP, -Math.tanh(vy / 9) * 0.05 * mot, 4.5, 0.5, dt);
      // recoil: snappy, slightly under-damped
      spring(F.kZ, 0, 9, 0.55, dt); spring(F.kP, 0, 8.5, 0.5, dt); spring(F.kR, 0, 7, 0.45, dt); spring(F.kY, 0, 7, 0.5, dt);
      this.vmKick = U.damp(this.vmKick, 0, 14, dt);
      // pose blends
      const w = this.weapon;
      spring(F.sld, this.sliding > 0 ? 1 : 0, 4, 0.8, dt);
      spring(F.air, this.grounded || this.swimming ? 0 : 1, 3, 1, dt);
      spring(F.cro, this.crouching ? 1 : 0, 4, 1, dt);
      spring(F.mnt, this.mantling ? 1 : 0, 5, 0.85, dt);
      spring(F.hot, w && w.locked > 0 ? 1 : 0, 3.5, 0.7, dt);
      const sp = F.spr.x, sl = F.sld.x, ai = F.air.x, cr = F.cro.x, mn = F.mnt.x, ho = F.hot.x;
      // walk bob: a figure-8 locked to the stride (sideways swing once per two steps, a dip just
      // after each footfall), bigger when sprinting
      const th = this.bobPhase, A = F.bobA.x * mot * steady * (1 + sp * 0.7);
      const foot = 0.5 + 0.5 * Math.cos(2 * th - 0.45), side = Math.sin(th);
      const bx = side * 0.011 * A, by = -foot * 0.009 * A;
      const bRx = -foot * 0.016 * A, bRy = side * 0.012 * A, bRz = side * 0.022 * A;
      // idle breathing, fading out as soon as the player moves
      const t = this.world.time, still = (1 - Math.min(1, F.bobA.x * 2.5)) * mot;
      const br = Math.sin(t * 1.7) * still, br2 = Math.sin(t * 1.7 - 0.9) * still;
      // swap: the old gun drops out of view (eased in), then the new one rises from below, muzzle swinging up
      // into place with a little overshoot
      const eq = this.equipT > 0 ? U.clamp(1 - this.equipT / RAISE_T, 0, 1) : 1;
      let drop = 1 - easeOutBack(eq);
      if (this.holsterT > 0) { const k = 1 - this.holsterT / HOLSTER_T, f = this._holsterFrom || 0; drop = f + (1 - f) * k * k; }
      // dry fire (empty click) jiggle, overheat tremble
      const em = w && w.emptyT > 0 && w.emptyT <= 0.45 ? w.emptyT / 0.45 : 0;
      const dry = Math.sin((1 - em) * 34) * em * 0.05 * mot;
      const hotT = ho * Math.sin(t * 38) * 0.004 * mot;
      const x = 0.25 + bx + F.swX.x * 0.3 + F.mvX.x - sp * 0.012 - sl * 0.02 - mn * 0.02;
      const y = -0.25 + by + br * 0.0022 - F.swY.x * 0.3 + F.mvY.x - sp * 0.04 - sl * 0.028 + ai * 0.006 - cr * 0.012 - mn * 0.1 - ho * 0.03 + hotT - drop * 0.3;
      const z = -0.46 + F.kZ.x + F.mvZ.x + sl * 0.01;
      const rx = F.kP.x - F.swY.x + F.mvP.x + bRx + br2 * 0.006 - sp * 0.25 + sl * 0.05 + ai * 0.025 - mn * 0.38 - ho * 0.14 - drop * 0.5;
      const ry = -F.swX.x + F.kY.x + bRy + sp * 0.45 + ho * 0.1;
      const rz = F.swX.x * 0.55 + F.mvR.x + F.kR.x + bRz + this.camRoll * 1.5 * mot + sp * 0.2 + sl * 0.3 + cr * 0.05 + mn * 0.3 + ho * 0.18 + drop * 0.35 + dry;
      vm.position.set(x, y, z);
      vm.rotation.set(rx, ry, rz);
      this.swayX = F.swX.x * 0.3; this.swayY = -F.swY.x * 0.3;
      const M = this.vmMotion; M.x = x - 0.25; M.y = y + 0.25; M.roll = rz; M.speed = Math.hypot(this.vel.x, this.vel.z);
    }
  }
  const _ctxEye = new V3(), _ctxDir = new V3(), _ctxR = new V3(), _ctxO = new V3(), _ctxP = new V3(), _ctxPD = new V3();
  // reused option objects for the per-step / per-frame audio calls (no allocation)
  const _jetO = { grav: 0 };
  const _loopO = { pitch: 1, vol: 0.7 }, _stepOpt = { speed: 0, sprint: false, pan: 0, land: false, vy: 0, crouch: false, vol: undefined };
  function _stepO(speed, sprint, pan, land, vy, crouch) {
    const o = _stepOpt; o.speed = speed; o.sprint = !!sprint; o.pan = pan; o.land = !!land; o.vy = vy || 0; o.crouch = !!crouch;
    o.vol = crouch ? 0.4 : land ? 0.75 : undefined;   // (undefined = the audio module's speed-scaled default)
    return o;
  }
  G.Player = Player;
})(window.G);

}).call(window); } catch (e) { console.error('[module 12_player.js]', e); }
})();
