// Environment showcase: a lit test scene of its own — PBR ground (Poly Haven aerial_grass_rock, hex-tiled
// texture bombing so the 13 m tile never repeats, dirt patches from brown_mud_leaves_01 blended by macro
// noise, 40-250 m colour variation, wetness), a roughness/metalness sphere ladder, and concrete blocks /
// towers with a window grid (dark glass by day, per-window random warm/cool lights at night) so critics
// can judge sky, sun colour, shadows and exposure. 4 draws + 2 casters × cascades.
import * as THREE from 'three';
import { RENDER_ORDER } from '../../core/constants.js';

export const showcaseUniforms = {
  wet: { value: 0 },
  winNight: { value: 0 },
  night: { value: 0 },
};

// Hex-tiling (Heitz & Neyret 2018 / Mikkelsen 2022 simplified): three taps on a triangle grid, each cell
// with its own random rotation + offset, blended with contrast-preserving weights. Kills the lattice.
const HEX_GLSL = /* glsl */`
vec2 envHash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
struct EnvHex { vec2 uv1, uv2, uv3; vec3 w; mat2 r1, r2, r3; };
EnvHex envHexSetup(vec2 uv, float cellScale) {
  const mat2 skew = mat2(1.0, 0.0, -0.57735027, 1.15470054);
  vec2 st = skew * (uv * cellScale);
  vec2 base = floor(st);
  vec3 tmp = vec3(fract(st), 0.0);
  tmp.z = 1.0 - tmp.x - tmp.y;
  vec2 v1, v2, v3; vec3 w;
  if (tmp.z > 0.0) { w = vec3(tmp.z, tmp.y, tmp.x); v1 = base; v2 = base + vec2(0.0, 1.0); v3 = base + vec2(1.0, 0.0); }
  else { w = vec3(-tmp.z, 1.0 - tmp.y, 1.0 - tmp.x); v1 = base + vec2(1.0, 1.0); v2 = base + vec2(1.0, 0.0); v3 = base + vec2(0.0, 1.0); }
  w = pow(w, vec3(5.0)); w /= (w.x + w.y + w.z);   // sharp blend zones keep the photo's contrast
  vec2 h1 = envHash2(v1), h2 = envHash2(v2), h3 = envHash2(v3);
  float a1 = h1.x * 6.2831853, a2 = h2.x * 6.2831853, a3 = h3.x * 6.2831853;
  EnvHex H;
  H.r1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
  H.r2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
  H.r3 = mat2(cos(a3), sin(a3), -sin(a3), cos(a3));
  H.uv1 = H.r1 * uv + h1.y * 7.31;
  H.uv2 = H.r2 * uv + h2.y * 3.17;
  H.uv3 = H.r3 * uv + h3.y * 5.53;
  H.w = w;
  return H;
}
vec4 envHexSample(sampler2D t, EnvHex H) {
  return texture2D(t, H.uv1) * H.w.x + texture2D(t, H.uv2) * H.w.y + texture2D(t, H.uv3) * H.w.z;
}
// tangent-space normal: rotate each tap's xy back by the cell rotation before blending
vec3 envHexNormal(sampler2D t, EnvHex H) {
  vec3 n1 = texture2D(t, H.uv1).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(t, H.uv2).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D(t, H.uv3).xyz * 2.0 - 1.0;
  n1.xy = n1.xy * H.r1; n2.xy = n2.xy * H.r2; n3.xy = n3.xy * H.r3;
  return normalize(n1 * H.w.x + n2 * H.w.y + n3 * H.w.z);
}
`;

export async function setupShowcase(ctx) {
  const rng = ctx.rng.fork('showcase');
  const group = ctx.group;
  const { assets } = ctx;

  // ---------------------------------------------------------------- ground
  const [groundSet, dirtSet] = await Promise.all([
    assets.pbr('aerial_grass_rock', { repeat: [8000 / 13, 8000 / 13] }),
    assets.pbr('brown_mud_leaves_01', { repeat: [8000 / 7, 8000 / 7] }),
  ]);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  assets.applyPbr(groundMat, groundSet, { normalScale: 0.7, aoIntensity: 0.7 });
  const dirtMap = dirtSet.map;
  groundMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = showcaseUniforms.wet;
    shader.uniforms.uNight = showcaseUniforms.night;
    shader.uniforms.uDirtMap = { value: dirtMap };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>', `#include <map_pars_fragment>
        uniform sampler2D uEnvNoise; uniform float uWet; uniform float uNight;
        uniform sampler2D uDirtMap;
        ${HEX_GLSL}`)
      .replace('#include <map_fragment>', `
        // --- macro variation (world space): 40 m / 90 m / 250 m colour noise, dirt-patch mask, worn tracks
        vec2 envWp = vEnvWorldPos.xz;
        vec4 envN1 = texture2D(uEnvNoise, envWp * (1.0 / 250.0) + vec2(0.13, 0.71));
        vec4 envN2 = texture2D(uEnvNoise, envWp * (1.0 / 62.0) + vec2(0.41, 0.19));
        float envMacro = envN1.r * 0.5 + envN1.g * 0.3 + envN2.b * 0.2;            // 0..1 broad
        float envMid = envN2.r * 0.6 + envN2.g * 0.4;                                 // 0..1 mid
        vec4 envN3 = texture2D(uEnvNoise, envWp * (1.0 / 22.0) + vec2(0.77, 0.33));
        // dirt: small worn patches (10-30 m) where the mid-scale noise peaks, plus rare larger bare areas
        float envDirtMask = smoothstep(0.66, 0.78, envN2.a * 0.5 + envN3.g * 0.35 + envN1.g * 0.15) * 0.9
                          + smoothstep(0.74, 0.86, envN1.a * 0.7 + envN2.r * 0.3) * 0.8;
        envDirtMask = min(envDirtMask, 1.0);
        // --- hex-tiled detail (grass) and dirt
        EnvHex envHG = envHexSetup(vMapUv, 0.62);
        vec4 envGrass = envHexSample(map, envHG);
        EnvHex envHD = envHexSetup(vMapUv * (13.0 / 7.0), 0.5);
        vec4 envDirt = envHexSample(uDirtMap, envHD);
        vec3 envGroundN = envHexNormal(normalMap, envHG);
        vec4 envArm = envHexSample(roughnessMap, envHG);
        // grass tint: lush / mid / dry patches, albedo kept <= ~0.3 linear
        // the moss/gravel photo is yellow-olive: keep its luminance detail, take the hue from the macro tint
        float envGL = dot(envGrass.rgb, vec3(0.3, 0.59, 0.11));
        vec3 envGrassDet = mix(envGrass.rgb, vec3(envGL), 0.6);
        vec3 envLush = vec3(0.15, 0.50, 0.08), envMidC = vec3(0.28, 0.54, 0.13), envDry = vec3(0.58, 0.50, 0.21);
        vec3 envTint = mix(mix(envLush, envMidC, smoothstep(0.38, 0.66, envMacro)), envDry, smoothstep(0.62, 0.9, envMid * 0.6 + envMacro * 0.4));
        vec3 envGrassCol = envGrassDet * envTint * mix(0.82, 1.12, envN2.b) * mix(0.9, 1.1, envN1.b);
        vec3 envDirtCol = envDirt.rgb * vec3(0.95, 0.88, 0.78) * mix(0.8, 1.05, envN2.r);
        float envDirtK = envDirtMask * (0.6 + 0.4 * smoothstep(0.3, 0.7, envGrass.r));   // dirt shows through where the grass tap is bright/thin
        diffuseColor.rgb *= mix(envGrassCol, envDirtCol, envDirtK);
        envGroundN = normalize(mix(envGroundN, vec3(0.0, 0.0, 1.0), envDirtK * 0.6));
        float envDirtF = envDirtK;
        // night: CS2's moonlit ground is desaturated blue-grey, not olive
        float envLum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(envLum) * vec3(0.92, 0.97, 1.08), uNight * 0.55);
        diffuseColor.rgb *= 1.0 - uWet * 0.4;`)
      .replace('#include <normal_fragment_maps>', `
        // hex-tiled normal (replaces the stock tap); keep the map's strength modest so dry grass never sheens
        normal = normalize(tbn * (envGroundN * vec3(normalScale, 1.0)));`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        // dry grass is matte: floor at 0.86 (the ARM's low values only matter when wet); dirt slightly smoother when wet
        roughnessFactor = mix(max(envArm.g, 0.86), mix(0.4, 0.28, envDirtF), uWet * 0.85);`)
      .replace('#include <aomap_fragment>', `
        #ifdef USE_AOMAP
          float ambientOcclusion = (envArm.r - 1.0) * aoMapIntensity + 1.0;
          reflectedLight.indirectDiffuse *= ambientOcclusion;
        #endif`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true; ground.castShadow = false;
  ground.renderOrder = RENDER_ORDER.TERRAIN;
  ground.name = 'showcase-ground';
  group.add(ground);

  // ---------------------------------------------------------------- spheres (roughness / metalness ladder)
  const sphereGeo = new THREE.SphereGeometry(3.2, 32, 18);
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
          // anti-aliased window edges; far away (grid below ~3 px) the pattern fades to its average so towers don't shimmer
          vec2 fw = fwidth(g);
          float aa = max(fw.x, fw.y);
          float far = smoothstep(0.18, 0.6, aa);
          float ex = clamp(fw.x * 0.5, 0.005, 0.2), ey = clamp(fw.y * 0.5, 0.005, 0.2);
          float inX = smoothstep(0.10 - ex, 0.10 + ex, f.x) * (1.0 - smoothstep(0.90 - ex, 0.90 + ex, f.x));
          float inY = smoothstep(0.26 - ey, 0.26 + ey, f.y) * (1.0 - smoothstep(0.82 - ey, 0.82 + ey, f.y));
          float isWin = inX * inY * step(0.0, g.y);
          float frame = (smoothstep(0.06 - ex, 0.06 + ex, f.x) * (1.0 - smoothstep(0.94 - ex, 0.94 + ex, f.x)) * smoothstep(0.2 - ey, 0.2 + ey, f.y) * (1.0 - smoothstep(0.88 - ey, 0.88 + ey, f.y))) - isWin;
          isWin = mix(isWin, 0.45, far); frame = mix(frame, 0.12, far);
          float hT = envHash(vec2(vInst, 3.0));
          diffuseColor.rgb *= mix(vec3(0.72, 0.70, 0.66), vec3(1.0, 1.0, 1.04), hT);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.5, clamp(frame, 0.0, 1.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.028, 0.035), isWin);
          roughnessFactor = mix(roughnessFactor, 0.12, isWin);
          float h1 = envHash(cell + vInst * 7.31);
          float h2 = envHash(cell * 1.7 + vInst * 3.17 + 11.0);
          float on = mix(step(0.52, h1), 0.48, far);
          vec3 tint = mix(vec3(1.0, 0.70, 0.40), vec3(0.72, 0.84, 1.0), step(0.7, h2));
          totalEmissiveRadiance += isWin * on * uWinNight * tint * (0.55 + 0.45 * h2);
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

/** Per-frame showcase state (wetness, window lights, night desaturation). */
export function updateShowcase(weather, night) {
  showcaseUniforms.wet.value = weather.wetness || 0;
  showcaseUniforms.winNight.value = night * 0.28;
  showcaseUniforms.night.value = night;
}
