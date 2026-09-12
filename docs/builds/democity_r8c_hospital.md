# Democity r8c — Southbank hospital articulation

## Bounded change

The independent whole-game critic's first-ranked remaining asset defect calls out the suburban hospital as a large blank landmark beside otherwise detailed buildings. The original real `Southbank Medical Centre` plan remains at the same position, footprint and terrain seat. Its existing three volumes now carry window bands on the north/east elevations visible from the declared suburb camera, facade mullions, a sheltered public entrance, medical mark, rooftop plant and parapet caps. All parts remain in the existing merged Democity landmark owner mesh; no facility, coverage or simulation record changed.

## Verification

- Production build passes 163 modules.
- The 16-frame 1920×1080 High/Metal matrix is 16/16 ready with zero errors, 473 maximum draws, 2,260,248 maximum triangles and 44.9 minimum sampled fps. The 50fps gate remains failed.
- All 16 frames and the noon/night suburb originals were inspected. The hospital changes from blank white blocks to a recognizable civic building while the surrounding city, water tower, roads and district composition remain intact.
- The 420×320 hospital crop changes 3.86243% normalized MAE; the complete suburb frame changes 0.262984%.
- Democity still serializes the exact same 13-landmark plan and retains eight merged landmark draws. Landmark geometry rises from 4,076 to 4,724 triangles (+648).
- Public API, double deserialize and all eight tour stops pass with zero errors and unchanged counts/coverage. Exact 1337→7→1337→7 restage passes.

Evidence: `shots/democity/r8c-hospital-candidate` and `shots/democity/r8c-hospital`.

## Decision

Accept the hospital articulation. It fixes one close, measured primitive landmark at negligible owner cost without adding showcase-only state. Democity and whole-game remain 6.0 FAIL because the adjacent water tower, port assets and other procedural landmarks remain simple, the city-scale and 50fps gates fail, and foliage, grounding, broad frontage and subjective play remain open.
