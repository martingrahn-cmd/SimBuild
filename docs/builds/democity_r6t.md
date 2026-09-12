# Democity r6t accepted active planar-reflection cadence

r6s proves that the animated water path redraws the half-resolution planar city reflection every active frame. r6t keeps the water shader, ripples, foam and glints animated every frame, but refreshes a fixed-camera active reflection every fourth frame. Camera motion and explicit terrain/infoview invalidations still refresh immediately. Paused scenes retain the existing eighth-frame safety refresh.

The first water-only cadence edit had no effect because terrain treated every tiny clock-driven sun movement as an explicit invalidation. That intermediate result is rejected. The accepted owner integration distinguishes ordinary advancing time from paused/manual time: ordinary sun motion uses the same four-frame animation cadence, while paused/manual changes still invalidate immediately.

The cadence probe observes 15 reflections in 120 paused fixed-camera frames, 30 in 120 active fixed-camera frames and 120 in 120 active moving-camera frames. Four active aerial-night controls improve from 39.72–41.89 fps at 416.9 average draws / 2.354M average triangles to 43.64–44.46 fps at 336.0 average draws / 1.971M average triangles. Peak geometry is unchanged because the real reflection still renders.

Terrain coast and Democity bridge/aerial active captures were inspected at noon, golden hour and night. The planar reflection, shoreline, moving-game state and water body remain visually intact. The full paused 16-frame Metal matrix is 16/16 zero-error at 532 maximum draws, 2,997,270 maximum triangles and 46.5 minimum fps. Public API, double deserialization, all eight tour stops and exact 1337→7→1337→7 authored restage pass. Production build passes 163 modules.

r6t is accepted with Democity held at 6.0 FAIL. It removes redundant active reflection work without removing scene content, but active fixed-camera performance remains below 50 fps, lifecycle heap remains failed, and broader visual/gameplay gates are unchanged.
