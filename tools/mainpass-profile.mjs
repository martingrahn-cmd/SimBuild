#!/usr/bin/env node
// Attribute peak whole-frame geometry by module group without persisting any game change.
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.SIM_URL || 'http://127.0.0.1:5173';
const out = process.env.OUT_DIR || 'shots/democity/r5h-rejected';
const outFile = process.env.OUT_FILE || 'mainpass-profile.json';
const camera = process.env.CAMERA || 'aerial';
const time = Number(process.env.TIME || 22);
const speed = Number(process.env.SPEED || 0);
const moveCamera = process.env.MOVE_CAMERA === '1';
const sampleFrames = Number(process.env.SAMPLE_FRAMES || 40);
const warmFrames = Number(process.env.WARM_FRAMES || 0);
const executablePath = process.env.SIM_CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromium.executablePath()].find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=metal','--use-gl=angle','--enable-webgl','--enable-gpu','--ignore-gpu-blocklist','--no-sandbox','--window-size=1920,1080'] });
const defaults = [null, 'props', 'props:tree_oak', 'props:tree_pine', 'props:bush', 'props:bench', 'props:lod2', 'traffic', 'services', 'roads', 'roads:asphalt', 'roads:concrete', 'roads:gravel', 'roads:paint', 'buildings', 'transit'];
const targets = process.env.TARGETS ? process.env.TARGETS.split(',').map(v => v === 'baseline' ? null : v) : defaults;
const result = { url: base, camera, time, speed, moveCamera, warmFrames, sampleFrames, targets: [] };
try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), errors = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/@vite/client', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${base}/?showcase=democity&time=${time}&camera=${camera}&seed=1337&quality=high&headless=1&speed=${speed}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__sim?.ready === true, null, { timeout: 240000 });
    const measure = await page.evaluate(async ({ name, sampleFrames, moveCamera, warmFrames }) => {
      const s = window.__sim, shadowSpec = name?.startsWith('shadow:') ? name.slice(7).split(':') : null, shadowOwner = shadowSpec?.[0] || null, shadowKind = shadowSpec?.[1] || null, propKind = name?.startsWith('props:') ? name.slice(6) : null, roadKind = name?.startsWith('roads:') ? name.slice(6) : null, buildingMode = name?.startsWith('buildings:') ? name.slice(10) : null, buildingKind = buildingMode?.startsWith('lod') ? Number(buildingMode.slice(3)) : null, terrainLodScale = name?.startsWith('terrain:lodscale') ? Number(name.slice('terrain:lodscale'.length)) : null, terrainDefines = name === 'terrain:nofine' ? { T_NO_FINE: 1 } : name === 'terrain:nomacro' ? { T_NO_MACRO: 1 } : name === 'terrain:nofine-nomacro' ? { T_NO_FINE: 1, T_NO_MACRO: 1 } : null, reflectionOff = name === 'water:reflection-off', group = name && !shadowOwner && !propKind && !roadKind && !buildingMode && !reflectionOff && !terrainDefines && !Number.isFinite(terrainLodScale) ? s.registry.get(name)?.group : null;
      if (propKind === 'lod2') s.registry.apis.props.debug.setLod(2);
      else if (propKind) s.registry.apis.props.debug.setKindVisible(propKind, false);
      const roadMeshes = [], roadMaterials = new Set();
      if (roadKind) s.registry.get('roads')?.group?.traverse(mesh => {
        const ownedKind = mesh.name.startsWith(`roads/${roadKind}/`) || mesh.name.startsWith(`roads/${roadKind}-lod/`);
        if (mesh.isMesh && ownedKind) {
          roadMeshes.push(mesh);
          for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) {
            if (material) { material.visible = false; roadMaterials.add(material); }
          }
        }
      });
      const buildingLodInfo = Number.isFinite(buildingKind) ? (() => {
        const p = s.camera.position, chunks = new Map();
        s.registry.get('buildings')?.group?.traverse(mesh => {
          const match = /^buildings:([^:]+):lod([01])$/.exec(mesh.name || '');
          if (!match) return;
          const [ix, iz] = match[1].split(',').map(Number);
          const dx = Math.max(0, Math.abs((ix + 0.5) * 128 - p.x) - 64);
          const dz = Math.max(0, Math.abs((iz + 0.5) * 128 - p.z) - 64);
          const dy = Math.max(0, p.y - 60);
          const row = chunks.get(match[1]) || { key: match[1], distance: Math.sqrt(dx * dx + dz * dz + dy * dy), lod: null, triangles: {} };
          row.triangles[`lod${match[2]}`] = (mesh.userData.mainIndexCount ?? 0) / 3;
          if (mesh.visible) row.lod = Number(match[2]);
          chunks.set(match[1], row);
        });
        return [...chunks.values()].sort((a, b) => a.distance - b.distance);
      })() : undefined;
      if (Number.isFinite(terrainLodScale)) s.registry.apis.terrain.debug.setLodScale(terrainLodScale);
      if (terrainDefines) s.registry.apis.terrain.debug.setDefines(terrainDefines);
      if (Number.isFinite(buildingKind)) s.registry.apis.buildings.forceLod(buildingKind);
      if (buildingMode && !Number.isFinite(buildingKind)) {
        const materials = new Set();
        s.registry.get('buildings')?.group?.traverse(mesh => { if (mesh.isMesh && mesh.material) materials.add(mesh.material); });
        for (const material of materials) {
          if (buildingMode === 'nonormal' || buildingMode === 'nomaps') material.normalMap = null;
          if (buildingMode === 'noorm' || buildingMode === 'nomaps') { material.roughnessMap = null; material.metalnessMap = null; }
          if (buildingMode === 'noemissive' || buildingMode === 'nomaps') material.emissiveMap = null;
          if (buildingMode === 'nomaps') material.map = null;
          material.needsUpdate = true;
        }
      }
      if (reflectionOff) s.registry.apis.terrain.setReflection(false);
      if (group) group.visible = false;
      const shadowMeshes = [], shadowTreeTris = [];
      if (shadowOwner === 'props') s.registry.get('props')?.group?.traverse(mesh => {
        if (mesh.isInstancedMesh && mesh.castShadow) shadowTreeTris.push(mesh.geometry.index?.count / 3 || mesh.geometry.attributes.position.count / 3);
      });
      const treeTriLevels = [...new Set(shadowTreeTris)].sort((a, b) => b - a);
      if (shadowOwner) s.registry.get(shadowOwner)?.group?.traverse(mesh => {
        if (!mesh.isMesh || !mesh.castShadow) return;
        const treeTris = mesh.geometry.index?.count / 3 || mesh.geometry.attributes.position.count / 3;
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        const shadowCenter = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
        const farPlanarDistance = shadowKind?.startsWith('farxz') ? Number(shadowKind.slice(5)) : null;
        const farDistance = shadowKind?.startsWith('far') && !shadowKind.startsWith('farxz') ? Number(shadowKind.slice(3)) : null;
        const matchesKind = !shadowKind ||
          (Number.isFinite(farPlanarDistance) && Math.hypot(shadowCenter.x - s.camera.position.x, shadowCenter.z - s.camera.position.z) > farPlanarDistance) ||
          (Number.isFinite(farDistance) && shadowCenter.distanceTo(s.camera.position) > farDistance) ||
          (shadowKind === 'furniture' && shadowOwner === 'props' && !mesh.isInstancedMesh && !!mesh.geometry.attributes.uv1) ||
          (shadowKind === 'foliage' && shadowOwner === 'props' && !mesh.isInstancedMesh && !mesh.geometry.attributes.uv1) ||
          (shadowKind === 'tree' && shadowOwner === 'props' && mesh.isInstancedMesh) ||
          (shadowKind === 'tree-lod0' && shadowOwner === 'props' && mesh.isInstancedMesh && treeTris === treeTriLevels[0]) ||
          (shadowKind === 'tree-lod1' && shadowOwner === 'props' && mesh.isInstancedMesh && treeTris === treeTriLevels[1]);
        if (!matchesKind) return;
        shadowMeshes.push(mesh);
        // Owners may recompute shadow distance every frame. This diagnostic page
        // ignores those writes so the temporary mask remains stable for the sample.
        Object.defineProperty(mesh, 'castShadow', { configurable: true, get: () => false, set: () => {} });
      });
      // Props restores its group at the end of a reflection. Register after its owner listener
      // to keep this diagnostic mask in force for the enclosing main pass too.
      if (name === 'props') s.events.on('water:reflection', ({active}) => { if (!active) group.visible = false; }, 'mainpass-profile');
      if (warmFrames > 0) {
        const warmStart = s.engine.stats.frames;
        while (s.engine.stats.frames < warmStart + warmFrames) {
          if (moveCamera) s.camera.yaw += 0.001;
          await new Promise(requestAnimationFrame);
        }
      }
      const start = s.engine.stats.frames, startedAt = performance.now();
      let max = { drawCalls: 0, triangles: 0 }, min = { drawCalls: Infinity, triangles: Infinity };
      let sums = { drawCalls: 0, triangles: 0 }, samples = 0, sampled = 0, last = start;
      while (s.engine.stats.frames < start + sampleFrames) {
        if (moveCamera) s.camera.yaw += 0.001;
        await new Promise(requestAnimationFrame);
        const now = s.engine.stats.frames;
        if (now !== last) {
          const q = s.stats();
          max.drawCalls = Math.max(max.drawCalls, q.drawCalls); max.triangles = Math.max(max.triangles, q.triangles);
          min.drawCalls = Math.min(min.drawCalls, q.drawCalls); min.triangles = Math.min(min.triangles, q.triangles);
          sums.drawCalls += q.drawCalls; sums.triangles += q.triangles; samples++;
          sampled += now-last; last = now;
        }
      }
      const elapsedMs = performance.now() - startedAt;
      const average = { drawCalls: sums.drawCalls / samples, triangles: sums.triangles / samples };
      const shadowMeshInfo = shadowOwner ? {
        count: shadowMeshes.length,
        sourceTriangles: shadowMeshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count / 3 || mesh.geometry.attributes.position.count / 3) * (mesh.isInstancedMesh ? mesh.count : 1), 0),
        treeTriLevels,
        camera: s.camera.position.toArray(),
        meshes: shadowMeshes.map(mesh => {
          if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
          const center = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
          return {
            name: mesh.name || '',
            instanced: mesh.isInstancedMesh,
            instances: mesh.isInstancedMesh ? mesh.count : 1,
            baseTriangles: mesh.geometry.index?.count / 3 || mesh.geometry.attributes.position.count / 3,
            uv1: !!mesh.geometry.attributes.uv1,
            center: center.toArray(),
            centerDistance: center.distanceTo(s.camera.position),
          };
        }),
      } : undefined;
      return { max, min, average, samples, sampled, elapsedMs, fps: sampled / (elapsedMs / 1000), moduleVisible: reflectionOff ? false : shadowOwner ? shadowMeshes.every(mesh => !mesh.castShadow) : roadKind ? [...roadMaterials].every(material => !material.visible) : group?.visible ?? true, buildingLodInfo, shadowMeshInfo, errors: s.errors.slice() };
    }, { name: target, sampleFrames, moveCamera, warmFrames });
    result.targets.push({ target: target || 'baseline', ...measure, browserErrors: errors });
    await page.close();
  }
  const baseRow = result.targets[0].max;
  for (const row of result.targets.slice(1)) row.removedFromPeak = { drawCalls: baseRow.drawCalls - row.max.drawCalls, triangles: baseRow.triangles - row.max.triangles };
  result.pass = result.targets.every(r => !r.errors.length && !r.browserErrors.length);
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/${outFile}`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
