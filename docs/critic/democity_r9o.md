# Democity R9o — independent public infill rejection review

**ACCEPT the qualified rejection record; REJECT `1,0:v` as a product change. Democity and whole-game remain 6.0/10, FAIL against 8.5.** The alley is actually committed, but no building stock is added and the transaction reveals concrete ownership and derived-state restoration failures. Keep the authored plan unchanged.

## Verified transaction and owner state

I read both tools, the complete 45,479,505-byte summary, the original and corrected offline analysis, the revised builder report and relevant current owner contracts. I individually inspected all eight original images and all four ×4 difference images at original 1920×1080 resolution. I recomputed every image metric and verified the amplified difference pixels exactly.

| Commit result | Seed 1337 | Seed 7 |
|---|---:|---:|
| Nodes / edges |468/604→470/607|493/646→495/649|
| Lots |612→612|648→649|
| Buildings |612→612|648→648|
| Painted cells |9,964 unchanged|10,113 unchanged|
| Claimed-cell change |−4|+12|
| Gained / lost / retained lot keys |1 /1 /611|2 /1 /647|
| Retained same lot and building IDs |611 /611|647 /647|
| Orphan buildings / unbuilt live lots after commit |1 /1|1 /2|

Both actual public drafts and commits succeed, charge exactly 96 game currency, and public undo/redo return true. Two old endpoint edges are replaced by four split edges plus the connector. Removed IDs are613/656 and661/707; added IDs are1074,1075,1077,1078,1079 and1141,1142,1144,1145,1146. Retained existing edge descriptors match at commit. Connected-component counts remain11/12 through all phases: the added connector does not claim to connect every island of the authored city.

I rebuilt counts, unique claimed sets, stable-key differences, retained identity/planar membership comparisons, bidirectional building links and graph-component counts from the full snapshots. No duplicate lot cells or overlapping public memberships occur. Every retained phase is marked16 modules ready with no errors; browser/HTTP error lists are empty. Both fresh candidate repeats match the declared post-commit serialized projection exactly. Neither this repeatability nor a successful API return turns the failed overall record into a pass.

Building616 still points to removed lot102 on seed1337; building652 still points to removed lot109 on seed7. The same orphan remains after undo and redo. At commit the replacement office lots758/809 are unbuilt; seed7 additionally has unbuilt office lot1095 on an existing road side. The newly split connector itself has no newly occupied frontage. All retained lot keys preserve planar geometry/cells and IDs, so this is a specific removed-lot lifecycle failure, not wholesale identity instability. The Buildings serialization before/after commit is exact despite the lot changes; its version advances due terrain callbacks.

The original forward-only integrity test misses buildings pointing outside the live lot map. The corrected offline audit catches those orphans. I also checked the opposite relation for buildings pointing to a live lot whose buildingId differs, finding no additional live inverse mismatch. An unbuilt normal-game lot is not inherently an error; the orphaned existing building is the decisive integrity defect here.

Current source supports the cause: road/terrain events mark Zoning dirty; deferred `refreshBand('event')` regenerates lots with default `emit=false`, leaving zone version1 and no published added/removed journal. Separately, the existing Buildings `zones:changed` handler only invokes its limited staging fallback and does not consume `lots.removed`. Emission alone is insufficient. A bounded repair needs both responsibilities, preserving Simulation-paced ordinary construction and the existing fallback scope.

## Restore findings and corrected terrain interpretation

Before/undo and after/redo restore counts and the audited planar lot geometry, but not original lot identity or complete derived state. In each seed, one orphan remains in every restored phase; replacement lot IDs are regenerated. Full exact/semantic restore comparisons are false. The offline audit's `pass:false` is justified independently of the original harness's gaps.

| Restore pair | Surface samples different | Largest sampled height difference |
|---|---:|---:|
|1337 before/undo|6/21|0.573473m|
|1337 after/redo|18/21|0.530815m|
|7 before/undo|6/21|0.332728m|
|7 after/redo|18/21|0.958881m|

For all four pairs, terrain digest, sampled ground y, slope and road-mask values match. Full Terrain serialization is **not retained**: the tool clones it, computes a32-bit FNV digest, then returns only digest and21 sample records. Matching digest/samples is not exact-byte proof. I requested and reviewed the builder/offline correction separating ground data from the road/surface fields; the initial terrain booleans had conflated them.

Road descriptor comparisons expose four changed elevation flags in seed1337 and seven in seed7, including unrelated surviving edge IDs. The same counts occur before/undo and after/redo. The Tools split journal omits removed-edge elevation, but that alone does not explain unrelated flags and global derived surface changes. A field-only patch cannot be declared sufficient from this evidence.

Transit retained line length is unchanged across each restoration pair. Route IDs and headway differ; all eight stop records differ in y only. For example, seed1337 headway changes97.935642→97.965167 before/undo. Every retained route and stop edge reference still names a live road edge. Regenerated route IDs alone are expected after regenerated graph IDs and do not demonstrate broken service. Surface/height/headway drift demonstrates failure of exact derived restoration, not a proven bus outage. Services serialization and the stored economy projection match corresponding phases; this is not a full Simulation restoration claim.

## Visual judgment

The directed seed1337 images show a connected narrow road dividing the open block with readable junctions. No obvious floating pavement appears in the visible portion. Seed7's large foreground tower occludes part of the connector, so its visual contact coverage is weaker. The frontage remains empty and the broad sparse city fabric is not improved. Foliage rearrangement is visible around the edited roads; it must not be described as an alley-pixels-only change.

All candidate images include the open road-tool panel, absent in baselines. Aerial coverage is substantially obstructed and whole-frame differences are dominated partly by that panel, its toolbar state, moving traffic and other live rendering. The captures use fixed frame settling and a prescribed directed pose, without retained actual camera matrices. No exact-camera or temporal equivalence claim is established.

| Seed / view | Normalized RGB MAE | Changed pixels | Max-channel change≥8 |
|---|---:|---:|---:|
|1337 aerial|0.026739849991|489,713|255,528|
|1337 directed|0.032579168306|527,514|303,695|
|7 aerial|0.028427822788|502,940|262,293|
|7 directed|0.033828193713|545,659|298,105|

These recomputed numbers describe full-frame difference, not isolated geometry impact or quality. There are no per-image performance sidecars or full night/weather matrix; no FPS, triangle, raw/forced-GC heap, save/load or native-input gate passes from these captures.

## Next priority and evidence limits

First repair road→zoning→buildings journal publication and bounded orphan removal, without changing authored layout, demand, coverage or ordinary construction timing. Reproduce the same real commit/undo/redo with valid live ownership in both directions, repeatability and preserved economic/Services behavior. Then address the separately measured road-surface/Transit restoration defect. Keep this infill rejected while those contracts are unresolved; it does not prove every future coordinated design must fail.

The fresh-repeat projection excludes versions/images and cannot certify all runtime or saved-state determinism. Planar lot restoration omits y/t/edge identity/building linkage. The offline road comparison sorts endpoints, so it is not a complete directed one-way/profile oracle; its failure is corroborated by direct surface data. The revised offline integrity check is adequate for the observed orphans, but a general repair test should also check uniqueness and both live inverse links. No new browser or production-source edits were performed by this critic.

Verified evidence hashes: summary `61b173312b798fae89fc462df61dce158bf62445e9af491176b582916250494d`; corrected offline analysis `2b1b84c78ca0fc86b4ebc496fcbd1c4682d630423667816ea0eef9747bbdb8ac`; staging tool `b952ec2b609faa4d46435df872ce20ac85d6a62a34459897bdd0da478036c485`; corrected offline tool `94fb83cf812578989d3d1db98530f5ea329c40dbeab28f5f61f6638f3128334b`; unchanged plan `c439a6e88f87f40aac5182698d4406540e21f04ce659975b2b0e8cb4e4d26bd6`. Current owner source hashes, complete recomputed details and all12 individually inspected image paths are in the companion JSON.
