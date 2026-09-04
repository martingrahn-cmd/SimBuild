// Single-scattering atmosphere (Rayleigh + Mie + ozone), GLSL for the sky LUT and a JS port
// for CPU-side sun transmittance / sky-light averages. Units: metres; light irradiance in
// "three light units" (noon sun ≈ 4 => usable as DirectionalLight intensity at exposure 1).
import * as THREE from 'three';

export const SUN_TOA = 5.6;                 // top-of-atmosphere sun irradiance (light units)
export const SUN_TINT = [1.0, 0.985, 0.955]; // slightly warm solar spectrum
export const MOON_SCALE = 0.03;             // stylised (physically ~2.5e-6)
export const MOON_TINT = [0.62, 0.74, 1.0];

export const ATMOSPHERE_GLSL = /* glsl */`
#define ATM_PI 3.141592653589793
const float atmRe = 6360000.0;
const float atmRa = 6440000.0;
const vec3  atmBetaR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float atmBetaM = 21.0e-6;
const vec3  atmBetaO = vec3(0.65e-6, 1.881e-6, 0.085e-6);
const float atmHR = 8000.0;
const float atmHM = 1200.0;

vec2 atmSphere(vec3 ro, vec3 rd, float R) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - R * R;
  float d = b * b - c;
  if (d < 0.0) return vec2(1e12, -1e12);
  d = sqrt(d);
  return vec2(-b - d, -b + d);
}
vec3 atmDens(float h) {
  return vec3(exp(-h / atmHR), exp(-h / atmHM), max(0.0, 1.0 - abs(h - 25000.0) / 15000.0));
}
vec3 atmExtinct(vec3 od) {
  return exp(-(atmBetaR * od.x + atmBetaM * 1.1 * od.y + atmBetaO * od.z));
}
vec3 atmOpticalDepth(vec3 p, vec3 dir) {
  vec2 e = atmSphere(p, dir, atmRe);
  if (e.x > 0.0) return vec3(1e9);
  float tA = atmSphere(p, dir, atmRa).y;
  vec3 od = vec3(0.0);
  float t0 = 0.0;
  for (int i = 1; i <= 5; i++) {
    float u = float(i) / 5.0;
    float t1 = tA * u * u;
    vec3 q = p + dir * (0.5 * (t0 + t1));
    od += atmDens(length(q) - atmRe) * (t1 - t0);
    t0 = t1;
  }
  return od;
}
float atmPhaseR(float mu) { return 3.0 / (16.0 * ATM_PI) * (1.0 + mu * mu); }
float atmPhaseM(float mu, float g) {
  float g2 = g * g;
  return 3.0 / (8.0 * ATM_PI) * ((1.0 - g2) * (1.0 + mu * mu)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
}
// single scattering of light (direction L, irradiance LI) along the view ray; msBoost fakes multiple scattering
vec3 atmScatter(vec3 ro, vec3 rd, float tMax, vec3 L, vec3 LI, float msBoost) {
  vec3 odV = vec3(0.0);
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  float t0 = 0.0;
  for (int i = 1; i <= 16; i++) {
    float u = float(i) / 16.0;
    float t1 = tMax * u * u;
    float ds = t1 - t0;
    vec3 q = ro + rd * (0.5 * (t0 + t1));
    float h = length(q) - atmRe;
    vec3 d = atmDens(h) * ds;
    odV += d * 0.5;
    vec3 odL = atmOpticalDepth(q, L);
    vec3 T = atmExtinct(odV + odL);
    odV += d * 0.5;
    sumR += T * d.x;
    sumM += T * d.y;
    t0 = t1;
  }
  float mu = dot(rd, L);
  return LI * (sumR * atmBetaR * 1.25 * (atmPhaseR(mu) + msBoost / (4.0 * ATM_PI)) + sumM * atmBetaM * atmPhaseM(mu, 0.76));
}
`;

// ---------------------------------------------------------------- JS port (coarse) ----------
const Re = 6360000, Ra = 6440000, HR = 8000, HM = 1200;
const betaR = [5.8e-6, 13.5e-6, 33.1e-6], betaM = 21e-6, betaO = [0.65e-6, 1.881e-6, 0.085e-6];
const _q = new THREE.Vector3();

function sphere(ro, rd, R) {
  const b = ro.dot(rd); const c = ro.dot(ro) - R * R; let d = b * b - c;
  if (d < 0) return [1e12, -1e12];
  d = Math.sqrt(d); return [-b - d, -b + d];
}
function dens(h, out) {
  out[0] = Math.exp(-h / HR); out[1] = Math.exp(-h / HM); out[2] = Math.max(0, 1 - Math.abs(h - 25000) / 15000);
  return out;
}
const _d = [0, 0, 0];
function opticalDepth(p, dir, steps, out) {
  const e = sphere(p, dir, Re);
  out[0] = out[1] = out[2] = 0;
  if (e[0] > 0) { out[0] = out[1] = out[2] = 1e9; return out; }
  const tA = sphere(p, dir, Ra)[1];
  let t0 = 0;
  for (let i = 1; i <= steps; i++) {
    const u = i / steps; const t1 = tA * u * u; const ds = t1 - t0;
    _q.copy(p).addScaledVector(dir, 0.5 * (t0 + t1));
    dens(_q.length() - Re, _d);
    out[0] += _d[0] * ds; out[1] += _d[1] * ds; out[2] += _d[2] * ds; t0 = t1;
  }
  return out;
}
function extinct(od, out) {
  for (let i = 0; i < 3; i++) out[i] = Math.exp(-(betaR[i] * od[0] + betaM * 1.1 * od[1] + betaO[i] * od[2]));
  return out;
}
const _od = [0, 0, 0], _odL = [0, 0, 0], _odS = [0, 0, 0], _T = [0, 0, 0];
const _ro = new THREE.Vector3();

/** Transmittance (rgb) toward a direction from altitude `alt` metres. */
export function transmittance(dir, alt, out = [0, 0, 0], steps = 12) {
  _ro.set(0, Re + alt, 0);
  opticalDepth(_ro, dir, steps, _od);
  return extinct(_od, out);
}

/** Sky radiance (rgb) toward dir for a light (L, LI[3]) — coarse (8 view × 4 light samples). */
export function skyRadiance(dir, L, LI, msBoost, out = [0, 0, 0]) {
  _ro.set(0, Re + 150, 0);
  const tMax = sphere(_ro, dir, Ra)[1];
  const N = 12; let t0 = 0;
  _od[0] = _od[1] = _od[2] = 0;
  let sR0 = 0, sR1 = 0, sR2 = 0, sM0 = 0, sM1 = 0, sM2 = 0;
  for (let i = 1; i <= N; i++) {
    const u = i / N; const t1 = tMax * u * u; const ds = t1 - t0;
    _q.copy(_ro).addScaledVector(dir, 0.5 * (t0 + t1));
    dens(_q.length() - Re, _d);
    _od[0] += _d[0] * ds * 0.5; _od[1] += _d[1] * ds * 0.5; _od[2] += _d[2] * ds * 0.5;
    opticalDepth(_q, L, 5, _odL);
    _odS[0] = _od[0] + _odL[0]; _odS[1] = _od[1] + _odL[1]; _odS[2] = _od[2] + _odL[2];
    _od[0] += _d[0] * ds * 0.5; _od[1] += _d[1] * ds * 0.5; _od[2] += _d[2] * ds * 0.5;
    extinct(_odS, _T);
    sR0 += _T[0] * _d[0] * ds; sR1 += _T[1] * _d[0] * ds; sR2 += _T[2] * _d[0] * ds;
    sM0 += _T[0] * _d[1] * ds; sM1 += _T[1] * _d[1] * ds; sM2 += _T[2] * _d[1] * ds;
    t0 = t1;
  }
  const mu = dir.dot(L);
  const pR = 3 / (16 * Math.PI) * (1 + mu * mu) + msBoost / (4 * Math.PI);
  const g = 0.76, g2 = g * g;
  const pM = 3 / (8 * Math.PI) * ((1 - g2) * (1 + mu * mu)) / ((2 + g2) * Math.pow(1 + g2 - 2 * g * mu, 1.5));
  out[0] = LI[0] * (sR0 * betaR[0] * 1.25 * pR + sM0 * betaM * pM);
  out[1] = LI[1] * (sR1 * betaR[1] * 1.25 * pR + sM1 * betaM * pM);
  out[2] = LI[2] * (sR2 * betaR[2] * 1.25 * pR + sM2 * betaM * pM);
  return out;
}
