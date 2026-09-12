# Democity r4 — independent evidence re-review

**Score: 6.0 / 10 — FAIL.** A fresh W4 review reproduces the local verdict. The module is ready and the public contract is intact, but it still misses the visual and performance gates by a wide margin. This record uses a newly captured matrix and a new runtime probe; it does not present the prior local audit as new evidence.

The review is independent in evidence collection and assessment scope within this workspace. It is not a claim that a separate human reviewer performed the work.

## Fresh evidence

- 37 newly captured PNGs were reviewed, including the 16-frame time/camera matrix, all directed district views, a 1280×720 HUD view, repeat/crop evidence, whole-game noon/night, and seed-7 views. Every capture is ready and reports zero console errors (`shots/democity/r4i/`, `shots/democity/r4is7/`).
- The standard matrix peaks at **751 draws / 5,075,465 triangles**; seed 7 peaks at **726 draws / 3,590,651 triangles**. The fresh whole-game night capture is **545 draws / 4,887,305 triangles**. Each exceeds the 3M triangle ceiling.
- The fresh API probe verifies all 13 Democity methods, two successful serialize/deserialize calls, valid eight-stop tour navigation, and zero browser/runtime errors. It reports 612 buildings, 31 services, one transit line and eight stops. Primary coverage is 503/507 = **99.21%** utilities and 306/507 = **60.36%** health-and-education. Fresh seed 7 is 508/517 = **98.26%** utilities and 317/517 = **61.32%** health-and-education (`shots/democity/r4i/apicheck.json`).
- The same probe reports **1,003.7 MB** heap on the primary seed and 985.4 MB on seed 7, above the 512 MB gate.

## Ranked issues

1. **blocker — night lamps read as oversized white discs.** The aerial and whole-game night views turn city lighting into repeated bright circles across road corridors. The result obscures the night scene instead of creating localized, restrained pools. Evidence: `shots/democity/r4i/aerial_22.png`, `shots/democity/r4i/all_aerial_22.png`.
2. **blocker — full-scene geometry and memory fail their gates.** The fresh matrix reaches 5.08M triangles and the whole-game night is 4.89M; heap is about 1.0 GB. These are not a transient single-view result. Evidence: `shots/democity/r4i/summary.json`, `shots/democity/r4i/all_aerial_22.json`, `shots/democity/r4i/apicheck.json`.
3. **major — golden-hour exposure erases skyline form.** At 17:30 a bright near-white field consumes the right side of the skyline, losing building, water and terrain detail. Evidence: `shots/democity/r4i/skyline_17p5.png`.
4. **major — the city remains sparse and repetitive against the CS2 references.** Downtown blocks are separated by large lawns, towers repeat the same façade language, and the street camera exposes simplified foliage and empty frontage. The fresh census remains 612 buildings, about half the 1,200-building city-scale target. Evidence: `shots/democity/r4i/downtown_12.png`, `shots/democity/r4i/street_12.png`, `shots/democity/r4i/suburb_12.png`, `shots/democity/r4i/apicheck.json`.
5. **major — city districts still meet terrain and water schematically.** Bridge approaches, waterfront roads and industrial silhouettes establish zones but retain abrupt joins, broad unused terrain and flat smoke forms. Evidence: `shots/democity/r4i/bridge_12.png`, `shots/democity/r4i/waterfront_17p5.png`, `shots/democity/r4i/industry_12.png`.

## Strengths to preserve

- Primary and seed-7 layouts both load with zero errors and preserve a coherent city, roads, services and transit line.
- The W4 school remains a valid paid service and clears primary shared health-and-education coverage.
- The HUD remains usable at 1280×720 (`shots/democity/r4i/aerial_12_720p.png`).
- Serialize/deserialize, restage and tour navigation pass the fresh contract probe.

## Decision

The score remains **6.0**, with no inferred improvement. The first next-wave Democity work should reduce night emissive footprint and exposure failure while bringing night geometry/heap below budget. Only then should it add denser, more varied real frontage; adding more objects before the cost and lighting fixes would worsen the two blockers.
