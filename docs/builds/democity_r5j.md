# Democity r5j build record — 2026-09-08

After r5i, an owner-mask profile of the real aerial-night main pass measured roads at 1,168,784 triangles. Component attribution showed 988,150 of those triangles in `roads/concrete`; asphalt, gravel and paint were materially smaller. r5j adds a roads-owned render LOD only for distant concrete sidewalls.

The full road accumulator is still built first and still populates the authoritative `PavementSurface`. Road-network topology, traffic surface, height queries, serialisation, terrain conformance and service placement therefore use the identical full geometry. Beyond 800 m from the camera, only concrete's vertical curb, parapet and deck faces are omitted from rendering; horizontal walkable faces remain. The full mesh remains at nearer distances.

## Verification

- Production build passes 163 modules and `git diff --check` passes.
- Directed aerial noon/night, street noon and golden-hour skyline captures are zero-error and were inspected. Distant road form, bridges and close street detail remain readable.
- Standard Metal matrix: [summary](../../shots/democity/r5j/summary.json), **16/16 ready, 0 errors**, maximum **801 draws / 3,909,080 triangles / 34.5 fps**. Aerial noon is 2,848,916 triangles and golden skyline 2,367,106. The street-night maximum remains 3,909,080, so the 3M / 50 fps gates still fail.
- Public Democity probe: [apicheck](../../shots/democity/r5j/apicheck.json). All 13 methods, double deserialize, all eight tour stops and invalid-tour false pass without browser or runtime errors. Primary city census and real service coverage remain 612 buildings, 31 services, 503/507 utilities and 306/507 health-and-education.
- Exact authored-state cycle: [restage-cycle](../../shots/democity/r5j/restage-cycle.json) passes 1337→7→1337→7 for both repeated seeds, with no errors. Heap samples remain volatile (733.0, 1103.8, 1157.0, 1231.4 MB) and are not an improvement claim.

## Limits

r5j improves views where the distant concrete chunks are active, but the worst street-night view is unchanged. It does not justify a score increase or a performance-gate pass. City scale, lighting, visual variety, seating/clearance, activity and fresh-seed lifecycle remain open.
