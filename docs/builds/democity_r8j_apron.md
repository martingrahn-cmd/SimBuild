# Democity r8j — Northbank hardstand detail

**Decision: accepted as a small local surface improvement. Democity and whole-game remain 6.0/10 FAIL.**

## Diagnosis

The existing saved `port-7` / `Northbank apron 8` record rendered as a pale 46×30 m slab with five faint divisions. Directed day/night views and the ordinary bridge preset showed it as an empty, weakly bounded hardstand. It was visually isolated from the cranes, shore and nearby industry.

## Bounded change

The Democity landmark renderer keeps the same saved record, footprint, position, heading, terrain seat, material owner and merged chunk. It replaces the 0.06 m slab with a darker 0.12 m hardstand, strengthens its five divisions and adds two edge beams, five fixed wheel stops and seven small fixed posts. Every added part is deterministic and remains inside the existing footprint.

This is static landmark detail. It does not add cargo, ships, parking allocation, crane operation, economic behavior, collision, driveability or a functioning quay. It adds no world records, IDs, RNG calls, camera branches, services, vehicles or public API state.

The exact prior branch contained the slab plus five marking boxes. Its apron geometry was 72 triangles. The accepted branch is 660 triangles, so the complete 13-record landmark owner rises from 6,172 to 6,760 triangles (+588) while remaining at eight merged draws.

## Verification

- Production build passes with 163 transformed modules.
- All 13 landmark records, including dimensions, positions, headings and IDs, match before and after. Owner accounting is 8→8 draws and 6,172→6,760 triangles.
- Public API, double deserialize, tour checks and exact repeated seed-1337/seed-7 authored restage pass. Counts remain 468 road nodes, 604 edges, 9,964 cells, 612 lots/buildings, 31 services and one line with eight stops. All 32 mixed-use owner records match across the supplied restore cycle.
- Four matched baseline and four candidate custom views are zero-error. The ordinary bridge preset also shows the surface change, so the result is not dependent on the custom camera.
- All 16 final High/Metal frames are ready with zero errors. They peak at 469 draws and 2,809,484 triangles. Minimum sampled FPS is 46.2; 7/16 are below 50. Maximum raw endpoint heap is 730.3 MB, and the largest sampled module endpoint is props at 2.2 ms. These remain failed performance evidence, not improvement claims.
- The independent critic inspected all 26 original PNGs, all sidecars, summaries and the contact sheet. It accepts the hardstand as a small legitimate rendering improvement and keeps rank 5 open.

## Limits

The apron remains empty and disconnected from the water and crane pads. The three nearby silos remain plain cylinders, site boundaries remain abrupt, and no operating port system is proven. There is no fresh weather, motion, human playtest, blind comparison, forced-GC heap run or full whole-game critic. The score stays 6.0/10.

Evidence:

- `shots/democity/r8j-site-diagnosis/`
- `shots/democity/r8j-site-contract/`
- `shots/democity/r8j-site-final/`
- `docs/critic/democity_r8j.md`
- `docs/critic/democity_r8j.json`
