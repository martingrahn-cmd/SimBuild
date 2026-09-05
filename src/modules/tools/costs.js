// Cost model + placement metadata for the tools module.
// Road prices are per metre; service prices are per building. Everything is charged to
// world.economy.money by the tool that spends it.

/** Cost per metre of road, by world.roads type. */
export const ROAD_COST = {
  alley: 14,
  gravel: 9,
  street: 24,
  avenue: 48,
  highway: 96,
  ramp: 72,
};

/** Multipliers applied on top of the per-metre price. */
export const ROAD_MULT = {
  bridge: 3.4,      // any row of the segment over water
  slope: 1.8,       // per unit of |grade| above 4 %  (cost *= 1 + slope*(|g|-0.04))
  elevated: 2.6,    // |elevation| > 1 m
};

/** Bulldoze prices (a demolition costs a little; a road refunds a fraction of its build price). */
export const DEMOLISH = {
  building: 120,
  prop: 15,
  service: 0,        // services refund instead (see SERVICE_REFUND)
  roadRefund: 0.18,  // fraction of build cost returned
  serviceRefund: 0.35,
};

/** Terrain sculpting: ¢ per cubic metre of earth moved. */
export const TERRAIN_COST_PER_M3 = 0.28;

/** Zoning is free in CS2; we keep it free but still report the cell count in the preview chip. */
export const ZONE_COST_PER_CELL = 0;

/** Prop prices, keyed by world.props.kinds. */
export const PROP_COST = {
  tree_oak: 60, tree_pine: 60, tree_birch: 60, bush: 25, planter: 55, hedge: 30,
  streetlamp: 180, trafficlight: 700, bench: 90, bin: 40, sign: 50, bus_stop: 320,
  hydrant: 70, fence: 30,
};

/**
 * Service building metadata. Keys match world.services.kinds; anything not listed falls back to
 * DEFAULT_SERVICE so a services module that adds kinds still gets a sane ghost.
 *   w/d       footprint in metres (w along the road frontage, d away from it)
 *   h         ghost box height
 *   coverage  service radius in metres (0 = network/grid service, no circle)
 *   frontage  metres of road that must be within reach of the footprint edge
 */
export const DEFAULT_SERVICE = { label: 'Service', cost: 10000, w: 32, d: 26, h: 10, coverage: 200, frontage: 30, upkeep: 400 };

export const SERVICES = {
  power_coal:  { label: 'Coal Power Plant',   cost: 65000, w: 68, d: 48, h: 26, coverage: 0,   frontage: 40 },
  power_wind:  { label: 'Wind Turbine',       cost: 12000, w: 16, d: 16, h: 62, coverage: 0,   frontage: 60 },
  power_solar: { label: 'Solar Farm',         cost: 42000, w: 72, d: 56, h: 5,  coverage: 0,   frontage: 45 },
  water_pump:  { label: 'Water Pumping Station', cost: 12000, w: 26, d: 22, h: 9, coverage: 0, frontage: 30 },
  sewage:      { label: 'Sewage Outlet',      cost: 14000, w: 30, d: 24, h: 8,  coverage: 0,   frontage: 30 },
  landfill:    { label: 'Landfill Site',      cost: 20000, w: 64, d: 52, h: 12, coverage: 0,   frontage: 40 },
  incinerator: { label: 'Incineration Plant', cost: 45000, w: 48, d: 38, h: 30, coverage: 0,   frontage: 35 },
  clinic:      { label: 'Medical Clinic',     cost: 18000, w: 30, d: 24, h: 11, coverage: 280, frontage: 26 },
  hospital:    { label: 'Hospital',           cost: 60000, w: 54, d: 42, h: 24, coverage: 540, frontage: 34 },
  school:      { label: 'Elementary School',  cost: 15000, w: 46, d: 36, h: 12, coverage: 320, frontage: 30 },
  high_school: { label: 'High School',        cost: 32000, w: 58, d: 44, h: 15, coverage: 440, frontage: 34 },
  university:  { label: 'University',         cost: 90000, w: 82, d: 62, h: 22, coverage: 720, frontage: 40 },
  police:      { label: 'Police Station',     cost: 22000, w: 34, d: 28, h: 12, coverage: 400, frontage: 28 },
  fire:        { label: 'Fire Station',       cost: 24000, w: 36, d: 28, h: 14, coverage: 420, frontage: 28 },
  park_small:  { label: 'Small Park',         cost: 4000,  w: 26, d: 26, h: 4,  coverage: 150, frontage: 22 },
  park_large:  { label: 'Large Park',         cost: 18000, w: 58, d: 48, h: 6,  coverage: 280, frontage: 30 },
  plaza:       { label: 'City Plaza',         cost: 6000,  w: 34, d: 34, h: 3,  coverage: 130, frontage: 26 },
};

export function serviceDef(kind) {
  const d = SERVICES[kind];
  if (d) return { ...DEFAULT_SERVICE, ...d, kind };
  return { ...DEFAULT_SERVICE, kind, label: String(kind || 'service').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
}

/** Formats a price the way the CS2 HUD does: ¢1 240 (thin spaces, no decimals). */
export function money(n) {
  const v = Math.round(Math.abs(n));
  const s = v.toLocaleString('en-US').replace(/,/g, ' ');
  return (n < 0 ? '-¢' : '¢') + s;
}
