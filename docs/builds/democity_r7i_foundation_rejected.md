# Democity r7i terrain-foundation candidates — rejected

r7i tests the required terrain-owner direction for the remaining ground-seating failure without changing production source. Both candidates operate on the real heightfield and real building footprints in disposable pages; neither changes building records or adds decorative geometry.

The first fill-only area pad flattens the grid nodes under each footprint plus the bilinear sampling margin to that footprint's highest source point. It closes the four-corner seating measurement for both seeds, but seed 1337 changes 21,884 terrain cells, intersects 5,337 road cells and raises terrain by up to 10.16 m. Seed 7 changes 23,488 cells, intersects 5,986 road cells and raises terrain by up to 19.82 m. This would materially deform roads, water edges and the city surface and is rejected.

The second candidate touches only the four grid vertices used by each of the eight existing building support samples. It still changes 12,934/13,661 cells, intersects 2,195/2,422 road cells and raises points by up to 8.91/11.80 m. Seed 1337 happens to pass the seating metric, but seed 7 regresses two buildings, including a 3.60 m gap created by overlapping support edits. It is also rejected.

No production source or score changes. The evidence proves that global fill-only pads derived after lot occupation are unsafe at the current road/lot spacing. A future candidate needs coordinated terrain/roads/zoning foundation reservations before road surface and building generation, or an owner-visible retaining/foundation system whose physical top and saved base remain identical. The existing no-penetration building support contract remains active.

Evidence: `shots/democity/r7i-foundation-diagnosis/seed1337.json`, `seed7.json`, `supports-seed1337.json`, and `supports-seed7.json`.
