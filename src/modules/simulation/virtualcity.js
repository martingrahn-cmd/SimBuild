// Synthetic building stock for the simulation when no buildings/zoning module exists (showcase, tests).
// It answers the economy's growth requests exactly the way a real buildings module would: a request
// becomes a building record with a deterministic footprint, and road length grows with the city.
// Nothing here is rendered; it only feeds Economy.setBuilding / setRoadKm.
import { ZONE_TYPES } from './economy.js';

const FOOTPRINT = {
  residential: { low: [[10, 12, 2], [12, 14, 2], [9, 11, 1]], high: [[22, 24, 8], [26, 26, 12], [20, 30, 6]] },
  commercial:  { low: [[16, 18, 1], [20, 22, 2], [14, 24, 1]], high: [[28, 30, 6], [24, 26, 9], [30, 34, 4]] },
  industrial:  { low: [[30, 40, 1], [36, 48, 1], [24, 32, 2]], high: [[48, 60, 2], [40, 56, 3], [60, 70, 1]] },
  office:      { low: [[18, 20, 3], [22, 24, 4], [16, 26, 3]], high: [[30, 30, 14], [26, 34, 18], [34, 34, 10]] },
};

export class VirtualCity {
  constructor(economy, rng, { maxLots = 1400, roadKmPerLot = 0.028 } = {}) {
    this.eco = economy; this.rng = rng;
    this.maxLots = maxLots; this.roadKmPerLot = roadKmPerLot;
    this.nextId = 1;
    this.ids = [];                  // building ids in creation order
    this.km = { street: 1.2, avenue: 0.6, highway: 0, alley: 0, gravel: 0.4 };
    this.eco.setRoadKm(this.km);
  }
  get count() { return this.ids.length; }
  /** Called with the economy's growth requests after each tick. */
  apply(requests) {
    for (const r of requests) {
      if (this.ids.length >= this.maxLots) return;
      this.spawn(r.type, r.density);                                    // private developers pay, not the city
    }
  }
  spawn(type, density) {
    const fp = this.rng.pick(FOOTPRINT[type][density]);
    const id = `v${this.nextId++}`;
    this.eco.setBuilding({ id, type, density, level: 1, footprint: { w: fp[0], d: fp[1] }, floors: fp[2] }, true);
    this.ids.push(id);
    // roads grow with the city: mostly streets, an avenue every so often, a highway once it is a town
    const n = this.ids.length;
    this.km.street += this.roadKmPerLot * 0.8; this.km.avenue += this.roadKmPerLot * 0.2;
    if (n === 400) this.km.highway += 4.5;
    this.eco.setRoadKm(this.km);
    return id;
  }
  levelUp(id) {
    const rec = this.eco.buildings.get(id);
    if (!rec || !rec.virtual || rec.level >= 5) return false;
    const fp = this.rng.pick(FOOTPRINT[rec.type][rec.density]);
    this.eco.setBuilding({ id, type: rec.type, density: rec.density, level: rec.level + 1, footprint: { w: fp[0], d: fp[1] }, floors: fp[2] + rec.level }, true);
    this.eco.econ.levelUps++;
    return true;
  }
  serialize() { const r = this.rng; return { nextId: this.nextId, ids: this.ids.slice(), km: { ...this.km }, rng: [r.a, r.b, r.c, r.d] }; }
  deserialize(s) {
    this.nextId = s.nextId | 0; this.ids = (s.ids || []).slice();
    if (s.rng) { const r = this.rng; [r.a, r.b, r.c, r.d] = s.rng.map((v) => v | 0); }
    for (const k in this.km) this.km[k] = s.km?.[k] || 0;
    this.eco.setRoadKm(this.km);
  }
}
export { ZONE_TYPES };
