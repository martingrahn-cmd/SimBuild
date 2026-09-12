# Democity builder round 3

**Self-score: 5.7 / 10 — FAIL.** Independent critic score is pending. The all-mode startup defect is fixed. The scene remains visibly below the target, and cross-seed lifecycle, scale, seating, lighting and whole-game resource limits prevent a pass.

Fixed all-mode startup through an explicit public initial-building spawn before deterministic pre-simulation. Both aliases now produce the same real 8,047-resident city with 30 paid facilities, positive cash and retained loan. Expanded legitimate civic coverage and cleared obstructing native foreground trees. Visual/scale/budget/cross-seed targets still fail; final bounded r3, then freeze.

## Implemented changes

- Seed the first neighbourhood through public `buildings.spawnFreeLots` before pre-simulation in both showcase aliases. The final exact alias probe compares every building record, facility record, count and pre-roll field.
- Place three clinics and six schools through the existing service owner and validation. Thirty accepted facilities across eleven kinds cost 502,000. University remains rejected when no valid site exists. Combined health/education coverage rises from 15.41% to 59.10%; it is still below 60%. The occupied civic plots reduce total building yield from 652 to 611.
- Keep public props density and perform its initial build only when public count is zero; `setDensity` alone does not build a deferred fresh forest. Remove native trees intersecting actual landmark/forecourt/camera corridors. Final public landscaping removes 77 trees and plants 27 park trees, with 126 park trees across eight species. The night view still frames too much lawn.
- Four actual-browser alternative grid-layout trials were discarded: none simultaneously retained required road topology and improved stock sufficiently. No trial state or altered city count was used as final evidence.

## Real simulation and finance

Both `showcase=democity` and `showcase=all` produce 8,047 residents, 20,243 job capacity, treasury 25,848.0004 and daily net +10,247.5019 at the canonical frozen probe. Job capacity is not measured employment. The city retains a 231,000-principal loan, remaining repayment 249,451.5205. No population, treasury or service-capacity field was fabricated. Bootstrap uses 120,340 public simulation ticks in deterministic batches, and creates the real four-bus/eight-stop line after bootstrap. This authored pre-simulation is separate from root’s ordinary UI earned-city evidence. Root’s transit fare/operating-cost integration is still unapplied in these formal frames; final integration must recheck actual finance. Small 8,047→8,049 HUD differences in some later camera frames reflect native updates, not a different claimed canonical probe.

## Verification and resource cost

All 37 official PNG captures were individually viewed, as were three development smokes, two road-mask diagnostics and all eight CS2 references. The set includes the four default cameras at four hours, seed 7, all named presets, 720p, a full-resolution repeat and final all-mode noon/night captures. Every official capture has zero console errors and all sixteen modules ready. The live shared server was port 5174; System Chrome 152 used Apple M4 Metal. Minimum observed fps was 12.4; these are not SwiftShader measurements.

Whole-scene maxima: **942 draw calls, 5,061,897 triangles, 1,000.7 MB heap, 74 textures**. Overview alone renders 2,935,963 triangles. Draws and textures pass; triangles and heap fail. One hundred instrumented frames across five views attribute at most 37 render calls / 17,472 triangles to democity objects across native passes. The authored geometry itself is eight batches / 3,600 triangles. This small own layer does not excuse the whole-scene failure.

Same-seed restage twice, own deserialize twice and awaited native IndexedDB save/load pass. Cross-seed restage fails: fresh seed 7 has 654 buildings, but restaging from seed 1337 yields 622. A complete empty-world browser reload was not repeated by this builder in r3; independent r2 had passed that test, and root final integration owns the new complete persistence checks. Play-mode startup remains empty. Tour camera/hour/events and cancellation were probed; the entire timed 56-second tour was not measured.

Fresh seed 1337 staging took 5,657.9 ms, including 1,333.1 ms of initial growth. The source uses a deterministic simulation cap, not a wall-clock stopping branch. All 24 owned files were copied before final evidence and verified byte-for-byte afterwards against `shots/democity/r3/source/`; `source-after.json` records the match. Source remains frozen.

## Acceptance, all 24 items

1. **FAIL** — 468 nodes,604 edges and 36.486 km roads retain all required types.10,017 cells and 611 real lots/buildings fail 11,000/1,400/1,200; built 64 m-cell union 1.806336 km²<2.0.30 civic facilities consume formerly zonable land; this stock regression is explicit.

2. **FAIL** — Public 40×40 aerial ground grid:97.16% city and 82.02% hard surface pass. Only 11 central towers>60 m,one building on each street side and 9 nearby night towers fail. Closeup 6 and signalised intersection pass. Clearing the physical night forecourt improves visibility but still frames lawn and a wall.

3. **FAIL** — Night skyline mean 59.521 > 55, p 50 48.529 > 42, p 99/p 50 3.434 < 4 and bright fraction 0.599% < 0.8%. Aerial night has 597 full-resolution bright clusters distributed over all 16 tiles; near night whole-frame rows pass. Pinned lamp head peak 54.14 and pool mean 24.38 are weak; no lights-off pool comparison was performed. The former tree obstruction is reduced, but lawn and a wall still dominate night_street.

4. **PASS** — All four noon default views meet p 1, p 50, p 99, clipping, saturation and aerial contrast limits. Full-resolution public pinned sun/shadow patches have means 94.0647 / 5.6553 = 16.633:1. Closeup repeat has unchanged framing; the native pinned shadow patch is very dark, but the whole-frame p 1 remains 10.236.

5. **FAIL** — Golden skyline has 21.596% pixels above luma 235 and a 28.111% largest flat patch. Full-width projected horizon band std 82.037 passes, yet the right horizon visibly clips and distant detail washes out. Same-session shadow-road visibility mask gives saturation 0.4358 > 0.28 over 24,130 pixels, hue 212.04 degrees. No weather/grade changes in this bounded round.

6. **FAIL** — Nine districts and all kinds. Ring height medians 51.05,30.22,17.83,9.05,5.72 decrease monotonically. Industry/suburb mean footprint ratio 343.047/165.013=2.079<2.2; suburb/downtown spacing 25.453/33.908=.751<2.

7. **PARTIAL** — 32 highway segments total 2376.414 m and within-segment turn.13438°/m pass, with three real one-way ramps and native 16-node roundabout. Abrupt mountain approaches remain visibly implausible. Grade separation stays explicitly ungraded under the public height-API exception.

8. **FAIL** — Avenue 982 and street 983 are 480 m apart. Forty samples per bridge give minimum water clearance 2.320576 / 4.317209 m; avenue fails 3.5 m. End gaps are approximately 0.25 m. Fresh seed 7 bridges give 3.877824 / 3.727394 m and pass clearance; complete developed-bank fraction remains unmeasured.

9. **FAIL** — Deterministic hashed-ID 200-building samples give maximum highest-corner gaps.711996 m(seed 1337) and.540365 m(seed 7). Own hospital gap.488396 m remains. Exact samples/landmark corners are saved. No private heights or selective sample removal used; zero own props makes 100-own-prop samples inapplicable.

10. **FAIL** — 183 low houses in two actual suburb districts<250. All 183 have driveway and hedge/fence,7 roof values and 12 styles. Seven nearby footprint/roof duplicate pairs remain. Historical two-garden-tree contract is obsolete and recorded without fabricated enforcement.

11. **FAIL** — 31 actual industrial buildings inside industry<40,39 street/gravel edges and 697.57 m distance from centre. Three silos,two stacks,two cranes,one apron retained; cranes 44/26 m from water. Simple fixtures and oversized power silhouettes remain visible.

12. **PARTIAL** — Park 38,400 m² has 126 actual trees,8 species and 5 lamps, with no near-identical heading/scale pair. Two boundary lots remain.77 native trees removed from real forecourts/pads,27 park trees planted; public props owns all records. Promenade 1003.195 m; complete green-edge continuity is not numerically graded.

13. **FAIL** — 30 real facilities across 11 kinds,502,000 native placement cost.507/511 homes have nonzero power+water(99.22%);302/511 have bothhealth+education(59.10%<60). This improves 15.41% but is not rounded into a pass. Power 2040/water 1600/sewage 1600/garbage 1400 remain below some actual demand. University has no valid site and is not forced.

14. **PARTIAL** — Actual transit API creates one closed 3305.298 m route,eight stops andfour native buses. No democity duplicate fleet. Saved line colour is blue; requested teal is not falsely claimed accepted. Shelters/buses are visually reviewed but exact prescribed street/downtown bus visibility remains ungraded.

15. **PASS real owners; absent branches UNGRADED** — All four capability tests find real owners; all fallback flags false. Own trees/lamps/parked/vehicles/buses 0. Public props count distinguishes deferred first build before landscaping. No missing-owner injection or invented dormant fallback completeness.

16. **FAIL** — Native census finds 5 vehicles,4 kinds and 8 pedestrians within 150 m of street target. Pedestrians pass; vehicles/kinds do not. Traffic owner populates its own fleet; no duplicate unmanaged population was created.

17. **PASS measured repeat; other seams PARTIAL** — Full-resolution closeup repeat RGB mean absolute difference is 0.004104 / 255, with no excluded rectangles. No camera-tour drift or visible repeated-frame flicker. Some terrain/road edges remain visually rough; seating is separately failed under item 9. Own ground placement generally uses 0.045 m clearance, with sloped landmark exceptions disclosed.

18. **FAIL** — Full-resolution detrended overlap-Pearson maximum |r| is 0.565299 in aerial noon columns, above 0.55; its rows are 0.360784. Aerial golden maxima 0.346041 / 0.404408 and overview 0.205080 / 0.313814 pass. Own roughness 0.88 and normalScale 0.18 pass. Non-window-only specular mask remains ungraded under residual notes.

19. **FAIL** — Across all 37 official captures: max 942 draws, 5,061,897 triangles, 1,000.7 MB heap, 74 textures; min observed Metal fps 12.4. Overview has 2,935,963 triangles > 2.2 M. Draw and texture limits pass; whole-scene triangles and heap fail. Direct instrumented owned-object rendering over 100 frames / five views peaks 37 all-pass calls and 17,472 triangles (native landmark geometry 8 draws / 3,600 triangles). Idle 0 ms; sustained tour timing unmeasured. No neighbouring-owner scene subtraction is claimed.

20. **PASS supported paths** — All 37 official captures have zero errors and all 16 modules ready. The 720 p frame and final all-mode noon/night images were individually viewed. Exact all/democity startup comparison passes every building, facility, count and pre-roll field in aliases.json; the former 1-resident all startup failure is fixed.

21. **FAIL cross-seed; same-seed/save PASS** — Two own deserializes andtwo same-seed restages preserve counts and exact native centres; awaited native IDB save/load passes. Freshseed 7 has 654 buildings vs cross-seedrestage 622. None of nine district centres moves>50 m. Whole-terrain public reset remains absent; no private seed mutation.

22. **PASS API; full timed tour UNGRADED** — Eight 7-second stops; all valid gotoStop calls apply native camera/hour,invalid 100 rejects,events emit,startTour uses flyTo 2 seconds andstop cancels the flight. No automatic capture drift. Full 56-second loop unmeasured.

23. **PASS measured population/economy; land-value maximum UNGRADED** — Both aliases have 8047 real residents after 120340 deterministic public ticks,20243 job capacity,cash 25848.0004,net+10247.5019/day,tax 12%,retained 231000 principal loan. C/I demands>.15,happiness.6858 andnativegrids. This pre-simulation is distinct from an organically earned player city. Transit fiscal integration remains unapplied in these formal measurements.

24. **PASS measured Metal; degradation UNGRADED** — Fresh seed 1337 stage 5657.9 ms,initial settlement 1333.1 ms;deterministic 240-tick batches cap 144000 andfinal 100 ticks. Init lightweight,play-mode stage remains empty,assets settle. Actual SystemChrome 152/AppleM 4 Metal/shared 5174;no SwiftShader claim. Missing-owner branches not injected.

## Evidence and next work

Evidence index: `shots/democity/rdev3/full-summary.json`, `viewed.json`, `probe.json`, `seed7-probe.json`, `aliases.json`, `contracts.json`, `cityfill.json`, `imgstats.json`, `tiling.json`, `road-shadow.json`, `park-species.json`, `layout-trials.json`; supplementary seed-7 PNGs are in `rdev3s7`. The JSON report lists all viewed paths and raw native city/finance statistics. The three development smoke images precede source freeze and are not substituted for final acceptance captures.

- City stock and enclosure still fail: 611 buildings/lots, 10,017 cells, 1.806 km² developed union, sparse street foreground and too few central towers. Added paid civic sites reduce stock from r2.
- Whole scene exceeds triangle and heap budgets: 5,061,897 triangles and 1,000.7 MB maximum; overview 2,935,963 triangles. Minimum observed Apple M4 Metal fps is 12.4.
- Avenue bridge clearance is 2.3206 m; highest-corner building seating gap reaches 0.712 m and the own hospital gap is 0.488 m.
- Night skyline remains too bright overall and insufficiently articulated by its lights; lamp pools and lawn-heavy night framing are weak. Golden skyline clipping and saturated shadow asphalt remain.
- Civic health-and-education coverage is 59.0998%, below the literal 60% target, with some utility capacity below demand. University placement remains rejected.
- District grain, 183 suburb houses, 31 industrial buildings, seven nearby duplicate house pairs, and limited local traffic fail their targets.
- Cross-seed restaging differs from a fresh seed-7 boot; no district centre changes by more than 50 m. Public terrain lifecycle and owner layout variation remain separate unsolved issues.
- Aerial-noon detrended column autocorrelation 0.5653 exceeds 0.55. Missing-owner fallbacks, complete timed tour, lights-off pool comparison and some asset masks remain ungraded.
- Core camera aliases, legacy-save democity clearing, public transient-notification dismissal and transit fiscal integration remain pending root integration; these formal measurements precede that integration.

Core integration requests are retained in `docs/core-requests/democity.md`. The builder stops at the current r3 checkpoint. Remaining work is recorded for later user-directed development; no r4 or next wave starts.
