// terrain module: heightfield generation, world.terrain API, chunked/LOD/instanced splat mesh, planar water.
import * as THREE from 'three';
import { LAYERS, SEA_LEVEL } from '../../core/constants.js';
import { generateHeightmap } from './gen/heightmap.js';
import { Noise2D } from './gen/noise.js';
import { TerrainData } from './data.js';
import { TerrainMesh } from './mesh.js';
import { generateLandcover } from './gen/landcover.js';
import { createTerrainMaterial, createTerrainDepthMaterial, createTerrainLiteMaterial, makeMacroNoiseTexture, makeLandTexture, VERTEX_PARS, VERTEX_BEGIN } from './material.js';
import { Water, makeRippleNormal, makeSeaMask } from './water.js';
import { GrassScatter } from './detail.js';
import { makeShowcase } from './showcase.js';

const S = {
  data: null, gen: null, mesh: null, water: null, grass: null, material: null, depthMaterial: null, liteMaterial: null,
  macro: null, land: null, seaMask: null, ripple: null, sets: null,
  sunColor: new THREE.Color(), skyColor: new THREE.Color(), lightColor: new THREE.Color(), moonTint: new THREE.Color(0.62, 0.72, 0.95),
  warm: new THREE.Color(1.0, 0.55, 0.28), white: new THREE.Color(1.0, 0.97, 0.92),
  lastVersion: -1, lastSun: new THREE.Vector3(),
};

const REFLECTION_SIZE = { low: 512, medium: 640, high: 768, ultra: 1280 };
const LOD_SCALE = { low: 0.5, medium: 0.65, high: 0.8, ultra: 1.3 };

export default {
  name: 'terrain',
  dependencies: ['environment'],   // init order only: lets us hand our custom materials to the CSM/fog hooks
  budget: { drawCalls: 20, triangles: 1_300_000 },   // includes the 3 shadow cascades now cast from the visible LOD

  async init(ctx) {
    const { world, events, assets, log } = ctx;
    const T = world.terrain;
    const t0 = performance.now();
    const gen = generateHeightmap(ctx.rng.fork('heightmap'), { res: T.resolution || 513, size: world.size });
    const data = new TerrainData(gen, T.seaLevel ?? SEA_LEVEL, 16);
    S.gen = gen; S.data = data;
    log.info(`heightfield ${data.res}² generated in ${(performance.now() - t0).toFixed(0)} ms, range ${data.minH.toFixed(1)}..${data.maxH.toFixed(1)} m`);

    // ---- world.terrain API (mutate in place; never replace the section object) ----
    T.heights = data.heights;
    T.resolution = data.res;
    T.cellSize = data.cell;
    T.getHeight = (x, z) => data.getHeight(x, z);
    T.getNormal = (x, z, out) => data.getNormal(x, z, out);
    T.getSlope = (x, z) => data.getSlope(x, z);
    T.isWater = (x, z) => data.isWater(x, z);
    T.raycast = (ray) => data.raycast(ray);
    T.modify = (brush) => {
      const r = data.modify(brush);
      if (!r) return false;
      T.version = data.version;
      if (S.mesh) S.mesh.refreshBounds();
      if (S.water) S.water.invalidate();
      events.emit('terrain:changed', { x: brush.x, z: brush.z, radius: brush.radius ?? 20 });
      return true;
    };
    T.minHeight = data.minH; T.maxHeight = data.maxH;
    // generation features for other modules (bridges, coast roads, democity layout)
    T.features = {
      river: { zAt: (x) => gen.river.zAt[Math.max(0, Math.min(data.res - 1, Math.round((x + data.half) / data.cell)))],
               halfWidthAt: (x) => gen.river.halfWidth[Math.max(0, Math.min(data.res - 1, Math.round((x + data.half) / data.cell)))] },
      coast: { xAt: (z) => gen.coast.xAt[Math.max(0, Math.min(data.res - 1, Math.round((z + data.half) / data.cell)))] },
      island: { ...gen.island },
    };

    // ---- textures ----
    const [grass, grassFine, dirt, rock, sand, scree] = await Promise.all([
      assets.pbr('aerial_grass_rock'), assets.pbr('leafy_grass'), assets.pbr('brown_mud_leaves_01'), assets.pbr('rock_face'), assets.pbr('aerial_beach_01'), assets.pbr('gravel_floor_02'),
    ]);
    S.sets = { grass, grassFine, dirt, rock, sand, scree };
    for (const set of [grass, grassFine, dirt, rock, sand, scree]) for (const k of ['map', 'normalMap', 'armMap', 'roughnessMap']) {
      const t = set[k]; if (!t) continue;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(k === 'map' ? 4 : 2, assets.anisotropy); t.needsUpdate = true;
    }
    const nr = ctx.rng.fork('macro');
    S.macro = makeMacroNoiseTexture([new Noise2D(nr.fork('a')), new Noise2D(nr.fork('b')), new Noise2D(nr.fork('c')), new Noise2D(nr.fork('d'))], 256);
    S.ripple = makeRippleNormal(new Noise2D(ctx.rng.fork('ripple')), 256, 1.4);
    const t1 = performance.now();
    S.land = makeLandTexture(generateLandcover(ctx.rng.fork('landcover'), gen, ctx.quality === 'low' ? 512 : 1024));
    S.seaMask = makeSeaMask(gen, 64);
    log.info(`land-cover map ${ctx.quality === 'low' ? 512 : 1024}² in ${(performance.now() - t1).toFixed(0)} ms`);

    // ---- mesh ----
    S.material = createTerrainMaterial(data, { grass, grassFine, dirt, rock, sand, scree, macro: S.macro, land: S.land });
    S.depthMaterial = createTerrainDepthMaterial(data);
    S.liteMaterial = createTerrainLiteMaterial(data, S.macro, S.land);
    S.mesh = new TerrainMesh(data, S.material, S.depthMaterial, { lodScale: LOD_SCALE[ctx.quality] ?? 1, layer: LAYERS.TERRAIN, proxyMaterial: S.liteMaterial });
    ctx.group.add(S.mesh.group);

    // ---- water ----
    S.water = new Water(data, {
      ripple: S.ripple, macro: S.macro, seaMask: S.seaMask, size: REFLECTION_SIZE[ctx.quality] ?? 1024,
      mainCamera: ctx.camera.camera, seaLevel: data.seaLevel,
      // the reflection sees the cheap proxies only: LOD meshes and the ground clutter are hidden for that pass
      onReflection: (begin) => { S.mesh.reflectionPass = begin; if (S.grass) S.grass.group.visible = !begin; },
    });
    ctx.group.add(S.water.mesh);
    // near-camera ground clutter: blades + mid-range tufts (2 draw calls), palette-matched to the ground
    S.grass = new GrassScatter(data, ctx.rng.fork('grass'), { seaLevel: data.seaLevel, layer: LAYERS.TERRAIN, macro: S.macro, land: S.land, world });
    // roads publish a coverage mask (world.roads.isRoad); no blades/tufts on asphalt or sidewalks. The mask is
    // rebuilt after the roads module settles, so we poll its version each frame (cheap) and also listen to the event.
    events.on('roads:changed', () => { if (S.grass) S.grass.invalidate(); }, 'terrain');
    ctx.group.add(S.grass.group);
    // hand materials that are not permanently in the scene graph to the environment's shadow/fog hooks
    const env = ctx.modules.environment;
    if (env && typeof env.setupMaterial === 'function') {
      for (const m of [S.material, S.liteMaterial, S.water.material, ...S.grass.materials]) { try { env.setupMaterial(m); } catch (e) { log.warn('environment.setupMaterial failed', e); } }
    }

    // first cull with the current camera so frame 1 is complete
    ctx.camera.updateCamera();
    S.mesh.update(ctx.camera.camera);
    this.update(0, ctx);
    log.info(`ready in ${(performance.now() - t0).toFixed(0)} ms; chunks visible ${S.mesh.stats.visible} (lod ${S.mesh.stats.lod.join('/')})`);
  },

  update(dt, ctx) {
    if (!S.mesh) return;
    const cam = ctx.camera.camera;
    const t = ctx.world.time;
    S.mesh.update(cam);
    S.water.follow(cam);
    S.grass.update(cam, (!t.paused && t.speed > 0) ? dt : 0, S.data.version);
    const w = ctx.world.weather;
    if (!t.paused && t.speed > 0) S.water.update(dt);
    S.water.refreshSky();
    // sun + sky tint for the water (environment publishes sunDir/sunIntensity; sky tint follows the fog colour)
    const el = w.sunDir.y;
    const day = THREE.MathUtils.smoothstep(el, -0.05, 0.3);
    S.sunColor.copy(S.warm).lerp(S.white, THREE.MathUtils.smoothstep(el, 0.0, 0.4)).multiplyScalar(Math.max(0, w.sunIntensity ?? 3) / 3.2);
    if (ctx.scene.fog) S.skyColor.copy(ctx.scene.fog.color); else S.skyColor.copy(w.skyLight || S.white);
    S.skyColor.multiplyScalar(0.35 + 0.65 * day);
    if (!S.lastSun.equals(w.sunDir)) { S.lastSun.copy(w.sunDir); S.water.invalidate(); }
    // glints follow the environment's active light (sun by day, moon at night)
    const lightDir = w.lightDir || w.sunDir;
    const moonLit = lightDir !== w.sunDir && lightDir.dot(w.sunDir) < 0.99;
    if (moonLit) S.lightColor.copy(S.moonTint).multiplyScalar(Math.min(1.0, (w.lightIntensity ?? 0.05) * 6.0));
    else S.lightColor.copy(S.sunColor);
    S.water.setSun(w.sunDir, S.sunColor, S.skyColor, day, lightDir, S.lightColor);
  },

  dispose(ctx) {
    if (S.mesh) { ctx.group.remove(S.mesh.group); S.mesh.dispose(); }
    if (S.water) { ctx.group.remove(S.water.mesh); S.water.dispose(); }
    if (S.grass) { ctx.group.remove(S.grass.group); S.grass.dispose(); S.grass = null; }
    S.material?.dispose(); S.depthMaterial?.dispose(); S.liteMaterial?.dispose(); S.macro?.dispose(); S.land?.dispose(); S.seaMask?.dispose(); S.ripple?.dispose(); S.data?.dispose();
    S.mesh = S.water = S.material = S.depthMaterial = S.data = S.gen = null;
  },

  api: {
    data: () => S.data,
    stats: () => (S.mesh ? { ...S.mesh.stats } : null),
    setReflection(enabled) { if (S.water) S.water.enabled = !!enabled; },
    setGrassTufts(enabled) { if (S.grass) S.grass.enabled = !!enabled; },
    material: () => S.material,
    /** dev/profiling knobs */
    debug: {
      setAnisotropy(n) { if (!S.sets) return; for (const set of Object.values(S.sets)) for (const k of ['map', 'normalMap', 'armMap']) { if (set[k]) { set[k].anisotropy = n; set[k].needsUpdate = true; } } },
      setWater(v) { if (S.water) S.water.mesh.visible = !!v; },
      setTerrain(v) { if (S.mesh) S.mesh.group.visible = !!v; },
      setLite(v) { if (S.mesh) S.mesh.setMaterial(v ? S.liteMaterial : S.material); },
      waterRT() { return S.water ? S.water.rt : null; },
      setCastShadow(v) { if (S.mesh) for (const m of S.mesh.meshes) m.castShadow = !!v; },
      setReceiveShadow(v) { if (S.mesh) for (const m of S.mesh.meshes) { m.receiveShadow = !!v; m.material.needsUpdate = true; } },
      setLodScale(v) { if (S.mesh) { S.mesh.lodScale = v; S.mesh._dirty = true; } },
      setPlain() {
        if (!S.mesh) return;
        const m = new THREE.MeshStandardMaterial({ color: 0x557733, roughness: 1 });
        m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, S.material.userData.uniforms); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERTEX_PARS).replace('#include <begin_vertex>', VERTEX_BEGIN); };
        m.customProgramCacheKey = () => 'plain-dbg';
        S.mesh.setMaterial(m);
      },
      setDefines(defs) { if (!S.material) return; S.material.defines = defs; S.material.needsUpdate = true; },
    },
  },

  showcase: makeShowcase(S),
};
