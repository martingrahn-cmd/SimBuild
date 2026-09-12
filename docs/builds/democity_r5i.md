# Democity r5i build record — 2026-09-08

r5h's main-pass attribution identified services as the next owned geometry cost. r5i adds a render-only distance representation in the services renderer. Each existing service chunk keeps its detailed geometry within 800 m of the active camera and switches beyond that distance to a low-detail mesh generated from the same service IDs, catalogue footprints, positions and headings. The services owner retains placement, payment, coverage, serialization and determinism; no facility is removed or fabricated.

The initial 480 m candidate was inspected and rejected during implementation: it made several distant facilities read as plain monolithic boxes in aerial noon. The integrated 800 m distance preserves the inspected aerial, night and street composition while still removing distant detail outside the useful main view. This rejected threshold is retained in the raw r5i captures and is not treated as evidence for the integrated result.

## Verification

- Production build passes: 163 modules; `git diff --check` passes.
- Directed 800 m captures are zero-error and were inspected: aerial noon/night, street noon and golden-hour skyline. The selected aerial noon measures 641 draws / 3,210,248 triangles / 34.4 fps; the night aerial retains city form.
- Standard Metal matrix: [summary](../../shots/democity/r5i/summary.json), **16/16 ready, 0 errors**, maximum **812 draws / 3,909,080 triangles / 29.2 fps**. This reduces the r5g 3,943,946-triangle maximum by 34,866 (0.88%); the full triangle and 50 fps gates still fail.
- Public Democity probe: [apicheck](../../shots/democity/r5i/apicheck.json). All 13 documented methods remain functions; two deserialize calls pass; all eight tour calls pass; invalid tour remains false; internal and browser error lists are empty. The primary census remains 612 buildings, 31 services, 503/507 utility-covered and 306/507 health-and-education-covered homes.
- Exact authored-state cycle: [restage-cycle](../../shots/democity/r5i/restage-cycle.json) passes 1337→7→1337→7 for both repeated seeds, with no errors. Heap samples (732.3, 1117.8, 1171.3, 1184.9 MB) remain session-volatile and do not establish a heap reduction.

## Limits

This is a bounded geometry reduction, not a visual-quality or game-scale completion. The 3M / 50 fps / 512 MB gates remain failed; golden-hour wash, sparse activity, seating/clearance, city scale and cross-seed fresh-page inequivalence remain open. The candidate does not justify a score change.
