# Democity r8k — Northbank silo articulation

**Decision: accepted as a small static rendering improvement. Democity and whole-game remain 6.0/10 FAIL.**

## Diagnosis and change

Four matched baseline views showed the three existing saved Northbank silo records as pale banded cylinders with little construction detail. The Democity landmark renderer now keeps each vessel, conical roof and four horizontal bands, then adds fixed vertical seams, a coarse access fitting, a small landing and a roof vent. Every piece is derived from the same saved record, remains inside its 14×18 m footprint and merges into the existing owner chunk.

The change adds no RNG, camera branch, material, ID, world record, simulated storage, cargo, worker, vehicle, public API or save field. It does not establish silo or port operation. The access rungs are spaced 1.45 m apart and therefore read as schematic ribs rather than realistic human maintenance infrastructure.

## Verification

- Production build passes with 163 transformed modules.
- The before/after profiles contain exactly the same 13 landmark records. Owner accounting stays at eight draws and rises 6,760→7,912 triangles (+1,152), exactly +384 for each of three silos.
- Public API, double deserialize, eight tour stops, invalid-tour rejection, all 32 mixed-use owner records and the recorded exact 1337→7→1337→7 authored restage pass with zero errors.
- All four baseline and four candidate directed images are zero-error. The fittings are visible in both day and night, including the wider camera. The ordinary bridge view also shows the change.
- All 16 final High/Metal images are ready and zero-error. They peak at 469 draws and 2,814,092 triangles. Minimum sampled FPS is 46.5 with 2/16 below 50. Raw endpoint heap peaks at 732.4 MB. Draw and geometry gates pass; FPS and raw endpoint heap do not become performance-pass claims.
- The independent critic inspected all 24 original PNGs, all sidecars and the contact sheet, independently replayed the renderer geometry, and accepted the bounded visual change without a score increase.

## Limits

The three vessels remain widely separated on isolated lawns/pads. Their pale material, coarse access fittings and missing handling connections keep rank 5 open. No motion, weather, 720p, blind comparison, forced-GC memory run, full whole-game re-review or human playtest is supplied.

Evidence:

- `shots/democity/r8k-silo-diagnosis/`
- `shots/democity/r8k-silo-contract/`
- `shots/democity/r8k-silo-final/`
- `docs/critic/democity_r8k.md`
- `docs/critic/democity_r8k.json`
