// Procedural, CC0-by-construction textures for props. Nothing is fetched; nothing is added to the manifest.
//
//  * leaf atlas   4x4 cells of 256 px (1024^2, RGBA, alpha DILATED so leaf edges have no black fringe)
//  * bark strip   3 columns of 256x512 (broadleaf / conifer / birch), tiles vertically
//  * impostor     4x4 cells of 256 px: 5 side silhouettes + 5 top-down canopies, softened so a 16 px
//                 impostor at skyline distance does not alias into speckle
//  * pool/glow    additive decals
//  * signs        4 faces
//  * LUT + detail albedo/normal for the one shared street-furniture material
import * as THREE from 'three';

const TAU = Math.PI * 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(c, { srgb = false, aniso = 8, mips = true, clamp = true } = {}) {
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

function hsl(h, s, l) { return `hsl(${h.toFixed(0)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%)`; }

/**
 * Push opaque colour outward under transparent texels. Without this every leaf edge fades toward
 * black as the bilinear filter mixes RGB(0,0,0) in, which is the "dark halo around foliage cards"
 * failure mode named in the spec.
 */
function dilateAlpha(ctx2d, w, h, passes = 8) {
  const img = ctx2d.getImageData(0, 0, w, h);
  const d = img.data;
  const known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = d[i * 4 + 3] > 4 ? 1 : 0;
  for (let p = 0; p < passes; p++) {
    const next = known.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (!known[j]) continue;
            r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
          }
        }
        if (n) { d[i * 4] = r / n; d[i * 4 + 1] = g / n; d[i * 4 + 2] = b / n; next[i] = 1; }
      }
    }
    known.set(next);
  }
  ctx2d.putImageData(img, 0, 0);
}

/** Separable box blur over RGBA (used to soften impostor cells so they do not alias). */
function blurCanvas(ctx2d, w, h, radius) {
  const img = ctx2d.getImageData(0, 0, w, h);
  const s = img.data;
  const tmp = new Float32Array(w * h * 4);
  const out = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h * 4; i++) tmp[i] = s[i];
  const pass = (src, dst, hor) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = hor ? Math.min(w - 1, Math.max(0, x + k)) : x;
        const yy = hor ? y : Math.min(h - 1, Math.max(0, y + k));
        const j = (yy * w + xx) * 4;
        r += src[j]; g += src[j + 1]; b += src[j + 2]; a += src[j + 3]; n++;
      }
      const i = (y * w + x) * 4;
      dst[i] = r / n; dst[i + 1] = g / n; dst[i + 2] = b / n; dst[i + 3] = a / n;
    }
  };
  pass(tmp, out, true);
  pass(out, tmp, false);
  for (let i = 0; i < w * h * 4; i++) s[i] = tmp[i];
  ctx2d.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ leaf atlas
export const LEAF_GRID = 4;                 // 4x4 cells
export const LEAF_CELL = {
  oak: 0, maple: 1, birch: 2, poplar: 3,
  willow: 4, blossom: 5, spruce: 6, fir: 7,
  bush: 8, hedge: 9, flower: 10, solid: 11,
  litter: 12,
};

/** UV rect of a leaf-atlas cell. Content is drawn inside a margin so mips do not bleed across cells. */
export function cellRect(index, grid = LEAF_GRID) {
  const cx = index % grid, cy = Math.floor(index / grid);
  const s = 1 / grid;
  return [cx * s, 1 - (cy + 1) * s, s, s];
}

function blade(g, len, wide, col, dark, lobes) {
  g.beginPath();
  g.moveTo(0, 0);
  if (lobes) {
    const n = 4;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const w0 = wide * Math.sin(Math.PI * (0.15 + 0.85 * t0)) * (i % 2 ? 0.62 : 1);
        const w1 = wide * Math.sin(Math.PI * (0.15 + 0.85 * t1)) * ((i + 1) % 2 ? 0.62 : 1);
        if (s > 0) g.quadraticCurveTo(w0 * s, len * (t0 + 0.12), w1 * s, len * t1);
        else g.quadraticCurveTo(w1 * s, len * (1 - t0 - 0.12), w0 * s, len * (1 - t1));
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

function broadCluster(g, x0, y0, S, rnd, opt) {
  const { hue = 96, sat = 0.42, light = 0.34, n = 210, lobes = true, spread = 0.40, size = 0.09, droop = 0, twig = 1 } = opt;
  const M = S * 0.06;                     // transparent margin inside the cell
  const R = (S - M * 2) * 0.5;
  g.save();
  g.beginPath(); g.rect(x0 + 1, y0 + 1, S - 2, S - 2); g.clip();
  g.translate(x0 + S * 0.5, y0 + S * 0.5);
  if (twig) {
    g.strokeStyle = hsl(28, 0.30, 0.16); g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.5 + (i / 4 - 0.5) * 2.0;
      g.lineWidth = S * 0.014;
      g.beginPath(); g.moveTo(0, R * 0.86);
      g.quadraticCurveTo(Math.cos(a) * R * 0.35, R * 0.30, Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.68);
      g.stroke();
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const count = pass === 0 ? Math.round(n * 0.55) : n;
    for (let i = 0; i < count; i++) {
      const a = rnd() * TAU;
      const r = Math.pow(rnd(), 0.55) * S * spread * 0.66;   // <= 0.34 S: r + leaf stays inside the cell
      const len = S * size * (0.62 + rnd() * 0.78);
      const wide = len * (0.32 + rnd() * 0.20);
      g.save();
      g.translate(Math.cos(a) * r, Math.sin(a) * r * 0.94 + droop * S * 0.05);
      g.rotate(a + Math.PI * 0.5 + (rnd() - 0.5) * 1.9);
      const vy = 0.5 - Math.sin(a) * (r / Math.max(1e-3, R)) * 0.5;
      const l = pass === 0 ? light * 0.86 : light * (0.88 + vy * 0.30 + rnd() * 0.20);
      const h = hue + (rnd() - 0.5) * 22;
      const sa = sat * (0.80 + rnd() * 0.44);
      blade(g, len * (pass === 0 ? 1.18 : 1), wide * (pass === 0 ? 1.18 : 1),
        hsl(h, sa, Math.min(0.64, l)), hsl(h - 4, sa * 0.95, Math.max(0.10, l * 0.74)), lobes);
      g.restore();
    }
  }
  g.globalCompositeOperation = 'source-atop';
  const grd = g.createRadialGradient(0, S * 0.06, S * 0.02, 0, S * 0.05, S * 0.50);
  grd.addColorStop(0, 'rgba(0,0,0,0.12)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.05)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(-S * 0.5, -S * 0.5, S, S);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}

function needleSpray(g, x0, y0, S, rnd, opt) {
  const { hue = 128, sat = 0.32, light = 0.26, sprays = 12 } = opt;
  g.save();
  g.beginPath(); g.rect(x0 + 1, y0 + 1, S - 2, S - 2); g.clip();
  g.translate(x0 + S * 0.5, y0 + S * 0.5);
  for (let s = 0; s < sprays; s++) {
    const ang = -Math.PI * 0.5 + ((s + 0.5) / sprays - 0.5) * 2.6 + (rnd() - 0.5) * 0.28;
    const len = S * (0.20 + rnd() * 0.15);
    g.save();
    g.rotate(ang);
    g.translate((rnd() - 0.5) * S * 0.10, (rnd() - 0.5) * S * 0.06);
    g.strokeStyle = hsl(26, 0.32, 0.13); g.lineWidth = S * 0.011;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.12, len * 0.5, 0, len); g.stroke();
    const nn = 30;
    for (let i = 0; i < nn; i++) {
      const t = 0.04 + (i / nn) * 0.96;
      const side = rnd() < 0.5 ? 1 : -1;
      const nl = S * 0.10 * (1 - t * 0.30) * (0.55 + rnd() * 0.85);
      const l = light * (0.68 + rnd() * 0.72);
      g.strokeStyle = hsl(hue + (rnd() - 0.5) * 22, sat * (0.7 + rnd() * 0.6), Math.min(0.58, l));
      g.lineWidth = S * (0.008 + rnd() * 0.005);
      g.beginPath();
      const bx = len * t * 0.12, by = len * t;
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + side * nl * 0.5, by + nl * 0.30, bx + side * nl * (0.75 + rnd() * 0.4), by + nl * (0.55 + rnd() * 0.5));
      g.stroke();
    }
    g.restore();
  }
  g.globalCompositeOperation = 'source-atop';
  const grd = g.createRadialGradient(0, S * 0.10, S * 0.02, 0, S * 0.06, S * 0.44);
  grd.addColorStop(0, 'rgba(0,0,0,0.26)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(-S * 0.5, -S * 0.5, S, S);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}

/** Opaque leafy fill used for hedge/bush volumes (alpha = 255 everywhere inside the cell). */
function solidLeafFill(g, x0, y0, S, rnd, hue, light) {
  g.save();
  g.beginPath(); g.rect(x0, y0, S, S); g.clip();
  g.fillStyle = hsl(hue, 0.56, light * 0.60);
  g.fillRect(x0, y0, S, S);
  for (let i = 0; i < 900; i++) {
    const x = x0 + rnd() * S, y = y0 + rnd() * S;
    const len = S * (0.020 + rnd() * 0.045);
    const l = light * (0.55 + rnd() * 0.95);
    g.save(); g.translate(x, y); g.rotate(rnd() * TAU);
    blade(g, len, len * 0.42, hsl(hue + (rnd() - 0.5) * 20, 0.58, Math.min(0.60, l)), hsl(hue - 12, 0.52, Math.max(0.04, l * 0.55)), false);
    g.restore();
  }
  g.restore();
}

function flowerCell(g, x0, y0, S, rnd) {
  broadCluster(g, x0, y0, S, rnd, { hue: 104, sat: 0.44, light: 0.32, n: 180, lobes: false, spread: 0.38, size: 0.06, twig: 0 });
  g.save(); g.translate(x0 + S * 0.5, y0 + S * 0.5);
  const pal = [[350, 0.60, 0.58], [45, 0.70, 0.60], [280, 0.40, 0.60], [12, 0.66, 0.58]];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU, r = Math.pow(rnd(), 0.6) * S * 0.34;
    const p = pal[(rnd() * pal.length) | 0];
    const rad = S * (0.014 + rnd() * 0.014);
    g.fillStyle = hsl(p[0] + (rnd() - 0.5) * 14, p[1], p[2]);
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const aa = (k / 5) * TAU;
      g.ellipse(Math.cos(a) * r + Math.cos(aa) * rad * 0.9, Math.sin(a) * r + Math.sin(aa) * rad * 0.9, rad, rad, 0, 0, TAU);
    }
    g.fill();
  }
  g.restore();
}

/** Mulch patch: dense leaf litter at the centre, thinning to nothing at the rim (alphaTest ragged). */
function litterCell(g, x0, y0, S, rnd) {
  g.save();
  g.beginPath(); g.rect(x0, y0, S, S); g.clip();
  const cx = x0 + S * 0.5, cy = y0 + S * 0.5;
  for (let i = 0; i < 1400; i++) {
    const a = rnd() * TAU;
    const t = Math.pow(rnd(), 0.42);
    if (rnd() < t * t * 1.15) continue;            // thin out toward the rim
    const r = t * S * 0.49;
    const len = S * (0.020 + rnd() * 0.038);
    const l = 0.20 + rnd() * 0.16;
    g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.98); g.rotate(rnd() * TAU);
    blade(g, len, len * 0.45, hsl(34 + (rnd() - 0.5) * 30, 0.36, l), hsl(28, 0.30, l * 0.6), false);
    g.restore();
  }
  g.restore();
}

export function makeLeafAtlas(rng, size = 1024) {
  const c = canvas(size, size);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.clearRect(0, 0, size, size);
  const S = size / LEAF_GRID;
  const R = () => rng.float();
  const at = (i) => [(i % LEAF_GRID) * S, Math.floor(i / LEAF_GRID) * S];
  let p;
  p = at(LEAF_CELL.oak); broadCluster(g, p[0], p[1], S, R, { hue: 92, sat: 0.66, light: 0.50, n: 300, lobes: true, spread: 0.50, size: 0.078 });
  p = at(LEAF_CELL.maple); broadCluster(g, p[0], p[1], S, R, { hue: 40, sat: 0.78, light: 0.50, n: 290, lobes: true, spread: 0.50, size: 0.084 });
  p = at(LEAF_CELL.birch); broadCluster(g, p[0], p[1], S, R, { hue: 62, sat: 0.70, light: 0.54, n: 320, lobes: false, spread: 0.50, size: 0.058, droop: 0.6 });
  p = at(LEAF_CELL.poplar); broadCluster(g, p[0], p[1], S, R, { hue: 84, sat: 0.64, light: 0.52, n: 310, lobes: false, spread: 0.48, size: 0.060, droop: 0.3 });
  p = at(LEAF_CELL.willow); broadCluster(g, p[0], p[1], S, R, { hue: 96, sat: 0.60, light: 0.48, n: 330, lobes: false, spread: 0.52, size: 0.050, droop: 1.2 });
  p = at(LEAF_CELL.blossom); broadCluster(g, p[0], p[1], S, R, { hue: 104, sat: 0.54, light: 0.56, n: 240, lobes: false, spread: 0.48, size: 0.064 });
  {
    // blossom gets pale petals over the leaves
    const [bx, by] = at(LEAF_CELL.blossom);
    g.save(); g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 150; i++) {
      const a = R() * TAU, r = Math.pow(R(), 0.55) * S * 0.40;
      const x = bx + S * 0.5 + Math.cos(a) * r, y = by + S * 0.5 + Math.sin(a) * r;
      const rad = S * (0.010 + R() * 0.014);
      g.fillStyle = hsl(348 + (R() - 0.5) * 16, 0.34, 0.72 + R() * 0.16);
      g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
    g.restore();
  }
  p = at(LEAF_CELL.spruce); needleSpray(g, p[0], p[1], S, R, { hue: 138, sat: 0.46, light: 0.36, sprays: 16 });
  p = at(LEAF_CELL.fir); needleSpray(g, p[0], p[1], S, R, { hue: 156, sat: 0.40, light: 0.38, sprays: 18 });
  p = at(LEAF_CELL.bush); broadCluster(g, p[0], p[1], S, R, { hue: 110, sat: 0.60, light: 0.40, n: 320, lobes: false, spread: 0.50, size: 0.058, twig: 0 });
  p = at(LEAF_CELL.hedge); broadCluster(g, p[0], p[1], S, R, { hue: 116, sat: 0.62, light: 0.36, n: 360, lobes: false, spread: 0.52, size: 0.044, twig: 0 });
  p = at(LEAF_CELL.flower); flowerCell(g, p[0], p[1], S, R);
  p = at(LEAF_CELL.solid); solidLeafFill(g, p[0], p[1], S, R, 116, 0.30);
  p = at(LEAF_CELL.litter); litterCell(g, p[0], p[1], S, R);
  dilateAlpha(g, size, size, 10);
  return c;
}

// ------------------------------------------------------------------ bark
function fbmField(rng, oct, freq, aspect = 1) {
  const grids = [];
  for (let o = 0; o < oct; o++) {
    const n = Math.max(2, Math.round(freq * Math.pow(2, o)));
    const m = Math.max(2, Math.round(freq * aspect * Math.pow(2, o)));
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

export const BARK_COLS = 3;   // 0 broadleaf, 1 conifer, 2 birch/pale

export function makeBarkStrip(rng, cw = 256, ch = 512) {
  const W = cw * BARK_COLS, H = ch;
  const c = canvas(W, H), g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const specs = [
    { fx: 7, fy: 2.4, oct: 4, furrow: 1.45, base: [0.44, 0.36, 0.28], dark: [0.10, 0.08, 0.06], plate: 0 },
    { fx: 5, fy: 4.5, oct: 4, furrow: 1.05, base: [0.40, 0.27, 0.19], dark: [0.11, 0.07, 0.05], plate: 1 },
    { fx: 3, fy: 2.0, oct: 3, furrow: 0.40, base: [0.72, 0.70, 0.65], dark: [0.24, 0.23, 0.21], plate: 2 },
  ];
  for (let ci = 0; ci < BARK_COLS; ci++) {
    const s = specs[ci];
    const f1 = fbmField(rng.fork(`bark${ci}a`), s.oct, s.fx, 0.30);
    const f2 = fbmField(rng.fork(`bark${ci}b`), 3, s.fy, 1);
    const f3 = fbmField(rng.fork(`bark${ci}c`), 2, 14, 1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < cw; x++) {
        const u = x / cw, v = y / H;
        let n = f1(u, v);
        n = n * 0.74 + f2(u * 1.7, v * 0.7) * 0.26;
        let h = n;
        if (s.plate === 1) { const pl = f2(u * 2.2, v * 2.4); h = h * 0.52 + (pl > 0.52 ? 0.88 : 0.20) * 0.48; }
        if (s.plate === 2) { const band = f2(u * 0.5, v * 1.1); h = 0.66 + band * 0.24; }
        h = h * 0.86 + f3(u * 3, v * 3) * 0.14;
        const furrow = Math.pow(Math.max(0, h), s.furrow + 1);
        let r = s.base[0] * (0.38 + furrow * 1.05) + s.dark[0] * (1 - furrow) * 0.9;
        let gg = s.base[1] * (0.38 + furrow * 1.05) + s.dark[1] * (1 - furrow) * 0.9;
        let b = s.base[2] * (0.38 + furrow * 1.05) + s.dark[2] * (1 - furrow) * 0.9;
        if (s.plate === 2) {
          const d2 = f3(u * 2.0, v * 9.0);
          if (d2 > 0.68) { const k = Math.min(1, (d2 - 0.68) * 7); r += (0.09 - r) * k; gg += (0.08 - gg) * k; b += (0.07 - b) * k; }
        }
        const X = ci * cw + x;
        const i = (y * W + X) * 4;
        img.data[i] = Math.min(255, r * 255); img.data[i + 1] = Math.min(255, gg * 255); img.data[i + 2] = Math.min(255, b * 255); img.data[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------------ impostors
export const IMP_GRID = 4;
export const IMP_CELL = { conifer: 0, broad: 1, narrow: 2, wide: 3, ornamental: 4 };
/** quad side, in canonical tree heights, for each impostor class */
export const IMP_QUAD = [1.0, 1.05, 1.0, 1.5, 1.05];

function impSide(g, x0, y0, S, rnd, kind) {
  const Q = IMP_QUAD[kind];
  const treeH = S / Q;                        // pixels for one canonical tree height
  const baseY = y0 + S - (S - treeH) * 0.5 - S * 0.02;
  const cx = x0 + S * 0.5;
  const blob = (bx, by, r, hue, sat, light, count, lobes, sizeK, flat) => {
    for (let i = 0; i < count; i++) {
      const a = rnd() * TAU, rr = Math.pow(rnd(), 0.52) * r;
      const x = bx + Math.cos(a) * rr, y = by + Math.sin(a) * rr * flat;
      const k = 1 - (y - (by - r * flat)) / (r * flat * 2);
      const l = light * (0.52 + k * 0.88) * (0.82 + rnd() * 0.34);
      const s = r * sizeK * (0.55 + rnd() * 0.6);
      g.save(); g.translate(x, y); g.rotate(rnd() * TAU);
      blade(g, s * 1.6, s * 0.55, hsl(hue + (rnd() - 0.5) * 18, sat, Math.min(0.58, l)), hsl(hue - 10, sat, Math.max(0.05, l * 0.5)), lobes);
      g.restore();
    }
  };
  if (kind === IMP_CELL.conifer) {
    g.strokeStyle = '#3a2d22'; g.lineWidth = treeH * 0.020; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, baseY); g.lineTo(cx, baseY - treeH * 0.96); g.stroke();
    for (let tier = 0; tier < 15; tier++) {
      const t = tier / 14;
      const y = baseY - treeH * (0.10 + t * 0.88);
      const rad = treeH * 0.21 * Math.pow(1 - t, 0.75) + treeH * 0.012;
      for (let i = 0; i < 46; i++) {
        const x = cx + (rnd() * 2 - 1) * rad;
        const yy = y + (rnd() - 0.45) * treeH * 0.030;
        const l = 0.30 * (0.55 + (0.35 + t * 0.55) * 0.9) * (0.75 + rnd() * 0.5);
        g.strokeStyle = hsl(136 + (rnd() - 0.5) * 16, 0.30, Math.min(0.44, l));
        g.lineWidth = treeH * 0.013;
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (x > cx ? 1 : -1) * treeH * 0.035, yy + treeH * 0.028); g.stroke();
      }
    }
  } else if (kind === IMP_CELL.narrow) {
    g.strokeStyle = '#b8b1a3'; g.lineWidth = treeH * 0.016; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - treeH * 0.006, baseY); g.lineTo(cx + treeH * 0.008, baseY - treeH * 0.62); g.stroke();
    blob(cx, baseY - treeH * 0.66, treeH * 0.20, 70, 0.46, 0.40, 420, false, 0.075, 1.7);
  } else if (kind === IMP_CELL.wide) {
    g.strokeStyle = '#463a2e'; g.lineWidth = treeH * 0.034; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, baseY); g.lineTo(cx, baseY - treeH * 0.30); g.stroke();
    blob(cx, baseY - treeH * 0.52, treeH * 0.70, 84, 0.40, 0.36, 520, false, 0.060, 0.52);
  } else if (kind === IMP_CELL.ornamental) {
    g.strokeStyle = '#4a3c30'; g.lineWidth = treeH * 0.030; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, baseY); g.lineTo(cx, baseY - treeH * 0.36); g.stroke();
    blob(cx, baseY - treeH * 0.66, treeH * 0.44, 96, 0.34, 0.44, 380, false, 0.080, 0.92);
  } else {
    g.strokeStyle = '#43372c'; g.lineCap = 'round';
    g.lineWidth = treeH * 0.042; g.beginPath(); g.moveTo(cx, baseY); g.lineTo(cx, baseY - treeH * 0.34); g.stroke();
    g.lineWidth = treeH * 0.022;
    for (const a of [-0.7, 0.6, -0.25, 0.35]) { g.beginPath(); g.moveTo(cx, baseY - treeH * 0.32); g.lineTo(cx + a * treeH * 0.30, baseY - treeH * 0.52); g.stroke(); }
    blob(cx, baseY - treeH * 0.66, treeH * 0.46, 88, 0.44, 0.40, 520, true, 0.078, 0.94);
  }
}

function impTop(g, x0, y0, S, rnd, kind) {
  const cx = x0 + S * 0.5, cy = y0 + S * 0.5, R = S * 0.46;
  if (kind === IMP_CELL.conifer) {
    for (let i = 0; i < 460; i++) {
      const a = rnd() * TAU, rr = Math.pow(rnd(), 0.5) * R;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const l = 0.30 * (1.25 - rr / (R * 1.1)) * (0.8 + rnd() * 0.5);
      g.strokeStyle = hsl(136, 0.30, Math.min(0.44, l)); g.lineWidth = S * 0.014;
      g.beginPath(); g.moveTo(x, y); g.lineTo(cx + Math.cos(a) * (rr - S * 0.06), cy + Math.sin(a) * (rr - S * 0.06)); g.stroke();
    }
  } else {
    const hue = kind === IMP_CELL.narrow ? 70 : kind === IMP_CELL.wide ? 84 : kind === IMP_CELL.ornamental ? 96 : 88;
    for (let i = 0; i < 460; i++) {
      const a = rnd() * TAU, rr = Math.pow(rnd(), 0.52) * R;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const l = 0.38 * (1.15 - rr / (R * 1.3)) * (0.82 + rnd() * 0.4);
      const s = S * 0.045 * (0.6 + rnd() * 0.6);
      g.save(); g.translate(x, y); g.rotate(rnd() * TAU);
      blade(g, s * 1.6, s * 0.55, hsl(hue + (rnd() - 0.5) * 16, 0.44, Math.min(0.56, l)), hsl(hue - 10, 0.42, Math.max(0.05, l * 0.5)), kind === IMP_CELL.broad);
      g.restore();
    }
  }
}

export function makeImpostorAtlas(rng, size = 1024) {
  const c = canvas(size, size);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.clearRect(0, 0, size, size);
  const S = size / IMP_GRID;
  const R = () => rng.float();
  const at = (i) => [(i % IMP_GRID) * S, Math.floor(i / IMP_GRID) * S];
  for (let k = 0; k < 5; k++) { const p = at(k); impSide(g, p[0], p[1], S, R, k); }
  for (let k = 0; k < 5; k++) { const p = at(k + 5); impTop(g, p[0], p[1], S, R, k); }
  blurCanvas(g, size, size, 2);
  dilateAlpha(g, size, size, 8);
  return c;
}

// ------------------------------------------------------------------ sprites & decals
export function makeGlowSprite(size = 128, core = 0.11) {
  const c = canvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - h + 0.5, y - h + 0.5) / h;
    let a = 0;
    if (d < 1) a = Math.min(1, Math.pow(Math.max(0, 1 - d), 3.0) * 0.80 + Math.exp(-(d * d) / (core * core)) * 0.75);
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------------ signs
export const SIGN = { stop: 0, speed: 1, street: 2, bus: 3 };
export function makeSignAtlas(size = 512) {
  const c = canvas(size, size), g = c.getContext('2d');
  const S = size / 2;
  g.clearRect(0, 0, size, size);
  const cell = (i) => [(i % 2) * S, Math.floor(i / 2) * S];
  {
    const [x, y] = cell(SIGN.stop);
    g.save(); g.translate(x + S / 2, y + S / 2);
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; const r = S * 0.44; if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fillStyle = '#a41d21'; g.fill();
    g.strokeStyle = '#f2f2f0'; g.lineWidth = S * 0.035; g.stroke();
    g.fillStyle = '#f4f4f2'; g.font = `bold ${S * 0.26}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('STOP', 0, S * 0.02);
    g.restore();
  }
  {
    const [x, y] = cell(SIGN.speed);
    g.save(); g.translate(x + S / 2, y + S / 2);
    g.beginPath(); g.arc(0, 0, S * 0.42, 0, TAU); g.fillStyle = '#f0efec'; g.fill();
    g.lineWidth = S * 0.085; g.strokeStyle = '#b02128'; g.stroke();
    g.fillStyle = '#1b1b1c'; g.font = `bold ${S * 0.32}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('50', 0, S * 0.02);
    g.restore();
  }
  {
    const [x, y] = cell(SIGN.street);
    g.save(); g.translate(x, y);
    g.fillStyle = '#1d4c74'; g.fillRect(S * 0.04, S * 0.32, S * 0.92, S * 0.36);
    g.strokeStyle = '#e9eef2'; g.lineWidth = S * 0.018; g.strokeRect(S * 0.075, S * 0.352, S * 0.85, S * 0.30);
    g.fillStyle = '#eef3f7'; g.font = `bold ${S * 0.14}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MAPLE ST', S * 0.5, S * 0.50);
    g.restore();
  }
  {
    const [x, y] = cell(SIGN.bus);
    g.save(); g.translate(x + S / 2, y + S / 2);
    g.beginPath(); g.arc(0, 0, S * 0.40, 0, TAU); g.fillStyle = '#123a63'; g.fill();
    g.lineWidth = S * 0.05; g.strokeStyle = '#eef2f6'; g.stroke();
    g.fillStyle = '#eef2f6'; g.fillRect(-S * 0.20, -S * 0.16, S * 0.40, S * 0.26);
    g.fillStyle = '#123a63'; g.fillRect(-S * 0.16, -S * 0.12, S * 0.13, S * 0.10); g.fillRect(S * 0.03, -S * 0.12, S * 0.13, S * 0.10);
    g.fillStyle = '#eef2f6';
    g.beginPath(); g.arc(-S * 0.11, S * 0.14, S * 0.045, 0, TAU); g.arc(S * 0.11, S * 0.14, S * 0.045, 0, TAU); g.fill();
    g.restore();
  }
  const gg = c.getContext('2d', { willReadFrequently: true });
  dilateAlpha(gg, size, size, 6);
  return c;
}
export function signUV(name) {
  const i = SIGN[name] ?? 0;
  const cx = i % 2, cy = Math.floor(i / 2);
  return { u0: cx * 0.5 + 0.006, v0: 1 - (cy + 1) * 0.5 + 0.006, du: 0.5 - 0.012, dv: 0.5 - 0.012 };
}

// ------------------------------------------------------------------ furniture material LUTs
export const SLOT = { paintedMetal: 0, steel: 1, plastic: 2, wood: 3, concrete: 4, lamp: 5, rubber: 6, chrome: 7, glass: 8 };
const SLOT_RM = [
  [0.46, 0.62], [0.34, 0.90], [0.68, 0.02], [0.76, 0.02],
  [0.92, 0.02], [0.22, 0.08], [0.95, 0.00], [0.12, 1.00], [0.05, 0.06],
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

/** Tiling grey albedo detail (scuffs, casting grain, paint mottle) multiplied into every furniture surface. */
export function makeFurnitureAlbedo(rng, size = 512) {
  const f1 = fbmField(rng.fork('fa1'), 5, 6);
  const f2 = fbmField(rng.fork('fa2'), 3, 40);
  const c = canvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let k = 0.80 + (f1(u, v) - 0.5) * 0.34 + (f2(u, v) - 0.5) * 0.20;
    k = Math.max(0.42, Math.min(1.18, k));
    const i = (y * size + x) * 4;
    const c8 = Math.round(Math.pow(k, 1 / 2.2) * 255);
    img.data[i] = c8; img.data[i + 1] = c8; img.data[i + 2] = Math.min(255, c8 + 2); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function makeDetailNormal(rng, size = 256) {
  const f = fbmField(rng.fork('detail'), 4, 12);
  const c = canvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = f(x / size, y / size);
  const at = (x, y) => h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (at(x - 1, y) - at(x + 1, y)) * 1.5;
    const ny = (at(x, y - 1) - at(x, y + 1)) * 1.5;
    const len = Math.hypot(nx, ny, 1);
    const i = (y * size + x) * 4;
    img.data[i] = (nx / len * 0.5 + 0.5) * 255;
    img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Build every props texture. `aniso` comes from ctx.assets.anisotropy (item 9c). */
export function buildTextures(rng, aniso, quality) {
  const big = quality === 'low' ? 512 : 1024;
  const leaf = tex(makeLeafAtlas(rng.fork('leaf'), big), { srgb: true, aniso, clamp: true });
  const impostor = tex(makeImpostorAtlas(rng.fork('imp'), big), { srgb: true, aniso, clamp: true });
  const bark = tex(makeBarkStrip(rng.fork('bark'), 256, 512), { srgb: true, aniso, clamp: false });
  const glow = tex(makeGlowSprite(128), { srgb: false, aniso: 1, clamp: true });
  const signs = tex(makeSignAtlas(512), { srgb: true, aniso, clamp: true });
  const furAlbedo = tex(makeFurnitureAlbedo(rng.fork('fur'), 512), { srgb: true, aniso, clamp: false });
  const detail = tex(makeDetailNormal(rng.fork('detail'), 256), { srgb: false, aniso, clamp: false });
  furAlbedo.channel = 1;
  detail.channel = 1;
  const lut = makeSlotLUTs();
  return { leaf, impostor, bark, glow, signs, furAlbedo, detail, lut };
}
