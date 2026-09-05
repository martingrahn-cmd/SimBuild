// ui showcase: a small lit city block grid (PBR ground, asphalt streets with markings and concrete
// sidewalks, instanced facades with night windows, instanced trees) used only as a backdrop for the
// HUD, plus sample HUD data: open road panel, a fake building selection and a few notifications.
// 4 draws (+ shadow passes). Everything instanced or merged; randomness via ctx.rng.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RENDER_ORDER } from '../../core/constants.js';
import { makeNoise2D } from '../../core/rng.js';
import { MILESTONES } from './hud.js';

const S = { glow: null, minimapSample: null };

export const showcaseUniforms = { night: { value: 0 } };

const ROAD_W = 16, SIDE_W = 3.2, KERB_H = 0.15, PITCH = 96, K = 3;   // road centres at -10 + k*PITCH
const roadAt = (k) => -10 + k * PITCH;
const PARK_I = 0, PARK_J = 0;                                        // block x∈[1,75], z∈[1,75] (between roadAt(0) and roadAt(1))
const CAM_CORRIDOR = [[86, 77], [40, 40]];                          // `street` preset: camera → target (x,z)
function nearCorridor(x, z, r) {
  const [a, b] = CAM_CORRIDOR; const dx = b[0] - a[0], dz = b[1] - a[1]; const l2 = dx * dx + dz * dz;
  let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(-0.2, Math.min(1.2, t));
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)) < r;
}
/** Software-GL screenshot rig is texture-sampling bound: keep anisotropy low on the backdrop textures. */
function lowAniso(set) { for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'armMap', 'metalnessMap']) if (set[k]) { set[k].anisotropy = 2; set[k].needsUpdate = true; } return set; }
const HASH = /* glsl */`float uiHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;

function makeGround(assets) {
  return assets.pbr('aerial_grass_rock', { repeat: [6000 / 14, 6000 / 14] }).then((set) => {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    assets.applyPbr(m, { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap }, { normalScale: 1.2 });
    lowAniso(set);
    m.onBeforeCompile = (s) => {
      s.uniforms.uNight = showcaseUniforms.night;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vUiW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvUiW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vUiW; uniform float uNight;\n${HASH}`)
        .replace('#include <map_fragment>', `
          vec4 t1 = texture2D(map, vMapUv);
          float macro = texture2D(map, vUiW.xz * 0.00021).g;
          vec3 lush = vec3(0.36, 0.55, 0.25), dry = vec3(0.66, 0.64, 0.38);
          float dfade = smoothstep(300.0, 1600.0, length(vViewPosition));
          vec4 tex = mix(t1, vec4(0.46, 0.44, 0.36, 1.0), dfade);
          diffuseColor *= tex;
          diffuseColor.rgb *= mix(lush, dry, smoothstep(0.3, 0.8, macro) * 0.7) * 1.45;
          float lumG = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lumG) * vec3(0.7, 0.8, 1.0), 0.55 * uNight) * mix(1.0, 0.5, uNight);`)
        .replace('#include <normal_fragment_maps>', `
          #ifdef USE_NORMALMAP
            vec3 mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
            mapN.xy *= normalScale * (1.0 - smoothstep(200.0, 900.0, length(vViewPosition)));
            normal = normalize(tbn * mapN);
          #endif`);
    };
    const g = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), m);
    g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.renderOrder = RENDER_ORDER.TERRAIN; g.name = 'ui-ground';
    return g;
  });
}

function makeRoads(assets) {
  return Promise.all([assets.pbr('asphalt_02', {}), assets.pbr('concrete_floor_worn_001', {})]).then(([asph, conc]) => {
    lowAniso(asph); lowAniso(conc);
    const parts = [];
    const kindOf = (geo, kind, along) => {
      const n = geo.attributes.position.count;
      geo.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n).fill(kind), 1));
      geo.setAttribute('aAlong', new THREE.BufferAttribute(new Float32Array(n).fill(along), 1));
      return geo;
    };
    const strip = (cx, cz, len, alongX, kind) => {
      let g;
      if (kind === 0) {
        g = new THREE.PlaneGeometry(len, ROAD_W, 1, 1);
        const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len);
        g.rotateX(-Math.PI / 2);
        if (!alongX) g.rotateY(Math.PI / 2);
        g.translate(cx, 0.04, cz);
      } else {
        g = new THREE.BoxGeometry(alongX ? len : SIDE_W, KERB_H, alongX ? SIDE_W : len);
        g.translate(cx, KERB_H / 2, cz);
      }
      parts.push(kindOf(g, kind, alongX ? 1 : 0));
    };
    const lo = roadAt(-K) - ROAD_W / 2 - SIDE_W, hi = roadAt(K) + ROAD_W / 2 + SIDE_W, full = hi - lo, mid = (lo + hi) / 2;
    for (let k = -K; k <= K; k++) {
      const c = roadAt(k);
      strip(mid, c, full, true, 0);                       // east-west roads, full length
      for (let j = -K; j < K; j++) {                      // north-south segments between them
        const a = roadAt(j) + ROAD_W / 2, b = roadAt(j + 1) - ROAD_W / 2;
        strip(c, (a + b) / 2, b - a, false, 0);
        // sidewalks on both sides of the segment (block edges)
        const sl = b - a - SIDE_W * 2;
        strip(c - ROAD_W / 2 - SIDE_W / 2, (a + b) / 2, sl, false, 1);
        strip(c + ROAD_W / 2 + SIDE_W / 2, (a + b) / 2, sl, false, 1);
        strip((a + b) / 2, c - ROAD_W / 2 - SIDE_W / 2, sl, true, 1);
        strip((a + b) / 2, c + ROAD_W / 2 + SIDE_W / 2, sl, true, 1);
      }
    }
    const geo = mergeGeometries(parts, false);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    assets.applyPbr(m, { map: asph.map, normalMap: asph.normalMap, roughnessMap: asph.roughnessMap, aoMap: null }, { normalScale: 0.8 });
    m.onBeforeCompile = (s) => {
      s.uniforms.uSideMap = { value: conc.map }; s.uniforms.uSideRough = { value: conc.roughnessMap || conc.map };
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aKind; attribute float aAlong; varying float vKind; varying vec2 vRoad; varying vec3 vUiW;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvKind = aKind; vRoad = uv;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvUiW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform sampler2D uSideMap; uniform sampler2D uSideRough; varying float vKind; varying vec2 vRoad; varying vec3 vUiW;\n${HASH}`)
        .replace('#include <map_fragment>', `
          vec2 wuv = vUiW.xz;
          if (vKind > 0.5) {
            vec4 c = texture2D(uSideMap, wuv / 2.6);
            diffuseColor *= c * vec4(0.95, 0.94, 0.92, 1.0) * 1.05;
          } else {
            vec4 a = texture2D(map, wuv / 5.0);
            diffuseColor *= a * (0.82 + 0.16 * uiHash(floor(wuv / 9.0)));
            float v = vRoad.y, u = vRoad.x;
            float wear = 1.0 - 0.22 * (smoothstep(0.12, 0.3, v) * (1.0 - smoothstep(0.34, 0.45, v)) + smoothstep(0.55, 0.66, v) * (1.0 - smoothstep(0.7, 0.88, v)));
            diffuseColor.rgb *= wear;
            float dash = step(0.5, fract(u / 6.0));
            float centre = smoothstep(0.013, 0.008, abs(v - 0.5)) * dash;
            float edge = smoothstep(0.012, 0.007, abs(v - 0.045)) + smoothstep(0.012, 0.007, abs(v - 0.955));
            float paint = clamp(centre + edge, 0.0, 1.0) * (0.75 + 0.25 * uiHash(floor(wuv * 3.0)));
            diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.85, 0.82, 0.75), vec3(0.82, 0.62, 0.12), centre), paint * 0.85);
          }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          if (vKind > 0.5) roughnessFactor = 0.85 + 0.1 * texture2D(uSideRough, vUiW.xz / 2.6).g;`)
        .replace('#include <normal_fragment_maps>', `
          #ifdef USE_NORMALMAP
            vec3 mapN = texture2D(normalMap, vUiW.xz / 5.0).xyz * 2.0 - 1.0;
            mapN.xy *= normalScale * (vKind > 0.5 ? 0.3 : 1.0);
            normal = normalize(tbn * mapN);
          #endif`);
    };
    const mesh = new THREE.Mesh(geo, m);
    mesh.receiveShadow = true; mesh.castShadow = false; mesh.renderOrder = RENDER_ORDER.ROADS; mesh.name = 'ui-roads';
    return mesh;
  });
}

function makeBuildings(assets, rng) {
  return assets.pbr('concrete_wall_008', {}).then((conc) => {
    lowAniso(conc);
    const list = [];
    const downtown = { x: roadAt(-1), z: roadAt(-1) };
    const push = (x, z, w, h, d, style, tint) => list.push({ x, z, w, h, d, style, tint });
    for (let i = -K; i < K; i++) for (let j = -K; j < K; j++) {
      const x0 = roadAt(i) + ROAD_W / 2 + SIDE_W, z0 = roadAt(j) + ROAD_W / 2 + SIDE_W;
      const size = PITCH - ROAD_W - SIDE_W * 2;                   // 73.6 m block
      const cx = x0 + size / 2, cz = z0 + size / 2;
      const dist = Math.hypot(cx - downtown.x, cz - downtown.z);
      if (i === PARK_I && j === PARK_J) continue;                 // park block (street / closeup cameras look across it)
      if (dist < 120) {                                           // towers
        const n = rng.int(2, 3);
        for (let t = 0; t < n; t++) {
          const w = rng.range(22, 34), d = rng.range(22, 34), h = rng.range(48, 120);
          const bx = t === 0 ? x0 + 4 + w / 2 : x0 + size - 4 - w / 2, bz = rng.bool() ? z0 + 4 + d / 2 : z0 + size - 4 - d / 2;
          push(bx, bz, w, h, d, rng.pick([0, 1, 1, 2]), rng.pick([0xd8dad9, 0xbcc4cc, 0x9fb2c4, 0xe1d9c9, 0xc9c1b4]));
        }
        push(cx, cz, rng.range(24, 36), rng.range(6, 10), rng.range(20, 30), 3, 0xd5cfc4);
      } else if (dist < 260) {                                    // mid-rise perimeter blocks
        const cells = 3, cw = size / cells;
        for (let a = 0; a < cells; a++) for (let b = 0; b < cells; b++) {
          if (a === 1 && b === 1) continue;
          if (rng.float() < 0.12) continue;
          const w = cw - rng.range(3, 9), d = cw - rng.range(3, 9), h = rng.range(12, 34);
          push(x0 + cw * a + cw / 2, z0 + cw * b + cw / 2, w, h, d, rng.pick([0, 0, 2, 3]), rng.pick([0xd9c8b2, 0xc98f6d, 0xb7b1a5, 0xdbd6cc, 0x9c6f56, 0xc3b79f]));
        }
      } else {                                                    // low-rise houses
        const cells = 4, cw = size / cells;
        for (let a = 0; a < cells; a++) for (let b = 0; b < cells; b++) {
          if (rng.float() < 0.28) continue;
          const w = rng.range(8, 12), d = rng.range(8, 13), h = rng.range(5.5, 9);
          push(x0 + cw * a + cw / 2 + rng.range(-2, 2), z0 + cw * b + cw / 2 + rng.range(-2, 2), w, h, d, 3, rng.pick([0xe4dccd, 0xd9c3a3, 0xc7ccd0, 0xb98a70, 0xe6e0d4, 0xa6a89c]));
        }
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const n = list.length;
    const aBox = new Float32Array(n * 3), aStyle = new Float32Array(n * 2);
    list.forEach((b, i) => { aBox[i * 3] = b.w; aBox[i * 3 + 1] = b.h; aBox[i * 3 + 2] = b.d; aStyle[i * 2] = b.style; aStyle[i * 2 + 1] = rng.float(); });
    geo.setAttribute('aBox', new THREE.InstancedBufferAttribute(aBox, 3));
    geo.setAttribute('aStyle', new THREE.InstancedBufferAttribute(aStyle, 2));
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0 });
    assets.applyPbr(m, { map: conc.map, normalMap: null, roughnessMap: conc.roughnessMap, aoMap: null }, {});
    m.onBeforeCompile = (s) => {
      s.uniforms.uNight = showcaseUniforms.night;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aBox; attribute vec2 aStyle; varying vec2 vFace; varying vec2 vFaceSize; varying float vTop; varying vec2 vStyle; varying float vFaceId;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>
          vec2 fs = abs(normal.x) > 0.5 ? vec2(aBox.z, aBox.y) : (abs(normal.y) > 0.5 ? vec2(aBox.x, aBox.z) : vec2(aBox.x, aBox.y));
          #ifdef USE_MAP
            vMapUv = uv * fs / 6.0;
          #endif
          #ifdef USE_ROUGHNESSMAP
            vRoughnessMapUv = uv * fs / 6.0;
          #endif
          vFace = uv * fs; vFaceSize = fs; vTop = normal.y; vStyle = aStyle;
          vFaceId = normal.x > 0.5 ? 0.0 : (normal.x < -0.5 ? 1.0 : (normal.z > 0.5 ? 2.0 : 3.0));`);
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uNight; varying vec2 vFace; varying vec2 vFaceSize; varying float vTop; varying vec2 vStyle; varying float vFaceId;\n${HASH}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (vTop > 0.5) {
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.31, 0.30), 0.75);
            roughnessFactor = 0.95;
          } else if (vTop > -0.5) {
            float style = vStyle.x, seed = vStyle.y;
            float glass = step(0.5, style) * step(style, 1.5);
            float floorH = mix(3.3, 3.0, step(2.5, style));
            float winW = mix(mix(3.4, 2.2, glass), 3.0, step(2.5, style));
            float gh = floorH * 1.4;
            float fy = vFace.y < gh ? vFace.y / gh - 1.0 : (vFace.y - gh) / floorH;
            float fx = (vFace.x + seed * 7.0) / winW;
            vec2 cell = floor(vec2(fx, fy)); vec2 f = fract(vec2(fx, fy));
            float wr = mix(0.52, 0.9, glass), y0 = mix(0.3, 0.12, glass), y1 = mix(0.86, 0.96, glass);
            if (fy < 0.0) { wr = 0.8; y0 = 0.1; y1 = 0.82; }
            float inX = step(0.5 - wr * 0.5, f.x) * step(f.x, 0.5 + wr * 0.5);
            float inY = step(y0, f.y) * step(f.y, y1);
            float isWin = inX * inY * step(vFace.y, vFaceSize.y - 1.2);
            float frame = step(0.5 - wr * 0.5 - 0.05, f.x) * step(f.x, 0.5 + wr * 0.5 + 0.05) * step(y0 - 0.06, f.y) * step(f.y, y1 + 0.04) * step(vFace.y, vFaceSize.y - 1.0) - isWin;
            float band = step(0.9, fract(fy)) * (1.0 - glass) * step(0.0, fy);
            diffuseColor.rgb *= mix(1.0, 0.86, band);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55, clamp(frame, 0.0, 1.0));
            vec3 glassCol = mix(vec3(0.06, 0.075, 0.09), vec3(0.10, 0.15, 0.20), glass);
            diffuseColor.rgb = mix(diffuseColor.rgb, glassCol, isWin);
            roughnessFactor = mix(roughnessFactor, 0.12, isWin);
            float h1 = uiHash(cell + vec2(seed * 91.0, vFaceId * 13.0));
            float h2 = uiHash(cell * 1.7 + vec2(seed * 31.0 + 5.0, vFaceId));
            float on = step(0.62, h1);
            vec3 tint = mix(vec3(1.0, 0.72, 0.42), vec3(0.8, 0.88, 1.0), step(0.72, h2));
            totalEmissiveRadiance += isWin * on * uNight * tint * (0.3 + 0.7 * h2) * 0.5;
          }`);
    };
    const mesh = new THREE.InstancedMesh(geo, m, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    list.forEach((b, i) => {
      sc.set(b.w, b.h, b.d); p.set(b.x, b.h / 2, b.z);
      m4.compose(p, q, sc); mesh.setMatrixAt(i, m4);
      col.setHex(b.tint); mesh.setColorAt(i, col);
    });
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.BUILDINGS; mesh.name = 'ui-buildings';
    return mesh;
  });
}

/** Procedural atlas: left half = leaf cluster with alpha (canopy cards), right half = bark (trunk). */
function makeTreeAtlas(rng) {
  const S = 256, c = document.createElement('canvas'); c.width = S * 2; c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S * 2, S);
  // leaf cluster: dense towards the centre, ragged silhouette, lighter tops
  for (let i = 0; i < 520; i++) {
    const a = rng.float() * Math.PI * 2, r = Math.pow(rng.float(), 0.55) * 0.46 * S;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r * 0.92;
    const t = Math.max(0, 1 - r / (0.5 * S));
    const up = 1 - y / S;
    const l = 0.2 + 0.24 * up + 0.1 * rng.float() - 0.06 * (1 - t);
    const hue = 96 + rng.float() * 24 - 10 * (1 - up);
    g.fillStyle = `hsla(${hue.toFixed(0)}, ${(42 + rng.float() * 20).toFixed(0)}%, ${(l * 100).toFixed(0)}%, ${(0.85 + 0.15 * rng.float()).toFixed(2)})`;
    g.beginPath();
    const rr = 4 + rng.float() * 9;
    g.ellipse(x, y, rr, rr * (0.55 + rng.float() * 0.5), rng.float() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  // bark
  const bark = g.createLinearGradient(S, 0, S * 2, 0);
  bark.addColorStop(0, '#4a3322'); bark.addColorStop(0.5, '#6b4a30'); bark.addColorStop(1, '#3e2b1c');
  g.fillStyle = bark; g.fillRect(S, 0, S, S);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${20 + rng.int(0, 30)}, ${12 + rng.int(0, 20)}, ${6 + rng.int(0, 12)}, ${(0.25 + rng.float() * 0.5).toFixed(2)})`; g.fillRect(S + rng.float() * S, rng.float() * S, 2 + rng.float() * 5, 10 + rng.float() * 40); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** Card tree: bark trunk + 3 vertical crossed canopy cards + 2 tilted top cards, spherical normals so the cards shade like a volume. */
function makeTreeGeometry(rng) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.16, 0.34, 3.6, 6, 1, true).toNonIndexed();
  trunk.translate(0, 1.8, 0);
  { const uv = trunk.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + uv.getX(i) * 0.5, uv.getY(i)); }
  trunk.computeVertexNormals();
  parts.push(trunk);
  const centre = new THREE.Vector3(0, 5.3, 0);
  const card = (w, h, rotY, rotX, y, ox = 0) => {
    const g = new THREE.PlaneGeometry(w, h, 1, 1).toNonIndexed();
    g.rotateX(rotX); g.rotateY(rotY); g.translate(ox, y, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5);
    return g;
  };
  parts.push(card(5.6, 5.0, 0, 0, 5.3), card(5.6, 5.0, Math.PI / 3, 0, 5.3), card(5.6, 5.0, (2 * Math.PI) / 3, 0, 5.3));
  parts.push(card(4.8, 4.8, 0.4, -Math.PI / 2, 6.6), card(4.2, 4.2, 1.5, -Math.PI / 2 + 0.5, 4.4, 0.6));
  const geo = mergeGeometries(parts, false);
  // spherical normals for the canopy vertices (trunk keeps its cylinder normals)
  const pos = geo.attributes.position, nor = geo.attributes.normal, trunkCount = trunk.attributes.position.count, v = new THREE.Vector3();
  for (let i = trunkCount; i < pos.count; i++) { v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(centre); v.y *= 0.8; v.normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
  return geo;
}

function makeTrees(rng) {
  const geo = makeTreeGeometry(rng);
  const atlas = makeTreeAtlas(rng.fork('atlas'));
  const spots = [];
  const add = (x, z) => { if (!nearCorridor(x, z, 14)) spots.push([x, z]); };
  for (let k = -K; k <= K; k++) for (let j = -K; j < K; j++) {
    const a = roadAt(j) + ROAD_W / 2 + SIDE_W + 3, b = roadAt(j + 1) - ROAD_W / 2 - SIDE_W - 3;
    for (let t = a; t < b; t += 14) {
      if (rng.float() < 0.45) continue;
      const off = ROAD_W / 2 + SIDE_W + 2.2;
      const c = roadAt(k);
      if (rng.bool()) add(t + rng.range(-1, 1), c + (rng.bool() ? off : -off));
      else add(c + (rng.bool() ? off : -off), t + rng.range(-1, 1));
    }
  }
  // park block: loose clusters of trees on the lawn
  const px = roadAt(PARK_I) + ROAD_W / 2 + SIDE_W, pz = roadAt(PARK_J) + ROAD_W / 2 + SIDE_W, ps = PITCH - ROAD_W - SIDE_W * 2;
  for (let i = 0; i < 22; i++) add(px + 6 + rng.float() * (ps - 12), pz + 6 + rng.float() * (ps - 12));
  const mat = new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.92, metalness: 0, color: 0xffffff });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uNight = showcaseUniforms.night;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;')
      // keep the spherical canopy normals on back faces (no flip): the cards are a volume proxy, not a sheet
      .replace('#include <normal_fragment_begin>', `
        float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
        vec3 normal = normalize( vNormal );
        vec3 nonPerturbedNormal = normal;`)
      .replace('#include <map_fragment>', `
        #include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum) * vec3(0.72, 0.82, 1.0), 0.55 * uNight) * mix(1.0, 0.42, uNight);`);
  };
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  const tints = [0x7fb862, 0x6da85a, 0x9cbf5e, 0xc2b24c, 0xd4924a, 0xaa9c48, 0x6fae62, 0x86b877, 0x74a866];
  spots.forEach(([x, z], i) => {
    const s = rng.range(0.8, 1.35);
    q.setFromAxisAngle(up, rng.range(0, 6.28)); sc.set(s, s * rng.range(0.9, 1.2), s); p.set(x, 0, z);
    m4.compose(p, q, sc); mesh.setMatrixAt(i, m4);
    col.setHex(rng.pick(tints)).multiplyScalar(rng.range(0.85, 1.1)); mesh.setColorAt(i, col);
  });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.PROPS; mesh.name = 'ui-trees';
  return mesh;
}

/** Street lamps along every sidewalk (instanced merged pole+arm+head) and their night glow (halo cross + ground pool, additive). */
function makeLamps(rng) {
  const spots = [];   // [x, z, rotY]
  const off = ROAD_W / 2 + 0.7;   // pole just behind the kerb
  const lo = roadAt(-K), hi = roadAt(K);
  const nearCross = (v) => { for (let k = -K; k <= K; k++) if (Math.abs(v - roadAt(k)) < ROAD_W / 2 + SIDE_W + 3) return true; return false; };
  for (let k = -K; k <= K; k++) {
    const c = roadAt(k);
    let i = 0;
    for (let t = lo + 14; t < hi - 8; t += 27, i++) {
      if (nearCross(t)) continue;
      const side = i % 2 === 0 ? 1 : -1;
      spots.push([t + rng.range(-1, 1), c + side * off, side > 0 ? Math.PI / 2 : -Math.PI / 2]);   // east-west road: arm points toward the road (∓z)
      spots.push([c - side * off, t + rng.range(-1, 1), side > 0 ? 0 : Math.PI]);                   // north-south road: arm points ±x
    }
  }
  const pole = new THREE.CylinderGeometry(0.08, 0.15, 8.2, 6, 1).toNonIndexed(); pole.translate(0, 4.1, 0);
  const arm = new THREE.BoxGeometry(2.6, 0.1, 0.12).toNonIndexed(); arm.translate(1.2, 8.1, 0);
  const head = new THREE.BoxGeometry(0.9, 0.2, 0.36).toNonIndexed(); head.translate(2.3, 8.0, 0);
  const tag = (g, e) => { const n = g.attributes.position.count; g.setAttribute('aEmit', new THREE.BufferAttribute(new Float32Array(n).fill(e), 1)); return g; };
  const geo = mergeGeometries([tag(pole, 0), tag(arm, 0), tag(head, 1)], false);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5c6470, roughness: 0.55, metalness: 0.6 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uNight = showcaseUniforms.night;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aEmit; varying float vEmit;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvEmit = aEmit;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying float vEmit;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmit * uNight * vec3(1.0, 0.78, 0.5) * 1.6;');
  };
  const lamps = new THREE.InstancedMesh(geo, mat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, r], i) => { q.setFromAxisAngle(up, r); p.set(x, 0, z); m4.compose(p, q, sc); lamps.setMatrixAt(i, m4); });
  lamps.castShadow = false; lamps.receiveShadow = true; lamps.frustumCulled = false; lamps.renderOrder = RENDER_ORDER.PROPS; lamps.name = 'ui-lamps';

  // glow: radial sprite texture, halo = two crossed vertical quads at the head, pool = ground quad under the head
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.62)'); rg.addColorStop(0.65, 'rgba(255,255,255,0.2)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const colour = (gm, r, gg, b) => { const n = gm.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gg; a[i * 3 + 2] = b; } gm.setAttribute('color', new THREE.BufferAttribute(a, 3)); return gm; };
  const h1 = new THREE.PlaneGeometry(3.2, 3.2).toNonIndexed(); h1.translate(2.3, 7.95, 0);
  const h2 = new THREE.PlaneGeometry(3.2, 3.2).toNonIndexed(); h2.rotateY(Math.PI / 2); h2.translate(2.3, 7.95, 0);
  const pool = new THREE.PlaneGeometry(19, 19).toNonIndexed(); pool.rotateX(-Math.PI / 2); pool.translate(2.3, 0.22, 0);
  const glowGeo = mergeGeometries([colour(h1, 0.8, 0.62, 0.38), colour(h2, 0.8, 0.62, 0.38), colour(pool, 0.75, 0.58, 0.34)], false);
  const glowMat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, opacity: 0, toneMapped: true });
  glowMat.userData.envSkip = true;
  const glow = new THREE.InstancedMesh(glowGeo, glowMat, spots.length);
  spots.forEach(([x, z, r], i) => { q.setFromAxisAngle(up, r); p.set(x, 0, z); m4.compose(p, q, sc); glow.setMatrixAt(i, m4); });
  glow.castShadow = false; glow.receiveShadow = false; glow.frustumCulled = false; glow.renderOrder = RENDER_ORDER.TRANSPARENT; glow.name = 'ui-lampglow';
  glow.visible = false;
  return { lamps, glow };
}

/** Sample data for the minimap when the terrain module is not loaded (ui showcase only). */
function makeMinimapSample(seed) {
  const n = 128, heights = new Float32Array(n * n), noise = makeNoise2D(seed + 77);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = i / (n - 1), v = j / (n - 1);
    let h = 14 + 70 * Math.pow(Math.max(0, noise.fbm(u * 2.4 + 3.1, v * 2.4 + 1.7, 5) * 0.5 + 0.5), 1.6);
    const ridge = Math.abs(noise.fbm(u * 1.3 + 9, v * 1.3 + 4, 3));
    h += 90 * Math.pow(Math.max(0, 0.35 - ridge), 1.4) * Math.max(0, 1 - Math.hypot(u - 0.25, v - 0.28) * 1.6);
    const river = 0.62 + 0.07 * Math.sin(u * 7.0) + 0.05 * noise.fbm(u * 5, 2.2, 3);
    h -= 34 * Math.exp(-Math.pow((v - river) * 22, 2));
    const coast = 0.86 + 0.05 * noise.fbm(1.5, v * 3, 3);
    if (u > coast) h -= (u - coast) * 320;
    const dc = Math.hypot(u - 0.5, v - 0.49);
    h = h * Math.min(1, 0.45 + dc * 2.2) + 8 * Math.max(0, 1 - dc * 5);   // flatten the city centre
    heights[j * n + i] = h;
  }
  const roads = [];
  const lo = roadAt(-K) - ROAD_W / 2 - SIDE_W, hi = roadAt(K) + ROAD_W / 2 + SIDE_W;
  for (let k = -K; k <= K; k++) { roads.push([lo, roadAt(k), hi, roadAt(k), k === 0 ? 'avenue' : 'street'], [roadAt(k), lo, roadAt(k), hi, k === -1 ? 'avenue' : 'street']); }
  roads.push([hi, roadAt(0), 700, -120, 'avenue'], [700, -120, 1010, -520, 'highway'], [lo, roadAt(-1), -640, 20, 'street'], [-640, 20, -1010, 300, 'highway'], [roadAt(1), hi, 240, 760, 'street'], [240, 760, 180, 1010, 'highway']);
  return { n, heights, roads };
}

export async function setupScene(ctx) {
  const rng = ctx.rng.fork('showcase');
  const skip = new Set((new URLSearchParams(window.location.search).get('uiskip') || '').split(',')); // profiling aid
  const [ground, roads, buildings] = await Promise.all([makeGround(ctx.assets), makeRoads(ctx.assets), makeBuildings(ctx.assets, rng.fork('b'))]);
  const trees = makeTrees(rng.fork('t'));
  const { lamps, glow } = makeLamps(rng.fork('l'));
  S.glow = glow;
  for (const [name, obj] of [['ground', ground], ['roads', roads], ['buildings', buildings], ['trees', trees], ['lamps', lamps], ['glow', glow]]) if (!skip.has(name)) ctx.group.add(obj);
  S.minimapSample = makeMinimapSample(ctx.world.seed);
}

/** Sample HUD data: opened road panel, a selected building, transit lines, statistics, legend, milestone toast, notifications, minimap. */
export function stageHud(hud, ctx) {
  const unlocked = MILESTONES.slice(0, 9).flatMap((m) => m.unlocks);   // Big Town (level 8): office / incinerator still locked
  const history = [];
  for (let d = 1; d <= 36; d++) history.push({ day: d, money: 620000 + d * 18000 + Math.sin(d * 0.7) * 40000, population: 9000 + d * 430 + Math.sin(d * 0.5) * 300, jobs: 4200 + d * 195 });
  hud.setSource({
    eco: { money: 1_284_530, population: 24_618, jobs: 11_204, happiness: 0.74, taxRate: 0.11, demand: { residential: 0.72, commercial: 0.41, industrial: 0.28, office: 0.55 } },
    history, dayOffset: 16, income: 12_430, popDelta: 186,
    milestone: 8, milestoneName: 'Big Town', milestoneNext: 'Small City', xp: 0.62, unlocked,
    infoStats: { landvalue: { 'Average': '¢1,240 / m²', 'Highest': '¢3,860 / m²', 'Lowest': '¢210 / m²' } },
  });
  hud.minimap.setSample(S.minimapSample);
  hud.setCategory('roads');
  hud.selectCard('roads', 'street');
  hud.showInfo({
    kind: 'building',
    data: { id: 412, type: 'residential', density: 'high', level: 3, floors: 12, height: 41, footprint: { w: 28, d: 24 }, occupants: 214, jobs: 0, name: 'Linden Terrace', x: -38, y: 0, z: -58 },
    extra: { households: 96, landValue: 1240, rent: 18_400, upkeep: 2_150, age: 'Sep 2031', happiness: 0.81, wellbeing: 0.66, levelProgress: 0.47, power: 1, water: 1 },
  });
  const lines = new Map([
    [1, { id: 1, name: 'Line 1 · Downtown Loop', color: '#2f8ff5', stops: [{ name: 'Central Station' }, { name: 'Market Square' }, { name: 'Linden Terrace' }, { name: 'Harbor Gate' }, { name: 'City Hall' }], vehicles: 6, ridership: 2140, length: 6400, fare: 2, balance: 1830 }],
    [2, { id: 2, name: 'Line 2 · Riverside', color: '#4cc25a', stops: [{ name: 'Central Station' }, { name: 'Riverside Park' }, { name: 'Pinewood Creek' }, { name: 'Northgate' }], vehicles: 4, ridership: 980, length: 5100, fare: 2, balance: -410 }],
  ]);
  hud.setTransitSource(lines);
  hud.transitSel = 1;            // the transit panel shares the left slot with the info panel (toolbar button / ?uipanel=lines)
  hud.setInfoview('landvalue');
  hud.showSide('stats');
  hud.toast({ kicker: 'Milestone 8 reached', title: 'Big Town', body: 'Unlocked: Large Park, Hospital · <b>+¢220,000</b>', sticky: true });
  hud.clearNotifications();
  const h = ctx.clock.hour;
  const stamp = (d) => { const t = ((h - d) % 24 + 24) % 24; return `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`; };
  hud.notify({ type: 'success', title: 'Milestone reached', body: 'Big Town — new services unlocked: Large Park, Hospital.', ttl: 0, when: stamp(1.4) });
  hud.notify({ type: 'building', title: 'New building', body: 'Linden Terrace levelled up to Level 3.', ttl: 0, when: stamp(0.6) });
  hud.notify({ type: 'warning', title: 'Traffic congestion', body: 'Heavy traffic on Four-Lane Avenue near the downtown junction.', ttl: 0, when: stamp(0.2) });
  // ?uipanel=lines|pause|main|new|save|load|settings|photo|dev|services|zoning|info : stage a specific screen (dev / critic aid)
  const panel = new URLSearchParams(window.location.search).get('uipanel');
  if (panel === 'lines') hud.showLines(1);
  else if (panel === 'photo') hud.setPhotoMode(true);
  else if (panel === 'dev') hud.devBox.classList.remove('sb-hidden');
  else if (panel === 'services') { hud.setCategory('parks'); hud.selectCard('parks', 'park_large'); }
  else if (panel === 'zoning') { hud.setCategory('zoning'); hud.selectCard('zoning', 'residential_high'); }
  else if (panel === 'info') { hud.setCategory('info'); }
  else if (panel === 'journal') hud.showSide('journal');
  else if (panel && ['pause', 'main', 'new', 'save', 'load', 'settings'].includes(panel)) hud.menus.open(panel, { boot: panel === 'main' });
}

/** Per-frame night factor for the backdrop windows, trees, ground and lamp glow. */
export function updateScene(ctx) {
  const el = ctx.clock.sunElevation();
  const n = Math.max(0, Math.min(1, (0.06 - el) / 0.16));
  const night = n * n * (3 - 2 * n);
  showcaseUniforms.night.value = night;
  if (S.glow) { S.glow.visible = night > 0.02; S.glow.material.opacity = night; }
}
