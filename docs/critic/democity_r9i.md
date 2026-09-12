# Democity R9i — independent actual-alley rejection audit

**ACCEPT the qualified rejection record. REJECT advancing this straight alley as a product candidate. Democity and whole-game remain 6.0/10, FAIL; the 8.5 pass gate is unchanged.**

The road produces real positive owner yield. Rejection is nevertheless supported by the shipped Tools draft's grade gate on both seeds, plus a retained-geometry qualification on seed 7. No production change is needed to close this experiment.

## Inspection and method

Read the complete `docs/builds/democity_r9i_actual_alley_rejected.md`, `tools/actual-frontage-alley.mjs`, `tools/r9i-tool-validity.mjs`, full 13,093,918-byte `final-v1/summary.json`, and `final-v1/tool-validity.json`. Checked the relevant Tools evaluator, snapping, metrics and costs source, accepted plan source, and R9g/R9h allocation findings.

Individually inspected every requested image at original 1920×1080 resolution: eight baseline/candidate originals, four amplified differences and two tool-draft originals. Exact filenames are listed below and in the JSON. These captures have aggregate run/state evidence in the two JSON files, rather than individual renderer-performance sidecars. No browser rerun, new capture or product edit was made by this review.

The source route adds a real alley between existing authored nodes `-8,-11` and `-7,-11` after the existing plan edges. The actual Roads/Zoning/Buildings owners create the resulting world. This is disposable candidate-world mutation, not an installed product edit or fake scenery. Reconstructing both routed variants from current `plan.js` reproduced all three recorded source hashes exactly; values are in the JSON.

## Yield, identity and state

| Seed | Roads | Painted cells | Unique claimed cells | Lots/buildings | Gained/lost/retained stable keys |
|---|---:|---:|---:|---:|---:|
| 1337 | 604→605 | 9964→9972 | 4882→4894 | 612→613 | 2 / 1 / 611 |
| 7 | 646→647 | 10113→10113 | 5176→5200 | 648→650 | 2 / 0 / 648 |

Independently reconstructed these counts from saved arrays, all stable-key sets, public duplicates/overlaps, and the building-ID/lot-ID bijection in all six worlds. Every lot has exactly one corresponding serialized building, all memberships are unique, and all six runs record 16 ready modules with zero engine/browser/HTTP errors.

Seed 1337 gains `1073:right:45,23` and `1073:left:48,20`, losing `335:right:42,19`. Seed 7 gains `1140:right:45,25` and `1140:left:49,22`, losing none. The net additions are one/two low-density industrial lots. Existing edge payloads remain exact and the new edge is last. Only the two endpoint-node y values change in each seed; this is not complete road-node or terrain invariance. Baseline degrees are 1/1 for nodes 69/70 and **2/1** for nodes 67/68. Seed 7 is not a connection between two baseline dead ends or two baseline degree-2 nodes.

All 611 retained seed-1337 keys preserve planar geometry and membership. **Two of seed 7's 648 retained keys do not:** `346:left:45,20` changes z −852→−856, width 32→24 m, corner true→false and membership 16→12 cells; `348:right:51,25` changes z −816→−812, width 24→32 m, corner false→true and membership 12→16. The other 646 preserve the audited planar fields and memberships. Stable identity therefore cannot substitute for geometry invariance.

Same numeric lot IDs among retained keys are 424/634; same building IDs are 378/365. Repeated candidate worlds match the verifier's complete declared projection exactly, after excluding only Democity phase/stage timings from its stats component. Services equal baseline on both seeds; Buildings, Simulation, economy and terrain hashes differ on both. Transit differs for 1337 and equals baseline for 7. Population changes 8046→8050 / 8018→8019; money changes 26397.355105→26244.448827 / 25738.835428→25530.198580. These are fresh-start authored/simulation differences, not an incremental restore-failure proof. Full terrain payload is not retained, so its digest cannot be independently reconstructed from the summary.

## Public tool gate

The validity probe uses public Tools select/pointer/click/state methods on unchanged product worlds. It sets alley, straight, elevation 0 and magnet snapping; the recorded snapped node IDs and x/z positions match the tested endpoint pair. Only the initial anchor is clicked. No committing click or commit is issued.

| Seed | Endpoint rise from tool points | Horizontal run | Recomputed grade | Result |
|---|---:|---:|---:|---|
| 1337 | 14.977732658 m | 72 m | 20.802406470% | invalid; `Grade 21 % > 12 %` |
| 7 | 8.870116472 m | 72 m | 12.319606211% | invalid; `Grade 12 % > 12 %` |

`tools/tools.js` evaluates terrain endpoint rise divided by sampled horizontal segment length; `costs.js` sets the ordinary road threshold to 0.12. Thus seed 7 genuinely exceeds 12%; the whole-percent reason string merely rounds both sides to 12. The originals show red invalid ribbons and the more precise grade chips. Before/after road, lot and building counts are equal, and recorded errors are zero.

This establishes the shipped draft gate for this link on the pre-link accepted terrain. It is **not** a measurement of the candidate's saved design array, maximum local/driven grade, or identical 3D road profile. Source inspection supports the pure evaluator, but count equality alone is not a full-world nonmutation oracle. The probe is public-API driven, not a native pointer/keyboard interaction test; it does not exercise commit rejection, payment, undo, load or subsequent simulation. Those limits do not require promoting a candidate already invalid at preview.

## Visual evidence and limits

The directed images visibly add an actual connection and industrial frontage. Seed 1337 replaces two facing road ends with a sharp angled connection; seed 7 closes a short local loop with compact industrial buildings. Neither pair demonstrates a broad city-quality improvement. Large empty urban parcels remain in the aerials; many towers change form across fresh pages. The four differences confirm widespread building-region changes, not an isolated road-only edit.

Recomputed all RGB metrics and exact ×4 difference pixels:

| Seed/view | Normalized RGB MAE | Changed pixels | Pixels with max-channel difference ≥8 |
|---|---:|---:|---:|
| 1337 aerial | 0.026399512326 | 667876 | 446152 |
| 1337 directed | 0.010135967633 | 320060 | 145347 |
| 7 aerial | 0.030777485904 | 749998 | 485699 |
| 7 directed | 0.007107633846 | 224285 | 107958 |

The verifier explicitly reuses baseline terrain target height for the candidate directed camera, addressing R9g's target-height mismatch. It does not serialize the actual resolved camera transform beside each capture. Rendering follows different fresh pages and frame settling, with live traffic/environment effects; pixel differences are neither a road-only causal measure nor a quality score. There is no retained FPS/heap/triangle matrix here and no performance pass. No new full matrix, save/restore or build claim is necessary for a rejected disposable source route; existing whole-game failures remain open.

## Next priority

Keep whole-game rank 1 (sparse urban fabric) open. Search other bounded existing-node links or alternative alignments, screening the **public Tools draft validity first** on both seeds, before expensive full staging. Then measure actual owner yield, repeatability and retained geometry; useful yield must not silently conceal changed parcel shapes. Terrain/profile integrity, visuals and incremental/save behavior remain separate gates for any advancing product candidate. A curved or multi-segment route is an untested hypothesis; this result does not prove no legal local design exists. Do not relax the grade rule or rewrite stable allocation identity merely to rescue this link.

## Image register

All paths below are relative to `shots/democity/r9i-actual-frontage/final-v1/`; each was individually viewed at original resolution.

- `baseline_seed1337_aerial.png`
- `baseline_seed1337_directed.png`
- `candidate_seed1337_aerial.png`
- `candidate_seed1337_directed.png`
- `baseline_seed7_aerial.png`
- `baseline_seed7_directed.png`
- `candidate_seed7_aerial.png`
- `candidate_seed7_directed.png`
- `seed1337_aerial_difference_x4.png`
- `seed1337_directed_difference_x4.png`
- `seed7_aerial_difference_x4.png`
- `seed7_directed_difference_x4.png`
- `tool_draft_seed1337.png`
- `tool_draft_seed7.png`
