# Democity r5p bridge-deck contract repair — 2026-09-08

## Change

The roads owner already declared a 4.2 m bridge-clearance floor, but the network's analytic node-plateau sampler recalculated the interpolated deck height after that floor had been applied. The result was a disagreement: the profile debug data said 4.2 m while the real rendered/traffic/pavement surface of authored avenue bridge 982 fell to 2.4016 m above water.

r5p retains the floor in the shared road sampler for water rows. Rendered asphalt, traffic lane samples, `surfaceHeightAt`, road consumers and public sampling now all observe the same deck height. It neither edits terrain under bridges nor changes topology, zoning, services, building data, simulation, save format or authoring.

## Verification

- `npm run build` passes with 163 transformed modules and `git diff --check` passes.
- The new reusable public [bridge probe](../../tools/bridge-clearance-probe.mjs) measures both authored river crossings. Baseline avenue 982 was 2.4016 m; r5p is **4.2800 m** minimum across 28 water samples. Street bridge 983 remains **4.1442 m** across 24 samples. Both exceed the 3.5 m requirement, with zero browser/runtime errors: [candidate evidence](../../shots/democity/r5p/bridge-clearance-candidate2.json).
- The 16-frame Chrome Metal matrix is [16/16 ready with zero errors](../../shots/democity/r5p/summary.json), at 801 max draws / 3,909,080 max triangles / 33.5 min fps. The existing 3M / 50fps gates still fail and no performance gain is claimed.
- Inspected noon and night bridge frames retain road/deck/shore form and no visible discontinuity: [noon](../../shots/democity/r5p/bridge_12_candidate2.png), [night](../../shots/democity/r5p/bridge_22_candidate2.png).
- The new reusable [Democity public contract probe](../../tools/democity-apicheck.mjs) passes all 13 documented methods, double deserialize, all eight tour stops and invalid-tour rejection with zero errors. Census and real service coverage remain 612 buildings, 31 services, 503/507 utility and 306/507 health-and-education: [evidence](../../shots/democity/r5p/apicheck.json).
- Exact authored-state restage remains valid for 1337→7→1337→7: [cycle](../../shots/democity/r5p/restage-cycle.json), with no errors. Heap samples remain session-variable (682.0, 1049.5, 1146.9 and 1204.0 MB), so they are not treated as an improvement.

## Scope limit

This closes the measured avenue-bridge clearance failure only. General building/landmark ground seating, city scale, performance, lighting, activity and cross-seed variation remain open.
