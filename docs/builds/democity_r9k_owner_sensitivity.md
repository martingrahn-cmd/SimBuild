# Democity R9k — controlled owner render-sensitivity diagnosis

## Local decision

**Accept the verifier repair and a bounded Props-first attribution direction. Make no product or score change; Democity and whole-game remain 6.0/10, FAIL.**

R8p/R8q removed two real CPU callbacks without certifying sustained 50 fps. The ranked whole-game issue asked for warmed owner masks with controlled reflection cadence and an explicit comparison of the headless verification policy. R9k supplies that diagnosis before any further optimization.

## Verifier

`tools/interleaved-owner-profile.mjs` gives each owner a fresh actual-Chrome/Metal page at fixed seed 1337, interchange camera, 22:00, High quality and speed 0. It disables planar-water reflection before sampling, warms the page, then runs `A0-B0-A1-B1-A2-B2-A3`. During each B block the owner root group's `visible` property is locked false so owner updates cannot silently restore it. Every B is compared with the mean of its adjacent A controls. A cycle is stable only when adjacent controls differ by at most 5%.

Four policies were attempted:

- the initial capture-sync-on run is zero-error but fails the verifier stability gate for terrain/buildings;
- the initial no-sync run is zero-error but several owners sit at the 60 Hz ceiling and roads/services drift, so it cannot measure full sensitivity;
- diagnostic uncapped/no-sync re-establishes at least two stable cycles for all five high-cost owners;
- matching diagnostic uncapped/headless-on passes stability for terrain, Props, roads and buildings. Services is superseded by a longer five-cycle run with two stable cycles.

The uncapped flags are diagnosis-only. `CAPTURE_SYNC` switches the whole `headless=1` product URL policy: it changes `preserveDrawingBuffer`, and both Effects and Engine execute readback in that mode. It is therefore a headless-on/off comparison, not an isolated readback-cost experiment. Neither policy replaces the official capped, reflection-enabled, headless screenshot gate.

## Results

Conventional medians over stable adjacent-control pairs only:

| Owner | Uncapped, headless off | Uncapped, headless on | Median submitted delta under mask |
|---|---:|---:|---:|
| terrain | +11.793% | +9.893% | -13 draws / about -251k triangles |
| props | +10.138% | **+17.320%** | -31 draws / about -833k triangles |
| roads | +7.927% | +15.859% | -21 draws / about -385k triangles |
| services | +3.165% | +5.234% long rerun | -33 draws / about -84k triangles |
| buildings | +6.026% | +9.156% | -67 draws / about -124k triangles |

Props combines the largest headless-on stable-pair response, the largest submitted-triangle delta and a stable headless-off response. Roads is close under headless-on and terrain remains a real secondary cost. The difference between policies shows that the complete headless path changes relative sensitivity; it does not assign that difference to readback or any one owner.

Full-series medians, including unstable pairs, are retained in the JSON and match the verifier summaries; they are not the table above. Buildings' headless-off three responses vary materially even though two adjacent-control pairs pass. Services likewise required a longer run and has only two stable headless-on cycles. Traffic and Transit were present in the initial capped series but are not included in the uncapped owner ranking; the diagnosis is sufficient to choose the next measurement area without claiming exhaustive owner ordering.

## Verification and visual state

All retained samples have zero engine/browser/HTTP errors. Masked submitted draw/triangle deltas remain tightly consistent even where wall-time controls drift. The current unchanged product builds 163 modules. A fresh actual-Metal aerial smoke is inspected and reports 16 ready modules, errors 0, 55.8 fps, 430 draws, 2,061,474 triangles and 489.6 MB raw heap. It is one daytime smoke, not sustained performance or a W5 gate pass.

An accidental SwiftShader smoke was also captured and is retained as invalid performance evidence. Its image is visually coherent and error-free, but its 0.9 fps result is not used.

## Evidence

- `shots/democity/r9k-owner-sensitivity/sync-on.json` — initial unstable synchronized series
- `shots/democity/r9k-owner-sensitivity/sync-off.json` — initial capped/no-sync ceiling diagnosis
- `shots/democity/r9k-owner-sensitivity/sync-off-uncapped.json` — accepted diagnostic no-sync series
- `shots/democity/r9k-owner-sensitivity/sync-on-uncapped.json` — accepted terrain/Props/roads/buildings synchronized rows; services row rejected for drift
- `shots/democity/r9k-owner-sensitivity/sync-on-services-long.json` — accepted bounded Services replacement
- `shots/democity/r9k-owner-sensitivity/smoke-metal.png` and JSON sidecar
- `tools/interleaved-owner-profile.mjs`

## Limits and next step

Visibility masks remove complete owner groups and are attribution, not acceptable product behavior. FPS deltas are wall-time sensitivity on one fixed scene and host session. Uncapped policies are diagnostic, the ordinary game is vsync-limited, reflection is deliberately fixed off, and neither policy isolates CPU, GPU, buffer preservation or readback cost. No save, simulation, visual-quality or gameplay behavior changes.

The next bounded step is Props component attribution on accepted source at the same fixed scene and synchronized policy. Test real LOD1, impostor, pool, lens, halo and furniture submissions with interleaved controls. Select no geometry or distance change merely because a mask is fast; any candidate must preserve the accepted R9a range, R9c transition/CAP ledger, R9e atlas structure, R9f containment closure and visual integrity.
