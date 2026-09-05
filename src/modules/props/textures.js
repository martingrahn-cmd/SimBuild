// Procedural CC0-by-construction textures for props: leaf/needle atlas, bark atlas + normal,
// tree impostor atlas, glow sprites, light-pool decal, sign faces and the tiny material LUTs
// (roughness/metalness/emissive) that let every piece of street furniture share one material.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(c, { srgb = false, aniso = 8, mips = true, clamp = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- leaf atlas
// 4 columns x 2 rows of 256 px cells (1024 x 512):
//  (0,0) oak A   (1,0) oak B   (2,0) birch   (3,0) bush
//  (0,1) pine A  (1,1) pine B  (2,1) maple   (3,1) flowers
export const LEAF_CELL = { oakA: [0, 0], oakB: [1, 0], birch: [2, 0], bush: [3, 0], pineA: [0, 1], pineB: [1, 1], maple: [2, 1], flower: [3, 1] };
export const LEAF_COLS = 4, LEAF_ROWS = 2;

function hsl(h, s, l) { return `hsl(${h.toFixed(0)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%)`; }

/** One broadleaf: pointed ovate blade with a midrib, drawn around (0,0) pointing +y. */
function broadleaf(g, len, wide, col, dark, lobes) {
  g.beginPath();
  g.moveTo(0, 0);
  if (lobes) {
    // lobed (oak-ish) outline
    const n = 4;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const w0 = wide * Math.sin(Math.PI * (0.15 + 0.85 * t0)) * (i % 2 ? 0.62 : 1);
        const w1 = wide * Math.sin(Math.PI * (0.15 + 0.85 * t1)) * ((i + 1) % 2 ? 0.62 : 1);
        if (s > 0) g.quadraticCurveTo(w0 * s, len * (t0 + 0.12), w1 * s, len * t1);
        else g.quadraticCurveTo(w1 * s, len * (1 - t0 - 0.12) * 1, w0 * s, len * (1 - t1));
      }
      if (s > 0) g.lineTo(0, len);
    }
  } else {
    g.quadraticCurveTo(wide, len * 0.32, 0, len);
    g.quadraticCurveTo(-wide, len * 0.32, 0, 0);
  }
  g.closePath();
  g.fillStyle = col; g.fill();
  g.strokeStyle = dark; g.lineWidth = Math.max(0.6, len * 0.035);
  g.beginPath(); g.moveTo(0, len * 0.04); g.lineTo(0, len * 0.94); g.stroke();
}

function drawBroadCluster(g, x0, y0, S, rnd, opt) {
  const { hue = 96, sat = 0.42, light = 0.34, n = 110, lobes = true, spread = 0.44, size = 0.135, droop = 0 } = opt;
  g.save();
  g.translate(x0 + S * 0.5, y0 + S * 0.5);
  // pass 0 is a darker, slightly larger backing so the cluster reads as a lit volume, not confetti
  for (let pass = 0; pass < 2; pass++) {
    const count = pass === 0 ? Math.round(n * 0.5) : n;
    for (let i = 0; i < count; i++) {
      const a = rnd() * TAU;
      const r = Math.pow(rnd(), 0.58) * S * spread;
      const len = S * size * (0.60 + rnd() * 0.8);
      const wide = len * (0.32 + rnd() * 0.18);
      g.save();
      g.translate(Math.cos(a) * r, Math.sin(a) * r * 0.94 + droop * S * 0.05);
      g.rotate(a + Math.PI * 0.5 + (rnd() - 0.5) * 1.9);
      // vertical light gradient inside the cluster: tops bright, undersides deep
      const vy = 0.5 - Math.sin(a) * (r / (S * spread)) * 0.5;
      const l = pass === 0 ? light * 0.55 : light * (0.60 + vy * 0.75 + rnd() * 0.42);
      const h = hue + (rnd() - 0.5) * 24;
      const sa = sat * (0.78 + rnd() * 0.5);
      broadleaf(g, len * (pass === 0 ? 1.18 : 1), wide * (pass === 0 ? 1.18 : 1), hsl(h, sa, Math.min(0.60, l)), hsl(h - 10, sa * 0.9, Math.max(0.05, l * 0.55)), lobes);
      g.restore();
    }
  }
  // soft interior occlusion, keeping the existing alpha shape
  g.globalCompositeOperation = 'source-atop';
  const grd = g.createRadialGradient(0, S * 0.08, S * 0.02, 0, S * 0.06, S * 0.52);
  grd.addColorStop(0, 'rgba(0,0,0,0.42)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.20)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(-S * 0.5, -S * 0.5, S, S);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}

function drawNeedleSpray(g, x0, y0, S, rnd, opt) {
  const { hue = 130, sat = 0.34, light = 0.27, sprays = 11 } = opt;
  g.save();
  g.translate(x0 + S * 0.5, y0 + S * 0.5);
  for (let s = 0; s < sprays; s++) {
    const ang = -Math.PI * 0.5 + ((s + 0.5) / sprays - 0.5) * 2.5 + (rnd() - 0.5) * 0.30;
    const len = S * (0.24 + rnd() * 0.20);
    g.save();
    g.rotate(ang);
    g.translate((rnd() - 0.5) * S * 0.10, (rnd() - 0.5) * S * 0.06);
    // twig
    g.strokeStyle = hsl(26, 0.32, 0.14); g.lineWidth = S * 0.010;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.12, len * 0.5, 0, len); g.stroke();
    const nn = 34;
    for (let i = 0; i < nn; i++) {
      const t = 0.04 + (i / nn) * 0.96;
      const side = rnd() < 0.5 ? 1 : -1;
      const nl = S * 0.105 * (1 - t * 0.30) * (0.55 + rnd() * 0.9);
      const l = light * (0.55 + rnd() * 1.0);
      g.strokeStyle = hsl(hue + (rnd() - 0.5) * 26, sat * (0.7 + rnd() * 0.6), Math.min(0.48, l));
      g.lineWidth = S * (0.006 + rnd() * 0.005);
      g.beginPath();
      const bx = len * t * 0.12, by = len * t;
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + side * nl * 0.5, by + nl * 0.30, bx + side * nl * (0.75 + rnd() * 0.4), by + nl * (0.55 + rnd() * 0.5));
      g.stroke();
    }
    g.restore();
  }
  // interior shading so the spray has depth
  g.globalCompositeOperation = 'source-atop';
  const grd = g.createRadialGradient(0, S * 0.10, S * 0.02, 0, S * 0.06, S * 0.46);
  grd.addColorStop(0, 'rgba(0,0,0,0.38)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(-S * 0.5, -S * 0.5, S, S);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}

function drawFlowers(g, x0, y0, S, rnd) {
  drawBroadCluster(g, x0, y0, S, rnd, { hue: 104, sat: 0.44, light: 0.34, n: 170, lobes: false, spread: 0.40, size: 0.075 });
  g.save(); g.translate(x0 + S * 0.5, y0 + S * 0.5);
  const pal = [[350, 0.62, 0.58], [45, 0.72, 0.60], [280, 0.42, 0.60], [12, 0.68, 0.58]];
  for (let i = 0; i < 22; i++) {
    const a = rnd() * TAU, r = Math.pow(rnd(), 0.6) * S * 0.38;
    const p = pal[(rnd() * pal.length) | 0];
    const rad = S * (0.016 + rnd() * 0.016);
    g.fillStyle = hsl(p[0] + (rnd() - 0.5) * 14, p[1], p[2]);
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const aa = (k / 5) * TAU;
      g.ellipse(Math.cos(a) * r + Math.cos(aa) * rad * 0.9, Math.sin(a) * r + Math.sin(aa) * rad * 0.9, rad, rad, 0, 0, TAU);
    }
    g.fill();
    g.fillStyle = hsl(48, 0.7, 0.62);
    g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, rad * 0.6, 0, TAU); g.fill();
  }
  g.restore();
}

export function makeLeafAtlas(rng, size = 1024) {
  const c = canvas(size, size / 2);
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const S = size / LEAF_COLS;
  const R = () => rng.float();
  const cell = (name) => { const [cx, cy] = LEAF_CELL[name]; return [cx * S, cy * S]; };
  let p;
  p = cell('oakA'); drawBroadCluster(g, p[0], p[1], S, R, { hue: 92, sat: 0.46, light: 0.36, n: 210, lobes: true, spread: 0.43, size: 0.088 });
  p = cell('oakB'); drawBroadCluster(g, p[0], p[1], S, R, { hue: 82, sat: 0.42, light: 0.38, n: 190, lobes: true, spread: 0.44, size: 0.098, droop: 1 });
  p = cell('birch'); drawBroadCluster(g, p[0], p[1], S, R, { hue: 76, sat: 0.48, light: 0.40, n: 240, lobes: false, spread: 0.44, size: 0.070, droop: 1.6 });
  p = cell('bush'); drawBroadCluster(g, p[0], p[1], S, R, { hue: 102, sat: 0.42, light: 0.30, n: 250, lobes: false, spread: 0.45, size: 0.070 });
  p = cell('pineA'); drawNeedleSpray(g, p[0], p[1], S, R, { hue: 118, sat: 0.34, light: 0.31, sprays: 13 });
  p = cell('pineB'); drawNeedleSpray(g, p[0], p[1], S, R, { hue: 108, sat: 0.30, light: 0.34, sprays: 15 });
  p = cell('maple'); drawBroadCluster(g, p[0], p[1], S, R, { hue: 38, sat: 0.56, light: 0.40, n: 200, lobes: true, spread: 0.43, size: 0.092 });
  p = cell('flower'); drawFlowers(g, p[0], p[1], S, R);
  return tex(c, { srgb: true, clamp: true });
}

/** UV rect (offset + scale) for a leaf cell, inset to avoid mip bleeding. */
export function leafUV(name) {
  const [cx, cy] = LEAF_CELL[name];
  const inset = 0.004;
  return { u0: (cx + inset) / LEAF_COLS, v0: 1 - (cy + 1 - inset) / LEAF_ROWS, du: (1 - inset * 2) / LEAF_COLS, dv: (1 - inset * 2) / LEAF_ROWS };
}

// ---------------------------------------------------------------- bark
// 3 columns (oak / pine / birch), each tileable in u and v.
export const BARK_COLS = 3;
export const BARK_COL = { oak: 0, pine: 1, birch: 2 };

function fbmField(rng, w, h, oct, freq) {
  // value noise on a torus so the result tiles in both directions
  const grids = [];
  for (let o = 0; o < oct; o++) {
    const n = Math.max(2, Math.round(freq * Math.pow(2, o)));
    const m = Math.max(2, Math.round((freq * h / w) * Math.pow(2, o)));
    const a = new Float32Array(n * m);
    for (let i = 0; i < a.length; i++) a[i] = rng.float();
    grids.push({ n, m, a });
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    let sum = 0, amp = 1, norm = 0;
    for (const gr of grids) {
      const x = u * gr.n, y = v * gr.m;
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const fx = smooth(x - x0), fy = smooth(y - y0);
      const i0 = ((x0 % gr.n) + gr.n) % gr.n, i1 = (i0 + 1) % gr.n;
      const j0 = ((y0 % gr.m) + gr.m) % gr.m, j1 = (j0 + 1) % gr.m;
      const v00 = gr.a[j0 * gr.n + i0], v10 = gr.a[j0 * gr.n + i1];
      const v01 = gr.a[j1 * gr.n + i0], v11 = gr.a[j1 * gr.n + i1];
      sum += amp * ((v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy);
      norm += amp; amp *= 0.5;
    }
    return sum / norm;
  };
}

/** Returns { map, normalMap } for the 3-column bark atlas. */
export function makeBarkAtlas(rng, cw = 256, ch = 512) {
  const W = cw * BARK_COLS, H = ch;
  const c = canvas(W, H), g = c.getContext('2d');
  const height = new Float32Array(W * H);
  const img = g.createImageData(W, H);

  const specs = [
    // oak: deep vertical furrows, grey-brown
    { fx: 7, fy: 2.2, oct: 4, furrow: 1.35, base: [0.46, 0.39, 0.31], dark: [0.15, 0.12, 0.10], plate: 0 },
    // pine: reddish scaly plates
    { fx: 5, fy: 4.5, oct: 4, furrow: 0.95, base: [0.33, 0.24, 0.18], dark: [0.13, 0.09, 0.07], plate: 1 },
    // birch: near-white with papery bands and dark lenticels
    { fx: 3, fy: 2.0, oct: 3, furrow: 0.35, base: [0.52, 0.50, 0.45], dark: [0.20, 0.19, 0.17], plate: 2 },
  ];
  for (let ci = 0; ci < BARK_COLS; ci++) {
    const s = specs[ci];
    const f1 = fbmField(rng.fork(`bark${ci}a`), cw, ch, s.oct, s.fx);
    const f2 = fbmField(rng.fork(`bark${ci}b`), cw, ch, 3, s.fy);
    const f3 = fbmField(rng.fork(`bark${ci}c`), cw, ch, 2, 14);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < cw; x++) {
        const u = x / cw, v = y / H;
        // vertical furrows: stretch noise strongly along v
        let n = f1(u, v * 0.22);
        n = n * 0.75 + f2(u * 1.7, v * 0.7) * 0.25;
        let h = n;
        if (s.plate === 1) { const pl = f2(u * 2.2, v * 2.4); h = h * 0.55 + (pl > 0.52 ? 0.85 : 0.25) * 0.45; }
        if (s.plate === 2) {
          const band = f2(u * 0.5, v * 1.1);
          h = 0.62 + band * 0.2;
        }
        const detail = f3(u * 3, v * 3);
        h = h * 0.86 + detail * 0.14;
        const furrow = Math.pow(h, s.furrow + 1);
        let r = s.base[0] * (0.45 + furrow * 0.9) + s.dark[0] * (1 - furrow) * 0.8;
        let gg = s.base[1] * (0.45 + furrow * 0.9) + s.dark[1] * (1 - furrow) * 0.8;
        let b = s.base[2] * (0.45 + furrow * 0.9) + s.dark[2] * (1 - furrow) * 0.8;
        if (s.plate === 2) {
          // dark lenticel dashes
          const d = f3(u * 2.0, v * 9.0);
          if (d > 0.70) { const k = Math.min(1, (d - 0.70) * 7); r += (0.10 - r) * k; gg += (0.09 - gg) * k; b += (0.08 - b) * k; h -= k * 0.25; }
        }
        const X = ci * cw + x;
        const i = (y * W + X) * 4;
        img.data[i] = Math.min(255, r * 255); img.data[i + 1] = Math.min(255, gg * 255); img.data[i + 2] = Math.min(255, b * 255); img.data[i + 3] = 255;
        height[y * W + X] = h;
      }
    }
  }
  g.putImageData(img, 0, 0);

  // normal map from the height field (per column, wrapping inside the column)
  const nc = canvas(W, H), ng = nc.getContext('2d');
  const nimg = ng.createImageData(W, H);
  const at = (x, y) => {
    const ci = Math.floor(x / cw);
    const lx = ((x - ci * cw) % cw + cw) % cw;
    const ly = ((y % H) + H) % H;
    return height[ly * W + Math.min(W - 1, ci * cw + lx)];
  };
  const str = 2.6;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (at(x - 1, y) - at(x + 1, y)) * str;
    const ny = (at(x, y - 1) - at(x, y + 1)) * str;
    const len = Math.hypot(nx, ny, 1);
    const i = (y * W + x) * 4;
    nimg.data[i] = (nx / len * 0.5 + 0.5) * 255;
    nimg.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
    nimg.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    nimg.data[i + 3] = 255;
  }
  ng.putImageData(nimg, 0, 0);
  return { map: tex(c, { srgb: true }), normalMap: tex(nc, { srgb: false }) };
}

export function barkUV(species) {
  const ci = BARK_COL[species] ?? 0;
  return { u0: (ci + 0.02) / BARK_COLS, du: 0.96 / BARK_COLS };
}

// ---------------------------------------------------------------- impostors
// 1024 x 512: three 256x512 side views (oak, pine, birch) + a 256x512 column with two
// 256x256 top-down canopies (broadleaf, conifer).
export const IMP = { oak: 0, pine: 1, birch: 2 };

function shadeBlob(g, cx, cy, r, hue, sat, light, rnd, count, lobes, sizeK) {
  for (let i = 0; i < count; i++) {
    const a = rnd() * TAU, rr = Math.pow(rnd(), 0.55) * r;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.86;
    // vertical gradient: top-lit
    const k = 1 - (y - (cy - r)) / (r * 2);
    const l = light * (0.55 + k * 0.85) * (0.8 + rnd() * 0.4);
    const s = r * sizeK * (0.5 + rnd() * 0.7);
    g.save(); g.translate(x, y); g.rotate(rnd() * TAU);
    broadleaf(g, s * 1.6, s * 0.55, hsl(hue + (rnd() - 0.5) * 20, sat, Math.min(0.6, l)), hsl(hue - 10, sat, Math.max(0.05, l * 0.5)), lobes);
    g.restore();
  }
}

export function makeImpostorAtlas(rng, cw = 256, ch = 512) {
  const c = canvas(cw * 4, ch), g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const R = () => rng.float();
  // --- oak side view
  {
    const ox = IMP.oak * cw;
    g.save(); g.translate(ox, 0);
    g.strokeStyle = '#43372c'; g.lineCap = 'round';
    g.lineWidth = cw * 0.048; g.beginPath(); g.moveTo(cw * 0.5, ch * 0.99); g.lineTo(cw * 0.5, ch * 0.66); g.stroke();
    g.lineWidth = cw * 0.026;
    for (const a of [-0.7, 0.6, -0.25, 0.3]) { g.beginPath(); g.moveTo(cw * 0.5, ch * 0.70); g.lineTo(cw * (0.5 + a * 0.38), ch * 0.48); g.stroke(); }
    shadeBlob(g, cw * 0.5, ch * 0.355, cw * 0.47, 92, 0.44, 0.40, R, 520, true, 0.085);
    g.restore();
  }
  // --- pine side view
  {
    const ox = IMP.pine * cw;
    g.save(); g.translate(ox, 0);
    g.strokeStyle = '#3a2d22'; g.lineWidth = cw * 0.034; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cw * 0.5, ch * 0.99); g.lineTo(cw * 0.5, ch * 0.09); g.stroke();
    for (let tier = 0; tier < 14; tier++) {
      const t = tier / 13;
      const y = ch * (0.93 - t * 0.85);
      const rad = cw * 0.47 * Math.pow(1 - t, 0.72) + cw * 0.028;
      const k = 0.35 + t * 0.55;
      for (let i = 0; i < 56; i++) {
        const x = cw * 0.5 + (R() * 2 - 1) * rad;
        const yy = y + (R() - 0.4) * ch * 0.042;
        const l = 0.30 * (0.55 + k * 0.85) * (0.75 + R() * 0.5);
        g.strokeStyle = hsl(132 + (R() - 0.5) * 18, 0.32, Math.min(0.46, l));
        g.lineWidth = cw * 0.016;
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (x > cw * 0.5 ? 1 : -1) * cw * 0.055, yy + cw * 0.042); g.stroke();
      }
    }
    g.restore();
  }
  // --- birch side view
  {
    const ox = IMP.birch * cw;
    g.save(); g.translate(ox, 0);
    g.strokeStyle = '#b9b2a4'; g.lineWidth = cw * 0.026; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cw * 0.48, ch * 0.99); g.lineTo(cw * 0.52, ch * 0.56); g.stroke();
    g.strokeStyle = '#3a352f'; g.lineWidth = cw * 0.007;
    for (let i = 0; i < 10; i++) { const y = ch * (0.62 + R() * 0.35); g.beginPath(); g.moveTo(cw * 0.465, y); g.lineTo(cw * 0.535, y + 2); g.stroke(); }
    shadeBlob(g, cw * 0.5, ch * 0.33, cw * 0.43, 80, 0.45, 0.42, R, 470, false, 0.070);
    g.restore();
  }
  // --- top-down canopies
  {
    const ox = 3 * cw;
    g.save(); g.translate(ox, 0);
    shadeBlob(g, cw * 0.5, cw * 0.5, cw * 0.47, 92, 0.44, 0.40, R, 400, true, 0.095);
    g.translate(0, cw);
    for (let i = 0; i < 420; i++) {
      const a = R() * TAU, rr = Math.pow(R(), 0.5) * cw * 0.47;
      const x = cw * 0.5 + Math.cos(a) * rr, y = cw * 0.5 + Math.sin(a) * rr;
      const l = 0.32 * (1.2 - rr / (cw * 0.55)) * (0.8 + R() * 0.5);
      g.strokeStyle = hsl(132, 0.32, Math.min(0.46, l)); g.lineWidth = cw * 0.016;
      g.beginPath(); g.moveTo(x, y); g.lineTo(cw * 0.5 + Math.cos(a) * (rr - cw * 0.07), cw * 0.5 + Math.sin(a) * (rr - cw * 0.07)); g.stroke();
    }
    g.restore();
  }
  return tex(c, { srgb: true, clamp: true });
}

export function impostorUV(species) {
  const i = IMP[species] ?? 0;
  return { u0: (i + 0.01) / 4, du: 0.98 / 4, v0: 0.005, dv: 0.99 };
}
export function impostorTopUV(conifer) {
  return conifer ? { u0: 3.02 / 4, du: 0.96 / 4, v0: 0.005, dv: 0.49 } : { u0: 3.02 / 4, du: 0.96 / 4, v0: 0.505, dv: 0.49 };
}

// ---------------------------------------------------------------- sprites & decals
/** Soft radial glow used for lamp halos and signal lenses (additive). */
export function makeGlowSprite(size = 128, core = 0.10) {
  const c = canvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - h + 0.5, y - h + 0.5) / h;
    let a = 0;
    if (d < 1) {
      a = Math.pow(Math.max(0, 1 - d), 2.6) * 0.85 + Math.exp(-d * d / (core * core)) * 0.9;
      a = Math.min(1, a);
    }
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, { srgb: false, clamp: true, aniso: 1 });
}

/** Elliptical pool of light cast on the ground by a lamp (additive decal). */
export function makeLightPool(size = 128) {
  const c = canvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - h + 0.5, y - h + 0.5) / h;
    const a = d < 1 ? Math.pow(1 - d, 2.9) * (0.42 + 0.58 * Math.pow(1 - d, 2.2)) : 0;
    const i = (y * size + x) * 4;
    img.data[i] = 255; img.data[i + 1] = 216; img.data[i + 2] = 158;
    img.data[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, { srgb: true, clamp: true, aniso: 2 });
}

// ---------------------------------------------------------------- sign faces
// 2x2 atlas of 256 px faces: stop, speed limit, street name, bus stop.
export const SIGN = { stop: 0, speed: 1, street: 2, bus: 3 };
export function makeSignAtlas(size = 512) {
  const c = canvas(size, size), g = c.getContext('2d');
  const S = size / 2;
  g.clearRect(0, 0, size, size);
  const cell = (i) => [(i % 2) * S, Math.floor(i / 2) * S];
  // stop (octagon)
  {
    const [x, y] = cell(SIGN.stop);
    g.save(); g.translate(x + S / 2, y + S / 2);
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; const r = S * 0.46; if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fillStyle = '#a41d21'; g.fill();
    g.strokeStyle = '#f2f2f0'; g.lineWidth = S * 0.035; g.stroke();
    g.fillStyle = '#f4f4f2'; g.font = `bold ${S * 0.27}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('STOP', 0, S * 0.02);
    g.restore();
  }
  // speed limit (circle)
  {
    const [x, y] = cell(SIGN.speed);
    g.save(); g.translate(x + S / 2, y + S / 2);
    g.beginPath(); g.arc(0, 0, S * 0.44, 0, TAU); g.fillStyle = '#f0efec'; g.fill();
    g.lineWidth = S * 0.085; g.strokeStyle = '#b02128'; g.stroke();
    g.fillStyle = '#1b1b1c'; g.font = `bold ${S * 0.34}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('50', 0, S * 0.02);
    g.restore();
  }
  // street name plate
  {
    const [x, y] = cell(SIGN.street);
    g.save(); g.translate(x, y);
    g.fillStyle = '#1d4c74'; g.fillRect(S * 0.04, S * 0.30, S * 0.92, S * 0.40);
    g.strokeStyle = '#e9eef2'; g.lineWidth = S * 0.018; g.strokeRect(S * 0.075, S * 0.335, S * 0.85, S * 0.33);
    g.fillStyle = '#eef3f7'; g.font = `bold ${S * 0.15}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MAPLE ST', S * 0.5, S * 0.50);
    g.restore();
  }
  // bus stop flag
  {
    const [x, y] = cell(SIGN.bus);
    g.save(); g.translate(x + S / 2, y + S / 2);
    g.beginPath(); g.arc(0, 0, S * 0.42, 0, TAU); g.fillStyle = '#123a63'; g.fill();
    g.lineWidth = S * 0.05; g.strokeStyle = '#eef2f6'; g.stroke();
    g.fillStyle = '#eef2f6';
    g.fillRect(-S * 0.20, -S * 0.16, S * 0.40, S * 0.26);
    g.fillStyle = '#123a63';
    g.fillRect(-S * 0.16, -S * 0.12, S * 0.13, S * 0.10);
    g.fillRect(S * 0.03, -S * 0.12, S * 0.13, S * 0.10);
    g.fillStyle = '#eef2f6';
    g.beginPath(); g.arc(-S * 0.11, S * 0.14, S * 0.045, 0, TAU); g.arc(S * 0.11, S * 0.14, S * 0.045, 0, TAU); g.fill();
    g.restore();
  }
  return tex(c, { srgb: true, clamp: true });
}
export function signUV(name) {
  const i = SIGN[name] ?? 0;
  const cx = i % 2, cy = Math.floor(i / 2);
  return { u0: cx * 0.5 + 0.004, v0: 1 - (cy + 1) * 0.5 + 0.004, du: 0.5 - 0.008, dv: 0.5 - 0.008 };
}

// ---------------------------------------------------------------- material LUTs
// Eight surface slots shared by every piece of street furniture. uv.x selects the slot;
// three reads roughness from .g and metalness from .b, so one 8x1 texture drives both.
export const SLOT = { paintedMetal: 0, steel: 1, plastic: 2, wood: 3, concrete: 4, lamp: 5, rubber: 6, chrome: 7 };
const SLOT_RM = [
  [0.44, 0.72], // painted metal
  [0.30, 0.92], // bare steel
  [0.68, 0.02], // plastic / matte paint
  [0.74, 0.02], // wood
  [0.90, 0.02], // concrete
  [0.16, 0.10], // lamp glass (emissive)
  [0.95, 0.00], // rubber / dirt
  [0.10, 1.00], // chrome
];
export function makeSlotLUTs() {
  const n = SLOT_RM.length;
  const mk = (fill) => {
    const c = canvas(n, 1), g = c.getContext('2d');
    const img = g.createImageData(n, 1);
    for (let i = 0; i < n; i++) fill(img.data, i * 4, i);
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  const rm = mk((d, o, i) => { d[o] = 255; d[o + 1] = SLOT_RM[i][0] * 255; d[o + 2] = SLOT_RM[i][1] * 255; d[o + 3] = 255; });
  const em = mk((d, o, i) => { const e = i === SLOT.lamp ? 255 : 0; d[o] = d[o + 1] = d[o + 2] = e; d[o + 3] = 255; });
  em.colorSpace = THREE.SRGBColorSpace;
  return { rm, em, u: (slot) => (slot + 0.5) / n };
}

/** Fine scuff/wear normal map applied on uv1 to every furniture surface. */
export function makeDetailNormal(rng, size = 256) {
  const f = fbmField(rng.fork('detail'), size, size, 4, 12);
  const c = canvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = f(x / size, y / size);
  const at = (x, y) => h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (at(x - 1, y) - at(x + 1, y)) * 1.6;
    const ny = (at(x, y - 1) - at(x, y + 1)) * 1.6;
    const len = Math.hypot(nx, ny, 1);
    const i = (y * size + x) * 4;
    img.data[i] = (nx / len * 0.5 + 0.5) * 255;
    img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, { srgb: false });
  t.channel = 1;
  return t;
}
