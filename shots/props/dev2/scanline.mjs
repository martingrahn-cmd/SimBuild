// node shots/props/dev2/scanline.mjs <png> <x0> <y> <x1>   -> luminance along a horizontal 1 px line
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
  const bpp = ch * (bd / 8), stride = w * bpp;
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
    cur.copy(out, y * w * ch); cur.copy(prev); cur = Buffer.alloc(stride);
  }
  return { w, h, ch, data: out };
}

const img = readPNG(process.argv[2]);
const x0 = +process.argv[3], y = +process.argv[4], x1 = +process.argv[5];
const vals = [];
for (let x = x0; x <= x1; x++) {
  const i = (y * img.w + x) * img.ch;
  vals.push(+(0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]).toFixed(1));
}
let maxStep = 0;
for (let i = 1; i < vals.length; i++) maxStep = Math.max(maxStep, Math.abs(vals[i] - vals[i - 1]));
console.log(JSON.stringify({ y, x0, x1, maxAdjacentStep: +maxStep.toFixed(1), values: vals }));
