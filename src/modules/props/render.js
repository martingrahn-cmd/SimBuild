// Instanced rendering for every prop, plus the tree LOD/cull scheduler and the night lighting rig
// (emissive luminaires, additive halo points, ground light pools and a fixed pool of four real
// PointLights that follow the nearest lamps to the camera).
import * as THREE from 'three';
import { LAYERS, RENDER_ORDER } from '../../core/constants.js';
import { SPECIES } from './trees.js';

const CELL = 72;                       // metres, tree bucket size for LOD + frustum culling
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _sphere = new THREE.Sphere();
const _frustum = new THREE.Frustum();
const _pm = new THREE.Matrix4();

function instanced(geo, mat, max, { cast = true, receive = true, order = RENDER_ORDER.PROPS } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, max));
  im.castShadow = cast; im.receiveShadow = receive;
  im.count = 0;
  im.frustumCulled = false;
  im.renderOrder = order;
  im.layers.enable(LAYERS.PROPS);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return im;
}

function setMatrix(arr, off, x, y, z, ry, s, lean = 0) {
  _e.set(lean, ry, lean * 0.7);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(s, s, s);
  _m.compose(_p, _q, _s);
  arr.set(_m.elements, off);
}

// ---------------------------------------------------------------- trees
export class TreeField {
  constructor(group, geos, mats, quality) {
    this.group = group;
    this.mats = mats;
    const q = quality === 'low' ? 0.5 : quality === 'medium' ? 0.75 : 1;
    this.caps = {
      0: Math.round(280 * q), 1: Math.round(1750 * q), 2: Math.round(12000 * q),
    };
    this.range = { near: 78 * q + 14, mid: 950 };
    this.meshes = {};
    for (const sp of SPECIES) {
      const g = geos[sp];
      this.meshes[sp] = [
        { bark: instanced(g.lod[0].bark, mats.bark, this.caps[0]), leaf: instanced(g.lod[0].leaf, mats.leaf, this.caps[0]) },
        { bark: instanced(g.lod[1].bark, mats.bark, this.caps[1], { cast: false }), leaf: instanced(g.lod[1].leaf, mats.leaf, this.caps[1], { cast: false }) },
        { imp: instanced(g.impostor, mats.impostor, this.caps[2], { cast: false }) },
      ];
      for (const lvl of this.meshes[sp]) for (const k of Object.keys(lvl)) group.add(lvl[k]);
    }
    this.cells = {};      // species -> [{cx,cz,off,count,radius}]
    this.matrices = {};   // species -> Float32Array (16 per tree, cell-sorted)
    this.colors = {};
    this.total = 0;
    this._lastCam = new THREE.Vector3(1e9, 0, 0);
    this._acc = 99;
  }

  setTrees(trees) {
    this.total = trees.length;
    for (const sp of SPECIES) {
      const list = trees.filter((t) => t.species === sp);
      const buckets = new Map();
      for (const t of list) {
        const cx = Math.floor(t.x / CELL), cz = Math.floor(t.z / CELL);
        const key = cx * 4096 + cz;
        let b = buckets.get(key);
        if (!b) { b = { cx, cz, items: [] }; buckets.set(key, b); }
        b.items.push(t);
      }
      const mat = new Float32Array(list.length * 16);
      const col = new Float32Array(list.length * 3);
      const cells = [];
      let off = 0;
      for (const b of buckets.values()) {
        let maxS = 0;
        for (const t of b.items) {
          setMatrix(mat, off * 16, t.x, t.y, t.z, t.rot, t.scale, t.lean);
          col[off * 3] = t.tint[0]; col[off * 3 + 1] = t.tint[1]; col[off * 3 + 2] = t.tint[2];
          maxS = Math.max(maxS, t.scale);
          off++;
        }
        cells.push({
          x: (b.cx + 0.5) * CELL, z: (b.cz + 0.5) * CELL,
          off: off - b.items.length, count: b.items.length,
          radius: CELL * 0.72 + maxS * 0.6, y: maxS * 0.5,
        });
      }
      this.cells[sp] = cells;
      this.matrices[sp] = mat;
      this.colors[sp] = col;
    }
    this._acc = 99;
  }

  update(dt, camera, force = false) {
    this._acc += dt;
    const moved = camera.position.distanceToSquared(this._lastCam) > 100;
    if (!force && !moved && this._acc < 0.4) return;
    this._acc = 0;
    this._lastCam.copy(camera.position);
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pm);
    const cam = camera.position;
    for (const sp of SPECIES) {
      const cells = this.cells[sp];
      if (!cells) continue;
      const mats = this.matrices[sp], cols = this.colors[sp];
      const M = this.meshes[sp];
      const dst = [
        { m: M[0].bark, l: M[0].leaf, n: 0, cap: this.caps[0] },
        { m: M[1].bark, l: M[1].leaf, n: 0, cap: this.caps[1] },
        { m: M[2].imp, l: null, n: 0, cap: this.caps[2] },
      ];
      // nearest cells first so the caps are spent on what matters
      for (const c of cells) c._d = (c.x - cam.x) * (c.x - cam.x) + (c.z - cam.z) * (c.z - cam.z);
      cells.sort((a, b) => a._d - b._d);
      for (const c of cells) {
        _sphere.center.set(c.x, c.y, c.z);
        _sphere.radius = c.radius;
        if (!_frustum.intersectsSphere(_sphere)) continue;
        const d = Math.sqrt(c._d);
        const lvl = d < this.range.near ? 0 : d < this.range.mid ? 1 : 2;
        let t = dst[lvl];
        if (t.n + c.count > t.cap) { t = dst[Math.min(2, lvl + 1)]; if (t.n + c.count > t.cap) continue; }
        const src = mats.subarray(c.off * 16, (c.off + c.count) * 16);
        t.m.instanceMatrix.array.set(src, t.n * 16);
        if (t.l) t.l.instanceMatrix.array.set(src, t.n * 16);
        const csrc = cols.subarray(c.off * 3, (c.off + c.count) * 3);
        if (t.m.instanceColor) t.m.instanceColor.array.set(csrc, t.n * 3);
        if (t.l && t.l.instanceColor) t.l.instanceColor.array.set(csrc, t.n * 3);
        t.n += c.count;
      }
      for (const t of dst) {
        for (const mesh of [t.m, t.l]) {
          if (!mesh) continue;
          mesh.count = t.n;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          // a tight bounds lets the shadow cascades skip meshes they cannot see
          if (t.n > 0) { mesh.computeBoundingSphere(); mesh.frustumCulled = true; } else mesh.frustumCulled = false;
        }
      }
    }
  }

  /** Allocate the instanceColor buffers once (three only creates them on setColorAt). */
  prepareColors() {
    for (const sp of SPECIES) for (const lvl of this.meshes[sp]) for (const k of Object.keys(lvl)) {
      const mesh = lvl[k];
      if (!mesh.instanceColor) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count > 0 ? mesh.count * 3 : mesh.instanceMatrix.count * 3).fill(1), 3);
        mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      }
    }
  }

  stats() {
    let draws = 0, tris = 0;
    for (const sp of SPECIES) for (const lvl of this.meshes[sp]) for (const k of Object.keys(lvl)) {
      const m = lvl[k];
      if (m.count > 0) { draws++; tris += (m.geometry.index ? m.geometry.index.count / 3 : 0) * m.count; }
    }
    return { draws, tris: Math.round(tris) };
  }

  dispose() {
    for (const sp of SPECIES) for (const lvl of this.meshes[sp]) for (const k of Object.keys(lvl)) {
      const m = lvl[k]; m.geometry.dispose(); this.group.remove(m); m.dispose();
    }
  }
}

// ---------------------------------------------------------------- night rig
export class NightRig {
  constructor(ctx, glow, pool) {
    this.ctx = ctx;
    this.group = ctx.group;
    this.lamps = [];
    this.night = 0;
    // halo points (lamps)
    this.haloMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: glow }, uOpacity: { value: 0 }, uSize: { value: 260 },
        uColor: { value: new THREE.Color(0xffd39a) }, uScale: { value: 600 },
      },
      vertexShader: `
        uniform float uSize; uniform float uScale;
        varying float vFade;
        void main() {
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = clamp( uSize * uScale / max( d, 1.0 ), 6.0, 190.0 );
          vFade = clamp( 1.0 - ( d - 900.0 ) / 700.0, 0.0, 1.0 );
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform float uOpacity; uniform vec3 uColor;
        varying float vFade;
        void main() {
          vec4 t = texture2D( map, gl_PointCoord );
          gl_FragColor = vec4( uColor * t.a * uOpacity * vFade, t.a * uOpacity * vFade );
          if ( gl_FragColor.a < 0.004 ) discard;
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
    });
    this.haloMat.userData.envSkip = true;
    this.halo = new THREE.Points(new THREE.BufferGeometry(), this.haloMat);
    this.halo.renderOrder = RENDER_ORDER.TRANSPARENT;
    this.halo.frustumCulled = false;
    this.halo.visible = false;
    this.group.add(this.halo);

    // signal lens glow points (per-vertex colour)
    this.lensMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glow }, uOpacity: { value: 1 }, uSize: { value: 62 }, uScale: { value: 600 } },
      vertexShader: `
        uniform float uSize; uniform float uScale; attribute vec3 lensColor; varying vec3 vC;
        void main() {
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp( uSize * uScale / max( -mv.z, 1.0 ), 2.0, 90.0 );
          vC = lensColor;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform float uOpacity; varying vec3 vC;
        void main() {
          float a = texture2D( map, gl_PointCoord ).a;
          gl_FragColor = vec4( vC * a * uOpacity, a * uOpacity );
          if ( gl_FragColor.a < 0.004 ) discard;
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
    });
    this.lensMat.userData.envSkip = true;
    this.lens = new THREE.Points(new THREE.BufferGeometry(), this.lensMat);
    this.lens.renderOrder = RENDER_ORDER.TRANSPARENT;
    this.lens.frustumCulled = false;
    this.group.add(this.lens);

    // ground pools
    this.poolMat = new THREE.MeshBasicMaterial({
      map: pool, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      opacity: 0, toneMapped: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    this.poolMat.userData.envSkip = true;
    const pg = new THREE.PlaneGeometry(1, 1);
    pg.rotateX(-Math.PI / 2);
    this.pool = new THREE.InstancedMesh(pg, this.poolMat, 1);
    this.pool.count = 0;
    this.pool.frustumCulled = false;
    this.pool.renderOrder = RENDER_ORDER.MARKINGS + 4;
    this.pool.visible = false;
    this.group.add(this.pool);

    // a fixed pool of real point lights (count never changes, so programs never recompile)
    this.points = [];
    const n = ctx.quality === 'low' ? 0 : 4;
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffc987, 0, 34, 2);
      l.castShadow = false;
      l.position.set(0, -500, 0);
      this.group.add(l);
      this.points.push(l);
    }
    this._acc = 9;
  }

  setLamps(lamps, world) {
    this.lamps = lamps;
    const n = lamps.length;
    const pos = new Float32Array(n * 3);
    const T = world.terrain;
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
    this.group.remove(this.pool);
    this.pool.dispose();
    this.pool = new THREE.InstancedMesh(pg, this.poolMat, Math.max(1, n));
    this.pool.count = n;
    this.pool.frustumCulled = false;
    this.pool.renderOrder = RENDER_ORDER.MARKINGS + 4;
    this.pool.visible = false;
    this.pool.layers.enable(LAYERS.PROPS);
    this.group.add(this.pool);
    const arr = this.pool.instanceMatrix.array;
    for (let i = 0; i < n; i++) {
      const l = lamps[i];
      // luminaire hangs 2.62 m in front of the pole, 8.36 m up (see furniture.js)
      const fx = Math.sin(l.heading), fz = -Math.cos(l.heading);
      const lx = l.x + fx * 2.62, ly = l.y + 8.36, lz = l.z + fz * 2.62;
      pos[i * 3] = lx; pos[i * 3 + 1] = ly - 0.1; pos[i * 3 + 2] = lz;
      l._lx = lx; l._ly = ly; l._lz = lz;
      const gy = l.y - 0.10;   // just above the asphalt (sidewalk top sits 0.13 m higher)
      setMatrix(arr, i * 16, lx, gy, lz, l.heading, 23.0);
    }
    this.pool.instanceMatrix.needsUpdate = true;
    this.halo.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.halo.geometry = g;
  }

  setLenses(points) {
    // points: [{x,y,z}] flattened, colours updated later
    const n = points.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = points[i].x; pos[i * 3 + 1] = points[i].y; pos[i * 3 + 2] = points[i].z; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('lensColor', new THREE.BufferAttribute(col, 3));
    this.lens.geometry.dispose();
    this.lens.geometry = g;
    this.lensColors = col;
  }

  update(dt, camera, night) {
    this.night = night;
    const on = night > 0.02;
    this.halo.visible = on;
    this.pool.visible = on;
    this.haloMat.uniforms.uOpacity.value = night * 0.85;
    this.poolMat.opacity = night * 0.62;
    if (!this.points.length) return;
    this._acc += dt;
    if (this._acc < 0.35) return;
    this._acc = 0;
    if (!on) { for (const l of this.points) { l.intensity = 0; } return; }
    // nearest lamps to the camera get the real lights
    const cam = camera.position;
    const best = [];
    for (const l of this.lamps) {
      const dx = l._lx - cam.x, dz = l._lz - cam.z, dy = l._ly - cam.y;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > 6400) continue;
      if (best.length < this.points.length) { best.push({ l, d2 }); best.sort((a, b) => a.d2 - b.d2); }
      else if (d2 < best[best.length - 1].d2) { best[best.length - 1] = { l, d2 }; best.sort((a, b) => a.d2 - b.d2); }
    }
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (i < best.length) {
        const l = best[i].l;
        p.position.set(l._lx, l._ly - 0.25, l._lz);
        p.intensity = 46 * night;
      } else p.intensity = 0;
    }
  }

  dispose() {
    this.halo.geometry.dispose(); this.haloMat.dispose();
    this.lens.geometry.dispose(); this.lensMat.dispose();
    this.pool.dispose(); this.poolMat.dispose();
    for (const l of this.points) this.group.remove(l);
  }
}

// ---------------------------------------------------------------- furniture instancing
export function buildInstances(group, kindGeos, kinds, mats) {
  const out = {};
  const MAT = {
    glass: mats.glass,
    bush: mats.leaf, flowers: mats.leaf, hedge: mats.leaf,
    plate_stop: mats.decal, plate_speed: mats.decal, plate_street: mats.decal, plate_bus: mats.decal,
  };
  for (const kind of Object.keys(kinds)) {
    const list = kinds[kind];
    const def = kindGeos[kind];
    if (!def || !list.length) continue;
    const mat = MAT[kind] || mats.furniture;
    const cast = def.cast !== false;
    const im = new THREE.InstancedMesh(def.geo, mat, list.length);
    im.castShadow = cast;
    im.receiveShadow = true;
    im.renderOrder = kind === 'glass' ? RENDER_ORDER.TRANSPARENT : RENDER_ORDER.PROPS;
    im.layers.enable(LAYERS.PROPS);
    const arr = im.instanceMatrix.array;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      setMatrix(arr, i * 16, p.x, p.y, p.z, -p.heading, p.scale ?? 1);
    }
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
    out[kind] = im;
  }
  return out;
}
