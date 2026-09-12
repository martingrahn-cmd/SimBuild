# core requests — props

## 1. Record a 256 m chunk size for `props` in ARCHITECTURE §9 (deviation on record)

**Status: deviation shipped in round 2, exemption requested.**

ARCHITECTURE §9, `BUILDER.md` and `src/core/constants.js:5` (`TILE_SIZE = 128`) all say instanced content is
chunked into 128 m tiles. `props` chunks at **256 m instead**, for `props` only. `terrain`, `buildings`,
`traffic` and everything else are unchanged.

**Why.** Chunk count is what the shadow-cascade multiplier multiplies. At `quality=high`,
`QUALITY.high.cascades = 3` (`src/core/constants.js:42`) and three counts every cascade's shadow pass in
`renderer.info.render.calls`, so a shadow-casting mesh costs 1 colour draw plus one draw per cascade frustum it
intersects. props has four kind-classes and very many instances, so the per-chunk mesh count is fixed at
4 casting + 2 non-casting whatever the chunk size — but the number of chunks in frame scales with 1/size².
128 m tiles put ≈ 4× as many chunks in the frustum:

```
256 m: ~9 chunks in frame x [4 casting x (1 colour + ~1.5 cascades)] + impostor + transparent  ~= 110 draws
128 m: ~34 chunks in frame, same per-chunk cost                                                ~= 380 draws
```

The props module spec (`docs/prompts/modules/props.md` §5) already specifies 256 m and derives the ≤ 120
draw-call cap from that arithmetic, but `CRITIC.md` ranks ARCHITECTURE above a module spec.

**Proposed change.** In ARCHITECTURE §9, after "chunk the city into 128 m tiles", add:

> …chunk the city into 128 m tiles — except `props`, which chunks at **256 m**: it owns four kind-classes and
> tens of thousands of instances, so its cost is dominated by (chunks in frustum × cascades) rather than by
> instance count, and 128 m tiles would put it ~4× over its 400-draw budget.

No code change in `src/core/` is required; `TILE_SIZE` stays 128 and props does not read it.

## 2. (no other requests)

props needs nothing else from core this round. In particular it does **not** ask for `THREE.PointLight`s: the
round-1 build added four and they are gone. Night lamp light is delivered entirely by the emissive luminaire
head, the camera-facing halo billboard and the additive ground light-pool decal, as the props spec's preamble
requires.

## Notes on two judgement calls the critic may want to see stated

1. **Impostors cast shadows in top-down mode only.** The §5 table says the impostor tier never casts. But item
   17 wants long prop shadows at 06.5/17.5 and item 18 wants aerial shadows, and at the `aerial` preset
   (520 m) every tree is in the impostor tier, so a never-casting impostor means an aerial frame with no tree
   shadow at all — exactly round 1's issue 10. props therefore sets `castShadow = true` on the impostor mesh
   **only when the impostor is in top-down mode** (camera pitch > 0.62, where the tier renders its horizontal
   canopy cap and the vertical billboard is collapsed) **and** the chunk is within the 620 m detail radius. In
   that mode the near tiers are empty, so the per-chunk casting-mesh count stays at 4 and the draw arithmetic
   above is unchanged.
2. **Chunk detail radius, not the CSM range.** §5 says a chunk beyond ~220 m contributes exactly one
   non-casting impostor draw. Taken literally that removes every lamp column and hedge from the `aerial`
   frame (the camera is 520 m away), which item 18 explicitly grades. props uses **620 m** as the detail
   radius instead — the distance at which a 9 m lamp column stops being a ≥ 1 px vertical — and keeps the
   one-impostor-draw rule beyond it, so `skyline` (900 m) still costs one draw per chunk.

## Integrator decision (local continuation, 2026-09-06)

Accepted the existing module-spec 256 m props chunk size as a documented exception in ARCHITECTURE §9. It reduces chunk × CSM draw cost; the absolute declared module and whole-game budgets remain unchanged and must still be measured. The top-down impostor shadow and 620 m detail-radius choices remain reviewable on their rendered evidence; this exception does not waive visual quality requirements.

## Round 3 implementation notes (supersede the earlier top-down judgement call)

The 256 m exception remains accepted as recorded above. Automatic top-down views now use LOD1 crown geometry instead of horizontal impostor caps. Impostors no longer cast shadows. The 620 m hard-furniture detail radius remains. This improves the absence of flat caps but the aerial frame still reads too sparse and speckled; it is not a visual pass. The fresh noon props-on/off measurement attributes 761,822 triangles to props in aerial, exceeding the 700,000 showcase limit; the whole frame remains under 1.8 million. This is a known round-3 budget miss, not a requested exemption.

Shelter glazing is a separate merged, non-shadow-casting transparent mesh in each occupied shelter chunk, adding a material draw beyond the original four-class arithmetic. Measured draws remain within the absolute cap (maximum measured attributable draws 53 across the seven noon toggle views; main-matrix scene maximum 141). The lamp diagnostic camera is 20.5 m from its anchor rather than the specified 12 m so the complete pole/head and pool footprint fit. Its pool rectangle still includes substantial unlit ground, and its head clips near 255; those measurements are not waived.

## Round 4 implementation and verification

Road edits now invalidate obstructing nearby props and resnap affected furniture; terrain regeneration ignores stale saved manual heights. Joining an existing junction deliberately regenerates its rule graph so old trims/anchors cannot survive. The isolated-road CPU scaling probe does not establish density-independent cost for this junction fallback. Generated identities and their high-water mark now survive full rebuild and save/restore; deleted intent locations remain suppressed. Fresh14-item demolition/rebuild probes find no retired ID reuse or surviving identity alias.

Pools now sample the maximum of terrain and optional authoritative `roads.surfaceHeightAt(x,z)`, then add0.025m, on a24×24 grid. This consumes the integrator's additive API without modifying roads or core. The visible triangular intersections are reduced, but the strict seam/gradient test and pool ratio are not established; the final lamp crop omits pool/unlit rectangles when they do not fit. No exemption is requested.

LOD1 uses48 two-triangle cards rather than34 four-triangle cards. Final seven-noon-view on/off attribution including rendered passes peaks at56 draws /546534 triangles; aerial is546534 versus critic3's795744. The full35-shot whole-scene peak is146 draws /1607110 triangles, errors0. Night attribution across every preset and module-isolated heap growth remain unmeasured. The old620m hard-detail radius, extra transparent shelter draw and20.5m lamp camera remain disclosed deviations. Bark64px luminance std is8.6607; lamp/bus-stop head p99 is209.107/212.967. Hedges have closed rounded shoulders/end faces, but still read as textured solids. Flat crown cards, far conifer repetition, aerial fragmentation, daytime speckle and night black fraction remain visual misses.


## Integrator decision (wave 2 final, 2026-09-06)

The256m chunk exception and isRoad0|1|2 contract remain documented; absolute render budgets are unchanged. Final critic4 validates stable identities/removal, including no retired-ID reuse. Its per-kind debug visibility bug and remaining tree LOD/speckle/night crop failures remain visible in the verdict, not converted to passes. Deferred optional boundsOf: tools has a guarded per-kind/species fallback; authoritative kit metadata belongs to props. Service-footprint forest exclusion will be integrated only against the actual services owner in wave2b.


## Integrator decision (wave 2b final, 2026-09-08)

Applied common oriented service-footprint exclusion to automatically generated props, preserving manually placed objects. Semantic geometry changes invalidate caches; routine load/supply version changes do not regenerate trees. Services retains ownership of its own park/civic kit. Deferred optional boundsOf as before; guarded tools fallback remains. Existing independent foliage LOD/night and debug visibility failures remain open.

## Integrator decision (wave 3 final, 2026-09-08)

Retained service/lot mask contracts and256m chunk exception; no budget relaxation. Democity uses public setDensity/rebuild/plant/remove and does not write private prop records or generate duplicate forests. Optional landmark exclusion API deferred; existing public workaround serves current staging. Occlusion and LOD/speckle failures remain. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.
