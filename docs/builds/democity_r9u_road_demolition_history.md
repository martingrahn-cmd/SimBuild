# Democity R9u — owner-safe road-demolition history

## Local decision submitted for independent review

**Accept the bounded public single-road demolition history repair at the unchanged Democity/whole-game 6.0/10 FAIL score.** This changes player-facing bulldozer correctness, not the authored city, visuals, simulation pacing, road coverage or service behavior.

## Product change

The bulldozer previously deleted an edge and rebuilt it from endpoint coordinates on undo. That lost the saved edge/node allocator and design profile and bypassed terrain, Zoning, Buildings, Simulation and Transit ownership.

R9u snapshots the exact Roads, full Terrain, Zoning and Buildings pre-image after settling any pending Zoning journal. A successful removal rebuilds Roads synchronously, records the exact post-image and then credits the refund. Undo restores the saved graph/profile/allocator and affected owner state; redo restores the exact removed-road graph and terrain. Unchanged stable lots retain their current building links, so later unrelated development is not rewound. A failed inverse compensates from a current owner snapshot and keeps the history leaf and money unchanged.

Roads' public synchronous `rebuild()` now returns its owner result. Terrain restoration propagates a secondary road rebuild failure. A failed initial demolition restores Roads, Terrain, Zoning, Buildings and Simulation before returning false, because the temporary road event has already dirtied Zoning.

## Verification

`shots/democity/r9u-road-demolition-history/verification.json` passes in fresh paused `showcase=all` worlds for seeds 1337 and 7 with zero engine/browser errors.

- Seed 1337 demolishes real street edge 478 with eight frontage lots. Roads change 604→603, lots 612→605 and buildings 612→604; the €21 refund is exact. Undo and redo match complete seven-owner SHA-256 digests and money exactly.
- Seed 7 demolishes real avenue edge 872 with eight frontage lots. Roads change 646→645, lots 648→644 and buildings 648→640; the €46 refund is exact. Undo and redo are exact by the same gate.
- Fresh candidate repeats match all complete owner digests. The retained integrity helper finds no missing live lots or lot→building→lot mismatch in any phase; full reverse uniqueness is not independently established by that helper.
- A later unrelated building level change and Simulation tick 121541 on seed 1337 / 121301 on seed 7 survive undo and redo.
- A real later construction produces building 692 on unchanged lot 51; its full record and inverse `buildingId` link survive both directions.
- A one-shot Zoning refusal during undo and a one-shot secondary road rebuild refusal both compensate to the exact candidate, retain history and money, and permit a later exact undo.
- A one-shot initial road rebuild refusal returns a failed bulldozer action with no history or refund and exact Roads, Terrain, Zoning, Buildings, Simulation, Services and Transit digests.

The production build passes with 163 modules. Public Democity API/double-deserialize/eight-stop tour passes at both seeds. Exact seed-7 fresh/restage counts and stored hashes pass, with zero terrain differences above the probe's 1e-6 threshold over 263,169 values. The forced late Transit save refusal restores all 14 canonical modules, time and camera exactly; its single expected error is retained.

All eight original before/after images and four amplified differences were inspected, including all four candidate originals at full resolution. The real removed segments, dependent buildings and lots disappear without floating road geometry, orphan buildings or stale parcel borders. Traffic, foliage and UI vary between captures, so whole-frame image differences are not a road-only quality metric.

## Frozen evidence

- Source manifest: `shots/democity/r9u-road-demolition-history/source/source-hashes.json`; every named copy equals live source.
- Tools `923ca9c86e65f3ca5c92e69c11d98b874c677dfdab2f74f2073ce2e47409741c`; Roads `10236c24ec7042e6798b15bcd70c4cfb8d839cef2edc364e73f4590280fda2ad`.
- Verification `1af9ee9ad549cb38f45e64317f3ad6d3a1a77cdb0eda0600e0c577546289e46c`; build `58ab83da71bb4fef1a3ad62557a81eb11f69c8c2dcd77de3c378d1c46f739976`; contact sheet `cf75b57155dcbaa707407642af6c00d0c0424e29410827a0b0ab26d33006fe86`.

## Limits and next work

The positive scope is a public single-road bulldozer action on one straight street and one straight avenue. The retained integrity helper checks missing live lots and the lot→building→lot direction, but does not independently rule out duplicate Buildings on one lot; the exact full-owner hashes prove transaction equality against their compared states, while raw post-later owner arrays are not retained for a new offline reverse-link audit. Marquee groups, curved roads, persistent/second failures during compensation, thrown late owner failures, native pointer input, long unpaused growth, save/load with a pending history stack, night/weather, timing, GPU, heap and whole-game visual gates are not established. Initial road-*construction* rebuild failure remains outside this round.

Independent review must accept or reject this exact frozen source and evidence before STATUS/HANDOFF advance. If accepted, the next correctness priority is a bounded audit of marquee demolition grouping and compensation; the broader 6.0 city-scale, ground-seating, lighting and 50 fps failures remain ranked open.
