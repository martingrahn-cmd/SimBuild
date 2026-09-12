# Democity R8t — accepted-source parcel-capacity diagnosis

## Decision

No product change. The diagnostic confirms that leftover cells are heavily fragmented and that a naive remainder-only pass has no demonstrated route to the1,200-building /1,400-lot gates. Its component model is stricter than the real splitter, however, so it does not establish a hard capacity ceiling. Rank1 remains open and Democity/whole-game remain **6.0/10 — FAIL**.

## Method

`tools/parcel-capacity-profile.mjs` loads fresh seed1337 and seed7 Democity worlds at1280×720 High/Metal/headless, then reads only public accepted-source roads, zone cells, lots and buildings. It builds the claimed-cell set from real lot records and classifies each painted but unclaimed cell against the fixed `LOT_SLOTS` / `LOT_DEPTH` contract.

The diagnostic computes three deliberately different bounds:

1. **Leftover component packing** groups currently unclaimed cells by road edge, side, type, density and connectivity, then divides by the fixed minimum cell area. This cannot account for rearranging existing lots.
2. **Full component repacking** applies the same model to all painted cells within the preferred class depth. Eight-neighbour connectivity admits diagonal turns on curved road rows. Every existing real lot's retained cells are connected under this model, but the real `_slots()` path reads cell class/availability without requiring stored `edgeId`, `side` or `depth` to match the lot road. The component quotient imposes extra ownership constraints and is a conditional estimate, not an upper bound on the current splitter.
3. **Class-only repacking** discards road edge, side and connectivity entirely. It is intentionally loose and shows the apparent capacity available only if the established frontage ownership constraint is ignored.

No state is changed, no lots or buildings are spawned, and no score/gate is modified.

## Results

| Accepted world | Cells | Real lots/buildings | Claimed | Unclaimed | Beyond preferred depth | Unclaimed within depth |
|---|---:|---:|---:|---:|---:|---:|
| seed1337 |9,964|612|4,882|5,082|706|4,376|
| seed7 |10,113|648|5,176|4,937|675|4,262|

The large leftover count is mainly fragmented frontage-width residue, not deep backland: only706/675 cells lie beyond their class's preferred depth.

| Diagnostic packing model | seed1337 | seed7 |
|---|---:|---:|
| Additional lots from current leftovers, 4-neighbour |143|128|
| Additional lots from current leftovers, 8-neighbour |150|137|
| Conditional repack with stored edge/side/class lock, 4-neighbour |794|778|
| Conditional repack with stored edge/side/class lock, 8-neighbour |804|789|
| Complete repack by class only, frontage discarded |1,229|1,244|

All612/648 existing lots have retained preferred-depth cells connected under the eight-neighbour test. This is only a shape sanity check: the probe filters excluded cells and does not assert that each lot stays inside one stored edge/side component. It therefore does not validate804/789 against the real current splitter and cannot be used as a hard ceiling.

The class-only number barely clears1,200, but it pools cells across unrelated roads and sides and therefore does not demonstrate legal real lots. The stricter component estimates remain hundreds short before the1,400-lot gate is considered. This contrast shows why exact longitudinal slot order and cross-edge claim competition must be replayed before selecting a change; it does not prove that a particular splitter modification is impossible.

## Architectural implication

Further rank1 work needs an exact accepted-source replay of `ZoneGrid._slots()` / `genEdge()` claim order to identify why runs fail and what a bounded change would yield. A later proposal may require more usable contiguous frontage through coordinated roads/zoning/buildings work; this diagnosis alone does not prove that necessity. Revising fixed lot dimensions is unsupported and would violate the established class sizes. Earlier r7s global64m-grid and80m-no-split trials produced573/695 buildings and are already rejected. R8g's mixed-use extension changes appearance and economics but leaves612 real lots.

No bounded product change is selected from this diagnosis. The next diagnostic must use the public `zoning.diagnose()` replay or equivalent actual slot-order data for both seeds, preserving cross-edge claim competition. A future candidate must identify specific legal frontage or splitter runs and predict their real lot yield for both seeds, then prove roads, zoning, building IDs/restage, economy, cameras, visual integrity and the passing geometry/memory gates. Decorative buildings, duplicate city layers, metadata-only districts and showcase-only filler remain disallowed.

## Verification and limits

- Both fresh worlds report zero sim errors and zero browser errors.
- `claimed + unclaimed == painted cells` for both seeds.
- Existing real lots/buildings are612/612 and648/648.
- Every existing lot's retained preferred-depth cells are eight-neighbour connected, but ownership-component membership is not asserted.
- Repeated tool runs produced the same final counts after the connectivity correction.
- No screenshots are required for this read-only structural diagnosis; it makes no visual claim.
- Component quotients impose stored edge/side/depth constraints that `_slots()` does not, and ignore exact longitudinal slot order, corner expansion and competition order. They describe fragmentation under that conditional model and do not certify buildable lots or an upper bound.
- No build, matrix, API/restage, FPS or heap gate is claimed from the diagnostic.

Evidence: `shots/democity/r8t-parcel-capacity/profile.json` and `tools/parcel-capacity-profile.mjs`.
