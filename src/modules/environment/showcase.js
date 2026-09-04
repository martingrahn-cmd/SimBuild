// Environment showcase: a lit test scene of its own — PBR ground (Poly Haven aerial_grass_rock with
// macro variation + wetness), roughness/metalness spheres, and concrete blocks / towers with a window
// grid (dark glass by day, per-window random warm/cool lights at night) so critics can judge sky,
// sun colour, shadows and exposure. 4 draws + 2 casters × cascades.
import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';

export const showcaseUniforms = {
  wet: { value: 0 },
  winNight: { value: 0 },
};

export async function setupShowcase(ctx) {
  const rng = ctx.rng.fork('showcase');
  const group = ctx.group;
  const { assets } = ctx;

  // ---------------------------------------------------------------- ground
  const groundSet = await assets.pbr('aerial_grass_rock', { repeat: [8000 / 13, 8000 / 13] });
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  assets.applyPbr(groundMat, groundSet, { normalScale: 1.5, aoIntensity: 0.8 });
  groundMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = showcaseUniforms.wet;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\nuniform sampler2D uEnvNoise; uniform float uWet;')
      .replace('#include <map_fragment>', `
        vec4 envT1 = texture2D(map, vMapUv);
        vec4 envT2 = texture2D(map, vMapUv * 0.23 + vec2(0.31, 0.57));
        vec4 envN = texture2D(uEnvNoise, vEnvWorldPos.xz * 0.00045 + vec2(0.13, 0.71));
        diffuseColor *= mix(envT1, envT2, 0.3) * mix(0.85, 1.15, (envN.a + envN.b) * 0.5);
        float envM1 = envN.g, envM2 = envN.b, envM3 = envN.r;
        vec3 envLush = vec3(0.30, 0.52, 0.22), envMid = vec3(0.52, 0.66, 0.32), envDry = vec3(0.78, 0.74, 0.42);
        vec3 envTint = mix(mix(envLush, envMid, smoothstep(0.3, 0.6, envM1)), envDry, smoothstep(0.55, 0.85, envM3 * 0.6 + envM2 * 0.4));
        diffuseColor.rgb *= envTint * 1.35 * mix(0.8, 1.15, envM2);
        diffuseColor.rgb *= 1.0 - uWet * 0.4;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.28, uWet * 0.8);');
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true; ground.castShadow = false;
  ground.renderOrder = RENDER_ORDER.TERRAIN;
  ground.name = 'showcase-ground';
  group.add(ground);

  // ---------------------------------------------------------------- spheres (roughness / metalness ladder)
  const sphereGeo = new THREE.SphereGeometry(3.2, 48, 32);
  const sph = [
    { r: 0.04, m: 0, c: 0xf2f2f2 }, { r: 0.25, m: 0, c: 0xf2f2f2 }, { r: 0.5, m: 0, c: 0xf2f2f2 }, { r: 0.75, m: 0, c: 0xf2f2f2 }, { r: 1.0, m: 0, c: 0xf2f2f2 },
    { r: 0.12, m: 1, c: 0xd8dade }, { r: 0.35, m: 1, c: 0xd48a5a }, { r: 0.55, m: 0, c: 0x3b5fa8 }, { r: 0.9, m: 0, c: 0x8b1f1f },
  ];
  const rm = new Float32Array(sph.length * 2);
  sph.forEach((s, i) => { rm[i * 2] = s.r; rm[i * 2 + 1] = s.m; });
  sphereGeo.setAttribute('aRM', new THREE.InstancedBufferAttribute(rm, 2));
  const sphereMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0 });
  sphereMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRM; varying vec2 vRM;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRM = aRM;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRM;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vRM.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vRM.y;');
  };
  const spheres = new THREE.InstancedMesh(sphereGeo, sphereMat, sph.length);
  const m4 = new THREE.Matrix4();
  sph.forEach((s, i) => {
    const x = 26 + (i % 5) * 8.5, z = 30 + Math.floor(i / 5) * 9;
    m4.makeTranslation(x, 3.2, z);
    spheres.setMatrixAt(i, m4);
    spheres.setColorAt(i, new THREE.Color(s.c));
  });
  spheres.castShadow = true; spheres.receiveShadow = true;
  spheres.frustumCulled = false;
  spheres.name = 'showcase-spheres';
  group.add(spheres);

  // ---------------------------------------------------------------- blocks and towers (concrete + window grid)
  const concrete = await assets.pbr('concrete_wall_008', {});
  const blockMat = new THREE.MeshStandardMaterial({ color: 0xd9d6d0, roughness: 0.85, metalness: 0 });
  assets.applyPbr(blockMat, concrete, { normalScale: 0.7, aoIntensity: 0.7 });
  blockMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWinNight = showcaseUniforms.winNight;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aBox; attribute float aWin;
        varying vec2 vFaceM; varying float vWin; varying float vTop; varying float vInst;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec2 envFace = abs(normal.x) > 0.5 ? vec2(aBox.z, aBox.y) : (abs(normal.y) > 0.5 ? vec2(aBox.x, aBox.z) : vec2(aBox.x, aBox.y));
        vec2 envS = envFace / 3.0;
        #ifdef USE_MAP
          vMapUv *= envS;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv *= envS;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv *= envS;
        #endif
        #ifdef USE_METALNESSMAP
          vMetalnessMapUv *= envS;
        #endif
        #ifdef USE_AOMAP
          vAoMapUv *= envS;
        #endif
        vFaceM = uv * envFace; vWin = aWin; vTop = abs(normal.y); vInst = float(gl_InstanceID);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uWinNight; varying vec2 vFaceM; varying float vWin; varying float vTop; varying float vInst;
        float envHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vWin > 0.5 && vTop < 0.5) {
          vec2 g = vec2(vFaceM.x / 3.0, (vFaceM.y - 0.9) / 3.6);
          vec2 cell = floor(g); vec2 f = fract(g);
          float inX = step(0.10, f.x) * step(f.x, 0.90);
          float inY = step(0.26, f.y) * step(f.y, 0.82);
          float isWin = inX * inY * step(0.0, g.y);
          // window reveal: darker frame band around the glass; per-tower tint variation
          float frame = (step(0.06, f.x) * step(f.x, 0.94) * step(0.2, f.y) * step(f.y, 0.88)) - isWin;
          float hT = envHash(vec2(vInst, 3.0));
          diffuseColor.rgb *= mix(vec3(0.72, 0.70, 0.66), vec3(1.0, 1.0, 1.04), hT);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.5, frame);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.028, 0.035), isWin);
          roughnessFactor = mix(roughnessFactor, 0.1, isWin);
          float h1 = envHash(cell + vInst * 7.31);
          float h2 = envHash(cell * 1.7 + vInst * 3.17 + 11.0);
          float on = step(0.52, h1);
          vec3 tint = mix(vec3(1.0, 0.72, 0.42), vec3(0.78, 0.86, 1.0), step(0.7, h2));
          totalEmissiveRadiance += isWin * on * uWinNight * tint * (0.5 + 0.5 * h2);
        }`);
  };
  const blocks = [];
  const towers = [
    [-70, 0, -60, 22, 70, 22], [-110, 0, -20, 18, 44, 26], [-40, 0, -120, 30, 96, 24], [10, 0, -95, 20, 58, 20],
    [60, 0, -130, 26, 82, 26], [-140, 0, 60, 24, 36, 24], [110, 0, -50, 18, 50, 18], [130, 0, 20, 22, 30, 34],
    [-90, 0, 120, 20, 64, 20], [40, 0, 150, 26, 48, 26], [-190, 0, -150, 34, 120, 34], [180, 0, -190, 30, 104, 30],
  ];
  for (const t of towers) blocks.push({ x: t[0], z: t[2], w: t[3], h: t[4], d: t[5], win: 1, rot: rng.range(-0.08, 0.08) });
  // low plinths / walls near the spheres for contact shadows
  blocks.push({ x: 24, z: 62, w: 44, h: 1.2, d: 3, win: 0, rot: 0 });
  blocks.push({ x: 70, z: 44, w: 3, h: 4, d: 30, win: 0, rot: 0 });
  blocks.push({ x: 4, z: 16, w: 6, h: 6, d: 6, win: 0, rot: 0.4 });
  blocks.push({ x: 90, z: 100, w: 10, h: 3, d: 10, win: 0, rot: 0.2 });
  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(260, 900);
    blocks.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: rng.range(14, 40), h: rng.range(10, 60), d: rng.range(14, 40), win: 1, rot: rng.range(0, 3.14) });
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const aBox = new Float32Array(blocks.length * 3), aWin = new Float32Array(blocks.length);
  blocks.forEach((b, i) => { aBox[i * 3] = b.w; aBox[i * 3 + 1] = b.h; aBox[i * 3 + 2] = b.d; aWin[i] = b.win; });
  boxGeo.setAttribute('aBox', new THREE.InstancedBufferAttribute(aBox, 3));
  boxGeo.setAttribute('aWin', new THREE.InstancedBufferAttribute(aWin, 1));
  const blockMesh = new THREE.InstancedMesh(boxGeo, blockMat, blocks.length);
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  blocks.forEach((b, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rot);
    s.set(b.w, b.h, b.d); p.set(b.x, b.h / 2, b.z);
    m4.compose(p, q, s);
    blockMesh.setMatrixAt(i, m4);
  });
  blockMesh.castShadow = true; blockMesh.receiveShadow = true;
  blockMesh.frustumCulled = false;
  blockMesh.name = 'showcase-blocks';
  group.add(blockMesh);
}

/** Per-frame showcase state (wetness, window lights). */
export function updateShowcase(weather, night) {
  showcaseUniforms.wet.value = weather.wetness || 0;
  showcaseUniforms.winNight.value = night * 0.55;
}
