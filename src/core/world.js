import * as THREE from 'three';
import { WORLD_SIZE, SEA_LEVEL } from './constants.js';

// Shared world data model. Sections are mutated in place by their owner module and never replaced.
// Every section ships with safe defaults so the app runs even if the owning module failed.
export function createWorld(seed = 1337) {
  const flat = {
    getHeight: () => 0,
    getNormal: (x, z, out) => (out || new THREE.Vector3()).set(0, 1, 0),
    getSlope: () => 0,
    isWater: () => false,
    raycast: (ray) => {
      // plane y = 0 fallback
      const t = -ray.origin.y / ray.direction.y;
      if (!(t > 0)) return null;
      const point = ray.origin.clone().addScaledVector(ray.direction, t);
      return { point, normal: new THREE.Vector3(0, 1, 0) };
    },
    modify: () => {},
  };

  const world = {
    seed,
    size: WORLD_SIZE,
    terrain: {
      resolution: 513,
      cellSize: WORLD_SIZE / 512,
      heights: null,
      seaLevel: SEA_LEVEL,
      version: 0,
      ...flat,
    },
    roads: {
      nodes: new Map(),
      edges: new Map(),
      types: {
        alley:   { width: 8,  lanes: 1, speed: 30, sidewalk: 2 },
        gravel:  { width: 8,  lanes: 2, speed: 30, sidewalk: 0 },
        street:  { width: 16, lanes: 2, speed: 50, sidewalk: 3 },
        avenue:  { width: 24, lanes: 4, speed: 60, sidewalk: 4 },
        highway: { width: 32, lanes: 6, speed: 100, sidewalk: 0 },
      },
      version: 0,
      addNode: () => -1,
      addEdge: () => -1,
      removeEdge: () => {},
      removeNode: () => {},
      nearestEdge: () => null,
      sample: () => null,
      laneCenter: () => null,
      frontage: () => [],
    },
    zones: {
      cellSize: 8,
      cells: new Map(),
      types: ['residential', 'commercial', 'industrial', 'office'],
      densities: ['low', 'high'],
      lots: new Map(),
      version: 0,
      paint: () => {},
      erase: () => {},
      lotsFor: () => [],
      freeLots: () => [],
    },
    buildings: {
      items: new Map(),
      version: 0,
      spawn: () => -1,
      demolish: () => {},
      levelUp: () => {},
      at: () => null,
    },
    props: {
      items: new Map(),
      kinds: ['streetlamp', 'trafficlight', 'tree_oak', 'tree_pine', 'bench', 'bin', 'hydrant', 'sign', 'bus_stop', 'fence', 'bush', 'planter'],
      version: 0,
    },
    traffic: {
      vehicles: new Map(),
      pedestrians: new Map(),
      stats: { count: 0, avgSpeed: 0, congestion: 0 },
    },
    time: { hour: 12, day: 1, speed: 1, paused: false },
    weather: {
      cloudiness: 0.3, rain: 0, wind: { x: 1, z: 0, speed: 2 }, fogDensity: 0.0006, temperature: 18,
      sunDir: new THREE.Vector3(0.3, 0.8, 0.5).normalize(),
      sunIntensity: 3, skyLight: new THREE.Color(0.6, 0.7, 0.9), wetness: 0,
    },
    economy: {
      money: 150000, population: 0, jobs: 0, happiness: 0.5,
      demand: { residential: 0.5, commercial: 0.3, industrial: 0.3, office: 0.2 },
      taxRate: 0.1, history: [],
    },
    services: {
      items: new Map(),
      kinds: ['power_coal', 'power_wind', 'power_solar', 'water_pump', 'sewage', 'landfill', 'incinerator', 'clinic', 'hospital', 'school', 'high_school', 'university', 'police', 'fire', 'park_small', 'park_large', 'plaza'],
      supply: { power: 0, water: 0, sewage: 0, garbage: 0 },
      demand: { power: 0, water: 0, sewage: 0, garbage: 0 },
      version: 0,
      coverage: () => 0,
      place: () => null,
      remove: () => {},
    },
    infoview: { active: null, data: null, legend: null, buildingTint: () => null },
    transit: { lines: new Map(), stops: new Map(), version: 0 },
    selection: { kind: null, id: null },
    flags: { showcase: null, headless: false },
  };
  return world;
}
