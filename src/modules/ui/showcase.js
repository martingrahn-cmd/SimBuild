// ui showcase: a small lit city block grid (PBR ground, asphalt streets with markings and concrete
// sidewalks, instanced facades with night windows, instanced trees) used only as a backdrop for the
// HUD, plus sample HUD data: open road panel, a fake building selection and a few notifications.
// 4 draws (+ shadow passes). Everything instanced or merged; randomness via ctx.rng.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RENDER_ORDER } from '../../core/constants.js';

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
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vUiW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvUiW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vUiW;\n${HASH}`)
        .replace('#include <map_fragment>', `
          vec4 t1 = texture2D(map, vMapUv);
          float macro = texture2D(map, vUiW.xz * 0.00021).g;
          vec3 lush = vec3(0.36, 0.55, 0.25), dry = vec3(0.66, 0.64, 0.38);
          float dfade = smoothstep(300.0, 1600.0, length(vViewPosition));
          vec4 tex = mix(t1, vec4(0.46, 0.44, 0.36, 1.0), dfade);
          diffuseColor *= tex;
          diffuseColor.rgb *= mix(lush, dry, smoothstep(0.3, 0.8, macro) * 0.7) * 1.45;`)
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

function makeTrees(rng) {
  // kept deliberately light (~660 tris/tree; fill-rate, not vertices, is what hurts): the software-GL screenshot rig is vertex-bound
  const trunk = new THREE.CylinderGeometry(0.22, 0.38, 3.0, 5, 1).toNonIndexed(); trunk.translate(0, 1.5, 0);
  const blobs = [];
  for (const [ox, oy, oz, r] of [[0, 5.1, 0, 2.9], [0.9, 3.9, 0.7, 2.1]]) {
    const g = new THREE.IcosahedronGeometry(r, 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const j = 1 + (rng.float() - 0.5) * 0.22; pos.setXYZ(i, pos.getX(i) * j + ox, pos.getY(i) * j + oy, pos.getZ(i) * j + oz); }
    g.computeVertexNormals();
    blobs.push(g);
  }
  const colour = (g, hex, jitter, dark) => {
    const c = new THREE.Color(hex), arr = new Float32Array(g.attributes.position.count * 3), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const j = (1 + (rng.float() - 0.5) * jitter) * (dark ? 0.55 + 0.45 * Math.min(1, pos.getY(i) / 7) : 1); arr[i * 3] = c.r * j; arr[i * 3 + 1] = c.g * j; arr[i * 3 + 2] = c.b * j; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
  };
  const canopy = mergeGeometries(blobs, false);
  const geo = mergeGeometries([colour(trunk, 0x4e3420, 0.2, false), colour(canopy, 0x4a9a3c, 0.35, true)], false);
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
  for (let i = 0; i < 18; i++) add(px + 6 + rng.float() * (ps - 12), pz + 6 + rng.float() * (ps - 12));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z], i) => {
    const s = rng.range(0.75, 1.3);
    q.setFromAxisAngle(up, rng.range(0, 6.28)); sc.set(s, s * rng.range(0.9, 1.25), s); p.set(x, 0, z);
    m4.compose(p, q, sc); mesh.setMatrixAt(i, m4);
  });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = RENDER_ORDER.PROPS; mesh.name = 'ui-trees';
  return mesh;
}

export async function setupScene(ctx) {
  const rng = ctx.rng.fork('showcase');
  const skip = new Set((new URLSearchParams(window.location.search).get('uiskip') || '').split(',')); // profiling aid
  const [ground, roads, buildings] = await Promise.all([makeGround(ctx.assets), makeRoads(ctx.assets), makeBuildings(ctx.assets, rng.fork('b'))]);
  const trees = makeTrees(rng.fork('t'));
  for (const [name, obj] of [['ground', ground], ['roads', roads], ['buildings', buildings], ['trees', trees]]) if (!skip.has(name)) ctx.group.add(obj);
}

/** Sample HUD data: opened road panel, a selected building, notifications. */
export function stageHud(hud, ctx) {
  hud.setSource({
    eco: { money: 1_284_530, population: 24_618, jobs: 11_204, happiness: 0.74, demand: { residential: 0.72, commercial: 0.41, industrial: 0.28, office: 0.55 } },
    dayOffset: 16, income: 12_430, popDelta: 186,
    milestone: 6, milestoneName: 'Big Town', milestoneNext: 'Small City', xp: 0.62,
  });
  hud.setCategory('roads');
  hud.selectCard('roads', 'street');
  hud.showInfo({
    kind: 'building',
    data: { id: 412, type: 'residential', density: 'high', level: 3, floors: 12, height: 41, footprint: { w: 28, d: 24 }, occupants: 214, jobs: 0, name: 'Linden Terrace' },
    extra: { households: 96, landValue: 1240, rent: 18_400, upkeep: 2_150, age: 'Sep 2031', happiness: 0.81, wellbeing: 0.66, levelProgress: 0.47 },
  });
  hud.clearNotifications();
  const h = ctx.clock.hour;
  const stamp = (d) => { const t = ((h - d) % 24 + 24) % 24; return `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`; };
  hud.notify({ type: 'success', title: 'Milestone reached', body: 'Big Town — new services unlocked: Healthcare, Education.', ttl: 0, when: stamp(1.4) });
  hud.notify({ type: 'building', title: 'New building', body: 'Linden Terrace levelled up to Level 3.', ttl: 0, when: stamp(0.6) });
  hud.notify({ type: 'warning', title: 'Traffic congestion', body: 'Heavy traffic on Four-Lane Avenue near the downtown junction.', ttl: 0, when: stamp(0.2) });
}

/** Per-frame night factor for the backdrop windows. */
export function updateScene(ctx) {
  const el = ctx.clock.sunElevation();
  const n = Math.max(0, Math.min(1, (0.06 - el) / 0.16));
  showcaseUniforms.night.value = n * n * (3 - 2 * n);
}
