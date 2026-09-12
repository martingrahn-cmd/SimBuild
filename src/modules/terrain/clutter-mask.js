// Occupied building lots own their ground surfaces. Cache their public rectangles in spatial bins,
// so grass placement avoids paving without scanning every building for every blade.
import { ServiceFootprints } from '../../core/service-footprints.js';
const CELL = 64;
const key = (x, z) => x * 65536 + z;

export class LotClutterMask {
  constructor(world, modules) {
    this.world = world;
    this.modules = modules;
    this.version = -1;
    this.bins = new Map();
    this.services = new ServiceFootprints(world, modules);
  }
  sync() {
    const version = this.world?.buildings?.version ?? 0;
    const servicesChanged = this.services.sync();
    if (version === this.version && !servicesChanged) return false;
    this.version = version;
    this.bins.clear();
    for (const b of this.world?.buildings?.items?.values() || []) {
      const surface = this.modules?.buildings?.lotSurface?.(b.id);
      if (surface) {
        this.add(surface);
        for (const rect of surface.paved || []) this.add(rect);
      }
      // The physical building can extend beyond a lot after a growth/footprint change.
      if (b.footprint) this.add({ x: b.x, z: b.z, heading: b.heading, ...b.footprint });
    }
    // Service headings rotate around +Y; this mask stores a +Z two-dimensional rotation.
    for (const rect of this.services.rects) this.add({...rect, heading: -rect.heading});
    return true;
  }
  add(rect) {
    const { x, z, w, d } = rect;
    if (![x, z, w, d].every(Number.isFinite) || w <= 0 || d <= 0) return;
    const c = Math.cos(rect.heading || 0), s = Math.sin(rect.heading || 0);
    const hw = w / 2 + 0.3, hd = d / 2 + 0.3; // account for blades leaning over the paving edge
    const rx = Math.abs(c) * hw + Math.abs(s) * hd;
    const rz = Math.abs(s) * hw + Math.abs(c) * hd;
    const box = { x, z, hw, hd, c, s };
    for (let ix = Math.floor((x - rx) / CELL); ix <= Math.floor((x + rx) / CELL); ix++) {
      for (let iz = Math.floor((z - rz) / CELL); iz <= Math.floor((z + rz) / CELL); iz++) {
        const k = key(ix, iz);
        let bin = this.bins.get(k);
        if (!bin) this.bins.set(k, bin = []);
        bin.push(box);
      }
    }
  }
  contains(x, z) {
    const bin = this.bins.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!bin) return false;
    for (let i = 0; i < bin.length; i++) {
      const b = bin[i], dx = x - b.x, dz = z - b.z;
      if (Math.abs(b.c * dx + b.s * dz) <= b.hw && Math.abs(b.s * dx - b.c * dz) <= b.hd) return true;
    }
    return false;
  }
}
