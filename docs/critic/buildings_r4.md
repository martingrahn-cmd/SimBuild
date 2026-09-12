# Buildings — independent critic round4

**7.4/10 — FAIL.** API passes; acceptance3 fails. No production code was changed by this critic.

## Method and measured limits

Read full critic/module contracts, architecture, CS2-LOOK and residual decisions. Viewed all eight external CS2 references afresh, then all44 independent images listed below. Fresh captures use shared http://127.0.0.1:5174, System Chrome152 and ANGLE Metal AppleM4; no SwiftShader performance claim. Full git/source audit completed. CS2 retains substantially richer storefront interiors, roof assemblies and facade organisation at similar scale.

28 prescribed images: max240 scene calls,1,354,482 triangles,main aerial max1,023,388; min55fps,max building update0.1001ms,init25ms,42textures,allready/errors0. Additional rendered budget sampling of120frames per aerial/closeup×6.5/12/22 includes scheduled reflection/shadow passes: max266calls,1,334,266tri; aerial stays below1.4M and closeup below2M. Auxiliary API:347buildings,52chunks,actual11 main-camera building draws in12 consecutive frames matching reported11; LOD0/1=847766/252646,ratio.298014;setup782.2ms. One dirty chunk rebuild3.1ms passes the dedicated4ms limit. Generic2ms per-frame target is verified only in the capture matrix, not universally during editing. Four atlas textures total about52MiB before mipmaps, within96MB.

## Acceptance checklist

| # | Result | Evidence |
|---|---|---|
|1|PASS|Block relief .14/.07/.18m; closeup .14/.07/.20m. Local triangles per qualifying building4534.3 and6166.5. Window-head/jamb relief and separate bands visible; named nearest samples below.|
|2|PASS|Downtown all6 required crowns, 22 roof heights separated≥4m,tallest182.793/median33.900=5.392,adjacentTwins0.|
|3|FAIL|24586/65739lit cells=37.40%;92whole-scene brightness tiers; warm12025/cool12561. Baked attribute uses unsigned integer hash, no fragment sin hash. Near200crop ratio6.9208 passes; far128crop0.223214% fails<0.2%. Crop raycast IDs122/117,dist179.58/287.25m.|
|4|PASS|Night target120m:13commercial/mixed;13distinct ground floors,13interiors,13signs. Retail glazing and sign bands visible atblock22.|
|5|PASS|40catalog entries,all40byClass keys≥1; each type/density has≥3styleIds across levels, floors nondecreasing; high gains every step, low gains at≥2steps. This does not require3instances in each individual level key.|
|6|PASS|Flat roof clutter0/1 counts0;clutterTwins0.72chimney/dormer houses /82level2+ =87.8%. Roof assembly geometry is visible though oversized blank caps remain visual feedback.|
|7|PASS|347/347lotSurface footprints+paved lists; driveway/lawn/forecourt/boundary surfaces visible. Previously penetrating terrain tufts absent from examined paving. Cross-module occupied-lot ownership relies on published API and is revisited with democity.|
|8|PASS measured|All347highest-perimeter base errors0. Terrain-change +1m moves item105base exactly+1m. Private skirt/slab tests listed unmeasurable in residual review are not failed.|
|9|UNMEASURABLE|Residual contact-ramp/40px physical-height column definition lacks a reliable projective surface mask. Visible plinth/contact darkening is present; no invented percentile failure.|
|10|PASS quantitative; visual reservation|Downtown32tall buildings have32unique styleIds; local bays vary through blinds/spandrels and column variants. The remaining repeated window language limits visual score but is not labelled failure of a stricter undocumented target.|
|11|PASS|L4/5nonrect73/105=69.52%;office35/37=94.59%;residential29/37=78.38%;7archetype kinds.|
|12|PASS|85corner-treated buildings; corner storefront wraps visible.|
|13|PASS|22/29qualifying residential buildings balconied=75.86%; stacked dark undersides visible atblock12.|
|14|PASS|Exact held-update daytime setLit0/1meanRGBdiff0. All frame clipping<.3%,max.239053%;nightp1>0,p99<250. uNight initial/day0.|
|15|PASS measured|Glass roughness.44,frame.40/.42; atlas masonry/roof floors retained;normalScale.55 with distance fade. No exposure/fog/light writes. Residual building-surface bright mask is not measurable and is not failed.|
|16|PASS measured|LOD pixel meanAbs1.058013<4;triangle ratio.298014<.35. Crown/footprint silhouettes retained by inspection; residual2px edge metric not invented.|
|17|PASS measured|28 captures max1,354,482 triangles; main aerial max1,023,388. An additional720 sampled frames across aerial/closeup and6.5/12/22 include scheduled reflection passes: aerial max1,334,266;closeup max1,315,328;max266calls. Source400/2M declaration correct. Dirty rebuild3.1ms/1chunk passes4ms special rebuild limit; this is not proof of a universal2ms bound during editing.|
|18|PASS|Every28prescribed image ready/errors0,includingall12/all22and720p. Full-game all is still terrain/HUD because democity is pending; not a buildings-black-frame defect.|
|19|PASS|Spawn348mesh+2158tri,inside348/outside1mnull;level1→2floors8→12;height33.766→51.736. Demolishfreeslot and restores triangles. Each mutation version+1/correctadded/updated/removed ids. Serialize styles/tris/nextId exact.|
|20|PASS|Seed1337repeat styles and triangles identical; seed7differs29/40classcounts=72.5%. Source search has no Math.random or fragment fract(sin; timers are profiling.|
|21|PASS|Tintweight.88,emissive suppression in shader; full-frame meanRGBdiff27.300043>20,remove tint restores exactly0.|
|22|PASS|Day0/347lit;night347/347lit.|
|23|PASS|Item105levels1…5heights8.7,12.01,20.955,30.005,45.055. SameXZ,reseatedY;smalleststep3.31≥2.5. Restore847676vs847766=.0106% within1%. Five images visibly grow.|

Full raw API/crop/photometric data: `shots/buildings/r4/critic-probe/apicheck.json`, `extra.json`, `measurements.json`, `summary.json`.

## Named local samples

|Preset|ID|Class|Target distance,m|
|---|---|---|---|
|block|105|residential/high/4|20.0946|
|block|101|commercial/high/3|23.9270|
|block|106|residential/high/3|39.7352|
|block|102|commercial/high/5|41.5079|
|block|109|residential/high/3|44.0928|
|closeup|121|office/high/5|13.4053|
|closeup|124|office/high/5|15.8014|
|closeup|123|office/high/4|22.9262|
|closeup|122|office/high/5|26.0112|
|closeup|156|office/high/4|65.4092|

## Ranked issues

1. **minor: Far-window isolated contrast remains above the limit** — Validated128×128 farTower landmark hits building117 at287.246m. Isolated horizontal-neighbour luma contrast>40 occurs in0.223214% of eligible pixels, failing strict<0.2%. Near200crop ratio6.920814 passes. This static measurement is not evidence of observed temporal flicker. Evidence: `shots/buildings/r4/critic-probe/measurements.json`.

2. **minor: Facade and roof repetition still limits realism** — Tall buildings repeat fine glazed stripes and largely empty glass interiors. Blank stepped rooftop masses dominate some roofs. CAFE/BOOKS/MARKET signs are readable now, but adjacent repeated signs and shallow shop interiors remain unlike the calibrated CS2 references. Macro uniqueness and explicit bay checks pass; this is visual scoring feedback rather than an invented numeric threshold. Evidence: `shots/buildings/r4/critic-probe/block_12.png`.

## Per-image inspection

All44 images opened individually with image reader. Crops are unchanged extracts. Full-resolution Rec709 measurements are in measurements.json.

|Image|Observed read|
|---|---|
|`shots/buildings/r4/critic-probe/aerial_6p5.png`|Varied crown heights and dressed lots; repeated fine glass bands.|
|`shots/buildings/r4/critic-probe/aerial_12.png`|Varied crown heights and dressed lots; repeated fine glass bands.|
|`shots/buildings/r4/critic-probe/aerial_17p5.png`|Varied crown heights and dressed lots; repeated fine glass bands.|
|`shots/buildings/r4/critic-probe/aerial_22.png`|Varied crown heights and dressed lots; repeated fine glass bands. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/street_6p5.png`|Real window relief and plinths; empty gradient glazing and regular bay rhythm.|
|`shots/buildings/r4/critic-probe/street_12.png`|Real window relief and plinths; empty gradient glazing and regular bay rhythm.|
|`shots/buildings/r4/critic-probe/street_17p5.png`|Real window relief and plinths; empty gradient glazing and regular bay rhythm.|
|`shots/buildings/r4/critic-probe/street_22.png`|Real window relief and plinths; empty gradient glazing and regular bay rhythm. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/skyline_6p5.png`|Varied silhouette; distant stripes remain orderly and stylised.|
|`shots/buildings/r4/critic-probe/skyline_12.png`|Varied silhouette; distant stripes remain orderly and stylised.|
|`shots/buildings/r4/critic-probe/skyline_17p5.png`|Varied silhouette; distant stripes remain orderly and stylised.|
|`shots/buildings/r4/critic-probe/skyline_22.png`|Varied silhouette; distant stripes remain orderly and stylised. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/closeup_6p5.png`|Geometric reveals and bands; large blank glass interiors and rooftop caps.|
|`shots/buildings/r4/critic-probe/closeup_12.png`|Geometric reveals and bands; large blank glass interiors and rooftop caps.|
|`shots/buildings/r4/critic-probe/closeup_17p5.png`|Geometric reveals and bands; large blank glass interiors and rooftop caps.|
|`shots/buildings/r4/critic-probe/closeup_22.png`|Geometric reveals and bands; large blank glass interiors and rooftop caps. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/downtown_12.png`|Tower cluster with distinct crowns but repeated glazing vocabulary.|
|`shots/buildings/r4/critic-probe/suburb_12.png`|Roof/porch/chimney/lot variety; large checker-like roof patches and regular layout.|
|`shots/buildings/r4/critic-probe/industry_12.png`|Sheds,docks,silos,stacks and aprons; dark solid boundaries.|
|`shots/buildings/r4/critic-probe/block_12.png`|Balconies and corner-wrap shops; readable CAFE/BOOKS/MARKET text, repeated signs and shallow interiors.|
|`shots/buildings/r4/critic-probe/catalog_12.png`|All40catalog classes visible with mass progression.|
|`shots/buildings/r4/critic-probe/night_downtown_22.png`|Baked warm/cool individual panes and dark spandrels. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/block_22.png`|Balconies and corner-wrap shops; readable CAFE/BOOKS/MARKET text, repeated signs and shallow interiors. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/suburb_6p5.png`|Roof/porch/chimney/lot variety; large checker-like roof patches and regular layout.|
|`shots/buildings/r4/critic-probe/block_12_720.png`|Balconies and corner-wrap shops; readable CAFE/BOOKS/MARKET text, repeated signs and shallow interiors.|
|`shots/buildings/r4/critic-probe/crops_nightdt_22.png`|Full night view contains validated near/far facade landmarks. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/all_12.png`|Current democity stub shows terrain/HUD cleanly; full-game staging remains pending.|
|`shots/buildings/r4/critic-probe/all_22.png`|Current democity stub shows terrain/HUD cleanly; full-game staging remains pending. Warm/cool windows visible at22.|
|`shots/buildings/r4/critic-probe/day_lit0.png`|Daytime glazing stable; exact pair held actual module update.|
|`shots/buildings/r4/critic-probe/day_lit1.png`|Daytime glazing stable; exact pair held actual module update.|
|`shots/buildings/r4/critic-probe/lod0.png`|Baked warm/cool individual panes and dark spandrels.|
|`shots/buildings/r4/critic-probe/lod1.png`|Baked warm/cool individual panes and dark spandrels.|
|`shots/buildings/r4/critic-probe/info_off.png`|Red tint strong only in on image; restoration identical.|
|`shots/buildings/r4/critic-probe/info_on.png`|Red tint strong only in on image; restoration identical.|
|`shots/buildings/r4/critic-probe/info_restored.png`|Red tint strong only in on image; restoration identical.|
|`shots/buildings/r4/critic-probe/growth_1.png`|Same lot origin with clearly increasing building mass.|
|`shots/buildings/r4/critic-probe/growth_2.png`|Same lot origin with clearly increasing building mass.|
|`shots/buildings/r4/critic-probe/growth_3.png`|Same lot origin with clearly increasing building mass.|
|`shots/buildings/r4/critic-probe/growth_4.png`|Same lot origin with clearly increasing building mass.|
|`shots/buildings/r4/critic-probe/growth_5.png`|Same lot origin with clearly increasing building mass.|
|`shots/buildings/r4/critic-probe/day_exact0.png`|Daytime glazing stable; exact pair held actual module update.|
|`shots/buildings/r4/critic-probe/day_exact1.png`|Daytime glazing stable; exact pair held actual module update.|
|`shots/buildings/r4/critic-probe/nightFacade.png`|Baked warm/cool individual panes and dark spandrels.|
|`shots/buildings/r4/critic-probe/farTower.png`|Unscaled128crop; isolated-edge contrast measurement fails0.2% cap.|

## Strengths to preserve

- All28 prescribed captures and fresh API probes ready with zero application/GL errors on real AppleM4 Metal.
- Secondary-pass budget failure from round3 is fixed, confirmed by720 sampled rendered frames.
- Exact daytime lit override difference0; info tint difference27.300043 and restore0; all347night items lit.
- Mutation/events/roundtrip/terrain reseating and visibly distinct five-level growth work; catalog covers all40classes.
