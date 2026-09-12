# Democity R9u — independent review

**ACCEPT the bounded single straight-road demolition history repair. Democity and whole-game remain 6.0/10 FAIL against the 8.5 gate.** The accepted evidence covers one street and one avenue, exact retained owner comparisons, later unrelated building changes and the tested one-shot refusal paths. It does not close grouped demolition or persistent compensation recovery.

## Frozen source and contract

The seven product files and verifier named in `source/source-hashes.json` were independently hashed: every live file matches its manifest-named copy and recorded hash. The primary freeze is Tools index `923ca9c86e65f3ca5c92e69c11d98b874c677dfdab2f74f2073ce2e47409741c`, Roads index `10236c24ec7042e6798b15bcd70c4cfb8d839cef2edc364e73f4590280fda2ad`, and verification `1af9ee9ad549cb38f45e64317f3ad6d3a1a77cdb0eda0600e0c577546289e46c`. Manifest-listed named copies are authoritative; extra ambiguously named source files are not used for attribution. Complete hashes are retained in the paired JSON.

The inspected road demolition branch settles pending Zoning before snapshots, captures Roads graph/profile/allocator plus the full height field and Zoning/Buildings state, removes the road through its published world method, and credits the refund only after synchronous rebuild succeeds. The changed Roads API now returns `rebuildNow`'s result. Tools' terrain restore propagates its secondary public road rebuild failure. Initial demolition refusal restores graph, heights, Zoning, Buildings and derived Simulation state before returning no action.

Inverse handling settles before capturing current rollback state, restores the saved graph and terrain, merges current building links on unchanged stable key/ID lots, and restores Buildings only on changed lot IDs. Compensation uses current owner snapshots and reconciles dependents. Undo charges the previous refund only after successful owner restoration; redo refunds only after success. These are declared owner APIs; no new authored city, materials, camera or simulation pacing branch is introduced. Roads still emits `roads:rebuilt` even when the actual builder catches a failure, so the new return propagation should not be described as comprehensive event/failure atomicity.

ARCHITECTURE's R9u amendment and Tools/Roads core requests describe this boundary and leave marquee, curves and persistent failures open. The existing straight-road construction implementation is not reverified here merely because the shared restore helper now propagates errors.

## Independently checked results

| Seed / selected edge | Edges before→removed | Lots before→removed | Buildings before→removed | Refund |
|---|---:|---:|---:|---:|
| 1337 / street478 | 604→603 | 612→605 | 612→604 | 21 |
| 7 / avenue872 | 646→645 | 648→644 | 648→640 | 46 |

Both retained targets have length88 and eight frontage lots. Refunds agree with rounded 10% of the public street/avenue per-metre rates: round(2.4×88×0.1)=21 and round(5.2×88×0.1)=46. Node counts remain468/493. The post-demolition count differences imply one/four free lots, not an invariant that every remaining lot is occupied.

All seven retained digest rows match for before versus undo, removed-road candidate versus redo, and redo versus compensated Zoning refusal. Money independently matches those pairs: seed1337 is25434.727223410573→25455.727223410573; seed7 is25770.71318153628→25816.71318153628. Failed undo leaves the latter amount and one undo/no redo entry. The public action records show valid single bulldozer targeting, successful removal and one `bulldoze:1` group. The tested failure is its single `demolish:road` leaf.

The seven digests cover complete serialized Roads, Zoning, Buildings, Simulation, Services, Transit and Terrain. They are stronger than sampled terrain hashes, but raw serialized bytes are absent: I compared retained hashes, not regenerated them. Fresh repeat and subsequent normal undo are true audited harness predicates; their comparison rows are omitted. Do not present those as newly recomputed raw state equality.

Later level changes use actual owner `setLevel` and one Simulation step. Seed1337 records building1 at level2/tick121541; seed7 records building2 at level2/tick121301. Equality predicates require those records and ticks to survive undo/redo, but the post-records are omitted. The separate seed7 construction probe frees lot51, later creates real building692 through `requestSpawn`, then requires both the exact new record and `lot.buildingId=692` after each direction. This specifically exercises the R9s2 inverse-link failure class. It is owner API construction, not native input or long autonomous growth evidence.

The initial rebuild refusal returns `click.ok=false`, leaves history0/0 and keeps money25770.71318153628 and all retained counts unchanged. Its seven ownerEqualities are true; raw paired digests are omitted. The secondary rebuild refusal during undo retains history1/0, reports successful compensation and later normal exact undo; those are audited predicates without retained paired digests/money amounts. `failure-probe/verification.json` independently records the same failure-only result on the same source hashes. It is not a second full matrix.

These overrides return false before the real Zoning/rebuild call. The initial test has already removed the graph edge; the inverse test has restored graph/terrain before the secondary refusal. Thus the evidence exercises meaningful compensation ordering. It does not exercise arbitrary partial mesh corruption inside rebuild, thrown late failures, or a second persistent refusal during compensation. A failed compensation only logs/returns or throws; complete recoverable road-leaf recovery remains unproven.

## Integrity and evidence qualifications

The corrected builder tick wording is supported. Its added integrity limitation is essential: the helper tests Buildings' lot existence and populated lot→Building→lot correspondence, but it does not require every Building's target lot to point back to that Building or detect multiple Buildings sharing a lot. The builder has now corrected the formerly broad both-direction bullet to this retained helper scope; a full bijection proof is not credited. Raw owner arrays are discarded, so I cannot repair that oracle offline. This limitation does not demonstrate a new product defect; the exact hashes and specific later-construction link predicate still support the bounded acceptance.

The main run's integrity gate includes module readiness and engine snapshot errors; all reported main checks pass. Some specialized later/failure checks only retain their reduced integrity and browser error lists, not all snapshot readiness/errors. All retained ordinary error lists are empty; warnings include deferred furniture, missing reserved university and the expected compensated Zoning refusal. No silent general error-free claim is inferred beyond those records.

The Vite build log passes with163 modules in458ms. Both Democity API files pass double deserialize and eight tour stops, retain census and report no errors. Cross-seed fresh7/restaged7 retained data agree; zero terrain differences is qualified by the verifier's >1e-6 threshold across263169 values. This is not independently proven bitwise raw terrain equality. The forced late Transit save failure reports rollback of14 canonical module payloads, time and camera, and successful subsequent valid load, with one expected injected engine/browser error. It compares a normalized valid-load baseline. Deterministic API/cross/save artifacts contain no embedded product hash; their frozen-run attribution is builder-supplied. No browser rerun was performed by this critic.

## Visual inspection

All eight originals, four clamped x4 differences and contact sheet were inspected individually at original resolution. Original dimensions are1440×900. The demolished street/avenue and its dependent houses/yards visibly disappear. Remaining road ends are capped, with no obvious floating road or abandoned house geometry in the shown removal footprint. These images cannot establish hidden ownership or restored undo geometry. There are no undo/redo images and no PNG-specific timing/stat sidecars; verification contains run-level evidence only.

The before/after frames use the same frozen product and camera specifications. They are absence/presence of a demolition, not pre/post source comparisons. Broad foliage, vehicle, water and UI changes prevent road-only image attribution. All four exact x4 differences were independently regenerated and compared pixel-for-pixel; computed image metrics are:

| Seed/view | Normalized RGB MAE | Changed pixels | Pixels with channel difference ≥8 |
|---|---:|---:|---:|
| 1337 aerial | 0.000580212620 | 26429 | 5913 |
| 1337 directed | 0.007897464294 | 138680 | 83456 |
| 7 aerial | 0.000793265351 | 39031 | 7162 |
| 7 directed | 0.011531616638 | 199206 | 100717 |

This correctness repair supplies no visual-quality increase. Sparse urban fabric, crude tree silhouettes, repetitive building treatments, terrain seating and the broad water/cloud rendering remain visible. No performance, heap, night/weather, blind A/B or whole-game gate is newly passed. Score stays6.0 FAIL.

## Inspection register and next priority

All following PNG paths are relative to `shots/democity/r9u-road-demolition-history/` and were individually viewed at original resolution:

- `baseline_seed1337_directed.png`.
- `seed7_directed_difference_x4.png`.
- `seed7_aerial_difference_x4.png`.
- `baseline_seed7_directed.png`.
- `candidate_seed1337_aerial.png`.
- `candidate_seed7_aerial.png`.
- `candidate_seed7_directed.png`.
- `baseline_seed1337_aerial.png`.
- `seed1337_directed_difference_x4.png`.
- `baseline_seed7_aerial.png`.
- `seed1337_aerial_difference_x4.png`.
- `contact-sheet.png`.
- `candidate_seed1337_directed.png`.

The main and failure-only verification JSON were read in full, along with the manifest, all named source copies/current files, build, both API JSONs, cross-seed/save JSON, verifier, relevant Tools costs/bulldozer/UndoStack paths and R9u architecture/core requests. The paired report stores exact hashes and the recomputed counts, money/digest comparisons and image metrics.

**Next bounded priority:** audit marquee demolition grouping and compensation, adding a complete per-building reverse-link/per-lot uniqueness oracle and retaining the comparison rows. Test mixed victims and adjacent roads with a failure after a completed leaf before claiming group atomicity. Curves, persistent recovery, saved pending history and long unpaused play remain separate open work; this review changes no whole-game ranking or score.
