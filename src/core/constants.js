// Units: 1 unit = 1 metre. +Y up. +X east, -Z north.
export const WORLD_SIZE = 2048;
export const HALF_WORLD = WORLD_SIZE / 2;
export const SEA_LEVEL = 0;
export const TILE_SIZE = 128; // metres, for chunked culling

export const LAYERS = {
  DEFAULT: 0, TERRAIN: 1, ROADS: 2, BUILDINGS: 3, PROPS: 4, VEHICLES: 5,
  WATER: 6, SKY: 7, HELPERS: 8, NO_SHADOW: 9,
};

export const RENDER_ORDER = {
  SKY: -1000, TERRAIN: 0, WATER: 10, ROADS: 20, MARKINGS: 21, BUILDINGS: 30,
  PROPS: 40, VEHICLES: 50, TRANSPARENT: 100, UI3D: 200,
};

export const BUDGET = {
  fps: 50,
  drawCalls: 1500,
  triangles: 3_000_000,
  perModuleDrawCalls: {
    terrain: 20, environment: 15, roads: 80, zoning: 10, buildings: 500, props: 400,
    traffic: 150, effects: 30, simulation: 0, tools: 20, ui: 5, audio: 0, services: 60, infoviews: 5, transit: 20, democity: 50,
  },
};

export const MODULE_NAMES = [
  'terrain', 'environment', 'roads', 'zoning', 'buildings', 'props', 'traffic',
  'effects', 'simulation', 'tools', 'ui', 'audio', 'services', 'infoviews', 'transit', 'democity',
];

export const WAVES = [
  ['environment', 'terrain', 'roads', 'simulation', 'ui', 'audio', 'effects'],
  ['zoning', 'buildings', 'props', 'traffic', 'tools'],
  ['services', 'infoviews'],
  ['democity', 'transit'],
];

export const QUALITY = {
  low:    { shadowMap: 1024, cascades: 2, anisotropy: 2, pixelRatio: 1,   instanceLod: 0.5, post: false },
  medium: { shadowMap: 2048, cascades: 3, anisotropy: 4, pixelRatio: 1,   instanceLod: 0.75, post: true },
  high:   { shadowMap: 2048, cascades: 3, anisotropy: 8, pixelRatio: 1,   instanceLod: 1,   post: true },
  ultra:  { shadowMap: 4096, cascades: 4, anisotropy: 16, pixelRatio: 1.5, instanceLod: 1.25, post: true },
};
