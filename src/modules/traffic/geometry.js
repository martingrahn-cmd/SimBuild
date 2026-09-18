// Procedural vehicle + pedestrian geometry.
// Vehicle bodies are lofted: a longitudinal profile (roofline, floor, half-width, beltline, roof taper)
// is monotone-cubic interpolated into ~30 cross sections, each a superellipse ring. That gives smooth
// car shapes with real windshield/roof curvature instead of boxes. Material is chosen PER QUAD (the
// mesh is non-indexed with smoothed grid normals) so window/paint boundaries stay crisp.
import * as THREE from 'three';

export const MAT = {
  PAINT: 0, GLASS: 1, TYRE: 2, RIM: 3, HEAD: 4, TAIL: 5, TRIM: 6, PANEL: 7, DARK: 8, SIGN: 9, PLATE: 10, BLUE:11, RED:12, WHITE:13,
};
export const LAMP = { CONE: 0, HEAD: 1, TAIL: 2 };

// ---------------------------------------------------------------- monotone cubic (no overshoot)
function monoSpline(xs, ys) {
  const n = xs.length;
  const d = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  const m = new Float64Array(n);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]);
      const w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1]);
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    const h = xs[hi] - xs[lo], t = (x - xs[lo]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * m[lo]
      + (-2 * t3 + 3 * t2) * ys[hi] + (t3 - t2) * h * m[hi];
  };
}
function linSample(xs, ys) {
  const n = xs.length;
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + (ys[hi] - ys[lo]) * t;
  };
}

// ---------------------------------------------------------------- accumulator
class Acc {
  constructor() { this.pos = []; this.nor = []; this.mat = []; this.whl = []; this.joints=[];this.joint=0; }
  get tris() { return this.pos.length / 9; }
  vert(px, py, pz, nx, ny, nz, m, w) {
    this.pos.push(px, py, pz); this.nor.push(nx, ny, nz); this.mat.push(m);this.joints.push(this.joint);
    if (w) this.whl.push(w[0], w[1], w[2], 1); else this.whl.push(0, 0, 0, 0);
  }
  /** triangle with explicit vertex normals; winding fixed so the face normal agrees with n0 */
  tri(p0, n0, p1, n1, p2, n2, m, w) {
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
    const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    if (fx * n0[0] + fy * n0[1] + fz * n0[2] < 0) {
      this.vert(p0[0], p0[1], p0[2], n0[0], n0[1], n0[2], m, w);
      this.vert(p2[0], p2[1], p2[2], n2[0], n2[1], n2[2], m, w);
      this.vert(p1[0], p1[1], p1[2], n1[0], n1[1], n1[2], m, w);
    } else {
      this.vert(p0[0], p0[1], p0[2], n0[0], n0[1], n0[2], m, w);
      this.vert(p1[0], p1[1], p1[2], n1[0], n1[1], n1[2], m, w);
      this.vert(p2[0], p2[1], p2[2], n2[0], n2[1], n2[2], m, w);
    }
  }
  quad(p0, n0, p1, n1, p2, n2, p3, n3, m, w) {
    this.tri(p0, n0, p1, n1, p2, n2, m, w);
    this.tri(p0, n0, p2, n2, p3, n3, m, w);
  }
  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aJoint',new THREE.Float32BufferAttribute(this.joints,1));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    g.setAttribute('aWheel', new THREE.Float32BufferAttribute(this.whl, 4));
    g.computeBoundingSphere();
    return g;
  }
}

// ---------------------------------------------------------------- vehicle specs
// profile rows: [u, floorY, roofY, halfWidthFactor, beltFraction, roofWidthFactor, glass]
// u = 0 at the front bumper, 1 at the rear. All heights in metres, wheel bottom at y = 0.
const SPECS = {
  sedan: {
    L: 4.62, HW: 0.92, ring: 14, wheelR: 0.325, wheelW: 0.115, wheelZ: 1.44, wheelXf: 0.80,
    pillars: [0.372, 0.585, 0.775], pw: 0.016,
    rows: [
      [0.000, 0.36, 0.76, 0.60, 1, 1, 0],
      [0.030, 0.25, 0.82, 0.82, 1, 1, 0],
      [0.090, 0.20, 0.86, 0.95, 1, 1, 0],
      [0.210, 0.19, 0.89, 1.00, 1, 1, 0],
      [0.310, 0.19, 0.94, 1.00, 1, 1, 0],
      [0.360, 0.19, 1.10, 1.00, 0.68, 0.93, 1],
      [0.430, 0.19, 1.33, 0.99, 0.56, 0.86, 1],
      [0.510, 0.19, 1.44, 0.98, 0.52, 0.84, 1],
      [0.650, 0.19, 1.45, 0.98, 0.52, 0.84, 1],
      [0.730, 0.19, 1.39, 0.98, 0.55, 0.85, 1],
      [0.800, 0.20, 1.14, 0.99, 0.64, 0.91, 1],
      [0.855, 0.20, 0.99, 1.00, 1, 1, 0],
      [0.935, 0.21, 0.96, 0.98, 1, 1, 0],
      [0.975, 0.25, 0.93, 0.90, 1, 1, 0],
      [1.000, 0.36, 0.85, 0.62, 1, 1, 0],
    ],
  },
  hatchback: {
    L: 4.02, HW: 0.885, ring: 14, wheelR: 0.315, wheelW: 0.11, wheelZ: 1.24, wheelXf: 0.79,
    pillars: [0.395, 0.615, 0.855], pw: 0.016,
    rows: [
      [0.000, 0.36, 0.78, 0.60, 1, 1, 0],
      [0.035, 0.24, 0.84, 0.84, 1, 1, 0],
      [0.100, 0.20, 0.88, 0.96, 1, 1, 0],
      [0.230, 0.19, 0.93, 1.00, 1, 1, 0],
      [0.330, 0.19, 0.99, 1.00, 1, 1, 0],
      [0.385, 0.19, 1.15, 1.00, 0.70, 0.93, 1],
      [0.460, 0.19, 1.38, 0.99, 0.58, 0.86, 1],
      [0.540, 0.19, 1.48, 0.98, 0.54, 0.84, 1],
      [0.700, 0.19, 1.49, 0.98, 0.54, 0.84, 1],
      [0.800, 0.19, 1.45, 0.98, 0.56, 0.85, 1],
      [0.880, 0.20, 1.26, 0.98, 0.62, 0.88, 1],
      [0.940, 0.21, 1.06, 0.96, 1, 1, 0],
      [0.980, 0.24, 0.96, 0.88, 1, 1, 0],
      [1.000, 0.36, 0.86, 0.60, 1, 1, 0],
    ],
  },
  suv: {
    L: 4.78, HW: 0.985, ring: 14, wheelR: 0.375, wheelW: 0.135, wheelZ: 1.44, wheelXf: 0.80,
    pillars: [0.360, 0.575, 0.800], pw: 0.018,
    rows: [
      [0.000, 0.42, 0.95, 0.64, 1, 1, 0],
      [0.030, 0.30, 1.02, 0.86, 1, 1, 0],
      [0.085, 0.26, 1.06, 0.96, 1, 1, 0],
      [0.200, 0.25, 1.10, 1.00, 1, 1, 0],
      [0.300, 0.25, 1.15, 1.00, 1, 1, 0],
      [0.350, 0.25, 1.32, 1.00, 0.72, 0.94, 1],
      [0.420, 0.25, 1.60, 0.99, 0.60, 0.89, 1],
      [0.490, 0.25, 1.72, 0.99, 0.56, 0.88, 1],
      [0.700, 0.25, 1.73, 0.99, 0.56, 0.88, 1],
      [0.790, 0.25, 1.70, 0.99, 0.58, 0.88, 1],
      [0.860, 0.25, 1.58, 0.98, 0.62, 0.89, 1],
      [0.930, 0.26, 1.32, 0.97, 1, 1, 0],
      [0.980, 0.30, 1.10, 0.90, 1, 1, 0],
      [1.000, 0.42, 0.98, 0.64, 1, 1, 0],
    ],
  },
  taxi: {
    L: 4.66, HW: 0.93, ring: 14, wheelR: 0.325, wheelW: 0.115, wheelZ: 1.46, wheelXf: 0.80,
    pillars: [0.372, 0.585, 0.775], pw: 0.016, roofSign: true,
    rows: [
      [0.000, 0.36, 0.76, 0.60, 1, 1, 0],
      [0.030, 0.25, 0.82, 0.82, 1, 1, 0],
      [0.090, 0.20, 0.87, 0.95, 1, 1, 0],
      [0.210, 0.19, 0.90, 1.00, 1, 1, 0],
      [0.310, 0.19, 0.95, 1.00, 1, 1, 0],
      [0.360, 0.19, 1.12, 1.00, 0.68, 0.93, 1],
      [0.430, 0.19, 1.36, 0.99, 0.56, 0.86, 1],
      [0.510, 0.19, 1.47, 0.98, 0.52, 0.84, 1],
      [0.650, 0.19, 1.48, 0.98, 0.52, 0.84, 1],
      [0.730, 0.19, 1.42, 0.98, 0.55, 0.85, 1],
      [0.800, 0.20, 1.16, 0.99, 0.64, 0.91, 1],
      [0.855, 0.20, 1.00, 1.00, 1, 1, 0],
      [0.935, 0.21, 0.97, 0.98, 1, 1, 0],
      [0.975, 0.25, 0.94, 0.90, 1, 1, 0],
      [1.000, 0.36, 0.86, 0.62, 1, 1, 0],
    ],
  },
  pickup: {
    L: 5.40, HW: 1.00, ring: 14, wheelR: 0.395, wheelW: 0.14, wheelZ: 1.70, wheelXf: 0.79, round: 0.37,
    pillars: [0.310, 0.480], pw: 0.018, bedFrom: 0.56,
    rows: [
      [0.000, 0.44, 0.98, 0.66, 1, 1, 0],
      [0.030, 0.32, 1.06, 0.88, 1, 1, 0],
      [0.090, 0.28, 1.10, 0.97, 1, 1, 0],
      [0.220, 0.27, 1.16, 1.00, 1, 1, 0],
      [0.275, 0.27, 1.22, 1.00, 1, 1, 0],
      [0.320, 0.27, 1.46, 1.00, 0.74, 0.93, 1],
      [0.380, 0.27, 1.76, 0.99, 0.62, 0.88, 1],
      [0.440, 0.27, 1.86, 0.98, 0.58, 0.87, 1],
      [0.530, 0.27, 1.86, 0.98, 0.58, 0.87, 1],
      [0.560, 0.27, 1.60, 0.98, 1, 1, 0],
      [0.585, 0.27, 1.20, 1.00, 1, 1, 0],
      [0.960, 0.27, 1.20, 1.00, 1, 1, 0],
      [0.985, 0.30, 1.12, 0.92, 1, 1, 0],
      [1.000, 0.44, 1.00, 0.66, 1, 1, 0],
    ],
  },
  van: {
    L: 5.45, HW: 1.02, ring: 14, wheelR: 0.365, wheelW: 0.125, wheelZ: 1.72, wheelXf: 0.80, round: 0.34,
    pillars: [0.245, 0.430], pw: 0.018, panelFrom: 0.50,
    rows: [
      [0.000, 0.40, 0.92, 0.66, 1, 1, 0],
      [0.030, 0.28, 1.02, 0.88, 1, 1, 0],
      [0.085, 0.24, 1.10, 0.97, 1, 1, 0],
      [0.170, 0.24, 1.22, 1.00, 1, 1, 0],
      [0.215, 0.24, 1.42, 1.00, 0.80, 0.96, 1],
      [0.290, 0.24, 1.86, 1.00, 0.66, 0.92, 1],
      [0.370, 0.24, 2.08, 1.00, 0.60, 0.90, 1],
      [0.470, 0.24, 2.14, 1.00, 0.58, 0.90, 1],
      [0.520, 0.24, 2.15, 1.00, 1, 1, 0],
      [0.930, 0.24, 2.15, 1.00, 1, 1, 0],
      [0.975, 0.26, 2.06, 0.95, 1, 1, 0],
      [1.000, 0.38, 1.90, 0.70, 1, 1, 0],
    ],
  },
  truck: {
    L: 8.40, HW: 1.26, ring: 14, wheelR: 0.505, wheelW: 0.19, wheelZ: 2.95, wheelXf: 0.78, round: 0.30,
    pillars: [0.135, 0.255], pw: 0.014, panelFrom: 0.34, twinRear: true,
    rows: [
      [0.000, 0.62, 1.20, 0.66, 1, 1, 0],
      [0.020, 0.48, 1.42, 0.90, 1, 1, 0],
      [0.055, 0.44, 1.60, 0.99, 1, 1, 0],
      [0.090, 0.44, 1.80, 1.00, 1, 1, 0],
      [0.120, 0.44, 2.16, 1.00, 0.80, 0.96, 1],
      [0.170, 0.44, 2.52, 1.00, 0.72, 0.94, 1],
      [0.245, 0.44, 2.58, 1.00, 0.70, 0.94, 1],
      [0.275, 0.44, 2.58, 1.00, 1, 1, 0],
      [0.300, 0.52, 2.44, 0.94, 1, 1, 0],
      [0.330, 0.60, 2.62, 0.96, 1, 1, 0],
      [0.345, 0.62, 3.28, 1.00, 1, 1, 0],
      [0.960, 0.62, 3.30, 1.00, 1, 1, 0],
      [0.988, 0.62, 3.24, 0.98, 1, 1, 0],
      [1.000, 0.66, 3.14, 0.86, 1, 1, 0],
    ],
  },
  bus: {
    L: 11.60, HW: 1.29, ring: 16, wheelR: 0.505, wheelW: 0.19, wheelZ: 3.85, wheelXf: 0.78, round: 0.32,
    pillars: [0.155, 0.300, 0.450, 0.600, 0.745, 0.880], pw: 0.011, busGlass: true,
    rows: [
      [0.000, 0.34, 1.00, 0.62, 1, 1, 0],
      [0.012, 0.30, 1.35, 0.90, 1, 1, 0],
      [0.028, 0.28, 1.55, 1.00, 1, 1, 0],
      [0.050, 0.28, 1.72, 1.00, 1, 1, 0],
      [0.075, 0.28, 2.10, 1.00, 0.72, 0.98, 1],
      [0.110, 0.28, 2.72, 1.00, 0.54, 0.94, 1],
      [0.150, 0.28, 3.02, 1.00, 0.46, 0.90, 1],
      [0.250, 0.28, 3.10, 1.00, 0.44, 0.90, 1],
      [0.750, 0.28, 3.10, 1.00, 0.44, 0.90, 1],
      [0.870, 0.28, 3.08, 1.00, 0.45, 0.90, 1],
      [0.930, 0.28, 2.96, 1.00, 0.50, 0.92, 1],
      [0.975, 0.30, 2.60, 0.97, 1, 1, 0],
      [0.992, 0.32, 2.10, 0.90, 1, 1, 0],
      [1.000, 0.36, 1.60, 0.66, 1, 1, 0],
    ],
  },
};

// Modern, broad bumper faces and a straighter roof shoulder, with exposed wheel arches.
for (const spec of Object.values(SPECS)) {
 spec.round=.26; spec.H=Math.max(...spec.rows.map(r=>r[2]));
 spec.wheelXf=.91;
 for(const row of spec.rows){if(row[0]<.06||row[0]>.96)row[3]=Math.max(.9,row[3]);}
}
for(const row of SPECS.sedan.rows){if(row[0]>=.8)row[2]=row[0]<.855?1.00:row[2];}
for(const row of SPECS.hatchback.rows){if(row[0]>=.80&&row[0]<=.94){row[2]=1.48;row[4]=.56;row[5]=.91;row[6]=1;}if(row[0]===.98)row[2]=1.34;}
for(const row of SPECS.suv.rows){if(row[0]>=.42&&row[0]<=.93){row[2]=1.72;row[5]=.96;row[4]=.57;row[6]=1;}if(row[0]===.98)row[2]=1.60;}
SPECS.suv.rows.at(-1)[2]=1.53;SPECS.hatchback.rows.at(-1)[2]=1.31;
SPECS.suv.round=.17;SPECS.hatchback.round=.22;
SPECS.box_truck=SPECS.truck;delete SPECS.truck;
SPECS.police={...SPECS.sedan,roofSign:false};
SPECS.semi={...SPECS.box_truck,L:18.6,HW:1.275,H:4,wheelZ:7.1,tractorLength:6.2,trailerLength:13.6,hitchZ:-4.0};
SPECS.motorbike={...SPECS.hatchback,L:2.1,HW:.4,H:1.3,wheelR:.32,wheelW:.08,wheelZ:.72,wheelXf:0,rows:SPECS.hatchback.rows.map(r=>[r[0],.35,Math.max(.4,r[2]*.52),.45,r[4],r[5],r[6]])};

export const VEHICLE_KINDS = Object.keys(SPECS);
export function vehicleSpec(kind) { return SPECS[kind]; }

// ---------------------------------------------------------------- loft
function ringPoint(sec, k, M, out) {
  const phi = (k / M) * Math.PI * 2 - Math.PI / 2;
  const c = Math.cos(phi), s = Math.sin(phi);
  const e = sec.e;
  const yc = (sec.y0 + sec.y1) * 0.5, b = (sec.y1 - sec.y0) * 0.5;
  const sy = (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), e);
  const y = yc + b * sy;
  const t = b > 1e-5 ? (y - sec.y0) / (2 * b) : 0;
  let taper = 1;
  if (sec.belt < 0.999 && t > sec.belt) {
    const k2 = Math.min(1, (t - sec.belt) / (1 - sec.belt));
    taper = 1 + (sec.topW - 1) * (k2 * k2 * (3 - 2 * k2));
  }
  if (t < 0.18) { const k3 = t / 0.18; taper *= 0.885 + 0.115 * (k3 * k3 * (3 - 2 * k3)); }
  const x = sec.hw * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), e) * taper;
  out[0] = x; out[1] = y; out[2] = sec.z;
  out[3] = t;
  return out;
}

function buildSections(spec) {
  const rows = spec.rows;
  const us = rows.map((r) => r[0]);
  const fy0 = monoSpline(us, rows.map((r) => r[1]));
  const fy1 = monoSpline(us, rows.map((r) => r[2]));
  const fhw = monoSpline(us, rows.map((r) => r[3]));
  const fbe = linSample(us, rows.map((r) => r[4]));
  const ftw = linSample(us, rows.map((r) => r[5]));
  const fgl = linSample(us, rows.map((r) => r[6]));
  // section u list: every control row, every pillar boundary, subdivided so no gap exceeds 0.035
  const key = new Set([0, 1]);
  for (const u of us) key.add(+u.toFixed(4));
  for (const p of spec.lod ? [] : (spec.pillars || [])) {
    key.add(+Math.max(0, p - spec.pw).toFixed(4));
    key.add(+Math.min(1, p + spec.pw).toFixed(4));
  }
  const base = [...key].sort((a, b) => a - b);
  const list = [];
  for (let i = 0; i < base.length - 1; i++) {
    const a = base[i], b = base[i + 1];
    list.push(a);
    const n = spec.lod ? 1 : Math.ceil((b - a) / 0.042);
    for (let k = 1; k < n; k++) list.push(a + (b - a) * (k / n));
  }
  list.push(1);
  const e = spec.round || 0.42;
  return list.map((u) => ({
    u, e, z: -spec.L * 0.5 + u * spec.L,
    y0: fy0(u), y1: Math.max(fy0(u) + 0.06, fy1(u)), hw: fhw(u) * spec.HW,
    belt: fbe(u), topW: ftw(u), glass: fgl(u),
  }));
}

function isPillar(spec, u) {
  for (const p of spec.pillars || []) if (Math.abs(u - p) < spec.pw) return true;
  return false;
}

function addBody(acc, spec) {
  spec.archZ = spec.twinRear ? [-spec.wheelZ, spec.wheelZ] : [-spec.wheelZ, spec.wheelZ];
  const secs = buildSections(spec);
  const M = spec.ring;
  const NS = secs.length;
  const P = new Float64Array(NS * M * 3);
  const T = new Float64Array(NS * M); // height fraction
  const tmp = [0, 0, 0, 0];
  for (let i = 0; i < NS; i++) {
    for (let k = 0; k < M; k++) {
      ringPoint(secs[i], k, M, tmp);
      const o = (i * M + k) * 3;
      P[o] = tmp[0]; P[o + 1] = tmp[1]; P[o + 2] = tmp[2];
      T[i * M + k] = tmp[3];
    }
  }
  // smooth grid normals
  const N = new Float64Array(NS * M * 3);
  for (let i = 0; i < NS; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(NS - 1, i + 1);
    for (let k = 0; k < M; k++) {
      const k0 = (k - 1 + M) % M, k1 = (k + 1) % M;
      const a = ((i1 * M + k) * 3), b = ((i0 * M + k) * 3);
      const c = ((i * M + k1) * 3), d = ((i * M + k0) * 3);
      const ux = P[a] - P[b], uy = P[a + 1] - P[b + 1], uz = P[a + 2] - P[b + 2];
      const vx = P[c] - P[d], vy = P[c + 1] - P[d + 1], vz = P[c + 2] - P[d + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const o = (i * M + k) * 3;
      // orient outward from the section axis
      const cy = (secs[i].y0 + secs[i].y1) * 0.5;
      if (nx * P[o] + ny * (P[o + 1] - cy) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1;
      N[o] = nx / l; N[o + 1] = ny / l; N[o + 2] = nz / l;
    }
  }
  const p0 = [0, 0, 0], p1 = [0, 0, 0], p2 = [0, 0, 0], p3 = [0, 0, 0];
  const n0 = [0, 0, 0], n1 = [0, 0, 0], n2 = [0, 0, 0], n3 = [0, 0, 0];
  const rd = (arr, idx, out) => { out[0] = arr[idx]; out[1] = arr[idx + 1]; out[2] = arr[idx + 2]; };
  for (let i = 0; i < NS - 1; i++) {
    const sa = secs[i], sb = secs[i + 1];
    const um = (sa.u + sb.u) * 0.5;
    const glassSec = sa.glass > 0.5 && sb.glass > 0.5 && !isPillar(spec, um);
    for (let k = 0; k < M; k++) {
      const k1i = (k + 1) % M;
      const ia = (i * M + k) * 3, ib = (i * M + k1i) * 3;
      const ja = ((i + 1) * M + k) * 3, jb = ((i + 1) * M + k1i) * 3;
      rd(P, ia, p0); rd(N, ia, n0);
      rd(P, ja, p1); rd(N, ja, n1);
      rd(P, jb, p2); rd(N, jb, n2);
      rd(P, ib, p3); rd(N, ib, n3);
      const tmid = (T[i * M + k] + T[i * M + k1i] + T[(i + 1) * M + k] + T[(i + 1) * M + k1i]) * 0.25;
      const beltM = (sa.belt + sb.belt) * 0.5;
      const nyAvg = (n0[1] + n1[1] + n2[1] + n3[1]) * 0.25;
      const zm = (sa.z + sb.z) * 0.5;
      const arch = spec.archZ ? spec.archZ.some((wz) => Math.abs(zm - wz) < spec.wheelR * 1.15) : false;
      let m = MAT.PAINT;
      if (tmid < 0.10) m = MAT.DARK;
      else if (arch && tmid < 0.30) m = MAT.DARK;
      else if (tmid < 0.20) m = MAT.PAINT;
      else if (glassSec && Math.abs(tmid - beltM) < 0.018 && nyAvg < 0.72) m = MAT.PAINT;
      else if (glassSec && tmid > beltM + 0.035 && (nyAvg < 0.60 || Math.abs(n0[2]+n1[2]+n2[2]+n3[2])>1.8)) m = MAT.GLASS;
      else if (spec.panelFrom !== undefined && um > spec.panelFrom && tmid > 0.24) m = MAT.PANEL;
      else if (spec.bedFrom !== undefined && um > spec.bedFrom && nyAvg > 0.72) m = MAT.DARK;
      if (!(arch && tmid < .39 && Math.abs(n0[0])>.45)) acc.quad(p0, n0, p1, n1, p2, n2, p3, n3, m, null);
    }
  }
  // caps
  for (const end of [0, NS - 1]) {
    const s = secs[end];
    const sign = end === 0 ? -1 : 1;
    const cy = (s.y0 + s.y1) * 0.5;
    const cn = [0, 0, sign];
    const cp = [0, cy, s.z];
    for (let k = 0; k < M; k++) {
      const k1i = (k + 1) % M;
      const ia = (end * M + k) * 3, ib = (end * M + k1i) * 3;
      rd(P, ia, p0); rd(P, ib, p1);
      const tm = (T[end * M + k] + T[end * M + k1i]) * 0.5;
      const m = spec.panelFrom!==undefined&&s.u>spec.panelFrom?MAT.PANEL:MAT.PAINT;
      acc.tri(cp, cn, p0, cn, p1, cn, m, null);
    }
  }
  return secs;
}

function addLensQuad(acc, cx, cy, cz, w, h, zn, m) {
  const n=[0,0,zn],outline=[[-.78,-1],[.78,-1],[1,-.6],[1,.6],[.78,1],[-.78,1],[-1,.6],[-1,-.6]];
  for(let i=0;i<8;i++){const a=outline[i],b=outline[(i+1)%8];acc.tri([cx,cy,cz+zn*.018],n,[cx+a[0]*w,cy+a[1]*h,cz],n,[cx+b[0]*w,cy+b[1]*h,cz],n,m,null);}

}

function addWheel(acc, cx, cy, cz, r, hw, segs, mirror) {
  const w = [cx, cy, cz];
  if(segs<10){
    const side=mirror?-1:1,n=[side,0,0],x=cx+side*hw;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
      for(const [radius,material,offset] of [[r,MAT.TYRE,0],[r*.63,MAT.RIM,.002]]){
        acc.tri([x+side*offset,cy,cz],n,[x+side*offset,cy+Math.cos(a)*radius,cz+Math.sin(a)*radius],n,[x+side*offset,cy+Math.cos(b)*radius,cz+Math.sin(b)*radius],n,material,w);
      }
    }
    return;
  }
  const px = (a, xo) => [cx + xo, cy + Math.cos(a) * r, cz + Math.sin(a) * r];
  const nrm = (a) => [0, Math.cos(a), Math.sin(a)];
  const outX = mirror ? -hw : hw, inX = mirror ? hw : -hw;
  const sx = mirror ? -1 : 1;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    acc.quad(px(a0, inX), nrm(a0), px(a1, inX), nrm(a1), px(a1, outX), nrm(a1), px(a0, outX), nrm(a0), MAT.TYRE, w);
    // outer sidewall annulus
    const rr = r * 0.63;
    const q = (a, rad, xo) => [cx + xo, cy + Math.cos(a) * rad, cz + Math.sin(a) * rad];
    const nx = [sx, 0, 0];
    acc.quad(q(a0, r, outX), nx, q(a1, r, outX), nx, q(a1, rr, outX), nx, q(a0, rr, outX), nx, MAT.TYRE, w);
    // rim
    acc.tri([cx + outX * 1.02, cy, cz], nx, q(a0, rr, outX * 1.02), nx, q(a1, rr, outX * 1.02), nx, (i%2===0?MAT.RIM:MAT.DARK), w);
    // inner face (mostly hidden)
    acc.tri([cx + inX, cy, cz], [-sx, 0, 0], q(a0, r, inX), [-sx, 0, 0], q(a1, r, inX), [-sx, 0, 0], MAT.DARK, w);
  }
}

function addBox(acc, cx, cy, cz, hx, hy, hz, m) {
  const V = [
    [cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz],
  ];
  const F = [[0, 1, 2, 3, [0, 0, -1]], [5, 4, 7, 6, [0, 0, 1]], [4, 0, 3, 7, [-1, 0, 0]], [1, 5, 6, 2, [1, 0, 0]],
    [3, 2, 6, 7, [0, 1, 0]], [4, 5, 1, 0, [0, -1, 0]]];
  for (const [a, b, c, d, n] of F) acc.quad(V[a], n, V[b], n, V[c], n, V[d], n, m, null);
}

/** Full vehicle body geometry (body + wheels + lamps + extras) for a kind. */
export function buildVehicleGeometry(kind, lod=0) {
  if(kind==='semi')return buildSemi(lod);
  if(kind==='box_truck')return buildBoxTruck(lod);
  const original=SPECS[kind];
  const spec=lod===1?{...original,lod:1,ring:6,rows:original.rows.filter((r,i,a)=>i===0||i===a.length-1||i%2===0)}:original;
  const acc = new Acc();
  if(lod===2){
    addBox(acc,0,.48,0,spec.HW,.35,spec.L/2,MAT.PAINT);
    addBox(acc,0,spec.H*.65,0,spec.HW*.84,spec.H*.30,spec.L*.26,MAT.GLASS);
    addBox(acc,0,.5,-spec.L/2-.01,spec.HW*.76,.10,.005,MAT.HEAD);

    return {geometry:acc.toGeometry(),spec,lamps:{},tris:acc.tris};
  }
  const secs = addBody(acc, spec);
  if(['sedan','taxi','police'].includes(kind)){
    // The rear windscreen follows the descending roof, leaving painted C-pillars.
    const section=u=>secs.reduce((a,b)=>Math.abs(b.u-u)<Math.abs(a.u-u)?b:a);
    const a=section(.735),b=section(.825),ax=a.hw*a.topW*.86,bx=b.hw*b.topW*.86;
    const dy=b.y1-a.y1,dz=b.z-a.z,l=Math.hypot(dy,dz),n=[0,dz/l,-dy/l];
    acc.quad([-ax,a.y1+.009,a.z],n,[ax,a.y1+.009,a.z],n,[bx,b.y1+.009,b.z],n,[-bx,b.y1+.009,b.z],n,MAT.GLASS,null);
  }
  // lamps derived from the end sections
  const f = secs[0], b = secs[secs.length - 1];
  const hf = f.y1 - f.y0, hb = b.y1 - b.y0;
  const lensY = f.y0 + hf * (kind === 'box_truck' || kind === 'bus' ? 0.30 : 0.55);
  const lensX = f.hw * 0.62, lensW = f.hw * 0.26, lensH = Math.min(0.13, hf * 0.20);
  addLensQuad(acc, lensX, lensY, f.z - 0.018, lensW, lensH, -1, MAT.HEAD);
  addLensQuad(acc, -lensX, lensY, f.z - 0.018, lensW, lensH, -1, MAT.HEAD);
  const tailY = b.y0 + hb * (kind === 'box_truck' || kind === 'bus' || kind === 'van' ? 0.22 : 0.55);
  const tailX = b.hw * 0.66, tailW = b.hw * 0.22, tailH = Math.min(0.10, hb * 0.15);
  addLensQuad(acc, tailX, tailY, b.z + 0.018, tailW, tailH, 1, MAT.TAIL);
  addLensQuad(acc, -tailX, tailY, b.z + 0.018, tailW, tailH, 1, MAT.TAIL);
  const lamps = {
    hx: lensX, hy: lensY, hz: f.z - 0.02,
    tx: tailX, ty: tailY, tz: b.z + 0.02,
  };
  // wheels
  const s = spec;
  const wx = s.HW * s.wheelXf;
  const ws=lod?5:kind==='motorbike'?36:12;
  addWheel(acc, wx, s.wheelR, -s.wheelZ, s.wheelR, s.wheelW, ws, false);
  if(kind!=='motorbike') addWheel(acc, -wx, s.wheelR, -s.wheelZ, s.wheelR, s.wheelW, ws, true);
  if (s.twinRear) {
    addWheel(acc, wx, s.wheelR, s.wheelZ - s.wheelW * 1.2, s.wheelR, s.wheelW, ws, false);
    addWheel(acc, -wx, s.wheelR, s.wheelZ - s.wheelW * 1.2, s.wheelR, s.wheelW, ws, true);
    addWheel(acc, wx, s.wheelR, s.wheelZ + s.wheelW * 1.2, s.wheelR, s.wheelW, ws, false);
    addWheel(acc, -wx, s.wheelR, s.wheelZ + s.wheelW * 1.2, s.wheelR, s.wheelW, ws, true);
  } else {
    addWheel(acc, wx, s.wheelR, s.wheelZ, s.wheelR, s.wheelW, ws, false);
    if(kind!=='motorbike') addWheel(acc, -wx, s.wheelR, s.wheelZ, s.wheelR, s.wheelW, ws, true);
  }
  // Bumpers, grille, plate and door detail are separate surfaces.
  if(!lod){
    addBox(acc,0,lensY-.16,f.z-.028,spec.HW*.45,.085,.025,MAT.DARK);
    addBox(acc,0,tailY-.23,b.z+.025,.23,.065,.018,MAT.PLATE);
    addBox(acc,0,lensY-.29,f.z,.7*spec.HW,.035,.055,kind==='motorbike'?MAT.DARK:MAT.TRIM);
    for(const sign of [-1,1]){
      addBox(acc,sign*(spec.HW+.04),spec.H*.65,-spec.L*.14,.105,.065,.11,kind==='motorbike'?MAT.DARK:MAT.TRIM);
      addBox(acc,sign*(spec.HW+.003),spec.H*.49,spec.L*.045,.012,.045,.11,MAT.RIM);
      addBox(acc,sign*(spec.HW*.99),spec.H*.38,spec.L*.13,.009,spec.H*.18,.009,MAT.DARK);
    }
  }
  if(kind==='motorbike'){
    addBox(acc,0,.87,.05,.18,.19,.15,MAT.PAINT);
    addBox(acc,0,1.17,-.07,.12,.13,.12,MAT.DARK);
  }
  if(['hatchback','suv','bus'].includes(kind)){const cy=kind==='bus'?1.93:kind==='suv'?1.26:1.08,hh=kind==='bus'?.30:.19;addLensQuad(acc,0,cy,spec.L/2+.014,spec.HW*.74,hh,1,MAT.GLASS);}
  if(kind==='van'){
    for(const side of [-1,1])addBox(acc,side*spec.HW*.80,.95,spec.L/2+.02,.065,.30,.02,MAT.TAIL);
    if(!lod){
      // Rear split doors, high stop lamp and step bumper give the panel van a commercial read
      // without changing its authoritative body, footprint or any farther LOD.
      addBox(acc,0,1.35,spec.L/2+.027,.014,.72,.014,MAT.DARK);
      addBox(acc,0,1.94,spec.L/2+.030,.30,.045,.016,MAT.TAIL);
      addBox(acc,0,.43,spec.L/2+.035,.72,.075,.045,MAT.TRIM);
      for(const side of [-1,1]){
        addBox(acc,side*(spec.HW+.008),1.63,.68,.012,.025,1.20,MAT.DARK);
        addBox(acc,side*(spec.HW+.012),1.36,1.30,.016,.16,.035,MAT.TRIM);
      }
    }
  }
  if(kind==='police'){
    for(const side of [-1,1]){addBox(acc,side*spec.HW*.997,.78,.1,.009,.20,.65,MAT.WHITE);addBox(acc,side*.27,1.54,0,.25,.07,.12,side<0?MAT.BLUE:MAT.RED);}
    addBox(acc,0,1.48,0,.56,.02,.14,MAT.DARK);
  }
  if(kind==='suv'&&!lod)for(const side of [-1,1])addBox(acc,side*.74,1.76,.20,.025,.025,1.05,MAT.DARK);
  // extras
  if (spec.roofSign) {
    const mid = secs[Math.round(secs.length * 0.55)];
    addBox(acc, 0, mid.y1 + 0.09, mid.z, 0.30, 0.09, 0.13, MAT.SIGN);
  }
  if (kind === 'bus') {
    const mid = secs[Math.round(secs.length * 0.5)];
    addBox(acc, 0, mid.y1 + 0.10, mid.z - 1.4, 0.62, 0.10, 1.3, MAT.PANEL); // roof HVAC
    addBox(acc, 0, f.y1 + 0.44, f.z + 0.30, 0.55, 0.11, 0.06, MAT.SIGN);   // destination blind
  }
  if (kind === 'box_truck') {
    const cab = secs[Math.round(secs.length * 0.22)];
    addBox(acc, 0, cab.y1 + 0.10, cab.z, 0.72, 0.10, 0.30, MAT.PAINT);      // cab deflector
    addBox(acc, spec.HW * 0.86, 1.05, -spec.L * 0.5 + 1.25, 0.06, 0.36, 0.06, MAT.TRIM);
    addBox(acc, -spec.HW * 0.86, 1.05, -spec.L * 0.5 + 1.25, 0.06, 0.36, 0.06, MAT.TRIM);
  }
  return { geometry: acc.toGeometry(), spec, lamps, tris: acc.tris };
}

// A rigid delivery truck needs a visible break between cab and cargo box. Running it through the
// passenger-vehicle loft made the whole eight-metre body read as one swollen van at street level.
// Keep the authoritative footprint and axle positions, but author the two real volumes separately.
function buildBoxTruck(lod){
  const spec=SPECS.box_truck,a=new Acc();
  if(lod===2){
    addBox(a,0,.72,-2.65,1.20,.52,1.55,MAT.PAINT);
    addBox(a,0,1.86,-2.65,1.16,.82,1.48,MAT.GLASS);
    addBox(a,0,2.06,1.55,1.26,1.24,2.65,MAT.PANEL);
    return{geometry:a.toGeometry(),spec,lamps:{},tris:a.tris};
  }
  const cab={...spec,L:3.10,H:2.88,ring:lod?6:12,lod,round:.22,pillars:[.34,.72],pw:.018,panelFrom:undefined,rows:[
    [0,.48,1.30,.92,1,1,0],[.06,.44,1.58,1,1,1,0],[.16,.44,2.22,1,.72,.96,1],
    [.30,.44,2.72,1,.58,.92,1],[.66,.44,2.88,1,.56,.92,1],[.79,.44,2.82,1,.62,.94,1],
    [.88,.48,2.48,1,1,1,0],[1,.56,2.38,.98,1,1,0],
  ]};
  const start=a.pos.length;addBody(a,cab);for(let i=start+2;i<a.pos.length;i+=3)a.pos[i]-=2.65;
  addBox(a,0,2.02,1.55,1.26,1.28,2.65,MAT.PANEL);
  addBox(a,0,.69,.55,1.08,.16,3.62,MAT.DARK);
  const ws=lod?5:12;
  for(const z of [-2.95,2.82,3.18])for(const side of [-1,1])addWheel(a,side*spec.HW*.91,spec.wheelR,z,spec.wheelR,spec.wheelW,ws,side<0);
  const frontZ=-4.20,lensY=.92,lensX=.80;
  for(const side of [-1,1])addLensQuad(a,side*lensX,lensY,frontZ-.02,.25,.14,-1,MAT.HEAD);
  for(const side of [-1,1])addLensQuad(a,side*.88,.88,4.22,.22,.12,1,MAT.TAIL);
  addBox(a,0,.70,frontZ-.025,.66,.18,.025,MAT.DARK);
  addBox(a,0,.48,frontZ-.04,.24,.07,.02,MAT.PLATE);
  addBox(a,0,2.62,-1.02,.76,.10,.24,MAT.PAINT);
  if(!lod){
    for(const side of [-1,1]){
      addBox(a,side*1.31,2.15,-3.18,.11,.20,.08,MAT.DARK);
      addBox(a,side*1.265,1.55,1.55,.012,.035,2.55,MAT.WHITE);
      addBox(a,side*.72,2.02,4.215,.025,1.17,.025,MAT.TRIM);
    }
    addBox(a,0,2.02,4.22,.012,1.18,.018,MAT.PANEL);
    addBox(a,0,.60,4.24,.24,.07,.02,MAT.PLATE);
  }
  return{geometry:a.toGeometry(),spec,lamps:{hx:lensX,hy:lensY,hz:frontZ-.03,tx:.88,ty:.88,tz:4.23},tris:a.tris};
}

// Tractor and trailer share an instance draw, with aJoint selecting a fifth-wheel transform.
function buildSemi(lod){
  const spec=SPECS.semi,a=new Acc();
  if(lod===2){addBox(a,0,1.65,-7.65,1.25,1.55,1.65,MAT.PAINT);a.joint=1;addBox(a,0,2.6,2.2,1.275,1.4,6.8,MAT.PANEL);return{geometry:a.toGeometry(),spec,lamps:{},tris:a.tris};}
  const cab={...SPECS.box_truck,L:3.2,HW:1.25,H:3.15,ring:lod?6:12,lod,round:.20,wheelZ:1.05,pillars:[.3,.74],pw:.02,panelFrom:undefined,rows:[[0,.52,1.6,.94,1,1,0],[.07,.45,1.9,1,1,1,0],[.17,.45,2.7,1,.65,.96,1],[.31,.45,3.1,1,.55,.94,1],[.70,.45,3.15,1,.55,.94,1],[.8,.45,3.15,1,1,1,0],[1,.45,3.1,.98,1,1,0]]};
  addBody(a,cab);for(let i=2;i<a.pos.length;i+=3)a.pos[i]-=7.7;
  addBox(a,0,.72,-6.2,1,.22,3.1,MAT.DARK);addBox(a,0,1.14,-4,1.02,.08,.55,MAT.TRIM);
  for(const z of [-8.3,-4.65,-3.45])for(const side of [-1,1])addWheel(a,side*1.12,.505,z,.505,.16,lod?4:10,side<0);
  for(const side of [-1,1]){addLensQuad(a,side*.84,.93,-9.32,.28,.15,-1,MAT.HEAD);if(!lod)addBox(a,side*1.32,2.24,-8.66,.12,.24,.08,MAT.DARK);}
  addBox(a,0,1.16,-9.32,.65,.20,.022,MAT.DARK);addBox(a,0,.60,-9.33,.24,.07,.02,MAT.PLATE);
  a.joint=1;
  const trailer={...cab,L:13.6,HW:1.275,H:4,ring:lod?4:8,pillars:[],panelFrom:0,wheelZ:5.1,rows:[[0,1.2,3.92,.98,1,1,0],[.015,1.2,4,1,1,1,0],[.985,1.2,4,1,1,1,0],[1,1.2,3.92,.98,1,1,0]]};
  const begin=a.pos.length;addBody(a,trailer);for(let i=begin+2;i<a.pos.length;i+=3)a.pos[i]+=2.2;
  for(const z of [5.75,6.9,8.05])for(const side of [-1,1])addWheel(a,side*1.12,.505,z,.505,.16,lod?3:12,side<0);
  addBox(a,0,.86,2.2,1,.14,6.8,MAT.DARK);
  if(!lod){
    for(const side of [-1,1])addBox(a,side*1.28,1.32,2.2,.012,.045,6.7,MAT.WHITE);
    addBox(a,0,2.6,9.015,.012,1.35,.016,MAT.TRIM);
    for(const side of [-1,1])addBox(a,side*.63,2.6,9.035,.025,1.2,.025,MAT.TRIM);
    // Trailer door rails, hinges and underride bar remain close-LOD details only.
    for(const y of [1.22,2.58,3.72])addBox(a,0,y,9.043,1.10,.025,.018,MAT.TRIM);
    for(const side of [-1,1])for(const y of [1.55,3.20])addBox(a,side*.68,y,9.057,.10,.055,.025,MAT.DARK);
    addBox(a,0,.43,9.08,1.03,.09,.06,MAT.DARK);
    for(const side of [-1,1])addBox(a,side*1.10,.62,9.065,.10,.08,.035,MAT.TAIL);
  }
  for(const side of [-1,1])addLensQuad(a,side*.94,.91,9.03,.23,.12,1,MAT.TAIL);
  addBox(a,0,.65,9.05,.24,.07,.02,MAT.PLATE);
  return{geometry:a.toGeometry(),spec,lamps:{},tris:a.tris};
}

// ---------------------------------------------------------------- headlight / tail glow rig
export function buildLightRig(kind, lamps, spec) {
  const pos = [], uv = [], lamp = [], centre = [];
  let cc = [0, 0, 0];
  const push = (p, u, l) => { pos.push(p[0], p[1], p[2]); uv.push(u[0], u[1]); lamp.push(l); centre.push(cc[0], cc[1], cc[2]); };
  const quad = (a, b, c, d, l) => {
    push(a, [0, 0], l); push(b, [1, 0], l); push(c, [1, 1], l);
    push(a, [0, 0], l); push(c, [1, 1], l); push(d, [0, 1], l);
  };
  // ground cones in front of each headlight
  const coneLen = kind === 'box_truck' || kind === 'bus' ? 20 : 16;
  const y = 0.045;
  for (const sx of [1, -1]) {
    const x0 = sx * lamps.hx, z0 = lamps.hz - 0.4;
    const w0 = 0.42, w1 = 2.3;
    quad([x0 - w0, y, z0], [x0 + w0, y, z0], [x0 + w1, y, z0 - coneLen], [x0 - w1, y, z0 - coneLen], LAMP.CONE);
  }
  // cross-quad glows on the lamps themselves
  const glow = (cx, cy, cz, r, l) => {
    cc = [cx, cy, cz];
    quad([cx - r, cy - r, cz], [cx + r, cy - r, cz], [cx + r, cy + r, cz], [cx - r, cy + r, cz], l);
    quad([cx - r, cy, cz - r], [cx + r, cy, cz - r], [cx + r, cy, cz + r], [cx - r, cy, cz + r], l);
    cc = [0, 0, 0];
  };
  const gr = Math.max(0.34, spec.HW * 0.42);
  glow(lamps.hx, lamps.hy, lamps.hz - 0.03, gr, LAMP.HEAD);
  glow(-lamps.hx, lamps.hy, lamps.hz - 0.03, gr, LAMP.HEAD);
  glow(lamps.tx, lamps.ty, lamps.tz + 0.03, gr * 0.92, LAMP.TAIL);
  glow(-lamps.tx, lamps.ty, lamps.tz + 0.03, gr * 0.92, LAMP.TAIL);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aLamp', new THREE.Float32BufferAttribute(lamp, 1));
  g.setAttribute('aCentre', new THREE.Float32BufferAttribute(centre, 3));
  g.computeBoundingSphere();
  return g;
}

/** Flat contact-shadow / ambient-occlusion decal that sits just under a vehicle. */
export function buildContactShadow(spec) {
  const hx = spec.HW + 0.80, hz = spec.L * 0.5 + 0.95, y = 0.012;
  return quadDecal(hx, hz, y, spec.HW / hx, (spec.L * 0.5) / hz);
}

function quadDecal(hx, hz, y, cx, cz) {
  const pos = [-hx, y, -hz, hx, y, -hz, hx, y, hz, -hx, y, -hz, hx, y, hz, -hx, y, hz];
  const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
  const half = [];
  const core = [];
  for (let i = 0; i < 6; i++) { half.push(hx, hz); core.push(cx, cz); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aHalf', new THREE.Float32BufferAttribute(half, 2));
  g.setAttribute('aCore', new THREE.Float32BufferAttribute(core, 2));
  g.computeBoundingSphere();
  return g;
}

/** Small elliptical contact shadow for a pedestrian. */
export function buildPedShadow() {
  return quadDecal(0.62, 0.62, 0.09, 0.30, 0.30);
}

// ---------------------------------------------------------------- pedestrian
export const PMAT = { SHIRT: 0, PANTS: 1, SKIN: 2, HAIR: 3, SHOE: 4 };
export const LIMB = { BODY: 0, LEG_L: 1, LEG_R: 2, ARM_L: 3, ARM_R: 4 };

function tube(acc2, x0, y0, z0, x1, y1, z1, r0, r1, segs, m, limb, pivot) {
  const dy = y1 - y0;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const P = (a, x, y, z, r) => [x + Math.cos(a) * r, y, z + Math.sin(a) * r * 0.72];
    const N = (a) => { const l = Math.hypot(Math.cos(a), Math.sin(a) / 0.72) || 1; return [Math.cos(a) / l, 0.12, Math.sin(a) / 0.72 / l]; };
    acc2.quad(P(a0, x0, y0, z0, r0), N(a0), P(a1, x0, y0, z0, r0), N(a1), P(a1, x1, y1, z1, r1), N(a1), P(a0, x1, y1, z1, r1), N(a0), m, limb, pivot);
    // caps
    acc2.tri([x1, y1, z1], [0, dy > 0 ? 1 : -1, 0], P(a0, x1, y1, z1, r1), [0, dy > 0 ? 1 : -1, 0], P(a1, x1, y1, z1, r1), [0, dy > 0 ? 1 : -1, 0], m, limb, pivot);
  }
}

class PAcc {
  constructor() { this.pos = []; this.nor = []; this.mat = []; this.limb = []; this.piv = []; }
  get tris() { return this.pos.length / 9; }
  vert(p, n, m, limb, piv) {
    this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]);
    this.mat.push(m); this.limb.push(limb); this.piv.push(piv[0], piv[1], piv[2]);
  }
  tri(p0, n0, p1, n1, p2, n2, m, limb, piv) {
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
    const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    if (fx * n0[0] + fy * n0[1] + fz * n0[2] < 0) { this.vert(p0, n0, m, limb, piv); this.vert(p2, n2, m, limb, piv); this.vert(p1, n1, m, limb, piv); }
    else { this.vert(p0, n0, m, limb, piv); this.vert(p1, n1, m, limb, piv); this.vert(p2, n2, m, limb, piv); }
  }
  quad(p0, n0, p1, n1, p2, n2, p3, n3, m, limb, piv) {
    this.tri(p0, n0, p1, n1, p2, n2, m, limb, piv);
    this.tri(p0, n0, p2, n2, p3, n3, m, limb, piv);
  }
}

export function buildPedestrianGeometry(lod=0) {
  const a = new PAcc();
  const O = [0, 0, 0];
  const hip = [0, 0.86, 0], sho = [0, 1.42, 0];
  // legs (pivot at hip)
  for (const [sx, limb] of [[1, LIMB.LEG_R], [-1, LIMB.LEG_L]]) {
    tube(a, sx * 0.11, 0.86, 0, sx * 0.10, 0.44, 0, 0.085, 0.062, (lod?2:5), PMAT.PANTS, limb, hip);
    tube(a, sx * 0.10, 0.44, 0, sx * 0.10, 0.075, 0, 0.062, 0.052, (lod?2:5), PMAT.PANTS, limb, hip);
    // shoe
    a.quad([sx * 0.10 - 0.055, 0.0, -0.13], [0, 1, 0], [sx * 0.10 + 0.055, 0.0, -0.13], [0, 1, 0],
      [sx * 0.10 + 0.055, 0.075, 0.06], [0, 1, 0], [sx * 0.10 - 0.055, 0.075, 0.06], [0, 1, 0], PMAT.SHOE, limb, hip);
  }
  // torso
  tube(a, 0, 0.84, 0, 0, 1.10, 0, 0.165, 0.185, (lod?2:6), PMAT.SHIRT, LIMB.BODY, O);
  tube(a, 0, 1.10, 0, 0, 1.44, 0, 0.185, 0.175, (lod?2:6), PMAT.SHIRT, LIMB.BODY, O);
  // arms (pivot at shoulder)
  for (const [sx, limb] of [[1, LIMB.ARM_R], [-1, LIMB.ARM_L]]) {
    tube(a, sx * 0.195, 1.40, 0, sx * 0.215, 1.02, 0, 0.058, 0.048, (lod?2:5), PMAT.SHIRT, limb, sho);
    tube(a, sx * 0.215, 1.02, 0, sx * 0.225, 0.80, 0, 0.048, 0.045, (lod?2:5), PMAT.SKIN, limb, sho);
  }
  // neck + head
  if(!lod)tube(a, 0, 1.42, 0, 0, 1.52, 0, 0.055, 0.062, (lod?2:5), PMAT.SKIN, LIMB.BODY, O);
  const hr = 0.108, hy = 1.62;
  const rings = lod?1:4, segs = lod?3:6;
  for (let i = 0; i < rings; i++) {
    const t0 = i / rings, t1 = (i + 1) / rings;
    const th0 = t0 * Math.PI, th1 = t1 * Math.PI;
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI * 2, a1 = ((k + 1) / segs) * Math.PI * 2;
      const pt = (th, an) => [Math.sin(th) * Math.cos(an) * hr, hy + Math.cos(th) * hr * 1.16, Math.sin(th) * Math.sin(an) * hr * 0.92];
      const nn = (th, an) => [Math.sin(th) * Math.cos(an), Math.cos(th), Math.sin(th) * Math.sin(an)];
      const m = (th0 < Math.PI * 0.42) ? PMAT.HAIR : PMAT.SKIN;
      a.quad(pt(th0, a0), nn(th0, a0), pt(th0, a1), nn(th0, a1), pt(th1, a1), nn(th1, a1), pt(th1, a0), nn(th1, a0), m, LIMB.BODY, O);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute('aMat', new THREE.Float32BufferAttribute(a.mat, 1));
  g.setAttribute('aLimb', new THREE.Float32BufferAttribute(a.limb, 1));
  g.setAttribute('aPivot', new THREE.Float32BufferAttribute(a.piv, 3));
  g.computeBoundingSphere();
  return { geometry: g, tris: a.tris };
}
