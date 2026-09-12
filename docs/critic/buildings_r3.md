# Buildings — independent critic round3

**7.1/10 — FAIL.** API contract passes; acceptance3 and17 fail. No score is inferred from the builder’s self-score.

## Method and calibration

Read role, full module contract, architecture, CS2-LOOK and residual exceptions; viewed all eight external CS2 references anew, then every independent image below. CS2 has materially richer storefront interiors, roof assemblies and facade organisation at comparable zoom; SimBuild now reads as good indie work, not AAA. Source was not edited by this critic. References remain outside the repository.

All captures used the shared server http://127.0.0.1:5174 and ANGLE Metal AppleM4. The role’s legacy SwiftShader assumption does not apply. Concurrent browser/memory pressure and critically low host disk produced fps outliers46.5–60.2; these are reported, not represented as isolated GPU qualification. ENOSPC interrupted two initial auxiliary probes; complete reruns succeeded with zero application errors. macOS subsequently evicted three first aerial PNG/JSON pairs to dataless iCloud placeholders; those three were independently recaptured under critic-probe and viewed there. The retained original gauntlet summary remains additional timing evidence. A git status read also stalled on host hydration; no claim of a completed fresh git audit is made.

## Measured limits

28 prescribed images: max240 scene draws,2,328,812 scene triangles,0.1001ms building update,37ms building init,42textures; all ready,zero errors. Aerial max1,376,064triangles passes its1.4M limit. The global2M limit fails at closeup06:30. Auxiliary stats:11 own visible/main-camera calls,52chunks,setup631.3ms;dirty rebuild1chunk/2.4ms. LOD0/1 totals847766/252646,ratio0.298014. Four atlas textures use about52MiB before mipmaps, under96MB.

## Acceptance checklist

| # | Result | Evidence |
|---|---|---|
|1|PASS|Block relief .14/.07/.18m; closeup .14/.07/.20m. Local triangles per qualifying building4534.3 and6166.5. Window-head/jamb relief and separate bands visible; named nearest samples below.|
|2|PASS|Downtown all6 required crowns, 22 roof heights separated≥4m,tallest182.793/median33.900=5.392,adjacentTwins0.|
|3|FAIL|24586/65739lit cells=37.40%;92whole-scene brightness tiers; warm12025/cool12561. Baked attribute uses unsigned integer hash, no fragment sin hash. Near200crop ratio6.9208 passes; far128crop0.235615% fails<0.2%. Crop raycast IDs122/117,dist179.58/287.25m.|
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
|14|PASS|Exact held-update daytime setLit0/1meanRGBdiff0. All frame clipping<.3%,max.238764%;nightp1>0,p99<250. uNight initial/day0.|
|15|PASS measured|Glass roughness.44,frame.40/.42; atlas masonry/roof floors retained;normalScale.55 with distance fade. No exposure/fog/light writes. Residual building-surface bright mask is not measurable and is not failed.|
|16|PASS measured|LOD pixel meanAbs1.0833<4;triangle ratio.298014<.35. Crown/footprint silhouettes retained by inspection; residual2px edge metric not invented.|
|17|FAIL|closeup6.5=2,328,812>2M. All other listed numeric limits pass in collected data, including declared400/2M budget.|
|18|PASS|Every28prescribed image ready/errors0,includingall12/all22and720p. Full-game all is still terrain/HUD because democity is pending; not a buildings-black-frame defect.|
|19|PASS|Spawn348mesh+2158tri,inside348/outside1mnull;level1→2floors8→12;height33.766→51.736. Demolishfreeslot and restores triangles. Each mutation version+1/correctadded/updated/removed ids. Serialize styles/tris/nextId exact.|
|20|PASS|Seed1337repeat styles and triangles identical; seed7differs29/40classcounts=72.5%. Source search has no Math.random or fragment fract(sin; timers are profiling.|
|21|PASS|Tintweight.88,emissive suppression in shader; full-frame meanRGBdiff27.2851>20,remove tint restores exactly0.|
|22|PASS|Day0/347lit;night347/347lit.|
|23|PASS|Item105levels1…5heights8.7,12.01,20.955,30.005,45.055. SameXZ,reseatedY;smalleststep3.31≥2.5. Restore847676vs847766=.0106% within1%. Five images visibly grow.|

Full raw API/crop/photometric data: `shots/buildings/r3/critic-probe/apicheck.json`, `extra.json`, `measurements.json`, `shot-metadata.json`.

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

1. **major: Reflection-frame triangle budget exceeded** — Independent closeup_6p5 capture measures 2,328,812 scene triangles against the 2,000,000 cap. Main aerial captures remain below 1,400,000; no blanket aerial failure is asserted. Reduce geometry rendered in secondary/shadow passes while preserving facade relief. Evidence: `shots/buildings/r3/closeup_6p5.json`.

2. **minor: Far-window isolated contrast remains above the limit** — The validated 128×128 farTower landmark, centre hit building117 at287.246m, measures0.235615% pixels differing from both horizontal neighbours by more than40, against<0.2%. This is a static pixel test, not a claim of observed animation flicker. Near-facade contrast now passes6.9208×. Evidence: `shots/buildings/r3/critic-probe/measurements.json`.

3. **minor: Facade and roof language still reads as a procedural kit** — At closeup and block, the same narrow window/shadow motifs repeat through many storeys; large blank stepped roof masses and barcode-like shop signs limit realism. Macro crown/style uniqueness and the explicit bay variation checks pass. This is calibrated visual quality feedback, not an invented additional acceptance threshold. Evidence: `shots/buildings/r3/block_12.png`.

## Per-image inspection

Every image below was opened individually with the image reader. Crops are unchanged extracts for measurement, not edited evidence.

|Image|Observed read|
|---|---|
|`shots/buildings/r3/critic-probe/aerial_6p5.png`|Dense height/crown variety and paved lots; repeating glass bands. 212draw/1372010tri;errors0.|
|`shots/buildings/r3/critic-probe/aerial_12.png`|Dense height/crown variety and paved lots; repeating glass bands. 203draw/1354676tri;errors0.|
|`shots/buildings/r3/critic-probe/aerial_17p5.png`|Dense height/crown variety and paved lots; repeating glass bands. 212draw/1376064tri;errors0.|
|`shots/buildings/r3/aerial_22.png`|Dense height/crown variety and paved lots; repeating glass bands. Dark facade with warm/cool window lights. 206draw/1356418tri;errors0.|
|`shots/buildings/r3/street_6p5.png`|Window reveals and glazing readable; very regular tall bays and bare office interiors. 162draw/1778758tri;errors0.|
|`shots/buildings/r3/street_12.png`|Window reveals and glazing readable; very regular tall bays and bare office interiors. 134draw/1683422tri;errors0.|
|`shots/buildings/r3/street_17p5.png`|Window reveals and glazing readable; very regular tall bays and bare office interiors. 154draw/1741060tri;errors0.|
|`shots/buildings/r3/street_22.png`|Window reveals and glazing readable; very regular tall bays and bare office interiors. Dark facade with warm/cool window lights. 136draw/1691418tri;errors0.|
|`shots/buildings/r3/skyline_6p5.png`|Varied city silhouette and roof crowns; distant facade detail smooths into bands. 236draw/1701958tri;errors0.|
|`shots/buildings/r3/skyline_12.png`|Varied city silhouette and roof crowns; distant facade detail smooths into bands. 228draw/1666538tri;errors0.|
|`shots/buildings/r3/skyline_17p5.png`|Varied city silhouette and roof crowns; distant facade detail smooths into bands. 240draw/1717584tri;errors0.|
|`shots/buildings/r3/skyline_22.png`|Varied city silhouette and roof crowns; distant facade detail smooths into bands. Dark facade with warm/cool window lights. 223draw/1593412tri;errors0.|
|`shots/buildings/r3/closeup_6p5.png`|Real relief and distinct plinths; large repetitive glazing panels dominate. 196draw/2328812tri;errors0.|
|`shots/buildings/r3/closeup_12.png`|Real relief and distinct plinths; large repetitive glazing panels dominate. 148draw/1903122tri;errors0.|
|`shots/buildings/r3/closeup_17p5.png`|Real relief and distinct plinths; large repetitive glazing panels dominate. 156draw/1945272tri;errors0.|
|`shots/buildings/r3/closeup_22.png`|Real relief and distinct plinths; large repetitive glazing panels dominate. Dark facade with warm/cool window lights. 152draw/1932446tri;errors0.|
|`shots/buildings/r3/downtown_12.png`|Detailed tower cluster with different crowns; oversized roof blocks. 180draw/1547334tri;errors0.|
|`shots/buildings/r3/suburb_12.png`|Pitched roofs, porches,chimneys,drives and mown lots; regular kit layout. 175draw/1501408tri;errors0.|
|`shots/buildings/r3/industry_12.png`|Loading aprons,silos,stacks and sheds; unusually dark solid boundary strips. 153draw/1253658tri;errors0.|
|`shots/buildings/r3/block_12.png`|Balconies,corner shops and frontage transitions readable; generic stripe signs. 109draw/1416486tri;errors0.|
|`shots/buildings/r3/catalog_12.png`|All40rows/cells visible with mass and roof progression. 150draw/919544tri;errors0.|
|`shots/buildings/r3/night_downtown_22.png`|Baked warm/cool panes and dark inter-window strips; no blank mass regression. Dark facade with warm/cool window lights. 156draw/1726244tri;errors0.|
|`shots/buildings/r3/block_22.png`|Balconies,corner shops and frontage transitions readable; generic stripe signs. Dark facade with warm/cool window lights. 105draw/1371234tri;errors0.|
|`shots/buildings/r3/suburb_6p5.png`|Pitched roofs, porches,chimneys,drives and mown lots; regular kit layout. 187draw/1534752tri;errors0.|
|`shots/buildings/r3/crops_nightdt_22.png`|Near and far facade landmarks are identifiable in full-resolution night view. Dark facade with warm/cool window lights. 156draw/1726244tri;errors0.|
|`shots/buildings/r3/all_12.png`|Terrain/HUD only at current democity-stub stage; clean rendering. 32draw/163894tri;errors0.|
|`shots/buildings/r3/all_22.png`|Terrain/HUD only at current democity-stub stage; clean rendering. Night terrain visible. 38draw/998686tri;errors0.|
|`shots/buildings/r3_720/block_12.png`|Balconies,corner shops and frontage transitions readable; generic stripe signs.720p clean. 109draw/1416486tri;errors0.|
|`shots/buildings/r3/critic-probe/day_exact0.png`|Daytime glazing unchanged by lit-state override.|
|`shots/buildings/r3/critic-probe/day_exact1.png`|Daytime glazing unchanged by lit-state override.|
|`shots/buildings/r3/critic-probe/day_lit0.png`|Daytime glazing unchanged by lit-state override.|
|`shots/buildings/r3/critic-probe/day_lit1.png`|Daytime glazing unchanged by lit-state override.|
|`shots/buildings/r3/critic-probe/lod0.png`|Detailed/simplified skyline keeps mass; relief differs.|
|`shots/buildings/r3/critic-probe/lod1.png`|Detailed/simplified skyline keeps mass; relief differs.|
|`shots/buildings/r3/critic-probe/info_off.png`|Strong red tint only in on frame; off/restored identical.|
|`shots/buildings/r3/critic-probe/info_on.png`|Strong red tint only in on frame; off/restored identical.|
|`shots/buildings/r3/critic-probe/info_restored.png`|Strong red tint only in on frame; off/restored identical.|
|`shots/buildings/r3/critic-probe/growth_1.png`|Same lot origin; building grows through the five inspected levels.|
|`shots/buildings/r3/critic-probe/growth_2.png`|Same lot origin; building grows through the five inspected levels.|
|`shots/buildings/r3/critic-probe/growth_3.png`|Same lot origin; building grows through the five inspected levels.|
|`shots/buildings/r3/critic-probe/growth_4.png`|Same lot origin; building grows through the five inspected levels.|
|`shots/buildings/r3/critic-probe/growth_5.png`|Same lot origin; building grows through the five inspected levels.|
|`shots/buildings/r3/critic-probe/nightFacade.png`|Unscaled pinned night crop; warm/cool panes and isolated edge contrast measurable.|
|`shots/buildings/r3/critic-probe/farTower.png`|Unscaled pinned night crop; warm/cool panes and isolated edge contrast measurable.|

## Strengths to preserve

- All28 prescribed images and API probes render ready with zero errors on AppleM4 Metal.
- Daytime emissive exactly zero; tinted info view restores pixel-identically; all347night items are lit.
- Local facade relief, terrain reseating, stable growth origin, all40catalog classes, roof crowns, lot surfaces and mutation events now work.
- Determinism and serialisation preserve styles and triangle counts; visible own calls independently match reported11.
