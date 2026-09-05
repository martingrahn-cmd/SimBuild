// Custom full-screen passes for the effects chain: depth-only ambient occlusion (no extra scene render,
// normals are reconstructed from depth), a fused AO×colour + depth-of-field composite, and the final
// display-referred grade (CAS sharpen, lift/gamma/gain, saturation, temperature, vignette, dither).
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// shared helpers: linear depth from the hardware depth buffer, view-space position, IGN dither
const DEPTH_GLSL = /* glsl */`
uniform sampler2D tDepth;
uniform vec4 uProj;   // tanHalfFovX, tanHalfFovY, near, far
float linDepthAt(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return uProj.z * uProj.w / (uProj.w - d * (uProj.w - uProj.z));
}
float linFromDepth(float d) { return uProj.z * uProj.w / (uProj.w - d * (uProj.w - uProj.z)); }
vec3 viewPos(vec2 uv, float lin) { return vec3((uv * 2.0 - 1.0) * uProj.xy * lin, -lin); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

const AO_FRAG = /* glsl */`
${DEPTH_GLSL}
uniform vec2 uTexel;        // 1 / AO resolution
uniform vec2 uDepthTexel;   // 1 / depth resolution
uniform vec4 uAO;           // radius (m), intensity, bias, projScale (px per metre at 1 m, in AO pixels)
uniform vec2 uFade;         // fade start / end (m)
varying vec2 vUv;
#define N 12
void main() {
  // snap to the centre of a full-resolution depth texel: this pass runs at reduced resolution, and a
  // half-res pixel centre lands exactly on a depth texel boundary, where nearest sampling is ambiguous
  vec2 uv0 = (floor(vUv / uDepthTexel) + 0.5) * uDepthTexel;
  float d0 = texture2D(tDepth, uv0).x;
  if (d0 >= 0.999999) { gl_FragColor = vec4(1.0, uProj.w, 0.0, 1.0); return; }
  float lin = linFromDepth(d0);
  vec3 p = viewPos(uv0, lin);
  vec2 tx = vec2(uDepthTexel.x, 0.0), ty = vec2(0.0, uDepthTexel.y);
  vec3 pr = viewPos(uv0 + tx, linDepthAt(uv0 + tx)), pl = viewPos(uv0 - tx, linDepthAt(uv0 - tx));
  vec3 pu = viewPos(uv0 + ty, linDepthAt(uv0 + ty)), pd = viewPos(uv0 - ty, linDepthAt(uv0 - ty));
  vec3 dx = abs(pr.z - p.z) < abs(p.z - pl.z) ? pr - p : p - pl;
  vec3 dy = abs(pu.z - p.z) < abs(p.z - pd.z) ? pu - p : p - pd;
  vec3 n = normalize(cross(dx, dy));
  float radius = uAO.x;
  float rpx = clamp(radius * uAO.w / lin, 2.5, 72.0);
  float rot = ign(gl_FragCoord.xy) * 6.2831853;
  float sum = 0.0;
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    float a = rot + fi * 2.399963;
    float r = sqrt((fi + 0.5) / float(N)) * rpx;
    vec2 suv = uv0 + vec2(cos(a), sin(a)) * r * uTexel;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
    suv = (floor(suv / uDepthTexel) + 0.5) * uDepthTexel;
    float ls = linDepthAt(suv);
    vec3 v = viewPos(suv, ls) - p;
    float vv = dot(v, v);
    float falloff = max(0.0, 1.0 - vv / (radius * radius));
    sum += clamp(dot(v, n) * inversesqrt(vv + 1e-4) - uAO.z, 0.0, 1.0) * falloff;
  }
  float ao = clamp(1.0 - uAO.y * 1.7 * sum / float(N), 0.0, 1.0);
  ao = mix(1.0, ao, 1.0 - smoothstep(uFade.x, uFade.y, lin));
  gl_FragColor = vec4(ao, min(lin, uProj.w), 0.0, 1.0);
}
`;

const BLUR_FRAG = /* glsl */`
uniform sampler2D tAO;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec2 c = texture2D(tAO, vUv).rg;
  float sum = c.r, wsum = 1.0;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    vec2 o = uDir * fi;
    vec2 a = texture2D(tAO, vUv + o).rg, b = texture2D(tAO, vUv - o).rg;
    float k = 1.0 - fi * 0.16;
    float wa = exp(-abs(a.g - c.g) / (c.g * 0.03 + 0.05)) * k;
    float wb = exp(-abs(b.g - c.g) / (c.g * 0.03 + 0.05)) * k;
    sum += a.r * wa + b.r * wb; wsum += wa + wb;
  }
  gl_FragColor = vec4(sum / wsum, c.g, 0.0, 1.0);
}
`;

// AO × colour, with an optional single-pass gather depth of field (focus around the camera target).
const COMPOSITE_FRAG = /* glsl */`
${DEPTH_GLSL}
uniform sampler2D tDiffuse;
uniform sampler2D tAO;
uniform vec2 uTexel;
uniform vec4 uDof;      // focus distance (m), focus range (m), max CoC (px), enabled
uniform vec2 uAOMix;    // power, mix
varying vec2 vUv;
float coc(float lin) {
  // near-field only: foreground closer than the focus distance softens, the far city stays crisp (fog does the rest)
  float c = (uDof.x - lin) / uDof.y;
  return smoothstep(0.0, 1.0, c) * uDof.z;
}
vec3 shaded(vec2 uv) {
  float ao = texture2D(tAO, uv).r;
  ao = (ao == ao) ? clamp(ao, 0.0, 1.0) : 1.0;
  return texture2D(tDiffuse, uv).rgb * mix(1.0, pow(max(ao, 1e-4), uAOMix.x), uAOMix.y);
}
void main() {
  vec3 col = shaded(vUv);
  if (uDof.w > 0.5) {
    float lin = linDepthAt(vUv);
    float c0 = coc(lin);
    if (c0 > 0.8) {
      vec3 acc = col; float wsum = 1.0;
      float rot = ign(gl_FragCoord.xy) * 6.2831853;
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float a = rot + fi * 2.399963;
        float r = sqrt((fi + 0.5) / 8.0) * c0;
        vec2 suv = clamp(vUv + vec2(cos(a), sin(a)) * r * uTexel, vec2(0.0), vec2(1.0));
        float ls = linDepthAt(suv);
        float cs = coc(ls);
        float reach = ls > lin ? max(cs, c0) : cs;
        float w = smoothstep(r - 1.5, r + 0.5, reach);
        acc += shaded(suv) * w; wsum += w;
      }
      col = acc / wsum;
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

// Final display-referred pass (input is tone-mapped sRGB from OutputPass + AA).
// Order: CAS sharpen -> lift/gamma/gain -> filmic S contrast -> split toning (cool shadows / warm highlights)
// -> saturation + vibrance -> temperature/tint -> vignette -> dither.
const GRADE_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform vec3 uLift, uGamma, uGain;
uniform vec4 uGrade;      // saturation, contrast, temperature, vignette
uniform vec4 uCurve;      // pivot, vibrance, tint (green<0, magenta>0), black point
uniform vec3 uShadowTint, uHighTint;
uniform vec2 uSharpen;    // amount, dither amplitude
varying vec2 vUv;
vec3 tex(vec2 uv) { return texture2D(tDiffuse, uv).rgb; }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec3 c = tex(vUv);
  vec3 n = tex(vUv + vec2(0.0, uTexel.y)), s = tex(vUv - vec2(0.0, uTexel.y));
  vec3 e = tex(vUv + vec2(uTexel.x, 0.0)), w = tex(vUv - vec2(uTexel.x, 0.0));
  vec3 mn = min(min(min(n, s), min(e, w)), c), mx = max(max(max(n, s), max(e, w)), c);
  // contrast-adaptive sharpening: strongest on low-contrast detail, nothing on hard edges
  vec3 ampv = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, 1e-3), 0.0, 1.0));
  float amp = dot(ampv, vec3(0.333));
  c = c + (c * 4.0 - (n + s + e + w)) * uSharpen.x * amp * 0.25;
  c = max(c, 0.0);
  // lift / gamma / gain
  c = c * uGain + uLift * (1.0 - c);
  c = pow(max(c, 0.0), 1.0 / uGamma);
  // black point: pull the darkest values down a touch (haze compensation), keeps 0..1
  c = max(c - uCurve.w, 0.0) / (1.0 - uCurve.w);
  // filmic S contrast around the pivot: smoothstep blend never clips, linear part adds punch
  float k = uGrade.y - 1.0;
  vec3 sc = c * c * (3.0 - 2.0 * c);
  c = mix(c, sc, clamp(k * 1.6, 0.0, 0.8));
  c = uCurve.x + (c - uCurve.x) * (1.0 + k * 0.35);
  c = clamp(c, 0.0, 1.0);
  // split toning by luminance
  float l = luma(c);
  float shw = 1.0 - smoothstep(0.0, 0.50, l);
  float hiw = smoothstep(0.40, 1.0, l);
  c += uShadowTint * shw * (0.25 + 0.75 * l / 0.5);
  c += uHighTint * hiw;
  // saturation + vibrance (boosts muted colours more than already vivid ones)
  l = luma(c);
  float satNow = (max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b)) / max(max(max(c.r, c.g), c.b), 1e-3);
  float satK = uGrade.x + uCurve.y * (1.0 - satNow);
  c = mix(vec3(l), c, satK);
  // colour temperature (warm > 0, cool < 0) and green/magenta tint
  c *= vec3(1.0 + uGrade.z * 0.10, 1.0 + uGrade.z * 0.025 - uCurve.z * 0.06, 1.0 - uGrade.z * 0.10 + uCurve.z * 0.03);
  // vignette
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.85);
  c *= 1.0 - uGrade.w * smoothstep(0.30, 0.95, length(q) * 1.6);
  // dither to hide 8-bit banding in skies
  c += (ign(gl_FragCoord.xy) - 0.5) * uSharpen.y;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

function mat(frag, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
}

/** Ambient occlusion + DOF composite. Reads the scene depth of the RenderPass target. */
export class AmbientPass extends Pass {
  constructor(depthTexture, camera, { scale = 1 } = {}) {
    super();
    this.camera = camera;
    this.scale = scale;
    this.needsSwap = true;
    this.width = 1; this.height = 1;
    const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts); this.rtA.texture.name = 'effects.ao';
    this.rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts); this.rtB.texture.name = 'effects.aoBlur';
    this.uProj = { value: new THREE.Vector4(1, 1, 1, 1000) };
    this.aoMat = mat(AO_FRAG, {
      tDepth: { value: depthTexture }, uProj: this.uProj,
      uTexel: { value: new THREE.Vector2(1, 1) }, uDepthTexel: { value: new THREE.Vector2(1, 1) },
      uAO: { value: new THREE.Vector4(3.5, 1.0, 0.08, 1000) }, uFade: { value: new THREE.Vector2(1800, 3600) },
    });
    this.blurMat = mat(BLUR_FRAG, { tAO: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } });
    this.compMat = mat(COMPOSITE_FRAG, {
      tDepth: { value: depthTexture }, uProj: this.uProj, tDiffuse: { value: null }, tAO: { value: this.rtA.texture },
      uTexel: { value: new THREE.Vector2(1, 1) }, uDof: { value: new THREE.Vector4(100, 60, 5, 0) }, uAOMix: { value: new THREE.Vector2(1.0, 1.0) },
    });
    this.quad = new FullScreenQuad(this.aoMat);
    this.aoEnabled = true;
  }
  setSize(w, h) {
    this.width = w; this.height = h;
    const aw = Math.max(1, Math.round(w * this.scale)), ah = Math.max(1, Math.round(h * this.scale));
    this.rtA.setSize(aw, ah); this.rtB.setSize(aw, ah);
    this.aoMat.uniforms.uTexel.value.set(1 / aw, 1 / ah);
    this.aoMat.uniforms.uDepthTexel.value.set(1 / w, 1 / h);
    this.compMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    this._projScale = ah / 2; // × 1/tanHalfFovY at render time
  }
  /** Per-frame parameters. */
  setParams({ radius, intensity, bias, power, dofEnabled, focus, range, maxCoc }) {
    const u = this.aoMat.uniforms.uAO.value;
    if (radius !== undefined) u.x = radius;
    if (intensity !== undefined) u.y = intensity;
    if (bias !== undefined) u.z = bias;
    if (power !== undefined) this.compMat.uniforms.uAOMix.value.x = power;
    const d = this.compMat.uniforms.uDof.value;
    if (focus !== undefined) d.x = focus;
    if (range !== undefined) d.y = range;
    if (maxCoc !== undefined) d.z = maxCoc;
    if (dofEnabled !== undefined) d.w = dofEnabled ? 1 : 0;
  }
  render(renderer, writeBuffer, readBuffer) {
    const cam = this.camera;
    const tanY = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));
    this.uProj.value.set(tanY * cam.aspect, tanY, cam.near, cam.far);
    this.aoMat.uniforms.uAO.value.w = this._projScale / tanY;
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    if (this.aoEnabled) {
      this.quad.material = this.aoMat;
      renderer.setRenderTarget(this.rtA); this.quad.render(renderer);
      this.quad.material = this.blurMat;
      this.blurMat.uniforms.tAO.value = this.rtA.texture; this.blurMat.uniforms.uDir.value.set(1 / this.rtA.width, 0);
      renderer.setRenderTarget(this.rtB); this.quad.render(renderer);
      this.blurMat.uniforms.tAO.value = this.rtB.texture; this.blurMat.uniforms.uDir.value.set(0, 1 / this.rtA.height);
      renderer.setRenderTarget(this.rtA); this.quad.render(renderer);
    }
    this.compMat.uniforms.tDiffuse.value = readBuffer.texture;
    this.compMat.uniforms.tAO.value = this.rtA.texture;
    this.compMat.uniforms.uAOMix.value.y = this.aoEnabled ? 1 : 0;
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
    renderer.autoClear = oldAutoClear;
  }
  dispose() { this.rtA.dispose(); this.rtB.dispose(); this.aoMat.dispose(); this.blurMat.dispose(); this.compMat.dispose(); this.quad.dispose(); }
}

/** Final grade (display-referred). */
export class GradePass extends Pass {
  constructor() {
    super();
    this.needsSwap = true;
    this.material = mat(GRADE_FRAG, {
      tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
      uLift: { value: new THREE.Vector3(0, 0, 0) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
      uGrade: { value: new THREE.Vector4(1, 1, 0, 0) }, uSharpen: { value: new THREE.Vector2(0.3, 1 / 255) },
      uCurve: { value: new THREE.Vector4(0.42, 0, 0, 0) }, uShadowTint: { value: new THREE.Vector3(0, 0, 0) }, uHighTint: { value: new THREE.Vector3(0, 0, 0) },
    });
    this.u = this.material.uniforms;
    this.quad = new FullScreenQuad(this.material);
  }
  setSize(w, h) { this.u.uTexel.value.set(1 / w, 1 / h); }
  render(renderer, writeBuffer, readBuffer) {
    this.u.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }
  dispose() { this.material.dispose(); this.quad.dispose(); }
}
