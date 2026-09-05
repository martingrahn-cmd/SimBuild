// props: trees (oak / pine / birch, 2 LODs + impostors, wind sway), street lamps with night halos and
// light pools, signalised intersections, and the sidewalk kit (benches, bins, hydrants, signs, bus
// shelters, fences, bushes, hedges, planters). Placement is driven by roads (lamp anchors, intersections,
// frontage) and terrain (slope/height/road-distance density map for the forest).
import * as THREE from 'three';
import { RENDER_ORDER, LAYERS } from '../../core/constants.js';
import {
  makeLeafAtlas, makeBarkAtlas, makeImpostorAtlas, makeGlowSprite, makeLightPool,
  makeSignAtlas, makeSlotLUTs, makeDetailNormal,
} from './textures.js';
import { buildTreeGeometries, makeTreeMaterials, SPECIES } from './trees.js';
import { buildFurniture, SIGNAL_HEADS, LENS_DY } from './furniture.js';
import { roadDistanceField, scatterForest, placeStreet, placeGardens } from './place.js';
import { TreeField, NightRig, buildInstances } from './render.js';
import { stage, CAMERAS } from './showcase.js';

const S = {
  ctx: null, tex: null, geos: null, mats: null, kindGeos: null,
  field: null, rig: null, inst: null, wind: null,
  signals: [], lensPhase: 0, lensT: 0, built: false, pending: false, settle: 0,
  stats: { trees: 0, props: 0, forest: 0, lamps: 0, signals: 0, ms: 0 },
};

const LENS_COLOR = [
  new THREE.Color(0xff2f1c), new THREE.Color(0xffa010), new THREE.Color(0x2ad64c),
];
const OFF = new THREE.Color(0x000000);
const _v = new THREE.Vector3();

function nightFactor(ctx) {
  const env = ctx.modules.environment;
  if (env && typeof env.getNight === 'function') { const n = env.getNight(); if (Number.isFinite(n)) return n; }
  const h = ctx.clock.hour;
  const d = Math.min(Math.abs(h - 12), 12);
  return THREE.MathUtils.smoothstep(d, 5.2, 7.0);
}

// ---------------------------------------------------------------- build
function clearWorldProps(world) {
  world.props.items.clear();
}

function registerProps(world, data, trees) {
  const items = world.props.items;
  let id = 1;
  for (const kind of Object.keys(data.kinds)) {
    if (kind.startsWith('plate_') || kind === 'glass') continue;
    for (const p of data.kinds[kind]) items.set(id, { id, kind, x: p.x, y: p.y, z: p.z, heading: p.heading || 0, scale: p.scale || 1, edgeId: p.edgeId });
    id += data.kinds[kind].length;
  }
  for (const t of trees) {
    items.set(id, { id, kind: `tree_${t.species}`, x: t.x, y: t.y, z: t.z, heading: t.rot, scale: t.scale });
    id++;
  }
  world.props.version++;
}

function rebuild(ctx) {
  const t0 = performance.now();
  S.pending = false; S.settle = 0;
  const world = ctx.world;
  // tear down previous instances
  if (S.inst) { for (const m of Object.values(S.inst)) { ctx.group.remove(m); m.dispose(); } S.inst = null; }
  const rd = roadDistanceField(world);
  const street = placeStreet(ctx, rd);
  placeGardens(ctx, rd, street);
  const forest = scatterForest(ctx, rd, { minRoadDist: ctx.world.flags.showcase === 'props' ? 50 : 24, maxTrees: ctx.quality === 'low' ? 6000 : 16000 });
  const trees = forest.concat(street.trees);

  S.field.setTrees(trees);
  S.field.prepareColors();
  S.inst = buildInstances(ctx.group, S.kindGeos, street.kinds, S.mats);

  // lamp night rig
  S.rig.setLamps(street.kinds.streetlamp, world);

  // signal lenses: 2 heads x 3 lenses per signal mast
  S.signals = street.kinds.trafficlight;
  const lens = [];
  for (const s of S.signals) {
    const c = Math.cos(-s.heading), sn = Math.sin(-s.heading);
    for (const [hx, hy] of SIGNAL_HEADS) for (const dy of LENS_DY) {
      const lx = hx, ly = hy + dy, lz = -0.20;
      lens.push({ x: s.x + lx * c + lz * sn, y: s.y + ly, z: s.z - lx * sn + lz * c });
    }
  }
  S.rig.setLenses(lens);
  updateLens(0, true);

  clearWorldProps(world);
  registerProps(world, street, trees);

  S.stats.trees = trees.length;
  S.stats.forest = forest.length;
  S.stats.lamps = street.kinds.streetlamp.length;
  S.stats.signals = S.signals.length;
  S.stats.props = 0;
  for (const k of Object.keys(street.kinds)) S.stats.props += street.kinds[k].length;
  S.stats.ms = performance.now() - t0;
  S.built = true;
  S.field.update(0, ctx.camera.camera, true);
  ctx.events.emit('props:changed', { added: [...world.props.items.keys()], removed: [] });
  ctx.log.info(`${trees.length} trees (${forest.length} forest), ${S.stats.props} props, ${S.stats.lamps} lamps, ${S.stats.signals} signals in ${S.stats.ms.toFixed(0)} ms`);
  return { street, trees };
}

// ---------------------------------------------------------------- signal cycle
function updateLens(dt, force) {
  if (!S.rig || !S.rig.lensColors) return;
  const prev = S.lensPhase;
  S.lensT += dt;
  const CYCLE = 26;
  const t = S.lensT % CYCLE;
  // 0 green A / 11 amber A / 13 red both / 26
  let stateA, stateB;
  if (t < 10.5) { stateA = 2; stateB = 0; }
  else if (t < 13) { stateA = 1; stateB = 0; }
  else if (t < 23.5) { stateA = 0; stateB = 2; }
  else { stateA = 0; stateB = 1; }
  const key = stateA * 4 + stateB;
  if (!force && key === S.lensPhase) return;
  S.lensPhase = key;
  const col = S.rig.lensColors;
  let i = 0;
  for (const s of S.signals) {
    const st = s.phase === 0 ? stateA : stateB;
    for (let head = 0; head < SIGNAL_HEADS.length; head++) {
      for (let k = 0; k < 3; k++) {
        // LENS_DY is [top, middle, bottom] => red, amber, green
        const lit = (k === 0 && st === 0) || (k === 1 && st === 1) || (k === 2 && st === 2);
        const c = lit ? LENS_COLOR[k] : OFF;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        i++;
      }
    }
  }
  const attr = S.rig.lens.geometry.getAttribute('lensColor');
  if (attr) attr.needsUpdate = true;
}

export default {
  name: 'props',
  dependencies: ['terrain', 'roads'],
  budget: { drawCalls: 400, triangles: 1_900_000 },

  async init(ctx) {
    S.ctx = ctx;
    const t0 = performance.now();
    const rng = ctx.rng;
    // --- textures
    const lut = makeSlotLUTs();
    const leafAtlas = makeLeafAtlas(rng.fork('leaves'), ctx.quality === 'low' ? 512 : 1024);
    const bark = makeBarkAtlas(rng.fork('bark'), 256, 512);
    const impostorAtlas = makeImpostorAtlas(rng.fork('impostor'), 256, 512);
    const glow = makeGlowSprite(128);
    const pool = makeLightPool(128);
    const signs = makeSignAtlas(512);
    const detail = makeDetailNormal(rng.fork('detail'));
    S.tex = { lut, leafAtlas, bark, impostorAtlas, glow, pool, signs, detail };

    // --- wind uniforms shared by every foliage material
    S.wind = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3(0.012, 0.004, 0.9) } };

    // --- materials
    const tm = makeTreeMaterials(bark, leafAtlas, impostorAtlas, S.wind);
    const furniture = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 1,
      roughnessMap: lut.rm, metalnessMap: lut.rm,
      normalMap: detail, normalScale: new THREE.Vector2(0.35, 0.35),
      emissive: new THREE.Color(0xffca7d), emissiveMap: lut.em, emissiveIntensity: 0,
    });
    const decal = new THREE.MeshStandardMaterial({
      map: signs, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xaebfc8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.24,
      side: THREE.DoubleSide, depthWrite: false, transmission: 0, envMapIntensity: 1.4,
    });
    S.mats = { ...tm, furniture, decal, glass };

    // --- geometry
    S.geos = buildTreeGeometries(rng.fork('treegeo'));
    S.kindGeos = buildFurniture(lut, rng.fork('furniture'));

    S.field = new TreeField(ctx.group, S.geos, S.mats, ctx.quality);
    S.rig = new NightRig(ctx, glow, pool);

    for (const k of ['tree_birch', 'hedge', 'flowers']) if (!ctx.world.props.kinds.includes(k)) ctx.world.props.kinds.push(k);

    ctx.events.on('roads:changed', () => { S.pending = true; S.settle = 0; }, 'props');

    if (ctx.world.roads.edges.size || !ctx.world.flags.showcase) {
      try { rebuild(ctx); } catch (e) { ctx.log.error(`build failed: ${e?.message || e}`, e); }
    }
    ctx.log.info(`ready in ${(performance.now() - t0).toFixed(0)} ms`);
  },

  update(dt, ctx) {
    if (S.pending) { S.settle += dt; if (S.settle > 0.12) { try { rebuild(ctx); } catch (e) { ctx.log.error(`rebuild failed: ${e?.message || e}`, e); S.pending = false; } } }
    if (!S.built) return;
    const cam = ctx.camera.camera;
    // wind
    const w = ctx.world.weather.wind || { x: 1, z: 0, speed: 2 };
    const sp = Math.min(9, Math.max(0.4, w.speed || 2));
    const amp = 0.008 + sp * 0.0022;
    const len = Math.hypot(w.x || 1, w.z || 0) || 1;
    S.wind.uTime.value += dt;
    S.wind.uWind.value.set((w.x / len) * amp, (w.z / len) * amp, 0.55 + sp * 0.10);
    // tree LOD + culling
    S.field.update(dt, cam);
    // night rig
    const night = nightFactor(ctx);
    S.mats.furniture.emissiveIntensity = 0.05 + night * 3.4;
    const h = ctx.renderer.domElement.height || 1080;
    const projScale = h / (2 * Math.tan((cam.fov * Math.PI) / 360));
    S.rig.haloMat.uniforms.uScale.value = projScale;
    S.rig.haloMat.uniforms.uSize.value = 5.2;
    S.rig.lensMat.uniforms.uScale.value = projScale;
    S.rig.lensMat.uniforms.uSize.value = 0.80;
    S.rig.lensMat.uniforms.uOpacity.value = 0.80 + night * 0.20;
    S.rig.update(dt, cam, night);
    updateLens(dt, false);
  },

  dispose(ctx) {
    S.field?.dispose();
    S.rig?.dispose();
    if (S.inst) for (const m of Object.values(S.inst)) { ctx.group.remove(m); m.dispose(); }
    for (const m of Object.values(S.mats || {})) m.dispose?.();
    for (const k of Object.keys(S.tex || {})) { const t = S.tex[k]; if (t?.dispose) t.dispose(); else if (t?.map) { t.map.dispose?.(); t.normalMap?.dispose?.(); } }
    S.inst = null; S.field = null; S.rig = null; S.built = false;
  },

  api: {
    rebuild() { if (S.ctx) rebuild(S.ctx); },
    stats() { return { ...S.stats, ...(S.field ? S.field.stats() : {}) }; },
    /** All lamp luminaire positions (world space) — traffic/effects may want them. */
    lamps() { return S.rig ? S.rig.lamps.map((l) => ({ x: l._lx, y: l._ly, z: l._lz })) : []; },
    /** Current signal state for a node: 0 red, 1 amber, 2 green, per phase group. */
    signalState(nodeId) {
      const s = S.signals.find((q) => q.nodeId === nodeId);
      if (!s) return null;
      const a = Math.floor(S.lensPhase / 4), b = S.lensPhase % 4;
      return { phase0: a, phase1: b, phase: s.phase };
    },
    count() { return S.ctx ? S.ctx.world.props.items.size : 0; },
    serialize() { return { version: 1, seed: S.ctx?.world.seed ?? 0 }; },
    deserialize() { if (S.ctx) rebuild(S.ctx); },
  },

  showcase: {
    description: 'A wooded valley town: mixed oak/pine/birch forest, a signalised crossroads, lamp-lit avenue with benches, bins, hydrants, signs, a bus shelter, fences, hedges and planters.',
    cameras: CAMERAS,
    async setup(ctx) {
      stage(ctx);
      ctx.modules.roads?.rebuild?.();
      const out = rebuild(ctx);
      // point the 'forest' preset at the densest stand we actually generated
      const cells = new Map();
      for (const t of out.trees) {
        if (t.kind !== 'forest') continue;
        const k = `${Math.round(t.x / 60)},${Math.round(t.z / 60)}`;
        const c = cells.get(k) || { n: 0, x: 0, z: 0 };
        c.n++; c.x += t.x; c.z += t.z; cells.set(k, c);
      }
      let best = null;
      for (const c of cells.values()) {
        const cx = c.x / c.n, cz = c.z / c.n;
        const score = c.n - Math.hypot(cx, cz) * 0.03;
        if (!best || score > best.score) best = { score, x: cx, z: cz, n: c.n };
      }
      if (best) {
        const T = ctx.world.terrain;
        const y = T.getHeight(best.x, best.z);
        const px = best.x + 62, pz = best.z + 78;
        ctx.camera.registerPreset('forest', { position: [px, T.getHeight(px, pz) + 26, pz], target: [best.x, y + 8, best.z] });
      }
      ctx.camera.registerPreset('lamps_night', CAMERAS.lamps_night);
    },
  },
};
