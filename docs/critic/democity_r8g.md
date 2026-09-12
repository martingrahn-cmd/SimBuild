# Democity r8g — independent bounded review

**ACCEPT v1 as a modest local improvement. Score: 6.0/10, unchanged. Whole-game remains FAIL against 8.5.** This is a weak acceptance of the visible result, not a claim that the implementation is the narrowest possible intervention. Whole-game r2 rank 1 remains open. The integrator may reasonably prefer a subsequent variant that preserves building forms and identity.

I inspected all **25 original PNGs** individually: four parcel-baseline images, five frontage-candidate images and all sixteen frontage-matrix images. I also viewed the derived contact sheet and west-frontage comparison, read every associated sidecar, both diagnosis files and the mixed-use, cityscale and save-atomicity probes. All eight CS2 references were inspected for the immediately preceding whole-game r2 review; they were not freshly repeated in this bounded delta review.

## Visual judgment

Downtown and west-frontage comparisons show additional street-level retail treatment attached to real apartment/office buildings. The additional avenue shop bases make a small positive contribution. Much of the visible difference, however, is altered building massing: the west foreground gains a larger stepped crown and several towers change height or roof. This was included in the judgment, not overlooked or described as a texture-only change. I find the local result weakly positive, without a definite harmful composition regression sufficient to reject it.

The wide view still has isolated towers on lawns, repeated crowns and partly empty blocks. The close night camera largely retains the existing café strip rather than showing a substantial new improvement. Suburb and industry comparison pairs preserve their services, lots and composition. All additional matrix views were checked for missing structures, broken crossings and conspicuous new terrain seams; none was clearly attributable to this change. Old foliage cards, flat luminous windows, schematic service light pools, abrupt opposite-bank grades, the horizon band and plain arena/port grounds remain.

## Source and state

Git HEAD predates the implemented module, so its broad working-tree diff does not isolate r8g. Root supplied the exact prior selection-loop cap, `if(mixedUseLotIds.length>=14)break;`; current source removes it, and the probe changes expected lengths from 14 to 32. The fourteen-ID baseline prefix and eighteen added IDs are independently corroborated by the frontage sidecars.

The predicate remains high-density residential/office lots on avenues within 300 m of `(0,20)`. It selects **all eligible lots**; 32 is the current default-seed result, not a universal hard cap. Existing building-owner demolition/spawn paths create actual plans, IDs, capacities and lot links. There is no new visual-only duplicate city or unmanaged fleet. The candidate uses 23 apartments and 9 towers, all marked mixed-use/retail, within 612 total buildings.

The existing rebuild path assigns new IDs to the additional lots, so deterministic building plans and capacity can change. Simulation capacity rules are unchanged, but city state is not: the HUD remains at 8,046 population while cash changes 26,429→26,397 and net income 10,862→10,099/day. Residential records still have zero jobs; retail appearance does not establish an additional commercial-employment simulation. Positive paused HUD income is not a long-run balance test.

The mixed-use probe's stored before/after-first/after-second digests independently compare equal for selected IDs, plans, capacities and live zoning links. Its harness does not assert restore return values or mutate state before loading, so it alone cannot prove an actual successful restore. The separate current atomicity fixture reports an intentional transit rejection, exact rollback across its serialized modules/time/camera, and a subsequent `validRestore:true`. The expected logged rejection is not a screenshot error. These are bounded checks, not universal save or whole-world determinism proof. The cityscale probe succeeds for seed 1337 (612 lots/buildings) and seed 7 (648); its `pass:true` means successful probe execution, not passing the larger city-scale specification.

## Verified performance

All 25 image sidecars have zero errors and all 16 modules ready. Two custom west-frontage sidecars omit performance counters; the other 23 supply them. Every row of the corrected sixteen-frame summary matches its sidecar. The earlier zero-ready parser output was corrected; it did not indicate unready game modules. The existing missing-reserved-university warning remains, alongside deferred-props startup information.

| Candidate matrix measurement | Actual result | Frame |
| --- | ---: | --- |
| Maximum draws | 469 | park_12 |
| Maximum triangles | 2,808,896 | night_downtown_22 |
| Minimum FPS | 35.3 | interchange_22, park_12 |
| Frames below 50 FPS | 15/16 | matrix |
| Maximum raw heap | 757.2 MB | interchange_22 |

The 1,500-draw and 3-million-triangle gates pass in these captures. The local 50-FPS target does not. Raw heap is not forced-GC retained memory or proof of a leak; no current forced-GC test is supplied here.

Initial baseline→candidate downtown counters are 430→425 draws and 1,884,070→1,885,620 triangles; industry 204→204 and 1,151,976→1,152,026; suburb 360→364 and 1,757,896→1,756,576. These small mixed changes support a low geometric cost. Initial candidate downtown/industry/suburb FPS is 50/60/55.5, while the later matrix measures 49.1/50/41.3. Uncontrolled host conditions prevent attributing that variation to this candidate. Preserve the actual low matrix measurements without inventing either a causal regression or a performance improvement.

## Ranked remaining work

1. **Sparse block fabric remains the primary whole-game weakness** — owner: democity; supporting owners: zoning, buildings, roads. More retail bases do not fill the empty lawns or replace repeated crowns. There are still 612 occupied lots/buildings; diagnosis gives 4882 of 9964 painted cells claimed and mean footprint coverage 0.39012. Whole-game r2 rank 1 remains open.

2. **The extension changes building identity, massing and economics as well as retail frontage** — owner: democity; supporting owners: buildings. Existing demolition/respawn allocates new IDs for eighteen additional lots and changes deterministic plans. The west foreground gains a conspicuous stepped crown. This critic judges the overall local change weakly positive, not a clear regression, but preserving IDs/forms would provide a narrower intervention. Do not claim unchanged city state.

3. **Existing foliage, night and site-detail weaknesses remain** — owner: cross-cutting; supporting owners: props, buildings, services, effects. Flat leaf clusters, repeated luminous window grids, schematic lamp pools and underused arena/port grounds remain. No definite new visual regression attributable to cap removal was found in the supplied views.

4. **Geometry fits but local performance targets remain unmet** — owner: cross-cutting; supporting owners: core, props, traffic, buildings. Matrix maximum 469 draws and 2808896 triangles fit limits. Fifteen of sixteen frames are below 50 FPS; minimum 35.3. Raw heap reaches 757.2 MB. Neither a retained leak nor candidate-caused slowdown is established.

5. **Save and determinism claims exceed the narrow harness if described as universal** — owner: democity; supporting owners: core. Mixed-use digests match twice, but the harness ignores restore return values and does not perturb state. Separate atomicity evidence covers one rejected transit restore rollback and one successful load. No full-world or multi-seed determinism certification was performed.

The parcel diagnosis explicitly reports `pass:false`: 4,882 claimed cells of 9,964 painted cells (48.996%), 5,082 painted cells unclaimed and mean footprint coverage 0.39012. This extension does not add lots/buildings or resolve that utilisation. Further rank-1 progress needs compact, varied real block frontage and purposeful open space through the existing lot/building owners; selecting more flags is not sufficient evidence.

## Limits

This review uses supplied evidence, not fresh critic captures or live probes. There are only four paired baseline cameras; the candidate matrix covers noon/night rather than all four times, weather, 720p or the `all` alias. Paused stills do not certify traffic flow, boarding, enjoyable decisions, pause/resume or long-run finances. Only these two critic report files were written. Acceptance remains local, with score 6.0 and the existing whole-game failures retained.
