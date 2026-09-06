// Cost model, placement metadata and the rule constants for the tools module — one exported table so
// the numbers are readable in one place (module spec §4 item 8 / §6 "Assumptions").
//
// Money never touches world.economy directly: every charge goes through
// ctx.modules.simulation.spend(a) and every refund through .earn(a) (spec §7). With simulation
// absent nothing is charged and `affordable` is true.

/** Road price, ¢ per 100 m (spec §6 assumption), converted to ¢/m at use. */
export const ROAD_PER_100M = {
  street: 240,
  street_oneway: 220,
  avenue: 520,
  highway: 1180,
  alley: 120,
  gravel: 80,
  ramp: 900,
};

/** ¢ per metre, derived. */
export function roadPerMetre(type, oneWay) {
  if (type === 'street' && oneWay) return ROAD_PER_100M.street_oneway / 100;
  return (ROAD_PER_100M[type] ?? ROAD_PER_100M.street) / 100;
}

/** Multipliers applied on top of the per-metre price. */
export const ROAD_MULT = {
  bridge: 3.4,      // any row of the segment over water
  slope: 1.8,       // per unit of |grade| above 4 %  (cost *= 1 + slope*(|g|-0.04))
  elevated: 2.6,    // |elevation| > 1 m
};

/** Hard rules the road evaluator enforces (spec §4 item 8). */
export const RULES = {
  maxGrade: 0.12,          // 12 %
  maxGradeHighway: 0.08,   // 8 %
  minSegment: 8,           // m
  mapBound: 1024,          // ±m
  waterElevation: 4,       // a segment may cross water only when elevation ≥ this
  minSharedAngle: 25,      // degrees between two roads meeting at one node
  nodeSnap: 12,            // m — magnet radius for existing nodes
  edgeSnap: 10,            // m — magnet radius for road centrelines (T junctions)
  angleStepDeg: 15,        // angle snap increment
  angleEngageDeg: 3.5,     // engages only this close to a step
  gridSnap: 8,             // m
  serviceRoadReach: 24,    // m — a service must be within this of a road
  maxCut: 16,              // m of cut/fill before a segment is rejected
  ghostLift: 0.15,         // m the ghost ribbon floats above the ground (spec band 0.10–0.20)
  ghostSample: 2,          // m — centreline resample step (spec ≤ 2)
};

/** Exact reason strings (spec §4 items 8/18/19) — these are what the reason chip prints. */
export const REASON = {
  noRoad: 'No road access',
  props: 'props placement unavailable',
  service: 'service placement unavailable',
  funds: 'Not enough funds',
  water: 'Cannot end in water',
  crossWater: 'Crosses water — raise elevation to 4 m',
  bounds: 'Outside the map',
  uneven: 'Terrain too uneven',
  onWater: 'Cannot build on water',
  empty: 'Drag to draw',
};

/** Bulldoze prices (a demolition costs a little; a road refunds a fraction of its build price). */
export const DEMOLISH = {
  building: 120,
  prop: 15,
  service: 0,
  roadRefund: 0.10,     // spec §6: 10 % refund on demolished roads
  propRefund: 0.25,     // 25 % on props
  serviceRefund: 0.35,
};

/** Terrain sculpting: ¢ per cubic metre of earth moved (spec §6: 1.5). */
export const TERRAIN_COST_PER_M3 = 1.5;

/** Zone cell price, ¢ per 8 m cell (spec §6: 8 low / 20 high). */
export const ZONE_COST = { low: 8, high: 20 };

/** Prop prices, keyed by world.props.kinds. */
export const PROP_COST = {
  tree_oak: 60, tree_pine: 60, tree_birch: 60, bush: 25, planter: 55, hedge: 30,
  streetlamp: 180, trafficlight: 700, bench: 90, bin: 40, sign: 50, bus_stop: 320,
  hydrant: 70, fence: 30,
};

/**
 * Service building metadata. Keys match world.services.kinds; anything not listed falls back to
 * DEFAULT_SERVICE so a services module that adds kinds still gets a sane ghost. When a real
 * `services` module lands, ctx.modules.services.footprintOf/coverageOf/costOf win over this table.
 *   w/d       footprint in metres (w along the road frontage, d away from it)
 *   h         ghost box height
 *   coverage  service radius in metres (0 = network/grid service, no circle)
 */
export const DEFAULT_SERVICE = { label: 'Service', cost: 10000, w: 32, d: 26, h: 10, coverage: 120, upkeep: 400 };

export const SERVICES = {
  power_coal: { label: 'Coal Power Plant', cost: 65000, w: 68, d: 48, h: 26, coverage: 0 },
  power_wind: { label: 'Wind Turbine', cost: 12000, w: 16, d: 16, h: 62, coverage: 0 },
  power_solar: { label: 'Solar Farm', cost: 42000, w: 72, d: 56, h: 5, coverage: 0 },
  water_pump: { label: 'Water Pumping Station', cost: 12000, w: 26, d: 22, h: 9, coverage: 0 },
  sewage: { label: 'Sewage Outlet', cost: 14000, w: 30, d: 24, h: 8, coverage: 0 },
  landfill: { label: 'Landfill Site', cost: 20000, w: 64, d: 52, h: 12, coverage: 0 },
  incinerator: { label: 'Incineration Plant', cost: 45000, w: 48, d: 38, h: 30, coverage: 0 },
  clinic: { label: 'Medical Clinic', cost: 18000, w: 30, d: 24, h: 11, coverage: 130 },
  hospital: { label: 'Hospital', cost: 60000, w: 54, d: 42, h: 24, coverage: 240 },
  school: { label: 'Elementary School', cost: 15000, w: 46, d: 36, h: 12, coverage: 160 },
  high_school: { label: 'High School', cost: 32000, w: 58, d: 44, h: 15, coverage: 200 },
  university: { label: 'University', cost: 90000, w: 82, d: 62, h: 22, coverage: 300 },
  police: { label: 'Police Station', cost: 22000, w: 34, d: 28, h: 12, coverage: 180 },
  fire: { label: 'Fire Station', cost: 24000, w: 36, d: 28, h: 14, coverage: 190 },
  park_small: { label: 'Small Park', cost: 4000, w: 26, d: 26, h: 4, coverage: 90 },
  park_large: { label: 'Large Park', cost: 18000, w: 58, d: 48, h: 6, coverage: 150 },
  plaza: { label: 'City Plaza', cost: 6000, w: 34, d: 34, h: 3, coverage: 80 },
};

export function serviceDef(kind, modules) {
  const svc = modules?.services;
  const base = SERVICES[kind]
    ? { ...DEFAULT_SERVICE, ...SERVICES[kind], kind }
    : { ...DEFAULT_SERVICE, kind, label: String(kind || 'service').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
  // prefer a real services module the day it publishes these (flat, guarded — never `.api`)
  if (typeof svc?.footprintOf === 'function') { const f = svc.footprintOf(kind); if (f?.w) { base.w = f.w; base.d = f.d; if (f.h) base.h = f.h; } }
  if (typeof svc?.coverageOf === 'function') { const c = svc.coverageOf(kind); if (Number.isFinite(c)) base.coverage = c; }
  if (typeof svc?.costOf === 'function') { const c = svc.costOf(kind); if (Number.isFinite(c)) base.cost = c; }
  return base;
}

/** Formats a price the way the CS2 HUD does: ¢1 240 (thin spaces, no decimals). */
export function money(n) {
  const v = Math.round(Math.abs(Number.isFinite(n) ? n : 0));
  const s = v.toLocaleString('en-US').replace(/,/g, ' ');
  return (n < 0 ? '-¢' : '¢') + s;
}
