# Democity R9p — independent owner-lifecycle review

**ACCEPT the bounded product repair. Democity and whole-game remain 6.0/10 FAIL (required 8.5). The R9o alley remains rejected as authored infill.**

Zoning now publishes a real removed/added-lot journal after a deferred road/terrain rebuild, and Buildings retires the stock that points to those removed lot IDs. This resolves the demonstrated orphan ownership defect. It does not repair the road transaction's complete undo/redo contract: ordinary paused undo still loses a building. Acceptance is limited to restoring the owner invariant, not permission to describe transactions as fully reversible.

## Source and ownership

I independently reconstructed both exact pre-R9p files in memory. Reversing `refreshBand('event', true)` and removing its three new explanatory comments reproduces Zoning SHA-256 `4d0d515eb4d89de5454563bb725fd9935d6ec27093084b58b99570645abfbdc5`. Removing the new helper and subscriber argument/call reproduces Buildings `1dd3d9eeb192ad628b8678da4bce2b89207af2d2d699113a498cba3325820dd7`. Current files match the builder's `e6774668…` and `0771c773…`; full hashes are in the JSON report. Sampled grid, plan, Tools, Roads and Transit source hashes match R9o.

The existing `refreshBand` increments Zoning version and emits only for a nonempty lot journal. The Buildings listener consumes that public event and uses its own existing `demolish` path, including chunk removal, pending removal, version increment and the old lot-reference cleanup. Cached references are removed only for the journal's exact IDs. This follows the architecture's `zones:changed`/`buildings:changed` ownership contract. No RNG, authored road, building-plan or demand rule was added. The existing eager fallback condition is unchanged.

## Recomputed evidence

I parsed the complete 45,486,969-byte main summary and all five construction/readiness JSON files, then recomputed counts, stable-key sets, retained identities, graph components and both directions of ownership. All 20 retained before/after/undo/redo snapshots have unique live IDs, no orphan or unbuilt lot, no inverse mismatch, no duplicate cells and no multiply claimed cells. Every recorded phase is 16/16 ready with zero engine errors; all six worlds have empty browser/HTTP-error arrays. The harness's weaker inverse predicate did not conceal a failure in these retained states.

| Democity fixture | seed 1337 | seed 7 |
|---|---:|---:|
| Before lots/buildings | 612/612 | 648/648 |
| Commit lots/buildings | 612/612 | 649/649 |
| Undo lots/buildings | 612/612 | 648/648 |
| Redo lots/buildings | 612/612 | 649/649 |
| Retained lot IDs/building IDs | 611/611 | 647/647 |
| Gained/lost lot keys | 1/1 | 2/1 |
| Claimed-cell change | −4 | +12 |
| Road nodes/edges change | +2/+3 | +2/+3 |
| Zoning versions | 1→2→3→4 | 1→2→3→4 |
| Fresh candidate repeat | exact recorded projection | exact recorded projection |

The retained lots' planar geometry and cells are unchanged. Both commits are public valid/ok transactions costing 96. Connected-component counts remain 11/12. The baseline/candidate labels in these images mean no transaction versus disposable transaction on the same repaired product, not pre/post-repair source. The summaries support lifecycle behavior, not an authored density improvement.

The fresh paused `showcase=all` records independently support the narrower absence-of-eager-fill claim:

| Phase (lots/buildings/free) | seed 1337 | seed 7 |
|---|---:|---:|
| Before | 612/612/0 | 648/648/0 |
| Commit | 612/611/1 | 649/647/2 |
| Undo | 612/611/1 | 648/647/1 |
| Redo | 612/611/1 | 649/647/2 |

All retained all-mode integrity lists are empty for orphan/mismatched links, and free counts equal the unbuilt lists. Undo money equals baseline; redo equals baseline minus 96. These files contain summaries rather than complete collections, so the full inverse check performed on Democity cannot be independently repeated on all-mode data. No advancing-time construction was tested.

## Open failures and qualifications

**Full transaction restoration is the next priority.** Exact and semantic undo/redo comparisons remain false for both seeds. In paused all-mode, undo fails to restore the one implicitly demolished building. Democity's eager replacement restores the count but not the original building state. The road surface still differs at 6/21 undo samples and 18/21 redo samples, although recorded ground height, slope, road mask, terrain hash, planar lot geometry, Services serialization and the stored economy projection match. Eight Transit stop records change in each restore comparison. Before→undo line state also changes ridership and balance in addition to route/headway; after→redo changes route/headway. Do not infer a transit outage merely from differing route IDs, or full terrain equality from a 32-bit hash and sparse samples.

The failed combined all-mode run remains `pass:false`: it contains the successful seed1337 run and a 240000ms startup wait timeout. I verified that the separate completed-run extraction is exact and does not rewrite the failed record. The later seed7 readiness page has 16 ready modules, zero errors and required serialization APIs, with the ready flag false at its five-second poll and true at ten. That is a subsequent success, not proof that the original timeout was exclusively a harness problem. Its failed-page state was not retained. The earlier discarded Democity API-readiness failure likewise has only builder provenance here.

## Images and visual judgment

I individually inspected all eight 1920×1080 final originals and all four amplified differences at original resolution, plus the 1280×720 readiness original. The road panel is closed, the new alley is visibly continuous in exposed parts, and the old invalidated office stock is replaced rather than left orphaned. Seed1337 has a substantially different replacement tower; seed7 replaces its large office and adds a second building. Those are expected deterministic stock changes on new lot identities, not evidence of superior urban form. The seed7 directed foreground tower still hides much of the affected frontage. Sparse fabric and coarse foliage remain visible. There is no visual basis for raising 6.0.

Recomputed full-frame normalized RGB MAE is 0.005592250918/0.011385470250 for seed1337 aerial/directed and 0.006253762204/0.006094946492 for seed7. Changed-pixel counts are 225449/443528/322125/337694; strong (maximum channel ≥8) counts are 68654/153060/77227/73636. All four amplified images exactly equal clamped four-times RGB absolute difference. Live traffic, foliage and other rendering changes prevent foliage/building-only attribution. These numbers quantify difference, not quality.

## Inspection register

All paths below are under `shots/democity/r9p-zoning-building-lifecycle/`.

- `baseline_seed1337_aerial.png` — individually inspected.
- `candidate_seed1337_aerial.png` — individually inspected.
- `baseline_seed1337_directed.png` — individually inspected.
- `candidate_seed1337_directed.png` — individually inspected.
- `baseline_seed7_aerial.png` — individually inspected.
- `candidate_seed7_aerial.png` — individually inspected.
- `baseline_seed7_directed.png` — individually inspected.
- `candidate_seed7_directed.png` — individually inspected.
- `seed1337_aerial_difference_x4.png` — individually inspected.
- `seed1337_directed_difference_x4.png` — individually inspected.
- `seed7_aerial_difference_x4.png` — individually inspected.
- `seed7_directed_difference_x4.png` — individually inspected.
- `all-seed7-readiness.png` — individually inspected.

JSON read in full: `summary.json`, `all-seed7-readiness.json`, `construction-timing-seed1337-with-seed7-timeout.json`, `construction-timing-seed7.json`, `construction-timing-seed1337.json`, `construction-timing.json`. Source/tools/documents and full evidence hashes are recorded in the paired JSON.

## Limits and next step

- Independent static/source, saved-state and original-image audit; no new browser run or product edit by critic.
- Baseline and candidate labels mean current-product worlds without/with the disposable road transaction; they are not pre/post-R9p product renders.
- Main harness bijective flag does not independently test every building-to-lot inverse or duplicate extra building on a live lot. Critic separately verified both inverse directions, unique IDs, equal live counts and cell ownership across all 20 retained snapshots.
- Main row gate checks ready16 and cell ownership only after commit; critic also verified every retained before/undo/redo snapshot.
- Fresh-repeat exactness covers the selected serialized stable projection, excluding frame timing, versions and unretained runtime internals. Terrain is only a retained 32-bit hash and 21 height/slope/mask/surface samples, not independently comparable full terrain bytes.
- All-mode evidence retains counts and integrity summaries, not complete lot/building collections, so inverse links there cannot be independently reconstructed as in the Democity summary.
- The all alias uses the authored Democity city with showcase flag all and speed zero. It proves no immediate eager refill, not successful later Simulation construction or a blank-city scenario.
- Readiness diagnostic records ready at its ten-second poll after navigation; this is not exact startup latency. Its pass checks ready and console errors only; retained module/error/API observations were separately inspected. HTTP failures are not part of that diagnostic.
- The retained timeout remains a failed/nonreproduced startup attempt with unknown cause. The completed seed1337 extraction is exact; original failure stays false. The earlier discarded Democity attempt is described by the builder but has no retained failure-state evidence here.
- Eight daytime transaction screenshots, four amplified differences and one readiness screenshot were inspected individually at original resolution. No night/weather/full performance matrix, FPS claim, raw-heap gate, blind A/B or new CS2 calibration is established.
- Traffic, foliage and other live rendering contaminate full-frame image differences; seed7 directed foreground tower heavily occludes the edited frontage. Image MAE is not a quality score.
- Detached catalog-lot IDs, terrain-only editing, no-Simulation configuration, larger batched removals, empty-journal events and save/load are not separately exercised by retained runtime evidence. Source scope is consistent with exact removed-ID ownership, but this fixture is not exhaustive.
- Build pass/163 modules is builder-reported; no retained R9p build log was present in the supplied evidence directory at review time.

Next: trace the Tools/Roads restoration journal and restore original building stock/state alongside physical road profiles and elevation flags; verify live Transit and paused money, then resumed Simulation construction. Keep the rejected alley out of the authored city and leave the whole-game score unchanged.
