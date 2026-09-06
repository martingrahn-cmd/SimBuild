// node shots/props/dev2/imgstats.mjs <png> [x y w h ...]
// Whole-frame stats are taken on a 480 px-wide downsample; crop stats on the full-resolution PNG.
import fs from 'node:fs';
import zlib from 'node:zlib';

function readPNG(file) {
  const buf = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, bd = 0, ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const bpp = ch * (bd / 8);
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * ch);
  let pos = 0;
  const prev = Buffer.alloc(stride);
  let cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    raw.copy(cur, 0, pos, pos + stride); pos += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c; const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    cur.copy(out, y * w * ch);
    cur.copy(prev);
    cur = Buffer.alloc(stride);
  }
  return { w, h, ch, data: out };
}

const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function stats(img, rect) {
  const [x0, y0, ww, hh] = rect || [0, 0, img.w, img.h];
  const ls = [], rs = [], gs = [], bs = [], sat = [], hue = [];
  let white = 0, black = 0, n = 0;
  for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + ww; x++) {
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
    const i = (y * img.w + x) * img.ch;
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    ls.push(L(r, g, b)); rs.push(r); gs.push(g); bs.push(b);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sat.push(mx ? (mx - mn) / mx : 0);
    let hd = 0;
    if (mx !== mn) {
      if (mx === r) hd = 60 * (((g - b) / (mx - mn)) % 6);
      else if (mx === g) hd = 60 * ((b - r) / (mx - mn) + 2);
      else hd = 60 * ((r - g) / (mx - mn) + 4);
    }
    hue.push((hd + 360) % 360);
    if (mn > 247) white++;
    if (mx < 8) black++;
    n++;
  }
  const so = ls.slice().sort((a, b) => a - b);
  const mean = ls.reduce((a, b) => a + b, 0) / n;
  const q = (p) => so[Math.min(so.length - 1, Math.floor(p * so.length))];
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    n, mean: +mean.toFixed(1), std: +Math.sqrt(ls.reduce((a, b) => a + (b - mean) ** 2, 0) / n).toFixed(1),
    p1: +q(0.01).toFixed(0), p50: +q(0.5).toFixed(0), p99: +q(0.99).toFixed(0),
    meanR: +avg(rs).toFixed(1), meanG: +avg(gs).toFixed(1), meanB: +avg(bs).toFixed(1),
    sat: +avg(sat).toFixed(3), hue: +avg(hue).toFixed(1),
    whitePct: +(100 * white / n).toFixed(4), blackPct: +(100 * black / n).toFixed(4),
  };
}

function downsample(img, targetW) {
  const k = Math.max(1, Math.round(img.w / targetW));
  const w = Math.floor(img.w / k), h = Math.floor(img.h / k);
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const i = ((y * k + dy) * img.w + (x * k + dx)) * img.ch;
      r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2];
    }
    const n = k * k, o = (y * w + x) * 3;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
  }
  return { w, h, ch: 3, data: out };
}

/** speckle: |px - 3x3 median| >= thr, on the full-resolution image */
function speckle(img, rect, thr = 35) {
  const [x0, y0, ww, hh] = rect || [1, 1, img.w - 2, img.h - 2];
  let bad = 0, n = 0;
  const lum = new Float32Array(img.w * img.h);
  for (let i = 0; i < img.w * img.h; i++) lum[i] = L(img.data[i * img.ch], img.data[i * img.ch + 1], img.data[i * img.ch + 2]);
  const buf = new Array(9);
  for (let y = Math.max(1, y0); y < Math.min(img.h - 1, y0 + hh); y++) {
    for (let x = Math.max(1, x0); x < Math.min(img.w - 1, x0 + ww); x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) buf[k++] = lum[(y + dy) * img.w + (x + dx)];
      buf.sort((a, b) => a - b);
      if (Math.abs(lum[y * img.w + x] - buf[4]) >= thr) bad++;
      n++;
    }
  }
  return { pct: +(100 * bad / n).toFixed(4), n };
}

const file = process.argv[2];
const img = readPNG(file);
const rects = [];
for (let i = 3; i + 3 < process.argv.length + 1; i += 4) {
  if (process.argv[i] === undefined) break;
  rects.push([+process.argv[i], +process.argv[i + 1], +process.argv[i + 2], +process.argv[i + 3]]);
}
const small = downsample(img, 480);
const out = { file, size: [img.w, img.h], frame480: stats(small), speckleFull: speckle(img), crops: {} };
for (const r of rects) out.crops[r.join(',')] = { ...stats(img, r), speckle: speckle(img, r).pct };
console.log(JSON.stringify(out, null, 1));
