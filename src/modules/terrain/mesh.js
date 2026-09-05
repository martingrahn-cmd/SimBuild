// Chunked, LOD'd, frustum-culled terrain mesh in 3 draw calls (+3 shadow-cascade draws): one instanced patch geometry per LOD level.
// Each visible 128 m chunk is an instance (aChunk = [originX, originZ, size, lod]); the vertex shader fetches
// heights from the R32F height texture, so LODs never crack (skirts hide T-junction gaps) and brush edits are
// a texture upload, not a geometry rebuild.
import * as THREE from 'three';

const LOD_CELLS = [32, 16, 8];          // cells per patch edge at LOD 0/1/2 (chunk = 32 heightfield cells)

export function buildPatch(cells, withSkirt = true) {
  const n = cells + 1;
  const verts = n * n + (withSkirt ? 4 * n : 0);          // grid + 4 skirt rows
  const pos = new Float32Array(verts * 3);
  let p = 0;
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) { pos[p++] = ix / cells; pos[p++] = 0; pos[p++] = iz / cells; }
  // skirt vertices: y = 1 flags "drop"
  const skirtBase = n * n;
  const edges = [];
  for (let e = 0; e < (withSkirt ? 4 : 0); e++) {
    const base = skirtBase + e * n;
    edges.push(base);
    for (let k = 0; k < n; k++) {
      const t = k / cells;
      let x, z;
      if (e === 0) { x = t; z = 0; } else if (e === 1) { x = t; z = 1; } else if (e === 2) { x = 0; z = t; } else { x = 1; z = t; }
      pos[p++] = x; pos[p++] = 1; pos[p++] = z;
    }
  }
  const idx = [];
  const gi = (ix, iz) => iz * n + ix;
  for (let iz = 0; iz < cells; iz++) for (let ix = 0; ix < cells; ix++) {
    const i00 = gi(ix, iz), i10 = gi(ix + 1, iz), i01 = gi(ix, iz + 1), i11 = gi(ix + 1, iz + 1);
    // CCW seen from +Y
    idx.push(i00, i01, i10, i10, i01, i11);
  }
  for (let k = 0; k < (withSkirt ? cells : 0); k++) {
    // z = 0 edge (outward -z)
    let T0 = gi(k, 0), T1 = gi(k + 1, 0), B0 = edges[0] + k, B1 = edges[0] + k + 1;
    idx.push(T0, T1, B0, T1, B1, B0);
    // z = 1 edge (outward +z)
    T0 = gi(k, cells); T1 = gi(k + 1, cells); B0 = edges[1] + k; B1 = edges[1] + k + 1;
    idx.push(T0, B0, T1, T1, B0, B1);
    // x = 0 edge (outward -x)
    T0 = gi(0, k); T1 = gi(0, k + 1); B0 = edges[2] + k; B1 = edges[2] + k + 1;
    idx.push(T0, B0, T1, T1, B0, B1);
    // x = 1 edge (outward +x)
    T0 = gi(cells, k); T1 = gi(cells, k + 1); B0 = edges[3] + k; B1 = edges[3] + k + 1;
    idx.push(T0, T1, B0, T1, B1, B0);
  }
  return { position: new THREE.BufferAttribute(pos, 3), index: new THREE.BufferAttribute(new Uint16Array(idx), 1), triangles: idx.length / 3 };
}

export class TerrainMesh {
  /**
   * @param data TerrainData
   * @param material MeshStandardMaterial (splat) with the shared vertex displacement
   * @param depthMaterial MeshDepthMaterial variant for shadow passes
   */
  constructor(data, material, depthMaterial, { lodScale = 1, layer = 1, proxyMaterial = null } = {}) {
    this.reflectionPass = false;
    this.data = data;
    this.chunks = data.chunks;
    this.chunkSize = data.chunkSize;
    this.lodScale = lodScale;
    this.group = new THREE.Group();
    this.group.name = 'terrain-chunks';
    this.meshes = [];
    this.attrs = [];
    this.nbrAttrs = [];
    this.proxyNbrAttrs = [];
    const maxInst = this.chunks * this.chunks;
    for (let l = 0; l < LOD_CELLS.length; l++) {
      const patch = buildPatch(LOD_CELLS[l]);
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', patch.position);
      geo.setIndex(patch.index);
      const arr = new Float32Array(maxInst * 4);
      const attr = new THREE.InstancedBufferAttribute(arr, 4);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aChunk', attr);
      const nbr = new THREE.InstancedBufferAttribute(new Float32Array(maxInst * 4), 4);
      nbr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aNbr', nbr);
      geo.instanceCount = 0;
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), data.size * 2);
      geo.boundingBox = new THREE.Box3(new THREE.Vector3(-data.size, -1000, -data.size), new THREE.Vector3(data.size, 1000, data.size));
      const mesh = new THREE.Mesh(geo, material);
      mesh.name = `terrain-lod${l}`;
      mesh.customDepthMaterial = depthMaterial;
      mesh.frustumCulled = false;        // we cull per chunk ourselves
      mesh.castShadow = true;            // the visible LOD is the caster: no coarse-proxy stair-steps
      mesh.receiveShadow = true;
      mesh.layers.enable(layer);
      mesh.raycast = () => {};           // heights live in a texture; use world.terrain.raycast
      mesh.matrixAutoUpdate = false;
      // main LODs are skipped while the water reflection renders (the proxies stand in)
      mesh.onBeforeRender = () => { if (this.reflectionPass) { mesh.geometry._savedCount = mesh.geometry.instanceCount; mesh.geometry.instanceCount = 0; } };
      mesh.onAfterRender = () => { if (this.reflectionPass) mesh.geometry.instanceCount = mesh.geometry._savedCount; };
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.attrs.push(attr);
      this.nbrAttrs.push(nbr);
    }
    // reflection proxies: LOD1 patches near, LOD2 beyond, rendered only into the water reflection with the
    // cheap material; in the main pass their instance count is forced to 0 (onBeforeRender), so they cost
    // nothing there and never cast shadows.
    this.proxies = [];
    this.proxyAttrs = [];
    for (let l = 1; l < LOD_CELLS.length; l++) {
      const patch = buildPatch(LOD_CELLS[l], false);   // no skirts: they would show as walls in the reflection
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', patch.position);
      geo.setIndex(patch.index);
      const attr = new THREE.InstancedBufferAttribute(new Float32Array(maxInst * 4), 4);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aChunk', attr);
      const nbr = new THREE.InstancedBufferAttribute(new Float32Array(maxInst * 4), 4);
      nbr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aNbr', nbr);
      geo.instanceCount = 0;
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), data.size * 2);
      const mesh = new THREE.Mesh(geo, proxyMaterial || material);
      mesh.name = `terrain-proxy-lod${l}`;
      mesh.customDepthMaterial = depthMaterial;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.layers.enable(layer);
      mesh.raycast = () => {};
      mesh.matrixAutoUpdate = false;
      mesh.onBeforeRender = () => { if (!this.reflectionPass) { geo._savedCount = geo.instanceCount; geo.instanceCount = 0; } };
      mesh.onAfterRender = () => { if (!this.reflectionPass) geo.instanceCount = geo._savedCount; };
      this.group.add(mesh);
      this.proxies.push(mesh);
      this.proxyAttrs.push(attr);
      this.proxyNbrAttrs.push(nbr);
    }
    this.boxes = [];
    this.centers = [];
    for (let cz = 0; cz < this.chunks; cz++) for (let cx = 0; cx < this.chunks; cx++) {
      this.boxes.push(new THREE.Box3());
      this.centers.push(new THREE.Vector2((cx + 0.5) * this.chunkSize - data.half, (cz + 0.5) * this.chunkSize - data.half));
    }
    this.refreshBounds();
    this._frustum = new THREE.Frustum();
    this._pv = new THREE.Matrix4();
    this._lastCam = new THREE.Matrix4();
    this._lastProj = new THREE.Matrix4();
    this._counts = [0, 0, 0];
    this._lodAll = new Int8Array(this.chunks * this.chunks);
    this._plodAll = new Int8Array(this.chunks * this.chunks);
    this._dirty = true;
    this.stats = { visible: 0, lod: [0, 0, 0] };
  }
  /** recompute chunk boxes (after generation or modify) */
  refreshBounds() {
    const d = this.data, margin = 110;
    for (let cz = 0; cz < this.chunks; cz++) for (let cx = 0; cx < this.chunks; cx++) {
      const i = cz * this.chunks + cx;
      const x0 = cx * this.chunkSize - d.half, z0 = cz * this.chunkSize - d.half;
      this.boxes[i].min.set(x0 - margin, d.chunkMin[i] - 45, z0 - margin);
      this.boxes[i].max.set(x0 + this.chunkSize + margin, d.chunkMax[i] + 5, z0 + this.chunkSize + margin);
    }
    this._dirty = true;
  }
  /** per frame: pick visible chunks + LOD. No allocations. */
  update(camera) {
    if (!this._dirty && this._lastCam.equals(camera.matrixWorld) && this._lastProj.equals(camera.projectionMatrix)) return;
    this._lastCam.copy(camera.matrixWorld);
    this._lastProj.copy(camera.projectionMatrix);
    this._dirty = false;
    this._pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pv);
    const cam = camera.position;
    const d0 = 300 * this.lodScale, d1 = 820 * this.lodScale;
    const counts = this._counts; counts[0] = counts[1] = counts[2] = 0;
    const pcounts = this._pcounts || (this._pcounts = [0, 0]); pcounts[0] = pcounts[1] = 0;
    const dP = 420 * this.lodScale;
    const hs = this.chunkSize * 0.5;
    const n = this.chunks, lodAll = this._lodAll, plodAll = this._plodAll;
    // pass 1: LOD of every chunk from its distance (also the culled ones: neighbours need it for edge stitching)
    for (let i = 0; i < this.boxes.length; i++) {
      const c = this.centers[i];
      const dx = Math.max(0, Math.abs(cam.x - c.x) - hs), dz = Math.max(0, Math.abs(cam.z - c.y) - hs);
      const dy = Math.max(0, cam.y - this.data.chunkMax[i]);
      const dist = Math.sqrt(dx * dx + dz * dz + dy * dy * 0.5);
      lodAll[i] = dist < d0 ? 0 : dist < d1 ? 1 : 2;
      plodAll[i] = dist < dP ? 1 : 2;
    }
    // pass 2: visible chunks -> instances; aNbr carries the LOD of the -x/+x/-z/+z neighbours so the vertex
    // shader can snap a finer edge onto a coarser neighbour's edge (crack-free seams, no visible skirt walls)
    for (let i = 0; i < this.boxes.length; i++) {
      if (!this._frustum.intersectsBox(this.boxes[i])) continue;
      const c = this.centers[i];
      const cx = i % n, cz = (i / n) | 0;
      const lod = lodAll[i];
      const arr = this.attrs[lod].array, nb = this.nbrAttrs[lod].array;
      const k = counts[lod]++ * 4;
      arr[k] = c.x - hs; arr[k + 1] = c.y - hs; arr[k + 2] = this.chunkSize; arr[k + 3] = lod;
      nb[k] = cx > 0 ? lodAll[i - 1] : lod; nb[k + 1] = cx < n - 1 ? lodAll[i + 1] : lod;
      nb[k + 2] = cz > 0 ? lodAll[i - n] : lod; nb[k + 3] = cz < n - 1 ? lodAll[i + n] : lod;
      const pl = plodAll[i] - 1;
      const parr = this.proxyAttrs[pl].array, pnb = this.proxyNbrAttrs[pl].array;
      const pk = pcounts[pl]++ * 4;
      parr[pk] = c.x - hs; parr[pk + 1] = c.y - hs; parr[pk + 2] = this.chunkSize; parr[pk + 3] = pl + 1;
      pnb[pk] = cx > 0 ? plodAll[i - 1] : pl + 1; pnb[pk + 1] = cx < n - 1 ? plodAll[i + 1] : pl + 1;
      pnb[pk + 2] = cz > 0 ? plodAll[i - n] : pl + 1; pnb[pk + 3] = cz < n - 1 ? plodAll[i + n] : pl + 1;
    }
    for (let l = 0; l < 2; l++) {
      const attr = this.proxyAttrs[l], nb = this.proxyNbrAttrs[l];
      attr.clearUpdateRanges(); attr.addUpdateRange(0, pcounts[l] * 4); attr.needsUpdate = true;
      nb.clearUpdateRanges(); nb.addUpdateRange(0, pcounts[l] * 4); nb.needsUpdate = true;
      this.proxies[l].geometry.instanceCount = pcounts[l];
      this.proxies[l].visible = pcounts[l] > 0;
    }
    let vis = 0;
    for (let l = 0; l < 3; l++) {
      const attr = this.attrs[l], nb = this.nbrAttrs[l];
      attr.clearUpdateRanges(); attr.addUpdateRange(0, counts[l] * 4); attr.needsUpdate = true;
      nb.clearUpdateRanges(); nb.addUpdateRange(0, counts[l] * 4); nb.needsUpdate = true;
      this.meshes[l].geometry.instanceCount = counts[l];
      this.meshes[l].visible = counts[l] > 0;
      this.stats.lod[l] = counts[l];
      vis += counts[l];
    }
    this.stats.visible = vis;
  }
  setMaterial(material) { for (const m of this.meshes) m.material = material; }
  dispose() {
    for (const m of this.meshes) m.geometry.dispose();
    for (const m of this.proxies) m.geometry.dispose();
  }
}
