# Democity r8b — real mixed-use avenue frontage

## Bounded change

The independent whole-game review identifies sparse frontage and weak occupied night depth as the next visible city-scale defect. Democity previously authored zero mixed-use lots even though the buildings owner already supported real residential/office buildings with retail bases. r8b selects at most 14 high-density residential or office lots on real central avenues within 300 m of the city core, marks their ordinary lot programme as mixed-use, assigns their existing authored growth level, and recreates only those lots through the public `demolish` and `requestSpawn` APIs. The resulting 11 apartment buildings and three towers remain normal world buildings with real occupants/jobs, owner geometry, simulation records and save state.

The first candidate marked lot metadata after zoning events had already spawned buildings and produced zero mixed-use buildings. Moving the recreation earlier produced only the three office towers because later level changes retained the original residential programme. Both failed probes remain in `shots/democity/r8b-frontage-diagnosis`. The accepted ordering recreates the bounded set after the complete lot table and level programme are known.

## Restore repairs required by verification

The new `democity-mixed-use-probe.mjs` initially rejected the candidate. Buildings restored visually but zoning lots lost their `buildingId`, and a paused restored city exposed zero filled office jobs. These were existing cross-owner restore defects revealed by the stronger check:

- Zoning now retains its live lot table until replacement cells commit, allowing the grid's stable road-side/front-cell identity to preserve lot IDs.
- Buildings clear their stale lot cache, rebind saved stock to the zoning owner's live lots, and recompute capacity after saved width overrides.
- Simulation rebuilds its derived labour state and immediately mirrors restored occupants/jobs into real buildings, without advancing time.
- The screenshot verifier now exits with an explicit render-stall error if animation frames stop for 15 seconds; the prior unbounded wait stalled once on `suburb_22`. The same view then completed normally in 15 seconds.

These repairs preserve owner order and public contracts. They do not add residents, jobs, money or visual content.

## Verification

- Production build passes 163 modules.
- The complete 16-frame 1920×1080 High/Metal Democity matrix is 16/16 ready with zero errors: 473 maximum draw calls, 2,258,952 maximum triangles and 43.2 minimum sampled fps. The existing 50fps gate remains failed.
- The standard night-downtown close view reports 347 draws and 2,792,338 triangles. Its real café/storefront strip is visible in the accepted frame. Against the pre-r8b r7z view, full-frame normalized MAE is 8.97018% and the 1100×520 frontage crop is 8.81104%; the change also includes the deterministic massing of the 14 newly allocated real buildings.
- The before/after crop and all 16 matrix frames were inspected. They retain district composition, daylight readability and night silhouette; every capture reports zero errors.
- The public API/double-deserialize/eight-stop tour probe passes. Counts remain 468 road nodes, 604 edges, 9,964 zone cells, 612 lots/buildings, 31 services and one eight-stop transit line. Utility coverage remains 503/507 and health+education 306/507.
- The targeted whole-save probe passes after two restores: the same 14 lot IDs select 11 apartments and three towers, and building IDs, plans, styles, mixed-use/retail flags, occupants, jobs and live zoning-lot ownership are exact. Total stock remains 612.
- Exact 1337→7→1337→7 restage passes with zero errors. Raw heap endpoints remain variable and are not used as a memory improvement claim.
- A deliberate late Transit rejection restores every one of the 14 serialized owners, terrain, time and camera exactly; the expected Transit error proves the rollback path ran.

Evidence: `shots/democity/r8b-frontage`, `shots/democity/r8b-frontage-diagnosis`, and `shots/integration/r8b-save-atomicity-regression.json`.

## Decision

Accept r8b and the restore/verifier repairs. The result adds real, saved and simulated active frontage using established owners, with no synthetic decoration or coverage change. Democity and whole-game remain 6.0 FAIL: 14 central lots do not close the 1,200-building/1,400-lot scale gate, much of the city still has sparse frontage, the 50fps gate still fails, and foliage, grounding, broader asset finish and subjective play remain open.
