// props — trees (8 species / 5 silhouette classes, 3 LOD tiers, wind sway from world.time), street
// lamps with emissive heads, halos and ground light-pool decals, traffic signals whose phase comes
// from traffic when traffic exists and from world.time when it does not, and the whole street /
// park kit: benches, bins, hydrants, signs, bus shelters, fences, hedges, bushes and planters.
//
// Rendering is chunked at 256 m: one InstancedMesh per (tree tier x chunk) and one merged geometry
// per (hard furniture | alpha foliage) x chunk, plus three global non-casting transparent meshes.
// props adds no THREE.Light of any kind (ARCHITECTURE section 4).
import * as THREE from 'three';
import { RENDER_ORDER, LAYERS } from '../../core/constants.js';
import { buildTextures, SLOT, LEAF_CELL, cellRect } from './textures.js';
import { buildTreeGeometry, buildImpostorGeometry, makeTreeMaterials } from './trees.js';
import { buildKits, fenceRun, hedgeRun, bushGeometry, planterFillGeometry, litterRing, lensGeometry, SIGNAL_HEADS, LENS_DY, LENS_Z } from './furniture.js';
import { Placer, scatterForest, placeSignals, placeLamps, placeEdgeFurniture, placePark, hedgeLine, fenceLine, makeTree } from './place.js';
import { PropField, chunkIndex, CHUNK } from './chunks.js';
import { SPECIES, SPECIES_NAMES, RADII, KINDS, SCALE_MIN, SCALE_MAX, shapeFor } from './species.js';
import { stage, CAMERAS, SCENE } from './showcase.js';

const PHASE = { phase: 0, group: 0, state: 'green', ttc: 0 };
const CYCLE = 60;                    // game-seconds per signal cycle
const LENS_LIT = [
  new THREE.Color(1.70, 0.16, 0.06),
  new THREE.Color(1.55, 0.62, 0.05),
  new THREE.Color(0.14, 1.45, 0.30),
];
const LENS_OFF = [
  new THREE.Color(0.0075, 0.0030, 0.0020),
  new THREE.Color(0.0080, 0.0055, 0.0020),
  new THREE.Color(0.0028, 0.0075, 0.0040),
];

const S = {
  ctx: null, tex: null, mats: null, geo: null, kits: null, folKits: null,
  placer: null, field: null, uniforms: null,
  built: false, pending: null, settle: 0, reentrant: false,
  density: 1, sway: 1, windClock: null, lenses: [], lensKey: -1,
  manual: new Map(), suppressed: new Set(), nextManualId: 1000000000,
  stats: { items: 0, byKind: {}, instances: 0, draws: 0, tris: 0, chunks: 0, species: [], ms: 0 },
  night: 0, camPos: new THREE.Vector3(),
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _c = new THREE.Color();

// ------------------------------------------------------------------ time-derived phases
function gameSeconds(world) {
  const t = world.time || { day: 1, hour: 12 };
  return ((t.day || 0) * 24 + (t.hour || 0)) * 3600;
}
function windPhase(world, dt) {
  if (!Number.isFinite(S.windClock)) S.windClock = (gameSeconds(world) * 0.0075) % 6283.185307;
  const running = !world.time?.paused && (world.time?.speed || 0) > 0;
  if (running) S.windClock = (S.windClock + Math.max(0, dt) * 1.05) % 6283.185307;
  return S.windClock;
}
function signalPhase(world) {
  const p = ((gameSeconds(world) % CYCLE) + CYCLE) % CYCLE;
  const ph = PHASE;
  ph.phase = p < 26 ? 0 : p < 30 ? 1 : p < 56 ? 2 : 3;
  ph.group = p < 30 ? 0 : 1;
  ph.state = ph.phase % 2 ? 'amber' : 'green';
  ph.ttc = (p < 26 ? 26 : p < 30 ? 30 : p < 56 ? 56 : 60) - p;
  return ph;
}
function nightFactor(ctx) {
  const n = ctx.world.weather?.night;
  if (Number.isFinite(n)) return n;
  const h = ctx.clock?.hour ?? 12;
  return THREE.MathUtils.smoothstep(Math.min(Math.abs(h - 12), 12), 5.2, 7.0);
}

// ------------------------------------------------------------------ materials
function makeMaterials(ctx, tex) {
  const uniforms = {
    uWindPhase: { value: 0 },
    uWind: { value: new THREE.Vector3(0.016, 0.004, 0.004) },
    uBark: { value: tex.bark },
    uCamPos: { value: new THREE.Vector3() },
    uTopDown: { value: 0 },
    uSign: { value: tex.signs },
  };
  const t = makeTreeMaterials(tex, uniforms);

  const furniture = new THREE.MeshStandardMaterial({
    vertexColors: true, map: tex.furAlbedo,
    roughness: 1, metalness: 1, roughnessMap: tex.lut.rm, metalnessMap: tex.lut.rm,
    normalMap: tex.detail, normalScale: new THREE.Vector2(0.32, 0.32),
    emissive: new THREE.Color(0xffe0ac), emissiveMap: tex.lut.em, emissiveIntensity: 0.02,
    envMapIntensity: 1.1,
  });
  furniture.onBeforeCompile = (sh) => {
    sh.uniforms.uSign = uniforms.uSign;
    sh.vertexShader = 'varying float vSign;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vSign = step( 0.7, uv.y );');
    sh.fragmentShader = 'varying float vSign;\nuniform sampler2D uSign;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  if ( vSign > 0.5 ) {
    vec4 sg = texture2D( uSign, vMapUv );
    diffuseColor.rgb = sg.rgb;
  }
`);
  };
  furniture.customProgramCacheKey = () => 'props-furn';

  const glass = new THREE.MeshStandardMaterial({
    color: 0xadc5ca, roughness: 0.12, metalness: 0.08,
    transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide,
    envMapIntensity: 0.65,
  });
  const foliage = new THREE.MeshStandardMaterial({
    map: tex.leaf, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide,
    roughness: 0.86, metalness: 0,
  });

  const pool = new THREE.ShaderMaterial({
    uniforms: { uPoolHeight: {value: null}, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(1.0, 0.74, 0.42) } },
    vertexShader: `attribute float aR; attribute float aPoolVertex; attribute float aPoolRow;
      uniform sampler2D uPoolHeight; varying float vR;
      void main() { vR = aR; vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.0);
        wp.y = texelFetch(uPoolHeight,ivec2(int(aPoolVertex),int(aPoolRow)),0).r;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vR;
      void main() {
        float k = clamp( 1.0 - vR, 0.0, 1.0 );
        // Keep light at the kerb and beneath the head. A flatter, additive disc
        // becomes a white coin in city-scale night views.
        float a = pow( k, 3.4 ) * ( 0.18 + 0.82 * pow( k, 2.4 ) );
        if ( a * uOpacity < 0.0015 ) discard;
        gl_FragColor = vec4( uColor * a * uOpacity, 1.0 );
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: true,
  });
  pool.userData.envSkip = true;
  pool.renderOrder = RENDER_ORDER.TRANSPARENT;

  const halo = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex.glow }, uOpacity: { value: 0 }, uSize: { value: 1.9 }, uScale: { value: 600 }, uColor: { value: new THREE.Color(1.0, 0.86, 0.62) } },
    vertexShader: `uniform float uSize; uniform float uScale; varying float vF;
      void main() {
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = clamp( uSize * uScale / max( d, 1.0 ), 3.0, 64.0 );
        vF = clamp( 1.0 - ( d - 700.0 ) / 500.0, 0.0, 1.0 );
      }`,
    fragmentShader: `uniform sampler2D map; uniform float uOpacity; uniform vec3 uColor; varying float vF;
      void main() {
        float a = texture2D( map, gl_PointCoord ).a;
        a *= uOpacity * vF;
        if ( a < 0.004 ) discard;
        gl_FragColor = vec4( uColor * a, 1.0 );
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
  });
  halo.userData.envSkip = true;

  const lens = new THREE.MeshBasicMaterial({ vertexColors: false, toneMapped: true, side: THREE.FrontSide, fog: false });
  lens.userData.envSkip = true;

  return { ...t, furniture, glass, foliage, pool, halo, lens, lensGeo: lensGeometry(), uniforms };
}

// ------------------------------------------------------------------ build

function renderItem(ctx, p, it) {
  const kind = it.kind;
      if (kind === 'tree_oak' || kind === 'tree_pine') {
        const species = SPECIES[it.species]?.kind === kind ? it.species : kind === 'tree_pine' ? 'spruce' : 'oak';
        const sp = SPECIES[species] || SPECIES.oak;
        const scale = it.scale;
        it.species = species;
        p.trees.push({
          item: it, x: it.x, y: it.y, z: it.z, heading: it.heading, worldH: sp.base * scale, species,
          tint: sp.tints[0].slice(), shape: shapeFor(species, sp.base * scale), group: 'api',
        });
      } else if (kind === 'bush') {
        p.bushes.push({ id: it.id, x: it.x, y: it.y, z: it.z, heading: it.heading, scale: it.scale });
      } else if (kind === 'fence') {
        const dx = Math.sin(it.heading) * it.scale, dz = -Math.cos(it.heading) * it.scale;
        const pts = [-1, 1].map(k => ({x: it.x + dx*k, z: it.z + dz*k, y: ctx.world.terrain.getHeight(it.x + dx*k, it.z + dz*k)}));
        if (it.variant === 'hedge') p.hedgeRuns.push({pts, ownerId: it.id});
        else p.fenceRuns.push({pts, ownerId: it.id, variant: it.variant || 'slat'});
      } else {
        const kit = kind === 'streetlamp' && it.variant === 'lantern' ? 'streetlamp_lantern' : kind;
        p.furniture.push({ id: it.id, kit, x: it.x, y: it.y, z: it.z, heading: it.heading, scale: it.scale });
        if (kind === 'streetlamp') p.lampHeads.push({ id: it.id, x: it.x, y: it.y, z: it.z, heading: it.heading, kit });
      }
      if (kind === 'bus_stop') p.stops.push({...it});
      if (kind === 'planter') p.planterFills.push({...it});
}

function collectLenses(placer) {
  const out = [];
  for (let si = 0; si < placer.signals.length; si++) {
    const sig = placer.signals[si];
    for (let ai = 0; ai < sig.arms.length; ai++) {
      const a = sig.arms[ai];
      _e.set(0, -a.heading, 0); _q.setFromEuler(_e);
      _m.compose(_v.set(a.x, a.y, a.z), _q, new THREE.Vector3(1, 1, 1));
      for (const [hx, hy] of SIGNAL_HEADS) {
        for (let k = 0; k < 3; k++) {
          const p = new THREE.Vector3(hx, hy + LENS_DY[k], LENS_Z - 0.07).applyMatrix4(_m);
          out.push({ x: p.x, y: p.y, z: p.z, heading: a.heading, sig: si, arm: ai, lens: k });
        }
      }
    }
  }
  return out;
}

function syncWorld(ctx, placer) {
  const items = ctx.world.props.items;
  items.clear();
  for (const it of placer.items) items.set(it.id, it);
  ctx.world.props.version++;
}

function rebuild(ctx, opts = {}) {
  const t0 = performance.now();
  const world = ctx.world;
  const placer = S.placer;
  placer.reset();
  placer.suppressed = S.suppressed;
  // Manual objects own their positions and IDs across every rule regeneration.
  for (const saved of S.manual.values()) {
    const it = {...saved, y: placer.groundY(saved.kind, saved.x, saved.z, {...saved, y: undefined})};
    S.manual.set(it.id, {...it});
    placer.items.push(it); placer.byId.set(it.id, it);
    const key = placer.key(it.x, it.z);
    if (!placer.hash.has(key)) placer.hash.set(key, []);
    placer.hash.get(key).push(it);
    renderItem(ctx, placer, it);
  }
  S.field.poolHeightCache?.clear();
  const scene = SCENE.get(world.seed) || null;

  placeSignals(ctx, placer);
  placeLamps(ctx, placer);
  placeEdgeFurniture(ctx, placer);

  if (scene) {
    // empty lot boundary: hedge on two sides, two built fence types, a gate gap
    const L = scene.lot;
    hedgeLine(ctx, placer, L.x0, L.z0, L.x1, L.z0);
    hedgeLine(ctx, placer, L.x1, L.z0, L.x1, L.z1, { gap: [0.44, 0.58] });
    fenceLine(ctx, placer, L.x0, L.z1, L.x1, L.z1, 'slat');
    fenceLine(ctx, placer, L.x0, L.z0, L.x0, L.z1, 'railing');
    const r = ctx.rng.fork('lot');
    for (let i = 0; i < 7; i++) {
      const x = r.range(L.x0 + 4, L.x1 - 4), z = r.range(L.z0 + 4, L.z1 - 4);
      makeTree(r, placer, r.pick(['blossom', 'maple', 'birch', 'oak']), x, z, { group: 'garden' });
    }
    for (let i = 0; i < 14; i++) {
      const x = r.range(L.x0 + 2, L.x1 - 2), z = r.range(L.z0 + 2, L.z1 - 2);
      const scale = r.range(0.85, 1.4);
      const it = placer.tryAdd('bush', x, z, { heading: r.float() * 6.28, scale });
      if (it) placer.bushes.push({ x: it.x, y: it.y, z: it.z, heading: it.heading, scale });
    }
    for (const h of (scene.hedges || [])) hedgeLine(ctx, placer, h[0], h[1], h[2], h[3]);
    placePark(ctx, placer, scene.park);
    const cap = ctx.quality === 'low' ? 2400 : 5200;
    scatterForest(ctx, placer, scene.forest, { density: S.density, maxTrees: Math.round(cap * 0.72), roadClear: true, avoid: scene.forestAvoid });
    scatterForest(ctx, placer, scene.forest2, { density: S.density, maxTrees: Math.round(cap * 0.28), roadClear: true, avoid: scene.forestAvoid });
  } else if (world.terrain) {
    scatterForest(ctx, placer, { x0: -900, z0: -900, x1: 900, z1: 900 },
      { density: S.density * 0.5, maxTrees: ctx.quality === 'low' ? 2500 : 5000, roadClear: true });
  }

  S.field.build(placer, S.kits, S.folKits);
  S.lenses = collectLenses(placer);
  S.field.setLenses(S.lenses);
  S.lensKey = -1;
  syncWorld(ctx, placer);
  refreshStats(ctx);
  S.stats.ms = performance.now() - t0;
  S.built = true;
  S.pending = null; S.settle = 0;
  S.field.update(ctx.camera.camera, ctx.camera.pitch, true);
  updateLenses(ctx, true);
  emitChanged(ctx, [...world.props.items.keys()], []);
  ctx.log.info(`${S.stats.items} items (${S.stats.byKind.tree_oak || 0} oak-class, ${S.stats.byKind.tree_pine || 0} pine-class) in ${S.stats.ms.toFixed(0)} ms`);
}

/**
 * Dirty-region rebuild for a roads edit: place furniture on the named edges only and re-merge just
 * the chunks those items landed in. Cost is independent of forest density (item 23).
 */
function patchRoads(ctx, addedEdges) {
  // Roads precedes props in the registry; its coalesced geometry update has already landed.
  const t0 = performance.now();
  // Joining an existing junction can change the trims and anchors on its other edges.
  // Regenerate that rule graph transaction instead of retaining stale signal/lamp anchors.
  const changed = new Set(addedEdges);
  for (const id of addedEdges) {
    const e = ctx.world.roads.edges.get(id);
    if (e && [e.a,e.b].some(n => [...(ctx.world.roads.nodes.get(n)?.edges || [])].some(other => !changed.has(other)))) {
      rebuild(ctx); return;
    }
  }
  const placer = S.placer;
  const chunks = new Set();
  const candidates = new Map();
  // Query the placement hash along the graded corridor, including the verges and joins.
  // This never scans or regenerates the forest outside the edited road's neighbourhood.
  for (const id of addedEdges) {
    const edge = ctx.world.roads.edges.get(id);
    if (!edge) continue;
    const type = ctx.world.roads.types[edge.type];
    const radius = (type.asphaltHalf || type.width / 2) + (type.sidewalk || 0) + 12;
    const count = Math.max(1, Math.ceil(edge.length / 8));
    for (let i = 0; i <= count; i++) {
      const pt = ctx.world.roads.sample(id, i / count);
      if (pt) placer.near(pt.x, pt.z, radius, it => {
        if (Math.hypot(it.x-pt.x,it.z-pt.z) <= radius) candidates.set(it.id,it);
      });
    }
  }
  const removed = new Set(), moved = new Map();
  const forbidden = new Set(['tree_oak','tree_pine','bush','fence','planter','bench','bin']);
  for (const it of candidates.values()) {
    const tree = it.kind.startsWith('tree_');
    if (placer.T.isWater(it.x,it.z) || (forbidden.has(it.kind) && placer.onAsphalt(it.x,it.z)) || (tree && !placer.trunkClear(it.x,it.z))) {
      removed.add(it.id); chunks.add(chunkIndex(it.x,it.z));
      if (it.manual) S.manual.delete(it.id);
      continue;
    }
    // Road lamps/signals have authoritative profile anchors. Everything else tracks its
    // kind's ground rule; a saved computed y is never an explicit elevation override.
    if (it.kind === 'streetlamp' && it.edgeId !== undefined) continue;
    const y = placer.groundY(it.kind,it.x,it.z,{...it,y:undefined});
    if (Math.abs(y-it.y)>1e-6) {moved.set(it.id,{oldY:it.y,y});it.y=y;chunks.add(chunkIndex(it.x,it.z));}
  }
  reconcileRender(ctx, removed, moved, chunks);
  for (const id of removed) {placer.remove(id);ctx.world.props.items.delete(id);}
  const before = placer.items.length;
  placeSignals(ctx, placer);
  placeLamps(ctx, placer, addedEdges);
  placeEdgeFurniture(ctx, placer, addedEdges);
  const added = [];
  for (let i = before; i < placer.items.length; i++) {
    const it = placer.items[i];
    added.push(it.id);
    ctx.world.props.items.set(it.id, it);
    chunks.add(chunkIndex(it.x, it.z));
  }
  S.field.patch(chunks, S.kits, S.folKits);
  S.field.poolHeightCache?.clear();
  S.field.setPools(placer.lampHeads);
  S.lenses = collectLenses(placer);
  S.field.setLenses(S.lenses);
  S.lensKey = -1;
  ctx.world.props.version++;
  refreshStats(ctx);
  S.stats.ms = performance.now() - t0;
  updateLenses(ctx, true);
  S.field.update(ctx.camera.camera, ctx.camera.pitch, true);
  emitChanged(ctx, added, [...removed]);
}

// Keep the render lists, saved items and fence chains in the same transaction as the map.
function reconcileRender(ctx, removed, moved, chunks) {
  const p = S.placer;
  const at = new Map(p.items.map(it => [`${it.x},${it.z}`, it]));
  for (const key of ['trees','furniture','bushes','planterFills','litter','lampHeads','stops']) {
    p[key] = p[key].filter(entry => {
      const it = entry.item || p.byId.get(entry.id) || at.get(`${entry.x},${entry.z}`);
      if (!it) return true;
      if (removed.has(it.id)) return false;
      if (moved.has(it.id)) entry.y = it.y;
      return true;
    });
  }
  for (const key of ['fenceRuns','hedgeRuns']) {
    const runs = [];
    for (const run of p[key]) {
      if (removed.has(run.ownerId)) {for(const pt of run.pts) chunks.add(chunkIndex(pt.x,pt.z));continue;}
      let part = [];
      for (const pt of run.pts) {
        if (removed.has(pt.id)) {
          for(const q of run.pts) chunks.add(chunkIndex(q.x,q.z));
          if (part.length>1) runs.push({...run,pts:part});part=[];
        } else {if(moved.has(pt.id)) pt.y=moved.get(pt.id).y;part.push(pt);}
      }
      if (part.length>1) runs.push({...run,pts:part});
    }
    p[key]=runs;
  }
  for (const sig of p.signals) for (const arm of sig.arms) if (moved.has(arm.item.id)) arm.y=arm.item.y;
  for (const id of moved.keys()) if (S.manual.has(id)) S.manual.set(id,{...p.byId.get(id)});
}

function emitChanged(ctx, added, removed) {
  S.reentrant = true;
  try { ctx.events.emit('props:changed', { added, removed }); } finally { S.reentrant = false; }
}

function refreshStats(ctx) {
  const byKind = {};
  for (const k of KINDS) byKind[k] = 0;
  const sp = new Set();
  for (const it of S.placer.items) {
    byKind[it.kind] = (byKind[it.kind] || 0) + 1;
    if (it.species) sp.add(it.species);
  }
  const f = S.field.stats();
  S.stats.items = S.placer.items.length;
  S.stats.byKind = byKind;
  S.stats.instances = S.placer.trees.length;
  S.stats.draws = f.draws;
  S.stats.tris = f.tris + (S.field.staticTris || 0) * 0;
  S.stats.chunks = S.field.chunks.size;
  S.stats.species = [...sp];
}

// ------------------------------------------------------------------ signals
function trafficApi(ctx) {
  const t = ctx.modules?.traffic;
  return t && typeof t.signalState === 'function' ? t : null;
}

function signalList(ctx) {
  const out = [];
  const tr = trafficApi(ctx);
  const ph = signalPhase(ctx.world);
  for (const sig of S.placer.signals) {
    let source = 'props', phase = ph.phase, cycle = CYCLE, greenArms = [], armStates = [];
    let ext = null;
    if (tr) {
      try { ext = tr.signalState(sig.nodeId); } catch { ext = null; }
    }
    if (ext) {
      source = 'traffic';
      phase = ext.phase ?? 0;
      cycle = ext.cycle ?? CYCLE;
      greenArms = Array.isArray(ext.greenArms) ? ext.greenArms.slice() : [];
      const set = new Set(greenArms);
      for (const a of sig.arms) armStates.push({ edgeId: a.edgeId, atA: a.atA, state: set.has(a.edgeId) ? 'green' : 'red', timeToChange: ext.timeToChange ?? Math.max(0, (cycle || CYCLE) - (ext.since ?? 0)) });
    } else {
      for (const a of sig.arms) {
        const on = a.group === ph.group;
        const state = on ? ph.state : 'red';
        if (state === 'green' && !greenArms.includes(a.edgeId)) greenArms.push(a.edgeId);
        armStates.push({ edgeId: a.edgeId, atA: a.atA, state, timeToChange: +ph.ttc.toFixed(3) });
      }
    }
    out.push({ nodeId: sig.nodeId, x: sig.x, y: sig.y, z: sig.z, arms: sig.arms.length, phase, greenArms, cycle, source, armStates });
  }
  return out;
}

/**
 * Cheap per-frame key first (no allocation), full state only when it actually changed. `update()`
 * therefore allocates nothing while the phase holds.
 */
function lensKeyOf(ctx) {
  const tr = trafficApi(ctx);
  if (!tr) return signalPhase(ctx.world).phase;
  if (typeof tr.signalKey === 'function') return tr.signalKey();
  let k = 1000;
  for (const sig of S.placer.signals) {
    let st = null;
    try { st = tr.signalState(sig.nodeId); } catch { st = null; }
    k = (k * 31 + (st ? (st.phase | 0) + 1 : 0)) >>> 0;
    if (st?.greenArms) for (const id of st.greenArms) k = (k * 31 + id) >>> 0;
  }
  return k;
}

function updateLenses(ctx, force) {
  if (!S.field || !S.field.lensColors || !S.lenses.length) return;
  const key = lensKeyOf(ctx);
  if (!force && key === S.lensKey) return;
  const tr = trafficApi(ctx);
  const ph = signalPhase(ctx.world);
  S.lensKey = key;
  const col = S.field.lensColors;
  let lastSig = -1, ext = null;
  for (let i = 0; i < S.lenses.length; i++) {
    const L = S.lenses[i];
    const sig = S.placer.signals[L.sig];
    if (L.sig !== lastSig) {
      lastSig = L.sig;
      try { ext = tr?.signalState(sig.nodeId) || null; } catch { ext = null; }
    }
    const arm = sig.arms[L.arm];
    const st = ext ? (ext.greenArms?.includes(arm.edgeId) ? 'green' : 'red')
      : arm.group === ph.group ? ph.state : 'red';
    const idx = st === 'red' ? 0 : st === 'amber' ? 1 : 2;
    _c.copy(L.lens === idx ? LENS_LIT[L.lens] : LENS_OFF[L.lens]);
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
  }
  S.field.lens.instanceColor.needsUpdate = true;
}

// ------------------------------------------------------------------ pinned crop rects
function cropRects({ project, width, height }) {
  const out = {};
  if (!S.built || !S.placer) return out;
  const cam = S.ctx.camera.camera;
  const camPos = cam.position;
  const inFrame = (p) => p && p[2] < 1 && p[0] > -width * 0.2 && p[0] < width * 1.2 && p[1] > -height * 0.2 && p[1] < height * 1.2;
  const clampRect = (cx, cy, w, h) => {
    const x = Math.round(Math.max(0, Math.min(width - w, cx - w / 2)));
    const y = Math.round(Math.max(0, Math.min(height - h, cy - h / 2)));
    if (w > width || h > height) return null;
    if (cx-w/2 < 0 || cx+w/2 > width || cy-h/2 < 0 || cy+h/2 > height) return null;
    return [x, y, Math.round(w), Math.round(h)];
  };
  const K = width / 1920;                      // thresholds are quoted at 1080p

  // --- trees, nearest first
  const trees = S.placer.trees;
  const broad = [], con = [], crowns = [], trunks = [];
  for (const t of trees) {
    const d = Math.hypot(t.x - camPos.x, t.z - camPos.z, t.y + t.worldH * 0.6 - camPos.y);
    if (d > 260) continue;
    const sp = SPECIES[t.species];
    const crownY = t.y + t.worldH * (sp.crownBot + (1 - sp.crownBot) * 0.55);
    const crownR = t.worldH * sp.crownW * 0.5;
    const p = project(t.x, crownY, t.z);
    // A visible trunk must not be discarded merely because its crown is above the frame.
    const trunkY = t.y + 0.70;
    const tp = project(t.x, trunkY, t.z);
    const diameter = sp.trunkD * 1.12 * (1-0.9*Math.pow(0.70/t.worldH,0.72));
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0);
    const tw = project(t.x+right.x*diameter*0.5, trunkY+right.y*diameter*0.5, t.z+right.z*diameter*0.5);
    const wpx = Math.hypot(tw[0]-tp[0],tw[1]-tp[1])*2;
    if (inFrame(tp) && wpx >= 64*K) trunks.push({t,d,p:tp,wpx});
    if (!inFrame(p)) continue;
    const pr = project(t.x, crownY + crownR, t.z);       // vertical: always a screen-vertical offset
    const rpx = Math.abs(pr[1] - p[1]);
    const rec = { t, d, p, rpx, crownY, crownR };
    if (sp.cls === 'conifer') con.push(rec);
    else if (sp.cls === 'broad' || sp.cls === 'wide') broad.push(rec);
    const apex = project(t.x, t.y + t.worldH * 1.0, t.z);
    const bottom=project(t.x,t.y+t.worldH*sp.crownBot,t.z);
    if (inFrame(apex) && apex[1]>0 && rpx>35*K && rpx<85*K && bottom[1]-apex[1]<180*K) crowns.push({...rec,apex,bottom});

  }
  broad.sort((a, b) => a.d - b.d); con.sort((a, b) => a.d - b.d);
  trunks.sort((a, b) => a.d - b.d);
  crowns.sort((a, b) => a.apex[1] - b.apex[1]);
  for (const b of broad) {
    if (b.rpx <= 96 * K) continue;
    // upper-middle of the crown: foliage only, no trunk, no sky, and time-independent so the 12:00
    // and 22:00 captures measure the same pixels
    const r = clampRect(b.p[0], b.p[1] - b.rpx * 0.16, 128 * K, 128 * K);
    if (r) { out.canopy_broad = r; break; }
  }
  for (const c of con) {
    if (c.rpx <= 68 * K) continue;
    const r = clampRect(c.p[0], c.p[1] + c.rpx * 0.40, 128 * K, 128 * K);
    if (r) { out.canopy_conifer = r; break; }
  }
  for (const c of crowns) {
    const cy = (c.apex[1] + c.bottom[1]) * 0.5;
    const r = clampRect(c.p[0], cy, 200 * K, 200 * K);
    if (r) { out.crown = r; break; }
  }
  for (const t of trunks) {
    const r = clampRect(t.p[0], t.p[1], 64 * K, 64 * K);
    if (r) { out.trunk = r; break; }
  }

  // Candidate selection uses all projected boundary samples, never a clamped offscreen
  // circle. Choose a fully visible pool so unrelated foreground cannot dominate the metric.
  let poolArea=Infinity, headDistance=Infinity;
  for (const l of S.field.lampHeadPts || []) {
    const d=Math.hypot(l.x-camPos.x,l.y-camPos.y,l.z-camPos.z);
    const hp=project(l.x,l.y,l.z);
    if (inFrame(hp) && d<headDistance) {
      const r=clampRect(hp[0],hp[1],48*K,48*K);
      if (r) {out.lamp_head=r;headDistance=d;}
    }
    if (l.kit !== 'streetlamp' || d>100) continue;
    const groundY=(x,z)=>Math.max(S.ctx.world.terrain.getHeight(x,z), S.ctx.modules.roads?.surfaceHeightAt?.(x,z) ?? -Infinity)+.025;
    const gp=project(l.x,groundY(l.x,l.z),l.z);
    const rim=project(l.x,groundY(l.x,l.z+3),l.z+3);
    const size=128*K;
    // A core crop measures illumination, rather than averaging a whole disc's bounding
    // rectangle with mostly unlit pavement. Keep the outer silhouette as a separate rect.
    if(Math.abs(rim[1]-gp[1])>size*.5 && d<poolArea) {
      const core=clampRect(gp[0],gp[1],size,size);
      if(core) {
        out.pool=core;poolArea=d;
        for(const [dx,dz] of [[0,10],[0,-10],[10,0],[-10,0]]) {
          const x=l.x+dx,z=l.z+dz;
          if((S.field.lampHeadPts||[]).some(h=>Math.hypot(h.x-x,h.z-z)<8))continue;
          const p=project(x,groundY(x,z),z),r=clampRect(p[0],p[1],size,size);
          if(r){out.pool_unlit=r;break;}
        }
      }
    }
  }

  // --- hedge side face
  const hedges = [];
  for (const h of S.placer.hedgeRuns) {
    for (const m of h.pts) {
      const d = Math.hypot(m.x - camPos.x, m.z - camPos.z, m.y - camPos.y);
      if (d > 100) continue;
      hedges.push({ d, m });
    }
  }
  hedges.sort((a, b) => a.d - b.d);
  for (const cand of hedges) {
    const m = cand.m;
    const pc = project(m.x, m.y + 0.72, m.z);
    if (!inFrame(pc)) continue;
    const botP = project(m.x, m.y + 0.06, m.z);
    const topP = project(m.x, m.y + 1.40, m.z);
    const hpx = Math.abs(botP[1] - topP[1]);            // the hedge's full on-screen height
    if (hpx < 64 * K) continue;
    const r = clampRect(pc[0], (botP[1] + topP[1]) * 0.5, 256 * K, 64 * K);
    if (r) { out.hedge = r; break; }
  }
  return out;
}

// ------------------------------------------------------------------ module
export default {
  name: 'props',
  dependencies: ['terrain', 'roads'],
  budget: { drawCalls: 120, triangles: 700_000 },

  async init(ctx) {
    S.ctx = ctx;
    S.windClock = null;
    const t0 = performance.now();
    const aniso = ctx.assets?.anisotropy ?? 8;
    const tex = buildTextures(ctx.rng.fork('tex'), aniso, ctx.quality);
    // one bark strip, three columns picked per instance: furrowed / scaly conifer / pale birch
    tex.bark.wrapS = THREE.ClampToEdgeWrapping;
    tex.bark.wrapT = THREE.RepeatWrapping;
    tex.bark.needsUpdate = true;
    S.tex = tex;

    S.mats = makeMaterials(ctx, tex);
    S.uniforms = S.mats.uniforms;

    const g = ctx.rng.fork('treegeo');
    S.geo = { lod0: buildTreeGeometry(g, 0), lod1: buildTreeGeometry(g, 1), imp: buildImpostorGeometry() };
    S.kits = buildKits(tex.lut, ctx.rng.fork('kit'));
    const fr = ctx.rng.fork('fol');
    const bushGeo = [0, 1, 2, 3].map((i) => bushGeometry(fr.fork(`b${i}`), 16));
    const potGeo = [0, 1, 2].map((i) => planterFillGeometry(fr.fork(`p${i}`)));
    const litGeo = [0, 1, 2, 3, 4].map((i) => litterRing(fr.fork(`l${i}`)));
    const pick = (arr, f) => arr[Math.abs(Math.round(f.x * 7.3 + f.z * 13.1)) % arr.length];
    S.folKits = {
      fenceRun: (pts, variant) => fenceRun(tex.lut, pts, variant, fr.fork(`fence:${pts[0].x}:${pts[0].z}`)),
      hedgeRun: (pts) => hedgeRun(pts, fr.fork(`hedge:${pts[0].x}:${pts[0].z}`)),
      bush: (f) => pick(bushGeo, f),
      planterFill: (f) => pick(potGeo, f),
      litter: (f) => pick(litGeo, f),
    };

    S.placer = new Placer(ctx);
    S.field = new PropField(ctx, S.geo, S.mats);

    const mark = (payload) => {
      const prior = S.pending;
      if (!payload || !Array.isArray(payload.added) || payload.removed?.length || (prior && !Array.isArray(prior.added))) S.pending = {};
      else S.pending = {added: [...new Set([...(prior?.added || []), ...payload.added])], removed: []};
      S.settle = 0;
    };
    ctx.events.on('roads:changed', (p) => { if (!S.reentrant) mark(p); }, 'props');
    ctx.events.on('zones:changed', () => { if (!S.reentrant) mark({}); }, 'props');
    ctx.events.on('buildings:changed', () => { if (!S.reentrant) mark({}); }, 'props');
    ctx.events.on('services:changed', () => {
      if (!S.reentrant && S.placer.services.sync()) mark({});
    }, 'props');
    ctx.events.on('terrain:changed', () => {
      if (S.reentrant) return;
      // Roads publish the whole grading bounds while adding an edge. Preserve the named
      // road transaction instead of turning it into an unrelated full forest regeneration.
      if (S.pending?.added && ctx.modules.roads?._builder?.()?.flattening) return;
      mark({});
    }, 'props');
    // The planar reflection is deliberately lower-resolution than the main view. Trees, lamps and furniture
    // contribute heavily to it but resolve to indistinct sub-pixels, while roads and buildings retain the city form.
    // Own the visibility change here so terrain does not mutate a sibling module's scene graph.
    ctx.events.on('water:reflection', ({ active }) => { ctx.group.visible = !active; }, 'props');

    if (ctx.world.roads.edges.size || !ctx.world.flags.showcase) {
      try { rebuild(ctx); } catch (e) { ctx.log.error(`build failed: ${e?.message || e}`, e); }
    } else if (!ctx.world.roads.edges.size) {
      ctx.log.warn('no roads yet: road furniture deferred until roads:changed');
    }
    ctx.log.info(`ready in ${(performance.now() - t0).toFixed(0)} ms`);
  },

  update(dt, ctx) {
    if (S.pending) {
      S.settle += dt;
      if (S.settle >= 0.05) {
        const p = S.pending; S.pending = null;
        try {
          const inc = S.built && p && Array.isArray(p.added) && p.added.length && !(p.removed && p.removed.length);
          if (inc) patchRoads(ctx, p.added); else rebuild(ctx);
        } catch (e) { ctx.log.error(`rebuild failed: ${e?.message || e}`, e); }
      }
    }
    if (!S.built) return;
    const world = ctx.world;
    const cam = ctx.camera.camera;
    // wind: pure function of world.time, amplitude from world.weather.wind.speed
    const w = world.weather?.wind || { x: 1, z: 0, speed: 2 };
    const sp = Math.max(0, Math.min(7, w.speed || 0)) * S.sway;
    const len = Math.hypot(w.x || 1, w.z || 0) || 1;
    const amp = 0.008 * sp;
    S.uniforms.uWindPhase.value = sp > 0 ? windPhase(world, dt) : 0;
    S.uniforms.uWind.value.set((w.x / len) * amp, (w.z / len) * amp, amp * 0.22);
    S.uniforms.uCamPos.value.copy(cam.position);
    S.uniforms.uTopDown.value = S.field.topDown;

    const night = nightFactor(ctx);
    S.night = night;
    // night is moonlight, not a dimmed noon: albedo down and cool, driven by world.weather.night
    const k = 1 - night;
    S.mats.treeMat.color.setRGB(k + night * 0.062, k + night * 0.078, k + night * 0.128);
    S.mats.impMat.color.copy(S.mats.treeMat.color);
    S.mats.foliage.color.setRGB(k + night * 0.070, k + night * 0.086, k + night * 0.140);
    S.mats.furniture.color.setRGB(k + night * 0.30, k + night * 0.35, k + night * 0.48);
    S.mats.furniture.emissiveIntensity = 0.02 + night * 0.44;
    const on = night > 0.5;
    S.field.pool.visible = on && S.field.poolsOn;
    S.field.halo.visible = on && S.field.poolsOn;
    S.mats.pool.uniforms.uOpacity.value = on ? (night - 0.5) * 2 * 0.28 : 0;
    S.mats.halo.uniforms.uOpacity.value = on ? (night - 0.5) * 2 * 0.12 : 0;
    const h = ctx.renderer.domElement.height || 1080;
    S.mats.halo.uniforms.uScale.value = h / (2 * Math.tan((cam.fov * Math.PI) / 360));

    S.field.update(cam, ctx.camera.pitch);
    updateLenses(ctx, false);
  },

  dispose(ctx) {
    S.field?.dispose();
    for (const k of Object.keys(S.mats || {})) S.mats[k]?.dispose?.();
    for (const k of Object.keys(S.tex || {})) S.tex[k]?.dispose?.();
    for (const k of Object.keys(S.geo || {})) S.geo[k]?.dispose?.();
    S.built = false;
  },

  api: {
    place(kind, x, z, opts = {}) {
      if (!S.built || !KINDS.includes(kind)) return -1;
      const ctx = S.ctx;
      const t0 = performance.now();
      const it = S.placer.tryAdd(kind, x, z, {...opts, manualPlacement: true});
      if (!it) return -1;
      S.placer.byId.delete(it.id);
      it.id = S.nextManualId++; it.manual = true;
      S.placer.byId.set(it.id, it);
      S.manual.set(it.id, {...it});
      renderItem(ctx, S.placer, it);
      S.field.patch(new Set([chunkIndex(x, z)]), S.kits, S.folKits);
      if (kind === 'streetlamp') S.field.setPools(S.placer.lampHeads);
      S.field.update(ctx.camera.camera, ctx.camera.pitch, true);
      S.ctx.world.props.items.set(it.id, it);
      S.ctx.world.props.version++;
      refreshStats(ctx);
      S.stats.ms = performance.now() - t0;
      emitChanged(ctx, [it.id], []);
      return it.id;
    },
    remove(id) {
      if (!S.built) return false;
      const it = S.ctx.world.props.items.get(id);
      if (!it) return false;
      const ci = chunkIndex(it.x, it.z);
      if (it.manual) S.manual.delete(id);
      else S.suppressed.add(S.placer.intentKey(it.kind, it.x, it.z, it.variant));
      S.placer.remove(id);
      const dirty = new Set([ci]);
      for (const key of ['fenceRuns', 'hedgeRuns']) {
        const runs = [];
        for (const run of S.placer[key]) {
          if (run.ownerId === id) {
            for (const pt of run.pts) dirty.add(chunkIndex(pt.x, pt.z));
            continue;
          }
          if (!run.pts.some(pt => pt.id === id || (Math.abs(pt.x-it.x)<1e-4 && Math.abs(pt.z-it.z)<1e-4))) { runs.push(run); continue; }
          for (const pt of run.pts) dirty.add(chunkIndex(pt.x, pt.z));
          let part = [];
          for (const pt of run.pts) {
            if (pt.id === id || (Math.abs(pt.x-it.x)<1e-4 && Math.abs(pt.z-it.z)<1e-4)) {
              if (part.length > 1) runs.push({...run, pts:part}); part = [];
            } else part.push(pt);
          }
          if (part.length > 1) runs.push({...run, pts:part});
        }
        S.placer[key] = runs;
      }
      for (const arr of [S.placer.furniture, S.placer.bushes, S.placer.lampHeads, S.placer.planterFills, S.placer.litter, S.placer.stops]) {
        for (let i = arr.length - 1; i >= 0; i--) if (Math.abs(arr[i].x - it.x) < 1e-4 && Math.abs(arr[i].z - it.z) < 1e-4) arr.splice(i, 1);
      }
      for (let i = S.placer.trees.length - 1; i >= 0; i--) if (S.placer.trees[i].item === it) S.placer.trees.splice(i, 1);
      S.ctx.world.props.items.delete(id);
      S.ctx.world.props.version++;
      S.field.patch(dirty, S.kits, S.folKits);
      if (it.kind === 'streetlamp') S.field.setPools(S.placer.lampHeads);
      for (const [edge, lamps] of S.placer.lampsByEdge) S.placer.lampsByEdge.set(edge, lamps.filter(l => l.id !== id));
      S.field.update(S.ctx.camera.camera, S.ctx.camera.pitch, true);
      refreshStats(S.ctx);
      emitChanged(S.ctx, [], [id]);
      return true;
    },
    at(x, z, radius = 2) { return S.placer ? S.placer.at(x, z, radius) : []; },
    count(kind) {
      if (!S.built) return 0;
      if (!kind) return S.ctx.world.props.items.size;
      return S.stats.byKind[kind] || 0;
    },
    rebuild() { if (S.ctx) rebuild(S.ctx); },
    stats() {
      if (S.field) { const f = S.field.stats(); S.stats.draws = f.draws; S.stats.tris = f.tris; S.stats.chunks = f.chunks; }
      return {
        items: S.stats.items, byKind: { ...S.stats.byKind }, instances: S.stats.instances,
        draws: S.stats.draws, tris: S.stats.tris, chunks: S.stats.chunks,
        species: S.stats.species.length, speciesNames: S.stats.species.slice(), ms: +S.stats.ms.toFixed(2), radii: { ...RADII },
      };
    },
    lampsFor(edgeId) {
      const l = S.placer?.lampsByEdge.get(edgeId);
      return l ? l.map((e) => ({ id: e.id, x: e.x, y: e.y, z: e.z, heading: e.heading, side: e.side, t: e.t })) : [];
    },
    signals() { return S.built ? signalList(S.ctx) : []; },
    signalFor(edgeId, atA) {
      if (!S.built) return null;
      for (const s of signalList(S.ctx)) {
        for (const a of s.armStates) {
          if (a.edgeId === edgeId && (atA === undefined || a.atA === atA)) {
            return { state: a.state, timeToChange: a.timeToChange, source: s.source };
          }
        }
      }
      return null;
    },
    stops() { return S.placer ? S.placer.stops.map((s) => ({ ...s })) : []; },
    setDensity(v) {
      const nv = Math.max(0, Math.min(1, +v || 0));
      if (nv === S.density) return;
      S.density = nv;
      if (S.built) rebuild(S.ctx);
    },
    cropRects(arg) { try { return cropRects(arg); } catch { return {}; } },
    serialize() {
      if (!S.placer) return {version: 0, items: []};
      const p = S.placer;
      // Preserve the exact generated geometry inputs as additive save data. In particular, fence
      // runs, tree tints, shelter subparts and manually placed items must survive a round trip.
      const render = {};
      for (const key of ['trees','furniture','fenceRuns','hedgeRuns','bushes','planterFills','litter','lampHeads','signals','stops']) render[key] = p[key];
      render.lampsByEdge = [...p.lampsByEdge];
      render.furnishedEdges = [...p.furnishedEdges];
      return JSON.parse(JSON.stringify({version: S.ctx.world.props.version, density: S.density, items: p.items, manual: [...S.manual.values()], suppressed: [...S.suppressed], nextManualId: S.nextManualId, nextGeneratedId: p.nextId, identities: [...p.identities], render}));
    },
    deserialize(data, options = {}) {
      if (!S.ctx || !Array.isArray(data?.items)) return;
      const ctx = S.ctx, p = S.placer, t0 = performance.now();
      const removed = [...ctx.world.props.items.keys()];
      p.reset();
      p.identities = new Map(data.identities || []);
      p.nextId = Math.max(1, data.nextGeneratedId || 1);
      S.manual = new Map((data.manual || data.items.filter(it => it.manual)).map(it => [it.id, {...it}]));
      S.suppressed = new Set(data.suppressed || []); p.suppressed = S.suppressed;
      S.nextManualId = Math.max(1000000000, data.nextManualId || 0, ...[...S.manual.keys()].map(id => id+1));
      for (const raw of data.items) {
        if (!KINDS.includes(raw.kind) || !Number.isFinite(raw.x) || !Number.isFinite(raw.z)) continue;
        const it = {...raw};
        p.items.push(it); p.byId.set(it.id, it);
        const key = p.key(it.x, it.z);
        if (!p.hash.has(key)) p.hash.set(key, []);
        p.hash.get(key).push(it);
        if (!it.manual) {
          p.nextId = Math.max(p.nextId, it.id + 1);
          const base = p.intentKey(it.kind, it.x, it.z), slot = p.identitySlots.get(base) || 0;
          p.identities.set(slot ? `${base}#${slot}` : base, it.id);
          p.identitySlots.set(base, slot + 1);
        }
      }
      if (data.render) {
        const r = JSON.parse(JSON.stringify(data.render));
        for (const key of ['trees','furniture','fenceRuns','hedgeRuns','bushes','planterFills','litter','lampHeads','signals','stops']) p[key] = r[key] || [];
        for (const t of p.trees) t.item = p.byId.get(t.item.id);
        for (const sig of p.signals) {
          p.signalNodes.add(sig.nodeId);
          for (const arm of sig.arms) arm.item = p.byId.get(arm.item.id);
        }
        p.lampsByEdge = new Map(r.lampsByEdge || []);
        p.furnishedEdges = new Set(r.furnishedEdges || p.lampsByEdge.keys());
      } else {
        for (const it of p.items) {
          if (it.kind.startsWith('tree_')) {
            const species = SPECIES[it.species] ? it.species : it.kind === 'tree_pine' ? 'spruce' : 'oak';
            const sp = SPECIES[species], worldH = sp.base * it.scale;
            it.species = species;
            p.trees.push({item: it, ...it, species, worldH, shape: shapeFor(species, worldH), tint: sp.tints[0].slice(), group:'save'});
          } else if (it.kind === 'bush') p.bushes.push({...it});
          else if (it.kind !== 'fence') p.furniture.push({...it, kit: it.kind === 'streetlamp' && it.variant === 'lantern' ? 'streetlamp_lantern' : it.kind});
        }
      }
      if (Number.isFinite(data.density)) S.density = data.density;
      S.field.build(p, S.kits, S.folKits);
      S.lenses = collectLenses(p); S.field.setLenses(S.lenses); S.lensKey = -1;
      syncWorld(ctx, p); S.pending = null; S.built = true;
      S.field.update(ctx.camera.camera, ctx.camera.pitch, true);
      updateLenses(ctx, true); refreshStats(ctx); S.stats.ms = performance.now() - t0;
      emitChanged(ctx, [...ctx.world.props.items.keys()], removed);
      if (options.rollback && Number.isFinite(data.version)) ctx.world.props.version = data.version;
    },
    debug: {
      /**
       * Isolate a layer. Trees are per-instance (species is an instance attribute), so `tree_oak` and
       * `tree_pine` hide exactly their own instances. The other ten kinds share one merged geometry per
       * chunk per kind-class, so `bush`/`fence` toggle the alpha-foliage mesh and the rest toggle the
       * hard-furniture mesh -- the finest granularity the section 5 geometry rule allows.
       */
      setKindVisible(kind, on) {
        if (!S.field) return;
        const group = (kind === 'tree_oak' || kind === 'tree_pine') ? kind
          : (kind === 'bush' || kind === 'fence') ? 'foliage' : 'furniture';
        S.field.kindVisible[group] = !!on;
        S.field.update(S.ctx.camera.camera, S.ctx.camera.pitch, true);
      },
      setLod(level) { if (!S.field) return; S.field.forceLod = (level === null || level === undefined) ? null : Math.max(0, Math.min(2, level | 0)); S.field.update(S.ctx.camera.camera, S.ctx.camera.pitch, true); },
      setSway(on) { S.sway = on ? 1 : 0; },
      windState() { return { phase: S.uniforms?.uWindPhase.value ?? 0, amplitude: S.uniforms?.uWind.value.length() ?? 0 }; },
      setPools(on) { if (S.field) { S.field.poolsOn = !!on; S.field.pool.visible = !!on && S.night > 0.5; S.field.halo.visible = !!on && S.night > 0.5; } },
      lodHistogram() { return S.field ? { ...S.field.lodCounts } : { lod0: 0, lod1: 0, impostor: 0 }; },
      poolAxis() { return S.field ? (S.field.poolAxis || []).slice() : []; },
    },
  },

  showcase: {
    description: 'A wooded valley town: five tree silhouettes across eight species, a tree-lined avenue with lamps, benches, bins, hydrants, signs and a bus shelter, a signalised crossroads, a hedged park with lantern posts, planters, bushes and two fence types, and a mixed forest on the ridge.',
    cameras: CAMERAS,
    async setup(ctx) {
      stage(ctx);
      ctx.modules.roads?.rebuild?.();
      rebuild(ctx);
      registerPresets(ctx);
    },
  },
};

// ------------------------------------------------------------------ camera presets from real geometry
function registerPresets(ctx) {
  const T = ctx.world.terrain;
  const scene = SCENE.get(ctx.world.seed);
  const reg = (n, p) => ctx.camera.registerPreset(n, p);
  const P = S.placer;

  // forest: the densest 60 m cell of the forest scatter
  {
    const cells = new Map();
    for (const t of P.trees) {
      if (t.group !== 'forest') continue;
      const k = `${Math.round(t.x / 60)},${Math.round(t.z / 60)}`;
      const c = cells.get(k) || { n: 0, x: 0, z: 0 };
      c.n++; c.x += t.x; c.z += t.z; cells.set(k, c);
    }
    let best = null;
    for (const c of cells.values()) {
      const cx = c.x / c.n, cz = c.z / c.n;
      if (!best || c.n > best.n) best = { n: c.n, x: cx, z: cz };
    }
    if (best) reg('forest', { yaw: 0.7, pitch: 0.30, distance: 120, target: [best.x, T.getHeight(best.x, best.z) + 10, best.z] });
    else reg('forest', { yaw: 0.7, pitch: 0.30, distance: 120, target: [0, 10, -200] });
  }
  const X = scene ? scene.cross.x : 40, Z = scene ? scene.cross.z : 40;
  reg('avenue', { yaw: -Math.PI / 2, pitch: 0.20, distance: 45, target: [X + 40, T.getHeight(X + 40, Z) + 3.0, Z] });
  reg('signal', { yaw: 0.85, pitch: 0.22, distance: 19, target: [X + 4, T.getHeight(X, Z) + 4.0, Z + 4] });
  reg('canopy', { yaw: 0.3, pitch: 0.95, distance: 90, target: [X + 10, T.getHeight(X + 10, Z) + 6, Z] });

  // lamp: 12 m from a real lamp base, looking up the avenue
  {
    let best = null;
    for (const l of P.lampHeads) {
      if (l.kit !== 'streetlamp') continue;
      const d = Math.hypot(l.x - X, l.z - Z);
      if (d < 22 || d > 90) continue;
      if (!best || d < best.d) best = { l, d };
    }
    const l = best ? best.l : { x: X + 30, y: T.getHeight(X + 30, Z) + 0.2, z: Z + 9 };
    reg('lamp', { yaw: -Math.PI / 2, pitch: 0.17, distance: 20.5, target: [l.x, l.y + 2.8, l.z] });
  }
  // treecloseup: one broadleaf filling the frame, trunk and litter ring at the bottom, sky above
  {
    let best = null;
    for (const t of P.trees) {
      if (t.species !== 'oak') continue;
      if (t.worldH < 9.5 || t.worldH > 13.0) continue;
      const d = Math.hypot(t.x - (X + 34), t.z - (Z + 14));
      if (!best || d < best.d) best = { t, d };
    }
    const t = best ? best.t : { x: X + 30, y: 0, z: Z + 12, worldH: 11 };
    reg('treecloseup', { yaw: 0.84, pitch: 0.15, distance: 8.6, target: [t.x, t.y + 3.1, t.z] });
  }
  // busstop
  {
    const s = P.stops[0];
    if (s) reg('busstop', { yaw: -s.heading + Math.PI - 0.55, pitch: 0.18, distance: 15, target: [s.x, s.y + 1.7, s.z] });
    else reg('busstop', { yaw: 0.8, pitch: 0.18, distance: 15, target: [X + 20, 2, Z + 10] });
  }
  // park
  if (scene) {
    const p = scene.park;
    reg('park', { yaw: 0.75, pitch: 0.30, distance: 78, target: [p.cx, T.getHeight(p.cx, p.cz) + 3, p.cz] });
  } else reg('park', { yaw: 0.75, pitch: 0.28, distance: 60, target: [-150, 3, 140] });
}
