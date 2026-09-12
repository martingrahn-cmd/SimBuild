# Democity r8g — bounded central frontage corridor

**Decision: accepted as a small local improvement. Democity and whole-game remain 6.0/10 FAIL.** The change extends the existing real mixed-use building programme from the nearest 14 eligible central avenue lots to all 32 eligible high-density residential/office avenue lots inside 300 m of `(0,20)`. It adds no decorative buildings, duplicate city layer or second simulation owner.

## Diagnosis

The existing parcel system is the limiting contract. Seed 1337 paints 9,964 zoned cells but only 4,882 are claimed by the 612 valid, occupied lots; 5,082 painted cells remain unclaimed and mean building-footprint coverage is 0.39012. Every valid lot is already occupied. Current zoning specifications require 16×24 m to 32×32 m lots depending on type and density, so shrinking lots below those dimensions would violate the established contract.

The earlier r7s layout scalars are also exhausted: a 64 m grid produced 515 road nodes, 759 edges and only 573 buildings; an 80 m no-split grid produced 342 nodes, 478 edges and 695 buildings. Neither approached the 1,200-building / 1,400-lot target while preserving the 400-node requirement. r8g therefore does not claim to solve city scale.

The current city has 51 eligible high-density residential/office lots on avenues inside 420 m. Of these, 32 are inside 300 m, 41 inside 360 m and all 51 inside 420 m. The previous r8b programme stopped after the nearest 14. r8g removes only that cap and retains the existing eligibility predicate and 300 m boundary.

## Implementation and state effect

The selected lots continue through the buildings owner's public demolition/spawn path, producing real building plans, lot links, capacities and saved mixed-use state. The default city now selects 32 lots: 23 apartments and 9 towers. All 32 carry the existing retail frontage programme and repeat exactly in the supplied digest and restage probes.

This is broader than a facade-only edit. Recreating 18 additional occupied lots allocates new building IDs and can change their deterministic forms and capacities. The standard HUD remains at 8,046 population, while cash changes from 26,429 to 26,397 and net income from 10,862 to 10,099 per day. Simulation rules, service placement, coverage and owner contracts are unchanged, but the resulting city state is not identical to the 14-lot baseline.

## Verification

- Production build passes with 163 transformed modules.
- All 25 original baseline/candidate/matrix PNGs were independently inspected; every sidecar reports zero screenshot errors and all 16 modules ready.
- The corrected 16-frame candidate matrix peaks at 469 draws and 2,808,896 triangles, inside the 1,500-draw and 3-million-triangle limits. Minimum sampled FPS is 35.3 and 15/16 frames are below 50 FPS, so the performance gate remains failed. Raw heap reaches 757.2 MB; this is not forced-GC retained memory and is not used as a leak claim.
- Public API, eight-stop tour, both seed city-scale fixtures, exact cross-seed restage and the separate whole-save atomic rollback fixture pass within their recorded scope. Seed 1337 remains 468 road nodes, 604 edges, 9,964 cells, 612 lots/buildings and 31 services; seed 7 remains 493 nodes, 646 edges, 10,113 cells and 648 buildings.
- The save-atomicity fixture's Transit rejection is intentional. It restores all 14 serialized owners, terrain, time and camera exactly and then completes a valid restore.

## Critic result and limits

The independent critic accepts r8g weakly as a modest local visual improvement. Additional real shop bases improve parts of the central avenue, but altered massing accounts for some of the visible difference and a large stepped foreground form appears in the west comparison. Sparse lawns, repeated crowns and empty blocks remain dominant. The critic keeps **6.0/10, FAIL**, leaves whole-game rank 1 open and records the incomplete 48.996% parcel claim rate.

Evidence:

- `shots/democity/r8g-frontage-diagnosis/parcel-profile.json`
- `shots/democity/r8g-frontage-diagnosis/eligible-frontage.json`
- `shots/democity/r8g-parcel-baseline/`
- `shots/democity/r8g-frontage-candidate/`
- `shots/democity/r8g-frontage-matrix/`
- `docs/critic/democity_r8g.md`
- `docs/critic/democity_r8g.json`
