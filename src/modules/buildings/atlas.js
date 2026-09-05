// Procedural PBR atlas for building facades, roofs, ground and clutter.
// One 2048² albedo (sRGB) + normal + ORM (r=ao unused, g=roughness, b=metalness) and a 512² emissive
// window mask. Every surface in the module samples this single atlas, so a whole 128 m chunk of city is
// one draw call. Tiles are laid out by a shelf packer; each tile is drawn in local 0..1 space with a
// 6 px bleed gutter so mipmaps do not leak across tile borders.

import * as THREE from 'three';

export const ATLAS = 2048;
export const EMIS = 1024;
const PAD = 6;
const ES = EMIS / ATLAS;

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c.getContext('2d', { willReadFrequently: false });
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** tangent-space normal colour; OpenGL convention (green = up) */
export function nrm(nx, ny) {
  const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny));
  return `rgb(${Math.round(128 + nx * 127)},${Math.round(128 + ny * 127)},${Math.round(nz * 255)})`;
}
const orm = (rough, metal) => `rgb(255,${Math.round(clamp01(rough) * 255)},${Math.round(clamp01(metal) * 255)})`;

function shade(hex, k) {
  const c = new THREE.Color(hex);
  if (k >= 1) c.lerp(new THREE.Color(0xffffff), Math.min(1, k - 1));
  else c.multiplyScalar(k);
  return '#' + c.getHexString();
}
function mixHex(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }

// ---------------------------------------------------------------- tile drawing context
class Tile {
  constructor(atlas, r) {
    this.r = r;
    this.rng = atlas.rng;
    this.atlas = atlas;
    this.aspect = r.w / r.h;
    this.A = atlas.A; this.N = atlas.N; this.O = atlas.O; this.E = atlas.E;
    this._open(this.A, r, 1); this._open(this.N, r, 1); this._open(this.O, r, 1); this._open(this.E, r, ES);
  }
  _open(g, r, s) {
    g.save();
    g.beginPath();
    g.rect((r.x - PAD) * s, (r.y - PAD) * s, (r.w + PAD * 2) * s, (r.h + PAD * 2) * s);
    g.clip();
    g.setTransform(r.w * s, 0, 0, r.h * s, r.x * s, r.y * s);
  }
  close() { this.A.restore(); this.N.restore(); this.O.restore(); this.E.restore(); }
  // -- primitives (local 0..1 space, y down = top of the facade at y=0)
  a(x, y, w, h, style) { const g = this.A; g.fillStyle = style; g.fillRect(x, y, w, h); }
  n(x, y, w, h, nx, ny) { const g = this.N; g.fillStyle = nrm(nx, ny); g.fillRect(x, y, w, h); }
  o(x, y, w, h, rough, metal) { const g = this.O; g.fillStyle = orm(rough, metal); g.fillRect(x, y, w, h); }
  e(x, y, w, h, v = 1) { const g = this.E; g.fillStyle = `rgb(${(v * 255) | 0},${(v * 255) | 0},${(v * 255) | 0})`; g.fillRect(x, y, w, h); }
  /** vertical gradient fill on the albedo */
  gradA(x, y, w, h, stops) {
    const g = this.A, gr = g.createLinearGradient(0, y, 0, y + h);
    for (const [p, c] of stops) gr.addColorStop(p, c);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  gradAH(x, y, w, h, stops) {
    const g = this.A, gr = g.createLinearGradient(x, 0, x + w, 0);
    for (const [p, c] of stops) gr.addColorStop(p, c);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  /** soft ambient-occlusion darkening: multiply a gradient over the albedo */
  ao(x, y, w, h, strength, dir = 'down') {
    const g = this.A;
    g.save(); g.globalCompositeOperation = 'multiply';
    const gr = dir === 'down' ? g.createLinearGradient(0, y, 0, y + h)
      : dir === 'up' ? g.createLinearGradient(0, y + h, 0, y)
        : dir === 'right' ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(x + w, 0, x, 0);
    gr.addColorStop(0, `rgba(${(255 * (1 - strength)) | 0},${(255 * (1 - strength)) | 0},${(255 * (1 - strength) * 1.02) | 0},1)`);
    gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.restore();
  }
  /** speckle / grain overlay from a cached noise tile */
  grain(x, y, w, h, kind, alpha, scale = 1) {
    const g = this.A, img = this.atlas.noise(kind);
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = 'multiply';
    const n = Math.max(1, Math.round(scale));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g.drawImage(img, x + (i * w) / n, y + (j * h) / n, w / n, h / n);
    g.restore();
  }
  grainN(x, y, w, h, kind, alpha, scale = 1) {
    const g = this.N, img = this.atlas.noise(kind);
    g.save(); g.globalAlpha = alpha;
    const n = Math.max(1, Math.round(scale));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g.drawImage(img, x + (i * w) / n, y + (j * h) / n, w / n, h / n);
    g.restore();
  }
  rnd(a, b) { return a + (b - a) * this.rng.float(); }
}

// ---------------------------------------------------------------- atlas
export class BuildingAtlas {
  constructor(rng) {
    this.rng = rng;
    this.A = canvas2d(ATLAS, ATLAS);
    this.N = canvas2d(ATLAS, ATLAS);
    this.O = canvas2d(ATLAS, ATLAS);
    this.E = canvas2d(EMIS, EMIS);
    this.A.fillStyle = '#8a8a88'; this.A.fillRect(0, 0, ATLAS, ATLAS);
    this.N.fillStyle = nrm(0, 0); this.N.fillRect(0, 0, ATLAS, ATLAS);
    this.O.fillStyle = orm(0.85, 0); this.O.fillRect(0, 0, ATLAS, ATLAS);
    this.E.fillStyle = '#000'; this.E.fillRect(0, 0, EMIS, EMIS);
    this.sx = PAD; this.sy = PAD; this.sh = 0;
    this.tiles = new Map();
    this._noise = new Map();
  }
  /** cached grayscale noise patch used for grain overlays */
  noise(kind) {
    if (this._noise.has(kind)) return this._noise.get(kind);
    const S = 64, g = canvas2d(S, S), img = g.createImageData(S, S), r = this.rng;
    const buf = new Float32Array(S * S);
    if (kind === 'blotch') {
      for (let i = 0; i < S * S; i++) buf[i] = r.float();
      // two blur passes -> soft blotches
      for (let p = 0; p < 3; p++) {
        const tmp = buf.slice();
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let s = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += tmp[((y + dy + S) % S) * S + ((x + dx + S) % S)];
          buf[y * S + x] = s / 9;
        }
      }
      let mn = 1, mx = 0;
      for (let i = 0; i < S * S; i++) { if (buf[i] < mn) mn = buf[i]; if (buf[i] > mx) mx = buf[i]; }
      for (let i = 0; i < S * S; i++) buf[i] = (buf[i] - mn) / Math.max(1e-4, mx - mn);
    } else if (kind === 'streak') {
      const cols = new Float32Array(S);
      for (let x = 0; x < S; x++) cols[x] = r.float();
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) buf[y * S + x] = 0.35 + 0.65 * cols[x] * (0.5 + 0.5 * r.float());
    } else { // 'fine'
      for (let i = 0; i < S * S; i++) buf[i] = 0.5 + 0.5 * r.float();
    }
    for (let i = 0; i < S * S; i++) {
      const v = Math.round(255 * (0.55 + 0.45 * buf[i]));
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this._noise.set(kind, g.canvas);
    return g.canvas;
  }
  alloc(name, w, h) {
    if (this.sx + w + PAD > ATLAS) { this.sx = PAD; this.sy += this.sh + PAD * 2; this.sh = 0; }
    if (this.sy + h + PAD > ATLAS) throw new Error('building atlas full');
    const r = { x: this.sx, y: this.sy, w, h };
    this.sx += w + PAD * 2;
    this.sh = Math.max(this.sh, h);
    // uv rect: canvas y grows down, texture flipY=true so v = 1 - y/ATLAS
    this.tiles.set(name, {
      name,
      u: r.x / ATLAS, v: 1 - (r.y + r.h) / ATLAS,
      du: r.w / ATLAS, dv: r.h / ATLAS,
      aspect: r.w / r.h,
    });
    return r;
  }
  paint(name, w, h, fn) {
    const r = this.alloc(name, w, h);
    const t = new Tile(this, r);
    try { fn(t); } finally { t.close(); }
    return this.tiles.get(name);
  }
  rect(name) {
    const t = this.tiles.get(name);
    if (!t) throw new Error(`buildings: unknown atlas tile "${name}"`);
    return t;
  }
  has(name) { return this.tiles.has(name); }
  /** register a horizontal sub-rect of an existing tile as its own tile (bay variants of a row tile) */
  sub(name, parent, i, n) {
    const t = this.rect(parent);
    const du = t.du / n;
    this.tiles.set(name, { name, u: t.u + du * i, v: t.v, du, dv: t.dv, aspect: t.aspect / n });
    return this.tiles.get(name);
  }
  finish(anisotropy = 8) {
    const mk = (ctx, srgb, size) => {
      const t = new THREE.CanvasTexture(ctx.canvas);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = anisotropy;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      return t;
    };
    return {
      map: mk(this.A, true), normalMap: mk(this.N, false), ormMap: mk(this.O, false), emissiveMap: mk(this.E, false),
    };
  }
}

// ================================================================ wall materials
// Each paints albedo + normal + ORM over a sub-rect in local space, repeating `rx` × `ry` times.

export function wallMaterial(t, kind, color, x, y, w, h, rx = 1, ry = 1) {
  const A = t.A;
  A.fillStyle = color; A.fillRect(x, y, w, h);
  t.o(x, y, w, h, 0.85, 0);
  t.n(x, y, w, h, 0, 0);
  switch (kind) {
    case 'brick': {
      const rows = Math.max(3, Math.round(9 * ry)), rh = h / rows;
      const cols = Math.max(3, Math.round(4.5 * rx));
      const mortar = mixHex(color, '#cfc9bd', 0.62);
      for (let j = 0; j < rows; j++) {
        const yy = y + j * rh;
        A.fillStyle = mortar; A.fillRect(x, yy + rh - rh * 0.16, w, rh * 0.16);
        t.n(x, yy + rh - rh * 0.16, w, rh * 0.08, 0, -0.45);
        t.n(x, yy + rh - rh * 0.08, w, rh * 0.08, 0, 0.45);
        const off = (j % 2) * 0.5;
        for (let i = 0; i <= cols; i++) {
          const xx = x + ((i + off) / cols) * w;
          if (xx < x - 0.01 || xx > x + w) continue;
          A.fillStyle = mortar; A.fillRect(xx, yy, Math.max(0.002, w / cols * 0.055), rh * 0.86);
        }
        // per-brick tone variation
        for (let i = 0; i < cols; i++) {
          const k = t.rnd(0.9, 1.12);
          A.save(); A.globalAlpha = 0.35;
          A.fillStyle = shade(color, k);
          A.fillRect(x + ((i + off) / cols) * w + w / cols * 0.05, yy + rh * 0.06, w / cols * 0.88, rh * 0.74);
          A.restore();
        }
      }
      t.grain(x, y, w, h, 'fine', 0.22, 2);
      t.o(x, y, w, h, 0.92, 0);
      break;
    }
    case 'siding': {
      const rows = Math.max(4, Math.round(11 * ry)), rh = h / rows;
      for (let j = 0; j < rows; j++) {
        const yy = y + j * rh;
        t.gradA(x, yy, w, rh, [[0, shade(color, 1.06)], [0.72, color], [1, shade(color, 0.78)]]);
        A.fillStyle = shade(color, 0.6); A.fillRect(x, yy + rh - rh * 0.1, w, rh * 0.1);
        t.n(x, yy, w, rh * 0.5, 0, 0.22);
        t.n(x, yy + rh * 0.5, w, rh * 0.4, 0, -0.1);
        t.n(x, yy + rh * 0.9, w, rh * 0.1, 0, -0.6);
      }
      t.grain(x, y, w, h, 'fine', 0.1, 2);
      t.o(x, y, w, h, 0.6, 0);
      break;
    }
    case 'stucco': {
      t.grain(x, y, w, h, 'blotch', 0.3, 1);
      t.grain(x, y, w, h, 'fine', 0.3, 3);
      t.grainN(x, y, w, h, 'fine', 0.35, 3);
      t.o(x, y, w, h, 0.88, 0);
      break;
    }
    case 'concrete': {
      t.grain(x, y, w, h, 'blotch', 0.26, 1);
      t.grain(x, y, w, h, 'fine', 0.16, 2);
      t.grainN(x, y, w, h, 'blotch', 0.25, 1);
      t.o(x, y, w, h, 0.8, 0);
      break;
    }
    case 'panel': { // precast / painted panel with joints
      const cols = Math.max(1, Math.round(rx)), rows = Math.max(1, Math.round(ry));
      t.grain(x, y, w, h, 'blotch', 0.2, 1);
      for (let i = 0; i <= cols; i++) {
        const xx = x + (i / cols) * w - w / cols * 0.008;
        A.fillStyle = shade(color, 0.72); A.fillRect(xx, y, w * 0.012, h);
        t.n(xx, y, w * 0.006, h, -0.5, 0); t.n(xx + w * 0.006, y, w * 0.006, h, 0.5, 0);
      }
      for (let j = 0; j <= rows; j++) {
        const yy = y + (j / rows) * h;
        A.fillStyle = shade(color, 0.72); A.fillRect(x, yy - h * 0.006, w, h * 0.012);
        t.n(x, yy - h * 0.006, w, h * 0.006, 0, 0.5); t.n(x, yy, w, h * 0.006, 0, -0.5);
      }
      t.o(x, y, w, h, 0.72, 0.02);
      break;
    }
    case 'stone': {
      const rows = Math.max(2, Math.round(4 * ry)), rh = h / rows;
      const cols = Math.max(2, Math.round(2.4 * rx));
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const off = (j % 2) * 0.5;
        A.fillStyle = shade(color, t.rnd(0.9, 1.1));
        A.fillRect(x + ((i + off) / cols) * w + 0.004 * w, y + j * rh + 0.01 * rh, w / cols - 0.008 * w, rh - 0.02 * rh);
      }
      t.grain(x, y, w, h, 'blotch', 0.28, 1);
      t.grainN(x, y, w, h, 'blotch', 0.2, 2);
      t.o(x, y, w, h, 0.78, 0);
      break;
    }
    case 'metal': { // corrugated / ribbed metal siding
      const cols = Math.max(6, Math.round(16 * rx));
      for (let i = 0; i < cols; i++) {
        const xx = x + (i / cols) * w, cw = w / cols;
        t.gradAH(xx, y, cw, h, [[0, shade(color, 0.72)], [0.35, shade(color, 1.1)], [0.7, color], [1, shade(color, 0.66)]]);
        t.n(xx, y, cw * 0.3, h, -0.55, 0);
        t.n(xx + cw * 0.3, y, cw * 0.4, h, 0.1, 0);
        t.n(xx + cw * 0.7, y, cw * 0.3, h, 0.55, 0);
      }
      t.grain(x, y, w, h, 'streak', 0.14, 1);
      t.o(x, y, w, h, 0.42, 0.55);
      break;
    }
    default: break;
  }
}

// ================================================================ window bay
/**
 * Draws one window bay (1 bay wide × 1 floor tall) inside the sub-rect.
 * def: {wall, wallColor, win:{x,w,y,h}, frame, glass:[top,bottom], sill, mullV, mullH, dirt, shopfront, blind}
 */
export function drawBay(t, def, x0, w0, y0, h0, variant) {
  const A = t.A;
  const wx = x0 + def.win.x * w0, ww = def.win.w * w0;
  const wy = y0 + def.win.y * h0, wh = def.win.h * h0;
  const fw = (def.frameW ?? 0.03) * w0;
  const rev = (def.reveal ?? 0.035) * w0;

  // ---- recess: dark opening + reveal bevels in the normal map
  t.a(wx - rev, wy - rev, ww + rev * 2, wh + rev * 2, shade(def.wallColor, 0.5));
  t.o(wx - rev, wy - rev, ww + rev * 2, wh + rev * 2, 0.8, 0);
  t.n(wx - rev, wy - rev, rev, wh + rev * 2, 0.75, 0);            // left reveal faces right
  t.n(wx + ww, wy - rev, rev, wh + rev * 2, -0.75, 0);            // right reveal
  t.n(wx - rev, wy - rev, ww + rev * 2, rev, 0, -0.75);           // head reveal faces down
  t.n(wx - rev, wy + wh, ww + rev * 2, rev, 0, 0.75);             // cill reveal faces up
  // contact shadow of the reveal on the wall
  t.ao(wx - rev * 2.2, wy - rev * 2.2, ww + rev * 4.4, rev * 2.2, 0.42, 'up');

  // ---- glass
  const g0 = def.glass[0], g1 = def.glass[1];
  t.gradA(wx, wy, ww, wh, [[0, g0], [0.42, mixHex(g0, g1, 0.75)], [0.55, shade(g1, 1.25)], [1, g1]]);
  // sky sliver + a soft diagonal reflection streak (shifted per bay variant)
  A.save();
  A.globalAlpha = 0.26 + variant * 0.07; A.globalCompositeOperation = 'screen';
  A.fillStyle = '#7d93ad';
  A.beginPath();
  A.moveTo(wx, wy + wh * (0.4 + variant * 0.22)); A.lineTo(wx + ww * (0.4 + variant * 0.3), wy); A.lineTo(wx + ww, wy); A.lineTo(wx, wy + wh);
  A.closePath(); A.fill();
  A.restore();
  t.o(wx, wy, ww, wh, def.glassRough ?? 0.09, def.glassMetal ?? 0.72);
  t.n(wx, wy, ww, wh, 0, 0);
  t.e(wx, wy, ww, wh, 1);

  // interiors: blinds / a lit ceiling strip in some bays (baked daytime variety)
  if (variant === 1 && def.blind !== false) {
    const bh = wh * t.rnd(0.24, 0.55);
    A.save(); A.globalAlpha = 0.9; A.fillStyle = def.blindColor || '#cfc8b6';
    A.fillRect(wx, wy, ww, bh); A.restore();
    for (let i = 0; i < 7; i++) { A.save(); A.globalAlpha = 0.16; A.fillStyle = '#000'; A.fillRect(wx, wy + (i / 7) * bh, ww, bh / 14); A.restore(); }
    t.o(wx, wy, ww, bh, 0.75, 0);
    t.e(wx, wy, ww, bh, 0.25);
  }

  // ---- mullions / glazing bars
  const mv = def.mullV ?? 1, mh = def.mullH ?? 0;
  const barC = def.frame;
  for (let i = 1; i <= mv; i++) {
    const bx = wx + (i / (mv + 1)) * ww - fw * 0.35;
    t.a(bx, wy, fw * 0.7, wh, barC);
    t.o(bx, wy, fw * 0.7, wh, 0.4, def.frameMetal ?? 0.15);
    t.n(bx, wy, fw * 0.35, wh, -0.4, 0); t.n(bx + fw * 0.35, wy, fw * 0.35, wh, 0.4, 0);
    t.e(bx, wy, fw * 0.7, wh, 0);
  }
  for (let j = 1; j <= mh; j++) {
    const by = wy + (j / (mh + 1)) * wh - fw * 0.35;
    t.a(wx, by, ww, fw * 0.7, barC);
    t.o(wx, by, ww, fw * 0.7, 0.4, def.frameMetal ?? 0.15);
    t.e(wx, by, ww, fw * 0.7, 0);
  }

  // ---- frame
  A.fillStyle = def.frame;
  A.fillRect(wx - fw, wy - fw, ww + fw * 2, fw);
  A.fillRect(wx - fw, wy + wh, ww + fw * 2, fw);
  A.fillRect(wx - fw, wy - fw, fw, wh + fw * 2);
  A.fillRect(wx + ww, wy - fw, fw, wh + fw * 2);
  t.o(wx - fw, wy - fw, ww + fw * 2, wh + fw * 2, 0.42, def.frameMetal ?? 0.15);
  t.o(wx, wy, ww, wh, def.glassRough ?? 0.09, def.glassMetal ?? 0.72);
  t.e(wx - fw, wy - fw, ww + fw * 2, fw, 0);
  t.e(wx - fw, wy + wh, ww + fw * 2, fw, 0);
  t.e(wx - fw, wy - fw, fw, wh + fw * 2, 0);
  t.e(wx + ww, wy - fw, fw, wh + fw * 2, 0);

  // ---- sill + the AO smudge and dirt streaks it throws on the wall below
  if (def.sill) {
    const sh = h0 * 0.035, sx = wx - fw * 2.2, sw = ww + fw * 4.4;
    t.a(sx, wy + wh + fw, sw, sh, def.sillColor || '#cdc8bf');
    t.gradA(sx, wy + wh + fw, sw, sh, [[0, shade(def.sillColor || '#cdc8bf', 1.12)], [1, shade(def.sillColor || '#cdc8bf', 0.82)]]);
    t.o(sx, wy + wh + fw, sw, sh, 0.8, 0);
    t.n(sx, wy + wh + fw, sw, sh * 0.5, 0, 0.55);
    t.ao(sx - fw, wy + wh + fw + sh, sw + fw * 2, h0 * 0.1, 0.5, 'down');
    if (def.dirt > 0) {
      A.save();
      A.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 6; i++) {
        const dx = sx + t.rnd(0.02, 0.9) * sw, dw = sw * t.rnd(0.02, 0.09);
        const dh = h0 * t.rnd(0.06, 0.3) * def.dirt;
        const gr = A.createLinearGradient(0, wy + wh + sh, 0, wy + wh + sh + dh);
        gr.addColorStop(0, `rgba(120,112,100,${0.55 * def.dirt})`);
        gr.addColorStop(1, 'rgba(255,255,255,1)');
        A.fillStyle = gr; A.fillRect(dx, wy + wh + sh, dw, dh);
      }
      A.restore();
    }
  }
}

/** curtain-wall bay: full-height glazing with mullions and a spandrel band */
export function drawCurtainBay(t, def, x0, w0, y0, h0, variant) {
  const A = t.A;
  const mull = def.frame, mw = 0.028 * w0;
  const spand = def.spandrel ?? 0.2;
  const gy = y0 + h0 * spand, gh = h0 * (1 - spand) - mw;
  // spandrel (opaque panel in front of the floor slab)
  t.a(x0, y0, w0, h0 * spand, def.spandrelColor || shade(def.glass[1], 0.75));
  t.gradA(x0, y0, w0, h0 * spand, [[0, shade(def.spandrelColor || def.glass[1], 0.62)], [1, shade(def.spandrelColor || def.glass[1], 0.95)]]);
  t.o(x0, y0, w0, h0 * spand, 0.32, 0.25);
  t.e(x0, y0, w0, h0 * spand, 0);
  // glass — the vertical gradient stays shallow and the reflection wedge shifts per bay so a
  // repeated tile does not read as herringbone across a whole curtain wall
  const gA = shade(def.glass[0], 1 - variant * 0.05), gB = shade(def.glass[1], 1 + variant * 0.04);
  t.gradA(x0, gy, w0, gh, [[0, gA], [0.5, mixHex(gA, gB, 0.55)], [0.62, mixHex(gA, gB, 0.35)], [1, gB]]);
  A.save(); A.globalAlpha = 0.16 + variant * 0.04; A.globalCompositeOperation = 'screen';
  A.fillStyle = '#8aa2bd';
  const kk = 0.45 + variant * 0.5;
  A.beginPath(); A.moveTo(x0, gy + gh * (0.4 + variant * 0.25)); A.lineTo(x0 + w0 * kk, gy); A.lineTo(x0 + w0, gy); A.lineTo(x0, gy + gh);
  A.closePath(); A.fill(); A.restore();
  t.o(x0, gy, w0, gh, def.glassRough ?? 0.06, def.glassMetal ?? 0.85);
  t.e(x0, gy, w0, gh, 1);
  if (variant === 1) {
    A.save(); A.globalAlpha = 0.55; A.fillStyle = '#b9b3a4'; A.fillRect(x0 + mw, gy, w0 - mw * 2, gh * t.rnd(0.2, 0.45)); A.restore();
  }
  // mullions
  const bar = (x, y, w, h, vertical) => {
    t.a(x, y, w, h, mull);
    t.o(x, y, w, h, 0.35, 0.55);
    t.e(x, y, w, h, 0);
    if (vertical) { t.n(x, y, w * 0.5, h, -0.4, 0); t.n(x + w * 0.5, y, w * 0.5, h, 0.4, 0); }
    else { t.n(x, y, w, h * 0.5, 0, 0.4); t.n(x, y + h * 0.5, w, h * 0.5, 0, -0.4); }
  };
  bar(x0, y0, mw, h0, true);
  bar(x0 + w0 - mw, y0, mw, h0, true);
  bar(x0, y0, w0, mw * 1.2, false);
  bar(x0, y0 + h0 - mw * 1.2, w0, mw * 1.2, false);
  const mv = def.mullV ?? 1;
  for (let i = 1; i <= mv; i++) bar(x0 + (i / (mv + 1)) * w0 - mw * 0.4, gy, mw * 0.8, gh, true);
  bar(x0, gy - mw, w0, mw, false);
  // subtle horizontal reflection banding
  A.save(); A.globalAlpha = 0.05; A.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) { A.fillStyle = '#cfe0f2'; A.fillRect(x0, gy + gh * (0.14 + i * 0.28 + variant * 0.05), w0, gh * 0.035); }
  A.restore();
}

/** ground-floor shopfront: full glazing, bulkhead, awning, fascia sign band */
export function drawShopfront(t, def, x0, w0, y0, h0, variant) {
  const A = t.A;
  const fasciaH = h0 * 0.2;
  // fascia / sign band
  t.a(x0, y0, w0, fasciaH, def.signColor || '#2f3a46');
  t.gradA(x0, y0, w0, fasciaH, [[0, shade(def.signColor || '#2f3a46', 1.18)], [1, shade(def.signColor || '#2f3a46', 0.8)]]);
  t.o(x0, y0, w0, fasciaH, 0.5, 0.05);
  // lettering suggestion
  A.save(); A.globalAlpha = 0.8; A.fillStyle = def.signInk || '#e8dfc9';
  const n = 5 + Math.floor(t.rnd(0, 4));
  let lx = x0 + w0 * 0.16;
  for (let i = 0; i < n && lx < x0 + w0 * 0.86; i++) {
    const lw = w0 * t.rnd(0.03, 0.07);
    A.fillRect(lx, y0 + fasciaH * 0.34, lw, fasciaH * 0.3);
    lx += lw + w0 * 0.018;
  }
  A.restore();
  t.e(x0, y0, w0, fasciaH, 0.55);
  // awning
  if (def.awning) {
    const ay = y0 + fasciaH, ah = h0 * 0.16;
    const c1 = def.awning, c2 = shade(def.awning, 1.5);
    const stripes = 7;
    for (let i = 0; i < stripes; i++) t.a(x0 + (i / stripes) * w0, ay, w0 / stripes, ah, i % 2 ? c1 : c2);
    t.ao(x0, ay, w0, ah, 0.35, 'up');
    t.o(x0, ay, w0, ah, 0.85, 0);
    t.n(x0, ay, w0, ah * 0.5, 0, 0.35);
    t.e(x0, ay, w0, ah, 0);
    t.ao(x0, ay + ah, w0, h0 * 0.2, 0.55, 'down');
  }
  // glazing
  const gy = y0 + h0 * (def.awning ? 0.36 : 0.2), gh = h0 * (def.awning ? 0.52 : 0.68);
  const bulk = h0 * 0.12;
  t.a(x0, gy, w0, gh + bulk, shade(def.wallColor, 0.7));
  t.gradA(x0 + w0 * 0.03, gy, w0 * 0.94, gh, [[0, '#2b3742'], [0.5, '#3d4a57'], [1, '#222b34']]);
  A.save(); A.globalAlpha = 0.55; A.globalCompositeOperation = 'screen';
  A.fillStyle = '#93a7bb';
  A.beginPath(); A.moveTo(x0, gy + gh); A.lineTo(x0 + w0 * 0.75, gy); A.lineTo(x0 + w0, gy); A.lineTo(x0 + w0 * 0.25, gy + gh); A.closePath(); A.fill();
  A.restore();
  // goods / interior suggestion behind the glass
  A.save(); A.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    A.fillStyle = ['#8d6b46', '#5e6d7a', '#8f4a44', '#4d6b52', '#b0a184'][i % 5];
    A.fillRect(x0 + w0 * (0.08 + i * 0.17), gy + gh * t.rnd(0.4, 0.66), w0 * 0.11, gh * 0.3);
  }
  A.restore();
  t.o(x0 + w0 * 0.03, gy, w0 * 0.94, gh, 0.08, 0.6);
  t.e(x0 + w0 * 0.03, gy, w0 * 0.94, gh, 1);
  // mullions + door
  const bar = (x, y, w, h) => { t.a(x, y, w, h, def.frame); t.o(x, y, w, h, 0.4, 0.3); t.e(x, y, w, h, 0); };
  bar(x0, gy, w0 * 0.03, gh + bulk); bar(x0 + w0 * 0.97, gy, w0 * 0.03, gh + bulk);
  bar(x0 + w0 * 0.48, gy, w0 * 0.035, gh);
  bar(x0, gy, w0, h0 * 0.018);
  // bulkhead below the glass
  t.a(x0, gy + gh, w0, bulk, shade(def.wallColor, 0.72));
  t.o(x0, gy + gh, w0, bulk, 0.8, 0);
  t.ao(x0, gy + gh, w0, bulk, 0.4, 'down');
  t.e(x0, gy + gh, w0, bulk, 0);
  // pavement shadow at the very bottom
  t.ao(x0, y0 + h0 * 0.9, w0, h0 * 0.1, 0.45, 'down');
}
