import fs from 'node:fs';
import zlib from 'node:zlib';
// Minimal PNG reader: 8-bit RGB/RGBA, non-interlaced. Returns {width,height,data:Uint8Array RGBA}.
export function readPng(file) {
  const buf = fs.readFileSync(file);
  let p = 8, width = 0, height = 0, depth = 0, ctype = 0;
  const chunks = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; if (data[12] !== 0) throw new Error('interlaced png'); }
    else if (type === 'IDAT') chunks.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error('depth ' + depth);
  const ch = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 0 ? 1 : (() => { throw new Error('ctype ' + ctype); })();
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * ch;
  const out = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride); const cur = new Uint8Array(stride);
  let q = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[q++];
    for (let i = 0; i < stride; i++) {
      const x = raw[q + i];
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    q += stride;
    for (let x = 0; x < width; x++) {
      const s = x * ch, d = (y * width + x) * 4;
      out[d] = cur[s]; out[d + 1] = ch === 1 ? cur[s] : cur[s + 1]; out[d + 2] = ch === 1 ? cur[s] : cur[s + 2]; out[d + 3] = ch === 4 ? cur[s + 3] : 255;
    }
    prev.set(cur);
  }
  return { width, height, data: out };
}
