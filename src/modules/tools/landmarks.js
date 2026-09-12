import { propBounds } from './footprints.js';

const overlaps = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
function inside(p, poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
}

// Measurement-only work, called on demand by cropRects, never in update. Reject conservatively:
// a projected foliage envelope may contain empty leaf-card pixels, but is not a clean wash sample.
export function washCrop(S, project, width, height) {
  const wash = S.landmark.wash;
  if (!wash) return null;
  const T = S.ctx.world.terrain, ring = [];
  for (let i = 0; i < 64; i++) {
    const a = i * Math.PI / 32, x = wash.x + Math.cos(a) * wash.radius * 0.86, z = wash.z + Math.sin(a) * wash.radius * 0.86;
    const p = project(x, T.getHeight(x, z) + 0.2, z);
    if (!p || p[2] > 1) return null;
    ring.push(p);
  }
  const blocked = S.chips.rects().map(r => [r.x - 3, r.y - 3, r.w + 6, r.h + 6]);
  function box(b) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const c = Math.cos(b.heading || 0), s = Math.sin(b.heading || 0);
    for (const u of [-b.w / 2, b.w / 2]) for (const v of [-b.d / 2, b.d / 2]) for (const h of [0, b.height]) {
      const p = project(b.x + u * c - v * s, (b.baseY ?? T.getHeight(b.x, b.z)) + h, b.z + u * s + v * c);
      if (!p || p[2] > 1) continue;
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    if (minX < maxX) blocked.push([minX - 3, minY - 3, maxX - minX + 6, maxY - minY + 6]);
  }
  for (const p of S.ctx.world.props.items.values()) box(propBounds(p, S.ctx.modules));
  for (const b of S.ctx.world.buildings.items.values()) box({ ...b, w: b.footprint.w, d: b.footprint.d, baseY: b.y });
  // Ribbon coverage is a mesh, not its bounding box: the upper half of the node wash remains
  // sampleable even when the road's projected rectangle overlaps the entire blue disc.
  const triangles = [];
  for (const mesh of [S.giz.ghost, S.giz.ghostAlt]) {
    const pos = mesh.mesh.geometry.attributes.position, idx = mesh.mesh.geometry.index;
    for (let i = 0; i < mesh.n * 6; i += 3) {
      const tri = [];
      for (let j = 0; j < 3; j++) { const v = idx.getX(i + j); tri.push(project(pos.getX(v), pos.getY(v), pos.getZ(v))); }
      if (tri.every(p => p && p[2] <= 1)) triangles.push(tri);
    }
  }
  for (const radial of [0.58, 0.42, 0.72]) for (let i = 0; i < 32; i++) {
    const a = i * Math.PI / 16, x = wash.x + Math.cos(a) * wash.radius * radial, z = wash.z + Math.sin(a) * wash.radius * radial;
    const p = project(x, T.getHeight(x, z) + 0.2, z);
    if (!p || p[2] > 1) continue;
    const r = [Math.round(p[0]) - 16, Math.round(p[1]) - 16, 32, 32];
    if (r[0] < 0 || r[1] < 0 || r[0] + 32 > width || r[1] + 32 > height || blocked.some(b => overlaps(r, b))) continue;
    const samples = [];
    for (const dx of [0, 8, 16, 24, 32]) for (const dy of [0, 8, 16, 24, 32]) samples.push([r[0] + dx, r[1] + dy]);
    if (samples.every(q => inside(q, ring) && !triangles.some(t => inside(q, t)))) return r;
  }
  return null;
}

// This uses the identical search and tie-breaking rule formerly used by roadTool.draw.
// It runs only when cropRects is requested and caches until the rendered path changes.
export function ribbonLandmark(S) {
  if (S.landmark.ribbon) return S.landmark.ribbon;
  const path = S.landmark.path;
  if (!path || path.length < 2) return null;
  const rd = S.ctx.world.roads;
  let best = null, bestD = -1;
  for (let i = Math.max(1, Math.floor(path.length * 0.2)); i < path.length - 1; i++) {
    const p = path[i], ne = rd.nearestEdge?.(p.x, p.z, 80);
    const dist = ne ? ne.dist : 80;
    if (dist > bestD) { bestD = dist; best = i; }
  }
  if (best == null) return null;
  const p = path[best], q = path[best + 1] || path[best - 1];
  let dx = q.x - p.x, dz = q.z - p.z;
  const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
  return (S.landmark.ribbon = { x: p.x, z: p.z, width: S.landmark.width, nx: -dz, nz: dx });
}
