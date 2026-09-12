# Democity r7s scale-layout candidates rejected

r7s revisits the highest-ranked city-scale failure using only real road, zoning and building owners. The accepted seed-1337 baseline has 468 road nodes, 604 edges, 9,964 zoned cells and 612 occupied lots/buildings. Every lot is occupied. The target remains 11,000 cells, 1,400 lots and 1,200 buildings.

The first candidate replaces the 80 m street grid with a denser 64 m grid and removes outer midpoint splits. It creates 515 nodes and 759 edges, but shorter frontage runs lose usable length to real intersection trims. The result falls to 9,561 cells and 573 occupied lots/buildings. It is rejected.

The second candidate restores the 80 m grid and removes only the outer midpoint splits. Longer uninterrupted frontage raises occupied lots/buildings from 612 to 695, but nodes fall from 468 to 342, below the 400-node gate. It remains far below 1,200/1,400 and therefore does not justify its topology change. Prior verified 80–96 m no-split trials likewise topped out below the building/lot target.

Both candidates use actual roads, zoning lots and spawned buildings; neither adds labels, filler geometry or duplicate stock. Both are fully reverted. A real scale pass needs a coordinated frontage/lot-layout design that can use substantially more of the painted cell stock, plus measured building/render storage that preserves the current 509.1MB and 3M gates. That is a multi-owner redesign without current evidence for a safe bounded change, so rank1 remains open and Democity stays **6.0 FAIL**.

Evidence: `shots/democity/r7s-layout-64/cityscale.json`, `shots/democity/r7s-layout-80-nosplit/cityscale.json`, `shots/democity/r7s-layout-restored/cityscale.json`.
