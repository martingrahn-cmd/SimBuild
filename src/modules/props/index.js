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

const CYCLE = 60;                    // game-seconds per signal cycle
const LENS_LIT = [
  new THREE.Color(1.70, 0.16, 0.06),
  new THREE.Color(1.55, 0.62, 0.05),
  new THREE.Color(0.14, 1.45, 0.30),
];
const LENS_OFF = [
  new THREE.Color(0.075, 0.030, 0.020),
  new THREE.Color(0.080, 0.055, 0.020),
  new THREE.Color(0.028, 0.075, 0.040),
];

const S = {
  ctx: null, tex: null, mats: null, geo: null, kits: null, folKits: null,
  placer: null, field: null, uniforms: null,
  built: false, pending: null, settle: 0, reentrant: false,
  density: 1, sway: 1, lenses: [], lensKey: -1,
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
function windPhase(world) {
  return (gameSeconds(world) * 0.9) % 6283.185307;
}
function signalPhase(world) {
  const p = ((gameSeconds(world) % CYCLE) + CYCLE) % CYCLE;
  if (p < 26) return { phase: 0, group: 0, state: 'green', ttc: 26 - p, p };
  if (p < 30) return { phase: 1, group: 0, state: 'amber', ttc: 30 - p, p };
  if (p < 56) return { phase: 2, group: 1, state: 'green', ttc: 56 - p, p };
  return { phase: 3, group: 1, state: 'amber', ttc: 60 - p, p };
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

  const foliage = new THREE.MeshStandardMaterial({
    map: tex.leaf, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide,
    roughness: 0.86, metalness: 0,
  });

  const pool = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(1.0, 0.80, 0.52) } },
    vertexShader: `attribute float aR; varying float vR;
      void main() { vR = aR; vec4 mv = modelViewMatrix * instanceMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vR;
      void main() {
        float k = clamp( 1.0 - vR, 0.0, 1.0 );
        float a = pow( k, 2.3 ) * ( 0.34 + 0.66 * pow( k, 2.0 ) );
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

  const lens = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true, side: THREE.FrontSide });
  lens.userData.envSkip = true;

  return { ...t, furniture, foliage, pool, halo, lens, lensGeo: lensGeometry(), uniforms };
}

// ------------------------------------------------------------------ build
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
          const p = new THREE.Vector3(hx, hy + LENS_DY[k], LENS_Z - 0.02).applyMatrix4(_m);
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
  ctx.modules.roads?.rebuild?.();     // make sure the new edge has geometry before we read its anchors
  const t0 = performance.now();
  const placer = S.placer;
  const before = placer.items.length;
  placeSignals(ctx, placer);
  placeLamps(ctx, placer, addedEdges);
  placeEdgeFurniture(ctx, placer, addedEdges);
  const added = [];
  const chunks = new Set();
  for (let i = before; i < placer.items.length; i++) {
    const it = placer.items[i];
    added.push(it.id);
    ctx.world.props.items.set(it.id, it);
    chunks.add(chunkIndex(it.x, it.z));
  }
  S.field.patch(chunks, S.kits, S.folKits);
  S.field.setPools(placer.lampHeads);
  S.lenses = collectLenses(placer);
  S.field.setLenses(S.lenses);
  S.lensKey = -1;
  ctx.world.props.version++;
  refreshStats(ctx);
  S.stats.ms = performance.now() - t0;
  updateLenses(ctx, true);
  S.field.update(ctx.camera.camera, ctx.camera.pitch, true);
  emitChanged(ctx, added, []);
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
  let k = 1000;
  for (const sig of S.placer.signals) {
    let st = null;
    try { st = tr.signalState(sig.nodeId); } catch { st = null; }
    k = (k * 31 + (st ? (st.phase | 0) + 1 : 0)) >>> 0;
  }
  return k;
}

function updateLenses(ctx, force) {
  if (!S.field || !S.field.lensColors || !S.lenses.length) return;
  const key = lensKeyOf(ctx);
  if (!force && key === S.lensKey) return;
  const list = signalList(ctx);
  S.lensKey = key;
  const col = S.field.lensColors;
  const stateFor = (si, ai) => {
    const s = list[si];
    if (!s) return 'red';
    const a = s.armStates[ai];
    return a ? a.state : 'red';
  };
  for (let i = 0; i < S.lenses.length; i++) {
    const L = S.lenses[i];
    const st = stateFor(L.sig, L.arm);
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
    if (cx < 0 || cx > width || cy < 0 || cy > height) return null;
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
    if (!inFrame(p)) continue;
    const pr = project(t.x, crownY + crownR, t.z);       // vertical: always a screen-vertical offset
    const rpx = Math.abs(pr[1] - p[1]);
    const rec = { t, d, p, rpx, crownY, crownR };
    if (sp.cls === 'conifer') con.push(rec);
    else if (sp.cls === 'broad' || sp.cls === 'wide') broad.push(rec);
    const apex = project(t.x, t.y + t.worldH * 1.0, t.z);
    if (inFrame(apex) && rpx > 110 * K) crowns.push({ ...rec, apex });
    const trunkY = t.y + Math.min(1.8, t.worldH * 0.16);
    const tp = project(t.x, trunkY, t.z);
    const tw = project(t.x, trunkY + sp.trunkD * 0.56 * 0.80, t.z);   // taper at the sample height
    const wpx = Math.abs(tw[1] - tp[1]) * 2;
    if (inFrame(tp) && wpx > 70 * K) trunks.push({ t, d, p: tp, wpx });
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
    if (c.rpx <= 96 * K) continue;
    const r = clampRect(c.p[0], c.p[1] + c.rpx * 0.20, 128 * K, 128 * K);
    if (r) { out.canopy_conifer = r; break; }
  }
  for (const c of crowns) {
    const cy = (c.apex[1] + c.p[1]) * 0.5;
    const r = clampRect(c.p[0], cy, 200 * K, 200 * K);
    if (r) { out.crown = r; break; }
  }
  for (const t of trunks) {
    const r = clampRect(t.p[0], t.p[1], 64 * K, 64 * K);
    if (r) { out.trunk = r; break; }
  }

  // --- lamp pool + head
  let bestLamp = null;
  for (const l of (S.field.lampHeadPts || [])) {
    const d = Math.hypot(l.x - camPos.x, l.z - camPos.z, l.y - camPos.y);
    if (d > 90) continue;
    const p = project(l.ax, l.gy, l.az);
    if (!inFrame(p)) continue;
    if (!bestLamp || d < bestLamp.d) bestLamp = { l, d, p };
  }
  if (bestLamp) {
    const l = bestLamp.l;
    const major = l.kit === 'streetlamp_lantern' ? 11.0 : 13.4;
    const edge = project(l.ax + major * 0.5 + 2.0, l.gy, l.az);
    const rpx = Math.abs(edge[0] - bestLamp.p[0]);
    const size = Math.max(128 * K, Math.min(460 * K, rpx * 2));
    const r = clampRect(bestLamp.p[0], bestLamp.p[1], size, size);
    if (r) out.pool = r;
    const hp = project(l.x, l.y, l.z);
    if (inFrame(hp)) {
      const hr = clampRect(hp[0], hp[1], 48 * K, 48 * K);
      if (hr) out.lamp_head = hr;
    }
  }

  // --- hedge side face
  const hedges = [];
  for (const h of S.placer.hedgeRuns) {
    for (const m of h.pts) {
      const d = Math.hypot(m.x - camPos.x, m.z - camPos.z, m.y - camPos.y);
      if (d > 60) continue;
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
    if (hpx < 72 * K) continue;
    const r = clampRect(pc[0], (botP[1] + topP[1]) * 0.5, 256 * K, 64 * K);
    if (r) { out.hedge = r; break; }
  }
  return out;
}

// ------------------------------------------------------------------ module
export default {
  name: 'props',
  dependencies: ['terrain', 'roads'],
  budget: { drawCalls: 400, triangles: 900_000 },

  async init(ctx) {
    S.ctx = ctx;
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
      fenceRun: (pts, variant) => fenceRun(tex.lut, pts, variant, fr),
      hedgeRun: (pts) => hedgeRun(pts, fr),
      bush: (f) => pick(bushGeo, f),
      planterFill: (f) => pick(potGeo, f),
      litter: (f) => pick(litGeo, f),
    };

    S.placer = new Placer(ctx);
    S.field = new PropField(ctx, S.geo, S.mats);

    const mark = (payload) => { S.pending = payload || {}; S.settle = 0; };
    ctx.events.on('roads:changed', (p) => { if (!S.reentrant) mark(p); }, 'props');
    ctx.events.on('zones:changed', () => { if (!S.reentrant) mark({}); }, 'props');
    ctx.events.on('buildings:changed', () => { if (!S.reentrant) mark({}); }, 'props');
    ctx.events.on('terrain:changed', () => { if (!S.reentrant) mark({}); }, 'props');

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
      if (S.settle > 0.05) {
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
    S.uniforms.uWindPhase.value = sp > 0 ? windPhase(world) : 0;
    S.uniforms.uWind.value.set((w.x / len) * amp, (w.z / len) * amp, amp * 0.22);
    S.uniforms.uCamPos.value.copy(cam.position);
    S.uniforms.uTopDown.value = S.field.topDown;

    const night = nightFactor(ctx);
    S.night = night;
    // night is moonlight, not a dimmed noon: albedo down and cool, driven by world.weather.night
    const k = 1 - night;
    S.mats.treeMat.color.setRGB(k + night * 0.175, k + night * 0.215, k + night * 0.340);
    S.mats.impMat.color.copy(S.mats.treeMat.color);
    S.mats.foliage.color.setRGB(k + night * 0.160, k + night * 0.200, k + night * 0.320);
    S.mats.furniture.color.setRGB(k + night * 0.44, k + night * 0.50, k + night * 0.66);
    S.mats.furniture.emissiveIntensity = 0.02 + night * 1.95;
    const on = night > 0.5;
    S.field.pool.visible = on && S.field.poolsOn;
    S.field.halo.visible = on && S.field.poolsOn;
    S.mats.pool.uniforms.uOpacity.value = on ? (night - 0.5) * 2 * 0.95 : 0;
    S.mats.halo.uniforms.uOpacity.value = on ? (night - 0.5) * 2 * 0.55 : 0;
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
      const it = S.placer.tryAdd(kind, x, z, opts);
      if (!it) return -1;
      if (kind === 'tree_oak' || kind === 'tree_pine') {
        const species = opts.species || (kind === 'tree_pine' ? 'spruce' : 'oak');
        const sp = SPECIES[species] || SPECIES.oak;
        const scale = it.scale;
        it.species = species;
        S.placer.trees.push({
          item: it, x: it.x, y: it.y, z: it.z, heading: it.heading, worldH: sp.base * scale, species,
          tint: sp.tints[0].slice(), shape: shapeFor(species, sp.base * scale), group: 'api',
        });
      } else if (kind === 'bush') {
        S.placer.bushes.push({ x: it.x, y: it.y, z: it.z, heading: it.heading, scale: it.scale });
      } else if (kind === 'fence') {
        // a lone fence item has no run; nothing to draw until a run is built around it
      } else {
        const kit = kind === 'streetlamp' && opts.variant === 'lantern' ? 'streetlamp_lantern' : kind;
        S.placer.furniture.push({ kit, x: it.x, y: it.y, z: it.z, heading: it.heading, scale: it.scale });
        if (kind === 'streetlamp') S.placer.lampHeads.push({ x: it.x, y: it.y, z: it.z, heading: it.heading, kit });
      }
      S.field.patch(new Set([chunkIndex(x, z)]), S.kits, S.folKits);
      S.ctx.world.props.items.set(it.id, it);
      S.ctx.world.props.version++;
      refreshStats(ctx);
      emitChanged(ctx, [it.id], []);
      return it.id;
    },
    remove(id) {
      if (!S.built) return false;
      const it = S.ctx.world.props.items.get(id);
      if (!it) return false;
      const ci = chunkIndex(it.x, it.z);
      S.placer.remove(id);
      for (const arr of [S.placer.furniture, S.placer.bushes, S.placer.lampHeads]) {
        for (let i = arr.length - 1; i >= 0; i--) if (Math.abs(arr[i].x - it.x) < 1e-4 && Math.abs(arr[i].z - it.z) < 1e-4) arr.splice(i, 1);
      }
      for (let i = S.placer.trees.length - 1; i >= 0; i--) if (S.placer.trees[i].item === it) S.placer.trees.splice(i, 1);
      S.ctx.world.props.items.delete(id);
      S.ctx.world.props.version++;
      S.field.patch(new Set([ci]), S.kits, S.folKits);
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
        species: S.stats.species.slice(), ms: +S.stats.ms.toFixed(2), radii: { ...RADII },
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
      const items = [];
      for (const it of (S.placer?.items || [])) {
        items.push({ id: it.id, kind: it.kind, x: +it.x.toFixed(3), z: +it.z.toFixed(3), heading: +it.heading.toFixed(4), scale: +it.scale.toFixed(4), species: it.species, edgeId: it.edgeId, lotId: it.lotId });
      }
      return { version: S.ctx?.world.props.version ?? 0, items };
    },
    deserialize(data) {
      if (!S.ctx) return;
      rebuild(S.ctx);
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
  reg('signal', { yaw: 0.85, pitch: 0.22, distance: 25, target: [X, T.getHeight(X, Z) + 4.2, Z] });
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
    reg('lamp', { yaw: -Math.PI / 2, pitch: 0.12, distance: 12, target: [l.x, l.y + 4.4, l.z] });
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
    if (s) reg('busstop', { yaw: s.heading + Math.PI + 0.55, pitch: 0.18, distance: 15, target: [s.x, s.y + 1.7, s.z] });
    else reg('busstop', { yaw: 0.8, pitch: 0.18, distance: 15, target: [X + 20, 2, Z + 10] });
  }
  // park
  if (scene) {
    const p = scene.park;
    reg('park', { yaw: 0.75, pitch: 0.30, distance: 78, target: [p.cx, T.getHeight(p.cx, p.cz) + 3, p.cz] });
  } else reg('park', { yaw: 0.75, pitch: 0.28, distance: 60, target: [-150, 3, 140] });
}
