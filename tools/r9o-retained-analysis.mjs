#!/usr/bin/env node
// Offline integrity audit for the retained R9o public-tool staging evidence.
// This never launches or mutates the game; it closes cross-owner checks that the
// original capture recorded enough state to answer but did not summarize.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const input = path.join(root, 'shots/democity/r9o-infill-owner/summary.json');
const output = path.join(root, 'shots/democity/r9o-infill-owner/retained-analysis.json');
const source = JSON.parse(fs.readFileSync(input, 'utf8'));

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function equal(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }

function roadGeometry(snapshot) {
  const nodes = new Map(snapshot.roads.nodes.map((node) => [node.id, node]));
  return snapshot.roads.edges.map((edge) => {
    const a = nodes.get(edge.a), b = nodes.get(edge.b);
    const ends = [[a.x, a.z], [b.x, b.z]].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return {
      ends, type: edge.type, lanes: edge.lanes, oneWay: edge.oneWay,
      elevation: edge.elevation ?? 0, ctrl: edge.ctrl ? [edge.ctrl.x, edge.ctrl.z] : null,
    };
  }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function lotGeometry(snapshot) {
  return snapshot.lots.map((lot) => ({
    x: lot.x, z: lot.z, w: lot.w, d: lot.d, heading: lot.heading,
    type: lot.type, density: lot.density, corner: lot.corner,
    cells: [...lot.cells].sort(),
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function ownerAudit(snapshot) {
  const lotById = new Map(snapshot.lots.map((lot) => [lot.id, lot]));
  const buildingById = new Map(snapshot.buildings.items.map((building) => [building.id, building]));
  const orphanBuildings = snapshot.buildings.items
    .filter((building) => !lotById.has(building.lotId))
    .map((building) => ({ id: building.id, lotId: building.lotId, type: building.type, density: building.density }));
  const unbuiltLots = snapshot.lots
    .filter((lot) => lot.buildingId == null || !buildingById.has(lot.buildingId))
    .map((lot) => ({ id: lot.id, buildingId: lot.buildingId, stableKey: lot.stableKey, type: lot.type, density: lot.density }));
  const mismatchedLinks = snapshot.lots
    .filter((lot) => lot.buildingId != null && buildingById.get(lot.buildingId)?.lotId !== lot.id)
    .map((lot) => ({ id: lot.id, buildingId: lot.buildingId, buildingLotId: buildingById.get(lot.buildingId)?.lotId ?? null }));
  return {
    orphanBuildings, unbuiltLots, mismatchedLinks,
    bijective: orphanBuildings.length === 0 && unbuiltLots.length === 0 && mismatchedLinks.length === 0,
  };
}

function groundSamples(snapshot) {
  return snapshot.terrainSamples.map(({ z, y, slope }) => ({ z, y, slope }));
}

function roadSurfaceSamples(snapshot) {
  return snapshot.terrainSamples.map(({ z, road, surface }) => ({ z, road, surface }));
}

const candidates = source.runs.filter((run) => run.variant === 'candidate' && !run.repeat);
const runs = candidates.map((run) => {
  const phases = Object.fromEntries(['before', 'after', 'undo', 'redo'].map((name) => [name, ownerAudit(run[name])]));
  return {
    seed: run.seed,
    phases,
    physicalRoadRestore: {
      undoMatchesBefore: equal(roadGeometry(run.before), roadGeometry(run.undo)),
      redoMatchesAfter: equal(roadGeometry(run.after), roadGeometry(run.redo)),
    },
    lotGeometryRestore: {
      undoMatchesBefore: equal(lotGeometry(run.before), lotGeometry(run.undo)),
      redoMatchesAfter: equal(lotGeometry(run.after), lotGeometry(run.redo)),
    },
    ownerIndependentRestore: {
      groundTerrainDigestUndo: run.before.terrainHash === run.undo.terrainHash,
      groundTerrainDigestRedo: run.after.terrainHash === run.redo.terrainHash,
      sampledGroundUndo: equal(groundSamples(run.before), groundSamples(run.undo)),
      sampledGroundRedo: equal(groundSamples(run.after), groundSamples(run.redo)),
      sampledRoadSurfaceUndo: equal(roadSurfaceSamples(run.before), roadSurfaceSamples(run.undo)),
      sampledRoadSurfaceRedo: equal(roadSurfaceSamples(run.after), roadSurfaceSamples(run.redo)),
      servicesUndo: equal(run.before.services, run.undo.services),
      servicesRedo: equal(run.after.services, run.redo.services),
      transitUndo: equal(run.before.transit, run.undo.transit),
      transitRedo: equal(run.after.transit, run.redo.transit),
      economyUndo: equal(run.before.economy, run.undo.economy),
      economyRedo: equal(run.after.economy, run.redo.economy),
    },
  };
});

const result = {
  method: 'offline audit of complete retained R9o snapshots; no browser launch or product mutation',
  source: path.relative(root, input),
  runs,
  pass: runs.every((run) =>
    run.phases.before.bijective && run.phases.after.bijective && run.phases.undo.bijective && run.phases.redo.bijective
    && Object.values(run.physicalRoadRestore).every(Boolean)
    && Object.values(run.lotGeometryRestore).every(Boolean)
    && Object.values(run.ownerIndependentRestore).every(Boolean)),
};

fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
