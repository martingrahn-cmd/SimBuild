# Democity R8u — actual zoning slot/claim-order replay

## Decision

Accept the diagnostic only; no product or score change. The public zoning replay exactly reconstructs612/648 real lots from the ordered full-depth slot runs and explains why R8t's stored-owner component model was too strict. It also exposes a small real cell-membership integrity defect for a later bounded owner fix. Democity and whole-game remain **6.0/10 — FAIL**.

## Method

`tools/parcel-slot-order-profile.mjs` opens disposable accepted-source seed1337 and seed7 Democity pages, calls the zoning owner's public `diagnose()` method, and persists:

- every ordered edge and both side-slot strings as observed during the real claim pass;
- every reconstructed full-depth same-class run and its fixed-width quotient;
- complete post-replay lot records with every raw cell reference and its stored class/edge/side/depth metadata;
- before/after public lot digests, within-lot duplicates and cross-lot overlaps.

The replay runs on disposable pages because `diagnose()` internally regenerates lots and advances its private allocation work even when public lot records match. No product or saved user state is changed.

## Exact replay

| Accepted world | Ordered edges | Full-depth runs | Eligible frontage slots | Calculated lots | Real lots/buildings |
|---|---:|---:|---:|---:|---:|
| seed1337 |569|730|2,048|612|612/612|
| seed7 |611|717|2,116|648|648/648|

The calculated `sum(floor(runLength / fixedClassWidth))` equals the real lot count exactly for both seeds. Before/after public lot digests, lot counts and building counts are equal. Both pages have zero browser/runtime errors.

The run inventory also contains419/394 slots in individually too-short full-depth runs,640/611 quotient remainder slots,1,578/1,663 classed slots too shallow for their fixed depth, and3,718/4,073 null/unpainted slot samples. Remainder slots are not all unused: the real corner/end logic can absorb some into enlarged lots. These counts do not form a counterfactual yield claim.

## Why R8t was conditional

The real sampler selects raster cells by matching class, available depth and prior claim state. It does not require each cell's stored nearest-road `edgeId`, `side` or `depth` to match the lot road. The complete membership evidence measures:

| Membership measure | seed1337 | seed7 |
|---|---:|---:|
| Raw cell references |4,889|5,184|
| Unique references within each lot |4,884|5,178|
| References with another stored edge owner |1,361|1,496|
| References with another stored side |754|773|
| Class mismatches |0|0|
| References beyond fixed preferred depth |0|0|

This directly invalidates using R8t's stored-edge/side components as a ceiling while confirming that class and depth remain intact.

## Newly exposed membership defect

The accepted splitter emits5/6 repeated cell references within individual lot arrays. One lot per seed has fewer unique raster cells than the nominal class cell area. More materially, **two raster cells per seed are referenced by two adjacent lots**:

- seed1337: cells `63,98` and `64,98`, shared by residential-low lots235/236 on edge444 left;
- seed7: cell `125,85`, shared by residential-high lots63/64 on edge443 left, and `12,146`, shared by residential-low lots379/380 on edge685 right.

Each affected pair remains at or above its nominal unique-cell area if the later lot relinquishes the overlap. The defect occurs because `_slots()` is computed before `genEdge()` returns all lots for that edge; the global claimed map is updated only afterward. Quantized neighbouring longitudinal slots can therefore repeat a raster key inside the same edge batch.

This is a real zoning ownership issue, not a city-scale improvement. Any fix must deduplicate within the edge batch while preserving lot count, first cell/stable lot key, building links, exact restage and visual zoning boundaries. It must be rejected if IDs or building/economy state change.

## Rank1 implication and limits

The exact replay proves there is no hidden arithmetic undercount in the current run splitter: its fixed-width quotients produce precisely the current lot table. It does not prove that different edge order, sampling, roads or class assignments cannot produce more legal runs. No counterfactual is tested, so no route to1,200/1,400 is claimed or ruled out.

The full raw topology is now retained, correcting R8t's evidence gap. The pass flag covers zero errors, equal public before/after lot digest, and exact calculated/real count equality. It does not pass city scale, visuals, performance, memory, API/restage or playability. No screenshots are needed because the diagnosis makes no visual claim.

Evidence: `shots/democity/r8u-slot-order/profile.json` and `tools/parcel-slot-order-profile.mjs`.
