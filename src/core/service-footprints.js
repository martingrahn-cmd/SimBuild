// Read the service owner's oriented pad footprints. Coverage/load-only events do not invalidate
// vegetation: cache geometry separately from world.services.version.
export class ServiceFootprints {
  constructor(world, modules) {
    this.world = world; this.modules = modules; this.version = -1;
    this.key = ''; this.rects = [];
  }
  sync() {
    const version = this.world.services?.version ?? 0;
    if (version === this.version) return false;
    this.version = version;
    const rects = [];
    for (const item of this.world.services?.items?.values() || []) {
      const f = this.modules.services?.footprint?.(item.kind);
      if (!f || ![item.x, item.z, f.w, f.d].every(Number.isFinite) || f.w <= 0 || f.d <= 0) continue;
      const heading = item.heading || 0;
      rects.push({id:item.id,x:item.x,z:item.z,w:f.w,d:f.d,heading,c:Math.cos(heading),s:Math.sin(heading)});
    }
    const key = JSON.stringify(rects.map(r=>[r.id,r.x,r.z,r.w,r.d,r.heading]));
    if (key === this.key) return false;
    this.key = key; this.rects = rects;
    return true;
  }
  contains(x, z, margin = 0) {
    for (const r of this.rects) {
      const dx = x-r.x, dz = z-r.z;
      if (Math.abs(r.c*dx-r.s*dz) <= r.w/2+margin && Math.abs(r.s*dx+r.c*dz) <= r.d/2+margin) return true;
    }
    return false;
  }
}
