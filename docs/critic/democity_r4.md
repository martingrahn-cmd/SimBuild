# Democity r4 — local critical audit

**Score: 6.0 / 10 — FAIL.** The W4 school is a real, paid placement and moves the primary seed's shared health-and-education coverage from 59.10% to 60.36%. It does not change the city’s visual quality tier: night lamps bloom into repeated discs, golden-hour exposure washes out the skyline, and the city remains sparse and repetitive compared with the CS2 references.

This is a local critical audit, not a claim of a separate independent reviewer. It follows the W4 critic matrix: all eight CS2 references were recalibrated, 37 fresh W4 PNGs were captured through the restored SimBuild server and every PNG was viewed. It preserves the score rather than treating a single coverage improvement as a visual upgrade.

## Evidence

- Standard matrix: all 16 frames `ready`, zero console errors. Maximum 751 draws and 5,075,465 triangles (`shots/democity/r4/summary.json`). That exceeds the 3,000,000 whole-scene triangle ceiling; skyline's 751 draws stays below its 1,200-draw ceiling.
- Seed 7 noon matrix: all four frames `ready`, zero errors, maximum 726 draws and 3,590,651 triangles (`shots/democity/r4s7/summary.json`).
- Whole-game captures are ready with zero errors. Noon is 562 draws / 3,360,879 triangles; night is 692 / 7,498,104 (`shots/democity/r4/all_aerial_12.json`, `all_aerial_22.json`).
- W4 census has 612 buildings and lots, 9,964 zone cells, 31 paid services, and a real 8-stop line. Primary seed coverage is 306/507 = **60.36%** health+education and 503/507 = 99.21% utilities. Fresh seed 7 is 345/548 = 62.96% health+education but 519/548 = 94.71% utilities, so the contract is still not consistently cleared (`shots/democity/rdev4/census-contracts.json`).
- The own landmark group remains 8 draws / 3,600 triangles. Full-scene geometry and heap are the failure: the W4 runtime probe reports 1,076.6 MB heap (`shots/democity/rdev4/probe.json`).

## Ranked issues

1. **blocker — Night lighting is visibly broken at city scale.** `aerial_22.png` and `all_aerial_22.png` show hundreds of oversized white lamp discs over dark, patterned towers; this is the opposite of restrained pools and readable warm city light. `night_downtown_22.png` retains window light, but the lamp artefact remains in the foreground. Evidence: `shots/democity/r4/aerial_22.png`.
2. **blocker — Whole-scene triangles and heap are far over budget.** The W4 standard matrix peaks at 5.08M triangles and the whole-game night reaches 7.50M, against 3.0M. The measured heap is 1,076.6 MB, against 512 MB. Evidence: `shots/democity/r4/summary.json`, `shots/democity/r4/all_aerial_22.json`, `shots/democity/rdev4/probe.json`.
3. **major — Golden hour blows out the skyline.** `skyline_17p5.png` loses the right half of the city to a near-white sun field, removing water, industry and building form. This repeats r3’s composition defect and fails the reference’s controlled HDR look. Evidence: `shots/democity/r4/skyline_17p5.png`.
4. **major — Density and asset variation are still too synthetic.** The centre is a collection of repeated window grids separated by grass blocks; suburbs and park show large empty lawns, simple landmark masses and evenly scattered foliage. The 612-building city remains below the 1,200-building acceptance target. Evidence: `shots/democity/r4/downtown_12.png`, `suburb_12.png`, `park_12.png`, `shots/democity/rdev4/census-contracts.json`.
5. **major — Seed equivalence and utility coverage remain unresolved.** Fresh seed 7 renders a coherent alternate layout but utility coverage falls to 94.71%, below the expected universal service reach; W3’s cross-seed restage defect has no W4 repair evidence. Evidence: `shots/democity/rdev4/census-contracts.json`, `shots/democity/r4s7/aerial_12.png`.
6. **major — Bridge, waterfront and industry composition remain schematic.** Bridges, cranes and cooling towers establish districts, but roads meet water and terrain with abrupt, game-like joins; the industry scene is sparse and the cooling-tower smoke is a dominant flat plume. Evidence: `shots/democity/r4/bridge_12.png`, `industry_12.png`, `waterfront_17p5.png`.

## Strengths to preserve

- All 37 reviewed W4 captures render a ready module with zero console errors.
- Roads, crosswalks, traffic, river, bridges, park, suburbs and industry are recognisable at city scale.
- Seed 7 changes the skyline and street composition while remaining playable.
- W4’s additional school is a valid paid service and passes the shared health-and-education threshold in the primary city.
- The 1280×720 HUD fits and remains readable (`aerial_12_720p.png`).

## Per-shot notes

| Files | Observation |
| --- | --- |
| `aerial_{6p5,12,17p5,22}.png` | Coherent downtown, river and highway; large lawns and repeated tower grids persist. At 22:00 lamps become oversized discs. |
| `street_{6p5,12,17p5,22}.png` | Marked streets, signals, shelter and trees are present; foreground lawn and simplified foliage dominate the close city view. |
| `skyline_{6p5,12,17p5,22}.png` | City, mountain and industry read clearly at morning/noon; 17:30 washes out the right skyline and night remains too dark apart from lamp pools. |
| `closeup_{6p5,12,17p5,22}.png`, `closeup_12_repeat.png` | Crosswalks, a bus/shelter and building windows are readable; empty corners and repeated façade language prevent a dense street-canyon feel. |
| `overview_12.png` | The full plan reads, but its block interiors are mostly empty. |
| `night_street_22.png`, `night_downtown_22.png` | Window lighting works locally; strong lamp bloom and dark foliage weaken the scene. |
| `downtown_12.png`, `interchange_12.png`, `bridge_12.png` | District landmarks are legible; broad grass, generic towers/cranes and abrupt terrain joins remain. |
| `suburb_12.png`, `suburb_6p5.png`, `industry_12.png`, `park_12.png`, `waterfront_17p5.png` | Recognisable district types but sparse lot fill, simple civic forms and flat industrial/waterfront treatment. |
| `r4s7/{aerial,street,skyline,closeup,interchange,bridge}_12.png` | Fresh seed 7 is stable and varied, while preserving the same sparse/repetitive material and road-landscape problems. |
| `aerial_12_720p.png`, `all_aerial_12.png`, `all_aerial_22.png` | HUD fits at 720p and whole game has no errors; night total triangles spike to 7.50M and lamp discs are obvious. |

## Next step

Do not start W5. A separate independent reviewer may use this W4 evidence, but must repeat the critic capture/audit rather than copy this verdict. Prioritise restrained night-lamp rendering and exposure control before adding city content; then reduce whole-scene geometry/heap and replace repeated building/foliage patterns with denser real frontage.
