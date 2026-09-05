// Critic helper: decode PNGs (8-bit RGB/RGBA, non-interlaced) with zlib and print luminance stats.
// node shots/audio/r1/imgstats.mjs shots/audio/r1/*.png   [--x0 430]  (x0: ignore columns left of it, e.g. the panel)
import fs from 'node:fs';
import zlib from 'node:zlib';

function decode(file) {
  const buf = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, bpp = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported png'); bpp = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : 0; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!bpp) throw new Error('unsupported colour type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp, out = Buffer.alloc(w * h * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    prev = cur;
  }
  return { w, h, bpp, data: out };
}

const args = process.argv.slice(2); let x0 = 0; const files = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--x0') x0 = +args[++i]; else files.push(args[i]); }
const res = {};
for (const f of files) {
  try {
    const { w, h, bpp, data } = decode(f);
    let n = 0, sum = 0, sq = 0, hi = 0, lo = 0, rs = 0, gs = 0, bs = 0;
    // also a mean for the sky band (top 15 %) and ground band (bottom 40 %)
    let skyS = 0, skyN = 0, gndS = 0, gndN = 0;
    for (let y = 0; y < h; y += 2) for (let x = x0; x < w; x += 2) {
      const i = (y * w + x) * bpp; const r = data[i], g = data[i + 1], b = data[i + 2];
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      n++; sum += L; sq += L * L; if (L > 240) hi++; if (L < 8) lo++; rs += r; gs += g; bs += b;
      if (y < h * 0.15) { skyS += L; skyN++; } if (y > h * 0.6) { gndS += L; gndN++; }
    }
    const mean = sum / n, sd = Math.sqrt(sq / n - mean * mean);
    const r = { mean: +mean.toFixed(1), sd: +sd.toFixed(1), pctOver240: +(100 * hi / n).toFixed(2), pctUnder8: +(100 * lo / n).toFixed(2), rgb: [Math.round(rs / n), Math.round(gs / n), Math.round(bs / n)], sky: +(skyS / skyN).toFixed(1), ground: +(gndS / gndN).toFixed(1), bootFrame: sd < 12 && mean < 30 };
    res[f] = r;
    console.log(f.padEnd(44), JSON.stringify(r));
  } catch (e) { console.log(f, 'ERR', e.message); }
}
fs.writeFileSync('shots/audio/r1/imgstats.json', JSON.stringify(res, null, 2));
