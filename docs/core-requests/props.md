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
